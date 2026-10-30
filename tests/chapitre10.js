/**
 * Le chapitre 10 (le Lac Profond, numéro interne 11) : la grande finale, Linux et Docker pour la donnée.
 *   node tests/chapitre10.js
 *
 * Les fichiers et les règles d'écriture, le départ direct, les postes et l'épreuve fermée, les fausses validations
 * (l'état réel de lac, pas la frappe), la compression en flux, les dates relatives de lac, la crontab qui tourne la
 * nuit, la Grande Marée (un bras tranché appelle le suivant), la sauvegarde en cours de route, puis la solution
 * documentée jouée de bout en bout (20 sur 20, Maître du Lac, l'Ami du Lac Profond).
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
function nu(s){ return String(s).replace(/\x1b\[[0-9;]*m/g, ""); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");
var DOC = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");
var PREMIERE = 107, DERNIERE = 122;

function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 10", "oui");
	return jeu;
}
function t(jeu, c){ return nu(jeu.jouerSolution(c)); }
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
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
function jusqua2(jeu, a, b){ var s = []; for (var p = a; p <= b; p++) s = s.concat(partie(p).map(function(c){ return t(jeu, c); })); return s.join("\n"); }
function jusqua(jeu, n){ return jusqua2(jeu, PREMIERE, n); }

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, les règles d'écriture, les images */
/* ================================================================== */
var CHAPITRE = ["SortsDonnees.js", "Lac.js", "Chapitre10.js", "Abysses.js", "HabitantsLac.js"];
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var positions = ["HabitantsChronique.js"].concat(CHAPITRE).concat(["GrapheGit.js", "Navigation.js"]).map(function(f){ return index.indexOf("/" + f + "?"); });
	verifier(positions.every(function(p, i){ return p > -1 && (i === 0 || p > positions[i - 1]); }), "index.html charge le Lac après la Chronothèque, dans l'ordre, avant Navigation.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf(CHAPITRE.map(function(f){ return JSON.stringify(f); }).join(", ")) > -1, "tests/monde.js charge les cinq fichiers du chapitre, dans cet ordre");
	CHAPITRE.forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		var esperluettes = chaines.filter(function(x){ return x.indexOf(" & ") > -1 && !/2>&1|&&|>&|« & »|&\s*$|\s&"$/.test(x); });
		verifier(esperluettes.length === 0, f + " : pas d'esperluette en prose : " + esperluettes.slice(0, 3).join(" | "));
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
		verifier(!/=>/.test(src.replace(/"(?:[^"\\\n]|\\.)*"/g, "").replace(/'(?:[^'\\\n]|\\.)*'/g, "").replace(/\/(?:[^\/\\\n]|\\.)+\/[gimsuy]*/g, "")), f + " : ES5 (pas de fonction fléchée)");
	});
	// Les prénoms : les quinze gardiens, les six habitants, Wissam, Laurent et Grace.
	var src = CHAPITRE.map(function(f){ return fs.readFileSync(path.join(JS, f), "utf8"); }).join("\n");
	["Lamia", "Younes", "Syrine", "Noam", "Maeva", "Kamal", "Zélia", "Miguel", "Badis", "Arnaud", "Julien", "Megane", "Elias", "Remi", "Eden",
		"Amina", "Kylian", "Chahla", "Adonis", "Déborah", "Soufiane", "Wissam", "Laurent", "Grace"].forEach(function(p){ verifier(src.indexOf(p) > -1, "le prénom " + p + " est dans le chapitre"); });
	// Pas de marque : des logiciels libres seulement.
	["Snowflake", "Databricks", "Tableau", "PowerBI", "Power BI", "AWS", "Azure"].forEach(function(m){ verifier(src.indexOf(m) === -1, "pas de marque dans le chapitre : " + m); });
	var jeu = monde.nouveauMonde({});
	var images = jeu.lire("[LacCh10.room_pic].concat(POSTES_CH10.map(function(p){ return p.image; }))").concat(["loc_lac_victoire.gif", "item_sceau_lac.gif", "item_wissam.gif", "item_pipelinus.gif", "item_jauge.gif",
		"cine10_sceau_demain.gif", "cine10_escalier_lac.gif", "cine10_lac.gif", "cine10_oeil.gif", "cine10_bras.gif", "cine10_wissam.gif", "scene_lac_nuit1.gif", "scene_lac_nuit2.gif", "scene_lac_nuit3.gif",
		"rang_pecheur.gif", "rang_plongeur.gif", "rang_eclusier.gif", "rang_sondeur.gif", "rang_maitre_lac.gif",
		"item_amina.gif", "item_kylian.gif", "item_chahla.gif", "item_adonis.gif", "item_deborah.gif", "item_soufiane.gif"]);
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, String(im).replace(/^.*\//, ""))), "image " + im + " présente"); });
	var badges = jeu.lire("Object.keys(TROPHEES_CH10).concat(['platine_ch10', 'ami_ch10'])");
	egal(badges.length, 28, "26 badges du chapitre, le platine et l'Ami du Lac Profond");
	badges.forEach(function(b){ verifier(fs.existsSync(path.join(IMG, "badge_" + b + ".gif")), "médaille du badge " + b); });
	badges.forEach(function(b){ verifier(typeof jeu.lire("COMPETENCES[" + JSON.stringify(b) + "]") === "string", "le badge " + b + " a son nom"); });
	egal(jeu.lire("QUETES_CH10.length"), 49, "49 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH10.length"), 65, "65 défis (60 des gardiens, 5 d'honneur)");
	egal(jeu.lire("annexesDuChapitre(11).length"), 6, "six quêtes annexes");
	// Les sorts des annexes ne sont pas dans le barème du chapitre.
	["cksum", "b2sum", "expand", "unexpand", "csplit", "time"].forEach(function(s){ egal(jeu.lire("ORDRE_DES_SORTS_11.indexOf(" + JSON.stringify(s) + ")"), -1, s + " : hors barème (annexe)"); });
	faux(jeu, "state.has('ch10Ouvert')", "partie neuve : le Lac est fermé");
	contient(nu(jeu.taper("chapitre")), "10. Le Lac Profond", "chapitre : la ligne 10");
	contient(nu(jeu.taper("jauge")), "chapitre 10", "jauge avant l'ouverture : dit où elle sert");
	contient(nu(jeu.taper("aller 11")), "1 à 10", "aller 11 : il n'y a que les chapitres 1 à 10");
})();

