/**
 * Les quêtes annexes des chapitres 2 à 5 (la panne, la Crypte, l'Académie, le Bastion) : chaque annexe jouée de bout
 * en bout en départ direct (la solution documentée, section par section), les fausses validations refusées, le bonus
 * hors note, les souvenirs, les badges « Ami », la sauvegarde en cours de route, la règle des annexes (aucune notion
 * déjà enseignée dans un chapitre, une page de manuel pour chaque sort neuf), les images et l'écriture des fichiers.
 *
 * Lancer : node tests/annexes.js
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }
function fait(jeu, id, m){ verifier(jeu.lire("!!state.quests[" + JSON.stringify(id) + "]") === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(jeu.lire("!!state.quests[" + JSON.stringify(id) + "]") === false, (m || id) + " : ne devrait PAS être accompli"); }
/* L'étape n (à partir de 0) d'une annexe est-elle cochée ? */
function etape(jeu, id, n){ return jeu.lire("!!(((state.annexes || {})[" + JSON.stringify(id) + "] || {}).etapes || [])[" + n + "]"); }
function oui(jeu, id, n, m){ verifier(etape(jeu, id, n) === true, m + " (" + id + ", étape " + (n + 1) + ") : devrait être cochée"); }
function non(jeu, id, n, m){ verifier(etape(jeu, id, n) === false, m + " (" + id + ", étape " + (n + 1) + ") : ne devrait PAS être cochée"); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");
var DOC = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");

/* Les chapitres affichés 2 à 5, leur numéro interne, leur badge, leur tableau de bord. */
var CHAPITRES = [
	{ affiche: 2, interne: 3, prefixe: "a2_", badge: "ami_ch2", nom: "Ami du campus", plan: "schema", badges: "reseau" },
	{ affiche: 3, interne: 2, prefixe: "a3_", badge: "ami_ch3", nom: "Ami de la Crypte", plan: "traque", badges: "cyber" },
	{ affiche: 4, interne: 5, prefixe: "a4_", badge: "ami_ch4", nom: "Ami de l'Académie", plan: "grimoire", badges: "arcanes" },
	{ affiche: 5, interne: 6, prefixe: "a5_", badge: "ami_ch5", nom: "Ami du Bastion", plan: "rempart", badges: "bastion" }
];
var XP_MAX = { xpMax: 3860, xpMax3: 5790, xpMax2: 5625, xpMax5: 5175, xpMax6: 7500, xpMax7: 8795, xpMax8: 6120, xpMax9: 9215 };

/* Une partie neuve, en départ direct au chapitre affiché ch. Au Bastion, la clé est posée sur bastion. */
function neuf(ch, stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre " + ch, "oui");
	if (ch === 5){ jeu.bastionDirect = true; jeu.jouerSolution("ssh-keygen"); jeu.jouerSolution("ssh-copy-id bastion"); }
	return jeu;
}
function t(jeu, c){
	if (c.indexOf("cd ~/Cybersup/SalleServeurs/Academie/Bastion") === 0 && jeu.bastionDirect) c = "cd ~/Cybersup/SalleServeurs/Bastion";
	return jeu.jouerSolution(c);
}
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
/* Les commandes de la section « Les quêtes annexes du chapitre N » de docs/solution.md. */
function section(n){
	var debut = DOC.indexOf("### Les quêtes annexes du chapitre " + n + " :");
	if (debut < 0) return [];
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, l'écriture, les images      */
/* ================================================================== */
var FICHIERS = ["SortsAnnexes.js", "HabitantsCampus.js", "HabitantsCrypte.js", "SortsAnnexesBis.js", "HabitantsAcademie.js", "SortsAnnexesTer.js", "HabitantsBastion.js"];
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var positions = ["Habitants.js"].concat(FICHIERS).concat(["Intro.js"]).map(function(f){ return index.indexOf("/" + f + "?"); });
	verifier(positions.every(function(p, i){ return p > -1 && (i === 0 || p > positions[i - 1]); }), "index.html : les fichiers des annexes, dans l'ordre, après Habitants.js et avant Intro.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf(FICHIERS.map(function(f){ return JSON.stringify(f); }).join(", ")) > -1, "tests/monde.js charge les fichiers des annexes, dans le même ordre");
	FICHIERS.forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		var esperluettes = chaines.filter(function(x){ return x.indexOf(" & ") > -1 && !/2>&1|&&|>&|« & »|&\s*$|\s&"$/.test(x); });
		verifier(esperluettes.length === 0, f + " : pas d'esperluette en prose : " + esperluettes.slice(0, 3).join(" | "));
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
	});
	var doc = ["2", "3", "4", "5"].map(function(n){ var d = DOC.indexOf("### Les quêtes annexes du chapitre " + n + " :"); return DOC.substring(d, DOC.indexOf("\n## ", d)); }).join("\n");
	verifier(doc.indexOf("—") === -1, "docs/solution.md (annexes) : pas de tiret cadratin");
	verifier(doc.indexOf(" & ") === -1, "docs/solution.md (annexes) : pas d'esperluette");
	verifier(!/^# /m.test(doc.split("```").filter(function(x, i){ return i % 2 === 1; }).join("\n")), "docs/solution.md (annexes) : pas de commentaire dans les blocs de commandes");
	var jeu = monde.nouveauMonde({});
	var noms = jeu.lire("QUETES_ANNEXES.filter(function(a){ return /^a[2-5]_/.test(a.id); }).map(function(a){ return a.item().picturename; })");
	egal(noms.length, 24, "vingt-quatre habitants");
	noms.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, path.basename(n))), "image du portrait : " + path.basename(n)); });
	CHAPITRES.forEach(function(c){ verifier(fs.existsSync(path.join(IMG, "badge_" + c.badge + ".gif")), "image de la médaille : badge_" + c.badge + ".gif"); });
})();

