/**
 * SortsCrypte.js : les sorts de chasse du chapitre 3 (la Crypte, numéro 2 dans le code).
 *
 * Le carnet de Grace (CitadelleLog/CarnetDeTraque) : lastb, lastlog, w, chage, fail2ban-client.
 * La trousse d'Evi (Crypte/TrousseDEvi) : clamscan, rkhunter, debsums, exiftool, getfacl, setfacl.
 * Tous défensifs : ils lisent les traces de l'intrus, ou lui ferment une porte.
 */

function queteCrypte(id){
	if (state.has("crypteOuverte")) state.complete(id);
}
function extrasCrypte(){
	state.reseau.chasse = state.reseau.chasse || { bannis: [], aclRetiree: false };
	return state.reseau.chasse;
}
function exigerRoot(io, sort, message){
	if (!io.sudo) throw new ShellError(message + "\n" + C.gris("(Ce registre est réservé à root : sudo " + sort + " ...)"));
}

/* ------------------------------------------------------------------ */
/* Les registres de connexion : lastb, lastlog, w                       */
/* ------------------------------------------------------------------ */

/* La minute qui précède la première connexion du Corbeau : les essais ratés. */
function minuteAvant(heure, n){
	var m = heure.split(":"), total = (+m[0]) * 60 + (+m[1]) - n;
	return deuxChiffres(Math.floor(total / 60)) + ":" + deuxChiffres(total % 60);
}

Shell.sorts.lastb = function(args, io){
	exigerRoot(io, "lastb", "lastb: /var/log/btmp: Permission denied");
	var h = Shell.hote(), lignes = [];
	if (h === "citadelle"){
		[["root", 4], ["admin", 4], ["root", 3], ["test", 3], ["root", 2], ["laurent", 2], ["root", 1]].forEach(function(e){
			lignes.push(completerDroite(e[0], 9) + completerDroite("ssh:notty", 13) + completerDroite(IP_LABO, 17) + dateDuJour() + " " + minuteAvant(HEURE_PREMIERE, e[1]) + " - " + minuteAvant(HEURE_PREMIERE, e[1]) + "  (00:00)");
		});
	} else if (h === "labo"){
		lignes.push(completerDroite("stagiaire", 9) + completerDroite("ssh:notty", 13) + completerDroite(ADRESSE_POSTE_CORBEAU, 17) + dateDuJour() + " " + minuteAvant(HEURE_PREMIERE, 9) + " - " + minuteAvant(HEURE_PREMIERE, 9) + "  (00:00)");
	}
	lignes.push("", "btmp begins " + dateDuJour() + " 00:00");
	if (io.tty && h === "citadelle") lignes.push(C.gris("(Sept échecs en quatre minutes depuis le labo, puis, à " + HEURE_PREMIERE + ", une connexion RÉUSSIE de corbeau par clé (last). Il a d'abord essayé de deviner, puis il a trouvé mieux.)"));
	GameEvents.fire({ type: "lastb", host: h });
	if (h === "citadelle") queteCrypte("s_c_lastb");
	return lignes.join("\n");
};

