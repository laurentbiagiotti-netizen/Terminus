/**
 * Le chemin principal seul, chapitres 7 (Port-Aube) et 8 (le Grand Port), comme un étudiant pressé : sans quête annexe,
 * sans défi, sans les lectures facultatives. On y entre par la suite de Lumen (chapitre 6), par un départ direct
 * (chapitre 7, chapitre 8) et en renfort (aller 7 depuis le Grand Port). Puis les blocages trouvés par l'audit C :
 *   - Port-Aube : le verrou de l'Arche laissé par la Tempête (le plan restait rouge après borg break-lock, sans dire pourquoi) ;
 *   - Port-Aube : Zélia et l'indice proposaient chgrp, un sort qui ne s'apprend que dans une quête annexe de Lumen ;
 *   - le Grand Port : un docker image prune -a (ou un rmi) effaçait pour de bon cargaison:1.0, convoi-app:1.0 ou
 *     l'image de l'éclaireur, et l'épreuve de rang (ou la Douane) devenait impossible.
 *
 * Lancer : node tests/chemin-principal-c.js
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }
function absent(texte, mot, m){ verifier(String(texte).indexOf(mot) === -1, m + " : « " + mot + " » ne devrait pas apparaître"); }

var DOC = fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8");
/* Les commandes d'une partie numérotée de la solution. */
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) throw new Error("docs/solution.md : pas de partie " + n);
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}
/* L'étudiant pressé ne lit ni la radio, ni l'horloge, ni la carte, ni le bestiaire, ni le traversier, et ne regarde pas ses galons. */
function presse(c){ return !/^(cat (Radio|Horloge|Carte|Bestiaire|Traversier)(; )?)+$/.test(c.trim()) && c.trim() !== "galons"; }
var CH6 = [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], CH7 = [62, 63, 64, 65, 66, 67, 68, 69, 70], CH8 = [74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87];
/* Joue des parties de la solution ; avant(p, c) peut renvoyer des commandes à glisser avant la ligne c ; renvoie tout ce qui s'est affiché. */
function jouer(jeu, parties, avant){
	var sorties = [];
	parties.forEach(function(p){
		partie(p).filter(presse).forEach(function(c){
			(avant ? avant(p, c) || [] : []).forEach(function(x){ sorties.push(jeu.jouerSolution(x)); });
			sorties.push(jeu.jouerSolution(c));
		});
	});
	return sorties.join("\n");
}
function restantes(jeu, liste){ return jeu.lire(liste + ".filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"); }
function sortsNonAppris(jeu, liste){ return jeu.lire(liste + ".filter(function(s){ return !state.knows(s); }).join(' ')"); }

/* Tout ce que les maîtres (syntaxe, mission) et les indices proposent de taper doit être un sort qu'on a appris en chemin. */
function commandesProposeesNonApprises(jeu, maitres, indices, quetes, dansLaCaisse){
	var textes = jeu.lire("Object.keys(" + maitres + ").map(function(k){ var g = " + maitres + "[k]; return ['syntaxe', 'mission', 'image'].map(function(f){ try { return g[f](); } catch (e){ return ''; } }).join('\\n'); })" +
		".concat(Object.keys(" + indices + ").map(function(k){ return " + indices + "[k].join('\\n'); })).concat(" + quetes + ".map(function(q){ return q.indice; }))");
	var sorts = jeu.lire("Object.keys(Shell.sorts)"), jeuDuJeu = jeu.lire("SORTS_DU_JEU"), manque = [];
	textes.join("\n").split(/[\n;|&()«»"]+|\$\(/).forEach(function(seg){
		var w = seg.trim().replace(/^sudo\s+/, "").split(/\s+/)[0];
		if (!w || manque.indexOf(w) > -1 || sorts.indexOf(w) === -1 || jeuDuJeu.indexOf(w) > -1) return;
		if ((dansLaCaisse || []).indexOf(w) > -1) return;
		if (!jeu.lire("state.knows(" + JSON.stringify(w) + ")")) manque.push(w);
	});
	return manque;
}