/* ================================================================== */
/* 2. Les déclarations, la règle des annexes                          */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return !a.rappel; }).length"), 54, "cinquante-quatre quêtes annexes en tout (six par chapitre, du 2 au 10)");
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.rappel; }).length"), 7, "et les Sept Échos du Lac, à part");
	CHAPITRES.forEach(function(c){
		var a = jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('" + c.prefixe + "') === 0; }).map(function(a){ return [a.chapitre, a.etapes.length, !!a.souvenir, !!a.merci, !!a.lumiere, typeof a.ouverte]; })");
		egal(a.length, 6, "chapitre " + c.affiche + " : six annexes");
		a.forEach(function(x, i){
			egal(x[0], c.interne, "chapitre " + c.affiche + ", annexe " + (i + 1) + " : numéro interne du chapitre");
			verifier(x[1] >= 2 && x[1] <= 4, "chapitre " + c.affiche + ", annexe " + (i + 1) + " : de 2 à 4 étapes");
			verifier(x[2] && x[3] && x[4], "chapitre " + c.affiche + ", annexe " + (i + 1) + " : un souvenir, une fin, une lumière");
		});
		egal(jeu.lire("(AMIS_ANNEXES[" + c.interne + "] || {}).badge"), c.badge, "chapitre " + c.affiche + " : le badge Ami déclaré");
	});
	// La règle des annexes : aucun sort d'annexe n'est enseigné dans un chapitre, et chacun a sa page de manuel, hors barème.
	var sorts = jeu.lire("Object.keys(SORTS_DES_ANNEXES)");
	verifier(sorts.length >= 40, "les sorts des annexes sont déclarés (" + sorts.length + ")");
	var deja = jeu.lire("tousLesSorts()");
	sorts.forEach(function(s){
		verifier(deja.indexOf(s) === -1, "annexe : " + s + " n'est enseigné dans aucun chapitre");
		verifier(jeu.lire("!!MANUEL[" + JSON.stringify(s) + "]"), "annexe : " + s + " a sa page de manuel");
		verifier(jeu.lire("!!(MANUEL[" + JSON.stringify(s) + "] || {}).horsBareme"), "annexe : la page de " + s + " ne rapporte pas d'XP");
	});
	egal(jeu.lire("Object.keys(SORTS_DES_ANNEXES).filter(function(s){ return [ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3, ORDRE_DES_SORTS_5, ORDRE_DES_SORTS_6, ORDRE_DES_SORTS_7, ORDRE_DES_SORTS_8, ORDRE_DES_SORTS_9].some(function(o){ return o.indexOf(s) > -1; }); }).join(' ')"), "", "aucun sort d'annexe dans un barème");
	["lscpu", "lspci", "lsusb", "dmidecode", "apropos", "whatis", "hexdump", "readlink", "realpath", "timeout", "ssh-agent", "ssh-add", "pwgen", "iconv", "dos2unix", "envsubst", "printenv", "numfmt", "bc", "mkfifo", "sqlite3", "ssh-keyscan", "pwscore", "sudoreplay", "cmp"].forEach(function(s){
		verifier(sorts.indexOf(s) > -1, "annexe : " + s + " est un sort d'annexe");
	});
	Object.keys(XP_MAX).forEach(function(k){ egal(jeu.lire("state." + k + "()"), XP_MAX[k], "barème inchangé : " + k); });
	// Les sorts du chapitre qu'un habitant enseigne (nc, curl, useradd, sshd) restent ceux du barème : pas des sorts d'annexe.
	["nc", "curl", "useradd", "sshd"].forEach(function(s){ verifier(sorts.indexOf(s) === -1 && deja.indexOf(s) > -1, s + " reste un sort du chapitre"); });
})();

