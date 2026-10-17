/**
 * SortsAnnexesBis.js : les sorts des quêtes annexes du chapitre 4 (l'Académie des Arcanes).
 *
 * Comme SortsAnnexes.js : aucune étape ni aucun défi d'un chapitre ne les enseigne. Pages de manuel hors barème.
 *
 *  - les encodages et les fins de ligne : cat -A (-v, -E, -T, -e, -t), iconv (-f, -t, -o, -c, -l, //TRANSLIT),
 *    dos2unix et unix2dos (-n), file (ISO-8859, CRLF), un script aux fins de ligne CRLF (« bad interpreter ») ;
 *  - les modèles : envsubst (avec ou sans liste de variables, -v), printenv ;
 *  - les nombres : numfmt (--to, --from, --field, --suffix, --padding), bc (scale, ibase, obase, -l, les fonctions) ;
 *  - les tubes nommés : mkfifo (-m), écrire dans un tube, le lire (cat), ls -l (p), file ;
 *  - une petite base SQLite : sqlite3 (.tables, .schema, .headers, .mode, SELECT avec WHERE, ORDER BY, GROUP BY, LIMIT,
 *    COUNT, SUM, AVG, MIN, MAX, JOIN, INSERT, UPDATE, DELETE).
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   axCat { item, options, sortie }   axIconv { de, vers, item, sortie }   axDos2unix { item, sens }
 *   axEnvsubst { sortie, liste }   axPrintenv { noms, sortie }   axNumfmt { vers, depuis, sortie }   axBc { sortie, texte }
 *   axFifo { action, item, texte }   axSql { requete, sortie, ok, item }
 */

World.fige = false;

/* ================================================================== */
/* Encodages et fins de ligne                                          */
/* ================================================================== */

if (typeof PROPRIETES_SAUVEGARDEES !== "undefined"){
	["encodage", "fifo", "axTampon", "axBase", "octets"].forEach(function(k){ if (PROPRIETES_SAUVEGARDEES.indexOf(k) === -1) PROPRIETES_SAUVEGARDEES.push(k); });
}
/* cp copie des octets : la copie garde l'encodage, les octets bruts (nombres magiques) et la base SQLite de l'original. */
GameEvents.addListener("cp", function(e){
	if (!e || !e.source || !e.copy) return;
	if (e.source.encodage) e.copy.encodage = e.source.encodage;
	if (e.source.octets) e.copy.octets = e.source.octets.slice();
	if (e.source.axBase) e.copy.axBase = JSON.parse(JSON.stringify(e.source.axBase));
});
var AX_CP1252 = { 0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x2c6, 0x89: 0x2030, 0x8a: 0x160, 0x8b: 0x2039, 0x8c: 0x152,
	0x8e: 0x17d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x2dc, 0x99: 0x2122, 0x9a: 0x161, 0x9b: 0x203a,
	0x9c: 0x153, 0x9e: 0x17e, 0x9f: 0x178 };
function axNomEncodage(n){
	var x = String(n || "").toUpperCase().replace(/\/\/.*$/, "").replace(/_/g, "-");
	if (/^UTF-?8$/.test(x)) return "UTF-8";
	if (/^(ISO-?8859-1|ISO8859-1|LATIN-?1|L1|ISO-IR-100|CP819)$/.test(x)) return "ISO-8859-1";
	if (/^(ISO-?8859-15|LATIN-?9|L9)$/.test(x)) return "ISO-8859-15";
	if (/^(WINDOWS-?1252|CP-?1252|MS-ANSI)$/.test(x)) return "WINDOWS-1252";
	if (/^(US-?ASCII|ASCII|ANSI_X3\.4-1968)$/.test(x)) return "ASCII";
	if (/^UTF-?16(LE|BE)?$/.test(x)) return "UTF-16";
	return null;
}
/* Les octets d'un objet, selon son encodage (un objet « ISO-8859-1 » range un caractère par octet). */
function axOctetsObjet(item){
	var t = contenuExact(item.getText(), item.sansFinDeLigne);
	if (item.encodage === "ISO-8859-1") return t.split("").map(function(c){ var k = c.charCodeAt(0); return k < 256 ? k : 0x3f; });
	return versOctetsUtf8(t);
}
/* Décode des octets UTF-8 ; renvoie { texte } ou { erreur: position }. */
function axDecoderUtf8(o, tolerant){
	var t = "", i = 0;
	while (i < o.length){
		var b = o[i], n = b < 0x80 ? 0 : (b & 0xe0) === 0xc0 ? 1 : (b & 0xf0) === 0xe0 ? 2 : (b & 0xf8) === 0xf0 ? 3 : -1;
		var ok = n >= 0 && i + n < o.length;
		for (var k = 1; ok && k <= n; k++) if ((o[i + k] & 0xc0) !== 0x80) ok = false;
		if (!ok){ if (tolerant){ i++; continue; } return { erreur: i }; }
		var cp = n === 0 ? b : n === 1 ? b & 0x1f : n === 2 ? b & 0x0f : b & 0x07;
		for (k = 1; k <= n; k++) cp = (cp << 6) | (o[i + k] & 0x3f);
		t += String.fromCodePoint(cp);
		i += n + 1;
	}
	return { texte: t };
}
/* L'affichage d'un objet ISO-8859-1 dans un terminal UTF-8 : chaque octet non ASCII devient « � ». */
function axAfficherLatin1(t){ return t.replace(/[\u0080-\u00ff]/g, "\ufffd"); }
/* cat -v : les octets non imprimables en notation ^X et M-X. */
function axNotationV(octets, o){
	var r = "";
	for (var i = 0; i < octets.length; i++){
		var b = octets[i];
		if (b === 10){ r += (o.E ? "$" : "") + "\n"; continue; }
		if (b === 9){ r += o.T ? "^I" : "\t"; continue; }
		if (!o.v){ r += String.fromCharCode(b); continue; }
		var m = "";
		if (b >= 128){ m = "M-"; b -= 128; }
		if (b < 32) r += m + "^" + String.fromCharCode(b + 64);
		else if (b === 127) r += m + "^?";
		else r += m + String.fromCharCode(b);
	}
	return r;
}
var CAT_AVANT_ANNEXES = Shell.sorts.cat;
Shell.sorts.cat = function(args, io){
	var lettres = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("").replace(/-/g, "") +
		args.filter(function(a){ return /^--/.test(a); }).map(function(a){ return { "--show-all": "A", "--show-nonprinting": "v", "--show-ends": "E", "--show-tabs": "T", "--number": "n" }[a] || ""; }).join("");
	var noms = args.filter(function(a){ return !/^-./.test(a); });
	var special = /[AvETet]/.test(lettres);
	var objets = [];
	try { noms.forEach(function(n){ var r = Shell.chercher(n, io, "cat"); if (r.node instanceof Item) objets.push(Shell.suivre(r.node, "cat")); }); } catch (e){ objets = []; }
	var fifo = objets.filter(function(it){ return it && it.fifo; })[0];
	if (fifo) return axLireFifo(fifo, io);
	var latin = objets.some(function(it){ return it && it.encodage === "ISO-8859-1"; });
	if (!special && !latin) return CAT_AVANT_ANNEXES.apply(this, arguments);
	var o = { v: /[Avet]/.test(lettres), E: /[AEe]/.test(lettres), T: /[ATt]/.test(lettres), n: /n/.test(lettres) };
	if (/[^AvETetn]/.test(lettres)) throw new ShellError("cat: invalid option -- '" + lettres.replace(/[AvETetn]/g, "").charAt(0) + "'\nTry 'cat --help' for more information.");
	var blocs = [];
	if (!noms.length){
		if (io.stdin === null) throw new ShellError("cat : donne-moi au moins un objet à lire. Utilisation : cat OBJET...");
		blocs.push(axNotationV(versOctetsUtf8(contenuExact(io.stdin, io.stdinSansFin)), o));
	}
	noms.forEach(function(n){
		var t = Shell.objetLisible(n, io, "cat");
		var texte;
		if (special) texte = axNotationV(axOctetsObjet(t.item), o);
		else texte = axAfficherLatin1(contenuExact(t.item.getText(), t.item.sansFinDeLigne));
		Shell.apresLecture(t, t.item.getText(), "cat", io);
		blocs.push(texte);
		GameEvents.fire({ type: "axCat", item: t.item, options: lettres, sortie: texte });
	});
	var tout = blocs.join("").replace(/\n$/, "");
	if (o.n) tout = lignesDe(tout).map(function(l, k){ return completerGauche(k + 1, 6) + "\t" + l; }).join("\n");
	return tout;
};
var LESS_AVANT_ANNEXES = Shell.sorts.less;
Shell.sorts.less = function(args, io){
	var noms = args.filter(function(a){ return !/^-/.test(a); });
	var it = null;
	try { var r = noms.length === 1 ? Shell.chercher(noms[0], io, "less") : null; it = r && r.node instanceof Item ? Shell.suivre(r.node, "less") : null; } catch (e){ it = null; }
	if (it && it.fifo) return axLireFifo(it, io);
	if (it && it.encodage === "ISO-8859-1"){
		var t = Shell.objetLisible(noms[0], io, "less");
		Shell.apresLecture(t, t.item.getText(), "less", io);
		return axNotationV(axOctetsObjet(t.item), { v: true }).replace(/\n$/, "").replace(/M-(.)/g, "<$1>") + (io.tty ? "\n" + C.gris("(less montre les octets qu'il ne sait pas lire en UTF-8 : ce texte n'est pas en UTF-8. file le dira.)") : "");
	}
	return LESS_AVANT_ANNEXES.apply(this, arguments);
};

/* file : l'encodage, les fins de ligne, les tubes et les bases SQLite. */
var FILE_AVANT_ANNEXES_BIS = Shell.sorts.file;
Shell.sorts.file = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), bref = args.indexOf("-b") > -1, mime = args.some(function(a){ return /^(-i|--mime)/.test(a); });
	var objets = noms.map(function(n){ try { var r = Shell.chercher(n, io, "file"); return r.node instanceof Item ? r.node : null; } catch (e){ return null; } });
	var concernes = objets.length && objets.every(function(it){ return it && (it.encodage || it.fifo || it.axBase || /\r\n/.test(it.getText())); });
	if (!concernes) return FILE_AVANT_ANNEXES_BIS.apply(this, arguments);
	return noms.map(function(n, k){
		var it = objets[k], t;
		if (it.fifo) t = mime ? "inode/fifo; charset=binary" : "fifo (named pipe)";
		else if (it.axBase) t = mime ? "application/vnd.sqlite3; charset=binary" : "SQLite 3.x database, last written using SQLite version 3040001, file counter " + (it.axBase.compteur || 4) + ", database pages 3, cookie 0x2, schema 4, UTF-8, version-valid-for " + (it.axBase.compteur || 4);
		else {
			var latin = it.encodage === "ISO-8859-1", texte = it.getText(), ascii = !/[^\x00-\x7f]/.test(texte), crlf = /\r\n/.test(texte);
			var enc = ascii ? "ASCII text" : latin ? "ISO-8859 text" : "Unicode text, UTF-8 text";
			if (mime) t = "text/plain; charset=" + (ascii ? "us-ascii" : latin ? "iso-8859-1" : "utf-8");
			else if (/^#!\s*\/(usr\/)?bin\/(env )?(ba)?sh/.test(texte)) t = "Bourne-Again shell script, " + enc + " executable" + (crlf ? ", with CRLF line terminators" : "");
			else t = enc + (crlf ? ", with CRLF line terminators" : "");
		}
		GameEvents.fire({ type: "file", item: it, room: current_room });
		return bref ? t : n + ": " + t;
	}).join("\n");
};

