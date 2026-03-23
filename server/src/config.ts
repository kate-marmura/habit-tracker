import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional().default('noreply@habittracker.app'),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') return;
    const host = data.SMTP_HOST?.trim();
    if (!host) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_HOST is required when NODE_ENV is production',
        path: ['SMTP_HOST'],
      });
    }
    if (data.SMTP_PORT == null) {
      ctx.addIssue({
        code: 'custom',
        message: 'SMTP_PORT is required when NODE_ENV is production',
        path: ['SMTP_PORT'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
