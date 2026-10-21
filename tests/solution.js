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
var secondaires5 = jeu.lire("QUETES_SECONDAIRES_CH4.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (secondaires5) problemes.push("défis du chapitre 4 (l'Académie) manquants : " + secondaires5);
if (jeu.lire("QUETES_SECONDAIRES_CH4.length") !== 50) problemes.push("le chapitre 4 devrait compter 50 défis, il en a " + jeu.lire("QUETES_SECONDAIRES_CH4.length"));
if (!jeu.lire("state.has('platine_ch4')")) problemes.push("le badge platine du chapitre 4 n'est pas gagné");
if (jeu.lire("state.xp5") !== jeu.lire("state.xpMax5()")){
	problemes.push("le chapitre 4 (l'Académie) n'atteint pas le score maximal : " + jeu.lire("state.xp5") + " sur " + jeu.lire("state.xpMax5()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_5.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(5).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
if (jeu.lire("state.noteTexte(5)") !== "20 / 20") problemes.push("le chapitre 4 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(5)"));
// Le chapitre 5 (le Bastion, numéro 6 dans le code) : la solution doit mener au rapport contresigné, à 20 sur 20.
if (!jeu.lire("state.quests.h_rapport")) problemes.push("le chapitre 5 (le Bastion) n'atteint pas le rapport contresigné (h_rapport) ; dernier lieu : " + jeu.lire("current_room.room_name"));
var principales6 = jeu.lire("QUETES_CH5.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales6) problemes.push("étapes du chapitre 5 manquantes : " + principales6);
var secondaires6 = jeu.lire("QUETES_SECONDAIRES_CH5.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (secondaires6) problemes.push("défis du chapitre 5 (le Bastion) manquants : " + secondaires6);
if (jeu.lire("QUETES_CH5.length") !== 29) problemes.push("le chapitre 5 devrait compter 29 étapes, il en a " + jeu.lire("QUETES_CH5.length"));
if (!jeu.lire("state.has('platine_ch5')")) problemes.push("le badge platine du chapitre 5 n'est pas gagné");
if (jeu.lire("state.xp6") !== jeu.lire("state.xpMax6()")){
	problemes.push("le chapitre 5 (le Bastion) n'atteint pas le score maximal : " + jeu.lire("state.xp6") + " sur " + jeu.lire("state.xpMax6()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_6.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(6).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
if (jeu.lire("state.noteTexte(6)") !== "20 / 20") problemes.push("le chapitre 5 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(6)"));
// Le chapitre 6 (Lumen, numéro 7 dans le code) : la solution doit mener au rapport contresigné, à 20 sur 20, puis aux six quêtes annexes (les annexes des chapitres 2 à 5 sont jouées à la fin de leur chapitre).
if (!jeu.lire("state.quests.m6_rapport")) problemes.push("le chapitre 6 (Lumen) n'atteint pas le rapport contresigné (m6_rapport) ; dernier lieu : " + jeu.lire("current_room.room_name"));
var principales7 = jeu.lire("QUETES_CH6.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales7) problemes.push("étapes du chapitre 6 manquantes : " + principales7);
var secondaires7 = jeu.lire("QUETES_SECONDAIRES_CH6.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (secondaires7) problemes.push("défis du chapitre 6 (Lumen) manquants : " + secondaires7);
if (jeu.lire("QUETES_CH6.length") !== 37) problemes.push("le chapitre 6 devrait compter 37 étapes, il en a " + jeu.lire("QUETES_CH6.length"));
if (jeu.lire("QUETES_SECONDAIRES_CH6.length") !== 82) problemes.push("le chapitre 6 devrait compter 82 défis, il en a " + jeu.lire("QUETES_SECONDAIRES_CH6.length"));
if (!jeu.lire("state.has('platine_ch6')")) problemes.push("le badge platine du chapitre 6 n'est pas gagné");
if (jeu.lire("state.xp7") !== jeu.lire("state.xpMax7()")){
	problemes.push("le chapitre 6 (Lumen) n'atteint pas le score maximal : " + jeu.lire("state.xp7") + " sur " + jeu.lire("state.xpMax7()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_7.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(7).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
if (jeu.lire("state.noteTexte(7)") !== "20 / 20") problemes.push("le chapitre 6 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(7)"));
// Le chapitre 7 (Port-Aube, numéro 8 dans le code) : la solution doit mener au rapport contresigné, à 20 sur 20, au cliffhanger, puis aux six quêtes annexes.
if (!jeu.lire("state.quests.p7_rapport")) problemes.push("le chapitre 7 (Port-Aube) n'atteint pas le rapport contresigné (p7_rapport) ; dernier lieu : " + jeu.lire("current_room.room_name"));
if (!jeu.lire("state.has('victoireCh7')")) problemes.push("le chapitre 7 : pas de victoire (victoireCh7)");
var principales8 = jeu.lire("QUETES_CH7.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (principales8) problemes.push("étapes du chapitre 7 manquantes : " + principales8);
var secondaires8 = jeu.lire("QUETES_SECONDAIRES_CH7.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.titre; }).join(' ; ')");
if (secondaires8) problemes.push("défis du chapitre 7 (Port-Aube) manquants : " + secondaires8);
if (jeu.lire("QUETES_CH7.length") !== 27) problemes.push("le chapitre 7 devrait compter 27 étapes, il en a " + jeu.lire("QUETES_CH7.length"));
if (jeu.lire("QUETES_SECONDAIRES_CH7.length") !== 53) problemes.push("le chapitre 7 devrait compter 53 défis, il en a " + jeu.lire("QUETES_SECONDAIRES_CH7.length"));
if (!jeu.lire("state.has('platine_ch7')")) problemes.push("le badge platine du chapitre 7 n'est pas gagné");
if (jeu.lire("state.xp8") !== jeu.lire("state.xpMax8()")){
	problemes.push("le chapitre 7 (Port-Aube) n'atteint pas le score maximal : " + jeu.lire("state.xp8") + " sur " + jeu.lire("state.xpMax8()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_8.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(8).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
if (jeu.lire("state.noteTexte(8)") !== "20 / 20") problemes.push("le chapitre 7 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(8)"));
if (!jeu.lire("state.ch7 && state.ch7.premierPas === 'aron'")) problemes.push("le chapitre 7 : le premier étudiant n'est pas Aron");
// Le chapitre 8 (le Grand Port, numéro 9 dans le code) : la solution doit mener au rapport de bataille contresigné, à 20 sur 20, Amiral, au cliffhanger, puis aux six quêtes annexes.
if (!jeu.lire("state.quests.n8_rapport")) problemes.push("le chapitre 8 (le Grand Port) n'atteint pas le rapport de bataille (n8_rapport) ; dernier lieu : " + jeu.lire("current_room.room_name"));
if (!jeu.lire("state.has('victoireCh8')")) problemes.push("le chapitre 8 : pas de victoire (victoireCh8)");
var principales9 = jeu.lire("QUETES_CH8.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
if (principales9) problemes.push("étapes du chapitre 8 manquantes : " + principales9);
var secondaires9 = jeu.lire("QUETES_SECONDAIRES_CH8.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
if (secondaires9) problemes.push("défis du chapitre 8 (le Grand Port) manquants : " + secondaires9);
if (jeu.lire("QUETES_CH8.length") !== 44) problemes.push("le chapitre 8 devrait compter 44 étapes, il en a " + jeu.lire("QUETES_CH8.length"));
if (jeu.lire("QUETES_SECONDAIRES_CH8.length") !== 89) problemes.push("le chapitre 8 devrait compter 89 défis, il en a " + jeu.lire("QUETES_SECONDAIRES_CH8.length"));
if (!jeu.lire("state.has('platine_ch8')")) problemes.push("le badge platine du chapitre 8 n'est pas gagné");
if (jeu.lire("state.xp9") !== jeu.lire("state.xpMax9()")){
	problemes.push("le chapitre 8 (le Grand Port) n'atteint pas le score maximal : " + jeu.lire("state.xp9") + " sur " + jeu.lire("state.xpMax9()") + ". Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS_9.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables(9).filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
if (jeu.lire("state.noteTexte(9)") !== "20 / 20") problemes.push("le chapitre 8 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(9)"));
if (jeu.lire("sCh8().rang") !== 5) problemes.push("le chapitre 8 : le joueur n'est pas Amiral (rang " + jeu.lire("sCh8().rang") + ")");
// Le chapitre 9 (la Chronothèque, numéro 10 dans le code) : enchaîné après le Grand Port, il doit mener au rapport contresigné, à 20 sur 20, Chronomancien.
if (!jeu.lire("state.quests.n9_rapport")) problemes.push("le chapitre 9 (la Chronothèque) n'atteint pas le rapport contresigné (n9_rapport) ; dernier lieu : " + jeu.lire("current_room.room_name"));
if (!jeu.lire("state.has('victoireCh9')")) problemes.push("le chapitre 9 : pas de victoire (victoireCh9)");
var manque10 = jeu.lire("QUETES_CH9.concat(QUETES_SECONDAIRES_CH9).filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
if (manque10) problemes.push("étapes ou défis du chapitre 9 manquants : " + manque10);
if (!jeu.lire("state.has('platine_ch9')")) problemes.push("le badge platine du chapitre 9 n'est pas gagné");
if (jeu.lire("state.xp10") !== jeu.lire("state.xpMax10()")) problemes.push("le chapitre 9 n'atteint pas le score maximal : " + jeu.lire("state.xp10") + " sur " + jeu.lire("state.xpMax10()"));
if (jeu.lire("state.noteTexte(10)") !== "20 / 20") problemes.push("le chapitre 9 n'a pas 20 sur 20 : " + jeu.lire("state.noteTexte(10)"));
if (jeu.lire("rangCh9()") !== 5) problemes.push("le chapitre 9 : le joueur n'est pas Chronomancien (rang " + jeu.lire("rangCh9()") + ")");
var annexes = jeu.lire("QUETES_ANNEXES.filter(function(a){ return !state.quests[a.id]; }).map(function(a){ return a.id; }).join(' ')");
if (annexes) problemes.push("quêtes annexes manquantes : " + annexes);
[["ami_ch2", "Ami du campus"], ["ami_ch3", "Ami de la Crypte"], ["ami_ch4", "Ami de l'Académie"], ["ami_ch5", "Ami du Bastion"], ["ami_ch6", "Ami de Lumen"], ["ami_ch7", "Ami de Port-Aube"], ["ami_ch8", "Ami du Grand Port"], ["ami_ch9", "Ami de la Chronothèque"]].forEach(function(b){
	if (!jeu.lire("state.has('" + b[0] + "')")) problemes.push("le badge " + b[1] + " n'est pas gagné");
});
if (jeu.lire("QUETES_ANNEXES.length") !== 48) problemes.push("il devrait y avoir 48 quêtes annexes, il y en a " + jeu.lire("QUETES_ANNEXES.length"));
if (jeu.lire("state.xp") !== jeu.lire("state.xpMax()")){
	problemes.push("la solution n'atteint pas le score maximal. Sorts jamais lancés : [" +
		jeu.lire("ORDRE_DES_SORTS.filter(function(x){ return !state.usages[x]; }).join(', ')") + "] ; lieux jamais visités : [" +
		jeu.lire("lieuxVisitables().filter(function(l){ return !state.visited[l.id]; }).map(function(l){ return l.room_name; }).join(', ')") + "]");
}
var sorts = jeu.lire("state.knownSpells().length + ' sur ' + tousLesSorts().length");

console.log(commandes.length + " commandes jouées, " + sorts + " sorts appris, " +
	jeu.lire("state.xp + ' XP sur ' + state.xpMax() + ', note ' + state.noteTexte() + ' ; chapitre 2 : ' + state.xp3 + ' XP sur ' + state.xpMax3() + ', note ' + state.noteTexte(3) + ' ; chapitre 3 : ' + state.xp2 + ' XP sur ' + state.xpMax2() + ', note ' + state.noteTexte(2) + ' ; chapitre 4 : ' + state.xp5 + ' XP sur ' + state.xpMax5() + ', note ' + state.noteTexte(5) + ' ; chapitre 5 : ' + state.xp6 + ' XP sur ' + state.xpMax6() + ', note ' + state.noteTexte(6) + ' ; chapitre 6 : ' + state.xp7 + ' XP sur ' + state.xpMax7() + ', note ' + state.noteTexte(7) + ' ; chapitre 7 : ' + state.xp8 + ' XP sur ' + state.xpMax8() + ', note ' + state.noteTexte(8) + ' ; chapitre 8 : ' + state.xp9 + ' XP sur ' + state.xpMax9() + ', note ' + state.noteTexte(9)") + ".");
if (problemes.length){
	console.log("ÉCHEC :\n  " + problemes.join("\n  "));
	process.exit(1);
}
console.log("La solution documentée mène bien au bout du jeu.");
