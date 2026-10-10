/**
 * SortsAvances.js : la deuxième vague de sorts.
 *
 *  - personnaliser son terminal : variables (export, env), alias, unalias
 *  - raccourcis : ln -s (liens symboliques)
 *  - textes : diff, cut
 *  - scripts : bash (et ./script, qui vit dans Shell.js)
 *  - système : date, id, top, df, du, chown, passwd, crontab
 *  - archives : tar
 *  - réseau : hostname, ping, ssh
 *  - paquets : apt, cowsay
 *
 * Tout fonctionne comme sous Linux, en plus simple. Les tailles sont comptées
 * en caractères, les machines du réseau sont au nombre de trois, et apt ne
 * connaît qu'une poignée de paquets.
 */

var UTILISATEURS = { "root": 0, "laurent": 1001, "sorcier": 666, "terminus": 999 };
UTILISATEURS[JOUEUR] = 1000;
var VARIABLES_SYSTEME = ["USER", "LOGNAME", "HOME", "PWD", "SHELL", "HOSTNAME", "PATH", "LANG"];

/* ------------------------------------------------------------------ */
/* Variables et alias                                                  */
/* ------------------------------------------------------------------ */

Shell.definirVariable = function(affectation, cmd){
	var coupe = affectation.indexOf("=");
	var nom = affectation.substring(0, coupe);
	var valeur = affectation.substring(coupe + 1);
	var prefixe = cmd ? cmd + " : " : "";
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nom)){
		throw new ShellError(prefixe + "« " + nom + " » n'est pas un nom de variable valide (des lettres, des chiffres, des tirets bas, et pas de chiffre au début).");
	}
	if (VARIABLES_SYSTEME.indexOf(nom) > -1){
		throw new ShellError(prefixe + "la variable " + nom + " est tenue à jour par le système. Ici, on la lit (echo $" + nom + "), on ne la change pas.");
	}
	if (valeur.length > 200) throw new ShellError(prefixe + "cette valeur est bien trop longue.");
	state.env[nom] = valeur;
	GameEvents.fire({ type: "export", name: nom, value: valeur });
};

Shell.sorts["export"] = function(args, io){
	if (args.length === 0) return Shell.sorts.env([], io);
	for (var i = 0; i < args.length; i++){
		if (args[i].indexOf("=") > 0) Shell.definirVariable(args[i], "export");
		else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(args[i])){
			throw new ShellError("export : « " + args[i] + " » : il faut écrire export NOM=valeur, sans espace autour du signe égal.");
		}
	}
	return "";
};

Shell.sorts.env = function(args, io){
	var lignes = [
		"USER=" + JOUEUR,
		"HOME=~",
		"PWD=" + current_room.path(),
		"SHELL=/bin/bash",
		"HOSTNAME=" + Shell.hote(),
		"LANG=fr_FR.UTF-8",
		"PATH=/usr/local/bin:/usr/bin:/bin"
	];
	var noms = [];
	for (var nom in state.env){
		if (state.env.hasOwnProperty(nom)) noms.push(nom);
	}
	noms.sort();
	for (var i = 0; i < noms.length; i++) lignes.push(noms[i] + "=" + state.env[noms[i]]);
	return lignes.join("\n");
};

Shell.sorts.alias = function(args, io){
	var noms = [], nom;
	if (args.length === 0){
		for (nom in state.alias){
			if (state.alias.hasOwnProperty(nom)) noms.push(nom);
		}
		if (noms.length === 0) return io.tty ? C.gris("(aucun alias pour l'instant : alias ll='ls -l' en crée un)") : "";
		noms.sort();
		return noms.map(function(n){ return "alias " + n + "='" + state.alias[n] + "'"; }).join("\n");
	}
	var lignes = [];
	for (var i = 0; i < args.length; i++){
		var coupe = args[i].indexOf("=");
		if (coupe < 1){
			if (state.alias.hasOwnProperty(args[i])){
				lignes.push("alias " + args[i] + "='" + state.alias[args[i]] + "'");
				continue;
			}
			throw new ShellError("alias : " + args[i] + " : introuvable\n" +
				C.gris("(Pour créer un alias : alias NOM='sort avec ses options'. Les apostrophes gardent le tout en un seul morceau.)"));
		}
		nom = args[i].substring(0, coupe);
		var valeur = args[i].substring(coupe + 1).trim();
		if (!/^[A-Za-z0-9_.\-]+$/.test(nom)) throw new ShellError("alias : « " + nom + " » n'est pas un nom d'alias valide.");
		if (["alias", "unalias", "sudo", "recommencer"].indexOf(nom) > -1) throw new ShellError("alias : mieux vaut ne pas redéfinir « " + nom + " », tu ne pourrais plus revenir en arrière.");
		if (valeur === "") throw new ShellError("alias : il manque le sort à associer à « " + nom + " ». Exemple : alias ll='ls -l'");
		state.alias[nom] = valeur;
		GameEvents.fire({ type: "alias", name: nom, value: valeur });
	}
	return lignes.join("\n");
};

Shell.sorts.unalias = function(args, io){
	if (args.length === 0) throw new ShellError("unalias : quel alias veux-tu oublier ? Utilisation : unalias NOM");
	for (var i = 0; i < args.length; i++){
		if (!state.alias.hasOwnProperty(args[i])) throw new ShellError("unalias : " + args[i] + " : introuvable");
		delete state.alias[args[i]];
	}
	return "";
};

/* ------------------------------------------------------------------ */
/* Liens symboliques                                                   */
/* ------------------------------------------------------------------ */

