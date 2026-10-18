/**
 * Chapitre2.js : la Crypte, le chapitre cyber.
 *
 * Après la victoire sur le Sorcier Noir, une trappe s'ouvre sous la Citadelle.
 * Quelqu'un d'autre est entré pendant l'examen, et ce n'était pas au programme.
 *
 * Notions : empreintes (sha256sum, sha256sum -c), encodage (base64, base64 -d),
 * bit SUID (ls -l, find -perm -4000, chmod u-s), erreurs (2>, 2>>, 2>&1,
 * /dev/null), ports en écoute (ss -tlnp), édition de fichiers (nano), clés SSH
 * (ssh-keygen, clé publique et clé privée, authorized_keys).
 *
 * Ce chapitre a sa propre note sur 20 et son propre certificat : on peut le
 * jouer seul, en séance de trois heures, grâce au sort chapitre.
 */

/* ------------------------------------------------------------------ */
/* Outils : SHA-256 et base64, en UTF-8                                */
/* ------------------------------------------------------------------ */

function versOctetsUtf8(texte){
	var brut = unescape(encodeURIComponent(texte));
	var octets = [];
	for (var i = 0; i < brut.length; i++) octets.push(brut.charCodeAt(i));
	return octets;
}

function depuisOctetsUtf8(octets){
	var brut = "";
	for (var i = 0; i < octets.length; i++) brut += String.fromCharCode(octets[i]);
	try {
		return decodeURIComponent(escape(brut));
	} catch (e){
		return brut;
	}
}

var SHA256_K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

/*
 * Le contenu exact d'un texte, octet pour octet. Sous Linux, un fichier texte et ce qui sort
 * d'echo finissent par un retour à la ligne ; echo -n est l'exception. On le rajoute donc
 * ici pour que sha256sum et base64 donnent les mêmes résultats qu'un vrai terminal.
 */
function contenuExact(texte, sansFin){
	if (sansFin || texte === "" || texte.charAt(texte.length - 1) === "\n") return texte;
	return texte + "\n";
}

/* Le vrai SHA-256 : le résultat est le même que celui de sha256sum sous Linux. */
function sha256(texte){
	var octets = versOctetsUtf8(texte);
	var longueurBits = octets.length * 8;
	octets.push(0x80);
	while (octets.length % 64 !== 56) octets.push(0);
	var haut = Math.floor(longueurBits / 4294967296), bas = longueurBits >>> 0;
	octets.push((haut >>> 24) & 255, (haut >>> 16) & 255, (haut >>> 8) & 255, haut & 255);
	octets.push((bas >>> 24) & 255, (bas >>> 16) & 255, (bas >>> 8) & 255, bas & 255);
	var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
	var w = new Array(64);
	function rotd(x, n){ return (x >>> n) | (x << (32 - n)); }
	for (var bloc = 0; bloc < octets.length; bloc += 64){
		for (var t = 0; t < 16; t++){
			var j = bloc + t * 4;
			w[t] = ((octets[j] << 24) | (octets[j + 1] << 16) | (octets[j + 2] << 8) | octets[j + 3]) | 0;
		}
		for (t = 16; t < 64; t++){
			var s0 = rotd(w[t - 15], 7) ^ rotd(w[t - 15], 18) ^ (w[t - 15] >>> 3);
			var s1 = rotd(w[t - 2], 17) ^ rotd(w[t - 2], 19) ^ (w[t - 2] >>> 10);
			w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
		}
		var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
		for (t = 0; t < 64; t++){
			var S1 = rotd(e, 6) ^ rotd(e, 11) ^ rotd(e, 25);
			var ch = (e & f) ^ (~e & g);
			var temp1 = (k + S1 + ch + SHA256_K[t] + w[t]) | 0;
			var S0 = rotd(a, 2) ^ rotd(a, 13) ^ rotd(a, 22);
			var maj = (a & b) ^ (a & c) ^ (b & c);
			var temp2 = (S0 + maj) | 0;
			k = g; g = f; f = e; e = (d + temp1) | 0;
			d = c; c = b; b = a; a = (temp1 + temp2) | 0;
		}
		h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
		h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + k) | 0;
	}
	var hex = "";
	for (var i = 0; i < 8; i++) hex += ("00000000" + (h[i] >>> 0).toString(16)).slice(-8);
	return hex;
}

var ALPHABET_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encoderBase64(texte){
	var octets = versOctetsUtf8(texte), sortie = "";
	for (var i = 0; i < octets.length; i += 3){
		var n = (octets[i] << 16) | ((octets[i + 1] || 0) << 8) | (octets[i + 2] || 0);
		sortie += ALPHABET_BASE64.charAt((n >> 18) & 63) + ALPHABET_BASE64.charAt((n >> 12) & 63);
		sortie += i + 1 < octets.length ? ALPHABET_BASE64.charAt((n >> 6) & 63) : "=";
		sortie += i + 2 < octets.length ? ALPHABET_BASE64.charAt(n & 63) : "=";
	}
	return sortie;
}

/* Renvoie null si le texte n'est pas du base64 valide. */
function decoderBase64(texte){
	var propre = texte.replace(/\s+/g, "");
	if (propre === "") return "";
	if (!/^[A-Za-z0-9+\/]+={0,2}$/.test(propre) || propre.length % 4 === 1) return null;
	propre = propre.replace(/=+$/, "");
	var octets = [], tampon = 0, bits = 0;
	for (var i = 0; i < propre.length; i++){
		tampon = (tampon << 6) | ALPHABET_BASE64.indexOf(propre.charAt(i));
		bits += 6;
		if (bits >= 8){
			bits -= 8;
			octets.push((tampon >> bits) & 255);
		}
	}
	return depuisOctetsUtf8(octets);
}

/* Une suite de caractères base64 tirée de la graine : pour les clés SSH du jeu. */
function base64Aleatoire(sel, longueur){
	var texte = "";
	for (var i = 0; i < longueur; i++) texte += ALPHABET_BASE64.charAt(Math.floor(alea(sel + ":" + i) * 64));
	return texte;
}

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_2 = ["sha256sum", "base64", "nano", "ss", "ssh-keygen"];

MANUEL["sha256sum"] = {
	resume: "calculer ou vérifier l'empreinte d'un objet",
	titre: "SHA-256 SUM (la somme de contrôle SHA-256)",
	page:
"Une empreinte (un « hash ») est un résumé de 64 caractères calculé à partir\n" +
"du contenu d'un objet. Changer une seule lettre change toute l'empreinte. On\n" +
"s'en sert pour vérifier qu'un fichier n'a pas été modifié.\n\n" +
"  sha256sum OBJET...            affiche l'empreinte de chaque objet\n" +
"  sha256sum -c LISTE            vérifie les objets d'une liste d'empreintes\n" +
"                                (chaque ligne : EMPREINTE  NOM)\n" +
"  echo texte | sha256sum        empreinte d'un texte reçu par un tuyau\n\n" +
"Avec -c, chaque objet est déclaré OK ou ÉCHEC. Un ÉCHEC veut dire que le\n" +
"contenu n'est plus celui qui a été enregistré dans la liste.\n\n" +
"Sous Linux, les distributions publient un fichier SHA256SUMS à côté de chaque\n" +
"téléchargement : sha256sum -c SHA256SUMS vérifie qu'on a bien reçu le bon."
};

MANUEL["base64"] = {
	resume: "encoder ou décoder du texte en base64",
	titre: "base 64 (soixante-quatre caractères)",
	page:
"base64 écrit n'importe quel contenu avec seulement 64 caractères sans danger\n" +
"(A-Z, a-z, 0-9, + et /), plus = pour finir. C'est un ENCODAGE, pas un\n" +
"chiffrement : n'importe qui peut le décoder, il n'y a aucun secret.\n\n" +
"  echo Bonjour | base64          encode : Qm9uam91cgo= (à peu près)\n" +
"  echo Qm9uam91cg== | base64 -d  décode\n" +
"  base64 OBJET                   encode le contenu d'un objet\n" +
"  base64 -d OBJET                décode le contenu d'un objet\n\n" +
"On trouve du base64 partout : pièces jointes des courriels, clés SSH,\n" +
"images dans les pages web... et dans les programmes malveillants qui\n" +
"cherchent à cacher ce qu'ils transportent."
};

MANUEL["nano"] = {
	resume: "modifier un objet dans un petit éditeur",
	titre: "nano (le petit éditeur de texte)",
	page:
"  nano OBJET             ouvre l'objet dans l'éditeur (le crée s'il n'existe pas)\n" +
"  sudo nano OBJET        pour un objet qui appartient à root\n\n" +
"Dans l'éditeur :\n" +
"  Ctrl+O                 enregistre (O comme « Output »)\n" +
"  Ctrl+X                 quitte (nano demande s'il faut enregistrer)\n" +
"  Ctrl+K                 coupe la ligne où se trouve le curseur\n\n" +
"Les boutons en bas de l'éditeur font la même chose, au doigt ou à la souris.\n" +
"Sous Linux, nano est l'éditeur le plus simple ; vim et emacs sont plus\n" +
"puissants, et plus déroutants au début."
};

MANUEL["ss"] = {
	resume: "voir les connexions et les ports en écoute",
	titre: "Socket Statistics (statistiques des sockets)",
	page:
"Un programme qui attend des connexions réseau « écoute » sur un port : 22\n" +
"pour ssh, 80 et 443 pour le web... ss montre ces ports.\n\n" +
"  ss -t              connexions TCP établies\n" +
"  ss -tl             ports TCP en écoute (l comme « listening »)\n" +
"  ss -tln            pareil, avec les numéros plutôt que les noms\n" +
"  sudo ss -tlnp      pareil, avec le processus qui écoute (p), et son PID\n\n" +
"Sans sudo, ss ne montre pas les processus des autres utilisateurs. Un port\n" +
"ouvert que personne n'explique est l'un des premiers signes d'une intrusion."
};

