/**
 * Le chapitre 8 (le Grand Port, numéro interne 9) : la Flotte noire, les conteneurs de zéro à héros.
 *   node tests/chapitre8.js
 *
 * Les fichiers et les règles d'écriture, le départ direct et l'ouverture après Port-Aube, le plan du port, l'horloge
 * et les maîtres (et leurs galons), les fausses validations (l'état réel des machines, pas la frappe), les épreuves
 * de rang, les nuits, l'assaut de l'aube en cas de retard, la bataille, l'identifiant du joueur, la sauvegarde en
 * cours de route, les quêtes annexes, puis la solution documentée jouée de bout en bout (20 sur 20, Amiral, le
 * cliffhanger constaté sur douane et sur docks).
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function vrai(jeu, expr, m){ verifier(jeu.lire(expr) === true, m + "  [" + expr + "]"); }
function faux(jeu, expr, m){ verifier(jeu.lire(expr) === false, m + "  [" + expr + "]"); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : ne devrait PAS être accompli"); }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 400)); }
function absent(texte, mot, m){ verifier(String(texte).indexOf(mot) === -1, m + " : « " + mot + " » ne devrait pas apparaître"); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");
var DOC = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");

/* Une partie neuve, partie directement au Grand Port (la huitième enveloppe ou « chapitre 8 »). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 8", "oui");
	return jeu;
}
/* En départ direct, le Grand Port est au bout de l'Embarcadère (après Port-Aube, au bout de la cité). */
function t(jeu, c){ return jeu.jouerSolution(c.replace(/~\/Cybersup\/Embarcadere\/PortAube\/GrandPort/g, "~/Cybersup/Embarcadere/GrandPort")); }
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
function minutes(jeu){ return jeu.lire("sCh8().minutes"); }
function rang(jeu){ return jeu.lire("sCh8().rang"); }
/* Le temps passe jusqu'à 22 h (comme autant de commandes tapées) : la commande suivante tombe dans la nuit. */
function jusquaNuit(jeu){ var m = minutes(jeu) % 1440, n = Math.max(0, Math.ceil((22 * 60 - m) / 5) - 1); jeu.lire("sCh8().compte += " + n); }

/* Les commandes de la solution documentée (chapitre 8), partie par partie. Les lignes d'un here-document suivent leur commande. */
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) return [];
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}
function jusqua(jeu, n){ var s = []; for (var p = 74; p <= n; p++) s = s.concat(partie(p).map(function(c){ return t(jeu, c); })); return s; }

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, les règles d'écriture, les images */
/* ================================================================== */
var FICHIERS = ["SortsPort.js", "SortsPortShell.js", "SortsPortProgrammes.js", "SortsPortCli.js", "SortsPortBuild.js", "SortsPortCompose.js", "SortsPortSwarm.js", "SortsPortAnnexes.js", "GrandPort.js", "ManuelPort.js", "Chapitre8.js", "Port.js", "HabitantsPort.js"];
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	FICHIERS.forEach(function(f){ verifier(fs.existsSync(path.join(JS, f)), "le fichier " + f + " existe"); });
	var positions = ["HabitantsIle.js"].concat(FICHIERS).concat(["Intro.js"]).map(function(f){ return index.indexOf("/" + f + "?"); });
	verifier(positions.every(function(p, i){ return p > -1 && (i === 0 || p > positions[i - 1]); }), "index.html : les fichiers du Grand Port, dans l'ordre, après HabitantsIle.js et avant Intro.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf(["Chapitre8.js", "Port.js", "HabitantsPort.js"].map(function(f){ return JSON.stringify(f); }).join(", ")) > -1, "tests/monde.js charge Chapitre8.js, Port.js et HabitantsPort.js, dans cet ordre");
	["Chapitre8.js", "Port.js", "HabitantsPort.js"].forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		var esperluettes = chaines.filter(function(x){ return x.indexOf(" & ") > -1 && !/2>&1|&&|>&|« & »|&\s*$|\s&"$/.test(x); });
		verifier(esperluettes.length === 0, f + " : pas d'esperluette en prose : " + esperluettes.slice(0, 3).join(" | "));
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
		verifier(!/=>/.test(src.replace(/"(?:[^"\\\n]|\\.)*"/g, "").replace(/'(?:[^'\\\n]|\\.)*'/g, "")), f + " : ES5 (pas de fonction fléchée)");
		verifier(!/\.repeat\(/.test(src), f + " : ES5 (pas de String.repeat)");
	});
	// Les prénoms : la liste fermée du chapitre.
	var prenoms = ["Kylian", "Julien", "Grégoire", "Chahla", "Adonis", "Eden", "Megane", "Jahmal", "Déborah", "Elias", "Remi", "Ian", "Soufiane", "Arnaud", "Anissa", "Edson", "Mina", "Ronan", "Idrissa", "Neil", "Laurent", "Grace"];
	var src8 = ["Chapitre8.js", "Port.js", "HabitantsPort.js"].map(function(f){ return fs.readFileSync(path.join(JS, f), "utf8"); }).join("\n");
	prenoms.forEach(function(p){ verifier(src8.indexOf(p) > -1, "le prénom " + p + " est dans le chapitre"); });
	// L'image de l'éclaireur est inerte : un témoin, une phrase, des Labels ; aucun texte qui imite un programme malveillant.
	var moteur = fs.readFileSync(path.join(JS, "SortsPort.js"), "utf8");
	var script = /var SCRIPT_FLOTTE_PORT = "([^\n]*)";/.exec(moteur);
	verifier(!!script && !/curl|wget|nc |\/dev\/tcp|base64|chmod|crontab|rm -|ssh|passwd|shadow/.test(script[1]), "le script de l'éclaireur ne fait rien (une phrase, puis la main au programme suivant)");
	// Les images.
	var images = ["loc_grand_port.gif", "loc_grand_port_victoire.gif", "loc_bataille_aube.gif", "item_ordre_embarquement.gif",
		"cine8_lettre.gif", "cine8_phare_noir.gif", "cine8_port_eveil.gif", "cine8_galons.gif", "cine8_quais_vides.gif", "cine8_flotte_horizon.gif",
		"scene_bivouac_nuit1.gif", "scene_bivouac_nuit2.gif", "scene_bivouac_nuit3.gif",
		"rang_matelot.gif", "rang_quartier_maitre.gif", "rang_second.gif", "rang_capitaine.gif", "rang_amiral.gif"];
	["kylian", "julien", "gregoire", "chahla", "adonis", "eden", "megane", "jahmal", "deborah", "elias", "remi", "ian", "soufiane", "arnaud", "anissa", "edson", "mina", "ronan", "idrissa", "neil"].forEach(function(m){ images.push("item_" + m + ".gif"); });
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, im)), "image " + im + " présente"); });
	var jeu = monde.nouveauMonde({});
	var badges = jeu.lire("Object.keys(TROPHEES_CH8).concat(['platine_ch8', 'ami_ch8'])");
	egal(badges.length, 27, "25 badges du chapitre, le platine et l'Ami du Grand Port");
	badges.forEach(function(b){ verifier(fs.existsSync(path.join(IMG, "badge_" + b + ".gif")), "médaille du badge " + b); });
	// Les noms des médailles : ceux des images (les galons compris).
	badges.forEach(function(b){ verifier(typeof jeu.lire("COMPETENCES[" + JSON.stringify(b) + "]") === "string", "le badge " + b + " a son nom"); });
	egal(jeu.lire("COMPETENCES.platine_ch8"), "Amiral du Grand Port", "le nom du platine");
	var lieux = jeu.lire("[GrandPortCh8, BoiteGrandPortCh8].concat(QUAIS_CH8.map(function(q){ return q.lieu; })).map(function(r){ return r.room_pic; }).concat(QUAIS_CH8.map(function(q){ return q.image; })).filter(function(x){ return !!x; }).join('|')").split("|");
	lieux.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, n.replace(/^.*\//, ""))), "image du port présente : " + n); });
	// Le décor n'apparaît pas avant l'ouverture.
	faux(jeu, "state.has('ch8Ouvert')", "partie neuve : le Grand Port est fermé");
	contient(jeu.taper("chapitre"), "8. ", "chapitre : la ligne 8");
	contient(jeu.taper("chapitre 10"), "1, 2, 3, 4, 5, 6, 7, 8 et 9", "chapitre 10 : il n'existe pas");
	var jp = monde.nouveauMonde({});
	jp.taper("chapitre 7", "oui");
	contient(jp.taper("port"), "chapitre 8", "port avant l'ouverture (à Port-Aube) : il dit où il sert");
})();

