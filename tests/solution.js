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

var graine = +(process.argv.filter(function(a){ return /^[0-9]+$/.test(a); })[0]) || undefined;
var jeu = nouveauMonde({}, graine);

// Les valeurs propres à la partie sont écrites <entre chevrons> dans la solution :
// on les remplace au moment de jouer, comme le ferait un joueur qui a fait la recherche.
function remplir(commande){
	return commande
		.replace(/<motdepasse>/g, jeu.lire("MOT_DE_PASSE_SUDO"))
		.replace(/<client>/g, jeu.lire("MEILLEUR_CLIENT"))
		.replace(/<adresse>/g, jeu.lire("ADRESSE_ATTAQUANT"))
		.replace(/<sweats>/g, jeu.lire("NB_SWEATS"))
		.replace(/<pid:([a-z_]+)>/g, function(tout, nom){
			return String(jeu.lire("(current_room.procs || []).filter(function(p){ return p.name === " + JSON.stringify(nom) + "; }).map(function(p){ return p.pid; })[0]"));
		});
}

commandes.forEach(function(brute){
	var commande = remplir(brute);
	if (commande === "passwd"){
		// passwd pose deux questions : le nouveau mot de passe, puis sa confirmation.
		jeu.taper(commande, ["Une phrase bien longue 42", "Une phrase bien longue 42"]);
	} else {
		jeu.taper(commande, commande.indexOf("sudo") === 0 ? jeu.lire("MOT_DE_PASSE_SUDO") : undefined);
	}
});

var problemes = [];
if (!jeu.lire("state.has('fin')")) problemes.push("la partie n'atteint pas le Paradis (dernier lieu : " + jeu.lire("current_room.room_name") + ")");
var principales = jeu.lire("QUETES_PRINCIPALES.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
var secondaires = jeu.lire("QUETES_SECONDAIRES.filter(function(q){ return !state.quests[q.id] && !q.secrete; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales) problemes.push("quêtes principales manquantes : " + principales);
if (secondaires) problemes.push("quêtes secondaires manquantes : " + secondaires);
if (jeu.lire("state.xp") !== jeu.lire("state.xpMax()")){
	problemes.push("la solution n'atteint pas le score maximal. Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables().filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
var sorts = jeu.lire("state.knownSpells().length + ' sur ' + ORDRE_DES_SORTS.length");

console.log(commandes.length + " commandes jouées, " + sorts + " sorts appris, " +
	jeu.lire("state.xp + ' XP sur ' + state.xpMax() + ', note ' + state.noteTexte()") + ".");
if (problemes.length){
	console.log("ÉCHEC :\n  " + problemes.join("\n  "));
	process.exit(1);
}
console.log("La solution documentée mène bien au bout du jeu.");