MANUEL["ssh-keygen"] = {
	resume: "fabriquer une paire de clés SSH",
	titre: "SSH KEY GENerator (fabrique de clés SSH)",
	page:
"Une paire de clés, ce sont deux objets qui vont ensemble :\n" +
"  ~/.ssh/id_ed25519        la clé PRIVÉE : elle ne quitte jamais ta machine\n" +
"  ~/.ssh/id_ed25519.pub    la clé PUBLIQUE : on peut la donner à tout le monde\n\n" +
"  ssh-keygen               fabrique la paire (demande une phrase de passe,\n" +
"                           qui protège la clé privée ; vide pour aucune)\n\n" +
"Pour se connecter à une machine avec sa clé, on donne sa clé PUBLIQUE à\n" +
"l'administrateur, qui l'ajoute au fichier authorized_keys du compte. Ensuite,\n" +
"ssh MACHINE suffit : plus de mot de passe à taper ni à se faire voler.\n\n" +
"Donner sa clé privée, c'est donner la clé de chez soi : on ne le fait jamais."
};

var COMMANDES_REELLES_RETIREES = ["nano", "ss"];
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return COMMANDES_REELLES_RETIREES.indexOf(c) === -1; });

/* --- sha256sum --- */
Shell.sorts.sha256sum = function(args, io){
	var verifier = false, objets = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-c" || args[i] === "--check") verifier = true;
		else if (args[i].charAt(0) === "-" && args[i] !== "-") throw new ShellError("sha256sum : option inconnue « " + args[i] + " ». Celle qui existe ici : -c");
		else objets.push(args[i]);
	}
	if (!verifier){
		if (objets.length === 0){
			if (io.stdin === null) throw new ShellError("sha256sum : de quoi veux-tu l'empreinte ? Utilisation : sha256sum OBJET");
			return sha256(contenuExact(io.stdin, io.stdinSansFin)) + "  -";
		}
		var lignes = [];
		for (var k = 0; k < objets.length; k++){
			var trouve;
			try {
				trouve = Shell.objetLisible(objets[k], io, "sha256sum");
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				io.err(e.message);
				continue;
			}
			lignes.push(sha256(contenuExact(trouve.item.getText(), trouve.item.sansFinDeLigne)) + "  " + objets[k]);
			GameEvents.fire({ type: "sha256sum", item: trouve.item, room: trouve.room });
		}
		return lignes.join("\n");
	}
	// sha256sum -c LISTE : relit chaque ligne « empreinte  nom » et compare.
	var liste;
	if (objets.length === 0){
		if (io.stdin === null) throw new ShellError("sha256sum -c : quelle liste d'empreintes ? Utilisation : sha256sum -c SHA256SUMS");
		liste = io.stdin;
	} else {
		liste = Shell.objetLisible(objets[0], io, "sha256sum").item.getText();
	}
	var resultats = [], echecs = [], formatees = 0;
	var lignesListe = lignesDe(liste);
	for (var l = 0; l < lignesListe.length; l++){
		var m = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(lignesListe[l].trim());
		if (!m) continue;
		formatees++;
		var nom = m[2].trim();
		var objet;
		try {
			objet = Shell.objetLisible(nom, io, "sha256sum");
		} catch (e){
			if (!(e instanceof ShellError)) throw e;
			io.err("sha256sum : " + nom + " : aucun objet de ce nom");
			resultats.push(nom + " : IMPOSSIBLE DE LIRE");
			echecs.push(nom);
			continue;
		}
		if (sha256(contenuExact(objet.item.getText(), objet.item.sansFinDeLigne)) === m[1].toLowerCase()){
			resultats.push(nom + ": OK");
		} else {
			resultats.push((io.tty ? C.rouge(nom + ": ÉCHEC") : nom + ": ÉCHEC"));
			echecs.push(nom);
		}
	}
	if (formatees === 0) throw new ShellError("sha256sum : aucune ligne d'empreinte correctement formatée (EMPREINTE  NOM)");
	if (echecs.length > 0){
		io.errFin("sha256sum : AVERTISSEMENT : " + echecs.length + " somme" + (echecs.length > 1 ? "s" : "") +
			" de contrôle calculée" + (echecs.length > 1 ? "s ne correspondent" : " ne correspond") + " PAS");
	}
	GameEvents.fire({ type: "sha256sum", check: true, room: current_room, failed: echecs });
	return resultats.join("\n");
};

/* --- base64 --- */
Shell.sorts.base64 = function(args, io){
	var decoder = false, objets = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-d" || args[i] === "--decode") decoder = true;
		else if (args[i].charAt(0) === "-") throw new ShellError("base64 : option inconnue « " + args[i] + " ». Celle qui existe ici : -d (décoder)");
		else objets.push(args[i]);
	}
	var texte, sansFin;
	if (objets.length === 0){
		sansFin = io.stdinSansFin;
		if (io.stdin === null) throw new ShellError("base64 : que faut-il encoder ? Utilisation : echo texte | base64, ou base64 OBJET (et -d pour décoder)");
		texte = io.stdin;
	} else {
		if (objets.length > 1) throw new ShellError("base64 : un seul objet à la fois.");
		var objetLu = Shell.objetLisible(objets[0], io, "base64").item;
		texte = objetLu.getText();
		sansFin = objetLu.sansFinDeLigne;
	}
	if (decoder){
		var clair = decoderBase64(texte);
		if (clair === null){
			throw new ShellError("base64 : entrée incorrecte\n" + C.gris("(Ce texte n'est pas du base64 : seulement A-Z, a-z, 0-9, + et /, avec un ou deux = à la fin.)"));
		}
		GameEvents.fire({ type: "base64", decode: true, text: clair, room: current_room });
		return clair.replace(/\n$/, "");
	}
	var encode = encoderBase64(contenuExact(texte, sansFin));
	GameEvents.fire({ type: "base64", decode: false, text: texte, room: current_room });
	return encode;
};

/* --- nano --- */
Shell.sorts.nano = function(args, io){
	var objets = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (objets.length !== 1) throw new ShellError("nano : quel objet veux-tu modifier ? Utilisation : nano OBJET");
	if (!io.tty || io.stdin !== null) throw new ShellError("nano : un éditeur a besoin d'un écran : pas de tuyau ni de redirection avec nano.");
	if (!term.editer) throw new ShellError("nano : l'éditeur n'est pas disponible ici.");
	var r = Shell.chercher(objets[0], io, "nano");
	if (r.node instanceof Room) throw new ShellError("nano : " + r.name + " : c'est un lieu, pas un objet");
	var item = r.node ? Shell.suivre(r.node, "nano") : null;
	if (item instanceof Room) throw new ShellError("nano : " + r.name + " : c'est un lieu, pas un objet");
	if (item && item.person) throw new ShellError(item.itemname + " n'est pas un texte. On ne réécrit pas les gens, on leur parle : less " + item.itemname);
	if (item && !Shell.bit(item, "r", io)) throw new ShellError("nano : " + r.name + " : Permission non accordée");
	if (item === null) Shell.nomValide(r.name, "nano");
	var lecteurSeul = item ? (!Shell.bit(item, "w", io) || !!item.immuable) : !Shell.bit(r.dir, "w", io);
	var sudo = !!io.sudo, lieu = r.dir, nom = r.name, cible = item;
	term.editer({
		titre: nom + (lecteurSeul ? "  [lecture seule]" : ""),
		texte: item ? item.getText() : "",
		lectureSeule: lecteurSeul
	}, function(nouveau){
		if (nouveau === null) return;
		if (lecteurSeul){
			term.echo("nano : impossible d'écrire dans « " + nom + " » : Permission non accordée" + (sudo ? "" : C.gris("  (Cet objet ne t'appartient pas : sudo nano " + nom + ")")));
			return;
		}
		var nouveauNe = cible === null;
		var ancien = cible ? cible.getText() : "";
		if (cible === null){
			cible = new Item(nom, nouveau);
			cible.owner = sudo ? "root" : JOUEUR;
			lieu.addItem(cible);
		} else {
			cible.setText(nouveau);
		}
		var n = lignesDe(nouveau).length;
		term.echo(C.gris("[ " + n + " ligne" + (n > 1 ? "s" : "") + " écrite" + (n > 1 ? "s" : "") + " dans " + nom + " ]"));
		GameEvents.fire({ type: "write", item: cible, room: lieu, append: false, text: nouveau, created: nouveauNe, previous: ancien, nano: true });
		Shell.fin();
	});
	return "";
};

/* --- ss --- */
var PID_SSHD = 412;
var PORT_CORBEAU = 6666;
var ADRESSE_POSTE_CORBEAU = "10.0.92." + aleaEntier("poste-corbeau", 100, 189);

function prisesDe(hote){
	var prises = [{ etat: "LISTEN", local: "0.0.0.0:22", service: "ssh", pair: "0.0.0.0:*", proc: "sshd", pid: PID_SSHD, owner: "root" }];
	if (hote === "cybersup"){
		prises.push({ etat: "LISTEN", local: "0.0.0.0:80", service: "http", pair: "0.0.0.0:*", proc: "httpd", pid: 733, owner: "root" });
		prises.push({ etat: "LISTEN", local: "0.0.0.0:443", service: "https", pair: "0.0.0.0:*", proc: "httpd", pid: 733, owner: "root" });
	}
	if (hote === "citadelle"){
		prises.push({ etat: "LISTEN", local: "127.0.0.1:25", service: "smtp", pair: "0.0.0.0:*", proc: "postier", pid: 588, owner: "root" });
		var porte = typeof Racine !== "undefined" ? procCorbeau() : null;
		if (porte){
			prises.push({ etat: "LISTEN", local: "0.0.0.0:" + PORT_CORBEAU, service: String(PORT_CORBEAU), pair: "0.0.0.0:*", proc: porte.name, pid: porte.pid, owner: "root" });
			prises.push({ etat: "ESTAB", local: ADRESSE_ATTAQUANT + ":" + PORT_CORBEAU, service: String(PORT_CORBEAU), pair: ADRESSE_POSTE_CORBEAU + ":51234", proc: porte.name, pid: porte.pid, owner: "root" });
		}
	}
	return prises;
}