/* ================================================================== */
/* 2. Le départ direct, puis l'ouverture après Port-Aube                */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch8Ouvert')", "départ direct : le Grand Port s'ouvre");
	vrai(jeu, "state.has('ch8Direct')", "départ direct : drapeau ch8Direct");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	egal(jeu.lire("current_room.room_name"), "GrandPort", "départ direct : on arrive au Grand Port");
	egal(jeu.lire("Shell.cheminAffiche(GrandPortCh8)"), "~/Cybersup/Embarcadere/GrandPort", "départ direct : le Grand Port est au bout de l'Embarcadère");
	egal(jeu.lire("state.chapitreEnCours()"), 9, "chapitreEnCours vaut 9");
	egal(jeu.lire("numeroAffiche(9)"), 8, "le numéro affiché est 8");
	fait(jeu, "n8_quai", "n8_quai (l'arrivée au Grand Port)");
	egal(jeu.lire("state.queteEnCours().id"), "n8_port", "l'étape en cours est n8_port");
	verifier(/^J1 06:\d\d$/.test(jeu.lire("heureCh8()")), "il est J1, 6 h, à l'arrivée (" + jeu.lire("heureCh8()") + ")");
	egal(rang(jeu), 0, "on arrive Mousse");
	egal(jeu.lire("nomRangCh8()"), "Mousse", "nomRangCh8 : Mousse");
	var avant = jeu.lire("tousLesSorts().filter(function(s){ return [1, 2, 3, 5, 6, 7, 8].indexOf(chapitreDuSort(s)) > -1; })");
	verifier(avant.length > 220, "socle des chapitres 1 à 7 : " + avant.length + " sorts");
	avant.forEach(function(s){ vrai(jeu, "state.knows(" + JSON.stringify(s) + ")", "socle acquis au départ direct : " + s); });
	jeu.lire("ORDRE_DES_SORTS_9").forEach(function(s){
		faux(jeu, "state.knows(" + JSON.stringify(s) + ")", s + " s'apprend auprès d'un maître du port");
		egal(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ")"), 9, "chapitreDuSort(" + s + ")");
	});
	egal(jeu.lire("ORDRE_DES_SORTS_9.join(' ')"), "docker htpasswd dockerd ctr", "les sorts du Grand Port (docker et ses manœuvres, htpasswd, dockerd, ctr)");
	egal(jeu.lire("QUETES_CH8.length"), 44, "44 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH8.length"), 89, "89 défis (84 des maîtres, 5 d'honneur)");
	egal(jeu.lire("QUAIS_CH8.length"), 14, "quatorze quais");
	egal(jeu.lire("ACTES_CH8.length"), 6, "six actes");
	egal(jeu.lire("QUETES_CH8.filter(function(q){ return !/^n8_/.test(q.id); }).length"), 0, "les étapes s'appellent n8_*");
	egal(jeu.lire("QUETES_SECONDAIRES_CH8.filter(function(q){ return !/^s_n8_/.test(q.id); }).length"), 0, "les défis s'appellent s_n8_*");
	egal(jeu.lire("chapitreDeQuete('s_n8_ps_q')"), 9, "chapitreDeQuete d'un défi");
	egal(jeu.lire("chapitreDeQuete('a8_podman')"), 9, "chapitreDeQuete d'une annexe");
	egal(jeu.lire("state.xpMax9()"), 9215, "xpMax9");
	egal(jeu.lire("QUETES_CH8[QUETES_CH8.length - 1].id"), "n8_rapport", "la dernière étape est le rapport de bataille");
	egal(jeu.lire("Object.keys(INDICES_CH8).length"), 44, "un indice par étape (INDICES_CH8)");
	contient(jeu.taper("chapitre 8"), "déjà ouvert", "chapitre 8 déjà ouvert : message clair");
	contient(jeu.taper("help 8"), "Tes sorts du chapitre 8", "help 8");
	contient(jeu.taper("xp"), "CHAPITRE 8", "xp : le tableau du chapitre 8");
	contient(jeu.taper("quetes"), "Laurent", "quetes : l'étape de Laurent");
	contient(jeu.taper("cat Radio"), "Grace", "la radio de Grace au Grand Port");
	contient(jeu.taper("cat Horloge"), "J1 06:", "l'horloge de la capitainerie");
	contient(jeu.taper("cat Bestiaire"), "dockerd", "le bestiaire traduit les images en vrais mots");
	// Le départ direct depuis une partie engagée est refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("cd"); jeu2.taper("ls");
	jeu2.lire("state.complete('m_marche')");
	var r = jeu2.taper("chapitre 8", "oui");
	verifier(/déjà commencé/.test(r) && jeu2.lire("state.has('ch8Ouvert')") === false, "une partie engagée ne part pas directement au Grand Port");
	// L'ouverture normale : après le rapport de Port-Aube (p7_rapport).
	var jeu3 = monde.nouveauMonde({});
	jeu3.taper("chapitre 7", "oui");
	faux(jeu3, "state.has('ch8Ouvert')", "Port-Aube en cours : le Grand Port reste fermé");
	jeu3.lire("state.complete('p7_rapport'); verifierMonde()");
	vrai(jeu3, "state.has('ch8Ouvert')", "après p7_rapport : le Grand Port s'ouvre");
	faux(jeu3, "state.has('ch8Direct')", "après p7_rapport : pas un départ direct");
	egal(jeu3.lire("Shell.cheminAffiche(GrandPortCh8)"), "~/Cybersup/Embarcadere/PortAube/GrandPort", "après Port-Aube, le Grand Port est au bout de la cité");
	contient(jeu3.taper("cd ~/Cybersup/Embarcadere/PortAube/GrandPort"), "GrandPort", "cd ~/Cybersup/Embarcadere/PortAube/GrandPort");
	fait(jeu3, "n8_quai", "n8_quai après Port-Aube");
	egal(jeu3.lire("state.chapitreEnCours()"), 9, "après l'arrivée, chapitreEnCours vaut 9");
	verifier(/^J1 06:\d\d$/.test(jeu3.lire("heureCh8()")), "après Port-Aube aussi, il est J1, 6 h, à l'arrivée (" + jeu3.lire("heureCh8()") + ")");
	// La huitième enveloppe : l'Ordre d'embarquement ; la touche 8.
	var game = fs.readFileSync(path.join(JS, "Game.js"), "utf8");
	verifier(game.indexOf("L'Ordre d'embarquement") > -1 && game.indexOf("item_ordre_embarquement.gif") > -1, "Game.js : la huitième enveloppe, l'Ordre d'embarquement");
	verifier(/commencerChapitre8/.test(game), "Game.js : la touche 8 mène au Grand Port");
	verifier(/nomRangCh8|rangCh8/.test(game) && /heureCh8/.test(game), "Game.js : la barre d'état dit l'heure, le rang et le compte à rebours");
	verifier(/loc_grand_port_victoire\.gif/.test(game) && /CertificatGrandPort/.test(game), "Game.js : l'écran de victoire du Grand Port");
	// Chapitre 7 : l'enchaînement après le rapport de Port-Aube.
	verifier(/Grand Port/.test(fs.readFileSync(path.join(JS, "Chapitre7.js"), "utf8")), "Chapitre7.js : Laurent annonce le Grand Port après le rapport");
})();

