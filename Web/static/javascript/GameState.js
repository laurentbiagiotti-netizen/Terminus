/*
 * GameState : tout ce qui decrit l'avancement du joueur.
 *
 *  - flags  : les evenements de l'histoire deja arrives (voir applyState)
 *  - spells : les sorts appris
 *  - quests : les quetes accomplies ; seen : les quetes secondaires decouvertes
 *
 * La partie est sauvegardee dans le navigateur apres chaque ligne tapee : on
 * enregistre une photo complete du monde (qui est ou, avec quels droits), ce
 * qui evite de devoir rejouer les evenements au rechargement.
 *
 * Evenements de l'histoire :
 * mvBoulder -- le Rocher a quitte la SalleHumide : le .Tunnel est relie
 * ouvrirPortail -- le Portail a recu le droit x
 * pullLever -- la Bibliotheque et l'ArriereSalle sont reliees
 * rmLargeBoulder -- le GrosRocher a disparu : la Ferme est reliee
 * touchGear / FiveGearsCopied -- les rouages de l'Artisane
 * CornCopied -- le mais du Fermier
 * touchPlank -- la Planche est posee : la Clairiere est accessible
 * HouseMade -- la Chaumiere est batie
 * rmBrambles -- les Ronces ont disparu : la CaverneDesTrolls est reliee
 * openSlide -- le TrollMoche n'est plus devant le Toboggan
 * sudoOK -- le mot de passe sudo a ete saisi
 * certificatLu -- la Citadelle est reliee
 * demonsMorts, nomLu, victoire, fin -- le combat final
 */

var CLE_SAUVEGARDE = "terminus-cybersup";
var VERSION_SAUVEGARDE = 2;

/* Barème de l'expérience. */
var XP_SORT_APPRIS = 10;      // apprendre un sort
var XP_PREMIER_USAGE = 5;     // s'en servir pour la première fois
var XP_NOUVEAU_LIEU = 5;      // entrer dans un lieu pour la première fois
var XP_QUETE = 100;           // une étape de la quête principale
var XP_VICTOIRE = 300;        // vaincre le Sorcier Noir
var XP_QUETE_SECONDAIRE = 50; // une quête secondaire

/* Les niveaux : la part de l'expérience totale qu'il faut avoir atteinte. */
var NIVEAUX = [
	{ part: 0,    titre: "Touriste du terminal" },
	{ part: 0.02, titre: "Novice" },
	{ part: 0.06, titre: "Apprenti" },
	{ part: 0.12, titre: "Initié" },
	{ part: 0.20, titre: "Adepte" },
	{ part: 0.30, titre: "Mage" },
	{ part: 0.42, titre: "Grand Mage" },
	{ part: 0.56, titre: "Archimage" },
	{ part: 0.72, titre: "Administrateur" },
	{ part: 0.88, titre: "Root" }
];

var QUETES_PRINCIPALES = [
	{ id: "m_mv", titre: "Apprendre un premier sort à l'Académie",
	  indice: "L'AcademieDesSorts se trouve au bout de la ForetOuest. On y donne des Cours." },
	{ id: "m_rocher", titre: "Dégager le passage de la SalleHumide",
	  indice: "Dans les MontagnesEst (par la PrairieNord), un vieil homme garde l'entrée d'une grotte. Tout au fond, un rocher gêne." },
	{ id: "m_tunnel", titre: "Trouver le passage caché",
	  indice: "Les VieuxManuscrits du vieil homme parlent de choses cachées, dont le nom commence par un point." },
	{ id: "m_portail", titre: "Ouvrir le Portail",
	  indice: "La Stele de la ChambreDePierre explique tout, mais la formule est gravée tout en bas. Au Scriptorium de l'Académie, on apprend à lire la fin d'un texte." },
	{ id: "m_marche", titre: "Apprendre les sorts du Marché",
	  indice: "Au Marche de la PlaceDuVillage, deux parchemins de sorts attendent d'être lus." },
	{ id: "m_pont", titre: "Réparer le PontBrise",
	  indice: "Il manque une Planche. L'Artisane de l'Atelier sait créer des objets à partir de rien." },
	{ id: "m_ronces", titre: "Dégager le SentierSinistre",
	  indice: "Au-delà de la Clairiere, des Ronces barrent le chemin. Un sort du Marché les ferait disparaître." },
	{ id: "m_trolls", titre: "Passer le TrollMoche",
	  indice: "Le TrollMoche bloque le Toboggan. On peut le faire disparaître, ou simplement le déplacer." },
	{ id: "m_mdp", titre: "Trouver le mot de passe sudo",
	  indice: "Les Instructions des FichiersDuNoyau disent quoi chercher. Si tu ne sais pas chercher, la Bibliotheque du village cache une arrière-salle." },
	{ id: "m_certificat", titre: "Lire le Certificat",
	  indice: "Dans les FichiersDuNoyau : sudo less Certificat" },
	{ id: "m_demons", titre: "Abattre les trois démons du Sorcier Noir",
	  indice: "Ses démons sont des processus. À Cybersup (depuis la Maison), le Formateur apprend à les lister et à les arrêter : ceux des autres demandent sudo, les têtus demandent -9. Et si l'un d'eux renaît sans cesse, l'Administratrice de la SalleServeurs sait ce qui relance un processus à heure fixe." },
	{ id: "m_nom", titre: "Découvrir le vrai nom du Sorcier Noir",
	  indice: "Il est caché dans la Citadelle (ls -a) et protégé (sudo). Le fichier est long : grep." },
	{ id: "m_boss", titre: "Vaincre le Sorcier Noir",
	  indice: "Un nom se prononce à voix haute. Le Barde de la Taverne enseigne le sort qu'il faut." }
];

