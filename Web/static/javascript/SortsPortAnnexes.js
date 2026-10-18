/**
 * SortsPortAnnexes.js : le moteur des conteneurs du Grand Port, huitième partie : les outils des quêtes annexes.
 *
 *   podman            (chaloupe) les conteneurs sans démon et sans root : le même moteur que docker, ses processus
 *                     appartiennent au joueur sur l'hôte (ps), les ports sous 1024 sont refusés, ses images sont
 *                     nommées en entier (continent.lan/library/alpine) ; podman unshare, podman info, version...
 *   unshare           les espaces de noms à la main : --pid --fork --mount-proc (ps n'y voit que lui), --uts
 *                     (hostname à part), --net (seulement lo, éteinte), --user --map-root-user (root sans l'être)
 *   nsenter           entrer dans les espaces de noms d'un processus (celui d'un conteneur : -t PID -n ip a)
 *   lsns              la liste des espaces de noms (ceux de l'hôte, ceux de chaque conteneur)
 *   ip netns          des espaces de noms réseau nommés : add, list, delete, exec
 *   skopeo            inspect et list-tags d'une image distante sans la tirer ; copy d'un registre à l'autre
 *   docker buildx     ls, create, use, inspect, rm, build --platform (plusieurs plateformes, poussées en une liste)
 *   docker manifest   inspect (la liste des plateformes d'une image)
 *   hadolint          relire un Dockerfile (DL3008, DL3009, DL3015, DL3025, DL3059...)
 *   systemd-nspawn    (cabine) un système entier dans un dossier : -D DOSSIER, --boot
 *   machinectl        list, list-images, start, shell, status, stop, poweroff
 *
 * --- Ce que le monde peut appeler ---
 *   conteneursPodmanPort() les conteneurs de la chaloupe ; rootlessPort(c) ; espacesNetnsPort(h) ;
 *   buildersPort() ; machinesNspawnPort() ; resultatHadolintPort(texte) (la liste des remarques)
 * Événements { type: "port", cmd: ... } : podman, unshare, nsenter, lsns, netns, skopeo, buildx, manifest, hadolint,
 * nspawn, machinectl (avec les détails utiles : options, cible, résultat).
 */

/* ================================================================== */
/* Le commun                                                            */
/* ================================================================== */

function exigerHotePortAnnexe(nom, io){
	var h = Shell.hote();
	if (!estHotePort(h)) throw new ShellError("bash: " + nom + ": command not found" + astuce(io, nom + " sert sur les machines du Grand Port (ssh docks, ssh chaloupe, ssh cabine)."), 127);
	return h;
}
function exigerBinairePort(h, nom, chemin, io, conseil){
	if (!fichierHote(h, chemin)) throw new ShellError("bash: " + nom + ": command not found" + (conseil ? astuce(io, conseil) : ""), 127);
}
function json4Port(o){ return JSON.stringify(o, null, 4); }
function json3Port(o){ return JSON.stringify(o, null, 3); }
/* Un registre, avec ou sans TLS (skopeo --tls-verify=false, docker manifest --insecure). */
function joindreRegistreTlsPort(h, registre, auth, sansTls){
	var hote = registre.split(":")[0], port = +(registre.split(":")[1] || 443);
	var hr = resoudreHotePort(hote, h);
	if (!hr) return { erreur: "pinging container registry " + registre + ": Get \"https://" + registre + "/v2/\": dial tcp: lookup " + hote + " on 10.0.80.1:53: no such host" };
	var ec = ecouteurHotePort(hr, port, h, false);
	if (!ec) return { erreur: "pinging container registry " + registre + ": Get \"" + (sansTls ? "http" : "https") + "://" + registre + "/v2/\": dial tcp " + ipPort(hr) + ":" + port + ": connect: connection refused" };
	if (!sansTls) return { erreur: "pinging container registry " + registre + ": Get \"https://" + registre + "/v2/\": http: server gave HTTP response to HTTPS client" };
	if (!ec.conteneur || !ec.conteneur.programme || ec.conteneur.programme.type !== "registry") return { erreur: "reading manifest: unexpected status code 404" };
	return { ok: true, hr: ec.hote, cr: ec.conteneur, auth: authRegistrePort(ec.hote, ec.conteneur, auth) };
}

/* ================================================================== */
/* podman                                                               */
/* ================================================================== */

var VERSION_PODMAN_PORT = "5.4.2";
function conteneursPodmanPort(){ return estHotePort(HOTE_PODMAN_PORT) ? conteneursPort(HOTE_PODMAN_PORT) : []; }
function rootlessPort(c){ return !!(c && c.hote && c.hote.rootless); }
function nomPodmanPort(ref){ var a = analyserRefPort(ref); return a.registre + "/" + a.depot + (a.tag ? ":" + a.tag : ""); }
function reposPodmanPort(ref){ var a = analyserRefPort(ref); return { repo: a.registre + "/" + a.depot, tag: a.tag || "<none>" }; }
function taillePodmanPort(o){ var u = ["B", "kB", "MB", "GB"], i = 0, v = o; while (v >= 1000 && i < 3){ v /= 1000; i++; } return (i ? v.toFixed(v >= 100 ? 0 : (v >= 10 ? 1 : 2)) : String(v)) + " " + u[i]; }
/* Les colonnes de podman : deux espaces entre elles. */
function tableauPodmanPort(entetes, lignes){
	var l = [entetes].concat(lignes), larg = entetes.map(function(e, i){ return Math.max.apply(null, l.map(function(x){ return String(x[i] === undefined ? "" : x[i]).length; })); });
	return l.map(function(x){ return x.map(function(v, i){ return i === x.length - 1 ? String(v) : completerDroite(String(v), larg[i] + 2); }).join("").replace(/\s+$/, ""); }).join("\n");
}
/* Tirer en silence puis écrire ce qu'écrit podman (sur la sortie d'erreur, comme lui). */
function tirerPodmanPort(h, ref, io){
	var a = analyserRefPort(ref);
	if (!a.valide) throw new ShellError("Error: parsing reference \"" + ref + "\": invalid reference format", 125);
	var avant = imagePort(h, a.nomTag);
	var r = tirerImagePort(h, ref, io, true);
	if (r.erreur){
		var m = /pull access denied|manifest unknown|not found/.test(r.erreur) ? "Error: initializing source docker://" + nomPodmanPort(ref) + ": reading manifest " + (a.tag || a.digest) + " in " + a.registre + "/" + a.depot + ": manifest unknown" : "Error: " + r.erreur.replace(/^Error response from daemon: /, "");
		throw new ShellError(m, 125);
	}
	var img = r.image || imagePort(h, a.nomTag);
	var t = "Trying to pull " + nomPodmanPort(ref) + "...\nGetting image source signatures\n" + (img.couches || []).map(function(id){ return "Copying blob " + blobPort(id).substring(0, 12) + " " + (avant ? "skipped: already exists" : "done") + "   | "; }).join("\n") +
		"\nCopying config " + courtPort(img.id).substring(0, 10) + " done   | \nWriting manifest to image destination";
	io.err(t);
	return img;
}
function premiereImageArgsPort(a, def){
	var d = lireDrapeauxPort(a.slice(), def, "run", true);
	return d.reste[0];
}
Shell.sorts.podman = function(args, io){
	var h = exigerHotePortAnnexe("podman", io);
	exigerBinairePort(h, "podman", "/usr/bin/podman", io, "podman est installé sur la chaloupe : ssh chaloupe.");
	var a = args.slice();
	if (a[0] === "--version" || a[0] === "-v") return "podman version " + VERSION_PODMAN_PORT;
	if (!a.length) return "Manage pods, containers and images\n\nUsage:\n  podman [options] [command]\n\nAvailable Commands:\n  build       Build an image using instructions from Containerfiles\n  exec        Run a process in a running container\n  images      List images in local storage\n  info        Display podman system information\n  inspect     Display the configuration of object denoted by ID\n  logs        Fetch the logs of one or more containers\n  ps          List containers\n  pull        Pull an image from a registry\n  rm          Remove one or more containers\n  rmi         Remove one or more images from local storage\n  run         Run a command in a new container\n  start       Start one or more containers\n  stop        Stop one or more containers\n  top         Display the running processes of a container\n  unshare     Run a command in a modified user namespace\n  version     Display the Podman version information";
	var sous = a.shift();
	evenementPort(h, "podman", { sous: sous, args: a.slice(), sudo: !!io.sudo });
	if (sous === "version") return "Client:       podman\nVersion:      " + VERSION_PODMAN_PORT + "\nAPI Version:  " + VERSION_PODMAN_PORT + "\nGo Version:   go1.24.4\nBuilt:        Thu Jun 12 00:00:00 2025\nBuild Origin: Debian\nOS/Arch:      linux/amd64";
	if (sous === "info") return infoPodmanPort(h, a, io);
	if (sous === "unshare") return unsharePodmanPort(h, a, io);
	if (sous === "images" || (sous === "image" && (a[0] === "ls" || a[0] === "list"))){ if (sous === "image") a.shift(); return imagesPodmanPort(h, a, io); }
	if (sous === "ps" || (sous === "container" && (a[0] === "ls" || a[0] === "list"))){ if (sous === "container") a.shift(); return psPodmanPort(h, a, io); }
	if (sous === "pull"){ var ref = a.filter(function(x){ return x.charAt(0) !== "-"; })[0]; if (!ref) throw new ShellError("Error: requires at least 1 arg(s), only received 0", 125); var im = tirerPodmanPort(h, ref, io); return im.id; }
	if (sous === "system" && a[0] === "migrate") return "";
	if (sous === "machine") throw new ShellError("Error: podman machine sert à lancer une machine virtuelle sur un poste qui n'a pas de noyau Linux ; la chaloupe en a un.", 125);
	if (["run", "create", "start", "stop", "restart", "kill", "rm", "rmi", "logs", "exec", "inspect", "top", "port", "tag", "volume", "network", "build", "cp", "diff", "stats", "pause", "unpause", "rename", "wait", "save", "load", "history", "login", "logout", "push"].indexOf(sous) === -1)
		throw new ShellError("Error: unrecognized command `podman " + sous + "`\nTry 'podman --help' for more information", 125);
	if (sous === "run" || sous === "create"){
		var img = premiereImageArgsPort(a, DEF_RUN_PORT);
		// Les ports privilégiés : un utilisateur ordinaire ne peut pas écouter sous 1024.
		if (!io.sudo) for (var i = 0; i < a.length; i++){
			var v = null;
			if (a[i] === "-p" || a[i] === "--publish") v = a[i + 1]; else if (/^-p./.test(a[i])) v = a[i].substring(2); else if (/^--publish=/.test(a[i])) v = a[i].substring(10);
			if (v){ var pp = lirePortArgPort(v); if (pp.hp && +pp.hp < 1024) throw new ShellError("Error: rootlessport cannot expose privileged port " + pp.hp + ", you can add 'net.ipv4.ip_unprivileged_port_start=" + pp.hp + "' to /etc/sysctl.conf (currently 1024), or choose a larger port number (>= 1024): listen tcp 0.0.0.0:" + pp.hp + ": bind: permission denied", 126); }
		}
		if (img && !imagePort(h, img)) tirerPodmanPort(h, img, io);
	}
	MODE_PODMAN_PORT = io.sudo ? "root" : "rootless";
	try {
		var sortie = docker1Port(h, sous, a, io, false);
		return sous === "images" ? sortie : String(sortie === undefined ? "" : sortie);
	} catch (e){
		if (!(e instanceof ShellError)) throw e;
		throw new ShellError(String(e.message).replace(/^docker: Error response from daemon: /, "Error: ").replace(/^Error response from daemon: /, "Error: ").replace(/^docker: /, "Error: ").replace(/See 'docker /g, "See 'podman ").replace(/\n\nSee 'podman [^']*'\.$/, ""), e.code || 125);
	} finally { MODE_PODMAN_PORT = false; }
};
function imagesPodmanPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet" }, booleens: ["all", "quiet", "no-trunc", "digests"], valeurs: ["format", "filter"] }, "images");
	var lignes = [];
	imagesPort(h).slice().sort(function(x, y){ return Date.parse(y.cree) - Date.parse(x.cree); }).forEach(function(im){
		var tags = tagsPort(h, im);
		(tags.length ? tags : [null]).forEach(function(t){ var r = t ? reposPodmanPort(t) : { repo: "<none>", tag: "<none>" }; lignes.push([r.repo, r.tag, courtPort(im.id), ilYaPort(h, Date.parse(im.cree)), taillePodmanPort(tailleImagePort(h, im))]); });
	});
	if (d.o.quiet) return lignes.map(function(l){ return l[2]; }).filter(function(v, i, t){ return t.indexOf(v) === i; }).join("\n");
	return tableauPodmanPort(["REPOSITORY", "TAG", "IMAGE ID", "CREATED", "SIZE"], lignes);
}
function psPodmanPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet", l: "latest" }, booleens: ["all", "quiet", "latest", "no-trunc", "size"], valeurs: ["format", "filter"] }, "ps");
	var cs = conteneursPort(h).filter(function(c){ return d.o.all || enMarchePort(c); }).sort(function(x, y){ return x.cree - y.cree; });
	if (d.o.latest) cs = cs.slice(-1);
	evenementPort(h, "podmanPs", { conteneurs: cs.map(function(c){ return { nom: c.nom, rootless: rootlessPort(c), statut: c.etat.statut }; }) });
	if (d.o.quiet) return cs.map(function(c){ return c.id.substring(0, 12); }).join("\n");
	if (d.o.format) return cs.map(function(c){ var o = objetPsPort(h, c); o.Image = nomPodmanPort(c.imageRef); return gabaritPort(d.o.format, o); }).join("\n");
	return tableauPodmanPort(["CONTAINER ID", "IMAGE", "COMMAND", "CREATED", "STATUS", "PORTS", "NAMES"], cs.map(function(c){
		var cmd = (c.config.Entrypoint || []).concat(c.config.Cmd || []).join(" ");
		if (cmd.length > 20) cmd = cmd.substring(0, 17) + "...";
		var ports = enMarchePort(c) ? portsPubliesPort(h, c).map(function(p){ return "0.0.0.0:" + p.hp + "->" + p.cp + "/" + (p.proto || "tcp"); }).join(", ") : "";
		return [c.id.substring(0, 12), /^[0-9a-f]{64}$/.test(c.imageRef) ? courtPort(c.imageRef) : nomPodmanPort(c.imageRef), cmd, ilYaPort(h, c.cree), texteStatutPort(h, c).replace(/^Up Less than a second$/, "Up Less than a second"), ports, c.nom];
	}));
}
function infoPodmanPort(h, a, io){
	var root = !!io.sudo, home = "/home/" + JOUEUR, uid = uidMachine(h, JOUEUR);
	var cs = conteneursPort(h);
	return "host:\n  arch: amd64\n  buildahVersion: 1.39.4\n  cgroupManager: systemd\n  cgroupVersion: v2\n  conmon:\n    package: conmon_2.1.12-4_amd64\n    path: /usr/bin/conmon\n  distribution:\n    codename: trixie\n    distribution: debian\n    version: \"13\"\n  hostname: " + h +
		"\n  idMappings:\n" + (root ? "    gidmap: []\n    uidmap: []\n" : "    gidmap:\n    - container_id: 0\n      host_id: " + uid + "\n      size: 1\n    - container_id: 1\n      host_id: 100000\n      size: 65536\n    uidmap:\n    - container_id: 0\n      host_id: " + uid + "\n      size: 1\n    - container_id: 1\n      host_id: 100000\n      size: 65536\n") +
		"  kernel: " + NOYAU_PORT + "\n  ociRuntime:\n    name: crun\n    path: /usr/bin/crun\n  os: linux\n  pasta:\n    executable: /usr/bin/pasta\n  security:\n    rootless: " + !root + "\n    seccompEnabled: true\n" +
		"registries:\n  search:\n  - " + REGISTRE_CONTINENT_PORT + "\nstore:\n  configFile: " + (root ? "/etc/containers/storage.conf" : home + "/.config/containers/storage.conf") + "\n  containerStore:\n    number: " + cs.length + "\n    paused: 0\n    running: " + cs.filter(enMarchePort).length + "\n    stopped: " + cs.filter(function(c){ return !enMarchePort(c); }).length +
		"\n  graphDriverName: overlay\n  graphRoot: " + (root ? "/var/lib/containers/storage" : home + "/.local/share/containers/storage") + "\n  imageStore:\n    number: " + imagesPort(h).length + "\n  runRoot: " + (root ? "/run/containers/storage" : "/run/user/" + uid + "/containers") + "\n  volumePath: " + (root ? "/var/lib/containers/storage/volumes" : home + "/.local/share/containers/storage/volumes") +
		"\nversion:\n  APIVersion: " + VERSION_PODMAN_PORT + "\n  Built: 1749686400\n  GoVersion: go1.24.4\n  Os: linux\n  OsArch: linux/amd64\n  Version: " + VERSION_PODMAN_PORT;
}
/* podman unshare : la commande, dans l'espace de noms utilisateur des conteneurs du joueur (root y est le joueur). */
function unsharePodmanPort(h, a, io){
	if (io.sudo) throw new ShellError("Error: please use unshare with rootless", 125);
	var uid = uidMachine(h, JOUEUR);
	var cmd = a.join(" ");
	if (!a.length || /^(bash|sh|\/bin\/bash|\/bin\/sh)$/.test(cmd)) return "(podman unshare ouvre un shell où tu es root dans l'espace de noms de tes conteneurs. Le jeu lit une commande à la fois : podman unshare id, podman unshare cat /proc/self/uid_map.)";
	if (/^id( -u)?$/.test(cmd)) return a[1] === "-u" ? "0" : "uid=0(root) gid=0(root) groups=0(root),65534(nogroup)";
	if (cmd === "whoami") return "root";
	if (/^cat \/proc\/self\/(uid|gid)_map$/.test(cmd)) return "         0       " + uid + "          1\n         1     100000      65536";
	if (/^ls -ln? /.test(cmd) || /^ls -la? /.test(cmd)){
		var chemin = a[a.length - 1].replace(/^~/, "/home/" + JOUEUR);
		var r = Shell.chercher(chemin, io, "ls");
		if (!r.node) throw new ShellError("ls: cannot access '" + a[a.length - 1] + "': No such file or directory", 2);
		var lignes = [];
		var noeuds = r.node instanceof Room ? r.node.children.filter(function(x){ return x.parents && x.parents[0] === r.node; }).concat(r.node.items || []) : [r.node];
		noeuds.forEach(function(n){ var u = uidHotePort(h, n.owner || JOUEUR); var vu = u === uid ? "root" : (u >= 100000 && u < 165536 ? String(u - 100000 + 1) : "nobody"); lignes.push((n instanceof Room ? "d" : "-") + (n.mode || "rw-r--r--") + " 1 " + vu + " " + vu + " " + (n instanceof Room ? n.room_name : n.itemname)); });
		return lignes.join("\n");
	}
	throw new ShellError("(podman unshare : le jeu sait y lancer id, whoami, cat /proc/self/uid_map, ls -l DOSSIER.)", 1);
}