/* ================================================================== */
/* 3. Le plan du port, Laurent, l'Ordre, l'horloge, les maîtres et leurs galons */
/* ================================================================== */
(function(){
	var jeu = neuf();
	pasFait(jeu, "n8_port", "rien lu : pas de n8_port");
	var l = jeu.taper("port");
	contient(l, "LE PLAN DU GRAND PORT", "port : le titre");
	contient(l, "pas Linux", "port : une commande du jeu, dit-elle");
	jeu.lire("QUAIS_CH8").forEach(function(q){ contient(l, q.nom, "port : le quai " + q.nom); });
	contient(l, "5 / 100", "port : la puissance de départ (5)");
	contient(l, "Mousse", "port : le rang");
	pasFait(jeu, "n8_port", "port sans Laurent ni l'Ordre : pas de n8_port");
	jeu.taper("cat Laurent");
	pasFait(jeu, "n8_port", "Laurent sans l'Ordre : pas encore");
	jeu.taper("cat Ordre");
	jeu.taper("port");
	fait(jeu, "n8_port", "Laurent, l'Ordre, puis le plan du port");
	egal(jeu.lire("sCh8().scoreDepart"), 5, "puissance de départ retenue : 5");
	contient(jeu.taper("man port"), "port", "man port existe");
	contient(jeu.taper("galons"), "Pour devenir Matelot", "galons : ce qu'il manque pour le rang suivant");
	contient(jeu.taper("rang"), "Mousse", "rang : un alias de galons");
	// L'horloge : cinq minutes par commande, même enchaînée, au plus huit par ligne ; un here-document ne compte qu'une fois.
	var m0 = minutes(jeu);
	jeu.taper("ls"); jeu.taper("ls"); jeu.taper("ls");
	egal(minutes(jeu) - m0, 15, "trois commandes : quinze minutes");
	m0 = minutes(jeu);
	jeu.taper("ls; ls; ls");
	egal(minutes(jeu) - m0, 15, "une ligne de trois commandes : quinze minutes");
	m0 = minutes(jeu);
	jeu.taper("ls; ls; ls; ls; ls; ls; ls; ls; ls; ls; ls; ls");
	egal(minutes(jeu) - m0, 40, "une ligne de douze commandes : quarante minutes au plus");
	m0 = minutes(jeu);
	t(jeu, "cat > ~/note.txt <<'FIN'"); t(jeu, "une ligne"); t(jeu, "une autre"); t(jeu, "FIN");
	egal(minutes(jeu) - m0, 5, "un here-document : cinq minutes, pas une par ligne");
	// Les maîtres : vivants, mais leur quai s'ouvre à leur rang.
	jeu.taper("cd QuaiDesPremiersPas");
	var g = jeu.taper("cat Kylian");
	contient(g, "Kylian", "Kylian se présente");
	contient(g, "docker run hello-world", "Kylian donne la syntaxe");
	vrai(jeu, "state.knows('docker')", "Kylian apprend docker");
	verifier((g.match(/\[ \]/g) || []).length >= 6, "Kylian montre ses défis à faire (et ses étapes)");
	jeu.taper("cd ..");
	contient(jeu.taper("cat Soutes/Chahla"), "Ce quai s'ouvre aux Matelots", "Chahla attend un Matelot");
	contient(jeu.taper("cat Escadre/Arnaud"), "Ce quai s'ouvre aux Amiraux", "Arnaud attend un Amiral");
	// Les manœuvres : une sous-commande de docker s'apprend auprès de son maître, à son rang.
	jeu.taper("ssh docks");
	contient(jeu.taper("docker volume ls"), "Chahla", "docker volume avant Chahla : elle s'apprend aux Soutes");
	contient(jeu.taper("docker swarm init"), "Arnaud", "docker swarm avant Arnaud : il s'apprend à l'Escadre");
	jeu.taper("exit");
	contient(jeu.taper("man docker"), "docker", "man docker");
	contient(jeu.taper("man dockerd"), "dockerd", "man dockerd");
})();

