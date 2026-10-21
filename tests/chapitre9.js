/**
 * Le chapitre 9 (la Chronothèque, numéro interne 10) : la Chronique d'Éternité, Git de zéro à Chronomancien.
 *   node tests/chapitre9.js
 *
 * Les fichiers et les règles d'écriture, le départ direct et l'ouverture après le Grand Port, le plan du sablier,
 * l'horloge et les maîtres (et leurs rangs), les fausses validations (l'état réel des dépôts, pas la frappe), les
 * épreuves de rang, les nuits, l'assaut de l'aube en cas de retard, la bataille du temps, la sauvegarde en cours de
 * route, la régénération d'un dépôt cassé, puis la solution documentée jouée de bout en bout (20 sur 20,
 * Chronomancien, le cliffhanger constaté avec git cat-file).
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function vrai(jeu, expr, m){ verifier(jeu.lire(expr) === true, m + "  [" + expr + "]"); }
function faux(jeu, expr, m){ verifier(jeu.lire(expr) === false, m + "  [" + expr + "]"); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : ne devrait PAS être accompli"); }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 400)); }
function absent(texte, mot, m){ verifier(String(texte).indexOf(mot) === -1, m + " : « " + mot + " » ne devrait pas apparaître"); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");
var DOC = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");
var PREMIERE = 91, DERNIERE = 106;

/* Une partie neuve, partie directement à la Chronothèque (la neuvième enveloppe ou « chapitre 9 »). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 9", "oui");
	return jeu;
}
function t(jeu, c){ return jeu.jouerSolution(c); }
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
function minutes(jeu){ return jeu.lire("minutesCh9()"); }
function rang(jeu){ return jeu.lire("rangCh9()"); }
/* Le temps passe jusqu'à 22 h (comme autant de commandes tapées) : la commande suivante tombe dans la nuit. */
function jusquaNuit(jeu){ var m = minutes(jeu) % 1440, n = Math.max(0, Math.ceil((22 * 60 - m) / 5) - 1); jeu.lire("sCh9().compte = (sCh9().compte || 0) + " + n); }

/* Les commandes de la solution documentée (chapitre 9), partie par partie. Les lignes d'un here-document suivent leur commande. */
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) return [];
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}
function jusqua2(jeu, a, b){ var s = []; for (var p = a; p <= b; p++) s = s.concat(partie(p).map(function(c){ return t(jeu, c); })); return s; }
function jusqua(jeu, n){ return jusqua2(jeu, PREMIERE, n); }

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, les règles d'écriture, les images */
/* ================================================================== */
var MOTEUR = ["SortsGit.js", "SortsGitCli.js", "SortsGitCli2.js", "SortsGitForge.js"];
var CHAPITRE = ["Chronique.js", "Chapitre9.js", "Chronotheque.js", "HabitantsChronique.js"];
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	MOTEUR.concat(["ManuelGit.js"]).concat(CHAPITRE).forEach(function(f){ verifier(fs.existsSync(path.join(JS, f)), "le fichier " + f + " existe"); });
	var ordre = ["SortsPortAnnexes.js"].concat(MOTEUR).concat(["ManuelPort.js", "ManuelGit.js", "HabitantsPort.js"]).concat(CHAPITRE).concat(["Intro.js"]);
	var positions = ordre.map(function(f){ return index.indexOf("/" + f + "?"); });
	positions.forEach(function(p, i){ verifier(p > -1, "index.html charge " + ordre[i]); });
	var ordonnes = [positions[0]].concat(positions.slice(1, 5));
	verifier(ordonnes.every(function(p, i){ return i === 0 || p > ordonnes[i - 1]; }), "index.html : le moteur git après SortsPortAnnexes.js, dans l'ordre");
	var chap = positions.slice(7);
	verifier(chap.every(function(p, i){ return i === 0 || p > chap[i - 1]; }) && chap[0] > positions[6], "index.html : la Chronothèque après HabitantsPort.js, dans l'ordre, avant Intro.js");
	verifier(positions[5] < positions[4] || positions[5] > positions[4], "index.html : ManuelGit.js est chargé");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf(CHAPITRE.map(function(f){ return JSON.stringify(f); }).join(", ")) > -1, "tests/monde.js charge les quatre fichiers du chapitre, dans cet ordre");
	CHAPITRE.concat(["ManuelGit.js"]).forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		var esperluettes = chaines.filter(function(x){ return x.indexOf(" & ") > -1 && !/2>&1|&&|>&|« & »|&\s*$|\s&"$/.test(x); });
		verifier(esperluettes.length === 0, f + " : pas d'esperluette en prose : " + esperluettes.slice(0, 3).join(" | "));
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
		verifier(!/=>/.test(src.replace(/"(?:[^"\\\n]|\\.)*"/g, "").replace(/'(?:[^'\\\n]|\\.)*'/g, "")), f + " : ES5 (pas de fonction fléchée)");
		verifier(!/\.repeat\(/.test(src), f + " : ES5 (pas de String.repeat)");
	});
	MOTEUR.forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
		verifier(!/=>/.test(src.replace(/"(?:[^"\\\n]|\\.)*"/g, "").replace(/'(?:[^'\\\n]|\\.)*'/g, "").replace(/\/(?:[^\/\\\n]|\\.)+\/[gimsuy]*/g, "")), f + " : ES5 (pas de fonction fléchée)");
	});
	// Les prénoms : la liste fermée du chapitre (maîtres, habitants, Laurent et Grace).
	var prenoms = ["Gamaliel", "Bénédicte", "Andrii", "Irvan", "Georgette", "William", "Marc", "Kenyonn", "Anthony", "Guillaume", "Moustapha", "Jeremy", "Aurélien", "Amine",
		"Max", "Paolo", "Ilian", "Fabien", "Wisdom", "Eva-Lydia", "Laurent", "Grace"];
	var src9 = CHAPITRE.map(function(f){ return fs.readFileSync(path.join(JS, f), "utf8"); }).join("\n");
	prenoms.forEach(function(p){ verifier(src9.indexOf(p) > -1, "le prénom " + p + " est dans le chapitre"); });
	// Rien d'offensif : la bataille se gagne en défendant (restaurer, protéger, vérifier, contredire).
	verifier(!/ssh-keygen -y|id_ed25519(?!\.pub)[^"]*>|cat [^"]*id_ed25519(?!\.pub)/.test(src9), "le chapitre ne fait jamais lire une clé privée");
	// Les images.
	var images = ["loc_chronotheque.gif", "loc_chronotheque_victoire.gif", "loc_bataille_temps.gif", "loc_royaume_machine.gif", "loc_chronotheque_dossier.gif", "item_sceau_chronique.gif", "item_sablier.gif",
		"cine9_chronique.gif", "cine9_empreinte.gif", "cine9_page_reecrite.gif", "cine9_sablier.gif", "cine9_salles.gif", "cine9_tour_horloge.gif",
		"scene_chronotheque_nuit1.gif", "scene_chronotheque_nuit2.gif", "scene_chronotheque_nuit3.gif",
		"rang_scribe.gif", "rang_archiviste.gif", "rang_chroniqueur.gif", "rang_gardien.gif", "rang_chronomancien.gif"];
	["gamaliel", "benedicte", "andrii", "irvan", "georgette", "william", "marc", "kenyonn", "anthony", "guillaume", "moustapha", "jeremy", "aurelien", "amine",
		"max", "paolo", "ilian", "fabien", "wisdom", "eva_lydia"].forEach(function(m){ images.push("item_" + m + ".gif"); });
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, im)), "image " + im + " présente"); });
	var jeu = monde.nouveauMonde({});
	var badges = jeu.lire("Object.keys(TROPHEES_CH9).concat(['platine_ch9', 'ami_ch9'])");
	egal(badges.length, 27, "25 badges du chapitre, le platine et l'Ami de la Chronothèque");
	badges.forEach(function(b){ verifier(fs.existsSync(path.join(IMG, "badge_" + b + ".gif")), "médaille du badge " + b); });
	badges.forEach(function(b){ verifier(typeof jeu.lire("COMPETENCES[" + JSON.stringify(b) + "]") === "string", "le badge " + b + " a son nom"); });
	egal(jeu.lire("COMPETENCES.platine_ch9"), "Chronomancien de la Chronothèque", "le nom du platine");
	var lieux = jeu.lire("[ChronothequeCh9].concat(SALLES_CH9.map(function(s){ return s.lieu; })).map(function(r){ return r.room_pic; }).concat(SALLES_CH9.map(function(s){ return s.image; })).filter(function(x){ return !!x; }).join('|')").split("|");
	lieux.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, n.replace(/^.*\//, ""))), "image de la Chronothèque présente : " + n); });
	// Le décor n'apparaît pas avant l'ouverture.
	faux(jeu, "state.has('ch9Ouvert')", "partie neuve : la Chronothèque est fermée");
	var liste = jeu.taper("chapitre");
	contient(liste, "9. La Chronothèque ", "chapitre : la ligne 9, alignée");
	contient(jeu.taper("chapitre 10"), "1, 2, 3, 4, 5, 6, 7, 8 et 9", "chapitre 10 : il n'existe pas");
	contient(jeu.taper("sablier"), "chapitre 9", "sablier avant l'ouverture : il dit où il sert");
	contient(jeu.taper("man git"), "git", "man git existe");
	contient(jeu.taper("man gh"), "gh", "man gh existe");
})();

