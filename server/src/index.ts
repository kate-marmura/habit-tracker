import app from './app.js';
import { config } from './config.js';

app.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
