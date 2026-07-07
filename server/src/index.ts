import dotenv from 'dotenv';
dotenv.config(); // fallback for plain `npm start` with a .env file; no-op when dotenv-cli pre-loaded a named env file

import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { apiRoutes } from './routes';
import { requestLogger } from './middleware/requestLogger';
import { buildOpenApiSpec } from './openapi';

const app = express();
const PORT = Number(process.env.PORT) || 4001;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('[Server] FATAL: JWT_SECRET env var is not set. Refusing to start.');
  process.exit(1);
}

// Trust the first hop from Traefik/load-balancer so req.ip = real client IP
app.set('trust proxy', 1);

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

// OpenAPI spec — served at /v1/openapi.json so it sits under the API prefix
app.get('/v1/openapi.json', (req, res) => {
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  res.json(buildOpenApiSpec(serverUrl));
});

// Redoc docs UI — served at /api-docs
app.get('/api-docs', (_req, res) => {
  const appName = process.env.APP_NAME || 'Mail Service';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${appName} API Docs</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="/v1/openapi.json" expand-responses="200,201"></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"></script>
</body>
</html>`);
});

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
    console.log(`[[Server] http://localhost:${PORT} | MONGODB_ENV=${process.env.MONGODB_ENV} | NODE_ENV=${process.env.NODE_ENV}`);
  });
};

start().catch(console.error);