/* ================================================================== */
/* 2. Le départ direct, puis l'ouverture après le Grand Port            */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch9Ouvert')", "départ direct : la Chronothèque s'ouvre");
	vrai(jeu, "state.has('ch9Direct')", "départ direct : drapeau ch9Direct");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	egal(jeu.lire("current_room.room_name"), "Chronotheque", "départ direct : on arrive à la Chronothèque");
	egal(jeu.lire("Shell.cheminAffiche(ChronothequeCh9)"), "~/Cybersup/Chronotheque", "la Chronothèque est sous Cybersup");
	egal(jeu.lire("state.chapitreEnCours()"), 10, "chapitreEnCours vaut 10");
	egal(jeu.lire("numeroAffiche(10)"), 9, "le numéro affiché est 9");
	fait(jeu, "n9_entree", "n9_entree (l'arrivée)");
	egal(jeu.lire("state.queteEnCours().id"), "n9_sablier", "l'étape en cours est n9_sablier");
	verifier(/^J1 06:\d\d$/.test(jeu.lire("heureCh9()")), "il est J1, 6 h, à l'arrivée (" + jeu.lire("heureCh9()") + ")");
	egal(rang(jeu), 0, "on arrive Apprenti du Temps");
	egal(jeu.lire("nomRangCh9()"), "Apprenti du Temps", "nomRangCh9");
	egal(jeu.lire("ORDRE_DES_SORTS_10.join(' ')"), "git gh", "les sorts de la Chronothèque : git et gh");
	jeu.lire("ORDRE_DES_SORTS_10").forEach(function(s){
		faux(jeu, "state.knows(" + JSON.stringify(s) + ")", s + " s'apprend auprès d'un maître du temps");
		egal(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ")"), 10, "chapitreDuSort(" + s + ")");
	});
	var avant = jeu.lire("tousLesSorts().filter(function(s){ return [1, 2, 3, 5, 6, 7, 8, 9].indexOf(chapitreDuSort(s)) > -1; })");
	verifier(avant.length > 220, "socle des chapitres 1 à 8 : " + avant.length + " sorts");
	egal(avant.filter(function(s){ return jeu.lire("state.knows(" + JSON.stringify(s) + ")") !== true; }).length, 0, "socle acquis au départ direct");
	egal(jeu.lire("QUETES_CH9.length"), 43, "43 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH9.length"), 89, "89 défis (84 des maîtres, 5 d'honneur)");
	egal(jeu.lire("SALLES_CH9.filter(function(s){ return idsDefisSalleCh9(s.cle).length !== 6; }).map(function(s){ return s.cle; }).join(' ')"), "", "six défis par maître");
	egal(jeu.lire("SALLES_CH9.length"), 14, "quatorze salles");
	egal(jeu.lire("QUETES_CH9.filter(function(q){ return !/^n9_/.test(q.id); }).length"), 0, "les étapes s'appellent n9_*");
	egal(jeu.lire("QUETES_SECONDAIRES_CH9.filter(function(q){ return !/^s_n9_/.test(q.id); }).length"), 0, "les défis s'appellent s_n9_*");
	egal(jeu.lire("chapitreDeQuete('s_n9_rev_parse')"), 10, "chapitreDeQuete d'un défi");
	egal(jeu.lire("chapitreDeQuete('a9_worktree')"), 10, "chapitreDeQuete d'une annexe");
	egal(jeu.lire("state.xpMax10()"), 9060, "xpMax10");
	egal(jeu.lire("QUETES_CH9[QUETES_CH9.length - 1].id"), "n9_rapport", "la dernière étape est le rapport de la bataille du temps");
	egal(jeu.lire("Object.keys(INDICES_CH9).length"), 43, "un indice par étape (INDICES_CH9)");
	egal(jeu.lire("state.xp10"), 105, "l'arrivée rapporte ses 100 XP (et le lieu ses 5) au chapitre 9");
	contient(jeu.taper("chapitre 9"), "déjà ouvert", "chapitre 9 déjà ouvert : message clair");
	contient(jeu.taper("help 9"), "chapitre 9", "help 9");
	contient(jeu.taper("xp"), "CHAPITRE 9", "xp : le tableau du chapitre 9");
	contient(jeu.taper("quetes"), "Laurent", "quetes : l'étape de Laurent");
	contient(jeu.taper("cat Radio"), "Grace", "la radio de Grace à la Chronothèque");
	contient(jeu.taper("cat GrandSablier"), "J1", "le Grand Sablier dit l'heure");
	vrai(jeu, "!!G9.depot(DEPOTS_CH9.annales)", "les dépôts de la Chronothèque sont semés à l'arrivée");
	vrai(jeu, "!!G9.resoudreR('main')", "la vraie Chronique dort sur royaume");
	// Le départ direct depuis une partie engagée est refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("cd"); jeu2.taper("ls");
	jeu2.lire("state.complete('m_marche')");
	var r = jeu2.taper("chapitre 9", "oui");
	verifier(/déjà commencé/.test(r) && jeu2.lire("state.has('ch9Ouvert')") === false, "une partie engagée ne part pas directement à la Chronothèque");
	// L'ouverture normale : après le rapport du Grand Port (n8_rapport).
	var jeu3 = monde.nouveauMonde({});
	jeu3.taper("chapitre 8", "oui");
	faux(jeu3, "state.has('ch9Ouvert')", "le Grand Port en cours : la Chronothèque reste fermée");
	contient(jeu3.taper("cd ~/Cybersup/Chronotheque"), "aucun lieu", "la Chronothèque n'existe pas encore pendant le Grand Port");
	jeu3.lire("state.complete('n8_rapport'); verifierMonde()");
	vrai(jeu3, "state.has('ch9Ouvert')", "après n8_rapport : la Chronothèque s'ouvre");
	faux(jeu3, "state.has('ch9Direct')", "après n8_rapport : pas un départ direct");
	contient(jeu3.taper("cd ~/Cybersup/Chronotheque"), "Chronotheque", "cd ~/Cybersup/Chronotheque");
	fait(jeu3, "n9_entree", "n9_entree après le Grand Port");
	egal(jeu3.lire("state.chapitreEnCours()"), 10, "après l'arrivée, chapitreEnCours vaut 10");
	verifier(/^J1 06:\d\d$/.test(jeu3.lire("heureCh9()")), "après le Grand Port aussi, il est J1, 6 h, à l'arrivée (" + jeu3.lire("heureCh9()") + ")");
	vrai(jeu3, "!!G9.depot(DEPOTS_CH9.annales)", "après le Grand Port aussi, les dépôts sont semés");
	contient(jeu3.taper("cat Laurent"), "Laurent", "Laurent attend au lutrin");
	// La neuvième enveloppe : le Sceau de la Chronique ; la touche 9.
	var game = fs.readFileSync(path.join(JS, "Game.js"), "utf8");
	verifier(game.indexOf("Le Sceau de la Chronique") > -1 && game.indexOf("item_sceau_chronique.gif") > -1, "Game.js : la neuvième enveloppe, le Sceau de la Chronique");
	verifier(/commencerChapitre9/.test(game), "Game.js : la touche 9 mène à la Chronothèque");
	verifier(/nomRangCh9/.test(game) && /heureCh9/.test(game), "Game.js : la barre d'état dit l'heure et le rang");
	verifier(/loc_chronotheque_victoire\.gif/.test(game) && /CertificatChronotheque/.test(game), "Game.js : l'écran de victoire de la Chronothèque");
})();

