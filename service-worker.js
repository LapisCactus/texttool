const CACHE_NAME = 'text-display-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css', // 必要に応じてCSSファイルを追加
    //'/script.js', // 必要に応じてJavaScriptファイルを追加
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// インストールイベント
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// フェッチイベント
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response; // キャッシュが見つかった場合は、キャッシュを返す
                }
                return fetch(event.request); // キャッシュが見つからない場合は、ネットワークを介してリクエスト
            }
        )
    );
});

// アクティベーションイベント
self.addEventListener('activate', function(event) {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName); // 古いキャッシュを削除
                    }
                })
            );
        })
    );
});
