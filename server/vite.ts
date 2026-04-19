import { createServer as createViteServer } from 'vite';
import { Express, Request, Response, NextFunction } from 'express';
import router from './routes/index.js';
import publishRouter from './routes/publish.js';

export async function setupVite(app: Express, _port: number): Promise<void> {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      allowedHosts: true,
    },
    appType: 'spa',
  });

  // 在 Vite 中间件之前注册 API 路由
  // Express 会按注册顺序匹配路由
  app.use('/api/story', router);
  app.use('/api/publish', publishRouter);
  
  // 确保 /health 路由也工作
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite 中间件 - 只处理非 API 请求
  // 由于 Express 路由按顺序匹配，API 路由已经匹配过了
  app.use(vite.middlewares);

  console.log('Vite middleware mode enabled');
}
