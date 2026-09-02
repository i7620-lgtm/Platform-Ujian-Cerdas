/// <reference types="vite-plugin-pwa/client" />
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = { env: {} };
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ErrorCatch';
import './style.css'; 

// Register PWA service worker
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Tampilkan notifikasi (atau otomatis perbarui)
    if (confirm('Versi baru telah tersedia! Klik OK untuk memperbarui aplikasi.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Aplikasi siap untuk digunakan secara offline.');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);