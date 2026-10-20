/**
 * CommandesCyber.js : les sorts du chapitre 2 qui servent à enquêter sur une intrusion.
 *
 * Fichiers et empreintes : strings, file, xxd, md5sum, sha1sum, stat, chattr, lsattr, gzip,
 * gunzip, zcat, gpg. Textes : sed, awk, tr, rev, tee. Système : uname, dmesg, which,
 * journalctl, last, who, lsof, pgrep, pkill, systemctl, userdel, usermod, groups, visudo.
 * Réseau : ip, traceroute, dig, nmap, nc, curl, ufw, scp, ssh-copy-id. Éditeur : vim.
 *
 * Les données des machines (ports, journaux, services...) sont décrites dans Reseau.js.
 * Tous ces sorts existent sous Linux, avec les mêmes options courantes.
 */

/* ------------------------------------------------------------------ */
/* Outils communs                                                      */
/* ------------------------------------------------------------------ */

/* La machine où se trouve le joueur, et ce qu'on sait d'elle. */
function infoHote(nom){
	return (typeof HOTES !== "undefined" && HOTES[nom || Shell.hote()]) || {};
}

/* Le lieu racine d'une machine du réseau de l'école (/), ou null. */
function racineDe(lieu){
	var l = lieu, garde = 0;
	while (l && garde++ < 100){
		if (l.racineHote) return l;
		l = l.parents[0];
	}
	return null;
}

/* Le chemin tel qu'un vrai terminal l'afficherait : /var/log sur une machine du réseau. */
Shell.cheminAffiche = function(lieu){
	var racine = racineDe(lieu);
	if (!racine) return lieu.path();
	var morceaux = [], l = lieu, garde = 0;
	while (l && l !== racine && garde++ < 100){
		morceaux.unshift(l.room_name);
		l = l.parents[0];
	}
	return "/" + morceaux.join("/");
};

/* Les processus de la machine courante : tous ceux de ses lieux, ou ceux du lieu ici. */
Shell.procsDeLHote = function(){
	var racine = racineDe(current_room);
	// La Citadelle est une seule machine, de sa grande salle jusqu'à la Racine : ss et ps y voient tous ses processus, kill aussi.
	if (!racine && typeof Citadelle !== "undefined"){
		for (var l = current_room, garde = 0; l && garde++ < 100; l = l.parents[0]){ if (l === Citadelle){ racine = Citadelle; break; } }
	}
	if (!racine) return current_room.procs.map(function(p){ return { proc: p, lieu: current_room }; });
	var liste = [];
	(function parcourir(lieu){
		lieu.procs.forEach(function(p){ liste.push({ proc: p, lieu: lieu }); });
		lieu.children.forEach(parcourir);
	})(racine);
	return liste;
};

/* Un objet immuable (chattr +i) refuse toute modification, même à root. */
Shell.verifierImmuable = function(item, cmd){
	if (item && item.immuable){
		throw new ShellError(cmd + " : impossible de modifier « " + item.itemname + " » : Opération non permise\n" +
			C.gris("(Cet objet porte l'attribut i, « immuable » : même root ne peut ni le modifier ni le supprimer. lsattr le montre, sudo chattr -i le retire.)"));
	}
};

/* Le texte à traiter : les objets nommés, ou l'entrée standard. */
function texteEntree(args, io, cmd){
	if (args.length === 0){
		if (io.stdin === null) throw new ShellError(cmd + " : il faut un objet, ou un texte arrivant par un tuyau. Tape man " + cmd + ".");
		return io.stdin;
	}
	return args.map(function(nom){ return Shell.objetLisible(nom, io, cmd).item.getText(); }).join("\n");
}

/* Un octet par caractère : le texte en UTF-8 précédé de la signature du format. */
function octetsDe(item){
	var signature = [];
	if (item.binaire) signature = [0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00];
	else if (item.gzip) signature = [0x1f, 0x8b, 0x08, 0x00];
	else if (item.format === "png") signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	var corps = versOctetsUtf8(item.binaire || item.gzip || item.format === "png" ?
		item.getText().replace(/^\u007fELF\u0002\u0001\u0001/, "") : contenuExact(item.getText(), item.sansFinDeLigne));
	return signature.concat(corps);
}

/* ------------------------------------------------------------------ */
/* MD5 et SHA-1 (les vrais algorithmes, comme md5sum et sha1sum)       */
/* ------------------------------------------------------------------ */

function md5(texte){
	var octets = versOctetsUtf8(texte);
	var n = octets.length;
	var bits = n * 8;
	octets.push(0x80);
	while (octets.length % 64 !== 56) octets.push(0);
	for (var b = 0; b < 8; b++) octets.push(b < 4 ? (bits >>> (8 * b)) & 255 : 0);
	var s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
		4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
	var K = [];
	for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
	var a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
	for (var bloc = 0; bloc < octets.length; bloc += 64){
		var M = [];
		for (var j = 0; j < 16; j++){
			var k = bloc + j * 4;
			M[j] = octets[k] | (octets[k + 1] << 8) | (octets[k + 2] << 16) | (octets[k + 3] << 24);
		}
		var A = a0, B = b0, Cc = c0, D = d0;
		for (var t = 0; t < 64; t++){
			var F, g;
			if (t < 16){ F = (B & Cc) | (~B & D); g = t; }
			else if (t < 32){ F = (D & B) | (~D & Cc); g = (5 * t + 1) % 16; }
			else if (t < 48){ F = B ^ Cc ^ D; g = (3 * t + 5) % 16; }
			else { F = Cc ^ (B | ~D); g = (7 * t) % 16; }
			F = (F + A + K[t] + M[g]) | 0;
			A = D; D = Cc; Cc = B;
			B = (B + ((F << s[t]) | (F >>> (32 - s[t])))) | 0;
		}
		a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + Cc) | 0; d0 = (d0 + D) | 0;
	}
	return [a0, b0, c0, d0].map(function(v){
		var h = "";
		for (var i = 0; i < 4; i++) h += ("0" + ((v >>> (8 * i)) & 255).toString(16)).slice(-2);
		return h;
	}).join("");
}

