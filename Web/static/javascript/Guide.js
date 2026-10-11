/**
 * Guide.js : ce qui rend le jeu fluide, dans le navigateur.
 *
 *   le tutoriel des premières minutes (cinq sorts guidés, la commande suggérée en gris) ;
 *   la correction proposée après une erreur (Tab l'écrit) et une piste offerte quand on tourne en rond ;
 *   les scènes de passage d'un chapitre à l'autre, le récapitulatif de fin de chapitre et son quiz ;
 *   l'ambiance sonore de chaque chapitre, la taille du texte et le contraste fort.
 *
 * Chargé après Game.js. Rien ici ne change le barème : ce sont des aides et des décors.
 */

/* ------------------------------------------------------------------ */
/* Un petit message dans le coin, comme les bannières                  */
/* ------------------------------------------------------------------ */

function toast(titre, detail, classe){
	var panneau = document.getElementById("pics");
	if (!panneau) return;
	var b = document.createElement("div");
	b.className = "banniere banniere-guide" + (classe ? " " + classe : "");
	b.setAttribute("role", "status");
	var t = document.createElement("span"); t.className = "banniere-titre"; t.textContent = titre;
	var d = document.createElement("span"); d.className = "banniere-detail"; d.textContent = detail;
	b.appendChild(t); b.appendChild(d);
	var pile = document.getElementById("bannieres");
	if (!pile){ pile = document.createElement("div"); pile.id = "bannieres"; panneau.appendChild(pile); }
	pile.appendChild(b);
	bannieres.push(b);
	while (bannieres.length > (window.innerWidth < 820 ? 1 : 3)){ var vieille = bannieres.shift(); if (vieille.parentNode) vieille.parentNode.removeChild(vieille); }
	setTimeout(function(){
		b.classList.add("banniere-sortie");
		setTimeout(function(){ if (b.parentNode) b.parentNode.removeChild(b); bannieres = bannieres.filter(function(x){ return x !== b; }); }, calmeDemande ? 0 : 300);
	}, 2600);
}

/* ------------------------------------------------------------------ */
/* Le tutoriel : cinq sorts guidés, puis on lâche la main               */
/* ------------------------------------------------------------------ */

var TUTORIEL = [
	{ titre: "Regarde autour de toi", cmd: "ls", aide: "ls montre les lieux (en bleu) et les objets d'ici.",
	  fait: function(l){ return /^ls\b/.test(l); } },
	{ titre: "Lis la lettre posée chez toi", cmd: "cat LettreDeBienvenue", aide: "cat affiche un objet. Tab complète les noms longs.",
	  fait: function(l, lu){ return lu === "LettreDeBienvenue"; } },
	{ titre: "Va dans la forêt", cmd: "cd ForetOuest", aide: "cd entre dans un lieu. cd .. revient en arrière.",
	  fait: function(){ return /ForetOuest/.test(Shell.cheminAffiche(current_room)); } },
	{ titre: "Regarde ce qu'il y a dans la forêt", cmd: "ls", aide: "Chaque lieu a ses chemins et ses objets.",
	  fait: function(l){ return /^ls\b/.test(l) && current_room.room_name === "ForetOuest"; } },
	{ titre: "Entre à l'Académie des sorts", cmd: "cd AcademieDesSorts", aide: "Tab : tape cd Aca, puis Tab.",
	  fait: function(){ return /AcademieDesSorts/.test(Shell.cheminAffiche(current_room)); } }
];
var tutoEtape = -1;
var dernierObjetLu = null;
GameEvents.addListener("read", function(e){ dernierObjetLu = e.item ? e.item.itemname : null; });

function demarrerTuto(){
	if (state.has("tutoFini") || state.has("chapitre1Saute") || state.chapitreEnCours() !== 1) return;
	// Une partie déjà entamée (sauvegardée avant le tutoriel) n'en a pas besoin.
	if (Object.keys(state.quests).length > 3){ state.set("tutoFini"); return; }
	tutoEtape = 0;
	montrerEtapeTuto();
}
function montrerEtapeTuto(){
	if (tutoEtape < 0 || !term) return;
	var e = TUTORIEL[tutoEtape];
	term.proposer(e.cmd, "tape : ");
	majObjectif();
}
function suivreTuto(ligne){
	if (tutoEtape < 0) return;
	var e = TUTORIEL[tutoEtape];
	if (!e.fait(ligne.trim(), dernierObjetLu)){
		// Une autre commande : on remet la suggestion, sans gronder.
		if (!Shell.proposition) term.proposer(e.cmd, "tape : ");
		return;
	}
	jouerSon("sort");
	tutoEtape++;
	if (tutoEtape >= TUTORIEL.length){
		tutoEtape = -1;
		state.set("tutoFini");
		state.save();
		term.proposer(null);
		toast("Tutoriel terminé", "À toi de jouer : suis la quête, à droite.", "banniere-quete");
		majObjectif();
		return;
	}
	toast("Bien joué  " + tutoEtape + "/" + TUTORIEL.length, TUTORIEL[tutoEtape - 1].aide, "banniere-sort");
	montrerEtapeTuto();
}

