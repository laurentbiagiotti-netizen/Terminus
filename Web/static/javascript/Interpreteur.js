/**
 * Interpreteur.js : le vrai shell du jeu, un sous-ensemble pédagogique de bash.
 *
 * Shell.js sait lancer un tuyau (sort1 | sort2 > objet) et un sort. Ici, on lit un vrai programme,
 * en trois temps, comme bash :
 *
 *   1. le LEXEUR découpe le texte en jetons : des mots (avec leurs guillemets, leurs $VAR, leurs
 *      $(...), leurs $((...))), des opérateurs (| || && ; ;; & ( )), des redirections
 *      (> >> < << <<< 2> 2>&1 &>...) et des retours à la ligne ;
 *   2. l'ANALYSEUR (une descente récursive) en fait un arbre : listes, tuyaux, commandes simples,
 *      if, for, while, until, case, fonctions, { }, ( ), (( )) et [[ ]] ;
 *   3. l'EXÉCUTION parcourt l'arbre. Chaque tuyau passe par Shell.tuyau (que l'épreuve finale
 *      surveille) et chaque sort par Shell.appeler (que les habillages des chapitres décorent) :
 *      on les appelle toujours par la propriété, au moment de l'appel.
 *
 * Les mots sont développés au moment d'exécuter, comme dans bash : N=3; echo $N affiche bien 3.
 * L'ordre est celui de bash : accolades {a,b}, variables, $(...), $((...)), découpage en mots
 * (IFS), jokers * et ?.
 *
 * Tout est synchrone dans le navigateur : un garde-fou compte les commandes lancées
 * (Interpreteur.LIMITE_COMMANDES) et la profondeur des appels (Interpreteur.LIMITE_PROFONDEUR),
 * pour qu'une boucle infinie ne fige jamais la page.
 *
 * Ce qu'on peut appeler d'ailleurs (un sort, le chapitre 4) :
 *   Interpreteur.executer(texte)            lance un texte comme au prompt ; renvoie le statut
 *   Interpreteur.capturer(texte, options)   le lance à part : { code, sortie, erreurs } (stdout et stderr séparés)
 *        options : { positionnels: [...], nom0: "nom", portee: "enfant" (défaut) ou "courante" }
 *   Interpreteur.lancerScript(texte, io, options)   ce que fait bash SCRIPT (utilisé par Shell.js)
 *   Interpreteur.analyser(texte)            l'arbre ; lève une ShellError, ou Incomplet
 *   Interpreteur.verifier(texte)            null, "incomplet", ou la ShellError de syntaxe
 *   Interpreteur.ceQuiManque(texte)         ce qui manque à un texte inachevé, en clair (ou null)
 *   Interpreteur.structures(texte)          les structures qu'il utilise : ["if", "for", "fonction", "read"...]
 *   Interpreteur.lire(nom), Interpreteur.affecter(nom, valeur)   les variables, portée comprise
 *   Interpreteur.arith(texte)               un calcul $((...)), sans eval
 *   Shell.statut                            le statut de la dernière commande ($?)
 *
 * Les événements (GameEvents) utiles aux quêtes :
 *   { type: "script", item, room, direct, nom, args, statut, structures }
 *        à la fin de bash SCRIPT, ./script (item : l'objet du script ; direct : lancé par son chemin)
 *        et de bash -c TEXTE (item : null, nom : "bash -c"). structures : comme Interpreteur.structures.
 *   { type: "boucle", sorte, tours, statut, interrompue, dansScript }
 *        à la fin de chaque boucle ; sorte : "for", "for ((", "while" ou "until" ; interrompue : sortie par break.
 *   { type: "fonction", action: "definition", nom, dansScript }
 *   { type: "fonction", action: "appel", nom, args, statut, profondeur, dansScript }
 *        profondeur : 1 pour un appel direct, plus dans une autre fonction (récursion) ou un $(...).
 *
 * Les garde-fous : Interpreteur.LIMITE_COMMANDES commandes par ligne tapée (un script compris),
 * Interpreteur.LIMITE_PROFONDEUR appels emboîtés, et 400 lignes par script (Shell.js).
 */

/* ------------------------------------------------------------------ */
/* L'état                                                              */
/* ------------------------------------------------------------------ */

var Interpreteur = {
	LIMITE_COMMANDES: 5000,     // commandes lancées par ligne tapée (ou par script)
	LIMITE_PROFONDEUR: 100,     // fonctions, $(...), source et eval emboîtés
	LIMITE_TEXTE: 100000,       // taille d'une variable
	LIMITE_SORTIE: 1000000,     // taille d'une sortie capturée
	cadres: [],                 // la pile des portées : scripts, fonctions, sous-shells
	flux: [],                   // la pile des sorties capturées
	entrees: [],                // la pile des entrées standard (ce que lit read)
	fonctions: {},              // les fonctions définies au prompt
	nonExportees: {},           // les variables du prompt créées sans export : un script ne les voit pas
	tableaux: {},               // les tableaux définis au prompt (state.env ne garde que du texte)
	positionnels: [],           // $1, $2... au prompt (set -- a b c)
	options: { e: false, x: false, u: false, pipefail: false },  // set -e, -x, -u, -o pipefail au prompt
	compte: 0, profondeur: 0, niveau: 0, boucles: 0, conditionnel: 0,
	dernierSubst: null,         // le statut du dernier $(...) : A=$(false) pose $? = 1
	signalEnAttente: null,      // un exit ou un return qui attend que son tuyau ait rangé sa sortie
	enAlias: {},
	fondSignale: false
};

