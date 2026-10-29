/**
 * HabitantsLac.js : les quêtes annexes du Lac Profond (chapitre 10 pour le joueur, numéro interne 11).
 *
 * Six habitants de la rive confient chacun une petite histoire, en quatre étapes, sur la machine lac (dans ~/annexes).
 * Chaque annexe apporte une notion qu'aucune étape ni aucun défi du chapitre n'enseigne :
 *   a10_empreintes  Amina (la Grève des Fichiers)     vérifier un transfert : cksum, b2sum, un manifeste, b2sum -c
 *   a10_tabulations Kylian (le Banc de Tri)          voir et dompter les tabulations : cat -A, expand, unexpand
 *   a10_chapitres   Chahla (le Bief des Parallèles)  couper un journal à chaque en-tête : csplit
 *   a10_chrono      Adonis (la Chambre des Pressions) mesurer avant d'optimiser : time, time -p
 *   a10_ordre       Déborah (le Moulin des Doublons)  avant de joindre, vérifier l'ordre : sort -c, sort -o, sort -m
 *   a10_croise      Soufiane (le Comptoir des Mesures) la forme d'un tableau et le tableau croisé : datamash check, crosstab, transpose
 * Le mécanisme (proposition, étapes, récompenses, badge « Ami du Lac Profond ») est dans QuetesAnnexes.js.
 */

World.fige = false;

function ouverteCh10(){ return lacOuvert() && !!state.quests["n10_entree"]; }
function habitantCh10(cle, nom, image, texte, sorts){
	var it = new Item(nom, "", image).personnage();
	if (sorts && sorts.length) it.enseigne.apply(it, sorts);
	texteVivant(it, texte);
	posteCh10Par(cle).lieu.addItem(it);
	return it;
}
function vuAnnexeCh10(cle){ return !!(sCh10().annexesVus || {})[cle]; }
function noterAnnexeCh10(cle){ var c = sCh10(); c.annexesVus = c.annexesVus || {}; c.annexesVus[cle] = true; }
var ANNEXES_LAC_CH10 = "~/annexes";

/* ------------------------------------------------------------------ */
/* Ce que les habitants posent dans ~/annexes, sur lac                 */
/* ------------------------------------------------------------------ */