/* ================================================================== */
/* 4. Les fausses validations : l'état réel des machines, pas la frappe */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jouer(jeu, ["cat Laurent; cat Ordre", "port", "cd QuaiDesPremiersPas; cat Kylian", "ssh docks", "systemctl status docker"]);
	contient(t(jeu, "docker ps"), "permission denied", "docker ps sans être de l'équipage : refusé par le socket");
	t(jeu, "sudo usermod -aG docker <moi>");
	t(jeu, "docker info");
	pasFait(jeu, "n8_demon", "usermod sans se reconnecter : le groupe n'est pas encore dans la session");
	t(jeu, "exit"); t(jeu, "ssh docks"); t(jeu, "docker info");
	fait(jeu, "n8_demon", "après exit puis ssh docks : l'équipage du démon");
	t(jeu, "docker run hello-world");
	pasFait(jeu, "n8_premier", "hello-world sans shell jetable : pas encore");
	t(jeu, "docker run --rm alpine:3.20 echo bonjour");
	pasFait(jeu, "n8_premier", "une caisse sans -it : pas le shell jetable");
	t(jeu, "exit");
	t(jeu, "cd ../Capitainerie"); t(jeu, "cat Julien"); t(jeu, "ssh docks");
	t(jeu, "docker run -d --name vigie nginx:1.27-alpine");
	jouer(jeu, ["curl -s localhost:8080", "docker logs vigie", "docker stop vigie; docker start vigie"]);
	pasFait(jeu, "n8_cycle", "une vigie sans port publié : pas de n8_cycle");
	t(jeu, "docker rm -f vigie");
	t(jeu, "docker run -d --name vigie -p 8080:8080 nginx:1.27-alpine");
	jouer(jeu, ["curl -s localhost:8080", "docker logs vigie", "docker stop vigie; docker start vigie"]);
	pasFait(jeu, "n8_cycle", "une vigie publiée vers le mauvais port (8080:8080) : pas de n8_cycle");
	t(jeu, "docker rm -f vigie");
	t(jeu, "docker run -d --name vigie -p 8080:80 nginx:1.27-alpine");
	jouer(jeu, ["curl -s localhost:8080", "docker logs vigie", "docker stop vigie; docker start vigie"]);
	fait(jeu, "n8_cycle", "la vigie publiée sur 8080 vers 80 : n8_cycle");
	t(jeu, "exit");
	vrai(jeu, "!epreuveOuverteCh8(1)", "l'épreuve I reste fermée tant que l'acte I n'est pas fini");
})();
(function(){
	// Une épreuve ne s'ouvre qu'après les étapes de son acte ; une réparation à moitié ne la valide pas.
	var jeu = neuf();
	jusqua(jeu, 75);
	vrai(jeu, "epreuveOuverteCh8(1)", "l'acte I fini : l'épreuve I s'ouvre");
	t(jeu, "exit");
	jouer(jeu, ["ssh docks", "docker inspect -f '{{.State.ExitCode}} {{.State.Error}}' cargaison", "docker rm -f squatteur", "docker start cargaison", "curl -s localhost:8081"]);
	pasFait(jeu, "n8_rang1", "cargaison relancée sans la bonne commande ni QUAI : l'épreuve tient encore");
	t(jeu, "docker rm -f cargaison");
	t(jeu, "docker run -d --name cargaison -p 8081:8081 cargaison:1.0 python serveur.py");
	contient(t(jeu, "docker logs cargaison"), "QUAI", "le journal de la caisse réclame QUAI");
	t(jeu, "curl -s localhost:8081");
	pasFait(jeu, "n8_rang1", "la bonne commande sans la variable QUAI : la caisse meurt, l'épreuve tient");
	egal(rang(jeu), 0, "toujours Mousse");
	t(jeu, "docker rm -f cargaison");
	t(jeu, "docker run -d --name cargaison -p 8081:8081 -e QUAI=8 cargaison:1.0 python serveur.py");
	contient(t(jeu, "curl -s localhost:8081"), "Caisse ouverte", "la caisse répond");
	fait(jeu, "n8_rang1", "la caisse ouverte : l'épreuve I");
	egal(rang(jeu), 1, "Matelot");
	fait(jeu, "s_n8_matelot_j1", "Matelot avant la première nuit : le défi d'honneur");
	t(jeu, "exit");
})();
(function(){
	// Plus loin : un registre ouvert à tous, une carte qui pèse toujours un gigaoctet, un mot de passe à l'air, ne comptent pas.
	var jeu = neuf();
	jusqua(jeu, 78);
	egal(rang(jeu), 2, "après l'épreuve II : Quartier-maître");
	jouer(jeu, ["cd ../RegistreDuPort", "cat Deborah", "ssh entrepot", "sudo usermod -aG docker <moi>", "exit", "ssh entrepot"]);
	t(jeu, "docker run -d --name registre -p 5000:5000 registry:2");
	contient(t(jeu, "curl -s -o /dev/null -w '%{http_code}\\n' localhost:5000/v2/"), "200", "le registre sans mot de passe répond 200 à tous");
	pasFait(jeu, "n8_registre", "un registre ouvert à tous : pas de n8_registre");
	t(jeu, "docker rm -f registre");
	t(jeu, "htpasswd -Bbn douanier Sel-de-l-Entrepot | sudo tee /srv/registre/auth/htpasswd");
	t(jeu, "docker run -d --name registre --restart always -p 5000:5000 -v registre-donnees:/var/lib/registry -v /srv/registre/auth:/auth:ro -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=entrepot -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2");
	contient(t(jeu, "curl -s -o /dev/null -w '%{http_code}\\n' localhost:5000/v2/"), "401", "gardé : 401 sans mot de passe");
	fait(jeu, "n8_registre", "le registre gardé : n8_registre");
	t(jeu, "exit");
	// Le plan de l'école construit sans .dockerignore : le contexte embarque les secrets.
	jouer(jeu, ["cd ../ChantierNaval", "cat Eden", "ssh docks", "cd ~/ecole"]);
	t(jeu, "printf 'FROM python:3.12-slim\\nARG VERSION=1.0\\nENV VERSION=$VERSION\\nWORKDIR /app\\nCOPY . .\\nRUN pip install --no-cache-dir -r requirements.txt\\nCMD [\"python\", \"app.py\"]\\n' > Dockerfile");
	t(jeu, "docker build --build-arg VERSION=1.0 -t ecole:0.9 .");
	pasFait(jeu, "n8_contexte", "un build sans .dockerignore (les secrets dans l'image) : pas de n8_contexte");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 5. Les épreuves de rang : chacune donne son galon, une scène, l'image du rang */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var s = jusqua(jeu, 76).join("\n");
	contient(s, "ÉPREUVE DE RANG I", "l'épreuve I s'annonce");
	contient(s, "Matelot !", "la scène du premier galon");
	egal(rang(jeu), 1, "épreuve I : Matelot");
	s = jusqua2(jeu, 77, 78).join("\n");
	contient(s, "ÉPREUVE DE RANG II", "l'épreuve II s'annonce");
	egal(rang(jeu), 2, "épreuve II : Quartier-maître");
	fait(jeu, "n8_rang2", "le convoi parle");
	s = jusqua2(jeu, 79, 80).join("\n");
	contient(s, "ÉPREUVE DE RANG III", "l'épreuve III s'annonce");
	egal(rang(jeu), 3, "épreuve III : Second");
	verifier(jeu.lire("imagesPort('docks').filter(function(im){ return (im.tags || []).some(function(t){ return /^carto:1\\.2/.test(t); }); }).every(function(im){ return tailleImagePort('docks', im) < 250e6; })"), "la carte des courants sous 250 Mo");
	s = jusqua2(jeu, 81, 82).join("\n");
	contient(s, "ÉPREUVE DE RANG IV", "l'épreuve IV s'annonce");
	egal(rang(jeu), 4, "épreuve IV : Capitaine");
	fait(jeu, "s_n8_capitaine_j2", "Capitaine avant la fin du J2 : le défi d'honneur");
	s = jusqua2(jeu, 83, 84).join("\n");
	contient(s, "ÉPREUVE DE RANG V", "l'épreuve V s'annonce");
	contient(s, "Le tag est le même. L'empreinte, non.", "le cheval de bois : même nom, autre empreinte");
	egal(rang(jeu), 5, "épreuve V : Amiral");
	egal(jeu.lire("nomRangCh8()"), "Amiral", "nomRangCh8 : Amiral");
	contient(jeu.taper("galons"), "Amiral", "galons : Amiral");
	["galon_matelot", "galon_quartier_maitre", "galon_second", "galon_capitaine", "galon_amiral"].forEach(function(b){ vrai(jeu, "badgeCh8Gagne('" + b + "')", "le badge " + b); });
	// La nuit du J1 est passée en route : un bivouac, et le jour se lève à 6 h.
	verifier(jeu.lire("sCh8().nuitsVues") >= 1, "au moins une nuit au bivouac pendant la montée en grade");
})();
function jusqua2(jeu, a, b){ var s = []; for (var p = a; p <= b; p++) s = s.concat(partie(p).map(function(c){ return t(jeu, c); })); return s; }

