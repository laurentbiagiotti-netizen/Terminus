/*
 * Le service worker de Terminus, édition Cybersup (généré par outils/paquet.js : ne pas éditer Web/sw.js à la main).
 * Le jeu se joue ensuite plus vite, et même sans réseau.
 *  - le cœur (la page, le style, le paquet de la version) : mis en cache à l'installation ;
 *  - la page : le réseau d'abord (une nouvelle version passe toujours), le cache si le réseau manque ;
 *  - les fichiers versionnés (?v=) : le cache d'abord, ils ne changent jamais ;
 *  - les images : le cache d'abord, rafraîchi en arrière-plan ;
 *  - chaque nouvelle version efface les caches des anciennes. Rien d'autre que ce site n'est jamais touché.
 */
var VERSION = "20261022090509";
var CACHE = "terminus-" + VERSION;
var COEUR = ["jouer.html","static/javascript/terminus.paquet.js?v=20261022090509","static/css/terminus.css?v=20261022090509"];

self.addEventListener("install", function(e){
	e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(COEUR); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
	e.waitUntil(caches.keys().then(function(noms){
		return Promise.all(noms.filter(function(n){ return n.indexOf("terminus-") === 0 && n !== CACHE; }).map(function(n){ return caches.delete(n); }));
	}).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
	var r = e.request;
	if (r.method !== "GET") return;
	var url = new URL(r.url);
	if (url.origin !== self.location.origin) return;
	if (r.mode === "navigate" || /\.html$/.test(url.pathname)){
		e.respondWith(fetch(r).then(function(rep){
			if (rep && rep.ok){ var copie = rep.clone(); caches.open(CACHE).then(function(c){ c.put(r, copie); }); }
			return rep;
		}).catch(function(){ return caches.match(r).then(function(x){ return x || caches.match("jouer.html"); }); }));
		return;
	}
	if (/[?&]v=\d+/.test(url.search)){
		e.respondWith(caches.match(r).then(function(x){
			return x || fetch(r).then(function(rep){ if (rep && rep.ok){ var copie = rep.clone(); caches.open(CACHE).then(function(c){ c.put(r, copie); }); } return rep; });
		}));
		return;
	}
	if (/\.(gif|png|jpg|svg|ico)$/.test(url.pathname)){
		e.respondWith(caches.open(CACHE).then(function(c){
			return c.match(r).then(function(x){
				var reseau = fetch(r).then(function(rep){ if (rep && rep.ok) c.put(r, rep.clone()); return rep; }).catch(function(){ return x; });
				return x || reseau;
			});
		}));
	}
});
