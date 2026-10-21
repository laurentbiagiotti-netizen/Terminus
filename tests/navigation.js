/**
 * L'aide détaillée des commandes du jeu (help COMMANDE, COMMANDE --help, man COMMANDE) et
 * la navigation entre chapitres (chapitres, aller N, l'ouverture en renfort en cours de partie).
 *    node tests/navigation.js
 */
var fs = require("fs");
var path = require("path");
var nouveauMonde = require("./monde.js").nouveauMonde;

var echecs = 0, verifications = 0;
function verifier(condition, message){
	verifications++;
	if (!condition){ echecs++; console.log("ÉCHEC : " + message); }
}
function contient(texte, morceau, message){
	verifier(String(texte).indexOf(morceau) > -1, (message || "") + " : « " + morceau + " » attendu, reçu :\n" + texte + "\n");
}
function absent(texte, morceau, message){
	verifier(String(texte).indexOf(morceau) === -1, (message || "") + " : « " + morceau + " » inattendu, reçu :\n" + texte + "\n");
}
function egal(a, b, message){ verifier(JSON.stringify(a) === JSON.stringify(b), message + " : attendu " + JSON.stringify(b) + ", reçu " + JSON.stringify(a)); }

var solution = [];
var dansBloc = false;
fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(ligne){
	if (ligne.indexOf("```") === 0){ dansBloc = !dansBloc; return; }
	if (dansBloc && ligne.trim() !== "") solution.push(ligne);
});
/* Joue la solution de la ligne « apres » (exclue, null : depuis le début) jusqu'à la ligne « repere » (incluse). */
function jouerDe(jeu, apres, repere){
	var i = 0;
	if (apres !== null){
		i = solution.indexOf(apres);
		if (i === -1) throw new Error("repère introuvable dans la solution : " + apres);
		i++;
	}
	for (; i < solution.length; i++){
		jeu.jouerSolution(solution[i]);
		if (solution[i] === repere) return;
	}
	throw new Error("repère introuvable dans la solution : " + repere);
}
function sansCouleur(t){ return String(t).replace(/\x1b\[[0-9;]*m/g, ""); }

/* ================================================================== */
/* 1. Une page d'aide pour chaque commande du jeu                      */
/* ================================================================== */
(function(){
	var jeu = nouveauMonde({}, 51);
	var commandes = jeu.lire("SORTS_DU_JEU.slice()");
	["chapitres", "aller", "badges", "quetes", "indice", "xp", "chapitre", "port", "galons"].forEach(function(c){ verifier(commandes.indexOf(c) > -1, c + " est une commande du jeu"); });
	commandes.forEach(function(nom){
		var page = jeu.taper("help " + nom);
		contient(page, "Commande du jeu", "help " + nom + " : une page");
		verifier(page.split("\n").length >= 4, "help " + nom + " : une vraie page, pas un résumé d'une ligne");
		verifier(new RegExp("(^|\\n)  " + nom.replace(/[-]/g, "\\-") + "( |\\n|$)").test(page) || nom === "aide" || nom === "sorts" || nom === "score" || nom === "rang",
			"help " + nom + " : la page montre comment taper la commande");
		// (Les lignes de fin, +5 XP ou un succès, viennent du tour de jeu, pas de la page.)
		egal(jeu.taper(nom + " --help").split("\n").slice(0, 6), page.split("\n").slice(0, 6), nom + " --help montre la même page que help " + nom);
		contient(jeu.taper("man " + nom), page.split("\n")[2], "man " + nom + " montre la même page");
		absent(page, "\u2014", "help " + nom + " : pas de tiret cadratin");
		absent(page, " & ", "help " + nom + " : pas d'esperluette");
	});
	// Les commandes du navigateur (Guide.js) ont aussi leur page, et Guide.js ne la remplace plus.
	["quiz", "ambiance", "texte", "contraste", "cinematique"].forEach(function(nom){
		verifier(jeu.lire("typeof PAGES_DU_JEU." + nom + " === 'string' && MANUEL_DU_JEU." + nom + " === PAGES_DU_JEU." + nom), "la page de " + nom + " existe");
	});
	var guide = fs.readFileSync(path.join(__dirname, "..", "Web", "static", "javascript", "Guide.js"), "utf8");
	verifier(!/MANUEL_DU_JEU\.\w+\s*=/.test(guide), "Guide.js ne réécrit plus les pages d'aide");
	// Les options annoncées pour ces commandes existent bien dans leur code.
	[["texte", ["\"+\"", "\"plus\"", "\"grand\"", "\"-\"", "\"moins\"", "\"petit\"", "\"normal\"", "\"0\""]],
	 ["ambiance", ["\"on\"", "\"oui\"", "\"off\"", "\"non\""]], ["contraste", ["\"on\"", "\"oui\"", "\"off\"", "\"non\""]]].forEach(function(c){
		var debut = guide.indexOf("Shell.sorts." + c[0] + " = function"), fin = guide.indexOf("\n};", debut);
		var code = guide.substring(debut, fin);
		c[1].forEach(function(o){ verifier(code.indexOf(o) > -1, c[0] + " " + o + " : l'option annoncée existe dans le code"); });
	});
	verifier(/CINEMATIQUES\[n\]/.test(guide) && /parseInt\(args\[0\], 10\)/.test(guide), "cinematique N existe dans le code");
	verifier(/"1": 1, "2": 3, "3": 2, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10 \}\[args\[0\]\]/.test(guide), "quiz N (1 à 9) existe dans le code");

	// help n'est pas plus long qu'avant : une ligne par sort, les commandes du jeu, et pas une ligne de plus.
	var aide = sansCouleur(jeu.taper("help"));
	var n = jeu.lire("state.knownSpells().length"), c = jeu.lire("COMMANDES_DU_JEU.length");
	egal(c, 27, "la liste des commandes du jeu garde sa longueur (chapitres remplace chapitre ; sablier, sceaux et regenerer pour la Chronothèque)");
	egal(aide.split("\n").length, 1 + n + 1 + 1 + 1 + 1 + c + 1, "help garde sa longueur");
	contient(aide, "help COMMANDE", "help annonce l'aide des commandes du jeu");
	contient(aide, "help badges", "help donne un exemple");
	contient(aide, "chapitres", "help cite chapitres");
	contient(aide, "aller N", "help cite aller N");
	// help N, help tout, help SORT : comme avant, ou la page du sort.
	contient(jeu.taper("help 1"), "Tes sorts", "help 1");
	contient(jeu.taper("help tout"), "Tes sorts", "help tout");
	contient(jeu.taper("help ls"), "LiSter", "help ls : la page du sort, comme ls --help");
	egal(jeu.taper("help ls"), jeu.taper("ls --help"), "help ls et ls --help montrent la même page");
	contient(jeu.taper("help help"), "help COMMANDE", "help help explique help");
	contient(jeu.taper("man help"), "help COMMANDE", "man help aussi");
	contient(jeu.taper("help aide"), "AIDE", "help aide parle aussi de l'outil AIDE du Bastion");
	contient(jeu.taper("help nimportequoi"), "Tes sorts", "help MOT inconnu : la liste, comme avant");
	contient(jeu.taper("man logout"), "ton compte", "man logout");
	contient(jeu.taper("logout --help"), "terminus login", "logout --help");
})();