/* Tout le reste vit dans cette fonction : ses noms (citer, entier, restaurerLieu...) ne gênent pas ceux des autres fichiers. */
(function(){

/* Une saisie inachevée : il manque la suite (fi, done, un guillemet...). */
function Incomplet(attendu){ this.attendu = attendu || ""; this.message = "saisie incomplète"; }
/* Les sauts : break et continue, return, exit. Ce ne sont pas des erreurs. */
function SignalBoucle(sorte, niveau){ this.sorte = sorte; this.niveau = niveau; this.code = 0; }
function SignalRetour(code){ this.code = code; }
function SignalSortie(code){ this.code = code; }
/* Le garde-fou : on arrête tout, jusqu'au prompt. */
function LimiteAtteinte(message){ this.message = message; }

function estSignal(e){ return e instanceof SignalSortie || e instanceof SignalRetour || e instanceof SignalBoucle; }

/* Le statut d'un exit ou d'un return : un nombre de 0 à 255. */
function codeDe(texte, cmd){
	if (texte === undefined) return Shell.statut;
	if (!/^\s*[+-]?\d+\s*$/.test(texte)) throw new ShellError(cmd + " : « " + texte + " » : il faut un nombre (le statut, de 0 à 255)", 2);
	return ((parseInt(texte, 10) % 256) + 256) % 256;
}

function compter(){
	if (++Interpreteur.compte > Interpreteur.LIMITE_COMMANDES){
		throw new LimiteAtteinte("bash : arrêt d'urgence après " + Interpreteur.LIMITE_COMMANDES + " commandes. Boucle infinie ?\n" +
			C.gris("(Vérifie la condition de ta boucle, et ce qui la fait avancer : une variable qu'on oublie d'augmenter, " +
			"un while true sans break... Dans ce monde, une ligne ne peut pas lancer plus de " + Interpreteur.LIMITE_COMMANDES + " commandes.)"));
	}
}

/* ------------------------------------------------------------------ */
/* Les messages d'erreur de syntaxe                                    */
/* ------------------------------------------------------------------ */

var CONSEILS_SYNTAXE = {
	"then": "(Avant then, il faut un point-virgule ou un retour à la ligne : if [ -f rapport ]; then ...)",
	"do": "(Avant do, il faut un point-virgule ou un retour à la ligne : for x in a b c; do ...)",
	"fi": "(Ce fi ferme un if qui n'a pas été ouvert, ou le then manque.)",
	"done": "(Ce done ferme une boucle qui n'a pas été ouverte, ou le do manque.)",
	"else": "(Un else sans if ouvert, ou un bloc then vide : il faut au moins une commande entre then et else.)",
	"elif": "(Un elif sans if ouvert.)",
	"esac": "(Ce esac ferme un case qui n'a pas été ouvert.)",
	"}": "(Cette accolade ferme un bloc qui n'a pas été ouvert.)",
	")": "(Une parenthèse fermante de trop ?)",
	"(": "(Une parenthèse au milieu d'une commande : protège-la avec des guillemets, \"(comme ceci)\".)",
	";;": "(;; termine un cas de case ... esac, et seulement là.)",
	"|": "(Il manque un sort avant le tuyau |.)",
	"&&": "(Il manque une commande avant &&.)",
	"||": "(Il manque une commande avant ||.)",
	";": "(Un point-virgule seul, sans commande avant.)"
};

function erreurSyntaxe(symbole){
	return new ShellError("bash : erreur de syntaxe près du symbole inattendu « " + symbole + " »" +
		(CONSEILS_SYNTAXE[symbole] ? "\n" + C.gris(CONSEILS_SYNTAXE[symbole]) : ""), 2);
}

var CONSEILS_FIN = {
	"fi": "il manque un « fi » pour fermer le « if »",
	"then": "il manque « then » après la condition du if (avec un ; ou un retour à la ligne avant)",
	"done": "il manque un « done » pour fermer la boucle",
	"do": "il manque « do » après la ligne du for ou du while",
	"esac": "il manque un « esac » pour fermer le « case »",
	"}": "il manque une accolade « } » pour fermer le bloc",
	")": "il manque une parenthèse « ) »",
	"))": "il manque « )) » pour fermer le calcul",
	"]]": "il manque « ]] » pour fermer le test",
	"\"": "un guillemet \" n'est pas refermé",
	"'": "une apostrophe ' n'est pas refermée",
	"`": "une apostrophe inverse ` n'est pas refermée",
	"\\": "la dernière ligne finit par \\ : la commande continue à la ligne suivante",
	"suite": "la commande s'arrête sur | , && ou || : il manque la suite"
};

function erreurFinDeFichier(inc){
	var a = inc.attendu;
	var conseil = CONSEILS_FIN[a] || (a ? "le here-document attend sa ligne de fin : « " + a + " »" : "");
	return new ShellError("bash : erreur de syntaxe : fin de fichier prématurée" + (conseil ? "\n" + C.gris("(" + conseil + ")") : ""), 2);
}

function texteJeton(j){
	if (j.type === "mot") return j.brut;
	if (j.type === "op") return j.v;
	if (j.type === "redir") return j.op;
	if (j.type === "arith") return "((";
	if (j.type === "nl") return "newline";
	return "fin de fichier";
}

function ligneDe(texte, pos){
	var n = 1;
	for (var i = 0; i < pos && i < texte.length; i++) if (texte.charAt(i) === "\n") n++;
	return n;
}

/* La valeur d'un mot sans guillemets ni $ (if, fi, un nom de variable...), ou null. */
function litteralDe(parties){
	var v = "";
	for (var i = 0; i < parties.length; i++){
		if (parties[i].t !== "lit") return null;
		v += parties[i].v;
	}
	return v;
}

/* ------------------------------------------------------------------ */
/* 1. Le lexeur                                                        */
/* ------------------------------------------------------------------ */

var RESERVES = { "if": 1, "then": 1, "elif": 1, "else": 1, "fi": 1, "for": 1, "in": 1, "do": 1, "done": 1,
	"while": 1, "until": 1, "case": 1, "esac": 1, "function": 1, "{": 1, "}": 1, "!": 1, "[[": 1, "]]": 1 };
/* Après ces mots, on est au début d'une commande : (( y ouvre un calcul. */
var AVANT_COMMANDE = { "if": 1, "then": 1, "elif": 1, "else": 1, "do": 1, "while": 1, "until": 1, "{": 1, "!": 1, "for": 1 };
var METACARACTERES = " \t\r\n;&|<>()";

function Lexeur(texte, debut){
	this.t = texte;
	this.i = debut || 0;
	this.n = texte.length;
	this.heredocs = [];     // les here-documents dont on lira le corps après le prochain retour à la ligne
	this.dernier = null;    // le dernier jeton rendu
	this.regex = false;     // le prochain mot est l'expression régulière d'un =~
	this.tolerant = false;  // dans un script, un here-document sans ligne de fin prend le reste du texte
}

Lexeur.prototype.suivant = function(){
	var j = this.lireJeton();
	this.dernier = j;
	return j;
};

Lexeur.prototype.debutCommande = function(){
	var d = this.dernier;
	if (d === null || d.type === "nl" || d.type === "op") return true;
	return d.type === "mot" && !!d.reserve && AVANT_COMMANDE.hasOwnProperty(d.reserve);
};

/* Saute les blancs, les \ en fin de ligne et les commentaires. */
Lexeur.prototype.sauterBlancs = function(){
	var t = this.t;
	for (;;){
		while (this.i < this.n){
			var c = t.charAt(this.i);
			if (c === " " || c === "\t" || c === "\r") this.i++;
			else if (c === "\\" && t.charAt(this.i + 1) === "\n") this.i += 2;
			else break;
		}
		// # au début d'un mot : un commentaire, jusqu'au bout de la ligne
		if (this.i < this.n && t.charAt(this.i) === "#" && !this.regex){
			while (this.i < this.n && t.charAt(this.i) !== "\n") this.i++;
			continue;
		}
		return;
	}
};

Lexeur.prototype.lireJeton = function(){
	this.sauterBlancs();
	var t = this.t, pos = this.i;
	if (pos >= this.n){
		if (this.heredocs.length) this.finHeredocs();
		return { type: "fin", pos: pos };
	}
	if (this.regex) return this.lireMot("regex");
	var c = t.charAt(pos), c2 = t.charAt(pos + 1), c3 = t.charAt(pos + 2);
	var op = function(v){ this.i = pos + v.length; return { type: "op", v: v, pos: pos }; }.bind(this);
	if (c === "\n"){ this.i++; this.lireHeredocs(); return { type: "nl", pos: pos }; }
	if ((c === "0" || c === "1" || c === "2") && (c2 === ">" || c2 === "<")) return this.lireRedirection(c);
	if (c === ">" || c === "<") return this.lireRedirection("");
	if (c === "&" && c2 === ">") return this.lireRedirection("&");
	if (c === "(" && c2 === "(" && this.debutCommande()){
		var calcul = this.lireArithCommande();
		if (calcul) return calcul;
	}
	if (c === "(" || c === ")") return op(c);
	if (c === ";"){
		if (c2 === ";" && c3 === "&") return op(";;&");
		if (c2 === ";") return op(";;");
		if (c2 === "&") return op(";&");
		return op(";");
	}
	if (c === "&") return op(c2 === "&" ? "&&" : "&");
	if (c === "|") return op(c2 === "|" ? "||" : (c2 === "&" ? "|&" : "|"));
	return this.lireMot("mot");
};

Lexeur.prototype.lireRedirection = function(fd){
	var t = this.t, pos = this.i;
	var jeton = function(o){ return { type: "redir", op: o, pos: pos }; };
	this.i += fd.length;
	if (fd === "&"){
		this.i++;
		if (t.charAt(this.i) === ">"){ this.i++; return jeton("&>>"); }
		return jeton("&>");
	}
	if (t.charAt(this.i) === "<"){
		this.i++;
		if (fd === "1" || fd === "2") throw new ShellError("bash : la redirection « " + fd + "< » n'existe pas dans ce monde (< seul fait lire un objet)", 2);
		if (t.charAt(this.i) === "<"){
			this.i++;
			if (t.charAt(this.i) === "<"){ this.i++; return jeton("<<<"); }
			if (t.charAt(this.i) === "-"){ this.i++; return jeton("<<-"); }
			return jeton("<<");
		}
		if (t.charAt(this.i) === "&" || t.charAt(this.i) === ">") throw new ShellError("bash : la redirection « <" + t.charAt(this.i) + " » n'existe pas dans ce monde", 2);
		return jeton("<");
	}
	// >
	this.i++;
	if (fd === "0") throw new ShellError("bash : « 0> » : la sortie 0 est l'entrée, on ne peut pas y écrire", 2);
	var source = fd || "1";
	if (t.charAt(this.i) === "&"){
		var cible = t.charAt(this.i + 1);
		if (cible === "1" || cible === "2"){ this.i += 2; return jeton(source + ">&" + cible); }
		if (cible === "-") throw new ShellError("bash : fermer une sortie (>&-) n'existe pas dans ce monde : envoie-la plutôt dans /dev/null", 2);
		this.i++;
		return jeton(source === "1" ? "&>" : "2>");
	}
	var ajout = false;
	if (t.charAt(this.i) === ">"){ ajout = true; this.i++; }
	else if (t.charAt(this.i) === "|") this.i++;
	return jeton((source === "2" ? "2" : "") + (ajout ? ">>" : ">"));
};

/* La fin d'un calcul $(( ... )) ou (( ... )) : l'indice du premier des deux ), -1 si le texte s'arrête avant,
 * -2 si une parenthèse se ferme seule (c'étaient deux sous-shells emboîtés). */
function finArith(t, j){
	var profondeur = 0;
	for (; j < t.length; j++){
		var c = t.charAt(j);
		if (c === "(") profondeur++;
		else if (c === ")"){
			if (profondeur === 0) return t.charAt(j + 1) === ")" ? j : -2;
			profondeur--;
		}
	}
	return -1;
}

Lexeur.prototype.lireArithCommande = function(){
	var t = this.t, pos = this.i, fin = finArith(t, pos + 2);
	if (fin === -1) throw new Incomplet("))");
	if (fin === -2) return null;
	this.i = fin + 2;
	return { type: "arith", texte: t.substring(pos + 2, fin), pos: pos };
};

/* Après un retour à la ligne : le corps des here-documents annoncés sur la ligne. */
Lexeur.prototype.lireHeredocs = function(){
	if (!this.heredocs.length) return;
	var attente = this.heredocs;
	this.heredocs = [];
	for (var k = 0; k < attente.length; k++) this.lireCorps(attente[k]);
};

Lexeur.prototype.lireCorps = function(h){
	var t = this.t, lignes = [];
	for (;;){
		if (this.i >= this.n){
			if (!this.tolerant) throw new Incomplet(h.delim);
			break;
		}
		var fin = t.indexOf("\n", this.i);
		if (fin === -1) fin = this.n;
		var ligne = t.substring(this.i, fin).replace(/\r$/, "");
		this.i = Math.min(fin + 1, this.n);
		if (h.tabs) ligne = ligne.replace(/^\t+/, "");
		if (ligne === h.delim) break;
		lignes.push(ligne);
	}
	h.corps = lignes.length ? lignes.join("\n") + "\n" : "";
	h.parts = h.cite ? null : partiesDouble(h.corps);
};

Lexeur.prototype.finHeredocs = function(){
	if (!this.tolerant) throw new Incomplet(this.heredocs[0].delim);
	var attente = this.heredocs;
	this.heredocs = [];
	attente.forEach(function(h){ h.corps = ""; h.parts = []; });
};

/*
 * Un mot : une suite de parties collées. lit (texte nu), sq (entre apostrophes, ou un caractère
 * protégé par \), dq (entre guillemets doubles, avec ses propres parties), var ($NOM, ${...}),
 * cmd ($(...) ou `...`), arith ($((...))).
 * mode : "mot" (s'arrête aux blancs et aux opérateurs), "regex" (le motif d'un =~ : seuls les blancs
 * l'arrêtent), "argument" (le texte d'un ${x:-...} : rien ne l'arrête).
 */
Lexeur.prototype.lireMot = function(mode){
	var t = this.t, pos = this.i, parties = [], lit = "";
	this.regex = false;
	var pousser = function(){ if (lit !== ""){ parties.push({ t: "lit", v: lit }); lit = ""; } };
	while (this.i < this.n){
		var c = t.charAt(this.i);
		if (mode === "mot" && METACARACTERES.indexOf(c) > -1) break;
		if (mode === "regex" && (c === " " || c === "\t" || c === "\n" || c === "\r")) break;
		if (c === "\\"){
			if (this.i + 1 >= this.n){
				if (mode === "argument"){ lit += c; this.i++; continue; }
				throw new Incomplet("\\");
			}
			var s = t.charAt(this.i + 1);
			if (s === "\n"){ this.i += 2; continue; }
			pousser();
			parties.push({ t: "sq", v: s });
			this.i += 2;
			continue;
		}
		if (c === "'"){
			var fin = t.indexOf("'", this.i + 1);
			if (fin === -1) throw this.guillemetOuvert(this.i);
			pousser();
			parties.push({ t: "sq", v: t.substring(this.i + 1, fin) });
			this.i = fin + 1;
			continue;
		}
		if (c === "\""){
			pousser();
			this.i++;
			parties.push({ t: "dq", parts: this.lireTexteDouble(false) });
			continue;
		}
		if (c === "$"){
			var p = this.lireDollar();
			if (p){ pousser(); parties.push(p); continue; }
			lit += c;
			this.i++;
			continue;
		}
		if (c === "`"){ pousser(); parties.push(this.lireApostropheInverse()); continue; }
		lit += c;
		this.i++;
	}
	pousser();
	var jeton = { type: "mot", parts: parties, brut: t.substring(pos, this.i), pos: pos };
	var l = litteralDe(parties);
	if (l !== null && RESERVES.hasOwnProperty(l)) jeton.reserve = l;
	return jeton;
};

/* Une apostrophe jamais refermée : la suite au prochain retour à la ligne, sauf l'apostrophe
 * d'un mot français (s'appelle), que Shell.js explique tout de suite. */
Lexeur.prototype.guillemetOuvert = function(ouverture){
	var debut = this.t.lastIndexOf("\n", ouverture - 1) + 1, fin = this.t.indexOf("\n", ouverture);
	var ligne = this.t.substring(debut, fin === -1 ? this.n : fin);
	return Shell.apostropheFrancaise(ligne, ouverture - debut) || new Incomplet("'");
};

/* Le texte entre guillemets doubles (ou tout le texte, pour un here-document) : seuls $, ` et \ y sont spéciaux. */
Lexeur.prototype.lireTexteDouble = function(jusquaFin){
	var t = this.t, parties = [], lit = "";
	var pousser = function(){ if (lit !== ""){ parties.push({ t: "qlit", v: lit }); lit = ""; } };
	for (;;){
		if (this.i >= this.n){
			if (jusquaFin) break;
			throw new Incomplet("\"");
		}
		var c = t.charAt(this.i);
		if (c === "\"" && !jusquaFin){ this.i++; break; }
		if (c === "\\" && this.i + 1 < this.n){
			var s = t.charAt(this.i + 1);
			if (s === "\n"){ this.i += 2; continue; }
			if (s === "$" || s === "`" || s === "\\" || (s === "\"" && !jusquaFin)){ lit += s; this.i += 2; continue; }
			lit += c;
			this.i++;
			continue;
		}
		if (c === "$"){
			var p = this.lireDollar();
			if (p){ pousser(); parties.push(p); continue; }
		}
		if (c === "`"){ pousser(); parties.push(this.lireApostropheInverse()); continue; }
		lit += c;
		this.i++;
	}
	pousser();
	return parties;
};

function partiesDouble(texte){ return new Lexeur(texte, 0).lireTexteDouble(true); }
function partiesArgument(texte){ return new Lexeur(texte, 0).lireMot("argument").parts; }

/* Ce qui suit un $ : $NOM, $1, $?, ${...}, $(...), $((...)). null si le $ est un simple dollar. */
Lexeur.prototype.lireDollar = function(){
	var t = this.t, i = this.i, c = t.charAt(i + 1);
	if (c === "(" && t.charAt(i + 2) === "("){
		var fin = finArith(t, i + 3);
		if (fin === -1) throw new Incomplet("))");
		if (fin !== -2){
			this.i = fin + 2;
			return { t: "arith", texte: t.substring(i + 3, fin) };
		}
	}
	if (c === "("){
		// $( ... ) : un petit programme entier, lu par un analyseur à part, jusqu'à sa parenthèse
		var sous = new Analyseur(t, i + 2);
		var arbre = sous.liste();
		var j = sous.prendre();
		if (j.type !== "op" || j.v !== ")") throw j.type === "fin" ? new Incomplet(")") : erreurSyntaxe(texteJeton(j));
		this.i = sous.lex.i;
		return { t: "cmd", arbre: arbre };
	}
	if (c === "{") return this.lireAccolade();
	if (/[A-Za-z_]/.test(c)){
		var k = i + 2;
		while (k < this.n && /[A-Za-z0-9_]/.test(t.charAt(k))) k++;
		this.i = k;
		return { t: "var", nom: t.substring(i + 1, k), index: null, op: null };
	}
	if (c !== "" && "0123456789?#@*$!-".indexOf(c) > -1){
		this.i = i + 2;
		return { t: "var", nom: c, index: null, op: null };
	}
	return null;
};

function finGuillemets(t, j){
	for (; j < t.length; j++){
		var c = t.charAt(j);
		if (c === "\\"){ j++; continue; }
		if (c === "\"") return j;
	}
	return -1;
}

Lexeur.prototype.lireAccolade = function(){
	var t = this.t, debut = this.i + 2, j = debut, profondeur = 0;
	for (; j < this.n; j++){
		var c = t.charAt(j);
		if (c === "\\"){ j++; continue; }
		if (c === "'"){
			var f = t.indexOf("'", j + 1);
			if (f === -1) throw new Incomplet("'");
			j = f;
			continue;
		}
		if (c === "\""){
			j = finGuillemets(t, j + 1);
			if (j === -1) throw new Incomplet("\"");
			continue;
		}
		if (c === "{") profondeur++;
		else if (c === "}"){
			if (profondeur === 0) break;
			profondeur--;
		}
	}
	if (j >= this.n) throw new Incomplet("}");
	this.i = j + 1;
	return analyserParametre(t.substring(debut, j));
};

var OPERATEURS_PARAMETRE = [":-", ":=", ":+", ":?", "##", "%%", "//", "^^", ",,", "-", "=", "+", "?", "#", "%", "/", "^", ",", ":"];

/* ${NOM}, ${#NOM}, ${NOM:-défaut}, ${NOM#motif}, ${NOM/a/b}, ${NOM:1:3}, ${T[2]}, ${T[@]}... */
function analyserParametre(contenu){
	var p = { t: "var", nom: null, index: null, op: null, arg: null, longueur: false };
	// ${!T[@]} : les indices d'un tableau ; ${!NOM} : la variable dont NOM contient le nom (indirection).
	var ind = /^!([A-Za-z_][A-Za-z0-9_]*)\[([@*])\]$/.exec(contenu);
	if (ind){ p.nom = ind[1]; p.index = ind[2]; p.indices = true; return p; }
	ind = /^!([A-Za-z_][A-Za-z0-9_]*|[0-9]+)$/.exec(contenu);
	if (ind){ p.nom = ind[1]; p.indirect = true; return p; }
	var m = /^#([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!-])(\[([^\]]*)\])?$/.exec(contenu);
	if (m && contenu.length > 1){
		p.longueur = true;
		p.nom = m[1];
		p.index = m[3] !== undefined ? m[3] : null;
		return p;
	}
	m = /^([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!-])(\[([^\]]*)\])?/.exec(contenu);
	if (!m) throw new ShellError("bash : ${" + contenu + "} : mauvaise substitution", 1);
	p.nom = m[1];
	p.index = m[3] !== undefined ? m[3] : null;
	var reste = contenu.substring(m[0].length);
	if (reste === "") return p;
	for (var k = 0; k < OPERATEURS_PARAMETRE.length; k++){
		var op = OPERATEURS_PARAMETRE[k];
		if (reste.indexOf(op) !== 0) continue;
		var arg = reste.substring(op.length);
		p.op = op;
		if (op === "/" || op === "//"){
			if (op === "/" && (arg.charAt(0) === "#" || arg.charAt(0) === "%")){ p.ancre = arg.charAt(0); arg = arg.substring(1); }
			var coupe = -1;
			for (var i = 0; i < arg.length; i++){
				if (arg.charAt(i) === "\\"){ i++; continue; }
				if (arg.charAt(i) === "/"){ coupe = i; break; }
			}
			p.arg = partiesArgument(coupe === -1 ? arg : arg.substring(0, coupe));
			p.remplacement = coupe === -1 ? [] : partiesArgument(arg.substring(coupe + 1));
		} else if (op === ":"){
			p.arg = arg;
		} else {
			p.arg = partiesArgument(arg);
		}
		return p;
	}
	throw new ShellError("bash : ${" + contenu + "} : mauvaise substitution", 1);
}

/* `...` : l'ancienne écriture de $(...). */
Lexeur.prototype.lireApostropheInverse = function(){
	var t = this.t, j = this.i + 1, interieur = "";
	for (;;){
		if (j >= this.n) throw new Incomplet("`");
		var c = t.charAt(j);
		if (c === "`") break;
		if (c === "\\" && j + 1 < this.n && "`$\\".indexOf(t.charAt(j + 1)) > -1){ interieur += t.charAt(j + 1); j += 2; continue; }
		interieur += c;
		j++;
	}
	this.i = j + 1;
	var arbre;
	try {
		arbre = Interpreteur.analyser(interieur);
	} catch (e){
		if (e instanceof Incomplet) throw new ShellError("bash : erreur de syntaxe entre les apostrophes inverses : `" + interieur + "`", 2);
		throw e;
	}
	return { t: "cmd", arbre: arbre };
};

/* ------------------------------------------------------------------ */
/* 2. L'analyseur                                                      */
/* ------------------------------------------------------------------ */

function Analyseur(texte, debut){
	this.lex = new Lexeur(texte, debut || 0);
	this.tampon = null;
	this.dernierePos = debut || 0;
}

Analyseur.prototype.voir = function(){
	if (this.tampon === null) this.tampon = this.lex.suivant();
	return this.tampon;
};
Analyseur.prototype.prendre = function(){
	var j = this.voir();
	this.tampon = null;
	this.dernierePos = j.pos;
	return j;
};
Analyseur.prototype.estMot = function(j, mot){ return j.type === "mot" && j.reserve === mot; };
Analyseur.prototype.estOp = function(j, v){ return j.type === "op" && j.v === v; };
Analyseur.prototype.sauterLignes = function(){ while (this.voir().type === "nl") this.prendre(); };
Analyseur.prototype.inattendu = function(j, attendu){
	if (j.type === "fin") return new Incomplet(attendu || "suite");
	this.dernierePos = j.pos;
	return erreurSyntaxe(texteJeton(j));
};
Analyseur.prototype.attendre = function(mot){
	var j = this.prendre();
	if (!this.estMot(j, mot)) throw this.inattendu(j, mot);
	return j;
};
/* Un bloc (then, do, else...) doit contenir au moins une commande. */
Analyseur.prototype.nonVide = function(liste, attendu){
	if (liste.elements.length === 0) throw this.inattendu(this.voir(), attendu);
};

var FERMANTS = { "then": 1, "elif": 1, "else": 1, "fi": 1, "do": 1, "done": 1, "esac": 1, "}": 1 };

/* Ce jeton termine-t-il la liste en cours (un mot qui ferme un bloc, une parenthèse, ;;) ? */
Analyseur.prototype.estFermant = function(j){
	if (j.type === "fin") return true;
	if (j.type === "op") return j.v === ")" || j.v === ";;" || j.v === ";&" || j.v === ";;&";
	return j.type === "mot" && !!j.reserve && FERMANTS.hasOwnProperty(j.reserve);
};

/* Une liste : des commandes séparées par ; & ou des retours à la ligne, jusqu'à un mot qui ferme le bloc. */
Analyseur.prototype.liste = function(){
	var elements = [];
	this.sauterLignes();
	while (!this.estFermant(this.voir())){
		var noeud = this.etOu();
		var j = this.voir(), fond = false;
		if (j.type === "op" && (j.v === ";" || j.v === "&")){ this.prendre(); fond = j.v === "&"; }
		else if (j.type !== "nl" && !this.estFermant(j)) throw this.inattendu(j);
		elements.push({ noeud: noeud, fond: fond });
		this.sauterLignes();
	}
	return { k: "liste", elements: elements };
};

/* La prochaine commande complète du texte (pour l'exécuter aussitôt), ou null à la fin. */
Analyseur.prototype.prochaine = function(){
	this.sauterLignes();
	var j = this.voir();
	if (j.type === "fin") return null;
	if (this.estFermant(j)) throw this.inattendu(j);
	var noeud = this.etOu();
	var s = this.voir(), fond = false;
	if (s.type === "op" && (s.v === ";" || s.v === "&")){ this.prendre(); fond = s.v === "&"; }
	else if (s.type !== "nl" && s.type !== "fin") throw this.inattendu(s);
	return { noeud: noeud, fond: fond };
};

Analyseur.prototype.etOu = function(){
	var premier = this.tuyau(), suite = [];
	for (;;){
		var j = this.voir();
		if (!(j.type === "op" && (j.v === "&&" || j.v === "||"))) break;
		this.prendre();
		this.sauterLignes();
		suite.push({ op: j.v, tuyau: this.tuyau() });
	}
	return suite.length ? { k: "etou", premier: premier, suite: suite } : premier;
};

Analyseur.prototype.tuyau = function(){
	var pos = this.voir().pos, neg = false;
	if (this.estMot(this.voir(), "!")){ this.prendre(); neg = true; }
	var cmds = [this.commande()];
	for (;;){
		var j = this.voir();
		if (!(j.type === "op" && (j.v === "|" || j.v === "|&"))) break;
		this.prendre();
		if (j.v === "|&") cmds[cmds.length - 1].redirs.push({ op: "2>&1" });
		this.sauterLignes();
		cmds.push(this.commande());
	}
	return { k: "tuyau", neg: neg, cmds: cmds, pos: pos };
};

Analyseur.prototype.commande = function(){
	var j = this.voir();
	if (j.type === "arith"){
		this.prendre();
		return this.redirections({ k: "arith", texte: j.texte, pos: j.pos });
	}
	if (this.estOp(j, "(")){
		this.prendre();
		var corps = this.liste();
		this.nonVide(corps, ")");
		var f = this.prendre();
		if (!this.estOp(f, ")")) throw this.inattendu(f, ")");
		return this.redirections({ k: "sousshell", corps: corps, pos: j.pos });
	}
	if (j.type === "mot" && j.reserve){
		switch (j.reserve){
			case "if": return this.si();
			case "for": return this.pour();
			case "while": return this.tantque(false);
			case "until": return this.tantque(true);
			case "case": return this.cas();
			case "{": return this.groupe();
			case "[[": return this.cond();
			case "function": return this.fonctionMotCle();
			case "in": case "]]": break;
			default: throw this.inattendu(j);
		}
	}
	if (j.type === "mot"){
		this.prendre();
		// nom() { ... } : une fonction
		var nom = litteralDe(j.parts);
		if (nom !== null && /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(nom) && this.estOp(this.voir(), "(")){
			this.prendre();
			var ferme = this.prendre();
			if (!this.estOp(ferme, ")")) throw this.inattendu(ferme, ")");
			return this.corpsFonction(nom, j.pos);
		}
		return this.simple(j);
	}
	if (j.type === "redir") return this.simple(null);
	throw this.inattendu(j);
};

/* NOM=valeur, NOM+=valeur, T[2]=valeur au début d'une commande. */
function affectationDe(j){
	if (!j.parts.length || j.parts[0].t !== "lit") return null;
	var m = /^([A-Za-z_][A-Za-z0-9_]*)(\[([^\]]*)\])?(\+?)=/.exec(j.brut);
	if (!m) return null;
	return { nom: m[1], index: m[3] !== undefined ? m[3] : null, ajout: m[4] === "+", parts: partiesArgument(j.brut.substring(m[0].length)), tableau: null };
}

Analyseur.prototype.simple = function(premier){
	var noeud = { k: "simple", affs: [], mots: [], redirs: [], pos: premier ? premier.pos : this.voir().pos };
	var j = premier;
	for (;;){
		if (j === null){
			var v = this.voir();
			if (v.type === "mot") j = this.prendre();
			else if (v.type === "redir"){ this.redirection(noeud.redirs); continue; }
			else break;
		}
		if (noeud.mots.length === 0){
			var aff = affectationDe(j);
			if (aff){
				// T=(a b c) : un tableau
				if (aff.parts.length === 0 && aff.index === null && this.estOp(this.voir(), "(")){
					this.prendre();
					aff.tableau = [];
					for (;;){
						this.sauterLignes();
						var e = this.prendre();
						if (this.estOp(e, ")")) break;
						if (e.type !== "mot") throw this.inattendu(e, ")");
						aff.tableau.push(e);
					}
				}
				noeud.affs.push(aff);
				j = null;
				continue;
			}
		}
		noeud.mots.push(j);
		j = null;
	}
	if (!noeud.affs.length && !noeud.mots.length && !noeud.redirs.length) throw this.inattendu(this.voir());
	return noeud;
};

/* Une redirection et sa cible. Pour << FIN, on annonce au lexeur le corps à lire après la ligne. */
Analyseur.prototype.redirection = function(liste){
	var r = this.prendre();
	if (/^[012]>&[012]$/.test(r.op)){ liste.push({ op: r.op === "0>&1" ? "1>&1" : r.op }); return; }
	var cible = this.prendre();
	// La cible d'une redirection ne peut pas attendre la ligne suivante : « echo > » est une erreur, comme sous bash.
	if (cible.type === "fin" || cible.type === "nl") throw erreurSyntaxe("newline");
	if (cible.type !== "mot") throw this.inattendu(cible);
	if (r.op === "<<" || r.op === "<<-"){
		var delim = "", cite = false;
		cible.parts.forEach(function(p){
			if (p.t === "lit") delim += p.v;
			else if (p.t === "sq" || p.t === "qlit"){ delim += p.v; cite = true; }
			else if (p.t === "dq"){ cite = true; p.parts.forEach(function(q){ delim += q.v !== undefined ? q.v : ""; }); }
			else delim += "$" + (p.nom || "");
		});
		var h = { delim: delim, tabs: r.op === "<<-", cite: cite, corps: null, parts: null };
		this.lex.heredocs.push(h);
		liste.push({ op: "<<", heredoc: h });
		return;
	}
	liste.push({ op: r.op, cible: cible });
};

Analyseur.prototype.redirections = function(noeud){
	noeud.redirs = noeud.redirs || [];
	while (this.voir().type === "redir") this.redirection(noeud.redirs);
	return noeud;
};

Analyseur.prototype.si = function(){
	var pos = this.prendre().pos;
	var branches = [], sinon = null;
	var cond = this.liste();
	this.nonVide(cond, "then");
	this.attendre("then");
	var corps = this.liste();
	this.nonVide(corps, "fi");
	branches.push({ cond: cond, corps: corps });
	for (;;){
		var j = this.prendre();
		if (this.estMot(j, "elif")){
			cond = this.liste();
			this.nonVide(cond, "then");
			this.attendre("then");
			corps = this.liste();
			this.nonVide(corps, "fi");
			branches.push({ cond: cond, corps: corps });
			continue;
		}
		if (this.estMot(j, "else")){
			sinon = this.liste();
			this.nonVide(sinon, "fi");
			this.attendre("fi");
			break;
		}
		if (this.estMot(j, "fi")) break;
		throw this.inattendu(j, "fi");
	}
	return this.redirections({ k: "si", branches: branches, sinon: sinon, pos: pos });
};

/* Le corps d'une boucle : do ... done. */
Analyseur.prototype.corpsBoucle = function(){
	this.attendre("do");
	var corps = this.liste();
	this.nonVide(corps, "done");
	this.attendre("done");
	return corps;
};

Analyseur.prototype.pour = function(){
	var pos = this.prendre().pos;
	var j = this.voir();
	if (j.type === "arith"){
		// for (( i = 0; i < 3; i++ ))
		this.prendre();
		var morceaux = j.texte.split(";");
		if (morceaux.length !== 3){
			throw new ShellError("bash : for (( ... )) attend trois parties séparées par des points-virgules : for (( i = 0; i < 3; i++ ))", 2);
		}
		var s = this.voir();
		if (this.estOp(s, ";")) this.prendre();
		this.sauterLignes();
		return this.redirections({ k: "pourArith", init: morceaux[0], cond: morceaux[1], pas: morceaux[2], corps: this.corpsBoucle(), pos: pos });
	}
	var v = this.prendre();
	var nom = v.type === "mot" ? litteralDe(v.parts) : null;
	if (nom === null || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(nom)){
		if (v.type === "fin") throw new Incomplet("do");
		this.dernierePos = v.pos;
		throw new ShellError("bash : « " + texteJeton(v) + " » : après for, il faut un nom de variable\n" +
			C.gris("(Par exemple : for fichier in *.txt; do echo $fichier; done. Sans $ devant le nom, après for.)"), 2);
	}
	var mots = null;
	this.sauterLignes();
	if (this.estMot(this.voir(), "in")){
		this.prendre();
		mots = [];
		while (this.voir().type === "mot") mots.push(this.prendre());
	}
	if (this.estOp(this.voir(), ";")) this.prendre();
	this.sauterLignes();
	return this.redirections({ k: "pour", nom: nom, mots: mots, corps: this.corpsBoucle(), pos: pos });
};

