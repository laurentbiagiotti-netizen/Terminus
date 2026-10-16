/**
 * Texte.js : les sorts qui travaillent le texte, au plus près de leurs cousins GNU.
 *
 *   grep, sed, sort, head, tail, wc, uniq, tr, tee, rev, nl, fold
 *   (awk, plus gros, a son propre fichier : Awk.js ; cut reste dans SortsAvances.js)
 *
 * Tout passe par une traduction fidèle des expressions régulières POSIX (BRE pour grep et
 * sed sans -E, ERE pour grep -E, sed -E et awk) vers les expressions régulières de JavaScript.
 *
 * Conventions du jeu : un texte ne se termine pas par un retour à la ligne (le terminal en
 * ajoute un à l'affichage). Un sort qui ne trouve rien pose io.code = 1, comme le vrai grep.
 */

/* ------------------------------------------------------------------ */
/* Les expressions régulières POSIX                                    */
/* ------------------------------------------------------------------ */

/* Ce qu'est une « lettre de mot » pour GNU dans une langue à accents : lettres, chiffres, _. */
var LETTRE_DE_MOT = "A-Za-z0-9_À-ÖØ-öø-ÿ";
var MOT = "[" + LETTRE_DE_MOT + "]";

/* Les classes [[:nom:]], traduites en morceaux de classe JavaScript. */
var CLASSES_POSIX = {
	alpha: "A-Za-zÀ-ÖØ-öø-ÿ", digit: "0-9", alnum: "0-9A-Za-zÀ-ÖØ-öø-ÿ",
	upper: "A-ZÀ-ÖØ-Þ", lower: "a-zß-öø-ÿ", space: " \\t\\n\\r\\f\\v", blank: " \\t",
	punct: "!-\\/:-@\\[-`{-~", xdigit: "0-9A-Fa-f", cntrl: "\\x00-\\x1f\\x7f",
	print: " -~À-ÿ", graph: "!-~À-ÿ"
};

/* Ces bornes de mot tiennent compte des lettres accentuées, contrairement au \b de JavaScript. */
var BORNES = {
	b: "(?:(?<=" + MOT + ")(?!" + MOT + ")|(?<!" + MOT + ")(?=" + MOT + "))",
	B: "(?:(?<=" + MOT + ")(?=" + MOT + ")|(?<!" + MOT + ")(?!" + MOT + "))",
	debutMot: "(?<!" + MOT + ")(?=" + MOT + ")",
	finMot: "(?<=" + MOT + ")(?!" + MOT + ")"
};

function echapperRegexJS(c){
	return /[\\^$.*+?()[\]{}|\/-]/.test(c) ? "\\" + c : c;
}

/* Un texte pris au pied de la lettre (grep -F, index d'awk...). */
function regexLitterale(texte){
	return texte.split("").map(echapperRegexJS).join("");
}

function erreurRegex(cmd, motif, message){
	return new ShellError(cmd + " : expression régulière invalide « " + motif + " » : " + message, 2);
}

/*
 * Traduit une expression régulière POSIX en source JavaScript.
 *   mode : "bre" (grep, sed : \( \) \{ \} \| \+ \? sont les opérateurs, ( ) { } | + ? de simples lettres)
 *          "ere" (grep -E, sed -E : ( ) { } | + ? sont les opérateurs)
 *          "awk" (ERE, avec \/ et les échappements d'awk, y compris entre crochets)
 *   options.delim : le délimiteur de sed (\/ dans s/a\/b/x/ est un / ordinaire)
 *   options.sed   : les échappements \n \t de GNU sed sont aussi compris entre crochets
 * Renvoie { source, groupes }.
 */
function traduireRegex(motif, mode, cmd, options){
	options = options || {};
	var bre = mode === "bre", awk = mode === "awk";
	var sortie = "", i = 0, n = motif.length;
	var groupes = 0, fermes = 0, ouverts = [];
	var debut = true;           // en tête d'expression (ou après \( ou \|) : * y est une lettre ordinaire
	var debutAtome = -1;        // où commence, dans la sortie, le dernier élément répétable
	var quantifie = false;      // le dernier élément porte déjà une répétition
	function atome(texte){ debutAtome = sortie.length; sortie += texte; debut = false; quantifie = false; }
	function quantifier(q){
		if (debutAtome < 0){ atome(regexLitterale(q.brut)); return; }
		// a** ou a+? : en POSIX on répète la répétition ; en JavaScript, +? serait « paresseux ». On regroupe.
		if (quantifie) sortie = sortie.substring(0, debutAtome) + "(?:" + sortie.substring(debutAtome) + ")";
		sortie += q.js;
		quantifie = true;
		debut = false;
	}
	// Une répétition {m,n} : renvoie null si ce n'en est pas une (en ERE, { reste alors une lettre).
	function lireIntervalle(depuis, fermeture){
		var fin = motif.indexOf(fermeture, depuis);
		if (fin < 0) return null;
		var corps = motif.substring(depuis, fin);
		var m = /^(\d*)(,?)(\d*)$/.exec(corps);
		if (!m || (m[1] === "" && m[2] === "" )) return null;
		var mini = m[1] === "" ? 0 : parseInt(m[1], 10);
		var maxi = m[2] === "" ? mini : (m[3] === "" ? null : parseInt(m[3], 10));
		if (maxi !== null && maxi < mini) throw erreurRegex(cmd, motif, "dans {" + corps + "}, le maximum est plus petit que le minimum");
		if (mini > 32767 || (maxi !== null && maxi > 32767)) throw erreurRegex(cmd, motif, "répétition trop grande");
		return { js: "{" + mini + (m[2] ? "," + (maxi === null ? "" : maxi) : "") + "}", suite: fin + fermeture.length, brut: motif.substring(depuis - fermeture.length + (fermeture === "\\}" ? 0 : 0), fin + fermeture.length) };
	}
	function lireCrochets(){
		// i est sur le [
		var j = i + 1, nie = false, morceaux = "", premier = true;
		if (motif.charAt(j) === "^"){ nie = true; j++; }
		for (;;){
			if (j >= n) throw erreurRegex(cmd, motif, "crochet [ jamais refermé");
			var c = motif.charAt(j);
			if (c === "]" && !premier){ j++; break; }
			premier = false;
			if (c === "[" && /[:=.]/.test(motif.charAt(j + 1))){
				var type = motif.charAt(j + 1);
				var fin = motif.indexOf(type + "]", j + 2);
				if (fin < 0) throw erreurRegex(cmd, motif, "crochet [ jamais refermé");
				var nom = motif.substring(j + 2, fin);
				j = fin + 2;
				if (type === ":"){
					if (!CLASSES_POSIX.hasOwnProperty(nom)){
						throw erreurRegex(cmd, motif, "classe [:" + nom + ":] inconnue (les classes : alpha digit alnum upper lower space blank punct xdigit)");
					}
					morceaux += CLASSES_POSIX[nom];
				} else {
					morceaux += regexLitterale(nom);
				}
				continue;
			}
			var bas = c;
			j++;
			if (c === "\\" && j < n && (awk || (options.sed && /[nt\\\]]/.test(motif.charAt(j))))){
				var e = motif.charAt(j);
				bas = e === "n" ? "\n" : e === "t" ? "\t" : e === "r" ? "\r" : e === "f" ? "\f" : e === "v" ? "\v" : e === "a" ? "\x07" : e === "b" ? "\b" : e;
				j++;
			}
			if (motif.charAt(j) === "-" && j + 1 < n && motif.charAt(j + 1) !== "]"){
				var haut = motif.charAt(j + 1);
				j += 2;
				if (haut === "\\" && awk && j < n){ haut = motif.charAt(j); j++; }
				if (haut < bas) throw erreurRegex(cmd, motif, "intervalle « " + bas + "-" + haut + " » à l'envers");
				morceaux += echapperRegexJS(bas) + "-" + echapperRegexJS(haut);
			} else {
				morceaux += echapperRegexJS(bas);
			}
		}
		i = j;
		atome((nie ? "[^" : "[") + morceaux + "]");
	}
	while (i < n){
		var c = motif.charAt(i);
		if (c === "\\"){
			if (i + 1 >= n) throw erreurRegex(cmd, motif, "barre oblique inverse \\ toute seule à la fin");
			var d = motif.charAt(i + 1);
			i += 2;
			if (options.delim && d === options.delim && d !== "n" && d !== "\\"){ atome(echapperRegexJS(d)); continue; }
			if (bre){
				if (d === "("){ ouverts.push({ pos: sortie.length }); groupes++; sortie += "("; debut = true; quantifie = false; debutAtome = -1; continue; }
				if (d === ")"){
					if (!ouverts.length) throw erreurRegex(cmd, motif, "\\) sans \\( ouvrant");
					var o = ouverts.pop(); fermes++;
					sortie += ")"; debutAtome = o.pos; debut = false; quantifie = false;
					continue;
				}
				if (d === "|"){ sortie += "|"; debut = true; debutAtome = -1; quantifie = false; continue; }
				if (d === "{"){
					var q = lireIntervalle(i, "\\}");
					if (!q) throw erreurRegex(cmd, motif, "\\{ mal formé (exemples : a\\{3\\}, a\\{2,5\\})");
					if (debut){ atome("\\{"); continue; }
					i = q.suite; quantifier(q); continue;
				}
				if (d === "+" || d === "?"){
					if (debut){ atome("\\" + d); continue; }
					quantifier({ js: d, brut: d }); continue;
				}
			}
			switch (d){
				case "w": atome(MOT); continue;
				case "W": atome("[^" + LETTRE_DE_MOT + "]"); continue;
				case "s": atome("[" + CLASSES_POSIX.space + "]"); continue;
				case "S": atome("[^" + CLASSES_POSIX.space + "]"); continue;
				case "b": sortie += BORNES.b; debutAtome = -1; continue;
				case "B": sortie += BORNES.B; debutAtome = -1; continue;
				case "y": if (awk){ sortie += BORNES.b; debutAtome = -1; continue; } break;
				case "<": sortie += BORNES.debutMot; debutAtome = -1; continue;
				case ">": sortie += BORNES.finMot; debutAtome = -1; continue;
				case "`": sortie += "(?<![\\s\\S])"; debutAtome = -1; continue;
				case "'": sortie += "(?![\\s\\S])"; debutAtome = -1; continue;
				case "n": atome("\\n"); continue;
				case "t": atome("\\t"); continue;
			}
			if (awk){
				var echap = { r: "\\r", f: "\\f", v: "\\v", a: "\\x07", "/": "\\/", "\"": "\"" };
				if (echap.hasOwnProperty(d)){ atome(echap[d]); continue; }
			}
			if (/[1-9]/.test(d)){
				if (parseInt(d, 10) > fermes) throw erreurRegex(cmd, motif, "\\" + d + " renvoie à un groupe qui n'existe pas (encore)");
				atome("\\" + d);
				continue;
			}
			atome(echapperRegexJS(d));
			continue;
		}
		if (c === "["){ lireCrochets(); continue; }
		if (c === "*"){
			i++;
			if (debut) atome("\\*");
			else quantifier({ js: "*", brut: "*" });
			continue;
		}
		if (c === "^"){
			i++;
			if (bre && !debut){ atome("\\^"); continue; }
			sortie += "^"; debutAtome = -1; quantifie = false;
			continue;
		}
		if (c === "$"){
			i++;
			// En BRE, $ n'est une ancre qu'en fin d'expression (ou devant \) et \|).
			if (bre && !(i === n || motif.substr(i, 2) === "\\)" || motif.substr(i, 2) === "\\|")){ atome("\\$"); continue; }
			sortie += "$"; debutAtome = -1; quantifie = false;
			continue;
		}
		if (c === "."){ i++; atome("[\\s\\S]"); continue; }
		if (!bre){
			if (c === "("){ i++; ouverts.push({ pos: sortie.length }); groupes++; sortie += "("; debut = true; debutAtome = -1; quantifie = false; continue; }
			if (c === ")"){
				i++;
				if (!ouverts.length) throw erreurRegex(cmd, motif, ") sans ( ouvrante");
				var ou = ouverts.pop(); fermes++;
				sortie += ")"; debutAtome = ou.pos; debut = false; quantifie = false;
				continue;
			}
			if (c === "|"){ i++; sortie += "|"; debut = true; debutAtome = -1; quantifie = false; continue; }
			if (c === "+" || c === "?"){
				i++;
				if (debut) atome("\\" + c);
				else quantifier({ js: c, brut: c });
				continue;
			}
			if (c === "{"){
				var qq = debut ? null : lireIntervalle(i + 1, "}");
				if (!qq){ i++; atome("\\{"); continue; }
				i = qq.suite; quantifier(qq); continue;
			}
		}
		i++;
		atome(echapperRegexJS(c));
	}
	if (ouverts.length) throw erreurRegex(cmd, motif, bre ? "\\( jamais refermée par \\)" : "( jamais refermée par )");
	return { source: sortie, groupes: groupes };
}

