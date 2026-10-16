/**
 * Awk.js : un vrai petit awk, écrit pour le jeu.
 *
 * Trois étages, comme dans tout interpréteur :
 *   1. le lexeur découpe le programme en jetons (nombres, chaînes, /motifs/, mots, opérateurs) ;
 *   2. le parseur en fait un arbre (les règles « motif { action } », les fonctions) ;
 *   3. l'évaluateur parcourt cet arbre, ligne après ligne. Jamais d'eval ni de Function :
 *      le programme du joueur ne devient jamais du JavaScript.
 *
 * Les valeurs suivent les règles d'awk : un nombre, une chaîne, ou un « nombre-chaîne » (ce qui
 * vient de l'entrée : un champ, une ligne lue) qui compte comme nombre s'il en a l'air.
 * Un garde-fou arrête les boucles sans fin (AWK_PAS_MAX pas).
 */

var AWK_PAS_MAX = 200000;
var AWK_PROFONDEUR_MAX = 200;

var MOTS_CLES_AWK = ["BEGIN", "END", "function", "func", "if", "else", "while", "for", "do", "break", "continue",
	"next", "nextfile", "exit", "return", "delete", "in", "getline", "print", "printf"];
var FONCTIONS_AWK = ["length", "substr", "index", "split", "sub", "gsub", "match", "sprintf", "sin", "cos", "atan2",
	"exp", "log", "sqrt", "int", "rand", "srand", "tolower", "toupper", "system", "close", "fflush", "gensub", "systime", "strftime"];

/* Un texte venu de l'entrée (champ, ligne lue, -v) : un nombre s'il en a l'air, sinon une chaîne. */
function NombreChaine(s){ this.s = s; }
/* Une variable jamais affectée : à la fois "" et 0. */
var AWK_VIDE = new NombreChaine("");
AWK_VIDE.vide = true;

/* Un tableau associatif d'awk. */
function TableauAwk(){ this.d = Object.create(null); }

/* Une variable non typée passée à une fonction : elle deviendra peut-être un tableau. */
function RefAwk(lire, ecrire){ this.lire = lire; this.ecrire = ecrire; }

var RE_NOMBRE_AWK = /^[ \t\n\r\f\v]*[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[ \t\n\r\f\v]*$/;
var RE_DEBUT_NOMBRE_AWK = /^[ \t\n\r\f\v]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/;

function erreurAwk(message){ return new ShellError("awk : " + message, 2); }

/* ------------------------------------------------------------------ */
/* 1. Le lexeur                                                        */
/* ------------------------------------------------------------------ */

/* Les échappements d'une chaîne d'awk : \n \t \" \\ \/ \ooo... */
function echappementsAwk(texte){
	var sortie = "";
	for (var i = 0; i < texte.length; i++){
		var c = texte.charAt(i);
		if (c !== "\\" || i + 1 >= texte.length){ sortie += c; continue; }
		var d = texte.charAt(++i);
		var oct = /^[0-7]{1,3}/.exec(texte.substring(i));
		if (oct){ sortie += String.fromCharCode(parseInt(oct[0], 8)); i += oct[0].length - 1; continue; }
		switch (d){
			case "n": sortie += "\n"; break;
			case "t": sortie += "\t"; break;
			case "r": sortie += "\r"; break;
			case "a": sortie += "\x07"; break;
			case "b": sortie += "\b"; break;
			case "f": sortie += "\f"; break;
			case "v": sortie += "\v"; break;
			case "\n": break;
			default: sortie += d;   // \" \\ \/ et les autres : la lettre seule, comme gawk
		}
	}
	return sortie;
}

function lexerAwk(source){
	var jetons = [], i = 0, n = source.length, ligne = 1;
	var PONCTUATION = ["**=", "&&", "||", "==", "<=", ">=", "!=", "++", "--", "+=", "-=", "*=", "/=", "%=", "^=", "**", ">>", "!~",
		"{", "}", "(", ")", "[", "]", ";", ",", "+", "-", "*", "/", "%", "^", "!", ">", "<", "|", "?", ":", "~", "$", "="];
	function precedentPermetRegex(){
		var p = jetons[jetons.length - 1];
		if (!p) return true;
		return !(p.t === "num" || p.t === "str" || p.t === "nom" || p.t === "fonction" || p.t === "regex" || p.t === "integree" ||
			p.v === ")" || p.v === "]" || p.v === "$" || p.v === "++" || p.v === "--");
	}
	function pousser(t, v, debut){ jetons.push({ t: t, v: v, pos: debut, ligne: ligne }); }
	while (i < n){
		var c = source.charAt(i), debut = i;
		if (c === "\\" && source.charAt(i + 1) === "\n"){ i += 2; ligne++; continue; }
		if (c === "\\" && source.substr(i + 1, 2) === "\r\n"){ i += 3; ligne++; continue; }
		if (c === " " || c === "\t" || c === "\r"){ i++; continue; }
		if (c === "#"){ while (i < n && source.charAt(i) !== "\n") i++; continue; }
		if (c === "\n"){
			if (!jetons.length || jetons[jetons.length - 1].t !== "nl") pousser("nl", "\n", debut);
			i++; ligne++;
			continue;
		}
		if (c === "\""){
			var j = i + 1, brut = "";
			for (;;){
				if (j >= n || source.charAt(j) === "\n") throw erreurSyntaxeAwk(source, debut, "chaîne jamais refermée par un guillemet \"");
				var d = source.charAt(j);
				if (d === "\\" && j + 1 < n){ brut += d + source.charAt(j + 1); j += 2; continue; }
				if (d === "\""){ j++; break; }
				brut += d; j++;
			}
			pousser("str", echappementsAwk(brut), debut);
			i = j;
			continue;
		}
		if (c === "/" && precedentPermetRegex()){
			var k = i + 1, motif = "";
			for (;;){
				if (k >= n || source.charAt(k) === "\n") throw erreurSyntaxeAwk(source, debut, "/motif/ jamais refermé par un /");
				var e = source.charAt(k);
				if (e === "\\" && k + 1 < n){
					motif += source.charAt(k + 1) === "/" ? "/" : e + source.charAt(k + 1);
					k += 2; continue;
				}
				if (e === "["){
					var fin = finDesCrochets(source, k);
					if (fin > 0){ motif += source.substring(k, fin); k = fin; continue; }
				}
				if (e === "/"){ k++; break; }
				motif += e; k++;
			}
			pousser("regex", motif, debut);
			i = k;
			continue;
		}
		var m;
		if ((m = /^(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/.exec(source.substring(i)))){
			var texte = m[0], valeur;
			if (/^0[xX]/.test(texte)) valeur = parseInt(texte, 16);
			else if (/^0[0-7]+$/.test(texte)) valeur = parseInt(texte, 8);
			else valeur = parseFloat(texte);
			pousser("num", valeur, debut);
			i += texte.length;
			continue;
		}
		if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.substring(i)))){
			var mot = m[0];
			i += mot.length;
			if (MOTS_CLES_AWK.indexOf(mot) > -1) pousser(mot === "func" ? "function" : mot, mot, debut);
			else if (FONCTIONS_AWK.indexOf(mot) > -1) pousser("integree", mot, debut);
			else if (source.charAt(i) === "(") pousser("fonction", mot, debut);
			else pousser("nom", mot, debut);
			continue;
		}
		var trouve = null;
		for (var p = 0; p < PONCTUATION.length; p++){
			if (source.substr(i, PONCTUATION[p].length) === PONCTUATION[p]){ trouve = PONCTUATION[p]; break; }
		}
		if (!trouve) throw erreurSyntaxeAwk(source, debut, "caractère inattendu « " + c + " »");
		var longueur = trouve.length;
		if (trouve === "**") trouve = "^";
		if (trouve === "**=") trouve = "^=";
		pousser(trouve, trouve, debut);
		i += longueur;
	}
	pousser("eof", "", n);
	return jetons;
}

/* Une erreur de syntaxe montre la ligne du programme et l'endroit fautif, comme gawk. */
function erreurSyntaxeAwk(source, pos, message){
	var debutLigne = source.lastIndexOf("\n", pos - 1) + 1;
	var finLigne = source.indexOf("\n", pos);
	if (finLigne < 0) finLigne = source.length;
	var numero = source.substring(0, pos).split("\n").length;
	var ligne = source.substring(debutLigne, finLigne);
	var curseur = completerDroite("", Math.max(0, pos - debutLigne)) + "^";
	return new ShellError("awk : erreur de syntaxe" + (numero > 1 ? " (ligne " + numero + " du programme)" : "") + " : " + message + "\n" +
		"  " + ligne + "\n  " + curseur + "\n" +
		C.gris("(Un programme awk : 'motif { action }'. Exemples : '{ print $1 }', '$3 > 10 { n++ } END { print n }')"), 2);
}

