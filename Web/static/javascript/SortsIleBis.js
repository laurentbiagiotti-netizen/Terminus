/**
 * SortsIleBis.js : le moteur des services réseau de l'île, quatrième partie : le partage des fichiers.
 *
 *  - NFS (les Greniers) : /etc/exports et /etc/exports.d (clients : adresse, réseau, nom, joker ; options rw, ro,
 *    sync, async, root_squash, no_root_squash, all_squash, subtree_check...), exportfs (-r, -a, -v, -s, -u), showmount -e,
 *    nfs-server (au démarrage, il charge les exports). Le client : mount -t nfs serveur:/chemin /point, umount, et
 *    mount qui les liste. Un montage est un vrai miroir : ce que le client voit est relu sur le serveur avant chaque
 *    commande, et ce qu'il écrit y repart après. root_squash est réel : sudo sur le client devient nobody sur le serveur.
 *  - autofs (le quai) : auto.master et auto.master.d/*.autofs, les cartes (clé, options, emplacement ; le joker * et &),
 *    le montage à la demande au premier accès à /point/clé.
 *  - Samba (la Halle) : smb.conf ([global], les partages, path, valid users, @groupe, read only, writable, guest ok,
 *    browseable, force group, create mask, directory mask), testparm, smbpasswd (-a, -x, -d, -e), pdbedit (-L, -v, -a),
 *    smbclient (-L, -N, -U nom%phrase, -c "ls; put; get; mkdir; rm; cd", et le mode interactif).
 */

/* ================================================================== */
/* NFS : les exports                                                    */
/* ================================================================== */

var OPTIONS_NFS_ILE = ["rw", "ro", "sync", "async", "root_squash", "no_root_squash", "all_squash", "no_all_squash", "subtree_check", "no_subtree_check",
	"secure", "insecure", "wdelay", "no_wdelay", "hide", "nohide", "crossmnt", "anonuid", "anongid", "fsid", "sec", "mp", "insecure_locks", "no_auth_nlm"];
/* Lire /etc/exports (et exports.d) : { exports: [{ chemin, client, options: {...}, texte }], avertissements, erreurs }. */
function lireExportsIle(h){
	var r = { exports: [], avertissements: [], erreurs: [] };
	var fichiers = [{ chemin: "/etc/exports", texte: lireIle(h, "/etc/exports") || "" }].concat(fichiersDuDossier(h, "/etc/exports.d").filter(function(f){ return /\.exports$/.test(f.nom); }).map(function(f){ return { chemin: f.chemin, texte: f.item.getText() }; }));
	fichiers.forEach(function(f){
		var lignes = f.texte.replace(/\\\n/g, " ").split("\n");
		lignes.forEach(function(brute, i){
			var l = brute.replace(/#.*$/, "").trim();
			if (!l) return;
			var jetons = l.match(/"[^"]*"|\S+/g) || [];
			var chemin = jetons.shift().replace(/^"|"$/g, "");
			if (chemin.charAt(0) !== "/"){ r.erreurs.push("exportfs: " + f.chemin + ":" + (i + 1) + ": bad export path \"" + chemin + "\""); return; }
			if (!jetons.length) jetons = ["*"];
			jetons.forEach(function(j){
				var m = /^([^(]*)(?:\(([^)]*)\))?$/.exec(j);
				if (!m){ r.erreurs.push("exportfs: " + f.chemin + ":" + (i + 1) + ": syntax error: bad option list"); return; }
				var client = m[1], opts = m[2];
				if (!client){
					r.avertissements.push("exportfs: No host name given with " + chemin + " (" + (opts || "") + "), suggest *(" + (opts || "") + ") to avoid warning");
					client = "*";
				}
				var options = { rw: false, sync: true, root_squash: true, all_squash: false, subtree_check: false, secure: true, explicites: [] };
				var vuSync = false, vuSubtree = false, mauvais = null;
				(opts || "").split(",").filter(Boolean).forEach(function(o){
					var k = o.split("=")[0];
					if (OPTIONS_NFS_ILE.indexOf(k) === -1){ mauvais = mauvais || o; return; }
					options.explicites.push(o);
					if (k === "rw") options.rw = true; if (k === "ro") options.rw = false;
					if (k === "sync"){ options.sync = true; vuSync = true; } if (k === "async"){ options.sync = false; vuSync = true; }
					if (k === "root_squash") options.root_squash = true; if (k === "no_root_squash") options.root_squash = false;
					if (k === "all_squash") options.all_squash = true; if (k === "no_all_squash") options.all_squash = false;
					if (k === "subtree_check"){ options.subtree_check = true; vuSubtree = true; } if (k === "no_subtree_check"){ options.subtree_check = false; vuSubtree = true; }
					if (k === "insecure") options.secure = false;
				});
				if (mauvais){ r.erreurs.push("exportfs: " + f.chemin + ":" + (i + 1) + ": unknown keyword \"" + mauvais + "\""); return; }
				if (!vuSubtree) r.avertissements.push("exportfs: " + f.chemin + " [" + (i + 1) + "]: Neither 'subtree_check' or 'no_subtree_check' specified for export \"" + client + ":" + chemin + "\".\n  Assuming default behaviour ('no_subtree_check').\n  NOTE: this default has changed since nfs-utils version 1.0.x\n");
				r.exports.push({ chemin: cheminNormal(chemin), client: client, options: options, fichier: f.chemin, ligne: i + 1, sync: vuSync });
			});
		});
	});
	return r;
}
function etatNfsIle(h){ var e = etatIle(h); if (!e.nfs || typeof e.nfs !== "object") e.nfs = { actifs: [] }; if (!e.nfs.actifs) e.nfs.actifs = []; return e.nfs; }
function nfsTourne(h){ return serviceActifIle(h, "nfs-server"); }
/* Charger les exports (exportfs -r, ou le démarrage de nfs-server) : les chemins absents sont refusés. */
function chargerExportsIle(h, io){
	var r = lireExportsIle(h), sortie = [];
	r.avertissements.forEach(function(a){ sortie.push(a); });
	r.erreurs.forEach(function(e){ sortie.push(e); });
	var bons = r.exports.filter(function(x){
		if (!dossierHote(h, x.chemin)){ sortie.push("exportfs: Failed to stat " + x.chemin + ": No such file or directory"); return false; }
		return true;
	});
	etatNfsIle(h).actifs = copieJson(bons);
	etatNfsIle(h).chargeA = maintenantMachine(h);
	return { sortie: sortie, exports: bons, erreurs: r.erreurs.length };
}
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || e.unite !== "nfs-server.service") return;
	if ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif)){
		var c = chargerExportsIle(e.hote);
		journalIle(e.hote, "exportfs", "nfs-server", c.exports.length ? "Exporting directories for NFS kernel daemon..." : "exportfs: /etc/exports: no exports");
		c.sortie.forEach(function(l){ journalIle(e.hote, "exportfs", "nfs-server", l.split("\n")[0], 4); });
	}
	if (e.cmd === "systemctl" && e.action === "stop") etatNfsIle(e.hote).actifs = [];
});
function texteOptionsNfsIle(o){
	return [o.sync ? "sync" : "async", "wdelay", "hide", o.subtree_check ? "subtree_check" : "no_subtree_check", "sec=sys", o.rw ? "rw" : "ro", o.secure ? "secure" : "insecure", o.root_squash ? "root_squash" : "no_root_squash", o.all_squash ? "all_squash" : "no_all_squash"].join(",");
}
/* Un client correspond-il à une ligne d'export ? (adresse, réseau, nom court ou complet, joker) */
function clientCorrespondIle(spec, hClient){
	var ip = ipIle(hClient);
	if (spec === "*") return true;
	if (/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(spec)) return ipDansReseauIle(ip, spec);
	if (/^\d+\.\d+\.\d+\.\d+$/.test(spec)) return spec === ip;
	var nom = spec.toLowerCase().replace(/\.$/, "");
	if (nom.indexOf("*") > -1 || nom.indexOf("?") > -1){
		var re = new RegExp("^" + nom.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
		return re.test(hClient + "." + DOMAINE_ILE);
	}
	return resoudreHoteIle(nom) === hClient;
}
/* L'export qui autorise ce client pour ce chemin (le plus précis), ou null. */
function exportPourIle(hServeur, chemin, hClient){
	var c = cheminNormal(chemin), bons = etatNfsIle(hServeur).actifs.filter(function(x){ return (c === x.chemin || c.indexOf(x.chemin + "/") === 0) && clientCorrespondIle(x.client, hClient); });
	bons.sort(function(a, b){ return b.chemin.length - a.chemin.length; });
	return bons[0] || null;
}
Shell.sorts.exportfs = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/sbin/exportfs")) throw new ShellError("exportfs: command not found" + (h ? astuce(io, "Le serveur NFS de l'île, ce sont les Greniers : ssh greniers.") : ""), 127);
	var drapeaux = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("").replace(/-/g, "");
	var bavard = drapeaux.indexOf("v") > -1;
	var u = optionIle(args, ["-u"]);
	if (drapeaux.indexOf("r") > -1 || drapeaux.indexOf("a") > -1 || u !== null || args.filter(function(a){ return a.charAt(0) !== "-"; }).length){
		if (!io.sudo) throw new ShellError("exportfs: could not open /var/lib/nfs/.etab.lock for locking: errno 13 (Permission denied)\nexportfs: can't lock /var/lib/nfs/etab for writing" + astuce(io, "Changer ce que les Greniers exportent est réservé à root : sudo exportfs -ra"), 1);
	}
	if (u !== null){
		var p = u.split(":");
		var N = etatNfsIle(h), avant = N.actifs.length;
		N.actifs = N.actifs.filter(function(x){ return !(x.chemin === cheminNormal(p[1] || "") && x.client === p[0]); });
		evenementIle(h, "exportfs", { action: "u", reste: N.actifs.length });
		if (avant === N.actifs.length) throw new ShellError("exportfs: Could not find '" + u + "' to unexport.", 1);
		return "";
	}
	if (drapeaux.indexOf("r") > -1 || drapeaux.indexOf("a") > -1){
		var c = chargerExportsIle(h, io);
		evenementIle(h, "exportfs", { action: "r", exports: c.exports, erreurs: c.erreurs });
		var l = c.sortie.slice();
		if (bavard) c.exports.forEach(function(x){ l.push("exporting " + x.client + ":" + x.chemin); });
		if (c.erreurs) io.code = 1;
		return l.join("\n").replace(/\n+$/, "");
	}
	var actifs = etatNfsIle(h).actifs;
	evenementIle(h, "exportfs", { action: drapeaux.indexOf("s") > -1 ? "s" : "v", exports: actifs });
	if (drapeaux.indexOf("s") > -1) return actifs.map(function(x){ return x.chemin + "  " + x.client + "(" + texteOptionsNfsIle(x.options) + ")"; }).join("\n");
	return actifs.map(function(x){ return completerDroite(x.chemin, 14) + "\t" + x.client + (bavard ? "(" + texteOptionsNfsIle(x.options) + ")" : ""); }).join("\n");
};
Shell.sorts.showmount = function(args, io){
	var h = ileIci();
	if (!h) throw new ShellError("showmount: command not found", 127);
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "localhost";
	var s = resoudreHoteIle(nom);
	if (!s) throw new ShellError("clnt_create: RPC: Unknown host", 1);
	if (!estHoteIle(s) || !nfsTourne(s)){ evenementIle(h, "showmount", { serveur: s, ok: false }); throw new ShellError("clnt_create: RPC: Program not registered", 1); }
	var actifs = etatNfsIle(s).actifs, parChemin = {};
	actifs.forEach(function(x){ (parChemin[x.chemin] = parChemin[x.chemin] || []).push(x.client); });
	evenementIle(h, "showmount", { serveur: s, ok: true, exports: actifs });
	return ["Export list for " + nom + ":"].concat(Object.keys(parChemin).map(function(c){ return completerDroite(c, 11) + parChemin[c].join(","); })).join("\n");
};