Shell.sorts.ss = function(args, io){
	var opts = { t: false, u: false, l: false, n: false, p: false, a: false };
	for (var i = 0; i < args.length; i++){
		if (args[i].charAt(0) !== "-") throw new ShellError("ss : argument inattendu « " + args[i] + " ». Exemple : ss -tlnp");
		for (var k = 1; k < args[i].length; k++){
			var o = args[i].charAt(k);
			if (!opts.hasOwnProperty(o)) throw new ShellError("ss : option inconnue « -" + o + " ». Celles qui existent ici : -t -u -l -n -p -a");
			opts[o] = true;
		}
	}
	var prises = prisesDe(Shell.hote()).filter(function(p){
		if (opts.a) return true;
		return opts.l ? p.etat === "LISTEN" : p.etat === "ESTAB";
	});
	var lignes = [completerDroite("State", 8) + completerDroite("Recv-Q", 8) + completerDroite("Send-Q", 8) +
		completerDroite("Local Address:Port", 24) + completerDroite("Peer Address:Port", 24) + (opts.p ? "Process" : "")];
	var cachees = 0;
	for (var j = 0; j < prises.length; j++){
		var p = prises[j];
		var local = opts.n ? p.local : p.local.replace(/:\d+$/, ":" + p.service).replace(/^0\.0\.0\.0/, "*");
		var processus = "";
		if (opts.p){
			if (io.sudo || p.owner === JOUEUR) processus = "users:((\"" + p.proc + "\",pid=" + p.pid + ",fd=3))";
			else cachees++;
		}
		lignes.push(completerDroite(p.etat, 8) + completerDroite("0", 8) + completerDroite(p.etat === "LISTEN" ? "128" : "0", 8) +
			completerDroite(local, 24) + completerDroite(p.pair, 24) + processus);
	}
	if (prises.length === 0 && io.tty) lignes.push(C.gris(opts.l ? "(aucun port en écoute)" : "(aucune connexion établie : pour les ports en écoute, ajoute -l)"));
	if (cachees > 0 && io.tty) lignes.push(C.gris("(Les processus de root ne s'affichent pas sans sudo : sudo ss -tlnp)"));
	GameEvents.fire({ type: "ss", host: Shell.hote(), listen: opts.l, process: opts.p && io.sudo });
	return lignes.join("\n");
};

/* --- ssh-keygen --- */
function texteClePublique(){
	return "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("cle-joueur-" + (state.clesGenerees || 0), 43) + " " + JOUEUR + "@terminus";
}
function texteClePrivee(){
	var lignes = ["-----BEGIN OPENSSH PRIVATE KEY-----"];
	for (var i = 0; i < 5; i++) lignes.push(base64Aleatoire("cle-privee-" + (state.clesGenerees || 0) + "-" + i, 70));
	lignes.push("-----END OPENSSH PRIVATE KEY-----");
	return lignes.join("\n");
}

function dessinAleatoire(sel){
	var lignes = ["+--[ED25519 256]--+"];
	var symboles = ".o+=*BOX@%&";
	for (var y = 0; y < 9; y++){
		var ligne = "|";
		for (var x = 0; x < 17; x++){
			// Plus dense au centre, comme les vrais dessins de ssh-keygen.
			var distance = Math.abs(x - 8) / 8 + Math.abs(y - 4) / 4;
			var v = alea(sel + ":" + x + ":" + y);
			var seuil = 0.55 + distance * 0.25;
			ligne += v < seuil ? " " : symboles.charAt(Math.min(symboles.length - 1, Math.floor((v - seuil) / (1 - seuil) * symboles.length * (1.4 - distance * 0.6))));
		}
		lignes.push(ligne + "|");
	}
	lignes.push("+----[SHA256]-----+");
	return lignes.join("\n");
}

Shell.sorts["ssh-keygen"] = function(args, io){
	if (!io.tty) throw new ShellError("ssh-keygen : la fabrication d'une clé se fait à l'écran, sans tuyau.");
	var dossier = Home.getChildFromName(".ssh");
	var dejaLa = dossier !== -1 && dossier.getItemFromName("id_ed25519") !== -1;
	function fabriquer(phrase){
		state.clesGenerees = (state.clesGenerees || 0) + 1;
		if (dossier === -1){
			dossier = new Room(".ssh", "Le dossier de tes clés SSH. Rien que les tiennes.", "item_locker.gif");
			dossier.owner = JOUEUR;
			dossier.mode = "rwx------";
			libererNom(Home, ".ssh");
			link_rooms(Home, dossier);
		}
		["id_ed25519", "id_ed25519.pub"].forEach(function(n){
			var ancien = dossier.getItemFromName(n);
			if (ancien !== -1) dossier.removeItem(ancien);
		});
		var privee = new Item("id_ed25519", texteClePrivee(), "item_locker.gif").droits("rw-------", JOUEUR);
		var publique = new Item("id_ed25519.pub", texteClePublique(), "item_locker.gif").droits("rw-r--r--", JOUEUR);
		dossier.addItem(privee);
		dossier.addItem(publique);
		state.clePublique = publique.getText();
		var hex = sha256(publique.getText()), octets = "";
		for (var o = 0; o < 64; o += 2) octets += String.fromCharCode(parseInt(hex.substring(o, o + 2), 16));
		var empreinte = btoa(octets).replace(/=+$/, "");
		term.echo("Your identification has been saved in ~/.ssh/id_ed25519\n" +
			"Your public key has been saved in ~/.ssh/id_ed25519.pub\n" +
			"The key fingerprint is:\nSHA256:" + empreinte + " " + JOUEUR + "@terminus\n" +
			"The key's randomart image is:\n" + dessinAleatoire("art-" + state.clesGenerees) + "\n" +
			C.gris("(Deux objets sont nés dans ~/.ssh : la clé privée id_ed25519, à garder pour toi, et la clé publique id_ed25519.pub, à donner." +
			(phrase ? " Ta clé privée est protégée par ta phrase de passe." : " Sans phrase de passe, quiconque copie ta clé privée peut s'en servir.") + ")"));
		state.premierUsage("ssh-keygen");
		GameEvents.fire({ type: "keygen", passphrase: !!phrase });
		Shell.fin();
	}
	function demanderPhrase(){
		term.demander("Enter passphrase (empty for no passphrase): ", true, function(phrase){
			term.demander("Enter same passphrase again: ", true, function(confirmation){
				if (phrase !== confirmation){
					term.echo("Passphrases do not match.  Try again.");
					demanderPhrase();
					return;
				}
				fabriquer(phrase);
			});
		});
	}
	term.echo("Generating public/private ed25519 key pair.");
	if (dejaLa){
		term.demander("~/.ssh/id_ed25519 already exists.\nOverwrite (y/n)? ", false, function(reponse){
			if (!/^[yYoO]/.test(reponse.trim())){
				term.echo(C.gris("(Rien n'a changé : ta clé actuelle est conservée.)"));
				return;
			}
			demanderPhrase();
		});
	} else {
		demanderPhrase();
	}
	return "";
};

/* ------------------------------------------------------------------ */
/* Les lieux                                                           */
/* ------------------------------------------------------------------ */

function lieuDuChapitre2(lieu){
	lieu.chapitre = 2;
	return lieu;
}

var Crypte = lieuDuChapitre2(new Room("Crypte",
	"Le donjon sous la Citadelle. Un escalier de pierre plonge dans le froid ; derrière les murs ronronnent les programmes du système. \
Une radio grésille près d'un vieil archiviste.",
	"loc_stair.gif"));
Crypte.owner = "root";
Crypte.mode = "rwxr-xr-x";

var Whitfield = new Item("Archiviste",
	"Un vieil homme lève les yeux de ses parchemins. « Whitfield, archiviste. Chaque programme de bin a son EMPREINTE dans la liste SHA256SUMS. \
Change une virgule, l'empreinte change : c'est ainsi qu'on repère un grimoire corrompu.\n\n\
Va dans bin et lance : sha256sum -c SHA256SUMS. Le programme trafiqué répondra ÉCHEC. »\n\
(Du charabia qui finit par = ? C'est du base64, un simple emballage : base64 -d le déballe. Essaie : echo TonPrénom | base64)",
	"item_archiviste.gif").personnage().enseigne("sha256sum", "base64").revele("s_c_base64");
Crypte.addItem(Whitfield);

var TEXTE_RADIO_INTRO =
	"La radio grésille. « Ici Grace, de la WarRoom. Un mage noir, le Corbeau, s'est glissé dans la Citadelle et a corrompu nos machines. On le chasse ensemble.\n\n\
Commence par l'Archiviste : il saura quel programme a été ensorcelé. Je te guide à la radio. »\n\
(traque : ton tableau de chasse. Le Bestiaire traduit chaque image en vrai mot. La TrousseDEvi est au pied de l'escalier.)";
var Radio = new Item("Radio", TEXTE_RADIO_INTRO, "item_workstation.gif");
Crypte.addItem(Radio);

var DossierBin = lieuDuChapitre2(new Room("bin",
	"La salle des grimoires du système : chaque programme y dort, exécutable. La liste des empreintes est clouée au mur.",
	"loc_cluster.gif"));