/* ------------------------------------------------------------------ */
/* 2. Le parseur                                                       */
/* ------------------------------------------------------------------ */

function parserAwk(source){
	var jetons = lexerAwk(source), k = 0;
	var programme = { debut: [], fin: [], regles: [], fonctions: Object.create(null) };
	var locaux = null;          // les paramètres de la fonction en cours d'analyse
	var appels = [];            // les fonctions appelées, à vérifier à la fin
	function jeton(){ return jetons[k]; }
	function suivant(){ return jetons[k + 1]; }
	function avancer(){ return jetons[k++]; }
	function est(v){ return jetons[k].t === v; }
	function erreur(message, j){
		j = j || jeton();
		var quoi = j.t === "eof" ? "la fin du programme" : (j.t === "nl" ? "un retour à la ligne" : "« " + (j.t === "str" ? "\"" + j.v + "\"" : j.t === "regex" ? "/" + j.v + "/" : j.v) + " »");
		return erreurSyntaxeAwk(source, j.pos, message ? message + " (près de " + quoi + ")" : "près de " + quoi);
	}
	function attendre(v, message){
		if (!est(v)) throw erreur(message || "il manque « " + v + " »");
		return avancer();
	}
	function sauterLignes(){ while (est("nl")) avancer(); }
	function sauterSeparateurs(){ while (est("nl") || est(";")) avancer(); }
	function finDInstruction(){ return est(";") || est("nl") || est("}") || est("eof"); }

	function nomVariable(nom, j){
		if (locaux && locaux.hasOwnProperty(nom)) return { t: "var", nom: nom, local: locaux[nom], pos: j.pos };
		return { t: "var", nom: nom, pos: j.pos };
	}

	// --- Les règles ---
	function regles(){
		sauterSeparateurs();
		while (!est("eof")){
			var finParAccolade = false;
			if (est("function")){
				avancer();
				var nomJ = avancer();
				if (nomJ.t !== "nom" && nomJ.t !== "fonction") throw erreur("après function, il faut un nom de fonction", nomJ);
				if (programme.fonctions[nomJ.v]) throw erreur("la fonction « " + nomJ.v + " » est définie deux fois", nomJ);
				attendre("(", "il manque « ( » après le nom de la fonction");
				var params = [];
				locaux = Object.create(null);
				while (!est(")")){
					var pj = avancer();
					if (pj.t !== "nom") throw erreur("paramètre de fonction invalide", pj);
					if (locaux[pj.v] !== undefined) throw erreur("paramètre « " + pj.v + " » en double", pj);
					locaux[pj.v] = params.length;
					params.push(pj.v);
					sauterLignes();
					if (est(",")){ avancer(); sauterLignes(); }
					else if (!est(")")) throw erreur("il manque « , » ou « ) » dans les paramètres");
				}
				avancer();
				sauterLignes();
				var corps = bloc();
				locaux = null;
				programme.fonctions[nomJ.v] = { nom: nomJ.v, params: params, corps: corps };
				finParAccolade = true;
			} else if (est("BEGIN") || est("END")){
				var quand = avancer().t;
				sauterLignes();
				if (!est("{")) throw erreur(quand + " doit être suivi d'une action entre accolades { }");
				(quand === "BEGIN" ? programme.debut : programme.fin).push(bloc());
				finParAccolade = true;
			} else {
				var regle = { motif: null, motif2: null, action: null };
				if (!est("{")){
					regle.motif = expression({});
					if (est(",")){ avancer(); sauterLignes(); regle.motif2 = expression({}); }
				}
				if (est("{")){ regle.action = bloc(); finParAccolade = true; }
				programme.regles.push(regle);
			}
			if (!finParAccolade && !est("eof") && !est("nl") && !est(";")) throw erreur("une règle doit finir par un retour à la ligne ou un « ; »");
			sauterSeparateurs();
		}
	}

	// --- Les instructions ---
	function bloc(){
		attendre("{");
		var liste = [];
		sauterSeparateurs();
		while (!est("}")){
			if (est("eof")) throw erreur("accolade { jamais refermée par }");
			liste.push(instruction());
			sauterSeparateurs();
		}
		avancer();
		return { t: "bloc", liste: liste };
	}
	function corpsDeBoucle(){
		sauterLignes();
		if (est(";")){ avancer(); return { t: "bloc", liste: [] }; }
		return instruction();
	}
	function instruction(){
		var j = jeton();
		switch (j.t){
			case "{": return bloc();
			case ";": avancer(); return { t: "bloc", liste: [] };
			case "if":
				avancer(); attendre("(", "il manque « ( » après if");
				var cond = expression({});
				attendre(")", "il manque « ) » après la condition du if");
				var alors = corpsDeBoucle();
				var memo = k;
				sauterSeparateurs();
				if (est("else")){
					avancer();
					return { t: "si", c: cond, alors: alors, sinon: corpsDeBoucle() };
				}
				k = memo;
				return { t: "si", c: cond, alors: alors, sinon: null };
			case "while":
				avancer(); attendre("(", "il manque « ( » après while");
				var cw = expression({});
				attendre(")", "il manque « ) » après la condition du while");
				if (est(";")){ avancer(); return { t: "tantque", c: cw, corps: { t: "bloc", liste: [] } }; }
				return { t: "tantque", c: cw, corps: corpsDeBoucle() };
			case "do":
				avancer();
				var corps = corpsDeBoucle();
				sauterSeparateurs();
				attendre("while", "après do { ... }, il faut while (condition)");
				attendre("(", "il manque « ( » après while");
				var cd = expression({});
				attendre(")", "il manque « ) » après la condition");
				return finSimple({ t: "faire", c: cd, corps: corps });
			case "for":
				avancer(); attendre("(", "il manque « ( » après for");
				// for (cle in tableau)
				if (est("nom") && suivant().t === "in" && jetons[k + 2].t === "nom" && jetons[k + 3].t === ")"){
					var cle = nomVariable(avancer().v, j);
					avancer();
					var tj = avancer();
					var tab = nomVariable(tj.v, tj);
					avancer();
					return { t: "pourdans", cle: cle, tableau: tab, corps: corpsDeBoucle() };
				}
				var init = est(";") ? null : simple();
				attendre(";", "dans for (...;...;...), il manque un « ; »");
				sauterLignes();
				var test = est(";") ? null : expression({});
				attendre(";", "dans for (...;...;...), il manque le second « ; »");
				sauterLignes();
				var pas = est(")") ? null : simple();
				attendre(")", "il manque « ) » à la fin du for");
				return { t: "pour", init: init, c: test, pas: pas, corps: corpsDeBoucle() };
			default:
				return finSimple(simple());
		}
	}
	function finSimple(noeud){
		if (!finDInstruction()) throw erreur("instruction mal terminée : il manque un « ; » ou un retour à la ligne");
		return noeud;
	}
	function simple(){
		var j = jeton();
		switch (j.t){
			case "print": case "printf": return impression();
			case "next": avancer(); return { t: "next" };
			case "nextfile": avancer(); return { t: "nextfile" };
			case "break": avancer(); return { t: "break" };
			case "continue": avancer(); return { t: "continue" };
			case "exit": avancer(); return { t: "exit", e: finDInstruction() ? null : expression({}) };
			case "return":
				avancer();
				if (!locaux) throw erreur("return n'a de sens que dans une fonction", j);
				return { t: "return", e: finDInstruction() ? null : expression({}) };
			case "delete":
				avancer();
				var nj = avancer();
				if (nj.t !== "nom") throw erreur("après delete, il faut le nom d'un tableau", nj);
				var tab = nomVariable(nj.v, nj);
				if (est("[")){
					avancer();
					var indices = listeExpressions("]");
					attendre("]");
					return { t: "delete", tableau: tab, indices: indices };
				}
				return { t: "delete", tableau: tab, indices: null };
			default:
				return { t: "expr", e: expression({}) };
		}
	}
	function impression(){
		var quel = avancer().t;
		var args = [];
		if (!finDInstruction() && !est(">") && !est(">>") && !est("|")){
			// print (a, b) > "f" : la liste entre parenthèses
			var memo = k;
			if (est("(")){
				avancer();
				var liste = listeExpressions(")");
				if (est(")")){
					avancer();
					if (finDInstruction() || est(">") || est(">>") || est("|")) args = liste;
					else { k = memo; args = listeExpressions(null, { sansSup: true }); }
				} else { k = memo; args = listeExpressions(null, { sansSup: true }); }
			} else {
				args = listeExpressions(null, { sansSup: true });
			}
		}
		var redir = null;
		if (est(">") || est(">>")){
			var op = avancer().v;
			redir = { mode: op, cible: concatenation({ sansSup: true }) };
		} else if (est("|")){
			throw erreur("« print | commande » (un tuyau vers une commande) n'est pas permis ici. Envoie plutôt la sortie d'awk dans un tuyau : awk ... | sort");
		}
		if (quel === "printf" && args.length === 0) throw erreur("printf attend au moins un format, par exemple : printf \"%s\\n\", $1");
		return { t: quel, args: args, redir: redir };
	}
	function listeExpressions(fermante, f){
		var liste = [];
		if (fermante && est(fermante)) return liste;
		for (;;){
			liste.push(expression(f || {}));
			if (!est(",")) break;
			avancer();
			sauterLignes();
		}
		return liste;
	}

	// --- Les expressions, de la priorité la plus basse à la plus haute ---
	function estAffectable(e){ return e.t === "var" || e.t === "indice" || e.t === "champ"; }
	var AFFECTATIONS = { "=": 1, "+=": 1, "-=": 1, "*=": 1, "/=": 1, "%=": 1, "^=": 1 };
	function expression(f){
		var gauche = ternaire(f);
		if (AFFECTATIONS[jeton().t] && estAffectable(gauche)){
			var op = avancer().v;
			sauterLignes();
			return { t: "affecter", op: op, cible: gauche, e: expression(f) };
		}
		if (est("|") && suivant().t === "getline"){
			throw erreur("« commande | getline » n'est pas permis ici : awk ne lance pas d'autres commandes dans ce jeu");
		}
		return gauche;
	}
	function ternaire(f){
		var c = ou(f);
		if (est("?")){
			avancer(); sauterLignes();
			var a = expression(f);
			sauterLignes();
			attendre(":", "il manque « : » dans condition ? valeur1 : valeur2");
			sauterLignes();
			return { t: "si?", c: c, a: a, b: expression(f) };
		}
		return c;
	}
	function ou(f){
		var g = et(f);
		while (est("||")){ avancer(); sauterLignes(); g = { t: "ou", a: g, b: et(f) }; }
		return g;
	}
	function et(f){
		var g = dans(f);
		while (est("&&")){ avancer(); sauterLignes(); g = { t: "et", a: g, b: dans(f) }; }
		return g;
	}
	function dans(f){
		var g = correspond(f);
		while (est("in")){
			avancer();
			var tj = avancer();
			if (tj.t !== "nom") throw erreur("après in, il faut le nom d'un tableau", tj);
			g = { t: "dans", cles: [g], tableau: nomVariable(tj.v, tj) };
		}
		return g;
	}
	function correspond(f){
		var g = comparaison(f);
		while (est("~") || est("!~")){
			var non = avancer().v === "!~";
			g = { t: "~", non: non, a: g, re: comparaison(f) };
		}
		return g;
	}
	var COMPARAISONS = { "<": 1, "<=": 1, "==": 1, "!=": 1, ">": 1, ">=": 1 };
	function comparaison(f){
		var g = concatenation(f);
		while (COMPARAISONS[jeton().t] && !(f.sansSup && est(">"))){
			var op = avancer().v;
			g = { t: "cmp", op: op, a: g, b: concatenation(f) };
		}
		return g;
	}
	function commencePrimaire(){
		var t = jeton().t;
		return t === "num" || t === "str" || t === "regex" || t === "nom" || t === "fonction" || t === "integree" ||
			t === "$" || t === "!" || t === "(" || t === "-" || t === "+" || t === "++" || t === "--";
	}
	function concatenation(f){
		var g = additif(f);
		// Deux expressions côte à côte : on les colle (le moins et le plus restent des opérations).
		while (commencePrimaire() && !est("-") && !est("+") && !est("!")){
			g = { t: "concat", a: g, b: additif(f) };
		}
		return g;
	}
	function additif(f){
		var g = multiplicatif(f);
		while (est("+") || est("-")){
			var op = avancer().v;
			g = { t: "op", op: op, a: g, b: multiplicatif(f) };
		}
		return g;
	}
	function multiplicatif(f){
		var g = unaire(f);
		while (est("*") || est("/") || est("%")){
			var op = avancer().v;
			g = { t: "op", op: op, a: g, b: unaire(f) };
		}
		return g;
	}
	function unaire(f){
		if (est("!")){ avancer(); return { t: "non", e: unaire(f) }; }
		if (est("-")){ avancer(); return { t: "moins", e: unaire(f) }; }
		if (est("+")){ avancer(); return { t: "plus", e: unaire(f) }; }
		return puissance(f);
	}
	function puissance(f){
		var base = postfixe(f);
		if (est("^")){
			avancer();
			return { t: "op", op: "^", a: base, b: unaire(f) };
		}
		return base;
	}
	function postfixe(f){
		var e = primaire(f);
		if ((est("++") || est("--")) && estAffectable(e)){
			return { t: avancer().v === "++" ? "post++" : "post--", cible: e };
		}
		return e;
	}
	function primaire(f){
		var j = jeton();
		switch (j.t){
			case "num": avancer(); return { t: "num", v: j.v };
			case "str": avancer(); return { t: "str", v: j.v };
			case "regex": avancer(); return { t: "regex", source: j.v, pos: j.pos };
			case "(":
				avancer();
				var liste = listeExpressions(")");
				attendre(")", "parenthèse ( jamais refermée par )");
				if (liste.length > 1){
					if (!est("in")) throw erreur("une liste (a, b) n'a de sens que devant in : (a, b) in tableau");
					avancer();
					var tj = avancer();
					if (tj.t !== "nom") throw erreur("après in, il faut le nom d'un tableau", tj);
					return { t: "dans", cles: liste, tableau: nomVariable(tj.v, tj) };
				}
				if (liste.length === 0) throw erreur("parenthèses vides");
				return { t: "groupe", e: liste[0] };
			case "$":
				avancer();
				var quoi;
				if (est("++") || est("--")){
					var op = avancer().v;
					var cible = primaire(f);
					if (!estAffectable(cible)) throw erreur(op + " ne s'applique qu'à une variable");
					quoi = { t: op === "++" ? "++pre" : "--pre", cible: cible };
				} else if (est("-")){
					avancer();
					quoi = { t: "moins", e: primaire(f) };
				} else {
					quoi = primaire(f);
				}
				return { t: "champ", e: quoi };
			case "++": case "--":
				avancer();
				var c = primaire(f);
				if (!estAffectable(c)) throw erreur(j.v + " ne s'applique qu'à une variable", j);
				return { t: j.v === "++" ? "++pre" : "--pre", cible: c };
			case "-": avancer(); return { t: "moins", e: unaire(f) };
			case "+": avancer(); return { t: "plus", e: unaire(f) };
			case "!": avancer(); return { t: "non", e: unaire(f) };
			case "nom":
				avancer();
				var v = nomVariable(j.v, j);
				if (est("[")){
					avancer();
					var indices = listeExpressions("]");
					if (!indices.length) throw erreur("indice de tableau vide");
					attendre("]", "crochet [ jamais refermé par ]");
					return { t: "indice", tableau: v, indices: indices };
				}
				return v;
			case "fonction":
				avancer();
				attendre("(");
				var args = listeExpressions(")");
				attendre(")", "il manque « ) » à l'appel de " + j.v);
				appels.push(j);
				return { t: "appel", nom: j.v, args: args, pos: j.pos };
			case "integree":
				avancer();
				if (!est("(")){
					if (j.v === "length") return { t: "integree", nom: "length", args: [] };
					throw erreur("il manque « ( » après " + j.v, j);
				}
				avancer();
				var argsI = listeExpressions(")");
				attendre(")", "il manque « ) » à l'appel de " + j.v);
				verifierIntegree(j, argsI);
				return { t: "integree", nom: j.v, args: argsI };
			case "getline":
				avancer();
				var dest = null, fichier = null;
				if (est("nom") || est("$")) dest = postfixe(f);
				if (dest && !estAffectable(dest)) throw erreur("getline ne peut ranger la ligne que dans une variable", j);
				if (est("<")){ avancer(); fichier = postfixe(f); }
				return { t: "getline", dest: dest, fichier: fichier };
		}
		throw erreur("");
	}
	var ARITES = { length: [0, 1], substr: [2, 3], index: [2, 2], split: [2, 4], sub: [2, 3], gsub: [2, 3], match: [2, 3],
		sprintf: [1, 99], sin: [1, 1], cos: [1, 1], atan2: [2, 2], exp: [1, 1], log: [1, 1], sqrt: [1, 1], "int": [1, 1],
		rand: [0, 0], srand: [0, 1], tolower: [1, 1], toupper: [1, 1], system: [1, 1], close: [1, 2], fflush: [0, 1],
		gensub: [3, 4], systime: [0, 0], strftime: [0, 3] };
	function verifierIntegree(j, args){
		var a = ARITES[j.v];
		if (args.length < a[0] || args.length > a[1]){
			throw erreur(j.v + " attend " + (a[0] === a[1] ? a[0] : "de " + a[0] + " à " + a[1]) + " argument" + (a[1] > 1 ? "s" : "") + ", pas " + args.length, j);
		}
		if ((j.v === "sub" || j.v === "gsub") && args.length === 3 && !estAffectable(args[2])){
			throw erreur(j.v + " : le troisième argument doit être une variable ou un champ", j);
		}
	}

	regles();
	appels.forEach(function(j){
		if (!programme.fonctions[j.v]) throw erreurSyntaxeAwk(source, j.pos, "la fonction « " + j.v + " » n'est définie nulle part");
	});
	return programme;
}