Shell.sorts.ln = function(args, io){
	var p = lireOptions(args, "sfv", "ln");
	if (p.reste.length !== 2) throw new ShellError("ln : il faut une cible, puis un nom pour le raccourci. Utilisation : ln -s CIBLE NOM");
	if (!p.opts.s){
		throw new ShellError("ln : sans -s, ln fabrique un lien « dur », une affaire de mages confirmés.\n" +
			"Pour un raccourci (un lien symbolique) : ln -s CIBLE NOM");
	}
	var cible = Shell.chercher(p.reste[0], io, "ln");
	if (cible.node === null){
		throw new ShellError("ln : la cible « " + p.reste[0] + " » n'existe pas.\n" +
			C.gris("(Un vrai ln -s accepterait quand même, et tu te retrouverais avec un lien brisé. Ici, on préfère te prévenir.)"));
	}
	var chemin;
	if (cible.node instanceof Room) chemin = cible.node.path();
	else if (cible.node.lien) chemin = cible.node.lien;
	else chemin = (cible.dir.path() === "~" ? "~" : cible.dir.path()) + "/" + cible.node.itemname;
	var dest = Shell.chercher(p.reste[1], io, "ln");
	var lieu, nom;
	if (dest.node instanceof Room){ lieu = dest.node; nom = cible.node.toString(); }
	else if (dest.node !== null) throw new ShellError("ln : impossible de créer le lien « " + dest.name + " » : ce nom est déjà pris.");
	else { lieu = dest.dir; nom = dest.name; }
	if (lieu.getNode(nom) !== null) throw new ShellError("ln : il y a déjà quelque chose qui s'appelle « " + nom + " » dans " + lieu.room_name + ".");
	if (p.reste[0].charAt(0) !== "~" && lieu !== current_room){
		throw new ShellError("ln : attention, piège classique. Une cible écrite en chemin relatif (« " + p.reste[0] + " ») est lue à partir de l'endroit où se trouve le raccourci, pas à partir d'ici : ton lien serait brisé.\n" +
			"Donne le chemin complet de la cible, celui qui commence par ~ . Si la cible est le lieu où tu te tiens : ln -s $PWD " + p.reste[1]);
	}
	Shell.nomValide(nom, "ln");
	var lien = new Item(nom, "");
	lien.lien = chemin;
	lien.owner = JOUEUR;
	lien.mode = "rwxrwxrwx";
	lien.picturename = cible.node instanceof Room ? cible.node.room_pic : cible.node.picturename;
	lieu.addItem(lien);
	GameEvents.fire({ type: "ln", link: lien, target: cible.node, room: lieu });
	return "Raccourci créé : " + nom + " -> " + chemin;
};

/* ------------------------------------------------------------------ */
/* Comparer et découper des textes                                     */
/* ------------------------------------------------------------------ */