var QUETES_SECONDAIRES = [
	{ id: "s_mannequins", titre: "Ranger les cinq mannequins dans la Boite" },
	{ id: "s_parchemin", titre: "Mesurer le GrandParchemin avec head, tail et wc" },
	{ id: "s_enquete", titre: "Relever les mentions du SorcierNoir pour la bibliothécaire" },
	{ id: "s_rouages", titre: "Fabriquer les rouages de l'Artisane" },
	{ id: "s_mais", titre: "Sauver la récolte du Fermier" },
	{ id: "s_chaumiere", titre: "Rebâtir une Chaumiere pour l'homme en pleurs" },
	{ id: "s_livredor", titre: "Signer le LivreDOr de la Taverne" },
	{ id: "s_client", titre: "Trouver le meilleur client du Tavernier" },
	{ id: "s_enfant", titre: "Libérer l'enfant enlevé" },
	{ id: "s_processus", titre: "Arrêter les processus fous de la SalleDeCours" },
	{ id: "s_ctf", titre: "Capturer le drapeau de la SalleServeurs" },
	{ id: "s_hideux", titre: "Débarrasser la caverne du TrollAbsolumentHideux" },
	{ id: "s_diff", titre: "Démasquer la copie falsifiée du règlement" },
	{ id: "s_variables", titre: "Faire résonner une variable" },
	{ id: "s_alias", titre: "Se créer un alias" },
	{ id: "s_lien", titre: "Tracer un raccourci vers un lieu" },
	{ id: "s_script", titre: "Remonter le DragonMecanique avec un script" },
	{ id: "s_passwd", titre: "Choisir un mot de passe digne de ce nom" },
	{ id: "s_archive", titre: "Extraire la sauvegarde de la SalleServeurs" },
	{ id: "s_ssh", titre: "Voyager par ssh" },
	{ id: "s_apt", titre: "Installer un paquet" },
	{ id: "s_chaussette", titre: "Retrouver la chaussette gauche", secrete: true }
];

function GameState(){
	//game starts at home unless loaded from a save
	this.currentRoom = Home;
	this.flags = {};
	this.spells = {};
	this.quests = {};
	this.seen = {};
	this.nbCommandes = 0;
	this.nom = null;
	this.chargee = false;
	// Expérience
	this.xp = 0;
	this.usages = {};          // sorts déjà utilisés au moins une fois
	this.visited = {};         // lieux déjà visités
	this.gainsDuTour = [];     // petits gains à annoncer à la fin de la ligne en cours
	this.niveauAnnonce = 1;
	this.tempsMs = 0;          // temps de jeu, mesuré de sort en sort
	this.dernierInstant = null;
	// Personnalisation du terminal
	this.env = {};
	this.alias = {};
	this.paquets = {};
	// Tâches planifiées de chaque utilisateur (voir le sort crontab)
	this.cron = {
		"sorcier": [
			"* * * * *     /citadelle/bin/relancer demon_bouclier",
			"0 3 * * *     /citadelle/bin/arroser_les_ronces",
			"30 7 * * 1    /citadelle/bin/nourrir_les_trolls"
		],
		"root": [
			"0 4 * * *     /usr/bin/sauvegarder /Bibliotheque",
			"*/5 * * * *   /usr/bin/remonter DragonMecanique"
		],
		"laurent": [
			"0 8 * * 5     /home/laurent/corriger_les_copies"
		]
	};
	if (Home.id) this.visited[Home.id] = true;
	for (var i = 0; i < SORTS_DE_DEPART.length; i++) this.spells[SORTS_DE_DEPART[i]] = true;
};

GameState.prototype.getCurrentRoom = function(){
	return this.currentRoom;
};

GameState.prototype.setCurrentRoom = function(newRoom){
	this.currentRoom = newRoom;
};

/* ---------------- sorts ---------------- */

GameState.prototype.knows = function(sort){
	return this.spells[sort] === true;
};

GameState.prototype.knownSpells = function(){
	var connus = [];
	for (var i = 0; i < ORDRE_DES_SORTS.length; i++){
		if (this.spells[ORDRE_DES_SORTS[i]]) connus.push(ORDRE_DES_SORTS[i]);
	}
	return connus;
};

GameState.prototype.learn = function(sort){
	if (this.spells[sort]) return;
	this.spells[sort] = true;
	this.xp += XP_SORT_APPRIS;
	say(C.vert("✦ Nouveau sort appris : " + sort) + " (" + MANUEL[sort].resume + "). Détail : man " + sort + C.gris("  +" + XP_SORT_APPRIS + " XP"));
	GameEvents.fire({ type: "learn", spell: sort });
};

/* ---------------- experience ---------------- */

GameState.prototype.gagner = function(points, raison){
	this.xp += points;
	this.gainsDuTour.push({ points: points, raison: raison });
};

GameState.prototype.premierUsage = function(sort){
	if (this.usages[sort]) return;
	this.usages[sort] = true;
	this.gagner(XP_PREMIER_USAGE, "premier " + sort);
};

GameState.prototype.visiter = function(lieu){
	if (!lieu.id || this.visited[lieu.id]) return;
	this.visited[lieu.id] = true;
	this.gagner(XP_NOUVEAU_LIEU, "nouveau lieu");
};

/* Lieux dans lesquels on peut réellement entrer (pas la Boite ni la Cage). */
function lieuxVisitables(){
	var lieux = [];
	for (var id in World.rooms){
		if (World.rooms.hasOwnProperty(id) && !World.rooms[id].atteignable) lieux.push(World.rooms[id]);
	}
	return lieux;
}

