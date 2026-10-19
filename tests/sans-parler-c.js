/**
 * « Et si l'étudiant ne parle jamais à ce personnage ? » : chapitres 7 (Port-Aube) et 8 (le Grand Port), audit C.
 *
 * Pour chaque personnage (ou objet à lire) dont la lecture a un effet sur le chemin principal, on rejoue le chemin
 * principal de docs/solution.md en supprimant toute lecture de ce personnage. Le chemin doit alors soit aboutir, soit
 * afficher en chemin un message qui nomme le personnage et la commande pour lui parler.
 *   - Laurent et l'ordre de mission (Port-Aube) : sans eux, la journée ne commence pas (ni Tempête, ni Marée). Avant la
 *     correction, rien ne le disait, sauf le journal : le plan (chantier), les maîtres et la radio nomment maintenant Laurent.
 *   - Laurent et l'Ordre (le Grand Port) : sans eux, AUCUNE étape des quais ne se validait, en silence. Même correction
 *     (port, galons, les maîtres, la radio).
 *   - les maîtres : leurs sorts et leurs manœuvres ; le message « Tu ne connais pas encore le sort » ou « manœuvre encore
 *     inconnue » nomme le maître et son quai.
 * Puis Shell.ouApprendre, pour tous les sorts du jeu : le maître nommé doit être joignable dans la partie (un départ direct
 * au chapitre 7 ne relie pas le Grand Port, ni Lumen, ni l'Académie, ni le Bastion) ; sinon la phrase dit le chapitre et
 * comment l'ouvrir. Les sorts des chapitres 1 à 3 (Crypte, panne) sont seulement listés : les autres audits les traitent.
 *
 * Lancer : node --max-old-space-size=3000 tests/sans-parler-c.js   (--liste pour la liste des cas)
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
/* L'étudiant pressé ne lit ni la radio, ni l'horloge, ni la carte, ni le bestiaire, ni le traversier. */
function presse(c){ return !/^(cat (Radio|Horloge|Carte|Bestiaire|Traversier)(; )?)+$/.test(c.trim()) && c.trim() !== "galons"; }
var CH6 = [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], CH7 = [62, 63, 64, 65, 66, 67, 68, 69, 70], CH8 = [74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87];
function jouer(jeu, parties){
	var sorties = [];
	parties.forEach(function(p){ partie(p).filter(presse).forEach(function(c){ sorties.push(jeu.jouerSolution(c)); }); });
	return sorties.join("\n");
}
/* Le personnage désigné par l'expression n'est jamais lu : sa lecture n'a aucun effet (ni sort, ni événement). */
function sansLire(jeu, expression){
	jeu.lire("var SANS_LIRE = " + expression + "; (function(){ var avant = Shell.apresLecture; Shell.apresLecture = function(t){ if (SANS_LIRE && t.item === SANS_LIRE) return; return avant.apply(this, arguments); }; })()");
}
/* L'étudiant se décide enfin à lui parler. */
function lireEnfin(jeu){ jeu.lire("SANS_LIRE = null"); }
/* Revenir de toutes les machines (ssh) au monde du jeu. */
function sortirSsh(jeu){ for (var i = 0; i < 10 && jeu.lire("Shell.pile_ssh && Shell.pile_ssh.length"); i++) jeu.taper("exit"); }
function restantes(jeu, liste){ return jeu.lire(liste + ".filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"); }
/* Le message nomme le personnage et dit comment lui parler. */
function nomme(sortie, nom){
	var n = nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp("cat " + n + "\\b|auprès (de |d')" + n + "\\b").test(sortie);
}

/* ================================================================== */
/* 1. Port-Aube en départ direct : chaque personnage à effet, jamais lu */
/* ================================================================== */
var PERSONNAGES_CH7 = [["LaurentPortAube", "Laurent"], ["MissionPortAube", "Mission"]].concat(
	["noms", "phare", "poste", "lettres", "greniers", "halle", "registre", "portes", "forge", "arche"].map(function(k){ return ["MAITRES_ILE." + k + ".item", null]; }));
PERSONNAGES_CH7.forEach(function(p){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	var nom = p[1] || jeu.lire(p[0] + ".itemname");
	sansLire(jeu, p[0]);
	var s = jouer(jeu, CH7), reste = restantes(jeu, "QUETES_CH7");
	if (bavard) console.log("chapitre 7 sans " + nom + " : " + (reste ? "restent " + reste : "le chemin aboutit"));
	verifier(reste === "" || nomme(s, nom), "chapitre 7 sans lire " + nom + " : bloqué (" + reste + ") sans qu'un message nomme " + nom);
});

