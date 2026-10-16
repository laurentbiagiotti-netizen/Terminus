/**
 * Chapitre5.js : le Bastion, le chapitre du durcissement Linux.
 *
 * Numéro interne 6 (le 4 est l'épreuve finale, le 5 le chapitre 4), affiché 5 pour le joueur.
 * Quelques jours après la nuit de la Nuée, l'école passe une inspection de sécurité à l'aube. Laurent confie à
 * la recrue le Bastion : un serveur Debian neuf (la machine bastion), installé « par défaut », donc ouvert de partout.
 * La Nuée a juré de revenir : à l'aube, elle éprouve chaque mur ; l'inspecteur arrive juste derrière.
 *
 * Ce fichier pose le monde : le hall et ses douze tours, la machine bastion (de vrais fichiers de configuration,
 * lus par les sorts de SortsBastion.js et SortsGuet.js), l'horloge de la nuit, les 29 étapes et leur validation
 * sur l'ÉTAT RÉEL de la machine (configuration effective rechargée, services, paquets, score de la Pierre),
 * l'assaut de l'aube, l'ouverture du chapitre et son certificat. Bastion.js fait vivre les maîtres et leurs défis.
 *
 * STRICTEMENT DÉFENSIF : le joueur durcit, vérifie, détecte, répare, documente. La Nuée et les épreuves de Frances
 * sont narratives et inertes (des lignes de journal, des fichiers sans effet) : aucune technique d'attaque ici.
 *
 * Le nom « bastion » sert aussi aux tests du moteur (tests/bastion-moteur-a.js), qui posent leur propre machine :
 * tout ce qui suit ne s'applique qu'à NOTRE machine (estMonBastion) et seulement une fois le chapitre ouvert.
 * Les déclarations du moteur (paquets, écoutes, unités, connexions) se font donc à l'ouverture, pas au chargement.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les valeurs de la partie                                            */
/* ------------------------------------------------------------------ */

var H5 = "bastion";
var IP_BASTION = "10.0.96." + aleaEntier("ch5-ip", 10, 60);          // hors 10.0.92.0/24 : nmap des chapitres 2 et 3 inchangé
var IP_VINT = "10.0.92." + aleaEntier("ch5-ip-vint", 100, 140);       // le poste de Vint, banni par erreur (défi de la Garde)
var IP_SECRETARIAT = "10.0.92." + aleaEntier("ch5-ip-secr", 150, 190);
var IP_ASSAUT = (typeof PLAGE_NUEE !== "undefined" ? PLAGE_NUEE : "45.137.") + aleaEntier("ch5-nuee-a", 20, 230) + "." + aleaEntier("ch5-nuee-b", 2, 250);

var PAS_HORLOGE_CH5 = 3;     // minutes de la nuit par commande tapée dans le chapitre
var AUBE_CH5 = 480;          // 22 h + 480 min = 6 h
var QUATRE_HEURES_CH5 = 360; // 22 h + 360 min = 4 h

function etatCh5Initial(){
	return {
		horloge: 0,       // minutes écoulées depuis 22 h
		dernierNb: null,  // nombre de commandes au dernier tour (pour avancer l'horloge)
		base: null,       // la date (ms) de 22 h, le soir de l'ouverture
		heureAnnoncee: 22,
		assaut: false,    // l'aube est passée : la Nuée a éprouvé les murs
		traces: {},       // les traces laissées par l'assaut, par tour (cle -> true)
		murs: {},         // les tours que Frances a déjà éprouvées (le mur a tenu)
		fermees: {},      // l'heure (horloge) à laquelle chaque tour s'est fermée
		pf: null,         // le pare-feu de la machine (ufw et nftables)
		aide: null,       // la base AIDE (empreintes des fichiers)
		scoreDepart: null, scoreDernier: null, scoreFinal: null
	};
}

/* ------------------------------------------------------------------ */
/* Les lieux : le hall du Bastion et ses douze tours                   */
/* ------------------------------------------------------------------ */

function lieuDuChapitre6(lieu){ lieu.chapitre = 6; return lieu; }
function salleCh5(nom, intro, img){
	var r = lieuDuChapitre6(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh5(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	if (options.enseigne) it.enseigne.apply(it, options.enseigne);
	if (options.revele) it.revele.apply(it, options.revele);
	lieu.addItem(it);
	return it;
}

var HallBastion = salleCh5("Bastion",
	"Le hall du Bastion, au-delà d'une poterne de l'Académie. Une cour pavée, et tout autour douze tours de pierre, une par mur à dresser. " +
	"Au centre, sur un socle, la Pierre d'Inspection luit faiblement. Laurent t'attend ; Frances fait les cent pas ; la radio de Grace grésille.",
	"loc_bastion.gif");

/* Les douze tours : la clé, le nom du lieu, l'image, l'intro. */
var TOURS_CH5 = [
	{ cle: "herse", nom: "Herse", maitre: "Fernando", titre: "la Herse des Comptes", etapes: ["h_comptes_vides", "h_comptes_regles"],
	  intro: "La tour de la Herse des Comptes : une grille de fer à pointes, une clé par barreau. Ici, on décide qui entre, et avec quel mot de passe." },
	{ cle: "sceau", nom: "Sceau", maitre: "Butler", titre: "le Sceau du Roi", etapes: ["h_sudo", "h_planif"],
	  intro: "La tour du Sceau du Roi : un pupitre, une cire rouge, un registre de ceux qui ont le droit de parler au nom du roi (sudo), et les roues du temps (cron, at)." },
	{ cle: "pontlevis", nom: "PontLevis", maitre: "Tatu", titre: "le Pont-levis", etapes: ["h_ssh_acces", "h_ssh_algos"],
	  intro: "La tour du Pont-levis : de lourdes chaînes, un treuil, et le seul passage vers le Bastion depuis l'extérieur (SSH)." },
	{ cle: "portes", nom: "Portes", maitre: "Jean", titre: "les Portes condamnées", etapes: ["h_portes", "h_sandbox"],
	  intro: "La tour des Portes condamnées : des dizaines de portes dans le mur, la plupart inutiles, certaines grandes ouvertes (des services qui écoutent)." },
	{ cle: "remparts", nom: "Remparts", maitre: "Vint", titre: "les Remparts", etapes: ["h_parefeu", "h_parefeu_verif"],
	  intro: "La tour des Remparts : un chemin de ronde, des meurtrières, et une seule règle gravée au-dessus de la porte : « tout refuser, sauf » (le pare-feu)." },
	{ cle: "coffres", nom: "Coffres", maitre: "Evelyn", titre: "la Salle des Coffres", etapes: ["h_droits", "h_capacites"],
	  intro: "La Salle des Coffres : des coffres de fer, chacun avec ses serrures (les droits des fichiers), et quelques passe-partout oubliés (SUID, capacités)." },
	{ cle: "coeur", nom: "Coeur", maitre: "Edsger", titre: "le Cœur", etapes: ["h_sysctl", "h_modules"],
	  intro: "La tour du Cœur : une salle ronde où bat le noyau. Des leviers (sysctl) et des tiroirs à pièces détachées (les modules)." },
	{ cle: "poterne", nom: "Poterne", maitre: "Joan", titre: "la Poterne", etapes: ["h_grub", "h_ctrlaltdel"],
	  intro: "La tour de la Poterne : une petite porte basse, au pied du mur, par où l'on entre au démarrage (le chargeur GRUB)." },
	{ cle: "banniere", nom: "Banniere", maitre: "Robert", titre: "la Bannière", etapes: ["h_apache_bavard", "h_apache_tls"],
	  intro: "La tour de la Bannière : l'étendard que le Bastion montre au monde (le serveur web Apache), et le sceau qui l'authentifie (le certificat TLS)." },
	{ cle: "guet", nom: "Guet", maitre: "Katherine", titre: "la Tour de Guet", etapes: ["h_auditd", "h_journaux"],
	  intro: "La Tour de Guet : une vigie, des registres, une cloche. Tout ce qui bouge dans le Bastion doit y laisser une trace (audit et journaux)." },
	{ cle: "sceaux", nom: "Sceaux", maitre: "Ralph", titre: "les Sceaux d'intégrité", etapes: ["h_aide", "h_paquets"],
	  intro: "La tour des Sceaux d'intégrité : des empreintes de cire pour chaque fichier, et des caisses de pièces neuves (les mises à jour)." },
	{ cle: "garde", nom: "Garde", maitre: "Adele", titre: "la Garde", etapes: ["h_fail2ban", "h_apparmor"],
	  intro: "La tour de la Garde : des sentinelles qui bannissent l'importun (fail2ban) et des cellules où chaque programme reste à sa place (AppArmor)." }
];
TOURS_CH5.forEach(function(t){
	t.lieu = salleCh5(t.nom, t.intro, "loc_tour_" + t.cle + ".gif");
	link_rooms(HallBastion, t.lieu);
});
function tourCh5(cle){ return TOURS_CH5.filter(function(t){ return t.cle === cle; })[0]; }

/* La boîte de Laurent : on y dépose le rapport d'inspection. */
var BoiteDuBastion = salleCh5("BoiteDeLaurent", "Une boîte aux lettres de pierre, scellée au pied de la Pierre d'Inspection. On y dépose le rapport, à l'intention de Laurent.", "item_box.gif");
BoiteDuBastion.mode = "rwxrwxrwt";
BoiteDuBastion.owner = "laurent";
BoiteDuBastion.horsBareme = true;
link_rooms(HallBastion, BoiteDuBastion);

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_6 = (function(){
	var liste = (typeof SORTS_BASTION !== "undefined" ? SORTS_BASTION : []).concat(typeof SORTS_GUET !== "undefined" ? SORTS_GUET : []);
	var autres = [].concat(typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
		typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : []);
	return liste.filter(function(s, i){ return liste.indexOf(s) === i && autres.indexOf(s) === -1 && typeof MANUEL !== "undefined" && MANUEL[s]; });
})();
/* Le chapitre les enseigne : leur premier usage rapporte désormais de l'XP. */
ORDRE_DES_SORTS_6.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });
if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return ORDRE_DES_SORTS_6.indexOf(c) === -1; });

/* Qui enseigne quoi (les maîtres sont posés dans Bastion.js) : chaque sort a un maître, et un seul. */
var SORTS_DES_TOURS = {
	herse: ["faillock", "pwck", "grpck", "useradd", "umask"],
	sceau: ["su"],
	pontlevis: ["sshd"],
	portes: ["systemd-analyze"],
	remparts: [],
	coffres: ["getcap", "setcap", "mount", "findmnt"],
	coeur: ["lsmod", "modprobe"],
	poterne: ["grub-mkpasswd-pbkdf2", "update-grub", "grub-mkconfig", "cryptsetup"],
	banniere: ["apachectl", "apache2ctl", "a2enmod", "a2dismod", "a2enconf", "a2disconf", "a2ensite", "a2dissite"],
	guet: ["auditctl", "augenrules", "ausearch", "aureport", "logger", "rsyslogd", "logrotate"],
	sceaux: ["apt-get", "dpkg", "etckeeper"],
	garde: ["aa-status", "aa-enforce", "aa-complain", "aa-disable", "apparmor_parser"]
};
var SORTS_DE_LAURENT_CH5 = ["lynis"];

/* ------------------------------------------------------------------ */
/* La machine bastion : un Debian 12 installé « par défaut »           */
/* ------------------------------------------------------------------ */

var ServeurBastion = lieuDuChapitre6(new Room("bastion",
	"Le serveur bastion : un Debian 12 tout neuf, installé « par défaut ». Tout y est ouvert, tout y répond, rien n'y est surveillé. " +
	"C'est lui que la Nuée éprouvera à l'aube, et lui que l'inspecteur notera.", "loc_serveur_bastion.gif"));
ServeurBastion.racineHote = H5;
ServeurBastion.owner = "root";
ServeurBastion.mode = "rwxr-xr-x";
ServeurBastion.removeCommand("cd");
ServeurBastion.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh bastion");
if (typeof Machines !== "undefined") link_rooms(Machines, ServeurBastion);

function estMonBastion(){
	try { return !!(typeof HOTES !== "undefined" && HOTES[H5] && HOTES[H5].arrivee && HOTES[H5].arrivee() === ServeurBastion); } catch (e){ return false; }
}
function bastionOuvert(){
	return typeof state !== "undefined" && state && state.has && state.has("ch5Ouvert") && estMonBastion() &&
		!(typeof examenEnCours === "function" && examenEnCours());
}
function sCh5(){ return (typeof state !== "undefined" && state && state.ch5 && typeof state.ch5 === "object") ? state.ch5 : etatCh5Initial(); }

/* Écrire un fichier de la machine au chargement (l'état d'origine, pas une modification de la partie). */
function P5(chemin, texte, options){ return poserFichierHote(H5, chemin, texte, options); }
function D5(chemin, options){ return creerDossierHote(H5, chemin, options); }
function T5(chemin){ return lireFichierHote(H5, chemin); }
function F5(chemin){ return fichierHoteGuet(H5, chemin); }

var COMPTES_CH5 = {
	systeme: [["daemon", 1, "/usr/sbin", "/usr/sbin/nologin"], ["bin", 2, "/bin", "/usr/sbin/nologin"], ["sys", 3, "/dev", "/usr/sbin/nologin"],
		["sync", 4, "/bin", "/bin/sync"], ["www-data", 33, "/var/www", "/usr/sbin/nologin"], ["backup", 34, "/var/backups", "/usr/sbin/nologin"],
		["nobody", 65534, "/nonexistent", "/usr/sbin/nologin"], ["_rpc", 103, "/run/rpcbind", "/usr/sbin/nologin"], ["sshd", 104, "/run/sshd", "/usr/sbin/nologin"],
		["avahi", 105, "/run/avahi-daemon", "/usr/sbin/nologin"], ["_chrony", 106, "/var/lib/chrony", "/usr/sbin/nologin"]],
	service: [["sauvegarde", 998, "/var/backups/sauvegarde", "/bin/bash"], ["deploiement", 997, "/opt/deploiement", "/bin/bash"]],
	humains: [["vint", 1001, "Vint (administrateur réseau)"], ["secretariat", 1002, "Secrétariat pédagogique"], ["stagiaire", 1003, "Stagiaire de l'an dernier"], ["invite", 1004, "Compte invité"]]
};

function texteComptesCh5(){
	var p = ["root:x:0:0:root:/root:/bin/bash"], s = ["root:$y$j9T$" + base64Aleatoire("ch5-root", 22) + ":20000:0:99999:7:::"], g = ["root:x:0:"];
	COMPTES_CH5.systeme.forEach(function(c){
		p.push(c[0] + ":x:" + c[1] + ":" + (c[0] === "sync" ? 65534 : c[1]) + ":" + c[0] + ":" + c[2] + ":" + c[3]);
		s.push(c[0] + ":*:20000:0:99999:7:::");
	});
	COMPTES_CH5.service.forEach(function(c){
		p.push(c[0] + ":x:" + c[1] + ":" + c[1] + "::" + c[2] + ":" + c[3]);
		s.push(c[0] + ":$y$j9T$" + base64Aleatoire("ch5-" + c[0], 22) + ":20100:0:99999:7:::");
	});
	p.push(JOUEUR + ":x:1000:1000:Administrateur du Bastion:/home/" + JOUEUR + ":/bin/bash");
	s.push(JOUEUR + ":$y$j9T$" + base64Aleatoire("ch5-moi", 22) + ":20300:0:99999:7:::");
	COMPTES_CH5.humains.forEach(function(c){
		p.push(c[0] + ":x:" + c[1] + ":" + c[1] + ":" + c[2] + ":/home/" + c[0] + ":/bin/bash");
		s.push(c[0] + ":" + (c[0] === "invite" ? "" : "$y$j9T$" + base64Aleatoire("ch5-" + c[0], 22)) + ":" + (c[0] === "stagiaire" ? 19500 : 20200) + ":0:99999:7:::");
	});
	// Un second root, laissé par une vieille procédure de dépannage : UID 0.
	p.push("depannage:x:0:0:Compte de depannage:/root:/bin/bash");
	s.push("depannage:$y$j9T$" + base64Aleatoire("ch5-depannage", 22) + ":19400:0:99999:7:::");
	g.push("daemon:x:1:", "bin:x:2:", "sys:x:3:", "adm:x:4:" + JOUEUR, "www-data:x:33:", "backup:x:34:", "shadow:x:42:", "sudo:x:27:" + JOUEUR + ",vint",
		"wheel:x:10:" + JOUEUR, "nogroup:x:65534:", "_rpc:x:103:", "sshd:x:104:", "avahi:x:105:", "_chrony:x:106:", "sauvegarde:x:998:", "deploiement:x:997:",
		JOUEUR + ":x:1000:", "vint:x:1001:", "secretariat:x:1002:", "stagiaire:x:1003:", "invite:x:1004:");
	return { passwd: p.join("\n") + "\n", shadow: s.join("\n") + "\n", group: g.join("\n") + "\n" };
}

var SSHD_CONFIG_DEBIAN =
	"# This is the sshd server system-wide configuration file.  See\n# sshd_config(5) for more information.\n\n" +
	"# The strategy used for options in the default sshd_config shipped with\n# OpenSSH is to specify options with their default value where\n# possible, but leave them commented.  Uncommented options override the\n# default value.\n\n" +
	"Include /etc/ssh/sshd_config.d/*.conf\n\n#Port 22\n#AddressFamily any\n#ListenAddress 0.0.0.0\n#ListenAddress ::\n\n" +
	"# Authentication:\n\n#LoginGraceTime 2m\nPermitRootLogin yes\n#StrictModes yes\n#MaxAuthTries 6\n#MaxSessions 10\n\n#PubkeyAuthentication yes\n\n" +
	"# To disable tunneled clear text passwords, change to no here!\nPasswordAuthentication yes\n#PermitEmptyPasswords no\n\n" +
	"KbdInteractiveAuthentication no\n\nUsePAM yes\n\n#AllowAgentForwarding yes\n#AllowTcpForwarding yes\nX11Forwarding yes\nPrintMotd no\n\n" +
	"#ClientAliveInterval 0\n#ClientAliveCountMax 3\n\n# no default banner path\n#Banner none\n\n" +
	"# Allow client to pass locale environment variables\nAcceptEnv LANG LC_*\n\n# override default of no subsystems\nSubsystem\tsftp\t/usr/lib/openssh/sftp-server\n";

var NFTABLES_DEBIAN = "#!/usr/sbin/nft -f\n\nflush ruleset\n\ntable inet filter {\n\tchain input {\n\t\ttype filter hook input priority filter;\n\t}\n\tchain forward {\n\t\ttype filter hook forward priority filter;\n\t}\n\tchain output {\n\t\ttype filter hook output priority filter;\n\t}\n}\n";

var AIDE_CONF_DEBIAN = "# AIDE conf (Debian)\n# Les bases : celle de référence (in) et celle qu'on fabrique (out)\n" +
	"database_in=file:/var/lib/aide/aide.db\ndatabase_out=file:/var/lib/aide/aide.db.new\ngzip_dbout=no\n\n" +
	"# Les règles : ce qu'on surveille (contenu, droits, propriétaire)\nNORMAL = p+u+g+s+sha256\n\n" +
	"/etc NORMAL\n/usr/bin NORMAL\n/usr/sbin NORMAL\n/usr/local/bin NORMAL\n/boot NORMAL\n!/etc/mtab\n!/var/log\n!/var/lib/aide\n";

var DATE_INSTALL_CH5 = Date.now();
function joursCh5(n){ return new Date(DATE_INSTALL_CH5 + n * 86400000); }

/* Les unités systemd de la machine (le même texte sert aux paquets, pour debsums et apt purge). */
var UNITES_CH5 = (function(){
	var u = {};
	function unite(nom, description, exec, extra, install){
		u[nom] = "[Unit]\nDescription=" + description + "\n\n" + (/\.socket$/.test(nom) ? "[Socket]\n" : "[Service]\n") + exec + "\n" + (extra || "") +
			"\n[Install]\nWantedBy=" + (install || "multi-user.target");
	}
	unite("ssh.service", "OpenBSD Secure Shell server", "ExecStartPre=/usr/sbin/sshd -t\nExecStart=/usr/sbin/sshd -D $SSHD_OPTS\nExecReload=/usr/sbin/sshd -t\nExecReload=/bin/kill -HUP $MAINPID", "KillMode=process\nRestart=on-failure\n");
	unite("apache2.service", "The Apache HTTP Server", "Type=forking\nEnvironment=APACHE_STARTED_BY_SYSTEMD=true\nExecStart=/usr/sbin/apachectl start\nExecStop=/usr/sbin/apachectl graceful-stop\nExecReload=/usr/sbin/apachectl graceful", "KillMode=mixed\nRestart=on-abort\n");
	unite("cron.service", "Regular background program processing daemon", "ExecStart=/usr/sbin/cron -f $EXTRA_OPTS", "KillMode=process\n");
	unite("rpcbind.service", "RPC bind portmap service", "ExecStart=/sbin/rpcbind -f -w");
	unite("telnet.socket", "Telnet Server Activation Socket", "ListenStream=23\nAccept=yes", "", "sockets.target");
	unite("avahi-daemon.service", "Avahi mDNS/DNS-SD Stack", "ExecStart=/usr/sbin/avahi-daemon -s");
	unite("auditd.service", "Security Auditing Service", "Type=forking\nExecStart=/sbin/auditd", "");
	unite("rsyslog.service", "System Logging Service", "Type=notify\nExecStart=/usr/sbin/rsyslogd -n -iNONE", "");
	unite("fail2ban.service", "Fail2Ban Service", "Type=simple\nExecStart=/usr/bin/fail2ban-server -xf start", "");
	unite("chrony.service", "chrony, an NTP client/server", "Type=forking\nExecStart=/usr/sbin/chronyd $DAEMON_OPTS", "");
	unite("nftables.service", "nftables", "Type=oneshot\nRemainAfterExit=yes\nExecStart=/usr/sbin/nft -f /etc/nftables.conf\nExecReload=/usr/sbin/nft -f /etc/nftables.conf", "", "sysinit.target");
	return u;
})();

