/**
 * Change le code d'accès de l'épreuve finale.
 *
 *    node outils/code_examen.js NOUVEAU-CODE
 *
 * Le code n'est jamais écrit en clair dans le jeu : seule son empreinte lente l'est
 * (EMPREINTE_CODE_EXAMEN, dans Web/static/javascript/Examen.js). Ce script la calcule et la remplace.
 * Ne note pas le code dans le dépôt : il est public. Lancer ensuite python3 outils/version_cache.py avant de publier.
 */
var fs = require("fs");
var path = require("path");
var code = process.argv[2];
if (!code){ console.log("Utilisation : node outils/code_examen.js NOUVEAU-CODE"); process.exit(1); }
var jeu = require(path.join(__dirname, "..", "tests", "monde.js")).nouveauMonde();
var empreinte = jeu.lire("empreinteLente(" + JSON.stringify("examen|" + code.trim().toUpperCase()) + ")");
var fichier = path.join(__dirname, "..", "Web", "static", "javascript", "Examen.js");
var texte = fs.readFileSync(fichier, "utf8").replace(/var EMPREINTE_CODE_EXAMEN = "[^"]*";/, 'var EMPREINTE_CODE_EXAMEN = "' + empreinte + '";');
fs.writeFileSync(fichier, texte);
console.log("Nouveau code d'accès : " + code.trim().toUpperCase() + " (empreinte écrite dans Examen.js)");