DossierBin.owner = "root";
DossierBin.mode = "rwxr-xr-x";

var TEXTE_PORTIER =
	"#!/bin/sh\n# portier : ouvre et ferme les portes de la Citadelle aux heures prévues\n" +
	"heure=$(date +%H)\nif [ \"$heure\" -ge 7 ] && [ \"$heure\" -lt 22 ]; then\n  ouvrir grande_porte\nelse\n  fermer grande_porte\nfi\n";
var TEXTE_VEILLEUR =
	"#!/bin/sh\n# veilleur : note dans le journal chaque connexion à la Citadelle\n" +
	"journaliser \"connexion de $UTILISATEUR depuis $ADRESSE\" >> /var/log/citadelle.log\n";
var TEXTE_GARDIEN_ORIGINAL =
	"#!/bin/sh\n# gardien : refuse toute connexion qui ne présente pas une clé autorisée\n" +
	"verifier_cle \"$CLE\" /root/.ssh/authorized_keys || refuser\n";

/* Le message du Corbeau, caché en base64 dans le gardien trafiqué. */
var MESSAGE_CORBEAU = "Croa. Vous ne m'avez pas vu entrer. Ma porte est dans le Caveau : elle s'ouvre toute seule, " +
	"pour qui sait chercher le bon bit. Indice pour les lents : find -perm. Signé : le Corbeau.";
var CHARGE_CORBEAU = encoderBase64(MESSAGE_CORBEAU);
var TEXTE_GARDIEN_TRAFIQUE =
	"#!/bin/sh\n# gardien : refuse toute connexion qui ne présente pas une clé autorisée\n" +
	"verifier_cle \"$CLE\" /root/.ssh/authorized_keys || refuser\n" +
	"# ---\ncharge=" + CHARGE_CORBEAU + "\n";

function programme(nom, texte, mode){
	return new Item(nom, texte, "item_radspellbook.gif").droits(mode || "rwxr-xr-x", "root");
}
/*
 * Un vrai programme compilé (un binaire ELF) : illisible avec cat, et le seul genre de fichier
 * pour lequel Linux respecte le bit SUID (il l'ignore sur les scripts).
 */
function texteBinaire(sel, longueur){
	var signes = "@^#~&*%$!ÿþ¤§¶ÐØßæ.:;=+<>?";
	var texte = "\u007fELF\u0002\u0001\u0001";
	for (var i = 0; i < longueur; i++){
		texte += signes.charAt(Math.floor(alea(sel + ":" + i) * signes.length));
		if (i % 64 === 63) texte += "\n";
	}
	return texte;
}
function programmeBinaire(nom, sel, mode, sortie){
	var item = new Item(nom, texteBinaire(sel, 190), "item_radspellbook.gif").droits(mode, "root");
	item.binaire = { sortie: sortie };
	return item;
}

var Portier = programme("portier", TEXTE_PORTIER);
var Veilleur = programme("veilleur", TEXTE_VEILLEUR);
var Gardien = programme("gardien", TEXTE_GARDIEN_TRAFIQUE);
var ProgrammePasswd = programmeBinaire("passwd", "binaire-passwd", "rwsr-xr-x",
	"passwd : ce programme change le mot de passe de celui qui le lance. Pour ça, il doit écrire dans /etc/shadow, \
que seul root peut modifier : d'où son bit SUID, tout à fait normal. (Ici, utilise plutôt le sort passwd.)");
var Sha256Sums = new Item("SHA256SUMS",
	sha256(contenuExact(TEXTE_GARDIEN_ORIGINAL, Gardien.sansFinDeLigne)) + "  gardien\n" +
	sha256(contenuExact(ProgrammePasswd.getText(), ProgrammePasswd.sansFinDeLigne)) + "  passwd\n" +
	sha256(contenuExact(Portier.getText(), Portier.sansFinDeLigne)) + "  portier\n" +
	sha256(contenuExact(Veilleur.getText(), Veilleur.sansFinDeLigne)) + "  veilleur\n",
	"item_sign.gif").droits("rw-r--r--", "root");
[Gardien, ProgrammePasswd, Portier, Veilleur, Sha256Sums].forEach(function(item){ DossierBin.addItem(item); });

var Caveau = lieuDuChapitre2(new Room("Caveau",
	"Une salle voûtée taillée dans la roche. Des niches scellées par root bordent les murs. Quelque part, une porte que personne n'a bâtie.",
	"loc_cave.gif"));
Caveau.owner = "root";
Caveau.mode = "rwxr-xr-x";
var NICHES = [];
for (var numeroNiche = 1; numeroNiche <= 6; numeroNiche++){
	var niche = new Room("Niche" + numeroNiche, "Une niche scellée.", "loc_darkroom.gif");
	niche.owner = "root";
	niche.mode = "rwx------";
	niche.horsBareme = true;
	niche.deny_text = "Le sceau de root tient bon. Ce qui dort là ne te regarde pas.";
	niche.addItem(new Item("reliquaire_" + numeroNiche, "Un reliquaire poussiéreux, sans intérêt.", "item_box.gif").droits("rw-------", "root"));
	NICHES.push(niche);
}
var Inscription = new Item("Inscription",
	"Gravé dans la pierre :\n\n\
« Certains programmes agissent avec les droits de leur PROPRIÉTAIRE : c'est le bit SUID, un s à la place du x (-rwsr-xr-x). \
passwd en a besoin. Mais un programme SUID de root que personne n'a installé, c'est une porte dérobée.\n\
Pour les trouver : find . -perm -4000\n\
Les niches fermées font râler find sur la sortie d'erreur, la numéro 2 : 2>/dev/null la fait taire, 2>~/erreurs.txt la garde chez toi. »",
	"item_sign.gif").revele("s_c_silence", "s_c_trace");
Caveau.addItem(Inscription);
Caveau.addItem(new Item("Lanterne", "Une lanterne froide. Personne ne l'a allumée depuis longtemps.", "item_trinket.gif").droits("rw-r--r--", "root"));
Caveau.addItem(new Item("Coffret", "Un coffret vide. Quelqu'un a gratté le mot « croa » sur le couvercle.", "item_box.gif").droits("rw-r--r--", "root"));
var PorteDerobee = programmeBinaire(".porte", "binaire-porte", "rwsr-xr-x", "");
PorteDerobee.picturename = "./static/img/item_portal.gif";
/* La .porte n'apparaît dans le Caveau qu'une fois le programme trafiqué repéré ET le message décodé (voir verifierChapitre2). */

var Racine = lieuDuChapitre2(new Room("Racine",
	"La Racine, le domaine de root, tout au fond du donjon. Des processus bourdonnent dans l'ombre comme des abeilles. Rien ici n'est fait pour une recrue.",
	"loc_darkroom.gif"));
Racine.owner = "root";
Racine.mode = "rwxr-xr-x";

var ManuelDeNano = new Item("ManuelDeNano",
	"Le carnet d'Evi : « Pour modifier un fichier de root : sudo nano FICHIER. Ctrl+K coupe la ligne, Ctrl+O enregistre, Ctrl+X quitte. \
Avant de toucher un fichier sensible, garde une copie : il y en a une à côté de chacun, ici. »",
	"item_manuscript.gif").enseigne("nano");
Racine.addItem(ManuelDeNano);

/* Les processus de la Racine : un seul n'a rien à faire là, et il se déguise. */
var PIDS_RACINE = tirerPids("racine", 7, 100, 980);
/* Entre crochets : des threads du noyau, comme ps les affiche. Le Corbeau a copié leur nom, crochets compris. */
var NOMS_KWORKERS = ["[kworker/0:0]", "[kworker/0:1]", "[kworker/1:0]", "[kworker/1:1]", "[kworker/1:2]", "[kworker/2:0]", "[kworker/2:1]"];
var INDEX_CORBEAU = aleaEntier("kworker-corbeau", 0, 6);
for (var numeroProc = 0; numeroProc < 7; numeroProc++){
	if (numeroProc === INDEX_CORBEAU){
		Racine.addProc(PIDS_RACINE[numeroProc], NOMS_KWORKERS[numeroProc], "root", {
			cpu: 0.4, sig9: true, corbeau: true,
			ignoreText: "Le processus " + PIDS_RACINE[numeroProc] + " encaisse ton signal TERM sans broncher. Il s'accroche : kill -9.",
			killText: "Le faux kworker s'effondre. Quelque part dans l'école, une connexion se coupe net."
		});
	} else {
		Racine.addProc(PIDS_RACINE[numeroProc], NOMS_KWORKERS[numeroProc], "root", { cpu: 0.1, noyau: true });
	}
}
function procCorbeau(){
	for (var i = 0; i < Racine.procs.length; i++){
		if (Racine.procs[i].corbeau) return Racine.procs[i];
	}
	return null;
}

var DossierSshRoot = lieuDuChapitre2(new Room(".ssh",
	"Le dossier des clés de root. Celui qui a sa clé ici entre dans la Citadelle sans mot de passe.",
	"item_locker.gif"));
DossierSshRoot.owner = "root";
DossierSshRoot.mode = "rwx------";
DossierSshRoot.horsBareme = true;
var CLE_LAURENT = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("cle-laurent", 43) + " laurent@cybersup";
var CLE_CORBEAU = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("cle-corbeau", 43) + " corbeau@nid";
var AuthorizedKeys = new Item("authorized_keys", CLE_LAURENT + "\n" + CLE_CORBEAU + "\n", "item_locker.gif").droits("rw-------", "root");
var AuthorizedKeysOrig = new Item("authorized_keys.orig", CLE_LAURENT + "\n", "item_locker.gif").droits("rw-------", "root");
DossierSshRoot.addItem(AuthorizedKeys);
DossierSshRoot.addItem(AuthorizedKeysOrig);
DossierSshRoot.addItem(new Item("sshd_config",
	"# Configuration du serveur ssh de la Citadelle\nPort 22\nPermitRootLogin prohibit-password\nPasswordAuthentication no\n" +
	"PubkeyAuthentication yes\nAuthorizedKeysFile .ssh/authorized_keys\n", "item_sign.gif").droits("rw-r--r--", "root"));