function lignesAnnexeCh10(debut, n){
	var D = donneesCh10();
	return D.captures.slice(debut, debut + n).map(ligneCaptureCh10);
}
/* Les trois arrivages d'Amina : au départ, et à l'arrivée (le sud abîmé en route : un chiffre changé). */
function arrivagesAminaCh10(){
	var t = {};
	[["nord", 0], ["sud", 20], ["est", 40]].forEach(function(x){ t[x[0]] = ENTETE_CAPTURES_CH10 + "\n" + lignesAnnexeCh10(x[1], 20).join("\n") + "\n"; });
	return t;
}
function sudAbimeCh10(texte){
	var l = texte.split("\n"), k = 7, champs = l[k].split(",");
	champs[5] = String(Math.round((parseFloat(champs[5]) + 1.5) * 100) / 100);
	l[k] = champs.join(",");
	return l.join("\n");
}
function releveTsvCh10(){
	var D = donneesCh10(), l = ["sonde\thorodatage\tprofondeur_m\ttemperature_c\toxygene_mgl"];
	(D.sondes || []).slice(0, 12).forEach(function(s){ l.push(String(s).split(",").join("\t")); });
	if (l.length < 6) for (var i = 0; i < 10; i++) l.push("S" + (i + 1) + "\t2026-10-27T06:00:00\t" + (5 + i * 7) + "\t" + (13 - i * 0.9).toFixed(2) + "\t" + (9.4 - i * 0.3).toFixed(2));
	return l.join("\n") + "\n";
}
function journalSondesCh10(){
	var D = donneesCh10(), l = [];
	for (var s = 1; s <= 8; s++){
		l.push("== SONDE S" + s + " ==");
		var n = 4 + (s * 3) % 5;
		for (var k = 0; k < n; k++) l.push("2026-10-27T" + deuxChiffres(6 + k) + ":00:00 profondeur=" + (5 + 7 * (s - 1)) + "m temperature=" + (13 - (s - 1) * 0.9 + k * 0.1).toFixed(2) + "C");
	}
	return l.join("\n") + "\n";
}
function listeOrdreCh10(jour){
	var D = donneesCh10(), ids = D.captures.map(function(c){ return c.id; });
	var debut = jour === "lundi" ? 60 : 90, l = ids.slice(debut, debut + 18);
	// Mélangées comme elles arrivent : le désordre du quai.
	return l.map(function(x, i){ return l[(i * 7) % l.length]; }).join("\n") + "\n";
}
function prisesCroiseCh10(){
	var D = donneesCh10();
	return "comptoir,espece,poids_kg\n" + D.captures.slice(100, 160).map(function(c){ return [c.comptoir, c.espece, c.poids].join(","); }).join("\n") + "\n";
}
function semerAnnexesLacCh10(){
	var A = arrivagesAminaCh10();
	["nord", "sud", "est"].forEach(function(k){
		fichierLacCh10("annexes/transfert/depart/" + k + ".csv", A[k]);
		fichierLacCh10("annexes/transfert/arrivee/" + k + ".csv", k === "sud" ? sudAbimeCh10(A[k]) : A[k]);
	});
	fichierLacCh10("annexes/tabulations/releve.tsv", releveTsvCh10());
	fichierLacCh10("annexes/journal/sondes-du-jour.txt", journalSondesCh10());
	fichierLacCh10("annexes/ordre/lundi.txt", listeOrdreCh10("lundi"));
	fichierLacCh10("annexes/ordre/mardi.txt", listeOrdreCh10("mardi"));
	fichierLacCh10("annexes/croise/prises.csv", prisesCroiseCh10());
}
var SEMER_LAC_AVANT_HABITANTS = semerLac;
semerLac = function(){
	var deja = sCh10().seme;
	var r = SEMER_LAC_AVANT_HABITANTS.apply(this, arguments);
	if (!deja){ try { moteurSeul(semerAnnexesLacCh10); } catch (e){} }
	return r;
};
if (typeof REGENERATIONS_CH10 !== "undefined") REGENERATIONS_CH10.push({ nom: "annexes", etapes: [], semer: function(){ semerAnnexesLacCh10(); } });

/* Le texte d'un fichier de ~/annexes, ou null. */
function texteAnnexeCh10(rel){ return texteLacCh10(ANNEXES_LAC_CH10 + "/" + rel); }
/* Les objets d'un dossier de ~/annexes. */
function objetsAnnexeCh10(rel){
	var d = noeudLacCh10(ANNEXES_LAC_CH10 + "/" + rel);
	return d && d.items ? d.items : [];
}
function lignesNettesCh10(t){ return String(t || "").split("\n").filter(function(x){ return x !== ""; }); }
function trieeCh10(l){ for (var i = 1; i < l.length; i++) if (comparerTextes(l[i - 1], l[i]) > 0) return false; return true; }
function memesLignesCh10(a, b){ return a.slice().sort().join("\n") === b.slice().sort().join("\n"); }

/* ------------------------------------------------------------------ */
/* Ce que le joueur lance sur lac : ce qui prouve chaque étape          */
/* ------------------------------------------------------------------ */

