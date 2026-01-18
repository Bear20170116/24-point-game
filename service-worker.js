const CACHE_NAME = '24-point-game-v1';
const ASSETS = [
  '/24-point-game/',
  '/24-point-game/index.html',
  '/24-point-game/manifest.json',
  '/24-point-game/icons/icon-192x192.png',
  '/24-point-game/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在缓存中找到响应，则返回缓存的响应
        if (response) {
          return response;
        }

        // 否则发起网络请求
        return fetch(event.request)
          .then((response) => {
            // 检查是否获得了有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应
            const responseToCache = response.clone();

            // 将响应添加到缓存
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 如果网络请求失败，尝试返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/24-point-game/');
            }
          });
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-192x192.png',
      data: {
        url: data.url
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/24-point-game/')
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'game-sync') {
    event.waitUntil(syncGameData());
  }
});

// 同步游戏数据
async function syncGameData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