/* ================================================================== */
/* 3. Le sablier, Laurent, l'Ordre, l'horloge, les maîtres et leurs rangs */
/* ================================================================== */
(function(){
	var jeu = neuf();
	pasFait(jeu, "n9_sablier", "rien lu : pas de n9_sablier");
	var l = jeu.taper("sablier");
	contient(l, "LE GRAND SABLIER", "sablier : le titre");
	contient(l, "pas Linux", "sablier : une commande du jeu, dit-elle");
	jeu.lire("SALLES_CH9").forEach(function(s){ contient(l, s.nom, "sablier : la salle " + s.nom); });
	contient(l, "37 / 100", "sablier : l'intégrité de départ (37)");
	contient(l, "Apprenti du Temps", "sablier : le rang");
	pasFait(jeu, "n9_sablier", "sablier sans Laurent ni l'Ordre : pas de n9_sablier");
	jeu.taper("cat Laurent");
	jeu.taper("cat Ordre");
	jeu.taper("sablier");
	fait(jeu, "n9_sablier", "Laurent, l'Ordre, puis le sablier");
	contient(jeu.taper("man sablier"), "sablier", "man sablier existe");
	contient(jeu.taper("sceaux"), "Pour devenir Scribe", "sceaux : ce qu'il manque pour le rang suivant");
	// L'horloge : cinq minutes par commande ; un here-document ne compte qu'une fois.
	var m0 = minutes(jeu);
	jeu.taper("ls"); jeu.taper("ls"); jeu.taper("ls");
	egal(minutes(jeu) - m0, 15, "trois commandes : quinze minutes");
	m0 = minutes(jeu);
	jeu.taper("ls; ls; ls");
	egal(minutes(jeu) - m0, 15, "une ligne de trois commandes : quinze minutes");
	m0 = minutes(jeu);
	t(jeu, "cat > ~/note.txt <<'FIN'"); t(jeu, "une ligne"); t(jeu, "une autre"); t(jeu, "FIN");
	egal(minutes(jeu) - m0, 5, "un here-document : cinq minutes, pas une par ligne");
	// Les maîtres : vivants, mais leur salle s'ouvre à leur rang.
	jeu.taper("cd SalleDesSceaux");
	var g = jeu.taper("cat Gamaliel");
	contient(g, "Gamaliel", "Gamaliel se présente");
	contient(g, "git config --global user.name", "Gamaliel donne la syntaxe");
	vrai(jeu, "state.knows('git')", "Gamaliel apprend git");
	verifier((g.match(/\[ \]/g) || []).length >= 6, "Gamaliel montre ses six défis à faire");
	jeu.taper("cd ..");
	contient(jeu.taper("cat SalleDesParadoxes/Kenyonn"), "Cette salle s'ouvre aux Archivistes", "Kenyonn attend un Archiviste");
	contient(jeu.taper("cat HautConseil/Amine"), "Gardien", "Amine attend un Gardien du Temps");
	faux(jeu, "state.knows('gh')", "gh s'apprend au Haut-Conseil, pas avant");
	// Un sort git qui échoue ne casse rien : hors d'un dépôt, l'erreur du vrai.
	contient(jeu.taper("git status"), "not a git repository", "git status hors d'un dépôt : l'erreur du vrai");
	contient(jeu.taper("git frobnicate"), "is not a git command", "une sous-commande inconnue : l'erreur du vrai");
})();

