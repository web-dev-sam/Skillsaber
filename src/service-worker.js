

//const staticAssets = ['./', 'scss/app.scss', 'js/index.js'];
self.addEventListener('install', async (event) => {
  //const cache = await caches.open('min-static');
  //cache.addAll(staticAssets);
  console.log("Install");
});

self.addEventListener('fetch', (event) => {
  console.log('Fetch');
});