/* ================================================================== */
/* 2. Les options annoncées marchent (un monde où tout est ouvert)      */
/* ================================================================== */
var stRiche = {};
var riche = nouveauMonde(stRiche, 52);
jouerDe(riche, null, "cat ModeleOSI");
(function(){
	// Les chapitres 4 à 9 en renfort, l'un après l'autre ; la Crypte, ouverte à la main (elle suit la panne).
	[4, 5, 6, 7, 8, 9].forEach(function(n){ contient(riche.taper("aller " + n, "oui"), "EN RENFORT : CHAPITRE " + n, "renfort au chapitre " + n); });
	riche.lire("state.applyState('crypteOuverte'); verifierMonde(); Shell.narration = []");
	var commandes = riche.lire("SORTS_DU_JEU.concat(['help'])");
	var essais = [];
	var erreurs = /sort inconnu|option inconnue|aucune compétence ne correspond|il n'y a que les chapitres|Utilisation : aller|n'est pas ouvert dans ta partie|pas d'argument/;
	commandes.forEach(function(nom){
		var page = sansCouleur(riche.lire("PAGES_DU_JEU[" + JSON.stringify(nom) + "]"));
		page.split("\n").forEach(function(ligne){
			var m = new RegExp("^  (" + nom.replace(/[-]/g, "\\-") + "(?: [^ ]+)*?)(?:\\s{2,}|$)").exec(ligne);
			if (!m) return;
			var essai = m[1];
			if (/CODE/.test(essai)) return;
			essai = essai.replace(/\bN\b/, nom === "aller" ? "2" : (nom === "chapitre" ? "2" : "5")).replace(/\bMOT\b/, "dns").replace(/\bCOMMANDE\b/, "badges").replace(/\bSORT\b/, "ls");
			var sortie;
			essais.push(essai);
			try { sortie = riche.taper(essai, ""); } catch (e){ verifier(false, essai + " : " + e.message); return; }
			verifier(!erreurs.test(sortie), "l'option annoncée « " + essai + " » (help " + nom + ") marche : " + sortie.slice(0, 300));
		});
	});
	verifier(essais.length > 50, "les options de toutes les pages ont été essayées (" + essais.length + ")");
	["badges 5", "badges dns", "quetes 1", "quetes annexes", "aller 2", "help badges", "examen quitter", "son on", "crt off", "indice 7", "chapitre 2", "verifier"].forEach(function(e){
		verifier(essais.indexOf(e) > -1 || /verifier/.test(e), "option essayée : " + e);
	});
	// Les filtres de badges, un par un : chacun montre bien son chapitre.
	[["reseau", "RÉSEAU"], ["panne", "RÉSEAU"], ["cyber", "CYBERSÉCURITÉ"], ["chasse", "CYBERSÉCURITÉ"], ["securite", "CYBERSÉCURITÉ"], ["arcanes", "ACADÉMIE"], ["academie", "ACADÉMIE"],
	 ["avance", "ACADÉMIE"], ["linux", "ACADÉMIE"], ["bastion", "LE BASTION"], ["durcissement", "LE BASTION"], ["hardening", "LE BASTION"], ["lumen", "LUMEN"], ["exploitation", "LUMEN"],
	 ["machines", "LUMEN"], ["port-aube", "PORT-AUBE"], ["portaube", "PORT-AUBE"], ["ile", "PORT-AUBE"], ["services", "PORT-AUBE"], ["port", "LE GRAND PORT"], ["grand-port", "LE GRAND PORT"],
	 ["grandport", "LE GRAND PORT"], ["conteneurs", "LE GRAND PORT"], ["docker", "LE GRAND PORT"], ["2", "RÉSEAU"], ["3", "CYBERSÉCURITÉ"], ["4", "ACADÉMIE"], ["5", "LE BASTION"],
	 ["6", "LUMEN"], ["7", "PORT-AUBE"], ["8", "LE GRAND PORT"]].forEach(function(b){
		contient(riche.taper("badges " + b[0]), b[1], "badges " + b[0]);
	});
	contient(riche.taper("badges 1"), "bulletin", "badges 1 : le chapitre 1 n'a pas de badge, son bilan c'est bulletin");
	contient(riche.taper("quetes annexe"), "", "quetes annexe");
	contient(riche.taper("examen quitter", ""), "Code d'accès", "examen quitter hors épreuve : on demande le code");
})();
(function(){
	// badges N d'un chapitre fermé : un message clair.
	var jeu = nouveauMonde({}, 53);
	contient(jeu.taper("badges 6"), "pas ouvert", "badges 6 avant Lumen");
})();