GameState.prototype.xpMax = function(){
	return (ORDRE_DES_SORTS.length - SORTS_DE_DEPART.length) * XP_SORT_APPRIS +
		ORDRE_DES_SORTS.length * XP_PREMIER_USAGE +
		(lieuxVisitables().length - 1) * XP_NOUVEAU_LIEU +
		(QUETES_PRINCIPALES.length - 1) * XP_QUETE + XP_VICTOIRE +
		QUETES_SECONDAIRES.length * XP_QUETE_SECONDAIRE;
};

GameState.prototype.niveau = function(){
	var max = this.xpMax(), n = 1;
	for (var i = 0; i < NIVEAUX.length; i++){
		if (this.xp >= Math.round(NIVEAUX[i].part * max)) n = i + 1;
	}
	return n;
};

/* Où en est-on dans le niveau en cours ? */
GameState.prototype.progression = function(){
	var max = this.xpMax(), n = this.niveau();
	var plancher = Math.round(NIVEAUX[n - 1].part * max);
	var plafond = n < NIVEAUX.length ? Math.round(NIVEAUX[n].part * max) : max;
	return {
		niveau: n, titre: NIVEAUX[n - 1].titre,
		suivant: n < NIVEAUX.length ? NIVEAUX[n].titre : null,
		plancher: plancher, plafond: plafond, xp: this.xp, max: max,
		part: plafond > plancher ? Math.min(1, (this.xp - plancher) / (plafond - plancher)) : 1
	};
};

/* La note sur 20, au demi-point près. */
GameState.prototype.note = function(){
	return Math.round(Math.min(1, this.xp / this.xpMax()) * 40) / 2;
};

GameState.prototype.noteTexte = function(){
	return String(this.note()).replace(".", ",") + " / 20";
};

GameState.prototype.mention = function(){
	var n = this.note();
	if (n >= 18) return "Félicitations du jury";
	if (n >= 16) return "Très bien";
	if (n >= 14) return "Bien";
	if (n >= 12) return "Assez bien";
	if (n >= 10) return "Passable";
	return "Admis de justesse (mais root quand même)";
};

GameState.prototype.tempsTexte = function(){
	var minutes = Math.round(this.tempsMs / 60000);
	if (minutes < 60) return minutes + " min";
	return Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60);
};

/* Mesure le temps de jeu : on ne compte pas les longues pauses. */
GameState.prototype.chronometrer = function(){
	var maintenant = Date.now();
	if (this.dernierInstant !== null) this.tempsMs += Math.min(maintenant - this.dernierInstant, 120000);
	this.dernierInstant = maintenant;
};

/* Appelée à la fin de chaque ligne : annonce les petits gains et les montées de niveau. */
GameState.prototype.bilanXP = function(){
	this.chronometrer();
	if (this.gainsDuTour.length > 0){
		var total = 0, raisons = [];
		for (var i = 0; i < this.gainsDuTour.length; i++){
			total += this.gainsDuTour[i].points;
			if (raisons.indexOf(this.gainsDuTour[i].raison) === -1) raisons.push(this.gainsDuTour[i].raison);
		}
		say(C.gris("+" + total + " XP (" + raisons.join(", ") + ")"));
		this.gainsDuTour = [];
	}
	var n = this.niveau();
	if (n > this.niveauAnnonce){
		this.niveauAnnonce = n;
		say(C.cyan("▲ Niveau " + n + " : " + NIVEAUX[n - 1].titre + " !") +
			(n === NIVEAUX.length ? " Il n'y a plus rien au-dessus." : ""));
	}
};

function barre(part, largeur){
	var pleines = Math.round(part * largeur);
	return "[" + new Array(pleines + 1).join("#") + new Array(largeur - pleines + 1).join(".") + "]";
}

GameState.prototype.tableauXP = function(){
	var pr = this.progression();
	var principales = 0, i;
	for (i = 0; i < QUETES_PRINCIPALES.length; i++){ if (this.quests[QUETES_PRINCIPALES[i].id]) principales++; }
	var secondaires = this.nbSecondaires();
	var appris = this.knownSpells().length - SORTS_DE_DEPART.length;
	var utilises = 0, oublies = [];
	for (i = 0; i < ORDRE_DES_SORTS.length; i++){
		if (this.usages[ORDRE_DES_SORTS[i]]) utilises++;
		else if (this.spells[ORDRE_DES_SORTS[i]]) oublies.push(ORDRE_DES_SORTS[i]);
	}
	var lieux = lieuxVisitables(), visites = 0;
	for (i = 0; i < lieux.length; i++){ if (this.visited[lieux[i].id] && lieux[i] !== Home) visites++; }
	var xpPrincipales = principales * XP_QUETE + (this.quests["m_boss"] ? XP_VICTOIRE - XP_QUETE : 0);
	function ligne(nom, fait, total, points){
		return "  " + completerDroite(nom, 22) + completerGauche(fait + " / " + total, 8) + completerGauche(points + " XP", 8);
	}
	var lignes = [
		C.gras("EXPÉRIENCE"),
		"",
		C.cyan("Niveau " + pr.niveau + " : " + pr.titre) + "   " + barre(pr.part, 24) + "   " +
			(pr.suivant ? (pr.plafond - pr.xp) + " XP avant « " + pr.suivant + " »" : "niveau maximal"),
		"Total : " + C.gras(pr.xp + " XP") + " sur " + pr.max + " possibles.   Note " +
			(this.has("victoire") ? "finale" : "provisoire") + " : " + C.gras(this.noteTexte()),
		"",
		C.gras("D'où viennent tes XP"),
		ligne("Quêtes principales", principales, QUETES_PRINCIPALES.length, xpPrincipales),
		ligne("Quêtes secondaires", secondaires, QUETES_SECONDAIRES.length, secondaires * XP_QUETE_SECONDAIRE),
		ligne("Sorts appris", appris, ORDRE_DES_SORTS.length - SORTS_DE_DEPART.length, appris * XP_SORT_APPRIS),
		ligne("Premières utilisations", utilises, ORDRE_DES_SORTS.length, utilises * XP_PREMIER_USAGE),
		ligne("Lieux découverts", visites, lieux.length - 1, visites * XP_NOUVEAU_LIEU),
		""
	];
	if (oublies.length > 0) lignes.push("Sorts appris mais jamais lancés : " + oublies.join(", "));
	lignes.push(C.gris("Temps de jeu : " + this.tempsTexte() + ". Sorts lancés : " + this.nbCommandes + "."));
	lignes.push(C.gris("Barème : " + XP_QUETE + " XP par étape de la quête principale (" + XP_VICTOIRE + " pour la dernière), " +
		XP_QUETE_SECONDAIRE + " par quête secondaire, " + XP_SORT_APPRIS + " par sort appris, " +
		XP_PREMIER_USAGE + " la première fois qu'on s'en sert, " + XP_NOUVEAU_LIEU + " par lieu découvert."));
	return lignes.join("\n");
};