Shell.sorts.iconv = function(args, io){
	var de = null, vers = null, sortie = null, tolerant = false, noms = [], k;
	for (k = 0; k < args.length; k++){
		var a = args[k], m;
		if (a === "-l" || a === "--list") return "ANSI_X3.4-1968, ASCII, US-ASCII\nCP1252, MS-ANSI, WINDOWS-1252\nISO-8859-1, ISO8859-1, ISO_8859-1, L1, LATIN1\nISO-8859-15, ISO8859-15, LATIN-9, LATIN9\nUTF-16, UTF-16BE, UTF-16LE\nUTF-8, UTF8";
		if (a === "-f"){ de = args[++k]; continue; }
		if (a === "-t"){ vers = args[++k]; continue; }
		if (a === "-o"){ sortie = args[++k]; continue; }
		if (a === "-c"){ tolerant = true; continue; }
		if ((m = /^--from-code=(.+)$/.exec(a))){ de = m[1]; continue; }
		if ((m = /^--to-code=(.+)$/.exec(a))){ vers = m[1]; continue; }
		if ((m = /^--output=(.+)$/.exec(a))){ sortie = m[1]; continue; }
		if ((m = /^-f(.+)$/.exec(a))){ de = m[1]; continue; }
		if ((m = /^-t(.+)$/.exec(a))){ vers = m[1]; continue; }
		if (a.charAt(0) === "-" && a.length > 1) throw new ShellError("iconv: invalid option -- '" + a.charAt(1) + "'\nTry 'iconv --help' or 'iconv --usage' for more information.");
		noms.push(a);
	}
	var nomDe = axNomEncodage(de || "UTF-8"), nomVers = axNomEncodage(vers || "UTF-8");
	if (de && !nomDe) throw new ShellError("iconv: conversion from `" + de + "' is not supported\nTry `iconv --help' or `iconv --usage' for more information.");
	if (vers && !nomVers) throw new ShellError("iconv: conversion to `" + vers + "' is not supported\nTry `iconv --help' or `iconv --usage' for more information.");
	var translit = /\/\/TRANSLIT/i.test(vers || ""), ignorer = tolerant || /\/\/IGNORE/i.test(vers || "");
	var item = null, octets;
	if (noms.length){ var t = Shell.objetLisible(noms[0], io, "iconv"); item = t.item; octets = axOctetsObjet(item); }
	else { if (io.stdin === null) throw new ShellError("iconv : quel fichier ? Utilisation : iconv -f ISO-8859-1 -t UTF-8 FICHIER > NOUVEAU"); octets = versOctetsUtf8(contenuExact(io.stdin, io.stdinSansFin)); }
	// Décoder.
	var texte;
	if (nomDe === "UTF-8"){
		var d = axDecoderUtf8(octets, ignorer);
		if (d.erreur !== undefined){ io.code = 1; throw new ShellError("iconv: illegal input sequence at position " + d.erreur + axAstuce(io, "(Ces octets ne sont pas de l'UTF-8 valide : le fichier est sans doute dans un autre encodage. file le dit.)"), 1); }
		texte = d.texte;
	} else if (nomDe === "WINDOWS-1252") texte = octets.map(function(b){ return String.fromCodePoint(AX_CP1252[b] || b); }).join("");
	else if (nomDe === "ISO-8859-15") texte = octets.map(function(b){ return String.fromCharCode({ 0xa4: 0x20ac, 0xa6: 0x160, 0xa8: 0x161, 0xb4: 0x17d, 0xb8: 0x17e, 0xbc: 0x152, 0xbd: 0x153, 0xbe: 0x178 }[b] || b); }).join("");
	else if (nomDe === "ASCII"){
		var mauvais = octets.findIndex(function(b){ return b > 127; });
		if (mauvais > -1 && !ignorer){ io.code = 1; throw new ShellError("iconv: illegal input sequence at position " + mauvais, 1); }
		texte = octets.filter(function(b){ return b < 128; }).map(function(b){ return String.fromCharCode(b); }).join("");
	}
	else texte = octets.map(function(b){ return String.fromCharCode(b); }).join("");
	// Encoder.
	var TRANSLIT = { "é": "e", "è": "e", "ê": "e", "ë": "e", "à": "a", "â": "a", "ä": "a", "î": "i", "ï": "i", "ô": "o", "ö": "o", "ù": "u", "û": "u", "ü": "u", "ç": "c", "œ": "oe", "æ": "ae",
		"É": "E", "È": "E", "Ê": "E", "À": "A", "Ç": "C", "Œ": "OE", "’": "'", "«": "\"", "»": "\"", "€": "EUR", "…": "..." };
	var latinVers = nomVers === "ISO-8859-1" || nomVers === "ISO-8859-15" || nomVers === "WINDOWS-1252";
	if (nomVers === "ASCII" || latinVers){
		var limite = nomVers === "ASCII" ? 127 : 255, r = "";
		for (k = 0; k < texte.length; k++){
			var c = texte.charAt(k);
			if (c.charCodeAt(0) <= limite){ r += c; continue; }
			if (translit){ r += TRANSLIT[c] || "?"; continue; }
			if (ignorer) continue;
			io.code = 1;
			throw new ShellError("iconv: cannot convert" + axAstuce(io, "(« " + c + " » n'existe pas en " + nomVers + ". //TRANSLIT remplace par le plus proche : -t " + nomVers + "//TRANSLIT)"), 1);
		}
		texte = r;
	}
	GameEvents.fire({ type: "axIconv", de: nomDe, vers: nomVers, item: item, sortie: texte });
	if (sortie){
		Shell.ecrire(sortie, texte.replace(/\n$/, ""), false);
		var cree = Shell.chercher(sortie, io, "iconv").node;
		if (cree instanceof Item){ if (latinVers) cree.encodage = "ISO-8859-1"; else delete cree.encodage; }
		return "";
	}
	texte = texte.replace(/\n$/, "");
	return latinVers && io.tty ? axAfficherLatin1(texte) : texte;
};

function axDos2unix(sens){
	var cmd = sens === "unix" ? "dos2unix" : "unix2dos";
	return function(args, io){
		var calme = false, nouveau = false, noms = [];
		args.forEach(function(a){
			if (a === "-q" || a === "--quiet") calme = true;
			else if (a === "-n" || a === "--newfile") nouveau = true;
			else if (a === "-k" || a === "-o" || a === "--keepdate") return;
			else if (/^-/.test(a)) throw new ShellError(cmd + ": option inconnue « " + a + " »" + axAstuce(io, "(Les options courantes : -n ANCIEN NOUVEAU, -q.)"));
			else noms.push(a);
		});
		if (!noms.length){
			if (io.stdin === null) throw new ShellError(cmd + " : quel fichier ? Utilisation : " + cmd + " FICHIER (le fichier est converti sur place)");
			return sens === "unix" ? io.stdin.replace(/\r\n/g, "\n") : io.stdin.replace(/\r?\n/g, "\r\n");
		}
		var paires = [];
		if (nouveau){ for (var i = 0; i + 1 < noms.length; i += 2) paires.push([noms[i], noms[i + 1]]); }
		else noms.forEach(function(n){ paires.push([n, n]); });
		paires.forEach(function(p){
			var t = Shell.objetLisible(p[0], io, cmd), texte = t.item.getText();
			var converti = sens === "unix" ? texte.replace(/\r\n/g, "\n").replace(/\r$/, "") : texte.replace(/\r?\n/g, "\r\n") + (t.item.sansFinDeLigne || /\r\n$/.test(texte) ? "" : "\r");
			if (p[0] === p[1]){
				if (!Shell.bit(t.item, "w", io)) throw new ShellError(cmd + ": Failed to open temporary output file: Permission denied");
				t.item.setText(converti);
				GameEvents.fire({ type: "write", item: t.item, room: t.room, append: false, text: converti, created: false, previous: texte });
			} else {
				Shell.ecrire(p[1], converti, false, !!t.item.sansFinDeLigne);
				var cree = Shell.chercher(p[1], io, cmd).node;
				if (cree instanceof Item && t.item.encodage) cree.encodage = t.item.encodage;
			}
			GameEvents.fire({ type: "axDos2unix", item: p[0] === p[1] ? t.item : Shell.chercher(p[1], io, cmd).node, sens: sens });
			if (!calme) io.err(cmd + ": converting file " + (p[0] === p[1] ? p[0] : p[0] + " to file " + p[1]) + " to " + (sens === "unix" ? "Unix" : "DOS") + " format...");
		});
		return "";
	};
}
Shell.sorts.dos2unix = axDos2unix("unix");
Shell.sorts.unix2dos = axDos2unix("dos");

/* Un script aux fins de ligne CRLF : bash lit « #!/bin/bash\r » et cherche un interpréteur qui s'appelle « bash\r ». */
var LANCER_SCRIPT_AVANT_ANNEXES_BIS = Shell.lancerScript;
Shell.lancerScript = function(chemin, io, direct, args, options){
	var it = null;
	try { var r = Shell.chercher(chemin, io, "bash"); it = r.node instanceof Item ? Shell.suivre(r.node, "bash") : null; } catch (e){ it = null; }
	if (it && /\r\n/.test(it.getText())){
		var texte = it.getText();
		if (direct && /^#!/.test(texte) && Shell.bit(it, "x", io)){
			var interp = /^#!\s*(\S+)/.exec(texte)[1].replace(/\r$/, "");
			GameEvents.fire({ type: "axCrlf", item: it, direct: true });
			throw new ShellError("bash: " + chemin + ": " + interp + "^M: bad interpreter: No such file or directory" +
				axAstuce(io, "(La première ligne finit par un \\r invisible : bash cherche un programme « " + interp + "\\r », qui n'existe pas. cat -A le montre (^M), dos2unix le retire.)"), 126);
		}
		if (!direct){
			GameEvents.fire({ type: "axCrlf", item: it, direct: false });
			lignesDe(texte).forEach(function(l, k){ if (l === "\r") io.err(chemin + ": ligne " + (k + 1) + ": $'\\r' : commande introuvable"); });
			// bash lit chaque ligne avec son \r au bout : on le retire le temps de l'exécution (le fichier, lui, ne change pas).
			var avant = Object.getOwnPropertyDescriptor(it.cmd_text, "less");
			it.cmd_text.less = texte.replace(/\r\n/g, "\n");
			try { return LANCER_SCRIPT_AVANT_ANNEXES_BIS.apply(this, arguments); }
			finally { Object.defineProperty(it.cmd_text, "less", avant); }
		}
	}
	return LANCER_SCRIPT_AVANT_ANNEXES_BIS.apply(this, arguments);
};

/* ================================================================== */
/* envsubst et printenv                                                */
/* ================================================================== */

