/**
 * SortsArcanes.js : les sorts avancés du chapitre 4, l'école de magie (« Linux avancé »).
 *
 *  - JSON : jq, un vrai interpréteur de filtres (lexeur, parseur, évaluateur, sans eval ni Function),
 *    sur un lecteur de JSON qui reprend celui de jq (mêmes messages : « parse error: ... at line 3, column 4 »).
 *  - chaînes de commandes : xargs ; find complet (-exec ... {} \; et {} +, -size, -empty, -maxdepth, -mindepth,
 *    -delete, -print, -o, !, -not, parenthèses, -path, -mmin) qui remplace celui de Shell.js.
 *  - textes en colonnes : paste, join, comm, column, tac (et en prime shuf, split).
 *  - correctifs : diff (le diff de GNU : mêmes blocs, format normal et unifié -u / -U N), patch (décalage, flou,
 *    -R, -N, --dry-run, -pN, -i, .rej et .orig comme GNU patch).
 *  - copies : rsync (-a, -v, -r, -n, --delete, --exclude, la barre finale).
 *  - planification : at, atq, atrm ; crontab -e, crontab FICHIER, crontab - ; systemctl list-timers et les unités
 *    .timer ; date -d.
 *
 * Ces sorts n'entrent dans aucune liste ORDRE_DES_SORTS : c'est le chapitre 4 qui les enseignera.
 * Chaque sort pose io.code pour un code de retour non nul sans erreur (diff 1, jq -e, patch, find, xargs 123...).
 * Les messages qui imitent le vrai outil restent tels quels dans un tuyau ; à l'écran, une explication en gris
 * les suit (astuce).
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   jq          { filtre, fichier, fichiers, options, nombre, sortie, code, room }
 *   xargs       { cmd, commande, lancements: [argv...], sudo, room }        (cmd : la commande lancée, sans sudo)
 *   find        { count, output, suid, exec, supprime, room }                (le même type que l'ancien find)
 *   findExec    { cmd, commandes: [argv...], sudo, room }                    (find a lancé au moins une commande)
 *   touchExistant { item, room }                                             (touch sur un objet qui existait)
 *   paste, column, tac, join, comm, split   (fichiers, sortie...)
 *   diff        { a, b, different, unifie, room }                            (a, b : les objets, null pour « - »)
 *   patch       { ok, item, room, inverse, dejaApplique, echecs, morceaux, essai }
 *   rsync       { src, dst, sources, destination, liste, delete, dryRun, room }
 *   at          { tache: { n, quand, commande, user, dossier, hote }, quand, commande, room }
 *   atq         { nombre }      atrm { tache }      atExecutee { tache }     (une tâche dont l'heure est passée)
 *   crontabModifiee { user, action: "e" | "install", avant, apres }  et  crontab { user, action } quand une tâche a disparu
 *   timer       { action: "list-timers" | "status" | "start" | "stop" | "enable" | "disable" | "restart", nom, hote, now }
 *   date        { relative }    (date -d)
 *   et les événements habituels quand un objet change : write, cp, mkdir, rm, rmdir (rsync, patch).
 *
 * --- Ce qu'un futur chapitre peut appeler ---
 *   declarerTimer(hote, nom, { OnCalendar, Unit, Description, Documentation, dernier, prochain, actif, enabled })
 *   timersDe(hote), etatTimer(hote, timer), calendrierSystemd("Mon..Fri *-*-* 07:30")(date, 1 | -1)
 *   jqAppliquer(filtre, texteJson, variables) : { sorties: [JSON compact], erreur }
 *   differencesGnu(lignesA, lignesB, contexte), lireCorrectif(texte), appliquerMorceaux(lignes, morceaux, {})
 *   lireMoment("now + 5 minutes", pourAt), motifVersRegExp("*.log"), Shell.lancerSousCommande(argv, io, nom)
 *   etatArcanes() : state.arcanes (tâches de at, état des timers), sauvegardé avec la partie.
 */

/* ================================================================== */
/* Outils communs                                                      */
/* ================================================================== */

/* Une explication en gris pour le joueur, à la suite d'un message qui imite le vrai outil.
   Seulement à l'écran : dans un tuyau ou un objet, on garde le message tel que Linux l'écrirait. */
function astuce(io, texte){
	return io && io.tty ? "\n" + C.gris("(" + texte + ")") : "";
}

/* L'heure qu'il est, HH:MM, comme celle que find et stat attendent dans item.heure. */
function heureMaintenant(){
	var d = new Date();
	return deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes());
}

/* Le texte d'une source : un objet du jeu, ou « - » pour l'entrée standard. */
function texteSource(nom, io, cmd){
	if (nom === "-"){
		if (io.stdin === null) throw new ShellError(cmd + " : « - » désigne l'entrée standard, mais rien n'arrive par un tuyau.");
		return io.stdin;
	}
	var trouve = Shell.objetLisible(nom, io, cmd);
	var texte = trouve.item.getText();
	Shell.apresLecture(trouve, texte, cmd, io);
	return texte;
}

/* Le contenu exact, octet pour octet, comme sur le disque : le dernier retour à la ligne compris.
   jq en a besoin pour citer le bon numéro de ligne dans ses erreurs. */
function texteExact(nom, io, cmd){
	if (nom === "-") return entreeExacte(io);
	var trouve = Shell.objetLisible(nom, io, cmd);
	var texte = trouve.item.getText();
	Shell.apresLecture(trouve, texte, cmd, io);
	return contenuExact(texte, trouve.item.sansFinDeLigne);
}

/* L'entrée standard telle qu'un programme la lirait : le tuyau perd le dernier retour à la ligne, on le remet
   (sauf après echo -n). */
function entreeExacte(io){
	if (io.stdin === null || io.stdin === "") return "";
	return io.stdinSansFin ? io.stdin : contenuExact(io.stdin, false);
}

/* Le nombre d'octets d'un objet, tel que stat ou ls -l le compteraient. */
function tailleOctets(item){
	if (item instanceof Room) return 4096;
	return versOctetsUtf8(contenuExact(item.getText ? item.getText() : "", item.sansFinDeLigne)).length;
}

/*
 * Un motif de nom comme ceux de find -name ou rsync --exclude (fnmatch) : * (n'importe quoi), ? (un caractère),
 * [abc], [a-z], [!abc] ou [^abc] (une classe), \* (une étoile pour de vrai). Renvoie une RegExp ancrée.
 */
function motifVersRegExp(motif, drapeaux){
	var source = "", i = 0, n = motif.length;
	while (i < n){
		var c = motif.charAt(i);
		if (c === "*"){ source += "[\\s\\S]*"; i++; continue; }
		if (c === "?"){ source += "[\\s\\S]"; i++; continue; }
		if (c === "\\" && i + 1 < n){ source += motif.charAt(i + 1).replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); i += 2; continue; }
		if (c === "["){
			var j = i + 1;
			if (motif.charAt(j) === "!" || motif.charAt(j) === "^") j++;
			if (motif.charAt(j) === "]") j++;
			while (j < n && motif.charAt(j) !== "]") j++;
			if (j < n){
				var dedans = motif.substring(i + 1, j);
				var negation = /^[!^]/.test(dedans);
				if (negation) dedans = dedans.substring(1);
				source += "[" + (negation ? "^" : "") + dedans.replace(/[\\\]^]/g, function(x, k){ return x === "^" && k > 0 ? "^" : "\\" + x; }) + "]";
				i = j + 1;
				continue;
			}
		}
		source += c.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
		i++;
	}
	try {
		return new RegExp("^" + source + "$", drapeaux || "");
	} catch (e){
		return new RegExp("^" + motif.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&") + "$", drapeaux || "");
	}
}

/* Un sort lancé par un autre (xargs, find -exec) : mêmes pouvoirs, ses erreurs remontent. */
Shell.lancerSousCommande = function(argv, io, cmd){
	var nom = argv[0], args = argv.slice(1);
	var sudo = !!io.sudo;
	if (nom === "sudo"){
		if (!state.knows("sudo")) throw new ShellError("Tu ne connais pas encore le sort « sudo ». Les légendes disent qu'il confère tous les pouvoirs...");
		if (args.length === 0) throw new ShellError("sudo : quel sort veux-tu lancer avec les pleins pouvoirs ? Utilisation : sudo SORT");
		if (!state.has("sudoOK")){
			throw new ShellError("sudo : mot de passe requis.\n" + C.gris("(Ici, " + cmd + " ne peut pas te le demander : mets sudo en tête de ligne, « ... | sudo " + cmd + " ... », ou lance d'abord une commande avec sudo pour que le terminal s'en souvienne.)"));
		}
		// (… | sudo xargs sudo rm : déjà root, le second sudo ne change rien.)
		state.premierUsage("sudo");
		sudo = true;
		nom = args[0];
		args = args.slice(1);
	}
	var fils = { stdin: "", stdinSansFin: false, tty: io.tty, sortie1: io.sortie1, sudo: sudo, erreurs: [] };
	fils.err = function(m){ fils.erreurs.push(m); };
	fils.errFin = function(m){ fils.erreurs.push(m); };
	var sortie;
	try {
		sortie = Shell.appeler(nom, args, fils);
	} finally {
		fils.erreurs.forEach(function(m){ io.err(m); });
	}
	return { sortie: sortie === undefined || sortie === null ? "" : String(sortie), code: fils.code || 0 };
};

/* ================================================================== */
/* jq : le couteau suisse du JSON                                      */
/* ================================================================== */

/*
 * Les valeurs JSON sont des valeurs JavaScript : null, true/false, nombres, chaînes, tableaux,
 * et des Map pour les objets (une Map garde l'ordre des clés, même « 1 » ou « 10 »).
 * Un filtre produit un flot de valeurs : chaque nœud de l'arbre appelle emit() pour chacune.
 */

/* Une erreur de jq que try ou ? peuvent rattraper ; valeur est ce que reçoit catch. */
function JqErreur(valeur){ this.valeur = valeur; }
/* Une erreur venue d'après un try dans le tuyau : elle le traverse sans s'y arrêter. */
function JqTraversee(erreur, porte){ this.erreur = erreur; this.porte = porte; }
/* Un arrêt sans appel : trop de calculs, trop de résultats. */
function JqArret(message){ this.message = message; }
/* Une faute dans le filtre lui-même, trouvée avant de calculer quoi que ce soit. */
function JqSyntaxe(message, pos){ this.message = message; this.pos = pos; }

var JQ_PAS_MAX = 3000000;      // au-delà, on arrête le calcul (boucle infinie, range géant...)
var JQ_SORTIES_MAX = 20000;    // au-delà, on arrête l'affichage
var JQ_TAILLE_MAX = 2000000;   // une chaîne ou un tableau plus grand que ça : on refuse
var jqCtx = null;              // le contexte du calcul en cours (entrées, compteur de pas, io)

function jqType(v){
	if (v === null) return "null";
	if (typeof v === "boolean") return "boolean";
	if (typeof v === "number") return "number";
	if (typeof v === "string") return "string";
	if (Array.isArray(v)) return "array";
	return "object";
}
function jqVrai(v){ return v !== null && v !== false; }

/* Un nombre écrit comme jq l'écrit : 100, 0.5, 1e+16, 1e-05. */
function jqNombre(n){
	if (n !== n) return "null";
	if (n === Infinity) return "1.7976931348623157e+308";
	if (n === -Infinity) return "-1.7976931348623157e+308";
	if (n === 0) return 1 / n < 0 ? "-0" : "0";
	var signe = n < 0 ? "-" : "";
	var m = /^(\d)(?:\.(\d+))?e([+-]\d+)$/.exec(Math.abs(n).toExponential());
	var chiffres = m[1] + (m[2] || ""), exposant = parseInt(m[3], 10), point = exposant + 1;
	if (point <= -4 || point - chiffres.length > 15){
		var e = Math.abs(exposant);
		return signe + chiffres.charAt(0) + (chiffres.length > 1 ? "." + chiffres.substring(1) : "") + "e" + (exposant < 0 ? "-" : "+") + (e < 10 ? "0" + e : e);
	}
	if (point <= 0) return signe + "0." + new Array(1 - point).join("0") + chiffres;
	if (point >= chiffres.length) return signe + chiffres + new Array(point - chiffres.length + 1).join("0");
	return signe + chiffres.substring(0, point) + "." + chiffres.substring(point);
}

function jqChaine(s, ascii){
	var t = JSON.stringify(s).replace(/\u007f/g, "\\u007f");
	if (ascii) t = t.replace(/[\u0080-￿]/g, function(c){ return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); });
	return t;
}

/* Le JSON d'une valeur. o.indent : 0 (compact), un nombre d'espaces, ou "\t". */
function jqEnJson(v, o, niveau){
	o = o || {};
	niveau = niveau || 0;
	var col = o.couleurs;
	if (v === null) return col ? C.gris("null") : "null";
	if (typeof v === "boolean") return String(v);
	if (typeof v === "number") return jqNombre(v);
	if (typeof v === "string") return col ? C.vert(jqChaine(v, o.ascii)) : jqChaine(v, o.ascii);
	var pas = o.indent === "\t" ? "\t" : new Array((o.indent || 0) + 1).join(" ");
	var compact = !o.indent;
	var ici = compact ? "" : "\n" + new Array(niveau + 2).join(pas);
	var fin = compact ? "" : "\n" + new Array(niveau + 1).join(pas);
	if (Array.isArray(v)){
		if (v.length === 0) return "[]";
		return "[" + v.map(function(x){ return ici + jqEnJson(x, o, niveau + 1); }).join(",") + fin + "]";
	}
	var cles = Array.from(v.keys());
	if (cles.length === 0) return "{}";
	if (o.tri) cles.sort(jqComparerChaines);
	return "{" + cles.map(function(k){
		var cle = jqChaine(k, o.ascii);
		return ici + (col ? C.bleu(cle) : cle) + (compact ? ":" : ": ") + jqEnJson(v.get(k), o, niveau + 1);
	}).join(",") + fin + "}";
}
function jqCompact(v){ return jqEnJson(v, { indent: 0 }); }

/* « string ("aaaaaaaaaa...) » : la valeur abrégée que jq cite dans ses erreurs (11 octets au plus, puis ...). */
function jqTronque(v){
	var t = jqCompact(v);
	if (versOctetsUtf8(t).length <= 14) return t;
	var court = "", octets = 0;
	Array.from(t).some(function(c){
		var n = versOctetsUtf8(c).length;
		if (octets + n > 11) return true;
		court += c;
		octets += n;
		return false;
	});
	return court + "...";
}
function jqDecrire(v){ return jqType(v) + " (" + jqTronque(v) + ")"; }

/* L'ordre de jq : null < false < true < nombres < chaînes < tableaux < objets. */
function jqRang(v){
	if (v === null) return 0;
	if (v === false) return 1;
	if (v === true) return 2;
	return { number: 3, string: 4, array: 5, object: 6 }[jqType(v)];
}
function jqComparerChaines(a, b){ return a < b ? -1 : (a > b ? 1 : 0); }
function jqClesTriees(m){ return Array.from(m.keys()).sort(jqComparerChaines); }
function jqComparer(a, b){
	var ra = jqRang(a), rb = jqRang(b);
	if (ra !== rb) return ra < rb ? -1 : 1;
	if (ra === 3){
		if (a !== a) return b !== b ? 0 : -1;
		if (b !== b) return 1;
		return a < b ? -1 : (a > b ? 1 : 0);
	}
	if (ra === 4) return jqComparerChaines(a, b);
	if (ra === 5){
		for (var i = 0; i < a.length && i < b.length; i++){
			var c = jqComparer(a[i], b[i]);
			if (c !== 0) return c;
		}
		return a.length === b.length ? 0 : (a.length < b.length ? -1 : 1);
	}
	if (ra === 6){
		var ka = jqClesTriees(a), kb = jqClesTriees(b);
		var ck = jqComparer(ka, kb);
		if (ck !== 0) return ck;
		for (var j = 0; j < ka.length; j++){
			var cv = jqComparer(a.get(ka[j]), b.get(ka[j]));
			if (cv !== 0) return cv;
		}
	}
	return 0;
}
function jqEgal(a, b){ return jqComparer(a, b) === 0; }

/* Les caractères d'une chaîne (et non ses unités UTF-16) : jq compte en points de code. */
function jqCaracteres(s){ return Array.from(s); }

function jqVerifierTaille(n){
	if (n > JQ_TAILLE_MAX) throw new JqArret("résultat trop gros pour ce monde");
}

/* .[k] : un champ, un rang, ou une tranche. */
function jqIndexer(v, k){
	if (typeof k === "string"){
		if (v === null) return null;
		if (v instanceof Map) return v.has(k) ? v.get(k) : null;
		throw new JqErreur("Cannot index " + jqType(v) + " with string \"" + k + "\"");
	}
	if (typeof k === "number"){
		if (v === null) return null;
		if (Array.isArray(v)){
			if (k !== k) return null;
			var i = Math.floor(k);
			if (i < 0) i += v.length;
			return i >= 0 && i < v.length ? v[i] : null;
		}
		throw new JqErreur("Cannot index " + jqType(v) + " with number");
	}
	if (k instanceof Map && (k.has("start") || k.has("end"))){
		return jqTrancher(v, k.has("start") ? k.get("start") : null, k.has("end") ? k.get("end") : null);
	}
	if (Array.isArray(k) && Array.isArray(v)) return jqIndices(v, k);
	if (v === null) return null;
	throw new JqErreur("Cannot index " + jqType(v) + " with " + jqType(k));
}

function jqBornes(longueur, de, a){
	if ((de !== null && typeof de !== "number") || (a !== null && typeof a !== "number")){
		throw new JqErreur("Start and end indices of an array slice must be numbers");
	}
	var s = de === null ? 0 : Math.floor(de), e = a === null ? longueur : Math.ceil(a);
	if (s < 0) s = Math.max(0, s + longueur);
	if (e < 0) e = Math.max(0, e + longueur);
	s = Math.min(s, longueur);
	e = Math.min(e, longueur);
	if (e < s) e = s;
	return [s, e];
}

function jqTrancher(v, de, a){
	if (v === null) return null;
	if (typeof v === "string"){
		var cars = jqCaracteres(v), b = jqBornes(cars.length, de, a);
		return cars.slice(b[0], b[1]).join("");
	}
	if (Array.isArray(v)){
		var bt = jqBornes(v.length, de, a);
		return v.slice(bt[0], bt[1]);
	}
	throw new JqErreur("Cannot index " + jqType(v) + " with object");
}

/* .[] : les éléments d'un tableau, les valeurs d'un objet, avec leur clé. */
function jqIterer(v, fn){
	if (Array.isArray(v)){
		for (var i = 0; i < v.length; i++) fn(v[i], i);
		return;
	}
	if (v instanceof Map){
		var cles = Array.from(v.keys());
		for (var j = 0; j < cles.length; j++) fn(v.get(cles[j]), cles[j]);
		return;
	}
	throw new JqErreur("Cannot iterate over " + jqDecrire(v));
}

function jqLire(v, chemin){
	for (var i = 0; i < chemin.length; i++){
		if (v === null) return null;
		v = jqIndexer(v, chemin[i]);
	}
	return v;
}

/* setpath, sans jamais modifier l'original : on recopie le long du chemin. */
function jqPoser(v, chemin, i, nv){
	if (i === chemin.length) return nv;
	var k = chemin[i];
	if (typeof k === "string"){
		if (v !== null && !(v instanceof Map)) throw new JqErreur("Cannot index " + jqType(v) + " with string \"" + k + "\"");
		var m = new Map(v || []);
		m.set(k, jqPoser(v && v.has(k) ? v.get(k) : null, chemin, i + 1, nv));
		return m;
	}
	if (typeof k === "number"){
		if (v !== null && !Array.isArray(v)) throw new JqErreur("Cannot index " + jqType(v) + " with number");
		var t = (v || []).slice(), idx = Math.floor(k);
		if (idx < 0){
			idx += t.length;
			if (idx < 0) throw new JqErreur("Out of bounds negative array index");
		}
		jqVerifierTaille(idx);
		var ancien = idx < t.length ? t[idx] : null;
		while (t.length < idx) t.push(null);
		t[idx] = jqPoser(ancien, chemin, i + 1, nv);
		return t;
	}
	if (k instanceof Map){
		if (v !== null && !Array.isArray(v)) throw new JqErreur("Cannot update field at object index of " + jqType(v));
		var tab = v || [], b = jqBornes(tab.length, k.has("start") ? k.get("start") : null, k.has("end") ? k.get("end") : null);
		var neuf = jqPoser(tab.slice(b[0], b[1]), chemin, i + 1, nv);
		if (!Array.isArray(neuf)) throw new JqErreur("A slice of an array can only be assigned another array");
		return tab.slice(0, b[0]).concat(neuf, tab.slice(b[1]));
	}
	throw new JqErreur("Invalid path component");
}

/* delpaths pour un seul chemin. */
function jqSupprimer(v, chemin, i){
	i = i || 0;
	if (chemin.length === 0) return null;
	if (v === null) return null;
	var k = chemin[i];
	if (i < chemin.length - 1){
		var enfant = jqIndexer(v, k);
		if (enfant === null) return v;
		return jqPoser(v, [k], 0, jqSupprimer(enfant, chemin, i + 1));
	}
	if (typeof k === "string"){
		if (!(v instanceof Map)) throw new JqErreur("Cannot delete field at object index of " + jqType(v));
		var m = new Map(v);
		m["delete"](k);
		return m;
	}
	if (typeof k === "number"){
		if (!Array.isArray(v)) throw new JqErreur("Cannot delete field at index of " + jqType(v));
		var idx = Math.floor(k);
		if (idx < 0) idx += v.length;
		if (idx < 0 || idx >= v.length) return v;
		var t = v.slice();
		t.splice(idx, 1);
		return t;
	}
	if (k instanceof Map){
		if (!Array.isArray(v)) throw new JqErreur("Cannot delete slice of " + jqType(v));
		var b = jqBornes(v.length, k.has("start") ? k.get("start") : null, k.has("end") ? k.get("end") : null);
		return v.slice(0, b[0]).concat(v.slice(b[1]));
	}
	throw new JqErreur("Invalid path component");
}

function jqSupprimerChemins(v, chemins){
	chemins = chemins.slice().sort(function(a, b){ return jqComparer(b, a); });
	for (var i = 0; i < chemins.length; i++){
		if (!Array.isArray(chemins[i])) throw new JqErreur("Path must be specified as an array");
		v = jqSupprimer(v, chemins[i], 0);
	}
	return v;
}

/* + : nombres, chaînes, tableaux, objets ; null est neutre. */
function jqAjouter(a, b){
	if (a === null) return b;
	if (b === null) return a;
	if (typeof a === "number" && typeof b === "number") return a + b;
	if (typeof a === "string" && typeof b === "string"){ jqVerifierTaille(a.length + b.length); return a + b; }
	if (Array.isArray(a) && Array.isArray(b)){ jqVerifierTaille(a.length + b.length); return a.concat(b); }
	if (a instanceof Map && b instanceof Map){
		var m = new Map(a);
		b.forEach(function(val, k){ m.set(k, val); });
		return m;
	}
	throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be added");
}

function jqFusionProfonde(a, b){
	var m = new Map(a);
	b.forEach(function(val, k){
		var ancien = m.get(k);
		m.set(k, ancien instanceof Map && val instanceof Map ? jqFusionProfonde(ancien, val) : val);
	});
	return m;
}

function jqArith(op, a, b){
	switch (op){
	case "+": return jqAjouter(a, b);
	case "-":
		if (typeof a === "number" && typeof b === "number") return a - b;
		if (Array.isArray(a) && Array.isArray(b)) return a.filter(function(x){ return !b.some(function(y){ return jqEgal(x, y); }); });
		throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be subtracted");
	case "*":
		if (typeof a === "number" && typeof b === "number") return a * b;
		if ((typeof a === "string" && typeof b === "number") || (typeof a === "number" && typeof b === "string")){
			var s = typeof a === "string" ? a : b, n = typeof a === "number" ? a : b;
			if (n < 0 || n !== n) return null;
			var fois = Math.floor(n);
			jqVerifierTaille(s.length * fois);
			return new Array(fois + 1).join(s);
		}
		if (a instanceof Map && b instanceof Map) return jqFusionProfonde(a, b);
		throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be multiplied");
	case "/":
		if (typeof a === "number" && typeof b === "number"){
			if (b === 0) throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be divided because the divisor is zero");
			return a / b;
		}
		if (typeof a === "string" && typeof b === "string") return jqDecouper(a, b);
		throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be divided");
	case "%":
		if (typeof a === "number" && typeof b === "number"){
			var ea = Math.trunc(a), eb = Math.trunc(b);
			if (eb === 0 || eb !== eb) throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be divided (remainder) because the divisor is zero");
			var r = ea % eb;
			return r === 0 ? 0 : r;
		}
		throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot be divided");
	case "==": return jqEgal(a, b);
	case "!=": return !jqEgal(a, b);
	case "<": return jqComparer(a, b) < 0;
	case "<=": return jqComparer(a, b) <= 0;
	case ">": return jqComparer(a, b) > 0;
	case ">=": return jqComparer(a, b) >= 0;
	}
	throw new JqErreur("opérateur inconnu " + op);
}

function jqDecouper(a, sep){
	if (a === "") return [];
	if (sep === "") return jqCaracteres(a);
	return a.split(sep);
}

/* contains : b est-il contenu dans a ? */
function jqContient(a, b){
	var ta = jqType(a), tb = jqType(b);
	if (ta !== tb && !(ta === "boolean" && tb === "boolean")){
		throw new JqErreur(jqDecrire(a) + " and " + jqDecrire(b) + " cannot have their containment checked");
	}
	if (ta === "object"){
		var ok = true;
		b.forEach(function(val, k){ if (ok && (!a.has(k) || !jqContient(a.get(k), val))) ok = false; });
		return ok;
	}
	if (ta === "array") return b.every(function(y){ return a.some(function(x){ return jqType(x) === jqType(y) && jqContient(x, y); }); });
	if (ta === "string") return a.indexOf(b) > -1;
	return jqEgal(a, b);
}

function jqIndices(a, b){
	if (a === null) return null;
	var res = [], i, j;
	if (typeof a === "string" && typeof b === "string"){
		if (b === "") return null;
		var ca = jqCaracteres(a), cb = jqCaracteres(b);
		for (i = 0; i + cb.length <= ca.length; i++){
			for (j = 0; j < cb.length && ca[i + j] === cb[j]; j++);
			if (j === cb.length) res.push(i);
		}
		return res;
	}
	if (Array.isArray(a) && Array.isArray(b)){
		if (b.length === 0) return null;
		for (i = 0; i + b.length <= a.length; i++){
			for (j = 0; j < b.length && jqEgal(a[i + j], b[j]); j++);
			if (j === b.length) res.push(i);
		}
		return res;
	}
	if (Array.isArray(a)){
		for (i = 0; i < a.length; i++) if (jqEgal(a[i], b)) res.push(i);
		return res;
	}
	throw new JqErreur("Cannot determine indices of " + jqDecrire(b) + " in " + jqDecrire(a));
}

function jqVersChaine(v){ return typeof v === "string" ? v : jqCompact(v); }

/* Les formats @csv, @tsv, @json, @text, @html, @uri, @sh, @base64, @base64d. */
function jqFormater(nom, v){
	switch (nom){
	case "text": return jqVersChaine(v);
	case "json": return jqCompact(v);
	case "csv":
	case "tsv":
		if (!Array.isArray(v)) throw new JqErreur(jqDecrire(v) + " cannot be " + nom + "-formatted, only array");
		return v.map(function(x){
			if (x === null) return "";
			if (typeof x === "boolean") return String(x);
			if (typeof x === "number") return jqNombre(x);
			if (typeof x === "string"){
				if (nom === "csv") return "\"" + x.replace(/"/g, "\"\"") + "\"";
				return x.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
			}
			throw new JqErreur(jqDecrire(x) + " is not valid in a " + nom + " row");
		}).join(nom === "csv" ? "," : "\t");
	case "html":
		return jqVersChaine(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;").replace(/"/g, "&quot;");
	case "uri":
		return versOctetsUtf8(jqVersChaine(v)).map(function(o){
			var c = String.fromCharCode(o);
			return /[A-Za-z0-9\-_.~]/.test(c) ? c : "%" + (o < 16 ? "0" : "") + o.toString(16).toUpperCase();
		}).join("");
	case "sh":
		var citer = function(x){
			if (typeof x === "string") return "'" + x.replace(/'/g, "'\\''") + "'";
			if (Array.isArray(x) || x instanceof Map) throw new JqErreur(jqDecrire(x) + " can not be escaped for shell");
			return jqCompact(x);
		};
		return Array.isArray(v) ? v.map(citer).join(" ") : citer(v);
	case "base64": return encoderBase64(jqVersChaine(v));
	case "base64d":
		var clair = decoderBase64(jqVersChaine(v));
		if (clair === null) throw new JqErreur(jqDecrire(v) + " is not valid base64 data");
		return clair;
	}
	throw new JqErreur(nom + " is not a valid format");
}

/* ------------------------------------------------------------------ */
/* Lire du JSON (un flot de valeurs à la suite, comme jq)             */
/* ------------------------------------------------------------------ */

/*
 * Lit un flot de valeurs JSON à la suite, caractère par caractère, comme le fait jq (jv_parse.c) :
 * une pile de conteneurs, une valeur « en attente » (suivante), et les mêmes messages d'erreur
 * (« Expected separator between values », « Unfinished JSON term at EOF »...).
 *
 * Renvoie { valeurs: [{ v, ligne }], erreur: message ou null }. ligne est la ligne que jq cite dans
 * ses erreurs d'exécution : jq lit son entrée ligne par ligne, c'est donc la ligne où la valeur s'achève.
 */
var JQ_RIEN = {};   // « pas de valeur en attente » (jv_invalid dans jq)
function jqLireFlux(texte){
	var valeurs = [], pile = [], suivante = JQ_RIEN;
	var ligne = 1, colonne = 0, etat = "normal", jeton = "", ligneLue = 1;
	function valeur(v){
		if (suivante !== JQ_RIEN) return "Expected separator between values";
		suivante = v;
		return null;
	}
	function sommet(){ return pile.length ? pile[pile.length - 1] : undefined; }
	function estObjet(x){ return x instanceof Map; }
	function estCle(x){ return x !== undefined && x !== null && typeof x === "object" && x.cle !== undefined; }
	// Un mot (true, false, null, un nombre) se termine : on le vérifie.
	function litteral(){
		if (jeton === "") return null;
		var t = jeton, motif = null, v = null;
		if (t.charAt(0) === "t"){ motif = "true"; v = true; }
		else if (t.charAt(0) === "f"){ motif = "false"; v = false; }
		else if (t.charAt(0) === "n"){
			if (t.length === 3){ motif = "nan"; v = NaN; } else { motif = "null"; v = null; }
		}
		var erreur;
		if (motif !== null){
			if (t !== motif) return "Invalid literal";
			erreur = valeur(v);
		} else {
			var nombre;
			if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)) nombre = parseFloat(t);
			else if (/^[+-]?nan$/i.test(t)) nombre = NaN;
			else if (/^[+-]?inf(?:inity)?$/i.test(t)) nombre = t.charAt(0) === "-" ? -Infinity : Infinity;
			else return "Invalid numeric literal";
			erreur = valeur(nombre);
		}
		if (erreur) return erreur;
		jeton = "";
		return null;
	}
	// La chaîne vient de se fermer : on traduit ses séquences d'échappement.
	function chaineFinie(){
		var s = "", k = 0, t = jeton;
		while (k < t.length){
			var c = t.charAt(k++);
			if (c === "\\"){
				if (k >= t.length) return "Expected escape character at end of string";
				c = t.charAt(k++);
				var simples = { "\\": "\\", "\"": "\"", "/": "/", b: "\b", f: "\f", t: "\t", n: "\n", r: "\r" };
				if (simples.hasOwnProperty(c)){ s += simples[c]; continue; }
				if (c !== "u") return "Invalid escape";
				if (k + 4 > t.length) return "Invalid \\uXXXX escape";
				if (!/^[0-9a-fA-F]{4}$/.test(t.substr(k, 4))) return "Invalid characters in \\uXXXX escape";
				s += String.fromCharCode(parseInt(t.substr(k, 4), 16));
				k += 4;
				continue;
			}
			if (c > "\u0000" && c < "\u001f") return "Invalid string: control characters from U+0000 through U+001F must be escaped";
			s += c;
		}
		var erreur = valeur(s);
		if (erreur) return erreur;
		jeton = "";
		return null;
	}
	// Un signe de structure : [ { : , ] }
	function structure(ch){
		var haut = sommet();
		switch (ch){
		case "[":
		case "{":
			if (suivante !== JQ_RIEN) return "Expected separator between values";
			pile.push(ch === "[" ? [] : new Map());
			return null;
		case ":":
			if (suivante === JQ_RIEN) return "Expected string key before ':'";
			if (!estObjet(haut)) return "':' not as part of an object";
			if (typeof suivante !== "string") return "Object keys must be strings";
			pile.push({ cle: suivante });
			suivante = JQ_RIEN;
			return null;
		case ",":
			if (suivante === JQ_RIEN) return "Expected value before ','";
			if (pile.length === 0) return "',' not as part of an object or array";
			if (Array.isArray(haut)){ haut.push(suivante); suivante = JQ_RIEN; return null; }
			if (estCle(haut)){ pile.pop(); sommet().set(haut.cle, suivante); suivante = JQ_RIEN; return null; }
			return "Objects must consist of key:value pairs";
		case "]":
			if (!Array.isArray(haut)) return "Unmatched ']'";
			if (suivante !== JQ_RIEN){ haut.push(suivante); suivante = JQ_RIEN; }
			else if (haut.length !== 0) return "Expected another array element";
			suivante = pile.pop();
			return null;
		case "}":
			if (pile.length === 0) return "Unmatched '}'";
			if (suivante !== JQ_RIEN){
				if (!estCle(haut)) return "Objects must consist of key:value pairs";
				pile.pop();
				sommet().set(haut.cle, suivante);
				suivante = JQ_RIEN;
			} else {
				if (!estObjet(haut)) return "Unmatched '}'";
				if (haut.size !== 0) return "Expected another key-value pair";
			}
			suivante = pile.pop();
			return null;
		}
		return null;
	}
	function fini(){
		if (pile.length === 0 && suivante !== JQ_RIEN){
			valeurs.push({ v: suivante, ligne: ligneLue });
			suivante = JQ_RIEN;
		}
	}
	function faute(message){ return { valeurs: valeurs, erreur: message + " at line " + ligne + ", column " + colonne }; }
	for (var i = 0; i < texte.length; i++){
		var ch = texte.charAt(i), erreur = null;
		ligneLue = ligne;   // la ligne de ce caractère (son retour à la ligne compris)
		colonne++;
		if (ch === "\n"){ ligne++; colonne = 0; }
		if (etat === "normal"){
			var blanc = ch === " " || ch === "\t" || ch === "\r" || ch === "\n";
			var signe = "[,]{:}".indexOf(ch) > -1;
			if (blanc || signe || ch === "\""){
				erreur = litteral();
				if (!erreur && signe) erreur = structure(ch);
				if (!erreur && ch === "\"") etat = "chaine";
			} else jeton += ch;
			if (erreur) return faute(erreur);
			if (pile.length > 400) return faute("Exceeds depth limit for parsing");
			fini();
		} else if (ch === "\"" && etat === "chaine"){
			erreur = chaineFinie();
			if (erreur) return faute(erreur);
			etat = "normal";
			fini();
		} else {
			jeton += ch;
			etat = ch === "\\" && etat === "chaine" ? "echappement" : "chaine";
		}
	}
	// La fin du texte.
	if (etat !== "normal") return { valeurs: valeurs, erreur: "Unfinished string at EOF at line " + ligne + ", column " + colonne };
	var derniere = litteral();
	if (derniere) return { valeurs: valeurs, erreur: derniere + " at EOF at line " + ligne + ", column " + colonne };
	if (pile.length) return { valeurs: valeurs, erreur: "Unfinished JSON term at EOF at line " + ligne + ", column " + colonne };
	ligneLue = texte.charAt(texte.length - 1) === "\n" ? ligne - 1 : ligne;
	fini();
	return { valeurs: valeurs, erreur: null };
}

