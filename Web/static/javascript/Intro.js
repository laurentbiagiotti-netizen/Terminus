/**
 * Intro.js : l'écran de démarrage, au tout premier lancement.
 *
 * La machine démarre comme un vrai serveur Linux (le journal de boot défile), l'écran
 * s'éteint puis se rallume, et l'illustration TERMINUS se reconstruit bloc de pixels par
 * bloc de pixels. Une touche ou un toucher passe tout de suite à la suite, et le
 * mouvement est coupé pour qui l'a demandé à son système (prefers-reduced-motion).
 */

var LIGNES_DE_BOOT = [
	["", "Cybersup BIOS 2.6  (c) école de cybersécurité, Puteaux"],
	["", "Mémoire vive : 640 Ko ... OK"],
	["", "Démarrage sur /dev/grimoire"],
	["", ""],
	["", "Linux version 6.1.0-terminus (gcc 12.2.0)"],
	["ok", "Monté /home"],
	["ok", "Démarré le journal du système"],
	["ok", "Démarré le serveur SSH (sshd)"],
	["ok", "Démarré la planification des tâches (cron)"],
	["alerte", "Comptes verrouillés : tous sauf un"],
	["ok", "Atteint la cible : connexion d'un nouvel utilisateur"],
	["", ""],
	["", "Terminus 1.0 (édition Cybersup)  tty1"]
];

function intro(suite){
	var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var fond = document.createElement("div");
	fond.id = "intro";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Démarrage de Terminus");
	var journal = document.createElement("pre");
	journal.className = "intro-journal";
	var scene = document.createElement("div");
	scene.className = "intro-scene";
	var cadre = document.createElement("div");
	cadre.className = "intro-cadre";
	var image = document.createElement("img");
	image.className = "intro-titre";
	image.alt = "Terminus, édition Cybersup";
	image.src = sourceImage("./static/img/titlescreen_cybersup.gif");
	var voile = document.createElement("canvas");
	voile.className = "intro-voile";
	voile.setAttribute("aria-hidden", "true");
	var invite = document.createElement("p");
	invite.className = "intro-invite";
	invite.textContent = "Appuie sur Entrée pour te connecter";
	cadre.appendChild(image);
	cadre.appendChild(voile);
	scene.appendChild(cadre);
	scene.appendChild(invite);
	fond.appendChild(journal);
	fond.appendChild(scene);
	document.body.appendChild(fond);

	var minuteurs = [], fini = false, pretAPartir = false;
	function plusTard(fonction, ms){ minuteurs.push(setTimeout(fonction, ms)); }

	function partir(){
		if (fini) return;
		fini = true;
		minuteurs.forEach(clearTimeout);
		document.removeEventListener("keydown", touche, true);
		fond.classList.add("intro-sortie");
		setTimeout(function(){
			if (fond.parentNode) fond.parentNode.removeChild(fond);
			suite();
		}, calme ? 0 : 260);
	}
	// Pendant le boot, une touche le saute ; une fois le titre affiché, elle fait entrer.
	function avancer(){
		if (pretAPartir) partir();
		else montrerTitre(true);
	}
	function touche(e){
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		e.preventDefault();
		e.stopPropagation();
		avancer();
	}
	document.addEventListener("keydown", touche, true);
	fond.addEventListener("click", avancer);

	function ecrireLigne(ligne){
		var div = document.createElement("div");
		if (ligne[0] === "ok" || ligne[0] === "alerte"){
			var etat = document.createElement("span");
			etat.className = ligne[0] === "ok" ? "intro-ok" : "intro-alerte";
			etat.textContent = ligne[0] === "ok" ? "[  OK  ] " : "[ ATTN ] ";
			div.appendChild(etat);
		}
		div.appendChild(document.createTextNode(ligne[1] || " "));
		journal.appendChild(div);
	}

	var titreMontre = false;
	function montrerTitre(sautImmediat){
		if (titreMontre) return;
		titreMontre = true;
		minuteurs.forEach(clearTimeout);
		minuteurs = [];
		fond.classList.add("intro-allumage");
		journal.setAttribute("aria-hidden", "true");
		if (calme || sautImmediat){
			fond.classList.add("intro-titre-visible");
			voile.style.display = "none";
			pret();
			return;
		}
		// L'écran se rallume, puis l'illustration se reconstruit par blocs, dans le désordre.
		plusTard(function(){
			fond.classList.add("intro-titre-visible");
			reconstruire(pret);
		}, 380);
	}

	function reconstruire(quandFini){
		var largeur = image.clientWidth || 416, hauteur = image.clientHeight || 404;
		var taille = Math.max(8, Math.round(largeur / 26));
		voile.width = largeur;
		voile.height = hauteur;
		var ctx = voile.getContext("2d");
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, largeur, hauteur);
		var blocs = [];
		for (var y = 0; y < hauteur; y += taille){
			for (var x = 0; x < largeur; x += taille) blocs.push([x, y]);
		}
		for (var i = blocs.length - 1; i > 0; i--){
			var j = Math.floor(Math.random() * (i + 1));
			var t = blocs[i]; blocs[i] = blocs[j]; blocs[j] = t;
		}
		var parImage = Math.ceil(blocs.length / 36), position = 0;
		function etape(){
			if (fini) return;
			for (var k = 0; k < parImage && position < blocs.length; k++, position++){
				ctx.clearRect(blocs[position][0], blocs[position][1], taille, taille);
			}
			if (position < blocs.length) requestAnimationFrame(etape);
			else { voile.style.display = "none"; quandFini(); }
		}
		requestAnimationFrame(etape);
	}

	function pret(){
		pretAPartir = true;
		fond.classList.add("intro-prete");
	}

	if (calme){
		LIGNES_DE_BOOT.forEach(ecrireLigne);
		montrerTitre(true);
		return;
	}
	var delai = 120;
	LIGNES_DE_BOOT.forEach(function(ligne, i){
		delai += ligne[1] === "" ? 120 : (i < 3 ? 170 : 110 + Math.round(Math.random() * 90));
		plusTard(function(){ ecrireLigne(ligne); }, delai);
	});
	plusTard(function(){ montrerTitre(false); }, delai + 650);
}