/* Les variables d'environnement, celles que voient les programmes : les variables du système, et celles qu'on a exportées. */
function axEnvironnement(){
	var env = { HOME: axCheminMaison(), LANG: "fr_FR.UTF-8", LOGNAME: JOUEUR, PATH: "/usr/local/bin:/usr/bin:/bin", PWD: Shell.cheminAffiche(current_room), SHELL: "/bin/bash", USER: JOUEUR, HOSTNAME: Shell.hote() };
	Object.keys(state.env).forEach(function(n){ if (!Interpreteur.nonExportees.hasOwnProperty(n)) env[n] = state.env[n]; });
	// Dans un script : les variables exportées de ses portées.
	(Interpreteur.cadres || []).forEach(function(c){ Object.keys(c.exportees || {}).forEach(function(n){ if (c.vars[n] !== undefined) env[n] = c.vars[n]; }); });
	return env;
}
Shell.sorts.printenv = function(args, io){
	var env = axEnvironnement(), noms = args.filter(function(a){ return !/^-/.test(a); }), lignes = [];
	if (!noms.length){
		Object.keys(env).sort().forEach(function(n){ lignes.push(n + "=" + env[n]); });
	} else {
		noms.forEach(function(n){ if (env.hasOwnProperty(n)) lignes.push(env[n]); else io.code = 1; });
	}
	var sortie = lignes.join("\n");
	GameEvents.fire({ type: "axPrintenv", noms: noms, sortie: sortie });
	if (noms.length && io.code === 1 && io.tty && !lignes.length){
		var inconnue = noms.filter(function(n){ return !env.hasOwnProperty(n); })[0];
		if (Interpreteur.nonExportees.hasOwnProperty(inconnue) || state.env.hasOwnProperty(inconnue)) io.errFin(C.gris("(" + inconnue + " existe dans ton shell, mais elle n'est pas EXPORTÉE : les programmes ne la voient pas. export " + inconnue + ")"));
	}
	return sortie;
};
Shell.sorts.envsubst = function(args, io){
	var lister = false, format = null;
	args.forEach(function(a){
		if (a === "-v" || a === "--variables") lister = true;
		else if (a === "--help") return;
		else if (/^-/.test(a)) throw new ShellError("envsubst: invalid option -- '" + a.replace(/^-+/, "") + "'\nTry 'envsubst --help' for more information.");
		else format = a;
	});
	var RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, m;
	var liste = null;
	if (format !== null){ liste = []; while ((m = RE.exec(format)) !== null) liste.push(m[1] || m[2]); }
	if (lister){ if (!liste) throw new ShellError("envsubst: missing arguments"); return liste.join("\n"); }
	if (io.stdin === null) throw new ShellError("envsubst : le modèle arrive par l'entrée : envsubst < MODELE > RESULTAT" +
		axAstuce(io, "(Sans entrée, envsubst attendrait que tu tapes le modèle, puis Ctrl+D.)"));
	var env = axEnvironnement();
	var sortie = contenuExact(io.stdin, io.stdinSansFin).replace(RE, function(tout, a, b){
		var nom = a || b;
		if (liste && liste.indexOf(nom) === -1) return tout;
		return env.hasOwnProperty(nom) ? env[nom] : "";
	}).replace(/\n$/, "");
	GameEvents.fire({ type: "axEnvsubst", sortie: sortie, liste: liste });
	return sortie;
};

/* ================================================================== */
/* numfmt                                                              */
/* ================================================================== */

var AX_SUFFIXES = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];
function axVersHumain(n, base, iec_i){
	var neg = n < 0;
	n = Math.abs(n);
	var k = 0;
	while (n >= base && k < AX_SUFFIXES.length - 1){ n /= base; k++; }
	if (k === 0) return (neg ? "-" : "") + String(Math.round(n));
	var texte;
	if (n < 10){ var v = Math.ceil(n * 10 - 1e-9) / 10; if (v >= 10) texte = "10"; else texte = v.toFixed(1); }
	else { var e = Math.ceil(n - 1e-9); if (e >= base){ e = 1; k++; texte = "1.0"; } else texte = String(e); }
	return (neg ? "-" : "") + texte + AX_SUFFIXES[k] + (iec_i ? "i" : "");
}
function axDepuisHumain(texte, mode){
	var m = /^\s*(-?\d+(?:[.,]\d+)?)\s*([KMGTPEZY]?)(i?)\s*$/i.exec(texte);
	if (!m) return { erreur: "invalid number: '" + texte + "'" };
	var nombre = parseFloat(m[1].replace(",", ".")), suffixe = m[2].toUpperCase(), i = m[3];
	if (suffixe === "" ) return { valeur: nombre };
	if (mode === "none") return { erreur: "rejecting suffix in input: '" + texte + "' (consider using --from)" };
	if (i && mode !== "iec-i" && mode !== "auto") return { erreur: "invalid suffix in input '" + texte + "': 'i'" };
	if (mode === "iec-i" && !i) return { erreur: "missing 'i' suffix in input: '" + texte + "' (e.g. Ki/Mi/Gi)" };
	var base = mode === "si" || (mode === "auto" && !i) ? 1000 : 1024;
	return { valeur: nombre * Math.pow(base, AX_SUFFIXES.indexOf(suffixe)) };
}
Shell.sorts.numfmt = function(args, io){
	var o = { vers: null, depuis: "none", suffixe: "", padding: 0, champ: 1, delim: null, entete: 0, format: null };
	var nombres = [], m;
	args.forEach(function(a){
		if ((m = /^--to=(.+)$/.exec(a))) o.vers = m[1];
		else if ((m = /^--from=(.+)$/.exec(a))) o.depuis = m[1];
		else if ((m = /^--suffix=(.*)$/.exec(a))) o.suffixe = m[1];
		else if ((m = /^--padding=(-?\d+)$/.exec(a))) o.padding = +m[1];
		else if ((m = /^--field=(\d+)$/.exec(a))) o.champ = +m[1];
		else if ((m = /^(?:-d|--delimiter=)(.)$/.exec(a))) o.delim = m[1];
		else if ((m = /^--header(?:=(\d+))?$/.exec(a))) o.entete = m[1] ? +m[1] : 1;
		else if ((m = /^--format=(.+)$/.exec(a))) o.format = m[1];
		else if (/^--/.test(a)) throw new ShellError("numfmt: unrecognized option '" + a + "'\nTry 'numfmt --help' for more information.");
		else nombres.push(a);
	});
	["vers", "depuis"].forEach(function(k){
		if (o[k] !== null && ["si", "iec", "iec-i", "auto", "none"].indexOf(o[k]) === -1) throw new ShellError("numfmt: invalid argument '" + o[k] + "' for '--" + (k === "vers" ? "to" : "from") + "'\nValid arguments are:\n  - 'none'\n  - 'auto'\n  - 'si'\n  - 'iec'\n  - 'iec-i'");
	});
	if (o.vers === "auto") throw new ShellError("numfmt: invalid argument 'auto' for '--to'");
	function convertir(t){
		var r = axDepuisHumain(t, o.depuis);
		if (r.erreur) throw new ShellError("numfmt: " + r.erreur, 2);
		var v = r.valeur, s;
		if (o.vers === "iec") s = axVersHumain(v, 1024, false);
		else if (o.vers === "iec-i") s = axVersHumain(v, 1024, true);
		else if (o.vers === "si") s = axVersHumain(v, 1000, false);
		else s = String(Math.round(v) === v ? v : Math.ceil(v));
		s += o.suffixe;
		if (o.padding > 0) s = completerGauche(s, o.padding); else if (o.padding < 0) s = completerDroite(s, -o.padding);
		return s;
	}
	var lignes;
	if (nombres.length) lignes = nombres.map(convertir);
	else {
		if (io.stdin === null) throw new ShellError("numfmt : quels nombres ? numfmt --to=iec 1536, ou une colonne par un tuyau : ... | numfmt --to=iec --field=2");
		lignes = lignesDe(io.stdin).map(function(l, k){
			if (k < o.entete || l.trim() === "") return l;
			var morceaux = o.delim ? l.split(o.delim) : l.split(/(\s+)/);
			if (o.delim){ morceaux[o.champ - 1] = convertir(morceaux[o.champ - 1] || ""); return morceaux.join(o.delim); }
			var vrais = morceaux.filter(function(x, i){ return i % 2 === 0; });
			var idx = (o.champ - 1) * 2 + (morceaux[0] === "" ? 2 : 0);
			if (morceaux[idx] === undefined) return l;
			var avant = morceaux[idx];
			morceaux[idx] = convertir(avant);
			return morceaux.join("");
		});
	}
	var sortie = lignes.join("\n");
	GameEvents.fire({ type: "axNumfmt", vers: o.vers, depuis: o.depuis, sortie: sortie, entree: nombres.length ? nombres.join(" ") : io.stdin });
	return sortie;
};

/* ================================================================== */
/* bc : la calculatrice en précision arbitraire                        */
/* ================================================================== */