/* ---------------- quetes ---------------- */

function trouverQuete(id){
	var toutes = QUETES_PRINCIPALES.concat(QUETES_SECONDAIRES);
	for (var i = 0; i < toutes.length; i++){
		if (toutes[i].id === id) return toutes[i];
	}
	return null;
}

GameState.prototype.discover = function(id){
	this.seen[id] = true;
};

GameState.prototype.complete = function(id){
	if (this.quests[id]) return;
	this.quests[id] = true;
	this.seen[id] = true;
	var quete = trouverQuete(id);
	var principale = id.charAt(0) === "m";
	var points = principale ? (id === "m_boss" ? XP_VICTOIRE : XP_QUETE) : XP_QUETE_SECONDAIRE;
	this.xp += points;
	say(C.jaune("★ " + (principale ? "Quête accomplie" : "Quête secondaire accomplie") + " : " + quete.titre) + C.gris("  +" + points + " XP"));
};

GameState.prototype.nbSecondaires = function(){
	var n = 0;
	for (var i = 0; i < QUETES_SECONDAIRES.length; i++){
		if (this.quests[QUETES_SECONDAIRES[i].id]) n++;
	}
	return n;
};

GameState.prototype.journal = function(){
	var lignes = [C.gras("JOURNAL DE QUÊTES"), "", C.gras("Quête principale")];
	var enCours = false;
	for (var i = 0; i < QUETES_PRINCIPALES.length; i++){
		var q = QUETES_PRINCIPALES[i];
		if (this.quests[q.id]){
			lignes.push("  " + C.vert("[x]") + " " + q.titre);
		} else if (!enCours){
			enCours = true;
			lignes.push("  " + C.jaune("[ ] " + q.titre));
			lignes.push(C.gris("      Indice : " + q.indice));
		}
	}
	if (!enCours) lignes.push("  " + C.vert("Terminée. Le monde reste ouvert : il te reste peut-être des choses à découvrir."));
	lignes.push("");
	lignes.push(C.gras("Quêtes secondaires") + " (" + this.nbSecondaires() + " accomplies sur " + QUETES_SECONDAIRES.length + ")");
	var inconnues = 0;
	for (var j = 0; j < QUETES_SECONDAIRES.length; j++){
		var s = QUETES_SECONDAIRES[j];
		if (this.quests[s.id]) lignes.push("  " + C.vert("[x]") + " " + s.titre);
		else if (this.seen[s.id]) lignes.push("  [ ] " + s.titre);
		else inconnues++;
	}
	if (inconnues > 0){
		lignes.push(C.gris("  ... et " + inconnues + " autre" + (inconnues > 1 ? "s" : "") + " à découvrir en parlant aux habitants et en fouillant partout."));
	}
	lignes.push("");
	var pr = this.progression();
	lignes.push(C.cyan("Niveau " + pr.niveau + " : " + pr.titre) + C.gris("   " + pr.xp + " XP sur " + pr.max + " (détail : xp)"));
	lignes.push(C.gris("Sorts appris : " + this.knownSpells().length + " sur " + ORDRE_DES_SORTS.length + ". Sorts lancés : " + this.nbCommandes + "."));
	return lignes.join("\n");
};

GameState.prototype.texteDuDiplome = function(){
	var pr = this.progression();
	var complet = this.xp >= pr.max;
	return "" +
		"=====================================================\n" +
		"            DIPLÔME DE MAGE DU TERMINAL\n" +
		"=====================================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir vaincu le Sorcier Noir lors de l'examen\n" +
		"  de Terminus, armé d'un simple terminal.\n" +
		"\n" +
		"  SCORE FINAL         : " + this.xp + " XP sur " + pr.max + "\n" +
		"  NOTE                : " + this.noteTexte() + "\n" +
		"  Mention             : " + this.mention() + "\n" +
		"  Niveau atteint      : " + pr.niveau + " sur " + NIVEAUX.length + ", " + pr.titre + "\n" +
		"\n" +
		"  Sorts maîtrisés     : " + this.knownSpells().length + " sur " + ORDRE_DES_SORTS.length + "\n" +
		"  Quêtes secondaires  : " + this.nbSecondaires() + " sur " + QUETES_SECONDAIRES.length + "\n" +
		"  Sorts lancés        : " + this.nbCommandes + "\n" +
		"  Temps de jeu        : " + this.tempsTexte() + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          (et Sorcier Noir à ses heures)\n" +
		"=====================================================" +
		(this.nom ? "" : "\n(Pour faire figurer ton nom sur le diplôme, va signer le LivreDOr de la Taverne.)") +
		(complet ? "" : "\n(La note peut encore monter : le diplôme se met à jour tout seul. Tape xp pour voir où il reste des points à prendre.)");
};

