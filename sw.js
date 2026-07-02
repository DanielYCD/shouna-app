// 家居收纳管家 - Service Worker v8
// 策略：HTML 网络优先；JS/CSS/图片 走 stale-while-revalidate；Supabase API 直通（不缓存）
const CACHE_NAME = 'home-storage-v8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './config.js',
  './supabase.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 用 addAll 但允许部分失败（旧版本可能没某些文件）
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
    })
  );
  // 不再无条件 skipWaiting，避免中断 in-flight 请求
  // 新 SW 默认进入 waiting 状态，由前端通过 message 触发激活
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  // Supabase 域名的请求一律直通，不缓存（避免敏感数据/鉴权问题）
  const isSupabaseApi = url.hostname.endsWith('.supabase.co');
  // 只处理 GET 请求
  if (event.request.method !== 'GET' || isSupabaseApi) return;

  if (isHtml) {
    // HTML：网络优先（带 3 秒超时），失败回退缓存
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    event.respondWith(
      Promise.race([fetch(event.request), timeoutPromise])
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || new Response('离线模式，请检查网络', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
  } else {
    // 静态资源：stale-while-revalidate
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('资源加载失败', { status: 504 }));
        return cached || fetchPromise;
      })
    );
  }
});

// 接收 skipWaiting 信号
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