/* ================================================================== */
/* unshare : une session dans de nouveaux espaces de noms               */
/* ================================================================== */

var UNSHARE_PORT = null;
function optionsUnsharePort(args){
	var o = { pid: false, fork: false, mountProc: false, mount: false, uts: false, net: false, ipc: false, user: false, mapRoot: false, cmd: [] };
	for (var i = 0; i < args.length; i++){
		var x = args[i];
		if (x.charAt(0) !== "-"){ o.cmd = args.slice(i); break; }
		if (x === "--") { o.cmd = args.slice(i + 1); break; }
		if (/^--mount-proc/.test(x)){ o.mountProc = true; o.mount = true; continue; }
		var longs = { "--pid": "pid", "--fork": "fork", "--mount": "mount", "--uts": "uts", "--net": "net", "--ipc": "ipc", "--user": "user", "--map-root-user": "mapRoot", "--map-current-user": "mapCourant" };
		if (longs[x]){ o[longs[x]] = true; if (x === "--map-root-user") o.user = true; continue; }
		if (/^-[a-zA-Z]+$/.test(x)){
			var courts = { p: "pid", f: "fork", m: "mount", u: "uts", n: "net", i: "ipc", U: "user", r: "mapRoot", c: "mapCourant", C: "cgroup", T: "time" };
			for (var k = 1; k < x.length; k++){ var n = courts[x.charAt(k)]; if (!n) throw new ShellError("unshare: invalid option -- '" + x.charAt(k) + "'\nTry 'unshare --help' for more information.", 1); o[n] = true; if (n === "mapRoot") o.user = true; }
			continue;
		}
		throw new ShellError("unshare: unrecognized option '" + x + "'\nTry 'unshare --help' for more information.", 1);
	}
	return o;
}
Shell.sorts.unshare = function(args, io){
	var h = exigerHotePortAnnexe("unshare", io);
	if (UNSHARE_PORT) throw new ShellError("(Tu es déjà dans un unshare : exit d'abord.)", 1);
	var o = optionsUnsharePort(args);
	if (!o.pid && !o.mount && !o.uts && !o.net && !o.ipc && !o.user) throw new ShellError("(unshare sans option ne sépare rien : --pid --fork --mount-proc, --uts, --net, --user --map-root-user.)", 1);
	evenementPort(h, "unshare", { pid: o.pid, fork: o.fork, mountProc: o.mountProc, uts: o.uts, net: o.net, user: o.user, mapRoot: !!o.mapRoot, sudo: !!io.sudo, cmd: o.cmd.join(" ") });
	if (!io.sudo && !o.user) throw new ShellError("unshare: unshare failed: Operation not permitted", 1);
	if (o.mountProc && !o.pid) {}
	if (o.mountProc && !io.sudo && !o.mapRoot) throw new ShellError("unshare: mount /proc failed: Permission denied", 1);
	var s = { h: h, o: o, sudo: !!io.sudo || !!o.mapRoot, hostname: h, lo: false, pid: 1, debut: state.nbCommandes };
	var cmd = o.cmd.length ? o.cmd : ["bash"];
	var shell = /^(\/bin\/|\/usr\/bin\/)?(bash|sh)$/.test(cmd[0]);
	if (o.pid && !o.fork && shell) return "-bash: fork: Cannot allocate memory" + astuce(io, "Sans --fork, c'est unshare lui-même qui devient le premier processus du nouvel espace, puis s'en va : le shell ne peut plus rien lancer. --fork crée un enfant qui, lui, devient le PID 1.");
	if (!shell){
		UNSHARE_PORT = s;
		try { var r = Shell.appeler(cmd[0], cmd.slice(1), io); return r; } finally { UNSHARE_PORT = null; }
	}
	UNSHARE_PORT = s;
	var lignes = [];
	if (o.pid && o.fork && !o.mountProc) lignes.push(C.gris("(Sans --mount-proc, /proc reste celui de l'hôte : ps verra encore tout le monde.)"));
	return lignes.join("\n");
};
function fermerUnsharePort(){ var s = UNSHARE_PORT; UNSHARE_PORT = null; if (s) evenementPort(s.h, "unshareFin", { duree: state.nbCommandes - s.debut }); }
function psUnsharePort(args){
	var s = UNSHARE_PORT;
	var aux = args.some(function(a){ return /^-?[a-z]*[aex][a-z]*$/.test(a) && /[aux]/.test(a) || a === "-e" || a === "-ef" || a === "aux"; });
	var root = s.sudo ? "root" : JOUEUR;
	if (aux) return "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n" + completerDroite(root, 8) + "       1  0.0  0.1   7064  3712 pts/0    S    " + heureMinutePort() + "   0:00 -bash\n" + completerDroite(root, 8) + "       " + (s.pid + 7) + "  0.0  0.1  11084  4352 pts/0    R+   " + heureMinutePort() + "   0:00 ps " + args.join(" ");
	return "    PID TTY          TIME CMD\n      1 pts/0    00:00:00 bash\n      " + (s.pid + 7) + " pts/0    00:00:00 ps";
}
function heureMinutePort(){ var d = dateMachine(Shell.hote(), maintenantPort(Shell.hote())); return deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()); }
function ipNetVidePort(lo){ return "1: lo: <LOOPBACK" + (lo ? ",UP,LOWER_UP" : "") + "> mtu 65536 qdisc noop state " + (lo ? "UNKNOWN" : "DOWN") + " mode DEFAULT group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00" + (lo ? "\n    inet 127.0.0.1/8 scope host lo\n       valid_lft forever preferred_lft forever" : ""); }
(function(){
	var PS = Shell.sorts.ps;
	Shell.sorts.ps = function(args, io){ if (UNSHARE_PORT && UNSHARE_PORT.h === Shell.hote() && UNSHARE_PORT.o.pid && UNSHARE_PORT.o.fork && UNSHARE_PORT.o.mountProc){ evenementPort(UNSHARE_PORT.h, "unsharePs", {}); return psUnsharePort(args); } return PS.apply(this, arguments); };
	var HOSTNAME = Shell.sorts.hostname;
	Shell.sorts.hostname = function(args, io){
		if (UNSHARE_PORT && UNSHARE_PORT.h === Shell.hote() && UNSHARE_PORT.o.uts){
			var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
			if (nom){ if (!UNSHARE_PORT.sudo) throw new ShellError("hostname: you must be root to change the host name", 1); UNSHARE_PORT.hostname = nom; evenementPort(UNSHARE_PORT.h, "unshareHostname", { nom: nom }); return ""; }
			return UNSHARE_PORT.hostname;
		}
		return HOSTNAME.apply(this, arguments);
	};
	var IP = Shell.sorts.ip;
	Shell.sorts.ip = function(args, io){
		var h = Shell.hote();
		if (UNSHARE_PORT && UNSHARE_PORT.h === h && UNSHARE_PORT.o.net && args[0] !== "netns"){
			if (/^l/.test(args[0] || "") && args[1] === "set" && args[3] === "up"){ if (!UNSHARE_PORT.sudo) throw new ShellError("RTNETLINK answers: Operation not permitted", 2); UNSHARE_PORT.lo = true; return ""; }
			if (/^(a|ad|add|addr|address|l|li|lin|link)$/.test(args[0] || "")) return ipNetVidePort(UNSHARE_PORT.lo);
			if (/^r/.test(args[0] || "")) return "";
		}
		if (args[0] === "netns" && estHotePort(h)) return netnsPort(h, args.slice(1), io);
		if (NETNS_EXEC_PORT && args[0] !== "netns"){
			var ns = espacesNetnsPort(h)[NETNS_EXEC_PORT];
			if (ns){
				if (/^l/.test(args[0] || "") && args[1] === "set" && args[2] === "lo" && args[3] === "up"){ ns.lo = true; return ""; }
				if (/^(a|ad|add|addr|address|l|li|lin|link)$/.test(args[0] || "") && args[1] !== "add") return ipNetVidePort(ns.lo);
				if (/^r/.test(args[0] || "")) return "";
			}
		}
		return IP.apply(this, arguments);
	};
	var ID = Shell.sorts.id;
	Shell.sorts.id = function(args, io){
		if (UNSHARE_PORT && UNSHARE_PORT.h === Shell.hote() && UNSHARE_PORT.o.user){
			if (UNSHARE_PORT.o.mapRoot) return args.indexOf("-u") > -1 ? "0" : "uid=0(root) gid=0(root) groups=0(root),65534(nogroup)";
			return args.indexOf("-u") > -1 ? "65534" : "uid=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)";
		}
		return ID.apply(this, arguments);
	};
	var WHOAMI = Shell.sorts.whoami;
	Shell.sorts.whoami = function(args, io){ if (UNSHARE_PORT && UNSHARE_PORT.h === Shell.hote() && UNSHARE_PORT.o.user) return UNSHARE_PORT.o.mapRoot ? "root" : "nobody"; return WHOAMI.apply(this, arguments); };
	var EXIT = Shell.sorts.exit;
	Shell.sorts.exit = function(args, io){ if (UNSHARE_PORT){ fermerUnsharePort(); return ""; } if (NSPAWN_HOTE_PORT){ return ""; } return EXIT.apply(this, arguments); };
	var PING = Shell.sorts.ping;
	if (PING) Shell.sorts.ping = function(args, io){
		var ns = NETNS_EXEC_PORT ? espacesNetnsPort(Shell.hote())[NETNS_EXEC_PORT] : (UNSHARE_PORT && UNSHARE_PORT.o.net ? { lo: UNSHARE_PORT.lo } : null);
		if (ns){ var cible = args.filter(function(a){ return a.charAt(0) !== "-" && !/^\d+$/.test(a); })[0] || ""; if (!ns.lo || !/^127\./.test(cible) && cible !== "localhost") throw new ShellError("ping: connect: Network is unreachable", 2); return "PING " + cible + " (127.0.0.1) 56(84) bytes of data.\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.031 ms\n\n--- " + cible + " ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 0ms"; }
		return PING.apply(this, arguments);
	};
})();
var INVITE_AVANT_ANNEXES_PORT = Shell.invite;
Shell.invite = function(){
	var t = INVITE_AVANT_ANNEXES_PORT.apply(this, arguments);
	if (UNSHARE_PORT && typeof t === "string"){
		var nom = UNSHARE_PORT.o.uts ? UNSHARE_PORT.hostname : null;
		if (UNSHARE_PORT.sudo) t = t.replace(new RegExp("^" + JOUEUR + "@"), "root@").replace(/\$ $/, "# ");
		if (nom) t = t.replace(/@[^:]+:/, "@" + UNSHARE_PORT.h + ":");
	}
	return t;
};

