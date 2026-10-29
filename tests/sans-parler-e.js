/**
 * « Et si l'étudiant ne parle jamais à ce personnage ? » et « Et s'il s'y prend autrement ? » : chapitre 10 (le Lac Profond), audit E.
 *
 * 1. Pour chaque personnage (ou objet à lire) dont la lecture a un effet sur le chemin principal (Wissam, l'Ordre, les
 *    quinze gardiens), on rejoue le chemin principal de docs/solution.md en supprimant toute lecture de ce personnage.
 *    Le chemin doit alors soit aboutir, soit afficher en chemin un message qui nomme le personnage et la commande pour
 *    lui parler (cat NOM).
 * 2. Les détours d'un étudiant réel, qui ne doivent jamais le bloquer : la crontab écrite à la main dans un fichier, un
 *    dossier cassé que l'on régénère, l'épreuve tentée avant la fin de l'acte, l'indice de chaque étape.
 *
 * Lancer : node --max-old-space-size=3000 tests/sans-parler-e.js   (--liste pour la liste des cas)
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var bavard = process.argv.indexOf("--liste") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }

var DOC = fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8");
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) throw new Error("docs/solution.md : pas de partie " + n);
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}
/* L'étudiant pressé ne lit ni la radio ni la jauge. */
function presse(c){ return !/^(cat (Radio|Jauge)(; )?)+$/.test(c.trim()); }
var CH10 = [107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120];
function jouer(jeu, parties){
	var sorties = [];
	parties.forEach(function(p){ partie(p).filter(presse).forEach(function(c){ sorties.push(jeu.jouerSolution(c)); }); });
	return sorties.join("\n");
}
function sansLire(jeu, expression){
	jeu.lire("var SANS_LIRE = " + expression + "; (function(){ var avant = Shell.apresLecture; Shell.apresLecture = function(t){ if (SANS_LIRE && t.item === SANS_LIRE) return; return avant.apply(this, arguments); }; })()");
}
function restantes(jeu){ return jeu.lire("QUETES_CH10.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"); }
function nomme(sortie, nom){
	var n = nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp("cat " + n + "\\b|auprès (de |d')" + n + "\\b").test(sortie);
}
function neuf(){ var jeu = monde.nouveauMonde({}); jeu.taper("chapitre 10", "oui"); return jeu; }
function jusqua(jeu, a, b){ for (var p = a; p <= b; p++) partie(p).forEach(function(c){ jeu.jouerSolution(c); }); }

/* ================================================================== */
/* 1. Chaque personnage à effet, jamais lu                              */
/* ================================================================== */
(function(){
	var cles = monde.nouveauMonde({}).lire("Object.keys(MAITRES_CH10)");
	var personnages = [["WissamLacCh10", "Wissam"], ["OrdreLacCh10", "Ordre"]].concat(cles.map(function(k){ return ["MAITRES_CH10." + k + ".item", null]; }));
	personnages.forEach(function(p){
		var jeu = neuf();
		var nom = p[1] || jeu.lire(p[0] + ".itemname");
		sansLire(jeu, p[0]);
		var s = jouer(jeu, CH10), reste = restantes(jeu);
		if (bavard) console.log("chapitre 10 sans " + nom + " : " + (reste ? "restent " + reste.split(" ").length + " étapes (" + reste.split(" ").slice(0, 3).join(" ") + "...)" : "le chemin aboutit"));
		verifier(reste === "" || nomme(s, nom), "chapitre 10 sans lire " + nom + " : bloqué (" + reste.split(" ").slice(0, 4).join(" ") + "...) sans qu'un message nomme " + nom);
	});
})();

/* ================================================================== */
/* 2. Les détours d'un étudiant réel                                    */
/* ================================================================== */
(function(){
	// La crontab écrite dans un fichier, puis installée (crontab FICHIER) : la nuit de l'écluse compte.
	var jeu = neuf();
	jusqua(jeu, 107, 112);
	["cd ~/Cybersup/Lac/EcluseDesScripts; cat Zelia", "cd ../BiefDesParalleles; cat Miguel", "cd ../TourDeGarde; cat Badis", "cd ..", "ssh lac",
		"echo '30 2 * * * flock -n /tmp/nuit.lock ~/ecluses/nuit.sh >> ~/ecluses/nuit.log 2>&1' > ~/macrontab", "crontab ~/macrontab",
		"flock -n /tmp/nuit.lock ~/ecluses/nuit.sh"].forEach(function(c){ jeu.jouerSolution(c); });
	verifier(jeu.lire("!!state.quests.n10_cron"), "crontab FICHIER : la nuit de l'écluse est planifiée");
	// Un dossier cassé se régénère, et l'étape se fait ensuite.
	jeu.jouerSolution("rm -rf ~/bief");
	jeu.jouerSolution("exit");
	contient(jeu.taper("regenerer bief"), "bief", "regenerer bief");
	["ssh lac", "cd ~/bief", "mkdir morceaux", "tail -n +2 sondes.csv | split -l 500 - morceaux/sondes_ --additional-suffix=.csv"].forEach(function(c){ jeu.jouerSolution(c); });
	verifier(jeu.lire("!!state.quests.n10_decouper"), "après regenerer bief : n10_decouper");
	jeu.jouerSolution("exit");
	// Chaque étape a son indice, et il n'est jamais vide.
	var vides = jeu.lire("QUETES_CH10.filter(function(q){ return !INDICES_CH10[q.id] || !INDICES_CH10[q.id][0] || !INDICES_CH10[q.id][1]; }).map(function(q){ return q.id; }).join(' ')");
	verifier(vides === "", "chaque étape a ses deux paliers d'indice : " + vides);
	var ind = jeu.taper("indice");
	verifier(String(ind).length > 20, "indice répond");
})();
(function(){
	// L'épreuve de rang I tentée avant la fin de l'acte : rien ne se valide, et le jeu dit pourquoi.
	var jeu = neuf();
	jusqua(jeu, 107, 108);
	var r = jeu.taper("ssh lac") + jeu.taper("ls ~");
	verifier(String(r).indexOf("filet") === -1, "avant la fin de l'acte I, le dossier de l'épreuve n'existe pas");
	jeu.taper("exit");
	contient(jeu.taper("insignes"), "Pêcheur de données", "insignes dit le prochain rang");
})();

console.log("sans-parler-e : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exit(1);