/* ================================================================== */
/* 6. Les nuits, puis l'assaut de l'aube en cas de retard               */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jouer(jeu, ["cat Laurent; cat Ordre", "port"]);
	jusquaNuit(jeu);
	var s = jeu.taper("ls");
	contient(s, "LA NUIT 1 AU BIVOUAC", "22 h : le bivouac de la première nuit");
	contient(s, "Grace", "la radio de Grace, la nuit");
	verifier(/^J2 06:\d\d$/.test(jeu.lire("heureCh8()")), "on se lève le J2 à 6 h (" + jeu.lire("heureCh8()") + ")");
	pasFait(jeu, "s_n8_matelot_j1", "pas Matelot avant la première nuit : le défi d'honneur est perdu");
	jusquaNuit(jeu);
	contient(jeu.taper("ls"), "LA NUIT 2 AU BIVOUAC", "la deuxième nuit");
	contient(jeu.taper("cat Horloge"), "J3", "l'horloge : le J3");
})();
(function(){
	// Un retard : l'aube du J4 arrive avant l'escadre. L'assaut frappe, le registre de l'entrepôt coule, la bataille commence quand même.
	var jeu = neuf();
	jusqua(jeu, 79);
	vrai(jeu, "!!registreEntrepotCh8()", "le registre de l'entrepôt tourne");
	var s = "";
	for (var i = 0; i < 4 && jeu.lire("sCh8().minutes") < jeu.lire("AUBE_CH8"); i++){ jusquaNuit(jeu); s += jeu.taper("ls"); }
	contient(s, "L'AUBE DU QUATRIÈME JOUR. LA FLOTTE NOIRE ATTAQUE.", "l'assaut de l'aube");
	contient(s, "LA NUIT 3 AU BIVOUAC", "la dernière nuit avant l'assaut");
	contient(s, "le registre de l'école a coulé", "l'assaut coule le registre");
	vrai(jeu, "!!sCh8().assaut && !!sCh8().bataille && sCh8().bataille.avantAube === false", "la bataille commence à l'aube, pas avant");
	faux(jeu, "!!registreEntrepotCh8()", "le registre est arrêté");
	vrai(jeu, "!assautRepareCh8()", "l'assaut n'est pas réparé");
	verifier(jeu.lire("sCh8().assaut.quais.length") > 0, "les quais en friche cèdent (" + jeu.lire("sCh8().assaut.quais.join(' ')") + ")");
	contient(jeu.taper("port"), "la flotte noire attaque", "port : la bataille est en cours");
	pasFait(jeu, "n8_flotte", "le registre coulé : le port n'est pas tenu");
	t(jeu, "ssh entrepot");
	t(jeu, "docker start registre");
	t(jeu, "exit");
	vrai(jeu, "assautRepareCh8()", "le registre relevé : l'assaut est réparé");
	t(jeu, "port");
	fait(jeu, "n8_flotte", "le registre relevé, port relu : le port tient");
	pasFait(jeu, "s_n8_avant_aube", "l'escadre n'était pas en mer avant l'aube : pas le défi d'honneur");
	pasFait(jeu, "n8_naufrage", "pas d'escadre : pas encore de naufrage");
})();

