/**
 * Chronique.js : le monde du chapitre 9 pour le joueur (numéro interne 10), la Chronique d'Éternité.
 *
 * Sous la vieille tour de l'horloge de Cybersup dort la Chronique : un grimoire vivant, où tout ce qui s'est passé sur
 * l'île est scellé, page après page. C'est un dépôt Git. Celui qui la contrôle contrôle le passé. Le Faussaire, celui
 * qui signe P.G., a commencé à la réécrire. Si sa version atteint les Royaumes à l'aube du quatrième jour, elle deviendra
 * la vérité.
 *
 * Ce fichier pose :
 *   - l'horloge du chapitre (J1 06:00, cinq minutes par commande, la nuit au bivouac, la Grande Synchronisation à l'aube du J4) ;
 *   - la machine royaume (10.0.90.20) : les dépôts nus de l'école (/srv/git/*.git) et la forge, le Haut-Conseil ;
 *   - les dépôts semés dans la Maison du joueur, ~/chronotheque/ : un par leçon, chacun une petite histoire vraie,
 *     construits par le moteur (SortsGit.js) avec de vrais objets, de vrais hash, de vrais reflogs.
 * Le joueur travaille ses dépôts sur l'île, dans sa Maison : pas de ssh pour apprendre Git. ssh ne sert qu'aux Royaumes.
 *
 * --- Ce que le monde peut appeler ---
 *   sCh9() l'état du chapitre (state.ch9) ; heureCh9() « J2 14:35 » ; maintenantCh9() l'instant du chapitre (ms)
 *   avancerHorlogeCh9() ; texteAvantSynchroCh9() « la Grande Synchronisation dans 1 j 15 h » ; AUBE_CH9
 *   chroniqueOuverte() ; semerChronique() (fait à l'entrée) ; DEPOTS_CH9 (les chemins) ; HASH_CH9 (les commits remarquables)
 *   poserEpreuveCh9(n) : ce que le monde pose à l'ouverture d'une épreuve de rang
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* L'horloge : J1 06:00, cinq minutes par commande, l'aube du J4         */
/* ------------------------------------------------------------------ */

var PAS_HORLOGE_CH9 = 5;
var AUBE_CH9 = 3 * 1440 + 360;
var PLAFOND_LIGNE_CH9 = 8;
function etatCh9Initial(){
	return { minutes: 360, compte: 0, compteVu: 0, nuitsVues: 0, vus: {}, rang: 0, salles: {}, trophees: {}, bataille: null, assaut: null,
		scoreDepart: null, scoreFinal: null, scoreFinalCandidat: null, derniereLigne: null, compteLigne: 0, hash: {}, seme: false };
}
function sCh9(){
	if (typeof state === "undefined" || !state) return etatCh9Initial();
	if (!state.ch9 || typeof state.ch9 !== "object") state.ch9 = etatCh9Initial();
	var c = state.ch9;
	if (c.minutes === undefined) c.minutes = 360;
	if (!c.vus) c.vus = {};
	if (!c.hash) c.hash = {};
	return c;
}
function chroniqueOuverte(){
	return typeof state !== "undefined" && state && state.has && state.has("ch9Ouvert") && !(typeof examenEnCours === "function" && examenEnCours());
}
function baseJourCh9(){ var d = new Date(); d.setHours(6, 0, 0, 0); return d.getTime(); }
function minutesCh9(){ var c = sCh9(); return c.minutes + Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH9; }
function maintenantCh9(){ var c = sCh9(); return (c.base || baseJourCh9()) + (minutesCh9() - 360) * 60000; }
function jourCh9(){ return Math.floor(minutesCh9() / 1440) + 1; }
function heureCh9(){ var m = minutesCh9(); return "J" + (Math.floor(m / 1440) + 1) + " " + deuxChiffres(Math.floor(m % 1440 / 60)) + ":" + deuxChiffres(m % 60); }
function texteAvantSynchroCh9(){
	var reste = AUBE_CH9 - minutesCh9();
	if (reste <= 0) return "la Grande Synchronisation a sonné";
	var j = Math.floor(reste / 1440), h = Math.floor(reste % 1440 / 60), mn = reste % 60;
	return "la Grande Synchronisation dans " + (j ? j + " j " + h + " h" : (h ? h + " h " + deuxChiffres(mn) : mn + " min"));
}
/* Compter une commande (chaque commande simple au premier niveau ; ; && et tubes compris), plafonné par ligne. */
function compterCommandeCh9(n){
	if (!chroniqueOuverte()) return;
	if (typeof QUETES_CH9 !== "undefined" && !(state.quests && state.quests["n9_entree"]) && !sCh9().horlogeLibre) return;
	var c = sCh9();
	if (c.derniereLigne !== state.nbCommandes){ c.derniereLigne = state.nbCommandes; c.compteLigne = 0; }
	var k = Math.min(n || 1, PLAFOND_LIGNE_CH9 - c.compteLigne);
	if (k <= 0) return;
	c.compteLigne += k;
	c.compte = (c.compte || 0) + k;
}
var PROFONDEUR_CH9 = 0;
var APPELER_AVANT_HORLOGE_CH9 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	if (PROFONDEUR_CH9 === 0 && Shell.profondeur_script === 0) compterCommandeCh9(1);
	PROFONDEUR_CH9++;
	try { return APPELER_AVANT_HORLOGE_CH9.apply(this, arguments); }
	finally { PROFONDEUR_CH9--; }
};
/* Faire passer le temps : les commandes comptées ; une nuit qui tombe saute au matin (06:00). */
function avancerHorlogeCh9(){
	var c = sCh9(), nuits = 0;
	if (!c.base) c.base = baseJourCh9();
	c.minutes += Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH9;
	c.compteVu = c.compte || 0;
	var garde = 0;
	while (c.minutes % 1440 >= 22 * 60 && c.minutes < AUBE_CH9 && garde++ < 5 && !(state.has && state.has("rejeuEnCours"))){
		c.minutes = (Math.floor(c.minutes / 1440) + 1) * 1440 + 360;
		c.nuitsVues = (c.nuitsVues || 0) + 1;
		nuits++;
	}
	return { nuits: nuits, minutes: c.minutes, aube: c.minutes >= AUBE_CH9 };
}
function lieuDuChapitre10(lieu){ lieu.chapitre = 10; return lieu; }

/* Les sceaux du joueur portent l'heure du chapitre : git date ses commits avec l'horloge de la Chronothèque. */
if (typeof gitMaintenant === "function"){
	var GIT_MAINTENANT_AVANT_CH9 = gitMaintenant;
	gitMaintenant = function(h){ return chroniqueOuverte() ? maintenantCh9() : GIT_MAINTENANT_AVANT_CH9.apply(this, arguments); };
}

/* ------------------------------------------------------------------ */
/* Les Royaumes : la machine royaume, ses dépôts nus et sa forge         */
/* ------------------------------------------------------------------ */

