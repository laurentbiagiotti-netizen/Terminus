/**
 * HabitantsAcademie.js : les quêtes annexes du chapitre 4 (l'Académie des Arcanes, numéro interne 5).
 *
 * Six habitants de l'Académie, un par aile (sauf deux ailes). Leurs fichiers sont dans les ailes, en lecture ;
 * le joueur écrit dans sa Maison. Les notions, absentes de tous les chapitres (étapes, défis, autres annexes) :
 *   a4_grimoire   le Copiste       (Grimoires)     cat -A, iconv (ISO-8859-1 vers UTF-8), dos2unix, un script CRLF
 *   a4_formules   la Secrétaire    (Archives)      export, printenv, envsubst (avec et sans liste de variables)
 *   a4_balance    le Trésorier     (Alchimie)      numfmt --to=iec et --from=iec, bc et scale
 *   a4_sortilege  l'Apprentie      (Invocation)    une fonction dans un script, getopts, OPTARG, OPTIND
 *   a4_tube       la Messagère     (Chronomancie)  mkfifo, deux programmes qui se parlent par un tube nommé
 *   a4_registre   la Surveillante  (Divination)    sqlite3 : .tables, .schema, SELECT, WHERE, ORDER BY, COUNT
 * Toutes faites : le badge « Ami de l'Académie ».
 */

World.fige = false;

function axOuverteCh4(){
	return !!(typeof state !== "undefined" && state && state.has && state.has("ch4Ouvert") && !(typeof examenEnCours === "function" && examenEnCours()));
}
function axObjetDe(lieu, nom){ var it = lieu.getItemFromName(nom); return it === -1 ? null : it; }

/* ------------------------------------------------------------------ */
/* 1. Le grimoire illisible (le Copiste)                               */
/* ------------------------------------------------------------------ */

var AX_GRIMOIRE_PROPRE = "GRIMOIRE DE L'ACADÉMIE · la formule de la lumière éternelle\n\n" +
	"Prenez trois gouttes de rosée, un éclat de lune et une plume de hibou.\n" +
	"Mélangez à minuit, en récitant : « Que la clarté soit ! »\n" +
	"Ne répétez jamais la formule plus de trois fois : la quatrième éteint tout.";
var AxGrimoireAncien = fichierCh4(AileGrimoires, "grimoire-ancien.txt", AX_GRIMOIRE_PROPRE.replace(/\n/g, "\r\n") + "\r\n", { image: "item_manuscript.gif" });
AxGrimoireAncien.encodage = "ISO-8859-1";
var AxIncantation = fichierCh4(AileGrimoires, "incantation.sh", "#!/bin/bash\r\n# L'incantation de la lumière, recopiée par le Copiste\r\n\r\necho \"Lumière !\"\r\necho \"La salle des Grimoires s'éclaire, rayon après rayon.\"\r\n",
	{ image: "item_manuscript.gif", mode: "rwxr-xr-x", owner: JOUEUR });