/* ================================================================== */
/* 3. chapitres : la liste, l'état, la note, le chemin                  */
/* ================================================================== */
(function(){
	var jeu = nouveauMonde({}, 54);
	var liste = sansCouleur(jeu.taper("chapitres"));
	egal(liste, sansCouleur(jeu.taper("chapitre")), "chapitre sans numéro = chapitres");
	["1. Terminus", "2. La panne", "3. La Crypte", "4. L'Académie", "5. Le Bastion", "6. Lumen", "7. Port-Aube", "8. Le Grand Port"].forEach(function(l){ contient(liste, l, "chapitres : " + l); });
	contient(liste, "tu es ici", "chapitres : le chapitre en cours est marqué");
	contient(liste, "chapitre 3 (départ direct)", "chapitres, en début de partie : le départ direct");
	contient(liste, "mission cyber", "chapitres, en début de partie : la mission cyber");
	contient(liste, "/ 20", "chapitres : la note du chapitre en cours");
	contient(jeu.taper("chapitres 3"), "aller N", "chapitres N : on renvoie vers aller");
})();

/* ================================================================== */
/* 4. aller N vers un chapitre ouvert, et les connexions ssh fermées     */
/* ================================================================== */
var st = {};
var jeu = nouveauMonde(st, 55);
jouerDe(jeu, null, "cd Paradis");
(function(){
	verifier(jeu.lire("state.has('victoire') && state.has('panneOuverte')"), "la victoire ouvre la panne");
	var xp1 = jeu.lire("state.xp"), note1 = jeu.lire("state.note()");
	jeu.taper("cd ~");
	jeu.taper("ssh citadelle");
	verifier(jeu.lire("Shell.pile_ssh.length") === 1, "une connexion ssh est ouverte");
	var s = jeu.taper("aller 2");
	contient(s, "Connexion à citadelle fermée", "aller ferme la connexion ssh");
	contient(s, "CHAPITRE 2 : LA PANNE", "aller 2 : le titre du chapitre");
	contient(s, "Étape en cours : Comprendre le modèle OSI", "aller 2 : l'étape en cours de la panne (l'entrée au BatimentB est franchie en arrivant)");
	egal(jeu.lire("Shell.pile_ssh.length"), 0, "plus de connexion ssh");
	egal(jeu.lire("current_room === BatimentB"), true, "aller 2 : au BatimentB");
	egal(jeu.lire("Shell.hote()"), "cybersup", "aller 2 : sur la machine de départ");
	egal(jeu.lire("state.chapitreEnCours()"), 3, "aller 2 : la panne est le chapitre en cours");
	s = jeu.taper("aller 1");
	contient(s, "Ce chapitre est terminé", "aller 1 : le chapitre 1 est fini");
	contient(s, "Diplome", "aller 1 : où est la note");
	egal(jeu.lire("current_room === Home"), true, "aller 1 : à la Maison");
	egal(jeu.lire("state.chapitreEnCours()"), 1, "aller 1 : le chapitre 1 est le chapitre en cours");
	egal(jeu.lire("state.queteEnCours().id"), "r_osi", "chapitre 1 fini : l'étape en cours est celle de la panne");
	egal(jeu.lire("state.xp"), xp1, "aller ne change pas les XP du chapitre 1");
	egal(jeu.lire("state.note()"), note1, "aller ne change pas la note du chapitre 1");
	contient(jeu.taper("aller 3"), "s'ouvre à la fin de la panne", "aller 3 avant la fin de la panne : refusé");
	contient(jeu.taper("aller 2 3"), "il n'y a que les chapitres", "aller 2 3 : un seul chapitre");
	contient(jeu.taper("aller"), "quel chapitre", "aller sans numéro");
	contient(jeu.taper("aller 10"), "il n'y a que les chapitres 1 à 9", "aller 10");
	contient(jeu.taper("aller x"), "il n'y a que les chapitres 1 à 9", "aller x");
	jeu.taper("aller 2");
	jouerDe(jeu, "cd ~/Cybersup/BatimentB", "cat ModeleOSI");
	verifier(jeu.lire("state.quests.r_batiment && state.quests.r_osi"), "la panne avance : r_batiment et r_osi");
})();