var DOMAINE_CH9 = "chronique.lan";
var IP_ROYAUME_CH9 = "10.0.90.20";
var ROYAUME_CH9 = "royaume";
var NOYAU_CH9 = "6.12.9-amd64";
var RacineRoyaumeCh9 = null;
function estRoyaumeCh9(){ try { return !!(HOTES[ROYAUME_CH9] && HOTES[ROYAUME_CH9].arrivee && racineDe(HOTES[ROYAUME_CH9].arrivee()) === RacineRoyaumeCh9); } catch (e){ return false; } }
function refusRoyaumeCh9(){
	if (!estRoyaumeCh9()) return null;
	if (!state.has("ch9Ouvert")) return "ssh: Could not resolve hostname " + ROYAUME_CH9 + ": Name or service not known\n" + C.gris("(Cette machine est dans les Royaumes de la Chronique, au chapitre 9.)");
	return null;
}
function materielCh9(h){
	var base = baseJourCh9();
	return {
		cpus: 2, memoire: { total: 4026512, noyau: 180000, cache: 380000 }, demarrage: base - 30 * 3600000, fuseau: "Europe/Paris", derive: 0,
		demarrages: [{ idx: 0, debut: base - 30 * 3600000, noyau: NOYAU_CH9 }], noyauAttendu: NOYAU_CH9,
		disques: [{ nom: "vda", taille: 64 * 1073741824, modele: "QEMU HARDDISK", parts: [{ nom: "vda1", taille: 63 * 1073741824, partuuid: hexDe("pu9" + h, 8) + "-01" }], smart: { sain: true, realloues: 0, heures: 40, temperature: 31 } }],
		raid: [], pvs: [], vgs: [], lvs: [], virtuels: {},
		fs: [{ source: "/dev/vda1", cible: "/", type: "ext4", taille: 63 * 1073741824, inodes: 4128768, base: 2.4 * 1073741824, baseInodes: 91000, uuid: hexDe("uuid9-" + h, 8) + "-" + hexDe("uuid92-" + h, 4) + "-4" + hexDe("uuid93-" + h, 3) + "-8" + hexDe("uuid94-" + h, 3) + "-" + hexDe("uuid95-" + h, 12), reserve: 0.05, options: "errors=remount-ro", systeme: true },
			{ source: "tmpfs", cible: "/run", type: "tmpfs", taille: 396 * 1048576, virtuel: true, utilise: 2 * 1048576, inodes: 499000, inodesUtilises: 900, cache: true }],
		procs: [], io: { vda: { util: 2, r: 1, w: 3 } }, sockets: { estab: 4, closed: 0, orphaned: 0, timewait: 2 },
		dpkg: { interrompu: false, casses: [], retenus: [], aConfigurer: [] }, fabricant: "Les Royaumes de la Chronique", modele: "Archive " + h
	};
}
(function poserRoyaumeCh9(){
	var h = ROYAUME_CH9;
	var racine = lieuDuChapitre10(new Room(h, "La machine royaume : les Royaumes de la Chronique. Ici dorment les dépôts nus de l'école, ceux que tout le monde clone et vers lesquels tout le monde pousse. Et la forge, le Haut-Conseil, où l'on propose et relit chaque changement.", "loc_royaume_machine.gif"));
	racine.racineHote = h;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + h);
	if (typeof Machines !== "undefined") link_rooms(Machines, racine);
	RacineRoyaumeCh9 = racine;
	decrireHote(h, { ip: IP_ROYAUME_CH9, ouvert: true, noyau: NOYAU_CH9,
		arrivee: function(){ var m = racine.getChildFromName("home"); m = m && m !== -1 ? m.getChildFromName(JOUEUR) : null; return m && m !== -1 ? m : racine; },
		refus: function(){ return refusRoyaumeCh9(); } });
	var profils = {};
	if (typeof PROFILS_ILE !== "undefined") Object.keys(PROFILS_ILE).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_ILE[u](hh, M, lim); }; });
	declarerMachine(h, {
		actif: function(){ return chroniqueOuverte() && estRoyaumeCh9(); },
		maintenant: function(){ return maintenantCh9(); },
		pas: PAS_HORLOGE_CH9,
		initial: function(){ return materielCh9(h); },
		profils: profils,
		tempsDemarrage: { "ssh.service": 205, "cron.service": 28 }
	});
	var P = function(chemin, texte, options){ return poserFichierHote(h, chemin, texte, options || {}); };
	var D = function(chemin, options){ return creerDossierHote(h, chemin, options || {}); };
	P("/etc/hostname", h + "\n");
	P("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\t" + h + "." + DOMAINE_CH9 + " " + h + "\n" + IP_ROYAUME_CH9 + "\t" + h + "." + DOMAINE_CH9 + "\t" + h + "\n");
	P("/etc/resolv.conf", "search " + DOMAINE_CH9 + "\nnameserver 10.0.90.1\n");
	P("/etc/debian_version", "13.1\n");
	P("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 13 (trixie)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"13\"\nVERSION=\"13 (trixie)\"\nVERSION_CODENAME=trixie\nDEBIAN_VERSION_FULL=13.1\nID=debian\n");
	P("/etc/passwd", "root:x:0:0:root:/root:/bin/bash\ngit:x:997:997:git version control,,,:/srv/git:/usr/bin/git-shell\n" + JOUEUR + ":x:1000:1000:Gardien des Royaumes,,,:/home/" + JOUEUR + ":/bin/bash\n");
	P("/etc/shadow", "root:*:20374:0:99999:7:::\ngit:*:20374:0:99999:7:::\n" + JOUEUR + ":$y$j9T$" + hexDe("royaume-sel", 22) + "$" + hexDe("royaume-mdp", 43) + ":20378:0:99999:7:::\n", { mode: "rw-r-----" });
	P("/etc/group", "root:x:0:\nadm:x:4:" + JOUEUR + "\nsudo:x:27:" + JOUEUR + "\nusers:x:100:" + JOUEUR + "\ngit:x:997:" + JOUEUR + "\n" + JOUEUR + ":x:1000:\n");
	if (typeof SSHD_CONFIG_DEBIAN !== "undefined") P("/etc/ssh/sshd_config", SSHD_CONFIG_DEBIAN);
	P("/etc/ssh/ssh_host_ed25519_key.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + btoa(hexDe("hote9-" + h, 24)).substring(0, 43) + " root@" + h + "\n");
	["/usr/sbin/sshd", "/usr/bin/git", "/usr/bin/git-shell", "/usr/lib/git-core/git-receive-pack", "/usr/lib/git-core/git-upload-pack"].forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x", binaire: { sortie: "" } }); });
	D("/root", { mode: "rwx------" });
	D("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	D("/home/" + JOUEUR + "/.ssh", { owner: JOUEUR, mode: "rwx------" });
	D("/tmp", { mode: "rwxrwxrwt" });
	D("/var/log");
	D("/srv/git", { owner: JOUEUR, mode: "rwxrwsr-x" });
	P("/srv/git/LISEZMOI", "Les dépôts nus de l'école. On ne travaille pas ici : on clone, on travaille chez soi, on pousse.\n" +
		"  chronique.git    la Chronique de Cybersup (la vraie)\n\n" +
		"Un dépôt nu n'a pas de copie de travail : seulement ce que contient un dossier .git.\n");
	(function marquer(lieu){ lieu.children.forEach(function(x){ if (x !== lieu && x.parents[0] === lieu){ x.horsBareme = true; x.chapitre = 10; marquer(x); } }); })(racine);
})();
function declarerUnitesCh9(){
	var c = sCh9();
	if (c.unitesDeclarees || !estRoyaumeCh9()) return;
	c.unitesDeclarees = true;
	[["ssh.service", true, true], ["cron.service", true, true], ["systemd-journald.service", true, true]].forEach(function(x){ try { declarerUnite(ROYAUME_CH9, x[0], { actif: x[1], enabled: x[2] }); } catch (e){} });
	try { declarerEcoute(ROYAUME_CH9, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }]); } catch (e){}
	try { declarerNoyau(ROYAUME_CH9, { version: NOYAU_CH9 }); } catch (e){}
	try { synchroniserUnites(ROYAUME_CH9); } catch (e){}
}

/* ------------------------------------------------------------------ */
/* Les personnages qui ont écrit l'histoire (les auteurs des sceaux)    */
/* ------------------------------------------------------------------ */

var SCRIBES_CH9 = {
	gamaliel: { nom: "Gamaliel", mail: "gamaliel@chronique.lan" },
	benedicte: { nom: "Bénédicte", mail: "benedicte@chronique.lan" },
	andrii: { nom: "Andrii", mail: "andrii@chronique.lan" },
	irvan: { nom: "Irvan", mail: "irvan@chronique.lan" },
	georgette: { nom: "Georgette", mail: "georgette@chronique.lan" },
	william: { nom: "William", mail: "william@chronique.lan" },
	marc: { nom: "Marc", mail: "marc@chronique.lan" },
	kenyonn: { nom: "Kenyonn", mail: "kenyonn@chronique.lan" },
	anthony: { nom: "Anthony", mail: "anthony@chronique.lan" },
	guillaume: { nom: "Guillaume", mail: "guillaume@chronique.lan" },
	moustapha: { nom: "Moustapha", mail: "moustapha@chronique.lan" },
	jeremy: { nom: "Jeremy", mail: "jeremy@chronique.lan" },
	aurelien: { nom: "Aurélien", mail: "aurelien@chronique.lan" },
	amine: { nom: "Amine", mail: "amine@chronique.lan" },
	grace: { nom: "Grace", mail: "grace@warroom.cybersup.lan" },
	laurent: { nom: "Laurent", mail: "laurent@cybersup.lan" },
	kevin: { nom: "Kévin", mail: "kevin@chronique.lan" },
	pg: { nom: "pg", mail: "pg@chronique.lan" },
	gris: { nom: "Scribe gris", mail: "scribe.gris@chronique.lan" },
	presse: { nom: "Apprenti pressé", mail: "presse@chronique.lan" }
};
/* Une date de l'histoire : 2026, mois, jour, heure (heure de Paris, été). */
function dateCh9(mois, jour, heure, minute){ return Math.floor(Date.UTC(2026, mois - 1, jour, (heure || 10) - 2, minute || 0) / 1000); }

/* ------------------------------------------------------------------ */
/* Les dossiers et les fichiers de la Maison                            */
/* ------------------------------------------------------------------ */