/* ------------------------------------------------------------------ */
/* Nombres, chaînes et formats                                         */
/* ------------------------------------------------------------------ */

function awkNombreDe(texte){
	var m = RE_DEBUT_NOMBRE_AWK.exec(texte);
	if (m) return parseFloat(m[1]);
	var h = /^[ \t]*([-+]?)(inf|infinity|nan)\b/i.exec(texte);
	if (h && /^[-+]$/.test(h[1])) return h[2].toLowerCase() === "nan" ? NaN : (h[1] === "-" ? -Infinity : Infinity);
	return 0;
}

/* Arrondi au plus proche, à égalité vers le pair (comme rint, utilisé par substr). */
function arrondiPair(x){
	var r = Math.round(x);
	if (Math.abs(x % 1) === 0.5 && r % 2 !== 0) r -= 1;
	return r;
}

function entierEnTexte(n){
	if (Math.abs(n) < 1e16) return String(n);
	try { return BigInt(n).toString(); } catch (e){ return String(n); }
}

function nombreSpecial(n){
	if (isNaN(n)) return "-nan";
	if (n === Infinity) return "+inf";
	if (n === -Infinity) return "-inf";
	return null;
}

/* Le formateur de printf et sprintf : %d %i %o %x %X %u %c %s %e %E %f %F %g %G %%. */
function formaterAwk(format, valeurs, versNombre, versTexte){
	var sortie = "", i = 0, n = format.length, k = 0;
	function prochain(){
		if (k >= valeurs.length) throw erreurAwk("printf : pas assez de valeurs pour le format « " + format + " »");
		return valeurs[k++];
	}
	while (i < n){
		var c = format.charAt(i);
		if (c !== "%"){ sortie += c; i++; continue; }
		var m = /^%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?([diouxXcseEfFgG%])/.exec(format.substring(i));
		if (!m){ sortie += c; i++; continue; }
		i += m[0].length;
		var drapeaux = m[1], conv = m[4];
		if (conv === "%"){ sortie += "%"; continue; }
		var largeur = m[2] === "*" ? Math.trunc(versNombre(prochain())) : (m[2] ? parseInt(m[2], 10) : 0);
		var precision = m[3] === undefined ? null : (m[3] === "*" ? Math.trunc(versNombre(prochain())) : (m[3] === "" ? 0 : parseInt(m[3], 10)));
		if (largeur < 0){ drapeaux += "-"; largeur = -largeur; }
		var gauche = drapeaux.indexOf("-") > -1, zeros = drapeaux.indexOf("0") > -1 && !gauche;
		var plus = drapeaux.indexOf("+") > -1, espace = drapeaux.indexOf(" ") > -1, diese = drapeaux.indexOf("#") > -1;
		var v = prochain(), corps, signe = "";
		switch (conv){
			case "d": case "i":
				var nd = versNombre(v);
				var special = nombreSpecial(nd);
				if (special){ corps = special.replace("+", ""); signe = nd < 0 ? "" : (plus ? "+" : (espace ? " " : "")); zeros = false; break; }
				nd = Math.trunc(nd);
				signe = nd < 0 ? "-" : (plus ? "+" : (espace ? " " : ""));
				corps = entierEnTexte(Math.abs(nd));
				if (precision !== null){ zeros = false; while (corps.length < precision) corps = "0" + corps; if (precision === 0 && nd === 0) corps = ""; }
				break;
			case "o": case "x": case "X": case "u":
				var nu = Math.trunc(versNombre(v));
				var grand;
				try { grand = nu < 0 ? BigInt.asUintN(64, BigInt(nu)) : BigInt(nu); } catch (e){ grand = BigInt(0); }
				corps = grand.toString(conv === "o" ? 8 : (conv === "u" ? 10 : 16));
				if (conv === "X") corps = corps.toUpperCase();
				if (precision !== null){ zeros = false; while (corps.length < precision) corps = "0" + corps; }
				if (diese && conv === "o" && corps.charAt(0) !== "0") corps = "0" + corps;
				if (diese && (conv === "x" || conv === "X") && nu !== 0) signe = conv === "x" ? "0x" : "0X";
				break;
			case "c":
				if (v instanceof NombreChaine && !v.vide && RE_NOMBRE_AWK.test(v.s)) v = awkNombreDe(v.s);
				if (typeof v === "number") corps = String.fromCodePoint(Math.max(0, Math.min(0x10ffff, Math.trunc(v))));
				else corps = versTexte(v).charAt(0);
				zeros = false;
				break;
			case "s":
				corps = versTexte(v);
				if (precision !== null) corps = corps.substring(0, precision);
				zeros = false;
				break;
			default:
				var x = versNombre(v);
				var sp = nombreSpecial(x);
				signe = x < 0 || (x === 0 && 1 / x < 0) ? "-" : (plus ? "+" : (espace ? " " : ""));
				if (sp){ corps = sp.replace(/^[-+]/, ""); if (isNaN(x)) signe = "-"; zeros = false; }
				else corps = formaterFlottant(Math.abs(x), conv, precision === null ? 6 : precision, diese);
		}
		var tout = signe + corps;
		if (tout.length < largeur){
			if (gauche) tout = completerDroite(tout, largeur);
			else if (zeros){ while (signe.length + corps.length < largeur) corps = "0" + corps; tout = signe + corps; }
			else tout = completerGauche(tout, largeur);
		}
		sortie += tout;
	}
	return sortie;
}