function sha1(texte){
	var octets = versOctetsUtf8(texte);
	var bits = octets.length * 8;
	octets.push(0x80);
	while (octets.length % 64 !== 56) octets.push(0);
	var haut = Math.floor(bits / 4294967296), bas = bits >>> 0;
	octets.push((haut >>> 24) & 255, (haut >>> 16) & 255, (haut >>> 8) & 255, haut & 255);
	octets.push((bas >>> 24) & 255, (bas >>> 16) & 255, (bas >>> 8) & 255, bas & 255);
	var h = [0x67452301, 0xEFCDAB89 | 0, 0x98BADCFE | 0, 0x10325476, 0xC3D2E1F0 | 0];
	var w = new Array(80);
	function rotg(x, n){ return (x << n) | (x >>> (32 - n)); }
	for (var bloc = 0; bloc < octets.length; bloc += 64){
		for (var t = 0; t < 16; t++){
			var j = bloc + t * 4;
			w[t] = (octets[j] << 24) | (octets[j + 1] << 16) | (octets[j + 2] << 8) | octets[j + 3];
		}
		for (t = 16; t < 80; t++) w[t] = rotg(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
		var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4];
		for (t = 0; t < 80; t++){
			var f, k;
			if (t < 20){ f = (b & c) | (~b & d); k = 0x5A827999; }
			else if (t < 40){ f = b ^ c ^ d; k = 0x6ED9EBA1; }
			else if (t < 60){ f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC | 0; }
			else { f = b ^ c ^ d; k = 0xCA62C1D6 | 0; }
			var temp = (rotg(a, 5) + f + e + k + w[t]) | 0;
			e = d; d = c; c = rotg(b, 30); b = a; a = temp;
		}
		h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0;
	}
	return h.map(function(v){ return ("00000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
}

/* md5sum et sha1sum fonctionnent comme sha256sum : même affichage, même -c. */
function sortEmpreinte(nom, fonction){
	return function(args, io){
		var verifier = args.indexOf("-c") > -1 || args.indexOf("--check") > -1;
		var objets = args.filter(function(a){ return a.charAt(0) !== "-"; });
		if (!verifier){
			if (objets.length === 0){
				if (io.stdin === null) throw new ShellError(nom + " : de quoi veux-tu l'empreinte ? Utilisation : " + nom + " OBJET");
				return fonction(contenuExact(io.stdin, io.stdinSansFin)) + "  -";
			}
			var lignes = [];
			objets.forEach(function(o){
				try {
					var t = Shell.objetLisible(o, io, nom);
					lignes.push(fonction(contenuExact(t.item.getText(), t.item.sansFinDeLigne)) + "  " + o);
					GameEvents.fire({ type: "empreinte", algo: nom, item: t.item });
				} catch (e){
					if (!(e instanceof ShellError)) throw e;
					io.err(e.message);
				}
			});
			return lignes.join("\n");
		}
		var liste = objets.length ? Shell.objetLisible(objets[0], io, nom).item.getText() : io.stdin;
		if (liste === null) throw new ShellError(nom + " -c : quelle liste d'empreintes ?");
		var resultats = [], echecs = 0;
		lignesDe(liste).forEach(function(l){
			var m = /^([0-9a-fA-F]+) [ *](.+)$/.exec(l.trim());
			if (!m) return;
			try {
				var t = Shell.objetLisible(m[2].trim(), io, nom);
				var ok = fonction(contenuExact(t.item.getText(), t.item.sansFinDeLigne)) === m[1].toLowerCase();
				resultats.push(m[2].trim() + (ok ? ": OK" : ": ÉCHEC"));
				if (!ok) echecs++;
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				resultats.push(m[2].trim() + " : IMPOSSIBLE DE LIRE");
				echecs++;
			}
		});
		if (echecs) io.errFin(nom + " : AVERTISSEMENT : " + echecs + " somme(s) de contrôle ne correspond(ent) PAS");
		return resultats.join("\n");
	};
}
Shell.sorts.md5sum = sortEmpreinte("md5sum", md5);
Shell.sorts.sha1sum = sortEmpreinte("sha1sum", sha1);

/* ------------------------------------------------------------------ */
/* Examiner des fichiers                                               */
/* ------------------------------------------------------------------ */

Shell.sorts.strings = function(args, io){
	var p = lireOptions(args, "n", "strings", "n");
	var mini = p.opts.n ? parseInt(p.opts.n, 10) : 4;
	if (isNaN(mini) || mini < 1) throw new ShellError("strings : -n attend un nombre");
	var textes = p.reste.length ? p.reste.map(function(nom){ return Shell.objetLisible(nom, io, "strings").item.getText(); }) : [texteEntree([], io, "strings")];
	var sortie = [];
	textes.forEach(function(t){
		var re = new RegExp("[ -~]{" + mini + ",}", "g"), m;
		while ((m = re.exec(t)) !== null) sortie.push(m[0]);
	});
	GameEvents.fire({ type: "strings", text: sortie.join("\n"), room: current_room });
	return sortie.join("\n");
};

/* Le type d'un objet, deviné à partir de son contenu, comme le fait file. */
function typeDe(item){
	if (item.binaire) return "ELF 64-bit LSB executable, x86-64, dynamically linked" + (item.mode.charAt(2) === "s" ? ", setuid" : "");
	if (item.gzip) return "gzip compressed data, was \"" + (item.gzip.nom || item.itemname.replace(/\.gz$/, "")) + "\"";
	if (item.gpg) return "PGP message, symmetric encryption";
	if (item.format === "png") return "PNG image data, 640 x 480, 8-bit/color RGBA";
	if (item.format === "tar" || item.archive) return "POSIX tar archive";
	var t = item.getText();
	if (t === "") return "empty";
	if (/^#!/.test(t)) return t.indexOf("python") > -1 ? "Python script, ASCII text executable" : "POSIX shell script, ASCII text executable";
	if (/^-----BEGIN OPENSSH PRIVATE KEY/.test(t)) return "OpenSSH private key";
	if (/^ssh-ed25519 /.test(t)) return "OpenSSH ED25519 public key";
	if (/^<!DOCTYPE html|^<html/i.test(t)) return "HTML document, UTF-8 Unicode text";
	return /[^\x00-\x7f]/.test(t) ? "UTF-8 Unicode text" : "ASCII text";
}

Shell.sorts.file = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (noms.length === 0) throw new ShellError("file : quel objet faut-il examiner ? Utilisation : file OBJET");
	return noms.map(function(nom){
		var r = Shell.chercher(nom, io, "file");
		if (r.node === null) return nom + ": cannot open `" + nom + "' (No such file or directory)";
		if (r.node instanceof Room) return nom + ": directory";
		if (r.node.lien) return nom + ": symbolic link to " + r.node.lien;
		if (r.node.person) return nom + ": un être vivant, très peu coopératif avec file";
		GameEvents.fire({ type: "file", item: r.node, room: r.dir });
		return nom + ": " + typeDe(r.node);
	}).join("\n");
};

Shell.sorts.xxd = function(args, io){
	var p = lireOptions(args, "l", "xxd", "l");
	if (p.reste.length !== 1) throw new ShellError("xxd : quel objet ? Utilisation : xxd OBJET (ou xxd -l 32 OBJET pour les 32 premiers octets)");
	var item = Shell.objetLisible(p.reste[0], io, "xxd").item;
	var octets = octetsDe(item);
	var limite = p.opts.l ? parseInt(p.opts.l, 10) : 256;
	if (isNaN(limite) || limite < 1) throw new ShellError("xxd : -l attend un nombre d'octets");
	var coupe = octets.length > limite;
	octets = octets.slice(0, limite);
	var lignes = [];
	for (var i = 0; i < octets.length; i += 16){
		var morceau = octets.slice(i, i + 16), hex = "", ascii = "";
		for (var j = 0; j < 16; j++){
			hex += j < morceau.length ? ("0" + morceau[j].toString(16)).slice(-2) : "  ";
			if (j % 2 === 1) hex += " ";
			if (j < morceau.length) ascii += morceau[j] >= 32 && morceau[j] < 127 ? String.fromCharCode(morceau[j]) : ".";
		}
		lignes.push(("0000000" + i.toString(16)).slice(-8) + ": " + hex + " " + ascii);
	}
	if (coupe && io.tty && !p.opts.l) lignes.push(C.gris("(… " + "la suite est coupée : xxd -l N affiche les N premiers octets)"));
	GameEvents.fire({ type: "xxd", item: item });
	return lignes.join("\n");
};

/* La date de modification d'un objet, pour stat et find -mtime. */
function dateModification(item){
	var age = item.age === undefined ? 40 : item.age;
	var d = new Date(Date.now() - age * 86400000);
	return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + (item.heure || "09:00") + ":00";
}

Shell.sorts.stat = function(args, io){
	if (args.length === 0) throw new ShellError("stat : quel objet ? Utilisation : stat OBJET");
	return args.map(function(nom){
		var r = Shell.chercher(nom, io, "stat");
		if (r.node === null) throw new ShellError(Shell.introuvable("stat", r.name, r.dir));
		var n = r.node, lieu = n instanceof Room;
		var mode = (lieu ? "d" : (n.lien ? "l" : "-")) + n.mode;
		var taille = lieu ? 4096 : versOctetsUtf8(contenuExact(n.getText ? n.getText() : "", n.sansFinDeLigne)).length;
		GameEvents.fire({ type: "stat", item: n });
		return "  Fichier : " + nom + "\n" +
			"   Taille : " + taille + "\tType : " + (lieu ? "répertoire" : (n.lien ? "lien symbolique" : "fichier")) + "\n" +
			"   Accès : (" + ("0" + modeEnNombre(n.mode).toString(8)).slice(-4) + "/" + mode + ")  UID : (" +
			(UTILISATEURS[n.owner] !== undefined ? UTILISATEURS[n.owner] : 1000) + "/" + n.owner + ")\n" +
			"Modifié : " + (lieu ? dateModification({ age: 40 }) : dateModification(n));
	}).join("\n");
};

Shell.sorts.chattr = function(args, io){
	if (args.length < 2 || !/^[+-]i$/.test(args[0])) throw new ShellError("chattr : utilisation ici : chattr +i OBJET (rendre immuable) ou chattr -i OBJET");
	if (!io.sudo) throw new ShellError("chattr : Opération non permise\n" + C.gris("(Seul root peut changer les attributs : sudo chattr ...)"));
	return args.slice(1).map(function(nom){
		var r = Shell.chercher(nom, io, "chattr");
		if (r.node === null) throw new ShellError(Shell.introuvable("chattr", r.name, r.dir));
		if (r.node instanceof Room) throw new ShellError("chattr : " + nom + " : ici, on ne change les attributs que des objets");
		r.node.immuable = args[0] === "+i";
		GameEvents.fire({ type: "chattr", item: r.node, immuable: r.node.immuable, room: r.dir });
		return "";
	}).filter(Boolean).join("\n");
};

Shell.sorts.lsattr = function(args, io){
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var objets = [];
	if (cibles.length === 0){
		current_room.items.forEach(function(i){ if (args.indexOf("-a") > -1 || !i.isHidden()) objets.push({ nom: i.itemname, item: i }); });
	} else {
		cibles.forEach(function(nom){
			var r = Shell.chercher(nom, io, "lsattr");
			if (r.node === null) throw new ShellError(Shell.introuvable("lsattr", r.name, r.dir));
			if (r.node instanceof Room) r.node.items.forEach(function(i){ objets.push({ nom: nom.replace(/\/$/, "") + "/" + i.itemname, item: i }); });
			else objets.push({ nom: nom, item: r.node });
		});
	}
	GameEvents.fire({ type: "lsattr" });
	return objets.filter(function(o){ return !o.item.person; }).map(function(o){
		return (o.item.immuable ? "----i---------e-------" : "--------------e-------") + " " + o.nom;
	}).join("\n");
};

/* ------------------------------------------------------------------ */
/* Compresser                                                          */
/* ------------------------------------------------------------------ */

function brouiller(texte, sel){
	var signes = "ÿþ¤§¶ÐØßæ.:;=+<>?";
	var sortie = "";
	for (var i = 0; i < Math.max(24, Math.floor(texte.length / 3)); i++){
		sortie += signes.charAt(Math.floor(alea(sel + ":" + i + ":" + texte.length) * signes.length));
		if (i % 64 === 63) sortie += "\n";
	}
	return sortie;
}

Shell.sorts.gzip = function(args, io){
	var p = lireOptions(args, "dk", "gzip");
	if (p.opts.d) return Shell.sorts.gunzip(p.reste, io);
	if (p.reste.length === 0) throw new ShellError("gzip : quel objet compresser ? Utilisation : gzip OBJET");
	return p.reste.map(function(nom){
		var t = Shell.objetLisible(nom, io, "gzip");
		var item = t.item;
		if (item.gzip) throw new ShellError("gzip : " + nom + " a déjà le suffixe .gz -- inchangé");
		if (item.owner !== JOUEUR && !io.sudo) throw new ShellError("gzip : " + nom + " : Permission non accordée");
		Shell.verifierImmuable(item, "gzip");
		Shell.verifierEcriture(t.room, io, "gzip", item.itemname + ".gz");
		item.gzip = { contenu: item.getText(), nom: item.itemname };
		item.setText(brouiller(item.getText(), "gzip"));
		item.itemname = item.itemname + ".gz";
		GameEvents.fire({ type: "gzip", item: item, compresse: true });
		return "";
	}).filter(Boolean).join("\n");
};

Shell.sorts.gunzip = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (noms.length === 0) throw new ShellError("gunzip : quel objet décompresser ? Utilisation : gunzip OBJET.gz");
	return noms.map(function(nom){
		var t = Shell.objetLisible(nom, io, "gunzip");
		var item = t.item;
		if (!item.gzip) throw new ShellError("gunzip : " + nom + " : not in gzip format");
		if (!/\.gz$/.test(item.itemname)) throw new ShellError("gunzip : " + nom + " : unknown suffix -- ignored\n" + C.gris("(gunzip veut un nom en .gz. Pour lire une archive gzip qui porte un autre nom : zcat " + nom + ")"));
		if (item.owner !== JOUEUR && !io.sudo) throw new ShellError("gunzip : " + nom + " : Permission non accordée");
		var nouveau = item.itemname.replace(/\.gz$/, "");
		if (t.room.getNode(nouveau) !== null) throw new ShellError("gunzip : " + nouveau + " existe déjà");
		item.setText(item.gzip.contenu);
		delete item.gzip;
		item.itemname = nouveau;
		GameEvents.fire({ type: "gzip", item: item, compresse: false });
		return "";
	}).filter(Boolean).join("\n");
};

Shell.sorts.zcat = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (noms.length === 0) throw new ShellError("zcat : quelle archive lire ? Utilisation : zcat OBJET.gz");
	var sortie = noms.map(function(nom){
		var t = Shell.objetLisible(nom, io, "zcat");
		if (!t.item.gzip) throw new ShellError("zcat : " + nom + " : not in gzip format");
		GameEvents.fire({ type: "read", item: t.item, room: t.room, cmd: "zcat", text: t.item.gzip.contenu, sudo: !!io.sudo });
		return t.item.gzip.contenu.replace(/\n$/, "");
	});
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* Transformer du texte : sed, awk, tr, rev, tee                       */
/* ------------------------------------------------------------------ */

/* sed, awk, tr, rev et tee sont dans Texte.js et Awk.js, chargés après ce fichier. */

Shell.sorts.which = function(args, io){
	var sortie = [];
	args.forEach(function(nom){
		if (SORTS_DU_JEU.indexOf(nom) > -1) io.err("which : " + nom + " est un sort du jeu, pas un programme du système");
		else if (Shell.sorts.hasOwnProperty(nom) && state.knows(nom)) sortie.push((["sudo", "passwd", "ping", "su"].indexOf(nom) > -1 ? "/usr/bin/" : (["ls", "cat", "cp", "mv", "rm", "mkdir", "rmdir", "echo", "pwd", "chmod", "chown", "date", "df", "ps", "kill", "bash", "tar", "gzip", "gunzip", "zcat", "sed", "uname", "dmesg", "ip", "nano", "vim"].indexOf(nom) > -1 ? "/bin/" : "/usr/bin/")) + nom);
		else if (state.paquets[nom]) sortie.push("/usr/games/" + nom);
	});
	GameEvents.fire({ type: "which", names: args });
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* Le système                                                          */
/* ------------------------------------------------------------------ */

Shell.sorts.uname = function(args, io){
	var h = infoHote(), nom = Shell.hote();
	var noyau = h.noyau || "6.1.0-cybersup";
	GameEvents.fire({ type: "uname", host: nom });
	if (args.indexOf("-a") > -1) return "Linux " + nom + " " + noyau + " #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux";
	if (args.indexOf("-r") > -1) return noyau;
	if (args.indexOf("-n") > -1) return nom;
	return "Linux";
};

Shell.sorts.dmesg = function(args, io){
	if (!io.sudo) throw new ShellError("dmesg : read kernel buffer failed: Operation not permitted\n" + C.gris("(Le journal du noyau est réservé à root : sudo dmesg)"));
	var lignes = (infoHote().dmesg || ["[    0.000000] Linux version 6.1.0-cybersup", "[    1.204511] systemd[1]: Started Journal Service."]).slice();
	GameEvents.fire({ type: "dmesg", host: Shell.hote() });
	return lignes.join("\n");
};

/* Le journal du système (journalctl), lu sur la machine courante. */
Shell.sorts.journalctl = function(args, io){
	var unite = null, n = null, depuis = null, inverse = false;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-u") unite = args[++i];
		else if (args[i] === "-n") n = parseInt(args[++i], 10);
		else if (args[i] === "--since") depuis = args[++i];
		else if (args[i] === "-r") inverse = true;
		else if (/^-n\d+$/.test(args[i])) n = parseInt(args[i].substring(2), 10);
		else throw new ShellError("journalctl : option « " + args[i] + " » inconnue ici. Celles qui existent : -u SERVICE, -n NOMBRE, --since HH:MM, -r");
	}
	if (!io.sudo) return "Aucune entrée visible. " + C.gris("(Le journal du système est réservé à root et au groupe adm : sudo journalctl)");
	var entrees = (infoHote().journal || []).filter(function(e){
		if (unite && e.unite.replace(/\.service$/, "") !== unite.replace(/\.service$/, "")) return false;
		if (depuis && e.heure < depuis.replace(/^.*\s/, "")) return false;
		return true;
	});
	if (n !== null && !isNaN(n)) entrees = entrees.slice(-n);
	if (inverse) entrees = entrees.slice().reverse();
	GameEvents.fire({ type: "journalctl", host: Shell.hote(), unite: unite, depuis: depuis, lignes: entrees.map(function(e){ return e.message; }).join("\n") });
	if (entrees.length === 0) return "-- No entries --";
	return entrees.map(function(e){
		// Une entrée datée (t, en millisecondes) garde son jour : après minuit, la nuit du Bastion passe au lendemain.
		var j = e.t ? (function(d){ return [d.getFullYear(), deuxChiffres(d.getMonth() + 1), deuxChiffres(d.getDate())]; })(new Date(e.t)) : dateDuJour().split("-");
		return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+j[1] - 1] + " " + j[2] + " " + e.heure + ":" + (e.secondes || "00") + " " + Shell.hote() + " " + e.unite + ": " + e.message;
	}).join("\n");
};

Shell.sorts.last = function(args, io){
	var n = null, qui = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-n") n = parseInt(args[++i], 10);
		else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].substring(1), 10);
		else qui = args[i];
	}
	var lignes = (typeof infoHote().last === "function" ? infoHote().last() : (infoHote().last || [])).filter(function(l){ return !qui || l.qui === qui; });
	if (n) lignes = lignes.slice(0, n);
	GameEvents.fire({ type: "last", host: Shell.hote(), qui: qui });
	return lignes.map(function(l){
		return completerDroite(l.qui, 10) + completerDroite(l.tty, 8) + completerDroite(l.depuis, 16) + l.quand;
	}).concat(["", "wtmp begins " + (function(){ var d = new Date(); d.setDate(d.getDate() - 7); return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()); })()]).join("\n");
};