Shell.sorts.lastlog = function(args, io){
	var h = Shell.hote(), passwd = fichierSysteme("passwd");
	var qui = args.indexOf("-u") > -1 ? args[args.indexOf("-u") + 1] : null;
	var comptes = passwd ? lignesDe(passwd.getText()).map(function(l){ return l.split(":")[0]; }).filter(Boolean) : ["root", JOUEUR];
	var connus = {};
	if (h === "citadelle"){
		connus["laurent"] = ["pts/0", "10.0.92.1", "09:00"];
		connus["sorcier"] = ["pts/2", "10.0.92.1", "08:15"];
		connus["corbeau"] = ["pts/1", IP_LABO, HEURE_PREMIERE];
	} else if (h === "labo"){
		connus["corbeau"] = ["pts/1", ADRESSE_POSTE_CORBEAU, HEURE_PREMIERE];
		connus["stagiaire"] = ["pts/2", ADRESSE_POSTE_CORBEAU, "hier 18:40"];
		connus["etudiant"] = ["pts/1", "10.0.92.1", "hier 14:00"];
	}
	connus[JOUEUR] = ["pts/0", "10.0.92.1", "09:30"];
	if (comptes.indexOf(JOUEUR) === -1) comptes.push(JOUEUR);
	if (qui) comptes = comptes.filter(function(c){ return c === qui; });
	if (qui && !comptes.length) throw new ShellError("lastlog: Unknown user or range: " + qui);
	var lignes = [completerDroite("Username", 17) + completerDroite("Port", 9) + completerDroite("From", 17) + "Latest"];
	comptes.forEach(function(c){
		var x = connus[c];
		lignes.push(completerDroite(c, 17) + (x ? completerDroite(x[0], 9) + completerDroite(x[1], 17) + (/hier/.test(x[2]) ? x[2] : dateDuJour() + " " + x[2]) : "**Never logged in**"));
	});
	if (io.tty && h === "citadelle" && comptes.indexOf(COMPTE_CACHE) > -1) lignes.push(C.gris("(" + COMPTE_CACHE + " ne s'est jamais connecté : un compte de secours que le Corbeau gardait « au cas où ». Jamais servi, mais root quand même.)"));
	GameEvents.fire({ type: "lastlog", host: h });
	if (h === "citadelle") queteCrypte("s_c_lastlog");
	return lignes.join("\n");
};

