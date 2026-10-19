/**
 * Audit « et si l'étudiant ne parle jamais à ce personnage ? » (lot b) : les chapitres 4 (l'Académie, numéro 5 dans le code),
 * 5 (le Bastion, 6) et 6 (Lumen, 7), joués par le chemin principal (tests/chemin-principal-b.js), en départ direct.
 *
 * Pour chaque personnage dont la lecture a un effet (un sort enseigné, une étape de l'histoire), on rejoue le chemin
 * principal SANS jamais le lire. Le chapitre doit alors :
 *   - soit aboutir quand même (ses étapes, et le chapitre suivant ouvert) ;
 *   - soit dire, dans ce que voit l'étudiant, vers qui aller (le message nomme le personnage : « auprès de Paul »,
 *     « cat Laurent »...), et se terminer dès qu'il est allé le lire, même tard.
 * Les habitants (quêtes annexes) ne sont jamais lus par le chemin principal : il aboutit sans eux.
 *
 * Le blocage corrigé (ces vérifications échouent sans la correction) :
 *   - Lumen : sans avoir écouté Laurent (ou lu l'ordre de mission), la Longue Nuit ne tombe jamais. L'étudiant rallumait
 *     les seize quartiers, voyait passer 14 h, et le Phare, l'Horloge, Laurent lui-même (« la Longue Nuit n'est pas encore
 *     passée ») le laissaient attendre une Nuit qui ne venait pas, sans lui dire d'aller voir Laurent.
 *
 * Lancer : node --max-old-space-size=3000 tests/sans-parler-b.js        (-v pour tout voir)
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }

/* Le chemin principal, repris de tests/chemin-principal-b.js (le chapitre 4 écrit à la main, les autres dans la solution). */
var TITRES = {};
var SOLUTION = (function(){
	var res = {}, cur = null, bloc = false;
	fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(l){
		var m = /^### (\d+)\. (.*)/.exec(l);
		if (m){ cur = +m[1]; res[cur] = []; TITRES[cur] = m[2]; return; }
		if (/^##+ /.test(l)){ cur = null; return; }
		if (l.indexOf("```") === 0){ bloc = !bloc; return; }
		if (bloc && cur !== null && l.trim() !== "") res[cur].push(l);
	});
	return res;
})();
function parties(a, b){ var r = []; for (var i = a; i <= b; i++) r = r.concat(SOLUTION[i] || []); return r; }
var CH4 = (function(){
	var src = fs.readFileSync(path.join(__dirname, "chemin-principal-b.js"), "utf8");
	var bout = src.substring(src.indexOf("var NETTOYAGE"), src.indexOf("/* Le chapitre 5 : les douze tours"));
	return new Function(bout + "\nreturn CH4;")();
})();

/* Chaque chapitre : le cœur du chemin (maîtres et tours, gardiens et quartiers), sa fin (l'aube, la Nuit, le rapport),
   ses étapes, le lieu suivant qui s'ouvre, le hall, la machine, et les parties de la solution propres à chaque personnage. */
var CHAPITRES = {
	4: { coeur: CH4, fin: [], quetes: "QUETES_CH4", suivant: "ch5Ouvert", interne: 5, parties: [] },
	5: { coeur: parties(33, 45), fin: parties(47, 48), quetes: "QUETES_CH5", suivant: "ch6Ouvert", interne: 6, machine: "bastion", parties: [34, 45], accueil: 33 },
	6: { coeur: parties(49, 57), fin: parties(58, 59), quetes: "QUETES_CH6", suivant: "ch7Ouvert", interne: 7, machine: "lumen", parties: [50, 57], accueil: 49 }
};
/* Les personnages (et objets de l'histoire) dont la lecture a un effet, chapitre par chapitre. */
var LECTURES = {
	4: ["Laurent", "Frances", "AVIS.txt", "Henry", "Alfred", "Lee", "Stephen", "Doug", "Paul", "Andrew", "Brian"],
	5: ["Laurent", "Mission", "Frances", "Fernando", "Butler", "Tatu", "Jean", "Vint", "Evelyn", "Edsger", "Joan", "Robert", "Katherine", "Ralph", "Adele"],
	6: ["Laurent", "Mission", "Seymour", "Kathleen", "Ida", "Gordon", "Niklaus", "Sophie", "Lynn", "Mary", "Betty", "Donald", "Dorothy", "Ruth", "Charles", "John", "Kay", "Klara"]
};