Shell.sorts.who = function(args, io){
	var sessions = typeof infoHote().sessions === "function" ? infoHote().sessions() : [];
	sessions = [{ qui: JOUEUR, tty: "pts/0", depuis: "(" + ((HOTES[Shell.pile_ssh.length ? "cybersup" : Shell.hote()] || {}).ip || "10.0.0.1") + ")" }].concat(sessions);
	GameEvents.fire({ type: "who", host: Shell.hote(), sessions: sessions });
	var sortie = sessions.map(function(s){
		return completerDroite(s.qui, 10) + completerDroite(s.tty, 8) + dateDuJour() + " " + (s.heure || "09:12") + " " + s.depuis;
	}).join("\n");
	// Sur le labo, une fois le Corbeau chassé, who ne le montre plus : last garde la trace de sa session et de son adresse.
	if (io && io.tty && Shell.hote() === "labo" && state.quests && state.quests["c_labo"] && !state.quests["c_parefeu"] && !sessions.some(function(s){ return s.qui === "corbeau"; })){
		sortie += "\n" + C.gris("(Le Corbeau n'est plus connecté : who ne montre que les sessions ouvertes. last montre aussi les sessions passées, et d'où elles venaient.)");
	}
	return sortie;
};

/* Les fichiers et les connexions ouverts par les processus (lsof). */
Shell.sorts.lsof = function(args, io){
	var port = null, pid = null, toutReseau = false;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-i"){
			var suite = args[i + 1];
			if (suite && /^(tcp)?:\d+$/i.test(suite)){ port = suite.replace(/^tcp/i, "").substring(1); i++; }
			else toutReseau = true;
		}
		else if (/^-i:\d+$/.test(args[i])) port = args[i].substring(3);
		else if (args[i] === "-p") pid = parseInt(args[++i], 10);
		else throw new ShellError("lsof : option « " + args[i] + " » inconnue ici. Exemples : lsof -i :6666, lsof -i, lsof -p PID");
	}
	if (port === null && pid === null && !toutReseau) throw new ShellError("lsof : sans filtre, lsof liste des milliers de fichiers. Essaie lsof -i (le réseau) ou lsof -p PID");
	var lignes = [completerDroite("COMMAND", 16) + completerGauche("PID", 6) + " " + completerDroite("USER", 10) + "NAME"];
	var cachees = 0;
	Shell.procsDeLHote().forEach(function(e){
		var p = e.proc;
		if (pid !== null && p.pid !== pid) return;
		var fichiers = (p.fichiers || []).filter(function(f){
			if (port !== null) return f.indexOf(":" + port + " ") > -1 || f.indexOf(":" + port + "->") > -1 || new RegExp(":" + port + "$").test(f);
			if (toutReseau) return /^TCP|^UDP/.test(f);
			return true;
		});
		if (fichiers.length === 0) return;
		if (p.owner !== JOUEUR && !io.sudo){ cachees++; return; }
		fichiers.forEach(function(f){ lignes.push(completerDroite(p.name.substring(0, 15), 16) + completerGauche(p.pid, 6) + " " + completerDroite(p.owner, 10) + f); });
	});
	GameEvents.fire({ type: "lsof", port: port, pid: pid, sortie: lignes.slice(1).join("\n"), sudo: !!io.sudo });
	if (lignes.length === 1){
		return cachees && io.tty ? C.gris("(Rien de visible : ce que tu cherches appartient à root. sudo lsof ...)") : "";
	}
	return lignes.join("\n");
};

function procsCorrespondants(args, cmd){
	var utilisateur = null, motif = null, liste = false, complet = false, ligneEntiere = false;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-u") utilisateur = args[++i];
		else if (args[i] === "-l") liste = true;
		else if (args[i] === "-a"){ liste = true; ligneEntiere = true; }
		else if (/^-[la]+$/.test(args[i])){ liste = true; if (args[i].indexOf("a") > -1) ligneEntiere = true; }
		else if (args[i] === "-f") complet = true;
		else if (/^-(9|KILL|15|TERM)$/.test(args[i])) continue;
		else if (args[i].charAt(0) === "-") throw new ShellError(cmd + " : option « " + args[i] + " » inconnue ici. Celles qui existent : -u UTILISATEUR, -l, -a" + (cmd === "pkill" ? ", -9" : ""));
		else motif = args[i];
	}
	if (motif === null && utilisateur === null) throw new ShellError(cmd + " : quel processus ? Utilisation : " + cmd + " NOM (ou -u UTILISATEUR)");
	var re = motif === null ? null : new RegExp(motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	return {
		liste: liste, ligneEntiere: ligneEntiere,
		procs: Shell.procsDeLHote().filter(function(e){
			if (utilisateur !== null && e.proc.owner !== utilisateur) return false;
			return re === null || re.test(e.proc.name) || (complet && re.test(e.proc.commande || ""));
		})
	};
}

Shell.sorts.pgrep = function(args, io){
	var r = procsCorrespondants(args, "pgrep");
	GameEvents.fire({ type: "pgrep", count: r.procs.length });
	// -l : le nom court du processus (comme ps) ; -a : sa ligne de commande entière.
	function nomCourt(n){ n = String(n); return n.charAt(0) === "[" ? n : n.replace(/^-/, "").split(/[:\s]/)[0]; }
	return r.procs.map(function(e){ return r.liste ? e.proc.pid + " " + (r.ligneEntiere ? e.proc.name : nomCourt(e.proc.name)) : String(e.proc.pid); }).join("\n");
};

Shell.sorts.pkill = function(args, io){
	var r = procsCorrespondants(args, "pkill");
	var force = args.some(function(a){ return /^-(9|KILL)$/.test(a); });
	if (r.procs.length === 0) return "";
	// Un par un : tuer une session emporte parfois ses processus enfants avec elle.
	return r.procs.map(function(e){
		if (e.lieu.procs.indexOf(e.proc) === -1) return "";
		return Shell.sorts.kill((force ? ["-9"] : []).concat([String(e.proc.pid)]), io);
	}).filter(function(x){ return x; }).join("\n");
};

/* Les services de la machine (systemctl). */
Shell.sorts.systemctl = function(args, io){
	var maintenant = args.indexOf("--now") > -1;
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0] || "list-units", nom = mots[1];
	var hote = Shell.hote(), services = infoHote().services || {};
	if (action === "list-units" || action === "list-unit-files"){
		var lignes = [completerDroite("UNIT", 28) + completerDroite("LOAD", 8) + completerDroite("ACTIVE", 10) + "DESCRIPTION"];
		Object.keys(services).forEach(function(n){
			var s = services[n];
			lignes.push(completerDroite(n + ".service", 28) + completerDroite("loaded", 8) + completerDroite(s.actif ? "active" : "inactive", 10) + s.description);
		});
		GameEvents.fire({ type: "systemctl", action: action, host: hote });
		return lignes.join("\n");
	}
	if (!nom) throw new ShellError("systemctl " + action + " : quel service ? Exemple : systemctl status sshd");
	nom = nom.replace(/\.service$/, "");
	var s = services[nom];
	if (!s) throw new ShellError("Unit " + nom + ".service could not be found.");
	if (action === "status"){
		GameEvents.fire({ type: "systemctl", action: action, host: hote, service: nom });
		return "● " + nom + ".service - " + s.description + "\n" +
			"     Loaded: loaded (" + (s.fichier || "/etc/systemd/system/" + nom + ".service") + "; " + (s.auto ? "enabled" : "disabled") + ")\n" +
			"     Active: " + (s.actif ? (io.tty ? C.vert("active (running)") : "active (running)") : "inactive (dead)") + "\n" +
			(s.actif && s.pid ? "   Main PID: " + s.pid + " (" + nom + ")\n" : "") +
			(s.execStart ? "    Process: ExecStart=" + s.execStart + (io.tty ? C.gris("   (lu dans le fichier du service)") : "") + "\n" : "") +
			(s.restart ? "    Restart: " + s.restart + C.gris("  (relancé automatiquement s'il s'arrête)") : "");
	}
	if (["stop", "start", "restart", "enable", "disable"].indexOf(action) === -1){
		throw new ShellError("systemctl : action « " + action + " » inconnue ici. Celles qui existent : status, start, stop, restart, enable, disable, list-units");
	}
	if (!io.sudo) throw new ShellError("Failed to " + action + " " + nom + ".service: Access denied\n" + C.gris("(Gérer les services est réservé à root : sudo systemctl " + action + " " + nom + ")"));
	if (action === "enable") s.auto = true;
	if (action === "disable"){ s.auto = false; if (maintenant) arreterService(hote, nom); }
	if (action === "stop") arreterService(hote, nom);
	if (action === "start" || action === "restart") demarrerService(hote, nom);
	GameEvents.fire({ type: "systemctl", action: action, host: hote, service: nom, now: maintenant });
	if (action === "disable") return "Removed \"/etc/systemd/system/multi-user.target.wants/" + nom + ".service\".";
	if (action === "enable") return "Created symlink /etc/systemd/system/multi-user.target.wants/" + nom + ".service.";
	return "";
};

/* ------------------------------------------------------------------ */
/* Les comptes                                                         */
/* ------------------------------------------------------------------ */

/* Les fichiers /etc/passwd, /etc/shadow, /etc/group et /etc/sudoers de la machine courante. */
function fichierSysteme(nom){
	var h = infoHote();
	return h.fichiers && h.fichiers[nom] ? h.fichiers[nom]() : null;
}

Shell.sorts.groups = function(args, io){
	var qui = args[0] || JOUEUR;
	var groupe = fichierSysteme("group");
	var liste = [qui];
	if (groupe){
		lignesDe(groupe.getText()).forEach(function(l){
			var c = l.split(":");
			if (c.length >= 4 && c[3].split(",").indexOf(qui) > -1 && liste.indexOf(c[0]) === -1) liste.push(c[0]);
		});
	}
	if (qui === JOUEUR && state.has("sudoOK") && liste.indexOf("sudo") === -1) liste.push("sudo");
	GameEvents.fire({ type: "groups", qui: qui, groupes: liste });
	return qui + " : " + liste.join(" ");
};