function axSansCr(t){ return String(t || "").replace(/\r/g, "").replace(/\n+$/, ""); }
var AxCopiste = axHabitant(AileGrimoires, "Copiste", function(){
	if (aFait("a4_grimoire")) return "Le Copiste relit le grimoire, enfin lisible. « Les accents à leur place, les lignes propres, et l'incantation qui s'allume. Je n'aurais pas su sans toi. »";
	return "Un moine aux manches tachées d'encre plisse les yeux devant un vieux grimoire.\n\n" +
		"« Je suis le Copiste. Ce grimoire (grimoire-ancien.txt) a été recopié il y a longtemps, sur une très vieille machine. " +
		"Quand je le lis, les accents deviennent des points d'interrogation dans des losanges. Et mon incantation (incantation.sh), recopiée au même endroit, " +
		"refuse de se lancer : bash parle d'un « mauvais interprète ».\n\n" +
		"On m'a dit que ce n'était pas de la magie noire : un encodage d'une autre époque, et des fins de ligne d'un autre monde, avec un caractère invisible. " +
		"Montre-moi d'abord l'invisible, octet par octet. Puis fais-moi une copie lisible en UTF-8 dans ta Maison (~/grimoire.txt), aux fins de ligne propres. " +
		"Et répare l'incantation, que je la voie s'allumer. »\n\n" +
		C.gris("Les outils : file ; cat -A ; iconv -f ISO-8859-1 -t UTF-8 FICHIER > NOUVEAU ; dos2unix FICHIER ; ./incantation.sh.");
}, ["iconv", "dos2unix", "unix2dos"]);
declarerAnnexe({ id: "a4_grimoire", chapitre: 5, titre: "Le grimoire illisible", habitant: "le Copiste", lieu: "dans l'aile des Grimoires", item: function(){ return AxCopiste; }, ouverte: axOuverteCh4,
	indice: "dans l'aile des Grimoires, un moine plisse les yeux devant un vieux grimoire.",
	resume: "Un vieil encodage (iconv vers UTF-8), des fins de ligne CRLF (cat -A, dos2unix), et un script qui ne se lance plus à cause d'elles.",
	etapes: [
		{ titre: "Montrer l'invisible : les octets et les fins de ligne du grimoire (cat -A)", fait: function(){ return axVu("a4_grimoire", "catA"); } },
		{ titre: "Une copie en UTF-8 dans ta Maison, ~/grimoire.txt (iconv)", fait: function(){ var it = axObjetMaison("grimoire.txt"); return !!it && !it.encodage && axSansCr(it.getText()) === AX_GRIMOIRE_PROPRE; } },
		{ titre: "Lui retirer ses fins de ligne CRLF (dos2unix)", fait: function(){ var it = axObjetMaison("grimoire.txt"); return !!it && !/\r/.test(it.getText()) && axSansCr(it.getText()) === AX_GRIMOIRE_PROPRE; } },
		{ titre: "Réparer l'incantation, et la lancer (dos2unix, ./incantation.sh)", fait: function(){ return axVu("a4_grimoire", "incantation"); } }
	],
	souvenir: { nom: "Plume-du-copiste", texte: "Une plume d'oie taillée fin. Sur le tuyau, le Copiste a écrit, en tout petit : UTF-8." },
	lumiere: "les chandelles de la salle des Grimoires",
	merci: "L'incantation s'allume, et toute l'aile des Grimoires s'éclaire. Le Copiste essuie ses lunettes : « Lumière ! »"
});
GameEvents.addListener("axCat", function(e){
	if (e.item === AxGrimoireAncien && /\^M\$/.test(e.sortie) && /M-/.test(e.sortie)) axNoter("a4_grimoire", "catA");
});
GameEvents.addListener("script", function(e){
	if (e.item === AxIncantation && e.statut === 0 && !/\r/.test(AxIncantation.getText())) axNoter("a4_grimoire", "incantation");
});

/* ------------------------------------------------------------------ */
/* 2. Les formules à trous (la Secrétaire)                             */
/* ------------------------------------------------------------------ */