/* ================================================================== */
/* 1. De Lumen à Port-Aube, puis au Grand Port : la suite de l'histoire, chemin principal seul */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 6", "oui");
	var s = jouer(jeu, CH6);
	verifier(jeu.lire("!!state.quests.m6_rapport"), "chapitre 6 : le rapport de Lumen contresigné par le chemin principal");
	verifier(jeu.lire("state.has('ch7Ouvert')"), "chapitre 6 fini : Port-Aube s'ouvre");
	s += jouer(jeu, CH7);
	verifier(restantes(jeu, "QUETES_CH7") === "", "chapitre 7 (suite de Lumen) : toutes les étapes, chemin principal seul (restent : " + restantes(jeu, "QUETES_CH7") + ")");
	verifier(sortsNonAppris(jeu, "ORDRE_DES_SORTS_8") === "", "chapitre 7 : tous les sorts du chapitre appris en chemin (manquent : " + sortsNonAppris(jeu, "ORDRE_DES_SORTS_8") + ")");
	verifier(jeu.lire("state.has('ch8Ouvert')"), "chapitre 7 fini : le Grand Port s'ouvre");
	s += jouer(jeu, CH8);
	verifier(restantes(jeu, "QUETES_CH8") === "", "chapitre 8 (suite de Port-Aube) : toutes les étapes (restent : " + restantes(jeu, "QUETES_CH8") + ")");
	verifier(jeu.lire("sCh8().rang") === 5, "chapitre 8 : Amiral par le chemin principal");
	verifier(sortsNonAppris(jeu, "ORDRE_DES_SORTS_9") === "", "chapitre 8 : tous les sorts appris en chemin (manquent : " + sortsNonAppris(jeu, "ORDRE_DES_SORTS_9") + ")");
	absent(s, "Tu ne connais pas encore le sort", "chemin principal 6, 7, 8 : aucun sort inconnu demandé");
	absent(s, "manœuvre encore inconnue", "chemin principal 8 : aucune manœuvre inconnue demandée");
})();

/* ================================================================== */
/* 2. Port-Aube en départ direct, chemin principal seul ; ce que proposent les maîtres s'apprend en chemin */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	var s = jouer(jeu, CH7);
	verifier(restantes(jeu, "QUETES_CH7") === "", "chapitre 7 (départ direct) : toutes les étapes (restent : " + restantes(jeu, "QUETES_CH7") + ")");
	absent(s, "Tu ne connais pas encore le sort", "chapitre 7 (départ direct) : aucun sort inconnu");
	var manque = commandesProposeesNonApprises(jeu, "MAITRES_ILE", "INDICES_CH7", "QUETES_CH7");
	verifier(manque.length === 0, "chapitre 7 : les maîtres et les indices ne proposent que des sorts appris en chemin (pas : " + manque.join(", ") + ")");
	// Zélia (et l'indice) donnaient chgrp, qu'on n'apprend qu'auprès de la Logeuse de Lumen (quête annexe) : chown fait la même chose.
	absent(jeu.taper("cat ~/Cybersup/Embarcadere/PortAube/Halle/Zélia"), "chgrp", "Zélia ne propose plus chgrp");
	absent(jeu.lire("INDICES_CH7.p7_partage.join(' ')"), "chgrp", "l'indice de la Halle ne propose plus chgrp");
	jeu.taper("ssh halle");
	contient(jeu.taper("sudo chgrp promo /srv/promo"), "chown", "chgrp tapé quand même : on apprend ce qui le remplace");
	jeu.taper("exit");
})();

/* ================================================================== */
/* 3. Le Grand Port en départ direct ; image prune -a chez Grégoire, rmi de l'éclaireur à la Douane */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 8", "oui");
	var douane = 0;
	var s = jouer(jeu, CH8, function(p, c){
		// Chez Grégoire, l'étudiant balaie TOUS les plans inutilisés : cargaison:1.0 et convoi-app:1.0 partent avec.
		if (p === 75 && c === "docker image prune -f") return ["docker image prune -a -f"];
		// À la Douane, il « détruit l'ennemi » avant de l'avoir lu.
		if (p === 83 && c === "docker images" && douane++ === 0) return ["docker rmi eclaireur:prise"];
		return null;
	});
	contient(s, "le plan cargaison:1.0 avait été balayé", "la radio dit que le plan de l'épreuve I est revenu");
	contient(s, "le plan convoi-app:1.0 avait été balayé", "la radio dit que le plan de l'épreuve II est revenu");
	contient(s, "l'image de l'éclaireur avait disparu", "la radio dit que la prise de la Douane est revenue");
	verifier(jeu.lire("!!state.quests.n8_rang1 && !!state.quests.n8_rang2"), "après image prune -a : les épreuves I et II se font quand même");
	verifier(jeu.lire("!!state.quests.n8_quarantaine && !!state.quests.n8_autopsie"), "après rmi eclaireur:prise : la Douane se fait quand même");
	verifier(restantes(jeu, "QUETES_CH8") === "", "chapitre 8 (départ direct, plans balayés) : toutes les étapes (restent : " + restantes(jeu, "QUETES_CH8") + ")");
	verifier(jeu.lire("sCh8().rang") === 5, "chapitre 8 : Amiral malgré les plans balayés");
	var manque = commandesProposeesNonApprises(jeu, "MAITRES_PORT", "INDICES_CH8", "QUETES_CH8", ["printenv"]);   // printenv, au Grand Port, se lance dans une caisse
	verifier(manque.length === 0, "chapitre 8 : les maîtres et les indices ne proposent que des sorts appris en chemin (pas : " + manque.join(", ") + ")");
})();