Shell.sorts.w = function(args, io){
	var h = Shell.hote(), info = infoHote(h);
	var sessions = [{ qui: JOUEUR, tty: "pts/0", depuis: "10.0.92.1", heure: "09:12", quoi: "w", idle: "0.00s" }];
	(typeof info.sessions === "function" ? info.sessions() : []).forEach(function(s){
		sessions.push({ qui: s.qui, tty: s.tty, depuis: s.depuis.replace(/[()]/g, ""), heure: s.heure || "09:12", quoi: s.qui === "corbeau" ? "-bash" : "-", idle: "5:41m" });
	});
	var lignes = [" " + formaterDate(new Date(), ["+%T"]) + " up 12 days,  3:07,  " + sessions.length + (sessions.length > 1 ? " users" : " user") + ",  load average: 0,41, 0,22, 0,18",
		completerDroite("USER", 9) + completerDroite("TTY", 9) + completerDroite("FROM", 17) + completerDroite("LOGIN@", 8) + completerDroite("IDLE", 7) + "WHAT"];
	sessions.forEach(function(s){
		lignes.push(completerDroite(s.qui, 9) + completerDroite(s.tty, 9) + completerDroite(s.depuis, 17) + completerDroite(s.heure, 8) + completerDroite(s.idle, 7) + s.quoi);
	});
	if (io.tty && sessions.some(function(s){ return s.qui === "corbeau"; })) lignes.push(C.gris("(corbeau est connecté depuis " + HEURE_PREMIERE + ", inactif depuis des heures : une session laissée ouverte, prête à resservir.)"));
	GameEvents.fire({ type: "w", host: h, n: sessions.length });
	if (h === "labo") queteCrypte("s_c_w");
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* chage : l'âge des mots de passe, l'expiration des comptes            */
/* ------------------------------------------------------------------ */

function dateDesJours(jours){
	if (jours === "" || jours === undefined) return "never";
	var d = new Date(Date.UTC(1970, 0, 1) + (+jours) * 86400000);
	return MOIS_ANGLAIS[d.getUTCMonth()] + " " + deuxChiffres(d.getUTCDate()) + ", " + d.getUTCFullYear();
}

Shell.sorts.chage = function(args, io){
	var liste = args.indexOf("-l") > -1, expire = null;
	var ie = args.indexOf("-E");
	if (ie > -1) expire = args[ie + 1];
	var qui = args.filter(function(a, i){ return a.charAt(0) !== "-" && args[i - 1] !== "-E"; })[0];
	if (!qui || (!liste && expire === null)) throw new ShellError("Utilisation : chage -l NOM (lire), sudo chage -E 0 NOM (faire expirer le compte tout de suite)");
	var shadow = fichierSysteme("shadow");
	if (!shadow) throw new ShellError("chage : cette machine n'a pas de comptes à gérer ici.");
	if (!io.sudo && qui !== JOUEUR) throw new ShellError("chage: Permission denied.\n" + C.gris("(Lire le compte d'un autre demande sudo : sudo chage -l " + qui + ")"));
	var lignes = lignesDe(shadow.getText());
	var n = -1;
	lignes.forEach(function(l, i){ if (l.split(":")[0] === qui) n = i; });
	if (n === -1) throw new ShellError("chage: user '" + qui + "' does not exist in /etc/shadow");
	var champs = lignes[n].split(":");
	while (champs.length < 9) champs.push("");
	var h = Shell.hote();
	if (expire !== null){
		if (!io.sudo) throw new ShellError("chage: Permission denied.\n" + C.gris("(sudo chage -E 0 " + qui + ")"));
		if (qui === "root" || qui === "laurent") throw new ShellError("chage : faire expirer " + qui + " fermerait la Citadelle à ceux qui la gardent. Vise le compte de l'intrus.");
		var jours = expire === "-1" ? "" : (/^\d+$/.test(expire) ? expire : null);
		if (jours === null) throw new ShellError("chage : -E attend un nombre de jours depuis 1970 (0 : tout de suite), ou -1 pour « jamais ».");
		champs[7] = jours;
		lignes[n] = champs.join(":");
		shadow.setText(lignes.join("\n"));
		GameEvents.fire({ type: "chage", host: h, qui: qui, expire: jours });
		if (qui === "corbeau" && jours === "0" && h === "citadelle") queteCrypte("s_c_chage");
		return io.tty ? C.vert(jours === "" ? "Le compte " + qui + " n'expire plus." : "Le compte " + qui + " a expiré" + (jours === "0" ? " (au 1er janvier 1970, autant dire depuis toujours)" : "") + " : il ne peut plus ouvrir de session, même par clé SSH.") : "";
	}
	GameEvents.fire({ type: "chage", host: h, qui: qui, lecture: true });
	return [["Last password change", champs[2] ? dateDesJours(champs[2]) : "never"], ["Password expires", champs[4] && champs[4] !== "99999" && champs[2] ? dateDesJours(+champs[2] + (+champs[4])) : "never"],
		["Password inactive", "never"], ["Account expires", champs[7] === "" ? "never" : dateDesJours(champs[7])],
		["Minimum number of days between password change", champs[3] || "0"], ["Maximum number of days between password change", champs[4] || "99999"],
		["Number of days of warning before password expires", champs[5] || "7"]].map(function(x){ return completerDroite(x[0], 56) + ": " + x[1]; }).join("\n");
};

/* ------------------------------------------------------------------ */
/* fail2ban : le gardien des portes                                     */
/* ------------------------------------------------------------------ */

Shell.sorts["fail2ban-client"] = function(args, io){
	var h = Shell.hote();
	if (h !== "citadelle") throw new ShellError("fail2ban-client : fail2ban ne veille que sur la Citadelle (ssh citadelle).");
	exigerRoot(io, "fail2ban-client", "ERROR  Permission denied to socket: /var/run/fail2ban/fail2ban.sock, (you must be root)");
	var c = extrasCrypte(), phrase = args.join(" ");
	GameEvents.fire({ type: "fail2ban", args: args });
	if (!args.length || phrase === "status") return "Status\n|- Number of jail:\t1\n`- Jail list:\tsshd";
	if (phrase === "status sshd"){
		return "Status for the jail: sshd\n|- Filter\n|  |- Currently failed:\t0\n|  |- Total failed:\t0\n|  `- Journal matches:\t_SYSTEMD_UNIT=sshd.service\n" +
			"`- Actions\n   |- Currently banned:\t" + c.bannis.length + "\n   |- Total banned:\t" + c.bannis.length + "\n   `- Banned IP list:\t" + c.bannis.join(" ") +
			(io.tty && !c.bannis.length ? "\n" + C.gris("(Personne n'est banni : Evi n'a installé fail2ban que ce matin, après l'intrusion. Il n'a rien vu de la nuit ; les sept échecs, c'est lastb qui les garde. Désormais, cinq échecs en dix minutes valent un bannissement automatique.)") : "");
	}
	var m = /^set sshd (banip|unbanip) (\S+)$/.exec(phrase);
	if (!m) throw new ShellError("fail2ban-client : utilisation ici : status, status sshd, set sshd banip ADRESSE, set sshd unbanip ADRESSE");
	var ip = m[2];
	if (!ipValide(ip)) throw new ShellError("fail2ban-client : « " + ip + " » n'est pas une adresse IP.");
	if (m[1] === "unbanip"){
		c.bannis = c.bannis.filter(function(x){ return x !== ip; });
		return "1";
	}
	if (ip === "10.0.92.1") throw new ShellError("fail2ban-client : 10.0.92.1, c'est la passerelle de l'école : tu te bannirais toi-même, avec tout le monde.");
	if (c.bannis.indexOf(ip) === -1) c.bannis.push(ip);
	var texte = "1";
	if (io.tty && ip === IP_LABO) texte += "\n" + C.jaune("(Attention : le labo sert à tous les étudiants. Le bannir les prive tous de la Citadelle. L'intrus, c'est le poste d'où il vient.)");
	if (ip === ADRESSE_POSTE_CORBEAU) queteCrypte("s_c_fail2ban");
	return texte;
};

/* ------------------------------------------------------------------ */
/* clamscan, rkhunter, debsums : les chiens de chasse                   */
/* ------------------------------------------------------------------ */

/* Les charges connues du Chien de Chasse : un fichier, sa signature. */
function signatureMalveillante(item){
	if (item === PagePiegee) return "Php.Webshell.Corbeau-1";
	if (item.itemname === "message-0042.eml" && item.getText().indexOf("renouvellement.pdf.sh") > -1) return "Email.Phishing.ShScript-2";
	if (item === PorteDerobee && /s/.test(item.mode.charAt(2))) return "Unix.Backdoor.SuidShell-7";
	if (item === Gardien && item.getText().indexOf("charge=") > -1) return "Unix.Trojan.Gardien-1";
	return null;
}
function parcourirLieu(lieu, recursif, chemin, sortie, garde){
	garde = garde || { n: 0 };
	if (garde.n++ > 400) return sortie;
	lieu.items.forEach(function(item){ sortie.push({ item: item, chemin: chemin + "/" + item.itemname }); });
	if (recursif) lieu.children.forEach(function(enfant){
		if (enfant.parents[0] === lieu) parcourirLieu(enfant, true, chemin + "/" + enfant.room_name, sortie, garde);
	});
	return sortie;
}

Shell.sorts.clamscan = function(args, io){
	var recursif = args.indexOf("-r") > -1, seulementInfectes = args.indexOf("-i") > -1;
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var fichiers = [];
	(cibles.length ? cibles : ["."]).forEach(function(c){
		var r = Shell.chercher(c, io, "clamscan");
		if (r.node === null) throw new ShellError(c + ": No such file or directory. ERROR");
		if (r.node instanceof Room) parcourirLieu(r.node, recursif, c === "." ? "." : c.replace(/\/$/, ""), fichiers);
		else fichiers.push({ item: r.node, chemin: c });
	});
	var lignes = [], infectes = 0;
	fichiers.forEach(function(f){
		var sig = signatureMalveillante(f.item);
		if (sig){ infectes++; lignes.push(f.chemin + ": " + (io.tty ? C.rouge(sig + " FOUND") : sig + " FOUND")); }
		else if (!seulementInfectes && fichiers.length <= 15) lignes.push(f.chemin + ": OK");
	});
	if (!seulementInfectes && fichiers.length > 15 && io.tty) lignes.push(C.gris("(" + (fichiers.length - infectes) + " fichiers sains, non listés.)"));
	lignes.push("", "----------- SCAN SUMMARY -----------", "Known viruses: 8697542", "Scanned directories: " + (cibles.length || 1),
		"Scanned files: " + fichiers.length, "Infected files: " + infectes);
	if (io.tty && !io.sudo && fichiers.some(function(f){ return f.item.mode && f.item.mode.charAt(6) !== "r"; })) lignes.push(C.gris("(Sans sudo, les fichiers fermés aux autres ne sont qu'effleurés : sudo clamscan -r renifle tout.)"));
	if (io.tty && infectes) lignes.push(C.gris("(clamscan reconnaît, il ne soigne pas. Chaque charge trouvée doit être retirée à la main, et comprise.)"));
	GameEvents.fire({ type: "clamscan", infectes: infectes });
	if (infectes) queteCrypte("s_c_clamscan");
	return lignes.join("\n");
};

Shell.sorts.rkhunter = function(args, io){
	if (args.indexOf("--check") === -1 && args.indexOf("-c") === -1) throw new ShellError("rkhunter : utilisation ici : sudo rkhunter --check");
	exigerRoot(io, "rkhunter", "You must be the root user to run this program.");
	if (Shell.hote() !== "citadelle") throw new ShellError("rkhunter : ici, le Chasseur de Rootkits garde la Citadelle : ssh citadelle.");
	function ligne(texte, alerte){ return "  " + completerDroite(texte, 44) + "[ " + (alerte ? (io.tty ? C.rouge("Warning") : "Warning") : (io.tty ? C.vert("OK") : "OK")) + " ]"; }
	var uid0 = /^maintenance:/m.test(PasswdCitadelle.getText());
	var porte = Caveau.hasItem(PorteDerobee) && /s/.test(PorteDerobee.mode.charAt(2));
	var gardien = Gardien.getText().indexOf("charge=") > -1;
	var kworker = !!procCorbeau();
	var cle = AuthorizedKeys.getText().indexOf("corbeau@nid") > -1;
	var alertes = [uid0, porte, gardien, kworker, cle].filter(Boolean).length;
	var lignes = ["[ Rootkit Hunter version 1.4.6 ]", "", "Checking system commands...",
		ligne("/Crypte/bin/gardien", gardien), ligne("/Crypte/bin/portier", false), ligne("/Crypte/bin/passwd (SUID attendu)", false),
		"", "Checking for rootkits...", ligne("Fichiers et dossiers cachés (/tmp/.cache)", true), ligne("Programmes SUID inattendus", porte),
		ligne("Processus déguisés (faux kworker)", kworker), ligne("Port dérobé " + PORT_CORBEAU + "/tcp", kworker),
		"", "Checking accounts and keys...", ligne("Comptes d'UID 0 autres que root", uid0), ligne("Clés SSH inconnues chez root", cle),
		"", "System checks summary", "=====================", "Possible rootkits: " + (kworker || porte ? 1 : 0), "Warnings: " + (alertes + 1)];
	if (io.tty) lignes.push(C.gris(alertes ? "(Chaque Warning est une porte que le Corbeau a laissée. /tmp/.cache restera signalé : c'est là que dorment ses notes, des preuves." + (gardien ? " Et gardien restera signalé tant qu'on ne l'aura pas réinstallé depuis son paquet d'origine : c'est le travail d'Evi, après l'enquête." : "") + ")" :
		"(Plus une porte ouverte : il ne reste que /tmp/.cache, la cachette où dorment les preuves.)"));
	GameEvents.fire({ type: "rkhunter", alertes: alertes });
	queteCrypte("s_c_rkhunter");
	return lignes.join("\n");
};

Shell.sorts.debsums = function(args, io){
	if (Shell.hote() !== "citadelle") throw new ShellError("debsums : ici, seuls les programmes de la Citadelle ont un registre d'origine (ssh citadelle).");
	var changes = args.indexOf("-c") > -1;
	var etat = [["/Crypte/bin/gardien", Gardien.getText() !== TEXTE_GARDIEN_ORIGINAL], ["/Crypte/bin/portier", Portier.getText() !== TEXTE_PORTIER],
		["/Crypte/bin/veilleur", Veilleur.getText() !== TEXTE_VEILLEUR], ["/Crypte/bin/passwd", false]];
	GameEvents.fire({ type: "debsums", changes: changes });
	var modifies = etat.filter(function(e){ return e[1]; });
	if (modifies.some(function(e){ return e[0] === "/Crypte/bin/gardien"; })) queteCrypte("s_c_debsums");
	if (changes) return modifies.map(function(e){ return e[0]; }).join("\n") + (io.tty ? "\n" + C.gris(modifies.length ? "(debsums -c ne liste que les fichiers qui ne sont plus tels que le paquet les a installés. Même idée que sha256sum -c, sans avoir à tenir la liste soi-même.)" : "(Tous les programmes sont tels qu'installés.)") : "");
	return etat.map(function(e){ return completerDroite(e[0], 60) + (e[1] ? (io.tty ? C.rouge("FAILED") : "FAILED") : "OK"); }).join("\n");
};

/* ------------------------------------------------------------------ */
/* exiftool : ce qu'une photo dit d'elle-même                           */
/* ------------------------------------------------------------------ */

Shell.sorts.exiftool = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("exiftool : quel fichier ? Utilisation : exiftool FICHIER");
	var t = Shell.objetLisible(cible, io, "exiftool");
	var item = t.item, nom = item.itemname;
	function champ(c, v){ return completerDroite(c, 32) + ": " + v; }
	var lignes = [champ("ExifTool Version Number", "12.57"), champ("File Name", nom), champ("File Size", item.format === "png" ? "1.2 MB" : Math.max(1, item.getText().length) + " bytes"),
		champ("File Permissions", "-" + (item.mode || "rw-r--r--"))];
	if (item.format === "png"){
		lignes.push(champ("File Type", "PNG"), champ("MIME Type", "image/png"), champ("Image Size", "640x480"),
			champ("Make", "Appareil du BDE"), champ("Camera Model Name", "PhotoBox 3"), champ("Artist", "BDE Cybersup"), champ("Create Date", "2026:09:01 10:42:00"),
			champ("GPS Latitude", "48 deg 53' 4.20\" N"), champ("GPS Longitude", "2 deg 14' 18.60\" E"), champ("GPS Position", "48 deg 53' 4.20\" N, 2 deg 14' 18.60\" E"));
		if (io.tty) lignes.push(C.gris("(Ces coordonnées tombent à Puteaux, devant l'école. Une photo garde souvent l'appareil, la date et l'endroit exact où elle a été prise. Avant de publier, on retire ces métadonnées : exiftool -all= FICHIER.)"));
		if (nom === "photo-promo.png") queteCrypte("s_c_exif");
	} else if (item.gzip){
		lignes.push(champ("File Type", "GZIP"), champ("File Type Extension", "gz"), champ("MIME Type", "application/x-gzip"), champ("Compression", "Deflated"),
			champ("Archived File Name", item.gzip.nom || nom));
		if (io.tty && /\.(jpg|jpeg|png)$/.test(nom)) lignes.push(C.jaune("Warning                         : File has wrong extension (should be GZ)"),
			C.gris("(L'extension ment : ce n'est pas une image, c'est une archive compressée. exiftool lit le contenu, pas le nom.)"));
	} else if (item.binaire){
		lignes.push(champ("File Type", "ELF executable"), champ("MIME Type", "application/octet-stream"), champ("CPU Architecture", "64 bit"));
	} else {
		lignes.push(champ("File Type", "TXT"), champ("MIME Type", "text/plain"), champ("Line Count", lignesDe(item.getText()).length));
	}
	GameEvents.fire({ type: "exiftool", item: item });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* getfacl, setfacl : les droits cachés                                 */
/* ------------------------------------------------------------------ */

function aclCorbeau(noeud){ return noeud === WebUploads && !extrasCrypte().aclRetiree; }

Shell.sorts.getfacl = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("Usage: getfacl FICHIER...   (les droits classiques, et les permissions en plus)");
	var r = Shell.chercher(cible, io, "getfacl");
	if (r.node === null) throw new ShellError("getfacl: " + cible + ": No such file or directory");
	var n = r.node, mode = n.mode || "rw-r--r--", proprio = n.owner || "root";
	var lignes = ["# file: " + cible.replace(/^\/+/, "").replace(/\/$/, ""), "# owner: " + proprio, "# group: " + proprio,
		"user::" + mode.substring(0, 3).replace(/s/, "x").replace(/t/, "x")];
	if (aclCorbeau(n)) lignes.push(io.tty ? C.rouge("user:corbeau:rwx") : "user:corbeau:rwx");
	lignes.push("group::" + mode.substring(3, 6).replace(/s/, "x"));
	if (aclCorbeau(n)) lignes.push("mask::rwx");
	lignes.push("other::" + mode.substring(6, 9).replace(/t/, "x"));
	if (io.tty && aclCorbeau(n)) lignes.push(C.gris("(user:corbeau:rwx : le Corbeau s'est donné le droit d'écrire dans ce dossier, en plus des droits que montre ls -l. C'est ainsi qu'il y a déposé maj.php. sudo setfacl -x u:corbeau " + cible + " le retire.)"));
	GameEvents.fire({ type: "getfacl", noeud: n });
	if (aclCorbeau(n)) queteCrypte("s_c_acl");
	return lignes.join("\n");
};