/* Une seule valeur (fromjson, --argjson) : renvoie { v } ou { erreur }. */
function jqLireUn(texte){
	var r = jqLireFlux(texte);
	if (r.erreur) return { erreur: r.erreur };
	if (r.valeurs.length !== 1) return { erreur: r.valeurs.length ? "Unexpected extra JSON values" : "Expected JSON value" };
	return { v: r.valeurs[0].v };
}

/* ------------------------------------------------------------------ */
/* Le lexeur et le parseur des filtres                                 */
/* ------------------------------------------------------------------ */

var JQ_MOTS_CLES = ["def", "if", "then", "elif", "else", "end", "as", "reduce", "foreach", "try", "catch", "label", "import", "include", "and", "or", "__loc__"];
var JQ_OPERATEURS = ["?//", "//=", "|=", "+=", "-=", "*=", "/=", "%=", "==", "!=", "<=", ">=", "//", "..",
	".", "[", "]", "{", "}", "(", ")", "|", ",", ":", ";", "=", "<", ">", "+", "-", "*", "/", "%", "?"];

/* Une chaîne "..." du filtre, avec ses \(interpolations). Renvoie { parts, fin }. */
function jqLireChaine(src, i){
	var parts = [], courant = "", j = i + 1, n = src.length;
	while (true){
		if (j >= n) throw new JqSyntaxe("unexpected end of file", n);
		var c = src.charAt(j);
		if (c === "\""){ parts.push(courant); return { parts: parts, fin: j + 1 }; }
		if (c === "\\"){
			var e = src.charAt(j + 1);
			var simples = { "\"": "\"", "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
			if (simples.hasOwnProperty(e)){ courant += simples[e]; j += 2; continue; }
			if (e === "u" && /^[0-9a-fA-F]{4}$/.test(src.substr(j + 2, 4))){ courant += String.fromCharCode(parseInt(src.substr(j + 2, 4), 16)); j += 6; continue; }
			if (e === "("){
				var profondeur = 1, k = j + 2;
				while (k < n){
					var d = src.charAt(k);
					if (d === "\""){ k = jqLireChaine(src, k).fin; continue; }
					if (d === "(") profondeur++;
					if (d === ")"){ profondeur--; if (profondeur === 0) break; }
					k++;
				}
				if (k >= n) throw new JqSyntaxe("unexpected end of file", n);
				parts.push(courant);
				courant = "";
				parts.push({ src: src.substring(j + 2, k), pos: j + 2 });
				j = k + 1;
				continue;
			}
			throw new JqSyntaxe("unexpected INVALID_CHARACTER", j);
		}
		courant += c;
		j++;
	}
}

function jqLexer(src, decalage){
	decalage = decalage || 0;
	var jetons = [], i = 0, n = src.length;
	// Comme le lexeur de jq : une fermante qui ne ferme rien d'ouvert est un caractère invalide.
	var ouvertes = [], paires = { ")": "(", "]": "[", "}": "{" };
	while (i < n){
		var c = src.charAt(i);
		if (/\s/.test(c)){ i++; continue; }
		if (c === "#"){ while (i < n && src.charAt(i) !== "\n") i++; continue; }
		var pos = i + decalage;
		if (c === "\""){
			var ch = jqLireChaine(src, i);
			jetons.push({ t: "str", parts: ch.parts.map(function(p){ return typeof p === "string" ? p : { src: p.src, pos: p.pos + decalage }; }), pos: pos });
			i = ch.fin;
			continue;
		}
		var nombre = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.substring(i));
		if (nombre && (/\d/.test(c) || c === ".")){
			jetons.push({ t: "num", v: parseFloat(nombre[0]), pos: pos });
			i += nombre[0].length;
			continue;
		}
		var mot = /^[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*/.exec(src.substring(i));
		if (mot){
			jetons.push({ t: "mot", v: mot[0], pos: pos });
			i += mot[0].length;
			continue;
		}
		if (c === "$" || c === "@"){
			var nom = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.substring(i + 1));
			if (!nom) throw new JqSyntaxe("unexpected INVALID_CHARACTER", pos);
			jetons.push({ t: c === "$" ? "var" : "fmt", v: nom[0], pos: pos });
			i += 1 + nom[0].length;
			continue;
		}
		if (c === "." && /[A-Za-z_]/.test(src.charAt(i + 1))){
			var champ = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.substring(i + 1));
			jetons.push({ t: "field", v: champ[0], pos: pos });
			i += 1 + champ[0].length;
			continue;
		}
		var op = null;
		for (var o = 0; o < JQ_OPERATEURS.length; o++){
			if (src.substr(i, JQ_OPERATEURS[o].length) === JQ_OPERATEURS[o]){ op = JQ_OPERATEURS[o]; break; }
		}
		if (op === null || op === "?//") throw new JqSyntaxe("unexpected INVALID_CHARACTER", pos);
		if (op === "(" || op === "[" || op === "{") ouvertes.push(op);
		if (paires[op]){
			if (ouvertes[ouvertes.length - 1] !== paires[op]){
				jetons.push({ t: "invalide", pos: pos });
				i++;
				continue;
			}
			ouvertes.pop();
		}
		jetons.push({ t: "op", v: op, pos: pos });
		i += op.length;
	}
	jetons.push({ t: "fin", pos: n + decalage });
	return jetons;
}

function jqDecrireJeton(j){
	if (j.t === "fin") return "end of file";
	if (j.t === "invalide") return "INVALID_CHARACTER";
	if (j.t === "num") return "LITERAL";
	if (j.t === "str") return "QQSTRING_START";
	if (j.t === "field") return "FIELD";
	if (j.t === "var") return "BINDING";
	if (j.t === "fmt") return "FORMAT";
	if (j.t === "mot") return JQ_MOTS_CLES.indexOf(j.v) > -1 ? j.v : "IDENT";
	return j.v.length === 1 ? "'" + j.v + "'" : "\"" + j.v + "\"";
}

/* Transforme le texte du filtre en arbre. */
/* interne : le filtre d'une interpolation \(...), qui n'est pas la fin du programme. */
function jqAnalyser(src, decalage, interne){
	var jetons = jqLexer(src, decalage);
	var k = 0;
	function voir(d){ return jetons[Math.min(k + (d || 0), jetons.length - 1)]; }
	function estOp(v, d){ var j = voir(d); return j.t === "op" && j.v === v; }
	function estMot(v, d){ var j = voir(d); return j.t === "mot" && j.v === v; }
	function avancer(){ return jetons[k++]; }
	function inattendu(){ throw new JqSyntaxe("unexpected " + jqDecrireJeton(voir()), voir().pos); }
	function attendreOp(v){ if (!estOp(v)) inattendu(); return avancer(); }
	function attendreMot(v){ if (!estMot(v)) inattendu(); return avancer(); }

	function tuyau(sansVirgule){
		if (estMot("def")){
			var d = definition();
			d.suite = tuyau(sansVirgule);
			return d;
		}
		var gauche = virgule(sansVirgule);
		if (estOp("|")){
			avancer();
			return { k: "pipe", a: gauche, b: tuyau(sansVirgule) };
		}
		return gauche;
	}
	function definition(){
		attendreMot("def");
		var j = avancer();
		if (j.t !== "mot" || JQ_MOTS_CLES.indexOf(j.v) > -1){ k--; inattendu(); }
		var params = [];
		if (estOp("(")){
			avancer();
			while (true){
				var p = avancer();
				if (p.t === "var") params.push({ nom: p.v, valeur: true });
				else if (p.t === "mot" && JQ_MOTS_CLES.indexOf(p.v) === -1) params.push({ nom: p.v, valeur: false });
				else { k--; inattendu(); }
				if (estOp(";")){ avancer(); continue; }
				attendreOp(")");
				break;
			}
		}
		attendreOp(":");
		var corps = tuyau(false);
		attendreOp(";");
		return { k: "def", nom: j.v, params: params, corps: corps, suite: null, pos: j.pos };
	}
	function virgule(sansVirgule){
		var gauche = alternative();
		while (!sansVirgule && estOp(",")){
			avancer();
			gauche = { k: "virgule", a: gauche, b: alternative() };
		}
		return gauche;
	}
	function alternative(){
		var gauche = affectation();
		if (estOp("//")){
			avancer();
			return { k: "alt", a: gauche, b: alternative() };
		}
		return gauche;
	}
	function affectation(){
		var gauche = ou();
		var j = voir();
		if (j.t === "op" && ["=", "|=", "+=", "-=", "*=", "/=", "%=", "//="].indexOf(j.v) > -1){
			avancer();
			return { k: "affecte", op: j.v, a: gauche, b: alternative() };
		}
		return gauche;
	}
	function ou(){
		var gauche = et();
		while (estMot("or")){ avancer(); gauche = { k: "ou", a: gauche, b: et() }; }
		return gauche;
	}
	function et(){
		var gauche = comparaison();
		while (estMot("and")){ avancer(); gauche = { k: "et", a: gauche, b: comparaison() }; }
		return gauche;
	}
	function comparaison(){
		var gauche = somme();
		var j = voir();
		if (j.t === "op" && ["==", "!=", "<", "<=", ">", ">="].indexOf(j.v) > -1){
			avancer();
			gauche = { k: "op", op: j.v, a: gauche, b: somme() };
			var suite = voir();
			if (suite.t === "op" && ["==", "!=", "<", "<=", ">", ">="].indexOf(suite.v) > -1) inattendu();
		}
		return gauche;
	}
	function somme(){
		var gauche = produit();
		while (estOp("+") || estOp("-")){
			var op = avancer().v;
			gauche = { k: "op", op: op, a: gauche, b: produit() };
		}
		return gauche;
	}
	function produit(){
		var gauche = unaire();
		while (estOp("*") || estOp("/") || estOp("%")){
			var op = avancer().v;
			gauche = { k: "op", op: op, a: gauche, b: unaire() };
		}
		return gauche;
	}
	function unaire(){
		if (estOp("-")){ avancer(); return { k: "neg", e: unaire() }; }
		return postfixe(true);
	}
	/* Un terme et ses suites : .a, [0], [1:2], [], ?, puis éventuellement « as $x | ... ». */
	function postfixe(avecAs){
		var n = terme();
		while (true){
			var j = voir();
			if (j.t === "field"){ avancer(); n = { k: "index", cible: n, cle: { k: "lit", v: j.v } }; continue; }
			if (j.t === "op" && j.v === "." && voir(1).t === "str"){ avancer(); n = { k: "index", cible: n, cle: chaine(avancer(), null) }; continue; }
			if (j.t === "op" && j.v === "." && voir(1).t === "op" && voir(1).v === "["){ avancer(); n = crochets(n); continue; }
			if (j.t === "op" && j.v === "["){ n = crochets(n); continue; }
			if (j.t === "op" && j.v === "?"){ avancer(); n = { k: "opt", e: n }; continue; }
			break;
		}
		if (avecAs && estMot("as")){
			avancer();
			var motif = lireMotif();
			attendreOp("|");
			return { k: "comme", src: n, motif: motif, corps: tuyau(false) };
		}
		return n;
	}
	function crochets(cible){
		attendreOp("[");
		if (estOp("]")){ avancer(); return { k: "iter", cible: cible }; }
		if (estOp(":")){
			avancer();
			var fin = tuyau(false);
			attendreOp("]");
			return { k: "tranche", cible: cible, de: null, a: fin };
		}
		var e = tuyau(false);
		if (estOp(":")){
			avancer();
			var a = estOp("]") ? null : tuyau(false);
			attendreOp("]");
			return { k: "tranche", cible: cible, de: e, a: a };
		}
		attendreOp("]");
		return { k: "index", cible: cible, cle: e };
	}
	function lireMotif(){
		var j = voir();
		if (j.t === "var"){ avancer(); return { variable: j.v }; }
		if (j.t === "op" && j.v === "["){
			avancer();
			var elements = [];
			if (!estOp("]")){
				while (true){
					elements.push(lireMotif());
					if (estOp(",")){ avancer(); continue; }
					break;
				}
			}
			attendreOp("]");
			return { tableau: elements };
		}
		if (j.t === "op" && j.v === "{"){
			avancer();
			var champs = [];
			while (true){
				var c = voir();
				if (c.t === "var"){ avancer(); champs.push({ cle: { k: "lit", v: c.v }, motif: { variable: c.v } }); }
				else {
					var cle;
					if (c.t === "mot"){ avancer(); cle = { k: "lit", v: c.v }; }
					else if (c.t === "str"){ avancer(); cle = chaine(c, null); }
					else if (c.t === "op" && c.v === "("){ avancer(); cle = tuyau(false); attendreOp(")"); }
					else inattendu();
					attendreOp(":");
					champs.push({ cle: cle, motif: lireMotif() });
				}
				if (estOp(",")){ avancer(); continue; }
				break;
			}
			attendreOp("}");
			return { objet: champs };
		}
		throw new JqSyntaxe("unexpected " + jqDecrireJeton(j) + ", expecting BINDING or '[' or '{'", j.pos);
	}
	function chaine(j, format){
		var parts = j.parts.map(function(p){ return typeof p === "string" ? p : jqAnalyser(p.src, p.pos, true); });
		if (format === null && parts.length === 1) return { k: "lit", v: parts[0] };
		return { k: "chaine", parts: parts, fmt: format };
	}
	function terme(){
		var j = voir();
		if (j.t === "num"){ avancer(); return { k: "lit", v: j.v }; }
		if (j.t === "str"){ avancer(); return chaine(j, null); }
		if (j.t === "fmt"){
			avancer();
			if (voir().t === "str") return chaine(avancer(), j.v);
			return { k: "format", nom: j.v };
		}
		if (j.t === "field"){ avancer(); return { k: "index", cible: { k: "id" }, cle: { k: "lit", v: j.v } }; }
		if (j.t === "var"){
			avancer();
			if (j.v === "__loc__") return { k: "lit", v: new Map([["file", "<top-level>"], ["line", src.substring(0, j.pos - (decalage || 0)).split("\n").length]]) };
			return { k: "var", nom: j.v, pos: j.pos };
		}
		if (j.t === "op"){
			switch (j.v){
			case ".":
				avancer();
				if (voir().t === "str") return { k: "index", cible: { k: "id" }, cle: chaine(avancer(), null) };
				return { k: "id" };
			case "..": avancer(); return { k: "appel", nom: "recurse", args: [], pos: j.pos };
			case "(":
				avancer();
				var e = tuyau(false);
				attendreOp(")");
				return e;
			case "[":
				avancer();
				if (estOp("]")){ avancer(); return { k: "tableau", e: null }; }
				var contenu = tuyau(false);
				attendreOp("]");
				return { k: "tableau", e: contenu };
			case "{": return objet();
			}
			inattendu();
		}
		if (j.t === "mot"){
			switch (j.v){
			case "if": return si();
			case "try":
				avancer();
				var corps = postfixe(false), attrape = null;
				if (estMot("catch")){ avancer(); attrape = postfixe(false); }
				return { k: "try", corps: corps, attrape: attrape };
			case "reduce":
			case "foreach":
				avancer();
				var source = postfixe(false);
				attendreMot("as");
				var motif = lireMotif();
				attendreOp("(");
				var init = tuyau(false);
				attendreOp(";");
				var maj = tuyau(false), extrait = null;
				if (j.v === "foreach" && estOp(";")){ avancer(); extrait = tuyau(false); }
				attendreOp(")");
				return { k: j.v, src: source, motif: motif, init: init, maj: maj, extrait: extrait };
			case "label":
				avancer();
				var nomLabel = avancer();
				if (nomLabel.t !== "var"){ k--; inattendu(); }
				attendreOp("|");
				return { k: "etiquette", nom: nomLabel.v, corps: tuyau(false) };
			case "def":
				var d = definition();
				d.suite = tuyau(false);
				return d;
			}
			if (JQ_MOTS_CLES.indexOf(j.v) > -1) inattendu();
			avancer();
			if (j.v === "true" || j.v === "false" || j.v === "null"){
				if (!estOp("(")) return { k: "lit", v: j.v === "null" ? null : j.v === "true" };
			}
			if (j.v === "break" && voir().t === "var") return { k: "casse", nom: avancer().v, pos: j.pos };
			var args = [];
			if (estOp("(")){
				avancer();
				while (true){
					args.push(tuyau(false));
					if (estOp(";")){ avancer(); continue; }
					attendreOp(")");
					break;
				}
			}
			return { k: "appel", nom: j.v, args: args, pos: j.pos };
		}
		inattendu();
	}
	function si(){
		attendreMot("if");
		var conds = [];
		var c = tuyau(false);
		attendreMot("then");
		conds.push({ c: c, alors: tuyau(false) });
		var sinon = null;
		while (true){
			if (estMot("elif")){
				avancer();
				var c2 = tuyau(false);
				attendreMot("then");
				conds.push({ c: c2, alors: tuyau(false) });
				continue;
			}
			if (estMot("else")){ avancer(); sinon = tuyau(false); }
			break;
		}
		attendreMot("end");
		return { k: "si", conds: conds, sinon: sinon };
	}
	function objet(){
		attendreOp("{");
		var champs = [];
		if (estOp("}")){ avancer(); return { k: "objet", champs: champs }; }
		while (true){
			var j = voir(), cle, val = null;
			if (j.t === "var"){
				avancer();
				if (j.v === "__loc__") cle = { k: "lit", v: "__loc__" }, val = { k: "lit", v: new Map([["file", "<top-level>"], ["line", 1]]) };
				else cle = { k: "lit", v: j.v }, val = { k: "var", nom: j.v, pos: j.pos };
				champs.push({ cle: cle, val: val });
			} else {
				if (j.t === "mot"){ avancer(); cle = { k: "lit", v: j.v }; }
				else if (j.t === "str"){ avancer(); cle = chaine(j, null); }
				else if (j.t === "fmt" && voir(1).t === "str"){ avancer(); cle = chaine(avancer(), j.v); }
				else if (j.t === "num"){ avancer(); cle = { k: "lit", v: j.v }; }
				else if (j.t === "op" && j.v === "("){ avancer(); cle = tuyau(false); attendreOp(")"); }
				else inattendu();
				if (estOp(":")){
					avancer();
					val = valeurObjet();
				} else {
					if (j.t === "op" || j.t === "num") inattendu();
					val = { k: "index", cible: { k: "id" }, cle: cle };
				}
				champs.push({ cle: cle, val: val });
			}
			if (estOp(",")){
				avancer();
				// jq 1.7 accepte une virgule avant l'accolade fermante : {a: 1,}
				if (estOp("}")){ avancer(); return { k: "objet", champs: champs }; }
				continue;
			}
			if (!estOp("}")){
				throw new JqSyntaxe("unexpected " + jqDecrireJeton(voir()) + ", expecting '}'", voir().pos);
			}
			avancer();
			return { k: "objet", champs: champs };
		}
	}
	/* La valeur d'un champ d'objet : un terme, ou un tuyau de termes (pas de virgule, pas de + nu). */
	function valeurObjet(){
		// Comme dans jq : if, try, reduce... doivent être mis entre parenthèses ici.
		if (voir().t === "mot" && ["if", "try", "reduce", "foreach", "label", "def"].indexOf(voir().v) > -1) inattendu();
		var n = estOp("-") ? (avancer(), { k: "neg", e: postfixe(false) }) : postfixe(true);
		if (estOp("|")){ avancer(); return { k: "pipe", a: n, b: valeurObjet() }; }
		return n;
	}

	var arbre = tuyau(false);
	if (voir().t !== "fin") throw new JqSyntaxe("unexpected " + jqDecrireJeton(voir()) + (interne ? "" : ", expecting end of file"), voir().pos);
	return arbre;
}

/* ------------------------------------------------------------------ */
/* L'évaluateur                                                        */
/* ------------------------------------------------------------------ */

function jqTic(){
	if (++jqCtx.pas > JQ_PAS_MAX) throw new JqArret("trop de calculs, j'arrête là (une boucle sans fin ?)");
}

function jqEnfant(env){ return { v: Object.create(env.v), f: env.f }; }

/* Essaie corps(emitInterne) ; une erreur venue d'après (dans emit) traverse sans être rattrapée. */
function jqEssayer(corps, surErreur, emit){
	var porte = {};
	try {
		corps(function(v, p){
			try {
				emit(v, p);
			} catch (e){
				if (e instanceof JqErreur) throw new JqTraversee(e, porte);
				throw e;
			}
		});
	} catch (e){
		if (e instanceof JqTraversee && e.porte === porte) throw e.erreur;
		if (e instanceof JqErreur){ surErreur(e); return; }
		throw e;
	}
}

/* Toutes les valeurs d'un filtre, dans un tableau. */
function jqToutes(n, x, env){
	var res = [];
	jqEv(n, x, env, function(v){ res.push(v); });
	return res;
}

/* La première valeur d'un filtre (ou { vide: true }). */
function jqPremiere(n, x, env){
	var jeton = {}, res = { vide: true };
	try {
		jqEv(n, x, env, function(v){ res = { v: v }; throw jeton; });
	} catch (e){
		if (e !== jeton) throw e;
	}
	return res;
}

/* Lie un motif ($x, [$a, $b], {a: $x}) à une valeur, puis appelle suite(env). */
function jqLier(motif, v, env, suite){
	if (motif.variable !== undefined){
		var e = jqEnfant(env);
		e.v[motif.variable] = v;
		return suite(e);
	}
	if (motif.tableau){
		var lier = function(i, envCourant){
			if (i === motif.tableau.length) return suite(envCourant);
			jqLier(motif.tableau[i], v === null ? null : jqIndexer(v, i), envCourant, function(e2){ lier(i + 1, e2); });
		};
		return lier(0, env);
	}
	var lierChamp = function(i, envCourant){
		if (i === motif.objet.length) return suite(envCourant);
		var champ = motif.objet[i];
		jqEv(champ.cle, v, envCourant, function(cle){
			if (typeof cle !== "string") throw new JqErreur("Cannot index " + jqType(v) + " with " + jqType(cle));
			jqLier(champ.motif, v === null ? null : jqIndexer(v, cle), envCourant, function(e2){ lierChamp(i + 1, e2); });
		});
	};
	return lierChamp(0, env);
}

/* Appelle une fonction définie par def (ou un paramètre-filtre). chemin : pour le mode chemin. */
function jqAppelerDef(def, args, x, envAppelant, emit, chemin){
	if (def.fermeture){
		if (chemin) return jqEvChemin(def.node, x, chemin, def.env, emit);
		return jqEv(def.node, x, def.env, emit);
	}
	var envAppel = { v: Object.create(def.env.v), f: Object.create(def.env.f) };
	def.params.forEach(function(p, i){
		if (!p.valeur) envAppel.f[p.nom + "/0"] = { fermeture: true, node: args[i], env: envAppelant };
	});
	var lier = function(i, envCourant){
		if (i === def.params.length){
			if (chemin) return jqEvChemin(def.corps, x, chemin, envCourant, emit);
			return jqEv(def.corps, x, envCourant, emit);
		}
		var p = def.params[i];
		if (!p.valeur) return lier(i + 1, envCourant);
		jqEv(args[i], x, envAppelant, function(v){
			var e2 = { v: Object.create(envCourant.v), f: Object.create(envCourant.f) };
			e2.v[p.nom] = v;
			e2.f[p.nom + "/0"] = { fermeture: true, node: { k: "lit", v: v }, env: e2 };
			lier(i + 1, e2);
		});
	};
	lier(0, envAppel);
}

/* Les valeurs des arguments, combinées (le premier argument varie le moins vite). */
function jqProduit(args, x, env, fn){
	var valeurs = [];
	var etape = function(i){
		if (i === args.length) return fn.apply(null, valeurs);
		jqEv(args[i], x, env, function(v){ valeurs[i] = v; etape(i + 1); });
	};
	etape(0);
}

function jqEv(n, x, env, emit){
	jqTic();
	switch (n.k){
	case "id": emit(x); return;
	case "lit": emit(n.v); return;
	case "var":
		if (!(n.nom in env.v)) throw new JqErreur("$" + n.nom + " is not defined");
		emit(env.v[n.nom]);
		return;
	case "index":
		jqEv(n.cible, x, env, function(v){
			jqEv(n.cle, x, env, function(k){ emit(jqIndexer(v, k)); });
		});
		return;
	case "tranche":
		jqEv(n.cible, x, env, function(v){
			var de = n.de ? jqToutes(n.de, x, env) : [null], a = n.a ? jqToutes(n.a, x, env) : [null];
			a.forEach(function(fin){ de.forEach(function(debut){ emit(jqTrancher(v, debut, fin)); }); });
		});
		return;
	case "iter":
		jqEv(n.cible, x, env, function(v){ jqIterer(v, function(e){ emit(e); }); });
		return;
	case "opt":
		jqEssayer(function(e2){ jqEv(n.e, x, env, e2); }, function(){}, emit);
		return;
	case "try":
		jqEssayer(function(e2){ jqEv(n.corps, x, env, e2); }, function(err){
			if (n.attrape) jqEv(n.attrape, err.valeur, env, emit);
		}, emit);
		return;
	case "pipe":
		jqEv(n.a, x, env, function(v){ jqEv(n.b, v, env, emit); });
		return;
	case "virgule":
		jqEv(n.a, x, env, emit);
		jqEv(n.b, x, env, emit);
		return;
	case "neg":
		jqEv(n.e, x, env, function(v){
			if (typeof v !== "number") throw new JqErreur(jqDecrire(v) + " cannot be negated");
			emit(-v);
		});
		return;
	case "op":
		jqEv(n.b, x, env, function(b){
			jqEv(n.a, x, env, function(a){ emit(jqArith(n.op, a, b)); });
		});
		return;
	case "et":
	case "ou":
		jqEv(n.a, x, env, function(a){
			if (n.k === "et" && !jqVrai(a)){ emit(false); return; }
			if (n.k === "ou" && jqVrai(a)){ emit(true); return; }
			jqEv(n.b, x, env, function(b){ emit(jqVrai(b)); });
		});
		return;
	case "alt":
		var trouve = false;
		jqEv(n.a, x, env, function(v){ if (jqVrai(v)){ trouve = true; emit(v); } });
		if (!trouve) jqEv(n.b, x, env, emit);
		return;
	case "affecte": jqAffecter(n, x, env, emit); return;
	case "tableau":
		if (n.e === null){ emit([]); return; }
		var t = [];
		jqEv(n.e, x, env, function(v){ t.push(v); jqVerifierTaille(t.length); });
		emit(t);
		return;
	case "objet":
		var construire = function(i, m){
			if (i === n.champs.length){ emit(m); return; }
			var champ = n.champs[i];
			jqEv(champ.cle, x, env, function(cle){
				if (typeof cle !== "string") throw new JqErreur("Cannot use " + jqDecrire(cle) + " as object key");
				jqEv(champ.val, x, env, function(val){
					var m2 = new Map(m);
					m2.set(cle, val);
					construire(i + 1, m2);
				});
			});
		};
		construire(0, new Map());
		return;
	case "chaine":
		var parts = n.parts;
		var assembler = function(i, suffixe){
			if (i < 0){ emit(suffixe); return; }
			var p = parts[i];
			if (typeof p === "string"){ assembler(i - 1, p + suffixe); return; }
			jqEv(p, x, env, function(v){
				assembler(i - 1, (n.fmt ? jqFormater(n.fmt, v) : jqVersChaine(v)) + suffixe);
			});
		};
		assembler(parts.length - 1, "");
		return;
	case "format": emit(jqFormater(n.nom, x)); return;
	case "si":
		var branche = function(i){
			if (i === n.conds.length){
				if (n.sinon) jqEv(n.sinon, x, env, emit); else emit(x);
				return;
			}
			jqEv(n.conds[i].c, x, env, function(c){
				if (jqVrai(c)) jqEv(n.conds[i].alors, x, env, emit);
				else branche(i + 1);
			});
		};
		branche(0);
		return;
	case "comme":
		jqEv(n.src, x, env, function(v){
			jqLier(n.motif, v, env, function(e2){ jqEv(n.corps, x, e2, emit); });
		});
		return;
	case "reduce":
		jqEv(n.init, x, env, function(init){
			var acc = init;
			jqEv(n.src, x, env, function(v){
				jqLier(n.motif, v, env, function(e2){
					var dernier = null;
					jqEv(n.maj, acc, e2, function(u){ dernier = u; });
					acc = dernier;
				});
			});
			emit(acc);
		});
		return;
	case "foreach":
		jqEv(n.init, x, env, function(init){
			var acc = init;
			jqEv(n.src, x, env, function(v){
				jqLier(n.motif, v, env, function(e2){
					jqEv(n.maj, acc, e2, function(u){
						acc = u;
						if (n.extrait) jqEv(n.extrait, u, e2, emit); else emit(u);
					});
				});
			});
		});
		return;
	case "def":
		var f2 = Object.create(env.f);
		var def = { params: n.params, corps: n.corps, env: null };
		f2[n.nom + "/" + n.params.length] = def;
		def.env = { v: env.v, f: f2 };
		jqEv(n.suite, x, def.env, emit);
		return;
	case "etiquette":
		var jeton = {};
		var e3 = jqEnfant(env);
		e3.v["*label*" + n.nom] = jeton;
		try {
			jqEv(n.corps, x, e3, emit);
		} catch (e){
			if (e !== jeton) throw e;
		}
		return;
	case "casse":
		var j = env.v["*label*" + n.nom];
		if (!j) throw new JqErreur("$*label-" + n.nom + " is not defined");
		throw j;
	case "appel":
		var cle = n.nom + "/" + n.args.length;
		var d = env.f[cle];
		if (d) return jqAppelerDef(d, n.args, x, env, emit, null);
		var natif = JQ_NATIFS[cle];
		if (natif) return natif(x, n.args, env, emit);
		throw new JqErreur(cle + " is not defined");
	}
	throw new JqErreur("nœud inconnu " + n.k);
}

/* Le mode chemin : emit(valeur, chemin), pour path(), del(), |=, = ... */
function jqEvChemin(n, x, p, env, emit){
	jqTic();
	switch (n.k){
	case "id": emit(x, p); return;
	case "index":
		jqEvChemin(n.cible, x, p, env, function(v, pv){
			jqEv(n.cle, x, env, function(k){ emit(v === null ? null : jqIndexer(v, k), pv.concat([k])); });
		});
		return;
	case "tranche":
		jqEvChemin(n.cible, x, p, env, function(v, pv){
			var de = n.de ? jqToutes(n.de, x, env) : [null], a = n.a ? jqToutes(n.a, x, env) : [null];
			a.forEach(function(fin){
				de.forEach(function(debut){
					emit(jqTrancher(v, debut, fin), pv.concat([new Map([["start", debut], ["end", fin]])]));
				});
			});
		});
		return;
	case "iter":
		jqEvChemin(n.cible, x, p, env, function(v, pv){
			if (v === null) return;
			jqIterer(v, function(e, k){ emit(e, pv.concat([k])); });
		});
		return;
	case "opt":
		jqEssayer(function(e2){ jqEvChemin(n.e, x, p, env, e2); }, function(){}, emit);
		return;
	case "try":
		if (n.attrape) break;
		jqEssayer(function(e2){ jqEvChemin(n.corps, x, p, env, e2); }, function(){}, emit);
		return;
	case "pipe":
		jqEvChemin(n.a, x, p, env, function(v, pv){ jqEvChemin(n.b, v, pv, env, emit); });
		return;
	case "virgule":
		jqEvChemin(n.a, x, p, env, emit);
		jqEvChemin(n.b, x, p, env, emit);
		return;
	case "alt":
		var trouve = false;
		jqEvChemin(n.a, x, p, env, function(v, pv){ if (jqVrai(v)){ trouve = true; emit(v, pv); } });
		if (!trouve) jqEvChemin(n.b, x, p, env, emit);
		return;
	case "si":
		var branche = function(i){
			if (i === n.conds.length){
				if (n.sinon) jqEvChemin(n.sinon, x, p, env, emit); else emit(x, p);
				return;
			}
			jqEv(n.conds[i].c, x, env, function(c){
				if (jqVrai(c)) jqEvChemin(n.conds[i].alors, x, p, env, emit);
				else branche(i + 1);
			});
		};
		branche(0);
		return;
	case "comme":
		jqEv(n.src, x, env, function(v){
			jqLier(n.motif, v, env, function(e2){ jqEvChemin(n.corps, x, p, e2, emit); });
		});
		return;
	case "def":
		var f2 = Object.create(env.f);
		var def = { params: n.params, corps: n.corps, env: null };
		f2[n.nom + "/" + n.params.length] = def;
		def.env = { v: env.v, f: f2 };
		jqEvChemin(n.suite, x, p, def.env, emit);
		return;
	case "etiquette":
		var jeton = {};
		var e3 = jqEnfant(env);
		e3.v["*label*" + n.nom] = jeton;
		try {
			jqEvChemin(n.corps, x, p, e3, emit);
		} catch (e){
			if (e !== jeton) throw e;
		}
		return;
	case "casse":
		return jqEv(n, x, env, emit);
	case "appel":
		var cle = n.nom + "/" + n.args.length;
		var d = env.f[cle];
		if (d) return jqAppelerDef(d, n.args, x, env, emit, p);
		if (JQ_NATIFS_CHEMIN[cle]) return JQ_NATIFS_CHEMIN[cle](x, p, n.args, env, emit);
		break;
	}
	jqEv(n, x, env, function(v){ throw new JqErreur("Invalid path expression with result " + jqTronque(v)); });
}