/* Le message d'accueil, plus court : le tutoriel fait le reste. */
MESSAGE_ACCUEIL = C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
	"Ici, tout se fait en tapant des sorts : de vraies commandes Linux.\n" +
	"Suis le tutoriel, à droite : cinq sorts, et le monde est à toi.\n" +
	C.gris("Perdu ? quetes (ton journal), indice (un coup de pouce), help (tes sorts).") + "\n";
var ACCUEILLIR_SANS_TUTO = accueillir;
accueillir = function(){
	ACCUEILLIR_SANS_TUTO();
	if (!partieRestauree) demarrerTuto();
};

/* ------------------------------------------------------------------ */
/* L'objectif, à droite : le tutoriel, la quête, et la piste offerte    */
/* ------------------------------------------------------------------ */

var suiviBlocage = { id: null, actif: 0, dernierTour: Date.now() };
var derniereTouche = Date.now();
document.addEventListener("keydown", function(){ derniereTouche = Date.now(); }, true);
document.addEventListener("click", function(){ derniereTouche = Date.now(); }, true);
var MINUTES_AVANT_PISTE = 4;

function detailsDeQuete(id){
	return INDICES_DETAILLES[id] || (typeof INDICES_CHAPITRE2 !== "undefined" && INDICES_CHAPITRE2[id]) ||
		(typeof INDICES_PANNE !== "undefined" && INDICES_PANNE[id]) || [];
}

var MAJ_OBJECTIF_SANS_GUIDE = majObjectif;
majObjectif = function(){
	MAJ_OBJECTIF_SANS_GUIDE();
	var bloc = document.getElementById("objectif");
	if (!bloc) return;
	var piste = bloc.querySelector(".objectif-piste");
	if (!piste){ piste = document.createElement("span"); piste.className = "objectif-piste"; bloc.appendChild(piste); }
	bloc.classList.toggle("objectif-tuto", tutoEtape >= 0);
	if (tutoEtape >= 0){
		var e = TUTORIEL[tutoEtape];
		bloc.hidden = false;
		bloc.querySelector(".objectif-mot").textContent = "Tutoriel " + (tutoEtape + 1) + "/" + TUTORIEL.length;
		bloc.querySelector(".objectif-nom").textContent = e.titre;
		bloc.querySelector(".objectif-indice").textContent = "";
		piste.textContent = "Tape : " + e.cmd;
		return;
	}
	bloc.querySelector(".objectif-mot").textContent = "Quête";
	var q = state.queteEnCours();
	var details = q ? detailsDeQuete(q.id) : [];
	piste.textContent = q && state.indices[q.id] >= 1 && details[0] ? "Piste : " + details[0] : "";
	bloc.classList.toggle("avec-piste", !!piste.textContent);
};

/* Toutes les dix secondes : depuis combien de temps le joueur cherche-t-il, activement, la même étape ? */
setInterval(function(){
	if (document.hidden || !state || tutoEtape >= 0 || Shell.sauvegardeBloquee) return;
	var q = state.queteEnCours();
	var maintenant = Date.now();
	if (!q){ suiviBlocage.id = null; return; }
	if (suiviBlocage.id !== q.id){ suiviBlocage = { id: q.id, actif: 0, dernierTour: maintenant }; return; }
	// Le temps ne compte que si le joueur est là : une touche dans les deux dernières minutes.
	if (maintenant - derniereTouche < 120000) suiviBlocage.actif += maintenant - suiviBlocage.dernierTour;
	suiviBlocage.dernierTour = maintenant;
	if (suiviBlocage.actif < MINUTES_AVANT_PISTE * 60000) return;
	var details = detailsDeQuete(q.id);
	if (!details[0] || (state.indices[q.id] || 0) >= 1) return;
	// La première piste est offerte, sans retirer de points : elle remplace le premier indice payant.
	state.indices[q.id] = 1;
	state.save();
	majObjectif();
	jouerSon("succes");
	toast("Une piste t'attend", "Tu cherches depuis un moment : regarde l'objectif, à droite.", "banniere-quete");
}, 10000);

/* ------------------------------------------------------------------ */
/* Après chaque commande : la correction proposée, le tutoriel, l'ambiance */
/* ------------------------------------------------------------------ */

