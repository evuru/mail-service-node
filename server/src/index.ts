import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { apiRoutes } from './routes';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('[Server] FATAL: JWT_SECRET env var is not set. Refusing to start.');
  process.exit(1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Serve built React client in production
if (IS_PROD) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
}

app.use('/v1', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: process.env.MONGODB_ENV,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// SPA fallback in production
if (IS_PROD) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT} | MONGODB_ENV=${process.env.MONGODB_ENV} | NODE_ENV=${process.env.NODE_ENV}`);
  });
};

start().catch(console.error);
