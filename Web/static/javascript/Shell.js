/**
 * Shell.js : les sorts de base, et la mécanique d'un tuyau.
 *
 * La lecture des lignes (if, for, while, $(...), variables, here-documents...) est le
 * travail d'Interpreteur.js, chargé juste après ce fichier. Ici, Shell.tuyau lance un
 * tuyau (sort1 | sort2 > objet), Shell.appeler lance un sort, et les sorts vivent dans
 * Shell.sorts. Chaque sort recoit ses arguments et un objet "io" :
 *   io.stdin : ce que le sort precedent a envoye dans le tuyau (ou null)
 *   io.tty   : vrai si la sortie va a l'ecran (faux dans un tuyau ou une redirection)
 *   io.sudo  : vrai si le sort est lance avec sudo
 *   io.code  : le statut de sortie que le sort peut poser (0 par défaut ; grep sans résultat pose 1)
 * Un sort renvoie son texte de sortie, ou leve une ShellError (statut 1, ou son code).
 */

var GameEvents = new EventTarget();

/* Couleurs ANSI, comme dans un vrai terminal. */
var C = (function(){
	function couleur(code){
		return function(texte){ return "\x1b[" + code + "m" + texte + "\x1b[0m"; };
	}
	return {
		gras: couleur("1"), rouge: couleur("31"), vert: couleur("32"), jaune: couleur("33"),
		bleu: couleur("1;34"), magenta: couleur("35"), cyan: couleur("36"), gris: couleur("90"), etiquette: couleur("7")
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
	variable_developpee: false,
	statut: 0,               // le statut de la dernière commande, lu par $?
	statutsTuyau: [0],       // le statut de chaque sort du dernier tuyau
	saisieEnCours: null      // une commande commencée sur plusieurs lignes (invite « > »)
};

/* Où s'affichent la sortie normale et les erreurs. Interpreteur.js les redirige quand il faut
 * capturer une sortie ($(...), un script envoyé dans un objet) ; par défaut, c'est l'écran. */
Shell.ecranSortie = function(texte){ if (texte !== "") term.echo(texte); };
Shell.ecranErreur = function(texte){ term.echo(texte); };
Shell.surEcran = function(){ return true; };
/* Où est née une erreur : dans un script, Interpreteur.js la préfixe de « script.sh : ligne N : », comme bash. */
Shell.situer = function(message){ return message; };

/* Valeur d'une variable d'environnement ($USER, $HOME, $PWD...). */
Shell.variable = function(nom){
	if (nom === "PWD") return current_room.path();
	if (nom === "USER" || nom === "LOGNAME") return JOUEUR;
	if (nom === "HOSTNAME") return Shell.hote();
	if (nom === "UID" && !state.env.hasOwnProperty(nom) && typeof UTILISATEURS !== "undefined" && UTILISATEURS.hasOwnProperty(JOUEUR)) return String(UTILISATEURS[JOUEUR]);
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
	if (typeof radioSOC === "function") radioSOC(texte);
}

/* Sorts toujours disponibles : ce sont des commandes du jeu, pas de Linux. */
var COMMANDES_DU_JEU = [
	["quetes", "ton journal de quêtes"], ["indice", "un coup de pouce quand tu es bloqué (les paliers payants coûtent des points)"],
	["xp", "ton expérience et ta note"], ["bulletin", "ton relevé de compétences"], ["succes", "tes succès"], ["chrono", "ton temps de jeu, étape par étape"],
	["chapitre", "les chapitres"], ["carte", "la carte des lieux visités"], ["schema", "la carte du réseau de l'école (chapitre 2)"],
	["traque", "ton tableau de chasse au Corbeau (chapitre 3)"], ["son", "le son"], ["crt on/off", "le vieil écran"],
	["logout", "fermer ta session (ta partie reste dans ton compte)"], ["recommencer", "repartir de zéro, avec le même compte"]];
/* Le manuel des commandes du jeu : on dit franchement qu'elles ne sont pas de Linux. */
var MANUEL_DU_JEU = {
	schema: "schema n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou xp.\n" +
		"Elle dessine le réseau de l'école pendant la panne (chapitre 2) : en vert ce qui marche, en rouge ce qui est en panne,\n" +
		"et dans la brume ce que tu n'as pas encore exploré.\n\n" +
		"Sur un vrai Linux, personne ne te dessine le réseau : tu le reconstitues toi-même avec les vraies commandes,\n" +
		"ip a (ton adresse), ip r (tes routes), ping (qui répond), dig (les noms), traceroute (le chemin).",
	traque: "traque n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou xp.\n" +
		"Elle affiche ton tableau de chasse au Corbeau (chapitre 3) : chaque machine de l'école, en rouge si le Corbeau\n" +
		"y a encore laissé quelque chose, en vert si tu l'as nettoyée, et les trophées gagnés.\n\n" +
		"Dans la vraie vie, un analyste tient ce tableau lui-même, dans un fichier ou un ticket d'incident : la liste des\n" +
		"machines touchées, ce qui a été trouvé, ce qui a été corrigé. Les vraies commandes, ce sont celles qui le remplissent :\n" +
		"nmap, who, last, ss, sha256sum, find..."
};
var SORTS_DU_JEU = ["quetes", "indice", "chapitre", "xp", "score", "bulletin", "succes", "chrono", "son", "crt", "carte", "schema", "recommencer", "logout", "sorts", "aide"];

/* Vraies commandes Linux absentes de ce monde : on le dit gentiment. */
var COMMANDES_REELLES = ["vi", "vim", "nano", "emacs", "apt-get", "yum", "dnf", "pacman", "scp",
	"curl", "wget", "git", "python", "python3", "zsh", "htop", "zip", "unzip", "gzip", "chgrp", "su", "awk", "sed", "tr", "more",
	"which", "whereis", "locate", "cal", "uname", "who", "w", "free",
	"mount", "systemctl", "service", "ip", "ifconfig", "netstat", "ss", "nmap", "make", "gcc", "node", "docker",
	"reboot", "shutdown", "killall", "pkill", "xargs", "tee", "file", "stat",
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
				throw Shell.apostropheFrancaise(ligne, ouverture) || new ShellError("Il manque un guillemet fermant : " + guillemet);
			}
			i++;
			continue;
		}
		if (c === "\\" && i + 1 < n){ commencer(); mot.v += ligne.charAt(i + 1); i += 2; continue; }
		if (c === "$" && variable()) continue;
		if (c === "|"){
			finir();
			if (ligne.charAt(i + 1) === "|"){ jetons.push({ t: "op", v: "||" }); i += 2; continue; }
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
	// Le texte d'origine voyage avec les jetons : Shell.lancer le confie à l'interpréteur.
	jetons.source = ligne;
	return jetons;
};

/*
 * L'apostrophe d'un mot français (s'appelle, l'épée) ouvre une citation que rien ne ferme.
 * Renvoie l'erreur expliquée, ou null si l'apostrophe n'est pas collée à une lettre.
 */
Shell.apostropheFrancaise = function(ligne, ouverture){
	if (ligne.charAt(ouverture) !== "'" || !/[A-Za-zÀ-ÿ]/.test(ligne.charAt(ouverture - 1) || "")) return null;
	var n = ligne.length;
	var debutMot = ligne.lastIndexOf(" ", ouverture) + 1;
	var finMot = ligne.indexOf(" ", ouverture);
	var motFautif = ligne.substring(debutMot, finMot === -1 ? n : finMot);
	return new ShellError("Il manque un guillemet fermant : '\n" +
		C.gris("(Pour le terminal, l'apostrophe de « " + motFautif + " » ouvre une citation que rien ne referme. " +
		"Entoure toute la phrase de guillemets doubles, par exemple : echo \"" + ligne.replace(/^\s*\S+\s+/, "").replace(/"/g, "") + "\", " +
		"ou protège l'apostrophe avec une barre oblique inverse : " + motFautif.replace("'", "\\'") + ")"));
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
	if (!proche && lieu && nom.length > 3 && !(sansAccents(nom) !== nom && lieu.getNodeIgnoringCase(sansAccents(nom)))){
		// Une lettre de trop, de moins ou inversée : on propose le nom qui existe.
		var noms = lieu.children.map(function(r){ return r.room_name; }).concat(lieu.items.map(function(o){ return o.itemname; }));
		var voisin = noms.filter(function(n){ return distanceUn(nom, n) || distanceUn(nom.toLowerCase(), n.toLowerCase()); })[0];
		if (voisin){
			proposer(nom, voisin);
			return (cmd ? cmd + " : " : "") + "« " + nom + " » : aucun lieu ni objet de ce nom ici\n" + C.gris("(Tu voulais dire « " + voisin + " » ? Tab l'écrit pour toi.)");
		}
	}
	if (proche){
		proposer(nom, proche.toString().replace(/\/$/, ""));
		message += "\n" + C.gris("(Sous Linux, majuscules et minuscules comptent : il existe « " + proche.toString() + " ».)");
	} else if (lieu && sansAccents(nom) !== nom){
		var sansAccent = lieu.getNodeIgnoringCase(sansAccents(nom));
		if (sansAccent){
			message += "\n" + C.gris("(Les noms de ce monde s'écrivent sans accents, comme souvent sous Linux : « " + sansAccent.toString() + " ».)");
			proposer(nom, sansAccent.toString().replace(/\/$/, ""));
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

/* La racine « / » de la machine où se trouve un lieu : une machine du réseau, ou la Citadelle pendant la Crypte. */
Shell.racineAbsolue = function(lieu){
	var racine = typeof racineDe === "function" ? racineDe(lieu) : null;
	if (racine) return racine;
	if (typeof Citadelle === "undefined" || typeof state === "undefined" || !state.has("reseauOuvert")) return null;
	for (var l = lieu, garde = 0; l && garde++ < 100; l = l.parents[0]){
		if (l === Citadelle) return Citadelle;
	}
	return null;
};

Shell.chercherDepuis = function(depart, chemin, io, cmd){
	if (chemin === "") throw new ShellError((cmd ? cmd + " : " : "") + "chemin vide");
	var racineHote = chemin.charAt(0) === "/" ? Shell.racineAbsolue(depart) : null;
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
	montrerImage(new_room.room_pic, new_room.room_name); // l'image du lieu s'affiche dès l'arrivée
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

/* Changer de machine sans passer par ssh (cd ~ depuis une connexion) referme les connexions ouvertes. */
Shell.sorts.cd = function(args, io){
	var hoteAvant = Shell.hote();
	var sortie = Shell.cdSimple(args, io);
	if (Shell.pile_ssh.length > 0 && Shell.hote() !== hoteAvant){
		Shell.pile_ssh = [];
		sortie += "\n" + C.gris("(Tu étais connecté à " + hoteAvant + " par ssh. Sur une vraie machine, ~ désignerait ton dossier sur " + hoteAvant +
			" ; ici, ta Maison est sur ta machine de départ : la connexion à " + hoteAvant + " est donc fermée.)");
	}
	return sortie;
};

/* Comme le vrai cd, il ne dit rien quand sa sortie ne va pas à l'écran (un script capturé, un $(...)). */
Shell.cdSimple = function(args, io){
	if (io.sudo){
		throw new ShellError("sudo : cd : commande introuvable\n" +
			C.gris("(Piège classique : cd n'est pas un programme mais un sort intégré au terminal, sudo ne peut donc pas le lancer.\n" +
			"Avec les pleins pouvoirs on regarde de loin : sudo ls LIEU, sudo cat LIEU/OBJET.)"));
	}
	if (args.length > 1) throw new ShellError("cd : tu ne peux pas aller à plusieurs endroits à la fois.");
	if (args.length === 0 || args[0] === "~"){
		enterRoom(Home);
		return !io.tty ? "" : "Te voilà de retour à la Maison !";
	}
	if (args[0] === "-"){
		if (!Shell.lieu_precedent) throw new ShellError("cd : tu n'as encore quitté aucun lieu.");
		enterRoom(Shell.lieu_precedent);
		return !io.tty ? "" : "Tu es de retour dans " + current_room.toString() + ". " + current_room.intro_text;
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
	return !io.tty ? "" : "Tu es maintenant dans " + current_room.toString() + ". " + current_room.intro_text;
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
	// -t : du plus récent au plus ancien (l'âge en jours, puis l'heure ; à égalité, le dernier arrivé d'abord). -r renverse.
	function parDate(liste, tous){
		return liste.map(function(n){ return { n: n, a: n.age === undefined ? 40 : n.age, h: n.heure || "09:00", k: tous.indexOf(n) }; })
			.sort(function(x, y){ return x.a - y.a || (x.h < y.h ? 1 : x.h > y.h ? -1 : 0) || y.k - x.k; }).map(function(x){ return x.n; });
	}
	if (opts.t){ lieux = parDate(lieux, lieu.children); objets = parDate(objets, lieu.items); }
	if (opts.r){ lieux.reverse(); objets.reverse(); }
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
	var p = lireOptions(args.filter(function(a){ return a !== "-1"; }), "alhAFtr", "ls");
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

/* Quand on parle à quelqu'un, son nom s'affiche en tête de réplique, comme dans un jeu de rôle. */
Shell.etiquette = function(trouve, io){
	if (!trouve || !trouve.item.person || !io.tty) return "";
	return C.etiquette(trouve.item.itemname) + "\n";
};

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
		return Shell.etiquette(trouve, io) + affiche + "\n" + C.gris("-- Fin de la première page. Ce texte compte " + lignes.length +
			" lignes : c'est trop pour tout dérouler ici.\n-- cat affiche tout d'un coup ; les mages préfèrent lire par morceaux (head, tail) ou chercher un mot (grep).");
	}
	if (trouve) Shell.apresLecture(trouve, affiche, "less", io);
	return affiche === "" ? C.gris("(vide)") : Shell.etiquette(trouve, io) + affiche;
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
	if (p.reste.length === 1 && !p.opts.n) tout = Shell.etiquette(Shell.objetLisible(p.reste[0], io, "cat"), io) + tout;
	if (p.opts.n){
		var lignes = lignesDe(tout);
		for (var k = 0; k < lignes.length; k++) lignes[k] = completerGauche(k + 1, 6) + "  " + lignes[k];
		tout = lignes.join("\n");
	}
	return tout;
};

/* head, tail, wc, grep, sort et uniq sont dans Texte.js. */

Shell.sorts.echo = function(args, io){
	var lire = false, sansFin = false, i = 0;
	while (i < args.length && /^-[neE]+$/.test(args[i])){
		if (args[i].indexOf("n") > -1) sansFin = true;
		for (var k = 1; k < args[i].length; k++){
			if (args[i].charAt(k) === "e") lire = true;
			if (args[i].charAt(k) === "E") lire = false;
		}
		i++;
	}
	var texte = args.slice(i).join(" ");
	if (lire){
		var r = echappements(texte);
		texte = r.texte;
		if (r.arret) sansFin = true;
	}
	if (sansFin) io.sansFin = true;
	else if (texte === "") io.ligneVide = true; // echo tout seul écrit une ligne vide
	return texte;
};

/* Les caractères spéciaux d'echo -e et de printf : \n, \t, \\, \0NNN, \xHH... \c arrête tout. */
function echappements(texte){
	var sortie = "", i = 0, m;
	var simples = { "n": "\n", "t": "\t", "\\": "\\", "a": "\x07", "b": "\b", "r": "\r", "v": "\v", "f": "\f", "e": "\x1b", "E": "\x1b", "\"": "\"", "'": "'" };
	while (i < texte.length){
		var c = texte.charAt(i);
		if (c !== "\\" || i + 1 >= texte.length){ sortie += c; i++; continue; }
		var s = texte.charAt(i + 1), reste = texte.substring(i + 1);
		if (s === "c") return { texte: sortie, arret: true };
		if (simples.hasOwnProperty(s)){ sortie += simples[s]; i += 2; continue; }
		if ((m = /^0([0-7]{0,3})/.exec(reste)) || (m = /^([0-7]{1,3})/.exec(reste))){
			sortie += String.fromCharCode(parseInt(m[1] || "0", 8));
			i += 1 + m[0].length;
			continue;
		}
		if ((m = /^x([0-9A-Fa-f]{1,2})/.exec(reste))){
			sortie += String.fromCharCode(parseInt(m[1], 16));
			i += 1 + m[0].length;
			continue;
		}
		sortie += c;
		i++;
	}
	return { texte: sortie, arret: false };
}

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
		// Sur une vraie machine (l'épreuve finale, ou un serveur du réseau comme archives), root (sudo)
		// déplace ce qu'il veut, et personne ne dépose dans un dossier où il n'a pas le droit d'écrire.
		var machine = (typeof examenEnCours === "function" && examenEnCours()) || (typeof racineDe === "function" && !!racineDe(current_room));
		if (!(item.allows("mv") || (item.owner === JOUEUR && !item.acquis) || (machine && io.sudo && !item.person))){
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
		if (!Shell.bit(cible, "w", io) && (!item.allows("mv") || machine)){
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
	if (lieu.owner !== JOUEUR){
		return cmd + " : impossible de supprimer « " + lieu.room_name + " » : ce lieu ne t'appartient pas.";
	}
	if (lieu.id){
		return cmd + " : « " + lieu.room_name + " » fait partie du monde : il reste en place (seuls les dossiers que tu as créés se suppriment).";
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
		// Comme le vrai mkdir, rien à dire quand la sortie part dans un tuyau, un objet ou un $(...).
		if (io.tty) messages.push("Un nouveau lieu apparaît : " + r.name + ".");
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
	return !io.tty ? "" : "Tu viens de créer " + crees.join(", ") + ".";
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
			parcourir(r.node, racine === "/" ? "" : racine, 0);
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
	// La carte de tous les lieux visités s'affiche aussi dans le panneau de droite.
	if (io.tty && typeof montrerCarte === "function" && typeof texteCarte === "function" &&
		montrerCarte(C.gras("CARTE DES LIEUX VISITÉS") + "\n\n" + texteCarte())) lignes.push(C.gris("(La carte de tous tes lieux visités remplace l'image jusqu'à ton prochain déplacement. carte pour la revoir.)"));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Processus                                                           */
/* ------------------------------------------------------------------ */

Shell.sorts.ps = function(args, io){
	var lignes = [completerGauche("PID", 5) + " " + completerDroite("UTILISATEUR", 12) + "COMMANDE"];
	function ligne(pid, proprio, nom){
		lignes.push(completerGauche(pid, 5) + " " + completerDroite(String(proprio).length > 11 ? String(proprio).substring(0, 10) + "+" : proprio, 12) + nom);
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
			messages.push("kill : (" + pid + ") : rien ne se passe. " + proc.name + " est un thread du noyau : il ignore les signaux." +
				(Shell.graceNoyauDite === state.nbCommandes ? "" : "\n" + C.gris("(Grace, à la radio : « Pas celui-là. Le vrai noyau ne se tue pas. Cherche qui écoute sur le port suspect : ss. »)")));
			Shell.graceNoyauDite = state.nbCommandes;
			continue;
		}
		if (proc.protege){
			messages.push("kill : (" + pid + ") : " + proc.name + " est un service de la machine. " + C.gris(proc.protege));
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
	// Comme dans un vrai shell de connexion : exit sur la machine de départ ferme la session (logout).
	if (typeof COMPTE_ACTIF !== "undefined" && COMPTE_ACTIF) return Shell.sorts.logout(args, io);
	return "On ne quitte pas Terminus si facilement. Ferme simplement l'onglet : ta partie est sauvegardée, tu la retrouveras en revenant.";
};

/*
 * logout : dans une connexion ssh, la ferme (comme exit). Sur la machine de départ, ferme
 * la session du joueur : sa partie est mise de côté sur cet ordinateur, et le joueur suivant
 * commence la sienne. En redonnant le même prénom, on retrouve sa partie.
 */
var PAGE_LOGOUT = C.gras("logout") + " : fermer sa session\n\n" +
	"  logout      dans une connexion ssh : la ferme, comme exit (Ctrl+D fait pareil)\n" +
	"  logout      sur ta machine de départ : ferme ta session de jeu. Ta partie reste enregistrée\n" +
	"              dans ton compte, et l'écran revient à « terminus login: » pour le joueur suivant.\n\n" +
	"Pour reprendre, connecte-toi avec ton identifiant et ton mot de passe.";

Shell.sorts.logout = function(args, io){
	if (args.indexOf("--help") > -1) return PAGE_LOGOUT;
	if (Shell.pile_ssh.length > 0) return Shell.sorts.exit(args, io);
	if (!io.tty) throw new ShellError("logout : il faut un écran, pas de tuyau.");
	if (!COMPTE_ACTIF) return "logout : pas de session ouverte ici.";
	if (!fermerSession()) throw new ShellError("logout : impossible d'enregistrer ta partie sur cet ordinateur (stockage indisponible). La session reste ouverte.");
	term.echo("logout\n" + C.gris("Session fermée. Ta partie est enregistrée dans ton compte. À bientôt, " + (PROFIL.prenom || JOUEUR) + "."));
	window.location.reload();
	return "";
};

Shell.sorts.help = function(args, io){
	var tous = state.knownSpells(), connus = tous, choix = (args[0] || "").toLowerCase();
	// Au-delà du chapitre 1, help ne montre que les sorts du chapitre en cours : 150 lignes d'un coup, c'est illisible.
	var enCours = typeof state.chapitreEnCours === "function" ? state.chapitreEnCours() : 1;
	var interne = { "1": 1, "2": 3, "3": 2, "4": 5 }[choix];
	if (choix !== "tout" && choix !== "all" && (interne || enCours !== 1)){
		var chap = interne || enCours;
		connus = tous.filter(function(s){ return chapitreDuSort(s) === chap; });
	}
	var titre = connus.length === tous.length ? "Tes sorts (" + tous.length + " sur " + tousLesSorts().length + ") :" :
		"Tes sorts du chapitre " + numeroAffiche(interne || enCours) + " (" + connus.length + ") :";
	var lignes = [C.gras(titre)];
	for (var i = 0; i < connus.length; i++){
		var nomSort = connus[i];
		lignes.push(nomSort.length < 12 ? "  " + C.vert(completerDroite(nomSort, 12)) + MANUEL[nomSort].resume :
			"  " + C.vert(nomSort) + "\n" + "              " + MANUEL[nomSort].resume);
	}
	lignes.push("");
	if (connus.length < tous.length) lignes.push("", C.gris("Et " + (tous.length - connus.length) + " autres sorts appris dans les autres chapitres : help 1, help 2, help 3, help 4, ou help tout."));
	lignes.push("Pour le détail d'un sort : " + C.vert("man SORT") + " (par exemple man ls).");
	lignes.push("");
	lignes.push(C.gras("Les commandes du JEU") + C.gris(" (elles n'existent pas sous Linux : elles t'aident seulement à jouer)"));
	COMMANDES_DU_JEU.forEach(function(c){ lignes.push("  " + C.jaune(completerDroite(c[0], 12)) + c[1]); });
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
	var sort = args[0] === "vi" ? "vim" : args[0];
	if (sort === "logout") return PAGE_LOGOUT;
	if (sort === "man"){
		return "« C'est MOI, le vieil homme (man), nom d'une pipe ! On ne demande pas un manuel sur le manuel. »\n" +
			"Les sorts que tu peux me demander : " + state.knownSpells().join(", ") + ".";
	}
	if (MANUEL[sort] && state.knows(sort)){
		return C.gris("La voix du vieil homme résonne dans ta tête, comme venue de très loin :") + "\n\n" +
			C.gras(sort) + " : " + MANUEL[sort].titre + "\n\n" + MANUEL[sort].page + "\n\n" + C.gris("Souviens-toiiiii...");
	}
	if (MANUEL[sort]){
		return "Le vieil homme reste silencieux. « Chaque chose en son temps », semble dire le vent. (Tu ne connais pas encore le sort " + sort + ". " + Shell.ouApprendre(sort) + ")";
	}
	if (MANUEL_DU_JEU[sort]) return C.jaune("Commande du jeu") + "\n\n" + MANUEL_DU_JEU[sort];
	if (SORTS_DU_JEU.indexOf(sort) > -1) return sort + " n'est pas une commande Linux : c'est une commande du jeu. aide les liste toutes.";
	return "Il n'y a pas de page de manuel pour « " + sort + " ».";
};

Shell.sorts.quetes = function(args, io){
	return state.journal(args[0]);
};

Shell.sorts.recommencer = function(args, io){
	term.demander((COMPTE_ACTIF ? "Recommencer une partie neuve ? Ton compte (" + COMPTE_ACTIF + ") et ton mot de passe sont gardés, mais toute ta progression sera effacée. Tape oui pour confirmer : " :
		"Tout effacer et repartir de zéro ? Tape oui pour confirmer : "), false, function(reponse){
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

/* La ligne corrigée que le terminal propose après une erreur (Tab l'écrit) : le premier mot remplacé. */
Shell.proposition = null;
Shell.ligneCourante = "";
function proposer(ancien, nouveau){
	var l = Shell.ligneCourante || "";
	var i = l.indexOf(ancien);
	if (i === -1) return;
	Shell.proposition = l.substring(0, i) + nouveau + l.substring(i + ancien.length);
}
Shell.sortInconnu = function(nom){
	// cd.. ou ls-l : il manque l'espace entre le sort et la suite.
	if (nom === "apt-get" && Shell.sorts.apt){
		proposer(nom, "apt");
		return "apt-get : sous Linux, c'est l'ancien nom d'apt. Ici, le sort s'appelle apt : sudo apt install PAQUET";
	}
	var colle = /^([a-z][a-z0-9-]*?)(\.\.?|-[A-Za-z0-9-]*|~.*|\.\/.*|\/.*)$/.exec(nom);
	if (colle && (Shell.sorts.hasOwnProperty(colle[1]) || SORTS_DU_JEU.indexOf(colle[1]) > -1) && !Shell.sorts.hasOwnProperty(nom)){
		proposer(nom, colle[1] + " " + colle[2]);
		return nom + " : sort inconnu. Il manque une espace entre le sort et la suite : " + colle[1] + " " + colle[2] + "\n" +
			C.gris("(Le terminal sépare les mots avec des espaces : sans elle, il cherche un sort qui s'appellerait « " + nom + " ».)");
	}
	var ici = current_room.getNode(nom);
	if (ici instanceof Room){ proposer(nom, "cd " + nom); return "« " + nom + " » est un lieu, pas un sort. Pour y aller : cd " + nom; }
	if (ici !== null) proposer(nom, "less " + nom);
	if (ici !== null) return "« " + nom + " » n'est pas un sort. Pour regarder un objet ou parler à quelqu'un : less " + nom;
	if (COMMANDES_REELLES.indexOf(nom) > -1){
		return "« " + nom + " » existe bel et bien sous Linux, mais ce sort n'a pas cours à Terminus. Tape help pour revoir les tiens.";
	}
	var connus = state.knownSpells().concat(SORTS_DU_JEU);
	if (nom.length > 1){
		for (var i = 0; i < connus.length; i++){
			if (distanceUn(nom, connus[i])){ proposer(nom, connus[i]); return nom + " : sort inconnu. Voulais-tu dire « " + connus[i] + " » ?"; }
		}
	}
	if (nom !== nom.toLowerCase() && Shell.sorts[nom.toLowerCase()]){
		proposer(nom, nom.toLowerCase());
		return nom + " : sort inconnu. Les sorts s'écrivent en minuscules : " + nom.toLowerCase();
	}
	return nom + " : sort inconnu. Tape help pour revoir tes sorts.";
};

/* Les sorts que personne n'enseigne dès le départ : ils s'apprennent en cours d'histoire. */
var SORTS_APPRIS_EN_ROUTE = {
	"cp": "Il s'apprend auprès de l'Artisane, à l'Atelier du village, quand on lui apporte un Rouage.",
	"bash": "Il s'apprend auprès de l'Artisane, à l'Atelier du village, une fois ses rouages copiés.",
	"cowsay": "Ce n'est pas un sort mais un paquet : il s'installe avec sudo apt install cowsay (au chapitre 1, l'Affiche de la SalleDeCours explique apt).",
	"ssh-keygen": "Il s'apprend au chapitre 3, avec les ConsignesDuCoffre qu'Evi pose dans la SalleServeurs de Cybersup.",
	"tree": "Il s'apprend dans un drapeau caché de la SalleServeurs de Cybersup, ou en cadeau à la fin du chapitre 1."
};

/* Où apprendre un sort : on cherche dans le monde l'objet ou le personnage qui l'enseigne. */
Shell.ouApprendre = function(sort){
	if (sort === "vi") sort = "vim";
	if (SORTS_APPRIS_EN_ROUTE[sort]) return SORTS_APPRIS_EN_ROUTE[sort];
	// D'abord les lieux du chapitre du sort (un sort de la panne s'apprend aussi dans la Crypte, mais plus tard).
	var chapitre = typeof chapitreDuSort === "function" ? chapitreDuSort(sort) : 1;
	var ids = Object.keys(World.rooms);
	ids.sort(function(a, b){ return ((World.rooms[b].chapitre || 1) === chapitre) - ((World.rooms[a].chapitre || 1) === chapitre); });
	for (var n = 0; n < ids.length; n++){
		var lieu = World.rooms[ids[n]];
		// En mission cyber, la panne n'est pas au programme : ses lieux n'enseignent rien.
		if (lieu.chapitre === 3 && state.has("panneSautee")) continue;
		for (var i = 0; i < lieu.items.length; i++){
			if (lieu.items[i].teaches.indexOf(sort) === -1) continue;
			var parent = lieu.parents[0];
			if (lieu.chapitre === 2 && !state.has("crypteOuverte")) return "Il s'apprend au chapitre 3, sous la Citadelle.";
			if (lieu.chapitre === 3 && !state.has("panneOuverte")) return "Il s'apprend au chapitre 2, pendant la panne du réseau de l'école.";
			if (typeof SORTS_ANNEXE !== "undefined" && SORTS_ANNEXE.indexOf(sort) > -1 && !annexeOuverte()) return "Il s'apprend plus tard dans la panne, à l'Annexe, une fois le bâtiment B réparé.";
			if (lieu === current_room) return "Il s'apprend ici même, " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
				" : cat " + lieu.items[i].itemname;
			var machine = typeof racineDe === "function" ? racineDe(lieu) : null;
			if (machine && typeof PosteB !== "undefined" && machine === PosteB) return "Il s'apprend en lisant " + lieu.items[i].itemname +
				", sur le Poste du BatimentB (cd ~/Cybersup/BatimentB/Poste" + (lieu === machine ? "" : ", puis cd " + Shell.cheminAffiche(lieu)) + ").";
			if (machine) return "Il s'apprend " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
				", sur la machine " + machine.racineHote + " (ssh " + machine.racineHote + ")" + (lieu === machine ? "" : ", dans " + Shell.cheminAffiche(lieu)) + ".";
			if (typeof Citadelle !== "undefined" && lieu !== Citadelle && Shell.racineAbsolue(lieu) === Citadelle){
				var morceaux = [];
				for (var l = lieu, garde = 0; l && l !== Citadelle && garde++ < 50; l = l.parents[0]) morceaux.unshift(l.room_name);
				return "Il s'apprend " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
					", dans /" + morceaux.join("/") + " de la Citadelle (ssh citadelle, puis cd " + morceaux.join("/") + ").";
			}
			return "Il s'apprend " + (lieu.items[i].person ? "auprès de " : "en lisant ") + lieu.items[i].itemname +
				", dans " + lieu.room_name + (parent && parent !== Home ? " (du côté de " + parent.room_name + ")" : "") + ".";
		}
	}
	return "Quelqu'un, quelque part en ce monde, pourra te l'enseigner.";
};

Shell.appeler = function(nom, args, io){
	if (Shell.sorts.hasOwnProperty(nom) && state.frequences) state.frequences[nom] = (state.frequences[nom] || 0) + 1;
	if (nom.indexOf("/") > -1) return Shell.lancerScript(nom, io, true, args);
	if (!Shell.sorts.hasOwnProperty(nom)){
		if (state.paquets[nom] && Shell.paquets[nom] && Shell.paquets[nom].lancer) return Shell.paquets[nom].lancer(args, io);
		throw new ShellError(Shell.sortInconnu(nom), 127);
	}
	if (SORTS_DU_JEU.indexOf(nom) === -1 && !state.knows(nom)){
		throw new ShellError("Tu ne connais pas encore le sort « " + nom + " ». " + Shell.ouApprendre(nom), 127);
	}
	// Presque toutes les commandes Linux acceptent --help : un aide-memoire sans passer par man.
	if (args.indexOf("--help") > -1 && MANUEL[nom]){
		GameEvents.fire({ type: "aide", spell: nom });
		return C.gras(nom) + " : " + MANUEL[nom].titre + "\n\n" + MANUEL[nom].page;
	}
	var sortie = Shell.sorts[nom](args, io);
	// Un sort hors barème (pas encore rangé dans un chapitre) ne rapporte pas d'XP de premier usage.
	if (MANUEL[nom] && !MANUEL[nom].horsBareme) state.premierUsage(nom);
	else if (nom === "vi") state.premierUsage("vim");
	return sortie;
};

/* Au-delà, ce n'est plus un script mais un roman. */
var LIGNES_MAX_SCRIPT = 400;

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

/*
 * Un script est un objet qui contient des sorts, des boucles, des conditions... ./script demande le
 * droit x. args : les arguments du script ($1, $2...). options : { x, e, n } pour bash -x, -e, -n.
 * L'interpréteur lit le texte entier (Interpreteur.lancerScript) : ses variables restent à l'intérieur,
 * sa sortie normale part vers la sortie 1 du sort, ses erreurs vers la sortie 2.
 */
Shell.lancerScript = function(chemin, io, direct, args, options){
	if (!state.knows("bash")){
		throw new ShellError(direct ?
			chemin + " : tu ne sais pas encore lancer un script. Quelqu'un qui automatise son travail pourra te l'apprendre." :
			"Tu ne connais pas encore le sort « bash ». " + Shell.ouApprendre("bash"));
	}
	var r = Shell.chercher(chemin, io, "bash");
	if (r.node === null) throw new ShellError("bash : " + chemin + " : aucun objet de ce nom", 127);
	var script = Shell.suivre(r.node, "bash");
	if (script instanceof Room) throw new ShellError("bash : " + chemin + " : c'est un lieu, pas un script");
	if (script.person) throw new ShellError(script.itemname + " n'est pas un script, et n'apprécie pas qu'on essaie de l'exécuter.");
	// Un binaire se lance directement (./nom) ; bash ne sait pas le lire.
	if (script.binaire){
		if (!direct) throw new ShellError("bash : " + chemin + " : impossible d'exécuter un fichier binaire\n" +
			C.gris("(C'est un programme compilé, pas un script : on le lance avec ./" + script.itemname + ".)"));
		if (!(io.sudo ? script.mode.indexOf("x") > -1 || script.mode.indexOf("s") > -1 : Shell.bit(script, "x", null))){
			throw new ShellError("bash : " + chemin + " : Permission non accordée", 126);
		}
		GameEvents.fire({ type: "script", item: script, room: r.dir, direct: true, binaire: true });
		return script.binaire.sortie;
	}
	if (!Shell.bit(script, "r", io)) throw new ShellError("bash : " + chemin + " : Permission non accordée");
	if (direct && !(io.sudo ? script.mode.indexOf("x") > -1 : Shell.bit(script, "x", null))){
		throw new ShellError("bash : " + chemin + " : Permission non accordée\n" +
			C.gris("(Cet objet n'a pas le droit x, celui d'être exécuté : regarde avec ls -l. Donne-le-lui avec chmod +x " + script.itemname +
			", ou lance-le sans ce droit avec bash " + script.itemname + ".)"), 126);
	}
	if (Shell.profondeur_script >= 5) throw new ShellError("bash : trop de scripts emboîtés, j'arrête là avant la boucle infinie.");
	var texte = script.getText();
	if (lignesDe(texte).length > LIGNES_MAX_SCRIPT){
		throw new ShellError("bash : " + chemin + " : ce n'est pas un script, c'est un roman. (Plus de " + LIGNES_MAX_SCRIPT + " lignes.)");
	}
	Shell.profondeur_script++;
	var sortie;
	try {
		options = options || {};
		sortie = Interpreteur.lancerScript(texte, io, { nom0: chemin, nomScript: script.itemname, positionnels: args || [],
			x: !!options.x, e: !!options.e, n: !!options.n });
	} finally {
		Shell.profondeur_script--;
	}
	state.premierUsage("bash");
	// Pour les quêtes : le script, ses arguments, son statut et les structures qu'il utilise (voir Interpreteur.js).
	GameEvents.fire({ type: "script", item: script, room: r.dir, direct: !!direct, nom: script.itemname, args: (args || []).slice(),
		statut: io.code || 0, structures: Interpreteur.structures(texte) });
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

/*
 * Lance un tuyau : sort1 | sort2 | sort3, avec ses redirections. Renvoie vrai si aucun sort n'a
 * échoué par une erreur (l'épreuve finale compte ainsi les fausses manœuvres), et range le statut
 * du dernier sort dans Shell.statut ($?), comme bash. Un grep qui ne trouve rien pose le statut 1
 * sans être une erreur : il ne compte pas comme une fausse manœuvre.
 *
 * Chaque sort a deux sorties : la 1 (normale) et la 2 (les erreurs). Par défaut, la 1 va dans le
 * tuyau (ou à l'écran pour le dernier sort) et la 2 à l'écran. Les redirections se lisent de
 * gauche à droite, comme sous bash : « 2>&1 > f » laisse les erreurs à l'écran, « > f 2>&1 »
 * envoie tout dans f. L'entrée d'un sort peut venir d'un objet (< objet), d'un here-document
 * (<< FIN) ou d'un texte (<<< "texte").
 *
 * jetons : soit une liste de jetons déjà découpés (l'ancienne façon, Shell.decouper), soit
 * { segments: [...] } préparé par Interpreteur.js. Chaque segment de l'interpréteur a une fonction
 * preparer() qui développe ses mots au bon moment et renvoie
 * { argv, redirs: [{ op, cible, texte }], lancer (facultatif), vide (affectations seules), code }.
 */
var OPERATEURS_FICHIER = { ">": [1], ">>": [1], "2>": [2], "2>>": [2], "&>": [1, 2], "&>>": [1, 2] };
var OPERATEURS_ENTREE = { "<": true, "<<": true, "<<<": true };

/* Les mots et les redirections d'un segment écrit à l'ancienne (des jetons de Shell.decouper). */
function preparerJetons(seg, s){
	var argv = [], redirs = [];
	for (var k = 0; k < seg.length; k++){
		var jeton = seg[k];
		if (jeton.t !== "op"){
			if (jeton.joker) argv = argv.concat(Shell.developper(jeton.v));
			else argv.push(jeton.v);
			continue;
		}
		if (/^[12]>&[12]$/.test(jeton.v)){ redirs.push({ op: jeton.v }); continue; }
		if (!OPERATEURS_FICHIER[jeton.v]) throw new ShellError("Redirection inconnue : " + jeton.v);
		if (!seg[k + 1] || seg[k + 1].t !== "mot"){
			throw new ShellError("Après " + jeton.v + " il faut le nom de l'objet dans lequel écrire (ou /dev/null pour tout jeter).");
		}
		redirs.push({ op: jeton.v, cible: seg[k + 1].v });
		k++;
	}
	if (argv.length === 0) throw new ShellError("Il manque un sort " + (s === 0 ? "avant" : "après") + " le tuyau |.");
	return { argv: argv, redirs: redirs };
}

/* Le texte qu'une redirection < fait lire au sort. */
Shell.lireEntree = function(chemin){
	if (chemin === "/dev/null") return "";
	return Shell.objetLisible(chemin, { sudo: false }, "bash").item.getText();
};

Shell.tuyau = function(jetons){
	var interprete = !Array.isArray(jetons);
	var segments;
	if (interprete) segments = jetons.segments;
	else {
		segments = [[]];
		for (var i = 0; i < jetons.length; i++){
			if (jetons[i].t === "op" && jetons[i].v === "|") segments.push([]);
			else segments[segments.length - 1].push(jetons[i]);
		}
	}
	var stdin = null, stdinSansFin = false;
	var noms = [], codes = [];
	var echec = false;
	var sortieFinale = "", finaleALEcran = false, finaleSansFin = false, finaleVide = false, erreursApres = [];
	// L'écran : la sortie normale (1) et celle des erreurs (2). Dans une capture ($(...), un script
	// envoyé dans un objet), « l'écran » est la sortie de ce qui capture : voir Shell.ecranSortie.
	var ECRAN_1 = { t: "ecran", canal: 1 }, ECRAN_2 = { t: "ecran", canal: 2 };
	try {
		for (var s = 0; s < segments.length; s++){
			var dernier = s === segments.length - 1;
			var prep = interprete ? segments[s].preparer() : preparerJetons(segments[s], s);
			var argv = prep.argv || [];
			var sorties = { 1: dernier ? ECRAN_1 : { t: "tuyau" }, 2: ECRAN_2 };
			var entree = stdin, entreeSansFin = stdinSansFin, erreurEntree = null;
			for (var k = 0; k < prep.redirs.length; k++){
				var r = prep.redirs[k];
				if (r.op === "2>&1"){ sorties[2] = sorties[1]; continue; }
				if (r.op === "1>&2"){ sorties[1] = sorties[2]; continue; }
				if (r.op === "1>&1" || r.op === "2>&2") continue;
				if (OPERATEURS_ENTREE[r.op]){
					entreeSansFin = false;
					if (r.op !== "<"){ entree = r.texte; continue; }
					try { entree = Shell.lireEntree(r.cible); }
					catch (e){ if (!(e instanceof ShellError)) throw e; if (!erreurEntree) erreurEntree = e; }
					continue;
				}
				var fds = OPERATEURS_FICHIER[r.op];
				if (!fds) throw new ShellError("Redirection inconnue : " + r.op);
				var fichier = { t: "fichier", cible: r.cible, ajout: r.op.slice(-2) === ">>" };
				for (var f = 0; f < fds.length; f++) sorties[fds[f]] = fichier;
			}
			if (!interprete){
				// Un alias remplace le premier mot par le texte qu'on lui a associe.
				if (state.alias.hasOwnProperty(argv[0])){
					var remplacement = Shell.decouper(state.alias[argv[0]]).filter(function(j){ return j.t === "mot"; }).map(function(j){ return j.v; });
					argv = remplacement.concat(argv.slice(1));
					if (argv.length === 0) throw new ShellError("Cet alias est vide.");
				}
				// NOM=valeur, tout seul sur la ligne, range une valeur dans une variable.
				if (argv.length === 1 && segments.length === 1 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])){
					Shell.definirVariable(argv[0], "");
					Shell.statut = 0;
					Shell.statutsTuyau = [0];
					return true;
				}
			}
			var io = { stdin: entree, stdinSansFin: entreeSansFin, tty: sorties[1] === ECRAN_1 && Shell.surEcran(),
				sortie1: sorties[1], sortie2: sorties[2], sudo: false, erreurs: [], code: 0 };
			io.err = (function(liste){ return function(message){ liste.push(message); }; })(io.erreurs);
			// Un avertissement qu'un vrai programme écrit APRÈS ses résultats (sha256sum -c, par exemple).
			io.errFin = function(message){ io.erreursFin = io.erreursFin || []; io.erreursFin.push(message); };
			var nom = argv[0], args = argv.slice(1);
			if (!prep.vide && nom === "sudo"){
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
			if (!prep.vide) noms.push(nom);
			var sortie;
			// Une erreur part par la sortie 2, là où elle pointe ; le tuyau continue, comme sous bash.
			try {
				if (erreurEntree) throw erreurEntree;
				if (prep.vide){ sortie = ""; io.code = prep.code || 0; }
				else if (prep.lancer) sortie = prep.lancer(nom, args, io);
				else sortie = Shell.appeler(nom, args, io);
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				io.erreurs.push(Shell.situer(e.message));
				sortie = "";
				echec = true;
				io.code = e.code || 1;
				if (sorties[2].t === "ecran") jouerSon("erreur");
			}
			codes.push(io.code || 0);
			var texte = (sortie === undefined || sortie === null) ? "" : String(sortie);
			if (!io.tty) texte = sansAnsi(texte);
			var sansFin = !!io.sansFin || (nom === "echo" && args[0] === "-n");
			var ligneVide = !!io.ligneVide && texte === "";
			var erreurs = io.erreurs.length ? io.erreurs.join("\n") : null;

			// On range chaque morceau là où pointe sa sortie : écran, tuyau ou objet.
			var versTuyau = [], versFichiers = [];
			var ranger = function(cible, morceau, estErreur){
				if (cible.t === "ecran"){
					if (cible.canal === 2) Shell.ecranErreur(morceau);
					else if (estErreur) Shell.ecranSortie(morceau);
					else { sortieFinale = morceau; finaleALEcran = true; finaleSansFin = sansFin; finaleVide = ligneVide; }
				} else if (cible.t === "tuyau"){
					versTuyau.push(estErreur ? sansAnsi(morceau) : morceau);
				} else {
					var deja = versFichiers.filter(function(v){ return v.cible === cible; })[0];
					if (deja) deja.morceaux.push(sansAnsi(morceau));
					else versFichiers.push({ cible: cible, morceaux: [sansAnsi(morceau)], sansFin: !estErreur && sansFin });
				}
			};
			if (erreurs !== null) ranger(sorties[2], erreurs, true);
			ranger(sorties[1], texte, false);
			if (io.erreursFin && io.erreursFin.length){
				if (sorties[2].t === "ecran") erreursApres.push(io.erreursFin.join("\n"));
				else ranger(sorties[2], io.erreursFin.join("\n"), true);
			}
			// Un objet visé par une redirection est créé (ou vidé) même s'il n'y a rien à y écrire.
			[1, 2].forEach(function(n){
				var c = sorties[n];
				if (c.t === "fichier" && !versFichiers.some(function(v){ return v.cible === c; })) versFichiers.push({ cible: c, morceaux: [], sansFin: false });
			});
			// Un sort qui écrit lui-même plus tard dans sa redirection (gpg, après la phrase de passe) : on n'y touche pas ici.
			if (io.sortieGeree) versFichiers = versFichiers.filter(function(v){ return v.cible !== sorties[1]; });
			versFichiers.forEach(function(v){
				var contenu = v.morceaux.filter(function(m){ return m !== ""; }).join("\n");
				if (contenu === "" && v.cible.ajout) return;
				Shell.ecrire(v.cible.cible, contenu, v.cible.ajout, v.sansFin && !v.cible.ajout);
			});
			stdin = versTuyau.filter(function(m){ return m !== ""; }).join("\n");
			stdinSansFin = sansFin && sorties[1].t === "tuyau";
			if (!prep.vide){
				GameEvents.fire({ type: "stderr", name: nom, room: current_room, count: io.erreurs.length,
					destination: sorties[2].t === "ecran" ? null : (sorties[2] === sorties[1] || sorties[2].t === "tuyau" ? "&1" : sorties[2].cible),
					args: args, sudo: io.sudo });
			}
		}
		if (finaleALEcran) Shell.ecranSortie(sortieFinale, finaleSansFin, finaleVide);
		erreursApres.forEach(function(m){ Shell.ecranErreur(m); });
		if (finaleALEcran){
			if (noms[noms.length - 1] === "echo"){
				GameEvents.fire({ type: "echo", text: sansAnsi(sortieFinale), room: current_room });
			}
		}
		if (noms.length > 1) GameEvents.fire({ type: "pipeline", names: noms, room: current_room, output: sansAnsi(finaleALEcran ? sortieFinale : stdin) });
		Shell.statutsTuyau = codes.length ? codes : [0];
		Shell.statut = Shell.statutsTuyau[Shell.statutsTuyau.length - 1];
		return !echec;
	} catch (e){
		if (e instanceof ShellError){
			Shell.ecranErreur(Shell.situer(e.message));
			jouerSon("erreur");
			Shell.statut = e.code || 1;
			Shell.statutsTuyau = [Shell.statut];
			return false;
		}
		throw e;
	}
};

/*
 * Lance une ligne déjà découpée par Shell.decouper : son texte d'origine part à l'interpréteur.
 * Une liste de jetons fabriquée à la main (sans texte d'origine) suit encore l'ancien chemin :
 * des tuyaux enchaînés par ; && et ||.
 */
Shell.lancer = function(jetons){
	if (jetons && typeof jetons.source === "string" && typeof Interpreteur !== "undefined") return Interpreteur.executer(jetons.source);
	var sequences = [], courant = [], separateur = null;
	for (var i = 0; i < jetons.length; i++){
		if (jetons[i].t === "op" && (jetons[i].v === ";" || jetons[i].v === "&&" || jetons[i].v === "||")){
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
		if (sequences[s].avant === "||" && ok) continue;
		ok = Shell.tuyau(sequences[s].jetons);
	}
	return Shell.statut;
};

/* Les récompenses du tour tiennent en une ligne : les sorts appris ensemble, puis l'XP au bout,
 * et les lieux qui sortent de la brume sur une petite ligne grise. Le détail est dans man, schema, traque. */
Shell.compacterNarration = function(liste){
	var sortie = [], sorts = [], lieux = [], voir = "", xp = 0, placeSorts = -1, placeLieux = -1;
	liste.forEach(function(l){
		if (l && typeof l === "object"){
			if (l.sort){ if (placeSorts < 0){ placeSorts = sortie.length; sortie.push(null); } sorts.push(l); }
			else if (l.lieu){ if (placeLieux < 0){ placeLieux = sortie.length; sortie.push(null); } lieux.push(l.lieu); voir = l.voir; }
			else if (l.xp) xp += l.xp;
			return;
		}
		sortie.push(l);
	});
	var gain = xp ? C.gris("  +" + xp + " XP") : "";
	if (sorts.length === 1){
		var s = sorts[0];
		sortie[placeSorts] = C.vert("✦ Nouveau sort appris : " + s.sort + (s.rpg ? ", " + s.rpg : "")) + C.gris(" · " + s.resume + " · man " + s.sort) + gain;
		gain = "";
	} else if (sorts.length > 1){
		sortie[placeSorts] = C.vert("✦ Nouveaux sorts appris : " + sorts.map(function(s){ return s.sort + (s.rpg && sorts.length <= 3 ? " (" + s.rpg + ")" : ""); }).join(", ")) +
			C.gris(" · man " + sorts[0].sort + " pour le détail") + gain;
		gain = "";
	}
	if (lieux.length) sortie[placeLieux] = C.gris("◇ " + (voir === "traque" ? "Traque" : "Carte") + " : " + lieux.join(", ") + (lieux.length > 1 ? " sortent" : " sort") + " de la brume · " + voir);
	// Les petits gains (+5 XP) ne s'affichent seuls que si rien d'autre n'est annoncé : la barre d'XP les montre.
	var annonce = sortie.some(function(l){ return typeof l === "string" && /^[★✦◆▲]/.test(l.replace(/\x1b\[[0-9;]*m/g, "")); });
	if (gain && !annonce) sortie.push(C.gris("+" + xp + " XP"));
	return sortie.filter(function(l){ return l !== null && l !== undefined; });
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
	var lignes = Shell.compacterNarration(Shell.narration);
	Shell.narration = [];
	lignes.forEach(function(l){ term.echo(l); });
	if (typeof majEtat === "function") majEtat();
	if (typeof majObjectif === "function") majObjectif();
	term.definirInvite(Shell.invite());
	state.save();
};

Shell.invite = function(){
	var chemin = Shell.cheminAffiche(current_room);
	var morceaux = chemin.split("/");
	if (morceaux.length > 3) chemin = "…/" + morceaux.slice(-2).join("/");
	return C.vert(JOUEUR + "@" + Shell.hote()) + ":" + C.bleu(chemin) + "$ ";
};

/* Au-delà, une saisie sur plusieurs lignes est abandonnée (un guillemet oublié qui avale tout). */
var LIGNES_MAX_SAISIE = 400;

/*
 * Point d'entree : appele par Game.js pour chaque ligne validee.
 * Une commande inachevée (un if sans fi, un guillemet ouvert, un here-document, une \ finale)
 * attend la suite : l'invite devient « > », comme dans bash, et Ctrl+C l'abandonne.
 */
Shell.executer = function(ligne){
	Shell.proposition = null;
	var suite = Shell.saisieEnCours !== null;
	if (!suite && ligne.trim() === "") return;
	// !! rejoue le sort precedent (sudo !! est un grand classique).
	if (ligne.indexOf("!!") > -1){
		if (Shell.historique.length === 0){ term.echo("!! : aucun sort précédent à relancer."); return; }
		ligne = ligne.split("!!").join(Shell.historique[Shell.historique.length - 1]);
		term.echo(C.gris(ligne));
		GameEvents.fire({ type: "bangbang" });
	}
	var texte = suite ? Shell.saisieEnCours + "\n" + ligne : ligne;
	Shell.ligneCourante = texte;
	var verdict = Interpreteur.verifier(texte);
	if (verdict === "incomplet"){
		if (texte.split("\n").length > LIGNES_MAX_SAISIE){
			Shell.saisieEnCours = null;
			term.echo("bash : saisie abandonnée : plus de " + LIGNES_MAX_SAISIE + " lignes sans que la commande se termine.\n" +
				C.gris("(Un guillemet ou un bloc resté ouvert ? Ctrl+C abandonne une saisie en cours.)"));
			term.definirInvite(Shell.invite());
			return;
		}
		// La première fois (ou pour un guillemet oublié, piège classique), on explique l'invite « > ».
		var manque = suite ? "" : Interpreteur.ceQuiManque(texte) || "";
		if (!suite && (!Shell.astuceSaisieVue || /guillemet|apostrophe/.test(manque))){
			Shell.astuceSaisieVue = true;
			term.echo(C.gris("(Commande inachevée : " + manque + ". Le terminal attend la suite sur l'invite « > » ; Ctrl+C abandonne.)"));
		}
		Shell.saisieEnCours = texte;
		term.definirInvite("> ");
		return;
	}
	Shell.saisieEnCours = null;
	Shell.historique.push(texte);
	state.nbCommandes++;
	Shell.variable_developpee = false;
	if (verdict !== null){
		term.echo(verdict.message);
		Shell.statut = verdict.code || 2;
		if (suite) term.definirInvite(Shell.invite());
		return;
	}
	if (Interpreteur.contientSudo(texte) && state.knows("sudo") && !state.has("sudoOK")){
		term.demander("[sudo] Mot de passe de " + JOUEUR + " : ", true, function(reponse){
			if (reponse === MOT_DE_PASSE_SUDO){
				state.applyState("sudoOK");
				Interpreteur.executer(texte);
			} else {
				term.echo("Désolé, essaie encore.\n" + C.gris(typeof examenEnCours === "function" && examenEnCours() ?
					"(Le mot de passe sudo de l'épreuve est écrit à la fin de ton ordre de mission : cat ~/.ordre-de-mission.)" :
					"(Le mot de passe sudo se trouve quelque part dans les ArchivesDuNoyau.)"));
			}
			Shell.fin();
		});
		return;
	}
	Interpreteur.executer(texte);
	Shell.fin();
};

/* Ctrl+C : abandonne la commande en cours de saisie sur plusieurs lignes. */
Shell.interrompre = function(){
	if (Shell.saisieEnCours === null) return;
	Shell.saisieEnCours = null;
	Shell.statut = 130;
	term.definirInvite(Shell.invite());
};

/* Ctrl+D sur une ligne vide au milieu d'une saisie sur plusieurs lignes : bash répond « fin de fichier prématurée ». */
Shell.finDeSaisie = function(){
	if (Shell.saisieEnCours === null) return false;
	var texte = Shell.saisieEnCours;
	Shell.saisieEnCours = null;
	term.echo(Interpreteur.erreurIncomplet(texte).message);
	Shell.statut = 2;
	term.definirInvite(Shell.invite());
	return true;
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
