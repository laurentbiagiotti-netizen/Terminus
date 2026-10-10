/**
 * Shell.js : l'interpreteur de sorts.
 *
 * Il decoupe la ligne tapee (guillemets, jokers * et ?, tuyaux |, redirections
 * > et >>, enchainements ; et &&), verifie que le joueur connait le sort, puis
 * le lance. Chaque sort recoit ses arguments et un objet "io" :
 *   io.stdin : ce que le sort precedent a envoye dans le tuyau (ou null)
 *   io.tty   : vrai si la sortie va a l'ecran (faux dans un tuyau ou une redirection)
 *   io.sudo  : vrai si le sort est lance avec sudo
 * Un sort renvoie son texte de sortie, ou leve une ShellError.
 */

var GameEvents = new EventTarget();

/* Couleurs ANSI, comme dans un vrai terminal. */
var C = (function(){
	function couleur(code){
		return function(texte){ return "\x1b[" + code + "m" + texte + "\x1b[0m"; };
	}
	return {
		gras: couleur("1"), rouge: couleur("31"), vert: couleur("32"), jaune: couleur("33"),
		bleu: couleur("1;34"), magenta: couleur("35"), cyan: couleur("36"), gris: couleur("90")
	};
})();

function sansAnsi(texte){
	return texte.replace(/\x1b\[[0-9;]*m/g, "");
}

function ShellError(message, code){
	this.message = message;
	this.code = code || 1;
}

var MOT_DE_PASSE_SUDO = "P1ngouin";
var PID_BASH = 1337;

var Shell = {
	sorts: {},
	historique: [],
	narration: [],
	lieu_precedent: null
};

/* Texte d'ambiance affiche apres la sortie du sort en cours. */
function say(texte){
	Shell.narration.push(texte);
}

/* Sorts toujours disponibles : ce sont des commandes du jeu, pas de Linux. */
var SORTS_DU_JEU = ["quetes", "recommencer", "sorts", "aide"];

/* Vraies commandes Linux absentes de ce monde : on le dit gentiment. */
var COMMANDES_REELLES = ["vi", "vim", "nano", "emacs", "apt", "apt-get", "yum", "dnf", "pacman", "ssh", "scp",
	"ping", "curl", "wget", "git", "python", "python3", "bash", "zsh", "sh", "top", "htop", "df", "du", "tar",
	"zip", "unzip", "gzip", "ln", "chown", "chgrp", "su", "passwd", "awk", "sed", "cut", "tr", "diff", "more",
	"which", "whereis", "locate", "alias", "export", "env", "date", "cal", "uname", "id", "who", "w", "free",
	"mount", "systemctl", "service", "ip", "ifconfig", "netstat", "ss", "nmap", "make", "gcc", "node", "docker",
	"reboot", "shutdown", "killall", "pkill", "xargs", "tee", "file", "stat", "basename", "dirname", "sleep"];

/* ------------------------------------------------------------------ */
/* Decoupage de la ligne                                               */
/* ------------------------------------------------------------------ */

Shell.decouper = function(ligne){
	var jetons = [];
	var i = 0, n = ligne.length;
	var mot = null;
	function commencer(){ if (mot === null) mot = { t: "mot", v: "", joker: false }; }
	function finir(){ if (mot !== null){ jetons.push(mot); mot = null; } }
	while (i < n){
		var c = ligne.charAt(i);
		if (c === " " || c === "\t"){ finir(); i++; continue; }
		if (c === "\"" || c === "'"){
			var guillemet = c;
			commencer();
			i++;
			while (i < n && ligne.charAt(i) !== guillemet){
				if (guillemet === "\"" && ligne.charAt(i) === "\\" && i + 1 < n) i++;
				mot.v += ligne.charAt(i);
				i++;
			}
			if (i >= n) throw new ShellError("Il manque un guillemet fermant : " + guillemet);
			i++;
			continue;
		}
		if (c === "\\" && i + 1 < n){ commencer(); mot.v += ligne.charAt(i + 1); i += 2; continue; }
		if (c === "|"){
			finir();
			if (ligne.charAt(i + 1) === "|") throw new ShellError("L'opérateur || n'a pas cours dans ce monde. Utilise | (tuyau), ; ou &&.");
			jetons.push({ t: "op", v: "|" });
			i++;
			continue;
		}
		if (c === ">"){
			finir();
			if (ligne.charAt(i + 1) === ">"){ jetons.push({ t: "op", v: ">>" }); i += 2; }
			else { jetons.push({ t: "op", v: ">" }); i++; }
			continue;
		}
		if (c === ";"){ finir(); jetons.push({ t: "op", v: ";" }); i++; continue; }
		if (c === "&" && ligne.charAt(i + 1) === "&"){ finir(); jetons.push({ t: "op", v: "&&" }); i += 2; continue; }
		commencer();
		if (c === "*" || c === "?") mot.joker = true;
		mot.v += c;
		i++;
	}
	finir();
	return jetons;
};

function jokerVersRegExp(motif){
	var source = "";
	for (var i = 0; i < motif.length; i++){
		var c = motif.charAt(i);
		if (c === "*") source += ".*";
		else if (c === "?") source += ".";
		else source += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	}
	return new RegExp("^" + source + "$");
}

/* Remplace un mot contenant * ou ? par la liste des noms qui correspondent. */
Shell.developper = function(mot){
	var coupe = mot.lastIndexOf("/");
	var base = coupe > -1 ? mot.substring(0, coupe) : null;
	var motif = coupe > -1 ? mot.substring(coupe + 1) : mot;
	var lieu = current_room;
	if (base !== null){
		try {
			lieu = Shell.chercher(base === "" ? "~" : base, { sudo: false }, "").node;
		} catch (e){
			return [mot];
		}
	}
	if (!(lieu instanceof Room) || !Shell.bit(lieu, "r", null)) return [mot];
	var re = jokerVersRegExp(motif);
	var noms = lieu.childStringArray().concat(lieu.itemStringArray());
	var trouves = [];
	for (var i = 0; i < noms.length; i++){
		if (noms[i].charAt(0) === "." && motif.charAt(0) !== ".") continue;
		if (re.test(noms[i])) trouves.push(base === null ? noms[i] : base + "/" + noms[i]);
	}
	return trouves.length ? trouves : [mot];
};

/* ------------------------------------------------------------------ */
/* Chemins et permissions                                              */
/* ------------------------------------------------------------------ */

/* Le joueur a-t-il le droit r, w ou x sur ce lieu ou cet objet ? */
Shell.bit = function(noeud, lettre, io){
	if (io && io.sudo) return true;
	var rang = "rwx".indexOf(lettre);
	var base = noeud.owner === JOUEUR ? 0 : 6;
	return noeud.mode.charAt(base + rang) !== "-";
};

Shell.introuvable = function(cmd, nom, lieu){
	var message = (cmd ? cmd + " : " : "") + "« " + nom + " » : aucun lieu ni objet de ce nom ici";
	var proche = lieu ? lieu.getNodeIgnoringCase(nom) : null;
	if (proche){
		message += "\n" + C.gris("(Sous Linux, majuscules et minuscules comptent : il existe « " + proche.toString() + " ».)");
	}
	return message;
};

/* Peut-on agir sur le contenu de ce lieu sans y entrer (une boite, une cage) ? */
Shell.peutFouiller = function(lieu){
	return lieu.commands.indexOf("cd") > -1 || lieu.atteignable === true;
};

Shell.verifierTraversee = function(lieu, io, cmd){
	if (lieu.commands.indexOf("cd") === -1 && !(lieu.atteignable && cmd !== "cd")){
		throw new ShellError(lieu.cmd_text["cd"] || "Impossible d'entrer ici.");
	}
	if (!Shell.bit(lieu, "x", io)){
		throw new ShellError((cmd ? cmd + " : " : "") + lieu.room_name + " : Permission non accordée" +
			(lieu.deny_text ? "\n" + C.gris(lieu.deny_text) : ""));
	}
};

Shell.pas = function(lieu, nom, io, cmd){
	if (nom === ".") return lieu;
	if (nom === "..") return lieu.parents[0] || lieu;
	var suivant = lieu.getNode(nom);
	if (suivant === null) throw new ShellError(Shell.introuvable(cmd, nom, lieu));
	if (!(suivant instanceof Room)) throw new ShellError((cmd ? cmd + " : " : "") + nom + " : ce n'est pas un lieu");
	Shell.verifierTraversee(suivant, io, cmd);
	return suivant;
};

/**
 * Suit un chemin (relatif, ou commencant par ~) et renvoie
 * { dir: le lieu qui contient la cible, name: son nom, node: la cible ou null }.
 */
Shell.chercher = function(chemin, io, cmd){
	if (chemin === "") throw new ShellError((cmd ? cmd + " : " : "") + "chemin vide");
	if (chemin.charAt(0) === "/"){
		throw new ShellError((cmd ? cmd + " : " : "") + "dans ce monde, tous les chemins partent de ta Maison.\n" +
			"Écris ~ pour la désigner (par exemple ~/ForetOuest) plutôt que de commencer par / .");
	}
	var lieu = current_room;
	var morceaux = chemin.split("/");
	if (morceaux[0] === "~"){
		lieu = Home;
		morceaux.shift();
	}
	var propres = [];
	for (var i = 0; i < morceaux.length; i++){
		if (morceaux[i] !== "") propres.push(morceaux[i]);
	}
	if (propres.length === 0){
		return { dir: lieu.parents[0] || lieu, name: lieu.room_name, node: lieu };
	}
	for (var j = 0; j < propres.length - 1; j++){
		lieu = Shell.pas(lieu, propres[j], io, cmd);
	}
	var dernier = propres[propres.length - 1];
	var noeud;
	if (dernier === ".") noeud = lieu;
	else if (dernier === "..") noeud = lieu.parents[0] || lieu;
	else noeud = lieu.getNode(dernier);
	return { dir: lieu, name: dernier, node: noeud };
};

Shell.nomValide = function(nom, cmd){
	if (nom === "" || nom === "." || nom === ".."){
		throw new ShellError(cmd + " : « " + nom + " » n'est pas un nom utilisable");
	}
	if (nom.length > 40) throw new ShellError(cmd + " : ce nom est bien trop long");
	if (/[\x00-\x1f<>]/.test(nom)) throw new ShellError(cmd + " : ce nom contient des signes interdits");
};

/* Separe les options (-a, -la, -n 5...) du reste des arguments. */
function lireOptions(args, connues, cmd, avecValeur){
	var opts = {}, reste = [];
	avecValeur = avecValeur || "";
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--"){ reste = reste.concat(args.slice(i + 1)); break; }
		if (a.length > 1 && a.charAt(0) === "-" && !/^-\d+$/.test(a)){
			for (var k = 1; k < a.length; k++){
				var lettre = a.charAt(k);
				if (connues.indexOf(lettre) === -1){
					throw new ShellError(cmd + " : option inconnue « -" + lettre + " ». Tape man " + cmd + " pour voir celles qui existent.");
				}
				if (avecValeur.indexOf(lettre) > -1){
					var valeur = a.substring(k + 1);
					if (valeur === ""){ i++; valeur = args[i]; }
					if (valeur === undefined) throw new ShellError(cmd + " : l'option -" + lettre + " attend une valeur");
					opts[lettre] = valeur;
					break;
				}
				opts[lettre] = true;
			}
		} else {
			reste.push(a);
		}
	}
	return { opts: opts, reste: reste };
}