/* ---------------- evenements de l'histoire ---------------- */

GameState.prototype.has = function(flag){
	return this.flags[flag] === true;
};

GameState.prototype.set = function(flag){
	this.flags[flag] = true;
};

/* Si le joueur a créé quelque chose qui porte déjà le nom d'un élément de
   l'histoire, on renomme sa création pour que l'histoire puisse continuer. */
function libererNom(lieu, nom){
	var genant = lieu.getNode(nom);
	if (genant === null) return;
	var nouveau = nom + "_bis";
	while (lieu.getNode(nouveau) !== null) nouveau += "_bis";
	if (genant instanceof Room) genant.room_name = nouveau;
	else genant.itemname = nouveau;
	say(C.gris("(Quelque chose s'appelait déjà « " + nom + " » ici : ta création a été renommée « " + nouveau + " ».)"));
}

function relier(parent, enfant){
	if (parent.children.indexOf(enfant) === -1) libererNom(parent, enfant.room_name);
	link_rooms(parent, enfant);
}

function poser(lieu, item){
	if (!lieu.hasItem(item)) libererNom(lieu, item.itemname);
	lieu.addItem(item);
}

GameState.prototype.applyState = function(param_name){
	if (this.flags[param_name]) return;
	this.flags[param_name] = true;
	switch(param_name){
		case "mvBoulder":
			relier(DankRoom, Tunnel);
			say(SmallHole.hasItem(Boulder) ?
				"Le rocher roule dans le trou avec un bruit sourd. Un courant d'air glacé te frôle le visage... et pourtant tu ne distingues aucun passage. Certaines choses ne se montrent qu'à qui sait regarder." :
				"Le rocher n'encombre plus le fond de la salle. Un courant d'air glacé te frôle le visage... et pourtant tu ne distingues aucun passage. Certaines choses ne se montrent qu'à qui sait regarder.");
			this.complete("m_rocher");
			break;
		case "ouvrirPortail":
			say("Le sceau du Portail se brise dans un éclair vert. La voie est libre.");
			break;
		case "pullLever":
			relier(Library, BackRoom);
    		break;
    	case "rmLargeBoulder":
    		relier(RockyPath, Farm);
    		say("Derrière l'emplacement du rocher, le sentier continue vers une ferme.");
    		break;
    	case "touchGear":
    		Artisan.addCmdText("less", "« Eh bien c'est charmant, merci, mais tu ne t'imagines pas que je vais fabriquer \
quoi que ce soit avec un seul rouage ! Tu ne peux pas le copier ?\n\
...\n\
*soupir* Je vois qu'il va falloir tout t'apprendre. Dis simplement “cp OBJET COPIE”. \
OBJET, c'est le nom de ce que tu veux copier, et COPIE, le nom de la copie, compris ? Et pouf ! \
Un objet tout neuf. Il m'en faut cinq de plus, alors au travail ! \
Appelle-les rouage1, rouage2, rouage3, rouage4 et rouage5, s'il te plaît. »");
    		Artisan.teaches = ["touch", "cp"];
    		var rouage = ArtisanShop.getItemFromName("Rouage");
    		rouage.changePicName("item_gear.gif");
    		if (rouage.getText() === "") rouage.setText("C'est un rouage, tout neuf.");
    		say("L'Artisane jette un œil à ton Rouage. Elle a manifestement autre chose à te demander.");
    		break;
    	case "FiveGearsCopied":
    		Artisan.addCmdText("less", "« Ha, déjà fini ? Tu apprends vite, on dirait. Tiens, pour la peine, je te donne mon script remonter.sh : \
il remonte le DragonMecanique à ma place. Un script, c'est une liste de sorts rangée dans un objet. \
On le lance en l'appelant par son chemin : ./remonter.sh (le ./ veut dire « celui qui est ici »).\n\
Seulement voilà : il lui manque le droit d'être exécuté, le fameux x. Regarde-le avec ls -l, arrange ça avec chmod, et lance-le. \
Si tu es pressé, bash remonter.sh marche aussi, mais ce n'est pas du travail soigné.\n\
Et quand tu voudras faire le ménage : “rm rouage*” efface tout ce qui commence par rouage. Mais pas ici, hein. J'en ai besoin. »");
    		Artisan.teaches = ["touch", "cp", "bash"];
    		Artisan.reveals = ["s_rouages", "s_script"];
    		poser(ArtisanShop, RemonterScript);
    		say("L'Artisane pose un petit objet sur l'établi : remonter.sh. Elle a encore quelque chose à te dire.");
    		this.complete("s_rouages");
    		break;
    	case "CornCopied":
    	    Farmer.addCmdText("less", "« C'est un miracle ! Merci, ami. Que l'Admin te bénisse. »");
    	    var epi = Farm.getItemFromName("AutreEpiDeMais");
    	    epi.changePicName("item_corn.gif");
    	    this.complete("s_mais");
    	    break;
    	case "HouseMade":
    		var chaumiere = Clearing.getChildFromName("Chaumiere");
    		chaumiere.changeIntroText("Tu entres dans la Chaumiere que tu as bâtie. C'est petit, mais c'est solide.");
    		chaumiere.addCmdText("ls", "Tu as bâti cette chaumière pour l'homme. C'est délicat de ta part !");
    		Clearing.changeIntroText("Une petite clairière herbeuse. Un homme est assis sur une pierre, en larmes. \
Derrière lui, un tas de gravats et une petite chaumière blanche.");
    		CryingMan.addCmdText("less", "« Merci de m'avoir bâti cette Chaumiere ! Pourquoi je pleure encore ? Ce sont des larmes de joie. \
Un homme n'a donc pas le droit d'exprimer ses émotions ? »");
    		this.complete("s_chaumiere");
    		break;
    	case "touchPlank":
    		Clearing.addCommand("cd");
    		Clearing.removeCmdText("cd");
    		BrokenBridge.changeIntroText("Un pont de corde grinçant enjambe un gouffre.");
    		var planche = BrokenBridge.getItemFromName("Planche");
    		planche.changePicName("item_plank.gif");
    		if (planche.getText() === "") planche.setText("Une planche solide, pile à la bonne taille.");
    		say("La Planche s'emboîte pile dans le trou. Le pont tient : la Clairiere est accessible.");
    		this.complete("m_pont");
    		break;
    	case "rmBrambles":
    		relier(OminousLookingPath, CaveOfDisgruntledTrolls);
    		say("Derrière les ronces, l'entrée d'une caverne.");
    		this.complete("m_ronces");
    		break;
    	case "openSlide":
    		Slide.addCommand("cd");
    		Slide.removeCmdText("cd");
    		Slide.changeIntroText("Ce n'est qu'un toboggan. Continue : tu y es presque, les FichiersDuNoyau sont juste en bas.");
    		say("Plus rien ne barre l'accès au Toboggan.");
    		this.complete("m_trolls");
    		break;
    	case "enfantLibre":
    		Cage.changeIntroText("La cage est vide, la porte bâille.");
    		CaveOfDisgruntledTrolls.changeIntroText("La caverne est sombre et sent... les pieds ? Ah oui, ce sont sûrement les trolls. \
Près du mur du fond, une cage vide.");
    		DistraughtLady.addCmdText("less", "La femme serre contre elle une petite fille à la drôle de tête. \
« Elle est revenue ! Elle dit qu'un mage l'a sortie de sa cage sans même y entrer. C'était toi ? Merci, merci ! »\n\
La petite te tire la langue. Tu jurerais l'avoir vue cacher une tablette de chocolat.");
    		DistraughtLady.itemname = "DameSoulagee";
    		this.complete("s_enfant");
    		break;
    	case "trollHideuxParti":
    		this.complete("s_hideux");
    		break;
    	case "mannequinsRanges":
    		say("Cinq mannequins, une boîte : le compte est bon. Quelque part, un professeur hoche la tête.");
    		this.complete("s_mannequins");
    		break;
    	case "parcheminMesure":
    		say("Le copiste lève enfin les yeux. « Cent vingt lignes, le début, la fin, et sans tout dérouler. Bien. \
Tu liras des journaux de dix mille lignes de la même façon. »");
    		this.complete("s_parchemin");
    		break;
    	case "enqueteFaite":
    		say("Cinq mentions en un seul sort, dans un livre que personne n'a jamais lu en entier. \
Tu notes au passage ce que disent les deux dernières : un vrai nom, un phylactère, une voix haute...");
    		Librarian.addCmdText("less", "« Tu as tout relevé ? Un phylactère que nul ne voit, un vrai nom à prononcer... \
Voilà qui confirme mes recherches. Merci ! Garde Grep avec toi, il te sera utile plus loin : \
on le croise jusque dans les FichiersDuNoyau. » Grep soupire. « Greeep. »");
    		this.complete("s_enquete");
    		break;
    	case "clientTrouve":
    		say("« " + MEILLEUR_CLIENT + " ! Je m'en doutais. Sa prochaine chope est pour moi. » Le tavernier se penche et baisse la voix. \
« Tiens, puisque tu sais compter, un secret. On raconte que le Sorcier Noir ne craint qu'une chose : \
qu'on prononce son vrai nom à voix haute, devant lui. Et un nom, ça se prononce avec echo. »");
    		this.complete("s_client");
    		break;
    	case "processusArretes":
    		say("Le formateur applaudit. « Propre. Retiens bien : ps pour voir, kill pour arrêter, -9 pour les têtus, \
et sudo quand le processus n'est pas à toi. Ça te resservira plus tôt que tu ne crois. »");
    		this.complete("s_processus");
    		break;
    	case "mdpTrouve":
    		say("Le mot de passe sudo ! Note-le bien, à la lettre près : majuscules et chiffres comptent.");
    		this.complete("m_mdp");
    		break;
    	case "sudoOK":
    		say(C.gris("Le mot de passe est accepté. On ne te le redemandera plus."));
    		break;
    	case "certificatLu":
    		relier(KernelFiles, Citadelle);
    		say("Un grondement secoue les FichiersDuNoyau. Un pan de mur s'efface : un passage vient de s'ouvrir vers la Citadelle.");
    		this.complete("m_certificat");
    		break;
    	case "demonsMorts":
    		SorcierNoir.addCmdText("less", "« Mes démons... » Pour la première fois, le Sorcier Noir se retourne. \
Sous la capuche, on ne distingue que deux reflets verts. « Bien joué. Mais c'est inutile : mon vrai nom est scellé \
dans mon phylactère, et tant que personne ne le prononce, je reste invincible. Il est dans cette salle, \
sous ton nez. Tu ne le vois pas, n'est-ce pas ? »");
    		say("Le dernier démon s'éteint. Le Sorcier Noir vacille et se retourne lentement vers toi. Il a quelque chose à dire.");
    		this.complete("m_demons");
    		break;
    	case "nomLu":
    		if (this.has("demonsMorts")){
	    		SorcierNoir.addCmdText("less", "Le Sorcier Noir recule d'un pas. « Tu as lu le phylactère. Tu SAIS. ... \
Tu n'oserais tout de même pas le dire à voix haute ? »");
    		}
    		say("vrai_nom : te voilà en possession du vrai nom du Sorcier Noir. Reste à le prononcer devant lui, à voix haute.");
    		this.complete("m_nom");
    		break;
    	case "victoire":
    		Citadelle.removeItem(SorcierNoir);
    		poser(Citadelle, Laurent);
    		poser(Citadelle, Diplome);
    		Citadelle.changeIntroText("La Citadelle n'a plus rien de menaçant : le grand terminal affiche un fond d'écran avec un pingouin. \
Laurent t'y attend, sa cape sur le bras.");
    		relier(Citadelle, Paradise);
    		BureauDeLaurent.mode = "rwxr-xr-x";
    		poser(BureauDeLaurent, MotDeLaurent);
    		poser(BureauDeLaurent, Credits);
    		var agenda = BureauDeLaurent.getItemFromName("Agenda");
    		if (agenda !== -1) agenda.mode = "rw-r--r--";
    		if (EasternMountains.removeItem(OldMan)) poser(EasternMountains, MotDuVieilHomme);
    		EasternMountains.changeIntroText("Tu suis un sentier de montagne qui finit par te mener à l'entrée d'une grotte. \
Le rocher où s'asseyait le vieil homme est vide.");
    		Villageois.addCmdText("less", "« Tu as entendu ? Le Sorcier Noir est vaincu ! Par un apprenti, à ce qu'on dit, \
avec un simple terminal. On raconte même que c'était un examen depuis le début. Moi, je n'y crois pas : \
personne ne se donnerait autant de mal pour un contrôle de connaissances. »");
    		LecteurDeJournal.addCmdText("less", "L'homme brandit la dernière édition du « Dernier Mot ». En une : \
« LE SORCIER NOIR ÉTAIT DIRECTEUR PÉDAGOGIQUE ». Il secoue la tête. « Quelle époque. »");
    		say("Le nom résonne sous la voûte : « Laurent ! »\n\n\
Le grand terminal s'éteint. Les ombres se dissipent. Le Sorcier Noir reste un instant immobile, puis éclate de rire : \
un rire franc, pas maléfique du tout. Il rabat sa capuche.\n\n\
Tu connais cette barbe. C'est le vieil homme des MontagnesEst.\n\n\
« Bien le bonjour ! Belle matinée pour réussir un examen, pas vrai ? »");
    		montrerImage(Laurent.picturename, "Laurent");
    		this.complete("m_boss");
    		this.learn("tree");
    		say(C.gris("(Laurent a visiblement des choses à te dire : less Laurent. Ton Diplome est posé à côté.)"));
    		break;
    	case "fin":
    		var bilan = this.progression();
    		say(C.vert(C.gras("FIN")) + "\n\n" +
    			C.gras("SCORE FINAL : " + this.xp + " XP sur " + bilan.max) + "\n" +
    			C.gras("NOTE : " + this.noteTexte()) + "   Mention : " + this.mention() + "\n" +
    			"Niveau " + bilan.niveau + " sur " + NIVEAUX.length + " : " + bilan.titre + "\n\n" +
    			"Sorts appris : " + this.knownSpells().length + " sur " + ORDRE_DES_SORTS.length +
    			". Quêtes secondaires : " + this.nbSecondaires() + " sur " + QUETES_SECONDAIRES.length +
    			". Sorts lancés : " + this.nbCommandes + ". Temps de jeu : " + this.tempsTexte() + ".\n\n" +
    			(this.xp >= bilan.max ?
    				"Score parfait : il ne reste rien à découvrir. Chapeau.\n" :
    				"Le monde reste ouvert, et ta note peut encore monter : « xp » montre où il reste des points, « quetes » ce qu'il reste à faire. Le BureauDeLaurent, à Cybersup, t'attend aussi.\n") +
    			"Et maintenant, ouvre un vrai terminal. Tout ce que tu sais y fonctionne.");
    		break;
		default:
			break;
	};
};

