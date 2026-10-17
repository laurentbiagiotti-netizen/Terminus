/**
 * Chapitre6.js : Lumen, la cité qui s'éteint. Le chapitre de l'exploitation d'un serveur Linux en production.
 *
 * Numéro interne 7 (le 4 est l'épreuve finale, le 5 le chapitre 4, le 6 le chapitre 5), affiché 6 pour le joueur.
 * Sous l'école dort Lumen, une cité souterraine bâtie par les premiers ingénieurs, habitée par ses gardiens et
 * alimentée par une seule machine : le Cœur de Lumen (la machine lumen). Depuis le départ de la Nuée, le Cœur
 * s'épuise : quartier après quartier, les lumières s'éteignent. À 06:00, il reste huit heures avant la Longue Nuit.
 *
 * Ce fichier pose le monde : le hall de Lumen et ses seize quartiers, la machine lumen (de vrais disques, volumes,
 * processus, services, journaux, paquets, lus et changés par le moteur des machines : SortsMachines.js,
 * SortsProcessus.js, SortsSystemd.js, SortsExploitation.js), l'horloge (2 minutes par commande), les 37 étapes et
 * leur validation sur l'ÉTAT RÉEL de la machine, la Longue Nuit, le Phare de Lumen (la commande lanterne), l'ouverture
 * du chapitre et son certificat. Machines.js fait vivre les gardiens et leurs défis ; Habitants.js, les quêtes annexes.
 *
 * Tout est de l'exploitation : réparer, mesurer, prévoir, documenter. Aucun adversaire humain dans ce chapitre.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les valeurs de la partie                                            */
/* ------------------------------------------------------------------ */

var H6 = "lumen";
var IP_LUMEN = "10.0.97." + aleaEntier("ch6-ip", 10, 60);
var IP_REGISTRE_ANCIEN = "10.0.97." + aleaEntier("ch6-ip-ancien", 200, 240);   // l'ancien registre, éteint depuis des années

var PAS_HORLOGE_CH6 = 2;     // minutes de la journée par commande tapée dans le chapitre
var NUIT_CH6 = 480;          // 6 h + 480 min = 14 h : la Longue Nuit
var MIDI_CH6 = 360;          // 6 h + 360 min = 12 h : le défi d'honneur

function etatCh6Initial(){
	return {
		horloge: 0,          // minutes écoulées depuis 6 h
		dernierNb: null,     // nombre de commandes au dernier tour
		base: null,          // la date (ms) de 6 h, le matin de l'ouverture
		heureAnnoncee: 6,
		nuit: false,         // la Longue Nuit est tombée
		avaries: {},         // les avaries de la Nuit, par quartier (cle -> true)
		allumes: {},         // l'heure (horloge) à laquelle chaque quartier s'est rallumé
		vus: {},             // ce que le joueur a constaté de ses yeux (df, lsof, free...)
		scoreDepart: null, scoreDernier: null, scoreFinal: null,
		latenceAvant: null, latenceApres: null
	};
}

/* ------------------------------------------------------------------ */
/* Les lieux : le hall de Lumen et ses seize quartiers                 */
/* ------------------------------------------------------------------ */