function lignesDe(texte){
	if (texte === "") return [];
	var lignes = texte.split("\n");
	if (lignes[lignes.length - 1] === "") lignes.pop();
	return lignes;
}

function completerDroite(texte, largeur){
	texte = String(texte);
	while (texte.length < largeur) texte += " ";
	return texte;
}

function completerGauche(texte, largeur){
	texte = String(texte);
	while (texte.length < largeur) texte = " " + texte;
	return texte;
}

/* ------------------------------------------------------------------ */
/* Se deplacer et regarder                                             */
/* ------------------------------------------------------------------ */

var enterRoom = function(new_room){
	montrerImage("./static/img/none.gif", ""); //Always show blank image when moving into a room
	if (new_room !== current_room) Shell.lieu_precedent = current_room;
	var ancien = current_room;
	current_room = new_room;
	state.setCurrentRoom(current_room);
	GameEvents.fire({ type: "enter", room: new_room, from: ancien });
};

Shell.sorts.cd = function(args, io){
	if (io.sudo){
		throw new ShellError("sudo : cd : commande introuvable\n" +
			C.gris("(Piège classique : cd n'est pas un programme mais un sort intégré au terminal, sudo ne peut donc pas le lancer.\n" +
			"Avec les pleins pouvoirs on regarde de loin : sudo ls LIEU, sudo cat LIEU/OBJET.)"));
	}
	if (args.length > 1) throw new ShellError("cd : tu ne peux pas aller à plusieurs endroits à la fois.");
	if (args.length === 0 || args[0] === "~"){
		enterRoom(Home);
		return "Te voilà de retour à la Maison !";
	}
	if (args[0] === "-"){
		if (!Shell.lieu_precedent) throw new ShellError("cd : tu n'as encore quitté aucun lieu.");
		enterRoom(Shell.lieu_precedent);
		return "Tu es de retour dans " + current_room.toString() + ". " + current_room.intro_text;
	}
	var r = Shell.chercher(args[0], io, "cd");
	if (r.node === null) throw new ShellError(Shell.introuvable("cd", r.name, r.dir));
	if (!(r.node instanceof Room)){
		throw new ShellError("cd : " + r.name + " : ce n'est pas un lieu. Pour regarder un objet ou parler à quelqu'un : less " + r.name);
	}
	// Revenir sur ses pas est toujours permis ; entrer quelque part demande le droit de traverser.
	if (r.name !== ".." && r.name !== "." && r.node !== current_room) Shell.verifierTraversee(r.node, io, "cd");
	enterRoom(r.node);
	return "Tu es maintenant dans " + current_room.toString() + ". " + current_room.intro_text;
};

Shell.ligneLongue = function(noeud, nom, io){
	var estLieu = noeud instanceof Room;
	var taille = estLieu ? (noeud.children.length + noeud.items.length) : noeud.getText().length;
	var affiche = nom || noeud.toString();
	if (estLieu) affiche = io.tty ? C.bleu(affiche + "/") : affiche + "/";
	return (estLieu ? "d" : "-") + noeud.mode + "  " + completerDroite(noeud.owner, 9) + " " +
		completerGauche(taille, 6) + "  " + affiche;
};

Shell.listerLieu = function(lieu, opts, io){
	var lieux = [], objets = [], i;
	for (i = 0; i < lieu.children.length; i++){
		if (opts.a || !lieu.children[i].isHidden()) lieux.push(lieu.children[i]);
	}
	for (i = 0; i < lieu.items.length; i++){
		if (opts.a || !lieu.items[i].isHidden()) objets.push(lieu.items[i]);
	}
	var lignes = [];
	if (opts.l){
		if (opts.a){
			lignes.push(Shell.ligneLongue(lieu, ".", io));
			lignes.push(Shell.ligneLongue(lieu.parents[0] || lieu, "..", io));
		}
		for (i = 0; i < lieux.length; i++) lignes.push(Shell.ligneLongue(lieux[i], null, io));
		for (i = 0; i < objets.length; i++) lignes.push(Shell.ligneLongue(objets[i], null, io));
		return lignes.join("\n");
	}
	if (!io.tty){
		if (opts.a){ lignes.push("."); lignes.push(".."); }
		for (i = 0; i < lieux.length; i++) lignes.push(lieux[i].room_name);
		for (i = 0; i < objets.length; i++) lignes.push(objets[i].itemname);
		return lignes.join("\n");
	}
	lignes.push(C.gras("Lieux :"));
	if (opts.a){
		lignes.push("  " + C.bleu("./") + C.gris("   (ici même)"));
		lignes.push("  " + C.bleu("../") + C.gris("  (le lieu d'où l'on vient)"));
	}
	for (i = 0; i < lieux.length; i++) lignes.push("  " + C.bleu(lieux[i].room_name + "/"));
	if (lieux.length === 0 && !opts.a) lignes.push(C.gris("  (aucun)"));
	if (objets.length > 0){
		lignes.push(C.gras("Objets :"));
		for (i = 0; i < objets.length; i++) lignes.push("  " + objets[i].itemname);
	}
	return lignes.join("\n");
};

Shell.sorts.ls = function(args, io){
	var p = lireOptions(args.filter(function(a){ return a !== "-1"; }), "alhAF", "ls");
	if (p.opts.A) p.opts.a = true;
	var cibles = p.reste.length ? p.reste : ["."];
	var blocs = [];
	for (var i = 0; i < cibles.length; i++){
		var r = Shell.chercher(cibles[i], io, "ls");
		if (r.node === null) throw new ShellError(Shell.introuvable("ls", r.name, r.dir));
		if (r.node instanceof Room){
			var lieu = r.node;
			if (!Shell.bit(lieu, "r", io)){
				throw new ShellError("ls : impossible d'ouvrir le lieu « " + lieu.room_name + " » : Permission non accordée" +
					(lieu.deny_text ? "\n" + C.gris(lieu.deny_text) : ""));
			}
			blocs.push((cibles.length > 1 ? lieu.room_name + " :\n" : "") + Shell.listerLieu(lieu, p.opts, io));
			if (lieu === current_room){
				montrerImage(lieu.room_pic, lieu.room_name); // Display image of room
				if (io.tty && lieu.cmd_text["ls"]) blocs.push(lieu.cmd_text["ls"]);
			}
			GameEvents.fire({ type: "ls", room: lieu, all: !!p.opts.a, long: !!p.opts.l });
		} else {
			blocs.push(p.opts.l ? Shell.ligneLongue(r.node, null, io) : r.node.itemname);
		}
	}
	return blocs.join("\n");
};