var sortieDuTour = [];
var ECHO_SANS_GUIDE = null;
function brancherGuide(){
	if (!term || term.guideBranche) return;
	term.guideBranche = true;
	ECHO_SANS_GUIDE = term.echo;
	term.echo = function(texte){ sortieDuTour.push(String(texte === undefined ? "" : texte)); return ECHO_SANS_GUIDE.apply(term, arguments); };
	var commande = term.onCommande;
	term.onCommande = function(ligne){
		sortieDuTour = [];
		commande(ligne);
		var brut = sortieDuTour.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
		var proposition = Shell.proposition;
		// Refusé faute de droits, alors que le sort sudo est connu : on propose la même ligne avec sudo.
		if (!proposition && !/^\s*sudo\b/.test(ligne) && state.knows("sudo") &&
			/Permission denied|Permission non accordée|Operation not permitted|Access denied|réservé à root|You need to be root|il faut être root/i.test(brut) &&
			/sudo /.test(brut)) proposition = "sudo " + ligne.trim();
		if (proposition && proposition !== ligne.trim()) term.proposer(proposition, "tu voulais dire : ");
		suivreTuto(ligne);
		majAmbiance();
	};
}

/* ------------------------------------------------------------------ */
/* Les scènes : l'entrée dans un chapitre                               */
/* ------------------------------------------------------------------ */

var SCENES = {
	r_batiment: { image: "loc_batimentb.gif", titre: "Chapitre 2 · La panne", chapitre: 2,
		lignes: ["Pendant l'épreuve, le réseau de l'école est tombé.", "Radia t'attend au bâtiment B.", "On répare de bas en haut : la tour des sept étages."] },
	r_annexe: { image: "loc_annexe.gif", titre: "Chapitre 2 · Acte II : l'Annexe", chapitre: 2,
		lignes: ["Le bâtiment B tient. La cafétéria, non.", "Plus de Wi-Fi, un écran noir, un jumeau dans les ondes.", "Même méthode : du câble jusqu'au web."] },
	c_crypte: { image: "loc_crypte.gif", titre: "Chapitre 3 · La Crypte", chapitre: 3,
		lignes: ["Un mage noir s'est glissé dans la Citadelle.", "Ses sorts dorment dans le donjon, sous tes pieds.", "Grace te guide à la radio. La chasse est ouverte."] }
};
function sceneDeChapitre(scene){
	var fond = document.createElement("div");
	fond.className = "scene-chapitre";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", scene.titre);
	var cadre = document.createElement("div");
	cadre.className = "scene-cadre";
	var image = document.createElement("img");
	image.src = sourceImage("./static/img/" + scene.image);
	image.alt = "";
	var titre = document.createElement("p");
	titre.className = "scene-titre";
	titre.textContent = scene.titre;
	cadre.appendChild(image);
	cadre.appendChild(titre);
	scene.lignes.forEach(function(l, i){
		var p = document.createElement("p");
		p.className = "scene-ligne";
		p.style.animationDelay = (calmeDemande ? 0 : 400 + i * 700) + "ms";
		p.textContent = l;
		cadre.appendChild(p);
	});
	// La carte des chapitres : celui qui commence s'allume.
	var carte = document.createElement("p");
	carte.className = "scene-carte";
	["Terminus", "La panne", "La Crypte"].forEach(function(nom, i){
		var etape = document.createElement("span");
		var n = i + 1;
		var fini = n < scene.chapitre || (n === 1 && state.has("victoire")) || (n === 2 && state.quests["r_fin"]) || (n === 3 && state.quests["c_rapport"]);
		etape.className = "scene-etape" + (n === scene.chapitre ? " scene-ici" : (fini ? " scene-fait" : ""));
		etape.textContent = (n === scene.chapitre ? "● " : (fini ? "✓ " : "○ ")) + nom;
		carte.appendChild(etape);
		if (i < 2){ var trait = document.createElement("span"); trait.className = "scene-trait"; trait.textContent = " ── "; carte.appendChild(trait); }
	});
	cadre.appendChild(carte);
	var suite = document.createElement("p");
	suite.className = "scene-suite";
	suite.textContent = toucheOuEntree() + " pour commencer";
	cadre.appendChild(suite);
	fond.appendChild(cadre);
	document.body.appendChild(fond);
	jouerSon("niveau");
	fermerSur(fond, function(){ majAmbiance(true); });
}
function fermerSur(fond, apres){
	function fermer(e){
		if (e && e.type === "keydown"){ e.preventDefault(); e.stopPropagation(); }
		document.removeEventListener("keydown", fermer, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		var champ = document.getElementById("saisie");
		if (champ) champ.focus();
		if (apres) apres();
	}
	setTimeout(function(){
		document.addEventListener("keydown", fermer, true);
		fond.addEventListener("click", fermer);
	}, 600);
}

var COMPLETE_SANS_SCENES = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = this.quests[id];
	COMPLETE_SANS_SCENES.call(this, id);
	if (!deja && SCENES[id] && !Shell.sauvegardeBloquee && !this.has("rejeuEnCours") && term){
		setTimeout(function(){ sceneDeChapitre(SCENES[id]); }, 500);
	}
};