/* ---------------- sauvegarde ---------------- */

function copierTextes(cmd_text, sansLess){
	var copie = {};
	for (var cle in cmd_text){
		if (cmd_text.hasOwnProperty(cle) && !(sansLess && cle === "less")) copie[cle] = cmd_text[cle];
	}
	return copie;
}

function photographierObjet(item){
	var gardeTexte = item.modifie || !item.id;
	var o = {
		n: item.itemname, p: item.picturename, c: copierTextes(item.cmd_text, !gardeTexte),
		v: item.valid_cmds.slice(), m: item.mode, o: item.owner, pe: item.person,
		t: item.teaches.slice(), r: item.reveals.slice(), x: gardeTexte ? 1 : 0
	};
	if (item.lien) o.l = item.lien;
	if (item.archive) o.a = item.archive;
	if (item.acquis) o.q = 1;
	if (item.protege) o.g = 1;
	return o;
}

function photographierLieu(lieu){
	return {
		n: lieu.room_name, i: lieu.intro_text, p: lieu.room_pic, c: copierTextes(lieu.cmd_text, false),
		cm: lieu.commands.slice(), m: lieu.mode, o: lieu.owner, d: lieu.deny_text,
		pr: JSON.parse(JSON.stringify(lieu.procs)),
		k: lieu.children.map(function(enfant){ return enfant.id ? enfant.id : photographierLieu(enfant); }),
		it: lieu.items.map(function(item){ return item.id ? item.id : photographierObjet(item); })
	};
}

