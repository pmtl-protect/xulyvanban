// Tên của bộ nhớ cache
const CACHE_NAME = 'guan-yin-citta-v1';

// Danh sách các tệp và tài nguyên cần được lưu vào bộ nhớ cache để sử dụng ngoại tuyến
const urlsToCache = [
  '/',
  '/index.html',
  'manifest.json', // Thêm manifest để cache
  'logo.png',
  'logo-192.png', // Thêm icon PWA
  'logo-512.png', // Thêm icon PWA
  'PMTL.jpg',
  'ludaitruong (1).jpg',
  'ludaitruong (2).jpg',
  'ludaitruong (4).jpg',
  'ludaitruong (6).jpg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap',
  'https://unpkg.com/lucide@latest'
];

// Sự kiện 'install': được kích hoạt khi service worker được cài đặt lần đầu
// Mở bộ nhớ cache và thêm tất cả các tài nguyên được liệt kê vào đó.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Bộ nhớ cache đã được mở');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện 'fetch': được kích hoạt mỗi khi trang web yêu cầu một tài nguyên (ví dụ: hình ảnh, tệp css)
// Nó kiểm tra xem tài nguyên đã có trong cache chưa. Nếu có, nó sẽ phục vụ từ cache.
// Nếu không, nó sẽ tìm nạp từ mạng, sau đó thêm vào cache để sử dụng trong tương lai.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy trong cache, trả về phản hồi từ cache
        if (response) {
          return response;
        }

        // Sao chép yêu cầu. Yêu cầu là một luồng và chỉ có thể được sử dụng một lần.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Kiểm tra xem chúng ta có nhận được phản hồi hợp lệ không
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Sao chép phản hồi. Phản hồi là một luồng và chỉ có thể được sử dụng một lần.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});


// Sự kiện 'activate': được kích hoạt khi một service worker mới được kích hoạt.
// Dọn dẹp các cache cũ không còn được sử dụng để giải phóng không gian.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
