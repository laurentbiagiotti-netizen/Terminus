/**
 * GrandPort.js : les machines du Grand Port de Port-Aube (chapitre 8 pour le joueur, numéro interne 9).
 *
 * Le port de commerce de l'île : des serveurs Debian 13 « trixie », docker 26.1.5+dfsg1 (le paquet docker.io), containerd,
 * buildx et compose installés. Ce fichier pose chaque machine comme une machine modélisée (SortsMachines.js : disques,
 * processus, systemd, journaux), avec ses fichiers d'origine, ses comptes (le groupe docker), ses unités, les projets
 * de l'école dans la maison du joueur, et l'horloge du chapitre (J1 06:00, cinq minutes par commande, l'aube du J4).
 *
 *   docks      10.0.80.10   le poste principal, gestionnaire de l'escadre ; le joueur n'y est PAS dans le groupe docker
 *   entrepot   10.0.80.20   le registre privé de l'école (entrepot.port-aube.lan:5000)
 *   navire1    10.0.80.31   un navire de l'escadre (insecure-registries vers l'entrepôt)
 *   navire2    10.0.80.32   un navire de l'escadre (celui qui sombre pendant la bataille)
 *   navire3    10.0.80.33   un navire de l'escadre
 *   douane     10.0.80.40   la quarantaine : l'image de l'éclaireur, sans route vers le continent ni vers l'entrepôt
 *   chaloupe   10.0.80.51   une annexe : podman, sans démon
 *   cabine     10.0.80.52   une annexe : systemd-nspawn et machinectl
 *
 * --- Ce que le monde peut appeler ---
 *   sCh8() l'état du chapitre (state.ch8) ; maintenantCh8() l'instant du port ; heureCh8() « J2 14:35 »
 *   avancerHorlogeCh8() fait avancer l'horloge (5 min par commande comptée), saute les nuits ; renvoie { nuits, minutes }
 *   texteAvantFlotteCh8() « la flotte dans 1 j 15 h » ; AUBE_CH8 (minutes) ; jourCh8()
 *   declarerUnitesPort() et semerPort() (faits d'eux-mêmes à l'ouverture), PROJETS_PORT (les textes des projets)
 *   poserEpreuveCaissePort(), poserSonarPort() : les incidents prêts à poser (la pile en tempête est ~/tempete)
 *   imageEclaireurPort() l'image inerte de l'éclaireur (posée en quarantaine sur douane par semerPort)
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* L'horloge : J1 06:00, cinq minutes par commande, l'aube du J4         */
/* ------------------------------------------------------------------ */

var PAS_HORLOGE_CH8 = 5;
var AUBE_CH8 = 3 * 1440 + 360;
var PLAFOND_LIGNE_CH8 = 8;
function etatCh8Initial(){
	return { minutes: 360, compte: 0, compteVu: 0, nuitsVues: 0, vus: {}, rang: 0, galons: {}, manoeuvres: {}, sessions: {}, bataille: null, assaut: null,
		scoreDepart: null, scoreFinal: null, scoreFinalCandidat: null, quais: {}, trophees: {}, piegesContinent: [], derniereLigne: null, compteLigne: 0 };
}
function sCh8(){
	if (typeof state === "undefined" || !state) return etatCh8Initial();
	if (!state.ch8 || typeof state.ch8 !== "object") state.ch8 = etatCh8Initial();
	var c = state.ch8;
	if (c.minutes === undefined) c.minutes = 360;
	if (!c.manoeuvres) c.manoeuvres = {};
	if (!c.piegesContinent) c.piegesContinent = [];
	return c;
}
function baseJourCh8(){ var d = new Date(); d.setHours(6, 0, 0, 0); return d.getTime(); }
/* Les minutes depuis J1 00:00, celles qui ne sont pas encore comptées comprises. */
function minutesCh8(){ var c = sCh8(); return c.minutes + Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH8; }
function maintenantCh8(){ var c = sCh8(); return (c.base || baseJourCh8()) + (minutesCh8() - 360) * 60000; }
function jourCh8(){ return Math.floor(minutesCh8() / 1440) + 1; }
function heureCh8(){ var m = minutesCh8(); return "J" + (Math.floor(m / 1440) + 1) + " " + deuxChiffres(Math.floor(m % 1440 / 60)) + ":" + deuxChiffres(m % 60); }
function texteAvantFlotteCh8(){
	var reste = AUBE_CH8 - minutesCh8();
	if (reste <= 0) return "la flotte est là";
	var j = Math.floor(reste / 1440), h = Math.floor(reste % 1440 / 60), mn = reste % 60;
	return "la flotte dans " + (j ? j + " j " + h + " h" : (h ? h + " h " + deuxChiffres(mn) : mn + " min"));
}
/* Compter une commande (chaque commande simple au premier niveau ; ; && et tubes compris), plafonné par ligne. */
function compterCommandeCh8(n){
	if (!grandPortOuvert()) return;
	if (typeof QUETES_CH8 !== "undefined" && !(state.quests && state.quests["n8_quai"]) && !sCh8().horlogeLibre) return;
	var c = sCh8();
	if (c.derniereLigne !== state.nbCommandes){ c.derniereLigne = state.nbCommandes; c.compteLigne = 0; }
	var k = Math.min(n || 1, PLAFOND_LIGNE_CH8 - c.compteLigne);
	if (k <= 0) return;
	c.compteLigne += k;
	c.compte = (c.compte || 0) + k;
}
var PROFONDEUR_PORT = 0;
var APPELER_AVANT_HORLOGE_PORT = Shell.appeler;
Shell.appeler = function(nom, args, io){
	if (PROFONDEUR_PORT === 0 && Shell.profondeur_script === 0) compterCommandeCh8(1);
	PROFONDEUR_PORT++;
	try { return APPELER_AVANT_HORLOGE_PORT.apply(this, arguments); }
	finally { PROFONDEUR_PORT--; }
};
/* Faire passer le temps : les commandes comptées ; une nuit qui tombe saute au matin (06:00). */
function avancerHorlogeCh8(){
	var c = sCh8(), nuits = 0;
	if (!c.base) c.base = baseJourCh8();
	c.minutes += Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH8;
	c.compteVu = c.compte || 0;
	var garde = 0;
	while (c.minutes % 1440 >= 22 * 60 && c.minutes < AUBE_CH8 && garde++ < 5 && !(state.has && state.has("rejeuEnCours"))){
		c.minutes = (Math.floor(c.minutes / 1440) + 1) * 1440 + 360;
		c.nuitsVues = (c.nuitsVues || 0) + 1;
		nuits++;
	}
	return { nuits: nuits, minutes: c.minutes, aube: c.minutes >= AUBE_CH8 };
}