function jqChemins(n, x, env){
	var chemins = [];
	jqEvChemin(n, x, [], env, function(v, p){ chemins.push(p); });
	return chemins;
}

/* =, |=, +=, -=, *=, /=, %=, //= */
function jqAffecter(n, x, env, emit){
	if (n.op === "|="){
		// Comme jq 1.7 : un chemin dont la mise à jour ne donne rien (empty) est supprimé, à la fin.
		var r = x, aSupprimer = [];
		jqChemins(n.a, x, env).forEach(function(p){
			var res = jqPremiere(n.b, jqLire(r, p), env);
			if (res.vide) aSupprimer.push(p); else r = jqPoser(r, p, 0, res.v);
		});
		emit(aSupprimer.length ? jqSupprimerChemins(r, aSupprimer) : r);
		return;
	}
	jqEv(n.b, x, env, function(val){
		var r2 = x;
		jqChemins(n.a, x, env).forEach(function(p){
			if (n.op === "=") r2 = jqPoser(r2, p, 0, val);
			else {
				var ancien = jqLire(r2, p);
				r2 = jqPoser(r2, p, 0, n.op === "//=" ? (jqVrai(ancien) ? ancien : val) : jqArith(n.op.charAt(0), ancien, val));
			}
		});
		emit(r2);
	});
}

/* ------------------------------------------------------------------ */
/* Les fonctions intégrées                                             */
/* ------------------------------------------------------------------ */

function jqNombreRequis(v, quoi){
	if (typeof v !== "number") throw new JqErreur(jqDecrire(v) + " number required");
	return v;
}

/* Une expression régulière de jq (Oniguruma) en RegExp JavaScript. */
function jqRegex(re, drapeaux){
	if (typeof re !== "string") throw new JqErreur(jqType(re) + " not a string or array");
	if (drapeaux !== null && typeof drapeaux !== "string") throw new JqErreur(jqDecrire(drapeaux) + " is not a string");
	drapeaux = drapeaux || "";
	if (/[^gimnpsxl]/.test(drapeaux)) throw new JqErreur(drapeaux + " is not a valid modifier string");
	var js = "g";
	if (drapeaux.indexOf("i") > -1) js += "i";
	if (drapeaux.indexOf("s") > -1 || drapeaux.indexOf("p") > -1) js += "s";
	if (drapeaux.indexOf("x") > -1) re = re.replace(/\\#/g, "\u0000").replace(/#[^\n]*/g, "").replace(/\s+/g, "").replace(/\u0000/g, "\\#");
	try {
		return { re: new RegExp(re, js), global: drapeaux.indexOf("g") > -1, sansVides: drapeaux.indexOf("n") > -1 };
	} catch (e){
		throw new JqErreur(re + " (at offset 0) is not a valid regex: " + e.message);
	}
}

/* Toutes les correspondances (ou la première), au format de match. */
function jqCorrespondances(s, r, toutes){
	if (typeof s !== "string") throw new JqErreur(jqDecrire(s) + " cannot be matched, as it is not a string");
	var res = [], m, enCars = function(k){ return jqCaracteres(s.substring(0, k)).length; };
	var noms = [];
	r.re.source.replace(/\((?!\?)|\(\?<([A-Za-z_][A-Za-z0-9_]*)>/g, function(tout, nom){ noms.push(nom || null); return tout; });
	r.re.lastIndex = 0;
	while ((m = r.re.exec(s)) !== null){
		if (m[0] === "") r.re.lastIndex++;
		if (!(m[0] === "" && r.sansVides)){
			var debut = enCars(m.index);
			var captures = [];
			for (var g = 1; g < m.length; g++){
				var cap = m[g];
				var pos = cap === undefined ? -1 : enCars(s.indexOf(cap, m.index));
				captures.push(cap === undefined ?
					new Map([["offset", -1], ["string", null], ["length", 0], ["name", noms[g - 1] || null]]) :
					new Map([["offset", pos], ["length", jqCaracteres(cap).length], ["string", cap], ["name", noms[g - 1] || null]]));
			}
			res.push(new Map([["offset", debut], ["length", jqCaracteres(m[0]).length], ["string", m[0]], ["captures", captures], ["_index", m.index]]));
		}
		if (!toutes) break;
		if (r.re.lastIndex > s.length) break;
	}
	return res;
}
function jqSansIndex(m){ var c = new Map(m); c["delete"]("_index"); return c; }
function jqCaptureObjet(m){
	var o = new Map();
	m.get("captures").forEach(function(c){ if (c.get("name") !== null) o.set(c.get("name"), c.get("string")); });
	return o;
}

function jqTrierPar(t, n, env){
	if (!Array.isArray(t)) throw new JqErreur(jqDecrire(t) + " cannot be sorted, as it is not an array");
	var paires = t.map(function(v, i){ return { v: v, cle: n ? jqToutes(n, v, env) : v, i: i }; });
	paires.sort(function(a, b){ return jqComparer(a.cle, b.cle) || a.i - b.i; });
	return paires;
}

var JQ_NATIFS = {
	"empty/0": function(){},
	"error/0": function(x){ throw new JqErreur(x); },
	"error/1": function(x, a, env){ jqEv(a[0], x, env, function(m){ throw new JqErreur(m); }); },
	"not/0": function(x, a, env, emit){ emit(!jqVrai(x)); },
	"length/0": function(x, a, env, emit){
		if (x === null) return emit(0);
		if (typeof x === "boolean") throw new JqErreur(jqDecrire(x) + " has no length");
		if (typeof x === "number") return emit(Math.abs(x));
		if (typeof x === "string") return emit(jqCaracteres(x).length);
		if (Array.isArray(x)) return emit(x.length);
		emit(x.size);
	},
	"utf8bytelength/0": function(x, a, env, emit){
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " only strings have UTF-8 byte length");
		emit(versOctetsUtf8(x).length);
	},
	"keys/0": function(x, a, env, emit){
		if (x instanceof Map) return emit(jqClesTriees(x));
		if (Array.isArray(x)) return emit(x.map(function(v, i){ return i; }));
		throw new JqErreur(jqDecrire(x) + " has no keys");
	},
	"keys_unsorted/0": function(x, a, env, emit){
		if (x instanceof Map) return emit(Array.from(x.keys()));
		return JQ_NATIFS["keys/0"](x, a, env, emit);
	},
	"has/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(k){
			if (x instanceof Map && typeof k === "string") return emit(x.has(k));
			if (Array.isArray(x) && typeof k === "number") return emit(k >= 0 && k < x.length);
			throw new JqErreur("Cannot check whether " + jqType(x) + " has a " + jqType(k) + " key");
		});
	},
	"contains/1": function(x, a, env, emit){ jqEv(a[0], x, env, function(b){ emit(jqContient(x, b)); }); },
	"add/0": function(x, a, env, emit){
		var acc = null;
		jqIterer(x, function(v){ acc = jqAjouter(acc, v); });
		emit(acc);
	},
	"range/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(de, jusque){
			jqNombreRequis(de); jqNombreRequis(jusque);
			for (var i = de; i < jusque; i++){ jqTic(); emit(i); }
		});
	},
	"range/3": function(x, a, env, emit){
		jqProduit(a, x, env, function(de, jusque, pas){
			jqNombreRequis(de); jqNombreRequis(jusque); jqNombreRequis(pas);
			if (pas > 0) for (var i = de; i < jusque; i += pas){ jqTic(); emit(i); }
			else if (pas < 0) for (var j = de; j > jusque; j += pas){ jqTic(); emit(j); }
		});
	},
	"floor/0": function(x, a, env, emit){ emit(Math.floor(jqNombreRequis(x))); },
	"ceil/0": function(x, a, env, emit){ emit(Math.ceil(jqNombreRequis(x))); },
	"round/0": function(x, a, env, emit){ jqNombreRequis(x); emit(x < 0 ? -Math.round(-x) : Math.round(x)); },
	"sqrt/0": function(x, a, env, emit){ emit(Math.sqrt(jqNombreRequis(x))); },
	"fabs/0": function(x, a, env, emit){ emit(Math.abs(jqNombreRequis(x))); },
	"abs/0": function(x, a, env, emit){
		if (typeof x !== "number") throw new JqErreur(jqDecrire(x) + " has no absolute value");
		emit(x < 0 ? -x : x);
	},
	"log/0": function(x, a, env, emit){ emit(Math.log(jqNombreRequis(x))); },
	"log2/0": function(x, a, env, emit){ emit(Math.log2(jqNombreRequis(x))); },
	"log10/0": function(x, a, env, emit){ emit(Math.log10(jqNombreRequis(x))); },
	"exp/0": function(x, a, env, emit){ emit(Math.exp(jqNombreRequis(x))); },
	"exp2/0": function(x, a, env, emit){ emit(Math.pow(2, jqNombreRequis(x))); },
	"exp10/0": function(x, a, env, emit){ emit(Math.pow(10, jqNombreRequis(x))); },
	"pow/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(b, e){ emit(Math.pow(jqNombreRequis(b), jqNombreRequis(e))); });
	},
	"infinite/0": function(x, a, env, emit){ emit(Infinity); },
	"nan/0": function(x, a, env, emit){ emit(NaN); },
	"isinfinite/0": function(x, a, env, emit){ jqNombreRequis(x); emit(x === Infinity || x === -Infinity); },
	"isnan/0": function(x, a, env, emit){ jqNombreRequis(x); emit(x !== x); },
	"isnormal/0": function(x, a, env, emit){ jqNombreRequis(x); emit(isFinite(x) && x !== 0); },
	"tostring/0": function(x, a, env, emit){ emit(jqVersChaine(x)); },
	"tonumber/0": function(x, a, env, emit){
		if (typeof x === "number") return emit(x);
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be parsed as a number");
		var lu = jqLireUn(x);
		if (lu.erreur) throw new JqErreur(lu.erreur + " (while parsing '" + x + "')");
		if (typeof lu.v !== "number") throw new JqErreur(jqDecrire(lu.v) + " cannot be parsed as a number");
		emit(lu.v);
	},
	"type/0": function(x, a, env, emit){ emit(jqType(x)); },
	"tojson/0": function(x, a, env, emit){ emit(jqCompact(x)); },
	"fromjson/0": function(x, a, env, emit){
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be parsed as JSON");
		var r = jqLireUn(x);
		if (r.erreur) throw new JqErreur(r.erreur + " (while parsing '" + x + "')");
		emit(r.v);
	},
	"sort/0": function(x, a, env, emit){ emit(jqTrierPar(x, null, env).map(function(p){ return p.v; })); },
	"sort_by/1": function(x, a, env, emit){ emit(jqTrierPar(x, a[0], env).map(function(p){ return p.v; })); },
	"group_by/1": function(x, a, env, emit){
		var groupes = [], dernier = null;
		jqTrierPar(x, a[0], env).forEach(function(p){
			if (dernier && jqEgal(dernier.cle, p.cle)) groupes[groupes.length - 1].push(p.v);
			else groupes.push([p.v]);
			dernier = p;
		});
		emit(groupes);
	},
	"unique/0": function(x, a, env, emit){
		var res = [], dernier;
		jqTrierPar(x, null, env).forEach(function(p, i){ if (i === 0 || !jqEgal(dernier, p.v)) res.push(p.v); dernier = p.v; });
		emit(res);
	},
	"unique_by/1": function(x, a, env, emit){
		var res = [], dernier = null;
		jqTrierPar(x, a[0], env).forEach(function(p){ if (!dernier || !jqEgal(dernier.cle, p.cle)) res.push(p.v); dernier = p; });
		emit(res);
	},
	"min/0": function(x, a, env, emit){ var t = jqTrierPar(x, null, env); emit(t.length ? t[0].v : null); },
	"max/0": function(x, a, env, emit){ var t = jqTrierPar(x, null, env); emit(t.length ? t[t.length - 1].v : null); },
	"min_by/1": function(x, a, env, emit){ var t = jqTrierPar(x, a[0], env); emit(t.length ? t[0].v : null); },
	"max_by/1": function(x, a, env, emit){ var t = jqTrierPar(x, a[0], env); emit(t.length ? t[t.length - 1].v : null); },
	"reverse/0": function(x, a, env, emit){
		if (x === null) return emit([]);
		if (typeof x === "string") return emit(jqCaracteres(x).reverse().join(""));
		if (!Array.isArray(x)) throw new JqErreur("Cannot reverse " + jqDecrire(x));
		emit(x.slice().reverse());
	},
	"startswith/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(b){
			if (typeof x !== "string" || typeof b !== "string") throw new JqErreur("startswith() requires string inputs");
			emit(x.substring(0, b.length) === b);
		});
	},
	"endswith/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(b){
			if (typeof x !== "string" || typeof b !== "string") throw new JqErreur("endswith() requires string inputs");
			emit(b.length <= x.length && x.substring(x.length - b.length) === b);
		});
	},
	"ltrimstr/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(b){
			emit(typeof x === "string" && typeof b === "string" && x.substring(0, b.length) === b ? x.substring(b.length) : x);
		});
	},
	"rtrimstr/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(b){
			emit(typeof x === "string" && typeof b === "string" && b.length <= x.length && x.substring(x.length - b.length) === b ? x.substring(0, x.length - b.length) : x);
		});
	},
	"trim/0": function(x, a, env, emit){ if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be trimmed"); emit(x.trim()); },
	"ltrim/0": function(x, a, env, emit){ if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be trimmed"); emit(x.replace(/^\s+/, "")); },
	"rtrim/0": function(x, a, env, emit){ if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be trimmed"); emit(x.replace(/\s+$/, "")); },
	"explode/0": function(x, a, env, emit){
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be exploded");
		emit(jqCaracteres(x).map(function(c){ return c.codePointAt(0); }));
	},
	"implode/0": function(x, a, env, emit){
		if (!Array.isArray(x)) throw new JqErreur(jqDecrire(x) + " cannot be imploded, must be an array of codepoints");
		emit(x.map(function(c){
			if (typeof c !== "number") throw new JqErreur(jqDecrire(c) + " can't be imploded, unicode codepoint needs to be numeric");
			return String.fromCodePoint(c >= 0 && c <= 0x10ffff ? Math.floor(c) : 0xfffd);
		}).join(""));
	},
	"split/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(sep){
			if (typeof x !== "string" || typeof sep !== "string") throw new JqErreur("split input and separator must be strings");
			emit(jqDecouper(x, sep));
		});
	},
	"split/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){ emit(jqDecouperRegex(x, re, dr)); });
	},
	"join/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(sep){
			var acc = null;
			jqIterer(x, function(v){
				var morceau = v === null ? "" : (typeof v === "boolean" || typeof v === "number" ? jqCompact(v) : v);
				acc = jqAjouter(acc === null ? "" : jqAjouter(acc, sep), morceau);
			});
			emit(acc === null ? "" : acc);
		});
	},
	"ascii_downcase/0": function(x, a, env, emit){
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be ascii_downcased");
		emit(x.replace(/[A-Z]/g, function(c){ return c.toLowerCase(); }));
	},
	"ascii_upcase/0": function(x, a, env, emit){
		if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be ascii_upcased");
		emit(x.replace(/[a-z]/g, function(c){ return c.toUpperCase(); }));
	},
	"test/1": function(x, a, env, emit){ JQ_NATIFS["test/2"](x, [a[0], { k: "lit", v: null }], env, emit); },
	"test/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){ emit(jqCorrespondances(x, jqRegex(re, dr), false).length > 0); });
	},
	"match/1": function(x, a, env, emit){ JQ_NATIFS["match/2"](x, [a[0], { k: "lit", v: null }], env, emit); },
	"match/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){
			var r = jqRegex(re, dr);
			jqCorrespondances(x, r, r.global).forEach(function(m){ emit(jqSansIndex(m)); });
		});
	},
	"capture/1": function(x, a, env, emit){ JQ_NATIFS["capture/2"](x, [a[0], { k: "lit", v: null }], env, emit); },
	"capture/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){
			var r = jqRegex(re, dr);
			jqCorrespondances(x, r, r.global).forEach(function(m){ emit(jqCaptureObjet(m)); });
		});
	},
	"scan/1": function(x, a, env, emit){ JQ_NATIFS["scan/2"](x, [a[0], { k: "lit", v: null }], env, emit); },
	"scan/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){
			jqCorrespondances(x, jqRegex(re, dr), true).forEach(function(m){
				var caps = m.get("captures");
				emit(caps.length ? caps.map(function(c){ return c.get("string"); }) : m.get("string"));
			});
		});
	},
	"sub/2": function(x, a, env, emit){ jqRemplacer(x, a[0], a[1], { k: "lit", v: "" }, env, emit, false); },
	"sub/3": function(x, a, env, emit){ jqRemplacer(x, a[0], a[1], a[2], env, emit, false); },
	"gsub/2": function(x, a, env, emit){ jqRemplacer(x, a[0], a[1], { k: "lit", v: "" }, env, emit, true); },
	"gsub/3": function(x, a, env, emit){ jqRemplacer(x, a[0], a[1], a[2], env, emit, true); },
	"indices/1": function(x, a, env, emit){ jqEv(a[0], x, env, function(i){ emit(jqIndices(x, i)); }); },
	"index/1": function(x, a, env, emit){ jqEv(a[0], x, env, function(i){ var t = jqIndices(x, i); emit(t && t.length ? t[0] : null); }); },
	"rindex/1": function(x, a, env, emit){ jqEv(a[0], x, env, function(i){ var t = jqIndices(x, i); emit(t && t.length ? t[t.length - 1] : null); }); },
	"flatten/0": function(x, a, env, emit){ emit(jqAplatir(x, 1e9)); },
	"flatten/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(p){
			if (typeof p !== "number" || p < 0) throw new JqErreur("flatten depth must not be negative");
			emit(jqAplatir(x, p));
		});
	},
	"getpath/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(p){
			if (!Array.isArray(p)) throw new JqErreur("Path must be specified as an array");
			emit(jqLire(x, p));
		});
	},
	"setpath/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(p, v){
			if (!Array.isArray(p)) throw new JqErreur("Path must be specified as an array");
			emit(jqPoser(x, p, 0, v));
		});
	},
	"delpaths/1": function(x, a, env, emit){
		jqEv(a[0], x, env, function(ps){
			if (!Array.isArray(ps)) throw new JqErreur("Paths must be specified as an array");
			emit(jqSupprimerChemins(x, ps));
		});
	},
	"path/1": function(x, a, env, emit){ jqEvChemin(a[0], x, [], env, function(v, p){ emit(p); }); },
	"limit/2": function(x, a, env, emit){ jqLimite(x, a, env, emit, null); },
	"first/1": function(x, a, env, emit){ jqLimite(x, [{ k: "lit", v: 1 }, a[0]], env, emit, null); },
	"env/0": function(x, a, env, emit){ emit(jqEnvironnement()); },
	"input/0": function(x, a, env, emit){
		if (jqCtx.pos >= jqCtx.entrees.length) throw new JqErreur("No more inputs");
		emit(jqCtx.entrees[jqCtx.pos++].v);
	},
	"inputs/0": function(x, a, env, emit){
		while (jqCtx.pos < jqCtx.entrees.length){ jqTic(); emit(jqCtx.entrees[jqCtx.pos++].v); }
	},
	"input_filename/0": function(x, a, env, emit){ emit(jqCtx.courante ? jqCtx.courante.fichier : null); },
	"debug/0": function(x, a, env, emit){ jqCtx.io.err("[\"DEBUG:\"," + jqCompact(x) + "]"); emit(x); },
	"stderr/0": function(x, a, env, emit){ jqCtx.io.err(jqCompact(x)); emit(x); },
	"halt/0": function(){ throw { jqHalte: true, code: 0 }; },
	"halt_error/1": function(x, a, env){
		jqEv(a[0], x, env, function(code){
			if (typeof code !== "number") throw new JqErreur("halt_error/1: number required");
			throw { jqHalte: true, code: code, message: typeof x === "string" ? x : (x === null ? "" : jqCompact(x)) };
		});
	},
	"now/0": function(x, a, env, emit){ emit(Date.now() / 1000); },
	"tostream/0": function(x, a, env, emit){
		var parcourir = function(v, p, dernier){
			var conteneur = Array.isArray(v) || v instanceof Map;
			var vide = conteneur && (Array.isArray(v) ? v.length === 0 : v.size === 0);
			if (!conteneur || vide){ emit([p, v]); }
			else {
				var cles = Array.isArray(v) ? v.map(function(e, i){ return i; }) : Array.from(v.keys());
				cles.forEach(function(k, i){ parcourir(Array.isArray(v) ? v[k] : v.get(k), p.concat([k]), i === cles.length - 1); });
				emit([p.concat([cles[cles.length - 1]])]);
			}
		};
		parcourir(x, [], true);
	},
	"splits/1": function(x, a, env, emit){ JQ_NATIFS["splits/2"](x, [a[0], { k: "lit", v: null }], env, emit); },
	"splits/2": function(x, a, env, emit){
		jqProduit(a, x, env, function(re, dr){ jqDecouperRegex(x, re, dr).forEach(function(m){ emit(m); }); });
	},
	"builtins/0": function(x, a, env, emit){ emit(Object.keys(JQ_NATIFS).concat(Object.keys(jqBase().cles))); },
	"input_line_number/0": function(x, a, env, emit){ emit(jqCtx.courante ? jqCtx.courante.ligne : 0); }
};

function jqLimite(x, a, env, emit, chemin){
	jqEv(a[0], x, env, function(n){
		if (typeof n !== "number") throw new JqErreur("Invalid limit: must be a number");
		if (n === 0) return;
		var jeton = {}, compte = 0;
		var sortir = function(v, p){
			compte++;
			emit(v, p);
			if (n > 0 && compte >= n) throw jeton;
		};
		try {
			if (chemin) jqEvChemin(a[1], x, chemin, env, sortir);
			else jqEv(a[1], x, env, sortir);
		} catch (e){
			if (e !== jeton) throw e;
		}
	});
}

function jqAplatir(x, profondeur){
	if (!Array.isArray(x)) throw new JqErreur("Cannot iterate over " + jqDecrire(x));
	var res = [];
	x.forEach(function(v){
		if (Array.isArray(v) && profondeur > 0) res = res.concat(jqAplatir(v, profondeur - 1));
		else res.push(v);
	});
	return res;
}

function jqDecouperRegex(x, re, dr){
	if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be matched, as it is not a string");
	var r = jqRegex(re, dr), res = [], debut = 0;
	jqCorrespondances(x, r, true).forEach(function(m){
		var i = m.get("_index");
		res.push(x.substring(debut, i));
		debut = i + m.get("string").length;
	});
	res.push(x.substring(debut));
	return res;
}

/* sub et gsub : la chaîne de remplacement est un filtre, qui voit les captures nommées. */
function jqRemplacer(x, nRe, nRempl, nDrapeaux, env, emit, global){
	if (typeof x !== "string") throw new JqErreur(jqDecrire(x) + " cannot be matched, as it is not a string");
	jqEv(nDrapeaux, x, env, function(dr){
		jqEv(nRe, x, env, function(re){
			var r = jqRegex(re, (dr || "") + (global ? "g" : ""));
			var ms = jqCorrespondances(x, r, r.global);
			var resultats = [""], debut = 0;
			ms.forEach(function(m){
				var avant = x.substring(debut, m.get("_index"));
				var remplacements = jqToutes(nRempl, jqCaptureObjet(m), env);
				var suite = [];
				resultats.forEach(function(r0){
					remplacements.forEach(function(rem){
						if (typeof rem !== "string") throw new JqErreur(jqDecrire(rem) + " cannot be added to a string");
						suite.push(r0 + avant + rem);
					});
				});
				resultats = suite;
				debut = m.get("_index") + m.get("string").length;
			});
			resultats.forEach(function(r0){ emit(r0 + x.substring(debut)); });
		});
	});
}

/* Les fonctions qui savent aussi dire « où » (path, del, |=). */
var JQ_NATIFS_CHEMIN = {
	"empty/0": function(){},
	"error/0": function(x){ throw new JqErreur(x); },
	"error/1": function(x, p, a, env){ jqEv(a[0], x, env, function(m){ throw new JqErreur(m); }); },
	"getpath/1": function(x, p, a, env, emit){
		jqEv(a[0], x, env, function(q){
			if (!Array.isArray(q)) throw new JqErreur("Path must be specified as an array");
			emit(jqLire(x, q), p.concat(q));
		});
	},
	"limit/2": function(x, p, a, env, emit){ jqLimite(x, a, env, emit, p); },
	"first/1": function(x, p, a, env, emit){ jqLimite(x, [{ k: "lit", v: 1 }, a[0]], env, emit, p); }
};

/* Les fonctions écrites en jq lui-même, comme dans le vrai jq. */
var JQ_DEFINITIONS = [
	"def map(f): [.[] | f];",
	"def select(f): if f then . else empty end;",
	"def recurse(f): def r: ., (f | r); r;",
	"def recurse(f; cond): def r: ., (f | select(cond) | r); r;",
	"def recurse: recurse(.[]?);",
	"def values: select(. != null);",
	"def nulls: select(. == null);",
	"def booleans: select(type == \"boolean\");",
	"def numbers: select(type == \"number\");",
	"def strings: select(type == \"string\");",
	"def arrays: select(type == \"array\");",
	"def objects: select(type == \"object\");",
	"def iterables: select(type | . == \"array\" or . == \"object\");",
	"def scalars: select(type | . != \"array\" and . != \"object\");",
	"def finites: select(isinfinite or isnan | not);",
	"def normals: select(isnormal);",
	"def map_values(f): .[] |= f;",
	"def to_entries: [keys_unsorted[] as $k | {key: $k, value: .[$k]}];",
	// Comme jq 1.7 : la clé est .key, .Key, .name ou .Name (sans conversion), la valeur .value ou .Value.
	"def from_entries: reduce .[] as $x ({}; . + { ($x | .key // .Key // .name // .Name): ($x | if has(\"value\") then .value else .Value end) });",
	"def with_entries(f): to_entries | map(f) | from_entries;",
	"def any: reduce .[] as $x (false; . or $x);",
	"def all: reduce .[] as $x (true; . and $x);",
	"def any(f): reduce (.[] | f) as $x (false; . or $x);",
	"def all(f): reduce (.[] | f) as $x (true; . and $x);",
	"def isempty(g): first((g | false), true);",
	"def any(g; cond): isempty(first(g | cond or empty)) | not;",
	"def all(g; cond): isempty(first(g | cond and empty));",
	"def range($x): range(0; $x);",
	"def in(xs): . as $x | xs | has($x);",
	"def inside(xs): . as $x | xs | contains($x);",
	"def first: .[0];",
	"def last: .[-1];",
	"def nth($n): .[$n];",
	"def last(f): reduce f as $x (null; $x);",
	"def nth($n; f): if $n < 0 then error(\"Out of bounds negative array index\") else last(limit($n + 1; f)) end;",
	"def until(cond; update): def _until: if cond then . else (update | _until) end; _until;",
	"def while(cond; update): def _while: if cond then ., (update | _while) else empty end; _while;",
	"def repeat(f): def _repeat: ., (f | _repeat); _repeat;",
	"def paths: path(..) | select(length > 0);",
	"def paths(node_filter): . as $dot | paths | select(. as $p | $dot | getpath($p) | node_filter);",
	"def del(f): delpaths([path(f)]);",
	"def toarray: if type == \"array\" then . else [.] end;",
	"def walk(f): def w: if type == \"object\" then map_values(w) elif type == \"array\" then map(w) else . end | f; w;",
	"def pick(pathexps): . as $top | reduce path(pathexps) as $p (null; setpath($p; $top | getpath($p)));",
	"def debug(msg): (msg | debug | empty), .;",
	"def transpose: if . == [] then [] else . as $in | (map(length) | max) as $max | [range(0; $max) as $j | [range(0; $in | length) as $i | $in[$i][$j]]] end;",
	"def IN(s): any(s == .; .);",
	"def IN(src; s): any(src == s; .);",
	"def INDEX(stream; idx_expr): reduce stream as $row ({}; .[$row | idx_expr | tostring] |= $row);",
	"def INDEX(idx_expr): INDEX(.[]; idx_expr);",
	"def combinations: if length == 0 then [] else .[0][] as $x | (.[1:] | combinations) as $w | [$x] + $w end;",
	"def combinations(n): . as $dot | [range(n)] | map($dot) | combinations;",
	"def add(f): reduce f as $x (null; . + $x);",
	"def halt_error: halt_error(5);"
].join("\n");

/* L'environnement de départ : les fonctions écrites en jq, déjà définies. */
var JQ_BASE = null;
function jqBase(){
	if (JQ_BASE) return JQ_BASE;
	var arbre = jqAnalyser(JQ_DEFINITIONS + "\n.");
	var env = { v: {}, f: {} }, cles = {};
	while (arbre.k === "def"){
		var f2 = Object.create(env.f);
		var def = { params: arbre.params, corps: arbre.corps, env: null };
		f2[arbre.nom + "/" + arbre.params.length] = def;
		cles[arbre.nom + "/" + arbre.params.length] = true;
		env = { v: env.v, f: f2 };
		def.env = env;
		arbre = arbre.suite;
	}
	JQ_BASE = { env: env, cles: cles };
	return JQ_BASE;
}

/* $ENV et env : les variables d'environnement du joueur. */
function jqEnvironnement(){
	var m = new Map();
	["HOME", "USER", "LOGNAME", "PWD", "SHELL", "HOSTNAME", "PATH", "LANG"].forEach(function(k){
		var v = k === "HOME" ? "/home/" + JOUEUR : (k === "SHELL" ? "/bin/bash" : (k === "PATH" ? "/usr/local/bin:/usr/bin:/bin" : (k === "LANG" ? "fr_FR.UTF-8" : Shell.variable(k))));
		m.set(k, v);
	});
	for (var cle in state.env){ if (state.env.hasOwnProperty(cle)) m.set(cle, String(state.env[cle])); }
	return m;
}

/* Vérifie, avant tout calcul, que chaque fonction et chaque variable existent. */
function jqVerifier(n, portee, erreurs){
	if (!n || typeof n !== "object") return;
	var voir = function(m, p){ jqVerifier(m, p || portee, erreurs); };
	switch (n.k){
	case "appel":
		var cle = n.nom + "/" + n.args.length;
		if (!(cle in portee.f) && !JQ_NATIFS[cle]) erreurs.push({ message: cle + " is not defined", pos: n.pos });
		n.args.forEach(function(a){ voir(a); });
		return;
	case "var":
		if (!(n.nom in portee.v)) erreurs.push({ message: "$" + n.nom + " is not defined", pos: n.pos });
		return;
	case "casse":
		if (!(("*label*" + n.nom) in portee.v)) erreurs.push({ message: "$*label-" + n.nom + " is not defined", pos: n.pos });
		return;
	case "def":
		var avecSoi = { f: Object.create(portee.f), v: portee.v };
		avecSoi.f[n.nom + "/" + n.params.length] = true;
		var dedans = { f: Object.create(avecSoi.f), v: Object.create(portee.v) };
		n.params.forEach(function(p){ dedans.f[p.nom + "/0"] = true; if (p.valeur) dedans.v[p.nom] = true; });
		voir(n.corps, dedans);
		voir(n.suite, avecSoi);
		return;
	case "comme":
	case "reduce":
	case "foreach":
		voir(n.src);
		var lie = { f: portee.f, v: Object.create(portee.v) };
		var motifs = [n.motif];
		while (motifs.length){
			var m = motifs.pop();
			if (m.variable !== undefined) lie.v[m.variable] = true;
			if (m.tableau) motifs = motifs.concat(m.tableau);
			if (m.objet) m.objet.forEach(function(c){ voir(c.cle); motifs.push(c.motif); });
		}
		if (n.k === "comme"){ voir(n.corps, lie); return; }
		voir(n.init);
		voir(n.maj, lie);
		if (n.extrait) voir(n.extrait, lie);
		return;
	case "etiquette":
		var avecLabel = { f: portee.f, v: Object.create(portee.v) };
		avecLabel.v["*label*" + n.nom] = true;
		voir(n.corps, avecLabel);
		return;
	case "chaine": n.parts.forEach(function(p){ if (typeof p !== "string") voir(p); }); return;
	case "objet": n.champs.forEach(function(c){ voir(c.cle); voir(c.val); }); return;
	case "si": n.conds.forEach(function(c){ voir(c.c); voir(c.alors); }); voir(n.sinon); return;
	}
	["cible", "cle", "de", "a", "b", "e", "corps", "attrape"].forEach(function(champ){ if (n[champ]) voir(n[champ]); });
}

/* Compile le filtre : renvoie l'arbre, ou lève une ShellError au format de jq (code 3). */
function jqCompiler(filtre, variables, io){
	var ligneDe = function(pos){ return filtre.substring(0, pos).split("\n").length; };
	/* jq recopie la ligne fautive, suivie d'autant d'espaces que la colonne de la faute
	   (la fin du filtre compte comme son dernier caractère). */
	var citer = function(pos){
		pos = Math.max(0, Math.min(pos || 0, filtre.length - 1));
		var debut = filtre.lastIndexOf("\n", pos - 1) + 1, fin = filtre.indexOf("\n", pos);
		return filtre.substring(debut, fin === -1 ? filtre.length : fin) + new Array(pos - debut + 1).join(" ");
	};
	var pied = io.tty ? "\n" + C.gris("(Un filtre jq s'écrit entre apostrophes : jq '.nom' fichier.json. man jq pour la syntaxe.)") : "";
	var arbre;
	try {
		arbre = jqAnalyser(filtre);
	} catch (e){
		if (!(e instanceof JqSyntaxe)) throw e;
		var msg = "jq: error: syntax error, " + e.message + " (Unix shell quoting issues?) at <top-level>, line " + ligneDe(e.pos) + ":\n" + citer(e.pos);
		if (/^\s*if\b/.test(filtre) && !/\bend\b/.test(filtre)) msg += "\njq: error: Possibly unterminated 'if' statement at <top-level>, line 1:\n" + citer(filtre.indexOf("if")) + "\njq: 2 compile errors";
		else msg += "\njq: 1 compile error";
		throw new ShellError(msg + pied, 3);
	}
	var base = jqBase();
	var portee = { f: Object.create(base.cles), v: { ENV: true } };
	Object.keys(variables).forEach(function(k){ portee.v[k] = true; });
	var erreurs = [];
	jqVerifier(arbre, portee, erreurs);
	if (erreurs.length){
		throw new ShellError(erreurs.map(function(e){ return "jq: error: " + e.message + " at <top-level>, line " + ligneDe(e.pos || 0) + ":\n" + citer(e.pos); }).join("\n") +
			"\njq: " + erreurs.length + " compile error" + (erreurs.length > 1 ? "s" : "") + pied, 3);
	}
	return arbre;
}