link_rooms(Racine, DossierSshRoot);

/* À Cybersup : la boîte de dépôt d'Evi et le coffre de l'école. */
var BoiteDeDepot = lieuDuChapitre2(new Room("BoiteDeDepot",
	"Une boîte aux lettres pour fichiers. Tout le monde peut y déposer, personne ne peut effacer ce que les autres y ont mis.",
	"item_box.gif"));
BoiteDeDepot.owner = "evi";
BoiteDeDepot.mode = "rwxrwxrwt";
var ConsignesDuCoffre = new Item("ConsignesDuCoffre",
	"Fiche d'Evi. LE COFFRE N'OUVRE QU'AUX CLÉS.\n\n\
1. ssh-keygen forge ta paire de clés (avec une phrase de passe, c'est mieux).\n\
2. ~/.ssh/id_ed25519 est PRIVÉE : tu la gardes. id_ed25519.pub est PUBLIQUE : tu la donnes.\n\
3. Dépose la publique : cp ~/.ssh/id_ed25519.pub BoiteDeDepot\n\
4. Je l'installe, et ssh coffre t'ouvrira.\n\n\
Une clé PRIVÉE déposée ici est détruite. Sans discuter.",
	"item_sign.gif").enseigne("ssh-keygen");

var Coffre = lieuDuChapitre2(new Room("Coffre",
	"La chambre forte de l'école : les sujets d'examen et les notes y dorment. Une seule chaise, vide pour l'instant.",
	"loc_warroom.gif"));
Coffre.removeCommand("cd");
Coffre.addCmdText("cd", "Le coffre n'a pas de porte : on n'y entre que par le réseau, avec une clé. ssh coffre");
Coffre.owner = "root";
Coffre.mode = "rwxr-xr-x";

var Corbeau = new Item("Corbeau",
	"Sur la chaise, une silhouette encapuchonnée de noir fait tourner une plume. Elle retire sa capuche : c'est Frances, la stagiaire de Laurent. L'enfant de la cage !\n\n\
« Oui, le mage noir, c'était moi. J'avais les clés de tout, alors j'ai voulu voir si quelqu'un me trouverait : grimoire trafiqué, porte SUID, \
faux kworker sur le port " + PORT_CORBEAU + ", ma clé chez root. Je n'ai rien cassé. J'aurais dû prévenir Laurent : ça s'appelle la divulgation responsable. »\n\n\
La radio grésille. C'est Laurent : « Frances, tu commences en B1 dès lundi. Toi, la recrue : le rapport d'incident. \
cp ~/ModeleRapport ~/rapport.txt, puis vim ~/rapport.txt. »",
	"item_frances.gif").personnage();
/* Le Corbeau n'attend dans le coffre qu'une fois ses notes déchiffrées (voir Reseau.js). */
Coffre.addItem(new Item("SujetsDExamen", "Une pile de sujets sous scellés. Frances jure qu'elle ne les a pas ouverts. Les scellés lui donnent raison.", "item_manuscript.gif").droits("rw-------", "root"));
var CertificatCyber = new Item("CertificatCyber", "", "item_manuscript.gif");

link_rooms(Crypte, DossierBin);
link_rooms(Crypte, Caveau);
NICHES.forEach(function(n){ link_rooms(Caveau, n); });
/* BoiteDeDepot et Coffre n'apparaissent dans la SalleServeurs qu'à l'ouverture de la Crypte (voir verifierChapitre2). */

/* Le P.S. de Laurent : la panne du réseau de l'école (chapitre 2), avant la Crypte (chapitre 3). */
Laurent.cmd_text["less"] += "\n\n" +
	"P.S. Imprévu : pendant ton épreuve, le réseau de l'école est tombé, et Vint, notre administrateur réseau, est en vacances. \
Radia est montée de Marseille en renfort : elle t'attend au BatimentB (cd ~/Cybersup/BatimentB). Ce sera ton deuxième chapitre.";

HOTES["coffre"] = { ip: "10.0.92.250", arrivee: function(){ return Coffre; },
	refus: function(){
		var dossier = Home.getChildFromName(".ssh");
		if (dossier === -1 || dossier.getItemFromName("id_ed25519") === -1){
			return JOUEUR + "@coffre : Permission denied (publickey).\n" +
				C.gris("(Le coffre n'accepte que les clés, et tu n'en as pas : rien dans ~/.ssh. Les ConsignesDuCoffre, dans la SalleServeurs, expliquent comment faire.)");
		}
		if (!state.has("cleInstallee")){
			return JOUEUR + "@coffre : Permission denied (publickey).\n" +
				C.gris("(Tu as bien une clé, mais le coffre ne la connaît pas encore : il faut déposer ta clé PUBLIQUE dans la BoiteDeDepot de la SalleServeurs.)");
		}
		if (dossier.getItemFromName("id_ed25519").getText() !== state.clePrivee){
			return JOUEUR + "@coffre : Permission denied (publickey).\n" +
				C.gris("(La clé que tu présentes n'est plus celle que tu as déposée : tu en as refait une. Dépose la nouvelle clé publique dans la BoiteDeDepot.)");
		}
		return null;
	}
};

/* ------------------------------------------------------------------ */
/* Quêtes, indices et barème du chapitre                               */
/* ------------------------------------------------------------------ */

/* Les quêtes, les indices et la radio du chapitre sont définis dans Reseau.js, qui étend ce chapitre au réseau de l'école. */
var INDICES_CHAPITRE2 = {};

/* ------------------------------------------------------------------ */
/* Le monde réagit                                                     */
/* ------------------------------------------------------------------ */

function cleCorbeauRetiree(){
	var texte = AuthorizedKeys.getText();
	return texte.indexOf("corbeau@nid") === -1 && texte.indexOf(CLE_LAURENT) > -1;
}

function texteRadio(){
	if (typeof texteRadioReseau === "function"){ var t = texteRadioReseau(); if (t) return t; }
	return TEXTE_RADIO_INTRO;
}

function verifierChapitre2(){
	function une(nom, condition){
		if (!state.has(nom) && condition) state.applyState(nom);
	}
	// La Crypte (chapitre 3) s'ouvre quand le réseau est réparé, ou d'emblée en mission cyber.
	une("crypteOuverte", state.has("victoire") && (!!state.quests["r_fin"] || state.has("panneSautee")));
	if (!state.has("crypteOuverte")) return;
	// Aussi pour les sauvegardes faites avant le chapitre 2 : la SalleServeurs y est restaurée sans ces lieux.
	if (SalleServeurs.children.indexOf(BoiteDeDepot) === -1) relier(SalleServeurs, BoiteDeDepot);
	if (SalleServeurs.children.indexOf(Coffre) === -1) relier(SalleServeurs, Coffre);
	une("porteApparue", !!state.quests["c_integrite"] && !!state.quests["c_message"]);
	une("racineOuverte", state.has("porteOuverte"));
	une("cleCorbeauRetiree", state.has("ecouteCoupee") && cleCorbeauRetiree());
	if (state.has("cleCorbeauRetiree") && !SalleServeurs.hasItem(ConsignesDuCoffre)) poser(SalleServeurs, ConsignesDuCoffre);
	une("suidRetire", PorteDerobee.mode.charAt(2) === "x" || PorteDerobee.mode.charAt(2) === "-");
	if (Radio.getText() !== texteRadio()) Radio.cmd_text["less"] = texteRadio();
	if (state.quests["c_racine"] && Radio.teaches.indexOf("ss") === -1) Radio.teaches.push("ss");
	// La boîte de dépôt d'Evi
	for (var i = 0; i < BoiteDeDepot.items.length; i++){
		var depot = BoiteDeDepot.items[i];
		var texte = depot.getText();
		if (texte.indexOf("PRIVATE KEY") > -1){
			BoiteDeDepot.removeItem(depot);
			i--;
			// Cette paire est grillée : sa clé privée a été vue par quelqu'un d'autre.
			state.cleGrillee = state.clePublique;
			say(C.rouge("Evi surgit de derrière une baie, ton fichier à la main.") + " « C'est ta clé PRIVÉE, ça ! Je la détruis. \
Cette paire est grillée : quelqu'un d'autre a pu la voir. Refais une paire avec ssh-keygen, et donne-moi la PUBLIQUE, celle qui finit par .pub. »");
			continue;
		}
		if (texte.indexOf("ssh-ed25519") !== 0) continue;
		// Evi récupère tout ce qui ressemble à une clé publique : la boîte ne garde rien.
		BoiteDeDepot.removeItem(depot);
		i--;
		if (!state.clePublique || texte.trim() !== state.clePublique.trim()){
			say("Evi examine la clé déposée. « Celle-là ne correspond pas à ta clé actuelle, celle de ~/.ssh. Dépose ~/.ssh/id_ed25519.pub. »");
			continue;
		}
		if (state.clePublique === state.cleGrillee){
			say("Evi secoue la tête et jette la clé. « Non : c'est la moitié publique de la paire dont tu m'as donné la clé privée. Elle est grillée. ssh-keygen, et on recommence. »");
			continue;
		}
		var dossier = Home.getChildFromName(".ssh");
		var privee = dossier !== -1 ? dossier.getItemFromName("id_ed25519") : -1;
		var textePrivee = privee !== -1 ? privee.getText() : null;
		if (state.has("cleInstallee")){
			if (textePrivee !== state.clePrivee){
				state.clePrivee = textePrivee;
				say("Evi récupère ta nouvelle clé publique. « Je remplace l'ancienne sur le coffre par celle-ci. C'est fait : ssh coffre. »");
			} else {
				say("Evi te rend un sourire. « Celle-là, je l'ai déjà. Tu peux te connecter : ssh coffre. »");
			}
			continue;
		}
		state.clePrivee = textePrivee;
		state.applyState("cleInstallee");
	}
	if (state.has("ecouteCoupee") && !state.has("cleCorbeauRetiree") && AuthorizedKeys.getText().indexOf(CLE_LAURENT) === -1 && !state.has("laurentDehors")){
		state.set("laurentDehors");
		say("La radio grésille. C'est Laurent : « Euh... je ne peux plus me connecter à la Citadelle. Tu n'aurais pas retiré MA clé, par hasard ? \
Il y a une copie de secours juste à côté, authorized_keys.orig. »");
	}
	if (state.has("victoireCyber")) CertificatCyber.cmd_text["less"] = state.texteDuCertificat();
	if (typeof verifierReseau === "function") verifierReseau();
}