/* Un nombre de bc : { n: BigInt (la valeur multipliée par 10^s), s: le nombre de décimales }. */
function axBcNombre(texte){
	var m = /^(\d*)(?:\.(\d*))?$/.exec(texte);
	var e = m[1] || "0", d = m[2] || "";
	return { n: BigInt(e + d), s: d.length };
}
function axBcPuissance10(k){ var r = 1n; for (var i = 0; i < k; i++) r *= 10n; return r; }
function axBcEchelle(x, s){
	if (s === x.s) return x;
	if (s > x.s) return { n: x.n * axBcPuissance10(s - x.s), s: s };
	return { n: x.n / axBcPuissance10(x.s - s), s: s };   // la division des BigInt tronque vers zéro, comme bc
}
function axBcVersTexte(x, obase){
	if (obase && obase !== 10){
		var entier = x.n / axBcPuissance10(x.s), neg = entier < 0n;
		if (neg) entier = -entier;
		var chiffres = "0123456789ABCDEF", t = "";
		if (entier === 0n) t = "0";
		while (entier > 0n){ var r = Number(entier % BigInt(obase)); t = (obase <= 16 ? chiffres.charAt(r) : " " + (r < 10 ? "0" : "") + r) + t; entier /= BigInt(obase); }
		return (neg ? "-" : "") + t.trim();
	}
	var neg2 = x.n < 0n, a = neg2 ? -x.n : x.n, txt = a.toString();
	if (x.s > 0){
		while (txt.length <= x.s) txt = "0" + txt;
		var e2 = txt.substring(0, txt.length - x.s), d2 = txt.substring(txt.length - x.s);
		txt = (e2 === "0" ? "" : e2) + "." + d2;
	}
	if (neg2 && /[1-9]/.test(txt)) txt = "-" + txt;
	// Une ligne de bc fait 70 caractères au plus : au-delà, une barre oblique inverse et la suite.
	var lignes = [];
	while (txt.length > 70){ lignes.push(txt.substring(0, 69) + "\\"); txt = txt.substring(69); }
	lignes.push(txt);
	return lignes.join("\n");
}
function axBcDepuisNombreJs(v, s){ return axBcEchelle(axBcNombreSigne(v.toFixed(Math.min(20, Math.max(s, 0) + 2))), s); }
function axBcNombreSigne(t){ var neg = t.charAt(0) === "-"; var x = axBcNombre(t.replace(/^-/, "")); if (neg) x.n = -x.n; return x; }
function axBcVersJs(x){ return Number(x.n) / Math.pow(10, x.s); }
function AxBc(echelleDefaut, maths){
	this.vars = { scale: { n: BigInt(echelleDefaut), s: 0 }, ibase: { n: 10n, s: 0 }, obase: { n: 10n, s: 0 } };
	this.maths = maths;
	this.sorties = [];
}
AxBc.prototype.echelle = function(){ return Number(this.vars.scale.n); };
AxBc.prototype.lexer = function(t){
	var j = [], i = 0, re;
	while (i < t.length){
		var c = t.charAt(i);
		if (c === "/" && t.charAt(i + 1) === "*"){ var f = t.indexOf("*/", i + 2); i = f < 0 ? t.length : f + 2; continue; }
		if (c === "#"){ while (i < t.length && t.charAt(i) !== "\n") i++; continue; }
		if (c === "\\" && t.charAt(i + 1) === "\n"){ i += 2; continue; }
		if (c === " " || c === "\t" || c === "\r"){ i++; continue; }
		if (c === "\n" || c === ";"){ j.push({ t: "fin", nl: c === "\n" }); i++; continue; }
		if ((re = /^(\d+\.?\d*|\.\d+|[0-9A-F]+)/.exec(t.substring(i))) && /[0-9.A-F]/.test(c) && !(/[A-F]/.test(c) && /^[A-Fa-z_]/.test(t.substring(i)) && /[a-z_]/.test(t.charAt(i + re[0].length)))){
			if (/^[A-F]/.test(re[0]) && Number(this.vars.ibase.n) <= 10){ throw new Error("syntax"); }
			j.push({ t: "num", v: re[0] }); i += re[0].length; continue;
		}
		if ((re = /^[a-z_][a-z0-9_]*/.exec(t.substring(i)))){ j.push({ t: "id", v: re[0] }); i += re[0].length; continue; }
		if ((re = /^(\+\+|--|\+=|-=|\*=|\/=|%=|\^=|==|!=|<=|>=|&&|\|\||[-+*\/%^()=<>!,{}])/.exec(t.substring(i)))){ j.push({ t: "op", v: re[0] }); i += re[0].length; continue; }
		if (c === "\""){ var f2 = t.indexOf("\"", i + 1); if (f2 < 0) throw new Error("syntax"); j.push({ t: "chaine", v: t.substring(i + 1, f2) }); i = f2 + 1; continue; }
		throw new Error("syntax");
	}
	j.push({ t: "fin" });
	return j;
};
AxBc.prototype.executer = function(texte){
	var jetons = this.lexer(texte), p = 0, self = this, ligne = 1;
	function voir(){ return jetons[p]; }
	function prendre(){ return jetons[p++]; }
	function est(v){ var j = voir(); return j && j.t === "op" && j.v === v; }
	function attendre(v){ if (!est(v)) throw new Error("syntax"); prendre(); }
	function nombre(v){
		var ib = Number(self.vars.ibase.n);
		if (ib === 10 || /\./.test(v)) return axBcNombre(v);
		var r = 0n; for (var i = 0; i < v.length; i++) r = r * BigInt(ib) + BigInt(parseInt(v.charAt(i), 16));
		return { n: r, s: 0 };
	}
	function primaire(){
		var j = prendre();
		if (!j) throw new Error("syntax");
		if (j.t === "num") return nombre(j.v);
		if (j.t === "op" && j.v === "("){ var v = expr(); attendre(")"); return v; }
		if (j.t === "op" && j.v === "-") return neg(primaireUnaire());
		if (j.t === "op" && j.v === "+") return primaireUnaire();
		if (j.t === "op" && j.v === "!"){ var x = primaireUnaire(); return { n: x.n === 0n ? 1n : 0n, s: 0 }; }
		if (j.t === "op" && (j.v === "++" || j.v === "--")){ var nom = prendre(); if (!nom || nom.t !== "id") throw new Error("syntax"); var a = lire(nom.v); var r2 = j.v === "++" ? ajouter(a, { n: 1n, s: 0 }) : ajouter(a, { n: -1n, s: 0 }); self.vars[nom.v] = r2; return r2; }
		if (j.t === "id"){
			if (est("(")){ prendre(); var argsF = []; if (!est(")")){ argsF.push(expr()); while (est(",")){ prendre(); argsF.push(expr()); } } attendre(")"); return fonction(j.v, argsF); }
			if (est("++") || est("--")){ var op = prendre().v, av = lire(j.v); self.vars[j.v] = ajouter(av, { n: op === "++" ? 1n : -1n, s: 0 }); return av; }
			return lire(j.v);
		}
		throw new Error("syntax");
	}
	function primaireUnaire(){ return puissance(); }
	function lire(nom){ if (nom === "last") return self.dernier || { n: 0n, s: 0 }; return self.vars[nom] || { n: 0n, s: 0 }; }
	function neg(x){ return { n: -x.n, s: x.s }; }
	function ajouter(a, b){ var s = Math.max(a.s, b.s); return { n: axBcEchelle(a, s).n + axBcEchelle(b, s).n, s: s }; }
	function multiplier(a, b){
		var exact = { n: a.n * b.n, s: a.s + b.s };
		return axBcEchelle(exact, Math.min(a.s + b.s, Math.max(self.echelle(), a.s, b.s)));
	}
	function diviser(a, b){
		if (b.n === 0n) throw new Error("Divide by zero");
		var sc = self.echelle();
		var num = a.n * axBcPuissance10(sc + b.s), den = b.n * axBcPuissance10(a.s);
		return { n: num / den, s: sc };
	}
	function modulo(a, b){
		if (b.n === 0n) throw new Error("Modulo by zero");
		var q = diviser(a, b), prod = multiplier(q, b), s = Math.max(self.echelle() + b.s, a.s);
		return axBcEchelle({ n: axBcEchelle(a, s).n - axBcEchelle(prod, s).n, s: s }, s);
	}
	function puissanceDe(a, e){
		if (e.s > 0 && axBcEchelle(e, 0).n * axBcPuissance10(e.s) !== e.n) self.avert = "Runtime warning (func=(main), adr=8): non-zero scale in exponent";
		var k = axBcEchelle(e, 0).n, negatif = k < 0n;
		if (negatif) k = -k;
		var r = { n: axBcPuissance10(0), s: 0 }, base = a, n = Number(k);
		if (n > 5000) throw new Error("exponent too large in raise");
		for (var i = 0; i < n; i++) r = { n: r.n * base.n, s: r.s + base.s };
		if (negatif) return diviser({ n: 1n, s: 0 }, r);
		return axBcEchelle(r, Math.min(a.s * n, Math.max(self.echelle(), a.s)));
	}
	function puissance(){
		var b = primaire();
		if (est("^")){ prendre(); var e = puissanceUnaire(); return puissanceDe(b, e); }
		return b;
	}
	function puissanceUnaire(){ if (est("-")){ prendre(); return neg(puissanceUnaire()); } return puissance(); }
	function produit(){
		var a = puissance();
		while (est("*") || est("/") || est("%")){ var op = prendre().v, b = puissance(); a = op === "*" ? multiplier(a, b) : op === "/" ? diviser(a, b) : modulo(a, b); }
		return a;
	}
	function somme(){
		var a = produit();
		while (est("+") || est("-")){ var op = prendre().v, b = produit(); a = op === "+" ? ajouter(a, b) : ajouter(a, neg(b)); }
		return a;
	}
	function comparer(a, b){ var s = Math.max(a.s, b.s), x = axBcEchelle(a, s).n, y = axBcEchelle(b, s).n; return x < y ? -1 : x > y ? 1 : 0; }
	function relation(){
		var a = somme();
		while (est("<") || est(">") || est("<=") || est(">=") || est("==") || est("!=")){
			var op = prendre().v, b = somme(), c = comparer(a, b);
			var ok = op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : op === ">=" ? c >= 0 : op === "==" ? c === 0 : c !== 0;
			a = { n: ok ? 1n : 0n, s: 0 };
		}
		return a;
	}
	function et(){ var a = relation(); while (est("&&")){ prendre(); var b = relation(); a = { n: a.n !== 0n && b.n !== 0n ? 1n : 0n, s: 0 }; } return a; }
	function ou(){ var a = et(); while (est("||")){ prendre(); var b = et(); a = { n: a.n !== 0n || b.n !== 0n ? 1n : 0n, s: 0 }; } return a; }
	function affectation(){
		var j = voir(), j2 = jetons[p + 1];
		if (j && j.t === "id" && j2 && j2.t === "op" && /^([+\-*\/%^]?=)$/.test(j2.v) && j2.v !== "=="){
			p += 2;
			var v = affectation();
			if (j2.v !== "="){ var a = lire(j.v), op = j2.v.charAt(0); v = op === "+" ? ajouter(a, v) : op === "-" ? ajouter(a, neg(v)) : op === "*" ? multiplier(a, v) : op === "/" ? diviser(a, v) : op === "%" ? modulo(a, v) : puissanceDe(a, v); }
			if (j.v === "scale" || j.v === "ibase" || j.v === "obase") v = axBcEchelle(v, 0);
			if ((j.v === "ibase" || j.v === "obase") && (v.n < 2n || v.n > 16n && j.v === "ibase")) { self.avert = "Runtime warning: " + j.v + " too small/large, set to " + (v.n < 2n ? 2 : 16); v = { n: v.n < 2n ? 2n : 16n, s: 0 }; }
			self.vars[j.v] = v;
			return { affecte: true, v: v };
		}
		return ou();
	}
	function expr(){ var r = affectation(); return r.affecte ? r.v : r; }
	function fonction(nom, a){
		var sc = self.echelle();
		if (nom === "sqrt"){
			var x = a[0]; if (x.n < 0n) throw new Error("Square root of a negative number");
			var s2 = Math.max(sc, x.s), grand = axBcEchelle(x, 2 * s2 + 2).n, r = grand, y;
			if (grand === 0n) return { n: 0n, s: s2 };
			y = (r + 1n) / 2n; while (y < r){ r = y; y = (r + grand / r) / 2n; }
			return axBcEchelle({ n: r, s: s2 + 1 }, s2);
		}
		if (nom === "length"){ var t = (a[0].n < 0n ? -a[0].n : a[0].n).toString(); return { n: BigInt(Math.max(t.replace(/^0+/, "").length, a[0].s, 1)), s: 0 }; }
		if (nom === "scale") return { n: BigInt(a[0].s), s: 0 };
		if (self.maths){
			var v = axBcVersJs(a[0]), r2;
			if (nom === "s") r2 = Math.sin(v); else if (nom === "c") r2 = Math.cos(v); else if (nom === "a") r2 = Math.atan(v);
			else if (nom === "l"){ if (v <= 0) throw new Error("l() of a non-positive number"); r2 = Math.log(v); }
			else if (nom === "e") r2 = Math.exp(v);
			if (r2 !== undefined) return axBcDepuisNombreJs(r2, sc);
		}
		throw new Error("Function " + nom + " not defined");
	}
	while (p < jetons.length){
		var j = voir();
		if (j.t === "fin"){ prendre(); if (j.nl) ligne++; continue; }
		if (j.t === "id" && (j.v === "quit" || j.v === "halt")){ self.fini = true; return; }
		if (j.t === "chaine"){ prendre(); self.sorties.push(j.v.replace(/\\n/g, "\n")); continue; }
		if (j.t === "id" && j.v === "print"){ prendre(); var morceaux = []; do { if (voir().t === "chaine") morceaux.push(prendre().v.replace(/\\n/g, "\n")); else morceaux.push(axBcVersTexte(expr(), Number(self.vars.obase.n))); } while (est(",") && prendre()); self.sorties.push(morceaux.join("")); continue; }
		var r;
		try { r = affectation(); }
		catch (e){
			if (e.message === "syntax"){ self.erreurs.push("(standard_in) " + ligne + ": syntax error"); while (p < jetons.length && voir().t !== "fin") p++; continue; }
			self.erreurs.push("Runtime error (func=(main), adr=" + p + "): " + e.message);
			while (p < jetons.length && voir().t !== "fin") p++;
			continue;
		}
		if (voir() && voir().t !== "fin"){ self.erreurs.push("(standard_in) " + ligne + ": syntax error"); while (p < jetons.length && voir().t !== "fin") p++; continue; }
		if (self.avert){ self.erreurs.push(self.avert); self.avert = null; }
		if (!r.affecte){ self.dernier = r; self.sorties.push(axBcVersTexte(r, Number(self.vars.obase.n))); }
	}
};
Shell.sorts.bc = function(args, io){
	var maths = false, calme = false, fichiers = [];
	args.forEach(function(a){
		if (a === "-l" || a === "--mathlib") maths = true;
		else if (a === "-q" || a === "--quiet") calme = true;
		else if (/^-[lq]+$/.test(a)){ if (a.indexOf("l") > -1) maths = true; calme = true; }
		else if (/^-/.test(a)) throw new ShellError("bc: illegal option -- " + a.replace(/^-+/, "") + "\nusage: bc [options] [file ...]");
		else fichiers.push(a);
	});
	var textes = fichiers.map(function(f){ return Shell.objetLisible(f, io, "bc").item.getText(); });
	if (io.stdin !== null) textes.push(io.stdin);
	if (!textes.length) throw new ShellError("bc 1.07.1\nCopyright 1991-1994, 1997, 1998, 2000, 2004, 2006, 2008, 2012-2017 Free Software Foundation, Inc." +
		axAstuce(io, "(bc attendrait que tu tapes tes calculs, puis quit. Ici, donne-les par un tuyau : echo \"scale=2; 10/3\" | bc)"));
	var calc = new AxBc(maths ? 20 : 0, maths);
	calc.erreurs = [];
	for (var k = 0; k < textes.length && !calc.fini; k++){
		try { calc.executer(textes[k]); }
		catch (e){ calc.erreurs.push("(standard_in) 1: syntax error"); }
	}
	calc.erreurs.forEach(function(e){ io.err(e); });
	var sortie = calc.sorties.join("\n").replace(/\n$/, "");
	GameEvents.fire({ type: "axBc", sortie: sortie, texte: textes.join("\n"), maths: maths });
	return sortie;
};