/* ------------------------------------------------------------------ */
/* La fin d'un chapitre : le récapitulatif, puis le quiz                 */
/* ------------------------------------------------------------------ */

/* Les numéros internes : 1, la panne (3), la Crypte (2). */
function recapChapitre(chapitre){
	var minutes, badges = [], sorts;
	if (chapitre === 1){ minutes = Math.round(state.tempsMs / 60000); }
	else if (chapitre === 3){ minutes = Math.round((state.tempsMs - (state.debutChapitre3 || 0)) / 60000); }
	else { minutes = Math.round((state.tempsMs - (state.debutChapitre2 || 0)) / 60000); }
	if (chapitre === 3 && typeof RELIQUES !== "undefined") badges = Object.keys(RELIQUES).filter(function(id){ return state.quests[id]; });
	if (chapitre === 2 && typeof TROPHEES_CRYPTE !== "undefined") badges = Object.keys(TROPHEES_CRYPTE).filter(function(id){ return state.quests[id]; });
	sorts = Object.keys(state.frequences || {}).filter(function(s){ return SORTS_DU_JEU.indexOf(s) === -1; }).filter(function(s){ return chapitreDuSort(s) === chapitre || (chapitre === 1 && ["ls", "cd", "cat"].indexOf(s) > -1); });
	sorts.sort(function(a, b){ return state.frequences[b] - state.frequences[a]; });
	return { minutes: minutes, badges: badges, top: sorts.slice(0, 3).map(function(s){ return s + " ×" + state.frequences[s]; }) };
}

var ECRAN_VICTOIRE_SEUL = ecranDeVictoire;
ecranDeVictoire = function(chapitre){
	ECRAN_VICTOIRE_SEUL(chapitre);
	var fond = document.getElementById("victoire");
	if (!fond) return;
	var cadre = fond.querySelector(".victoire-cadre");
	var r = recapChapitre(chapitre);
	var recap = document.createElement("div");
	recap.className = "victoire-recap";
	[["Temps", r.minutes < 60 ? r.minutes + " min" : Math.floor(r.minutes / 60) + " h " + deuxChiffres(r.minutes % 60)],
	 [chapitre === 1 ? "Sorts" : "Badges", chapitre === 1 ? state.knownSpells().filter(function(s){ return chapitreDuSort(s) === 1; }).length + " appris" : r.badges.length + " gagnés"],
	 ["Tes sorts favoris", r.top.join(", ") || "(aucun)"]].forEach(function(c){
		var ligne = document.createElement("p");
		var nom = document.createElement("span"); nom.className = "recap-nom"; nom.textContent = c[0];
		var val = document.createElement("span"); val.className = "recap-valeur"; val.textContent = c[1];
		ligne.appendChild(nom); ligne.appendChild(val);
		recap.appendChild(ligne);
	});
	var suite = cadre.querySelector(".victoire-suite");
	cadre.insertBefore(recap, suite);
	suite.textContent = toucheOuEntree() + " : le quiz du chapitre (5 questions)";
	// À la fermeture de l'écran de victoire, le quiz s'ouvre.
	var observateur = new MutationObserver(function(){
		if (!document.getElementById("victoire")){ observateur.disconnect(); setTimeout(function(){ lancerQuiz(chapitre); }, 200); }
	});
	observateur.observe(document.body, { childList: true });
};

