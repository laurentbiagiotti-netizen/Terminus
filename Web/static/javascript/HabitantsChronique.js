/**
 * HabitantsChronique.js : les quêtes annexes de la Chronothèque (chapitre 9 pour le joueur, numéro interne 10).
 *
 * Six habitants confient chacun une petite histoire, en quatre étapes, dans les dépôts de ~/chronotheque. Chaque annexe
 * apporte des notions de Git qu'aucune étape ni aucun défi du chapitre n'enseigne :
 *   a9_worktree    Max (l'Atelier des Prophéties)     deux ateliers pour un seul grimoire : git worktree
 *   a9_archeologue Paolo (l'Oracle)                   fouiller autrement : git grep, git shortlog, git describe
 *   a9_menage      Ilian (le Livre des Ombres)        ce qui traîne et ce qui flotte : git clean, git fsck, git gc
 *   a9_messager    Fabien (les Portes des Royaumes)   un dépôt entier dans un seul fichier : git bundle
 *   a9_archive     Wisdom (la Besace et les Reliques) une version à emporter, sans l'histoire : git archive
 *   a9_purge       Eva-Lydia (les Runes de Garde)     effacer un secret de toute l'histoire : git filter-repo
 * Le mécanisme (proposition, étapes, récompenses, badge « Ami de la Chronothèque ») est dans QuetesAnnexes.js.
 */

World.fige = false;

function ouverteCh9(){ return state && state.has && state.has("ch9Ouvert") && chronothequeActive(); }
function habitantCh9(lieu, nom, image, texte){
	var it = new Item(nom, "", image).personnage();
	texteVivant(it, texte);
	lieu.addItem(it);
	return it;
}
function vuAnnexeCh9(cle){ return !!(sCh9().annexesVus || {})[cle]; }
function noterAnnexeCh9(cle){ var c = sCh9(); c.annexesVus = c.annexesVus || {}; c.annexesVus[cle] = true; }

