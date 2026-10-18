/**
 * SortsIleAnnexes.js : les sorts des quêtes annexes de Port-Aube (chapitre 7), des notions vues nulle part ailleurs.
 *
 *  - L'impression (CUPS, sur imprimerie) : lpadmin (-p, -E, -v, -m, -D, -d, -x), lpstat (-p, -d, -o, -t, -v, -a),
 *    lp (-d, -n), cancel (ID, -a), cupsenable, cupsdisable, cupsaccept, cupsreject.
 *  - Le tri du courrier (Sieve, sur poste) : un script .sieve (require, if header :contains / :is, fileinto, vacation,
 *    keep, discard, stop), sievec (la compilation, et ses erreurs), l'activation (~/.dovecot.sieve), la livraison par
 *    dovecot-lda (mailbox_command de Postfix, mail_plugins sieve) ; doveadm sieve list.
 *  - La découverte en .local (avahi, sur quai) : avahi-browse (-a, -t, -r), avahi-resolve (-n, -a), avahi-publish (-s),
 *    les fichiers /etc/avahi/services/*.service.
 *  - Le pont (WireGuard, entre phare et rive) : wg genkey, wg pubkey, wg show, wg-quick up / down, /etc/wireguard/wg0.conf ;
 *    ping à travers le tunnel.
 *  - Le miroir (le démon rsync, sur bibliotheque) : /etc/rsyncd.conf (modules, path, read only, hosts allow, comment,
 *    list), rsync rsync://hôte/ et rsync -a rsync://hôte/module/ dossier.
 *  - Le dépôt des devoirs (sftp enfermé, sur halle) : Match Group, ForceCommand internal-sftp, ChrootDirectory (root,
 *    sans écriture pour les autres), sftp (ls, pwd, cd, put, get, mkdir, bye).
 */

/* ================================================================== */
/* CUPS                                                                 */
/* ================================================================== */