Shell.sorts.pwd = function(args, io){
	montrerImage(current_room.room_pic, current_room.room_name);
	return current_room.path();
};

/* ------------------------------------------------------------------ */
/* Lire                                                                */
/* ------------------------------------------------------------------ */

/* Trouve un objet lisible, ou leve l'erreur qui convient. */
Shell.objetLisible = function(chemin, io, cmd){
	var r = Shell.chercher(chemin, io, cmd);
	if (r.node === null) throw new ShellError(Shell.introuvable(cmd, r.name, r.dir));
	if (r.node instanceof Room){
		throw new ShellError(cmd + " : " + r.name + " : c'est un lieu (un répertoire). On y entre avec cd, on le regarde avec ls.");
	}
	if (!Shell.bit(r.node, "r", io)){
		throw new ShellError(cmd + " : " + r.name + " : Permission non accordée");
	}
	return { item: r.node, room: r.dir };
};

/* Ce qui se passe quand le joueur a effectivement lu (une partie d')un objet. */
Shell.apresLecture = function(trouve, texte, cmd, io){
	var item = trouve.item;
	if (cmd === "less" || cmd === "cat" || cmd === "head" || cmd === "tail"){
		montrerImage(item.picturename, item.itemname); // Display image of item
		for (var i = 0; i < item.teaches.length; i++) state.learn(item.teaches[i]);
		for (var j = 0; j < item.reveals.length; j++) state.discover(item.reveals[j]);
	}
	GameEvents.fire({ type: "read", item: item, room: trouve.room, cmd: cmd, text: texte, sudo: !!io.sudo });
};

var PAGE_LESS = 28;

Shell.sorts.less = function(args, io){
	var p = lireOptions(args, "N", "less");
	var texte, trouve = null;
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("less : quel objet veux-tu regarder ? Utilisation : less OBJET");
		texte = io.stdin;
	} else {
		if (p.reste.length > 1) throw new ShellError("less : un seul objet à la fois. (Pour en lire plusieurs d'un coup, il existe cat.)");
		trouve = Shell.objetLisible(p.reste[0], io, "less");
		texte = trouve.item.getText();
	}
	var lignes = lignesDe(texte);
	var affiche = texte;
	if (io.tty && lignes.length > PAGE_LESS + 12){
		affiche = lignes.slice(0, PAGE_LESS).join("\n");
		if (trouve) Shell.apresLecture(trouve, affiche, "less", io);
		return affiche + "\n" + C.gris("-- Fin de la première page. Ce texte compte " + lignes.length +
			" lignes : c'est trop pour tout dérouler ici.\n-- Les mages lisent les longs textes par morceaux (head, tail) ou y cherchent un mot (grep).");
	}
	if (trouve) Shell.apresLecture(trouve, affiche, "less", io);
	return affiche === "" ? C.gris("(vide)") : affiche;
};

Shell.sorts.cat = function(args, io){
	var p = lireOptions(args, "n", "cat");
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("cat : donne-moi au moins un objet à lire. Utilisation : cat OBJET...");
		return io.stdin;
	}
	var textes = [];
	for (var i = 0; i < p.reste.length; i++){
		var trouve = Shell.objetLisible(p.reste[i], io, "cat");
		var texte = trouve.item.getText();
		Shell.apresLecture(trouve, texte, "cat", io);
		textes.push(texte.replace(/\n$/, ""));
	}
	var tout = textes.join("\n");
	if (p.opts.n){
		var lignes = lignesDe(tout);
		for (var k = 0; k < lignes.length; k++) lignes[k] = completerGauche(k + 1, 6) + "  " + lignes[k];
		tout = lignes.join("\n");
	}
	return tout;
};

function debutOuFin(cmd){
	return function(args, io){
		var nombre = 10;
		var fichiers = [];
		for (var i = 0; i < args.length; i++){
			var a = args[i];
			if (a === "-n"){
				i++;
				if (args[i] === undefined || !/^\d+$/.test(args[i])) throw new ShellError(cmd + " : -n attend un nombre de lignes, par exemple : " + cmd + " -n 3 OBJET");
				nombre = parseInt(args[i], 10);
			} else if (/^-n\d+$/.test(a)){
				nombre = parseInt(a.substring(2), 10);
			} else if (/^-\d+$/.test(a)){
				nombre = parseInt(a.substring(1), 10);
			} else if (a.length > 1 && a.charAt(0) === "-"){
				throw new ShellError(cmd + " : option inconnue « " + a + " ». Utilisation : " + cmd + " [-n NOMBRE] OBJET");
			} else {
				fichiers.push(a);
			}
		}
		function couper(texte){
			var lignes = lignesDe(texte);
			return (cmd === "head" ? lignes.slice(0, nombre) : (nombre === 0 ? [] : lignes.slice(-nombre))).join("\n");
		}
		if (fichiers.length === 0){
			if (io.stdin === null) throw new ShellError(cmd + " : de quel objet veux-tu lire " + (cmd === "head" ? "le début" : "la fin") + " ? Utilisation : " + cmd + " [-n NOMBRE] OBJET");
			return couper(io.stdin);
		}
		var blocs = [];
		for (var k = 0; k < fichiers.length; k++){
			var trouve = Shell.objetLisible(fichiers[k], io, cmd);
			var extrait = couper(trouve.item.getText());
			Shell.apresLecture(trouve, extrait, cmd, io);
			blocs.push((fichiers.length > 1 ? "==> " + trouve.item.itemname + " <==\n" : "") + extrait);
		}
		return blocs.join("\n");
	};
}
Shell.sorts.head = debutOuFin("head");
Shell.sorts.tail = debutOuFin("tail");

Shell.sorts.wc = function(args, io){
	var p = lireOptions(args, "lwcm", "wc");
	function compter(texte){
		var mots = texte.trim() === "" ? 0 : texte.trim().split(/\s+/).length;
		return { l: lignesDe(texte).length, w: mots, c: texte.length };
	}
	function formater(n, nom){
		var colonnes = [];
		var tout = !p.opts.l && !p.opts.w && !p.opts.c && !p.opts.m;
		if (tout || p.opts.l) colonnes.push(n.l);
		if (tout || p.opts.w) colonnes.push(n.w);
		if (tout || p.opts.c || p.opts.m) colonnes.push(n.c);
		if (colonnes.length === 1) return colonnes[0] + (nom ? " " + nom : "");
		for (var i = 0; i < colonnes.length; i++) colonnes[i] = completerGauche(colonnes[i], 6);
		return colonnes.join(" ") + (nom ? " " + nom : "");
	}
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("wc : que veux-tu compter ? Utilisation : wc [-l] [-w] [-c] OBJET");
		return formater(compter(io.stdin), "");
	}
	var lignes = [], total = { l: 0, w: 0, c: 0 };
	for (var i = 0; i < p.reste.length; i++){
		var trouve = Shell.objetLisible(p.reste[i], io, "wc");
		var n = compter(trouve.item.getText());
		total.l += n.l; total.w += n.w; total.c += n.c;
		lignes.push(formater(n, trouve.item.itemname));
		Shell.apresLecture(trouve, "", "wc", io);
	}
	if (p.reste.length > 1) lignes.push(formater(total, "total"));
	if (io.tty && !p.opts.l && !p.opts.w && !p.opts.c && !p.opts.m){
		lignes.push(C.gris("(dans l'ordre : lignes, mots, caractères)"));
	}
	return lignes.join("\n");
};

