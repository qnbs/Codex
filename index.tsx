import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swCode = `
      const CACHE_NAME = 'codex-cache-v2';
      const urlsToCache = [
        '/',
        '/index.html',
        '/index.tsx',
        '/locales/en.json',
        '/locales/de.json',
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap',
        'https://esm.sh/react@18.2.0',
        'https://esm.sh/react@18.2.0/',
        'https://esm.sh/react-dom@18.2.0/',
        'https://esm.sh/@google/genai@^1.13.0'
      ];

      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('Opened cache');
              return cache.addAll(urlsToCache);
            })
        );
      });

      self.addEventListener('activate', event => {
        const cacheWhitelist = [CACHE_NAME];
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                  return caches.delete(cacheName);
                }
              })
            );
          })
        );
      });

      // Stale-While-Revalidate Strategy
      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
              caches.open(CACHE_NAME).then(cache => {
                if (networkResponse && networkResponse.status === 200) {
                   cache.put(event.request, networkResponse.clone());
                }
              });
              return networkResponse;
            }).catch(err => {
              console.log('Fetch failed; returning offline page instead.', err);
              // Here you could return a fallback offline page if you have one
            });
            
            // Return the cached response if it's available, otherwise wait for the network.
            return cachedResponse || fetchPromise;
          })
        );
      });
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);