/* ================================================================== */
/* NFS : le client (des miroirs fidèles)                                */
/* ================================================================== */

function montagesNfsIle(h){ var e = etatIle(h); if (!e.montagesNfs || !(e.montagesNfs instanceof Array)) e.montagesNfs = []; return e.montagesNfs; }
var VUS_NFS_ILE = typeof WeakSet === "function" ? new WeakSet() : { add: function(){}, has: function(){ return true; } };
var ITEMS_NFS_ILE = typeof WeakMap === "function" ? new WeakMap() : { set: function(){}, get: function(){ return null; } };
/* Synchroniser un arbre (dossiers et fichiers) de src vers dst, sur place. marquer : les nœuds vus (pour le squash). */
function synchroniserArbreIle(src, dst, marquer, montage){
	dst.owner = src.owner; dst.mode = src.mode;
	if (src.groupe !== undefined) dst.groupe = src.groupe; else delete dst.groupe;
	var nomsItems = src.items.map(function(i){ return i.itemname; });
	dst.items.slice().forEach(function(it){ if (nomsItems.indexOf(it.itemname) === -1) dst.removeItem(it); });
	src.items.forEach(function(it){
		var d = dst.getItemFromName(it.itemname);
		if (d === -1){
			d = new Item(it.itemname, it.getText(), (it.picturename || "").replace("./static/img/", "") || "item_sign.gif");
			dst.addItem(d);
		} else if (d.getText() !== it.getText()) d.setText(it.getText());
		d.owner = it.owner; d.mode = it.mode;
		if (it.groupe !== undefined) d.groupe = it.groupe; else delete d.groupe;
		if (it.lien !== undefined) d.lien = it.lien;
		if (it.taille !== undefined) d.taille = it.taille;
		if (marquer){ VUS_NFS_ILE.add(d); ITEMS_NFS_ILE.set(d, montage); }
	});
	var enfantsSrc = src.children.filter(function(c){ return c.parents[0] === src; });
	var noms = enfantsSrc.map(function(c){ return c.room_name; });
	dst.children = dst.children.filter(function(c){ return c.parents[0] !== dst || noms.indexOf(c.room_name) > -1; });
	enfantsSrc.forEach(function(c){
		var d = dst.children.filter(function(x){ return x.parents[0] === dst && x.room_name === c.room_name; })[0];
		if (!d){
			d = new Room(c.room_name, c.intro_text, (c.room_pic || "").replace("./static/img/", "") || "loc_etc.gif");
			if (dst.chapitre) d.chapitre = dst.chapitre;
			link_rooms(dst, d);
		}
		if (marquer) VUS_NFS_ILE.add(d);
		synchroniserArbreIle(c, d, marquer, montage);
	});
}
/* Les nœuds écrits pendant la commande par root, à travers un export root_squash, deviennent ceux de nobody. */
function ecraserRootIle(lieu, montage){
	if (!VUS_NFS_ILE.has(lieu) && lieu.owner === "root") lieu.owner = "nobody";
	lieu.items.forEach(function(it){ if (!VUS_NFS_ILE.has(it) && it.owner === "root"){ it.owner = "nobody"; it.groupe = "nogroup"; } });
	lieu.children.forEach(function(c){ if (c.parents[0] === lieu) ecraserRootIle(c, montage); });
}
function exportDuMontageIle(m, hClient){ return estHoteIle(m.serveur) && nfsTourne(m.serveur) ? exportPourIle(m.serveur, m.chemin, hClient) : null; }
function tirerMontagesIle(h){
	montagesNfsIle(h).forEach(function(m){
		var src = dossierHote(m.serveur, m.chemin), dst = dossierHote(h, m.cible);
		if (!src || !dst || !exportDuMontageIle(m, h)) return;
		dst.nfsMontage = m;
		moteurSeul(function(){ synchroniserArbreIle(src, dst, true, m); });
	});
}
function pousserMontagesIle(h){
	montagesNfsIle(h).forEach(function(m){
		var src = dossierHote(m.serveur, m.chemin), dst = dossierHote(h, m.cible);
		var ex = exportDuMontageIle(m, h);
		if (!src || !dst || !ex) return;
		if (ex.options.root_squash || ex.options.all_squash) ecraserRootIle(dst, m);
		var garde = { owner: src.owner, mode: src.mode };
		moteurSeul(function(){ synchroniserArbreIle(dst, src, false); });
		src.owner = garde.owner; src.mode = garde.mode;
	});
}
/* Le montage NFS d'un nœud du client (le dossier monté, ou un parent), et l'export qui s'applique. */
function montageDeNoeudIle(noeud){
	if (!noeud) return null;
	if (noeud instanceof Item){ var m = ITEMS_NFS_ILE.get(noeud); return m || null; }
	var l = noeud, garde = 0;
	while (l && garde++ < 60){ if (l.nfsMontage) return l.nfsMontage; l = l.parents[0]; }
	return null;
}
var BIT_AVANT_ILE = Shell.bit;
Shell.bit = function(noeud, lettre, io){
	var h = ileIci();
	var m = h && montagesNfsIle(h).length ? montageDeNoeudIle(noeud) : null;
	if (!m) return BIT_AVANT_ILE.apply(this, arguments);
	var ex = exportDuMontageIle(m, h);
	if (!ex) return false;          // Stale file handle : le serveur ne répond plus pour ce montage
	if (lettre === "w" && (!ex.options.rw || /(^|,)ro(,|$)/.test(m.options || ""))) return false;
	var ecrase = ex.options.all_squash || (io && io.sudo && ex.options.root_squash);
	if (!ecrase) return BIT_AVANT_ILE.apply(this, arguments);
	// nobody : les droits du propriétaire s'il possède le nœud, sinon ceux des autres.
	var base = noeud.owner === "nobody" || noeud.owner === "65534" ? 0 : 6;
	var c = noeud.mode.charAt(base + "rwx".indexOf(lettre));
	return c !== "-" && c !== "S" && c !== "T";
};
/* Écrire à travers un montage NFS : quand c'est le squash qui refuse, on le dit. */
var VERIFIER_ECRITURE_AVANT_ILE = Shell.verifierEcriture;
Shell.verifierEcriture = function(lieu, io, cmd, nom){
	var h = ileIci();
	var m = h && montagesNfsIle(h).length ? montageDeNoeudIle(lieu) : null;
	var ex = m ? exportDuMontageIle(m, h) : null;
	if (ex && (!ex.options.rw || /(^|,)ro(,|$)/.test(m.options || "")))
		throw new ShellError(cmd + " : impossible de créer « " + nom + " » : Système de fichiers accessible en lecture seulement\n" +
			C.gris("(Read-only file system : " + m.serveur + " exporte ce dossier en lecture seule (ro), ou il est monté ainsi.)"));
	if (ex && ex.options.rw && (ex.options.all_squash || (io && io.sudo && ex.options.root_squash)) && !Shell.bit(lieu, "w", io))
		throw new ShellError(cmd + " : impossible de créer « " + nom + " » : Permission non accordée\n" +
			C.gris("(Ce dossier vient de " + m.serveur + " par NFS, exporté en " + (ex.options.all_squash ? "all_squash" : "root_squash") + " : là-bas, ton sudo devient nobody, qui n'a pas le droit d'écrire ici. C'est voulu.)"));
	return VERIFIER_ECRITURE_AVANT_ILE.apply(this, arguments);
};
var CHOWN_AVANT_ILE = Shell.sorts.chown;
Shell.sorts.chown = function(args, io){
	var h = ileIci();
	if (h && montagesNfsIle(h).length){
		var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }).slice(1);
		noms.forEach(function(n){
			var r = Shell.chercher(n, io, "chown");
			var m = r.node ? montageDeNoeudIle(r.node instanceof Room ? r.node : r.dir) : null;
			var ex = m ? exportDuMontageIle(m, h) : null;
			if (m && ex && (ex.options.root_squash || ex.options.all_squash)){
				evenementIle(h, "chown-squash", { chemin: n, serveur: m.serveur });
				throw new ShellError("chown: changing ownership of '" + n + "': Operation not permitted" + astuce(io, "Ce dossier vient des Greniers par NFS, avec root_squash : ton sudo y devient nobody. Pour changer un propriétaire, fais-le sur les Greniers eux-mêmes."), 1);
			}
		});
	}
	return CHOWN_AVANT_ILE.apply(this, arguments);
};
/* Monter un export : les contrôles du serveur, puis le miroir. Renvoie null ou un message d'erreur. */
function monterNfsIle(h, source, cible, options, auto){
	var m = /^([^:]+):(\/.*)$/.exec(source);
	if (!m) return "mount.nfs: remote share not in 'host:dir' format";
	var s = resoudreHoteIle(m[1]);
	if (!s) return "mount.nfs: Failed to resolve server " + m[1] + ": Name or service not known";
	if (!estHoteIle(s) || !nfsTourne(s)) return "mount.nfs: Connection refused";
	var chemin = cheminNormal(m[2]);
	var ex = exportPourIle(s, chemin, h);
	if (!ex){ journalIle(s, "rpc.mountd", "nfs-server", "refused mount request from " + ipIle(h) + " for " + chemin + " (/): unmatched host", 4); return "mount.nfs: access denied by server while mounting " + source; }
	if (!dossierHote(s, chemin)) return "mount.nfs: mounting " + source + " failed, reason given by server: No such file or directory";
	var point = dossierHote(h, cible);
	if (!point) return "mount.nfs: mount point " + cible + " does not exist";
	if (montagesNfsIle(h).some(function(x){ return x.cible === cheminNormal(cible); })) return "mount.nfs: " + source + " is busy or already mounted on " + cible;
	// Ce qui était dans le point de montage se cache dessous, comme sur un vrai système.
	point.cacheMontage = { items: point.items.slice(), children: point.children.filter(function(c){ return c.parents[0] === point; }), owner: point.owner, mode: point.mode };
	point.items = [];
	point.children = point.children.filter(function(c){ return c.parents[0] !== point; });
	var montage = { serveur: s, nomServeur: m[1], chemin: chemin, cible: cheminNormal(cible), options: options || "", auto: !!auto, depuis: maintenantMachine(h) };
	montagesNfsIle(h).push(montage);
	point.nfsMontage = montage;
	moteurSeul(function(){ synchroniserArbreIle(dossierHote(s, chemin), point, true, montage); });
	journalIle(s, "rpc.mountd", "nfs-server", "authenticated mount request from " + ipIle(h) + ":" + (700 + state.nbCommandes % 300) + " for " + chemin + " (" + ex.chemin + ")");
	evenementIle(h, "montageNfs", { serveur: s, chemin: chemin, cible: montage.cible, auto: !!auto, options: ex.options });
	return null;
}
function demonterNfsIle(h, cible){
	var c = cheminNormal(cible), l = montagesNfsIle(h), m = l.filter(function(x){ return x.cible === c; })[0];
	if (!m) return false;
	var point = dossierHote(h, c);
	if (point){
		var cache = point.cacheMontage;
		point.items = cache ? cache.items : [];
		point.children = point.children.filter(function(x){ return x.parents[0] !== point; }).concat(cache ? cache.children : []);
		if (cache){ point.owner = cache.owner; point.mode = cache.mode; }
		delete point.cacheMontage;
		delete point.nfsMontage;
	}
	etatIle(h).montagesNfs = l.filter(function(x){ return x !== m; });
	evenementIle(h, "demontageNfs", { cible: c, auto: m.auto });
	return m;
}
function ligneMountNfsIle(h, m){
	var ex = exportDuMontageIle(m, h);
	return m.nomServeur + ":" + m.chemin + " on " + m.cible + " type nfs4 (" + (ex && ex.options.rw && !/(^|,)ro(,|$)/.test(m.options) ? "rw" : "ro") + ",relatime,vers=4.2,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp,timeo=600,retrans=2,sec=sys,clientaddr=" + ipIle(h) + ",local_lock=none,addr=" + ipIle(m.serveur) + ")";
}
var MOUNT_AVANT_ILE = Shell.sorts.mount;
Shell.sorts.mount = function(args, io){
	var h = ileIci();
	if (!h) return MOUNT_AVANT_ILE.apply(this, arguments);
	var type = optionIle(args, ["-t", "--types"]), opts = optionIle(args, ["-o", "--options"]);
	var noms = argumentsIle(args, ["-t", "--types", "-o", "--options"]);
	var nfs = (type && /^nfs/.test(type)) || noms.some(function(n){ return /^[^\/][^:]*:\//.test(n); });
	if (!noms.length){
		var base = MOUNT_AVANT_ILE.apply(this, arguments);
		if (type && !/^nfs/.test(type)) return base;
		var lignes = montagesNfsIle(h).map(function(m){ return ligneMountNfsIle(h, m); });
		evenementIle(h, "mount", { liste: true, nfs: montagesNfsIle(h).length });
		if (type && /^nfs/.test(type)) return lignes.join("\n");
		return [base].concat(lignes).filter(Boolean).join("\n");
	}
	if (!nfs) return MOUNT_AVANT_ILE.apply(this, arguments);
	if (!io.sudo) throw new ShellError("mount.nfs: not running as root" + astuce(io, "sudo mount -t nfs ..."), 32);
	if (!fichierHote(h, "/sbin/mount.nfs")) throw new ShellError("mount: " + (noms[1] || "") + ": bad option; for several filesystems (e.g. nfs, cifs) you might need a /sbin/mount.<type> helper program.", 32);
	if (noms.length < 2) throw new ShellError("mount: " + noms[0] + ": can't find in /etc/fstab.", 1);
	var err = monterNfsIle(h, noms[0], noms[1], opts, false);
	if (err){ evenementIle(h, "montageNfs", { ok: false, erreur: err, source: noms[0] }); throw new ShellError(err, 32); }
	return "";
};
var UMOUNT_AVANT_ILE = Shell.sorts.umount;
Shell.sorts.umount = function(args, io){
	var h = ileIci();
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!h || !noms.length) return UMOUNT_AVANT_ILE.apply(this, arguments);
	var cible = noms[0].charAt(0) === "/" ? cheminNormal(noms[0]) : null;
	var m = montagesNfsIle(h).filter(function(x){ return x.cible === cible || x.nomServeur + ":" + x.chemin === noms[0]; })[0];
	if (!m) return UMOUNT_AVANT_ILE.apply(this, arguments);
	if (!io.sudo) throw new ShellError("umount.nfs4: " + m.cible + ": must be superuser to unmount." + astuce(io, "sudo umount " + m.cible), 32);
	var ici = cheminDuLieuMachine(current_room);
	if (ici && (ici === m.cible || ici.indexOf(m.cible + "/") === 0) && args.indexOf("-l") === -1) throw new ShellError("umount.nfs4: " + m.cible + ": device is busy" + astuce(io, "Tu es toi-même dedans : cd / d'abord."), 32);
	demonterNfsIle(h, m.cible);
	return "";
};

/* ================================================================== */
/* autofs                                                               */
/* ================================================================== */

function lireAutoMasterIle(h){
	var entrees = [];
	var lire = function(texte, fichier){
		String(texte || "").split("\n").forEach(function(l, i){
			var t = l.replace(/#.*$/, "").trim();
			if (!t) return;
			if (/^\+dir:/.test(t)){ var d = t.substring(5); fichiersDuDossier(h, d).filter(function(f){ return /\.autofs$/.test(f.nom); }).forEach(function(f){ lire(f.item.getText(), f.chemin); }); return; }
			if (/^\+/.test(t)) return;
			var c = t.split(/\s+/);
			entrees.push({ point: cheminNormal(c[0]), carte: c[1] || "", options: c.slice(2).join(" "), fichier: fichier, ligne: i + 1 });
		});
	};
	lire(lireIle(h, "/etc/auto.master"), "/etc/auto.master");
	return entrees;
}
function etatAutofsIle(h){ var e = etatIle(h); if (!e.autofs || typeof e.autofs !== "object") e.autofs = { charge: [] }; return e.autofs; }
function autofsTourne(h){ return serviceActifIle(h, "autofs"); }
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || e.unite !== "autofs.service") return;
	if ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif)){
		var l = lireAutoMasterIle(e.hote);
		etatAutofsIle(e.hote).charge = copieJson(l);
		journalIle(e.hote, "automount", "autofs", e.action === "reload" ? "re-reading master map auto.master" : "Starting automounter version 5.1.8, master map auto.master");
		l.forEach(function(x){
			if (!x.carte || x.carte === "-hosts") return;
			var f = x.carte.replace(/^file:/, "");
			if (f.charAt(0) === "/" && lireIle(e.hote, f) === null) journalIle(e.hote, "automount", "autofs", "lookup(file): file map " + f + " not found", 3);
			else journalIle(e.hote, "automount", "autofs", "mounted indirect on " + x.point + " with timeout 300, freq 75 seconds");
		});
	}
	if (e.cmd === "systemctl" && (e.action === "stop" || e.action === "restart")){
		montagesNfsIle(e.hote).filter(function(m){ return m.auto; }).forEach(function(m){ demonterNfsIle(e.hote, m.cible); var d = dossierHote(e.hote, dossierDe(m.cible)); if (d){ var c = d.getChildFromName(nomDe(m.cible)); if (c !== -1 && !c.items.length) d.children = d.children.filter(function(x){ return x !== c; }); } });
	}
});
/* La ligne d'une carte pour une clé : { options, emplacement } ; le joker * et l'esperluette (la clé). */
function entreeCarteIle(h, carte, cle){
	var f = carte.replace(/^file:/, "");
	var texte = lireIle(h, f);
	if (texte === null) return null;
	var trouve = null, joker = null;
	texte.split("\n").forEach(function(l){
		var t = l.replace(/#.*$/, "").trim();
		if (!t) return;
		var c = t.split(/\s+/), k = c[0], options = "", emplacement;
		if (c[1] && c[1].charAt(0) === "-"){ options = c[1].substring(1); emplacement = c[2]; } else emplacement = c[1];
		var e = { options: options, emplacement: emplacement };
		if (k === cle && !trouve) trouve = e;
		if (k === "*" && !joker) joker = e;
	});
	var r = trouve || joker;
	if (!r || !r.emplacement) return null;
	return { options: r.options.replace(/&/g, cle), emplacement: r.emplacement.replace(/&/g, cle), joker: !trouve };
}
/* Un accès à un chemin : si autofs gère son point, la clé est montée. Renvoie le montage, ou null. */
function declencherAutofsIle(h, chemin){
	if (!autofsTourne(h)) return null;
	var c = cheminNormal(chemin);
	var charge = etatAutofsIle(h).charge || [];
	for (var i = 0; i < charge.length; i++){
		var x = charge[i];
		if (c.indexOf(x.point + "/") !== 0) continue;
		var cle = c.substring(x.point.length + 1).split("/")[0];
		if (!cle) continue;
		var cible = x.point + "/" + cle;
		if (montagesNfsIle(h).some(function(m){ return m.cible === cible; })) return null;
		var e = entreeCarteIle(h, x.carte, cle);
		if (!e){ journalIle(h, "automount", "autofs", "key \"" + cle + "\" not found in map source(s).", 4); evenementIle(h, "autofs", { cle: cle, ok: false, raison: "carte" }); return null; }
		var type = (/fstype=(\w+)/.exec(e.options) || [])[1] || "nfs";
		if (!/^nfs/.test(type)) return null;
		var dejaLa = dossierHote(h, cible);
		if (!dejaLa) moteurSeul(function(){ creerDossierHote(h, cible, { mode: "rwxr-xr-x" }); });
		var err = monterNfsIle(h, e.emplacement, cible, e.options.replace(/fstype=\w+,?/, ""), true);
		if (err){
			if (!dejaLa) moteurSeul(function(){ var d = dossierHote(h, x.point); var k = d ? d.getChildFromName(cle) : -1; if (k !== -1) d.children = d.children.filter(function(z){ return z !== k; }); });
			journalIle(h, "automount", "autofs", ">> " + err, 3);
			journalIle(h, "automount", "autofs", "mount(nfs): nfs: mount failure " + e.emplacement + " on " + cible, 3);
			evenementIle(h, "autofs", { cle: cle, ok: false, raison: "montage", erreur: err });
			return null;
		}
		journalIle(h, "automount", "autofs", "mounted " + e.emplacement + " on " + cible);
		evenementIle(h, "autofs", { cle: cle, ok: true, cible: cible, source: e.emplacement });
		return cible;
	}
	return null;
}
/* Avant chaque commande sur une machine de l'île : autofs regarde les chemins tapés, et les montages se relisent. */
var APPELER_AVANT_ILE_NFS = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var h = ileIci();
	if (!h) return APPELER_AVANT_ILE_NFS.apply(this, arguments);
	try {
		if (autofsTourne(h) && (etatAutofsIle(h).charge || []).length){
			(args || []).forEach(function(a){
				if (typeof a !== "string") return;
				var p = a.replace(/^[^=]*=(?=\/)/, "");
				if (/^~[a-z]/.test(p)){ var u = comptePourIle(h, p.substring(1).split("/")[0]); if (u && u.home) p = u.home + p.substring(1 + p.substring(1).split("/")[0].length); }
				if (p.charAt(0) === "/") declencherAutofsIle(h, p);
			});
			var ici = cheminDuLieuMachine(current_room);
			if (ici) declencherAutofsIle(h, ici);
		}
		if (montagesNfsIle(h).length) tirerMontagesIle(h);
	} catch (e){ if (!(e instanceof ShellError)) throw e; }
	try { return APPELER_AVANT_ILE_NFS.apply(this, arguments); }
	finally { if (montagesNfsIle(h).length) pousserMontagesIle(h); }
};