var JQ_AIDE = "Usage:\tjq [OPTIONS] FILTER [FILES...]\n\tjq [OPTIONS] --args FILTER [ARGUMENTS...]\n\n" +
	"jq is a tool for processing JSON inputs, applying the given filter to\nits JSON text inputs and producing the filter's results as JSON on\nstandard output.\n\n" +
	"Use jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq";
var JQ_RENVOI = "Use jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq";

Shell.sorts.jq = function(args, io){
	var o = { r: false, j: false, c: false, n: false, s: false, e: false, S: false, R: false, a: false, indent: 2, couleurs: io.tty };
	var variables = {}, filtre = null, fichiers = [], i;
	var usage = function(message){ throw new ShellError("jq: " + message + "\n" + JQ_RENVOI, 2); };
	for (i = 0; i < args.length; i++){
		var a = args[i];
		if (filtre !== null && (a.charAt(0) !== "-" || a === "-")){ fichiers.push(a); continue; }
		if (a === "--arg" || a === "--argjson"){
			if (args[i + 2] === undefined) usage(a + " takes two parameters (e.g. " + a + " varname " + (a === "--arg" ? "value" : "text") + ")");
			if (a === "--arg") variables[args[i + 1]] = args[i + 2];
			else {
				var lu = jqLireUn(args[i + 2]);
				if (lu.erreur) usage("invalid JSON text passed to --argjson");
				variables[args[i + 1]] = lu.v;
			}
			i += 2;
			continue;
		}
		if (a === "--indent"){
			var nb = parseInt(args[i + 1], 10);
			if (isNaN(nb) || nb < 0 || nb > 7) usage("Cannot indent more than 7 characters");
			o.indent = nb;
			i++;
			continue;
		}
		var longues = { "--raw-output": "r", "--join-output": "j", "--compact-output": "c", "--null-input": "n", "--slurp": "s",
			"--exit-status": "e", "--sort-keys": "S", "--raw-input": "R", "--ascii-output": "a", "--color-output": "C", "--monochrome-output": "M", "--tab": "tab" };
		if (longues.hasOwnProperty(a)){ a = longues[a] === "tab" ? "--tab" : "-" + longues[a]; }
		if (a === "--tab"){ o.indent = "\t"; continue; }
		if (/^-[a-zA-Z]+$/.test(a)){
			for (var l = 1; l < a.length; l++){
				var lettre = a.charAt(l);
				if ("rjcnseSRa".indexOf(lettre) > -1) o[lettre] = true;
				else if (lettre === "C") o.couleurs = true;
				else if (lettre === "M") o.couleurs = false;
				else if (lettre === "h") return JQ_AIDE;
				else usage("Unknown option -" + lettre);
			}
			continue;
		}
		if (a.substring(0, 2) === "--") usage("Unknown option " + a);
		if (filtre === null) filtre = a; else fichiers.push(a);
	}
	if (o.j) o.r = true;
	if (o.c) o.indent = 0;
	if (filtre === null){
		if (io.stdin !== null && fichiers.length === 0) filtre = ".";
		else throw new ShellError(JQ_AIDE + (io.tty ? "\n" + C.gris("(Il manque le filtre : jq '.' fichier.json affiche le JSON joliment, jq '.nom' en extrait un champ.)") : ""), 2);
	}
	var arbre = jqCompiler(filtre, variables, io);
	// Les entrées : les fichiers nommés, ou l'entrée standard.
	var sources = [], code = 0;
	if (fichiers.length){
		fichiers.forEach(function(f){
			if (f === "-"){ sources.push({ nom: "<stdin>", texte: entreeExacte(io) }); return; }
			try {
				sources.push({ nom: f, texte: texteExact(f, io, "jq") });
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				io.err("jq: error: Could not open file " + f + ": " + (/Permission/.test(e.message) ? "Permission denied" : (/c'est un lieu/.test(e.message) ? "Is a directory" : "No such file or directory")));
				code = 2;
			}
		});
	} else if (o.n){
		if (io.stdin !== null) sources.push({ nom: "<stdin>", texte: entreeExacte(io) });
	} else {
		if (io.stdin === null){
			throw new ShellError("jq : quel JSON dois-je lire ? Utilisation : jq FILTRE FICHIER.json, ou commande | jq FILTRE\n" +
				C.gris("(Exemple : jq '.nom' fiche.json, ou cat fiche.json | jq .)"));
		}
		sources.push({ nom: "<stdin>", texte: entreeExacte(io) });
	}
	var entrees = [], erreurLecture = null;
	sources.forEach(function(s){
		if (erreurLecture) return;
		if (o.R){
			if (o.s){ entrees.push({ v: s.texte, ligne: lignesDe(s.texte).length, fichier: s.nom, lieu: s.nom }); return; }
			lignesDe(s.texte).forEach(function(l, k){ entrees.push({ v: l, ligne: k + 1, fichier: s.nom, lieu: s.nom }); });
			return;
		}
		var flux = jqLireFlux(s.texte);
		flux.valeurs.forEach(function(e){ entrees.push({ v: e.v, ligne: e.ligne, fichier: s.nom, lieu: s.nom }); });
		if (flux.erreur) erreurLecture = "jq: parse error: " + flux.erreur;
	});
	if (o.R && o.s && entrees.length > 1){
		entrees = [{ v: entrees.map(function(e){ return e.v; }).join(""), ligne: 0, fichier: null, lieu: "<stdin>" }];
	}
	if (o.s && !o.R){
		var dernierLieu = entrees.length ? entrees[entrees.length - 1] : { ligne: 0, lieu: "<stdin>" };
		entrees = [{ v: entrees.map(function(e){ return e.v; }), ligne: dernierLieu.ligne, fichier: null, lieu: dernierLieu.lieu }];
		if (erreurLecture){ entrees = []; }
	}
	var base = jqBase();
	var env = { v: Object.create(base.env.v), f: base.env.f };
	env.v.ENV = jqEnvironnement();
	Object.keys(variables).forEach(function(k){ env.v[k] = variables[k]; });
	var sorties = [], dernier, aSorti = false, enErreur = false, arrete = false;
	var precedent = jqCtx;
	jqCtx = { pas: 0, entrees: entrees, pos: 0, io: io, courante: null };
	var formater = function(v){
		if (o.r && typeof v === "string") return o.a ? jqChaine(v, true).slice(1, -1) : v;
		return jqEnJson(v, { indent: o.indent, tri: o.S, couleurs: o.couleurs && !o.r, ascii: o.a });
	};
	var sortir = function(v){
		if (sorties.length >= JQ_SORTIES_MAX) throw new JqArret("plus de " + JQ_SORTIES_MAX + " résultats, j'arrête l'affichage");
		sorties.push(formater(v));
		dernier = v;
		aSorti = true;
	};
	var lancer = function(entree){
		jqCtx.courante = entree;
		enErreur = false;
		try {
			jqEv(arbre, entree.v, env, sortir);
		} catch (e){
			if (e instanceof JqTraversee) e = e.erreur;
			if (e instanceof JqErreur){
				var v = e.valeur, lieu = o.n || entree.lieu === undefined ? "<unknown>" : entree.lieu + ":" + entree.ligne;
				io.err("jq: error (at " + lieu + ")" + (typeof v === "string" ? ": " + v : " (not a string): " + jqCompact(v)));
				code = 5;
				enErreur = true;
				return true;
			}
			if (e && e.jqHalte){
				if (e.message !== undefined && e.message !== "") io.err(e.message.replace(/\n$/, ""));
				code = e.code;
				arrete = true;
				return false;
			}
			// La pile qui déborde s'appelle RangeError dans Chrome et node, InternalError dans Firefox.
			var debordement = e instanceof RangeError || (e && e.name === "InternalError" && /recursion/i.test(e.message || ""));
			if (e instanceof JqArret || debordement){
				io.err("jq : " + (debordement ? "récursion trop profonde, j'arrête là" : e.message));
				code = 5;
				enErreur = true;
				return false;
			}
			throw e;
		}
		return true;
	};
	try {
		if (o.n) lancer({ v: null, lieu: undefined, ligne: 0 });
		else {
			while (jqCtx.pos < jqCtx.entrees.length){
				if (!lancer(jqCtx.entrees[jqCtx.pos++])) break;
			}
		}
	} finally {
		jqCtx = precedent;
	}
	// Comme jq 1.7 : une entrée illisible donne le code 5 ; sinon, c'est la dernière entrée qui décide.
	if (erreurLecture){
		io.err(erreurLecture);
		code = 5;
	}
	if (o.e && code === 0) code = !aSorti ? 4 : (jqVrai(dernier) ? 0 : 1);
	else if (code === 5 && !enErreur && !arrete && !erreurLecture) code = 0;
	if (code) io.code = code;
	GameEvents.fire({ type: "jq", filtre: filtre, fichier: fichiers.length ? fichiers[0] : null, fichiers: fichiers, options: o,
		nombre: sorties.length, sortie: sorties.map(sansAnsi).join("\n"), code: code, room: current_room });
	return sorties.join(o.j ? "" : "\n");
};

/*
 * Pour les quêtes : applique un filtre jq à un texte JSON sans rien afficher (aucun événement non plus).
 * variables : { nom: valeur } comme --arg. Renvoie { sorties: [textes JSON compacts], erreur: message ou null }.
 * Exemple : jqAppliquer(".[] | .nom", objet.getText()).sorties
 */
function jqAppliquer(filtre, texte, variables){
	variables = variables || {};
	var res = { sorties: [], erreur: null }, arbre;
	try {
		arbre = jqCompiler(filtre, variables, { tty: false });
	} catch (e){
		if (e instanceof ShellError){ res.erreur = e.message; return res; }
		throw e;
	}
	var flux = jqLireFlux(contenuExact(String(texte), false));
	if (flux.erreur) res.erreur = "jq: parse error: " + flux.erreur;
	var base = jqBase(), env = { v: Object.create(base.env.v), f: base.env.f };
	env.v.ENV = jqEnvironnement();
	Object.keys(variables).forEach(function(k){ env.v[k] = variables[k]; });
	var precedent = jqCtx;
	jqCtx = { pas: 0, entrees: flux.valeurs, pos: 0, io: { err: function(){} }, courante: null };
	try {
		while (jqCtx.pos < jqCtx.entrees.length){
			var entree = jqCtx.entrees[jqCtx.pos++];
			jqCtx.courante = entree;
			jqEv(arbre, entree.v, env, function(v){
				if (res.sorties.length >= JQ_SORTIES_MAX) throw new JqArret("trop de résultats");
				res.sorties.push(jqCompact(v));
			});
		}
	} catch (e){
		if (e instanceof JqTraversee) e = e.erreur;
		if (e instanceof JqErreur) res.erreur = typeof e.valeur === "string" ? e.valeur : jqCompact(e.valeur);
		else if (e instanceof JqArret || e instanceof RangeError) res.erreur = e.message || "arrêt";
		else if (e && e.jqHalte) res.erreur = e.message || "halt";
		else throw e;
	} finally {
		jqCtx = precedent;
	}
	return res;
}

/* ================================================================== */
/* xargs : transformer un flot de lignes en arguments                  */
/* ================================================================== */

var XARGS_LANCEMENTS_MAX = 500;

/* « \n », « \t », « \\ », « \0 » écrits en toutes lettres dans une option. */
function sequencesEchappees(texte){
	var table = { n: "\n", t: "\t", "\\": "\\", "0": "\u0000", r: "\r" };
	return texte.replace(/\\(.)/g, function(tout, c){ return table.hasOwnProperty(c) ? table[c] : c; });
}

/* Découpe l'entrée comme xargs : blancs, guillemets et barres obliques inverses. */
function motsXargs(texte, io){
	var mots = [], mot = null, i = 0, n = texte.length;
	while (i < n){
		var c = texte.charAt(i);
		if (/\s/.test(c)){ if (mot !== null){ mots.push(mot); mot = null; } i++; continue; }
		if (c === "'" || c === "\""){
			var fin = texte.indexOf(c, i + 1);
			var ligne = texte.indexOf("\n", i + 1);
			if (fin === -1 || (ligne > -1 && ligne < fin)){
				throw new ShellError("xargs: unmatched " + (c === "'" ? "single" : "double") + " quote; by default quotes are special to xargs unless you use the -0 option" +
					astuce(io, "Pour xargs, une apostrophe ouvre une citation. Avec des noms qui en contiennent : find ... -print0 | xargs -0, ou xargs -d '\\n'."));
			}
			mot = (mot || "") + texte.substring(i + 1, fin);
			i = fin + 1;
			continue;
		}
		if (c === "\\" && i + 1 < n){ mot = (mot || "") + texte.charAt(i + 1); i += 2; continue; }
		mot = (mot || "") + c;
		i++;
	}
	if (mot !== null) mots.push(mot);
	return mots;
}

Shell.sorts.xargs = function(args, io){
	var o = { n: null, I: null, L: null, t: false, r: false, zero: false, d: null };
	var i = 0;
	var usage = function(message){
		throw new ShellError("xargs: " + message + "\nUsage: xargs [OPTION]... COMMAND [INITIAL-ARGS]..." +
			astuce(io, "man xargs : les options de ce monde sont -n N, -I {}, -L N, -d SÉP, -0, -t, -r."));
	};
	// Les options s'arrêtent au premier mot qui n'en est pas une : c'est le début de la commande.
	for (; i < args.length; i++){
		var a = args[i];
		if (a === "--"){ i++; break; }
		if (a.charAt(0) !== "-" || a === "-") break;
		var longue = /^--(null|verbose|no-run-if-empty|max-args|replace|delimiter|max-lines)(?:=(.*))?$/.exec(a);
		if (longue){
			var cle = { "null": "0", verbose: "t", "no-run-if-empty": "r", "max-args": "n", replace: "I", delimiter: "d", "max-lines": "L" }[longue[1]];
			if ("ndL".indexOf(cle) > -1 && longue[2] === undefined) usage("option '--" + longue[1] + "' requires an argument");
			a = "-" + cle + (longue[2] !== undefined ? longue[2] : (cle === "I" ? "{}" : ""));
		}
		var m = /^-([nIdLsP])(.*)$/.exec(a);
		if (m){
			var valeur = m[2] !== "" ? m[2] : args[++i];
			if (valeur === undefined) usage("option requires an argument -- '" + m[1] + "'");
			if (m[1] === "n" || m[1] === "L"){
				if (!/^\d+$/.test(valeur) || parseInt(valeur, 10) < 1) usage("value " + valeur + " for -" + m[1] + " option should be >= 1");
				o[m[1]] = parseInt(valeur, 10);
			} else if (m[1] === "I") o.I = valeur;
			else if (m[1] === "d"){
				var d = sequencesEchappees(valeur);
				if (d.length !== 1) usage("invalid input delimiter specification " + valeur + ": the delimiter must be either a single character or an escape sequence starting with \\.");
				o.d = d;
			}
			// -s (taille maximale) et -P (en parallèle) n'ont pas de sens ici : acceptés, sans effet.
			continue;
		}
		if (a === "-i"){ o.I = "{}"; continue; }
		if (/^-[tr0px]+$/.test(a)){
			for (var l = 1; l < a.length; l++){
				var lettre = a.charAt(l);
				if (lettre === "t") o.t = true;
				else if (lettre === "r") o.r = true;
				else if (lettre === "0") o.zero = true;
				else if (lettre === "p") usage("-p demande une confirmation pour chaque commande, ce que ce monde ne sait pas faire (essaie -t)");
			}
			continue;
		}
		usage("invalid option -- '" + a.charAt(1) + "'");
	}
	var commande = args.slice(i);
	if (commande.length === 0) commande = ["echo"];
	if (io.stdin === null){
		throw new ShellError("xargs : il lit ses arguments sur l'entrée standard : il faut un tuyau." +
			astuce(io, "Exemple : find . -name \"*.tmp\" | xargs rm, ou cat liste.txt | xargs -n 1 echo"));
	}
	var texte = io.stdin;
	// Les éléments à passer en arguments.
	var elements, groupes = null;
	if (o.zero) elements = texte.split("\u0000");
	else if (o.d !== null) elements = texte.split(o.d);
	else if (o.I !== null) elements = lignesDe(texte).map(function(ligne){ return ligne.replace(/^\s+/, ""); });
	else if (o.L !== null) groupes = lignesDe(texte).map(function(l){ return motsXargs(l, io); }).filter(function(g){ return g.length > 0; });
	else elements = motsXargs(texte, io);
	if (elements && (o.zero || o.d !== null) && elements.length && elements[elements.length - 1] === "") elements.pop();
	if (elements && o.I !== null) elements = elements.filter(function(e){ return e !== ""; });
	// Les lancements à faire.
	var lancements = [];
	if (o.I !== null){
		elements.forEach(function(e){ lancements.push(commande.map(function(mot){ return mot.split(o.I).join(e); })); });
	} else if (groupes !== null){
		for (var g = 0; g < groupes.length; g += o.L){
			lancements.push(commande.concat([].concat.apply([], groupes.slice(g, g + o.L))));
		}
	} else if (o.n !== null){
		for (var k = 0; k < elements.length; k += o.n) lancements.push(commande.concat(elements.slice(k, k + o.n)));
	} else if (elements.length){
		lancements.push(commande.concat(elements));
	}
	// Rien à lire : xargs lance quand même la commande une fois, sans argument (sauf avec -r).
	if (lancements.length === 0 && !o.r && o.I === null) lancements.push(commande.slice());
	if (lancements.length > XARGS_LANCEMENTS_MAX){
		throw new ShellError("xargs : " + lancements.length + " lancements demandés : au-delà de " + XARGS_LANCEMENTS_MAX + ", j'arrête avant d'épuiser le monde." +
			astuce(io, "Regroupe les arguments : sans -n ni -I, xargs passe tout à une seule commande."));
	}
	var sorties = [], code = 0;
	for (var x = 0; x < lancements.length; x++){
		var argv = lancements[x];
		// -t : chaque commande est écrite sur la sortie d'erreur avant d'être lancée.
		if (o.t) io.err(argv.join(" "));
		try {
			var r = Shell.lancerSousCommande(argv, io, "xargs");
			// echo "" écrit une ligne vide : on la garde.
			if (r.sortie !== "" || argv[argv[0] === "sudo" ? 1 : 0] === "echo") sorties.push(r.sortie);
			if (r.code) code = 123;
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
			io.err(e.message);
			code = 123;
			// Une commande introuvable arrête tout (code 127), comme le vrai xargs.
			var nom = argv[0] === "sudo" ? argv[1] : argv[0];
			if (!nom || (!Shell.sorts.hasOwnProperty(nom) && nom.indexOf("/") === -1) || (SORTS_DU_JEU.indexOf(nom) === -1 && !state.knows(nom))){ code = 127; break; }
		}
	}
	if (code) io.code = code;
	GameEvents.fire({ type: "xargs", cmd: commande[0] === "sudo" ? commande[1] : commande[0], commande: commande.slice(), lancements: lancements,
		sudo: !!io.sudo || commande[0] === "sudo", room: current_room });
	return sorties.join("\n");
};

/* ================================================================== */
/* find : l'expression complète (tests, actions, -o, !, parenthèses)   */
/* ================================================================== */

/* L'âge d'un objet en minutes : ceux du monde ont 40 jours, ceux créés pendant la partie, quelques minutes. */
function ageEnMinutes(noeud){
	var jours = noeud.age === undefined ? 40 : noeud.age;
	var h = /^(\d\d):(\d\d)/.exec(noeud.heure || "09:00");
	var d = new Date();
	var ecart = d.getHours() * 60 + d.getMinutes() - (parseInt(h[1], 10) * 60 + parseInt(h[2], 10));
	return Math.max(0, jours * 1440 + ecart);
}
function ageEnJours(noeud){ return noeud.age === undefined ? 40 : noeud.age; }

/* « -5 », « +3 », « 2 » : moins de, plus de, exactement. */
function comparaisonNumerique(texte, critere, exemple){
	var m = /^([+-]?)(\d+)$/.exec(texte || "");
	if (!m) throw new ShellError("find : " + critere + " attend un nombre, par exemple " + exemple);
	var n = parseInt(m[2], 10);
	return function(v){ return m[1] === "-" ? v < n : (m[1] === "+" ? v > n : v === n); };
}

/* -newermt : la date d'un objet, comme une clé « AAAAMMJJhhmmss » comparable, à l'heure de la machine où l'on est. */
function maintenantFind(){
	var h = typeof machineIci === "function" ? machineIci() : null;
	return h ? maintenantMachine(h) : Date.now();
}
function cleDeDateFind(texte){
	var m = /^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?$/.exec(String(texte).trim());
	if (!m) return null;
	return m[1] + m[2] + m[3] + (m[4] || "00") + (m[5] || "00") + (m[6] || "00");
}
function cleDeDateNoeud(noeud){
	var h = typeof machineIci === "function" ? machineIci() : null;
	var ms = noeud.mtimeMs !== undefined ? noeud.mtimeMs : maintenantFind() - ageEnMinutes(noeud) * 60000;
	var d = h ? dateMachine(h, ms) : new Date(ms);
	function n2(x){ return (x < 10 ? "0" : "") + x; }
	return d.getFullYear() + n2(d.getMonth() + 1) + n2(d.getDate()) + n2(d.getHours()) + n2(d.getMinutes()) + n2(d.getSeconds());
}

Shell.sorts.find = function(args, io){
	var departs = [], i = 0;
	while (i < args.length && args[i].charAt(0) !== "-" && args[i] !== "!" && args[i] !== "(" && args[i] !== ")"){ departs.push(args[i]); i++; }
	if (departs.length === 0) departs = ["."];
	var jetons = args.slice(i), k = 0, action = false;
	var options = { maxdepth: Infinity, mindepth: 0, depth: false };
	var execsGroupes = [];
	var CONNUS = "-name, -iname, -path, -type, -xtype, -user, -perm, -mtime, -mmin, -newer, -newermt, -size, -empty, -maxdepth, -mindepth, -print, -print0, -exec, -delete, -prune, -o, !, \\( \\)";
	function valeur(nom, exemple){
		if (jetons[k] === undefined) throw new ShellError("find : " + nom + " attend une valeur, par exemple : " + exemple);
		return jetons[k++];
	}
	function ou(){
		var g = et();
		while (jetons[k] === "-o" || jetons[k] === "-or"){ k++; g = { ou: [g, et()] }; }
		return g;
	}
	function et(){
		var g = non();
		while (k < jetons.length && jetons[k] !== "-o" && jetons[k] !== "-or" && jetons[k] !== ")"){
			if (jetons[k] === "-a" || jetons[k] === "-and") k++;
			g = { et: [g, non()] };
		}
		return g;
	}
	function non(){
		if (jetons[k] === "!" || jetons[k] === "-not"){ k++; return { non: non() }; }
		return primaire();
	}
	function primaire(){
		var t = jetons[k++];
		if (t === undefined) throw new ShellError("find : l'expression s'arrête au milieu (après -o, ! ou « ( » il faut un critère)");
		var v, test = null;
		switch (t){
		case "(":
			var e = ou();
			if (jetons[k] !== ")") throw new ShellError("find : il manque la parenthèse fermante « \\) »\n" + C.gris("(Dans le terminal, les parenthèses se protègent : find . \\( -name \"*.log\" -o -name \"*.tmp\" \\))"));
			k++;
			return e;
		case ")": throw new ShellError("find : parenthèse fermante « ) » sans parenthèse ouvrante");
		case "-name":
		case "-iname":
			v = valeur(t, "find . " + t + " \"flag*\"");
			var re = motifVersRegExp(v, t === "-iname" ? "i" : "");
			return { test: function(c){ return re.test(c.nom); } };
		case "-path":
		case "-wholename":
			v = valeur(t, "find . -path \"*/journaux/*\"");
			var reChemin = motifVersRegExp(v, "");
			return { test: function(c){ return reChemin.test(sansAnsi(c.chemin)); } };
		case "-type":
			v = valeur("-type", "-type f");
			if (["d", "f", "l"].indexOf(v) === -1) throw new ShellError("find : -type attend d (les lieux), f (les objets) ou l (les raccourcis)");
			return { test: function(c){ return v === "d" ? c.estLieu : (v === "l" ? !c.estLieu && !!c.noeud.lien : !c.estLieu && !c.noeud.lien); } };
		case "-user":
			v = valeur("-user", "find . -user root");
			return { test: function(c){ return c.noeud.owner === v; } };
		case "-perm":
			var perm = lirePerm(jetons[k]);
			k++;
			return { test: function(c){ return perm(modeEnNombre(c.noeud.mode)); } };
		case "-mtime":
			if (!/^[+-]?\d+$/.test(jetons[k] || "")) throw new ShellError("find : -mtime attend un nombre de jours, par exemple -mtime -1 (modifié il y a moins d'un jour)");
			var jours = comparaisonNumerique(valeur("-mtime", "-mtime -1"), "-mtime", "-mtime -1");
			return { test: function(c){ return !c.estLieu && jours(ageEnJours(c.noeud)); } };
		case "-mmin":
			var minutes = comparaisonNumerique(valeur("-mmin", "-mmin -10"), "-mmin", "-mmin -10 (modifié il y a moins de 10 minutes)");
			return { test: function(c){ return !c.estLieu && minutes(ageEnMinutes(c.noeud)); } };
		case "-newer":
			var reference = Shell.chercher(jetons[k] || "", io, "find");
			k++;
			if (!(reference.node instanceof Item)) throw new ShellError("find : -newer attend un objet qui existe");
			var ref = reference.node;
			return { test: function(c){
				if (c.estLieu) return false;
				var a = ageEnJours(c.noeud), ar = ageEnJours(ref);
				return a < ar || (a === ar && (c.noeud.heure || "09:00") > (ref.heure || "09:00"));
			} };
		case "-xtype":
			v = valeur("-xtype", "-xtype l");
			if (["d", "f", "l"].indexOf(v) === -1) throw new ShellError("find : -xtype attend d, f ou l");
			return { test: function(c){
				if (c.estLieu) return v === "d";
				if (!c.noeud.lien) return v === "f";
				// -xtype regarde la cible du lien : l si la cible n'existe pas (un lien cassé).
				var cible = null;
				try { cible = Shell.suivre(c.noeud, "find"); } catch (e){ cible = null; }
				if (!cible || cible === c.noeud) return v === "l";
				return v === (cible instanceof Room ? "d" : "f");
			} };
		case "-newermt":
			v = valeur("-newermt", "find . -newermt \"2026-10-15 12:00\"");
			var cible = cleDeDateFind(v);
			if (!cible) throw new ShellError("find: I cannot figure out how to interpret ‘" + v + "’ as a date or time" +
				astuce(io, "Une date se donne ainsi : -newermt \"2026-10-15\" ou -newermt \"2026-10-15 12:30\"."));
			return { test: function(c){ return !c.estLieu && cleDeDateNoeud(c.noeud) > cible; } };
		case "-size":
			v = valeur("-size", "-size +1k");
			var ms = /^([+-]?)(\d+)([ckMGbw]?)$/.exec(v);
			if (!ms) throw new ShellError("find : taille « " + v + " » incomprise. Exemples : -size +1k (plus de 1 Kio), -size -100c (moins de 100 octets), -size 0");
			var unite = { c: 1, w: 2, b: 512, "": 512, k: 1024, M: 1048576, G: 1073741824 }[ms[3]];
			var taille = comparaisonNumerique(ms[1] + ms[2], "-size", "-size +1k");
			return { test: function(c){ return taille(Math.ceil(tailleOctets(c.noeud) / unite)); } };
		case "-empty":
			return { test: function(c){ return c.estLieu ? c.noeud.items.length === 0 && c.noeud.children.length === 0 : tailleOctets(c.noeud) === 0; } };
		case "-maxdepth":
		case "-mindepth":
			v = valeur(t, t + " 1");
			if (!/^\d+$/.test(v)) throw new ShellError("find : " + t + " attend un nombre positif, par exemple " + t + " 1");
			options[t.substring(1)] = parseInt(v, 10);
			return { vrai: true };
		case "-depth": options.depth = true; return { vrai: true };
		case "-true": return { vrai: true };
		case "-false": return { test: function(){ return false; } };
		case "-prune": return { prune: true };
		case "-print": action = true; return { print: true };
		case "-print0": action = true; return { print: true, nul: true };
		case "-delete": action = true; options.depth = true; return { supprimer: true };
		case "-ok":
			throw new ShellError("find : -ok demande une confirmation pour chaque objet, ce que ce monde ne sait pas faire.\n" +
				C.gris("(Vérifie d'abord avec -print, puis lance -exec.)"));
		case "-exec":
		case "-execdir":
			var argv = [], plus = false;
			while (k < jetons.length && jetons[k] !== ";" && !(jetons[k] === "+" && jetons[k - 1] === "{}")) argv.push(jetons[k++]);
			if (k >= jetons.length){
				throw new ShellError("find: missing argument to `" + t + "'" +
					astuce(io, "La commande de -exec se termine par \\; (une fois par objet) ou par + (une seule fois pour tous). Exemple : find . -name \"*.tmp\" -exec rm {} \\;"));
			}
			plus = jetons[k] === "+";
			k++;
			if (argv.length === 0) throw new ShellError("find: missing argument to `" + t + "'");
			action = true;
			var noeudExec = { exec: argv, plus: plus, chemins: [] };
			if (plus) execsGroupes.push(noeudExec);
			return noeudExec;
		}
		throw new ShellError("find : critère inconnu « " + t + " ». Ceux qui existent ici : " + CONNUS);
	}
	var arbre = jetons.length ? ou() : null;
	if (k < jetons.length) throw new ShellError(jetons[k] === ")" ? "find : parenthèse fermante « ) » sans parenthèse ouvrante" : "find : « " + jetons[k] + " » inattendu ici");
	if (!action) arbre = arbre ? { et: [arbre, { print: true }] } : { print: true };

	// Ce qu'écrit find : un chemin par ligne, ou suivi d'un caractère nul avec -print0 (pour xargs -0).
	var lignes = [], code = 0, executions = 0, texteNul = false;
	var lancees = [];
	function lancer(argv){
		if (++executions > XARGS_LANCEMENTS_MAX) throw new ShellError("find : plus de " + XARGS_LANCEMENTS_MAX + " exécutions, j'arrête là.");
		lancees.push(argv.map(sansAnsi));
		try {
			var r = Shell.lancerSousCommande(argv, io, "find");
			if (r.sortie !== "") lignes.push(r.sortie);
			return r.code === 0;
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
			io.err(e.message);
			return false;
		}
	}
	function supprimer(c){
		if (c.racine) { io.err("find: cannot delete ‘" + sansAnsi(c.chemin) + "’: Invalid argument"); code = 1; return false; }
		var avant = c.estLieu ? c.dir.children.indexOf(c.noeud) : c.dir.items.indexOf(c.noeud);
		var message;
		if (c.estLieu) message = Shell.supprimerLieu({ dir: c.dir, name: c.nom, node: c.noeud }, "find", false, io);
		else message = Shell.sorts.rm([sansAnsi(c.chemin)], { sudo: io.sudo, tty: false, stdin: null, err: io.err });
		var apres = c.estLieu ? c.dir.children.indexOf(c.noeud) : c.dir.items.indexOf(c.noeud);
		if (avant > -1 && apres === -1) return true;
		io.err("find: cannot delete ‘" + sansAnsi(c.chemin) + "’: Operation not permitted" + (message ? astuce(io, sansAnsi(message).replace(/^rm : |^find : /, "")) : ""));
		code = 1;
		return false;
	}
	function evaluer(n, c){
		if (n.et) return evaluer(n.et[0], c) && evaluer(n.et[1], c);
		if (n.ou) return evaluer(n.ou[0], c) || evaluer(n.ou[1], c);
		if (n.non) return !evaluer(n.non, c);
		if (n.vrai) return true;
		if (n.test) return n.test(c);
		if (n.prune){ c.elaguer = true; return true; }
		if (n.print){
			if (n.nul){ texteNul = true; lignes.push(c.chemin + "\u0000"); }
			else lignes.push(c.estLieu && io.tty ? C.bleu(c.chemin) : c.chemin);
			return true;
		}
		if (n.supprimer) return supprimer(c);
		if (n.exec){
			if (n.plus){ n.chemins.push(c.chemin); return true; }
			return lancer(n.exec.map(function(mot){ return mot.split("{}").join(c.chemin); }));
		}
		return false;
	}
	function visiter(c, profondeur){
		if (profondeur > 40) return;
		if (!options.depth && profondeur >= options.mindepth) evaluer(arbre, c);
		if (c.estLieu && profondeur < options.maxdepth && !c.elaguer){
			var lieu = c.noeud;
			var objets = lieu.items.slice(), enfants = lieu.children.slice();
			var base = c.chemin === "/" ? "" : c.chemin;
			for (var a = 0; a < objets.length; a++){
				visiter({ noeud: objets[a], nom: objets[a].itemname, chemin: base + "/" + objets[a].itemname, estLieu: false, dir: lieu }, profondeur + 1);
			}
			for (var b = 0; b < enfants.length; b++){
				var enfant = enfants[b];
				var sousChemin = base + "/" + enfant.room_name;
				var cEnfant = { noeud: enfant, nom: enfant.room_name, chemin: sousChemin, estLieu: true, dir: lieu };
				var lisible = Shell.peutFouiller(enfant) && Shell.bit(enfant, "x", io) && Shell.bit(enfant, "r", io);
				if (!lisible){
					if (!options.depth && profondeur + 1 >= options.mindepth) evaluer(arbre, cEnfant);
					if (Shell.peutFouiller(enfant) && profondeur + 1 < options.maxdepth){
						io.err("find : « " + sousChemin + " » : Permission non accordée");
						code = 1;
					}
					if (options.depth && profondeur + 1 >= options.mindepth) evaluer(arbre, cEnfant);
					continue;
				}
				visiter(cEnfant, profondeur + 1);
			}
		}
		if (options.depth && profondeur >= options.mindepth) evaluer(arbre, c);
	}
	for (var d = 0; d < departs.length; d++){
		var r = Shell.chercher(departs[d], io, "find");
		if (r.node === null) throw new ShellError(Shell.introuvable("find", r.name, r.dir));
		var racine = departs[d].replace(/\/+$/, "") || departs[d];
		var noeud = Shell.suivre(r.node, "find");
		if (noeud instanceof Room){
			if (!Shell.bit(noeud, "r", io)) throw new ShellError("find : « " + racine + " » : Permission non accordée");
			visiter({ noeud: noeud, nom: noeud === current_room && racine === "." ? "." : noeud.room_name, chemin: racine, estLieu: true, dir: noeud.parents[0] || noeud, racine: true }, 0);
		} else {
			visiter({ noeud: noeud, nom: noeud.itemname, chemin: racine, estLieu: false, dir: r.dir }, 0);
		}
	}
	// -exec ... {} + : une seule commande (ou quelques-unes) avec tous les chemins.
	execsGroupes.forEach(function(n){
		if (n.chemins.length === 0) return;
		var place = n.exec.lastIndexOf("{}");
		for (var debut = 0; debut < n.chemins.length; debut += 200){
			var paquet = n.chemins.slice(debut, debut + 200);
			if (!lancer(n.exec.slice(0, place).concat(paquet, n.exec.slice(place + 1)))) code = 1;
		}
	});
	if (code) io.code = code;
	var sortie = texteNul ? lignes.map(function(l){ return /\u0000$/.test(l) ? l : l + "\n"; }).join("").replace(/\n$/, "") : lignes.join("\n");
	GameEvents.fire({ type: "find", count: lignes.length, output: sansAnsi(sortie),
		suid: args.some(function(a, n){ return args[n - 1] === "-perm" && /4000|u=s/.test(a); }),
		exec: args.indexOf("-exec") > -1, supprime: args.indexOf("-delete") > -1, room: current_room });
	if (lancees.length) GameEvents.fire({ type: "findExec", cmd: lancees[0][0] === "sudo" ? lancees[0][1] : lancees[0][0], commandes: lancees, sudo: !!io.sudo, room: current_room });
	return sortie;
};

/* ------------------------------------------------------------------ */
/* L'âge des objets : ce qui change pendant la partie a l'heure de maintenant */
/* ------------------------------------------------------------------ */

/* Un objet créé pendant la partie naît avec l'âge 0 (Item.js). Un objet modifié (>, >>, nano, sed -i, cp...)
   rajeunit aussi : find -mtime, -mmin, -newer et ls -lt le voient comme sur un vrai système. */
function rajeunir(item){
	if (!item || item instanceof Room) return;
	item.age = 0;
	item.heure = heureMaintenant();
}
GameEvents.addListener("write", function(e){ if (!e.created) rajeunir(e.item); });

/* touch sur un objet qui existe déjà met sa date à jour (si on a le droit d'y écrire). */
var TOUCH_AVANT_ARCANES = Shell.sorts.touch;
Shell.sorts.touch = function(args, io){
	args.forEach(function(a){
		if (a.charAt(0) === "-") return;
		try {
			var r = Shell.chercher(a, io, "touch");
			if (r.node instanceof Item && Shell.bit(r.node, "w", io) && !r.node.immuable){ rajeunir(r.node); GameEvents.fire({ type: "touchExistant", item: r.node, room: r.dir }); }
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
		}
	});
	return TOUCH_AVANT_ARCANES.apply(this, arguments);
};

/* ================================================================== */
/* Textes en colonnes : paste, join, comm, column                      */
/* ================================================================== */

/* Les séparateurs de paste -d : chacun à son tour ; « \0 » est un séparateur vide. */
function separateursPaste(texte){
	var liste = [], table = { n: "\n", t: "\t", "\\": "\\", "0": "" };
	for (var k = 0; k < texte.length; k++){
		var c = texte.charAt(k);
		if (c === "\\" && k + 1 < texte.length){ k++; c = texte.charAt(k); liste.push(table.hasOwnProperty(c) ? table[c] : c); }
		else liste.push(c);
	}
	return liste;
}

Shell.sorts.paste = function(args, io){
	var separateurs = ["\t"], serie = false, fichiers = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--serial"){ serie = true; continue; }
		if (/^--delimiters=/.test(a)){ separateurs = separateursPaste(a.substring(13)); continue; }
		if (a === "--delimiters") a = "-d";
		if (a.charAt(0) === "-" && a !== "-"){
			// Des options groupées : -s, -d SÉP, -dSÉP, -sd SÉP...
			for (var l = 1; l < a.length; l++){
				var lettre = a.charAt(l);
				if (lettre === "s") serie = true;
				else if (lettre === "d"){
					var valeur = a.substring(l + 1);
					if (valeur === ""){
						if (args[i + 1] === undefined) throw new ShellError("paste: option requires an argument -- 'd'");
						valeur = args[++i];
					}
					separateurs = separateursPaste(valeur);
					break;
				} else throw new ShellError("paste: invalid option -- '" + lettre + "'" + astuce(io, "Celles qui existent ici : -d SÉPARATEURS, -s"));
			}
			continue;
		}
		fichiers.push(a);
	}
	if (fichiers.length === 0) fichiers = ["-"];
	var entree = io.stdin === null ? [] : lignesDe(io.stdin), posEntree = 0;
	var colonnes = fichiers.map(function(f){ return f === "-" ? null : lignesDe(texteSource(f, io, "paste")); });
	if (fichiers.indexOf("-") > -1 && io.stdin === null) throw new ShellError("paste : « - » désigne l'entrée standard, mais rien n'arrive par un tuyau.");
	var sep = function(k){ return separateurs.length === 0 ? "" : separateurs[k % separateurs.length]; };
	var sortie = [];
	if (serie){
		colonnes.forEach(function(col){
			var lignes = col === null ? entree.slice(posEntree) : col;
			if (col === null) posEntree = entree.length;
			var ligne = "";
			lignes.forEach(function(l, k){ ligne += (k ? sep(k - 1) : "") + l; });
			sortie.push(ligne);
		});
		GameEvents.fire({ type: "paste", fichiers: fichiers, serie: true, sortie: sortie.join("\n"), room: current_room });
		return sortie.join("\n");
	}
	var positions = colonnes.map(function(){ return 0; });
	for (var garde = 0; garde < 100000; garde++){
		var restes = false, morceaux = [];
		colonnes.forEach(function(col, c){
			var l = "";
			if (col === null){ if (posEntree < entree.length){ l = entree[posEntree++]; restes = true; } }
			else if (positions[c] < col.length){ l = col[positions[c]++]; restes = true; }
			morceaux.push(l);
		});
		if (!restes) break;
		var ligne = morceaux[0];
		for (var m = 1; m < morceaux.length; m++) ligne += sep(m - 1) + morceaux[m];
		sortie.push(ligne);
	}
	GameEvents.fire({ type: "paste", fichiers: fichiers, serie: false, sortie: sortie.join("\n"), room: current_room });
	return sortie.join("\n");
};

/* Les champs d'une ligne pour join : séparés par un caractère, ou par des blancs. */
function champsJoin(ligne, sep){
	if (sep !== null) return ligne.split(sep);
	var propre = ligne.replace(/^[ \t]+/, "");
	return propre === "" ? [""] : propre.split(/[ \t]+/);
}

Shell.sorts.join = function(args, io){
	var sep = null, champ1 = 1, champ2 = 1, garder = { 1: false, 2: false }, seulement = { 1: false, 2: false }, vide = null, format = null, casse = false, fichiers = [];
	var nombre = function(v, opt){
		if (!/^\d+$/.test(v || "") || parseInt(v, 10) < 1) throw new ShellError("join: invalid field number: ‘" + v + "’" + astuce(io, opt + " attend un numéro de champ, à partir de 1"));
		return parseInt(v, 10);
	};
	for (var i = 0; i < args.length; i++){
		var a = args[i], suite = function(){ if (args[i + 1] === undefined) throw new ShellError("join: option requires an argument -- '" + a.charAt(1) + "'"); return args[++i]; };
		if (a === "-t"){ sep = suite(); if (sep.length !== 1) throw new ShellError("join: multi-character tab ‘" + sep + "’"); continue; }
		if (/^-t./.test(a)){ sep = a.substring(2); if (sep.length !== 1) throw new ShellError("join: multi-character tab ‘" + sep + "’"); continue; }
		if (a === "-1"){ champ1 = nombre(suite(), "-1"); continue; }
		if (a === "-2"){ champ2 = nombre(suite(), "-2"); continue; }
		if (a === "-j"){ champ1 = champ2 = nombre(suite(), "-j"); continue; }
		if (a === "-a" || a === "-v"){
			var quel = suite();
			if (quel !== "1" && quel !== "2") throw new ShellError("join: invalid file number: ‘" + quel + "’");
			(a === "-a" ? garder : seulement)[quel] = true;
			continue;
		}
		if (/^-[av][12]$/.test(a)){ (a.charAt(1) === "a" ? garder : seulement)[a.charAt(2)] = true; continue; }
		if (a === "-e"){ vide = suite(); continue; }
		if (a === "-o"){ format = suite(); continue; }
		if (a === "-i" || a === "--ignore-case"){ casse = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("join : option inconnue « " + a + " ». Celles qui existent ici : -t, -1, -2, -j, -a, -v, -e, -o, -i");
		fichiers.push(a);
	}
	if (fichiers.length !== 2) throw new ShellError("join : il faut deux objets triés. Utilisation : join [-t SÉP] [-1 CHAMP] [-2 CHAMP] OBJET1 OBJET2" + (fichiers.length > 2 ? "\njoin: extra operand ‘" + fichiers[2] + "’" : ""));
	var textes = fichiers.map(function(f){ return texteSource(f, io, "join"); });
	var lignes = textes.map(function(t){ return lignesDe(t).map(function(l){ return champsJoin(l, sep); }); });
	var champs = [champ1, champ2];
	var cle = function(f, k){ var c = lignes[f][k][champs[f] - 1]; c = c === undefined ? "" : c; return casse ? c.toLowerCase() : c; };
	var ordre = [], desordre = [false, false];
	var verifierOrdre = function(f, k){
		if (desordre[f] || k === 0) return;
		if (cle(f, k) < cle(f, k - 1)){
			desordre[f] = true;
			io.err("join: " + fichiers[f] + ":" + (k + 1) + ": is not sorted: " + lignesDe(textes[f])[k]);
		}
	};
	var sortie = [], sepSortie = sep === null ? " " : sep;
	var formatLigne = function(l1, l2){
		var k1 = l1 ? l1[champ1 - 1] : (l2 ? l2[champ2 - 1] : "");
		if (format !== null){
			return format.split(/[, ]+/).map(function(spec){
				if (spec === "0") return k1 === undefined ? (vide || "") : k1;
				var m = /^([12])\.(\d+)$/.exec(spec);
				if (!m) throw new ShellError("join: invalid field specifier: ‘" + spec + "’");
				var l = m[1] === "1" ? l1 : l2, v = l ? l[parseInt(m[2], 10) - 1] : undefined;
				return v === undefined ? (vide === null ? "" : vide) : v;
			}).join(sepSortie);
		}
		var morceaux = [k1 === undefined ? "" : k1];
		if (l1) l1.forEach(function(v, j){ if (j !== champ1 - 1) morceaux.push(v); });
		if (l2) l2.forEach(function(v, j){ if (j !== champ2 - 1) morceaux.push(v); });
		return morceaux.join(sepSortie);
	};
	var a1 = 0, a2 = 0, n1 = lignes[0].length, n2 = lignes[1].length;
	while (a1 < n1 || a2 < n2){
		if (sortie.length > 100000) break;
		if (a2 >= n2 || (a1 < n1 && cle(0, a1) < cle(1, a2))){
			verifierOrdre(0, a1);
			if (garder[1] || seulement[1]) sortie.push(formatLigne(lignes[0][a1], null));
			a1++;
			continue;
		}
		if (a1 >= n1 || cle(0, a1) > cle(1, a2)){
			verifierOrdre(1, a2);
			if (garder[2] || seulement[2]) sortie.push(formatLigne(null, lignes[1][a2]));
			a2++;
			continue;
		}
		var c = cle(0, a1), f1 = a1, f2 = a2;
		while (f1 < n1 && cle(0, f1) === c){ verifierOrdre(0, f1); f1++; }
		while (f2 < n2 && cle(1, f2) === c){ verifierOrdre(1, f2); f2++; }
		if (!seulement[1] && !seulement[2]){
			for (var x = a1; x < f1; x++) for (var y = a2; y < f2; y++) sortie.push(formatLigne(lignes[0][x], lignes[1][y]));
		}
		a1 = f1;
		a2 = f2;
	}
	if (desordre[0] || desordre[1]){
		io.err("join: input is not in sorted order" + (io.tty ? "\n" + C.gris("(join exige deux entrées triées sur le champ de jointure : sort -k CHAMP d'abord.)") : ""));
		io.code = 1;
	}
	GameEvents.fire({ type: "join", fichiers: fichiers, lignes: sortie.length });
	return sortie.join("\n");
};

Shell.sorts.comm = function(args, io){
	var montrer = [true, true, true], fichiers = [], sepSortie = null;
	args.forEach(function(a){
		if (/^-[123]+$/.test(a)){ for (var k = 1; k < a.length; k++) montrer[parseInt(a.charAt(k), 10) - 1] = false; return; }
		if (/^--output-delimiter=/.test(a)){ sepSortie = a.substring(19); return; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("comm : option inconnue « " + a + " ». Celles qui existent ici : -1, -2, -3 (et leurs combinaisons, comme -12)");
		fichiers.push(a);
	});
	if (fichiers.length !== 2) throw new ShellError("comm : il faut deux objets triés. Utilisation : comm [-123] OBJET1 OBJET2" + (fichiers.length > 2 ? "\ncomm: extra operand ‘" + fichiers[2] + "’" : ""));
	var a = lignesDe(texteSource(fichiers[0], io, "comm")), b = lignesDe(texteSource(fichiers[1], io, "comm"));
	var tab = sepSortie === null ? "\t" : sepSortie;
	var prefixe = ["", montrer[0] ? tab : "", (montrer[0] ? tab : "") + (montrer[1] ? tab : "")];
	var sortie = [], i = 0, j = 0, desordre = [false, false];
	var verifier = function(t, k, f){
		if (!desordre[f] && k > 0 && t[k] < t[k - 1]){
			desordre[f] = true;
			io.err("comm: file " + (f + 1) + " is not in sorted order");
		}
	};
	while (i < a.length || j < b.length){
		if (j >= b.length || (i < a.length && a[i] < b[j])){ verifier(a, i, 0); if (montrer[0]) sortie.push(prefixe[0] + a[i]); i++; }
		else if (i >= a.length || a[i] > b[j]){ verifier(b, j, 1); if (montrer[1]) sortie.push(prefixe[1] + b[j]); j++; }
		else { verifier(a, i, 0); verifier(b, j, 1); if (montrer[2]) sortie.push(prefixe[2] + a[i]); i++; j++; }
	}
	if (desordre[0] || desordre[1]){
		io.err("comm: input is not in sorted order" + (io.tty ? "\n" + C.gris("(comm compare deux listes triées : passe-les d'abord dans sort.)") : ""));
		io.code = 1;
	}
	GameEvents.fire({ type: "comm", fichiers: fichiers, colonnes: montrer, sortie: sortie.join("\n") });
	return sortie.join("\n");
};

function largeurTexte(t){ return Array.from(t).length; }

Shell.sorts.column = function(args, io){
	var tableau = false, seps = null, sepSortie = "  ", largeur = 80, lignesDabord = false, fichiers = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], suite = function(){ if (args[i + 1] === undefined) throw new ShellError("column: option requires an argument -- '" + a.charAt(1) + "'"); return args[++i]; };
		if (a === "-t" || a === "--table"){ tableau = true; continue; }
		if (a === "-x" || a === "--fillrows"){ lignesDabord = true; continue; }
		if (a === "-s"){ seps = sequencesEchappees(suite()); continue; }
		if (/^-s./.test(a)){ seps = sequencesEchappees(a.substring(2)); continue; }
		if (a === "-o"){ sepSortie = sequencesEchappees(suite()); continue; }
		if (/^-o./.test(a)){ sepSortie = sequencesEchappees(a.substring(2)); continue; }
		if (a === "-c"){
			var c = suite();
			if (!/^\d+$/.test(c)) throw new ShellError("column: invalid columns argument: '" + c + "'");
			largeur = parseInt(c, 10);
			continue;
		}
		if (/^-t[sx]?$|^-[tx]+$/.test(a)){ if (a.indexOf("t") > -1) tableau = true; if (a.indexOf("x") > -1) lignesDabord = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("column : option inconnue « " + a + " ». Celles qui existent ici : -t, -s SÉP, -o SÉP, -c LARGEUR, -x");
		fichiers.push(a);
	}
	var texte = fichiers.length ? fichiers.map(function(f){ return texteSource(f, io, "column"); }).join("\n") : io.stdin;
	if (texte === null){
		throw new ShellError("column : quel texte mettre en colonnes ? Utilisation : column -t OBJET, ou commande | column -t");
	}
	var lignes = lignesDe(texte).filter(function(l){ return l.trim() !== ""; });
	GameEvents.fire({ type: "column", tableau: tableau, separateur: seps, room: current_room });
	if (tableau){
		var lignesChamps = lignes.map(function(l){
			if (seps === null) return l.trim().split(/\s+/);
			var champs = [], courant = "";
			Array.from(l).forEach(function(ch){ if (seps.indexOf(ch) > -1){ champs.push(courant); courant = ""; } else courant += ch; });
			champs.push(courant);
			return champs;
		});
		// Comme column (util-linux) : une ligne plus courte que les autres est complétée de champs vides,
		// chaque colonne est alignée sur la plus large, et la dernière n'est pas complétée.
		var largeurs = [], nbChamps = 0;
		lignesChamps.forEach(function(champs){
			nbChamps = Math.max(nbChamps, champs.length);
			champs.forEach(function(v, k){ largeurs[k] = Math.max(largeurs[k] || 0, largeurTexte(v)); });
		});
		return lignesChamps.map(function(champs){
			var ligne = "";
			for (var k = 0; k < nbChamps; k++){
				var v = champs[k] === undefined ? "" : champs[k];
				ligne += k === nbChamps - 1 ? v : v + new Array(largeurs[k] - largeurTexte(v) + 1).join(" ") + sepSortie;
			}
			return ligne;
		}).join("\n");
	}
	// Sans -t : les entrées en colonnes, alignées sur des tabulations, comme le fait column.
	if (lignes.length === 0) return "";
	var maxi = 0;
	lignes.forEach(function(l){ maxi = Math.max(maxi, largeurTexte(l)); });
	maxi = (maxi + 8) & ~7;
	var nbColonnes = Math.max(1, Math.floor(largeur / maxi));
	var sortie = [], ligne, compte, finColonne, coupe;
	var tabuler = function(){
		while ((coupe = (compte + 8) & ~7) <= finColonne){ ligne += "\t"; compte = coupe; }
		finColonne += maxi;
	};
	if (lignesDabord){
		ligne = ""; compte = 0; finColonne = maxi;
		for (var e = 0, col = 0; e < lignes.length; e++){
			ligne += lignes[e];
			compte += largeurTexte(lignes[e]);
			if (++col === nbColonnes){ sortie.push(ligne); ligne = ""; compte = 0; col = 0; finColonne = maxi; }
			else if (e < lignes.length - 1) tabuler();
		}
		if (compte) sortie.push(ligne);
		return sortie.join("\n");
	}
	var nbLignes = Math.ceil(lignes.length / nbColonnes);
	for (var r = 0; r < nbLignes; r++){
		ligne = ""; compte = 0; finColonne = maxi;
		for (var base = r, k = 0; k < nbColonnes; k++){
			ligne += lignes[base];
			compte += largeurTexte(lignes[base]);
			if ((base += nbLignes) >= lignes.length) break;
			tabuler();
		}
		sortie.push(ligne);
	}
	return sortie.join("\n");
};

/* ================================================================== */
/* tac, shuf, split                                                    */
/* ================================================================== */

Shell.sorts.tac = function(args, io){
	var fichiers = args.filter(function(a){ if (a.charAt(0) === "-" && a !== "-") throw new ShellError("tac : option inconnue « " + a + " »"); return true; });
	if (fichiers.length === 0){
		if (io.stdin === null) throw new ShellError("tac : quel objet lire à l'envers ? Utilisation : tac OBJET, ou commande | tac");
		fichiers = ["-"];
	}
	var sortie = fichiers.map(function(f){ return lignesDe(texteSource(f, io, "tac")).reverse().join("\n"); }).filter(function(t){ return t !== ""; }).join("\n");
	GameEvents.fire({ type: "tac", fichiers: fichiers, sortie: sortie, room: current_room });
	return sortie;
};

Shell.sorts.shuf = function(args, io){
	var nombre = null, echo = false, plage = null, repeter = false, reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-n"){ nombre = args[++i]; if (!/^\d+$/.test(nombre || "")) throw new ShellError("shuf: invalid line count: ‘" + nombre + "’"); nombre = parseInt(nombre, 10); continue; }
		if (/^-n\d+$/.test(a)){ nombre = parseInt(a.substring(2), 10); continue; }
		if (a === "-e"){ echo = true; continue; }
		if (a === "-r"){ repeter = true; continue; }
		if (a === "-i"){ plage = args[++i]; continue; }
		if (/^-i/.test(a)){ plage = a.substring(2); continue; }
		if (a.charAt(0) === "-" && a !== "-" && !echo) throw new ShellError("shuf : option inconnue « " + a + " ». Celles qui existent ici : -n N, -e, -i A-B, -r");
		reste.push(a);
	}
	var lignes;
	if (plage !== null){
		var m = /^(\d+)-(\d+)$/.exec(plage || "");
		if (!m || parseInt(m[1], 10) > parseInt(m[2], 10) + 1) throw new ShellError("shuf: invalid input range: ‘" + plage + "’");
		var de = parseInt(m[1], 10), a2 = parseInt(m[2], 10);
		if (a2 - de > 100000) throw new ShellError("shuf : plage trop grande pour ce monde");
		lignes = [];
		for (var v = de; v <= a2; v++) lignes.push(String(v));
	} else if (echo) lignes = reste;
	else if (reste.length) lignes = lignesDe(texteSource(reste[0], io, "shuf"));
	else if (io.stdin !== null) lignes = lignesDe(io.stdin);
	else throw new ShellError("shuf : quoi mélanger ? Utilisation : shuf OBJET, shuf -e A B C, shuf -i 1-10, ou commande | shuf");
	if (repeter){
		if (lignes.length === 0) throw new ShellError("shuf: no lines to repeat");
		var tirage = [];
		for (var t = 0; t < Math.min(nombre === null ? 10 : nombre, 10000); t++) tirage.push(lignes[Math.floor(Math.random() * lignes.length)]);
		return tirage.join("\n");
	}
	lignes = lignes.slice();
	for (var k = lignes.length - 1; k > 0; k--){
		var j = Math.floor(Math.random() * (k + 1));
		var tmp = lignes[k]; lignes[k] = lignes[j]; lignes[j] = tmp;
	}
	return (nombre === null ? lignes : lignes.slice(0, nombre)).join("\n");
};

/* Les suffixes de split : aa, ab... ou 00, 01... */
function suffixeSplit(n, longueur, chiffres){
	var base = chiffres ? 10 : 26, s = "";
	for (var k = 0; k < longueur; k++){
		var r = n % base;
		s = (chiffres ? String(r) : String.fromCharCode(97 + r)) + s;
		n = Math.floor(n / base);
	}
	return n > 0 ? null : s;
}

Shell.sorts.split = function(args, io){
	var lignes = null, octets = null, morceaux = null, parLignes = false, chiffres = false, longueur = 2, bavard = false, reste = [], suffixe = "";
	var taille = function(t){
		var m = /^(\d+)([KMkm]?)$/.exec(t || "");
		if (!m || parseInt(m[1], 10) < 1) throw new ShellError("split: invalid number of bytes: ‘" + t + "’");
		return parseInt(m[1], 10) * ({ "": 1, k: 1024, K: 1024, m: 1048576, M: 1048576 }[m[2]]);
	};
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-l"){ lignes = args[++i]; if (!/^\d+$/.test(lignes || "") || parseInt(lignes, 10) < 1) throw new ShellError("split: invalid number of lines: ‘" + lignes + "’"); lignes = parseInt(lignes, 10); continue; }
		if (/^-l\d+$/.test(a)){ lignes = parseInt(a.substring(2), 10); continue; }
		if (a === "-b"){ octets = taille(args[++i]); continue; }
		// -n N : N morceaux de même taille ; -n l/N : N morceaux sans couper une ligne.
		if (a === "-n" || /^-n./.test(a) || /^--number=/.test(a)){
			morceaux = a === "-n" ? args[++i] : a.replace(/^-n|^--number=/, "");
			var ml = /^l\/(\d+)$/.exec(morceaux || "");
			if (ml){ parLignes = true; morceaux = ml[1]; }
			if (!/^\d+$/.test(morceaux || "") || parseInt(morceaux, 10) < 1) throw new ShellError("split: invalid number of chunks: ‘" + (ml ? "l/" : "") + morceaux + "’");
			morceaux = parseInt(morceaux, 10); continue;
		}
		if (a === "-d" || a === "--numeric-suffixes"){ chiffres = true; continue; }
		if (a === "-a"){ longueur = parseInt(args[++i], 10); if (!(longueur >= 1 && longueur <= 6)) throw new ShellError("split: invalid suffix length"); continue; }
		if (/^--additional-suffix=/.test(a)){ suffixe = a.substring(20); continue; }
		if (a === "--verbose"){ bavard = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("split : option inconnue « " + a + " ». Celles qui existent ici : -l N, -b TAILLE, -n N, -d, -a N, --verbose");
		reste.push(a);
	}
	if (reste.length > 2) throw new ShellError("split: extra operand ‘" + reste[2] + "’");
	var texte = reste.length && reste[0] !== "-" ? texteSource(reste[0], io, "split") : io.stdin;
	if (texte === null) throw new ShellError("split : quel objet découper ? Utilisation : split -l 100 OBJET [PRÉFIXE]");
	var prefixe = reste[1] || "x";
	var pieces = [];
	if (morceaux !== null && parLignes){
		// Comme GNU split -n l/N : des bornes à chaque N-ième des octets, repoussées jusqu'à la fin de la ligne.
		var ls = lignesDe(texte), total = 0, bornes = [];
		ls.forEach(function(x){ total += versOctetsUtf8(x).length + 1; });
		var cumul = 0, courant = [], k = 1;
		ls.forEach(function(x){
			courant.push(x);
			cumul += versOctetsUtf8(x).length + 1;
			if (k < morceaux && cumul >= Math.ceil(total * k / morceaux)){ pieces.push(courant.join("\n")); courant = []; k++; }
		});
		pieces.push(courant.join("\n"));
		while (pieces.length < morceaux) pieces.push("");
		void bornes;
	} else if (octets !== null || morceaux !== null){
		var cars = Array.from(contenuExact(texte, false));
		var pas = octets !== null ? octets : Math.ceil(cars.length / morceaux);
		for (var d = 0; d < cars.length; d += Math.max(1, pas)) pieces.push(cars.slice(d, d + pas).join(""));
		if (morceaux !== null) while (pieces.length < morceaux) pieces.push("");
	} else {
		var toutes = lignesDe(texte), n = lignes || 1000;
		for (var l = 0; l < toutes.length; l += n) pieces.push(toutes.slice(l, l + n).join("\n"));
	}
	if (pieces.length > 200) throw new ShellError("split : " + pieces.length + " morceaux, c'est trop pour ce monde (200 au plus).");
	var messages = [];
	pieces.forEach(function(contenu, k){
		var s = suffixeSplit(k, longueur, chiffres);
		if (s === null) throw new ShellError("split: output file suffixes exhausted");
		var nom = prefixe + s + suffixe;
		Shell.ecrire(nom, contenu.replace(/\n$/, ""), false);
		if (bavard) messages.push("creating file '" + nom + "'");
	});
	GameEvents.fire({ type: "split", morceaux: pieces.length, prefixe: prefixe, room: current_room });
	return messages.join("\n");
};

/* ================================================================== */
/* diff (normal et unifié) et patch                                    */
/* ================================================================== */

/*
 * Les différences entre deux listes de lignes, calculées comme GNU diff (analyze.c) pour donner
 * exactement les mêmes réponses :
 *   1. les lignes communes du début et de la fin sont mises de côté (sauf « horizon » lignes, le contexte) ;
 *   2. les lignes qui n'existent pas du tout dans l'autre texte sont écartées d'office (discard_confusing_lines) ;
 *   3. l'algorithme de Myers cherche le plus court chemin d'édition, par le « serpent du milieu » (diag, compareseq) ;
 *   4. les blocs de changements sont glissés vers le bas tant que c'est possible (shift_boundaries).
 * Renvoie les blocs { a0, b0, retires: [lignes], ajoutes: [lignes] }, dans l'ordre (a0, b0 : rangs à partir de 0).
 */
function differencesGnu(a0, b0, horizon){
	horizon = horizon || 0;
	var debut = 0;
	while (debut < a0.length && debut < b0.length && a0[debut] === b0[debut]) debut++;
	var finCommune = 0;
	while (finCommune < a0.length - debut && finCommune < b0.length - debut && a0[a0.length - 1 - finCommune] === b0[b0.length - 1 - finCommune]) finCommune++;
	var ecarteDebut = Math.max(0, debut - horizon), ecarteFin = Math.max(0, finCommune - horizon);
	var a = a0.slice(ecarteDebut, a0.length - ecarteFin), b = b0.slice(ecarteDebut, b0.length - ecarteFin);
	// Chaque texte de ligne reçoit un numéro (sa classe d'équivalence) : on compare des nombres.
	var classes = new Map(), prochaine = 1;
	var classe = function(l){ if (!classes.has(l)) classes.set(l, prochaine++); return classes.get(l); };
	var eq = [a.map(classe), b.map(classe)], n = [a.length, b.length];
	// change[f][i + 1] : la ligne i du texte f a-t-elle changé ? (avec une sentinelle à 0 de chaque côté)
	var change = [new Uint8Array(n[0] + 2), new Uint8Array(n[1] + 2)];
	var ch = function(f, i){ return change[f][i + 1]; };
	var poser = function(f, i, v){ change[f][i + 1] = v; };
	var log2 = function(x){ var r = 0; while (x > 1){ x = Math.floor(x / 2); r++; } return r; };
	var f, i, j;

	// 2. Écarter les lignes sans équivalent de l'autre côté (1), et marquer « peut-être » (2) celles qui en ont trop.
	var compte = [new Map(), new Map()];
	for (f = 0; f < 2; f++) eq[f].forEach(function(c){ compte[f].set(c, (compte[f].get(c) || 0) + 1); });
	var ecartees = [new Uint8Array(n[0]), new Uint8Array(n[1])];
	for (f = 0; f < 2; f++){
		var beaucoup = n[f] < 64 ? 5 : 5 * Math.pow(2, (log2(n[f]) >> 1) - 3);
		for (i = 0; i < n[f]; i++){
			var pareilles = compte[1 - f].get(eq[f][i]) || 0;
			if (pareilles === 0) ecartees[f][i] = 1;
			else if (pareilles > beaucoup) ecartees[f][i] = 2;
		}
	}
	for (f = 0; f < 2; f++){
		var d = ecartees[f], fin = n[f];
		for (i = 0; i < fin; i++){
			if (d[i] === 2){ d[i] = 0; continue; }
			if (d[i] === 0) continue;
			// Une suite de lignes écartables : on n'y garde les « peut-être » que s'ils sont rares et entourés.
			var provisoires = 0;
			for (j = i; j < fin; j++){ if (d[j] === 0) break; if (d[j] === 2) provisoires++; }
			while (j > i && d[j - 1] === 2){ d[--j] = 0; provisoires--; }
			var longueur = j - i, suite;
			if ((longueur >> 2) < provisoires){
				while (j > i) if (d[--j] === 2) d[j] = 0;
			} else {
				var minimum = longueur < 4 ? 2 : Math.pow(2, (log2(longueur) >> 1) - 1) + 1;
				suite = 0;
				for (j = 0; j < longueur; j++){
					if (d[i + j] !== 2) suite = 0;
					else if (minimum === ++suite) j -= suite;
					else if (minimum < suite) d[i + j] = 0;
				}
				for (j = 0, suite = 0; j < longueur; j++){
					if (j >= 8 && d[i + j] === 1) break;
					if (d[i + j] === 2){ suite = 0; d[i + j] = 0; }
					else if (d[i + j] === 0) suite = 0;
					else suite++;
					if (suite === 3) break;
				}
				i += longueur - 1;
				for (j = 0, suite = 0; j < longueur; j++){
					if (j >= 8 && d[i - j] === 1) break;
					if (d[i - j] === 2){ suite = 0; d[i - j] = 0; }
					else if (d[i - j] === 0) suite = 0;
					else suite++;
					if (suite === 3) break;
				}
			}
		}
	}
	var gardees = [[], []], vraisRangs = [[], []];
	for (f = 0; f < 2; f++){
		for (i = 0; i < n[f]; i++){
			if (ecartees[f][i] === 0){ gardees[f].push(eq[f][i]); vraisRangs[f].push(i); }
			else poser(f, i, 1);
		}
	}

	// 3. Myers : le serpent du milieu, cherché à la fois depuis le début (fd) et depuis la fin (bd).
	var X = gardees[0], Y = gardees[1], fd = {}, bd = {};
	var serpentDuMilieu = function(xoff, xlim, yoff, ylim){
		var dmin = xoff - ylim, dmax = xlim - yoff, fmid = xoff - yoff, bmid = xlim - ylim;
		var fmin = fmid, fmax = fmid, bmin = bmid, bmax = bmid, impair = ((fmid - bmid) & 1) !== 0;
		fd[fmid] = xoff;
		bd[bmid] = xlim;
		for (var c = 1; c < 1000000; c++){
			var k, x, y, x0, bas, haut;
			if (fmin > dmin) fd[--fmin - 1] = -1; else ++fmin;
			if (fmax < dmax) fd[++fmax + 1] = -1; else --fmax;
			for (k = fmax; k >= fmin; k -= 2){
				bas = fd[k - 1]; haut = fd[k + 1];
				x0 = bas < haut ? haut : bas + 1;
				for (x = x0, y = x0 - k; x < xlim && y < ylim && X[x] === Y[y]; x++, y++);
				fd[k] = x;
				if (impair && bmin <= k && k <= bmax && bd[k] <= x) return [x, y];
			}
			if (bmin > dmin) bd[--bmin - 1] = Infinity; else ++bmin;
			if (bmax < dmax) bd[++bmax + 1] = Infinity; else --bmax;
			for (k = bmax; k >= bmin; k -= 2){
				bas = bd[k - 1]; haut = bd[k + 1];
				x0 = bas < haut ? bas : haut - 1;
				for (x = x0, y = x0 - k; xoff < x && yoff < y && X[x - 1] === Y[y - 1]; x--, y--);
				bd[k] = x;
				if (!impair && fmin <= k && k <= fmax && x <= fd[k]) return [x, y];
			}
		}
		return [xoff, yoff];
	};
	var comparer = function(xoff, xlim, yoff, ylim){
		while (xoff < xlim && yoff < ylim && X[xoff] === Y[yoff]){ xoff++; yoff++; }
		while (xoff < xlim && yoff < ylim && X[xlim - 1] === Y[ylim - 1]){ xlim--; ylim--; }
		if (xoff === xlim){ while (yoff < ylim) poser(1, vraisRangs[1][yoff++], 1); }
		else if (yoff === ylim){ while (xoff < xlim) poser(0, vraisRangs[0][xoff++], 1); }
		else {
			var milieu = serpentDuMilieu(xoff, xlim, yoff, ylim);
			comparer(xoff, milieu[0], yoff, milieu[1]);
			comparer(milieu[0], xlim, milieu[1], ylim);
		}
	};
	comparer(0, X.length, 0, Y.length);

	// 4. Glisser chaque bloc de changements vers le bas tant que la ligne qui suit est la même (shift_boundaries).
	for (f = 0; f < 2; f++){
		var autre = 1 - f, classes0 = eq[f], finF = n[f];
		i = 0; j = 0;
		while (true){
			while (i < finF && !ch(f, i)){ while (ch(autre, j++)); i++; }
			if (i === finF) break;
			var depart = i, longueurBloc, correspondant;
			while (ch(f, ++i));
			while (ch(autre, j)) j++;
			do {
				longueurBloc = i - depart;
				while (depart && classes0[depart - 1] === classes0[i - 1]){
					poser(f, --depart, 1); poser(f, --i, 0);
					while (ch(f, depart - 1)) depart--;
					while (ch(autre, --j));
				}
				correspondant = ch(autre, j - 1) ? i : finF;
				while (i !== finF && classes0[depart] === classes0[i]){
					poser(f, depart++, 0); poser(f, i++, 1);
					while (ch(f, i)) i++;
					while (ch(autre, ++j)) correspondant = i;
				}
			} while (longueurBloc !== i - depart);
			while (correspondant < i){
				poser(f, --depart, 1); poser(f, --i, 0);
				while (ch(autre, --j));
			}
		}
	}

	// Les blocs, dans l'ordre.
	var blocs = [], i0 = 0, i1 = 0;
	while (i0 < n[0] || i1 < n[1]){
		if (ch(0, i0) || ch(1, i1)){
			var l0 = i0, l1 = i1;
			while (ch(0, i0)) i0++;
			while (ch(1, i1)) i1++;
			blocs.push({ a0: l0 + ecarteDebut, b0: l1 + ecarteDebut, retires: a.slice(l0, i0), ajoutes: b.slice(l1, i1) });
		}
		i0++;
		i1++;
	}
	return blocs;
}

/* « 2026-10-16 09:00:00.000000000 +0200 » : la date d'un objet dans un en-tête de diff -u. */
function dateDiff(item){
	var decalage = -new Date().getTimezoneOffset(), signe = decalage < 0 ? "-" : "+";
	decalage = Math.abs(decalage);
	var date = item ? dateModification(item) : dateModification({ age: 0, heure: heureMaintenant() });
	return date + ".000000000 " + signe + deuxChiffres(Math.floor(decalage / 60)) + deuxChiffres(decalage % 60);
}

/* Les morceaux (hunks) d'un diff unifié : les blocs proches (moins de 2 × contexte lignes d'écart) sont réunis. */
function morceauxUnifies(a, b, blocs, contexte){
	var morceaux = [], k = 0;
	while (k < blocs.length){
		var premier = k, dernier = k;
		while (dernier + 1 < blocs.length && blocs[dernier + 1].a0 - (blocs[dernier].a0 + blocs[dernier].retires.length) <= 2 * contexte) dernier++;
		var debutA = Math.max(0, blocs[premier].a0 - contexte);
		var finBloc = blocs[dernier].a0 + blocs[dernier].retires.length;
		var finA = Math.min(a.length, finBloc + contexte);
		var debutB = blocs[premier].b0 - (blocs[premier].a0 - debutA);
		var finB = blocs[dernier].b0 + blocs[dernier].ajoutes.length + (finA - finBloc);
		// Chaque ligne : { signe, texte, a (rang dans le premier texte) ou b (rang dans le second) }.
		var lignes = [], pos = debutA;
		for (var x = premier; x <= dernier; x++){
			var bl = blocs[x];
			for (; pos < bl.a0; pos++) lignes.push({ signe: " ", a: pos });
			bl.retires.forEach(function(l, r){ lignes.push({ signe: "-", a: bl.a0 + r }); });
			bl.ajoutes.forEach(function(l, r){ lignes.push({ signe: "+", b: bl.b0 + r }); });
			pos = bl.a0 + bl.retires.length;
		}
		for (; pos < finA; pos++) lignes.push({ signe: " ", a: pos });
		var plage = function(debut, nb){ return (nb === 0 ? debut : debut + 1) + (nb === 1 ? "" : "," + nb); };
		morceaux.push({ entete: "@@ -" + plage(debutA, finA - debutA) + " +" + plage(debutB, finB - debutB) + " @@", lignes: lignes });
		k = dernier + 1;
	}
	return morceaux;
}

/* Lit un texte pour diff : ses lignes, et si la dernière n'a pas de retour à la ligne (echo -n). */
function lignesPourDiff(texte, sansFin){
	var lignes = lignesDe(texte);
	var manque = !!sansFin && texte !== "" && texte.charAt(texte.length - 1) !== "\n";
	return { lignes: lignes, manqueFin: manque };
}

var DIFF_LIGNES_MAX = 20000;
var SANS_FIN_DE_LIGNE = "\\ No newline at end of file";

Shell.sorts.diff = function(args, io){
	var opts = { q: false, s: false, u: false, contexte: 3 }, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-u" || a === "--unified"){ opts.u = true; continue; }
		if (/^-U\d+$/.test(a)){ opts.u = true; opts.contexte = parseInt(a.substring(2), 10); continue; }
		if (a === "-U"){
			opts.u = true;
			opts.contexte = parseInt(args[++i], 10);
			if (!/^\d+$/.test(args[i] || "")) throw new ShellError("diff: invalid context length '" + args[i] + "'" + astuce(io, "-U attend un nombre de lignes de contexte : diff -U 1 a b"));
			continue;
		}
		if (/^--unified=\d+$/.test(a)){ opts.u = true; opts.contexte = parseInt(a.substring(10), 10); continue; }
		if (a === "-q" || a === "--brief"){ opts.q = true; continue; }
		if (a === "-s" || a === "--report-identical-files"){ opts.s = true; continue; }
		if (/^-[qsu]+$/.test(a)){ if (a.indexOf("q") > -1) opts.q = true; if (a.indexOf("s") > -1) opts.s = true; if (a.indexOf("u") > -1) opts.u = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("diff : option inconnue « " + a + " ». Celles qui existent ici : -q, -s, -u, -U N");
		noms.push(a);
	}
	if (noms.length !== 2) throw new ShellError("diff : il faut deux objets à comparer. Utilisation : diff OBJET1 OBJET2");
	var lire = function(nom){
		if (nom === "-"){
			if (io.stdin === null) throw new ShellError("diff : « - » désigne l'entrée standard, mais rien n'arrive par un tuyau.");
			return { item: null, texte: io.stdin, sansFin: !!io.stdinSansFin };
		}
		// /dev/null : un texte vide (diff -u /dev/null nouveau fabrique le correctif qui crée un objet).
		if (nom === "/dev/null") return { item: null, texte: "", sansFin: false };
		var t = Shell.objetLisible(nom, io, "diff");
		return { item: t.item, texte: t.item.getText(), sansFin: !!t.item.sansFinDeLigne };
	};
	var un = lire(noms[0]), deux = lire(noms[1]);
	var pa = lignesPourDiff(un.texte, un.sansFin), pb = lignesPourDiff(deux.texte, deux.sansFin);
	var la = pa.lignes, lb = pb.lignes;
	if (la.length + lb.length > DIFF_LIGNES_MAX) throw new ShellError("diff : ces deux textes sont trop longs pour être comparés ligne à ligne ici.");
	// Une dernière ligne sans retour à la ligne n'est pas la même que la même ligne avec : on la marque pour comparer.
	var cle = function(p){ return p.lignes.map(function(l, k){ return p.manqueFin && k === p.lignes.length - 1 ? l + "\u0000" : l; }); };
	var blocs = differencesGnu(cle(pa), cle(pb), opts.u ? opts.contexte : 0);
	blocs.forEach(function(bl){
		bl.retires = la.slice(bl.a0, bl.a0 + bl.retires.length);
		bl.ajoutes = lb.slice(bl.b0, bl.b0 + bl.ajoutes.length);
	});
	GameEvents.fire({ type: "diff", a: un.item, b: deux.item, different: blocs.length > 0, unifie: opts.u, room: current_room });
	if (blocs.length === 0){
		if (opts.s) return "Files " + noms[0] + " and " + noms[1] + " are identical";
		return io.tty ? C.gris("(aucune différence : diff ne dit rien quand les deux textes sont identiques)") : "";
	}
	io.code = 1;
	if (opts.q) return "Files " + noms[0] + " and " + noms[1] + " differ";
	var lignes = [];
	// Écrit une ligne, et la remarque de GNU si c'est la dernière d'un texte qui n'a pas de retour à la ligne final.
	var ecrire = function(texte, couleur, p, rang){
		lignes.push(io.tty && couleur ? couleur(texte) : texte);
		if (p.manqueFin && rang === p.lignes.length - 1) lignes.push(SANS_FIN_DE_LIGNE);
	};
	if (opts.u){
		lignes.push("--- " + noms[0] + "\t" + dateDiff(un.item), "+++ " + noms[1] + "\t" + dateDiff(deux.item));
		morceauxUnifies(la, lb, blocs, opts.contexte).forEach(function(m){
			lignes.push(io.tty ? C.cyan(m.entete) : m.entete);
			m.lignes.forEach(function(l){
				if (l.signe === "+") ecrire("+" + lb[l.b], C.vert, pb, l.b);
				else if (l.signe === "-") ecrire("-" + la[l.a], C.rouge, pa, l.a);
				else {
					lignes.push(" " + la[l.a]);
					// Une ligne de contexte sans fin de ligne : elle l'est forcément des deux côtés.
					if (pa.manqueFin && l.a === la.length - 1) lignes.push(SANS_FIN_DE_LIGNE);
				}
			});
		});
		if (io.tty) lignes.push(C.gris("(--- le premier, +++ le second ; @@ -2,7 +2,6 @@ : 7 lignes à partir de la ligne 2 avant, 6 après ; - retirée, + ajoutée)"));
		return lignes.join("\n");
	}
	var plage = function(debut, nombre){
		if (nombre === 0) return String(debut);
		return nombre === 1 ? String(debut + 1) : (debut + 1) + "," + (debut + nombre);
	};
	blocs.forEach(function(bl){
		var lettre = bl.retires.length && bl.ajoutes.length ? "c" : (bl.retires.length ? "d" : "a");
		lignes.push(plage(bl.a0, bl.retires.length) + lettre + plage(bl.b0, bl.ajoutes.length));
		bl.retires.forEach(function(l, r){ ecrire("< " + l, C.rouge, pa, bl.a0 + r); });
		if (lettre === "c") lignes.push("---");
		bl.ajoutes.forEach(function(l, r){ ecrire("> " + l, C.vert, pb, bl.b0 + r); });
	});
	if (io.tty) lignes.push(C.gris("(< : lignes du premier objet ; > : lignes du second ; 17c17 : la ligne 17 a changé)"));
	return lignes.join("\n");
};

/*
 * Lit un diff unifié. Renvoie les sections, une par objet :
 * { ancien, nouveau, entete: [lignes --- et +++ telles quelles], avant: [lignes qui précèdent], ligneMorceau: n° de la ligne du premier @@,
 *   morceaux: [{ premier, nPattern, premierNouveau, nRempl, lignes: [{ t: " " | "-" | "+", v }], texte: [lignes brutes] }] }
 */
function lireCorrectif(texte){
	var lignes = texte.split("\n"), sections = [], i = 0, debutTexte = 0;
	if (lignes[lignes.length - 1] === "") lignes.pop();
	while (i < lignes.length){
		if (/^--- /.test(lignes[i]) && /^\+\+\+ /.test(lignes[i + 1] || "") && /^@@ /.test(lignes[i + 2] || "")){
			var nomDe = function(l){ return l.substring(4).split("\t")[0].replace(/\s+$/, ""); };
			var section = { ancien: nomDe(lignes[i]), nouveau: nomDe(lignes[i + 1]), entete: [lignes[i], lignes[i + 1]],
				avant: lignes.slice(debutTexte, i + 2), ligneMorceau: i + 3, morceaux: [] };
			sections.push(section);
			i += 2;
			while (i < lignes.length && /^@@ /.test(lignes[i])){
				var m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(lignes[i]);
				if (!m) break;
				var morceau = { premier: parseInt(m[1], 10), nPattern: m[2] === undefined ? 1 : parseInt(m[2], 10),
					premierNouveau: parseInt(m[3], 10), nRempl: m[4] === undefined ? 1 : parseInt(m[4], 10), lignes: [], texte: [lignes[i]] };
				i++;
				var vusA = 0, vusB = 0;
				while (i < lignes.length && (vusA < morceau.nPattern || vusB < morceau.nRempl)){
					var l = lignes[i], t = l.charAt(0);
					if (t === "\\"){ morceau.texte.push(l); i++; continue; }
					if (l === "") t = " ";
					if (t !== " " && t !== "-" && t !== "+") break;
					morceau.lignes.push({ t: t, v: l.substring(1) });
					morceau.texte.push(l);
					if (t !== "+") vusA++;
					if (t !== "-") vusB++;
					i++;
				}
				// « \ No newline at end of file » : la ligne d'avant n'a pas de retour à la ligne.
				while (i < lignes.length && lignes[i].charAt(0) === "\\"){ morceau.texte.push(lignes[i]); i++; }
				section.morceaux.push(morceau);
			}
			debutTexte = i;
			continue;
		}
		i++;
	}
	return sections.filter(function(s){ return s.morceaux.length > 0; });
}

/* Un morceau vu à l'envers (patch -R) : ce qui était retiré est ajouté, et inversement. */
function morceauInverse(m){
	return { premier: m.premierNouveau, nPattern: m.nRempl, premierNouveau: m.premier, nRempl: m.nPattern, texte: m.texte,
		lignes: m.lignes.map(function(l){ return { t: l.t === "-" ? "+" : (l.t === "+" ? "-" : " "), v: l.v }; }) };
}

/*
 * Applique les morceaux d'une section aux lignes d'un texte, comme GNU patch (locate_hunk, patch_match) :
 * chaque morceau est cherché à sa place, puis de plus en plus loin (le décalage, « offset »), et si besoin
 * en ignorant 1 puis 2 lignes de contexte à chaque bout (le « fuzz »). Les lignes de contexte sont reprises
 * du texte, pas du correctif.
 * Renvoie { lignes, messages, echecs: [morceaux], inverse: true si le correctif semble déjà appliqué }.
 */
function appliquerMorceaux(entree, morceaux, opts){
	var sortie = [], messages = [], echecs = [];
	var decalageEntree = 0, decalageSortie = 0, dernierFige = 0, lu = 0;
	var contexteAvant = function(m){ var c = 0; while (c < m.lignes.length && m.lignes[c].t === " ") c++; return c; };
	var contexteApres = function(m){ var c = 0; while (c < m.lignes.length && m.lignes[m.lignes.length - 1 - c].t === " ") c++; return c; };
	var motif = function(m){ return m.lignes.filter(function(l){ return l.t !== "+"; }).map(function(l){ return l.v; }); };
	var premierDe = function(m){ return m.nPattern === 0 ? m.premier + 1 : m.premier; };
	// Le motif (sans flou au début ni à la fin) est-il à la ligne base + decalage ?
	var correspond = function(m, base, decalage, flouAvant, flouApres){
		var p = motif(m), fin = p.length - flouApres;
		for (var k = flouAvant, ligne = base + decalage + flouAvant; k < fin; k++, ligne++){
			if (ligne < 1 || ligne > entree.length || entree[ligne - 1] !== p[k]) return false;
		}
		return true;
	};
	var trouver = function(m, flou){
		var premier = premierDe(m), essai = premier + decalageEntree, nMotif = motif(m).length;
		var avant = contexteAvant(m), apres = contexteApres(m), contexte = Math.max(avant, apres);
		var flouAvant = flou + avant - contexte, flouApres = flou + apres - contexte;
		var maxOu = entree.length - (nMotif - flouApres) + 1, minOu = dernierFige + 1 - (avant - flouAvant);
		var maxPlus = maxOu - essai, maxMoins = essai - minOu, maxDecalage = Math.max(maxPlus, maxMoins);
		if (nMotif === 0) return essai;
		if (essai <= maxMoins) maxMoins = essai - 1;
		if (flouAvant < 0 && premier <= 1){
			// Ce morceau touche le début du texte : il ne peut aller qu'au début.
			if (flouApres < 0 && (nMotif !== entree.length || avant < dernierFige)) return 0;
			var d0 = 1 - essai;
			if (dernierFige <= avant && d0 <= maxPlus && correspond(m, essai, d0, 0, Math.max(0, flouApres))){ decalageEntree += d0; return essai + d0; }
			return 0;
		}
		if (flouAvant < 0) flouAvant = 0;
		if (flouApres < 0){
			// Il touche la fin du texte : il ne peut aller qu'à la fin.
			var d1 = essai - (entree.length - nMotif + 1);
			if (d1 <= maxMoins && correspond(m, essai, -d1, flouAvant, 0)){ decalageEntree -= d1; return essai - d1; }
			return 0;
		}
		for (var d = 0; d <= maxDecalage; d++){
			if (d <= maxPlus && correspond(m, essai, d, flouAvant, flouApres)){ decalageEntree += d; return essai + d; }
			if (d > 0 && d <= maxMoins && correspond(m, essai, -d, flouAvant, flouApres)){ decalageEntree -= d; return essai - d; }
		}
		return 0;
	};
	for (var k = 0; k < morceaux.length; k++){
		var m = morceaux[k], ou = 0, flou = 0;
		var flouMax = Math.min(2, Math.max(contexteAvant(m), contexteApres(m)));
		do {
			ou = trouver(m, flou);
			// Au premier morceau, s'il ne va nulle part, le correctif est peut-être déjà appliqué : on l'essaie à l'envers.
			if (k === 0 && !ou && !opts.forcer){
				var sauve = decalageEntree;
				if (trouver(morceauInverse(m), flou)){
					decalageEntree = sauve;
					return { inverse: true, lignes: entree, messages: messages, echecs: morceaux.slice() };
				}
				decalageEntree = sauve;
			}
		} while (!ou && ++flou <= flouMax);
		if (!ou){
			messages.push("Hunk #" + (k + 1) + " FAILED at " + (premierDe(m) + decalageSortie) + ".");
			echecs.push(m);
			m.decalageRejet = decalageSortie;   // le .rej renumérote le morceau d'après ce qui a déjà été appliqué
			continue;
		}
		if (flou || decalageEntree){
			messages.push("Hunk #" + (k + 1) + " succeeded at " + (ou + decalageSortie) + (flou ? " with fuzz " + flou : "") +
				(decalageEntree ? " (offset " + decalageEntree + " line" + (decalageEntree === 1 ? "" : "s") + ")" : "") + ".");
		}
		// Recopier le texte jusqu'au morceau, puis le morceau : contexte repris du texte, - sauté, + inséré.
		while (lu < ou - 1) sortie.push(entree[lu++]);
		m.lignes.forEach(function(l){
			if (l.t === "+") sortie.push(l.v);
			else if (l.t === "-") lu++;
			else if (lu < entree.length) sortie.push(entree[lu++]);
		});
		dernierFige = lu;
		decalageSortie += m.nRempl - m.nPattern;
	}
	while (lu < entree.length) sortie.push(entree[lu++]);
	return { lignes: sortie, messages: messages, echecs: echecs, inverse: false };
}

Shell.sorts.patch = function(args, io){
	var o = { R: false, essai: false, p: null, i: null, N: false, f: false }, positionnels = [];
	for (var a = 0; a < args.length; a++){
		var x = args[a];
		if (x === "-R" || x === "--reverse"){ o.R = true; continue; }
		if (x === "--dry-run"){ o.essai = true; continue; }
		if (x === "-N" || x === "--forward"){ o.N = true; continue; }
		if (x === "-f" || x === "--force" || x === "-t" || x === "--batch" || x === "-s" || x === "--quiet" || x === "--silent"){ if (x === "-f" || x === "--force") o.f = true; continue; }
		if (/^-p\d+$/.test(x)){ o.p = parseInt(x.substring(2), 10); continue; }
		if (x === "-p"){
			if (!/^\d+$/.test(args[a + 1] || "")) throw new ShellError("patch: **** strip count " + args[a + 1] + " is not a number");
			o.p = parseInt(args[++a], 10);
			continue;
		}
		if (/^--strip=\d+$/.test(x)){ o.p = parseInt(x.substring(8), 10); continue; }
		if (x === "-i" || x === "--input"){ o.i = args[++a]; if (o.i === undefined) throw new ShellError("patch: option requires an argument -- 'i'"); continue; }
		if (/^-i./.test(x)){ o.i = x.substring(2); continue; }
		if (/^--input=/.test(x)){ o.i = x.substring(8); continue; }
		if (/^-[RNf]+$/.test(x)){ if (x.indexOf("R") > -1) o.R = true; if (x.indexOf("N") > -1) o.N = true; if (x.indexOf("f") > -1) o.f = true; continue; }
		if (x.charAt(0) === "-") throw new ShellError("patch : option inconnue « " + x + " ». Celles qui existent ici : -pN, -R, -i CORRECTIF, -N, --dry-run");
		positionnels.push(x);
	}
	// patch [OBJET [CORRECTIF]] : le correctif peut aussi venir de -i ou de l'entrée standard.
	var cibleImposee = positionnels[0] || null;
	if (positionnels.length > 2) throw new ShellError("patch: **** Can't handle more than two file names" + astuce(io, "Utilisation : patch OBJET CORRECTIF"));
	if (positionnels.length === 2){
		if (o.i !== null) throw new ShellError("patch: **** Only one patch file can be given");
		o.i = positionnels[1];
	}
	var texte;
	if (o.i !== null){
		var source = Shell.chercher(o.i, io, "patch");
		if (source.node === null) throw new ShellError("patch: **** Can't open patch file " + o.i + " : No such file or directory", 2);
		texte = texteSource(o.i, io, "patch");
	} else if (io.stdin !== null) texte = io.stdin;
	else {
		throw new ShellError("patch : où est le correctif ? Utilisation : patch OBJET CORRECTIF.diff, patch -p0 < CORRECTIF.diff, ou cat CORRECTIF.diff | patch OBJET" +
			astuce(io, "Un correctif se fabrique avec diff -u ancien nouveau > correctif.diff."));
	}
	var sections = lireCorrectif(texte);
	if (sections.length === 0){
		throw new ShellError("patch: **** Only garbage was found in the patch input." +
			astuce(io, "Ce n'est pas un diff unifié : il doit contenir des lignes --- , +++ et @@ -a,b +c,d @@. diff -u en fabrique."), 2);
	}
	var sortie = [], code = 0;
	// -pN retire les N premiers dossiers des noms ; sans -p, seul le dernier morceau du nom compte.
	var depouiller = function(nom){
		if (o.p === null) return nom.split("/").pop();
		var morceaux = nom.split("/");
		if (o.p >= morceaux.length) return null;
		return morceaux.slice(o.p).join("/");
	};
	var existe = function(nom){ try { return Shell.chercher(nom, io, "patch").node !== null; } catch (e){ return false; } };
	var pluriel = function(n){ return n + " hunk" + (n > 1 ? "s" : ""); };
	sections.forEach(function(section){
		var morceaux = o.R ? section.morceaux.map(morceauInverse) : section.morceaux;
		var ancien = o.R ? section.nouveau : section.ancien, nouveau = o.R ? section.ancien : section.nouveau;
		var creation = ancien === "/dev/null", suppression = nouveau === "/dev/null";
		var nomCible = cibleImposee;
		if (!nomCible){
			var candidats = [ancien, nouveau].filter(function(n){ return n !== "/dev/null"; }).map(depouiller).filter(function(n){ return n; });
			nomCible = candidats.filter(existe)[0] || (creation ? candidats[0] : null);
		}
		if (!nomCible){
			// Le message de GNU patch, qui suggère l'option -p.
			sortie.push("can't find file to patch at input line " + section.ligneMorceau,
				o.p === null ? "Perhaps you should have used the -p or --strip option?" : "Perhaps you used the wrong -p or --strip option?",
				"The text leading up to this was:", "--------------------------");
			section.avant.forEach(function(l){ sortie.push("|" + l); });
			sortie.push("--------------------------", "File to patch: ", "Skip this patch? [y] ", "Skipping patch.",
				section.morceaux.length + " out of " + pluriel(section.morceaux.length) + " ignored");
			if (io.tty) sortie.push(C.gris("(patch ne trouve pas l'objet nommé dans les lignes --- et +++. Nomme-le : patch OBJET CORRECTIF, ou règle -p : -p0 garde le chemin entier, -p1 retire le premier dossier.)"));
			code = Math.max(code, 1);
			return;
		}
		var r = Shell.chercher(nomCible, io, "patch");
		var item = r.node ? Shell.suivre(r.node, "patch") : null;
		if (item instanceof Room){ io.err("patch: **** File " + nomCible + " is not a regular file -- can't patch"); code = 2; return; }
		if (item && !Shell.bit(item, "r", io)){ io.err("patch: **** Can't open file " + nomCible + " : Permission denied"); code = 2; return; }
		sortie.push((o.essai ? "checking file " : "patching file ") + nomCible);
		var original = item ? item.getText() : "";
		var entree = lignesDe(original);
		var res = appliquerMorceaux(entree, morceaux, { forcer: o.f });
		if (res.inverse){
			// Déjà appliqué ? Le vrai patch poserait la question ; ici, il répond non, comme sans terminal.
			if (o.N) sortie.push("Reversed (or previously applied) patch detected!  Skipping patch.");
			else {
				sortie.push((o.R ? "Unreversed patch detected!  Ignore -R? [n] " : "Reversed (or previously applied) patch detected!  Assume -R? [n] "),
					"Apply anyway? [n] ", "Skipping patch.");
			}
			sortie.push(section.morceaux.length + " out of " + pluriel(section.morceaux.length) + " ignored" + (o.essai ? "" : " -- saving rejects to file " + nomCible + ".rej"));
			if (io.tty) sortie.push(C.gris(o.R ? "(Ce correctif ne semble pas appliqué : rien à annuler.)" : "(Ce correctif semble déjà appliqué. Pour l'annuler : patch -R " + nomCible + " CORRECTIF.)"));
			if (!o.essai) Shell.ecrire(nomCible + ".rej", rejets(section, section.morceaux), false);
			GameEvents.fire({ type: "patch", ok: false, item: item, room: r.dir, inverse: o.R, dejaApplique: true, echecs: section.morceaux.length, morceaux: section.morceaux.length, essai: o.essai });
			code = Math.max(code, 1);
			return;
		}
		sortie = sortie.concat(res.messages);
		if (res.echecs.length){
			sortie.push(res.echecs.length + " out of " + pluriel(morceaux.length) + " FAILED" + (o.essai ? "" : " -- saving rejects to file " + nomCible + ".rej"));
			if (io.tty) sortie.push(C.gris("(Le texte a trop changé à cet endroit : ce morceau est mis de côté dans " + nomCible + ".rej, à reporter à la main.)"));
			code = Math.max(code, 1);
		}
		var nouveauTexte = res.lignes.join("\n");
		GameEvents.fire({ type: "patch", ok: res.echecs.length === 0, item: item, room: r.dir, inverse: o.R, echecs: res.echecs.length, morceaux: morceaux.length, essai: o.essai });
		if (o.essai) return;
		if (res.echecs.length) Shell.ecrire(nomCible + ".rej", rejets(section, res.echecs), false);
		// Comme GNU patch : quand un morceau a bougé, flotté ou échoué, l'original est gardé dans OBJET.orig.
		if (item && (res.echecs.length || res.messages.length) && !existe(nomCible + ".orig")) Shell.ecrire(nomCible + ".orig", original, false);
		if (item === null){
			Shell.nomValide(r.name, "patch");
			Shell.verifierEcriture(r.dir, io, "patch", r.name);
			item = new Item(r.name, nouveauTexte);
			item.owner = io.sudo ? "root" : JOUEUR;
			r.dir.addItem(item);
			GameEvents.fire({ type: "write", item: item, room: r.dir, append: false, text: nouveauTexte, created: true, previous: "" });
			return;
		}
		if (suppression && nouveauTexte === ""){
			// Un correctif vers /dev/null efface l'objet.
			Shell.sorts.rm([nomCible], { sudo: io.sudo, tty: false, stdin: null, err: io.err });
			return;
		}
		if (nouveauTexte !== original.replace(/\n$/, "")){
			if (item.immuable) Shell.verifierImmuable(item, "patch");
			if (!Shell.bit(item, "w", io)) throw new ShellError("patch: **** Can't rename file " + nomCible + " : Permission denied" + astuce(io, "Cet objet n'est pas à toi : sudo patch..."));
			item.setText(nouveauTexte);
			item.age = 0;
			item.heure = heureMaintenant();
			GameEvents.fire({ type: "write", item: item, room: r.dir, append: false, text: nouveauTexte, created: false, previous: original });
		}
	});
	if (code) io.code = code;
	return sortie.join("\n");
	/* Le contenu d'un .rej : l'en-tête du correctif, puis les morceaux refusés, renumérotés. */
	function rejets(section, liste){
		var plage = function(debut, n){ return debut + (n === 1 ? "" : "," + n); };
		return section.entete.concat([].concat.apply([], liste.map(function(m){
			var d = m.decalageRejet || 0;
			return ["@@ -" + plage(m.premier + d, m.nPattern) + " +" + plage(m.premierNouveau + d, m.nRempl) + " @@"]
				.concat(m.lignes.map(function(l){ return l.t + l.v; }));
		}))).join("\n");
	}
};

/* ================================================================== */
/* rsync : synchroniser deux lieux                                     */
/* ================================================================== */

/* Une copie d'objet, comme celle de cp (mêmes propriétés recopiées). */
function copierObjetPour(item, nom, io, garder){
	var copie = new Item(nom, item.getText());
	copie.picturename = item.picturename;
	copie.owner = io.sudo && garder.o ? item.owner : (io.sudo ? "root" : JOUEUR);
	copie.mode = garder.p ? item.mode : "rw-r--r--";
	if (item.lien) copie.lien = item.lien;
	if (item.archive) copie.archive = JSON.parse(JSON.stringify(item.archive));
	if (item.binaire) copie.binaire = item.binaire;
	["gzip", "gpg", "format"].forEach(function(k){ if (item[k] !== undefined) copie[k] = JSON.parse(JSON.stringify(item[k])); });
	copie.sansFinDeLigne = !!item.sansFinDeLigne;
	if (garder.t){
		if (item.age === undefined) delete copie.age; else copie.age = item.age;
		if (item.heure === undefined) delete copie.heure; else copie.heure = item.heure;
	}
	return copie;
}

Shell.sorts.rsync = function(args, io){
	var o = { r: false, v: false, n: false, p: false, o: false, t: false, supprimer: false, exclure: [] }, chemins = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--delete"){ o.supprimer = true; continue; }
		if (a === "--dry-run"){ o.n = true; continue; }
		if (a === "--recursive"){ o.r = true; continue; }
		if (a === "--verbose"){ o.v = true; continue; }
		if (a === "--archive"){ o.r = o.p = o.o = o.t = true; continue; }
		if (a === "--exclude"){ if (args[i + 1] === undefined) throw new ShellError("rsync: option '--exclude' requires an argument"); o.exclure.push(args[++i]); continue; }
		if (/^--exclude=/.test(a)){ o.exclure.push(a.substring(10)); continue; }
		if (a === "--progress" || a === "--human-readable" || a === "--compress"){ continue; }
		if (/^-[a-zA-Z]+$/.test(a)){
			for (var l = 1; l < a.length; l++){
				var c = a.charAt(l);
				if (c === "a"){ o.r = o.p = o.o = o.t = true; }
				else if ("rvnpot".indexOf(c) > -1) o[c] = true;
				else if ("zhPlgDuc".indexOf(c) > -1) continue;
				else throw new ShellError("rsync: -" + c + ": unknown option" + astuce(io, "Celles qui existent ici : -a, -r, -v, -n, -p, -t, --delete, --exclude MOTIF, --dry-run"));
			}
			continue;
		}
		if (a.charAt(0) === "-") throw new ShellError("rsync: " + a + ": unknown option");
		chemins.push(a);
	}
	if (chemins.length < 2) throw new ShellError("rsync : il faut une source et une destination. Utilisation : rsync -av SOURCE/ DESTINATION" +
		astuce(io, "La barre finale compte : rsync -a src/ dst copie le CONTENU de src dans dst ; rsync -a src dst crée dst/src."));
	chemins.forEach(function(c){
		if (/^[A-Za-z0-9.\-]+:/.test(c)) throw new ShellError("rsync : " + c + " : ce monde ne synchronise que des lieux d'une même machine." + astuce(io, "Pour copier vers une autre machine, il y a scp."));
	});
	var destination = chemins.pop();
	// --exclude MOTIF : un nom (n'importe où), un chemin s'il contient une barre, un lieu seulement s'il finit par une barre.
	var regExclusions = o.exclure.map(function(motif){
		var propre = motif.replace(/\/$/, "");
		return { re: motifVersRegExp(propre.replace(/^\//, ""), ""), chemin: propre.indexOf("/") > -1, lieuSeulement: /\/$/.test(motif) };
	});
	var exclu = function(nom, relatif, estLieu){
		return regExclusions.some(function(e){ return (!e.lieuSeulement || estLieu) && e.re.test(e.chemin ? relatif : nom); });
	};
	var liste = [], code = 0, taille = 0, transfere = 0, operations = 0;
	var garder = { p: o.p, o: o.o, t: o.t };
	var erreur = function(m){ io.err(m); code = 23; };
	var compter = function(){ if (++operations > 3000) throw new ShellError("rsync : plus de 3000 objets à copier, c'est trop pour ce monde."); };
	var creerLieu = function(parent, nom, modele){
		var lieu = new Room(nom, modele ? modele.intro_text : "Un lieu créé par rsync.", modele ? undefined : undefined);
		if (modele) lieu.room_pic = modele.room_pic;
		lieu.owner = io.sudo && garder.o && modele ? modele.owner : (io.sudo ? "root" : JOUEUR);
		lieu.mode = garder.p && modele ? modele.mode : "rwxr-xr-x";
		link_rooms(parent, lieu);
		GameEvents.fire({ type: "mkdir", room: lieu, parent: parent });
		return lieu;
	};
	var peutSupprimer = function(noeud){
		if (noeud instanceof Room) return noeud.owner === JOUEUR && !noeud.id && !joueurDans(noeud);
		if (noeud.immuable || noeud.protege || noeud.person) return false;
		return noeud.allows("rm") || (noeud.owner === JOUEUR && !noeud.acquis) || (io.sudo && noeud.allows("sudo-rm"));
	};
	/* Copie un objet dans un lieu ; renvoie vrai s'il a fallu écrire quelque chose. */
	var copierObjet = function(item, lieu, nom, relatif){
		compter();
		taille += tailleOctets(item);
		if (item.person){ erreur("rsync: " + relatif + " : on ne copie pas les gens (" + item.itemname + " n'est pas un fichier)"); return; }
		if (!Shell.bit(item, "r", io)){ erreur("rsync: [sender] send_files failed to open \"" + relatif + "\": Permission denied (13)"); return; }
		var existant = lieu.getNode(nom);
		if (existant instanceof Room){ erreur("rsync: [receiver] cannot delete non-empty directory: " + relatif); return; }
		if (existant && existant.getText() === item.getText() && (!garder.p || existant.mode === item.mode)) return;
		if (!Shell.bit(lieu, "w", io) && !existant){ erreur("rsync: [receiver] mkstemp \"" + relatif + "\" failed: Permission denied (13)"); return; }
		if (existant && (existant.immuable || existant.person || existant.protege || !Shell.bit(existant, "w", io))){ erreur("rsync: [receiver] rename \"" + relatif + "\" failed: Operation not permitted (1)"); return; }
		liste.push(relatif);
		transfere += tailleOctets(item);
		if (o.n) return;
		if (existant){
			var ancien = existant.getText();
			existant.setText(item.getText());
			if (garder.p) existant.mode = item.mode;
			existant.age = garder.t && item.age !== undefined ? item.age : 0;
			existant.heure = garder.t && item.heure !== undefined ? item.heure : heureMaintenant();
			GameEvents.fire({ type: "write", item: existant, room: lieu, append: false, text: item.getText(), created: false, previous: ancien });
		} else {
			var copie = copierObjetPour(item, nom, io, garder);
			lieu.addItem(copie);
			GameEvents.fire({ type: "cp", source: item, copy: copie, room: lieu, rsync: true });
		}
	};
	/* Synchronise le contenu de src dans dst (dst existe, ou n'existe qu'en essai à blanc). */
	var synchroniser = function(src, dst, prefixe, profondeur){
		if (profondeur > 30) return;
		if (!Shell.bit(src, "r", io) || !Shell.bit(src, "x", io) || !Shell.peutFouiller(src)){ erreur("rsync: [sender] opendir \"" + (prefixe || ".") + "\" failed: Permission denied (13)"); return; }
		// Comme rsync : les objets d'abord, puis les lieux, chacun suivi de son contenu ; par ordre alphabétique.
		var parNom = function(x, y){ return x.nom < y.nom ? -1 : (x.nom > y.nom ? 1 : 0); };
		var entrees = src.items.map(function(it){ return { nom: it.itemname, noeud: it }; }).sort(parNom)
			.concat(src.children.map(function(ch){ return { nom: ch.room_name, noeud: ch }; }).sort(parNom))
			.filter(function(e){ return !exclu(e.nom, prefixe + e.nom, e.noeud instanceof Room); });
		if (o.supprimer && dst){
			var noms = {};
			entrees.forEach(function(e){ noms[e.nom] = true; });
			var enTrop = dst.items.map(function(it){ return { nom: it.itemname, noeud: it }; }).concat(dst.children.map(function(ch){ return { nom: ch.room_name, noeud: ch }; }))
				.filter(function(e){ return !noms[e.nom] && !exclu(e.nom, prefixe + e.nom, e.noeud instanceof Room); })
				.sort(function(x, y){ return x.nom < y.nom ? 1 : -1; });
			enTrop.forEach(function(e){
				compter();
				var rel = prefixe + e.nom + (e.noeud instanceof Room ? "/" : "");
				if (!peutSupprimer(e.noeud) || (e.noeud instanceof Room && (e.noeud.items.length || e.noeud.children.length) && !o.n && !viderLieu(e.noeud, rel))){
					erreur("rsync: [generator] delete_file: unlink(" + rel + ") failed: Operation not permitted (1)");
					return;
				}
				liste.push("deleting " + rel);
				if (o.n) return;
				if (e.noeud instanceof Room){ dst.removeChild(e.noeud); GameEvents.fire({ type: "rmdir", room: e.noeud, parent: dst }); }
				else { dst.removeItem(e.noeud); GameEvents.fire({ type: "rm", item: e.noeud, room: dst, sudo: !!io.sudo }); }
			});
		}
		entrees.forEach(function(e){
			var rel = prefixe + e.nom;
			if (e.noeud instanceof Room){
				if (e.noeud === racineDestination || joueurEstDans(racineDestination, e.noeud)) return;
				var sous = dst ? dst.getNode(e.nom) : null;
				if (sous && !(sous instanceof Room)){ erreur("rsync: [receiver] cannot overwrite non-directory \"" + rel + "\""); return; }
				if (!sous){
					compter();
					if (dst && !Shell.bit(dst, "w", io)){ erreur("rsync: [receiver] recv_generator: mkdir \"" + rel + "\" failed: Permission denied (13)"); return; }
					liste.push(rel + "/");
					if (!o.n) sous = creerLieu(dst, e.nom, e.noeud);
				}
				synchroniser(e.noeud, sous, rel + "/", profondeur + 1);
			} else if (dst) copierObjet(e.noeud, dst, e.nom, rel);
			else { compter(); taille += tailleOctets(e.noeud); transfere += tailleOctets(e.noeud); liste.push(rel); }
		});
	};
	var viderLieu = function(lieu, rel){
		var ok = true;
		lieu.items.slice().forEach(function(it){ if (!peutSupprimer(it)) ok = false; });
		lieu.children.slice().forEach(function(ch){ if (!peutSupprimer(ch) || !viderLieu(ch, rel + ch.room_name + "/")) ok = false; });
		if (!ok) return false;
		lieu.items.slice().forEach(function(it){ liste.push("deleting " + rel + it.itemname); lieu.removeItem(it); });
		lieu.children.slice().forEach(function(ch){ liste.push("deleting " + rel + ch.room_name + "/"); lieu.removeChild(ch); });
		return true;
	};
	var joueurEstDans = function(lieu, ancetre){
		for (var l = lieu, g = 0; l && g++ < 100; l = l.parents[0]) if (l === ancetre) return true;
		return false;
	};
	// La destination : un lieu existant, ou à créer.
	var rd = Shell.versLieu(Shell.chercher(destination, io, "rsync"));
	var racineDestination = rd.node instanceof Room ? rd.node : null;
	var sourcesNoeuds = chemins.map(function(c){
		var r = Shell.chercher(c, io, "rsync");
		if (r.node === null){ erreur("rsync: [sender] change_dir \"" + c + "\" failed: No such file or directory (2)"); return null; }
		return { chemin: c, r: r, noeud: Shell.suivre(r.node, "rsync") };
	}).filter(function(s){ return s !== null; });
	// Les sources sont envoyées dans l'ordre alphabétique de leur nom, comme la liste de rsync.
	var nomDe = function(s){ return s.noeud instanceof Room ? s.noeud.room_name : s.noeud.itemname; };
	sourcesNoeuds.sort(function(x, y){ return nomDe(x) < nomDe(y) ? -1 : (nomDe(x) > nomDe(y) ? 1 : 0); });
	var besoinDossier = sourcesNoeuds.length > 1 || /\/$/.test(destination) || sourcesNoeuds.some(function(s){ return s.noeud instanceof Room && o.r; });
	var cree = false;
	if (rd.node === null && sourcesNoeuds.length && besoinDossier){
		Shell.nomValide(rd.name, "rsync");
		if (!Shell.bit(rd.dir, "w", io)) throw new ShellError("rsync: [Receiver] mkdir \"" + destination + "\" failed: Permission denied (13)");
		liste.push("created directory " + destination.replace(/\/$/, ""));
		cree = true;
		if (!o.n) racineDestination = creerLieu(rd.dir, rd.name, null);
	} else if (rd.node !== null && !(rd.node instanceof Room) && besoinDossier){
		throw new ShellError("rsync: ERROR: cannot stat destination \"" + destination + "\": Not a directory (20)");
	}
	sourcesNoeuds.forEach(function(s){
		var nom = s.noeud instanceof Room ? s.noeud.room_name : s.noeud.itemname;
		if (s.noeud instanceof Room){
			if (!o.r){ io.err("skipping directory " + s.chemin.replace(/\/$/, "")); return; }
			if (racineDestination && (s.noeud === racineDestination || joueurEstDans(racineDestination, s.noeud)) && /\/$/.test(s.chemin)){
				if (s.noeud === racineDestination) return;
			}
			if (/\/$/.test(s.chemin) || s.chemin === "." || s.chemin === ".."){
				if (cree || (racineDestination === null && o.n)) liste.push("./");
				synchroniser(s.noeud, racineDestination, "", 0);
			} else {
				var sous = racineDestination ? racineDestination.getNode(nom) : null;
				if (sous && !(sous instanceof Room)){ erreur("rsync: [receiver] cannot overwrite non-directory \"" + nom + "\""); return; }
				if (!sous){
					liste.push(nom + "/");
					if (!o.n && racineDestination) sous = creerLieu(racineDestination, nom, s.noeud);
				}
				synchroniser(s.noeud, sous, nom + "/", 0);
			}
		} else if (racineDestination){
			copierObjet(s.noeud, racineDestination, nom, nom);
		} else if (rd.node === null || rd.node instanceof Item){
			// Un seul objet vers un nom d'objet : la copie porte ce nom.
			copierObjet(s.noeud, rd.dir, rd.name, nom);
		} else if (o.n){
			taille += tailleOctets(s.noeud);
			liste.push(nom);
		}
	});
	if (code){
		io.err("rsync error: some files/attrs were not transferred (see previous errors) (code 23) at main.c(1338) [sender=3.2.7]");
		io.code = 23;
	}
	GameEvents.fire({ type: "rsync", src: chemins[0], dst: destination, sources: chemins, destination: destination, liste: liste.slice(),
		"delete": o.supprimer, dryRun: o.n, essai: o.n, supprime: o.supprimer, room: current_room });
	if (!o.v) return "";
	// Le bilan de rsync (les octets sont une estimation : ce monde n'a pas de réseau à mesurer).
	var milliers = function(x){ var t = String(x).split("."); t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return t.join("."); };
	var envoye = transfere + 40 * liste.length + 60, recu = 12 + 19 * liste.length;
	return ["sending incremental file list"].concat(liste, ["", "sent " + milliers(envoye) + " bytes  received " + milliers(recu) + " bytes  " + milliers(((envoye + recu) * 2).toFixed(2)) + " bytes/sec",
		"total size is " + milliers(taille) + "  speedup is " + (taille / (envoye + recu)).toFixed(2) + (o.n ? " (DRY RUN)" : "")]).join("\n");
};

/* ================================================================== */
/* Planification : at, atq, atrm, crontab -e, systemctl list-timers    */
/* ================================================================== */

/* Ce que le chapitre 4 garde dans la sauvegarde (state.arcanes) : les tâches de at, l'état des timers. */
function etatArcanes(){
	if (!state.arcanes || typeof state.arcanes !== "object") state.arcanes = {};
	if (!state.arcanes.at) state.arcanes.at = { suivant: 1, taches: [] };
	if (!state.arcanes.timers) state.arcanes.timers = {};
	return state.arcanes;
}

var JOURS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MOIS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* « Fri Oct 16 14:00:00 2026 », le format de at et atq. */
function dateAt(d){
	return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + deuxChiffres(d.getDate()) + " " +
		deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":00 " + d.getFullYear();
}

/*
 * Lit un moment, façon at ou date -d : « 14:00 », « 2pm », « tomorrow », « 2026-10-20 », « 12/24/2026 »,
 * « now + 10 minutes », « next monday », « 3 days ago », « @1700000000 »...
 * pourAt : les mots propres à at (noon, midnight, teatime, 1430, 24.12.2026), et une heure déjà passée
 * aujourd'hui désigne demain. Renvoie une Date, ou null si le texte n'est pas compris.
 */
function lireMoment(texte, pourAt){
	var mots = texte.toLowerCase().replace(/,/g, " ").trim().split(/\s+/).filter(function(m){ return m !== ""; });
	var d = new Date(), heureFixee = false, jourFixe = false;
	if (mots.length === 0) return null;
	var unites = { minute: 60000, minutes: 60000, min: 60000, mins: 60000, hour: 3600000, hours: 3600000, day: 86400000, days: 86400000,
		week: 604800000, weeks: 604800000, second: 1000, seconds: 1000, sec: 1000, secs: 1000, month: "mois", months: "mois", year: "an", years: "an",
		fortnight: 1209600000 };
	var jours = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
	var joursCourts = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
	var decaler = function(n, unite){
		if (unite === "mois") d.setMonth(d.getMonth() + n);
		else if (unite === "an") d.setFullYear(d.getFullYear() + n);
		else d = new Date(d.getTime() + n * unite);
	};
	var minuit = function(){ if (!heureFixee && !pourAt) d.setHours(0, 0, 0, 0); };
	var poserJour = function(an, mois, jour){
		if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return false;
		d.setFullYear(an, mois - 1, jour);
		if (d.getDate() !== jour) return false;
		minuit();
		jourFixe = true;
		return true;
	};
	for (var i = 0; i < mots.length; i++){
		var m = mots[i], r;
		if (m === "now" || m === "today") continue;
		if (m === "tomorrow"){ d.setDate(d.getDate() + 1); jourFixe = true; continue; }
		if (m === "yesterday"){ d.setDate(d.getDate() - 1); jourFixe = true; continue; }
		if (pourAt && m === "noon"){ d.setHours(12, 0, 0, 0); heureFixee = true; continue; }
		if (pourAt && m === "midnight"){ d.setHours(0, 0, 0, 0); heureFixee = true; continue; }
		if (pourAt && m === "teatime"){ d.setHours(16, 0, 0, 0); heureFixee = true; continue; }
		if (!pourAt && (r = /^@(-?\d+)$/.exec(m))){ d = new Date(parseInt(r[1], 10) * 1000); heureFixee = jourFixe = true; continue; }
		// Une heure : 14:00, 14:00:30, 2pm, 2:30pm, et pour at 1430.
		r = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(am|pm)?$/.exec(m);
		if (!r && (r = /^(\d{1,2})(am|pm)$/.exec(m))) r = [m, r[1], "00", undefined, r[2]];
		if (!r && pourAt && (r = /^(\d{2})(\d{2})$/.exec(m))) r = [m, r[1], r[2], undefined, undefined];
		if (r){
			var hh = parseInt(r[1], 10), mm = parseInt(r[2], 10);
			if (r[4] && (hh < 1 || hh > 12)) return null;
			if (r[4] === "pm" && hh < 12) hh += 12;
			if (r[4] === "am" && hh === 12) hh = 0;
			if (hh > 23 || mm > 59) return null;
			d.setHours(hh, mm, r[3] ? parseInt(r[3], 10) : 0, 0);
			heureFixee = true;
			continue;
		}
		// Une date : 2026-10-20, 12/24/2026 (mois/jour), et pour at 24.12.2026 (jour.mois).
		if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(m))){ if (!poserJour(+r[1], +r[2], +r[3])) return null; continue; }
		if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(m))){ if (!poserJour(+r[3], +r[1], +r[2])) return null; continue; }
		if (pourAt && (r = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(m))){ if (!poserJour(+r[3], +r[2], +r[1])) return null; continue; }
		if (m === "next" || m === "last" || m === "this"){
			var suivant = mots[i + 1] || "", sens = m === "last" ? -1 : 1;
			var idx = jours.indexOf(suivant) > -1 ? jours.indexOf(suivant) : joursCourts.indexOf(suivant);
			if (idx > -1){
				var ecart = (idx - d.getDay() + 7 * sens) % 7;
				if (ecart === 0 && m !== "this") ecart = 7 * sens;
				if (sens < 0 && ecart > 0) ecart -= 7;
				d.setDate(d.getDate() + ecart);
				minuit();
				jourFixe = true;
				i++;
				continue;
			}
			if (unites.hasOwnProperty(suivant)){ decaler(sens, unites[suivant]); i++; continue; }
			return null;
		}
		if (jours.indexOf(m) > -1 || joursCourts.indexOf(m) > -1){
			var cible = jours.indexOf(m) > -1 ? jours.indexOf(m) : joursCourts.indexOf(m);
			d.setDate(d.getDate() + ((cible - d.getDay() + 7) % 7));
			minuit();
			jourFixe = true;
			continue;
		}
		// Un décalage : « + 5 minutes », « +3 days », « 2 hours ago », « -1 day ».
		var signe = 1;
		if (m === "+" || m === "-"){ signe = m === "-" ? -1 : 1; i++; m = mots[i] || ""; }
		if ((r = /^([+-]?)(\d+)([a-z]*)$/.exec(m))){
			var n = parseInt(r[2], 10) * (r[1] === "-" ? -1 : 1) * signe;
			var unite = r[3] || mots[i + 1];
			if (!r[3]) i++;
			if (!unites.hasOwnProperty(unite)) return null;
			if (mots[i + 1] === "ago"){ n = -n; i++; }
			decaler(n, unites[unite]);
			continue;
		}
		if (unites.hasOwnProperty(m)){ decaler(signe, unites[m]); continue; }
		return null;
	}
	if (pourAt){
		d.setSeconds(0, 0);
		if (heureFixee && !jourFixe && d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
	}
	return d;
}

/* La file de at : les tâches dont l'heure est passée ont « tourné » et la quittent, comme sur un vrai système. */
function tachesAt(){
	var at = etatArcanes().at;
	var maintenant = Date.now();
	var parties = at.taches.filter(function(t){ return t.quand <= maintenant; });
	if (parties.length){
		at.taches = at.taches.filter(function(t){ return t.quand > maintenant; });
		parties.forEach(function(t){ GameEvents.fire({ type: "atExecutee", tache: t }); });
	}
	return at.taches;
}

Shell.sorts.at = function(args, io){
	var fichier = null, mots = [], liste = false, retirer = null, montrer = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-l"){ liste = true; continue; }
		if (a === "-r" || a === "-d"){ retirer = args.slice(i + 1); break; }
		if (a === "-c"){ montrer = args[++i]; continue; }
		if (a === "-f"){ fichier = args[++i]; if (fichier === undefined) throw new ShellError("at: option requires an argument -- 'f'"); continue; }
		if (a === "-m" || a === "-M" || a === "-v"){ continue; }
		if (/^-q/.test(a)){ if (a === "-q") i++; continue; }
		if (a.charAt(0) === "-" && !/^-\d/.test(a)) throw new ShellError("at: invalid option -- '" + a.charAt(1) + "'" + astuce(io, "Celles qui existent ici : -f FICHIER, -l, -r N, -c N"));
		mots.push(a);
	}
	if (liste) return Shell.sorts.atq([], io);
	if (retirer !== null) return Shell.sorts.atrm(retirer, io);
	if (montrer !== null){
		var t = tachesAt().filter(function(x){ return String(x.n) === String(montrer); })[0];
		if (!t) throw new ShellError("Cannot find jobid " + montrer);
		var uid = UTILISATEURS[t.user] !== undefined ? UTILISATEURS[t.user] : 1000;
		return "#!/bin/sh\n# atrun uid=" + uid + " gid=" + uid + "\n# mail " + t.user + " 0\numask 22\ncd " + t.dossier +
			" || {\n\t echo 'Execution directory inaccessible' >&2\n\t exit 1\n}\n" + t.commande;
	}
	if (mots.length === 0) throw new ShellError("Garbled time" + astuce(io, "at a besoin d'une heure : echo \"commande\" | at 14:00, ou at now + 10 minutes"));
	var quand = lireMoment(mots.join(" "), true);
	if (quand === null){
		throw new ShellError("syntax error. Last token seen: " + mots[mots.length - 1] + "\nGarbled time" +
			astuce(io, "Heures comprises : 14:00, 9am, noon, midnight, teatime, now + 10 minutes, now + 2 hours, tomorrow, 14:00 tomorrow, 2026-12-24"));
	}
	if (quand.getTime() < Date.now() - 60000) throw new ShellError("at: refusing to create job destined in the past");
	var commande = fichier !== null ? texteSource(fichier, io, "at") : io.stdin;
	if (commande === null){
		if (!io.tty || !term.demander){
			throw new ShellError("at : quelle commande planifier ? at la lit sur son entrée standard." +
				astuce(io, "Exemple : echo \"tar -czf sauvegarde.tgz notes\" | at 23:00, ou at -f script.sh now + 1 hour"));
		}
		// Sans tuyau, at demande les commandes une à une (invite « at> ») ; une ligne vide termine (le Ctrl+D du vrai at).
		var lues = [], sudo = !!io.sudo;
		var demander = function(){
			term.demander("at> ", false, function(reponse){
				if (reponse !== null && reponse !== undefined && reponse.trim() !== "" && lues.length < 20){ lues.push(reponse); demander(); return; }
				term.echo("at> <EOT>");
				if (lues.length === 0) term.echo(C.gris("(Aucune commande : rien n'est planifié.)"));
				else {
					try {
						term.echo(planifierAt(quand, lues.join("\n"), sudo));
					} catch (e){
						if (!(e instanceof ShellError)) throw e;
						term.echo(e.message);
					}
				}
				Shell.fin();
			});
		};
		if (io.tty) term.echo(C.gris("(Écris les commandes à lancer, une par ligne ; une ligne vide pour finir, comme Ctrl+D.)"));
		demander();
		return "";
	}
	if (lignesDe(commande).length === 0) throw new ShellError("at : la commande à planifier est vide.");
	// Comme le vrai at, l'accusé de réception part sur la sortie d'erreur.
	io.err(planifierAt(quand, commande, !!io.sudo));
	return "";
};

