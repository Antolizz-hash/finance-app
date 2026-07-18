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
  '/script/accounts.js',
  '/pages/expenses.html',
  '/pages/income.html',
  '/pages/accounts.html',
  '/pages/loans.html',
  '/icons/dashboard.png',
  '/icons/expenses.png',
  '/icons/goal.png',
  '/icons/income.png',
  '/icons/message.png',
  '/icons/notification.png',
  '/icons/report.png',
  '/icons/savings.png',
  '/icons/search.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add files one by one to find the broken one
      return FILES_TO_CACHE.reduce((promise, file) => {
        return promise.then(() => {
          return cache.add(file).then(() => {
            console.log('✓ Cached:', file);
          }).catch((error) => {
            console.error('✗ FAILED to cache:', file, error);
            throw error; // Stop installation
          });
        });
      }, Promise.resolve());
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
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