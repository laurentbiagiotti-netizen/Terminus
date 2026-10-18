/**
 * SortsPortShell.js : le moteur des conteneurs du Grand Port, deuxième partie : ce qu'il y a DANS un conteneur.
 *
 *  - Le système de fichiers d'un conteneur : les couches de son image (une vue fusionnée, les suppressions comprises),
 *    sa couche d'écriture (c.diff, ce que montre docker diff), et ses montages : un volume (le vrai dossier
 *    /var/lib/docker/volumes/NOM/_data de l'hôte), un dossier de l'hôte (bind), un tmpfs, un secret. --read-only refuse
 *    l'écriture hors des montages (« Read-only file system »), un montage :ro aussi.
 *  - Un petit shell (celui de busybox, dash ou bash selon l'image) : ; && || | > >> < 2>&1, guillemets, $VAR, ${VAR:-x},
 *    $(...), * ; et les commandes qu'il trouve dans le PATH du conteneur, seulement si l'image les contient
 *    (« /bin/sh: ps: not found » dans une image slim).
 *  - Les sessions interactives (docker run -it, docker exec -it) : la ligne tapée va au shell du conteneur, l'invite change.
 *  - La résolution des noms entre conteneurs (le DNS embarqué des réseaux définis par l'utilisateur, rien sur le pont
 *    par défaut), et les requêtes HTTP (curl sur l'hôte, curl et wget dans un conteneur) vers les ports publiés.
 *
 * --- Ce que le monde peut appeler ---
 *   lireFichierConteneurPort(h, c, chemin)      le texte d'un fichier vu du conteneur (null s'il n'existe pas)
 *   entreeConteneurPort(h, c, chemin)            l'entrée (type, mode, propriétaire, taille) ou null
 *   executerDansConteneurPort(h, c, ligne, o)    { sortie, erreurs, code } : une ligne de shell dans le conteneur
 *   resoudreDepuisConteneurPort(h, c, nom)       { ip, conteneur, hote } ou null
 *   requetePort(h, cible, port, chemin, o)       { code, corps, entetes } ou { erreur, codeCurl }
 *   sessionPort()                                la session interactive en cours (ou null)
 */

/* ================================================================== */
/* La vue des couches d'une image                                       */
/* ================================================================== */

var VUES_PORT = {};
function vueCouchesPort(h, ids){
	var cle = ids.join(",");
	if (VUES_PORT[cle]) return VUES_PORT[cle];
	var v = {};
	ids.forEach(function(id){
		var c = couchePort(h, id);
		if (!c) return;
		(c.supprimes || []).forEach(function(p){
			delete v[p];
			var pref = p + "/";
			Object.keys(v).forEach(function(k){ if (k.indexOf(pref) === 0) delete v[k]; });
		});
		Object.keys(c.fichiers || {}).forEach(function(p){ v[p] = c.fichiers[p]; });
	});
	// Les dossiers parents implicites.
	Object.keys(v).forEach(function(p){
		var d = dossierDe(p);
		while (d !== "/" && !v[d]){ v[d] = dPort(); d = dossierDe(d); }
	});
	v["/"] = v["/"] || dPort();
	Object.defineProperty(v, "__enfants", { value: null, writable: true, enumerable: false });
	var nb = Object.keys(VUES_PORT).length;
	if (nb > 60) VUES_PORT = {};
	VUES_PORT[cle] = v;
	return v;
}
function vueImagePort(h, img){ return vueCouchesPort(h, (img && img.couches) || []); }
/* Pour le monde : les chemins d'une image, et la couche (la plus haute) qui a posé un chemin. */
function fichiersImagePort(h, img){ var v = vueImagePort(h, img); return Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).sort(); }
function coucheContientPort(h, img, chemin){
	var p = cheminNormal(chemin), l = (img && img.couches) || [];
	for (var i = l.length - 1; i >= 0; i--){ var c = couchePort(h, l[i]); if (!c) continue; if ((c.supprimes || []).indexOf(p) > -1) return null; if (c.fichiers && c.fichiers[p]) return { id: l[i], index: i, cmd: c.cmd }; }
	return null;
}
function enfantsVuePort(v){
	if (v.__enfants) return v.__enfants;
	var e = {};
	Object.keys(v).forEach(function(p){ if (p === "/") return; var d = dossierDe(p); (e[d] = e[d] || []).push(nomDe(p)); });
	v.__enfants = e;
	return e;
}

/* ================================================================== */
/* Le système de fichiers d'un conteneur                                */
/* ================================================================== */

function ErreurFsPort(code, chemin){ this.code = code; this.chemin = chemin; }
var MESSAGES_FS_PORT = { ENOENT: "No such file or directory", EROFS: "Read-only file system", EACCES: "Permission denied", EEXIST: "File exists", ENOTDIR: "Not a directory",
	EISDIR: "Is a directory", ENOTEMPTY: "Directory not empty", EPERM: "Operation not permitted", ELOOP: "Too many levels of symbolic links", EBUSY: "Resource busy" };

/*
 * Un accès au système de fichiers d'un conteneur. c peut être un vrai conteneur, ou un conteneur de construction
 * ({ image, couches: [...], diff, hote: { montages: [] } }) pour un RUN de Dockerfile, ou une « racine » prise sur
 * l'hôte (systemd-nspawn) : { racineHote: "/var/lib/machines/x" }.
 */
function fsPort(h, c){
	var base = c.couchesBuild ? vueCouchesPort(h, c.couchesBuild) : (c.racineHote ? {} : vueImagePort(h, imageDuConteneurPort(h, c)));
	return { h: h, c: c, base: base };
}
function montagesTriesPort(c){
	var l = [];
	if (c.racineHote) l.push({ type: "bind", source: c.racineHote, cible: "/", ro: false });
	(c.hote && c.hote.montages || []).forEach(function(m){ l.push(m); });
	Object.keys((c.hote && c.hote.tmpfs) || {}).forEach(function(t){ l.push({ type: "tmpfs", cible: t, opts: c.hote.tmpfs[t] }); });
	(c.secrets || []).forEach(function(s){ l.push({ type: "secret", source: s.source, cible: s.cible || "/run/secrets/" + s.nom, ro: true, nom: s.nom, hoteSource: s.hoteSource, texte: s.texte }); });
	l.sort(function(a, b){ return cheminNormal(b.cible).length - cheminNormal(a.cible).length; });
	return l;
}
function montagePourPort(c, chemin){
	var p = cheminNormal(chemin), l = montagesTriesPort(c);
	for (var i = 0; i < l.length; i++){
		var cible = cheminNormal(l[i].cible);
		if (p === cible || cible === "/" || p.indexOf(cible + "/") === 0) return { m: l[i], reste: cible === "/" ? p : p.substring(cible.length) || "/" };
	}
	return null;
}
function cheminHoteMontagePort(m, reste){
	var src = m.type === "volume" ? cheminVolumePort(m.source) : m.source;
	return cheminNormal(src + "/" + (reste === "/" ? "" : reste));
}
/* L'entrée d'un nœud de l'hôte, vue du conteneur. */
function entreeDepuisHotePort(h, n){
	if (!n) return null;
	if (n instanceof Room) return { t: "d", m: n.mode || "rwxr-xr-x", u: uidHotePort(h, n.owner), g: uidHotePort(h, n.owner), hote: true };
	if (n.lien) return { t: "l", m: "rwxrwxrwx", u: uidHotePort(h, n.owner), g: 0, l: n.lien, s: n.lien.length, hote: true };
	var e = { t: "f", m: n.mode || "rw-r--r--", u: uidHotePort(h, n.owner), g: uidHotePort(h, n.owner), s: tailleObjetMachine(n), hote: true };
	if (n.taille === undefined || n.getText() !== "") e.c = n.getText();
	if (n.archive) e.archive = n.archive;
	if (n.comp){ e.comp = n.comp; if (n.comp.archive) e.archive = n.comp.archive; }
	if (n.binaire && n.binaire.prog) e.x = n.binaire.prog;
	if (n.socket) e.socket = true;
	return e;
}
/* Les fichiers que docker fabrique pour chaque conteneur (/etc/hosts, /etc/hostname, /etc/resolv.conf). */
function fichierGenerePort(h, c, p){
	if (c.couchesBuild || c.racineHote) return null;
	if (p === "/etc/hostname") return tPort((c.config.Hostname || c.id.substring(0, 12)) + "\n");
	if (p === "/etc/hosts"){
		var l = ["127.0.0.1\tlocalhost", "::1\tlocalhost ip6-localhost ip6-loopback", "fe00::0\tip6-localnet", "ff00::0\tip6-mcastprefix", "ff02::1\tip6-allnodes", "ff02::2\tip6-allrouters"];
		Object.keys(c.reseaux || {}).forEach(function(n){ var x = c.reseaux[n]; if (x.ip) l.push(x.ip + "\t" + (c.config.Hostname || c.id.substring(0, 12))); });
		(c.hotesExtra || []).forEach(function(x){ l.push(x); });
		return tPort(l.join("\n") + "\n");
	}
	if (p === "/etc/resolv.conf"){
		var defini = Object.keys(c.reseaux || {}).some(function(n){ var r = reseauPort(h, n); return r && !r.defaut; });
		if (c.hote.reseau === "none") return tPort("");
		if (defini) return tPort("# Generated by dockerd.\n# This file can be edited; dockerd will not make further changes once it\n# has been modified.\n\nnameserver 127.0.0.11\nsearch " + DOMAINE_PORT + "\noptions ndots:0\n\n# Based on host file: '/etc/resolv.conf' (internal resolver)\n# ExtServers: [host(10.0.80.1)]\n# Overrides: []\n# Option ndots from: internal\n");
		return tPort("# Generated by dockerd.\n# This file can be edited; dockerd will not make further changes once it\n# has been modified.\n\nnameserver 10.0.80.1\nsearch " + DOMAINE_PORT + "\n\n# Based on host file: '/etc/resolv.conf' (legacy)\n# Overrides: []\n");
	}
	if (p === "/dev/null" || p === "/dev/zero" || p === "/dev/random" || p === "/dev/urandom" || p === "/dev/tty") return { t: "f", m: "rw-rw-rw-", u: 0, g: 0, s: 0, c: "", dev: true };
	if (p === "/dev/stdout" || p === "/dev/stderr") return lPort("/proc/self/fd/" + (p === "/dev/stdout" ? 1 : 2));
	if (p === "/proc/1/cgroup" || p === "/proc/self/cgroup") return tPort("0::/\n");
	if (p === "/proc/1/status" || p === "/proc/self/status"){
		var caps = capsPort(c), masque = caps.reduce(function(s, x){ var i = CAPS_TOUTES_PORT.indexOf(x); return i > -1 ? s + Math.pow(2, NUM_CAPS_PORT[x]) : s; }, 0);
		var hx = ("0000000000000000" + masque.toString(16)).slice(-16);
		return tPort("Name:\t" + ((c.programme && c.programme.comm) || "sh") + "\nState:\tS (sleeping)\nPid:\t1\nPPid:\t0\nUid:\t" + ((c.programme && c.programme.uid) || 0) + "\nCapInh:\t0000000000000000\nCapPrm:\t" + hx + "\nCapEff:\t" + hx + "\nCapBnd:\t" + hx + "\nCapAmb:\t0000000000000000\nNoNewPrivs:\t" + (sansNouveauxPrivilegesPort(c) ? 1 : 0) + "\nSeccomp:\t" + (c.hote.privileged ? 0 : 2) + "\n");
	}
	return null;
}
var NUM_CAPS_PORT = { CHOWN: 0, DAC_OVERRIDE: 1, DAC_READ_SEARCH: 2, FOWNER: 3, FSETID: 4, KILL: 5, SETGID: 6, SETUID: 7, SETPCAP: 8, LINUX_IMMUTABLE: 9, NET_BIND_SERVICE: 10, NET_BROADCAST: 11,
	NET_ADMIN: 12, NET_RAW: 13, IPC_LOCK: 14, IPC_OWNER: 15, SYS_MODULE: 16, SYS_RAWIO: 17, SYS_CHROOT: 18, SYS_PTRACE: 19, SYS_PACCT: 20, SYS_ADMIN: 21, SYS_BOOT: 22, SYS_NICE: 23, SYS_RESOURCE: 24,
	SYS_TIME: 25, SYS_TTY_CONFIG: 26, MKNOD: 27, LEASE: 28, AUDIT_WRITE: 29, AUDIT_CONTROL: 30, SETFCAP: 31, MAC_OVERRIDE: 32, MAC_ADMIN: 33, SYSLOG: 34, WAKE_ALARM: 35, BLOCK_SUSPEND: 36, AUDIT_READ: 37,
	PERFMON: 38, BPF: 39, CHECKPOINT_RESTORE: 40 };
/* L'entrée brute à un chemin (sans suivre le dernier lien). */
function entreeBrutePort(fs, chemin){
	var c = fs.c, h = fs.h, p = cheminNormal(chemin);
	var g = fichierGenerePort(h, c, p);
	if (g) return g;
	var mt = montagePourPort(c, p);
	if (mt){
		var m = mt.m;
		if (m.type === "tmpfs"){
			if (mt.reste === "/") return { t: "d", m: "rwxrwxrwt", u: 0, g: 0, tmpfs: true };
			var td = c.tmpfsDonnees || {};
			return td[p] || null;
		}
		if (m.type === "secret"){
			if (mt.reste !== "/") return null;
			var texte = m.texte !== undefined ? m.texte : (m.hoteSource ? texteHote(h, m.hoteSource) : null);
			if (texte === null) return null;
			return { t: "f", m: "r--r--r--", u: 0, g: 0, s: octetsPort(texte), c: texte, secret: true };
		}
		return entreeDepuisHotePort(h, noeudHote(h, cheminHoteMontagePort(m, mt.reste)));
	}
	if (p.indexOf("/run/secrets") === 0 && (c.secrets || []).length && p === "/run/secrets") return { t: "d", m: "rwxr-xr-x", u: 0, g: 0 };
	var d = c.diff || {};
	if (d[p]) return d[p].a === "D" ? null : d[p].e;
	var anc = dossierDe(p);
	while (anc !== "/"){ if (d[anc] && (d[anc].a === "D" || (d[anc].e && d[anc].e.t !== "d"))) return null; anc = dossierDe(anc); }
	return fs.base[p] || null;
}
/* Suivre les liens : { chemin, e } (e null si absent). */
function resoudreCheminPort(fs, chemin, suivreDernier){
	var parts = morceauxChemin(chemin), courant = "/", garde = 0;
	for (var i = 0; i < parts.length; i++){
		var p = cheminNormal(courant + "/" + parts[i]);
		var e = entreeBrutePort(fs, p);
		if (e && e.t === "l" && (i < parts.length - 1 || suivreDernier)){
			if (++garde > 40) throw new ErreurFsPort("ELOOP", chemin);
			var cible = e.l.charAt(0) === "/" ? e.l : courant + "/" + e.l;
			if (/^\/proc\/self\/fd\/[12]$/.test(cheminNormal(cible))) return { chemin: cheminNormal(cible), e: { t: "f", m: "rw-rw-rw-", u: 0, g: 0, s: 0, c: "", dev: true } };
			parts = morceauxChemin(cible).concat(parts.slice(i + 1));
			courant = "/"; i = -1;
			continue;
		}
		if (i < parts.length - 1){
			if (!e) return { chemin: cheminNormal(courant + "/" + parts.slice(i).join("/")), e: null, manque: p };
			if (e.t !== "d") throw new ErreurFsPort("ENOTDIR", chemin);
		}
		courant = p;
	}
	return { chemin: cheminNormal(courant), e: entreeBrutePort(fs, courant) };
}
function entreeConteneurPort(h, c, chemin){ try { return resoudreCheminPort(fsPort(h, c), chemin, true).e; } catch (e){ if (e instanceof ErreurFsPort) return null; throw e; } }
function lireFichierConteneurPort(h, c, chemin){
	var e = entreeConteneurPort(h, c, chemin);
	return e && e.t === "f" ? (e.c !== undefined ? e.c : "") : null;
}
/* Les noms d'un dossier du conteneur. */
function listerPort(fs, chemin){
	var r = resoudreCheminPort(fs, chemin, true), p = r.chemin, c = fs.c, h = fs.h;
	if (!r.e) throw new ErreurFsPort("ENOENT", chemin);
	if (r.e.t !== "d") throw new ErreurFsPort("ENOTDIR", chemin);
	var noms = {};
	var mt = montagePourPort(c, p);
	if (mt && mt.m.type !== "tmpfs" && mt.m.type !== "secret"){
		var d = dossierHote(h, cheminHoteMontagePort(mt.m, mt.reste));
		if (d){ d.items.forEach(function(it){ noms[it.itemname] = true; }); d.children.forEach(function(x){ if (x.parents[0] === d) noms[x.room_name] = true; }); }
	} else if (mt && mt.m.type === "tmpfs"){
		var pref = p === "/" ? "/" : p + "/";
		Object.keys(c.tmpfsDonnees || {}).forEach(function(k){ if (k.indexOf(pref) === 0 && k.substring(pref.length).indexOf("/") === -1) noms[k.substring(pref.length)] = true; });
	} else if (!mt){
		(enfantsVuePort(fs.base)[p] || []).forEach(function(n){ noms[n] = true; });
		var dd = c.diff || {};
		var dirRemplace = dd[p] && dd[p].a !== "D" && dd[p].remplace;
		if (dirRemplace) noms = {};
		Object.keys(dd).forEach(function(k){ if (dossierDe(k) === p && k !== "/") { if (dd[k].a === "D") delete noms[nomDe(k)]; else noms[nomDe(k)] = true; } });
		if (p === "/etc" && !c.couchesBuild && !c.racineHote){ noms.hosts = true; noms.hostname = true; noms["resolv.conf"] = true; }
		if (p === "/run" && (c.secrets || []).length) noms.secrets = true;
	}
	// Les points de montage dans ce dossier.
	montagesTriesPort(c).forEach(function(m){ var cible = cheminNormal(m.cible); if (cible !== "/" && dossierDe(cible) === p) noms[nomDe(cible)] = true; });
	return Object.keys(noms).filter(function(n){ return entreeBrutePort(fs, cheminNormal(p + "/" + n)) !== null; }).sort();
}
/* Les droits d'écriture : root avec DAC_OVERRIDE passe partout ; sinon les bits du dossier. */
function peutPort(ctx, e, bit){
	if (!e) return false;
	var uid = ctx.user ? ctx.user.uid : 0;
	if (uid === 0 && (!ctx.c || ctx.c.couchesBuild || ctx.c.racineHote || aCapPort(ctx.c, "DAC_OVERRIDE"))) return true;
	var m = e.m || "---------", idx = { r: 0, w: 1, x: 2 }[bit];
	if (e.u === uid) return m.charAt(idx) !== "-";
	if (ctx.user && e.g === ctx.user.gid) return m.charAt(3 + idx) !== "-";
	return m.charAt(6 + idx) !== "-" && m.charAt(6 + idx) !== "T";
}
/* Écrire une entrée (fichier, dossier, lien) dans le conteneur. */
function ecrireEntreePort(fs, ctx, chemin, e, options){
	options = options || {};
	var c = fs.c, h = fs.h, p = cheminNormal(chemin);
	var parent = resoudreCheminPort(fs, dossierDe(p), true);
	if (!parent.e) throw new ErreurFsPort("ENOENT", chemin);
	if (parent.e.t !== "d") throw new ErreurFsPort("ENOTDIR", chemin);
	p = cheminNormal(parent.chemin + "/" + nomDe(p));
	var mt = montagePourPort(c, p);
	var existant = entreeBrutePort(fs, p);
	if (mt && mt.m.ro) throw new ErreurFsPort("EROFS", chemin);
	if (!mt && c.hote && c.hote.readOnly && !c.couchesBuild) throw new ErreurFsPort("EROFS", chemin);
	if (!options.force && ctx && !peutPort(ctx, existant && existant.t !== "d" ? existant : parent.e, "w")) throw new ErreurFsPort("EACCES", chemin);
	if (mt && mt.m.type === "tmpfs"){ c.tmpfsDonnees = c.tmpfsDonnees || {}; c.tmpfsDonnees[p] = e; return; }
	if (mt && mt.m.type === "secret") throw new ErreurFsPort("EROFS", chemin);
	if (mt){ moteurSeul(function(){ ecrireEntreeHotePort(h, cheminHoteMontagePort(mt.m, mt.reste), e); }); return; }
	c.diff = c.diff || {};
	var avant = fs.base[p];
	c.diff[p] = { a: avant || (c.diff[p] && c.diff[p].a === "C") ? "C" : "A", e: e };
	if (c.diff[p].a === "A" && c.diff[p] && avant === undefined) c.diff[p].a = "A";
	marquerParentsChangesPort(fs, p);
}
function marquerParentsChangesPort(fs, p){
	var c = fs.c, d = dossierDe(p);
	while (d !== "/"){
		if (montagePourPort(c, d)) break;
		if (!c.diff[d]){ var e = fs.base[d]; if (e) c.diff[d] = { a: "C", e: e }; else break; }
		d = dossierDe(d);
	}
}
function supprimerEntreePort(fs, ctx, chemin, recursif){
	var c = fs.c, h = fs.h;
	var r = resoudreCheminPort(fs, dossierDe(chemin), true);
	var p = cheminNormal(r.chemin + "/" + nomDe(chemin));
	var e = entreeBrutePort(fs, p);
	if (!e) throw new ErreurFsPort("ENOENT", chemin);
	if (e.t === "d" && !recursif){
		if (listerPort(fs, p).length) throw new ErreurFsPort("ENOTEMPTY", chemin);
	}
	var mt = montagePourPort(c, p);
	if (mt && cheminNormal(mt.m.cible) === p && mt.m.type !== "tmpfs") throw new ErreurFsPort("EBUSY", chemin);
	if (mt && mt.m.ro) throw new ErreurFsPort("EROFS", chemin);
	if (!mt && c.hote && c.hote.readOnly && !c.couchesBuild) throw new ErreurFsPort("EROFS", chemin);
	if (ctx && !peutPort(ctx, r.e, "w")) throw new ErreurFsPort("EACCES", chemin);
	if (mt && mt.m.type === "tmpfs"){
		Object.keys(c.tmpfsDonnees || {}).forEach(function(k){ if (k === p || k.indexOf(p + "/") === 0) delete c.tmpfsDonnees[k]; });
		return;
	}
	if (mt){
		moteurSeul(function(){
			var hp = cheminHoteMontagePort(mt.m, mt.reste), d = dossierHote(h, dossierDe(hp)), n = noeudHote(h, hp);
			if (!d || !n) return;
			if (n instanceof Room) supprimerArbreHotePort(d, n); else d.removeItem(n);
		});
		return;
	}
	c.diff = c.diff || {};
	Object.keys(c.diff).forEach(function(k){ if (k.indexOf(p + "/") === 0) delete c.diff[k]; });
	if (fs.base[p] !== undefined) c.diff[p] = { a: "D" };
	else delete c.diff[p];
	marquerParentsChangesPort(fs, p);
}
/* docker diff : C, A, D, triés. */
function diffConteneurPort(c){
	var d = c.diff || {};
	return Object.keys(d).sort().map(function(p){ return d[p].a + " " + p; });
}