function restaurerObjet(item, o){
	item.itemname = o.n;
	item.picturename = o.p;
	var texte = item.cmd_text["less"];
	item.cmd_text = copierTextes(o.c, false);
	if (o.x){ item.modifie = true; }
	else { item.cmd_text["less"] = texte; }
	item.valid_cmds = o.v.slice();
	item.mode = o.m;
	item.owner = o.o;
	item.person = !!o.pe;
	item.teaches = (o.t || []).slice();
	item.reveals = (o.r || []).slice();
	item.lien = o.l || undefined;
	if (o.a) item.archive = o.a;
	item.acquis = !!o.q;
	item.protege = !!o.g;
	return item;
}

function restaurerLieu(lieu, o){
	lieu.room_name = o.n;
	lieu.intro_text = o.i;
	lieu.room_pic = o.p;
	lieu.cmd_text = copierTextes(o.c, false);
	lieu.commands = o.cm.slice();
	lieu.mode = o.m;
	lieu.owner = o.o;
	lieu.deny_text = o.d || null;
	lieu.procs = o.pr || [];
	lieu.children = [];
	lieu.items = [];
	for (var i = 0; i < o.k.length; i++){
		var enfant = typeof o.k[i] === "string" ? World.rooms[o.k[i]] : restaurerLieu(new Room(o.k[i].n), o.k[i]);
		if (!enfant) continue;
		lieu.children.push(enfant);
		enfant.parents[0] = lieu;
	}
	for (var j = 0; j < o.it.length; j++){
		var item = typeof o.it[j] === "string" ? World.items[o.it[j]] : restaurerObjet(new Item(o.it[j].n, ""), o.it[j]);
		if (item) lieu.items.push(item);
	}
	return lieu;
}

