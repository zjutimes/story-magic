// ABOUTME: Express server for API routes and static files

import { createServer, type Server } from 'http';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import router from './routes/index';
import path from 'path';
import fs from 'fs';

const port = parseInt(process.env.PORT || '5000', 10);
const hostname = process.env.HOSTNAME || 'localhost';
const app: Express = express();
const server = createServer(app);

async function startServer(): Promise<Server> {
  // 添加请求体解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志 - 必须在路由之前
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.url} - ${ms}ms`);
    });
    next();
  });

  // 注册 API 路由（必须在静态文件之前）
  app.use('/api/story', router);

  // 落地页 - 必须在静态文件之前
  app.get('/', (_req: Request, res: Response) => {
    const landingPagePath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(landingPagePath)) {
      res.sendFile(landingPagePath);
    } else {
      res.status(404).send('Landing page not found');
    }
  });

  // App 页面
  app.get('/app', (_req: Request, res: Response) => {
    const appPagePath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(appPagePath)) {
      res.sendFile(appPagePath);
    } else {
      res.status(404).send('App page not found');
    }
  });

  // 静态文件（Vite 开发服务器）- 必须在最后
  app.use(express.static(process.cwd(), { index: 'index.html' }));

  // 全局错误处理
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = 'status' in err ? (err as any).status || 500 : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  server.once('error', err => {
    console.error('Server error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`\n✨ Server running at http://${hostname}:${port}`);
    console.log(`📝 Environment: development\n`);
  });

  return server;
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
