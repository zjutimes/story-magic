import { createServer as createViteServer } from 'vite';
import { Express } from 'express';

export async function setupVite(app: Express, _port: number): Promise<void> {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      allowedHosts: true,
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);
  console.log('Vite middleware mode enabled');
}
