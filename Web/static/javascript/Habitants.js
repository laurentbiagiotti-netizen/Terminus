/**
 * Habitants.js : les quêtes annexes de Lumen (chapitre 6 pour le joueur, numéro interne 7).
 *
 * Six habitants de la cité confient chacun une petite histoire, en plusieurs étapes, sur la machine lumen. Chaque
 * annexe apporte des notions qu'aucun chapitre n'enseigne ailleurs (ni dans ses étapes, ni dans ses défis) :
 *   a6_habitants   la Logeuse (Ateliers)        quotas disque (setquota, quota, repquota), dossier commun en setgid, newgrp
 *   a6_chat        l'Allumeur (la place)        Ctrl-Z, jobs, bg, fg, kill -STOP et -CONT, disown
 *   a6_chant       la Veilleuse (Observatoire)  zgrep, zless, last -x
 *   a6_horloge     l'Horloger (Tour)            hwclock --show et --systohc, cal, date +%s
 *   a6_rouleaux    l'Imprimeur (Gazette)        bzip2, xz, zstd, -k, xz -l
 *   a6_lettre      la Postière (Archives)       touch -d, find -newermt, touch -r
 * Le mécanisme (proposition, étapes, récompenses, badge « Ami de Lumen ») est dans QuetesAnnexes.js.
 */

World.fige = false;

function ouverteCh6(){ return state && state.has && state.has("ch6Ouvert") && lumenOuvert(); }
function habitantCh6(lieu, nom, texte, sorts){
	var it = new Item(nom, "", "item_" + nom.toLowerCase() + ".gif").personnage();
	if (sorts && sorts.length){ it.enseigne.apply(it, sorts); declarerSortsAnnexes(sorts); }
	texteVivant(it, texte);
	lieu.addItem(it);
	return it;
}
/* Ce que le joueur a fait pour les annexes : les sorts lancés sur lumen et leur sortie. */
function vuAnnexe(cle){ return !!(sCh6().annexesVus || {})[cle]; }
function noterAnnexe(cle){ var c = sCh6(); c.annexesVus = c.annexesVus || {}; c.annexesVus[cle] = true; }
function chatCh6(){ return procsMachine(H6).filter(function(p){ return p.comm === "chat-errant"; })[0] || null; }
function maisonLumen(chemin){ return "/home/" + JOUEUR + "/" + chemin; }