Shell.sorts.setfacl = function(args, io){
	var ix = args.indexOf("-x");
	if (ix === -1 || args.length < ix + 3) throw new ShellError("setfacl : utilisation ici : sudo setfacl -x u:NOM CHEMIN (retirer une permission en plus)");
	var entree = args[ix + 1], cible = args[ix + 2];
	if (!io.sudo) throw new ShellError("setfacl: " + cible + ": Operation not permitted\n" + C.gris("(sudo setfacl -x " + entree + " " + cible + ")"));
	var r = Shell.chercher(cible, io, "setfacl");
	if (r.node === null) throw new ShellError("setfacl: " + cible + ": No such file or directory");
	var m = /^(u|user):([a-z_-]+)$/.exec(entree);
	if (!m) throw new ShellError("setfacl: Option -x: Invalid argument near character 1");
	GameEvents.fire({ type: "setfacl", noeud: r.node, qui: m[2] });
	if (m[2] === "corbeau" && aclCorbeau(r.node)){
		extrasCrypte().aclRetiree = true;
		queteCrypte("s_c_setfacl");
		return io.tty ? C.vert("La permission cachée du Corbeau sur " + cible + " a disparu. getfacl le confirme.") : "";
	}
	return "";
};

/* ------------------------------------------------------------------ */
/* Le manuel et l'ordre des sorts                                      */
/* ------------------------------------------------------------------ */