function lieuDuChapitre7(lieu){ lieu.chapitre = 7; return lieu; }
function salleCh6(nom, intro, img){
	var r = lieuDuChapitre7(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh6(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	lieu.addItem(it);
	return it;
}

var HallLumen = salleCh6("Lumen",
	"La place de Lumen, sous l'école. Une voûte immense, des rues en pente, des façades taillées dans la roche ; presque toutes les fenêtres sont noires. " +
	"Seize quartiers rayonnent autour de la place. Au centre, la lanterne du Phare de Lumen brûle à peine. Laurent t'attend ; la radio de Grace grésille ; " +
	"au fond, derrière une grille, on entend battre le Cœur.",
	"loc_lumen.gif");

/* Les seize quartiers : la clé, le nom du lieu, le gardien, le titre, les deux étapes, l'intro. */
var QUARTIERS_CH6 = [
	{ cle: "docks", nom: "Docks", gardien: "Seymour", titre: "les Docks", etapes: ["m6_disque", "m6_fantome"],
	  intro: "Le quartier des Docks : des entrepôts pleins à craquer, des caisses empilées jusqu'à la voûte. Plus rien n'entre, plus rien ne sort (le disque /var est plein)." },
	{ cle: "archives", nom: "Archives", gardien: "Kathleen", titre: "les Archives", etapes: ["m6_inodes", "m6_tmpfiles"],
	  intro: "Le quartier des Archives : des tiroirs à fiches à perte de vue, chacun avec son étiquette. Il reste de la place dans les armoires, mais plus une seule fiche (les inodes)." },
	{ cle: "gazette", nom: "Gazette", gardien: "Ida", titre: "la Gazette", etapes: ["m6_logrotate", "m6_journal"],
	  intro: "Le quartier de la Gazette : des rotatives, des rouleaux de papier qui débordent dans la rue. On imprime tout, on ne jette rien (les journaux qui gonflent)." },
	{ cle: "forges", nom: "Forges", gardien: "Gordon", titre: "les Forges", etapes: ["m6_memoire", "m6_swap"],
	  intro: "Le quartier des Forges : des fourneaux éteints, un seul qui rugit et avale tout le charbon de la cité (la mémoire saturée)." },
	{ cle: "horloge", nom: "TourHorloge", gardien: "Niklaus", titre: "la Tour de l'Horloge", etapes: ["m6_cpu", "m6_zombie"],
	  intro: "La Tour de l'Horloge : des engrenages de bronze, dont un qui tourne fou, et des ombres qui hantent l'escalier sans pouvoir partir (le processeur, les spectres)." },
	{ cle: "citernes", nom: "Citernes", gardien: "Sophie", titre: "les Citernes", etapes: ["m6_lvm", "m6_snapshot"],
	  intro: "Le quartier des Citernes : des cuves reliées par des vannes. Celle de la base déborde, alors que la réserve commune est à moitié vide (LVM)." },
	{ cle: "porte", nom: "PorteDuMatin", gardien: "Lynn", titre: "la Porte du Matin", etapes: ["m6_fstab", "m6_montage"],
	  intro: "La Porte du Matin : celle que la cité franchit à chaque réveil. Sa liste des salles à ouvrir au démarrage est fausse (le fichier /etc/fstab)." },
	{ cle: "ateliers", nom: "Ateliers", gardien: "Mary", titre: "les Ateliers des automates", etapes: ["m6_unite", "m6_redemarrage"],
	  intro: "Les Ateliers des automates : des machines qui travaillent seules, chacune avec sa feuille de route. Une seule tourne encore à la main, dans un coin (une unité systemd à écrire)." },
	{ cle: "memoires", nom: "CrypteMemoires", gardien: "Betty", titre: "la Crypte des mémoires", etapes: ["m6_timer", "m6_restauration"],
	  intro: "La Crypte des mémoires : des niches où l'on range une copie de tout, chaque nuit. Personne n'a jamais vérifié qu'on pouvait les relire (les sauvegardes)." },
	{ cle: "observatoire", nom: "Observatoire", gardien: "Donald", titre: "l'Observatoire", etapes: ["m6_mesures", "m6_latence"],
	  intro: "L'Observatoire : des lunettes braquées sur le Cœur, des cadrans, des registres de mesures. Ici, on ne répare rien : on mesure." },
	{ cle: "puits", nom: "Puits", gardien: "Dorothy", titre: "le Puits aux deux sources", etapes: ["m6_raid", "m6_smart"],
	  intro: "Le Puits aux deux sources : une eau tirée de deux sources jumelles, pour que la cité boive même si l'une tarit. L'une s'est tarie (le RAID logiciel, la santé des disques)." },
	{ cle: "thermes", nom: "Thermes", gardien: "Ruth", titre: "les Thermes", etapes: ["m6_fsck", "m6_tune2fs"],
	  intro: "Les Thermes : des bassins fermés par une grille depuis qu'une fissure est apparue. On peut regarder, plus se baigner (un système de fichiers en lecture seule)." },
	{ cle: "marche", nom: "GrandMarche", gardien: "Charles", titre: "le Grand Marché", etapes: ["m6_dpkg", "m6_hold"],
	  intro: "Le Grand Marché : des étals renversés, une livraison abandonnée au milieu de l'allée. Plus personne ne peut rien acheter (les paquets cassés)." },
	{ cle: "labyrinthe", nom: "Labyrinthe", gardien: "John", titre: "le Labyrinthe", etapes: ["m6_failed", "m6_demarrage"],
	  intro: "Le Labyrinthe : des couloirs où chaque porte attend qu'une autre s'ouvre. L'une attend une porte qui n'existe pas ; une autre fait patienter tout le monde (les dépendances, le démarrage)." },
	{ cle: "limites", nom: "BibliothequeLimites", gardien: "Kay", titre: "la Bibliothèque des limites", etapes: ["m6_ulimit", "m6_cgroups"],
	  intro: "La Bibliothèque des limites : chaque lecteur a droit à un nombre de livres ouverts, et à une part de la lumière. L'un étouffe, l'autre prend tout (ulimit, les groupes de contrôle)." },
	{ cle: "guetteur", nom: "Guetteur", gardien: "Klara", titre: "le Guetteur", etapes: ["m6_strace", "m6_tmux"],
	  intro: "La tour du Guetteur : une vigie qui écoute ce que les autres font, appel par appel. Un messager attend depuis des heures une réponse qui ne viendra pas (strace, tmux)." }
];
QUARTIERS_CH6.forEach(function(q){
	q.lieu = salleCh6(q.nom, q.intro, "loc_q_" + q.cle + ".gif");
	link_rooms(HallLumen, q.lieu);
});
function quartierCh6(cle){ return QUARTIERS_CH6.filter(function(q){ return q.cle === cle; })[0]; }
function quartierDeLieu(lieu){ return QUARTIERS_CH6.filter(function(q){ return q.lieu === lieu; })[0] || null; }

/* La boîte de Laurent : on y dépose le rapport de remise en service. */
var BoiteDeLumen = salleCh6("BoiteDeLaurent", "Une boîte aux lettres de bronze, scellée au pied du Phare. On y dépose le rapport de remise en service, à l'intention de Laurent.", "item_box.gif");
BoiteDeLumen.mode = "rwxrwxrwt";
BoiteDeLumen.owner = "laurent";
BoiteDeLumen.horsBareme = true;
link_rooms(HallLumen, BoiteDeLumen);

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

/* Les sorts de l'exploitation : ceux du moteur des machines, sauf ceux des quêtes annexes (qui restent hors barème). */
var SORTS_DES_ANNEXES_CH6 = ["jobs", "bg", "fg", "disown", "zgrep", "zless", "hwclock", "cal", "bzip2", "bunzip2", "bzcat", "xz", "unxz", "xzcat", "zstd", "unzstd", "zstdcat",
	"setquota", "quota", "repquota", "edquota", "chgrp", "newgrp", "groupadd"];
var ORDRE_DES_SORTS_7 = (function(){
	var liste = (typeof SORTS_MACHINES !== "undefined" ? SORTS_MACHINES : []).concat(["systemd-tmpfiles"]);
	var autres = [].concat(typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
		typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
		typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], SORTS_DES_ANNEXES_CH6, ["updatedb", "locate", "groupadd", "fsck.ext4", "pvdisplay", "lvdisplay"]);
	return liste.filter(function(s, i){ return liste.indexOf(s) === i && autres.indexOf(s) === -1 && typeof MANUEL !== "undefined" && MANUEL[s]; });
})();
/* Le chapitre les enseigne : leur premier usage rapporte désormais de l'XP. */
ORDRE_DES_SORTS_7.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* Qui enseigne quoi (les gardiens sont posés dans Machines.js) : chaque sort a un gardien, et un seul. */
var SORTS_DES_QUARTIERS = {
	docks: ["ncdu"],
	archives: ["systemd-tmpfiles"],
	gazette: [],
	forges: ["free", "vmstat", "pmap", "fallocate", "mkswap", "swapon", "swapoff"],
	horloge: ["renice", "nice", "pstree", "pidof", "killall"],
	citernes: ["pvs", "vgs", "lvs", "lvextend", "resize2fs", "pvcreate", "vgextend", "lvcreate", "lvremove", "vgdisplay"],
	porte: ["blkid", "lsblk", "umount"],
	ateliers: ["systemd-run"],
	memoires: [],
	observatoire: ["nproc", "iostat", "sar"],
	puits: ["mdadm", "smartctl"],
	thermes: ["e2fsck", "fsck", "tune2fs", "fuser"],
	marche: ["apt-mark", "apt-cache", "needrestart"],
	labyrinthe: [],
	limites: ["ulimit", "systemd-cgtop"],
	guetteur: ["strace", "tmux", "screen", "nohup", "watch"]
};

/* ------------------------------------------------------------------ */
/* La machine lumen : le Cœur de Lumen                                  */
/* ------------------------------------------------------------------ */

var CoeurDeLumen = lieuDuChapitre7(new Room("lumen",
	"La machine lumen : le Cœur de Lumen. Un serveur qui tourne depuis quarante et un jours sans qu'on le regarde. Disques pleins, mémoire à bout, " +
	"services en panne : chaque quartier éteint de la cité est une avarie de cette machine.", "loc_coeur_lumen.gif"));
CoeurDeLumen.racineHote = H6;
CoeurDeLumen.owner = "root";
CoeurDeLumen.mode = "rwxr-xr-x";
CoeurDeLumen.removeCommand("cd");
CoeurDeLumen.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh lumen");
if (typeof Machines !== "undefined") link_rooms(Machines, CoeurDeLumen);

function estMonLumen(){
	try { return !!(typeof HOTES !== "undefined" && HOTES[H6] && HOTES[H6].arrivee && HOTES[H6].arrivee() === CoeurDeLumen); } catch (e){ return false; }
}
function lumenOuvert(){
	return typeof state !== "undefined" && state && state.has && state.has("ch6Ouvert") && estMonLumen() &&
		!(typeof examenEnCours === "function" && examenEnCours());
}
function sCh6(){ return (typeof state !== "undefined" && state && state.ch6 && typeof state.ch6 === "object") ? state.ch6 : etatCh6Initial(); }
function surLumen(){ return Shell.hote() === H6; }

var GIO6 = 1073741824, MIO6 = 1048576;
var DATE_OUVERTURE_CH6 = (function(){ var d = new Date(); d.setHours(6, 0, 0, 0); return d.getTime(); })();
function maintenantCh6(){
	var c = sCh6();
	return (c.base || DATE_OUVERTURE_CH6) + (c.horloge || 0) * 60000;
}

/* Écrire un fichier de la machine au chargement : l'état d'origine (taille et date en option). */
function P6(chemin, texte, options){
	options = options || {};
	var it = poserFichierHote(H6, chemin, texte, options);
	if (it && options.taille !== undefined) it.taille = options.taille;
	if (it && options.ageJours !== undefined) it.mtimeMs = DATE_OUVERTURE_CH6 - options.ageJours * 86400000;
	if (it && options.ageMin !== undefined) it.mtimeMs = DATE_OUVERTURE_CH6 - options.ageMin * 60000;
	if (it && options.groupe) it.groupe = options.groupe;
	return it;
}
function D6(chemin, options){ return creerDossierHote(H6, chemin, options || {}); }
function T6(chemin){ return texteHote(H6, chemin); }
function F6(chemin){ return fichierHote(H6, chemin); }

var COMPTES_CH6 = [
	["root", 0, 0, "/root", "/bin/bash"], ["daemon", 1, 1, "/usr/sbin", "/usr/sbin/nologin"], ["bin", 2, 2, "/bin", "/usr/sbin/nologin"], ["sys", 3, 3, "/dev", "/usr/sbin/nologin"],
	["www-data", 33, 33, "/var/www", "/usr/sbin/nologin"], ["nobody", 65534, 65534, "/nonexistent", "/usr/sbin/nologin"], ["systemd-journal", 990, 990, "/", "/usr/sbin/nologin"],
	["lumen", 991, 991, "/opt/lumen", "/usr/sbin/nologin"], ["allumeur", 992, 992, "/opt/lumen", "/usr/sbin/nologin"], ["sauvegarde", 993, 993, "/srv/sauvegardes", "/usr/sbin/nologin"],
	["__JOUEUR__", 1000, 1000, "/home/__JOUEUR__", "/bin/bash"], ["operateur", 1001, 1001, "/home/operateur", "/bin/bash"],
	["ninon", 1101, 1101, "/home/ninon", "/bin/bash"], ["basile", 1102, 1102, "/home/basile", "/bin/bash"]
];
function texteComptesCh6(){
	var passwd = COMPTES_CH6.map(function(c){ var n = c[0] === "__JOUEUR__" ? JOUEUR : c[0]; return n + ":x:" + c[1] + ":" + c[2] + "::" + c[3].replace("__JOUEUR__", JOUEUR) + ":" + c[4]; }).join("\n");
	var groupes = [["root", 0, ""], ["adm", 4, JOUEUR], ["sudo", 27, JOUEUR], ["www-data", 33, ""], ["users", 100, ""], ["systemd-journal", 990, ""], ["lumen", 991, ""], ["allumeur", 992, ""],
		["sauvegarde", 993, ""], [JOUEUR, 1000, ""], ["operateur", 1001, ""], ["ninon", 1101, ""], ["basile", 1102, ""], ["habitants", 1200, "ninon,basile," + JOUEUR], ["nogroup", 65534, ""]];
	var group = groupes.map(function(g){ return g[0] + ":x:" + g[1] + ":" + g[2]; }).join("\n");
	var shadow = COMPTES_CH6.map(function(c){ var n = c[0] === "__JOUEUR__" ? JOUEUR : c[0]; return n + ":" + (c[1] >= 1000 && c[1] < 65534 ? "$y$j9T$" + hexDe("ch6-" + n, 22) + "$" + hexDe("ch6-mdp-" + n, 43) : "*") + ":20300:0:99999:7:::"; }).join("\n");
	return { passwd: passwd, group: group, shadow: shadow };
}

/* Les unités systemd de la machine (fichiers fournis par les paquets, dans /lib/systemd/system). */
var UNITES_LUMEN = {
	"lumen-web.service": "[Unit]\nDescription=Lumen, le site de la cite\nAfter=network.target lumen-base.service\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-web --port 80\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-base.service": "[Unit]\nDescription=Lumen, la base de donnees de la cite\nAfter=network.target\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-base -D /srv/donnees/base\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"cache-rapports.service": "[Unit]\nDescription=Lumen, le cache des rapports\nAfter=lumen-base.service\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/cache-rapports\nRestart=always\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-veilleur.service": "[Unit]\nDescription=Lumen, le veilleur des rondes de nuit\n\n[Service]\nExecStart=/opt/lumen/bin/lumen-veilleur\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-gazette.service": "[Unit]\nDescription=Lumen, la gazette du matin\nRequires=lumen-db.service\nAfter=lumen-base.service\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-gazette\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-attente-reseau.service": "[Unit]\nDescription=Lumen, attente du vieux reseau de la cite\nBefore=multi-user.target\n\n[Service]\nType=oneshot\nExecStart=/opt/lumen/bin/attendre-reseau --hote ancien-reseau\nRemainAfterExit=yes\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-catalogue.service": "[Unit]\nDescription=Lumen, le catalogue de la bibliotheque\nAfter=lumen-base.service\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-catalogue\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-indexeur.service": "[Unit]\nDescription=Lumen, l'indexeur des registres\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-indexeur --tout\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-messager.service": "[Unit]\nDescription=Lumen, le messager des quartiers\nAfter=network.target\n\n[Service]\nUser=lumen\nExecStart=/opt/lumen/bin/lumen-messager -c /etc/lumen/messager.conf\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"lumen-archiviste.service": "[Unit]\nDescription=Lumen, l'archiviste des registres\n\n[Service]\nUser=lumen\nWorkingDirectory=/srv/archives\nExecStart=/opt/lumen/bin/lumen-archiviste\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"ssh.service": "[Unit]\nDescription=OpenBSD Secure Shell server\nAfter=network.target\n\n[Service]\nExecStart=/usr/sbin/sshd -D\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n",
	"cron.service": "[Unit]\nDescription=Regular background program processing daemon\n\n[Service]\nExecStart=/usr/sbin/cron -f\n\n[Install]\nWantedBy=multi-user.target\n",
	"systemd-journald.service": "[Unit]\nDescription=Journal Service\n\n[Service]\nExecStart=/lib/systemd/systemd-journald\n",
	"logrotate.service": "[Unit]\nDescription=Rotate log files\n\n[Service]\nType=oneshot\nExecStart=/usr/sbin/logrotate /etc/logrotate.conf\n",
	"logrotate.timer": "[Unit]\nDescription=Daily rotation of log files\n\n[Timer]\nOnCalendar=daily\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n",
	"systemd-tmpfiles-clean.service": "[Unit]\nDescription=Cleanup of Temporary Directories\n\n[Service]\nType=oneshot\nExecStart=/usr/bin/systemd-tmpfiles --clean\n",
	"systemd-tmpfiles-clean.timer": "[Unit]\nDescription=Daily Cleanup of Temporary Directories\n\n[Timer]\nOnBootSec=15min\nOnUnitActiveSec=1d\n\n[Install]\nWantedBy=timers.target\n"
};

/* Les vieux journaux du Cœur : le chant (quête annexe de la Veilleuse) est caché dans les plus anciens. */
var CHANT_DU_COEUR = ["premier couplet : quand la ville dort, je veille", "deuxieme couplet : quand la ville a froid, je brule", "troisieme couplet : quand la ville a peur, je chante l'aube"];
function vieuxJournalCoeur(n){
	var l = [];
	for (var i = 0; i < 40; i++) l.push("coeur[" + (700 + n * 13 + i) + "]: battement " + (n * 1000 + i) + " normal");
	l.splice(17, 0, "coeur[" + (900 + n) + "]: chant " + CHANT_DU_COEUR[n - 2]);
	return l.join("\n");
}

function construireLumen(){
	var comptes = texteComptesCh6();
	P6("/etc/hostname", "lumen\n");
	P6("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tlumen\n" + IP_LUMEN + "\tlumen\n" + IP_REGISTRE_ANCIEN + "\tregistre-ancien\n");
	P6("/etc/debian_version", "12.7\n");
	P6("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"12\"\nVERSION=\"12 (bookworm)\"\nID=debian\n");
	P6("/etc/passwd", comptes.passwd);
	P6("/etc/shadow", comptes.shadow, { mode: "rw-r-----" });
	P6("/etc/group", comptes.group);
	P6("/etc/fstab", "# /etc/fstab: static file system information.\n#\n# <file system> <mount point>   <type>  <options>       <dump>  <pass>\n" +
		"/dev/mapper/vg_lumen-lv_racine /                     ext4    errors=remount-ro 0       1\n" +
		"UUID=4c2e8a1f-7d3b-4e5a-9c61-0b8f2d3e4a57 /boot          ext4    defaults        0       2\n" +
		"/dev/mapper/vg_lumen-lv_var    /var                  ext4    defaults        0       2\n" +
		"/dev/mapper/vg_lumen-lv_sessions /var/lib/lumen/sessions ext4 defaults,noatime 0     2\n" +
		"/dev/mapper/vg_lumen-lv_donnees /srv/donnees         ext4    defaults        0       2\n" +
		"/dev/mapper/vg_lumen-lv_home   /home                 ext4    defaults,usrquota 0     2\n" +
		"UUID=6f1d2c3b-aa44-4b55-8e66-77f8091a2b3c /srv/archives ext4  errors=remount-ro 0       2\n" +
		"LABEL=SAUVEGARDE               /mnt/sauvegarde       ext4    defaults        0       2\n");
	P6("/etc/systemd/journald.conf", "#  This file is part of systemd.\n#\n# Entries in this file show the compile time defaults.\n\n[Journal]\n#Storage=auto\n#Compress=yes\n#SystemMaxUse=\n#SystemKeepFree=\n#MaxRetentionSec=\n");
	P6("/etc/logrotate.conf", "# see \"man logrotate\" for details\n\nweekly\nrotate 4\ncreate\n\ninclude /etc/logrotate.d\n");
	P6("/etc/logrotate.d/apt", "/var/log/apt/term.log {\n  rotate 12\n  monthly\n  compress\n  missingok\n  notifempty\n}\n");
	D6("/etc/tmpfiles.d");
	P6("/usr/lib/tmpfiles.d/tmp.conf", "# Clear tmp directories separately, to make them easier to override\nD /tmp 1777 root root -\n#q /var/tmp 1777 root root 30d\n");
	D6("/etc/sysctl.d");
	P6("/etc/sysctl.d/README.sysctl", "Files in this directory are read by sysctl --system, in lexical order, if they end in .conf\n");
	P6("/etc/sysctl.conf", "#\n# /etc/sysctl.conf - Configuration file for setting system variables\n# See /etc/sysctl.d/ for additional system variables.\n#\n#vm.swappiness=60\n");
	P6("/etc/lumen/lumen.conf", "# Lumen, la cite\nbase = 127.0.0.1:5432\nsessions = /var/lib/lumen/sessions\njournal = /var/log/lumen/lumen.log\n");
	P6("/etc/lumen/messager.conf", "# Le messager des quartiers\n# (le registre a demenage dans le Coeur il y a deux ans, sur la base locale)\nbase = registre-ancien:5432\ndelai = 0\n");
	P6("/etc/apt/sources.list", "deb http://deb.debian.org/debian bookworm main\ndeb http://deb.debian.org/debian-security bookworm-security main\ndeb http://deb.debian.org/debian bookworm-updates main\n");
	P6("/var/run/reboot-required", "*** System restart required ***\n");
	P6("/var/run/reboot-required.pkgs", "linux-image-6.1.0-27-amd64\n");
	P6("/var/lib/dpkg/status", "");
	P6("/var/lib/logrotate/status", "logrotate state -- version 2\n\"/var/log/apt/term.log\" 2026-9-1-6:25:1\n");
	// Les programmes de la cité.
	["lumen-web", "lumen-base", "cache-rapports", "lumen-veilleur", "lumen-gazette", "attendre-reseau", "lumen-catalogue", "lumen-indexeur", "lumen-messager", "lumen-archiviste"].forEach(function(n){
		P6("/opt/lumen/bin/" + n, "ELF " + n + " (programme de la cite de Lumen)\n", { mode: "rwxr-xr-x" });
	});
	P6("/opt/lumen/allumeur", "ELF allumeur (l'allumeur des reverberes de la place, ecoute sur le port 8080)\n", { mode: "rwxr-xr-x" });
	P6("/opt/lumen/LISEZMOI", "L'allumeur des reverberes tourne depuis des mois dans un terminal, lance a la main par l'operateur :\n" +
		"  nohup /opt/lumen/allumeur --port 8080 &\nA la moindre coupure, il s'eteint et personne ne le relance. Il doit devenir un service : allumeur.service,\nlance par le compte allumeur, relance s'il tombe.\n");
	P6("/usr/local/bin/recopier-archives", "#!/bin/bash\n# Recopie complete des registres vers le disque de sauvegarde (longue : une heure au moins)\nrsync -a /srv/archives/ /mnt/sauvegarde/archives/\n", { mode: "rwxr-xr-x" });
	P6("/usr/local/bin/sauvegarde.sh", "#!/bin/bash\n# Sauvegarde des registres et de la configuration de la cite\nset -e\ntar czf /srv/sauvegardes/lumen-$(date +%F).tar.gz /etc/lumen /srv/archives/registres\necho \"sauvegarde terminee\"\n", { mode: "rwxr-xr-x" });
	P6("/home/operateur/export-boucle.sh", "#!/bin/bash\n# Relance l'export a chaque fois qu'il s'arrete (ecrit un soir de panique, jamais retire)\nwhile true; do\n  /usr/local/bin/export-registre --tout\ndone\n", { mode: "rwxr-xr-x", owner: "operateur" });
	P6("/usr/local/bin/export-registre", "ELF export-registre (exporte tout le registre, encore et encore)\n", { mode: "rwxr-xr-x" });
	// Les unités.
	Object.keys(UNITES_LUMEN).forEach(function(nom){ P6("/lib/systemd/system/" + nom, UNITES_LUMEN[nom]); });
	D6("/etc/systemd/system");
	// Les Docks : /var plein. Une vieille archive oubliée, un journal énorme (la Gazette), un lien cassé.
	P6("/var/backups/lumen-2024.tar.gz", "", { taille: Math.round(4.2 * GIO6), ageJours: 214, mode: "rw-r--r--" });
	P6("/var/backups/dpkg.status.0", "Package: base-files\nStatus: install ok installed\n", { taille: 512 * 1024, ageJours: 1 });
	P6("/var/backups/passwd.bak", comptes.passwd, { mode: "rw-------", ageJours: 3 });
	P6("/var/log/lumen/lumen.log", "GET / 200 0.081\nGET /quartiers 200 0.074\nGET /plan 503 4.810\n", { taille: Math.round(3.4 * GIO6), mode: "rw-r-----", owner: "lumen", ageMin: 1 });
	P6("/var/log/lumen/acces.log", "10.0.97.4 - - GET / 200\n", { taille: 12 * MIO6, mode: "rw-r-----", owner: "lumen", ageMin: 2 });
	P6("/var/www/lumen/index.html", "<!DOCTYPE html>\n<html><head><title>Lumen</title></head><body><h1>Lumen, la cite</h1></body></html>\n", { owner: "lumen" });
	P6("/var/www/lumen/ancien-plan.html", "", { lien: "/var/www/lumen/plans/plan-1998.html" });
	P6("/var/www/lumen/plan.html", "", { lien: "/var/www/lumen/index.html" });
	// Les vieux journaux compressés du Cœur (la Veilleuse y cherche le chant).
	[2, 3, 4].forEach(function(n){
		var it = P6("/var/log/lumen/coeur.log." + n + ".gz", "", { mode: "rw-r--r--", ageJours: 30 * n });
		it.comp = { algo: "gzip", contenu: vieuxJournalCoeur(n), taille: 2400, nom: "coeur.log." + n };
		it.taille = 900;
	});
	P6("/var/log/lumen/coeur.log", "coeur[1]: battement faible\ncoeur[1]: battement faible\n", { mode: "rw-r--r--", ageMin: 1 });
	// Le journal : vingt-huit archives de 128 Mio et le fichier actif.
	var jid = "/var/log/journal/" + hexDe("machine-id:" + H6, 32);
	P6(jid + "/system.journal", "", { taille: 96 * MIO6, ageMin: 1, mode: "rw-r-----", groupe: "systemd-journal" });
	for (var j = 0; j < 30; j++) P6(jid + "/system@" + hexDe("ch6-j" + j, 32) + "-" + hexDe("ch6-k" + j, 16) + ".journal", "", { taille: 128 * MIO6, ageJours: 41 - j, mode: "rw-r-----", groupe: "systemd-journal" });
	// Les Citernes : la base qui déborde.
	P6("/srv/donnees/base/lumen.db", "", { taille: Math.round(27.6 * GIO6), owner: "lumen", mode: "rw-------", ageMin: 1 });
	P6("/srv/donnees/base/PG_VERSION", "15\n", { owner: "lumen" });
	// Les Thermes et la Crypte des mémoires : les registres de la cité.
	P6("/srv/archives/registres/registre-1880.txt", "Registre des naissances de Lumen, 1880 a 1899.\n", { ageJours: 900 });
	P6("/srv/archives/registres/registre-1900.txt", "Registre des naissances de Lumen, 1900 a 1949.\n", { ageJours: 900 });
	P6("/srv/archives/registres/plan-des-quartiers.txt", "Les seize quartiers de Lumen, et ce qui les eclaire.\n", { ageJours: 400 });
	D6("/srv/sauvegardes", { owner: "sauvegarde" });
	D6("/mnt/sauvegarde/archives");
	P6("/mnt/sauvegarde/LISEZMOI", "Disque de sauvegarde amovible (etiquette SAUVEGARDE). Il se debranche parfois.\n");
	D6("/boot");
	// La Gazette des rouleaux (quête annexe de l'Imprimeur).
	P6("/srv/gazette/rouleau-1880.txt", "La Gazette de Lumen, rouleau de 1880 : les nouvelles de la cite, jour apres jour.\n", { taille: 120 * MIO6, ageJours: 50, owner: JOUEUR });
	// Le courrier (quête annexe de la Postière) : des lettres datées, une seule récente et importante.
	D6("/srv/courrier", { mode: "rwxr-xr-x" });
	P6("/srv/courrier/lettre-de-la-maire.txt", "Lettre de la maire de Lumen, a remettre au gardien du Coeur :\n\n\"Si la lumiere revient avant la nuit, que la place soit illuminee en l'honneur de qui l'aura rallumee.\"\n", { ageMin: 180 });
	P6("/srv/courrier/avis-de-passage.txt", "Avis de passage : colis non distribue.\n", { ageMin: 1500 });
	P6("/srv/courrier/brouillon.txt", "", { ageMin: 100 });
	// Les comptes et leurs dossiers.
	D6("/root", { mode: "rwx------" });
	D6("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	["operateur", "ninon", "basile"].forEach(function(n){ D6("/home/" + n, { owner: n, mode: "rwxr-x---" }); });
	P6("/home/ninon/carnet.txt", "Carnet de Ninon, arrivee hier a Lumen.\n", { owner: "ninon", taille: 220 * MIO6 });
	P6("/home/basile/photos.tar", "", { owner: "basile", taille: 1400 * MIO6 });
	D6("/home/commun", { mode: "rwxrwxr-x" });
	D6("/tmp", { mode: "rwxrwxrwt" });
	D6("/var/tmp", { mode: "rwxrwxrwt" });
	D6("/proc");
	["meminfo", "mdstat", "loadavg", "swaps", "uptime", "cpuinfo", "mounts", "version"].forEach(function(n){
		var it = P6("/proc/" + n, "", { mode: "r--r--r--" });
		it.taille = 0;
		texteVivant(it, function(){ return estMonLumen() && state && state.reseau && state.reseau.machines && state.reseau.machines[H6] ? texteProcMachine(H6, n) : ""; });
	});
	D6("/run");
	D6("/var/lib/lumen/sessions", { mode: "rwx-wx-wt" });
	D6("/srv/donnees");
	P6("/usr/sbin/sshd", "ELF sshd 9.2p1\n", { mode: "rwxr-xr-x" });
	P6("/usr/sbin/cron", "ELF cron\n", { mode: "rwxr-xr-x" });
}

/* Le registre du messager : l'hôte configuré, et l'adresse à laquelle il répond (null : personne). */
function hoteMessagerCh6(){
	var m = /^\s*base\s*=\s*([^:\s]+)(?::(\d+))?/m.exec(T6("/etc/lumen/messager.conf") || "");
	return m ? { hote: m[1], port: +(m[2] || 5432) } : { hote: null, port: 5432 };
}
function resoudreCh6(nom){
	if (!nom) return null;
	if (/^\d+\.\d+\.\d+\.\d+$/.test(nom)) return nom;
	var ip = null;
	(T6("/etc/hosts") || "").split("\n").forEach(function(l){
		var c = l.replace(/#.*/, "").trim().split(/\s+/);
		if (c.length > 1 && ip === null && c.slice(1).indexOf(nom) > -1) ip = c[0];
	});
	return ip;
}
function messagerJoignableCh6(){
	var c = hoteMessagerCh6(), ip = resoudreCh6(c.hote);
	return (ip === "127.0.0.1" || ip === "127.0.1.1" || ip === IP_LUMEN) && c.port === 5432;
}
function procCh6(comm){ return procsMachine(H6).filter(function(p){ return p.comm === comm && p.etat !== "Z"; })[0] || null; }
function principalCh6(unite){ return procsMachine(H6).filter(function(p){ return p.unite === unite && p.principal; })[0] || null; }

declarerMachine(H6, {
	actif: function(){ return state && state.has && state.has("ch6Ouvert") && estMonLumen(); },
	maintenant: function(){ return maintenantCh6(); },
	pas: PAS_HORLOGE_CH6,
	initial: function(){
		var mapper = function(lv){ return nomMapper("vg_lumen", lv); }, base = DATE_OUVERTURE_CH6;
		return {
			cpus: 4, memoire: { total: 8148512, noyau: 410000, cache: 260000 }, demarrage: base - 41 * 86400000 - 7200000, fuseau: "UTC", derive: 94,
			demarrages: [{ idx: -2, debut: base - 160 * 86400000, fin: base - 95 * 86400000, noyau: "6.1.0-25-amd64" },
				{ idx: -1, debut: base - 95 * 86400000, fin: base - 41 * 86400000 - 7500000, noyau: "6.1.0-25-amd64", crash: true },
				{ idx: 0, debut: base - 41 * 86400000 - 7200000, noyau: "6.1.0-26-amd64" }],
			noyauAttendu: "6.1.0-27-amd64",
			disques: [
				{ nom: "sda", taille: 128035676160, modele: "SSD CITE 128", parts: [{ nom: "sda1", taille: GIO6, partuuid: "9e1d4f2a-01" }, { nom: "sda2", taille: 119 * GIO6, contenu: "LVM2_member" }], smart: { sain: true, realloues: 0, heures: 21810, temperature: 34 } },
				{ nom: "sdb", taille: 500 * GIO6, rotation: 7200, modele: "DISQUE PUITS A 500", parts: [{ nom: "sdb1", taille: 499 * GIO6, contenu: "linux_raid_member" }], smart: { sain: false, realloues: 2810, heures: 43920, temperature: 47, attente: 412 } },
				{ nom: "sdc", taille: 500 * GIO6, rotation: 7200, modele: "DISQUE PUITS B 500", parts: [{ nom: "sdc1", taille: 499 * GIO6, contenu: "linux_raid_member" }], smart: { sain: true, realloues: 212, heures: 43880, temperature: 43, degradation: 3 } },
				{ nom: "sdd", taille: 500 * GIO6, rotation: 7200, modele: "DISQUE NEUF 500", parts: [{ nom: "sdd1", taille: 499 * GIO6 }], smart: { sain: true, realloues: 0, heures: 2, temperature: 31 } },
				{ nom: "sde", taille: 50 * GIO6, modele: "DISQUE RESERVE 50", smart: { sain: true, realloues: 0, heures: 12, temperature: 30 } },
				{ nom: "sdf", taille: 64 * GIO6, amovible: true, modele: "CLE SAUVEGARDE 64", parts: [{ nom: "sdf1", taille: 64 * GIO6 - MIO6 }], smart: { sain: true, realloues: 0, heures: 300, temperature: 29 } }],
			raid: [{ nom: "md0", niveau: 1, disques: 2, taille: 498 * GIO6, uuid: "7f3a91c2:4d5e6f70:8192a3b4:c5d6e7f8", creation: "Tue Mar  4 09:41:12 2025", vitesse: 30,
				membres: [{ dev: "sdb1", numero: 0, etat: "faulty", rang: -1, mineur: 17 }, { dev: "sdc1", numero: 1, etat: "active", rang: 1, mineur: 33 }] }],
			pvs: [{ chemin: "/dev/sda2", vg: "vg_lumen", taille: 119 * GIO6, arrondi: true }],
			vgs: [{ nom: "vg_lumen" }],
			lvs: [{ vg: "vg_lumen", nom: "lv_racine", taille: 20 * GIO6 }, { vg: "vg_lumen", nom: "lv_var", taille: 20 * GIO6 }, { vg: "vg_lumen", nom: "lv_sessions", taille: GIO6 },
				{ vg: "vg_lumen", nom: "lv_donnees", taille: 30 * GIO6 }, { vg: "vg_lumen", nom: "lv_home", taille: 8 * GIO6 }],
			fs: [
				{ source: mapper("lv_racine"), cible: "/", type: "ext4", taille: 20 * GIO6, inodes: 1310720, base: 6.2 * GIO6, baseInodes: 160000, uuid: "0a6c1e2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d", reserve: 0.05, options: "errors=remount-ro", systeme: true },
				{ source: "/dev/sda1", cible: null, pointDeMontage: "/boot", type: "ext4", taille: GIO6, inodes: 65536, base: 210 * MIO6, baseInodes: 412, uuid: "b81f3c7e-52a9-4d10-a6e4-91c0d2f7e358", reserve: 0.05 },
				{ source: mapper("lv_var"), cible: "/var", type: "ext4", taille: 20 * GIO6, inodes: 1310720, base: 5.4 * GIO6, baseInodes: 31000, uuid: "1b7d2e3f-4c5a-4b6c-9d7e-8f9a0b1c2d3e", reserve: 0.05 },
				{ source: mapper("lv_sessions"), cible: "/var/lib/lumen/sessions", type: "ext4", taille: GIO6, inodes: 65536, base: 30 * MIO6, baseInodes: 16, uuid: "2c8e3f4a-5d6b-4c7d-8e9f-0a1b2c3d4e5f", reserve: 0.05, options: "noatime" },
				{ source: mapper("lv_donnees"), cible: "/srv/donnees", type: "ext4", taille: 30 * GIO6, inodes: 1966080, base: 1.1 * GIO6, baseInodes: 240, uuid: "3d9f4a5b-6e7c-4d8e-9f0a-1b2c3d4e5f6a", reserve: 0.05 },
				{ source: mapper("lv_home"), cible: "/home", type: "ext4", taille: 8 * GIO6, inodes: 524288, base: 300 * MIO6, baseInodes: 120, uuid: "4e0a5b6c-7f8d-4e9f-0a1b-2c3d4e5f6a7b", reserve: 0.05, options: "usrquota" },
				{ source: "/dev/md0", cible: "/srv/archives", type: "ext4", taille: 498 * GIO6, inodes: 32604160, base: 212 * GIO6, baseInodes: 41000, uuid: "6f1d2c3b-aa44-4b55-8e66-77f8091a2b3c", label: "archives", reserve: 0.05, ro: true, erreurs: 4, options: "errors=remount-ro", montages: 31, maxMontages: -1 },
				{ source: "/dev/sdf1", cible: "/mnt/sauvegarde", type: "ext4", taille: 64 * GIO6 - MIO6, inodes: 4194304, base: 3.1 * GIO6, baseInodes: 300, uuid: "8a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", label: "SAUVEGARDE", reserve: 0.05 },
				{ source: "tmpfs", cible: "/run", type: "tmpfs", taille: 814 * MIO6, virtuel: true, utilise: 2 * MIO6, inodes: 994000, inodesUtilises: 900, cache: true }],
			virtuels: { "/var/lib/lumen/sessions": [
				{ prefixe: "sess_", nombre: 58800, ageMin: 5200, taille: 210, graine: "lumen-v1", owner: "www-data", mode: "rw-------" },
				{ prefixe: "sess_", nombre: 6700, ageMin: 380, taille: 210, graine: "lumen-v2", owner: "www-data", mode: "rw-------" },
				{ prefixe: "sess_", nombre: 20, ageMin: 18, taille: 210, graine: "lumen-v3", owner: "www-data", mode: "rw-------" }],
				"/srv/courrier": [{ prefixe: "lettre-", nombre: 2400, ageMin: 40 * 1440, taille: 640, graine: "courrier", owner: "root", mode: "rw-r--r--", longueur: 8 }] },
			procs: [
				{ pid: 812, ppid: 1, user: "root", comm: "sshd", cmd: "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups", rss: 9100, ports: [22] },
				{ pid: 1990, ppid: 1, user: "operateur", comm: "bash", cmd: "/bin/bash /home/operateur/export-boucle.sh", rss: 3400, tty: "?", boucle: { comm: "export-registre", cmd: "/usr/local/bin/export-registre --tout", cpu: 99.6, rss: 61000, etat: "R" } },
				{ pid: 1991, ppid: 1990, user: "operateur", comm: "export-registre", cmd: "/usr/local/bin/export-registre --tout", cpu: 99.6, rss: 61000, etat: "R" },
				{ pid: 2440, ppid: 1, user: "operateur", comm: "allumeur", cmd: "/opt/lumen/allumeur --port 8080", rss: 9800, ports: [8080], nohup: true, tty: "?" }
			],
			io: { sda: { util: 14, r: 4, w: 52 }, sdc: { util: 96, r: 230, w: 88 } },
			sockets: { estab: 287, closed: 6, orphaned: 1, timewait: 1340 },
			dpkg: { interrompu: true, casses: [], retenus: [], aConfigurer: [{ nom: "lumen-base", version: "15.4-1" }, { nom: "lumen-web", version: "2.4.1", casse: { depend: "libssl3", version: "3.0.15-1~deb12u1", installee: "3.0.14-1~deb12u2" } }] },
			programmesLongs: {
				"recopier-archives": { comm: "recopier-archives", chemin: "/usr/local/bin/recopier-archives", cpu: 14, rss: 12000, etat: "D", tache: { nom: "recopier-archives", total: 14, pas: 1, libelle: "recopie des registres vers /mnt/sauvegarde" }, annonce: "Recopie des registres vers le disque de sauvegarde : une longue heure (14 commandes)." },
				"chat-errant": { comm: "chat-errant", cpu: 2, rss: 2048, etat: "S", annonce: "Ron... ron... Un chat gris sort de l'ombre et se roule en boule sur ton clavier.", annonceFond: "(Le chat file se cacher sous une rotative.)", annonceFg: "Le chat revient se rouler en boule sur ton clavier." }
			},
			croissanceJournal: 6 * MIO6
		};
	},
	profils: {
		"lumen-web.service": function(h, M, lim){ return [{ comm: "lumen-web", cmd: "/opt/lumen/bin/lumen-web --port 80", cpu: 3.1, rss: 420000, ports: [80], threads: 6 }]; },
		"lumen-base.service": function(h, M, lim){ return [{ comm: "lumen-base", cmd: "/opt/lumen/bin/lumen-base -D /srv/donnees/base", cpu: 7.5, rss: 2600000, ports: [5432], threads: 9, fichiers: [{ fd: "6u", type: "REG", chemin: "/srv/donnees/base/lumen.db", taille: Math.round(27.6 * GIO6) }] }]; },
		"cache-rapports.service": function(h, M, lim){ return [{ comm: "cache-rapports", cmd: "/opt/lumen/bin/cache-rapports", cpu: 34, rss: 2900000, etat: "R", fuite: 45000 }]; },
		"lumen-veilleur.service": function(h, M, lim){ return [{ comm: "lumen-veilleur", cmd: "/opt/lumen/bin/lumen-veilleur", cpu: 0.2, rss: 31000 }]; },
		"lumen-gazette.service": function(h, M, lim){ return [{ comm: "lumen-gazette", cmd: "/opt/lumen/bin/lumen-gazette", cpu: 0.6, rss: 64000 }]; },
		"lumen-catalogue.service": function(h, M, lim){ var n = (lim.nofile || 1024) >= 4096 ? 1840 : 1021; return [{ comm: "lumen-catalogue", cmd: "/opt/lumen/bin/lumen-catalogue", cpu: 1.2, rss: 88000, nofile: n }]; },
		"lumen-indexeur.service": function(h, M, lim){ return [{ comm: "lumen-indexeur", cmd: "/opt/lumen/bin/lumen-indexeur --tout", cpu: 188, rss: 1450000, etat: "R", threads: 8 }]; },
		"lumen-messager.service": function(h, M, lim){
			if (messagerJoignableCh6()) return [{ comm: "lumen-messager", cmd: "/opt/lumen/bin/lumen-messager -c /etc/lumen/messager.conf", cpu: 0.4, rss: 21000, connexions: [{ local: "127.0.0.1:41822", distant: "127.0.0.1:5432", etat: "ESTAB" }] }];
			var ip = resoudreCh6(hoteMessagerCh6().hote) || "0.0.0.0";
			return [{ comm: "lumen-messager", cmd: "/opt/lumen/bin/lumen-messager -c /etc/lumen/messager.conf", cpu: 0, rss: 19000, etat: "S", wchan: "inet_wait_for_connect",
				strace: ["connect(7, {sa_family=AF_INET, sin_port=htons(" + hoteMessagerCh6().port + "), sin_addr=inet_addr(\"" + ip + "\")}, 16"],
				connexions: [{ local: IP_LUMEN + ":51344", distant: ip + ":" + hoteMessagerCh6().port, etat: "SYN-SENT" }] }];
		},
		"lumen-archiviste.service": function(h, M, lim){ return [{ comm: "lumen-archiviste", cmd: "/opt/lumen/bin/lumen-archiviste", cpu: 0.3, rss: 26000, cwd: "/srv/archives", fichiers: [{ fd: "5r", type: "REG", chemin: "/srv/archives/registres/registre-1900.txt", taille: 48 }] }]; },
		"allumeur.service": function(h, M, lim){ return [{ comm: "allumeur", cmd: "/opt/lumen/allumeur --port 8080", cpu: 0.1, rss: 9800, ports: [8080] }]; }
	},
	bibliotheques: { "lumen-web.service": true, "lumen-messager.service": true },
	tempsDemarrage: { "lumen-attente-reseau.service": 90004, "lumen-base.service": 3121, "lumen-web.service": 1894, "lumen-catalogue.service": 812, "lumen-indexeur.service": 433, "ssh.service": 241, "cron.service": 37 },
	web: function(h, chemin, methode){
		if (!etatUnite(h, "lumen-web.service").actif) return { injoignable: true };
		var fsVar = fsParCible(h, "/var"), plein = fsVar && libreFs(h, fsVar).dispo < 64 * MIO6;
		var temps = 0.084;
		if (plein) temps += 3.9;
		if (procCh6("export-registre")) temps += 0.7;
		if (procCh6("lumen-indexeur") && cpuEffectif(h, procCh6("lumen-indexeur")) > 100) temps += 0.4;
		if (!etatUnite(h, "lumen-base.service").actif) return { code: 502, temps: 0.012, corps: "<html><body><h1>502 Bad Gateway</h1></body></html>" };
		return { code: plein ? 503 : 200, temps: temps, corps: plein ? "<html><body><h1>503 Service Unavailable</h1><p>No space left on device</p></body></html>" : "<!DOCTYPE html>\n<html><head><title>Lumen</title></head><body><h1>Lumen, la cite</h1></body></html>" };
	}
});

/* La machine et ses services : décrits au chargement (ssh, nmap). Leurs détails (paquets, unités), à l'ouverture. */
decrireHote(H6, {
	ip: IP_LUMEN, ouvert: true, noyau: "6.1.0-26-amd64",
	arrivee: function(){ return CoeurDeLumen; },
	refus: function(){ return typeof refusLumen === "function" ? refusLumen() : null; }
});
construireLumen();

/* Les sous-dossiers de la machine ne comptent pas comme des lieux à découvrir : seule la machine compte. */
(function marquer(lieu){ lieu.children.forEach(function(c){ if (c !== lieu && c.parents[0] === lieu){ c.horsBareme = true; c.chapitre = 7; marquer(c); } }); })(CoeurDeLumen);

var LUMEN_DECLARE = false;
function declarerMondeLumen(){
	if (LUMEN_DECLARE || !estMonLumen()) return;
	LUMEN_DECLARE = true;
	[["lumen-web.service", true], ["lumen-base.service", true], ["cache-rapports.service", true], ["lumen-veilleur.service", true], ["lumen-gazette.service", false],
	 ["lumen-attente-reseau.service", true], ["lumen-catalogue.service", true], ["lumen-indexeur.service", true], ["lumen-messager.service", true], ["lumen-archiviste.service", true],
	 ["ssh.service", true], ["cron.service", true], ["systemd-journald.service", true], ["logrotate.timer", true], ["systemd-tmpfiles-clean.timer", true]].forEach(function(u){
		declarerUnite(H6, u[0], { actif: u[1], enabled: true });
	});
	function paquet(nom, def){ def.poser = false; def.fichiers = def.fichiers || {}; declarerPaquet(H6, nom, def); }
	paquet("libssl3", { version: "3.0.14-1~deb12u2", disponible: "3.0.15-1~deb12u1", description: "Secure Sockets Layer toolkit - shared libraries", section: "libs", taille: 6084 });
	paquet("lumen-web", { version: "2.4.1", description: "Lumen, le site de la cite", depends: ["libssl3", "lumen-base"], services: ["lumen-web"], taille: 2210, section: "web" });
	paquet("lumen-base", { version: "15.4-1", disponible: "15.5-1", description: "Lumen, la base de donnees de la cite", depends: ["libssl3", "libc6"], services: ["lumen-base"], taille: 48210, section: "database" });
	paquet("lumen-outils", { version: "1.2.0", description: "Lumen, les programmes des quartiers (gazette, catalogue, indexeur, messager)", depends: ["lumen-base"], taille: 912 });
	paquet("linux-image-6.1.0-26-amd64", { version: "6.1.112-1", description: "Linux 6.1 for 64-bit PCs (signed)", section: "kernel", taille: 401220 });
	paquet("linux-image-6.1.0-27-amd64", { version: "6.1.115-1", description: "Linux 6.1 for 64-bit PCs (signed)", section: "kernel", taille: 401560 });
	paquet("openssh-server", { version: "1:9.2p1-2+deb12u3", description: "secure shell (SSH) server, for secure access from remote machines", services: ["ssh"], taille: 1923, section: "net" });
	paquet("smartmontools", { version: "7.3-pre1-1", description: "control and monitor storage systems using S.M.A.R.T.", taille: 2120 });
	paquet("mdadm", { version: "4.2-5", description: "Tool to administer Linux MD arrays (software RAID)", taille: 1420 });
	paquet("lvm2", { version: "2.03.16-2", description: "Linux Logical Volume Manager", taille: 2930 });
	paquet("sysstat", { version: "12.6.1-1", description: "system performance tools for Linux", taille: 1790 });
	paquet("tmux", { version: "3.3a-3", description: "terminal multiplexer", taille: 1121 });
	paquet("strace", { version: "6.1-0.1", description: "System call tracer", taille: 2190 });
	paquet("ncdu", { version: "1.18-0.2", description: "ncurses disk usage viewer", taille: 101 });
	paquet("needrestart", { version: "3.6-4+deb12u1", description: "check which daemons need to be restarted after library upgrades", taille: 501 });
	paquet("quota", { version: "4.06-1+b2", description: "disk quota management tools", taille: 1210 });
	paquet("logrotate", { version: "3.21.0-1", description: "Log rotation utility", taille: 160 });
	paquet("libc6", { version: "2.36-9+deb12u8", description: "GNU C Library: Shared libraries", section: "libs", taille: 12986, priorite: "required" });
	declarerEcoute(H6, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }]);
	declarerNoyau(H6, { version: "6.1.0-26-amd64" });
}

/* ------------------------------------------------------------------ */
/* L'horloge de la journée : 6 h, deux minutes par commande, la Longue Nuit à 14 h */
/* ------------------------------------------------------------------ */

function heureCh6(){
	var total = 6 * 60 + sCh6().horloge;
	return deuxChiffres(Math.floor(total / 60) % 24) + ":" + deuxChiffres(total % 60);
}
function minutesAvantNuit(){ return NUIT_CH6 - sCh6().horloge; }
function texteAvantNuit(){
	var m = Math.max(0, minutesAvantNuit());
	return Math.floor(m / 60) + " h " + deuxChiffres(m % 60);
}
function baseJourCh6(){
	var d = new Date();
	d.setHours(6, 0, 0, 0);
	return d.getTime();
}
function avancerHorlogeCh6(){
	var c = sCh6();
	if (!state.quests["m6_entree"]) return;
	if (c.dernierNb === null || c.dernierNb === undefined) c.dernierNb = state.nbCommandes;
	if (state.nbCommandes > c.dernierNb){
		c.horloge += (state.nbCommandes - c.dernierNb) * PAS_HORLOGE_CH6;
		c.dernierNb = state.nbCommandes;
	}
	// Grace égrène l'heure, à chaque heure pleine.
	var heure = Math.floor((6 * 60 + c.horloge) / 60);
	if (c.heureAnnoncee === undefined || c.heureAnnoncee === null) c.heureAnnoncee = heure;
	if (heure > c.heureAnnoncee){
		c.heureAnnoncee = heure;
		if (!state.has("rejeuEnCours") && !c.nuit && heure < 14) say(C.gris("(Radio : « Grace : il est " + heure + " h. " +
			(heure === 13 ? "La Longue Nuit dans une heure. »)" : (heure === 12 ? "Midi : l'heure du défi de Laurent est passée. La Longue Nuit à 14 h. »)" : "La Longue Nuit à 14 h. »)"))));
	}
}

/* Ce qui se pose une seule fois, à l'ouverture : l'histoire de la nuit dernière dans le journal, les services qui la portent. */
function seminerCh6(){
	var c = sCh6();
	if (c.seme) return;
	c.seme = true;
	var M = etatMachine(H6), t = maintenantCh6();
	synchroniserUnites(H6);
	// Le fantôme des Docks : un journal de débogage effacé à la main cette nuit, que lumen-web tient encore ouvert.
	var web = principalCh6("lumen-web.service");
	if (web){
		var fsVar = fsParCible(H6, "/var");
		web.fichiers = (web.fichiers || []).concat([{ fd: "7w", type: "REG", chemin: "/var/log/lumen/debug.log", taille: Math.round(6.3 * GIO6), supprime: true, fs: fsVar ? fsVar.source : null },
			{ fd: "8w", type: "REG", chemin: "/var/log/lumen/acces.log", taille: 12 * MIO6 }]);
	}
	// Les spectres de la Tour de l'Horloge : les rondes de nuit mortes que le veilleur n'a jamais relevées.
	var veilleur = principalCh6("lumen-veilleur.service");
	if (veilleur) for (var i = 0; i < 3; i++) lancerProcessusMachine(H6, { ppid: veilleur.pid, user: "root", comm: "ronde-de-nuit", cmd: "[ronde-de-nuit]", etat: "Z", rss: 0, vsz: 0, unite: "lumen-veilleur.service", debut: t - (90 + i * 40) * 60000 });
	// Le Labyrinthe : la gazette n'a pas démarré (une dépendance qui n'existe pas).
	marquerEchec(H6, uniteInfo(H6, "lumen-gazette.service"));
	// La nuit dernière, dans le journal.
	var j = function(min, e){ e.t = t - min * 60000; journalMachine(H6, e); };
	j(41 * 1440 + 125, { unite: "kernel", noyau: true, boot: -1, prio: 0, message: "Kernel panic - not syncing: Fatal exception in interrupt" });
	j(41 * 1440 + 120, { unite: "systemd", pid: 1, message: "Reached target multi-user.target - Multi-User System." });
	j(41 * 1440 + 119, { unite: "systemd", pid: 1, unit: "lumen-gazette.service", prio: 3, message: "Dependency failed for lumen-gazette.service - Lumen, la gazette du matin." });
	j(41 * 1440 + 119, { unite: "systemd", pid: 1, unit: "lumen-gazette.service", prio: 4, message: "lumen-gazette.service: Job lumen-gazette.service/start failed with result 'dependency'." });
	j(41 * 1440 + 118, { unite: "systemd", pid: 1, unit: "lumen-attente-reseau.service", prio: 4, message: "lumen-attente-reseau.service: start operation timed out. Terminating." });
	j(41 * 1440 + 118, { unite: "attendre-reseau", pid: 611, unit: "lumen-attente-reseau.service", prio: 4, message: "ancien-reseau injoignable, on attend encore (90 s)" });
	j(600, { unite: "kernel", noyau: true, prio: 3, message: "md/raid1:md0: Disk failure on sdb1, disabling device.\nmd/raid1:md0: Operation continuing on 1 devices." });
	j(590, { unite: "smartd", pid: 702, prio: 2, message: "Device: /dev/sdb [SAT], FAILED SMART self-check. BACK UP DATA NOW!" });
	j(585, { unite: "smartd", pid: 702, prio: 4, message: "Device: /dev/sdc [SAT], 12 Currently unreadable (pending) sectors" });
	j(420, { unite: "kernel", noyau: true, prio: 3, message: "EXT4-fs error (device md0): ext4_lookup:1855: inode #2621441: comm lumen-archiviste: deleted inode referenced: 2621502" });
	j(420, { unite: "kernel", noyau: true, prio: 2, message: "EXT4-fs (md0): Remounting filesystem read-only" });
	j(240, { unite: "kernel", noyau: true, prio: 3, message: "lumen-base invoked oom-killer: gfp_mask=0x140cca(GFP_HIGHUSER_MOVABLE|__GFP_COMP), order=0, oom_score_adj=0" });
	j(240, { unite: "kernel", noyau: true, prio: 3, message: "Out of memory: Killed process 1402 (lumen-base) total-vm:4123456kB, anon-rss:2711040kB, file-rss:0kB, shmem-rss:0kB, UID:991 pgtables:5420kB oom_score_adj:0" });
	j(239, { unite: "systemd", pid: 1, unit: "lumen-base.service", prio: 4, message: "lumen-base.service: A process of this unit has been killed by the OOM killer." });
	j(238, { unite: "systemd", pid: 1, unit: "lumen-base.service", message: "lumen-base.service: Scheduled restart job, restart counter is at 1." });
	j(180, { unite: "sudo", pid: 2777, prio: 5, message: "operateur : TTY=pts/1 ; PWD=/var/log/lumen ; USER=root ; COMMAND=/usr/bin/rm debug.log" });
	j(120, { unite: "lumen-catalogue", pid: 1730, unit: "lumen-catalogue.service", prio: 3, message: "accept4: Too many open files (24)" });
	j(118, { unite: "lumen-catalogue", pid: 1730, unit: "lumen-catalogue.service", prio: 3, message: "open(/srv/donnees/catalogue/fiche-4401): Too many open files" });
	j(90, { unite: "lumen-web", pid: 1680, unit: "lumen-web.service", prio: 3, message: "write /var/log/lumen/lumen.log: No space left on device" });
	j(60, { unite: "lumen-messager", pid: 1755, unit: "lumen-messager.service", prio: 4, message: "connexion au registre (registre-ancien:5432) : toujours en attente" });
	j(30, { unite: "dpkg", pid: 2810, prio: 3, message: "mise a jour interrompue : la machine a manque de place pendant la configuration de lumen-base" });
	j(5, { unite: "lumen-web", pid: 1680, unit: "lumen-web.service", prio: 3, message: "GET /plan 503 4.81s : No space left on device" });
	// La première mesure de l'Observatoire : la latence de la nuit, notée par Donald.
	M.mesuresCurl = [{ t: t - 30 * 60000, temps: 4.91, code: 503 }];
	M.journaldMax = null;
}

/* ------------------------------------------------------------------ */
/* L'ouverture du chapitre                                             */
/* ------------------------------------------------------------------ */

function relierLumen(){
	var parent = state.has("ch5Ouvert") || !state.has("ch6Direct") ? HallBastion : SalleServeurs;
	if (parent.children.indexOf(HallLumen) === -1) relier(parent, HallLumen);
}

/* ------------------------------------------------------------------ */
/* Les étapes                                                          */
/* ------------------------------------------------------------------ */

var QUETES_CH6 = [
	{ id: "m6_entree", titre: "Descendre à Lumen",
	  indice: "Sous le Bastion, un escalier s'enfonce dans la roche : cd Lumen depuis le hall du Bastion (ou cd ~/Cybersup/SalleServeurs, puis cd Lumen, au départ direct)." },
	{ id: "m6_lanterne", titre: "Écouter Laurent, lire l'ordre de mission, consulter le Phare de Lumen",
	  indice: "Sur la place : cat Laurent, cat Mission, puis lanterne (une commande du jeu) : le plan de la cité et la lumière de départ." },
	{ id: "m6_disque", titre: "Docks : /var est plein, trouver le coupable et le retirer",
	  indice: "Docks (Seymour). Sur lumen : df -h montre /var à 100 %. du -sh /var/* | sort -h, ncdu /var ou find /var -size +500M trouvent le coupable : une vieille archive oubliée." },
	{ id: "m6_fantome", titre: "Docks : le fichier fantôme, effacé mais toujours ouvert",
	  indice: "df dit encore plein ? sudo lsof +L1 montre un fichier effacé que tient encore un service. Le relancer (systemctl restart) rend la place." },
	{ id: "m6_inodes", titre: "Archives : plus une fiche libre (les inodes), nettoyer les vieilles sessions",
	  indice: "Archives (Kathleen). df -i : /var/lib/lumen/sessions à 100 %. find ... -type f -mmin +60 -delete retire les sessions de plus d'une heure, pas celles des habitants connectés." },
	{ id: "m6_tmpfiles", titre: "Archives : que les vieilles fiches partent seules (systemd-tmpfiles)",
	  indice: "Une ligne dans /etc/tmpfiles.d/ (type d, le dossier des sessions, un âge comme 1h), puis sudo systemd-tmpfiles --clean pour l'éprouver." },
	{ id: "m6_logrotate", titre: "Gazette : faire tourner le journal de la cité (logrotate)",
	  indice: "Gazette (Ida). /etc/logrotate.d/lumen pour /var/log/lumen/*.log : daily, rotate 7, compress, missingok, notifempty, maxsize 100M. sudo logrotate -d d'abord, puis sudo logrotate -f." },
	{ id: "m6_journal", titre: "Gazette : borner le journal de systemd",
	  indice: "journalctl --disk-usage, sudo journalctl --vacuum-size=200M, puis SystemMaxUse=200M dans /etc/systemd/journald.conf et sudo systemctl restart systemd-journald." },
	{ id: "m6_memoire", titre: "Forges : la mémoire saturée, le cache qui fuit sous une limite",
	  indice: "Forges (Gordon). free -h (available), sudo dmesg -T | grep -i oom, ps aux --sort=-%mem | head. Puis MemoryMax=1G pour cache-rapports (sudo systemctl edit, ou un drop-in) et un redémarrage." },
	{ id: "m6_swap", titre: "Forges : un fichier d'échange de secours, et la swappiness à 10",
	  indice: "fallocate -l 2G /swapfile, chmod 600, mkswap, swapon, une ligne dans /etc/fstab ; puis vm.swappiness = 10 dans /etc/sysctl.d/ et sudo sysctl --system." },
	{ id: "m6_cpu", titre: "Tour de l'Horloge : l'engrenage fou (renice, puis kill)",
	  indice: "Tour de l'Horloge (Niklaus). uptime et top -b -n 1 ; ps -o pid,ppid,ni,%cpu,cmd. sudo renice +19 d'abord, puis kill (SIGTERM) : l'export et la boucle qui le relance." },
	{ id: "m6_zombie", titre: "Tour de l'Horloge : les spectres (processus zombies)",
	  indice: "ps aux | grep defunct, ps -o ppid= -p PID : on ne tue pas un spectre, on relance son parent (sudo systemctl restart du service qui les a engendrés)." },
	{ id: "m6_lvm", titre: "Citernes : agrandir le volume de la base, à chaud",
	  indice: "Citernes (Sophie). lsblk, sudo vgs (de la place libre), sudo lvextend -L +20G /dev/vg_lumen/lv_donnees puis sudo resize2fs (ou lvextend -r), df -h /srv/donnees." },
	{ id: "m6_snapshot", titre: "Citernes : un instantané avant l'opération risquée, puis le retirer",
	  indice: "sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees, sudo lvs (le voir), puis sudo lvremove -y /dev/vg_lumen/avant_maj." },
	{ id: "m6_fstab", titre: "Porte du Matin : un fstab qui laisse la cité se réveiller",
	  indice: "Porte du Matin (Lynn). sudo findmnt --verify ; blkid donne le vrai UUID de /dev/sda1 ; nofail pour le disque de sauvegarde amovible ; puis sudo systemctl daemon-reload." },
	{ id: "m6_montage", titre: "Porte du Matin : tout monter sans erreur (mount -a)",
	  indice: "sudo mount -a doit tout monter sans un mot, /boot compris ; findmnt /boot pour vérifier." },
	{ id: "m6_unite", titre: "Ateliers : l'allumeur devient un service (une unité systemd écrite à la main)",
	  indice: "Ateliers (Mary). /etc/systemd/system/allumeur.service (Description, User=allumeur, ExecStart=/opt/lumen/allumeur --port 8080, Restart=on-failure, WantedBy=multi-user.target). Arrête d'abord l'allumeur lancé à la main (il tient le port), daemon-reload, enable --now." },
	{ id: "m6_redemarrage", titre: "Ateliers : l'éprouver, il revient seul (Restart=)",
	  indice: "sudo systemctl kill -s KILL allumeur, puis systemctl status allumeur et sudo journalctl -u allumeur : il est revenu, et le journal le dit." },
	{ id: "m6_timer", titre: "Crypte des mémoires : la sauvegarde de chaque nuit (service et timer)",
	  indice: "Crypte des mémoires (Betty). sauvegarde.service (Type=oneshot, ExecStart=/usr/local/bin/sauvegarde.sh) et sauvegarde.timer (OnCalendar=*-*-* 02:00, Persistent=true), daemon-reload, enable --now sauvegarde.timer, systemctl list-timers." },
	{ id: "m6_restauration", titre: "Crypte des mémoires : une sauvegarde qu'on a restaurée",
	  indice: "sudo systemctl start sauvegarde ; mkdir /tmp/restauration ; sudo tar xzf l'archive -C /tmp/restauration ; diff -r /srv/archives/registres /tmp/restauration/srv/archives/registres." },
	{ id: "m6_mesures", titre: "Observatoire : mesurer la charge, les disques, la mémoire, le réseau",
	  indice: "Observatoire (Donald). uptime et nproc, iostat -x, sar (-u, -r ou -q), ss -s : tout sur lumen." },
	{ id: "m6_latence", titre: "Observatoire : mesurer le temps de réponse de la cité, et le noter",
	  indice: "curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/ : une fois les Docks réparés et l'export de la Tour arrêté, il passe sous la demi-seconde. Note la mesure dans ~/carnet.txt sur lumen (>>)." },
	{ id: "m6_raid", titre: "Puits : le miroir dégradé, remplacer la source tarie",
	  indice: "Puits (Dorothy). cat /proc/mdstat ([_U]), sudo mdadm --detail /dev/md0, puis sudo mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1 et --add /dev/sdd1. Suis la reconstruction." },
	{ id: "m6_smart", titre: "Puits : la santé des disques (SMART), le prochain à mourir",
	  indice: "sudo smartctl -H /dev/sdb (FAILED), sudo smartctl -a /dev/sdc : Reallocated_Sector_Ct grimpe. À noter dans le rapport." },
	{ id: "m6_fsck", titre: "Thermes : réparer le système de fichiers des archives (e2fsck)",
	  indice: "Thermes (Ruth). mount | grep archives (ro), sudo dmesg -T ; démonter (sudo umount, fuser -vm si occupé), sudo e2fsck -f -y /dev/md0, puis remonter." },
	{ id: "m6_tune2fs", titre: "Thermes : régler les vérifications et la réserve (tune2fs)",
	  indice: "sudo tune2fs -l /dev/md0 (Mount count, Reserved block count), sudo tune2fs -c 30 /dev/md0 et sudo tune2fs -m 1 /dev/md0." },
	{ id: "m6_dpkg", titre: "Grand Marché : une mise à jour interrompue, réparer apt",
	  indice: "Grand Marché (Charles). sudo dpkg --configure -a, sudo apt --fix-broken install, sudo apt update, apt list --upgradable." },
	{ id: "m6_hold", titre: "Grand Marché : épingler la base, relancer ce qui doit l'être",
	  indice: "sudo apt-mark hold lumen-base, apt-mark showhold ; cat /var/run/reboot-required ; sudo needrestart -r l, puis relancer les services qu'il cite." },
	{ id: "m6_failed", titre: "Labyrinthe : le service qui attend une porte qui n'existe pas",
	  indice: "Labyrinthe (John). systemctl --failed, sudo journalctl -b -p err, systemctl list-dependencies lumen-gazette ; corriger Requires= (lumen-base.service), daemon-reload, start, reset-failed." },
	{ id: "m6_demarrage", titre: "Labyrinthe : celui qui fait attendre tout le monde au démarrage",
	  indice: "systemd-analyze, systemd-analyze blame, systemd-analyze critical-chain : lumen-attente-reseau attend 90 s. TimeoutStartSec=10 dans un drop-in, ou le désactiver (il attend un réseau disparu)." },
	{ id: "m6_ulimit", titre: "Bibliothèque des limites : « Too many open files »",
	  indice: "Bibliothèque (Kay). sudo journalctl -u lumen-catalogue ; cat /proc/PID/limits ; sudo ls /proc/PID/fd | wc -l ; LimitNOFILE=65536 (drop-in), daemon-reload, restart." },
	{ id: "m6_cgroups", titre: "Bibliothèque des limites : une part de lumière pour l'indexeur (groupes de contrôle)",
	  indice: "systemd-cgtop ; sudo systemctl set-property lumen-indexeur CPUQuota=50% MemoryMax=2G ; systemctl show -p CPUQuotaPerSecUSec,MemoryMax lumen-indexeur." },
	{ id: "m6_strace", titre: "Guetteur : le messager qui attend une réponse qui ne viendra pas",
	  indice: "Guetteur (Klara). ps -o pid,stat,wchan,cmd, sudo strace -p PID : il est bloqué sur connect. getent hosts registre-ancien : l'adresse d'un registre éteint. Corrige /etc/lumen/messager.conf (le registre est local), restart." },
	{ id: "m6_tmux", titre: "Guetteur : une longue recopie qui survit à la déconnexion",
	  indice: "tmux new -s copie, puis /usr/local/bin/recopier-archives, puis tmux detach (ou nohup ... &) ; exit, ssh lumen, tmux attach : elle a continué. watch -n 2 pour suivre." },
	{ id: "m6_nuit", titre: "La Longue Nuit : tenir, surveiller en direct et réparer les avaries",
	  indice: "À 14 h (ou plus tôt, si les seize quartiers sont rallumés), la Longue Nuit tombe. Surveille (uptime, free -h, top -b -n 1, journalctl -f ou -u) et répare chaque avarie que lanterne signale." },
	{ id: "m6_lanterne_finale", titre: "Le Phare de Lumen au-dessus de 90",
	  indice: "Après la Nuit, lanterne doit dépasser 90 : elle dit ce qui reste éteint." },
	{ id: "m6_rapport", titre: "Rédiger le rapport de remise en service et le remettre à Laurent",
	  indice: "~/lumen/rapport.txt (dans ta Maison) avec cinq rubriques : avaries, causes, réparations, mesures (la latence avant et après), reste (le disque sdc). Puis une copie dans la BoiteDeLaurent de la place." }
];
var QUETES_SECONDAIRES_CH6 = [];   // les défis des gardiens et de Laurent : Machines.js

var INDICES_CH6 = {
	m6_entree: ["L'escalier part du hall du Bastion.", "cd ~/Cybersup/SalleServeurs/Academie/Bastion, puis cd Lumen"],
	m6_lanterne: ["Laurent et l'ordre de mission sont sur la place ; lanterne est une commande du jeu.", "cat Laurent ; cat Mission ; lanterne"],
	m6_disque: ["Le coupable est dans /var/backups : une archive de plus de 200 jours.", "ssh lumen ; df -h ; sudo du -sh /var/* | sort -h ; sudo find /var -size +500M ; sudo rm /var/backups/lumen-2024.tar.gz"],
	m6_fantome: ["lsof +L1 liste les fichiers dont le dernier lien a disparu (NLINK 0) : le service les tient ouverts.", "sudo lsof +L1 ; sudo systemctl restart lumen-web ; df -h /var"],
	m6_inodes: ["Les sessions récentes (moins d'une heure) appartiennent à des habitants connectés : on ne les touche pas.", "df -i ; sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete ; df -i"],
	m6_tmpfiles: ["Une ligne : d CHEMIN MODE UTILISATEUR GROUPE ÂGE.", "echo 'd /var/lib/lumen/sessions 1733 root root 1h' | sudo tee /etc/tmpfiles.d/lumen-sessions.conf ; sudo systemd-tmpfiles --clean"],
	m6_logrotate: ["Un bloc par motif de fichiers, entre accolades ; -d n'écrit rien, -f force la rotation.", "printf '/var/log/lumen/*.log {\\n\\tdaily\\n\\trotate 7\\n\\tcompress\\n\\tmissingok\\n\\tnotifempty\\n\\tmaxsize 100M\\n}\\n' | sudo tee /etc/logrotate.d/lumen ; sudo logrotate -d /etc/logrotate.d/lumen ; sudo logrotate -f /etc/logrotate.d/lumen"],
	m6_journal: ["--vacuum-size fait le ménage maintenant ; SystemMaxUse le borne pour toujours (après un redémarrage de journald).", "journalctl --disk-usage ; sudo journalctl --vacuum-size=200M ; sudo sed -i 's/^#SystemMaxUse=/SystemMaxUse=200M/' /etc/systemd/journald.conf ; sudo systemctl restart systemd-journald"],
	m6_memoire: ["Le gros consommateur est cache-rapports ; un drop-in [Service] MemoryMax=1G, daemon-reload, restart.", "free -h ; sudo dmesg -T | grep -i oom ; ps aux --sort=-%mem | head -5 ; sudo mkdir -p /etc/systemd/system/cache-rapports.service.d ; printf '[Service]\\nMemoryMax=1G\\n' | sudo tee /etc/systemd/system/cache-rapports.service.d/memoire.conf ; sudo systemctl daemon-reload ; sudo systemctl restart cache-rapports"],
	m6_swap: ["mkswap refuse les fichiers lisibles par tous : chmod 600 d'abord. La swappiness se grave dans /etc/sysctl.d.", "sudo fallocate -l 2G /swapfile ; sudo chmod 600 /swapfile ; sudo mkswap /swapfile ; sudo swapon /swapfile ; echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab ; echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/99-swap.conf ; sudo sysctl --system"],
	m6_cpu: ["Le parent de l'export est une boucle (bash) : tuer l'enfant ne suffit pas, elle le relance.", "top -b -n 1 | head -12 ; sudo renice +19 -p $(pgrep -x export-registre) ; sudo kill $(pgrep -f export-boucle) ; sudo kill $(pgrep -x export-registre)"],
	m6_zombie: ["Les spectres sont des enfants de lumen-veilleur : ps -o ppid= -p le dit.", "ps -eo pid,ppid,stat,comm | grep Z ; ps -o ppid= -p $(pgrep -x ronde-de-nuit | head -1) ; sudo systemctl restart lumen-veilleur"],
	m6_lvm: ["lvextend agrandit le volume, resize2fs le système de fichiers : les deux.", "sudo vgs ; sudo lvextend -L +20G /dev/vg_lumen/lv_donnees ; sudo resize2fs /dev/mapper/vg_lumen-lv_donnees ; df -h /srv/donnees"],
	m6_snapshot: ["-s fait un instantané ; il occupe de la place dans le groupe tant qu'il existe.", "sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees ; sudo lvs ; sudo lvremove -y /dev/vg_lumen/avant_maj"],
	m6_fstab: ["blkid -s UUID -o value /dev/sda1 donne le bon UUID ; nofail s'ajoute aux options du disque de sauvegarde.", "sudo findmnt --verify ; sudo blkid /dev/sda1 ; sudo sed -i 's/4c2e8a1f-7d3b-4e5a-9c61-0b8f2d3e4a57/b81f3c7e-52a9-4d10-a6e4-91c0d2f7e358/' /etc/fstab ; sudo sed -i 's#/mnt/sauvegarde       ext4    defaults#/mnt/sauvegarde       ext4    defaults,nofail#' /etc/fstab ; sudo findmnt --verify ; sudo systemctl daemon-reload"],
	m6_montage: ["mount -a monte tout ce que fstab liste et qui ne l'est pas encore.", "sudo mount -a ; findmnt /boot"],
	m6_unite: ["L'ancien allumeur tient le port 8080 : tant qu'il tourne, le service échoue (Address already in use).", "sudo pkill -x allumeur ; printf '[Unit]\\nDescription=L allumeur des reverberes\\nAfter=network-online.target\\n\\n[Service]\\nUser=allumeur\\nExecStart=/opt/lumen/allumeur --port 8080\\nRestart=on-failure\\nRestartSec=5\\n\\n[Install]\\nWantedBy=multi-user.target\\n' | sudo tee /etc/systemd/system/allumeur.service ; sudo systemctl daemon-reload ; sudo systemctl enable --now allumeur"],
	m6_redemarrage: ["Tué par KILL, c'est un échec : Restart=on-failure le relance.", "sudo systemctl kill -s KILL allumeur ; systemctl status allumeur ; sudo journalctl -u allumeur"],
	m6_timer: ["Le service n'a pas de [Install] : c'est le timer qu'on active.", "printf '[Unit]\\nDescription=Sauvegarde de la cite\\n\\n[Service]\\nType=oneshot\\nExecStart=/usr/local/bin/sauvegarde.sh\\n' | sudo tee /etc/systemd/system/sauvegarde.service ; printf '[Unit]\\nDescription=Sauvegarde chaque nuit\\n\\n[Timer]\\nOnCalendar=*-*-* 02:00\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde.timer ; sudo systemctl daemon-reload ; sudo systemctl enable --now sauvegarde.timer ; systemctl list-timers"],
	m6_restauration: ["L'archive est dans /srv/sauvegardes ; -C choisit où extraire ; diff -r ne dit rien si tout est identique.", "sudo systemctl start sauvegarde ; ls /srv/sauvegardes ; mkdir /tmp/restauration ; sudo tar xzf /srv/sauvegardes/lumen-*.tar.gz -C /tmp/restauration ; diff -r /srv/archives/registres /tmp/restauration/srv/archives/registres"],
	m6_mesures: ["Cinq instruments : uptime, nproc, iostat -x, sar, ss -s.", "uptime ; nproc ; iostat -x 1 2 ; sar -q ; ss -s"],
	m6_latence: ["-w choisit ce que curl affiche ; >> ajoute à la fin du carnet.", "curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/ >> ~/carnet.txt ; cat ~/carnet.txt"],
	m6_raid: ["D'abord retirer la source morte (--fail, --remove), puis ajouter la neuve (--add) : la reconstruction suit son cours.", "cat /proc/mdstat ; sudo mdadm --detail /dev/md0 ; sudo mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1 ; sudo mdadm /dev/md0 --add /dev/sdd1 ; cat /proc/mdstat"],
	m6_smart: ["-H donne le verdict ; -a, tous les attributs.", "sudo smartctl -H /dev/sdb ; sudo smartctl -a /dev/sdc | grep -i reallocated"],
	m6_fsck: ["umount refuse tant qu'un processus y travaille : fuser -vm le nomme ; le service lumen-archiviste s'arrête le temps de la réparation.", "mount | grep archives ; sudo fuser -vm /srv/archives ; sudo systemctl stop lumen-archiviste ; sudo umount /srv/archives ; sudo e2fsck -f -y /dev/md0 ; sudo mount /srv/archives ; sudo systemctl start lumen-archiviste"],
	m6_tune2fs: ["-c fixe le nombre de montages entre deux vérifications ; -m la part réservée à root.", "sudo tune2fs -l /dev/md0 | grep -i -e 'mount count' -e reserved ; sudo tune2fs -c 30 /dev/md0 ; sudo tune2fs -m 1 /dev/md0"],
	m6_dpkg: ["Dans l'ordre : finir la configuration, réparer les dépendances, relire les dépôts.", "sudo dpkg --configure -a ; sudo apt --fix-broken install ; sudo apt update ; apt list --upgradable"],
	m6_hold: ["needrestart -r l liste sans rien relancer ; la bibliothèque mise à jour est encore en mémoire de deux services.", "sudo apt-mark hold lumen-base ; apt-mark showhold ; cat /var/run/reboot-required ; sudo needrestart -r l ; sudo systemctl restart lumen-web lumen-messager"],
	m6_failed: ["La faute est dans Requires= : lumen-db.service n'existe pas, la base s'appelle lumen-base.", "systemctl --failed ; sudo journalctl -b -p err ; systemctl list-dependencies lumen-gazette ; sudo cp /lib/systemd/system/lumen-gazette.service /etc/systemd/system/ ; sudo sed -i 's/lumen-db/lumen-base/' /etc/systemd/system/lumen-gazette.service ; sudo systemctl daemon-reload ; sudo systemctl start lumen-gazette ; sudo systemctl reset-failed"],
	m6_demarrage: ["blame trie par durée ; critical-chain montre qui attend qui.", "systemd-analyze ; systemd-analyze blame ; systemd-analyze critical-chain ; sudo systemctl disable lumen-attente-reseau"],
	m6_ulimit: ["Les limites d'un service se règlent dans son unité (LimitNOFILE), pas dans le shell.", "sudo journalctl -u lumen-catalogue | tail -3 ; cat /proc/$(pidof lumen-catalogue)/limits ; sudo ls /proc/$(pidof lumen-catalogue)/fd | wc -l ; sudo mkdir -p /etc/systemd/system/lumen-catalogue.service.d ; printf '[Service]\\nLimitNOFILE=65536\\n' | sudo tee /etc/systemd/system/lumen-catalogue.service.d/limites.conf ; sudo systemctl daemon-reload ; sudo systemctl restart lumen-catalogue"],
	m6_cgroups: ["set-property écrit un drop-in et l'applique à chaud.", "systemd-cgtop ; sudo systemctl set-property lumen-indexeur CPUQuota=50% MemoryMax=2G ; systemctl show -p CPUQuotaPerSecUSec,MemoryMax lumen-indexeur"],
	m6_strace: ["Le registre a déménagé dans le Cœur : la base est locale (127.0.0.1:5432).", "ps -o pid,stat,wchan,cmd -C lumen-messager ; sudo strace -p $(pidof lumen-messager) ; getent hosts registre-ancien ; sudo sed -i 's/^base = registre-ancien:5432/base = 127.0.0.1:5432/' /etc/lumen/messager.conf ; sudo systemctl restart lumen-messager"],
	m6_tmux: ["tmux garde la session ouverte sur la machine, même quand tu t'en vas.", "tmux new -s copie ; /usr/local/bin/recopier-archives ; tmux detach ; exit ; ssh lumen ; tmux attach -t copie ; tmux detach"],
	m6_nuit: ["lanterne liste les avaries de la Nuit, quartier par quartier ; le journal de connexions qui explose se fait tourner comme les autres.", "uptime ; free -h ; top -b -n 1 | head ; sudo journalctl -u lumen-web -n 5 ; puis répare chaque avarie, et sudo logrotate -f /etc/logrotate.d/lumen"],
	m6_lanterne_finale: ["lanterne, sur la place ou n'importe où, dit ce qui manque encore.", "lanterne"],
	m6_rapport: ["Un here-document écrit le rapport d'un coup ; cp le dépose.", "mkdir -p ~/lumen ; cat > ~/lumen/rapport.txt <<'FIN' ... FIN ; cp ~/lumen/rapport.txt CHEMIN_DE_LA_PLACE/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH6 = {
	m6_lanterne: "Ici la WarRoom. Le Cœur de Lumen s'épuise : il reste huit heures avant la Longue Nuit. Écoute Laurent, lis l'ordre de mission, puis regarde le Phare (lanterne) : c'est ta lumière de départ.",
	m6_disque: "Les Docks d'abord : plus rien n'entre sur /var, et tout le reste en dépend. Seymour t'attend.",
	m6_fantome: "df dit toujours plein ? Un fichier effacé peut rester ouvert. Le disque ne le rend qu'à la fermeture.",
	m6_inodes: "Les Archives, chez Kathleen : il reste de la place, mais plus une fiche. Compte les fichiers, pas les octets.",
	m6_tmpfiles: "Et que les vieilles fiches partent seules, désormais.",
	m6_logrotate: "La Gazette, chez Ida : un journal de plusieurs gigaoctets jamais tourné.",
	m6_journal: "Et le journal de systemd, qui grossit sans borne.",
	m6_memoire: "Les Forges, chez Gordon : l'OOM killer a tué la base cette nuit. Trouve qui mange la mémoire.",
	m6_swap: "Un peu d'échange de secours, et une machine qui ne s'en sert qu'en dernier recours.",
	m6_cpu: "La Tour de l'Horloge, chez Niklaus : un engrenage tourne fou depuis hier soir. Doucement d'abord, renice, puis kill.",
	m6_zombie: "Des spectres hantent la table des processus. On ne tue pas un spectre.",
	m6_lvm: "Les Citernes, chez Sophie : la base déborde, et il reste de la place dans la réserve commune.",
	m6_snapshot: "Avant une opération risquée, une photo du volume. Et on la retire après.",
	m6_fstab: "La Porte du Matin, chez Lynn : au prochain réveil, la cité resterait en mode secours. Ça ne doit pas arriver.",
	m6_montage: "Vérifie que tout se monte, maintenant, sans attendre le prochain réveil.",
	m6_unite: "Les Ateliers, chez Mary : l'allumeur tourne à la main dans un terminal oublié. Fais-en un vrai service.",
	m6_redemarrage: "Éprouve-le : tue-le, il doit revenir seul.",
	m6_timer: "La Crypte des mémoires, chez Betty : une sauvegarde chaque nuit, programmée.",
	m6_restauration: "Une sauvegarde qu'on n'a jamais restaurée n'existe pas. Restaure, compare.",
	m6_mesures: "L'Observatoire, chez Donald : on mesure, avant de croire.",
	m6_latence: "Le temps de réponse de la cité : mesure-le, et note-le.",
	m6_raid: "Le Puits aux deux sources, chez Dorothy : une source s'est tarie. Le miroir tient sur une seule jambe.",
	m6_smart: "Et l'autre source fatigue. Regarde sa santé.",
	m6_fsck: "Les Thermes, chez Ruth : les archives sont en lecture seule depuis une erreur cette nuit.",
	m6_tune2fs: "Puis règle les vérifications et la réserve du système de fichiers.",
	m6_dpkg: "Le Grand Marché, chez Charles : une mise à jour coupée au milieu, apt est bloqué.",
	m6_hold: "Épingle la version de la base, et relance ce qui tourne encore avec l'ancienne bibliothèque.",
	m6_failed: "Le Labyrinthe, chez John : un service a échoué au démarrage. Lis le journal avant de toucher.",
	m6_demarrage: "Et quelqu'un fait attendre toute la cité au réveil : quatre-vingt-dix secondes.",
	m6_ulimit: "La Bibliothèque des limites, chez Kay : « Too many open files ».",
	m6_cgroups: "L'indexeur prend toute la lumière. Donne-lui une part, pas tout.",
	m6_strace: "Le Guetteur, chez Klara : le messager ne répond plus. Écoute ce qu'il fait, appel par appel.",
	m6_tmux: "Une recopie d'une heure : elle doit survivre si ta connexion tombe.",
	m6_nuit: "La Longue Nuit est tombée. Surveille en direct, et répare ce qu'elle a abîmé.",
	m6_lanterne_finale: "Le Phare doit dépasser 90.",
	m6_rapport: "Dernière chose : le rapport de remise en service pour Laurent. Avaries, causes, réparations, mesures, ce qui reste."
};
var METIER_CH6 = {
	m6_lanterne: "En exploitation, on mesure l'état avant d'agir : sans point de départ, on ne prouve rien.",
	m6_disque: "Un disque plein ne s'annonce pas : on le surveille avant (df), on cherche ensuite (du, ncdu, find).",
	m6_fantome: "Un fichier effacé n'est vraiment libéré qu'à sa fermeture : sur un serveur, on vide un journal (> fichier) plutôt que de l'effacer.",
	m6_inodes: "Un inode par fichier : des millions de petits fichiers remplissent un disque sans le remplir.",
	m6_logrotate: "Un journal qu'on ne fait pas tourner finit toujours par remplir le disque. Toujours.",
	m6_memoire: "available, pas free : Linux se sert de la mémoire libre comme cache, et la rend dès qu'on la demande.",
	m6_cpu: "On commence par le geste le plus doux : renice avant kill, SIGTERM avant SIGKILL.",
	m6_lvm: "Un volume logique s'agrandit à chaud. Le réduire, c'est une autre histoire : on mesure avant.",
	m6_fstab: "Une faute dans fstab se paie au redémarrage suivant, souvent des semaines plus tard, quand plus personne ne s'en souvient.",
	m6_unite: "Un programme lancé à la main dans un terminal n'est pas un service : il ne redémarre pas, il ne se journalise pas, il meurt avec la session.",
	m6_restauration: "Une sauvegarde se juge à la restauration, pas à la copie.",
	m6_mesures: "La charge se lit face au nombre de cœurs : 8 sur 4 cœurs, c'est deux fois trop.",
	m6_raid: "Un RAID n'est pas une sauvegarde : il protège d'une panne de disque, pas d'un rm de trop.",
	m6_fsck: "On ne répare jamais un système de fichiers monté.",
	m6_dpkg: "Une mise à jour interrompue se reprend là où elle s'est arrêtée : dpkg --configure -a, avant tout le reste.",
	m6_failed: "Un service en échec se comprend dans son journal, pas en le relançant dix fois.",
	m6_ulimit: "Les limites d'un service vivent dans son unité ; ulimit dans ton shell ne change rien à un service.",
	m6_strace: "strace montre ce qu'un programme demande au noyau : quand il ne dit rien, c'est souvent qu'il attend.",
	m6_tmux: "Une opération longue sur un serveur distant se lance toujours dans tmux (ou screen) : les connexions tombent.",
	m6_nuit: "Pendant un incident, on surveille en direct avant de réparer, et on note l'heure de chaque geste.",
	m6_rapport: "Un rapport de remise en service dit ce qui a cassé, pourquoi, ce qui a été fait, ce qui a été mesuré, et ce qui reste à faire."
};

/* ------------------------------------------------------------------ */
/* L'état réel de la machine, quartier par quartier                    */
/* ------------------------------------------------------------------ */

function fsCh6(cible){ return fsParCible(H6, cible); }
function pourcentCh6(cible){ var f = fsCh6(cible); if (!f) return 100; var l = libreFs(H6, f); return l.utilise + l.dispo > 0 ? Math.ceil(l.utilise * 100 / (l.utilise + l.dispo)) : 100; }
function varPleinCh6(){ var f = fsCh6("/var"); return !f || libreFs(H6, f).dispo < 64 * MIO6; }
function fantomesCh6(){
	var f = fsCh6("/var"), src = f ? f.source : null, l = [];
	procsMachine(H6).forEach(function(p){ (p.fichiers || []).forEach(function(x){ if (x.supprime && (!x.fs || x.fs === src)) l.push({ p: p, f: x }); }); });
	return l;
}
function sessionsCh6(){ return compteVirtuels(H6, "/var/lib/lumen/sessions").nombre; }
function sessionsRecentesCh6(){
	var gs = groupesVirtuels(H6, "/var/lib/lumen/sessions") || [];
	return gs.filter(function(g){ return g.ageMin < 60; }).reduce(function(s, g){ return s + g.nombre; }, 0);
}
/* Les lignes de /etc/tmpfiles.d qui couvrent les sessions avec un âge d'au plus un jour. */
function tmpfilesSessionsCh6(){
	var ok = false;
	fichiersDuDossier(H6, "/etc/tmpfiles.d").forEach(function(f){
		if (!/\.conf$/.test(f.nom)) return;
		String(f.item.getText()).split("\n").forEach(function(l){
			var c = l.trim().split(/\s+/);
			if (c.length < 7 && c.length >= 6 && /^[dDexq]!?$/.test(c[0]) && cheminNormal(c[1]) === "/var/lib/lumen/sessions"){
				var a = ageTmpfilesEnMinutes(c[5]);
				if (a !== null && a > 0 && a <= 1440) ok = true;
			}
		});
	});
	return ok;
}
function blocLogrotateCh6(){
	var trouve = null;
	fichiersDuDossier(H6, "/etc/logrotate.d").forEach(function(f){
		var t = String(f.item.getText()), re = /([^{}]+)\{([^}]*)\}/g, m;
		while ((m = re.exec(t))){
			var motifs = m[1].trim().split(/\s+/);
			if (!motifs.some(function(x){ return x === "/var/log/lumen/*.log" || x === "/var/log/lumen/lumen.log" || x === "/var/log/lumen/*"; })) continue;
			var d = m[2].split("\n").map(function(x){ return x.trim(); }).filter(function(x){ return x && x.charAt(0) !== "#"; });
			trouve = { fichier: f.chemin, directives: d, couvreTout: motifs.some(function(x){ return x !== "/var/log/lumen/lumen.log"; }) };
		}
	});
	return trouve;
}
function logrotateConfOkCh6(){
	var b = blocLogrotateCh6();
	if (!b) return false;
	var a = function(re){ return b.directives.some(function(x){ return re.test(x); }); };
	var rot = b.directives.map(function(x){ return /^rotate\s+(\d+)$/.exec(x); }).filter(Boolean)[0];
	return a(/^compress$/) && a(/^(daily|weekly|hourly)$|^(maxsize|size)\s+\d+[kMG]?$/) && a(/^missingok$/) && !!rot && +rot[1] >= 1 && +rot[1] <= 14;
}
function tailleCh6(chemin){ var f = F6(chemin); return f ? tailleObjetMachine(f) : -1; }
function systemMaxUseCh6(){
	var m = /^\s*SystemMaxUse\s*=\s*(\d+)([KMG]?)\s*$/m.exec(T6("/etc/systemd/journald.conf") || "");
	if (!m) return null;
	return +m[1] * ({ "": 1, K: 1024, M: MIO6, G: GIO6 }[m[2]]);
}
function swapActifCh6(){
	var M = etatMachine(H6);
	return (M.swaps || []).some(function(s){ return s.chemin === "/swapfile" && s.taille >= 1000000; });
}
function fstabSwapCh6(){ return lireFstabMachine(H6).some(function(l){ return l.source === "/swapfile" && l.type === "swap"; }); }
function swappinessCh6(){
	var e = etatHote(H6), d = sysctlDemarrage(H6);
	return String(e.sysctl["vm.swappiness"]) === "10" && String(d["vm.swappiness"]) === "10";
}
function erreursFstabCh6(){
	var n = 0;
	lireFstabMachine(H6).forEach(function(l){
		if (l.champs < 4) { n++; return; }
		if (l.type === "swap" && l.source === "/swapfile") return;
		if (!resoudreSource(H6, l.source) && l.options.indexOf("nofail") === -1) n++;
	});
	return n;
}
function nofailSauvegardeCh6(){ return lireFstabMachine(H6).some(function(l){ return l.cible === "/mnt/sauvegarde" && l.options.indexOf("nofail") > -1; }); }
function fstabRechargeCh6(){ return (etatMachine(H6).fstabCharge || null) === (T6("/etc/fstab") || ""); }
function directivesFichierCh6(chemin){
	var d = {}, section = null;
	String(T6(chemin) || "").split("\n").forEach(function(l){
		var t = l.trim(), s = /^\[([^\]]+)\]$/.exec(t), kv = /^([A-Za-z]+)\s*=\s*(.*)$/.exec(t);
		if (s){ section = s[1]; d[section] = d[section] || {}; return; }
		if (kv && section) d[section][kv[1]] = kv[2].trim();
	});
	return d;
}
function allumeurUniteOkCh6(){
	var d = directivesFichierCh6("/etc/systemd/system/allumeur.service"), s = d.Service || {}, inst = d.Install || {};
	return /^\/opt\/lumen\/allumeur(\s|$)/.test(s.ExecStart || "") && s.User === "allumeur" && /^(on-failure|always|on-abnormal)$/.test(s.Restart || "") && /multi-user\.target/.test(inst.WantedBy || "");
}
function sauvegardeUnitesOkCh6(){
	var s = directivesFichierCh6("/etc/systemd/system/sauvegarde.service").Service || {}, t = directivesFichierCh6("/etc/systemd/system/sauvegarde.timer").Timer || {};
	return s.Type === "oneshot" && /^\/usr\/local\/bin\/sauvegarde\.sh(\s|$)/.test(s.ExecStart || "") && !!t.OnCalendar && !!lireCalendrier(t.OnCalendar) && /^(true|yes|1|on)$/i.test(t.Persistent || "");
}
function archivesSauvegardeCh6(){ return fichiersDuDossier(H6, "/srv/sauvegardes").filter(function(f){ return /^lumen-.*\.tar\.gz$/.test(f.nom) && tailleObjetMachine(f.item) > 0; }); }
function restaurationPresenteCh6(){
	var a = F6("/srv/archives/registres/registre-1880.txt"), b = F6("/tmp/restauration/srv/archives/registres/registre-1880.txt");
	return !!a && !!b && a.getText() === b.getText();
}
function raidSainCh6(){
	var r = (etatMachine(H6).raid || [])[0];
	if (!r || r.reconstruction) return false;
	var actifs = r.membres.filter(function(m){ return m.etat === "active"; }).map(function(m){ return m.dev; });
	return actifs.length === 2 && actifs.indexOf("sdd1") > -1 && actifs.indexOf("sdc1") > -1 && !r.membres.some(function(m){ return m.dev === "sdb1" && m.etat !== "removed"; });
}
function archivesSainesCh6(){ var f = fsCh6("/srv/archives"); return !!f && !f.ro && !f.erreurs; }
function tune2fsOkCh6(){ var f = systemesMachine(H6).filter(function(x){ return x.source === "/dev/md0"; })[0]; return !!f && f.maxMontages >= 1 && f.maxMontages <= 60 && f.reserve <= 0.01 + 1e-9; }
function apt0kCh6(){ var d = paquetsMachine(H6); return !d.interrompu && !(d.aConfigurer || []).length && !(d.casses || []).length; }
function aRedemarrerCh6(){
	var M = etatMachine(H6), l = [];
	if (!M.majBibliotheque) return l;
	Object.keys((defMachine(H6) || {}).bibliotheques || {}).forEach(function(u){
		var p = principalCh6(u), s = (M.services || {})[u];
		if (p && s && (s.depuis || 0) < M.majBibliotheque) l.push(u);
	});
	return l;
}
function echecsCh6(){ return unitesHote(H6).filter(function(u){ return uniteInfo(H6, u).echec; }); }
function attenteReseauOkCh6(){
	var e = etatUnite(H6, "lumen-attente-reseau.service");
	if (!e.enabled || e.masque) return true;
	var lim = limitesDepuisDirectives(directivesMachine(H6, "lumen-attente-reseau.service"));
	return lim.timeoutStart <= 30 && !changeSurDisque(H6, "lumen-attente-reseau.service");
}
function catalogueOkCh6(){ var p = principalCh6("lumen-catalogue.service"); return !!p && (p.limiteNofile || 0) >= 4096 && etatUnite(H6, "lumen-catalogue.service").actif; }
function indexeurOkCh6(){ var l = limitesUnite(H6, "lumen-indexeur.service"); return !!l.cpuQuota && l.cpuQuota <= 50 && !!l.memMax && etatUnite(H6, "lumen-indexeur.service").actif; }
function messagerOkCh6(){ var p = principalCh6("lumen-messager.service"); return !!p && !p.strace && messagerJoignableCh6() && etatUnite(H6, "lumen-messager.service").actif; }
function copieFinieCh6(){ var t = (etatMachine(H6).tachesFinies || {})["recopier-archives"]; return !!t && (!!t.tmux || !!t.nohup || !!t.disown); }
function exportArreteCh6(){ return !procCh6("export-registre") && !procsMachine(H6).some(function(p){ return p.boucle && p.boucle.comm === "export-registre"; }); }
function spectresCh6(){ return procsMachine(H6).filter(function(p){ return p.etat === "Z"; }); }
function vu(cle){ return !!(sCh6().vus || {})[cle]; }
function noterVu(cle){ var c = sCh6(); c.vus = c.vus || {}; if (!c.vus[cle]) c.vus[cle] = c.horloge + 1; }