var AX_VALEURS_CONVOCATION = { ELEVE: "Ambre Morel", MAISON: "Divination", DATE_EPREUVE: "12 novembre" };
var AX_MODELE_CONVOCATION = "ACADÉMIE DES ARCANES · convocation\n\nÉlève : ${ELEVE}\nMaison : ${MAISON}\nÉpreuve de passage : le ${DATE_EPREUVE}, à 9 h, dans le grand hall.\n\nSe présenter avec sa baguette et un grimoire vierge.";
var AX_MODELE_AFFICHE = "AFFICHE · la boutique de l'Académie\n\n${ELEVE}, de la maison ${MAISON}, tient la boutique cette semaine.\nGrimoire vierge : $PRIX pièces d'or (le prix est écrit à la main, plus tard).";
fichierCh4(AileArchives, "modele-convocation.txt", AX_MODELE_CONVOCATION, { image: "item_manuscript.gif" });
fichierCh4(AileArchives, "modele-affiche.txt", AX_MODELE_AFFICHE, { image: "item_manuscript.gif" });
function axRemplir(modele, noms){
	return modele.replace(/\$\{([A-Z_]+)\}|\$([A-Z_]+)/g, function(t, a, b){ var n = a || b; return noms.indexOf(n) > -1 ? AX_VALEURS_CONVOCATION[n] : t; });
}
function axExporteesCh4(){
	var env = axEnvironnement();
	return Object.keys(AX_VALEURS_CONVOCATION).every(function(n){ return env[n] === AX_VALEURS_CONVOCATION[n]; });
}
var AxSecretaire = axHabitant(AileArchives, "Secretaire", function(){
	if (aFait("a4_formules")) return "La Secrétaire range les convocations dans un tiroir. « Un modèle, des variables, envsubst : je n'écrirai plus jamais une convocation à la main. »";
	return "Une femme pressée, un tampon dans chaque main, croule sous des formulaires à trous.\n\n" +
		"« La Secrétaire de l'Académie. Chaque semaine, j'écris des dizaines de convocations, toujours les mêmes, avec seulement le nom qui change. " +
		"J'ai des modèles (modele-convocation.txt, modele-affiche.txt), pleins de ${...}, mais je les remplis à la main.\n\n" +
		"Pour l'élève Ambre Morel, de la maison Divination, épreuve le 12 novembre : range ces trois valeurs dans ELEVE, MAISON et DATE_EPREUVE, " +
		"là où les programmes peuvent les voir, et vérifie-le. Remplis-moi la convocation dans ta Maison (~/convocation.txt). " +
		"Puis l'affiche (~/affiche.txt), mais attention : son $PRIX doit rester tel quel, je l'écrirai à la main. »\n\n" +
		C.gris("Les outils : export NOM=\"valeur\" ; printenv NOM ; envsubst < MODELE > RESULTAT ; envsubst '$NOM1 $NOM2' < MODELE > RESULTAT.");
}, ["envsubst", "printenv"]);
declarerAnnexe({ id: "a4_formules", chapitre: 5, titre: "Les formules à trous", habitant: "la Secrétaire", lieu: "dans l'aile des Archives", item: function(){ return AxSecretaire; }, ouverte: axOuverteCh4,
	indice: "dans l'aile des Archives, quelqu'un croule sous des formulaires à trous.",
	resume: "Remplir un modèle avec des variables d'environnement (export, printenv, envsubst), sans toucher à ce qui doit rester.",
	etapes: [
		{ titre: "Exporter ELEVE, MAISON et DATE_EPREUVE, et le vérifier (printenv)", fait: function(){ return axVu("a4_formules", "printenv") && axExporteesCh4(); } },
		{ titre: "Remplir la convocation, ~/convocation.txt (envsubst)", fait: function(){ return axSansCr(axTexteMaison("convocation.txt")) === axRemplir(AX_MODELE_CONVOCATION, ["ELEVE", "MAISON", "DATE_EPREUVE"]); } },
		{ titre: "L'affiche, ~/affiche.txt, garde son $PRIX (envsubst avec une liste)", fait: function(){ return axSansCr(axTexteMaison("affiche.txt")) === axRemplir(AX_MODELE_AFFICHE, ["ELEVE", "MAISON"]); } }
	],
	souvenir: { nom: "Tampon-de-la-secretaire", texte: "Un petit tampon encreur : « ${ELEVE} ». La Secrétaire dit qu'il remplit les trous tout seul." },
	lumiere: "la lampe du bureau de la Secrétaire",
	merci: "La Secrétaire tamponne la convocation d'un coup sec. « Ambre sera là le 12. Et le prix, je l'écrirai moi-même. Merci ! »"
});
GameEvents.addListener("axPrintenv", function(e){
	if (e.noms.some(function(n){ return AX_VALEURS_CONVOCATION.hasOwnProperty(n); }) && Object.keys(AX_VALEURS_CONVOCATION).some(function(n){ return e.sortie.indexOf(AX_VALEURS_CONVOCATION[n]) > -1; })) axNoter("a4_formules", "printenv");
	if (!e.noms.length && Object.keys(AX_VALEURS_CONVOCATION).every(function(n){ return e.sortie.indexOf(n + "=" + AX_VALEURS_CONVOCATION[n]) > -1; })) axNoter("a4_formules", "printenv");
});

/* ------------------------------------------------------------------ */
/* 3. La balance du trésorier (le Trésorier)                           */
/* ------------------------------------------------------------------ */

fichierCh4(AileAlchimie, "reserves.txt", "grand-chaudron  3758096384\nfioles          1572864\nherbier         734003200\nparchemins      52428800\nalambics        2147483648", { image: "item_manuscript.gif" });
var AX_DEPENSES = ["12.50", "7.25", "30.00", "4.75", "18.40", "9.90", "22.15"];
fichierCh4(AileAlchimie, "depenses.txt", "DÉPENSES DE LA SEMAINE (en pièces d'or)\n\nlundi     " + AX_DEPENSES[0] + "\nmardi     " + AX_DEPENSES[1] + "\nmercredi  " + AX_DEPENSES[2] + "\njeudi     " + AX_DEPENSES[3] +
	"\nvendredi  " + AX_DEPENSES[4] + "\nsamedi    " + AX_DEPENSES[5] + "\ndimanche  " + AX_DEPENSES[6], { image: "item_manuscript.gif" });