/* ------------------------------------------------------------------ */
/* Les comptes, les unités, le matériel                                 */
/* ------------------------------------------------------------------ */

function lieuDuChapitre9(lieu){ lieu.chapitre = 9; return lieu; }
function texteHostsPort(h){
	var l = ["127.0.0.1\tlocalhost", "127.0.1.1\t" + h + "." + DOMAINE_PORT + " " + h, ""];
	HOTES_PORT.forEach(function(m){ l.push(IP_PORT[m] + "\t" + m + "." + DOMAINE_PORT + "\t" + m); });
	l.push("", "# The following lines are desirable for IPv6 capable hosts", "::1     localhost ip6-localhost ip6-loopback", "ff02::1 ip6-allnodes", "ff02::2 ip6-allrouters");
	return l.join("\n") + "\n";
}
function comptesPort(h, extra, groupes, dansDocker){
	var p = ["root:x:0:0:root:/root:/bin/bash"], s = ["root:*:20374:0:99999:7:::"], g = ["root:x:0:"];
	COMPTES_SYSTEME_ILE.forEach(function(c){ p.push(c[0] + ":x:" + c[1] + ":" + c[2] + ":" + c[0] + ":" + c[3] + ":/usr/sbin/nologin"); s.push(c[0] + ":*:20374:0:99999:7:::"); });
	(extra || []).forEach(function(c){ p.push(c[0] + ":x:" + c[1] + ":" + c[2] + ":" + (c[3] || "") + ":" + (c[4] || "/nonexistent") + ":" + (c[5] || "/usr/sbin/nologin")); s.push(c[0] + ":" + (c[6] || "*") + ":20374:0:99999:7:::"); });
	p.push(JOUEUR + ":x:1000:1000:Mousse du Grand Port,,,:/home/" + JOUEUR + ":/bin/bash");
	s.push(JOUEUR + ":$y$j9T$" + hexDe("port-" + h + "-sel", 22) + "$" + hexDe("port-" + h + "-mdp", 43) + ":20378:0:99999:7:::");
	g.push("daemon:x:1:", "bin:x:2:", "sys:x:3:", "adm:x:4:" + JOUEUR, "mail:x:8:", "man:x:12:", "www-data:x:33:", "backup:x:34:", "sudo:x:27:" + JOUEUR, "staff:x:50:",
		"users:x:100:" + JOUEUR, "nogroup:x:65534:", "systemd-journal:x:999:", "systemd-network:x:998:", "messagebus:x:107:", JOUEUR + ":x:1000:");
	if (dansDocker !== null) g.push("docker:x:989:" + (dansDocker ? JOUEUR : ""));
	(groupes || []).forEach(function(x){ g.push(x[0] + ":x:" + x[1] + ":" + (x[2] || "")); });
	return { passwd: p.join("\n") + "\n", shadow: s.join("\n") + "\n", group: g.join("\n") + "\n" };
}
var UNITES_PORT = {
	"docker.service": uniteIle("Docker Application Container Engine", { texte: "Type=notify\n# the default is not to use systemd for cgroups because the delegate issues still\n# exists and systemd currently does not support the cgroup feature set required\n# for containers run by docker\nEnvironmentFile=-/etc/default/docker\nExecStart=/usr/sbin/dockerd -H fd:// $DOCKER_OPTS\nExecReload=/bin/kill -s HUP $MAINPID\nTimeoutStartSec=0\nRestartSec=2\nRestart=always\n\n# Note that StartLimit* options were moved from \"Service\" to \"Unit\" in systemd 229.\n# Both the old, and new location are accepted by systemd 229 and up, so using the old location\n# to make them work for either version of systemd.\nStartLimitBurst=3\n\n# Having non-zero Limit*s causes performance problems due to accounting overhead\n# in the kernel. We recommend using cgroups to do container-local accounting.\nLimitNOFILE=infinity\nLimitNPROC=infinity\nLimitCORE=infinity\n\n# Comment TasksMax if your systemd version does not support it.\n# Only systemd 226 and above support this option.\nTasksMax=infinity\n\n# set delegate yes so that systemd does not reset the cgroups of docker containers\nDelegate=yes\n\n# kill only the docker process, not all processes in the cgroup\nKillMode=process\nOOMScoreAdjust=-500", unit: "Documentation=man:dockerd(8)\nAfter=network-online.target docker.socket firewalld.service containerd.service time-set.target\nWants=network-online.target containerd.service\nRequires=docker.socket\n" }),
	"docker.socket": "[Unit]\nDescription=Docker Socket for the API\n\n[Socket]\nListenStream=/run/docker.sock\nSocketMode=0660\nSocketUser=root\nSocketGroup=docker\n\n[Install]\nWantedBy=sockets.target\n",
	"containerd.service": uniteIle("containerd container runtime", { texte: "ExecStartPre=-/sbin/modprobe overlay\nExecStart=/usr/bin/containerd\nType=notify\nDelegate=yes\nKillMode=process\nRestart=always\nRestartSec=5\nLimitNPROC=infinity\nLimitCORE=infinity\nTasksMax=infinity\nOOMScoreAdjust=-999", unit: "Documentation=man:containerd(8)\nAfter=network.target local-fs.target dbus.service\n" }),
	"systemd-machined.service": uniteIle("Virtual Machine and Container Registration Service", { texte: "ExecStart=/usr/lib/systemd/systemd-machined\nBusName=org.freedesktop.machine1\nCapabilityBoundingSet=CAP_KILL CAP_SYS_PTRACE CAP_SYS_ADMIN CAP_SETGID CAP_SYS_CHROOT CAP_DAC_READ_SEARCH CAP_DAC_OVERRIDE CAP_CHOWN CAP_FOWNER CAP_FSETID CAP_MKNOD", unit: "Documentation=man:systemd-machined.service(8)\nRequires=machine.slice\nAfter=machine.slice\n" }, "Also=machines.target"),
	"systemd-nspawn@.service": uniteIle("Container %i", { texte: "ExecStart=systemd-nspawn --quiet --keep-unit --boot --link-journal=try-guest --network-veth -U --settings=override --machine=%i\nKillMode=mixed\nType=notify\nRestartForceExitStatus=133\nSuccessExitStatus=133\nWatchdogSec=3min\nSlice=machine.slice\nDelegate=yes", unit: "Documentation=man:systemd-nspawn(1)\nPartOf=machines.target\nBefore=machines.target\nAfter=network.target systemd-resolved.service modprobe@tun.service modprobe@loop.service modprobe@dm_mod.service\nRequiresMountsFor=/var/lib/machines/%i\n" }, "WantedBy=machines.target")
};
var PROFILS_PORT = {
	"docker.service": function(h){ return [{ comm: "dockerd", cmd: "/usr/sbin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock", cpu: 0.4, rss: 92400, threads: 14 }]; },
	"containerd.service": function(){ return [{ comm: "containerd", cmd: "/usr/bin/containerd", cpu: 0.2, rss: 47100, threads: 11 }]; }
};
var GIO8 = 1073741824, MIO8 = 1048576;
function materielPort(h, options){
	options = options || {};
	var base = baseJourCh8();
	var disques = [{ nom: "vda", taille: 64 * GIO8, modele: "QEMU HARDDISK", parts: [{ nom: "vda1", taille: 63 * GIO8, partuuid: hexDe("pu8" + h, 8) + "-01" }, { nom: "vda2", taille: GIO8 - MIO8 }], smart: { sain: true, realloues: 0, heures: 30, temperature: 30 } }];
	var fs = [{ source: "/dev/vda1", cible: "/", type: "ext4", taille: 63 * GIO8, inodes: 4128768, base: 3.1 * GIO8, baseInodes: 98000, uuid: hexDe("uuid8-" + h, 8) + "-" + hexDe("uuid82-" + h, 4) + "-4" + hexDe("uuid83-" + h, 3) + "-8" + hexDe("uuid84-" + h, 3) + "-" + hexDe("uuid85-" + h, 12), reserve: 0.05, options: "errors=remount-ro", systeme: true },
		{ source: "tmpfs", cible: "/run", type: "tmpfs", taille: 396 * MIO8, virtuel: true, utilise: 2 * MIO8, inodes: 499000, inodesUtilises: 900, cache: true }];
	return {
		cpus: options.cpus || 2, memoire: { total: options.memoire || 4026512, noyau: 180000, cache: 380000 }, demarrage: base - 26 * 3600000 - (condense(h) % 50) * 60000, fuseau: "Europe/Paris", derive: 0,
		demarrages: [{ idx: 0, debut: base - 26 * 3600000, noyau: NOYAU_PORT }], noyauAttendu: NOYAU_PORT,
		disques: disques, raid: [], pvs: [], vgs: [], lvs: [], fs: fs, virtuels: {},
		procs: [], io: { vda: { util: 3, r: 2, w: 6 } }, sockets: { estab: 8, closed: 0, orphaned: 0, timewait: 4 },
		dpkg: { interrompu: false, casses: [], retenus: [], aConfigurer: [] }, fabricant: "Chantier du Grand Port", modele: "Quai " + h
	};
}