/* Une redirection (echo ... > /mnt/fichier) s'écrit après le sort : à la fin de la ligne, on repousse aussi les montages. */
var EXECUTER_AVANT_ILE_NFS = Shell.executer;
Shell.executer = function(ligne){
	try { return EXECUTER_AVANT_ILE_NFS.apply(this, arguments); }
	finally {
		try { var h = ileIci(); if (h && montagesNfsIle(h).length) pousserMontagesIle(h); } catch (e){ /* le miroir ne casse jamais une ligne */ }
	}
};

/* ================================================================== */
/* Samba : smb.conf et testparm                                         */
/* ================================================================== */

var PARAMS_SAMBA_ILE = ["workgroup", "server string", "server role", "netbios name", "log file", "max log size", "logging", "panic action", "obey pam restrictions",
	"unix password sync", "passwd program", "passwd chat", "pam password change", "map to guest", "usershare allow guests", "security", "passdb backend",
	"interfaces", "bind interfaces only", "hosts allow", "hosts deny", "log level", "server min protocol", "client min protocol", "smb encrypt", "server signing", "guest account",
	"comment", "path", "valid users", "invalid users", "read only", "writable", "writeable", "write list", "read list", "guest ok", "public", "guest only", "browseable", "browsable",
	"force group", "force user", "create mask", "create mode", "directory mask", "directory mode", "force create mode", "force directory mode", "inherit permissions", "hide dot files",
	"veto files", "printable", "available", "admin users", "follow symlinks", "wide links", "vfs objects", "recycle:repository", "max connections", "dns proxy", "load printers", "printing", "printcap name", "disable spoolss"];
