/**
 * PortAube.js : les machines de l'île de Port-Aube (chapitre 7 pour le joueur, numéro interne 8).
 *
 * Les bâtisseurs ont monté les maisons de la cité : des serveurs Debian 12 tout neufs, installés, câblés, mais vides.
 * Ce fichier pose chacun d'eux comme une machine modélisée (SortsMachines.js : disques, processus, systemd, journaux),
 * avec ses fichiers d'origine, ses comptes, ses unités et ses paquets, et l'horloge de la journée (7 h, trois minutes
 * par commande, la marée de 19 h). Les services lisent leur configuration sur ce disque (SortsIle*.js).
 *
 *   noms        10.0.70.53   le DNS primaire (BIND)                   la Maison des Noms (Badis)
 *   phare       10.0.70.54   le DNS secondaire, la zone inverse        le Phare-Relais (Maeva) ; le pont sous la mer (annexe)
 *   poste       10.0.70.25   Postfix et Dovecot, les clés DKIM         la Poste (Younes), le Bureau des Lettres (Syrine)
 *   greniers    10.0.70.20   les dossiers de la cité (NFS), borg       les Greniers (Noam)
 *   halle       10.0.70.45   Samba                                     la Halle d'échange (Zélia) ; le dépôt des devoirs (annexe)
 *   registre    10.0.70.38   l'annuaire LDAP (slapd)                   le Grand Registre (Kamal)
 *   quai        10.0.70.100  le poste du premier étudiant (sssd, autofs)   les Portes de la cité (Lamia)
 *   forge       10.0.70.43   l'autorité de certification (openssl)     la Forge des Sceaux (Miguel)
 *   arche       10.0.70.22   le dépôt des sauvegardes (borg)           l'Arche (Amina)
 *   imprimerie, bibliotheque, rive : les machines des quêtes annexes.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* L'horloge de la journée : 7 h, trois minutes par commande            */
/* ------------------------------------------------------------------ */

var PAS_HORLOGE_CH7 = 3;
var TEMPETE_CH7 = 420;      // 7 h + 420 min = 14 h : la Tempête
var MAREE_CH7 = 720;        // 7 h + 720 min = 19 h : la marée, le navire
var DATE_OUVERTURE_CH7 = (function(){ var d = new Date(); d.setHours(7, 0, 0, 0); return d.getTime(); })();

function etatCh7Initial(){
	return {
		horloge: 0, dernierNb: null, base: null, heureAnnoncee: 7,
		tempete: false, tempeteDebut: null, incidentsTempete: {},
		maree: false, mareeDebut: null, incidentsMaree: {}, mareeEnAvance: false,
		baties: {}, vus: {}, scoreDepart: null, scoreDernier: null, scoreFinal: null, scoreFinalCandidat: null
	};
}
function sCh7(){ return (typeof state !== "undefined" && state && state.ch7 && typeof state.ch7 === "object") ? state.ch7 : etatCh7Initial(); }
function maintenantCh7(){ var c = sCh7(); return (c.base || DATE_OUVERTURE_CH7) + (c.horloge || 0) * 60000; }
function ileOuverte(){ return typeof state !== "undefined" && state && state.has && state.has("ch7Ouvert") && !(typeof examenEnCours === "function" && examenEnCours()); }

/* ------------------------------------------------------------------ */
/* Les adresses de l'île                                               */
/* ------------------------------------------------------------------ */

var IP_ILE = { noms: "10.0.70.53", phare: "10.0.70.54", poste: "10.0.70.25", greniers: "10.0.70.20", halle: "10.0.70.45", registre: "10.0.70.38",
	quai: "10.0.70.100", forge: "10.0.70.43", arche: "10.0.70.22", imprimerie: "10.0.70.31", bibliotheque: "10.0.70.73", rive: "10.0.92.77" };
var RESEAU_ILE = "10.0.70.0/24";
var MAISONS_MACHINES = ["noms", "phare", "poste", "greniers", "halle", "registre", "quai", "forge", "arche"];
var MACHINES_ANNEXES_ILE = ["imprimerie", "bibliotheque", "rive"];
/* Les bâtisseurs (leur compte dans le Registre) : uid, et la maison qu'ils ont montée. */
var BATISSEURS_ILE = [["badis", 10001, "Badis"], ["maeva", 10002, "Maeva"], ["younes", 10003, "Younes"], ["syrine", 10004, "Syrine"], ["noam", 10005, "Noam"],
	["zelia", 10006, "Zélia"], ["kamal", 10007, "Kamal"], ["lamia", 10008, "Lamia"], ["miguel", 10009, "Miguel"], ["amina", 10010, "Amina"]];
var GID_BATISSEURS = 10000, GID_PROMO = 10100;
/* L'adresse hors de l'île vers laquelle pointe le phare noir (le cliffhanger) : un réseau de documentation, qui n'est à personne. */
var IP_PHARE_NOIR = "203.0.113.66";

