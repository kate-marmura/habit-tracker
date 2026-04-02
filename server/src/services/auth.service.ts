import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { AppError } from '../middleware/error-handler.js';
import { Prisma } from '../generated/prisma/client.js';
import { sendPasswordResetEmail } from '../lib/email.js';

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

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
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

const RESET_RESPONSE = {
  success: true,
  message: 'If an account exists for that email, check your inbox for reset instructions.',
};

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    return RESET_RESPONSE;
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const tokenRow = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `${config.CLIENT_URL}/reset-password/${rawToken}`;

  try {
    await sendPasswordResetEmail({ to: user.email, resetUrl });
  } catch (err) {
    console.error('Failed to send password reset email:', err);
    await prisma.passwordResetToken.delete({ where: { id: tokenRow.id } });
  }

  return RESET_RESPONSE;
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true, userId: true },
    });

    if (!resetToken) {
      throw new AppError(
        400,
        'INVALID_RESET_TOKEN',
        'This password reset link is invalid or has expired',
      );
    }

    const user = await tx.user.findUnique({
      where: { id: resetToken.userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppError(
        400,
        'INVALID_RESET_TOKEN',
        'This password reset link is invalid or has expired',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        id: { not: resetToken.id },
      },
      data: { usedAt: now },
    });

    return { success: true, message: 'Password has been reset successfully' };
  });
}