var APPELER_AVANT_HABITANTS = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_HABITANTS.apply(this, arguments);
	try {
		if (lumenOuvert() && surLumen()){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "", a = args || [];
			if (nom === "repquota" && /ninon/.test(s) && /basile/.test(s)) noterAnnexe("repquota");
			if (nom === "id" && /habitants/.test(s)) noterAnnexe("idHabitants");
			if (nom === "jobs" && /chat-errant/.test(s)) noterAnnexe("jobs");
			if (nom === "bg" && /chat-errant/.test(s)) noterAnnexe("bg");
			if (nom === "fg" && /chat-errant|chat/.test(s)) noterAnnexe("fg");
			var chat = chatCh6();
			if (nom === "kill" && chat && a.some(function(x){ return /^-(STOP|SIGSTOP|19|s)$/.test(x); }) && chat.etat === "T") noterAnnexe("stop");
			if (nom === "kill" && chat && a.some(function(x){ return /^-(CONT|SIGCONT|18)$/.test(x); }) && chat.etat !== "T" && vuAnnexe("stop")) noterAnnexe("cont");
			if (nom === "zgrep" && /chant/.test(a.join(" ")) && (s.match(/couplet/g) || []).length >= 3) noterAnnexe("zgrep");
			if (nom === "zless" && /coeur\.log\.\d\.gz/.test(a.join(" ")) && /battement/.test(s)) noterAnnexe("zless");
			if (nom === "last" && a.some(function(x){ return /^-\w*x/.test(x); }) && /crash/.test(s)) noterAnnexe("lastx");
			if (nom === "hwclock" && (a.indexOf("--show") > -1 || a.indexOf("-r") > -1 || !a.length) && /\d\d:\d\d:\d\d/.test(s)) noterAnnexe("hwclockShow");
			if (nom === "cal" && /Su Mo Tu|Mo Tu We/.test(s)) noterAnnexe("cal");
			if (nom === "xz" && (a.indexOf("-l") > -1 || a.indexOf("--list") > -1) && /Ratio/.test(s)) noterAnnexe("xzl");
			if (nom === "ls" && /l/.test(a.filter(function(x){ return /^-/.test(x); }).join("")) && /rouleau-1880\.txt\.bz2/.test(s) && /rouleau-1880\.txt\.xz/.test(s) && /rouleau-1880\.txt\.zst/.test(s)) noterAnnexe("lsRouleaux");
			if (nom === "find" && a.indexOf("-newermt") > -1 && /lettre-de-la-maire\.txt/.test(s) && !/avis-de-passage/.test(s)) noterAnnexe("newermt");
			if ((nom === "cat" || nom === "less") && a.some(function(x){ return /lettre-de-la-maire\.txt$/.test(x); }) && /maire/.test(s)) noterAnnexe("lettreLue");
		}
	} catch (e){ /* une annexe ne doit jamais casser un sort */ }
	return sortie;
};
GameEvents.addListener("machine", function(e){
	if (!lumenOuvert() || e.hote !== H6) return;
	if (e.cmd === "ctrl-z" && e.comm === "chat-errant") noterAnnexe("ctrlz");
});
GameEvents.addListener("touchDate", function(e){
	if (!lumenOuvert() || e.hote !== H6 || !e.item) return;
	var minuit = new Date(dateMachine(H6, maintenantCh6()).getTime()); minuit.setHours(0, 0, 0, 0);
	var d = dateMachine(H6, e.ms);
	if (d.getHours() === 0 && d.getMinutes() === 0 && d.getDate() === minuit.getDate()) noterAnnexe("repere");
});
/* Le chat survit-il à la fermeture de la session ? */
var EXIT_AVANT_HABITANTS = Shell.sorts.exit;
Shell.sorts.exit = function(args, io){
	try { var chat = lumenOuvert() && surLumen() ? chatCh6() : null; if (chat && chat.disown) noterAnnexe("chatDisown"); } catch (e){}
	return EXIT_AVANT_HABITANTS.apply(this, arguments);
};

/* ------------------------------------------------------------------ */
/* 1. Les nouveaux habitants (la Logeuse, aux Ateliers)                 */
/* ------------------------------------------------------------------ */