Shell.sorts.grep = function(args, io){
	var p = lireOptions(args, "invcrRlE", "grep");
	if (p.opts.R) p.opts.r = true;
	if (p.reste.length === 0) throw new ShellError("grep : que cherches-tu ? Utilisation : grep MOT OBJET");
	var motif = p.reste[0];
	var fichiers = p.reste.slice(1);
	var re;
	try {
		re = new RegExp(motif, p.opts.i ? "gi" : "g");
	} catch (e){
		re = new RegExp(motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), p.opts.i ? "gi" : "g");
	}
	function filtrer(texte, prefixe){
		var lignes = lignesDe(texte), gardees = [];
		for (var i = 0; i < lignes.length; i++){
			re.lastIndex = 0;
			var correspond = re.test(lignes[i]);
			if (p.opts.v) correspond = !correspond;
			if (!correspond) continue;
			var ligne = lignes[i];
			if (io.tty && !p.opts.v){
				re.lastIndex = 0;
				ligne = ligne.replace(re, function(m){ return m === "" ? m : C.rouge(C.gras(m)); });
			}
			if (p.opts.n) ligne = (io.tty ? C.vert(String(i + 1)) : String(i + 1)) + ":" + ligne;
			gardees.push({ brut: lignes[i], affiche: prefixe + ligne });
		}
		return gardees;
	}
	if (fichiers.length === 0 && !p.opts.r){
		if (io.stdin === null) throw new ShellError("grep : dans quoi dois-je chercher « " + motif + " » ? Utilisation : grep MOT OBJET");
		var gardees = filtrer(io.stdin, "");
		if (p.opts.c) return String(gardees.length);
		return gardees.map(function(g){ return g.affiche; }).join("\n");
	}
	if (fichiers.length === 0) fichiers = ["."];

	// Rassemble les objets a fouiller, en descendant dans les lieux si -r.
	var cibles = [], erreurs = [];
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
	for (var f = 0; f < fichiers.length; f++){
		var r = Shell.chercher(fichiers[f], io, "grep");
		if (r.node === null){ erreurs.push(Shell.introuvable("grep", r.name, r.dir)); continue; }
		if (r.node instanceof Room){
			if (!p.opts.r){
				erreurs.push("grep : " + fichiers[f] + " : c'est un lieu. Pour fouiller tout ce qu'il contient : grep -r " + motif + " " + fichiers[f]);
				continue;
			}
			if (!Shell.bit(r.node, "r", io)){ erreurs.push("grep : " + fichiers[f] + " : Permission non accordée"); continue; }
			var prefixe = fichiers[f] === "." ? "" : fichiers[f].replace(/\/+$/, "") + "/";
			ajouterLieu(r.node, prefixe, 0);
		} else {
			if (!Shell.bit(r.node, "r", io)){ erreurs.push("grep : " + fichiers[f] + " : Permission non accordée"); continue; }
			cibles.push({ item: r.node, room: r.dir, nom: fichiers[f] });
		}
	}
	var plusieurs = cibles.length > 1 || p.opts.r;
	var sortie = [];
	for (var c = 0; c < cibles.length; c++){
		var cible = cibles[c];
		var etiquette = plusieurs ? (io.tty ? C.magenta(cible.nom) : cible.nom) + ":" : "";
		var trouvees = filtrer(cible.item.getText(), p.opts.c || p.opts.l ? "" : etiquette);
		if (p.opts.l){
			if (trouvees.length) sortie.push(cible.nom);
		} else if (p.opts.c){
			sortie.push(etiquette + trouvees.length);
		} else {
			for (var t = 0; t < trouvees.length; t++) sortie.push(trouvees[t].affiche);
		}
		if (trouvees.length){
			Shell.apresLecture({ item: cible.item, room: cible.room },
				trouvees.map(function(g){ return g.brut; }).join("\n"), "grep", io);
		}
	}
	GameEvents.fire({ type: "grep", pattern: motif, count: sortie.length });
	return erreurs.concat(sortie).join("\n");
};

Shell.sorts.sort = function(args, io){
	var p = lireOptions(args, "rnuf", "sort");
	var texte;
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("sort : que dois-je trier ? Utilisation : sort [-r] [-n] OBJET");
		texte = io.stdin;
	} else {
		var textes = [];
		for (var i = 0; i < p.reste.length; i++){
			var trouve = Shell.objetLisible(p.reste[i], io, "sort");
			textes.push(trouve.item.getText().replace(/\n$/, ""));
			Shell.apresLecture(trouve, "", "sort", io);
		}
		texte = textes.join("\n");
	}
	var lignes = lignesDe(texte);
	if (p.opts.n){
		lignes.sort(function(a, b){
			var x = parseFloat(a), y = parseFloat(b);
			if (isNaN(x)) x = 0;
			if (isNaN(y)) y = 0;
			return x - y || (a < b ? -1 : a > b ? 1 : 0);
		});
	} else {
		lignes.sort(function(a, b){
			if (p.opts.f){ a = a.toLowerCase(); b = b.toLowerCase(); }
			return a < b ? -1 : a > b ? 1 : 0;
		});
	}
	if (p.opts.r) lignes.reverse();
	if (p.opts.u){
		lignes = lignes.filter(function(l, i){ return i === 0 || l !== lignes[i - 1]; });
	}
	return lignes.join("\n");
};

Shell.sorts.uniq = function(args, io){
	var p = lireOptions(args, "cdu", "uniq");
	var texte;
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("uniq : de quoi dois-je retirer les doublons ? Utilisation : sort OBJET | uniq");
		texte = io.stdin;
	} else {
		var trouve = Shell.objetLisible(p.reste[0], io, "uniq");
		texte = trouve.item.getText();
	}
	var lignes = lignesDe(texte), groupes = [];
	for (var i = 0; i < lignes.length; i++){
		if (groupes.length && groupes[groupes.length - 1].ligne === lignes[i]) groupes[groupes.length - 1].n++;
		else groupes.push({ ligne: lignes[i], n: 1 });
	}
	var sortie = [];
	for (var g = 0; g < groupes.length; g++){
		if (p.opts.d && groupes[g].n < 2) continue;
		if (p.opts.u && groupes[g].n > 1) continue;
		sortie.push(p.opts.c ? completerGauche(groupes[g].n, 7) + " " + groupes[g].ligne : groupes[g].ligne);
	}
	return sortie.join("\n");
};

Shell.sorts.echo = function(args, io){
	if (args[0] === "-n" || args[0] === "-e") args = args.slice(1);
	return args.join(" ");
};

/* ------------------------------------------------------------------ */
/* Agir sur le monde                                                   */
/* ------------------------------------------------------------------ */

Shell.sorts.mv = function(args, io){
	var p = lireOptions(args, "fivn", "mv");
	var a = p.reste;
	if (a.length < 2) throw new ShellError("mv : il faut dire quoi déplacer, puis où. Utilisation : mv OBJET DESTINATION");
	var dest = Shell.chercher(a[a.length - 1], io, "mv");
	var sources = a.slice(0, -1);
	var versLieu = dest.node instanceof Room;
	if (!versLieu && sources.length > 1){
		throw new ShellError("mv : pour déplacer plusieurs objets d'un coup, la destination doit être un lieu qui existe.");
	}
	if (!versLieu && dest.node !== null){
		throw new ShellError("mv : « " + dest.name + " » existe déjà, et je refuse de l'écraser.");
	}
	var messages = [];
	for (var i = 0; i < sources.length; i++){
		var r;
		try {
			r = Shell.chercher(sources[i], io, "mv");
		} catch (e){
			if (e instanceof ShellError){ messages.push(e.message); continue; }
			throw e;
		}
		if (r.node === null){ messages.push(Shell.introuvable("mv", r.name, r.dir)); continue; }
		if (r.node instanceof Room){
			messages.push("mv : « " + r.name + " » est un lieu. Déplacer un lieu entier ? Même les archimages n'osent pas.");
			continue;
		}
		var item = r.node;
		if (!(item.allows("mv") || item.owner === JOUEUR)){
			messages.push(item.cmd_text["mv"] || (item.person ?
				"On ne déplace pas " + item.itemname + " comme un meuble." :
				"mv : impossible de déplacer « " + item.itemname + " » : cet objet ne t'appartient pas."));
			continue;
		}
		var cible = versLieu ? dest.node : dest.dir;
		var nouveauNom = versLieu ? item.itemname : dest.name;
		if (cible === r.dir && nouveauNom === item.itemname){
			messages.push("mv : « " + item.itemname + " » est déjà là.");
			continue;
		}
		var occupant = cible.getNode(nouveauNom);
		if (occupant !== null && occupant !== item){
			messages.push("mv : il y a déjà quelque chose qui s'appelle « " + nouveauNom + " » dans " + cible.room_name + ".");
			continue;
		}
		if (!versLieu) Shell.nomValide(nouveauNom, "mv");
		var ancienNom = item.itemname;
		r.dir.removeItem(item);
		item.itemname = nouveauNom;
		cible.addItem(item);
		if (item.allows("mv") && item.cmd_text["mv"]) messages.push(item.cmd_text["mv"]);
		else if (cible === r.dir) messages.push("Tu as renommé " + ancienNom + " en " + nouveauNom + ".");
		else messages.push("Tu as déplacé " + ancienNom + " vers " + cible.room_name + "." +
			(nouveauNom !== ancienNom ? " Il s'appelle désormais " + nouveauNom + "." : ""));
		GameEvents.fire({ type: "mv", item: item, from: r.dir, to: cible, oldName: ancienNom });
	}
	return messages.join("\n");
};