/* ================================================================== */
/* 4. Les fausses validations : l'état réel des dépôts, pas la frappe   */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jusqua2(jeu, 91, 91);
	jouer(jeu, ["cd SalleDesSceaux; cat Gamaliel", "git config --global user.name \"<moi>\"", "git config --global user.email \"<moi>@chronique.lan\"", "git config --global init.defaultBranch main"]);
	pasFait(jeu, "n9_config", "une identité posée sans regarder d'où vient chaque réglage (--show-origin) : pas encore");
	t(jeu, "git config --list --show-origin");
	fait(jeu, "n9_config", "--show-origin : n9_config");
	// L'Autel : le voile posé, mais __pycache__ toujours scellé.
	jouer(jeu, ["cd ~/Cybersup/Chronotheque/AutelDesOffrandes; cat Benedicte", "cd ~/chronotheque/autel"]);
	t(jeu, "printf '.env\\n__pycache__/\\n*.log\\n' > .gitignore");
	t(jeu, "git add .gitignore");
	t(jeu, "git commit -m \"autel: le voile\"");
	pasFait(jeu, "n9_voile", "un voile qui ne retire pas __pycache__ déjà scellé : pas de n9_voile");
	t(jeu, "git rm -r --cached __pycache__");
	t(jeu, "git commit -m \"autel: retire les caches\"");
	fait(jeu, "n9_voile", "__pycache__ retiré de l'index : n9_voile");
	// Deux changements sans rapport dans un seul sceau : pas d'offrande.
	t(jeu, "git add autel.py");
	t(jeu, "git commit -m \"autel: tout d'un coup\"");
	pasFait(jeu, "n9_offrande", "deux changements dans un seul sceau : pas de n9_offrande");
	// Le dépôt se régénère : regenerer autel, et l'on recommence proprement.
	t(jeu, "cd ~");
	contient(t(jeu, "regenerer autel"), "autel", "regenerer autel");
	contient(t(jeu, "cat ~/chronotheque/autel/autel.py"), "cierge-allume", "l'autel neuf a ses deux changements en cours");
	jouer(jeu, ["cd ~/chronotheque/autel", "printf '.env\\n__pycache__/\\n*.log\\n' > .gitignore", "git rm -r --cached __pycache__", "git add .gitignore", "git commit -m \"autel: le voile\"",
		"git add -p autel.py", "git commit -m \"autel: l'heure\"", "git add autel.py", "git commit -m \"autel: refuse un cierge inconnu\""]);
	fait(jeu, "n9_offrande", "add -p, deux sceaux : n9_offrande");
	contient(t(jeu, "regenerer nimporte"), "regenerer", "regenerer d'un nom inconnu : la liste");
})();
(function(){
	// L'Oracle : un hash faux dans REPONSES.md ne passe pas.
	var jeu = neuf();
	jusqua(jeu, 93);
	jouer(jeu, ["cd ~/Cybersup/Chronotheque/Oracle; cat Irvan", "cd ~/chronotheque/annales", "git log --oneline --graph --all", "git log -S \"Porte d'Argent\" --oneline", "git log --author=Grace --oneline | wc -l"]);
	t(jeu, "printf '1. Réponse : 0000000\\n2. Réponse : pg\\n3. Réponse : <n-grace>\\n4. Réponse : le Vieux Port\\n' > REPONSES.md");
	pasFait(jeu, "n9_oracle", "un hash inventé : pas de n9_oracle");
	t(jeu, "printf '1. Réponse : <hash-pg>\\n2. Réponse : pg\\n3. Réponse : <n-grace>\\n4. Réponse : le Vieux Port\\n' > REPONSES.md");
	fait(jeu, "n9_oracle", "le vrai hash : n9_oracle");
})();
(function(){
	// La requête empoisonnée : l'approuver (les golems sont verts) ne compte pas.
	var jeu = neuf();
	jusqua(jeu, 100);
	egal(rang(jeu), 4, "avant l'épreuve V : Gardien du Temps");
	var n = jeu.lire("sCh9().prPoison");
	verifier(typeof n === "number" && n > 0, "la requête empoisonnée est posée (#" + n + ")");
	contient(t(jeu, "gh pr checks " + n), "pass", "les golems sont verts sur la requête empoisonnée");
	t(jeu, "gh pr review " + n + " --approve -b \"Ça a l'air bon.\"");
	pasFait(jeu, "n9_rang5", "approuver sans lire le diff : pas de n9_rang5");
	t(jeu, "gh pr diff " + n);
	t(jeu, "gh pr review " + n + " --request-changes -b \"Non.\"");
	pasFait(jeu, "n9_rang5", "refuser sans dire pourquoi : pas encore");
	t(jeu, "gh pr review " + n + " --request-changes -b \"La loi 10 est réécrite en douce : le porteur du sceau gris n'a rien à faire dans nos lois.\"");
	fait(jeu, "n9_rang5", "le diff lu, la loi 10 nommée : n9_rang5");
	egal(rang(jeu), 5, "Chronomancien");
})();