var AX_MOYENNE_DEPENSES = (function(){ var c = AX_DEPENSES.reduce(function(s, x){ return s + Math.round(parseFloat(x) * 100); }, 0); var m = Math.floor(c / AX_DEPENSES.length); return Math.floor(m / 100) + "." + ("0" + (m % 100)).slice(-2); })();
var AxTresorier = axHabitant(AileAlchimie, "Tresorier", function(){
	if (aFait("a4_balance")) return "Le Trésorier referme son registre. « Des tailles qu'on lit d'un coup d'œil, et des moyennes au centime près. La balance est juste. »";
	return "Un petit homme rond, des lunettes au bout du nez, aligne des colonnes de chiffres à n'en plus finir.\n\n" +
		"« Je suis le Trésorier. Deux soucis. D'abord, les réserves de l'Académie (reserves.txt) : leurs tailles sont en octets, et 3758096384, ça ne me parle pas. " +
		"Montre-les-moi comme un humain les dirait, en K, M, G (des puissances de 1024). Et dans l'autre sens : le nouvel herbier fera 750M ; combien d'octets, exactement ?\n\n" +
		"Ensuite, la moyenne des dépenses de la semaine (depenses.txt), au centime près. Mon apprenti a essayé avec $(( )), et il ne trouve que des nombres entiers ! " +
		"Écris-la dans ~/balance.txt, avec ses deux décimales. »\n\n" +
		C.gris("Les outils : numfmt --to=iec --field=2 < reserves.txt ; numfmt --from=iec 750M ; echo \"scale=2; (...) / 7\" | bc.");
}, ["numfmt", "bc"]);
declarerAnnexe({ id: "a4_balance", chapitre: 5, titre: "La balance du trésorier", habitant: "le Trésorier", lieu: "dans l'aile de l'Alchimie", item: function(){ return AxTresorier; }, ouverte: axOuverteCh4,
	indice: "dans l'aile de l'Alchimie, quelqu'un aligne des colonnes de chiffres.",
	resume: "Des tailles lisibles (numfmt --to=iec), l'inverse (--from=iec), et un calcul à la virgule près (bc, scale).",
	etapes: [
		{ titre: "Les réserves en tailles lisibles : K, M, G (numfmt --to=iec)", fait: function(){ return axVu("a4_balance", "versIec"); } },
		{ titre: "750M, en octets exactement (numfmt --from=iec)", fait: function(){ return axVu("a4_balance", "depuisIec"); } },
		{ titre: "La moyenne des dépenses au centime près (bc), dans ~/balance.txt", fait: function(){ return axVu("a4_balance", "bc") && (axTexteMaison("balance.txt") || "").indexOf(AX_MOYENNE_DEPENSES) > -1; } }
	],
	souvenir: { nom: "Piece-d-or-coupee", texte: "Une pièce d'or coupée en cent : le Trésorier dit qu'une moyenne se compte au centime, pas à la pièce." },
	lumiere: "la balance dorée de l'Alchimie",
	merci: "Le Trésorier note " + AX_MOYENNE_DEPENSES + " dans son registre. « Au centime près ! Les comptes de l'Académie n'ont jamais été aussi justes. »"
});
GameEvents.addListener("axNumfmt", function(e){
	if (e.vers === "iec" && /3\.5G/.test(e.sortie)) axNoter("a4_balance", "versIec");
	if (e.depuis === "iec" && /\b786432000\b/.test(e.sortie)) axNoter("a4_balance", "depuisIec");
});
GameEvents.addListener("axBc", function(e){
	if (e.sortie.split("\n").indexOf(AX_MOYENNE_DEPENSES) > -1) axNoter("a4_balance", "bc");
});

/* ------------------------------------------------------------------ */
/* 4. Le sortilège à options (l'Apprentie)                             */
/* ------------------------------------------------------------------ */