/* Compare deux listes de lignes et renvoie les blocs de différences. */
function differences(a, b){
	var n = a.length, m = b.length, i, j;
	var table = [];
	for (i = 0; i <= n; i++){
		table.push([]);
		for (j = 0; j <= m; j++) table[i].push(0);
	}
	for (i = n - 1; i >= 0; i--){
		for (j = m - 1; j >= 0; j--){
			table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}
	var blocs = [], courant = null;
	i = 0; j = 0;
	function ouvrir(){ if (courant === null) courant = { a0: i, b0: j, retires: [], ajoutes: [] }; }
	function fermer(){ if (courant !== null){ blocs.push(courant); courant = null; } }
	while (i < n || j < m){
		if (i < n && j < m && a[i] === b[j]){ fermer(); i++; j++; }
		else if (j < m && (i === n || table[i][j + 1] >= table[i + 1][j])){ ouvrir(); courant.ajoutes.push(b[j]); j++; }
		else { ouvrir(); courant.retires.push(a[i]); i++; }
	}
	fermer();
	return blocs;
}

Shell.sorts.diff = function(args, io){
	var p = lireOptions(args, "qsu", "diff");
	if (p.reste.length !== 2) throw new ShellError("diff : il faut deux objets à comparer. Utilisation : diff OBJET1 OBJET2");
	var un = Shell.objetLisible(p.reste[0], io, "diff");
	var deux = Shell.objetLisible(p.reste[1], io, "diff");
	if (lignesDe(un.item.getText()).length * lignesDe(deux.item.getText()).length > 250000){
		throw new ShellError("diff : ces deux textes sont trop longs pour être comparés ligne à ligne ici.");
	}
	var blocs = differences(lignesDe(un.item.getText()), lignesDe(deux.item.getText()));
	GameEvents.fire({ type: "diff", a: un.item, b: deux.item, different: blocs.length > 0 });
	if (blocs.length === 0){
		return p.opts.s ? "Les objets " + p.reste[0] + " et " + p.reste[1] + " sont identiques" :
			(io.tty ? C.gris("(aucune différence : diff ne dit rien quand les deux textes sont identiques)") : "");
	}
	if (p.opts.q) return "Les objets " + p.reste[0] + " et " + p.reste[1] + " sont différents";
	function plage(debut, nombre){
		if (nombre === 0) return String(debut);
		return nombre === 1 ? String(debut + 1) : (debut + 1) + "," + (debut + nombre);
	}
	var lignes = [];
	for (var k = 0; k < blocs.length; k++){
		var bl = blocs[k];
		var lettre = bl.retires.length && bl.ajoutes.length ? "c" : (bl.retires.length ? "d" : "a");
		lignes.push(plage(bl.a0, bl.retires.length) + lettre + plage(bl.b0, bl.ajoutes.length));
		var x;
		for (x = 0; x < bl.retires.length; x++) lignes.push(io.tty ? C.rouge("< " + bl.retires[x]) : "< " + bl.retires[x]);
		if (lettre === "c") lignes.push("---");
		for (x = 0; x < bl.ajoutes.length; x++) lignes.push(io.tty ? C.vert("> " + bl.ajoutes[x]) : "> " + bl.ajoutes[x]);
	}
	if (io.tty) lignes.push(C.gris("(< : lignes du premier objet ; > : lignes du second ; 17c17 : la ligne 17 a changé)"));
	return lignes.join("\n");
};

/* Transforme "1,3-5,7-" en une fonction qui dit si le rang n est retenu. */
function lireListe(liste, cmd){
	var plages = liste.split(",").map(function(morceau){
		var m = /^(\d*)(-?)(\d*)$/.exec(morceau);
		if (!m || (m[1] === "" && m[3] === "")) throw new ShellError(cmd + " : liste de champs invalide « " + liste + " ». Exemples : 1  ou  1,3  ou  2-4");
		var debut = m[1] === "" ? 1 : parseInt(m[1], 10);
		var fin = m[2] === "" ? debut : (m[3] === "" ? Infinity : parseInt(m[3], 10));
		if (debut < 1) throw new ShellError(cmd + " : les champs sont numérotés à partir de 1");
		return [debut, fin];
	});
	return function(n){
		for (var i = 0; i < plages.length; i++){
			if (n >= plages[i][0] && n <= plages[i][1]) return true;
		}
		return false;
	};
}

Shell.sorts.cut = function(args, io){
	var p = lireOptions(args, "dfcs", "cut", "dfc");
	if (p.opts.f === undefined && p.opts.c === undefined){
		throw new ShellError("cut : il faut dire quoi garder. Utilisation : cut -d SEPARATEUR -f CHAMPS OBJET  (par exemple cut -d: -f1 Registre)");
	}
	var separateur = p.opts.d === undefined ? "\t" : p.opts.d;
	if (separateur.length !== 1) throw new ShellError("cut : le séparateur doit être un seul caractère");
	var retenu = lireListe(p.opts.f !== undefined ? p.opts.f : p.opts.c, "cut");
	var texte;
	if (p.reste.length === 0){
		if (io.stdin === null) throw new ShellError("cut : dans quoi dois-je découper ? Utilisation : cut -d SEPARATEUR -f CHAMPS OBJET");
		texte = io.stdin;
	} else {
		var textes = [];
		for (var i = 0; i < p.reste.length; i++){
			var trouve = Shell.objetLisible(p.reste[i], io, "cut");
			textes.push(trouve.item.getText().replace(/\n$/, ""));
			Shell.apresLecture(trouve, "", "cut", io);
		}
		texte = textes.join("\n");
	}
	var sortie = [];
	var lignes = lignesDe(texte);
	for (var l = 0; l < lignes.length; l++){
		var ligne = lignes[l], gardes = [], k;
		if (p.opts.c !== undefined){
			for (k = 0; k < ligne.length; k++){ if (retenu(k + 1)) gardes.push(ligne.charAt(k)); }
			sortie.push(gardes.join(""));
			continue;
		}
		if (ligne.indexOf(separateur) === -1){
			if (!p.opts.s) sortie.push(ligne);
			continue;
		}
		var champs = ligne.split(separateur);
		for (k = 0; k < champs.length; k++){ if (retenu(k + 1)) gardes.push(champs[k]); }
		sortie.push(gardes.join(separateur));
	}
	return sortie.join("\n");
};

/* ------------------------------------------------------------------ */
/* Scripts                                                             */
/* ------------------------------------------------------------------ */

Shell.sorts.bash = function(args, io){
	if (args.length === 0){
		return "Tu es déjà dans bash : c'est lui, le terminal, qui lit tes sorts depuis le début. Pour lancer un script : bash SCRIPT";
	}
	return Shell.lancerScript(args[0], io, false);
};

/* ------------------------------------------------------------------ */
/* Le système                                                          */
/* ------------------------------------------------------------------ */

var JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
var MOIS = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

Shell.sorts.date = function(args, io){
	var d = new Date();
	var valeurs = {
		"Y": String(d.getFullYear()), "m": deuxChiffres(d.getMonth() + 1), "d": deuxChiffres(d.getDate()),
		"H": deuxChiffres(d.getHours()), "M": deuxChiffres(d.getMinutes()), "S": deuxChiffres(d.getSeconds()),
		"a": JOURS[d.getDay()], "b": MOIS[d.getMonth()], "s": String(Math.floor(d.getTime() / 1000)), "%": "%"
	};
	valeurs["F"] = valeurs["Y"] + "-" + valeurs["m"] + "-" + valeurs["d"];
	valeurs["T"] = valeurs["H"] + ":" + valeurs["M"] + ":" + valeurs["S"];
	if (args.length > 0){
		if (args[0].charAt(0) !== "+") throw new ShellError("date : je ne règle pas l'horloge du monde. Pour choisir l'affichage : date +%H:%M  ou  date +%F");
		return args.join(" ").substring(1).replace(/%(.)/g, function(tout, lettre){
			return valeurs.hasOwnProperty(lettre) ? valeurs[lettre] : tout;
		});
	}
	return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() + " " + valeurs["T"];
};

Shell.sorts.id = function(args, io){
	if (io.sudo) return "uid=0(root) gid=0(root) groupes=0(root)";
	var nom = args.length ? args[0] : JOUEUR;
	if (!UTILISATEURS.hasOwnProperty(nom)) throw new ShellError("id : « " + nom + " » : utilisateur inconnu");
	var uid = UTILISATEURS[nom];
	var groupes = uid + "(" + nom + ")";
	if (nom === JOUEUR && state.has("sudoOK")) groupes += ",27(sudo)";
	if (nom === "laurent") groupes += ",27(sudo),1042(direction)";
	// Sur une machine qui a son fichier /etc/group, les groupes secondaires viennent de là (comme groups).
	var fichierGroupes = typeof fichierSysteme === "function" ? fichierSysteme("group") : null;
	if (fichierGroupes && nom !== JOUEUR){
		groupes = uid + "(" + nom + ")";
		lignesDe(fichierGroupes.getText()).forEach(function(l){
			var c = l.split(":");
			if (c.length >= 4 && c[3].split(",").indexOf(nom) > -1) groupes += "," + c[2] + "(" + c[0] + ")";
		});
	}
	return "uid=" + uid + "(" + nom + ") gid=" + uid + "(" + nom + ") groupes=" + groupes;
};

Shell.sorts.hostname = function(args, io){
	if (args.length > 0 && args[0].charAt(0) !== "-") throw new ShellError("hostname : on ne rebaptise pas une machine comme ça. Sans argument, hostname donne son nom.");
	return Shell.hote();
};

Shell.sorts.top = function(args, io){
	var procs = [{ pid: 1, owner: "root", name: "init", cpu: 0.1 }, { pid: PID_BASH, owner: JOUEUR, name: "bash", cpu: 0.3 }];
	var visibles = Shell.procsDeLHote().map(function(e){ return e.proc; });
	for (var i = 0; i < visibles.length; i++){
		var p = visibles[i];
		procs.push({ pid: p.pid, owner: p.owner, name: p.name, cpu: p.cpu !== undefined ? p.cpu : 20 + (p.pid % 61) });
	}
	procs.push({ pid: 9000 + (state.nbCommandes % 900), owner: io.sudo ? "root" : JOUEUR, name: "top", cpu: 0.7 });
	procs.sort(function(a, b){ return b.cpu - a.cpu; });
	var charge = 0;
	for (var k = 0; k < procs.length; k++) charge += procs[k].cpu;
	var lignes = [
		"top - " + Shell.sorts.date(["+%T"], io) + ", " + procs.length + " tâches, charge : " + (charge / 100).toFixed(2).replace(".", ","),
		"",
		completerGauche("PID", 5) + " " + completerDroite("UTILISATEUR", 12) + completerGauche("%CPU", 6) + "  COMMANDE"
	];
	for (var j = 0; j < procs.length; j++){
		var ligne = completerGauche(procs[j].pid, 5) + " " + completerDroite(procs[j].owner, 12) +
			completerGauche(procs[j].cpu.toFixed(1).replace(".", ","), 6) + "  " + procs[j].name;
		lignes.push(io.tty && procs[j].cpu >= 50 ? C.rouge(ligne) : ligne);
	}
	if (io.tty) lignes.push(C.gris("(Sous Linux, top se rafraîchit en continu et se quitte avec la touche q. Ici, c'est une photo. Les plus gourmands sont en haut.)"));
	return lignes.join("\n");
};

var DISQUES = {
	"terminus": [["/dev/grimoire", 52428800, 46137344, "/"], ["/dev/parchemins", 209715200, 63963136, "/home"], ["tmpfs", 2097152, 1228, "/tmp"]],
	"cybersup": [["/dev/baie1", 524288000, 199229440, "/"], ["/dev/baie2", 104857600, 99614720, "/sauvegardes"], ["/dev/baie3", 209715200, 41943040, "/home"]],
	"lille": [["/dev/beffroi", 262144000, 73400320, "/"], ["/dev/gaufres", 10485760, 10380902, "/reserve"]],
	"marseille": [["/dev/vieuxport", 262144000, 52428800, "/"], ["/dev/calanques", 104857600, 2097152, "/home"]],
	"citadelle": [["/dev/abysses", 698351616, 698351616, "/"], ["/dev/phylactere", 1024, 4, "/ame"]]
};

function tailleLisible(kilo){
	var unites = ["K", "M", "G", "T"], u = 0, valeur = kilo;
	while (valeur >= 1024 && u < unites.length - 1){ valeur /= 1024; u++; }
	var texte = valeur >= 10 || u === 0 ? String(Math.round(valeur)) : valeur.toFixed(1).replace(".", ",");
	return texte + unites[u];
}

Shell.sorts.df = function(args, io){
	var p = lireOptions(args, "hTk", "df");
	var disques = DISQUES[Shell.hote()] || [["/dev/sda1", 31457280, 9437184, "/"], ["tmpfs", 1048576, 2048, "/tmp"]];
	var lignes = [completerDroite("Sys. de fichiers", 18) + completerGauche(p.opts.h ? "Taille" : "blocs de 1K", 12) +
		completerGauche("Utilisé", 11) + completerGauche("Dispo", 11) + completerGauche("Uti%", 6) + " Monté sur"];
	for (var i = 0; i < disques.length; i++){
		var d = disques[i];
		var pourcent = Math.round(d[2] * 100 / d[1]);
		var f = p.opts.h ? tailleLisible : String;
		var ligne = completerDroite(d[0], 18) + completerGauche(f(d[1]), 12) + completerGauche(f(d[2]), 11) +
			completerGauche(f(d[1] - d[2]), 11) + completerGauche(pourcent + "%", 6) + " " + d[3];
		lignes.push(io.tty && pourcent >= 90 ? C.rouge(ligne) : ligne);
	}
	return lignes.join("\n");
};

Shell.sorts.du = function(args, io){
	var p = lireOptions(args, "shac", "du");
	var cibles = p.reste.length ? p.reste : ["."];
	var lignes = [], total = 0;
	function afficher(taille){
		if (!p.opts.h) return String(taille);
		return taille < 1024 ? taille + "o" : (taille / 1024).toFixed(1).replace(".", ",") + "K";
	}
	function poidsObjet(item){
		if (item.lien) return item.lien.length;
		var poids = item.getText().length;
		if (item.archive){
			for (var a = 0; a < item.archive.length; a++) poids += item.archive[a].x.length;
		}
		return poids;
	}
	function poidsLieu(lieu, chemin, profondeur){
		var somme = 0;
		if (profondeur > 40) return 0;
		for (var i = 0; i < lieu.items.length; i++){
			var po = poidsObjet(lieu.items[i]);
			somme += po;
			if (p.opts.a && !p.opts.s) lignes.push(afficher(po) + "\t" + chemin + "/" + lieu.items[i].itemname);
		}
		for (var j = 0; j < lieu.children.length; j++){
			var enfant = lieu.children[j];
			if (!Shell.peutFouiller(enfant)) continue;
			if (!Shell.bit(enfant, "x", io) || !Shell.bit(enfant, "r", io)){
				lignes.push("du : impossible de lire le lieu « " + chemin + "/" + enfant.room_name + " » : Permission non accordée");
				continue;
			}
			somme += poidsLieu(enfant, chemin + "/" + enfant.room_name, profondeur + 1);
		}
		if (!p.opts.s || profondeur === 0) lignes.push(afficher(somme) + "\t" + chemin);
		return somme;
	}
	for (var c = 0; c < cibles.length; c++){
		var r = Shell.chercher(cibles[c], io, "du");
		if (r.node === null) throw new ShellError(Shell.introuvable("du", r.name, r.dir));
		var nom = cibles[c].replace(/\/+$/, "") || cibles[c];
		if (r.node instanceof Room){
			if (!Shell.bit(r.node, "r", io)) throw new ShellError("du : impossible de lire le lieu « " + nom + " » : Permission non accordée");
			total += poidsLieu(r.node, nom, 0);
		} else {
			var poids = poidsObjet(r.node);
			total += poids;
			lignes.push(afficher(poids) + "\t" + nom);
		}
	}
	if (p.opts.c) lignes.push(afficher(total) + "\ttotal");
	return lignes.join("\n");
};

Shell.sorts.chown = function(args, io){
	var propres = args.filter(function(a){ return a !== "-R" && a !== "-v"; });
	if (propres.length < 2) throw new ShellError("chown : il faut un nouveau propriétaire, puis une cible. Utilisation : sudo chown NOM CIBLE");
	var nom = propres[0].split(":")[0];
	if (!io.sudo){
		throw new ShellError("chown : modification du propriétaire de « " + propres[1] + " » : Opération non permise\n" +
			C.gris("(Donner une chose à quelqu'un d'autre est réservé à root : sudo chown " + propres[0] + " " + propres[1] + ")"));
	}
	if (!UTILISATEURS.hasOwnProperty(nom)) throw new ShellError("chown : utilisateur invalide : « " + nom + " »");
	for (var i = 1; i < propres.length; i++){
		var r = Shell.chercher(propres[i], io, "chown");
		if (r.node === null) throw new ShellError(Shell.introuvable("chown", r.name, r.dir));
		if (r.node instanceof Item && r.node.person){
			throw new ShellError("chown : on ne devient pas propriétaire des gens. " + r.node.itemname + " te regarde d'un drôle d'air.");
		}
		if (r.node.immuable) Shell.verifierImmuable(r.node, "chown");
		r.node.owner = nom;
		// Un objet du monde qu'on s'approprie ne devient pas pour autant supprimable.
		if (r.node.id) r.node.acquis = true;
		GameEvents.fire({ type: "chown", node: r.node, owner: nom });
	}
	return "";
};

var MOTS_DE_PASSE_CONNUS = ["password", "motdepasse", "azerty", "qwerty", "123456", "cybersup", "terminus", "p1ngouin", "admin", "soleil", "bonjour"];

Shell.sorts.passwd = function(args, io){
	if (args.length > 0 && args[0] !== JOUEUR && !io.sudo){
		throw new ShellError("passwd : vous ne pouvez pas consulter ou modifier les informations de mot de passe de " + args[0] + ".");
	}
	term.demander("Nouveau mot de passe : ", true, function(premier){
		var defauts = [];
		if (premier.length < 12) defauts.push("trop court (12 caractères au moins)");
		if (!/[a-z]/.test(premier) || !/[A-Z]/.test(premier)) defauts.push("il faut des minuscules ET des majuscules");
		if (!/[0-9]/.test(premier)) defauts.push("il faut au moins un chiffre");
		for (var i = 0; i < MOTS_DE_PASSE_CONNUS.length; i++){
			if (premier.toLowerCase().indexOf(MOTS_DE_PASSE_CONNUS[i]) > -1){ defauts.push("il contient un mot que tout pirate essaie en premier"); break; }
		}
		if (defauts.length > 0){
			term.echo("MOT DE PASSE REFUSÉ : " + defauts.join(" ; ") + ".\n" +
				C.gris("(Une phrase entière fait un excellent mot de passe : longue pour une machine, facile pour toi. Relance passwd.)"));
			GameEvents.fire({ type: "passwd", ok: false });
			Shell.fin();
			return;
		}
		term.demander("Retapez le nouveau mot de passe : ", true, function(second){
			if (second !== premier){
				term.echo("Désolé, les mots de passe ne correspondent pas.\npasswd : mot de passe inchangé");
			} else {
				term.echo("passwd : mot de passe mis à jour avec succès");
				GameEvents.fire({ type: "passwd", ok: true });
			}
			Shell.fin();
		});
	});
	return C.gris("Changement du mot de passe de " + JOUEUR + ". Rien n'est enregistré : c'est un exercice.\n" +
		"N'utilise jamais ici un mot de passe qui te sert ailleurs.");
};

Shell.sorts.crontab = function(args, io){
	var utilisateur = io.sudo ? "root" : JOUEUR;
	var action = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-u"){
			i++;
			if (args[i] === undefined) throw new ShellError("crontab : -u attend un nom d'utilisateur");
			if (args[i] !== JOUEUR && !io.sudo){
				throw new ShellError("crontab : il faut les pouvoirs de root pour utiliser -u\n" +
					C.gris("(La crontab d'un autre ne se lit qu'avec sudo : sudo crontab -u " + args[i] + " -l)"));
			}
			utilisateur = args[i];
		} else if (args[i] === "-l" || args[i] === "-r" || args[i] === "-e"){
			action = args[i];
		} else {
			throw new ShellError("crontab : option inconnue « " + args[i] + " ». Utilisation : crontab [-u UTILISATEUR] -l (lister) ou -r (tout retirer)");
		}
	}
	if (!UTILISATEURS.hasOwnProperty(utilisateur)) throw new ShellError("crontab : utilisateur « " + utilisateur + " » inconnu");
	if (action === null) throw new ShellError("crontab : que veux-tu faire ? crontab -l liste les tâches planifiées, crontab -r les retire toutes.");
	var taches = state.cron[utilisateur] || [];
	if (action === "-e"){
		throw new ShellError("crontab : -e ouvre un éditeur de texte, et il n'y en a pas dans ce monde. Ici, on se contente de lire (-l) et de retirer (-r).");
	}
	if (action === "-l"){
		if (taches.length === 0) return "pas de crontab pour " + utilisateur;
		var lignes = ["# min heure jour mois jour_semaine   commande", "# une étoile veut dire « à chaque fois »"].concat(taches);
		return lignes.join("\n");
	}
	if (taches.length === 0) throw new ShellError("pas de crontab pour " + utilisateur);
	state.cron[utilisateur] = [];
	GameEvents.fire({ type: "crontab", user: utilisateur, action: "r" });
	return io.tty ? C.gris("(crontab de " + utilisateur + " retirée : plus rien ne sera relancé automatiquement en son nom)") : "";
};

