const CACHE_NAME = 'my-app-v1';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/style.css',        
  '/script/script.js',        
  '/script/firebase.js',  
  '/script/loans.js',  
  '/script/expenses.js',  
  '/script/income.js', 
  '/script/ui.js',
  '/script/incomeUi.js',
  '/script/accountUi.js',
  '/script/loanUi.js', 
  '/script/accounts.js',
  '/images/logo.png',
  '/pages/expenses.html',
  '/pages/income.html',
  '/pages/accounts.html',
  '/pages/loans.html',        
  
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-HTTP requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version, or fetch from network
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});