/* Chaque étape : l'état réel de la machine (etat, qui allume la lanterne) et ce que le joueur a constaté (vus). */
var ETATS_CH6 = {
	m6_disque: function(){ return !F6("/var/backups/lumen-2024.tar.gz"); },
	m6_fantome: function(){ return fantomesCh6().length === 0 && !varPleinCh6(); },
	m6_inodes: function(){ return sessionsCh6() < 1000 && sessionsRecentesCh6() >= 20; },
	m6_tmpfiles: function(){ return tmpfilesSessionsCh6(); },
	m6_logrotate: function(){ return logrotateConfOkCh6() && tailleCh6("/var/log/lumen/lumen.log") < 100 * MIO6 && !!F6("/var/log/lumen/lumen.log.1.gz"); },
	m6_journal: function(){ var m = systemMaxUseCh6(); return tailleJournal(H6) <= 500 * MIO6 && m !== null && m <= GIO6 && etatMachine(H6).journaldMax === m; },
	m6_memoire: function(){ var l = limitesUnite(H6, "cache-rapports.service"); return !!l.memMax && l.memMax <= 2 * GIO6 && etatUnite(H6, "cache-rapports.service").actif; },
	m6_swap: function(){ var f = F6("/swapfile"); return swapActifCh6() && !!f && f.mode === "rw-------" && fstabSwapCh6() && swappinessCh6(); },
	m6_cpu: function(){ return exportArreteCh6(); },
	m6_zombie: function(){ return spectresCh6().length === 0 && etatUnite(H6, "lumen-veilleur.service").actif; },
	m6_lvm: function(){ var f = fsCh6("/srv/donnees"); return !!f && f.taille >= 45 * GIO6 && pourcentCh6("/srv/donnees") < 80; },
	m6_snapshot: function(){ return vu("snapshotCree") && vu("snapshotRetire") && !(lvsMachine(H6) || []).some(function(l){ return l.origine || l.snapshot; }); },
	m6_fstab: function(){ return erreursFstabCh6() === 0 && nofailSauvegardeCh6() && fstabRechargeCh6(); },
	m6_montage: function(){ return !!fsCh6("/boot"); },
	m6_unite: function(){ var e = etatUnite(H6, "allumeur.service"); return allumeurUniteOkCh6() && e.enabled && e.actif && !!principalCh6("allumeur.service") && !procsMachine(H6).some(function(p){ return p.comm === "allumeur" && !p.unite; }); },
	m6_redemarrage: function(){ return allumeurRevenuCh6() && etatUnite(H6, "allumeur.service").actif; },
	m6_timer: function(){ var e = etatUnite(H6, "sauvegarde.timer"); return sauvegardeUnitesOkCh6() && e.enabled && e.actif; },
	m6_restauration: function(){ return archivesSauvegardeCh6().length > 0 && restaurationPresenteCh6(); },
	m6_mesures: function(){ return vu("uptime") && vu("nproc") && vu("iostat") && vu("sar") && vu("ssS"); },
	m6_latence: function(){ return (etatMachine(H6).mesuresCurl || []).some(function(m){ return m.temps < 0.5 && m.code === 200; }); },
	m6_raid: function(){ return raidSainCh6(); },
	m6_smart: function(){ return vu("smartSdb") && vu("smartSdc"); },
	m6_fsck: function(){ return archivesSainesCh6(); },
	m6_tune2fs: function(){ return tune2fsOkCh6(); },
	m6_dpkg: function(){ return apt0kCh6(); },
	m6_hold: function(){ return paquetsMachine(H6).retenus.indexOf("lumen-base") > -1 && aRedemarrerCh6().length === 0; },
	m6_failed: function(){ return etatUnite(H6, "lumen-gazette.service").actif && echecsCh6().length === 0; },
	m6_demarrage: function(){ return attenteReseauOkCh6(); },
	m6_ulimit: function(){ return catalogueOkCh6(); },
	m6_cgroups: function(){ return indexeurOkCh6(); },
	m6_strace: function(){ return messagerOkCh6(); },
	m6_tmux: function(){ return copieFinieCh6(); }
};
var VALIDATIONS_CH6 = {
	m6_disque: function(){ return ETATS_CH6.m6_disque() && vu("dfVarPlein") && vu("coupable"); },
	m6_fantome: function(){ return ETATS_CH6.m6_fantome() && vu("lsofL1"); },
	m6_inodes: function(){ return ETATS_CH6.m6_inodes() && vu("dfi"); },
	m6_tmpfiles: function(){ return ETATS_CH6.m6_tmpfiles() && vu("tmpfilesClean"); },
	m6_logrotate: function(){ return ETATS_CH6.m6_logrotate() && vu("logrotateDebug"); },
	m6_journal: function(){ return ETATS_CH6.m6_journal() && vu("diskUsage"); },
	m6_memoire: function(){ return ETATS_CH6.m6_memoire() && vu("free") && vu("oom"); },
	m6_swap: function(){ return ETATS_CH6.m6_swap(); },
	m6_cpu: function(){ return ETATS_CH6.m6_cpu() && (vu("renice") || vu("reniceTout")); },
	m6_zombie: function(){ return ETATS_CH6.m6_zombie() && vu("ppid") && vu("veilleurRelance"); },
	m6_lvm: function(){ return ETATS_CH6.m6_lvm(); },
	m6_snapshot: function(){ return ETATS_CH6.m6_snapshot() && vu("lvsSnapshot"); },
	m6_fstab: function(){ return ETATS_CH6.m6_fstab() && vu("verify"); },
	m6_montage: function(){ return ETATS_CH6.m6_montage() && vu("mountA"); },
	m6_unite: function(){ return ETATS_CH6.m6_unite(); },
	m6_redemarrage: function(){ return ETATS_CH6.m6_redemarrage() && vu("journalAllumeur"); },
	m6_timer: function(){ return ETATS_CH6.m6_timer() && vu("listTimers"); },
	m6_restauration: function(){ return ETATS_CH6.m6_restauration() && vu("compare"); },
	m6_mesures: function(){ return ETATS_CH6.m6_mesures(); },
	m6_latence: function(){ return ETATS_CH6.m6_latence() && carnetOkCh6(); },
	m6_raid: function(){ return ETATS_CH6.m6_raid() && vu("mdstat"); },
	m6_smart: function(){ return ETATS_CH6.m6_smart(); },
	m6_fsck: function(){ return ETATS_CH6.m6_fsck() && vu("ro") && vu("e2fsck"); },
	m6_tune2fs: function(){ return ETATS_CH6.m6_tune2fs() && vu("tune2fsL"); },
	m6_dpkg: function(){ return ETATS_CH6.m6_dpkg() && vu("aptUpdate") && vu("upgradable"); },
	m6_hold: function(){ return ETATS_CH6.m6_hold() && vu("showhold") && vu("needrestart") && vu("rebootRequired"); },
	m6_failed: function(){ return ETATS_CH6.m6_failed() && vu("failed") && vu("journalErr"); },
	m6_demarrage: function(){ return ETATS_CH6.m6_demarrage() && vu("blame") && vu("criticalChain"); },
	m6_ulimit: function(){ return ETATS_CH6.m6_ulimit() && vu("limits") && vu("fd"); },
	m6_cgroups: function(){ return ETATS_CH6.m6_cgroups() && vu("cgtop") && vu("showCg"); },
	m6_strace: function(){ return ETATS_CH6.m6_strace() && vu("strace"); },
	m6_tmux: function(){ return ETATS_CH6.m6_tmux() && vu("deconnexionCopie"); }
};
function carnetOkCh6(){
	var t = T6("/home/" + JOUEUR + "/carnet.txt") || "";
	return (etatMachine(H6).mesuresCurl || []).some(function(m){ return m.temps < 0.5 && m.code === 200 && t.indexOf(m.temps.toFixed(6)) > -1; });
}
function quartierAllumeCh6(cle){ var q = quartierCh6(cle); return !!q && q.etapes.every(function(id){ return !!state.quests[id]; }); }
function quartiersAllumesCh6(){ return QUARTIERS_CH6.filter(function(q){ return quartierAllumeCh6(q.cle); }); }