var QUIZ = {
	1: [
		["Quel sort montre ce qu'il y a autour de toi ?", ["ls", "cd", "pwd", "cat"], 0, "ls liste les lieux et les objets du lieu où tu es."],
		["Comment revenir au lieu précédent, celui qui contient le lieu actuel ?", ["cd ..", "cd ~", "cd /", "ls .."], 0, ".. désigne le lieu parent ; ~ ta Maison ; / la racine."],
		["Dans -rwxr-x---, que peut faire le groupe ?", ["Lire et exécuter", "Tout faire", "Rien", "Seulement écrire"], 0, "Les trois lettres du milieu (r-x) sont celles du groupe : lire et exécuter, pas écrire."],
		["À quoi sert sudo ?", ["Lancer un sort avec les droits de root", "Changer de mot de passe", "Supprimer un fichier", "Ouvrir une session à distance"], 0, "sudo SORT : le sort part avec les pleins pouvoirs, après ton mot de passe."],
		["Que fait la barre | entre deux sorts ?", ["Elle envoie la sortie du premier dans le second", "Elle lance les deux en même temps", "Elle annule le premier", "Elle écrit dans un fichier"], 0, "cut -d: -f1 Registre | sort : la sortie de cut devient l'entrée de sort."],
		["Comment chercher le mot « motdepasse » dans tous les objets du lieu ?", ["grep motdepasse *", "find motdepasse", "cat motdepasse", "ls motdepasse"], 0, "grep cherche un mot dans des textes ; * désigne tous les objets d'ici."],
		["Comment voir les objets cachés (ceux qui commencent par un point) ?", ["ls -a", "ls -l", "cat .", "cd -a"], 0, "-a, comme all : ls -a montre aussi les noms qui commencent par un point."],
		["Que fait chmod +x script ?", ["Il rend le script exécutable", "Il le supprime", "Il le rend invisible", "Il le copie"], 0, "+x ajoute le droit d'exécution."]
	],
	3: [
		["Le modèle OSI, de bas en haut, commence par :", ["Physique, Liaison, Réseau", "Application, Transport, Réseau", "Réseau, Liaison, Physique", "Session, Transport, Réseau"], 0, "« Pour Le Réseau, Tout Se Passe Automatiquement » : Physique, Liaison, Réseau, Transport, Session, Présentation, Application."],
		["ip link montre eth0 DOWN. Que fais-tu ?", ["sudo ip link set eth0 up", "sudo dhclient eth0", "ping eth0", "sudo reboot"], 0, "On dépanne de bas en haut : d'abord rallumer la carte (étage 1)."],
		["À quoi sert le DNS ?", ["Traduire un nom en adresse IP", "Donner une adresse aux machines", "Chiffrer le web", "Filtrer les paquets"], 0, "Le DNS traduit ; c'est le DHCP qui donne les adresses."],
		["nc -zv mail 25 répond « timed out ». Le plus probable ?", ["Un pare-feu jette les paquets", "Le port est fermé", "Le serveur est éteint depuis un an", "Le câble est débranché du poste"], 0, "Port fermé : « refused », tout de suite. Rien du tout : un pare-feu avale les paquets."],
		["Combien d'adresses utilisables dans un /26 ?", ["62", "64", "254", "26"], 0, "64 adresses, moins celle du réseau et celle de diffusion."],
		["Un Wi-Fi ouvert porte presque le nom de celui de l'école. Tu fais quoi ?", ["Tu ne t'y connectes pas", "Tu t'y connectes, il capte mieux", "Tu changes ton mot de passe dessus", "Tu le scannes avec nmap"], 0, "C'est un faux point d'accès : il verrait tout ce que tu envoies."],
		["Pour qu'un service démarre maintenant ET à chaque démarrage :", ["systemctl enable --now", "systemctl start", "systemctl restart", "systemctl status"], 0, "start : maintenant seulement. enable : au démarrage. --now : les deux."],
		["Pourquoi fermer telnet ?", ["Tout y passe en clair, mots de passe compris", "Il est trop lent", "Il consomme trop de débit", "Il empêche le DNS"], 0, "telnet ne chiffre rien ; ssh fait le même travail, chiffré."]
	],
	2: [
		["sha256sum -c SHA256SUMS sert à :", ["vérifier qu'aucun fichier n'a été modifié", "chiffrer des fichiers", "compresser des fichiers", "trouver des fichiers cachés"], 0, "Une empreinte change dès qu'on touche une virgule : ÉCHEC = fichier modifié."],
		["base64, c'est :", ["Un encodage, pas un chiffrement", "Un chiffrement solide", "Un format d'image", "Un mot de passe"], 0, "N'importe qui le déballe avec base64 -d."],
		["Le bit SUID (-rwsr-xr-x) veut dire :", ["Le programme s'exécute avec les droits de son propriétaire", "Le fichier est caché", "Le fichier est en lecture seule", "Le programme est un script"], 0, "Un programme SUID de root que personne n'a installé : une porte dérobée."],
		["Un compte d'UID 0 dans /etc/passwd, c'est :", ["Un second root", "Un compte désactivé", "Un compte invité", "Le compte du système de fichiers"], 0, "UID 0 = root, quel que soit le nom."],
		["Quelle clé ne doit jamais quitter ton dossier ?", ["La clé privée (id_ed25519)", "La clé publique (id_ed25519.pub)", "Les deux", "Aucune"], 0, "La publique se donne ; la privée, jamais."],
		["Un service relancé par Restart=always : tuer son processus suffit-il ?", ["Non : systemctl disable --now", "Oui, kill -9 suffit", "Oui, il faut juste redémarrer", "Non : il faut supprimer le compte"], 0, "systemd le relance aussitôt ; il faut l'arrêter et le désactiver."],
		["Avant d'analyser une preuve, on :", ["la copie intacte et note son empreinte", "la corrige", "la supprime de la machine", "l'envoie par mail"], 0, "C'est la chaîne de traçabilité : l'empreinte prouve qu'elle n'a pas bougé."],
		["/etc/sudoers se modifie avec :", ["visudo", "nano directement", "echo >>", "chmod"], 0, "visudo vérifie la syntaxe : une faute dans sudoers peut bloquer tout le monde."]
	]
};

