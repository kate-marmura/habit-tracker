import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';
import { Prisma } from '../generated/prisma/client.js';

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lg9Xt0CUPOaM0eE9VIGbMPFsK/VGEJbXzI4DLz8MXhZm';

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

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });

  // Always run bcrypt.compare to prevent timing attacks
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const options: jwt.SignOptions = {
    expiresIn: config.JWT_EXPIRY as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  const token = jwt.sign({ sub: user.id }, config.JWT_SECRET, options);

  return { token, user: { id: user.id, email: user.email } };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
  }

  const reusesCurrentPassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (reusesCurrentPassword) {
    throw new AppError(
      422,
      'PASSWORD_UNCHANGED',
      'New password must be different from your current password',
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true, message: 'Password changed successfully' };
}