Analyseur.prototype.tantque = function(jusqua){
	var pos = this.prendre().pos;
	var cond = this.liste();
	this.nonVide(cond, "do");
	return this.redirections({ k: "tantque", jusqua: jusqua, cond: cond, corps: this.corpsBoucle(), pos: pos });
};

Analyseur.prototype.cas = function(){
	var pos = this.prendre().pos;
	var mot = this.prendre();
	if (mot.type !== "mot") throw this.inattendu(mot, "esac");
	this.sauterLignes();
	this.attendre("in");
	this.sauterLignes();
	var items = [];
	while (!this.estMot(this.voir(), "esac")){
		var j = this.voir();
		if (j.type === "fin") throw new Incomplet("esac");
		if (this.estOp(j, "(")) this.prendre();
		var motifs = [];
		for (;;){
			var m = this.prendre();
			if (m.type !== "mot") throw this.inattendu(m, "esac");
			motifs.push(m);
			var s = this.prendre();
			if (this.estOp(s, "|")) continue;
			if (this.estOp(s, ")")) break;
			throw this.inattendu(s, "esac");
		}
		var corps = this.liste();
		var fin = this.voir(), terminaison = ";;";
		if (fin.type === "op" && (fin.v === ";;" || fin.v === ";&" || fin.v === ";;&")){ this.prendre(); terminaison = fin.v; }
		else if (!this.estMot(fin, "esac")) throw this.inattendu(fin, "esac");
		items.push({ motifs: motifs, corps: corps, fin: terminaison });
		this.sauterLignes();
	}
	this.prendre();
	return this.redirections({ k: "cas", mot: mot, items: items, pos: pos });
};

Analyseur.prototype.groupe = function(){
	var pos = this.prendre().pos;
	var corps = this.liste();
	this.nonVide(corps, "}");
	this.attendre("}");
	return this.redirections({ k: "groupe", corps: corps, pos: pos });
};

var UNAIRES_COND = { "-e": 1, "-a": 1, "-f": 1, "-d": 1, "-r": 1, "-w": 1, "-x": 1, "-s": 1, "-z": 1, "-n": 1, "-L": 1, "-h": 1, "-v": 1 };
var BINAIRES_COND = { "=": 1, "==": 1, "!=": 1, "=~": 1, "<": 1, ">": 1, "-eq": 1, "-ne": 1, "-lt": 1, "-le": 1, "-gt": 1, "-ge": 1, "-nt": 1, "-ot": 1 };

/* [[ ... ]] : on rassemble les jetons jusqu'à ]], puis on les lit comme une expression. */
Analyseur.prototype.cond = function(){
	var pos = this.prendre().pos;
	var jetons = [];
	for (;;){
		var j = this.prendre();
		if (j.type === "fin") throw new Incomplet("]]");
		if (j.type === "nl") continue;
		if (j.type === "mot" && litteralDe(j.parts) === "]]") break;
		if (j.type === "op" && j.v !== "&&" && j.v !== "||" && j.v !== "(" && j.v !== ")") throw this.inattendu(j);
		if (j.type === "redir" && j.op !== "<" && j.op !== ">") throw this.inattendu(j);
		if (j.type === "arith") throw this.inattendu(j);
		jetons.push(j);
		if (j.type === "mot" && litteralDe(j.parts) === "=~") this.lex.regex = true;
	}
	if (!jetons.length) throw new ShellError("bash : [[ ]] est vide : il faut une condition dedans, par exemple [[ -f rapport ]]", 2);
	var a = new AnalyseurCond(jetons);
	var expr = a.ou();
	if (a.i < jetons.length) throw erreurSyntaxe(texteJeton(jetons[a.i]));
	return this.redirections({ k: "cond", expr: expr, pos: pos });
};

function AnalyseurCond(jetons){ this.j = jetons; this.i = 0; }
AnalyseurCond.prototype.valeur = function(j){
	if (!j) return null;
	if (j.type === "mot") return litteralDe(j.parts);
	if (j.type === "op") return j.v;
	if (j.type === "redir") return j.op;
	return null;
};
AnalyseurCond.prototype.estLogique = function(j){ return j && j.type === "op" && (j.v === "&&" || j.v === "||" || j.v === ")"); };
AnalyseurCond.prototype.ou = function(){
	var a = this.et();
	while (this.j[this.i] && this.j[this.i].type === "op" && this.j[this.i].v === "||"){ this.i++; a = { k: "ou", a: a, b: this.et() }; }
	return a;
};
AnalyseurCond.prototype.et = function(){
	var a = this.non();
	while (this.j[this.i] && this.j[this.i].type === "op" && this.j[this.i].v === "&&"){ this.i++; a = { k: "et", a: a, b: this.non() }; }
	return a;
};
AnalyseurCond.prototype.non = function(){
	var j = this.j[this.i];
	if (j && j.type === "mot" && litteralDe(j.parts) === "!" && this.j[this.i + 1]){ this.i++; return { k: "non", e: this.non() }; }
	return this.primaire();
};
AnalyseurCond.prototype.primaire = function(){
	var j = this.j[this.i];
	if (!j) throw new ShellError("bash : [[ : il manque une condition après && ou ||", 2);
	if (j.type === "op" && j.v === "("){
		this.i++;
		var e = this.ou();
		var f = this.j[this.i];
		if (!f || f.type !== "op" || f.v !== ")") throw new ShellError("bash : [[ : il manque une parenthèse « ) »", 2);
		this.i++;
		return e;
	}
	var v = this.valeur(j), suivant = this.j[this.i + 1], vs = this.valeur(suivant);
	if (j.type === "mot" && UNAIRES_COND[v] && suivant && !this.estLogique(suivant) && !(BINAIRES_COND[vs] && this.j[this.i + 2])){
		this.i += 2;
		return { k: "un", op: v, a: suivant };
	}
	if (suivant && vs !== null && BINAIRES_COND[vs] && (suivant.type === "mot" || suivant.type === "redir")){
		var droite = this.j[this.i + 2];
		if (!droite || droite.type !== "mot") throw new ShellError("bash : [[ : il manque quelque chose après « " + vs + " »", 2);
		this.i += 3;
		return { k: "bin", op: vs, a: j, b: droite };
	}
	if (j.type !== "mot") throw erreurSyntaxe(texteJeton(j));
	this.i++;
	return { k: "seul", a: j };
};

Analyseur.prototype.fonctionMotCle = function(){
	var pos = this.prendre().pos;
	var n = this.prendre();
	var nom = n.type === "mot" ? litteralDe(n.parts) : null;
	if (nom === null || !/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(nom)) throw this.inattendu(n, "}");
	if (this.estOp(this.voir(), "(")){
		this.prendre();
		var f = this.prendre();
		if (!this.estOp(f, ")")) throw this.inattendu(f, ")");
	}
	return this.corpsFonction(nom, pos);
};

Analyseur.prototype.corpsFonction = function(nom, pos){
	this.sauterLignes();
	if (RESERVES.hasOwnProperty(nom)) throw new ShellError("bash : « " + nom + " » est un mot réservé du shell : choisis un autre nom de fonction", 2);
	var j = this.voir();
	var compose = (j.type === "mot" && j.reserve && /^(\{|if|for|while|until|case|\[\[)$/.test(j.reserve)) || this.estOp(j, "(") || j.type === "arith";
	if (!compose) throw this.inattendu(j, "}");
	return { k: "fonction", nom: nom, corps: this.commande(), pos: pos, redirs: [] };
};

/* L'arbre d'un texte entier. Lève une ShellError (erreur de syntaxe) ou Incomplet (il manque la suite). */
Interpreteur.analyser = function(texte){
	var a = new Analyseur(texte, 0);
	var liste = a.liste();
	var j = a.voir();
	if (j.type !== "fin") throw a.inattendu(j);
	return liste;
};

/* null si le texte est une commande complète et correcte ; "incomplet" s'il manque la suite ; sinon l'erreur. */
Interpreteur.verifier = function(texte){
	try {
		Interpreteur.analyser(texte);
		return null;
	} catch (e){
		if (e instanceof Incomplet) return "incomplet";
		if (e instanceof ShellError) return e;
		throw e;
	}
};

Interpreteur.estComplet = function(texte){ return Interpreteur.verifier(texte) !== "incomplet"; };

/* Ce qui manque à un texte inachevé, en clair ("il manque un « fi »..."), ou null s'il est complet. */
Interpreteur.ceQuiManque = function(texte){
	try { Interpreteur.analyser(texte); }
	catch (e){
		if (!(e instanceof Incomplet)) return null;
		return CONSEILS_FIN[e.attendu] || (e.attendu ? "le here-document attend sa ligne de fin : « " + e.attendu + " »" : "la commande n'est pas finie");
	}
	return null;
};

/* L'erreur que bash donne quand le texte s'arrête au milieu d'une commande (Ctrl+D à l'invite « > »). */
Interpreteur.erreurIncomplet = function(texte){
	try { Interpreteur.analyser(texte); }
	catch (e){ if (e instanceof Incomplet) return erreurFinDeFichier(e); if (e instanceof ShellError) return e; throw e; }
	return new ShellError("bash : erreur de syntaxe : fin de fichier prématurée", 2);
};

/*
 * Parcourt tout un arbre : chaque nœud (vu(noeud)), chaque morceau de mot (vu({ k: "partie", p })),
 * chaque redirection (vu({ k: "redir", r })), y compris à l'intérieur des $(...).
 */
function parcourirArbre(arbre, vu){
	var garde = 0;
	function parties(liste){
		(liste || []).forEach(function(p){
			if (!p || garde++ > 100000) return;
			vu({ k: "partie", p: p });
			if (p.t === "dq") parties(p.parts);
			if (p.t === "cmd") noeud(p.arbre);
			if (p.t === "var"){
				if (Array.isArray(p.arg)) parties(p.arg);
				if (Array.isArray(p.remplacement)) parties(p.remplacement);
			}
		});
	}
	function mot(m){ if (m && m.parts) parties(m.parts); }
	function redirs(liste){
		(liste || []).forEach(function(r){
			vu({ k: "redir", r: r });
			if (r.cible) mot(r.cible);
			if (r.heredoc && r.heredoc.parts) parties(r.heredoc.parts);
		});
	}
	function cond(e){
		if (!e) return;
		if (e.a && e.a.parts) mot(e.a); else cond(e.a);
		if (e.b && e.b.parts) mot(e.b); else cond(e.b);
		cond(e.e);
	}
	function noeud(n){
		if (!n || garde++ > 100000) return;
		vu(n);
		switch (n.k){
			case "liste": n.elements.forEach(function(e){ noeud(e.noeud); }); break;
			case "etou": noeud(n.premier); n.suite.forEach(function(s){ noeud(s.tuyau); }); break;
			case "tuyau": n.cmds.forEach(noeud); break;
			case "simple":
				n.affs.forEach(function(a){ parties(a.parts); (a.tableau || []).forEach(mot); });
				n.mots.forEach(mot);
				break;
			case "si": n.branches.forEach(function(b){ noeud(b.cond); noeud(b.corps); }); noeud(n.sinon); break;
			case "tantque": noeud(n.cond); noeud(n.corps); break;
			case "cas": mot(n.mot); n.items.forEach(function(it){ it.motifs.forEach(mot); noeud(it.corps); }); break;
			case "pour": (n.mots || []).forEach(mot); noeud(n.corps); break;
			case "pourArith": case "groupe": case "sousshell": case "fonction": noeud(n.corps); break;
			case "cond": cond(n.expr); break;
		}
		if (n.redirs) redirs(n.redirs);
	}
	noeud(arbre);
}

/* Le texte demande-t-il sudo quelque part (pour poser la question du mot de passe avant de lancer) ? */
Interpreteur.contientSudo = function(texte){
	var arbre;
	try { arbre = Interpreteur.analyser(texte); } catch (e){ return false; }
	var trouve = false;
	parcourirArbre(arbre, function(n){
		if (n.k === "simple" && n.mots.length && litteralDe(n.mots[0].parts) === "sudo") trouve = true;
	});
	return trouve;
};

/*
 * Les structures qu'un texte utilise, pour les quêtes du chapitre 4 : "if", "for", "while", "until",
 * "case", "fonction", "read", "set -e", "$(...)", "$((...))", "[[", "test", "here-doc"...
 * Renvoie une liste sans doublons (vide si le texte ne se lit pas).
 */
var MOTS_SUIVIS = { "read": 1, "printf": 1, "local": 1, "return": 1, "break": 1, "continue": 1, "shift": 1, "exit": 1,
	"source": 1, ".": 1, "let": 1, "test": 1, "echo": 1, "seq": 1, "expr": 1, "basename": 1, "dirname": 1, "sleep": 1, "unset": 1, "eval": 1 };
Interpreteur.structures = function(texte){
	var arbre;
	try { arbre = Interpreteur.analyser(texte); } catch (e){ return []; }
	var vues = {};
	var noter = function(nom){ vues[nom] = true; };
	parcourirArbre(arbre, function(n){
		switch (n.k){
			case "partie":
				if (n.p.t === "cmd") noter("$(...)");
				else if (n.p.t === "arith") noter("$((...))");
				else if (n.p.t === "var" && /^([0-9]|#|@|\*)$/.test(n.p.nom || "")) noter("arguments");
				else if (n.p.t === "var") noter("variable");
				break;
			case "redir":
				if (n.r.heredoc) noter("here-doc");
				else if (n.r.op === "<<<") noter("here-string");
				else if (n.r.op === "<") noter("<");
				else if (/^(>|>>|2>|2>>|&>|&>>)$/.test(n.r.op)) noter(">");
				break;
			case "etou": n.suite.forEach(function(s){ noter(s.op); }); break;
			case "tuyau": if (n.neg) noter("!"); if (n.cmds.length > 1) noter("|"); break;
			case "simple":
				if (n.affs.length) noter("affectation");
				var premier = n.mots.length ? litteralDe(n.mots[0].parts) : null;
				if (premier === "[") noter("test");
				else if (premier !== null && MOTS_SUIVIS.hasOwnProperty(premier)) noter(premier === "." ? "source" : premier);
				if (premier === "set"){
					n.mots.slice(1).forEach(function(m){
						var v = litteralDe(m.parts) || "";
						if (/^-[a-z]*e/.test(v) || v === "errexit") noter("set -e");
						if (/^-[a-z]*x/.test(v) || v === "xtrace") noter("set -x");
					});
				}
				break;
			case "si": noter("if"); break;
			case "pour": noter("for"); break;
			case "pourArith": noter("for"); noter("for (("); break;
			case "tantque": noter(n.jusqua ? "until" : "while"); break;
			case "cas": noter("case"); break;
			case "fonction": noter("fonction"); break;
			case "groupe": noter("{ }"); break;
			case "sousshell": noter("( )"); break;
			case "arith": noter("(( ))"); break;
			case "cond": noter("[["); break;
		}
	});
	return Object.keys(vues);
};

/* ------------------------------------------------------------------ */
/* Les sorties : l'écran, ou une capture                               */
/* ------------------------------------------------------------------ */

/* L'écran : une sortie sans retour à la ligne final (echo -n, printf) attend la suite sur la même ligne. */
function FluxEcran(){ this.enAttente = ""; }
FluxEcran.prototype.ecrire = function(texte, sansFin, explicite){
	if (sansFin){ this.enAttente += texte; return; }
	var ligne = this.enAttente + texte;
	this.enAttente = "";
	if (ligne !== "" || explicite) term.echo(ligne);
};
FluxEcran.prototype.vider = function(){
	if (this.enAttente === "") return;
	var t = this.enAttente;
	this.enAttente = "";
	term.echo(t);
};
FluxEcran.prototype.erreur = function(texte){
	this.vider();
	term.echo(texte);
};

/* Une capture : $(...), ou la sortie d'un script, d'une fonction, d'un bloc envoyée dans un tuyau ou un objet. */
function FluxCapture(versErreur){ this.texte = ""; this.versErreur = versErreur; }
FluxCapture.prototype.ecrire = function(texte, sansFin, explicite){
	if (texte === "" && !sansFin && !explicite) return;
	this.texte += sansAnsi(texte) + (sansFin ? "" : "\n");
	if (this.texte.length > Interpreteur.LIMITE_SORTIE){
		throw new LimiteAtteinte("bash : arrêt d'urgence : cette sortie dépasse " + Interpreteur.LIMITE_SORTIE + " caractères. Boucle infinie ?");
	}
};
FluxCapture.prototype.erreur = function(texte){ this.versErreur(texte); };

Interpreteur.ecran = new FluxEcran();

function fluxCourant(){
	var f = Interpreteur.flux;
	return f.length ? f[f.length - 1] : Interpreteur.ecran;
}

Shell.ecranSortie = function(texte, sansFin, explicite){ fluxCourant().ecrire(String(texte), !!sansFin, !!explicite); };
Shell.ecranErreur = function(texte){ fluxCourant().erreur(String(texte)); };
Shell.surEcran = function(){ return fluxCourant() === Interpreteur.ecran; };

/* Le texte capturé, au format d'une sortie de sort : sans le dernier retour à la ligne. */
function texteCapture(flux, io){
	var t = flux.texte;
	if (t === "") return "";
	if (t.charAt(t.length - 1) === "\n") t = t.substring(0, t.length - 1);
	else io.sansFin = true;
	if (t === "") io.ligneVide = true;
	return t;
}

/*
 * Lance fn pour un segment de tuyau : si ses deux sorties vont à l'écran, tout s'affiche au fil de
 * l'eau ; sinon on capture la sortie normale (rendue comme celle d'un sort) et les erreurs partent
 * par io.err. Un exit ou un return qui s'échappe est mis de côté : le tuyau range d'abord la sortie.
 */
function avecFlux(io, fn){
	if (io.sortie1 && io.sortie1.t === "ecran" && io.sortie1.canal === 1 && io.sortie2 && io.sortie2.t === "ecran" && io.sortie2.canal === 2){
		fn();
		return "";
	}
	var flux = new FluxCapture(function(t){ io.err(t); });
	Interpreteur.flux.push(flux);
	try {
		fn();
	} catch (e){
		if (!estSignal(e)) throw e;
		if (!Interpreteur.signalEnAttente) Interpreteur.signalEnAttente = e;
		io.codeSignal = e.code || 0;
	} finally {
		Interpreteur.flux.pop();
	}
	return texteCapture(flux, io);
}

/* ------------------------------------------------------------------ */
/* L'entrée standard (ce que lit read)                                 */
/* ------------------------------------------------------------------ */

function Entree(texte){ this.texte = texte || ""; this.pos = 0; }
Entree.prototype.lireLigne = function(){
	if (this.pos >= this.texte.length) return null;
	var fin = this.texte.indexOf("\n", this.pos), ligne;
	if (fin === -1){ ligne = this.texte.substring(this.pos); this.pos = this.texte.length; }
	else { ligne = this.texte.substring(this.pos, fin); this.pos = fin + 1; }
	return ligne;
};
Entree.prototype.reste = function(){ return this.texte.substring(this.pos); };

function entreeCourante(){
	var e = Interpreteur.entrees;
	return e.length ? e[e.length - 1] : null;
}

/* Un bloc ou une fonction qui reçoit une entrée (un tuyau, < objet) la rend lisible par read. */
function avecEntree(io, fn){
	if (io.stdin === null || io.stdin === undefined || io.stdinHerite) return fn();
	Interpreteur.entrees.push(new Entree(io.stdin));
	try { return fn(); }
	finally { Interpreteur.entrees.pop(); }
}

/* ------------------------------------------------------------------ */
/* Les variables et les portées                                        */
/* ------------------------------------------------------------------ */

var ABSENT = {};
/* Ces variables existent toujours (le système les tient à jour). */
var VALEURS_SYSTEME = { HOME: "~", SHELL: "/bin/bash", LANG: "fr_FR.UTF-8", PATH: "/usr/local/bin:/usr/bin:/bin" };
var TOUJOURS_DEFINIES = { PWD: 1, USER: 1, LOGNAME: 1, HOSTNAME: 1, HOME: 1, SHELL: 1, LANG: 1, PATH: 1, UID: 1 };

function nouveauCadre(o){
	return { vars: {}, exportees: {}, limite: !!o.limite, fonction: !!o.fonction, source: !!o.source, script: !!o.script,
		positionnels: o.positionnels || null, nom0: o.nom0 || null,
		fonctions: o.limite ? {} : null, options: o.options || null };
}

function copieOptions(o){ return { e: o.e, x: o.x, u: o.u, pipefail: o.pipefail }; }

function optionsCourantes(){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		if (Interpreteur.cadres[k].options) return Interpreteur.cadres[k].options;
	}
	return Interpreteur.options;
}

function positionnels(){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		if (Interpreteur.cadres[k].positionnels) return Interpreteur.cadres[k].positionnels;
	}
	return Interpreteur.positionnels;
}

function nom0(){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		if (Interpreteur.cadres[k].nom0) return Interpreteur.cadres[k].nom0;
	}
	return "bash";
}

/*
 * La valeur dans les portées (ou un tableau du prompt) ; ABSENT si aucune ne la connaît ; undefined si
 * elle a été effacée ou si on ne la voit pas. Un script (bash SCRIPT, bash -c) est un autre programme :
 * il ne voit des portées d'au-dessus que les variables exportées (export, ou NOM=valeur bash script).
 */
function lireCadres(nom){
	var cloison = false;
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var c = Interpreteur.cadres[k];
		if (c.vars.hasOwnProperty(nom) && (!cloison || c.exportees[nom])) return c.vars[nom];
		if (c.script) cloison = true;
	}
	if (cloison && Interpreteur.nonExportees.hasOwnProperty(nom)) return undefined;
	if (Interpreteur.tableaux.hasOwnProperty(nom)) return cloison ? undefined : Interpreteur.tableaux[nom];
	return ABSENT;
}

/* export NOM : la variable passera aux scripts lancés ensuite. */
function exporter(nom){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var c = Interpreteur.cadres[k];
		if (c.vars.hasOwnProperty(nom) || c.limite){ c.exportees[nom] = true; return; }
	}
	delete Interpreteur.nonExportees[nom];
}