/* Range une tâche dans la file de at ; renvoie l'accusé de réception du vrai at. */
function planifierAt(quand, commande, sudo){
	var at = etatArcanes().at;
	tachesAt();
	if (at.taches.length >= 50) throw new ShellError("at : 50 tâches en attente, c'est le maximum dans ce monde. atq les liste, atrm les retire.");
	var tache = { n: at.suivant++, quand: quand.getTime(), commande: commande.replace(/\n$/, ""), user: sudo ? "root" : JOUEUR,
		dossier: Shell.cheminAffiche(current_room), hote: Shell.hote() };
	at.taches.push(tache);
	GameEvents.fire({ type: "at", tache: tache, quand: tache.quand, commande: tache.commande, room: current_room });
	return "warning: commands will be executed using /bin/sh\njob " + tache.n + " at " + dateAt(quand);
}

Shell.sorts.atq = function(args, io){
	if (args.some(function(a){ return a.charAt(0) === "-" && a !== "-q"; })) throw new ShellError("atq : option inconnue. Utilisation : atq");
	// Chacun ne voit que ses tâches ; root (sudo atq) les voit toutes.
	var qui = io.sudo ? null : JOUEUR;
	var lignes = tachesAt().filter(function(t){ return qui === null || t.user === qui; })
		.sort(function(a, b){ return a.quand - b.quand || a.n - b.n; })
		.map(function(t){ return t.n + "\t" + dateAt(new Date(t.quand)) + " a " + t.user; });
	GameEvents.fire({ type: "atq", nombre: lignes.length });
	return lignes.join("\n");
};