/* ================================================================== */
/* 2. Le départ direct, les postes, l'épreuve fermée, la machine lac    */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch10Ouvert') && state.has('ch10Direct')", "départ direct : le Lac s'ouvre");
	egal(jeu.lire("current_room.room_name"), "Lac", "départ direct : on arrive sur la rive");
	egal(jeu.lire("Shell.cheminAffiche(LacCh10)"), "~/Cybersup/Lac", "le Lac est sous Cybersup");
	egal(jeu.lire("state.chapitreEnCours()"), 11, "chapitreEnCours vaut 11");
	egal(jeu.lire("numeroAffiche(11)"), 10, "le numéro affiché est 10");
	fait(jeu, "n10_entree");
	verifier(/^J1 06:\d\d$/.test(jeu.lire("heureCh10()")), "il est J1, 6 h, à l'arrivée");
	jouer(jeu, partie(107));
	fait(jeu, "n10_jauge");
	// Un poste dont l'acte n'est pas ouvert ne valide rien ; une épreuve fermée non plus.
	var s = t(jeu, "ssh lac");
	contient(s, "Ta maison sur lac", "ssh lac : on arrive dans sa maison, avec son intro");
	contient(t(jeu, "ls"), "rive", "la maison sur lac : rive/");
	contient(t(jeu, "ls ~/annexes"), "transfert", "les dossiers des annexes sont semés");
	contient(t(jeu, "df -h /srv/lac"), "/srv/lac", "df voit le disque des données");
	egal(jeu.lire("epreuveOuverteCh10(1)"), false, "l'épreuve I est fermée avant la fin de l'acte I");
	// Une commande avance l'horloge de cinq minutes.
	var avant = jeu.lire("minutesCh10()");
	t(jeu, "pwd");
	egal(jeu.lire("minutesCh10()") - avant, 5, "une commande : cinq minutes");
	// Le direct start ne note pas les chapitres précédents.
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres d'avant ne sont pas notés");
})();