var APPELER_AVANT_HABITANTS_CH10 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_HABITANTS_CH10.apply(this, arguments);
	try {
		if (ouverteCh10() && surLacCh10()){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "", a = args || [], tout = a.join(" ");
			var options = a.filter(function(x){ return /^-/.test(x); }).join(" ");
			var echec = !!(io && io.code);
			if (nom === "cksum" && /^\d+ \d+/m.test(s)) noterAnnexeCh10("cksum");
			if (nom === "b2sum" && /(^|\s)(-c|--check)(\s|$)/.test(tout) && /: FAILED/.test(s) && /: OK/.test(s)) noterAnnexeCh10("b2sumCheck");
			if (nom === "cat" && /(-[a-zA-Z]*[AT]|--show-all|--show-tabs)/.test(options) && /\^I/.test(s)) noterAnnexeCh10("tabsVues");
			if (nom === "expand" && /\S/.test(s) && s.indexOf("\t") === -1) noterAnnexeCh10("expand");
			if (nom === "unexpand" && s.indexOf("\t") > -1) noterAnnexeCh10("unexpand");
			if (nom === "grep" && (s.match(/== SONDE S\d ==/g) || []).length >= 8) noterAnnexeCh10("entetes");
			if (nom === "csplit" && !echec) noterAnnexeCh10("csplit");
			if (nom === "head" && (s.match(/== SONDE S\d ==/g) || []).length >= 8) noterAnnexeCh10("entetesMorceaux");
			if (nom === "time"){
				noterAnnexeCh10("time");
				if (a[0] === "-p") noterAnnexeCh10("timeP");
				if (a.indexOf("sort") > -1 && /captures\.csv/.test(tout)) noterAnnexeCh10("timeTri");
			}
			if (nom === "sort" && /(^|\s)(-[a-zA-Z]*c[a-zA-Z]*|--check)(\s|$)/.test(tout) && /ordre\/|lundi|mardi/.test(tout + " " + Shell.cheminAffiche(current_room))){
				noterAnnexeCh10(echec ? "desordre" : "ordreVerifie");
			}
			if (nom === "sort" && /(^|\s)(-[a-zA-Z]*m[a-zA-Z]*|--merge)(\s|$)/.test(tout)) noterAnnexeCh10("fusion");
			if (nom === "datamash" && a.indexOf("check") > -1 && !echec) noterAnnexeCh10("check");
			if (nom === "datamash" && a.indexOf("crosstab") > -1 && !echec && /\S/.test(s)) noterAnnexeCh10("crosstab");
			if (nom === "datamash" && a.indexOf("transpose") > -1 && !echec && /\S/.test(s)) noterAnnexeCh10("transpose");
		}
	} catch (e){ /* une annexe ne doit jamais casser un sort */ }
	return sortie;
};

/* ------------------------------------------------------------------ */
/* 1. Le témoin du transfert (Amina, la Grève des Fichiers)             */
/* ------------------------------------------------------------------ */

function manifesteOkCh10(){
	var lignes = [];
	["transfert/depart", "transfert", "transfert/arrivee"].forEach(function(rel){
		objetsAnnexeCh10(rel).forEach(function(it){
			if (!/\.(b2|b2sum|txt|sum)$|MANIFESTE/i.test(it.itemname)) return;
			lignes = lignes.concat(lignesNettesCh10(texteAnnexeCh10(rel + "/" + it.itemname)).filter(function(l){ return /^[0-9a-f]{128}  \S+\.csv$/.test(l); }));
		});
	});
	return lignes.length >= 3;
}
var AminaCh10 = habitantCh10("greve", "Amina", "item_amina.gif", function(){
	if (aFait("a10_empreintes")) return "Amina range son carnet d'empreintes. « Trois caisses parties, trois caisses arrivées, et la preuve que ce sont les mêmes. Le reste, c'est de la confiance. »";
	return "Une jeune femme compare deux piles de caisses identiques, un carnet ouvert sur les genoux.\n\n" +
		"« Amina. Je réceptionne les arrivages des comptoirs. Trois fichiers partent du quai, trois fichiers arrivent ici. Mais arriver ne veut pas dire arriver ENTIERS : " +
		"un octet qui saute en route, et tout le pipeline calcule faux sans rien dire. Alors, au départ, on prend l'empreinte de chaque fichier, et à l'arrivée, on vérifie.\n" +
		"cksum, c'est l'ancêtre : rapide, mais faible. b2sum est moderne, sûr, et plus rapide que sha256sum. On écrit les empreintes du départ dans un manifeste, " +
		"puis b2sum -c relit le manifeste à l'arrivée et dit, fichier par fichier, OK ou FAILED. Mes caisses sont dans ~/annexes/transfert, sur lac. »\n\n" +
		C.gris("Les outils (ssh lac, puis cd ~/annexes/transfert/depart) : cksum nord.csv ; b2sum *.csv > MANIFESTE.b2 ; cd ../arrivee ; b2sum -c ../depart/MANIFESTE.b2 ; cp ../depart/FICHIER .");
}, ["cksum", "b2sum"]);
declarerAnnexe({ id: "a10_empreintes", chapitre: 11, titre: "Le témoin du transfert", habitant: "Amina", lieu: "à la Grève des Fichiers", item: function(){ return AminaCh10; }, ouverte: ouverteCh10,
	indice: "à la Grève, quelqu'un compare deux piles de caisses identiques.",
	resume: "Prouver qu'un transfert est intact : cksum, b2sum, un manifeste d'empreintes, b2sum -c.",
	etapes: [
		{ titre: "Une empreinte rapide, à l'ancienne (cksum)", fait: function(){ return vuAnnexeCh10("cksum"); } },
		{ titre: "Le manifeste du départ (b2sum *.csv > MANIFESTE.b2)", fait: manifesteOkCh10 },
		{ titre: "L'arrivée vérifiée : un fichier abîmé en route (b2sum -c)", fait: function(){ return vuAnnexeCh10("b2sumCheck"); } },
		{ titre: "Le fichier abîmé remplacé : les trois arrivées identiques au départ", fait: function(){
			return ["nord", "sud", "est"].every(function(k){ var d = texteAnnexeCh10("transfert/depart/" + k + ".csv"), r = texteAnnexeCh10("transfert/arrivee/" + k + ".csv"); return d && d === r; });
		} }
	],
	souvenir: { nom: "Carnet-d-empreintes", texte: "Un carnet à spirale, couvert de longues suites de chiffres et de lettres. Sur la couverture : « On ne fait pas confiance à un transfert. On le vérifie. »" },
	lumiere: "la lampe de quai d'Amina, entre les deux piles de caisses",
	merci: "Amina ferme son carnet. « Un manifeste au départ, une vérification à l'arrivée. C'est tout ce qu'il faut pour dormir tranquille. »"
});