/* ================================================================== */
/* 2 bis. Le Grand Port (chapitre 8) : six annexes, aucune notion vue ailleurs */
/* ================================================================== */
(function(){
	function vrai(j, expr, m){ verifier(j.lire(expr) === true, m + "  [" + expr + "]"); }
	var jeu = monde.nouveauMonde({});
	var a8 = jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('a8_') === 0; }).map(function(a){ return [a.id, a.chapitre, a.etapes.length, !!a.souvenir, !!a.merci, !!a.lumiere, a.habitant]; })");
	egal(a8.length, 6, "chapitre 8 : six annexes");
	egal(a8.map(function(x){ return x[0]; }).sort().join(" "), "a8_cabine a8_cloisons a8_continents a8_douanier a8_podman a8_relecteur", "chapitre 8 : les six annexes attendues");
	egal(a8.map(function(x){ return x[6]; }).sort().join(" "), "Anissa Edson Idrissa Mina Neil Ronan", "chapitre 8 : les six habitants (prénoms de la liste)");
	a8.forEach(function(x){
		egal(x[1], 9, x[0] + " : numéro interne 9");
		egal(x[2], 4, x[0] + " : quatre étapes");
		verifier(x[3] && x[4] && x[5], x[0] + " : un souvenir, une fin, une lumière");
	});
	egal(jeu.lire("(AMIS_ANNEXES[9] || {}).badge"), "ami_ch8", "chapitre 8 : le badge Ami du Grand Port déclaré");
	verifier(fs.existsSync(path.join(IMG, "badge_ami_ch8.gif")), "image de la médaille : badge_ami_ch8.gif");
	jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('a8_') === 0; }).map(function(a){ return a.item().picturename; })").forEach(function(n){ verifier(fs.existsSync(path.join(IMG, path.basename(n))), "image du portrait : " + path.basename(n)); });
	// La règle : les sorts des annexes du port ne sont enseignés par aucun chapitre, ni dans le barème du Grand Port.
	var deja = jeu.lire("tousLesSorts()");
	["podman", "unshare", "nsenter", "lsns", "skopeo", "hadolint", "systemd-nspawn", "machinectl"].forEach(function(x){
		vrai(jeu, "!!SORTS_DES_ANNEXES[" + JSON.stringify(x) + "]", "annexe du port : " + x + " est un sort d'annexe");
		verifier(deja.indexOf(x) === -1, "annexe du port : " + x + " n'est enseigné dans aucun chapitre");
		vrai(jeu, "ORDRE_DES_SORTS_9.indexOf(" + JSON.stringify(x) + ") === -1", "annexe du port : " + x + " hors du barème du Grand Port");
	});
	// Les manœuvres des annexes (buildx, manifest) ne sont enseignées par aucun maître du port : seulement par Ronan.
	["buildx", "manifest"].forEach(function(x){ egal(jeu.lire("MANOEUVRES_PORT[" + JSON.stringify(x) + "]"), "Ronan", "la manœuvre " + x + " n'est enseignée que par Ronan (annexe)"); });
	egal(jeu.lire("Object.keys(MANOEUVRES_PORT).filter(function(k){ return MANOEUVRES_PORT[k] === 'Ronan'; }).sort().join(' ')"), "buildx manifest", "Ronan n'enseigne que buildx et manifest");
	// Aucun maître, aucune étape ni aucun défi du Grand Port ne demande une notion d'annexe.
	var textes = jeu.lire("QUETES_CH8.concat(QUETES_SECONDAIRES_CH8).map(function(q){ return q.titre + ' ' + (q.indice || ''); }).join('\\n')");
	["podman", "unshare", "nsenter", "lsns", "skopeo", "hadolint", "nspawn", "machinectl", "buildx", "manifest inspect", "ip netns"].forEach(function(x){
		verifier(textes.indexOf(x) === -1, "les étapes et défis du Grand Port ne demandent pas « " + x + " »");
	});
	var maitres = jeu.lire("Object.keys(MAITRES_PORT).map(function(k){ var g = MAITRES_PORT[k]; return [g.image(), g.syntaxe(), g.mission()].join(' '); }).join(' ')");
	["podman", "skopeo", "hadolint", "nspawn", "machinectl", "buildx", "nsenter", "unshare"].forEach(function(x){
		verifier(maitres.indexOf(x) === -1, "aucun maître du port n'enseigne « " + x + " »");
	});
	// Une annexe ne s'ouvre qu'au Grand Port, et ne touche pas au barème du chapitre.
	var j2 = monde.nouveauMonde({});
	j2.taper("chapitre 7", "oui");
	egal(j2.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('a8_') === 0 && a.ouverte(); }).length"), 0, "à Port-Aube, les annexes du Grand Port restent fermées");
	var j3 = monde.nouveauMonde({});
	j3.taper("chapitre 8", "oui");
	egal(j3.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('a8_') === 0 && !a.ouverte(); }).length"), 0, "départ direct au chapitre 8 : les annexes du port sont ouvertes");
	j3.jouerSolution("cat Anissa");
	vrai(j3, "!!(state.annexes.a8_podman || {}).proposee", "lire Anissa ouvre son annexe");
	var xp9 = j3.lire("state.xp9");
	j3.jouerSolution("ssh chaloupe");
	j3.jouerSolution("sudo podman run -d --name canot alpine:3.20 sleep 3600");
	egal(j3.lire("JSON.stringify((state.annexes.a8_podman || {}).etapes || [])").indexOf("true"), -1, "podman avec sudo : pas l'étape sans root");
	j3.jouerSolution("podman run -d --name canot2 alpine:3.20 sleep 3600");
	egal(j3.lire("!!(state.annexes.a8_podman.etapes || [])[0]"), true, "podman sans sudo : l'étape est cochée");
	j3.jouerSolution("exit");
	egal(j3.lire("state.xp9"), xp9, "une annexe ne change pas l'XP du chapitre 8");
	// hadolint sur un autre fichier ne coche rien ; le plan de la balise non corrigé non plus.
	j3.jouerSolution("ssh docks"); j3.jouerSolution("sudo usermod -aG docker <moi>"); j3.jouerSolution("exit");
	j3.jouerSolution("cd ChantierNaval"); j3.jouerSolution("cat Idrissa"); j3.jouerSolution("ssh docks");
	j3.jouerSolution("printf 'FROM debian:12\\nCMD [\\\"true\\\"]\\n' > ~/autre.Dockerfile; hadolint ~/autre.Dockerfile");
	egal(j3.lire("JSON.stringify((state.annexes.a8_relecteur || {}).etapes || [])").indexOf("true"), -1, "hadolint sur un autre plan : rien n'est coché");
	j3.jouerSolution("hadolint ~/relecture/Dockerfile");
	egal(j3.lire("!!((state.annexes.a8_relecteur || {}).etapes || [])[0]"), true, "hadolint sur le plan de la balise : les trois remarques lues");
	egal(j3.lire("!!((state.annexes.a8_relecteur || {}).etapes || [])[1]"), false, "le plan non corrigé : l'étape suivante n'est pas cochée");
})();