/* ================================================================== */
/* 3. Les fausses validations : l'état réel de lac, pas la frappe       */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jusqua(jeu, 111);
	// L'Eau trouble, sans vérifier les dates : valider.sh le refuse, et l'épreuve ne passe pas.
	var r = jouer(jeu, ["ssh lac", "cd ~/eau-trouble",
		"iconv -f ISO-8859-1 -t UTF-8 arrivage.csv | tr -d '\\r' > net.csv", "head -n 1 net.csv > propre.csv",
		"tail -n +2 net.csv | sort -u | awk -F, 'NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/' >> propre.csv",
		"tail -n +2 net.csv | sort -u | awk -F, '!(NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/)' > rejets.csv", "./valider.sh propre.csv"]);
	contient(r, "AAAA-MM-JJ", "valider.sh signale les dates au mauvais format");
	pasFait(jeu, "n10_rang2", "une date fausse dans propre.csv : l'épreuve II ne passe pas");
	t(jeu, "exit");
	jusqua2(jeu, 112, 114);
	// Effacer les vieux journaux au lieu de les compresser : le disque respire, mais l'étape ne passe pas (rien ne se jette).
	var jeu2 = neuf();
	jusqua(jeu2, 114);
	jouer(jeu2, ["ssh lac", "sudo find /srv/lac/journaux -name '*.log' -mtime +30 -delete", "sudo du -sh /srv/lac/* | sort -h"]);
	pasFait(jeu2, "n10_disque", "vieux journaux effacés : l'étape du disque ne passe pas");
	faux(jeu2, "vieuxJournauxGardesCh10()", "les vieux journaux ne sont plus gardés");
	// Une image construite en root : pas reproductible pour le Chantier.
	jusqua2(jeu, 115, 116);
	jouer(jeu, ["ssh lac", "cd ~/arsenal/etl", "echo 'epuisette==1.4.2' > requirements.txt", "printf 'essais/\\n.env\\n' > .dockerignore",
		"printf 'FROM python:3.12-slim\\nWORKDIR /app\\nCOPY requirements.txt .\\nRUN pip install --no-cache-dir -r requirements.txt\\nCOPY etl.py .\\nCMD [\"python\", \"etl.py\"]\\n' > Dockerfile",
		"docker build -t etl:1.0 .", "exit"]);
	pasFait(jeu, "n10_image", "une image qui tourne en root : l'étape du Chantier ne passe pas");
})();

/* ================================================================== */
/* 4. La compression en flux, les dates de lac, ls avec un chemin       */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jouer(jeu, partie(107));
	jouer(jeu, ["ssh lac"]);
	t(jeu, "cat ~/rive/comptoirs.csv | gzip > c.gz");
	contient(t(jeu, "file c.gz"), "gzip compressed data", "commande | gzip > f.gz : un vrai fichier compressé");
	contient(t(jeu, "zcat c.gz | head -1"), "comptoir,region", "zcat relit le flux compressé");
	contient(t(jeu, "zcat < c.gz | wc -l"), "7", "zcat < f.gz");
	t(jeu, "gzip -c ~/rive/comptoirs.csv > d.gz");
	contient(t(jeu, "gunzip -c d.gz | head -1"), "comptoir", "gzip -c f > f.gz, puis gunzip -c");
	contient(t(jeu, "echo x | gzip"), "not written to a terminal", "gzip vers le terminal : refusé, comme le vrai");
	var auj = t(jeu, "date +%F").trim(), dem = t(jeu, "date -d tomorrow +%F").trim();
	verifier(/^\d{4}-\d\d-\d\d$/.test(dem) && dem > auj, "date -d tomorrow : le lendemain de l'horloge de lac (" + auj + " -> " + dem + ")");
	contient(t(jeu, "date -d '2 days ago' +%F"), "-", "date -d '2 days ago'");
	contient(t(jeu, "ls rive/*.csv | cat"), "rive/captures.csv", "ls DOSSIER/*.csv : les chemins, comme sous Linux");
	contient(t(jeu, "file -i rive/captures.csv"), "charset=utf-8", "file -i sur lac : le type MIME et l'encodage");
	contient(t(jeu, "split -n l/4 rive/captures.csv /tmp/q_; wc -l /tmp/q_*"), "total", "split -n l/4");
	t(jeu, "crontab -r");
	var cr = t(jeu, "crontab -l 2>/dev/null | wc -l");
	contient(cr, "0", "crontab -l sans crontab, dans un tuyau : rien sur la sortie");
})();