function estDefinie(nom){
	var r = lireCadres(nom);
	if (r !== ABSENT) return r !== undefined;
	return state.env.hasOwnProperty(nom) || TOUJOURS_DEFINIES.hasOwnProperty(nom);
}

/* La valeur d'une variable, en texte ("" si elle n'existe pas). */
Interpreteur.lire = function(nom){
	var r = lireCadres(nom);
	if (r === ABSENT) return Shell.variable(nom);
	if (r === undefined) return "";
	if (Array.isArray(r)) return r.length ? r[0] : "";
	return r;
};

/* Shell.variable (utilisé par les sorts) voit aussi les variables des scripts et des fonctions. */
var VARIABLE_DE_BASE = Shell.variable;
Shell.variable = function(nom){
	var r = lireCadres(nom);
	if (r !== ABSENT){
		if (r === undefined) return "";
		return Array.isArray(r) ? (r.length ? r[0] : "") : r;
	}
	if (!state.env.hasOwnProperty(nom) && VALEURS_SYSTEME.hasOwnProperty(nom)) return VALEURS_SYSTEME[nom];
	return VARIABLE_DE_BASE(nom);
};

function lireTableau(nom){
	var r = lireCadres(nom);
	if (r === ABSENT) return estDefinie(nom) ? [Shell.variable(nom)] : [];
	if (r === undefined) return [];
	return Array.isArray(r) ? r : [r];
}

function verifierNom(nom, cmd){
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nom)){
		throw new ShellError((cmd || "bash") + " : « " + nom + " » n'est pas un nom de variable valide (des lettres, des chiffres, des tirets bas, et pas de chiffre au début).", 1);
	}
}

/*
 * Range une valeur (un texte, ou un tableau) dans une variable, en suivant les portées comme bash :
 * la portée la plus proche qui la connaît (une variable local d'une fonction), sinon celle du script
 * ou du sous-shell en cours ; au prompt, c'est une variable du joueur, gardée dans sa sauvegarde.
 */
Interpreteur.affecter = function(nom, valeur){
	verifierNom(nom);
	if (typeof valeur === "string" && valeur.length > Interpreteur.LIMITE_TEXTE){
		throw new ShellError("bash : " + nom + " : valeur bien trop longue pour ce monde (plus de " + Interpreteur.LIMITE_TEXTE + " caractères)", 1);
	}
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var c = Interpreteur.cadres[k];
		if (c.vars.hasOwnProperty(nom) || c.limite){ c.vars[nom] = valeur; return; }
	}
	// Une variable neuve du prompt n'est pas exportée ; une variable déjà exportée le reste, comme sous bash.
	if (!state.env.hasOwnProperty(nom) && !TOUJOURS_DEFINIES.hasOwnProperty(nom)) Interpreteur.nonExportees[nom] = true;
	if (Array.isArray(valeur)){ Interpreteur.tableaux[nom] = valeur; return; }
	delete Interpreteur.tableaux[nom];
	Shell.definirVariable(nom + "=" + valeur, "");
};

function affecterElement(nom, index, valeur){
	var t = lireTableau(nom).slice();
	if (index < 0) index += t.length;
	if (index < 0) throw new ShellError("bash : " + nom + "[" + index + "] : indice de tableau invalide", 1);
	while (t.length < index) t.push("");
	t[index] = valeur;
	Interpreteur.affecter(nom, t);
}

Interpreteur.supprimer = function(nom){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var c = Interpreteur.cadres[k];
		if (c.vars.hasOwnProperty(nom) || c.limite){ c.vars[nom] = undefined; return; }
	}
	delete Interpreteur.tableaux[nom];
	if (typeof VARIABLES_SYSTEME !== "undefined" && VARIABLES_SYSTEME.indexOf(nom) > -1){
		throw new ShellError("unset : la variable " + nom + " est tenue à jour par le système : on ne peut pas l'effacer.", 1);
	}
	delete state.env[nom];
};

/* La portée de la fonction en cours (pour local), ou null hors d'une fonction. */
function cadreFonction(){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var c = Interpreteur.cadres[k];
		if (c.fonction) return c;
		if (c.limite) return null;
	}
	return null;
}

function trouverFonction(nom){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var f = Interpreteur.cadres[k].fonctions;
		if (f && f.hasOwnProperty(nom)) return f[nom];
	}
	return Interpreteur.fonctions.hasOwnProperty(nom) ? Interpreteur.fonctions[nom] : null;
}

function definirFonction(n){
	GameEvents.fire({ type: "fonction", action: "definition", nom: n.nom, dansScript: dansUnScript() });
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		if (Interpreteur.cadres[k].fonctions){ Interpreteur.cadres[k].fonctions[n.nom] = n; return; }
	}
	Interpreteur.fonctions[n.nom] = n;
}

/* Sommes-nous dans un script (bash SCRIPT, ./script, bash -c), plutôt qu'au prompt ? */
function dansUnScript(){
	return Interpreteur.cadres.some(function(c){ return c.script; });
}

function supprimerFonction(nom){
	for (var k = Interpreteur.cadres.length - 1; k >= 0; k--){
		var f = Interpreteur.cadres[k].fonctions;
		if (f && f.hasOwnProperty(nom)){ delete f[nom]; return; }
	}
	delete Interpreteur.fonctions[nom];
}

function valeurIFS(){
	var r = lireCadres("IFS");
	if (r === ABSENT) return state.env.hasOwnProperty("IFS") ? state.env.IFS : " \t\n";
	if (r === undefined) return " \t\n";
	return Array.isArray(r) ? (r[0] || "") : r;
}

/* Le lieu où l'on se tient : un sous-shell (et un script) qui fait cd ne déplace pas le joueur. */
function memoriserLieu(){
	return { lieu: current_room, precedent: Shell.lieu_precedent, ssh: Shell.pile_ssh.slice() };
}
function restaurerLieu(m){
	if (current_room !== m.lieu){
		current_room = m.lieu;
		state.setCurrentRoom(m.lieu);
	}
	Shell.lieu_precedent = m.precedent;
	Shell.pile_ssh = m.ssh;
}

/* Lance fn dans un sous-shell : ses variables, ses fonctions, son cd et son exit restent à l'intérieur. Renvoie le statut. */
function dansSousShell(fn){
	var memoire = memoriserLieu();
	var options = copieOptions(optionsCourantes());
	Interpreteur.cadres.push(nouveauCadre({ limite: true, options: options }));
	var boucles = Interpreteur.boucles;
	Interpreteur.boucles = 0;
	try {
		return fn();
	} catch (e){
		if (e instanceof SignalSortie || e instanceof SignalRetour) return e.code;
		if (e instanceof SignalBoucle) return 0;
		throw e;
	} finally {
		Interpreteur.cadres.pop();
		Interpreteur.boucles = boucles;
		restaurerLieu(memoire);
	}
}

/* ------------------------------------------------------------------ */
/* L'arithmétique : $(( )), (( )), let, for (( ; ; )). Sans eval.      */
/* ------------------------------------------------------------------ */

var Arith = { cache: {}, taille: 0 };

function erreurArith(texte, raison){
	return new ShellError("bash : " + String(texte).trim() + " : " + raison, 1);
}

var OPERATEURS_ARITH = ["<<=", ">>=", "**=", "**", "++", "--", "<=", ">=", "==", "!=", "&&", "||", "<<", ">>", "+=", "-=", "*=", "/=", "%=",
	"&=", "|=", "^=", "+", "-", "*", "/", "%", "<", ">", "=", "!", "~", "&", "|", "^", "?", ":", "(", ")", ","];

