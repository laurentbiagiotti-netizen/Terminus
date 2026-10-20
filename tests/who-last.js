/** Chapitre 3 : une fois le Corbeau chassé du labo, who renvoie vers last, qui garde son adresse.   node tests/who-last.js */
var nouveauMonde = require("./monde.js").nouveauMonde;
var src = require("fs").readFileSync(__dirname + "/chemin-principal-a.js", "utf8");
var CH3 = eval(src.slice(src.indexOf("var CH3 = [") + 10, src.indexOf("];", src.indexOf("var CH3 = [")) + 1));
var j = nouveauMonde({}, 4444); j.taper("chapitre 3", "oui");
CH3.slice(0, CH3.indexOf("sudo pkill -u corbeau") + 1).forEach(function(c){ j.jouerSolution(c); });
var w = j.taper("who"), l = j.taper("last");
var ok1 = /last montre aussi les sessions passées/.test(w), ok2 = l.indexOf(j.lire("ADRESSE_POSTE_CORBEAU")) > -1;
console.log(w + "\n---\n" + l.split("\n").slice(0,3).join("\n"));
console.log(ok1 && ok2 ? "who-last : 0 échec" : "ÉCHEC who/last " + ok1 + " " + ok2); process.exit(ok1 && ok2 ? 0 : 1);