/* ================================================================== */
/* 5. La nuit : la crontab de lac tourne vraiment                       */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jusqua(jeu, 113);
	vrai(jeu, "cronNuitOkCh10()", "la nuit de l'écluse est planifiée");
	// Le temps passe jusqu'à 22 h : la nuit tombe, 02:30 sonne, nuit.sh tourne.
	var m = jeu.lire("minutesCh10()") % 1440, n = Math.max(0, Math.ceil((22 * 60 - m) / 5));
	jeu.lire("sCh10().compte = (sCh10().compte || 0) + " + n);
	t(jeu, "pwd");
	verifier(/^J2 0[6-9]:/.test(jeu.lire("heureCh10()")), "après la nuit : J2 au matin (" + jeu.lire("heureCh10()") + ")");
	contient(jeu.lire("texteLacCh10('~/ecluses/nuit.log') || ''"), "nuit terminée", "pendant la nuit, cron a lancé nuit.sh, qui a écrit dans nuit.log");
})();

/* ================================================================== */
/* 6. La Grande Marée : un bras tranché appelle le suivant ; la sauvegarde */
/* ================================================================== */
(function(){
	var st = {};
	var jeu = neuf(st);
	jusqua(jeu, 118);
	vrai(jeu, "!!sCh10().maree", "Maître du Lac : la Grande Marée commence");
	egal(jeu.lire("Object.keys(sCh10().bras).length"), 2, "deux bras d'abord (le Déluge, les Doublons)");
	// Sauvegarde et rechargement au milieu de la Marée.
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	vrai(jeu2, "!!sCh10().maree", "rechargement : la Marée est toujours là");
	contient(nu(jeu2.taper("ssh lac")), "lac", "rechargement : ssh lac");
	contient(nu(jeu2.taper("docker ps")), "CONTAINER ID", "rechargement : dockerd tourne toujours sur lac");
	contient(nu(jeu2.taper("systemctl is-active deversoir")), "active", "rechargement : le déversoir tourne toujours");
	jeu2.taper("exit");
	jusqua2(jeu2, 119, 120);
	["n10_deluge", "n10_doublons_bras", "n10_encre_bras", "n10_poison", "n10_brouillard", "n10_fourche", "n10_mimetisme", "n10_neant", "n10_clarte", "n10_rapport"].forEach(function(id){ fait(jeu2, id); });
	vrai(jeu2, "sCh10().scoreFinal >= 90", "la Clarté du Lac au-dessus de 90 après la Marée");
	vrai(jeu2, "state.has('victoireCh10')", "victoire");
	contient(nu(jeu2.taper("cat ~/CertificatLac")), "LAC", "le certificat est dans la Maison");
	var code = jeu2.lire("state.codeDuCertificat11()");
	contient(nu(jeu2.taper("verifier " + code)), "Lac Profond, chapitre 10", "verifier reconnaît le certificat du Lac");
	contient(nu(jeu2.taper("cat ~/Cybersup/Lac/Passerelle")), "docker", "la Passerelle de Wissam");
})();