function lancerQuiz(chapitre){
	var banque = (QUIZ[chapitre] || []).slice();
	if (!banque.length) return;
	for (var i = banque.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var x = banque[i]; banque[i] = banque[j]; banque[j] = x; }
	var questions = banque.slice(0, 5), n = 0, bons = 0;
	var fond = document.createElement("div");
	fond.className = "scene-chapitre quiz";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Quiz du chapitre");
	var cadre = document.createElement("div");
	cadre.className = "scene-cadre quiz-cadre";
	fond.appendChild(cadre);
	document.body.appendChild(fond);
	var attente = null;
	function fermer(){
		document.removeEventListener("keydown", clavier, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		var champ = document.getElementById("saisie");
		if (champ) champ.focus();
	}
	function clavier(e){
		e.preventDefault(); e.stopPropagation();
		if (e.key === "Escape"){ fermer(); return; }
		if (attente){ if (e.key === "Enter" || e.key === " ") attente(); return; }
		var k = parseInt(e.key, 10);
		var boutons = cadre.querySelectorAll(".quiz-choix");
		if (k >= 1 && k <= boutons.length) boutons[k - 1].click();
	}
	document.addEventListener("keydown", clavier, true);
	function question(){
		attente = null;
		cadre.innerHTML = "";
		var q = questions[n];
		var entete = document.createElement("p"); entete.className = "quiz-entete";
		entete.textContent = "Quiz · question " + (n + 1) + " sur " + questions.length;
		var texte = document.createElement("p"); texte.className = "quiz-question"; texte.textContent = q[0];
		cadre.appendChild(entete); cadre.appendChild(texte);
		var ordre = q[1].map(function(t, i){ return i; });
		for (var a = ordre.length - 1; a > 0; a--){ var b = Math.floor(Math.random() * (a + 1)); var y = ordre[a]; ordre[a] = ordre[b]; ordre[b] = y; }
		ordre.forEach(function(idx, pos){
			var bouton = document.createElement("button");
			bouton.type = "button";
			bouton.className = "quiz-choix";
			bouton.textContent = (pos + 1) + "  " + q[1][idx];
			bouton.addEventListener("click", function(ev){
				if (ev) ev.stopPropagation();
				if (attente) return;
				var juste = idx === q[2];
				if (juste){ bons++; jouerSon("sort"); } else jouerSon("erreur");
				Array.prototype.forEach.call(cadre.querySelectorAll(".quiz-choix"), function(x){ x.disabled = true; });
				bouton.classList.add(juste ? "quiz-juste" : "quiz-faux");
				if (!juste) Array.prototype.forEach.call(cadre.querySelectorAll(".quiz-choix"), function(x, p){ if (ordre[p] === q[2]) x.classList.add("quiz-juste"); });
				var expl = document.createElement("p"); expl.className = "quiz-explication";
				expl.textContent = (juste ? "Exact. " : "Pas tout à fait. ") + q[3];
				var suite = document.createElement("p"); suite.className = "scene-suite";
				suite.textContent = toucheOuEntree() + (n + 1 < questions.length ? " : question suivante" : " : ton score");
				cadre.appendChild(expl); cadre.appendChild(suite);
				attente = function(){ n++; if (n < questions.length) question(); else resultat(); };
				setTimeout(function(){ fond.addEventListener("click", function suivant(){ fond.removeEventListener("click", suivant); if (attente) attente(); }); }, 300);
			});
			cadre.appendChild(bouton);
		});
	}
	function resultat(){
		attente = null;
		cadre.innerHTML = "";
		var meilleur = Math.max(state.quiz[chapitre] || 0, bons);
		state.quiz[chapitre] = meilleur;
		state.save();
		var note = document.createElement("p"); note.className = "victoire-note"; note.textContent = bons + " / " + questions.length;
		var mot = document.createElement("p"); mot.className = "scene-titre";
		mot.textContent = bons === questions.length ? "Sans faute !" : (bons >= 3 ? "Bien retenu." : "À revoir : badges relit les leçons.");
		var plus = document.createElement("p"); plus.className = "scene-ligne";
		plus.textContent = "Meilleur score : " + meilleur + " / 5. Le quiz se rejoue quand tu veux : quiz " + numeroAffiche(chapitre) + ".";
		var suite = document.createElement("p"); suite.className = "scene-suite"; suite.textContent = toucheOuEntree() + " pour continuer";
		[note, mot, plus, suite].forEach(function(e){ cadre.appendChild(e); });
		jouerSon(bons >= 4 ? "victoire" : "quete");
		attente = fermer;
		setTimeout(function(){ fond.addEventListener("click", function(){ if (attente) attente(); }); }, 300);
	}
	question();
}

Shell.sorts.quiz = function(args, io){
	var choix = { "1": 1, "2": 3, "3": 2 }[args[0]] || (state.chapitreEnCours ? state.chapitreEnCours() : 1);
	var fini = choix === 1 ? state.has("victoire") : (choix === 3 ? !!state.quests["r_fin"] : !!state.quests["c_rapport"]);
	if (!fini) return "Le quiz du chapitre " + numeroAffiche(choix) + " s'ouvre à la fin du chapitre. " + C.gris("(quiz 1, quiz 2 ou quiz 3 pour un chapitre déjà terminé)");
	setTimeout(function(){ lancerQuiz(choix); }, 50);
	return C.gris("(Le quiz du chapitre " + numeroAffiche(choix) + " : 5 questions tirées au hasard. 1 à 4 pour répondre, Échap pour sortir.)");
};

/* ------------------------------------------------------------------ */
/* L'ambiance sonore : un fond discret par chapitre (avec son on)       */
/* ------------------------------------------------------------------ */

var ambiance = { chapitre: null, noeuds: [], minuteurs: [], maitre: null };
function arreterAmbiance(){
	ambiance.minuteurs.forEach(clearInterval);
	ambiance.minuteurs = [];
	if (ambiance.maitre && contexteAudio){
		var m = ambiance.maitre, noeuds = ambiance.noeuds;
		m.gain.setTargetAtTime(0, contexteAudio.currentTime, 0.4);
		setTimeout(function(){ noeuds.forEach(function(n){ try { n.stop(); } catch (e){} }); try { m.disconnect(); } catch (e){} }, 1500);
	}
	ambiance.noeuds = [];
	ambiance.maitre = null;
	ambiance.chapitre = null;
}
function note(frequence, duree, type, volume, glisse){
	if (!ambiance.maitre) return;
	var t = contexteAudio.currentTime, osc = contexteAudio.createOscillator(), g = contexteAudio.createGain();
	osc.type = type || "triangle";
	osc.frequency.setValueAtTime(frequence, t);
	if (glisse) osc.frequency.exponentialRampToValueAtTime(glisse, t + duree);
	g.gain.setValueAtTime(volume || 0.25, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
	osc.connect(g); g.connect(ambiance.echo || ambiance.maitre);
	osc.start(t); osc.stop(t + duree + 0.05);
}
function bourdon(frequence, type, volume){
	var osc = contexteAudio.createOscillator(), g = contexteAudio.createGain();
	osc.type = type || "sine"; osc.frequency.value = frequence; g.gain.value = volume;
	osc.connect(g); g.connect(ambiance.maitre); osc.start();
	ambiance.noeuds.push(osc);
}
function souffle(coupure, volume){
	var taille = contexteAudio.sampleRate * 2, tampon = contexteAudio.createBuffer(1, taille, contexteAudio.sampleRate), d = tampon.getChannelData(0);
	for (var i = 0; i < taille; i++) d[i] = Math.random() * 2 - 1;
	var src = contexteAudio.createBufferSource(); src.buffer = tampon; src.loop = true;
	var filtre = contexteAudio.createBiquadFilter(); filtre.type = "lowpass"; filtre.frequency.value = coupure;
	var g = contexteAudio.createGain(); g.gain.value = volume;
	src.connect(filtre); filtre.connect(g); g.connect(ambiance.maitre); src.start();
	ambiance.noeuds.push(src);
}
function lancerAmbiance(chapitre){
	try {
		if (!contexteAudio) contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
		if (contexteAudio.state === "suspended") contexteAudio.resume();
	} catch (e){ return; }
	arreterAmbiance();
	ambiance.chapitre = chapitre;
	var maitre = contexteAudio.createGain();
	maitre.gain.setValueAtTime(0, contexteAudio.currentTime);
	maitre.gain.linearRampToValueAtTime(0.05, contexteAudio.currentTime + 3);
	maitre.connect(contexteAudio.destination);
	ambiance.maitre = maitre;
	// Un écho, pour les gouttes du donjon et les notes du village.
	var echo = contexteAudio.createDelay(); echo.delayTime.value = 0.32;
	var retour = contexteAudio.createGain(); retour.gain.value = 0.35;
	var entree = contexteAudio.createGain();
	entree.connect(maitre); entree.connect(echo); echo.connect(retour); retour.connect(echo); retour.connect(maitre);
	ambiance.echo = entree;
	var gamme = [392, 440, 523.25, 587.33, 659.25, 783.99];
	if (chapitre === 1){
		// Le village : un accord tenu, et de temps en temps quelques notes de luth.
		bourdon(196, "sine", 0.18); bourdon(293.66, "sine", 0.1);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.6) note(gamme[Math.floor(Math.random() * gamme.length)], 0.9, "triangle", 0.18); }, 2600));
	} else if (chapitre === 3){
		// La salle des serveurs : le souffle des ventilateurs, un ronronnement, un bip de temps en temps.
		souffle(380, 0.5); bourdon(60, "sine", 0.25); bourdon(120, "sine", 0.06);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.5) note(1320 + Math.floor(Math.random() * 3) * 220, 0.06, "square", 0.05); }, 4200));
	} else {
		// Le donjon : un grondement sourd, et des gouttes qui tombent dans le noir.
		bourdon(41.2, "sine", 0.35); bourdon(61.7, "sine", 0.12); souffle(160, 0.18);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.7) note(1400 + Math.random() * 600, 0.18, "sine", 0.16, 380); }, 2300));
	}
}
function majAmbiance(forcer){
	var voulu = PROFIL.son && PROFIL.ambiance !== false && !calmeDemande;
	var chapitre = state.chapitreEnCours();
	if (!voulu){ if (ambiance.chapitre !== null) arreterAmbiance(); return; }
	if (ambiance.chapitre !== chapitre || forcer && !ambiance.maitre) lancerAmbiance(chapitre);
}
var SON_SANS_AMBIANCE = Shell.sorts.son;
Shell.sorts.son = function(args, io){
	var r = SON_SANS_AMBIANCE(args, io);
	setTimeout(function(){ majAmbiance(true); }, 0);
	return r + (PROFIL.son ? C.gris("\n(Une ambiance discrète accompagne chaque chapitre : ambiance off pour la couper, en gardant les bips.)") : "");
};
Shell.sorts.ambiance = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : PROFIL.ambiance === false);
	PROFIL.ambiance = voulu;
	if (voulu && !PROFIL.son) PROFIL.son = true;
	enregistrerProfil();
	setTimeout(function(){ majAmbiance(true); }, 0);
	return voulu ? "Ambiance sonore activée : le village, la salle des serveurs, le donjon. (ambiance off pour la couper)" : "Ambiance coupée. Les bips restent (son off pour tout couper).";
};