/* ================================================================== */
/* mkfifo : les tubes nommés                                           */
/* ================================================================== */

/* Qui lit un tube ? AX_LECTEURS_FIFO : des fonctions (item, chemin) qui renvoient vrai si un programme lit ce tube. */
var AX_LECTEURS_FIFO = [];
Shell.sorts.mkfifo = function(args, io){
	var mode = "rw-r--r--", noms = [];
	for (var k = 0; k < args.length; k++){
		if (args[k] === "-m"){ var m = args[++k]; if (!/^[0-7]{3,4}$/.test(m || "")) throw new ShellError("mkfifo: invalid mode '" + m + "'"); var n = parseInt(m, 8); mode = ["r", "w", "x", "r", "w", "x", "r", "w", "x"].map(function(c, i){ return (n >> (8 - i)) & 1 ? c : "-"; }).join(""); continue; }
		if (/^-/.test(args[k])) throw new ShellError("mkfifo: invalid option -- '" + args[k].replace(/^-+/, "") + "'\nTry 'mkfifo --help' for more information.");
		noms.push(args[k]);
	}
	if (!noms.length) throw new ShellError("mkfifo: missing operand\nTry 'mkfifo --help' for more information.");
	noms.forEach(function(n){
		var r = Shell.chercher(n, io, "mkfifo");
		if (r.node !== null) throw new ShellError("mkfifo: cannot create fifo '" + n + "': File exists");
		Shell.nomValide(r.name, "mkfifo");
		Shell.verifierEcriture(r.dir, io, "mkfifo", r.name);
		var it = new Item(r.name, "", "item_sign.gif");
		it.owner = io.sudo ? "root" : JOUEUR;
		it.mode = mode;
		it.fifo = true;
		it.sansFinDeLigne = true;
		r.dir.addItem(it);
		GameEvents.fire({ type: "axFifo", action: "creation", item: it, lieu: r.dir });
	});
	return "";
};
function axLireFifo(it, io){
	if (it.axTampon){
		var t = it.axTampon;
		it.axTampon = null;
		GameEvents.fire({ type: "axFifo", action: "lecture", item: it, texte: t });
		return t.replace(/\n$/, "");
	}
	io.code = 130;
	GameEvents.fire({ type: "axFifo", action: "attente", item: it });
	return io.tty ? "^C\n" + C.gris("(" + it.itemname + " est un tube nommé : cat attend qu'un autre programme y écrive. Personne n'écrit : un vrai cat attendrait sans fin. Ctrl+C.)") : "";
}
/* Écrire dans un tube : il faut quelqu'un qui lise à l'autre bout, sinon l'écriture attend. */
var ECRIRE_AVANT_ANNEXES = Shell.ecrire;
Shell.ecrire = function(cible, texte, ajout, sansFin){
	var r = null;
	try { r = cible === "/dev/null" ? null : Shell.chercher(cible, { sudo: false }, "écriture"); } catch (e){ r = null; }
	if (r && r.node instanceof Item && r.node.fifo){
		var it = r.node, lu = false;
		AX_LECTEURS_FIFO.forEach(function(f){ if (!lu && f(it, texte)) lu = true; });
		if (!lu){
			Shell.statut = 130;
			throw new ShellError("^C\n" + C.gris("(" + it.itemname + " est un tube nommé : l'écriture attend qu'un programme le lise à l'autre bout. Personne ne lit : elle attendrait sans fin. Ctrl+C.)"), 130);
		}
		GameEvents.fire({ type: "axFifo", action: "ecriture", item: it, texte: texte });
		return;
	}
	return ECRIRE_AVANT_ANNEXES.apply(this, arguments);
};
var LIGNE_LONGUE_AVANT_ANNEXES = Shell.ligneLongue;
Shell.ligneLongue = function(noeud, nom, io){
	if (noeud instanceof Item && noeud.fifo){
		var affiche = nom || noeud.toString();
		return "p" + noeud.mode + "  " + completerDroite(noeud.owner, 9) + " " + completerGauche(0, 6) + "  " + (io.tty ? C.jaune(affiche) : affiche);
	}
	return LIGNE_LONGUE_AVANT_ANNEXES.apply(this, arguments);
};

/* ================================================================== */
/* sqlite3 : une petite base de données                                */
/* ================================================================== */

