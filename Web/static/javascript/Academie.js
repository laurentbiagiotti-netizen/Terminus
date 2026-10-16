/**
 * Academie.js : la vie de l'Académie des Arcanes (chapitre 4 pour le joueur, numéro interne 5).
 *
 * Chapitre4.js pose le monde, la Nuée, la bombe et les 20 étapes. Ici, l'Académie prend vie :
 *  - les huit maîtres, Frances, Laurent, la radio de Grace et l'Horloge ont un texte VIVANT
 *    (un accesseur, comme Nour dans Adresses.js) : il change avec l'avancée du joueur, réagit
 *    aux erreurs fréquentes, et félicite avec une anecdote du métier ;
 *  - chaque aile a ses données d'entraînement (d'autres données que celles de la mission) :
 *    les maîtres enseignent dessus, le joueur transpose ensuite sur le serveur archives ;
 *  - les 50 défis (quêtes secondaires s_d_*), six par école, révélés par les maîtres ;
 *  - les badges du chapitre, le grimoire (tableau de bord des écoles) et le bestiaire.
 *
 * Tout ce qui touche à la Nuée reste narratif et inerte : le joueur mesure, nettoie, restaure.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Petits outils                                                       */
/* ------------------------------------------------------------------ */

function aFait(id){ return !!(typeof state !== "undefined" && state && state.quests && state.quests[id]); }
function etatCh4(){ return (typeof state !== "undefined" && state && state.ch4) || etatCh4Initial(); }
function minutesAvantMinuit(){ return MINUIT - etatCh4().horloge; }
function texteVivant(item, fabrique){
	Object.defineProperty(item.cmd_text, "less", { get: fabrique, set: function(){}, enumerable: true, configurable: true });
	return item;
}
function lignesSortie(s){ return lignesPropres(sansAnsi(String(s == null ? "" : s))); }
function sansFinDeLigne(t){ return String(t == null ? "" : t).replace(/\s+$/, ""); }
function contientNombre(texte, valeur, tolerance){
	var nombres = String(texte).match(/-?\d+(?:[.,]\d+)?/g) || [];
	return nombres.some(function(n){ return Math.abs(parseFloat(n.replace(",", ".")) - valeur) <= (tolerance || 0); });
}
function aOption(args, lettre, longue){
	return args.some(function(a){
		if (longue && (a === longue || a.indexOf(longue + "=") === 0)) return true;
		return /^-[A-Za-z0-9]+$/.test(a) && a.indexOf(lettre) > 0;
	});
}
function image(nom){ return "./static/img/" + nom; }

/* ------------------------------------------------------------------ */
/* Les données d'entraînement de chaque aile                           */
/* ------------------------------------------------------------------ */

/* Runes : le registre des sorts lancés en salle d'entraînement, et des codes de salle. */
var REGISTRE_DES_SORTS = [
	"# registre des sorts lances en salle d'entrainement (aile des Runes)",
	"# colonnes : date heure eleve sort resultat",
	"2025-03-03 09:12 eleve=ambre sort=feu resultat=reussi",
	"2025-03-03 09:15 eleve=basile sort=lumiere resultat=rate",
	"2025-03-03 09:20 eleve=celeste sort=feux resultat=reussi",
	"2025-03-03 09:31 eleve=dorian sort=bouclier resultat=reussi",
	"2025-03-04 10:02 eleve=ambre sort=couvrefeu resultat=rate",
	"2025-03-04 10:07 eleve=elouan sort=feu resultat=rate",
	"2025-03-04 10:11 eleve=fanny sort=glace resultat=reussi",
	"2025-03-04 10:40 eleve=basile sort=lumiere resultat=explosion",
	"2025-03-04 10:42 eleve=hector sort=bouclier resultat=reussi",
	"2025-03-05 14:03 eleve=iris sort=feu resultat=reussi",
	"2025-03-05 14:20 eleve=jade sort=glace resultat=rate",
	"2025-03-05 14:26 eleve=celeste sort=lumiere resultat=reussi"
];
var CODES_DE_SALLE = ["B12", "amphi", "204", "C3", "laboratoire", "117", "salle-des-runes", "31"];
var RUNES = {
	donnees: REGISTRE_DES_SORTS.filter(function(l){ return l.charAt(0) !== "#"; }),
	motFeu: REGISTRE_DES_SORTS.filter(function(l){ return /(^|[^A-Za-z0-9_])feu([^A-Za-z0-9_]|$)/.test(l); }),
	explosion: REGISTRE_DES_SORTS.filter(function(l){ return /explosion/.test(l); })[0],
	chiffres: CODES_DE_SALLE.filter(function(c){ return /^[0-9]+$/.test(c); })
};
RUNES.eleves = RUNES.donnees.map(function(l){ return /eleve=[a-z]+/.exec(l)[0]; });
RUNES.rates = REGISTRE_DES_SORTS.filter(function(l){ return /resultat=rate$/.test(l); }).length;
RUNES.avant = REGISTRE_DES_SORTS[REGISTRE_DES_SORTS.indexOf(RUNES.explosion) - 1];
RUNES.apres = REGISTRE_DES_SORTS[REGISTRE_DES_SORTS.indexOf(RUNES.explosion) + 1];

/* Divination : le registre des potions (nom ecole prix stock), un CSV d'élèves, des prophéties. */
var POTIONS = [
	["elixir-de-lune", "alchimie", 12, 40], ["filtre-d-oubli", "divination", 18, 7], ["sirop-de-runes", "runes", 9, 25],
	["baume-du-mage", "transmutation", 15, 12], ["tisane-du-temps", "chronomancie", 11, 30], ["encre-de-grimoire", "grimoires", 14, 18],
	["philtre-d-echo", "invocation", 16, 9], ["sel-des-archives", "archives", 14, 22]
];
var ELEVES_CSV = [["nom", "maison", "annee"], ["ambre", "Runes", "1"], ["basile", "Divination", "2"], ["celeste", "Alchimie", "1"],
	["dorian", "Runes", "3"], ["elouan", "Archives", "2"], ["fanny", "Invocation", "1"]];
var PROPHETIES = ["la lune annonce un orage", "trois corbeaux sur le toit", "minuit sonnera deux fois", "le registre ment rarement", "une flamme verte"];
var DIVINATION = {
	stock: POTIONS.reduce(function(s, p){ return s + p[3]; }, 0),
	moyenne: POTIONS.reduce(function(s, p){ return s + p[2]; }, 0) / POTIONS.length,
	maisons: ELEVES_CSV.slice(1).map(function(l){ return l[1]; }),
	derniers: PROPHETIES.map(function(l){ return l.split(" ").pop(); }),
	majuscules: POTIONS.map(function(p){ return p[0].toUpperCase(); })
};

/* Transmutation : un carnet de recettes, avec des dates JJ/MM/AAAA et des espaces en trop en fin de ligne. */
var RECETTES = [
	"Recette du baume du mage, notee le 12/03/2024   ",
	"Ingredients : sauge, miel, poudre de lune",
	"Etape 1 : chauffer doucement   ",
	"Etape 2 : remuer trois fois",
	"Etape 3 : laisser reposer jusqu'au 15/03/2024",
	"Etape 4 : filtrer  ",
	"Relue par le maitre Lee le 02/04/2024"
];
var TEXTE_RECETTES = RECETTES.join("\n") + "\n";
var TRANSMUTATION = {
	dates: TEXTE_RECETTES.match(/\d{2}\/\d{2}\/\d{4}/g),
	nettes: RECETTES.map(function(l){ return l.replace(/\s+$/, ""); })
};
TRANSMUTATION.converties = TRANSMUTATION.dates.map(function(d){ var p = d.split("/"); return p[2] + "-" + p[1] + "-" + p[0]; });

/* Grimoires : le catalogue de la bibliothèque, un grimoire relié en arbre. */
var BIBLIOTHEQUE = {
	bibliotheque: "Aile des Grimoires",
	ouvrages: [
		{ titre: "Traite des runes", ecole: "runes", pages: 320, emprunte: false },
		{ titre: "Almanach des marees", ecole: "divination", pages: 96, emprunte: true },
		{ titre: "Codex du cuivre", ecole: "alchimie", pages: 540, emprunte: false },
		{ titre: "Petit manuel du sablier", ecole: "chronomancie", pages: 64, emprunte: true },
		{ titre: "Recueil des invocations", ecole: "invocation", pages: 210, emprunte: false },
		{ titre: "Memoires du miroir", ecole: "archives", pages: 150, emprunte: false }
	]
};
var GRIMOIRES = {
	titres: BIBLIOTHEQUE.ouvrages.map(function(o){ return o.titre; }),
	parPages: BIBLIOTHEQUE.ouvrages.slice().sort(function(a, b){ return a.pages - b.pages; }).map(function(o){ return o.titre; })
};

/* Alchimie : une réserve de fioles (des vides, des lourdes), et des registres à assembler. */
function texteDeTaille(debut, octets){
	var t = debut + "\n";
	var phrase = "Une ligne de notes d'alchimie, recopiee pour la reserve. ";
	while (t.length < octets) t += phrase;
	return t.substring(0, octets) + "\n";
}
var RESERVE = {
	"grand-chaudron.txt": texteDeTaille("Le grand chaudron : inventaire complet", 3200),
	"traite-des-melanges.txt": texteDeTaille("Traite des melanges, tome premier", 5400),
	"elixir.txt": "Un elixir de lune, flacon de 10 cl.\n",
	"etiquette.txt": "A ne pas boire.\n",
	"fiole-vide-1": "",
	"fiole-vide-2": ""
};
var ALCHIMIE = {
	lourds: ["grand-chaudron.txt", "traite-des-melanges.txt"],
	legers: ["elixir.txt", "etiquette.txt"],
	vides: ["fiole-vide-1", "fiole-vide-2"],
	ingredients: ["sauge", "miel", "poudre-de-lune", "racine-de-mandragore"],
	quantites: ["3 feuilles", "2 cuilleres", "1 pincee", "1 racine"],
	maisons: [["ambre", "Runes"], ["basile", "Divination"], ["celeste", "Alchimie"], ["dorian", "Runes"]],
	notes: [["ambre", "15"], ["basile", "12"], ["dorian", "17"], ["elouan", "9"]],
	tableau: ["potion prix stock", "elixir 12 40", "filtre-d-oubli 18 7", "sirop 9 25"],
	stocks: [["sauge", 12], ["miel", 3], ["mandragore", 27], ["lune", 8], ["sel", 15]]
};
ALCHIMIE.joints = ALCHIMIE.maisons.filter(function(m){ return ALCHIMIE.notes.some(function(n){ return n[0] === m[0]; }); })
	.map(function(m){ return m[0] + " " + m[1] + " " + ALCHIMIE.notes.filter(function(n){ return n[0] === m[0]; })[0][1]; });
ALCHIMIE.ordreStocks = ALCHIMIE.stocks.slice().sort(function(a, b){ return a[1] - b[1]; }).map(function(s){ return s[0]; });

/* Chronomancie : un planning de sabliers à déchiffrer (des lignes de crontab sur d'autres tâches). */
var HORAIRES_DES_SABLIERS =
	"# Les roues de l'aile (crontab de l'Academie) : minute heure jour mois jour-de-semaine commande\n" +
	"0 6 * * *      /usr/local/bin/arroser-mandragores\n" +
	"*/15 * * * *   /usr/local/bin/remonter-les-sabliers\n" +
	"0 18 * * 5     /usr/local/bin/fermer-la-tour\n" +
	"30 7 1 * *     /usr/local/bin/inventaire-du-mois\n" +
	"45 4 * * *     /usr/local/bin/allumer-les-fours\n";

/* Archives : des parchemins à copier (sans les brouillons), et une formule et sa version corrigée. */
var PARCHEMINS = {
	"chant-1.txt": "Premier chant : la fondation de l'Academie.\n",
	"chant-2.txt": "Deuxieme chant : la guerre des sabliers.\n",
	"chant-3.txt": "Troisieme chant : le miroir qui n'oublie rien.\n",
	"brouillon.tmp": "brouillon a jeter\n",
	"copie.tmp": "copie de travail, a jeter\n"
};
var ARCHIVES_ENTRAINEMENT = { chants: ["chant-1.txt", "chant-2.txt", "chant-3.txt"], brouillons: ["brouillon.tmp", "copie.tmp"] };
var FORMULE = "Formule du philtre d'echo\n1. chauffer l'eau de source\n2. ajouter trois pincees de sel\n3. remuer dans le sens des aiguilles\n4. laisser refroidir\n";
var FORMULE_V2 = "Formule du philtre d'echo\n1. chauffer l'eau de source\n2. ajouter deux pincees de sel\n3. remuer dans le sens des aiguilles\n4. laisser refroidir une nuit\n";
var AMELIORATION_DIFF =
	"--- formule.txt\n+++ formule-v2.txt\n@@ -1,5 +1,5 @@\n" +
	" Formule du philtre d'echo\n 1. chauffer l'eau de source\n-2. ajouter trois pincees de sel\n+2. ajouter deux pincees de sel\n" +
	" 3. remuer dans le sens des aiguilles\n-4. laisser refroidir\n+4. laisser refroidir une nuit\n";

