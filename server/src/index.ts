import app from './app.js';
import { config } from './config.js';

const server = app.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