var IP_PRESSE_ILE = "10.0.70.32";
function etatCupsIle(){
	var e = etatIle("imprimerie");
	if (!e.cups || typeof e.cups !== "object"){
		// La file « brouillon », laissée par la gazette d'hier : un travail fou de 500 pages, bloqué.
		e.cups = { imprimantes: { brouillon: { uri: "ipp://" + IP_PRESSE_ILE + "/ipp/print", modele: "everywhere", description: "Ancienne file de la gazette", active: false, accepte: true, depuis: DATE_OUVERTURE_CH7 - 9 * 3600000, raison: "Paused" } },
			defaut: "brouillon", travaux: [{ id: 1, file: "brouillon", proprio: "ilyes", titre: "affiche-geante-x500", taille: 102400, statut: "pending", date: DATE_OUVERTURE_CH7 - 9 * 3600000, copies: 500 }], prochain: 2 };
	}
	return e.cups;
}
function exigerCupsIle(io, cmd){
	var h = ileIci();
	if (h !== "imprimerie") throw new ShellError(cmd + ": command not found" + (h ? astuce(io, "Le serveur d'impression de l'île, c'est la machine imprimerie.") : ""), 127);
	if (!serviceActifIle(h, "cups")) throw new ShellError(cmd + ": Unable to connect to server: Connection refused" + astuce(io, "CUPS ne tourne pas : sudo systemctl start cups"), 1);
	return h;
}
function adminCupsIle(io){
	if (io.sudo) return true;
	var g = groupesMachine("imprimerie").filter(function(x){ return x.nom === "lpadmin"; })[0];
	return !!(g && g.membres.indexOf(JOUEUR) > -1);
}
function dateCupsIle(ms){ var d = dateIle("imprimerie", ms); return JOURS_EN[d.getDay()] + " " + completerGauche(d.getDate(), 2) + " " + MOIS_EN[d.getMonth()] + " " + d.getFullYear() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + texteDecalage("imprimerie").replace(/00$/, "") ; }
/* Une imprimante active et qui accepte imprime tout de suite ce qui l'attend. */
function imprimerCupsIle(){
	var C = etatCupsIle();
	C.travaux.forEach(function(j){
		var p = C.imprimantes[j.file];
		if (!p || !p.active || j.statut !== "pending") return;
		if (!/(^|\/\/)(presse(\.port-aube\.lan)?|10\.0\.70\.32)(:\d+)?\//.test(p.uri + "/")){ j.statut = "pending"; p.raison = "The printer is not responding."; return; }
		j.statut = "completed";
		j.fin = maintenantMachine("imprimerie");
		moteurSeul(function(){
			var it = fichierHote("imprimerie", "/var/log/cups/page_log") || poserFichierHote("imprimerie", "/var/log/cups/page_log", "", { mode: "rw-r-----" });
			it.setText((it.getText() ? it.getText() + "\n" : "") + j.file + " " + j.proprio + " " + j.id + " [" + dateCupsIle() + "] total " + (j.copies || 1) + " - localhost " + j.titre + " - -");
		});
		evenementIle("imprimerie", "impression", { id: j.id, file: j.file, titre: j.titre, proprio: j.proprio });
	});
}
Shell.sorts.lpadmin = function(args, io){
	var h = exigerCupsIle(io, "lpadmin");
	if (!adminCupsIle(io)) throw new ShellError("lpadmin: Forbidden" + astuce(io, "Administrer les imprimantes est réservé au groupe lpadmin (ou à root)."), 1);
	var C = etatCupsIle();
	var p = optionIle(args, ["-p"]), x = optionIle(args, ["-x"]), d = optionIle(args, ["-d"]);
	if (x !== null){
		if (!C.imprimantes[x]) throw new ShellError("lpadmin: The printer or class does not exist.", 1);
		delete C.imprimantes[x];
		C.travaux = C.travaux.filter(function(j){ return j.file !== x; });
		if (C.defaut === x) C.defaut = null;
		evenementIle(h, "lpadmin", { action: "x", file: x });
		return "";
	}
	if (d !== null && p === null){
		if (!C.imprimantes[d]) throw new ShellError("lpadmin: The printer or class does not exist.", 1);
		C.defaut = d;
		evenementIle(h, "lpadmin", { action: "d", file: d });
		return "";
	}
	if (p === null) throw new ShellError("Usage:\n\nlpadmin [options] -d destination\nlpadmin [options] -p destination\nlpadmin [options] -p destination -c class\nlpadmin [options] -p destination -r class\nlpadmin [options] -x destination", 1);
	if (!/^[A-Za-z0-9_-]{1,127}$/.test(p)) throw new ShellError("lpadmin: Printer name can only contain printable characters.", 1);
	var neuf = !C.imprimantes[p];
	var imp = C.imprimantes[p] || { uri: null, modele: null, description: p, active: false, accepte: false, depuis: maintenantMachine(h) };
	var v = optionIle(args, ["-v"]), m = optionIle(args, ["-m"]), D = optionIle(args, ["-D"]), L = optionIle(args, ["-L"]);
	if (v !== null){
		if (!/^(ipp|ipps|socket|lpd|http|https|usb|file):\/\//.test(v)) throw new ShellError("lpadmin: Bad device-uri scheme \"" + v.split(":")[0] + "\".", 1);
		imp.uri = v;
	}
	if (neuf && !imp.uri) throw new ShellError("lpadmin: Unable to add printer: Bad device-uri \"\"." + astuce(io, "Une imprimante neuve a besoin de son adresse : -v ipp://presse.port-aube.lan/ipp/print"), 1);
	if (m !== null){
		if (m === "raw") io.err("lpadmin: Raw queues are deprecated and will stop working in a future version of CUPS.");
		else if (m === "everywhere"){
			if (!/^ipps?:\/\/(presse(\.port-aube\.lan)?|10\.0\.70\.32)(:\d+)?\//.test(imp.uri || "")) throw new ShellError("lpadmin: Unable to query printer: " + (/^ipps?:/.test(imp.uri || "") ? "No route to host" : "The printer does not support IPP."), 1);
		}
		else throw new ShellError("lpadmin: Unable to copy PPD file.", 1);
		imp.modele = m;
	}
	if (D !== null) imp.description = D;
	if (L !== null) imp.lieu = L;
	if (args.indexOf("-E") > -1){ imp.active = true; imp.accepte = true; imp.raison = null; }
	C.imprimantes[p] = imp;
	if (d !== null) C.defaut = d;
	evenementIle(h, "lpadmin", { action: "p", file: p, uri: imp.uri, modele: imp.modele, active: imp.active, neuf: neuf });
	imprimerCupsIle();
	return "";
};
Shell.sorts.lpstat = function(args, io){
	var h = exigerCupsIle(io, "lpstat");
	var C = etatCupsIle(), l = [];
	var drap = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("").replace(/-/g, "");
	var tout = drap.indexOf("t") > -1;
	var noms = Object.keys(C.imprimantes).sort();
	if (!drap) drap = "o";
	if (tout || drap.indexOf("r") > -1) l.push("scheduler is running");
	if (tout || drap.indexOf("d") > -1) l.push(C.defaut ? "system default destination: " + C.defaut : "no system default destination");
	if (tout || drap.indexOf("v") > -1) noms.forEach(function(n){ l.push("device for " + n + ": " + C.imprimantes[n].uri); });
	if (tout || drap.indexOf("a") > -1) noms.forEach(function(n){ var p = C.imprimantes[n]; l.push(n + (p.accepte ? " accepting requests since " : " not accepting requests since ") + dateCupsIle(p.depuis) + (p.accepte ? "" : " -\n\tRejecting Jobs")); });
	if (tout || drap.indexOf("p") > -1) noms.forEach(function(n){
		var p = C.imprimantes[n];
		var enCours = C.travaux.filter(function(j){ return j.file === n && j.statut === "pending"; })[0];
		l.push("printer " + n + " " + (p.active ? (enCours ? "now printing " + n + "-" + enCours.id + ".  enabled" : "is idle.  enabled") : "disabled") + " since " + dateCupsIle(p.depuis) + (p.active ? "" : " -\n\t" + (p.raison || "reason unknown")));
	});
	if (tout || drap.indexOf("o") > -1) C.travaux.filter(function(j){ return j.statut === "pending"; }).forEach(function(j){ l.push(completerDroite(j.file + "-" + j.id, 22) + completerDroite(j.proprio, 13) + completerGauche(j.taille, 9) + "   " + dateCupsIle(j.date)); });
	if (drap.indexOf("W") > -1 || args.indexOf("completed") > -1) C.travaux.filter(function(j){ return j.statut === "completed"; }).forEach(function(j){ l.push(completerDroite(j.file + "-" + j.id, 22) + completerDroite(j.proprio, 13) + completerGauche(j.taille, 9) + "   " + dateCupsIle(j.fin || j.date)); });
	evenementIle(h, "lpstat", { options: drap, defaut: C.defaut, imprimantes: noms, travaux: C.travaux.filter(function(j){ return j.statut === "pending"; }).map(function(j){ return j.id; }) });
	return l.join("\n");
};
Shell.sorts.lp = function(args, io){
	var h = exigerCupsIle(io, "lp");
	var C = etatCupsIle();
	var d = optionIle(args, ["-d"]) || C.defaut, n = +(optionIle(args, ["-n"]) || 1);
	var fichiers = argumentsIle(args, ["-d", "-n", "-o", "-t", "-q", "-P"]);
	if (!d) throw new ShellError("lp: Error - no default destination available." + astuce(io, "Pas d'imprimante par défaut : lp -d NOM, ou lpadmin -d NOM."), 1);
	var p = C.imprimantes[d];
	if (!p) throw new ShellError("lp: Error - The printer or class does not exist.", 1);
	if (!p.accepte) throw new ShellError("lp: Error - Destination \"" + d + "\" is not accepting jobs." + astuce(io, "La file refuse les travaux : sudo cupsaccept " + d), 1);
	var titre = "(stdin)", taille = 0;
	if (fichiers.length){ var r = Shell.objetLisible(fichiers[0], io, "lp"); titre = r.item.itemname; taille = String(r.item.getText()).length; }
	else if (io.stdin !== null) taille = String(io.stdin).length;
	else throw new ShellError("lp: Error - No file in print request.", 1);
	var j = { id: C.prochain++, file: d, proprio: JOUEUR, titre: titre, taille: Math.max(1, Math.ceil(taille / 1024)) * 1024, statut: "pending", date: maintenantMachine(h), copies: n };
	C.travaux.push(j);
	evenementIle(h, "lp", { id: j.id, file: d, titre: titre });
	imprimerCupsIle();
	var s = "request id is " + d + "-" + j.id + " (" + Math.max(1, fichiers.length) + " file(s))";
	if (!p.active && io.tty) s += astuce(io, "La file " + d + " est en pause (disabled) : le travail attend. lpstat -p le montre ; cupsenable " + d + " la relance.");
	return s;
};
Shell.sorts.cancel = function(args, io){
	var h = exigerCupsIle(io, "cancel");
	var C = etatCupsIle(), tous = args.indexOf("-a") > -1;
	var cibles = argumentsIle(args, ["-u", "-h"]);
	var choisis = C.travaux.filter(function(j){
		if (j.statut !== "pending") return false;
		if (tous) return !cibles.length || cibles.indexOf(j.file) > -1;
		return cibles.some(function(c){ return c === String(j.id) || c === j.file + "-" + j.id; });
	});
	if (!choisis.length && !tous) throw new ShellError("cancel: cancel-job failed: The job does not exist.", 1);
	var refus = choisis.filter(function(j){ return j.proprio !== JOUEUR && !adminCupsIle(io); });
	if (refus.length) throw new ShellError("cancel: cancel-job failed: You are not authorized to cancel job " + refus[0].id + "." + astuce(io, "Ce travail est à " + refus[0].proprio + " : seul le groupe lpadmin (ou root) annule le travail d'un autre."), 1);
	choisis.forEach(function(j){ j.statut = "canceled"; });
	evenementIle(h, "cancel", { ids: choisis.map(function(j){ return j.id; }) });
	return "";
};
function etatFileCupsIle(nom, action){
	return function(args, io){
		var h = exigerCupsIle(io, nom);
		if (!adminCupsIle(io)) throw new ShellError(nom + ": Operation failed: Forbidden", 1);
		var C = etatCupsIle(), noms = argumentsIle(args, ["-r"]);
		if (!noms.length) throw new ShellError("Usage: " + nom + " [options] destination(s)", 1);
		noms.forEach(function(n){
			var p = C.imprimantes[n];
			if (!p) throw new ShellError(nom + ": Operation failed: The printer or class does not exist.", 1);
			action(p, optionIle(args, ["-r"]));
			p.depuis = maintenantMachine(h);
		});
		evenementIle(h, nom, { files: noms });
		imprimerCupsIle();
		return "";
	};
}
Shell.sorts.cupsenable = etatFileCupsIle("cupsenable", function(p){ p.active = true; p.raison = null; });
Shell.sorts.cupsdisable = etatFileCupsIle("cupsdisable", function(p, r){ p.active = false; p.raison = r || "Paused"; });
Shell.sorts.cupsaccept = etatFileCupsIle("cupsaccept", function(p){ p.accepte = true; });
Shell.sorts.cupsreject = etatFileCupsIle("cupsreject", function(p){ p.accepte = false; });

/* ================================================================== */
/* Sieve                                                                */
/* ================================================================== */

var EXTENSIONS_SIEVE_ILE = ["fileinto", "vacation", "envelope", "reject", "imap4flags", "copy", "body", "variables", "relational", "comparator-i;ascii-numeric", "mailbox", "date", "regex", "include"];
/* Lire un script Sieve : { regles: [...], require: [...] } ou { erreurs: ["ligne N: ..."] }. Le sous-ensemble courant. */
function lireSieveIle(texte, nom){
	var t = String(texte || ""), jetons = [], ligne = 1, i = 0, erreurs = [];
	while (i < t.length){
		var c = t.charAt(i);
		if (c === "\n"){ ligne++; i++; continue; }
		if (/\s/.test(c)){ i++; continue; }
		if (c === "#"){ while (i < t.length && t.charAt(i) !== "\n") i++; continue; }
		if (c === "/" && t.charAt(i + 1) === "*"){ i += 2; while (i < t.length && !(t.charAt(i) === "*" && t.charAt(i + 1) === "/")){ if (t.charAt(i) === "\n") ligne++; i++; } i += 2; continue; }
		if (c === "\""){ var j = i + 1, s = ""; while (j < t.length && t.charAt(j) !== "\""){ if (t.charAt(j) === "\\"){ j++; } if (t.charAt(j) === "\n") ligne++; s += t.charAt(j); j++; } if (j >= t.length) erreurs.push(nom + ": line " + ligne + ": error: unterminated string."); jetons.push({ v: s, chaine: true, l: ligne }); i = j + 1; continue; }
		if ("[](){};,".indexOf(c) > -1){ jetons.push({ v: c, l: ligne }); i++; continue; }
		var m = /^(:?[A-Za-z_][A-Za-z0-9_.-]*|\d+[KMG]?)/.exec(t.substring(i));
		if (!m){ erreurs.push(nom + ": line " + ligne + ": error: unexpected character '" + c + "'."); i++; continue; }
		jetons.push({ v: m[1], l: ligne }); i += m[1].length;
	}
	if (erreurs.length) return { erreurs: erreurs };
	var k = 0, requis = [], cmdInconnue = {};
	function voir(){ return jetons[k]; }
	function prendre(v){ var x = jetons[k]; if (!x || (v !== undefined && x.v !== v)) throw { l: x ? x.l : ligne, m: "expected '" + v + "' but found " + (x ? (x.chaine ? "string" : "'" + x.v + "'") : "end of script") }; k++; return x; }
	function liste(){ if (voir() && voir().v === "["){ prendre("["); var l = []; while (voir() && voir().v !== "]"){ l.push(prendre().v); if (voir() && voir().v === ",") prendre(","); } prendre("]"); return l; } var x = prendre(); if (!x.chaine) throw { l: x.l, m: "expected string but found '" + x.v + "'" }; return [x.v]; }
	function test(){
		var x = prendre();
		var n = x.v.toLowerCase();
		if (n === "anyof" || n === "allof"){ prendre("("); var l = [test()]; while (voir() && voir().v === ","){ prendre(","); l.push(test()); } prendre(")"); return { t: n, l: l }; }
		if (n === "not") return { t: "not", f: test() };
		if (n === "true" || n === "false") return { t: n };
		if (n === "header" || n === "address" || n === "envelope"){
			var cmp = ":is";
			while (voir() && voir().v.charAt(0) === ":"){ var o = prendre().v; if (/^:(is|contains|matches)$/.test(o)) cmp = o; if (o === ":comparator") prendre(); }
			return { t: n, cmp: cmp, champs: liste(), valeurs: liste(), l: x.l };
		}
		if (n === "exists") return { t: n, champs: liste() };
		if (n === "size"){ var c2 = prendre().v; return { t: n, cmp: c2, v: prendre().v }; }
		throw { l: x.l, m: "unknown test '" + x.v + "' (only reported once at first occurrence)" };
	}
	function bloc(){ prendre("{"); var l = []; while (voir() && voir().v !== "}") l.push(commande()); prendre("}"); return l; }
	function commande(){
		var x = prendre(), n = x.v.toLowerCase();
		if (n === "require"){ var r = liste(); r.forEach(function(e){ if (EXTENSIONS_SIEVE_ILE.indexOf(e) === -1) throw { l: x.l, m: "require command: unknown Sieve capability `" + e + "'" }; requis.push(e); }); prendre(";"); return { c: "require" }; }
		if (n === "if"){
			var r2 = { c: "if", branches: [{ test: test(), corps: bloc() }] };
			while (voir() && (voir().v === "elsif" || voir().v === "else")){ var e = prendre().v; if (e === "elsif") r2.branches.push({ test: test(), corps: bloc() }); else { r2.branches.push({ test: { t: "true" }, corps: bloc() }); break; } }
			return r2;
		}
		if (n === "fileinto"){ if (requis.indexOf("fileinto") === -1 && !cmdInconnue.fileinto){ cmdInconnue.fileinto = true; throw { l: x.l, m: "unknown command 'fileinto' (only reported once at first occurrence)", aide: "fileinto" }; } while (voir() && voir().v.charAt(0) === ":") prendre(); var d = prendre(); prendre(";"); return { c: "fileinto", dossier: d.v }; }
		if (n === "vacation"){
			if (requis.indexOf("vacation") === -1) throw { l: x.l, m: "unknown command 'vacation' (only reported once at first occurrence)", aide: "vacation" };
			var v = { c: "vacation", jours: 7, sujet: null, texte: "" };
			while (voir() && voir().v.charAt(0) === ":"){ var o2 = prendre().v; if (o2 === ":days") v.jours = +prendre().v; else if (o2 === ":subject") v.sujet = prendre().v; else if (o2 === ":from" || o2 === ":handle") prendre(); else if (o2 === ":addresses") liste(); }
			var corps = prendre(); if (!corps.chaine) throw { l: corps.l, m: "vacation: the reason argument must be a string" };
			v.texte = corps.v; prendre(";"); return v;
		}
		if (n === "keep" || n === "discard" || n === "stop"){ prendre(";"); return { c: n }; }
		if (n === "redirect"){ var a = prendre(); prendre(";"); return { c: "redirect", a: a.v }; }
		throw { l: x.l, m: "unknown command '" + x.v + "' (only reported once at first occurrence)" };
	}
	var regles = [];
	try { while (k < jetons.length) regles.push(commande()); }
	catch (e){
		if (e && e.m) return { erreurs: [nom + ": line " + e.l + ": error: " + e.m + "."].concat(e.aide ? [nom + ": line " + e.l + ": error: the '" + e.aide + "' extension is not enabled: add require \"" + e.aide + "\"; at the top of the script."] : []).concat([nom + ": error: validation failed."]) };
		throw e;
	}
	return { regles: regles, require: requis };
}
function entetesMessageIle(texte){ var r = {}; String(texte).split(/\n\n/)[0].split("\n").forEach(function(l){ var m = /^([A-Za-z-]+):\s*(.*)$/.exec(l); if (m) (r[m[1].toLowerCase()] = r[m[1].toLowerCase()] || []).push(m[2]); }); return r; }
function testSieveIle(tst, ent, msg){
	switch (tst.t){
		case "true": return true; case "false": return false;
		case "not": return !testSieveIle(tst.f, ent, msg);
		case "anyof": return tst.l.some(function(x){ return testSieveIle(x, ent, msg); });
		case "allof": return tst.l.every(function(x){ return testSieveIle(x, ent, msg); });
		case "exists": return tst.champs.every(function(c){ return !!ent[c.toLowerCase()]; });
		case "size": return true;
		default:
			var vals = [];
			tst.champs.forEach(function(c){ vals = vals.concat(tst.t === "envelope" ? [c.toLowerCase() === "from" ? msg.de : msg.a.join(",")] : (ent[c.toLowerCase()] || [])); });
			return vals.some(function(v){
				v = String(v).toLowerCase();
				return tst.valeurs.some(function(w){
					w = String(w).toLowerCase();
					if (tst.cmp === ":contains") return v.indexOf(w) > -1;
					if (tst.cmp === ":matches") return new RegExp("^" + w.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(v);
					return v === w;
				});
			});
	}
}
/* La livraison par dovecot-lda : le script actif du compte décide du dossier, et de la réponse d'absence. */
function scriptActifSieveIle(h, compte){
	var lien = fichierHote(h, compte.home + "/.dovecot.sieve");
	if (!lien) return null;
	var cible = lien.lien ? (lien.lien.charAt(0) === "/" ? lien.lien : compte.home + "/" + lien.lien) : compte.home + "/.dovecot.sieve";
	var it = fichierHote(h, cheminNormal(cible));
	return it ? { chemin: cheminNormal(cible), texte: it.getText() } : null;
}
function appliquerSieveIle(h, compte, msg, texte){
	var s = scriptActifSieveIle(h, compte);
	if (!s) return null;
	var lu = lireSieveIle(s.texte, nomDe(s.chemin).replace(/\.sieve$/, ""));
	if (lu.erreurs) return { journal: "script " + s.chemin + " failed to compile: " + lu.erreurs[0] + "; implicit keep", dossier: "INBOX" };
	var ent = entetesMessageIle(texte), r = { dossier: null, reponse: null, journal: null }, arret = false;
	(function executer(liste){
		liste.forEach(function(c){
			if (arret) return;
			if (c.c === "if"){ for (var i = 0; i < c.branches.length; i++){ if (testSieveIle(c.branches[i].test, ent, msg)){ executer(c.branches[i].corps); break; } } return; }
			if (c.c === "fileinto") r.dossier = c.dossier;
			if (c.c === "keep") r.dossier = r.dossier || "INBOX";
			if (c.c === "stop") arret = true;
			if (c.c === "vacation" && !/^(mailer-daemon|postmaster|.*-noreply)@/i.test(msg.de) && !(msg.entetes || []).some(function(e){ return /^Auto-Submitted:/i.test(e); })){
				var deja = (etatIle(h).vacances = etatIle(h).vacances || {});
				var cle = compte.nom + ":" + msg.de;
				if (!deja[cle] || maintenantMachine(h) - deja[cle] > c.jours * 86400000){
					deja[cle] = maintenantMachine(h);
					r.reponse = { de: compte.nom + "@" + DOMAINE_ILE, a: [msg.de], sujet: c.sujet || "Auto: " + (ent.subject || [""])[0], corps: c.texte, uid: compte.uid, entetes: ["Auto-Submitted: auto-replied (vacation)", "Precedence: bulk"] };
				}
			}
		});
	})(lu.regles);
	r.dossier = r.dossier || "INBOX";
	r.journal = (r.dossier !== "INBOX" ? "fileinto action: stored mail into mailbox '" + r.dossier + "'" : "stored mail into mailbox 'INBOX'") + (r.reponse ? "; sent vacation response to <" + msg.de + ">" : "");
	evenementIle(h, "sieve", { compte: compte.nom, dossier: r.dossier, vacation: !!r.reponse, sujet: (ent.subject || [""])[0] });
	return r;
}
Shell.sorts.sievec = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/sievec")) throw new ShellError("sievec: command not found" + (h ? astuce(io, "Sieve vit avec Dovecot, sur la machine poste.") : ""), 127);
	var f = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!f) throw new ShellError("Usage: sievec [-c <config-file>] [-d] [-P <plugin>] [-x <extensions>] <script-file> [<out-file>]", 64);
	var t = Shell.objetLisible(f, io, "sievec");
	var nom = t.item.itemname.replace(/\.sieve$/, "");
	var lu = lireSieveIle(t.item.getText(), nom);
	evenementIle(h, "sievec", { fichier: f, ok: !lu.erreurs, erreurs: lu.erreurs || [], require: lu.require || [], regles: lu.regles ? lu.regles.length : 0 });
	if (lu.erreurs) throw new ShellError("sievec(" + JOUEUR + "): Error: failed to compile sieve script '" + f + "'\n" + lu.erreurs.map(function(e){ return "sievec(" + JOUEUR + "): Error: " + e; }).join("\n"), 1);
	ecrireFichier(f.replace(/\.sieve$/, "") + ".svbin", "(script Sieve compilé)\n", io, "sievec", { mode: t.item.mode });
	return "";
};
/* doveadm sieve list -u COMPTE : les scripts du dossier ~/sieve, et lequel est actif. */
function doveadmSieveIle(h, mots, args, io){
	var compte = compteDoveadmIle(h, args, io);
	var dossier = compte.home + "/sieve", actif = scriptActifSieveIle(h, compte);
	if (mots[0] === "list"){
		var l = fichiersDuDossier(h, dossier).filter(function(f){ return /\.sieve$/.test(f.nom); }).map(function(f){ return f.nom.replace(/\.sieve$/, "") + (actif && actif.chemin === f.chemin ? " ACTIVE" : ""); });
		evenementIle(h, "doveadm", { ordre: "sieve", sous: "list", compte: compte.nom, actif: actif ? actif.chemin : null });
		return l.join("\n");
	}
	if (mots[0] === "activate"){
		if (!io.sudo && compte.nom !== JOUEUR) throw new ShellError("doveadm(" + compte.nom + "): Error: permission denied", 75);
		var cible = dossier + "/" + mots[1] + ".sieve";
		if (!fichierHote(h, cible)) throw new ShellError("doveadm(" + compte.nom + "): Error: Script " + mots[1] + " doesn't exist", 68);
		moteurSeul(function(){ var d = dossierHote(h, compte.home); var vieux = d.getItemFromName(".dovecot.sieve"); if (vieux !== -1) d.removeItem(vieux); poserFichierHote(h, compte.home + "/.dovecot.sieve", "", { lien: "sieve/" + mots[1] + ".sieve", owner: compte.nom }); });
		evenementIle(h, "doveadm", { ordre: "sieve", sous: "activate", compte: compte.nom, script: mots[1] });
		return "";
	}
	throw new ShellError("doveadm sieve: unknown command: " + (mots[0] || ""), 64);
}

/* ================================================================== */
/* avahi                                                                */
/* ================================================================== */

/* Les services que l'île annonce d'elle-même en .local. */
var SERVICES_AVAHI_ILE = [["imprimerie", "Presse de la gazette", "_ipp._tcp", 631], ["halle", "Halle d'échange", "_smb._tcp", 445], ["bibliotheque", "Bibliothèque de l'île", "_rsync._tcp", 873],
	["poste", "Poste de Port-Aube", "_imap._tcp", 143], ["quai", "quai", "_ssh._tcp", 22], ["phare", "Phare-Relais", "_ssh._tcp", 22]];
var TYPES_AVAHI_ILE = { "_ipp._tcp": "Internet Printer", "_smb._tcp": "SMB File Sharing", "_rsync._tcp": "Rsync", "_imap._tcp": "IMAP Mail Access", "_ssh._tcp": "SSH Remote Terminal", "_http._tcp": "Web Site", "_workstation._tcp": "Workstation" };
function servicesAvahiIle(h){
	var l = SERVICES_AVAHI_ILE.filter(function(s){ return estHoteIle(s[0]); }).map(function(s){ return { hote: s[0], nom: s[1], type: s[2], port: s[3] }; });
	// Les fichiers /etc/avahi/services/*.service de chaque machine où avahi-daemon tourne.
	HOTES_ILE.forEach(function(m){
		if (!serviceActifIle(m, "avahi-daemon")) return;
		fichiersDuDossier(m, "/etc/avahi/services").filter(function(f){ return /\.service$/.test(f.nom); }).forEach(function(f){
			var t = f.item.getText();
			var nom = (/<name[^>]*>([^<]*)<\/name>/.exec(t) || [])[1], type = (/<type>([^<]*)<\/type>/.exec(t) || [])[1], port = (/<port>(\d+)<\/port>/.exec(t) || [])[1];
			if (!/<service-group>[\s\S]*<\/service-group>/.test(t) || !nom || !type || !port){ journalIle(m, "avahi-daemon", "avahi-daemon", "Failed to load service group file " + f.chemin + ", ignoring.", 4); return; }
			l.push({ hote: m, nom: nom.replace(/%h/g, m), type: type, port: +port, fichier: f.chemin });
		});
		(etatIle(m).avahiPublies || []).forEach(function(p){ l.push({ hote: m, nom: p.nom, type: p.type, port: p.port, publie: true }); });
	});
	return l;
}
function exigerAvahiIle(io, cmd){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/" + cmd)) throw new ShellError(cmd + ": command not found" + (h ? astuce(io, "avahi est installé sur le quai.") : ""), 127);
	if (!serviceActifIle(h, "avahi-daemon")) throw new ShellError("Failed to create client object: Daemon not running" + astuce(io, "sudo systemctl start avahi-daemon"), 1);
	return h;
}
Shell.sorts["avahi-browse"] = function(args, io){
	var h = exigerAvahiIle(io, "avahi-browse");
	var drap = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("");
	var tous = /a/.test(drap) || args.indexOf("--all") > -1, resoudre = /r/.test(drap) || args.indexOf("--resolve") > -1, fin = /t/.test(drap) || args.indexOf("--terminate") > -1;
	var type = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!tous && !type) throw new ShellError("Too few arguments" + astuce(io, "Tout ce qui s'annonce : avahi-browse -a -t (ou un type : avahi-browse -t _ipp._tcp)."), 1);
	if (!fin) io.err("(avahi-browse écoute sans fin sur un vrai système : -t s'arrête une fois la liste complète. Ici, la liste s'affiche puis s'arrête.)");
	var l = [];
	servicesAvahiIle(h).filter(function(s){ return tous || s.type === type; }).forEach(function(s){
		var t = TYPES_AVAHI_ILE[s.type] || s.type;
		l.push("+   eth0 IPv4 " + completerDroite(s.nom, 45) + " " + completerDroite(t, 28) + " local");
		if (resoudre) l.push("=   eth0 IPv4 " + completerDroite(s.nom, 45) + " " + completerDroite(t, 28) + " local", "   hostname = [" + s.hote + ".local]", "   address = [" + ipIle(s.hote) + "]", "   port = [" + s.port + "]", "   txt = []");
	});
	evenementIle(h, "avahi-browse", { tous: tous, type: type || null, resoudre: resoudre, services: servicesAvahiIle(h).map(function(s){ return s.nom; }) });
	return l.join("\n");
};
Shell.sorts["avahi-resolve"] = function(args, io){
	var h = exigerAvahiIle(io, "avahi-resolve");
	var parNom = args.indexOf("-n") > -1 || args.indexOf("--name") > -1 || /^avahi-resolve-host-name$/.test(""), parAdresse = args.indexOf("-a") > -1 || args.indexOf("--address") > -1;
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!parNom && !parAdresse) throw new ShellError("avahi-resolve: Too few arguments: choisis -n NOM.local ou -a ADRESSE", 1);
	var l = [];
	cibles.forEach(function(c){
		if (parNom){
			var m = /^([a-z0-9-]+)\.local\.?$/i.exec(c), hh = m ? m[1].toLowerCase() : null;
			if (!hh || !estHoteIle(hh) || !serviceActifIle(hh, "avahi-daemon") && SERVICES_AVAHI_ILE.every(function(s){ return s[0] !== hh; })){ io.err("Failed to resolve host name '" + c + "': Timeout reached"); io.code = 1; return; }
			l.push(c + "\t" + ipIle(hh));
		} else {
			var h2 = hoteDeIpIle(c);
			if (!h2 || !estHoteIle(h2)){ io.err("Failed to resolve address '" + c + "': Timeout reached"); io.code = 1; return; }
			l.push(c + "\t" + h2 + ".local");
		}
	});
	evenementIle(h, "avahi-resolve", { cibles: cibles, ok: !io.code });
	return l.join("\n");
};
Shell.sorts["avahi-publish"] = function(args, io){
	var h = exigerAvahiIle(io, "avahi-publish");
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (args.indexOf("-s") === -1 && args.indexOf("--service") === -1) throw new ShellError("avahi-publish: publier un service : avahi-publish -s NOM TYPE PORT", 1);
	if (mots.length < 3 || !/^\d+$/.test(mots[2])) throw new ShellError("Bad number of arguments", 1);
	var p = { nom: mots[0], type: mots[1], port: +mots[2] };
	var e = etatIle(h);
	e.avahiPublies = (e.avahiPublies || []).filter(function(x){ return x.nom !== p.nom; }).concat([p]);
	evenementIle(h, "avahi-publish", { nom: p.nom, type: p.type, port: p.port });
	return "Established under name '" + p.nom + "'" + astuce(io, "Sur un vrai système, avahi-publish garde le service tant qu'il tourne (Ctrl-C l'arrête). Pour une annonce qui survit, un fichier dans /etc/avahi/services/.");
};