/* ================================================================== */
/* 3. Chapitre 2 : les fausses validations                             */
/* ================================================================== */
(function(){
	var jeu = neuf(2);
	jouer(jeu, ["cd ~/Cybersup/BatimentB", "cat Gestionnaire", "cat Appariteur", "cat Documentaliste", "cat Coursier", "cat Bibliothecaire", "cat Tutrice"]);
	egal(jeu.lire("state.spells.nc === true && state.spells.curl === true"), true, "l'Appariteur et la Bibliothécaire enseignent nc et curl dès l'ouverture");
	// L'inventaire : le numéro recopié sans dmidecode, ou dmidecode sans sudo, ne comptent pas.
	jouer(jeu, ["echo CYB-B20-4471 > ~/inventaire.txt", "cd Poste", "lscpu", "lspci", "lsusb"]);
	oui(jeu, "a2_inventaire", 2, "lsusb sur le Poste");
	contient(t(jeu, "dmidecode -s system-serial-number"), "root", "dmidecode sans sudo : refusé");
	pasFait(jeu, "a2_inventaire", "le numéro écrit avant dmidecode");
	t(jeu, "sudo dmidecode -s system-serial-number");
	t(jeu, "echo CYB-B20-4471 > ~/inventaire.txt");
	fait(jeu, "a2_inventaire", "l'inventaire, après sudo dmidecode");
	// Les talkies : parler avant d'écouter, un faux code, un faux planning ne comptent pas.
	jouer(jeu, ["cd ~/Cybersup/BatimentB", "echo 0000 | nc loge 6666"]);
	non(jeu, "a2_talkies", 0, "parler avant d'écouter");
	contient(t(jeu, "nc -l 5555"), "renvoie-moi ce code", "nc -l 5555 : l'appel de la loge");
	t(jeu, "echo 0000 | nc loge 6666");
	non(jeu, "a2_talkies", 1, "un faux code");
	t(jeu, "echo <code-loge> | nc loge 6666");
	oui(jeu, "a2_talkies", 1, "le bon code");
	t(jeu, "echo planning | nc loge 6666");
	non(jeu, "a2_talkies", 2, "un faux planning");
	t(jeu, "nc loge 6666 < planning-gardes.txt");
	oui(jeu, "a2_talkies", 2, "le planning, tel quel");
	contient(t(jeu, "nc -l 5555"), "PLAN DE LA LOGE", "le plan des rondes, à l'écran");
	non(jeu, "a2_talkies", 3, "le plan lu à l'écran, pas gardé dans un fichier");
	t(jeu, "nc -l 5555 > ~/plan.txt");
	fait(jeu, "a2_talkies", "le plan gardé dans un fichier");
	// Le carnet : une clé lisible par tous, une connexion tapée en entier ne comptent pas.
	jouer(jeu, ["mkdir -p ~/.ssh", "mv ~/depot_ed25519 ~/.ssh/"]);
	non(jeu, "a2_carnet", 0, "la clé rangée mais lisible par tous");
	t(jeu, "chmod 600 ~/.ssh/depot_ed25519");
	oui(jeu, "a2_carnet", 0, "la clé en 600");
	contient(t(jeu, "ssh -p 2222 -i ~/.ssh/depot_ed25519 cours@10.0.97.77"), "depot", "ssh tapé en entier : on entre sur le dépôt");
	t(jeu, "exit");
	non(jeu, "a2_carnet", 2, "ssh tapé en entier, sans fiche");
	contient(t(jeu, "ssh depot"), "impossible de résoudre", "ssh depot sans fiche : nom inconnu");
	// Le rebond : le labo n'est pas joignable d'ici, et deux sauts à la main ne sont pas un rebond.
	contient(t(jeu, "ssh labo-lille"), "timed out", "ssh labo-lille, sans rebond : le labo ne répond pas");
	jouer(jeu, ["ssh passerelle-lille", "ssh labo-lille", "exit", "exit"]);
	non(jeu, "a2_rebond", 0, "deux sauts à la main");
	t(jeu, "ssh -J passerelle-lille labo-lille");
	t(jeu, "exit");
	oui(jeu, "a2_rebond", 0, "ssh -J");
	// Le tunnel : l'intranet ne répond pas d'ici, et ssh -N sans -f ne laisse pas de tunnel.
	contient(t(jeu, "curl http://intranet-lille/"), "curl: (28)", "curl direct : délai dépassé");
	t(jeu, "ssh -N -L 8080:intranet-lille:80 passerelle-lille");
	non(jeu, "a2_tunnel", 0, "ssh -N sans -f");
	contient(t(jeu, "curl http://localhost:8080/"), "curl: (7)", "curl localhost sans tunnel : connexion refusée");
	// La notice : la page de la commande, ou un mauvais numéro, ne comptent pas.
	jouer(jeu, ["apropos comptes", "whatis passwd", "man passwd"]);
	non(jeu, "a2_notice", 2, "man passwd, la section 1");
	t(jeu, "man 5 passwd");
	t(jeu, "echo 5 > ~/notice.txt");
	pasFait(jeu, "a2_notice", "un mauvais numéro de champ");
	t(jeu, "echo 7 > ~/notice.txt");
	fait(jeu, "a2_notice", "le septième champ");
	egal(jeu.lire("state.xpAnnexes"), 150, "trois annexes : 150 XP en bonus");
})();