/* ================================================================== */
/* 7. La bataille : un piège refusé sans l'avoir lu ne compte pas, un rapport sans vraies valeurs non plus */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var s = jusqua(jeu, 85).join("\n");
	contient(s, "LA BATAILLE DE L'AUBE", "la bataille commence au déploiement de la pile");
	vrai(jeu, "!!sCh8().bataille && sCh8().bataille.avantAube === true", "la bataille avant l'aube");
	fait(jeu, "s_n8_avant_aube", "l'escadre en mer avant l'aube : le défi d'honneur");
	contient(s, "navire2", "un navire sombre");
	contient(t(jeu, "port"), "la flotte noire attaque", "port : la bataille");
	fait(jeu, "n8_flotte", "port relu pendant la bataille : n8_flotte");
	contient(t(jeu, "docker node ls"), "Down", "navire2 est Down");
	pasFait(jeu, "n8_naufrage", "navire2 toujours dans la formation : l'escadre n'est pas refermée");
	contient(t(jeu, "docker node update --availability drain navire2"), "navire2", "drain navire2");
	fait(jeu, "n8_naufrage", "navire2 drainé : l'escadre se referme");
	vrai(jeu, "!!sCh8().piegeLance", "la mise à jour piégée arrive");
	t(jeu, "docker service rollback ecole_app");
	vrai(jeu, "piegeRepousseCh8()", "le retour arrière repousse le piège");
	pasFait(jeu, "n8_piege", "un retour arrière à l'aveugle, sans avoir lu l'empreinte : pas de n8_piege");
	var ps = t(jeu, "docker service ps --no-trunc ecole_app");
	contient(ps, jeu.lire("sCh8().digestPiege"), "docker service ps --no-trunc montre l'empreinte du piège");
	fait(jeu, "n8_piege", "l'empreinte lue : le piège est refusé en connaissance de cause");
	pasFait(jeu, "n8_puissance", "la puissance pas encore relue après la bataille");
	contient(t(jeu, "port"), "100 / 100", "port : la flotte à 100");
	fait(jeu, "n8_puissance", "la flotte au-dessus de 90");
	t(jeu, "exit");
	// Un rapport sans l'empreinte du piège : Laurent la réclame.
	t(jeu, "mkdir -p ~/grand-port");
	t(jeu, "echo 'Quais tenus. Flotte : 100. Escadre refermée. Piège refusé. Reste : navire2.' > ~/grand-port/rapport.txt");
	t(jeu, "cd ..");
	var r = t(jeu, "cp ~/grand-port/rapport.txt BoiteDeLaurent");
	contient(r, "l'empreinte de l'image piégée", "Laurent réclame l'empreinte du piège");
	pasFait(jeu, "n8_rapport", "un rapport sans l'empreinte : pas contresigné");
	t(jeu, "echo 'Empreinte du piège : <digest-piege>' >> ~/grand-port/rapport.txt");
	t(jeu, "cp ~/grand-port/rapport.txt BoiteDeLaurent");
	fait(jeu, "n8_rapport", "le rapport complet : contresigné");
	vrai(jeu, "state.has('victoireCh8')", "la victoire");
})();

