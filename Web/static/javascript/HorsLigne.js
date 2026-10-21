/*
 * Le jeu en cache : sur la page publiée (Web/jouer.html, servie en https), un service worker garde le jeu pour les visites
 * suivantes et pour jouer sans réseau. Rien en local (file://), rien dans les tests, rien si le navigateur ne sait pas faire.
 */
(function(){
	try {
		if (typeof navigator === "undefined" || !navigator.serviceWorker || typeof location === "undefined") return;
		if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
		if (!/\/jouer\.html$/.test(location.pathname)) return;
		window.addEventListener("load", function(){ navigator.serviceWorker.register("./sw.js").catch(function(){}); });
	} catch (e){}
})();