/* ------------------------------------------------------------------ */
/* 2. Les tabulations (Kylian, le Banc de Tri)                         */
/* ------------------------------------------------------------------ */

function releveSansTabCh10(){
	var t = texteAnnexeCh10("tabulations/releve.txt"), src = texteAnnexeCh10("tabulations/releve.tsv");
	if (!t || !src || t.indexOf("\t") > -1) return false;
	return lignesNettesCh10(t).length === lignesNettesCh10(src).length && /sonde/.test(t);
}
var KylianCh10 = habitantCh10("banc", "Kylian", "item_kylian.gif", function(){
	if (aFait("a10_tabulations")) return "Kylian aligne ses étiquettes au cordeau. « Une tabulation, ça se voit quand on sait la chercher. Et ça se range quand on sait la remplacer. »";
	return "Un garçon pose des étiquettes sur les étals, en pestant contre des colonnes qui ne tombent jamais droit.\n\n" +
		"« Kylian. Les sondes m'envoient des relevés séparés par des TABULATIONS, pas des virgules. À l'écran, on dirait des espaces : on ne les distingue pas. " +
		"Et selon les largeurs, les colonnes dansent. D'abord, les voir : cat -A montre chaque tabulation comme ^I (et chaque fin de ligne comme $). " +
		"Ensuite, expand remplace chaque tabulation par des espaces, jusqu'au prochain taquet : expand -t 14 aligne tout sur des colonnes de quatorze. " +
		"Et unexpand fait le chemin inverse, pour un outil qui veut des tabulations. Le relevé est dans ~/annexes/tabulations, sur lac. »\n\n" +
		C.gris("Les outils (dans ~/annexes/tabulations) : cat -A releve.tsv ; expand -t 14 releve.tsv ; expand -t 14 releve.tsv > releve.txt ; unexpand -a -t 14 releve.txt.");
}, ["expand", "unexpand"]);
declarerAnnexe({ id: "a10_tabulations", chapitre: 11, titre: "Les colonnes qui dansent", habitant: "Kylian", lieu: "au Banc de Tri", item: function(){ return KylianCh10; }, ouverte: ouverteCh10,
	indice: "au Banc de Tri, quelqu'un peste contre des colonnes qui ne tombent jamais droit.",
	resume: "Voir les tabulations (cat -A), les remplacer par des espaces alignés (expand -t), les rendre (unexpand -a).",
	etapes: [
		{ titre: "Voir les tabulations, cachées dans le relevé (cat -A)", fait: function(){ return vuAnnexeCh10("tabsVues"); } },
		{ titre: "Des colonnes alignées à l'écran (expand -t 14)", fait: function(){ return vuAnnexeCh10("expand"); } },
		{ titre: "Un relevé aligné, sans une seule tabulation (releve.txt)", fait: releveSansTabCh10 },
		{ titre: "Les tabulations rendues, pour un autre outil (unexpand -a)", fait: function(){ return vuAnnexeCh10("unexpand"); } }
	],
	souvenir: { nom: "Regle-de-Kylian", texte: "Une règle d'écolier, graduée tous les quatorze millimètres. Au dos, au feutre : « ^I. Toujours regarder les ^I. »" },
	lumiere: "la guirlande d'étiquettes de Kylian, enfin alignées",
	merci: "Kylian plante sa dernière étiquette, droite comme un i. « Les colonnes ne dansent plus. Merci. »"
});