/* ================================================================== */
/* 8. L'identifiant du joueur au port, la sauvegarde en cours de route  */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.lire("adopterPrenom('Ronan')");
	jeu.taper("chapitre 8", "oui");
	jeu.lire("ORDRE_DES_SORTS_9.forEach(function(s){ state.spells[s] = true; })");
	jeu.taper("ssh docks");
	egal(jeu.taper("grep -c '^ronan:' /etc/passwd").trim(), "1", "docks : le compte du joueur porte son identifiant (ronan)");
	verifier(jeu.taper("grep -c apprenti /etc/passwd /etc/group").indexOf(":1") === -1, "docks : plus aucune trace de l'identifiant provisoire");
	jeu.taper("cd");
	egal(jeu.taper("pwd").trim(), "/home/ronan", "cd sur docks : /home/ronan");
	contient(jeu.taper("whoami"), "ronan", "whoami sur docks");
	contient(jeu.taper("ls ~"), "ecole", "le dossier de l'école est chez ronan");
	contient(jeu.taper("cat ~/relecture/Dockerfile"), "FROM debian:12", "le plan d'Idrissa aussi");
	jeu.taper("exit");
	jeu.taper("ssh douane");
	jeu.taper("cd");
	egal(jeu.taper("pwd").trim(), "/home/ronan", "douane : /home/ronan");
})();
(function(){
	var st = {};
	var jeu = neuf(st);
	jusqua(jeu, 76);
	egal(rang(jeu), 1, "avant la sauvegarde : Matelot");
	var heure = minutes(jeu);
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	vrai(jeu2, "state.has('ch8Ouvert')", "rechargement : le Grand Port toujours ouvert");
	fait(jeu2, "n8_rang1", "rechargement : l'épreuve I reste gagnée");
	egal(rang(jeu2), 1, "rechargement : toujours Matelot");
	egal(minutes(jeu2), heure, "rechargement : l'horloge reprend où elle était");
	jeu2.taper("ssh docks");
	contient(jeu2.taper("curl -s localhost:8081"), "Caisse ouverte", "rechargement : la caisse répond toujours");
	contient(jeu2.taper("docker ps"), "vigie", "rechargement : la vigie tourne toujours");
	jeu2.taper("exit");
	contient(jeu2.taper("port"), "Matelot", "rechargement : port dit Matelot");
})();