MANUEL["lastb"] = page("lister les connexions ratées", "LAST Bad logins",
	"  sudo lastb             les tentatives de connexion échouées, les plus récentes en haut\n  sudo lastb -n 5        les cinq dernières\n\n" +
	"Une rafale d'échecs depuis la même adresse, c'est quelqu'un qui devine des mots de passe (une attaque par force brute).");
MANUEL["lastlog"] = page("la dernière connexion de chaque compte", "LAST LOGin",
	"  lastlog                chaque compte, et sa dernière connexion\n  lastlog -u NOM         un seul compte\n\n" +
	"« **Never logged in** » sur un compte qui a pourtant un shell : un compte dormant, à surveiller (ou à supprimer).");
MANUEL["w"] = page("qui est connecté, et ce qu'il fait", "W (who, et ce qu'il fait)",
	"  w                      la charge de la machine, puis une ligne par session : utilisateur, d'où, depuis quand, inactif depuis, commande\n\n" +
	"who dit qui est là ; w dit aussi ce qu'il fait. Une session inactive depuis des heures peut être une porte laissée ouverte.");
MANUEL["chage"] = page("l'âge des mots de passe et l'expiration des comptes", "CHange AGE",
	"  sudo chage -l NOM      dernier changement de mot de passe, expiration du compte\n  sudo chage -E 0 NOM    faire expirer le compte tout de suite (plus de connexion possible)\n  sudo chage -E -1 NOM   le compte n'expire plus\n\n" +
	"Faire expirer un compte le bloque sans le supprimer : ses fichiers restent là pour l'enquête.");