function exposantC(texte){
	// JavaScript écrit 1.5e+1 ; le C écrit 1.5e+01.
	return texte.replace(/e([+-])(\d)$/, "e$10$2");
}

function formaterFlottant(x, conv, precision, diese){
	var t;
	if (conv === "f" || conv === "F"){
		t = x.toFixed(Math.min(precision, 100));
		if (diese && precision === 0) t += ".";
		return t;
	}
	if (conv === "e" || conv === "E"){
		t = exposantC(x.toExponential(Math.min(precision, 100)));
		if (diese && precision === 0) t = t.replace("e", ".e");
		return conv === "E" ? t.toUpperCase() : t;
	}
	// %g : la notation la plus courte, sans zéros inutiles.
	var p = precision === 0 ? 1 : precision;
	if (x === 0) t = diese ? (0).toFixed(p - 1) : "0";
	else {
		var exp = parseInt(x.toExponential(p - 1).split("e")[1], 10);
		if (exp < -4 || exp >= p){
			t = exposantC(x.toExponential(p - 1));
			if (!diese) t = t.replace(/\.?0+e/, "e");
		} else {
			t = x.toFixed(Math.max(0, p - 1 - exp));
			if (!diese && t.indexOf(".") > -1) t = t.replace(/\.?0+$/, "");
		}
	}
	return conv === "G" ? t.toUpperCase() : t;
}

/* ------------------------------------------------------------------ */
/* 3. L'évaluateur                                                     */
/* ------------------------------------------------------------------ */

function SignalAwk(type, valeur){ this.type = type; this.valeur = valeur; }

