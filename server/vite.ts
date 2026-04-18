// ABOUTME: Vite integration for Express server
// ABOUTME: Handles dev middleware and production static file serving

import type { Application, Request, Response } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import viteConfig from '../vite.config';

const isDev = process.env.COZE_PROJECT_ENV !== 'PROD';

/**
 * 集成 Vite 开发服务器（中间件模式）
 */
export async function setupViteMiddleware(app: Application) {
  const vite = await createViteServer({
    ...viteConfig,
    server: {
      ...viteConfig.server,
      middlewareMode: true,
    },
    appType: 'spa',
  });

  const rootPath = process.cwd();

  // API 请求不传递给 Vite
  app.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.url.startsWith('/api/')) {
      return next();
    }
    vite.middlewares(req, res, next);
  });

  // 落地页
  app.use(express.static(rootPath, { index: 'index.html' }));

  console.log('🚀 Vite dev server initialized');
}

/**
 * 设置生产环境静态文件服务
 */
export function setupStaticServer(app: Application) {
  const distPath = path.resolve(process.cwd(), 'dist');
  const rootPath = process.cwd();

  if (!fs.existsSync(distPath)) {
    console.error('❌ dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }

  // 1. 服务应用静态文件（/app 路径）
  app.use('/app', express.static(distPath));

  // 2. 落地页静态文件（/ 路径）
  app.use(express.static(rootPath, {
    index: 'index.html', // 根目录的落地页
  }));

  // 3. SPA fallback - /app/* 返回应用 index.html
  app.use('/app', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // 4. 根路径返回落地页
  app.use('/', (_req: Request, res: Response) => {
    const landingPagePath = path.join(rootPath, 'index.html');
    if (fs.existsSync(landingPagePath)) {
      res.sendFile(landingPagePath);
    } else {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });

  console.log('📦 Serving static files from dist/ and root/');
}

/**
 * 根据环境设置 Vite
 */
export async function setupVite(app: Application) {
  if (isDev) {
    await setupViteMiddleware(app);
  } else {
    setupStaticServer(app);
  }
}