Shell.sorts.userdel = function(args, io){
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!nom) throw new ShellError("userdel : quel compte supprimer ? Utilisation : sudo userdel NOM");
	if (!io.sudo) throw new ShellError("userdel : Permission denied.\nuserdel : cannot lock /etc/passwd; try again later.\n" + C.gris("(Supprimer un compte est réservé à root : sudo userdel " + nom + ")"));
	if (nom === JOUEUR || nom === "root") throw new ShellError("userdel : supprimer « " + nom + " » ? C'est toi, ou c'est root. Non.");
	var passwd = fichierSysteme("passwd");
	if (!passwd || !new RegExp("^" + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":", "m").test(passwd.getText())) throw new ShellError("userdel : user '" + nom + "' does not exist");
	var actifs = Shell.procsDeLHote().filter(function(e){ return e.proc.owner === nom; });
	if (actifs.length) throw new ShellError("userdel : user " + nom + " is currently used by process " + actifs[0].proc.pid + "\n" + C.gris("(Il faut d'abord arrêter ses processus : sudo pkill -u " + nom + ")"));
	["passwd", "shadow", "group"].forEach(function(f){
		var item = fichierSysteme(f);
		if (!item) return;
		item.setText(lignesDe(item.getText()).filter(function(l){ return l.split(":")[0] !== nom; }).map(function(l){
			if (f !== "group") return l;
			var c = l.split(":");
			if (c.length >= 4) c[3] = c[3].split(",").filter(function(m){ return m !== nom; }).join(",");
			return c.join(":");
		}).join("\n"));
	});
	GameEvents.fire({ type: "userdel", qui: nom, host: Shell.hote() });
	return "";
};

Shell.sorts.usermod = function(args, io){
	var verrou = args.indexOf("-L") > -1, deverrou = args.indexOf("-U") > -1;
	var retirer = args.some(function(a){ return /^-[a-zA-Z]*r/.test(a) && a !== "--"; }), ajouter = args.some(function(a){ return /^-[a-zA-Z]*a/.test(a); });
	var groupe = null, mots = [];
	for (var i = 0; i < args.length; i++){
		if (/^-[a-zA-Z]*G$/.test(args[i])){ groupe = args[++i] || null; continue; }
		if (args[i].charAt(0) !== "-") mots.push(args[i]);
	}
	var nom = mots[0];
	if (!nom || (!verrou && !deverrou && !groupe)) throw new ShellError("usermod : utilisations ici :\n  sudo usermod -L NOM          bloquer le mot de passe du compte (-U pour le débloquer)\n" +
		"  sudo usermod -aG GROUPE NOM  ajouter NOM au GROUPE\n  sudo gpasswd -d NOM GROUPE   retirer NOM du GROUPE");
	if (!io.sudo) throw new ShellError("usermod : Permission denied.\n" + C.gris("(Réservé à root : sudo usermod ...)"));
	if (groupe){
		if (!retirer && !ajouter) throw new ShellError("usermod : -G seul remplacerait TOUS les groupes de " + nom + ". Précise -aG (ajouter) ou -rG (retirer).");
		var fichierGroupes = fichierSysteme("group");
		var passwdG = fichierSysteme("passwd");
		if (!passwdG || !new RegExp("^" + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":", "m").test(passwdG.getText())) throw new ShellError("usermod : user '" + nom + "' does not exist");
		if (!fichierGroupes || !new RegExp("^" + groupe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":", "m").test(fichierGroupes.getText())) throw new ShellError("usermod : group '" + groupe + "' does not exist");
		fichierGroupes.setText(lignesDe(fichierGroupes.getText()).map(function(l){
			var c = l.split(":");
			if (c[0] !== groupe || c.length < 4) return l;
			var membres = c[3] === "" ? [] : c[3].split(",");
			membres = membres.filter(function(m){ return m !== nom; });
			if (ajouter) membres.push(nom);
			c[3] = membres.join(",");
			return c.join(":");
		}).join("\n"));
		GameEvents.fire({ type: "usermod", qui: nom, groupe: groupe, retire: retirer, host: Shell.hote() });
		return "";
	}
	var shadow = fichierSysteme("shadow");
	if (!shadow || !new RegExp("^" + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":", "m").test(shadow.getText())) throw new ShellError("usermod : user '" + nom + "' does not exist");
	shadow.setText(lignesDe(shadow.getText()).map(function(l){
		var c = l.split(":");
		if (c[0] !== nom) return l;
		c[1] = verrou ? (c[1].charAt(0) === "!" ? c[1] : "!" + c[1]) : c[1].replace(/^!/, "");
		return c.join(":");
	}).join("\n"));
	GameEvents.fire({ type: "usermod", qui: nom, verrou: verrou, host: Shell.hote() });
	return "";
};

/* visudo : ouvre /etc/sudoers dans l'éditeur, et refuse d'enregistrer une syntaxe fausse. */
Shell.sorts.visudo = function(args, io){
	if (!io.sudo) throw new ShellError("visudo : /etc/sudoers : Permission denied\n" + C.gris("(sudo visudo)"));
	if (!io.tty) throw new ShellError("visudo : il faut un écran, pas de tuyau.");
	var sudoers = fichierSysteme("sudoers");
	if (!sudoers) throw new ShellError("visudo : pas de fichier sudoers sur cette machine");
	term.editer({ titre: "/etc/sudoers.tmp", texte: sudoers.getText(), mode: state.knows("vim") ? "vim" : "nano" }, function(nouveau){
		if (nouveau === null) return;
		var fautes = [];
		lignesDe(nouveau).forEach(function(l, i){
			var t = l.trim();
			if (t === "" || t.charAt(0) === "#" || /^Defaults\s+\S/.test(t) || /^@includedir\s/.test(t)) return;
			if (!/^%?[\w.-]+\s+[\w.-]+\s*=\s*(\([\w.,:%\s-]*\)\s*)?((NO)?PASSWD:\s*)?(ALL|\/[^\s,]+)(\s*,\s*(ALL|\/[^\s,]+))*$/.test(t)) fautes.push(i + 1);
		});
		if (fautes.length){
			term.echo(C.rouge(">>> /etc/sudoers: syntax error near line " + fautes[0] + " <<<") + "\n" +
				"visudo : rien n'a été enregistré. " + C.gris("(Une erreur dans sudoers peut priver tout le monde de sudo : visudo vérifie avant d'écrire.)"));
			return;
		}
		var ancien = sudoers.getText();
		sudoers.setText(nouveau);
		GameEvents.fire({ type: "write", item: sudoers, room: null, append: false, text: nouveau, created: false, previous: ancien, visudo: true });
		Shell.fin();
	});
	return "";
};

/* ------------------------------------------------------------------ */
/* Le réseau                                                           */
/* ------------------------------------------------------------------ */

Shell.sorts.ip = function(args, io){
	var objet = args[0] || "";
	var h = infoHote(), ipHote = h.ip || "10.0.0.1";
	GameEvents.fire({ type: "ip", host: Shell.hote(), objet: objet });
	if (/^(a|addr|address)$/.test(objet)){
		return "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n" +
			"2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    link/ether 52:54:00:" + ipHote.split(".").slice(1).map(function(x){ return ("0" + (+x).toString(16)).slice(-2); }).join(":") +
			" brd ff:ff:ff:ff:ff:ff\n    inet " + (io.tty ? C.cyan(ipHote + "/24") : ipHote + "/24") + " brd " + ipHote.replace(/\.\d+$/, ".255") + " scope global eth0";
	}
	if (/^(r|route)$/.test(objet)){
		return "default via " + ipHote.replace(/\.\d+$/, ".254") + " dev eth0\n" + ipHote.replace(/\.\d+$/, ".0") + "/24 dev eth0 proto kernel scope link src " + ipHote;
	}
	throw new ShellError("ip : utilisation ici : ip a (les adresses de cette machine) ou ip r (les routes)");
};

/* Résoudre un nom de machine : par le DNS de l'école (dig) ou directement. */
function hoteDepuisCible(cible){
	var nom = cible.replace(/\.cybersup\.lan$/, "");
	var h = trouverHote(nom);
	if (h) return h;
	var enregistrement = resoudreDns(cible);
	return enregistrement ? trouverHote(enregistrement) : null;
}

Shell.sorts.traceroute = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("traceroute : vers quelle machine ? Utilisation : traceroute MACHINE");
	var h = hoteDepuisCible(cible);
	if (!h) throw new ShellError("traceroute : " + cible + " : Nom ou service inconnu");
	var ici = Shell.hote(), dest = HOTES[h].ip;
	var sauts = [];
	var passerelle = (HOTES["parefeu"] || {}).ip || "10.0.92.254";
	if (ici !== h && (infoHote().ip || "").split(".").slice(0, 3).join(".") !== dest.split(".").slice(0, 3).join(".")) sauts.push(["parefeu.cybersup.lan", passerelle]);
	if (h !== ici) sauts.push([h + ".cybersup.lan", dest]);
	else sauts.push(["localhost", "127.0.0.1"]);
	GameEvents.fire({ type: "traceroute", host: h });
	return "traceroute to " + cible + " (" + dest + "), 30 hops max, 60 byte packets\n" + sauts.map(function(s, i){
		var t = (0.3 + i * 0.4 + (dest.length % 7) / 10).toFixed(3);
		return completerGauche(i + 1, 2) + "  " + s[0] + " (" + s[1] + ")  " + t + " ms  " + t + " ms  " + t + " ms";
	}).join("\n");
};

/* La zone DNS de l'école : lue dans le fichier de zone du serveur dns (voir Reseau.js). */
function zoneDns(){
	var z = typeof fichierZoneDns === "function" ? fichierZoneDns() : null;
	if (!z) return [];
	// Comme BIND : commentaires après « ; », nom court ou complet (poste-47.cybersup.lan.), TTL et classe IN facultatifs, majuscules indifférentes.
	return lignesDe(z.getText()).map(function(l){
		var ligne = l.replace(/;.*$/, "").trim();
		if (!ligne || ligne.charAt(0) === "$") return null;
		var m = /^(\S+)\s+(?:\d+\s+)?(?:IN\s+)?(?:\d+\s+)?(A|CNAME|MX|TXT)\s+(.+)$/i.exec(ligne);
		if (!m) return null;
		var nom = m[1].toLowerCase().replace(/\.cybersup\.lan\.?$/, "").replace(/\.$/, "");
		var type = m[2].toUpperCase(), valeur = m[3].trim();
		if (type === "A") valeur = valeur.replace(/\.$/, "");
		return { nom: nom, type: type, valeur: valeur };
	}).filter(Boolean);
}

function resoudreDns(nom){
	var court = nom.replace(/\.cybersup\.lan\.?$/, "");
	var e = zoneDns().filter(function(r){ return r.nom === court && r.type === "A"; })[0];
	return e ? e.valeur : null;
}

Shell.sorts.dig = function(args, io){
	var court = args.indexOf("+short") > -1, inverse = args.indexOf("-x") > -1;
	var mots = args.filter(function(a){ return a.charAt(0) !== "-" && a.charAt(0) !== "+" && a.charAt(0) !== "@"; });
	var nom = mots[0];
	if (!nom) throw new ShellError("dig : quel nom chercher ? Utilisation : dig NOM, ou dig -x ADRESSE pour la recherche inverse");
	var reponses = [];
	if (inverse){
		// La recherche inverse donne le nom officiel de la machine : le premier enregistrement de la zone pour cette adresse.
		var officiel = zoneDns().filter(function(r){ return r.type === "A" && r.valeur === nom; })[0];
		if (officiel) reponses.push({ q: nom.split(".").reverse().join(".") + ".in-addr.arpa.", type: "PTR", v: officiel.nom + ".cybersup.lan." });
	} else {
		var courtNom = nom.replace(/\.cybersup\.lan\.?$/, "");
		zoneDns().forEach(function(r){
			if (r.nom === courtNom) reponses.push({ q: courtNom + ".cybersup.lan.", type: r.type, v: r.valeur });
		});
	}
	GameEvents.fire({ type: "dig", nom: nom, inverse: inverse, reponses: reponses });
	if (court) return reponses.map(function(r){ return r.v; }).join("\n");
	return "; <<>> DiG 9.18 <<>> " + args.join(" ") + "\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: " + (reponses.length ? "NOERROR" : "NXDOMAIN") + "\n\n" +
		";; ANSWER SECTION:\n" + (reponses.length ? reponses.map(function(r){ return completerDroite(r.q, 34) + "300 IN " + completerDroite(r.type, 6) + r.v; }).join("\n") : "(aucune réponse)") +
		"\n\n;; SERVER: " + ((HOTES["dns"] || {}).ip || "10.0.92.53") + "#53" +
		(inverse && !reponses.length && io.tty ? "\n" + C.gris("(Aucune machine de la zone n'a l'adresse " + nom + ". dig NOM donne l'adresse d'un nom (par exemple dig maj.cybersup.lan), puis dig -x sur CETTE adresse dit à quelle machine elle appartient vraiment.)") : "");
};