/* ------------------------------------------------------------------ */
/* Ce que le joueur constate : les sorts lancés sur lumen et leur sortie */
/* ------------------------------------------------------------------ */

function optionsCh6(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function noterCh6(nom, args, sortie, io){
	var o = optionsCh6(args), c = sCh6();
	// Les constats ne dépendent pas de l'ordre : qui répare d'abord et regarde ensuite n'est pas bloqué.
	if (nom === "df" && /\/var$/m.test(sortie)) noterVu("dfVarPlein");
	if (nom === "df" && o.indexOf("i") > -1 && /sessions/.test(sortie)) noterVu("dfi");
	if ((nom === "du" || nom === "ncdu") && args.some(function(a){ return /^\/var(\/|\*|$)/.test(a); }) && /backups/.test(sortie)) noterVu("coupable");
	if (nom === "find" && args.some(function(a){ return /^\/var/.test(a); }) && /lumen-2024\.tar\.gz/.test(sortie)) noterVu("coupable");
	if (nom === "lsof" && args.indexOf("+L1") > -1) noterVu("lsofL1");
	if (nom === "systemd-tmpfiles" && args.indexOf("--clean") > -1 && io.sudo && !io.code && tmpfilesSessionsCh6()) noterVu("tmpfilesClean");
	if (nom === "logrotate" && (o.indexOf("d") > -1 || args.indexOf("--debug") > -1) && /lumen/.test(sortie)) noterVu("logrotateDebug");
	if (nom === "journalctl" && args.indexOf("--disk-usage") > -1) noterVu("diskUsage");
	if (nom === "free") noterVu("free");
	if ((nom === "dmesg" || nom === "journalctl" || nom === "grep") && /Out of memory|oom-killer|oom_reaper|Memory cgroup out of memory/.test(sortie)) noterVu("oom");
	if (nom === "renice" && /new priority (1\d)/.test(sortie) && /export|1991/.test(args.join(" ") + sortie)) noterVu("renice");
	if (nom === "renice" && /new priority/.test(sortie)) noterVu("reniceTout");
	if (nom === "ps" && args.some(function(a){ return /ppid/.test(a); })) noterVu("ppid");
	if ((nom === "pstree") && /lumen-veilleur|ronde/.test(sortie)) noterVu("ppid");
	if (nom === "lvs" && /avant_maj/.test(sortie)) noterVu("lvsSnapshot");
	if (nom === "findmnt" && args.indexOf("--verify") > -1) noterVu("verify");
	if (nom === "mount" && args.indexOf("-a") > -1 && !io.code && io.sudo) noterVu("mountA");
	if (nom === "journalctl" && args.some(function(a){ return /allumeur/.test(a); }) && /Scheduled restart job/.test(sortie)) noterVu("journalAllumeur");
	if (nom === "systemctl" && args.indexOf("list-timers") > -1 && /sauvegarde\.timer/.test(sortie)) noterVu("listTimers");
	if (nom === "diff" && args.some(function(a){ return /restauration/.test(a); }) && sortie === "" && !io.code && restaurationPresenteCh6()) noterVu("compare");
	if ((nom === "sha256sum" || nom === "md5sum") && /restauration/.test(args.join(" "))) noterVu("empreinteRestauration");
	if (nom === "uptime") noterVu("uptime");
	if (nom === "nproc") noterVu("nproc");
	if (nom === "iostat" && o.indexOf("x") > -1) noterVu("iostat");
	if (nom === "sar") noterVu("sar");
	if (nom === "ss" && o.indexOf("s") > -1 && /estab/.test(sortie)) noterVu("ssS");
	if (nom === "cat" && args.indexOf("/proc/mdstat") > -1) noterVu("mdstat");
	if (nom === "smartctl" && args.indexOf("/dev/sdb") > -1 && /FAILED/.test(sortie)) noterVu("smartSdb");
	if (nom === "smartctl" && args.indexOf("/dev/sdc") > -1 && /Reallocated_Sector_Ct/.test(sortie)) noterVu("smartSdc");
	if (nom === "grep" && /Reallocated_Sector_Ct/.test(sortie) && /sdc/.test(c.dernierSmart || "")) noterVu("smartSdc");
	if (nom === "smartctl") c.dernierSmart = args.join(" ");
	if (nom === "mount" && /\/srv\/archives.*\(ro,/.test(sortie)) noterVu("ro");
	if (nom === "grep" && /\/srv\/archives.*\(ro/.test(sortie)) noterVu("ro");
	if (nom === "findmnt" && /\/srv\/archives.*\bro,/.test(sortie)) noterVu("ro");
	if ((nom === "dmesg" || nom === "journalctl") && /Remounting filesystem read-only/.test(sortie)) noterVu("ro");
	if (nom === "touch" && /Read-only file system/.test(sortie)) noterVu("ro");
	if ((nom === "e2fsck" || nom === "fsck" || nom === "fsck.ext4") && args.indexOf("/dev/md0") > -1 && /FILE SYSTEM WAS MODIFIED|clean/.test(sortie)) noterVu("e2fsck");
	if (nom === "tune2fs" && o.indexOf("l") > -1 && /Mount count/.test(sortie)) noterVu("tune2fsL");
	if ((nom === "apt" || nom === "apt-get") && args[0] === "update" && io.sudo && !io.code) noterVu("aptUpdate");
	if (nom === "apt" && args[0] === "list" && args.indexOf("--upgradable") > -1) noterVu("upgradable");
	if (nom === "apt-mark" && args[0] === "showhold" && /lumen-base/.test(sortie)) noterVu("showhold");
	if (nom === "needrestart") noterVu("needrestart");
	if ((nom === "cat" || nom === "less" || nom === "more") && args.some(function(a){ return /reboot-required/.test(a); })) noterVu("rebootRequired");
	if (nom === "systemctl" && (args.indexOf("--failed") > -1 || args.some(function(a){ return /--state=failed/.test(a); }))) noterVu("failed");
	if (nom === "journalctl" && (args.indexOf("-p") > -1 || args.some(function(a){ return /^--priority=|^-p\d/.test(a); })) && /Dependency failed|failed/.test(sortie)) noterVu("journalErr");
	if (nom === "systemd-analyze" && args.indexOf("blame") > -1) noterVu("blame");
	if (nom === "systemd-analyze" && args.indexOf("critical-chain") > -1) noterVu("criticalChain");
	var pc = principalCh6("lumen-catalogue.service");
	if (nom === "cat" && pc && args.some(function(a){ return a === "/proc/" + pc.pid + "/limits"; }) && /Max open files/.test(sortie)) noterVu("limits");
	if (nom === "ls" && pc && args.some(function(a){ return a === "/proc/" + pc.pid + "/fd" || a === "/proc/" + pc.pid + "/fd/"; })) noterVu("fd");
	if (nom === "wc" && pc && /^\s*1\d{3}\s*$/.test(sortie)) noterVu("fd");
	if (nom === "lsof" && pc && args.indexOf("-p") > -1 && args.indexOf(String(pc.pid)) > -1) noterVu("fd");
	if (nom === "systemd-cgtop") noterVu("cgtop");
	if (nom === "ulimit" && args.some(function(a){ return /^\d+$/.test(a); })) noterVu("ulimitShell");
	if (nom === "systemctl" && args[0] === "show" && /CPUQuota|MemoryMax/.test(args.join(" ")) && /lumen-indexeur/.test(args.join(" "))) noterVu("showCg");
	if (nom === "strace" && (/connect\(/.test(sortie) || messagerOkCh6())) noterVu("strace");
	if (nom === "watch") noterVu("watch");
	// La Longue Nuit : on surveille en direct.
	if (c.nuit){
		if (nom === "uptime") noterVu("nuitUptime");
		if (nom === "free") noterVu("nuitFree");
		if (nom === "top" && o.indexOf("b") > -1) noterVu("nuitTop");
		if (nom === "journalctl" && (o.indexOf("f") > -1 || args.indexOf("-u") > -1 || args.some(function(a){ return /^--unit/.test(a); }))) noterVu("nuitJournal");
	}
}
var APPELER_AVANT_CH6 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_CH6.apply(this, arguments);
	try {
		if (lumenOuvert() && surLumen()) noterCh6(nom, args || [], typeof sortie === "string" ? sansAnsi(sortie) : "", io || {});
	} catch (e){ /* une lecture ne doit jamais casser un sort */ }
	return sortie;
};
/* Les événements du moteur : ce que la sortie seule ne dit pas. */
GameEvents.addListener("machine", function(e){
	if (!lumenOuvert() || e.hote !== H6) return;
	if (e.cmd === "lvcreate" && e.snapshot) noterVu("snapshotCree");
	if (e.cmd === "lvremove" && sCh6().vus && sCh6().vus.snapshotCree) noterVu("snapshotRetire");
	if (e.cmd === "systemctl" && e.action === "restart" && e.unite === "lumen-veilleur.service") noterVu("veilleurRelance");
});
/* La relance automatique de l'allumeur, lue dans le journal de la machine. */
function allumeurRevenuCh6(){
	return (etatMachine(H6).journal || []).some(function(x){ return x.unit === "allumeur.service" && /Scheduled restart job/.test(x.m); });
}
/* Une connexion fermée pendant la recopie : elle a survécu (tmux, nohup) ou non. */
var EXIT_AVANT_CH6 = Shell.sorts.exit;
Shell.sorts.exit = function(args, io){
	try {
		if (lumenOuvert() && surLumen() && procsMachine(H6).some(function(p){ return p.comm === "recopier-archives" && (p.tmux || p.nohup || p.disown); })) noterVu("deconnexionCopie");
	} catch (e){}
	return EXIT_AVANT_CH6.apply(this, arguments);
};

/* ------------------------------------------------------------------ */
/* La Longue Nuit : à 14 h (ou plus tôt), elle tombe sur les quartiers encore éteints */
/* ------------------------------------------------------------------ */

var AVARIES_CH6 = {
	docks: { phrase: "un vidage mémoire de 3 Go est tombé dans /var/tmp", poser: function(){ moteurSeul(function(){ P6("/var/tmp/core.lumen-web.3141", "", { taille: 3 * GIO6, ageMin: 0 }); }); },
		reparee: function(){ return !F6("/var/tmp/core.lumen-web.3141"); } },
	archives: { phrase: "douze mille sessions de plus sont tombées dans les Archives", poser: function(){ (etatMachine(H6).virtuels["/var/lib/lumen/sessions"] || []).unshift({ prefixe: "sess_", nombre: 12000, ageMin: 240, taille: 210, graine: "lumen-nuit", owner: "www-data", mode: "rw-------" }); },
		reparee: function(){ return sessionsCh6() < 1000; } },
	gazette: { phrase: "le journal de la cité a repris 2 Go dans la nuit", poser: function(){ var f = F6("/var/log/lumen/lumen.log"); if (f) f.taille = tailleObjetMachine(f) + 2 * GIO6; },
		reparee: function(){ return tailleCh6("/var/log/lumen/lumen.log") < 100 * MIO6; } },
	forges: { phrase: "un rapport de nuit s'est mis à dévorer la mémoire", poser: function(){ lancerProcessusMachine(H6, { ppid: 1, user: "lumen", comm: "rapport-de-nuit", cmd: "/opt/lumen/bin/cache-rapports --nuit", cpu: 22, rss: 1200000, fuite: 60000, etat: "R" }); },
		reparee: function(){ return !procCh6("rapport-de-nuit"); } },
	horloge: { phrase: "une vieille tâche planifiée a relancé l'export", poser: function(){ lancerProcessusMachine(H6, { ppid: 1, user: "operateur", comm: "export-registre", cmd: "/usr/local/bin/export-registre --tout", cpu: 99.5, rss: 61000, etat: "R" }); },
		reparee: function(){ return !procCh6("export-registre"); } },
	citernes: { phrase: "la base a encore pris 6 Go dans la nuit", poser: function(){ var f = F6("/srv/donnees/base/lumen.db"); if (f) f.taille = tailleObjetMachine(f) + 6 * GIO6; },
		reparee: function(){ return pourcentCh6("/srv/donnees") < 85; } },
	porte: { phrase: "une ligne de plus est apparue dans fstab, vers un disque qui n'existe pas", poser: function(){ var f = F6("/etc/fstab"); if (f) f.setText(f.getText().replace(/\n?$/, "\n") + "UUID=0dead0ff-1234-4cde-8f00-badbadbad000 /srv/ancien ext4 defaults 0 2"); },
		reparee: function(){ return erreursFstabCh6() === 0; } },
	ateliers: { phrase: "l'allumeur lancé à la main s'est éteint avec la session de l'opérateur", poser: function(){ procsMachine(H6).filter(function(p){ return p.comm === "allumeur" && !p.unite; }).forEach(function(p){ retirerProcessus(H6, p); }); },
		reparee: function(){ return etatUnite(H6, "allumeur.service").actif; } },
	memoires: { phrase: "la sauvegarde de la nuit n'a rien écrit", poser: function(){},
		reparee: function(){ return archivesSauvegardeCh6().length > 0; } },
	observatoire: { phrase: "plus personne ne mesure : on ne sait pas si la cité répond", poser: function(){},
		reparee: function(){ var n = sCh6().nuitDebut || 0; return (etatMachine(H6).mesuresCurl || []).some(function(m){ return m.t >= n && m.code === 200; }); } },
	puits: { phrase: "la seconde source a encore perdu cinq cents secteurs", poser: function(){ var d = (etatMachine(H6).disques || []).filter(function(x){ return x.nom === "sdc"; })[0]; if (d && d.smart) d.smart.realloues += 500; },
		reparee: function(){ return raidSainCh6(); } },
	thermes: { phrase: "une nouvelle erreur a figé les archives", poser: function(){ var f = fsCh6("/srv/archives"); if (f){ f.erreurs = (f.erreurs || 0) + 1; f.ro = true; } },
		reparee: function(){ return archivesSainesCh6(); } },
	marche: { phrase: "une mise à jour automatique s'est coupée en plein milieu", poser: function(){ var d = paquetsMachine(H6); d.interrompu = true; },
		reparee: function(){ return !paquetsMachine(H6).interrompu; } },
	labyrinthe: { phrase: "la gazette est retombée en échec", poser: function(){ marquerEchec(H6, uniteInfo(H6, "lumen-gazette.service")); },
		reparee: function(){ return etatUnite(H6, "lumen-gazette.service").actif && !uniteInfo(H6, "lumen-gazette.service").echec; } },
	limites: { phrase: "le catalogue étouffe toujours sous ses fichiers ouverts", poser: function(){},
		reparee: function(){ return catalogueOkCh6(); } },
	guetteur: { phrase: "le messager attend toujours sa réponse", poser: function(){},
		reparee: function(){ return messagerOkCh6(); } }
};
var SURPRISE_CH6 = { phrase: "le journal des connexions de la place explose : 2,5 Go en une heure",
	poser: function(){ moteurSeul(function(){ P6("/var/log/lumen/connexions.log", "10.0.97.4 connexion\n", { taille: Math.round(2.5 * GIO6), owner: "lumen", mode: "rw-r-----", ageMin: 0 }); }); },
	reparee: function(){ return tailleCh6("/var/log/lumen/connexions.log") < 100 * MIO6; } };
function avariesRestantesCh6(){
	var c = sCh6(), l = [];
	Object.keys(c.avaries || {}).forEach(function(cle){ if (c.avaries[cle] && AVARIES_CH6[cle] && !AVARIES_CH6[cle].reparee()) l.push(cle); });
	if (c.nuit && !SURPRISE_CH6.reparee()) l.push("surprise");
	return l;
}
function tomberNuitCh6(enAvance){
	var c = sCh6();
	if (c.nuit) return;
	c.nuit = true;
	c.nuitDebut = maintenantCh6();
	c.nuitEnAvance = !!enAvance;
	c.avaries = {};
	var eteints = [];
	QUARTIERS_CH6.forEach(function(q){
		if (quartierAllumeCh6(q.cle)) return;
		eteints.push(q);
		c.avaries[q.cle] = true;
		try { AVARIES_CH6[q.cle].poser(); } catch (e){}
		journalMachine(H6, { unite: "lumen-phare", prio: 2, message: "la Longue Nuit tombe sur " + q.titre + " : " + AVARIES_CH6[q.cle].phrase });
	});
	SURPRISE_CH6.poser();
	journalMachine(H6, { unite: "lumen-phare", prio: 2, message: "la Longue Nuit : " + SURPRISE_CH6.phrase });
	if (!state.has("rejeuEnCours")){
		say(C.rouge(enAvance ? "La Longue Nuit tombe en avance." : "14 h. La Longue Nuit tombe.") + " Le Cœur cale un instant, et la cité retient son souffle. " +
			(eteints.length ? "Sur les quartiers encore éteints, la nuit fait des dégâts : " + eteints.map(function(q){ return q.titre + " (" + AVARIES_CH6[q.cle].phrase + ")"; }).join(" ; ") + "." :
				"Les seize quartiers tiennent leur lumière : la nuit glisse sur eux sans les abîmer.") +
			" Et sur la place, " + SURPRISE_CH6.phrase + ".\n" +
			C.gris("(Ce n'est pas une défaite : surveille en direct (uptime, free -h, top -b -n 1, journalctl -f), répare chaque avarie, puis regarde le Phare : lanterne.)"));
	}
}

/* ------------------------------------------------------------------ */
/* Le Phare de Lumen : la lumière de la cité, de 0 à 100                */
/* ------------------------------------------------------------------ */

function scoreLanterneCh6(){
	var ids = Object.keys(ETATS_CH6), ok = ids.filter(function(id){ try { return ETATS_CH6[id](); } catch (e){ return false; } }).length;
	var s = 25 + 75 * ok / ids.length - 3 * avariesRestantesCh6().length;
	return Math.max(0, Math.min(100, Math.round(s)));
}

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function validerCh6(){
	var c = sCh6();
	if (!state.quests["m6_lanterne"] && state.has("ch6LaurentLu") && state.has("ch6MissionLue") && c.scoreDepart !== null && c.scoreDepart !== undefined) state.complete("m6_lanterne");
	Object.keys(VALIDATIONS_CH6).forEach(function(id){
		if (state.quests[id]) return;
		var ok = false;
		try { ok = VALIDATIONS_CH6[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	// Chaque quartier rallumé : une phrase, une fois.
	QUARTIERS_CH6.forEach(function(q){
		if (!quartierAllumeCh6(q.cle) || c.allumes[q.cle] !== undefined) return;
		c.allumes[q.cle] = c.horloge;
		if (!state.has("rejeuEnCours")) say(C.jaune("✺ Quartier rallumé : " + q.titre) + C.gris(" : les fenêtres s'éclairent une à une, et " + q.gardien + " lève sa lanterne vers la place."));
	});
	if (c.tousAllumes === undefined && quartiersAllumesCh6().length === QUARTIERS_CH6.length) c.tousAllumes = c.horloge;
	// La Longue Nuit : à 14 h, ou dès que les seize quartiers sont rallumés.
	if (!c.nuit && state.quests["m6_lanterne"] && (c.horloge >= NUIT_CH6 || c.tousAllumes !== undefined)) tomberNuitCh6(c.horloge < NUIT_CH6);
	if (!state.quests["m6_nuit"] && c.nuit && avariesRestantesCh6().length === 0 && vu("nuitUptime") && vu("nuitFree") && vu("nuitTop") && vu("nuitJournal")) state.complete("m6_nuit");
	if (!state.quests["m6_lanterne_finale"] && c.nuit && avariesRestantesCh6().length === 0 && c.scoreFinalCandidat !== null && c.scoreFinalCandidat !== undefined && c.scoreFinalCandidat >= 90 && scoreLanterneCh6() >= 90){
		c.scoreFinal = c.scoreFinalCandidat;
		state.complete("m6_lanterne_finale");
	}
	// Le rapport : contresigné seulement quand la cité a passé la Nuit et que le Phare brille.
	if (!state.quests["m6_rapport"] && rapportOkCh6()){
		var reste = [];
		if (!state.quests["m6_nuit"]) reste.push(c.nuit ? "les avaries de la Longue Nuit ne sont pas toutes réparées, ou personne n'a surveillé en direct" : "la Longue Nuit n'est pas encore passée");
		if (!state.quests["m6_lanterne_finale"]) reste.push("le Phare n'a pas encore dépassé 90 après la Nuit (lanterne)");
		var manque = rapportManqueCh6();
		if (!reste.length && !manque.length) state.complete("m6_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== manque.join(",")){ c.rapportAttente = manque.join(","); say("Laurent lit ton rapport et fronce les sourcils. « Il manque " + manque.join(", et ") + ". Un rapport se vérifie : écris les vraies valeurs. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le pose sur le socle du Phare. « Bien écrit. Mais je ne contresigne pas une remise en service inachevée : " + reste.join(", et ") + ". Finis, et je signe. »");
		}
	}
	if (state.quests["m6_rapport"] && !state.has("victoireCh6")) state.applyState("victoireCh6");
}
function rapportCh6(){ var it = BoiteDeLumen.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function sansAccentCh6(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function rapportOkCh6(){
	var t = rapportCh6();
	if (t === null) return false;
	var b = sansAccentCh6(t);
	return ["avarie", "cause", "reparation", "mesure", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function rapportManqueCh6(){
	var t = rapportCh6() || "", m = etatMachine(H6).mesuresCurl || [], l = [];
	var lents = m.filter(function(x){ return x.temps >= 1; }), rapides = m.filter(function(x){ return x.temps < 0.5 && x.code === 200; });
	if (!lents.some(function(x){ return contientNombre(t, Math.round(x.temps * 100) / 100, 0.011); })) l.push("la latence d'avant (" + (lents.length ? lents[0].temps.toFixed(2).replace(".", ",") : "4,91") + " s, mesurée par Donald)");
	if (!rapides.some(function(x){ return contientNombre(t, Math.round(x.temps * 1000) / 1000, 0.0011); })) l.push("la latence d'après (ta mesure, curl -w)");
	if (!/\bsdc\b/.test(t)) l.push("le disque à remplacer bientôt (sdc)");
	return l;
}

/* Le monde réagit, à chaque tour. */
function verifierChapitre6(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch6Ouvert", !!state.quests["h_rapport"] || state.has("ch6Direct"));
	if (!state.has("ch6Ouvert")) return;
	if (!state.ch6 || typeof state.ch6 !== "object") state.ch6 = etatCh6Initial();
	var c = state.ch6;
	if (!c.base) c.base = baseJourCh6();
	relierLumen();
	declarerMondeLumen();
	seminerCh6();
	avancerHorlogeCh6();
	validerCh6();
}

function etatChapitre6(nom){
	switch (nom){
		case "ch6Ouvert":
			if (!state.ch6 || typeof state.ch6 !== "object") state.ch6 = etatCh6Initial();
			if (!state.ch6.base) state.ch6.base = baseJourCh6();
			relierLumen();
			declarerMondeLumen();
			if (!state.has("rejeuEnCours") && !state.has("ch6Direct")) say("Au fond du hall du Bastion, une grille s'ouvre sur un escalier qui s'enfonce dans la roche : Lumen (cd Lumen). " +
				C.gris("(Radio : « Grace : la recrue ? Laurent t'attend en bas. Sous l'école, une cité entière est en train de s'éteindre. »)"));
			break;
		case "victoireCh6":
			if (!state.dateVictoire7) state.dateVictoire7 = dateDuJour();
			poser(Home, CertificatLumen);
			if (!state.has("rejeuEnCours")){
				say(C.jaune("La cité se rallume.") + " D'abord la place, puis les quais des Docks, les tiroirs des Archives, les rotatives de la Gazette, les fourneaux des Forges ; " +
					"l'horloge de la Tour sonne de nouveau l'heure juste, l'eau du Puits chante dans ses deux sources, et le Phare de Lumen brûle si haut qu'on le voit depuis l'école. " +
					"Les gardiens sortent sur leurs seuils, et toute la cité lève les yeux vers toi." + (typeof texteAmiFinaleCh6 === "function" ? texteAmiFinaleCh6() : ""));
				say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Lumen brille. Pas parce que rien ne cassera plus : parce que tu sais ce qui cassera ensuite, et que c'est écrit. »");
				say(C.gris("(Ton CertificatLumen est posé dans ta Maison : cat ~/CertificatLumen. Il porte la note du chapitre 6 et son code de vérification.)"));
			}
			break;
	}
}

/* Le refus de ssh : seulement pour notre machine. */
function refusLumen(){
	if (!estMonLumen()) return null;
	if (!state.has("ch6Ouvert")) return "ssh: Could not resolve hostname lumen: Name or service not known\n" + C.gris("(Cette machine n'apparaît qu'à l'ouverture de Lumen, après le Bastion.)");
	return null;
}

/* Le joueur choisit son identifiant APRÈS la construction du monde : on remplace l'identifiant provisoire partout sur lumen. */
function renommerJoueurLumen(ancien, nouveau){
	if (!ancien || !nouveau || ancien === nouveau || typeof racineHote !== "function") return;
	var racine = racineHote(H6);
	if (!racine) return;
	var motif = new RegExp("(^|[^A-Za-z0-9_.-])" + ancien.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Za-z0-9_.-]|$)", "gm");
	var vus = [];
	(function visiter(lieu){
		if (!lieu || vus.indexOf(lieu) > -1) return;
		vus.push(lieu);
		if (lieu.room_name === ancien) lieu.room_name = nouveau;
		if (lieu.owner === ancien) lieu.owner = nouveau;
		(lieu.items || []).forEach(function(it){
			if (it.owner === ancien) it.owner = nouveau;
			var t = it.getText ? it.getText() : null;
			if (typeof t === "string" && motif.test(t)){ motif.lastIndex = 0; it.cmd_text["less"] = t.replace(motif, "$1" + nouveau); }
			motif.lastIndex = 0;
		});
		(lieu.children || []).forEach(visiter);
	})(racine);
	try { if (state && state.reseau && state.reseau.machines && state.reseau.machines[H6]) (state.reseau.machines[H6].procs || []).forEach(function(p){ if (p.user === ancien) p.user = nouveau; }); } catch (e){}
}
if (typeof adopterPrenom === "function"){
	var ADOPTER_PRENOM_AVANT_CH6 = adopterPrenom;
	adopterPrenom = function(){
		var ancien = JOUEUR;
		var r = ADOPTER_PRENOM_AVANT_CH6.apply(this, arguments);
		try { renommerJoueurLumen(ancien, JOUEUR); } catch (e){}
		return r;
	};
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (e.room === HallLumen && !state.quests["m6_entree"] && state.has("ch6Ouvert")){
		state.debutChapitre7 = state.tempsMs;
		if (state.ch6){ state.ch6.dernierNb = state.nbCommandes; if (!state.ch6.base) state.ch6.base = baseJourCh6(); }
		state.complete("m6_entree");
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch6Ouvert")) return;
	if (e.item === LaurentLumen) state.set("ch6LaurentLu");
	if (e.item === MissionLumen) state.set("ch6MissionLue");
});

/* ------------------------------------------------------------------ */
/* La place : Laurent, la mission, le Phare, la radio, l'horloge        */
/* ------------------------------------------------------------------ */

var LaurentLumen = new Item("Laurent", "", "item_mysteryman.gif").personnage();
HallLumen.addItem(LaurentLumen);
var MissionLumen = objetCh6(HallLumen, "Mission",
	"ORDRE DE MISSION · LUMEN\n\n" +
	"Sous l'école, la cité de Lumen vit d'une seule machine : le Cœur (la machine lumen). Il s'épuise : seize quartiers sont éteints.\n" +
	"À 14 h, la Longue Nuit tombera sur ceux qui le seront encore.\n\n" +
	"1. Regarder le Phare de Lumen (lanterne, une commande du jeu) : la lumière de départ.\n" +
	"2. Rallumer les seize quartiers : chaque gardien explique son avarie, à toi de la réparer sur lumen (ssh lumen).\n" +
	"3. Tenir pendant la Longue Nuit : surveiller en direct, réparer ce qu'elle abîme.\n" +
	"4. Le Phare au-dessus de 90.\n" +
	"5. Le rapport de remise en service, ~/lumen/rapport.txt (avaries, causes, réparations, mesures, ce qui reste),\n" +
	"   déposé dans la BoiteDeLaurent de la place.\n\n" +
	"Règle d'or : on mesure avant d'agir, on fait le geste le plus doux d'abord, et on note tout.",
	"item_manuscript.gif");
var PhareDeLumen = new Item("Phare", "", "item_lanterne_lumen.gif").droits("rw-r--r--", "root");
HallLumen.addItem(PhareDeLumen);
var RadioLumen = new Item("Radio", "", "item_workstation.gif");
HallLumen.addItem(RadioLumen);
var HorlogeLumen = new Item("Horloge", "", "item_sign.gif").droits("rw-r--r--", "root");
HallLumen.addItem(HorlogeLumen);
var CertificatLumen = new Item("CertificatLumen", "", "item_manuscript.gif");

function texteHorlogeCh6(){
	var c = sCh6(), l = "L'HORLOGE DE LA PLACE\n\nIl est " + heureCh6() + ".\n";
	if (c.nuit) return l + "\nLa Longue Nuit est tombée" + (c.nuitEnAvance ? " (en avance : les seize quartiers étaient rallumés)" : "") + ". Tiens bon jusqu'à ce que le Phare brille.";
	return l + "\nLa Longue Nuit (14 h) dans " + texteAvantNuit() + " : elle tombera sur chaque quartier encore éteint.\n" +
		(c.horloge < MIDI_CH6 ? "Défi d'honneur de Laurent : les seize quartiers rallumés avant midi (encore " + (MIDI_CH6 - c.horloge) + " min)." : "Midi est passé.");
}
function texteRadioCh6(){
	var q = QUETES_CH6.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : rapport contresigné, Phare au maximum. Lumen brille jusqu'à l'école. Beau travail, la recrue. »";
	var c = sCh6();
	var heure = "Il est " + heureCh6() + (c.nuit ? ", la Longue Nuit est tombée. " : ", la Longue Nuit à 14 h. ");
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH6[q.id] || "Je te suis.") + (METIER_CH6[q.id] ? " " + METIER_CH6[q.id] : "") + " »";
}
function textePhareCh6(){
	if (!state.has("ch6Ouvert")) return "Une grande lanterne de verre et de bronze, éteinte.";
	var c = sCh6();
	return "LE PHARE DE LUMEN\n\nSa flamme dit la lumière de la cité, de 0 à 100" + (c.scoreDernier !== null && c.scoreDernier !== undefined ? " : au dernier regard, " + c.scoreDernier + "." : ".") + "\n" +
		(c.scoreDepart !== null && c.scoreDepart !== undefined ? "Lumière de départ : " + c.scoreDepart + ". " : "") + "Objectif : plus de 90 après la Longue Nuit.\n\n" +
		C.gris("(Pour le regarder vraiment : lanterne, une commande du jeu. Elle mesure l'état réel du Cœur, et montre le plan des seize quartiers.)");
}
function texteLaurentCh6(){
	if (state.quests["m6_rapport"]) return "Laurent tient ton rapport, contresigné à l'encre verte.\n\n« Seize quartiers, une nuit, et pas une ligne de trop dans ton rapport. Mesurer, réparer, prévoir, documenter : c'est tout le métier de l'exploitation. " +
		"Ton CertificatLumen t'attend dans ta Maison. Et les défis des gardiens restent ouverts. »";
	return "Laurent est debout au pied du Phare, une lanterne éteinte à la main.\n\n" +
		"« Sous l'école, il y a Lumen : la cité des premiers ingénieurs. Tout y tient à une seule machine, le Cœur, la machine lumen. Depuis le départ de la Nuée, personne ne s'en occupe, " +
		"et le Cœur s'épuise : seize quartiers sont éteints. Ce ne sont pas des pannes de conte : ce sont des avaries de serveur, de vraies, celles qu'on rencontre un lundi matin.\n\n" +
		"Chaque quartier a son gardien. Chacun t'explique son avarie ; à toi de la réparer sur la machine (ssh lumen). Commence par regarder le Phare (lanterne) : c'est ta lumière de départ.\n\n" +
		"À 14 h, la Longue Nuit tombera sur ce qui sera encore éteint. Deux défis d'honneur : les seize quartiers rallumés avant midi, et finir sans acheter un seul indice. " +
		"Et une règle : on mesure avant d'agir, et on fait toujours le geste le plus doux d'abord. »";
}
texteVivant(HorlogeLumen, texteHorlogeCh6);
texteVivant(RadioLumen, texteRadioCh6);
texteVivant(PhareDeLumen, textePhareCh6);
texteVivant(LaurentLumen, texteLaurentCh6);
texteVivant(CertificatLumen, function(){ return state.has("victoireCh6") ? state.texteDuCertificat7() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat7 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre7 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH6.length;
	var secFaites = QUETES_SECONDAIRES_CH6.filter(function(q){ return this.quests[q.id]; }, this).length;
	var annexes = typeof annexesDuChapitre === "function" ? annexesDuChapitre(7) : [];
	var c = this.ch6 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DE LUMEN (EXPLOITATION LINUX)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir, en une journée, remis en service un serveur Linux\n" +
		"  à bout de souffle : disques et inodes, journaux, mémoire et\n" +
		"  échange, processus, volumes LVM, fstab, unités et timers systemd,\n" +
		"  sauvegarde restaurée, mesures, RAID et SMART, fsck, paquets,\n" +
		"  démarrage, limites et groupes de contrôle, strace et tmux ;\n" +
		"  puis tenu la Longue Nuit et rédigé le rapport, en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 6  : " + this.xpNet(7) + " XP sur " + this.xpMax7() + "\n" +
		"  NOTE                 : " + this.noteTexte(7) + "\n" +
		"  Mention              : " + this.mention(7) + "\n" +
		"  Phare de Lumen       : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " après la Nuit\n" +
		"  Sorts de l'exploitation: " + ORDRE_DES_SORTS_7.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_7.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Quêtes annexes       : " + annexes.filter(function(a){ return this.quests[a.id]; }, this).length + " sur " + annexes.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus7 ? this.nbIndices(7) + " (-" + this.malus7 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat7() + "\n" +
		"==================================";
};
GameState.prototype.codeDuCertificat7 = function(){
	var f = this.compteursFiges(7, this.xpNet(7), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre7 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(7), max: this.xpMax7(), note: this.note(7),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(7), chapitre: 7,
		date: this.dateVictoire7 || dateDuJour(), graine: PROFIL.graine
	});
};

/* Le monde est de nouveau figé : ce que le joueur crée ensuite n'a plus d'identifiant fixe. */
World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 6 » ou la Lanterne de Lumen             */
/* ------------------------------------------------------------------ */

/* Le socle des chapitres précédents est réputé acquis (renfort), sans XP. Les sorts du chapitre 6, eux, s'apprennent auprès des gardiens. */
function socleCh6Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
	 typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}

function commencerChapitre6(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh6Acquis();
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch6Direct");
	PROFIL.chapitre = 6;
	enregistrerProfil();
	if (!state.ch6 || typeof state.ch6 !== "object") state.ch6 = etatCh6Initial();
	state.applyState("ch6Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(HallLumen);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre7 = state.tempsMs;
	state.ch6.dernierNb = state.nbCommandes;
	if (typeof montrerImage === "function") montrerImage(HallLumen.room_pic, "Lumen");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 6 : LUMEN, LA CITÉ QUI S'ÉTEINT")) + "\n\n" +
		"Sous l'école dort Lumen, une cité souterraine bâtie par les premiers ingénieurs, alimentée par une seule machine : le Cœur. " +
		"Depuis le départ de la Nuée, il s'épuise ; quartier après quartier, les lumières s'éteignent. Il est 6 h. À 14 h, la Longue Nuit tombera.\n\n" +
		"Tu es sur la place de Lumen. " + C.vert("cat Laurent") + ", puis " + C.vert("cat Mission") + ". Grace te guide à la radio ; seize gardiens t'attendent dans leurs quartiers.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, lanterne pour le plan de la cité. L'horloge file vers la Nuit."));
	return true;
}