var RACINE_CH9 = "~/chronotheque";
var DEPOTS_CH9 = {
	premier: RACINE_CH9 + "/premier-sceau",
	autel: RACINE_CH9 + "/autel",
	profane: RACINE_CH9 + "/autel-profane",
	annales: RACINE_CH9 + "/annales",
	contresorts: RACINE_CH9 + "/contresorts",
	experiences: RACINE_CH9 + "/experiences",
	ombres: RACINE_CH9 + "/livre-ombres",
	page: RACINE_CH9 + "/page-arrachee",
	pageNu: RACINE_CH9 + "/page-arrachee.git",
	lignes: RACINE_CH9 + "/lignes",
	paradoxe: RACINE_CH9 + "/paradoxe",
	chimere: RACINE_CH9 + "/chimere",
	besace: RACINE_CH9 + "/besace",
	labyrinthe: RACINE_CH9 + "/labyrinthe",
	prophetie: RACINE_CH9 + "/prophetie",
	cartes: RACINE_CH9 + "/cartes",
	epreuve4: RACINE_CH9 + "/chant-des-marees",
	runes: RACINE_CH9 + "/runes",
	chronique: RACINE_CH9 + "/chronique",
	rapport: RACINE_CH9 + "/rapport.txt"
};
var DEPOT_ROYAUME_CH9 = "/srv/git/chronique.git";
var URL_ROYAUME_CH9 = ROYAUME_CH9 + ":" + DEPOT_ROYAUME_CH9;

/* Un dossier de la Maison (créé au besoin, au joueur), hors barème : ce n'est pas un lieu à visiter. */
function dossierIleCh9(chemin){
	var lieu = Home, morceaux = String(chemin).replace(/^~\/?/, "").split("/").filter(Boolean);
	morceaux.forEach(function(m){
		var n = lieu.getNode(m);
		if (!(n instanceof Room)){
			n = new Room(m, "Un dossier de ta Maison.", "loc_chronotheque_dossier.gif");
			n.owner = JOUEUR;
			n.mode = "rwxr-xr-x";
			n.horsBareme = true;
			link_rooms(lieu, n);
		}
		lieu = n;
	});
	return lieu;
}
function fichierIleCh9(chemin, texte, options){
	options = options || {};
	var coupe = chemin.lastIndexOf("/");
	var d = dossierIleCh9(chemin.substring(0, coupe));
	var nom = chemin.substring(coupe + 1);
	var it = d.getNode(nom);
	if (it instanceof Room) return null;
	if (!it){ it = new Item(nom, "", options.image || "item_manuscript.gif"); d.addItem(it); }
	it.setText(String(texte).replace(/\n$/, ""));
	it.owner = JOUEUR;
	it.mode = options.mode || "rw-r--r--";
	return it;
}
function texteIleCh9(chemin){
	try { var r = Shell.chercherDepuis(Home, chemin, { sudo: true }, "cat"); return r.node && !(r.node instanceof Room) ? r.node.getText() : null; } catch (e){ return null; }
}
function existeIleCh9(chemin){
	try { var r = Shell.chercherDepuis(Home, chemin, { sudo: true }, "ls"); return !!r.node; } catch (e){ return false; }
}

/* ------------------------------------------------------------------ */
/* Les textes des dépôts                                               */
/* ------------------------------------------------------------------ */

var TEXTES_CH9 = {
	grimoire: "# Le Grimoire de l'apprenti\n\nCe grimoire est le premier que tu scelles.\nChaque sceau garde une version de ce dossier, pour toujours.\n\n## Ce que je sais déjà\n- un sceau, c'est un commit\n- l'autel, c'est l'index (la zone de préparation)\n",
	sortsAppris: "Sorts appris à la Chronothèque :\n- git init\n",
	carteApprenti: "Carte de la Chronothèque, dessinée de mémoire :\n\n        [Salle des Sceaux]\n               |\n  [Autel] -- [Grand Sablier] -- [Crypte des Runes]\n               |\n          [Oracle]\n",
	appAutel: function(cierge, eteint){
		return "# autel.py : les rituels de l'autel des offrandes.\n" +
			"import datetime\n\n" +
			"CIERGES = [\"aube\", \"midi\", \"crepuscule\", \"minuit\"]\n\n\n" +
			"def allumer_cierge(nom):\n" +
			"    \"\"\"Allume un cierge de l'autel.\"\"\"\n" +
			"    if nom not in CIERGES:\n" +
			"        raise ValueError(\"cierge inconnu : \" + nom)\n" +
			(cierge ? "    print(\"Le cierge\", nom, \"s'allume à\", datetime.datetime.now().strftime(\"%H:%M\"))  # cierge-allume\n" : "    print(\"Le cierge\", nom, \"s'allume.\")\n") +
			"    return True\n\n\n" +
			"def compter_cierges():\n" +
			"    \"\"\"Combien de cierges l'autel connaît.\"\"\"\n" +
			"    return len(CIERGES)\n\n\n" +
			"def lister_cierges():\n" +
			"    \"\"\"Les cierges, dans l'ordre du jour.\"\"\"\n" +
			"    for nom in CIERGES:\n" +
			"        print(\"-\", nom)\n\n\n" +
			"def bénir_autel():\n" +
			"    \"\"\"Une bénédiction, sans effet sur les cierges.\"\"\"\n" +
			"    print(\"L'autel est béni.\")\n\n\n" +
			"def eteindre_cierge(nom):\n" +
			"    \"\"\"Éteint un cierge de l'autel.\"\"\"\n" +
			(eteint ? "    if nom not in CIERGES:  # cierge-eteint\n        raise ValueError(\"cierge inconnu : \" + nom)\n" : "") +
			"    print(\"Le cierge\", nom, \"s'éteint.\")\n" +
			"    return False\n";
	},
	appProfane: function(nord, sud){
		return "# registre.py : le registre des noms de l'école.\n" +
			"NOMS = []\n\n\n" +
			"def graver_nom(nom):\n" +
			"    \"\"\"Grave un nom dans le registre.\"\"\"\n" +
			(nord ? "    nom = nom.strip().title()  # sceau-nord\n" : "") +
			"    NOMS.append(nom)\n" +
			"    return len(NOMS)\n\n\n" +
			"def lire_noms():\n" +
			"    \"\"\"Tous les noms gravés.\"\"\"\n" +
			"    return list(NOMS)\n\n\n" +
			"def compter_noms():\n" +
			"    \"\"\"Combien de noms.\"\"\"\n" +
			"    return len(NOMS)\n\n\n" +
			"def premier_nom():\n" +
			"    \"\"\"Le premier nom gravé, ou rien.\"\"\"\n" +
			"    return NOMS[0] if NOMS else None\n\n\n" +
			"def effacer_nom(nom):\n" +
			"    \"\"\"Efface un nom du registre.\"\"\"\n" +
			(sud ? "    if nom not in NOMS:  # sceau-sud\n        return False\n" : "") +
			"    NOMS.remove(nom)\n" +
			"    return True\n";
	}
};

/* Les lois de l'école (annales) : la ligne 12 est celle que pg a glissée. */
var LOIS_CH9 = ["# Les lois de la Chronothèque", "",
	"1. Tout ce qui est publié est scellé.",
	"2. Un sceau ne s'efface pas : on en pose un autre qui le contredit.",
	"3. Chaque sceau porte le nom de son scribe.",
	"4. Un sceau dit pourquoi, pas seulement quoi.",
	"5. Nul ne scelle un mot de passe.",
	"6. On relit avant de fusionner.",
	"7. Une ligne du destin se nomme par ce qu'elle fait.",
	"8. Le Grand Sablier ne s'arrête jamais.",
	"9. Les Royaumes gardent la copie de tous.",
	"10. Nul ne réécrit la Chronique publiée."];
var LIGNE_PG_CH9 = "La Porte d'Argent ne s'ouvre qu'au porteur du sceau gris.";

/* ------------------------------------------------------------------ */
/* Semer : chaque dépôt, une leçon                                     */
/* ------------------------------------------------------------------ */

function auteurCh9(cle){ return SCRIBES_CH9[cle] || SCRIBES_CH9.gamaliel; }
/* Un constructeur sur l'île (h = null) ; null si le moteur Git n'est pas là. */
function constructeurCh9(chemin, options){
	if (typeof gitConstructeur !== "function") return null;
	dossierIleCh9(chemin);
	return gitConstructeur(null, chemin, options || { branche: "main" });
}
function noterHashCh9(cle, hash){ sCh9().hash[cle] = hash; return hash; }
function HASH_CH9(cle){ return sCh9().hash[cle] || null; }