/* Laurent jamais écouté : le plan, les maîtres et la radio le nomment, et le quai. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	sansLire(jeu, "LaurentPortAube");
	var s = jouer(jeu, [62, 63]);
	contient(s, "Radio : « Grace : beau travail, Architecte. Mais Laurent t'attend", "chapitre 7 sans Laurent : la radio le dit dès la première étape faite");
	var plan = jeu.taper("chantier");
	contient(plan, "Laurent t'attend au bout du quai de Port-Aube", "chapitre 7 sans Laurent : le plan le dit");
	contient(plan, "cat Laurent", "chapitre 7 sans Laurent : le plan donne la commande");
	verifier(plan.indexOf("cat Mission") === -1, "chapitre 7 : l'ordre de mission lu, le plan ne le redemande pas");
	sortirSsh(jeu);
	contient(jeu.taper("cat ~/Cybersup/Embarcadere/PortAube/Poste/Younes"), "Laurent t'attend", "chapitre 7 sans Laurent : un maître le dit");
	// Laurent écouté en retard : la journée commence, rien n'est perdu.
	jouer(jeu, [64, 65]);
	verifier(jeu.lire("!state.ch7.tempete && !state.quests.p7_chantier"), "chapitre 7 sans Laurent : six maisons, mais pas de Tempête");
	sortirSsh(jeu);
	lireEnfin(jeu);
	jeu.taper("cd ~/Cybersup/Embarcadere/PortAube");
	jeu.taper("cat Laurent");
	verifier(jeu.lire("!!state.quests.p7_chantier && !!state.ch7.tempete"), "chapitre 7 : Laurent écouté en retard, la journée commence (la Tempête frappe)");
	verifier(jeu.taper("chantier").indexOf("Laurent t'attend") === -1, "chapitre 7 : Laurent écouté, le plan ne le redemande plus");
})();

/* ================================================================== */
/* 2. Le Grand Port en départ direct : chaque personnage à effet, jamais lu */
/* ================================================================== */
var PERSONNAGES_CH8 = [["LaurentGrandPortCh8", "Laurent"], ["OrdreGrandPortCh8", "Ordre"]].concat(
	["premiers", "capitainerie", "plans", "soutes", "chenaux", "chantier", "registre", "feuille", "vigie", "douane", "escadre"].map(function(k){ return ["MAITRES_PORT." + k + ".item", null]; }));
PERSONNAGES_CH8.forEach(function(p){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 8", "oui");
	var nom = p[1] || jeu.lire(p[0] + ".itemname");
	sansLire(jeu, p[0]);
	var s = jouer(jeu, CH8), reste = restantes(jeu, "QUETES_CH8");
	if (bavard) console.log("chapitre 8 sans " + nom + " : " + (reste ? "restent " + reste.split(" ").length + " étapes" : "le chemin aboutit"));
	verifier(reste === "" || nomme(s, nom), "chapitre 8 sans lire " + nom + " : bloqué (" + reste.split(" ").slice(0, 4).join(" ") + "...) sans qu'un message nomme " + nom);
});