/* ================================================================== */
/* ip netns                                                             */
/* ================================================================== */

var NETNS_EXEC_PORT = null;
function espacesNetnsPort(h){ var M = etatMachine(h); if (!M.netns || typeof M.netns !== "object") M.netns = {}; return M.netns; }
function netnsPort(h, a, io){
	var s0 = a.shift() || "list", ns = espacesNetnsPort(h);
	if (s0 === "list" || s0 === "ls" || s0 === "show"){ evenementPort(h, "netns", { action: "list", noms: Object.keys(ns) }); return Object.keys(ns).sort().reverse().map(function(n){ return n; }).join("\n"); }
	if (s0 === "add"){
		var n = a[0];
		if (!n) throw new ShellError("Usage: ip netns add NAME", 1);
		if (!io.sudo) throw new ShellError("mkdir /run/netns failed: Permission denied", 1);
		if (ns[n]) throw new ShellError("Cannot create namespace file \"/run/netns/" + n + "\": File exists", 1);
		ns[n] = { lo: false, cree: maintenantPort(h) };
		evenementPort(h, "netns", { action: "add", nom: n });
		return "";
	}
	if (s0 === "delete" || s0 === "del"){
		if (!io.sudo) throw new ShellError("Cannot remove namespace file \"/run/netns/" + a[0] + "\": Permission denied", 1);
		if (!ns[a[0]]) throw new ShellError("Cannot remove namespace file \"/run/netns/" + a[0] + "\": No such file or directory", 1);
		delete ns[a[0]];
		evenementPort(h, "netns", { action: "delete", nom: a[0] });
		return "";
	}
	if (s0 === "identify") return "";
	if (s0 === "exec"){
		var nom = a.shift();
		if (!ns[nom]) throw new ShellError("Cannot open network namespace \"" + nom + "\": No such file or directory", 1);
		if (!io.sudo) throw new ShellError("setting the network namespace \"" + nom + "\" failed: Operation not permitted", 1);
		if (!a.length) throw new ShellError("No command specified", 1);
		evenementPort(h, "netns", { action: "exec", nom: nom, cmd: a.join(" ") });
		NETNS_EXEC_PORT = nom;
		try { return Shell.appeler(a[0], a.slice(1), io); } finally { NETNS_EXEC_PORT = null; }
	}
	throw new ShellError("Command \"" + s0 + "\" is unknown, try \"ip netns help\".", 1);
}

/* ================================================================== */
/* lsns et nsenter                                                      */
/* ================================================================== */