/* ================================================================== */
/* 4. Chapitre 3 : les fausses validations                             */
/* ================================================================== */
(function(){
	var jeu = neuf(3);
	jouer(jeu, ["ssh citadelle", "cd Crypte", "cat Enlumineur", "cat Passeur", "cat Serrurier", "cd Caveau", "cat Fossoyeur", "cat Sonneur", "cat Sacristain", "cd ../Catacombes"]);
	// Le parchemin : renommer sans regarder les octets, ou se tromper d'extension, ne compte pas.
	t(jeu, "mv enluminure.txt enluminure.png");
	non(jeu, "a3_magie", 0, "renommé sans hexdump");
	jouer(jeu, ["mv enluminure.png enluminure.txt", "hexdump -C -n 16 enluminure.txt", "mv enluminure.txt enluminure.jpg"]);
	non(jeu, "a3_magie", 1, "une image PNG nommée .jpg");
	t(jeu, "mv enluminure.jpg enluminure.png");
	oui(jeu, "a3_magie", 1, "enluminure.png");
	// Les passages : readlink sans -f s'arrête au premier maillon.
	contient(t(jeu, "readlink passage-nord"), "escalier", "readlink : le premier maillon");
	non(jeu, "a3_passages", 0, "readlink sans -f");
	contient(t(jeu, "readlink -f passage-nord"), "reliquaire.txt", "readlink -f : le bout de la chaîne");
	jouer(jeu, ["realpath Galeries/../Galeries/escalier", "ls -l Galeries Ossuaire"]);
	non(jeu, "a3_passages", 2, "ls -l ne montre pas les inodes");
	t(jeu, "ls -li Galeries Ossuaire");
	oui(jeu, "a3_passages", 2, "ls -li");
	// Une copie n'est pas un lien dur.
	contient(t(jeu, "ln Ossuaire/testament.txt Galeries/testament-bis.txt"), "", "ln sous un autre nom");
	jouer(jeu, ["cp Ossuaire/testament.txt Galeries/", "rm Ossuaire/testament.txt"]);
	pasFait(jeu, "a3_passages", "une copie, puis rm : le testament n'est plus le même");
	// La veille : sans --line-buffered, les alertes restent dans le tampon de grep.
	jouer(jeu, ["cd Clocher", "tail -f ronde.log", "tail -f ronde.log", "tail -F ronde.log", "tail -F ronde.log | grep ALERTE > ~/alertes.txt"]);
	oui(jeu, "a3_veille", 1, "tail -F");
	pasFait(jeu, "a3_veille", "grep sans --line-buffered");
	egal(jeu.lire("(axTexteMaison('alertes.txt') || '').trim()"), "", "sans --line-buffered, ~/alertes.txt reste vide");
	t(jeu, "tail -F ronde.log | grep --line-buffered ALERTE > ~/alertes.txt");
	fait(jeu, "a3_veille", "grep --line-buffered");
	// Le sablier : des codes recopiés sans timeout, ou timeout sans KILL sur l'ombre têtue, ne comptent pas.
	jouer(jeu, ["cd ..", "echo 124 > ~/sablier.txt", "echo 137 >> ~/sablier.txt"]);
	pasFait(jeu, "a3_sablier", "des codes recopiés sans rien lancer");
	jouer(jeu, ["timeout 5 ./ombre-errante", "timeout 5 ./ombre-tetue"]);
	oui(jeu, "a3_sablier", 0, "timeout sur l'ombre errante");
	non(jeu, "a3_sablier", 1, "timeout sans KILL sur l'ombre têtue");
	t(jeu, "timeout -k 2 5 ./ombre-tetue");
	egal(jeu.taper("echo $?").trim(), "137", "timeout -k : code 137");
	oui(jeu, "a3_sablier", 1, "timeout -k");
	// Le trousseau : ssh-add sans agent, puis des montées en retapant la phrase, ne comptent pas.
	t(jeu, "chmod 600 ~/cle-du-passeur");
	contient(t(jeu, "ssh-add -l"), "Could not open a connection to your authentication agent", "ssh-add sans agent");
	contient(jeu.taper("ssh -i ~/cle-du-passeur passeur@beffroi", "trois cloches sous la lune"), "beffroi", "montée en tapant la phrase");
	t(jeu, "exit");
	non(jeu, "a3_trousseau", 0, "pas d'agent");
	egal(jeu.lire("axEtat('a3_trousseau').montees || 0"), 0, "une montée sans l'agent ne compte pas");
	jouer(jeu, ["eval \"$(ssh-agent -s)\""]);
	jeu.taper("ssh-add ~/cle-du-passeur", "une mauvaise phrase");
	contient(t(jeu, "ssh-add -l"), "no identities", "mauvaise phrase : rien dans l'agent");
	non(jeu, "a3_trousseau", 1, "mauvaise phrase");
	// Les mots : un mauvais candidat ne compte pas.
	jouer(jeu, ["pwgen 12 5", "pwgen -s 16 3", "openssl rand -base64 24", "openssl passwd -6 rouille", "openssl passwd -6 rouille"]);
	oui(jeu, "a3_mots", 2, "deux empreintes salées");
	var faux = jeu.lire("AX_CANDIDATS_GRILLE.filter(function(m){ return m !== AX_MOT_GRILLE; })[0]");
	t(jeu, "echo " + faux + " > ~/serrure.txt");
	pasFait(jeu, "a3_mots", "un mauvais candidat");
	contient(t(jeu, "openssl passwd -6 -salt Gr1ll3Cav <mot-grille>"), jeu.lire("axEmpreinteGrille()"), "le bon candidat redonne l'empreinte du Serrurier");
	t(jeu, "echo <mot-grille> > ~/serrure.txt");
	fait(jeu, "a3_mots", "le bon mot");
})();