MANUEL["fail2ban-client"] = page("bannir les adresses qui attaquent", "FAIL 2 BAN",
	"  sudo fail2ban-client status sshd                 la prison de ssh : échecs vus, adresses bannies\n" +
	"  sudo fail2ban-client set sshd banip ADRESSE      bannir une adresse\n  sudo fail2ban-client set sshd unbanip ADRESSE    la libérer\n\n" +
	"fail2ban lit les journaux et bannit tout seul une adresse qui accumule les échecs. On peut aussi bannir à la main.");
MANUEL["clamscan"] = page("chercher les fichiers malveillants connus", "CLAM antivirus SCAN",
	"  clamscan FICHIER       examiner un fichier\n  sudo clamscan -r DOSSIER   tout un dossier, sous-dossiers compris\n  clamscan -i -r DOSSIER     n'afficher que les fichiers infectés\n\n" +
	"clamscan reconnaît des signatures : des charges déjà connues. Un outil sur mesure peut lui échapper.");
MANUEL["rkhunter"] = page("chercher les traces d'un rootkit", "RootKit HUNTER",
	"  sudo rkhunter --check  vérifie les programmes du système, les SUID, les fichiers cachés, les comptes d'UID 0, les ports\n\n" +
	"Un rootkit est un ensemble d'outils qui cache un intrus devenu root. Chaque « Warning » est une piste à vérifier à la main.");