function executerAwk(programme, io, operandes, assignations, source){
	var G = Object.create(null);      // les variables globales
	var pile = [];                    // les cadres des fonctions en cours (variables locales)
	var pas = 0;
	var sortie = [];                  // ce qui part à l'écran (ou dans le tuyau)
	var fichiers = Object.create(null);
	var cacheRegex = Object.create(null);
	var graine = 0, aleaEtat = 0;
	var enDebutOuFin = false;
	var codeSortie = 0;

	G.FS = " "; G.OFS = " "; G.ORS = "\n"; G.RS = "\n"; G.SUBSEP = "\x1c"; G.CONVFMT = "%.6g"; G.OFMT = "%.6g";
	G.NR = 0; G.FNR = 0; G.RSTART = 0; G.RLENGTH = -1; G.FILENAME = "";
	var environ = new TableauAwk();
	["HOME", "USER", "PWD", "LOGNAME", "HOSTNAME", "SHELL", "PATH"].forEach(function(nom){
		var v = nom === "SHELL" ? "/bin/bash" : (nom === "PATH" ? "/usr/local/bin:/usr/bin:/bin" : Shell.variable(nom));
		environ.d[nom] = new NombreChaine(String(v));
	});
	G.ENVIRON = environ;
	var argv = new TableauAwk();
	argv.d["0"] = new NombreChaine("awk");
	operandes.forEach(function(o, i){ argv.d[String(i + 1)] = new NombreChaine(o); });
	G.ARGV = argv;
	G.ARGC = operandes.length + 1;

	// --- Les valeurs ---
	function compter(){
		if (++pas > AWK_PAS_MAX) throw erreurAwk("programme arrêté après " + AWK_PAS_MAX + " pas : une boucle sans fin ? (vérifie la condition de tes while et for)");
	}
	function estNombreChaine(v){ return v instanceof NombreChaine; }
	function ressembleNombre(v){
		if (typeof v === "number") return true;
		if (v instanceof NombreChaine) return v.vide || RE_NOMBRE_AWK.test(v.s);
		return false;
	}
	function num(v){
		if (typeof v === "number") return v;
		if (v instanceof NombreChaine) return v.vide ? 0 : awkNombreDe(v.s);
		if (typeof v === "string") return awkNombreDe(v);
		throw erreurAwk("un tableau ne peut pas servir de nombre");
	}
	function nombreEnTexte(n, format){
		var sp = nombreSpecial(n);
		if (sp) return sp;
		if (Number.isInteger(n)) return entierEnTexte(n);
		return formaterAwk(format, [n], num, txt);
	}
	function txt(v){
		if (typeof v === "string") return v;
		if (typeof v === "number") return nombreEnTexte(v, G.CONVFMT);
		if (v instanceof NombreChaine) return v.s;
		throw erreurAwk("un tableau ne peut pas servir de texte");
	}
	function txtSortie(v){ return typeof v === "number" ? nombreEnTexte(v, txt(G.OFMT)) : txt(v); }
	function vrai(v){
		if (typeof v === "number") return v !== 0;
		if (typeof v === "string") return v !== "";
		if (v instanceof NombreChaine){
			if (v.vide) return false;
			return RE_NOMBRE_AWK.test(v.s) ? awkNombreDe(v.s) !== 0 : v.s !== "";
		}
		return true;
	}
	function comparer(a, b){
		if (ressembleNombre(a) && ressembleNombre(b)){
			var x = num(a), y = num(b);
			return x < y ? -1 : x > y ? 1 : (x === y ? 0 : NaN);
		}
		var s = txt(a), t = txt(b);
		return s < t ? -1 : s > t ? 1 : 0;
	}
	function regexDe(noeudOuValeur){
		var source;
		if (noeudOuValeur && noeudOuValeur.t === "regex") source = noeudOuValeur.source;
		else source = txt(evaluer(noeudOuValeur));
		return regexTexte(source);
	}
	function regexTexte(source){
		if (!cacheRegex[source]) cacheRegex[source] = compilerRegex(source, "awk", "g", "awk");
		var re = cacheRegex[source];
		re.lastIndex = 0;
		return re;
	}

	// --- L'enregistrement courant et ses champs ---
	var rec = { texte: "", champs: null, nf: 0, fs: " " };
	function decouper(texte, fs, paragraphe){
		if (texte === "") return [];
		if (fs === " "){
			var t = texte.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
			return t === "" ? [] : t.split(/[ \t\n]+/);
		}
		var re;
		if (fs === "") return texte.split("");
		if (fs.length === 1 && fs !== "\\") re = new RegExp(echapperRegexJS(fs) + (paragraphe ? "|\\n" : ""), "g");
		else {
			var base = compilerRegex(fs, "awk", "g", "awk");
			re = paragraphe ? new RegExp("(?:" + base.source + ")|\\n", "g") : base;
		}
		var morceaux = [], dernier = 0;
		correspondances(re, texte).forEach(function(m){
			if (m[0] === "") return;
			morceaux.push(texte.substring(dernier, m.index));
			dernier = m.index + m[0].length;
		});
		morceaux.push(texte.substring(dernier));
		return morceaux;
	}
	function assurerChamps(){
		if (rec.champs) return;
		rec.champs = [null].concat(decouper(rec.texte, rec.fs, txt(G.RS) === ""));
		rec.nf = rec.champs.length - 1;
	}
	function poserEnregistrement(texte){
		rec.texte = texte;
		rec.champs = null;
		rec.fs = txt(G.FS);
	}
	function reconstruire(){
		rec.texte = rec.champs.slice(1, rec.nf + 1).join(txt(G.OFS));
	}
	function indiceChamp(v){
		var i = Math.trunc(num(v));
		if (i < 0) throw erreurAwk("le champ $" + i + " n'existe pas : les champs commencent à $0 (la ligne entière), puis $1, $2...");
		if (i > 100000) throw erreurAwk("champ $" + i + " bien trop loin");
		return i;
	}
	function lireChamp(i){
		if (i === 0) return new NombreChaine(rec.texte);
		assurerChamps();
		return new NombreChaine(i <= rec.nf ? rec.champs[i] : "");
	}
	function ecrireChamp(i, v){
		if (i === 0){ poserEnregistrement(txt(v)); return; }
		assurerChamps();
		while (rec.nf < i){ rec.champs.push(""); rec.nf++; }
		rec.champs[i] = txt(v);
		rec.champs.length = rec.nf + 1;
		reconstruire();
	}
	function poserNF(v){
		assurerChamps();
		var n = Math.trunc(num(v));
		if (n < 0) throw erreurAwk("NF ne peut pas être négatif");
		while (rec.champs.length <= n) rec.champs.push("");
		rec.nf = n;
		rec.champs.length = n + 1;
		reconstruire();
	}

	// --- Les variables et les tableaux ---
	function cadre(){ return pile[pile.length - 1]; }
	function lireCase(noeud){ return noeud.local !== undefined ? cadre().vals[noeud.local] : G[noeud.nom]; }
	function ecrireCase(noeud, v){ if (noeud.local !== undefined) cadre().vals[noeud.local] = v; else G[noeud.nom] = v; }
	function lireVariable(noeud){
		if (noeud.local === undefined && noeud.nom === "NF"){ assurerChamps(); return rec.nf; }
		var v = lireCase(noeud);
		if (v === undefined || v instanceof RefAwk) return AWK_VIDE;
		if (v instanceof TableauAwk) throw erreurAwk("« " + noeud.nom + " » est un tableau : on ne peut pas s'en servir comme d'une simple valeur");
		return v;
	}
	function ecrireVariable(noeud, v){
		if (v instanceof TableauAwk) throw erreurAwk("on ne peut pas copier un tableau entier");
		if (noeud.local === undefined && noeud.nom === "NF"){ poserNF(v); return; }
		var avant = lireCase(noeud);
		if (avant instanceof TableauAwk) throw erreurAwk("« " + noeud.nom + " » est un tableau : on ne peut pas lui donner une simple valeur");
		ecrireCase(noeud, v);
	}
	function tableau(noeud){
		var v = lireCase(noeud);
		if (v instanceof TableauAwk) return v;
		if (v === undefined || v === AWK_VIDE){ var t = new TableauAwk(); ecrireCase(noeud, t); return t; }
		if (v instanceof RefAwk){
			var existant = v.lire();
			if (existant instanceof TableauAwk){ ecrireCase(noeud, existant); return existant; }
			var nouveau = new TableauAwk();
			v.ecrire(nouveau);
			ecrireCase(noeud, nouveau);
			return nouveau;
		}
		throw erreurAwk("« " + noeud.nom + " » contient une simple valeur : on ne peut pas s'en servir comme d'un tableau");
	}
	function cleDe(indices){
		return indices.map(function(e){
			var v = evaluer(e);
			if (typeof v === "number" && Number.isInteger(v)) return entierEnTexte(v);
			return txt(v);
		}).join(txt(G.SUBSEP));
	}
	function lireCible(c){
		if (c.t === "var") return lireVariable(c);
		if (c.t === "champ") return lireChamp(indiceChamp(evaluer(c.e)));
		var t = tableau(c.tableau), k = cleDe(c.indices);
		if (!(k in t.d)) t.d[k] = AWK_VIDE;
		return t.d[k];
	}
	/* Affecter une cible (variable, case de tableau, champ) ; on calcule une seule fois l'endroit visé. */
	function cibleResolue(c){
		if (c.t === "var") return { lire: function(){ return lireVariable(c); }, ecrire: function(v){ ecrireVariable(c, v); } };
		if (c.t === "champ"){
			var i = indiceChamp(evaluer(c.e));
			return { lire: function(){ return lireChamp(i); }, ecrire: function(v){ ecrireChamp(i, v); } };
		}
		var t = tableau(c.tableau), k = cleDe(c.indices);
		return {
			lire: function(){ if (!(k in t.d)) t.d[k] = AWK_VIDE; return t.d[k]; },
			ecrire: function(v){ t.d[k] = v; }
		};
	}

	// --- Les entrées : fichiers, entrée standard, getline ---
	var entree = { indice: 1, enregistrements: null, position: 0, fichierLu: false, finie: false };
	function enregistrementsDe(texte){
		var rs = txt(G.RS);
		if (rs === "\n") return lignesDe(texte);
		if (rs === ""){
			var t = texte.replace(/^\n+/, "").replace(/\n+$/, "");
			return t === "" ? [] : t.split(/\n\n+/);
		}
		var morceaux;
		if (rs.length === 1) morceaux = texte.split(rs);
		else {
			var re = compilerRegex(rs, "awk", "g", "awk"), dernier = 0;
			morceaux = [];
			correspondances(re, texte).forEach(function(m){ if (m[0] === "") return; morceaux.push(texte.substring(dernier, m.index)); dernier = m.index + m[0].length; });
			morceaux.push(texte.substring(dernier));
		}
		if (morceaux.length && morceaux[morceaux.length - 1].replace(/\n$/, "") === "") morceaux.pop();
		else if (morceaux.length) morceaux[morceaux.length - 1] = morceaux[morceaux.length - 1].replace(/\n$/, "");
		return morceaux;
	}
	function affecterDepuisLigneDeCommande(texte){
		var m = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(texte);
		G[m[1]] = new NombreChaine(echappementsAwk(m[2]));
	}
	function ouvrirSuivant(){
		while (entree.indice < num(G.ARGC)){
			var arg = argv.d[String(entree.indice)];
			entree.indice++;
			if (arg === undefined) continue;
			var nom = txt(arg);
			if (nom === "") continue;
			if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(nom)){ affecterDepuisLigneDeCommande(nom); continue; }
			var texte;
			if (nom === "-") texte = io.stdin === null ? "" : io.stdin;
			else {
				entree.fichierLu = true;
				try {
					texte = Shell.objetLisible(nom, io, "awk").item.getText();
				} catch (e){
					if (!(e instanceof ShellError)) throw e;
					io.err(e.message);
					codeSortie = 2;
					continue;
				}
			}
			entree.fichierLu = true;
			G.FILENAME = nom;
			G.FNR = 0;
			entree.enregistrements = enregistrementsDe(texte);
			entree.position = 0;
			return true;
		}
		if (!entree.fichierLu){
			entree.fichierLu = true;
			if (io.stdin === null) throw new ShellError("awk : il faut un objet à lire, ou un texte arrivant par un tuyau. Exemple : awk '{ print $1 }' OBJET");
			G.FILENAME = "-";
			G.FNR = 0;
			entree.enregistrements = enregistrementsDe(io.stdin);
			entree.position = 0;
			return true;
		}
		return false;
	}
	function prochainEnregistrement(){
		if (entree.finie) return null;
		for (;;){
			if (entree.enregistrements && entree.position < entree.enregistrements.length){
				G.NR = num(G.NR) + 1;
				G.FNR = num(G.FNR) + 1;
				return entree.enregistrements[entree.position++];
			}
			entree.enregistrements = null;
			if (!ouvrirSuivant()){ entree.finie = true; return null; }
		}
	}
	var lectures = Object.create(null);  // getline < fichier : où en est-on dans chaque fichier
	function getline(n){
		var ligne;
		if (n.fichier){
			var nom = txt(evaluer(n.fichier));
			if (!lectures[nom]){
				var texte;
				if (nom === "-" || nom === "/dev/stdin") texte = io.stdin === null ? "" : io.stdin;
				else {
					try { texte = Shell.objetLisible(nom, io, "awk").item.getText(); }
					catch (e){ if (e instanceof ShellError) return -1; throw e; }
				}
				lectures[nom] = { lignes: enregistrementsDe(texte), position: 0 };
			}
			var l = lectures[nom];
			if (l.position >= l.lignes.length) return 0;
			ligne = l.lignes[l.position++];
			if (n.dest) cibleResolue(n.dest).ecrire(new NombreChaine(ligne));
			else { poserEnregistrement(ligne); }
			return 1;
		}
		ligne = prochainEnregistrement();
		if (ligne === null) return 0;
		if (n.dest) cibleResolue(n.dest).ecrire(new NombreChaine(ligne));
		else poserEnregistrement(ligne);
		return 1;
	}

	// --- Les sorties : écran, fichiers ---
	function ecrireSortie(texte, redir){
		if (!redir){ sortie.push(texte); return; }
		var nom = txt(evaluer(redir.cible));
		if (nom === "/dev/stdout" || nom === "-"){ sortie.push(texte); return; }
		if (nom === "/dev/stderr"){ io.err(sansDernierRetour(texte)); return; }
		if (!fichiers[nom]) fichiers[nom] = { ajout: redir.mode === ">>", contenu: "" };
		fichiers[nom].contenu += texte;
	}
	function fermer(nom){
		var f = fichiers[nom];
		if (!f) { if (lectures[nom]){ delete lectures[nom]; return 0; } return -1; }
		Shell.ecrire(nom, sansDernierRetour(f.contenu), f.ajout, f.contenu !== "" && f.contenu.charAt(f.contenu.length - 1) !== "\n");
		delete fichiers[nom];
		return 0;
	}

	// --- Les fonctions intégrées ---
	function integree(n){
		var a = n.args, nom = n.nom, s, re, m;
		switch (nom){
			case "length":
				if (a.length === 0) return txt(lireChamp(0)).length;
				if (a[0].t === "var"){
					var v = a[0].local !== undefined || a[0].nom !== "NF" ? lireCase(a[0]) : undefined;
					if (v instanceof TableauAwk) return Object.keys(v.d).length;
				}
				return Array.from(txt(evaluer(a[0]))).length;
			case "substr":
				s = Array.from(txt(evaluer(a[0])));
				var debut = num(evaluer(a[1]));
				var longueur = a.length > 2 ? num(evaluer(a[2])) : Infinity;
				if (isNaN(debut)) debut = 1;
				var d = arrondiPair(debut), l = longueur === Infinity ? Infinity : arrondiPair(longueur);
				if (isNaN(l)) l = 0;
				if (d < 1){ l += d - 1; d = 1; }
				if (l <= 0) return "";
				return s.slice(d - 1, l === Infinity ? undefined : d - 1 + l).join("");
			case "index":
				s = txt(evaluer(a[0]));
				var t = txt(evaluer(a[1]));
				var pos = s.indexOf(t);
				return pos < 0 ? 0 : Array.from(s.substring(0, pos)).length + 1;
			case "split":
				s = txt(evaluer(a[0]));
				if (a[1].t !== "var") throw erreurAwk("split : le deuxième argument doit être le nom d'un tableau");
				var tab = tableau(a[1]);
				var morceaux;
				if (a.length > 2){
					if (a[2].t === "regex"){
						var r1 = regexTexte(a[2].source), dernier = 0;
						morceaux = [];
						if (s !== ""){
							correspondances(r1, s).forEach(function(mm){ if (mm[0] === "") return; morceaux.push(s.substring(dernier, mm.index)); dernier = mm.index + mm[0].length; });
							morceaux.push(s.substring(dernier));
						}
					}
					else morceaux = decouper(s, txt(evaluer(a[2])), false);
				}
				else morceaux = decouper(s, txt(G.FS), false);
				tab.d = Object.create(null);
				morceaux.forEach(function(x, i){ tab.d[String(i + 1)] = new NombreChaine(x); });
				return morceaux.length;
			case "sub": case "gsub":
				re = regexDe(a[0]);
				var remplacement = txt(evaluer(a[1]));
				var cible = a.length > 2 ? cibleResolue(a[2]) : { lire: function(){ return lireChamp(0); }, ecrire: function(v){ ecrireChamp(0, v); } };
				s = txt(cible.lire());
				var liste = correspondances(re, s, nom === "sub" ? 1 : 0);
				if (!liste.length) return 0;
				var res = "", der = 0;
				liste.forEach(function(mm){
					res += s.substring(der, mm.index);
					for (var i = 0; i < remplacement.length; i++){
						var c = remplacement.charAt(i);
						if (c === "\\" && (remplacement.charAt(i + 1) === "&" || remplacement.charAt(i + 1) === "\\")){ res += remplacement.charAt(++i); continue; }
						res += c === "&" ? mm[0] : c;
					}
					der = mm.index + mm[0].length;
				});
				cible.ecrire(res + s.substring(der));
				return liste.length;
			case "gensub":
				re = regexDe(a[0]);
				var rempl = txt(evaluer(a[1]));
				var comment = evaluer(a[2]);
				var quand = typeof comment !== "number" && /^[gG]/.test(txt(comment)) ? 0 : Math.max(1, Math.trunc(num(comment)) || 1);
				s = a.length > 3 ? txt(evaluer(a[3])) : txt(lireChamp(0));
				var toutes = correspondances(re, s, 0);
				var resultat = "", dern = 0;
				toutes.forEach(function(mm, rang){
					if (quand && rang + 1 !== quand) return;
					resultat += s.substring(dern, mm.index);
					for (var i = 0; i < rempl.length; i++){
						var c = rempl.charAt(i);
						if (c === "\\" && i + 1 < rempl.length){
							var dd = rempl.charAt(++i);
							if (/\d/.test(dd)) resultat += mm[parseInt(dd, 10)] || "";
							else resultat += dd;
							continue;
						}
						resultat += c === "&" ? mm[0] : c;
					}
					dern = mm.index + mm[0].length;
				});
				return resultat + s.substring(dern);
			case "match":
				s = txt(evaluer(a[0]));
				re = regexDe(a[1]);
				m = re.exec(s);
				if (a.length > 2){
					if (a[2].t !== "var") throw erreurAwk("match : le troisième argument doit être le nom d'un tableau");
					var groupes = tableau(a[2]);
					groupes.d = Object.create(null);
					if (m) for (var g = 0; g < m.length; g++) if (m[g] !== undefined) groupes.d[String(g)] = new NombreChaine(m[g]);
				}
				if (!m){ G.RSTART = 0; G.RLENGTH = -1; return 0; }
				G.RSTART = Array.from(s.substring(0, m.index)).length + 1;
				G.RLENGTH = Array.from(m[0]).length;
				return G.RSTART;
			case "sprintf":
				return formaterAwk(txt(evaluer(a[0])), a.slice(1).map(evaluer), num, txt);
			case "sin": return Math.sin(num(evaluer(a[0])));
			case "cos": return Math.cos(num(evaluer(a[0])));
			case "atan2": return Math.atan2(num(evaluer(a[0])), num(evaluer(a[1])));
			case "exp": return Math.exp(num(evaluer(a[0])));
			case "log": return Math.log(num(evaluer(a[0])));
			case "sqrt": return Math.sqrt(num(evaluer(a[0])));
			case "int": return Math.trunc(num(evaluer(a[0])));
			case "rand":
				// Un générateur simple et reproductible : comme awk, la même suite à chaque lancement sans srand().
				aleaEtat = (aleaEtat * 1103515245 + 12345) % 2147483648;
				return aleaEtat / 2147483648;
			case "srand":
				var avant = graine;
				graine = a.length ? Math.trunc(num(evaluer(a[0]))) : Math.floor(Date.now() / 1000);
				aleaEtat = Math.abs(graine) % 2147483648;
				return avant;
			case "tolower": return txt(evaluer(a[0])).toLowerCase();
			case "toupper": return txt(evaluer(a[0])).toUpperCase();
			case "systime": return Math.floor(Date.now() / 1000);
			case "strftime":
				var fmt = a.length ? txt(evaluer(a[0])) : "%a %b %e %H:%M:%S %Z %Y";
				var date = new Date(a.length > 1 ? num(evaluer(a[1])) * 1000 : Date.now());
				var JOURS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MOIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				function deux(x){ return (x < 10 ? "0" : "") + x; }
				return fmt.replace(/%([a-zA-Z%])/g, function(tout, l){
					switch (l){
						case "Y": return String(date.getFullYear());
						case "m": return deux(date.getMonth() + 1);
						case "d": return deux(date.getDate());
						case "e": return completerGauche(date.getDate(), 2);
						case "H": return deux(date.getHours());
						case "M": return deux(date.getMinutes());
						case "S": return deux(date.getSeconds());
						case "a": return JOURS[date.getDay()];
						case "b": return MOIS[date.getMonth()];
						case "Z": return "UTC";
						case "%": return "%";
						default: return tout;
					}
				});
			case "close": return fermer(txt(evaluer(a[0])));
			case "fflush": return 0;
			case "system":
				throw erreurAwk("system() n'est pas permis ici : awk ne lance pas d'autres commandes dans ce jeu");
		}
		throw erreurAwk("fonction « " + nom + " » inconnue");
	}

	// --- Les fonctions du joueur ---
	function appeler(n){
		var f = programme.fonctions[n.nom];
		if (n.args.length > f.params.length) throw erreurAwk("la fonction « " + n.nom + " » reçoit " + n.args.length + " arguments, mais n'en déclare que " + f.params.length);
		if (pile.length >= AWK_PROFONDEUR_MAX) throw erreurAwk("trop d'appels imbriqués de « " + n.nom + " » (une récursion sans fin ?)");
		var vals = [];
		n.args.forEach(function(arg, i){
			if (arg.t === "var" && !(arg.local === undefined && arg.nom === "NF")){
				var v = lireCase(arg);
				if (v instanceof TableauAwk){ vals[i] = v; return; }
				if (v === undefined || v === AWK_VIDE){
					// Une variable encore vierge : passée par référence, au cas où la fonction en ferait un tableau.
					var cadreAppelant = cadre();
					vals[i] = new RefAwk(
						function(){ return arg.local !== undefined ? cadreAppelant.vals[arg.local] : G[arg.nom]; },
						function(t){ if (arg.local !== undefined) cadreAppelant.vals[arg.local] = t; else G[arg.nom] = t; });
					return;
				}
				if (v instanceof RefAwk){ vals[i] = v; return; }
				vals[i] = v;
				return;
			}
			vals[i] = evaluer(arg);
		});
		pile.push({ vals: vals });
		try {
			var r = executer(f.corps);
			if (r instanceof SignalAwk && r.type === "return") return r.valeur;
			return AWK_VIDE;
		} finally {
			pile.pop();
		}
	}

	// --- Les expressions ---
	function arithmetique(op, x, y){
		switch (op){
			case "+": return x + y;
			case "-": return x - y;
			case "*": return x * y;
			case "/": if (y === 0) throw erreurAwk("division par zéro"); return x / y;
			case "%": if (y === 0) throw erreurAwk("division par zéro dans %"); return x % y;
			case "^": return Math.pow(x, y);
		}
	}
	function evaluer(n){
		switch (n.t){
			case "num": return n.v;
			case "str": return n.v;
			case "regex": return regexTexte(n.source).test(rec.texte) ? 1 : 0;
			case "groupe": return evaluer(n.e);
			case "var": return lireVariable(n);
			case "indice": return lireCible(n);
			case "champ": return lireChamp(indiceChamp(evaluer(n.e)));
			case "affecter":
				var cible = cibleResolue(n.cible);
				var valeur = evaluer(n.e);
				if (valeur instanceof NombreChaine && valeur.vide) valeur = AWK_VIDE;
				if (n.op !== "=") valeur = arithmetique(n.op.charAt(0), num(cible.lire()), num(valeur));
				else if (valeur instanceof TableauAwk) throw erreurAwk("on ne peut pas copier un tableau entier");
				cible.ecrire(valeur);
				return valeur;
			case "si?": return vrai(evaluer(n.c)) ? evaluer(n.a) : evaluer(n.b);
			case "ou": return vrai(evaluer(n.a)) || vrai(evaluer(n.b)) ? 1 : 0;
			case "et": return vrai(evaluer(n.a)) && vrai(evaluer(n.b)) ? 1 : 0;
			case "dans":
				var cle = cleDe(n.cles);
				return cle in tableau(n.tableau).d ? 1 : 0;
			case "~":
				var texte = txt(evaluer(n.a));
				var ok = regexDe(n.re).test(texte);
				return (n.non ? !ok : ok) ? 1 : 0;
			case "cmp":
				var c = comparer(evaluer(n.a), evaluer(n.b));
				switch (n.op){
					case "<": return c < 0 ? 1 : 0;
					case "<=": return c <= 0 ? 1 : 0;
					case ">": return c > 0 ? 1 : 0;
					case ">=": return c >= 0 ? 1 : 0;
					case "==": return c === 0 ? 1 : 0;
					case "!=": return c !== 0 ? 1 : 0;
				}
				return 0;
			case "concat": var gauche = txt(evaluer(n.a)); return gauche + txt(evaluer(n.b));
			case "op": var x = num(evaluer(n.a)); return arithmetique(n.op, x, num(evaluer(n.b)));
			case "moins": return -num(evaluer(n.e));
			case "plus": return num(evaluer(n.e));
			case "non": return vrai(evaluer(n.e)) ? 0 : 1;
			case "++pre": case "--pre":
				var cp = cibleResolue(n.cible);
				var nv = num(cp.lire()) + (n.t === "++pre" ? 1 : -1);
				cp.ecrire(nv);
				return nv;
			case "post++": case "post--":
				var cq = cibleResolue(n.cible);
				var ancien = num(cq.lire());
				cq.ecrire(ancien + (n.t === "post++" ? 1 : -1));
				return ancien;
			case "appel": return appeler(n);
			case "integree": return integree(n);
			case "getline": return getline(n);
		}
		throw erreurAwk("expression inconnue (" + n.t + ")");
	}

	// --- Les instructions ---
	var CASSER = new SignalAwk("break"), CONTINUER = new SignalAwk("continue");
	function executer(n){
		compter();
		switch (n.t){
			case "bloc":
				for (var i = 0; i < n.liste.length; i++){
					var r = executer(n.liste[i]);
					if (r) return r;
				}
				return null;
			case "expr": evaluer(n.e); return null;
			case "print":
				var morceaux = n.args.length ? n.args.map(function(e){ return txtSortie(evaluer(e)); }) : [rec.texte];
				ecrireSortie(morceaux.join(txt(G.OFS)) + txt(G.ORS), n.redir);
				return null;
			case "printf":
				var valeurs = n.args.map(evaluer);
				ecrireSortie(formaterAwk(txt(valeurs[0]), valeurs.slice(1), num, txt), n.redir);
				return null;
			case "si":
				if (vrai(evaluer(n.c))) return executer(n.alors);
				return n.sinon ? executer(n.sinon) : null;
			case "tantque":
				while (vrai(evaluer(n.c))){
					compter();
					var rw = executer(n.corps);
					if (rw === CASSER) break;
					if (rw && rw !== CONTINUER) return rw;
				}
				return null;
			case "faire":
				do {
					compter();
					var rd = executer(n.corps);
					if (rd === CASSER) break;
					if (rd && rd !== CONTINUER) return rd;
				} while (vrai(evaluer(n.c)));
				return null;
			case "pour":
				if (n.init) executer(n.init);
				while (!n.c || vrai(evaluer(n.c))){
					compter();
					var rp = executer(n.corps);
					if (rp === CASSER) break;
					if (rp && rp !== CONTINUER) return rp;
					if (n.pas) executer(n.pas);
				}
				return null;
			case "pourdans":
				var t = tableau(n.tableau);
				var cles = Object.keys(t.d);
				for (var k = 0; k < cles.length; k++){
					if (!(cles[k] in t.d)) continue;
					compter();
					cibleResolue(n.cle).ecrire(new NombreChaine(cles[k]));
					var rf = executer(n.corps);
					if (rf === CASSER) break;
					if (rf && rf !== CONTINUER) return rf;
				}
				return null;
			case "break": return CASSER;
			case "continue": return CONTINUER;
			case "next":
				if (enDebutOuFin) throw erreurAwk("next n'a pas de sens dans BEGIN ou END");
				throw new SignalAwk("next");
			case "nextfile":
				if (enDebutOuFin) throw erreurAwk("nextfile n'a pas de sens dans BEGIN ou END");
				throw new SignalAwk("nextfile");
			case "exit":
				throw new SignalAwk("exit", n.e ? Math.trunc(num(evaluer(n.e))) : null);
			case "return":
				var v = n.e ? evaluer(n.e) : AWK_VIDE;
				if (v instanceof TableauAwk) throw erreurAwk("une fonction ne peut pas renvoyer un tableau");
				return new SignalAwk("return", v);
			case "delete":
				var tab = tableau(n.tableau);
				if (n.indices === null) tab.d = Object.create(null);
				else delete tab.d[cleDe(n.indices)];
				return null;
		}
		throw erreurAwk("instruction inconnue (" + n.t + ")");
	}
	function signal(e, type){ return e instanceof SignalAwk && e.type === type; }

	// --- Le déroulement : BEGIN, chaque enregistrement, END ---
	assignations.forEach(affecterDepuisLigneDeCommande);
	var sortieDemandee = false;
	try {
		enDebutOuFin = true;
		programme.debut.forEach(function(b){ executer(b); });
		enDebutOuFin = false;
	} catch (e){
		if (!signal(e, "exit")) throw e;
		sortieDemandee = true;
		if (e.valeur !== null) codeSortie = e.valeur;
	}
	if (!sortieDemandee && (programme.regles.length || programme.fin.length)){
		var actifs = programme.regles.map(function(){ return false; });
		var ligne;
		try {
			while ((ligne = prochainEnregistrement()) !== null){
				poserEnregistrement(ligne);
				try {
					for (var r = 0; r < programme.regles.length; r++){
						var regle = programme.regles[r], choisie;
						compter();
						if (!regle.motif) choisie = true;
						else if (!regle.motif2) choisie = vrai(evaluer(regle.motif));
						else if (actifs[r]){
							choisie = true;
							if (vrai(evaluer(regle.motif2))) actifs[r] = false;
						} else if (vrai(evaluer(regle.motif))){
							// Une plage peut commencer et finir sur le même enregistrement.
							choisie = true;
							actifs[r] = !vrai(evaluer(regle.motif2));
						} else choisie = false;
						if (!choisie) continue;
						if (regle.action) executer(regle.action);
						else ecrireSortie(rec.texte + txt(G.ORS), null);
					}
				} catch (e){
					if (signal(e, "next")) continue;
					if (signal(e, "nextfile")){ entree.enregistrements = null; continue; }
					throw e;
				}
			}
		} catch (e){
			if (!signal(e, "exit")) throw e;
			if (e.valeur !== null) codeSortie = e.valeur;
		}
	}
	try {
		enDebutOuFin = true;
		programme.fin.forEach(function(b){ executer(b); });
	} catch (e){
		if (!signal(e, "exit")) throw e;
		if (e.valeur !== null) codeSortie = e.valeur;
	}
	Object.keys(fichiers).forEach(fermer);
	return { sortie: sortie.join(""), code: codeSortie };
}

