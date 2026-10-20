/** Chapitre 3 : le rapport d'incident accepte 3h30, 03h30, 03:30:12 ; un rapport faux dit quelle ligne cloche.   node tests/rapport-ch3.js */
var nouveauMonde = require("./monde.js").nouveauMonde;
var src = require("fs").readFileSync(__dirname + "/chemin-principal-a.js", "utf8");
var CH3 = eval(src.slice(src.indexOf("var CH3 = [") + 10, src.indexOf("];", src.indexOf("var CH3 = [")) + 1));
var echecs = 0; function verifier(c, m){ if (!c){ echecs++; console.log("ÉCHEC : " + m); } }
function partie(){ var j = nouveauMonde({}, 4444); j.taper("chapitre 3", "oui"); CH3.slice(0, CH3.length - 1).forEach(function(c){ j.jouerSolution(c); }); return j; }
function ecrire(j, heure, adresse){
	var v = j.lire("({ a: ADRESSE_POSTE_CORBEAU, h: HEURE_PREMIERE })");
	var h = heure(v.h), a = adresse ? adresse(v.a) : v.a;
	j.editer("function(t){ return t.replace(/(Adresse du poste[^:]*: *).*/, '$1" + a + "').replace(/(Compte caché[^:]*: *).*/, '$1maintenance').replace(/(Port de la porte[^:]*: *).*/, '$16666').replace(/(Heure de la première[^:]*: *).*/, '$1" + h + "'); }");
	return j.taper("vim ~/rapport.txt");
}
var formats = [function(h){ return h; }, function(h){ return +h.split(":")[0] + "h" + h.split(":")[1]; }, function(h){ return h.replace(":", "h"); }, function(h){ return h + ":12"; }, function(h){ return +h.split(":")[0] + ":" + h.split(":")[1]; }];
formats.forEach(function(f, i){
	var j = partie(); ecrire(j, f);
	verifier(j.lire("!!state.quests.c_rapport"), "format d'heure n°" + i + " accepté");
});
var j = partie();
var faux = ecrire(j, function(h){ return "04:59"; }, function(a){ return a + "1"; });
verifier(!j.lire("!!state.quests.c_rapport"), "rapport faux refusé");
verifier(/l'adresse du poste/.test(faux) && /l'heure/.test(faux) && !/le compte caché/.test(faux), "Laurent dit quelles lignes clochent :\n" + faux);
console.log(echecs ? echecs + " échec(s)" : "rapport-ch3 : 0 échec");
process.exit(echecs ? 1 : 0);
