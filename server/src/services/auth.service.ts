import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';
import { Prisma } from '../generated/prisma/client.js';

const BCRYPT_ROUNDS = 12;

export async function register(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }
    throw err;
  }

  const options: jwt.SignOptions = {
    expiresIn: config.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, options);

  return { token, user };
}