function construireBastion(){
	var comptes = texteComptesCh5();
	P5("/etc/hostname", "bastion\n");
	P5("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tbastion\n" + IP_BASTION + "\tbastion\n10.0.92.53\tdns\n");
	P5("/etc/debian_version", "12.8\n");
	P5("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"12\"\nVERSION=\"12 (bookworm)\"\nID=debian\n");
	P5("/etc/passwd", comptes.passwd);
	// /etc/shadow lisible par tous : une erreur d'installation (la Salle des Coffres la corrige).
	P5("/etc/shadow", comptes.shadow, { mode: "rw-r--r--" });
	P5("/etc/group", comptes.group);
	P5("/etc/login.defs", "#\n# /etc/login.defs - Configuration control definitions for the login package.\n#\nMAIL_DIR        /var/mail\n\n" +
		"# Password aging controls:\n#\n#\tPASS_MAX_DAYS\tMaximum number of days a password may be used.\n#\tPASS_MIN_DAYS\tMinimum number of days allowed between password changes.\n#\tPASS_WARN_AGE\tNumber of days warning given before a password expires.\n#\n" +
		"PASS_MAX_DAYS\t99999\nPASS_MIN_DAYS\t0\nPASS_WARN_AGE\t7\n\nUID_MIN\t\t\t 1000\nUID_MAX\t\t\t60000\n\n# Default initial umask\nUMASK\t\t022\n\nUSERGROUPS_ENAB yes\nENCRYPT_METHOD YESCRYPT\n");
	P5("/etc/security/faillock.conf", "# Configuration for locking the user after multiple failed\n# authentication attempts.\n#\n# Deny access if the number of consecutive authentication failures\n# for this user during the recent interval exceeds n tries.\n# The default is 3.\n# deny = 3\n#\n# The length of the interval during which the consecutive\n# authentication failures must happen for the user account\n# lock out is n seconds.\n# The default is 900 (15 minutes).\n# fail_interval = 900\n#\n# The access will be re-enabled after n seconds after the lock out.\n# The default is 600 (10 minutes).\n# unlock_time = 600\n");
	P5("/etc/security/limits.conf", "# /etc/security/limits.conf\n#\n#Each line describes a limit for a user in the form:\n#\n#<domain>        <type>  <item>  <value>\n#\n#*               soft    core            0\n#root            hard    core            100000\n\n# End of file\n");
	D5("/etc/security/limits.d");
	P5("/etc/pam.d/common-auth", "#\n# /etc/pam.d/common-auth - authentication settings common to all services\n#\n# (pam_faillock a été activé par Vint avec pam-auth-update)\n" +
		"auth\trequired\t\t\tpam_faillock.so preauth\nauth\t[success=1 default=ignore]\tpam_unix.so nullok\nauth\t[default=die]\t\t\tpam_faillock.so authfail\nauth\trequisite\t\t\tpam_deny.so\nauth\trequired\t\t\tpam_permit.so\n");
	P5("/etc/pam.d/su", "#\n# The PAM configuration file for the Shadow `su' service\n#\nauth       sufficient pam_rootok.so\n\n# Uncomment this to force users to be a member of group wheel\n# before they can use `su'.\n# auth       required   pam_wheel.so\n\nsession    required   pam_env.so readenv=1\n@include common-auth\n@include common-account\n@include common-session\n");
	P5("/etc/profile", "# /etc/profile: system-wide .profile file for the Bourne shell (sh(1))\n\nif [ \"$(id -u)\" -eq 0 ]; then\n  PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"\nelse\n  PATH=\"/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games\"\nfi\nexport PATH\n\nif [ -d /etc/profile.d ]; then\n  for i in /etc/profile.d/*.sh; do\n    if [ -r $i ]; then\n      . $i\n    fi\n  done\n  unset i\nfi\n");
	D5("/etc/profile.d");
	P5("/etc/sudoers", "#\n# This file MUST be edited with the 'visudo' command as root.\n#\n# Please consider adding local content in /etc/sudoers.d/ instead of\n# directly modifying this file.\n#\nDefaults\tenv_reset\nDefaults\tmail_badpass\n" +
		"Defaults\tsecure_path=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"\nDefaults\tuse_pty\n\n# User privilege specification\nroot\tALL=(ALL:ALL) ALL\n\n" +
		"# Allow members of group sudo to execute any command\n%sudo\tALL=(ALL:ALL) ALL\n\n# See sudoers(5) for more information on \"@include\" directives:\n\n@includedir /etc/sudoers.d\n", { mode: "r--r-----" });
	P5("/etc/sudoers.d/README", "#\n# Files in /etc/sudoers.d are read by sudo. Each file must have mode 0440.\n#\n", { mode: "r--r-----" });
	// La règle de l'outil de déploiement : tout, sans mot de passe. Et des droits trop larges sur le fichier.
	P5("/etc/sudoers.d/deploiement", "# Outil de deploiement (installe par le prestataire)\ndeploiement ALL=(ALL) NOPASSWD: ALL\n", { mode: "rw-r--r--" });
	P5("/etc/sudoers.d/vint", "# Vint, administrateur reseau\nvint ALL=(ALL:ALL) ALL\n", { mode: "r--r-----" });
	P5("/etc/crontab", "# /etc/crontab: system-wide crontab\nSHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n# m h dom mon dow user\tcommand\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n");
	// Un fichier de cron modifiable par tout le monde : n'importe qui pourrait y glisser une ligne exécutée par root.
	P5("/etc/cron.d/rotation-sauvegardes", "# Rotation des sauvegardes (ajoute par l'ancien prestataire)\n30 3 * * * root /usr/local/bin/sauver.sh\n", { mode: "rw-rw-rw-" });
	P5("/etc/ssh/sshd_config", SSHD_CONFIG_DEBIAN);
	D5("/etc/ssh/sshd_config.d");
	P5("/etc/ssh/ssh_host_ed25519_key.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("ch5-hostkey", 43) + " root@bastion\n");
	P5("/etc/ssh/moduli", "# Time Type Tests Tries Size Generator Modulus\n");
	P5("/etc/issue", "Debian GNU/Linux 12 \\n \\l\n\n");
	P5("/etc/issue.net", "Debian GNU/Linux 12\n");
	P5("/etc/motd", "\nThe programs included with the Debian GNU/Linux system are free software.\n");
	// Le noyau : un vieux réglage de routeur laissé par Vint, et rien de durci.
	P5("/etc/sysctl.conf", "#\n# /etc/sysctl.conf - Configuration file for setting system variables\n# See /etc/sysctl.d/ for additional system variables.\n#\n#net.ipv4.ip_forward=1\n#net.ipv4.conf.all.accept_redirects = 0\n");
	P5("/etc/sysctl.d/10-routeur.conf", "# Essai de Vint : le bastion servait de routeur pendant la panne\nnet.ipv4.ip_forward = 1\nkernel.randomize_va_space = 0\n");
	P5("/etc/sysctl.d/README.sysctl", "Files in this directory are read by sysctl --system, in lexical order, if they end in .conf\n");
	P5("/etc/modprobe.d/alsa-base.conf", "options snd-usb-audio index=-2\n");
	P5("/etc/default/grub", "# If you change this file, run 'update-grub' afterwards to update\n# /boot/grub/grub.cfg.\n\nGRUB_DEFAULT=0\nGRUB_TIMEOUT=5\nGRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`\nGRUB_CMDLINE_LINUX_DEFAULT=\"quiet\"\nGRUB_CMDLINE_LINUX=\"\"\n");
	["00_header", "05_debian_theme", "10_linux", "20_linux_xen", "30_os-prober", "30_uefi-firmware", "41_custom"].forEach(function(n){ P5("/etc/grub.d/" + n, "#! /bin/sh\nset -e\n", { mode: "rwxr-xr-x" }); });
	P5("/etc/grub.d/40_custom", "#!/bin/sh\nexec tail -n +3 $0\n# This file provides an easy way to add custom menu entries.  Simply type the\n# menu entries you want to add after this comment.  Be careful not to change\n# the 'exec tail' line above.\n", { mode: "rwxr-xr-x" });
	P5("/etc/grub.d/README", "All executable files in this directory are processed in shell expansion order.\n");
	P5("/boot/grub/grub.cfg", "#\n# DO NOT EDIT THIS FILE\n#\n# It is automatically generated by grub-mkconfig using templates\n# from /etc/grub.d and settings from /etc/default/grub\n#\nset timeout=5\nmenuentry 'Debian GNU/Linux' {\n\tlinux\t/boot/vmlinuz-6.1.0-28-amd64 root=UUID=7c1e5a2b ro quiet\n}\n", { mode: "r--r--r--" });
	P5("/boot/vmlinuz-6.1.0-28-amd64", "ELF vmlinuz 6.1.0-28\n", { mode: "rw-r--r--" });
	P5("/boot/initrd.img-6.1.0-28-amd64", "initramfs 6.1.0-28\n", { mode: "rw-r--r--" });
	P5("/etc/crypttab", "# <target name>\t<source device>\t\t<key file>\t<options>\nsda3_crypt UUID=" + "5a1b2c3d-" + aleaEntier("ch5-luks-a", 1000, 9999) + "-4000-8000-" + aleaEntier("ch5-luks-b", 100000000, 999999999) + "aaa none luks,discard\n");
	P5("/etc/fstab", "# /etc/fstab: static file system information.\n#\n# <file system> <mount point>   <type>  <options>       <dump>  <pass>\n/dev/mapper/sda3_crypt /               ext4    errors=remount-ro 0       1\nUUID=7c1e5a2b /boot           ext2    defaults        0       2\n/dev/mapper/swap_crypt none            swap    sw              0       0\n");
	P5("/etc/audit/auditd.conf", "#\n# This file controls the configuration of the audit daemon\n#\nlocal_events = yes\nlog_file = /var/log/audit/audit.log\nlog_format = ENRICHED\nmax_log_file = 8\nnum_logs = 5\n");
	P5("/etc/audit/rules.d/audit.rules", "## First rule - delete all\n-D\n\n## Increase the buffers to survive stress events.\n-b 8192\n\n## Set failure mode to syslog\n-f 1\n");
	D5("/var/log/audit", { mode: "rwx------" });
	P5("/etc/rsyslog.conf", "# /etc/rsyslog.conf configuration file for rsyslog\n\nmodule(load=\"imuxsock\")\nmodule(load=\"imklog\")\n\n$FileOwner root\n$FileGroup adm\n$FileCreateMode 0640\n$DirCreateMode 0755\n$Umask 0022\n\n$IncludeConfig /etc/rsyslog.d/*.conf\n\n" +
		"*.*;auth,authpriv.none\t\t-/var/log/syslog\nauth,authpriv.*\t\t\t/var/log/auth.log\ncron.*\t\t\t\t-/var/log/cron.log\nkern.*\t\t\t\t-/var/log/kern.log\n*.emerg\t\t\t\t:omusrmsg:*\n");
	D5("/etc/rsyslog.d");
	P5("/etc/logrotate.conf", "# see \"man logrotate\" for details\n\nweekly\nrotate 4\ncreate\n\ninclude /etc/logrotate.d\n");
	P5("/etc/logrotate.d/apache2", "/var/log/apache2/*.log {\n\tdaily\n\tmissingok\n\trotate 14\n\tcompress\n\tdelaycompress\n\tnotifempty\n\tcreate 640 root adm\n}\n");
	P5("/etc/logrotate.d/bastion", "/var/log/bastion/*.log {\n\tweekly\n\trotate 4\n\tcompress\n\tdelaycompress\n\tmissingok\n\tnotifempty\n\tcreate 0640 root adm\n}\n");
	P5("/var/log/bastion/garde.log", "registre de la garde du Bastion\nouverture du registre\n", { mode: "rw-r-----" });
	P5("/etc/systemd/journald.conf", "#  This file is part of systemd.\n#\n# Entries in this file show the compile time defaults.\n\n[Journal]\n#Storage=auto\n#Compress=yes\n#Seal=yes\n#SystemMaxUse=\n");
	P5("/etc/chrony/chrony.conf", "# Welcome to the chrony configuration file.\nconfdir /etc/chrony/conf.d\npool 2.debian.pool.ntp.org iburst\nsourcedir /etc/chrony/sources.d\nkeyfile /etc/chrony/chrony.keys\ndriftfile /var/lib/chrony/chrony.drift\nmakestep 1 3\nrtcsync\n");
	P5("/etc/apparmor.d/usr.sbin.apache2", "#include <tunables/global>\n\n/usr/sbin/apache2 flags=(attach_disconnected,complain) {\n  #include <abstractions/base>\n  #include <abstractions/nameservice>\n  /var/www/** r,\n  /etc/apache2/** r,\n  /var/log/apache2/* w,\n}\n");
	P5("/etc/apparmor.d/usr.sbin.rsyslogd", "#include <tunables/global>\n\nprofile rsyslogd /usr/sbin/rsyslogd flags=(complain) {\n  #include <abstractions/base>\n  /var/log/** rw,\n  /etc/rsyslog.d/ r,\n}\n");
	P5("/etc/apparmor.d/usr.sbin.chronyd", "#include <tunables/global>\n\n/usr/sbin/chronyd {\n  #include <abstractions/base>\n  /etc/chrony/** r,\n  /var/lib/chrony/** rw,\n}\n");
	D5("/etc/apparmor.d/abstractions");
	D5("/etc/apparmor.d/disable");
	P5("/etc/fail2ban/jail.conf", "#\n# WARNING: heavily refactored in 0.9.0 release.  Please review and\n#          customize settings for your setup.\n#\n# Changes:  in most of the cases you should not modify this\n#           file, but provide customizations in jail.local file,\n#           or separate .conf files under jail.d/ directory\n#\n\n" +
		"[DEFAULT]\nignoreip = 127.0.0.1/8 ::1\nbantime  = 10m\nfindtime  = 10m\nmaxretry = 5\nbackend = auto\n\n[sshd]\nport    = ssh\nlogpath = %(sshd_log)s\nbackend = %(sshd_backend)s\n\n[apache-auth]\nport     = http,https\nlogpath  = %(apache_error_log)s\n");
	D5("/etc/fail2ban/jail.d");
	D5("/etc/fail2ban/filter.d");
	P5("/etc/rkhunter.conf", "# rkhunter configuration\nALLOW_SSH_ROOT_USER=no\nSCRIPTWHITELIST=/usr/bin/egrep\n");
	P5("/etc/ufw/ufw.conf", "# /etc/ufw/ufw.conf\n#\n\n# Set to yes to start on boot. If setting this remotely, be sure to add a rule\n# to allow your remote connection before starting ufw. Eg: 'ufw allow 22/tcp'\nENABLED=no\n\n# Please use the 'ufw' command to set the loglevel. Eg: 'ufw logging medium'.\n# See 'man ufw' for details.\nLOGLEVEL=off\n");
	P5("/etc/default/ufw", "# /etc/default/ufw\n#\n\n# Set to yes to apply rules to support IPv6 (no means only IPv6 on loopback\n# accepted).\nIPV6=yes\n\n# Set the default input policy to ACCEPT, DROP, or REJECT.\n# (Vint l'avait passée à ACCEPT pour un essai pendant la panne.)\nDEFAULT_INPUT_POLICY=\"ACCEPT\"\n\nDEFAULT_OUTPUT_POLICY=\"ACCEPT\"\n\nDEFAULT_FORWARD_POLICY=\"DROP\"\n");
	P5("/etc/ufw/user.rules", "*filter\n:ufw-user-input - [0:0]\n### RULES ###\n\n### tuple ### allow tcp 80 0.0.0.0/0 any 0.0.0.0/0 in\n-A ufw-user-input -p tcp --dport 80 -j ACCEPT\n\n### END RULES ###\nCOMMIT\n");
	P5("/etc/nftables.conf", NFTABLES_DEBIAN, { mode: "rwxr-xr-x" });
	P5("/etc/aide/aide.conf", AIDE_CONF_DEBIAN);
	D5("/var/lib/aide", { mode: "rwx------" });
	D5("/etc/apt/apt.conf.d");
	P5("/etc/apt/apt.conf.d/70debconf", "// Pre-configure all packages with debconf before they are installed.\nDPkg::Pre-Install-Pkgs {\"/usr/sbin/dpkg-preconfigure --apt || true\";};\n");
	P5("/etc/apt/sources.list", "deb http://deb.debian.org/debian bookworm main\ndeb http://deb.debian.org/debian-security bookworm-security main\ndeb http://deb.debian.org/debian bookworm-updates main\n");
	P5("/etc/default/telnetd", "# telnetd (inetd) options\nOPTIONS=\n");
	// Apache : installé « par défaut », bavard, avec un certificat expiré.
	installerApacheDebian(H5, { serverName: "bastion", ssl: true, modules: ["ssl", "socache_shmcb"], tokens: "OS", signature: "On", trace: "On",
		cert: "/etc/ssl/certs/bastion.pem", cle: "/etc/ssl/private/bastion.key",
		index: "<!DOCTYPE html>\n<html><head><title>Bastion de Cybersup</title></head>\n<body><h1>Le Bastion</h1><p>Serveur de l'école, en cours de durcissement.</p></body></html>" });
	P5("/etc/ssl/certs/bastion.pem", fabriquerCertificat({ sujet: "CN = bastion", emetteur: "C = FR, O = Cybersup, CN = Cybersup Root CA", debut: joursCh5(-400), fin: joursCh5(-21), san: ["bastion", "bastion.cybersup.lan"], cle: "cle-bastion" }));
	P5("/etc/ssl/certs/bastion-2026.pem", fabriquerCertificat({ sujet: "CN = bastion", emetteur: "C = FR, O = Cybersup, CN = Cybersup Root CA", debut: joursCh5(-3), fin: joursCh5(362), san: ["bastion", "bastion.cybersup.lan"], cle: "cle-bastion" }));
	P5("/etc/ssl/private/bastion.key", fabriquerCle("cle-bastion"), { mode: "rw-------" });
	P5("/var/www/html/documents/planning-inspection.txt", "Planning de l'inspection : arrivee de l'inspecteur a 6 h 30.\n");
	P5("/var/www/html/documents/notes-internes.txt", "Notes internes du Bastion (a ne pas publier).\n");
	// Les programmes : des droits trop larges, un passe-partout, une capacité dangereuse, un binaire inattendu.
	P5("/usr/bin/passwd", "ELF passwd 4.13\n", { mode: "rwsr-xr-x" });
	P5("/usr/bin/su", "ELF su 2.38\n", { mode: "rwsr-xr-x" });
	P5("/usr/bin/sudo", "ELF sudo 1.9.13p3 u1\n", { mode: "rwsr-xr-x" });
	P5("/usr/bin/mount", "ELF mount 2.38\n", { mode: "rwsr-xr-x" });
	P5("/usr/bin/umount", "ELF umount 2.38\n", { mode: "rwsr-xr-x" });
	P5("/usr/bin/ping", "ELF ping 20221126\n", { mode: "rwxr-xr-x" }).capacites = "cap_net_raw=ep";
	P5("/usr/bin/python3.11", "ELF python3.11\n", { mode: "rwxr-xr-x" }).capacites = "cap_setuid=ep";
	P5("/usr/bin/ls", "ELF ls 9.1\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/cat", "ELF cat 9.1\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/id", "ELF id 9.1\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/ps", "ELF ps 4.0.2 (binaire inattendu : il ne correspond pas a son paquet)\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/top", "ELF top 4.0.2\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/sshd", "ELF sshd 9.2p1\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/apache2", "ELF apache2 2.4.62\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/cron", "ELF cron 3.0pl1\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/in.telnetd", "ELF in.telnetd\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/rpcbind", "ELF rpcbind 1.2.6\n", { mode: "rwxr-xr-x" });
	P5("/usr/sbin/avahi-daemon", "ELF avahi-daemon 0.8\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/aide", "ELF aide 0.18.3\n", { mode: "rwxr-xr-x" });
	P5("/usr/bin/etckeeper", "#!/bin/sh\n", { mode: "rwxr-xr-x" });
	P5("/usr/local/bin/sauver.sh", "#!/bin/sh\n# Sauvegarde nocturne (ancien prestataire)\ntar czf /var/backups/bastion.tgz /etc\n", { mode: "rwxrwxrwx" });
	P5("/usr/local/bin/vieil-outil", "ELF vieil-outil (un outil de diagnostic oublie, installe avec le bit SUID)\n", { mode: "rwsr-xr-x" });
	// /tmp sans sticky bit : n'importe qui peut effacer les fichiers des autres.
	D5("/tmp", { mode: "rwxrwxrwx" });
	P5("/tmp/essai.sh", "#!/bin/sh\necho \"un script lance depuis /tmp\"\n", { mode: "rwxr-xr-x", owner: JOUEUR });
	D5("/root", { mode: "rwx------" });
	D5("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	COMPTES_CH5.humains.forEach(function(c){ D5("/home/" + c[0], { owner: c[0], mode: "rwxr-x---" }); });
	D5("/var/backups/sauvegarde", { owner: "sauvegarde" });
	D5("/opt/deploiement", { owner: "deploiement" });
	D5("/var/mail");
	D5("/var/log/apache2", { mode: "rwxr-x---" });
	// Les unités systemd de la machine.
	Object.keys(UNITES_CH5).forEach(function(nom){ P5("/lib/systemd/system/" + nom, UNITES_CH5[nom]); });
	P5("/lib/systemd/system/systemd-journald.service", "[Unit]\nDescription=Journal Service\n\n[Service]\nExecStart=/lib/systemd/systemd-journald\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=strict\n");
	D5("/etc/systemd/system");
}

/* La machine bastion et ses services : décrits au chargement (ssh, nmap...). Leurs détails Debian, à l'ouverture. */
decrireHote(H5, {
	ip: IP_BASTION, ouvert: true, noyau: "6.1.0-28-amd64",
	arrivee: function(){ return ServeurBastion; },
	refus: function(){ return typeof refusBastion === "function" ? refusBastion() : null; },
	journal: lignesDeJournal([["21:58", "systemd", "Started OpenBSD Secure Shell server."], ["21:58", "systemd", "Started The Apache HTTP Server."], ["21:59", "systemd", "Reached target Multi-User System."]]),
	services: {
		ssh: service(H5, "ssh", "OpenBSD Secure Shell server", { procNom: "sshd" }),
		apache2: service(H5, "apache2", "The Apache HTTP Server", { procNom: "apache2" }),
		cron: service(H5, "cron", "Regular background program processing daemon"),
		rpcbind: service(H5, "rpcbind", "RPC bind portmap service", { owner: "_rpc" }),
		"telnet.socket": service(H5, "telnet.socket", "Telnet Server Activation Socket", { procNom: "systemd" }),
		"avahi-daemon": service(H5, "avahi-daemon", "Avahi mDNS/DNS-SD Stack", { owner: "avahi" }),
		auditd: service(H5, "auditd", "Security Auditing Service"),
		rsyslog: service(H5, "rsyslog", "System Logging Service", { procNom: "rsyslogd" }),
		fail2ban: service(H5, "fail2ban", "Fail2Ban Service", { procNom: "fail2ban-server" }),
		chrony: service(H5, "chrony", "chrony, an NTP client/server", { actif: false, auto: false, procNom: "chronyd" }),
		nftables: service(H5, "nftables", "nftables", { actif: false, auto: false, procNom: "nft" })
	}
});
ServeurBastion.addProc(612, "sshd", "root", { service: "ssh", cpu: 0.1 });
ServeurBastion.addProc(733, "apache2", "root", { service: "apache2", cpu: 0.3 });
ServeurBastion.addProc(498, "cron", "root", { service: "cron", cpu: 0.0 });
ServeurBastion.addProc(511, "rpcbind", "_rpc", { service: "rpcbind", cpu: 0.0 });
ServeurBastion.addProc(540, "avahi-daemon", "avahi", { service: "avahi-daemon", cpu: 0.0 });
ServeurBastion.addProc(455, "auditd", "root", { service: "auditd", cpu: 0.0 });
ServeurBastion.addProc(470, "rsyslogd", "root", { service: "rsyslog", cpu: 0.0 });
ServeurBastion.addProc(690, "fail2ban-server", "root", { service: "fail2ban", cpu: 0.2 });
construireBastion();

/* Les sous-dossiers de la machine ne comptent pas comme des lieux à découvrir : seule la machine compte. */
(function marquer(lieu){ lieu.children.forEach(function(c){ if (c !== lieu && c.parents[0] === lieu){ c.horsBareme = true; c.chapitre = 6; marquer(c); } }); })(ServeurBastion);

/* Les déclarations du moteur (ce qui n'est pas sauvegardé : c'est le monde), faites à l'ouverture et après chaque chargement. */
var BASTION_DECLARE = false;
/* Sur bastion, root peut supprimer un fichier (un drop-in de trop, une trace de la Nuée, un vieil outil),
   sauf les registres sans lesquels plus personne n'entre : ceux-là, le monde y tient. */
var INTOUCHABLES_CH5 = ["/etc/passwd", "/etc/shadow", "/etc/group", "/etc/gshadow", "/etc/sudoers", "/etc/ssh/sshd_config"];
function supprimablesCh5(){
	(function parcourir(lieu, chemin){
		lieu.items.forEach(function(it){
			var c = chemin + "/" + it.itemname;
			if (INTOUCHABLES_CH5.indexOf(c) > -1){ it.protege = true; return; }
			if (!it.allows("sudo-rm")) it.addValidCmd("sudo-rm");
		});
		lieu.children.forEach(function(r){ parcourir(r, chemin + "/" + r.room_name); });
	})(ServeurBastion, "");
}
function declarerMondeBastion(){
	if (BASTION_DECLARE || !estMonBastion()) return;
	BASTION_DECLARE = true;
	// Les textes d'origine sans le saut de ligne final : c'est ainsi que les fichiers sont posés (poserFichierHote), debsums compare juste.
	function paquet(nom, def){
		var d = {}, k;
		for (k in def) d[k] = def[k];
		d.poser = false;
		d.fichiers = {};
		for (k in (def.fichiers || {})) d.fichiers[k] = String(def.fichiers[k]).replace(/\n$/, "");
		declarerPaquet(H5, nom, d);
	}
	paquet("openssh-server", { version: "1:9.2p1-2+deb12u3", description: "secure shell (SSH) server, for secure access from remote machines", services: ["ssh"],
		fichiers: { "/usr/sbin/sshd": "ELF sshd 9.2p1\n", "/etc/ssh/moduli": "# Time Type Tests Tries Size Generator Modulus\n" }, conffiles: ["/etc/ssh/moduli"], taille: 1923 });
	paquet("coreutils", { version: "9.1-1", description: "GNU core utilities", fichiers: { "/usr/bin/ls": "ELF ls 9.1\n", "/usr/bin/cat": "ELF cat 9.1\n", "/usr/bin/id": "ELF id 9.1\n" }, taille: 18062, priorite: "required", section: "utils" });
	paquet("procps", { version: "2:4.0.2-3", description: "/proc file system utilities", fichiers: { "/usr/bin/ps": "ELF ps 4.0.2\n", "/usr/bin/top": "ELF top 4.0.2\n" }, taille: 2389, priorite: "important", section: "admin" });
	paquet("sudo", { version: "1.9.13p3-1+deb12u1", disponible: "1.9.13p3-1+deb12u2", description: "Provide limited super user privileges to specific users", fichiers: { "/usr/bin/sudo": "ELF sudo 1.9.13p3 u1\n" }, taille: 6550 });
	paquet("apache2", { version: "2.4.62-1~deb12u1", disponible: "2.4.62-1~deb12u2", description: "Apache HTTP Server", services: ["apache2"], fichiers: { "/usr/sbin/apache2": "ELF apache2 2.4.62\n" }, taille: 563, section: "httpd" });
	paquet("openssl", { version: "3.0.15-1~deb12u1", disponible: "3.0.15-1~deb12u2", description: "Secure Sockets Layer toolkit - cryptographic utility", fichiers: {}, taille: 2306, section: "utils" });
	paquet("telnetd", { version: "0.17+2.4-2+deb12u1", description: "basic telnet server", services: ["telnet.socket"],
		fichiers: { "/usr/sbin/in.telnetd": "ELF in.telnetd\n", "/etc/default/telnetd": "# telnetd (inetd) options\nOPTIONS=", "/lib/systemd/system/telnet.socket": UNITES_CH5["telnet.socket"] }, taille: 123, section: "net" });
	paquet("rpcbind", { version: "1.2.6-6+b1", description: "converts RPC program numbers into universal addresses", services: ["rpcbind"], fichiers: { "/usr/sbin/rpcbind": "ELF rpcbind 1.2.6\n", "/lib/systemd/system/rpcbind.service": UNITES_CH5["rpcbind.service"] }, taille: 120, section: "net" });
	paquet("avahi-daemon", { version: "0.8-10+deb12u1", description: "Avahi mDNS/DNS-SD daemon", services: ["avahi-daemon"], fichiers: { "/usr/sbin/avahi-daemon": "ELF avahi-daemon 0.8\n", "/lib/systemd/system/avahi-daemon.service": UNITES_CH5["avahi-daemon.service"] }, taille: 245, section: "net" });
	paquet("aide", { version: "0.18.3-1+deb12u3", description: "Advanced Intrusion Detection Environment - dynamic binary", fichiers: { "/usr/bin/aide": "ELF aide 0.18.3\n" }, taille: 300, section: "admin" });
	paquet("unattended-upgrades", { version: "2.9.1+nmu3", description: "automatic installation of security upgrades", installe: false,
		fichiers: { "/usr/bin/unattended-upgrade": "#!/usr/bin/python3\n# unattended-upgrade\n", "/etc/apt/apt.conf.d/50unattended-upgrades": "// Automatically upgrade packages from these origin patterns\nUnattended-Upgrade::Origins-Pattern {\n\t\"origin=Debian,codename=${distro_codename},label=Debian-Security\";\n};\n" }, taille: 280 });
	paquet("etckeeper", { version: "1.18.20-1", description: "store /etc in git, mercurial, brz or darcs", fichiers: { "/usr/bin/etckeeper": "#!/bin/sh\n" }, taille: 220 });
	paquet("fail2ban", { version: "1.0.2-2", description: "ban hosts that cause multiple authentication errors", services: ["fail2ban"], fichiers: {}, taille: 2129, section: "net" });
	paquet("auditd", { version: "1:3.0.9-1", description: "User space tools for security auditing", services: ["auditd"], fichiers: {}, taille: 718 });
	paquet("chrony", { version: "4.3-2+deb12u1", description: "Versatile implementation of the Network Time Protocol", services: ["chrony"], fichiers: {}, taille: 680, section: "net" });
	paquet("apparmor", { version: "3.0.8-3", description: "user-space parser utility for AppArmor", fichiers: {}, taille: 2675 });
	paquet("lynis", { version: "3.0.8-1.1", description: "security auditing tool for Unix based systems", fichiers: {}, taille: 1638 });
	paquet("rkhunter", { version: "1.4.6-11", description: "rootkit, backdoor, sniffer and exploit scanner", fichiers: {}, taille: 690 });
	paquet("ufw", { version: "0.36.2-1", description: "program for managing a Netfilter firewall", fichiers: {}, taille: 856 });
	paquet("nftables", { version: "1.0.6-2+deb12u2", description: "Program to control packet filtering rules by Netfilter project", services: ["nftables"], fichiers: {}, taille: 182 });
	declarerUnite(H5, "systemd-journald.service", { actif: true, enabled: true, description: "Journal Service" });
	declarerEcoute(H5, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }, { proto: "tcp", adresse: "::", port: 22 }]);
	declarerEcoute(H5, "apache2", [{ proto: "tcp", adresse: "*", port: 80 }, { proto: "tcp", adresse: "*", port: 443 }]);
	declarerEcoute(H5, "telnet.socket", [{ proto: "tcp", adresse: "::", port: 23 }]);
	declarerEcoute(H5, "rpcbind", [{ proto: "tcp", adresse: "0.0.0.0", port: 111, utilisateur: "_rpc" }, { proto: "udp", adresse: "0.0.0.0", port: 111, utilisateur: "_rpc" }]);
	declarerEcoute(H5, "avahi-daemon", [{ proto: "udp", adresse: "0.0.0.0", port: 5353, utilisateur: "avahi" }]);
	declarerEcoute(H5, "chrony", [{ proto: "udp", adresse: "127.0.0.1", port: 323, utilisateur: "_chrony" }]);
	var t = maintenantBastion();
	declarerConnexions(H5, [{ qui: JOUEUR, tty: "pts/0", depuis: "10.0.92.1", quand: t - 600000, fin: "still" },
		{ qui: "vint", tty: "pts/1", depuis: IP_VINT, quand: t - 2 * 86400000, fin: t - 2 * 86400000 + 5400000 },
		{ qui: "secretariat", tty: "pts/2", depuis: IP_SECRETARIAT, quand: t - 86400000, fin: t - 86400000 + 1200000 },
		{ qui: "stagiaire", tty: "pts/1", depuis: "10.0.92.47", quand: t - 240 * 86400000, fin: t - 240 * 86400000 + 1800000 },
		{ qui: "root", tty: "tty1", depuis: "", quand: t - 3 * 86400000, fin: t - 3 * 86400000 + 600000 }]);
	declarerMotDePasse(H5, "vint", "Vacances-Bretagne-2026");
	declarerNoyau(H5, { version: "6.1.0-28-amd64" });
}