/* nmap : quelles machines répondent, et quels ports sont ouverts. Uniquement sur le réseau de l'école. */
/* L'adresse d'une machine sur le réseau de l'école (le routeur du bâtiment B y a sa deuxième carte, ip2). */
function ipDansLEcole(h){
	var x = HOTES[h] || {};
	if (/^10\.0\.92\./.test(x.ip || "")) return x.ip;
	if (/^10\.0\.92\./.test(x.ip2 || "")) return x.ip2;
	return null;
}
Shell.sorts.nmap = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("nmap : que faut-il scanner ? Exemples : nmap 10.0.92.0/24 (tout le réseau de l'école), nmap web");
	var hotes = [];
	if (/^10\.0\.92\.0\/24$/.test(cible)){
		Object.keys(HOTES).forEach(function(h){ if (ipDansLEcole(h) && HOTES[h].ports) hotes.push(h); });
	} else {
		var h = hoteDepuisCible(cible);
		if (!h && /^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(cible)) throw new ShellError("nmap : " + cible + " n'est pas sur le réseau de l'école (10.0.92.0/24).\n" +
			C.gris("(Scanner une machine sans l'autorisation de son propriétaire est un délit. La mission ne t'autorise que le réseau de l'école.)"));
		if (!h) throw new ShellError("nmap : Failed to resolve \"" + cible + "\".");
		if (!ipDansLEcole(h)) throw new ShellError("nmap : on ne scanne que le réseau de l'école (10.0.92.0/24). Scanner les machines des autres sans autorisation est illégal.");
		hotes.push(h);
	}
	hotes.sort(function(a, b){ return +ipDansLEcole(a).split(".")[3] - +ipDansLEcole(b).split(".")[3]; });
	var lignes = ["Starting Nmap 7.94 ( https://nmap.org )"];
	hotes.forEach(function(h){
		var ports = HOTES[h].ports || {};
		lignes.push("Nmap scan report for " + h + ".cybersup.lan (" + ipDansLEcole(h) + ")");
		lignes.push("PORT     STATE SERVICE");
		Object.keys(ports).sort(function(a, b){ return +a - +b; }).forEach(function(p){
			if (ports[p].ferme && ports[p].ferme()) return;
			lignes.push(completerDroite(p + "/tcp", 9) + completerDroite("open", 6) + ports[p].service);
		});
		lignes.push("");
	});
	lignes.push("Nmap done: " + (cible.indexOf("/") > -1 ? "256 IP addresses (" + hotes.length + " hosts up)" : "1 IP address (1 host up)") + " scanned");
	GameEvents.fire({ type: "nmap", cible: cible, hotes: hotes, reseau: cible.indexOf("/") > -1 });
	return lignes.join("\n");
};

/* nc : ouvrir une connexion vers un port et lire ce que le service répond. */
Shell.sorts.nc = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (mots.length < 2) throw new ShellError("nc : utilisation : nc MACHINE PORT (par exemple nc mail 25)");
	var h = hoteDepuisCible(mots[0]);
	if (!h) throw new ShellError("nc : getaddrinfo for host \"" + mots[0] + "\": Name or service not known");
	var port = (HOTES[h].ports || {})[mots[1]];
	if (!port || (port.ferme && port.ferme())) throw new ShellError("nc : connect to " + mots[0] + " port " + mots[1] + " (tcp) failed: Connection refused");
	GameEvents.fire({ type: "nc", host: h, port: mots[1] });
	if (args.indexOf("-z") > -1) return "Connection to " + mots[0] + " " + mots[1] + " port [tcp/" + port.service + "] succeeded!";
	return (typeof port.banniere === "function" ? port.banniere() : (port.banniere || "")) + (io.tty ? "\n" + C.gris("(La connexion se referme. Une bannière comme celle-ci dit souvent quel logiciel tourne, et dans quelle version.)") : "");
};

/* curl : lire une page d'un serveur web de l'école. */
Shell.sorts.curl = function(args, io){
	var entetes = false, sortieFichier = null, url = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-I" || args[i] === "--head") entetes = true;
		else if (args[i] === "-o") sortieFichier = args[++i];
		else if (args[i] === "-s" || args[i] === "-L" || args[i] === "-v") continue;
		else if (args[i].charAt(0) === "-") throw new ShellError("curl : option « " + args[i] + " » inconnue ici. Celles qui existent : -I, -o FICHIER, -s");
		else url = args[i];
	}
	if (!url) throw new ShellError("curl : quelle adresse ? Exemple : curl http://web/");
	var m = /^(?:https?:\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
	if (!m) throw new ShellError("curl : (3) URL rejected: Malformed input");
	var h = hoteDepuisCible(m[1]);
	if (!h) throw new ShellError("curl : (6) Could not resolve host: " + m[1]);
	if (!HOTES[h].web) throw new ShellError("curl : (7) Failed to connect to " + m[1] + " port 80: Connection refused");
	var chemin = (m[3] || "/").replace(/\?.*$/, "");
	if (chemin.charAt(chemin.length - 1) === "/") chemin += "index.html";
	var lieu = HOTES[h].web(), morceaux = chemin.split("/").filter(Boolean), item = null;
	for (var k = 0; k < morceaux.length && lieu; k++){
		var noeud = lieu.getNode(morceaux[k]);
		if (k === morceaux.length - 1) item = noeud instanceof Item ? noeud : null;
		else lieu = noeud instanceof Room ? noeud : null;
	}
	var code = item ? 200 : 404;
	var corps = item ? item.getText() : "<html><body><h1>404 Not Found</h1></body></html>";
	GameEvents.fire({ type: "curl", host: h, chemin: chemin, code: code, item: item });
	var enTete = "HTTP/1.1 " + code + (code === 200 ? " OK" : " Not Found") + "\nServer: httpd/2.4\nContent-Type: " + (/\.txt$/.test(chemin) ? "text/plain" : (/\.php$/.test(chemin) ? "text/html; charset=UTF-8" : "text/html")) + "\nContent-Length: " + versOctetsUtf8(corps).length;
	if (entetes) return enTete;
	if (sortieFichier){ Shell.ecrire(sortieFichier, corps, false); return ""; }
	return corps;
};

/* ufw : le pare-feu, uniquement sur la machine parefeu. L'état est gardé dans state.reseau. */
Shell.sorts.ufw = function(args, io){
	if (Shell.hote() !== "parefeu") throw new ShellError("ufw : command not found sur " + Shell.hote() + ".\n" + C.gris("(Le pare-feu de l'école est une machine à part : ssh parefeu)"));
	if (!io.sudo) throw new ShellError("ERROR: You need to be root to run this script\n" + C.gris("(sudo ufw ...)"));
	var pf = state.reseau.parefeu;
	var action = args[0] || "status";
	GameEvents.fire({ type: "ufw", args: args });
	if (action === "status"){
		var lignes = ["Status: " + (pf.actif ? "active" : "inactive")];
		if (pf.actif || args[1] === "numbered"){
			lignes.push("", "     To                         Action      From", "     --                         ------      ----");
			pf.regles.forEach(function(r, i){
				lignes.push((args[1] === "numbered" ? "[" + completerGauche(i + 1, 2) + "] " : "     ") + completerDroite(r.vers || "Anywhere", 27) + completerDroite(r.action.toUpperCase() + (r.route ? " FWD" : " IN"), 12) + r.de);
			});
			if (pf.regles.length) lignes.push("", C.gris("(Les règles se lisent dans l'ordre : la première qui correspond à une connexion décide.)"));
		}
		return lignes.join("\n");
	}
	if (action === "enable"){ pf.actif = true; GameEvents.fire({ type: "ufwChange" }); return "Firewall is active and enabled on system startup"; }
	if (action === "disable"){ pf.actif = false; GameEvents.fire({ type: "ufwChange" }); return "Firewall stopped and disabled on system startup"; }
	// ufw route ... : la règle vise le trafic qui TRAVERSE le pare-feu (FWD), pas celui qui lui est destiné (IN).
	var route = false;
	if (action === "route"){ route = true; args = args.slice(1); action = args[0]; }
	// ufw insert N RÈGLE : la règle prend la place N (les règles sont lues dans l'ordre, la première qui correspond décide).
	var position = null;
	if (action === "insert"){
		position = parseInt(args[1], 10);
		if (isNaN(position) || position < 1 || position > pf.regles.length + 1) throw new ShellError("ERROR: Invalid position '" + args[1] + "'");
		args = args.slice(2);
		action = args[0];
	}
	if (action === "deny" || action === "allow" || action === "reject"){
		var m = args.slice(1).join(" ");
		var r, regle;
		if ((r = /^from\s+(\S+)(?:\s+to\s+any)?(?:\s+port\s+(\d+))?$/.exec(m))) regle = { action: action, de: r[1], vers: r[2] ? r[2] + "/tcp" : "Anywhere" };
		else if ((r = /^(\d+)(\/tcp)?$/.exec(m))) regle = { action: action, de: "Anywhere", vers: r[1] + "/tcp" };
		else throw new ShellError("ERROR: Wrong number of arguments\n" + C.gris("(Exemples : sudo ufw route deny from 10.0.92.47, sudo ufw allow 22, sudo ufw route insert 1 deny from 10.0.92.47)"));
		if (route) regle.route = true;
		if (position !== null) pf.regles.splice(position - 1, 0, regle);
		else pf.regles.push(regle);
		GameEvents.fire({ type: "ufwChange", regle: regle });
		return position !== null ? "Rule inserted" : "Rule added";
	}
	if (action === "delete"){
		var n = parseInt(args[1], 10);
		if (isNaN(n) || n < 1 || n > pf.regles.length) throw new ShellError("ERROR: Could not find rule '" + args[1] + "'");
		pf.regles.splice(n - 1, 1);
		GameEvents.fire({ type: "ufwChange" });
		return "Rule deleted";
	}
	throw new ShellError("ufw : action « " + action + " » inconnue ici. Celles qui existent : status, enable, disable, deny, allow, reject, insert, delete");
};

/* Un chemin sur une machine du réseau : MACHINE:/chemin. */
function cheminDistant(texte, cmd){
	var m = /^([\w.-]+):(.*)$/.exec(texte);
	if (!m) return null;
	var h = hoteDepuisCible(m[1]);
	if (!h) throw new ShellError(cmd + " : ssh: Could not resolve hostname " + m[1] + ": Name or service not known");
	var refus = HOTES[h].refus ? HOTES[h].refus() : null;
	if (refus) throw new ShellError(refus);
	var racine = HOTES[h].arrivee();
	var chemin = m[2] === "" ? "." : m[2];
	var r = Shell.chercherDepuis(racine, chemin.replace(/^\//, "") || ".", { sudo: false }, cmd);
	return { hote: h, r: r };
}

Shell.sorts.scp = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (mots.length !== 2) throw new ShellError("scp : utilisation : scp OBJET MACHINE:/chemin/ (ou scp MACHINE:/chemin/objet .)");
	var src = cheminDistant(mots[0], "scp") || { hote: Shell.hote(), r: Shell.chercher(mots[0], io, "scp") };
	if (src.r.node === null) throw new ShellError("scp : " + mots[0] + " : No such file or directory");
	if (!(src.r.node instanceof Item)) throw new ShellError("scp : " + mots[0] + " : not a regular file");
	if (!Shell.bit(src.r.node, "r", null)) throw new ShellError("scp : " + mots[0] + " : Permission denied");
	var dst = cheminDistant(mots[1], "scp") || { hote: Shell.hote(), r: Shell.chercher(mots[1], io, "scp") };
	var dossier = dst.r.node instanceof Room ? dst.r.node : dst.r.dir;
	var nom = dst.r.node instanceof Room ? src.r.node.itemname : dst.r.name;
	if (!Shell.bit(dossier, "w", null)) throw new ShellError("scp : " + nom + " : Permission denied");
	var existant = dossier.getNode(nom);
	if (existant instanceof Room) throw new ShellError("scp : " + nom + " : is a directory");
	if (existant) dossier.removeItem(existant);
	var copie = new Item(nom, src.r.node.getText());
	copie.owner = JOUEUR;
	copie.picturename = src.r.node.picturename;
	["gzip", "gpg", "binaire", "format", "sansFinDeLigne"].forEach(function(k){ if (src.r.node[k] !== undefined) copie[k] = JSON.parse(JSON.stringify(src.r.node[k])); });
	copie.age = 0;
	dossier.addItem(copie);
	GameEvents.fire({ type: "scp", source: src.r.node, copie: copie, versHote: dst.hote, deHote: src.hote, dossier: dossier });
	return completerDroite(nom, 40) + "100%  " + versOctetsUtf8(copie.getText()).length + "  1.2MB/s   00:00";
};

Shell.sorts["ssh-copy-id"] = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("ssh-copy-id : vers quelle machine ? Utilisation : ssh-copy-id MACHINE");
	var dossier = Home.getChildFromName(".ssh");
	var pub = dossier !== -1 ? dossier.getItemFromName("id_ed25519.pub") : -1;
	if (pub === -1) throw new ShellError("/usr/bin/ssh-copy-id: ERROR: No identities found\n" + C.gris("(Il te faut d'abord une paire de clés : ssh-keygen)"));
	var h = hoteDepuisCible(cible.replace(/^.*@/, ""));
	if (!h) throw new ShellError("ssh: Could not resolve hostname " + cible + ": Name or service not known");
	if (HOTES[h].avantCle && HOTES[h].avantCle()) throw new ShellError(HOTES[h].avantCle());
	state.reseau.cles[h] = pub.getText();
	GameEvents.fire({ type: "sshCopyId", host: h });
	return "/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed\n\nNumber of key(s) added: 1\n\n" +
		"Now try logging into the machine, with:   \"ssh " + h + "\"\nand check to make sure that only the key(s) you wanted were added.";
};