/* ------------------------------------------------------------------ */
/* Poser une machine                                                   */
/* ------------------------------------------------------------------ */

var RACINES_PORT = {};
var DEFS_PORT = {};
function estMaMachinePort(h){ try { return !!(HOTES[h] && HOTES[h].arrivee && racineDe(HOTES[h].arrivee()) === RACINES_PORT[h]); } catch (e){ return false; } }
function refusPort(h){
	if (!estMaMachinePort(h)) return null;
	if (!state.has("ch8Ouvert")) return "ssh: Could not resolve hostname " + h + ": Name or service not known\n" + C.gris("(Cette machine est au Grand Port de Port-Aube, au chapitre 8.)");
	return null;
}
function poserMachinePort(h, def){
	DEFS_PORT[h] = def;
	var racine = lieuDuChapitre9(new Room(h, def.intro, def.image || "loc_machine_port.gif"));
	racine.racineHote = h;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	if (def.annexe) racine.horsBareme = true;
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + h);
	if (typeof Machines !== "undefined") link_rooms(Machines, racine);
	RACINES_PORT[h] = racine;
	// On arrive par ssh dans sa maison sur la machine (/home/JOUEUR), comme le vrai.
	decrireHote(h, { ip: IP_PORT[h], ouvert: true, noyau: NOYAU_PORT, arrivee: function(){ var m = racine.getChildFromName("home"); m = m && m !== -1 ? m.getChildFromName(JOUEUR) : null; return m && m !== -1 ? m : racine; }, refus: function(){ return refusPort(h); } });
	var profils = {};
	Object.keys(PROFILS_ILE).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_ILE[u](hh, M, lim); }; });
	Object.keys(PROFILS_PORT).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_PORT[u](hh, M, lim); }; });
	declarerMachine(h, {
		actif: function(){ return grandPortOuvert() && estMaMachinePort(h); },
		maintenant: function(){ return maintenantCh8(); },
		pas: PAS_HORLOGE_CH8,
		initial: function(){ return materielPort(h, def.materiel); },
		profils: profils,
		tempsDemarrage: { "ssh.service": 205, "cron.service": 28, "docker.service": 1240, "containerd.service": 410, "docker.socket": 12 }
	});
	construireMachinePort(h, def);
	(function marquer(lieu){ lieu.children.forEach(function(c){ if (c !== lieu && c.parents[0] === lieu){ c.horsBareme = true; c.chapitre = 9; marquer(c); } }); })(racine);
	return racine;
}
function binairesPort(P, liste){ liste.forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x", binaire: { sortie: "" } }); }); }
function construireMachinePort(h, def){
	var P = function(chemin, texte, options){ return poserFichierHote(h, chemin, texte, options || {}); };
	var D = function(chemin, options){ return creerDossierHote(h, chemin, options || {}); };
	var docker = HOTES_DOCKER_PORT.indexOf(h) > -1;
	var c = comptesPort(h, def.comptes, def.groupes, docker ? h !== "docks" : null);
	P("/etc/hostname", h + "\n");
	P("/etc/hosts", texteHostsPort(h));
	P("/etc/resolv.conf", "search " + DOMAINE_PORT + "\nnameserver 10.0.80.1\n");
	P("/etc/debian_version", "13.1\n");
	P("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 13 (trixie)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"13\"\nVERSION=\"13 (trixie)\"\nVERSION_CODENAME=trixie\nDEBIAN_VERSION_FULL=13.1\nID=debian\n");
	P("/etc/passwd", c.passwd);
	P("/etc/shadow", c.shadow, { mode: "rw-r-----" });
	P("/etc/group", c.group);
	P("/etc/nsswitch.conf", "passwd:         files systemd\ngroup:          files systemd\nshadow:         files systemd\ngshadow:        files systemd\n\nhosts:          files dns\nnetworks:       files\n\nprotocols:      db files\nservices:       db files\nethers:         db files\nrpc:            db files\n\nnetgroup:       nis\n");
	P("/etc/ssh/sshd_config", SSHD_CONFIG_DEBIAN);
	D("/etc/ssh/sshd_config.d");
	P("/etc/ssh/ssh_host_ed25519_key.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + btoa(hexDe("hote8-" + h, 24)).substring(0, 43) + " root@" + h + "\n");
	P("/etc/ssh/ssh_host_ed25519_key", "-----BEGIN OPENSSH PRIVATE KEY-----\n(clé privée de l'hôte)\n-----END OPENSSH PRIVATE KEY-----\n", { mode: "rw-------" });
	P("/etc/ssl/certs/ca-certificates.crt", BUNDLE_SYSTEME_ILE);
	binairesPort(P, ["/usr/sbin/sshd", "/usr/sbin/cron", "/usr/bin/curl", "/usr/bin/jq", "/usr/bin/tar", "/usr/bin/sha256sum"]);
	D("/etc/systemd/system");
	["ssh.service", "cron.service", "systemd-journald.service"].forEach(function(u){ if (UNITES_ILE[u]) P("/lib/systemd/system/" + u, UNITES_ILE[u]); });
	D("/root", { mode: "rwx------" });
	D("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	D("/tmp", { mode: "rwxrwxrwt" });
	D("/var/tmp", { mode: "rwxrwxrwt" });
	D("/var/log");
	D("/srv");
	D("/mnt");
	D("/opt");
	D("/proc");
	["meminfo", "loadavg", "uptime", "cpuinfo", "mounts", "version", "swaps"].forEach(function(n){
		var it = P("/proc/" + n, "", { mode: "r--r--r--" });
		it.taille = 0;
		texteVivant(it, function(){ return grandPortOuvert() && estMaMachinePort(h) && state && state.reseau && state.reseau.machines && state.reseau.machines[h] ? texteProcMachine(h, n) : ""; });
	});
	D("/run");
	if (docker){
		["docker.service", "docker.socket", "containerd.service"].forEach(function(u){ P("/lib/systemd/system/" + u, UNITES_PORT[u]); });
		D("/etc/docker");
		P("/etc/default/docker", "# Docker Upstart and SysVinit configuration file\n\n#\n# THIS FILE DOES NOT APPLY TO SYSTEMD\n#\n#   Please see the documentation for \"systemd drop-ins\":\n#   man systemd.unit\n#\n\n# Use DOCKER_OPTS to modify the daemon startup options.\n#DOCKER_OPTS=\"--dns 8.8.8.8 --dns 8.8.4.4\"\n");
		D("/var/lib/docker", { mode: "rwx--x---" });
		D("/var/lib/docker/volumes", { mode: "rwx------" });
		D("/var/lib/docker/containers", { mode: "rwx--x---" });
		D("/var/lib/docker/image", { mode: "rwx------" });
		D("/var/lib/docker/overlay2", { mode: "rwx--x---" });
		D("/var/lib/containerd", { mode: "rwx--x--x" });
		D("/run/containerd");
		var sock = P("/var/run/docker.sock", "", { mode: "rw-rw----", owner: "root" });
		sock.socket = true; sock.groupe = "docker"; sock.taille = 0;
		var sock2 = P("/run/docker.sock", "", { mode: "rw-rw----", owner: "root" });
		sock2.socket = true; sock2.groupe = "docker"; sock2.taille = 0;
		binairesPort(P, ["/usr/bin/docker", "/usr/sbin/dockerd", "/usr/sbin/docker-proxy", "/usr/sbin/docker-init", "/usr/bin/containerd", "/usr/bin/containerd-shim-runc-v2", "/usr/bin/ctr", "/usr/sbin/runc",
			"/usr/libexec/docker/cli-plugins/docker-compose", "/usr/libexec/docker/cli-plugins/docker-buildx", "/usr/bin/skopeo", "/usr/bin/hadolint"]);
		P("/usr/share/doc/docker.io/README.Debian", "Docker on Debian\n================\n\nTo use docker as a non-root user, add the user to the \"docker\" group:\n\n    usermod -aG docker <user>\n\nThe docker group grants privileges equivalent to the root user.\nLog out and log back in so that your group membership is re-evaluated.\n");
	}
	if (def.construire) def.construire(P, D);
}

/* ------------------------------------------------------------------ */
/* Les projets de l'école (dans /home/JOUEUR sur docks)                  */
/* ------------------------------------------------------------------ */

var PROJETS_PORT = {
	ecoleApp: "# ecole-port-aube : l'appli des inscriptions de l'école.\n" +
		"import os\n" +
		"from gouvernail import Gouvernail, repondre\n" +
		"from amarre_pg import connecter\n" +
		"from amarre_cache import Cache\n\n" +
		"def secret(nom):\n" +
		"    # Un secret se lit dans un fichier (NOM_FILE, par exemple /run/secrets/...), sinon dans la variable NOM.\n" +
		"    fichier = os.environ.get(nom + \"_FILE\")\n" +
		"    if fichier:\n" +
		"        with open(fichier) as f:\n" +
		"            return f.read().strip()\n" +
		"    return os.environ.get(nom, \"\")\n\n" +
		"PORT = int(os.environ.get(\"PORT\", \"8000\"))\n" +
		"VERSION = os.environ.get(\"VERSION\", \"1.0\")\n" +
		"MOT_DE_PASSE = secret(\"DB_PASSWORD\")\n\n" +
		"# Le numéro du processus, posé au démarrage : il faut un /tmp où l'on peut écrire.\n" +
		"with open(\"/tmp/ecole.pid\", \"w\") as f:\n" +
		"    f.write(str(os.getpid()))\n\n" +
		"app = Gouvernail(\"ecole\")\n" +
		"base = connecter(hote=os.environ.get(\"DB_HOST\", \"base\"), utilisateur=os.environ.get(\"DB_USER\", \"ecole\"),\n" +
		"                 mot_de_passe=MOT_DE_PASSE, base=os.environ.get(\"DB_NAME\", \"ecole\"))\n" +
		"cache = Cache(hote=os.environ.get(\"CACHE_HOST\", \"cache\"))\n\n" +
		"@app.route(\"/\")\ndef accueil():\n    return repondre.page(\"Cybersup, le Grand Port\", VERSION)\n\n" +
		"@app.route(\"/sante\")\ndef sante():\n    return repondre.json(etat=\"ok\", base=base.ping(), cache=cache.ping(), version=VERSION)\n\n" +
		"@app.route(\"/version\")\ndef version():\n    return VERSION\n\n" +
		"@app.route(\"/inscriptions\", methodes=[\"GET\", \"POST\"])\ndef inscriptions(requete):\n    if requete.methode == \"POST\":\n        base.ajouter(\"inscriptions\", requete.formulaire)\n    return repondre.json(inscriptions=base.compter(\"inscriptions\"))\n\n" +
		"app.lancer(hote=\"0.0.0.0\", port=PORT)\n",
	ecoleRequirements: "gouvernail==3.0.2\namarre-pg==2.9.9\namarre-cache==5.0.8\n",
	ecoleDockerfile: "# Le brouillon de l'ancien équipage : ça marche, mais...\nFROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt\nRUN apt-get update\nRUN apt-get install -y curl\nEXPOSE 8000\nCMD python app.py\n",
	ecoleNginx: "server {\n    listen       80;\n    server_name  localhost;\n\n    location / {\n        proxy_pass http://app:8000;\n        proxy_set_header Host $host;\n    }\n}\n",
	ecoleEnv: "# Les réglages de l'appli (env_file). Pas de mot de passe ici.\nDB_HOST=base\nDB_USER=ecole\nDB_NAME=ecole\nCACHE_HOST=cache\nVERSION=1.0\n",
	caisseServeur: "# serveur-cargaison : la caisse du quai, écrite par l'ancien équipage.\nimport os\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\n\nQUAI = os.environ[\"QUAI\"]\nPORT = int(os.environ.get(\"PORT\", \"8081\"))\n\nclass Caisse(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.end_headers()\n        self.wfile.write(\"Caisse ouverte\\n\".encode())\n\nprint(\"Caisse du quai\", QUAI, \"ouverte sur le port\", PORT)\nHTTPServer((\"0.0.0.0\", PORT), Caisse).serve_forever()\n",
	caisseDockerfile: "FROM python:3.12-slim\nWORKDIR /app\nCOPY serveur.py .\nEXPOSE 8081\nCMD [\"pyhton\", \"serveur.py\"]\n",
	convoiDockerfile: "FROM python:3.12-slim\nWORKDIR /app\nRUN pip install --no-cache-dir amarre-pg==2.9.9\nCOPY convoi.py .\nEXPOSE 8000\nCMD [\"python\", \"convoi.py\"]\n",
	convoiApp: "# convoi-port-aube : le registre des cargaisons, lu dans la base.\nimport os\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\nfrom amarre_pg import connecter\n\nHOTE = os.environ.get(\"DB_HOST\", \"localhost\")\nPORT = int(os.environ.get(\"PORT\", \"8000\"))\n\nclass Convoi(BaseHTTPRequestHandler):\n    def do_GET(self):\n        base = connecter(hote=HOTE, utilisateur=os.environ.get(\"DB_USER\", \"convoi\"),\n                         mot_de_passe=os.environ.get(\"DB_PASSWORD\", \"\"), base=os.environ.get(\"DB_NAME\", \"convoi\"))\n        n = base.compter(\"cargaisons\")\n        self.send_response(200)\n        self.end_headers()\n        self.wfile.write((str(n) + \" cargaisons\\n\").encode())\n\nHTTPServer((\"0.0.0.0\", PORT), Convoi).serve_forever()\n",
	convoiSql: "-- Le registre des cargaisons du convoi : douze caisses.\nCREATE TABLE cargaisons (\n    id integer PRIMARY KEY,\n    nom text,\n    quai integer\n);\nINSERT INTO cargaisons VALUES\n    (1, 'cordages', 1), (2, 'voiles', 1), (3, 'lanternes', 2), (4, 'ancres', 2),\n    (5, 'cartes', 3), (6, 'boussoles', 3), (7, 'tonneaux', 4), (8, 'filets', 4),\n    (9, 'rames', 5), (10, 'poulies', 5), (11, 'sextants', 6), (12, 'gouvernails', 6);\n",
	cartoApp: "# carto-port-aube : la carte des courants de la baie.\nimport os\nfrom http.server import HTTPServer, BaseHTTPRequestHandler\nimport boussole\nimport houle\n\nPORT = int(os.environ.get(\"PORT\", \"8090\"))\n\nclass Carte(BaseHTTPRequestHandler):\n    def do_GET(self):\n        self.send_response(200)\n        self.end_headers()\n        self.wfile.write(\"Carte des courants de la baie : prête.\\n\".encode())\n\nHTTPServer((\"0.0.0.0\", PORT), Carte).serve_forever()\n",
	cartoRequirements: "boussole==4.1.0\nhoule==2.1.3\n",
	cartoDockerfile: "FROM python:3.12\nWORKDIR /carto\nCOPY . .\nRUN pip install -r requirements.txt\nEXPOSE 8090\nCMD [\"python\", \"carto.py\"]\n",
	phareC: "/* phare.c : le faisceau du phare, un petit serveur HTTP sur le port 8080. */\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <unistd.h>\n#include <sys/socket.h>\n#include <netinet/in.h>\n\nint main(void) {\n    int s = socket(AF_INET, SOCK_STREAM, 0);\n    struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(8080) };\n    bind(s, (struct sockaddr *)&a, sizeof a);\n    listen(s, 16);\n    printf(\"phare : le faisceau balaie la baie sur le port 8080\\n\");\n    for (;;) {\n        int c = accept(s, NULL, NULL);\n        const char *r = \"HTTP/1.0 200 OK\\r\\n\\r\\nLe phare veille sur la baie.\\n\";\n        write(c, r, strlen(r));\n        close(c);\n    }\n}\n",
	phareMakefile: "CFLAGS = -O2 -static\n\nphare: phare.c\n\tcc $(CFLAGS) -o phare phare.c\n",
	phareDockerfile: "# Tout dans une seule étape : le compilateur part en mer avec le phare.\nFROM debian:12\nRUN apt-get update && apt-get install -y gcc make libc6-dev\nWORKDIR /src\nCOPY . .\nRUN make\nEXPOSE 8080\nCMD [\"/src/phare\"]\n",
	tempeteCompose: "# La pile de l'école pendant la tempête : elle tombe en boucle. Trois fautes s'y cachent.\nservices:\n  web:\n    image: nginx:1.27-alpine\n    ports:\n      - \"8088:80\"\n    volumes:\n      - ./web/default.conf:/etc/nginx/conf.d/default.conf:ro\n    depends_on:\n      - app\n    restart: unless-stopped\n\n  app:\n    image: ecole:1.0\n    env_file: app.env\n    environment:\n      DB_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n    depends_on:\n      - base\n      - cache\n    restart: unless-stopped\n\n  base:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_USER: ecole\n      POSTGRES_DB: ecole\n      POSTGRES_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n    volumes:\n      - donnees:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U ecole -p 5433\"]\n      interval: 10s\n      retries: 5\n    restart: unless-stopped\n\n  cache:\n    image: redis:7-alpine\n    mem_limit: 8m\n    restart: unless-stopped\n\nvolumes:\n  donnees:\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt\n"
};
function poserProjetsPort(P, D){
	var m = "/home/" + JOUEUR, o = { owner: JOUEUR };
	var ecrire = function(chemin, texte, extra){ var it = P(chemin, texte, o); it.owner = JOUEUR; if (extra) for (var k in extra) it[k] = extra[k]; return it; };
	var dossier = function(chemin){ var d = D(chemin, { owner: JOUEUR }); d.owner = JOUEUR; return d; };
	["ecole", "ecole/web", "ecole/config", "ecole/secrets", "ecole/data", "ecole/.git", "ecole/.git/objects", "caisse", "convoi", "carto", "carto/donnees", "phare", "tempete", "tempete/web", "tempete/secrets", "grand-port"].forEach(function(d){ dossier(m + "/" + d); });
	ecrire(m + "/ecole/app.py", PROJETS_PORT.ecoleApp);
	ecrire(m + "/ecole/requirements.txt", PROJETS_PORT.ecoleRequirements);
	ecrire(m + "/ecole/Dockerfile", PROJETS_PORT.ecoleDockerfile);
	ecrire(m + "/ecole/web/default.conf", PROJETS_PORT.ecoleNginx);
	ecrire(m + "/ecole/config/app.env", PROJETS_PORT.ecoleEnv);
	ecrire(m + "/ecole/secrets/db_password.txt", "Quai-des-Brumes-2026\n", { mode: "rw-------" });
	ecrire(m + "/ecole/README.md", "# L'appli de l'école\n\nUne appli web (app.py), une base (postgres), un cache (redis), un frontal (nginx, web/default.conf).\nLe mot de passe de la base est dans secrets/db_password.txt : il ne doit JAMAIS finir dans une image.\n");
	ecrire(m + "/ecole/data/archives-inscriptions.csv", "", { taille: 45200000 });
	ecrire(m + "/ecole/.git/HEAD", "ref: refs/heads/main\n");
	ecrire(m + "/ecole/.git/objects/pack-7f3a.pack", "", { taille: 12400000 });
	ecrire(m + "/caisse/serveur.py", PROJETS_PORT.caisseServeur);
	ecrire(m + "/caisse/Dockerfile", PROJETS_PORT.caisseDockerfile);
	ecrire(m + "/caisse/NOTE.txt", "Note de l'ancien équipage : la caisse du quai ne démarre plus. Elle doit répondre « Caisse ouverte » sur le port 8081.\nLe quai qu'elle sert : le 8 (variable QUAI).\n");
	ecrire(m + "/convoi/convoi.py", PROJETS_PORT.convoiApp);
	ecrire(m + "/convoi/init.sql", PROJETS_PORT.convoiSql);
	ecrire(m + "/convoi/NOTE.txt", "Le convoi : une appli (l'image convoi-app:1.0) et sa base (postgres:16-alpine).\nL'appli lit DB_HOST, DB_USER, DB_PASSWORD, DB_NAME. La base s'initialise avec init.sql (dans /docker-entrypoint-initdb.d).\nCompte de la base : convoi / mot de passe Convoi-du-Matin / base convoi.\n");
	ecrire(m + "/carto/carto.py", PROJETS_PORT.cartoApp);
	ecrire(m + "/carto/requirements.txt", PROJETS_PORT.cartoRequirements);
	ecrire(m + "/carto/Dockerfile", PROJETS_PORT.cartoDockerfile);
	ecrire(m + "/carto/donnees/releves-bruts.bin", "", { taille: 182000000 });
	ecrire(m + "/phare/phare.c", PROJETS_PORT.phareC);
	ecrire(m + "/phare/Makefile", PROJETS_PORT.phareMakefile);
	ecrire(m + "/phare/Dockerfile", PROJETS_PORT.phareDockerfile);
	ecrire(m + "/tempete/compose.yaml", PROJETS_PORT.tempeteCompose);
	ecrire(m + "/tempete/app.env", PROJETS_PORT.ecoleEnv);
	ecrire(m + "/tempete/web/default.conf", PROJETS_PORT.ecoleNginx);
	ecrire(m + "/tempete/secrets/db_password.txt", "Quai-des-Brumes-2026\n", { mode: "rw-------" });
}
/* Le carnet des clés de l'école : les clés d'hôte des machines connues (le Bastion du chapitre 5, Lumen, la Citadelle). */
function knownHostsPort(){
	var cle = function(h){ try { if (typeof axCleHote === "function") return axCleHote(h); } catch (e){} return "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("cle-hote-" + h, 43); };
	return "# Le carnet des clés de l'école : chaque machine de Cybersup, et l'empreinte de sa clé d'hôte.\n" +
		"bastion,10.0.95.10 " + clePubliqueBastionPort() + "\n" +
		"lumen,10.0.97.12 " + cle("lumen") + "\n" +
		"citadelle,10.0.92.1 " + cle("citadelle") + "\n";
}

/* ------------------------------------------------------------------ */
/* Les machines                                                        */
/* ------------------------------------------------------------------ */

var DAEMON_NAVIRE_PORT = "{\n  \"insecure-registries\": [\"entrepot.port-aube.lan:5000\"],\n  \"log-driver\": \"json-file\",\n  \"log-opts\": { \"max-size\": \"10m\", \"max-file\": \"3\" }\n}\n";
var DocksPort = poserMachinePort("docks", { image: "loc_machine_port.gif",
	intro: "La machine docks : le poste du Grand Port. Docker y est installé, mais personne n'y a encore travaillé proprement depuis le départ de l'ancien équipage.",
	construire: function(P, D){
		poserProjetsPort(P, D);
		P("/etc/ssh/ssh_known_hosts", knownHostsPort());
	} });
var EntrepotPort = poserMachinePort("entrepot", { image: "loc_machine_port.gif",
	intro: "La machine entrepot : le registre de l'école. Un disque vide, un démon docker, et toute la place qu'il faut pour les plans scellés de l'école.",
	construire: function(P, D){
		D("/srv/registre");
		D("/srv/registre/auth");
		D("/srv/registre/donnees");
		binairesPort(P, ["/usr/bin/htpasswd"]);
	} });
["navire1", "navire2", "navire3"].forEach(function(n){
	poserMachinePort(n, { image: "loc_navire_machine.gif",
		intro: "La machine " + n + " : un navire de l'escadre de l'école. Un démon docker, déjà réglé pour faire confiance au registre de l'entrepôt.",
		construire: function(P, D){ P("/etc/docker/daemon.json", DAEMON_NAVIRE_PORT); } });
});
var DouanePort = poserMachinePort("douane", { image: "loc_douane_machine.gif",
	intro: "La machine douane : la quarantaine. Aucune route vers le continent ni vers l'entrepôt. Ici, on lit les images suspectes ; on ne les lance pas.",
	construire: function(P, D){ D("/srv/quarantaine"); D("/home/" + JOUEUR + "/douane", { owner: JOUEUR }); } });
var ChaloupePort = poserMachinePort("chaloupe", { image: "loc_machine_port.gif", annexe: true,
	intro: "La machine chaloupe : un petit bateau sans capitaine. Pas de démon docker : podman, qui lance des conteneurs sans démon et sans root.",
	construire: function(P, D){
		binairesPort(P, ["/usr/bin/podman", "/usr/bin/conmon", "/usr/bin/crun", "/usr/bin/slirp4netns", "/usr/bin/skopeo"]);
		P("/etc/containers/registries.conf", "# Les registres où chercher un nom court (alpine, nginx...).\nunqualified-search-registries = [\"continent.lan\"]\n");
		P("/etc/subuid", JOUEUR + ":100000:65536\n");
		P("/etc/subgid", JOUEUR + ":100000:65536\n");
		D("/home/" + JOUEUR + "/.local/share/containers", { owner: JOUEUR });
	} });
var CabinePort = poserMachinePort("cabine", { image: "loc_machine_port.gif", annexe: true,
	intro: "La machine cabine : on y conserve une vieille cabine de navire, une arborescence Debian entière posée dans /var/lib/machines. Des conteneurs d'avant les conteneurs.",
	construire: function(P, D){
		var r = "/var/lib/machines/cabine-ancienne";
		D("/var/lib/machines", { mode: "rwx------" });
		["", "/bin", "/etc", "/home", "/root", "/tmp", "/usr", "/usr/bin", "/var", "/var/log", "/dev", "/proc", "/sys", "/lib"].forEach(function(d){ D(r + d, { mode: d === "/root" ? "rwx------" : (d === "/tmp" ? "rwxrwxrwt" : "rwxr-xr-x") }); });
		P(r + "/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"12\"\nVERSION=\"12 (bookworm)\"\nVERSION_CODENAME=bookworm\nID=debian\n");
		P(r + "/etc/hostname", "cabine-ancienne\n");
		P(r + "/etc/passwd", PASSWD_DEBIAN_PORT);
		P(r + "/etc/group", GROUP_DEBIAN_PORT);
		P(r + "/etc/motd", "La cabine du vieux navire. Un système entier, qui croit être seul au monde.\n");
		P(r + "/root/journal-de-bord.txt", "Journal de bord de la cabine.\nAvant les conteneurs, on enfermait déjà un système dans un dossier : chroot, puis systemd-nspawn.\nLes mêmes cloisons du noyau (les espaces de noms) font aujourd'hui les conteneurs.\n");
		["bash", "sh", "ls", "cat", "echo", "id", "hostname", "ps", "uname", "pwd", "env", "whoami", "mkdir", "touch", "rm", "cp", "mv", "grep", "head", "tail", "wc", "date"].forEach(function(b){
			var it = P(r + "/bin/" + b, "ELF " + b + "\n", { mode: "rwxr-xr-x" });
			it.binaire = { sortie: "", prog: b === "bash" ? "bash" : (b === "sh" ? "dash" : "coreutils") };
		});
		binairesPort(P, ["/usr/bin/systemd-nspawn", "/usr/bin/machinectl"]);
		P("/lib/systemd/system/systemd-nspawn@.service", UNITES_PORT["systemd-nspawn@.service"]);
		P("/lib/systemd/system/systemd-machined.service", UNITES_PORT["systemd-machined.service"]);
	} });

/* ------------------------------------------------------------------ */
/* À l'ouverture : les unités, l'état de départ du port                  */
/* ------------------------------------------------------------------ */

var MONDE_PORT_DECLARE = false;
function declarerUnitesPort(){
	if (MONDE_PORT_DECLARE) return;
	MONDE_PORT_DECLARE = true;
	Object.keys(DEFS_PORT).forEach(function(h){
		if (!estMaMachinePort(h)) return;
		var u = [["ssh.service", true, true], ["cron.service", true, true], ["systemd-journald.service", true, true]];
		if (HOTES_DOCKER_PORT.indexOf(h) > -1) u.push(["docker.service", true, true], ["docker.socket", true, true], ["containerd.service", true, true]);
		if (h === "cabine") u.push(["systemd-machined.service", true, false]);
		u.forEach(function(x){ declarerUnite(h, x[0], { actif: x[1], enabled: x[2] }); });
		declarerEcoute(h, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }]);
		declarerNoyau(h, { version: NOYAU_PORT });
	});
}
/* L'état de départ (une seule fois) : les processus des unités, la configuration chargée par les démons, ce qu'a laissé l'ancien équipage. */
function semerPort(){
	declarerUnitesPort();
	var P0 = etatPort("docks");
	if (P0.seme) return;
	P0.seme = true;
	HOTES_PORT.forEach(function(h){ if (estMaMachinePort(h)) synchroniserUnites(h); });
	HOTES_DOCKER_PORT.forEach(function(h){
		var P = etatPort(h);
		P.daemon.config = lireDaemonJsonPort(h).config || {};
		P.daemon.depuis = maintenantPort(h) - 26 * 3600000;
		journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Daemon has completed initialization", t: maintenantPort(h) - 26 * 3600000 });
	});
	// docks : ce qu'a laissé l'ancien équipage (deux images sans nom, une épave arrêtée).
	moteurSeul(function(){
		var alpine = imageCataloguePort("alpine");
		poserImagePort("docks", alpine, "alpine:3.20", "alpine@" + alpine.digestDepot);
		var hello = imageCataloguePort("hello-world");
		poserImagePort("docks", hello, "hello-world:latest", "hello-world@" + hello.digestDepot);
		[["vieux-filet", "RUN /bin/sh -c apk add --no-cache curl # buildkit", 2140000], ["vieille-ancre", "COPY ancre.sh /usr/local/bin/ # buildkit", 3100]].forEach(function(x, i){
			var fichiersAnciens = {};
			fichiersAnciens["/usr/local/bin/ancien-outil-" + i] = xPort(x[2], "coreutils");
			var couche = { cle: x[0], cmd: x[1], taille: x[2], fichiers: fichiersAnciens, supprimes: [] };
			ajouterCouchePort("docks", couche);
			var img = { couches: alpine.couches.concat([couche.id]), historique: alpine.historique.concat([{ created: "2026-09-02T14:1" + i + ":00Z", created_by: x[1], comment: "buildkit.dockerfile.v0" }]), config: copieJson(alpine.config), cree: "2026-09-02T14:1" + i + ":00Z", os: "linux", arch: "amd64", origine: "build" };
			img.id = sha256(configJsonPort(img));
			var pose = poserImagePort("docks", img, null, null);
			pose.pendante = true;
			pose.ajoute = maintenantPort("docks") - 40 * 86400000;
		});
		var epave = creerConteneurPort("docks", imagePort("docks", "alpine:3.20"), { nom: "epave", cmd: ["sh", "-c", "echo 'Le dernier quart est fini.'; exit 3"] }, "alpine:3.20");
		epave.cree = maintenantPort("docks") - 12 * 86400000;
		demarrerConteneurPort("docks", epave, { silencieux: true });
		epave.etat.fin = maintenantPort("docks") - 12 * 86400000 + 4000;
		epave.etat.debut = maintenantPort("docks") - 12 * 86400000 + 2000;
		// Les images d'avant l'épreuve II : l'appli du convoi, bâtie par l'ancien équipage.
		if (typeof construireSilencieuxPort === "function"){
			construireSilencieuxPort("docks", PROJETS_PORT.convoiDockerfile, "/home/" + JOUEUR + "/convoi", "convoi-app:1.0");
			construireSilencieuxPort("docks", PROJETS_PORT.caisseDockerfile, "/home/" + JOUEUR + "/caisse", "cargaison:1.0");
		}
		// La douane : l'image prise à l'éclaireur, chargée depuis une archive (docker load).
		var ecl = imageEclaireurPort();
		var posee = poserImagePort("douane", ecl, "eclaireur:prise", null);
		posee.ajoute = maintenantPort("douane") - 5 * 3600000;
	});
	evenementPort("docks", "seme", {});
}
/* L'image de l'éclaireur : alpine + la couche-témoin + le script du pavillon (inertes), USER root, ENV PAVILLON=noir, les Labels. */
function imageEclaireurPort(){
	var alpine = imageCataloguePort("alpine");
	cataloguePort();
	var img = { couches: alpine.couches.concat([COUCHE_TEMOIN_PORT, COUCHE_FLOTTE_PORT]),
		historique: alpine.historique.concat([
			{ created: "2026-10-16T21:12:41Z", created_by: "ADD temoin.txt /usr/local/share/flotte/temoin.txt # buildkit", comment: "buildkit.dockerfile.v0" },
			{ created: "2026-10-16T21:12:41Z", created_by: "COPY flotte.sh /etc/profile.d/flotte.sh # buildkit", comment: "buildkit.dockerfile.v0" },
			{ created: "2026-10-16T21:12:42Z", created_by: "ENV PAVILLON=noir", comment: "buildkit.dockerfile.v0", empty_layer: true },
			{ created: "2026-10-16T21:12:42Z", created_by: "USER root", comment: "buildkit.dockerfile.v0", empty_layer: true },
			{ created: "2026-10-16T21:12:42Z", created_by: "LABEL org.opencontainers.image.title=eclaireur port.constructeur=P.G. port.signature=" + signatureBastionPort(), comment: "buildkit.dockerfile.v0", empty_layer: true },
			{ created: "2026-10-16T21:12:42Z", created_by: "ENTRYPOINT [\"/bin/sh\" \"/etc/profile.d/flotte.sh\"]", comment: "buildkit.dockerfile.v0", empty_layer: true }]),
		config: { User: "root", Env: ["PATH=" + PATH_DEFAUT_PORT, "PAVILLON=noir"], Entrypoint: ["/bin/sh", "/etc/profile.d/flotte.sh"], Cmd: null,
			Labels: { "org.opencontainers.image.title": "eclaireur", "port.constructeur": "P.G.", "port.signature": signatureBastionPort() } },
		cree: "2026-10-16T21:12:42Z", os: "linux", arch: "amd64", origine: "load", quarantaine: true };
	img.id = sha256(configJsonPort(img));
	return img;
}
/* Les incidents que le monde pose au bon moment (épreuves de rang, défis). */
function poserEpreuveCaissePort(){
	var h = "docks";
	if (conteneurPort(h, "squatteur")) return;
	moteurSeul(function(){
		var alpine = imagePort(h, "alpine:3.20") || poserImagePort(h, imageCataloguePort("alpine"), "alpine:3.20", null);
		var sq = creerConteneurPort(h, alpine, { nom: "squatteur", cmd: ["sleep", "infinity"], ports: [{ ip: "", hp: 8081, cp: 8081, proto: "tcp" }], restart: { nom: "unless-stopped", max: 0 } }, "alpine:3.20");
		demarrerConteneurPort(h, sq, {});
		var img = imagePort(h, "cargaison:1.0");
		if (img){ var c = creerConteneurPort(h, img, { nom: "cargaison", ports: [{ ip: "", hp: 8081, cp: 8081, proto: "tcp" }] }, "cargaison:1.0"); demarrerConteneurPort(h, c, {}); }
	});
}
function poserSonarPort(){
	var h = "docks";
	if (conteneurPort(h, "sonar")) return;
	moteurSeul(function(){
		var alpine = imagePort(h, "alpine:3.20") || poserImagePort(h, imageCataloguePort("alpine"), "alpine:3.20", null);
		var s = creerConteneurPort(h, alpine, { nom: "sonar", cmd: ["sleep", "infinity"], montages: [{ type: "bind", source: "/var/run/docker.sock", cible: "/var/run/docker.sock", ro: false }], restart: { nom: "always", max: 0 } }, "alpine:3.20");
		demarrerConteneurPort(h, s, {});
	});
}

/* Le monde vérifie l'état à chaque commande : à l'ouverture du chapitre, le port se pose. */
var VERIFIER_MONDE_AVANT_PORT = verifierMonde;
verifierMonde = function(){
	try { if (grandPortOuvert()){ var c = sCh8(); if (!c.base) c.base = baseJourCh8(); semerPort(); } } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	return VERIFIER_MONDE_AVANT_PORT.apply(this, arguments);
};

World.fige = true;
