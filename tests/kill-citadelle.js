/** Chapitre 3 : le faux kworker se tue depuis n'importe où sur la Citadelle, pas seulement dans la Racine.   node tests/kill-citadelle.js */
var nouveauMonde = require("./monde.js").nouveauMonde;
var src = require("fs").readFileSync(__dirname + "/chemin-principal-a.js", "utf8");
var CH3 = eval(src.slice(src.indexOf("var CH3 = [") + 10, src.indexOf("];", src.indexOf("var CH3 = [")) + 1));
var echecs = 0; function verifier(c, m){ if (!c){ echecs++; console.log("ÉCHEC : " + m); } }
[["cd /"], ["cd /", "cd Crypte"], ["exit", "ssh citadelle"]].forEach(function(deplacement, i){
	var j = nouveauMonde({}, 4444); j.taper("chapitre 3", "oui");
	CH3.slice(0, CH3.indexOf("sudo ss -tlnp")).forEach(function(c){ j.jouerSolution(c); });
	var P = j.lire("MOT_DE_PASSE_SUDO");
	deplacement.forEach(function(c){ j.taper(c); });
	var ss = j.taper("sudo ss -tlnp", P), pid = j.lire("procCorbeau().pid");
	verifier(ss.indexOf("pid=" + pid) > -1, "cas " + i + " : ss montre le faux kworker");
	var k = j.taper("sudo kill -9 " + pid, P);
	verifier(j.lire("!!state.quests.c_ecoute"), "cas " + i + " (" + deplacement.join(", ") + ") : kill -9 hors de la Racine coupe l'écoute :\n" + k);
});
console.log(echecs ? echecs + " échec(s)" : "kill-citadelle : 0 échec");
process.exit(echecs ? 1 : 0);