/* ------------------------------------------------------------------ */
/* gpg : chiffrer et déchiffrer avec une phrase de passe               */
/* ------------------------------------------------------------------ */

function texteArmure(sel){
	return "-----BEGIN PGP MESSAGE-----\n\n" + base64Aleatoire(sel + "-1", 64) + "\n" + base64Aleatoire(sel + "-2", 64) + "\n=" + base64Aleatoire(sel + "-3", 4) + "\n-----END PGP MESSAGE-----";
}

function texteCourt(t){ return String(t).replace(/\s+/g, " ").substring(0, 12); }

Shell.sorts.gpg = function(args, io){
	var dechiffrer = args.indexOf("-d") > -1 || args.indexOf("--decrypt") > -1;
	var chiffrer = args.indexOf("-c") > -1 || args.indexOf("--symmetric") > -1;
	var sortie = null, noms = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-o" || args[i] === "--output") sortie = args[++i];
		else if (args[i].charAt(0) !== "-") noms.push(args[i]);
	}
	if (!dechiffrer && !chiffrer) throw new ShellError("gpg : utilisation ici : gpg -d FICHIER.gpg (déchiffrer) ou gpg -c FICHIER (chiffrer avec une phrase de passe)");
	if (noms.length !== 1) throw new ShellError("gpg : un seul fichier à la fois");
	if (!io.tty && dechiffrer && sortie === null && io.stdin === null) { /* la phrase de passe se tape quand même à l'écran */ }
	var t = Shell.objetLisible(noms[0], io, "gpg");
	// La phrase de passe se demande après coup : la sortie va donc là où pointait la redirection (> FICHIER).
	var versFichier = io.sortie1 && io.sortie1.t === "fichier" ? io.sortie1 : null;
	if (dechiffrer && io.sortie1 && io.sortie1.t === "tuyau") throw new ShellError("gpg : ici, gpg ne peut pas envoyer le texte déchiffré dans un tuyau.\n" +
		C.gris("(Écris-le dans un fichier : gpg -d " + noms[0] + " > carnet.txt, ou gpg -o carnet.txt -d " + noms[0] + ", puis lis ce fichier.)"));
	if (dechiffrer && versFichier) io.sortieGeree = true;
	if (dechiffrer){
		if (!t.item.gpg) throw new ShellError("gpg : no valid OpenPGP data found.\ngpg : decrypt_message failed: Unknown system error");
		if (t.item.gpg.armure && t.item.getText() !== t.item.gpg.armure) throw new ShellError("gpg: CRC error; " + texteCourt(t.item.getText()) + "\ngpg: decryption failed: Checksum error\n" +
			C.gris("(Le fichier chiffré a été modifié : il ne se déchiffre plus. Une preuve, on n'y touche pas.)"));
		term.demander("Phrase de passe : ", true, function(phrase){
			if (phrase !== t.item.gpg.phrase){
				term.echo("gpg: AES256.CFB encrypted data\ngpg: decryption failed: Bad session key\n" + C.gris("(Mauvaise phrase de passe.)"));
				GameEvents.fire({ type: "gpg", decrypt: true, ok: false });
				Shell.fin();
				return;
			}
			if (sortie) Shell.ecrire(sortie, t.item.gpg.clair, false);
			else if (versFichier) Shell.ecrire(versFichier.cible, t.item.gpg.clair, versFichier.ajout);
			else term.echo("gpg: AES256.CFB encrypted data\ngpg: encrypted with 1 passphrase\n" + t.item.gpg.clair);
			GameEvents.fire({ type: "gpg", decrypt: true, ok: true, item: t.item });
			Shell.fin();
		});
		return "";
	}
	term.demander("Phrase de passe : ", true, function(phrase){
		if (phrase.length < 6){
			term.echo("gpg : phrase de passe trop courte (6 caractères au moins). Rien n'a été chiffré.");
			Shell.fin();
			return;
		}
		term.demander("Répète la phrase de passe : ", true, function(confirmation){
			if (confirmation !== phrase){ term.echo("gpg : les deux phrases ne correspondent pas. Rien n'a été chiffré."); Shell.fin(); return; }
			var nom = t.item.itemname + ".gpg";
			try {
				Shell.verifierEcriture(t.room, null, "gpg", nom);
			} catch (e){ term.echo(e.message); Shell.fin(); return; }
			var existant = t.room.getNode(nom);
			if (existant instanceof Item) t.room.removeItem(existant);
			var chiffre = new Item(nom, texteArmure("gpg-" + nom + "-" + state.nbCommandes), "item_locker.gif");
			chiffre.owner = JOUEUR;
			chiffre.gpg = { phrase: phrase, clair: t.item.getText(), armure: chiffre.getText() };
			t.room.addItem(chiffre);
			term.echo(C.gris("(" + nom + " créé : sans la phrase de passe, son contenu est illisible.)"));
			GameEvents.fire({ type: "gpg", decrypt: false, item: chiffre });
			Shell.fin();
		});
	});
	return "";
};

/* ------------------------------------------------------------------ */
/* vim                                                                 */
/* ------------------------------------------------------------------ */

Shell.sorts.vim = function(args, io){
	var objets = args.filter(function(a){ return a.charAt(0) !== "-" && a.charAt(0) !== "+"; });
	if (objets.length > 1) throw new ShellError("vim : un seul objet à la fois ici.");
	if (!io.tty || io.stdin !== null) throw new ShellError("vim : Vim: Warning: Output is not to a terminal");
	var nom = objets[0] || null;
	var r = nom ? Shell.chercher(nom, io, "vim") : null;
	if (r && r.node instanceof Room) throw new ShellError("vim : " + nom + " est un lieu (un répertoire)");
	var item = r && r.node ? Shell.suivre(r.node, "vim") : null;
	if (item && item.person) throw new ShellError(item.itemname + " n'est pas un texte. On ne réécrit pas les gens : less " + item.itemname);
	if (item && !Shell.bit(item, "r", io)) throw new ShellError("vim : " + nom + " : Permission non accordée");
	if (r && item === null) Shell.nomValide(r.name, "vim");
	var lieu = r ? r.dir : current_room, sudo = !!io.sudo, cible = item;
	var lectureSeule = item ? (!Shell.bit(item, "w", io) || !!item.immuable) : (r ? !Shell.bit(r.dir, "w", io) : false);
	term.editer({
		titre: nom || "[Sans nom]", texte: item ? item.getText() : "", mode: "vim", lectureSeule: lectureSeule, nouveau: !item, sudo: sudo,
		quitter: function(info){
			GameEvents.fire({ type: "vimQuitte", info: info, item: cible, nom: r ? r.name : null, room: lieu });
			Shell.fin();
		}
	}, function(nouveau, info){
		if (nouveau === null) return;
		if (!r){ term.echo("E32: No file name"); return; }
		if (lectureSeule){ term.echo("E45: 'readonly' option is set (add ! to override)" + (sudo ? "" : C.gris("  (Objet d'un autre : sudo vim " + nom + ")"))); return; }
		var nouveauNe = cible === null, ancien = cible ? cible.getText() : "";
		if (nouveauNe){
			cible = new Item(r.name, nouveau);
			cible.owner = sudo ? "root" : JOUEUR;
			lieu.addItem(cible);
		} else {
			cible.setText(nouveau);
		}
		GameEvents.fire({ type: "write", item: cible, room: lieu, append: false, text: nouveau, created: nouveauNe, previous: ancien, vim: info || {} });
	});
	return "";
};
Shell.sorts.vi = Shell.sorts.vim;

/* ------------------------------------------------------------------ */
/* Le manuel                                                           */
/* ------------------------------------------------------------------ */

function page(resume, titre, texte){ return { resume: resume, titre: titre, page: texte }; }

/*
 * Les sorts du scripteur (read, printf, seq, basename, dirname, expr, sleep : voir Interpreteur.js).
 * Aucun chapitre ne les enseigne encore : le chapitre 4 les rangera dans son ORDRE_DES_SORTS.
 * D'ici là, ils sont « hors barème » : pas d'XP de premier usage (voir Shell.appeler).
 */
MANUEL["read"] = page("lire une ligne et la ranger dans des variables", "READ (lire)",
	"  read NOM               lit une ligne et la range dans la variable NOM\n" +
	"  read A B C             coupe la ligne en mots : le premier dans A, le deuxième dans B, tout le reste dans C\n" +
	"  read -r LIGNE          garde les \\ tels quels (le bon réflexe pour lire un fichier)\n" +
	"  read -p \"Nom ? \" NOM   affiche une question avant de lire\n" +
	"  read -a T              range chaque mot dans le tableau T (${T[0]}, ${T[1]}...)\n" +
	"  IFS=: read A B C       coupe sur les : au lieu des espaces\n\n" +
	"read lit son entrée : un tuyau, un objet (avec <) ou un texte (avec <<<). Il rend le statut 1 quand il\n" +
	"n'y a plus rien à lire : c'est ce qui arrête la boucle classique, celle qui lit un fichier ligne à ligne :\n\n" +
	"  while read -r ligne; do\n" +
	"      echo \"lu : $ligne\"\n" +
	"  done < fichier\n\n" +
	"Piège : echo Ada | read nom ne garde rien, car chaque morceau d'un tuyau tourne dans son propre\n" +
	"sous-shell. Écris plutôt read nom <<< \"Ada\".\n" +
	"Dans ce monde, read ne lit pas le clavier : donne-lui toujours un tuyau, un objet ou un texte.");

MANUEL["printf"] = page("écrire un texte mis en forme", "PRINT Formatted (écrire avec un format)",
	"  printf FORMAT ARGUMENTS...\n\n" +
	"  %s     un texte                    %5s    sur 5 colonnes, calé à droite\n" +
	"  %d     un nombre entier            %-10s  sur 10 colonnes, calé à gauche\n" +
	"  %.2f   un nombre à 2 décimales     %03d   sur 3 chiffres : 007\n" +
	"  %x     un nombre en hexadécimal    %%     le signe % lui-même\n" +
	"  \\n     un retour à la ligne        \\t     une tabulation\n\n" +
	"Contrairement à echo, printf n'ajoute pas de retour à la ligne tout seul : pense au \\n.\n" +
	"S'il y a plus d'arguments que de %, le format resservira :\n" +
	"  printf \"%s\\n\" un deux trois      un mot par ligne\n" +
	"  printf \"%-8s %3d\\n\" Ada 42       un petit tableau bien aligné\n" +
	"  printf -v VAR \"%03d\" 7          range le résultat (007) dans VAR au lieu de l'afficher");