var BOOLEENS_SAMBA_ILE = { yes: true, true: true, 1: true, no: false, false: false, 0: false };
function lireSmbConfIle(h){
	var r = { sections: {}, ordre: [], inconnus: [], erreurs: [] }, cour = null;
	(lireIle(h, "/etc/samba/smb.conf") || "").split("\n").forEach(function(l, i){
		var t = l.trim();
		if (!t || /^[#;]/.test(t)) return;
		var s = /^\[([^\]]+)\]$/.exec(t);
		if (s){ cour = s[1].trim().toLowerCase(); if (!r.sections[cour]){ r.sections[cour] = { _nom: s[1].trim() }; r.ordre.push(cour); } return; }
		var kv = /^([^=]+?)\s*=\s*(.*)$/.exec(t);
		if (!kv){ r.erreurs.push("Ignoring badly formed line in configuration file: " + t); return; }
		var k = kv[1].trim().toLowerCase().replace(/\s+/g, " ");
		if (PARAMS_SAMBA_ILE.indexOf(k) === -1){ r.inconnus.push(kv[1].trim()); return; }
		if (k === "writeable" || k === "writable"){ k = "read only"; kv[2] = BOOLEENS_SAMBA_ILE[kv[2].trim().toLowerCase()] ? "no" : "yes"; }
		if (k === "public") k = "guest ok";
		if (k === "browsable") k = "browseable";
		if (k === "create mode") k = "create mask";
		if (k === "directory mode") k = "directory mask";
		if (!cour){ cour = "global"; r.sections.global = r.sections.global || { _nom: "global" }; }
		r.sections[cour][k] = kv[2].trim();
	});
	return r;
}
function boolSambaIle(v, defaut){ if (v === undefined) return defaut; var b = BOOLEENS_SAMBA_ILE[String(v).toLowerCase()]; return b === undefined ? defaut : b; }
Shell.sorts.testparm = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/testparm")) throw new ShellError("testparm: command not found" + (h ? astuce(io, "Samba est installé sur la Halle : ssh halle.") : ""), 127);
	var c = lireSmbConfIle(h), err = [];
	err.push("Load smb config files from /etc/samba/smb.conf");
	c.inconnus.forEach(function(k){ err.push("Unknown parameter encountered: \"" + k + "\"", "Ignoring unknown parameter \"" + k + "\""); });
	c.erreurs.forEach(function(e){ err.push(e); });
	err.push("Loaded services file OK.", "Weak crypto is allowed by GnuTLS (e.g. NTLM as a compatibility fallback)", "");
	var g = c.sections.global || {};
	err.push("Server role: " + ((g["server role"] || "standalone server") === "standalone server" ? "ROLE_STANDALONE" : "ROLE_" + (g["server role"] || "").toUpperCase().replace(/ /g, "_")), "");
	var partages = c.ordre.filter(function(s){ return s !== "global"; });
	partages.forEach(function(s){
		var p = c.sections[s];
		if (p.path && !dossierHote(h, p.path)) err.push("WARNING: The \"path\" " + p.path + " of share [" + p._nom + "] does not exist.");
		if (boolSambaIle(p["guest ok"], false) && p["read only"] && !boolSambaIle(p["read only"], true)) err.push("WARNING: share [" + p._nom + "] is writable and allows guest access.");
	});
	if (args.indexOf("-s") === -1) err.push("Press enter to see a dump of your service definitions", "");
	io.err(err.join("\n"));
	var dump = ["# Global parameters", "[global]"];
	Object.keys(g).filter(function(k){ return k !== "_nom"; }).sort().forEach(function(k){ dump.push("\t" + k + " = " + g[k]); });
	partages.forEach(function(s){
		dump.push("", "", "[" + c.sections[s]._nom + "]");
		Object.keys(c.sections[s]).filter(function(k){ return k !== "_nom"; }).sort().forEach(function(k){
			var v = c.sections[s][k];
			if (BOOLEENS_SAMBA_ILE[String(v).toLowerCase()] !== undefined) v = BOOLEENS_SAMBA_ILE[String(v).toLowerCase()] ? "Yes" : "No";
			dump.push("\t" + k + " = " + v);
		});
	});
	evenementIle(h, "testparm", { ok: !c.inconnus.length && !c.erreurs.length, inconnus: c.inconnus, partages: partages });
	return dump.join("\n");
};