function lieuDuChapitre8(lieu){ lieu.chapitre = 8; return lieu; }
function texteHostsIle(h){
	var l = ["127.0.0.1\tlocalhost", "127.0.1.1\t" + h + "." + DOMAINE_ILE + " " + h, ""];
	MAISONS_MACHINES.concat(MACHINES_ANNEXES_ILE).forEach(function(m){ if (m !== "rive") l.push(IP_ILE[m] + "\t" + m + "." + DOMAINE_ILE + "\t" + m); });
	l.push(IP_ILE.rive + "\trive.ancien-campus.lan\trive");
	l.push("", "# The following lines are desirable for IPv6 capable hosts", "::1     localhost ip6-localhost ip6-loopback", "ff02::1 ip6-allnodes", "ff02::2 ip6-allrouters");
	return l.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Les comptes d'une machine                                           */
/* ------------------------------------------------------------------ */

var COMPTES_SYSTEME_ILE = [["daemon", 1, 1, "/usr/sbin"], ["bin", 2, 2, "/bin"], ["sys", 3, 3, "/dev"], ["sync", 4, 65534, "/bin"], ["man", 6, 12, "/var/cache/man"],
	["mail", 8, 8, "/var/mail"], ["www-data", 33, 33, "/var/www"], ["backup", 34, 34, "/var/backups"], ["nobody", 65534, 65534, "/nonexistent"],
	["_apt", 42, 65534, "/nonexistent"], ["systemd-network", 998, 998, "/"], ["messagebus", 100, 107, "/nonexistent"], ["sshd", 101, 65534, "/run/sshd"]];
/* extra : [[nom, uid, gid, gecos, home, shell]] ; groupes : [[nom, gid, membres]] */
function comptesIle(h, extra, groupes){
	var p = ["root:x:0:0:root:/root:/bin/bash"], s = ["root:*:20300:0:99999:7:::"], g = ["root:x:0:"];
	COMPTES_SYSTEME_ILE.forEach(function(c){ p.push(c[0] + ":x:" + c[1] + ":" + c[2] + ":" + c[0] + ":" + c[3] + ":/usr/sbin/nologin"); s.push(c[0] + ":*:20300:0:99999:7:::"); });
	(extra || []).forEach(function(c){ p.push(c[0] + ":x:" + c[1] + ":" + c[2] + ":" + (c[3] || "") + ":" + (c[4] || "/nonexistent") + ":" + (c[5] || "/usr/sbin/nologin")); s.push(c[0] + ":" + (c[6] || "*") + ":20300:0:99999:7:::"); });
	p.push(JOUEUR + ":x:1000:1000:Architecte de Port-Aube,,,:/home/" + JOUEUR + ":/bin/bash");
	s.push(JOUEUR + ":$y$j9T$" + hexDe("ile-" + h + "-sel", 22) + "$" + hexDe("ile-" + h + "-mdp", 43) + ":20380:0:99999:7:::");
	g.push("daemon:x:1:", "bin:x:2:", "sys:x:3:", "adm:x:4:" + JOUEUR, "mail:x:8:", "man:x:12:", "www-data:x:33:", "backup:x:34:", "sudo:x:27:" + JOUEUR, "staff:x:50:",
		"users:x:100:" + JOUEUR, "nogroup:x:65534:", "systemd-journal:x:999:", "systemd-network:x:998:", "messagebus:x:107:", JOUEUR + ":x:1000:");
	(groupes || []).forEach(function(x){ g.push(x[0] + ":x:" + x[1] + ":" + (x[2] || "")); });
	return { passwd: p.join("\n") + "\n", shadow: s.join("\n") + "\n", group: g.join("\n") + "\n" };
}

/* ------------------------------------------------------------------ */
/* Les unités systemd des paquets                                      */
/* ------------------------------------------------------------------ */

function uniteIle(desc, service, install){
	return "[Unit]\nDescription=" + desc + "\n" + (service.unit || "After=network.target\n") + "\n[Service]\n" + service.texte + "\n\n[Install]\n" + (install || "WantedBy=multi-user.target") + "\n";
}
var UNITES_ILE = {
	"ssh.service": uniteIle("OpenBSD Secure Shell server", { texte: "EnvironmentFile=-/etc/default/ssh\nExecStartPre=/usr/sbin/sshd -t\nExecStart=/usr/sbin/sshd -D $SSHD_OPTS\nExecReload=/usr/sbin/sshd -t\nExecReload=/bin/kill -HUP $MAINPID\nKillMode=process\nRestart=on-failure\nRestartPreventExitStatus=255\nType=notify\nRuntimeDirectory=sshd\nRuntimeDirectoryMode=0755", unit: "Documentation=man:sshd(8) man:sshd_config(5)\nAfter=network.target auditd.service\nConditionPathExists=!/etc/ssh/sshd_not_to_be_run\n" }, "WantedBy=multi-user.target\nAlias=sshd.service"),
	"cron.service": uniteIle("Regular background program processing daemon", { texte: "EnvironmentFile=-/etc/default/cron\nExecStart=/usr/sbin/cron -f -P $EXTRA_OPTS\nIgnoreSIGPIPE=false\nKillMode=process\nRestart=on-failure", unit: "Documentation=man:cron(8)\nAfter=remote-fs.target nss-user-lookup.target\n" }),
	"systemd-journald.service": "[Unit]\nDescription=Journal Service\n\n[Service]\nExecStart=/lib/systemd/systemd-journald\n",
	"named.service": uniteIle("BIND Domain Name Server", { texte: "Type=forking\nEnvironmentFile=-/etc/default/named\nExecStart=/usr/sbin/named $OPTIONS\nExecReload=/usr/sbin/rndc reload\nExecStop=/usr/sbin/rndc stop", unit: "Documentation=man:named(8)\nAfter=network.target\nWants=nss-lookup.target\nBefore=nss-lookup.target\n" }, "WantedBy=multi-user.target\nAlias=bind9.service"),
	"postfix.service": uniteIle("Postfix Mail Transport Agent", { texte: "Type=forking\nPIDFile=/var/spool/postfix/pid/master.pid\nExecStart=/usr/sbin/postfix start\nExecReload=/usr/sbin/postfix reload\nExecStop=/usr/sbin/postfix stop", unit: "Documentation=man:postfix(1)\nAfter=network.target\n" }),
	"dovecot.service": uniteIle("Dovecot IMAP/POP3 email server", { texte: "Type=simple\nExecStart=/usr/sbin/dovecot -F\nExecReload=/usr/bin/doveadm reload\nExecStop=/usr/bin/doveadm stop\nPrivateTmp=true\nNonBlocking=yes\nProtectSystem=full\nProtectHome=no\nPrivateDevices=true", unit: "Documentation=man:dovecot(1)\nDocumentation=https://doc.dovecot.org/\nAfter=local-fs.target network-online.target\n" }),
	"nfs-server.service": uniteIle("NFS server and services", { texte: "Type=forking\nExecStartPre=-/usr/sbin/exportfs -r\nExecStart=/usr/sbin/rpc.nfsd\nExecStop=/usr/sbin/rpc.nfsd 0\nExecStopPost=/usr/sbin/exportfs -au\nExecReload=-/usr/sbin/exportfs -r", unit: "Requires=network.target proc-fs-nfsd.mount\nAfter=network-online.target local-fs.target\nWants=network-online.target\n" }),
	"smbd.service": uniteIle("Samba SMB Daemon", { texte: "Type=notify\nPIDFile=/run/samba/smbd.pid\nLimitNOFILE=16384\nEnvironmentFile=-/etc/default/samba\nExecStart=/usr/sbin/smbd --foreground --no-process-group $SMBDOPTIONS\nExecReload=/bin/kill -HUP $MAINPID\nLimitCORE=infinity", unit: "Documentation=man:smbd(8) man:samba(7) man:smb.conf(5)\nWants=network-online.target\nAfter=network.target network-online.target nmbd.service winbind.service\n" }),
	"slapd.service": uniteIle("LSB: OpenLDAP standalone server (Lightweight Directory Access Protocol)", { texte: "Type=forking\nRestart=no\nTimeoutSec=5min\nIgnoreSIGPIPE=no\nKillMode=process\nGuessMainPID=no\nRemainAfterExit=yes\nSuccessExitStatus=5 6\nExecStart=/usr/sbin/slapd -h ${SLAPD_SERVICES} -g openldap -u openldap -F /etc/ldap/slapd.d\nEnvironmentFile=-/etc/default/slapd", unit: "Documentation=man:systemd-sysv-generator(8)\nBefore=multi-user.target\nAfter=remote-fs.target network-online.target\n" }),
	"sssd.service": uniteIle("System Security Services Daemon", { texte: "Environment=DEBUG_LOGGER=--logger=files\nEnvironmentFile=-/etc/default/sssd\nExecStart=/usr/sbin/sssd -i ${DEBUG_LOGGER}\nType=notify\nNotifyAccess=main\nPIDFile=/run/sssd.pid\nCapabilityBoundingSet=CAP_IPC_LOCK CAP_CHOWN CAP_DAC_READ_SEARCH CAP_FOWNER CAP_SETGID CAP_SETUID", unit: "Before=systemd-user-sessions.service nss-user-lookup.target\nWants=nss-user-lookup.target\nStartLimitIntervalSec=50s\nStartLimitBurst=5\nConditionPathExists=|/etc/sssd/sssd.conf\nConditionDirectoryNotEmpty=|/etc/sssd/conf.d/\n" }),
	"autofs.service": uniteIle("Automounts filesystems on demand", { texte: "Type=notify\nPIDFile=/run/autofs.pid\nEnvironmentFile=-/etc/default/autofs\nExecStart=/usr/sbin/automount $OPTIONS --foreground --dont-check-daemon\nExecReload=/bin/kill -HUP $MAINPID\nKillMode=process\nTimeoutSec=180", unit: "Documentation=man:autofs(8) man:automount(8) man:auto.master(5)\nWants=network-online.target rpc-statd.service rpcbind.service\nAfter=network-online.target ypbind.service sssd.service network.target remote-fs.target\n" }),
	"cups.service": uniteIle("CUPS Scheduler", { texte: "ExecStart=/usr/sbin/cupsd -l\nType=notify\nRestart=on-failure", unit: "Documentation=man:cupsd(8)\nAfter=sssd.service network.target nss-user-lookup.target nslcd.service\nRequires=cups.socket\n" }, "Also=cups.socket cups.path\nWantedBy=printer.target multi-user.target"),
	"avahi-daemon.service": uniteIle("Avahi mDNS/DNS-SD Stack", { texte: "Type=dbus\nBusName=org.freedesktop.Avahi\nExecStart=/usr/sbin/avahi-daemon -s\nExecReload=/usr/sbin/avahi-daemon -r\nNotifyAccess=main", unit: "Requires=avahi-daemon.socket\n" }, "WantedBy=multi-user.target\nAlso=avahi-daemon.socket\nAlias=dbus-org.freedesktop.Avahi.service"),
	"rsync.service": uniteIle("fast remote file copy program daemon", { texte: "ExecStart=/usr/bin/rsync --daemon --no-detach\nRestart=on-failure\nProtectSystem=full\nPrivateDevices=on\nNoNewPrivileges=on", unit: "Documentation=man:rsync(1) man:rsyncd.conf(5)\nConditionPathExists=/etc/rsyncd.conf\nAfter=network.target network-online.target\n" }),
	"wg-quick@wg0.service": uniteIle("WireGuard via wg-quick(8) for wg0", { texte: "Type=oneshot\nRemainAfterExit=yes\nExecStart=/usr/bin/wg-quick up wg0\nExecStop=/usr/bin/wg-quick down wg0\nExecReload=/bin/bash -c 'exec /usr/bin/wg syncconf wg0 <(exec /usr/bin/wg-quick strip wg0)'\nEnvironment=WG_ENDPOINT_RESOLUTION_RETRIES=infinity", unit: "After=network-online.target nss-lookup.target\nWants=network-online.target nss-lookup.target\nPartOf=wg-quick.target\nDocumentation=man:wg-quick(8)\n" }, "WantedBy=multi-user.target")
};
/* Les processus de chaque service (le premier est le principal) et les ports qu'ils tiennent. */
var PROFILS_ILE = {
	"ssh.service": function(){ return [{ comm: "sshd", cmd: "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups", cpu: 0, rss: 8400, ports: [22] }]; },
	"cron.service": function(){ return [{ comm: "cron", cmd: "/usr/sbin/cron -f -P", cpu: 0, rss: 2600 }]; },
	"named.service": function(){ return [{ comm: "named", cmd: "/usr/sbin/named -u bind", user: "bind", cpu: 0.2, rss: 41200, ports: [53, 953], threads: 6 }]; },
	"postfix.service": function(){ return [{ comm: "master", cmd: "/usr/lib/postfix/sbin/master -w", cpu: 0, rss: 4800, ports: [25] },
		{ comm: "qmgr", cmd: "qmgr -l -t unix -u", user: "postfix", cpu: 0, rss: 7300 }, { comm: "pickup", cmd: "pickup -l -t unix -u -c", user: "postfix", cpu: 0, rss: 7200 }]; },
	"dovecot.service": function(h){ return [{ comm: "dovecot", cmd: "/usr/sbin/dovecot -F", cpu: 0, rss: 3900, ports: [143, 993] }, { comm: "anvil", cmd: "dovecot/anvil", user: "dovenull", cpu: 0, rss: 2900 },
		{ comm: "log", cmd: "dovecot/log", cpu: 0, rss: 3100 }, { comm: "config", cmd: "dovecot/config", cpu: 0, rss: 4100 }]; },
	"nfs-server.service": function(){ return [{ comm: "rpc.nfsd", cmd: "/usr/sbin/rpc.nfsd", cpu: 0, rss: 1200, ports: [2049] }, { comm: "rpc.mountd", cmd: "/usr/sbin/rpc.mountd", cpu: 0, rss: 2400, ports: [20048] }]; },
	"smbd.service": function(){ return [{ comm: "smbd", cmd: "/usr/sbin/smbd --foreground --no-process-group", cpu: 0, rss: 21000, ports: [139, 445] },
		{ comm: "smbd-notifyd", cmd: "/usr/sbin/smbd --foreground --no-process-group", cpu: 0, rss: 9000 }, { comm: "smbd-cleanupd", cmd: "/usr/sbin/smbd --foreground --no-process-group", cpu: 0, rss: 8800 }]; },
	"slapd.service": function(h){ var t = lireIle(h, "/etc/default/slapd") || "", ports = [389]; if (/ldaps:\/\//.test(t)) ports.push(636);
		return [{ comm: "slapd", cmd: "/usr/sbin/slapd -h ldap:/// ldapi:///" + (ports.length > 1 ? " ldaps:///" : "") + " -g openldap -u openldap -F /etc/ldap/slapd.d", user: "openldap", cpu: 0, rss: 9600, ports: ports, threads: 4 }]; },
	"sssd.service": function(){ return [{ comm: "sssd", cmd: "/usr/sbin/sssd -i --logger=files", cpu: 0, rss: 14000 }, { comm: "sssd_be", cmd: "/usr/libexec/sssd/sssd_be --domain port-aube --uid 0 --gid 0 --logger=files", cpu: 0, rss: 30000 },
		{ comm: "sssd_nss", cmd: "/usr/libexec/sssd/sssd_nss --uid 0 --gid 0 --logger=files", cpu: 0, rss: 22000 }, { comm: "sssd_pam", cmd: "/usr/libexec/sssd/sssd_pam --uid 0 --gid 0 --logger=files", cpu: 0, rss: 19000 }]; },
	"autofs.service": function(){ return [{ comm: "automount", cmd: "/usr/sbin/automount --foreground --dont-check-daemon", cpu: 0, rss: 6100, threads: 5 }]; },
	"cups.service": function(){ return [{ comm: "cupsd", cmd: "/usr/sbin/cupsd -l", cpu: 0, rss: 12000, ports: [631] }]; },
	"avahi-daemon.service": function(){ return [{ comm: "avahi-daemon", cmd: "avahi-daemon: running [quai.local]", user: "avahi", cpu: 0, rss: 3600 }, { comm: "avahi-daemon", cmd: "avahi-daemon: chroot helper", user: "avahi", cpu: 0, rss: 1500 }]; },
	"rsync.service": function(){ return [{ comm: "rsync", cmd: "/usr/bin/rsync --daemon --no-detach", cpu: 0, rss: 2400, ports: [873] }]; }
};

/* ------------------------------------------------------------------ */
/* Le matériel d'une machine de l'île                                  */
/* ------------------------------------------------------------------ */

var GIO7 = 1073741824, MIO7 = 1048576;
function materielIle(h, options){
	options = options || {};
	var base = DATE_OUVERTURE_CH7;
	var disques = [{ nom: "vda", taille: 32 * GIO7, modele: "QEMU HARDDISK", parts: [{ nom: "vda1", taille: 31 * GIO7, partuuid: hexDe("pu" + h, 8) + "-01" }, { nom: "vda2", taille: GIO7 - MIO7 }], smart: { sain: true, realloues: 0, heures: 6, temperature: 31 } }];
	var fs = [{ source: "/dev/vda1", cible: "/", type: "ext4", taille: 31 * GIO7, inodes: 2031616, base: 2.3 * GIO7, baseInodes: 61000, uuid: hexDe("uuid-" + h, 8) + "-" + hexDe("uuid2-" + h, 4) + "-4" + hexDe("uuid3-" + h, 3) + "-8" + hexDe("uuid4-" + h, 3) + "-" + hexDe("uuid5-" + h, 12), reserve: 0.05, options: "errors=remount-ro", systeme: true },
		{ source: "tmpfs", cible: "/run", type: "tmpfs", taille: 396 * MIO7, virtuel: true, utilise: MIO7, inodes: 499000, inodesUtilises: 700, cache: true }];
	if (options.srv){
		disques.push({ nom: "vdb", taille: options.srv * GIO7, modele: "QEMU HARDDISK", parts: [{ nom: "vdb1", taille: options.srv * GIO7 - MIO7 }], smart: { sain: true, realloues: 0, heures: 6, temperature: 30 } });
		fs.push({ source: "/dev/vdb1", cible: options.cibleSrv || "/srv", type: "ext4", taille: options.srv * GIO7 - MIO7, inodes: 32604160, base: 0.4 * GIO7, baseInodes: 400, uuid: hexDe("uuid-srv-" + h, 8) + "-1d2c-4b3a-9f8e-" + hexDe("srv-" + h, 12), reserve: 0.05 });
	}
	return {
		cpus: options.cpus || 2, memoire: { total: options.memoire || 4026512, noyau: 180000, cache: 220000 }, demarrage: base - 3 * 3600000 - (condense(h) % 50) * 60000, fuseau: "Europe/Paris", derive: 0,
		demarrages: [{ idx: 0, debut: base - 3 * 3600000, noyau: "6.1.0-26-amd64" }], noyauAttendu: "6.1.0-26-amd64",
		disques: disques, raid: [], pvs: [], vgs: [], lvs: [], fs: fs, virtuels: {},
		procs: [], io: { vda: { util: 2, r: 1, w: 4 } }, sockets: { estab: 6, closed: 0, orphaned: 0, timewait: 3 },
		dpkg: { interrompu: false, casses: [], retenus: [], aConfigurer: [] }, fabricant: "Atelier de Port-Aube", modele: "Maison " + h,
		ile: options.ile ? options.ile() : {}
	};
}

/* ------------------------------------------------------------------ */
/* Poser une machine : la racine, decrireHote, declarerMachine          */
/* ------------------------------------------------------------------ */

var RACINES_ILE = {};
var DEFS_ILE = {};
function racineIle(h){ return RACINES_ILE[h] || null; }
function estMaMachineIle(h){ try { return !!(HOTES[h] && HOTES[h].arrivee && HOTES[h].arrivee() === RACINES_ILE[h]); } catch (e){ return false; } }
function refusIle(h){
	if (!estMaMachineIle(h)) return null;
	if (!state.has("ch7Ouvert")) return "ssh: Could not resolve hostname " + h + ": Name or service not known\n" + C.gris("(Cette machine est sur une île que tu ne connais pas encore : Port-Aube, au chapitre 7.)");
	return null;
}
/*
 * def : { intro, image, ip, comptes: [...], groupes: [...], unites: [[nom, actif, enabled]], paquets: { nom: version }, materiel: {...},
 *         construire: function(P, D) (les fichiers propres à la machine), annexe: bool }
 */
function poserMachineIle(h, def){
	DEFS_ILE[h] = def;
	var racine = lieuDuChapitre8(new Room(h, def.intro, def.image || "loc_baie_ile.gif"));
	racine.racineHote = h;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	if (def.annexe) racine.horsBareme = true;
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + h);
	if (typeof Machines !== "undefined") link_rooms(Machines, racine);
	RACINES_ILE[h] = racine;
	declarerHoteIle(h);
	decrireHote(h, { ip: def.ip, ouvert: true, noyau: "6.1.0-26-amd64", arrivee: function(){ return racine; }, refus: function(){ return refusIle(h); } });
	var profils = {};
	Object.keys(PROFILS_ILE).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_ILE[u](hh, M, lim); }; });
	declarerMachine(h, {
		actif: function(){ return ileOuverte() && estMaMachineIle(h); },
		maintenant: function(){ return maintenantCh7(); },
		pas: PAS_HORLOGE_CH7,
		initial: function(){ return materielIle(h, def.materiel); },
		profils: profils,
		tempsDemarrage: { "ssh.service": 214, "cron.service": 31, "named.service": 1430, "slapd.service": 712, "postfix.service": 951, "dovecot.service": 388, "smbd.service": 1204 }
	});
	construireMachineIle(h, def);
	// Les sous-dossiers de la machine ne comptent pas comme des lieux à découvrir : seule la machine compte.
	(function marquer(lieu){ lieu.children.forEach(function(c){ if (c !== lieu && c.parents[0] === lieu){ c.horsBareme = true; c.chapitre = 8; marquer(c); } }); })(racine);
	return racine;
}
function construireMachineIle(h, def){
	var P = function(chemin, texte, options){ return poserFichierHote(h, chemin, texte, options || {}); };
	var D = function(chemin, options){ return creerDossierHote(h, chemin, options || {}); };
	var c = comptesIle(h, def.comptes, def.groupes);
	P("/etc/hostname", h + "\n");
	P("/etc/hosts", texteHostsIle(h));
	P("/etc/resolv.conf", def.ip.indexOf("10.0.70.") === 0 ? "search " + DOMAINE_ILE + "\nnameserver " + IP_ILE.noms + "\nnameserver " + IP_ILE.phare + "\n" : "search ancien-campus.lan\nnameserver 10.0.92.53\n");
	P("/etc/debian_version", "12.7\n");
	P("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"12\"\nVERSION=\"12 (bookworm)\"\nVERSION_CODENAME=bookworm\nID=debian\n");
	P("/etc/passwd", c.passwd);
	P("/etc/shadow", c.shadow, { mode: "rw-r-----" });
	P("/etc/group", c.group);
	P("/etc/nsswitch.conf", "# /etc/nsswitch.conf\n#\n# Example configuration of GNU Name Service Switch functionality.\n# If you have the `glibc-doc-reference' and `info' packages installed, try:\n# `info libc \"Name Service Switch\"' for information about this file.\n\n" +
		"passwd:         files" + (def.sss ? " sss" : "") + " systemd\ngroup:          files" + (def.sss ? " sss" : "") + " systemd\nshadow:         files" + (def.sss ? " sss" : "") + "\ngshadow:        files\n\n" +
		"hosts:          files dns\nnetworks:       files\n\nprotocols:      db files\nservices:       db files" + (def.sss ? " sss" : "") + "\nethers:         db files\nrpc:            db files\n\nnetgroup:       nis" + (def.sss ? " sss" : "") + "\n" + (def.sss ? "automount:      sss files\n" : ""));
	P("/etc/ssh/sshd_config", SSHD_CONFIG_DEBIAN);
	D("/etc/ssh/sshd_config.d");
	P("/etc/ssh/ssh_host_ed25519_key.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + btoa(hexDe("hote-" + h, 24)).substring(0, 43) + " root@" + h + "\n");
	P("/etc/ssh/ssh_host_ed25519_key", "-----BEGIN OPENSSH PRIVATE KEY-----\n(clé privée de l'hôte)\n-----END OPENSSH PRIVATE KEY-----\n", { mode: "rw-------" });
	P("/etc/ssl/certs/ca-certificates.crt", BUNDLE_SYSTEME_ILE);
	D("/usr/local/share/ca-certificates");
	D("/etc/ssl/private", { mode: "rwx--x---" });
	P("/usr/sbin/sshd", "ELF sshd 9.2p1\n", { mode: "rwxr-xr-x" });
	P("/usr/sbin/cron", "ELF cron\n", { mode: "rwxr-xr-x" });
	D("/etc/systemd/system");
	["ssh.service", "cron.service", "systemd-journald.service"].concat((def.unites || []).map(function(u){ return u[0]; })).forEach(function(u){
		if (UNITES_ILE[u]) P("/lib/systemd/system/" + u, UNITES_ILE[u]);
	});
	D("/root", { mode: "rwx------" });
	D("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	D("/tmp", { mode: "rwxrwxrwt" });
	D("/var/tmp", { mode: "rwxrwxrwt" });
	D("/var/log");
	D("/proc");
	["meminfo", "loadavg", "uptime", "cpuinfo", "mounts", "version", "swaps"].forEach(function(n){
		var it = P("/proc/" + n, "", { mode: "r--r--r--" });
		it.taille = 0;
		texteVivant(it, function(){ return ileOuverte() && estMaMachineIle(h) && state && state.reseau && state.reseau.machines && state.reseau.machines[h] ? texteProcMachine(h, n) : ""; });
	});
	D("/run");
	if (def.construire) def.construire(P, D);
}
/* Le magasin de confiance du système : les autorités publiques, et rien de l'île (la Forge n'existe pas encore). */
var BUNDLE_SYSTEME_ILE = "# Les autorités de certification publiques du paquet ca-certificates (137 certificats).\n# Ce fichier est fabriqué par update-ca-certificates : on ne l'édite pas à la main.\n" +
	"-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n(autorité publique, 1 sur 137)\n-----END CERTIFICATE-----\n";

/* ------------------------------------------------------------------ */
/* Les textes des paquets : BIND                                       */
/* ------------------------------------------------------------------ */

var BIND_NAMED_CONF = "// This is the primary configuration file for the BIND DNS server named.\n//\n// Please read /usr/share/doc/bind9/README.Debian for information on the\n// structure of BIND configuration files in Debian, *BEFORE* you customize\n// this configuration file.\n//\n// If you are just adding zones, please do that in /etc/bind/named.conf.local\n\n" +
	"include \"/etc/bind/named.conf.options\";\ninclude \"/etc/bind/named.conf.local\";\ninclude \"/etc/bind/named.conf.default-zones\";\n";
var BIND_OPTIONS = "options {\n\tdirectory \"/var/cache/bind\";\n\n\t// If there is a firewall between you and nameservers you want\n\t// to talk to, you may need to fix the firewall to allow multiple\n\t// ports to talk.  See http://www.kb.cert.org/vuls/id/800113\n\n" +
	"\t// Les serveurs de l'île font autorité pour l'île, et ne cherchent rien ailleurs.\n\trecursion no;\n\tallow-query { any; };\n\n\tdnssec-validation auto;\n\n\tlisten-on-v6 { any; };\n};\n";
var BIND_LOCAL = "//\n// Do any local configuration here\n//\n\n// Consider adding the 1918 zones here, if they are not used in your\n// organization\n//include \"/etc/bind/zones.rfc1918\";\n";
var BIND_DEFAULT_ZONES = "// prime the server with knowledge of the root servers\nzone \".\" {\n\ttype hint;\n\tfile \"/usr/share/dns/root.hints\";\n};\n\n" +
	"// be authoritative for the localhost forward and reverse zones, and for\n// broadcast zones as per RFC 1912\n\n" +
	"zone \"localhost\" {\n\ttype master;\n\tfile \"/etc/bind/db.local\";\n};\n\nzone \"127.in-addr.arpa\" {\n\ttype master;\n\tfile \"/etc/bind/db.127\";\n};\n\n" +
	"zone \"0.in-addr.arpa\" {\n\ttype master;\n\tfile \"/etc/bind/db.0\";\n};\n\nzone \"255.in-addr.arpa\" {\n\ttype master;\n\tfile \"/etc/bind/db.255\";\n};\n";
function bindDbLocale(nom, ptr){
	return ";\n; BIND data file for local loopback interface\n;\n$TTL\t604800\n@\tIN\tSOA\tlocalhost. root.localhost. (\n\t\t\t      2\t\t; Serial\n\t\t\t 604800\t\t; Refresh\n\t\t\t  86400\t\t; Retry\n\t\t\t2419200\t\t; Expire\n\t\t\t 604800 )\t; Negative Cache TTL\n;\n" +
		"@\tIN\tNS\tlocalhost.\n" + (ptr ? "1.0.0\tIN\tPTR\tlocalhost.\n" : (nom === "localhost" ? "@\tIN\tA\t127.0.0.1\n@\tIN\tAAAA\t::1\n" : ""));
}
function poserBindIle(P, D){
	P("/etc/bind/named.conf", BIND_NAMED_CONF, { owner: "root" });
	P("/etc/bind/named.conf.options", BIND_OPTIONS);
	P("/etc/bind/named.conf.local", BIND_LOCAL);
	P("/etc/bind/named.conf.default-zones", BIND_DEFAULT_ZONES);
	P("/etc/bind/db.local", bindDbLocale("localhost"));
	P("/etc/bind/db.127", bindDbLocale("127", true));
	P("/etc/bind/db.0", bindDbLocale("0"));
	P("/etc/bind/db.255", bindDbLocale("255"));
	P("/etc/bind/db.empty", bindDbLocale("empty"));
	P("/usr/share/dns/root.hints", ";       This file holds the information on root name servers needed to\n;       initialize cache of Internet domain name servers\n.                        3600000      NS    A.ROOT-SERVERS.NET.\nA.ROOT-SERVERS.NET.      3600000      A     198.41.0.4\n");
	P("/etc/bind/rndc.key", "key \"rndc-key\" {\n\talgorithm hmac-sha256;\n\tsecret \"" + btoa(hexDe("rndc", 32)) + "\";\n};\n", { mode: "rw-r-----", owner: "bind" });
	D("/etc/bind/zones", { mode: "rwxr-sr-x" });
	D("/var/cache/bind", { owner: "bind", mode: "rwxrwxr-x" });
	D("/var/lib/bind", { owner: "bind", mode: "rwxrwxr-x" });
	["named", "rndc", "named-checkconf", "named-checkzone", "nsupdate", "tsig-keygen"].forEach(function(b){ P((b === "named" || b === "named-checkconf" || b === "named-checkzone" || b === "tsig-keygen" ? "/usr/sbin/" : "/usr/bin/") + b, "ELF " + b + " (BIND 9.18.28)\n", { mode: "rwxr-xr-x" }); });
	P("/etc/default/named", "#\n# run resolvconf?\nRESOLVCONF=no\n\n# startup options for the server\nOPTIONS=\"-u bind\"\n");
}

/* La zone esquissée par Badis sur le pont du navire : deux fautes s'y cachent. */
function brouillonZoneIle(){
	return "; La zone port-aube.lan : le brouillon de Badis, écrit sur le pont du navire.\n" +
		"; Chaque modification : +1 au numéro de série (AAAAMMJJNN), sinon le secondaire ne la verra jamais.\n" +
		"$TTL\t3600\n" +
		"@\tIN\tSOA\tnoms.port-aube.lan. hostmaster.port-aube.lan. (\n" +
		"\t\t\t2026101701\t; numéro de série\n\t\t\t3600\t\t; refresh\n\t\t\t900\t\t; retry\n\t\t\t604800\t\t; expire\n\t\t\t300 )\t\t; minimum (cache négatif)\n" +
		"\n@\tIN\tNS\tnoms.port-aube.lan.\n@\tIN\tNS\tphare.port-aube.lan.\n@\tIN\tMX\t10 poste.port-aube.lan.\n\n" +
		"noms\t\tIN\tA\t10.0.70.53\nphare\t\tIN\tA\t10.0.70.54\nposte\t\tIN\tA\t10.0.70.25\ngreniers\tIN\tA\t10.0.70.20\nhalle\t\tIN\tA\t10.0.70.45\n" +
		"registre\tIN\tA\t10.0.70.380\nquai\t\tIN\tA\t10.0.70.100\nforge\t\tIN\tA\t10.0.70.43\narche\t\tIN\tA\t10.0.70.22\n\n" +
		"; Les noms de service\nimap\t\tIN\tCNAME\tposte\nimap\t\tIN\tA\t10.0.70.25\nldap\t\tIN\tCNAME\tregistre\n";
}

/* ------------------------------------------------------------------ */
/* Les textes des paquets : Postfix, Dovecot                           */
/* ------------------------------------------------------------------ */

/* Le main.cf tel que l'ont laissé les bâtisseurs : une coquille, un doublon, un relais injoignable et un relais ouvert à tous. */
var POSTFIX_MAIN_CF = "# See /usr/share/postfix/main.cf.dist for a commented, more complete version\n\n\n" +
	"# Debian specific:  Specifying a file name will cause the first\n# line of that file to be used as the name.  The Debian default\n# is /etc/mailname.\n#myorigin = /etc/mailname\n\n" +
	"smtpd_banner = $myhostname ESMTP $mail_name (Debian/GNU)\nbiff = no\n\n# appending .domain is the MUA's job.\nappend_dot_mydomain = no\n\n# Uncomment the next line to generate \"delayed mail\" warnings\n#delay_warning_time = 4h\n\n" +
	"readme_directory = no\n\n# See http://www.postfix.org/COMPATIBILITY_README.html -- default to 3.6 on\n# fresh installs.\ncompatibility_level = 3.6\n\n\n\n" +
	"# TLS parameters\nsmtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem\nsmtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key\nsmtpd_tls_security_level=may\n\n" +
	"smtp_tls_CApath=/etc/ssl/certs\nsmtp_tls_security_level=may\nsmtp_tls_session_cache_database = btree:${data_directory}/smtp_scache\n\n\n" +
	"smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination\n" +
	"myhostname = localhost.localdomain\nmydomian = port-aube.lan\nalias_maps = hash:/etc/aliases\nalias_database = hash:/etc/aliases\nmyorigin = /etc/mailname\n" +
	"mydestination = $myhostname, port-aube.lan, localhost.localdomain, localhost\n" +
	"relayhost = [relais.ancien-campus.lan]:587\n" +
	"mynetworks = 0.0.0.0/0\n" +
	"mailbox_size_limit = 0\nrecipient_delimiter = +\ninet_interfaces = all\ninet_protocols = ipv4\n" +
	"# Les boîtes : des dossiers Maildir, dans /var/mail/NOM/ (la barre finale le demande)\nhome_mailbox =\nmail_spool_directory = /var/mail/\n" +
	"mydestination = $myhostname, localhost.localdomain, localhost\n";
var DOVECOT_CONF = "## Dovecot configuration file\n\n# If you're in a hurry, see http://wiki2.dovecot.org/QuickConfiguration\n\n" +
	"# Enable installed protocols\n!include_try /usr/share/dovecot/protocols.d/*.protocol\n\n" +
	"# A comma separated list of IPs or hosts where to listen in for connections.\n#listen = *, ::\n\n" +
	"# Most of the actual configuration gets included below. The filenames are\n# first sorted by their ASCII value and parsed in that order.\n!include conf.d/*.conf\n\n" +
	"# A config file can also tried to be included without giving an error if\n# it's not found:\n!include_try local.conf\n";
var DOVECOT_10_MAIL = "##\n## Mailbox locations and namespaces\n##\n\n# Location for users' mailboxes. The default is empty, which means that Dovecot\n# tries to find the mailboxes automatically. This won't work if the user\n# doesn't yet have any mail, so you should explicitly tell Dovecot the full\n# location.\n#\n" +
	"# If you're using mbox, giving a path to the INBOX file (eg. /var/mail/%u)\n# isn't enough. You'll also need to tell Dovecot where the other mailboxes are\n# kept. This is called the \"root mail directory\", and it must be the first\n# path given in the mail_location setting.\n#\n# There are a few special variables you can use, eg.:\n#\n#   %u - username\n#   %n - user part in user@domain, same as %u if there's no domain\n#   %d - domain part in user@domain, empty if there's no domain\n#   %h - home directory\n#\n" +
	"# See doc/wiki/Variables.txt for full list. Some examples:\n#\n#   mail_location = maildir:~/Maildir\n#   mail_location = mbox:~/mail:INBOX=/var/mail/%u\n#   mail_location = mbox:/var/mail/%d/%1n/%n:INDEX=/var/indexes/%d/%1n/%n\n#\n" +
	"# <doc/wiki/MailLocation.txt>\n#\nmail_location = mbox:~/mail:INBOX=/var/mail/%u\n\n" +
	"# Group to enable temporarily for privileged operations. Currently this is\n# used only with INBOX when either its initial creation or dotlocking fails.\n# Typically this is set to \"mail\" to give access to /var/mail.\nmail_privileged_group = mail\n";
var DOVECOT_10_AUTH = "##\n## Authentication processes\n##\n\n# Disable LOGIN command and all other plaintext authentications unless\n# SSL/TLS is used (LOGINDISABLED capability). Note that if the remote IP\n# matches the local IP (ie. you're connecting from the same computer), the\n# connection is considered secure and plaintext authentication is allowed.\n" +
	"# See also ssl=required setting.\n#disable_plaintext_auth = yes\n\n# Space separated list of wanted authentication mechanisms:\n#   plain login digest-md5 cram-md5 ntlm rpa apop anonymous gssapi otp\n#   gss-spnego\nauth_mechanisms = plain\n\n" +
	"##\n## Password and user databases\n##\n\n!include auth-system.conf.ext\n";
var DOVECOT_10_SSL = "##\n## SSL settings\n##\n\n# SSL/TLS support: yes, no, required. <doc/wiki/SSL.txt>\nssl = yes\n\n" +
	"# PEM encoded X.509 SSL/TLS certificate and private key. They're opened before\n# dropping root privileges, so keep the key file unreadable by anyone but\n# root. Included doc/mkcert.sh can be used to easily generate self-signed\n# certificate, just make sure to update the domains in dovecot-openssl.cnf\n" +
	"ssl_cert = </etc/dovecot/private/dovecot.pem\nssl_key = </etc/dovecot/private/dovecot.key\n\n# Directory and/or file for trusted SSL CA certificates. These are used only\n# when Dovecot needs to act as an SSL client (e.g. imapc backend or\n# submission service). The directory is usually /etc/ssl/certs in\n# Debian-based systems and the file is /etc/pki/tls/cert.pem in\n# RedHat-based systems.\nssl_client_ca_dir = /etc/ssl/certs\n\n" +
	"# SSL DH parameters\n# Generate new params with `openssl dhparam -out /etc/dovecot/dh.pem 4096`\n# Or migrate from old ssl-parameters.dat file with the command dovecot\n# gives on startup when ssl_dh is unset.\nssl_dh = </usr/share/dovecot/dh.pem\n";
var DOVECOT_10_MASTER = "#default_process_limit = 100\n#default_client_limit = 1000\n\nservice imap-login {\n  inet_listener imap {\n    #port = 143\n  }\n  inet_listener imaps {\n    #port = 993\n    #ssl = yes\n  }\n}\n\n" +
	"service lmtp {\n  unix_listener lmtp {\n    #mode = 0666\n  }\n}\n\nservice auth {\n  unix_listener auth-userdb {\n    #mode = 0666\n  }\n}\n";
var DOVECOT_15_LDA = "##\n## LDA specific settings (also used by LMTP)\n##\n\n# Address to use when sending rejection mails.\n# Default is postmaster@%d. %d expands to recipient domain.\n#postmaster_address =\n\nprotocol lda {\n  # Space separated list of plugins to load (default is global mail_plugins).\n  #mail_plugins = $mail_plugins\n}\n";
var DOVECOT_90_SIEVE = "##\n## Settings for the Sieve interpreter\n##\n\nplugin {\n  # The location of the user's main Sieve script or script storage.\n  sieve = file:~/sieve;active=~/.dovecot.sieve\n\n  # Directory for :personal include scripts.\n  #sieve_dir = ~/sieve\n}\n";

/* ------------------------------------------------------------------ */
/* Les textes des paquets : Samba, LDAP, sssd, autofs                  */
/* ------------------------------------------------------------------ */

var SMB_CONF_DEBIAN = "#\n# Sample configuration file for the Samba suite for Debian GNU/Linux.\n#\n#\n# This is the main Samba configuration file. You should read the\n# smb.conf(5) manual page in order to understand the options listed\n# here. Samba has a huge number of configurable options most of which\n# are not shown in this example\n#\n" +
	"# Some options that are often worth tuning have been included as\n# commented-out examples in this file.\n#  - When such options are commented with \";\", the proposed setting\n#    differs from the default Samba behaviour\n#  - When commented with \"#\", the proposed setting is the default\n#    behaviour of Samba but the option is considered important\n#    enough to be mentioned here\n#\n" +
	"# NOTE: Whenever you modify this file you should run the command\n# \"testparm\" to check that you have not made any basic syntactic\n# errors.\n\n#======================= Global Settings =======================\n\n[global]\n\n" +
	"## Browsing/Identification ###\n\n# Change this to the workgroup/NT-domain name your Samba server will part of\n   workgroup = WORKGROUP\n\n" +
	"#### Debugging/Accounting ####\n\n# This tells Samba to use a separate log file for each machine\n# that connects\n   log file = /var/log/samba/log.%m\n\n# Cap the size of the individual log files (in KiB).\n   max log size = 1000\n\n" +
	"# We want Samba to only log to /var/log/samba/log.{smbd,nmbd}.\n# Append syslog@1 if you want important messages to be sent to syslog too.\n   logging = file\n\n" +
	"# Do something sensible when Samba crashes: mail the admin a backtrace\n   panic action = /usr/share/samba/panic-action %d\n\n\n" +
	"####### Authentication #######\n\n# Server role. Defines in which mode Samba will operate. Possible\n# values are \"standalone server\", \"member server\", \"classic primary\n# domain controller\", \"classic backup domain controller\", \"active\n# directory domain controller\".\n#\n# Most people will want \"standalone server\" or \"member server\".\n" +
	"   server role = standalone server\n\n   obey pam restrictions = yes\n\n# This option controls how unsuccessful authentication attempts are mapped\n# to anonymous connections\n   map to guest = bad user\n\n" +
	"#======================= Share Definitions =======================\n\n" +
	"# Un partage de la promo : le chemin, qui y entre, et ce qu'on y fait.\n" +
	";[promo]\n;   comment = Le partage de la promo\n;   path = /srv/promo\n;   valid users = @promo\n;   read only = no\n;   browseable = yes\n";
var LDAP_CONF_CLIENT = "#\n# LDAP Defaults\n#\n\n# See ldap.conf(5) for details\n# This file should be world readable but not world writable.\n\n#BASE\tdc=example,dc=com\n#URI\tldap://ldap.example.com ldap://ldap-provider.example.com:666\n\n#SIZELIMIT\t12\n#TIMELIMIT\t15\n#DEREF\t\tnever\n\n" +
	"# TLS certificates (needed for GnuTLS)\nTLS_CACERT\t/etc/ssl/certs/ca-certificates.crt\n";
var AUTO_MASTER_DEBIAN = "#\n# Sample auto.master file\n# This is a 'master' automounter map and it has the following format:\n# mount-point [map-type[,format]:]map [options]\n# For details of the format look at auto.master(5).\n#\n#/misc\t/etc/auto.misc\n#\n" +
	"# NOTE: mounts done from a hosts map will be mounted with the\n#\t\"nosuid\" and \"nodev\" options unless the \"suid\" and \"dev\"\n#\toptions are explicitly given.\n#\n#/net\t-hosts\n#\n# Include /etc/auto.master.d/*.autofs\n# To add an extra map using this mechanism you will need to add\n# two configuration items - one /etc/auto.master.d/extra.autofs file\n# (using the same line format as the auto.master file)\n# and a separate mount map (e.g. /etc/auto.extra or an auto.extra NIS map)\n# that is referred to by the extra.autofs file.\n#\n+dir:/etc/auto.master.d\n";
/* Le sssd.conf préparé par les bâtisseurs pour la Poste et la Halle : branché sur le Registre. */
var SSSD_CONF_BATISSEURS = "[sssd]\nservices = nss, pam\ndomains = port-aube\n\n[domain/port-aube]\nid_provider = ldap\nauth_provider = ldap\nldap_uri = ldap://registre.port-aube.lan\nldap_search_base = dc=port-aube,dc=lan\n" +
	"ldap_tls_reqcert = allow\ncache_credentials = True\nenumerate = False\n";
var DEFAULT_SLAPD = "# Default location of the slapd.conf file or slapd.d cn=config directory. If\n# empty, use the compiled-in default (/etc/ldap/slapd.d with a fallback to\n# /etc/ldap/slapd.conf).\nSLAPD_CONF=\n\n# System account to run the slapd server under. If empty the server\n# will run as root.\nSLAPD_USER=\"openldap\"\n\n" +
	"# System group to run the slapd server under. If empty the server will\n# run in the primary group of its user.\nSLAPD_GROUP=\"openldap\"\n\n# Path to the pid file of the slapd server. If not set the init.d script\n# will try to figure it out from $SLAPD_CONF (/etc/ldap/slapd.d by\n# default)\nSLAPD_PIDFILE=\n\n" +
	"# slapd normally serves ldap only on all TCP-ports 389. slapd can also\n# service requests on TCP-port 636 (ldaps) and requests via unix\n# sockets.\n# Example usage:\n# SLAPD_SERVICES=\"ldap://127.0.0.1:389/ ldaps:/// ldapi:///\"\nSLAPD_SERVICES=\"ldap:/// ldapi:///\"\n";
/* Le LDIF des bâtisseurs, écrit à la hâte sur le pont : deux fautes, que ldapadd dira. */
function ldifBatisseursIle(){
	var l = ["# Les dix bâtisseurs de Port-Aube, pour le Grand Registre.", "# À ajouter avec ldapadd, une fois ou=people et ou=groups créés.", ""];
	BATISSEURS_ILE.forEach(function(b){
		l.push("dn: uid=" + b[0] + ",ou=people,dc=port-aube,dc=lan", "objectClass: inetOrgPerson", "objectClass: posixAccount", "objectClass: shadowAccount", "uid: " + b[0],
			"cn: " + b[2], "sn: " + b[2]);
		if (b[0] !== "noam") l.push("uidNumber: " + b[1]);       // la première faute : Noam n'a pas de numéro
		l.push("gidNumber: " + (b[0] === "lamia" ? "dix-mille" : GID_BATISSEURS));   // la seconde : un numéro écrit en lettres
		l.push("homeDirectory: /home/" + b[0], "loginShell: /bin/bash", "mail: " + b[0] + "@" + DOMAINE_ILE, "");
	});
	return l.join("\n");
}

/* ------------------------------------------------------------------ */
/* Les neuf machines des maisons                                       */
/* ------------------------------------------------------------------ */

function binairesIle(P, liste){ liste.forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x" }); }); }

var NomsIle = poserMachineIle("noms", { ip: IP_ILE.noms, image: "loc_baie_ile.gif",
	intro: "La machine noms : la Maison des Noms. Un serveur neuf, BIND installé ; il ne connaît encore aucun nom de l'île.",
	comptes: [["bind", 104, 106, "", "/var/cache/bind", "/usr/sbin/nologin"]], groupes: [["bind", 106, ""]],
	unites: [["named.service", true, true]],
	construire: function(P, D){
		poserBindIle(P, D);
		P("/etc/bind/zones/db.port-aube.lan", brouillonZoneIle(), { owner: "root" });
	} });
var PhareIle = poserMachineIle("phare", { ip: IP_ILE.phare, image: "loc_baie_ile.gif",
	intro: "La machine phare : le Phare-Relais. Le second serveur de noms, au bout de la jetée ; il attend la copie de la zone.",
	comptes: [["bind", 104, 106, "", "/var/cache/bind", "/usr/sbin/nologin"]], groupes: [["bind", 106, ""]],
	unites: [["named.service", true, true]],
	construire: function(P, D){
		poserBindIle(P, D);
		D("/etc/wireguard", { mode: "rwx------" });
		binairesIle(P, ["/usr/bin/wg", "/usr/bin/wg-quick"]);
	} });
var PosteIle = poserMachineIle("poste", { ip: IP_ILE.poste, image: "loc_baie_ile.gif", sss: true,
	intro: "La machine poste : la Poste et le Bureau des Lettres. Postfix porte le courrier, Dovecot le garde ; depuis l'aube, rien ne part.",
	comptes: [["postfix", 105, 108, "", "/var/spool/postfix", "/usr/sbin/nologin"], ["dovecot", 106, 110, "Dovecot mail server", "/usr/lib/dovecot", "/usr/sbin/nologin"],
		["dovenull", 107, 111, "Dovecot login user", "/nonexistent", "/usr/sbin/nologin"], ["opendkim", 108, 112, "", "/run/opendkim", "/usr/sbin/nologin"],
		["capitaine", 1001, 1001, "Le capitaine du navire,,,", "/home/capitaine", "/bin/bash"]],
	groupes: [["postfix", 108, ""], ["postdrop", 109, ""], ["dovecot", 110, ""], ["dovenull", 111, ""], ["opendkim", 112, ""], ["capitaine", 1001, ""]],
	unites: [["postfix.service", true, true], ["dovecot.service", true, true], ["sssd.service", true, true]],
	materiel: { ile: function(){ return { postfix: { file: fileInitialePosteIle() } }; } },
	construire: function(P, D){
		P("/etc/postfix/main.cf", POSTFIX_MAIN_CF);
		P("/etc/postfix/master.cf", "#\n# Postfix master process configuration file.  For details on the format\n# of the file, see the master(5) manual page (command: \"man 5 master\" or\n# on-line: https://www.postfix.org/master.5.html).\n#\n# ==========================================================================\n# service type  private unpriv  chroot  wakeup  maxproc command + args\n#               (yes)   (yes)   (no)    (never) (100)\n# ==========================================================================\nsmtp      inet  n       -       y       -       -       smtpd\npickup    unix  n       -       y       60      1       pickup\ncleanup   unix  n       -       y       -       0       cleanup\nqmgr      unix  n       -       n       300     1       qmgr\nlocal     unix  -       n       n       -       -       local\nsmtp      unix  -       -       y       -       -       smtp\nrelay     unix  -       -       y       -       -       smtp\n");
		P("/etc/mailname", DOMAINE_ILE + "\n");
		P("/etc/aliases", "# See man 5 aliases for format\npostmaster:    root\nroot:          " + JOUEUR + "\n");
		D("/var/mail", { mode: "rwxrwsr-x" });
		D("/var/spool/postfix");
		D("/var/log");
		P("/var/log/mail.log", "", { mode: "rw-r-----" });
		P("/etc/dovecot/dovecot.conf", DOVECOT_CONF);
		P("/etc/dovecot/conf.d/10-mail.conf", DOVECOT_10_MAIL);
		P("/etc/dovecot/conf.d/10-auth.conf", DOVECOT_10_AUTH);
		P("/etc/dovecot/conf.d/10-ssl.conf", DOVECOT_10_SSL);
		P("/etc/dovecot/conf.d/10-master.conf", DOVECOT_10_MASTER);
		P("/etc/dovecot/conf.d/15-lda.conf", DOVECOT_15_LDA);
		P("/etc/dovecot/conf.d/auth-system.conf.ext", "# Authentication for system users. Included from 10-auth.conf.\n\npassdb {\n  driver = pam\n}\n\nuserdb {\n  driver = passwd\n}\n");
		P("/etc/dovecot/conf.d/90-sieve.conf", DOVECOT_90_SIEVE);
		P("/usr/share/dovecot/protocols.d/imapd.protocol", "protocols = $protocols imap\n");
		P("/usr/share/dovecot/dh.pem", "-----BEGIN DH PARAMETERS-----\n(paramètres Diffie-Hellman, 4096 bits)\n-----END DH PARAMETERS-----\n");
		D("/etc/dovecot/private", { mode: "rwx------" });
		P("/etc/dovecot/private/dovecot.pem", fabriquerCertificat({ sujet: "CN = poste", emetteur: "CN = poste", debut: new Date(DATE_OUVERTURE_CH7 - 3 * 3600000), fin: new Date(DATE_OUVERTURE_CH7 + 3650 * 86400000), san: ["poste"], cle: "snakeoil-poste" }));
		P("/etc/dovecot/private/dovecot.key", fabriquerCle("snakeoil-poste"), { mode: "rw-------" });
		D("/etc/sssd", { mode: "rwx--x--x" });
		P("/etc/sssd/sssd.conf", SSSD_CONF_BATISSEURS, { mode: "rw-------" });
		D("/etc/opendkim/keys", { owner: "opendkim" });
		D("/home/capitaine", { owner: "capitaine", mode: "rwxr-x---" });
		binairesIle(P, ["/usr/sbin/postfix", "/usr/sbin/postconf", "/usr/sbin/sendmail", "/usr/bin/mailq", "/usr/sbin/postqueue", "/usr/sbin/postsuper", "/usr/bin/mail",
			"/usr/sbin/dovecot", "/usr/bin/doveadm", "/usr/bin/doveconf", "/usr/bin/sievec", "/usr/sbin/opendkim-genkey", "/usr/sbin/sssd", "/usr/sbin/sss_cache"]);
	} });
var GreniersIle = poserMachineIle("greniers", { ip: IP_ILE.greniers, image: "loc_baie_ile.gif", materiel: { srv: 500 },
	intro: "La machine greniers : les Greniers de la cité. Un grand disque, /srv/homes, où chaque habitant aura son dossier ; personne ne peut encore y monter.",
	comptes: [["statd", 109, 65534, "", "/var/lib/nfs", "/usr/sbin/nologin"], ["_rpc", 110, 65534, "", "/run/rpcbind", "/usr/sbin/nologin"]],
	unites: [["nfs-server.service", true, true]],
	construire: function(P, D){
		P("/etc/exports", "# /etc/exports: the access control list for filesystems which may be exported\n#\t\tto NFS clients.  See exports(5).\n#\n# Example for NFSv2 and NFSv3:\n# /srv/homes       hostname1(rw,sync,no_subtree_check) hostname2(ro,sync,no_subtree_check)\n#\n" +
			"# Example for NFSv4:\n# /srv/nfs4        gss/krb5i(rw,sync,fsid=0,crossmnt,no_subtree_check)\n# /srv/nfs4/homes  gss/krb5i(rw,sync,no_subtree_check)\n#\n");
		D("/srv/homes", { mode: "rwxr-xr-x" });
		BATISSEURS_ILE.forEach(function(b){
			D("/srv/homes/" + b[0], { owner: String(b[1]), mode: "rwxr-x---" });
			P("/srv/homes/" + b[0] + "/LISEZMOI", "Le dossier de " + b[2] + ", bâtisseur de Port-Aube.\n", { owner: String(b[1]) });
		});
		D("/root/.ssh", { mode: "rwx------" });
		P("/usr/local/bin/sauvegarde-borg", "#!/bin/bash\n# La sauvegarde de chaque nuit : les dossiers de la cité, vers l'Arche.\n# La phrase de passe du dépôt est dans /root/.borg-phrase (root seul la lit).\nset -e\nexport BORG_RSH=\"ssh -i /root/.ssh/arche\"\nexport BORG_PASSPHRASE=\"$(cat /root/.borg-phrase)\"\n" +
			"borg create --stats borg@arche:/srv/borg/greniers::{hostname}-{now} /srv/homes\nborg prune --keep-daily 7 --keep-weekly 4 borg@arche:/srv/borg/greniers\n", { mode: "rwxr-x---" });
		binairesIle(P, ["/usr/sbin/exportfs", "/usr/sbin/rpc.nfsd", "/usr/sbin/rpc.mountd", "/usr/bin/borg"]);
	} });
var HalleIle = poserMachineIle("halle", { ip: IP_ILE.halle, image: "loc_baie_ile.gif", sss: true,
	intro: "La machine halle : la Halle d'échange. Samba y est installé, pour que chacun dépose et prenne ; aucun partage n'est encore ouvert.",
	unites: [["smbd.service", true, true], ["sssd.service", true, true]],
	construire: function(P, D){
		P("/etc/samba/smb.conf", SMB_CONF_DEBIAN);
		D("/var/lib/samba/private", { mode: "rwx------" });
		D("/var/log/samba");
		D("/etc/sssd", { mode: "rwx--x--x" });
		P("/etc/sssd/sssd.conf", SSSD_CONF_BATISSEURS, { mode: "rw-------" });
		binairesIle(P, ["/usr/sbin/smbd", "/usr/bin/testparm", "/usr/bin/smbpasswd", "/usr/bin/pdbedit", "/usr/bin/smbclient", "/usr/sbin/sssd", "/usr/sbin/sss_cache"]);
	} });
var RegistreIle = poserMachineIle("registre", { ip: IP_ILE.registre, image: "loc_baie_ile.gif",
	intro: "La machine registre : le Grand Registre. slapd y tient l'annuaire de la cité, dc=port-aube,dc=lan ; il ne contient encore que son propre nom.",
	comptes: [["openldap", 111, 113, "OpenLDAP Server Account,,,", "/var/lib/ldap", "/bin/false"]], groupes: [["openldap", 113, ""], ["ssl-cert", 114, "openldap"]],
	unites: [["slapd.service", true, true]],
	construire: function(P, D){
		P("/etc/default/slapd", DEFAULT_SLAPD);
		P("/etc/ldap/ldap.conf", LDAP_CONF_CLIENT.replace("#BASE\tdc=example,dc=com", "BASE\tdc=port-aube,dc=lan").replace("#URI\tldap://ldap.example.com ldap://ldap-provider.example.com:666", "URI\tldap://registre.port-aube.lan"));
		D("/etc/ldap/slapd.d", { owner: "openldap", mode: "rwxr-x---" });
		P("/etc/ldap/slapd.d/cn=config.ldif", "# AUTO-GENERATED FILE - DO NOT EDIT!! Use ldapmodify.\n# CRC32 4f1b2c3d\ndn: cn=config\nobjectClass: olcGlobal\ncn: config\nolcArgsFile: /var/run/slapd/slapd.args\nolcLogLevel: none\nolcPidFile: /var/run/slapd/slapd.pid\nolcToolThreads: 1\n", { owner: "openldap", mode: "rw-------" });
		D("/etc/ldap/schema");
		["core", "cosine", "nis", "inetorgperson"].forEach(function(s){ P("/etc/ldap/schema/" + s + ".schema", "# " + s + ".schema -- OpenLDAP schema\n"); P("/etc/ldap/schema/" + s + ".ldif", "# " + s + ".ldif -- OpenLDAP schema\n"); });
		D("/var/lib/ldap", { owner: "openldap", mode: "rwx------" });
		P("/var/lib/ldap/data.mdb", "", { owner: "openldap", mode: "rw-------", binaire: { sortie: "" } });
		P("/root/batisseurs.ldif", ldifBatisseursIle(), { mode: "rw-------" });
		binairesIle(P, ["/usr/sbin/slapd", "/usr/bin/ldapsearch", "/usr/bin/ldapadd", "/usr/bin/ldapmodify", "/usr/bin/ldapdelete", "/usr/sbin/slappasswd", "/usr/sbin/slapcat"]);
	} });
var QuaiIle = poserMachineIle("quai", { ip: IP_ILE.quai, image: "loc_poste_quai.gif",
	intro: "La machine quai : le poste du premier étudiant, sous l'auvent du débarcadère. Clavier neuf, écran éteint ; il ne connaît encore personne de l'île.",
	comptes: [["avahi", 112, 115, "Avahi mDNS daemon,,,", "/run/avahi-daemon", "/usr/sbin/nologin"]], groupes: [["avahi", 115, ""]],
	unites: [["sssd.service", false, true], ["autofs.service", true, true], ["avahi-daemon.service", true, true]],
	construire: function(P, D){
		D("/etc/sssd", { mode: "rwx--x--x" });
		D("/etc/sssd/conf.d", { mode: "rwx--x--x" });
		P("/etc/auto.master", AUTO_MASTER_DEBIAN);
		D("/etc/auto.master.d");
		P("/etc/default/autofs", "#\n# Init system options\n#\n# Command line options for automount.\nOPTIONS=\"\"\n#\n# MASTER_MAP_NAME - default map name for the master map.\n#MASTER_MAP_NAME=\"auto.master\"\n#\n# TIMEOUT - set the default mount timeout in secons. The internal\n#\t    program default is 10 minutes, but the default installed\n#\t    configuration overrides this and sets the timeout to 5\n#\t    minutes to be consistent with earlier autofs releases.\n#\nTIMEOUT=300\n");
		P("/etc/ldap/ldap.conf", LDAP_CONF_CLIENT);
		D("/etc/avahi/services");
		P("/etc/avahi/avahi-daemon.conf", "[server]\n#host-name=foo\n#domain-name=local\nuse-ipv4=yes\nuse-ipv6=yes\nratelimit-interval-usec=1000000\nratelimit-burst=1000\n\n[wide-area]\nenable-wide-area=yes\n\n[publish]\n#disable-publishing=no\n\n[reflector]\n\n[rlimits]\n");
		D("/mnt");
		D("/srv");
		binairesIle(P, ["/usr/sbin/sssd", "/usr/sbin/sss_cache", "/usr/sbin/automount", "/sbin/mount.nfs", "/usr/sbin/showmount", "/usr/bin/smbclient", "/usr/bin/ldapsearch",
			"/usr/sbin/update-ca-certificates", "/usr/bin/avahi-browse", "/usr/bin/avahi-resolve", "/usr/bin/avahi-publish", "/usr/bin/rsync"]);
	} });
var ForgeIle = poserMachineIle("forge", { ip: IP_ILE.forge, image: "loc_baie_ile.gif",
	intro: "La machine forge : la Forge des Sceaux. Une machine à part, qui ne sert à rien d'autre : c'est ici que naîtra l'autorité qui signe les sceaux de l'île.",
	construire: function(P, D){
		D("/srv/forge", { mode: "rwx------" });
		D("/srv/forge/demandes", { mode: "rwxrwxrwt" });
		binairesIle(P, ["/usr/bin/openssl"]);
	} });
var ArcheIle = poserMachineIle("arche", { ip: IP_ILE.arche, image: "loc_baie_ile.gif", materiel: { srv: 1000 },
	intro: "La machine arche : l'Arche, sur la colline. Un disque d'un téraoctet, loin des maisons : ici dormira la copie de tout ce que la cité ne veut pas perdre.",
	comptes: [["borg", 1001, 1001, "Le gardien des sauvegardes,,,", "/home/borg", "/bin/bash"]], groupes: [["borg", 1001, ""]],
	construire: function(P, D){
		D("/home/borg", { owner: "borg", mode: "rwxr-x---" });
		D("/home/borg/.ssh", { owner: "borg", mode: "rwx------" });
		P("/home/borg/.ssh/authorized_keys", "", { owner: "borg", mode: "rw-------" });
		D("/srv/borg", { owner: "borg", mode: "rwx------" });
		binairesIle(P, ["/usr/bin/borg"]);
	} });

/* ------------------------------------------------------------------ */
/* Les machines des quêtes annexes                                     */
/* ------------------------------------------------------------------ */

var ImprimerieIle = poserMachineIle("imprimerie", { ip: IP_ILE.imprimerie, image: "loc_baie_ile.gif", annexe: true,
	intro: "La machine imprimerie : le serveur d'impression de la gazette de l'île. CUPS tourne ; la presse, une vraie, attend ses ordres dans l'atelier d'à côté.",
	comptes: [["lp", 7, 7, "lp", "/var/spool/lpd", "/usr/sbin/nologin"]], groupes: [["lp", 7, ""], ["lpadmin", 116, JOUEUR]],
	unites: [["cups.service", true, true]],
	construire: function(P, D){
		P("/etc/cups/cupsd.conf", "#\n# Configuration file for the CUPS scheduler.  See \"man cupsd.conf\" for a\n# complete description of this file.\n#\n\nLogLevel warn\nPageLogFormat\nMaxLogSize 0\nListen localhost:631\nListen /run/cups/cups.sock\nBrowsing No\nDefaultAuthType Basic\nWebInterface Yes\n");
		P("/etc/cups/printers.conf", "# Printer configuration file for CUPS v2.4.2\n# Written by cupsd\n# DO NOT EDIT THIS FILE WHEN CUPSD IS RUNNING\n", { mode: "rw-------" });
		D("/var/spool/cups", { mode: "rwx--x---" });
		P("/srv/gazette/gazette-du-port.txt", "LA GAZETTE DE PORT-AUBE\nNuméro 1, ce soir à la marée haute\n\nLa cité ouvre ses portes : cinq cents étudiants débarquent à 19 h.\nLa fête du port commence au coucher du soleil.\n", { owner: JOUEUR });
		binairesIle(P, ["/usr/sbin/cupsd", "/usr/sbin/lpadmin", "/usr/bin/lpstat", "/usr/bin/lp", "/usr/bin/cancel", "/usr/sbin/cupsenable", "/usr/sbin/cupsdisable"]);
	} });
var BibliothequeIle = poserMachineIle("bibliotheque", { ip: IP_ILE.bibliotheque, image: "loc_baie_ile.gif", annexe: true,
	intro: "La machine bibliotheque : la bibliothèque de l'île. Des étagères de livres numérisés, que l'ancien campus voudrait voir en miroir.",
	unites: [["rsync.service", false, true]],
	construire: function(P, D){
		P("/srv/bibliotheque/archives/journal-de-bord.txt", "Journal de bord du premier navire de Port-Aube.\nJour 1 : la terre est en vue au lever du soleil.\n");
		P("/srv/bibliotheque/archives/carte-de-l-ile.txt", "La carte de l'île : le port, la colline de l'Arche, la jetée du Phare.\n");
		P("/srv/bibliotheque/archives/chants-de-marins.txt", "Les chants de marins du port, recueillis pendant la traversée.\n");
		P("/srv/bibliotheque/brouillons/notes-privees.txt", "Les brouillons de la bibliothécaire : à ne pas publier.\n");
		P("/usr/share/doc/rsync/examples/rsyncd.conf", "# sample rsyncd.conf configuration file\n\n# GLOBAL OPTIONS\n\n#motd file=/etc/motd\n#log file=/var/log/rsyncd\n#pid file=/var/run/rsyncd.pid\n\n# MODULE OPTIONS\n\n[ftp]\n\n\tcomment = public archive\n\tpath = /var/www/pub\n\tuse chroot = yes\n\tread only = yes\n\tlist = yes\n\tuid = nobody\n\tgid = nogroup\n\thosts allow = trusted.hosts\n");
		binairesIle(P, ["/usr/bin/rsync"]);
	} });
var RiveIle = poserMachineIle("rive", { ip: IP_ILE.rive, image: "loc_baie_ile.gif", annexe: true,
	intro: "La machine rive : sur le continent, dans l'ancien campus. De l'autre côté de la mer, elle attend un pont pour parler à l'île.",
	construire: function(P, D){
		D("/etc/wireguard", { mode: "rwx------" });
		binairesIle(P, ["/usr/bin/wg", "/usr/bin/wg-quick"]);
	} });

/* Le courrier des bâtisseurs, coincé dans la file de la Poste depuis l'aube (le relais du continent ne répond pas). */
function fileInitialePosteIle(){
	var t = DATE_OUVERTURE_CH7;
	var mots = [["badis", "Les noms de l'île", "Architecte,\n\nLa Maison des Noms t'attend. Sans noms, une cité n'est qu'un tas de pierres qui ne se reconnaissent pas.\n\nBadis"],
		["maeva", "Le phare", "Architecte,\n\nLe Phare-Relais veille sur la jetée. Il lui faut la copie des noms, pour le jour où la Maison des Noms se taira.\n\nMaeva"],
		["noam", "Les greniers", "Architecte,\n\nLes Greniers sont pleins de dossiers vides. Ouvre-les à l'île, mais à l'île seulement.\n\nNoam"],
		["kamal", "Le registre", "Architecte,\n\nLe Grand Registre a perdu son sceau pendant la traversée. Il faudra en forger un autre.\n\nKamal"]];
	return mots.map(function(m, i){
		return { id: hexDe("file-" + m[0], 10).toUpperCase(), arrivee: t - (120 - i * 17) * 60000, de: m[0] + "@" + DOMAINE_ILE, a: [JOUEUR + "@" + DOMAINE_ILE],
			sujet: m[1], corps: m[2], taille: 480 + i * 37, raison: "connect to relais.ancien-campus.lan[10.0.92.25]:587: Connection timed out", essais: 4 + i };
	});
}

/* À l'ouverture du chapitre : l'état de départ des unités de chaque machine. */
var MONDE_ILE_DECLARE = false;
function declarerUnitesIle(){
	if (MONDE_ILE_DECLARE) return;
	MONDE_ILE_DECLARE = true;
	Object.keys(DEFS_ILE).forEach(function(h){
		if (!estMaMachineIle(h)) return;
		[["ssh.service", true, true], ["cron.service", true, true], ["systemd-journald.service", true, true]].concat(DEFS_ILE[h].unites || []).forEach(function(u){
			declarerUnite(h, u[0], { actif: u[1], enabled: u[2] });
		});
		declarerEcoute(h, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }]);
		declarerNoyau(h, { version: "6.1.0-26-amd64" });
	});
}

World.fige = true;