/* Une base : { tables: { nom: { colonnes: [{ nom, type }], lignes: [[...]], sql: "CREATE TABLE ..." } }, ordre: [noms], compteur }. */
function AxSqlErreur(message){ this.message = message; }
function axSqlJetons(texte){
	var j = [], i = 0, m;
	while (i < texte.length){
		var c = texte.charAt(i), reste = texte.substring(i);
		if (/\s/.test(c)){ i++; continue; }
		if (reste.indexOf("--") === 0){ var f = texte.indexOf("\n", i); i = f < 0 ? texte.length : f; continue; }
		if (c === "'"){
			var s = "", k = i + 1;
			while (k < texte.length){ if (texte.charAt(k) === "'"){ if (texte.charAt(k + 1) === "'"){ s += "'"; k += 2; continue; } break; } s += texte.charAt(k); k++; }
			if (k >= texte.length) throw new AxSqlErreur("Parse error: unrecognized token: \"" + texte.substring(i, i + 12) + "\"");
			j.push({ t: "texte", v: s }); i = k + 1; continue;
		}
		if (c === "\"" || c === "`" || c === "["){
			var fin = c === "[" ? "]" : c, k2 = texte.indexOf(fin, i + 1);
			if (k2 < 0) throw new AxSqlErreur("Parse error: unrecognized token: \"" + c + "\"");
			j.push({ t: "id", v: texte.substring(i + 1, k2), cite: true }); i = k2 + 1; continue;
		}
		if ((m = /^(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?/.exec(reste))){ j.push({ t: "num", v: parseFloat(m[0]), entier: /^\d+$/.test(m[0]) }); i += m[0].length; continue; }
		if ((m = /^[A-Za-z_\u00c0-\u017f][A-Za-z0-9_\u00c0-\u017f]*/.exec(reste))){ j.push({ t: "id", v: m[0], haut: m[0].toUpperCase() }); i += m[0].length; continue; }
		if ((m = /^(<=|>=|<>|!=|==|\|\||[-+*\/%=<>(),.;])/.exec(reste))){ j.push({ t: "op", v: m[0] }); i += m[0].length; continue; }
		throw new AxSqlErreur("Parse error: unrecognized token: \"" + c + "\"");
	}
	return j;
}
var AX_SQL_MOTS = ["SELECT", "FROM", "WHERE", "ORDER", "BY", "GROUP", "HAVING", "LIMIT", "OFFSET", "ASC", "DESC", "AND", "OR", "NOT", "LIKE", "IN", "IS", "NULL", "BETWEEN",
	"AS", "DISTINCT", "JOIN", "INNER", "LEFT", "ON", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "DROP"];
function AxSql(base){ this.base = base; }
AxSql.prototype.analyser = function(texte){
	var j = axSqlJetons(texte), p = 0, self = this;
	function voir(k){ return j[p + (k || 0)]; }
	function mot(m){ var x = voir(); return x && x.t === "id" && !x.cite && x.haut === m; }
	function op(v){ var x = voir(); return x && x.t === "op" && x.v === v; }
	function prendre(){ return j[p++]; }
	function erreur(){ var x = voir(); throw new AxSqlErreur("Parse error: near \"" + (x ? (x.t === "texte" ? "'" + x.v + "'" : x.v) : "") + "\": syntax error"); }
	function attendreMot(m){ if (!mot(m)) erreur(); prendre(); }
	function attendreOp(v){ if (!op(v)) erreur(); prendre(); }
	function identifiant(){ var x = voir(); if (!x || x.t !== "id" || (!x.cite && AX_SQL_MOTS.indexOf(x.haut) > -1)) erreur(); prendre(); return x.v; }
	function primaire(){
		var x = voir();
		if (!x) erreur();
		if (x.t === "num"){ prendre(); return { k: "lit", v: x.v }; }
		if (x.t === "texte"){ prendre(); return { k: "lit", v: x.v }; }
		if (mot("NULL")){ prendre(); return { k: "lit", v: null }; }
		if (op("(")){ prendre(); var e = expr(); attendreOp(")"); return e; }
		if (op("-")){ prendre(); return { k: "neg", e: primaire() }; }
		if (op("*")){ prendre(); return { k: "etoile" }; }
		if (x.t === "id"){
			prendre();
			if (op("(")){
				prendre();
				var f = { k: "fn", nom: x.v.toUpperCase(), args: [], distinct: false };
				if (mot("DISTINCT")){ prendre(); f.distinct = true; }
				if (op("*")){ prendre(); f.args.push({ k: "etoile" }); }
				else if (!op(")")){ f.args.push(expr()); while (op(",")){ prendre(); f.args.push(expr()); } }
				attendreOp(")");
				return f;
			}
			if (op(".")){ prendre(); var col = identifiant(); return { k: "col", table: x.v, nom: col }; }
			return { k: "col", nom: x.v };
		}
		erreur();
	}
	function multiplicatif(){ var a = primaire(); while (op("*") || op("/") || op("%")){ var o = prendre().v; a = { k: "bin", op: o, a: a, b: primaire() }; } return a; }
	function additif(){ var a = multiplicatif(); while (op("+") || op("-") || op("||")){ var o = prendre().v; a = { k: "bin", op: o, a: a, b: multiplicatif() }; } return a; }
	function comparaison(){
		var a = additif();
		for (;;){
			if (op("=") || op("==") || op("!=") || op("<>") || op("<") || op(">") || op("<=") || op(">=")){ var o = prendre().v; a = { k: "bin", op: o, a: a, b: additif() }; continue; }
			var non = false;
			if (mot("NOT") && voir(1) && voir(1).t === "id" && ["LIKE", "IN", "BETWEEN"].indexOf(voir(1).haut) > -1){ prendre(); non = true; }
			if (mot("LIKE")){ prendre(); a = { k: "like", a: a, b: additif(), non: non }; continue; }
			if (mot("IN")){ prendre(); attendreOp("("); var l = [expr()]; while (op(",")){ prendre(); l.push(expr()); } attendreOp(")"); a = { k: "in", a: a, l: l, non: non }; continue; }
			if (mot("BETWEEN")){ prendre(); var bas = additif(); attendreMot("AND"); var haut = additif(); a = { k: "between", a: a, bas: bas, haut: haut, non: non }; continue; }
			if (mot("IS")){ prendre(); var n2 = false; if (mot("NOT")){ prendre(); n2 = true; } attendreMot("NULL"); a = { k: "isnull", a: a, non: n2 }; continue; }
			return a;
		}
	}
	function negation(){ if (mot("NOT")){ prendre(); return { k: "non", e: negation() }; } return comparaison(); }
	function conjonction(){ var a = negation(); while (mot("AND")){ prendre(); a = { k: "et", a: a, b: negation() }; } return a; }
	function expr(){ var a = conjonction(); while (mot("OR")){ prendre(); a = { k: "ou", a: a, b: conjonction() }; } return a; }
	function select(){
		attendreMot("SELECT");
		var q = { k: "select", distinct: false, colonnes: [], from: null, joins: [], where: null, group: [], having: null, order: [], limit: null, offset: null };
		if (mot("DISTINCT")){ prendre(); q.distinct = true; }
		do {
			var e = expr(), alias = null;
			if (mot("AS")){ prendre(); alias = identifiant(); }
			else if (voir() && voir().t === "id" && (voir().cite || AX_SQL_MOTS.indexOf(voir().haut) === -1)) alias = identifiant();
			q.colonnes.push({ e: e, alias: alias });
		} while (op(",") && prendre());
		if (mot("FROM")){
			prendre();
			q.from = { table: identifiant(), alias: null };
			if (mot("AS")){ prendre(); q.from.alias = identifiant(); } else if (voir() && voir().t === "id" && AX_SQL_MOTS.indexOf(voir().haut) === -1) q.from.alias = identifiant();
			while (mot("JOIN") || mot("INNER") || mot("LEFT") || op(",")){
				var gauche = false;
				if (op(",")){ prendre(); var t0 = identifiant(), a0 = null; if (voir() && voir().t === "id" && AX_SQL_MOTS.indexOf(voir().haut) === -1) a0 = identifiant(); q.joins.push({ table: t0, alias: a0, on: null }); continue; }
				if (mot("LEFT")){ prendre(); gauche = true; }
				if (mot("INNER")) prendre();
				attendreMot("JOIN");
				var t = identifiant(), al = null;
				if (mot("AS")){ prendre(); al = identifiant(); } else if (voir() && voir().t === "id" && AX_SQL_MOTS.indexOf(voir().haut) === -1) al = identifiant();
				var on = null;
				if (mot("ON")){ prendre(); on = expr(); }
				q.joins.push({ table: t, alias: al, on: on, gauche: gauche });
			}
		}
		if (mot("WHERE")){ prendre(); q.where = expr(); }
		if (mot("GROUP")){ prendre(); attendreMot("BY"); do { q.group.push(expr()); } while (op(",") && prendre()); }
		if (mot("HAVING")){ prendre(); q.having = expr(); }
		if (mot("ORDER")){ prendre(); attendreMot("BY"); do { var oe = expr(), sens = "ASC"; if (mot("ASC") || mot("DESC")) sens = prendre().haut; q.order.push({ e: oe, sens: sens }); } while (op(",") && prendre()); }
		if (mot("LIMIT")){ prendre(); q.limit = expr(); if (mot("OFFSET")){ prendre(); q.offset = expr(); } else if (op(",")){ prendre(); q.offset = q.limit; q.limit = expr(); } }
		return q;
	}
	var requetes = [];
	while (p < j.length){
		if (op(";")){ prendre(); continue; }
		if (mot("SELECT")) requetes.push(select());
		else if (mot("INSERT")){
			prendre(); attendreMot("INTO");
			var q = { k: "insert", table: identifiant(), colonnes: null, valeurs: [] };
			if (op("(")){ prendre(); q.colonnes = [identifiant()]; while (op(",")){ prendre(); q.colonnes.push(identifiant()); } attendreOp(")"); }
			attendreMot("VALUES");
			do { attendreOp("("); var l = [expr()]; while (op(",")){ prendre(); l.push(expr()); } attendreOp(")"); q.valeurs.push(l); } while (op(",") && prendre());
			requetes.push(q);
		}
		else if (mot("UPDATE")){
			prendre();
			var u = { k: "update", table: identifiant(), set: [], where: null };
			attendreMot("SET");
			do { var c = identifiant(); attendreOp("="); u.set.push({ col: c, e: expr() }); } while (op(",") && prendre());
			if (mot("WHERE")){ prendre(); u.where = expr(); }
			requetes.push(u);
		}
		else if (mot("DELETE")){
			prendre(); attendreMot("FROM");
			var d = { k: "delete", table: identifiant(), where: null };
			if (mot("WHERE")){ prendre(); d.where = expr(); }
			requetes.push(d);
		}
		else erreur();
		if (p < j.length && !op(";")) erreur();
	}
	return requetes;
};
function axSqlCompare(a, b){
	if (a === null && b === null) return 0;
	if (a === null) return -1;
	if (b === null) return 1;
	var na = typeof a === "number", nb = typeof b === "number";
	if (na && nb) return a < b ? -1 : a > b ? 1 : 0;
	if (na) return -1;
	if (nb) return 1;
	return a < b ? -1 : a > b ? 1 : 0;
}
function axSqlTexte(v){
	if (v === null || v === undefined) return "";
	if (typeof v === "number"){
		if (v.reel && Math.round(v) === v) return v + ".0";
		if (Math.round(v) === v) return String(v);
		var t = v.toPrecision(15).replace(/0+$/, "").replace(/\.$/, ".0");
		return t;
	}
	if (typeof v === "object" && v.reel !== undefined) return axSqlTexte(v.v);
	return String(v);
}
/* Une valeur REAL de SQLite (AVG, une colonne REAL) s'écrit toujours avec une décimale : on garde cette marque à part. */
function AxReel(v){ this.v = v; }
function axSqlValeur(v){ return v instanceof AxReel ? v.v : v; }
function axSqlAfficher(v){ if (v instanceof AxReel){ var x = v.v; if (x === null) return ""; if (Math.round(x) === x) return x + ".0"; return String(parseFloat(x.toPrecision(15))); } return axSqlTexte(v); }
AxSql.prototype.table = function(nom){
	var t = this.base.tables[nom] || this.base.tables[Object.keys(this.base.tables).filter(function(k){ return k.toLowerCase() === String(nom).toLowerCase(); })[0]];
	if (!t) throw new AxSqlErreur("Parse error: no such table: " + nom);
	return t;
};
AxSql.prototype.evaluer = function(e, ligne, groupe){
	var self = this;
	switch (e.k){
		case "lit": return e.v;
		case "neg": var v = axSqlValeur(self.evaluer(e.e, ligne, groupe)); return v === null ? null : -v;
		case "col":
			var cles = Object.keys(ligne).filter(function(k){ var m = k.split("."); return m[1].toLowerCase() === e.nom.toLowerCase() && (!e.table || m[0].toLowerCase() === e.table.toLowerCase()); });
			if (!cles.length){
				var alias = (self.alias || {})[e.nom];
				if (alias !== undefined) return alias;
				throw new AxSqlErreur("Parse error: no such column: " + (e.table ? e.table + "." : "") + e.nom);
			}
			if (cles.length > 1 && !e.table) throw new AxSqlErreur("Parse error: ambiguous column name: " + e.nom);
			return ligne[cles[0]];
		case "etoile": return 1;
		case "bin":
			var a = axSqlValeur(self.evaluer(e.a, ligne, groupe)), b = axSqlValeur(self.evaluer(e.b, ligne, groupe));
			if (e.op === "||") return (a === null || b === null) ? null : axSqlTexte(a) + axSqlTexte(b);
			if (a === null || b === null) return null;
			if (["=", "==", "!=", "<>", "<", ">", "<=", ">="].indexOf(e.op) > -1){
				var c = axSqlCompare(a, b);
				return { "=": c === 0, "==": c === 0, "!=": c !== 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[e.op] ? 1 : 0;
			}
			var x = typeof a === "number" ? a : parseFloat(a) || 0, y = typeof b === "number" ? b : parseFloat(b) || 0;
			var reel = (self.evaluer(e.a, ligne, groupe) instanceof AxReel) || (self.evaluer(e.b, ligne, groupe) instanceof AxReel) || Math.round(x) !== x || Math.round(y) !== y;
			if (e.op === "+") return reel ? new AxReel(x + y) : x + y;
			if (e.op === "-") return reel ? new AxReel(x - y) : x - y;
			if (e.op === "*") return reel ? new AxReel(x * y) : x * y;
			if (e.op === "/"){ if (y === 0) return null; return reel ? new AxReel(x / y) : Math.trunc(x / y); }
			if (e.op === "%"){ if (y === 0) return null; return Math.trunc(x) % Math.trunc(y); }
			return null;
		case "et": var p1 = axSqlValeur(self.evaluer(e.a, ligne, groupe)), p2 = axSqlValeur(self.evaluer(e.b, ligne, groupe)); return p1 && p2 ? 1 : 0;
		case "ou": return axSqlValeur(self.evaluer(e.a, ligne, groupe)) || axSqlValeur(self.evaluer(e.b, ligne, groupe)) ? 1 : 0;
		case "non": return axSqlValeur(self.evaluer(e.e, ligne, groupe)) ? 0 : 1;
		case "like":
			var s = axSqlValeur(self.evaluer(e.a, ligne, groupe)), motif = axSqlValeur(self.evaluer(e.b, ligne, groupe));
			if (s === null || motif === null) return null;
			var re = new RegExp("^" + String(motif).replace(/[.+^${}()|[\]\\*?]/g, "\\$&").replace(/%/g, "[\\s\\S]*").replace(/_/g, "[\\s\\S]") + "$", "i");
			return re.test(axSqlTexte(s)) !== e.non ? 1 : 0;
		case "in":
			var val = axSqlValeur(self.evaluer(e.a, ligne, groupe));
			var dedans = e.l.some(function(x){ return axSqlCompare(val, axSqlValeur(self.evaluer(x, ligne, groupe))) === 0; });
			return dedans !== e.non ? 1 : 0;
		case "between":
			var w = axSqlValeur(self.evaluer(e.a, ligne, groupe));
			var ok = axSqlCompare(w, axSqlValeur(self.evaluer(e.bas, ligne, groupe))) >= 0 && axSqlCompare(w, axSqlValeur(self.evaluer(e.haut, ligne, groupe))) <= 0;
			return ok !== e.non ? 1 : 0;
		case "isnull": var z = axSqlValeur(self.evaluer(e.a, ligne, groupe)); return (z === null) !== e.non ? 1 : 0;
		case "fn":
			var AGREGATS = ["COUNT", "SUM", "AVG", "MIN", "MAX", "TOTAL", "GROUP_CONCAT"];
			if (AGREGATS.indexOf(e.nom) > -1){
				if (!groupe) throw new AxSqlErreur("Parse error: misuse of aggregate function " + e.nom + "()");
				var valeurs = groupe.map(function(l){ return e.args[0] && e.args[0].k === "etoile" ? 1 : axSqlValeur(self.evaluer(e.args[0], l, null)); });
				if (!(e.args[0] && e.args[0].k === "etoile")) valeurs = valeurs.filter(function(v){ return v !== null; });
				if (e.distinct){ var vus = []; valeurs = valeurs.filter(function(v){ if (vus.some(function(u){ return axSqlCompare(u, v) === 0; })) return false; vus.push(v); return true; }); }
				if (e.nom === "COUNT") return valeurs.length;
				if (e.nom === "GROUP_CONCAT") return valeurs.length ? valeurs.map(axSqlTexte).join(",") : null;
				if (!valeurs.length) return e.nom === "TOTAL" ? new AxReel(0) : null;
				if (e.nom === "MIN") return valeurs.reduce(function(m, v){ return axSqlCompare(v, m) < 0 ? v : m; });
				if (e.nom === "MAX") return valeurs.reduce(function(m, v){ return axSqlCompare(v, m) > 0 ? v : m; });
				var somme = valeurs.reduce(function(s, v){ return s + (typeof v === "number" ? v : parseFloat(v) || 0); }, 0);
				if (e.nom === "AVG") return new AxReel(somme / valeurs.length);
				if (e.nom === "TOTAL") return new AxReel(somme);
				return valeurs.every(function(v){ return typeof v === "number" && Math.round(v) === v; }) && !(self.colonneReelle) ? somme : new AxReel(somme);
			}
			var args = e.args.map(function(a){ return axSqlValeur(self.evaluer(a, ligne, groupe)); });
			if (e.nom === "UPPER") return args[0] === null ? null : String(args[0]).toUpperCase();
			if (e.nom === "LOWER") return args[0] === null ? null : String(args[0]).toLowerCase();
			if (e.nom === "LENGTH") return args[0] === null ? null : axSqlTexte(args[0]).length;
			if (e.nom === "ABS") return args[0] === null ? null : Math.abs(args[0]);
			if (e.nom === "ROUND"){ var d = args[1] || 0, f = Math.pow(10, d); return args[0] === null ? null : new AxReel(Math.round(args[0] * f) / f); }
			if (e.nom === "SUBSTR") return args[0] === null ? null : String(args[0]).substr((args[1] || 1) - 1, args[2] === undefined ? undefined : args[2]);
			throw new AxSqlErreur("Parse error: no such function: " + e.nom);
	}
	return null;
};
function axSqlContientAgregat(e){
	if (!e || typeof e !== "object") return false;
	if (e.k === "fn" && ["COUNT", "SUM", "AVG", "MIN", "MAX", "TOTAL", "GROUP_CONCAT"].indexOf(e.nom) > -1) return true;
	return ["a", "b", "e"].some(function(k){ return axSqlContientAgregat(e[k]); }) || (e.args || []).some(axSqlContientAgregat) || (e.l || []).some(axSqlContientAgregat);
}
AxSql.prototype.lignesDe = function(nom, alias){
	var t = this.table(nom), a = alias || nom;
	return t.lignes.map(function(l){ var r = {}; t.colonnes.forEach(function(c, i){ r[a + "." + c.nom] = c.type === "REAL" && l[i] !== null ? new AxReel(l[i]) : l[i]; }); return r; });
};
AxSql.prototype.select = function(q){
	var self = this;
	var lignes = q.from ? this.lignesDe(q.from.table, q.from.alias) : [{}];
	q.joins.forEach(function(jn){
		var droite = self.lignesDe(jn.table, jn.alias), resultat = [];
		var vide = {}; Object.keys(droite[0] || {}).forEach(function(k){ vide[k] = null; });
		lignes.forEach(function(g){
			var trouve = false;
			droite.forEach(function(d){
				var r = {}; Object.keys(g).forEach(function(k){ r[k] = g[k]; }); Object.keys(d).forEach(function(k){ r[k] = d[k]; });
				if (!jn.on || axSqlValeur(self.evaluer(jn.on, r, null))){ resultat.push(r); trouve = true; }
			});
			if (!trouve && jn.gauche){ var r2 = {}; Object.keys(g).forEach(function(k){ r2[k] = g[k]; }); Object.keys(vide).forEach(function(k){ r2[k] = null; }); resultat.push(r2); }
		});
		lignes = resultat;
	});
	if (q.where) lignes = lignes.filter(function(l){ return axSqlValeur(self.evaluer(q.where, l, null)); });
	// Les colonnes : * se déplie.
	var colonnes = [];
	q.colonnes.forEach(function(c){
		if (c.e.k === "etoile"){
			var exemple = lignes[0] || (q.from ? self.lignesDe(q.from.table, q.from.alias)[0] : null);
			var noms = exemple ? Object.keys(exemple) : self.table(q.from.table).colonnes.map(function(cc){ return (q.from.alias || q.from.table) + "." + cc.nom; });
			noms.forEach(function(k){ colonnes.push({ e: { k: "col", table: k.split(".")[0], nom: k.split(".")[1] }, titre: k.split(".")[1] }); });
		}
		else colonnes.push({ e: c.e, titre: c.alias || self.titre(c.e) });
	});
	var agregat = q.group.length || colonnes.some(function(c){ return axSqlContientAgregat(c.e); }) || axSqlContientAgregat(q.having);
	var resultats = [];
	if (agregat){
		var groupes = [], cles = {};
		lignes.forEach(function(l){
			var cle = JSON.stringify(q.group.map(function(g){ return axSqlTexte(axSqlValeur(self.evaluer(g, l, null))); }));
			if (!cles.hasOwnProperty(cle)){ cles[cle] = groupes.length; groupes.push([]); }
			groupes[cles[cle]].push(l);
		});
		if (!q.group.length && !groupes.length) groupes.push([]);
		groupes.forEach(function(g){
			var base = g[0] || {};
			if (q.having && !axSqlValeur(self.evaluer(q.having, base, g))) return;
			resultats.push({ valeurs: colonnes.map(function(c){ return self.evaluer(c.e, base, g); }), ligne: base, groupe: g });
		});
	} else {
		resultats = lignes.map(function(l){ return { valeurs: colonnes.map(function(c){ return self.evaluer(c.e, l, null); }), ligne: l }; });
	}
	if (q.distinct){ var vus = {}; resultats = resultats.filter(function(r){ var k = JSON.stringify(r.valeurs.map(axSqlAfficher)); if (vus[k]) return false; vus[k] = true; return true; }); }
	if (q.order.length){
		resultats.sort(function(x, y){
			for (var i = 0; i < q.order.length; i++){
				var o = q.order[i], a, b;
				var k = colonnes.findIndex(function(c){ return o.e.k === "col" && !o.e.table && (c.titre === o.e.nom); });
				if (o.e.k === "lit" && typeof o.e.v === "number"){ a = x.valeurs[o.e.v - 1]; b = y.valeurs[o.e.v - 1]; }
				else if (k > -1){ a = x.valeurs[k]; b = y.valeurs[k]; }
				else { self.alias = {}; a = self.evaluer(o.e, x.ligne, x.groupe); b = self.evaluer(o.e, y.ligne, y.groupe); }
				var c = axSqlCompare(axSqlValeur(a), axSqlValeur(b));
				if (c) return o.sens === "DESC" ? -c : c;
			}
			return 0;
		});
	}
	var debut = q.offset ? axSqlValeur(this.evaluer(q.offset, {}, null)) : 0;
	if (q.limit){ var n = axSqlValeur(this.evaluer(q.limit, {}, null)); resultats = resultats.slice(debut, n < 0 ? undefined : debut + n); }
	else if (debut) resultats = resultats.slice(debut);
	return { titres: colonnes.map(function(c){ return c.titre; }), lignes: resultats.map(function(r){ return r.valeurs; }) };
};
AxSql.prototype.titre = function(e){
	if (e.k === "col") return this.dansFonction && e.table ? e.table + "." + e.nom : e.nom;
	if (e.k === "fn"){ this.dansFonction = true; var t = e.nom + "(" + (e.distinct ? "DISTINCT " : "") + e.args.map(this.titre, this).join(", ") + ")"; this.dansFonction = false; return t; }
	if (e.k === "etoile") return "*";
	if (e.k === "lit") return typeof e.v === "string" ? "'" + e.v + "'" : String(e.v);
	if (e.k === "bin") return this.titre(e.a) + " " + e.op + " " + this.titre(e.b);
	return "?";
};
AxSql.prototype.modifier = function(q){
	var t = this.table(q.table), self = this;
	var indice = function(nom){ var i = t.colonnes.findIndex(function(c){ return c.nom.toLowerCase() === nom.toLowerCase(); }); if (i < 0) throw new AxSqlErreur("Parse error: table " + q.table + " has no column named " + nom); return i; };
	var enLigne = function(l){ var r = {}; t.colonnes.forEach(function(c, i){ r[q.table + "." + c.nom] = l[i]; }); return r; };
	if (q.k === "insert"){
		q.valeurs.forEach(function(v){
			var ligne = t.colonnes.map(function(){ return null; });
			var cols = q.colonnes ? q.colonnes.map(indice) : t.colonnes.map(function(c, i){ return i; });
			if (cols.length !== v.length) throw new AxSqlErreur("Parse error: " + v.length + " values for " + cols.length + " columns");
			cols.forEach(function(ci, k){ ligne[ci] = axSqlValeur(self.evaluer(v[k], {}, null)); });
			var cle = t.colonnes.findIndex(function(c){ return /PRIMARY KEY/i.test(c.contrainte || ""); });
			if (cle > -1 && ligne[cle] === null) ligne[cle] = t.lignes.reduce(function(m, l){ return Math.max(m, l[cle] || 0); }, 0) + 1;
			if (cle > -1 && t.lignes.some(function(l){ return l[cle] === ligne[cle]; })) throw new AxSqlErreur("Runtime error: UNIQUE constraint failed: " + q.table + "." + t.colonnes[cle].nom + " (19)");
			t.lignes.push(ligne);
		});
	}
	if (q.k === "update"){
		t.lignes.forEach(function(l){
			if (q.where && !axSqlValeur(self.evaluer(q.where, enLigne(l), null))) return;
			var avant = enLigne(l);
			q.set.forEach(function(s){ l[indice(s.col)] = axSqlValeur(self.evaluer(s.e, avant, null)); });
		});
	}
	if (q.k === "delete") t.lignes = t.lignes.filter(function(l){ return q.where && !axSqlValeur(self.evaluer(q.where, enLigne(l), null)); });
	this.base.compteur = (this.base.compteur || 4) + 1;
};
function axSqlFormater(r, mode, entetes){
	var lignes = [], textes = r.lignes.map(function(l){ return l.map(axSqlAfficher); });
	if (mode === "csv"){
		var cite = function(v){ return /[",\n]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v; };
		if (entetes) lignes.push(r.titres.map(cite).join(","));
		textes.forEach(function(l){ lignes.push(l.map(cite).join(",")); });
	} else if (mode === "column" || mode === "box" || mode === "table"){
		var larg = r.titres.map(function(t, i){ return Math.max(t.length, textes.reduce(function(m, l){ return Math.max(m, l[i].length); }, 0)); });
		if (mode === "column"){
			lignes.push(r.titres.map(function(t, i){ return completerDroite(t, larg[i]); }).join("  ").replace(/\s+$/, ""));
			lignes.push(larg.map(function(n){ return new Array(n + 1).join("-"); }).join("  "));
			textes.forEach(function(l){ lignes.push(l.map(function(v, i){ return completerDroite(v, larg[i]); }).join("  ").replace(/\s+$/, "")); });
		} else {
			var bord = function(g, m, d){ return g + larg.map(function(n){ return new Array(n + 3).join("─"); }).join(m) + d; };
			lignes.push(bord("┌", "┬", "┐"));
			lignes.push("│ " + r.titres.map(function(t, i){ return completerDroite(t, larg[i]); }).join(" │ ") + " │");
			lignes.push(bord("├", "┼", "┤"));
			textes.forEach(function(l){ lignes.push("│ " + l.map(function(v, i){ return completerDroite(v, larg[i]); }).join(" │ ") + " │"); });
			lignes.push(bord("└", "┴", "┘"));
		}
	} else if (mode === "line"){
		var lt = Math.max.apply(null, r.titres.map(function(t){ return t.length; }).concat([1]));
		textes.forEach(function(l, k){ if (k) lignes.push(""); l.forEach(function(v, i){ lignes.push(completerGauche(r.titres[i], lt) + " = " + v); }); });
	} else {
		if (entetes) lignes.push(r.titres.join("|"));
		textes.forEach(function(l){ lignes.push(l.join("|")); });
	}
	return lignes.join("\n");
}
var AX_SQLITE_AIDE = ".databases   les bases ouvertes\n.exit        quitter\n.headers on|off   les titres des colonnes\n.help        cette aide\n.mode MODE   list, csv, column, box, line\n.quit        quitter\n.schema ?TABLE?   les CREATE TABLE\n.tables      les tables";
Shell.sorts.sqlite3 = function(args, io){
	var mode = "list", entetes = false, fichier = null, sql = [], lecture = false;
	args.forEach(function(a){
		if (a === "-header" || a === "-headers") entetes = true;
		else if (a === "-noheader") entetes = false;
		else if (a === "-column") mode = "column";
		else if (a === "-csv") mode = "csv";
		else if (a === "-box") mode = "box";
		else if (a === "-line") mode = "line";
		else if (a === "-list") mode = "list";
		else if (a === "-readonly") lecture = true;
		else if (a === "-version"){ sql.push(".version"); }
		else if (/^-/.test(a)) throw new ShellError("sqlite3: Error: unknown option: " + a + "\nUse -help for a list of options.");
		else if (fichier === null) fichier = a;
		else sql.push(a);
	});
	if (fichier === null) throw new ShellError("sqlite3 : quelle base ? Utilisation : sqlite3 BASE.db \"REQUÊTE\" (ou sqlite3 BASE.db < requetes.sql)");
	var r = Shell.chercher(fichier, io, "sqlite3"), item = r.node;
	if (item instanceof Room) throw new ShellError("Error: unable to open database \"" + fichier + "\": unable to open database file");
	if (!item){
		Shell.verifierEcriture(r.dir, io, "sqlite3", r.name);
		item = new Item(r.name, "", "item_sign.gif"); item.owner = JOUEUR; item.axBase = { tables: {}, ordre: [], compteur: 1 }; r.dir.addItem(item);
	}
	item = Shell.suivre(item, "sqlite3");
	if (!item.axBase){
		if (item.getText() === "") item.axBase = { tables: {}, ordre: [], compteur: 1 };
		else throw new ShellError("Error: in prepare, file is not a database (26)");
	}
	if (!Shell.bit(item, "r", io)) throw new ShellError("Error: unable to open database \"" + fichier + "\": unable to open database file");
	var textes = sql.slice();
	if (!textes.length && io.stdin !== null) textes = [io.stdin];
	if (!textes.length) throw new ShellError("SQLite version 3.40.1 2022-12-28 14:03:47\nEnter \".help\" for usage hints." +
		axAstuce(io, "(Ici, sqlite3 ne s'ouvre pas en mode interactif : donne la requête entre guillemets, sqlite3 " + fichier + " \"SELECT ...;\", ou un fichier : sqlite3 " + fichier + " < requetes.sql)"));
	var moteur = new AxSql(item.axBase), sorties = [], erreur = null;
	textes.forEach(function(texte){
		if (erreur) return;
		// Les commandes à point (.tables, .schema...) occupent une ligne entière ; le reste est du SQL.
		var tampon = "";
		lignesDe(texte).forEach(function(ligne, n){
			if (erreur) return;
			var l = ligne.trim();
			if (tampon === "" && l.charAt(0) === "."){
				var mots = l.split(/\s+/), c = mots[0];
				if (c === ".tables" || c === ".table"){ var noms = item.axBase.ordre.slice().sort(); sorties.push(noms.join("  ")); GameEvents.fire({ type: "axSql", requete: { k: ".tables" }, sortie: noms.join("  "), ok: true, item: item }); }
				else if (c === ".schema"){
					var choix = item.axBase.ordre.filter(function(t){ return !mots[1] || t.toLowerCase() === mots[1].toLowerCase(); });
					var s = choix.map(function(t){ return item.axBase.tables[t].sql + ";"; }).join("\n");
					sorties.push(s);
					GameEvents.fire({ type: "axSql", requete: { k: ".schema", table: mots[1] || null }, sortie: s, ok: true, item: item });
				}
				else if (c === ".headers" || c === ".header") entetes = mots[1] === "on";
				else if (c === ".mode") mode = ["list", "csv", "column", "box", "line", "table"].indexOf(mots[1]) > -1 ? mots[1] : (erreur = "Error: mode should be one of: box column csv html insert json line list markdown qbox quote table tabs tcl");
				else if (c === ".help") sorties.push(AX_SQLITE_AIDE);
				else if (c === ".databases") sorties.push("main: " + axCheminLieu(r.dir) + "/" + item.itemname + " r/w");
				else if (c === ".version") sorties.push("SQLite 3.40.1 2022-12-28 14:03:47");
				else if (c === ".quit" || c === ".exit") return;
				else erreur = "Error: unknown command or invalid arguments:  \"" + c.substring(1) + "\". Enter \".help\" for help";
				return;
			}
			tampon += ligne + "\n";
			if (!/;\s*$/.test(l) && sql.length === 0) return;
			var morceau = tampon;
			tampon = "";
			try {
				moteur.analyser(morceau).forEach(function(q){
					if (q.k === "select"){
						var res = moteur.select(q);
						var f = axSqlFormater(res, mode, entetes);
						if (f !== "" || (entetes && mode !== "list")) sorties.push(f);
						GameEvents.fire({ type: "axSql", requete: q, sortie: f, ok: true, item: item, resultat: res });
					} else {
						if (lecture) throw new AxSqlErreur("Runtime error: attempt to write a readonly database (8)");
						if (!Shell.bit(item, "w", io)) throw new AxSqlErreur("Runtime error: attempt to write a readonly database (8)");
						moteur.modifier(q);
						GameEvents.fire({ type: "axSql", requete: q, sortie: "", ok: true, item: item });
					}
				});
			} catch (e){
				if (!(e instanceof AxSqlErreur)) throw e;
				erreur = (textes.length > 1 || sql.length ? "" : "") + e.message;
				GameEvents.fire({ type: "axSql", requete: null, sortie: "", ok: false, item: item });
			}
		});
		if (!erreur && tampon.trim() !== ""){
			try { moteur.analyser(tampon).forEach(function(q){ if (q.k === "select"){ var res = moteur.select(q), f = axSqlFormater(res, mode, entetes); if (f !== "") sorties.push(f); GameEvents.fire({ type: "axSql", requete: q, sortie: f, ok: true, item: item, resultat: res }); } else { moteur.modifier(q); GameEvents.fire({ type: "axSql", requete: q, sortie: "", ok: true, item: item }); } }); }
			catch (e){ if (!(e instanceof AxSqlErreur)) throw e; erreur = e.message; }
		}
	});
	if (erreur){ io.code = 1; io.err(erreur); }
	return sorties.join("\n");
};

/* ================================================================== */
/* Le manuel des sorts des annexes (hors barème)                       */
/* ================================================================== */

MANUEL["iconv"] = page("changer l'encodage d'un texte", "Internationalization CONVert",
	"Un même « é » s'écrit avec deux octets en UTF-8 (c3 a9), un seul en ISO-8859-1 (e9). Lu dans le mauvais encodage, il devient « Ã© » ou « � ».\n\n" +
	"  iconv -f ISO-8859-1 -t UTF-8 vieux.txt > neuf.txt     de l'ISO-8859-1 (latin-1) vers l'UTF-8\n" +
	"  iconv -f UTF-8 -t ASCII//TRANSLIT texte.txt           sans accents (é devient e)\n" +
	"  iconv -l                                              les encodages connus\n\n" +
	"file FICHIER dit l'encodage d'un texte. « illegal input sequence » : ce n'est pas l'encodage annoncé par -f.");
MANUEL["dos2unix"] = page("retirer les fins de ligne CRLF", "DOS TO UNIX",
	"Sous Linux, une ligne finit par \\n. Certains systèmes écrivent \\r\\n (CRLF) : le \\r invisible casse les scripts (« bad interpreter ») et les comparaisons.\n\n" +
	"  dos2unix FICHIER           converti sur place\n  dos2unix -n ANCIEN NOUVEAU dans un nouveau fichier\n  unix2dos FICHIER           l'inverse\n\n" +
	"cat -A montre le \\r : un ^M avant le $ de fin de ligne. file dit « with CRLF line terminators ».");
MANUEL["unix2dos"] = page("ajouter les fins de ligne CRLF", "UNIX TO DOS", "L'inverse de dos2unix : chaque \\n devient \\r\\n.\n\n  unix2dos FICHIER");
MANUEL["envsubst"] = page("remplir un modèle avec des variables", "ENVironment SUBSTitute",
	"envsubst lit un texte et remplace $NOM et ${NOM} par la valeur des variables d'ENVIRONNEMENT (celles qu'on a exportées).\n\n" +
	"  export ELEVE=\"Ambre Morel\"\n  envsubst < modele.txt > lettre.txt            toutes les variables\n" +
	"  envsubst '$ELEVE $DATE' < modele.txt > lettre.txt   seulement celles-là ; un $PRIX resterait tel quel\n\n" +
	"Piège : une variable posée sans export (ELEVE=Ambre) n'est pas vue : envsubst la remplace par rien.");
MANUEL["printenv"] = page("les variables d'environnement", "PRINT ENVironment",
	"  printenv          toutes les variables qu'un programme lancé maintenant recevrait\n  printenv ELEVE    la valeur d'une seule (rien, et le code 1, si elle n'est pas exportée)\n\n" +
	"Une variable du shell n'arrive aux programmes que si elle est exportée : export NOM.");
MANUEL["numfmt"] = page("écrire les nombres pour des humains", "NUMber FORMaT",
	"  numfmt --to=iec 1610612736           1.5G (puissances de 1024 : K, M, G...)\n  numfmt --to=si 1500000               1.5M (puissances de 1000)\n" +
	"  numfmt --from=iec 2G                 2147483648 (l'inverse)\n  numfmt --to=iec --field=2 < liste    seulement la deuxième colonne\n" +
	"  --suffix=o : ajoute une unité ;  --padding=8 : aligne à droite\n\nLe K de --to=iec vaut 1024 octets (un Kio), celui de --to=si 1000.");
MANUEL["bc"] = page("la calculatrice, à la virgule près", "Basic Calculator",
	"$(( )) ne calcule qu'en nombres entiers : $((10 / 3)) donne 3. bc calcule avec autant de décimales qu'on veut.\n\n" +
	"  echo \"10 / 3\" | bc              3 (scale vaut 0 : pas de décimale)\n  echo \"scale=2; 10 / 3\" | bc     3.33 (deux décimales, tronquées)\n" +
	"  echo \"scale=2; 1 / 4\" | bc      .25 (bc n'écrit pas le zéro avant le point)\n  echo \"sqrt(2)\" | bc -l          1.41421356237309504880 (-l : 20 décimales, et s, c, a, l, e)\n" +
	"  echo \"obase=2; 10\" | bc         1010 (afficher en binaire)\n\nLe point, pas la virgule : 3.5, et non 3,5.");
MANUEL["mkfifo"] = page("creuser un tube nommé", "MaKe FIFO (first in, first out)",
	"Un tube nommé est un tuyau | qui porte un nom dans un dossier : un programme y écrit, un autre y lit, sans fichier intermédiaire.\n\n" +
	"  mkfifo tube            le crée (ls -l le montre avec un p en tête : prw-r--r--)\n" +
	"  echo \"bonjour\" > tube  écrire : attend qu'un programme lise à l'autre bout\n  cat tube               lire : attend qu'un programme écrive\n\n" +
	"Rien n'est gardé sur le disque : ce qui passe dans le tube n'y reste pas.");
MANUEL["sqlite3"] = page("interroger une base de données SQLite", "SQLite 3",
	"Une base SQLite tient dans un seul fichier. Elle range ses données en tables (des lignes et des colonnes), qu'on interroge en SQL.\n\n" +
	"  sqlite3 base.db \".tables\"                         les tables\n  sqlite3 base.db \".schema eleves\"                  la structure d'une table\n" +
	"  sqlite3 base.db \"SELECT nom FROM eleves;\"         une colonne\n  ... WHERE maison = 'Runes'                       un filtre (les textes entre apostrophes)\n" +
	"  ... ORDER BY moyenne DESC                        un tri, du plus grand au plus petit\n  ... LIMIT 3                                      les trois premiers\n" +
	"  SELECT COUNT(*) FROM eleves WHERE ...;           compter ;  AVG, SUM, MIN, MAX : moyenne, somme...\n  SELECT maison, COUNT(*) FROM eleves GROUP BY maison;   par groupe\n" +
	"  sqlite3 -header -column base.db \"...\"            avec les titres, en colonnes alignées");
MANUEL["getopts"] = page("lire les options d'un script", "GET OPTionS",
	"getopts lit, une à une, les options données à un script (-n Ambre, -f...). C'est une commande intégrée au shell.\n\n" +
	"  while getopts \"n:fh\" opt; do        n: attend une valeur (dans $OPTARG) ; f et h, non\n" +
	"    case $opt in\n      n) nom=$OPTARG ;;\n      f) fort=1 ;;\n      h) aide; exit 0 ;;\n      *) echo \"usage : $0 [-f] -n NOM\" >&2; exit 2 ;;\n    esac\n  done\n" +
	"  shift $((OPTIND - 1))               ce qui reste après les options : $1, $2...\n\n" +
	"Une option inconnue donne opt=« ? » (et un message d'erreur) ; -fn Ambre et -nAmbre sont compris aussi.");
var SORTS_ANNEXES_2 = ["iconv", "dos2unix", "unix2dos", "envsubst", "printenv", "numfmt", "bc", "mkfifo", "sqlite3", "getopts"];
SORTS_ANNEXES_2.forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
(function(){
	function ajout(nom, texte){ if (MANUEL[nom]) MANUEL[nom].page += "\n\n" + texte; }
	ajout("cat", "  cat -A FICHIER   montre l'invisible : $ en fin de ligne, ^I pour une tabulation, ^M pour un \\r, M-x pour un octet non ASCII\n  (cat -v, -E, -T : une partie seulement)");
})();

World.fige = true;