/* ================================================================== */
/* Samba : les comptes (smbpasswd, pdbedit)                             */
/* ================================================================== */

function etatSambaIle(h){ var e = etatIle(h); if (!e.samba || typeof e.samba !== "object") e.samba = { comptes: {} }; if (!e.samba.comptes) e.samba.comptes = {}; return e.samba; }
function exigerHalleIle(io, cmd){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/smbpasswd")) throw new ShellError(cmd + ": command not found" + (h ? astuce(io, "Samba est installé sur la Halle : ssh halle.") : ""), 127);
	return h;
}
function ajouterCompteSambaIle(h, nom, io, phrase, phrase2, sortie){
	if (phrase !== phrase2){ return "Mismatch - password unchanged.\nUnable to get new password."; }
	var u = comptePourIle(h, nom);
	if (!u){ evenementIle(h, "smbpasswd", { action: "a", compte: nom, ok: false }); return "Failed to add entry for user " + nom + "."; }
	var S = etatSambaIle(h), neuf = !S.comptes[nom];
	S.comptes[nom] = { mdp: phrase, actif: true, uid: u.uid };
	evenementIle(h, "smbpasswd", { action: "a", compte: nom, ok: true, sss: !!u.sss });
	return sortie || (neuf ? "Added user " + nom + "." : "");
}
Shell.sorts.smbpasswd = function(args, io){
	var h = exigerHalleIle(io, "smbpasswd");
	if (!io.sudo) throw new ShellError("Old SMB password:\nMachine " + h + " rejected the password change: Error was : NT_STATUS_NO_SUCH_USER." + astuce(io, "Les comptes Samba se gèrent en root : sudo smbpasswd -a nom"), 1);
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var S = etatSambaIle(h);
	if (args.indexOf("-x") > -1){
		if (!S.comptes[nom]) throw new ShellError("Failed to find entry for user " + nom + ".\nFailed to delete entry for user " + nom + ".", 1);
		delete S.comptes[nom];
		evenementIle(h, "smbpasswd", { action: "x", compte: nom, ok: true });
		return "Deleted user " + nom + ".";
	}
	if (args.indexOf("-d") > -1 || args.indexOf("-e") > -1){
		if (!S.comptes[nom]) throw new ShellError("Failed to find entry for user " + nom + ".", 1);
		S.comptes[nom].actif = args.indexOf("-e") > -1;
		evenementIle(h, "smbpasswd", { action: args.indexOf("-e") > -1 ? "e" : "d", compte: nom, ok: true });
		return (S.comptes[nom].actif ? "Enabled" : "Disabled") + " user " + nom + ".";
	}
	if (!nom) throw new ShellError("Usage: smbpasswd [options] [username]", 1);
	if (args.indexOf("-a") === -1 && !S.comptes[nom]) throw new ShellError("Failed to find entry for user " + nom + "." + astuce(io, "Pour créer le compte Samba : sudo smbpasswd -a " + nom), 1);
	var lire = args.indexOf("-s") > -1 && io.stdin !== null;
	if (lire){ var l = io.stdin.split("\n"); return ajouterCompteSambaIle(h, nom, io, l[0], l[1] === undefined ? l[0] : l[1]); }
	if (!io.tty || !term || !term.demander) throw new ShellError("smbpasswd: no terminal", 1);
	term.demander("New SMB password:", true, function(a){
		term.demander("Retype new SMB password:", true, function(b){
			var s = ajouterCompteSambaIle(h, nom, io, a, b);
			if (s) term.echo(s);
			Shell.fin();
		});
	});
	return "";
};
Shell.sorts.pdbedit = function(args, io){
	var h = exigerHalleIle(io, "pdbedit");
	if (!io.sudo) throw new ShellError("Unable to open passdb database: tdbsam_open: Failed to open /var/lib/samba/private/passdb.tdb: Permission denied" + astuce(io, "sudo pdbedit -L"), 1);
	var S = etatSambaIle(h);
	var nom = optionIle(args, ["-a", "-u", "-x"]) || args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (args.indexOf("-x") > -1){ if (!S.comptes[nom]) throw new ShellError("Username not found!", 1); delete S.comptes[nom]; return ""; }
	if (args.indexOf("-a") > -1){
		if (!io.tty || !term || !term.demander) throw new ShellError("pdbedit: no terminal", 1);
		term.demander("new password:", true, function(a){ term.demander("retype new password:", true, function(b){ var s = ajouterCompteSambaIle(h, nom, io, a, b, "Unix username:        " + nom + "\nNT username:\nAccount Flags:        [U          ]"); if (s) term.echo(s); Shell.fin(); }); });
		return "";
	}
	evenementIle(h, "pdbedit", { liste: Object.keys(S.comptes) });
	var noms = Object.keys(S.comptes).sort();
	if (args.indexOf("-v") > -1) return noms.map(function(n){ var u = comptePourIle(h, n); return "---------------\nUnix username:        " + n + "\nNT username:\nAccount Flags:        [" + (S.comptes[n].actif ? "U          " : "DU         ") + "]" + "\nUser SID:             S-1-5-21-" + hexDe("sid" + n, 8) + "\nPrimary Group SID:    S-1-5-21-513\nFull Name:            " + (u ? u.gecos : "") + "\nHome Directory:       \\\\" + h.toUpperCase() + "\\" + n; }).join("\n");
	return noms.map(function(n){ var u = comptePourIle(h, n); return n + ":" + (u ? u.uid : S.comptes[n].uid) + ":" + (u ? u.gecos : ""); }).join("\n");
};