/* ================================================================== */
/* 7. La partie complète : la solution documentée, à 20 sur 20          */
/* ================================================================== */
(function(){
	var debut = DOC.indexOf("## Chapitre 10 : le Lac Profond"), fin = DOC.indexOf("## L'épreuve finale");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 10 avant l'épreuve finale");
	var section = DOC.substring(debut, fin);
	for (var n = PREMIERE; n <= DERNIERE; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 10) : pas de tiret cadratin");
	verifier(section.indexOf(" & ") === -1, "docs/solution.md (chapitre 10) : pas d'esperluette");
	var blocs = section.split("```").filter(function(x, i){ return i % 2 === 1; }).join("\n");
	verifier(blocs.split("\n").filter(function(l){ return /^# /.test(l); }).every(function(l){ return /^# (Les réponses|Le Filet)/.test(l); }), "docs/solution.md (chapitre 10) : un # en tête de ligne seulement dans un here-document");
	var jeu = neuf();
	jusqua(jeu, DERNIERE);
	var manque = jeu.lire("QUETES_CH10.concat(QUETES_SECONDAIRES_CH10).filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
	egal(manque, "", "toutes les étapes et tous les défis");
	egal(jeu.lire("state.noteTexte(11)"), "20 / 20", "20 sur 20");
	egal(jeu.lire("state.xp11"), jeu.lire("state.xpMax11()"), "le score maximal");
	egal(jeu.lire("rangCh10()"), 5, "Maître du Lac");
	vrai(jeu, "state.has('platine_ch10')", "le platine du Lac");
	vrai(jeu, "state.has('ami_ch10')", "l'Ami du Lac Profond");
	egal(jeu.lire("ORDRE_DES_SORTS_11.filter(function(s){ return !state.usages[s]; }).join(' ')"), "", "chaque sort du chapitre a servi");
	contient(nu(jeu.taper("badges lac")), "LINUX ET DOCKER POUR LA DONNÉE", "badges lac");
	t(jeu, "ssh lac");
	egal(jeu.lire("current_room.room_pic"), "./static/img/loc_lac_machine.gif", "l'image de la maison sur lac a le bon chemin");
	t(jeu, "printf '\\xef\\xbb\\xbfid\\r\\n1\\r\\n' > /tmp/bom.csv");
	t(jeu, "dos2unix -q -n /tmp/bom.csv /tmp/sans.csv");
	t(jeu, "dos2unix -q -b -n /tmp/bom.csv /tmp/avec.csv");
	egal(jeu.lire("texteLacCh10('/tmp/bom.csv').charAt(0)"), "\ufeff", "printf '\\xef\\xbb\\xbf' écrit un BOM (des octets UTF-8)");
	egal(jeu.lire("texteLacCh10('/tmp/sans.csv').replace(/\\n$/, '')"), "id\n1", "dos2unix retire le BOM par défaut, comme le vrai");
	egal(jeu.lire("texteLacCh10('/tmp/avec.csv').replace(/\\n$/, '')"), "\ufeffid\n1", "dos2unix -b garde le BOM");
	contient(t(jeu, "printf 'caf\\xc3\\xa9\\n'"), "café", "printf : deux octets UTF-8 donnent é");
	t(jeu, "mkdir -p ~/annexes");
	t(jeu, "{ time -p sort -t, -k6,6n ~/rive/captures.csv > /dev/null; } 2> ~/annexes/chrono-test.txt");
	contient(jeu.lire("texteLacCh10('~/annexes/chrono-test.txt')"), "real ", "time entre accolades : la mesure va dans le fichier");
	contient(jeu.lire("INDICES_CH10.n10_compose.join(' ') + INDICES_CH10.n10_carnet.join(' ')"), "docker build -t carnet:1.0", "les indices du Bassin construisent l'image du carnet");
	var chaines = jeu.lire("INDICES_CH10.n10_disque.join(' ')");
	contient(chaines, "{} \\;", "find -exec ... \\; s'affiche avec sa barre oblique");
	contient(nu(jeu.taper("man dos2unix")), "BOM", "man dos2unix parle du BOM");
	contient(t(jeu, "printf 'a,x\\nb,y\\na,y\\n' | datamash -t, -s crosstab 1,2"), "a,1,1", "datamash crosstab");
	t(jeu, "exit");
	contient(nu(jeu.taper("chapitres")), "terminé", "chapitres : le Lac est terminé");
})();

console.log("chapitre10 : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exit(1);