/* Le sort lui-même : awk [-F SEP] [-v var=val] [-f PROGRAMME | 'programme'] [OBJET...] */
Shell.sorts.awk = function(args, io){
	var separateur = null, assignations = [], source = null, operandes = [], i = 0, fin = false;
	for (; i < args.length; i++){
		var a = args[i];
		if (fin || source !== null || a === "-" || a.charAt(0) !== "-"){
			if (source === null){ source = a; continue; }
			operandes.push(a);
			continue;
		}
		if (a === "--"){ fin = true; continue; }
		if (a.indexOf("-F") === 0 || a === "--field-separator" || a.indexOf("--field-separator=") === 0){
			separateur = a.indexOf("--field-separator=") === 0 ? a.substring(18) : (a.length > 2 && a.charAt(1) === "F" ? a.substring(2) : args[++i]);
			if (separateur === undefined) throw new ShellError("awk : -F attend un séparateur, par exemple : awk -F: '{ print $1 }' OBJET");
			continue;
		}
		if (a.indexOf("-v") === 0 || a === "--assign"){
			var affectation = a.length > 2 && a.charAt(1) === "v" ? a.substring(2) : args[++i];
			if (affectation === undefined || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(affectation)){
				throw new ShellError("awk : -v attend une affectation NOM=valeur, par exemple : awk -v seuil=10 '$2 > seuil' OBJET");
			}
			assignations.push(affectation);
			continue;
		}
		if (a.indexOf("-f") === 0 || a === "--file"){
			var nomProg = a.length > 2 && a.charAt(1) === "f" ? a.substring(2) : args[++i];
			if (nomProg === undefined) throw new ShellError("awk : -f attend le nom d'un objet qui contient le programme");
			source = Shell.objetLisible(nomProg, io, "awk").item.getText();
			continue;
		}
		if (a === "--posix" || a === "--traditional" || a === "--re-interval") continue;
		throw new ShellError("awk : option inconnue « " + a + " ». Les options : -F SEPARATEUR, -v NOM=valeur, -f PROGRAMME");
	}
	if (source === null) throw new ShellError("awk : quel programme ? Exemple : awk -F: '$3 == 0 { print $1 }' passwd");
	var programme = parserAwk(source);
	if (separateur !== null){
		// -F t veut dire tabulation (une vieille convention d'awk) ; -F '\t' aussi.
		var fs = separateur === "t" ? "\t" : echappementsAwk(separateur);
		assignations.unshift("FS=" + fs.replace(/\\/g, "\\\\"));
	}
	var r = executerAwk(programme, io, operandes, assignations, source);
	if (r.code) io.code = r.code;
	var texte = sansDernierRetour(r.sortie);
	GameEvents.fire({ type: "awk", programme: source, separateur: separateur, sortie: texte, room: current_room });
	return texte;
};
