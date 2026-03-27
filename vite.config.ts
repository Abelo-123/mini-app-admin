import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react-swc';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  base: '/mini-app-admin/',
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths(),
    process.env.HTTPS && mkcert(),
  ].filter(Boolean),
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          if (id.includes('node_modules/@telegram-apps/sdk')) {
            return 'tma-sdk';
          }
          if (id.includes('node_modules/@telegram-apps/telegram-ui')) {
            return 'tma-ui';
          }
          // Split out eruda only in development
          if (id.includes('eruda') && !id.includes('node_modules')) {
            return 'eruda';
          }
        },
      },
    },
    assetsInlineLimit: 8192,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@telegram-apps/sdk-react',
      '@telegram-apps/telegram-ui',
    ],
  },
  publicDir: './public',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env': {},
  },
});