/* ================================================================== */
/* Le petit shell : découpage                                           */
/* ================================================================== */

/* Les mots d'une ligne, avec leurs morceaux et la façon dont ils étaient cités. */
function decouperShellPort(ligne){
	var jetons = [], i = 0, n = ligne.length, mot = null;
	function fin(){ if (mot){ jetons.push({ t: "mot", seg: mot }); mot = null; } }
	function ajout(texte, q){ mot = mot || []; var d = mot[mot.length - 1]; if (d && d.q === q && q !== "\"" && q !== "'" && !/^\$\(/.test(texte) && !/^\$\(/.test(d.v)) d.v += texte; else mot.push({ v: texte, q: q }); }
	while (i < n){
		var ch = ligne.charAt(i);
		if (ch === "\\" && i + 1 < n){ ajout(ligne.charAt(i + 1) === "\n" ? "" : ligne.charAt(i + 1), "'"); i += 2; continue; }
		if (ch === "'"){ var j = ligne.indexOf("'", i + 1); if (j === -1) return { erreur: "unterminated quoted string" }; ajout(ligne.substring(i + 1, j), "'"); i = j + 1; continue; }
		if (ch === "\""){
			var k = i + 1, s = "";
			while (k < n && ligne.charAt(k) !== "\""){
				if (ligne.charAt(k) === "\\" && k + 1 < n && /["\\$`]/.test(ligne.charAt(k + 1))){ s += "\\" + ligne.charAt(k + 1); k += 2; continue; }
				if (ligne.charAt(k) === "$" && ligne.charAt(k + 1) === "("){ var prof = 0, d0 = k; for (; k < n; k++){ if (ligne.charAt(k) === "(") prof++; if (ligne.charAt(k) === ")"){ prof--; if (prof === 0) break; } } s += ligne.substring(d0, k + 1); k++; continue; }
				s += ligne.charAt(k); k++;
			}
			if (k >= n) return { erreur: "unterminated quoted string" };
			ajout(s, "\""); i = k + 1; continue;
		}
		if (ch === "$" && ligne.charAt(i + 1) === "("){
			var p = 0, debut = i;
			for (; i < n; i++){ if (ligne.charAt(i) === "(") p++; if (ligne.charAt(i) === ")"){ p--; if (p === 0) break; } }
			ajout(ligne.substring(debut, i + 1), ""); i++; continue;
		}
		if (ch === "#" && !mot){ break; }
		if (/\s/.test(ch)){ if (ch === "\n"){ fin(); jetons.push({ t: "op", v: ";" }); } else fin(); i++; continue; }
		var op = /^(&&|\|\||2>&1|1>&2|&>|2>>|2>|>>|>|<|\||;|&)/.exec(ligne.substring(i));
		if (op && !(op[0].charAt(0) === "2" && mot)){ fin(); jetons.push({ t: "op", v: op[0] }); i += op[0].length; continue; }
		ajout(ch, ""); i++;
	}
	fin();
	return { jetons: jetons };
}
/* La ligne en listes : [{ op, pipeline: [ { mots, redirs } ] }]. */
function analyserShellPort(ligne){
	var d = decouperShellPort(ligne);
	if (d.erreur) return d;
	var listes = [], pipeline = [], cmd = { mots: [], redirs: [] }, opPrec = ";";
	function finCmd(){ if (cmd.mots.length || cmd.redirs.length) pipeline.push(cmd); cmd = { mots: [], redirs: [] }; }
	function finPipe(op){ finCmd(); if (pipeline.length) listes.push({ op: opPrec, pipeline: pipeline }); pipeline = []; opPrec = op; }
	for (var i = 0; i < d.jetons.length; i++){
		var j = d.jetons[i];
		if (j.t === "mot"){ cmd.mots.push(j.seg); continue; }
		if (j.v === "|"){ finCmd(); continue; }
		if (j.v === ";" || j.v === "&&" || j.v === "||" || j.v === "&"){ finPipe(j.v === "&" ? ";" : j.v); continue; }
		if (j.v === "2>&1" || j.v === "1>&2"){ cmd.redirs.push({ op: j.v }); continue; }
		var cible = d.jetons[i + 1];
		if (!cible || cible.t !== "mot") return { erreur: "syntax error: unexpected " + (cible ? "\"" + cible.v + "\"" : "newline") };
		cmd.redirs.push({ op: j.v, cible: cible.seg }); i++;
	}
	finPipe(";");
	return { listes: listes };
}

/* ================================================================== */
/* Le petit shell : exécution                                           */
/* ================================================================== */

/*
 * ctx : { h, c, fs, env: {}, cwd, user: { nom, uid, gid }, stdin, sh: "ash" | "dash" | "bash", argv0, tty, build, statut }
 * Chaque commande renvoie un code ; elle écrit avec ctx.sortir(texte) et ctx.erreur(texte).
 */
function contexteShellPort(h, c, o){
	o = o || {};
	var fs = fsPort(h, c);
	var env = {};
	if (c.config) (c.config.Env || []).forEach(function(e){ var i = e.indexOf("="); if (i > 0) env[e.substring(0, i)] = e.substring(i + 1); });
	if (c.envBuild) Object.keys(c.envBuild).forEach(function(k){ env[k] = c.envBuild[k]; });
	(o.env || []).forEach(function(e){ var i = e.indexOf("="); if (i > 0) env[e.substring(0, i)] = e.substring(i + 1); });
	if (!env.PATH) env.PATH = PATH_DEFAUT_PORT;
	env.HOSTNAME = (c.config && c.config.Hostname) || h;
	var user = o.user || (c.config ? utilisateurConteneurPort(h, c, o.userDemande) : { nom: "root", uid: 0, gid: 0 });
	if (user.erreur) user = { nom: "root", uid: 0, gid: 0 };
	if (!env.HOME) env.HOME = user.uid === 0 ? "/root" : (homeDePort(fs, user) || "/");
	var sh = o.sh || shellDeImagePort(fs);
	return { h: h, c: c, fs: fs, env: env, cwd: o.cwd || (c.config && c.config.WorkingDir) || "/", user: user, stdin: null, sh: sh, argv0: o.argv0 || (sh === "bash" ? "bash" : "/bin/sh"),
		tty: !!o.tty, build: !!o.build, statut: 0, sorties: [], erreurs: [], ligneNo: 1, interactif: !!o.interactif, pid: o.pid || 0, profondeur: 0, exite: null, sessionPid: o.sessionPid || null, partage: {} };
}
function homeDePort(fs, user){
	try {
		var r = resoudreCheminPort(fs, "/etc/passwd", true);
		var l = String(r.e && r.e.c || "").split("\n").filter(function(x){ return x.split(":")[2] === String(user.uid); })[0];
		return l ? l.split(":")[5] : null;
	} catch (e){ return null; }
}
/* Le shell de l'image : busybox (ash), dash (Debian, /bin/sh), bash. */
function shellDeImagePort(fs){
	try {
		var r = resoudreCheminPort(fs, "/bin/sh", true);
		if (r.e && r.e.x === "dash") return "dash";
		if (r.e && r.e.x === "bash") return "bash";
		if (r.e && r.e.x === "busybox") return "ash";
		if (!r.e) return null;
		return "ash";
	} catch (e){ return null; }
}
/* Développer un mot : $VAR, ${VAR:-x}, $(...), $?, ~ ; puis les jokers. Renvoie une liste de mots. */
function developperMotPort(ctx, segs, sansJoker){
	var texte = "", joker = false, cite = false;
	segs.forEach(function(s, i){
		if (s.q === "'"){ texte += s.v; cite = true; return; }
		var v = s.v;
		if (s.q === "" && i === 0 && /^~(\/|$)/.test(v)) v = (ctx.env.HOME || "/root") + v.substring(1);
		v = remplacerVariablesPort(ctx, v, s.q === "\"");
		if (s.q === "\"") cite = true;
		else if (/[*?]/.test(v)) joker = true;
		texte += v;
	});
	if (joker && !sansJoker){
		var trouves = jokerPort(ctx, texte);
		if (trouves.length) return trouves;
	}
	if (!cite && texte === "" && segs.every(function(s){ return s.q === ""; }) && segs.some(function(s){ return /\$/.test(s.v); })) return [];
	return [texte];
}
function remplacerVariablesPort(ctx, v, double){
	if (double) v = v.replace(/\\(["\\$`])/g, "\u0000$1");
	v = v.replace(/\$\(([\s\S]*)\)/g, function(t, cmd){
		var sous = executerLignePort(ctx, cmd, { capture: true });
		return sous.sortie.replace(/\n+$/, "");
	});
	v = v.replace(/\$\{(\w+)(:?[-=+?])?([^}]*)\}|\$(\w+|\?|\$|#|@|\*|\d)/g, function(t, n1, op, mot, n2){
		var n = n1 || n2;
		if (n === "?") return String(ctx.statut);
		if (n === "$") return String(ctx.pid || 1);
		if (n === "#") return String((ctx.args || []).length);
		if (n === "@" || n === "*") return (ctx.args || []).join(" ");
		if (/^\d$/.test(n)) return n === "0" ? ctx.argv0 : ((ctx.args || [])[+n - 1] || "");
		var val = ctx.env.hasOwnProperty(n) ? ctx.env[n] : undefined;
		if (op === ":-" || op === "-") return (val === undefined || (op === ":-" && val === "")) ? mot : val;
		if (op === ":+" || op === "+") return (val === undefined || (op === ":+" && val === "")) ? "" : mot;
		return val === undefined ? "" : val;
	});
	if (double) v = v.replace(/\u0000/g, "");
	return v;
}
function jokerPort(ctx, motif){
	var abs = motif.charAt(0) === "/";
	var dossier = dossierDe(abs ? motif : cheminNormal(ctx.cwd + "/" + motif)), nom = motif.split("/").pop();
	if (/[*?]/.test(dossier)) return [];
	var re = new RegExp("^" + nom.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
	var noms;
	try { noms = listerPort(ctx.fs, dossier); } catch (e){ return []; }
	var prefixe = motif.substring(0, motif.length - nom.length);
	return noms.filter(function(n){ return re.test(n) && (n.charAt(0) !== "." || nom.charAt(0) === "."); }).map(function(n){ return prefixe + n; });
}
/* Exécuter une ligne de shell dans un conteneur : { sortie, erreurs, code, sortieMelee }. */
function executerLignePort(ctx, ligne, o){
	o = o || {};
	var a = analyserShellPort(String(ligne));
	var sortie = "", erreurs = "", melee = "";
	var sortirAvant = ctx.sortir, erreurAvant = ctx.erreur;
	ctx.sortir = function(t){ sortie += t; melee += t; };
	ctx.erreur = function(t){ erreurs += t; melee += t; };
	try {
		if (a.erreur){ ctx.erreur(prefixeShellPort(ctx) + a.erreur + "\n"); ctx.statut = 2; return { sortie: sortie, erreurs: erreurs, code: 2, melee: melee }; }
		ctx.profondeur++;
		if (ctx.profondeur > 12){ ctx.erreur(prefixeShellPort(ctx) + "too many levels\n"); return { sortie: sortie, erreurs: erreurs, code: 2, melee: melee }; }
		for (var i = 0; i < a.listes.length; i++){
			var l = a.listes[i];
			if (l.op === "&&" && ctx.statut !== 0) continue;
			if (l.op === "||" && ctx.statut === 0) continue;
			ctx.statut = executerPipelinePort(ctx, l.pipeline);
			if (ctx.exite !== null) break;
		}
		return { sortie: sortie, erreurs: erreurs, code: ctx.statut, melee: melee };
	} finally {
		ctx.profondeur--;
		ctx.sortir = sortirAvant; ctx.erreur = erreurAvant;
		if (o.capture && sortirAvant){ if (erreurs) erreurAvant(erreurs); }
		else if (sortirAvant && !o.capture){ /* déjà gardé dans sortie */ }
	}
}
function prefixeShellPort(ctx){
	if (ctx.sh === "dash") return ctx.argv0 + ": " + ctx.ligneNo + ": ";
	if (ctx.sh === "bash") return ctx.interactif ? "bash: " : ctx.argv0 + ": line " + ctx.ligneNo + ": ";
	return ctx.argv0 + ": ";
}
function executerPipelinePort(ctx, pipeline){
	var entree = ctx.stdin, code = 0;
	for (var k = 0; k < pipeline.length; k++){
		var dernier = k === pipeline.length - 1;
		var cmd = pipeline[k];
		var sortie = "";
		var sous = Object.create(ctx);
		var aCapture = !dernier;
		var redirSortie = null, redirErreur = null, erreurVersSortie = false;
		// Les redirections
		var stdinCmd = k === 0 ? ctx.stdin : entree;
		for (var r = 0; r < cmd.redirs.length; r++){
			var rd = cmd.redirs[r];
			if (rd.op === "2>&1"){ erreurVersSortie = true; continue; }
			if (rd.op === "1>&2") continue;
			var cible = developperMotPort(ctx, rd.cible, true)[0] || "";
			if (rd.op === "<"){
				var t = lireTextePort(ctx, cible);
				if (t === null){ ctx.erreur(prefixeShellPort(ctx) + "can't open '" + cible + "': No such file or directory\n"); return 1; }
				stdinCmd = t; continue;
			}
			if (rd.op === "2>" || rd.op === "2>>") redirErreur = { cible: cible, ajout: rd.op === "2>>" };
			else if (rd.op === "&>"){ redirSortie = { cible: cible, ajout: false }; erreurVersSortie = true; }
			else redirSortie = { cible: cible, ajout: rd.op === ">>" };
		}
		var tamponSortie = "", tamponErreur = "";
		sous.stdin = stdinCmd;
		sous.sortir = function(t){ tamponSortie += t; };
		sous.erreur = function(t){ if (erreurVersSortie) tamponSortie += t; else tamponErreur += t; };
		// Les mots
		var mots = [];
		var assignations = [];
		var premier = true;
		cmd.mots.forEach(function(segs){
			if (premier && segs.length === 1 && segs[0].q === "" && /^[A-Za-z_]\w*=/.test(segs[0].v)){
				var i = segs[0].v.indexOf("=");
				assignations.push([segs[0].v.substring(0, i), remplacerVariablesPort(ctx, segs[0].v.substring(i + 1), false)]);
				return;
			}
			if (premier && segs.length > 1 && segs[0].q === "" && /^[A-Za-z_]\w*=$/.test(segs[0].v)){
				assignations.push([segs[0].v.replace(/=$/, ""), developperMotPort(ctx, segs.slice(1), true).join(" ")]);
				return;
			}
			premier = false;
			developperMotPort(ctx, segs).forEach(function(m){ mots.push(m); });
		});
		if (!mots.length){
			assignations.forEach(function(x){ ctx.env[x[0]] = x[1]; });
			code = 0;
		} else {
			if (assignations.length){ sous.env = copieJson(ctx.env); assignations.forEach(function(x){ sous.env[x[0]] = x[1]; }); }
			try { code = executerCommandePort(sous, mots); }
			catch (e){
				if (e instanceof ErreurFsPort){ sous.erreur(mots[0] + ": " + e.chemin + ": " + MESSAGES_FS_PORT[e.code] + "\n"); code = 1; }
				else if (e instanceof ShellError){ sous.erreur(e.message + "\n"); code = e.code || 1; }
				else throw e;
			}
			if (sous.exite !== null && sous.exite !== undefined) ctx.exite = sous.exite;
			if (sous.cwd !== ctx.cwd && (mots[0] === "cd")) ctx.cwd = sous.cwd;
			if (mots[0] === "export" || mots[0] === "unset") ctx.env = sous.env;
		}
		if (redirErreur){ if (redirErreur.cible !== "/dev/null") ecrireTextePort(ctx, redirErreur.cible, tamponErreur, redirErreur.ajout); tamponErreur = ""; }
		if (tamponErreur) ctx.erreur(tamponErreur);
		if (redirSortie){
			if (redirSortie.cible !== "/dev/null" && redirSortie.cible !== "/dev/stdout"){
				var ok = ecrireTextePort(ctx, redirSortie.cible, tamponSortie, redirSortie.ajout);
				if (!ok) code = 1;
			} else if (redirSortie.cible === "/dev/stdout") ctx.sortir(tamponSortie);
			tamponSortie = "";
			if (!dernier) entree = "";
		}
		if (dernier){ if (tamponSortie) ctx.sortir(tamponSortie); }
		else entree = tamponSortie;
		if (ctx.exite !== null) break;
	}
	return code;
}
/* Lire et écrire des textes depuis le shell du conteneur. */
function lireTextePort(ctx, chemin){
	try {
		var r = resoudreCheminPort(ctx.fs, absoluPort(ctx, chemin), true);
		if (!r.e || r.e.t !== "f") return null;
		if (!peutPort(ctx, r.e, "r")) return null;
		return r.e.c !== undefined ? r.e.c : "";
	} catch (e){ if (e instanceof ErreurFsPort) return null; throw e; }
}
function ecrireTextePort(ctx, chemin, texte, ajout){
	var p = absoluPort(ctx, chemin);
	try {
		var r = resoudreCheminPort(ctx.fs, p, true);
		if (r.e && r.e.dev) return true;
		if (r.e && r.e.t === "d"){ ctx.erreur(prefixeShellPort(ctx) + "can't create " + chemin + ": Is a directory\n"); return false; }
		var ancien = r.e && r.e.c !== undefined ? r.e.c : "";
		var nouveau = ajout ? ancien + texte : texte;
		var e = r.e ? copieJson(r.e) : { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid };
		delete e.hote;
		e.t = "f"; e.c = nouveau; e.s = octetsPort(nouveau);
		ecrireEntreePort(ctx.fs, ctx, r.chemin, e);
		return true;
	} catch (x){
		if (!(x instanceof ErreurFsPort)) throw x;
		ctx.erreur(prefixeShellPort(ctx) + (ctx.sh === "ash" ? "can't create " + chemin + ": " : "cannot create " + chemin + ": ") + MESSAGES_FS_PORT[x.code] + "\n");
		return false;
	}
}
function absoluPort(ctx, chemin){ return cheminNormal(String(chemin).charAt(0) === "/" ? chemin : ctx.cwd + "/" + chemin); }

/* Trouver un programme dans le PATH du conteneur. */
function trouverProgrammePort(ctx, nom){
	var essais = nom.indexOf("/") > -1 ? [absoluPort(ctx, nom)] : String(ctx.env.PATH || PATH_DEFAUT_PORT).split(":").map(function(d){ return cheminNormal(d + "/" + nom); });
	for (var i = 0; i < essais.length; i++){
		var r;
		try { r = resoudreCheminPort(ctx.fs, essais[i], true); } catch (e){ continue; }
		if (r.e && r.e.t === "f") return { chemin: essais[i], reel: r.chemin, e: r.e };
	}
	return null;
}
/* La commande : un mot-clé du shell, une fonction intégrée, ou un programme de l'image. */
var INTEGREES_PORT = ["cd", "echo", "exit", "export", "unset", "pwd", "true", "false", ":", "[", "test", "set", "type", "command", "exec", "read", "printf", "kill", "umask", "wait", "trap", "alias", "source", ".", "eval", "shift", "return", "ulimit", "times", "hash", "local"];
function executerCommandePort(ctx, mots){
	var nom = mots[0], args = mots.slice(1);
	if (nom === "if" || nom === "while" || nom === "for" || nom === "case"){ ctx.erreur(prefixeShellPort(ctx) + "syntax error: unexpected end of file (le petit shell du jeu ne connaît pas " + nom + ")\n"); return 2; }
	if (INTEGREES_PORT.indexOf(nom) > -1 && !(nom === "printf" && ctx.sh === "dash" && false)){
		return integreePort(ctx, nom, args);
	}
	var p = trouverProgrammePort(ctx, nom);
	if (!p){
		if (nom.indexOf("/") > -1){ ctx.erreur(prefixeShellPort(ctx) + nom + ": not found\n"); return 127; }
		ctx.erreur(ctx.sh === "bash" ? prefixeShellPort(ctx) + nom + ": command not found\n" : prefixeShellPort(ctx) + nom + ": not found\n");
		return 127;
	}
	if (!peutPort(ctx, p.e, "x") || p.e.m.indexOf("x") === -1){ ctx.erreur(prefixeShellPort(ctx) + nom + ": Permission denied\n"); return 126; }
	var impl = implementationPort(p, nom);
	return lancerImplementationPort(ctx, impl, nom, args, p);
}
/* Ce qu'un exécutable sait faire : son marqueur x, l'applet de busybox, ou un script (#!). */
function implementationPort(p, nom){
	var x = p.e.x;
	var base = nomDe(nom);
	if (x === "busybox") return { genre: "applet", nom: base === "busybox" ? null : base, style: "busybox" };
	if (x === "coreutils") return { genre: "applet", nom: nomDe(p.chemin), style: "gnu" };
	if (x) return { genre: "programme", nom: x, style: "gnu" };
	if (p.e.c !== undefined && /^#!/.test(p.e.c)) return { genre: "script", interprete: /^#!\s*(\S+)(?:\s+(\S+))?/.exec(p.e.c), texte: p.e.c };
	return { genre: "binaire" };
}
function lancerImplementationPort(ctx, impl, nom, args, p){
	if (impl.genre === "applet"){
		if (!impl.nom){ if (!args.length){ ctx.sortir("BusyBox v1.36.1 (2024-06-12 11:52:11 UTC) multi-call binary.\nUsage: busybox [function [arguments]...]\n"); return 0; } return lancerImplementationPort(ctx, { genre: "applet", nom: args[0], style: "busybox" }, args[0], args.slice(1), p); }
		var f = COMMANDES_CONTENEUR_PORT[impl.nom];
		var sous = Object.create(ctx); sous.style = impl.style;
		if (impl.nom === "sh" || impl.nom === "ash" || impl.nom === "dash" || impl.nom === "bash") return shellImbriquePort(ctx, impl.nom === "sh" && impl.style === "gnu" ? "dash" : (impl.nom === "sh" ? "ash" : impl.nom), args, nom);
		if (!f){ ctx.erreur(impl.nom + ": applet not found\n"); return 127; }
		return f(sous, args, nom);
	}
	if (impl.genre === "programme"){
		var n = impl.nom;
		if (n === "bash" || n === "dash") return shellImbriquePort(ctx, n, args, nom);
		if (COMMANDES_CONTENEUR_PORT[n]){ var s2 = Object.create(ctx); s2.style = "gnu"; return COMMANDES_CONTENEUR_PORT[n](s2, args, nom); }
		if (typeof programmeEnLignePort === "function"){ var r = programmeEnLignePort(ctx, n, args, nom, p); if (r !== null && r !== undefined) return r; }
		return 0;
	}
	if (impl.genre === "script"){
		var interp = impl.interprete ? impl.interprete[1] : "/bin/sh";
		if (/\/env$/.test(interp)) interp = impl.interprete[2] || "sh";
		if (/python/.test(interp)) return COMMANDES_CONTENEUR_PORT.python(ctx, [p.chemin].concat(args), "python");
		var ish = /bash/.test(interp) ? "bash" : (/dash/.test(interp) ? "dash" : null);
		var shellOk = trouverProgrammePort(ctx, nomDe(interp)) || trouverProgrammePort(ctx, interp);
		if (!shellOk){ ctx.erreur(prefixeShellPort(ctx) + nom + ": not found\n"); return 127; }
		var sc = Object.create(ctx);
		sc.args = args; sc.argv0 = nom; sc.env = copieJson(ctx.env); sc.sh = ish || ctx.sh; sc.exite = null; sc.interactif = false;
		var res = executerLignePort(sc, impl.texte.split("\n").filter(function(l){ return !/^#/.test(l.trim()); }).join("\n"));
		ctx.sortir(res.sortie); ctx.erreur(res.erreurs);
		return sc.exite !== null && sc.exite !== undefined ? sc.exite : res.code;
	}
	ctx.erreur(prefixeShellPort(ctx) + nom + ": cannot execute binary file\n");
	return 126;
}
function shellImbriquePort(ctx, quel, args, nom){
	var i = args.indexOf("-c");
	if (i > -1){
		var sc = Object.create(ctx);
		sc.sh = quel === "sh" ? ctx.sh : quel; sc.argv0 = nom; sc.env = copieJson(ctx.env); sc.exite = null; sc.interactif = false; sc.args = args.slice(i + 2);
		var r = executerLignePort(sc, args[i + 1] || "");
		ctx.sortir(r.sortie); ctx.erreur(r.erreurs);
		return sc.exite !== null && sc.exite !== undefined ? sc.exite : r.code;
	}
	if (args.length && args[0].charAt(0) !== "-"){
		var t = lireTextePort(ctx, args[0]);
		if (t === null){ ctx.erreur(nom + ": can't open '" + args[0] + "': No such file or directory\n"); return quel === "bash" ? 127 : 2; }
		var s3 = Object.create(ctx); s3.sh = quel; s3.args = args.slice(1); s3.argv0 = args[0]; s3.env = copieJson(ctx.env); s3.exite = null;
		var r3 = executerLignePort(s3, t.split("\n").filter(function(l){ return !/^#/.test(l.trim()); }).join("\n"));
		ctx.sortir(r3.sortie); ctx.erreur(r3.erreurs);
		return s3.exite !== null && s3.exite !== undefined ? s3.exite : r3.code;
	}
	// Un shell sans commande, sans terminal : il lit son entrée et s'arrête.
	if (ctx.stdin){ var s4 = Object.create(ctx); s4.sh = quel; s4.env = copieJson(ctx.env); s4.exite = null; var r4 = executerLignePort(s4, ctx.stdin); ctx.sortir(r4.sortie); ctx.erreur(r4.erreurs); return r4.code; }
	return 0;
}

/* ================================================================== */
/* Les commandes intégrées au shell                                     */
/* ================================================================== */

function integreePort(ctx, nom, args){
	switch (nom){
		case "cd": {
			var cible = args[0] === undefined ? (ctx.env.HOME || "/") : (args[0] === "-" ? (ctx.env.OLDPWD || ctx.cwd) : args[0]);
			var p = absoluPort(ctx, cible), r;
			try { r = resoudreCheminPort(ctx.fs, p, true); } catch (e){ r = { e: null }; }
			if (!r.e){ ctx.erreur(ctx.sh === "bash" ? prefixeShellPort(ctx) + "cd: " + cible + ": No such file or directory\n" : prefixeShellPort(ctx) + "cd: can't cd to " + cible + ": No such file or directory\n"); return ctx.sh === "dash" ? 2 : 1; }
			if (r.e.t !== "d"){ ctx.erreur(prefixeShellPort(ctx) + "cd: can't cd to " + cible + ": Not a directory\n"); return ctx.sh === "dash" ? 2 : 1; }
			ctx.env.OLDPWD = ctx.cwd;
			ctx.cwd = p; ctx.env.PWD = p;
			return 0;
		}
		case "pwd": ctx.sortir(ctx.cwd + "\n"); return 0;
		case "echo": {
			var n = false, e = false, l = args.slice();
			while (l.length && /^-[neE]+$/.test(l[0])){ if (l[0].indexOf("n") > -1) n = true; if (l[0].indexOf("e") > -1) e = true; l.shift(); }
			var t = l.join(" ");
			if (e || ctx.sh === "dash") t = t.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\\\/g, "\\");
			ctx.sortir(t + (n ? "" : "\n"));
			return 0;
		}
		case "printf": {
			if (!args.length){ ctx.erreur("printf: usage: printf format [arguments]\n"); return 2; }
			var f = args[0], k = 1, sortie = "";
			do {
				sortie += f.replace(/%(-?\d*)([sdi%])/g, function(x, larg, t){ if (t === "%") return "%"; var v = args[k++]; v = v === undefined ? (t === "s" ? "" : "0") : v; if (t !== "s") v = String(parseInt(v, 10) || 0); return larg ? (larg.charAt(0) === "-" ? completerDroite(v, +larg.substring(1)) : completerGauche(v, +larg)) : v; })
					.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
			} while (k < args.length && /%[sdi]/.test(f));
			ctx.sortir(sortie);
			return 0;
		}
		case "exit": ctx.exite = args[0] !== undefined ? (parseInt(args[0], 10) & 255) : ctx.statut; return ctx.exite;
		case "export": args.forEach(function(a){ var i = a.indexOf("="); if (i > 0) ctx.env[a.substring(0, i)] = a.substring(i + 1); else if (!ctx.env.hasOwnProperty(a)) ctx.env[a] = ""; }); if (!args.length) Object.keys(ctx.env).sort().forEach(function(k){ ctx.sortir("export " + k + "='" + ctx.env[k] + "'\n"); }); return 0;
		case "unset": args.forEach(function(a){ delete ctx.env[a]; }); return 0;
		case "true": case ":": return 0;
		case "false": return 1;
		case "set": if (!args.length) Object.keys(ctx.env).sort().forEach(function(k){ ctx.sortir(k + "='" + ctx.env[k] + "'\n"); }); return 0;
		case "umask": ctx.sortir("0022\n"); return 0;
		case "type": case "command": {
			var liste = nom === "command" ? args.filter(function(a){ return a !== "-v"; }) : args, code = 0;
			if (nom === "command" && args[0] !== "-v"){ return liste.length ? executerCommandePort(ctx, liste) : 0; }
			liste.forEach(function(a){
				if (INTEGREES_PORT.indexOf(a) > -1){ ctx.sortir(nom === "command" ? a + "\n" : a + " is a shell builtin\n"); return; }
				var p2 = trouverProgrammePort(ctx, a);
				if (p2) ctx.sortir(nom === "command" ? p2.chemin + "\n" : a + " is " + p2.chemin + "\n");
				else { if (nom === "type") ctx.erreur(prefixeShellPort(ctx) + "type: " + a + ": not found\n"); code = 1; }
			});
			return code;
		}
		case "exec": return args.length ? executerCommandePort(ctx, args) : 0;
		case "test": case "[": return testShellPort(ctx, nom === "[" ? args.slice(0, args[args.length - 1] === "]" ? -1 : undefined) : args) ? 0 : 1;
		case "read": { var v = (ctx.stdin || "").split("\n")[0]; if (args[0]) ctx.env[args[args.length - 1]] = v; return ctx.stdin ? 0 : 1; }
		case "kill": return COMMANDES_CONTENEUR_PORT.kill(ctx, args, "kill");
		case "source": case ".": { var t2 = lireTextePort(ctx, args[0] || ""); if (t2 === null){ ctx.erreur(prefixeShellPort(ctx) + (args[0] || "") + ": not found\n"); return 1; } var r2 = executerLignePort(ctx, t2.split("\n").filter(function(x){ return !/^#/.test(x.trim()); }).join("\n")); ctx.sortir(r2.sortie); ctx.erreur(r2.erreurs); return r2.code; }
		case "eval": { var r3 = executerLignePort(ctx, args.join(" ")); ctx.sortir(r3.sortie); ctx.erreur(r3.erreurs); return r3.code; }
		default: return 0;
	}
}
function testShellPort(ctx, a){
	if (!a.length) return false;
	if (a[0] === "!") return !testShellPort(ctx, a.slice(1));
	if (a.length === 1) return a[0] !== "";
	if (a.length === 2){
		var p = absoluPort(ctx, a[1]), e = null;
		try { e = resoudreCheminPort(ctx.fs, p, true).e; } catch (x){}
		switch (a[0]){
			case "-f": return !!e && e.t === "f";
			case "-d": return !!e && e.t === "d";
			case "-e": return !!e;
			case "-r": return !!e && peutPort(ctx, e, "r");
			case "-w": return !!e && peutPort(ctx, e, "w") && !(ctx.c.hote && ctx.c.hote.readOnly);
			case "-x": return !!e && peutPort(ctx, e, "x");
			case "-s": return !!e && (e.s || (e.c || "").length) > 0;
			case "-z": return a[1] === "";
			case "-n": return a[1] !== "";
		}
	}
	if (a.length === 3){
		switch (a[1]){
			case "=": case "==": return a[0] === a[2];
			case "!=": return a[0] !== a[2];
			case "-eq": return +a[0] === +a[2];
			case "-ne": return +a[0] !== +a[2];
			case "-gt": return +a[0] > +a[2];
			case "-lt": return +a[0] < +a[2];
			case "-ge": return +a[0] >= +a[2];
			case "-le": return +a[0] <= +a[2];
		}
	}
	return false;
}

/* ================================================================== */
/* Les commandes d'une image (busybox, coreutils, et les autres)        */
/* ================================================================== */

function lireOptionsCourtesPort(args, avecValeur){
	var o = {}, reste = [], fini = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (fini || a === "-" || a.charAt(0) !== "-" || /^-\d/.test(a) && !avecValeur){ reste.push(a); continue; }
		if (a === "--"){ fini = true; continue; }
		if (a.substring(0, 2) === "--"){ var eq = a.indexOf("="); if (eq > 0) o[a.substring(2, eq)] = a.substring(eq + 1); else o[a.substring(2)] = true; continue; }
		for (var k = 1; k < a.length; k++){
			var l = a.charAt(k);
			if ((avecValeur || "").indexOf(l) > -1){ o[l] = a.substring(k + 1) || args[++i]; break; }
			o[l] = true;
		}
	}
	return { o: o, reste: reste };
}
function erreurCmdPort(ctx, cmd, chemin, code){ ctx.erreur(cmd + ": " + (ctx.style === "gnu" ? "cannot access '" + chemin + "'" : chemin) + ": " + MESSAGES_FS_PORT[code] + "\n"); }
function nomUidConteneurPort(ctx, uid){
	var t = lireTextePort(Object.create(ctx, { user: { value: { uid: 0, gid: 0 } } }), "/etc/passwd") || "";
	var l = t.split("\n").filter(function(x){ return x.split(":")[2] === String(uid); })[0];
	return l ? l.split(":")[0] : String(uid);
}
function nomGidConteneurPort(ctx, gid){
	var t = lireTextePort(Object.create(ctx, { user: { value: { uid: 0, gid: 0 } } }), "/etc/group") || "";
	var l = t.split("\n").filter(function(x){ return x.split(":")[2] === String(gid); })[0];
	return l ? l.split(":")[0] : String(gid);
}
function dateLsPort(ctx){ var d = dateMachine(ctx.h, maintenantPort(ctx.h) - 3600000 * 2); return MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()); }
var COMMANDES_CONTENEUR_PORT = {
	cat: function(ctx, args){
		var o = lireOptionsCourtesPort(args), code = 0;
		if (!o.reste.length){ ctx.sortir(ctx.stdin || ""); return 0; }
		o.reste.forEach(function(f){
			if (f === "-"){ ctx.sortir(ctx.stdin || ""); return; }
			var r;
			try { r = resoudreCheminPort(ctx.fs, absoluPort(ctx, f), true); } catch (e){ r = { e: null }; }
			if (!r.e){ ctx.erreur("cat: " + (ctx.style === "gnu" ? f : "can't open '" + f + "'") + ": No such file or directory\n"); code = 1; return; }
			if (r.e.t === "d"){ ctx.erreur("cat: " + (ctx.style === "gnu" ? f : "read error") + ": Is a directory\n"); code = 1; return; }
			if (!peutPort(ctx, r.e, "r")){ ctx.erreur("cat: " + (ctx.style === "gnu" ? f : "can't open '" + f + "'") + ": Permission denied\n"); code = 1; return; }
			var t = r.e.c !== undefined ? r.e.c : (r.e.x ? "\u007fELF\u0002\u0001\u0001 (binaire)\n" : "");
			if (o.o.n){ var n = 0; t = t.replace(/\n$/, "").split("\n").map(function(l){ return completerGauche(++n, 6) + "\t" + l; }).join("\n") + "\n"; }
			ctx.sortir(t);
		});
		return code;
	},
	ls: function(ctx, args){
		var o = lireOptionsCourtesPort(args), code = 0, chemins = o.reste.length ? o.reste : ["."];
		var long = o.o.l || o.o.n, tous = o.o.a || o.o.A, unParLigne = o.o["1"] || long || !ctx.tty;
		var blocs = [];
		chemins.forEach(function(ch){
			var p = absoluPort(ctx, ch), r;
			try { r = resoudreCheminPort(ctx.fs, p, !long || ch.charAt(ch.length - 1) === "/"); } catch (e){ r = { e: null }; }
			if (!r.e){ ctx.erreur("ls: " + (ctx.style === "gnu" ? "cannot access '" + ch + "'" : ch) + ": No such file or directory\n"); code = ctx.style === "gnu" ? 2 : 1; return; }
			var ligneDe = function(nom, e){
				if (!long) return nom;
				var type = e.t === "d" ? "d" : (e.t === "l" ? "l" : (e.socket ? "s" : "-"));
				var taille = e.t === "d" ? 4096 : (e.t === "l" ? (e.l || "").length : (e.s !== undefined ? e.s : octetsPort(e.c || "")));
				var u = o.o.n ? String(e.u) : nomUidConteneurPort(ctx, e.u), g = o.o.n ? String(e.g) : nomGidConteneurPort(ctx, e.g);
				return type + e.m + (ctx.style === "gnu" ? " " + completerGauche(e.t === "d" ? 2 : 1, 1) + " " + completerDroite(u, 4) + " " + completerDroite(g, 4) + " " + completerGauche(taille, 5) : "    " + completerGauche(e.t === "d" ? 2 : 1, 1) + " " + completerDroite(u, 8) + " " + completerDroite(g, 8) + " " + completerGauche(taille, 9)) + " " + dateLsPort(ctx) + " " + nom + (e.t === "l" ? " -> " + e.l : "");
			};
			if (r.e.t !== "d" || o.o.d){ blocs.push({ titre: null, lignes: [ligneDe(ch, r.e)] }); return; }
			if (!peutPort(ctx, r.e, "r")){ ctx.erreur("ls: " + (ctx.style === "gnu" ? "cannot open directory '" + ch + "'" : "can't open '" + ch + "'") + ": Permission denied\n"); code = 2; return; }
			var noms = listerPort(ctx.fs, r.chemin);
			if (tous && o.o.a) noms = [".", ".."].concat(noms);
			if (!tous) noms = noms.filter(function(n){ return n.charAt(0) !== "."; });
			var lignes = noms.map(function(n){
				var e = n === "." || n === ".." ? r.e : entreeBrutePort(ctx.fs, cheminNormal(r.chemin + "/" + n));
				return ligneDe(n, e || dPort());
			});
			if (long) lignes.unshift("total " + (noms.length * 4));
			blocs.push({ titre: chemins.length > 1 ? ch + ":" : null, lignes: lignes });
		});
		ctx.sortir(blocs.map(function(b){ return (b.titre ? b.titre + "\n" : "") + (unParLigne ? b.lignes.join("\n") : b.lignes.join("  ")) + (b.lignes.length ? "\n" : ""); }).join("\n"));
		return code;
	},
	id: function(ctx, args){
		var u = ctx.user, gn = nomGidConteneurPort(ctx, u.gid), un = u.uid === 0 ? "root" : nomUidConteneurPort(ctx, u.uid);
		if (args.indexOf("-u") > -1 || args.indexOf("-ur") > -1){ ctx.sortir((args.indexOf("-n") > -1 ? un : u.uid) + "\n"); return 0; }
		if (args.indexOf("-un") > -1 || args.indexOf("-nu") > -1){ ctx.sortir(un + "\n"); return 0; }
		if (args.indexOf("-g") > -1){ ctx.sortir(u.gid + "\n"); return 0; }
		var groupes = u.uid === 0 ? (ctx.style === "busybox" ? "0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel),11(floppy),20(dialout),26(tape),27(video)" : "0(root)") : u.gid + "(" + gn + ")";
		ctx.sortir("uid=" + u.uid + (un !== String(u.uid) ? "(" + un + ")" : "") + " gid=" + u.gid + (gn !== String(u.gid) ? "(" + gn + ")" : "") + " groups=" + groupes + "\n");
		return 0;
	},
	whoami: function(ctx){ var n = ctx.user.uid === 0 ? "root" : nomUidConteneurPort(ctx, ctx.user.uid); if (n === String(ctx.user.uid)){ ctx.erreur("whoami: unknown uid " + n + "\n"); return 1; } ctx.sortir(n + "\n"); return 0; },
	hostname: function(ctx, args){ if (args.length && args[0].charAt(0) !== "-"){ ctx.erreur("hostname: sethostname: Operation not permitted\n"); return 1; } if (args.indexOf("-i") > -1 || args.indexOf("-I") > -1){ ctx.sortir(Object.keys(ctx.c.reseaux || {}).map(function(n){ return ctx.c.reseaux[n].ip; }).filter(Boolean).join(" ") + "\n"); return 0; } ctx.sortir(((ctx.c.config && ctx.c.config.Hostname) || ctx.h) + "\n"); return 0; },
	env: function(ctx, args){
		if (args.length && args[0].indexOf("=") === -1 && args[0].charAt(0) !== "-") return executerCommandePort(ctx, args);
		var e = copieJson(ctx.env); args.forEach(function(a){ var i = a.indexOf("="); if (i > 0) e[a.substring(0, i)] = a.substring(i + 1); });
		ctx.sortir(Object.keys(e).map(function(k){ return k + "=" + e[k]; }).join("\n") + "\n");
		return 0;
	},
	printenv: function(ctx, args){
		if (!args.length){ ctx.sortir(Object.keys(ctx.env).map(function(k){ return k + "=" + ctx.env[k]; }).join("\n") + "\n"); return 0; }
		var code = 0; args.forEach(function(a){ if (ctx.env.hasOwnProperty(a)) ctx.sortir(ctx.env[a] + "\n"); else code = 1; }); return code;
	},
	touch: function(ctx, args){
		var code = 0;
		lireOptionsCourtesPort(args).reste.forEach(function(f){
			var p = absoluPort(ctx, f);
			try {
				var r = resoudreCheminPort(ctx.fs, p, true);
				if (r.e){ if (r.e.t === "f"){ var e2 = copieJson(r.e); delete e2.hote; ecrireEntreePort(ctx.fs, ctx, r.chemin, e2); } return; }
				ecrireEntreePort(ctx.fs, ctx, p, { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid, s: 0, c: "" });
			} catch (e){ if (!(e instanceof ErreurFsPort)) throw e; ctx.erreur("touch: " + (ctx.style === "gnu" ? "cannot touch '" + f + "'" : f) + ": " + MESSAGES_FS_PORT[e.code] + "\n"); code = 1; }
		});
		return code;
	},
	mkdir: function(ctx, args){
		var o = lireOptionsCourtesPort(args, "m"), code = 0;
		o.reste.forEach(function(f){
			var p = absoluPort(ctx, f);
			try {
				var a = morceauxChemin(p), cur = "";
				for (var i = 0; i < a.length; i++){
					cur += "/" + a[i];
					var e = resoudreCheminPort(ctx.fs, cur, true).e;
					if (e && i === a.length - 1 && !o.o.p){ ctx.erreur("mkdir: " + (ctx.style === "gnu" ? "cannot create directory '" + f + "'" : "can't create directory '" + f + "'") + ": File exists\n"); code = 1; return; }
					if (e) continue;
					if (!o.o.p && i < a.length - 1) throw new ErreurFsPort("ENOENT", f);
					ecrireEntreePort(ctx.fs, ctx, cur, { t: "d", m: "rwxr-xr-x", u: ctx.user.uid, g: ctx.user.gid });
				}
			} catch (e2){ if (!(e2 instanceof ErreurFsPort)) throw e2; ctx.erreur("mkdir: " + (ctx.style === "gnu" ? "cannot create directory '" + f + "'" : "can't create directory '" + f + "'") + ": " + MESSAGES_FS_PORT[e2.code] + "\n"); code = 1; }
		});
		return code;
	},
	rm: function(ctx, args){
		var o = lireOptionsCourtesPort(args), code = 0;
		o.reste.forEach(function(f){
			var p = absoluPort(ctx, f);
			try {
				var e = entreeBrutePort(ctx.fs, resoudreCheminPort(ctx.fs, dossierDe(p), true).chemin + "/" + nomDe(p));
				if (!e){ if (!o.o.f){ ctx.erreur("rm: " + (ctx.style === "gnu" ? "cannot remove '" + f + "'" : "can't remove '" + f + "'") + ": No such file or directory\n"); code = 1; } return; }
				if (e.t === "d" && !(o.o.r || o.o.R)){ ctx.erreur("rm: " + (ctx.style === "gnu" ? "cannot remove '" + f + "': Is a directory" : "'" + f + "' is a directory") + "\n"); code = 1; return; }
				supprimerEntreePort(ctx.fs, ctx, p, true);
			} catch (x){ if (!(x instanceof ErreurFsPort)) throw x; ctx.erreur("rm: " + (ctx.style === "gnu" ? "cannot remove '" + f + "'" : "can't remove '" + f + "'") + ": " + MESSAGES_FS_PORT[x.code] + "\n"); code = 1; }
		});
		return code;
	},
	cp: function(ctx, args){
		var o = lireOptionsCourtesPort(args), code = 0;
		if (o.reste.length < 2){ ctx.erreur("cp: missing destination file operand\n"); return 1; }
		var dest = o.reste.pop(), pd = absoluPort(ctx, dest), ed = null;
		try { ed = resoudreCheminPort(ctx.fs, pd, true).e; } catch (e){}
		o.reste.forEach(function(src){
			var ps = absoluPort(ctx, src), r;
			try { r = resoudreCheminPort(ctx.fs, ps, true); } catch (e){ r = { e: null }; }
			if (!r.e){ ctx.erreur("cp: " + (ctx.style === "gnu" ? "cannot stat '" + src + "'" : "can't stat '" + src + "'") + ": No such file or directory\n"); code = 1; return; }
			var cible = ed && ed.t === "d" ? cheminNormal(pd + "/" + nomDe(ps)) : pd;
			try { copierArbreConteneurPort(ctx, r.chemin, r.e, cible, o.o.r || o.o.R || o.o.a, o.o.a || o.o.p); }
			catch (x){ if (!(x instanceof ErreurFsPort)) throw x; ctx.erreur("cp: " + (ctx.style === "gnu" ? "cannot create regular file '" + dest + "'" : "can't create '" + dest + "'") + ": " + MESSAGES_FS_PORT[x.code] + "\n"); code = 1; }
		});
		return code;
	},
	mv: function(ctx, args){
		var r = COMMANDES_CONTENEUR_PORT.cp(ctx, ["-a"].concat(args));
		if (r === 0){ var l = lireOptionsCourtesPort(args).reste; l.slice(0, -1).forEach(function(s){ try { supprimerEntreePort(ctx.fs, ctx, absoluPort(ctx, s), true); } catch (e){} }); }
		return r;
	},
	chmod: function(ctx, args){
		var o = lireOptionsCourtesPort(args), mode = o.reste.shift(), code = 0;
		o.reste.forEach(function(f){
			try {
				var r = resoudreCheminPort(ctx.fs, absoluPort(ctx, f), true);
				if (!r.e) throw new ErreurFsPort("ENOENT", f);
				if (ctx.user.uid !== 0 && r.e.u !== ctx.user.uid) throw new ErreurFsPort("EPERM", f);
				if (ctx.user.uid === 0 && r.e.u !== 0 && !aCapPort(ctx.c, "FOWNER")) throw new ErreurFsPort("EPERM", f);
				var e = copieJson(r.e); delete e.hote;
				e.m = /^[0-7]{3,4}$/.test(mode) ? modeDepuisOctalPort(mode) : appliquerMode(e.m, mode, "chmod");
				ecrireEntreePort(ctx.fs, ctx, r.chemin, e, { force: true });
			} catch (x){ if (!(x instanceof ErreurFsPort) && !(x instanceof ShellError)) throw x; ctx.erreur("chmod: " + (ctx.style === "gnu" ? "changing permissions of '" + f + "'" : f) + ": " + (x.code && MESSAGES_FS_PORT[x.code] || x.message) + "\n"); code = 1; }
		});
		return code;
	},
	chown: function(ctx, args){
		var o = lireOptionsCourtesPort(args), qui = o.reste.shift() || "", code = 0;
		var parts = qui.split(/[:.]/), uid = /^\d+$/.test(parts[0]) ? +parts[0] : null, gid = null;
		var t = lireTextePort(ctx, "/etc/passwd") || "", tg = lireTextePort(ctx, "/etc/group") || "";
		if (uid === null && parts[0]){ var l = t.split("\n").filter(function(x){ return x.split(":")[0] === parts[0]; })[0]; if (!l){ ctx.erreur("chown: unknown user " + parts[0] + "\n"); return 1; } uid = +l.split(":")[2]; gid = +l.split(":")[3]; }
		if (parts[1]){ if (/^\d+$/.test(parts[1])) gid = +parts[1]; else { var lg = tg.split("\n").filter(function(x){ return x.split(":")[0] === parts[1]; })[0]; if (!lg){ ctx.erreur("chown: unknown user/group " + qui + "\n"); return 1; } gid = +lg.split(":")[2]; } }
		var traiter = function(p, e){
			if (ctx.user.uid !== 0 || !aCapPort(ctx.c, "CHOWN")) throw new ErreurFsPort("EPERM", p);
			var x = copieJson(e); delete x.hote; if (uid !== null) x.u = uid; if (gid !== null) x.g = gid;
			ecrireEntreePort(ctx.fs, ctx, p, x, { force: true });
			if (o.o.R && e.t === "d") listerPort(ctx.fs, p).forEach(function(n){ var pp = cheminNormal(p + "/" + n); traiter(pp, entreeBrutePort(ctx.fs, pp)); });
		};
		o.reste.forEach(function(f){
			try { var r = resoudreCheminPort(ctx.fs, absoluPort(ctx, f), true); if (!r.e) throw new ErreurFsPort("ENOENT", f); traiter(r.chemin, r.e); }
			catch (x){ if (!(x instanceof ErreurFsPort)) throw x; ctx.erreur("chown: " + (ctx.style === "gnu" ? "changing ownership of '" + f + "'" : f) + ": " + MESSAGES_FS_PORT[x.code] + "\n"); code = 1; }
		});
		return code;
	},
	ln: function(ctx, args){
		var o = lireOptionsCourtesPort(args);
		if (o.reste.length < 2){ ctx.erreur("ln: missing destination\n"); return 1; }
		var p = absoluPort(ctx, o.reste[1]);
		try {
			var ex = entreeBrutePort(ctx.fs, p);
			if (ex && ex.t === "d") p = cheminNormal(p + "/" + nomDe(o.reste[0]));
			if (entreeBrutePort(ctx.fs, p) && !o.o.f){ ctx.erreur("ln: " + o.reste[1] + ": File exists\n"); return 1; }
			ecrireEntreePort(ctx.fs, ctx, p, o.o.s ? lPort(o.reste[0]) : copieJson(resoudreCheminPort(ctx.fs, absoluPort(ctx, o.reste[0]), true).e || tPort("")));
		} catch (x){ if (!(x instanceof ErreurFsPort)) throw x; ctx.erreur("ln: " + o.reste[1] + ": " + MESSAGES_FS_PORT[x.code] + "\n"); return 1; }
		return 0;
	},
	sleep: function(){ return 0; },
	true: function(){ return 0; },
	false: function(){ return 1; },
	uname: function(ctx, args){
		var a = args.indexOf("-a") > -1, r = args.indexOf("-r") > -1, m = args.indexOf("-m") > -1;
		if (a) ctx.sortir("Linux " + ((ctx.c.config && ctx.c.config.Hostname) || ctx.h) + " " + NOYAU_PORT + " #1 SMP PREEMPT_DYNAMIC Debian 6.12.9-1 (2025-01-17) x86_64 " + (ctx.style === "busybox" ? "Linux" : "GNU/Linux") + "\n");
		else if (r) ctx.sortir(NOYAU_PORT + "\n"); else if (m) ctx.sortir("x86_64\n"); else ctx.sortir("Linux\n");
		return 0;
	},
	date: function(ctx){ var d = new Date(maintenantPort(ctx.h) - DECALAGE_HISTOIRE * 3600000); ctx.sortir(JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " UTC " + d.getFullYear() + "\n"); return 0; },
	head: function(ctx, args){ return teteQueuePort(ctx, args, true); },
	tail: function(ctx, args){ return teteQueuePort(ctx, args, false); },
	wc: function(ctx, args){
		var o = lireOptionsCourtesPort(args), textes = o.reste.length ? o.reste.map(function(f){ return [f, lireTextePort(ctx, f)]; }) : [[null, ctx.stdin || ""]], code = 0;
		textes.forEach(function(x){
			if (x[1] === null){ ctx.erreur("wc: " + x[0] + ": No such file or directory\n"); code = 1; return; }
			var t = x[1], l = (t.match(/\n/g) || []).length, w = (t.match(/\S+/g) || []).length, c = octetsPort(t);
			var champs = [];
			if (o.o.l) champs.push(l); if (o.o.w) champs.push(w); if (o.o.c || o.o.m) champs.push(c);
			if (!champs.length) champs = [l, w, c];
			ctx.sortir(champs.map(function(n){ return ctx.style === "gnu" && champs.length > 1 ? completerGauche(n, 7) : (ctx.style === "busybox" && champs.length > 1 ? completerGauche(n, 9) : String(n)); }).join(champs.length > 1 && ctx.style === "gnu" ? " " : "") + (x[0] ? " " + x[0] : "") + "\n");
		});
		return code;
	},
	sort: function(ctx, args){
		var o = lireOptionsCourtesPort(args), t = o.reste.length ? o.reste.map(function(f){ return lireTextePort(ctx, f) || ""; }).join("") : (ctx.stdin || "");
		var l = t.replace(/\n$/, "").split("\n").filter(function(x, i, a){ return !(x === "" && a.length === 1); });
		l.sort(o.o.n ? function(a, b){ return parseFloat(a) - parseFloat(b); } : undefined);
		if (o.o.r) l.reverse();
		if (o.o.u) l = l.filter(function(x, i){ return l.indexOf(x) === i; });
		if (l.length) ctx.sortir(l.join("\n") + "\n");
		return 0;
	},
	uniq: function(ctx){ var l = (ctx.stdin || "").replace(/\n$/, "").split("\n"); ctx.sortir(l.filter(function(x, i){ return i === 0 || x !== l[i - 1]; }).join("\n") + "\n"); return 0; },
	grep: function(ctx, args){
		var o = lireOptionsCourtesPort(args, "e"), motif = o.o.e || o.reste.shift();
		if (motif === undefined){ ctx.erreur("Usage: grep [OPTION]... PATTERNS [FILE]...\n"); return 2; }
		var re;
		try { re = new RegExp(o.o.F ? motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : motif.replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")"), o.o.i ? "i" : ""); } catch (e){ ctx.erreur("grep: bad regex '" + motif + "'\n"); return 2; }
		var sources = o.reste.length ? o.reste : [null], trouve = false, compte = 0, plusieurs = sources.length > 1;
		sources.forEach(function(f){
			var t = f === null ? (ctx.stdin || "") : lireTextePort(ctx, f);
			if (t === null){ if (!o.o.s) ctx.erreur("grep: " + f + ": No such file or directory\n"); return; }
			var n = 0;
			t.replace(/\n$/, "").split("\n").forEach(function(l, i){
				var ok = re.test(l) !== !!o.o.v;
				if (!ok) return;
				trouve = true; n++;
				if (!o.o.q && !o.o.c && !o.o.l) ctx.sortir((plusieurs ? f + ":" : "") + (o.o.n ? (i + 1) + ":" : "") + l + "\n");
			});
			if (o.o.c) ctx.sortir((plusieurs ? f + ":" : "") + n + "\n");
			if (o.o.l && n) ctx.sortir(f + "\n");
			compte += n;
		});
		return trouve ? 0 : 1;
	},
	which: function(ctx, args){ var code = 0; args.filter(function(a){ return a.charAt(0) !== "-"; }).forEach(function(a){ var p = trouverProgrammePort(ctx, a); if (p) ctx.sortir(p.chemin + "\n"); else code = 1; }); return code; },
	df: function(ctx, args){
		var h = args.indexOf("-h") > -1;
		var lignes = [["Filesystem", h ? "Size" : "1K-blocks", "Used", h ? "Avail" : "Available", "Use%", "Mounted on"], ["overlay", h ? "31.0G" : "32505856", h ? "6.2G" : "6501171", h ? "23.2G" : "24382120", "21%", "/"], ["tmpfs", h ? "64.0M" : "65536", "0", h ? "64.0M" : "65536", "0%", "/dev"], ["shm", h ? "64.0M" : "65536", "0", h ? "64.0M" : "65536", "0%", "/dev/shm"]];
		montagesTriesPort(ctx.c).forEach(function(m){ lignes.push([m.type === "tmpfs" ? "tmpfs" : "/dev/vda1", h ? (m.type === "tmpfs" ? "1.9G" : "31.0G") : "32505856", "0", h ? "31.0G" : "24382120", "0%", m.cible]); });
		ctx.sortir(lignes.map(function(l){ return completerDroite(l[0], 20) + completerGauche(l[1], 10) + completerGauche(l[2], 10) + completerGauche(l[3], 10) + completerGauche(l[4], 5) + " " + l[5]; }).join("\n") + "\n");
		return 0;
	},
	du: function(ctx, args){
		var o = lireOptionsCourtesPort(args), cible = o.reste[0] || ".", p = absoluPort(ctx, cible), total = 0;
		(function parcourir(x){ var e = entreeBrutePort(ctx.fs, x); if (!e) return; if (e.t === "d"){ total += 4096; listerPort(ctx.fs, x).forEach(function(n){ parcourir(cheminNormal(x + "/" + n)); }); } else total += e.s || octetsPort(e.c || ""); })(resoudreCheminPort(ctx.fs, p, true).chemin);
		ctx.sortir((o.o.h ? humain(total) : String(Math.ceil(total / 1024))) + "\t" + cible + "\n");
		return 0;
	},
	find: function(ctx, args){
		var depart = args[0] && args[0].charAt(0) !== "-" ? args[0] : ".", nom = null, type = null, i = args.indexOf("-name"), j = args.indexOf("-type");
		if (i > -1) nom = new RegExp("^" + args[i + 1].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
		if (j > -1) type = args[j + 1];
		var r = resoudreCheminPort(ctx.fs, absoluPort(ctx, depart), true);
		if (!r.e){ ctx.erreur("find: " + depart + ": No such file or directory\n"); return 1; }
		var sortie = [];
		(function parcourir(x, aff){
			var e = entreeBrutePort(ctx.fs, x); if (!e) return;
			if ((!nom || nom.test(nomDe(x))) && (!type || (type === "d" ? e.t === "d" : (type === "f" ? e.t === "f" : e.t === "l")))) sortie.push(aff);
			if (e.t === "d" && sortie.length < 500) listerPort(ctx.fs, x).forEach(function(n){ parcourir(cheminNormal(x + "/" + n), aff.replace(/\/$/, "") + "/" + n); });
		})(r.chemin, depart);
		ctx.sortir(sortie.join("\n") + (sortie.length ? "\n" : ""));
		return 0;
	},
	kill: function(ctx, args){ var pids = args.filter(function(a){ return /^\d+$/.test(a); }); if (!pids.length){ ctx.erreur("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid\n"); return 2; } if (pids.indexOf("1") > -1 && ctx.c && !ctx.c.couchesBuild && typeof arreterConteneurPort === "function"){ ctx.partage.tuerPid1 = true; } return 0; },
	sed: function(ctx, args){
		var o = lireOptionsCourtesPort(args, "e"), expr = o.o.e || o.reste.shift(), m = /^s(.)(.*?)\1(.*?)\1(g?)$/.exec(expr || "");
		if (!m){ ctx.erreur("sed: -e expression #1, char 1: unknown command\n"); return 1; }
		var re = new RegExp(m[2], m[4] ? "g" : ""), traiter = function(t){ return t.split("\n").map(function(l){ return l.replace(re, m[3]); }).join("\n"); };
		if (!o.reste.length){ ctx.sortir(traiter(ctx.stdin || "")); return 0; }
		var code = 0;
		o.reste.forEach(function(f){ var t = lireTextePort(ctx, f); if (t === null){ ctx.erreur("sed: can't read " + f + ": No such file or directory\n"); code = 2; return; } if (o.o.i) ecrireTextePort(ctx, f, traiter(t), false); else ctx.sortir(traiter(t)); });
		return code;
	},
	basename: function(ctx, args){ ctx.sortir(nomDe(args[0] || "") + "\n"); return 0; },
	dirname: function(ctx, args){ ctx.sortir(dossierDe(args[0] || ".") + "\n"); return 0; },
	readlink: function(ctx, args){ var o = lireOptionsCourtesPort(args), p = absoluPort(ctx, o.reste[0] || ""); try { if (o.o.f) { ctx.sortir(resoudreCheminPort(ctx.fs, p, true).chemin + "\n"); return 0; } var e = entreeBrutePort(ctx.fs, p); if (!e || e.t !== "l") return 1; ctx.sortir(e.l + "\n"); return 0; } catch (x){ return 1; } },
	tee: function(ctx, args){ var o = lireOptionsCourtesPort(args); o.reste.forEach(function(f){ ecrireTextePort(ctx, f, ctx.stdin || "", !!o.o.a); }); ctx.sortir(ctx.stdin || ""); return 0; },
	nproc: function(ctx){ ctx.sortir(String(ctx.c.hote && ctx.c.hote.cpus ? Math.max(1, Math.ceil(ctx.c.hote.cpus)) : 2) + "\n"); return 0; },
	free: function(ctx){ var lim = ctx.c.hote && ctx.c.hote.memoire; ctx.sortir("              total        used        free      shared  buff/cache   available\nMem:        " + completerGauche(Math.round(4026512), 7) + "     " + completerGauche(Math.round(((ctx.c.memoire || 0) / 1024)), 7) + "     2861320        1240      612000     3105000\nSwap:             0           0           0\n" + (lim ? "" : "")); return 0; },
	mount: function(ctx){
		var l = ["overlay on / type overlay (" + (ctx.c.hote && ctx.c.hote.readOnly ? "ro" : "rw") + ",relatime,lowerdir=/var/lib/docker/overlay2/l/" + hexDe("low" + (ctx.c.id || ""), 26).toUpperCase() + ",upperdir=/var/lib/docker/overlay2/" + hexDe("up" + (ctx.c.id || ""), 64) + "/diff,workdir=/var/lib/docker/overlay2/" + hexDe("up" + (ctx.c.id || ""), 64) + "/work)", "proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)", "tmpfs on /dev type tmpfs (rw,nosuid,size=65536k,mode=755)"];
		montagesTriesPort(ctx.c).slice().reverse().forEach(function(m){ l.push((m.type === "tmpfs" ? "tmpfs" : "/dev/vda1") + " on " + m.cible + " type " + (m.type === "tmpfs" ? "tmpfs" : "ext4") + " (" + (m.ro ? "ro" : "rw") + ",relatime" + (m.type === "tmpfs" ? ",nosuid,nodev,noexec" : "") + ")"); });
		["/etc/resolv.conf", "/etc/hostname", "/etc/hosts"].forEach(function(f){ l.push("/dev/vda1 on " + f + " type ext4 (rw,relatime,errors=remount-ro)"); });
		ctx.sortir(l.join("\n") + "\n");
		return 0;
	},
	stat: function(ctx, args){
		var f = args.filter(function(a){ return a.charAt(0) !== "-"; })[0], r;
		try { r = resoudreCheminPort(ctx.fs, absoluPort(ctx, f || ""), false); } catch (e){ r = { e: null }; }
		if (!r.e){ ctx.erreur("stat: " + (ctx.style === "gnu" ? "cannot statx '" + f + "'" : "can't stat '" + f + "'") + ": No such file or directory\n"); return 1; }
		ctx.sortir("  File: " + f + "\n  Size: " + (r.e.s || 0) + "\tBlocks: 8          IO Block: 4096   " + (r.e.t === "d" ? "directory" : "regular file") + "\nAccess: (0" + modeOctal(r.e.m).substring(1) + "/" + (r.e.t === "d" ? "d" : "-") + r.e.m + ")  Uid: (" + completerGauche(r.e.u, 5) + "/" + completerDroite(nomUidConteneurPort(ctx, r.e.u), 8) + ")   Gid: (" + completerGauche(r.e.g, 5) + "/" + completerDroite(nomGidConteneurPort(ctx, r.e.g), 8) + ")\n");
		return 0;
	},
	expr: function(ctx, args){ try { var v = Function("return (" + args.join(" ").replace(/[^0-9+\-*/% ()]/g, "") + ")|0")(); ctx.sortir(v + "\n"); return v ? 0 : 1; } catch (e){ return 2; } },
	seq: function(ctx, args){ var a = args.map(Number), d = a.length > 1 ? a[0] : 1, f = a[a.length - 1], l = []; for (var i = d; i <= f && l.length < 1000; i++) l.push(i); ctx.sortir(l.join("\n") + "\n"); return 0; },
	yes: function(ctx, args){ var m = (args && args.length ? args.join(" ") : "y") + "\n"; ctx.sortir(m + m + m); return 0; },
	clear: function(){ return 0; },
	sha256sum: function(ctx, args){ var code = 0; lireOptionsCourtesPort(args).reste.forEach(function(f){ var t = lireTextePort(ctx, f); if (t === null){ ctx.erreur("sha256sum: " + f + ": No such file or directory\n"); code = 1; return; } ctx.sortir(sha256(t) + "  " + f + "\n"); }); if (!args.length) ctx.sortir(sha256(ctx.stdin || "") + "  -\n"); return code; },
	base64: function(ctx){ ctx.sortir(encoderBase64(ctx.stdin || "") + "\n"); return 0; },
	tr: function(ctx, args){ var a = args.filter(function(x){ return x.charAt(0) !== "-"; }); var t = ctx.stdin || ""; if (args[0] === "-d") t = t.split("").filter(function(ch){ return a[0].indexOf(ch) === -1; }).join(""); else if (a.length === 2) t = t.split("").map(function(ch){ var i = a[0].indexOf(ch); return i > -1 ? a[1].charAt(Math.min(i, a[1].length - 1)) : ch; }).join(""); ctx.sortir(t); return 0; },
	cut: function(ctx, args){ var o = lireOptionsCourtesPort(args, "df"), d = o.o.d || "\t", f = String(o.o.f || "1").split(",").map(Number); ctx.sortir((ctx.stdin || "").replace(/\n$/, "").split("\n").map(function(l){ var c = l.split(d); return f.map(function(i){ return c[i - 1] || ""; }).join(d); }).join("\n") + "\n"); return 0; },
	awk: function(ctx, args){ var prog = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "", m = /\{\s*print\s+\$(\d+)\s*\}/.exec(prog); var n = m ? +m[1] : 0; ctx.sortir((ctx.stdin || "").replace(/\n$/, "").split("\n").map(function(l){ return n ? (l.trim().split(/\s+/)[n - 1] || "") : l; }).join("\n") + "\n"); return 0; },
	xargs: function(ctx, args){ var mots = (ctx.stdin || "").trim().split(/\s+/).filter(Boolean); return executerCommandePort(ctx, (args.length ? args : ["echo"]).concat(mots)); },
	getent: function(ctx, args){
		var base = args[0], cle = args[1];
		if (base === "hosts" || base === "ahosts"){
			var r = resoudreDepuisConteneurPort(ctx.h, ctx.c, cle);
			if (!r || !r.ip) return 2;
			ctx.sortir(completerDroite(r.ip, 15) + " " + cle + "\n");
			return 0;
		}
		if (base === "passwd" || base === "group"){
			var t = lireTextePort(ctx, "/etc/" + base) || "";
			var l = t.replace(/\n$/, "").split("\n").filter(function(x){ return !cle || x.split(":")[0] === cle || x.split(":")[2] === cle; });
			if (!l.length) return 2;
			ctx.sortir(l.join("\n") + "\n");
			return 0;
		}
		ctx.erreur("Unknown database: " + base + "\n");
		return 1;
	},
	nslookup: function(ctx, args){
		var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
		if (!nom){ ctx.erreur("Usage: nslookup [-type=QUERY_TYPE] [-debug] HOST [DNS_SERVER]\n"); return 1; }
		var defini = Object.keys(ctx.c.reseaux || {}).some(function(n){ var rr = reseauPort(ctx.h, n); return rr && !rr.defaut; });
		var serveur = ctx.c.hote.reseau === "none" ? null : (defini ? "127.0.0.11" : "10.0.80.1");
		if (!serveur){ ctx.sortir(";; connection timed out; no servers could be reached\n\n"); return 1; }
		var r = resoudreDepuisConteneurPort(ctx.h, ctx.c, nom);
		var entete = "Server:\t\t" + serveur + "\nAddress:\t" + serveur + ":53\n\n";
		if (!r || !r.ip){ ctx.sortir(entete + "** server can't find " + nom + (nom.indexOf(".") === -1 ? "." + DOMAINE_PORT : "") + ": NXDOMAIN\n\n"); return 1; }
		ctx.sortir(entete + "Non-authoritative answer:\nName:\t" + (r.nomComplet || nom) + "\nAddress: " + r.ip + "\n\n");
		return 0;
	},
	ping: function(ctx, args){
		var o = lireOptionsCourtesPort(args, "cWw"), nom = o.reste[0], n = +(o.o.c || 3);
		if (!nom){ ctx.erreur("BusyBox v1.36.1 (2024-06-12 11:52:11 UTC) multi-call binary.\n\nUsage: ping [OPTIONS] HOST\n"); return 1; }
		if (ctx.user.uid !== 0 || !aCapPort(ctx.c, "NET_RAW")){ ctx.erreur("ping: permission denied (are you root?)\n"); return 1; }
		var r = resoudreDepuisConteneurPort(ctx.h, ctx.c, nom);
		if (!r || !r.ip){ ctx.erreur(ctx.style === "busybox" ? "ping: bad address '" + nom + "'\n" : "ping: " + nom + ": Name or service not known\n"); return ctx.style === "busybox" ? 1 : 2; }
		var joint = joignableDepuisConteneurPort(ctx.h, ctx.c, r);
		var l = ["PING " + nom + " (" + r.ip + "): 56 data bytes"];
		for (var i = 0; i < n && joint; i++) l.push("64 bytes from " + r.ip + ": seq=" + i + " ttl=" + (r.conteneur ? 64 : 63) + " time=0." + (100 + (condense(nom + i) % 800)) + " ms");
		l.push("", "--- " + nom + " ping statistics ---", n + " packets transmitted, " + (joint ? n : 0) + " packets received, " + (joint ? 0 : 100) + "% packet loss");
		if (joint) l.push("round-trip min/avg/max = 0.091/0.142/0.233 ms");
		ctx.sortir(l.join("\n") + "\n");
		return joint ? 0 : 1;
	},
	ip: function(ctx, args){
		var objet = args[0] || "", c = ctx.c;
		if (!objet || /^-/.test(objet)){ ctx.erreur("Usage: ip [OPTIONS] address|route|link|tunnel|neigh|rule [ARGS]\n"); return 1; }
		if (/^a/.test(objet)){ ctx.sortir(texteIpConteneurPort(ctx.h, c)); return 0; }
		if (/^r/.test(objet)){
			var l = [];
			Object.keys(c.reseaux || {}).forEach(function(n, i){ var x = c.reseaux[n]; if (!x.ip) return; var r = reseauPort(ctx.h, n); if (i === 0 && x.passerelle) l.push("default via " + x.passerelle + " dev eth" + i + " "); l.push((r && r.sousReseau) + " dev eth" + i + " scope link  src " + x.ip + " "); });
			ctx.sortir(l.join("\n") + (l.length ? "\n" : ""));
			return 0;
		}
		if (/^l/.test(objet)){ ctx.sortir(texteIpConteneurPort(ctx.h, c).split("\n").filter(function(x){ return !/inet|valid_lft/.test(x); }).join("\n")); return 0; }
		ctx.erreur("ip: can't find object '" + objet + "'\n"); return 1;
	},
	ps: function(ctx, args){ ctx.sortir(textePsConteneurPort(ctx, args)); return 0; },
	top: function(ctx){ ctx.sortir(textePsConteneurPort(ctx, ["aux"])); return 0; },
	tar: function(ctx, args){ return tarConteneurPort(ctx, args); },
	curl: function(ctx, args){ return curlConteneurPort(ctx, args, "curl"); },
	wget: function(ctx, args){ return curlConteneurPort(ctx, args, "wget"); },
	adduser: function(ctx, args){ return ajouterCompteConteneurPort(ctx, args, "adduser"); },
	useradd: function(ctx, args){ return ajouterCompteConteneurPort(ctx, args, "useradd"); },
	addgroup: function(ctx, args){ return ajouterGroupeConteneurPort(ctx, args, "addgroup"); },
	groupadd: function(ctx, args){ return ajouterGroupeConteneurPort(ctx, args, "groupadd"); },
	su: function(ctx){ ctx.erreur("su: must be suid to work properly\n"); return 1; },
	nc: function(ctx, args){ var o = lireOptionsCourtesPort(args, "w"); var r = resoudreDepuisConteneurPort(ctx.h, ctx.c, o.reste[0]); if (!r || !r.ip) { ctx.erreur("nc: bad address '" + o.reste[0] + "'\n"); return 1; } var ok = !!ecouteurPort(ctx.h, ctx.c, r, +o.reste[1]); if (o.o.z) return ok ? 0 : 1; if (!ok) ctx.erreur("nc: can't connect to remote host (" + r.ip + "): Connection refused\n"); return ok ? 0 : 1; }
};
COMMANDES_CONTENEUR_PORT.egrep = function(ctx, args){ return COMMANDES_CONTENEUR_PORT.grep(ctx, ["-E"].concat(args)); };
COMMANDES_CONTENEUR_PORT.fgrep = function(ctx, args){ return COMMANDES_CONTENEUR_PORT.grep(ctx, ["-F"].concat(args)); };
COMMANDES_CONTENEUR_PORT.more = COMMANDES_CONTENEUR_PORT.cat;
COMMANDES_CONTENEUR_PORT.less = COMMANDES_CONTENEUR_PORT.cat;
COMMANDES_CONTENEUR_PORT["["] = function(ctx, args){ return integreePort(ctx, "[", args); };
COMMANDES_CONTENEUR_PORT.test = function(ctx, args){ return integreePort(ctx, "test", args); };
COMMANDES_CONTENEUR_PORT.echo = function(ctx, args){ return integreePort(ctx, "echo", args); };
COMMANDES_CONTENEUR_PORT.printf = function(ctx, args){ return integreePort(ctx, "printf", args); };
COMMANDES_CONTENEUR_PORT.pwd = function(ctx){ ctx.sortir(ctx.cwd + "\n"); return 0; };
COMMANDES_CONTENEUR_PORT.dir = COMMANDES_CONTENEUR_PORT.ls;
COMMANDES_CONTENEUR_PORT.coreutils = function(ctx){ return 0; };

function modeDepuisOctalPort(o){
	var s = String(o).slice(-3), t = "";
	for (var i = 0; i < 3; i++){ var n = +s.charAt(i); t += (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-"); }
	if (String(o).length === 4 && String(o).charAt(0) === "1") t = t.substring(0, 8) + (t.charAt(8) === "x" ? "t" : "T");
	return t;
}
function teteQueuePort(ctx, args, tete){
	var n = 10, f = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-n"){ n = parseInt(String(args[++i]).replace(/^\+/, ""), 10); continue; }
		if (/^-n\d+$/.test(args[i])){ n = +args[i].substring(2); continue; }
		if (/^-\d+$/.test(args[i])){ n = +args[i].substring(1); continue; }
		if (args[i] === "-f" || args[i] === "-F") continue;
		f.push(args[i]);
	}
	var t = f.length ? lireTextePort(ctx, f[0]) : (ctx.stdin || "");
	if (t === null){ ctx.erreur((tete ? "head" : "tail") + ": " + (ctx.style === "gnu" ? "cannot open '" + f[0] + "' for reading" : "can't open '" + f[0] + "'") + ": No such file or directory\n"); return 1; }
	var l = t.replace(/\n$/, "").split("\n");
	l = tete ? l.slice(0, n) : l.slice(Math.max(0, l.length - n));
	if (t !== "") ctx.sortir(l.join("\n") + "\n");
	return 0;
}
function copierArbreConteneurPort(ctx, src, e, dest, recursif, garder){
	if (e.t === "d"){
		if (!recursif){ throw new ErreurFsPort("EISDIR", src); }
		ecrireEntreePort(ctx.fs, ctx, dest, { t: "d", m: e.m, u: garder ? e.u : ctx.user.uid, g: garder ? e.g : ctx.user.gid });
		listerPort(ctx.fs, src).forEach(function(n){ var p = cheminNormal(src + "/" + n); copierArbreConteneurPort(ctx, p, entreeBrutePort(ctx.fs, p), cheminNormal(dest + "/" + n), recursif, garder); });
		return;
	}
	var x = copieJson(e); delete x.hote;
	if (!garder){ x.u = ctx.user.uid; x.g = ctx.user.gid; }
	ecrireEntreePort(ctx.fs, ctx, dest, x);
}
function texteIpConteneurPort(h, c){
	var l = ["1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000", "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00", "    inet 127.0.0.1/8 scope host lo", "       valid_lft forever preferred_lft forever"];
	if (c.hote && c.hote.reseau === "host"){
		l.push("2: ens3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP qlen 1000", "    link/ether 52:54:00:" + hexDe("mac" + h, 6).replace(/(..)(..)(..)/, "$1:$2:$3") + " brd ff:ff:ff:ff:ff:ff", "    inet " + ipPort(h) + "/24 brd 10.0.80.255 scope global ens3", "       valid_lft forever preferred_lft forever",
			"3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN", "    link/ether 02:42:" + hexDe("d0" + h, 8).replace(/(..)(..)(..)(..)/, "$1:$2:$3:$4") + " brd ff:ff:ff:ff:ff:ff", "    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0", "       valid_lft forever preferred_lft forever");
		return l.join("\n") + "\n";
	}
	var k = 0;
	Object.keys(c.reseaux || {}).forEach(function(n){
		var x = c.reseaux[n]; if (!x.ip) return;
		var r = reseauPort(h, n), masque = r && r.sousReseau ? r.sousReseau.split("/")[1] : "16";
		var idx = 2 + k, pair = 7 + (condense(c.id + n) % 40);
		l.push(idx + ": eth" + k + "@if" + pair + ": <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP ", "    link/ether " + x.mac + " brd ff:ff:ff:ff:ff:ff",
			"    inet " + x.ip + "/" + masque + " brd " + (r && r.sousReseau ? r.sousReseau.split("/")[0].replace(/\.0\.0$/, ".255.255").replace(/\.0$/, ".255") : "") + " scope global eth" + k, "       valid_lft forever preferred_lft forever");
		k++;
	});
	return l.join("\n") + "\n";
}
/* ps dans le conteneur : PID 1 est le programme principal, puis ce qu'on y a lancé. */
function processusConteneurPort(h, c){
	var prog = c.programme || {};
	var l = (prog.processus || []).map(function(p, i){ return { pid: p.pidc || (i === 0 ? 1 : 28 + i), user: p.user || 0, cmd: p.cmd, temps: "0:00" }; });
	(c.sessionsOuvertes || []).forEach(function(s, i){ l.push({ pid: s.pidc || 40 + i * 6, user: s.uid || 0, cmd: s.cmd }); });
	return l;
}
function textePsConteneurPort(ctx, args){
	var l = processusConteneurPort(ctx.h, ctx.c);
	l.push({ pid: (ctx.pid || 50) + 7, user: ctx.user.uid, cmd: "ps" + (args.length ? " " + args.join(" ") : "") });
	if (ctx.style === "busybox"){
		return "PID   USER     TIME  COMMAND\n" + l.map(function(p){ return completerGauche(p.pid, 5) + " " + completerDroite(nomUidConteneurPort(ctx, p.user), 8) + "  0:00 " + p.cmd; }).join("\n") + "\n";
	}
	if (args.some(function(a){ return /aux|-ef|-e/.test(a); })){
		return "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n" + l.map(function(p){ return completerDroite(nomUidConteneurPort(ctx, p.user), 8) + " " + completerGauche(p.pid, 6) + "  0.0  0.1   2576  1600 " + (ctx.tty ? "pts/0   " : "?       ") + " Ss   " + dateLsPort(ctx).slice(-5) + "   0:00 " + p.cmd; }).join("\n") + "\n";
	}
	return "    PID TTY          TIME CMD\n" + l.map(function(p){ return completerGauche(p.pid, 7) + " " + (ctx.tty ? "pts/0   " : "?       ") + " 00:00:00 " + String(p.cmd).split(/\s+/)[0].split("/").pop(); }).join("\n") + "\n";
}
function ajouterCompteConteneurPort(ctx, args, cmd){
	if (ctx.user.uid !== 0){ ctx.erreur(cmd + ": Permission denied.\n"); return 1; }
	var o = lireOptionsCourtesPort(args, cmd === "adduser" ? "uGsh" : "ugsdc"), nom = o.reste[o.reste.length - 1];
	if (!nom){ ctx.erreur("Usage: " + cmd + " [OPTIONS] USER\n"); return 1; }
	var passwd = lireTextePort(ctx, "/etc/passwd") || "", group = lireTextePort(ctx, "/etc/group") || "";
	if (passwd.split("\n").some(function(l){ return l.split(":")[0] === nom; })){ ctx.erreur(cmd + ": user '" + nom + "' " + (cmd === "adduser" ? "in use" : "already exists") + "\n"); return cmd === "adduser" ? 1 : 9; }
	var systeme = o.o.S || o.o.r;
	var uid = o.o.u ? +o.o.u : Math.max.apply(null, passwd.split("\n").map(function(l){ var u = +l.split(":")[2]; return isNaN(u) || u >= 60000 ? 0 : (systeme ? (u < 1000 ? u : 0) : u); }).concat([systeme ? 100 : 999])) + 1;
	var nomGroupe = o.o.G || o.o.g || nom, gid;
	var lg = group.split("\n").filter(function(l){ return l.split(":")[0] === nomGroupe || l.split(":")[2] === nomGroupe; })[0];
	if (lg) gid = +lg.split(":")[2];
	else { if ((o.o.G || o.o.g) && !lg && cmd !== "adduser"){ ctx.erreur(cmd + ": group '" + nomGroupe + "' does not exist\n"); return 6; } gid = uid; ecrireTextePort(ctx, "/etc/group", group.replace(/\n?$/, "\n") + nomGroupe + ":x:" + gid + ":\n", false); }
	var home = o.o.h || o.o.d || "/home/" + nom, shell = o.o.s || (cmd === "adduser" ? "/bin/sh" : "/bin/sh");
	if (cmd === "adduser" && o.o.S) shell = "/sbin/nologin";
	ecrireTextePort(ctx, "/etc/passwd", passwd.replace(/\n?$/, "\n") + nom + ":x:" + uid + ":" + gid + "::" + home + ":" + shell + "\n", false);
	if ((cmd === "adduser" && !o.o.H) || (cmd === "useradd" && o.o.m)){
		try { ecrireEntreePort(ctx.fs, ctx, home, { t: "d", m: "rwxr-sr-x", u: uid, g: gid }); } catch (e){}
	}
	return 0;
}
function ajouterGroupeConteneurPort(ctx, args, cmd){
	if (ctx.user.uid !== 0){ ctx.erreur(cmd + ": Permission denied.\n"); return 1; }
	var o = lireOptionsCourtesPort(args, "g"), nom = o.reste[o.reste.length - 1];
	var group = lireTextePort(ctx, "/etc/group") || "";
	if (group.split("\n").some(function(l){ return l.split(":")[0] === nom; })){ ctx.erreur(cmd + ": group '" + nom + "' " + (cmd === "addgroup" ? "in use" : "already exists") + "\n"); return cmd === "addgroup" ? 1 : 9; }
	var gid = o.o.g ? +o.o.g : Math.max.apply(null, group.split("\n").map(function(l){ var g = +l.split(":")[2]; return isNaN(g) || g >= 60000 ? 0 : g; }).concat([999])) + 1;
	ecrireTextePort(ctx, "/etc/group", group.replace(/\n?$/, "\n") + nom + ":x:" + gid + ":\n", false);
	return 0;
}

/* tar dans un conteneur : vers un montage (l'archive arrive sur l'hôte, et tar -tzf l'y lit) ou depuis. */
function tarConteneurPort(ctx, args){
	var mode = null, f = null, z = false, v = false, C = null, reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-C"){ C = args[++i]; continue; }
		if (a === "-f"){ f = args[++i]; continue; }
		if (/^-?[ctxvzfpj]+$/.test(a) && (a.charAt(0) === "-" || i === 0)){
			var ls = a.replace(/^-/, "");
			for (var k = 0; k < ls.length; k++){ var l = ls.charAt(k); if ("ctx".indexOf(l) > -1) mode = l; else if (l === "z") z = true; else if (l === "v") v = true; else if (l === "f") f = args[++i]; }
			continue;
		}
		reste.push(a);
	}
	if (!mode){ ctx.erreur("tar: need at least one option\n"); return 1; }
	if (!f){ ctx.erreur("tar: " + (mode === "c" ? "refusing to write archive contents to terminal" : "refusing to read archive contents from terminal") + "\n"); return 1; }
	var base = C ? absoluPort(ctx, C) : ctx.cwd;
	if (mode === "c"){
		var entrees = [];
		reste.forEach(function(r){
			var p = cheminNormal(r.charAt(0) === "/" ? r : base + "/" + r), nomA = r === "." ? "." : r.replace(/^\//, "");
			(function ajouter(chemin, nom){
				var e = entreeBrutePort(ctx.fs, chemin);
				if (!e) return;
				var proprio = nomUidConteneurPort(ctx, e.u), groupe = nomGidConteneurPort(ctx, e.g);
				if (e.t === "d"){
					entrees.push({ n: (nom === "." ? "./" : nom.replace(/\/?$/, "/")), d: 1, m: e.m, o: proprio, g: groupe });
					listerPort(ctx.fs, chemin).forEach(function(x){ ajouter(cheminNormal(chemin + "/" + x), (nom === "." ? "./" : nom.replace(/\/$/, "") + "/") + x); });
					return;
				}
				entrees.push({ n: nom, x: e.c !== undefined ? e.c : "", t: e.c === undefined ? e.s : undefined, m: e.m, o: proprio, g: groupe, mt: maintenantPort(ctx.h), l: e.l });
			})(p, nomA);
		});
		var brut = Math.ceil(entrees.reduce(function(s, e){ return s + 512 + (e.d ? 0 : Math.ceil((e.t || octetsPort(e.x || "")) / 512) * 512); }, 1024) / 10240) * 10240;
		var archive = { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid, s: z ? Math.max(120, Math.round(brut * 0.118)) : brut, c: "", archive: entrees };
		if (z) archive.comp = { algo: "gzip", contenu: "", taille: brut, nom: nomDe(f).replace(/\.(tgz|gz)$/, function(x){ return x === ".tgz" ? ".tar" : ""; }), archive: entrees };
		var dest = absoluPort(ctx, f);
		try { ecrireEntreePort(ctx.fs, ctx, dest, archive); }
		catch (x){ if (!(x instanceof ErreurFsPort)) throw x; ctx.erreur("tar: can't open '" + f + "': " + MESSAGES_FS_PORT[x.code] + "\n"); return 1; }
		if (v) ctx.sortir(entrees.map(function(e){ return e.n; }).join("\n") + "\n");
		return 0;
	}
	var r = resoudreCheminPort(ctx.fs, absoluPort(ctx, f), true);
	if (!r.e){ ctx.erreur("tar: can't open '" + f + "': No such file or directory\n"); return 1; }
	var liste = r.e.archive || (r.e.comp && r.e.comp.archive);
	if (!liste){ ctx.erreur("tar: invalid tar magic\n"); return 1; }
	if (mode === "t"){ ctx.sortir(liste.map(function(e){ return e.n; }).join("\n") + "\n"); return 0; }
	var code = 0;
	liste.forEach(function(e){
		var p = cheminNormal(base + "/" + e.n);
		try {
			if (e.d){ if (!entreeBrutePort(ctx.fs, p)) ecrireEntreePort(ctx.fs, ctx, p, { t: "d", m: e.m || "rwxr-xr-x", u: ctx.user.uid, g: ctx.user.gid }); return; }
			var x = { t: e.l ? "l" : "f", m: e.m || "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid, s: e.t !== undefined && e.t !== null ? e.t : octetsPort(e.x || "") };
			if (e.l) x.l = e.l; else if (e.t === undefined || e.t === null || e.x) x.c = e.x || "";
			ecrireEntreePort(ctx.fs, ctx, p, x);
			if (v) ctx.sortir(e.n + "\n");
		} catch (y){ if (!(y instanceof ErreurFsPort)) throw y; ctx.erreur("tar: can't open '" + e.n + "': " + MESSAGES_FS_PORT[y.code] + "\n"); code = 1; }
	});
	return code;
}

/* ================================================================== */
/* Les noms et les chemins entre conteneurs                             */
/* ================================================================== */

/* Ce que vaut un nom vu d'un conteneur : un autre conteneur (DNS embarqué), une machine du port, lui-même. */
function resoudreDepuisConteneurPort(h, c, nom){
	if (!nom) return null;
	var n = String(nom).toLowerCase().replace(/\.$/, "");
	if (c.hote && c.hote.reseau === "host") { var hh = resoudreHotePort(n, h); return hh ? { ip: n === "localhost" ? "127.0.0.1" : ipPort(hh), hote: hh, nomComplet: n } : null; }
	if (n === "localhost" || n === "127.0.0.1") return { ip: "127.0.0.1", conteneur: c, soiMeme: true };
	if (c.hote && c.hote.reseau === "none") return null;
	var moi = c.config && (c.config.Hostname || "").toLowerCase();
	if (n === moi || n === String(c.nom).toLowerCase() && Object.keys(c.reseaux || {}).some(function(k){ var r = reseauPort(h, k); return r && !r.defaut; })){
		var ipMoi = Object.keys(c.reseaux || {}).map(function(k){ return c.reseaux[k].ip; }).filter(Boolean)[0];
		if (n === moi || ipMoi) return { ip: ipMoi || "127.0.0.1", conteneur: c, soiMeme: true };
	}
	// Une adresse IP : un conteneur d'un réseau commun, ou une machine.
	if (/^\d+\.\d+\.\d+\.\d+$/.test(n)){
		var trouve = null;
		conteneursPort(h).forEach(function(x){ Object.keys(x.reseaux || {}).forEach(function(k){ if (x.reseaux[k].ip === n) trouve = { ip: n, conteneur: x, reseau: k }; }); });
		if (trouve) return trouve;
		if (typeof tacheParIpSwarmPort === "function"){ var t = tacheParIpSwarmPort(n); if (t) return t; }
		var hip = hoteDeIpPort(n);
		if (hip) return { ip: n, hote: hip };
		if (/^172\.(1[7-9]|2\d|3[01])\.0\.1$/.test(n)) return { ip: n, hote: h, passerelle: true };
		return { ip: n, inconnu: true };
	}
	// Le DNS embarqué : seulement sur les réseaux définis par l'utilisateur.
	var reseaux = Object.keys(c.reseaux || {}).filter(function(k){ var r = reseauPort(h, k); return r && !r.defaut && r.pilote !== "null" && r.pilote !== "host"; });
	for (var i = 0; i < reseaux.length; i++){
		var k = reseaux[i];
		var cands = conteneursPort(h).filter(function(x){
			if (!x.reseaux || !x.reseaux[k] || !enMarchePort(x)) return false;
			if (String(x.nom).toLowerCase() === n || x.id.indexOf(n) === 0 && n.length >= 12) return true;
			if ((x.reseaux[k].alias || []).map(function(a){ return String(a).toLowerCase(); }).indexOf(n) > -1) return true;
			return false;
		});
		if (cands.length) return { ip: cands[0].reseaux[k].ip, conteneur: cands[0], reseau: k };
	}
	if (typeof resoudreServiceSwarmPort === "function"){ var sv = resoudreServiceSwarmPort(h, c, n); if (sv) return sv; }
	// Les machines du port (le DNS de l'hôte).
	var m = resoudreHotePort(n);
	if (m && !(h === "douane" && m !== "douane")) return { ip: ipPort(m), hote: m, nomComplet: n.indexOf(".") > -1 ? n : n + "." + DOMAINE_PORT };
	if (n === REGISTRE_CONTINENT_PORT && h !== "douane") return { ip: "198.51.100.20", continent: true, nomComplet: n };
	return null;
}
/* La route existe-t-elle ? (un réseau interne ne sort pas ; la douane ne joint personne) */
function joignableDepuisConteneurPort(h, c, r){
	if (!r) return false;
	if (r.soiMeme) return true;
	if (r.conteneur){
		var commun = Object.keys(c.reseaux || {}).some(function(k){ return r.conteneur.reseaux && r.conteneur.reseaux[k] && (r.conteneur.reseaux[k].ip === r.ip || !r.ip); });
		return commun || !!r.swarm;
	}
	var interne = Object.keys(c.reseaux || {}).every(function(k){ var x = reseauPort(h, k); return x && x.interne; });
	if (interne && Object.keys(c.reseaux || {}).length) return false;
	if (r.hote) return h !== "douane" || r.hote === "douane";
	if (r.continent) return h !== "douane";
	return false;
}
/* Qui répond sur ce port ? { hote, conteneur, port } ou null. Depuis un conteneur (c) ou depuis l'hôte (c null). */
function ecouteurPort(h, c, r, port){
	if (!r) return null;
	if (c && !joignableDepuisConteneurPort(h, c, r)) return null;
	if (r.conteneur){
		var x = r.conteneur;
		if (!enMarchePort(x) || (x.ecoutes || []).indexOf(+port) === -1) return null;
		return { hote: r.hoteConteneur || h, conteneur: x, port: +port };
	}
	if (r.hote) return ecouteurHotePort(r.hote, +port, c ? (r.passerelle ? h : h) : h, !!c);
	return null;
}
/* Sur une machine : un port publié (docker-proxy), le maillage de l'escadre, un conteneur en mode host. */
function ecouteurHotePort(cible, port, depuis, depuisConteneur){
	if (!aDesConteneursPort(cible)) return null;
	var local = depuis === cible && !depuisConteneur;
	var liste = conteneursPort(cible);
	for (var i = 0; i < liste.length; i++){
		var c = liste[i];
		if (!enMarchePort(c)) continue;
		if (c.hote.reseau === "host" && (c.ecoutes || []).indexOf(port) > -1) return { hote: cible, conteneur: c, port: port };
		var ps = portsPubliesPort(cible, c);
		for (var k = 0; k < ps.length; k++){
			if (+ps[k].hp !== port) continue;
			if (ps[k].ip === "127.0.0.1" && !local) continue;
			return { hote: cible, conteneur: c, port: +ps[k].cp, proxy: true };
		}
	}
	if (typeof ecouteurSwarmPort === "function"){ var s = ecouteurSwarmPort(cible, port); if (s) return s; }
	return null;
}

/* ================================================================== */
/* Les requêtes HTTP                                                    */
/* ================================================================== */

/*
 * Une requête vers hote:port depuis la machine h (c : le conteneur d'où elle part, ou null).
 * o : { methode, chemin, entetes: {}, corps, auth: "user:pass" }. Renvoie { code, corps, entetes, ecouteur } ou { erreur, codeCurl }.
 */
function requeteDepuisPort(h, c, hote, port, o){
	o = o || {};
	var r;
	if (c) r = resoudreDepuisConteneurPort(h, c, hote);
	else {
		var hh = resoudreHotePort(hote, h);
		if (hh) r = { ip: ipPort(hh), hote: hh };
		else if (/^\d+\.\d+\.\d+\.\d+$/.test(hote)){
			var trouve = null;
			conteneursPort(h).forEach(function(x){ Object.keys(x.reseaux || {}).forEach(function(k){ if (x.reseaux[k].ip === hote) trouve = { ip: hote, conteneur: x }; }); });
			r = trouve || (/^172\.(1[7-9]|2\d|3[01])\.0\.1$/.test(hote) ? { ip: hote, hote: h } : null);
		} else if (hote === REGISTRE_CONTINENT_PORT) r = { continent: true, ip: "198.51.100.20" };
	}
	if (!r) return { erreur: "Could not resolve host: " + hote, codeCurl: 6, wget: "bad address '" + hote + "'" };
	if (r.continent){ if (h === "douane") return { erreur: "Failed to connect to " + hote + " port " + port + " after 3 ms: Couldn't connect to server", codeCurl: 7, wget: "can't connect to remote host: Network unreachable" }; return { code: 200, corps: "Le registre du continent.\n" }; }
	if (!c && r.hote && h === "douane" && r.hote !== "douane") return { erreur: "Failed to connect to " + hote + " port " + port + " after 3 ms: Couldn't connect to server", codeCurl: 7, wget: "can't connect to remote host: Network unreachable" };
	if (!c && r.hote && r.hote === "douane" && h !== "douane") { /* la douane reçoit, elle ne sort pas */ }
	if (c && !joignableDepuisConteneurPort(h, c, r)){
		if (r.conteneur) return { erreur: "Failed to connect to " + hote + " port " + port + " after 3002 ms: Couldn't connect to server", codeCurl: 28, wget: "download timed out" };
		return { erreur: "Failed to connect to " + hote + " port " + port + " after 1 ms: Couldn't connect to server", codeCurl: 7, wget: "can't connect to remote host: Network unreachable" };
	}
	var ec = c ? ecouteurPort(h, c, r, port) : (r.conteneur ? (enMarchePort(r.conteneur) && (r.conteneur.ecoutes || []).indexOf(+port) > -1 ? { hote: h, conteneur: r.conteneur, port: +port } : null) : ecouteurHotePort(r.hote, +port, h, false));
	if (!ec) return { erreur: "Failed to connect to " + hote + " port " + port + " after 0 ms: Couldn't connect to server", codeCurl: 7, wget: "can't connect to remote host (" + (r.ip || hote) + "): Connection refused" };
	if (ec.reponse) return ec.reponse;
	var cible = ec.conteneur;
	if (!enMarchePort(cible) || (cible.ecoutes || []).indexOf(ec.port) === -1){
		return { erreur: "Recv failure: Connection reset by peer", codeCurl: 56, wget: "error getting response: Connection reset by peer" };
	}
	var source = c ? (Object.keys(c.reseaux || {}).map(function(k){ return c.reseaux[k].ip; }).filter(Boolean)[0] || "127.0.0.1") : (ec.proxy ? (Object.keys(cible.reseaux || {}).map(function(k){ return cible.reseaux[k].passerelle; }).filter(Boolean)[0] || "172.17.0.1") : ipPort(h));
	var rep = typeof repondreHttpPort === "function" ? repondreHttpPort(ec.hote, cible, ec.port, { methode: o.methode || "GET", chemin: o.chemin || "/", entetes: o.entetes || {}, corps: o.corps, auth: o.auth, source: source, agent: o.agent || "curl/8.14.1", hoteDemande: hote }) : null;
	if (!rep) return { erreur: "Empty reply from server", codeCurl: 52, wget: "error getting response" };
	rep.ecouteur = ec;
	evenementPort(ec.hote, "http", { conteneur: cible.nom, id: cible.id, port: ec.port, chemin: o.chemin || "/", methode: o.methode || "GET", code: rep.code, depuis: h, depuisConteneur: c ? c.nom : null, hoteDemande: hote, portDemande: +port });
	return rep;
}
function requetePort(h, cible, port, chemin, o){ o = o || {}; o.chemin = chemin; return requeteDepuisPort(h, null, cible, port, o); }
var TEXTES_HTTP_PORT = { 200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 301: "Moved Permanently", 302: "Found", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
	500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout" };
/* Lire les options courantes de curl. */
function optionsCurlPort(args){
	var o = { url: null, s: false, S: false, f: false, I: false, i: false, v: false, L: false, o: null, w: null, X: null, d: null, H: [], u: null, k: false, max: null };
	for (var k = 0; k < args.length; k++){
		var a = args[k], m;
		var long = { "--silent": "-s", "--show-error": "-S", "--fail": "-f", "--head": "-I", "--include": "-i", "--verbose": "-v", "--location": "-L", "--insecure": "-k" }[a];
		if (long) a = long;
		if (a === "-o" || a === "--output"){ o.o = args[++k]; continue; }
		if (a === "-w" || a === "--write-out"){ o.w = args[++k]; continue; }
		if ((m = /^--write-out=(.*)$/.exec(a))){ o.w = m[1]; continue; }
		if (a === "-X" || a === "--request"){ o.X = String(args[++k] || "GET").toUpperCase(); continue; }
		if (a === "-d" || a === "--data" || a === "--data-raw"){ o.d = args[++k] || ""; continue; }
		if (a === "-H" || a === "--header"){ o.H.push(args[++k] || ""); continue; }
		if (a === "-u" || a === "--user"){ o.u = args[++k] || ""; continue; }
		if (a === "-m" || a === "--max-time" || a === "--connect-timeout"){ o.max = parseFloat(args[++k]); continue; }
		if (a === "--fail-with-body" || a === "--no-progress-meter" || a === "--http1.1" || a === "--compressed"){ if (a === "--fail-with-body") o.f = true; continue; }
		if (/^-[sSfIivLk]+$/.test(a)){ a.substring(1).split("").forEach(function(c){ o[c] = true; }); continue; }
		if (a.charAt(0) === "-") return { erreur: "curl: option " + a + ": is unknown\ncurl: try 'curl --help' or 'curl --manual' for more information", code: 2 };
		if (!o.url) o.url = a;
	}
	return o;
}
/* Faire une requête comme curl et rendre sa sortie : { sortie, erreurs, code }. */
function curlCommunPort(h, c, args, ecrireFichierFn){
	var o = optionsCurlPort(args);
	if (o.erreur) return { sortie: "", erreurs: o.erreur, code: o.code };
	if (!o.url) return { sortie: "", erreurs: "curl: no URL specified!\ncurl: try 'curl --help' or 'curl --manual' for more information", code: 2 };
	var m = /^(?:(https?):\/\/)?(?:([^@\/]+)@)?([^\/:?#]+)(?::(\d+))?([\/?#].*)?$/.exec(o.url);
	if (!m) return { sortie: "", erreurs: "curl: (3) URL rejected: Malformed input to a URL function", code: 3 };
	var https = m[1] === "https", port = m[4] ? +m[4] : (https ? 443 : 80), chemin = m[5] && m[5].charAt(0) === "/" ? m[5] : "/" + (m[5] || "");
	var entetes = {};
	o.H.forEach(function(x){ var i = x.indexOf(":"); if (i > 0) entetes[x.substring(0, i).trim().toLowerCase()] = x.substring(i + 1).trim(); });
	var methode = o.X || (o.I ? "HEAD" : (o.d !== null ? "POST" : "GET"));
	var rep = requeteDepuisPort(h, c, m[3], port, { methode: methode, chemin: chemin, entetes: entetes, corps: o.d, auth: o.u || m[2] || null });
	if (rep && https && !rep.erreur) rep = { erreur: "OpenSSL/3.5.1: error:0A00010B:SSL routines::wrong version number", codeCurl: 35 };
	var trace = [];
	if (o.v) trace.push("*   Trying " + (m[3]) + ":" + port + "...");
	if (rep.erreur){
		var msg = "curl: (" + rep.codeCurl + ") " + rep.erreur;
		return { sortie: o.w ? formatCurlPort(o.w, { code: "000", taille: 0, url: o.url }) : "", erreurs: (o.v ? trace.join("\n") + "\n" : "") + (o.s && !o.S ? "" : msg), code: rep.codeCurl };
	}
	var corps = methode === "HEAD" ? "" : (rep.corps || "");
	var enTetes = ["HTTP/1.1 " + rep.code + " " + (TEXTES_HTTP_PORT[rep.code] || "OK")];
	var ent = rep.entetes || {};
	if (!ent["Server"] && rep.serveur) enTetes.push("Server: " + rep.serveur);
	enTetes.push("Date: " + dateHttp(new Date(maintenantPort(h) - DECALAGE_HISTOIRE * 3600000 + new Date().getTimezoneOffset() * 60000)));
	enTetes.push("Content-Type: " + (ent["Content-Type"] || "text/plain; charset=utf-8"));
	enTetes.push("Content-Length: " + octetsPort(rep.corps || ""));
	Object.keys(ent).forEach(function(k){ if (k !== "Content-Type") enTetes.push(k + ": " + ent[k]); });
	var sortie = "";
	if (o.I) sortie = enTetes.join("\r\n").replace(/\r/g, "") + "\n";
	else if (o.o === null) sortie = (o.i ? enTetes.join("\n") + "\n\n" : "") + corps;
	else if (o.o !== "/dev/null" && ecrireFichierFn) ecrireFichierFn(o.o, corps);
	var erreurs = o.v ? trace.concat(["* Connected to " + m[3] + " port " + port, "> " + methode + " " + chemin + " HTTP/1.1", "> Host: " + m[3] + (m[4] ? ":" + port : ""), "> User-Agent: curl/8.14.1", "> Accept: */*", ">"].concat(enTetes.map(function(l){ return "< " + l; })).concat(["<"])).join("\n") : "";
	var code = 0;
	if (o.f && rep.code >= 400){ code = 22; sortie = o.I ? sortie : ""; if (!o.s || o.S) erreurs += (erreurs ? "\n" : "") + "curl: (22) The requested URL returned error: " + rep.code; }
	if (o.w) sortie += formatCurlPort(o.w, { code: rep.code, taille: octetsPort(corps), url: o.url });
	return { sortie: sortie, erreurs: erreurs, code: code, reponse: rep };
}
function formatCurlPort(f, x){
	return String(f).replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/%\{(\w+)\}/g, function(t, k){
		if (k === "http_code" || k === "response_code") return String(x.code);
		if (k === "size_download") return String(x.taille);
		if (k === "time_total") return "0.004512";
		if (k === "url_effective") return x.url;
		return "";
	});
}
/* curl et wget dans un conteneur. */
function curlConteneurPort(ctx, args, quel){
	if (quel === "wget"){
		var o = lireOptionsCourtesPort(args, "OTU"), url = o.reste[0];
		if (!url){ ctx.erreur("BusyBox v1.36.1 (2024-06-12 11:52:11 UTC) multi-call binary.\n\nUsage: wget [-cqS] [--spider] [-O FILE] [-o LOGFILE] [--header STR]\n\t[--post-data STR | --post-file FILE] [-Y on/off]\n\t[-P DIR] [-U AGENT] [-T SEC] URL...\n"); return 1; }
		var m = /^(?:https?:\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
		var rep = requeteDepuisPort(ctx.h, ctx.c, m[1], m[2] ? +m[2] : 80, { methode: o.o.spider ? "HEAD" : "GET", chemin: m[3] || "/", agent: "Wget" });
		if (!o.o.q) ctx.erreur("Connecting to " + m[1] + (m[2] ? ":" + m[2] : "") + " (" + (((ctx.c && resoudreDepuisConteneurPort(ctx.h, ctx.c, m[1])) || {}).ip || m[1]) + ":" + (m[2] || 80) + ")\n");
		if (rep.erreur){ ctx.erreur("wget: " + rep.wget + "\n"); return 1; }
		if (rep.code >= 400){ ctx.erreur("wget: server returned error: HTTP/1.1 " + rep.code + " " + (TEXTES_HTTP_PORT[rep.code] || "") + "\n"); return 1; }
		if (o.o.spider){ if (!o.o.q) ctx.erreur("remote file exists\n"); return 0; }
		var dest = o.o.O || nomDe(m[3] || "/index.html") || "index.html";
		if (dest === "-") ctx.sortir(rep.corps || "");
		else { ecrireTextePort(ctx, dest, rep.corps || "", false); if (!o.o.q) ctx.erreur("saving to '" + dest + "'\n" + dest + "             100% |********************************|   " + octetsPort(rep.corps || "") + "  0:00:00 ETA\n'" + dest + "' saved\n"); }
		return 0;
	}
	var r = curlCommunPort(ctx.h, ctx.c, args, function(f, corps){ ecrireTextePort(ctx, f, corps, false); });
	if (r.sortie) ctx.sortir(r.sortie);
	if (r.erreurs) ctx.erreur(r.erreurs + "\n");
	return r.code;
}

/* curl sur une machine du port : vers les ports publiés de ses conteneurs (ou ceux d'une autre machine). */
var CURL_AVANT_PORT = Shell.sorts.curl;
Shell.sorts.curl = function(args, io){
	var h = portIci();
	if (!h) return CURL_AVANT_PORT.apply(this, arguments);
	var o = optionsCurlPort(args);
	var m = o.url ? /^(?:(https?):\/\/)?(?:[^@\/]+@)?([^\/:?#]+)/.exec(o.url) : null;
	var cible = m ? m[2] : null;
	var concerne = cible && (resoudreHotePort(cible, h) || /^172\.\d+\.\d+\.\d+$/.test(cible) || cible === REGISTRE_CONTINENT_PORT);
	if (!concerne) return CURL_AVANT_PORT.apply(this, arguments);
	var r = curlCommunPort(h, null, args, function(f, corps){ moteurSeul(function(){}); ecrireFichier(f, corps, io, "curl"); });
	if (r.erreurs) io.err(r.erreurs);
	io.code = r.code;
	GameEvents.fire({ type: "port", hote: h, cmd: "curl", url: o.url, code: r.reponse ? r.reponse.code : 0, erreur: r.code, corps: r.reponse ? r.reponse.corps : null });
	return r.sortie.replace(/\n$/, "");
};

/* ================================================================== */
/* Exécuter dans un conteneur (docker exec, healthcheck, RUN)           */
/* ================================================================== */

/* Une ligne de shell dans le conteneur (comme sh -c) : { sortie, erreurs, code, melee }. */
function executerDansConteneurPort(h, c, ligne, o){
	o = o || {};
	var ctx = contexteShellPort(h, c, o);
	if (!ctx.sh){ return { sortie: "", erreurs: "OCI runtime exec failed: exec failed: unable to start container process: exec: \"/bin/sh\": stat /bin/sh: no such file or directory: unknown", code: 127, melee: "" }; }
	ctx.stdin = o.stdin || null;
	var r = executerLignePort(ctx, ligne);
	if (ctx.exite !== null && ctx.exite !== undefined) r.code = ctx.exite;
	r.ctx = ctx;
	if (ctx.partage.tuerPid1 && enMarchePort(c)) conteneurMortPort(h, c, 137, "kill");
	return r;
}
/* Un programme lancé directement (docker exec CONTENEUR ps aux) : sans shell, l'exécutable doit exister. */
function executerArgvPort(h, c, argv, o){
	o = o || {};
	var ctx = contexteShellPort(h, c, o);
	ctx.stdin = o.stdin || null;
	var p = trouverProgrammePort(ctx, argv[0]);
	if (!p && INTEGREES_PORT.indexOf(argv[0]) === -1) return { erreurOci: "exec: \"" + argv[0] + "\": executable file not found in $PATH", code: 127 };
	if (!p) return { erreurOci: "exec: \"" + argv[0] + "\": executable file not found in $PATH", code: 127 };
	var sortie = "", erreurs = "", melee = "";
	ctx.sortir = function(t){ sortie += t; melee += t; };
	ctx.erreur = function(t){ erreurs += t; melee += t; };
	var code;
	try { code = lancerImplementationPort(ctx, implementationPort(p, argv[0]), argv[0], argv.slice(1), p); }
	catch (e){ if (e instanceof ErreurFsPort){ erreurs += argv[0] + ": " + MESSAGES_FS_PORT[e.code] + "\n"; code = 1; } else throw e; }
	if (ctx.exite !== null && ctx.exite !== undefined) code = ctx.exite;
	if (ctx.partage.tuerPid1 && enMarchePort(c)) conteneurMortPort(h, c, 137, "kill");
	return { sortie: sortie, erreurs: erreurs, code: code, melee: melee, ctx: ctx };
}

/* ================================================================== */
/* Les sessions interactives : docker run -it, docker exec -it          */
/* ================================================================== */

var SESSION_PORT = null;
function sessionPort(){ return SESSION_PORT; }
/* Ouvre une session : { h, c, ctx, principale (fermer arrête le conteneur), retirer (--rm), python } */
function ouvrirSessionPort(h, c, o){
	o = o || {};
	var ctx = contexteShellPort(h, c, { user: o.user, userDemande: o.userDemande, env: o.env, cwd: o.cwd, tty: true, interactif: true, sh: o.sh, argv0: o.argv0 });
	ctx.interactif = true;
	ctx.sortir = function(t){ term.echo(String(t).replace(/\n$/, "")); };
	ctx.erreur = function(t){ term.echo(String(t).replace(/\n$/, "")); };
	var pidc = 7 + (c.sessionsOuvertes || []).length * 8;
	c.sessionsOuvertes = (c.sessionsOuvertes || []).concat([{ pidc: o.principale ? 1 : pidc, uid: ctx.user.uid, cmd: o.cmd || (ctx.sh === "bash" ? "bash" : "/bin/sh") }]);
	if (o.principale) c.sessionsOuvertes = c.sessionsOuvertes.filter(function(x){ return x.pidc !== 1; });
	SESSION_PORT = { h: h, id: c.id, ctx: ctx, principale: !!o.principale, retirer: !!o.retirer, python: !!o.python, execId: o.execId || null, pidc: pidc, debut: state.nbCommandes, commandes: 0 };
	evenementPort(h, "session", { action: "ouverte", conteneur: c.nom, id: c.id, principale: !!o.principale, image: c.imageRef });
	return SESSION_PORT;
}
function fermerSessionPort(code){
	var s = SESSION_PORT;
	if (!s) return;
	SESSION_PORT = null;
	var c = etatPort(s.h).conteneurs[s.id];
	if (c){
		c.sessionsOuvertes = (c.sessionsOuvertes || []).filter(function(x){ return x.pidc !== s.pidc; });
		if (s.execId) evenementDockerPort(s.h, "container", "exec_die", c.id, { execID: s.execId, exitCode: String(code || 0), image: c.imageRef, name: c.nom });
		if (s.principale && enMarchePort(c)){
			c.programme.codeArret = code || 0;
			conteneurMortPort(s.h, c, code || 0, "fin");
			if (s.retirer && etatPort(s.h).conteneurs[s.id]) supprimerConteneurPort(s.h, c, true);
		}
	}
	evenementPort(s.h, "session", { action: "fermee", id: s.id, code: code || 0, principale: s.principale, commandes: s.commandes });
}
/* L'invite du shell d'un conteneur : « / # » (busybox), « root@3f2a1b4c5d6e:/app# » (bash), « $ » (dash). */
function inviteSessionPort(){
	var s = SESSION_PORT, ctx = s.ctx, c = etatPort(s.h).conteneurs[s.id];
	if (s.python) return ">>> ";
	var racine = ctx.user.uid === 0, ici = ctx.cwd === (ctx.env.HOME || "/root") ? "~" : ctx.cwd;
	if (ctx.sh === "bash") return (ctx.user.uid === 0 ? "root" : ctx.user.nom) + "@" + ((c && c.config.Hostname) || s.h) + ":" + ici + (racine ? "# " : "$ ");
	if (ctx.sh === "dash") return racine ? "# " : "$ ";
	return (ctx.cwd === "/" ? "/" : (ici === "~" ? "~" : ctx.cwd)) + (racine ? " # " : " $ ");
}
var INVITE_AVANT_PORT = Shell.invite;
Shell.invite = function(){
	if (SESSION_PORT){ try { return inviteSessionPort(); } catch (e){ SESSION_PORT = null; } }
	return INVITE_AVANT_PORT.apply(this, arguments);
};
var EXECUTER_AVANT_PORT = Shell.executer;
Shell.executer = function(ligne){
	if (!SESSION_PORT) return EXECUTER_AVANT_PORT.apply(this, arguments);
	var s = SESSION_PORT;
	var c = estHotePort(s.h) ? etatPort(s.h).conteneurs[s.id] : null;
	if (!c || !enMarchePort(c)){ fermerSessionPort(137); term.echo(C.gris("(Le conteneur s'est arrêté : la session est fermée.)")); term.definirInvite(Shell.invite()); return; }
	if (String(ligne).trim() === ""){ term.definirInvite(Shell.invite()); return; }
	Shell.historique.push(ligne);
	state.nbCommandes++;
	s.commandes++;
	if (typeof compterCommandeCh8 === "function") compterCommandeCh8(1);
	var code = 0;
	try {
		if (s.python) code = lignePythonPort(s, ligne);
		else {
			s.ctx.exite = null;
			s.ctx.ligneNo++;
			var r = executerLignePort(s.ctx, ligne);
			if (r.melee) term.echo(r.melee.replace(/\n$/, ""));
			code = r.code;
			if (s.ctx.partage.tuerPid1){ s.ctx.partage.tuerPid1 = false; if (enMarchePort(c)) conteneurMortPort(s.h, c, 137, "kill"); }
			evenementPort(s.h, "exec", { conteneur: c.nom, id: c.id, ligne: ligne, code: code, sortie: r.sortie, erreurs: r.erreurs, user: s.ctx.user.uid, interactif: true });
			if (s.ctx.exite !== null && s.ctx.exite !== undefined){ var cx = s.ctx.exite; fermerSessionPort(cx); code = cx; }
		}
	} catch (e){
		if (!(e instanceof ShellError)) throw e;
		term.echo(e.message);
	}
	Shell.statut = code;
	Shell.fin();
};
/* Ctrl+D dans la session : comme exit. */
var FIN_DE_SAISIE_AVANT_PORT = Shell.finDeSaisie;
Shell.finDeSaisie = function(){
	if (SESSION_PORT){ term.echo("exit"); fermerSessionPort(0); Shell.fin(); return true; }
	return FIN_DE_SAISIE_AVANT_PORT.apply(this, arguments);
};
/* L'interpréteur Python interactif (docker run -it python:3.12-slim) : juste assez pour en sortir. */
function lignePythonPort(s, ligne){
	var t = String(ligne).trim(), m;
	if (/^(exit|quit)\s*\(\s*\)$/.test(t)){ fermerSessionPort(0); return 0; }
	if ((m = /^print\((["'])(.*)\1\)$/.exec(t))){ term.echo(m[2]); return 0; }
	if ((m = /^import\s+(\w+)/.exec(t))){
		if (MODULES_STANDARD_PORT.indexOf(m[1]) > -1) return 0;
		var c = etatPort(s.h).conteneurs[s.id];
		if (c && moduleInstallePort(s.h, c, m[1])) return 0;
		term.echo("Traceback (most recent call last):\n  File \"<stdin>\", line 1, in <module>\nModuleNotFoundError: No module named '" + m[1] + "'");
		return 1;
	}
	if (/^\d+(\s*[-+*\/]\s*\d+)*$/.test(t)){ try { term.echo(String(Function("return (" + t + ")")())); } catch (e){} return 0; }
	if (t === "exit" || t === "quit"){ term.echo("Use " + t + "() or Ctrl-D (i.e. EOF) to exit"); return 0; }
	term.echo("Traceback (most recent call last):\n  File \"<stdin>\", line 1, in <module>\nNameError: name '" + t.split(/\W/)[0] + "' is not defined");
	return 1;
}
var MODULES_STANDARD_PORT = ["os", "sys", "json", "time", "http", "socket", "pathlib", "logging", "signal", "urllib", "datetime", "re", "random", "hashlib", "threading", "sqlite3", "subprocess", "math", "string", "collections", "itertools", "functools", "typing", "io", "csv", "base64", "uuid", "shutil", "tempfile", "argparse", "secrets", "ssl", "email", "html", "platform"];
/* Un module installé par pip dans l'image (site-packages). */
function moduleInstallePort(h, c, nom){
	var p = "/usr/local/lib/python3.12/site-packages/" + nom;
	return !!entreeConteneurPort(h, c, p) || !!entreeConteneurPort(h, c, p + ".py") || !!entreeConteneurPort(h, c, "/usr/lib/python3/dist-packages/" + nom);
}
