import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_VERCEL_DEV_API || '').replace(/\/$/, '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      ...(apiTarget
        ? {
            proxy: {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
  };
});