/* ------------------------------------------------------------------ */
/* L'horloge de la nuit : 22 h, trois minutes par commande, l'aube à 6 h */
/* ------------------------------------------------------------------ */

function heureCh5(){
	var total = 22 * 60 + sCh5().horloge;
	return deuxChiffres(Math.floor(total / 60) % 24) + ":" + deuxChiffres(total % 60);
}
function minutesAvantAube(){ return AUBE_CH5 - sCh5().horloge; }
function baseNuitCh5(){
	var d = new Date();
	d.setHours(22, 0, 0, 0);
	return d.getTime();
}
/* L'heure du jeu pour les sorts du Bastion (journaux, faillock, lynis, audit) : celle de la nuit, une fois le chapitre ouvert. */
var MAINTENANT_AVANT_CH5 = maintenantBastion;
maintenantBastion = function(){
	if (typeof state !== "undefined" && state && state.has && state.has("ch5Ouvert") && state.ch5 && state.ch5.base) return state.ch5.base + state.ch5.horloge * 60000;
	return MAINTENANT_AVANT_CH5();
};
definirHorlogeGuet(function(){ return new Date(maintenantBastion()); });

function avancerHorlogeCh5(){
	var c = sCh5();
	if (!state.quests["h_entree"]) return;
	if (c.dernierNb === null || c.dernierNb === undefined) c.dernierNb = state.nbCommandes;
	if (state.nbCommandes > c.dernierNb){
		c.horloge += (state.nbCommandes - c.dernierNb) * PAS_HORLOGE_CH5;
		c.dernierNb = state.nbCommandes;
	}
	// Grace égrène l'heure, à chaque heure pleine.
	var heure = Math.floor((22 * 60 + c.horloge) / 60);
	if (c.heureAnnoncee === undefined || c.heureAnnoncee === null) c.heureAnnoncee = heure;
	if (heure > c.heureAnnoncee){
		c.heureAnnoncee = heure;
		if (!state.has("rejeuEnCours") && !c.assaut && heure % 24 !== 6) say(C.gris("(Radio : « Grace : il est " + (heure % 24 === 0 ? "minuit" : (heure % 24) + " h") + ". " +
			(heure % 24 === 5 ? "L'aube dans une heure. »)" : (heure % 24 === 4 ? "L'heure du défi de Laurent est passée. L'aube à 6 h. »)" : "L'aube à 6 h. »)"))));
	}
}

/* ------------------------------------------------------------------ */
/* Les outils de lecture de l'état réel                                */
/* ------------------------------------------------------------------ */

function controleLynisOk(id){
	var c = CONTROLES_LYNIS.filter(function(x){ return x.id === id; })[0];
	if (!c) return null;
	var r;
	try { r = c.verifier(H5); } catch (e){ return null; }
	if (r && typeof r === "object") r = r.ok;
	return r === null || r === undefined ? null : !!r;
}
function comptesCh5(){ return comptesHote(H5); }
function shellNul(sh){ return ["/usr/sbin/nologin", "/sbin/nologin", "/bin/false", "/usr/bin/false", "/bin/sync"].indexOf(sh) > -1; }
function mdpUtilisable(m){ return m !== undefined && m !== null && m !== "" && m.charAt(0) !== "!" && m.charAt(0) !== "*"; }
/* Une empreinte des fichiers d'un dossier (récursif), pour savoir si une configuration testée est bien celle qu'on recharge. */
function signatureDossier(chemin){
	var d = dossierHote(H5, chemin);
	if (!d) return "";
	var morceaux = [];
	(function lire(l, p, n){
		if (n > 8) return;
		l.items.slice().sort(function(a, b){ return a.itemname < b.itemname ? -1 : 1; }).forEach(function(it){ morceaux.push(p + "/" + it.itemname + "=" + (it.lien ? "->" + it.lien : it.getText())); });
		l.children.forEach(function(c){ if (c.parents[0] === l) lire(c, p + "/" + c.room_name, n + 1); });
	})(d, chemin, 0);
	return md5(morceaux.join("\n"));
}
function membresDe(groupe){
	var c = comptesCh5();
	var g = (c.group || []).filter(function(x){ return x.nom === groupe; })[0];
	return g ? g.membres : [];
}

/* ------------------------------------------------------------------ */
/* sudo tee : écrire un fichier de root depuis un tuyau                */
/* ------------------------------------------------------------------ */

/* Sous Linux, « sudo echo x > /etc/f » échoue (c'est le shell du joueur qui ouvre le fichier), mais
   « echo x | sudo tee /etc/f » marche : tee lui-même tourne en root. Sur le Bastion, tee le permet. */
var TEE_AVANT_CH5 = Shell.sorts.tee;
Shell.sorts.tee = function(args, io){
	if (!io.sudo || Shell.hote() !== H5 || !bastionOuvert()) return TEE_AVANT_CH5.apply(this, arguments);
	var p = lireOptionsGNU(args, "tee", "ai", "", { "append": "a", "ignore-interrupts": "i" });
	var texte = io.stdin === null || io.stdin === undefined ? "" : io.stdin;
	p.reste.forEach(function(nom){
		if (nom === "/dev/null") return;
		var r = Shell.chercher(nom, io, "tee");
		if (r.node instanceof Room) throw new ShellError("tee: " + nom + ": Is a directory");
		var propre = String(texte).replace(/\n$/, "");
		if (r.node === null){
			if (!r.dir) throw new ShellError("tee: " + nom + ": No such file or directory");
			Shell.nomValide(r.name, "tee");
			var item = new Item(r.name, propre, "item_sign.gif");
			item.owner = "root";
			item.mode = "rw-r--r--";
			r.dir.addItem(item);
			GameEvents.fire({ type: "write", item: item, room: r.dir, append: false, text: texte, created: true, previous: "" });
			return;
		}
		if (r.node.immuable) Shell.verifierImmuable(r.node, "tee");
		var ancien = r.node.getText();
		r.node.setText(p.opts.a ? (ancien === "" ? propre : ancien.replace(/\n$/, "") + "\n" + propre) : propre);
		GameEvents.fire({ type: "write", item: r.node, room: r.dir, append: !!p.opts.a, text: texte, created: false, previous: ancien });
	});
	GameEvents.fire({ type: "tee", files: p.reste, append: !!p.opts.a, sudo: true });
	return texte;
};

/* ------------------------------------------------------------------ */
/* Le pare-feu du Bastion : ufw et nftables                            */
/* ------------------------------------------------------------------ */

