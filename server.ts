import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createPixHandler from './api/create-pix';
import checkPixHandler from './api/check-pix';
import integrationStatusHandler from './api/integration-status';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Safe integration check route (never exposes secret Asaas key, only boolean status)
  app.get('/api/integration-status', (req, res) => integrationStatusHandler(req, res));

  // Mount the exact same Asaas PIX handlers used on Vercel
  app.post('/api/create-pix', (req, res) => createPixHandler(req, res));
  app.get('/api/check-pix', (req, res) => checkPixHandler(req, res));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