Shell.sorts.atrm = function(args, io){
	if (args.length === 0) throw new ShellError("Usage: at [-V] [-q x] [-f file] [-u username] [-mMlbv] timespec ..." + astuce(io, "atrm N retire la tâche numéro N : atq donne les numéros"));
	var at = etatArcanes().at, erreurs = [];
	tachesAt();
	args.forEach(function(n){
		var t = at.taches.filter(function(x){ return String(x.n) === n; })[0];
		if (!t){ erreurs.push("Cannot find jobid " + n); return; }
		if (t.user !== JOUEUR && !io.sudo){ erreurs.push("atrm: Not owner of job " + n); return; }
		at.taches.splice(at.taches.indexOf(t), 1);
		GameEvents.fire({ type: "atrm", tache: t });
	});
	if (erreurs.length){ erreurs.forEach(function(e){ io.err(e); }); io.code = 1; }
	return "";
};

/* --- crontab : -e (l'éditeur), crontab FICHIER, crontab - --- */

var CRON_CHAMPS = [
	{ nom: "minute", min: 0, max: 59 }, { nom: "hour", min: 0, max: 23 }, { nom: "day-of-month", min: 1, max: 31 },
	{ nom: "month", min: 1, max: 12, noms: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] },
	{ nom: "day-of-week", min: 0, max: 7, noms: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] }];