/* Invocation : une liste d'élèves, et un petit sort d'exemple qui n'a rien à voir avec la Nuée. */
var LISTE_DES_ELEVES = "ambre\nbasile\nceleste\ndorian\nelouan\n";
var SALUT_SH =
	"#!/bin/bash\n" +
	"# salut.sh : salue chaque eleve d'une liste (un exemple de Brian)\n" +
	"set -e\n" +
	"saluer() {\n" +
	"    printf \"Bonjour %s, bienvenue a l'Academie\\n\" \"$1\"\n" +
	"}\n" +
	"if [ -z \"$1\" ]; then\n" +
	"    echo \"usage : salut.sh LISTE\"\n" +
	"    exit 1\n" +
	"fi\n" +
	"n=0\n" +
	"while read -r eleve; do\n" +
	"    saluer \"$eleve\"\n" +
	"    n=$((n + 1))\n" +
	"done < \"$1\"\n" +
	"echo \"$n eleves salues\"\n";

/* Poser les fichiers d'entraînement (lisibles par tous, à root : on s'entraîne sur une copie si l'on veut écrire). */
function entrainement(lieu, nom, texte, image){ return fichierCh4(lieu, nom, texte, { image: image || "item_manuscript.gif", owner: "root" }); }

entrainement(AileRunes, "registre-des-sorts.log", REGISTRE_DES_SORTS.join("\n") + "\n");
entrainement(AileRunes, "codes-de-salle.txt", CODES_DE_SALLE.join("\n") + "\n", "item_sign.gif");

entrainement(AileDivination, "potions.txt", POTIONS.map(function(p){ return p.join(" "); }).join("\n") + "\n");
entrainement(AileDivination, "eleves.csv", ELEVES_CSV.map(function(l){ return l.join(","); }).join("\n") + "\n", "item_sign.gif");
entrainement(AileDivination, "propheties.txt", PROPHETIES.join("\n") + "\n");

entrainement(AileTransmutation, "recettes.txt", TEXTE_RECETTES);

entrainement(AileGrimoires, "bibliotheque.json", JSON.stringify(BIBLIOTHEQUE, null, 2) + "\n", "item_radspellbook.gif");

var Reserve = salleCh4("Reserve", "La réserve de l'Alchimie : des étagères de fioles, certaines vides, d'autres lourdes de notes.", "loc_bin.gif");
link_rooms(AileAlchimie, Reserve);
Object.keys(RESERVE).forEach(function(nom){ entrainement(Reserve, nom, RESERVE[nom], /^fiole/.test(nom) ? "item_sign.gif" : "item_manuscript.gif"); });
entrainement(AileAlchimie, "ingredients.txt", ALCHIMIE.ingredients.join("\n") + "\n", "item_sign.gif");
entrainement(AileAlchimie, "quantites.txt", ALCHIMIE.quantites.join("\n") + "\n", "item_sign.gif");
entrainement(AileAlchimie, "maisons.txt", ALCHIMIE.maisons.map(function(l){ return l.join(" "); }).join("\n") + "\n", "item_sign.gif");
entrainement(AileAlchimie, "notes.txt", ALCHIMIE.notes.map(function(l){ return l.join(" "); }).join("\n") + "\n", "item_sign.gif");
entrainement(AileAlchimie, "tableau-brut.txt", ALCHIMIE.tableau.join("\n") + "\n", "item_sign.gif");
entrainement(AileAlchimie, "stocks.txt", ALCHIMIE.stocks.map(function(l){ return l.join(" "); }).join("\n") + "\n", "item_sign.gif");

entrainement(AileChronomancie, "horaires-des-sabliers.txt", HORAIRES_DES_SABLIERS, "item_sign.gif");

var Parchemins = salleCh4("Parchemins", "Les parchemins de l'aile des Archives : trois chants à garder, deux brouillons à laisser.", "loc_library.gif");
link_rooms(AileArchives, Parchemins);
Object.keys(PARCHEMINS).forEach(function(nom){ entrainement(Parchemins, nom, PARCHEMINS[nom]); });
entrainement(AileArchives, "formule.txt", FORMULE);
entrainement(AileArchives, "formule-v2.txt", FORMULE_V2);
entrainement(AileArchives, "amelioration.diff", AMELIORATION_DIFF, "item_sign.gif");

entrainement(AileInvocation, "liste-des-eleves.txt", LISTE_DES_ELEVES, "item_sign.gif");
fichierCh4(AileInvocation, "salut.sh", SALUT_SH, { image: "item_radspellbook.gif", owner: "root", mode: "rwxr-xr-x" });

/* ------------------------------------------------------------------ */
/* Les 50 défis de l'Académie (quêtes secondaires, six par école)      */
/* ------------------------------------------------------------------ */

/* appel(nom, args, sortie) : vrai si ce sort, avec cette sortie, réussit le défi (la sortie est vérifiée,
   pas seulement la commande). monde() : vrai si l'état du monde le prouve. Les autres passent par des événements. */