var TYPES_NS_PORT = ["time", "cgroup", "pid", "user", "uts", "ipc", "mnt", "net"];
var NS_INIT_PORT = { time: 4026531834, cgroup: 4026531835, pid: 4026531836, user: 4026531837, uts: 4026531838, ipc: 4026531839, mnt: 4026531840, net: 4026531992 };
/* Les espaces de noms d'un conteneur (un numéro stable par conteneur et par type). */
function nsConteneurPort(c, type){
	if (type === "user" && !(c.hote && (c.hote.userns || c.hote.rootless))) return NS_INIT_PORT.user;
	if (type === "time") return NS_INIT_PORT.time;
	if (type === "net" && c.hote && c.hote.reseau === "host") return NS_INIT_PORT.net;
	return 4026532200 + (parseInt(c.id.substring(0, 6), 16) % 9000) * 8 + TYPES_NS_PORT.indexOf(type);
}
function conteneurDuPidPort(h, pid){
	var p = procsMachine(h).filter(function(x){ return +x.pid === +pid; })[0];
	if (!p) return { proc: null };
	if (!p.conteneur || p.shim || p.proxy) return { proc: p, conteneur: null };
	return { proc: p, conteneur: etatPort(h).conteneurs[p.conteneur] || null };
}
Shell.sorts.lsns = function(args, io){
	var h = exigerHotePortAnnexe("lsns", io);
	var type = null, pidF = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-t" || args[i] === "--type") type = args[++i];
		else if (/^--type=/.test(args[i])) type = args[i].substring(7);
		else if (args[i] === "-p" || args[i] === "--task") pidF = args[++i];
		else if (args[i] === "-l" || args[i] === "--list" || args[i] === "-n" || args[i] === "--noheadings"){}
		else if (args[i].charAt(0) === "-") throw new ShellError("lsns: unrecognized option '" + args[i] + "'\nTry 'lsns --help' for more information.", 1);
	}
	if (type && TYPES_NS_PORT.indexOf(type) === -1) throw new ShellError("lsns: unknown namespace type: " + type, 1);
	var procs = procsVisibles(h, io, "lsns");
	var lignes = [];
	var mien = function(p){ return p.user === JOUEUR; };
	var visibles = io.sudo ? procs : procs.filter(mien);
	var hote = visibles.filter(function(p){ return !p.conteneur || p.shim || p.proxy; });
	if (pidF){ var cd = conteneurDuPidPort(h, pidF); if (!cd.proc) throw new ShellError("lsns: failed to read namespaces: " + pidF, 1); }
	TYPES_NS_PORT.forEach(function(t){
		if (type && t !== type) return;
		if (pidF && conteneurDuPidPort(h, pidF).conteneur && nsConteneurPort(conteneurDuPidPort(h, pidF).conteneur, t) !== NS_INIT_PORT[t]) return;
		var dans = hote.concat(visibles.filter(function(p){ var c = p.conteneur && !p.shim && !p.proxy ? etatPort(h).conteneurs[p.conteneur] : null; return c && nsConteneurPort(c, t) === NS_INIT_PORT[t]; }));
		if (!dans.length) return;
		var premier = dans.slice().sort(function(a, b){ return a.pid - b.pid; })[0];
		lignes.push([NS_INIT_PORT[t], t, dans.length, premier.pid, premier.user, premier.cmd]);
	});
	conteneursPort(aDesConteneursPort(h) ? h : null).filter(enMarchePort).forEach(function(c){
		var ps = visibles.filter(function(p){ return p.conteneur === c.id && !p.shim && !p.proxy; });
		if (!ps.length) return;
		if (pidF && !ps.some(function(p){ return +p.pid === +pidF; })) return;
		TYPES_NS_PORT.forEach(function(t){
			if (type && t !== type) return;
			var n = nsConteneurPort(c, t);
			if (n === NS_INIT_PORT[t]) return;
			lignes.push([n, t, ps.length, ps[0].pid, ps[0].user, ps[0].cmd]);
		});
	});
	if (pidF) lignes = lignes.filter(function(l){ return true; });
	evenementPort(h, "lsns", { type: type, pid: pidF, sudo: !!io.sudo, n: lignes.length });
	var sansEntete = args.indexOf("-n") > -1 || args.indexOf("--noheadings") > -1;
	var t = lignes.map(function(l){ return completerGauche(String(l[0]), 10) + " " + completerDroite(l[1], 6) + " " + completerGauche(String(l[2]), 6) + " " + completerGauche(String(l[3]), 6) + " " + completerDroite(l[4], 9) + " " + l[5]; });
	return (sansEntete ? [] : ["        NS TYPE   NPROCS    PID USER      COMMAND"]).concat(t).join("\n");
};
function conteneursPortSur(h){ return h && aDesConteneursPort(h) ? conteneursPort(h) : []; }
Shell.sorts.nsenter = function(args, io){
	var h = exigerHotePortAnnexe("nsenter", io);
	var o = { t: null, types: [], cmd: [] };
	var LONGS = { "--mount": "mnt", "--uts": "uts", "--ipc": "ipc", "--net": "net", "--pid": "pid", "--user": "user", "--cgroup": "cgroup", "--all": "all" };
	var COURTS = { m: "mnt", u: "uts", i: "ipc", n: "net", p: "pid", U: "user", C: "cgroup", a: "all" };
	for (var i = 0; i < args.length; i++){
		var x = args[i];
		if (x === "-t" || x === "--target"){ o.t = args[++i]; continue; }
		if (/^--target=/.test(x)){ o.t = x.substring(9); continue; }
		if (/^-t\d+$/.test(x)){ o.t = x.substring(2); continue; }
		if (LONGS[x]){ o.types.push(LONGS[x]); continue; }
		if (/^-[a-zA-Z]+$/.test(x)){
			for (var k = 1; k < x.length; k++){
				var l = x.charAt(k);
				if (l === "t"){ o.t = x.substring(k + 1) || args[++i]; break; }
				if (!COURTS[l]) throw new ShellError("nsenter: invalid option -- '" + l + "'\nTry 'nsenter --help' for more information.", 1);
				o.types.push(COURTS[l]);
			}
			continue;
		}
		o.cmd = args.slice(i); break;
	}
	if (o.types.indexOf("all") > -1) o.types = ["mnt", "uts", "ipc", "net", "pid", "cgroup"];
	if (!o.t) throw new ShellError("nsenter: neither filename nor target pid supplied for ns/" + (o.types[0] || "mnt"), 1);
	if (!o.types.length) throw new ShellError("nsenter: no namespace specified", 1);
	var cd = conteneurDuPidPort(h, o.t);
	evenementPort(h, "nsenter", { pid: o.t, types: o.types.slice(), cmd: o.cmd.join(" "), conteneur: cd.conteneur ? cd.conteneur.nom : null, sudo: !!io.sudo });
	if (!cd.proc) throw new ShellError("nsenter: cannot open /proc/" + o.t + "/ns/" + o.types[0] + ": No such file or directory", 1);
	if (!io.sudo) throw new ShellError("nsenter: cannot open /proc/" + o.t + "/ns/" + (o.types.indexOf("ipc") > -1 ? "ipc" : o.types[0]) + ": Permission denied", 1);
	var c = cd.conteneur;
	var cmd = o.cmd.length ? o.cmd : ["/bin/bash"];
	if (!c) return Shell.appeler(cmd[0].split("/").pop(), cmd.slice(1), io);
	if (o.types.indexOf("mnt") > -1){
		// Dans les fichiers du conteneur : ses programmes, ses fichiers.
		if (!o.cmd.length || /^(\/bin\/)?(ba)?sh$/.test(o.cmd[0])){
			if (!o.cmd.length && !lireFichierConteneurPort(h, c, "/bin/bash")) throw new ShellError("nsenter: failed to execute /bin/bash: No such file or directory", 127);
			ouvrirSessionPort(h, c, { user: { nom: "root", uid: 0, gid: 0 }, cmd: o.cmd[0] || "/bin/bash" });
			return "";
		}
		var r = executerArgvPort(h, c, o.cmd, { user: { nom: "root", uid: 0, gid: 0 } });
		if (r.erreurOci) throw new ShellError("nsenter: failed to execute " + o.cmd[0] + ": No such file or directory", 127);
		if (r.erreurs) io.err(r.erreurs.replace(/\n$/, ""));
		io.code = r.code;
		return r.sortie.replace(/\n$/, "");
	}
	// Sans le montage : les programmes de l'hôte, vus depuis les espaces choisis.
	var nom = cmd[0].split("/").pop();
	if (o.types.indexOf("net") > -1){
		if (nom === "ip" && /^(a|ad|addr|address|l|link|r|route)$/.test(cmd[1] || "")){
			if (/^r/.test(cmd[1])){ var gw = Object.keys(c.reseaux || {}).map(function(k){ return c.reseaux[k]; })[0]; return gw ? "default via " + gw.passerelle + " dev eth0\n" + gw.passerelle.replace(/\.\d+$/, ".0") + "/16 dev eth0 proto kernel scope link src " + gw.ip : ""; }
			return texteIpConteneurPort(h, c).replace(/\n$/, "");
		}
		if (nom === "ss" || nom === "netstat") return "State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess\n" + (c.ecoutes || []).map(function(p){ return "LISTEN 0      511          0.0.0.0:" + completerDroite(String(p), 5) + "      0.0.0.0:*"; }).join("\n");
	}
	if (o.types.indexOf("uts") > -1 && nom === "hostname") return c.config.Hostname;
	if (o.types.indexOf("pid") > -1 && nom === "ps") return C.gris("(Dans l'espace pid du conteneur, mais avec le /proc de l'hôte : ps lit /proc et voit encore tout. Ajoute -m, le montage du conteneur.)") + "\n" + Shell.appeler("ps", cmd.slice(1), io);
	return Shell.appeler(nom, cmd.slice(1), io);
};

/* ================================================================== */
/* skopeo                                                               */
/* ================================================================== */