/* ------------------------------------------------------------------ */
/* 3. Les chapitres d'un journal (Chahla, le Bief des Parallèles)       */
/* ------------------------------------------------------------------ */

function morceauxSondesCh10(){
	var vus = {};
	objetsAnnexeCh10("journal").forEach(function(it){
		if (it.itemname === "sondes-du-jour.txt") return;
		var t = texteAnnexeCh10("journal/" + it.itemname) || "", m = /^== SONDE (S\d) ==/.exec(t);
		if (m && (t.match(/== SONDE/g) || []).length === 1) vus[m[1]] = true;
	});
	return Object.keys(vus).length;
}
var ChahlaCh10 = habitantCh10("bief", "Chahla", "item_chahla.gif", function(){
	if (aFait("a10_chapitres")) return "Chahla relie ses huit cahiers d'un même ruban. « Un journal, huit chapitres, coupés juste au bon endroit. split coupe à la taille ; moi, je coupe au sens. »";
	return "Une jeune femme, assise au bord du bief, découpe un long rouleau de papier avec des ciseaux de couturière.\n\n" +
		"« Chahla. Miguel coupe les gros fichiers en morceaux égaux avec split : très bien pour paralléliser. Mais ce journal-là a des CHAPITRES : un en-tête « == SONDE S1 == », ses mesures, puis le suivant. " +
		"Le couper en morceaux égaux, c'est couper une sonde en deux. csplit coupe là où une ligne correspond à un motif : '/^== SONDE/' pour le motif, '{*}' pour « autant de fois qu'il le faut ». " +
		"Et -z ne garde pas les morceaux vides. Le journal est dans ~/annexes/journal, sur lac. »\n\n" +
		C.gris("Les outils (dans ~/annexes/journal) : grep -n '^== SONDE' sondes-du-jour.txt ; csplit -z -f sonde- sondes-du-jour.txt '/^== SONDE/' '{*}' ; ls ; head -n 1 sonde-*.");
}, ["csplit"]);
declarerAnnexe({ id: "a10_chapitres", chapitre: 11, titre: "Les chapitres d'un journal", habitant: "Chahla", lieu: "au Bief des Parallèles", item: function(){ return ChahlaCh10; }, ouverte: ouverteCh10,
	indice: "au bord du bief, quelqu'un découpe un long rouleau aux ciseaux.",
	resume: "Couper un fichier au sens, pas à la taille : csplit sur un motif, répété ('{*}'), sans morceau vide (-z).",
	etapes: [
		{ titre: "Les en-têtes repérés, avec leurs numéros de ligne (grep -n)", fait: function(){ return vuAnnexeCh10("entetes"); } },
		{ titre: "Couper à chaque en-tête (csplit ... '/^== SONDE/' '{*}')", fait: function(){ return vuAnnexeCh10("csplit"); } },
		{ titre: "Huit morceaux, un par sonde, chacun avec son seul en-tête", fait: function(){ return morceauxSondesCh10() >= 8; } },
		{ titre: "La première ligne de chaque morceau, d'un coup d'œil (head -n 1)", fait: function(){ return vuAnnexeCh10("entetesMorceaux"); } }
	],
	souvenir: { nom: "Ciseaux-de-Chahla", texte: "Une paire de ciseaux de couturière, les lames gravées d'un motif : /^== SONDE/. Chahla dit qu'on coupe toujours là où le sens change." },
	lumiere: "les huit lanternes de Chahla, une par sonde, le long du bief",
	merci: "Chahla te tend les ciseaux. « split pour la vitesse, csplit pour le sens. Tu sauras laquelle prendre. »"
});