/* ================================================================== */
/* Samba : smbclient                                                    */
/* ================================================================== */

/* Les groupes d'un compte vu de la Halle : son groupe principal et ceux dont il est membre (fichiers et annuaire). */
function groupesCompteIle(h, u){
	var l = [];
	var gp = groupesMachine(h).filter(function(g){ return g.gid === u.gid; })[0] || chercherSssIle(h, "gid", u.gid);
	if (gp) l.push(gp.nom);
	groupesMachine(h).forEach(function(g){ if (g.membres.indexOf(u.nom) > -1 && l.indexOf(g.nom) === -1) l.push(g.nom); });
	groupesSssDeIle(h, u.nom).forEach(function(g){ if (l.indexOf(g.nom) === -1) l.push(g.nom); });
	return l;
}
/* Les droits Unix d'un compte (pas forcément le joueur) sur un nœud de la Halle. */
function droitUnixIle(h, noeud, u, groupes, lettre){
	if (!u) return false;
	if (u.uid === 0) return true;
	var rang = "rwx".indexOf(lettre);
	var proprio = noeud.owner === u.nom || noeud.owner === String(u.uid);
	var g = groupeNoeud(h, noeud);
	var base = proprio ? 0 : (groupes.indexOf(g) > -1 || groupes.indexOf(nomGroupeAfficheIle(h, g)) > -1 ? 3 : 6);
	var c = noeud.mode.charAt(base + rang);
	return c !== "-" && c !== "S" && c !== "T";
}
function partageSambaIle(h, nom){
	var c = lireSmbConfIle(h), s = c.sections[String(nom).toLowerCase()];
	if (!s || nom.toLowerCase() === "global") return null;
	return { nom: s._nom, path: s.path || "", lecture: boolSambaIle(s["read only"], true), invite: boolSambaIle(s["guest ok"], false), visible: boolSambaIle(s.browseable, true),
		valides: (s["valid users"] || "").split(/[\s,]+/).filter(Boolean), invalides: (s["invalid users"] || "").split(/[\s,]+/).filter(Boolean),
		ecriture: (s["write list"] || "").split(/[\s,]+/).filter(Boolean), forceGroupe: s["force group"] || null, masque: s["create mask"] || "0744", masqueDossier: s["directory mask"] || "0755", commentaire: s.comment || "" };
}
function dansListeSambaIle(liste, u, groupes){
	return liste.some(function(x){ var y = x.replace(/^[@+&]+/, ""); return x.charAt(0) === "@" || x.charAt(0) === "+" ? groupes.indexOf(y) > -1 : y === u.nom; });
}
function modeDepuisMasqueIle(base, masque){
	var m = parseInt(masque, 8) & base, s = "";
	for (var i = 8; i >= 0; i--) s += (m & (1 << i)) ? "rwxrwxrwx".charAt(8 - i) : "-";
	return s;
}
function dateSmbIle(h, ms){ var d = dateIle(h, ms); return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + d.getFullYear(); }
/* Une session : { serveur, compte (ou null en invité), partage, dossier courant } ; ou une erreur. */
function ouvrirSessionSmbIle(hClient, serveurNom, partage, nom, phrase, invite){
	var s = resoudreHoteIle(serveurNom);
	if (!s) return { erreur: "do_connect: Connection to " + serveurNom + " failed (Error NT_STATUS_UNSUCCESSFUL)" };
	if (!estHoteIle(s) || !fichierHote(s, "/usr/sbin/smbd") || !serviceActifIle(s, "smbd")) return { erreur: "do_connect: Connection to " + serveurNom + " failed (Error NT_STATUS_CONNECTION_REFUSED)" };
	var u = null;
	if (!invite){
		var S = etatSambaIle(s).comptes[nom];
		u = comptePourIle(s, nom);
		if (S && !S.actif && S.mdp === phrase && u){
			journalIle(s, "smbd", "smbd", "  check_ntlm_password:  Authentication for user [" + nom + "] -> [" + nom + "] FAILED with error NT_STATUS_ACCOUNT_DISABLED", 4);
			evenementIle(s, "smbSession", { compte: nom, ok: false, depuis: hClient });
			return { erreur: "session setup failed: NT_STATUS_ACCOUNT_DISABLED" };
		}
		if (!S || !S.actif || S.mdp !== phrase || !u){
			journalIle(s, "smbd", "smbd", "  check_ntlm_password:  Authentication for user [" + nom + "] -> [" + nom + "] FAILED with error NT_STATUS_" + (S ? "WRONG_PASSWORD" : "NO_SUCH_USER"), 4);
			evenementIle(s, "smbSession", { compte: nom, ok: false, depuis: hClient });
			return { erreur: "session setup failed: NT_STATUS_LOGON_FAILURE" };
		}
	}
	var sess = { serveur: s, compte: u, invite: invite, partage: null, dossier: "" };
	if (!partage) return sess;
	var p = partageSambaIle(s, partage);
	if (p && p.path && !dossierHote(s, p.path)){ journalIle(s, "smbd", "smbd", "make_connection_snum: '" + p.path + "' does not exist or permission denied when connecting to [" + p.nom + "] Error was No such file or directory", 3); return { erreur: "tree connect failed: NT_STATUS_BAD_NETWORK_NAME" }; }
	if (!p || !p.path) return { erreur: "tree connect failed: NT_STATUS_BAD_NETWORK_NAME" };
	if (invite && !p.invite){ evenementIle(s, "smbPartage", { partage: p.nom, invite: true, ok: false, depuis: hClient }); return { erreur: "tree connect failed: NT_STATUS_ACCESS_DENIED" }; }
	if (u){
		var groupes = groupesCompteIle(s, u);
		if ((p.valides.length && !dansListeSambaIle(p.valides, u, groupes)) || dansListeSambaIle(p.invalides, u, groupes)){
			journalIle(s, "smbd", "smbd", "  user '" + u.nom + "' (from session setup) not permitted to access this share (" + p.nom + ")", 4);
			evenementIle(s, "smbPartage", { partage: p.nom, compte: u.nom, ok: false, depuis: hClient });
			return { erreur: "tree connect failed: NT_STATUS_ACCESS_DENIED" };
		}
		sess.groupes = groupes;
	}
	if (invite) sess.compte = { nom: "nobody", uid: 65534, gid: 65534 }, sess.groupes = ["nogroup"];
	sess.partage = p;
	journalIle(s, "smbd", "smbd", "  " + hClient + " (ipv4:" + ipIle(hClient) + ":" + (40000 + state.nbCommandes % 9999) + ") connect to service " + p.nom + " initially as user " + sess.compte.nom + " (uid=" + sess.compte.uid + ", gid=" + sess.compte.gid + ") (pid " + (3000 + state.nbCommandes % 999) + ")");
	evenementIle(s, "smbPartage", { partage: p.nom, compte: sess.compte.nom, invite: !!invite, ok: true, depuis: hClient });
	return sess;
}
function cheminSmbIle(sess, rel){
	var base = sess.partage.path, morceaux = (sess.dossier ? sess.dossier.split("\\").filter(Boolean) : []);
	String(rel || "").replace(/\//g, "\\").split("\\").forEach(function(m){ if (!m || m === ".") return; if (m === "..") morceaux.pop(); else morceaux.push(m); });
	return { serveur: base + (morceaux.length ? "/" + morceaux.join("/") : ""), smb: "\\" + morceaux.join("\\") + (morceaux.length ? "" : "") };
}
function commandeSmbIle(hClient, sess, ligne, io){
	var s = sess.serveur, mots = ligne.trim().match(/"[^"]*"|\S+/g) || [], cmd = (mots[0] || "").toLowerCase();
	mots = mots.map(function(m){ return m.replace(/^"|"$/g, ""); });
	var p = sess.partage, u = sess.compte, gr = sess.groupes || [];
	if (!cmd) return "";
	if (cmd === "exit" || cmd === "quit" || cmd === "q") return null;
	if (cmd === "help" || cmd === "?") return "?              allinfo        altname        archive        backup\nblocksize      cancel         case_sensitive cd             chmod\nchown          close          del            deltree        dir\ndu             echo           exit           get            getfacl\nhardlink       help           history        iosize         lcd\nlink           lock           lowercase      ls             l\nmask           md             mget           mkdir          more\nmput           newer          notify         open           posix\nput            pwd            q              queue          quit\nrd             recurse        reget          rename         rm\nrmdir          showacls       setea          setmode        stat\ntar            tarmode        timeout        translate      unlock\nvolume         vuid           wdel           logon          listconnect\nshowconnect    tcon           tdis           tid            utimes\nlogoff         ..             !";
	if (cmd === "pwd") return "Current directory is \\\\" + s + "\\" + p.nom + "\\" + sess.dossier;
	if (cmd === "cd"){
		var c = cheminSmbIle(sess, mots[1] || "");
		var d = dossierHote(s, c.serveur);
		if (!d) return "cd " + c.smb + ": NT_STATUS_OBJECT_NAME_NOT_FOUND";
		if (!droitUnixIle(s, d, u, gr, "x")) return "cd " + c.smb + ": NT_STATUS_ACCESS_DENIED";
		sess.dossier = c.smb.replace(/^\\/, "");
		return "";
	}
	if (cmd === "ls" || cmd === "dir" || cmd === "l"){
		var c2 = cheminSmbIle(sess, mots[1] || ""), d2 = dossierHote(s, c2.serveur);
		if (!d2) return "NT_STATUS_NO_SUCH_FILE listing " + c2.smb + "\\*";
		if (!droitUnixIle(s, d2, u, gr, "r")) return "NT_STATUS_ACCESS_DENIED listing " + c2.smb + "\\*";
		var t = dateSmbIle(s, maintenantMachine(s) - 3600000);
		var l = ["  " + completerDroite(".", 36) + "D        0  " + t, "  " + completerDroite("..", 36) + "D        0  " + t];
		d2.children.filter(function(x){ return x.parents[0] === d2; }).forEach(function(x){ l.push("  " + completerDroite(x.room_name, 36) + "D        0  " + t); });
		d2.items.forEach(function(x){ l.push("  " + completerDroite(x.itemname, 36) + "A" + completerGauche(String(x.getText() || "").length, 9) + "  " + t); });
		evenementIle(s, "smbLs", { partage: p.nom, compte: u.nom, dossier: c2.serveur, depuis: hClient, nombre: d2.items.length });
		return l.join("\n") + "\n\n\t\t32896880 blocks of size 1024. 28467860 blocks available";
	}
	if (cmd === "mkdir" || cmd === "md"){
		var c3 = cheminSmbIle(sess, mots[1] || ""), parent = dossierHote(s, dossierDe(c3.serveur));
		if (!mots[1] || !parent) return "NT_STATUS_OBJECT_PATH_NOT_FOUND making remote directory " + c3.smb;
		if (p.lecture || !droitUnixIle(s, parent, u, gr, "w")) return "NT_STATUS_ACCESS_DENIED making remote directory " + c3.smb;
		if (dossierHote(s, c3.serveur)) return "NT_STATUS_OBJECT_NAME_COLLISION making remote directory " + c3.smb;
		moteurSeul(function(){ creerDossierHote(s, c3.serveur, { owner: u.nom, mode: modeDepuisMasqueIle(511, p.masqueDossier) }); });
		return "";
	}
	if (cmd === "put"){
		if (!mots[1]) return "put <filename> [<remote name>]";
		var local;
		try { local = Shell.objetLisible(mots[1], io, "smbclient"); }
		catch (e){ return mots[1] + " does not exist"; }
		var c4 = cheminSmbIle(sess, mots[2] || nomDe(mots[1])), dossier = dossierHote(s, dossierDe(c4.serveur));
		if (!dossier) return "NT_STATUS_OBJECT_PATH_NOT_FOUND opening remote file " + c4.smb;
		var existe = fichierHote(s, c4.serveur);
		if (p.lecture || !droitUnixIle(s, existe || dossier, u, gr, "w")) return "NT_STATUS_ACCESS_DENIED opening remote file " + c4.smb;
		var texte = local.item.getText();
		moteurSeul(function(){
			var it = poserFichierHote(s, c4.serveur, texte, {});
			if (!existe){
				it.owner = u.nom; it.mode = modeDepuisMasqueIle(438, p.masque);
				var g = p.forceGroupe || ((dossier.mode.charAt(5) === "s" || dossier.mode.charAt(5) === "S") ? groupeNoeud(s, dossier) : (gr[0] || u.nom));
				it.groupe = g;
			}
		});
		evenementIle(s, "smbPut", { partage: p.nom, compte: u.nom, fichier: c4.serveur, depuis: hClient });
		return "putting file " + mots[1] + " as " + c4.smb + " (" + (texte.length / 1024 / 0.3).toFixed(1) + " kb/s) (average " + (texte.length / 1024 / 0.3).toFixed(1) + " kb/s)";
	}
	if (cmd === "get" || cmd === "more"){
		if (!mots[1]) return "get <filename> [localname]";
		var c5 = cheminSmbIle(sess, mots[1]), it5 = fichierHote(s, c5.serveur);
		if (!it5) return "NT_STATUS_OBJECT_NAME_NOT_FOUND opening remote file " + c5.smb;
		if (!droitUnixIle(s, it5, u, gr, "r")) return "NT_STATUS_ACCESS_DENIED opening remote file " + c5.smb;
		evenementIle(s, "smbGet", { partage: p.nom, compte: u.nom, fichier: c5.serveur, depuis: hClient });
		if (cmd === "more") return it5.getText();
		var nomLocal = mots[2] || nomDe(c5.serveur);
		ecrireFichier(nomLocal, it5.getText(), io, "smbclient");
		var n = String(it5.getText()).length;
		return "getting file " + c5.smb + " of size " + n + " as " + nomLocal + " (" + (n / 1024 / 0.01).toFixed(1) + " KiloBytes/sec) (average " + (n / 1024 / 0.01).toFixed(1) + " KiloBytes/sec)";
	}
	if (cmd === "rm" || cmd === "del"){
		var c6 = cheminSmbIle(sess, mots[1] || ""), it6 = fichierHote(s, c6.serveur), dos = dossierHote(s, dossierDe(c6.serveur));
		if (!it6) return "NT_STATUS_NO_SUCH_FILE deleting remote file " + c6.smb;
		if (p.lecture || !droitUnixIle(s, dos, u, gr, "w")) return "NT_STATUS_ACCESS_DENIED deleting remote file " + c6.smb;
		moteurSeul(function(){ dos.removeItem(it6); });
		return "";
	}
	return cmd + ": command not found";
}
var SMBCLIENT_AVANT_ILE = Shell.sorts.smbclient;
Shell.sorts.smbclient = function(args, io){
	var h = ileIci();
	var cible = args.filter(function(a){ return /^\/\//.test(a) || /^\\\\/.test(a); })[0];
	var lister = optionIle(args, ["-L"]);
	var nomServeur = lister ? lister.replace(/^\/\/|^\\\\/, "").split(/[\/\\]/)[0] : (cible ? cible.replace(/^\/\/|^\\\\/, "").split(/[\/\\]/)[0] : null);
	if (!h || !nomServeur || !estHoteIle(resoudreHoteIle(nomServeur) || "")) return SMBCLIENT_AVANT_ILE.apply(this, arguments);
	if (!fichierHote(h, "/usr/bin/smbclient")) throw new ShellError("smbclient: command not found" + astuce(io, "smbclient est installé sur quai et sur halle."), 127);
	var partage = cible && !lister ? cible.replace(/^\/\/|^\\\\/, "").split(/[\/\\]/)[1] : null;
	var commandes = optionIle(args, ["-c", "--command"]);
	var U = optionIle(args, ["-U", "--user"]), invite = args.indexOf("-N") > -1 || args.indexOf("--no-pass") > -1;
	var nom = JOUEUR, phrase = null;
	if (U !== null){ var mm = /^(?:[^\\\/]+[\\\/])?([^%]*)(?:%(.*))?$/.exec(U); nom = mm[1]; if (mm[2] !== undefined) phrase = mm[2]; invite = false; }
	function travailler(ph){
		var anonyme = invite || (U === null && !ph);
		var sess = ouvrirSessionSmbIle(h, nomServeur, partage, nom, ph, anonyme);
		if (sess.erreur){ evenementIle(h, "smbclient", { ok: false, erreur: sess.erreur, partage: partage, compte: anonyme ? null : nom }); throw new ShellError(sess.erreur + (/LOGON_FAILURE/.test(sess.erreur) ? astuce(io, "Le compte doit exister pour Samba (sudo smbpasswd -a NOM, sur la Halle), avec ce mot de passe-là.") : (/ACCESS_DENIED/.test(sess.erreur) ? astuce(io, "Le partage existe, mais te refuse : valid users, guest ok, et les groupes du compte (id NOM, sur la Halle) disent pourquoi.") : "")), 1); }
		var pre = anonyme ? "Anonymous login successful\n" : "";
		if (lister){
			var c = lireSmbConfIle(sess.serveur);
			var l = ["\tSharename       Type      Comment", "\t---------       ----      -------"];
			c.ordre.filter(function(x){ return x !== "global" && boolSambaIle(c.sections[x].browseable, true); }).forEach(function(x){ l.push("\t" + completerDroite(c.sections[x]._nom, 16) + "Disk      " + (c.sections[x].comment || "")); });
			l.push("\tIPC$            IPC       IPC Service (Samba 4.17.12-Debian)", "SMB1 disabled -- no workgroup available");
			evenementIle(h, "smbclient", { ok: true, liste: true, compte: anonyme ? null : nom });
			return pre + l.join("\n");
		}
		evenementIle(h, "smbclient", { ok: true, partage: partage, compte: sess.compte.nom, invite: anonyme });
		if (commandes !== null){
			var sorties = [];
			commandes.split(";").some(function(cmd){ var r = commandeSmbIle(h, sess, cmd, io); if (r === null) return true; if (r) sorties.push(r); return false; });
			return pre + sorties.join("\n");
		}
		if (!io.tty || !term || !term.demander) return pre;
		term.echo(pre + "Try \"help\" to get a list of possible commands.");
		var boucle = function(){
			term.demander("smb: \\" + sess.dossier + (sess.dossier ? "\\" : "") + "> ", false, function(ligne){
				var r;
				try { r = commandeSmbIle(h, sess, ligne, io); } catch (e){ r = e.message; }
				if (r === null){ Shell.fin(); return; }
				if (r) term.echo(r);
				boucle();
			});
		};
		boucle();
		return "";
	}
	if (phrase !== null || invite || lister && U === null && args.indexOf("-N") > -1) return travailler(phrase);
	if (!io.tty || !term || !term.demander) return travailler(null);
	term.demander("Password for [WORKGROUP\\" + nom + "]:", true, function(r){
		var s;
		try { s = travailler(r); if (s) term.echo(s); } catch (e){ if (e instanceof ShellError){ term.echo(e.message); io.code = 1; } else throw e; }
		if (commandes !== null || lister || !io.tty) Shell.fin();
	});
	return "";
};