/* ================================================================== */
/* 5. Ouvrir le Bastion en renfort, puis revenir à la panne intacte      */
/* ================================================================== */
(function(){
	var avant = jeu.lire("({ xp: state.xp, xp3: state.xp3, note1: state.note(), note3: state.note(3), quete: state.queteEnCours().id, quetes: JSON.stringify(state.quests), " +
		"panne: JSON.stringify(state.panne), diplome: state.codeDuDiplome(), profil: PROFIL.chapitre })");
	var pretables = jeu.lire("ORDRE_DES_SORTS_3.concat(ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_5).filter(function(s){ return !state.knows(s); })");
	verifier(pretables.length > 0, "des sorts des chapitres d'avant ne sont pas encore appris");
	// Refuser : rien ne change.
	contient(jeu.taper("aller 5", "non"), "Rien n'a changé", "renfort refusé");
	verifier(!jeu.lire("state.has('ch5Ouvert')"), "renfort refusé : le Bastion reste fermé");
	// Accepter.
	var s = jeu.taper("aller 5", "oui");
	contient(s, "EN RENFORT : CHAPITRE 5, LE BASTION", "renfort : le titre");
	contient(s, "Entrer dans le Bastion", "renfort : on entre dans le Bastion (l'étape d'entrée)");
	verifier(jeu.lire("state.has('ch5Ouvert') && state.has('ch5Direct') && state.has('ch5Renfort')"), "renfort : le Bastion est ouvert");
	verifier(!jeu.lire("state.has('chapitre1Saute')"), "renfort : le chapitre 1 reste joué et noté");
	verifier(!jeu.lire("state.has('ch4Ouvert')") && !jeu.lire("state.has('crypteOuverte')"), "renfort : les chapitres sautés restent fermés");
	egal(jeu.lire("current_room === HallBastion"), true, "renfort : au hall du Bastion");
	egal(jeu.lire("Shell.cheminAffiche(HallBastion)"), "~/Cybersup/SalleServeurs/Bastion", "renfort sans l'Académie : le hall est au fond de la SalleServeurs");
	egal(jeu.lire("state.chapitreEnCours()"), 6, "renfort : le Bastion est le chapitre en cours");
	egal(jeu.lire("state.queteEnCours().id"), "h_pierre", "renfort : l'étape du Bastion");
	egal(jeu.lire("state.quests.h_entree"), true, "renfort : l'étape d'entrée est franchie, une fois");
	egal(jeu.lire("state.xp"), avant.xp, "renfort : XP du chapitre 1 intactes");
	egal(jeu.lire("state.xp3"), avant.xp3, "renfort : XP de la panne intactes");
	egal(jeu.lire("state.note(3)"), avant.note3, "renfort : note de la panne intacte");
	egal(jeu.lire("state.codeDuDiplome()"), avant.diplome, "renfort : le code du diplôme ne change pas");
	egal(jeu.lire("PROFIL.chapitre"), avant.profil, "renfort : le chapitre de départ du profil ne change pas");
	egal(jeu.lire("JSON.stringify(state.panne)"), avant.panne, "renfort : l'état de la panne est intact");
	verifier(jeu.lire("Object.keys(JSON.parse(" + JSON.stringify(avant.quetes) + ")).every(function(id){ return state.quests[id] === true; })"), "renfort : aucune étape perdue");
	pretables.forEach(function(sort){ verifier(jeu.lire("state.knows(" + JSON.stringify(sort) + ") && state.prete(" + JSON.stringify(sort) + ")"), "renfort : " + sort + " est prêté"); });
	verifier(jeu.lire("ORDRE_DES_SORTS_6.every(function(s){ return !state.knows(s); })"), "renfort : les sorts du Bastion s'apprennent auprès des maîtres");
	contient(jeu.taper("quetes"), "Sorts appris", "quetes compte les sorts");
	contient(jeu.taper("quetes"), "prêtés par un renfort", "quetes distingue les sorts prêtés");
	var liste = sansCouleur(jeu.taper("chapitres"));
	contient(liste, "5. Le Bastion       ouvert", "chapitres : le Bastion ouvert");
	contient(liste, "◀ tu es ici", "chapitres : on est au Bastion");
	contient(liste, "3. La Crypte        non joué (renfort)", "chapitres : la Crypte, sautée, reste non jouée");
	contient(liste, "4. L'Académie       non joué (renfort)", "chapitres : l'Académie, sautée, reste non jouée");
	contient(liste, "2. La panne         ouvert", "chapitres : la panne reste ouverte");
	contient(liste, "aller 4 (en renfort)", "chapitres : l'Académie peut s'ouvrir en renfort");
	contient(liste, "Terminus         terminé", "chapitres : le chapitre 1 reste terminé");
	contient(jeu.taper("chapitre 5"), "aller 5", "chapitre 5 : déjà ouvert, aller 5 y mène");
	contient(jeu.taper("chapitre 6"), "aller 6 l'ouvre en renfort", "chapitre 6 en cours de partie : le renfort est proposé");
	// L'horloge du Bastion avance quand on y joue.
	jeu.taper("cat Laurent"); jeu.taper("cat Mission");
	var h5 = jeu.lire("state.ch5.horloge");
	verifier(h5 > 0, "l'horloge du Bastion avance quand on y joue");
	var xp6 = jeu.lire("state.xp6");
	verifier(xp6 > 0, "le Bastion rapporte ses XP");
	// Retour à la panne, progression intacte.
	s = jeu.taper("aller 2");
	contient(s, "CHAPITRE 2 : LA PANNE", "retour à la panne");
	egal(jeu.lire("state.chapitreEnCours()"), 3, "retour : la panne est le chapitre en cours");
	egal(jeu.lire("state.queteEnCours().id"), avant.quete, "retour : la même étape de la panne");
	contient(s, "Étape en cours", "retour : l'étape est affichée");
	egal(jeu.lire("state.xp3"), avant.xp3, "retour : XP de la panne intactes");
	egal(jeu.lire("state.note(3)"), avant.note3, "retour : note de la panne intacte");
	contient(jeu.taper("xp"), "Note", "xp montre les notes");
	// L'horloge du Bastion attend.
	jeu.taper("ls"); jeu.taper("pwd"); jeu.taper("cat Radia");
	egal(jeu.lire("state.ch5.horloge"), h5, "l'horloge du Bastion attend pendant qu'on joue la panne");
	egal(jeu.lire("state.xp6"), xp6, "les XP du Bastion ne bougent pas pendant la panne");
	// La panne continue : les sorts prêtés, appris pour de vrai, rapportent leurs XP à la panne.
	var pretesPanne = jeu.lire("ORDRE_DES_SORTS_3.filter(function(s){ return state.prete(s); })");
	var xp3 = jeu.lire("state.xp3");
	jouerDe(jeu, "cat ModeleOSI", "ping intranet");
	verifier(jeu.lire("state.quests.r_lien && state.quests.r_ip"), "la panne avance après le renfort");
	egal(jeu.lire("state.chapitreEnCours()"), 3, "la panne reste le chapitre en cours");
	var appris = pretesPanne.filter(function(sort){ return !jeu.lire("state.prete(" + JSON.stringify(sort) + ")"); });
	verifier(appris.length > 0, "des sorts prêtés ont été appris pour de vrai dans la panne");
	verifier(jeu.lire("state.xp3") - xp3 >= appris.length * 10, "chaque sort prêté appris dans la panne rapporte ses 10 XP");
	verifier(jeu.lire("state.xp3 <= state.xpMax3() && state.xp6 <= state.xpMax6()"), "les XP restent sous le maximum");
	egal(jeu.lire("state.ch5.horloge"), h5, "l'horloge du Bastion a attendu toute la panne");
	// Entrer au Bastion à pied en refait le chapitre en cours.
	jeu.taper("cd ~/Cybersup/SalleServeurs/Bastion");
	egal(jeu.lire("state.chapitreEnCours()"), 6, "entrer dans le Bastion en fait le chapitre en cours");
	jeu.taper("ls");
	verifier(jeu.lire("state.ch5.horloge") > h5, "l'horloge du Bastion repart");
	jeu.taper("aller 2");
})();