/* ================================================================== */
/* 5. Les épreuves de rang : chacune donne son sceau, une scène, l'image du rang */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var s = jusqua(jeu, 92).join("\n");
	vrai(jeu, "epreuveOuverteCh9(1)", "l'acte I fini : l'épreuve I s'ouvre");
	s = jusqua2(jeu, 93, 93).join("\n");
	contient(s, "ÉPREUVE DE RANG I", "l'épreuve I s'annonce");
	egal(rang(jeu), 1, "épreuve I : Scribe");
	fait(jeu, "s_n9_scribe_j1", "Scribe avant la première nuit : le défi d'honneur");
	s = jusqua2(jeu, 94, 95).join("\n");
	contient(s, "ÉPREUVE DE RANG II", "l'épreuve II s'annonce");
	egal(rang(jeu), 2, "épreuve II : Archiviste");
	s = jusqua2(jeu, 96, 97).join("\n");
	contient(s, "ÉPREUVE DE RANG III", "l'épreuve III s'annonce");
	egal(rang(jeu), 3, "épreuve III : Chroniqueur");
	s = jusqua2(jeu, 98, 99).join("\n");
	contient(s, "ÉPREUVE DE RANG IV", "l'épreuve IV s'annonce");
	egal(rang(jeu), 4, "épreuve IV : Gardien du Temps");
	fait(jeu, "s_n9_gardien_j2", "Gardien avant la fin du J2 : le défi d'honneur");
	vrai(jeu, "(function(){ var ch = DEPOTS_CH9.epreuve4; return G9.historique(ch, 'main').every(function(h){ return G9.fichier(ch, h, 'notes-secretes.txt') === null; }); })()", "le chant des marées : plus aucun sceau de main ne contient le secret");
	s = jusqua2(jeu, 100, 101).join("\n");
	contient(s, "ÉPREUVE DE RANG V", "l'épreuve V s'annonce");
	egal(rang(jeu), 5, "épreuve V : Chronomancien");
	contient(jeu.taper("sceaux"), "Chronomancien", "sceaux : Chronomancien");
	["sceau_scribe", "sceau_archiviste", "sceau_chroniqueur", "sceau_gardien", "sceau_chronomancien"].forEach(function(b){ vrai(jeu, "badgeGagne('" + b + "')", "le badge " + b); });
	verifier(jeu.lire("sCh9().nuitsVues") >= 1, "au moins une nuit à la Chronothèque pendant la montée en rang");
	// La bataille commence au sacre du Chronomancien, avant l'aube.
	vrai(jeu, "!!sCh9().bataille && sCh9().bataille.avantAube === true", "la Grande Synchronisation sonne au sacre, avant l'aube");
	contient(s, "LA GRANDE SYNCHRONISATION", "la Grande Synchronisation s'annonce");
})();