/* ------------------------------------------------------------------ */
/* Archives                                                            */
/* ------------------------------------------------------------------ */

Shell.sorts.tar = function(args, io){
	var lettres = "", archive = null, fichiers = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		var estOption = (i === 0 && /^-?[ctxvzf]+$/.test(a)) || /^-[ctxvzf]+$/.test(a);
		if (estOption){
			var bloc = a.replace(/^-/, "");
			lettres += bloc;
			if (bloc.indexOf("f") > -1){
				i++;
				if (args[i] === undefined) throw new ShellError("tar : l'option f attend le nom de l'archive");
				archive = args[i];
			}
		} else {
			fichiers.push(a);
		}
	}
	var modes = (lettres.indexOf("c") > -1 ? 1 : 0) + (lettres.indexOf("t") > -1 ? 1 : 0) + (lettres.indexOf("x") > -1 ? 1 : 0);
	if (modes !== 1 || archive === null){
		throw new ShellError("tar : il faut choisir une action et nommer l'archive.\n" +
			"  tar -tf ARCHIVE            liste ce qu'elle contient\n" +
			"  tar -xf ARCHIVE            en extrait le contenu, ici\n" +
			"  tar -cf ARCHIVE OBJETS...  crée une archive");
	}
	var bavard = lettres.indexOf("v") > -1;
	var r = Shell.chercher(archive, io, "tar");
	var k;
	if (lettres.indexOf("c") > -1){
		if (fichiers.length === 0) throw new ShellError("tar : je refuse de créer une archive vide. Utilisation : tar -cf ARCHIVE OBJETS...");
		if (r.node instanceof Room) throw new ShellError("tar : « " + archive + " » est un lieu");
		if (r.node !== null && r.node.owner !== JOUEUR) throw new ShellError("tar : impossible d'écrire dans « " + archive + " » : Permission non accordée");
		var contenu = [];
		for (k = 0; k < fichiers.length; k++){
			var f = Shell.chercher(fichiers[k], io, "tar");
			if (f.node === null) throw new ShellError(Shell.introuvable("tar", f.name, f.dir));
			if (f.node instanceof Room) throw new ShellError("tar : « " + fichiers[k] + " » est un lieu. Dans ce monde, les archives ne contiennent que des objets : désigne-les avec l'étoile, par exemple " + fichiers[k].replace(/\/+$/, "") + "/*");
			if (f.node === r.node) continue;
			if (f.node.person) throw new ShellError("tar : on ne range pas " + f.node.itemname + " dans une archive.");
			if (!Shell.bit(f.node, "r", io)) throw new ShellError("tar : " + fichiers[k] + " : Permission non accordée");
			contenu.push({ n: f.node.itemname, x: f.node.getText(), p: f.node.picturename });
		}
		var objet = r.node;
		if (objet === null){
			Shell.nomValide(r.name, "tar");
			objet = new Item(r.name, "");
			objet.owner = JOUEUR;
			r.dir.addItem(objet);
		}
		objet.setText("(Une archive tar : ses octets ne se lisent pas tels quels. tar -tf la liste, tar -xf l'extrait.)");
		objet.archive = contenu;
		GameEvents.fire({ type: "tar", mode: "c", item: objet, room: r.dir });
		return bavard ? contenu.map(function(e){ return e.n; }).join("\n") :
			(io.tty ? C.gris("(archive " + objet.itemname + " créée : " + contenu.length + " objet" + (contenu.length > 1 ? "s" : "") + ")") : "");
	}
	if (r.node === null) throw new ShellError("tar : " + archive + " : aucun objet de ce nom");
	var source = Shell.suivre(r.node, "tar");
	if (source instanceof Room || !source.archive) throw new ShellError("tar : « " + archive + " » ne ressemble pas à une archive tar");
	if (!Shell.bit(source, "r", io)) throw new ShellError("tar : " + archive + " : Permission non accordée");
	if (lettres.indexOf("t") > -1){
		GameEvents.fire({ type: "tar", mode: "t", item: source, room: r.dir });
		return source.archive.map(function(e){ return bavard ? "-rw-r--r-- " + completerGauche(e.x.length, 6) + " " + e.n : e.n; }).join("\n");
	}
	var extraits = [], refuses = [];
	for (k = 0; k < source.archive.length; k++){
		var entree = source.archive[k];
		var existant = current_room.getNode(entree.n);
		if (existant !== null){
			if (existant instanceof Room || existant.owner !== JOUEUR || existant.acquis || existant.lien){
				refuses.push("tar : " + entree.n + " : impossible d'écraser ce qui existe déjà ici");
				continue;
			}
			existant.setText(entree.x);
		} else {
			var nouveau = new Item(entree.n, entree.x);
			nouveau.owner = JOUEUR;
			nouveau.picturename = entree.p || nouveau.picturename;
			current_room.addItem(nouveau);
		}
		extraits.push(entree.n);
	}
	GameEvents.fire({ type: "tar", mode: "x", item: source, room: current_room, names: extraits });
	var lignes = refuses.slice();
	if (bavard) lignes = lignes.concat(extraits);
	else if (io.tty) lignes.push(C.gris("(" + extraits.length + " objet" + (extraits.length > 1 ? "s" : "") + " extrait" + (extraits.length > 1 ? "s" : "") + " ici : " + extraits.join(", ") + ")"));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Le réseau                                                           */