/* ================================================================== */
/* 6. La sauvegarde garde tout                                         */
/* ================================================================== */
(function(){
	jeu.taper("pwd");
	var avant = jeu.lire("({ xp3: state.xp3, xp6: state.xp6, h5: state.ch5.horloge, pretes: Object.keys(state.navigation.pretes).length, choisi: state.navigation.choisi, quete: state.queteEnCours().id })");
	var repris = nouveauMonde(st);
	var apres = repris.lire("({ xp3: state.xp3, xp6: state.xp6, h5: state.ch5.horloge, pretes: Object.keys(state.navigation.pretes).length, choisi: state.navigation.choisi, quete: state.queteEnCours().id })");
	egal(apres, avant, "rechargement : notes, horloge, sorts prêtés, chapitre en cours");
	verifier(repris.lire("state.has('ch5Ouvert') && SalleServeurs.children.indexOf(HallBastion) > -1"), "rechargement : le Bastion est toujours là");
	contient(repris.taper("aller 5"), "CHAPITRE 5 : LE BASTION", "rechargement : aller 5");
	egal(repris.lire("state.queteEnCours().id"), "h_pierre", "rechargement : l'étape du Bastion");
})();

/* ================================================================== */
/* 7. Un départ direct au Bastion, puis l'Académie en renfort           */
/* ================================================================== */
(function(){
	var st2 = {};
	var j = nouveauMonde(st2, 56);
	j.taper("chapitre 5", "oui");
	j.taper("cat Laurent");
	var h5 = j.lire("state.ch5.horloge");
	verifier(j.lire("state.knows('jq') && !state.prete('jq')"), "départ direct au Bastion : jq est donné d'office");
	var s = j.taper("aller 4", "oui");
	contient(s, "EN RENFORT : CHAPITRE 4", "l'Académie en renfort après un départ direct au Bastion");
	verifier(j.lire("state.has('ch4Ouvert') && state.has('ch4ApresCh5')"), "l'Académie est ouverte, le Bastion garde sa place");
	egal(j.lire("Shell.cheminAffiche(HallBastion)"), "~/Cybersup/SalleServeurs/Bastion", "le hall du Bastion ne bouge pas");
	egal(j.lire("Academie.children.indexOf(HallBastion)"), -1, "le hall du Bastion n'a pas deux portes");
	egal(j.lire("state.chapitreEnCours()"), 5, "l'Académie est le chapitre en cours");
	egal(j.lire("state.queteEnCours().id"), "d_frances", "l'étape de l'Académie");
	verifier(j.lire("state.prete('jq')"), "les sorts de l'Académie, donnés d'office au départ direct, sont prêtés");
	var xp5 = j.lire("state.xp5");
	j.lire("state.learn('jq')");
	egal(j.lire("state.xp5") - xp5, 10, "appris auprès d'un maître, jq rapporte ses 10 XP à l'Académie");
	j.taper("ls"); j.taper("pwd");
	egal(j.lire("state.ch5.horloge"), h5, "l'horloge du Bastion attend pendant l'Académie");
	verifier(j.lire("state.ch4.horloge") > 0, "l'horloge de l'Académie avance");
	var h4 = j.lire("state.ch4.horloge");
	contient(j.taper("aller 5"), "Étape en cours", "retour au Bastion");
	j.taper("ls");
	egal(j.lire("state.ch4.horloge"), h4, "l'horloge de l'Académie attend pendant le Bastion");
	var liste = sansCouleur(j.taper("chapitres"));
	contient(liste, "1. Terminus         non joué (renfort)", "le chapitre 1 reste non joué");
	contient(liste, "4. L'Académie       ouvert", "l'Académie ouverte");
	var repris = nouveauMonde(st2);
	egal(repris.lire("Shell.cheminAffiche(HallBastion)"), "~/Cybersup/SalleServeurs/Bastion", "rechargement : le hall du Bastion ne bouge pas");
	egal(repris.lire("Academie.children.indexOf(HallBastion)"), -1, "rechargement : toujours une seule porte");
	contient(repris.taper("aller 1"), "n'est ni joué ni noté", "aller 1 après un départ direct : refusé");
	contient(repris.taper("aller 2"), "ne s'ouvre pas en renfort", "aller 2 après un départ direct : refusé");
})();