var DEFIS_ARCANES = [
	// Runes (Henry)
	{ id: "s_d_grep_w", ecole: "runes", titre: "Runes : retrouver le mot entier « feu » dans le registre des sorts (grep -w)",
	  appel: function(n, a, s){ return n === "grep" && memeOrdre(lignesSortie(s), RUNES.motFeu); } },
	{ id: "s_d_grep_o", ecole: "runes", titre: "Runes : n'extraire du registre que les noms des élèves (grep -o)",
	  appel: function(n, a, s){ var l = lignesSortie(s); return n === "grep" && (memeOrdre(l, RUNES.eleves) || memeOrdre(l, RUNES.eleves.map(function(e){ return e.substring(6); }))); } },
	{ id: "s_d_grep_C", ecole: "runes", titre: "Runes : montrer l'explosion avec la ligne d'avant et celle d'après (grep -C)",
	  appel: function(n, a, s){
		var l = lignesSortie(s), contexte = a.some(function(x){ return /^-[ABC]\d*$|^-\d+$|^--(context|after-context|before-context)/.test(x); });
		return n === "grep" && contexte && [RUNES.avant, RUNES.explosion, RUNES.apres].every(function(x){ return l.indexOf(x) > -1; });
	  } },
	{ id: "s_d_grep_v", ecole: "runes", titre: "Runes : tout le registre, sauf les commentaires (grep -v)",
	  appel: function(n, a, s){ return n === "grep" && memeOrdre(lignesSortie(s), RUNES.donnees); } },
	{ id: "s_d_grep_classe", ecole: "runes", titre: "Runes : les codes de salle faits seulement de chiffres, avec une classe [[:digit:]]",
	  appel: function(n, a, s){ return n === "grep" && a.join(" ").indexOf("[[:") > -1 && memeEnsemble(lignesSortie(s), RUNES.chiffres); } },
	{ id: "s_d_grep_c", ecole: "runes", titre: "Runes : compter les sorts ratés du registre (grep -c)",
	  appel: function(n, a, s){ return n === "grep" && sansAnsi(String(s)).trim() === String(RUNES.rates); } },
	// Divination (Alfred)
	{ id: "s_d_awk_beginend", ecole: "divination", titre: "Divination : un en-tête (BEGIN) et le stock total des potions (END)",
	  appel: function(n, a, s){ var t = a.join(" "); return n === "awk" && /BEGIN/.test(t) && /END/.test(t) && contientNombre(s, DIVINATION.stock); } },
	{ id: "s_d_awk_moyenne", ecole: "divination", titre: "Divination : le prix moyen d'une potion (awk)",
	  appel: function(n, a, s){ return n === "awk" && contientNombre(s, DIVINATION.moyenne, 0.006); } },
	{ id: "s_d_awk_printf", ecole: "divination", titre: "Divination : un registre des potions bien aligné (printf dans awk)",
	  appel: function(n, a, s){ return n === "awk" && /printf/.test(a.join(" ")) && lignesSortie(s).length >= POTIONS.length && POTIONS.every(function(p){ return s.indexOf(p[0]) > -1; }); } },
	{ id: "s_d_awk_F", ecole: "divination", titre: "Divination : la colonne des maisons du CSV des élèves (awk -F,)",
	  appel: function(n, a, s){ var l = lignesSortie(s); return n === "awk" && (memeOrdre(l, DIVINATION.maisons) || memeOrdre(l, ["maison"].concat(DIVINATION.maisons))); } },
	{ id: "s_d_awk_NF", ecole: "divination", titre: "Divination : le dernier mot de chaque prophétie ($NF)",
	  appel: function(n, a, s){ return n === "awk" && memeOrdre(lignesSortie(s), DIVINATION.derniers); } },
	{ id: "s_d_awk_fonction", ecole: "divination", titre: "Divination : le nom de chaque potion en capitales (toupper)",
	  appel: function(n, a, s){ return n === "awk" && DIVINATION.majuscules.every(function(m){ return s.indexOf(m) > -1; }); } },
	// Transmutation (Lee)
	{ id: "s_d_sed_bak", ecole: "transmutation", titre: "Transmutation : modifier une copie des recettes sur place en gardant l'original (sed -i.bak)",
	  monde: function(){ return sedBakFait(); } },
	{ id: "s_d_sed_dates", ecole: "transmutation", titre: "Transmutation : retourner les dates des recettes en AAAA-MM-JJ (groupes \\1 \\2 \\3)",
	  appel: function(n, a, s){ return n === "sed" && TRANSMUTATION.converties.every(function(d){ return s.indexOf(d) > -1; }) && TRANSMUTATION.dates.every(function(d){ return s.indexOf(d) === -1; }); } },
	{ id: "s_d_sed_nettoyer", ecole: "transmutation", titre: "Transmutation : effacer les espaces en trop en fin de ligne (sed)",
	  appel: function(n, a, s){ return n === "sed" && memeOrdre(lignesSortie(s), TRANSMUTATION.nettes); } },
	{ id: "s_d_sed_n", ecole: "transmutation", titre: "Transmutation : n'afficher que les étapes 1 à 3, les lignes 3 à 5 (sed -n)",
	  appel: function(n, a, s){ return n === "sed" && memeOrdre(lignesSortie(s).map(sansFinDeLigne), TRANSMUTATION.nettes.slice(2, 5)); } },
	{ id: "s_d_sed_y", ecole: "transmutation", titre: "Transmutation : changer des lettres en d'autres, lettre à lettre (sed y)",
	  appel: function(n, a, s){
		var l = lignesSortie(s);
		return n === "sed" && /(^|[\s;'"])y(.)/.test(a.join(" ")) && l.length === RECETTES.length &&
			l.some(function(x, i){ return x !== RECETTES[i]; }) && l.every(function(x, i){ return x.length === RECETTES[i].length; });
	  } },
	{ id: "s_d_sed_ai", ecole: "transmutation", titre: "Transmutation : ajouter un titre avant la première ligne et une signature après la dernière (sed i et a)",
	  appel: function(n, a, s){
		var l = lignesSortie(s).map(sansFinDeLigne);
		return n === "sed" && l.length === RECETTES.length + 2 && memeOrdre(l.slice(1, -1), TRANSMUTATION.nettes);
	  } },
	// Grimoires (Stephen)
	{ id: "s_d_jq_point", ecole: "grimoires", titre: "Grimoires : lire une feuille, le nom de la bibliothèque (jq .clé)",
	  appel: function(n, a, s){ return n === "jq" && sansAnsi(String(s)).trim().replace(/^"|"$/g, "") === BIBLIOTHEQUE.bibliotheque; } },
	{ id: "s_d_jq_length", ecole: "grimoires", titre: "Grimoires : compter les ouvrages du rayonnage (length)",
	  appel: function(n, a, s){ return n === "jq" && sansAnsi(String(s)).trim() === String(BIBLIOTHEQUE.ouvrages.length); } },
	{ id: "s_d_jq_keys", ecole: "grimoires", titre: "Grimoires : lister les clés d'un ouvrage (keys)",
	  appel: function(n, a, s){ return n === "jq" && ["ecole", "emprunte", "pages", "titre"].every(function(k){ return s.indexOf('"' + k + '"') > -1; }) && GRIMOIRES.titres.every(function(t){ return s.indexOf(t) === -1; }); } },
	{ id: "s_d_jq_objet", ecole: "grimoires", titre: "Grimoires : fabriquer une fiche réduite {titre, pages} pour chaque ouvrage",
	  appel: function(n, a, s){ return n === "jq" && GRIMOIRES.titres.every(function(t){ return s.indexOf(t) > -1; }) && /pages/.test(s) && !/ecole|emprunte/.test(s); } },
	{ id: "s_d_jq_c", ecole: "grimoires", titre: "Grimoires : un ouvrage par ligne, en JSON compact (jq -c)",
	  appel: function(n, a, s){ var l = lignesSortie(s); return n === "jq" && aOption(a, "c", "--compact-output") && l.length === BIBLIOTHEQUE.ouvrages.length && l.every(function(x){ return x.charAt(0) === "{"; }); } },
	{ id: "s_d_jq_tri", ecole: "grimoires", titre: "Grimoires : les titres rangés par nombre de pages (sort_by)",
	  appel: function(n, a, s){
		if (n !== "jq") return false;
		var pos = GRIMOIRES.parPages.map(function(t){ return s.indexOf(t); });
		if (pos.some(function(p){ return p < 0; })) return false;
		var monte = pos.every(function(p, i){ return i === 0 || p > pos[i - 1]; }), descend = pos.every(function(p, i){ return i === 0 || p < pos[i - 1]; });
		return monte || descend;
	  } },
	// Alchimie (Doug)
	{ id: "s_d_find_size", ecole: "alchimie", titre: "Alchimie : trouver les fioles lourdes de la Réserve, plus de 2 Kio (find -size)",
	  appel: function(n, a, s){ return n === "find" && a.indexOf("-size") > -1 && ALCHIMIE.lourds.every(function(x){ return s.indexOf(x) > -1; }) && ALCHIMIE.legers.concat(ALCHIMIE.vides).every(function(x){ return s.indexOf(x) === -1; }); } },
	{ id: "s_d_find_empty", ecole: "alchimie", titre: "Alchimie : trouver les fioles vides de la Réserve (find -empty)",
	  appel: function(n, a, s){ return n === "find" && a.indexOf("-empty") > -1 && ALCHIMIE.vides.every(function(x){ return s.indexOf(x) > -1; }) && ALCHIMIE.lourds.concat(ALCHIMIE.legers).every(function(x){ return s.indexOf(x) === -1; }); } },
	{ id: "s_d_paste", ecole: "alchimie", titre: "Alchimie : coller les ingrédients et leurs quantités côte à côte (paste)",
	  appel: function(n, a, s){ var l = lignesSortie(s); return n === "paste" && l.length === ALCHIMIE.ingredients.length && l.every(function(x, i){ var k = x.indexOf(ALCHIMIE.ingredients[i]); return k > -1 && x.indexOf(ALCHIMIE.quantites[i], k) > k; }); } },
	{ id: "s_d_join", ecole: "alchimie", titre: "Alchimie : réunir les maisons et les notes des élèves sur leur nom (join)",
	  appel: function(n, a, s){ var l = lignesSortie(s).map(function(x){ return x.trim().split(/\s+/).join(" "); }); return n === "join" && ALCHIMIE.joints.every(function(j){ return l.indexOf(j) > -1; }); } },
	{ id: "s_d_column", ecole: "alchimie", titre: "Alchimie : aligner le tableau brut en colonnes (column -t)",
	  appel: function(n, a, s){
		var l = lignesSortie(s);
		if (n !== "column" || l.length !== ALCHIMIE.tableau.length) return false;
		var debuts = l.map(function(x){ var m = /^\S+\s+/.exec(x); return m ? m[0].length : -1; });
		return debuts[0] > 0 && debuts.every(function(d){ return d === debuts[0]; });
	  } },
	{ id: "s_d_sort_k", ecole: "alchimie", titre: "Alchimie : ranger les stocks par quantité, la 2e colonne en nombres (sort -k)",
	  appel: function(n, a, s){ var l = lignesSortie(s).map(function(x){ return x.trim().split(/\s+/)[0]; }); return n === "sort" && (memeOrdre(l, ALCHIMIE.ordreStocks) || memeOrdre(l, ALCHIMIE.ordreStocks.slice().reverse())); } },
	// Chronomancie (Paul)
	{ id: "s_d_cron_quiz", ecole: "chronomancie", titre: "Chronomancie : dire à Paul quand tourne « 45 4 * * * » (echo HH:MM, dans son aile)" },
	{ id: "s_d_at_cycle", ecole: "chronomancie", titre: "Chronomancie : poser un sablier (at), le voir (atq), le briser (atrm)" },
	{ id: "s_d_timer_status", ecole: "chronomancie", titre: "Chronomancie : lire l'état du timer piégé de la Nuée (systemctl status)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("status") > -1 && a.some(function(x){ return /maj-nocturne/.test(x); }) && /maj-nocturne/.test(s); } },
	{ id: "s_d_timer_all", ecole: "chronomancie", titre: "Chronomancie : voir le timer désarmé dans la liste complète (list-timers --all)",
	  appel: function(n, a, s){ var t = timerBombe(); return n === "systemctl" && a.indexOf("list-timers") > -1 && /maj-nocturne/.test(s) && !!t && !etatTimer("archives", t).actif; } },
	{ id: "s_d_crontab_autre", ecole: "chronomancie", titre: "Chronomancie : lire la crontab d'un autre compte (crontab -u NOM -l)",
	  appel: function(n, a, s){ var k = a.indexOf("-u"); return n === "crontab" && k > -1 && a.indexOf("-l") > -1 && a[k + 1] && a[k + 1] !== JOUEUR && sansAnsi(String(s)).trim() !== ""; } },
	{ id: "s_d_date_d", ecole: "chronomancie", titre: "Chronomancie : calculer une date relative, comme « dans 3 jours » (date -d)",
	  appel: function(n, a, s){ return n === "date" && a.some(function(x){ return x === "-d" || /^--date/.test(x) || /^-d./.test(x); }) && sansAnsi(String(s)).trim() !== ""; } },
	// Archives (Andrew)
	{ id: "s_d_rsync_n", ecole: "archives", titre: "Archives : une répétition à blanc avant de copier (rsync -n)",
	  appel: function(n, a, s){ return n === "rsync" && a.some(function(x){ return x === "--dry-run" || /^-[A-Za-z]*n[A-Za-z]*$/.test(x); }); } },
	{ id: "s_d_rsync_exclude", ecole: "archives", titre: "Archives : copier les Parchemins chez toi sans les brouillons (rsync --exclude)",
	  appel: function(n, a, s){ return n === "rsync" && a.some(function(x){ return /^--exclude/.test(x); }) && copieDesChants(); } },
	{ id: "s_d_tar", ecole: "archives", titre: "Archives : ranger les chants dans une archive .tar.gz, puis en lister le contenu (tar)",
	  appel: function(n, a, s){
		var lettres = a.filter(function(x){ return /^-?[ctxvzf]+$/.test(x); }).join("");
		return n === "tar" && lettres.indexOf("t") > -1 && a.some(function(x){ return /\.(tar\.gz|tgz)$/.test(x); }) &&
			ARCHIVES_ENTRAINEMENT.chants.every(function(c){ return s.indexOf(c) > -1; });
	  } },
	{ id: "s_d_diff_u", ecole: "archives", titre: "Archives : fabriquer un patron de couture au format unifié (diff -u)",
	  appel: function(n, a, s){ return n === "diff" && a.some(function(x){ return /^-[A-Za-z]*u/.test(x) || /^-U/.test(x) || /^--unified/.test(x); }) && /^@@/m.test(sansAnsi(String(s))); } },
	{ id: "s_d_patch_dry", ecole: "archives", titre: "Archives : essayer une couture sans piquer (patch --dry-run)" },
	{ id: "s_d_patch_R", ecole: "archives", titre: "Archives : découdre une formule déjà recousue, sur ta copie (patch -R)" },
	// Invocation (Brian)
	{ id: "s_d_fonction_2args", ecole: "invocation", titre: "Invocation : appeler une fonction avec deux arguments ($1 et $2)" },
	{ id: "s_d_case", ecole: "invocation", titre: "Invocation : un aiguillage case ... esac qui tourne sans erreur" },
	{ id: "s_d_while_read", ecole: "invocation", titre: "Invocation : lire une liste ligne par ligne (while read)" },
	{ id: "s_d_subst", ecole: "invocation", titre: "Invocation : glisser le résultat d'un sort dans un autre, $(...)" },
	{ id: "s_d_arith", ecole: "invocation", titre: "Invocation : un calcul avec $(( ... ))" },
	{ id: "s_d_heredoc", ecole: "invocation", titre: "Invocation : écrire plusieurs lignes d'un coup (un here-document <<)" },
	// Hors des écoles (Laurent et l'Horloge)
	{ id: "s_d_avant_minuit", ecole: "nuit", titre: "La nuit : désarmer les trois déclencheurs de la bombe avant 23 h" },
	{ id: "s_d_sans_indice", ecole: "nuit", titre: "La nuit : remettre le retour d'expérience sans avoir acheté un seul indice" }
];
DEFIS_ARCANES.forEach(function(d){ QUETES_SECONDAIRES_CH4.push({ id: d.id, titre: d.titre }); });

function defisDe(ecole){ return DEFIS_ARCANES.filter(function(d){ return d.ecole === ecole; }); }
function idsDefis(ecole){ return defisDe(ecole).map(function(d){ return d.id; }); }
function listeDefis(ecole){
	return defisDe(ecole).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}

/* Réussir un défi : une seule fois, et seulement dans l'Académie ouverte (jamais pendant l'épreuve finale). */
function academieActive(){
	return typeof state !== "undefined" && state && state.has && state.has("ch4Ouvert") && !(typeof examenEnCours === "function" && examenEnCours());
}
function reussirDefi(id){
	if (!academieActive() || state.quests[id]) return;
	state.complete(id);
}

/* Les preuves dans le monde : les objets de la Maison (et de ses sous-dossiers). */
function lieuxSous(lieu){ var l = [lieu]; lieu.children.forEach(function(c){ l = l.concat(lieuxSous(c)); }); return l; }
function sedBakFait(){
	return lieuxSous(Home).some(function(lieu){
		return lieu.items.some(function(it){
			if (!/\.bak$/.test(it.itemname) || sansFinDeLigne(it.getText()) !== sansFinDeLigne(TEXTE_RECETTES)) return false;
			var frere = lieu.getItemFromName(it.itemname.replace(/\.bak$/, ""));
			return frere !== -1 && sansFinDeLigne(frere.getText()) !== sansFinDeLigne(TEXTE_RECETTES);
		});
	});
}
function copieDesChants(){
	return lieuxSous(Home).some(function(lieu){ return memeEnsemble(lieu.itemStringArray(), ARCHIVES_ENTRAINEMENT.chants); });
}

/* Les sorts lancés : on regarde chaque appel (et sa sortie) une fois qu'il a réussi. */
function sabliersDuJoueur(){ return etatArcanes().at.taches.filter(function(t){ return !t.bombe; }).map(function(t){ return t.n; }); }
var APPELER_AVANT_ACADEMIE = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var avant = (nom === "at" || nom === "atrm") && academieActive() ? sabliersDuJoueur() : null;
	var sortie = APPELER_AVANT_ACADEMIE.apply(this, arguments);
	if (academieActive()){
		try { effetAcademie(nom, args || [], typeof sortie === "string" ? sansAnsi(sortie) : "", avant); }
		catch (e) { /* un défi ne doit jamais casser un sort */ }
	}
	return sortie;
};
function effetAcademie(nom, args, sortie, avant){
	DEFIS_ARCANES.forEach(function(d){
		if (d.appel && !state.quests[d.id] && d.appel(nom, args, sortie)) reussirDefi(d.id);
	});
	var c = state.ch4;
	if (!c) return;
	// Le cycle d'un sablier : poser (at), voir (atq), briser (atrm).
	var apres = (nom === "at" || nom === "atrm") ? sabliersDuJoueur() : null;
	if (nom === "at" && avant && apres.length > avant.length) c.sablierPose = true;
	if (nom === "atq" && c.sablierPose && sabliersDuJoueur().some(function(n){ return new RegExp("(^|\\n)" + n + "\\t").test(sortie); })) c.sablierVu = true;
	if (nom === "atrm" && avant && apres.length < avant.length && c.sablierPose && c.sablierVu) reussirDefi("s_d_at_cycle");
}

/* Les coutures (patch) : un essai réussi, une couture défaite. */
GameEvents.addListener("patch", function(e){
	if (!e.ok) return;
	if (e.essai) reussirDefi("s_d_patch_dry");
	else if (e.inverse) reussirDefi("s_d_patch_R");
});
/* Les fonctions : un appel à deux arguments, qui finit bien. */
GameEvents.addListener("fonction", function(e){
	if (e.action === "appel" && e.args && e.args.length >= 2 && !e.statut) reussirDefi("s_d_fonction_2args");
});
/* Les scripts : les structures d'un script qui tourne sans erreur. */
GameEvents.addListener("script", function(e){ if (!e.statut) structuresInvocation(e.structures || []); });
function structuresInvocation(st){
	if (st.indexOf("case") > -1) reussirDefi("s_d_case");
	if (st.indexOf("while") > -1 && st.indexOf("read") > -1) reussirDefi("s_d_while_read");
	if (st.indexOf("$(...)") > -1) reussirDefi("s_d_subst");
	if (st.indexOf("$((...))") > -1) reussirDefi("s_d_arith");
	if (st.indexOf("here-doc") > -1) reussirDefi("s_d_heredoc");
}
/* La colle de Paul : echo HH:MM dans l'aile de la Chronomancie. */
GameEvents.addListener("echo", function(e){
	if (e.room !== AileChronomancie || !academieActive() || state.quests["s_d_cron_quiz"]) return;
	var dit = String(e.text || "").trim();
	if (!dit) return;
	if (/^0?4\s*[:h]\s*45$/.test(dit)){
		say("Paul retourne un sablier. « " + dit + ". Exact : la minute d'abord, l'heure ensuite. Tous les jours, tous les mois. »");
		reussirDefi("s_d_cron_quiz");
	} else if (/^\d{1,2}\s*[:h]\s*\d{2}$/.test(dit)){
		say("Paul secoue la tête. « Non. Lis les champs dans l'ordre : minute, PUIS heure. 45 4, c'est quelle heure ? »");
	}
});

/* ------------------------------------------------------------------ */
/* Les maîtres, vivants                                                */
/* ------------------------------------------------------------------ */

/* Un maître parle de quatre façons : avant sa mission (entrée, métaphore, syntaxe, mission),
   entre ses deux étapes, après une erreur fréquente, et une fois tout fini (félicitations, anecdote, défis). */
function paroleDeMaitre(m){
	var e1 = aFait(m.etapes[0]), e2 = aFait(m.etapes[1]);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouh]/.test(m.nom) ? "d'" : "de ") + m.nom) + C.gris(" (des quêtes secondaires, pour s'entraîner sur l'aile)") + "\n" + listeDefis(m.ecole);
	if (e1 && e2) return m.fin() + defis;
	var erreur = m.erreur ? m.erreur() : null;
	var corps = e1 ? m.entre() : m.entree() + "\n\n" + m.metaphore() + "\n\n" + m.syntaxe() + "\n\n" + m.mission();
	return corps + (erreur ? "\n\n" + C.jaune(erreur) : "") + "\n\n" + C.gris(m.metier) + defis;
}