/* Les événements de l'histoire du chapitre (appelés par GameState.applyState). */
function etatChapitre2(nom){
	switch (nom){
		default:
			if (typeof etatReseau === "function") etatReseau(nom);
			break;
		case "crypteOuverte":
			relier(Citadelle, Crypte);
			Citadelle.changeIntroText("La forteresse de la Citadelle, reprise au Sorcier Noir. Mais une trappe s'est ouverte dans le sol, et un froid de donjon en monte : la Crypte. \
Laurent veille près du grand terminal.");
			if (state.has("panneDirecte")) Laurent.addCmdText("less", TEXTE_LAURENT_RENFORT);
			break;
		case "porteApparue":
			poser(Caveau, PorteDerobee);
			say("Quelque part sous tes pieds, dans le Caveau, une pierre pivote avec un grincement. Le Corbeau ne mentait pas : une porte vient d'apparaître. \
Elle se cache bien, pourtant : il faudra la chercher.");
			break;
		case "racineOuverte":
			relier(Caveau, Racine);
			break;
		case "cleCorbeauRetiree":
			say("Tu enregistres. La ligne du Corbeau a disparu des clés autorisées : sa clé n'ouvre plus rien ici.");
			state.complete("c_cle");
			break;
		case "suidRetire":
			say("La .porte n'a plus son bit SUID : elle ne donne plus les droits de root à personne. Une porte dérobée de moins.");
			state.complete("s_c_suidfix");
			if (!state.has("porteOuverte")){
				// Le joueur a désarmé la porte avant de la franchir : on le laisse descendre quand même.
				state.complete("c_suid");
				state.set("porteOuverte");
				state.applyState("racineOuverte");
				say("Whitfield, l'archiviste, descend l'escalier en agitant un trousseau. « Bien vu, mais il faut quand même aller voir \
ce que le Corbeau cachait dessous. Je t'ouvre l'escalier de service : la Racine est juste là. »");
			}
			break;
		case "cleInstallee":
			say("Evi récupère ta clé publique dans la BoiteDeDepot. « Parfait, c'est bien la .pub, et c'est bien la tienne. Je l'ajoute aux clés autorisées du coffre... voilà. \
Essaie : ssh coffre. »");
			HOTES["coffre"].ouvert = true;
			state.complete("c_coffre");
			break;
		case "victoireCyber":
			if (!state.dateVictoire2) state.dateVictoire2 = dateDuJour();
			state.complete("c_rapport");
			poser(Home, CertificatCyber);
			CertificatCyber.cmd_text["less"] = state.texteDuCertificat();
			say(C.gris("(Ton CertificatCyber est posé dans ta Maison : cat ~/CertificatCyber. Il porte la note du chapitre 3 et son code de vérification.)"));
			break;
	}
}

GameEvents.addListener("enter", function(e){
	if (e.room === Crypte && !state.quests["c_crypte"]){
		state.debutChapitre2 = state.tempsMs;
		state.complete("c_crypte");
	}
	if (e.room === Racine) state.complete("c_racine");
});

GameEvents.addListener("sha256sum", function(e){
	if (e.check && e.room === DossierBin && e.failed.indexOf("gardien") > -1) state.complete("c_integrite");
});

GameEvents.addListener("base64", function(e){
	if (e.decode && e.text.indexOf("le Corbeau") > -1) state.complete("c_message");
	if (!e.decode && identifiantDepuisPrenom(e.text).indexOf(JOUEUR) > -1) state.complete("s_c_base64");
});

GameEvents.addListener("find", function(e){
	if (e.suid && e.output.indexOf(".porte") > -1) state.complete("c_suid");
});

GameEvents.addListener("stderr", function(e){
	if (e.name !== "find" || e.count === 0) return;
	if (e.destination === "/dev/null") state.complete("s_c_silence");
	else if (e.destination !== null && e.destination !== "&1") state.complete("s_c_trace");
});

GameEvents.addListener("script", function(e){
	if (e.item === PorteDerobee && e.direct && state.has("porteOuverte") && PorteDerobee.mode.charAt(2) === "s") say("La porte pivote sans un bruit.");
	if (e.item === PorteDerobee && e.direct && !state.has("porteOuverte")){
		if (!state.quests["c_suid"]){
			say("La .porte refuse de bouger. Des lettres apparaissent sur le bois : « Prouve que tu sais trouver les portes comme moi : find . -perm -4000 »");
			return;
		}
		if (PorteDerobee.mode.charAt(2) !== "s"){
			say("La porte tourne sur ses gonds... et ne mène nulle part : sans son bit SUID, elle n'a plus les droits de root. Tant mieux, d'ailleurs.");
			return;
		}
		state.set("porteOuverte");
		say("La porte pivote sans un bruit.");
		say("Pendant une fraction de seconde, tu es root. Un escalier apparaît derrière la .porte : il descend vers la Racine.");
	}
});

GameEvents.addListener("kill", function(e){
	// Les vrais kworkers sont relancés aussitôt par le noyau.
	if (e.room === Racine && !e.proc.corbeau){
		Racine.addProc(e.proc.pid + 1000, e.proc.name, "root", { cpu: 0.1, killText: e.proc.killText });
	}
	if (e.proc.corbeau){
		state.set("ecouteCoupee");
		state.complete("c_ecoute");
	}
});

GameEvents.addListener("pipeline", function(e){
	if (e.names.length >= 4) state.set("tuyau4");
});

GameEvents.addListener("devnull", function(e){
	state.set("trouNoir");
});

GameEvents.addListener("keygen", function(e){
	if (e.passphrase) state.complete("s_c_passphrase");
});

GameEvents.addListener("read", function(e){
	if (e.item === Corbeau) state.complete("c_corbeau");
	if (e.item === Laurent && state.has("crypteOuverte") && !state.has("psLu")){
		state.set("psLu");
	}
});

/* ------------------------------------------------------------------ */
/* Jouer directement le chapitre 2 (la panne) ou 3 (la Crypte)        */
/* ------------------------------------------------------------------ */

/*
 * Le chemin le plus court à travers le chapitre 1, rejoué en silence quand un
 * groupe commence directement au chapitre 2. Les <repères> sont remplacés par
 * les valeurs de la partie.
 */
var CHEMIN_CHAPITRE_1 = [
	"cd ~/ForetOuest/AcademieDesSorts/Cours", "less Professeur",
	"cd ~/PrairieNord/MontagnesEst", "less VieilHomme", "less VieuxManuscrits",
	"cd Grotte/CouloirSombre/SalleHumide", "mv Rocher PetitTrou", "cd .Tunnel/ChambreDePierre", "less Stele",
	"chmod +x Portail", "cd Portail/PlaceDuVillage",
	"cd Marche", "less SortRm", "less SortMkdir", "less SortAlias", "less SortExport", "less SortLn", "cd ..",
	"cd Atelier", "less Artisane", "cd ..",
	"cd PontBrise", "touch Planche", "cd Clairiere", "cd SentierSinistre", "rm Ronces",
	"cd CaverneDesTrolls", "mv TrollMoche ..", "cd Toboggan/FichiersDuNoyau", "less Instructions",
	"cd ~/ForetOuest/AcademieDesSorts/Scriptorium", "less Copiste",
	"cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/Bibliotheque",
	"less LevierDiscret", "cd ArriereSalle", "less Bibliothecaire",
	"cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/Taverne", "less Barde",
	"cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/PontBrise/Clairiere/SentierSinistre/CaverneDesTrolls/Toboggan/FichiersDuNoyau/ArchivesDuNoyau",
	"grep motdepasse= *", "cd ..", "sudo less Certificat", "cd Citadelle",
	"cd ~/Cybersup/SalleDeCours", "less Formateur", "cd ../SalleServeurs", "less Administratrice",
	"ssh citadelle", "sudo crontab -u sorcier -r",
	"sudo kill -9 <pid:demon_bouclier> <pid:demon_illusion> <pid:demon_corruption>",
	"sudo cat .Phylactere", "echo Laurent", "less Laurent"
];

function remplirReperes(commande){
	return commande
		.replace(/<motdepasse>/g, MOT_DE_PASSE_SUDO)
		.replace(/<pid:([a-z_]+)>/g, function(tout, nom){
			for (var i = 0; i < current_room.procs.length; i++){
				if (current_room.procs[i].name === nom) return String(current_room.procs[i].pid);
			}
			return "0";
		});
}