function echappe(t){ return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function estLecture(c, nom){ return new RegExp("^(cat|less|more|head|tail) " + echappe(nom) + "$").test(c); }
function manque(jeu, ch){ return jeu.lire(CHAPITRES[ch].quetes + ".filter(function(x){ return !state.quests[x.id]; }).map(function(x){ return x.id; }).join(' ')"); }
function complet(jeu, ch){ return manque(jeu, ch) === "" && jeu.lire("state.has('" + CHAPITRES[ch].suivant + "')"); }
/* Le lieu où se tient le personnage, dans son chapitre. */
function lieuDe(jeu, nom, interne){
	return jeu.lire("(function(){ var ids = Object.keys(World.rooms); for (var i = 0; i < ids.length; i++){ var r = World.rooms[ids[i]];" +
		" if ((r.chapitre || 1) !== " + interne + ") continue; if (r.getItemFromName(" + JSON.stringify(nom) + ") !== -1) return Shell.cheminAffiche(r); } return null; })()");
}
/* Quitte les machines (ssh) pour revenir à l'école. */
function revenir(jeu){
	// Un programme qui tient encore le terminal (la recopie lancée hors de tmux) : Ctrl-C, comme le ferait l'étudiant.
	jeu.lire("(function(){ var h = machineIci(); if (h && etatMachine(h).premierPlan) Shell.interrompre(); })()");
	var n = 0; while (jeu.lire("Shell.pile_ssh.length") > 0 && n++ < 5) jeu.taper("exit"); }
/* Joue une liste de commandes, sans lire tel personnage ; rend ce qu'ont affiché les commandes (lectures de personnages exclues). */
function jouer(jeu, liste, sauf){
	var vu = [];
	liste.forEach(function(c){
		if (sauf && estLecture(c, sauf)) return;
		var s = jeu.jouerSolution(c);
		if (!/^(cat|less) [A-Z][A-Za-z.]*$/.test(c)) vu.push(s);
	});
	return vu.join("\n");
}
/* La fin du chapitre, depuis le hall : l'aube attendue (Bastion), puis l'aube ou la Nuit, et le rapport. */
function finir(jeu, ch){
	var def = CHAPITRES[ch], vu = [];
	if (ch === 5){
		var n = 0;
		while (!jeu.lire("sCh5().assaut") && n++ < 200) vu.push(jeu.taper("cat Horloge"));
		revenir(jeu);
		jeu.taper("cd " + lieuDe(jeu, "Radio", def.interne));
	}
	if (ch === 6){
		revenir(jeu);
		jeu.taper("cd " + lieuDe(jeu, "Radio", def.interne));
		jeu.taper("ssh lumen");
	}
	vu.push(jouer(jeu, def.fin, null));
	return vu.join("\n");
}
/* Le message nomme le personnage comme quelqu'un à aller voir : « auprès de Paul », « auprès d'Andrew », « cat Laurent », « écoute Laurent ». */
function nommeLePersonnage(texte, nom){
	return new RegExp("(auprès d(e |')|écoute |cat )" + echappe(nom) + "\\b").test(texte);
}
/* Rejoue une partie ; la longue recopie de Klara (tmux), déjà réussie, n'est pas relancée (elle occuperait le terminal). */
function rejouer(jeu, liste){
	for (var i = 0; i < liste.length; i++){
		if (liste[i] === "tmux new -s copie" && jeu.lire("!!state.quests.m6_tmux")) return;
		jeu.jouerSolution(liste[i]);
	}
}
/* Les parties de la solution où travaille ce personnage (son nom dans le titre), sinon l'accueil du hall. */
function partiesDe(ch, nom){
	var def = CHAPITRES[ch], r = [];
	for (var i = def.parties[0]; i <= def.parties[1]; i++) if (new RegExp("\\b" + echappe(nom) + "\\b").test(TITRES[i])) r.push(i);
	return r;
}

/* ================================================================== */
/* 1. Le chemin principal sans lire tel personnage, en départ direct     */
/* ================================================================== */
var TABLE = [];
[4, 5, 6].forEach(function(ch){
	var def = CHAPITRES[ch];
	LECTURES[ch].forEach(function(nom){
		var jeu = monde.nouveauMonde({});
		jeu.taper("chapitre " + ch, "oui");
		var lieu = lieuDe(jeu, nom, def.interne);
		verifier(lieu, "chapitre " + ch + " : " + nom + " se trouve quelque part");
		var vu = jouer(jeu, def.coeur, nom) + "\n" + finir(jeu, ch);
		if (complet(jeu, ch)){ TABLE.push(ch + " " + nom + " : aboutit"); return; }
		var reste = manque(jeu, ch);
		// Ce qui manque doit être dit : par les commandes elles-mêmes, ou par la radio de Grace et le journal de quêtes.
		revenir(jeu);
		var guide = vu + "\n" + jeu.taper("quetes") + "\n" + jeu.taper("cd " + lieuDe(jeu, "Radio", def.interne)) + jeu.taper("cat Radio");
		verifier(nommeLePersonnage(guide, nom), "chapitre " + ch + " sans " + nom + " (" + reste + ") : aucun message ne dit d'aller voir " + nom);
		// L'étudiant y va tard (après tous les autres), refait ce qui avait échoué, et termine le chapitre.
		var jeu2 = monde.nouveauMonde({});
		jeu2.taper("chapitre " + ch, "oui");
		jouer(jeu2, def.coeur, nom);
		revenir(jeu2);
		jeu2.taper("cd " + lieu);
		jeu2.taper("cat " + nom);
		if (ch === 4) jouer(jeu2, CH4, null);
		else {
			var refaire = partiesDe(ch, nom);
			if (!refaire.length) jouer(jeu2, SOLUTION[def.accueil], null);
			else {
				// À Lumen, un quartier en débloque d'autres (l'engrenage de Niklaus ralentit l'Observatoire...) : on refait la suite.
				if (ch === 6) for (var i = refaire[refaire.length - 1] + 1; i <= def.parties[1]; i++) refaire.push(i);
				revenir(jeu2);
				jeu2.taper("ssh " + def.machine);
				refaire.forEach(function(i){ rejouer(jeu2, SOLUTION[i]); });
			}
			finir(jeu2, ch);
		}
		verifier(complet(jeu2, ch), "chapitre " + ch + " : " + nom + " lu tard, le chapitre devrait se terminer (reste : " + manque(jeu2, ch) + ")");
		TABLE.push(ch + " " + nom + " : bloque sans lui (" + reste + "), guidé, rattrapable");
	});
});
if (process.argv.indexOf("--table") > -1) console.log(TABLE.join("\n"));

/* ================================================================== */
/* 2. Lumen sans Laurent : la Longue Nuit attend la mission, et le dit    */
/* ================================================================== */
/* Sans écouter Laurent, l'étudiant ne lit en général pas non plus la radio : ce sont l'Horloge, le Phare et le
   rapport refusé qu'il regarde. Ils doivent lui dire, eux aussi, que la Nuit attend Laurent. */
[["Laurent", "cat Laurent"], ["Mission", "cat Mission"]].forEach(function(x){
	var st = {};
	var jeu = monde.nouveauMonde(st);
	jeu.taper("chapitre 6", "oui");
	var vu = jouer(jeu, CHAPITRES[6].coeur, x[0]) + "\n" + finir(jeu, 6);
	verifier(!jeu.lire("sCh6().nuit"), "Lumen sans " + x[0] + " : la Nuit ne tombe pas (la mission n'est pas donnée)");
	contient(vu, x[1], "Lumen sans " + x[0] + " : Grace le dit d'elle-même, en cours de partie");
	jeu.taper("cd ~/Cybersup/SalleServeurs/Lumen");
	contient(jeu.taper("cat Horloge"), x[1], "Lumen sans " + x[0] + " : l'Horloge dit d'aller voir Laurent");
	contient(jeu.taper("lanterne"), x[1], "Lumen sans " + x[0] + " : le Phare (lanterne) aussi");
	contient(jeu.taper("cat Radio"), x[1], "Lumen sans " + x[0] + " : la radio aussi");
	// Une partie en cours, rechargée (sauvegardée avant la correction) : l'Horloge, le Phare et Laurent guident.
	revenir(jeu);
	jeu.lire("delete state.ch6.nuitAttendDit; state.ch6.rapportAttente = null; state.save()");
	var jeu2 = monde.nouveauMonde(st);
	jeu2.taper("cd ~/Cybersup/SalleServeurs/Lumen");
	contient(jeu2.taper("cat Horloge"), x[1], "Lumen rechargé sans " + x[0] + " : l'Horloge le dit");
	contient(jeu2.taper("lanterne"), x[1], "Lumen rechargé sans " + x[0] + " : le Phare le dit");
	jeu2.lire("sCh6().rapportAttente = null");
	contient(jeu2.taper("cp ~/lumen/rapport.txt BoiteDeLaurent"), "écoutes Laurent", "Lumen rechargé : Laurent refuse le rapport, et dit pourquoi");
	jeu2.taper(x[1]);
	jeu2.taper("lanterne");
	verifier(jeu2.lire("sCh6().nuit"), "Lumen rechargé : " + x[0] + " lu, la Nuit tombe");
	finir(jeu2, 6);
	verifier(complet(jeu2, 6), "Lumen rechargé : le chapitre se termine (reste : " + manque(jeu2, 6) + ")");
});
/* À la suite du Bastion (Lumen est alors sous le hall du Bastion) : le message donne le bon chemin. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 5", "oui");
	jouer(jeu, CHAPITRES[5].coeur, null);
	finir(jeu, 5);
	verifier(complet(jeu, 5), "suite du Bastion : le chapitre 5 se termine");
	jeu.taper("cd Lumen");
	var chemin = jeu.lire("Shell.cheminAffiche(HallLumen)");
	verifier(/Bastion\/Lumen$/.test(chemin), "suite du Bastion : Lumen est sous le hall du Bastion (" + chemin + ")");
	var vu = jouer(jeu, CHAPITRES[6].coeur.filter(function(c){ return c.indexOf("cd ~/Cybersup/SalleServeurs/Academie/Bastion/Lumen") !== 0; }), "Laurent") + "\n" + finir(jeu, 6);
	contient(vu, "cd " + chemin + ", puis cat Laurent", "suite du Bastion, sans Laurent : Grace donne le chemin de la place");
	verifier(!complet(jeu, 6), "suite du Bastion, sans Laurent : la Nuit attend");
	revenir(jeu);
	jeu.taper("cd " + chemin);
	jeu.taper("cat Laurent");
	finir(jeu, 6);
	verifier(complet(jeu, 6), "suite du Bastion : Laurent écouté tard, Lumen se termine (reste : " + manque(jeu, 6) + ")");
})();
/* Le chemin normal n'entend jamais ce message. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 6", "oui");
	var vu = jouer(jeu, CHAPITRES[6].coeur, null) + "\n" + finir(jeu, 6);
	verifier(vu.indexOf("ne tombera qu'une fois la mission reçue") === -1, "Lumen : pas de message d'attente quand Laurent a été écouté");
	verifier(complet(jeu, 6), "Lumen : le chemin principal aboutit");
})();

/* ================================================================== */
/* 3. Les sorts des départs directs                                     */
/* ================================================================== */
/* Le socle d'un départ direct (chapitre N, aller N) couvre tous les sorts que les personnages des chapitres sautés
   enseignent sur le chemin principal (les listes ORDRE_DES_SORTS) ; seuls manquent ceux des habitants (quêtes annexes). */
var SAUTES = { 4: [1, 2, 3], 5: [1, 2, 3, 5], 6: [1, 2, 3, 5, 6] };
function sortsDesSautes(jeu, sautes){
	return jeu.lire("(function(saut){ var listes = [].concat(ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3, ORDRE_DES_SORTS_5, ORDRE_DES_SORTS_6); var out = [];" +
		" Object.keys(World.rooms).forEach(function(k){ var r = World.rooms[k]; if (saut.indexOf(r.chapitre || 1) === -1) return;" +
		" r.items.forEach(function(it){ it.teaches.forEach(function(s){ if (listes.indexOf(s) > -1 && !state.knows(s)) out.push(s + ' (' + it.itemname + ')'); }); }); });" +
		" return out.join(', '); })(" + JSON.stringify(sautes) + ")");
}
[4, 5, 6].forEach(function(n){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre " + n, "oui");
	verifier(sortsDesSautes(jeu, SAUTES[n]) === "", "chapitre " + n + " : sorts des chapitres sautés absents du socle : " + sortsDesSautes(jeu, SAUTES[n]));
	var jeu2 = monde.nouveauMonde({});
	parties(1, 6).forEach(function(c){ jeu2.jouerSolution(c); });
	jeu2.taper("aller " + n, "oui");
	var sautes = SAUTES[n].filter(function(k){ return k !== 1; });
	verifier(sortsDesSautes(jeu2, sautes) === "", "aller " + n + " : sorts des chapitres sautés absents : " + sortsDesSautes(jeu2, sautes));
});

console.log(ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exit(1);
