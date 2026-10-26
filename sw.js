/* 外殼頁的 service worker：只存外殼頁自己這幾個公開的檔案，斷網時也打得開。
 * 系統的回應（頁面、照片、下載檔）一律不存：那些走加密通道、送往 script.google.com，這裡完全不碰，
 * 不在手機上留下任何資料（PWA施作規劃書 §3）。
 * build.py 產生 sw.js 時填入 VERSION（這次產生的檔案內容的雜湊）：外殼頁一改，sw.js 跟著變，手機才會換新版。
 */
const VERSION = '78fdd2c802fc';
const CACHE = 'shell-' + VERSION;
const FILES = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const SCOPE = new URL('./', self.location).href;
const OWN = new Set(FILES.map((f) => new URL(f, SCOPE).href));
// 開頁時先問網路：有網路一定拿最新版。等這麼久還沒回應（或斷網），才拿存好的那份。
const NAV_WAIT_MS = 4000;

self.addEventListener('install', (e) => {
  // cache: 'reload'＝跳過瀏覽器自己的快取（GitHub Pages 預設給 10 分鐘），存進來的一定是這一版
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // 送往 Google 的加密請求：不碰
  if (req.mode === 'navigate') { e.respondWith(openPage(e)); return; }
  if (!OWN.has(req.url)) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

/** 開頁：外殼頁只有一個 index.html，不管網址後面帶什麼（例如 LINE 的 ?openExternalBrowser=1）都是同一份，存在 ./ 底下。 */
async function openPage(e) {
  const net = fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r.ok && !r.redirected) {
      const copy = r.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(SCOPE, copy)));
    }
    return r;
  });
  net.catch(() => { /* 斷網：下面用存好的 */ });
  let r = null;
  try {
    r = await Promise.race([net, new Promise((resolve) => setTimeout(resolve, NAV_WAIT_MS, null))]);
  } catch (err) { /* 斷網 */ }
  if (r) return r;
  return (await caches.match(SCOPE)) || net;
}