function quotaCh6(qui){ var f = fsCh6("/home"); return f && f.quotas && f.quotas.u ? f.quotas.u[qui] : null; }
function quotaOkCh6(qui){ var q = quotaCh6(qui); return !!q && q.bs > 0 && q.bs <= 1048576 && (!q.bh || q.bh >= q.bs); }
function communSetgidCh6(){
	var d = dossierHote(H6, "/home/commun");
	return !!d && d.mode.charAt(5) === "s" && (etatMachine(H6).groupesDossiers || {})["/home/commun"] === "habitants";
}
var LogeuseLumen = habitantCh6(quartierCh6("ateliers").lieu, "Logeuse", function(){
	if (aFait("a6_habitants")) return "La Logeuse range ses clés. « Ninon et Basile ont chacun leur part, et le dossier commun est à tout le monde. Merci, vraiment. »";
	return "Une femme en tablier, un trousseau de clés à la ceinture, compte des valises sur le seuil des Ateliers.\n\n" +
		"« Je suis la Logeuse de Lumen. Deux nouveaux habitants sont arrivés hier : Ninon et Basile. Ils ont déjà chacun un compte sur le Cœur, et ils sont du groupe habitants. " +
		"Mais Basile a posé 1,4 Go de photos dans son dossier, et Ninon en prend le chemin. Si chacun fait pareil, plus personne n'aura de place dans /home.\n\n" +
		"Il me faudrait trois choses. D'abord, une part de /home pour chacun : un quota, une limite souple d'un gigaoctet au plus (le disque /home accepte les quotas). " +
		"Ensuite, un dossier commun, /home/commun, où tout ce qu'on dépose appartient au groupe habitants, quel que soit celui qui le dépose (le bit setgid sur le dossier). " +
		"Enfin, que toi aussi tu puisses travailler sous ce groupe, le temps d'une session. »\n\n" +
		C.gris("Les outils : sudo setquota -u NOM SOUPLE DURE 0 0 /home (en Kio, ou 900M, 1G), quota -u NOM, sudo repquota -a ; " +
			"sudo chgrp habitants DOSSIER, sudo chmod g+s DOSSIER (ou 2775) ; newgrp GROUPE, puis id.");
}, ["setquota", "quota", "repquota", "edquota", "chgrp", "newgrp"]);
declarerAnnexe({ id: "a6_habitants", chapitre: 7, titre: "Les nouveaux habitants", habitant: "la Logeuse", lieu: "aux Ateliers", item: function(){ return LogeuseLumen; }, ouverte: ouverteCh6,
	indice: "aux Ateliers, quelqu'un compte des valises.",
	resume: "Une part de /home pour Ninon et Basile (quotas), un dossier commun au groupe habitants (setgid), et newgrp.",
	etapes: [
		{ titre: "Un quota pour Ninon et pour Basile sur /home (limite souple d'1 Go au plus)", fait: function(){ return quotaOkCh6("ninon") && quotaOkCh6("basile"); } },
		{ titre: "Relever les parts de tout le monde (repquota -a)", fait: function(){ return vuAnnexe("repquota"); } },
		{ titre: "/home/commun au groupe habitants, en setgid (chgrp, chmod g+s)", fait: function(){ return communSetgidCh6(); } },
		{ titre: "Un fichier déposé dans /home/commun hérite du groupe habitants", fait: function(){ var d = dossierHote(H6, "/home/commun"); return communSetgidCh6() && !!d && d.items.some(function(it){ return it.groupe === "habitants" && it.owner === JOUEUR; }); } },
		{ titre: "Travailler sous le groupe habitants (newgrp), et le vérifier (id)", fait: function(){ return etatMachine(H6).groupeCourant === "habitants" && vuAnnexe("idHabitants"); } }
	],
	souvenir: { nom: "Cle-du-commun", texte: "Une petite clé de laiton, gravée « commun ». La Logeuse te l'a donnée : « Tu es chez toi ici, maintenant. »" },
	lumiere: "les fenêtres du foyer des habitants",
	merci: "La Logeuse te serre la main. « Chacun sa part, et un endroit à tous. C'est comme ça qu'une ville tient debout. »"
});

/* ------------------------------------------------------------------ */
/* 2. Le chat du Cœur (l'Allumeur, sur la place)                        */
/* ------------------------------------------------------------------ */