MANUEL["seq"] = page("écrire une suite de nombres", "SEQuence",
	"  seq 5              1 2 3 4 5, un par ligne\n" +
	"  seq 2 5            de 2 à 5\n" +
	"  seq 0 10 100       de 0 à 100, de 10 en 10\n" +
	"  seq 5 -1 1         à rebours : 5 4 3 2 1\n" +
	"  seq -s , 3         1,2,3 (le séparateur de ton choix)\n" +
	"  seq -w 8 10        08 09 10 (tous de la même largeur)\n\n" +
	"Le compagnon des boucles : for i in $(seq 1 10); do ...; done\n" +
	"(bash sait aussi l'écrire tout seul : for i in {1..10}, ou for (( i = 1; i <= 10; i++ )).)");

MANUEL["basename"] = page("garder le nom d'un chemin, sans les lieux", "BASE NAME (le nom de base)",
	"  basename ~/Village/Marche/Panier.txt        Panier.txt\n" +
	"  basename ~/Village/Marche/Panier.txt .txt   Panier (sans le suffixe)\n" +
	"  basename -a a/b c/d                          b et d, un par ligne\n\n" +
	"Son jumeau, dirname, garde l'autre moitié. Dans un script :\n" +
	"  for f in *.txt; do echo \"$(basename \"$f\" .txt)\"; done\n" +
	"(bash sait aussi le faire tout seul : ${f##*/} et ${f%.txt}.)");

MANUEL["dirname"] = page("garder les lieux d'un chemin, sans le nom", "DIRectory NAME (le nom du lieu)",
	"  dirname ~/Village/Marche/Panier.txt    ~/Village/Marche\n" +
	"  dirname Panier.txt                     . (ici même)\n\n" +
	"Le jumeau de basename. Pratique dans un script pour savoir où il se trouve : dirname \"$0\".");

MANUEL["expr"] = page("calculer à l'ancienne, ou comparer", "EXPRession",
	"  expr 2 + 3          5\n" +
	"  expr 7 / 2          3 (les nombres entiers seulement)\n" +
	"  expr 6 \\* 7         42 : le * doit être protégé, sinon le shell le prend pour un joker\n" +
	"  expr length Ada     3\n" +
	"  expr 3 \\> 2         1 (vrai) ; 0 pour faux\n\n" +
	"Chaque nombre et chaque opérateur est un argument à part : les espaces comptent.\n" +
	"C'est l'outil des vieux scripts. Aujourd'hui, bash calcule tout seul : echo $(( 6 * 7 )).");

MANUEL["sleep"] = page("attendre un moment", "SLEEP (dormir)",
	"  sleep 2       attend 2 secondes\n" +
	"  sleep 0.5     une demi-seconde\n" +
	"  sleep 1m      une minute (s, m, h, d)\n\n" +
	"Utile dans une boucle qui surveille quelque chose : while true; do ...; sleep 5; done\n" +
	"Dans ce monde, le temps file tout seul : sleep rend la main aussitôt.");
["read", "printf", "seq", "basename", "dirname", "expr", "sleep"].forEach(function(s){ MANUEL[s].horsBareme = true; });


MANUEL["strings"] = page("afficher le texte lisible caché dans un fichier", "STRINGS (les chaînes de caractères)",
	"  strings FICHIER        affiche chaque suite d'au moins 4 caractères lisibles\n  strings -n 8 FICHIER   au moins 8\n\n" +
	"Indispensable devant un programme compilé (un binaire) : cat n'y montre que du charabia,\nstrings en sort les adresses, les messages et parfois les mots de passe oubliés là.");
MANUEL["file"] = page("dire de quel type est vraiment un fichier", "FILE (le type de fichier)",
	"  file FICHIER...        devine le type en lisant le contenu, pas le nom\n\n" +
	"Sous Linux, l'extension (.jpg, .pdf) n'est qu'une convention. file lit les premiers\noctets (la « signature ») : une « photo.jpg » peut très bien être une archive.");
MANUEL["xxd"] = page("afficher les octets d'un fichier en hexadécimal", "XXD (le vidage hexadécimal)",
	"  xxd FICHIER            les octets, 16 par ligne, en hexadécimal et en clair\n  xxd -l 16 FICHIER      seulement les 16 premiers\n\n" +
	"Les premiers octets trahissent le format : 7f 45 4c 46 (ELF) pour un programme,\n1f 8b pour une archive gzip, 89 50 4e 47 (.PNG) pour une image.");
MANUEL["md5sum"] = page("empreinte MD5 d'un fichier (ancienne)", "MD5 SUM",
	"  md5sum FICHIER         empreinte de 32 caractères\n  md5sum -c LISTE        vérifie une liste\n\n" +
	"MD5 est cassé depuis longtemps : on sait fabriquer deux fichiers différents avec la\nmême empreinte. On le croise encore partout, mais pour la sécurité : sha256sum.");
MANUEL["sha1sum"] = page("empreinte SHA-1 d'un fichier (dépréciée)", "SHA-1 SUM",
	"  sha1sum FICHIER        empreinte de 40 caractères\n\nSHA-1 aussi est cassé (collision publiée en 2017). git l'utilise encore pour nommer\nses objets. Pour vérifier l'intégrité d'un fichier : sha256sum.");
MANUEL["stat"] = page("tout savoir d'un fichier : taille, droits, dates", "STATus",
	"  stat FICHIER           taille, droits en chiffres et en lettres, propriétaire,\n                         date de dernière modification\n\n" +
	"En enquête, la date de modification dit quand un intrus est passé.");
MANUEL["chattr"] = page("poser ou retirer l'attribut immuable", "CHange ATTRibutes",
	"  sudo chattr +i FICHIER  rend le fichier immuable : personne, même root, ne peut\n                          le modifier ni le supprimer\n  sudo chattr -i FICHIER  retire l'attribut\n\n" +
	"Les intrus s'en servent pour protéger leurs fichiers. lsattr les révèle.");
MANUEL["lsattr"] = page("voir les attributs spéciaux des fichiers", "LiSt ATTRibutes",
	"  lsattr                 les attributs des objets d'ici\n  lsattr FICHIER\n\nUn i dans la colonne signifie « immuable » (voir chattr).");
MANUEL["gzip"] = page("compresser un fichier", "GNU ZIP",
	"  gzip FICHIER           remplace FICHIER par FICHIER.gz, compressé\n  gzip -d FICHIER.gz     décompresse (comme gunzip)\n\n" +
	"Les journaux anciens sont compressés ainsi : auth.log.2.gz.");
MANUEL["gunzip"] = page("décompresser un fichier .gz", "GNU UNZIP",
	"  gunzip FICHIER.gz      remplace l'archive par le fichier d'origine\n\nPour lire sans décompresser : zcat.");
MANUEL["zcat"] = page("lire une archive gzip sans la décompresser", "Z CAT",
	"  zcat FICHIER.gz        affiche le contenu d'origine\n  zcat auth.log.2.gz | grep Accepted\n\nzcat lit toute archive gzip, quel que soit son nom.");
MANUEL["sed"] = page("filtrer ou transformer un texte ligne par ligne", "Stream EDitor",
	"  sed 's/ancien/nouveau/' F      remplace la 1re occurrence de chaque ligne\n" +
	"  sed 's/ancien/nouveau/g' F     remplace partout (g : global)\n" +
	"  sed 's/a/b/2' F                seulement la 2e occurrence ; 2g : à partir de la 2e\n" +
	"  sed -n '5,10p' F               affiche les lignes 5 à 10 (-n : rien d'autre)\n" +
	"  sed -n '/début/,/fin/p' F      de la ligne qui contient début à celle qui contient fin\n" +
	"  sed '/motif/d' F               supprime les lignes qui contiennent motif\n" +
	"  sed '1d;$d' F                  supprime la première et la dernière ligne ($ : la dernière)\n" +
	"  sed '/motif/!d' F              garde seulement ces lignes (! : l'inverse)\n" +
	"  sed -n '1~2p' F                une ligne sur deux ; 2,+3 : la 2e et les 3 suivantes\n" +
	"  sed '3a texte' F               ajoute une ligne après la 3e (i : avant, c : à la place)\n" +
	"  sed '/motif/{s/a/b/;s/c/d/}' F plusieurs commandes sur les mêmes lignes\n" +
	"  sed 'y/abc/xyz/' F             change a en x, b en y, c en z\n" +
	"  sed '5q' F                     s'arrête après la 5e ligne\n" +
	"  sed -n '$=' F                  le numéro de la dernière ligne (le nombre de lignes)\n" +
	"  sed -i 's/a/b/' F              modifie le fichier sur place\n" +
	"  sed -i.bak 's/a/b/' F          pareil, en gardant l'original dans F.bak\n" +
	"\n" +
	"Dans s///, & est le morceau trouvé et \\1 \\2... les groupes \\( \\) :\n" +
	"  sed 's/[0-9]\\+/[&]/' F                     met le premier nombre entre crochets\n" +
	"  sed 's/\\(.*\\):\\(.*\\)/\\2:\\1/' F            échange ce qui est avant et après « : »\n" +
	"  sed -E 's/(.*):(.*)/\\2:\\1/' F              pareil avec -E : ( ) sans barres obliques\n" +
	"  sed 's/.*/\\U&/' F                          tout en majuscules (\\L : minuscules)\n" +
	"\n" +
	"Sans -E, sed parle la langue « de base » (BRE), comme grep : \\( \\) \\{ \\} \\+ \\? \\|.\n" +
	"Les espaces de réserve, pour les experts : h H (garder), g G (reprendre), x (échanger),\n" +
	"n N (ligne suivante), P D. Exemple : sed -n '1!G;h;$p' F renverse le fichier.\n" +
	"\n" +
	"Sans -i, sed affiche le résultat et ne touche pas au fichier.");
MANUEL["awk"] = page("découper un texte en colonnes, filtrer, compter, calculer", "Aho, Weinberger et Kernighan",
	"Un programme awk est une suite de règles « motif { action } » : pour chaque ligne,\n" +
	"chaque règle dont le motif est vrai lance son action.\n" +
	"\n" +
	"  awk '{ print $1 }' F           la première colonne (séparées par des espaces)\n" +
	"  awk -F: '{ print $1, $3 }' F   colonnes séparées par des deux-points\n" +
	"  awk -F: '$3 == 0' /etc/passwd  les lignes dont la 3e colonne vaut 0\n" +
	"  awk '/ECHEC/ { print $4 }' F   la 4e colonne des lignes qui contiennent ECHEC\n" +
	"  awk 'NR == 2, NR == 5' F       de la 2e à la 5e ligne\n" +
	"  awk '{ n[$1]++ } END { for (k in n) print k, n[k] }' F    compte chaque valeur de la 1re colonne\n" +
	"  awk '{ s += $2 } END { print s, s / NR }' F                somme et moyenne de la 2e colonne\n" +
	"  awk -v seuil=10 '$2 > seuil' F                            une variable venue de la ligne de commande\n" +
	"  awk '!vu[$0]++' F              retire les doublons sans trier\n" +
	"\n" +
	"$0 est la ligne entière, $1 $2... ses colonnes, $NF la dernière, $(NF-1) l'avant-dernière.\n" +
	"NR est le numéro de la ligne, NF son nombre de colonnes, FILENAME l'objet lu.\n" +
	"FS et OFS : les séparateurs en entrée et en sortie ; BEGIN { FS = \":\" } équivaut à -F:.\n" +
	"Changer une colonne ($2 = \"x\") reconstruit la ligne avec OFS.\n" +
	"\n" +
	"Le langage : variables, tableaux t[cle], if/else, while, do, for (i = 1; i <= NF; i++),\n" +
	"for (k in t), next, exit, delete, et les fonctions length, substr, index, split,\n" +
	"sub, gsub, match, sprintf, toupper, tolower, int, sqrt... et les tiennes :\n" +
	"  awk 'function carre(x) { return x * x } { print carre($1) }' F\n" +
	"\n" +
	"  printf \"%-10s %5.2f\\n\", $1, $2     une sortie bien alignée (%s %d %f %x %c %%)\n" +
	"  print $1 > \"liste.txt\"              écrit dans un objet (>> : ajoute à la suite)");