/* Laurent jamais écouté au Grand Port : port, galons, les maîtres et la radio le nomment ; écouté en retard, les quais comptent. */
(function(){
	var stockage = {};
	var jeu = monde.nouveauMonde(stockage);
	jeu.taper("chapitre 8", "oui");
	sansLire(jeu, "LaurentGrandPortCh8");
	var s = jouer(jeu, [74, 75]);
	contient(s, "Radio : « Grace : bien manœuvré, mousse. Mais Laurent t'attend au pied de la grande grue", "chapitre 8 sans Laurent : la radio le dit");
	contient(s, "Kylian fronce les sourcils. « Laurent t'attend", "chapitre 8 sans Laurent : Kylian le dit");
	verifier(jeu.lire("ACTES_CH8[0].etapes.every(function(id){ return !state.quests[id]; })"), "chapitre 8 sans Laurent : aucune étape de l'acte I ne compte");
	contient(jeu.taper("port"), "cat Laurent", "chapitre 8 sans Laurent : le plan du port le dit");
	contient(jeu.taper("galons"), "Laurent t'attend au pied de la grande grue", "chapitre 8 sans Laurent : galons le dit");
	// Une partie sauvegardée ainsi (avant la correction) : au rechargement, le plan du port le dit aussi.
	var repris = monde.nouveauMonde(stockage);
	contient(repris.taper("port"), "Laurent t'attend au pied de la grande grue", "chapitre 8 rechargé sans Laurent : le plan du port le dit");
	// Laurent écouté en retard : les étapes de l'acte I déjà faites comptent.
	sortirSsh(repris);
	repris.taper("cd ~/Cybersup/Embarcadere/GrandPort");
	repris.taper("cat Laurent");
	repris.taper("port");
	verifier(repris.lire("!!state.quests.n8_port"), "chapitre 8 : Laurent écouté en retard, l'étape du plan est faite");
	verifier(repris.lire("ACTES_CH8[0].etapes.filter(function(id){ return !!state.quests[id]; }).length") >= 5, "chapitre 8 : Laurent écouté en retard, les étapes de l'acte I déjà faites comptent (" + repris.lire("ACTES_CH8[0].etapes.filter(function(id){ return !state.quests[id]; }).join(' ')") + " restent)");
	verifier(repris.taper("port").indexOf("Laurent t'attend") === -1, "chapitre 8 : Laurent écouté, le plan ne le redemande plus");
})();

/* ================================================================== */
/* 3. En suite d'histoire (Lumen, puis Port-Aube) et en renfort (aller 7 depuis le Grand Port) */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 6", "oui");
	jouer(jeu, CH6);
	verifier(jeu.lire("state.has('ch7Ouvert')"), "suite : Port-Aube s'ouvre après Lumen");
	sansLire(jeu, "LaurentPortAube");
	var s = jouer(jeu, [62, 63, 64]);
	verifier(!jeu.lire("state.quests.p7_chantier"), "suite sans Laurent : la journée n'a pas commencé");
	contient(s, "Laurent t'attend au bout du quai de Port-Aube", "suite sans Laurent : un message le nomme");
	contient(jeu.jouerSolution("sudo exportfs -v"), "auprès de Noam", "suite : un sort d'une maison pas encore visitée nomme son maître");
})();
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 8", "oui");
	jouer(jeu, [74, 75]);
	contient(jeu.taper("aller 7", "oui"), "EN RENFORT : CHAPITRE 7", "renfort : Port-Aube s'ouvre");
	sansLire(jeu, "LaurentPortAube");
	var s = jouer(jeu, [62, 63]);
	contient(s, "Laurent t'attend au bout du quai de Port-Aube", "renfort sans Laurent : un message le nomme");
})();

/* ================================================================== */
/* 4. Shell.ouApprendre : pour tous les sorts du jeu, un maître joignable, ou le chapitre et comment l'ouvrir */
/* ================================================================== */
var SONDE = "(function(){ var r = Home; while (r.parents && r.parents[0]) r = r.parents[0]; var vus = [r];" +
	"for (var i = 0; i < vus.length; i++) (vus[i].children || []).forEach(function(c){ if (vus.indexOf(c) === -1) vus.push(c); });" +
	"var profs = {}; Object.keys(World.rooms).forEach(function(id){ var l = World.rooms[id]; l.items.forEach(function(it){ it.teaches.forEach(function(s){ (profs[s] = profs[s] || []).push({ nom: it.itemname, lieu: l.room_name, ch: l.chapitre || 1, joignable: vus.indexOf(l) > -1 || !!racineDe(l) }); }); }); });" +
	"return Object.keys(Shell.sorts).filter(function(s){ return SORTS_DU_JEU.indexOf(s) === -1 && !state.knows(s); }).sort().map(function(s){ return { sort: s, profs: profs[s] || [], texte: Shell.ouApprendre(s) }; }); })()";