var MAITRES_VIVANTS = {
	runes: {
		nom: "Henry", item: Henry, etapes: ["d_runes_traces", "d_runes_ioc"], ecole: "runes",
		metier: "Le métier : dans un vrai SOC, ces adresses s'appellent des IOC, des indicateurs de compromission. On les partage aux autres écoles et au CERT : la Nuée ne frappera pas qu'ici.",
		entree: function(){ return "Henry ne lève pas les yeux tout de suite. Il passe un doigt sur les runes gravées dans le mur, comme on lit en braille, et elles s'allument en vert sur son passage. « Ah. La recrue de la Crypte. Assieds-toi. »"; },
		metaphore: function(){ return "« Une rune, c'est un tamis. Tu verses un journal dedans : les lignes qui ont la bonne forme restent, le reste tombe. grep, c'est le geste de verser. Toute la science est dans la forme du tamis. »"; },
		syntaxe: function(){ return "« Entraîne-toi sur mon registre-des-sorts.log, ici même :\n\n" +
			"  grep \"sort=feu\" registre-des-sorts.log          les lignes qui contiennent ce texte\n" +
			"  grep -w \"feu\" registre-des-sorts.log            le mot entier : « feux » et « couvrefeu » tombent du tamis\n" +
			"  grep -E \"sort=(feu|glace)\" registre-des-sorts.log   runes étendues : | pour « ou », ( ) pour grouper\n" +
			"  grep -E \"^2025-03-04\" registre-des-sorts.log    ^ : au début de la ligne ;  $ : à la fin\n" +
			"  grep -o \"eleve=[a-z]*\" registre-des-sorts.log   seulement le morceau qui correspond, pas la ligne\n" +
			"  ... | sort -u                                     trié, et chaque valeur une seule fois\n" +
			"  [0-9]+ ou [[:digit:]]+                           un ou plusieurs chiffres\n\n" +
			"Le piège de tous les débutants : dans une rune, le point veut dire « n'importe quel caractère ». 10.0 attrape aussi 1000. Pour un vrai point, on écrit \\. »"; },
		mission: function(){ return "« Ta mission, sur le serveur (ssh archives). Le journal d'accès, /var/log/acces.log, mélange les visites des élèves et celles de la Nuée. " +
			"La Nuée arrive toujours de la même plage d'adresses : " + PLAGE_NUEE + "x.y. Garde ses lignes, toutes et rien qu'elles, dans ~/academie/traces.log. " +
			"Ensuite, ses visages : ses adresses, triées, chacune une seule fois, dans ~/academie/ioc.txt. »"; },
		entre: function(){ return "Henry hoche la tête devant ton traces.log. « Les lignes, tu les as. Maintenant, les visages : chaque adresse de la Nuée, une seule fois, triée, dans ~/academie/ioc.txt. Le tamis garde des lignes ; il te faut un tamis qui garde des morceaux de ligne. »"; },
		erreur: function(){
			var t = lireAcademie("traces.log");
			if (t !== null && !aFait("d_runes_traces")){
				var l = lignesPropres(t);
				if (l.some(function(x){ return x.indexOf(PLAGE_NUEE) === -1; })) return "Henry fronce les sourcils. « Ton traces.log garde des lignes d'élèves : ton tamis a des trous. Cherche ce qui est commun à TOUTES les lignes de la Nuée, et à elles seules. »";
				if (l.length < tracesAttendues().length) return "« Il manque des lignes à ton traces.log. Ta rune est trop étroite : tu as peut-être visé une seule adresse au lieu de toute la plage. »";
			}
			var i = lireAcademie("ioc.txt");
			if (i !== null && aFait("d_runes_traces") && !aFait("d_runes_ioc")){
				var li = lignesPropres(i);
				if (li.some(function(x){ return /\s/.test(x.trim()); })) return "« Ton ioc.txt contient des lignes entières. Il ne faut que les adresses : grep -o ne garde que le morceau qui correspond. »";
				if (li.length !== memeEnsembleTaille(li)) return "« Une même adresse y figure plusieurs fois. Le tamis ne dédoublonne pas : c'est le travail de sort -u. »";
				return "« Compte tes visages : il en manque, ou il y en a de trop. Ta rune attrape-t-elle bien les deux derniers nombres de chaque adresse ? »";
			}
			return null;
		},
		fin: function(){ return "Henry souffle sur les runes, qui s'éteignent une à une. « " + IP_NUEE.length + " visages, " + tracesAttendues().length + " passages. Grace les a déjà transmis aux autres écoles.\n\n" +
			"Ma première nuit d'astreinte, j'ai cherché 10.0.0.1 sans échapper les points. Le tamis m'a rendu quatre cents lignes, dont celles de la machine à café. Depuis, j'échappe tout, même quand je suis pressé. Surtout quand je suis pressé. »"; }
	},
	divination: {
		nom: "Alfred", item: Alfred, etapes: ["d_awk_volume", "d_awk_victimes"], ecole: "divination",
		metier: "Le métier : le volume exfiltré, c'est le premier chiffre que demande la direction. Il décide de la gravité de l'incident, et de qui il faut prévenir.",
		entree: function(){ return "Alfred fait tourner un prisme de cristal au-dessus d'un registre. La lumière qui le traverse se découpe en colonnes sur la table, et il les lit à voix basse, comme on lit les lignes de la main."; },
		metaphore: function(){ return "« awk lit l'avenir dans les colonnes. Chaque ligne passe dans le prisme et se découpe en champs : $1, $2, $3... et $NF, le dernier. " +
			"Tu poses une question à chaque ligne (une condition), tu fais un geste quand elle répond oui (une action entre accolades), et à la fin, dans END, le prisme te donne la réponse. »"; },
		syntaxe: function(){ return "« Mon registre des potions, potions.txt : nom, école, prix, stock.\n\n" +
			"  awk '{ print $1, $4 }' potions.txt                         le nom et le stock\n" +
			"  awk '$2 == \"runes\" { print $1 }' potions.txt              seulement les potions de l'école des runes\n" +
			"  awk '$1 ~ /^elixir/ { print $3 }' potions.txt              ~ : la colonne correspond à une rune\n" +
			"  awk '{ s += $4 } END { print s }' potions.txt              la somme du stock\n" +
			"  awk '{ t[$2] += $4 } END { for (e in t) print e, t[e] }' potions.txt   un total PAR école (un tableau)\n" +
			"  ... | sort -k2,2nr | head -3                               trié sur la 2e colonne, en nombres, du plus grand au plus petit, les trois premiers\n" +
			"  awk -F, '{ print $2 }' eleves.csv                          -F, : les colonnes sont séparées par des virgules »"; },
		mission: function(){ return "« Sur archives, le journal du proxy, /var/log/proxy.log, a cinq colonnes : heure, ip_source, ip_dest, octets, url. " +
			"Combien d'octets sont partis VERS la Nuée cette nuit ? Le total, dans ~/academie/volume.txt. " +
			"Puis les trois machines de l'école qui lui ont le plus envoyé, de la plus bavarde à la moins bavarde, une par ligne, son adresse en premier, dans ~/academie/victimes.txt. »"; },
		entre: function(){ return "Alfred note ton chiffre dans la marge du registre. « Le poids de la fuite, tu l'as. Maintenant, les sources : un total par machine de l'école, vers la Nuée seulement, puis le podium. Grace confinera d'abord ces trois-là. »"; },
		erreur: function(){
			var v = lireAcademie("volume.txt");
			if (v !== null && !aFait("d_awk_volume")){
				var m = /-?\d+/.exec(v), n = m ? parseInt(m[0], 10) : null;
				if (n === TOTAL_PROXY) return "Alfred plisse les yeux. « Tu as pesé TOUT le trafic de la nuit, mises à jour comprises. La question ne porte que sur ce qui part vers la Nuée : pose-la à la bonne colonne. »";
				if (n === 0) return "« Zéro ? Tu as interrogé la colonne des sources. La Nuée est en destination. »";
				return "« Ton total ne tombe pas juste. Relis les colonnes : les octets sont en 4e position, la destination en 3e. »";
			}
			var w = lireAcademie("victimes.txt");
			if (w !== null && aFait("d_awk_volume") && !aFait("d_awk_victimes")){
				var premiers = lignesPropres(w).slice(0, 3).map(function(l){ return l.trim().split(/\s+/)[0]; });
				if (memeEnsemble(premiers, TOP3_VICTIMES)) return "« Les bonnes machines, mais pas dans le bon ordre. sort -n trie du plus petit au plus grand ; r renverse ; et -k2,2 dit quelle colonne compter. »";
				return "« Ce ne sont pas les plus bavardes. Fais un total PAR source avant de trier, et ne compte que ce qui va vers la Nuée. »";
			}
			return null;
		},
		fin: function(){ return "Alfred range son prisme dans un étui de velours. « " + VOLUME_TOTAL + " octets, environ " + volumeMo() + " Mo. Grace a de quoi décider.\n\n" +
			"Un soir, un collègue a annoncé quarante gigaoctets volés à la direction. C'était quarante mégaoctets : le journal comptait en kilo-octets, il les avait pris pour des mégaoctets. La direction a réveillé un avocat pour rien. Depuis, je relis l'unité avant de parler. »"; }
	},
	transmutation: {
		nom: "Lee", item: Lee, etapes: ["d_sed_anonymiser", "d_sed_desarmer"], ecole: "transmutation",
		metier: "Le métier : la CNIL donne 72 heures pour notifier une fuite de données personnelles. Et on ne lui envoie que le strict nécessaire : c'est la minimisation, un principe du RGPD.",
		entree: function(){ return "Lee trempe une plume dans un encrier qui fume. Quand elle écrit, les mots de la page se changent sous ses yeux, ligne après ligne, sans une rature."; },
		metaphore: function(){ return "« sed, c'est la transmutation ligne par ligne. Chaque ligne entre dans l'alambic, subit la formule, et ressort changée. " +
			"Le fichier d'origine ne bouge pas : sed te montre le résultat. Sauf si tu ordonnes -i : alors la transmutation est gravée dans le fichier. »"; },
		syntaxe: function(){ return "« Exerce-toi sur mon carnet, recettes.txt :\n\n" +
			"  sed 's/sauge/romarin/' recettes.txt                 la première « sauge » de chaque ligne devient « romarin »\n" +
			"  sed 's/e/E/g' recettes.txt                          g : toutes les occurrences, pas seulement la première\n" +
			"  sed -E 's/[0-9]{2}\\/[0-9]{4}/MM\\/AAAA/g' recettes.txt   -E : runes étendues ; {2} deux fois ; \\/ un vrai /\n" +
			"  sed -E 's/([a-z]+), ([a-z]+)/\\2, \\1/' recettes.txt    ( ) capture, \\1 et \\2 recopient ce qui a été capturé\n" +
			"  sed '/^Etape 4/d' recettes.txt                      d : supprime les lignes qui correspondent\n" +
			"  sed -e 'FORMULE1' -e 'FORMULE2' recettes.txt        deux formules, en un seul passage\n" +
			"  sed -i.bak 's/ *$//' COPIE                          -i : grave dans le fichier ; .bak : garde l'original à côté\n\n" +
			"Mon conseil : d'abord sans -i, tu regardes, puis tu graves. »"; },
		mission: function(){ return "« Deux travaux, sur archives.\n\n" +
			"L'export brut de l'antivirus, /srv/edr/export-brut.txt, contient des mails et des numéros d'étudiant. Avant de l'envoyer à la CNIL, on le minimise : " +
			"chaque mail devient [mail], chaque numéro devient ETU-XXXX, et rien d'autre ne bouge. Le résultat dans ~/academie/export-cnil.txt.\n\n" +
			"Ensuite, /etc/archives.conf : la Nuée y a ajouté une ligne qui lance son programme au démarrage, et ouvert un réglage qui devait rester fermé. " +
			"Retire l'une, referme l'autre, sans abîmer le reste du fichier. »"; },
		entre: function(){ return "Lee souffle sur l'encre de ton export. « Propre : la CNIL n'apprendra que ce qu'elle doit savoir. Reste /etc/archives.conf, sur archives : une ligne de trop, un réglage ouvert. Grave la correction dans le fichier, et rien d'autre. Il appartient à root. »"; },
		erreur: function(){
			var x = lireAcademie("export-cnil.txt");
			if (x !== null && !aFait("d_sed_anonymiser")){
				if (/@/.test(x)) return "Lee tapote une ligne. « Il reste des mails. Ta rune doit couvrir tout le nom avant l'arobase, points compris (alice.martin). »";
				if (/\d{6,}/.test(x)) return "« Les mails sont voilés, mais les numéros d'étudiant sont encore en clair. »";
				return "« Tu as transmuté plus que demandé : la première ligne et les groupes doivent rester intacts. »";
			}
			if (aFait("d_sed_anonymiser") && !aFait("d_sed_desarmer")){
				var c = ConfArchives.getText();
				var sain = lignesPropres(CONF_ARCHIVES_SAINE).filter(function(l){ return !/autorise_tout/.test(l); });
				if (sain.some(function(l){ return c.indexOf(l) === -1; })) return "« Tu as emporté une ligne saine du fichier ! Remets-la à la main : chemin, sauvegarde, retention_jours. La prochaine fois, -i.bak. »";
				if (!/exec_hook/.test(c) && /autorise_tout = oui/.test(c)) return "« La ligne de la Nuée est partie, mais le réglage est resté ouvert. »";
				if (/exec_hook/.test(c) && /autorise_tout = non/.test(c)) return "« Le réglage est refermé, mais la ligne de la Nuée est toujours là. »";
			}
			return null;
		},
		fin: function(){ return "Lee essuie sa plume. « Un export minimisé, une configuration désarmée. Tu as la main sûre.\n\n" +
			"Un jour, j'ai lancé un sed -i sur tout un dossier de configurations, sans l'essayer avant. Une rune un peu trop large, et soixante serveurs ont perdu leur port SSH en même temps. " +
			"On a passé la nuit à les reprendre un par un. Depuis : d'abord sans -i, puis -i.bak. Toujours. »"; }
	},
	grimoires: {
		nom: "Stephen", item: Stephen, etapes: ["d_jq_alertes", "d_jq_rapport"], ecole: "grimoires",
		metier: "Le métier : un EDR, l'antivirus des serveurs, crache des milliers d'alertes JSON par nuit. L'analyste qui sait filtrer passe sa nuit sur les critiques ; les autres se noient dans le bruit.",
		entree: function(){ return "Stephen descend d'une échelle de bibliothèque, un grimoire relié de cuir sous le bras. Il l'ouvre sur le pupitre : les pages s'emboîtent les unes dans les autres comme les branches d'un arbre."; },
		metaphore: function(){ return "« Un JSON est un grimoire relié en arbre. Le tronc, c'est l'objet entre { }. Ses branches portent des noms : les clés. Certaines branches sont des rayonnages [ ] remplis d'autres objets. " +
			"jq marche dans l'arbre : le point, c'est « ici » ; .nom descend dans une branche ; [] parcourt un rayonnage ; et | passe ce que tu tiens au geste suivant. »"; },
		syntaxe: function(){ return "« Le catalogue de ma bibliothèque, bibliotheque.json :\n\n" +
			"  jq '.' bibliotheque.json                                      tout le grimoire, bien présenté\n" +
			"  jq '.bibliotheque' bibliotheque.json                          une feuille : la valeur d'une clé\n" +
			"  jq '.ouvrages[] | .titre' bibliotheque.json                   chaque ouvrage du rayonnage, puis son titre\n" +
			"  jq -r '.ouvrages[] | .titre' bibliotheque.json                -r : le texte brut, sans guillemets\n" +
			"  jq -r '.ouvrages[] | select(.emprunte == true) | .titre' ...  select ne laisse passer que ce qui répond oui\n" +
			"  jq '.ouvrages | length' ;  jq '.ouvrages[0] | keys'           compter ; lister les clés\n" +
			"  jq -r '.ouvrages | group_by(.ecole)[] | [.[0].ecole, length] | @csv' ...   des paquets par école, et un CSV : école, nombre\n\n" +
			"Regarde bien la forme du grimoire avant de marcher dedans : ici, le rayonnage est sous la clé ouvrages. Ailleurs, le grimoire peut être un rayonnage tout entier. »"; },
		mission: function(){ return "« Sur archives, l'export de l'antivirus est un grimoire : /srv/edr/alertes.json, un rayonnage d'alertes (machine, gravite, regle). Grace veut deux pages.\n\n" +
			"D'abord les machines qui ont au moins une alerte critique : chacune une seule fois, triées, dans ~/academie/machines.txt.\n" +
			"Ensuite un CSV « machine, nombre d'alertes », une ligne par machine, dans ~/academie/alertes.csv. »"; },
		entre: function(){ return "Stephen corne une page. « Les critiques, tu les as. Pour le rapport de quart, Grace veut toutes les machines, avec leur nombre d'alertes, toutes gravités confondues. Un paquet par machine, puis tu comptes. »"; },
		erreur: function(){
			var m = lireAcademie("machines.txt");
			if (m !== null && !aFait("d_jq_alertes")){
				var l = lignesPropres(m);
				if (l.some(function(x){ return /"/.test(x); })) return "Stephen sourit. « Des guillemets autour des noms : -r les enlève. »";
				if (l.length !== memeEnsembleTaille(l)) return "« Une machine apparaît plusieurs fois : elle a plusieurs alertes critiques. sort -u. »";
				return "« Tu as gardé des machines sans alerte critique, ou perdu des critiques. Ton select laisse-t-il passer la bonne gravité ? »";
			}
			var c = lireAcademie("alertes.csv");
			if (c !== null && aFait("d_jq_alertes") && !aFait("d_jq_rapport")) return "« Ton CSV ne tombe pas juste. Une ligne par machine, avec TOUTES ses alertes. group_by fait les paquets, length les compte. »";
			return null;
		},
		fin: function(){ return "Stephen referme le grimoire sans bruit. « Ton rapport est parti avec la relève.\n\n" +
			"Ma première semaine en SOC, j'ai lu les alertes une par une, à l'œil. Trois mille. Le lendemain matin, la cheffe m'a montré jq : trois secondes. " +
			"J'ai failli pleurer. Puis j'ai écrit mes propres filtres, et je n'ai plus jamais lu une alerte inutile. »"; }
	},
	alchimie: {
		nom: "Doug", item: Doug, etapes: ["d_alchimie_fantomes", "d_alchimie_quarantaine"], ecole: "alchimie",
		metier: "Le métier : on verrouille d'abord, on supprime après l'enquête. Un compte supprimé, c'est une preuve qui disparaît. Et la quarantaine plutôt que rm : l'analyse se fera plus tard, au calme.",
		entree: function(){ return "Doug tourne un robinet de cuivre : un liquide vert coule d'un alambic à l'autre, puis au suivant, sans jamais toucher le sol. Il ne lâche pas le robinet en te parlant."; },
		metaphore: function(){ return "« L'alchimie, c'est l'art des chaînes. Un sort seul fait peu de chose ; reliés par des tuyaux (|), ils font tout. " +
			"xargs est le plus étrange de mes alambics : il change un flot de mots en ARGUMENTS pour un autre sort. comm, join et paste comparent et assemblent deux registres. " +
			"Et find retrouve tout ce qui partage une propriété : un nom, une taille, un propriétaire. »"; },
		syntaxe: function(){ return "« Sur mes registres d'ici, et dans la Reserve :\n\n" +
			"  cut -d, -f1 ../Divination/eleves.csv | sort       une colonne d'un CSV, triée\n" +
			"  comm -23 A B                                     les lignes de A absentes de B (A et B TRIÉS)\n" +
			"  comm -12 A B                                     les lignes communes\n" +
			"  cat ingredients.txt | xargs -I {} echo \"fiole : {}\"   xargs : un sort lancé pour chaque élément\n" +
			"  find Reserve -name \"*.txt\"                       trouver par le nom ;  -user NOM : par propriétaire\n" +
			"  find Reserve -empty -exec ls -l {} \\;            -exec : un sort pour chaque trouvaille ({} : la trouvaille)\n" +
			"  paste A B ;  join A B ;  column -t ;  nl ;  fold -w 40 ;  shuf    coller, réunir, aligner, numéroter, plier, mélanger\n\n" +
			"Retiens bien : find voit aussi les fichiers dont le nom commence par un point. ls, sans -a, non. »"; },
		mission: function(){ return "« Deux chasses, sur archives.\n\n" +
			"Les comptes fantômes : la Nuée s'est créé des comptes. Compare les comptes du système (/etc/passwd) au registre du personnel (/srv/personnel.csv). " +
			"La liste des intrus dans ~/academie/fantomes.txt, puis verrouille-les tous.\n\n" +
			"La quarantaine : tous les fichiers que la Nuée a déposés cette nuit (ils appartiennent à un propriétaire à part) vont dans /quarantaine. Sans en oublier un, sans en détruire un. »"; },
		entre: function(){ return "Doug ferme un robinet. « Les fantômes sont sous clé. Maintenant, ce que la Nuée a semé : ses fichiers ont tous le même propriétaire. Ratisse /srv et /tmp, et range tout en /quarantaine. »"; },
		erreur: function(){
			if (!aFait("d_alchimie_fantomes")){
				var f = lireAcademie("fantomes.txt");
				if (f === null) return null;
				var l = lignesPropres(f);
				if (memeEnsemble(l, COMPTES_FANTOMES.slice())) return "Doug hoche la tête. « Ta liste est juste. Mais un fantôme sur une liste peut encore entrer : verrouille-les, un par un ou d'un seul geste avec xargs. »";
				if (l.some(function(x){ return STAFF.indexOf(x) > -1 || SYSTEME.indexOf(x) > -1; })) return "« Tu accuses des collègues ! comm ne compare juste que des listes TRIÉES, et des colonnes de même forme. »";
				return "« Ta liste ne tombe pas juste. Ne garde que les noms : une colonne de chaque côté. »";
			}
			if (!aFait("d_alchimie_quarantaine")){
				var la = FICHIERS_NUEE.filter(function(n){ return QuarantaineArchives.getItemFromName(n) !== -1; });
				if (!la.length) return null;
				if (la.indexOf(".trace-nuee") === -1) return "« Il en manque un, et il se cache : son nom commence par un point. find le voit ; ls sans -a, non. »";
				if (la.indexOf("lot-exfiltre.txt") === -1) return "« Tu as fouillé /srv, mais la Nuée a aussi semé dans /tmp. »";
			}
			return null;
		},
		fin: function(){ return "Doug laisse enfin le robinet. « Fantômes sous clé, semences en cage. Propre.\n\n" +
			"Un collègue a supprimé à chaud un compte suspect, une nuit comme celle-ci. Le lendemain, la police a demandé quand il avait été créé, et par qui : il n'en restait rien. " +
			"On verrouille, on note, on supprime après. »"; }
	},
	chronomancie: {
		nom: "Paul", item: Paul, etapes: ["d_chrono_bombe", "d_chrono_sauvegarde"], ecole: "chronomancie",
		metier: "Le métier : une crontab oubliée est la persistance la plus banale qui soit. Les attaquants en posent toujours plusieurs, en comptant qu'on s'arrête à la première.",
		entree: function(){ return "Paul retourne un sablier, puis un autre, puis un troisième. Il les écoute couler, la tête penchée, comme on écoute respirer quelqu'un. « Il est " + heureDeLaNuit() + ". Ne perdons pas de temps. »"; },
		metaphore: function(){ return "« Le temps a trois serrures sous Linux. at : un sablier unique, qui tombe une fois. cron : une roue qui tourne chaque jour, chaque heure, à jamais. " +
			"Les timers de systemd : une horloge de clocher, avec un nom, un service, et un registre. Un sort programmé ne fait aucun bruit jusqu'à ce qu'il sonne. La Chronomancie, c'est savoir LIRE les trois avant. »"; },
		syntaxe: function(){ return "« Les roues de l'aile sont dans horaires-des-sabliers.txt. La forme d'une ligne : minute heure jour mois jour-de-semaine commande.\n\n" +
			"  0 6 * * *      ...     tous les jours à 6 h 00\n" +
			"  */15 * * * *   ...     toutes les 15 minutes\n" +
			"  0 18 * * 5     ...     le vendredi à 18 h\n\n" +
			"  echo \"arroser-mandragores\" | at 23:00     un sablier : une seule fois, à 23 h\n" +
			"  atq ;  sudo atq                          les sabliers en attente (les tiens ; ceux de tout le monde)\n" +
			"  atrm N                                   briser le sablier numéro N\n" +
			"  crontab -l ;  sudo crontab -u NOM -l     ta roue ; la roue d'un autre compte\n" +
			"  crontab -e ;  crontab -r                 l'éditer ; la vider\n" +
			"  systemctl list-timers --all              les horloges de clocher, même arrêtées\n" +
			"  sudo systemctl disable --now NOM.timer   l'arrêter maintenant ET l'empêcher de revenir au démarrage\n\n" +
			"Une colle, pour la route : à quelle heure tourne « 45 4 * * * » ? Réponds-moi ici, avec echo, sous la forme HH:MM. »"; },
		mission: function(){ return "« La bombe de la Nuée vise minuit, et elle a TROIS déclencheurs sur archives : une horloge de clocher au nom anodin, un sablier de secours, et une ligne dans la roue d'un compte fantôme. " +
			"Neutralise les trois : un seul oublié, et minuit sonne.\n\n" +
			"Ensuite, la vraie sauvegarde nocturne de l'école, /usr/local/bin/sauvegarde.sh : programme-la pour qu'elle tourne chaque nuit à 2 h 30. »"; },
		entre: function(){ return "Paul couche les trois sabliers sur la table. « Plus rien ne sonnera à minuit. Maintenant, construis : la sauvegarde nocturne, chaque nuit à 2 h 30. Une ligne dans ta roue suffit. »"; },
		erreur: function(){
			var c = etatCh4();
			if (c.bombeSonnee && !aFait("d_chrono_bombe")) return "Paul pose la main sur un sablier vide. « Minuit a sonné. Ce n'est pas la fin : désamorce quand même, sinon ça recommencera demain, et va voir Andrew pour restaurer. »";
			if (!aFait("d_chrono_bombe")){
				var t = timerBombe(), e = t ? etatTimer("archives", t) : null;
				var reste = [];
				if (e && e.actif) reste.push("l'horloge de clocher tourne encore");
				else if (e && e.enabled) reste.push("l'horloge est arrêtée, mais encore activée : au prochain démarrage, elle reviendra");
				if (etatArcanes().at.taches.some(function(x){ return x.bombe; })) reste.push("un sablier de secours attend toujours (seul root voit les sabliers des autres)");
				if ((state.cron[FANTOME_CRON] || []).some(function(l){ return /nuee|chiffr/i.test(l); })) reste.push("la roue d'un fantôme tourne encore");
				if (reste.length && reste.length < 3) return "« Bien commencé. Mais " + reste.join(" ; ") + ". »";
				return null;
			}
			if (!aFait("d_chrono_sauvegarde")){
				var mien = (state.cron[JOUEUR] || []).concat(state.cron["root"] || []).filter(function(l){ return /sauvegarde\.sh/.test(l); });
				if (mien.length) return "« Ta ligne lance bien la sauvegarde, mais pas à 2 h 30. Relis l'ordre des champs : la minute d'abord, puis l'heure. »";
			}
			return null;
		},
		fin: function(){ return "Paul remet ses sabliers debout, un par un. « Trois serrures fermées, une roue honnête qui tourne. La nuit est à nous.\n\n" +
			"Il y a des années, j'ai désamorcé une tâche at à 23 h 58. J'étais fier. J'avais oublié la crontab. Minuit a sonné quand même. Depuis, je compte toujours jusqu'à trois. »"; }
	},
	archives: {
		nom: "Andrew", item: Andrew, etapes: ["d_archives_restaurer", "d_archives_patch"], ecole: "archives",
		metier: "Le métier : une sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde. Ce soir, tu fais pour de vrai le test que la plupart des écoles ne font jamais. Et la règle 3-2-1 : trois copies, deux supports, une hors ligne.",
		entree: function(){ return "Andrew essuie un grand miroir avec sa manche. Derrière lui, sur un mannequin de couture, une page de texte attend, épinglée, une aiguille plantée en plein milieu."; },
		metaphore: function(){ return "« Deux outils, deux gestes. Le Miroir, rsync : il rend un dossier identique à un autre, fichier par fichier, droits et dates compris. Avec --delete, il efface même ce qui n'existe pas dans le modèle. " +
			"L'Aiguille, patch : elle recoud un texte à partir d'un patron, le diff, qui dit quelles lignes retirer (-) et lesquelles ajouter (+). »"; },
		syntaxe: function(){ return "« Sur les Parchemins et ma formule :\n\n" +
			"  rsync -a Parchemins/ ~/copie/                    copie fidèle ; la barre finale veut dire « le contenu de »\n" +
			"  rsync -an --delete Parchemins/ ~/copie/          -n : à blanc ; il dit ce qu'il ferait, sans rien faire\n" +
			"  rsync -a --exclude \"*.tmp\" SOURCE/ CIBLE/        sans les brouillons\n" +
			"  diff -u formule.txt formule-v2.txt               le patron : --- l'ancien, +++ le nouveau, @@ l'endroit\n" +
			"  patch --dry-run formule.txt amelioration.diff    essayer la couture sans piquer\n" +
			"  patch FICHIER CORRECTIF ;  patch -R ...          coudre ; découdre\n" +
			"  tar -czf chants.tar.gz FICHIERS ;  tar -tzf ...  une archive compressée ; son contenu\n" +
			"  tac ;  split -l 10                               lire à l'envers ; découper en morceaux de 10 lignes »"; },
		mission: function(){ return "« La Nuée a trafiqué les archives de l'école, /srv/archives. La sauvegarde hors ligne, /srv/sauvegarde-hors-ligne, débranchée du réseau, est restée intacte. " +
			"Rends les archives identiques à la sauvegarde : rien de plus, rien de moins.\n\n" +
			"Ensuite, Grace t'a envoyé un correctif, correctif.diff, dans ta Maison. Il recoud le script par où la Nuée est entrée, /usr/local/bin/depot.sh. Applique-le. »"; },
		entre: function(){ return "Andrew tend le miroir vers toi : les archives s'y reflètent, identiques à la sauvegarde. « Bien. Maintenant, la porte d'entrée : le correctif de Grace attend dans ta Maison. Une couture, sur le script de dépôt, en root. »"; },
		erreur: function(){
			if (!aFait("d_archives_restaurer")){
				if (ArchivesData.getChildFromName("sauvegarde-hors-ligne") !== -1) return "Andrew soupire. « Tu as copié le dossier DANS les archives, au lieu de son contenu. La barre finale de la source compte. »";
				var noms = ArchivesData.itemStringArray(), modele = ArchivesSauvegarde.itemStringArray();
				if (modele.every(function(n){ return noms.indexOf(n) > -1; }) && noms.some(function(n){ return modele.indexOf(n) === -1; }) &&
					modele.every(function(n){ return sansFinDeLigne(ArchivesData.getItemFromName(n).getText()) === sansFinDeLigne(ArchivesSauvegarde.getItemFromName(n).getText()); }))
					return "« Le miroir a copié, mais il n'a rien effacé : il reste des fichiers qui n'existent pas dans la sauvegarde. »";
				return null;
			}
			if (!aFait("d_archives_patch") && ArchivesUsrLocalBin.getItemFromName("depot.sh.rej") !== -1) return "« La couture a raté : un depot.sh.rej est apparu. Es-tu bien dans le dossier du script, et le correctif est-il intact ? »";
			return null;
		},
		fin: function(){ return "Andrew range l'aiguille dans un étui. « Archives restaurées, porte recousue.\n\n" +
			"Une école voisine payait ses sauvegardes depuis cinq ans. Le jour du rançongiciel, elles étaient vides : personne n'avait jamais essayé de restaurer. " +
			"Depuis, chaque trimestre, je restaure une archive au hasard. Pour voir. »"; }
	},
	invocation: {
		nom: "Brian", item: Brian, etapes: ["d_script_nettoyage", "d_script_arguments"], ecole: "invocation",
		metier: "Le métier : ce que tu fais deux fois à la main, tu l'automatises. À trois heures du matin, en astreinte, le script ne se trompe pas de dossier ; toi, si.",
		entree: function(){ return "Brian écrit à la craie sur un pupitre noir. Quand il a fini, il souffle sur la craie : les lignes se mettent à bouger toutes seules, l'une après l'autre, de haut en bas."; },
		metaphore: function(){ return "« Un script, c'est un sort que TU écris : une suite d'ordres que bash exécute de haut en bas, sans fatigue et sans distraction. " +
			"Une fonction, c'est un sort nommé que tu rappelles quand tu veux. Une boucle, c'est le même geste répété sur chaque élément. Une condition, c'est un garde qui demande « est-ce bien vrai ? » avant d'agir. »"; },
		syntaxe: function(){ return "« Lis mon salut.sh, ici : il salue chaque élève d'une liste. Les briques :\n\n" +
			"  #!/bin/bash ;  set -e                    l'interprète ; s'arrêter au premier pépin\n" +
			"  saluer() { echo \"Bonjour $1\"; }          une fonction ; $1 : son premier argument, $2 le deuxième\n" +
			"  for e in ambre basile; do ... done       une boucle sur des mots ;  for f in \"$1\"/*.txt : sur des fichiers\n" +
			"  while read -r e; do ... done < LISTE     une boucle ligne par ligne\n" +
			"  if [ -e \"$f\" ]; then ... fi              une condition : -e existe, -z vide, -n non vide\n" +
			"  case \"$1\" in a) ... ;; *) ... ;; esac     un aiguillage\n" +
			"  n=$((n + 1)) ;  d=$(date +%H)            un calcul ; le résultat d'un sort dans une variable\n" +
			"  exit 1                                   échouer exprès (et le dire sur la sortie d'erreur)\n" +
			"  cat > sort.sh <<'FIN' ... FIN            écrire plusieurs lignes d'un coup (un here-document)\n" +
			"  chmod +x sort.sh ;  ./sort.sh ;  echo $?  rendre exécutable ; lancer ; lire le code de retour\n\n" +
			"Un détail qui piège tout le monde : dans un script, chaque ligne a ses propres droits. Si une ligne a besoin de root, elle porte son sudo. »"; },
		mission: function(){ return "« Le script de la Nuée sème des résidus *.nuee dans /srv/depots, sur archives, plus vite qu'on ne les ramasse à la main. " +
			"Écris ~/academie/nettoyage.sh : pour chaque fichier *.nuee d'un dossier, s'il existe, il le déplace dans /quarantaine et le compte. " +
			"Il te faut une fonction, une boucle et une condition ; le script doit tourner sans erreur sur archives.\n\n" +
			"Puis rends-le sûr : le dossier lui arrive en argument, sans argument il refuse de travailler (exit 1), et set -e en tête. »"; },
		entre: function(){ return "Brian relit ton script à voix haute. « Il marche. Maintenant, rends-le sûr : qu'il prenne le dossier en argument, qu'il refuse sans argument (avec un code qui n'est pas 0), et qu'il s'arrête au premier pépin. Lance-le une fois sans rien, puis avec /srv/depots. »"; },
		erreur: function(){
			var t = lireAcademie("nettoyage.sh");
			if (t === null) return null;
			if (!aFait("d_script_nettoyage")){
				var st = Interpreteur.structures(t), manque = [];
				if (st.indexOf("fonction") === -1) manque.push("une fonction");
				if (st.indexOf("for") === -1 && st.indexOf("while") === -1 && st.indexOf("until") === -1) manque.push("une boucle");
				if (st.indexOf("if") === -1) manque.push("une condition");
				if (manque.length) return "Brian pointe sa craie. « Il manque à ton script : " + manque.join(", ") + ". »";
				return "« Ton script a toutes ses briques. Lance-le sur archives, là où dorment les résidus, et vérifie qu'il finit sans erreur (echo $? juste après). Le déplacement vers /quarantaine demande root. »";
			}
			if (!aFait("d_script_arguments") && etatCh4().nettoyageArg && !etatCh4().nettoyageSansArg) return "« Lance-le une fois SANS argument : il doit refuser, avec un code de retour qui n'est pas 0. »";
			return null;
		},
		fin: function(){ return "Brian efface le tableau d'un revers de manche. « Ton premier vrai sort, et un sort prudent.\n\n" +
			"Mon premier script de ménage n'avait pas de garde-fou. Lancé sans argument, il a fait le ménage... à la racine. On a restauré depuis la sauvegarde, toute une nuit. " +
			"Depuis, mes scripts refusent de deviner. »"; }
	}
};
function memeEnsembleTaille(l){ var v = {}; l.forEach(function(x){ v[x] = 1; }); return Object.keys(v).length; }
var TOTAL_PROXY = lignesPropres(TEXTE_PROXY_LOG).reduce(function(s, l){ return s + (parseInt(l.split(" ")[3], 10) || 0); }, 0);

Object.keys(MAITRES_VIVANTS).forEach(function(cle){
	var m = MAITRES_VIVANTS[cle];
	texteVivant(m.item, function(){ return paroleDeMaitre(m); });
	m.item.revele.apply(m.item, idsDefis(cle));
});

/* Chaque maître a son portrait, chaque aile son décor (outils/dessiner_academie.py). */
[[Henry, "item_henry.gif"], [Alfred, "item_alfred.gif"], [Lee, "item_lee.gif"], [Stephen, "item_stephen.gif"],
 [Doug, "item_doug.gif"], [Paul, "item_paul.gif"], [Andrew, "item_andrew.gif"], [Brian, "item_brian.gif"]].forEach(function(x){ x[0].picturename = image(x[1]); });
[[Academie, "loc_academie.gif"], [AileRunes, "loc_aile_runes.gif"], [AileDivination, "loc_aile_divination.gif"],
 [AileTransmutation, "loc_aile_transmutation.gif"], [AileGrimoires, "loc_aile_grimoires.gif"], [AileAlchimie, "loc_aile_alchimie.gif"],
 [AileChronomancie, "loc_aile_chronomancie.gif"], [AileArchives, "loc_aile_archives.gif"], [AileInvocation, "loc_aile_invocation.gif"],
 [Reserve, "loc_aile_alchimie.gif"], [Parchemins, "loc_aile_archives.gif"]].forEach(function(x){ x[0].room_pic = image(x[1]); });

/* ------------------------------------------------------------------ */
/* Frances, Laurent, la radio et l'horloge                             */
/* ------------------------------------------------------------------ */

function nbEtapesCh4(){ return QUETES_CH4.filter(function(q){ return aFait(q.id); }).length; }

function texteDeFrances(){
	var c = etatCh4(), urgence = "";
	if (!bombeDesamorcee() && !c.bombeSonnee && minutesAvantMinuit() <= 60 && minutesAvantMinuit() > 0)
		urgence = "\n\nElle jette un œil à l'Horloge. « Il reste moins d'une heure. La bombe d'abord : Paul, aile Chronomancie. »";
	if (aFait("d_fin")) return "Frances a les yeux brillants, de fatigue ou d'autre chose.\n\n" +
		"« On l'a fait. Toi surtout. J'ai demandé à Laurent : je veux écrire, avec toi, une fiche pour les B1. « Comment se défendre contre les notes de Frances. » " +
		"Ça me fera du bien de les retourner contre elles-mêmes.\n\nEt l'an prochain, je veux être de l'autre côté de la radio, comme Grace. Pas pour chasser des gens : pour qu'il n'y ait plus de nuits comme celle-là. »";
	if (aFait("d_corbeau")) return "Frances regarde la liste des services, où nuee-regen est enfin arrêté.\n\n" +
		"« Leur script qui se relance tout seul, c'était ma persistance : je l'avais dessinée dans un coin de cahier, avec une flèche qui tourne en rond. Tu l'as coupée. " +
		"Il ne reste que le retour d'expérience. Écris tout, même ce qui ne s'est pas bien passé : c'est ça qui sert. »" + urgence;
	if (c.bombeSonnee) return "Frances est assise sur les marches, la tête dans les mains.\n\n" +
		"« Minuit a sonné. C'est ma faute, tout ça vient de mes notes... Non. Andrew dit qu'une sauvegarde hors ligne sert exactement à ça, et il a raison. " +
		"Allez, on restaure. Aile des Archives. Et on désamorce quand même, pour que ça ne recommence pas demain. »";
	if (aFait("d_chrono_bombe")) return "Frances relâche un souffle qu'elle retenait depuis le début de la nuit.\n\n" +
		"« Le timer, la tâche at, la crontab : c'était mon schéma, en trois exemplaires. J'avais écrit « ne jamais compter sur un seul déclencheur ». Ils ont bien lu. " +
		"Et toi, tu viens de défaire ce que j'avais imaginé. Ça fait du bien et du mal à la fois.\n\nContinue : l'aile des Archives, puis l'Invocation. »";
	if (aFait("d_runes_traces")) return "Frances feuillette un vieux cahier aux pages cornées : ses notes, celles qu'on lui a volées.\n\n" +
		"« Là, j'avais écrit : « cacher ses fichiers avec un point devant le nom, et dans /tmp, personne n'y regarde ». Doug va te montrer que find, lui, regarde partout. " +
		"Et là : « une tâche planifiée qui se fait passer pour une mise à jour ». Paul t'attend.\n\nJe connais leurs méthodes par cœur, puisque ce sont les miennes. Demande-moi, je te dirai où ils ont pu mettre les pieds. »" + urgence;
	if (aFait("d_frances")) return "Frances tourne en rond devant l'Horloge.\n\n" +
		"« Tu as lu leur avis. Ils se font appeler le Corbeau, avec MON nom, et ils signent avec mes méthodes. Je n'ai jamais rien cassé, moi. Eux, si.\n\n" +
		"Commence par mesurer : Henry, aile des Runes. Sans les traces, on ne sait même pas par où ils sont passés. »" + urgence;
	return "Frances est là, en B1 depuis la Crypte, et elle fulmine.\n\n" +
		"« Ils ont pris mon nom. Mes notes ont fuité sur un forum, et une bande de rançonneurs, la Nuée, s'en sert en se faisant appeler le Corbeau. " +
		"Le grep sur les journaux, la tâche planifiée, les fichiers cachés dans /tmp : je l'avais écrit pour m'amuser, en me croyant maligne. Ce soir, quelqu'un s'en sert pour de vrai.\n\n" +
		"Ma bombe à moi n'existait pas. La leur compte les minutes : elle chiffrera les archives à minuit.\n\n" +
		"Lis leur AVIS.txt, là. Ensuite, suis les maîtres aile par aile, et la radio de Grace. Je reste avec toi toute la nuit. »";
}
texteVivant(Frances, texteDeFrances);

var LaurentArcanes = new Item("Laurent", "", "item_mysteryman.gif").personnage().revele("s_d_avant_minuit", "s_d_sans_indice");
texteVivant(LaurentArcanes, function(){
	if (aFait("d_fin")) return "Laurent, le Mage, a posé ton retour d'expérience sur son pupitre. Il l'a annoté en vert.\n\n" +
		"« Mesurer, prévenir, éradiquer, restaurer, écrire. Tu as fait cette nuit le métier entier, celui qu'on enseigne ici. " +
		"Ton CertificatAvance t'attend dans ta Maison. Et le grimoire de l'Académie reste ouvert : les défis des maîtres ne s'envolent pas. »";
	return "Laurent, le Mage, est debout sur une estrade de pierre, une lanterne verte à la main.\n\n" +
		"« La Crypte t'a appris à chasser un intrus. Cette nuit, tu apprends le reste du métier : mesurer la fuite, prévenir qui doit l'être, éradiquer, restaurer, et écrire. " +
		"Huit maîtres, huit ailes, une par école de magie. Chacun t'apprend un geste sur ses propres registres ; à toi de le refaire sur le serveur archives.\n\n" +
		"Le retour d'expérience, à la fin, tu le déposes dans ma BoiteDeLaurent. Deux défis pour l'honneur : désarmer la bombe avant 23 h, et finir sans acheter un seul indice. " +
		"Tape grimoire quand tu veux voir où en sont les écoles. »";
});
Academie.addItem(LaurentArcanes);

/* La radio de Grace : le conseil de l'étape, une phrase du métier, et l'horloge qui presse. */
var METIER_RADIO = {
	d_frances: "Une note de rançon ne se paie pas et ne s'efface pas : c'est une preuve. On la garde, on la date, on prévient.",
	d_runes_traces: "Une réponse à incident suit toujours le même ordre : mesurer, contenir, éradiquer, restaurer, tirer les leçons. On commence par mesurer.",
	d_awk_victimes: "Les machines les plus bavardes, on les isole du réseau sans les éteindre : la mémoire vive garde des preuves.",
	d_sed_desarmer: "Un attaquant préfère modifier une configuration plutôt que déposer un programme : ça passe sous les radars. On compare toujours à la version connue.",
	d_jq_rapport: "Le rapport de quart passe à l'équipe suivante : ce qui n'est pas écrit n'a pas eu lieu.",
	d_alchimie_quarantaine: "On isole, on ne détruit pas : le code de la Nuée sera analysé plus tard, sur une copie.",
	d_chrono_sauvegarde: "La règle 3-2-1 : trois copies, sur deux supports, dont une hors ligne. C'est grâce à elle que tu pourras restaurer.",
	d_archives_patch: "Si on ne ferme pas la porte d'entrée, ils reviennent par la même la semaine suivante.",
	d_script_arguments: "Un script sans garde-fou peut faire plus de dégâts que l'attaquant.",
	d_corbeau: "Tant que la persistance tourne, nettoyer ne sert à rien : on coupe la source, puis on nettoie.",
	d_fin: "Le retour d'expérience se rédige à chaud, sans chercher de coupable. C'est lui qui rend l'école plus forte qu'hier."
};
function urgenceRadio(){
	var c = etatCh4();
	if (aFait("d_chrono_bombe") || bombeDesamorcee()) return "";
	if (c.bombeSonnee) return C.rouge("Minuit est passé, les archives sont chiffrées.") + " Pas de panique : la sauvegarde hors ligne est intacte. Restaure (Andrew), et désamorce quand même. ";
	var reste = minutesAvantMinuit();
	if (reste <= 30) return C.rouge("URGENT : minuit dans " + reste + " min !") + " Laisse tout le reste, la bombe d'abord : aile Chronomancie. ";
	if (reste <= 60) return C.jaune("Minuit dans " + reste + " min.") + " Si tu n'as pas encore désamorcé, c'est le moment : Paul, aile Chronomancie. ";
	if (reste <= 120) return "Il est " + heureDeLaNuit() + ". Garde un œil sur l'Horloge : la bombe vise minuit. ";
	return "";
}
texteRadioCh4 = function(){
	var q = QUETES_CH4.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : terminé. Les archives sont saines, la bombe désamorcée, les indicateurs partagés, la CNIL notifiée. " +
		"Le dossier part à la police. Beau travail, la recrue. Et merci à Frances : sans ses notes retournées, on aurait mis la nuit entière à comprendre. »";
	var conseil = CONSEILS_CH4[q.id] || "Je te suis.";
	var metier = METIER_RADIO[q.id] ? " " + METIER_RADIO[q.id] : "";
	return "La radio grésille. « Grace : " + urgenceRadio() + conseil + metier + " »";
};
texteVivant(RadioGrace, function(){ return texteRadioCh4(); });

texteVivant(Horloge, function(){ return texteHorloge(); });
/* Le certificat se lit toujours à jour (un défi réussi le tour même de la victoire y figure). */
texteVivant(CertificatAvance, function(){ return state.has("victoireCh4") ? state.texteDuCertificat5() : ""; });
Horloge.revele("s_d_avant_minuit");

/* ------------------------------------------------------------------ */
/* Le bestiaire de l'Académie                                          */
/* ------------------------------------------------------------------ */

var BestiaireArcanes = new Item("Bestiaire",
	"LE BESTIAIRE DE L'ACADÉMIE : l'image de la nuit, puis le vrai mot du métier.\n\n" +
	"La Nuée                      un groupe de rançongiciel (ransomware)\n" +
	"La bombe de minuit           une bombe logique : une tâche planifiée malveillante\n" +
	"L'horloge de clocher         un timer systemd\n" +
	"Le sablier de secours        une tâche at\n" +
	"La roue du fantôme           une ligne de crontab\n" +
	"Les fantômes                 des comptes créés sans autorisation\n" +
	"Les visages de la Nuée       les IOC, indicateurs de compromission\n" +
	"Le poids de la fuite         le volume exfiltré\n" +
	"Le voile de la CNIL          la minimisation des données (RGPD)\n" +
	"La cage de cuivre            la quarantaine\n" +
	"Le script qui se relance     la persistance (un service redémarré sans fin)\n" +
	"Le Miroir                    la restauration depuis une sauvegarde (rsync)\n" +
	"L'Aiguille                   le correctif (diff et patch)\n" +
	"Le sort écrit                le script bash d'automatisation\n" +
	"Le récit du matin            le retour d'expérience (REX)\n\n" +
	"Rien de ce que la Nuée a laissé ici ne fonctionne pour de vrai : ce sont des objets du jeu, inertes.",
	"item_historybook.gif");
Academie.addItem(BestiaireArcanes);

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts du chapitre                               */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH4 = {
	jq:       { nom: "la Loupe des Grimoires",  image: "Tu marches dans un grimoire relié en arbre, de branche en feuille." },
	xargs:    { nom: "l'Alambic des Arguments", image: "Un flot de mots devient une file d'arguments pour un autre sort." },
	paste:    { nom: "la Couture des Colonnes", image: "Deux registres, cousus côte à côte, ligne à ligne." },
	join:     { nom: "le Pont des Registres",   image: "Deux registres se rejoignent sur une clé qu'ils partagent." },
	comm:     { nom: "la Balance des Listes",   image: "Deux listes triées sur la balance : ce qui est d'un côté, de l'autre, des deux." },
	column:   { nom: "l'Équerre",               image: "Un tableau en désordre se range en colonnes droites." },
	nl:       { nom: "le Numéroteur",           image: "Chaque ligne reçoit son numéro, comme les pages d'un registre." },
	fold:     { nom: "le Pli du Parchemin",     image: "Une ligne trop longue se plie à la largeur voulue." },
	shuf:     { nom: "le Dé des Lignes",        image: "Les lignes roulent comme des dés et retombent dans le désordre." },
	at:       { nom: "le Sablier",              image: "Une tâche tombera une seule fois, à l'heure dite." },
	atq:      { nom: "la File des Sabliers",    image: "Tu vois les sabliers qui attendent de tomber." },
	atrm:     { nom: "le Sablier Brisé",        image: "Tu brises un sablier avant qu'il ne tombe." },
	tac:      { nom: "le Miroir à Rebours",     image: "Un registre se lit de la dernière ligne à la première." },
	split:    { nom: "la Lame du Relieur",      image: "Un gros registre se découpe en cahiers de taille égale." },
	patch:    { nom: "l'Aiguille",              image: "Tu recouds un texte d'après un patron : des lignes en moins, des lignes en plus." },
	rsync:    { nom: "le Miroir Fidèle",        image: "Un dossier devient le reflet exact d'un autre, fichier par fichier." },
	read:     { nom: "l'Oreille du Script",     image: "Ton script écoute une ligne et la garde dans une variable." },
	printf:   { nom: "la Plume Réglée",         image: "Tu écris exactement ce que tu veux, aligné au millimètre." },
	seq:      { nom: "le Chapelet",             image: "Une suite de nombres, grain après grain." },
	basename: { nom: "l'Étiquette",             image: "D'un long chemin, tu ne gardes que le nom du fichier." },
	dirname:  { nom: "le Chemin du Retour",     image: "D'un long chemin, tu ne gardes que le dossier." },
	expr:     { nom: "l'Abaque",                image: "Un petit calcul, à l'ancienne, perle par perle." },
	sleep:    { nom: "le Sommeil du Sort",      image: "Ton script s'endort quelques secondes, puis reprend." }
};
var NOM_RPG_AVANT_ACADEMIE = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 5 && SORTS_RPG_CH4[sort]) return SORTS_RPG_CH4[sort].nom;
	return NOM_RPG_AVANT_ACADEMIE(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre : un par étape (2 à 19), et le platine       */
/* ------------------------------------------------------------------ */

var TROPHEES_CH4 = {
	d_frances:              ["le Sceau de l'Avis", "Une note de rançon ne se paie pas et ne s'efface pas : c'est une preuve. On la garde, on la date, on prévient."],
	d_runes_traces:         ["la Rune du Tamis", "grep -E garde les lignes qui suivent un motif. Dans un motif, le point veut dire « n'importe quel caractère » : \\. pour un vrai point."],
	d_runes_ioc:            ["la Liste des Visages", "grep -o extrait juste ce qui correspond ; sort -u trie et dédoublonne. Les IOC se partagent avec les autres défenseurs."],
	d_awk_volume:           ["la Balance de Cristal", "awk additionne une colonne sous condition : '$3 ~ /motif/ { s += $4 } END { print s }'. Le volume exfiltré fait la gravité."],
	d_awk_victimes:         ["le Prisme des Sources", "Un tableau awk t[$2] += $4 fait un total par clé ; sort -k2,2nr | head -3 donne le podium."],
	d_sed_anonymiser:       ["le Voile de la CNIL", "sed -E 's/motif/remplacement/g' masque des données en série. On ne transmet que le nécessaire, et la CNIL attend la notification sous 72 heures."],
	d_sed_desarmer:         ["la Plume qui Désarme", "sed -i modifie un fichier sur place : /motif/d supprime une ligne, s/ancien/nouveau/ rétablit une valeur. -i.bak garde l'original."],
	d_jq_alertes:           ["la Loupe des Grimoires", "jq -r '.[] | select(.champ == \"valeur\") | .autre' filtre un export JSON ; -r enlève les guillemets."],
	d_jq_rapport:           ["le Registre Relié", "group_by regroupe, length compte, @csv met en forme : un rapport lisible par un tableur, en une ligne."],
	d_alchimie_fantomes:    ["le Filet à Fantômes", "comm -23 compare deux listes triées ; xargs lance une commande sur chaque élément. On verrouille (usermod -L) avant de supprimer."],
	d_alchimie_quarantaine: ["la Cage de Cuivre", "find -user retrouve les fichiers d'un propriétaire, cachés compris ; -exec mv les isole. La quarantaine garde la preuve."],
	d_chrono_bombe:         ["le Sablier Arrêté", "Une tâche malveillante se cache dans un timer systemd, une tâche at ou une crontab : systemctl list-timers, sudo atq, crontab -u -l. Les trois."],
	d_chrono_sauvegarde:    ["la Roue des Nuits", "Une ligne de crontab : minute heure jour mois jour-de-semaine commande. Et la règle 3-2-1 : trois copies, deux supports, une hors ligne."],
	d_archives_restaurer:   ["le Miroir Fidèle", "rsync -a --delete SOURCE/ CIBLE/ rend la cible identique à la source ; -n d'abord, pour voir. Une sauvegarde ne vaut que restaurée."],
	d_archives_patch:       ["l'Aiguille Recousue", "patch applique un diff unifié (diff -u le fabrique) ; --dry-run essaie, -R annule. On ferme la porte d'entrée."],
	d_script_nettoyage:     ["le Premier Sort Écrit", "Un script réunit fonction, boucle et condition ; chmod +x le rend exécutable. Ce qu'on fait deux fois à la main, on l'automatise."],
	d_script_arguments:     ["le Sort Garde-Fou", "\"$1\" est le premier argument ; exit 1 signale l'échec ; set -e arrête au premier pépin. Un script sûr refuse plutôt que de deviner."],
	d_corbeau:              ["la Dernière Plume", "Tant qu'un service relance l'intrus, nettoyer ne sert à rien : sudo systemctl disable --now coupe la source, puis on nettoie."]
};
var COMPETENCES_CH4 = {
	d_frances: "Note de rançon", d_runes_traces: "Recherche dans les journaux", d_runes_ioc: "Indicateurs de compromission",
	d_awk_volume: "Mesure d'une exfiltration", d_awk_victimes: "Agrégation par clé", d_sed_anonymiser: "Minimisation RGPD",
	d_sed_desarmer: "Configuration piégée", d_jq_alertes: "Filtrage JSON", d_jq_rapport: "Rapport CSV",
	d_alchimie_fantomes: "Comptes non autorisés", d_alchimie_quarantaine: "Quarantaine", d_chrono_bombe: "Tâches planifiées",
	d_chrono_sauvegarde: "Sauvegarde planifiée", d_archives_restaurer: "Restauration", d_archives_patch: "Correctif",
	d_script_nettoyage: "Script bash", d_script_arguments: "Script robuste", d_corbeau: "Persistance",
	platine_ch4: "Archimage de la réponse à incident"
};
Object.keys(COMPETENCES_CH4).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH4[id]; });
["d_runes_ioc", "d_awk_victimes", "d_sed_anonymiser", "d_sed_desarmer", "d_jq_rapport", "d_alchimie_fantomes",
 "d_alchimie_quarantaine", "d_archives_patch", "d_script_arguments"].forEach(function(id){ RANGS_DES_BADGES[id] = "argent"; });
["d_chrono_bombe", "d_archives_restaurer", "d_corbeau"].forEach(function(id){ RANGS_DES_BADGES[id] = "or"; });
RANGS_DES_BADGES.platine_ch4 = "platine";

var PLATINES_AVANT_ACADEMIE = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_ACADEMIE();
	if (state.has("ch4Ouvert") && !state.has("platine_ch4") && Object.keys(TROPHEES_CH4).every(function(id){ return state.quests[id]; })){
		state.set("platine_ch4");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch4) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* grimoire : le tableau de bord des huit écoles                       */
/* ------------------------------------------------------------------ */

var ECOLES = [
	{ cle: "runes", nom: "Runes", maitre: "Henry", aile: AileRunes },
	{ cle: "divination", nom: "Divination", maitre: "Alfred", aile: AileDivination },
	{ cle: "transmutation", nom: "Transmutation", maitre: "Lee", aile: AileTransmutation },
	{ cle: "grimoires", nom: "Grimoires", maitre: "Stephen", aile: AileGrimoires },
	{ cle: "alchimie", nom: "Alchimie", maitre: "Doug", aile: AileAlchimie },
	{ cle: "chronomancie", nom: "Chronomancie", maitre: "Paul", aile: AileChronomancie },
	{ cle: "archives", nom: "Archives", maitre: "Andrew", aile: AileArchives },
	{ cle: "invocation", nom: "Invocation", maitre: "Brian", aile: AileInvocation }
];

function texteGrimoire(){
	var c = etatCh4();
	var lignes = [C.gras("LE GRIMOIRE DE L'ACADÉMIE"), C.jaune("commande du jeu, pas Linux (man grimoire)"),
		C.gris("rouge : la Nuée y règne · vert : école reprise"), ""];
	var bombe = c.bombeSonnee ? C.rouge("a sonné : restaure les archives") : (bombeDesamorcee() ? C.vert("désamorcée") : C.rouge("armée, elle vise minuit"));
	lignes.push("  Il est " + C.gras(heureDeLaNuit()) + (c.bombeSonnee || bombeDesamorcee() ? "" : " · minuit dans " + Math.max(0, minutesAvantMinuit()) + " min"));
	lignes.push("  Bombe : " + bombe, "");
	ECOLES.forEach(function(e){
		var m = MAITRES_VIVANTS[e.cle];
		var faites = m.etapes.filter(aFait).length, defis = idsDefis(e.cle).filter(aFait).length;
		var ok = faites === m.etapes.length;
		lignes.push("  " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(e.nom, 14)) + completerDroite(e.maitre, 8) +
			(current_room === e.aile ? C.jaune("◀ toi") : ""));
		lignes.push("      " + (ok ? C.vert : C.gris)(faites + " sur " + m.etapes.length + " étapes") + C.gris(" · " + defis + " sur 6 défis"));
	});
	var t = Object.keys(TROPHEES_CH4).filter(aFait);
	lignes.push("", C.gras("BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH4).length) + C.gris("  (badges arcanes : les leçons)"));
	t.slice(-3).forEach(function(id){ lignes.push("  " + C.jaune("✦ ") + COMPETENCES[id]); });
	if (!t.length) lignes.push(C.gris("  Chaque étape franchie en rapporte un."));
	var nuit = idsDefis("nuit").filter(aFait).length;
	lignes.push("", C.gris("Défis de la nuit (Laurent) : " + nuit + " sur 2. Le Bestiaire du hall traduit chaque image en vrai mot."));
	return lignes.join("\n");
}
Shell.sorts.grimoire = function(args, io){
	if (!state.has("ch4Ouvert")) return "Le grimoire de l'Académie s'ouvre avec le chapitre 4, après la Crypte. " + C.gris("(Pendant la chasse au Corbeau, c'est traque.)");
	var texte = texteGrimoire();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le grimoire remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
if (SORTS_DU_JEU.indexOf("grimoire") === -1) SORTS_DU_JEU.push("grimoire");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["grimoire", "le tableau des huit écoles de l'Académie, l'heure et la bombe (chapitre 4)"]);
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.grimoire = "grimoire n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
	"Dans l'Académie des Arcanes (chapitre 4), il montre les huit écoles : en rouge celles où la Nuée règne encore,\n" +
	"en vert celles que tu as reprises (les deux étapes du maître faites), avec tes défis, l'heure de la nuit,\n" +
	"l'état de la bombe de minuit et tes derniers badges.\n\n  grimoire         le tableau de bord de l'Académie";

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, badges, radio                              */
/* ------------------------------------------------------------------ */

function verifierAcademie(){
	if (!academieActive()) return;
	var c = state.ch4;
	if (!c) return;
	// Une roue honnête, pour s'entraîner à lire la crontab d'un autre compte sans toucher à la preuve.
	if (!c.cronLegitime){
		c.cronLegitime = true;
		if (!state.cron["gestionnaire"]) state.cron["gestionnaire"] = ["0 7 * * 1-5 /usr/local/bin/rapport-hebdo.sh"];
	}
	// Les structures de la dernière ligne tapée, si elle a réussi (une seule fois par ligne).
	if (c.vuStructures !== state.nbCommandes){
		c.vuStructures = state.nbCommandes;
		var derniere = Shell.historique.length ? Shell.historique[Shell.historique.length - 1] : "";
		if (Shell.statut === 0 && derniere) structuresInvocation(Interpreteur.structures(derniere));
	}
	// Les défis qui se lisent dans le monde.
	DEFIS_ARCANES.forEach(function(d){ if (d.monde && !state.quests[d.id] && d.monde()) reussirDefi(d.id); });
	if (aFait("d_chrono_bombe") && c.heureDesamorcage === undefined) c.heureDesamorcage = c.horloge;
	if (c.heureDesamorcage !== undefined && c.heureDesamorcage < 180) reussirDefi("s_d_avant_minuit");
	if (aFait("d_fin") && !state.malus5) reussirDefi("s_d_sans_indice");
	// Un badge pour chaque étape franchie.
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH4).forEach(function(id){
		if (!state.quests[id] || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	// Grace donne l'étape suivante à la radio.
	var suivante = QUETES_CH4.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (aFait("d_entree") && c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "d_frances") say(C.gris("(Nouveau message de Grace : cat ~/Cybersup/SalleServeurs/Academie/Radio.)"));
	}
}
var VERIFIER_CH4_AVANT_ACADEMIE = verifierChapitre4;
verifierChapitre4 = function(){
	VERIFIER_CH4_AVANT_ACADEMIE();
	verifierAcademie();
};

/* Le monde est de nouveau figé. */
World.fige = true;