/* Rejoue le chapitre 1 sans rien afficher. Renvoie vrai si la victoire est acquise. */
function sauterChapitre1(){
	// Tous les sorts du chapitre 1 sont considérés comme acquis.
	for (var s = 0; s < ORDRE_DES_SORTS.length; s++) state.spells[ORDRE_DES_SORTS[s]] = true;
	var vraiDemander = term.demander;
	term.demander = function(texte, masque, rappel){ rappel(MOT_DE_PASSE_SUDO); };
	try {
		Shell.capturer(function(){
			for (var i = 0; i < CHEMIN_CHAPITRE_1.length; i++){
				var commande = remplirReperes(CHEMIN_CHAPITRE_1[i]);
				if (commande.indexOf("sudo") === 0 && !state.has("sudoOK")) state.applyState("sudoOK");
				Shell.lancer(Shell.decouper(commande));
				verifierMonde();
				Shell.narration = [];
				state.gainsDuTour = [];
			}
		});
	} finally {
		term.demander = vraiDemander;
	}
	if (!state.has("victoire")) return false;
	// Le chapitre 1 est considéré comme fait : aucune de ses étapes ne reste ouverte.
	for (var q = 0; q < QUETES_PRINCIPALES.length; q++) state.quests[QUETES_PRINCIPALES[q].id] = true;
	state.niveauAnnonce = state.niveau();
	return true;
}

/* Le texte de Laurent quand le joueur arrive en renfort pour la Crypte, sans avoir passé l'épreuve de première année. */
var TEXTE_LAURENT_RENFORT =
	"« Ah, le renfort ! Laurent, directeur pédagogique. La cape noire ? Ce matin, je jouais le Sorcier Noir pour l'épreuve des B1.\n\n\
Mais pendant l'examen, un vrai mage noir est entré : Grace voit du trafic sous la Citadelle, sur un port que personne n'utilise. \
Une trappe vient de s'ouvrir : cd Crypte. L'Archiviste t'attend en bas, Grace te guide à la radio. Tu as les droits sudo : relis toujours ta ligne. »";

/* Le même, pour le renfort réseau : la Crypte ne s'ouvrira qu'une fois le réseau réparé. */
var TEXTE_LAURENT_RENFORT_PANNE =
	"« Ah, te voilà, le renfort réseau. Je suis Laurent, directeur pédagogique de Cybersup. Ne fais pas attention à la cape noire \
posée sur la chaise : ce matin, je jouais le Sorcier Noir pour l'épreuve pratique des B1. Ils ont traversé tout Terminus \
avec un simple terminal, et ils m'ont battu.\n\n\
Pendant ce temps, le réseau de l'école est tombé, et Vint est en vacances. Radia t'attend au BatimentB de Cybersup : \
c'est là-bas que ça se passe, pas ici. Et s'il te reste de l'énergie ensuite, Grace a quelque chose à te montrer sous cette Citadelle. »";

var TEXTE_MISSION_PANNE =
	"TICKET D'INCIDENT\n\n" +
	"Tu n'es pas là pour l'épreuve de première année : elle s'est jouée ce matin. Les B1 ont traversé Terminus et vaincu le Sorcier Noir, " +
	"qui n'était autre que Laurent, le directeur pédagogique, déguisé pour l'occasion.\n\n" +
	"Mais pendant l'épreuve, le réseau de l'école est tombé : le bâtiment B est coupé du monde, l'intranet affiche n'importe quoi, " +
	"les mails ne partent plus et Lille ne répond plus. Vint, l'administrateur réseau, est en vacances. On t'a appelé en renfort, " +
	"parce que tu connais déjà les bases du terminal.\n\n" +
	"Tu arrives au BatimentB de Cybersup. Radia, M1 réseau, t'attend devant l'armoire qui clignote : ";

var TEXTE_MISSION_CYBER =
	"MISSION CYBER\n\n" +
	"Tu n'es pas là pour l'épreuve de première année : elle s'est jouée ce matin. Les B1 ont traversé Terminus et vaincu le Sorcier Noir, " +
	"qui n'était autre que Laurent, le directeur pédagogique, déguisé pour l'occasion.\n\n" +
	"Mais pendant la correction, les sondes de la WarRoom ont vu passer du trafic qui n'était pas prévu. Grace a demandé du renfort, " +
	"et c'est toi qu'on a appelé, parce que tu connais déjà les bases du terminal.\n\n" +
	"Tu arrives à Cybersup, dans la WarRoom, où les voyants clignotent encore. Grace, la cheffe de quart, t'attend pour le briefing : ";

/* Le ticket d'incident, posé dans la Maison du renfort réseau. */
var TicketIncident = new Item("TicketIncident",
	"CYBERSUP · SUPPORT · TICKET N° 4012 · PRIORITÉ HAUTE\n\n" +
	"Objet : panne générale du réseau. Bâtiment B coupé, intranet hors service, mails bloqués, liaison avec Lille perdue.\n" +
	"Administrateur réseau : en congés. Intervenante sur place : Radia, M1 réseau (campus de Marseille).\n\n" +
	"Se présenter au BatimentB de Cybersup (cd ~/Cybersup/BatimentB).\n" +
	"Droits sudo accordés pour la durée de l'intervention.", "item_manuscript.gif");

/* L'ordre de mission, posé dans la Maison du renfort. */
var OrdreDeMission = new Item("OrdreDeMission",
	"CYBERSUP · WARROOM · ORDRE DE MISSION\n\n" +
	"Objet : renfort demandé d'urgence.\n\n" +
	"Trafic anormal détecté sous la Citadelle (machine citadelle) après l'épreuve pratique des B1.\n" +
	"Se présenter à la WarRoom de Cybersup (cd ~/Cybersup/WarRoom), puis se connecter à la machine : ssh citadelle.\n" +
	"Droits sudo accordés pour la durée de la mission.\n\n" +
	"Signé : Grace, cheffe de quart.", "item_manuscript.gif");

/* Pour le mode mission cyber, le monde raconte que d'autres ont passé l'épreuve. */
function adapterAuRenfort(){
	Laurent.addCmdText("less", TEXTE_LAURENT_RENFORT);
	CheffeDeQuart.addCmdText("less", "« Le renfort ! Parfait, merci d'être venu si vite. Je te résume.\n\n\
Ce matin, les B1 ont passé leur épreuve pratique dans Terminus, le monde d'entraînement de l'école. \
Le méchant de l'épreuve, le Sorcier Noir, c'était Laurent, notre directeur pédagogique, et ils l'ont battu. \
Pendant ce temps, mes M2 faisaient un exercice de crise ici. Tout était prévu, tout était sous contrôle.\n\n\
Sauf ça : depuis la correction, mes sondes voient du trafic sous la Citadelle, la machine de l'épreuve, sur un port que personne n'utilise. \
Ce n'est pas un exercice. Quelqu'un est vraiment entré.\n\n\
Laurent est resté là-haut, dans la Citadelle. Connecte-toi à la machine : ssh citadelle. Il t'expliquera le reste, \
et moi je te suivrai à la radio. Ton compte a les droits sudo pour la mission. »");
	CheffeDeQuart.teaches = [];
	// Le renfort n'a pas joué l'épreuve : la révélation du Corbeau doit se comprendre sans elle.
	var texteCorbeau = Corbeau.getText()
		.replace("c'est Frances, la stagiaire de Laurent. L'enfant de la cage !",
			"c'est Frances. Tu ne l'as jamais vue : c'est la stagiaire de Laurent, qui jouait ce matin l'enfant enlevée dans l'épreuve des B1.");
	Corbeau.setText(texteCorbeau);
	if (Corbeau.cmd_text && Corbeau.cmd_text["less"]) Corbeau.addCmdText("less", texteCorbeau);
	TableauAffichage.setText(TEXTE_TABLEAU + "\n\nRÉSULTATS DE L'ÉPREUVE PRATIQUE DES B1 : le Sorcier Noir est vaincu. Félicitations à la promo.");
}

/* Le chapitre 2 se choisit au tout début d'une partie : avant d'avoir franchi la moindre étape. */
function chapitre2Possible(){
	return !state.has("victoire") && !QUETES_PRINCIPALES.some(function(q){ return state.quests[q.id]; });
}

/*
 * Rejoue le chapitre 1 en silence et place le joueur en renfort : à la WarRoom pour la Crypte
 * (cible 2, la mission cyber), au BatimentB pour la panne (cible 3).
 * Si le passage n'aboutit pas, la partie est remise comme avant. Renvoie vrai si c'est fait.
 */
