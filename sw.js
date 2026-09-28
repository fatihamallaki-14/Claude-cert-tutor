const CACHE = "cct-v3";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/app.js",
  "./js/audio.js",
  "./js/questions.js",
  "./js/progress.js",
  "./js/tutor.js",
  "./js/speech.js",
  "./js/storage.js",
  "./data/lessons.js",
  "./data/questionbank.js",
  "./icons/icon-192.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(FILES);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches
      .match(event.request)
      .then(function (hit) {
        return (
          hit ||
          fetch(event.request).then(function (response) {
            const copy = response.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(event.request, copy);
            });
            return response;
          })
        );
      })
      .catch(function () {
        return caches.match("./index.html");
      })
  );
});