/* ------------------------------------------------------------------ */
/* 4. Le chronomètre (Adonis, la Chambre des Pressions)                 */
/* ------------------------------------------------------------------ */

var AdonisCh10 = habitantCh10("chambre", "Adonis", "item_adonis.gif", function(){
	if (aFait("a10_chrono")) return "Adonis remonte son chronomètre. « On mesure d'abord. On optimise ensuite. Et on remesure. Le reste, ce sont des impressions. »";
	return "Un garçon, un chronomètre de cuivre autour du cou, note des chiffres sur le mur de la Chambre à la craie.\n\n" +
		"« Adonis. Tout le monde ici veut que les traitements aillent plus vite. Personne ne les mesure. Alors on optimise au hasard. " +
		"time lance une commande et dit combien de temps elle a pris : real, le temps qui s'est écoulé à l'horloge ; user, le temps de calcul ; sys, le temps passé dans le noyau. " +
		"Si real est bien plus grand que user plus sys, la commande attendait : le disque, le réseau. time -p donne le même relevé en format court, facile à lire pour un script. " +
		"Et time écrit sur la sortie d'erreur : 2> pour garder la mesure dans un fichier. Mesure-moi un tri des captures, et note-le dans ~/annexes/chrono.txt. »\n\n" +
		C.gris("Les outils (sur lac) : time wc -l ~/rive/captures.csv ; time -p sort -t, -k6,6n ~/rive/captures.csv > /dev/null ; time -p sort -t, -k6,6n ~/rive/captures.csv > /dev/null 2> ~/annexes/chrono.txt ; cat ~/annexes/chrono.txt.");
}, ["time"]);
declarerAnnexe({ id: "a10_chrono", chapitre: 11, titre: "Le chronomètre", habitant: "Adonis", lieu: "à la Chambre des Pressions", item: function(){ return AdonisCh10; }, ouverte: ouverteCh10,
	indice: "à la Chambre des Pressions, quelqu'un note des temps à la craie.",
	resume: "Mesurer avant d'optimiser : time (real, user, sys), time -p, et la mesure gardée (2>).",
	etapes: [
		{ titre: "Chronométrer une commande (time)", fait: function(){ return vuAnnexeCh10("time"); } },
		{ titre: "Le format court, pour un script (time -p)", fait: function(){ return vuAnnexeCh10("timeP"); } },
		{ titre: "Chronométrer un tri des captures (time ... sort ... captures.csv)", fait: function(){ return vuAnnexeCh10("timeTri"); } },
		{ titre: "La mesure gardée dans ~/annexes/chrono.txt (2>)", fait: function(){ return /real/.test(texteAnnexeCh10("chrono.txt") || ""); } }
	],
	souvenir: { nom: "Chronometre-d-Adonis", texte: "Un chronomètre de cuivre, l'aiguille arrêtée. Gravé au dos : « real, user, sys. Mesure d'abord. »" },
	lumiere: "la craie lumineuse d'Adonis, sur le mur de la Chambre",
	merci: "Adonis efface le mur d'un revers de manche. « La prochaine fois qu'on te dit que c'est lent, tu demanderas : combien ? »"
});

/* ------------------------------------------------------------------ */
/* 5. Avant de joindre (Déborah, le Moulin des Doublons)                */
/* ------------------------------------------------------------------ */