var CRON_MOTS = ["@reboot", "@yearly", "@annually", "@monthly", "@weekly", "@daily", "@midnight", "@hourly"];

/* Un champ de cron (« * », « *\/5 », « 1-5 », « 0,30 », « mon-fri », « 1-10/2 ») est-il valide ? */
function champCronValide(texte, champ){
	return texte.split(",").every(function(morceau){
		var m = /^([^\/]+)(?:\/(\d+))?$/.exec(morceau);
		if (!m) return false;
		if (m[2] !== undefined && parseInt(m[2], 10) < 1) return false;
		if (m[1] === "*") return true;
		var valeur = function(v){
			if (/^\d+$/.test(v)) return parseInt(v, 10);
			var i = champ.noms ? champ.noms.indexOf(v.toLowerCase()) : -1;
			return i === -1 ? null : i + (champ.nom === "month" ? 1 : 0);
		};
		var bornes = m[1].split("-");
		if (bornes.length > 2) return false;
		var a = valeur(bornes[0]), b = bornes.length === 2 ? valeur(bornes[1]) : a;
		if (a === null || b === null || a < champ.min || b > champ.max || a > champ.max || b < champ.min || a > b) return false;
		// Un pas sans plage (« 5/10 ») n'existe pas : il faut « *\/10 » ou « 5-59/10 ».
		if (m[2] !== undefined && bornes.length === 1) return false;
		return true;
	});
}

/* Vérifie une crontab entière ; renvoie { lignes, erreurs } (les commentaires et lignes vides ne sont pas gardés). */
function verifierCrontab(texte, source){
	var gardees = [], erreurs = [];
	lignesDe(texte).forEach(function(ligne, k){
		var propre = ligne.trim();
		if (propre === "" || propre.charAt(0) === "#") return;
		if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(propre)){ gardees.push(propre); return; }
		var mots = propre.split(/\s+/);
		var ou = "\"" + source + "\":" + (k + 1) + ": ";
		if (mots[0].charAt(0) === "@"){
			if (CRON_MOTS.indexOf(mots[0]) === -1) erreurs.push(ou + "bad time specifier");
			else if (mots.length < 2) erreurs.push(ou + "bad command");
			else gardees.push(propre);
			return;
		}
		for (var c = 0; c < 5; c++){
			if (mots[c] === undefined || !champCronValide(mots[c], CRON_CHAMPS[c])){
				erreurs.push(ou + "bad " + CRON_CHAMPS[c].nom);
				return;
			}
		}
		if (mots.length < 6){ erreurs.push(ou + "bad command"); return; }
		gardees.push(propre);
	});
	return { lignes: gardees, erreurs: erreurs };
}

var AIDE_CRON = "Une ligne : minute heure jour mois jour_de_la_semaine commande. Exemples : « *\/5 * * * * cmd » toutes les 5 minutes,\n" +
	" « 0 7 * * 1-5 cmd » à 7 h du lundi au vendredi, « 30 2 1 * * cmd » le 1er du mois à 2 h 30, « @daily cmd » une fois par jour.";

/* Installe une crontab vérifiée. Prévient les quêtes : crontabModifiee toujours, et crontab quand une tâche a disparu. */
function installerCrontab(utilisateur, texte, source, io, action){
	var v = verifierCrontab(texte, source);
	if (v.erreurs.length){
		throw new ShellError(v.erreurs.join("\n") + "\nerrors in crontab file, can't install." + astuce(io, AIDE_CRON));
	}
	var avant = (state.cron[utilisateur] || []).slice();
	state.cron[utilisateur] = v.lignes;
	GameEvents.fire({ type: "crontabModifiee", user: utilisateur, action: action, avant: avant, apres: v.lignes.slice() });
	if (avant.some(function(l){ return v.lignes.indexOf(l) === -1; })) GameEvents.fire({ type: "crontab", user: utilisateur, action: action });
	return v.lignes;
}

var CRONTAB_AVANT_ARCANES = Shell.sorts.crontab;
Shell.sorts.crontab = function(args, io){
	var utilisateur = io.sudo ? "root" : JOUEUR, action = null, fichier = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-u"){
			i++;
			if (args[i] === undefined) throw new ShellError("crontab : -u attend un nom d'utilisateur");
			utilisateur = args[i];
			if (utilisateur !== JOUEUR && !io.sudo){
				throw new ShellError("crontab : il faut les pouvoirs de root pour utiliser -u" +
					astuce(io, "La crontab d'un autre ne se lit qu'avec sudo : sudo crontab -u " + utilisateur + " -l"));
			}
		} else if (a === "-l" || a === "-r" || a === "-e") action = a;
		else if (a === "-i") continue;
		else if (a.charAt(0) !== "-" || a === "-") fichier = a;
		else return CRONTAB_AVANT_ARCANES.apply(this, arguments);
	}
	// -l et -r : la version d'origine (SortsAvances.js) s'en charge.
	if (action === "-l" || action === "-r") return CRONTAB_AVANT_ARCANES.apply(this, arguments);
	if (action === null && fichier === null){
		if (io.stdin === null) return CRONTAB_AVANT_ARCANES.apply(this, arguments);
		fichier = "-";
	}
	if (!UTILISATEURS.hasOwnProperty(utilisateur)) throw new ShellError("crontab : utilisateur « " + utilisateur + " » inconnu");
	if (action === "-e"){
		if (!io.tty) throw new ShellError("crontab : -e ouvre un éditeur, il lui faut un écran : pas de tuyau ni de redirection.");
		if (!term.editer) throw new ShellError("crontab : l'éditeur n'est pas disponible ici.");
		var actuelles = state.cron[utilisateur] || [];
		var texteInitial = actuelles.length ? actuelles.join("\n") + "\n" :
			"# Une tâche par ligne : minute heure jour mois jour_de_la_semaine commande\n# Exemple : */5 * * * * /usr/bin/sauvegarder\n";
		var editeur = state.knows("vim") && (state.env.EDITOR === "vim" || state.env.VISUAL === "vim") ? "vim" : "nano";
		var sudo = !!io.sudo, titre = "/tmp/crontab." + utilisateur + "/crontab", enregistre = null;
		// Comme le vrai crontab -e : la crontab est installée quand on quitte l'éditeur, avec le dernier texte enregistré.
		term.editer({ titre: titre, texte: texteInitial, mode: editeur, quitter: function(){
			if (enregistre === null || enregistre === texteInitial){ term.echo("crontab: no changes made to crontab"); Shell.fin(); return; }
			try {
				installerCrontab(utilisateur, enregistre, titre, { tty: true, sudo: sudo }, "e");
				term.echo("crontab: installing new crontab");
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				term.echo(e.message + "\n" + C.gris("(Ta crontab n'a pas changé. Relance crontab -e pour corriger.)"));
			}
			Shell.fin();
		} }, function(nouveau){
			if (nouveau !== null) enregistre = nouveau;
		});
		return "";
	}
	var texte = fichier === "-" ? (io.stdin === null ? "" : io.stdin) : texteSource(fichier, io, "crontab");
	var lignes = installerCrontab(utilisateur, texte, fichier, io, "install");
	return io.tty ? C.gris("(crontab de " + utilisateur + " installée : " + lignes.length + " tâche" + (lignes.length > 1 ? "s" : "") + ". crontab -l pour la relire.)") : "";
};

/* --- Les timers de systemd --- */

/*
 * Les timers connus, machine par machine : TIMERS_DECLARES[hote][nom]. L'hôte « * » vaut pour toutes les machines.
 * Un chapitre en déclare d'autres avec declarerTimer(hote, nom, { OnCalendar, Unit, Description, Documentation,
 * dernier, prochain, actif, enabled }) : dernier et prochain (Date, nombre de millisecondes ou texte « 2026-10-16 02:30 »)
 * remplacent ce que le calendrier calculerait ; actif (il attend son heure) et enabled (relancé au démarrage) valent vrai par défaut.
 */
var TIMERS_DECLARES = {};
function declarerTimer(hote, nom, def){
	nom = String(nom).replace(/\.timer$/, "");
	def = def || {};
	if (!TIMERS_DECLARES[hote]) TIMERS_DECLARES[hote] = {};
	TIMERS_DECLARES[hote][nom] = {
		nom: nom, calendrier: def.OnCalendar || "daily", unite: def.Unit || nom + ".service",
		description: def.Description || nom + ".timer", doc: def.Documentation || "",
		dernier: def.dernier === undefined ? null : def.dernier, prochain: def.prochain === undefined ? null : def.prochain,
		actif: def.actif === undefined ? true : !!def.actif, enabled: def.enabled === undefined ? true : !!def.enabled,
		fichier: def.fichier || (hote === "*" ? "/usr/lib/systemd/system/" : "/etc/systemd/system/") + nom + ".timer"
	};
	return TIMERS_DECLARES[hote][nom];
}
declarerTimer("*", "logrotate", { OnCalendar: "daily", Description: "Daily rotation of log files", Documentation: "man:logrotate(8) man:logrotate.conf(5)" });
declarerTimer("*", "apt-daily", { OnCalendar: "*-*-* 6,18:00", Description: "Daily apt download activities" });
declarerTimer("*", "man-db", { OnCalendar: "daily", Description: "Daily man-db regeneration", Documentation: "man:mandb(8)" });
declarerTimer("*", "fstrim", { OnCalendar: "weekly", Description: "Discard unused filesystem blocks once a week", Documentation: "man:fstrim" });
declarerTimer("*", "systemd-tmpfiles-clean", { OnCalendar: "daily", Description: "Daily Cleanup of Temporary Directories", Documentation: "man:tmpfiles.d(5) man:systemd-tmpfiles(8)" });

