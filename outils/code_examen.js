/**
 * Change le code d'accès de l'épreuve finale.
 *
 *    node outils/code_examen.js NOUVEAU-CODE
 *
 * Le code n'est jamais écrit en clair dans le jeu : seule son empreinte l'est
 * (EMPREINTE_CODE_EXAMEN, dans Web/static/javascript/Examen.js). Ce script la calcule
 * et la remplace. Lancer ensuite python3 outils/version_cache.py avant de publier.
 */
var fs = require("fs");
var path = require("path");
var code = process.argv[2];
if (!code){ console.log("Utilisation : node outils/code_examen.js NOUVEAU-CODE"); process.exit(1); }
var jeu = require(path.join(__dirname, "..", "tests", "monde.js")).nouveauMonde();
var empreinte = jeu.lire("sommeDeControle(" + JSON.stringify(code.trim().toUpperCase() + "|examen|terminus-cybersup") + ")");
var fichier = path.join(__dirname, "..", "Web", "static", "javascript", "Examen.js");
var texte = fs.readFileSync(fichier, "utf8").replace(/var EMPREINTE_CODE_EXAMEN = "[0-9A-F]+";/, 'var EMPREINTE_CODE_EXAMEN = "' + empreinte + '";');
fs.writeFileSync(fichier, texte);
console.log("Nouveau code d'accès : " + code.trim().toUpperCase() + " (empreinte " + empreinte + ", écrite dans Examen.js)");