/* Le lieu courant est-il ce lieu, ou un lieu contenu dedans ? */
function joueurDans(lieu){
	var l = current_room, garde = 0;
	while (l && garde++ < 100){
		if (l === lieu) return true;
		l = l.parents[0];
	}
	return false;
}

Shell.supprimerLieu = function(r, cmd, recursif, io){
	var lieu = r.node;
	if (lieu.owner !== JOUEUR){
		return cmd + " : impossible de supprimer « " + lieu.room_name + " » : ce lieu ne t'appartient pas.";
	}
	if (joueurDans(lieu)){
		return cmd + " : tu ne vas pas scier la branche sur laquelle tu es assis. Sors d'abord de " + lieu.room_name + ".";
	}
	if (!recursif && (lieu.children.length > 0 || lieu.items.length > 0)){
		return cmd + " : impossible de supprimer « " + lieu.room_name + " » : le lieu n'est pas vide.";
	}
	r.dir.removeChild(lieu);
	GameEvents.fire({ type: "rmdir", room: lieu, parent: r.dir });
	return "Le lieu " + lieu.room_name + " disparaît.";
};

Shell.sorts.rm = function(args, io){
	var p = lireOptions(args, "rRfiv", "rm");
	if (p.reste.length === 0) throw new ShellError("rm : il faut désigner ce que tu veux faire disparaître. Utilisation : rm OBJET");
	var recursif = p.opts.r || p.opts.R;
	var messages = [];
	for (var i = 0; i < p.reste.length; i++){
		var r;
		try {
			r = Shell.chercher(p.reste[i], io, "rm");
		} catch (e){
			if (e instanceof ShellError){ messages.push(e.message); continue; }
			throw e;
		}
		if (r.node === null){
			if (!p.opts.f) messages.push(Shell.introuvable("rm", r.name, r.dir));
			continue;
		}
		if (r.node instanceof Room){
			if (!recursif){
				messages.push("rm : impossible de supprimer « " + r.name + " » : c'est un lieu. (Pour un lieu : rmdir, ou rm -r.)");
			} else {
				messages.push(Shell.supprimerLieu(r, "rm", true, io));
			}
			continue;
		}
		var item = r.node;
		var parSudo = io.sudo && item.allows("sudo-rm");
		if (!(item.allows("rm") || item.owner === JOUEUR || parSudo)){
			if (item.cmd_text["rm"]) messages.push(item.cmd_text["rm"]);
			else if (item.person) messages.push("Faire disparaître " + item.itemname + " ? Tu n'es pas ce genre de mage.");
			else if (io.sudo) messages.push("Même avec les pleins pouvoirs, ce monde tient trop à « " + item.itemname + " » pour le laisser disparaître.");
			else messages.push("rm : impossible de supprimer « " + item.itemname + " » : Opération non permise (cet objet ne t'appartient pas).");
			continue;
		}
		r.dir.removeItem(item);
		if (parSudo && !item.allows("rm")) messages.push(item.cmd_text["sudo-rm"] || item.itemname + " disparaît.");
		else if (item.allows("rm") && item.cmd_text["rm"]) messages.push(item.cmd_text["rm"]);
		else messages.push(item.itemname + " disparaît.");
		GameEvents.fire({ type: "rm", item: item, room: r.dir, sudo: !!io.sudo });
	}
	return messages.join("\n");
};

Shell.sorts.rmdir = function(args, io){
	if (args.length === 0) throw new ShellError("rmdir : quel lieu veux-tu faire disparaître ? Utilisation : rmdir LIEU");
	var messages = [];
	for (var i = 0; i < args.length; i++){
		var r = Shell.chercher(args[i], io, "rmdir");
		if (r.node === null){ messages.push(Shell.introuvable("rmdir", r.name, r.dir)); continue; }
		if (!(r.node instanceof Room)){
			messages.push("rmdir : « " + r.name + " » n'est pas un lieu. Pour un objet, c'est rm.");
			continue;
		}
		messages.push(Shell.supprimerLieu(r, "rmdir", false, io));
	}
	return messages.join("\n");
};

Shell.sorts.cp = function(args, io){
	var p = lireOptions(args, "rRfivp", "cp");
	if (p.reste.length !== 2) throw new ShellError("cp : il faut un original et un nom pour la copie. Utilisation : cp OBJET COPIE");
	var src = Shell.chercher(p.reste[0], io, "cp");
	if (src.node === null) throw new ShellError(Shell.introuvable("cp", src.name, src.dir));
	if (src.node instanceof Room) throw new ShellError("cp : « " + src.name + " » est un lieu ; copier un lieu entier dépasse tes pouvoirs.");
	var item = src.node;
	if (!Shell.bit(item, "r", io)) throw new ShellError("cp : impossible de lire « " + item.itemname + " » : Permission non accordée");
	if (item.person && !item.allows("cp")){
		throw new ShellError(item.cmd_text["cp"] || "On ne duplique pas les gens ! " + item.itemname + " te regarde de travers.");
	}
	var dest = Shell.chercher(p.reste[1], io, "cp");
	var cible, nom;
	if (dest.node instanceof Room){ cible = dest.node; nom = item.itemname; }
	else if (dest.node !== null) throw new ShellError("cp : « " + dest.name + " » existe déjà, et je refuse de l'écraser.");
	else { cible = dest.dir; nom = dest.name; }
	if (cible.getNode(nom) !== null) throw new ShellError("cp : il y a déjà quelque chose qui s'appelle « " + nom + " » dans " + cible.room_name + ".");
	Shell.nomValide(nom, "cp");
	var copie = new Item(nom, item.getText());
	copie.picturename = item.picturename;
	copie.owner = JOUEUR;
	copie.person = item.person;
	cible.addItem(copie);
	GameEvents.fire({ type: "cp", source: item, copy: copie, room: cible });
	return (item.allows("cp") && item.cmd_text["cp"]) ? item.cmd_text["cp"] :
		"Tu as copié " + item.itemname + " : la copie s'appelle " + nom + ".";
};

Shell.sorts.mkdir = function(args, io){
	var p = lireOptions(args, "pv", "mkdir");
	if (p.reste.length === 0) throw new ShellError("mkdir : quel nom donner au nouveau lieu ? Utilisation : mkdir LIEU");
	var messages = [];
	for (var i = 0; i < p.reste.length; i++){
		var r = Shell.chercher(p.reste[i], io, "mkdir");
		if (r.node !== null){
			if (!p.opts.p) messages.push("mkdir : impossible de créer « " + r.name + " » : ce nom est déjà pris ici.");
			continue;
		}
		Shell.nomValide(r.name, "mkdir");
		var lieu = new Room(r.name, "Un lieu que tu as créé de tes mains.");
		lieu.owner = JOUEUR;
		lieu.mode = "rwxr-xr-x";
		link_rooms(r.dir, lieu);
		messages.push("Un nouveau lieu apparaît : " + r.name + ".");
		GameEvents.fire({ type: "mkdir", room: lieu, parent: r.dir });
	}
	return messages.join("\n");
};

Shell.sorts.touch = function(args, io){
	if (args.length === 0) throw new ShellError("touch : il faut nommer ce que tu veux créer. Utilisation : touch OBJET");
	var crees = [];
	for (var i = 0; i < args.length; i++){
		var r = Shell.chercher(args[i], io, "touch");
		if (r.node !== null) continue; // sous Linux, touch sur un objet existant met juste sa date a jour
		Shell.nomValide(r.name, "touch");
		var item = new Item(r.name, "");
		item.owner = JOUEUR;
		r.dir.addItem(item);
		crees.push(r.name);
		GameEvents.fire({ type: "touch", item: item, room: r.dir });
	}
	if (crees.length === 0) return "";
	return "Tu viens de créer " + crees.join(", ") + ".";
};

