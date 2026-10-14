/**
 * Change le mot de passe du formateur (celui qui scelle les copies, sceller, et contrôle les sceaux, verifier).
 *
 *    node outils/mot_de_passe_formateur.js "MOT DE PASSE"
 *
 * Seule une empreinte lente est écrite dans le jeu (EMPREINTE_FORMATEUR, Examen.js). Choisis un mot de passe long :
 * le dépôt est public, et une empreinte courte se devine. Ne le note pas dans le dépôt.
 * Changer le mot de passe invalide les sceaux déjà posés : garde le même pendant toute une session d'examen.
 */
var fs = require("fs");
var path = require("path");
var mdp = process.argv[2];
if (!mdp || mdp.length < 12){ console.log("Utilisation : node outils/mot_de_passe_formateur.js \"MOT DE PASSE\" (12 caractères au moins)"); process.exit(1); }
var jeu = require(path.join(__dirname, "..", "tests", "monde.js")).nouveauMonde();
var empreinte = jeu.lire("empreinteLente(" + JSON.stringify("formateur|" + mdp) + ")");
var fichier = path.join(__dirname, "..", "Web", "static", "javascript", "Examen.js");
var texte = fs.readFileSync(fichier, "utf8").replace(/var EMPREINTE_FORMATEUR = "[^"]*";/, 'var EMPREINTE_FORMATEUR = "' + empreinte + '";');
fs.writeFileSync(fichier, texte);
console.log("Nouveau mot de passe du formateur enregistré (empreinte écrite dans Examen.js).");