function ordreTrieCh10(jour){
	var t = texteAnnexeCh10("ordre/" + jour + ".txt"), l = lignesNettesCh10(t);
	return l.length >= 10 && trieeCh10(l) && memesLignesCh10(l, lignesNettesCh10(listeOrdreCh10(jour)));
}
function semaineOkCh10(){
	var t = texteAnnexeCh10("ordre/semaine.txt"), l = lignesNettesCh10(t);
	var attendu = lignesNettesCh10(listeOrdreCh10("lundi")).concat(lignesNettesCh10(listeOrdreCh10("mardi")));
	return l.length === attendu.length && trieeCh10(l) && memesLignesCh10(l, attendu);
}
var DeborahCh10 = habitantCh10("moulin", "Deborah", "item_deborah.gif", function(){
	if (aFait("a10_ordre")) return "Déborah pose ses deux registres, l'un sur l'autre, bien d'équerre. « Vérifié, trié, fusionné. comm et join peuvent venir : ils ne mentiront plus. »";
	return "Une jeune femme feuillette deux registres à la fois, un doigt dans chacun, les sourcils froncés.\n\n" +
		"« Déborah. comm et join comparent deux fichiers TRIÉS. Donne-leur un fichier en désordre, et ils ne plantent pas toujours : parfois, ils répondent faux, sans prévenir. " +
		"Alors avant, on vérifie : sort -c lit un fichier et dit s'il est trié, et où il ne l'est pas ; s'il l'est, il ne dit rien, et c'est bon signe. " +
		"sort -o trie un fichier sur place, sans passer par un fichier intermédiaire (avec > vers le même fichier, on le viderait avant de le lire !). " +
		"Et quand deux fichiers sont déjà triés, sort -m les fusionne sans tout retrier : sur des milliards de lignes, ça change tout. Mes registres sont dans ~/annexes/ordre, sur lac. »\n\n" +
		C.gris("Les outils (dans ~/annexes/ordre) : sort -c lundi.txt ; sort -o lundi.txt lundi.txt ; sort -o mardi.txt mardi.txt ; sort -c lundi.txt ; sort -m lundi.txt mardi.txt > semaine.txt.");
});
declarerAnnexe({ id: "a10_ordre", chapitre: 11, titre: "Avant de joindre", habitant: "Déborah", lieu: "au Moulin des Doublons", item: function(){ return DeborahCh10; }, ouverte: ouverteCh10,
	indice: "au Moulin, quelqu'un feuillette deux registres à la fois.",
	resume: "Vérifier qu'un fichier est trié (sort -c), trier sur place (sort -o), fusionner deux fichiers déjà triés (sort -m).",
	etapes: [
		{ titre: "Le désordre détecté (sort -c)", fait: function(){ return vuAnnexeCh10("desordre"); } },
		{ titre: "Les deux registres triés sur place (sort -o)", fait: function(){ return ordreTrieCh10("lundi") && ordreTrieCh10("mardi"); } },
		{ titre: "Le silence d'un fichier en ordre (sort -c, sans un mot)", fait: function(){ return vuAnnexeCh10("ordreVerifie") && ordreTrieCh10("lundi"); } },
		{ titre: "La semaine, fusionnée sans tout retrier (sort -m > semaine.txt)", fait: function(){ return vuAnnexeCh10("fusion") && semaineOkCh10(); } }
	],
	souvenir: { nom: "Signet-de-Deborah", texte: "Deux signets de soie, l'un rouge, l'autre bleu, noués ensemble. Une étiquette : « sort -c avant comm. Toujours. »" },
	lumiere: "la lampe de lecture de Déborah, entre ses deux registres",
	merci: "Déborah referme les registres. « Un outil qui suppose un ordre, on lui donne de l'ordre. Et on le vérifie avant. »"
});

/* ------------------------------------------------------------------ */
/* 6. Le tableau croisé (Soufiane, le Comptoir des Mesures)             */
/* ------------------------------------------------------------------ */