/* Les sorts lancés (git et leur sortie) : ce qui prouve chaque étape. */
var APPELER_AVANT_HABITANTS_CH9 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_HABITANTS_CH9.apply(this, arguments);
	try {
		if (ouverteCh9()){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "", a = args || [], sous = typeof sousGitCh9 === "function" ? sousGitCh9(a) : a[0];
			if (nom === "git"){
				if (sous === "worktree" && a.indexOf("add") > -1) noterAnnexeCh9("worktreeAdd");
				if (sous === "worktree" && a.indexOf("list") > -1 && s.split("\n").filter(function(l){ return /\[\S+\]|\(detached HEAD\)/.test(l); }).length >= 2) noterAnnexeCh9("worktreeList");
				if (sous === "worktree" && a.indexOf("remove") > -1) noterAnnexeCh9("worktreeRemove");
				if (sous === "grep" && /Porte d'Argent/.test(s)) noterAnnexeCh9("grep");
				if (sous === "shortlog" && /^\s*\d+\s+\S/m.test(s)) noterAnnexeCh9("shortlog");
				if (sous === "describe" && /^v-[a-z]+(-\d+-g[0-9a-f]{7,})?$/m.test(s.trim())) noterAnnexeCh9("describe");
				if (sous === "clean" && (a.indexOf("-n") > -1 || a.indexOf("--dry-run") > -1 || /n/.test((a.filter(function(x){ return /^-[a-z]+$/.test(x); })[0] || ""))) && /Would remove/.test(s)) noterAnnexeCh9("cleanN");
				if (sous === "clean" && /Removing/.test(s)) noterAnnexeCh9("cleanF");
				if (sous === "fsck" && /dangling|unreachable/.test(s)) noterAnnexeCh9("fsck");
				if (sous === "gc") noterAnnexeCh9("gc");
				if (sous === "bundle" && a.indexOf("create") > -1) noterAnnexeCh9("bundleCree");
				if (sous === "bundle" && a.indexOf("verify") > -1 && /okay|is okay|The bundle records/.test(s)) noterAnnexeCh9("bundleVerifie");
				if (sous === "bundle" && a.indexOf("list-heads") > -1 && /refs\/heads\//.test(s)) noterAnnexeCh9("bundleTetes");
				if (sous === "clone" && a.some(function(x){ return /\.bundle$/.test(x); })) noterAnnexeCh9("bundleClone");
				if (sous === "archive" && /zip/.test(a.join(" "))) noterAnnexeCh9("archiveZip");
				if (sous === "archive" && /tar/.test(a.join(" ")) && !/zip/.test(a.join(" "))) noterAnnexeCh9("archiveTar");
				if (sous === "log" && /MOT_DE_PASSE=/.test(s) && /coffre/.test(Shell.cheminAffiche(current_room))) noterAnnexeCh9("secretVu");
				if (sous === "filter-repo") noterAnnexeCh9("filterRepo");
			}
			if ((nom === "unzip" && /-l/.test((args || []).join(" ")) || nom === "tar" && /t/.test((args || []).filter(function(x){ return /^-?[a-z]+$/.test(x); }).join(""))) && /grimoire|runes|vitrail/.test(s)) noterAnnexeCh9("archiveLue");
		}
	} catch (e){ /* une annexe ne doit jamais casser un sort */ }
	return sortie;
};

/* Le coffre d'Eva-Lydia : un secret enfoui trois sceaux plus bas. */
var COFFRE_CH9 = RACINE_CH9 + "/coffre";
function semerCoffreCh9(){
	var g = constructeurCh9(COFFRE_CH9);
	if (!g) return;
	var a = { nom: "Eva-Lydia", mail: "eva-lydia@chronique.lan" };
	g.commit({ auteur: a, date: dateCh9(10, 16, 9), message: "coffre: ouvre le coffre des runes", fichiers: { "inventaire.txt": "L'inventaire du coffre\n\n- trois runes d'argent\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 16, 10), message: "coffre: note la combinaison", fichiers: { "secrets.txt": "Combinaison du coffre : MOT_DE_PASSE=Rune-Argent-1998\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 16, 11), message: "coffre: ajoute deux runes", fichiers: { "inventaire.txt": "L'inventaire du coffre\n\n- trois runes d'argent\n- deux runes d'or\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 16, 12), message: "coffre: retire la combinaison", fichiers: { "secrets.txt": null } });
	g.commit({ auteur: a, date: dateCh9(10, 16, 13), message: "coffre: ajoute une rune de cristal", fichiers: { "inventaire.txt": "L'inventaire du coffre\n\n- trois runes d'argent\n- deux runes d'or\n- une rune de cristal\n" } });
	g.extraire();
}
var SEMER_CHRONIQUE_AVANT_HABITANTS = semerChronique;
semerChronique = function(){
	var deja = sCh9().seme;
	var r = SEMER_CHRONIQUE_AVANT_HABITANTS.apply(this, arguments);
	if (!deja){ try { semerCoffreCh9(); } catch (e){} }
	return r;
};
if (typeof REGENERATIONS_CH9 !== "undefined") REGENERATIONS_CH9.push({ nom: "coffre", cle: "coffre", semer: function(){ semerCoffreCh9(); }, etapes: ["a9_purge"] });
DEPOTS_CH9.coffre = COFFRE_CH9;
function coffrePurgeCh9(){
	var ch = COFFRE_CH9;
	if (!G9.depot(ch)) return false;
	var tous = G9.historique(ch, "HEAD");
	return tous.length >= 3 && tous.every(function(h){ return G9.fichier(ch, h, "secrets.txt") === null; }) && /cristal/.test(G9.fichier(ch, "HEAD", "inventaire.txt") || "");
}

/* ------------------------------------------------------------------ */
/* 1. Deux ateliers pour un grimoire (Max, l'Atelier des Prophéties)    */
/* ------------------------------------------------------------------ */

var MaxCh9 = habitantCh9(salleCh9Par("propheties").lieu, "Max", "item_max.gif", function(){
	if (aFait("a9_worktree")) return "Max replie son second établi. « Deux ateliers, un seul grimoire, et jamais de besace à vider en urgence. Garde l'idée. »";
	return "Un garçon en tablier d'atelier jongle entre deux établis, un parchemin sur chacun.\n\n" +
		"« Max ! Toi, quand une urgence arrive, tu ranges ton travail dans la besace d'Anthony. Moi, je fais autrement : j'ouvre un second atelier pour le MÊME grimoire. " +
		"git worktree add pose une deuxième copie de travail, dans un autre dossier, sur une autre ligne du destin, qui partage la même crypte (le même .git). " +
		"Tu répares l'urgence là-bas, tu scelles, et ton premier atelier n'a jamais bougé.\n\n" +
		"Essaie sur ~/chronotheque/lignes : un second atelier sur une nouvelle ligne, la liste des ateliers, un sceau là-bas, puis on range l'établi. »\n\n" +
		C.gris("Les outils (dans ~/chronotheque/lignes) : git worktree add ../lignes-urgence -b urgence ; git worktree list ; cd ../lignes-urgence ; un fichier, git add, git commit ; cd ../lignes ; git worktree remove ../lignes-urgence.");
});
declarerAnnexe({ id: "a9_worktree", chapitre: 10, titre: "Deux ateliers pour un grimoire", habitant: "Max", lieu: "à l'Atelier des Prophéties", item: function(){ return MaxCh9; }, ouverte: ouverteCh9,
	indice: "à l'Atelier des Prophéties, quelqu'un travaille sur deux établis à la fois.",
	resume: "Plusieurs copies de travail pour un seul dépôt : git worktree add, list, remove.",
	etapes: [
		{ titre: "Un second atelier, sur une nouvelle ligne (git worktree add)", fait: function(){ return vuAnnexeCh9("worktreeAdd"); } },
		{ titre: "Les deux ateliers, côte à côte (git worktree list)", fait: function(){ return vuAnnexeCh9("worktreeList"); } },
		{ titre: "Un sceau posé dans le second atelier", fait: function(){ return vuAnnexeCh9("worktreeSceau"); } },
		{ titre: "L'établi rangé (git worktree remove)", fait: function(){ return vuAnnexeCh9("worktreeRemove"); } }
	],
	souvenir: { nom: "Second-etabli", texte: "Une petite planche de bois, marquée au fer : « Un grimoire, deux ateliers, une seule crypte. » Max dit qu'elle se pose partout." },
	lumiere: "la lampe du second établi de Max",
	merci: "Max range ses deux établis l'un contre l'autre. « La prochaine urgence, tu ne videras pas ta besace : tu ouvriras un atelier. »"
});
GameEvents.addListener("git", function(e){
	if (!ouverteCh9()) return;
	try { if (e.cmd === "commit" && e.ok !== false && vuAnnexeCh9("worktreeAdd") && !/chronotheque\/lignes$/.test(String(e.depot || "").replace(/\/+$/, "")) && /lignes|urgence/.test(String(e.depot || "") + " " + String(e.branche || ""))) noterAnnexeCh9("worktreeSceau"); } catch (x){}
});

/* ------------------------------------------------------------------ */
/* 2. L'archéologue (Paolo, l'Oracle)                                  */
/* ------------------------------------------------------------------ */

var PaoloCh9 = habitantCh9(salleCh9Par("oracle").lieu, "Paolo", "item_paolo.gif", function(){
	if (aFait("a9_archeologue")) return "Paolo époussette son pinceau. « Un mot dans tout le grimoire, les scribes et leurs sceaux, et le menhir le plus proche. L'archéologie, c'est demander autrement. »";
	return "Accroupi près de la vasque, un garçon époussette une dalle avec un pinceau d'archéologue.\n\n" +
		"« Paolo. Irvan interroge le passé sceau par sceau. Moi, je fouille autrement. git grep cherche un mot dans tous les fichiers suivis, d'un coup, plus vite que grep. " +
		"git shortlog -sn compte les sceaux de chaque scribe, du plus prolifique au plus discret. Et git describe --tags dit où tu es par rapport au menhir le plus proche : v-automne-9-g1a2b3c4, neuf sceaux après le menhir v-automne. " +
		"Dans ~/chronotheque/annales, fouille avec moi. »\n\n" +
		C.gris("Les outils (dans ~/chronotheque/annales) : git grep -n \"Porte d'Argent\" ; git shortlog -sn ; git describe --tags.");
});
declarerAnnexe({ id: "a9_archeologue", chapitre: 10, titre: "L'archéologue", habitant: "Paolo", lieu: "à l'Oracle", item: function(){ return PaoloCh9; }, ouverte: ouverteCh9,
	indice: "près de la vasque de l'Oracle, quelqu'un époussette une dalle.",
	resume: "Fouiller un dépôt autrement : git grep, git shortlog -sn, git describe --tags.",
	etapes: [
		{ titre: "Un mot dans tous les fichiers suivis (git grep)", fait: function(){ return vuAnnexeCh9("grep"); } },
		{ titre: "Les scribes, comptés (git shortlog -sn)", fait: function(){ return vuAnnexeCh9("shortlog"); } },
		{ titre: "Où l'on est, par rapport au menhir le plus proche (git describe --tags)", fait: function(){ return vuAnnexeCh9("describe"); } },
		{ titre: "Les trois fouilles faites dans les annales", fait: function(){ return vuAnnexeCh9("grep") && vuAnnexeCh9("shortlog") && vuAnnexeCh9("describe"); } }
	],
	souvenir: { nom: "Pinceau-de-l-archeologue", texte: "Un pinceau à poils doux, le manche gravé : « grep, shortlog, describe. On ne creuse pas, on demande. »" },
	lumiere: "la lanterne de fouille de Paolo",
	merci: "Paolo te tend son pinceau. « Le passé ne se creuse pas à la pelle. Il se demande poliment. »"
});

/* ------------------------------------------------------------------ */
/* 3. Ce qui traîne et ce qui flotte (Ilian, le Livre des Ombres)        */
/* ------------------------------------------------------------------ */

var IlianCh9 = habitantCh9(salleCh9Par("ombres").lieu, "Ilian", "item_ilian.gif", function(){
	if (aFait("a9_menage")) return "Ilian range son balai contre le pupitre. « L'atelier propre, les ombres comptées, la crypte tassée. Le Livre te remercie. »";
	return "Un garçon passe un balai entre les rayonnages, en faisant bien attention de ne jamais toucher le Livre.\n\n" +
		"« Ilian. Moi, je fais le ménage. Deux sortes de poussière. Celle de l'atelier : des fichiers que Git ne suit pas, qui traînent. git clean les balaie, mais d'abord on regarde (-n), parce qu'un fichier balayé ne revient JAMAIS. " +
		"Et celle de la crypte : des sceaux que plus aucune ligne ne nomme, qui flottent (dangling). git fsck les trouve. Et git gc tasse la crypte, range les pierres en paquets. " +
		"Dans ~/chronotheque/livre-ombres, une ligne a été effacée : la crypte a forcément des sceaux qui flottent. »\n\n" +
		C.gris("Les outils (dans ~/chronotheque/livre-ombres) : touch brouillon.tmp ; git clean -n ; git clean -f ; git fsck --lost-found ; git gc.");
});
declarerAnnexe({ id: "a9_menage", chapitre: 10, titre: "Ce qui traîne et ce qui flotte", habitant: "Ilian", lieu: "au Livre des Ombres", item: function(){ return IlianCh9; }, ouverte: ouverteCh9,
	indice: "au Livre des Ombres, quelqu'un balaie sans jamais toucher le Livre.",
	resume: "Le ménage d'un dépôt : git clean -n puis -f, git fsck (les objets dangling), git gc.",
	etapes: [
		{ titre: "Regarder ce qui serait balayé, avant de balayer (git clean -n)", fait: function(){ return vuAnnexeCh9("cleanN"); } },
		{ titre: "Balayer l'atelier (git clean -f)", fait: function(){ return vuAnnexeCh9("cleanF"); } },
		{ titre: "Trouver les sceaux qui flottent (git fsck)", fait: function(){ return vuAnnexeCh9("fsck"); } },
		{ titre: "Tasser la crypte (git gc)", fait: function(){ return vuAnnexeCh9("gc"); } }
	],
	souvenir: { nom: "Balai-des-ombres", texte: "Un petit balai de crin noir. Sur le manche : « clean -n d'abord. Toujours. »" },
	lumiere: "la veilleuse d'Ilian, au pied des rayonnages",
	merci: "Ilian s'appuie sur son balai. « Le ménage, c'est regarder avant de jeter. Le reste, c'est du rangement. »"
});

/* ------------------------------------------------------------------ */
/* 4. Le messager sans pont (Fabien, les Portes des Royaumes)           */
/* ------------------------------------------------------------------ */

var FabienCh9 = habitantCh9(salleCh9Par("portes").lieu, "Fabien", "item_fabien.gif", function(){
	if (aFait("a9_messager")) return "Fabien referme sa sacoche. « Un dépôt entier, dans un seul fichier, et pas besoin de pont. Le campus de Lille l'a reçu ce matin. »";
	return "Un messager en bottes de route boucle une sacoche, prêt à partir à pied.\n\n" +
		"« Fabien. Jeremy passe par le pont, par le réseau. Moi, je vais là où il n'y a pas de pont : un campus coupé du monde, une machine sans réseau. " +
		"Alors je porte le dépôt entier dans un seul fichier : un bundle. git bundle create l'emballe, avec toutes ses lignes ; git bundle verify vérifie qu'il est complet ; " +
		"et à l'arrivée, on clone directement depuis le fichier, comme depuis un Royaume. Emballe-moi les annales. »\n\n" +
		C.gris("Les outils : cd ~/chronotheque/annales ; git bundle create ../annales.bundle --all ; git bundle verify ../annales.bundle ; git bundle list-heads ../annales.bundle ; cd .. ; git clone annales.bundle annales-lille.");
});
declarerAnnexe({ id: "a9_messager", chapitre: 10, titre: "Le messager sans pont", habitant: "Fabien", lieu: "aux Portes des Royaumes", item: function(){ return FabienCh9; }, ouverte: ouverteCh9,
	indice: "aux Portes des Royaumes, quelqu'un se prépare à partir à pied.",
	resume: "Un dépôt entier dans un seul fichier, sans réseau : git bundle create, verify, list-heads, et un clone depuis le bundle.",
	etapes: [
		{ titre: "Emballer un dépôt entier (git bundle create ... --all)", fait: function(){ return vuAnnexeCh9("bundleCree"); } },
		{ titre: "Vérifier le paquet (git bundle verify)", fait: function(){ return vuAnnexeCh9("bundleVerifie"); } },
		{ titre: "Lire ses lignes (git bundle list-heads)", fait: function(){ return vuAnnexeCh9("bundleTetes"); } },
		{ titre: "Cloner depuis le paquet, sans Royaume (git clone FICHIER.bundle)", fait: function(){ return vuAnnexeCh9("bundleClone"); } }
	],
	souvenir: { nom: "Sacoche-du-messager", texte: "Une sacoche de cuir usée, avec une étiquette : « annales.bundle, à remettre au campus de Lille. Fragile : contient toute l'histoire. »" },
	lumiere: "la lanterne de route de Fabien",
	merci: "Fabien met la sacoche à l'épaule. « Là où il n'y a pas de pont, il y a toujours un messager. »"
});

/* ------------------------------------------------------------------ */
/* 5. La version à emporter (Wisdom, la Besace et les Reliques)         */
/* ------------------------------------------------------------------ */

var WisdomCh9 = habitantCh9(salleCh9Par("besace").lieu, "Wisdom", "item_wisdom.gif", function(){
	if (aFait("a9_archive")) return "Wisdom ficelle un dernier paquet. « Une version, rien que la version, sans la crypte. C'est ce qu'on donne à ceux qui n'ont pas besoin de l'histoire. »";
	return "Une jeune femme emballe des objets dans du papier kraft, au pied du menhir.\n\n" +
		"« Wisdom. Quand un royaume nous demande la version 1.0 de nos runes, on ne lui envoie pas tout le grimoire avec sa crypte et ses trois cents sceaux : on lui envoie la version, et rien d'autre. " +
		"git archive emballe l'arbre d'un sceau ou d'un menhir, sans le dossier .git, en tar ou en zip. Emballe-moi le menhir v1.0 de la besace (plante-le d'abord, si ce n'est pas fait). »\n\n" +
		C.gris("Les outils (dans ~/chronotheque/besace) : git archive --format=zip -o ../runes-v1.0.zip v1.0 ; git archive --format=tar -o ../runes-v1.0.tar v1.0 ; tar -tf ../runes-v1.0.tar.");
});
declarerAnnexe({ id: "a9_archive", chapitre: 10, titre: "La version à emporter", habitant: "Wisdom", lieu: "à la Besace et les Reliques", item: function(){ return WisdomCh9; }, ouverte: ouverteCh9,
	indice: "au pied du menhir, quelqu'un emballe des paquets.",
	resume: "Une version sans l'historique : git archive en zip et en tar, depuis un tag.",
	etapes: [
		{ titre: "Un menhir à emballer (le tag v1.0 de la besace)", fait: function(){ return !!G9.resoudre(DEPOTS_CH9.besace, "refs/tags/v1.0"); } },
		{ titre: "Le paquet zip (git archive --format=zip)", fait: function(){ return vuAnnexeCh9("archiveZip"); } },
		{ titre: "Le paquet tar (git archive --format=tar)", fait: function(){ return vuAnnexeCh9("archiveTar"); } },
		{ titre: "Ce qu'il y a dedans, et ce qu'il n'y a pas (tar -tf : pas de .git)", fait: function(){ return vuAnnexeCh9("archiveLue"); } }
	],
	souvenir: { nom: "Ficelle-de-Wisdom", texte: "Une bobine de ficelle et une étiquette vierge : « v1.0, sans la crypte ». Wisdom dit qu'un paquet bien fait ne contient que ce qu'on attend." },
	lumiere: "la lampe de l'emballeuse, au pied du menhir",
	merci: "Wisdom pose le paquet sur le menhir. « Ceux qui veulent l'histoire clonent. Ceux qui veulent la version reçoivent un paquet. »"
});

/* ------------------------------------------------------------------ */
/* 6. Le secret enfoui (Eva-Lydia, les Runes de Garde)                  */
/* ------------------------------------------------------------------ */

var EvaLydiaCh9 = habitantCh9(salleCh9Par("garde").lieu, "Eva-Lydia", "item_eva_lydia.gif", function(){
	if (aFait("a9_purge")) return "Eva-Lydia referme le coffre. « Le secret n'existe plus dans aucun sceau. Et j'ai changé la combinaison : ça, Git ne pouvait pas le faire pour moi. »";
	return "Une jeune femme, une lampe à la main, fouille un coffre de fer dans un recoin des Runes de Garde.\n\n" +
		"« Eva-Lydia. J'ai fait une bêtise, il y a longtemps : j'ai scellé la combinaison du coffre. Je l'ai retirée au sceau suivant. Mais elle est toujours là, trois sceaux plus bas, dans l'histoire : n'importe qui peut la lire. " +
		"Pour l'effacer de TOUTE l'histoire, il faut réécrire chaque sceau, comme si le fichier n'avait jamais existé : git filter-repo. C'est le sort le plus violent de Git ; on ne le lance que sur un dépôt qu'on contrôle, et après, tout le monde doit recloner. " +
		"Et surtout : une combinaison qui a fuité, on la CHANGE. Effacer ne suffit jamais. Le coffre est dans ~/chronotheque/coffre. »\n\n" +
		C.gris("Les outils (dans ~/chronotheque/coffre) : git log -p --all | grep MOT_DE_PASSE ; git filter-repo --path secrets.txt --invert-paths --force ; git log --all --oneline -- secrets.txt (plus rien).");
});
declarerAnnexe({ id: "a9_purge", chapitre: 10, titre: "Le secret enfoui", habitant: "Eva-Lydia", lieu: "aux Runes de Garde", item: function(){ return EvaLydiaCh9; }, ouverte: ouverteCh9,
	indice: "aux Runes de Garde, quelqu'un fouille un vieux coffre à la lampe.",
	resume: "Purger un secret de tout l'historique : le retrouver (log -p), git filter-repo --path --invert-paths, vérifier, et changer le secret.",
	etapes: [
		{ titre: "Retrouver le secret dans l'histoire (git log -p)", fait: function(){ return vuAnnexeCh9("secretVu"); } },
		{ titre: "Réécrire toute l'histoire sans lui (git filter-repo)", fait: function(){ return vuAnnexeCh9("filterRepo"); } },
		{ titre: "Plus un seul sceau ne le contient", fait: function(){ return coffrePurgeCh9(); } },
		{ titre: "Changer la combinaison (un fichier ROTATION.txt dans le coffre, qui dit qu'elle est changée)", fait: function(){ return /chang|nouvelle|rotation|renouvel/i.test(texteIleCh9(COFFRE_CH9 + "/ROTATION.txt") || ""); } }
	],
	souvenir: { nom: "Lampe-d-Eva-Lydia", texte: "Une lampe de mineur, la vitre un peu fumée. Sur le socle : « Effacer ne suffit jamais. On change le secret. »" },
	lumiere: "la lampe d'Eva-Lydia, près du vieux coffre",
	merci: "Eva-Lydia souffle sur sa lampe. « Réécrire l'histoire, une seule fois, pour une seule raison : un secret. Et changer le secret quand même. »"
});

/* Le badge « Ami de la Chronothèque », et une phrase de plus dans la scène finale. */
declarerAmiAnnexes(10, { badge: "ami_ch9", nom: "Ami de la Chronothèque", phrase: "les six habitants de la Chronothèque te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch9 = "Ami de la Chronothèque";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch9 = "or";
function texteAmiFinaleCh9(){
	return annexesToutesFaites(10) ? " Au pied du Grand Sablier, Max, Paolo, Ilian, Fabien, Wisdom et Eva-Lydia lèvent chacun une lanterne : celles-là sont pour toi." : "";
}

World.fige = true;