/* ------------------------------------------------------------------ */

var HOTES = {
	"terminus": { ip: "10.0.0.1", arrivee: function(){ return Home; } },
	"cybersup": { ip: "10.0.92.1", arrivee: function(){ return Cybersup; } },
	"lille": { ip: "10.0.59.1", ouvert: true, arrivee: function(){ return CampusLille; } },
	"marseille": { ip: "10.0.13.1", ouvert: true, arrivee: function(){ return CampusMarseille; } },
	"citadelle": { ip: ADRESSE_ATTAQUANT, arrivee: function(){ return Citadelle; } }
};

function trouverHote(nom){
	if (nom === "localhost" || nom === "127.0.0.1") return Shell.hote();
	if (HOTES.hasOwnProperty(nom)) return nom;
	for (var h in HOTES){
		if (HOTES.hasOwnProperty(h) && HOTES[h].ip === nom) return h;
	}
	return null;
}

Shell.sorts.ping = function(args, io){
	var p = lireOptions(args, "c", "ping", "c");
	if (p.reste.length !== 1) throw new ShellError("ping : quelle machine veux-tu appeler ? Utilisation : ping MACHINE");
	var hote = trouverHote(p.reste[0]);
	if (hote === null) throw new ShellError("ping : " + p.reste[0] + " : Nom ou service inconnu");
	var combien = p.opts.c ? parseInt(p.opts.c, 10) : 3;
	if (isNaN(combien) || combien < 1) throw new ShellError("ping : -c attend un nombre de paquets");
	combien = Math.min(combien, 5);
	var ip = HOTES[hote].ip;
	var lignes = ["PING " + hote + " (" + ip + ") 56(84) octets de données."];
	var muet = hote === "citadelle" && !state.has("certificatLu") && Shell.hote() !== "citadelle";
	var memeMachine = hote === Shell.hote();
	if (!muet){
		for (var i = 1; i <= combien; i++){
			var temps = memeMachine ? 0.03 + i * 0.01 : (hote === "citadelle" ? 66.6 : 0.4) + ((ip.length * 7 + i * 13) % 10) / 10;
			lignes.push("64 octets de " + hote + " (" + ip + ") : icmp_seq=" + i + " ttl=64 temps=" + temps.toFixed(2).replace(".", ",") + " ms");
		}
	}
	lignes.push("");
	lignes.push("--- statistiques ping " + hote + " ---");
	lignes.push(combien + " paquets transmis, " + (muet ? 0 : combien) + " reçus, " + (muet ? "100" : "0") + " % de paquets perdus");
	if (muet && io.tty) lignes.push(C.gris("(Aucune réponse : la machine existe, mais quelque chose, un pare-feu sans doute, avale tes paquets.)"));
	GameEvents.fire({ type: "ping", host: hote, ok: !muet });
	return lignes.join("\n");
};