/* ================================================================== */
/* 5. Chapitre 4 : les fausses validations                             */
/* ================================================================== */
(function(){
	var jeu = neuf(4);
	jouer(jeu, ["cd ~/Cybersup/SalleServeurs/Academie/Grimoires", "cat Copiste", "cd ../Archives", "cat Secretaire", "cd ../Alchimie", "cat Tresorier",
		"cd ../Invocation", "cat Apprentie", "cd ../Chronomancie", "cat Messagere", "cd ../Divination", "cat Surveillante", "cd ../Grimoires"]);
	// Le grimoire : une copie sans iconv reste en ISO-8859-1.
	contient(t(jeu, "cat grimoire-ancien.txt"), "�", "cat : des losanges à la place des accents");
	jouer(jeu, ["cat -A grimoire-ancien.txt", "cp grimoire-ancien.txt ~/grimoire.txt", "dos2unix ~/grimoire.txt"]);
	non(jeu, "a4_grimoire", 1, "une copie sans iconv");
	contient(t(jeu, "./incantation.sh"), "bad interpreter", "le script en CRLF ne se lance pas");
	contient(t(jeu, "iconv -f UTF-8 -t ASCII grimoire-ancien.txt"), "illegal input sequence", "iconv avec le mauvais encodage d'origine");
	// Les formules : sans export, envsubst ne voit rien ; sans liste, $PRIX disparaît.
	jouer(jeu, ["cd ../Archives", "ELEVE=\"Ambre Morel\"", "MAISON=Divination", "DATE_EPREUVE=\"12 novembre\"", "envsubst < modele-convocation.txt > ~/convocation.txt"]);
	non(jeu, "a4_formules", 0, "des variables non exportées");
	contient(jeu.taper("cat ~/convocation.txt"), "Élève : \n", "envsubst sans export : des trous vides");
	jouer(jeu, ["export ELEVE MAISON DATE_EPREUVE", "printenv ELEVE", "envsubst < modele-convocation.txt > ~/convocation.txt", "envsubst < modele-affiche.txt > ~/affiche.txt"]);
	oui(jeu, "a4_formules", 1, "la convocation remplie");
	pasFait(jeu, "a4_formules", "l'affiche sans liste : $PRIX effacé");
	// La balance : un calcul en entiers, ou la réponse recopiée sans bc, ne comptent pas.
	jouer(jeu, ["cd ../Alchimie", "numfmt --to=iec --field=2 < reserves.txt", "numfmt --from=iec 750M"]);
	egal(jeu.taper("echo $(( (1250 + 725 + 3000 + 475 + 1840 + 990 + 2215) / 700 ))").split("\n")[0].trim(), "14", "$(( )) : un entier");
	t(jeu, "echo 14.99 > ~/balance.txt");
	pasFait(jeu, "a4_balance", "la moyenne recopiée sans bc");
	egal(jeu.taper("echo \"(12.50 + 7.25 + 30.00 + 4.75 + 18.40 + 9.90 + 22.15) / 7\" | bc").trim(), "14", "bc sans scale : un entier");
	t(jeu, "echo \"scale=2; (12.50 + 7.25 + 30.00 + 4.75 + 18.40 + 9.90 + 22.15) / 7\" | bc");
	t(jeu, "echo 14.99 > ~/balance.txt");
	fait(jeu, "a4_balance", "bc avec scale=2");
	// Le sortilège : un script en $1, sans getopts, ne compte pas.
	jouer(jeu, ["echo 'benir() { echo \"Que la lumière soit sur $1 !\"; }' > ~/sortilege.sh", "echo 'benir \"$2\"' >> ~/sortilege.sh", "chmod +x ~/sortilege.sh", "~/sortilege.sh -n Ambre"]);
	non(jeu, "a4_sortilege", 1, "un script sans getopts");
	// Le tube : un fichier ordinaire n'est pas un tube.
	jouer(jeu, ["touch ~/question", "echo \"Qui es-tu ?\" > ~/question"]);
	non(jeu, "a4_tube", 0, "un fichier ordinaire");
	non(jeu, "a4_tube", 1, "écrire dans un fichier ordinaire");
	jouer(jeu, ["rm ~/question", "mkfifo ~/question"]);
	contient(jeu.taper("ls -l ~/question"), "prw-", "ls -l : un p en tête");
	// Le registre : un nombre faux ne compte pas, une requête fausse donne une vraie erreur.
	jouer(jeu, ["cd ../Divination"]);
	contient(t(jeu, "sqlite3 registre.db \"SELEC nom FROM eleves;\""), "Parse error", "sqlite3 : une faute de frappe");
	jouer(jeu, ["sqlite3 registre.db \".tables\"", "sqlite3 registre.db \".schema eleves\"", "sqlite3 registre.db \"SELECT nom, moyenne FROM eleves WHERE maison = 'Divination' ORDER BY moyenne;\""]);
	non(jeu, "a4_registre", 1, "le tri croissant");
	jouer(jeu, ["sqlite3 registre.db \"SELECT nom, moyenne FROM eleves WHERE maison = 'Divination' ORDER BY moyenne DESC;\"", "echo 4 > ~/registre.txt"]);
	pasFait(jeu, "a4_registre", "un nombre deviné, sans COUNT");
})();

