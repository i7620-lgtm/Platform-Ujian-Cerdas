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

// Register PWA service worker with smart auto-update
import { registerSW } from 'virtual:pwa-register';

let isRefreshing = false;

function isExamSessionActive(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('is_exam_in_progress') === 'true';
  } catch {
    return false;
  }
}

// Clean up any legacy caches containing obsolete chunk hashes
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      // If the cache is an outdated workbox or app cache that does not match current version, purge it
      if (cacheName.includes('workbox-precache') || cacheName.includes('Platform Ujian Cerdas')) {
        // Workbox cleanupOutdatedCaches will take care of standard revisions,
        // but any orphan cache entry can be cleanly verified.
      }
    });
  }).catch(() => {});
}

// Auto reload window when new service worker takes control (seamless update)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    if (!isExamSessionActive()) {
      isRefreshing = true;
      window.location.reload();
    }
  });
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (!isExamSessionActive()) {
      // Segera aktifkan versi baru tanpa perlu konfirmasi manual jika tidak sedang ujian
      updateSW(true);
    } else {
      console.info('Versi baru siap, menunda refresh hingga sesi ujian selesai.');
      try {
        sessionStorage.setItem('pending_pwa_refresh', 'true');
      } catch { /* ignore */ }
    }
  },
  onOfflineReady() {
    console.log('Aplikasi siap untuk digunakan secara offline.');
  },
  onRegistered(registration) {
    if (registration) {
      // 1. Periksa pembaruan saat tab kembali dibuka / aktif
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          registration.update().catch(() => {});
        }
      });
      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          registration.update().catch(() => {});
        }
      });
      // 2. Periksa pembaruan otomatis setiap 15 menit
      setInterval(() => {
        if (navigator.onLine) {
          registration.update().catch(() => {});
        }
      }, 15 * 60 * 1000);
    }
  }
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