function lireTransportPort(x){
	var m = /^(docker|docker-daemon|containers-storage|oci|docker-archive|dir):(.*)$/.exec(x || "");
	if (!m) return { erreur: "Invalid image name \"" + x + "\", expected colon-separated transport:reference" };
	if (m[1] === "docker"){ if (m[2].substring(0, 2) !== "//") return { erreur: "Invalid image name \"" + x + "\", unknown transport \"docker\"" }; return { transport: "docker", ref: m[2].substring(2) }; }
	return { transport: m[1], ref: m[2] };
}
/* Lire une image dans un registre (continent ou entrepôt) : { image, digest, tags, depot } ou { erreur }. */
function lireImageDistantePort(h, ref, tlsVerify, creds, io){
	var a = analyserRefPort(ref);
	if (a.registre === REGISTRE_CONTINENT_PORT){
		if (h === "douane") return { erreur: "pinging container registry " + REGISTRE_CONTINENT_PORT + ": Get \"https://" + REGISTRE_CONTINENT_PORT + "/v2/\": dial tcp 198.51.100.20:443: connect: network is unreachable" };
		var r = resoudreContinentPort(a.depot, a.tag, a.digest);
		if (r.erreur) return { erreur: "reading manifest " + (a.tag || a.digest) + " in " + a.registre + "/" + a.depot + ": manifest unknown" };
		var cat = cataloguePort(), nom = a.depot.replace(/^library\//, ""), tags = [];
		Object.keys(cat).forEach(function(k){ if (cat[k].nom === nom) tags = tags.concat(cat[k].tags); });
		return { image: r.image, digest: r.image.digestDepot, tags: tags.sort(), a: a, hClient: null };
	}
	var j = joindreRegistreTlsPort(h, a.registre, creds || identifiantsPort(h, a.registre, io), !tlsVerify);
	if (j.erreur) return { erreur: j.erreur };
	if (!j.auth.ok) return { erreur: "reading manifest " + (a.tag || a.digest) + " in " + a.registre + "/" + a.depot + ": authentication required" };
	var x = imageDepuisRegistrePort(j.hr, j.cr, a.depot, a.digest || a.tag);
	if (!x) return { erreur: "reading manifest " + (a.tag || a.digest) + " in " + a.registre + "/" + a.depot + ": manifest unknown" };
	if (x.liste){
		var ch = (x.liste.manifests || []).filter(function(m){ return m.platform && m.platform.architecture === "amd64"; })[0];
		var y = ch ? imageDepuisRegistrePort(j.hr, j.cr, a.depot, ch.digest) : null;
		if (!y) return { erreur: "choosing image instance: no image found in image index for architecture amd64, variant \"\", OS linux" };
		return { image: y.image, digest: x.digest, tags: tagsRegistrePort(j.hr, j.cr, a.depot).sort(), a: a, liste: x.liste, hr: j.hr, cr: j.cr };
	}
	return { image: x.image, digest: x.digest, tags: tagsRegistrePort(j.hr, j.cr, a.depot).sort(), a: a, hr: j.hr, cr: j.cr };
}
function optionsSkopeoPort(args){
	var o = { tls: true, srcTls: true, destTls: true, creds: null, srcCreds: null, destCreds: null, raw: false, config: false, format: null, reste: [] };
	for (var i = 0; i < args.length; i++){
		var x = args[i], v = null, m = /^(--[\w-]+)=(.*)$/.exec(x);
		if (m){ x = m[1]; v = m[2]; }
		var val = function(){ return v !== null ? v : args[++i]; };
		if (x === "--tls-verify") o.tls = v === null ? true : v !== "false";
		else if (x === "--src-tls-verify") o.srcTls = v === null ? true : v !== "false";
		else if (x === "--dest-tls-verify") o.destTls = v === null ? true : v !== "false";
		else if (x === "--creds") o.creds = val();
		else if (x === "--src-creds") o.srcCreds = val();
		else if (x === "--dest-creds") o.destCreds = val();
		else if (x === "--raw") o.raw = true;
		else if (x === "--config") o.config = true;
		else if (x === "--format" || x === "-f") o.format = val();
		else if (x === "--all" || x === "-a" || x === "--quiet" || x === "-q" || x === "--insecure-policy") o[x.replace(/^-+/, "")] = true;
		else if (x.charAt(0) === "-") throw new ShellError("Error: unknown flag: " + x + "\nSee 'skopeo --help'.", 125);
		else o.reste.push(args[i]);
	}
	return o;
}
Shell.sorts.skopeo = function(args, io){
	var h = exigerHotePortAnnexe("skopeo", io);
	exigerBinairePort(h, "skopeo", "/usr/bin/skopeo", io);
	var a = args.slice(), s0 = a.shift();
	if (!s0 || s0 === "--help" || s0 === "-h") return "Various operations with container images and container image registries\n\nUsage:\n  skopeo [flags]\n  skopeo [command]\n\nAvailable Commands:\n  copy          Copy an IMAGE-NAME from one location to another\n  delete        Delete image IMAGE-NAME\n  inspect       Inspect image IMAGE-NAME\n  list-tags     List tags in the transport/repository specified by the SOURCE-IMAGE\n  login         Login to a container registry\n  logout        Logout of a container registry";
	if (s0 === "--version" || s0 === "-v") return "skopeo version 1.18.0";
	var o = optionsSkopeoPort(a);
	if (s0 === "inspect"){
		var t = lireTransportPort(o.reste[0]);
		if (t.erreur) throw new ShellError("Error: " + t.erreur, 1);
		if (t.transport !== "docker") throw new ShellError("(Le jeu inspecte les images des registres : skopeo inspect docker://REGISTRE/IMAGE:TAG.)", 1);
		var r = lireImageDistantePort(h, t.ref, o.tls, o.creds, io);
		evenementPort(h, "skopeo", { action: "inspect", ref: t.ref, ok: !r.erreur, raw: o.raw, config: o.config, digest: r.digest || null });
		if (r.erreur) throw new ShellError("Error: " + (r.erreur.indexOf("pinging") === 0 ? r.erreur : "reading manifest: " + r.erreur.replace(/^reading manifest /, "")), 1);
		if (r.liste && o.raw) return JSON.stringify(r.liste);
		if (o.raw) return manifestePort(h, r.image);
		if (o.config) return configJsonPort(r.image);
		var img = r.image;
		var obj = { Name: r.a.registre + "/" + r.a.depot, Digest: r.digest, RepoTags: r.tags, Created: img.cree, DockerVersion: "", Labels: (img.config && img.config.Labels) || null, Architecture: img.arch || "amd64", Os: "linux",
			Layers: (img.couches || []).map(function(id){ return "sha256:" + blobPort(id); }),
			LayersData: (img.couches || []).map(function(id){ var c = couchePort(h, id) || couchePort("docks", id); return { MIMEType: "application/vnd.oci.image.layer.v1.tar+gzip", Digest: "sha256:" + blobPort(id), Size: Math.round(((c && c.taille) || 0) * 0.38) + 412, Annotations: null }; }),
			Env: (img.config && img.config.Env) || [] };
		if (o.format) return gabaritPort(o.format, obj);
		return json4Port(obj);
	}
	if (s0 === "list-tags"){
		var t2 = lireTransportPort(o.reste[0]);
		if (t2.erreur) throw new ShellError("Error: " + t2.erreur, 1);
		var a2 = analyserRefPort(t2.ref), r2 = { tags: [], a: a2 };
		if (a2.registre === REGISTRE_CONTINENT_PORT){
			var cat2 = cataloguePort(); Object.keys(cat2).forEach(function(k){ if (cat2[k].nom === a2.depot.replace(/^library\//, "")) r2.tags = r2.tags.concat(cat2[k].tags); });
			if (!r2.tags.length) r2.erreur = "fetching tags list: repository name not known to registry";
		} else {
			var j2 = joindreRegistreTlsPort(h, a2.registre, o.creds || identifiantsPort(h, a2.registre, io), !o.tls);
			if (j2.erreur) r2.erreur = j2.erreur;
			else if (!j2.auth.ok) r2.erreur = "fetching tags list: authentication required";
			else { r2.tags = tagsRegistrePort(j2.hr, j2.cr, a2.depot); if (!r2.tags.length) r2.erreur = "fetching tags list: repository name not known to registry"; }
		}
		if (r2.erreur) throw new ShellError("Error: " + r2.erreur, 1);
		evenementPort(h, "skopeo", { action: "list-tags", ref: t2.ref, tags: r2.tags });
		return json4Port({ Repository: r2.a.registre + "/" + r2.a.depot, Tags: r2.tags.sort() });
	}
	if (s0 === "copy"){
		if (o.reste.length !== 2) throw new ShellError("Error: Exactly two arguments expected\nSee 'skopeo copy --help'.", 1);
		var src = lireTransportPort(o.reste[0]), dst = lireTransportPort(o.reste[1]);
		if (src.erreur) throw new ShellError("Error: " + src.erreur, 1);
		if (dst.erreur) throw new ShellError("Error: " + dst.erreur, 1);
		var img2, digestSrc;
		if (src.transport === "docker"){
			var rs = lireImageDistantePort(h, src.ref, o.srcTls && o.tls, o.srcCreds || o.creds, io);
			if (rs.erreur) throw new ShellError("Error: initializing source docker://" + src.ref + ": " + rs.erreur, 1);
			img2 = rs.image; digestSrc = rs.digest;
			if (rs.hr) img2.couches.forEach(function(id){ var c = couchePort(rs.hr, id); if (c && !COUCHES_PORT[id]) etatPort(h).couches[id] = c; });
		} else if (src.transport === "docker-daemon"){
			if (!estHoteDockerPort(h)) throw new ShellError("Error: initializing source docker-daemon:" + src.ref + ": loading image from docker engine: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?", 1);
			img2 = imagePort(h, src.ref);
			if (!img2) throw new ShellError("Error: initializing source docker-daemon:" + src.ref + ": loading image from docker engine: Error response from daemon: reference does not exist", 1);
		} else throw new ShellError("(Le jeu copie entre registres : docker://... vers docker://..., ou depuis docker-daemon:IMAGE:TAG.)", 1);
		var lignes = ["Getting image source signatures"];
		if (dst.transport === "docker"){
			var ad = analyserRefPort(dst.ref);
			if (ad.registre === REGISTRE_CONTINENT_PORT) throw new ShellError("Error: trying to reuse blob sha256:" + blobPort(img2.couches[0]) + " at destination: checking whether a blob sha256:" + blobPort(img2.couches[0]) + " exists in " + REGISTRE_CONTINENT_PORT + "/" + ad.depot + ": requested access to the resource is denied", 1);
			var jd = joindreRegistreTlsPort(h, ad.registre, o.destCreds || o.creds || identifiantsPort(h, ad.registre, io), !(o.destTls && o.tls));
			if (jd.erreur) throw new ShellError("Error: initializing destination docker://" + dst.ref + ": " + jd.erreur, 1);
			if (!jd.auth.ok) throw new ShellError("Error: trying to reuse blob sha256:" + blobPort(img2.couches[0]) + " at destination: checking whether a blob sha256:" + blobPort(img2.couches[0]) + " exists in " + ad.registre + "/" + ad.depot + ": authentication required", 1);
			img2.couches.forEach(function(id){ var b = "sha256:" + blobPort(id); var deja = !!entreeConteneurPort(jd.hr, jd.cr, cheminBlobRegistrePort(jd.cr, b)); lignes.push("Copying blob " + b.substring(7, 19) + " " + (deja ? "skipped: already exists" : "done") + "   | "); });
			lignes.push("Copying config " + sha256(configJsonPort(img2)).substring(0, 10) + " done   | ", "Writing manifest to image destination");
			var pr = pousserDansRegistrePort(h, img2, jd.hr, jd.cr, ad.depot, ad.tag);
			evenementPort(h, "skopeo", { action: "copy", source: o.reste[0], destination: o.reste[1], digest: pr.digest, digestSource: digestSrc || null });
		} else if (dst.transport === "docker-daemon"){
			if (!estHoteDockerPort(h)) throw new ShellError("Error: initializing destination docker-daemon:" + dst.ref + ": Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?", 1);
			img2.couches.forEach(function(id){ lignes.push("Copying blob " + blobPort(id).substring(0, 12) + " done   | "); });
			lignes.push("Copying config " + sha256(configJsonPort(img2)).substring(0, 10) + " done   | ", "Writing manifest to image destination");
			poserImagePort(h, img2, nomCourtPort(dst.ref), null);
			evenementPort(h, "skopeo", { action: "copy", source: o.reste[0], destination: o.reste[1] });
		} else throw new ShellError("(Le jeu copie vers docker://... ou docker-daemon:IMAGE:TAG.)", 1);
		io.err(lignes.join("\n") + "\n");
		return "";
	}
	if (s0 === "login" || s0 === "logout") return Shell.sorts.docker([s0].concat(a), io);
	if (s0 === "delete") throw new ShellError("Error: deleting image: Image deletion is not supported by this registry (le registre de l'entrepôt refuse les effacements : storage.delete.enabled est faux).", 1);
	throw new ShellError("Error: unknown command \"" + s0 + "\" for \"skopeo\"\nRun 'skopeo --help' for usage.", 1);
};

/* ================================================================== */
/* docker buildx et docker manifest                                     */
/* ================================================================== */

function etatBuildxPort(h){ var P = etatPort(h); if (!P.buildx || typeof P.buildx !== "object") P.buildx = { courant: "default", builders: {} }; return P.buildx; }
function buildersPort(h){ return etatBuildxPort(h || "docks"); }
var PLATEFORMES_DEFAUT_PORT = "linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/386";
function buildxPort(h, a, io){
	accesDemonPort(h, io, "buildx");
	var B = etatBuildxPort(h);
	var s0 = a.shift();
	if (s0 === "version") return "buildx 0.13.1 0.13.1+ds1-3";
	if (s0 === "ls"){
		evenementPort(h, "buildx", { action: "ls", courant: B.courant });
		var l = ["NAME/NODE" + "           DRIVER/ENDPOINT                   STATUS     BUILDKIT   PLATFORMS"];
		l.push(completerDroite("default" + (B.courant === "default" ? "*" : ""), 20) + completerDroite("docker", 34));
		l.push(completerDroite(" \\_ default", 20) + completerDroite(" \\_ default", 34) + completerDroite("running", 11) + completerDroite("v0.13.2", 11) + PLATEFORMES_DEFAUT_PORT);
		Object.keys(B.builders).forEach(function(n){
			var b = B.builders[n];
			l.push(completerDroite(n + (B.courant === n ? "*" : ""), 20) + completerDroite(b.driver, 34));
			l.push(completerDroite(" \\_ " + n + "0", 20) + completerDroite(" \\_ unix:///var/run/docker.sock", 34) + completerDroite(b.actif ? "running" : "inactive", 11) + completerDroite(b.actif ? "v0.20.2" : "", 11) + (b.actif ? "linux/amd64*, linux/arm64*, linux/amd64/v2, linux/amd64/v3, linux/386" : ""));
		});
		return l.join("\n");
	}
	if (s0 === "create"){
		var d = lireDrapeauxPort(a, { valeurs: ["name", "driver", "platform", "driver-opt"], booleens: ["use", "bootstrap"], repetables: ["driver-opt", "platform"] }, "buildx create");
		var drv = d.o.driver || "docker-container";
		if (["docker-container", "docker", "kubernetes", "remote"].indexOf(drv) === -1) throw new ShellError("ERROR: failed to find driver \"" + drv + "\"", 1);
		if (drv === "docker") throw new ShellError("ERROR: failed to create builder: docker driver only supports one instance per context", 1);
		var nom = d.o.name || ADJECTIFS_PORT[Object.keys(B.builders).length % ADJECTIFS_PORT.length] + "_" + NOMS_MARINS_PORT[(Object.keys(B.builders).length * 3) % NOMS_MARINS_PORT.length];
		if (B.builders[nom]) throw new ShellError("ERROR: existing instance for \"" + nom + "\" but no append mode, specify the node name to make changes for existing instances", 1);
		B.builders[nom] = { driver: drv, actif: !!d.o.bootstrap, cree: maintenantPort(h) };
		if (d.o.use) B.courant = nom;
		evenementPort(h, "buildx", { action: "create", nom: nom, driver: drv, use: !!d.o.use });
		return (d.o.bootstrap ? "[+] Building 4.2s (1/1) FINISHED\n => [internal] booting buildkit                                            4.2s\n => => pulling image buildkit:buildx-stable-1                              3.6s\n => => creating container buildx_buildkit_" + nom + "0                         0.6s\n" : "") + nom;
	}
	if (s0 === "use"){
		var n2 = a.filter(function(x){ return x.charAt(0) !== "-"; })[0];
		if (n2 !== "default" && !B.builders[n2]) throw new ShellError("ERROR: run `docker buildx create --name " + n2 + "` to create a builder", 1);
		B.courant = n2;
		evenementPort(h, "buildx", { action: "use", nom: n2 });
		return "";
	}
	if (s0 === "rm"){
		var n3 = a.filter(function(x){ return x.charAt(0) !== "-"; })[0] || B.courant;
		if (n3 === "default") throw new ShellError("ERROR: default is a docker driver builder and cannot be removed", 1);
		if (!B.builders[n3]) throw new ShellError("ERROR: no builder \"" + n3 + "\" found", 1);
		delete B.builders[n3]; if (B.courant === n3) B.courant = "default";
		return n3 + " removed";
	}
	if (s0 === "inspect"){
		var bo = a.indexOf("--bootstrap") > -1;
		var n4 = a.filter(function(x){ return x.charAt(0) !== "-"; })[0] || B.courant;
		if (n4 !== "default" && !B.builders[n4]) throw new ShellError("ERROR: no builder \"" + n4 + "\" found", 1);
		var b4 = n4 === "default" ? { driver: "docker", actif: true } : B.builders[n4];
		var debut = "";
		if (bo && !b4.actif){ b4.actif = true; debut = "[+] Building 4.2s (1/1) FINISHED\n => [internal] booting buildkit                                            4.2s\n"; }
		return debut + "Name:          " + n4 + "\nDriver:        " + b4.driver + "\nLast Activity: " + dateIsoPort(maintenantPort(h)) + "\n\nNodes:\nName:                  " + (n4 === "default" ? "default" : n4 + "0") + "\nEndpoint:              " + (n4 === "default" ? "default" : "unix:///var/run/docker.sock") + "\nStatus:                " + (b4.actif ? "running" : "inactive") + (b4.actif ? "\nBuildKit version:      " + (n4 === "default" ? "v0.13.2" : "v0.20.2") + "\nPlatforms:             " + (n4 === "default" ? PLATEFORMES_DEFAUT_PORT : "linux/amd64, linux/arm64, linux/amd64/v2, linux/amd64/v3, linux/386") : "");
	}
	if (s0 === "build") return buildxBuildPort(h, a, io);
	if (s0 === "prune" || s0 === "du") return builderPort(h, [s0].concat(a), io);
	return "\nUsage:  docker buildx [OPTIONS] COMMAND\n\nExtended build capabilities with BuildKit\n\nManagement Commands:\n  imagetools  Commands to work on images in registry\n\nCommands:\n  build       Start a build\n  create      Create a new builder instance\n  inspect     Inspect current builder instance\n  ls          List builder instances\n  rm          Remove one or more builder instances\n  use         Set the current builder instance\n  version     Show buildx version information";
}
/* Une image construite pour une autre plateforme : mêmes instructions, d'autres couches. */
function variantePlateformePort(h, img, arch){
	var v = copieJson(img);
	v.arch = arch;
	v.couches = img.couches.map(function(id){
		var c = couchePort(h, id);
		var nid = sha256(arch + ":" + id);
		if (!couchePort(h, nid) && c){ var nc = copieJson(c); nc.id = nid; nc.arch = arch; etatPort(h).couches[nid] = nc; }
		return nid;
	});
	v.id = sha256(configJsonPort(v));
	return v;
}
function buildxBuildPort(h, a, io){
	var B = etatBuildxPort(h);
	var args = a.slice(), plateformes = [], pousser = false, charger = false, builder = B.courant, tags = [], reste = [];
	for (var i = 0; i < args.length; i++){
		var x = args[i];
		if (x === "--platform"){ plateformes = plateformes.concat(String(args[++i]).split(",")); continue; }
		if (/^--platform=/.test(x)){ plateformes = plateformes.concat(x.substring(11).split(",")); continue; }
		if (x === "--push"){ pousser = true; continue; }
		if (x === "--load"){ charger = true; continue; }
		if (x === "--builder"){ builder = args[++i]; continue; }
		if (/^--output=type=registry/.test(x)){ pousser = true; continue; }
		if (x === "-t" || x === "--tag"){ tags.push(args[i + 1]); }
		reste.push(x);
	}
	plateformes = plateformes.map(function(p){ return p.trim(); }).filter(Boolean);
	var b = builder === "default" ? { driver: "docker" } : B.builders[builder];
	if (!b) throw new ShellError("ERROR: no builder \"" + builder + "\" found", 1);
	evenementPort(h, "buildx", { action: "build", builder: builder, driver: b.driver, plateformes: plateformes.slice(), push: pousser, load: charger, tags: tags.slice() });
	plateformes.forEach(function(p){ if (["linux/amd64", "linux/arm64", "linux/arm/v7", "linux/386"].indexOf(p) === -1) throw new ShellError("ERROR: failed to solve: " + p + ": unknown operating system or architecture: invalid argument", 1); });
	if (b.driver === "docker" && plateformes.length > 1) throw new ShellError("ERROR: Multi-platform build is not supported for the docker driver.\nSwitch to a different driver, or turn on the containerd image store, and try again.", 1);
	if (b.driver === "docker" && plateformes.length === 1 && plateformes[0] !== "linux/amd64") throw new ShellError("ERROR: failed to solve: failed to load cache key: no match for platform in manifest: not found", 1);
	if (charger && plateformes.length > 1) throw new ShellError("ERROR: docker exporter does not currently support exporting manifest lists", 1);
	b.actif = true;
	var avant = {};
	tags.forEach(function(t){ var im = imagePort(h, t); avant[t] = im ? im.id : null; });
	var sortie = buildPort(h, reste, io);
	var img = tags.length ? imagePort(h, tags[0]) : null;
	var lignes = [String(sortie || "")];
	if (b.driver !== "docker" && !pousser && !charger){
		lignes.push("WARNING: No output specified with docker-container driver. Build result will only remain in the build cache. To push result image into registry use --push or to load image into docker use --load");
		tags.forEach(function(t){ enleverTagPort(h, t); });
	}
	if (pousser && img){
		tags.forEach(function(t){
			var ar = analyserRefPort(t);
			if (ar.registre === REGISTRE_CONTINENT_PORT) throw new ShellError("ERROR: failed to solve: failed to push " + nomCourtPort(t) + ": push access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed", 1);
			var j = joindreRegistrePort(h, ar.registre, identifiantsPort(h, ar.registre, io));
			if (j.erreur) throw new ShellError("ERROR: failed to solve: failed to push " + nomCourtPort(t) + ": failed to do request: " + j.erreur, 1);
			if (!j.auth.ok) throw new ShellError("ERROR: failed to solve: failed to push " + nomCourtPort(t) + ": failed to authorize: failed to fetch anonymous token: unexpected status from GET request: 401 Unauthorized", 1);
			var plats = plateformes.length ? plateformes : ["linux/amd64"];
			var manifs = plats.map(function(p){
				var arch = p.split("/")[1];
				var v = arch === "amd64" ? img : variantePlateformePort(h, img, arch);
				var r = pousserDansRegistrePort(h, v, j.hr, j.cr, ar.depot, plats.length > 1 ? null : ar.tag);
				return { mediaType: "application/vnd.oci.image.manifest.v1+json", digest: r.digest, size: r.taille, platform: { architecture: arch, os: "linux" } };
			});
			var digest = manifs[0].digest;
			if (plats.length > 1){
				var index = JSON.stringify({ schemaVersion: 2, mediaType: "application/vnd.oci.image.index.v1+json", manifests: manifs });
				digest = "sha256:" + sha256(index);
				ecrireRegistrePort(j.hr, j.cr, cheminBlobRegistrePort(j.cr, digest), index);
				ecrireRegistrePort(j.hr, j.cr, cheminDepotRegistrePort(j.cr, ar.depot) + "/_manifests/revisions/sha256/" + digest.substring(7) + "/link", digest + "\n");
				ecrireRegistrePort(j.hr, j.cr, cheminDepotRegistrePort(j.cr, ar.depot) + "/_manifests/tags/" + ar.tag + "/current/link", digest + "\n");
				ecrireRegistrePort(j.hr, j.cr, cheminDepotRegistrePort(j.cr, ar.depot) + "/_manifests/tags/" + ar.tag + "/index/sha256/" + digest.substring(7) + "/link", digest + "\n");
			}
			lignes.push(" => exporting to image", " => => exporting layers                                                     0.3s", " => => exporting manifest list " + digest + "   0.0s", " => => pushing layers                                                       1.1s", " => => pushing manifest for " + ar.complet + "@" + digest + "  0.2s");
			evenementPort(h, "buildxPush", { ref: t, digest: digest, plateformes: plats.slice() });
		});
		if (b.driver !== "docker" && !charger) tags.forEach(function(t){ enleverTagPort(h, t); });
	}
	return lignes.join("\n");
}
function manifestPort(h, a, io){
	var s0 = a.shift();
	if (s0 !== "inspect") throw new ShellError("(docker manifest : le jeu sait inspect. Une liste de plateformes se fabrique avec docker buildx build --platform ... --push.)", 1);
	var d = lireDrapeauxPort(a, { court: { v: "verbose" }, booleens: ["insecure", "verbose"] }, "manifest inspect");
	var ref = d.reste[d.reste.length - 1];
	if (!ref) throw new ShellError("\"docker manifest inspect\" requires at least 1 argument.\nSee 'docker manifest inspect --help'.\n\nUsage:  docker manifest inspect [OPTIONS] [MANIFEST_LIST] MANIFEST\n\nDisplay an image manifest, or manifest list", 1);
	var r = lireImageDistantePort(h, ref, !d.o.insecure, null, io);
	evenementPort(h, "manifest", { ref: ref, ok: !r.erreur, plateformes: r.liste ? r.liste.manifests.map(function(m){ return m.platform.os + "/" + m.platform.architecture; }) : (r.image ? ["linux/" + (r.image.arch || "amd64")] : []) });
	if (r.erreur) throw new ShellError(/authentication required/.test(r.erreur) ? "errors:\nunauthorized: authentication required" : (/manifest unknown/.test(r.erreur) ? "no such manifest: " + nomCourtPort(ref) : "failed to configure transport: " + r.erreur.replace(/^pinging container registry [^:]+: /, "")), 1);
	if (r.liste) return json3Port(r.liste);
	var m = JSON.parse(manifestePort(h, r.image));
	if (d.o.verbose) return json3Port({ Ref: analyserRefPort(ref).complet, Descriptor: { mediaType: m.mediaType, digest: r.digest, size: octetsPort(JSON.stringify(m)), platform: { architecture: r.image.arch || "amd64", os: "linux" } }, OCIManifest: m });
	return json3Port(m);
}

/* ================================================================== */
/* hadolint                                                             */
/* ================================================================== */

var REGLES_HADOLINT_PORT = {
	DL3000: ["error", "Use absolute WORKDIR"],
	DL3002: ["warning", "Last USER should not be root"],
	DL3003: ["warning", "Use WORKDIR to switch to a directory"],
	DL3004: ["error", "Do not use sudo as it leads to unpredictable behavior. Use a tool like gosu to enforce root"],
	DL3006: ["warning", "Always tag the version of an image explicitly"],
	DL3007: ["warning", "Using latest is prone to errors if the image will ever update. Pin the version explicitly to a release tag"],
	DL3008: ["warning", "Pin versions in apt get install. Instead of `apt-get install <package>` use `apt-get install <package>=<version>`"],
	DL3009: ["info", "Delete the apt-get lists after installing something"],
	DL3013: ["warning", "Pin versions in pip. Instead of `pip install <package>` use `pip install <package>==<version>` or `pip install --requirement <requirements file>`"],
	DL3015: ["info", "Avoid additional packages by specifying `--no-install-recommends`"],
	DL3018: ["warning", "Pin versions in apk add. Instead of `apk add <package>` use `apk add <package>=<version>`"],
	DL3019: ["info", "Use the `--no-cache` switch to avoid the need to use `--update` and remove `/var/cache/apk/*` when done installing packages"],
	DL3020: ["error", "Use COPY instead of ADD for files and folders"],
	DL3025: ["warning", "Use arguments JSON notation for CMD and ENTRYPOINT arguments"],
	DL3042: ["warning", "Avoid use of cache directory with pip. Use `pip install --no-cache-dir <package>`"],
	DL3045: ["warning", "`COPY` to a relative destination without `WORKDIR` set."],
	DL3059: ["info", "Multiple consecutive `RUN` instructions. Consider consolidation."],
	DL4000: ["error", "MAINTAINER is deprecated"],
	DL4006: ["warning", "Set the SHELL option -o pipefail before RUN with a pipe in it. If you are using /bin/sh in an alpine image or if your shell is symlinked to busybox then consider explicitly setting your SHELL to /bin/ash, or disable this check"]
};
/* Les instructions d'un Dockerfile, lignes continuées recollées, avec leur numéro de première ligne et les « hadolint ignore ». */
function instructionsHadolintPort(texte){
	var lignes = String(texte).split("\n"), l = [], cur = null, ignore = [];
	lignes.forEach(function(x, i){
		var t = x.replace(/\r$/, "");
		if (!cur){
			var mi = /^\s*#\s*hadolint\s+ignore=([\w,]+)/.exec(t);
			if (mi){ ignore = ignore.concat(mi[1].split(",")); return; }
			if (/^\s*(#|$)/.test(t)) return;
			cur = { ligne: i + 1, texte: "", ignore: ignore }; ignore = [];
		} else if (/^\s*#/.test(t)) return;
		var suite = /\\\s*$/.test(t);
		cur.texte += (cur.texte ? " " : "") + t.replace(/\\\s*$/, "").trim();
		if (!suite){ var m = /^(\w+)\s*(.*)$/.exec(cur.texte); if (m){ cur.instr = m[1].toUpperCase(); cur.args = m[2]; l.push(cur); } cur = null; }
	});
	if (cur){ var m2 = /^(\w+)\s*(.*)$/.exec(cur.texte); if (m2){ cur.instr = m2[1].toUpperCase(); cur.args = m2[2]; l.push(cur); } }
	return l;
}
function paquetsInstallPort(cmd, outil){
	var re = outil === "apt" ? /(?:apt-get|apt)\s+(?:-\S+\s+)*install\s+([^;&|]*)/g : (outil === "apk" ? /apk\s+(?:-\S+\s+)*add\s+([^;&|]*)/g : /pip3?\s+(?:-\S+\s+)*install\s+([^;&|]*)/g);
	var l = [], m;
	while ((m = re.exec(cmd))){ l.push(m[1].trim().split(/\s+/)); }
	return l;
}
function resultatHadolintPort(texte, ignorees){
	ignorees = ignorees || [];
	var ins = instructionsHadolintPort(texte), r = [];
	var stages = [], workdir = false, dernierUser = null, precedent = null;
	var ajouter = function(i, code){ if (ignorees.indexOf(code) > -1 || i.ignore.indexOf(code) > -1) return; r.push({ ligne: i.ligne, code: code, niveau: REGLES_HADOLINT_PORT[code][0], message: REGLES_HADOLINT_PORT[code][1] }); };
	ins.forEach(function(i){
		var a = i.args;
		if (i.instr === "FROM"){
			var m = /^(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i.exec(a) || [];
			var image = m[1] || "";
			if (image !== "scratch" && stages.indexOf(image) === -1 && !/\$/.test(image)){
				if (!/[:@]/.test(image.split("/").pop())) ajouter(i, "DL3006");
				else if (/:latest$/.test(image)) ajouter(i, "DL3007");
			}
			if (m[2]) stages.push(m[2]);
			workdir = false; dernierUser = null;
		}
		if (i.instr === "MAINTAINER") ajouter(i, "DL4000");
		if (i.instr === "WORKDIR"){ workdir = true; if (!/^(\/|\$|[A-Za-z]:)/.test(a.replace(/^["']/, ""))) ajouter(i, "DL3000"); }
		if (i.instr === "USER") dernierUser = a.trim();
		if (i.instr === "ADD"){ var srcs = a.replace(/--\S+\s+/g, "").trim().split(/\s+/); if (!srcs.slice(0, -1).some(function(s){ return /^https?:\/\//.test(s) || /\.(tar|tar\.gz|tgz|tar\.bz2|tar\.xz|txz)$/.test(s); })) ajouter(i, "DL3020"); }
		if (i.instr === "COPY"){ var parts = a.replace(/--\S+\s+/g, "").trim().split(/\s+/), dest = parts[parts.length - 1]; if (a.trim().charAt(0) !== "[" && !workdir && !/^(\/|\$)/.test(dest) && !/^[A-Za-z]:/.test(dest)) ajouter(i, "DL3045"); }
		if ((i.instr === "CMD" || i.instr === "ENTRYPOINT") && a.trim().charAt(0) !== "[") ajouter(i, "DL3025");
		if (i.instr === "RUN"){
			var cmd = a.trim().charAt(0) === "[" ? (function(){ try { return JSON.parse(a).join(" "); } catch (e){ return a; } })() : a;
			if (precedent && precedent.instr === "RUN") ajouter(i, "DL3059");
			if (/(^|[;&|]\s*)sudo\s/.test(cmd)) ajouter(i, "DL3004");
			if (/(^|[;&|]\s*)cd\s/.test(cmd)) ajouter(i, "DL3003");
			var apt = paquetsInstallPort(cmd, "apt");
			if (apt.length){
				if (apt.some(function(l){ return l.some(function(p){ return p.charAt(0) !== "-" && p.indexOf("=") === -1 && !/^\$/.test(p); }); })) ajouter(i, "DL3008");
				if (!/rm\s+-[rfRF]+\s+\/var\/lib\/apt\/lists/.test(cmd) && !/apt-get\s+clean/.test(cmd) || !/rm\s+-[rfRF]+\s+\/var\/lib\/apt\/lists/.test(cmd)) ajouter(i, "DL3009");
				if (!/--no-install-recommends/.test(cmd) && !/-o\s+APT::Install-Recommends=false/.test(cmd)) ajouter(i, "DL3015");
			}
			var apk = paquetsInstallPort(cmd, "apk");
			if (apk.length){
				if (apk.some(function(l){ return l.some(function(p){ return p.charAt(0) !== "-" && p.indexOf("=") === -1; }); })) ajouter(i, "DL3018");
				if (!/--no-cache/.test(cmd)) ajouter(i, "DL3019");
			}
			var pip = paquetsInstallPort(cmd, "pip");
			if (pip.length){
				var sansFichier = pip.some(function(l){ var avecR = l.indexOf("-r") > -1 || l.indexOf("--requirement") > -1; return !avecR && l.some(function(p){ return p.charAt(0) !== "-" && !/[=<>]=?/.test(p) && p !== "." && !/^\//.test(p) && !/\.whl$/.test(p); }); });
				if (sansFichier) ajouter(i, "DL3013");
				if (!/--no-cache-dir/.test(cmd) && !/PIP_NO_CACHE_DIR/.test(texte)) ajouter(i, "DL3042");
			}
			if (/[^|]\|[^|]/.test(cmd) && !ins.some(function(x){ return x.instr === "SHELL" && /pipefail/.test(x.args) && x.ligne < i.ligne; })) ajouter(i, "DL4006");
		}
		precedent = i;
	});
	if (dernierUser !== null && /^(root|0)(:|$)/.test(dernierUser)){ var u = ins.filter(function(x){ return x.instr === "USER"; }).pop(); if (u) ajouter(u, "DL3002"); }
	r.sort(function(x, y){ return x.ligne - y.ligne || (x.code < y.code ? -1 : 1); });
	return r;
}
Shell.sorts.hadolint = function(args, io){
	var h = exigerHotePortAnnexe("hadolint", io);
	exigerBinairePort(h, "hadolint", "/usr/bin/hadolint", io, "hadolint est installé sur docks : ssh docks.");
	var ign = [], format = "tty", sansEchec = false, seuil = "info", fichiers = [];
	for (var i = 0; i < args.length; i++){
		var x = args[i];
		if (x === "--ignore"){ ign.push(args[++i]); continue; }
		if (/^--ignore=/.test(x)){ ign.push(x.substring(9)); continue; }
		if (x === "-f" || x === "--format"){ format = args[++i]; continue; }
		if (/^--format=/.test(x)){ format = x.substring(9); continue; }
		if (x === "--no-fail"){ sansEchec = true; continue; }
		if (x === "-t" || x === "--failure-threshold"){ seuil = args[++i]; continue; }
		if (/^--failure-threshold=/.test(x)){ seuil = x.substring(20); continue; }
		if (x === "-v" || x === "--version") return "Haskell Dockerfile Linter 2.12.0";
		if (x === "-" ){ fichiers.push("-"); continue; }
		if (x.charAt(0) === "-") throw new ShellError("Invalid option `" + x + "'\n\nUsage: hadolint [-v|--version] [-c|--config FILENAME] [DOCKERFILE...] [--no-fail] [--no-color] [-V|--verbose] [-f|--format ARG] [--ignore RULECODE] [-t|--failure-threshold THRESHOLD]", 1);
		fichiers.push(x);
	}
	if (!fichiers.length) fichiers = io.stdin !== null && io.stdin !== undefined ? ["-"] : ["Dockerfile"];
	// .hadolint.yaml dans le dossier courant : la liste ignored.
	try { var cfg = Shell.chercher(".hadolint.yaml", io, "hadolint"); if (cfg.node instanceof Item){ var mm, re = /^\s*-\s*(DL\d{4}|SC\d{4})\s*$/gm, tc = cfg.node.getText(); if (/ignored\s*:/.test(tc)) while ((mm = re.exec(tc))) ign.push(mm[1]); } } catch (e){}
	var tout = [], sorties = [];
	fichiers.forEach(function(f){
		var texte;
		if (f === "-") texte = io.stdin || "";
		else {
			var r = Shell.chercher(f, io, "hadolint");
			if (!(r.node instanceof Item)) throw new ShellError("openBinaryFile: does not exist (No such file or directory)", 1);
			if (!io.sudo && !Shell.bit(r.node, "r", io)) throw new ShellError("openBinaryFile: permission denied (Permission denied)", 1);
			texte = r.node.getText();
		}
		var res = resultatHadolintPort(texte, ign);
		res.forEach(function(x){ x.fichier = f === "-" ? "-" : f; });
		tout = tout.concat(res);
	});
	evenementPort(h, "hadolint", { fichiers: fichiers.slice(), codes: tout.map(function(x){ return x.code; }), ignorees: ign.slice() });
	var niveaux = ["error", "warning", "info", "style"], s = niveaux.indexOf(seuil === "none" ? "x" : seuil);
	io.code = !sansEchec && s > -1 && tout.some(function(x){ return niveaux.indexOf(x.niveau) <= s; }) ? 1 : 0;
	if (format === "json") return JSON.stringify(tout.map(function(x){ return { code: x.code, column: 1, file: x.fichier, level: x.niveau, line: x.ligne, message: x.message }; }));
	return tout.map(function(x){ return x.fichier + ":" + x.ligne + " " + x.code + " " + x.niveau + ": " + x.message; }).join("\n");
};

/* ================================================================== */
/* systemd-nspawn et machinectl (cabine)                                */
/* ================================================================== */

var DOSSIER_MACHINES_PORT = "/var/lib/machines";
var NSPAWN_HOTE_PORT = null;
function machinesNspawnPort(h){ h = h || "cabine"; return estHotePort(h) ? conteneursPort(h).filter(function(c){ return c.nspawn && enMarchePort(c); }) : []; }
function imagesMachinesPort(h){
	var d = dossierHote(h, DOSSIER_MACHINES_PORT);
	if (!d) return [];
	return d.children.filter(function(x){ return x.parents && x.parents[0] === d; }).map(function(x){ return x.room_name; });
}
function lancerNspawnPort(h, dossier, o){
	var nom = dossier.split("/").filter(Boolean).pop();
	var P = etatPort(h);
	var deja = conteneursPort(h).filter(function(c){ return c.nspawn && c.nom === nom && enMarchePort(c); })[0];
	if (deja) return { erreur: "Directory tree " + dossier + " is currently busy." };
	var id = idPort("nspawn:" + h + ":" + nom + ":" + state.nbCommandes);
	var c = { id: id, nom: nom, image: null, imageRef: dossier, cree: maintenantPort(h), ordre: 0, nspawn: true, racineHote: dossier,
		config: { Hostname: nom, Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "container=systemd-nspawn", "HOME=/root"], WorkingDir: "/root", User: "", Cmd: [o.boot ? "/sbin/init" : "/bin/bash"], Entrypoint: null, Labels: {}, ExposedPorts: {} },
		hote: { ports: [], montages: [], tmpfs: {}, readOnly: false, capDrop: [], capAdd: [], secOpt: [], restart: { nom: "no", max: 0 }, memoire: 0, cpus: 0, log: { type: "none", opts: {} }, reseau: "host", autoRemove: true },
		reseaux: {}, etat: { statut: "running", code: 0, oom: false, debut: maintenantPort(h), fin: null, pid: 0, redemarrages: 0, arreteMain: false, sante: null, erreur: "" },
		diff: {}, tmpfsDonnees: {}, journaux: [], secrets: [], processus: [], memoire: 0, reseauIO: [0, 0], disqueIO: [0, 0] };
	c.programme = { type: "nspawn", processus: o.boot ? [{ user: 0, cmd: "/sbin/init" }, { user: 0, cmd: "/lib/systemd/systemd-journald", pidc: 18 }, { user: 0, cmd: "/lib/systemd/systemd-logind", pidc: 33 }, { user: 0, cmd: "/sbin/agetty -o -p -- \\u --noclear - linux", pidc: 41 }] : [{ user: 0, cmd: "/bin/bash" }] };
	P.conteneurs[id] = c;
	var pere = lancerProcessusMachine(h, { comm: "systemd-nspawn", cmd: "systemd-nspawn " + (o.boot ? "--quiet --keep-unit --boot --link-journal=try-guest --network-veth -U --settings=override --machine=" + nom : "-D " + dossier), user: "root", rss: 5600, conteneur: id, shim: true });
	var prem = lancerProcessusMachine(h, { comm: o.boot ? "systemd" : "bash", cmd: o.boot ? "/sbin/init" : "/bin/bash", user: "root", rss: 4100, conteneur: id, ppid: pere.pid });
	c.etat.pid = prem.pid; c.etat.shim = pere.pid;
	evenementPort(h, "nspawn", { action: "start", machine: nom, boot: !!o.boot });
	return { conteneur: c };
}
function arreterNspawnPort(h, c){
	retirerProcessusConteneurPort(h, c);
	delete etatPort(h).conteneurs[c.id];
	evenementPort(h, "nspawn", { action: "stop", machine: c.nom });
}
Shell.sorts["systemd-nspawn"] = function(args, io){
	var h = exigerHotePortAnnexe("systemd-nspawn", io);
	exigerBinairePort(h, "systemd-nspawn", "/usr/bin/systemd-nspawn", io, "systemd-nspawn est installé sur cabine : ssh cabine.");
	var dossier = null, boot = false, machine = null, cmd = [];
	for (var i = 0; i < args.length; i++){
		var x = args[i];
		if (x === "-D" || x === "--directory"){ dossier = args[++i]; continue; }
		if (/^--directory=/.test(x)){ dossier = x.substring(12); continue; }
		if (/^-D./.test(x)){ dossier = x.substring(2); continue; }
		if (x === "-b" || x === "--boot"){ boot = true; continue; }
		if (x === "-M" || x === "--machine"){ machine = args[++i]; continue; }
		if (/^--machine=/.test(x)){ machine = x.substring(10); continue; }
		if (x === "-q" || x === "--quiet"){ continue; }
		if (x.charAt(0) === "-") throw new ShellError("systemd-nspawn: unrecognized option '" + x + "'", 1);
		cmd = args.slice(i); break;
	}
	if (!dossier && machine) dossier = DOSSIER_MACHINES_PORT + "/" + machine;
	if (!io.sudo) throw new ShellError("Need to be root.", 1);
	if (!dossier) throw new ShellError("Failed to determine path, please use -D or -i.", 1);
	var abs = dossier.charAt(0) === "/" ? cheminNormal(dossier) : cheminNormal(Shell.cheminAffiche(current_room) + "/" + dossier);
	evenementPort(h, "nspawnCmd", { dossier: abs, boot: boot, cmd: cmd.join(" ") });
	var d = dossierHote(h, abs);
	if (!d) throw new ShellError("Failed to open directory " + abs + ": No such file or directory", 1);
	if (!fichierHote(h, abs + "/etc/os-release") && !fichierHote(h, abs + "/usr/lib/os-release")) throw new ShellError("Directory " + abs + " doesn't look like an OS root directory (os-release file is missing). Refusing.", 1);
	if (boot && !fichierHote(h, abs + "/sbin/init") && !fichierHote(h, abs + "/lib/systemd/systemd")) throw new ShellError("Spawning container " + abs.split("/").pop() + " on " + abs + ".\nPress Ctrl-] three times within 1s to kill container.\nexecv(/usr/lib/systemd/systemd, /lib/systemd/systemd, /sbin/init) failed: No such file or directory\nContainer " + abs.split("/").pop() + " failed with error code 1.", 1);
	var r = lancerNspawnPort(h, abs, { boot: boot });
	if (r.erreur) throw new ShellError(r.erreur, 1);
	var c = r.conteneur;
	var entete = "Spawning container " + c.nom + " on " + abs + ".\nPress Ctrl-] three times within 1s to kill container.";
	if (cmd.length){
		var rr = executerArgvPort(h, c, cmd, { user: { nom: "root", uid: 0, gid: 0 } });
		arreterNspawnPort(h, c);
		if (rr.erreurOci) throw new ShellError(entete + "\nexecv(" + cmd[0] + ") failed: No such file or directory\nContainer " + c.nom + " failed with error code 1.", 1);
		return entete + "\n" + rr.melee.replace(/\n$/, "") + "\nContainer " + c.nom + " exited successfully.";
	}
	ouvrirSessionPort(h, c, { user: { nom: "root", uid: 0, gid: 0 }, principale: true, retirer: true, cmd: "/bin/bash", sh: "bash" });
	return entete;
};
/* À la sortie d'une session nspawn : la machine s'arrête (et disparaît de machinectl list). */
var FERMER_SESSION_AVANT_ANNEXES_PORT = fermerSessionPort;
fermerSessionPort = function(code){
	var s = SESSION_PORT;
	var c = s && estHotePort(s.h) ? etatPort(s.h).conteneurs[s.id] : null;
	if (c && c.nspawn){
		SESSION_PORT = null;
		if (s.principale){ arreterNspawnPort(s.h, c); term.echo("Container " + c.nom + " exited successfully."); }
		else { c.sessionsOuvertes = (c.sessionsOuvertes || []).filter(function(x){ return x.pidc !== s.pidc; }); term.echo("Connection to machine " + c.nom + " terminated."); }
		return;
	}
	return FERMER_SESSION_AVANT_ANNEXES_PORT.apply(this, arguments);
};
Shell.sorts.machinectl = function(args, io){
	var h = exigerHotePortAnnexe("machinectl", io);
	exigerBinairePort(h, "machinectl", "/usr/bin/machinectl", io, "machinectl est installé sur cabine : ssh cabine.");
	var a = args.filter(function(x){ return !/^(--no-pager|--no-legend|-q|--quiet)$/.test(x); });
	var s0 = a.shift() || "list";
	var legende = args.indexOf("--no-legend") === -1;
	evenementPort(h, "machinectl", { action: s0, args: a.slice(), sudo: !!io.sudo });
	var refus = function(){ throw new ShellError("Failed to " + ({ start: "start machine", shell: "get shell PTY", stop: "terminate machine", poweroff: "poweroff machine", login: "get login PTY", remove: "remove image" }[s0] || s0) + ": Interactive authentication required.", 1); };
	if (s0 === "list"){
		var ms = machinesNspawnPort(h);
		if (!ms.length) return legende ? "No machines." : "";
		return "MACHINE         CLASS     SERVICE        OS     VERSION ADDRESSES\n" + ms.map(function(c){ return completerDroite(c.nom, 16) + "container systemd-nspawn debian 12      -"; }).join("\n") + (legende ? "\n\n" + ms.length + " machines listed." : "");
	}
	if (s0 === "list-images"){
		var imgs = imagesMachinesPort(h);
		if (!imgs.length) return legende ? "No images." : "";
		return "NAME            TYPE      RO USAGE CREATED MODIFIED\n" + imgs.map(function(n){ return completerDroite(n, 16) + "directory no  n/a   n/a     n/a"; }).join("\n") + (legende ? "\n\n" + imgs.length + " images listed." : "");
	}
	if (s0 === "start"){
		if (!io.sudo) refus();
		return a.map(function(n){
			if (imagesMachinesPort(h).indexOf(n) === -1) throw new ShellError("Failed to start machine '" + n + "': No such file or directory", 1);
			var r = lancerNspawnPort(h, DOSSIER_MACHINES_PORT + "/" + n, { boot: true });
			if (r.erreur) throw new ShellError("Failed to start machine '" + n + "': " + r.erreur, 1);
			return "";
		}).join("");
	}
	if (s0 === "shell" || s0 === "login"){
		if (!io.sudo) refus();
		var cible = (a[0] || ".host").split("@").pop();
		var c = machinesNspawnPort(h).filter(function(x){ return x.nom === cible; })[0];
		if (cible === ".host") throw new ShellError("(machinectl shell .host ouvrirait un shell sur l'hôte lui-même : tu y es déjà.)", 1);
		if (!c) throw new ShellError("Failed to get shell PTY: No machine '" + cible + "' known", 1);
		if (s0 === "shell" && a.length > 1){
			var cmd = a.slice(1);
			var rr = executerArgvPort(h, c, cmd, { user: { nom: "root", uid: 0, gid: 0 } });
			if (rr.erreurOci) throw new ShellError("Failed to execute " + cmd[0] + ": No such file or directory", 1);
			return rr.melee.replace(/\n$/, "");
		}
		ouvrirSessionPort(h, c, { user: { nom: "root", uid: 0, gid: 0 }, cmd: "-bash", sh: "bash" });
		return "Connected to machine " + c.nom + ". Press ^] three times within 1s to exit session.";
	}
	if (s0 === "status"){
		var c2 = machinesNspawnPort(h).filter(function(x){ return x.nom === a[0]; })[0];
		if (!c2) throw new ShellError("Could not get path to machine: No machine '" + (a[0] || "") + "' known", 1);
		return c2.nom + "(" + c2.id.substring(0, 32) + ")\n           Since: " + dateLocalePort(h, c2.etat.debut) + "; " + ilYaPort(h, c2.etat.debut).replace(/ ago$/, " ago") + "\n          Leader: " + c2.etat.pid + " (" + (c2.config.Cmd[0] === "/sbin/init" ? "systemd" : "bash") + ")\n         Service: systemd-nspawn; class container\n            Root: " + c2.racineHote + "\n              OS: Debian GNU/Linux 12 (bookworm)\n            Unit: systemd-nspawn@" + c2.nom + ".service";
	}
	if (s0 === "stop" || s0 === "poweroff" || s0 === "terminate"){
		if (!io.sudo) refus();
		a.forEach(function(n){ var c3 = machinesNspawnPort(h).filter(function(x){ return x.nom === n; })[0]; if (!c3) throw new ShellError("Could not kill machine: No machine '" + n + "' known", 1); arreterNspawnPort(h, c3); });
		return "";
	}
	throw new ShellError("Unknown command verb '" + s0 + "'.", 1);
};