/* ================================================================== */
/* 6. Chapitre 5 : les fausses validations (défensif)                  */
/* ================================================================== */
(function(){
	var jeu = neuf(5);
	jouer(jeu, ["cd ~/Cybersup/SalleServeurs/Academie/Bastion", "cd PontLevis", "cat Colporteur", "cd ../Herse", "cat Sergent", "cd ../Guet", "cat Sentinelle",
		"cd ../Sceau", "cat Greffier", "cd ../Coffres", "cat Cantiniere", "cd ../Banniere", "cat Heraut", "cd ../PontLevis"]);
	egal(jeu.lire("state.spells.useradd === true && state.spells.sshd === true"), true, "la Sentinelle et le Héraut enseignent useradd et sshd");
	// Le voyageur : ssh refuse la clé changée, sans rien demander.
	contient(t(jeu, "ssh relais"), "REMOTE HOST IDENTIFICATION HAS CHANGED", "la clé du relais a changé");
	non(jeu, "a5_voyageur", 3, "ssh refuse");
	t(jeu, "ssh-keygen -F relais");
	t(jeu, "ssh-keyscan relais");
	jeu.taper("ssh relais", "yes");
	non(jeu, "a5_voyageur", 3, "sans -R, toujours refusé");
	// Le coffre : sans -pbkdf2 (avertissement), ou une copie de l'original, ne comptent pas.
	t(jeu, "cd ../Coffres");
	contient(jeu.taper("openssl enc -aes-256-cbc -salt -in recette.txt -out ~/recette.enc", ["phrase", "phrase"]), "deprecated key derivation", "openssl enc sans -pbkdf2 : l'avertissement");
	non(jeu, "a5_coffre", 0, "sans -pbkdf2");
	jeu.taper("openssl enc -aes-256-cbc -pbkdf2 -salt -in recette.txt -out ~/recette.enc", ["phrase", "phrase"]);
	oui(jeu, "a5_coffre", 0, "avec -pbkdf2");
	t(jeu, "cp recette.txt ~/copie.txt");
	non(jeu, "a5_coffre", 1, "une copie de l'original n'est pas un déchiffrement");
	contient(jeu.taper("openssl enc -d -aes-256-cbc -pbkdf2 -in ~/recette.enc -out ~/recette2.txt", "mauvaise"), "bad decrypt", "mauvaise phrase : bad decrypt");
	t(jeu, "cd ..");
	t(jeu, "ssh bastion");
	// La devise : pwscore n'existe pas avant l'installation, et minlen = 8 ne suffit pas.
	contient(t(jeu, "echo test | pwscore"), "command not found", "pwscore avant l'installation");
	t(jeu, "sudo apt install libpam-pwquality libpwquality-tools");
	t(jeu, "printf 'minlen = 8\\nminclass = 3\\n' | sudo tee -a /etc/security/pwquality.conf");
	non(jeu, "a5_devise", 1, "minlen = 8");
	// Le guetteur : un service seul, sans unité .path, ne guette rien.
	t(jeu, "printf '[Service]\\nType=oneshot\\nExecStart=/usr/bin/logger -t guetteur alerte\\n' | sudo tee /etc/systemd/system/guet-passwd.service");
	non(jeu, "a5_guetteur", 0, "le service seul");
	t(jeu, "sudo useradd essai-avant");
	egal(jeu.taper("sudo journalctl -t guetteur").indexOf("alerte"), -1, "sans .path, pas d'alerte");
	t(jeu, "sudo userdel essai-avant");
	// Le greffier : sans log_output, rien n'est enregistré.
	t(jeu, "sudo systemctl status ssh");
	t(jeu, "sudo sudoreplay -l");
	non(jeu, "a5_greffier", 0, "pas de log_output");
	non(jeu, "a5_greffier", 2, "une liste vide");
	// Le certificat : sans durée, refusé ; TrustedUserCAKeys écrit sans reload, refusé.
	t(jeu, "sudo ssh-keygen -t ed25519 -f /etc/ssh/ca_inspection -N \"\" -C autorite");
	oui(jeu, "a5_certificat", 0, "l'autorité forgée");
	t(jeu, "sudo ssh-keygen -s /etc/ssh/ca_inspection -I heraut -n heraut /srv/inspection/heraut.pub");
	non(jeu, "a5_certificat", 1, "un certificat sans fin de validité");
	jouer(jeu, ["sudo ssh-keygen -s /etc/ssh/ca_inspection -I heraut -n heraut -V +52w /srv/inspection/heraut.pub", "sudo ssh-keygen -L -f /srv/inspection/heraut-cert.pub",
		"echo 'TrustedUserCAKeys /etc/ssh/ca_inspection.pub' | sudo tee /etc/ssh/sshd_config.d/60-inspection.conf"]);
	oui(jeu, "a5_certificat", 2, "le certificat lu");
	pasFait(jeu, "a5_certificat", "TrustedUserCAKeys écrit sans reload");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 7. La sauvegarde en cours d'annexe                                  */
/* ================================================================== */
(function(){
	var st = {};
	var jeu = neuf(2, st);
	jouer(jeu, ["cd ~/Cybersup/BatimentB", "cat Documentaliste", "mkdir -p ~/.ssh", "mv ~/depot_ed25519 ~/.ssh/", "chmod 600 ~/.ssh/depot_ed25519",
		"echo 'Host depot' > ~/.ssh/config", "echo '    HostName 10.0.97.77' >> ~/.ssh/config", "echo '    User cours' >> ~/.ssh/config", "echo '    Port 2222' >> ~/.ssh/config",
		"echo '    IdentityFile ~/.ssh/depot_ed25519' >> ~/.ssh/config"]);
	oui(jeu, "a2_carnet", 1, "la fiche du dépôt");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	egal(jeu2.lire("!!(state.annexes.a2_carnet || {}).proposee"), true, "rechargement : l'annexe reste proposée");
	oui(jeu2, "a2_carnet", 1, "rechargement : la fiche est toujours là");
	contient(jeu2.taper("ssh depot"), "depot", "rechargement : ssh depot");
	jeu2.taper("cat LISEZMOI");
	jeu2.taper("exit");
	fait(jeu2, "a2_carnet", "rechargement : l'annexe se termine");
})();

/* ================================================================== */
/* 8. La solution documentée, chapitre par chapitre, en départ direct  */
/* ================================================================== */
CHAPITRES.forEach(function(c){
	var commandes = section(c.affiche);
	verifier(commandes.length > 20, "docs/solution.md : la section des annexes du chapitre " + c.affiche + " (" + commandes.length + " commandes)");
	var jeu = neuf(c.affiche);
	var xpAvant = jeu.lire("state.xpAnnexes || 0");
	commandes.forEach(function(cmd){ t(jeu, cmd); });
	var ids = jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('" + c.prefixe + "') === 0; }).map(function(a){ return a.id; })");
	ids.forEach(function(id){ fait(jeu, id, "chapitre " + c.affiche + " : " + id); });
	egal(jeu.lire("state.xpAnnexes || 0") - xpAvant, 300, "chapitre " + c.affiche + " : 300 XP en bonus, hors note");
	verifier(jeu.lire("state.has('" + c.badge + "')"), "chapitre " + c.affiche + " : le badge " + c.nom);
	contient(jeu.taper("badges " + c.badges), c.nom, "chapitre " + c.affiche + " : badges " + c.badges + " relit le badge " + c.nom);
	var souvenirs = jeu.lire("annexesDuChapitre(" + c.interne + ").map(function(a){ return a.souvenir.nom; })");
	var dossier = jeu.taper("ls ~/Souvenirs");
	egal(souvenirs.length, 6, "chapitre " + c.affiche + " : six souvenirs");
	souvenirs.forEach(function(n){ contient(dossier, n, "chapitre " + c.affiche + " : le souvenir " + n + " dans ~/Souvenirs"); });
	var lumiere = jeu.lire("annexeParId('" + ids[0] + "').lumiere");
	contient(jeu.taper(c.plan), lumiere, "chapitre " + c.affiche + " : une lumière de plus sur le plan (" + c.plan + ")");
	contient(jeu.taper("quetes annexes"), "6 sur 6", "chapitre " + c.affiche + " : quetes annexes, 6 sur 6");
	Object.keys(XP_MAX).forEach(function(k){ egal(jeu.lire("state." + k + "()"), XP_MAX[k], "chapitre " + c.affiche + " : barème inchangé (" + k + ")"); });
});

/* Le départ direct ouvre bien les annexes dès le début du chapitre (sans rien avoir fait du chapitre). */
CHAPITRES.forEach(function(c){
	var jeu = neuf(c.affiche);
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.id.indexOf('" + c.prefixe + "') === 0 && !a.ouverte(); }).length"), 0, "départ direct au chapitre " + c.affiche + " : les annexes sont ouvertes");
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return /^a[2-5]_/.test(a.id) && a.id.indexOf('" + c.prefixe + "') !== 0 && a.ouverte(); }).length"), 0, "départ direct au chapitre " + c.affiche + " : les annexes des autres chapitres restent fermées");
});

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
