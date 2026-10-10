/**
 * Vérifie que docs/solution.md dit vrai : joue, dans l'ordre, toutes les
 * commandes de ses blocs de code, puis contrôle que la partie est terminée
 * à 100 %.   node tests/solution.js
 */
var fs = require("fs");
var path = require("path");
var nouveauMonde = require("./monde.js").nouveauMonde;

var texte = fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8");
var commandes = [];
var dansBloc = false;
texte.split("\n").forEach(function(ligne){
	if (ligne.indexOf("```") === 0){ dansBloc = !dansBloc; return; }
	if (dansBloc && ligne.trim() !== "") commandes.push(ligne);
});

var jeu = nouveauMonde({});
commandes.forEach(function(commande){
	jeu.taper(commande, commande.indexOf("sudo") === 0 ? "P1ngouin" : undefined);
});

var problemes = [];
if (jeu.lire("current_room.room_name") !== "Paradis") problemes.push("la partie ne finit pas au Paradis mais dans " + jeu.lire("current_room.room_name"));
var principales = jeu.lire("QUETES_PRINCIPALES.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
var secondaires = jeu.lire("QUETES_SECONDAIRES.filter(function(q){ return !state.quests[q.id] && !q.secrete; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales) problemes.push("quêtes principales manquantes : " + principales);
if (secondaires) problemes.push("quêtes secondaires manquantes : " + secondaires);
var sorts = jeu.lire("state.knownSpells().length + ' sur ' + ORDRE_DES_SORTS.length");

console.log(commandes.length + " commandes jouées, " + sorts + " sorts appris.");
if (problemes.length){
	console.log("ÉCHEC :\n  " + problemes.join("\n  "));
	process.exit(1);
}
console.log("La solution documentée mène bien au bout du jeu.");