var signales = {};
function examiner(etiquette, jeu){
	var mauvais = [];
	jeu.lire(SONDE).forEach(function(x){
		var m = /^Il s'apprend (?:ici même, )?(?:auprès de |auprès d'|en lisant )([^,:.]+)/.exec(x.texte);
		if (!m){
			// Les chapitres 1 à 3 (Crypte, panne) et les sorts sans maître : listés pour les autres audits.
			if (!/^Il s'apprend au chapitre \d/.test(x.texte) && !/^Ce n'est pas un sort/.test(x.texte)) signales[x.sort] = (x.profs.map(function(p){ return p.nom + "@" + p.lieu; }).join(", ") || "aucun maître") + " : " + x.texte;
			return;
		}
		var p = x.profs.filter(function(y){ return y.nom === m[1].trim(); })[0];
		if (!p || p.ch < 5) return;   // les chapitres 1 à 3 ont leurs propres phrases (autres audits)
		if (!p.joignable && !/au chapitre \d+ : ce chapitre n'est pas encore ouvert/.test(x.texte)) mauvais.push(x.sort + " (" + x.texte.substring(0, 120) + ")");
	});
	verifier(mauvais.length === 0, etiquette + " : Shell.ouApprendre nomme un maître injoignable sans dire où ni comment : " + mauvais.slice(0, 6).join(" ; ") + (mauvais.length > 6 ? " ... (" + mauvais.length + ")" : ""));
}
(function(){
	var jeu = monde.nouveauMonde({});
	examiner("partie neuve", jeu);
	jeu.taper("chapitre 7", "oui");
	examiner("départ direct au chapitre 7", jeu);
	// Les sorts du chapitre 7 nomment leur maître de Port-Aube ; ceux du chapitre 8, le chapitre 8 et aller 8.
	jeu.lire("ORDRE_DES_SORTS_8").forEach(function(s){
		var t = jeu.lire("Shell.ouApprendre(" + JSON.stringify(s) + ")"), maitre = jeu.lire("(function(){ for (var k in SORTS_DES_MAISONS) if (SORTS_DES_MAISONS[k].indexOf(" + JSON.stringify(s) + ") > -1) return MAITRES_ILE[k].item.itemname; return '?'; })()");
		verifier(nomme(t, maitre), "chapitre 7 : " + s + " nomme son maître " + maitre + " (" + t + ")");
	});
	contient(jeu.taper("docker ps"), "au chapitre 8 : ce chapitre n'est pas encore ouvert dans ta partie (aller 8 l'ouvre en renfort", "chapitre 7 : docker dit le chapitre 8 et aller 8");
	contient(jeu.taper("bzip2 -k x"), "au chapitre 6", "chapitre 7 : un sort d'une annexe de Lumen dit le chapitre 6");
	contient(jeu.jouerSolution("sudo borg list"), "auprès d'Amina", "chapitre 7 : « auprès d'Amina », pas « auprès de Amina »");
})();
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 8", "oui");
	examiner("départ direct au chapitre 8", jeu);
	jeu.lire("ORDRE_DES_SORTS_9").forEach(function(s){
		var t = jeu.lire("Shell.ouApprendre(" + JSON.stringify(s) + ")");
		verifier(/^Il s'apprend (ici même, )?auprès d/.test(t) && !/n'est pas encore ouvert/.test(t), "chapitre 8 : " + s + " nomme un maître du port joignable (" + t + ")");
	});
	// Toutes les manœuvres de docker nomment leur maître et son quai.
	jeu.lire("Object.keys(MANOEUVRES_PORT)").forEach(function(sous){
		var t = jeu.lire("refusManoeuvrePort(" + JSON.stringify(sous) + ").message"), m = jeu.lire("MANOEUVRES_PORT[" + JSON.stringify(sous) + "]");
		verifier(t.indexOf(m) > -1 && /\(cat [A-Za-z]+\)/.test(t), "manœuvre docker " + sous + " : le refus nomme " + m + " (" + t + ")");
		var item = jeu.lire("(function(){ var n = MANOEUVRES_PORT[" + JSON.stringify(sous) + "]; var it = null; Object.keys(World.rooms).forEach(function(id){ World.rooms[id].items.forEach(function(x){ if (x.person && x.itemname === n.replace('é', 'e')) it = x; }); }); return it ? it.itemname : null; })()");
		verifier(!!item && t.indexOf("(cat " + item + ")") > -1, "manœuvre docker " + sous + " : « cat » vise un personnage qui existe (" + t + ")");
	});
})();
if (bavard){
	console.log("\nÀ signaler (chapitres 1 à 6, hors de cet audit) : Shell.ouApprendre ne nomme personne pour :");
	Object.keys(signales).sort().forEach(function(s){ console.log("  " + s + " : " + signales[s]); });
}

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