function axEstSortilege(item){ return !!item && item.itemname === "sortilege.sh" && /getopts/.test(item.getText()); }
var AxApprentie = axHabitant(AileInvocation, "Apprentie", function(){
	if (aFait("a4_sortilege")) return "L'Apprentie lance son sortilège, avec ses options, sans se tromper. « -n pour le nom, et le reste refusé proprement. Un vrai sort de mage ! »";
	return "Une apprentie en robe trop grande gribouille un script, l'air désespéré.\n\n" +
		"« Je suis l'Apprentie. Mon sortilège (je l'appelle sortilege.sh) doit bénir l'élève qu'on lui donne. " +
		"Mais avec $1 et $2, tout se mélange dès qu'on change l'ordre des arguments. Les vrais mages donnent des OPTIONS à leurs scripts : -n Ambre, comme les vraies commandes.\n\n" +
		"Écris-le pour moi, dans ta Maison (~/sortilege.sh) : une fonction benir qui bénit un nom, et une boucle qui lit les options, une à une. " +
		"-n NOM donne le nom à bénir. Et une option inconnue, -z par exemple, doit être refusée : un message, et le script s'arrête en erreur. " +
		"Lance-le avec -n, puis avec -z, que je voie. »\n\n" +
		C.gris("Les outils : benir() { ... } ; while getopts \"n:\" opt; do case $opt in n) ... ;; *) ... exit 2 ;; esac; done ; $OPTARG ; chmod +x ; ./sortilege.sh -n Ambre ; man getopts.");
}, ["getopts"]);
declarerAnnexe({ id: "a4_sortilege", chapitre: 5, titre: "Le sortilège à options", habitant: "l'Apprentie", lieu: "dans l'aile de l'Invocation", item: function(){ return AxApprentie; }, ouverte: axOuverteCh4,
	indice: "dans l'aile de l'Invocation, une apprentie gribouille un script.",
	resume: "Un script qui lit ses options comme une vraie commande (getopts, OPTARG), avec une fonction.",
	etapes: [
		{ titre: "Une fonction benir, définie et appelée dans ~/sortilege.sh", fait: function(){ return axVu("a4_sortilege", "fonction"); } },
		{ titre: "Les options lues par getopts : ./sortilege.sh -n NOM bénit NOM", fait: function(){ return axVu("a4_sortilege", "option"); } },
		{ titre: "Une option inconnue refusée : ./sortilege.sh -z s'arrête en erreur", fait: function(){ return axVu("a4_sortilege", "refus"); } }
	],
	souvenir: { nom: "Baguette-a-options", texte: "Une baguette de noisetier, gravée « -n NOM ». L'Apprentie dit qu'elle n'obéit qu'aux options qu'elle connaît." },
	lumiere: "le pupitre de l'Invocation",
	merci: "L'Apprentie lance son sortilège, puis un faux, qui échoue proprement. Elle applaudit. « Il sait dire non ! »"
});
var AX_BENEDICTIONS = [];
GameEvents.addListener("fonction", function(e){
	if (e.nom === "benir" && e.action === "appel" && e.dansScript){ axNoter("a4_sortilege", "fonctionAppel"); AX_BENEDICTIONS.push((e.args || []).join(" ")); }
});
var LANCER_SCRIPT_AVANT_ACADEMIE_ANNEXES = Shell.lancerScript;
Shell.lancerScript = function(chemin, io, direct, args, options){
	var it = null;
	try { var r = Shell.chercher(chemin, io, "bash"); it = r.node instanceof Item ? r.node : null; } catch (e){ it = null; }
	var sortie, erreur = null;
	axEtat("a4_sortilege");
	if (axEstSortilege(it)){ state.annexes.a4_sortilege.vus.fonctionAppel = false; AX_BENEDICTIONS = []; }
	try { sortie = LANCER_SCRIPT_AVANT_ACADEMIE_ANNEXES.apply(this, arguments); }
	catch (e){ erreur = e; }
	try {
		if (axOuverteCh4() && axEstSortilege(it)){
			var a = args || [];
			if (axVu("a4_sortilege", "fonctionAppel") && /benir\s*\(\)|function\s+benir/.test(it.getText())) axNoter("a4_sortilege", "fonction");
			var k = a.indexOf("-n"), nom = k > -1 ? a[k + 1] : (a.filter(function(x){ return /^-n./.test(x); })[0] || "").substring(2);
			if (nom && (io.code || 0) === 0 && !erreur && AX_BENEDICTIONS.indexOf(nom) > -1 && axVu("a4_sortilege", "fonction")) axNoter("a4_sortilege", "option");
			if (a.some(function(x){ return /^-[a-z]*z/.test(x); }) && ((io.code || 0) !== 0 || erreur) && axVu("a4_sortilege", "option")) axNoter("a4_sortilege", "refus");
		}
	} catch (x){}
	if (erreur) throw erreur;
	return sortie;
};