/* ================================================================== */
/* 6. Les nuits, puis l'assaut de l'aube en cas de retard               */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jouer(jeu, ["cat Laurent; cat Ordre", "sablier"]);
	jusquaNuit(jeu);
	var s = jeu.taper("ls");
	contient(s, "LA NUIT 1 À LA CHRONOTHÈQUE", "22 h : la première nuit");
	contient(s, "Grace", "la radio de Grace, la nuit");
	verifier(/^J2 06:\d\d$/.test(jeu.lire("heureCh9()")), "on se lève le J2 à 6 h (" + jeu.lire("heureCh9()") + ")");
	pasFait(jeu, "s_n9_scribe_j1", "pas Scribe avant la première nuit : le défi d'honneur est perdu");
	jusquaNuit(jeu);
	contient(jeu.taper("ls"), "LA NUIT 2 À LA CHRONOTHÈQUE", "la deuxième nuit");
})();
(function(){
	// Un retard : l'aube du J4 arrive avant le Chronomancien. Les salles en friche s'éteignent ; la réécriture attend
	// que la Chronique soit clonée et défendue, pour qu'un joueur en retard ne clone jamais une histoire déjà fausse.
	var jeu = neuf();
	jusqua(jeu, 96);
	var s = "";
	for (var i = 0; i < 5 && jeu.lire("minutesCh9()") < jeu.lire("AUBE_CH9"); i++){ jusquaNuit(jeu); s += jeu.taper("ls"); }
	s += jeu.taper("ls");
	contient(s, "L'AUBE DU QUATRIÈME JOUR.", "l'assaut de l'aube");
	contient(s, "le Faussaire attend", "l'aube annonce que la réécriture attend la Chronique");
	absent(s, "LA GRANDE SYNCHRONISATION", "pas de réécriture avant que la Chronique soit clonée");
	vrai(jeu, "!!sCh9().assaut && !sCh9().bataille", "l'assaut a frappé, la bataille attend");
	vrai(jeu, "sCh9().assaut.salles.length > 0", "les salles en friche s'éteignent (" + jeu.lire("sCh9().assaut.salles.join(' ')") + ")");
	contient(jeu.taper("sablier"), "a sonné", "sablier : la Grande Synchronisation a sonné");
	// On n'abandonne rien : la suite se joue après l'aube, et la Chronique peut encore être sauvée.
	var suite = jusqua2(jeu, 97, 100).join("\n");
	contient(suite, "LA GRANDE SYNCHRONISATION", "la réécriture frappe une fois la Chronique clonée et défendue");
	contient(suite, "L'aube est passée", "le texte dit que l'aube est passée");
	vrai(jeu, "!!sCh9().bataille && sCh9().bataille.avantAube === false && sCh9().bataille.reecriture === true", "la bataille commence après l'aube, avec la réécriture");
	jusqua2(jeu, 101, 103);
	fait(jeu, "n9_rapport", "après l'aube, la Chronique se sauve encore : le rapport est contresigné");
	pasFait(jeu, "s_n9_avant_aube", "la bataille après l'aube : pas le défi d'honneur");
	vrai(jeu, "state.has('victoireCh9')", "la victoire, même en retard");
	egal(jeu.lire("integriteCh9()"), 100, "même en retard, la Chronique revient à 100");
})();

/* ================================================================== */
/* 7. La bataille : rendre la vraie histoire, le rempart, les faux sceaux, le rapport */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jusqua(jeu, 101);
	vrai(jeu, "!!sCh9().bataille && sCh9().bataille.reecriture === true", "le Faussaire a réécrit main sur royaume");
	contient(jouer(jeu, ["cd ~/chronotheque/chronique", "git fetch"]), "forced update", "git fetch : « forced update »");
	pasFait(jeu, "n9_alerte", "fetch seul, sans comparer les deux lignes : pas encore");
	t(jeu, "git log --oneline main..origin/main");
	fait(jeu, "n9_alerte", "fetch puis la comparaison : n9_alerte");
	contient(t(jeu, "git log --oneline origin/main..main"), "chronique", "notre main locale a gardé la vraie histoire");
	pasFait(jeu, "n9_restauration", "regarder ne répare pas");
	contient(t(jeu, "git push origin main"), "rejected", "un push simple est refusé : main a été réécrite sur royaume");
	t(jeu, "git push --force-with-lease origin main");
	fait(jeu, "n9_restauration", "--force-with-lease : la vraie histoire rendue");
	pasFait(jeu, "n9_rempart", "sans rempart côté serveur, rien n'empêche une nouvelle réécriture");
	var r = jouer(jeu, ["ssh royaume", "cd /srv/git/chronique.git", "git config receive.denyNonFastForwards true", "git config receive.denyDeletes true", "exit"]);
	fait(jeu, "n9_rempart", "le rempart dressé");
	contient(r, "Le rempart tient", "le Faussaire s'y brise aussitôt");
	contient(r, "Deux nouveaux sceaux", "il pousse alors en avant deux faux sceaux");
	t(jeu, "cd ~/chronotheque/chronique");
	t(jeu, "git pull");
	var sig = t(jeu, "git log --show-signature -2");
	contient(sig, jeu.lire("signatureBastionPort()"), "git log --show-signature : l'empreinte de la clé du Faussaire");
	contient(sig, "No principal matched", "la cire n'est pas celle d'un signataire connu");
	t(jeu, "git reset --hard HEAD~2");
	pasFait(jeu, "n9_faux_sceaux", "effacer les faux sceaux chez soi (reset) ne les contredit pas sur royaume");
	t(jeu, "git pull");
	t(jeu, "git revert --no-edit HEAD HEAD~1");
	t(jeu, "git push");
	fait(jeu, "n9_faux_sceaux", "contredits par revert, poussés : n9_faux_sceaux");
	t(jeu, "sablier");
	fait(jeu, "n9_integrite", "la Chronique relue au-dessus de 90");
	egal(jeu.lire("integriteCh9()"), 100, "intégrité finale : 100");
	// Un rapport sans l'empreinte : Laurent la réclame.
	t(jeu, "echo 'Chronique : intégrité 100. Faussaire : réécriture forcée. Empreinte : inconnue. Rempart : posé. Reste : enquêter.' > ~/chronotheque/rapport.txt");
	var rr = t(jeu, "cp ~/chronotheque/rapport.txt ~/Cybersup/Chronotheque/BoiteDeLaurent");
	contient(rr, "l'empreinte de la clé du Faussaire", "Laurent réclame l'empreinte");
	pasFait(jeu, "n9_rapport", "un rapport sans l'empreinte : pas contresigné");
	t(jeu, "echo 'Empreinte de la clé : <empreinte>' >> ~/chronotheque/rapport.txt");
	var fin = t(jeu, "cp ~/chronotheque/rapport.txt ~/Cybersup/Chronotheque/BoiteDeLaurent");
	fait(jeu, "n9_rapport", "le rapport complet : contresigné");
	vrai(jeu, "state.has('victoireCh9')", "la victoire");
	contient(fin, "LA CHRONIQUE TIENT.", "la victoire annoncée");
	contient(fin, "Chronomancien. La Chronique est à toi.", "Laurent contresigne");
	contient(fin, "Ce sceau est daté de demain.", "le cliffhanger de Grace");
	contient(fin, "À suivre.", "« À suivre. »");
})();