function pfCh5(){
	var c = sCh5();
	if (!c.pf || typeof c.pf !== "object") c.pf = { ufw: { actif: false, entree: "allow", sortie: "allow", routage: "disabled", journal: "off", regles: [{ action: "allow", port: 80, proto: "tcp", de: "any" }] }, nft: null };
	return c.pf;
}
var PORTS_SERVICES_UFW = { ssh: [22, "tcp"], http: [80, "tcp"], https: [443, "tcp"], telnet: [23, "tcp"], OpenSSH: [22, "tcp"], "WWW Full": [443, "tcp"], WWW: [80, "tcp"], "WWW Secure": [443, "tcp"], ntp: [123, "udp"] };
function texteRegleUfw(r){ return (r.port ? r.port + (r.proto ? "/" + r.proto : "") : "Anywhere"); }
function ufwOuvre(port, proto){
	var u = pfCh5().ufw;
	var regles = u.regles.filter(function(r){ return (!r.port || r.port === port) && (!r.proto || r.proto === (proto || "tcp")) && (!r.de || r.de === "any"); });
	if (regles.length) return regles[0].action === "allow" || regles[0].action === "limit";
	return u.entree === "allow";
}
/* nftables : la table chargée (nft -f), lue simplement : la politique de la chaîne input et les ports acceptés. */
function lireNftCh5(texte){
	var t = String(texte || "");
	var ouv = (t.match(/\{/g) || []).length, fer = (t.match(/\}/g) || []).length;
	if (ouv !== fer) return { erreur: "Error: syntax error, unexpected end of file" };
	if (!/\btable\s+(inet|ip|ip6)\s+\S+\s*\{/.test(t) && t.replace(/#.*$/gm, "").trim() !== "" && !/^\s*flush ruleset\s*$/m.test(t)) return { erreur: "Error: syntax error, unexpected newline" };
	var m = /chain\s+input\s*\{([\s\S]*?)\n\s*\}/.exec(t);
	if (!m) return { politique: "accept", ports: [], vide: !/\btable\b/.test(t) };
	var corps = m[1], pol = /policy\s+(drop|accept|reject)\s*;/.exec(corps);
	var ports = [];
	var re = /tcp\s+dport\s+(\{[^}]*\}|\d+)\s+(?:ct\s+state\s+new\s+)?accept/g, x;
	while ((x = re.exec(corps))){
		x[1].replace(/[{}]/g, "").split(",").forEach(function(p){ p = p.trim(); if (/^\d+$/.test(p) && ports.indexOf(+p) === -1) ports.push(+p); if (p === "ssh") ports.push(22); if (p === "https") ports.push(443); if (p === "http") ports.push(80); });
	}
	return { politique: pol ? pol[1] : "accept", ports: ports, etabli: /ct\s+state\s+(\{\s*)?established/.test(corps), lo: /iif(name)?\s+"?lo"?\s+accept/.test(corps) };
}
function nftActifCh5(){ var n = pfCh5().nft; return !!(n && n.politique && n.politique !== "accept"); }
/* Le pare-feu filtre-t-il l'entrée ? Et tel port, depuis l'extérieur, passe-t-il ? */
function parefeuCh5(){
	var pf = pfCh5(), u = pf.ufw;
	var ufwFiltre = u.actif && u.entree !== "allow";
	return { actif: u.actif || nftActifCh5(), filtre: ufwFiltre || nftActifCh5(), ufw: u.actif, nft: nftActifCh5() };
}
function portOuvertCh5(port, proto){
	var pf = pfCh5();
	if (pf.ufw.actif && !ufwOuvre(port, proto)) return false;
	if (nftActifCh5() && (proto || "tcp") === "tcp" && pf.nft.ports.indexOf(port) === -1) return false;
	return true;
}
/* Les ports TCP qui répondent depuis l'extérieur : un service écoute ET le pare-feu laisse passer. */
function portsJoignablesCh5(){
	var vus = {};
	ecoutesHote(H5).forEach(function(e){
		if (e.etat !== "LISTEN" || e.proto !== "tcp" || /^127\./.test(e.adresse)) return;
		if (portOuvertCh5(e.port, "tcp")) vus[e.port] = true;
	});
	return Object.keys(vus).map(Number).sort(function(a, b){ return a - b; });
}
/* Les règles écrites sur le disque, comme le ferait ufw. */
function ecrireUfwCh5(){
	var u = pfCh5().ufw;
	var conf = F5("/etc/ufw/ufw.conf"), def = F5("/etc/default/ufw"), regles = F5("/etc/ufw/user.rules");
	if (conf) conf.setText(conf.getText().replace(/^ENABLED=.*$/m, "ENABLED=" + (u.actif ? "yes" : "no")).replace(/^LOGLEVEL=.*$/m, "LOGLEVEL=" + (u.journal === "off" ? "off" : u.journal)));
	if (def) def.setText(def.getText().replace(/^DEFAULT_INPUT_POLICY=.*$/m, "DEFAULT_INPUT_POLICY=\"" + { allow: "ACCEPT", deny: "DROP", reject: "REJECT" }[u.entree] + "\"")
		.replace(/^DEFAULT_OUTPUT_POLICY=.*$/m, "DEFAULT_OUTPUT_POLICY=\"" + { allow: "ACCEPT", deny: "DROP", reject: "REJECT" }[u.sortie] + "\""));
	if (regles) regles.setText("*filter\n:ufw-user-input - [0:0]\n### RULES ###\n\n" + u.regles.map(function(r){
		return "### tuple ### " + r.action + " " + (r.proto || "any") + " " + (r.port || "any") + " 0.0.0.0/0 any " + (r.de === "any" || !r.de ? "0.0.0.0/0" : r.de) + " in\n" +
			"-A ufw-user-input " + (r.de && r.de !== "any" ? "-s " + r.de + " " : "") + (r.proto ? "-p " + r.proto + " " : "") + (r.port ? "--dport " + r.port + " " : "") + "-j " + { allow: "ACCEPT", deny: "DROP", reject: "REJECT", limit: "ACCEPT" }[r.action] + "\n";
	}).join("\n") + "\n### END RULES ###\nCOMMIT\n");
}
function lireRegleUfw(mots){
	// allow 22 | allow 22/tcp | allow ssh | allow from IP [to any port N [proto P]] | allow proto tcp from any to any port 22 | allow in 22/tcp
	var m = mots.slice();
	if (m[0] === "in") m.shift();
	if (m[0] === "out") return { erreur: "ERROR: ici, seules les règles d'entrée (in) comptent : le Bastion filtre ce qui arrive." };
	var r = { port: null, proto: null, de: "any" };
	var texte = m.join(" ");
	var x;
	if ((x = /^(\d+)(?:\/(tcp|udp))?$/.exec(texte))){ r.port = +x[1]; r.proto = x[2] || null; return r; }
	if (PORTS_SERVICES_UFW[texte]){ r.port = PORTS_SERVICES_UFW[texte][0]; r.proto = PORTS_SERVICES_UFW[texte][1]; r.service = texte; return r; }
	if ((x = /^(?:proto\s+(tcp|udp)\s+)?from\s+(\S+)(?:\s+to\s+(?:any|\S+))?(?:\s+port\s+(\d+))?(?:\s+proto\s+(tcp|udp))?$/.exec(texte))){
		r.de = x[2] === "any" ? "any" : x[2]; r.port = x[3] ? +x[3] : null; r.proto = x[1] || x[4] || null;
		if (r.de !== "any" && !/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(r.de)) return { erreur: "ERROR: Bad source address" };
		return r;
	}
	return { erreur: "ERROR: Wrong number of arguments" };
}
function memeRegleUfw(a, b){ return a.action === b.action && a.port === b.port && (a.proto || null) === (b.proto || null) && (a.de || "any") === (b.de || "any"); }
function tableUfw(numerote){
	var u = pfCh5().ufw, lignes = ["", "     To                         Action      From", "     --                         ------      ----"];
	if (numerote) lignes = ["", "     To                         Action      From", "     --                         ------      ----"];
	var n = 0;
	u.regles.forEach(function(r){
		n++;
		var vers = texteRegleUfw(r) + (r.service && r.service === "OpenSSH" ? "" : "");
		lignes.push((numerote ? "[" + completerGauche(n, 2) + "] " : "     ") + completerDroite(vers, 27) + completerDroite(r.action.toUpperCase() + " IN", 12) + (r.de === "any" || !r.de ? "Anywhere" : r.de));
	});
	u.regles.forEach(function(r){
		if (r.de && r.de !== "any") return;
		n++;
		lignes.push((numerote ? "[" + completerGauche(n, 2) + "] " : "     ") + completerDroite(texteRegleUfw(r) + " (v6)", 27) + completerDroite(r.action.toUpperCase() + " IN", 12) + "Anywhere (v6)");
	});
	return lignes;
}
var UFW_AVANT_CH5 = Shell.sorts.ufw;
Shell.sorts.ufw = function(args, io){
	if (Shell.hote() !== H5 || !bastionOuvert()) return UFW_AVANT_CH5.apply(this, arguments);
	if (args[0] === "--version" || args[0] === "version") return "ufw 0.36.2";
	if (!io.sudo) throw new ShellError("ERROR: You need to be root to run this script" + astuce(io, "Le pare-feu se règle en root : sudo ufw ..."));
	var u = pfCh5().ufw, action = args[0] || "status", mots = args.slice(1), sortie;
	if (action === "status"){
		GameEvents.fire({ type: "ufwBastion", action: "status", option: mots[0] || "", actif: u.actif });
		if (!u.actif) return "Status: inactive";
		var l = ["Status: active"];
		if (mots[0] === "verbose"){
			l.push("Logging: " + (u.journal === "off" ? "off" : "on (" + u.journal + ")"), "Default: " + { allow: "allow", deny: "deny", reject: "reject" }[u.entree] + " (incoming), " + u.sortie + " (outgoing), " + u.routage + " (routed)", "New profiles: skip");
		}
		if (u.regles.length) l = l.concat(tableUfw(mots[0] === "numbered"));
		return l.join("\n");
	}
	if (action === "enable"){
		var avert = "";
		if (u.entree !== "allow" && !ufwOuvre(22, "tcp")) avert = "Command may disrupt existing ssh connections. Proceed with operation (y|n)? y\n";
		u.actif = true;
		ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "enable" });
		return avert + "Firewall is active and enabled on system startup" + (avert ? astuce(io, "Attention : le port 22 n'est pas ouvert. Ta session tient (les connexions établies passent), mais plus personne n'entrera par ssh : sudo ufw allow 22/tcp.") : "");
	}
	if (action === "disable"){ u.actif = false; ecrireUfwCh5(); GameEvents.fire({ type: "ufwBastion", action: "disable" }); return "Firewall stopped and disabled on system startup"; }
	if (action === "reload"){ GameEvents.fire({ type: "ufwBastion", action: "reload" }); return u.actif ? "Firewall reloaded" : "Firewall not enabled (skipping reload)"; }
	if (action === "reset"){
		u.actif = false; u.entree = "deny"; u.sortie = "allow"; u.regles = []; u.journal = "low";
		ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "reset" });
		return "Resetting all rules to installed defaults. Proceed with operation (y|n)? y\nBacking up 'user.rules' to '/etc/ufw/user.rules.20261016_220000'";
	}
	if (action === "logging"){
		var niv = { on: "low", off: "off", low: "low", medium: "medium", high: "high", full: "full" }[mots[0]];
		if (!niv) throw new ShellError("ERROR: Invalid log level '" + (mots[0] || "") + "'");
		u.journal = niv; ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "logging", niveau: niv });
		return niv === "off" ? "Logging disabled" : "Logging enabled";
	}
	if (action === "default"){
		var pol = mots[0], sens = mots[1] || "incoming";
		if (["allow", "deny", "reject"].indexOf(pol) === -1) throw new ShellError("ERROR: Unsupported policy '" + (pol || "") + "'");
		if (["incoming", "outgoing", "routed"].indexOf(sens) === -1) throw new ShellError("ERROR: Unsupported direction '" + sens + "'");
		if (sens === "incoming") u.entree = pol; else if (sens === "outgoing") u.sortie = pol; else u.routage = pol;
		ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "default", politique: pol, sens: sens });
		return "Default " + sens + " policy changed to '" + pol + "'\n(be sure to update your rules accordingly)";
	}
	if (action === "app"){
		if (mots[0] === "list") return "Available applications:\n  OpenSSH\n  WWW\n  WWW Full\n  WWW Secure";
		throw new ShellError("ERROR: Invalid command 'app " + (mots[0] || "") + "'");
	}
	if (action === "show"){
		return "Added user rules (see 'ufw status' for running firewall):\n" + u.regles.map(function(r){ return "ufw " + r.action + " " + (r.de && r.de !== "any" ? "from " + r.de + (r.port ? " to any port " + r.port : "") : texteRegleUfw(r)); }).join("\n");
	}
	var position = null;
	if (action === "insert"){
		position = parseInt(mots[0], 10);
		if (isNaN(position) || position < 1 || position > u.regles.length + 1) throw new ShellError("ERROR: Invalid position '" + (mots[0] || "") + "'");
		action = mots[1]; mots = mots.slice(2);
	}
	if (action === "delete"){
		if (/^\d+$/.test(mots[0] || "")){
			var n = +mots[0];
			if (n < 1 || n > u.regles.length) throw new ShellError("ERROR: Could not find rule '" + mots[0] + "'");
			var retiree = u.regles.splice(n - 1, 1)[0];
			ecrireUfwCh5();
			GameEvents.fire({ type: "ufwBastion", action: "delete", regle: retiree });
			return "Deleting:\n " + retiree.action + " " + texteRegleUfw(retiree) + "\nProceed with operation (y|n)? y\nRule deleted";
		}
		var act = mots[0], spec = lireRegleUfw(mots.slice(1));
		if (spec.erreur || ["allow", "deny", "reject", "limit"].indexOf(act) === -1) throw new ShellError(spec.erreur || "ERROR: Invalid syntax");
		spec.action = act;
		var avant = u.regles.length;
		u.regles = u.regles.filter(function(r){ return !memeRegleUfw(r, spec); });
		if (u.regles.length === avant) return "Could not delete non-existent rule\nCould not delete non-existent rule (v6)";
		ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "delete", regle: spec });
		return "Rule deleted\nRule deleted (v6)";
	}
	if (["allow", "deny", "reject", "limit"].indexOf(action) > -1){
		var r = lireRegleUfw(mots);
		if (r.erreur) throw new ShellError(r.erreur + astuce(io, "Exemples : sudo ufw allow 22/tcp, sudo ufw allow 443/tcp, sudo ufw deny 23, sudo ufw allow from 10.0.92.1 to any port 22"));
		r.action = action;
		if (u.regles.some(function(x){ return memeRegleUfw(x, r); })) return "Skipping adding existing rule\nSkipping adding existing rule (v6)";
		// Une règle contraire sur le même port remplace l'ancienne (comme ufw : une règle par port et source).
		u.regles = u.regles.filter(function(x){ return !(x.port === r.port && (x.proto || null) === (r.proto || null) && (x.de || "any") === (r.de || "any")); });
		if (position !== null) u.regles.splice(position - 1, 0, r); else u.regles.push(r);
		delete r.service;
		ecrireUfwCh5();
		GameEvents.fire({ type: "ufwBastion", action: "regle", regle: r });
		sortie = position !== null ? "Rule inserted" : "Rule added";
		return sortie + (r.de && r.de !== "any" ? "" : "\n" + sortie + " (v6)");
	}
	throw new ShellError("ERROR: Invalid syntax\n\nUsage: ufw COMMAND\n\nCommands:\n enable  disable  reload  reset  status [verbose|numbered]  logging LEVEL\n default ARG  allow ARGS  deny ARGS  reject ARGS  limit ARGS  delete RULE|NUM  insert NUM RULE  app list  show added");
};