/* ------------------------------------------------------------------ */
/* 5. Le tube enchanté (la Messagère)                                  */
/* ------------------------------------------------------------------ */

var AX_REPONSE_ORACLE = "L'Oracle répond : « La Nuée ne reviendra pas avant l'hiver. Garde tes sauvegardes au sec. »";
function axTubeMaison(nom){ var it = Home.getItemFromName(nom); return it !== -1 && it.fifo ? it : null; }
var AxMessagere = axHabitant(AileChronomancie, "Messagere", function(){
	if (aFait("a4_tube")) return "La Messagère caresse son pigeon. « Deux tubes, deux programmes, et pas un fichier sur le disque. L'Oracle te répondra quand tu voudras. »";
	return "Une jeune femme, un pigeon voyageur sur l'épaule, guette le fond de l'aile.\n\n" +
		"« Je suis la Messagère. L'Oracle de la Chronomancie est un vieux programme : il ne lit ni fichiers ni courriers, seulement des TUBES. " +
		"Il guette, dans ta Maison, un tube nommé question. Ce qu'on y écrit, il le lit aussitôt, sans que rien ne reste sur le disque. " +
		"Et il répond dans un second tube, nommé reponse, si on le lui a creusé.\n\n" +
		"Creuse-lui le tube question, pose-lui ta question par le tube, puis lis sa réponse dans le tube reponse. " +
		"Deux programmes qui se parlent par un tuyau qui porte un nom : c'est tout ce que je te demande. »\n\n" +
		C.gris("Les outils : mkfifo ~/question ; ls -l ~ (un p en tête) ; echo \"...\" > ~/question ; mkfifo ~/reponse ; cat ~/reponse.");
}, ["mkfifo"]);
declarerAnnexe({ id: "a4_tube", chapitre: 5, titre: "Le tube enchanté", habitant: "la Messagère", lieu: "dans l'aile de la Chronomancie", item: function(){ return AxMessagere; }, ouverte: axOuverteCh4,
	indice: "dans l'aile de la Chronomancie, un pigeon voyageur attend.",
	resume: "Deux programmes qui se parlent par des tubes nommés (mkfifo) : écrire dans l'un, lire dans l'autre.",
	etapes: [
		{ titre: "Creuser le tube ~/question (mkfifo)", fait: function(){ return !!axTubeMaison("question") || axVu("a4_tube", "question"); } },
		{ titre: "Poser ta question à l'Oracle, par le tube (echo ... > ~/question)", fait: function(){ return axVu("a4_tube", "question"); } },
		{ titre: "Lire sa réponse dans un second tube, ~/reponse (mkfifo, cat)", fait: function(){ return axVu("a4_tube", "reponse"); } }
	],
	souvenir: { nom: "Plume-de-pigeon", texte: "Une plume grise du pigeon de la Messagère. Elle dit qu'un message ne doit jamais traîner sur le disque." },
	lumiere: "la lanterne de l'Oracle, au fond de la Chronomancie",
	merci: "Le pigeon de la Messagère s'envole par le tube. « Tu parles le langage de l'Oracle, désormais. »"
});
AX_LECTEURS_FIFO.push(function(it, texte){
	if (!axOuverteCh4() || it !== axTubeMaison("question") || !annexeProposee(annexeParId("a4_tube"))) return false;
	axNoter("a4_tube", "question");
	var rep = axTubeMaison("reponse");
	if (rep){ rep.axTampon = AX_REPONSE_ORACLE + "\n"; say(C.gris("(L'Oracle a lu ta question. Il attend que quelqu'un lise sa réponse dans ~/reponse.)")); }
	else { axEtat("a4_tube").enAttente = true; say(C.gris("(L'Oracle a lu ta question. Il cherche un tube nommé reponse, dans ta Maison, pour y écrire sa réponse : mkfifo ~/reponse.)")); }
	return true;
});
GameEvents.addListener("axFifo", function(e){
	if (e.action === "creation" && e.item && e.item.itemname === "reponse" && e.lieu === Home && axEtat("a4_tube").enAttente){
		e.item.axTampon = AX_REPONSE_ORACLE + "\n";
		state.annexes.a4_tube.enAttente = false;
		say(C.gris("(L'Oracle a trouvé ton tube reponse : il y écrit, et attend que tu le lises.)"));
	}
	if (e.action === "lecture" && e.item && e.item.itemname === "reponse" && /L'Oracle répond/.test(e.texte || "")) axNoter("a4_tube", "reponse");
});

/* ------------------------------------------------------------------ */
/* 6. Le registre des élèves (la Surveillante)                         */
/* ------------------------------------------------------------------ */

var AX_ELEVES = [[1, "Ambre Morel", "Divination", 2, 15.5], [2, "Bastien Roy", "Alchimie", 1, 11], [3, "Céleste Garnier", "Runes", 3, 13.25], [4, "Dorian Faure", "Alchimie", 2, 14.5],
	[5, "Elsa Perrin", "Divination", 1, 9.75], [6, "Félix Brun", "Chronomancie", 3, 16], [7, "Garance Lemoine", "Alchimie", 3, 12.75], [8, "Hugo Masson", "Transmutation", 1, 10.5],
	[9, "Inès Caron", "Divination", 3, 17.25], [10, "Jules Picard", "Runes", 2, 8.5], [11, "Léon Gautier", "Alchimie", 1, 12], [12, "Maëlle Renard", "Chronomancie", 2, 13],
	[13, "Noé Fontaine", "Transmutation", 3, 15], [14, "Oscar Vidal", "Alchimie", 2, 9.25], [15, "Pauline Robin", "Divination", 2, 12.5], [16, "Rose Lefort", "Runes", 1, 14],
	[17, "Simon Barbier", "Alchimie", 3, 13.5], [18, "Tess Aubert", "Transmutation", 2, 11.75], [19, "Victor Collin", "Chronomancie", 1, 10], [20, "Zoé Marchal", "Divination", 3, 14.25]];
var AX_REPONSE_REGISTRE = AX_ELEVES.filter(function(e){ return e[2] === "Alchimie" && e[4] > 12; }).length;
var AxRegistreDb = fichierCh4(AileDivination, "registre.db", "SQLite format 3\u0000\u0010\u0000\u0001\u0001\u0000@  \u0000\u0000\u0000\u0004\u0000\u0000\u0000\u0003 (une base SQLite : sqlite3 la lit)", { image: "item_manuscript.gif" });
AxRegistreDb.axBase = {
	ordre: ["absences", "eleves"], compteur: 4,
	tables: {
		eleves: { sql: "CREATE TABLE eleves (\n  id INTEGER PRIMARY KEY,\n  nom TEXT NOT NULL,\n  maison TEXT,\n  annee INTEGER,\n  moyenne REAL\n)",
			colonnes: [{ nom: "id", type: "INTEGER", contrainte: "PRIMARY KEY" }, { nom: "nom", type: "TEXT" }, { nom: "maison", type: "TEXT" }, { nom: "annee", type: "INTEGER" }, { nom: "moyenne", type: "REAL" }],
			lignes: AX_ELEVES.map(function(e){ return e.slice(); }) },
		absences: { sql: "CREATE TABLE absences (\n  id INTEGER PRIMARY KEY,\n  eleve_id INTEGER REFERENCES eleves(id),\n  jour TEXT,\n  motif TEXT\n)",
			colonnes: [{ nom: "id", type: "INTEGER", contrainte: "PRIMARY KEY" }, { nom: "eleve_id", type: "INTEGER" }, { nom: "jour", type: "TEXT" }, { nom: "motif", type: "TEXT" }],
			lignes: [[1, 10, "2026-09-14", "rhume des foins"], [2, 10, "2026-09-21", "retard du dragon postal"], [3, 5, "2026-09-22", "rendez-vous chez le guérisseur"], [4, 14, "2026-10-02", "non justifiée"],
				[5, 10, "2026-10-05", "non justifiée"], [6, 8, "2026-10-06", "concours de potions"]] }
	}
};
function axRequeteDivination(q){
	if (!q || q.k !== "select" || !q.where || !q.order.length) return false;
	var w = JSON.stringify(q.where);
	return /"nom":"maison"/i.test(w) && /"v":"Divination"/.test(w) && q.order[0].e.k === "col" && /^moyenne$/i.test(q.order[0].e.nom) && q.order[0].sens === "DESC";
}
var AxSurveillante = axHabitant(AileDivination, "Surveillante", function(){
	if (aFait("a4_registre")) return "La Surveillante tapote le registre. « Une question, une requête, une réponse. Plus besoin de feuilleter les listes une à une. »";
	return "Une femme sévère, un trousseau de clés à la ceinture, tient un registre qu'elle n'arrive pas à ouvrir.\n\n" +
		"« La Surveillante. Le registre des élèves n'est plus un cahier : c'est une base de données, registre.db, une base SQLite. " +
		"Je ne sais même pas ce qu'il y a dedans. Montre-moi d'abord ses tables, et comment est faite celle des élèves.\n\n" +
		"Ensuite, deux questions. Les élèves de la maison Divination, de la meilleure moyenne à la moins bonne. " +
		"Et combien d'élèves de la maison Alchimie ont strictement plus de 12 de moyenne : la base sait compter, demande-le-lui, puis écris le nombre dans ~/registre.txt. »\n\n" +
		C.gris("Les outils : sqlite3 registre.db \".tables\" ; \".schema eleves\" ; \"SELECT nom, moyenne FROM eleves WHERE ... ORDER BY ... DESC;\" ; \"SELECT COUNT(*) FROM eleves WHERE ... AND ...;\". -header -column pour les titres.");
}, ["sqlite3"]);
declarerAnnexe({ id: "a4_registre", chapitre: 5, titre: "Le registre des élèves", habitant: "la Surveillante", lieu: "dans l'aile de la Divination", item: function(){ return AxSurveillante; }, ouverte: axOuverteCh4,
	indice: "dans l'aile de la Divination, quelqu'un n'arrive pas à ouvrir un registre.",
	resume: "Interroger une base SQLite : ses tables (.tables, .schema), un filtre et un tri (WHERE, ORDER BY), un compte (COUNT).",
	etapes: [
		{ titre: "Les tables du registre, et la structure de celle des élèves (.tables, .schema)", fait: function(){ return axVu("a4_registre", "tables") && axVu("a4_registre", "schema"); } },
		{ titre: "Les élèves de Divination, de la meilleure moyenne à la moins bonne (WHERE, ORDER BY ... DESC)", fait: function(){ return axVu("a4_registre", "divination"); } },
		{ titre: "Combien d'élèves d'Alchimie ont plus de 12 de moyenne (COUNT), dans ~/registre.txt", fait: function(){
			return axVu("a4_registre", "count") && new RegExp("(^|[^0-9])" + AX_REPONSE_REGISTRE + "([^0-9]|$)").test(axTexteMaison("registre.txt") || "");
		} }
	],
	souvenir: { nom: "Cle-du-registre", texte: "Une petite clé de fer, étiquetée « SELECT ». La Surveillante dit qu'elle ouvre tous les registres de l'Académie." },
	lumiere: "la lampe du bureau de la Surveillante",
	merci: "La Surveillante écrit le nombre au bas de sa liste. « " + AX_REPONSE_REGISTRE + ", donc. Je n'aurais jamais trouvé si vite à la main. »"
});
GameEvents.addListener("axSql", function(e){
	if (e.item !== AxRegistreDb || !e.ok || !e.requete) return;
	var q = e.requete;
	if (q.k === ".tables") axNoter("a4_registre", "tables");
	if (q.k === ".schema" && (!q.table || /^eleves$/i.test(q.table))) axNoter("a4_registre", "schema");
	if (axRequeteDivination(q) && e.resultat && e.resultat.lignes.length === AX_ELEVES.filter(function(x){ return x[2] === "Divination"; }).length) axNoter("a4_registre", "divination");
	if (q.k === "select" && q.colonnes.some(function(c){ return c.e.k === "fn" && c.e.nom === "COUNT"; }) && e.resultat && e.resultat.lignes.length === 1 && axSqlValeur(e.resultat.lignes[0][0]) === AX_REPONSE_REGISTRE) axNoter("a4_registre", "count");
});

/* Le badge « Ami de l'Académie ». */
declarerAmiAnnexes(5, { badge: "ami_ch4", nom: "Ami de l'Académie", phrase: "les six habitants de l'Académie te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch4 = "Ami de l'Académie";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch4 = "or";
axLumieresDansPlan("grimoire", 5);

World.fige = true;