/* Où se termine une expression entre crochets qui commence en pos (juste après le ]), ou -1. */
function finDesCrochets(texte, pos){
	var j = pos + 1;
	if (texte.charAt(j) === "^") j++;
	if (texte.charAt(j) === "]") j++;
	while (j < texte.length){
		var c = texte.charAt(j);
		if (c === "\n") return -1;
		if (c === "[" && /[:=.]/.test(texte.charAt(j + 1))){
			var fin = texte.indexOf(texte.charAt(j + 1) + "]", j + 2);
			if (fin < 0) return -1;
			j = fin + 2;
			continue;
		}
		if (c === "]") return j + 1;
		j++;
	}
	return -1;
}

/* Compile pour de bon, avec un message clair si JavaScript n'en veut pas. */
function compilerRegex(motif, mode, drapeaux, cmd, options){
	var t = traduireRegex(motif, mode, cmd, options);
	try {
		return new RegExp(t.source, drapeaux);
	} catch (e){
		throw erreurRegex(cmd, motif, "cette forme n'est pas comprise ici");
	}
}

/*
 * Toutes les correspondances d'une expression (drapeau g) dans un texte, à la manière de GNU :
 * une correspondance vide collée juste après la précédente ne compte pas (s/a*\/x/g sur baaac donne xbxcx).
 */
function correspondances(re, texte, limite){
	var liste = [], finPrecedente = -1, garde = 0;
	re.lastIndex = 0;
	while (garde++ < 100000){
		var m = re.exec(texte);
		if (!m) break;
		var debutM = m.index, finM = debutM + m[0].length;
		if (m[0] === "" && debutM === finPrecedente){
			if (debutM >= texte.length) break;
			re.lastIndex = debutM + 1;
			continue;
		}
		liste.push(m);
		if (limite && liste.length >= limite) break;
		finPrecedente = finM;
		if (m[0] === ""){
			if (finM >= texte.length) break;
			re.lastIndex = finM + 1;
		} else {
			re.lastIndex = finM;
		}
	}
	return liste;
}

/* Le texte d'un objet tel qu'il serait sur le disque : avec son retour à la ligne final. */
function texteDisque(texte, sansFin){
	return typeof contenuExact === "function" ? contenuExact(texte, sansFin) : (texte === "" || /\n$/.test(texte) || sansFin ? texte : texte + "\n");
}

/* L'inverse : le jeu range ses textes sans le dernier retour à la ligne. */
function sansDernierRetour(texte){
	return texte.charAt(texte.length - 1) === "\n" ? texte.substring(0, texte.length - 1) : texte;
}

/* Nombre d'octets en UTF-8 (wc -c compte des octets, pas des lettres). */
function octetsUtf8(texte){
	var n = 0;
	for (var i = 0; i < texte.length; i++){
		var c = texte.charCodeAt(i);
		if (c < 0x80) n += 1;
		else if (c < 0x800) n += 2;
		else if (c >= 0xd800 && c <= 0xdbff){ n += 4; i++; }
		else n += 3;
	}
	return n;
}

/* Un nombre positif ou nul donné à une option, ou une erreur claire. */
function entierOption(valeur, cmd, option){
	if (!/^\d+$/.test(String(valeur))) throw new ShellError(cmd + " : " + option + " attend un nombre entier, pas « " + valeur + " »");
	return parseInt(valeur, 10);
}

/*
 * Les sources d'un sort de texte : les objets nommés (« - » désigne l'entrée standard),
 * ou l'entrée standard s'il n'y en a aucun. Chaque source : { nom, texte, sansFin, trouve }.
 */
function sourcesTexte(noms, io, cmd, utilisation){
	if (noms.length === 0){
		if (io.stdin === null) throw new ShellError(cmd + " : il faut un objet, ou un texte arrivant par un tuyau. Utilisation : " + utilisation);
		return [{ nom: "-", texte: io.stdin, sansFin: !!io.stdinSansFin, trouve: null }];
	}
	return noms.map(function(nom){
		if (nom === "-"){
			return { nom: "-", texte: io.stdin === null ? "" : io.stdin, sansFin: !!io.stdinSansFin, trouve: null };
		}
		var trouve = Shell.objetLisible(nom, io, cmd);
		return { nom: nom, texte: trouve.item.getText(), sansFin: !!trouve.item.sansFinDeLigne, trouve: trouve };
	});
}

/* ------------------------------------------------------------------ */
/* grep                                                                */
/* ------------------------------------------------------------------ */

var GREP_LONGUES = {
	"ignore-case": "i", "invert-match": "v", "count": "c", "line-number": "n", "files-with-matches": "l",
	"files-without-match": "L", "recursive": "r", "dereference-recursive": "r", "extended-regexp": "E",
	"fixed-strings": "F", "basic-regexp": "G", "perl-regexp": "P", "only-matching": "o", "word-regexp": "w",
	"line-regexp": "x", "quiet": "q", "silent": "q", "no-messages": "s", "no-filename": "h", "with-filename": "H",
	"after-context": "A", "before-context": "B", "context": "C", "max-count": "m", "regexp": "e", "file": "f"
};

function optionsGrep(args, io){
	var o = { motifs: [], mode: "G", A: 0, B: 0, m: -1 };
	var positionnels = [], motifsDonnes = false, finOptions = false;
	function poser(lettre, valeur){
		switch (lettre){
			case "E": case "F": case "G": case "P": o.mode = lettre; break;
			case "R": case "r": o.r = true; break;
			case "y": o.i = true; break;
			case "e": o.motifs.push(valeur); motifsDonnes = true; break;
			case "f":
				var t = Shell.objetLisible(valeur, io, "grep").item.getText();
				lignesDe(t).forEach(function(l){ o.motifs.push(l); });
				motifsDonnes = true;
				break;
			case "A": o.A = entierOption(valeur, "grep", "-A"); break;
			case "B": o.B = entierOption(valeur, "grep", "-B"); break;
			case "C": o.A = o.B = entierOption(valeur, "grep", "-C"); break;
			case "m": o.m = entierOption(valeur, "grep", "-m"); break;
			default: o[lettre] = true;
		}
	}
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (finOptions || a === "-" || a.charAt(0) !== "-"){ positionnels.push(a); continue; }
		if (a === "--"){ finOptions = true; continue; }
		if (a.substring(0, 2) === "--"){
			var egal = a.indexOf("="), nom = egal > -1 ? a.substring(2, egal) : a.substring(2);
			if (nom === "color" || nom === "colour") continue;
			if (!GREP_LONGUES.hasOwnProperty(nom)) throw new ShellError("grep : option inconnue « " + a + " ». Tape man grep pour voir celles qui existent.", 2);
			var lettre = GREP_LONGUES[nom];
			if ("eABCmf".indexOf(lettre) > -1){
				var v = egal > -1 ? a.substring(egal + 1) : args[++i];
				if (v === undefined) throw new ShellError("grep : l'option " + a + " attend une valeur", 2);
				poser(lettre, v);
			} else {
				poser(lettre);
			}
			continue;
		}
		for (var k = 1; k < a.length; k++){
			var l = a.charAt(k);
			if (/\d/.test(l)){
				// -2 : deux lignes de contexte de chaque côté, comme -C 2
				var nombre = /^\d+/.exec(a.substring(k))[0];
				poser("C", nombre);
				k += nombre.length - 1;
				continue;
			}
			if ("eABCmf".indexOf(l) > -1){
				var valeur = a.substring(k + 1);
				if (valeur === ""){ i++; valeur = args[i]; }
				if (valeur === undefined) throw new ShellError("grep : l'option -" + l + " attend une valeur", 2);
				poser(l, valeur);
				break;
			}
			if ("ivclLrRnoEFGPwxqshHy".indexOf(l) === -1){
				throw new ShellError("grep : option inconnue « -" + l + " ». Tape man grep pour voir celles qui existent.", 2);
			}
			poser(l);
		}
	}
	if (!motifsDonnes){
		if (positionnels.length === 0) throw new ShellError("grep : que cherches-tu ? Utilisation : grep MOT OBJET", 2);
		o.motifs.push(positionnels.shift());
	}
	o.fichiers = positionnels;
	// Un motif qui contient des retours à la ligne, ce sont plusieurs motifs.
	var tous = [];
	o.motifs.forEach(function(m){ tous = tous.concat(String(m).split("\n")); });
	o.motifs = tous;
	return o;
}

function compilerGrep(o){
	return o.motifs.map(function(m){
		var source;
		if (o.mode === "F") source = regexLitterale(m);
		else if (o.mode === "P"){
			source = m;
			try { new RegExp(source); } catch (e){ throw erreurRegex("grep", m, "expression Perl non comprise ici"); }
		}
		else source = traduireRegex(m, o.mode === "E" ? "ere" : "bre", "grep").source;
		if (o.x) source = "^(?:" + source + ")$";
		else if (o.w) source = "(?<!" + MOT + ")(?:" + source + ")(?!" + MOT + ")";
		try {
			return new RegExp(source, "g" + (o.i ? "i" : ""));
		} catch (e){
			throw erreurRegex("grep", m, "cette forme n'est pas comprise ici");
		}
	});
}

/* Les morceaux trouvés dans une ligne (pour -o et la couleur), de gauche à droite, sans chevauchement. */
function morceauxTrouves(ligne, regs){
	var res = [], pos = 0, garde = 0;
	while (pos <= ligne.length && garde++ < 10000){
		var meilleur = null;
		for (var k = 0; k < regs.length; k++){
			var r = regs[k];
			r.lastIndex = pos;
			var m = r.exec(ligne);
			while (m && m[0] === ""){
				if (m.index >= ligne.length){ m = null; break; }
				r.lastIndex = m.index + 1;
				m = r.exec(ligne);
			}
			if (m && (!meilleur || m.index < meilleur.debut || (m.index === meilleur.debut && m[0].length > meilleur.fin - meilleur.debut))){
				meilleur = { debut: m.index, fin: m.index + m[0].length };
			}
		}
		if (!meilleur) break;
		res.push(meilleur);
		pos = meilleur.fin;
	}
	return res;
}