var NFT_AVANT_CH5 = Shell.sorts.nft;
Shell.sorts.nft = function(args, io){
	if (Shell.hote() !== H5 || !bastionOuvert()) return NFT_AVANT_CH5.apply(this, arguments);
	if (args[0] === "--version" || args[0] === "-v") return "nftables v1.0.6 (Lester Gooch #5)";
	if (!io.sudo) throw new ShellError("Error: Could not process rule: Operation not permitted" + astuce(io, "sudo nft ..."));
	var pf = pfCh5(), phrase = args.join(" ");
	if (args[0] === "-f" || args[0] === "--file"){
		var chemin = args[1];
		if (!chemin) throw new ShellError("nft: option requires an argument -- 'f'");
		var r = Shell.chercher(chemin, io, "nft");
		if (!(r.node instanceof Item)) throw new ShellError("Error: Could not process rule: No such file or directory\ninclude \"" + chemin + "\"");
		var lu = lireNftCh5(r.node.getText());
		if (lu.erreur) throw new ShellError(chemin + ":1:1-1: " + lu.erreur);
		pf.nft = lu.vide ? null : { politique: lu.politique, ports: lu.ports, texte: r.node.getText().replace(/^#!.*\n/, "").replace(/^\s*flush ruleset\s*\n/m, "").trim(), etabli: lu.etabli, lo: lu.lo };
		GameEvents.fire({ type: "nftBastion", action: "charge", politique: lu.politique, ports: lu.ports });
		return "";
	}
	if (/^flush ruleset$/.test(phrase)){ pf.nft = null; GameEvents.fire({ type: "nftBastion", action: "flush" }); return ""; }
	if (/^list\s+(ruleset|tables)$/.test(phrase)){
		GameEvents.fire({ type: "nftBastion", action: "list", charge: !!pf.nft, ufw: pf.ufw.actif });
		var l = [];
		if (pf.nft) l.push(pf.nft.texte);
		if (pf.ufw.actif){
			var ports = pf.ufw.regles.filter(function(x){ return x.action === "allow" || x.action === "limit"; });
			l.push("table ip filter {\n\tchain ufw-user-input {\n" + ports.map(function(x){ return "\t\t" + (x.de && x.de !== "any" ? "ip saddr " + x.de + " " : "") + (x.port ? (x.proto || "tcp") + " dport " + x.port + " " : "") + "counter packets 0 bytes 0 accept"; }).join("\n") +
				"\n\t}\n\tchain INPUT {\n\t\ttype filter hook input priority filter; policy " + (pf.ufw.entree === "allow" ? "accept" : "drop") + ";\n\t\tcounter packets 0 bytes 0 jump ufw-user-input\n\t}\n}");
		}
		if (/tables/.test(phrase)) return [pf.nft ? (/table\s+(\S+\s+\S+)/.exec(pf.nft.texte) || [null, "inet filter"])[1] : null, pf.ufw.actif ? "ip filter" : null].filter(Boolean).map(function(t){ return "table " + t; }).join("\n");
		return l.join("\n") + (io.tty ? astuce(io, l.length ? "La loi du pare-feu telle que le noyau l'applique (nftables)." : "Aucune règle chargée : rien ne filtre l'entrée.") : "");
	}
	throw new ShellError("Error: syntax error, unexpected newline" + astuce(io, "Sur le Bastion : sudo nft list ruleset, sudo nft -f /etc/nftables.conf, sudo nft flush ruleset"));
};
/* systemctl start/restart/reload nftables : la table de /etc/nftables.conf est chargée. */
GameEvents.addListener("systemctl", function(e){
	if (!bastionOuvert() || e.host !== H5 || !/^nftables/.test(e.service || "")) return;
	var pf = pfCh5();
	if (["start", "restart", "reload"].indexOf(e.action) > -1 || (e.action === "enable" && e.now)){
		var lu = lireNftCh5(T5("/etc/nftables.conf"));
		if (!lu.erreur) pf.nft = lu.vide ? null : { politique: lu.politique, ports: lu.ports, texte: String(T5("/etc/nftables.conf")).replace(/^#!.*\n/, "").replace(/^\s*flush ruleset\s*\n/m, "").trim(), etabli: lu.etabli, lo: lu.lo };
	}
	if (e.action === "stop" || (e.action === "disable" && e.now)) pf.nft = null;
});

/* Les branchements de la Tour de Guet vers ce chapitre. */
SOURCES_GUET.parefeuActif = function(h){ return h === H5 && estMonBastion() && state && state.has("ch5Ouvert") ? parefeuCh5().filtre : null; };
SOURCES_GUET.portJoignable = function(source, cible, port){ return cible === H5 && source !== H5 && estMonBastion() && state && state.has("ch5Ouvert") ? portOuvertCh5(+port, "tcp") : null; };
SOURCES_GUET.sshEffective = function(h){
	if (h !== H5 || !estMonBastion()) return null;
	var o = configSshEffective(h), bas = {};
	Object.keys(o).forEach(function(k){ bas[k.toLowerCase()] = Array.isArray(o[k]) ? o[k].join(" ") : o[k]; });
	return bas;
};
SOURCES_GUET.uniteMasquee = function(h, u){ if (h !== H5 || !estMonBastion()) return null; try { return !!etatUnite(h, u).masque; } catch (e){ return null; } };
SOURCES_GUET.paquetsEnRetard = function(h){ return h === H5 && estMonBastion() && state && state.has("ch5Ouvert") ? aMettreAJour(h).length : null; };
SOURCES_GUET.aideBase = function(h){ return h === H5 && estMonBastion() ? !!baseAideCh5() : null; };

/* ------------------------------------------------------------------ */
/* La Pierre d'Inspection : les contrôles propres au Bastion           */
/* ------------------------------------------------------------------ */

/* Ce qu'un Debian installé par défaut fait déjà bien (la Pierre le reconnaît : le score de départ tourne autour de 38).
   Ces contrôles ne s'appliquent qu'à notre machine (null ailleurs : non applicable). */
(function(){
	function B(id, section, libelle, poids, conseil, test){
		declarerControleLynis({ id: id, section: section, libelle: libelle, poids: poids, gravite: "suggestion", conseil: conseil,
			verifier: function(h){ if (h !== H5 || !estMonBastion()) return null; try { return !!test(); } catch (e){ return false; } } });
	}
	function modeAuPlus(chemin, motif){ var f = F5(chemin); return !!f && f.owner === "root" && motif.test(f.mode); }
	B("BAST-1001", "File Permissions", "Checking permissions of /etc/passwd", 5, "Keep /etc/passwd at 644 root:root", function(){ return modeAuPlus("/etc/passwd", /^rw-r--r--$|^rw-------$|^r--r--r--$/); });
	B("BAST-1002", "File Permissions", "Checking permissions of /etc/group", 3, "Keep /etc/group at 644 root:root", function(){ return modeAuPlus("/etc/group", /^rw-r--r--$|^rw-------$|^r--r--r--$/); });
	B("BAST-1003", "File Permissions", "Checking permissions of root home directory", 3, "Keep /root at 700", function(){ var d = dossierHote(H5, "/root"); return !!d && d.mode === "rwx------"; });
	B("BAST-1004", "File Permissions", "Checking permissions of /etc/sudoers", 4, "Keep /etc/sudoers at 0440", function(){ return modeAuPlus("/etc/sudoers", /^r--r-----$/); });
	B("BAST-1005", "Users, Groups and Authentication", "Checking home directories permissions", 3, "Home directories should not be readable by others", function(){
		var d = dossierHote(H5, "/home"); return !!d && d.children.every(function(c){ return /---$/.test(c.mode); });
	});
	B("BAST-1006", "Boot and services", "Checking permissions of GRUB configuration", 3, "/boot/grub/grub.cfg must not be writable by others", function(){ var f = F5("/boot/grub/grub.cfg"); return !!f && f.mode.charAt(7) !== "w" && f.mode.charAt(4) !== "w"; });
	B("BAST-1007", "Cryptography", "Checking encrypted root volume (LUKS)", 5, "Encrypt the root volume (LUKS)", function(){ return lignesConf(T5("/etc/crypttab") || "").length > 0; });
	B("BAST-1008", "Users, Groups and Authentication", "Checking sudo secure_path", 3, "Set Defaults secure_path in /etc/sudoers", function(){ return /^\s*Defaults\s+secure_path\s*=/m.test(T5("/etc/sudoers") || ""); });
	B("BAST-1009", "Users, Groups and Authentication", "Checking sudo use_pty", 2, "Set Defaults use_pty in /etc/sudoers", function(){ return /^\s*Defaults\s+use_pty\b/m.test(T5("/etc/sudoers") || ""); });
	B("BAST-1010", "SSH Support", "Checking SSH option StrictModes", 2, "Keep StrictModes yes", function(){ return /^yes$/i.test(configSshEffective(H5).strictmodes || "yes"); });
	B("BAST-1011", "SSH Support", "Checking SSH option UsePAM", 2, "Keep UsePAM yes", function(){ return /^yes$/i.test(configSshEffective(H5).usepam || ""); });
	B("BAST-1012", "Users, Groups and Authentication", "Checking password hashing method", 3, "Use ENCRYPT_METHOD YESCRYPT or SHA512 in /etc/login.defs", function(){ return /^(YESCRYPT|SHA512)$/.test(loginDefs(H5).ENCRYPT_METHOD || ""); });
	B("BAST-1013", "Users, Groups and Authentication", "Checking password hashes in /etc/shadow", 3, "Replace weak password hashes (DES, MD5)", function(){
		var c = comptesCh5(); return (c.shadow || []).every(function(s){ return s.mdp === "" || /^[!*]/.test(s.mdp) || /^\$(y|6|gy|7)\$/.test(s.mdp); });
	});
	B("BAST-1014", "Kernel Hardening", "sysctl key net.ipv4.tcp_syncookies (exp: 1)", 2, "Keep TCP SYN cookies enabled", function(){ return String((etatHote(H5).sysctl || {})["net.ipv4.tcp_syncookies"]) === "1"; });
	B("BAST-1015", "Kernel Hardening", "sysctl key net.ipv4.icmp_echo_ignore_broadcasts (exp: 1)", 2, "Ignore ICMP broadcasts", function(){ return String((etatHote(H5).sysctl || {})["net.ipv4.icmp_echo_ignore_broadcasts"]) === "1"; });
	B("BAST-1016", "Ports and packages", "Checking security repository in APT sources", 3, "Add the security repository to /etc/apt/sources.list", function(){ return /-security/.test(T5("/etc/apt/sources.list") || ""); });
	B("BAST-1017", "Scheduled tasks", "Checking cron daemon", 2, "Keep the cron daemon running", function(){ return serviceActif(H5, "cron"); });
	B("BAST-1018", "Logging and files", "Checking system logger (rsyslog)", 2, "Keep a system logger running", function(){ return serviceActif(H5, "rsyslog"); });
	B("BAST-1019", "Accounting", "Checking permissions of /var/log/audit", 2, "Keep /var/log/audit at 700", function(){ var d = dossierHote(H5, "/var/log/audit"); return !!d && d.mode === "rwx------"; });
	B("BAST-1020", "Cryptography", "Checking permissions of TLS private keys", 3, "TLS private keys must be readable by root only", function(){
		var d = dossierHote(H5, "/etc/ssl/private"); return !!d && d.items.every(function(it){ return /^r[w-]-------$|^r[w-]-r-----$/.test(it.mode); });
	});
})();

/* ------------------------------------------------------------------ */
/* Les Sceaux d'intégrité : AIDE                                       */
/* ------------------------------------------------------------------ */

function reglesAideCh5(texteConf){
	var dans = [], hors = [];
	lignesConf(texteConf || T5("/etc/aide/aide.conf") || "").forEach(function(l){
		var t = l.texte.trim();
		if (/^!\//.test(t)) hors.push(t.substring(1).split(/\s+/)[0]);
		else if (/^\/\S*\s+\S+/.test(t)) dans.push(t.split(/\s+/)[0]);
	});
	return { dans: dans, hors: hors };
}
function empreinteAide(it){ return sha256((it.lien ? "->" + it.lien : it.getText()) + "|" + it.mode + "|" + it.owner + "|" + (it.capacites || "")); }
function inventaireAide(conf){
	var r = reglesAideCh5(conf), entrees = {};
	r.dans.forEach(function(d){
		var lieu = dossierHote(H5, d);
		if (!lieu) return;
		(function parcourir(l, p, n){
			if (n > 10 || r.hors.some(function(h){ return p === h || p.indexOf(h + "/") === 0; })) return;
			l.items.forEach(function(it){ var c = (p === "/" ? "" : p) + "/" + it.itemname; if (!r.hors.some(function(h){ return c === h || c.indexOf(h + "/") === 0; })) entrees[c] = empreinteAide(it); });
			l.children.forEach(function(e){ if (e.parents[0] === l) parcourir(e, (p === "/" ? "" : p) + "/" + e.room_name, n + 1); });
		})(lieu, d, 0);
	});
	return entrees;
}
function texteBaseAide(entrees){
	return "@@begin_db\n# AIDE 0.18.3 database\n@@db_spec name attr sha256\n" + Object.keys(entrees).sort().map(function(c){ return c + " " + entrees[c]; }).join("\n") + "\n@@end_db\n";
}
function lireBaseAide(texte){
	if (!/^@@begin_db/.test(String(texte || ""))) return null;
	var e = {};
	String(texte).split("\n").forEach(function(l){ var m = /^(\/\S*) ([0-9a-f]{64})$/.exec(l); if (m) e[m[1]] = m[2]; });
	return Object.keys(e).length ? e : null;
}
function baseAideCh5(){ var f = F5("/var/lib/aide/aide.db"); return f ? lireBaseAide(f.getText()) : null; }
function comparerAide(base, maintenant){
	var r = { ajoutes: [], retires: [], changes: [] };
	Object.keys(maintenant).forEach(function(c){ if (!base.hasOwnProperty(c)) r.ajoutes.push(c); else if (base[c] !== maintenant[c]) r.changes.push(c); });
	Object.keys(base).forEach(function(c){ if (!maintenant.hasOwnProperty(c)) r.retires.push(c); });
	["ajoutes", "retires", "changes"].forEach(function(k){ r[k].sort(); });
	return r;
}
function dateAide(){ var d = maintenantGuet(); return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " +0200"; }
/* aide est aussi le nom français de help dans le jeu : avec une option d'AIDE, c'est l'outil ; sans, l'aide du jeu. */
var AIDE_DU_JEU_CH5 = Shell.sorts.aide;
Shell.sorts.aide = function(args, io){
	var options = ["--init", "-i", "--check", "-C", "--update", "-u", "--version", "-v", "--config", "-c", "--config-check", "-D", "--compare", "-E"];
	if (!args.some(function(a){ return options.indexOf(a) > -1 || /^--config=/.test(a); })) return AIDE_DU_JEU_CH5.apply(this, arguments);
	if (args.indexOf("--version") > -1 || args.indexOf("-v") > -1) return "Aide 0.18.3\n\nCompile-time options:\nuse pcre2: mandatory\nuse pthread: yes\nuse zlib compression: yes";
	if (Shell.hote() !== H5 || !estMonBastion()) throw new ShellError("aide: command not found" + astuce(io, "AIDE (les Sceaux d'intégrité) est installé sur le Bastion : ssh bastion."), 127);
	var conf = "/etc/aide/aide.conf", k = args.indexOf("--config"); if (k === -1) k = args.indexOf("-c");
	if (k > -1) conf = args[k + 1] || "";
	args.forEach(function(a){ if (/^--config=/.test(a)) conf = a.substring(9); });
	var texteConf = T5(conf);
	if (texteConf === null) throw new ShellError("ERROR: cannot open config file '" + conf + "': No such file or directory", 17);
	if (args.indexOf("--config-check") > -1 || args.indexOf("-D") > -1) return "";
	if (!io.sudo) throw new ShellError("ERROR: open_dbconf(): cannot open '/var/lib/aide/aide.db': Permission denied" + astuce(io, "Les empreintes se lisent et s'écrivent en root : sudo aide ..."), 17);
	var maintenant = inventaireAide(texteConf), debut = dateAide();
	var entete = "Start timestamp: " + debut + " (AIDE 0.18.3)\n";
	if (args.indexOf("--init") > -1 || args.indexOf("-i") > -1){
		ecrireFichierHote(H5, "/var/lib/aide/aide.db.new", texteBaseAide(maintenant), { mode: "rw-------" });
		GameEvents.fire({ type: "aide", action: "init", hote: H5, entrees: Object.keys(maintenant).length });
		return entete + "AIDE initialized database at /var/lib/aide/aide.db.new\n\nNumber of entries:\t" + Object.keys(maintenant).length + "\n\n" +
			"---------------------------------------------------\nThe attributes of the (uncompressed) database(s):\n---------------------------------------------------\n\n/var/lib/aide/aide.db.new\n SHA256    : " + sha256(texteBaseAide(maintenant)).substring(0, 44) + "\n\n" +
			"End timestamp: " + dateAide() + " (run time: 0m 2s)" + astuce(io, "La base neuve s'appelle aide.db.new : pour qu'elle serve de référence, copie-la en /var/lib/aide/aide.db.");
	}
	var base = baseAideCh5();
	if (!base){
		var ff = F5("/var/lib/aide/aide.db");
		throw new ShellError((ff ? "ERROR: database '/var/lib/aide/aide.db' is not a valid AIDE database" : "ERROR: open_database(): cannot open '/var/lib/aide/aide.db': No such file or directory") +
			astuce(io, "Il faut d'abord fabriquer la base (sudo aide --init), puis la mettre en place (sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db)."), 17);
	}
	var d = comparerAide(base, maintenant), nb = d.ajoutes.length + d.retires.length + d.changes.length;
	var mise = args.indexOf("--update") > -1 || args.indexOf("-u") > -1;
	if (mise) ecrireFichierHote(H5, "/var/lib/aide/aide.db.new", texteBaseAide(maintenant), { mode: "rw-------" });
	GameEvents.fire({ type: "aide", action: mise ? "update" : "check", hote: H5, ajoutes: d.ajoutes, retires: d.retires, changes: d.changes });
	io.code = (d.ajoutes.length ? 1 : 0) + (d.retires.length ? 2 : 0) + (d.changes.length ? 4 : 0);
	if (!nb) return entete + "AIDE found NO differences between database and filesystem. Looks okay!!\n\nNumber of entries:\t" + Object.keys(maintenant).length + (mise ? "\n\nNew AIDE database written to /var/lib/aide/aide.db.new" : "");
	var l = [entete + "AIDE found differences between database and filesystem!!", "", "Summary:", "  Total number of entries:\t" + Object.keys(maintenant).length,
		"  Added entries:\t\t" + d.ajoutes.length, "  Removed entries:\t\t" + d.retires.length, "  Changed entries:\t\t" + d.changes.length, "",
		"---------------------------------------------------"];
	if (d.ajoutes.length) l.push("Added entries:", "---------------------------------------------------", "");
	d.ajoutes.forEach(function(c){ l.push("f++++++++++++++++: " + c); });
	if (d.ajoutes.length) l.push("", "---------------------------------------------------");
	if (d.retires.length) l.push("Removed entries:", "---------------------------------------------------", "");
	d.retires.forEach(function(c){ l.push("f----------------: " + c); });
	if (d.retires.length) l.push("", "---------------------------------------------------");
	if (d.changes.length) l.push("Changed entries:", "---------------------------------------------------", "");
	d.changes.forEach(function(c){ l.push("f   ...    . H   : " + c); });
	if (mise) l.push("", "New AIDE database written to /var/lib/aide/aide.db.new");
	return l.join("\n") + astuce(io, "Chaque ligne est un fichier ajouté (+), retiré (-) ou changé (H : son empreinte). Un changement voulu se valide en refaisant la base.");
};
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.aide = (MANUEL_DU_JEU.aide ? MANUEL_DU_JEU.aide + "\n\n" : "aide est l'autre nom de help dans le jeu.\n\n") +
	"Sur le Bastion (chapitre 5), aide avec une option est AUSSI le vrai outil AIDE (Advanced Intrusion Detection Environment) :\n" +
	"  sudo aide --init      fabrique la base des empreintes (/var/lib/aide/aide.db.new)\n" +
	"  sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db   la met en place comme référence\n" +
	"  sudo aide --check     compare le disque à la référence : fichiers ajoutés, retirés, changés\n" +
	"  sudo aide --update    compare, puis écrit une base neuve (aide.db.new) qui tient compte des changements voulus";

/* ------------------------------------------------------------------ */
/* Les 29 étapes du chapitre                                           */
/* ------------------------------------------------------------------ */

var QUETES_CH5 = [
	{ id: "h_entree", titre: "Entrer dans le Bastion",
	  indice: "Un passage s'est ouvert au fond de l'Académie des Arcanes : cd Bastion depuis l'Académie (ou cd ~/Cybersup/SalleServeurs, puis cd Bastion au départ direct)." },
	{ id: "h_pierre", titre: "Écouter Laurent, lire l'ordre de mission, consulter la Pierre d'Inspection",
	  indice: "Dans le hall : cat Laurent, cat Mission. Puis, sur la machine (ssh bastion), consulte la Pierre : sudo lynis audit system (le score de départ)." },
	{ id: "h_comptes_vides", titre: "Herse : plus de compte sans mot de passe, plus de second root",
	  indice: "Tour de la Herse (Fernando). Sur bastion : les comptes sans mot de passe se voient dans /etc/shadow (2e champ vide), les comptes d'UID 0 dans /etc/passwd (3e champ)." },
	{ id: "h_comptes_regles", titre: "Herse : verrouillage après échecs, âge des mots de passe, comptes de service sans shell",
	  indice: "faillock (deny dans /etc/security/faillock.conf), PASS_MAX_DAYS dans /etc/login.defs ET chage -M pour les administrateurs, et les comptes de service en /usr/sbin/nologin." },
	{ id: "h_sudo", titre: "Sceau du Roi : plus de NOPASSWD: ALL, sudoers.d en 0440",
	  indice: "Tour du Sceau (Butler). sudo -l -U pour voir les droits, visudo -f pour les corriger, chmod 440 pour les fichiers de /etc/sudoers.d. sudo doit toujours marcher pour toi." },
	{ id: "h_planif", titre: "Sceau du Roi : cron et at réservés à root et à l'administrateur",
	  indice: "/etc/cron.allow et /etc/at.allow, une ligne par compte autorisé : root et toi." },
	{ id: "h_ssh_acces", titre: "Pont-levis : root ne passe plus, les mots de passe non plus (sshd -t puis reload)",
	  indice: "Tour du Pont-levis (Tatu). PermitRootLogin no, PasswordAuthentication no, AllowUsers, MaxAuthTries 3 ; sudo sshd -t AVANT sudo systemctl reload ssh. Pose d'abord ta clé (ssh-copy-id bastion)." },
	{ id: "h_ssh_algos", titre: "Pont-levis : des algorithmes modernes et une clé ed25519",
	  indice: "Ciphers, MACs et KexAlgorithms modernes dans un fichier de /etc/ssh/sshd_config.d, sshd -t, reload ; et ta clé ed25519 installée sur bastion. sshd -T montre le résultat." },
	{ id: "h_portes", titre: "Portes condamnées : arrêter et désactiver ce qui ne sert pas",
	  indice: "Tour des Portes (Jean). ss -tulpn et netstat -loptn montrent ce qui écoute. telnet, rpcbind, avahi : systemctl disable --now, et le paquet telnetd s'enlève (apt purge)." },
	{ id: "h_sandbox", titre: "Portes condamnées : enfermer Apache dans un bac à sable systemd",
	  indice: "systemd-analyze security apache2, puis systemctl edit apache2 (NoNewPrivileges, PrivateTmp, ProtectSystem), daemon-reload, et la note doit descendre." },
	{ id: "h_parefeu", titre: "Remparts : tout refuser en entrée, sauf SSH et HTTPS",
	  indice: "Tour des Remparts (Vint). ufw default deny incoming, ufw allow 22/tcp, ufw allow 443/tcp, ufw enable (ou nftables : /etc/nftables.conf, policy drop, nft -f)." },
	{ id: "h_parefeu_verif", titre: "Remparts : vérifier que seuls 22 et 443 répondent",
	  indice: "Les vieilles règles d'avant (80) doivent partir : ufw status numbered, ufw delete. Puis ufw status verbose (ou nft list ruleset), et depuis le hall, curl -I http://bastion ne doit plus répondre." },
	{ id: "h_droits", titre: "Salle des Coffres : shadow, fichiers modifiables par tous, sticky bit, SUID inattendus",
	  indice: "Tour des Coffres (Evelyn). /etc/shadow en 640, find / -perm -0002 -type f, chmod +t /tmp (1777), find / -perm -4000 et chmod u-s." },
	{ id: "h_capacites", titre: "Salle des Coffres : capacités, /tmp en noexec, umask 027",
	  indice: "getcap -r / puis setcap -r ; une ligne tmpfs /tmp nodev,nosuid,noexec dans /etc/fstab puis mount /tmp ; UMASK 027 dans /etc/login.defs." },
	{ id: "h_sysctl", titre: "Le Cœur : les leviers du noyau, durcis et gravés",
	  indice: "Tour du Cœur (Edsger). Un fichier /etc/sysctl.d/99-bastion.conf avec les sept réglages, puis sudo sysctl --system. Le vieux 10-routeur.conf passe avant : à toi de voir." },
	{ id: "h_modules", titre: "Le Cœur : interdire usb-storage et cramfs",
	  indice: "Un fichier dans /etc/modprobe.d (install usb-storage /bin/false, blacklist cramfs), puis modprobe -r usb-storage. lsmod pour vérifier." },
	{ id: "h_grub", titre: "Poterne : un mot de passe pour le chargeur GRUB",
	  indice: "Tour de la Poterne (Joan). grub-mkpasswd-pbkdf2, puis set superusers et password_pbkdf2 dans /etc/grub.d/40_custom, puis sudo update-grub." },
	{ id: "h_ctrlaltdel", titre: "Poterne : Ctrl+Alt+Suppr ne redémarre plus le serveur",
	  indice: "systemctl mask ctrl-alt-del.target." },
	{ id: "h_apache_bavard", titre: "Bannière : Apache se tait (version, signature, TRACE, listes de dossiers)",
	  indice: "Tour de la Bannière (Robert). ServerTokens Prod, ServerSignature Off, TraceEnable Off, plus de listes (a2dismod autoindex ou Options -Indexes). apachectl configtest PUIS reload (ou restart)." },
	{ id: "h_apache_tls", titre: "Bannière : un certificat valide, TLS 1.2 minimum et HSTS",
	  indice: "openssl x509 -noout -dates pour les deux certificats de /etc/ssl/certs ; SSLProtocol -all +TLSv1.2 +TLSv1.3 ; a2enmod headers et un en-tête Strict-Transport-Security ; configtest, puis restart." },
	{ id: "h_auditd", titre: "Tour de Guet : surveiller passwd, shadow et sudoers, de façon permanente",
	  indice: "Tour de Guet (Katherine). Des règles -w ... -p wa -k ... dans /etc/audit/rules.d/bastion.rules, puis sudo augenrules --load. ausearch -k pour lire." },
	{ id: "h_journaux", titre: "Tour de Guet : un journal qui survit, une heure juste, une bannière légale",
	  indice: "Storage=persistent dans /etc/systemd/journald.conf (puis restart systemd-journald), timedatectl set-ntp true, et /etc/issue et /etc/issue.net sans version du système." },
	{ id: "h_aide", titre: "Sceaux d'intégrité : la base des empreintes (AIDE)",
	  indice: "Tour des Sceaux (Ralph). sudo aide --init, puis copier aide.db.new en /var/lib/aide/aide.db, puis sudo aide --check." },
	{ id: "h_paquets", titre: "Sceaux d'intégrité : tout à jour, mises à jour automatiques, binaire réparé",
	  indice: "apt list --upgradable puis apt upgrade ; apt install unattended-upgrades et /etc/apt/apt.conf.d/20auto-upgrades ; debsums -s repère un binaire modifié : apt install --reinstall son paquet." },
	{ id: "h_fail2ban", titre: "La Garde : fail2ban veille sur SSH",
	  indice: "Tour de la Garde (Adele). /etc/fail2ban/jail.local : [sshd] enabled = true, maxretry, bantime. Puis sudo fail2ban-client reload et fail2ban-client status sshd." },
	{ id: "h_apparmor", titre: "La Garde : AppArmor enferme Apache",
	  indice: "sudo aa-status, puis sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2." },
	{ id: "h_aube", titre: "L'aube : relire la Tour de Guet et les Sceaux, réparer ce que la Nuée a laissé",
	  indice: "À 6 h, la Nuée éprouve les murs. Ensuite, sur bastion : journalctl ou ausearch pour savoir ce qu'elle a tenté, aide --check ou debsums pour ce qui a changé, et répare chaque trace." },
	{ id: "h_pierre_finale", titre: "La Pierre d'Inspection au-dessus de 85",
	  indice: "Après l'aube, sudo lynis audit system sur bastion : le Hardening index doit dépasser 85. La Pierre du hall dit ce qui manque." },
	{ id: "h_rapport", titre: "Rédiger le rapport d'inspection et le remettre à Laurent",
	  indice: "~/bastion/rapport.txt avec cinq rubriques (constats, mesures, score avant, score après, ce qui reste) et les deux scores exacts de la Pierre, puis une copie dans la BoiteDeLaurent du hall." }
];
var QUETES_SECONDAIRES_CH5 = [];   // les défis des maîtres et de Laurent : Bastion.js

var INDICES_CH5 = {
	h_entree: ["Le passage part du fond de l'Académie des Arcanes.", "cd ~/Cybersup/SalleServeurs/Academie, puis cd Bastion"],
	h_pierre: ["Laurent et l'ordre de mission sont dans le hall ; la Pierre se consulte sur la machine, en root.", "cat Laurent ; cat Mission ; ssh bastion ; sudo lynis audit system"],
	h_comptes_vides: ["awk -F: '$2 == \"\"' lit le 2e champ ; awk -F: '$3 == 0' le 3e. Un compte sans mot de passe se verrouille, un second root se supprime.", "sudo awk -F: '$2 == \"\"' /etc/shadow ; awk -F: '$3 == 0' /etc/passwd ; sudo passwd -l invite ; sudo userdel depannage"],
	h_comptes_regles: ["Trois réglages : faillock.conf (deny = 5), login.defs (PASS_MAX_DAYS 90) et chage -M 90 pour les comptes du groupe sudo, puis usermod -s /usr/sbin/nologin pour sauvegarde et deploiement.", "sudo sed -i 's/^# deny = 3/deny = 5/' /etc/security/faillock.conf ; sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS\\t90/' /etc/login.defs ; sudo chage -M 90 TOI ; sudo chage -M 90 vint ; sudo usermod -s /usr/sbin/nologin sauvegarde ; sudo usermod -s /usr/sbin/nologin deploiement"],
	h_sudo: ["La ligne NOPASSWD: ALL est dans /etc/sudoers.d/deploiement ; le fichier n'a pas les bons droits non plus.", "sudo sed -i 's/NOPASSWD: ALL/\\/usr\\/bin\\/systemctl restart apache2/' /etc/sudoers.d/deploiement ; sudo chmod 440 /etc/sudoers.d/deploiement ; sudo visudo -c"],
	h_planif: ["Deux fichiers, la même liste : root, puis ton compte.", "printf 'root\\nTOI\\n' | sudo tee /etc/cron.allow /etc/at.allow"],
	h_ssh_acces: ["Un fichier /etc/ssh/sshd_config.d/50-bastion.conf (la première valeur lue l'emporte), sudo sshd -t, puis sudo systemctl reload ssh.", "ssh-copy-id bastion (depuis le hall) ; puis sur bastion : printf 'PermitRootLogin no\\nPasswordAuthentication no\\nAllowUsers TOI\\nMaxAuthTries 3\\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf ; sudo sshd -t ; sudo systemctl reload ssh"],
	h_ssh_algos: ["Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com ; MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com ; KexAlgorithms curve25519-sha256.", "ssh-keygen -t ed25519 (si besoin) et ssh-copy-id bastion ; puis un fichier 60-algos.conf avec les trois lignes, sudo sshd -t, sudo systemctl reload ssh, sudo sshd -T | grep -i ciphers"],
	h_portes: ["disable --now arrête ET empêche le retour au démarrage ; apt purge enlève le paquet et sa configuration.", "sudo systemctl disable --now telnet.socket rpcbind avahi-daemon ; sudo apt purge telnetd"],
	h_sandbox: ["systemctl edit écrit un drop-in (override.conf) ; à la main, il faut sudo systemctl daemon-reload.", "printf '[Service]\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=full\\n' | sudo tee /etc/systemd/system/apache2.service.d/override.conf ; sudo systemctl daemon-reload ; systemd-analyze security apache2"],
	h_parefeu: ["La politique d'abord, les exceptions ensuite, l'activation en dernier : sinon tu te coupes toi-même.", "sudo ufw default deny incoming ; sudo ufw allow 22/tcp ; sudo ufw allow 443/tcp ; sudo ufw enable"],
	h_parefeu_verif: ["La vieille règle « allow 80/tcp » d'avant la nuit est toujours là.", "sudo ufw status numbered ; sudo ufw delete allow 80/tcp ; sudo ufw status verbose ; exit ; curl -I http://bastion/"],
	h_droits: ["chmod 640 /etc/shadow ; chmod o-w sur ce que find -perm -0002 trouve ; chmod 1777 /tmp ; chmod u-s sur le SUID que rien ne justifie.", "sudo chmod 640 /etc/shadow ; sudo chmod o-w /etc/cron.d/rotation-sauvegardes /usr/local/bin/sauver.sh ; sudo chmod 1777 /tmp ; sudo chmod u-s /usr/local/bin/vieil-outil"],
	h_capacites: ["setcap -r retire toutes les capacités d'un programme ; mount /tmp lit la ligne de fstab.", "sudo setcap -r /usr/bin/python3.11 ; echo 'tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0' | sudo tee -a /etc/fstab ; sudo mount /tmp ; sudo sed -i 's/^UMASK.*/UMASK\\t\\t027/' /etc/login.defs"],
	h_sysctl: ["99-bastion.conf passe après 10-routeur.conf (ordre alphabétique) : ses valeurs l'emportent. Il faut les sept clés.", "printf 'net.ipv4.ip_forward = 0\\nnet.ipv4.conf.all.rp_filter = 1\\nnet.ipv4.conf.all.accept_redirects = 0\\nkernel.dmesg_restrict = 1\\nkernel.kptr_restrict = 2\\nkernel.randomize_va_space = 2\\nfs.protected_symlinks = 1\\n' | sudo tee /etc/sysctl.d/99-bastion.conf ; sudo sysctl --system"],
	h_modules: ["blacklist empêche seulement le chargement automatique ; install ... /bin/false empêche tout.", "printf 'install usb-storage /bin/false\\nblacklist cramfs\\n' | sudo tee /etc/modprobe.d/bastion.conf ; sudo modprobe -r usb-storage"],
	h_grub: ["Le hash vient de grub-mkpasswd-pbkdf2 ; les deux lignes vont à la fin de 40_custom (qui doit rester exécutable).", "grub-mkpasswd-pbkdf2 ; puis echo 'set superusers=\"gardien\"' et echo 'password_pbkdf2 gardien grub.pbkdf2.sha512...' ajoutés avec sudo tee -a /etc/grub.d/40_custom ; sudo update-grub"],
	h_ctrlaltdel: ["mask relie l'unité à /dev/null : plus rien ne peut la démarrer.", "sudo systemctl mask ctrl-alt-del.target"],
	h_apache_bavard: ["Trois lignes de /etc/apache2/conf-available/security.conf, et le module autoindex.", "sudo sed -i -e 's/^ServerTokens OS/ServerTokens Prod/' -e 's/^ServerSignature On/ServerSignature Off/' -e 's/^TraceEnable On/TraceEnable Off/' /etc/apache2/conf-available/security.conf ; sudo a2dismod -f autoindex ; apachectl configtest ; sudo systemctl restart apache2"],
	h_apache_tls: ["Le site HTTPS est /etc/apache2/sites-available/default-ssl.conf ; le certificat neuf est bastion-2026.pem.", "sudo sed -i -e 's#/etc/ssl/certs/bastion.pem#/etc/ssl/certs/bastion-2026.pem#' -e 's/SSLEngine on/SSLEngine on\\n\\tSSLProtocol -all +TLSv1.2 +TLSv1.3\\n\\tHeader always set Strict-Transport-Security \"max-age=63072000\"/' /etc/apache2/sites-available/default-ssl.conf ; sudo a2enmod headers ; apachectl configtest ; sudo systemctl restart apache2"],
	h_auditd: ["Une règle par fichier, la même clé pour les comptes ; augenrules --load assemble et charge.", "printf -- '-w /etc/passwd -p wa -k comptes\\n-w /etc/shadow -p wa -k comptes\\n-w /etc/sudoers -p wa -k sudoers\\n' | sudo tee /etc/audit/rules.d/bastion.rules ; sudo augenrules --load"],
	h_journaux: ["journald relit sa configuration au redémarrage ; la bannière ne doit citer ni Debian ni un numéro de version.", "sudo sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf ; sudo systemctl restart systemd-journald ; sudo timedatectl set-ntp true ; echo 'Acces reserve aux personnes autorisees. Toute connexion est surveillee.' | sudo tee /etc/issue /etc/issue.net"],
	h_aide: ["--init écrit aide.db.new ; c'est aide.db qui sert de référence.", "sudo aide --init ; sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db ; sudo aide --check"],
	h_paquets: ["debsums -s nomme le fichier ; dpkg -S dit à quel paquet il appartient.", "sudo apt update ; sudo apt upgrade ; sudo apt install unattended-upgrades ; printf 'APT::Periodic::Update-Package-Lists \"1\";\\nAPT::Periodic::Unattended-Upgrade \"1\";\\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades ; sudo debsums -s ; sudo apt install --reinstall procps"],
	h_fail2ban: ["jail.local surcharge jail.conf ; reload relit la configuration.", "printf '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 1h\\n' | sudo tee /etc/fail2ban/jail.local ; sudo fail2ban-client reload ; sudo fail2ban-client status sshd"],
	h_apparmor: ["Le profil d'Apache est en complain : il note sans bloquer.", "sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2"],
	h_aube: ["Une trace par mur tombé : journalctl -t bastion-garde la décrit ; aide --check ou debsums montre le fichier touché. Répare-les, puis relis les journaux.", "sudo journalctl -t bastion-garde ; sudo aide --check ; puis répare chaque fichier signalé (userdel, rm, apt install --reinstall...)"],
	h_pierre_finale: ["cat PierreDInspection, dans le hall, liste ce qui manque encore.", "ssh bastion ; sudo lynis audit system | grep \"Hardening index\""],
	h_rapport: ["Un here-document écrit le rapport d'un coup ; cp le dépose.", "mkdir -p ~/bastion ; cat > ~/bastion/rapport.txt <<'FIN' ... FIN ; cp ~/bastion/rapport.txt CHEMIN_DU_HALL/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH5 = {
	h_pierre: "Ici la WarRoom. L'inspection est à l'aube, et la Nuée a juré de revenir avant. Écoute Laurent, lis l'ordre de mission, puis consulte la Pierre sur bastion : le score de départ, c'est ton point zéro.",
	h_comptes_vides: "Premier mur : la Herse. Un compte sans mot de passe, c'est une porte sans serrure. Fernando t'attend.",
	h_comptes_regles: "Bien. Maintenant les règles de la Herse : verrouiller après des échecs, faire vieillir les mots de passe, et pas de shell pour les comptes de service.",
	h_sudo: "Tour du Sceau, chez Butler : un compte peut tout faire en root sans mot de passe. Ça ne passera pas l'inspection.",
	h_planif: "Les roues du temps : seuls root et toi devez pouvoir programmer quelque chose. Tu te souviens de la bombe de l'Académie.",
	h_ssh_acces: "Le Pont-levis, chez Tatu. root ne doit plus entrer, les mots de passe non plus : des clés seulement. Et sshd -t avant chaque reload, sinon tu te fermes la porte au nez.",
	h_ssh_algos: "Encore le Pont-levis : des algorithmes modernes, et ta clé ed25519.",
	h_portes: "Les Portes condamnées, chez Jean : tout ce qui écoute et ne sert à rien doit se taire. ss et netstat te diront qui.",
	h_sandbox: "Apache tourne en root avec tout le disque à portée de main. Enferme-le dans un bac à sable systemd.",
	h_parefeu: "Les Remparts. Vint est rentré de vacances, il t'attend. Tout refuser en entrée, sauf SSH et HTTPS. Dans le bon ordre.",
	h_parefeu_verif: "Vérifie tes remparts : une vieille règle traîne peut-être. Frances passera derrière toi.",
	h_droits: "La Salle des Coffres, chez Evelyn : des serrures trop lâches, des passe-partout oubliés.",
	h_capacites: "Et les pouvoirs cachés : une capacité de trop, un /tmp où tout s'exécute.",
	h_sysctl: "Le Cœur, chez Edsger : les leviers du noyau. Un vieux réglage de routeur traîne encore.",
	h_modules: "Les tiroirs du noyau : une clé USB ne doit pas pouvoir monter, ni un vieux système de fichiers.",
	h_grub: "La Poterne, chez Joan : au démarrage, n'importe qui au clavier peut demander un shell root. Un mot de passe sur GRUB.",
	h_ctrlaltdel: "Et trois touches ne doivent pas suffire à redémarrer le serveur.",
	h_apache_bavard: "La Bannière, chez Robert : Apache crie sa version à qui veut l'entendre. Fais-le taire.",
	h_apache_tls: "Son sceau a expiré, et il parle encore de vieilles langues (TLS 1.0, 1.1). Certificat neuf, TLS 1.2 minimum, HSTS.",
	h_auditd: "La Tour de Guet, chez Katherine : qui touche aux comptes doit laisser une trace.",
	h_journaux: "Un journal qui ne s'efface pas au redémarrage, une heure juste, et une bannière qui prévient.",
	h_aide: "Les Sceaux d'intégrité, chez Ralph : une empreinte de chaque fichier, pour voir demain ce qui a bougé cette nuit.",
	h_paquets: "Des paquets en retard, un binaire qui ne correspond plus à son paquet. Mets tout d'aplomb.",
	h_fail2ban: "La Garde, chez Adele : bannir qui insiste à la porte.",
	h_apparmor: "Et enfermer Apache dans sa cellule AppArmor.",
	h_aube: "L'aube. Relis la Tour de Guet et les Sceaux : qu'a tenté la Nuée, qu'est-ce qui a tenu, qu'a-t-elle laissé ?",
	h_pierre_finale: "L'inspecteur arrive. La Pierre doit dépasser 85.",
	h_rapport: "Dernière chose : le rapport d'inspection pour Laurent. Constats, mesures, score avant, score après, ce qui reste."
};
var METIER_CH5 = {
	h_pierre: "Un audit de durcissement se fait avant ET après : sans point de départ mesuré, on ne prouve rien.",
	h_comptes_vides: "Les comptes, c'est le premier contrôle de toute inspection : qui peut entrer, et comment.",
	h_sudo: "Le moindre privilège : chacun a les droits dont il a besoin, pas un de plus.",
	h_ssh_acces: "Toute modification à distance d'un accès distant se teste d'abord, sur une session qu'on garde ouverte.",
	h_portes: "La surface d'attaque, c'est tout ce qui écoute. Moins de portes, moins de serrures à surveiller.",
	h_parefeu: "Un pare-feu se pose dans cet ordre : la politique, les exceptions, l'activation. L'inverse coupe la branche sur laquelle on est assis.",
	h_droits: "Un fichier modifiable par tous dans /etc ou /usr, c'est une élévation de privilèges qui attend son heure.",
	h_sysctl: "Un réglage du noyau qui n'est pas gravé dans /etc/sysctl.d disparaît au prochain redémarrage.",
	h_apache_bavard: "Une version affichée, c'est la liste des failles connues offerte à qui la lit.",
	h_auditd: "Sans trace, pas d'enquête : l'audit se pose avant l'incident, jamais après.",
	h_aide: "Une base d'empreintes se fabrique sur un système sain, et se garde à l'abri.",
	h_aube: "Après un incident, on relit les journaux avant de réparer : sinon on efface les preuves.",
	h_rapport: "Un rapport d'inspection dit ce qui a été fait, ce qui a été mesuré, et ce qui reste : on ne cache pas le reste."
};

/* ------------------------------------------------------------------ */
/* Les validations : chaque étape lit l'état réel de la machine         */
/* ------------------------------------------------------------------ */

var VALIDATIONS_CH5 = {
	/* Herse */
	h_comptes_vides: function(){
		var c = comptesCh5();
		if (!c.passwd || !c.shadow) return false;
		var vide = c.shadow.some(function(s){ return s.mdp === ""; }) || c.passwd.some(function(p){ return p.mdp === ""; });
		var racines = c.passwd.filter(function(p){ return +p.uid === 0; });
		return !vide && racines.length === 1 && racines[0].nom === "root";
	},
	h_comptes_regles: function(){
		var conf = configFaillock(H5);
		var faillock = faillockActif(H5) && /^\s*deny\s*=\s*\d+/m.test(T5("/etc/security/faillock.conf") || "") && conf.deny >= 1 && conf.deny <= 10;
		var max = +loginDefs(H5).PASS_MAX_DAYS;
		var ld = max >= 1 && max <= 90;
		var c = comptesCh5();
		if (!c.passwd || !c.shadow) return false;
		var admins = membresDe("sudo").filter(function(n){ return c.passwd.some(function(p){ return p.nom === n; }); });
		var ages = admins.every(function(n){ var s = c.shadow.filter(function(x){ return x.nom === n; })[0]; return !s || !mdpUtilisable(s.mdp) || (+s.max >= 1 && +s.max <= 90); });
		var services = c.passwd.every(function(p){ return +p.uid === 0 || +p.uid >= 1000 && +p.uid !== 65534 || shellNul(p.shell); });
		return faillock && ld && ages && services && admins.indexOf(JOUEUR) > -1;
	},
	/* Sceau du Roi */
	h_sudo: function(){
		var ok = controleLynisOk("AUTH-9252") === true && controleLynisOk("AUTH-9254") === true;
		var v = verifierSudoers(H5);
		var moi = reglesSudo(H5, JOUEUR);
		return ok && v.ok && !!(moi && moi.autorise);
	},
	h_planif: function(){
		return ["/etc/cron.allow", "/etc/at.allow"].every(function(chemin){
			var t = T5(chemin);
			if (t === null) return false;
			var l = lignesPropres(t).map(function(x){ return x.trim(); }).filter(function(x){ return x && x.charAt(0) !== "#"; });
			return l.indexOf("root") > -1 && l.indexOf(JOUEUR) > -1 && l.every(function(x){ return ["root", JOUEUR, "vint"].indexOf(x) > -1; });
		});
	},
	/* Pont-levis */
	h_ssh_acces: function(){
		var s = configSshEffective(H5);
		var users = s.allowusers || [];
		if (!Array.isArray(users)) users = String(users).split(/\s+/);
		var c = comptesCh5();
		return /^no$/i.test(s.permitrootlogin || "") && /^no$/i.test(s.passwordauthentication || "") && users.indexOf(JOUEUR) > -1 &&
			+s.maxauthtries <= 3 && +s.maxauthtries >= 1 && sshTesteAvantCh5() && users.every(function(u){ return c.passwd && c.passwd.some(function(p){ return p.nom === u.split("@")[0]; }); });
	},
	h_ssh_algos: function(){
		var s = configSshEffective(H5), lu = lireConfigSshd(vueChargee("ssh", H5, etatBastion().sshApplique[H5] || null));
		var explicites = ["ciphers", "macs", "kexalgorithms"].every(function(k){ return lu.options && lu.options.hasOwnProperty(k); });
		var bons = {
			ciphers: ["chacha20-poly1305@openssh.com", "aes256-gcm@openssh.com", "aes128-gcm@openssh.com", "aes256-ctr", "aes192-ctr", "aes128-ctr"],
			macs: ["hmac-sha2-512-etm@openssh.com", "hmac-sha2-256-etm@openssh.com", "umac-128-etm@openssh.com"],
			kexalgorithms: ["sntrup761x25519-sha512@openssh.com", "curve25519-sha256", "curve25519-sha256@libssh.org", "diffie-hellman-group16-sha512", "diffie-hellman-group18-sha512", "diffie-hellman-group-exchange-sha256"]
		};
		var modernes = Object.keys(bons).every(function(k){ return String(s[k] || "").split(",").every(function(a){ return bons[k].indexOf(a.trim()) > -1; }); });
		return explicites && modernes && cleEd25519Installee() && sshTesteAvantCh5();
	},
	/* Portes condamnées */
	h_portes: function(){
		var inutiles = ["telnet.socket", "rpcbind", "avahi-daemon"].every(function(u){ var e = etatUnite(H5, u); return !e.existe || (!e.actif && (!e.enabled || e.masque)); });
		var p = etatPaquet(H5, "telnetd");
		return inutiles && !!p && p.etat !== "ii";
	},
	h_sandbox: function(){
		var e = expositionUnite(H5, "apache2"), d = directivesChargees(H5, uniteInfo(H5, "apache2").unite);
		var nnp = oui(derniere(d, "Service", "NoNewPrivileges")), tmp = oui(derniere(d, "Service", "PrivateTmp"));
		var ps = /^(full|strict)$/i.test(derniere(d, "Service", "ProtectSystem") || "");
		return nnp && tmp && ps && e.exposition < 9 && etatUnite(H5, "apache2").actif;
	},
	/* Remparts */
	h_parefeu: function(){
		var pf = parefeuCh5();
		return pf.filtre && portOuvertCh5(22, "tcp") && portOuvertCh5(443, "tcp") && !portOuvertCh5(23, "tcp") && !portOuvertCh5(111, "tcp");
	},
	h_parefeu_verif: function(){
		var c = sCh5();
		var ok = VALIDATIONS_CH5.h_parefeu() && portsJoignablesCh5().join(",") === "22,443";
		return ok && !!c.parefeuVu && !!c.parefeuEprouve;
	},
	/* Salle des Coffres */
	h_droits: function(){
		var tmp = dossierHote(H5, "/tmp");
		return controleLynisOk("FILE-7524") === true && controleLynisOk("FILE-7526") === true && controleLynisOk("FILE-7528") === true &&
			!!tmp && tmp.mode === "rwxrwxrwt" && !!F5("/etc/shadow");
	},
	h_capacites: function(){
		var m = montages(H5).filter(function(x){ return x.cible === "/tmp"; })[0];
		var fstab = /^\s*\S+\s+\/tmp\s+\S+\s+\S*noexec/m.test(T5("/etc/fstab") || "") && /^\s*\S+\s+\/tmp\s+\S+\s+\S*nosuid/m.test(T5("/etc/fstab") || "") && /^\s*\S+\s+\/tmp\s+\S+\s+\S*nodev/m.test(T5("/etc/fstab") || "");
		var monte = !!m && ["nodev", "nosuid", "noexec"].every(function(o){ return m.options.indexOf(o) > -1; });
		var umask = /^0?0?27$|^0?0?77$/.test(loginDefs(H5).UMASK || "");
		return controleLynisOk("FILE-7530") === true && fstab && monte && umask;
	},
	/* Le Cœur */
	h_sysctl: function(){
		var vivant = etatHote(H5).sysctl || {};
		var grave = sysctlDemarrage(H5);
		return SYSCTL_VOULUS_CH5.every(function(x){ return String(vivant[x[0]]) === x[1] && String(grave[x[0]]) === x[1]; });
	},
	h_modules: function(){
		var r = lireModprobe(H5);
		return r.install.usb_storage !== undefined && /\/bin\/(true|false)/.test(r.install.usb_storage) &&
			(r.blacklist.indexOf("cramfs") > -1 || r.install.cramfs !== undefined) && modulesCharges(H5).indexOf("usb_storage") === -1;
	},
	/* Poterne */
	h_grub: function(){
		var cfg = T5("/boot/grub/grub.cfg") || "", custom = F5("/etc/grub.d/40_custom");
		if (!custom || !/x/.test(custom.mode)) return false;
		var t = custom.getText();
		var su = /^\s*set\s+superusers\s*=\s*"?([A-Za-z0-9_-]+)"?/m.exec(t), pw = /^\s*password_pbkdf2\s+(\S+)\s+(grub\.pbkdf2\.sha512\.\d+\.[0-9A-F]+\.[0-9A-F]+)/m.exec(t);
		return !!su && !!pw && pw[1] === su[1] && cfg.indexOf(pw[2]) > -1 && new RegExp("set\\s+superusers\\s*=\\s*\"?" + su[1]).test(cfg);
	},
	h_ctrlaltdel: function(){ return !!etatUnite(H5, "ctrl-alt-del.target").masque; },
	/* Bannière */
	h_apache_bavard: function(){
		var e = etatHote(H5);
		return !!e.apache && etatUnite(H5, "apache2").actif && controleLynisOk("HTTP-6640") === true && controleLynisOk("HTTP-6641") === true &&
			controleLynisOk("HTTP-6643") === true && controleLynisOk("HTTP-6650") === true && apacheTesteAvantCh5();
	},
	h_apache_tls: function(){
		return !!etatHote(H5).apache && etatUnite(H5, "apache2").actif && controleLynisOk("CRYP-7902") === true && controleLynisOk("HTTP-6660") === true &&
			controleLynisOk("HTTP-6662") === true && apacheTesteAvantCh5();
	},
	/* Tour de Guet */
	h_auditd: function(){
		var e = etatHote(H5);
		if (!serviceActif(H5, "auditd")) return false;
		var charge = ["/etc/passwd", "/etc/shadow", "/etc/sudoers"].every(function(c){ return e.audit.regles.some(function(r){ return r.type === "w" && r.chemin === c && r.perms.indexOf("w") > -1 && r.perms.indexOf("a") > -1; }); });
		var permanent = ["/etc/passwd", "/etc/shadow", "/etc/sudoers"].every(function(c){
			return fichiersDuDossierGuet(H5, "/etc/audit/rules.d", "*.rules").some(function(f){
				return lignesConf(lireFichierHote(H5, f.chemin)).some(function(l){ var m = /^\s*-w\s+(\S+)\s+-p\s+(\S+)/.exec(l.texte); return m && m[1] === c && /w/.test(m[2]) && /a/.test(m[2]); });
			});
		});
		return charge && permanent;
	},
	h_journaux: function(){
		return etatHote(H5).journald === "persistent" && horlogeSynchronisee(H5) && controleLynisOk("BANN-7126") === true && controleLynisOk("BANN-7130") === true;
	},
	/* Sceaux d'intégrité */
	h_aide: function(){
		var b = baseAideCh5();
		return !!b && Object.keys(b).length >= 20 && !!sCh5().aideVerifiee;
	},
	h_paquets: function(){
		var u = etatPaquet(H5, "unattended-upgrades");
		var auto = T5("/etc/apt/apt.conf.d/20auto-upgrades") || "";
		return aMettreAJour(H5).length === 0 && !!u && u.etat === "ii" && /APT::Periodic::Unattended-Upgrade\s+"1"\s*;/.test(auto) &&
			fichiersModifiesPaquet(H5, "procps").modifies.length === 0 && fichiersModifiesPaquet(H5, "procps").manquants.length === 0;
	},
	/* La Garde */
	h_fail2ban: function(){
		var e = etatHote(H5), j = e.f2b.conf && e.f2b.conf.sshd;
		return serviceActif(H5, "fail2ban") && !!j && j.maxretry >= 1 && j.maxretry <= 5 && (j.bantime >= 600 || j.bantime === -1);
	},
	h_apparmor: function(){
		var p = (etatHote(H5).apparmor || {})["/usr/sbin/apache2"];
		return !!p && p.mode === "enforce";
	}
};
var SYSCTL_VOULUS_CH5 = [["net.ipv4.ip_forward", "0"], ["net.ipv4.conf.all.rp_filter", "1"], ["net.ipv4.conf.all.accept_redirects", "0"], ["kernel.dmesg_restrict", "1"],
	["kernel.kptr_restrict", "2"], ["kernel.randomize_va_space", "2"], ["fs.protected_symlinks", "1"]];

/* Une configuration SSH ou Apache n'est « appliquée proprement » que si ce qui a été rechargé avait été testé (sshd -t, configtest). */
function sshTesteAvantCh5(){ var c = sCh5(); return !!c.sshApplique && c.sshApplique === c.sshAppliqueTeste; }
function apacheTesteAvantCh5(){ var c = sCh5(); return !!c.apacheApplique && c.apacheApplique === c.apacheAppliqueTeste; }
/* La clé ed25519 du joueur, posée sur bastion (ssh-copy-id, ou à la main dans authorized_keys). */
function clesDuJoueurCh5(){
	var d = Home.getChildFromName(".ssh"), cles = [];
	if (d === -1) return cles;
	d.items.forEach(function(it){ if (/\.pub$/.test(it.itemname) && /^ssh-ed25519 /.test(it.getText())) cles.push(it.getText().trim()); });
	return cles;
}
function cleEd25519Installee(){
	var mes = clesDuJoueurCh5();
	if (!mes.length) return false;
	var posees = [];
	if (state.reseau && state.reseau.cles && state.reseau.cles[H5]) posees.push(String(state.reseau.cles[H5]).trim());
	var ak = T5("/home/" + JOUEUR + "/.ssh/authorized_keys");
	if (ak) lignesPropres(ak).forEach(function(l){ posees.push(l.trim()); });
	return mes.some(function(k){ return posees.indexOf(k) > -1; });
}

/* Une tour est fermée quand ses deux étapes sont faites. */
function tourFermeeCh5(cle){ var t = tourCh5(cle); return !!t && t.etapes.every(function(id){ return !!state.quests[id]; }); }
function toursFermeesCh5(){ return TOURS_CH5.filter(function(t){ return tourFermeeCh5(t.cle); }); }

/* ------------------------------------------------------------------ */
/* L'assaut de l'aube : chaque mur encore ouvert cède, et la Nuée laisse une trace inerte */
/* ------------------------------------------------------------------ */

var QUI_NUEE = { comm: "nuee", exe: "/tmp/.nuee", auid: 4294967295, uid: 0 };
/* Pour chaque tour : la trace laissée si le mur cède (poser), comment savoir qu'elle est réparée (reparee), et ce que dit le registre. */
var TRACES_CH5 = {
	herse: { phrase: "la Herse a cédé : un compte sans mot de passe ouvrait la porte", fichier: "/etc/passwd",
		poser: function(){ ajouterLigneCompte(H5, "passwd", "nuee-trace:x:1999:1999:trace de la Nuee (inerte):/nonexistent:/usr/sbin/nologin"); ajouterLigneCompte(H5, "shadow", "nuee-trace:!:20400:0:99999:7:::"); },
		reparee: function(){ var c = comptesCh5(); return !(c.passwd || []).some(function(p){ return p.nom === "nuee-trace"; }); } },
	sceau: { phrase: "le Sceau a cédé : un compte pouvait tout faire en root sans mot de passe", fichier: "/etc/sudoers.d/nuee",
		poser: function(){ P5("/etc/sudoers.d/nuee", "# trace de la Nuee (inerte, commentee) : elle est passee par le Sceau du Roi\n", { mode: "r--r-----" }); },
		reparee: function(){ return !F5("/etc/sudoers.d/nuee"); } },
	pontlevis: { phrase: "le Pont-levis a cédé : root entrait encore par SSH avec un mot de passe", fichier: "/etc/ssh/sshd_config.d/99-nuee.conf",
		poser: function(){ P5("/etc/ssh/sshd_config.d/99-nuee.conf", "# trace de la Nuee (inerte, commentee) : elle est passee par le Pont-levis\n"); },
		reparee: function(){ return !F5("/etc/ssh/sshd_config.d/99-nuee.conf"); } },
	portes: { phrase: "les Portes ont cédé : un vieux service écoutait encore", fichier: "/etc/systemd/system/nuee-veille.service",
		poser: function(){ P5("/etc/systemd/system/nuee-veille.service", "# trace de la Nuee (inerte)\n[Unit]\nDescription=trace de la Nuee (inerte)\n\n[Service]\nExecStart=/bin/true\n"); },
		reparee: function(){ return !F5("/etc/systemd/system/nuee-veille.service"); } },
	remparts: { phrase: "les Remparts ont cédé : rien ne filtrait l'entrée", fichier: "/etc/ufw/user.rules",
		poser: function(){ var u = pfCh5().ufw; if (!u.regles.some(function(r){ return r.port === 4444; })) u.regles.push({ action: "allow", port: 4444, proto: "tcp", de: "any" }); ecrireUfwCh5(); },
		reparee: function(){ return !pfCh5().ufw.regles.some(function(r){ return r.port === 4444; }); } },
	coffres: { phrase: "la Salle des Coffres a cédé : un passe-partout traînait encore", fichier: "/usr/local/bin/.nuee",
		poser: function(){ P5("/usr/local/bin/.nuee", "trace de la Nuee (inerte, ne fait rien)\n", { mode: "rwsr-xr-x" }); },
		reparee: function(){ var f = F5("/usr/local/bin/.nuee"); return !f; } },
	coeur: { phrase: "le Cœur a cédé : un levier du noyau était resté ouvert", fichier: "/etc/sysctl.d/90-nuee.conf",
		poser: function(){ P5("/etc/sysctl.d/90-nuee.conf", "# trace de la Nuee (inerte tant qu'on ne recharge pas)\nnet.ipv4.ip_forward = 1\n"); },
		reparee: function(){ return !F5("/etc/sysctl.d/90-nuee.conf"); } },
	poterne: { phrase: "la Poterne a cédé : le démarrage n'était pas protégé", fichier: "/etc/grub.d/09_nuee",
		poser: function(){ P5("/etc/grub.d/09_nuee", "# trace de la Nuee (inerte, non executable)\n", { mode: "rw-r--r--" }); },
		reparee: function(){ return !F5("/etc/grub.d/09_nuee"); } },
	banniere: { phrase: "la Bannière a cédé : le serveur web parlait trop", fichier: "/var/www/html/nuee.html",
		poser: function(){ P5("/var/www/html/nuee.html", "<p>La Nuee est passee par la Banniere. (trace inerte)</p>\n"); },
		reparee: function(){ return !F5("/var/www/html/nuee.html"); } },
	guet: { phrase: "la Tour de Guet a cédé : personne ne regardait", fichier: "/etc/rsyslog.d/00-nuee.conf",
		poser: function(){ P5("/etc/rsyslog.d/00-nuee.conf", "# trace de la Nuee (inerte, commentee) : elle voulait faire taire la Tour de Guet\n"); },
		reparee: function(){ return !F5("/etc/rsyslog.d/00-nuee.conf"); } },
	sceaux: { phrase: "les Sceaux ont cédé : rien ne comparait les empreintes", fichier: "/usr/bin/id",
		poser: function(){ var f = F5("/usr/bin/id"); if (f) f.setText("ELF id 9.1 (modifie par la Nuee, inerte)\n"); },
		reparee: function(){ return fichiersModifiesPaquet(H5, "coreutils").modifies.indexOf("/usr/bin/id") === -1 && !!F5("/usr/bin/id"); } },
	garde: { phrase: "la Garde a cédé : personne ne bannissait l'importun", fichier: "/etc/fail2ban/jail.d/nuee.local",
		poser: function(){ P5("/etc/fail2ban/jail.d/nuee.local", "# trace de la Nuee (inerte, commentee)\n"); },
		reparee: function(){ return !F5("/etc/fail2ban/jail.d/nuee.local"); } }
};
function tracesRestantesCh5(){
	var c = sCh5();
	return Object.keys(c.traces || {}).filter(function(cle){ return c.traces[cle] && TRACES_CH5[cle] && !TRACES_CH5[cle].reparee(); });
}
function lancerAssautCh5(){
	var c = sCh5();
	if (c.assaut) return;
	c.assaut = true;
	c.assautNb = state.nbCommandes;
	c.traces = {};
	var ouvertes = [];
	TOURS_CH5.forEach(function(t){
		var trace = TRACES_CH5[t.cle];
		if (tourFermeeCh5(t.cle)){
			journalGuet(H5, { unite: "bastion-garde", message: "assaut de l'aube sur " + t.titre + " : le mur a tenu", prio: 4, fac: "auth" });
			return;
		}
		ouvertes.push(t);
		c.traces[t.cle] = true;
		try { auditSous(H5, QUI_NUEE, function(){ trace.poser(); }); } catch (e){ trace.poser(); }
		journalGuet(H5, { unite: "bastion-garde", message: "assaut de l'aube sur " + t.titre + " : " + trace.phrase + " ; trace laissée dans " + trace.fichier, prio: 2, fac: "auth" });
	});
	// Les tentatives refusées laissent leur marque : la Tour de Guet les note, la Garde bannit si elle veille.
	for (var i = 0; i < 4; i++){
		try { ajouterEvenementAudit(H5, { type: "USER_AUTH", acct: "root", adresse: IP_ASSAUT, succes: false, comm: "sshd", exe: "/usr/sbin/sshd" }); } catch (e){}
	}
	try { fail2banEchec(H5, "sshd", IP_ASSAUT, 6); } catch (e){}
	journalGuet(H5, { unite: "bastion-garde", message: "fin de l'assaut de l'aube : " + (ouvertes.length ? ouvertes.length + " mur(s) tombé(s)" : "tous les murs ont tenu"), prio: 4, fac: "auth" });
	if (!state.has("rejeuEnCours")){
		say(C.rouge("6 h. L'aube.") + " La Nuée éprouve les murs du Bastion, un à un. " +
			(ouvertes.length ? "Ont cédé : " + ouvertes.map(function(t){ return t.titre; }).join(", ") + ". Elle a laissé une trace dans chacun (inerte, mais à retrouver et à réparer)." :
				"Tous les murs ont tenu. La Tour de Guet a tout noté.") + "\n" +
			C.gris("(Ce n'est pas une défaite : relis les journaux sur bastion (sudo journalctl -t bastion-garde, sudo ausearch, sudo aide --check), répare, puis consulte la Pierre.)"));
	}
}

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function validerCh5(){
	var c = sCh5();
	if (!state.quests["h_pierre"] && state.has("ch5LaurentLu") && state.has("ch5MissionLue") && c.scoreDepart !== null && c.scoreDepart !== undefined) state.complete("h_pierre");
	Object.keys(VALIDATIONS_CH5).forEach(function(id){
		if (state.quests[id]) return;
		var ok = false;
		try { ok = VALIDATIONS_CH5[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	// Frances éprouve chaque mur fermé : une phrase, une fois.
	TOURS_CH5.forEach(function(t){
		if (!tourFermeeCh5(t.cle) || c.murs[t.cle]) return;
		c.murs[t.cle] = true;
		if (c.fermees[t.cle] === undefined) c.fermees[t.cle] = c.horloge;
		if (!state.has("rejeuEnCours")) say(C.vert("Frances") + " : « J'ai éprouvé " + t.titre + ". Le mur a tenu. »");
	});
	if (c.toutesFermees === undefined && toursFermeesCh5().length === TOURS_CH5.length) c.toutesFermees = c.horloge;
	// L'aube.
	if (!c.assaut && c.horloge >= AUBE_CH5) lancerAssautCh5();
	if (!state.quests["h_aube"] && c.assaut && tracesRestantesCh5().length === 0 && c.aubeJournaux && c.aubeIntegrite) state.complete("h_aube");
	if (!state.quests["h_pierre_finale"] && c.assaut && c.scoreFinalCandidat !== null && c.scoreFinalCandidat !== undefined && c.scoreFinalCandidat > 85 && scoreLynis(H5).score > 85){
		c.scoreFinal = c.scoreFinalCandidat;
		state.complete("h_pierre_finale");
	}
	// Le rapport : contresigné seulement quand l'inspection est passée.
	if (!state.quests["h_rapport"] && rapportOkCh5()){
		var reste = [];
		if (!state.quests["h_aube"]) reste.push(c.assaut ? "les traces de l'aube ne sont pas toutes relues et réparées" : "l'aube n'est pas encore passée");
		if (!state.quests["h_pierre_finale"]) reste.push("la Pierre d'Inspection n'a pas encore dépassé 85 après l'aube");
		if (!reste.length && rapportScoresOkCh5()) state.complete("h_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== "scores"){ c.rapportAttente = "scores"; say("Laurent lit ton rapport et fronce les sourcils. « Les scores ne sont pas ceux de la Pierre. Avant : " + c.scoreDepart + ". Après : celui de ta dernière inspection. Écris les vrais chiffres. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le garde sur la Pierre. « Bien écrit. Mais je ne contresigne pas une inspection inachevée : " + reste.join(", et ") + ". Finis, et je signe. »");
		}
	}
	if (state.quests["h_rapport"] && !state.has("victoireCh5")) state.applyState("victoireCh5");
}
function rapportCh5(){ var it = BoiteDuBastion.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function rapportOkCh5(){
	var t = rapportCh5();
	if (t === null) return false;
	var b = sansAccentCh5(t);
	return ["constat", "mesure", "avant", "apres", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function nombreDans(texte, n){ return n !== null && n !== undefined && new RegExp("(^|[^0-9])" + n + "([^0-9]|$)").test(String(texte)); }
function rapportScoresOkCh5(){
	var c = sCh5(), t = rapportCh5();
	return t !== null && nombreDans(t, c.scoreDepart) && (nombreDans(t, c.scoreFinal) || nombreDans(t, c.scoreDernier));
}
function sansAccentCh5(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

/* Le monde réagit, à chaque tour. */
function verifierChapitre5(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch5Ouvert", !!state.quests["d_fin"] || state.has("ch5Direct"));
	if (!state.has("ch5Ouvert")) return;
	if (!state.ch5 || typeof state.ch5 !== "object") state.ch5 = etatCh5Initial();
	var c = state.ch5;
	if (!c.base) c.base = baseNuitCh5();
	// Le passage vers le hall (aussi pour une vieille sauvegarde faite avant ce chapitre).
	var parent = state.has("ch4Ouvert") || !state.has("ch5Direct") ? Academie : SalleServeurs;
	if (parent.children.indexOf(HallBastion) === -1) relier(parent, HallBastion);
	declarerMondeBastion();
	seminerCh5();
	supprimablesCh5();
	avancerHorlogeCh5();
	validerCh5();
}
/* Ce qui se sème une seule fois, à l'ouverture : les échecs de connexion (faillock), un bannissement de trop (fail2ban). */
function seminerCh5(){
	var c = sCh5();
	if (c.seme) return;
	c.seme = true;
	var t = maintenantBastion();
	for (var i = 0; i < 4; i++) ajouterEchecConnexion(H5, "secretariat", IP_SECRETARIAT, t - 60000 * (8 - i));
	for (var j = 0; j < 2; j++) ajouterEchecConnexion(H5, "vint", IP_VINT, t - 3600000 - 60000 * j);
}

function etatChapitre5(nom){
	switch (nom){
		case "ch5Ouvert":
			if (!state.ch5 || typeof state.ch5 !== "object") state.ch5 = etatCh5Initial();
			if (!state.ch5.base) state.ch5.base = baseNuitCh5();
			relier(state.has("ch4Ouvert") || !state.has("ch5Direct") ? Academie : SalleServeurs, HallBastion);
			declarerMondeBastion();
			if (!state.has("rejeuEnCours") && !state.has("ch5Direct")) say("Au fond de l'Académie, une poterne s'ouvre sur une cour pavée : le Bastion (cd Bastion). " +
				C.gris("(Radio : « Grace : la recrue ? Laurent t'attend au Bastion. L'inspection est à l'aube, et la Nuée a juré de revenir avant. »)"));
			break;
		case "victoireCh5":
			if (!state.dateVictoire6) state.dateVictoire6 = dateDuJour();
			poser(Home, CertificatBastion);
			if (!state.has("rejeuEnCours")) say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Le Bastion a tenu. Pas parce qu'il est imprenable : parce que tu sais ce qui reste. Un rapport qui avoue ce qui reste, c'est celui qu'on croit. »");
			if (!state.has("rejeuEnCours")) say(C.gris("(Ton CertificatBastion est posé dans ta Maison : cat ~/CertificatBastion. Il porte la note du chapitre 5 et son code de vérification.)"));
			break;
	}
}

/* Le refus de ssh : seulement pour notre machine (le nom sert aussi aux tests du moteur). */
function refusBastion(){
	if (!estMonBastion()) return null;
	if (!state.has("ch5Ouvert")) return "ssh: Could not resolve hostname bastion: Name or service not known\n" + C.gris("(Ce serveur n'apparaît qu'à l'ouverture du Bastion, après l'Académie des Arcanes.)");
	var c = sCh5();
	var source = Shell.hote();
	var secours = [];
	if (source !== H5 && !portOuvertCh5(22, "tcp")) secours.push("le pare-feu bloque le port 22");
	var s = configSshEffective(H5);
	if (/^no$/i.test(s.passwordauthentication || "") && !cleEd25519Installee() && !(state.reseau && state.reseau.cles && state.reseau.cles[H5])) secours.push("le Pont-levis refuse les mots de passe et ta clé n'est pas posée");
	var users = s.allowusers ? (Array.isArray(s.allowusers) ? s.allowusers : String(s.allowusers).split(/\s+/)) : null;
	if (users && users.indexOf(JOUEUR) === -1) secours.push("AllowUsers ne te nomme pas");
	if (secours.length && !state.has("rejeuEnCours")){
		say(C.jaune("ssh: connect to host bastion port 22: refusé (" + secours.join(" ; ") + ").") + "\n" +
			"Vint soupire et te tend le câble de la console de secours, branchée sur la machine elle-même. « Une fois. Répare, et ne te coupe plus la branche sous les pieds. »");
		c.consoleSecours = (c.consoleSecours || 0) + 1;
	}
	return null;
}

/* Une paire de clés SSH pour qui n'en a pas : un départ direct (chapitre 4 ou 5) n'a pas fait la Crypte, où on la fabrique.
   Sans elle, le Pont-levis (PasswordAuthentication no) fermerait la porte derrière le joueur. Même fabrique que ssh-keygen. */
function clesPourLeBastion(){
	var dossier = Home.getChildFromName(".ssh");
	if (dossier !== -1 && dossier.getItemFromName("id_ed25519.pub") !== -1) return false;
	if (typeof texteClePrivee !== "function" || typeof texteClePublique !== "function") return false;
	if (dossier === -1){
		dossier = new Room(".ssh", "Le dossier de tes clés SSH. Rien que les tiennes.", "item_locker.gif");
		dossier.owner = JOUEUR;
		dossier.mode = "rwx------";
		if (typeof libererNom === "function") libererNom(Home, ".ssh");
		link_rooms(Home, dossier);
	}
	var privee = new Item("id_ed25519", texteClePrivee(), "item_locker.gif").droits("rw-------", JOUEUR);
	var publique = new Item("id_ed25519.pub", texteClePublique(), "item_locker.gif").droits("rw-r--r--", JOUEUR);
	dossier.addItem(privee);
	dossier.addItem(publique);
	state.clePublique = publique.getText();
	return true;
}

/* Le joueur choisit son identifiant à la connexion, APRÈS la construction du monde : la machine bastion a été montée
   avec l'identifiant provisoire (« apprenti »). Quand il change, on le remplace partout sur bastion (comptes, groupes,
   dossier personnel, fichiers, connexions), comme si l'administrateur avait créé le compte au bon nom. */
function renommerJoueurBastion(ancien, nouveau){
	if (!ancien || !nouveau || ancien === nouveau || typeof racineHote !== "function") return;
	var racine = racineHote(H5);
	if (!racine) return;
	var motif = new RegExp("(^|[^A-Za-z0-9_.-])" + ancien.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Za-z0-9_.-]|$)", "gm");
	var vus = [];
	(function visiter(lieu){
		if (!lieu || vus.indexOf(lieu) > -1) return;
		vus.push(lieu);
		if (lieu.room_name === ancien) lieu.room_name = nouveau;
		(lieu.items || []).forEach(function(it){
			var t = it.getText ? it.getText() : null;
			if (typeof t === "string" && motif.test(t)){ motif.lastIndex = 0; it.cmd_text["less"] = t.replace(motif, "$1" + nouveau); }
			motif.lastIndex = 0;
		});
		(lieu.children || []).forEach(visiter);
	})(racine);
	if (typeof CONNEXIONS_BASTION !== "undefined" && CONNEXIONS_BASTION[H5]) CONNEXIONS_BASTION[H5].forEach(function(c){ if (c.qui === ancien) c.qui = nouveau; });
}
if (typeof adopterPrenom === "function"){
	var ADOPTER_PRENOM_AVANT_CH5 = adopterPrenom;
	adopterPrenom = function(){
		var ancien = JOUEUR;
		var r = ADOPTER_PRENOM_AVANT_CH5.apply(this, arguments);
		try { renommerJoueurBastion(ancien, JOUEUR); } catch (e){}
		return r;
	};
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (e.room === HallBastion && !state.quests["h_entree"] && state.has("ch5Ouvert")){
		if (clesPourLeBastion() && !state.has("rejeuEnCours")){
			say(C.gris("(Grace, à la radio : « Tu n'as pas encore de clés SSH, tu n'es pas passé par la Crypte. Je t'en ai fabriqué une paire dans ~/.ssh, comme le ferait ssh-keygen : id_ed25519, la privée, à garder ; id_ed25519.pub, la publique, à poser sur bastion avec ssh-copy-id. »)"));
		}
		state.debutChapitre6 = state.tempsMs;
		if (state.ch5){ state.ch5.dernierNb = state.nbCommandes; if (!state.ch5.base) state.ch5.base = baseNuitCh5(); }
		state.complete("h_entree");
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch5Ouvert")) return;
	if (e.item === LaurentBastion) state.set("ch5LaurentLu");
	if (e.item === MissionBastion) state.set("ch5MissionLue");
});
GameEvents.addListener("lynis", function(e){
	if (!bastionOuvert() || e.hote !== H5 || !e.sudo) return;
	var c = sCh5();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = e.score;
	c.scoreDernier = e.score;
	if (c.assaut) c.scoreFinalCandidat = e.score;
});
GameEvents.addListener("sshd", function(e){
	if (!bastionOuvert() || e.hote !== H5) return;
	if (e.action === "test" && e.ok) sCh5().sshTeste = signatureDossier("/etc/ssh");
});
GameEvents.addListener("sshReload", function(e){
	if (!bastionOuvert() || e.hote !== H5 || !e.ok) return;
	var c = sCh5(), sig = signatureDossier("/etc/ssh");
	c.sshApplique = sig;
	c.sshAppliqueTeste = c.sshTeste === sig ? sig : null;
});
GameEvents.addListener("apachectl", function(e){
	if (!bastionOuvert() || e.hote !== H5) return;
	if (e.action === "configtest" && e.ok) sCh5().apacheTeste = signatureDossier("/etc/apache2");
});
GameEvents.addListener("apacheReload", function(e){
	if (!bastionOuvert() || e.hote !== H5 || !e.ok) return;
	var c = sCh5(), sig = signatureDossier("/etc/apache2");
	c.apacheApplique = sig;
	c.apacheAppliqueTeste = c.apacheTeste === sig ? sig : null;
});
GameEvents.addListener("aide", function(e){
	if (!bastionOuvert() || e.hote !== H5) return;
	var c = sCh5();
	if (e.action === "check" && baseAideCh5()) c.aideVerifiee = true;
	if (e.action === "check" && c.assaut) c.aubeIntegrite = true;
});
GameEvents.addListener("ufwBastion", function(e){
	if (e.action === "status" && e.option === "verbose" && e.actif && VALIDATIONS_CH5.h_parefeu()) sCh5().parefeuVu = true;
});
GameEvents.addListener("nftBastion", function(e){
	if (e.action === "list" && VALIDATIONS_CH5.h_parefeu()) sCh5().parefeuVu = true;
});
/* Frances éprouve les Remparts depuis l'extérieur : le joueur l'imite (curl vers le port 80 refusé, depuis le hall). */
GameEvents.addListener("curl", function(e){
	if (!bastionOuvert() || !e.guet || e.hote !== H5 || Shell.hote() === H5) return;
	if (/^http:/.test(String(e.url || "")) && e.erreur && VALIDATIONS_CH5.h_parefeu() && !portOuvertCh5(80, "tcp")) sCh5().parefeuEprouve = true;
});
/* À l'aube, ce qu'on relit : les journaux (journalctl, ausearch, aureport) et l'intégrité (aide, debsums, dpkg -V). */
var APPELER_AVANT_CH5 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_CH5.apply(this, arguments);
	try {
		if (bastionOuvert() && Shell.hote() === H5 && sCh5().assaut){
			var t = typeof sortie === "string" ? sansAnsi(sortie) : "";
			if ((nom === "journalctl" && /bastion-garde|assaut/.test(t)) || ((nom === "ausearch" || nom === "aureport") && /nuee|USER_AUTH|auth/i.test(t))) sCh5().aubeJournaux = true;
			if ((nom === "debsums" || nom === "dpkg" && args.indexOf("-V") > -1 || nom === "rkhunter") && io && io.sudo) sCh5().aubeIntegrite = true;
		}
	} catch (e){ /* une lecture ne doit jamais casser un sort */ }
	return sortie;
};

/* ------------------------------------------------------------------ */
/* Le hall : Laurent, la mission, la Pierre, la radio, l'horloge, Frances */
/* ------------------------------------------------------------------ */

var LaurentBastion = new Item("Laurent", "", "item_mysteryman.gif").personnage();
LaurentBastion.enseigne.apply(LaurentBastion, SORTS_DE_LAURENT_CH5);
HallBastion.addItem(LaurentBastion);
var MissionBastion = objetCh5(HallBastion, "Mission",
	"ORDRE DE MISSION · LE BASTION\n\n" +
	"Le serveur bastion vient d'être installé « par défaut » : comptes ouverts, services bavards, rien de surveillé.\n" +
	"L'inspection de sécurité de l'école a lieu à l'aube. La Nuée a juré de revenir avant.\n\n" +
	"1. Consulter la Pierre d'Inspection (sudo lynis audit system, sur bastion) : le score de départ.\n" +
	"2. Fermer les douze tours, une par mur : chaque maître explique son mur, à toi de le dresser sur bastion.\n" +
	"3. À l'aube (6 h), relire la Tour de Guet et les Sceaux, réparer ce que la Nuée aura laissé.\n" +
	"4. La Pierre au-dessus de 85.\n" +
	"5. Le rapport d'inspection, ~/bastion/rapport.txt (constats, mesures, score avant, score après, ce qui reste),\n" +
	"   déposé dans la BoiteDeLaurent du hall.\n\n" +
	"Règle d'or : on teste avant de recharger (sshd -t, apachectl configtest), et on ne se coupe jamais soi-même.\n" +
	"rempart (une commande du jeu) montre le plan des tours.",
	"item_manuscript.gif");
var PierreDInspection = new Item("PierreDInspection", "", "item_pierre.gif").droits("rw-r--r--", "root");
HallBastion.addItem(PierreDInspection);
var RadioBastion = new Item("Radio", "", "item_workstation.gif");
HallBastion.addItem(RadioBastion);
var HorlogeBastion = new Item("Horloge", "", "item_sign.gif").droits("rw-r--r--", "root");
HallBastion.addItem(HorlogeBastion);
var FrancesBastion = new Item("Frances", "", "item_frances.gif").personnage();
HallBastion.addItem(FrancesBastion);
var CertificatBastion = new Item("CertificatBastion", "", "item_manuscript.gif");

function texteHorlogeCh5(){
	var c = sCh5(), l = "L'HORLOGE DE LA NUIT\n\nIl est " + heureCh5() + ".\n";
	if (c.assaut) return l + "\nL'aube est passée : la Nuée a éprouvé les murs. L'inspecteur arrive.";
	return l + "\nL'aube (6 h) dans " + Math.max(0, minutesAvantAube()) + " min : la Nuée éprouvera chaque mur encore ouvert.\n" +
		(c.horloge < QUATRE_HEURES_CH5 ? "Défi d'honneur de Laurent : les douze tours fermées avant 4 h (encore " + (QUATRE_HEURES_CH5 - c.horloge) + " min)." : "4 h est passé.");
}
function textePierreCh5(){
	if (!state.has("ch5Ouvert")) return "Une pierre grise, froide, muette.";
	var e = null;
	try { e = etatGuet().hotes[H5] ? etatGuet().hotes[H5].lynis : null; } catch (x){ e = null; }
	var c = sCh5();
	if (!e) return "LA PIERRE D'INSPECTION\n\nElle est muette : personne ne l'a encore consultée.\n" + C.gris("(Sur la machine : ssh bastion, puis sudo lynis audit system. Le vrai outil s'appelle lynis.)");
	var manque = (e.controles || []).filter(function(x){ return !x.ok; }).map(function(x){
		var ctl = CONTROLES_LYNIS.filter(function(k){ return k.id === x.id; })[0];
		return "  " + (ctl && ctl.gravite === "warning" ? "! " : "* ") + (ctl ? ctl.conseil : x.id) + " [" + idAffiche(x.id) + "]";
	}).filter(function(x, i, t){ return t.indexOf(x) === i; });
	return "LA PIERRE D'INSPECTION\n\nDernier score : " + e.score + " sur 100" + (c.scoreDepart !== null && c.scoreDepart !== undefined ? " (score de départ : " + c.scoreDepart + ")" : "") + ".\n" +
		"Objectif de l'inspection : plus de 85.\n\n" + (manque.length ? "Ce qui manque encore (au dernier passage) :\n" + manque.join("\n") : "Rien ne manque au dernier passage.") +
		"\n\n" + C.gris("(La Pierre ne se met à jour qu'en la consultant : sudo lynis audit system, sur bastion.)");
}
function texteRadioCh5(){
	var q = QUETES_CH5.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : inspection passée, rapport contresigné. Le Bastion tient debout, et la Nuée est repartie bredouille. Beau travail, la recrue. »";
	var c = sCh5();
	var heure = "Il est " + heureCh5() + (c.assaut ? ", l'aube est passée. " : ", l'aube à 6 h. ");
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH5[q.id] || "Je te suis.") + (METIER_CH5[q.id] ? " " + METIER_CH5[q.id] : "") + " »";
}
function texteFrancesCh5(){
	var ouvertes = TOURS_CH5.filter(function(t){ return !tourFermeeCh5(t.cle); });
	var c = sCh5();
	if (state.quests["h_rapport"]) return "Frances s'est assise sur le rebord de la Pierre.\n\n« Douze murs. Je les ai tous éprouvés, et ils ont tous tenu. L'an dernier, j'aurais cherché la faille. Cette nuit, j'ai seulement vérifié ton travail. C'est mieux comme ça. »";
	if (c.assaut){
		var restes = tracesRestantesCh5();
		if (restes.length) return "Frances montre le registre de la Tour de Guet.\n\n« L'aube est passée. Il reste des traces de la Nuée dans " + restes.map(function(k){ return tourCh5(k).titre; }).join(", ") + ". Retrouve-les dans les journaux, et répare. »";
		return "Frances hoche la tête.\n\n« L'aube est passée, et il ne reste aucune trace. Maintenant, la Pierre, puis le rapport pour Laurent. »";
	}
	if (!ouvertes.length) return "Frances repose son carnet.\n\n« J'ai éprouvé les douze murs : tous tiennent. Il ne reste qu'à attendre l'aube. Relève les défis des maîtres en attendant. »";
	return "Frances passe derrière toi, un carnet à la main. Elle éprouve chaque mur, sans rien casser : elle regarde seulement s'il tient.\n\n" +
		"« Cèdent encore : " + ouvertes.map(function(t){ return t.titre; }).join(", ") + ". »\n\n" +
		(toursFermeesCh5().length ? "« Tiennent déjà : " + toursFermeesCh5().map(function(t){ return t.titre; }).join(", ") + ". »" : "« Aucun ne tient encore. Commence par la Pierre, puis par la tour que tu veux. »");
}
function texteLaurentCh5(){
	if (state.quests["h_rapport"]) return "Laurent tient ton rapport, contresigné à l'encre verte.\n\n« L'inspecteur est reparti avec un sourire. Mesurer, durcir, vérifier, détecter, documenter : tu as fait cette nuit le travail d'une équipe. " +
		"Ton CertificatBastion t'attend dans ta Maison. Et les défis des maîtres restent ouverts. »";
	return "Laurent est debout près de la Pierre d'Inspection, une lanterne à la main.\n\n" +
		"« Le Bastion, c'est le serveur bastion : un Debian neuf, installé par défaut. Par défaut, ça veut dire ouvert de partout. L'inspection est à l'aube, et la Nuée a juré de revenir avant.\n\n" +
		"Douze tours, douze murs, un maître par tour. Chacun t'explique son mur ; à toi de le dresser sur la machine. Frances passera derrière toi pour éprouver chaque mur. " +
		"Commence par consulter la Pierre (sudo lynis audit system, sur bastion) : c'est ton score de départ.\n\n" +
		"Deux défis d'honneur : les douze tours fermées avant 4 h, et finir sans acheter un seul indice. Et une règle : on teste avant de recharger, et on ne se coupe jamais soi-même. " +
		"Tape rempart quand tu veux voir le plan. »";
}
texteVivant(HorlogeBastion, texteHorlogeCh5);
texteVivant(PierreDInspection, textePierreCh5);
texteVivant(RadioBastion, texteRadioCh5);
texteVivant(FrancesBastion, texteFrancesCh5);
texteVivant(LaurentBastion, texteLaurentCh5);
texteVivant(CertificatBastion, function(){ return state.has("victoireCh5") ? state.texteDuCertificat6() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat6 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre6 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH5.length;
	var secFaites = QUETES_SECONDAIRES_CH5.filter(function(q){ return this.quests[q.id]; }, this).length;
	var c = this.ch5 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DU BASTION (DURCISSEMENT LINUX)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir, en une nuit, durci un serveur Debian installé par\n" +
		"  défaut : comptes, sudo, SSH, services, pare-feu, droits, noyau,\n" +
		"  démarrage, serveur web et TLS, audit, intégrité, protections ;\n" +
		"  puis relu les traces de l'aube et rédigé le rapport d'inspection,\n" +
		"  le tout en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 5  : " + this.xpNet(6) + " XP sur " + this.xpMax6() + "\n" +
		"  NOTE                 : " + this.noteTexte(6) + "\n" +
		"  Mention              : " + this.mention(6) + "\n" +
		"  Pierre d'Inspection  : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " à l'inspection\n" +
		"  Sorts du durcissement: " + ORDRE_DES_SORTS_6.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_6.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus6 ? this.nbIndices(6) + " (-" + this.malus6 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat6() + "\n" +
		"==================================";
};
GameState.prototype.codeDuCertificat6 = function(){
	var f = this.compteursFiges(6, this.xpNet(6), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre6 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(6), max: this.xpMax6(), note: this.note(6),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(6), chapitre: 6,
		date: this.dateVictoire6 || dateDuJour(), graine: PROFIL.graine
	});
};

/* Le monde est de nouveau figé : ce que le joueur crée ensuite n'a plus d'identifiant fixe. */
World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 5 » ou la Lettre de l'Inspection        */
/* ------------------------------------------------------------------ */

/* Le socle des chapitres précédents est réputé acquis (renfort), sans XP. Les sorts du chapitre 5, eux, s'apprennent auprès des maîtres. */
function socleCh5Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}

function commencerChapitre5(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh5Acquis();
	// Avec le socle (rm, mkdir...), le premier sort appris validerait une étape du chapitre 1, avec un message hors de propos : on la range ici, sans bruit.
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch5Direct");
	PROFIL.chapitre = 5;
	enregistrerProfil();
	if (!state.ch5 || typeof state.ch5 !== "object") state.ch5 = etatCh5Initial();
	state.applyState("ch5Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(HallBastion);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre6 = state.tempsMs;
	state.ch5.dernierNb = state.nbCommandes;
	if (typeof montrerImage === "function") montrerImage(HallBastion.room_pic, "Bastion");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 5 : LE BASTION")) + "\n\n" +
		"Quelques jours après la nuit de la Nuée, l'école passe une inspection de sécurité, à l'aube. Laurent te confie le Bastion : " +
		"un serveur Debian neuf, installé « par défaut », donc ouvert de partout. La Nuée a juré de revenir avant l'inspecteur.\n\n" +
		"Tu es dans le hall du Bastion. " + C.vert("cat Laurent") + ", puis " + C.vert("cat Mission") + ". Grace te guide à la radio, Frances éprouve tes murs.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, rempart pour le plan des tours. L'horloge file vers l'aube."));
	return true;
}