/* ------------------------------------------------------------------ */
/* L'accessibilité : la taille du texte et le contraste fort             */
/* ------------------------------------------------------------------ */

var TAILLES = [0.85, 1, 1.15, 1.3, 1.5];
function appliquerAffichage(){
	var echelle = TAILLES.indexOf(PROFIL.taille) > -1 ? PROFIL.taille : 1;
	document.documentElement.style.fontSize = (16 * echelle) + "px";
	document.body.style.fontSize = (16 * echelle) + "px";
	document.body.classList.toggle("contraste", !!PROFIL.contraste);
}
Shell.sorts.texte = function(args, io){
	var i = TAILLES.indexOf(TAILLES.indexOf(PROFIL.taille) > -1 ? PROFIL.taille : 1);
	var a = args[0] || "";
	if (a === "+" || a === "plus" || a === "grand") i = Math.min(TAILLES.length - 1, i + 1);
	else if (a === "-" || a === "moins" || a === "petit") i = Math.max(0, i - 1);
	else if (a === "normal" || a === "0") i = 1;
	else return "Taille du texte : " + Math.round(TAILLES[i] * 100) + " %. " + C.gris("texte + pour agrandir, texte - pour réduire, texte normal pour revenir.");
	PROFIL.taille = TAILLES[i];
	enregistrerProfil();
	appliquerAffichage();
	return "Taille du texte : " + Math.round(TAILLES[i] * 100) + " %.";
};
Shell.sorts.contraste = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : !PROFIL.contraste);
	PROFIL.contraste = voulu;
	if (voulu) PROFIL.crt = false;
	enregistrerProfil();
	appliquerCrt();
	appliquerAffichage();
	return voulu ? "Contraste fort activé : texte blanc, couleurs vives, sans effet de vieil écran. (contraste off pour revenir)" : "Contraste normal. (crt on pour remettre le vieil écran)";
};