function appliquerMode(ancien, expression, cmd){
	var bits = [];
	for (var i = 0; i < 9; i++) bits.push(ancien.charAt(i) !== "-");
	if (/^[0-7]{3}$/.test(expression)){
		for (var d = 0; d < 3; d++){
			var chiffre = parseInt(expression.charAt(d), 10);
			bits[d * 3] = (chiffre & 4) !== 0;
			bits[d * 3 + 1] = (chiffre & 2) !== 0;
			bits[d * 3 + 2] = (chiffre & 1) !== 0;
		}
	} else {
		var clauses = expression.split(",");
		for (var c = 0; c < clauses.length; c++){
			var m = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(clauses[c]);
			if (!m){
				throw new ShellError(cmd + " : je ne comprends pas les droits « " + expression + " ».\n" +
					"Exemples : chmod +x LIEU, chmod u+rw OBJET, chmod 755 LIEU");
			}
			var qui = m[1] === "" || m[1].indexOf("a") > -1 ? "ugo" : m[1];
			for (var q = 0; q < qui.length; q++){
				var base = "ugo".indexOf(qui.charAt(q)) * 3;
				if (m[2] === "="){ bits[base] = bits[base + 1] = bits[base + 2] = false; }
				for (var l = 0; l < m[3].length; l++){
					bits[base + "rwx".indexOf(m[3].charAt(l))] = m[2] !== "-";
				}
			}
		}
	}
	var mode = "";
	for (var b = 0; b < 9; b++) mode += bits[b] ? "rwx".charAt(b % 3) : "-";
	return mode;
}

Shell.sorts.chmod = function(args, io){
	var expression = null, cibles = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-R" || args[i] === "-v") continue;
		if (expression === null) expression = args[i];
		else cibles.push(args[i]);
	}
	if (expression === null || cibles.length === 0){
		throw new ShellError("chmod : il faut des droits, puis une cible. Utilisation : chmod DROITS CIBLE (par exemple chmod +x Portail)");
	}
	for (var c = 0; c < cibles.length; c++){
		var r = Shell.chercher(cibles[c], io, "chmod");
		if (r.node === null) throw new ShellError(Shell.introuvable("chmod", r.name, r.dir));
		if (r.node.owner !== JOUEUR && !io.sudo){
			throw new ShellError("chmod : modification des droits de « " + r.node.toString() + " » : Opération non permise\n" +
				C.gris("(Seul le propriétaire d'une chose peut changer ses droits, et ici c'est " + r.node.owner + ". ls -l te montre qui possède quoi.)"));
		}
		r.node.mode = appliquerMode(r.node.mode, expression, "chmod");
		GameEvents.fire({ type: "chmod", node: r.node, room: r.dir });
	}
	return "";
};

/* ------------------------------------------------------------------ */
/* Chercher                                                            */
/* ------------------------------------------------------------------ */

Shell.sorts.find = function(args, io){
	var departs = [], i = 0;
	while (i < args.length && args[i].charAt(0) !== "-"){ departs.push(args[i]); i++; }
	if (departs.length === 0) departs = ["."];
	var nom = null, type = null;
	for (; i < args.length; i++){
		if (args[i] === "-name" || args[i] === "-iname"){
			if (args[i + 1] === undefined) throw new ShellError("find : " + args[i] + " attend un nom, par exemple : find . -name \"flag*\"");
			var source = jokerVersRegExp(args[i + 1]).source;
			nom = new RegExp(source, args[i] === "-iname" ? "i" : "");
			i++;
		} else if (args[i] === "-type"){
			if (args[i + 1] !== "d" && args[i + 1] !== "f") throw new ShellError("find : -type attend d (les lieux) ou f (les objets)");
			type = args[i + 1];
			i++;
		} else {
			throw new ShellError("find : critère inconnu « " + args[i] + " ». Ceux qui existent ici : -name NOM, -iname NOM, -type d, -type f");
		}
	}
	var lignes = [];
	function garder(nomNoeud, estLieu){
		if (type === "d" && !estLieu) return false;
		if (type === "f" && estLieu) return false;
		return nom === null || nom.test(nomNoeud);
	}
	function parcourir(lieu, chemin, profondeur){
		if (profondeur > 40) return;
		for (var k = 0; k < lieu.items.length; k++){
			if (garder(lieu.items[k].itemname, false)) lignes.push(chemin + "/" + lieu.items[k].itemname);
		}
		for (var j = 0; j < lieu.children.length; j++){
			var enfant = lieu.children[j];
			var sousChemin = chemin + "/" + enfant.room_name;
			if (garder(enfant.room_name, true)) lignes.push(io.tty ? C.bleu(sousChemin) : sousChemin);
			if (!Shell.peutFouiller(enfant)) continue;
			if (!Shell.bit(enfant, "x", io) || !Shell.bit(enfant, "r", io)){
				lignes.push("find : « " + sousChemin + " » : Permission non accordée");
				continue;
			}
			parcourir(enfant, sousChemin, profondeur + 1);
		}
	}
	for (var d = 0; d < departs.length; d++){
		var r = Shell.chercher(departs[d], io, "find");
		if (r.node === null) throw new ShellError(Shell.introuvable("find", r.name, r.dir));
		var racine = departs[d].replace(/\/+$/, "") || departs[d];
		if (r.node instanceof Room){
			if (!Shell.bit(r.node, "r", io)) throw new ShellError("find : « " + racine + " » : Permission non accordée");
			if (garder(r.node === current_room && racine === "." ? "." : r.node.room_name, true)) lignes.push(io.tty ? C.bleu(racine) : racine);
			parcourir(r.node, racine, 0);
		} else if (garder(r.node.itemname, false)){
			lignes.push(racine);
		}
	}
	GameEvents.fire({ type: "find", count: lignes.length });
	return lignes.join("\n");
};

Shell.sorts.tree = function(args, io){
	var p = lireOptions(args, "adL", "tree", "L");
	var r = Shell.chercher(p.reste[0] || ".", io, "tree");
	if (r.node === null) throw new ShellError(Shell.introuvable("tree", r.name, r.dir));
	if (!(r.node instanceof Room)) return r.node.itemname;
	var limite = p.opts.L ? parseInt(p.opts.L, 10) : 40;
	if (isNaN(limite) || limite < 1) throw new ShellError("tree : -L attend un nombre de niveaux, par exemple : tree -L 2");
	var lignes = [io.tty ? C.bleu(p.reste[0] || ".") : (p.reste[0] || ".")];
	var nLieux = 0, nObjets = 0;
	function dessiner(lieu, prefixe, profondeur){
		var entrees = [];
		var k;
		for (k = 0; k < lieu.children.length; k++){
			if (p.opts.a || !lieu.children[k].isHidden()) entrees.push(lieu.children[k]);
		}
		if (!p.opts.d){
			for (k = 0; k < lieu.items.length; k++){
				if (p.opts.a || !lieu.items[k].isHidden()) entrees.push(lieu.items[k]);
			}
		}
		for (k = 0; k < entrees.length; k++){
			var dernier = k === entrees.length - 1;
			var e = entrees[k];
			var estLieu = e instanceof Room;
			var etiquette = estLieu ? (io.tty ? C.bleu(e.room_name) : e.room_name) : e.itemname;
			var note = "";
			if (estLieu) nLieux++; else nObjets++;
			var ouvert = estLieu && Shell.peutFouiller(e) && Shell.bit(e, "x", io) && Shell.bit(e, "r", io);
			if (estLieu && !ouvert) note = io.tty ? C.gris("  [fermé]") : "  [fermé]";
			lignes.push(prefixe + (dernier ? "└── " : "├── ") + etiquette + note);
			if (ouvert && profondeur + 1 < limite) dessiner(e, prefixe + (dernier ? "    " : "│   "), profondeur + 1);
		}
	}
	if (!Shell.bit(r.node, "r", io)) throw new ShellError("tree : « " + r.node.room_name + " » : Permission non accordée");
	dessiner(r.node, "", 0);
	lignes.push("");
	lignes.push(nLieux + " lieu" + (nLieux > 1 ? "x" : "") + ", " + nObjets + " objet" + (nObjets > 1 ? "s" : ""));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Processus                                                           */
/* ------------------------------------------------------------------ */

Shell.sorts.ps = function(args, io){
	var lignes = [completerGauche("PID", 5) + " " + completerDroite("UTILISATEUR", 12) + "COMMANDE"];
	function ligne(pid, proprio, nom){
		lignes.push(completerGauche(pid, 5) + " " + completerDroite(proprio, 12) + nom);
	}
	ligne(1, "root", "init");
	var procs = current_room.procs.slice().sort(function(a, b){ return a.pid - b.pid; });
	var bashAffiche = false;
	for (var i = 0; i < procs.length; i++){
		if (!bashAffiche && procs[i].pid > PID_BASH){ ligne(PID_BASH, JOUEUR, "bash"); bashAffiche = true; }
		ligne(procs[i].pid, procs[i].owner, procs[i].name);
	}
	if (!bashAffiche) ligne(PID_BASH, JOUEUR, "bash");
	ligne(9000 + (state.nbCommandes % 900), io.sudo ? "root" : JOUEUR, "ps");
	return lignes.join("\n");
};

Shell.sorts.kill = function(args, io){
	var force = false, pids = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-l") return " 1) SIGHUP   2) SIGINT   9) SIGKILL  15) SIGTERM";
		if (/^-(9|KILL|SIGKILL)$/i.test(a)) force = true;
		else if (/^-(15|TERM|SIGTERM|1|HUP|SIGHUP|2|INT|SIGINT)$/i.test(a)) force = false;
		else if (a === "-s"){ i++; force = /^(9|KILL|SIGKILL)$/i.test(args[i] || ""); }
		else if (/^\d+$/.test(a)) pids.push(parseInt(a, 10));
		else throw new ShellError("kill : « " + a + " » n'est pas un PID. Un PID est le numéro que ps affiche devant chaque processus.");
	}
	if (pids.length === 0) throw new ShellError("kill : quel processus ? Utilisation : kill PID (ou kill -9 PID pour les têtus)");
	var messages = [];
	for (var k = 0; k < pids.length; k++){
		var pid = pids[k];
		if (pid === 1){
			messages.push("kill : (1) : Opération non permise\n" + C.gris("(init est le tout premier processus, l'ancêtre de tous les autres. On n'y touche pas.)"));
			continue;
		}
		if (pid === PID_BASH){
			messages.push("Tuer bash, c'est fermer ton propre terminal. Ton grimoire se referme d'un coup sec sur tes doigts, puis se rouvre. Mauvaise idée.");
			continue;
		}
		var proc = current_room.getProc(pid);
		if (proc === null){
			messages.push("kill : (" + pid + ") : Aucun processus de ce type");
			continue;
		}
		if (proc.owner !== JOUEUR && !io.sudo){
			messages.push("kill : (" + pid + ") : Opération non permise\n" +
				C.gris("(Ce processus appartient à " + proc.owner + ". On n'arrête que ses propres processus, à moins d'avoir les pouvoirs de root.)"));
			continue;
		}
		if (proc.sig9 && !force){
			messages.push(proc.ignoreText || ("Le processus " + pid + " (" + proc.name + ") reçoit ton signal TERM et l'ignore. Il faudra être moins poli : kill -9."));
			continue;
		}
		current_room.procs.splice(current_room.procs.indexOf(proc), 1);
		messages.push(proc.killText || ("Processus " + pid + " (" + proc.name + ") terminé."));
		GameEvents.fire({ type: "kill", proc: proc, room: current_room, force: force });
	}
	return messages.join("\n");
};

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