/* Acte I : le premier sceau (pas encore un dépôt), et l'autel. */
function semerPremierCh9(){
	fichierIleCh9(DEPOTS_CH9.premier + "/grimoire.md", TEXTES_CH9.grimoire);
	fichierIleCh9(DEPOTS_CH9.premier + "/sorts.txt", TEXTES_CH9.sortsAppris);
	fichierIleCh9(DEPOTS_CH9.premier + "/carte.txt", TEXTES_CH9.carteApprenti);
}
function semerAutelCh9(){
	var g = constructeurCh9(DEPOTS_CH9.autel);
	if (!g) return;
	var a = auteurCh9("benedicte");
	noterHashCh9("autelBase", g.commit({ auteur: a, date: dateCh9(10, 2, 9, 12), message: "autel: pose l'autel et ses quatre cierges",
		fichiers: { "autel.py": TEXTES_CH9.appAutel(false, false), "README.md": "# L'Autel des Offrandes\n\nOn y dépose ce qui mérite d'être scellé, et rien d'autre.\n",
			"__pycache__/autel.cpython-312.pyc": "\u0000\u0000PYC-autel-1\u0000(compilé par python, à ne jamais sceller)\n" } }));
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.autel + "/autel.py", TEXTES_CH9.appAutel(true, true));
	fichierIleCh9(DEPOTS_CH9.autel + "/.env", "MOT_DE_PASSE=Cierge-Dor-2026\nCLE_FORGE=fg_7c1e0a9d44b2\n", { mode: "rw-------" });
	fichierIleCh9(DEPOTS_CH9.autel + "/journal.log", "09:14 cierge aube allumé\n09:15 cierge midi allumé\n");
	fichierIleCh9(DEPOTS_CH9.autel + "/__pycache__/autel.cpython-312.pyc", "\u0000\u0000PYC-autel-2\u0000(compilé par python, à ne jamais sceller)\n");
}
/* L'épreuve I : le sceau d'un apprenti pressé, qui a tout scellé. */
function semerProfaneCh9(){
	var g = constructeurCh9(DEPOTS_CH9.profane);
	if (!g) return;
	g.commit({ auteur: auteurCh9("benedicte"), date: dateCh9(10, 3, 10), message: "registre: pose le registre des noms", fichiers: { "registre.py": TEXTES_CH9.appProfane(false, false), "README.md": "# Le registre des noms\n" } });
	noterHashCh9("profaneTout", g.commit({ auteur: auteurCh9("presse"), date: dateCh9(10, 3, 23, 58), message: "ajoute tout",
		fichiers: { ".env": "MOT_DE_PASSE=Registre-Noir-77\n", "__pycache__/registre.cpython-312.pyc": "\u0000\u0000PYC-registre\u0000\n", "logs/rituel.log": "23:57 rituel lancé\n23:58 rituel fini\n" } }));
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.profane + "/registre.py", TEXTES_CH9.appProfane(true, true));
	fichierIleCh9(DEPOTS_CH9.profane + "/logs/rituel.log", "23:57 rituel lancé\n23:58 rituel fini\n00:03 rituel relancé\n");
	fichierIleCh9(DEPOTS_CH9.profane + "/NOTE.txt", "Note de Bénédicte : l'apprenti pressé a tout scellé d'un coup, hier soir, sans rien regarder.\n" +
		"Et il a laissé deux changements dans registre.py, sans les sceller : l'un dans graver_nom, l'autre dans effacer_nom.\n" +
		"Deux changements, deux raisons : deux sceaux.\n");
}