Shell.sorts.ssh = function(args, io){
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (cibles.length === 0) throw new ShellError("ssh : à quelle machine veux-tu te connecter ? Utilisation : ssh MACHINE");
	var cible = cibles[0], utilisateur = JOUEUR;
	if (cible.indexOf("@") > -1){
		utilisateur = cible.split("@")[0];
		cible = cible.split("@")[1];
	}
	var hote = trouverHote(cible);
	if (hote === null) throw new ShellError("ssh : impossible de résoudre le nom d'hôte " + cible + " : Nom ou service inconnu");
	if (utilisateur !== JOUEUR){
		throw new ShellError(utilisateur + "@" + hote + " : Permission denied (publickey,password).\n" +
			C.gris("(Tu n'as ni le mot de passe ni la clé de " + utilisateur + ". On ne se connecte que sous son propre nom.)"));
	}
	if (hote === Shell.hote()) throw new ShellError("Tu es déjà sur " + hote + " : regarde ton invite, juste après l'arobase.");
	var arrivee = HOTES[hote].arrivee();
	var refus = HOTES[hote].refus ? HOTES[hote].refus() : null;
	if (refus) throw new ShellError(refus);
	if (!HOTES[hote].refus && !state.visited[arrivee.id] && !HOTES[hote].ouvert){
		throw new ShellError(JOUEUR + "@" + hote + " : Permission denied (publickey).\n" +
			C.gris("(Tu n'as pas encore de compte sur cette machine. Il faut d'abord s'y rendre à pied, au moins une fois.)"));
	}
	if (Shell.pile_ssh.length >= 8) throw new ShellError("ssh : trop de connexions emboîtées les unes dans les autres. Ferme-en quelques-unes avec exit.");
	Shell.pile_ssh.push(current_room);
	enterRoom(arrivee);
	GameEvents.fire({ type: "ssh", host: hote });
	return "Connexion à " + hote + " (" + HOTES[hote].ip + ")...\nBienvenue sur " + hote + ".\n\n" +
		"Tu es maintenant dans " + current_room.toString() + ". " + current_room.intro_text + "\n" +
		C.gris("(exit ferme la connexion et te ramène d'où tu viens.)");
};