var AllumeurLumen = habitantCh6(HallLumen, "Allumeur", function(){
	if (aFait("a6_chat")) return "L'Allumeur sourit. « Le chat dort quelque part dans le Cœur, et il y restera. Il ne craint plus rien, même quand tu pars. »";
	return "Un vieil homme, une perche à allumer les réverbères sur l'épaule, scrute la grille du Cœur.\n\n" +
		"« Tu connais le chat du Cœur ? Un chat gris qui vit dans la machine depuis toujours : un programme, chat-errant, qui ronronne dans un coin. " +
		"Il tient compagnie au Cœur. Mais chaque fois que quelqu'un ferme sa session, le chat disparaît avec elle. Ça me fend le cœur.\n\n" +
		"Apprends à vivre avec lui. Lance-le sur lumen : il s'installe sur ton clavier (au premier plan), et tu ne peux plus rien taper. Fais-le se mettre en boule (Ctrl-Z, il se suspend). " +
		"Retrouve-le dans la liste de tes tâches (jobs). Laisse-le se promener en arrière-plan (bg), rappelle-le (fg), puis remets-le en boule. " +
		"Fige-le d'un signal, réveille-le d'un autre (kill -STOP, kill -CONT, sur son numéro). Et surtout : détache-le de ta session (disown), " +
		"qu'il ne meure plus quand tu t'en vas. Ferme ta session, reviens, et il doit être là. »\n\n" +
		C.gris("Les outils : chat-errant ; Ctrl-Z ; jobs ; bg %1 ; fg %1 ; kill -STOP PID, kill -CONT PID (pgrep chat-errant) ; disown %1 ; exit, puis ssh lumen.");
}, ["jobs", "bg", "fg", "disown"]);
declarerAnnexe({ id: "a6_chat", chapitre: 7, titre: "Le chat du Cœur", habitant: "l'Allumeur", lieu: "sur la place", item: function(){ return AllumeurLumen; }, ouverte: ouverteCh6,
	indice: "sur la place, un vieil homme cherche quelque chose derrière la grille du Cœur.",
	resume: "Un programme qui ronronne : premier plan, Ctrl-Z, jobs, bg, fg, kill -STOP et -CONT, disown.",
	etapes: [
		{ titre: "Lancer chat-errant, puis le suspendre (Ctrl-Z)", fait: function(){ return vuAnnexe("ctrlz"); } },
		{ titre: "Le retrouver dans la liste des tâches (jobs)", fait: function(){ return vuAnnexe("jobs"); } },
		{ titre: "Le laisser filer en arrière-plan (bg), puis le rappeler (fg)", fait: function(){ return vuAnnexe("bg") && vuAnnexe("fg"); } },
		{ titre: "Le figer et le réveiller par signal (kill -STOP, puis kill -CONT)", fait: function(){ return vuAnnexe("stop") && vuAnnexe("cont"); } },
		{ titre: "Le détacher de ta session (disown), fermer ta session, et le retrouver", fait: function(){ return vuAnnexe("chatDisown") && !!chatCh6() && surLumen(); } }
	],
	souvenir: { nom: "Moustache", texte: "Une moustache de chat, longue et grise. L'Allumeur dit que ça porte bonheur aux gens qui veillent tard." },
	lumiere: "le réverbère du chat, au coin de la place",
	merci: "L'Allumeur rit tout bas. « Il ronronne même quand personne ne le regarde. Comme le Cœur. »"
});

/* ------------------------------------------------------------------ */
/* 3. Le chant du Cœur (la Veilleuse, à l'Observatoire)                 */
/* ------------------------------------------------------------------ */

function chantChanteCh6(){
	var t = sansAccentCh6(T6(maisonLumen("chant.txt")) || "");
	return ["je veille", "je brule", "je chante l'aube"].every(function(v){ return t.indexOf(v) > -1; });
}
var VeilleuseLumen = habitantCh6(quartierCh6("observatoire").lieu, "Veilleuse", function(){
	if (aFait("a6_chant")) return "La Veilleuse fredonne le chant du Cœur, les yeux fermés. « Quand la ville a peur, je chante l'aube. Merci de me l'avoir rendu. »";
	return "Une vieille dame emmitouflée, une bougie à la main, est assise sous la coupole.\n\n" +
		"« Avant de s'éteindre, le Cœur chantait. Un chant en trois couplets, que je lui entendais murmurer la nuit. Je l'ai oublié. " +
		"Il doit être dans ses vieux journaux, ceux qu'on a roulés et compressés (/var/log/lumen/coeur.log.*.gz). " +
		"Ne les décompresse pas : cherche dedans tel quel (zgrep), et lis-en un en entier, page à page (zless), pour l'entendre battre.\n\n" +
		"Et dis-moi aussi quand il s'est arrêté la dernière fois, d'un coup, sans prévenir : la machine garde la liste de ses arrêts et redémarrages (last -x). " +
		"Puis chante-moi les trois couplets : écris-les dans ~/chant.txt, sur lumen. »\n\n" +
		C.gris("Les outils : zgrep MOTIF FICHIERS.gz ; zless FICHIER.gz ; last -x (ou last -x reboot) ; echo ... >> ~/chant.txt.");
}, ["zgrep", "zless"]);
declarerAnnexe({ id: "a6_chant", chapitre: 7, titre: "Le chant du Cœur", habitant: "la Veilleuse", lieu: "à l'Observatoire", item: function(){ return VeilleuseLumen; }, ouverte: ouverteCh6,
	indice: "sous la coupole de l'Observatoire, une bougie veille.",
	resume: "Retrouver un chant dans des journaux compressés (zgrep, zless) et la date d'un arrêt brutal (last -x).",
	etapes: [
		{ titre: "Chercher le chant dans les journaux compressés, sans les décompresser (zgrep)", fait: function(){ return vuAnnexe("zgrep"); } },
		{ titre: "Lire un vieux journal en entier, page à page (zless)", fait: function(){ return vuAnnexe("zless"); } },
		{ titre: "Retrouver l'arrêt brutal du Cœur dans la liste des arrêts (last -x)", fait: function(){ return vuAnnexe("lastx"); } },
		{ titre: "Chanter les trois couplets à la Veilleuse (~/chant.txt sur lumen)", fait: function(){ return chantChanteCh6(); } }
	],
	souvenir: { nom: "Partition-du-Coeur", texte: "La partition du chant du Cœur, en trois couplets :\n  quand la ville dort, je veille\n  quand la ville a froid, je brûle\n  quand la ville a peur, je chante l'aube" },
	lumiere: "la coupole de l'Observatoire",
	merci: "La Veilleuse chante les trois couplets d'une voix fêlée, et, très loin, le Cœur semble battre un peu plus fort."
});