function croiseOkCh10(){
	var t = texteAnnexeCh10("croise/croise.csv") || texteAnnexeCh10("croise/croise.txt") || texteAnnexeCh10("croise/croise.tsv") || "";
	if (!t) return false;
	var n = COMPTOIRS_CH10.filter(function(c){ return t.indexOf(c) > -1; }).length;
	var e = ESPECES_CH10.filter(function(x){ return t.indexOf(Array.isArray(x) ? x[0] : x) > -1; }).length;
	return n >= 3 && e >= 3 && lignesNettesCh10(t).length <= 12;
}
var SoufianeCh10 = habitantCh10("comptoir", "Soufiane", "item_soufiane.gif", function(){
	if (aFait("a10_croise")) return "Soufiane épingle son tableau croisé au-dessus du comptoir. « Les comptoirs en lignes, les espèces en colonnes, et tout le lac sur une feuille. »";
	return "Un garçon trace une grille au fusain sur une grande feuille, au-dessus des balances.\n\n" +
		"« Soufiane. Syrine fait les sommes et les moyennes. Moi, je veux voir deux choses À LA FOIS : combien de prises par comptoir ET par espèce. C'est un tableau croisé. " +
		"datamash le sait faire : crosstab 1,2 met les valeurs de la colonne 1 en lignes, celles de la colonne 2 en colonnes, et compte ce qui tombe dans chaque case. " +
		"Mais d'abord, on vérifie la FORME du fichier : datamash check dit si toutes les lignes ont le même nombre de colonnes (une ligne bancale, et tout le calcul ment). " +
		"Et transpose retourne un tableau comme une crêpe : les lignes deviennent des colonnes. Mes prises sont dans ~/annexes/croise, sur lac. »\n\n" +
		C.gris("Les outils (dans ~/annexes/croise) : datamash -t, --header-in check < prises.csv ; datamash -t, -s --header-in crosstab 1,2 < prises.csv ; ... | datamash -t, transpose ; ... > croise.csv.");
});
declarerAnnexe({ id: "a10_croise", chapitre: 11, titre: "Le tableau croisé", habitant: "Soufiane", lieu: "au Comptoir des Mesures", item: function(){ return SoufianeCh10; }, ouverte: ouverteCh10,
	indice: "au Comptoir, quelqu'un trace une grande grille au fusain.",
	resume: "La forme d'un tableau (datamash check), un tableau croisé (datamash crosstab), un tableau retourné (datamash transpose).",
	etapes: [
		{ titre: "La forme du fichier vérifiée (datamash check)", fait: function(){ return vuAnnexeCh10("check"); } },
		{ titre: "Les comptoirs en lignes, les espèces en colonnes (datamash crosstab 1,2)", fait: function(){ return vuAnnexeCh10("crosstab"); } },
		{ titre: "Le tableau retourné (datamash transpose)", fait: function(){ return vuAnnexeCh10("transpose"); } },
		{ titre: "Le tableau croisé gardé dans ~/annexes/croise/croise.csv", fait: croiseOkCh10 }
	],
	souvenir: { nom: "Grille-de-Soufiane", texte: "Une grande feuille pliée en huit, couverte d'une grille au fusain : six comptoirs, huit espèces, et des chiffres dans chaque case." },
	lumiere: "la lampe-tempête de Soufiane, au-dessus de la grille",
	merci: "Soufiane roule la grille. « Une somme répond à une question. Un tableau croisé en pose dix. C'est là que commence l'analyse. »"
});

/* Le badge « Ami du Lac Profond », et une phrase de plus dans la scène finale. */
declarerAmiAnnexes(11, { badge: "ami_ch10", nom: "Ami du Lac Profond", phrase: "les six habitants de la rive te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch10 = "Ami du Lac Profond";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch10 = "or";
var LECON_AMI_CH10 = "Les quêtes annexes : vérifier un transfert (cksum, b2sum -c), les tabulations (cat -A, expand, unexpand), csplit, time, l'ordre avant de joindre (sort -c, -o, -m), datamash check, crosstab et transpose. Facultatif, hors note.";
/* Ces sorts-là ne s'apprennent qu'auprès des habitants : hors du barème du chapitre, comme toutes les annexes. */
["cksum", "b2sum", "expand", "unexpand", "csplit", "time"].forEach(function(s){
	var i = ORDRE_DES_SORTS_11.indexOf(s);
	if (i > -1) ORDRE_DES_SORTS_11.splice(i, 1);
	if (typeof MANUEL !== "undefined" && MANUEL[s]) MANUEL[s].horsBareme = true;
});
declarerSortsAnnexes(["cksum", "b2sum", "expand", "unexpand", "csplit", "time"]);
function texteAmiFinaleCh10(){
	return annexesToutesFaites(11) ? " Sur la rive, Amina, Kylian, Chahla, Adonis, Déborah et Soufiane lèvent chacun une lanterne : celles-là sont pour toi." : "";
}

World.fige = true;