Shell.sorts.grep = function(args, io){
	var o = optionsGrep(args, io);
	var regs = compilerGrep(o);
	var motif = o.motifs[0];
	function correspond(ligne){
		for (var k = 0; k < regs.length; k++){
			regs[k].lastIndex = 0;
			if (regs[k].test(ligne)) return true;
		}
		return false;
	}
	function surligner(ligne){
		if (!io.tty || o.v) return ligne;
		var morceaux = morceauxTrouves(ligne, regs), sortie = "", pos = 0;
		morceaux.forEach(function(m){ sortie += ligne.substring(pos, m.debut) + C.rouge(C.gras(ligne.substring(m.debut, m.fin))); pos = m.fin; });
		return sortie + ligne.substring(pos);
	}
	var dejaSortie = false;   // pour le séparateur -- entre deux groupes de contexte
	var trouveQuelqueChose = false;
	// Les lignes retenues d'un texte, déjà mises en forme. nom : null si on n'affiche pas le nom.
	function filtrer(texte, nom){
		var lignes = lignesDe(texte), choisies = [];
		for (var i = 0; i < lignes.length; i++){
			if (o.m >= 0 && choisies.length >= o.m) break;
			var ok = correspond(lignes[i]);
			if (o.v) ok = !ok;
			if (ok) choisies.push(i);
		}
		if (choisies.length) trouveQuelqueChose = true;
		var res = { nombre: choisies.length, bruts: choisies.map(function(i){ return lignes[i]; }), sortie: [] };
		if (o.q || o.c || o.l || o.L) return res;
		function prefixe(i, sep){
			var p = "";
			var s = io.tty ? C.cyan(sep) : sep;
			if (nom !== null) p += (io.tty ? C.magenta(nom) : nom) + s;
			if (o.n) p += (io.tty ? C.vert(String(i + 1)) : String(i + 1)) + s;
			return p;
		}
		if (o.o){
			if (o.v) return res;
			choisies.forEach(function(i){
				morceauxTrouves(lignes[i], regs).forEach(function(m){
					if (m.fin === m.debut) return;
					var bout = lignes[i].substring(m.debut, m.fin);
					res.sortie.push(prefixe(i, ":") + (io.tty ? C.rouge(C.gras(bout)) : bout));
				});
			});
			return res;
		}
		if (!o.A && !o.B){
			choisies.forEach(function(i){ res.sortie.push(prefixe(i, ":") + surligner(lignes[i])); });
			return res;
		}
		// Avec du contexte : 2 pour une ligne retenue, 1 pour une ligne de contexte.
		var marque = [];
		choisies.forEach(function(i){
			marque[i] = 2;
			for (var k = Math.max(0, i - o.B); k < i; k++) if (!marque[k]) marque[k] = 1;
			for (var j = i + 1; j <= Math.min(lignes.length - 1, i + o.A); j++) if (!marque[j]) marque[j] = 1;
		});
		var precedente = -2;
		for (var x = 0; x < lignes.length; x++){
			if (!marque[x]) continue;
			if (dejaSortie && x !== precedente + 1) res.sortie.push(io.tty ? C.cyan("--") : "--");
			res.sortie.push(marque[x] === 2 ? prefixe(x, ":") + surligner(lignes[x]) : prefixe(x, "-") + lignes[x]);
			dejaSortie = true;
			precedente = x;
		}
		return res;
	}

	var sortie = [], erreurs = [];
	if (o.fichiers.length === 0 && !o.r){
		if (io.stdin === null) throw new ShellError("grep : dans quoi dois-je chercher « " + motif + " » ? Utilisation : grep MOT OBJET", 2);
		o.fichiers = ["-"];
	}
	if (o.fichiers.length === 0) o.fichiers = ["."];

	// Rassemble les objets à fouiller, en descendant dans les lieux si -r.
	var cibles = [];
	function ajouterLieu(lieu, chemin, profondeur){
		if (profondeur > 30) return;
		for (var i = 0; i < lieu.items.length; i++){
			var it = lieu.items[i];
			if (!Shell.bit(it, "r", io)){ erreurs.push("grep : " + chemin + it.itemname + " : Permission non accordée"); continue; }
			cibles.push({ item: it, room: lieu, nom: chemin + it.itemname });
		}
		for (var j = 0; j < lieu.children.length; j++){
			var enfant = lieu.children[j];
			if (!Shell.peutFouiller(enfant)) continue;
			if (!Shell.bit(enfant, "x", io) || !Shell.bit(enfant, "r", io)){
				erreurs.push("grep : " + chemin + enfant.room_name + " : Permission non accordée");
				continue;
			}
			ajouterLieu(enfant, chemin + enfant.room_name + "/", profondeur + 1);
		}
	}
	for (var f = 0; f < o.fichiers.length; f++){
		var nomF = o.fichiers[f];
		if (nomF === "-"){ cibles.push({ stdin: true, nom: "(entrée standard)" }); continue; }
		var r = Shell.chercher(nomF, io, "grep");
		if (r.node === null){ erreurs.push(Shell.introuvable("grep", r.name, r.dir)); continue; }
		if (r.node instanceof Item && r.node.lien){
			try { r.node = Shell.suivre(r.node, "grep"); } catch (e){ if (e instanceof ShellError){ erreurs.push(e.message); continue; } throw e; }
		}
		if (r.node instanceof Room){
			if (!o.r){
				erreurs.push("grep : " + nomF + " : c'est un lieu. Pour fouiller tout ce qu'il contient : grep -r " + motif + " " + nomF);
				continue;
			}
			if (!Shell.bit(r.node, "r", io)){ erreurs.push("grep : " + nomF + " : Permission non accordée"); continue; }
			var prefixe = nomF === "." ? "" : nomF.replace(/\/+$/, "") + "/";
			ajouterLieu(r.node, prefixe, 0);
		} else {
			if (!Shell.bit(r.node, "r", io)){ erreurs.push("grep : " + nomF + " : Permission non accordée"); continue; }
			cibles.push({ item: r.node, room: r.dir, nom: nomF });
		}
	}
	var avecNom = o.H || (!o.h && (cibles.length > 1 || o.r || o.fichiers.length > 1));
	for (var c = 0; c < cibles.length; c++){
		var cible = cibles[c];
		var texte = cible.stdin ? (io.stdin === null ? "" : io.stdin) : cible.item.getText();
		var res = filtrer(texte, avecNom ? cible.nom : null);
		var nomAffiche = io.tty ? C.magenta(cible.nom) : cible.nom;
		if (o.q){
			// rien à afficher : seul compte le code de retour
		} else if (o.l){
			if (res.nombre) sortie.push(nomAffiche);
		} else if (o.L){
			if (!res.nombre) sortie.push(nomAffiche);
		} else if (o.c){
			sortie.push((avecNom ? nomAffiche + ":" : "") + res.nombre);
		} else {
			for (var t = 0; t < res.sortie.length; t++) sortie.push(res.sortie[t]);
		}
		if (res.nombre && !cible.stdin){
			Shell.apresLecture({ item: cible.item, room: cible.room }, res.bruts.join("\n"), "grep", io);
		}
		if (o.q && trouveQuelqueChose) break;
	}
	GameEvents.fire({ type: "grep", pattern: motif, count: sortie.length });
	if (!o.s) for (var e = 0; e < erreurs.length; e++) io.err(erreurs[e]);
	// Le code de retour, comme le vrai grep : 0 trouvé, 1 rien trouvé, 2 erreur.
	io.code = (erreurs.length && !(o.q && trouveQuelqueChose)) ? 2 : (trouveQuelqueChose ? 0 : 1);
	if (o.L) io.code = sortie.length ? 0 : 1;
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* sed                                                                 */
/* ------------------------------------------------------------------ */

var SED_PAS_MAX = 200000;

/* Découpe et comprend un script sed. Renvoie la liste des commandes, à plat (les blocs { } sont des sauts). */
function compilerSed(script, etendu, cmd){
	cmd = cmd || "sed";
	var pos = 0, n = script.length, liste = [], pile = [], etiquettes = {};
	function erreur(message){
		return new ShellError(cmd + " : script, caractère " + Math.min(pos + 1, n) + " : " + message + "\n" +
			C.gris("(Exemples : sed 's/ancien/nouveau/g' F ; sed -n '2,5p' F ; sed '/motif/d' F ; sed -E 's/(a|b)+/X/' F)"));
	}
	function car(){ return script.charAt(pos); }
	function blancs(){ while (pos < n && (car() === " " || car() === "\t")) pos++; }
	function regexDelimitee(delim){
		// Lit jusqu'au délimiteur non échappé ; \n désigne un retour à la ligne.
		var morceau = "";
		for (;;){
			if (pos >= n) throw erreur("expression jamais refermée par « " + delim + " »");
			var c = car();
			if (c === "\\"){
				var d = script.charAt(pos + 1);
				if (d === "\n"){ morceau += "\\n"; pos += 2; continue; }
				morceau += c + d; pos += 2; continue;
			}
			if (c === delim){ pos++; return morceau; }
			if (c === "\n" && delim !== "\n") throw erreur("expression jamais refermée par « " + delim + " »");
			if (c === "["){
				// Entre crochets, le délimiteur est une lettre comme une autre : s/[/]/x/
				var fin = finDesCrochets(script, pos);
				if (fin > 0){ morceau += script.substring(pos, fin); pos = fin; continue; }
			}
			morceau += c; pos++;
		}
	}
	function compiler(source, drapeaux, delim){
		if (source === "") return null;        // // : la dernière expression employée
		return compilerRegex(source, etendu ? "ere" : "bre", "g" + drapeaux, cmd, { delim: delim, sed: true });
	}
	function lireAdresse(){
		var m, c = car();
		if (/\d/.test(c)){
			m = /^\d+/.exec(script.substring(pos));
			pos += m[0].length;
			if (car() === "~"){
				pos++;
				var p = /^\d+/.exec(script.substring(pos));
				if (!p) throw erreur("après ~ il faut un nombre (exemple : 1~2, une ligne sur deux)");
				pos += p[0].length;
				return { premiere: parseInt(m[0], 10), pas: parseInt(p[0], 10) };
			}
			return { ligne: parseInt(m[0], 10) };
		}
		if (c === "$"){ pos++; return { derniere: true }; }
		if (c === "/" || c === "\\"){
			var delim = "/";
			if (c === "\\"){ pos++; delim = car(); if (!delim || delim === "\n" || delim === "\\") throw erreur("délimiteur d'adresse invalide"); }
			pos++;
			var source = regexDelimitee(delim), drapeaux = "";
			while (car() === "I" || car() === "M"){ drapeaux += car() === "I" ? "i" : "m"; pos++; }
			return { regex: compiler(source, drapeaux, delim), source: source };
		}
		return null;
	}
	function lireTexte(){
		// Le texte de a, i, c : « a\ » puis le texte sur les lignes suivantes, ou « a texte » (GNU).
		blancs();
		var lignes = [], courante = "";
		if (car() === "\\"){
			pos++;
			if (car() === "\n") pos++;
		}
		while (pos < n){
			var c = car();
			if (c === "\\"){
				var d = script.charAt(pos + 1);
				if (d === "\n"){ lignes.push(courante); courante = ""; pos += 2; continue; }
				if (d === ""){ pos++; continue; }
				courante += d === "t" ? "\t" : d; pos += 2; continue;
			}
			if (c === "\n"){ pos++; break; }
			courante += c; pos++;
		}
		lignes.push(courante);
		return lignes.join("\n");
	}
	function lireNom(){
		// Un nom de fichier ou une étiquette : jusqu'à la fin de la ligne (ou au ; pour une étiquette).
		blancs();
		var debut = pos;
		while (pos < n && car() !== "\n") pos++;
		return script.substring(debut, pos).replace(/\s+$/, "");
	}
	function lireEtiquette(){
		blancs();
		var debut = pos;
		while (pos < n && car() !== "\n" && car() !== ";" && car() !== "}") pos++;
		return script.substring(debut, pos).replace(/\s+$/, "");
	}
	function lireRemplacement(delim){
		var parts = [], lit = "";
		function pousser(p){ if (lit){ parts.push({ t: lit }); lit = ""; } parts.push(p); }
		for (;;){
			if (pos >= n) throw erreur("commande « s » inachevée : il manque le dernier « " + delim + " »");
			var c = car();
			if (c === "\\"){
				var d = script.charAt(pos + 1);
				pos += 2;
				if (/[0-9]/.test(d)) pousser({ g: parseInt(d, 10) });
				else if (d === "&") lit += "&";
				else if (d === "n" || d === "\n") lit += "\n";
				else if (d === "t") lit += "\t";
				else if ("LUluE".indexOf(d) > -1) pousser({ casse: d });
				else lit += d;
				continue;
			}
			if (c === delim){ pos++; break; }
			if (c === "\n") throw erreur("commande « s » inachevée : il manque le dernier « " + delim + " »");
			if (c === "&"){ pousser({ g: 0 }); pos++; continue; }
			lit += c; pos++;
		}
		if (lit) parts.push({ t: lit });
		return parts;
	}
	// #n tout seul en première ligne : comme sed -n.
	var muet = /^#n(\n|$)/.test(script);
	while (pos < n){
		while (pos < n && /[\s;]/.test(car())) pos++;
		if (pos >= n) break;
		if (car() === "#"){ while (pos < n && car() !== "\n") pos++; continue; }
		var commande = { a1: null, a2: null, nie: false, debutPos: pos };
		commande.a1 = lireAdresse();
		if (commande.a1 && car() === ","){
			pos++;
			blancs();
			var c2 = car(), m2;
			if (c2 === "+" || c2 === "~"){
				pos++;
				m2 = /^\d+/.exec(script.substring(pos));
				if (!m2) throw erreur("après " + c2 + " il faut un nombre");
				pos += m2[0].length;
				commande.a2 = c2 === "+" ? { plus: parseInt(m2[0], 10) } : { multiple: parseInt(m2[0], 10) };
			} else {
				commande.a2 = lireAdresse();
				if (!commande.a2) throw erreur("adresse incomplète après la virgule");
			}
		}
		if (commande.a1 && commande.a1.ligne === 0 && !(commande.a2 && commande.a2.regex !== undefined)){
			throw erreur("la ligne 0 n'existe pas (seule la forme 0,/motif/ l'accepte)");
		}
		blancs();
		while (car() === "!"){ commande.nie = !commande.nie; pos++; blancs(); }
		if (pos >= n) throw erreur("il manque la commande après l'adresse");
		var lettre = car();
		pos++;
		commande.cmd = lettre;
		switch (lettre){
			case "{":
				pile.push(liste.length);
				liste.push(commande);
				continue;
			case "}":
				if (commande.a1) throw erreur("} ne prend pas d'adresse");
				if (!pile.length) throw erreur("} sans { ouvrante");
				liste[pile.pop()].fin = liste.length;
				break;
			case "=": case "d": case "D": case "g": case "G": case "h": case "H": case "l": case "n": case "N":
			case "p": case "P": case "x": case "z": case "F":
				break;
			case "q": case "Q":
				blancs();
				var code = /^\d+/.exec(script.substring(pos));
				if (code){ commande.code = parseInt(code[0], 10); pos += code[0].length; }
				break;
			case "a": case "i": case "c":
				commande.texte = lireTexte();
				liste.push(commande);
				continue;
			case ":":
				if (commande.a1) throw erreur(": (une étiquette) ne prend pas d'adresse");
				var nomEtiquette = lireEtiquette();
				if (!nomEtiquette) throw erreur("« : » attend un nom d'étiquette");
				etiquettes[nomEtiquette] = liste.length;
				commande.etiquette = nomEtiquette;
				break;
			case "b": case "t": case "T":
				commande.etiquette = lireEtiquette();
				break;
			case "r": case "R": case "w": case "W":
				commande.fichier = lireNom();
				if (!commande.fichier) throw erreur("« " + lettre + " » attend un nom de fichier");
				liste.push(commande);
				continue;
			case "s":
				var delim = car();
				if (!delim || delim === "\n" || delim === "\\") throw erreur("commande « s » inachevée");
				pos++;
				var source = regexDelimitee(delim);
				commande.remplacement = lireRemplacement(delim);
				var drapeaux = "", fois = 0, partout = false;
				for (;;){
					var f = car();
					if (f === "g"){ partout = true; pos++; }
					else if (f === "p"){ commande.imprimer = true; pos++; }
					else if (f === "i" || f === "I"){ drapeaux += "i"; pos++; }
					else if (f === "m" || f === "M"){ drapeaux += "m"; pos++; }
					else if (/\d/.test(f)){
						var nb = /^\d+/.exec(script.substring(pos))[0];
						fois = parseInt(nb, 10);
						if (fois === 0) throw erreur("le drapeau numéro de « s » commence à 1");
						pos += nb.length;
					}
					else if (f === "w"){ pos++; commande.fichier = lireNom(); if (!commande.fichier) throw erreur("le drapeau w attend un nom de fichier"); break; }
					else if (f === "e") throw erreur("le drapeau e (exécuter) n'est pas permis ici");
					else break;
				}
				commande.re = compiler(source, drapeaux, delim);
				commande.source = source;
				commande.fois = fois || 1;
				commande.partout = partout;
				if (commande.re === null) commande.drapeauxVide = drapeaux;
				break;
			case "y":
				var dy = car();
				if (!dy || dy === "\n" || dy === "\\") throw erreur("commande « y » inachevée");
				pos++;
				function ensembleY(){
					var t = "";
					for (;;){
						if (pos >= n) throw erreur("commande « y » inachevée");
						var c = car();
						if (c === "\\"){
							var d = script.charAt(pos + 1);
							t += d === "n" ? "\n" : d === "t" ? "\t" : d;
							pos += 2; continue;
						}
						if (c === dy){ pos++; return t; }
						t += c; pos++;
					}
				}
				var de = ensembleY(), vers = ensembleY();
				if (de.length !== vers.length) throw erreur("les deux listes de « y » doivent avoir la même longueur (" + de.length + " et " + vers.length + ")");
				commande.de = de; commande.vers = vers;
				break;
			default:
				pos--;
				throw erreur("commande inconnue : « " + lettre + " »");
		}
		liste.push(commande);
		// Après une commande : fin de ligne, point-virgule, accolade ou commentaire.
		blancs();
		if (pos < n && !/[;\n}#]/.test(car())) throw erreur("caractères en trop après la commande « " + lettre + " » : « " + car() + " »");
	}
	if (pile.length) throw erreur("{ jamais refermée par }");
	liste.forEach(function(c){
		if ((c.cmd === "b" || c.cmd === "t" || c.cmd === "T") && c.etiquette && !etiquettes.hasOwnProperty(c.etiquette)){
			throw new ShellError(cmd + " : étiquette introuvable pour « " + c.cmd + " » : « " + c.etiquette + " »");
		}
	});
	return { commandes: liste, etiquettes: etiquettes, muet: muet };
}

/* Le texte de remplacement de s///, avec &, \1..\9 et les changements de casse \U \L \u \l \E de GNU. */
function remplacementSed(parts, m){
	var sortie = "", mode = null, unSeul = null;
	function ajouter(t){
		for (var i = 0; i < t.length; i++){
			var c = t.charAt(i);
			if (unSeul){ c = unSeul === "u" ? c.toUpperCase() : c.toLowerCase(); unSeul = null; }
			else if (mode === "U") c = c.toUpperCase();
			else if (mode === "L") c = c.toLowerCase();
			sortie += c;
		}
	}
	for (var i = 0; i < parts.length; i++){
		var p = parts[i];
		if (p.t !== undefined) ajouter(p.t);
		else if (p.g !== undefined) ajouter(m[p.g] === undefined ? "" : m[p.g]);
		else if (p.casse === "E"){ mode = null; unSeul = null; }
		else if (p.casse === "U" || p.casse === "L"){ mode = p.casse; unSeul = null; }
		else unSeul = p.casse;
	}
	return sortie;
}

/* La commande l : la ligne avec ses caractères invisibles, coupée à 69 caractères, terminée par $. */
function sedL(texte){
	var echappe = "";
	for (var i = 0; i < texte.length; i++){
		var c = texte.charAt(i), code = texte.charCodeAt(i);
		if (c === "\\") echappe += "\\\\";
		else if (c === "\n") echappe += "\\n";
		else if (c === "\t") echappe += "\\t";
		else if (c === "\r") echappe += "\\r";
		else if (code < 32 || code === 127) echappe += "\\" + ("00" + code.toString(8)).slice(-3);
		else echappe += c;
	}
	var lignes = [];
	while (echappe.length > 69){ lignes.push(echappe.substring(0, 69) + "\\"); echappe = echappe.substring(69); }
	lignes.push(echappe + "$");
	return lignes.join("\n");
}

/*
 * Fait tourner un programme sed sur des lignes. Renvoie { sortie: [lignes], fin: vrai si q/Q }.
 *   etat : ce qui survit d'un fichier à l'autre (espace de réserve, dernière expression, fichiers w)
 */
function executerSed(prog, lignes, muet, etat, nomFichier, io){
	var cmds = prog.commandes, sortie = [], index = 0, num = etat.numero || 0;
	var actifs = cmds.map(function(c){ return !!(c.a1 && c.a1.ligne === 0); });
	var finsIntervalle = [];
	var pas = 0, arret = false;
	function derniere(){ return index >= lignes.length && etat.dernierFlux; }
	function laRegex(re, c){
		if (re === null){
			if (!etat.derniereRegex) throw new ShellError("sed : // : aucune expression précédente à réutiliser");
			return etat.derniereRegex;
		}
		etat.derniereRegex = re;
		return re;
	}
	function adresseVaut(a, ps){
		if (a.ligne !== undefined) return num === a.ligne;
		if (a.derniere) return derniere();
		if (a.pas !== undefined) return a.pas <= 0 ? num === a.premiere : (num >= a.premiere && (num - a.premiere) % a.pas === 0);
		var re = laRegex(a.regex);
		re.lastIndex = 0;
		return re.test(ps);
	}
	function choisie(k, c, ps){
		if (!c.a1) return true;
		if (!c.a2) return adresseVaut(c.a1, ps);
		var a2 = c.a2;
		if (!actifs[k]){
			if (!adresseVaut(c.a1, ps)) return false;
			// L'intervalle commence ici. Se termine-t-il aussitôt ?
			if (a2.ligne !== undefined){ if (a2.ligne > num){ actifs[k] = true; finsIntervalle[k] = a2.ligne; } }
			else if (a2.plus !== undefined){ if (a2.plus > 0){ actifs[k] = true; finsIntervalle[k] = num + a2.plus; } }
			else if (a2.multiple !== undefined){ if (a2.multiple > 0 && num % a2.multiple !== 0) actifs[k] = true; }
			else if (a2.derniere){ if (!derniere()) actifs[k] = true; }
			else actifs[k] = true;   // une expression : cherchée à partir de la ligne suivante
			return true;
		}
		if (a2.ligne !== undefined || a2.plus !== undefined){ if (num >= finsIntervalle[k]) actifs[k] = false; }
		else if (a2.multiple !== undefined){ if (num % a2.multiple === 0) actifs[k] = false; }
		else if (a2.derniere){ if (derniere()) actifs[k] = false; }
		else if (adresseVaut(a2, ps)) actifs[k] = false;
		return true;
	}
	function ecrireFichier(nom, texte){
		if (nom === "/dev/stdout"){ sortie.push(texte); return; }
		if (nom === "/dev/stderr"){ io.err(texte); return; }
		(etat.fichiers[nom] = etat.fichiers[nom] || []).push(texte);
	}
	function lireFichier(nom){
		try { return Shell.objetLisible(nom, io, "sed").item.getText(); } catch (e){ if (e instanceof ShellError) return null; throw e; }
	}
	var ps = "", relire = true;
	while (!arret){
		// D recommence le cycle avec ce qui reste, sans lire de nouvelle ligne.
		if (relire){
			if (index >= lignes.length) break;
			ps = lignes[index++];
			num++;
		}
		relire = true;
		var ajouts = [], substitue = false, pc = 0, imprimerFin = !muet, finCycle = false;
		{
			while (pc < cmds.length && !finCycle){
				if (++pas > SED_PAS_MAX){
					throw new ShellError("sed : arrêté après " + SED_PAS_MAX + " pas : le script tourne en rond (une boucle b ou t sans fin ?)");
				}
				var c = cmds[pc];
				if (c.cmd === "}" || c.cmd === ":"){ pc++; continue; }
				var ok = choisie(pc, c, ps);
				if (c.nie) ok = !ok;
				if (!ok){ pc = c.cmd === "{" ? c.fin + 1 : pc + 1; continue; }
				pc++;
				switch (c.cmd){
					case "{": break;
					case "=": sortie.push(String(num)); break;
					case "a": ajouts.push(c.texte); break;
					case "i": sortie.push(c.texte); break;
					case "c":
						// Dans un intervalle, le texte ne sort qu'une fois, à la fin.
						if (!c.a2 || c.nie || !actifs[pc - 1]) sortie.push(c.texte);
						imprimerFin = false; finCycle = true;
						break;
					case "d": imprimerFin = false; finCycle = true; break;
					case "D":
						var nl = ps.indexOf("\n");
						if (nl === -1){ imprimerFin = false; finCycle = true; break; }
						ps = ps.substring(nl + 1);
						relire = false; finCycle = true; imprimerFin = false;
						break;
					case "g": ps = etat.reserve; break;
					case "G": ps += "\n" + etat.reserve; break;
					case "h": etat.reserve = ps; break;
					case "H": etat.reserve += "\n" + ps; break;
					case "x": var tmp = ps; ps = etat.reserve; etat.reserve = tmp; break;
					case "z": ps = ""; break;
					case "l": sortie.push(sedL(ps)); break;
					case "F": sortie.push(nomFichier || "-"); break;
					case "p": sortie.push(ps); break;
					case "P": sortie.push(ps.split("\n")[0]); break;
					case "n":
						if (index >= lignes.length){ finCycle = true; arret = !etat.encoreDesFlux; break; }
						if (!muet) sortie.push(ps);
						ajouts.forEach(function(t){ sortie.push(t); }); ajouts = [];
						ps = lignes[index++]; num++;
						break;
					case "N":
						if (index >= lignes.length){ finCycle = true; arret = !etat.encoreDesFlux; break; }
						ajouts.forEach(function(t){ sortie.push(t); }); ajouts = [];
						ps += "\n" + lignes[index++]; num++;
						break;
					case "q": finCycle = true; arret = true; etat.code = c.code || 0; break;
					case "Q": finCycle = true; arret = true; imprimerFin = false; ajouts = []; etat.code = c.code || 0; break;
					case "r": var lu = lireFichier(c.fichier); if (lu !== null && lu !== "") ajouts.push(sansDernierRetour(lu)); break;
					case "R": break;
					case "w": ecrireFichier(c.fichier, ps); break;
					case "W": ecrireFichier(c.fichier, ps.split("\n")[0]); break;
					case "b": pc = c.etiquette ? prog.etiquettes[c.etiquette] : cmds.length; break;
					case "t": if (substitue){ substitue = false; pc = c.etiquette ? prog.etiquettes[c.etiquette] : cmds.length; } break;
					case "T": if (!substitue) pc = c.etiquette ? prog.etiquettes[c.etiquette] : cmds.length; else substitue = false; break;
					case "y":
						var res = "";
						for (var y = 0; y < ps.length; y++){
							var k = c.de.indexOf(ps.charAt(y));
							res += k === -1 ? ps.charAt(y) : c.vers.charAt(k);
						}
						ps = res;
						break;
					case "s":
						var re = c.re === null ? (function(){
							var base = laRegex(null);
							return new RegExp(base.source, "g" + (c.drapeauxVide.indexOf("i") > -1 || base.ignoreCase ? "i" : "") + (c.drapeauxVide.indexOf("m") > -1 ? "m" : ""));
						})() : laRegex(c.re);
						var liste = correspondances(re, ps, c.partout ? 0 : c.fois);
						var nouveau = "", dernier = 0, change = false;
						for (var t = 0; t < liste.length; t++){
							if (t + 1 < c.fois) continue;
							var mm = liste[t];
							nouveau += ps.substring(dernier, mm.index) + remplacementSed(c.remplacement, mm);
							dernier = mm.index + mm[0].length;
							change = true;
							if (!c.partout) break;
						}
						if (change){
							ps = nouveau + ps.substring(dernier);
							substitue = true;
							if (c.imprimer) sortie.push(ps);
							if (c.fichier) ecrireFichier(c.fichier, ps);
						}
						break;
				}
			}
		}
		if (imprimerFin) sortie.push(ps);
		ajouts.forEach(function(t){ sortie.push(t); });
	}
	etat.numero = num;
	return { sortie: sortie, arret: arret };
}

Shell.sorts.sed = function(args, io){
	var muet = false, surPlace = false, suffixe = "", etendu = false, separe = false;
	var morceaux = [], fichiers = [], scriptDonne = false, finOptions = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (finOptions || a === "-" || a.charAt(0) !== "-"){
			if (!scriptDonne){ morceaux.push(a); scriptDonne = true; }
			else fichiers.push(a);
			continue;
		}
		if (a === "--"){ finOptions = true; continue; }
		if (a.substring(0, 2) === "--"){
			var egal = a.indexOf("="), nom = egal > -1 ? a.substring(2, egal) : a.substring(2);
			var valeur = egal > -1 ? a.substring(egal + 1) : null;
			if (nom === "quiet" || nom === "silent") muet = true;
			else if (nom === "regexp-extended") etendu = true;
			else if (nom === "separate") separe = true;
			else if (nom === "in-place"){ surPlace = true; suffixe = valeur || ""; }
			else if (nom === "expression"){ morceaux.push(valeur !== null ? valeur : args[++i]); scriptDonne = true; }
			else if (nom === "posix" || nom === "debug") continue;
			else throw new ShellError("sed : option inconnue « " + a + " ». Tape man sed pour voir celles qui existent.");
			continue;
		}
		for (var k = 1; k < a.length; k++){
			var l = a.charAt(k);
			if (l === "n") muet = true;
			else if (l === "E" || l === "r") etendu = true;
			else if (l === "s") separe = true;
			else if (l === "i"){ surPlace = true; suffixe = a.substring(k + 1); break; }
			else if (l === "e" || l === "f"){
				var v = a.substring(k + 1);
				if (v === ""){ i++; v = args[i]; }
				if (v === undefined) throw new ShellError("sed : l'option -" + l + " attend " + (l === "e" ? "un script" : "un fichier de script"));
				morceaux.push(l === "e" ? v : sansDernierRetour(Shell.objetLisible(v, io, "sed").item.getText()));
				scriptDonne = true;
				break;
			}
			else if (l === "z" || l === "u") continue;
			else throw new ShellError("sed : option inconnue « -" + l + " ». Tape man sed pour voir celles qui existent.");
		}
	}
	if (!scriptDonne) throw new ShellError("sed : quel script ? Utilisation : sed 's/ancien/nouveau/g' OBJET");
	var prog = compilerSed(morceaux.join("\n"), etendu, "sed");
	if (prog.muet) muet = true;
	GameEvents.fire({ type: "sed", scripts: morceaux, room: current_room });
	var etat = { reserve: "", fichiers: {}, code: 0 };
	function ecrireLesFichiersW(){
		Object.keys(etat.fichiers).forEach(function(nom){ Shell.ecrire(nom, etat.fichiers[nom].join("\n"), false); });
	}
	if (surPlace){
		if (fichiers.length === 0) throw new ShellError("sed -i : il faut un objet à modifier sur place");
		fichiers.forEach(function(nom){
			var t = Shell.objetLisible(nom, io, "sed");
			Shell.verifierImmuable(t.item, "sed");
			if (!Shell.bit(t.item, "w", io)) throw new ShellError("sed : impossible de modifier « " + nom + " » : Permission non accordée");
			var ancien = t.item.getText();
			etat.numero = 0; etat.dernierFlux = true; etat.encoreDesFlux = false;
			var r = executerSed(prog, lignesDe(ancien), muet, etat, nom, io);
			// -i.bak : on garde une copie de l'original à côté.
			if (suffixe) Shell.ecrire(nom + suffixe, ancien, false, t.item.sansFinDeLigne);
			t.item.setText(r.sortie.join("\n"));
			GameEvents.fire({ type: "write", item: t.item, room: t.room, append: false, text: t.item.getText(), created: false, previous: ancien });
		});
		ecrireLesFichiersW();
		if (etat.code) io.code = etat.code;
		return "";
	}
	var sources = sourcesTexte(fichiers, io, "sed", "sed 's/ancien/nouveau/g' OBJET");
	var sortie = [];
	if (separe){
		for (var s = 0; s < sources.length; s++){
			etat.numero = 0; etat.dernierFlux = true; etat.encoreDesFlux = s < sources.length - 1;
			var r1 = executerSed(prog, lignesDe(sources[s].texte), muet, etat, sources[s].nom, io);
			sortie = sortie.concat(r1.sortie);
			if (r1.arret) break;
		}
	} else {
		var toutes = [];
		sources.forEach(function(src){ toutes = toutes.concat(lignesDe(src.texte)); });
		etat.numero = 0; etat.dernierFlux = true; etat.encoreDesFlux = false;
		sortie = executerSed(prog, toutes, muet, etat, sources.length === 1 ? sources[0].nom : "-", io).sortie;
	}
	ecrireLesFichiersW();
	if (etat.code) io.code = etat.code;
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* Lire les options courtes et longues d'un sort                       */
/* ------------------------------------------------------------------ */

/*
 * Plus complet que lireOptions : options longues (--nom, --nom=valeur), options à valeur
 * collée ou séparée (-k2, -k 2), et options mêlées aux noms d'objets, comme sous GNU.
 *   lettres     : les options sans valeur
 *   aValeur     : les options qui attendent une valeur
 *   longues     : { "nom-long": "lettre" }
 *   multiples   : lettres qui peuvent revenir (leurs valeurs sont rangées dans un tableau)
 */
function lireOptionsGNU(args, cmd, lettres, aValeur, longues, multiples){
	var opts = {}, reste = [], fin = false;
	longues = longues || {};
	multiples = multiples || "";
	function poser(l, v){
		if (multiples.indexOf(l) > -1){ (opts[l] = opts[l] || []).push(v); return; }
		opts[l] = v === undefined ? true : v;
	}
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (fin || a === "-" || a.charAt(0) !== "-" || a.length === 1){ reste.push(a); continue; }
		if (a === "--"){ fin = true; continue; }
		if (a.substring(0, 2) === "--"){
			var egal = a.indexOf("="), nom = egal > -1 ? a.substring(2, egal) : a.substring(2);
			if (!longues.hasOwnProperty(nom)) throw new ShellError(cmd + " : option inconnue « " + a + " ». Tape man " + cmd + " pour voir celles qui existent.");
			var lettre = longues[nom];
			if (aValeur.indexOf(lettre) > -1){
				var v = egal > -1 ? a.substring(egal + 1) : args[++i];
				if (v === undefined) throw new ShellError(cmd + " : l'option " + a + " attend une valeur");
				poser(lettre, v);
			} else {
				poser(lettre);
			}
			continue;
		}
		for (var k = 1; k < a.length; k++){
			var l = a.charAt(k);
			if (aValeur.indexOf(l) > -1){
				var valeur = a.substring(k + 1);
				if (valeur === ""){ i++; valeur = args[i]; }
				if (valeur === undefined) throw new ShellError(cmd + " : l'option -" + l + " attend une valeur");
				poser(l, valeur);
				break;
			}
			if (lettres.indexOf(l) === -1) throw new ShellError(cmd + " : option inconnue « -" + l + " ». Tape man " + cmd + " pour voir celles qui existent.");
			poser(l);
		}
	}
	return { opts: opts, reste: reste };
}

/* ------------------------------------------------------------------ */
/* sort                                                                */
/* ------------------------------------------------------------------ */

var SUFFIXES_H = "KMGTPEZY";

/* Le début numérique d'un texte, comme sort -n : blancs, signe moins, chiffres, virgule décimale. */
function nombreDeTri(t){
	var m = /^[ \t]*(-?)(\d*)(?:\.(\d*))?/.exec(t);
	if (!m || (m[2] === "" && (m[3] === undefined || m[3] === ""))) return 0;
	return parseFloat((m[1] || "") + (m[2] || "0") + "." + (m[3] || "0"));
}

function comparerVersions(a, b){
	var re = /(\d+|\D+)/g;
	var x = a.match(re) || [], y = b.match(re) || [];
	for (var i = 0; i < Math.min(x.length, y.length); i++){
		var p = x[i], q = y[i];
		var np = /^\d/.test(p), nq = /^\d/.test(q);
		if (np && nq){
			var d = parseInt(p, 10) - parseInt(q, 10);
			if (d) return d < 0 ? -1 : 1;
		} else if (p !== q){
			return p < q ? -1 : 1;
		}
	}
	return x.length - y.length;
}

function comparerTextes(a, b){ return a < b ? -1 : a > b ? 1 : 0; }

/* Compare deux clés selon les options de tri (n, g, h, V, f, d, i). */
function comparerCles(a, b, o){
	if (o.n){ var x = nombreDeTri(a), y = nombreDeTri(b); return x < y ? -1 : x > y ? 1 : 0; }
	if (o.g){
		var gx = parseFloat(a), gy = parseFloat(b);
		if (isNaN(gx)) gx = -Infinity;
		if (isNaN(gy)) gy = -Infinity;
		return gx < gy ? -1 : gx > gy ? 1 : 0;
	}
	if (o.h){
		var ha = /^[ \t]*(-?\d*\.?\d*)([KMGTPEZYk]?)/.exec(a), hb = /^[ \t]*(-?\d*\.?\d*)([KMGTPEZYk]?)/.exec(b);
		var sa = SUFFIXES_H.indexOf(ha[2].toUpperCase()) + 1, sb = SUFFIXES_H.indexOf(hb[2].toUpperCase()) + 1;
		var va = parseFloat(ha[1]) || 0, vb = parseFloat(hb[1]) || 0;
		var signeA = va < 0 ? -1 : (va > 0 ? 1 : 0), signeB = vb < 0 ? -1 : (vb > 0 ? 1 : 0);
		if (signeA !== signeB) return signeA < signeB ? -1 : 1;
		if (sa !== sb) return (sa < sb ? -1 : 1) * (signeA || 1);
		return va < vb ? -1 : va > vb ? 1 : 0;
	}
	if (o.V) return comparerVersions(a, b);
	if (o.d){ a = a.replace(/[^A-Za-z0-9 \t]/g, ""); b = b.replace(/[^A-Za-z0-9 \t]/g, ""); }
	if (o.i){ a = a.replace(/[\x00-\x1f\x7f]/g, ""); b = b.replace(/[\x00-\x1f\x7f]/g, ""); }
	if (o.f){ a = a.toUpperCase(); b = b.toUpperCase(); }
	return comparerTextes(a, b);
}

/* Lit une définition de clé -k : 2  2,2  2n  3,3nr  1.2,1.4 */
function lireCleTri(def, globales){
	var m = /^(\d+)(?:\.(\d+))?([bdfghinMRrV]*)(?:,(\d+)(?:\.(\d+))?([bdfghinMRrV]*))?$/.exec(def);
	if (!m) throw new ShellError("sort : clé de tri invalide « " + def + " ». Exemples : -k2 (de la 2e colonne à la fin), -k2,2 (la 2e seulement), -k3,3nr (la 3e, en nombres, à l'envers)");
	var cle = { champ1: parseInt(m[1], 10), car1: m[2] ? parseInt(m[2], 10) : 1,
		champ2: m[4] ? parseInt(m[4], 10) : null, car2: m[5] ? parseInt(m[5], 10) : 0, opts: {} };
	if (cle.champ1 < 1 || (cle.champ2 !== null && cle.champ2 < 1)) throw new ShellError("sort : les colonnes sont numérotées à partir de 1 (clé « " + def + " »)");
	if (cle.car1 < 1) throw new ShellError("sort : les caractères sont numérotés à partir de 1 (clé « " + def + " »)");
	var lettres = (m[3] || "") + (m[6] || "");
	if (lettres.replace(/b/g, "") === ""){
		// Sans option propre, la clé hérite des options générales.
		["n", "g", "h", "V", "f", "d", "i", "r"].forEach(function(l){ if (globales[l]) cle.opts[l] = true; });
		cle.b1 = !!(m[3] && m[3].indexOf("b") > -1) || !!globales.b;
		cle.b2 = !!(m[6] && m[6].indexOf("b") > -1) || !!globales.b;
	} else {
		lettres.split("").forEach(function(l){ cle.opts[l] = true; });
		cle.b1 = !!(m[3] && m[3].indexOf("b") > -1);
		cle.b2 = !!(m[6] && m[6].indexOf("b") > -1);
	}
	return cle;
}

/* Les colonnes d'une ligne pour sort : avec -t, entre les séparateurs ; sinon, blancs de tête compris. */
function colonnesDeTri(ligne, sep){
	var debuts = [], fins = [];
	if (sep !== null){
		var pos = 0;
		for (;;){
			var k = ligne.indexOf(sep, pos);
			debuts.push(pos);
			if (k === -1){ fins.push(ligne.length); break; }
			fins.push(k);
			pos = k + 1;
		}
		return { debuts: debuts, fins: fins };
	}
	var i = 0;
	while (i < ligne.length){
		debuts.push(i);
		while (i < ligne.length && /[ \t]/.test(ligne.charAt(i))) i++;
		while (i < ligne.length && !/[ \t]/.test(ligne.charAt(i))) i++;
		fins.push(i);
	}
	return { debuts: debuts, fins: fins };
}

function extraireCle(ligne, cle, sep){
	var c = colonnesDeTri(ligne, sep);
	var nb = c.debuts.length;
	var debut, fin;
	if (cle.champ1 > nb) debut = ligne.length;
	else {
		debut = c.debuts[cle.champ1 - 1];
		if (cle.b1) while (debut < c.fins[cle.champ1 - 1] && /[ \t]/.test(ligne.charAt(debut))) debut++;
		debut = Math.min(debut + cle.car1 - 1, c.fins[cle.champ1 - 1]);
	}
	if (cle.champ2 === null) fin = ligne.length;
	else if (cle.champ2 > nb) fin = ligne.length;
	else if (cle.car2 === 0) fin = c.fins[cle.champ2 - 1];
	else {
		fin = c.debuts[cle.champ2 - 1];
		if (cle.b2) while (fin < c.fins[cle.champ2 - 1] && /[ \t]/.test(ligne.charAt(fin))) fin++;
		fin = Math.min(fin + cle.car2, c.fins[cle.champ2 - 1]);
	}
	return debut >= fin ? "" : ligne.substring(debut, fin);
}

Shell.sorts.sort = function(args, io){
	var p = lireOptionsGNU(args, "sort", "bdfghinMRrsuVcCz", "tko", {
		"reverse": "r", "numeric-sort": "n", "unique": "u", "ignore-case": "f", "field-separator": "t", "key": "k",
		"output": "o", "human-numeric-sort": "h", "version-sort": "V", "stable": "s", "check": "c",
		"general-numeric-sort": "g", "ignore-leading-blanks": "b", "dictionary-order": "d", "ignore-nonprinting": "i"
	}, "k");
	var o = p.opts;
	var sep = null;
	if (o.t !== undefined){
		sep = o.t === "\\t" ? "\t" : o.t;
		if (sep.length !== 1) throw new ShellError("sort : le séparateur -t doit être un seul caractère (exemple : sort -t: -k3,3n)");
	}
	var cles = (o.k || []).map(function(def){ return lireCleTri(def, o); });
	var sources = sourcesTexte(p.reste, io, "sort", "sort [-r] [-n] [-t SEP -k COLONNE] OBJET");
	var lignes = [];
	sources.forEach(function(src){
		lignes = lignes.concat(lignesDe(src.texte));
		if (src.trouve) Shell.apresLecture(src.trouve, "", "sort", io);
	});
	function comparerParCles(a, b){
		if (!cles.length){
			var r = comparerCles(o.b ? a.replace(/^[ \t]+/, "") : a, o.b ? b.replace(/^[ \t]+/, "") : b, o);
			return o.r ? -r : r;
		}
		for (var k = 0; k < cles.length; k++){
			var cle = cles[k];
			var d = comparerCles(extraireCle(a, cle, sep), extraireCle(b, cle, sep), cle.opts);
			if (d) return cle.opts.r ? -d : d;
		}
		return 0;
	}
	function comparer(a, b){
		var d = comparerParCles(a, b);
		if (d || o.s || o.u) return d;
		// Le dernier recours : la ligne entière, octet par octet.
		d = comparerTextes(a, b);
		return o.r ? -d : d;
	}
	if (o.c || o.C){
		for (var c = 1; c < lignes.length; c++){
			var ecart = comparer(lignes[c - 1], lignes[c]);
			if (ecart > 0 || (o.u && ecart === 0)){
				if (!o.C) io.err("sort : " + (sources[0].nom === "-" ? "-" : sources[0].nom) + ":" + (c + 1) + " : désordre : " + lignes[c]);
				io.code = 1;
				return "";
			}
		}
		return "";
	}
	// Un tri stable : à égalité, l'ordre d'arrivée.
	var numerotees = lignes.map(function(l, i){ return { l: l, i: i }; });
	numerotees.sort(function(x, y){ return comparer(x.l, y.l) || x.i - y.i; });
	lignes = numerotees.map(function(x){ return x.l; });
	if (o.u){
		lignes = lignes.filter(function(l, i){ return i === 0 || comparerParCles(lignes[i - 1], l) !== 0; });
	}
	var sortie = lignes.join("\n");
	if (o.o !== undefined){
		Shell.ecrire(o.o, sortie, false);
		return "";
	}
	return sortie;
};

/* ------------------------------------------------------------------ */
/* head et tail                                                        */
/* ------------------------------------------------------------------ */

function debutOuFin(cmd){
	var utilisation = cmd + " [-n NOMBRE] OBJET";
	return function(args, io){
		var lignes = 10, octets = null, signe = "", silencieux = false, bavard = false, fichiers = [];
		function lireNombre(v, option){
			var m = /^([+-]?)(\d+)$/.exec(String(v));
			if (!m) throw new ShellError(cmd + " : " + option + " attend un nombre, par exemple : " + cmd + " -n 3 OBJET");
			return { signe: m[1], n: parseInt(m[2], 10) };
		}
		for (var i = 0; i < args.length; i++){
			var a = args[i], v, nb;
			if (a === "-n" || a === "-c" || a === "--lines" || a === "--bytes"){
				v = args[++i];
				if (v === undefined) throw new ShellError(cmd + " : " + a + " attend un nombre, par exemple : " + cmd + " " + a + " 3 OBJET");
				nb = lireNombre(v, a);
				if (a === "-n" || a === "--lines"){ lignes = nb.n; octets = null; } else octets = nb.n;
				signe = nb.signe;
			} else if (/^-[nc].+$/.test(a) || /^--(lines|bytes)=/.test(a)){
				var lettre = a.charAt(1) === "-" ? (a.indexOf("--lines") === 0 ? "n" : "c") : a.charAt(1);
				nb = lireNombre(a.substring(a.indexOf("=") > -1 ? a.indexOf("=") + 1 : 2), "-" + lettre);
				if (lettre === "n"){ lignes = nb.n; octets = null; } else octets = nb.n;
				signe = nb.signe;
			} else if (/^-\d+$/.test(a)){
				lignes = parseInt(a.substring(1), 10); octets = null; signe = "";
			} else if (a === "-q" || a === "--quiet" || a === "--silent"){
				silencieux = true;
			} else if (a === "-v" || a === "--verbose"){
				bavard = true;
			} else if (a.length > 1 && a.charAt(0) === "-"){
				throw new ShellError(cmd + " : option inconnue « " + a + " ». Utilisation : " + utilisation);
			} else {
				fichiers.push(a);
			}
		}
		function couperLignes(texte){
			var l = lignesDe(texte);
			if (cmd === "head") return (signe === "-" ? l.slice(0, Math.max(0, l.length - lignes)) : l.slice(0, lignes)).join("\n");
			if (signe === "+") return l.slice(Math.max(0, lignes - 1)).join("\n");
			return (lignes === 0 ? [] : l.slice(-lignes)).join("\n");
		}
		function couperOctets(texte, sansFin){
			// Le texte tel qu'il est sur le disque, avec son retour à la ligne final.
			var t = texteDisque(texte, sansFin), r;
			if (cmd === "head") r = signe === "-" ? t.substring(0, Math.max(0, t.length - octets)) : t.substring(0, octets);
			else if (signe === "+") r = t.substring(Math.max(0, octets - 1));
			else r = octets === 0 ? "" : t.substring(Math.max(0, t.length - octets));
			return sansDernierRetour(r);
		}
		function couper(texte, sansFin){ return octets === null ? couperLignes(texte) : couperOctets(texte, sansFin); }
		if (fichiers.length === 0){
			if (io.stdin === null) throw new ShellError(cmd + " : de quel objet veux-tu lire " + (cmd === "head" ? "le début" : "la fin") + " ? Utilisation : " + utilisation);
			return couper(io.stdin, io.stdinSansFin);
		}
		var blocs = [];
		var entetes = bavard || (fichiers.length > 1 && !silencieux);
		for (var k = 0; k < fichiers.length; k++){
			var extrait, nom;
			if (fichiers[k] === "-"){
				extrait = couper(io.stdin === null ? "" : io.stdin, io.stdinSansFin);
				nom = "entrée standard";
			} else {
				var trouve = Shell.objetLisible(fichiers[k], io, cmd);
				extrait = couper(trouve.item.getText(), trouve.item.sansFinDeLigne);
				Shell.apresLecture(trouve, extrait, cmd, io);
				nom = fichiers[k];
			}
			blocs.push((entetes ? (k > 0 ? "\n" : "") + "==> " + nom + " <==" + (extrait === "" ? "" : "\n") : "") + extrait);
		}
		return blocs.join("\n");
	};
}
Shell.sorts.head = debutOuFin("head");
Shell.sorts.tail = debutOuFin("tail");

/* ------------------------------------------------------------------ */
/* wc                                                                  */
/* ------------------------------------------------------------------ */

Shell.sorts.wc = function(args, io){
	var p = lireOptionsGNU(args, "wc", "lwcmL", "", { "lines": "l", "words": "w", "bytes": "c", "chars": "m", "max-line-length": "L" });
	var o = p.opts;
	var tout = !o.l && !o.w && !o.c && !o.m && !o.L;
	if (tout){ o.l = o.w = o.c = true; }
	function compter(texte, sansFin){
		var t = texteDisque(texte, sansFin);
		var lignes = (t.match(/\n/g) || []).length;
		var mots = t.trim() === "" ? 0 : t.trim().split(/\s+/).length;
		var plusLongue = 0;
		t.split("\n").forEach(function(l){ if (l.length > plusLongue) plusLongue = l.length; });
		return { l: lignes, w: mots, m: t.length, c: octetsUtf8(t), L: plusLongue };
	}
	var entrees = [];
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("wc : que veux-tu compter ? Utilisation : wc [-l] [-w] [-c] OBJET");
		entrees.push({ nom: "", n: compter(io.stdin, io.stdinSansFin), stdin: true });
	} else {
		for (var i = 0; i < p.reste.length; i++){
			if (p.reste[i] === "-"){ entrees.push({ nom: "-", n: compter(io.stdin === null ? "" : io.stdin, io.stdinSansFin), stdin: true }); continue; }
			var trouve = Shell.objetLisible(p.reste[i], io, "wc");
			entrees.push({ nom: p.reste[i], n: compter(trouve.item.getText(), trouve.item.sansFinDeLigne) });
			Shell.apresLecture(trouve, "", "wc", io);
		}
	}
	var colonnes = ["l", "w", "m", "c", "L"].filter(function(k){ return o[k]; });
	// La largeur des colonnes, comme GNU : le nombre de chiffres de la taille totale (7 au moins pour un tuyau).
	var largeur;
	var avecStdin = entrees.some(function(e){ return e.stdin; });
	if (entrees.length === 1 && avecStdin && colonnes.length === 1) largeur = 1;
	else {
		var totalOctets = 0;
		entrees.forEach(function(e){ if (!e.stdin) totalOctets += e.n.c; });
		largeur = String(totalOctets).length;
		if (avecStdin) largeur = Math.max(largeur, 7);
	}
	function formater(n, nom){
		return colonnes.map(function(k){ return completerGauche(n[k], largeur); }).join(" ") + (nom ? " " + nom : "");
	}
	var lignes = entrees.map(function(e){ return formater(e.n, e.nom); });
	if (entrees.length > 1){
		var total = { l: 0, w: 0, m: 0, c: 0, L: 0 };
		entrees.forEach(function(e){ ["l", "w", "m", "c"].forEach(function(k){ total[k] += e.n[k]; }); total.L = Math.max(total.L, e.n.L); });
		lignes.push(formater(total, "total"));
	}
	if (io.tty && tout) lignes.push(C.gris("(dans l'ordre : lignes, mots, octets)"));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* uniq                                                                */
/* ------------------------------------------------------------------ */

Shell.sorts.uniq = function(args, io){
	var p = lireOptionsGNU(args, "uniq", "cdDuiz", "fsw", {
		"count": "c", "repeated": "d", "all-repeated": "D", "unique": "u", "ignore-case": "i",
		"skip-fields": "f", "skip-chars": "s", "check-chars": "w"
	});
	var o = p.opts;
	var champs = o.f !== undefined ? entierOption(o.f, "uniq", "-f") : 0;
	var car = o.s !== undefined ? entierOption(o.s, "uniq", "-s") : 0;
	var largeur = o.w !== undefined ? entierOption(o.w, "uniq", "-w") : null;
	if (p.reste.length > 2) throw new ShellError("uniq : un seul objet à lire (et, en option, un objet où écrire). Utilisation : sort OBJET | uniq");
	var texte;
	if (p.reste.length === 0 || p.reste[0] === "-"){
		if (io.stdin === null) throw new ShellError("uniq : de quoi dois-je retirer les doublons ? Utilisation : sort OBJET | uniq");
		texte = io.stdin;
	} else {
		texte = Shell.objetLisible(p.reste[0], io, "uniq").item.getText();
	}
	function cle(ligne){
		var t = ligne;
		for (var k = 0; k < champs; k++) t = t.replace(/^[ \t]*[^ \t]*/, "");
		t = t.substring(car);
		if (largeur !== null) t = t.substring(0, largeur);
		return o.i ? t.toLowerCase() : t;
	}
	var lignes = lignesDe(texte), groupes = [];
	for (var i = 0; i < lignes.length; i++){
		var dernier = groupes[groupes.length - 1];
		if (dernier && dernier.cle === cle(lignes[i])){ dernier.n++; dernier.toutes.push(lignes[i]); }
		else groupes.push({ ligne: lignes[i], cle: cle(lignes[i]), n: 1, toutes: [lignes[i]] });
	}
	var sortie = [];
	for (var g = 0; g < groupes.length; g++){
		var gr = groupes[g];
		if ((o.d || o.D) && gr.n < 2) continue;
		if (o.u && gr.n > 1) continue;
		if (o.D){ gr.toutes.forEach(function(l){ sortie.push(o.c ? completerGauche(gr.n, 7) + " " + l : l); }); continue; }
		sortie.push(o.c ? completerGauche(gr.n, 7) + " " + gr.ligne : gr.ligne);
	}
	if (p.reste.length === 2){
		Shell.ecrire(p.reste[1], sortie.join("\n"), false);
		return "";
	}
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* tr                                                                  */
/* ------------------------------------------------------------------ */

var CLASSES_TR = {
	upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lower: "abcdefghijklmnopqrstuvwxyz", digit: "0123456789",
	space: " \t\n\r\f\v", blank: " \t", punct: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~", xdigit: "0123456789ABCDEFabcdef"
};
CLASSES_TR.alpha = CLASSES_TR.upper + CLASSES_TR.lower;
CLASSES_TR.alnum = CLASSES_TR.digit + CLASSES_TR.alpha;
CLASSES_TR.cntrl = (function(){ var t = ""; for (var c = 0; c < 32; c++) t += String.fromCharCode(c); return t + "\x7f"; })();
CLASSES_TR.print = (function(){ var t = ""; for (var c = 32; c < 127; c++) t += String.fromCharCode(c); return t; })();
CLASSES_TR.graph = CLASSES_TR.print.substring(1);

/* Développe un ensemble de tr : a-z, [:upper:], \n, \t, \\, \101 (octal), [x*5] (second ensemble). */
function ensembleTr(spec, longueurVoulue){
	var sortie = [], i = 0, remplir = null;
	function unCaractere(){
		var c = spec.charAt(i);
		if (c === "\\" && i + 1 < spec.length){
			var d = spec.charAt(i + 1);
			var oct = /^[0-7]{1,3}/.exec(spec.substring(i + 1));
			if (oct){ i += 1 + oct[0].length; return String.fromCharCode(parseInt(oct[0], 8)); }
			i += 2;
			return { n: "\n", t: "\t", r: "\r", f: "\f", v: "\v", a: "\x07", b: "\b" }[d] || d;
		}
		i++;
		return c;
	}
	while (i < spec.length){
		var m;
		if ((m = /^\[:([a-z]+):\]/.exec(spec.substring(i)))){
			if (!CLASSES_TR.hasOwnProperty(m[1])) throw new ShellError("tr : classe [:" + m[1] + ":] inconnue (les classes : upper lower alpha digit alnum space blank punct)");
			sortie = sortie.concat(CLASSES_TR[m[1]].split(""));
			i += m[0].length;
			continue;
		}
		if ((m = /^\[=(.)=\]/.exec(spec.substring(i)))){ sortie.push(m[1]); i += m[0].length; continue; }
		if ((m = /^\[(\\?.)\*(\d*)\]/.exec(spec.substring(i)))){
			var car = m[1].length === 2 ? ({ n: "\n", t: "\t" }[m[1].charAt(1)] || m[1].charAt(1)) : m[1];
			i += m[0].length;
			if (m[2] === "" || parseInt(m[2], 10) === 0){ remplir = { position: sortie.length, car: car }; continue; }
			var fois = m[2].charAt(0) === "0" ? parseInt(m[2], 8) : parseInt(m[2], 10);
			for (var r = 0; r < fois; r++) sortie.push(car);
			continue;
		}
		var bas = unCaractere();
		if (spec.charAt(i) === "-" && i + 1 < spec.length){
			i++;
			var haut = unCaractere();
			if (haut < bas) throw new ShellError("tr : l'intervalle « " + bas + "-" + haut + " » est à l'envers");
			for (var c = bas.charCodeAt(0); c <= haut.charCodeAt(0); c++) sortie.push(String.fromCharCode(c));
			continue;
		}
		sortie.push(bas);
	}
	// [x*] : autant de x qu'il faut pour atteindre la longueur du premier ensemble.
	if (remplir && longueurVoulue !== undefined){
		var manque = Math.max(0, longueurVoulue - sortie.length);
		var bouche = [];
		for (var k = 0; k < manque; k++) bouche.push(remplir.car);
		sortie = sortie.slice(0, remplir.position).concat(bouche, sortie.slice(remplir.position));
	}
	return sortie;
}

Shell.sorts.tr = function(args, io){
	var p = lireOptionsGNU(args, "tr", "cCdst", "", { "complement": "c", "delete": "d", "squeeze-repeats": "s", "truncate-set1": "t" });
	var o = p.opts;
	if (o.C) o.c = true;
	var attendus = (o.d && !o.s) ? 1 : (o.d && o.s ? 2 : (o.s && p.reste.length === 1 ? 1 : 2));
	if (p.reste.length === 0) throw new ShellError("tr : il faut au moins un ensemble de caractères. Exemple : echo bonjour | tr a-z A-Z");
	if (p.reste.length > attendus){
		throw new ShellError("tr : opérande en trop « " + p.reste[attendus] + " ».\n" +
			C.gris("(tr ne lit jamais d'objet lui-même, seulement ce qui arrive par un tuyau : cat OBJET | tr ...)"));
	}
	if (p.reste.length < attendus){
		throw new ShellError(o.d ? "tr -d -s : il faut deux ensembles : ceux à supprimer, puis ceux à resserrer" :
			"tr : il faut deux ensembles. Exemple : tr a-z A-Z, ou tr 'A-Za-z' 'N-ZA-Mn-za-m' (ROT13)");
	}
	if (io.stdin === null){
		throw new ShellError("tr : tr ne lit que ce qui arrive par un tuyau. Exemple : echo bonjour | tr a-z A-Z\n" +
			C.gris("(Pour un objet : cat OBJET | tr ...)"));
	}
	var un = ensembleTr(p.reste[0]);
	var dansUn = {};
	un.forEach(function(c){ dansUn[c] = true; });
	function appartient(c){ return o.c ? !dansUn[c] : !!dansUn[c]; }
	var texte = texteDisque(io.stdin, io.stdinSansFin);
	var sortie = "";
	var aResserrer = null;
	if (o.d){
		for (var i = 0; i < texte.length; i++) if (!appartient(texte.charAt(i))) sortie += texte.charAt(i);
		if (o.s) aResserrer = ensembleTr(p.reste[1]);
	} else if (o.s && p.reste.length === 1){
		sortie = texte;
		aResserrer = null;
		var precedent = null;
		var resserre = "";
		for (var s = 0; s < sortie.length; s++){
			var ch = sortie.charAt(s);
			if (ch === precedent && appartient(ch)) continue;
			resserre += ch;
			precedent = ch;
		}
		sortie = resserre;
	} else {
		var deux = ensembleTr(p.reste[1], un.length);
		if (deux.length === 0) throw new ShellError("tr : le second ensemble ne peut pas être vide quand on remplace des caractères");
		if (o.t) un = un.slice(0, deux.length);
		var table = {};
		if (!o.c){
			for (var k = 0; k < un.length; k++) table[un[k]] = deux[Math.min(k, deux.length - 1)];
		}
		// Avec -c, les caractères hors de l'ensemble, pris dans l'ordre, reçoivent ceux du second ensemble.
		var codesUn = Object.keys(dansUn).map(function(c){ return c.charCodeAt(0); }).sort(function(a, b){ return a - b; });
		for (var t = 0; t < texte.length; t++){
			var x = texte.charAt(t);
			if (o.c){
				if (dansUn[x]){ sortie += x; continue; }
				var code = x.charCodeAt(0), rang = code;
				for (var q = 0; q < codesUn.length && codesUn[q] < code; q++) rang--;
				sortie += deux[Math.min(rang, deux.length - 1)];
			} else {
				sortie += table.hasOwnProperty(x) ? table[x] : x;
			}
		}
		if (o.s) aResserrer = deux;
	}
	if (aResserrer){
		var dansDeux = {};
		aResserrer.forEach(function(c){ dansDeux[c] = true; });
		var r = "", avant = null;
		for (var z = 0; z < sortie.length; z++){
			var y = sortie.charAt(z);
			if (y === avant && dansDeux[y]) continue;
			r += y;
			avant = y;
		}
		sortie = r;
	}
	sortie = sansDernierRetour(sortie);
	GameEvents.fire({ type: "tr", text: sortie, de: p.reste[0], vers: p.reste[1] });
	return sortie;
};

/* ------------------------------------------------------------------ */
/* rev, tee, nl, fold                                                  */
/* ------------------------------------------------------------------ */

Shell.sorts.rev = function(args, io){
	var sources = sourcesTexte(args.filter(function(a){ return a !== "--"; }), io, "rev", "rev OBJET");
	var lignes = [];
	sources.forEach(function(s){ lignes = lignes.concat(lignesDe(s.texte)); });
	var sortie = lignes.map(function(l){ return l.split("").reverse().join(""); }).join("\n");
	GameEvents.fire({ type: "rev", text: sortie });
	return sortie;
};

Shell.sorts.tee = function(args, io){
	var p = lireOptionsGNU(args, "tee", "ai", "", { "append": "a", "ignore-interrupts": "i" });
	var fichiers = p.reste;
	var texte = io.stdin === null ? "" : io.stdin;
	fichiers.forEach(function(nom){ Shell.ecrire(nom, texte, !!p.opts.a, io.stdinSansFin); });
	GameEvents.fire({ type: "tee", files: fichiers, append: !!p.opts.a });
	return texte;
};

Shell.sorts.nl = function(args, io){
	var p = lireOptionsGNU(args, "nl", "", "bnwsvi", {
		"body-numbering": "b", "number-format": "n", "number-width": "w", "number-separator": "s",
		"starting-line-number": "v", "line-increment": "i"
	});
	var o = p.opts;
	var style = o.b === undefined ? "t" : o.b;
	var format = o.n === undefined ? "rn" : o.n;
	var largeur = o.w === undefined ? 6 : entierOption(o.w, "nl", "-w");
	var separateur = o.s === undefined ? "\t" : o.s;
	var numero = o.v === undefined ? 1 : parseInt(o.v, 10);
	var pas = o.i === undefined ? 1 : parseInt(o.i, 10);
	if (isNaN(numero) || isNaN(pas)) throw new ShellError("nl : -v et -i attendent des nombres");
	if (["ln", "rn", "rz"].indexOf(format) === -1) throw new ShellError("nl : format de numéro inconnu « " + format + " » (ln, rn ou rz)");
	var filtre;
	if (style === "a") filtre = function(){ return true; };
	else if (style === "t") filtre = function(l){ return l !== ""; };
	else if (style === "n") filtre = function(){ return false; };
	else if (style.charAt(0) === "p"){
		var re = compilerRegex(style.substring(1), "bre", "", "nl");
		filtre = function(l){ return re.test(l); };
	}
	else throw new ShellError("nl : style de numérotation inconnu « " + style + " » (a : toutes les lignes, t : les lignes non vides, n : aucune)");
	var sources = sourcesTexte(p.reste, io, "nl", "nl OBJET");
	var lignes = [];
	sources.forEach(function(s){ lignes = lignes.concat(lignesDe(s.texte)); });
	var blanc = completerDroite("", largeur + separateur.length);
	return lignes.map(function(l){
		if (!filtre(l)) return blanc + l;
		var nombre = String(numero);
		numero += pas;
		if (format === "ln") nombre = completerDroite(nombre, largeur);
		else if (format === "rz"){ var neg = nombre.charAt(0) === "-"; nombre = nombre.replace("-", ""); while (nombre.length < largeur - (neg ? 1 : 0)) nombre = "0" + nombre; if (neg) nombre = "-" + nombre; }
		else nombre = completerGauche(nombre, largeur);
		return nombre + separateur + l;
	}).join("\n");
};

Shell.sorts.fold = function(args, io){
	var p = lireOptionsGNU(args.map(function(a){ return /^-\d+$/.test(a) ? "-w" + a.substring(1) : a; }), "fold", "bs", "w", { "width": "w", "spaces": "s", "bytes": "b" });
	var largeur = p.opts.w === undefined ? 80 : entierOption(p.opts.w, "fold", "-w");
	if (largeur < 1) throw new ShellError("fold : la largeur doit être d'au moins 1");
	var sources = sourcesTexte(p.reste, io, "fold", "fold -w LARGEUR OBJET");
	var sortie = [];
	sources.forEach(function(s){
		lignesDe(s.texte).forEach(function(ligne){
			while (ligne.length > largeur){
				var coupe = largeur;
				if (p.opts.s){
					var blanc = Math.max(ligne.lastIndexOf(" ", largeur - 1), ligne.lastIndexOf("\t", largeur - 1));
					if (blanc >= 0) coupe = blanc + 1;
				}
				sortie.push(ligne.substring(0, coupe));
				ligne = ligne.substring(coupe);
			}
			sortie.push(ligne);
		});
	});
	return sortie.join("\n");
};
