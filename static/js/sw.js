/**
 * Service Worker for RMF Analyzer
 * Provides offline caching for static assets and API responses
 */

const CACHE_NAME = 'rmf-analyzer-v1';
const STATIC_ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js'
];

const API_CACHE_NAME = 'rmf-analyzer-api-v1';
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('[SW] Cache failed:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(
    caches.match(request)
      .then(cached => {
        // Return cached version or fetch from network
        return cached || fetch(request)
          .then(response => {
            // Cache successful responses
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, clone));
            }
            return response;
          });
      })
      .catch(() => {
        // Return offline fallback for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Handle API requests with cache
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);
  
  // Check if cached response is still valid
  if (cached) {
    const cachedTime = cached.headers.get('sw-cached-time');
    if (cachedTime && (Date.now() - parseInt(cachedTime)) < API_CACHE_MAX_AGE) {
      console.log('[SW] Serving API from cache:', request.url);
      return cached;
    }
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      // Clone and cache the response
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.set('sw-cached-time', Date.now().toString());
      
      const cachedResponse = new Response(await clone.blob(), {
        status: clone.status,
        statusText: clone.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
    }
    
    return response;
  } catch (error) {
    console.error('[SW] API fetch failed:', error);
    
    // Return cached response as fallback
    if (cached) {
      console.log('[SW] Serving stale API cache:', request.url);
      return cached;
    }
    
    return new Response(
      JSON.stringify({ error: 'Network error', offline: true }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