/* ================================================================== */
/* 8. Les cas refusés                                                  */
/* ================================================================== */
(function(){
	// En plein chapitre 1 : pas de renfort avant d'avoir battu le Sorcier Noir.
	var j = nouveauMonde({}, 57);
	jouerDe(j, null, "cd Portail/PlaceDuVillage");
	verifier(!j.lire("chapitre2Possible()"), "une étape du chapitre 1 est franchie");
	var xp = j.lire("state.xp");
	contient(j.taper("aller 5", "oui"), "termine d'abord l'épreuve de première année", "aller 5 en plein chapitre 1 : refusé");
	contient(j.taper("chapitre 5"), "une fois le Sorcier Noir battu", "chapitre 5 en plein chapitre 1 : le renfort viendra après");
	verifier(!j.lire("state.has('ch5Ouvert')"), "le Bastion reste fermé");
	contient(j.taper("aller 2"), "quand tu auras battu le Sorcier Noir", "aller 2 en plein chapitre 1 : refusé");
	contient(j.taper("aller 3"), "s'ouvre à la fin de la panne", "aller 3 en plein chapitre 1 : refusé");
	egal(j.lire("state.xp"), xp, "les refus ne changent rien");
	contient(j.taper("aller 1"), "CHAPITRE 1 : TERMINUS", "aller 1 : la Maison");
	egal(j.lire("state.navigation.actif"), false, "aller au chapitre où l'on est déjà ne change pas les règles");

	// Au tout début d'une partie : aller N est un départ direct, comme chapitre N.
	var d = nouveauMonde({}, 58);
	contient(d.taper("aller 4", "oui"), "CHAPITRE 4 : L'ACADÉMIE DES ARCANES", "aller 4 en début de partie : départ direct");
	verifier(d.lire("state.has('ch4Direct') && state.has('chapitre1Saute')"), "aller 4 en début de partie : comme chapitre 4");

	// En mission cyber : la panne n'est pas au programme.
	var m = nouveauMonde({}, 59);
	m.taper("chapitre 3", "oui");
	contient(m.taper("aller 2"), "ne fait pas partie de ta mission", "aller 2 en mission cyber : refusé");
	contient(m.taper("aller 1"), "n'est ni joué ni noté", "aller 1 en mission cyber : refusé");
	contient(m.taper("aller 3"), "CHAPITRE 3 : LA CRYPTE", "aller 3 en mission cyber : la Crypte");
	egal(m.lire("current_room === Crypte && Shell.pile_ssh.length === 1"), true, "aller 3 : dans la Crypte, par une connexion ssh");
	contient(m.taper("exit"), "fermée", "exit ferme la connexion ouverte par aller 3");
	contient(m.taper("aller 6", "oui"), "EN RENFORT : CHAPITRE 6", "en mission cyber, Lumen s'ouvre en renfort");
	egal(m.lire("Shell.cheminAffiche(HallLumen)"), "~/Cybersup/SalleServeurs/Lumen", "Lumen sans le Bastion : au fond de la SalleServeurs");

	// Pendant l'épreuve finale : rien de tout cela.
	var e = nouveauMonde({ "terminus-cybersup-profil": JSON.stringify({ graine: 4242, prenom: "Ada", chapitre: 1, modeExamen: true }) });
	e.lire("state.nom = 'Ada'; demarrerExamen(); Shell.narration = [];");
	verifier(e.lire("examenEnCours()"), "l'épreuve finale est en cours");
	var ici = e.lire("current_room.room_name");
	["aller 5", "aller 1", "chapitres", "chapitre", "chapitre 4"].forEach(function(c){
		contient(e.taper(c, "oui"), "il n'y a que la Forteresse", c + " pendant l'épreuve finale : refusé");
	});
	egal(e.lire("current_room.room_name"), ici, "l'épreuve finale : on ne bouge pas");
	verifier(!e.lire("state.has('ch5Ouvert')"), "l'épreuve finale : rien ne s'ouvre");
	contient(e.taper("help aller"), "Commande du jeu", "l'aide des commandes reste lisible pendant l'épreuve");
	contient(e.taper("help"), "kamikaze", "help pendant l'épreuve : la liste de l'épreuve, comme avant");
})();

/* ================================================================== */
/* 9. Les fichiers : chargés partout, dans le bon ordre, bien écrits     */
/* ================================================================== */
(function(){
	var racine = path.join(__dirname, "..");
	var index = fs.readFileSync(path.join(racine, "Web", "index.html"), "utf8");
	var positions = ["HabitantsPort.js", "Navigation.js", "AideDuJeu.js", "Intro.js"].map(function(f){ return index.indexOf("/" + f + "?"); });
	verifier(positions.every(function(p, i){ return p > -1 && (i === 0 || p > positions[i - 1]); }), "index.html : Navigation.js et AideDuJeu.js après HabitantsPort.js, avant Intro.js");
	["Navigation.js", "AideDuJeu.js"].forEach(function(f){
		var src = fs.readFileSync(path.join(racine, "Web", "static", "javascript", f), "utf8");
		verifier(src.indexOf("\u2014") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		verifier(chaines.every(function(x){ return x.indexOf(" & ") === -1; }), f + " : pas d'esperluette en prose");
	});
})();

console.log(verifications + " vérifications, " + echecs + " échec" + (echecs > 1 ? "s" : ""));
process.exit(echecs ? 1 : 0);
