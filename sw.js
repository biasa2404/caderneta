/* caderneta — service worker
   Guarda o app para abrir offline. Os dados ficam no IndexedDB, não aqui. */
const VERSAO = "caderneta-v2";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icone-180.png", "./icone-192.png", "./icone-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // nunca interceptar a sincronia com a planilha
  if (url.hostname.endsWith("script.google.com")) return;
  if (e.request.method !== "GET") return;

  // a página principal: sempre tenta a rede sem cache HTTP do navegador,
  // para uma atualização no GitHub aparecer assim que possível
  const navegacao = e.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");
  if (navegacao) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((r) => {
          if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
          return r;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // demais arquivos: rede primeiro, cache como rede de segurança
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && url.origin === location.origin) {
          const copia = r.clone();
          caches.open(VERSAO).then((c) => c.put(e.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