Shell.sorts.whoami = function(args, io){
	return io.sudo ? "root" : JOUEUR;
};

Shell.sorts.history = function(args, io){
	var lignes = [];
	var debut = Math.max(0, Shell.historique.length - 200);
	for (var i = debut; i < Shell.historique.length; i++){
		lignes.push(completerGauche(i + 1, 5) + "  " + Shell.historique[i]);
	}
	return lignes.join("\n");
};

Shell.sorts.clear = function(args, io){
	term.effacer();
	return "";
};

Shell.sorts.exit = function(args, io){
	return "On ne quitte pas Terminus si facilement. Ferme simplement l'onglet : ta partie est sauvegardée, tu la retrouveras en revenant.";
};

Shell.sorts.help = function(args, io){
	var connus = state.knownSpells();
	var lignes = [C.gras("Tes sorts (" + connus.length + " sur " + ORDRE_DES_SORTS.length + ") :")];
	for (var i = 0; i < connus.length; i++){
		lignes.push("  " + C.vert(completerDroite(connus[i], 9)) + MANUEL[connus[i]].resume);
	}
	lignes.push("");
	lignes.push("Pour le détail d'un sort : " + C.vert("man SORT") + " (par exemple man ls).");
	lignes.push("Ton journal de quêtes : " + C.vert("quetes") + ". Repartir de zéro : " + C.vert("recommencer") + ".");
	lignes.push(C.gris("Astuces : la touche Tab complète les noms, la flèche du haut rappelle tes derniers sorts."));
	return lignes.join("\n");
};
Shell.sorts.sorts = Shell.sorts.help;
Shell.sorts.aide = Shell.sorts.help;

//only valid for command names
Shell.sorts.man = function(args, io){
	if (args.length < 1){
		return "Il faut interroger le vieil homme sur un sort précis pour obtenir une réponse. Par exemple : man ls";
	}
	var sort = args[0];
	if (sort === "man"){
		return "« C'est MOI, le vieil homme (man), nom d'une pipe ! On ne demande pas un manuel sur le manuel. »\n" +
			"Les sorts que tu peux me demander : " + state.knownSpells().join(", ") + ".";
	}
	if (MANUEL[sort] && state.knows(sort)){
		return C.gris("La voix du vieil homme résonne dans ta tête, comme venue de très loin :") + "\n\n" +
			C.gras(sort) + " : " + MANUEL[sort].titre + "\n\n" + MANUEL[sort].page + "\n\n" + C.gris("Souviens-toiiiii...");
	}
	if (MANUEL[sort]){
		return "Le vieil homme reste silencieux. « Chaque chose en son temps », semble dire le vent. (Tu ne connais pas encore le sort " + sort + ".)";
	}
	return "Il n'y a pas de page de manuel pour « " + sort + " ».";
};

Shell.sorts.quetes = function(args, io){
	return state.journal();
};

Shell.sorts.recommencer = function(args, io){
	term.demander("Tout effacer et repartir de zéro ? Tape oui pour confirmer : ", false, function(reponse){
		if (reponse.trim().toLowerCase() === "oui"){
			state.reset();
			window.location.reload();
		} else {
			term.echo("Sage décision. Ta partie est intacte.");
		}
	});
	return "";
};

/* ------------------------------------------------------------------ */
/* Lancer une ligne                                                    */
/* ------------------------------------------------------------------ */

function distanceUn(a, b){
	if (a === b) return true;
	if (Math.abs(a.length - b.length) > 1) return false;
	if (a.length === b.length){
		var differences = [];
		for (var i = 0; i < a.length; i++){ if (a.charAt(i) !== b.charAt(i)) differences.push(i); }
		if (differences.length === 1) return true;
		return differences.length === 2 && differences[1] === differences[0] + 1 &&
			a.charAt(differences[0]) === b.charAt(differences[1]) && a.charAt(differences[1]) === b.charAt(differences[0]);
	}
	var court = a.length < b.length ? a : b, long = a.length < b.length ? b : a;
	for (var k = 0; k < long.length; k++){
		if (long.substring(0, k) + long.substring(k + 1) === court) return true;
	}
	return false;
}

Shell.sortInconnu = function(nom){
	var ici = current_room.getNode(nom);
	if (ici instanceof Room) return "« " + nom + " » est un lieu, pas un sort. Pour y aller : cd " + nom;
	if (ici !== null) return "« " + nom + " » n'est pas un sort. Pour regarder un objet ou parler à quelqu'un : less " + nom;
	if (COMMANDES_REELLES.indexOf(nom) > -1){
		return "« " + nom + " » existe bel et bien sous Linux, mais ce sort n'a pas cours à Terminus. Tape help pour revoir les tiens.";
	}
	var connus = state.knownSpells().concat(SORTS_DU_JEU);
	if (nom.length > 1){
		for (var i = 0; i < connus.length; i++){
			if (distanceUn(nom, connus[i])) return nom + " : sort inconnu. Voulais-tu dire « " + connus[i] + " » ?";
		}
	}
	if (nom !== nom.toLowerCase() && Shell.sorts[nom.toLowerCase()]){
		return nom + " : sort inconnu. Les sorts s'écrivent en minuscules : " + nom.toLowerCase();
	}
	return nom + " : sort inconnu. Tape help pour revoir tes sorts.";
};

Shell.appeler = function(nom, args, io){
	if (nom.indexOf("/") > -1){
		throw new ShellError(nom + " : ce n'est pas un sort que l'on peut lancer.");
	}
	if (!Shell.sorts.hasOwnProperty(nom)) throw new ShellError(Shell.sortInconnu(nom));
	if (SORTS_DU_JEU.indexOf(nom) === -1 && !state.knows(nom)){
		throw new ShellError("Tu ne connais pas encore le sort « " + nom + " ». Quelqu'un, quelque part en ce monde, pourra te l'enseigner.");
	}
	return Shell.sorts[nom](args, io);
};

/* Ecrit dans un objet (redirections > et >>). */
Shell.ecrire = function(cible, texte, ajout){
	var r = Shell.chercher(cible, { sudo: false }, "écriture");
	if (r.node instanceof Room) throw new ShellError("Impossible d'écrire dans « " + r.name + " » : c'est un lieu.");
	if (r.node === null){
		Shell.nomValide(r.name, "écriture");
		var item = new Item(r.name, texte);
		item.owner = JOUEUR;
		r.dir.addItem(item);
		GameEvents.fire({ type: "write", item: item, room: r.dir, append: ajout, text: texte, created: true, previous: "" });
		return;
	}
	// Comme sous Linux, c'est le terminal (et non sudo) qui ouvre le fichier : pas de passe-droit ici.
	if (!Shell.bit(r.node, "w", null)){
		throw new ShellError("Impossible d'écrire dans « " + r.name + " » : Permission non accordée");
	}
	var ancien = r.node.getText();
	r.node.setText(ajout ? (ancien === "" ? texte : ancien.replace(/\n$/, "") + "\n" + texte) : texte);
	GameEvents.fire({ type: "write", item: r.node, room: r.dir, append: ajout, text: texte, created: false, previous: ancien });
};