/* ================================================================== */
/* 8. La sauvegarde en cours de route, un dépôt qui disparaît          */
/* ================================================================== */
(function(){
	var st = {};
	var jeu = neuf(st);
	jusqua(jeu, 96);
	egal(rang(jeu), 2, "avant la sauvegarde : Archiviste");
	var heure = minutes(jeu), tete = jeu.lire("G9.resoudre(DEPOTS_CH9.paradoxe, 'refs/heads/main')");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	vrai(jeu2, "state.has('ch9Ouvert')", "rechargement : la Chronothèque toujours ouverte");
	fait(jeu2, "n9_rang2", "rechargement : l'épreuve II reste gagnée");
	egal(rang(jeu2), 2, "rechargement : toujours Archiviste");
	egal(minutes(jeu2), heure, "rechargement : l'horloge reprend où elle était");
	egal(jeu2.lire("G9.resoudre(DEPOTS_CH9.paradoxe, 'refs/heads/main')"), tete, "rechargement : les sceaux du paradoxe sont toujours là (mêmes hashes)");
	contient(jeu2.taper("cd ~/chronotheque/paradoxe; git log --oneline -1"), tete.substring(0, 7), "rechargement : git log relit le dépôt");
	contient(jeu2.taper("cat prophetie.txt"), "la mer se lève", "rechargement : la copie de travail aussi");
	contient(jeu2.taper("sablier"), "Archiviste", "rechargement : sablier dit Archiviste");
	// La suite se joue après le rechargement.
	jusqua2(jeu2, 97, 97);
	egal(rang(jeu2), 3, "après rechargement, l'épreuve III se gagne");
	// Un dépôt effacé avant d'avoir servi est reposé par son maître.
	jeu2.taper("cd ~");
	jeu2.taper("rm -rf ~/chronotheque/prophetie");
	contient(jeu2.taper("ls ~/chronotheque"), "prophetie", "un dépôt effacé avant ses étapes est reposé");
	vrai(jeu2, "!!G9.depot(DEPOTS_CH9.prophetie)", "le dépôt reposé est un vrai dépôt");
})();

