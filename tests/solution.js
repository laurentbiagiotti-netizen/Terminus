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
// jouerSolution les remplace au moment de jouer, comme le ferait un joueur qui a fait la recherche.
commandes.forEach(function(commande){ jeu.jouerSolution(commande); });

var problemes = [];
if (!jeu.lire("state.has('fin')")) problemes.push("la partie n'atteint pas le Paradis (dernier lieu : " + jeu.lire("current_room.room_name") + ")");
var principales = jeu.lire("QUETES_PRINCIPALES.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
var secondaires = jeu.lire("QUETES_SECONDAIRES.filter(function(q){ return !state.quests[q.id] && !q.secrete; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales) problemes.push("quêtes principales manquantes : " + principales);
if (secondaires) problemes.push("quêtes secondaires manquantes : " + secondaires);
// La panne (chapitre 2 pour le joueur, numéro 3 dans le code).
if (!jeu.lire("state.quests.r_fin")) problemes.push("le chapitre 2 (la panne) n'est pas terminé");
var principales3 = jeu.lire("QUETES_PANNE.concat(QUETES_SECONDAIRES_PANNE).filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales3) problemes.push("quêtes du chapitre 2 (la panne) manquantes : " + principales3);
if (jeu.lire("state.xp3") !== jeu.lire("state.xpMax3()")){
	problemes.push("le chapitre 2 (la panne) n'atteint pas le score maximal : " + jeu.lire("state.xp3") + " sur " + jeu.lire("state.xpMax3()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_3.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(3).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
// La Crypte (chapitre 3 pour le joueur, numéro 2 dans le code).
if (!jeu.lire("state.quests.c_corbeau")) problemes.push("le chapitre 3 (la Crypte) n'est pas terminé (dernier lieu : " + jeu.lire("current_room.room_name") + ")");
var principales2 = jeu.lire("QUETES_CHAPITRE2.concat(QUETES_SECONDAIRES_2).filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales2) problemes.push("quêtes du chapitre 3 (la Crypte) manquantes : " + principales2);
if (jeu.lire("state.xp2") !== jeu.lire("state.xpMax2()")){
	problemes.push("le chapitre 3 (la Crypte) n'atteint pas le score maximal : " + jeu.lire("state.xp2") + " sur " + jeu.lire("state.xpMax2()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_2.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(2).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
// Le chapitre 4 (l'Académie des Arcanes, numéro 5 dans le code) : la solution doit mener à la victoire.
if (!jeu.lire("state.quests.d_fin")) problemes.push("le chapitre 4 (l'Académie) n'atteint pas la victoire (d_fin) ; dernier lieu : " + jeu.lire("current_room.room_name"));
var principales5 = jeu.lire("QUETES_CH4.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales5) problemes.push("étapes du chapitre 4 manquantes : " + principales5);
if (jeu.lire("state.xp5 > state.xpMax5()")) problemes.push("le chapitre 4 dépasse son barème : " + jeu.lire("state.xp5") + " sur " + jeu.lire("state.xpMax5()"));
if (jeu.lire("state.xp") !== jeu.lire("state.xpMax()")){
	problemes.push("la solution n'atteint pas le score maximal. Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables().filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
var sorts = jeu.lire("state.knownSpells().length + ' sur ' + tousLesSorts().length");

console.log(commandes.length + " commandes jouées, " + sorts + " sorts appris, " +
	jeu.lire("state.xp + ' XP sur ' + state.xpMax() + ', note ' + state.noteTexte() + ' ; chapitre 2 : ' + state.xp3 + ' XP sur ' + state.xpMax3() + ', note ' + state.noteTexte(3) + ' ; chapitre 3 : ' + state.xp2 + ' XP sur ' + state.xpMax2() + ', note ' + state.noteTexte(2)") + ".");
if (problemes.length){
	console.log("ÉCHEC :\n  " + problemes.join("\n  "));
	process.exit(1);
}
console.log("La solution documentée mène bien au bout du jeu.");
