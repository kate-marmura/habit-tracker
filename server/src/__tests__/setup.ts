process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/habit_tracker';
process.env.JWT_SECRET ??= 'test-secret-must-be-at-least-32-characters-long';
process.env.NODE_ENV ??= 'test';