MANUEL["debsums"] = page("vérifier que les programmes sont tels qu'installés", "DEB SUMS",
	"  debsums                tous les programmes, OK ou FAILED\n  debsums -c             seulement ceux qui ont changé\n\n" +
	"Chaque paquet arrive avec les empreintes de ses fichiers. debsums les recalcule : un programme trafiqué ne correspond plus.");
MANUEL["exiftool"] = page("lire les métadonnées d'un fichier", "EXIF TOOL",
	"  exiftool FICHIER       type réel, taille, et pour une photo : appareil, date, coordonnées GPS\n  exiftool -all= FICHIER (retirer les métadonnées avant de publier)\n\n" +
	"Une photo publiée peut dire où et quand elle a été prise. En enquête, c'est une mine ; pour sa vie privée, un danger.");
MANUEL["getfacl"] = page("voir les permissions cachées (ACL)", "GET File ACL",
	"  getfacl CHEMIN         les droits classiques (user::, group::, other::) et les ACL en plus (user:NOM:rwx)\n\n" +
	"Les ACL donnent des droits à une personne précise, en plus de ceux que montre ls -l (qui affiche seulement un + au bout).");
MANUEL["setfacl"] = page("modifier les permissions cachées (ACL)", "SET File ACL",
	"  sudo setfacl -x u:NOM CHEMIN   retirer l'ACL de NOM\n  sudo setfacl -m u:NOM:rx CHEMIN  (en donner une)\n\n" +
	"Après une intrusion, on cherche aussi les droits que l'intrus s'est donnés en douce, pas seulement ses fichiers.");