Arith.nombre = function(s, texte){
	var m;
	if (/^0[xX]/.test(s)) return parseInt(s.substring(2), 16);
	if ((m = /^(\d+)#([0-9A-Za-z]+)$/.exec(s))){
		var base = parseInt(m[1], 10), v = 0;
		if (base < 2 || base > 36) throw erreurArith(texte, "base invalide : " + base);
		for (var i = 0; i < m[2].length; i++){
			var chiffre = parseInt(m[2].charAt(i), 36);
			if (chiffre >= base) throw erreurArith(texte, "valeur trop grande pour la base (« " + s + " »)");
			v = v * base + chiffre;
		}
		return v;
	}
	if (s.length > 1 && s.charAt(0) === "0"){
		if (/[89]/.test(s)) throw erreurArith(texte, "valeur trop grande pour la base (« " + s + " »)\n" +
			C.gris("(Un nombre qui commence par 0 est lu en octal, en base 8. Écris " + parseInt(s, 10) + ", ou 10#" + s + ".)"));
		return parseInt(s, 8);
	}
	return parseInt(s, 10);
};

Arith.jetons = function(texte){
	var j = [], i = 0, n = texte.length, m;
	while (i < n){
		var c = texte.charAt(i);
		if (c === " " || c === "\t" || c === "\n" || c === "\r"){ i++; continue; }
		var reste = texte.substring(i);
		if ((m = /^(0[xX][0-9A-Fa-f]+|\d+#[0-9A-Za-z]+|\d+)/.exec(reste))){ j.push({ t: "n", v: Arith.nombre(m[1], texte) }); i += m[1].length; continue; }
		if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(reste))){ j.push({ t: "id", v: m[0] }); i += m[0].length; continue; }
		var op = null;
		for (var k = 0; k < OPERATEURS_ARITH.length; k++){
			if (reste.indexOf(OPERATEURS_ARITH[k]) === 0){ op = OPERATEURS_ARITH[k]; break; }
		}
		if (!op) throw erreurArith(texte, "erreur de syntaxe dans l'expression (symbole erroné : « " + c + " »)");
		j.push({ t: "op", v: op });
		i += op.length;
	}
	return j;
};

var NIVEAUX_ARITH = [["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "!="], ["<", ">", "<=", ">="], ["<<", ">>"], ["+", "-"], ["*", "/", "%"]];
var AFFECTATIONS_ARITH = { "=": 1, "+=": 1, "-=": 1, "*=": 1, "/=": 1, "%=": 1, "<<=": 1, ">>=": 1, "&=": 1, "|=": 1, "^=": 1, "**=": 1 };

/* L'arbre d'une expression : une descente récursive, niveau de priorité par niveau. */
Arith.analyser = function(texte){
	if (Arith.cache.hasOwnProperty(texte)) return Arith.cache[texte];
	var j = Arith.jetons(texte), i = 0;
	var estOp = function(v){ return j[i] && j[i].t === "op" && j[i].v === v; };
	var prendreOp = function(v){ if (!estOp(v)) throw erreurArith(texte, "« " + v + " » attendu"); i++; };
	var virgule, affectation, ternaire, binaire, puissance, unaire, postfixe, primaire;
	virgule = function(){
		var a = affectation();
		while (estOp(",")){ i++; a = { k: "seq", a: a, b: affectation() }; }
		return a;
	};
	affectation = function(){
		if (j[i] && j[i].t === "id" && j[i + 1] && j[i + 1].t === "op" && AFFECTATIONS_ARITH[j[i + 1].v]){
			var nom = j[i].v, op = j[i + 1].v;
			i += 2;
			return { k: "aff", nom: nom, op: op, e: affectation() };
		}
		return ternaire();
	};
	ternaire = function(){
		var c = binaire(0);
		if (estOp("?")){
			i++;
			var a = virgule();
			prendreOp(":");
			return { k: "si", c: c, a: a, b: affectation() };
		}
		return c;
	};
	binaire = function(niveau){
		if (niveau >= NIVEAUX_ARITH.length) return puissance();
		var a = binaire(niveau + 1);
		while (j[i] && j[i].t === "op" && NIVEAUX_ARITH[niveau].indexOf(j[i].v) > -1){
			var op = j[i].v;
			i++;
			a = { k: "bin", op: op, a: a, b: binaire(niveau + 1) };
		}
		return a;
	};
	puissance = function(){
		var a = unaire();
		if (estOp("**")){ i++; return { k: "bin", op: "**", a: a, b: puissance() }; }
		return a;
	};
	unaire = function(){
		var v = j[i];
		if (v && v.t === "op"){
			if (v.v === "-" || v.v === "+" || v.v === "!" || v.v === "~"){ i++; return { k: "un", op: v.v, e: unaire() }; }
			if (v.v === "++" || v.v === "--"){
				i++;
				if (!j[i] || j[i].t !== "id") throw erreurArith(texte, v.v + " attend une variable");
				return { k: "pre", op: v.v, nom: j[i++].v };
			}
		}
		return postfixe();
	};
	postfixe = function(){
		var p = primaire();
		if (p.k === "var" && j[i] && j[i].t === "op" && (j[i].v === "++" || j[i].v === "--")){
			var op = j[i].v;
			i++;
			return { k: "post", op: op, nom: p.nom };
		}
		return p;
	};
	primaire = function(){
		var v = j[i];
		if (!v) throw erreurArith(texte, "il manque un nombre (opérande attendu)");
		if (v.t === "n"){ i++; return { k: "n", v: v.v }; }
		if (v.t === "id"){ i++; return { k: "var", nom: v.v }; }
		if (v.v === "("){ i++; var e = virgule(); prendreOp(")"); return e; }
		throw erreurArith(texte, "erreur de syntaxe dans l'expression (symbole erroné : « " + v.v + " »)");
	};
	var arbre = j.length === 0 ? { k: "n", v: 0 } : virgule();
	if (i < j.length) throw erreurArith(texte, "erreur de syntaxe dans l'expression (symbole erroné : « " + j[i].v + " »)");
	if (Arith.taille > 500){ Arith.cache = {}; Arith.taille = 0; }
	Arith.cache[texte] = arbre;
	Arith.taille++;
	return arbre;
};

Arith.operation = function(op, a, b, texte){
	switch (op){
		case "+": return a + b;
		case "-": return a - b;
		case "*": return a * b;
		case "/": if (b === 0) throw erreurArith(texte, "division par 0"); return Math.trunc(a / b);
		case "%": if (b === 0) throw erreurArith(texte, "division par 0"); return a % b;
		case "**": if (b < 0) throw erreurArith(texte, "exposant négatif"); return Math.pow(a, b);
		case "<<": return a << b;
		case ">>": return a >> b;
		case "&": return a & b;
		case "|": return a | b;
		case "^": return a ^ b;
		case "==": return a === b ? 1 : 0;
		case "!=": return a !== b ? 1 : 0;
		case "<": return a < b ? 1 : 0;
		case ">": return a > b ? 1 : 0;
		case "<=": return a <= b ? 1 : 0;
		case ">=": return a >= b ? 1 : 0;
	}
	throw erreurArith(texte, "opérateur inconnu " + op);
};

Arith.evaluer = function(n, env, texte){
	var v;
	switch (n.k){
		case "n": return n.v;
		case "var": return env.lire(n.nom);
		case "un":
			v = Arith.evaluer(n.e, env, texte);
			return n.op === "-" ? -v : n.op === "+" ? v : n.op === "!" ? (v ? 0 : 1) : ~v;
		case "pre":
			v = env.lire(n.nom) + (n.op === "++" ? 1 : -1);
			env.ecrire(n.nom, v);
			return v;
		case "post":
			v = env.lire(n.nom);
			env.ecrire(n.nom, v + (n.op === "++" ? 1 : -1));
			return v;
		case "seq":
			Arith.evaluer(n.a, env, texte);
			return Arith.evaluer(n.b, env, texte);
		case "si":
			return Arith.evaluer(n.c, env, texte) ? Arith.evaluer(n.a, env, texte) : Arith.evaluer(n.b, env, texte);
		case "aff":
			v = Arith.evaluer(n.e, env, texte);
			if (n.op !== "=") v = Arith.operation(n.op.slice(0, -1), env.lire(n.nom), v, texte);
			v = Math.trunc(v);
			env.ecrire(n.nom, v);
			return v;
		case "bin":
			if (n.op === "&&") return Arith.evaluer(n.a, env, texte) ? (Arith.evaluer(n.b, env, texte) ? 1 : 0) : 0;
			if (n.op === "||") return Arith.evaluer(n.a, env, texte) ? 1 : (Arith.evaluer(n.b, env, texte) ? 1 : 0);
			return Math.trunc(Arith.operation(n.op, Arith.evaluer(n.a, env, texte), Arith.evaluer(n.b, env, texte), texte));
	}
	return 0;
};

/* Une variable dans un calcul : son nombre, ou le calcul qu'elle contient (comme bash). */
function environnementArith(garde){
	return {
		lire: function(nom){
			var v = estDefinie(nom) ? String(Shell.variable(nom)).trim() : "";
			if (v === "") return 0;
			if (/^[+-]?\d+$/.test(v)) return parseInt(v, 10);
			if (garde > 8) throw erreurArith(nom, "trop de niveaux de récursion dans les variables");
			return Arith.evaluer(Arith.analyser(v), environnementArith(garde + 1), v);
		},
		ecrire: function(nom, valeur){ Interpreteur.affecter(nom, String(valeur)); }
	};
}

/* Le résultat d'un calcul. Les $VAR et $(...) sont d'abord développés, puis les noms nus sont lus. */
Interpreteur.arith = function(texte){
	var developpe = /[$`]/.test(texte) ? expanserChaine(partiesDouble(texte)) : texte;
	return Arith.evaluer(Arith.analyser(developpe), environnementArith(0), developpe);
};

/* ------------------------------------------------------------------ */
/* Le développement des mots                                           */
/* ------------------------------------------------------------------ */

function echapperRegex(c){ return c.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }
function echapperMotif(t){ return t.replace(/[*?[\]\\]/g, "\\$&"); }

var CLASSES_POSIX = { "alpha": "A-Za-zÀ-ÿ", "digit": "0-9", "alnum": "A-Za-zÀ-ÿ0-9", "upper": "A-Z", "lower": "a-z",
	"space": "\\s", "blank": " \\t", "punct": "!-\\/:-@\\[-`{-~", "xdigit": "0-9A-Fa-f", "word": "A-Za-z0-9_" };

function classeVersRegex(contenu){
	return contenu.replace(/\\/g, "\\\\").replace(/\[:([a-z]+):\]/g, function(tout, nom){ return CLASSES_POSIX[nom] || ""; });
}

/* Un motif de shell (* ? [abc], et \ pour protéger) en expression régulière. */
var CACHE_MOTIFS = {};
function motifVersRegExp(motif){
	if (CACHE_MOTIFS.hasOwnProperty(motif)) return CACHE_MOTIFS[motif];
	var src = "", i = 0;
	while (i < motif.length){
		var c = motif.charAt(i);
		if (c === "\\" && i + 1 < motif.length){ src += echapperRegex(motif.charAt(i + 1)); i += 2; continue; }
		if (c === "*"){ src += "[\\s\\S]*"; i++; continue; }
		if (c === "?"){ src += "[\\s\\S]"; i++; continue; }
		if (c === "["){
			var j = i + 1, neg = false;
			if (motif.charAt(j) === "!" || motif.charAt(j) === "^"){ neg = true; j++; }
			var debut = j;
			if (motif.charAt(j) === "]") j++;
			while (j < motif.length && motif.charAt(j) !== "]"){
				if (motif.charAt(j) === "[" && motif.charAt(j + 1) === ":"){
					var f = motif.indexOf(":]", j + 2);
					j = f === -1 ? j + 1 : f + 2;
					continue;
				}
				j++;
			}
			if (j < motif.length){
				var contenu = motif.substring(debut, j), crochet = contenu.charAt(0) === "]";
				src += "[" + (neg ? "^" : "") + (crochet ? "\\]" : "") + classeVersRegex(crochet ? contenu.substring(1) : contenu) + "]";
				i = j + 1;
				continue;
			}
		}
		src += echapperRegex(c);
		i++;
	}
	var re;
	try { re = new RegExp("^(?:" + src + ")$"); } catch (e){ re = new RegExp("^" + echapperRegex(motif) + "$"); }
	CACHE_MOTIFS[motif] = re;
	return re;
}

function correspondMotif(texte, motif){ return motifVersRegExp(motif).test(texte); }

/* Les morceaux d'un mot : { texte, cite (entre guillemets), coupable (découpé selon IFS) }, et des coupures pour "$@". */
function morceauxDe(parties, cite, sortie){
	for (var i = 0; i < parties.length; i++){
		var p = parties[i];
		switch (p.t){
			case "lit": sortie.push({ texte: p.v, cite: cite }); break;
			case "sq": case "qlit": sortie.push({ texte: p.v, cite: true }); break;
			case "dq":
				// "$@" (ou "${T[@]}") tout seul : un mot par élément, et aucun mot s'il n'y a rien
				if (p.parts.length === 1 && p.parts[0].t === "var" && estListeArobase(p.parts[0])){
					morceauxListe(valeurParametre(p.parts[0]), sortie);
					break;
				}
				sortie.push({ texte: "", cite: true });
				morceauxDe(p.parts, true, sortie);
				break;
			case "var":
				var v = valeurParametre(p);
				if (Array.isArray(v)){
					if (cite && (p.nom === "@" || p.index === "@")) morceauxListe(v, sortie);
					else sortie.push({ texte: v.join(cite ? (valeurIFS().charAt(0)) : " "), cite: cite, coupable: !cite });
				} else sortie.push({ texte: v, cite: cite, coupable: !cite });
				break;
			case "cmd": sortie.push({ texte: substituer(p), cite: cite, coupable: !cite }); break;
			case "arith": sortie.push({ texte: String(Interpreteur.arith(p.texte)), cite: cite, coupable: !cite }); break;
		}
	}
}

/* "$@" et "${T[@]}" donnent un mot par élément ; "$*" les colle en un seul. */
function estListeArobase(p){ return p.op === null && !p.longueur && (p.nom === "@" || p.index === "@"); }

function morceauxListe(liste, sortie){
	for (var k = 0; k < liste.length; k++){
		if (k) sortie.push({ coupure: true });
		sortie.push({ texte: liste[k], cite: true });
	}
}

/* Un mot devient zéro, un ou plusieurs mots : accolades, développements, découpage, jokers. */
function developperMot(mot){
	var variantes = accolades(mot.parts, { n: 0 });
	var champs = [];
	for (var k = 0; k < variantes.length; k++) Array.prototype.push.apply(champs, champsDe(variantes[k]));
	return champs;
}

function developperMots(mots){
	var r = [];
	for (var i = 0; i < mots.length; i++) Array.prototype.push.apply(r, developperMot(mots[i]));
	return r;
}

/*
 * Les noms qui correspondent à un mot à jokers (*.txt), rangés dans l'ordre alphabétique comme bash
 * (sans tenir compte des majuscules, comme dans une langue française ou anglaise). Rien ne correspond :
 * le mot reste tel quel.
 */
function jokers(mot){
	var noms = Shell.developper(mot);
	if (noms.length === 1 && noms[0] === mot) return noms;
	return noms.slice().sort(function(a, b){
		var x = a.toLowerCase(), y = b.toLowerCase();
		return x < y ? -1 : x > y ? 1 : (a < b ? -1 : a > b ? 1 : 0);
	});
}

function champsDe(parties){
	var morceaux = [];
	morceauxDe(parties, false, morceaux);
	var ifs = valeurIFS(), blancsIFS = ifs.replace(/[^ \t\n]/g, "");
	var champs = [], courant = "", existe = false, joker = false;
	var pousser = function(){ champs.push({ texte: courant, joker: joker }); courant = ""; existe = false; joker = false; };
	for (var i = 0; i < morceaux.length; i++){
		var m = morceaux[i];
		if (m.coupure){ if (existe) pousser(); continue; }
		if (!m.coupable){
			courant += m.texte;
			if (m.cite || m.texte !== "") existe = true;
			if (!m.cite && /[*?]/.test(m.texte)) joker = true;
			continue;
		}
		for (var k = 0; k < m.texte.length; k++){
			var c = m.texte.charAt(k);
			if (ifs.indexOf(c) > -1){
				if (blancsIFS.indexOf(c) > -1){ if (existe) pousser(); }
				else pousser();
				continue;
			}
			courant += c;
			existe = true;
			if (c === "*" || c === "?") joker = true;
		}
	}
	if (existe) pousser();
	var resultat = [];
	for (var j = 0; j < champs.length; j++){
		if (champs[j].joker) Array.prototype.push.apply(resultat, jokers(champs[j].texte));
		else resultat.push(champs[j].texte);
	}
	return resultat;
}

/* Un mot développé en un seul texte, sans découpage ni jokers (affectations, cibles, case, [[ ]]). */
function expanserChaine(parties){
	var morceaux = [];
	morceauxDe(parties, false, morceaux);
	var t = "";
	for (var i = 0; i < morceaux.length; i++) t += morceaux[i].coupure ? " " : morceaux[i].texte;
	return t;
}

/* Un motif (case, [[ == ]], ${x#...}) : ce qui est cité est protégé, le reste garde ses jokers. */
function expanserMotif(parties){
	var morceaux = [];
	morceauxDe(parties, false, morceaux);
	var t = "";
	for (var i = 0; i < morceaux.length; i++){
		if (morceaux[i].coupure) t += " ";
		else t += morceaux[i].cite ? echapperMotif(morceaux[i].texte) : morceaux[i].texte;
	}
	return t;
}

/* Le motif d'un =~ : ce qui est cité est pris à la lettre, le reste est une expression régulière. */
function expanserRegex(parties){
	var morceaux = [];
	morceauxDe(parties, false, morceaux);
	var t = "";
	for (var i = 0; i < morceaux.length; i++){
		if (morceaux[i].coupure) t += " ";
		else t += morceaux[i].cite ? morceaux[i].texte.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&") : morceaux[i].texte;
	}
	return t.replace(/\[:([a-z]+):\]/g, function(tout, nom){ return CLASSES_POSIX[nom] || tout; });
}

/* {a,b,c} et {1..5} : seulement dans le texte nu d'un mot. */
var MAX_ACCOLADES = 10000;
function accolades(parties, compte){
	for (var k = 0; k < parties.length; k++){
		if (parties[k].t !== "lit" || parties[k].v.indexOf("{") === -1) continue;
		var v = parties[k].v, d = trouverAccolade(v);
		if (!d) continue;
		var resultat = [];
		for (var o = 0; o < d.options.length; o++){
			var nouvelles = parties.slice(0, k).concat([{ t: "lit", v: v.substring(0, d.debut) + d.options[o] + v.substring(d.fin + 1) }], parties.slice(k + 1));
			Array.prototype.push.apply(resultat, accolades(nouvelles, compte));
			if (resultat.length > MAX_ACCOLADES) throw new ShellError("bash : les accolades donnent plus de " + MAX_ACCOLADES + " mots : c'est trop pour ce monde.", 1);
		}
		return resultat;
	}
	return [parties];
}

function trouverAccolade(v){
	for (var i = 0; i < v.length; i++){
		if (v.charAt(i) !== "{") continue;
		var profondeur = 0, virgules = [], j;
		for (j = i + 1; j < v.length; j++){
			var c = v.charAt(j);
			if (c === "{") profondeur++;
			else if (c === "}"){ if (profondeur === 0) break; profondeur--; }
			else if (c === "," && profondeur === 0) virgules.push(j);
		}
		if (j >= v.length) return null;
		var interieur = v.substring(i + 1, j);
		if (virgules.length){
			var options = [], debut = i + 1;
			virgules.concat([j]).forEach(function(fin){ options.push(v.substring(debut, fin)); debut = fin + 1; });
			return { debut: i, fin: j, options: options };
		}
		var suite = sequenceAccolade(interieur);
		if (suite) return { debut: i, fin: j, options: suite };
	}
	return null;
}

function sequenceAccolade(t){
	var m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(t), r = [], k;
	if (m){
		var a = parseInt(m[1], 10), b = parseInt(m[2], 10), pas = Math.abs(parseInt(m[3] || "1", 10)) || 1;
		var largeur = (/^-?0\d/.test(m[1]) || /^-?0\d/.test(m[2])) ? Math.max(m[1].length, m[2].length) : 0;
		if (Math.abs(b - a) / pas > MAX_ACCOLADES) throw new ShellError("bash : {" + t + "} donne plus de " + MAX_ACCOLADES + " mots : c'est trop pour ce monde.", 1);
		for (k = a; a <= b ? k <= b : k >= b; k += a <= b ? pas : -pas){
			var s = String(Math.abs(k));
			while (s.length < largeur - (k < 0 ? 1 : 0)) s = "0" + s;
			r.push((k < 0 ? "-" : "") + s);
		}
		return r;
	}
	m = /^([A-Za-z])\.\.([A-Za-z])(?:\.\.(-?\d+))?$/.exec(t);
	if (m){
		var x = m[1].charCodeAt(0), y = m[2].charCodeAt(0), p = Math.abs(parseInt(m[3] || "1", 10)) || 1;
		for (k = x; x <= y ? k <= y : k >= y; k += x <= y ? p : -p) r.push(String.fromCharCode(k));
		return r;
	}
	return null;
}

/* La valeur d'un $NOM ou ${...} : un texte, ou une liste pour $@ et ${T[@]}. */
function valeurParametre(p){
	if (p.indices) return lireTableau(p.nom).map(function(v, k){ return String(k); });
	if (p.indirect){
		var cible = valeurSimple({ nom: p.nom, index: null });
		if (cible === undefined || cible === "") return sansValeur(p);
		if (!/^([A-Za-z_][A-Za-z0-9_]*|[0-9]+)$/.test(cible)) throw new ShellError("bash : " + cible + " : mauvaise substitution", 1);
		return valeurParametre({ t: "var", nom: cible, index: null, op: null, arg: null, longueur: false });
	}
	var nom = p.nom, liste = null;
	if (p.longueur){
		if (nom === "@" || nom === "*") return String(positionnels().length);
		if (p.index === "@" || p.index === "*") return String(lireTableau(nom).length);
		var w = valeurSimple(p);
		if (w === undefined) w = sansValeur(p);
		return String(w.length);
	}
	if (nom === "@" || nom === "*") liste = positionnels().slice();
	else if (p.index === "@" || p.index === "*"){ Shell.variable_developpee = true; liste = lireTableau(nom).slice(); }
	if (liste !== null){
		if (p.op === null) return liste;
		if (p.op === ":"){
			var morceaux = p.arg.split(":");
			var base = (nom === "@" || nom === "*") ? [nom0()].concat(liste) : liste;
			var debut = Interpreteur.arith(morceaux[0]);
			if (debut < 0) debut = Math.max(0, base.length + debut);
			var fin = morceaux.length > 1 ? debut + Interpreteur.arith(morceaux[1]) : base.length;
			return base.slice(debut, fin);
		}
	}
	var v = liste !== null ? liste.join(" ") : valeurSimple(p);
	var arg;
	switch (p.op){
		case null:
			return v === undefined ? sansValeur(p) : v;
		case ":-": return (v === undefined || v === "") ? expanserChaine(p.arg) : v;
		case "-": return v === undefined ? expanserChaine(p.arg) : v;
		case ":=": case "=":
			if (v === undefined || (p.op === ":=" && v === "")){
				if (/^[0-9@*#?$!-]/.test(nom)) throw new ShellError("bash : $" + nom + " : on ne peut pas affecter ainsi un paramètre spécial", 1);
				arg = expanserChaine(p.arg);
				Interpreteur.affecter(nom, arg);
				return arg;
			}
			return v;
		case ":+": return (v === undefined || v === "") ? "" : expanserChaine(p.arg);
		case "+": return v === undefined ? "" : expanserChaine(p.arg);
		case ":?": case "?":
			if (v === undefined || (p.op === ":?" && v === "")){
				arg = expanserChaine(p.arg);
				throw new ShellError("bash : " + nom + " : " + (arg || "paramètre vide ou non défini"), 1);
			}
			return v;
	}
	if (v === undefined) v = sansValeur(p);
	switch (p.op){
		case "#": case "##": case "%": case "%%": return retirerMotif(v, expanserMotif(p.arg), p.op);
		case "/": case "//": return remplacerMotif(v, expanserMotif(p.arg), expanserChaine(p.remplacement), p.op === "//", p.ancre);
		case "^^": return v.toUpperCase();
		case ",,": return v.toLowerCase();
		case "^": return v.charAt(0).toUpperCase() + v.substring(1);
		case ",": return v.charAt(0).toLowerCase() + v.substring(1);
		case ":":
			var bouts = p.arg.split(":");
			var off = Interpreteur.arith(bouts[0]);
			if (off < 0) off = Math.max(0, v.length + off);
			var longueur = bouts.length > 1 ? Interpreteur.arith(bouts[1]) : null;
			var finS = longueur === null ? v.length : (longueur < 0 ? v.length + longueur : off + longueur);
			return v.substring(off, Math.max(off, finS));
	}
	return v;
}

/* Une variable sans valeur : le texte vide, ou une erreur avec set -u. */
function sansValeur(p){
	if (optionsCourantes().u && !/^[@*#?$!-]$/.test(p.nom)){
		throw new ShellError("bash : " + p.nom + " : variable sans valeur (set -u)", 1);
	}
	return "";
}

function valeurSimple(p){
	var nom = p.nom;
	if (/^[0-9]+$/.test(nom)){
		if (nom === "0") return nom0();
		var pos = positionnels(), n = parseInt(nom, 10);
		return n <= pos.length ? pos[n - 1] : undefined;
	}
	switch (nom){
		case "?": return String(Shell.statut);
		case "#": return String(positionnels().length);
		case "$": return String(PID_BASH);
		case "!": return "";
		case "-": var o = optionsCourantes(); return "hB" + (o.e ? "e" : "") + (o.u ? "u" : "") + (o.x ? "x" : "");
	}
	Shell.variable_developpee = true;
	if (p.index !== null){
		var idx = Interpreteur.arith(p.index);
		var t = lireTableau(nom);
		if (idx < 0) idx += t.length;
		return idx >= 0 && idx < t.length ? t[idx] : undefined;
	}
	if (nom === "RANDOM") return String(Math.floor(Math.random() * 32768));
	if (nom === "IFS") return valeurIFS();
	return estDefinie(nom) ? Shell.variable(nom) : undefined;
}

function retirerMotif(v, motif, op){
	var re = motifVersRegExp(motif), k;
	if (op === "#"){ for (k = 0; k <= v.length; k++) if (re.test(v.substring(0, k))) return v.substring(k); }
	else if (op === "##"){ for (k = v.length; k >= 0; k--) if (re.test(v.substring(0, k))) return v.substring(k); }
	else if (op === "%"){ for (k = v.length; k >= 0; k--) if (re.test(v.substring(k))) return v.substring(0, k); }
	else { for (k = 0; k <= v.length; k++) if (re.test(v.substring(k))) return v.substring(0, k); }
	return v;
}

function remplacerMotif(v, motif, remplacement, tous, ancre){
	if (motif === "") return v;
	var re = motifVersRegExp(motif), k;
	if (ancre === "#"){ for (k = v.length; k >= 0; k--) if (re.test(v.substring(0, k))) return remplacement + v.substring(k); return v; }
	if (ancre === "%"){ for (k = 0; k <= v.length; k++) if (re.test(v.substring(k))) return v.substring(0, k) + remplacement; return v; }
	var sortie = "", i = 0, fait = false;
	while (i < v.length){
		var trouve = -1;
		if (!fait || tous){
			for (k = v.length; k > i; k--){ if (re.test(v.substring(i, k))){ trouve = k; break; } }
		}
		if (trouve > -1){ sortie += remplacement; i = trouve; fait = true; }
		else { sortie += v.charAt(i); i++; }
	}
	return sortie;
}

/* $(...) : lancé dans un sous-shell, sa sortie normale capturée, sans les retours à la ligne de la fin. */
function substituer(p){
	if (++Interpreteur.profondeur > Interpreteur.LIMITE_PROFONDEUR){
		Interpreteur.profondeur--;
		throw new LimiteAtteinte("bash : trop de $(...) emboîtés (plus de " + Interpreteur.LIMITE_PROFONDEUR + ").");
	}
	var parent = fluxCourant();
	var flux = new FluxCapture(function(t){ parent.erreur(t); });
	Interpreteur.flux.push(flux);
	var avant = Interpreteur.signalEnAttente;
	Interpreteur.signalEnAttente = null;
	var code;
	try {
		code = dansSousShell(function(){ return Interpreteur.executerNoeud(p.arbre); });
	} finally {
		Interpreteur.flux.pop();
		Interpreteur.profondeur--;
		Interpreteur.signalEnAttente = avant;
	}
	Interpreteur.dernierSubst = code;
	Shell.statut = code;
	return flux.texte.replace(/\n+$/, "");
}

/* Un mot cité pour être relu par le shell (set -x, alias, type). */
function citer(mot){
	if (mot !== "" && /^[A-Za-z0-9_.\/~=:@%+,^-]+$/.test(mot)) return mot;
	return "'" + mot.replace(/'/g, "'\\''") + "'";
}

/* ------------------------------------------------------------------ */
/* 3. L'exécution                                                      */
/* ------------------------------------------------------------------ */

Interpreteur.executerNoeud = function(n){
	switch (n.k){
		case "liste":
			var code = 0;
			for (var i = 0; i < n.elements.length; i++) code = executerElement(n.elements[i]);
			return code;
		case "etou": return executerEtOu(n);
		case "tuyau": return executerTuyau(n);
		default: return executerCompose(n);
	}
};

function executerElement(e){
	if (e.fond && !Interpreteur.fondSignale){
		Interpreteur.fondSignale = true;
		Shell.ecranErreur(C.gris("(& lance une commande en tâche de fond. Ici, il n'y a pas de tâche de fond : elle tourne tout de suite, au premier plan.)"));
	}
	// Une erreur hors d'un tuyau (for PATH in ..., une valeur trop longue au prompt) : un message, pas un plantage.
	return essayer(function(){ return Interpreteur.executerNoeud(e.noeud); });
}

/* a && b || c : seule la dernière commande de la chaîne compte pour set -e. */
function executerEtOu(n){
	var code;
	Interpreteur.conditionnel++;
	try { code = Interpreteur.executerNoeud(n.premier); }
	finally { Interpreteur.conditionnel--; }
	for (var i = 0; i < n.suite.length; i++){
		var s = n.suite[i];
		if ((s.op === "&&" && code !== 0) || (s.op === "||" && code === 0)) continue;
		var dernier = i === n.suite.length - 1;
		if (!dernier) Interpreteur.conditionnel++;
		try { code = Interpreteur.executerNoeud(s.tuyau); }
		finally { if (!dernier) Interpreteur.conditionnel--; }
	}
	Shell.statut = code;
	return code;
}

var NOMS_DES_BLOCS = { si: "if", pour: "for", pourArith: "for", tantque: "while", cas: "case", groupe: "{", sousshell: "(", arith: "((", cond: "[[" };

function executerTuyau(n){
	var code;
	if (n.neg) Interpreteur.conditionnel++;
	try {
		var seul = n.cmds.length === 1 ? n.cmds[0] : null;
		if (seul && seul.k === "fonction"){
			definirFonction(seul);
			code = 0;
		} else if (seul && seul.k !== "simple" && !seul.redirs.length){
			// un bloc tout seul, sans redirection : il s'exécute ici, et sa sortie s'affiche au fil de l'eau
			code = executerCompose(seul);
		} else {
			var plusieurs = n.cmds.length > 1;
			var segments = n.cmds.map(function(c){ return segmentDe(c, plusieurs); });
			var avant = Interpreteur.signalEnAttente;
			Interpreteur.signalEnAttente = null;
			var signal;
			try {
				Shell.tuyau({ segments: segments });
			} finally {
				signal = Interpreteur.signalEnAttente;
				Interpreteur.signalEnAttente = avant;
			}
			if (signal) throw signal;
			code = Shell.statut;
			if (optionsCourantes().pipefail){
				var codes = Shell.statutsTuyau;
				for (var k = codes.length - 1; k >= 0; k--) if (codes[k] !== 0){ code = codes[k]; break; }
			}
		}
	} finally {
		if (n.neg) Interpreteur.conditionnel--;
	}
	if (n.neg) code = code === 0 ? 1 : 0;
	Shell.statut = code;
	if (code !== 0 && !n.neg && Interpreteur.conditionnel === 0 && optionsCourantes().e) throw new SignalSortie(code);
	return code;
}

/* Un morceau de tuyau, que Shell.tuyau préparera au bon moment. */
function segmentDe(c, sousShell){
	if (c.k === "simple") return { preparer: function(){ return preparerSimple(c, sousShell); } };
	if (c.k === "fonction") return { preparer: function(){ definirFonction(c); return { vide: true, argv: [], redirs: [] }; } };
	return { preparer: function(){
		return { argv: [NOMS_DES_BLOCS[c.k] || c.k], redirs: developperRedirections(c.redirs),
			lancer: function(nom, args, io){ return executerBlocAvecIo(c, io, sousShell); } };
	} };
}

function executerBlocAvecIo(c, io, sousShell){
	var code = null;
	var sortie = avecEntree(io, function(){
		return avecFlux(io, function(){
			code = (sousShell && c.k !== "sousshell") ? dansSousShell(function(){ return executerCompose(c); }) : executerCompose(c);
		});
	});
	io.code = code !== null ? code : (io.codeSignal || 0);
	return sortie;
}

/* Une erreur dans un calcul ou un test lancé hors d'un tuyau : on l'affiche, et le statut dit l'échec. */
function essayer(fn){
	try {
		return fn();
	} catch (e){
		if (!(e instanceof ShellError)) throw e;
		Shell.ecranErreur(e.message);
		jouerSon("erreur");
		return e.code || 1;
	}
}

/* Le corps d'une boucle : break et continue (break 2 sort de deux boucles). Renvoie "break", "continue" ou null. */
function tourDeBoucle(corps, resultat){
	resultat.tours++;
	try {
		resultat.code = Interpreteur.executerNoeud(corps);
		return null;
	} catch (e){
		if (!(e instanceof SignalBoucle)) throw e;
		if (e.niveau > 1){ e.niveau--; throw e; }
		if (e.sorte === "break"){ resultat.code = 0; resultat.casse = true; }
		return e.sorte;
	}
}

/* Le bilan d'une boucle : { code, tours, casse }. Annoncée aux quêtes quand elle se termine. */
function nouvelleBoucle(){ return { code: 0, tours: 0, casse: false }; }
function finDeBoucle(sorte, res){
	GameEvents.fire({ type: "boucle", sorte: sorte, tours: res.tours, statut: res.code, interrompue: res.casse, dansScript: dansUnScript() });
	return res.code;
}

function executerCompose(c){
	var code = 0, r, i;
	switch (c.k){
		case "si":
			for (i = 0; i < c.branches.length; i++){
				Interpreteur.conditionnel++;
				try { r = Interpreteur.executerNoeud(c.branches[i].cond); }
				finally { Interpreteur.conditionnel--; }
				if (r === 0) return Interpreteur.executerNoeud(c.branches[i].corps);
			}
			return c.sinon ? Interpreteur.executerNoeud(c.sinon) : 0;
		case "tantque":
			Interpreteur.boucles++;
			try {
				var res = nouvelleBoucle();
				for (;;){
					compter();
					Interpreteur.conditionnel++;
					try { r = Interpreteur.executerNoeud(c.cond); }
					finally { Interpreteur.conditionnel--; }
					if ((r === 0) === c.jusqua) break;
					if (tourDeBoucle(c.corps, res) === "break") break;
				}
				return finDeBoucle(c.jusqua ? "until" : "while", res);
			} finally {
				Interpreteur.boucles--;
			}
		case "pour":
			var valeurs;
			r = essayer(function(){ valeurs = c.mots === null ? positionnels().slice() : developperMots(c.mots); return 0; });
			if (r !== 0) return r;
			Interpreteur.boucles++;
			try {
				var resPour = nouvelleBoucle();
				for (i = 0; i < valeurs.length; i++){
					compter();
					Interpreteur.affecter(c.nom, valeurs[i]);
					if (tourDeBoucle(c.corps, resPour) === "break") break;
				}
				return finDeBoucle("for", resPour);
			} finally {
				Interpreteur.boucles--;
			}
		case "pourArith":
			r = essayer(function(){ if (c.init.trim() !== "") Interpreteur.arith(c.init); return 0; });
			if (r !== 0) return r;
			Interpreteur.boucles++;
			try {
				var resArith = nouvelleBoucle(), continuer;
				for (;;){
					compter();
					continuer = true;
					r = essayer(function(){ continuer = c.cond.trim() === "" || Interpreteur.arith(c.cond) !== 0; return 0; });
					if (r !== 0) return r;
					if (!continuer) break;
					if (tourDeBoucle(c.corps, resArith) === "break") break;
					r = essayer(function(){ if (c.pas.trim() !== "") Interpreteur.arith(c.pas); return 0; });
					if (r !== 0) return r;
				}
				return finDeBoucle("for ((", resArith);
			} finally {
				Interpreteur.boucles--;
			}
		case "cas":
			var valeur;
			r = essayer(function(){ valeur = expanserChaine(c.mot.parts); return 0; });
			if (r !== 0) return r;
			var tomber = false;
			for (i = 0; i < c.items.length; i++){
				var item = c.items[i], choisi = tomber;
				for (var m = 0; !choisi && m < item.motifs.length; m++){
					var motif;
					r = essayer(function(){ motif = expanserMotif(item.motifs[m].parts); return 0; });
					if (r !== 0) return r;
					if (correspondMotif(valeur, motif)) choisi = true;
				}
				if (!choisi) continue;
				code = Interpreteur.executerNoeud(item.corps);
				if (item.fin === ";&"){ tomber = true; continue; }
				tomber = false;
				if (item.fin === ";;&") continue;
				return code;
			}
			return code;
		case "groupe": return Interpreteur.executerNoeud(c.corps);
		case "sousshell": return dansSousShell(function(){ return Interpreteur.executerNoeud(c.corps); });
		case "arith":
			compter();
			return essayer(function(){ return Interpreteur.arith(c.texte) !== 0 ? 0 : 1; });
		case "cond":
			compter();
			return essayer(function(){ return evaluerCond(c.expr) ? 0 : 1; });
		case "fonction":
			definirFonction(c);
			return 0;
		case "liste": case "etou": case "tuyau":
			return Interpreteur.executerNoeud(c);
	}
	return 0;
}

/* Les redirections d'une commande, développées : { op, cible } ou { op, texte } pour << et <<<. */
function developperRedirections(redirs){
	var r = [];
	for (var i = 0; i < redirs.length; i++){
		var d = redirs[i];
		if (d.heredoc){
			var h = d.heredoc;
			var corps = h.cite ? (h.corps || "") : expanserChaine(h.parts || []);
			r.push({ op: "<<", texte: corps.replace(/\n$/, "") });
			continue;
		}
		if (!d.cible){ r.push({ op: d.op }); continue; }
		if (d.op === "<<<"){ r.push({ op: "<<<", texte: expanserChaine(d.cible.parts) }); continue; }
		var champs = developperMot(d.cible);
		if (champs.length !== 1) throw new ShellError("bash : " + d.cible.brut + " : redirection ambiguë" +
			(champs.length === 0 ? "\n" + C.gris("(La variable est vide : mets-la entre guillemets, ou vérifie son nom.)") : ""), 1);
		r.push({ op: d.op, cible: champs[0] });
	}
	return r;
}

var DECLARATIONS = { "local": 1, "declare": 1, "typeset": 1, "export": 1, "readonly": 1 };

/* Prépare une commande simple au moment de la lancer : développe ses mots, ses affectations, ses redirections. */
function preparerSimple(c, sousShell){
	compter();
	Interpreteur.dernierSubst = null;
	var argv;
	if (c.mots.length && DECLARATIONS.hasOwnProperty(litteralDe(c.mots[0].parts))){
		// local x=$a : pas de découpage dans les affectations d'une déclaration
		argv = [litteralDe(c.mots[0].parts)];
		for (var i = 1; i < c.mots.length; i++){
			var m = c.mots[i];
			if (m.parts.length && m.parts[0].t === "lit" && /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(m.parts[0].v)) argv.push(expanserChaine(m.parts));
			else Array.prototype.push.apply(argv, developperMot(m));
		}
	} else {
		argv = developperMots(c.mots);
	}
	var affs = c.affs.map(function(a){
		return { nom: a.nom, ajout: a.ajout, index: a.index === null ? null : Interpreteur.arith(a.index),
			valeur: a.tableau ? null : expanserChaine(a.parts), tableau: a.tableau ? developperMots(a.tableau) : null };
	});
	var redirs = developperRedirections(c.redirs);
	var trace = optionsCourantes().x;
	var lancer = lancerCommande;
	// Un alias remplace le premier mot, s'il est écrit tel quel.
	if (argv.length && c.mots.length && litteralDe(c.mots[0].parts) === argv[0] && state.alias.hasOwnProperty(argv[0]) && !Interpreteur.enAlias[argv[0]]){
		var a = appliquerAlias(argv);
		argv = a.argv;
		if (a.lancer) lancer = a.lancer;
	}
	if (argv.length === 0){
		affs.forEach(function(a){
			if (trace) Shell.ecranErreur("+ " + a.nom + (a.ajout ? "+=" : "=") + (a.tableau ? "(" + a.tableau.map(citer).join(" ") + ")" : citer(a.valeur)));
			appliquerAffectation(a);
		});
		return { vide: true, argv: [], redirs: redirs, code: Interpreteur.dernierSubst === null ? 0 : Interpreteur.dernierSubst };
	}
	if (trace) Shell.ecranErreur("+ " + affs.map(function(a){ return a.nom + "=" + citer(a.valeur || ""); }).concat(argv.map(citer)).join(" "));
	return { argv: argv, redirs: redirs, lancer: function(nom, args, io){
		var execution = function(){ return avecTemporaires(affs, function(){ return lancer(nom, args, io); }); };
		if (!sousShell) return execution();
		var sortie = "";
		io.code = dansSousShell(function(){ sortie = execution(); return io.code || 0; });
		return sortie;
	} };
}

function appliquerAffectation(a){
	if (a.tableau){
		Interpreteur.affecter(a.nom, a.ajout ? lireTableau(a.nom).concat(a.tableau) : a.tableau);
		return;
	}
	if (a.index !== null){
		var t = lireTableau(a.nom);
		affecterElement(a.nom, a.index, (a.ajout ? (t[a.index] || "") : "") + a.valeur);
		return;
	}
	Interpreteur.affecter(a.nom, a.ajout ? Interpreteur.lire(a.nom) + a.valeur : a.valeur);
}

/* NOM=valeur commande : la variable n'existe que le temps de la commande. */
function avecTemporaires(affs, fn){
	if (!affs.length) return fn();
	var cadre = nouveauCadre({});
	affs.forEach(function(a){
		cadre.vars[a.nom] = a.tableau ? a.tableau : (a.ajout ? Interpreteur.lire(a.nom) : "") + a.valeur;
		cadre.exportees[a.nom] = true; // NOM=valeur bash script : le script la voit
	});
	Interpreteur.cadres.push(cadre);
	try { return fn(); }
	finally {
		var k = Interpreteur.cadres.lastIndexOf(cadre);
		if (k > -1) Interpreteur.cadres.splice(k, 1);
	}
}

function appliquerAlias(argv){
	var nom = argv[0], texte = state.alias[nom], arbre = null;
	try { arbre = Interpreteur.analyser(texte); } catch (e){ arbre = null; }
	var el = arbre && arbre.elements.length === 1 && !arbre.elements[0].fond ? arbre.elements[0].noeud : null;
	var cmd = el && el.k === "tuyau" && !el.neg && el.cmds.length === 1 ? el.cmds[0] : null;
	if (cmd && cmd.k === "simple" && !cmd.redirs.length && !cmd.affs.length){
		var mots;
		Interpreteur.enAlias[nom] = true;
		try { mots = developperMots(cmd.mots); } finally { delete Interpreteur.enAlias[nom]; }
		if (!mots.length) throw new ShellError("Cet alias est vide.");
		return { argv: mots.concat(argv.slice(1)) };
	}
	// Un alias plus riche (avec | ou ;) : on lance son texte, suivi des arguments.
	var ligne = texte + " " + argv.slice(1).map(citer).join(" ");
	return { argv: argv, lancer: function(n, args, io){
		var code = 0;
		var sortie = avecFlux(io, function(){
			Interpreteur.enAlias[nom] = true;
			try { code = executerTexte(ligne, {}); } finally { delete Interpreteur.enAlias[nom]; }
		});
		io.code = code;
		return sortie;
	} };
}

/* Les fautes classiques de débutant, repérées avant de chercher un sort qui n'existe pas. */
function fauteClassique(nom, args){
	if (nom.length > 1 && nom.charAt(0) === "[" && !Shell.sorts.hasOwnProperty(nom)){
		return new ShellError(nom + " : sort inconnu\n" + C.gris("(Il faut une espace après [ et avant ] : [ -f rapport.txt ], [ \"$x\" = oui ].)"), 127);
	}
	if (args.length && /^=/.test(args[0]) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(nom) && !Shell.sorts.hasOwnProperty(nom) && !state.alias.hasOwnProperty(nom)){
		var valeur = args[0] === "=" ? (args[1] || "") : args[0].substring(1);
		return new ShellError(nom + " : sort inconnu\n" + C.gris("(Pour ranger une valeur dans une variable, pas d'espace autour du signe égal : " + nom + "=" + valeur + ")"), 127);
	}
	return null;
}

/* Lance une commande : une fonction, une commande intégrée au shell, ou un sort (par Shell.appeler). */
function lancerCommande(nom, args, io){
	if (io.sudo){
		if (PROGRAMMES_INTEGRES.hasOwnProperty(nom)) return INTEGREES[nom](args, io);
		if (trouverFonction(nom) || INTEGREES.hasOwnProperty(nom)){
			throw new ShellError("sudo : " + nom + " : commande introuvable\n" +
				C.gris("(" + nom + " vit à l'intérieur du shell : sudo ne sait lancer que des programmes.)"), 1);
		}
		return Shell.appeler(nom === "sh" ? "bash" : nom, args, io);
	}
	var f = trouverFonction(nom);
	if (f) return appelerFonction(f, nom, args, io);
	if (INTEGREES.hasOwnProperty(nom)) return INTEGREES[nom](args, io);
	if (nom === "sh") nom = "bash";
	var faute = fauteClassique(nom, args);
	if (faute) throw faute;
	// L'entrée du bloc en cours (while read ...; done < objet) : un sort la voit, sans la consommer.
	var e = entreeCourante();
	io.entree = e;
	if ((io.stdin === null || io.stdin === undefined) && e){ io.stdin = e.reste(); io.stdinHerite = true; }
	return Shell.appeler(nom, args, io);
}

function appelerFonction(f, nom, args, io){
	if (++Interpreteur.profondeur > Interpreteur.LIMITE_PROFONDEUR){
		Interpreteur.profondeur--;
		throw new LimiteAtteinte("bash : " + nom + " : plus de " + Interpreteur.LIMITE_PROFONDEUR + " appels emboîtés. Une fonction qui s'appelle elle-même sans jamais s'arrêter ?\n" +
			C.gris("(Une fonction récursive a besoin d'un cas d'arrêt : if [ $1 -le 0 ]; then return; fi)"));
	}
	var boucles = Interpreteur.boucles;
	Interpreteur.boucles = 0;
	var cadre = nouveauCadre({ fonction: true, positionnels: args.slice() });
	var code = null;
	var sortie;
	try {
		sortie = avecEntree(io, function(){
			return avecFlux(io, function(){
				Interpreteur.cadres.push(cadre);
				try {
					code = Interpreteur.executerNoeud(f.corps);
				} catch (e){
					if (e instanceof SignalRetour) code = e.code;
					else throw e;
				} finally {
					var k = Interpreteur.cadres.lastIndexOf(cadre);
					if (k > -1) Interpreteur.cadres.splice(k, 1);
				}
			});
		});
	} finally {
		Interpreteur.profondeur--;
		Interpreteur.boucles = boucles;
	}
	io.code = code !== null ? code : (io.codeSignal || 0);
	GameEvents.fire({ type: "fonction", action: "appel", nom: nom, args: args.slice(), statut: io.code,
		profondeur: Interpreteur.profondeur + 1, dansScript: dansUnScript() });
	return sortie;
}

/* ------------------------------------------------------------------ */
/* Les conditions : test, [ ], [[ ]]                                    */
/* ------------------------------------------------------------------ */

/* Le lieu ou l'objet désigné par un chemin (null s'il n'existe pas, ou si on ne peut pas y passer). */
function noeudDe(chemin, suivre){
	if (chemin === "") return null;
	try {
		var r = Shell.chercher(chemin, { sudo: false }, "test");
		var n = r.node;
		if (n && suivre) n = Shell.suivre(n, "test");
		return n;
	} catch (e){
		if (e instanceof ShellError) return null;
		throw e;
	}
}

function entier(x, cmd){
	if (!/^\s*[+-]?\d+\s*$/.test(x)){
		throw new ShellError(cmd + " : « " + x + " » : nombre entier attendu" +
			(x === "" ? "\n" + C.gris("(Une variable vide ? Vérifie son nom, ou donne-lui une valeur.)") : ""), 2);
	}
	return parseInt(x, 10);
}

function testUnaire(op, x){
	var n;
	switch (op){
		case "-z": return x === "";
		case "-n": return x !== "";
		case "-v": return estDefinie(x);
		case "-L": case "-h": n = noeudDe(x, false); return !!(n && n instanceof Item && n.lien);
	}
	n = noeudDe(x, true);
	switch (op){
		case "-e": case "-a": return n !== null;
		case "-f": return n instanceof Item;
		case "-d": return n instanceof Room;
		case "-s": return n instanceof Room || (n instanceof Item && n.getText() !== "");
		case "-r": case "-w": case "-x": return !!n && Shell.bit(n, op.charAt(1), null);
	}
	return false;
}

function testBinaire(a, op, b, cmd){
	switch (op){
		case "=": case "==": return a === b;
		case "!=": return a !== b;
		case "<": return a < b;
		case ">": return a > b;
		case "-eq": return entier(a, cmd) === entier(b, cmd);
		case "-ne": return entier(a, cmd) !== entier(b, cmd);
		case "-lt": return entier(a, cmd) < entier(b, cmd);
		case "-le": return entier(a, cmd) <= entier(b, cmd);
		case "-gt": return entier(a, cmd) > entier(b, cmd);
		case "-ge": return entier(a, cmd) >= entier(b, cmd);
		case "-nt": case "-ot": return false;
	}
	throw new ShellError(cmd + " : « " + op + " » : opérateur inconnu", 2);
}

var UNAIRES_TEST = { "-e": 1, "-a": 1, "-f": 1, "-d": 1, "-r": 1, "-w": 1, "-x": 1, "-s": 1, "-z": 1, "-n": 1, "-L": 1, "-h": 1, "-v": 1 };
var BINAIRES_TEST = { "=": 1, "==": 1, "!=": 1, "<": 1, ">": 1, "-eq": 1, "-ne": 1, "-lt": 1, "-le": 1, "-gt": 1, "-ge": 1, "-nt": 1, "-ot": 1 };

/* test et [ : des arguments déjà développés, avec ! -a -o et des parenthèses. */
function evaluerTest(args, cmd){
	var i = 0;
	if (args.length === 0) return false;
	var ou, et, non, primaire;
	ou = function(){ var v = et(); while (args[i] === "-o"){ i++; var w = et(); v = v || w; } return v; };
	et = function(){ var v = non(); while (args[i] === "-a"){ i++; var w = non(); v = v && w; } return v; };
	non = function(){
		if (args[i] === "!" && i + 1 < args.length){ i++; return !non(); }
		return primaire();
	};
	primaire = function(){
		if (i >= args.length) throw new ShellError(cmd + " : il manque un argument", 2);
		var a = args[i];
		if (a === "(" && i + 1 < args.length && args.indexOf(")", i + 1) > -1 && !(BINAIRES_TEST[args[i + 1]] && i + 2 < args.length && args[i + 3] !== ")")){
			i++;
			var v = ou();
			if (args[i] !== ")") throw new ShellError(cmd + " : il manque « ) »", 2);
			i++;
			return v;
		}
		if (i + 2 < args.length && BINAIRES_TEST[args[i + 1]]){ i += 3; return testBinaire(a, args[i - 2], args[i - 1], cmd); }
		if (UNAIRES_TEST[a] && i + 1 < args.length){ i += 2; return testUnaire(a, args[i - 1]); }
		i++;
		return a !== "";
	};
	var r = ou();
	if (i < args.length){
		throw new ShellError(cmd + " : trop d'arguments (« " + args[i] + " » est de trop)\n" +
			C.gris("(Une variable vide ou qui contient des espaces ? Mets-la entre guillemets : [ \"$x\" = oui ].)"), 2);
	}
	return r;
}

function evaluerCond(e){
	switch (e.k){
		case "et": return evaluerCond(e.a) && evaluerCond(e.b);
		case "ou": return evaluerCond(e.a) || evaluerCond(e.b);
		case "non": return !evaluerCond(e.e);
		case "seul": return expanserChaine(e.a.parts) !== "";
		case "un": return testUnaire(e.op, expanserChaine(e.a.parts));
	}
	var g = expanserChaine(e.a.parts), op = e.op;
	if (op === "==" || op === "=" || op === "!="){
		var ok = correspondMotif(g, expanserMotif(e.b.parts));
		return op === "!=" ? !ok : ok;
	}
	if (op === "=~"){
		var source = expanserRegex(e.b.parts), re;
		try { re = new RegExp(source); }
		catch (x){ throw new ShellError("bash : [[ : expression régulière invalide : « " + source + " »", 2); }
		var m = re.exec(g);
		Interpreteur.affecter("BASH_REMATCH", m ? Array.prototype.map.call(m, function(s){ return s === undefined ? "" : s; }) : []);
		return !!m;
	}
	var d = expanserChaine(e.b.parts);
	if (/^-(eq|ne|lt|le|gt|ge)$/.test(op)){
		// Dans [[ ]], les deux côtés d'un -eq sont des calculs : [[ $n+1 -gt 3 ]]
		return testBinaire(String(Interpreteur.arith(g || "0")), op, String(Interpreteur.arith(d || "0")), "[[");
	}
	return testBinaire(g, op, d, "[[");
}

/* ------------------------------------------------------------------ */
/* Les commandes intégrées au shell (toujours disponibles)             */
/* ------------------------------------------------------------------ */

var INTEGREES = {};
/* Celles qui existent aussi comme programmes : sudo peut les lancer. */
var PROGRAMMES_INTEGRES = { "test": 1, "[": 1, "true": 1, "false": 1 };

INTEGREES["true"] = function(){ return ""; };
INTEGREES[":"] = INTEGREES["true"];
INTEGREES["false"] = function(args, io){ io.code = 1; return ""; };

INTEGREES.test = function(args, io){
	io.code = evaluerTest(args, "test") ? 0 : 1;
	return "";
};
INTEGREES["["] = function(args, io){
	if (args[args.length - 1] !== "]"){
		throw new ShellError("[ : il manque le « ] » de fermeture\n" + C.gris("(Avec ses espaces, comme un mot à part : [ -f rapport.txt ])"), 2);
	}
	io.code = evaluerTest(args.slice(0, -1), "[") ? 0 : 1;
	return "";
};
INTEGREES["]]"] = function(){ throw new ShellError("bash : ]] sans [[ ouvert", 2); };

["break", "continue"].forEach(function(sorte){
	INTEGREES[sorte] = function(args, io){
		var n = args.length ? args[0] : "1";
		if (!/^\d+$/.test(n) || +n < 1) throw new ShellError(sorte + " : « " + n + " » : il faut un nombre de boucles, 1 ou plus", 1);
		if (Interpreteur.boucles === 0){
			io.err(sorte + " : n'a de sens que dans une boucle for, while ou until");
			return "";
		}
		throw new SignalBoucle(sorte, Math.min(+n, Interpreteur.boucles));
	};
});

INTEGREES["return"] = function(args, io){
	var dansFonction = Interpreteur.cadres.some(function(c){ return c.fonction || c.source; });
	if (!dansFonction) throw new ShellError("return : on ne peut faire return que dans une fonction (ou un script lu par source)\n" +
		C.gris("(Pour arrêter un script, c'est exit.)"), 1);
	throw new SignalRetour(codeDe(args[0], "return"));
};

INTEGREES.exit = function(args, io){
	if (Interpreteur.cadres.some(function(c){ return c.limite; })) throw new SignalSortie(codeDe(args[0], "exit"));
	// au prompt : l'exit du jeu (fermer une connexion ssh, ou la session)
	return Shell.appeler("exit", args, io);
};

INTEGREES.local = function(args, io){
	var cadre = cadreFonction();
	if (!cadre) throw new ShellError("local : ne s'utilise que dans une fonction", 1);
	args.forEach(function(a){
		if (/^[-+]/.test(a)) return;
		var m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=([\s\S]*)$/.exec(a);
		if (m){ cadre.vars[m[1]] = (m[2] ? Interpreteur.lire(m[1]) : "") + m[3]; return; }
		verifierNom(a, "local");
		if (!cadre.vars.hasOwnProperty(a)) cadre.vars[a] = "";
	});
	return "";
};

INTEGREES.declare = INTEGREES.typeset = function(args, io){
	var global = false, tableau = false;
	args.forEach(function(a){
		if (/^[-+][a-zA-Z]+$/.test(a)){
			if (a.indexOf("g") > -1) global = true;
			if (a.charAt(0) === "-" && a.indexOf("a") > -1) tableau = true;
			return;
		}
		var m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=([\s\S]*)$/.exec(a);
		var nom = m ? m[1] : a;
		verifierNom(nom, "declare");
		var cadre = global ? null : cadreFonction();
		var valeur = m ? (m[2] ? Interpreteur.lire(nom) : "") + m[3] : (tableau ? [] : null);
		if (valeur === null){ if (cadre && !cadre.vars.hasOwnProperty(nom)) cadre.vars[nom] = ""; return; }
		if (cadre) cadre.vars[nom] = valeur;
		else Interpreteur.affecter(nom, valeur);
	});
	return "";
};
INTEGREES.readonly = function(args, io){ return INTEGREES.declare(args.filter(function(a){ return !/^-/.test(a); }), io); };

/* export : au prompt, c'est le sort du jeu ; dans un script ou une fonction, la variable reste à l'intérieur. */
INTEGREES["export"] = function(args, io){
	var noms = function(){ return args.filter(function(a){ return !/^-/.test(a); }).map(function(a){ return a.replace(/\+?=[\s\S]*$/, ""); }); };
	if (!Interpreteur.cadres.some(function(c){ return c.limite || c.fonction; }) || !state.knows("export")){
		var sortie = Shell.appeler("export", args, io);
		noms().forEach(function(n){ delete Interpreteur.nonExportees[n]; });
		return sortie;
	}
	args.forEach(function(a){
		if (/^-/.test(a)) return;
		var m = /^([A-Za-z_][A-Za-z0-9_]*)(\+?)=([\s\S]*)$/.exec(a);
		if (m) Interpreteur.affecter(m[1], (m[2] ? Interpreteur.lire(m[1]) : "") + m[3]);
		else verifierNom(a, "export");
	});
	noms().forEach(exporter);
	return "";
};

INTEGREES.shift = function(args, io){
	var n = args.length ? args[0] : "1";
	if (!/^\d+$/.test(n)) throw new ShellError("shift : « " + n + " » : il faut un nombre", 1);
	var pos = positionnels();
	if (+n > pos.length){ io.code = 1; return ""; }
	pos.splice(0, +n);
	return "";
};

INTEGREES.set = function(args, io){
	var o = optionsCourantes();
	var auPrompt = !Interpreteur.cadres.some(function(c){ return c.limite; });
	if (args.length === 0){
		var noms = {}, lignes = [];
		Object.keys(state.env).forEach(function(n){ noms[n] = true; });
		Interpreteur.cadres.forEach(function(c){ Object.keys(c.vars).forEach(function(n){ noms[n] = true; }); });
		Object.keys(noms).sort().forEach(function(n){ if (estDefinie(n)) lignes.push(n + "=" + citer(Interpreteur.lire(n))); });
		return lignes.join("\n");
	}
	var LETTRES = { e: "e", x: "x", u: "u" };
	var NOMS = { errexit: "e", xtrace: "x", nounset: "u", pipefail: "pipefail" };
	var poser = function(cle, actif){
		if (cle === "e" && actif && auPrompt){
			io.err(C.gris("(set -e ne sert que dans un script : au prompt, bash fermerait ton terminal à la première erreur. Mets-le en haut de ton script, après #!/bin/bash.)"));
			return;
		}
		o[cle] = actif;
	};
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--"){ remplacerPositionnels(args.slice(i + 1)); return ""; }
		if (a === "-o" || a === "+o"){
			var nom = args[++i];
			if (nom === undefined){
				return "errexit         " + (o.e ? "on" : "off") + "\nnounset         " + (o.u ? "on" : "off") +
					"\npipefail        " + (o.pipefail ? "on" : "off") + "\nxtrace          " + (o.x ? "on" : "off");
			}
			if (!NOMS[nom]) throw new ShellError("set : " + nom + " : nom d'option inconnu (errexit, nounset, pipefail, xtrace)", 2);
			poser(NOMS[nom], a === "-o");
			continue;
		}
		if (/^[-+][a-zA-Z]+$/.test(a)){
			for (var k = 1; k < a.length; k++){
				var lettre = a.charAt(k);
				if (!LETTRES[lettre]) throw new ShellError("set : -" + lettre + " : option inconnue ici (-e, -u, -x, -o pipefail)", 2);
				poser(LETTRES[lettre], a.charAt(0) === "-");
			}
			continue;
		}
		remplacerPositionnels(args.slice(i));
		return "";
	}
	return "";
};

function remplacerPositionnels(liste){
	var pos = positionnels();
	pos.length = 0;
	Array.prototype.push.apply(pos, liste);
}

INTEGREES.unset = function(args, io){
	var fonctions = false;
	args.forEach(function(a){
		if (a === "-f"){ fonctions = true; return; }
		if (a === "-v"){ fonctions = false; return; }
		if (fonctions){ supprimerFonction(a); return; }
		verifierNom(a.replace(/\[.*\]$/, ""), "unset");
		Interpreteur.supprimer(a);
	});
	return "";
};

/* source FICHIER (ou . FICHIER) : lit un script dans le shell en cours ; ses variables restent. */
INTEGREES.source = INTEGREES["."] = function(args, io){
	if (!args.length) throw new ShellError("source : quel script lire ? Utilisation : source FICHIER (ou . FICHIER)", 2);
	var trouve = Shell.objetLisible(args[0], io, "source");
	if (trouve.item.binaire) throw new ShellError("source : " + args[0] + " : impossible de lire un fichier binaire", 1);
	var texte = trouve.item.getText();
	if (lignesDe(texte).length > LIGNES_MAX_SCRIPT) throw new ShellError("source : " + args[0] + " : plus de " + LIGNES_MAX_SCRIPT + " lignes, c'est un roman.", 1);
	if (++Interpreteur.profondeur > Interpreteur.LIMITE_PROFONDEUR){
		Interpreteur.profondeur--;
		throw new LimiteAtteinte("bash : source : trop de fichiers lus les uns dans les autres (plus de " + Interpreteur.LIMITE_PROFONDEUR + ").");
	}
	var cadre = nouveauCadre({ source: true, positionnels: args.length > 1 ? args.slice(1) : null });
	var code = null;
	var sortie;
	try {
		sortie = avecFlux(io, function(){
			Interpreteur.cadres.push(cadre);
			try { code = executerTexte(texte, { prefixe: trouve.item.itemname + " : ligne ", tolerant: true }); }
			catch (e){ if (e instanceof SignalRetour) code = e.code; else throw e; }
			finally {
				var k = Interpreteur.cadres.lastIndexOf(cadre);
				if (k > -1) Interpreteur.cadres.splice(k, 1);
			}
		});
	} finally {
		Interpreteur.profondeur--;
	}
	io.code = code !== null ? code : (io.codeSignal || 0);
	return sortie;
};

INTEGREES["eval"] = function(args, io){
	var texte = args.join(" ");
	if (texte.trim() === "") return "";
	if (++Interpreteur.profondeur > Interpreteur.LIMITE_PROFONDEUR){
		Interpreteur.profondeur--;
		throw new LimiteAtteinte("bash : eval : trop d'eval emboîtés.");
	}
	var code = null, sortie;
	try {
		sortie = avecFlux(io, function(){ code = executerTexte(texte, {}); });
	} finally {
		Interpreteur.profondeur--;
	}
	io.code = code !== null ? code : (io.codeSignal || 0);
	return sortie;
};

INTEGREES.let = function(args, io){
	if (!args.length) throw new ShellError("let : quel calcul ? Exemple : let \"n = n + 1\"", 2);
	var v = 0;
	args.forEach(function(a){ v = Interpreteur.arith(a); });
	io.code = v !== 0 ? 0 : 1;
	return "";
};

INTEGREES.type = function(args, io){
	var lignes = [];
	args.forEach(function(nom){
		if (RESERVES.hasOwnProperty(nom)) lignes.push(nom + " est un mot-clé du shell");
		else if (state.alias.hasOwnProperty(nom)) lignes.push(nom + " est un alias vers « " + state.alias[nom] + " »");
		else if (trouverFonction(nom)) lignes.push(nom + " est une fonction");
		else if (INTEGREES.hasOwnProperty(nom)) lignes.push(nom + " est une primitive du shell");
		else if (Shell.sorts.hasOwnProperty(nom) && (state.knows(nom) || SORTS_DU_JEU.indexOf(nom) > -1)) lignes.push(nom + " est /usr/bin/" + nom);
		else { io.err("type : " + nom + " : introuvable"); io.code = 1; }
	});
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Lancer un texte                                                     */
/* ------------------------------------------------------------------ */

/* Remet l'interpréteur d'aplomb avant une nouvelle ligne tapée au prompt. */
function reinitialiser(){
	Interpreteur.compte = 0;
	Interpreteur.profondeur = 0;
	Interpreteur.boucles = 0;
	Interpreteur.conditionnel = 0;
	Interpreteur.cadres = [];
	Interpreteur.flux = [];
	Interpreteur.entrees = [];
	Interpreteur.enAlias = {};
	Interpreteur.signalEnAttente = null;
	Interpreteur.fondSignale = false;
}

/* Exécute fn ; au niveau le plus haut, le garde-fou et les sauts égarés s'arrêtent ici. */
function proteger(fn, siArret){
	var racine = Interpreteur.niveau === 0;
	if (racine) reinitialiser();
	Interpreteur.niveau++;
	try {
		return fn();
	} catch (e){
		if (!racine) throw e;
		if (e instanceof LimiteAtteinte){
			Interpreteur.flux = [];
			Interpreteur.ecran.erreur(e.message);
			jouerSon("erreur");
			Shell.statut = 1;
			return siArret;
		}
		if (estSignal(e)){
			Shell.statut = e.code || 0;
			return siArret;
		}
		throw e;
	} finally {
		Interpreteur.niveau--;
		if (racine){
			Interpreteur.ecran.vider();
			Interpreteur.cadres = [];
			Interpreteur.flux = [];
			Interpreteur.entrees = [];
		}
	}
}

/* Lit et lance un texte, une commande complète après l'autre (comme bash lit un script). */
function executerTexte(texte, opts){
	opts = opts || {};
	var a = new Analyseur(texte, 0);
	a.lex.tolerant = !!opts.tolerant;
	var code = 0;
	for (;;){
		var element;
		try {
			element = a.prochaine();
		} catch (e){
			if (e instanceof Incomplet) e = erreurFinDeFichier(e);
			if (!(e instanceof ShellError)) throw e;
			var message = e.message;
			if (opts.prefixe) message = opts.prefixe + ligneDe(texte, a.dernierePos) + " : " + message.replace(/^bash : /, "");
			Shell.ecranErreur(message);
			jouerSon("erreur");
			Shell.statut = 2;
			return 2;
		}
		if (element === null) break;
		code = executerElement(element);
	}
	return code;
}

/* Lance un texte comme s'il était tapé au prompt. Renvoie le statut. */
Interpreteur.executer = function(texte){
	return proteger(function(){ return executerTexte(texte, {}); }, 1);
};

/*
 * Lance un texte à part et rend ce qu'il a écrit : { code, sortie, erreurs }.
 * options.portee : "enfant" (défaut, ses variables restent à l'intérieur) ou "courante".
 * options.positionnels, options.nom0 : $1, $2... et $0.
 */
Interpreteur.capturer = function(texte, options){
	options = options || {};
	var erreurs = [], code = 0;
	var flux = new FluxCapture(function(t){ erreurs.push(t); });
	var racine = Interpreteur.niveau === 0;
	proteger(function(){
		Interpreteur.flux.push(flux);
		var cadre = options.portee === "courante" ? null : nouveauCadre({ limite: true, positionnels: (options.positionnels || []).slice(), nom0: options.nom0 || "bash",
			options: { e: false, x: false, u: false, pipefail: false } });
		if (cadre) Interpreteur.cadres.push(cadre);
		var memoire = memoriserLieu();
		try {
			code = executerTexte(texte, { tolerant: true });
		} catch (e){
			if (estSignal(e)) code = e.code || 0;
			// Le garde-fou, quand c'est cette capture qui a été lancée en premier : son message va dans ses erreurs.
			else if (e instanceof LimiteAtteinte && racine){ erreurs.push(e.message); code = 1; }
			else throw e;
		} finally {
			if (cadre){
				var k = Interpreteur.cadres.lastIndexOf(cadre);
				if (k > -1) Interpreteur.cadres.splice(k, 1);
				restaurerLieu(memoire);
			}
			var f = Interpreteur.flux.lastIndexOf(flux);
			if (f > -1) Interpreteur.flux.splice(f, 1);
		}
	}, 1);
	return { code: code, sortie: flux.texte.replace(/\n$/, ""), erreurs: erreurs.join("\n") };
};

/*
 * Ce que fait bash SCRIPT : le texte entier, dans sa propre portée (ses variables, ses fonctions,
 * son cd et ses options restent à l'intérieur), avec ses arguments ($0, $1...). Sa sortie normale
 * est rendue comme celle d'un sort ; ses erreurs partent par io.err.
 * options : { nom0, nomScript, positionnels, x, e, n } (bash -x, -e, -n).
 */
Interpreteur.lancerScript = function(texte, io, options){
	options = options || {};
	return proteger(function(){
		var cadre = nouveauCadre({ limite: true, script: true, positionnels: (options.positionnels || []).slice(), nom0: options.nom0 || "bash",
			options: { e: !!options.e, x: !!options.x, u: false, pipefail: false } });
		var prefixe = (options.nomScript || "bash") + " : ligne ";
		var memoire = memoriserLieu();
		var code = null;
		var sortie = avecEntree(io, function(){
			return avecFlux(io, function(){
				if (options.n){
					// bash -n : vérifier la syntaxe sans rien lancer
					try { Interpreteur.analyser(texte); code = 0; }
					catch (e){
						if (e instanceof Incomplet) e = erreurFinDeFichier(e);
						if (!(e instanceof ShellError)) throw e;
						Shell.ecranErreur(prefixe.replace(/ : ligne $/, "") + " : " + e.message.replace(/^bash : /, ""));
						code = 2;
					}
					return;
				}
				Interpreteur.cadres.push(cadre);
				var boucles = Interpreteur.boucles, conditionnel = Interpreteur.conditionnel;
				Interpreteur.boucles = 0;
				Interpreteur.conditionnel = 0;
				try {
					code = executerTexte(texte, { prefixe: prefixe, tolerant: true });
				} catch (e){
					if (e instanceof SignalSortie || e instanceof SignalRetour) code = e.code;
					else if (e instanceof SignalBoucle) code = 0;
					else throw e;
				} finally {
					var k = Interpreteur.cadres.lastIndexOf(cadre);
					if (k > -1) Interpreteur.cadres.splice(k, 1);
					Interpreteur.boucles = boucles;
					Interpreteur.conditionnel = conditionnel;
					restaurerLieu(memoire);
				}
			});
		});
		io.code = code !== null ? code : (io.codeSignal || 0);
		return sortie;
	}, "");
};

/* ------------------------------------------------------------------ */
/* Les sorts du scripteur : read, printf, seq, basename, dirname,      */
/* expr, sleep. Ils s'apprennent (aucun chapitre ne les enseigne       */
/* encore : le chapitre 4 les rangera dans son ORDRE_DES_SORTS).       */
/* ------------------------------------------------------------------ */

/* Coupe une ligne lue par read en n morceaux, selon IFS : le dernier reçoit le reste.
 * n = Infinity (read -a) : autant de morceaux qu'il y en a, sans en ajouter de vides. */
function decouperLecture(ligne, n, ifs){
	if (n === Infinity){
		var tous = decouperLecture(ligne, ligne.length + 1, ifs);
		while (tous.length && tous[tous.length - 1] === "") tous.pop();
		return tous;
	}
	if (ifs === "") return [ligne].concat(new Array(Math.max(0, n - 1)).fill(""));
	var blancs = ifs.replace(/[^ \t\n]/g, ""), autres = ifs.replace(/[ \t\n]/g, "");
	var estBlanc = function(c){ return blancs.indexOf(c) > -1; };
	var debut = 0, fin = ligne.length;
	while (debut < fin && estBlanc(ligne.charAt(debut))) debut++;
	while (fin > debut && estBlanc(ligne.charAt(fin - 1))) fin--;
	ligne = ligne.substring(debut, fin);
	var champs = [], i = 0;
	while (champs.length < n - 1 && i < ligne.length){
		var d = i;
		while (i < ligne.length && ifs.indexOf(ligne.charAt(i)) === -1) i++;
		champs.push(ligne.substring(d, i));
		while (i < ligne.length && estBlanc(ligne.charAt(i))) i++;
		if (i < ligne.length && autres.indexOf(ligne.charAt(i)) > -1){
			i++;
			while (i < ligne.length && estBlanc(ligne.charAt(i))) i++;
		}
	}
	if (i < ligne.length || champs.length < n) champs.push(ligne.substring(i));
	while (champs.length < n) champs.push("");
	return champs.slice(0, n);
}

Shell.sorts.read = function(args, io){
	var brut = false, invite = null, tableau = null, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-r"){ brut = true; continue; }
		if (a === "-p"){ invite = args[++i] || ""; continue; }
		if (a === "-a"){ tableau = args[++i]; continue; }
		if (a === "-s" || a === "-e"){ continue; }
		if (a === "-t" || a === "-n" || a === "-d"){ i++; continue; }
		if (/^-[rse]+$/.test(a)){ if (a.indexOf("r") > -1) brut = true; continue; }
		if (/^-/.test(a)) throw new ShellError("read : option inconnue « " + a + " ». Tape man read pour voir celles qui existent.", 2);
		noms.push(a);
	}
	if (tableau !== null) verifierNom(tableau, "read");
	noms.forEach(function(n){ verifierNom(n, "read"); });
	if (!noms.length && tableau === null) noms = ["REPLY"];
	var entree = null;
	if (io.stdin !== null && io.stdin !== undefined && !io.stdinHerite) entree = new Entree(io.stdin);
	else if (io.entree) entree = io.entree;
	var ligne = entree ? entree.lireLigne() : null;
	if (ligne !== null && !brut){
		// sans -r, une \ en fin de ligne continue la ligne, et \x devient x
		while (/\\$/.test(ligne)){
			var suite = entree.lireLigne();
			ligne = ligne.slice(0, -1) + (suite === null ? "" : suite);
			if (suite === null) break;
		}
		ligne = ligne.replace(/\\(.)/g, "$1");
	}
	if (ligne === null){
		noms.forEach(function(n){ Interpreteur.affecter(n, ""); });
		if (tableau !== null) Interpreteur.affecter(tableau, []);
		io.code = 1;
		if (!entree){
			if (invite !== null) io.err(invite);
			io.err(C.gris("(read : dans ce monde, read ne lit pas le clavier. Donne-lui une entrée : un tuyau (echo Ada | ...), " +
				"un objet (read ligne < fichier), un texte (read nom <<< \"Ada\"), ou une boucle while read ...; done < fichier.)"));
		}
		return "";
	}
	var ifs = valeurIFS();
	if (tableau !== null){
		Interpreteur.affecter(tableau, ifs === "" ? [ligne] : decouperLecture(ligne, Infinity, ifs));
		return "";
	}
	var champs = decouperLecture(ligne, noms.length, ifs);
	for (var k = 0; k < noms.length; k++) Interpreteur.affecter(noms[k], champs[k]);
	return "";
};

/* Un nombre pour printf : 42, -3, 0x1F, 'A (le code du caractère). */
function nombrePrintf(v, io, entierSeul){
	if (v === null || v === undefined || v === "") return 0;
	var t = String(v).trim();
	if (/^[+-]?\d+$/.test(t)) return parseInt(t, 10);
	if (/^[+-]?0[xX][0-9A-Fa-f]+$/.test(t)) return parseInt(t, 16);
	if (/^['"]./.test(t)) return t.charCodeAt(1);
	if (!entierSeul && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return parseFloat(t);
	io.err("printf : « " + v + " » : nombre invalide");
	io.code = 1;
	var p = parseFloat(t);
	return isNaN(p) ? 0 : (entierSeul ? Math.trunc(p) : p);
}

/*
 * Un nombre avec prec décimales, arrondi comme le printf de C : quand le nombre tombe pile entre deux
 * (2.5, 0.125), on va vers le chiffre pair (printf "%.0f" 2.5 donne 2). Sinon, comme toFixed.
 */
function fixe(n, prec){
	var echelle = Math.pow(10, prec), x = n * echelle;
	if (isFinite(x) && x - Math.floor(x) === 0.5 && x / echelle === n){
		var bas = Math.floor(x);
		return ((bas % 2 === 0 ? bas : bas + 1) / echelle).toFixed(prec);
	}
	return n.toFixed(prec);
}

function caler(texte, largeur, gauche, zeros){
	texte = String(texte);
	if (largeur === null || texte.length >= largeur) return texte;
	var manque = largeur - texte.length;
	if (gauche) return texte + new Array(manque + 1).join(" ");
	if (zeros){
		var signe = /^[+-]/.test(texte) ? texte.charAt(0) : "";
		return signe + new Array(manque + 1).join("0") + texte.substring(signe.length);
	}
	return new Array(manque + 1).join(" ") + texte;
}

/* printf : le format est relu tant qu'il reste des arguments. */
Interpreteur.formater = function(format, args, io){
	var morceaux = [], i = 0, re = /%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d*))?([a-zA-Z%])/g, m, dernier = 0;
	while ((m = re.exec(format)) !== null){
		if (m.index > dernier) morceaux.push({ texte: format.substring(dernier, m.index) });
		morceaux.push({ drapeaux: m[1], largeur: m[2], precision: m[3], conv: m[4], brut: m[0] });
		dernier = re.lastIndex;
	}
	if (dernier < format.length) morceaux.push({ texte: format.substring(dernier) });
	var sortie = "", k = 0, tours = 0;
	var prendre = function(){ return k < args.length ? args[k++] : null; };
	do {
		var avant = k;
		for (var j = 0; j < morceaux.length; j++){
			var p = morceaux[j];
			if (p.texte !== undefined){
				var e = echappements(p.texte);
				sortie += e.texte;
				if (e.arret) return sortie;
				continue;
			}
			var largeur = p.largeur === undefined ? null : (p.largeur === "*" ? Math.trunc(nombrePrintf(prendre(), io, true)) : parseInt(p.largeur, 10));
			var precision = p.precision === undefined ? null : (p.precision === "*" ? Math.trunc(nombrePrintf(prendre(), io, true)) : (parseInt(p.precision, 10) || 0));
			var gauche = p.drapeaux.indexOf("-") > -1 || (largeur !== null && largeur < 0);
			if (largeur !== null){ largeur = Math.min(Math.abs(largeur), 1000); }
			var zeros = p.drapeaux.indexOf("0") > -1 && !gauche;
			var plus = p.drapeaux.indexOf("+") > -1, espace = p.drapeaux.indexOf(" ") > -1;
			var signer = function(n, t){ return n >= 0 ? (plus ? "+" : (espace ? " " : "")) + t : t; };
			var v, n;
			switch (p.conv){
				case "%": sortie += "%"; break;
				case "s": v = prendre(); v = v === null ? "" : v; if (precision !== null) v = v.substring(0, precision); sortie += caler(v, largeur, gauche, false); break;
				case "b": v = echappements(prendre() || ""); sortie += caler(v.texte, largeur, gauche, false); if (v.arret) return sortie; break;
				case "q": sortie += caler(citer(prendre() || ""), largeur, gauche, false); break;
				case "c": sortie += caler((prendre() || "").charAt(0), largeur, gauche, false); break;
				case "d": case "i": case "u":
					n = Math.trunc(nombrePrintf(prendre(), io, true));
					v = String(Math.abs(n));
					if (precision !== null) while (v.length < precision) v = "0" + v;
					sortie += caler(signer(n, (n < 0 ? "-" : "") + v), largeur, gauche, zeros && precision === null);
					break;
				case "o": case "x": case "X":
					n = Math.trunc(nombrePrintf(prendre(), io, true));
					v = (n >>> 0).toString(p.conv === "o" ? 8 : 16);
					if (p.conv === "X") v = v.toUpperCase();
					if (p.drapeaux.indexOf("#") > -1 && n !== 0) v = (p.conv === "o" ? "0" : (p.conv === "x" ? "0x" : "0X")) + v;
					sortie += caler(v, largeur, gauche, zeros);
					break;
				case "f": case "F": case "e": case "E": case "g": case "G":
					n = nombrePrintf(prendre(), io, false);
					var prec = precision === null ? 6 : Math.min(precision, 50);
					if (p.conv === "f" || p.conv === "F") v = fixe(Math.abs(n), prec);
					else if (p.conv === "e" || p.conv === "E"){
						v = Math.abs(n).toExponential(prec).replace(/e([+-])(\d)$/, "e$10$2");
						if (p.conv === "E") v = v.toUpperCase();
					} else {
						v = String(parseFloat(Math.abs(n).toPrecision(prec || 1)));
						if (p.conv === "G") v = v.toUpperCase();
					}
					sortie += caler(signer(n, (n < 0 ? "-" : "") + v), largeur, gauche, zeros);
					break;
				default:
					throw new ShellError("printf : « %" + p.conv + " » : format inconnu (%s, %d, %f, %x, %c, %b, %%)", 1);
			}
		}
		if (++tours > 10000) break;
	} while (k < args.length && k > avant);
	return sortie;
};

Shell.sorts.printf = function(args, io){
	var cible = null;
	if (args[0] === "-v"){
		cible = args[1];
		if (cible === undefined) throw new ShellError("printf : -v attend un nom de variable", 2);
		verifierNom(cible, "printf");
		args = args.slice(2);
	}
	if (args[0] === "--") args = args.slice(1);
	if (!args.length) throw new ShellError("printf : il faut un format. Utilisation : printf FORMAT [ARGUMENTS...], par exemple printf \"%s\\n\" Ada", 2);
	var resultat = Interpreteur.formater(args[0], args.slice(1), io);
	if (cible !== null){ Interpreteur.affecter(cible, resultat); return ""; }
	if (resultat === "") return "";
	if (resultat.charAt(resultat.length - 1) === "\n") resultat = resultat.substring(0, resultat.length - 1);
	else io.sansFin = true;
	if (resultat === "") io.ligneVide = true;
	return resultat;
};

Shell.sorts.seq = function(args, io){
	var separateur = "\n", memeLargeur = false, nombres = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-s"){ separateur = echappements(args[++i] === undefined ? "" : args[i]).texte; continue; }
		if (/^-s./.test(a)){ separateur = echappements(a.substring(2)).texte; continue; }
		if (a === "-w"){ memeLargeur = true; continue; }
		if (/^-[a-zA-Z]/.test(a)) throw new ShellError("seq : option inconnue « " + a + " » (-s SÉPARATEUR, -w)", 1);
		if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(a)) throw new ShellError("seq : « " + a + " » n'est pas un nombre", 1);
		nombres.push(a);
	}
	if (nombres.length < 1 || nombres.length > 3) throw new ShellError("seq : utilisation : seq FIN, seq DÉBUT FIN, ou seq DÉBUT PAS FIN", 1);
	var debut = nombres.length > 1 ? parseFloat(nombres[0]) : 1;
	var pas = nombres.length === 3 ? parseFloat(nombres[1]) : 1;
	var fin = parseFloat(nombres[nombres.length - 1]);
	if (pas === 0) throw new ShellError("seq : un pas de 0 ne mènerait nulle part", 1);
	var decimales = Math.max.apply(null, nombres.map(function(n){ var d = n.split(".")[1]; return d ? d.length : 0; }));
	var combien = Math.floor((fin - debut) / pas + 1e-9) + 1;
	if (combien > 100000) throw new ShellError("seq : plus de 100 000 nombres, c'est trop pour ce monde", 1);
	var sortie = [];
	for (var k = 0; k < combien; k++) sortie.push((debut + k * pas).toFixed(decimales));
	if (memeLargeur){
		var largeur = Math.max.apply(null, sortie.map(function(s){ return s.replace("-", "").length; }));
		sortie = sortie.map(function(s){ var neg = s.charAt(0) === "-", c = neg ? s.substring(1) : s; while (c.length < largeur) c = "0" + c; return (neg ? "-" : "") + c; });
	}
	return sortie.join(separateur);
};

Shell.sorts.basename = function(args, io){
	var suffixe = null, tous = false, noms = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-a"){ tous = true; continue; }
		if (args[i] === "-s"){ suffixe = args[++i] || ""; tous = true; continue; }
		noms.push(args[i]);
	}
	if (!noms.length) throw new ShellError("basename : quel chemin ? Utilisation : basename CHEMIN [SUFFIXE]", 1);
	if (!tous && noms.length === 2){ suffixe = noms[1]; noms = [noms[0]]; }
	if (!tous && noms.length > 2) throw new ShellError("basename : un seul chemin (ou -a pour plusieurs)", 1);
	return noms.map(function(n){
		var t = n.replace(/\/+$/, "");
		if (t === "") return n === "" ? "" : "/";
		t = t.substring(t.lastIndexOf("/") + 1);
		if (suffixe && t !== suffixe && t.length > suffixe.length && t.slice(-suffixe.length) === suffixe) t = t.slice(0, -suffixe.length);
		return t;
	}).join("\n");
};

Shell.sorts.dirname = function(args, io){
	if (!args.length) throw new ShellError("dirname : quel chemin ? Utilisation : dirname CHEMIN", 1);
	return args.map(function(n){
		var t = n.replace(/\/+$/, "");
		if (t === "") return n === "" ? "." : "/";
		var k = t.lastIndexOf("/");
		if (k === -1) return ".";
		t = t.substring(0, k).replace(/\/+$/, "");
		return t === "" ? "/" : t;
	}).join("\n");
};

/* expr : l'ancien calculateur, un argument par nombre et par opérateur. */
Shell.sorts.expr = function(args, io){
	var i = 0;
	var conseil = "\n" + C.gris("(Chaque nombre et chaque opérateur est un argument à part, séparé par des espaces : expr 2 + 3. " +
		"Et * s'écrit \\* pour que le shell ne le prenne pas pour un joker. Plus simple : echo $(( 2 * 3 )).)");
	var erreur = function(m){ return new ShellError("expr : " + m + conseil, 2); };
	var estEntier = function(v){ return /^[+-]?\d+$/.test(String(v)); };
	var nombre = function(v){ if (!estEntier(v)) throw erreur("« " + v + " » n'est pas un nombre entier"); return parseInt(v, 10); };
	var ou, et, comparaison, addition, multiplication, correspondance, primaire;
	ou = function(){ var a = et(); while (args[i] === "|"){ i++; var b = et(); a = (a !== "" && a !== "0" && a !== 0) ? a : ((b !== "" && b !== "0" && b !== 0) ? b : 0); } return a; };
	et = function(){ var a = comparaison(); while (args[i] === "&"){ i++; var b = comparaison(); a = (a !== "" && a !== "0" && a !== 0 && b !== "" && b !== "0" && b !== 0) ? a : 0; } return a; };
	comparaison = function(){
		var a = addition();
		while (/^(=|==|!=|<|<=|>|>=)$/.test(args[i] || "")){
			var op = args[i++], b = addition();
			var x = estEntier(a) && estEntier(b) ? parseInt(a, 10) : String(a), y = estEntier(a) && estEntier(b) ? parseInt(b, 10) : String(b);
			a = ({ "=": x === y, "==": x === y, "!=": x !== y, "<": x < y, "<=": x <= y, ">": x > y, ">=": x >= y })[op] ? 1 : 0;
		}
		return a;
	};
	addition = function(){ var a = multiplication(); while (args[i] === "+" || args[i] === "-"){ var op = args[i++], b = multiplication(); a = op === "+" ? nombre(a) + nombre(b) : nombre(a) - nombre(b); } return a; };
	multiplication = function(){
		var a = correspondance();
		while (args[i] === "*" || args[i] === "/" || args[i] === "%"){
			var op = args[i++], b = nombre(correspondance());
			if (op !== "*" && b === 0) throw new ShellError("expr : division par zéro", 2);
			a = op === "*" ? nombre(a) * b : (op === "/" ? Math.trunc(nombre(a) / b) : nombre(a) % b);
		}
		return a;
	};
	correspondance = function(){
		var a = primaire();
		while (args[i] === ":"){
			i++;
			var motif = primaire(), re;
			try { re = new RegExp("^(?:" + String(motif).replace(/\\\(/g, "(").replace(/\\\)/g, ")") + ")"); } catch (e){ throw erreur("expression régulière invalide « " + motif + " »"); }
			var m = re.exec(String(a));
			a = m ? (m[1] !== undefined ? m[1] : m[0].length) : (/\\\(/.test(String(motif)) ? "" : 0);
		}
		return a;
	};
	primaire = function(){
		if (i >= args.length) throw erreur("il manque un argument");
		var a = args[i];
		if (a === "("){ i++; var v = ou(); if (args[i] !== ")") throw erreur("il manque « ) »"); i++; return v; }
		if (a === "length"){ i++; return String(primaire()).length; }
		if (a === "substr"){ i++; var s = String(primaire()), p = nombre(primaire()), l = nombre(primaire()); return p < 1 || l < 1 ? "" : s.substring(p - 1, p - 1 + l); }
		if (a === "index"){ i++; var t = String(primaire()), c = String(primaire()); for (var k = 0; k < t.length; k++) if (c.indexOf(t.charAt(k)) > -1) return k + 1; return 0; }
		i++;
		return a;
	};
	if (!args.length) throw erreur("il manque l'expression");
	var r = ou();
	if (i < args.length) throw erreur("argument inattendu « " + args[i] + " »");
	r = String(r);
	io.code = (r === "" || r === "0") ? 1 : 0;
	return r;
};

Shell.sorts.sleep = function(args, io){
	if (!args.length) throw new ShellError("sleep : combien de temps ? Utilisation : sleep SECONDES (sleep 2, sleep 0.5, sleep 1m)", 1);
	args.forEach(function(a){
		if (!/^\d+(\.\d+)?[smhd]?$/.test(a)) throw new ShellError("sleep : durée invalide « " + a + " » (par exemple 2, 0.5, 1m)", 1);
	});
	// Dans ce monde, le temps file tout seul : sleep rend la main aussitôt.
	return "";
};

/* Leurs pages de manuel sont dans CommandesCyber.js (avec les autres pages écrites par page()). */

/* Pour les tests et le chapitre 4 : le garde-fou et la saisie incomplète se reconnaissent de l'extérieur. */
Interpreteur.Incomplet = Incomplet;
Interpreteur.LimiteAtteinte = LimiteAtteinte;

})();