/* ------------------------------------------------------------------ */
/* 4. L'horloge de la place (l'Horloger, à la Tour de l'Horloge)        */
/* ------------------------------------------------------------------ */

function epochNoteCh6(){
	var t = T6(maisonLumen("horloge.txt")) || "", n = Math.floor(maintenantCh6() / 1000);
	return (t.match(/\b\d{10}\b/g) || []).some(function(x){ return Math.abs(+x - n) <= 900; });
}
var HorlogerLumen = habitantCh6(quartierCh6("horloge").lieu, "Horloger", function(){
	if (aFait("a6_horloge")) return "L'Horloger remonte une montre de poche. « Le Cœur et sa pile battent ensemble, maintenant. Et l'horloge de la place donne l'heure des machines. »";
	return "Un homme à lunettes, une loupe vissée à l'œil, démonte une horloge de cuivre au pied de la Tour.\n\n" +
		"« Une machine a deux horloges, tu sais ? Celle du système, que le noyau fait avancer. Et l'horloge matérielle, une petite pile sur la carte mère, " +
		"qui compte même quand la machine est éteinte. Au démarrage, le système se règle sur elle. Si elle dérive, la machine se réveille à la mauvaise heure.\n\n" +
		"Lis l'horloge matérielle du Cœur, et remets-la à l'heure du système. Montre-moi le calendrier du mois, pour mon cadran. " +
		"Et donne-moi l'heure comme la donnent les machines entre elles : le nombre de secondes depuis le 1er janvier 1970. Note-le dans ~/horloge.txt, sur lumen. »\n\n" +
		C.gris("Les outils : sudo hwclock --show ; sudo hwclock --systohc (le système vers la pile) ; cal ; date +%s.");
}, ["hwclock", "cal"]);
declarerAnnexe({ id: "a6_horloge", chapitre: 7, titre: "L'horloge de la place", habitant: "l'Horloger", lieu: "à la Tour de l'Horloge", item: function(){ return HorlogerLumen; }, ouverte: ouverteCh6,
	indice: "au pied de la Tour, quelqu'un démonte une horloge.",
	resume: "L'horloge matérielle (hwclock), le calendrier (cal) et l'heure en secondes depuis 1970 (date +%s).",
	etapes: [
		{ titre: "Lire l'horloge matérielle du Cœur (hwclock --show)", fait: function(){ return vuAnnexe("hwclockShow"); } },
		{ titre: "La remettre à l'heure du système (hwclock --systohc)", fait: function(){ return (etatMachine(H6).derive || 0) === 0; } },
		{ titre: "Montrer le calendrier du mois (cal)", fait: function(){ return vuAnnexe("cal"); } },
		{ titre: "Noter l'heure des machines, en secondes depuis 1970, dans ~/horloge.txt (date +%s)", fait: function(){ return epochNoteCh6(); } }
	],
	souvenir: { nom: "Rouage-d-argent", texte: "Un rouage d'argent, minuscule, sorti de l'horloge de la place. L'Horloger l'a remplacé par un neuf." },
	lumiere: "le cadran de l'horloge de la place",
	merci: "L'Horloger remonte l'horloge de la place, qui sonne juste. « Deux horloges d'accord : la cité se réveillera à l'heure. »"
});