/* Lance un tuyau : sort1 | sort2 | sort3 [> objet]. Renvoie vrai si tout s'est bien passe. */
Shell.tuyau = function(jetons){
	var segments = [[]];
	for (var i = 0; i < jetons.length; i++){
		if (jetons[i].t === "op" && jetons[i].v === "|") segments.push([]);
		else segments[segments.length - 1].push(jetons[i]);
	}
	var stdin = null;
	var noms = [];
	var redirection = null;
	try {
		for (var s = 0; s < segments.length; s++){
			var argv = [];
			var seg = segments[s];
			for (var k = 0; k < seg.length; k++){
				if (seg[k].t === "op"){
					if (!seg[k + 1] || seg[k + 1].t !== "mot"){
						throw new ShellError("Après " + seg[k].v + " il faut le nom de l'objet dans lequel écrire.");
					}
					if (s !== segments.length - 1){
						throw new ShellError("Une redirection (" + seg[k].v + ") ne peut se trouver qu'à la fin de la ligne.");
					}
					redirection = { op: seg[k].v, cible: seg[k + 1].v };
					k++;
				} else if (seg[k].joker){
					argv = argv.concat(Shell.developper(seg[k].v));
				} else {
					argv.push(seg[k].v);
				}
			}
			if (argv.length === 0) throw new ShellError("Il manque un sort " + (s === 0 ? "avant" : "après") + " le tuyau |.");
			var dernier = s === segments.length - 1;
			var io = { stdin: stdin, tty: dernier && redirection === null, sudo: false };
			var nom = argv[0], args = argv.slice(1);
			if (nom === "sudo"){
				if (!state.knows("sudo")){
					throw new ShellError("Tu ne connais pas encore le sort « sudo ». Les légendes disent qu'il confère tous les pouvoirs...");
				}
				if (args.length === 0) throw new ShellError("sudo : quel sort veux-tu lancer avec les pleins pouvoirs ? Utilisation : sudo SORT");
				if (!state.has("sudoOK")) throw new ShellError("sudo : mot de passe requis.");
				io.sudo = true;
				nom = args[0];
				args = args.slice(1);
			}
			noms.push(nom);
			var sortie = Shell.appeler(nom, args, io);
			stdin = (sortie === undefined || sortie === null) ? "" : String(sortie);
			if (!io.tty) stdin = sansAnsi(stdin);
		}
		if (redirection !== null){
			Shell.ecrire(redirection.cible, stdin, redirection.op === ">>");
		} else {
			if (stdin !== "") term.echo(stdin);
			if (noms[noms.length - 1] === "echo"){
				GameEvents.fire({ type: "echo", text: sansAnsi(stdin), room: current_room });
			}
		}
		if (noms.length > 1) GameEvents.fire({ type: "pipeline", names: noms, room: current_room, output: sansAnsi(stdin) });
		return true;
	} catch (e){
		if (e instanceof ShellError){
			term.echo(e.message);
			return false;
		}
		throw e;
	}
};

Shell.lancer = function(jetons){
	var sequences = [], courant = [], separateur = null;
	for (var i = 0; i < jetons.length; i++){
		if (jetons[i].t === "op" && (jetons[i].v === ";" || jetons[i].v === "&&")){
			sequences.push({ jetons: courant, avant: separateur });
			separateur = jetons[i].v;
			courant = [];
		} else {
			courant.push(jetons[i]);
		}
	}
	sequences.push({ jetons: courant, avant: separateur });
	var ok = true;
	for (var s = 0; s < sequences.length; s++){
		if (sequences[s].jetons.length === 0) continue;
		if (sequences[s].avant === "&&" && !ok) continue;
		ok = Shell.tuyau(sequences[s].jetons);
	}
};

/* Apres chaque ligne : le monde reagit, puis on affiche l'ambiance et on sauvegarde. */
Shell.fin = function(){
	verifierMonde();
	while (Shell.narration.length){
		term.echo(Shell.narration.shift());
	}
	term.definirInvite(Shell.invite());
	state.save();
};

Shell.invite = function(){
	var chemin = current_room.path();
	var morceaux = chemin.split("/");
	if (morceaux.length > 3) chemin = "…/" + morceaux.slice(-2).join("/");
	return C.vert(JOUEUR + "@terminus") + ":" + C.bleu(chemin) + "$ ";
};

/* Point d'entree : appele par Game.js pour chaque ligne validee. */
Shell.executer = function(ligne){
	if (ligne.trim() === "") return;
	Shell.historique.push(ligne);
	state.nbCommandes++;
	var jetons;
	try {
		jetons = Shell.decouper(ligne);
	} catch (e){
		if (e instanceof ShellError){ term.echo(e.message); return; }
		throw e;
	}
	if (jetons.length === 0) return;
	var veutSudo = false;
	for (var i = 0; i < jetons.length; i++){
		if (jetons[i].t === "mot" && jetons[i].v === "sudo" && (i === 0 || jetons[i - 1].t === "op")) veutSudo = true;
	}
	if (veutSudo && state.knows("sudo") && !state.has("sudoOK")){
		term.demander("[sudo] Mot de passe de " + JOUEUR + " : ", true, function(reponse){
			if (reponse === MOT_DE_PASSE_SUDO){
				state.applyState("sudoOK");
				Shell.lancer(jetons);
			} else {
				term.echo("Désolé, essaie encore.\n" + C.gris("(Le mot de passe sudo se trouve quelque part dans les ArchivesDuNoyau.)"));
			}
			Shell.fin();
		});
		return;
	}
	Shell.lancer(jetons);
	Shell.fin();
};

/* ------------------------------------------------------------------ */
/* Completion avec la touche Tab                                       */
/* ------------------------------------------------------------------ */

function prefixeCommun(mots){
	if (mots.length === 0) return "";
	var prefixe = mots[0];
	for (var i = 1; i < mots.length; i++){
		while (mots[i].indexOf(prefixe) !== 0) prefixe = prefixe.substring(0, prefixe.length - 1);
	}
	return prefixe;
}

Shell.completer = function(avant){
	var coupe = Math.max(avant.lastIndexOf(" "), avant.lastIndexOf("|"), avant.lastIndexOf(";"), avant.lastIndexOf(">"), avant.lastIndexOf("&"));
	var debut = avant.substring(0, coupe + 1);
	var mot = avant.substring(coupe + 1);
	var contexte = debut.replace(/\s+$/, "");
	var premierMot = contexte === "" || /[|;&]$/.test(contexte) || /(^|[|;&]\s*)sudo$/.test(contexte);
	var candidats = [];
	var base = "";
	if (premierMot && mot.indexOf("/") === -1){
		var sorts = state.knownSpells().concat(SORTS_DU_JEU);
		for (var i = 0; i < sorts.length; i++){
			if (sorts[i].indexOf(mot) === 0) candidats.push(sorts[i] + " ");
		}
	} else {
		var slash = mot.lastIndexOf("/");
		var motif = mot;
		var lieu = current_room;
		if (slash > -1){
			base = mot.substring(0, slash + 1);
			motif = mot.substring(slash + 1);
			try {
				lieu = Shell.chercher(base, { sudo: false }, "").node;
			} catch (e){
				return null;
			}
		}
		if (!(lieu instanceof Room) || !Shell.bit(lieu, "r", null)) return null;
		var k;
		for (k = 0; k < lieu.children.length; k++){
			var nomLieu = lieu.children[k].room_name;
			if (nomLieu.indexOf(motif) === 0 && (motif.charAt(0) === "." || nomLieu.charAt(0) !== ".")) candidats.push(nomLieu + "/");
		}
		for (k = 0; k < lieu.items.length; k++){
			var nomObjet = lieu.items[k].itemname;
			if (nomObjet.indexOf(motif) === 0 && (motif.charAt(0) === "." || nomObjet.charAt(0) !== ".")) candidats.push(nomObjet + " ");
		}
	}
	if (candidats.length === 0) return null;
	if (candidats.length === 1) return { valeur: debut + base + candidats[0], choix: candidats };
	var commun = prefixeCommun(candidats);
	return { valeur: debut + base + commun, choix: candidats.map(function(c){ return c.replace(/ $/, ""); }) };
};