/* ================================================================== */
/* WireGuard                                                            */
/* ================================================================== */

function cleWgIle(graine){ return btoa(hexDe(graine, 64).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); })).substring(0, 43) + "="; }
function publiqueWgIle(privee){ return cleWgIle("wg-pub:" + String(privee).trim()); }
function cleWgValideIle(c){ return /^[A-Za-z0-9+\/]{43}=$/.test(String(c || "").trim()); }
Shell.sorts.wg = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/wg")) throw new ShellError("wg: command not found" + (h ? astuce(io, "WireGuard est installé sur phare (et sur rive, de l'autre côté).") : ""), 127);
	var ordre = args[0];
	if (ordre === "genkey"){
		var k = cleWgIle("wg-priv:" + h + ":" + state.nbCommandes + ":" + Math.random());
		evenementIle(h, "wg", { ordre: "genkey" });
		if (io.tty) io.err("Warning: writing to world accessible file.\nConsider setting the umask to 077 and trying again.");
		return k;
	}
	if (ordre === "pubkey"){
		var priv = String(io.stdin || "").trim();
		if (!cleWgValideIle(priv)) throw new ShellError("wg: Key is not the correct length or format", 1);
		evenementIle(h, "wg", { ordre: "pubkey" });
		return publiqueWgIle(priv);
	}
	if (ordre === "show" || !ordre){
		if (!io.sudo) throw new ShellError("Unable to access interface: Operation not permitted" + astuce(io, "sudo wg show"), 1);
		var I = (etatIle(h).wg || {}).wg0;
		if (!I || !I.haut){ evenementIle(h, "wg", { ordre: "show", haut: false }); return ""; }
		var p = pairWgIle(h);
		var l = ["interface: wg0", "  public key: " + publiqueWgIle(I.conf.prive), "  private key: (hidden)", "  listening port: " + (I.conf.port || 51820)];
		I.conf.pairs.forEach(function(pp){
			l.push("", "peer: " + pp.publique);
			if (pp.endpoint){ var em = /^([^:]+):(\d+)$/.exec(pp.endpoint), eh = em ? resoudreHoteIle(em[1]) : null; l.push("  endpoint: " + (eh ? ipIle(eh) + ":" + em[2] : pp.endpoint)); }
			l.push("  allowed ips: " + pp.allowed.join(", "));
			if (p.ok && p.pair === pp){ l.push("  latest handshake: " + (p.depuis || 12) + " seconds ago", "  transfer: 1.24 KiB received, 1.62 KiB sent"); }
			if (pp.keepalive) l.push("  persistent keepalive: every " + pp.keepalive + " seconds");
		});
		evenementIle(h, "wg", { ordre: "show", haut: true, poignee: !!p.ok });
		return l.join("\n");
	}
	throw new ShellError("Invalid subcommand: `" + ordre + "'\nUsage: wg <cmd> [<args>]\n\nAvailable subcommands:\n  show: Shows the current configuration and device information\n  genkey: Generates a new private key and writes it to stdout\n  pubkey: Reads a private key from stdin and writes a public key to stdout", 1);
};
function lireConfWgIle(h, texte){
	var r = { prive: null, adresses: [], port: null, pairs: [], erreur: null }, sec = null, cour = null;
	String(texte || "").split("\n").forEach(function(l, i){
		if (r.erreur) return;
		var t = l.replace(/#.*$/, "").trim();
		if (!t) return;
		if (/^\[Interface\]$/i.test(t)){ sec = "i"; return; }
		if (/^\[Peer\]$/i.test(t)){ sec = "p"; cour = { publique: null, endpoint: null, allowed: [], keepalive: null }; r.pairs.push(cour); return; }
		var kv = /^([A-Za-z]+)\s*=\s*(.*)$/.exec(t);
		if (!kv || !sec){ r.erreur = "Line unrecognized: `" + t.replace(/\s/g, "") + "'"; return; }
		var k = kv[1].toLowerCase(), v = kv[2].trim();
		if (sec === "i"){
			if (k === "privatekey"){ if (!cleWgValideIle(v)){ r.erreur = "Key is not the correct length or format: `" + v + "'"; return; } r.prive = v; }
			else if (k === "address") r.adresses = v.split(",").map(function(x){ return x.trim(); });
			else if (k === "listenport") r.port = +v;
			else if (["dns", "mtu", "table", "preup", "postup", "predown", "postdown", "saveconfig", "fwmark"].indexOf(k) === -1){ r.erreur = "Line unrecognized: `" + kv[1] + "=" + v + "'"; return; }
		} else {
			if (k === "publickey"){ if (!cleWgValideIle(v)){ r.erreur = "Key is not the correct length or format: `" + v + "'"; return; } cour.publique = v; }
			else if (k === "endpoint") cour.endpoint = v;
			else if (k === "allowedips") cour.allowed = v.split(",").map(function(x){ return x.trim(); });
			else if (k === "persistentkeepalive") cour.keepalive = +v;
			else if (k !== "presharedkey"){ r.erreur = "Line unrecognized: `" + kv[1] + "=" + v + "'"; return; }
		}
	});
	if (!r.erreur && !r.prive) r.erreur = "Interface has no private key";
	return r;
}
/* La poignée de main entre deux bouts du pont : chaque clé publique déclarée doit être celle de l'autre bout. */
function pairWgIle(h){
	var I = (etatIle(h).wg || {}).wg0;
	if (!I || !I.haut) return { ok: false };
	var autre = h === "phare" ? "rive" : (h === "rive" ? "phare" : null);
	var J = autre ? (etatIle(autre).wg || {}).wg0 : null;
	if (!J || !J.haut) return { ok: false, raison: "autre" };
	var pi = I.conf.pairs.filter(function(p){ return p.publique === publiqueWgIle(J.conf.prive); })[0];
	var pj = J.conf.pairs.filter(function(p){ return p.publique === publiqueWgIle(I.conf.prive); })[0];
	if (!pi || !pj) return { ok: false, raison: "cles" };
	var vers = function(p, hh){ var m = /^([^:]+):(\d+)$/.exec(p.endpoint || ""); return m && (resoudreHoteIle(m[1]) === hh || m[1] === ipIle(hh)) && +m[2] === ((etatIle(hh).wg || {}).wg0.conf.port || 51820); };
	if (!vers(pi, autre) && !vers(pj, h)) return { ok: false, raison: "endpoint" };
	return { ok: true, pair: pi, autre: autre, pairAutre: pj, depuis: 8 + state.nbCommandes % 50 };
}
function ipDuTunnelIle(h){ var I = (etatIle(h).wg || {}).wg0; return I && I.haut && I.conf.adresses[0] ? I.conf.adresses[0].split("/")[0] : null; }
Shell.sorts["wg-quick"] = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/wg-quick")) throw new ShellError("wg-quick: command not found", 127);
	var ordre = args[0], nom = args[1];
	if ((ordre !== "up" && ordre !== "down" && ordre !== "strip") || !nom) throw new ShellError("Usage: wg-quick [ up | down | save | strip ] [ CONFIG_FILE | INTERFACE ]", 1);
	if (!io.sudo) throw new ShellError("wg-quick must be run as root" + astuce(io, "sudo wg-quick " + ordre + " " + nom), 1);
	var chemin = nom.charAt(0) === "/" ? nom : "/etc/wireguard/" + nom + ".conf";
	var iface = nomDe(chemin).replace(/\.conf$/, "");
	var e = etatIle(h); e.wg = e.wg || {};
	if (ordre === "down"){
		if (!e.wg[iface] || !e.wg[iface].haut) throw new ShellError("wg-quick: `" + iface + "' is not a WireGuard interface", 1);
		e.wg[iface].haut = false;
		evenementIle(h, "wg-quick", { ordre: "down", iface: iface });
		return "[#] ip link delete dev " + iface;
	}
	var it = fichierHote(h, chemin);
	if (!it) throw new ShellError("wg-quick: `" + chemin + "' does not exist", 1);
	if (e.wg[iface] && e.wg[iface].haut) throw new ShellError("wg-quick: `" + iface + "' already exists", 1);
	var avert = [];
	if (it.mode.substring(3) !== "------") avert.push("Warning: `" + chemin + "' is world accessible");
	var conf = lireConfWgIle(h, it.getText());
	if (conf.erreur){ evenementIle(h, "wg-quick", { ordre: "up", ok: false, erreur: conf.erreur }); throw new ShellError(avert.concat(["[#] ip link add " + iface + " type wireguard", "[#] wg setconf " + iface + " /dev/fd/63", conf.erreur, "Configuration parsing error", "[#] ip link delete dev " + iface]).join("\n"), 1); }
	e.wg[iface] = { haut: true, conf: conf, depuis: maintenantMachine(h) };
	var p = pairWgIle(h);
	evenementIle(h, "wg-quick", { ordre: "up", ok: true, iface: iface, poignee: !!p.ok, droits: avert.length === 0 });
	return avert.concat(["[#] ip link add " + iface + " type wireguard", "[#] wg setconf " + iface + " /dev/fd/63"]).concat(conf.adresses.map(function(a){ return "[#] ip -4 address add " + a + " dev " + iface; })).concat(["[#] ip link set mtu 1420 up dev " + iface]).join("\n");
};
var PING_AVANT_ILE = Shell.sorts.ping;
Shell.sorts.ping = function(args, io){
	var h = ileIci();
	var cible = args.filter(function(a, i){ return a.charAt(0) !== "-" && args[i - 1] !== "-c"; })[0];
	if (!h || !cible || !/^10\.99\.0\.\d+$/.test(cible)) return PING_AVANT_ILE.apply(this, arguments);
	var n = Math.min(5, +(optionIle(args, ["-c"]) || 3));
	var ici = ipDuTunnelIle(h), p = pairWgIle(h);
	var bon = ici && p.ok && ipDuTunnelIle(p.autre) === cible && p.pair.allowed.some(function(a){ return ipDansReseauIle(cible, /\//.test(a) ? a : a + "/32"); }) && p.pairAutre.allowed.some(function(a){ return ipDansReseauIle(ici, /\//.test(a) ? a : a + "/32"); });
	evenementIle(h, "pingTunnel", { cible: cible, ok: !!bon });
	if (!ici) throw new ShellError("ping : connect : Le réseau n'est pas accessible" + astuce(io, "Aucune interface n'a d'adresse dans 10.99.0.0/24 : le tunnel n'est pas monté (sudo wg-quick up wg0)."), 2);
	var l = ["PING " + cible + " (" + cible + ") 56(84) octets de données."];
	for (var k = 1; k <= n; k++) if (bon) l.push("64 octets de " + cible + " : icmp_seq=" + k + " ttl=64 temps=" + (11.2 + k * 0.7).toFixed(1).replace(".", ",") + " ms");
	l.push("", "--- statistiques ping " + cible + " ---", n + " paquets transmis, " + (bon ? n : 0) + " reçus, " + (bon ? "0" : "100") + " % de paquets perdus");
	if (!bon && io.tty) l.push(C.gris("(Rien ne traverse : sudo wg show dit s'il y a eu une poignée de main (latest handshake). Les deux bouts doivent connaître la clé publique de l'autre, et le bon Endpoint.)"));
	if (!bon) io.code = 1;
	return l.join("\n");
};

/* ================================================================== */
/* Le démon rsync                                                       */
/* ================================================================== */

function lireRsyncdIle(h){
	var r = { modules: {}, ordre: [], globales: {} }, cour = null;
	(lireIle(h, "/etc/rsyncd.conf") || "").split("\n").forEach(function(l){
		var t = l.replace(/^\s+|\s+$/g, "");
		if (!t || /^[#;]/.test(t)) return;
		var s = /^\[([^\]]+)\]$/.exec(t);
		if (s){ cour = s[1].trim(); r.modules[cour] = {}; r.ordre.push(cour); return; }
		var kv = /^([^=]+?)\s*=\s*(.*)$/.exec(t);
		if (!kv) return;
		(cour ? r.modules[cour] : r.globales)[kv[1].trim().toLowerCase()] = kv[2].trim();
	});
	return r;
}
function valeurRsyncIle(conf, module, cle, defaut){ var m = conf.modules[module] || {}; return m[cle] !== undefined ? m[cle] : (conf.globales[cle] !== undefined ? conf.globales[cle] : defaut); }
controleAvantDemarrage(function(h, unite){
	if (!estHoteIle(h) || unite !== "rsync.service") return null;
	if (lireIle(h, "/etc/rsyncd.conf") === null) return "rsync.service - fast remote file copy program daemon was skipped because of an unmet condition check (ConditionPathExists=/etc/rsyncd.conf)";
	return null;
});
var RSYNC_AVANT_ILE = Shell.sorts.rsync;
Shell.sorts.rsync = function(args, io){
	var h = ileIci();
	var distant = args.filter(function(a){ return /^rsync:\/\//.test(a) || /^[^\/\s]+::/.test(a); });
	if (!h || !distant.length) return RSYNC_AVANT_ILE.apply(this, arguments);
	var chemins = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var source = chemins[0], dest = chemins[1];
	var lire = function(u){ var m = /^rsync:\/\/([^\/:]+)(?::\d+)?\/?([^\/]*)\/?(.*)$/.exec(u) || /^([^:]+)::([^\/]*)\/?(.*)$/.exec(u); return m ? { hoteNom: m[1], hote: resoudreHoteIle(m[1]), module: m[2], reste: m[3] } : null; };
	var depuisServeur = /^rsync:\/\/|::/.test(source);
	var u = lire(depuisServeur ? source : dest);
	if (!u || !u.hote || !estHoteIle(u.hote) || !serviceActifIle(u.hote, "rsync")) throw new ShellError("rsync: failed to connect to " + (u ? u.hoteNom : "?") + " (" + (u && u.hote ? ipIle(u.hote) : "?") + "): Connection refused (111)\nrsync error: error in socket IO (code 10) at clientserver.c(139) [Receiver=3.2.7]", 10);
	var conf = lireRsyncdIle(u.hote);
	if (!u.module){
		var liste = conf.ordre.filter(function(m){ return !/^(no|false|0)$/i.test(valeurRsyncIle(conf, m, "list", "yes")); });
		evenementIle(h, "rsync-liste", { serveur: u.hote, modules: liste });
		return liste.map(function(m){ return completerDroite(m, 15) + valeurRsyncIle(conf, m, "comment", ""); }).join("\n");
	}
	if (!conf.modules[u.module]) throw new ShellError("@ERROR: Unknown module '" + u.module + "'\nrsync error: error starting client-server protocol (code 5) at main.c(1863) [Receiver=3.2.7]", 5);
	var permis = valeurRsyncIle(conf, u.module, "hosts allow", null);
	if (permis && !permis.split(/[\s,]+/).filter(Boolean).some(function(x){ return clientCorrespondIle(x, h); })){
		journalIle(u.hote, "rsyncd", "rsync", "rsync denied on module " + u.module + " from " + h + " (" + ipIle(h) + ")", 4);
		evenementIle(h, "rsync-module", { serveur: u.hote, module: u.module, ok: false, raison: "hosts" });
		throw new ShellError("@ERROR: access denied to " + u.module + " from " + h + " (" + ipIle(h) + ")\nrsync error: error starting client-server protocol (code 5) at main.c(1863) [Receiver=3.2.7]", 5);
	}
	var base = valeurRsyncIle(conf, u.module, "path", null);
	if (!base || !dossierHote(u.hote, base)) throw new ShellError("@ERROR: chdir failed\nrsync error: error starting client-server protocol (code 5) at main.c(1863) [Receiver=3.2.7]", 5);
	if (!depuisServeur){
		if (!/^(no|false|0)$/i.test(valeurRsyncIle(conf, u.module, "read only", "yes"))){ evenementIle(h, "rsync-module", { serveur: u.hote, module: u.module, ok: false, raison: "ecriture" }); throw new ShellError("ERROR: module is read only\nrsync error: syntax or usage error (code 1) at main.c(1220) [Receiver=3.2.7]", 1); }
		throw new ShellError("ERROR: module is read only", 1);
	}
	var src = dossierHote(u.hote, cheminNormal(base + "/" + u.reste));
	if (!src) throw new ShellError("rsync: [sender] change_dir \"/" + u.reste + "\" (in " + u.module + ") failed: No such file or directory (2)", 23);
	if (!dest){
		var lignes = [];
		lignes.push("drwxr-xr-x          4,096 " + "2026/10/18 06:00:00 .");
		src.items.forEach(function(it){ lignes.push("-rw-r--r--   " + completerGauche(String(it.getText()).length, 12) + " 2026/10/18 06:00:00 " + it.itemname); });
		evenementIle(h, "rsync-module", { serveur: u.hote, module: u.module, ok: true, liste: true });
		return lignes.join("\n");
	}
	var r = Shell.chercher(dest, io, "rsync");
	var cible = r.node instanceof Room ? r.node : null;
	if (!cible){
		if (r.node) throw new ShellError("rsync: [Receiver] mkdir \"" + dest + "\" failed: File exists (17)", 23);
		Shell.verifierEcriture(r.dir, io, "rsync", r.name);
		var neuf = new Room(r.name, "Un dossier.", "loc_etc.gif");
		neuf.owner = io.sudo ? "root" : JOUEUR; neuf.mode = "rwxr-xr-x";
		if (r.dir.chapitre) neuf.chapitre = r.dir.chapitre;
		link_rooms(r.dir, neuf);
		cible = neuf;
	}
	var copies = [];
	moteurSeul(function(){
		src.items.forEach(function(it){
			var d = cible.getItemFromName(it.itemname);
			if (d === -1){ d = new Item(it.itemname, it.getText(), "item_sign.gif"); cible.addItem(d); }
			else d.setText(it.getText());
			d.owner = io.sudo ? it.owner : JOUEUR; d.mode = it.mode;
			copies.push(it.itemname);
		});
	});
	evenementIle(h, "rsync-module", { serveur: u.hote, module: u.module, ok: true, copies: copies, dest: dest });
	var v = args.some(function(a){ return /^-[a-zA-Z]*v/.test(a); });
	var total = src.items.reduce(function(s, it){ return s + String(it.getText()).length; }, 0);
	return v ? ["receiving incremental file list", "./"].concat(copies).concat(["", "sent " + (27 + copies.length * 19) + " bytes  received " + (total + 180) + " bytes  " + (total + 207) + ".00 bytes/sec", "total size is " + total + "  speedup is 1.00"]).join("\n") : "";
};

/* ================================================================== */
/* sftp enfermé                                                         */
/* ================================================================== */

var MOTS_DE_PASSE_ILE = { "halle:depot": "Rendus du soir 7" };
/* La configuration de sshd chargée (au dernier démarrage ou rechargement) : celle que voient les connexions. */
function sshdChargeIle(h){ var e = etatIle(h); return e.sshdCharge !== undefined ? e.sshdCharge : (lireIle(h, "/etc/ssh/sshd_config") || ""); }
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || e.unite !== "ssh.service") return;
	if ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif)) etatIle(e.hote).sshdCharge = lireIle(e.hote, "/etc/ssh/sshd_config") || "";
});
/* Les réglages effectifs pour un compte : le début du fichier, puis les blocs Match User / Group qui le concernent. */
function sshdPourIle(h, compte, groupes){
	var r = {}, actif = true;
	sshdChargeIle(h).split("\n").forEach(function(l){
		var t = l.replace(/#.*$/, "").trim();
		if (!t) return;
		var m = /^(\S+)\s+(.*)$/.exec(t);
		if (!m) return;
		var k = m[1].toLowerCase(), v = m[2].trim();
		if (k === "match"){
			var c = v.split(/\s+/);
			actif = false;
			if (c[0].toLowerCase() === "all") actif = true;
			for (var i = 0; i + 1 < c.length; i += 2){
				var quoi = c[i].toLowerCase(), liste = c[i + 1].split(",");
				if (quoi === "user") actif = liste.indexOf(compte) > -1;
				else if (quoi === "group") actif = liste.some(function(g){ return groupes.indexOf(g) > -1; });
				else actif = false;
				if (!actif) break;
			}
			return;
		}
		if (actif && r[k] === undefined) r[k] = v;
	});
	return r;
}
function cheminChrootValideIle(h, chemin){
	var morceaux = cheminNormal(chemin).split("/").filter(Boolean), c = "";
	if (!dossierHote(h, chemin)) return "fatal: chroot(\"" + chemin + "\"): No such file or directory";
	for (var i = 0; i <= morceaux.length; i++){
		c = "/" + morceaux.slice(0, i).join("/");
		var d = dossierHote(h, c);
		if (!d) continue;
		if (d.owner !== "root" || d.mode.charAt(4) === "w" || d.mode.charAt(7) === "w") return "fatal: bad ownership or modes for chroot directory " + (i === morceaux.length ? "" : "component ") + "\"" + c + "\"";
	}
	return null;
}
Shell.sorts.sftp = function(args, io){
	var h = ileIci() || Shell.hote();
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible || !estHoteIle(h)) throw new ShellError("usage: sftp [-46AaCfNpqrv] [-B buffer_size] [-b batchfile] [-c cipher]\n          [-D sftp_server_command] [-F ssh_config] [-i identity_file]\n          [-J destination] [-l limit] [-o ssh_option] [-P port]\n          [-R num_requests] [-S program] [-s subsystem | sftp_server]\n          destination", 1);
	var m = /^(?:([^@]+)@)?([^:]+)$/.exec(cible);
	var compte = m[1] || JOUEUR, s = resoudreHoteIle(m[2]);
	if (!s || !estHoteIle(s)) throw new ShellError("ssh: Could not resolve hostname " + m[2] + ": Name or service not known\nConnection closed.", 255);
	if (!serviceActifIle(s, "ssh")) throw new ShellError("ssh: connect to host " + m[2] + " port 22: Connection refused\nConnection closed.", 255);
	var u = utilisateurLocalIle(s, compte) || comptePourIle(s, compte);
	if (!io.tty || !term || !term.demander) throw new ShellError("sftp : la connexion se fait à l'écran (le mot de passe est demandé).", 1);
	term.demander(compte + "@" + m[2] + "'s password: ", true, function(phrase){
		var attendu = MOTS_DE_PASSE_ILE[s + ":" + compte];
		var bon = u && ((attendu !== undefined && phrase === attendu) || (u.sss && typeof authentifierSssIle === "function" && authentifierSssIle(s, compte, phrase).ok));
		if (!bon){ evenementIle(h, "sftp", { serveur: s, compte: compte, ok: false }); term.echo("Permission denied, please try again.\n" + compte + "@" + m[2] + ": Permission denied (publickey,password).\nConnection closed."); io.code = 255; Shell.fin(); return; }
		var groupes = groupesCompteIle(s, u);
		var cfg = sshdPourIle(s, compte, groupes);
		var chroot = cfg.chrootdirectory && cfg.chrootdirectory !== "none" ? cfg.chrootdirectory.replace(/%u/g, compte).replace(/%h/g, u.home) : null;
		var force = cfg.forcecommand || null;
		if (chroot){
			var err = cheminChrootValideIle(s, chroot);
			if (err){ journalIle(s, "sshd", "ssh", err + " [postauth]", 2); evenementIle(h, "sftp", { serveur: s, compte: compte, ok: false, chroot: chroot, erreur: err }); term.echo("Connection closed by " + ipIle(s) + " port 22\nConnection closed."); io.code = 255; Shell.fin(); return; }
		}
		if (force && force !== "internal-sftp" && !/sftp-server/.test(force)){ term.echo("Connection closed."); Shell.fin(); return; }
		journalIle(s, "sshd", "ssh", "Accepted password for " + compte + " from " + ipIle(h) + " port " + (50000 + state.nbCommandes % 9999) + " ssh2");
		if (chroot) journalIle(s, "sshd", "ssh", "session opened for local user " + compte + " from [" + ipIle(h) + "] [postauth]");
		var sess = { racine: chroot || "/", ici: chroot ? "/" : u.home };
		evenementIle(h, "sftp", { serveur: s, compte: compte, ok: true, chroot: chroot, force: force, groupes: groupes });
		term.echo("Connected to " + m[2] + ".");
		var reel = function(p){ var abs = p.charAt(0) === "/" ? p : sess.ici + "/" + p; return cheminNormal(sess.racine + "/" + cheminNormal(abs)); };
		var boucle = function(){
			term.demander("sftp> ", false, function(ligne){
				var mots = String(ligne).trim().split(/\s+/), c = mots[0], sortie = "";
				if (c === "bye" || c === "exit" || c === "quit"){ Shell.fin(); return; }
				try {
					if (c === "pwd") sortie = "Remote working directory: " + sess.ici;
					else if (c === "cd"){ var n = cheminNormal(mots[1] ? (mots[1].charAt(0) === "/" ? mots[1] : sess.ici + "/" + mots[1]) : (chroot ? "/" : u.home)); if (!dossierHote(s, reel(n))) sortie = "Couldn't canonicalize: No such file or directory"; else sess.ici = n; }
					else if (c === "ls" || c === "dir"){
						var d = dossierHote(s, reel(mots.filter(function(x, i){ return i > 0 && x.charAt(0) !== "-"; })[0] || "."));
						if (!d) sortie = "Can't ls: No such file or directory";
						else if (!droitUnixIle(s, d, u, groupes, "r")) sortie = "remote readdir(\"" + sess.ici + "\"): Permission denied";
						else { var noms = d.children.filter(function(x){ return x.parents[0] === d; }).map(function(x){ return x.room_name; }).concat(d.items.map(function(x){ return x.itemname; })).sort(); sortie = noms.join("  "); }
						evenementIle(h, "sftpLs", { serveur: s, compte: compte, ici: sess.ici, reel: d ? cheminDuLieuMachine(d) : null, chroot: chroot });
					}
					else if (c === "put"){
						var loc = Shell.objetLisible(mots[1], io, "sftp"), dst = reel(mots[2] || nomDe(mots[1]));
						// Une destination qui est un dossier (rendus/, ou rendus) : le fichier y va, sous son nom.
						if (mots[2] && dossierHote(s, dst)) dst = cheminNormal(dst + "/" + nomDe(mots[1]));
						var dd = dossierHote(s, dossierDe(dst));
						if (!dd || !droitUnixIle(s, dd, u, groupes, "w")) sortie = "dest open \"" + (mots[2] || sess.ici + "/" + nomDe(mots[1])) + "\": Permission denied";
						else { moteurSeul(function(){ var it = poserFichierHote(s, dst, loc.item.getText(), {}); it.owner = compte; it.mode = "rw-r--r--"; }); sortie = "Uploading " + mots[1] + " to " + cheminNormal("/" + dst.substring(cheminNormal(sess.racine).replace(/\/$/, "").length)); evenementIle(h, "sftpPut", { serveur: s, compte: compte, chemin: dst, chroot: chroot }); }
					}
					else if (c === "get"){
						var it2 = fichierHote(s, reel(mots[1] || ""));
						if (!it2) sortie = "File \"" + mots[1] + "\" not found.";
						else { ecrireFichier(mots[2] || nomDe(mots[1]), it2.getText(), io, "sftp"); sortie = "Fetching " + mots[1] + " to " + (mots[2] || nomDe(mots[1])); }
					}
					else if (c === "mkdir"){ var p2 = reel(mots[1] || ""), pd = dossierHote(s, dossierDe(p2)); if (!pd || !droitUnixIle(s, pd, u, groupes, "w")) sortie = "remote mkdir \"" + mots[1] + "\": Permission denied"; else moteurSeul(function(){ creerDossierHote(s, p2, { owner: compte, mode: "rwxr-xr-x" }); }); }
					else if (c === "lpwd") sortie = "Local working directory: " + (cheminDuLieuMachine(current_room) || "/");
					else if (c === "help" || c === "?") sortie = "Available commands:\nbye                                Quit sftp\ncd path                            Change remote directory to 'path'\nget remote [local]                 Download file\nls [path]                          Display remote directory listing\nmkdir path                         Create remote directory\nput local [remote]                 Upload file\npwd                                Display remote working directory\nquit                               Quit sftp";
					else if (c) sortie = "Invalid command.";
				} catch (e){ if (e instanceof ShellError) sortie = e.message; else throw e; }
				if (sortie) term.echo(sortie);
				boucle();
			});
		};
		boucle();
	});
	return "";
};
/* ssh vers un compte enfermé dans sftp : sshd ne lui ouvre que sftp. */
var SSH_AVANT_ILE_SFTP = Shell.sorts.ssh;
Shell.sorts.ssh = function(args, io){
	var h = ileIci();
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var m = cible ? /^([^@]+)@([^:\s]+)$/.exec(cible) : null;
	var s = m ? resoudreHoteIle(m[2]) : null;
	if (!h || !m || !s || !estHoteIle(s) || MOTS_DE_PASSE_ILE[s + ":" + m[1]] === undefined) return SSH_AVANT_ILE_SFTP.apply(this, arguments);
	var u = utilisateurLocalIle(s, m[1]);
	var cfg = sshdPourIle(s, m[1], groupesCompteIle(s, u));
	if (!io.tty || !term || !term.demander) return SSH_AVANT_ILE_SFTP.apply(this, arguments);
	term.demander(m[1] + "@" + m[2] + "'s password: ", true, function(phrase){
		if (phrase !== MOTS_DE_PASSE_ILE[s + ":" + m[1]]){ term.echo("Permission denied, please try again."); io.code = 255; Shell.fin(); return; }
		if (cfg.forcecommand === "internal-sftp"){ evenementIle(h, "sshForce", { serveur: s, compte: m[1] }); term.echo("This service allows sftp connections only.\nConnection to " + m[2] + " closed."); Shell.fin(); return; }
		term.echo("Linux " + s + " " + versionNoyau(s) + " #1 SMP PREEMPT_DYNAMIC Debian x86_64\n$ (le compte " + m[1] + " a un vrai shell sur " + s + " : rien ne l'enferme encore. exit.)\nConnection to " + m[2] + " closed.");
		evenementIle(h, "sshForce", { serveur: s, compte: m[1], shell: true });
		Shell.fin();
	});
	return "";
};