/* Acte II : les annales, cinquante sceaux à fouiller. */
function semerAnnalesCh9(){
	var g = constructeurCh9(DEPOTS_CH9.annales);
	if (!g) return;
	// Les lois grandissent : 1 à 5, puis 6 et 7, puis 8 et 9 ; pg glisse sa ligne après la neuvième ; Laurent ajoute la dixième.
	// À la fin, la ligne 12 de lois.md est celle de pg.
	var loisFinales = LOIS_CH9.slice(0, 11).concat([LIGNE_PG_CH9]).concat(LOIS_CH9.slice(11));
	var lois = LOIS_CH9.slice(0, 7), carte = "La carte de l'île\n\nAu sud : le Vieux Port.\nAu nord : la Chronothèque.\n";
	var chronique = ["# Les annales de Cybersup", ""], registre = ["Le registre des promotions", ""];
	var tours = ["gamaliel", "benedicte", "andrii", "irvan", "grace", "georgette", "william", "marc", "grace", "kenyonn", "anthony", "guillaume", "grace", "moustapha", "jeremy", "aurelien", "amine", "laurent", "grace"];
	var evenements = ["la rentrée des premières années", "l'ouverture de la WarRoom", "la panne du bâtiment B", "la chasse au Corbeau", "la nuit de l'Académie",
		"l'inspection du Bastion", "la Longue Nuit de Lumen", "la fête de Port-Aube", "le premier convoi", "la tempête de septembre", "le concours de la Crypte",
		"la visite des parents", "le Grand Jobdating", "la remise des diplômes", "la mise en service du Grand Sablier", "le premier afterwork", "la nuit des runes",
		"la course des rangs", "la venue des maîtres du port", "le bal des lanternes", "l'inventaire des archives", "la réparation de la grande horloge",
		"la marée de septembre", "l'arrivée des quinze", "la fondation du Haut-Conseil", "le gel des Royaumes", "la fête des scribes", "le premier sceau signé",
		"la nuit sans lune", "la crue du canal", "le tournoi des terminaux", "l'éclipse", "la journée portes ouvertes", "la venue de l'inspecteur", "l'orage d'octobre",
		"la remise des sceaux", "la rentrée des M1", "la nuit des archives", "la panne du sablier", "la reconstruction de la tour", "le festival des lumières",
		"le retour des navires", "la grande relecture", "la veille de la synchronisation", "le dernier convoi", "la nuit blanche", "la promesse des maîtres", "le silence des Royaumes"];
	var nGrace = 0;
	for (var i = 0; i < 50; i++){
		var cle = tours[i % tours.length];
		var f = {}, msg, auteur = auteurCh9(cle), jour = 1 + Math.floor(i * 30 / 50), mois = 9 + Math.floor(jour / 31);
		jour = jour % 31 || 1;
		if (i === 22){
			// La coquille de pg : une loi glissée parmi les autres, sous un message anodin.
			lois = LOIS_CH9.slice(0, 11).concat([LIGNE_PG_CH9]);
			f["lois.md"] = lois.join("\n") + "\n";
			auteur = auteurCh9("pg");
			msg = "lois: corrige une coquille";
		} else if (i === 30){
			carte = carte.replace("le Vieux Port", "Port-Aube");
			f["carte.txt"] = carte;
			msg = "carte: le Vieux Port devient Port-Aube";
		} else if (i === 7 || i === 14){
			lois = LOIS_CH9.slice(0, i === 7 ? 9 : 11);
			f["lois.md"] = lois.join("\n") + "\n";
			msg = "lois: ajoute les lois " + (i === 7 ? "6 et 7" : "8 et 9");
		} else if (i % 5 === 1){
			registre.push("Promotion " + (2010 + i) + " : " + (12 + i) + " scribes");
			f["registre.txt"] = registre.join("\n") + "\n";
			msg = "registre: ajoute la promotion " + (2010 + i);
		} else {
			chronique.push("- " + evenements[i % evenements.length] + " (" + deuxChiffres(jour) + "/" + deuxChiffres(mois) + ")");
			f["chronique.md"] = chronique.join("\n") + "\n";
			msg = "chronique: raconte " + evenements[i % evenements.length];
		}
		if (i === 0){ f["carte.txt"] = carte; f["lois.md"] = lois.join("\n") + "\n"; f["registre.txt"] = registre.join("\n") + "\n"; msg = "annales: ouvre les annales de l'école"; }
		if (auteur.nom === "Grace") nGrace++;
		var h = g.commit({ auteur: auteur, date: dateCh9(mois, jour, 9 + (i % 9), (i * 7) % 60), message: msg, fichiers: f });
		if (i === 22) noterHashCh9("annalesPg", h);
		if (i === 12) g.tag("v-ete", h, { annote: true, message: "La fin de l'été", auteur: auteurCh9("laurent"), date: dateCh9(9, 9, 18) });
		if (i === 40) g.tag("v-automne", h, { annote: true, message: "Le début de l'automne", auteur: auteurCh9("laurent"), date: dateCh9(10, 2, 18) });
	}
	// La fin des lois, après la coquille (la ligne 12 reste celle de pg).
	g.commit({ auteur: auteurCh9("laurent"), date: dateCh9(10, 5, 17), message: "lois: complète les dix lois", fichiers: { "lois.md": loisFinales.join("\n") + "\n" } });
	sCh9().nGraceAnnales = nGrace;
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.annales + "/REPONSES.md", "# Les réponses de l'Oracle\n\nÉcris chaque réponse sur la ligne « Réponse : » qui suit la question.\n\n" +
		"1. Le hash court du sceau qui a fait entrer « Porte d'Argent » dans les lois (git log -S) :\n   Réponse : \n\n" +
		"2. Le nom du scribe de la ligne 12 de lois.md (git blame) :\n   Réponse : \n\n" +
		"3. Combien de sceaux Grace a-t-elle posés dans ces annales (git log --author) :\n   Réponse : \n\n" +
		"4. Au menhir v-ete, comment s'appelait le port du sud dans carte.txt (git show v-ete:carte.txt) :\n   Réponse : \n");
}
/* Les contre-sorts : réparer sans casser. */
function semerContresortsCh9(){
	var g = constructeurCh9(DEPOTS_CH9.contresorts);
	if (!g) return;
	var a = auteurCh9("georgette");
	var portes = "Les portes de la Chronothèque\n\nPorte nord : la porte des aubes\nPorte sud : la porte des marées\n";
	g.commit({ auteur: a, date: dateCh9(10, 6, 9), message: "portes: pose les portes nord et sud", fichiers: { "portes.txt": portes, "sorts.txt": "Les contre-sorts\n\n- restore\n- reset\n- revert\n", "grimoire.md": "# Le grimoire des contre-sorts\n" } });
	noterHashCh9("porteRetiree", g.commit({ auteur: auteurCh9("william"), date: dateCh9(10, 6, 11), message: "portes: retire la porte nord", fichiers: { "portes.txt": portes.replace("Porte nord : la porte des aubes\n", "") } }));
	g.commit({ auteur: a, date: dateCh9(10, 6, 14), message: "sorts: ajoute amend", fichiers: { "sorts.txt": "Les contre-sorts\n\n- restore\n- reset\n- revert\n- commit --amend\n" } });
	noterHashCh9("sceauSoire", g.commit({ auteur: a, date: dateCh9(10, 6, 18), message: "sceau: ajoute le sceau du soire", fichiers: { "sceau.txt": "Le sceau du soir : un cercle, une étoile, une clé.\n" } }));
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.contresorts + "/sorts.txt", "Les contre-sorts\n\nATTENTION ICI UN SORT A ÉCRASÉ LA LISTE\n");
	fichierIleCh9(DEPOTS_CH9.contresorts + "/grimoire.md", "# Le grimoire des contre-sorts\n\nUne page en cours, pas prête à sceller.\n");
	if (typeof gitAjouterIndex === "function") gitAjouterIndex(null, DEPOTS_CH9.contresorts, "grimoire.md");
	else sCh9().grimoireAIndexer = true;
	fichierIleCh9(DEPOTS_CH9.contresorts + "/NOTE.txt", "Note de Georgette :\n" +
		"1. sorts.txt a été écrasé par erreur : rends-lui sa version scellée (restore).\n" +
		"2. grimoire.md a été posé sur l'autel trop tôt : retire-le de l'autel, sans perdre ce qui est écrit (restore --staged).\n" +
		"3. Le dernier sceau dit « soire » : corrige son message (commit --amend).\n" +
		"4. William a retiré la porte nord, et ce sceau est déjà connu de tous : annule-le par un contre-sort (revert), sans réécrire l'histoire.\n");
	// Les expériences : trois essais, pour voir ce que font les trois resets.
	var e = constructeurCh9(DEPOTS_CH9.experiences);
	if (!e) return;
	e.commit({ auteur: a, date: dateCh9(10, 7, 9), message: "essai 1: une flamme", fichiers: { "essai.txt": "flamme\n" } });
	e.commit({ auteur: a, date: dateCh9(10, 7, 10), message: "essai 2: une flamme et du vent", fichiers: { "essai.txt": "flamme\nvent\n" } });
	e.commit({ auteur: a, date: dateCh9(10, 7, 11), message: "essai 3: une flamme, du vent et de l'eau", fichiers: { "essai.txt": "flamme\nvent\neau\n" } });
	e.commit({ auteur: a, date: dateCh9(10, 7, 12), message: "essai 4: tout brûle", fichiers: { "essai.txt": "flamme\nvent\neau\nTOUT BRÛLE\n" } });
	e.extraire();
}
/* Le Livre des ombres : une ligne du destin effacée, que seul le reflog se rappelle. */
function semerOmbresCh9(){
	var g = constructeurCh9(DEPOTS_CH9.ombres);
	if (!g) return;
	var a = auteurCh9("william");
	g.commit({ auteur: a, date: dateCh9(10, 8, 9), message: "ombres: ouvre le livre", fichiers: { "livre.txt": "Le Livre des ombres\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 8, 10), message: "ombres: la première ombre", fichiers: { "livre.txt": "Le Livre des ombres\n\nLa première ombre : celle qui suit.\n" } });
	g.branche("verite");
	g.basculer("verite");
	g.commit({ auteur: a, date: dateCh9(10, 8, 11), message: "verite: le premier témoin parle", fichiers: { "verite.txt": "Premier témoin : il a vu une plume grise.\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 8, 12), message: "verite: le second témoin parle", fichiers: { "verite.txt": "Premier témoin : il a vu une plume grise.\nSecond témoin : la plume signait P.G.\n" } });
	noterHashCh9("verite", g.commit({ auteur: a, date: dateCh9(10, 8, 13), message: "verite: le troisième témoin parle", fichiers: { "verite.txt": "Premier témoin : il a vu une plume grise.\nSecond témoin : la plume signait P.G.\nTroisième témoin : elle écrivait la nuit, dans la Chronique.\n" } }));
	g.basculer("main");
	g.supprimerBranche("verite");
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.ombres + "/NOTE.txt", "Note de William : hier soir, quelqu'un a effacé la ligne du destin « verite » (git branch -D).\nTrois témoins y parlaient. Une branche effacée n'est qu'un nom perdu : les sceaux, eux, sont encore là.\nRetrouve le dernier, et redonne-lui son nom : verite.\n");
}
/* L'épreuve II : la page arrachée. Du travail perdu par un reset --hard, et un mauvais sceau déjà publié. */
function semerPageCh9(){
	if (typeof gitConstructeur !== "function") return;
	dossierIleCh9(DEPOTS_CH9.pageNu);
	var nu = gitConstructeur(null, DEPOTS_CH9.pageNu, { nu: true, branche: "main" });
	var g = constructeurCh9(DEPOTS_CH9.page);
	var a = auteurCh9("william"), carte = "La carte des Royaumes\n\nÀ l'est : les Royaumes alliés.\nÀ l'ouest : la mer des brumes.\nAu large : la flotte noire, ennemie de l'école.\n";
	g.commit({ auteur: a, date: dateCh9(10, 9, 9), message: "page: ouvre le journal de bord", fichiers: { "journal.txt": "Journal de bord\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 9, 10), message: "carte: dessine la carte des Royaumes", fichiers: { "carte.txt": carte } });
	noterHashCh9("pageCarte", g.commit({ auteur: a, date: dateCh9(10, 9, 11), message: "journal: le premier jour", fichiers: { "journal.txt": "Journal de bord\n\nJour 1 : la Chronothèque ouvre ses portes.\n" } }));
	noterHashCh9("pageMauvais", g.commit({ auteur: auteurCh9("gris"), date: dateCh9(10, 9, 23, 41), message: "carte: met la carte à jour", fichiers: { "carte.txt": carte.replace("la flotte noire, ennemie de l'école", "la flotte noire, amie de l'école") } }));
	g.remote("origin", "../page-arrachee.git");
	g.pousser("origin", "main");
	g.commit({ auteur: a, date: dateCh9(10, 10, 9), message: "journal: le deuxième jour", fichiers: { "journal.txt": "Journal de bord\n\nJour 1 : la Chronothèque ouvre ses portes.\nJour 2 : les maîtres arrivent.\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 10, 12), message: "journal: le troisième jour", fichiers: { "journal.txt": "Journal de bord\n\nJour 1 : la Chronothèque ouvre ses portes.\nJour 2 : les maîtres arrivent.\nJour 3 : le Grand Sablier se remet en marche.\n" } });
	noterHashCh9("pagePerdu", g.commit({ auteur: a, date: dateCh9(10, 10, 15), message: "journal: le quatrième jour", fichiers: { "journal.txt": "Journal de bord\n\nJour 1 : la Chronothèque ouvre ses portes.\nJour 2 : les maîtres arrivent.\nJour 3 : le Grand Sablier se remet en marche.\nJour 4 : une plume grise est vue près de la Chronique.\n" } }));
	g.resetDur(HASH_CH9("pageMauvais"), { auteur: auteurCh9("gris"), date: dateCh9(10, 10, 23, 50) });
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.page + "/NOTE.txt", "Note de William, au petit matin :\n" +
		"Cette nuit, quelqu'un est entré ici. Trois jours du journal de bord ont disparu : un reset --hard, d'après le Livre des ombres.\n" +
		"Et un sceau « carte: met la carte à jour » a été poussé vers page-arrachee.git, le dépôt que tout le monde partage. Lis la carte.\n");
}

/* Acte III : les lignes du destin, les paradoxes, la besace et la relique. */
function semerLignesCh9(){
	var g = constructeurCh9(DEPOTS_CH9.lignes);
	if (!g) return;
	var a = auteurCh9("marc");
	// main : deux sceaux. carte part du second (main ne bougera plus : avancer suffira) ; sceau aussi ; legende part du premier
	// (les deux lignes ont divergé : trois voies).
	var premier = g.commit({ auteur: a, date: dateCh9(10, 11, 9), message: "destin: pose la première ligne", fichiers: { "destin.txt": "La ligne principale\n", "README.md": "# Les lignes du destin\n\nChaque ligne du destin est un nom posé sur un sceau.\n" } });
	noterHashCh9("lignesBase", g.commit({ auteur: a, date: dateCh9(10, 11, 10), message: "destin: la ligne principale avance", fichiers: { "destin.txt": "La ligne principale\nElle avance.\n" } }));
	g.branche("carte", HASH_CH9("lignesBase"));
	g.basculer("carte");
	g.commit({ auteur: auteurCh9("kenyonn"), date: dateCh9(10, 11, 11), message: "carte: dessine le nord", fichiers: { "carte.txt": "Le nord : la Chronothèque.\n" } });
	noterHashCh9("lignesCarte", g.commit({ auteur: auteurCh9("kenyonn"), date: dateCh9(10, 11, 12), message: "carte: dessine le sud", fichiers: { "carte.txt": "Le nord : la Chronothèque.\nLe sud : Port-Aube.\n" } }));
	g.basculer("main");
	g.branche("sceau");
	g.basculer("sceau");
	noterHashCh9("lignesSceau", g.commit({ auteur: auteurCh9("anthony"), date: dateCh9(10, 11, 13), message: "sceau: grave le sceau de la ligne", fichiers: { "sceau.txt": "Un cercle, une étoile, une clé.\n" } }));
	g.basculer("main");
	g.branche("legende", premier);
	g.basculer("legende");
	noterHashCh9("lignesLegende", g.commit({ auteur: auteurCh9("guillaume"), date: dateCh9(10, 11, 15), message: "legende: écrit la légende de la carte", fichiers: { "legende.txt": "Les cercles sont des salles, les traits des couloirs.\n" } }));
	g.basculer("main");
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.lignes + "/NOTE.txt", "Note de Marc : trois lignes attendent d'être réunies à main.\n" +
		"  carte   : partie de main il y a deux sceaux ; regarde le graphe : main a-t-elle bougé depuis ?\n" +
		"  legende : partie de main, et main a avancé depuis : les deux lignes ont divergé.\n" +
		"  sceau   : réunis-la en gardant la trace de la ligne, même si Git pourrait faire autrement (--no-ff).\n" +
		"Commence toujours par git log --oneline --graph --all.\n");
}
function semerParadoxeCh9(){
	var g = constructeurCh9(DEPOTS_CH9.paradoxe);
	if (!g) return;
	var a = auteurCh9("kenyonn");
	var p = ["La prophétie du nord", "", "Au premier jour, la Chronique s'éveille.", "Au nord, le vent se lève.", "Au sud, la mer se tait.", "Au troisième jour, les Royaumes écoutent.", "Au dernier jour, le sablier se retourne."];
	g.commit({ auteur: a, date: dateCh9(10, 12, 9), message: "prophetie: écrit la prophétie du nord", fichiers: { "prophetie.txt": p.join("\n") + "\n" } });
	g.branche("prophetie-sud");
	var main = p.slice(); main[3] = "Au nord, la tempête se lève.";
	noterHashCh9("paradoxeMain", g.commit({ auteur: a, date: dateCh9(10, 12, 10), message: "prophetie: la tempête du nord", fichiers: { "prophetie.txt": main.join("\n") + "\n" } }));
	g.basculer("prophetie-sud");
	var sud = p.slice(); sud[3] = "Au nord, le vent se tait."; sud[4] = "Au sud, la mer se lève.";
	noterHashCh9("paradoxeSud", g.commit({ auteur: auteurCh9("marc"), date: dateCh9(10, 12, 11), message: "prophetie: le sud se lève", fichiers: { "prophetie.txt": sud.join("\n") + "\n" } }));
	g.basculer("main");
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.paradoxe + "/NOTE.txt", "Note de Kenyonn : deux prophètes ont écrit le même vers, chacun sur sa ligne du destin.\n" +
		"Réunis prophetie-sud à main. Git ne choisira pas pour toi : à toi de trancher le paradoxe.\n" +
		"La vraie prophétie : au nord, la tempête se lève ; au sud, la mer se lève.\n");
	// La chimère : une fusion qui réussit, et un monde faux.
	var c = constructeurCh9(DEPOTS_CH9.chimere);
	if (!c) return;
	var lib1 = "# lib.sh : les rituels de base.\nallumer() {\n  echo \"Le feu prend : $1\"\n}\n";
	var lib2 = "# lib.sh : les rituels de base.\n# allumer a été renommé embraser : il prend aussi les braises.\nembraser() {\n  echo \"Le feu prend : $1\"\n}\n";
	var verif = "#!/bin/bash\n# Vérifie que chaque rituel n'appelle que des sorts qui existent dans lib.sh.\nfor f in rituels/aube.sh rituels/crepuscule.sh; do\n  if [ -f \"$f\" ] && grep -q \"allumer\" \"$f\"; then\n    echo \"ÉCHEC : $f appelle allumer, qui n'existe plus dans rituels/lib.sh.\"\n    exit 1\n  fi\ndone\necho \"Tous les rituels tiennent.\"\nexit 0\n";
	c.commit({ auteur: a, date: dateCh9(10, 12, 13), message: "rituels: pose lib.sh et le rituel de l'aube", fichiers: { "rituels/lib.sh": lib1, "rituels/aube.sh": "#!/bin/bash\n. rituels/lib.sh\nallumer aube\n", "verifier.sh": verif } });
	c.branche("crepuscule");
	noterHashCh9("chimereMain", c.commit({ auteur: auteurCh9("marc"), date: dateCh9(10, 12, 14), message: "rituels: renomme allumer en embraser", fichiers: { "rituels/lib.sh": lib2, "rituels/aube.sh": "#!/bin/bash\n. rituels/lib.sh\nembraser aube\n" } }));
	c.basculer("crepuscule");
	noterHashCh9("chimereBranche", c.commit({ auteur: auteurCh9("anthony"), date: dateCh9(10, 12, 15), message: "rituels: ajoute le rituel du crépuscule", fichiers: { "rituels/crepuscule.sh": "#!/bin/bash\n. rituels/lib.sh\nallumer crepuscule\n" } }));
	c.basculer("main");
	c.extraire();
	try { var v = Shell.chercherDepuis(Home, DEPOTS_CH9.chimere + "/verifier.sh", { sudo: true }, "chmod"); if (v.node && !(v.node instanceof Room)) v.node.mode = "rwxr-xr-x"; } catch (e){}
	fichierIleCh9(DEPOTS_CH9.chimere + "/NOTE.txt", "Note de Kenyonn : réunis crepuscule à main. Git ne signalera aucun conflit.\nPuis lance ./verifier.sh. Une fusion sans conflit n'est pas une fusion juste.\n");
}
function semerBesaceCh9(){
	var g = constructeurCh9(DEPOTS_CH9.besace);
	if (!g) return;
	var a = auteurCh9("anthony");
	g.commit({ auteur: a, date: dateCh9(10, 13, 9), message: "runes: grave les runes de la porte", fichiers: { "runes.txt": "Les runes de la porte\n\nrune 1 : la clé\nrune 2 : la flamme brisée\nrune 3 : l'étoile\n" } });
	noterHashCh9("besaceBase", g.commit({ auteur: a, date: dateCh9(10, 13, 10), message: "vitrail: pose le cadre du vitrail", fichiers: { "vitrail.txt": "Le vitrail\n\n(le cadre)\n" } }));
	g.branche("correctifs");
	g.basculer("correctifs");
	noterHashCh9("relique", g.commit({ auteur: auteurCh9("georgette"), date: dateCh9(10, 13, 11), message: "runes: répare la rune brisée", fichiers: { "runes.txt": "Les runes de la porte\n\nrune 1 : la clé\nrune 2 : la flamme\nrune 3 : l'étoile\n" } }));
	noterHashCh9("experimental", g.commit({ auteur: auteurCh9("georgette"), date: dateCh9(10, 13, 12), message: "runes: EXPÉRIMENTAL une quatrième rune instable", fichiers: { "runes.txt": "Les runes de la porte\n\nrune 1 : la clé\nrune 2 : la flamme\nrune 3 : l'étoile\nrune 4 : ??? (instable, ne pas publier)\n" } }));
	g.basculer("main");
	g.branche("vitrail");
	g.basculer("vitrail");
	g.commit({ auteur: a, date: dateCh9(10, 13, 13), message: "vitrail: pose le verre bleu", fichiers: { "vitrail.txt": "Le vitrail\n\n(le cadre)\nle verre bleu\n" } });
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.besace + "/vitrail.txt", "Le vitrail\n\n(le cadre)\nle verre bleu\nle verre rouge (en cours)\n");
	fichierIleCh9(DEPOTS_CH9.besace + "/esquisse.txt", "Esquisse du vitrail : une étoile au centre, encore au crayon.\n");
	fichierIleCh9(DEPOTS_CH9.besace + "/NOTE.txt", "Note d'Anthony : tu travailles sur la ligne vitrail, rien n'est scellé.\n" +
		"Urgence : la rune 2 de main est brisée. La réparation existe déjà, sur la ligne correctifs, mais SEULE (pas la rune expérimentale).\n" +
		"1. Range ton travail dans la besace, sans rien perdre, même l'esquisse que Git ne suit pas encore.\n" +
		"2. Sur main, rapporte la seule relique utile.\n" +
		"3. Plante un menhir sur main : v1.0, un tag annoté.\n" +
		"4. Reviens sur vitrail, et ressors ton travail de la besace.\n");
}
/* L'épreuve III : le Labyrinthe des Âges, soixante-quatre sceaux et un seul est faux. */
function semerLabyrintheCh9(){
	var g = constructeurCh9(DEPOTS_CH9.labyrinthe);
	if (!g) return;
	var proph = ["La prophétie des Âges", "", "La flotte noire est l'ennemie de l'école."], journal = ["Journal du labyrinthe", ""];
	var auteurs = ["gamaliel", "irvan", "marc", "kenyonn", "anthony", "guillaume", "william", "georgette"];
	var epreuve = "#!/bin/bash\n# L'épreuve du Labyrinthe : la prophétie tient-elle ?\nif grep -q \"appartient à l'école\" prophetie.txt; then\n  echo \"La prophétie est fausse.\"\n  exit 1\nfi\necho \"La prophétie tient.\"\nexit 0\n";
	for (var i = 0; i < 64; i++){
		var f = {}, msg, auteur = auteurCh9(auteurs[i % auteurs.length]);
		if (i === 0){ f["prophetie.txt"] = proph.join("\n") + "\n"; f["journal.txt"] = journal.join("\n") + "\n"; f["epreuve.sh"] = epreuve; msg = "labyrinthe: pose la prophétie et l'épreuve"; }
		else if (i === 41){
			proph[2] = "La flotte noire appartient à l'école, depuis toujours.";
			f["prophetie.txt"] = proph.join("\n") + "\n";
			journal.push("Couloir " + i + " : un détour.");
			f["journal.txt"] = journal.join("\n") + "\n";
			auteur = auteurCh9("gris");
			msg = "journal: note un détour du couloir " + i;
		} else if (i % 6 === 0){
			proph.push("Au couloir " + i + ", une porte s'ouvre.");
			f["prophetie.txt"] = proph.join("\n") + "\n";
			msg = "prophetie: ajoute la porte du couloir " + i;
		} else {
			journal.push("Couloir " + i + " : " + ["rien à signaler.", "une torche éteinte.", "un écho.", "une goutte d'eau.", "des pas, très loin.", "un miroir fêlé."][i % 6]);
			f["journal.txt"] = journal.join("\n") + "\n";
			msg = "journal: traverse le couloir " + i;
		}
		var hsh = g.commit({ auteur: auteur, date: dateCh9(10, 1 + Math.floor(i / 6), 8 + (i % 10), (i * 13) % 60), message: msg, fichiers: f });
		if (i === 0) g.tag("aube", hsh, { annote: false });
		if (i === 41) noterHashCh9("labyrintheFaux", hsh);
	}
	g.extraire();
	try { var v = Shell.chercherDepuis(Home, DEPOTS_CH9.labyrinthe + "/epreuve.sh", { sudo: true }, "chmod"); if (v.node && !(v.node instanceof Room)) v.node.mode = "rwxr-xr-x"; } catch (e){}
	fichierIleCh9(DEPOTS_CH9.labyrinthe + "/BISECT.md", "# Le Labyrinthe des Âges\n\nLe premier sceau faux (son hash, au moins 7 caractères) : \nSon scribe : \nCe qu'il a changé : \n");
}

/* Acte IV : réécrire une prophétie (rebase), et la carte des stratégies. */
function semerProphetieCh9(){
	var g = constructeurCh9(DEPOTS_CH9.prophetie);
	if (!g) return;
	var a = auteurCh9("guillaume");
	g.commit({ auteur: a, date: dateCh9(10, 14, 9), message: "vents: ouvre le livre des vents", fichiers: { "vents.txt": "Le livre des vents\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 14, 10), message: "vents: le vent d'ouest", fichiers: { "vents.txt": "Le livre des vents\n\nLe vent d'ouest : il apporte la pluie.\n" } });
	g.branche("carte-des-vents");
	g.commit({ auteur: a, date: dateCh9(10, 14, 12), message: "vents: le vent du sud", fichiers: { "vents.txt": "Le livre des vents\n\nLe vent d'ouest : il apporte la pluie.\nLe vent du sud : il apporte le sel.\n" } });
	noterHashCh9("prophetieMain", g.commit({ auteur: a, date: dateCh9(10, 14, 13), message: "vents: le vent d'est", fichiers: { "vents.txt": "Le livre des vents\n\nLe vent d'ouest : il apporte la pluie.\nLe vent du sud : il apporte le sel.\nLe vent d'est : il apporte les rumeurs.\n" } }));
	g.basculer("carte-des-vents");
	g.commit({ auteur: auteurCh9("moustapha"), date: dateCh9(10, 14, 11), message: "carte: trace la rose des vents", fichiers: { "rose.txt": "    N\n  O + E\n    S\n" } });
	noterHashCh9("prophetieCarte", g.commit({ auteur: auteurCh9("moustapha"), date: dateCh9(10, 14, 11, 30), message: "carte: nomme les quatre directions", fichiers: { "rose.txt": "    N (nord)\nO (ouest) + E (est)\n    S (sud)\n" } }));
	g.basculer("main");
	g.branche("brouillon");
	g.basculer("brouillon");
	var v = "Le livre des vents\n\nLe vent d'ouest : il apporte la pluie.\nLe vent du sud : il apporte le sel.\nLe vent d'est : il apporte les rumeurs.\n";
	g.commit({ auteur: a, date: dateCh9(10, 14, 15), message: "wip", fichiers: { "vents.txt": v + "Le vent du nrod\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 14, 15, 20), message: "wip encore", fichiers: { "vents.txt": v + "Le vent du nrod : il apporte le froid.\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 14, 15, 40), message: "debug: trace temporaire", fichiers: { "debug.log": "TRACE vents.txt relu 14 fois\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 14, 16), message: "corrige typo", fichiers: { "vents.txt": v + "Le vent du nord : il apporte le froid.\n" } });
	g.basculer("main");
	g.extraire();
	fichierIleCh9(DEPOTS_CH9.prophetie + "/NOTE.txt", "Note de Guillaume :\n" +
		"1. carte-des-vents est partie de main avant le vent du sud et le vent d'est. Rejoue-la au bout de main (rebase), puis avance main jusqu'à elle, sans sceau de fusion.\n" +
		"2. brouillon raconte comment on a travaillé, pas ce qu'on a fait : wip, wip encore, une trace de débogage, une typo.\n" +
		"   Réécris-la (rebase -i) : un seul sceau pour le vent du nord, avec un vrai message, et la trace de débogage disparue.\n" +
		"   Ce brouillon n'a jamais été publié : c'est la seule raison pour laquelle on a le droit de le réécrire.\n");
}
function semerCartesCh9(){
	fichierIleCh9(DEPOTS_CH9.cartes + "/STRATEGIES.md", "# La salle des cartes : trois royaumes, trois stratégies\n\n" +
		"Pour chaque royaume, écris la stratégie de branches qui lui va (trunk-based, GitHub flow ou GitFlow), et pourquoi, en une phrase.\n\n" +
		"1. Le royaume des Messagers : quatre scribes, un site qu'ils publient vingt fois par jour, et des tests automatiques sur chaque sceau.\n   Stratégie : \n   Pourquoi : \n\n" +
		"2. Le royaume des Grimoires : une bibliothèque de sorts vendue aux autres royaumes, dont les versions 2.x et 3.x sont maintenues en même temps.\n   Stratégie : \n   Pourquoi : \n\n" +
		"3. Le royaume des Archives : vingt-cinq scribes sur une plateforme de données, deux mille tests, une publication par jour après relecture.\n   Stratégie : \n   Pourquoi : \n");
}
/* L'épreuve IV : le chant des marées, sept sceaux en désordre et un secret qui y traîne. */
function semerEpreuve4Ch9(){
	var g = constructeurCh9(DEPOTS_CH9.epreuve4);
	if (!g) return;
	var a = auteurCh9("guillaume");
	g.commit({ auteur: a, date: dateCh9(10, 15, 9), message: "marees: ouvre le chant des marées", fichiers: { "chant.txt": "Le chant des marées\n" } });
	noterHashCh9("mareesBase", g.commit({ auteur: a, date: dateCh9(10, 15, 10), message: "marees: la marée du matin", fichiers: { "chant.txt": "Le chant des marées\n\nLa marée du matin monte sans bruit.\n" } }));
	g.branche("chant");
	g.commit({ auteur: auteurCh9("moustapha"), date: dateCh9(10, 15, 12), message: "marees: la marée de midi", fichiers: { "chant.txt": "Le chant des marées\n\nLa marée du matin monte sans bruit.\nLa marée de midi brille.\n" } });
	noterHashCh9("mareesMain", g.commit({ auteur: auteurCh9("moustapha"), date: dateCh9(10, 15, 14), message: "marees: la marée du soir", fichiers: { "chant.txt": "Le chant des marées\n\nLa marée du matin monte sans bruit.\nLa marée de midi brille.\nLa marée du soir s'en va.\n" } }));
	g.basculer("chant");
	var refrain = "Refrain\n\nMonte, monte, la mer d'argent,\n";
	g.commit({ auteur: a, date: dateCh9(10, 15, 11), message: "wip refrain", fichiers: { "refrain.txt": refrain } });
	g.commit({ auteur: a, date: dateCh9(10, 15, 11, 10), message: "notes", fichiers: { "notes-secretes.txt": "Pour pousser sans relecture : MOT_DE_PASSE=Maree-Haute-2026\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 15, 11, 20), message: "wip", fichiers: { "refrain.txt": refrain + "Descends, descends, le sable blanc,\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 15, 11, 30), message: "oups", fichiers: { "notes-secretes.txt": null } });
	g.commit({ auteur: a, date: dateCh9(10, 15, 11, 40), message: "refrain fini", fichiers: { "refrain.txt": refrain + "Descends, descends, le sable blanc,\nLa Chronique garde le temps.\n" } });
	g.commit({ auteur: a, date: dateCh9(10, 15, 11, 50), message: "corrige typo", fichiers: { "refrain.txt": refrain + "Descends, descends, le sable blanc,\nLa Chronique garde le temps.\n", "couplet.txt": "Couplet\n\nLes Royaumes chantent avec nous.\n" } });
	noterHashCh9("mareesChant", g.commit({ auteur: a, date: dateCh9(10, 15, 12, 5), message: "ajoute le couplet", fichiers: { "couplet.txt": "Couplet\n\nLes Royaumes chantent avec nous,\nEt le sablier tourne pour nous.\n" } }));
	g.basculer("main");
	g.extraire();
}

/* Acte V : les Royaumes. La vraie Chronique, sur royaume, que le joueur clonera. */
var CHRONIQUE_CH9 = {
	chronique: ["# La Chronique de Cybersup", "", "Ici se scelle tout ce qui arrive à l'école, depuis sa fondation."],
	lois: LOIS_CH9.slice(0, 10).concat(LOIS_CH9.slice(10)),
	flotte: "La flotte noire\n\nLa flotte noire est l'ennemie de l'école.\nElle a viré de bord devant le Grand Port, à l'aube.\n",
	registre: ["Le registre des promotions", "", "B1 : quarante-deux scribes", "B2 : trente-six scribes", "B3 : vingt-huit scribes", "M1 : trente scribes", "M2 : vingt-deux scribes"]
};
function semerRoyaumeCh9(){
	if (typeof gitConstructeur !== "function" || !estRoyaumeCh9()) return;
	var g = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
	var ch = CHRONIQUE_CH9.chronique.slice();
	g.commit({ auteur: auteurCh9("laurent"), date: dateCh9(9, 1, 9), message: "chronique: ouvre la Chronique de Cybersup",
		fichiers: { "chronique.md": ch.join("\n") + "\n", "lois.md": CHRONIQUE_CH9.lois.join("\n") + "\n", "flotte.md": CHRONIQUE_CH9.flotte, "registre.txt": CHRONIQUE_CH9.registre.join("\n") + "\n",
			"README.md": "# La Chronique\n\nLa Chronique de l'école, publiée sur royaume. On ne réécrit jamais ce qui est publié.\nChaque changement passe par une demande au Haut-Conseil (gh pr create).\n" } });
	var faits = ["la WarRoom tient la nuit", "la panne du bâtiment B est réparée", "le Corbeau est chassé de la Citadelle", "la Nuée est repoussée à l'Académie",
		"le Bastion tient l'inspection", "Lumen se rallume", "Port-Aube est bâtie avant la marée", "la flotte noire vire de bord devant le Grand Port",
		"la Chronothèque rouvre ses portes", "les quatorze maîtres arrivent", "le Grand Sablier se remet en marche", "le Haut-Conseil siège de nouveau"];
	var auteurs = ["grace", "laurent", "grace", "irvan", "georgette", "jeremy", "amine", "laurent", "gamaliel", "benedicte", "andrii", "amine"];
	faits.forEach(function(f, i){
		ch.push("- " + f + ".");
		var hs = g.commit({ auteur: auteurCh9(auteurs[i]), date: dateCh9(9 + (i > 6 ? 1 : 0), 2 + i * 2, 10 + (i % 6)), message: "chronique: " + f, fichiers: { "chronique.md": ch.join("\n") + "\n" } });
		if (i === 7) g.tag("v-grand-port", hs, { annote: true, message: "La flotte noire vire de bord", auteur: auteurCh9("laurent"), date: dateCh9(10, 17, 7) });
	});
	sCh9().chroniqueLignes = ch.length;
	noterHashCh9("royaumeDepart", g.resoudre("main"));
}

/* ------------------------------------------------------------------ */
/* À l'entrée : tout se pose une fois                                   */
/* ------------------------------------------------------------------ */

function semerChronique(){
	var c = sCh9();
	if (c.seme) return;
	c.seme = true;
	if (!c.base) c.base = baseJourCh9();
	declarerUnitesCh9();
	dossierIleCh9(RACINE_CH9);
	var etapes = [semerPremierCh9, semerAutelCh9, semerAnnalesCh9, semerContresortsCh9, semerOmbresCh9, semerLignesCh9, semerParadoxeCh9, semerBesaceCh9,
		semerProphetieCh9, semerCartesCh9, semerRoyaumeCh9];
	etapes.forEach(function(f){ try { f(); } catch (e){ if (typeof console !== "undefined" && console.error) console.error("semis du chapitre 9 :", f.name, e); } });
	fichierIleCh9(RACINE_CH9 + "/LISEZMOI", "La Chronothèque : un dossier par leçon. Chaque maître t'en confie un.\n\n" +
		"  premier-sceau   Gamaliel     ton premier dépôt (il n'en est pas encore un)\n" +
		"  autel           Bénédicte    ce qu'on scelle, et ce qu'on ne scelle jamais\n" +
		"  annales         Irvan        cinquante sceaux à fouiller\n" +
		"  contresorts     Georgette    réparer sans casser (et experiences, pour voir les trois resets)\n" +
		"  livre-ombres    William      une ligne du destin effacée\n" +
		"  lignes          Marc         trois lignes à réunir\n" +
		"  paradoxe        Kenyonn      un conflit (et chimere, une fusion trompeuse)\n" +
		"  besace          Anthony      la besace, la relique, le menhir\n" +
		"  prophetie       Guillaume    réécrire une prophétie\n" +
		"  cartes          Moustapha    trois royaumes, trois stratégies\n" +
		"  runes           Aurélien     les runes de garde et les sceaux de cire\n" +
		"  chronique       Jeremy       la vraie Chronique, à cloner depuis royaume\n\n" +
		"Les épreuves de rang posent leurs propres dossiers quand elles s'ouvrent.\n");
	semerRunesCh9();
}
/* Les runes de garde : le modèle d'un hook pre-commit, et l'aide pour les sceaux de cire. */
function semerRunesCh9(){
	fichierIleCh9(DEPOTS_CH9.runes + "/pre-commit", "#!/bin/bash\n# Rune de garde : refuse de sceller un mot de passe.\n# À copier dans .git/hooks/pre-commit d'un dépôt, puis : chmod +x .git/hooks/pre-commit\nif git diff --cached | grep -q \"MOT_DE_PASSE=\"; then\n  echo \"Rune de garde : un mot de passe allait être scellé. Sceau refusé.\"\n  exit 1\nfi\nexit 0\n");
	fichierIleCh9(DEPOTS_CH9.runes + "/SCEAUX-DE-CIRE.txt", "Les sceaux de cire : signer ses sceaux avec sa clé SSH.\n\n" +
		"  git config --global gpg.format ssh\n" +
		"  git config --global user.signingkey ~/.ssh/id_ed25519.pub\n" +
		"  git commit -S -m \"...\"              un sceau signé (ou commit.gpgsign true pour tous)\n\n" +
		"Pour vérifier, Git doit savoir à qui appartient chaque clé : le fichier des signataires autorisés.\n" +
		"  une ligne par clé :  TON_MAIL namespaces=\"git\" ssh-ed25519 AAAA...\n" +
		"  git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers\n" +
		"  git log --show-signature -1\n");
}
/* Ce que le monde pose à l'ouverture d'une épreuve de rang. */
function poserEpreuveCh9(n){
	try {
		if (n === 1) semerProfaneCh9();
		if (n === 2) semerPageCh9();
		if (n === 3) semerLabyrintheCh9();
		if (n === 4) semerEpreuve4Ch9();
	} catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
}

/* Le monde vérifie l'état à chaque commande : à l'ouverture du chapitre, la machine royaume se déclare. */
var VERIFIER_MONDE_AVANT_CH9 = verifierMonde;
verifierMonde = function(){
	try { if (chroniqueOuverte()){ var c = sCh9(); if (!c.base) c.base = baseJourCh9(); declarerUnitesCh9(); } } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	return VERIFIER_MONDE_AVANT_CH9.apply(this, arguments);
};

World.fige = true;
