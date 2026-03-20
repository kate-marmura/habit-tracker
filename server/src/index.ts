import express from 'express';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 3001;

async function checkDbConnectivity(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;

  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

app.get('/api/health', async (_req, res) => {
  const dbConnected = await checkDbConnectivity();
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : 'disconnected',
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