/* ================================================================== */
/* 9. La partie complète : la solution documentée, à 20 sur 20          */
/* ================================================================== */
(function(){
	var debut = DOC.indexOf("## Chapitre 8 : la Flotte noire"), fin = DOC.indexOf("## Chapitre 9 : la Chronique");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 8 avant l'épreuve finale");
	var section = DOC.substring(debut, fin);
	for (var n = 74; n <= 90; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 8) : pas de tiret cadratin");
	verifier(section.indexOf(" & ") === -1, "docs/solution.md (chapitre 8) : pas d'esperluette");
	var blocs = section.split("```").filter(function(x, i){ return i % 2 === 1; }).join("\n");
	verifier(!/^# /m.test(blocs) && !/^\$ /m.test(blocs), "docs/solution.md (chapitre 8) : ni $ ni # en tête de ligne dans les blocs");
	verifier(/budget de temps/.test(section) && /5 minutes/.test(section), "docs/solution.md (chapitre 8) : chaque commande avance l'horloge, prévoir son budget de temps");
	var commandes = [];
	for (var p = 74; p <= 90; p++) commandes = commandes.concat(partie(p));
	verifier(commandes.length > 350, "la solution du chapitre 8 compte " + commandes.length + " lignes");
	var jeu = neuf();
	var sorties = [], etapes = {};
	commandes.forEach(function(c){
		sorties.push(t(jeu, c));
		["n8_rang1", "n8_rang4", "n8_stack", "n8_rapport"].forEach(function(id){ if (!etapes[id] && q(jeu, id)) etapes[id] = { heure: jeu.lire("heureCh8()"), compte: jeu.lire("sCh8().compte") }; });
	});
	egal(jeu.lire("QUETES_CH8.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : toutes les étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH8.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : tous les défis");
	egal(jeu.lire("state.xp9"), 9215, "partie complète : 9215 XP");
	egal(jeu.lire("state.noteTexte(9)"), "20 / 20", "partie complète : 20 sur 20");
	egal(jeu.lire("state.malus9"), 0, "partie complète : aucun indice acheté");
	vrai(jeu, "state.has('platine_ch8')", "partie complète : le platine");
	vrai(jeu, "state.has('victoireCh8')", "partie complète : la victoire");
	egal(rang(jeu), 5, "partie complète : Amiral");
	["s_n8_matelot_j1", "s_n8_capitaine_j2", "s_n8_avant_aube", "s_n8_sans_indice", "s_n8_signature"].forEach(function(id){ fait(jeu, id, "partie complète : défi d'honneur " + id); });
	egal(jeu.lire("sCh8().scoreDepart"), 5, "partie complète : puissance de départ 5");
	egal(jeu.lire("sCh8().scoreFinal"), 100, "partie complète : puissance finale 100");
	verifier(sorties.some(function(s){ return /Quai tenu/.test(s); }), "partie complète : les quais tenus sont annoncés");
	verifier(sorties.some(function(s){ return /LA NUIT 1 AU BIVOUAC/.test(s); }), "partie complète : une nuit au bivouac");
	verifier(sorties.some(function(s){ return /LA BATAILLE DE L'AUBE/.test(s); }), "partie complète : la bataille");
	verifier(sorties.some(function(s){ return /LA FLOTTE NOIRE VIRE DE BORD/.test(s); }), "partie complète : la victoire annoncée");
	verifier(sorties.some(function(s){ return /Amiral\. Le Grand Port est à toi\./.test(s); }), "partie complète : Laurent contresigne");
	verifier(sorties.some(function(s){ return /Quelqu'un, à Cybersup, construit leurs navires\./.test(s); }), "partie complète : le cliffhanger de Grace");
	verifier(sorties.some(function(s){ return /À suivre\./.test(s); }), "partie complète : « À suivre. »");
	// Le cliffhanger se constate sur les machines : les Labels de l'éclaireur, le carnet des clés de docks.
	var sig = jeu.lire("signatureBastionPort()");
	verifier(/^SHA256:/.test(sig), "la signature est une empreinte de clé SSH (" + sig + ")");
	t(jeu, "ssh douane");
	var labels = t(jeu, "docker image inspect --format '{{json .Config.Labels}}' eclaireur:prise");
	contient(labels, sig, "docker image inspect : la signature dans les Labels de l'éclaireur");
	contient(labels, "P.G.", "docker image inspect : les initiales du constructeur");
	t(jeu, "exit");
	t(jeu, "ssh docks");
	var carnet = t(jeu, "ssh-keygen -lf /etc/ssh/ssh_known_hosts");
	contient(carnet, sig, "ssh-keygen -lf : la même empreinte dans le carnet des clés de docks");
	verifier(carnet.split("\n").some(function(l){ return l.indexOf(sig) > -1 && /bastion/i.test(l); }), "ssh-keygen -lf : à la ligne du Bastion");
	t(jeu, "exit");
	// Les quêtes annexes, le badge Ami, les souvenirs : hors note.
	jeu.lire("QUETES_ANNEXES").filter(function(a){ return a.chapitre === 9; }).forEach(function(a){ fait(jeu, a.id, "partie complète : annexe " + a.id); });
	vrai(jeu, "state.has('ami_ch8')", "partie complète : Ami du Grand Port");
	egal(jeu.lire("state.xp9"), 9215, "les annexes ne changent pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") >= 300, "les annexes donnent leur bonus (" + jeu.lire("state.xpAnnexes") + ")");
	egal(jeu.lire("Home.getChildFromName('Souvenirs').items.length"), 6, "six souvenirs");
	var pl = jeu.taper("port");
	contient(pl, "100 / 100", "port : la flotte au complet");
	contient(jeu.taper("xp"), "20 / 20", "xp : 20 sur 20");
	contient(jeu.taper("badges port"), "Ami du Grand Port", "badges port : Ami du Grand Port");
	contient(jeu.taper("badges port"), "Amiral du Grand Port", "badges port : le platine");
	var cert = jeu.taper("cat ~/CertificatGrandPort");
	contient(cert, "20", "le certificat porte la note");
	contient(cert, "CHAPITRE 8", "le certificat nomme le chapitre 8");
	var code = jeu.lire("state.codeDuCertificat9()");
	verifier(typeof code === "string" && code.length > 8, "le certificat a un code de vérification");
	contient(jeu.taper("verifier " + code), "Grand Port", "verifier CODE : le certificat du Grand Port");
	Object.keys(jeu.lire("MAITRES_PORT")).forEach(function(k){
		var m = jeu.lire("MAITRES_PORT[" + JSON.stringify(k) + "].nom"), lieu = jeu.lire("Shell.cheminAffiche(quaiCh8(" + JSON.stringify(k) + ").lieu)");
		var item = m.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		var tx = jeu.taper("cat " + lieu + "/" + item);
		egal((tx.match(/\[x\]/g) || []).length, 6, m + " coche ses six défis à la fin");
	});
	egal(jeu.lire("state.queteEnCours()"), null, "départ direct terminé : queteEnCours vaut null");
	// Les repères de temps (pour la durée estimée) : Matelot le J1, Capitaine avant la fin du J2, la bataille le J2.
	console.log("Repères : " + Object.keys(etapes).map(function(k){ return k + " " + etapes[k].heure + " (" + etapes[k].compte + " commandes)"; }).join(", ") + " ; fin " + jeu.lire("heureCh8()") + " (" + jeu.lire("sCh8().compte") + " commandes).");
	verifier(/^J1 /.test((etapes.n8_rang1 || {}).heure || ""), "Matelot le J1");
	verifier(/^J[12] /.test((etapes.n8_rang4 || {}).heure || ""), "Capitaine au plus tard le J2");
})();

/* Le quiz, la scène et la cinématique du chapitre (Guide.js, navigateur). */
(function(){
	var guide = fs.readFileSync(path.join(JS, "Guide.js"), "utf8");
	var bloc = guide.substring(guide.indexOf("var QUIZ = {"), guide.indexOf("var banque"));
	var i = bloc.search(/\n\t9: \[/);
	verifier(i > -1, "Guide.js : le quiz du chapitre 8 (QUIZ[9])");
	egal((bloc.substring(i + 3).split(/\n\t\d+: \[/)[0].match(/\n\t\t\["/g) || []).length, 10, "dix questions au quiz du chapitre 8");
	verifier(/"8"\s*:\s*9/.test(guide), "Guide.js : quiz 8 mène au chapitre interne 9");
	verifier(guide.indexOf("n8_quai") > -1 && guide.indexOf("cine8_flotte_horizon.gif") > -1, "Guide.js : la scène et la cinématique du Grand Port");
	verifier(/INDICES_CH8/.test(guide) && /INDICES_CH7/.test(guide), "Guide.js : detailsDeQuete connaît les indices des chapitres 7 et 8");
	var gs = fs.readFileSync(path.join(JS, "GameState.js"), "utf8");
	verifier(/INDICES_CH8/.test(gs) && /INDICES_CH7/.test(gs), "GameState.js : demanderIndice connaît les indices des chapitres 7 et 8");
	var cine = guide.substring(guide.indexOf("var CINEMATIQUES"), guide.indexOf("function lancerCinematique"));
	var i8 = cine.search(/\n\t8: \{/);
	verifier(i8 > -1, "Guide.js : la cinématique du chapitre 8 (CINEMATIQUES[8])");
	egal((cine.substring(i8).match(/cine8_\w+\.gif/g) || []).length, 6, "la cinématique du chapitre 8 a six plans illustrés");
	var jeu = neuf();
	contient(jeu.taper("indice"), "Laurent", "indice au Grand Port : l'étape de Laurent");
	egal(jeu.lire("state.malus9"), 0, "le premier palier d'indice est gratuit (la remarque)");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