/* Les timers de la machine où l'on est (ceux de « * », et les siens, qui l'emportent). */
function timersDe(hote){
	var tous = {}, k;
	for (k in TIMERS_DECLARES["*"]) tous[k] = TIMERS_DECLARES["*"][k];
	if (TIMERS_DECLARES[hote]) for (k in TIMERS_DECLARES[hote]) tous[k] = TIMERS_DECLARES[hote][k];
	return Object.keys(tous).sort().map(function(n){ return tous[n]; });
}

/* L'état d'un timer (actif, enabled), gardé dans la sauvegarde dès qu'on y touche. */
function etatTimer(hote, timer){
	var cle = hote + ":" + timer.nom, t = etatArcanes().timers;
	return t[cle] || { actif: timer.actif, enabled: timer.enabled };
}
function changerTimer(hote, timer, changement){
	var cle = hote + ":" + timer.nom, t = etatArcanes().timers;
	t[cle] = t[cle] || { actif: timer.actif, enabled: timer.enabled };
	for (var k in changement) t[cle][k] = changement[k];
	return t[cle];
}

/*
 * Un calendrier de systemd (OnCalendar) : « daily », « weekly », « hourly », « monthly », « *-*-* 06:00 »,
 * « Mon..Fri *-*-* 7:30 », « *:0/15 », « *-*-01 02:00:00 ». Renvoie une fonction (instant, sens) qui donne le
 * déclenchement suivant (sens 1) ou précédent (sens -1), ou null si le calendrier n'est pas compris.
 */
function calendrierSystemd(texte){
	var raccourcis = { minutely: "*-*-* *:*:00", hourly: "*-*-* *:00:00", daily: "*-*-* 00:00:00", weekly: "Mon *-*-* 00:00:00",
		monthly: "*-*-01 00:00:00", yearly: "*-01-01 00:00:00", annually: "*-01-01 00:00:00", quarterly: "*-01,04,07,10-01 00:00:00" };
	texte = raccourcis[texte] || texte;
	var mots = texte.trim().split(/\s+/), joursSemaine = null, date = "*-*-*", heure = "00:00:00";
	var noms = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
	if (mots.length && /^[A-Za-z]/.test(mots[0])){
		joursSemaine = [];
		var ok = mots.shift().toLowerCase().split(",").every(function(p){
			var b = p.split("..").map(function(x){ return noms.indexOf(x.substring(0, 3)); });
			if (b.some(function(x){ return x < 0; })) return false;
			for (var j = b[0]; ; j = (j + 1) % 7){ joursSemaine.push(j); if (j === b[b.length - 1]) break; }
			return true;
		});
		if (!ok) return null;
	}
	mots.forEach(function(m){ if (m.indexOf(":") > -1) heure = m; else date = m; });
	// Un champ : * ; 5 ; 1,15 ; 0/15 (de 0 en 0 par pas de 15) ; 1..5
	var champ = function(t, min, max){
		if (t === "*") return null;
		var valeurs = [], bon = t.split(",").every(function(p){
			var m = /^(\d+)(?:\.\.(\d+))?(?:\/(\d+))?$/.exec(p) || (/^\*\/(\d+)$/.test(p) && [p, String(min), String(max), /^\*\/(\d+)$/.exec(p)[1]]);
			if (!m) return false;
			var de = parseInt(m[1], 10), a = m[2] !== undefined ? parseInt(m[2], 10) : (m[3] !== undefined ? max : de), pas = m[3] !== undefined ? parseInt(m[3], 10) : 1;
			if (pas < 1 || de < min || a > max) return false;
			for (var v = de; v <= a; v += pas) valeurs.push(v);
			return true;
		});
		return bon ? valeurs : undefined;
	};
	var d = date.split("-"), h = heure.split(":");
	if (d.length !== 3 || h.length < 2 || h.length > 3) return null;
	var annees = champ(d[0], 1970, 2200), moisV = champ(d[1], 1, 12), joursV = champ(d[2], 1, 31);
	var heures = champ(h[0], 0, 23), minutes = champ(h[1], 0, 59);
	if ([annees, moisV, joursV, heures, minutes].some(function(x){ return x === undefined; })) return null;
	var dans = function(liste, v){ return liste === null || liste.indexOf(v) > -1; };
	var toutes = function(liste, max){ if (liste !== null) return liste; var t = []; for (var v = 0; v <= max; v++) t.push(v); return t; };
	var lesHeures = toutes(heures, 23), lesMinutes = toutes(minutes, 59);
	return function(instant, sens){
		var jour = new Date(instant.getTime());
		jour.setHours(0, 0, 0, 0);
		for (var n = 0; n < 1500; n++, jour.setDate(jour.getDate() + sens)){
			if (!dans(annees, jour.getFullYear()) || !dans(moisV, jour.getMonth() + 1) || !dans(joursV, jour.getDate())) continue;
			if (joursSemaine !== null && joursSemaine.indexOf(jour.getDay()) === -1) continue;
			var hs = sens > 0 ? lesHeures : lesHeures.slice().reverse(), ms = sens > 0 ? lesMinutes : lesMinutes.slice().reverse();
			for (var a = 0; a < hs.length; a++){
				for (var b = 0; b < ms.length; b++){
					var t = new Date(jour.getTime());
					t.setHours(hs[a], ms[b], 0, 0);
					if (sens > 0 ? t > instant : t < instant) return t;
				}
			}
		}
		return null;
	};
}

/* Une date donnée par un chapitre : Date, millisecondes, ou texte. */
function enDate(v){
	if (v === null || v === undefined) return null;
	if (v instanceof Date) return v;
	if (typeof v === "number") return new Date(v);
	var d = lireMoment(String(v), false);
	return d || new Date(String(v));
}

/* Le prochain et le dernier déclenchement d'un timer. */
function declenchementsTimer(timer, maintenant){
	var calcul = calendrierSystemd(timer.calendrier);
	return {
		prochain: enDate(timer.prochain) || (calcul ? calcul(maintenant, 1) : null),
		dernier: enDate(timer.dernier) || (calcul ? calcul(maintenant, -1) : null)
	};
}

function dateSystemd(d){
	if (!d) return "-";
	var decalage = -d.getTimezoneOffset();
	var zone = decalage === 120 ? "CEST" : (decalage === 60 ? "CET" : (decalage === 0 ? "UTC" : (decalage > 0 ? "+" : "-") + deuxChiffres(Math.floor(Math.abs(decalage) / 60)) + deuxChiffres(Math.abs(decalage) % 60)));
	return JOURS_EN[d.getDay()] + " " + d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " +
		deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + zone;
}

/* « 2h 13min », « 41min », « 1 day 3h » : une durée comme systemd l'écrit. */
function dureeSystemd(ms){
	var min = Math.max(0, Math.round(ms / 60000));
	if (min < 1) return Math.max(0, Math.round(ms / 1000)) + "s";
	var j = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), mm = min % 60;
	if (j) return j + " day" + (j > 1 ? "s" : "") + (h ? " " + h + "h" : "");
	return (h ? h + "h" + (mm ? " " : "") : "") + (mm ? mm + "min" : "");
}

function tableauAligne(lignes){
	var largeurs = [];
	lignes.forEach(function(l){ l.forEach(function(c, k){ largeurs[k] = Math.max(largeurs[k] || 0, c.length); }); });
	return lignes.map(function(l){
		return l.map(function(c, k){ return k === l.length - 1 ? c : completerDroite(c, largeurs[k] + 1); }).join("").replace(/\s+$/, "");
	}).join("\n");
}

/* systemctl list-timers, et systemctl status/cat/start/stop/enable/disable/is-active/is-enabled NOM.timer. */
function systemctlTimers(mots, args, io){
	var action = mots[0], maintenant = new Date(), hote = Shell.hote();
	if (action === "list-timers"){
		var tous = args.indexOf("--all") > -1 || args.indexOf("-a") > -1;
		var rangees = [];
		timersDe(hote).forEach(function(t){
			var e = etatTimer(hote, t);
			if (!e.actif && !tous) return;
			var dd = declenchementsTimer(t, maintenant);
			var prochain = e.actif ? dd.prochain : null, dernier = dd.dernier;
			rangees.push({ quand: prochain ? prochain.getTime() : Infinity, cellules: [prochain ? dateSystemd(prochain) : "-", prochain ? dureeSystemd(prochain - maintenant) : "-",
				dernier ? dateSystemd(dernier) : "-", dernier ? dureeSystemd(maintenant - dernier) + " ago" : "-", t.nom + ".timer", t.unite] });
		});
		// Les plus proches d'abord, comme systemd ; ceux qui n'ont pas de prochain déclenchement à la fin.
		rangees.sort(function(a, b){ return a.quand - b.quand || (a.cellules[4] < b.cellules[4] ? -1 : 1); });
		GameEvents.fire({ type: "timer", action: "list-timers", hote: hote, nombre: rangees.length });
		GameEvents.fire({ type: "systemctl", action: "list-timers", host: hote });
		return tableauAligne([["NEXT", "LEFT", "LAST", "PASSED", "UNIT", "ACTIVATES"]].concat(rangees.map(function(r){ return r.cellules; }))) +
			"\n\n" + rangees.length + " timers listed." + (tous ? "" : "\nPass --all to see loaded but inactive timers, too.");
	}
	var nom = (mots[1] || "").replace(/\.timer$/, "");
	var t = timersDe(hote).filter(function(x){ return x.nom === nom; })[0];
	if (!t){
		if (action === "status" || action === "cat") throw new ShellError("Unit " + nom + ".timer could not be found.", 4);
		throw new ShellError("Failed to " + action + " " + nom + ".timer: Unit " + nom + ".timer not loaded.");
	}
	var e = etatTimer(hote, t);
	if (action === "status"){
		GameEvents.fire({ type: "timer", action: "status", nom: t.nom, hote: hote });
		GameEvents.fire({ type: "systemctl", action: "status", host: hote, service: t.nom + ".timer" });
		var dd = declenchementsTimer(t, maintenant);
		var depuis = new Date(maintenant.getTime() - 3 * 3600000 - 26 * 60000);
		var docs = t.doc ? t.doc.split(" ") : [];
		if (!e.actif) io.code = 3;
		return (e.actif ? (io.tty ? C.vert("●") : "●") : "○") + " " + t.nom + ".timer - " + t.description + "\n" +
			"     Loaded: loaded (" + t.fichier + "; " + (e.enabled ? "enabled" : "disabled") + "; preset: enabled)\n" +
			"     Active: " + (e.actif ? (io.tty ? C.vert("active (waiting)") : "active (waiting)") + " since " + dateSystemd(depuis) + "; " + dureeSystemd(maintenant - depuis) + " ago" : "inactive (dead)") + "\n" +
			(e.actif && dd.prochain ? "    Trigger: " + dateSystemd(dd.prochain) + "; " + dureeSystemd(dd.prochain - maintenant) + " left\n" : "    Trigger: n/a\n") +
			"   Triggers: ● " + t.unite +
			(docs.length ? "\n       Docs: " + docs.join("\n             ") : "");
	}
	if (action === "cat"){
		return "# " + t.fichier + "\n[Unit]\nDescription=" + t.description + (t.doc ? "\nDocumentation=" + t.doc : "") + "\n\n[Timer]\nOnCalendar=" + t.calendrier +
			(t.unite !== t.nom + ".service" ? "\nUnit=" + t.unite : "") + "\nPersistent=true\n\n[Install]\nWantedBy=timers.target";
	}
	if (["start", "stop", "enable", "disable", "restart"].indexOf(action) > -1){
		if (!io.sudo) throw new ShellError("Failed to " + action + " " + t.nom + ".timer: Access denied" + astuce(io, "Gérer les timers est réservé à root : sudo systemctl " + action + " " + t.nom + ".timer"));
		var aussi = args.indexOf("--now") > -1;
		if (action === "start" || action === "restart") changerTimer(hote, t, { actif: true });
		if (action === "stop") changerTimer(hote, t, { actif: false });
		if (action === "enable") changerTimer(hote, t, aussi ? { enabled: true, actif: true } : { enabled: true });
		if (action === "disable") changerTimer(hote, t, aussi ? { enabled: false, actif: false } : { enabled: false });
		GameEvents.fire({ type: "timer", action: action, nom: t.nom, hote: hote, now: aussi });
		GameEvents.fire({ type: "systemctl", action: action, host: hote, service: t.nom + ".timer" });
		if (action === "enable") return "Created symlink /etc/systemd/system/timers.target.wants/" + t.nom + ".timer → " + t.fichier + ".";
		if (action === "disable") return "Removed \"/etc/systemd/system/timers.target.wants/" + t.nom + ".timer\".";
		return "";
	}
	if (action === "is-active"){ if (!e.actif) io.code = 3; return e.actif ? "active" : "inactive"; }
	if (action === "is-enabled"){ if (!e.enabled) io.code = 1; return e.enabled ? "enabled" : "disabled"; }
	throw new ShellError("systemctl " + action + " : cette action ne s'applique pas à un timer ici. Celles qui existent : list-timers, status, cat, start, stop, enable, disable, is-active, is-enabled");
}

/* systemctl : les timers d'abord, sinon la version précédente (celle des chapitres et de l'épreuve), lue à l'appel. */
var SYSTEMCTL_AVANT_ARCANES = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (mots[0] === "list-timers" || (mots[1] && /\.timer$/.test(mots[1]))) return systemctlTimers(mots, args, io);
	return SYSTEMCTL_AVANT_ARCANES.apply(this, arguments);
};

/* --- date -d : une autre date que maintenant --- */

var DATE_AVANT_ARCANES = Shell.sorts.date;
Shell.sorts.date = function(args, io){
	var texte = null, reste = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-d" || args[i] === "--date"){ texte = args[++i]; if (texte === undefined) throw new ShellError("date: option requires an argument -- 'd'"); continue; }
		if (/^--date=/.test(args[i])){ texte = args[i].substring(7); continue; }
		if (/^-d./.test(args[i])){ texte = args[i].substring(2); continue; }
		reste.push(args[i]);
	}
	if (texte === null) return DATE_AVANT_ARCANES.apply(this, arguments);
	var d = lireMoment(texte, false);
	if (d === null || isNaN(d.getTime())){
		throw new ShellError("date: invalid date ‘" + texte + "’" +
			astuce(io, "Exemples : date -d tomorrow, date -d \"3 days ago\", date -d \"next monday\", date -d \"2026-12-24 18:00\", date -d @0"));
	}
	if (reste.length && reste[0].charAt(0) !== "+") throw new ShellError("date: extra operand ‘" + reste[0] + "’");
	GameEvents.fire({ type: "date", relative: texte });
	return formaterDate(d, reste);
};

/* ================================================================== */
/* Le manuel                                                           */
/* ================================================================== */

MANUEL["jq"] = page("lire, filtrer et transformer du JSON", "le couteau suisse du JSON",
	"Le JSON est le format des API, des journaux modernes et des fichiers de configuration :\n" +
	"des objets {\"clé\": valeur}, des tableaux [1, 2, 3], des chaînes, des nombres, true, false, null.\n" +
	"jq lit du JSON (un objet, ou ce qui arrive par un tuyau) et lui applique un FILTRE.\n" +
	"Le filtre s'écrit toujours entre apostrophes, pour que le terminal n'y touche pas.\n\n" +
	"Se déplacer dans le JSON :\n" +
	"  jq . f.json                     le JSON, joliment indenté (et vérifié : une faute, et jq la signale)\n" +
	"  jq '.nom' f.json                un champ ;  .adresse.ville : un champ dans un champ\n" +
	"  jq '.[0]' f.json                le premier élément d'un tableau (.[-1] : le dernier, .[1:3] : une tranche)\n" +
	"  jq '.[]' f.json                 chaque élément, un par ligne\n" +
	"  jq '.[] | .nom' f.json          le tuyau | passe chaque résultat au filtre suivant (.[].nom pareil)\n\n" +
	"Choisir, transformer, compter :\n" +
	"  jq '.[] | select(.age > 18)'            ne garder que ce qui répond à une condition (and, or, not, ==, !=)\n" +
	"  jq 'map(.prix) | add'                    transformer chaque élément, puis additionner\n" +
	"  jq '{nom, ville: .adresse.ville}'        construire un nouvel objet ;  [ ... ] : un nouveau tableau\n" +
	"  jq 'length', 'keys', 'sort_by(.age)', 'group_by(.classe)', 'unique', 'min', 'max', 'to_entries'\n" +
	"  jq '.mail // \"aucun\"'                   une valeur par défaut quand le champ manque (null)\n" +
	"  jq 'if .actif then .nom else empty end'  un choix ;  .age += 1, del(.mdp) : modifier une copie\n" +
	"  jq -r '.[] | \"\\(.nom) a \\(.age) ans\"'   une phrase avec des valeurs dedans\n" +
	"  jq -r '.[] | [.nom, .age] | @csv'        une ligne de CSV (@tsv : séparée par des tabulations)\n\n" +
	"Options :\n" +
	"  -r   les chaînes sans guillemets (pour les passer à d'autres sorts)\n" +
	"  -c   un résultat par ligne, compact      -S   les clés des objets triées\n" +
	"  -n   ne rien lire : jq -n '1 + 2'        -s   tout lire dans un seul tableau (un journal ligne par ligne)\n" +
	"  -e   le code de retour dit si le dernier résultat est vrai\n" +
	"  --arg NOM VALEUR    une variable $NOM (une chaîne) ;  --argjson NOM 42 : une valeur JSON\n\n" +
	"Exemples :\n" +
	"  jq -r '.[] | select(.niveau == \"warn\") | .ip' journal.json | sort | uniq -c\n" +
	"  jq --arg qui Ada '.[] | select(.nom == $qui)' eleves.json\n" +
	"  curl -s http://api/eleves | jq '.[] | select(.actif) | .email'\n\n" +
	"Une erreur (« Cannot index string with string \"nom\" ») dit ce que jq avait sous la main : ici une chaîne,\n" +
	"là où le filtre attendait un objet. Remonte le tuyau d'un cran pour voir ce qui arrive vraiment.");

MANUEL["xargs"] = page("transformer des lignes en arguments pour un autre sort", "eXtended ARGumentS",
	"Beaucoup de sorts (rm, cat, chmod, touch...) ne lisent pas leur entrée standard : ils veulent\n" +
	"des arguments. xargs fait le pont : il lit des mots sur le tuyau et les donne à la commande.\n\n" +
	"  find . -name \"*.tmp\" | xargs rm         efface tout ce que find a trouvé\n" +
	"  cat liste.txt | xargs -n 1 echo         une commande par mot (-n 2 : deux mots à la fois)\n" +
	"  ls | xargs -I {} cp {} {}.bak           {} est remplacé par chaque ligne, une commande par ligne\n" +
	"  ... | xargs -t rm                       -t écrit chaque commande avant de la lancer\n" +
	"  ... | xargs -r rm                       -r : ne rien lancer si rien n'arrive\n" +
	"  ... | xargs -L 1 echo                   une commande par ligne d'entrée\n" +
	"  ... | xargs -d , -n 1 echo              les éléments sont séparés par une virgule\n" +
	"  find . -print0 | xargs -0 rm            noms séparés par des caractères nuls (espaces sans danger)\n\n" +
	"Avec les pleins pouvoirs : ... | sudo xargs rm, ou ... | xargs sudo rm (si sudo connaît déjà ton mot de passe).\n" +
	"Sans commande, xargs lance echo : cat f | xargs met tout sur une ligne.\n" +
	"Les apostrophes et les guillemets comptent pour xargs : un nom comme « l'épée » le fait trébucher.\n" +
	"Prudence : regarde d'abord la liste (sans xargs, ou avec -t) avant un rm.");

MANUEL["find"].page += "\n\nPour aller plus loin :\n" +
	"  find . -iname \"*.LOG\"       sans tenir compte des majuscules ;  -path \"*/journaux/*\" : sur tout le chemin\n" +
	"  find . -type l              les raccourcis ;  -user root : ce qui appartient à root ;  -perm -4000 : les objets SUID\n" +
	"  find . -mtime -1            modifié il y a moins d'un jour ;  -mmin -10 : moins de 10 minutes ;  -newer OBJET\n" +
	"  find . -size +1k            plus de 1 Kio (c : octets, k, M) ;  -size -100c : moins de 100 octets\n" +
	"  find . -empty               les objets vides et les lieux vides\n" +
	"  find . -maxdepth 1          sans descendre plus bas ;  -mindepth 2 : à partir du deuxième niveau\n\n" +
	"Combiner les critères (ils s'ajoutent, comme un « et ») :\n" +
	"  find . -name \"*.log\" -o -name \"*.tmp\"      l'un OU l'autre (-o)\n" +
	"  find . ! -user laurent                      ce qui n'est PAS à laurent (! ou -not)\n" +
	"  find . \\( -name a -o -name b \\) -type f     des parenthèses, protégées par \\\n\n" +
	"Agir sur ce qu'on trouve :\n" +
	"  find . -name \"*.tmp\" -exec rm {} \\;     lance rm une fois par objet ({} : le chemin trouvé)\n" +
	"  find . -name \"*.log\" -exec cat {} +     une seule fois, avec tous les chemins\n" +
	"  find . -name \"*.tmp\" -delete            efface directement (essaie toujours d'abord sans -delete)\n" +
	"  find . -name \"*.tmp\" -print             afficher (c'est ce que find fait quand on ne lui demande rien)";

MANUEL["paste"] = page("coller des textes côte à côte", "coller",
	"  paste noms.txt notes.txt         ligne 1 avec ligne 1, ligne 2 avec ligne 2... séparées par une tabulation\n" +
	"  paste -d , noms.txt notes.txt    séparées par une virgule (-d ',;' : virgule, puis point-virgule, puis...)\n" +
	"  paste -s noms.txt                toutes les lignes d'un objet sur une seule ligne\n" +
	"  paste -sd + nombres.txt          1+2+3... (de quoi faire une addition)\n" +
	"  cat liste | paste - -            deux lignes du tuyau par ligne (- : l'entrée standard)\n\n" +
	"C'est l'inverse de cut : cut découpe des colonnes, paste les recolle.");

MANUEL["join"] = page("réunir deux listes triées sur un champ commun", "joindre",
	"join fait ce qu'une base de données appelle une jointure : il réunit les lignes de deux objets\n" +
	"qui ont la même valeur dans un champ (le premier, par défaut).\n\n" +
	"  join eleves.txt notes.txt             « 12 Ada » et « 12 18 » donnent « 12 Ada 18 »\n" +
	"  join -t : -1 3 -2 1 a.txt b.txt       séparateur « : », 3e champ du premier, 1er champ du second\n" +
	"  join -a 1 a.txt b.txt                 garder aussi les lignes du premier sans partenaire\n" +
	"  join -v 1 a.txt b.txt                 SEULEMENT celles-là (qui n'a pas de note ?)\n" +
	"  join -e VIDE -o 0,1.2,2.2 a b         choisir les colonnes, et que mettre quand il en manque une\n\n" +
	"Les deux objets doivent être TRIÉS sur ce champ (sort d'abord). Sinon join le signale.");

MANUEL["comm"] = page("comparer deux listes triées", "COMMon (ce qui est commun)",
	"comm range les lignes de deux listes triées en trois colonnes :\n" +
	"  1 : seulement dans la première   2 : seulement dans la seconde   3 : dans les deux\n\n" +
	"  comm avant.txt apres.txt        les trois colonnes\n" +
	"  comm -12 a b                    seulement ce qui est commun (on masque 1 et 2)\n" +
	"  comm -23 a b                    seulement ce qui n'est que dans a (ce qui a disparu)\n" +
	"  comm -13 a b                    seulement ce qui n'est que dans b (ce qui est apparu)\n\n" +
	"Les deux listes doivent être triées : sort a > a.tri d'abord.\n" +
	"Exemple : comm -13 comptes-hier.txt comptes.txt montre les comptes apparus depuis hier.");

MANUEL["column"] = page("aligner un texte en colonnes", "colonnes",
	"  column -t fichier              aligne les mots en tableau (séparés par des blancs)\n" +
	"  column -t -s : /etc/passwd     des colonnes séparées par « : »\n" +
	"  column -t -s , -o \" | \" f.csv  avec un séparateur entre les colonnes affichées\n" +
	"  ls | column                    une liste en plusieurs colonnes\n" +
	"  ls | column -x                 rangée par rangée plutôt que colonne par colonne (-c 40 : sur 40 caractères)\n\n" +
	"Indispensable pour relire un CSV ou la sortie d'un script sans se casser les yeux.");

MANUEL["tac"] = page("afficher un texte à l'envers, de la dernière ligne à la première", "cat à l'envers",
	"  tac journal.log            la dernière ligne d'abord\n" +
	"  tac f | head -5            les 5 dernières lignes, de la plus récente à la plus ancienne\n\n" +
	"tac, c'est cat écrit à l'envers, et il fait la même chose... à l'envers.");

MANUEL["shuf"] = page("mélanger des lignes au hasard", "SHUFfle (battre les cartes)",
	"  shuf liste.txt             les lignes dans un ordre au hasard\n  shuf -n 1 liste.txt        une seule ligne tirée au sort\n" +
	"  shuf -e pile face          mélanger les arguments\n  shuf -i 1-6 -n 1           un nombre entre 1 et 6 (un dé)\n  shuf -r -n 3 -e a b        trois tirages avec remise");

MANUEL["split"] = page("découper un gros fichier en morceaux", "découper",
	"  split -l 100 gros.log            des morceaux de 100 lignes : xaa, xab, xac...\n  split -l 100 gros.log partie_    nommés partie_aa, partie_ab...\n" +
	"  split -b 1k archive              des morceaux de 1 Kio\n  split -n 3 f                     en 3 morceaux\n  split -d -l 10 f                 suffixes en chiffres : x00, x01...\n\n" +
	"Pour recoller : cat xa* > copie (le joker * range les noms dans l'ordre).");

MANUEL["diff"].page += "\n\nLe format unifié, celui des correctifs (patch, git) :\n" +
	"  diff -u ancien nouveau           --- l'ancien, +++ le nouveau, puis des morceaux\n" +
	"  @@ -12,7 +12,8 @@                7 lignes à partir de la 12e avant, 8 lignes après\n" +
	"  -ligne retirée  +ligne ajoutée   et 3 lignes de contexte autour, sans signe (-U 1 : une seule)\n\n" +
	"Un correctif se fabrique ainsi : diff -u ancien nouveau > correctif.diff, puis se donne à patch.\n" +
	"Le code de retour vaut 0 si les textes sont identiques, 1 s'ils diffèrent.";

MANUEL["patch"] = page("appliquer (ou annuler) un correctif", "le rapiéçage",
	"patch lit un diff unifié (fabriqué par diff -u) et applique les changements à l'objet.\n\n" +
	"  patch OBJET correctif.diff      applique le correctif à OBJET (patch -i correctif.diff OBJET pareil)\n" +
	"  cat c.diff | patch OBJET        le correctif par un tuyau ;  patch OBJET < c.diff aussi\n" +
	"  patch -p0 < correctif.diff      l'objet est celui que nomment les lignes --- et +++\n" +
	"  patch -p1 < correctif.diff      en retirant le premier dossier des noms (a/f.txt devient f.txt)\n" +
	"  patch -R OBJET correctif.diff   annule un correctif déjà appliqué\n" +
	"  patch --dry-run OBJET c.diff    vérifie, sans rien modifier\n\n" +
	"Lire la réponse :\n" +
	"  patching file OBJET                          c'est fait\n" +
	"  Hunk #2 succeeded at 40 (offset 3 lines).    le morceau 2 a été trouvé 3 lignes plus bas que prévu\n" +
	"  Hunk #1 succeeded at 1 with fuzz 1.          trouvé en ignorant une ligne de contexte qui avait changé\n" +
	"  Hunk #1 FAILED at 12.                        l'objet a trop changé : le morceau est mis de côté dans OBJET.rej\n" +
	"  Reversed (or previously applied) patch detected!   le correctif est déjà appliqué (patch -R pour l'annuler)\n\n" +
	"Quand un morceau a bougé ou échoué, patch garde l'original dans OBJET.orig.");

MANUEL["rsync"] = page("synchroniser deux lieux (sauvegardes, déploiements)", "Remote SYNC",
	"rsync copie ce qui manque ou a changé d'un lieu vers un autre, et seulement cela.\n\n" +
	"  rsync -av src/ dst          copie le CONTENU de src dans dst (-a : tout, droits et dates compris ; -v : raconte)\n" +
	"  rsync -av src dst           copie le lieu src lui-même : on obtient dst/src\n" +
	"  rsync -avn src/ dst         essai à blanc (-n, --dry-run) : montre ce qui serait fait, sans rien faire\n" +
	"  rsync -av --delete src/ dst efface aussi dans dst ce qui n'est plus dans src (un miroir exact)\n" +
	"  rsync -av --exclude '*.tmp' src/ dst      sans les objets .tmp (--exclude 'cache/' : sans ce lieu)\n" +
	"  rsync -r src/ dst           récursif, sans garder les droits ni les dates\n\n" +
	"La barre finale de la source change tout : avec, son contenu ; sans, le lieu lui-même.\n" +
	"Avant un --delete, fais toujours un essai avec -n : un miroir copie aussi les erreurs.");

MANUEL["at"] = page("lancer une commande une fois, plus tard", "à (telle heure)",
	"at lit la commande sur son entrée standard, et la planifie pour plus tard, une seule fois.\n\n" +
	"  echo \"tar -czf sauvegarde.tgz notes\" | at 23:00     ce soir à 23 h (demain si l'heure est passée)\n" +
	"  echo \"commande\" | at now + 10 minutes              dans 10 minutes (hours, days, weeks aussi)\n" +
	"  at -f script.sh tomorrow                            demain, même heure\n" +
	"  at noon, at midnight, at teatime (16 h), at 9am, at 14:00 2026-12-24\n\n" +
	"  atq                    la file d'attente (atq, c'est at -l)\n" +
	"  atrm 3                 retire la tâche 3 (at -r 3 pareil)\n" +
	"  at -c 3                ce que fera la tâche 3\n\n" +
	"Pour une commande qui revient tous les jours, ce n'est pas at qu'il faut, mais cron (crontab -e)\n" +
	"ou un timer de systemd (systemctl list-timers).");
MANUEL["atq"] = page("voir les tâches planifiées avec at", "AT Queue",
	"  atq                    numéro, date et propriétaire de chaque tâche en attente\n  sudo atq               celles de tout le monde\n\n" +
	"Une tâche dont l'heure est passée a été lancée : elle quitte la file.");
MANUEL["atrm"] = page("retirer une tâche planifiée avec at", "AT ReMove",
	"  atrm 3                 retire la tâche 3 (son numéro est donné par atq)\n  atrm 3 4               plusieurs à la fois\n" +
	"  sudo atrm 5            celle d'un autre");

MANUEL["crontab"].page = MANUEL["crontab"].page.replace("\n\nUn processus qui renaît", "\n\nÉcrire sa crontab :\n" +
	"  crontab -e                    l'ouvre dans l'éditeur ; elle est installée quand tu le quittes\n" +
	"  crontab FICHIER               installe celle écrite dans un objet (elle remplace l'ancienne)\n" +
	"  echo \"*/5 * * * * cmd\" | crontab -    depuis un tuyau (attention : remplace tout)\n" +
	"  */5 : toutes les 5 ;  1-5 : de 1 à 5 (du lundi au vendredi) ;  0,30 : à 0 et à 30 ;  @daily, @hourly, @reboot\n\n" +
	"Une faute ? crontab refuse d'installer et dit laquelle (bad minute, bad hour...) : rien n'est perdu.\n" +
	"Dans ce monde, les commentaires d'une crontab ne sont pas gardés.\n\nUn processus qui renaît");

MANUEL["systemctl"].page += "\n\nLes timers, l'autre façon de planifier (un .timer lance un .service) :\n" +
	"  systemctl list-timers               les prochains déclenchements (--all : aussi ceux qui sont arrêtés)\n" +
	"  systemctl status logrotate.timer    son état et son prochain déclenchement\n" +
	"  systemctl cat logrotate.timer       son calendrier : OnCalendar=daily, *-*-* 02:30, Mon..Fri 07:00...\n" +
	"  sudo systemctl stop NOM.timer       l'arrêter ;  sudo systemctl disable --now NOM.timer : pour de bon";

MANUEL["date"].page += "\n\nUne autre date que maintenant (-d) :\n" +
	"  date -d tomorrow              demain ;  date -d yesterday : hier\n" +
	"  date -d \"3 days ago\"          il y a trois jours ;  date -d \"+2 hours\" : dans deux heures\n" +
	"  date -d \"next friday\" +%F     la date de vendredi prochain\n" +
	"  date -d \"2026-12-24 18:00\"    une date précise\n" +
	"  date -d @0                    le 1er janvier 1970 : le début du temps Unix";

/* Ces sorts existent maintenant : plus besoin de dire qu'ils manquent à ce monde. */
var SORTS_ARCANES = ["jq", "xargs", "paste", "join", "comm", "column", "tac", "shuf", "split", "patch", "rsync", "at", "atq", "atrm"];
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_ARCANES.indexOf(c) === -1; });

/* Tant qu'aucun chapitre ne les enseigne (aucune liste ORDRE_DES_SORTS), leur premier usage ne rapporte pas d'XP :
   le barème ne les compte pas encore. Dès qu'un chapitre les range dans sa liste, le barème normal s'applique. */
var PREMIER_USAGE_AVANT_ARCANES = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if (SORTS_ARCANES.indexOf(sort) > -1 && tousLesSorts().indexOf(sort) === -1){
		this.usages[sort] = true;
		return;
	}
	return PREMIER_USAGE_AVANT_ARCANES.apply(this, arguments);
};

/* FIN DES SORTS ARCANES */