MANUEL["tr"] = page("remplacer ou supprimer des caractères", "TRanslate",
	"  echo bonjour | tr a-z A-Z            BONJOUR\n" +
	"  cat F | tr '[:lower:]' '[:upper:]'   pareil, avec les classes de caractères\n" +
	"  cat F | tr -d ' '                    supprime les espaces\n" +
	"  cat F | tr -d '[:digit:]'            supprime les chiffres\n" +
	"  cat F | tr -s ' '                    resserre les espaces répétées en une seule\n" +
	"  cat F | tr '\\n' ' '                  met tout sur une ligne (\\n : le retour à la ligne, \\t : la tabulation)\n" +
	"  cat F | tr -c '[:alnum:]\\n' '_'      remplace tout ce qui n'est PAS une lettre ou un chiffre (-c : le complément)\n" +
	"  cat F | tr -cd '[:print:]'           ne garde que les caractères affichables\n" +
	"  cat F | tr 'A-Za-z' 'N-ZA-Mn-za-m'   ROT13 : chaque lettre décalée de 13\n" +
	"\n" +
	"Les classes : [:upper:] [:lower:] [:alpha:] [:digit:] [:alnum:] [:space:] [:punct:].\n" +
	"tr ne lit que l'entrée standard : il faut un tuyau, jamais un nom d'objet.");
MANUEL["rev"] = page("écrire chaque ligne à l'envers", "REVerse", "  rev FICHIER            chaque ligne renversée, de droite à gauche\n  echo bonjour | rev     ruojnob");
MANUEL["tee"] = page("écrire dans un fichier tout en affichant", "TEE (le raccord en T des plombiers)",
	"  commande | tee F          affiche ET enregistre dans F\n" +
	"  commande | tee -a F       ajoute à la fin de F\n" +
	"  commande | tee A B | wc -l   écrit dans A et dans B, et passe le texte au sort suivant\n" +
	"\n" +
	"Pratique pour garder une trace d'une enquête sans rien perdre à l'écran.");
MANUEL["nl"] = page("numéroter les lignes d'un texte", "Number Lines",
	"  nl F                     numérote les lignes non vides\n" +
	"  nl -ba F                 numérote toutes les lignes, vides comprises\n" +
	"  nl -w3 -s': ' F          numéros sur 3 colonnes, suivis de « : »\n" +
	"  nl -v 10 -i 5 F          commence à 10, de 5 en 5\n" +
	"\n" +
	"Proche de cat -n, mais plus réglable.");
MANUEL["fold"] = page("couper les lignes trop longues", "FOLD (plier)",
	"  fold -w 40 F             coupe chaque ligne tous les 40 caractères\n" +
	"  fold -s -w 40 F          coupe plutôt après une espace, pour ne pas casser les mots");
MANUEL["which"] = page("trouver où se trouve un programme", "WHICH", "  which nc               /usr/bin/nc\n\nUtile pour vérifier qu'on lance bien le vrai programme, et pas un piège déposé ailleurs.");
MANUEL["uname"] = page("voir le système et le noyau de la machine", "UNIX NAME", "  uname -a               tout : nom, version du noyau, architecture\n  uname -r               la version du noyau seulement");
MANUEL["dmesg"] = page("lire les messages du noyau", "Display MESsaGes",
	"  sudo dmesg             ce que le noyau a vu : matériel branché, erreurs...\n\nUne clé USB branchée y laisse toujours une trace.");
MANUEL["journalctl"] = page("lire le journal du système", "JOURNAL ConTroL",
	"  sudo journalctl                 tout le journal\n  sudo journalctl -u sshd         un seul service\n  sudo journalctl --since 03:00   à partir d'une heure\n  sudo journalctl -n 20           les 20 dernières lignes");
MANUEL["last"] = page("voir l'historique des connexions", "LAST (les dernières connexions)", "  last                   qui s'est connecté, d'où, et quand\n  last corbeau           seulement un utilisateur\n  last -n 5              les 5 dernières");
MANUEL["who"] = page("voir qui est connecté en ce moment", "WHO", "  who                    les sessions ouvertes sur cette machine, avec leur provenance");
MANUEL["lsof"] = page("voir les fichiers et connexions ouverts par les processus", "LiSt Open Files",
	"  sudo lsof -i :6666     qui utilise le port 6666\n  sudo lsof -i           toutes les connexions réseau\n  sudo lsof -p PID       tout ce qu'un processus a ouvert\n\nSous Linux, tout est fichier : une connexion réseau aussi.");
MANUEL["pgrep"] = page("trouver le PID d'un processus par son nom", "Process GREP", "  pgrep sshd             les PID des processus dont le nom contient sshd\n  pgrep -l -u corbeau    ceux de l'utilisateur corbeau, avec leur nom\n  pgrep -a -u corbeau    avec leur ligne de commande entière (sshd: corbeau@pts/1...)");
MANUEL["pkill"] = page("arrêter des processus par leur nom", "Process KILL",
	"  pkill NOM              envoie TERM à tous les processus qui portent ce nom\n  sudo pkill -u corbeau  arrête tous ceux d'un utilisateur\n  pkill -9 NOM           sans négocier");
MANUEL["systemctl"] = page("gérer les services de la machine", "SYSTEM ConTroL",
	"  systemctl list-units           les services\n  systemctl status NOM           son état\n  sudo systemctl stop NOM        l'arrêter\n  sudo systemctl disable NOM     ne plus le lancer au démarrage\n  sudo systemctl disable --now NOM   les deux d'un coup\n\n" +
	"Un service marqué Restart=always revient tout seul si on tue son processus : il faut l'arrêter avec systemctl.");
MANUEL["userdel"] = page("supprimer un compte", "USER DELete", "  sudo userdel NOM       supprime le compte (refusé tant qu'il a des processus)");
MANUEL["usermod"] = page("modifier un compte (bloquer son mot de passe, ses groupes)", "USER MODify",
	"  sudo usermod -L NOM          bloque le MOT DE PASSE du compte (-U pour le débloquer)\n" +
	"  sudo usermod -aG GROUPE NOM  ajouter NOM au GROUPE\n" +
	"  sudo usermod -rG GROUPE NOM  le retirer du GROUPE (seulement sur les systèmes récents)\n\n" +
	"Attention : -L ne bloque pas les clés SSH. Un compte verrouillé ainsi entre encore par clé.\n" +
	"Pour tout couper : sudo chage -E 0 NOM (le compte expire). Pour retirer d'un groupe, partout : sudo gpasswd -d NOM GROUPE.");
MANUEL["groups"] = page("voir les groupes d'un utilisateur", "GROUPS", "  groups                 tes groupes\n  groups corbeau         ceux d'un autre\n\nÊtre dans le groupe sudo, c'est pouvoir devenir root.");
MANUEL["visudo"] = page("modifier les droits sudo sans risque", "VIsual SUDO",
	"  sudo visudo            ouvre /etc/sudoers dans l'éditeur\n\nvisudo vérifie la syntaxe avant d'enregistrer : une faute dans sudoers peut priver\ntout le monde de sudo. On ne modifie jamais ce fichier autrement.");
MANUEL["ip"] = page("voir les adresses réseau de la machine", "IP (le protocole Internet)", "  ip a                   les interfaces et leurs adresses\n  ip r                   les routes (par où sortent les paquets)");
MANUEL["traceroute"] = page("voir le chemin des paquets jusqu'à une machine", "TRACE ROUTE", "  traceroute web         chaque routeur traversé, et le temps de réponse");
MANUEL["dig"] = page("interroger le DNS", "Domain Information Groper",
	"  dig web.cybersup.lan       l'adresse d'un nom\n  dig +short web.cybersup.lan   seulement la réponse\n  dig -x 10.0.92.10          le nom d'une adresse (recherche inverse)\n\nLe DNS traduit les noms en adresses. Le falsifier, c'est détourner tout le monde.");
MANUEL["nmap"] = page("découvrir les machines et leurs ports ouverts", "Network MAPper",
	"  nmap 10.0.92.0/24      toutes les machines du réseau de l'école\n  nmap web               les ports ouverts d'une machine\n\n" +
	"On ne scanne JAMAIS un réseau sans l'autorisation de son propriétaire : c'est illégal.\nIci, l'école t'y autorise pour la mission.");
MANUEL["nc"] = page("ouvrir une connexion brute vers un port", "NetCat", "  nc mail 25             se connecter au port 25 et lire la bannière\n  nc -z web 80           tester seulement si le port répond");
MANUEL["curl"] = page("lire une page web en ligne de commande", "Client URL",
	"  curl http://web/              la page d'accueil\n  curl http://web/robots.txt    un fichier précis\n  curl -I http://web/           seulement les en-têtes\n  curl -o page.html http://web/ enregistre dans un fichier");
MANUEL["ufw"] = page("régler le pare-feu", "Uncomplicated FireWall",
	"  sudo ufw status [numbered]       les règles\n  sudo ufw route deny from 10.0.92.47   empêcher une adresse de TRAVERSER le pare-feu\n  sudo ufw deny from 10.0.92.47    l'empêcher de joindre le pare-feu lui-même\n  sudo ufw allow 22                autoriser un port\n  sudo ufw enable                  activer le pare-feu\n  sudo ufw delete N                retirer la règle N");
MANUEL["scp"] = page("copier un fichier vers ou depuis une autre machine", "Secure CoPy",
	"  scp FICHIER sauvegarde:/preuves/      copie vers une machine\n  scp web:/var/log/access.log .         copie depuis une machine\n\nscp passe par ssh : mêmes comptes, mêmes clés.");
MANUEL["ssh-copy-id"] = page("installer sa clé publique sur une machine", "SSH COPY IDentity",
	"  ssh-copy-id MACHINE    ajoute ta clé publique (~/.ssh/id_ed25519.pub)\n                         aux clés autorisées de ton compte sur MACHINE\n\nEnsuite, ssh MACHINE ne demande plus de mot de passe.");
MANUEL["gpg"] = page("chiffrer et déchiffrer des fichiers", "GNU Privacy Guard",
	"  gpg -d FICHIER.gpg             déchiffre (demande la phrase de passe)\n  gpg -d F.gpg -o F              déchiffre dans un fichier\n  gpg -c FICHIER                 chiffre avec une phrase de passe -> FICHIER.gpg\n\n" +
	"Contrairement à base64, c'est un vrai chiffrement : sans la phrase de passe, rien à faire.");
MANUEL["vim"] = page("modifier un fichier avec l'éditeur des serveurs", "VI IMproved",
	"vim a des MODES. Au départ, on est en mode normal : les touches sont des commandes.\n\n" +
	"  i          passer en mode insertion (on écrit) ; Échap pour revenir\n  a / A      insérer après le curseur / à la fin de la ligne\n  o / O      ouvrir une ligne dessous / dessus\n" +
	"  h j k l    gauche, bas, haut, droite (les flèches marchent aussi)\n  w / b      mot suivant / précédent ;  0 / $  début / fin de ligne\n  gg / G     première / dernière ligne\n" +
	"  x          supprimer un caractère ;  dw  un mot ;  dd  une ligne ;  D  jusqu'à la fin\n  u          annuler ;  p  coller ce qu'on a supprimé ;  yy  copier une ligne\n" +
	"  r X        remplacer un caractère par X ;  cw  changer un mot\n  /mot       chercher ;  n  suivant ;  N  précédent\n  3dd, 2w    un nombre devant répète la commande\n\n" +
	"  :w         enregistrer ;  :q  quitter ;  :wq  les deux ;  :q!  quitter sans enregistrer\n  :s/a/b/g   remplacer sur la ligne ;  :%s/a/b/g  dans tout le fichier\n\n" +
	"Pour apprendre pas à pas : les leçons du labo (/home/etudiant/vimtuteur).");

var SORTS_CYBER = ["strings", "file", "xxd", "md5sum", "sha1sum", "stat", "chattr", "lsattr", "gzip", "gunzip", "zcat",
	"sed", "awk", "tr", "rev", "tee", "which", "uname", "dmesg", "journalctl", "last", "who", "lsof", "pgrep", "pkill",
	"systemctl", "userdel", "usermod", "groups", "visudo", "ip", "traceroute", "dig", "nmap", "nc", "curl", "ufw", "scp",
	"ssh-copy-id", "gpg", "vim"];
ORDRE_DES_SORTS_2 = ORDRE_DES_SORTS_2.concat(SORTS_CYBER);
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_CYBER.indexOf(c) === -1 && c !== "vi"; });