/* ------------------------------------------------------------------ */
/* 5. Les rouleaux compressés (l'Imprimeur, à la Gazette)               */
/* ------------------------------------------------------------------ */

function meilleurRouleauCh6(){
	var t = { bzip2: tailleCh6("/srv/gazette/rouleau-1880.txt.bz2"), xz: tailleCh6("/srv/gazette/rouleau-1880.txt.xz"), zstd: tailleCh6("/srv/gazette/rouleau-1880.txt.zst") };
	if (Object.keys(t).some(function(k){ return t[k] < 0; })) return null;
	return Object.keys(t).sort(function(a, b){ return t[a] - t[b]; })[0];
}
var ImprimeurLumen = habitantCh6(quartierCh6("gazette").lieu, "Imprimeur", function(){
	if (aFait("a6_rouleaux")) return "L'Imprimeur range les rouleaux dans leur étui le plus petit. « Trois façons de rouler, une seule qui tient dans ma poche. Merci. »";
	return "Un homme aux doigts tachés d'encre se bat avec un rouleau énorme, /srv/gazette/rouleau-1880.txt (120 Mo).\n\n" +
		"« La Gazette de 1880, toute l'année sur un seul rouleau. Je dois l'envoyer aux Archives, et l'étui est petit. " +
		"On m'a parlé de trois façons de le rouler serré : bzip2, xz, zstd. Essaie les trois, en gardant à chaque fois le rouleau d'origine (-k), " +
		"lis aussi ce que xz dit de lui-même (xz -l), compare les tailles, et dis-moi la meilleure : écris son nom dans ~/rouleaux.txt, sur lumen. »\n\n" +
		C.gris("Les outils : bzip2 -k FICHIER ; xz -k FICHIER ; zstd FICHIER (il garde l'original) ; xz -l FICHIER.xz ; ls -l.");
}, ["bzip2", "bunzip2", "bzcat", "xz", "unxz", "xzcat", "zstd", "unzstd", "zstdcat"]);
declarerAnnexe({ id: "a6_rouleaux", chapitre: 7, titre: "Les rouleaux compressés", habitant: "l'Imprimeur", lieu: "à la Gazette", item: function(){ return ImprimeurLumen; }, ouverte: ouverteCh6,
	indice: "à la Gazette, un homme se bat avec un rouleau trop grand.",
	resume: "Comparer trois compressions (bzip2, xz, zstd) sur un gros fichier, et choisir la meilleure.",
	etapes: [
		{ titre: "Rouler le rouleau avec bzip2, en gardant l'original (bzip2 -k)", fait: function(){ return tailleCh6("/srv/gazette/rouleau-1880.txt.bz2") > 0 && !!F6("/srv/gazette/rouleau-1880.txt"); } },
		{ titre: "Avec xz aussi (xz -k), et lire son taux (xz -l)", fait: function(){ return tailleCh6("/srv/gazette/rouleau-1880.txt.xz") > 0 && !!F6("/srv/gazette/rouleau-1880.txt") && vuAnnexe("xzl"); } },
		{ titre: "Et avec zstd", fait: function(){ return tailleCh6("/srv/gazette/rouleau-1880.txt.zst") > 0; } },
		{ titre: "Comparer les tailles (ls -l) et nommer la meilleure dans ~/rouleaux.txt", fait: function(){ var m = meilleurRouleauCh6(); return vuAnnexe("lsRouleaux") && !!m && new RegExp("\\b" + m + "\\b").test(T6(maisonLumen("rouleaux.txt")) || ""); } }
	],
	souvenir: { nom: "Rouleau-de-1880", texte: "Un morceau du rouleau de la Gazette de 1880, imprimé à l'ancienne : « Lumen illuminée pour la première fois. »" },
	lumiere: "les rotatives de la Gazette",
	merci: "L'Imprimeur glisse le plus petit rouleau dans son étui. « Il tient ! Le plus lent à rouler, mais le plus petit. Pour une archive, c'est ce qui compte. »"
});

