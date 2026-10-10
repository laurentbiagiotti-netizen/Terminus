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

/* Le mot de passe sudo change d'une partie à l'autre (voir Partie.js). */
var MOT_DE_PASSE_SUDO = aleaChoix("motdepasse", ["P1ngouin", "C4stor", "H1bou", "R3nard", "L1nx", "F4ucon", "M4nchot", "C0rbeau", "Bl41reau", "Hér1sson"]) +
	aleaEntier("motdepasse-chiffres", 10, 99);
var PID_BASH = 1337;

/* Des numéros de processus propres à chaque partie : il faut les lire avec ps, pas les recopier. */
function tirerPids(sel, nombre, min, max){
	var pids = [];
	var essai = 0;
	while (pids.length < nombre && essai < 500){
		var pid = aleaEntier(sel + ":" + essai, min, max);
		essai++;
		if (pid !== PID_BASH && pids.indexOf(pid) === -1) pids.push(pid);
	}
	return pids;
}

var Shell = {
	sorts: {},
	historique: [],
	narration: [],
	lieu_precedent: null,
	pile_ssh: [],            // lieux d'où l'on est parti en ssh (exit y ramène)
	profondeur_script: 0,
	variable_developpee: false
};

/* Valeur d'une variable d'environnement ($USER, $HOME, $PWD...). */
Shell.variable = function(nom){
	if (nom === "PWD") return current_room.path();
	if (nom === "USER" || nom === "LOGNAME") return JOUEUR;
	if (nom === "HOSTNAME") return Shell.hote();
	return state.env.hasOwnProperty(nom) ? state.env[nom] : "";
};

/* Nom de la machine sur laquelle se trouve le joueur. */
Shell.hote = function(){
	var racine = typeof racineDe === "function" ? racineDe(current_room) : null;
	if (racine) return racine.racineHote;
	if (typeof Coffre !== "undefined" && joueurDans(Coffre)) return "coffre";
	if (typeof CampusLille !== "undefined" && joueurDans(CampusLille)) return "lille";
	if (typeof CampusMarseille !== "undefined" && joueurDans(CampusMarseille)) return "marseille";
	if (typeof Cybersup !== "undefined" && joueurDans(Cybersup)) return "cybersup";
	if (typeof Citadelle !== "undefined" && joueurDans(Citadelle)) return "citadelle";
	return "terminus";
};

/* Texte d'ambiance affiche apres la sortie du sort en cours. */
function say(texte){
	Shell.narration.push(texte);
}

/* Sorts toujours disponibles : ce sont des commandes du jeu, pas de Linux. */
var SORTS_DU_JEU = ["quetes", "indice", "chapitre", "xp", "score", "bulletin", "succes", "chrono", "son", "recommencer", "logout", "sorts", "aide"];

/* Vraies commandes Linux absentes de ce monde : on le dit gentiment. */
var COMMANDES_REELLES = ["vi", "vim", "nano", "emacs", "apt-get", "yum", "dnf", "pacman", "scp",
	"curl", "wget", "git", "python", "python3", "zsh", "sh", "htop", "zip", "unzip", "gzip", "chgrp", "su", "awk", "sed", "tr", "more",
	"which", "whereis", "locate", "cal", "uname", "who", "w", "free",
	"mount", "systemctl", "service", "ip", "ifconfig", "netstat", "ss", "nmap", "make", "gcc", "node", "docker",
	"reboot", "shutdown", "killall", "pkill", "xargs", "tee", "file", "stat", "basename", "dirname", "sleep",
	"htop", "traceroute", "dig", "nslookup", "useradd", "groups", "umask", "watch", "jobs", "fg", "bg", "nohup"];

/* ------------------------------------------------------------------ */
/* Decoupage de la ligne                                               */
/* ------------------------------------------------------------------ */