["quiz", "ambiance", "texte", "contraste"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 2, 0,
	["quiz", "le quiz d'un chapitre terminé (quiz 1, quiz 2, quiz 3)"],
	["ambiance", "l'ambiance sonore de chaque chapitre"],
	["texte + / -", "agrandir ou réduire le texte"],
	["contraste", "le contraste fort, plus lisible"]);
MANUEL_DU_JEU.quiz = "quiz n'est PAS une commande Linux : c'est une commande du jeu.\nÀ la fin de chaque chapitre, cinq questions tirées des leçons. quiz 1, quiz 2 ou quiz 3 pour le rejouer.";
MANUEL_DU_JEU.texte = "texte n'est PAS une commande Linux : elle règle la taille du texte du jeu.\n  texte +       plus grand\n  texte -       plus petit\n  texte normal  la taille d'origine";
MANUEL_DU_JEU.contraste = "contraste n'est PAS une commande Linux : elle passe le jeu en contraste fort (texte blanc, couleurs vives, sans effet de vieil écran).";
MANUEL_DU_JEU.ambiance = "ambiance n'est PAS une commande Linux : un fond sonore discret par chapitre. ambiance on, ambiance off.";

/* Au démarrage : l'affichage choisi, et le guide branché sur le terminal (une fois le terminal créé). */
appliquerAffichage();
if (term) brancherGuide();
else document.addEventListener("DOMContentLoaded", function(){ brancherGuide(); majObjectif(); });