function lieuParChemin(chemin){
	var lieu = Home;
	var morceaux = chemin.split("/");
	for (var i = 1; i < morceaux.length; i++){
		var suivant = lieu.getChildFromName(morceaux[i]);
		if (suivant === -1) return lieu;
		lieu = suivant;
	}
	return lieu;
}

GameState.prototype.save = function(){
	try {
		var donnees = {
			v: VERSION_SAUVEGARDE,
			flags: this.flags, spells: this.spells, quests: this.quests, seen: this.seen,
			nb: this.nbCommandes, nom: this.nom,
			xp: this.xp, usages: this.usages, visites: this.visited, niveau: this.niveauAnnonce, temps: this.tempsMs,
			env: this.env, alias: this.alias, paquets: this.paquets, cron: this.cron,
			ici: current_room.path(),
			avant: Shell.lieu_precedent ? Shell.lieu_precedent.path() : null,
			ssh: Shell.pile_ssh.map(function(lieu){ return lieu.path(); }),
			historique: Shell.historique.slice(-100),
			lieux: {}, objets: {}
		};
		var id;
		for (id in World.rooms){
			if (World.rooms.hasOwnProperty(id)) donnees.lieux[id] = photographierLieu(World.rooms[id]);
		}
		for (id in World.items){
			if (World.items.hasOwnProperty(id)) donnees.objets[id] = photographierObjet(World.items[id]);
		}
		window.localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(donnees));
	} catch (e){
		// Stockage indisponible (navigation privee, apercu...) : on joue sans sauvegarde.
	}
};

/* Renvoie vrai si une partie a ete restauree. */
GameState.prototype.load = function(){
	var brut = null;
	try {
		brut = window.localStorage.getItem(CLE_SAUVEGARDE);
	} catch (e){
		return false;
	}
	if (!brut) return false;
	var donnees;
	try {
		donnees = JSON.parse(brut);
	} catch (e){
		return false;
	}
	if (!donnees || donnees.v !== VERSION_SAUVEGARDE) return false;
	try {
		var id;
		for (id in donnees.objets){
			if (World.items[id]) restaurerObjet(World.items[id], donnees.objets[id]);
		}
		for (id in donnees.lieux){
			if (World.rooms[id]) restaurerLieu(World.rooms[id], donnees.lieux[id]);
		}
		this.flags = donnees.flags || {};
		this.spells = donnees.spells || {};
		this.quests = donnees.quests || {};
		this.seen = donnees.seen || {};
		this.nbCommandes = donnees.nb || 0;
		this.nom = donnees.nom || null;
		this.xp = donnees.xp || 0;
		this.usages = donnees.usages || {};
		this.visited = donnees.visites || {};
		this.niveauAnnonce = donnees.niveau || 1;
		this.tempsMs = donnees.temps || 0;
		this.env = donnees.env || {};
		this.alias = donnees.alias || {};
		this.paquets = donnees.paquets || {};
		if (donnees.cron) this.cron = donnees.cron;
		Shell.pile_ssh = (donnees.ssh || []).map(lieuParChemin);
		this.currentRoom = lieuParChemin(donnees.ici || "~");
		Shell.lieu_precedent = donnees.avant ? lieuParChemin(donnees.avant) : null;
		Shell.historique = donnees.historique || [];
		this.chargee = true;
		return true;
	} catch (e){
		// Sauvegarde abimee : le monde est a moitie restaure, on repart d'une page propre.
		this.reset();
		var dejaTente = false;
		try {
			dejaTente = window.sessionStorage.getItem(CLE_SAUVEGARDE + "-reparation") === "1";
			window.sessionStorage.setItem(CLE_SAUVEGARDE + "-reparation", "1");
		} catch (e2){
			dejaTente = true;
		}
		if (!dejaTente) window.location.reload();
		return false;
	}
};

GameState.prototype.reset = function(){
	try {
		window.localStorage.removeItem(CLE_SAUVEGARDE);
	} catch (e){}
};