function commencerChapitre2(cible){
	cible = cible === 3 ? 3 : 2;
	var avant = null;
	try {
		state.save();
		avant = window.localStorage.getItem(CLE_SAUVEGARDE);
	} catch (e){
		avant = null;
	}
	var alias = state.alias;
	state.alias = {};   // les alias du joueur ne doivent pas détourner la relecture
	var ok = false;
	state.flags.rejeuEnCours = true;   // pas de fanfare pendant la relecture silencieuse
	// La mission cyber saute aussi la panne ; le renfort réseau, lui, commence par elle.
	state.set(cible === 2 ? "panneSautee" : "panneDirecte");
	try {
		ok = sauterChapitre1();
	} catch (e){
		ok = false;
	}
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	if (!ok){
		delete state.flags.panneSautee;
		delete state.flags.panneDirecte;
		// Rien ne doit rester du passage raté : on remet la sauvegarde d'avant et on recharge la page.
		Shell.sauvegardeBloquee = true;
		try {
			if (avant !== null) window.localStorage.setItem(CLE_SAUVEGARDE, avant);
			else window.localStorage.removeItem(CLE_SAUVEGARDE);
		} catch (e){}
		term.echo(C.rouge("Le passage à la mission cyber n'a pas abouti.") + " Ta partie est remise comme avant.\n" +
			C.gris("Pour partir en renfort, pars d'une partie neuve : recommencer, puis choisis ton enveloppe."));
		window.location.reload();
		return false;
	}
	state.set("chapitre1Saute");
	state.malus = 0;
	state.indices = {};
	PROFIL.chapitre = cible;
	enregistrerProfil();
	adapterAuRenfort();
	Shell.pile_ssh = [];
	state.gainsDuTour = [];
	if (cible === 3){
		// Le renfort réseau commence au BatimentB, devant Radia.
		Laurent.addCmdText("less", TEXTE_LAURENT_RENFORT_PANNE);
		poser(Home, TicketIncident);
		verifierMonde();
		enterRoom(BatimentB);
		Shell.lieu_precedent = null;
		montrerImage(BatimentB.room_pic, BatimentB.room_name);
		term.effacer();
		term.echo(C.vert(C.gras("CHAPITRE 2 : LA PANNE")) + "\n\n" + TEXTE_MISSION_PANNE + C.vert("cat Radia") + "\n\n" +
			C.gris("Ce chapitre a sa propre note sur 20. Tape quetes pour le journal, indice si tu bloques, xp pour ta note."));
		return true;
	}
	// Le renfort cyber commence à la WarRoom de Cybersup, et monte à la Citadelle par ssh.
	enterRoom(WarRoom);
	Shell.lieu_precedent = null;
	poser(Home, OrdreDeMission);
	montrerImage(WarRoom.room_pic, WarRoom.room_name);
	term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 3 : LA CRYPTE")) + "\n\n" + TEXTE_MISSION_CYBER + C.vert("cat CheffeDeQuart") + "\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. Tape quetes pour le journal, indice si tu bloques, xp pour ta note."));
	return true;
}

Shell.sorts.chapitre = function(args, io){
	var demande = args[0];
	var mission = state.has("chapitre1Saute");
	// La liste des chapitres (leur état, ta note, comment t'y rendre) : Navigation.js, comme chapitres.
	if (demande === undefined) return texteDesChapitres();
	if (demande === "1") return mission ?
		"Tu es venu en renfort : le chapitre 1, ce sont les B1 qui l'ont passé ce matin. Le monde de Terminus reste ouvert si tu veux le visiter." :
		"Le chapitre 1 commence dans ta Maison : cd, puis ls.";
	if (demande === "4"){
		if (state.has("ch4Ouvert")) return "Le chapitre 4 est déjà ouvert : l'Académie des Arcanes est au fond de la SalleServeurs (cd ~/Cybersup/SalleServeurs, puis cd Academie). aller 4 t'y emmène.";
		if (!chapitre2Possible()) return "Tu as déjà commencé une partie : le chapitre 4 (l'Académie) s'ouvre à la fin de la Crypte, ou se choisit au tout début d'une partie neuve.\n" +
			C.gris("(Pour partir directement à l'Académie : recommencer, puis chapitre 4.)") + "\n" + conseilRenfort(4);
		if (typeof commencerChapitre4 !== "function") return "Le chapitre 4 n'est pas encore disponible.";
		term.demander("Partir directement à l'Académie des Arcanes (chapitre 4, niveau avancé) ? Les chapitres 1 à 3 ne seront pas notés pour toi. Tape oui pour confirmer : ", false, function(reponse){
			if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Les chapitres précédents t'attendent."); return; }
			if (commencerChapitre4()) Shell.fin();
		});
		return "";
	}
	if (demande === "5"){
		if (state.has("ch5Ouvert")) return "Le chapitre 5 est déjà ouvert : le Bastion est en " + Shell.cheminAffiche(HallBastion) + " (cd " + Shell.cheminAffiche(HallBastion) + "). aller 5 t'y emmène.";
		if (!chapitre2Possible()) return "Tu as déjà commencé une partie : le chapitre 5 (le Bastion) s'ouvre à la fin de l'Académie, ou se choisit au tout début d'une partie neuve.\n" +
			C.gris("(Pour partir directement au Bastion : recommencer, puis chapitre 5.)") + "\n" + conseilRenfort(5);
		if (typeof commencerChapitre5 !== "function") return "Le chapitre 5 n'est pas encore disponible.";
		term.demander("Partir directement au Bastion (chapitre 5, durcissement Linux) ? Les chapitres 1 à 4 ne seront pas notés pour toi. Tape oui pour confirmer : ", false, function(reponse){
			if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Les chapitres précédents t'attendent."); return; }
			if (commencerChapitre5()) Shell.fin();
		});
		return "";
	}
	if (demande === "6"){
		if (state.has("ch6Ouvert")) return "Le chapitre 6 est déjà ouvert : Lumen est en " + Shell.cheminAffiche(HallLumen) + " (cd " + Shell.cheminAffiche(HallLumen) + "). aller 6 t'y emmène.";
		if (!chapitre2Possible()) return "Tu as déjà commencé une partie : le chapitre 6 (Lumen) s'ouvre à la fin du Bastion, ou se choisit au tout début d'une partie neuve.\n" +
			C.gris("(Pour partir directement à Lumen : recommencer, puis chapitre 6.)") + "\n" + conseilRenfort(6);
		if (typeof commencerChapitre6 !== "function") return "Le chapitre 6 n'est pas encore disponible.";
		term.demander("Partir directement à Lumen (chapitre 6, exploitation Linux) ? Les chapitres 1 à 5 ne seront pas notés pour toi. Tape oui pour confirmer : ", false, function(reponse){
			if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Les chapitres précédents t'attendent."); return; }
			if (commencerChapitre6()) Shell.fin();
		});
		return "";
	}
	if (demande === "7"){
		if (state.has("ch7Ouvert")) return "Le chapitre 7 est déjà ouvert : Port-Aube est au large (cd ~/Cybersup/Embarcadere, puis cd PortAube). aller 7 t'y emmène.";
		if (!chapitre2Possible()) return "Tu as déjà commencé une partie : le chapitre 7 (Port-Aube) s'ouvre à la fin de Lumen, ou se choisit au tout début d'une partie neuve.\n" +
			C.gris("(Pour partir directement à Port-Aube : recommencer, puis chapitre 7.)") + "\n" + conseilRenfort(7);
		if (typeof commencerChapitre7 !== "function") return "Le chapitre 7 n'est pas encore disponible.";
		term.demander("Partir directement à Port-Aube (chapitre 7, services réseau Linux) ? Les chapitres 1 à 6 ne seront pas notés pour toi. Tape oui pour confirmer : ", false, function(reponse){
			if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Les chapitres précédents t'attendent."); return; }
			if (commencerChapitre7()) Shell.fin();
		});
		return "";
	}
	if (demande === "8"){
		if (state.has("ch8Ouvert")) return "Le chapitre 8 est déjà ouvert : le Grand Port t'attend (cd " + Shell.cheminAffiche(GrandPortCh8) + "). aller 8 t'y emmène.";
		if (!chapitre2Possible()) return "Tu as déjà commencé une partie : le chapitre 8 (le Grand Port) s'ouvre à la fin de Port-Aube, ou se choisit au tout début d'une partie neuve.\n" +
			C.gris("(Pour partir directement au Grand Port : recommencer, puis chapitre 8.)") + "\n" + conseilRenfort(8);
		if (typeof commencerChapitre8 !== "function") return "Le chapitre 8 n'est pas encore disponible.";
		term.demander("Partir directement au Grand Port (chapitre 8, les conteneurs) ? Les chapitres 1 à 7 ne seront pas notés pour toi. Tape oui pour confirmer : ", false, function(reponse){
			if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Les chapitres précédents t'attendent."); return; }
			if (commencerChapitre8()) Shell.fin();
		});
		return "";
	}
	if (demande !== "2" && demande !== "3") throw new ShellError("chapitre : il n'y a que les chapitres 1, 2, 3, 4, 5, 6, 7 et 8. Tape chapitre pour la liste.");
	if (demande === "2"){
		if (state.has("panneSautee")) return "Tu es venu en renfort pour la mission cyber : la panne du réseau ne fait pas partie de ta mission.";
		if (state.has("panneOuverte")) return "Le chapitre 2 est déjà ouvert : Radia t'attend au BatimentB de Cybersup (cd ~/Cybersup/BatimentB). aller 2 t'y emmène.";
	} else if (state.has("crypteOuverte")){
		return "Le chapitre 3 est déjà ouvert : la Crypte est sous la Citadelle. Depuis n'importe où : ssh citadelle, puis cd Crypte. aller 3 t'y emmène.";
	}
	if (!chapitre2Possible()){
		if (demande === "3" && state.has("panneOuverte")) return "Le chapitre 3 s'ouvrira quand le réseau de l'école sera réparé (chapitre 2) : Radia t'attend au BatimentB de Cybersup.";
		return "Tu as commencé l'épreuve de première année : le chapitre " + demande + " s'ouvrira " + (demande === "2" ? "quand tu auras battu le Sorcier Noir." : "après le chapitre 2.") + "\n" +
			C.gris("(Le renfort se choisit au tout début d'une partie. Pour repartir de zéro et le choisir : recommencer.)");
	}
	var question = demande === "2" ?
		"Partir en renfort sur la panne du réseau ? L'épreuve de première année (chapitre 1) ne sera pas notée pour toi. Tape oui pour confirmer : " :
		"Partir en mission cyber ? On t'appelle en renfort : l'épreuve de première année (chapitre 1) et la panne (chapitre 2) ne seront pas notées pour toi. Tape oui pour confirmer : ";
	term.demander(question, false, function(reponse){
		if (String(reponse).trim().toLowerCase() !== "oui"){
			term.echo("Bien. L'épreuve de première année t'attend.");
			return;
		}
		if (commencerChapitre2(demande === "2" ? 3 : 2)) Shell.fin();
	});
	return "";
};

/* World.fige est posé à la fin de Panne.js, une fois tous les chapitres construits. */