/* ------------------------------------------------------------------ */
/* 6. La lettre perdue (la Postière, aux Archives)                      */
/* ------------------------------------------------------------------ */

function lettreRecopieeCh6(){
	var a = F6("/srv/courrier/lettre-de-la-maire.txt"), b = F6(maisonLumen("lettre-de-la-maire.txt"));
	return !!a && !!b && a.getText() === b.getText() && a.mtimeMs !== undefined && b.mtimeMs !== undefined && Math.abs(a.mtimeMs - b.mtimeMs) < 1000;
}
var PostiereLumen = habitantCh6(quartierCh6("archives").lieu, "Postiere", function(){
	if (aFait("a6_lettre")) return "La Postière tamponne une dernière enveloppe. « La lettre de la maire est partie, à sa date. Rien ne se perd, à Lumen. »";
	return "Une jeune femme en uniforme bleu fouille un sac de courrier qui déborde.\n\n" +
		"« La Postière, c'est moi. Une lettre de la maire est arrivée cette nuit, après minuit, dans /srv/courrier, au milieu de deux mille quatre cents vieilles lettres. Je ne la retrouve plus.\n\n" +
		"D'abord, pose-moi un repère sur la table du tri : un fichier à ton nom, daté de minuit pile, aujourd'hui (on peut donner la date qu'on veut à un fichier). " +
		"Ensuite, trouve les lettres arrivées après minuit : find sait chercher par date. Lis la lettre. " +
		"Et recopie-la dans ton dossier pour la maire, mais sans changer sa date : une copie doit dire quand l'original est arrivé, pas quand tu l'as copié. »\n\n" +
		C.gris("Les outils : touch -d \"AAAA-MM-JJ 00:00\" FICHIER ; find DOSSIER -newermt \"AAAA-MM-JJ 00:00\" ; cp ; touch -r ORIGINAL COPIE (la date de l'un sur l'autre). date +%F donne la date du jour.");
});
declarerAnnexe({ id: "a6_lettre", chapitre: 7, titre: "La lettre perdue", habitant: "la Postière", lieu: "aux Archives", item: function(){ return PostiereLumen; }, ouverte: ouverteCh6,
	indice: "aux Archives, un sac de courrier déborde.",
	resume: "Dater un fichier (touch -d), chercher par date (find -newermt), garder la date d'un original (touch -r).",
	etapes: [
		{ titre: "Poser un repère daté de minuit, aujourd'hui (touch -d)", fait: function(){ return vuAnnexe("repere"); } },
		{ titre: "Trouver les lettres arrivées après minuit (find -newermt)", fait: function(){ return vuAnnexe("newermt"); } },
		{ titre: "Lire la lettre de la maire", fait: function(){ return vuAnnexe("lettreLue"); } },
		{ titre: "La recopier dans ton dossier, à sa date d'origine (cp, puis touch -r)", fait: function(){ return lettreRecopieeCh6(); } }
	],
	souvenir: { nom: "Timbre-de-Lumen", texte: "Un timbre bleu, à l'effigie du Phare, oblitéré à minuit. La Postière l'a décollé pour toi." },
	lumiere: "la lanterne de la poste",
	merci: "La Postière glisse la lettre dans une enveloppe neuve. « Arrivée à 1 h, partie avec sa date. Tout ce que demande une lettre. »"
});

/* Le badge « Ami de Lumen », et une phrase de plus dans la scène finale. */
declarerAmiAnnexes(7, { badge: "ami_ch6", nom: "Ami de Lumen", phrase: "les six habitants de Lumen te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch6 = "Ami de Lumen";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch6 = "or";
function texteAmiFinaleCh6(){
	return annexesToutesFaites(7) ? " Sur la place, la Logeuse, l'Allumeur, la Veilleuse, l'Horloger, l'Imprimeur et la Postière ont allumé chacun une lanterne de plus : celles-là sont pour toi." : "";
}

World.fige = true;
