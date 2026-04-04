'use client';

import { useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   Service Worker Registration — PWA offline support
   Only registers on production (https), not localhost
   ═══════════════════════════════════════════════════════════════════ */

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only register SW in production or when explicitly enabled
    const isProduction =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost';

    if (!isProduction) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates every 60 minutes
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(() => {
          // SW registration failed — non-critical
        });
    }
  }, []);

  return null;
}