/* ------------------------------------------------------------------ */
/* Les paquets                                                         */
/* ------------------------------------------------------------------ */

Shell.paquets = {
	"cowsay": { resume: "une vache qui dit ce qu'on lui souffle", sort: "cowsay" },
	"tree": { resume: "dessine la carte des lieux", sort: "tree" },
	"sl": {
		resume: "pour les doigts qui tapent sl au lieu de ls",
		lancer: function(args, io){
			return "      ====        ________                ___________\n" +
				"  _D _|  |_______/        \\__I_I_____===__|_________|\n" +
				"   |(_)---  |   H\\________/ |   |        =|___ ___|\n" +
				"   /     |  |   H  |  |     |   |         ||_| |_||\n" +
				"  |      |  |   H  |__--------------------| [___] |\n" +
				"  | ________|___H__/__|_____/[][]~\\_______|       |\n" +
				"  |/ |   |-----------I_____I [][] []  D   |=======|__\n" +
				"__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__\n" +
				" |/-=|___|=    ||    ||    ||    |_____/~\\___/\n" +
				"  \\_/      \\O=====O=====O=====O_/      \\_/\n\n" +
				C.gris("Tchou tchou. Tu voulais sans doute taper ls.");
		}
	}
};

Shell.sorts.apt = function(args, io){
	var action = args[0];
	var nom;
	if (action === undefined) throw new ShellError("apt : que veux-tu faire ? apt list (voir les paquets), sudo apt update, sudo apt install PAQUET");
	if (action === "list" || action === "search"){
		var lignes = [];
		for (nom in Shell.paquets){
			if (!Shell.paquets.hasOwnProperty(nom)) continue;
			if (action === "search" && args[1] && nom.indexOf(args[1]) === -1 && Shell.paquets[nom].resume.indexOf(args[1]) === -1) continue;
			var installe = state.paquets[nom] || (Shell.paquets[nom].sort && state.knows(Shell.paquets[nom].sort));
			lignes.push(completerDroite(nom, 9) + Shell.paquets[nom].resume + (installe ? (io.tty ? C.vert("  [installé]") : "  [installé]") : ""));
		}
		return lignes.join("\n");
	}
	if (["update", "install", "remove", "upgrade"].indexOf(action) === -1){
		throw new ShellError("apt : action inconnue « " + action + " ». Celles qui existent ici : list, search, update, install");
	}
	if (!io.sudo){
		throw new ShellError("E: Impossible d'ouvrir le fichier verrou /var/lib/dpkg/lock-frontend - open (13: Permission non accordée)\n" +
			"E: Impossible d'obtenir le verrou de dpkg, êtes-vous super-utilisateur ?\n" +
			C.gris("(Installer un programme modifie le système : c'est réservé à root. Essaie avec sudo devant.)"));
	}
	if (action === "update" || action === "upgrade"){
		return "Réception de :1 http://depot.terminus stable InRelease [42 ko]\n" +
			"Lecture des listes de paquets... Fait\n" +
			"Construction de l'arbre des dépendances... Fait\n" +
			"Tous les paquets sont à jour.";
	}
	if (action === "remove") throw new ShellError("apt : dans ce monde, un sort appris ne s'oublie pas. Rien n'a été retiré.");
	if (args.length < 2) throw new ShellError("apt : quel paquet installer ? Utilisation : sudo apt install PAQUET  (apt list les montre tous)");
	var sortie = ["Lecture des listes de paquets... Fait", "Construction de l'arbre des dépendances... Fait"];
	for (var i = 1; i < args.length; i++){
		nom = args[i];
		if (nom === "-y") continue;
		if (!Shell.paquets.hasOwnProperty(nom)){
			sortie.push("E: Impossible de trouver le paquet " + nom);
			continue;
		}
		var paquet = Shell.paquets[nom];
		if (state.paquets[nom] || (paquet.sort && state.knows(paquet.sort))){
			sortie.push(nom + " est déjà la version la plus récente.");
			state.paquets[nom] = true;
			continue;
		}
		sortie.push("Les NOUVEAUX paquets suivants seront installés :\n  " + nom);
		sortie.push("Dépaquetage de " + nom + "...\nParamétrage de " + nom + "... Fait");
		state.paquets[nom] = true;
		if (paquet.sort) state.learn(paquet.sort);
		GameEvents.fire({ type: "apt", pkg: nom });
	}
	return sortie.join("\n");
};

