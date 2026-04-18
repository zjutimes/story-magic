import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'custom', // 重要：设置为 custom，让 Vite 不处理前端路由
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      overlay: true,
      path: '/hot/vite-hmr',
      port: 6000,
      clientPort: 443,
      timeout: 30000,
    },
    watch: {
      usePolling: true,
      interval: 100,
    }
  },
});
