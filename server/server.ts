import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import router from './routes/index.js';
import { setupVite } from './vite.js';

const app: Express = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register API routes BEFORE Vite middleware
app.use('/api/story', router);

async function start() {
  // In development, use Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    await setupVite(app, PORT);
  } else {
    // In production, serve static files
    app.use(express.static('dist'));
  }

  // Start server
  const httpServer = createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