var SORTS_CHASSE = ["lastb", "lastlog", "w", "chage", "fail2ban-client", "clamscan", "rkhunter", "debsums", "exiftool", "getfacl", "setfacl"];
ORDRE_DES_SORTS_2 = ORDRE_DES_SORTS_2.concat(SORTS_CHASSE);
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_CHASSE.indexOf(c) === -1; });

/* gpasswd : retirer quelqu'un d'un groupe, sur tous les Linux (usermod -rG n'existe que sur les plus récents). */
Shell.sorts.gpasswd = function(args, io){
	var mode = args[0], nom = args[1], groupe = args[2];
	if ((mode !== "-d" && mode !== "-a") || !nom || !groupe) throw new ShellError("Utilisation : sudo gpasswd -d NOM GROUPE (retirer NOM du GROUPE), sudo gpasswd -a NOM GROUPE (l'ajouter)");
	if (!io.sudo) throw new ShellError("gpasswd: Permission denied.\n" + C.gris("(sudo gpasswd " + args.join(" ") + ")"));
	var fichierGroupes = fichierSysteme("group");
	if (fichierGroupes && mode === "-d"){
		var ligne = lignesDe(fichierGroupes.getText()).filter(function(l){ return l.split(":")[0] === groupe; })[0];
		if (ligne && (ligne.split(":")[3] || "").split(",").indexOf(nom) === -1) throw new ShellError("gpasswd: user '" + nom + "' is not a member of '" + groupe + "'");
	}
	Shell.sorts.usermod([mode === "-d" ? "-rG" : "-aG", groupe, nom], io);
	return (mode === "-d" ? "Removing user " + nom + " from group " : "Adding user " + nom + " to group ") + groupe;
};
MANUEL["gpasswd"] = page("ajouter ou retirer quelqu'un d'un groupe", "Group PASSWorD",
	"  sudo gpasswd -d NOM GROUPE   retirer NOM du GROUPE\n  sudo gpasswd -a NOM GROUPE   l'ajouter\n\n" +
	"Marche sur tous les Linux. Retirer quelqu'un du groupe sudo lui enlève le droit de devenir root par ce chemin-là.");
ORDRE_DES_SORTS_2.push("gpasswd");
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return c !== "gpasswd"; });