/* ================================================================== */
/* 9. La partie complète : la solution documentée, à 20 sur 20          */
/* ================================================================== */
(function(){
	var debut = DOC.indexOf("## Chapitre 9 : la Chronique d'Éternité"), fin = DOC.indexOf("## L'épreuve finale");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 9 avant l'épreuve finale");
	var section = DOC.substring(debut, fin);
	for (var n = PREMIERE; n <= DERNIERE; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 9) : pas de tiret cadratin");
	verifier(section.indexOf(" & ") === -1, "docs/solution.md (chapitre 9) : pas d'esperluette");
	var blocs = section.split("```").filter(function(x, i){ return i % 2 === 1; }).join("\n");
	verifier(!/^\$ /m.test(blocs), "docs/solution.md (chapitre 9) : pas de $ en tête de ligne dans les blocs");
	verifier(blocs.split("\n").filter(function(l){ return /^# /.test(l); }).every(function(l){ return /^# (Les réponses|La salle|Le Labyrinthe)/.test(l); }), "docs/solution.md (chapitre 9) : un # en tête de ligne seulement dans un here-document (titre de fichier markdown)");
	var commandes = [];
	for (var p = PREMIERE; p <= DERNIERE; p++) commandes = commandes.concat(partie(p));
	verifier(commandes.length > 350, "la solution du chapitre 9 compte " + commandes.length + " lignes");
	var jeu = neuf();
	var sorties = [], etapes = {};
	commandes.forEach(function(c){
		var s = t(jeu, c);
		sorties.push(s);
		verifier(!/TypeError|ReferenceError|undefined is not|Cannot read propert/.test(s), "aucune erreur JavaScript à « " + c + " » : " + s.substring(0, 200));
		["n9_rang1", "n9_rang4", "n9_rang5", "n9_rapport"].forEach(function(id){ if (!etapes[id] && q(jeu, id)) etapes[id] = { heure: jeu.lire("heureCh9()"), compte: jeu.lire("sCh9().compte") }; });
	});
	egal(jeu.lire("QUETES_CH9.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : toutes les étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH9.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : tous les défis");
	egal(jeu.lire("state.xp10"), 9060, "partie complète : 9060 XP");
	egal(jeu.lire("state.noteTexte(10)"), "20 / 20", "partie complète : 20 sur 20");
	egal(jeu.lire("state.malus10"), 0, "partie complète : aucun indice acheté");
	vrai(jeu, "state.has('platine_ch9')", "partie complète : le platine");
	vrai(jeu, "state.has('victoireCh9')", "partie complète : la victoire");
	egal(rang(jeu), 5, "partie complète : Chronomancien");
	["s_n9_scribe_j1", "s_n9_gardien_j2", "s_n9_avant_aube", "s_n9_sans_indice", "s_n9_empreinte"].forEach(function(id){ fait(jeu, id, "partie complète : défi d'honneur " + id); });
	egal(jeu.lire("sCh9().scoreDepart"), 37, "partie complète : intégrité de départ 37");
	egal(jeu.lire("sCh9().scoreFinal"), 100, "partie complète : intégrité finale 100");
	verifier(sorties.some(function(s){ return /Salle tenue/.test(s); }), "partie complète : les salles tenues sont annoncées");
	verifier(sorties.some(function(s){ return /LA NUIT 1 À LA CHRONOTHÈQUE/.test(s); }), "partie complète : une nuit à la Chronothèque");
	verifier(sorties.some(function(s){ return /LA GRANDE SYNCHRONISATION/.test(s); }), "partie complète : la bataille");
	verifier(sorties.some(function(s){ return /LA CHRONIQUE TIENT\./.test(s); }), "partie complète : la victoire annoncée");
	verifier(sorties.some(function(s){ return /Chronomancien\. La Chronique est à toi\./.test(s); }), "partie complète : Laurent contresigne");
	verifier(sorties.some(function(s){ return /Ce sceau est daté de demain\./.test(s); }), "partie complète : le cliffhanger de Grace");
	verifier(sorties.some(function(s){ return /À suivre\./.test(s); }), "partie complète : « À suivre. »");
	// Le cliffhanger se constate avec git : le committer P.G., la date de demain, la cire du Bastion.
	var sig = jeu.lire("signatureBastionPort()");
	verifier(/^SHA256:/.test(sig), "la signature est une empreinte de clé SSH (" + sig + ")");
	var faux1 = jeu.lire("sCh9().fauxSceaux[0]");
	t(jeu, "cd ~/chronotheque/chronique");
	var brut = t(jeu, "git cat-file -p " + faux1);
	contient(brut, "committer P.G.", "git cat-file -p : le committer s'appelle P.G.");
	var dc = /^committer .* (\d+) [+-]\d{4}$/m.exec(brut), da = /^author .* (\d+) [+-]\d{4}$/m.exec(brut);
	verifier(!!dc && !!da && +dc[1] - +da[1] > 12 * 3600, "git cat-file -p : la date du committer est celle de demain");
	contient(brut, "gpgsig -----BEGIN SSH SIGNATURE-----", "git cat-file -p : la cire du sceau");
	contient(t(jeu, "git log --show-signature -1 " + faux1), sig, "git log --show-signature : l'empreinte du Bastion sur le faux sceau");
	// Les quêtes annexes, le badge Ami, les souvenirs : hors note.
	jeu.lire("QUETES_ANNEXES").filter(function(a){ return a.chapitre === 10; }).forEach(function(a){ fait(jeu, a.id, "partie complète : annexe " + a.id); });
	vrai(jeu, "state.has('ami_ch9')", "partie complète : Ami de la Chronothèque");
	egal(jeu.lire("state.xp10"), 9060, "les annexes ne changent pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") >= 300, "les annexes donnent leur bonus (" + jeu.lire("state.xpAnnexes") + ")");
	vrai(jeu, "(function(){ var ch = DEPOTS_CH9.coffre; return G9.historique(ch, 'HEAD').every(function(h){ return G9.fichier(ch, h, 'secrets.txt') === null; }); })()", "le coffre d'Eva-Lydia : le secret purgé de toute l'histoire");
	contient(jeu.taper("tar -tf ~/chronotheque/runes-v1.0.tar"), "vitrail", "git archive : tar -tf lit le paquet");
	absent(jeu.taper("tar -tf ~/chronotheque/runes-v1.0.tar"), ".git", "git archive : pas de .git dans le paquet");
	contient(jeu.taper("sablier"), "100 / 100", "sablier : la Chronique au complet");
	contient(jeu.taper("xp"), "20 / 20", "xp : 20 sur 20");
	var bad = jeu.taper("badges chronique");
	contient(bad, "Ami de la Chronothèque", "badges chronique : Ami de la Chronothèque");
	contient(bad, "Chronomancien de la Chronothèque", "badges chronique : le platine");
	var cert = jeu.taper("cat ~/CertificatChronotheque");
	contient(cert, "20", "le certificat porte la note");
	contient(cert, "CHAPITRE 9", "le certificat nomme le chapitre 9");
	var code = jeu.lire("state.codeDuCertificat10()");
	verifier(typeof code === "string" && code.length > 8, "le certificat a un code de vérification");
	contient(jeu.taper("verifier " + code), "Certificat Git (la Chronothèque, chapitre 9)", "verifier CODE : le certificat de la Chronothèque");
	jeu.lire("SALLES_CH9").forEach(function(s){
		var m = jeu.lire("MAITRES_CH9[" + JSON.stringify(s.cle) + "].nom");
		var item = m.normalize("NFD").replace(/[̀-ͯ]/g, "");
		var tx = jeu.taper("cat ~/Cybersup/Chronotheque/" + s.nom + "/" + item);
		egal((tx.match(/\[x\]/g) || []).length, (tx.match(/\[[x ]\]/g) || []).length, m + " coche tous ses défis à la fin");
		absent(tx, "[ ]", m + " : plus rien à faire");
	});
	egal(jeu.lire("state.queteEnCours()"), null, "départ direct terminé : queteEnCours vaut null");
	console.log("Repères : " + Object.keys(etapes).map(function(k){ return k + " " + etapes[k].heure + " (" + etapes[k].compte + " commandes)"; }).join(", ") + " ; fin " + jeu.lire("heureCh9()") + " (" + jeu.lire("sCh9().compte") + " commandes).");
	verifier(/^J1 /.test((etapes.n9_rang1 || {}).heure || ""), "Scribe le J1");
	verifier(/^J[12] /.test((etapes.n9_rang4 || {}).heure || ""), "Gardien du Temps au plus tard le J2");
})();

/* Le quiz, la scène et la cinématique du chapitre (Guide.js, navigateur). */
(function(){
	var guide = fs.readFileSync(path.join(JS, "Guide.js"), "utf8");
	var bloc = guide.substring(guide.indexOf("var QUIZ = {"), guide.indexOf("var banque"));
	var i = bloc.search(/\n\t10: \[/);
	verifier(i > -1, "Guide.js : le quiz du chapitre 9 (QUIZ[10])");
	egal((bloc.substring(i + 3).split(/\n\t\d+: \[/)[0].match(/\n\t\t\["/g) || []).length, 12, "douze questions au quiz du chapitre 9");
	verifier(/"9"\s*:\s*10/.test(guide), "Guide.js : quiz 9 mène au chapitre interne 10");
	verifier(/n9_entree/.test(guide) && /cine9_/.test(guide), "Guide.js : la scène et la cinématique du chapitre 9");
	var jeu = neuf();
	contient(jeu.taper("quiz 9"), "", "quiz 9 se lance");
})();

console.log("chapitre9 : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exitCode = 1;