/* Une partie déjà en cours, sauvegardée sans cargaison:1.0 ni convoi-app:1.0 (avant la correction) : au rechargement, ils reviennent. */
(function(){
	var stockage = {};
	var jeu = monde.nouveauMonde(stockage);
	jeu.taper("chapitre 8", "oui");
	jeu.lire("reposerPlansAnciensCh8 = function(){}");   // le jeu d'avant la correction
	jouer(jeu, [74, 75], function(p, c){ return p === 75 && c === "docker image prune -f" ? ["docker image prune -a -f"] : null; });
	verifier(jeu.lire("!imagePort('docks', 'cargaison:1.0') && !imagePort('docks', 'convoi-app:1.0')"), "avant la correction : les deux plans sont perdus");
	jeu.taper("port");
	var repris = monde.nouveauMonde(stockage);
	repris.taper("port");
	verifier(repris.lire("!!imagePort('docks', 'cargaison:1.0') && !!imagePort('docks', 'convoi-app:1.0')"), "rechargée : les deux plans sont de retour sur docks");
	verifier(repris.lire("!!conteneurPort('docks', 'cargaison')"), "rechargée : la caisse de l'épreuve I est de nouveau là");
	jouer(repris, [76]);
	verifier(repris.lire("!!state.quests.n8_rang1 && sCh8().rang >= 1"), "rechargée : l'épreuve I se fait, Matelot");
})();

/* ================================================================== */
/* 4. En renfort : du Grand Port à Port-Aube (aller 7), puis retour (aller 8) */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 8", "oui");
	jouer(jeu, [74, 75, 76]);
	contient(jeu.taper("aller 7", "oui"), "EN RENFORT : CHAPITRE 7", "aller 7 : Port-Aube s'ouvre en renfort");
	jouer(jeu, CH7);
	verifier(restantes(jeu, "QUETES_CH7") === "", "chapitre 7 en renfort : toutes les étapes (restent : " + restantes(jeu, "QUETES_CH7") + ")");
	var s = jeu.taper("aller 8");
	contient(s, "Soutes", "aller 8 : retour au Grand Port, à l'étape où on l'avait laissé");
	verifier(jeu.lire("state.queteEnCours().id") === "n8_volume", "aller 8 : l'étape en cours est celle du Grand Port");
})();

/* ================================================================== */
/* 5. La Tempête frappe l'Arche : le verrou levé, le plan dit ce qu'il reste (une sauvegarde neuve) */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	var arche = partie(67), i = arche.indexOf("exit; cd ../Arche; cat Amina; ssh greniers");
	verifier(i > -1, "docs/solution.md : la partie de l'Arche se trouve");
	jouer(jeu, [62, 63, 64]);
	arche.slice(i).forEach(function(c){ jeu.jouerSolution(c); });
	verifier(jeu.lire("maisonBatieCh7('arche') && !state.ch7.tempete"), "l'Arche bâtie en cinquième maison, la Tempête pas encore là");
	jouer(jeu, [65]);
	verifier(jeu.lire("!!state.ch7.tempete && !!state.ch7.incidentsTempete.arche"), "six maisons : la Tempête frappe aussi l'Arche");
	var depot = "--rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers";
	jeu.jouerSolution("exit");
	jeu.jouerSolution("ssh greniers");
	contient(jeu.jouerSolution("sudo borg check " + depot), "break-lock", "borg check dit le verrou et comment le lever");
	jeu.jouerSolution("sudo borg break-lock " + depot);
	verifier(jeu.lire("!INCIDENTS_TEMPETE_CH7.arche.reparee()"), "le verrou levé, sans sauvegarde neuve : l'incident reste ouvert");
	jeu.jouerSolution("exit");
	var plan = jeu.taper("chantier");
	contient(plan, "aucune sauvegarde n'a tourné depuis la Tempête", "chantier dit ce qu'il reste à faire à l'Arche");
	contient(plan, "systemctl start sauvegarde-borg", "chantier donne la commande de la sauvegarde neuve");
	contient(jeu.taper("cat ~/Cybersup/Embarcadere/PortAube/Arche/Amina"), "aucune sauvegarde n'a tourné depuis la Tempête", "Amina dit ce qu'il reste à faire");
	jeu.jouerSolution("ssh greniers");
	jeu.jouerSolution("sudo systemctl start sauvegarde-borg");
	verifier(jeu.lire("INCIDENTS_TEMPETE_CH7.arche.reparee()"), "une sauvegarde neuve : l'Arche a tenu la Tempête");
	jeu.jouerSolution("exit");
	absent(jeu.taper("chantier"), "aucune sauvegarde n'a tourné", "réparée : le plan ne dit plus rien de l'Arche");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