Shell.decouper = function(ligne){
	var jetons = [];
	var i = 0, n = ligne.length;
	var mot = null;
	function commencer(){ if (mot === null) mot = { t: "mot", v: "", joker: false }; }
	function finir(){ if (mot !== null){ jetons.push(mot); mot = null; } }
	// $NOM ou ${NOM} : remplace par la valeur de la variable. Renvoie vrai si c'en était une.
	function variable(){
		var reste = ligne.substring(i + 1);
		var m = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(reste) || /^\{([A-Za-z_][A-Za-z0-9_]*)\}/.exec(reste);
		if (!m) return false;
		commencer();
		mot.v += Shell.variable(m[1]);
		Shell.variable_developpee = true;
		i += 1 + m[0].length;
		return true;
	}
	while (i < n){
		var c = ligne.charAt(i);
		if (c === " " || c === "\t"){ finir(); i++; continue; }
		if (c === "\"" || c === "'"){
			var guillemet = c;
			var ouverture = i;
			commencer();
			i++;
			while (i < n && ligne.charAt(i) !== guillemet){
				// Entre guillemets doubles les variables sont lues ; entre apostrophes, rien n'est interprété.
				if (guillemet === "\"" && ligne.charAt(i) === "$" && variable()) continue;
				if (guillemet === "\"" && ligne.charAt(i) === "\\" && i + 1 < n) i++;
				mot.v += ligne.charAt(i);
				i++;
			}
			if (i >= n){
				// L'apostrophe d'un mot français (s'appelle, l'épée) ouvre une citation que rien ne ferme.
				if (guillemet === "'" && /[A-Za-zÀ-ÿ]/.test(ligne.charAt(ouverture - 1) || "")){
					var debutMot = ligne.lastIndexOf(" ", ouverture) + 1;
					var finMot = ligne.indexOf(" ", ouverture);
					var motFautif = ligne.substring(debutMot, finMot === -1 ? n : finMot);
					throw new ShellError("Il manque un guillemet fermant : '\n" +
						C.gris("(Pour le terminal, l'apostrophe de « " + motFautif + " » ouvre une citation que rien ne referme. " +
						"Entoure toute la phrase de guillemets doubles, par exemple : echo \"" + ligne.replace(/^\s*\S+\s+/, "").replace(/"/g, "") + "\", " +
						"ou protège l'apostrophe avec une barre oblique inverse : " + motFautif.replace("'", "\\'") + ")"));
				}
				throw new ShellError("Il manque un guillemet fermant : " + guillemet);
			}
			i++;
			continue;
		}
		if (c === "\\" && i + 1 < n){ commencer(); mot.v += ligne.charAt(i + 1); i += 2; continue; }
		if (c === "$" && variable()) continue;
		if (c === "|"){
			finir();
			if (ligne.charAt(i + 1) === "|") throw new ShellError("L'opérateur || n'a pas cours dans ce monde. Utilise | (tuyau), ; ou &&.");
			jetons.push({ t: "op", v: "|" });
			i++;
			continue;
		}
		// Redirections avec un numéro de sortie : 1 (la sortie normale) ou 2 (les erreurs).
		// 1> 1>> 2> 2>> 2>&1 1>&2, comme sous bash.
		if ((c === "1" || c === "2") && mot === null && ligne.charAt(i + 1) === ">"){
			var fd = c, suite = ligne.substring(i + 2, i + 4);
			if (suite.charAt(0) === ">"){ jetons.push({ t: "op", v: fd === "1" ? ">>" : "2>>" }); i += 3; }
			else if (suite === "&1" || suite === "&2"){ jetons.push({ t: "op", v: fd + ">&" + suite.charAt(1) }); i += 4; }
			else { jetons.push({ t: "op", v: fd === "1" ? ">" : "2>" }); i += 2; }
			continue;
		}
		// &> et &>> : la sortie normale et les erreurs au même endroit.
		if (c === "&" && ligne.charAt(i + 1) === ">"){
			finir();
			if (ligne.charAt(i + 2) === ">"){ jetons.push({ t: "op", v: "&>>" }); i += 3; }
			else { jetons.push({ t: "op", v: "&>" }); i += 2; }
			continue;
		}
		if (c === ">"){
			finir();
			if (ligne.charAt(i + 1) === ">"){ jetons.push({ t: "op", v: ">>" }); i += 2; }
			else if (ligne.substring(i + 1, i + 3) === "&2" || ligne.substring(i + 1, i + 3) === "&1"){ jetons.push({ t: "op", v: "1>&" + ligne.charAt(i + 2) }); i += 3; }
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
	var lettreMode = noeud.mode.charAt(base + rang);
	return lettreMode !== "-" && lettreMode !== "S" && lettreMode !== "T";
};

function sansAccents(texte){
	return texte.normalize ? texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : texte;
}

Shell.introuvable = function(cmd, nom, lieu){
	var message = (cmd ? cmd + " : " : "") + "« " + nom + " » : aucun lieu ni objet de ce nom ici";
	var proche = lieu ? lieu.getNodeIgnoringCase(nom) : null;
	if (proche){
		message += "\n" + C.gris("(Sous Linux, majuscules et minuscules comptent : il existe « " + proche.toString() + " ».)");
	} else if (lieu && sansAccents(nom) !== nom){
		var sansAccent = lieu.getNodeIgnoringCase(sansAccents(nom));
		if (sansAccent){
			message += "\n" + C.gris("(Les noms de ce monde s'écrivent sans accents, comme souvent sous Linux : « " + sansAccent.toString() + " ».)");
		}
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

/* Si c'est un lien symbolique, renvoie ce vers quoi il pointe (ou leve une erreur s'il est brise). */
Shell.suivre = function(noeud, cmd){
	var garde = 0;
	while (noeud instanceof Item && noeud.lien && garde++ < 8){
		var cible = null;
		try {
			cible = Shell.chercherDepuis(Home, noeud.lien, { sudo: false }, cmd).node;
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
		}
		if (cible === null){
			throw new ShellError((cmd ? cmd + " : " : "") + noeud.itemname + " : lien brisé (" + noeud.lien + " n'existe plus ou n'est plus accessible)");
		}
		noeud = cible;
	}
	return noeud;
};

Shell.pas = function(lieu, nom, io, cmd){
	if (nom === ".") return lieu;
	if (nom === "..") return lieu.parents[0] || lieu;
	var suivant = lieu.getNode(nom);
	if (suivant === null) throw new ShellError(Shell.introuvable(cmd, nom, lieu));
	suivant = Shell.suivre(suivant, cmd);
	if (!(suivant instanceof Room)) throw new ShellError((cmd ? cmd + " : " : "") + nom + " : ce n'est pas un lieu");
	Shell.verifierTraversee(suivant, io, cmd);
	return suivant;
};

/**
 * Suit un chemin (relatif, ou commencant par ~) et renvoie
 * { dir: le lieu qui contient la cible, name: son nom, node: la cible ou null }.
 */
Shell.chercher = function(chemin, io, cmd){
	return Shell.chercherDepuis(current_room, chemin, io, cmd);
};

Shell.chercherDepuis = function(depart, chemin, io, cmd){
	if (chemin === "") throw new ShellError((cmd ? cmd + " : " : "") + "chemin vide");
	var racineHote = chemin.charAt(0) === "/" && typeof racineDe === "function" ? racineDe(depart) : null;
	if (racineHote){
		// Sur une machine du réseau de l'école, / est la racine de cette machine.
		depart = racineHote;
		chemin = chemin.replace(/^\/+/, "") || ".";
	} else if (chemin.charAt(0) === "/"){
		throw new ShellError((cmd ? cmd + " : " : "") + "dans ce monde, tous les chemins partent de ta Maison.\n" +
			"Écris ~ pour la désigner (par exemple ~/ForetOuest) plutôt que de commencer par / .");
	}
	var lieu = depart;
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

/* Créer quelque chose dans un lieu demande le droit w sur ce lieu, comme sous Linux. */
Shell.verifierEcriture = function(lieu, io, cmd, nom){
	if (!Shell.bit(lieu, "w", io)){
		throw new ShellError(cmd + " : impossible de créer « " + nom + " » : Permission non accordée\n" +
			C.gris("(" + lieu.room_name + " appartient à " + lieu.owner + " et n'accorde pas le droit w : on ne peut rien y créer. " +
			"Écris plutôt chez toi, par exemple ~/" + nom + ".)"));
	}
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
	// On compte aussi comme découverts les lieux traversés pour arriver jusqu'ici.
	var traverse = new_room, garde = 0;
	while (traverse && garde++ < 100){
		state.visiter(traverse);
		traverse = traverse.parents[0];
	}
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
	r.node = Shell.suivre(r.node, "cd");
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
	var affiche = nom || noeud.toString();
	if (!estLieu && noeud.lien){
		return "lrwxrwxrwx  " + completerDroite(noeud.owner, 9) + " " + completerGauche(noeud.lien.length, 6) + "  " +
			(io.tty ? C.cyan(affiche) : affiche) + " -> " + noeud.lien;
	}
	var taille = estLieu ? (noeud.children.length + noeud.items.length) : noeud.getText().length;
	if (estLieu) affiche = io.tty ? C.bleu(affiche + "/") : affiche + "/";
	else if (io.tty && !noeud.person && noeud.mode.indexOf("x") > -1) affiche = C.vert(affiche);
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
		for (i = 0; i < objets.length; i++){
			if (objets[i].lien) lignes.push("  " + C.cyan(objets[i].itemname + "@") + C.gris("  (raccourci vers " + objets[i].lien + ")"));
			else if (objets[i].mode.indexOf("x") > -1 && !objets[i].person) lignes.push("  " + C.vert(objets[i].itemname + "*"));
			else lignes.push("  " + objets[i].itemname);
		}
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
		// ls LIEN montre le lieu vise ; ls -l LIEN montre le lien lui-meme, comme sous Linux.
		var vise = (r.node instanceof Item && r.node.lien && !p.opts.l) ? Shell.suivre(r.node, "ls") : r.node;
		if (vise instanceof Room){
			var lieu = vise;
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
	return Shell.cheminAffiche(current_room);
};

/* ------------------------------------------------------------------ */
/* Lire                                                                */
/* ------------------------------------------------------------------ */

/* Trouve un objet lisible, ou leve l'erreur qui convient. */
Shell.objetLisible = function(chemin, io, cmd){
	var r = Shell.chercher(chemin, io, cmd);
	if (r.node === null) throw new ShellError(Shell.introuvable(cmd, r.name, r.dir));
	r.node = Shell.suivre(r.node, cmd);
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
	for (var e = 0; e < erreurs.length; e++) io.err(erreurs[e]);
	return sortie.join("\n");
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
	var reponses = [];
	var a = p.reste;
	if (a.length < 2) throw new ShellError("mv : il faut dire quoi déplacer, puis où. Utilisation : mv OBJET DESTINATION");
	var dest = Shell.versLieu(Shell.chercher(a[a.length - 1], io, "mv"));
	var sources = a.slice(0, -1);
	var versLieu = dest.node instanceof Room;
	if (!versLieu && sources.length > 1){
		throw new ShellError("mv : pour déplacer plusieurs objets d'un coup, la destination doit être un lieu qui existe.");
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
		if (item.immuable){
			messages.push("mv : impossible de déplacer « " + item.itemname + " » : Opération non permise" + C.gris("  (attribut immuable : lsattr, puis sudo chattr -i)"));
			continue;
		}
		if (item.protege){
			messages.push("mv : ce monde tient trop à « " + item.itemname + " » pour le laisser bouger.");
			continue;
		}
		if (!(item.allows("mv") || (item.owner === JOUEUR && !item.acquis))){
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
		if (!Shell.bit(cible, "w", io) && !item.allows("mv")){
			messages.push("mv : impossible de déposer « " + item.itemname + " » dans " + cible.room_name + " : Permission non accordée");
			continue;
		}
		var occupant = cible.getNode(nouveauNom);
		if (occupant instanceof Room){
			messages.push("mv : « " + nouveauNom + " » est un lieu : impossible de le remplacer par un objet.");
			continue;
		}
		if (!versLieu) Shell.nomValide(nouveauNom, "mv");
		var deplacer = (function(item, depart, cible, nouveauNom, occupant){
			return function(){
				var ancienNom = item.itemname;
				var lignes = [];
				if (occupant !== null && occupant !== item){
					cible.removeItem(occupant);
					GameEvents.fire({ type: "rm", item: occupant, room: cible, ecrase: true });
					lignes.push("« " + nouveauNom + " » existait déjà : il a été remplacé, son ancien contenu est perdu." +
						(p.opts.i ? "" : C.gris(" (mv écrase sans prévenir. mv -i demande d'abord.)")));
				}
				depart.removeItem(item);
				item.itemname = nouveauNom;
				cible.addItem(item);
				if (item.allows("mv") && item.cmd_text["mv"]) lignes.unshift(item.cmd_text["mv"]);
				else if (cible === depart) lignes.unshift("Tu as renommé " + ancienNom + " en " + nouveauNom + ".");
				else lignes.unshift("Tu as déplacé " + ancienNom + " vers " + cible.room_name + "." +
					(nouveauNom !== ancienNom ? " Il s'appelle désormais " + nouveauNom + "." : ""));
				GameEvents.fire({ type: "mv", item: item, from: depart, to: cible, oldName: ancienNom });
				return lignes.join("\n");
			};
		})(item, r.dir, cible, nouveauNom, occupant);
		if (occupant !== null && occupant !== item){
			if (!Shell.bit(occupant, "w", io) && !io.sudo && occupant.owner !== JOUEUR){
				messages.push("mv : impossible d'écraser « " + nouveauNom + " » : Permission non accordée");
				continue;
			}
			try {
				messages.push(Shell.ecraser("mv", occupant, p.opts, deplacer));
			} catch (e){
				if (e instanceof ShellError){ messages.push(e.message); continue; }
				throw e;
			}
			continue;
		}
		messages.push(deplacer());
	}
	return messages.filter(function(m){ return m !== ""; }).join("\n");
};

/* Si la destination est un raccourci vers un lieu, on vise le lieu lui-meme. */
Shell.versLieu = function(r){
	if (r.node instanceof Item && r.node.lien){
		try {
			var vise = Shell.suivre(r.node, "");
			if (vise instanceof Room) return { dir: vise.parents[0] || vise, name: vise.room_name, node: vise };
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
		}
	}
	return r;
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
	if (lieu.owner !== JOUEUR || lieu.id){
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
		if (item.immuable){
			messages.push("rm : impossible de supprimer « " + item.itemname + " » : Opération non permise" + C.gris("  (attribut immuable : lsattr, puis sudo chattr -i)"));
			continue;
		}
		if (item.protege){
			messages.push("rm : ce monde tient trop à « " + item.itemname + " » pour le laisser disparaître.");
			continue;
		}
		if (!(item.allows("rm") || (item.owner === JOUEUR && !item.acquis) || parSudo)){
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

/*
 * Écraser un objet existant, comme le font cp et mv sous Linux : sans prévenir.
 * -i demande d'abord (interactive), -n n'écrase jamais (no-clobber).
 * faire() réalise l'écrasement et renvoie le message à afficher.
 */
Shell.ecraser = function(cmd, existant, opts, faire){
	if (existant.person || existant.lien || existant.protege){
		throw new ShellError(cmd + " : « " + existant.itemname + " » existe déjà, et ce monde refuse qu'on l'écrase.");
	}
	if (opts.n){
		GameEvents.fire({ type: "ecrasementEvite", item: existant, nom: existant.itemname, cmd: cmd });
		return "";
	}
	if (opts.i && !opts.f){
		term.demander(cmd + " : écraser « " + existant.itemname + " » ? (o/n) ", false, function(reponse){
			if (/^\s*[oOyY]/.test(reponse)){
				term.echo(faire());
			} else {
				term.echo("« " + existant.itemname + " » n'a pas été touché.");
				GameEvents.fire({ type: "ecrasementEvite", item: existant, nom: existant.itemname, cmd: cmd });
			}
			Shell.fin();
		});
		return "";
	}
	return faire();
};

Shell.sorts.cp = function(args, io){
	var p = lireOptions(args, "rRfivpn", "cp");
	if (p.reste.length !== 2) throw new ShellError("cp : il faut un original et un nom pour la copie. Utilisation : cp OBJET COPIE");
	var src = Shell.chercher(p.reste[0], io, "cp");
	if (src.node === null) throw new ShellError(Shell.introuvable("cp", src.name, src.dir));
	if (src.node instanceof Room) throw new ShellError("cp : « " + src.name + " » est un lieu ; copier un lieu entier dépasse tes pouvoirs.");
	var item = src.node;
	if (!Shell.bit(item, "r", io)) throw new ShellError("cp : impossible de lire « " + item.itemname + " » : Permission non accordée");
	if (item.person && !item.allows("cp")){
		throw new ShellError(item.cmd_text["cp"] || "On ne duplique pas les gens ! " + item.itemname + " te regarde de travers.");
	}
	var dest = Shell.versLieu(Shell.chercher(p.reste[1], io, "cp"));
	var cible, nom;
	// cp OBJET LIEU : si le lieu contient déjà un objet de ce nom, c'est lui qu'on remplace.
	if (dest.node instanceof Room && dest.node.getNode(item.itemname) instanceof Item){
		dest = { dir: dest.node, name: item.itemname, node: dest.node.getNode(item.itemname) };
	}
	if (dest.node instanceof Room){ cible = dest.node; nom = item.itemname; }
	else if (dest.node !== null){
		// Comme sous Linux, cp remplace le contenu d'un objet existant, si on a le droit d'y écrire.
		var existant = dest.node, dossier = dest.dir;
		if (existant === item) throw new ShellError("cp : « " + item.itemname + " » et « " + dest.name + " » sont le même objet");
		if (existant.immuable) Shell.verifierImmuable(existant, "cp");
		if (!Shell.bit(existant, "w", io)){
			throw new ShellError("cp : impossible d'écraser « " + dest.name + " » : Permission non accordée");
		}
		return Shell.ecraser("cp", existant, p.opts, function(){
			var ancien = existant.getText();
			existant.setText(item.getText());
			GameEvents.fire({ type: "write", item: existant, room: dossier, append: false, text: item.getText(), created: false, previous: ancien, ecrase: true });
			return "« " + existant.itemname + " » a été remplacé par une copie de " + item.itemname + ". Son ancien contenu est perdu." +
				(p.opts.i ? "" : C.gris("\n(cp écrase sans prévenir. cp -i demande d'abord.)"));
		});
	}
	else { cible = dest.dir; nom = dest.name; }
	if (cible.getNode(nom) !== null) throw new ShellError("cp : il y a déjà quelque chose qui s'appelle « " + nom + " » dans " + cible.room_name + ".");
	Shell.nomValide(nom, "cp");
	Shell.verifierEcriture(cible, io, "cp", nom);
	var copie = new Item(nom, item.getText());
	copie.picturename = item.picturename;
	copie.owner = io.sudo ? "root" : JOUEUR;
	copie.person = item.person;
	if (item.lien) copie.lien = item.lien;
	if (item.archive) copie.archive = JSON.parse(JSON.stringify(item.archive));
	if (item.binaire) copie.binaire = item.binaire;
	copie.sansFinDeLigne = !!item.sansFinDeLigne;
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
		Shell.verifierEcriture(r.dir, io, "mkdir", r.name);
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
		Shell.verifierEcriture(r.dir, io, "touch", r.name);
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
	for (var i = 0; i < 9; i++) bits.push(ancien.charAt(i) !== "-" && ancien.charAt(i) !== "S" && ancien.charAt(i) !== "T");
	// Les bits spéciaux : s à la place du x du propriétaire (SUID), t à la place du x des autres (sticky).
	var suid = /[sS]/.test(ancien.charAt(2));
	var sticky = /[tT]/.test(ancien.charAt(8));
	if (/^[0-7]?[0-7]{3}$/.test(expression)){
		var special = expression.length === 4 ? parseInt(expression.charAt(0), 10) : 0;
		var chiffres = expression.substring(expression.length - 3);
		suid = (special & 4) !== 0;
		sticky = (special & 1) !== 0;
		for (var d = 0; d < 3; d++){
			var chiffre = parseInt(chiffres.charAt(d), 10);
			bits[d * 3] = (chiffre & 4) !== 0;
			bits[d * 3 + 1] = (chiffre & 2) !== 0;
			bits[d * 3 + 2] = (chiffre & 1) !== 0;
		}
	} else {
		var clauses = expression.split(",");
		for (var c = 0; c < clauses.length; c++){
			var m = /^([ugoa]*)([+\-=])([rwxst]*)$/.exec(clauses[c]);
			if (!m){
				throw new ShellError(cmd + " : je ne comprends pas les droits « " + expression + " ».\n" +
					"Exemples : chmod +x LIEU, chmod u+rw OBJET, chmod 755 LIEU, chmod u-s OBJET");
			}
			var qui = m[1] === "" || m[1].indexOf("a") > -1 ? "ugo" : m[1];
			for (var q = 0; q < qui.length; q++){
				var base = "ugo".indexOf(qui.charAt(q)) * 3;
				if (m[2] === "="){
					bits[base] = bits[base + 1] = bits[base + 2] = false;
					if (qui.charAt(q) === "u") suid = false;
					if (qui.charAt(q) === "o") sticky = false;
				}
				for (var l = 0; l < m[3].length; l++){
					var lettre = m[3].charAt(l);
					if (lettre === "s"){ if (qui.charAt(q) === "u") suid = m[2] !== "-"; continue; }
					if (lettre === "t"){ if (qui.charAt(q) === "o" || m[1] === "") sticky = m[2] !== "-"; continue; }
					bits[base + "rwx".indexOf(lettre)] = m[2] !== "-";
				}
			}
		}
	}
	var mode = "";
	for (var b = 0; b < 9; b++){
		var lettreMode = bits[b] ? "rwx".charAt(b % 3) : "-";
		if (b === 2 && suid) lettreMode = bits[b] ? "s" : "S";
		if (b === 8 && sticky) lettreMode = bits[b] ? "t" : "T";
		mode += lettreMode;
	}
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
		if (r.node.immuable) Shell.verifierImmuable(r.node, "chmod");
		r.node.mode = appliquerMode(r.node.mode, expression, "chmod");
		GameEvents.fire({ type: "chmod", node: r.node, room: r.dir });
	}
	return "";
};

/* ------------------------------------------------------------------ */
/* Chercher                                                            */
/* ------------------------------------------------------------------ */

/* "rwsr-xr-x" devient 04755 : les droits sous forme de nombre, bits spéciaux compris. */
function modeEnNombre(mode){
	var n = 0;
	for (var i = 0; i < 9; i++){
		var c = mode.charAt(i);
		if (c !== "-" && c !== "S" && c !== "T") n |= 1 << (8 - i);
	}
	if (/[sS]/.test(mode.charAt(2))) n |= 2048;
	if (/[sS]/.test(mode.charAt(5))) n |= 1024;
	if (/[tT]/.test(mode.charAt(8))) n |= 512;
	return n;
}

/* -perm -4000 (tous ces bits), -perm /4000 (au moins un), -perm 755 (exactement), -perm -u=s. */
function lirePerm(texte){
	if (texte === undefined){
		throw new ShellError("find : -perm attend des droits, par exemple : find . -perm -4000 (les objets SUID)");
	}
	var prefixe = /^[-\/]/.test(texte) ? texte.charAt(0) : "";
	var corps = texte.substring(prefixe.length);
	var voulu;
	if (/^[0-7]{1,4}$/.test(corps)){
		voulu = parseInt(corps, 8);
	} else {
		voulu = 0;
		var clauses = corps.split(",");
		for (var c = 0; c < clauses.length; c++){
			var m = /^([ugoa]*)=([rwxst]+)$/.exec(clauses[c]);
			if (!m) throw new ShellError("find : droits « " + texte + " » incompris. Exemples : -perm -4000, -perm /u=s, -perm 755");
			var qui = m[1] === "" || m[1].indexOf("a") > -1 ? "ugo" : m[1];
			for (var q = 0; q < qui.length; q++){
				var decalage = (2 - "ugo".indexOf(qui.charAt(q))) * 3;
				for (var l = 0; l < m[2].length; l++){
					var lettre = m[2].charAt(l);
					if (lettre === "s") voulu |= qui.charAt(q) === "u" ? 2048 : (qui.charAt(q) === "g" ? 1024 : 0);
					else if (lettre === "t") voulu |= 512;
					else voulu |= (4 >> "rwx".indexOf(lettre)) << decalage;
				}
			}
		}
	}
	if (prefixe === "-") return function(n){ return (n & voulu) === voulu; };
	if (prefixe === "/") return function(n){ return voulu === 0 || (n & voulu) !== 0; };
	return function(n){ return n === voulu; };
}

Shell.sorts.find = function(args, io){
	var departs = [], i = 0;
	while (i < args.length && args[i].charAt(0) !== "-"){ departs.push(args[i]); i++; }
	if (departs.length === 0) departs = ["."];
	var nom = null, type = null, perm = null, utilisateur = null, age = null, plusRecentQue = null;
	for (; i < args.length; i++){
		if (args[i] === "-name" || args[i] === "-iname"){
			if (args[i + 1] === undefined) throw new ShellError("find : " + args[i] + " attend un nom, par exemple : find . -name \"flag*\"");
			var source = jokerVersRegExp(args[i + 1]).source;
			nom = new RegExp(source, args[i] === "-iname" ? "i" : "");
			i++;
		} else if (args[i] === "-perm"){
			perm = lirePerm(args[i + 1]);
			i++;
		} else if (args[i] === "-mtime"){
			var mm = /^([+-]?)(\d+)$/.exec(args[i + 1] || "");
			if (!mm) throw new ShellError("find : -mtime attend un nombre de jours, par exemple -mtime -1 (modifié il y a moins d'un jour)");
			age = { signe: mm[1], jours: parseInt(mm[2], 10) };
			i++;
		} else if (args[i] === "-newer"){
			var reference = Shell.chercher(args[i + 1] || "", io, "find");
			if (!(reference.node instanceof Item)) throw new ShellError("find : -newer attend un objet qui existe");
			plusRecentQue = reference.node;
			i++;
		} else if (args[i] === "-user"){
			if (args[i + 1] === undefined) throw new ShellError("find : -user attend un nom d'utilisateur, par exemple : find . -user root");
			utilisateur = args[i + 1];
			i++;
		} else if (args[i] === "-type"){
			if (args[i + 1] !== "d" && args[i + 1] !== "f") throw new ShellError("find : -type attend d (les lieux) ou f (les objets)");
			type = args[i + 1];
			i++;
		} else {
			throw new ShellError("find : critère inconnu « " + args[i] + " ». Ceux qui existent ici : -name NOM, -iname NOM, -type d, -type f, -user NOM, -perm DROITS, -mtime N, -newer OBJET");
		}
	}
	var lignes = [];
	function garder(nomNoeud, estLieu, noeud){
		if (type === "d" && !estLieu) return false;
		if (type === "f" && estLieu) return false;
		if (utilisateur !== null && (!noeud || noeud.owner !== utilisateur)) return false;
		if (perm !== null && (!noeud || !perm(modeEnNombre(noeud.mode)))) return false;
		if (age !== null || plusRecentQue !== null){
			if (!noeud || estLieu) return false;
			var a = noeud.age === undefined ? 40 : noeud.age;
			if (age !== null && !(age.signe === "-" ? a < age.jours : (age.signe === "+" ? a > age.jours : a === age.jours))) return false;
			if (plusRecentQue !== null){
				var ar = plusRecentQue.age === undefined ? 40 : plusRecentQue.age;
				if (!(a < ar || (a === ar && (noeud.heure || "09:00") > (plusRecentQue.heure || "09:00")))) return false;
			}
		}
		return nom === null || nom.test(nomNoeud);
	}
	function parcourir(lieu, chemin, profondeur){
		if (profondeur > 40) return;
		for (var k = 0; k < lieu.items.length; k++){
			if (garder(lieu.items[k].itemname, false, lieu.items[k])) lignes.push(chemin + "/" + lieu.items[k].itemname);
		}
		for (var j = 0; j < lieu.children.length; j++){
			var enfant = lieu.children[j];
			var sousChemin = chemin + "/" + enfant.room_name;
			if (garder(enfant.room_name, true, enfant)) lignes.push(io.tty ? C.bleu(sousChemin) : sousChemin);
			if (!Shell.peutFouiller(enfant)) continue;
			if (!Shell.bit(enfant, "x", io) || !Shell.bit(enfant, "r", io)){
				io.err("find : « " + sousChemin + " » : Permission non accordée");
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
			if (garder(r.node === current_room && racine === "." ? "." : r.node.room_name, true, r.node)) lignes.push(io.tty ? C.bleu(racine) : racine);
			parcourir(r.node, racine, 0);
		} else if (garder(r.node.itemname, false, r.node)){
			lignes.push(racine);
		}
	}
	GameEvents.fire({ type: "find", count: lignes.length, output: sansAnsi(lignes.join("\n")),
		suid: args.some(function(a, n){ return args[n - 1] === "-perm" && /4000|u=s/.test(a); }) });
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
	var procs = Shell.procsDeLHote().map(function(e){ return e.proc; }).sort(function(a, b){ return a.pid - b.pid; });
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
		var trouve = Shell.procsDeLHote().filter(function(e){ return e.proc.pid === pid; })[0];
		var proc = trouve ? trouve.proc : null;
		var salle = trouve ? trouve.lieu : current_room;
		if (proc === null){
			messages.push("kill : (" + pid + ") : Aucun processus de ce type");
			continue;
		}
		if (proc.owner !== JOUEUR && !io.sudo){
			messages.push("kill : (" + pid + ") : Opération non permise\n" +
				C.gris("(Ce processus appartient à " + proc.owner + ". On n'arrête que ses propres processus, à moins d'avoir les pouvoirs de root.)"));
			continue;
		}
		if (proc.noyau){
			messages.push("kill : (" + pid + ") : rien ne se passe. " + proc.name + " est un thread du noyau : il ignore les signaux.\n" +
				C.gris("(Grace, à la radio : « Pas celui-là. Le vrai noyau ne se tue pas. Cherche qui écoute sur le port suspect : ss. »)"));
			continue;
		}
		if (proc.sig9 && !force){
			messages.push(proc.ignoreText || ("Le processus " + pid + " (" + proc.name + ") reçoit ton signal TERM et l'ignore. Il faudra être moins poli : kill -9."));
			continue;
		}
		salle.procs.splice(salle.procs.indexOf(proc), 1);
		messages.push(proc.killText || ("Processus " + pid + " (" + proc.name + ") terminé."));
		GameEvents.fire({ type: "kill", proc: proc, room: salle, force: force });
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
	if (Shell.pile_ssh.length > 0){
		var retour = Shell.pile_ssh.pop();
		var quittee = Shell.hote();
		enterRoom(retour);
		return "Connexion à " + quittee + " fermée.\nTu es de retour dans " + current_room.toString() + ".";
	}
	return "On ne quitte pas Terminus si facilement. Ferme simplement l'onglet : ta partie est sauvegardée, tu la retrouveras en revenant.";
};

/*
 * logout : dans une connexion ssh, la ferme (comme exit). Sur la machine de départ, ferme
 * la session du joueur : sa partie est mise de côté sur cet ordinateur, et le joueur suivant
 * commence la sienne. En redonnant le même prénom, on retrouve sa partie.
 */
Shell.sorts.logout = function(args, io){
	if (Shell.pile_ssh.length > 0) return Shell.sorts.exit(args, io);
	if (!io.tty) throw new ShellError("logout : il faut un écran, pas de tuyau.");
	var qui = PROFIL.prenom || JOUEUR;
	term.demander("Fermer la session de " + qui + " ? Ta partie sera mise de côté sur cet ordinateur. Tape oui pour confirmer : ", false, function(reponse){
		if (String(reponse).trim().toLowerCase() !== "oui"){
			term.echo("La session reste ouverte.");
			return;
		}
		if (!mettreSessionDeCote()){
			term.echo(C.jaune("Impossible d'enregistrer ta partie sur cet ordinateur (stockage indisponible) : la session reste ouverte."));
			return;
		}
		term.echo("Session fermée. À bientôt, " + qui + " : pour reprendre, redonne simplement ton prénom au démarrage.");
		window.location.reload();
	});
	return "";
};

Shell.sorts.help = function(args, io){
	var connus = state.knownSpells();
	var lignes = [C.gras("Tes sorts (" + connus.length + " sur " + tousLesSorts().length + ") :")];
	for (var i = 0; i < connus.length; i++){
		lignes.push("  " + C.vert(completerDroite(connus[i], 9)) + MANUEL[connus[i]].resume);
	}
	lignes.push("");
	lignes.push("Pour le détail d'un sort : " + C.vert("man SORT") + " (par exemple man ls).");
	lignes.push("Ton journal de quêtes : " + C.vert("quetes") + ". Ton expérience et ta note : " + C.vert("xp") + ". Ton relevé de compétences : " + C.vert("bulletin") + ".");
	lignes.push("Bloqué ? " + C.vert("indice") + " donne un coup de pouce, de plus en plus précis (les paliers payants coûtent des points sur la note).");
	lignes.push("Tes succès : " + C.vert("succes") + ". Ton temps de jeu, étape par étape : " + C.vert("chrono") + ". Les chapitres : " + C.vert("chapitre") + ". Le son : " + C.vert("son") + ".");
	lignes.push("Laisser la place au joueur suivant (ta partie est gardée) : " + C.vert("logout") + ". Repartir de zéro : " + C.vert("recommencer") + ".");
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
	return state.journal(args[0]);
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
	// cd.. ou ls-l : il manque l'espace entre le sort et la suite.
	var colle = /^([a-z][a-z0-9-]*?)(\.\.?|-[A-Za-z0-9-]*|~.*|\.\/.*|\/.*)$/.exec(nom);
	if (colle && (Shell.sorts.hasOwnProperty(colle[1]) || SORTS_DU_JEU.indexOf(colle[1]) > -1) && !Shell.sorts.hasOwnProperty(nom)){
		return nom + " : sort inconnu. Il manque une espace entre le sort et la suite : " + colle[1] + " " + colle[2] + "\n" +
			C.gris("(Le terminal sépare les mots avec des espaces : sans elle, il cherche un sort qui s'appellerait « " + nom + " ».)");
	}
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

/* Les sorts que personne n'enseigne dès le départ : ils s'apprennent en cours d'histoire. */
var SORTS_APPRIS_EN_ROUTE = {
	"cp": "Il s'apprend auprès de l'Artisane, à l'Atelier du village, quand on lui apporte un Rouage.",
	"bash": "Il s'apprend auprès de l'Artisane, à l'Atelier du village, une fois ses rouages copiés.",
	"cowsay": "Ce n'est pas un sort mais un paquet : il s'installe avec sudo apt install cowsay (l'Affiche de la SalleDeCours explique apt).",
	"ss": "Il s'apprend au chapitre 2, en écoutant la Radio de la Crypte une fois arrivé dans la Racine.",
	"ssh-keygen": "Il s'apprend au chapitre 2, avec les ConsignesDuCoffre qu'Evi pose dans la SalleServeurs de Cybersup.",
	"tree": "Il s'apprend dans un drapeau caché de la SalleServeurs de Cybersup, ou en cadeau à la fin du chapitre 1."
};

/* Où apprendre un sort : on cherche dans le monde l'objet ou le personnage qui l'enseigne. */
Shell.ouApprendre = function(sort){
	if (SORTS_APPRIS_EN_ROUTE[sort]) return SORTS_APPRIS_EN_ROUTE[sort];
	for (var id in World.rooms){
		if (!World.rooms.hasOwnProperty(id)) continue;
		var lieu = World.rooms[id];
		for (var i = 0; i < lieu.items.length; i++){
			if (lieu.items[i].teaches.indexOf(sort) === -1) continue;
			var parent = lieu.parents[0];
			if (lieu.chapitre === 2 && !state.has("crypteOuverte")) return "Il s'apprend au chapitre 2, sous la Citadelle.";
			if (lieu === current_room) return lieu.items[i].itemname + " est juste ici et peut te l'apprendre : " +
				(lieu.items[i].person ? "parle-lui" : "lis-le") + " avec cat " + lieu.items[i].itemname + " (cat est connu dès le départ).";
			var machine = typeof racineDe === "function" ? racineDe(lieu) : null;
			if (machine) return "Il s'apprend " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
				", sur la machine " + machine.racineHote + " (ssh " + machine.racineHote + ")" + (lieu === machine ? "" : ", dans " + Shell.cheminAffiche(lieu)) + ".";
			return "Il s'apprend " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
				", dans " + lieu.room_name + (parent && parent !== Home ? " (du côté de " + parent.room_name + ")" : "") + ".";
		}
	}
	return "Quelqu'un, quelque part en ce monde, pourra te l'enseigner.";
};

Shell.appeler = function(nom, args, io){
	if (nom.indexOf("/") > -1) return Shell.lancerScript(nom, io, true);
	if (!Shell.sorts.hasOwnProperty(nom)){
		if (state.paquets[nom] && Shell.paquets[nom] && Shell.paquets[nom].lancer) return Shell.paquets[nom].lancer(args, io);
		throw new ShellError(Shell.sortInconnu(nom));
	}
	if (SORTS_DU_JEU.indexOf(nom) === -1 && !state.knows(nom)){
		throw new ShellError("Tu ne connais pas encore le sort « " + nom + " ». " + Shell.ouApprendre(nom));
	}
	// Presque toutes les commandes Linux acceptent --help : un aide-memoire sans passer par man.
	if (args.indexOf("--help") > -1 && MANUEL[nom]){
		GameEvents.fire({ type: "aide", spell: nom });
		return C.gras(nom) + " : " + MANUEL[nom].titre + "\n\n" + MANUEL[nom].page;
	}
	var sortie = Shell.sorts[nom](args, io);
	if (MANUEL[nom]) state.premierUsage(nom);
	return sortie;
};

/* Fait tourner une fonction en recuperant ce qu'elle aurait affiche a l'ecran. */
Shell.capturer = function(fonction){
	var vraiEcho = term.echo;
	var tampon = [];
	term.echo = function(texte){ tampon.push(String(texte)); };
	try {
		fonction();
	} finally {
		term.echo = vraiEcho;
	}
	return tampon.join("\n");
};

/* Un script est un objet dont chaque ligne est un sort. ./script demande le droit x. */
Shell.lancerScript = function(chemin, io, direct){
	if (!state.knows("bash")){
		throw new ShellError(direct ?
			chemin + " : tu ne sais pas encore lancer un script. Quelqu'un qui automatise son travail pourra te l'apprendre." :
			"Tu ne connais pas encore le sort « bash ». " + Shell.ouApprendre("bash"));
	}
	var r = Shell.chercher(chemin, io, "bash");
	if (r.node === null) throw new ShellError("bash : " + chemin + " : aucun objet de ce nom");
	var script = Shell.suivre(r.node, "bash");
	if (script instanceof Room) throw new ShellError("bash : " + chemin + " : c'est un lieu, pas un script");
	if (script.person) throw new ShellError(script.itemname + " n'est pas un script, et n'apprécie pas qu'on essaie de l'exécuter.");
	// Un binaire se lance directement (./nom) ; bash ne sait pas le lire.
	if (script.binaire){
		if (!direct) throw new ShellError("bash : " + chemin + " : impossible d'exécuter un fichier binaire\n" +
			C.gris("(C'est un programme compilé, pas un script : on le lance avec ./" + script.itemname + ".)"));
		if (!(io.sudo ? script.mode.indexOf("x") > -1 || script.mode.indexOf("s") > -1 : Shell.bit(script, "x", null))){
			throw new ShellError("bash : " + chemin + " : Permission non accordée");
		}
		GameEvents.fire({ type: "script", item: script, room: r.dir, direct: true, binaire: true });
		return script.binaire.sortie;
	}
	if (!Shell.bit(script, "r", io)) throw new ShellError("bash : " + chemin + " : Permission non accordée");
	if (direct && !(io.sudo ? script.mode.indexOf("x") > -1 : Shell.bit(script, "x", null))){
		throw new ShellError("bash : " + chemin + " : Permission non accordée\n" +
			C.gris("(Cet objet n'a pas le droit x, celui d'être exécuté : regarde avec ls -l. Donne-le-lui avec chmod +x " + script.itemname +
			", ou lance-le sans ce droit avec bash " + script.itemname + ".)"));
	}
	if (Shell.profondeur_script >= 3) throw new ShellError("bash : trop de scripts emboîtés, j'arrête là avant la boucle infinie.");
	var lignes = lignesDe(script.getText());
	if (lignes.length > 60) throw new ShellError("bash : " + chemin + " : ce n'est pas un script, c'est un roman. (Plus de 60 lignes.)");
	Shell.profondeur_script++;
	var sortie;
	try {
		sortie = Shell.capturer(function(){
			for (var i = 0; i < lignes.length; i++){
				var ligne = lignes[i].trim();
				if (ligne === "" || ligne.charAt(0) === "#") continue; // les lignes en # sont des commentaires
				var jetons;
				try {
					jetons = Shell.decouper(ligne);
				} catch (e){
					if (e instanceof ShellError){ term.echo(script.itemname + " : ligne " + (i + 1) + " : " + e.message); continue; }
					throw e;
				}
				Shell.lancer(jetons);
			}
		});
	} finally {
		Shell.profondeur_script--;
	}
	state.premierUsage("bash");
	GameEvents.fire({ type: "script", item: script, room: r.dir, direct: !!direct });
	return sortie;
};

/* Ecrit dans un objet (redirections > et >>). */
Shell.ecrire = function(cible, texte, ajout, sansFin){
	// Le trou noir du système : tout ce qu'on y écrit disparaît.
	if (cible === "/dev/null"){
		GameEvents.fire({ type: "devnull" });
		return;
	}
	var r = Shell.chercher(cible, { sudo: false }, "écriture");
	if (r.node instanceof Room) throw new ShellError("Impossible d'écrire dans « " + r.name + " » : c'est un lieu.");
	if (r.node === null){
		Shell.nomValide(r.name, "écriture");
		Shell.verifierEcriture(r.dir, null, "écriture", r.name);
		var item = new Item(r.name, texte);
		item.owner = JOUEUR;
		item.sansFinDeLigne = !!sansFin;
		r.dir.addItem(item);
		GameEvents.fire({ type: "write", item: item, room: r.dir, append: ajout, text: texte, created: true, previous: "" });
		return;
	}
	if (r.node.immuable) Shell.verifierImmuable(r.node, "écriture");
	// Comme sous Linux, c'est le terminal (et non sudo) qui ouvre le fichier : pas de passe-droit ici.
	if (!Shell.bit(r.node, "w", null)){
		throw new ShellError("Impossible d'écrire dans « " + r.name + " » : Permission non accordée");
	}
	var ancien = r.node.getText();
	r.node.setText(ajout ? (ancien === "" ? texte : ancien.replace(/\n$/, "") + (r.node.sansFinDeLigne ? "" : "\n") + texte) : texte);
	r.node.sansFinDeLigne = !!sansFin;
	GameEvents.fire({ type: "write", item: r.node, room: r.dir, append: ajout, text: texte, created: false, previous: ancien });
};

/* Lance un tuyau : sort1 | sort2 | sort3 [> objet]. Renvoie vrai si tout s'est bien passe. */
/*
 * Lance un tuyau : sort1 | sort2 | sort3, avec ses redirections. Renvoie vrai si tout s'est bien passé.
 *
 * Chaque sort a deux sorties : la 1 (normale) et la 2 (les erreurs). Par défaut, la 1 va dans le
 * tuyau (ou à l'écran pour le dernier sort) et la 2 à l'écran. Les redirections se lisent de
 * gauche à droite, comme sous bash : « 2>&1 > f » laisse les erreurs à l'écran, « > f 2>&1 »
 * envoie tout dans f.
 */
var OPERATEURS_FICHIER = { ">": [1], ">>": [1], "2>": [2], "2>>": [2], "&>": [1, 2], "&>>": [1, 2] };

Shell.tuyau = function(jetons){
	var segments = [[]];
	for (var i = 0; i < jetons.length; i++){
		if (jetons[i].t === "op" && jetons[i].v === "|") segments.push([]);
		else segments[segments.length - 1].push(jetons[i]);
	}
	var stdin = null, stdinSansFin = false;
	var noms = [];
	var echec = false;
	var sortieFinale = "", finaleALEcran = false;
	try {
		for (var s = 0; s < segments.length; s++){
			var argv = [];
			var seg = segments[s];
			var dernier = s === segments.length - 1;
			var sorties = { 1: dernier ? { t: "ecran" } : { t: "tuyau" }, 2: { t: "ecran" } };
			for (var k = 0; k < seg.length; k++){
				var jeton = seg[k];
				if (jeton.t !== "op"){
					if (jeton.joker) argv = argv.concat(Shell.developper(jeton.v));
					else argv.push(jeton.v);
					continue;
				}
				if (jeton.v === "2>&1"){ sorties[2] = sorties[1]; continue; }
				if (jeton.v === "1>&2"){ sorties[1] = sorties[2]; continue; }
				if (jeton.v === "1>&1" || jeton.v === "2>&2") continue;
				var fds = OPERATEURS_FICHIER[jeton.v];
				if (!fds) throw new ShellError("Redirection inconnue : " + jeton.v);
				if (!seg[k + 1] || seg[k + 1].t !== "mot"){
					throw new ShellError("Après " + jeton.v + " il faut le nom de l'objet dans lequel écrire (ou /dev/null pour tout jeter).");
				}
				var fichier = { t: "fichier", cible: seg[k + 1].v, ajout: jeton.v.slice(-2) === ">>" };
				for (var f = 0; f < fds.length; f++) sorties[fds[f]] = fichier;
				k++;
			}
			if (argv.length === 0) throw new ShellError("Il manque un sort " + (s === 0 ? "avant" : "après") + " le tuyau |.");
			// Un alias remplace le premier mot par le texte qu'on lui a associe.
			if (state.alias.hasOwnProperty(argv[0])){
				var remplacement = Shell.decouper(state.alias[argv[0]]).filter(function(j){ return j.t === "mot"; }).map(function(j){ return j.v; });
				argv = remplacement.concat(argv.slice(1));
				if (argv.length === 0) throw new ShellError("Cet alias est vide.");
			}
			// NOM=valeur, tout seul sur la ligne, range une valeur dans une variable.
			if (argv.length === 1 && segments.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])){
				Shell.definirVariable(argv[0], "");
				return true;
			}
			var io = { stdin: stdin, stdinSansFin: stdinSansFin, tty: sorties[1].t === "ecran", sudo: false, erreurs: [] };
			io.err = (function(liste){ return function(message){ liste.push(message); }; })(io.erreurs);
			var nom = argv[0], args = argv.slice(1);
			if (nom === "sudo"){
				if (!state.knows("sudo")){
					throw new ShellError("Tu ne connais pas encore le sort « sudo ». Les légendes disent qu'il confère tous les pouvoirs...");
				}
				if (args.length === 0) throw new ShellError("sudo : quel sort veux-tu lancer avec les pleins pouvoirs ? Utilisation : sudo SORT");
				if (!state.has("sudoOK")) throw new ShellError("sudo : mot de passe requis.");
				io.sudo = true;
				state.premierUsage("sudo");
				nom = args[0];
				args = args.slice(1);
			}
			noms.push(nom);
			var sortie;
			// Une erreur part par la sortie 2, là où elle pointe ; le tuyau continue, comme sous bash.
			try {
				sortie = Shell.appeler(nom, args, io);
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				io.erreurs.push(e.message);
				sortie = "";
				echec = true;
				if (sorties[2].t === "ecran") jouerSon("erreur");
			}
			var texte = (sortie === undefined || sortie === null) ? "" : String(sortie);
			if (!io.tty) texte = sansAnsi(texte);
			var sansFin = nom === "echo" && args[0] === "-n";
			var erreurs = io.erreurs.length ? io.erreurs.join("\n") : null;

			// On range chaque morceau là où pointe sa sortie : écran, tuyau ou objet.
			var versTuyau = [], versFichiers = [];
			function ranger(cible, morceau, estErreur){
				if (cible.t === "ecran"){
					if (estErreur) term.echo(morceau);
					else { sortieFinale = morceau; finaleALEcran = true; }
				} else if (cible.t === "tuyau"){
					versTuyau.push(estErreur ? sansAnsi(morceau) : morceau);
				} else {
					var deja = versFichiers.filter(function(v){ return v.cible === cible; })[0];
					if (deja) deja.morceaux.push(sansAnsi(morceau));
					else versFichiers.push({ cible: cible, morceaux: [sansAnsi(morceau)], sansFin: !estErreur && sansFin });
				}
			}
			if (erreurs !== null) ranger(sorties[2], erreurs, true);
			ranger(sorties[1], texte, false);
			// Un objet visé par une redirection est créé (ou vidé) même s'il n'y a rien à y écrire.
			[1, 2].forEach(function(n){
				var c = sorties[n];
				if (c.t === "fichier" && !versFichiers.some(function(v){ return v.cible === c; })) versFichiers.push({ cible: c, morceaux: [], sansFin: false });
			});
			versFichiers.forEach(function(v){
				var contenu = v.morceaux.filter(function(m){ return m !== ""; }).join("\n");
				if (contenu === "" && v.cible.ajout) return;
				Shell.ecrire(v.cible.cible, contenu, v.cible.ajout, v.sansFin && !v.cible.ajout);
			});
			stdin = versTuyau.filter(function(m){ return m !== ""; }).join("\n");
			stdinSansFin = sansFin && sorties[1].t === "tuyau";
			GameEvents.fire({ type: "stderr", name: nom, room: current_room, count: io.erreurs.length,
				destination: sorties[2].t === "ecran" ? null : (sorties[2] === sorties[1] || sorties[2].t === "tuyau" ? "&1" : sorties[2].cible),
				args: args, sudo: io.sudo });
		}
		if (finaleALEcran){
			if (sortieFinale !== "") term.echo(sortieFinale);
			if (noms[noms.length - 1] === "echo"){
				GameEvents.fire({ type: "echo", text: sansAnsi(sortieFinale), room: current_room });
			}
		}
		if (noms.length > 1) GameEvents.fire({ type: "pipeline", names: noms, room: current_room, output: sansAnsi(finaleALEcran ? sortieFinale : stdin) });
		return !echec;
	} catch (e){
		if (e instanceof ShellError){
			term.echo(e.message);
			jouerSon("erreur");
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
	if (Shell.variable_developpee){
		Shell.variable_developpee = false;
		GameEvents.fire({ type: "variable", line: Shell.historique[Shell.historique.length - 1] || "" });
	}
	verifierMonde();
	state.verifierSucces();
	state.bilanXP();
	while (Shell.narration.length){
		term.echo(Shell.narration.shift());
	}
	if (typeof majEtat === "function") majEtat();
	term.definirInvite(Shell.invite());
	state.save();
};

Shell.invite = function(){
	var chemin = Shell.cheminAffiche(current_room);
	var morceaux = chemin.split("/");
	if (morceaux.length > 3) chemin = "…/" + morceaux.slice(-2).join("/");
	return C.vert(JOUEUR + "@" + Shell.hote()) + ":" + C.bleu(chemin) + "$ ";
};

/* Point d'entree : appele par Game.js pour chaque ligne validee. */
Shell.executer = function(ligne){
	if (ligne.trim() === "") return;
	// !! rejoue le sort precedent (sudo !! est un grand classique).
	if (ligne.indexOf("!!") > -1){
		if (Shell.historique.length === 0){ term.echo("!! : aucun sort précédent à relancer."); return; }
		ligne = ligne.split("!!").join(Shell.historique[Shell.historique.length - 1]);
		term.echo(C.gris(ligne));
		GameEvents.fire({ type: "bangbang" });
	}
	Shell.historique.push(ligne);
	state.nbCommandes++;
	Shell.variable_developpee = false;
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
		for (var nomAlias in state.alias){
			if (state.alias.hasOwnProperty(nomAlias) && sorts.indexOf(nomAlias) === -1) sorts.push(nomAlias);
		}
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
			if (nomObjet.indexOf(motif) === 0 && (motif.charAt(0) === "." || nomObjet.charAt(0) !== ".")){
				var versLieu = false;
				if (lieu.items[k].lien){
					try { versLieu = Shell.suivre(lieu.items[k], "") instanceof Room; } catch (e){ versLieu = false; }
				}
				candidats.push(nomObjet + (versLieu ? "/" : " "));
			}
		}
	}
	if (candidats.length === 0) return null;
	if (candidats.length === 1) return { valeur: debut + base + candidats[0], choix: candidats };
	var commun = prefixeCommun(candidats);
	return { valeur: debut + base + commun, choix: candidats.map(function(c){ return c.replace(/ $/, ""); }) };
};