Shell.sorts.cowsay = function(args, io){
	var texte = args.length ? args.join(" ") : (io.stdin !== null ? io.stdin.replace(/\s+/g, " ").trim() : "");
	if (texte === "") texte = "Meuh.";
	var mots = texte.split(" "), lignes = [""];
	for (var i = 0; i < mots.length; i++){
		var derniere = lignes[lignes.length - 1];
		if (derniere.length + mots[i].length + 1 > 38 && derniere !== "") lignes.push(mots[i]);
		else lignes[lignes.length - 1] = derniere === "" ? mots[i] : derniere + " " + mots[i];
	}
	var largeur = 0;
	for (var l = 0; l < lignes.length; l++) largeur = Math.max(largeur, lignes[l].length);
	var bulle = [" " + new Array(largeur + 3).join("_")];
	for (var k = 0; k < lignes.length; k++){
		var gauche = lignes.length === 1 ? "<" : (k === 0 ? "/" : (k === lignes.length - 1 ? "\\" : "|"));
		var droite = lignes.length === 1 ? ">" : (k === 0 ? "\\" : (k === lignes.length - 1 ? "/" : "|"));
		bulle.push(gauche + " " + completerDroite(lignes[k], largeur) + " " + droite);
	}
	bulle.push(" " + new Array(largeur + 3).join("-"));
	return bulle.join("\n") + "\n" +
		"        \\   ^__^\n" +
		"         \\  (oo)\\_______\n" +
		"            (__)\\       )\\/\\\n" +
		"                ||----w |\n" +
		"                ||     ||";
};

/* ------------------------------------------------------------------ */
/* L'expérience                                                        */
/* ------------------------------------------------------------------ */

Shell.sorts.xp = function(args, io){
	return state.tableauXP();
};
Shell.sorts.score = Shell.sorts.xp;

Shell.sorts.succes = function(args, io){
	return state.texteDesSucces();
};

Shell.sorts.chrono = function(args, io){
	return state.texteDuChrono();
};

Shell.sorts.son = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : !PROFIL.son);
	PROFIL.son = voulu;
	enregistrerProfil();
	if (voulu) jouerSon("quete");
	return voulu ? "Son activé : petits bips 8 bits pour les sorts, les quêtes et les succès. (son off pour couper)" : "Son coupé. (son on pour le remettre)";
};

/* Le mode « vieil écran » : lignes de balayage et léger halo, comme un moniteur à tube. Activé par défaut. */
Shell.sorts.crt = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : PROFIL.crt === false);
	PROFIL.crt = voulu;
	enregistrerProfil();
	if (typeof appliquerCrt === "function") appliquerCrt();
	return voulu ? "Mode vieil écran activé : lignes de balayage et halo vert. (crt off pour un affichage net)" :
		"Mode vieil écran coupé : affichage net. (crt on pour le remettre)";
};

Shell.sorts.indice = function(args, io){
	return state.demanderIndice();
};

Shell.sorts.bulletin = function(args, io){
	return state.texteDuBulletin();
};

/*
 * La carte : les lieux visités, en arbre (comme tree), avec « tu es ici ».
 * Un lieu pas encore visité mais voisin d'un lieu connu apparaît en « ? ».
 * Au chapitre 2, les machines du réseau de l'école s'ajoutent une fois le réseau découvert.
 */
function texteCarte(){
	var mission = state.has("chapitre1Saute");
	var lignes = [];
	function cache(lieu){ return lieu.horsBareme || lieu.room_name.charAt(0) === "."; }
	function connu(lieu){ return !!state.visited[lieu.id]; }
	function nom(lieu){
		var n = lieu.racineHote ? lieu.racineHote : lieu.room_name;
		return lieu === current_room ? C.vert(C.gras(n + "  ◀ tu es ici")) : (lieu.racineHote ? C.cyan(n) : n);
	}
	function branche(lieu, prefixe, dernier, profondeur){
		lignes.push(prefixe + (profondeur ? (dernier ? "└── " : "├── ") : "") + nom(lieu));
		var enfants = lieu.children.filter(function(e){ return !e.racineHote && (connu(e) || !cache(e)); });
		var visibles = enfants.filter(connu), inconnus = enfants.length - visibles.length;
		var suite = prefixe + (profondeur ? (dernier ? "    " : "│   ") : "");
		visibles.forEach(function(e, i){ branche(e, suite, i === visibles.length - 1 && !inconnus, profondeur + 1); });
		if (inconnus) lignes.push(suite + "└── " + C.gris(inconnus === 1 ? "? (un lieu pas encore visité)" : "? (" + inconnus + " lieux pas encore visités)"));
	}
	if (mission && typeof Citadelle !== "undefined" && connu(Citadelle)) branche(Citadelle, "", true, 0);
	else branche(Home, "", true, 0);
	if (typeof HOTES !== "undefined" && state.has("reseauCartographie")){
		lignes.push("", C.gras("Le réseau de l'école") + C.gris("  (ssh MACHINE)"));
		Object.keys(HOTES).forEach(function(h){
			var racine = HOTES[h].arrivee ? HOTES[h].arrivee() : null;
			if (!racine || !racine.racineHote) return;
			if (connu(racine)) branche(racine, "", true, 0);
			else lignes.push(C.gris(h + "  (jamais visitée)"));
		});
	}
	return lignes.join("\n");
}

Shell.sorts.carte = function(args, io){
	var texte = C.gras("CARTE DES LIEUX VISITÉS") + "\n\n" + texteCarte();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return C.gris("(La carte remplace l'image jusqu'à ton prochain déplacement. carte pour la revoir.)");
	return texte;
};
