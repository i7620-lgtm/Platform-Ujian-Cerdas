 
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Memuat environment variables dari file .env atau sistem
  // @ts-ignore
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // PENTING: Ini mengganti 'process.env.API_KEY' di dalam kode frontend
      // dengan nilai string sebenarnya saat aplikasi di-build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      host: true,
      port: 3000,
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
