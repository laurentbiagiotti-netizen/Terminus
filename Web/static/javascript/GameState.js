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

var CLE_SAUVEGARDE = (COMPTE_ACTIF ? "terminus-cybersup-partie-" + COMPTE_ACTIF : "terminus-cybersup") + (PROFIL.modeExamen ? "-examen" : "");
var VERSION_SAUVEGARDE = 3;

/* Barème de l'expérience. */
var XP_SORT_APPRIS = 10;      // apprendre un sort
var XP_PREMIER_USAGE = 5;     // s'en servir pour la première fois
var XP_NOUVEAU_LIEU = 5;      // entrer dans un lieu pour la première fois
var XP_QUETE = 100;           // une étape de la quête principale
var XP_VICTOIRE = 300;        // vaincre le Sorcier Noir
var XP_QUETE_SECONDAIRE = 50; // une quête secondaire

/* Les niveaux : la part de l'expérience totale qu'il faut avoir atteinte. */
var NIVEAUX = [
	{ part: 0,    titre: "Candidat" },
	{ part: 0.02, titre: "Admis" },
	{ part: 0.06, titre: "B1" },
	{ part: 0.12, titre: "B2" },
	{ part: 0.20, titre: "B3" },
	{ part: 0.30, titre: "M1" },
	{ part: 0.42, titre: "M2" },
	{ part: 0.56, titre: "Alternant confirmé" },
	{ part: 0.72, titre: "Diplômé" },
	{ part: 0.88, titre: "Root" }
];

/* Le bulletin : les sorts regroupés en blocs de compétences. */
var BLOCS_DE_COMPETENCES = [
	{ code: "BC 01", titre: "Se repérer et se documenter",
	  sorts: ["ls", "cd", "pwd", "less", "help", "man", "clear", "exit", "history"] },
	{ code: "BC 02", titre: "Manipuler lieux et objets",
	  sorts: ["mv", "cp", "rm", "mkdir", "rmdir", "touch", "ln", "find", "tree", "tar"] },
	{ code: "BC 03", titre: "Lire et filtrer des textes",
	  sorts: ["cat", "head", "tail", "wc", "diff", "grep", "echo", "sort", "uniq", "cut"] },
	{ code: "BC 04", titre: "Droits, utilisateurs et sécurité",
	  sorts: ["chmod", "chown", "whoami", "id", "passwd", "sudo"] },
	{ code: "BC 05", titre: "Processus et automatisation",
	  sorts: ["ps", "top", "kill", "crontab", "bash", "alias", "unalias", "export", "env", "date"] },
	{ code: "BC 06", titre: "Système et réseau",
	  sorts: ["df", "du", "hostname", "ping", "ssh", "apt", "cowsay"] }
];

var QUETES_PRINCIPALES = [
	{ id: "m_mv", titre: "Apprendre un premier sort à l'Académie",
	  indice: "L'AcademieDesSorts se trouve au bout de la ForetOuest. On y donne des Cours." },
	{ id: "m_rocher", titre: "Dégager le passage de la SalleHumide",
	  indice: "Dans les MontagnesEst (par la PrairieNord), un vieil homme garde l'entrée d'une grotte. Tout au fond, un rocher gêne." },
	{ id: "m_tunnel", titre: "Trouver le passage caché",
	  indice: "Les VieuxManuscrits du vieil homme parlent de choses cachées, dont le nom commence par un point." },
	{ id: "m_portail", titre: "Ouvrir le Portail",
	  indice: "La Stele de la ChambreDePierre explique tout, mais la formule est gravée tout en bas : cat affiche tout le texte, et tail (qu'on apprend au Scriptorium de l'Académie) seulement sa fin." },
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
	{ id: "s_ecrasement", titre: "Copier sans rien écraser" },
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
	{ id: "s_adresse", titre: "Joindre Lille par son adresse IP" },
	{ id: "s_apt", titre: "Installer un paquet" },
	{ id: "s_emargement", titre: "Signer la FeuilleEmargement de la rentrée" },
	{ id: "s_soc", titre: "Identifier l'attaquant dans les journaux de la WarRoom" },
	{ id: "s_bde", titre: "Faire l'inventaire des sweats du BDE" },
	{ id: "s_campus", titre: "Rendre visite aux campus de Lille et de Marseille" },
	{ id: "s_annales", titre: "Mettre la main sur les annales de l'examen", secrete: true },
	{ id: "s_chaussette", titre: "Retrouver la chaussette gauche", secrete: true }
];

/*
 * Indices payants, deux paliers par étape de la quête principale (le premier
 * palier, gratuit, est l'indice du journal). Chaque palier coûte des points sur
 * la note finale, pas sur l'expérience : le niveau reste mérité, la note dit
 * combien d'aide il a fallu.
 */
var COUT_INDICES = [30, 60];

var INDICES_DETAILLES = {
	m_mv: [
		"Va dans ~/ForetOuest/AcademieDesSorts/Cours et lis le Professeur avec less.",
		"cd ~/ForetOuest/AcademieDesSorts/Cours puis less Professeur."],
	m_rocher: [
		"Le Rocher de la SalleHumide doit aller ailleurs. Il y a un PetitTrou juste à côté, et tu connais un sort qui déplace les objets.",
		"Dans ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide : mv Rocher PetitTrou"],
	m_tunnel: [
		"ls ne montre pas les noms qui commencent par un point. Une option de ls les montre tous (voir man ls).",
		"Dans la SalleHumide : ls -a, puis cd .Tunnel"],
	m_portail: [
		"Le Portail refuse d'être franchi : regarde ses droits avec ls -l. Il lui manque le droit d'exécution, qui permet de traverser un lieu.",
		"Dans la ChambreDePierre : chmod +x Portail puis cd Portail"],
	m_marche: [
		"Au Marche de la PlaceDuVillage, lis tous les parchemins qui commencent par Sort.",
		"cd Marche puis less SortRm et less SortMkdir"],
	m_pont: [
		"Le PontBrise attend une Planche. Le sort touch crée un objet vide qui porte le nom que tu veux.",
		"Dans ~/Village/PontBrise (ou par le chemin complet) : touch Planche"],
	m_ronces: [
		"Les Ronces sont un objet, et le Marché t'a appris à faire disparaître un objet.",
		"Dans le SentierSinistre, après la Clairiere : rm Ronces"],
	m_trolls: [
		"Le TrollMoche ne t'appartient pas, mais on peut le déplacer : mv vers le lieu parent, qui s'écrit ..",
		"Dans la CaverneDesTrolls : mv TrollMoche .."],
	m_mdp: [
		"Les Instructions demandent de trouver une ligne motdepasse= parmi des dizaines de chroniques. grep cherche un mot dans plusieurs fichiers à la fois, et * les désigne tous.",
		"cd ArchivesDuNoyau puis grep motdepasse= *"],
	m_certificat: [
		"Le Certificat appartient à root (ls -l). sudo lance un sort avec les droits de root, et demande le mot de passe trouvé dans les archives.",
		"Dans les FichiersDuNoyau : sudo less Certificat, puis le mot de passe."],
	m_demons: [
		"ps liste les démons et leur PID, sudo kill les arrête, kill -9 vient à bout des têtus. Le bouclier renaît tant qu'une tâche planifiée du sorcier le relance : regarde sa crontab.",
		"Dans la Citadelle : ps, sudo crontab -u sorcier -r, puis sudo kill (ou sudo kill -9) sur chaque PID affiché par ps."],
	m_nom: [
		"ls -a révèle un .Phylactere. Il est protégé : il faut sudo pour le lire, et grep pour trouver la ligne qui compte.",
		"Dans la Citadelle : sudo cat .Phylactere | grep vrai_nom"],
	m_boss: [
		"Le sort echo fait parler à voix haute. Prononce le vrai nom que le phylactère t'a révélé.",
		"Dans la Citadelle : echo suivi du nom lu dans le phylactère."]
};

function GameState(){
	//game starts at home unless loaded from a save
	this.currentRoom = Home;
	this.flags = {};
	this.spells = {};
	this.quests = {};
	this.seen = {};
	this.nbCommandes = 0;
	this.nom = null;
	this.dernierLieu = null;   // dernier lieu visité dans Terminus (affiché sur l'écran de la war room)
	this.chargee = false;
	// Expérience
	this.xp = 0;
	this.usages = {};          // sorts déjà utilisés au moins une fois
	this.frequences = {};      // combien de fois chaque sort a été lancé (le récapitulatif de fin de chapitre)
	this.quiz = {};            // le meilleur score au quiz de chaque chapitre
	this.visited = {};         // lieux déjà visités
	this.gainsDuTour = [];     // petits gains à annoncer à la fin de la ligne en cours
	this.niveauAnnonce = 1;
	this.tempsMs = 0;          // temps de jeu, mesuré de sort en sort
	this.indices = {};         // paliers d'indices payants pris, par étape de quête
	this.malus = 0;            // points retirés de la note par les indices
	this.dateVictoire = null;
	// La Crypte (chapitre 3 pour le joueur, numéro 2 dans le code)
	this.xp2 = 0;
	this.malus2 = 0;
	this.clesGenerees = 0;     // combien de paires de clés SSH le joueur a fabriquées
	// L'état des machines du réseau de l'école (pare-feu, services, clés installées)
	this.reseau = { parefeu: { actif: false, regles: [] }, services: {}, cles: {}, hotesUname: {} };
	this.clePublique = null;   // sa clé publique actuelle
	this.clePrivee = null;     // la clé privée qui allait avec la clé publique installée sur le coffre
	this.cleGrillee = null;    // une clé publique dont la clé privée a été donnée à quelqu'un
	this.debutChapitre2 = null;
	this.dateVictoire2 = null;
	// Chapitre 2 pour le joueur : la panne du réseau (numéro 3 dans le code, voir Panne.js)
	this.xp3 = 0;
	this.malus3 = 0;
	this.debutChapitre3 = null;
	this.dateVictoire3 = null;
	this.panne = typeof etatPanneInitial === "function" ? etatPanneInitial() : {};
	// Chapitre 4 pour le joueur : l'Académie des Arcanes (numéro 5 dans le code, voir Chapitre4.js)
	this.xp5 = 0;
	this.malus5 = 0;
	this.debutChapitre5 = null;
	this.dateVictoire5 = null;
	this.ch4 = typeof etatCh4Initial === "function" ? etatCh4Initial() : {};
	// Succès et chronomètre
	this.succes = {};          // succès débloqués
	this.chronos = {};         // temps de jeu au moment où chaque étape a été franchie
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
	if (sort === "vi") sort = "vim"; // vi est l'autre nom de vim
	return this.spells[sort] === true;
};

function tousLesSorts(){
	var tous = ORDRE_DES_SORTS;
	if (typeof ORDRE_DES_SORTS_3 !== "undefined") tous = tous.concat(ORDRE_DES_SORTS_3);
	if (typeof ORDRE_DES_SORTS_2 !== "undefined") tous = tous.concat(ORDRE_DES_SORTS_2);
	if (typeof ORDRE_DES_SORTS_5 !== "undefined") tous = tous.concat(ORDRE_DES_SORTS_5);
	return tous;
}

/*
 * À quel chapitre appartient un sort, un lieu, une quête ? Dans le code, la Crypte porte le
 * numéro 2 et la panne le numéro 3 ; le joueur, lui, les voit dans l'ordre de l'histoire :
 * la panne est son chapitre 2, la Crypte son chapitre 3 (voir numeroAffiche).
 */
function chapitreDuSort(sort){
	if (typeof ORDRE_DES_SORTS_5 !== "undefined" && ORDRE_DES_SORTS_5.indexOf(sort) > -1) return 5;
	if (typeof ORDRE_DES_SORTS_3 !== "undefined" && ORDRE_DES_SORTS_3.indexOf(sort) > -1) return 3;
	return typeof ORDRE_DES_SORTS_2 !== "undefined" && ORDRE_DES_SORTS_2.indexOf(sort) > -1 ? 2 : 1;
}
function chapitreDeQuete(id){
	if (/^(d_|s_d_)/.test(id)) return 5;
	if (/^(r_|s_r_)/.test(id)) return 3;
	return /^(c_|s_c_|s_v_)/.test(id) ? 2 : 1;
}
function numeroAffiche(chapitre){
	if (chapitre === 5) return 4;
	return chapitre === 3 ? 2 : (chapitre === 2 ? 3 : 1);
}

GameState.prototype.nbSortsChapitre1 = function(){
	var n = 0;
	for (var i = 0; i < ORDRE_DES_SORTS.length; i++){ if (this.spells[ORDRE_DES_SORTS[i]]) n++; }
	return n;
};

GameState.prototype.knownSpells = function(){
	var connus = [];
	var tous = tousLesSorts();
	for (var i = 0; i < tous.length; i++){
		if (this.spells[tous[i]]) connus.push(tous[i]);
	}
	return connus;
};

GameState.prototype.learn = function(sort){
	if (this.spells[sort]) return;
	this.spells[sort] = true;
	var chapitre = chapitreDuSort(sort);
	if (chapitre === 2) this.xp2 += XP_SORT_APPRIS;
	else if (chapitre === 3) this.xp3 += XP_SORT_APPRIS;
	else if (chapitre === 5) this.xp5 += XP_SORT_APPRIS;
	else if (!this.has("chapitre1Saute")) this.xp += XP_SORT_APPRIS;
	jouerSon("sort");
	// Pas une ligne par sort : Shell.fin regroupe tous les sorts du tour sur une seule ligne.
	Shell.narration.push({ sort: sort, rpg: (chapitre === 3 || chapitre === 2 || chapitre === 5) && typeof nomRpg === "function" ? nomRpg(sort, chapitre) : "", resume: MANUEL[sort].resume });
	GameEvents.fire({ type: "learn", spell: sort });
};

/* ---------------- experience ---------------- */

GameState.prototype.gagner = function(points, raison, chapitre){
	// En mission cyber, le chapitre 1 n'est pas noté : ses petits gains ne s'affichent ni ne comptent.
	if (chapitre !== 2 && chapitre !== 3 && chapitre !== 5 && this.has("chapitre1Saute")) return;
	if (chapitre === 2) this.xp2 += points;
	else if (chapitre === 3) this.xp3 += points;
	else if (chapitre === 5) this.xp5 += points;
	else this.xp += points;
	this.gainsDuTour.push({ points: points, raison: raison });
};

GameState.prototype.premierUsage = function(sort){
	if (this.usages[sort]) return;
	this.usages[sort] = true;
	this.gagner(XP_PREMIER_USAGE, "premier " + sort, chapitreDuSort(sort));
};

GameState.prototype.visiter = function(lieu){
	if (!lieu.id || this.visited[lieu.id]) return;
	this.visited[lieu.id] = true;
	if (lieu.horsBareme) return;
	this.gagner(XP_NOUVEAU_LIEU, "nouveau lieu", lieu.chapitre === 2 || lieu.chapitre === 3 || lieu.chapitre === 5 ? lieu.chapitre : 1);
};

/* Lieux dans lesquels on peut réellement entrer (pas la Boite ni la Cage), chapitre par chapitre. */
function lieuxVisitables(chapitre){
	var lieux = [];
	for (var id in World.rooms){
		if (!World.rooms.hasOwnProperty(id)) continue;
		var lieu = World.rooms[id];
		if (lieu.atteignable || lieu.horsBareme || (lieu.chapitre || 1) !== (chapitre || 1)) continue;
		lieux.push(lieu);
	}
	return lieux;
}

/* Le barème de la Crypte (chapitre 3 pour le joueur) : elle a sa propre note. */
GameState.prototype.xpMax2 = function(){
	if (typeof QUETES_CHAPITRE2 === "undefined") return 1;
	return ORDRE_DES_SORTS_2.length * (XP_SORT_APPRIS + XP_PREMIER_USAGE) +
		lieuxVisitables(2).length * XP_NOUVEAU_LIEU +
		(QUETES_CHAPITRE2.length - 1) * XP_QUETE + XP_VICTOIRE +
		QUETES_SECONDAIRES_2.length * XP_QUETE_SECONDAIRE;
};

/* Le barème de la panne (chapitre 2 pour le joueur). */
GameState.prototype.xpMax3 = function(){
	if (typeof QUETES_PANNE === "undefined") return 1;
	return ORDRE_DES_SORTS_3.length * (XP_SORT_APPRIS + XP_PREMIER_USAGE) +
		lieuxVisitables(3).length * XP_NOUVEAU_LIEU +
		(QUETES_PANNE.length - 1) * XP_QUETE + XP_VICTOIRE +
		QUETES_SECONDAIRES_PANNE.length * XP_QUETE_SECONDAIRE;
};

/* Le barème de l'Académie des Arcanes (chapitre 4 pour le joueur). */
GameState.prototype.xpMax5 = function(){
	if (typeof QUETES_CH4 === "undefined") return 1;
	return ORDRE_DES_SORTS_5.length * (XP_SORT_APPRIS + XP_PREMIER_USAGE) +
		lieuxVisitables(5).length * XP_NOUVEAU_LIEU +
		(QUETES_CH4.length - 1) * XP_QUETE + XP_VICTOIRE +
		(typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4.length : 0) * XP_QUETE_SECONDAIRE;
};

/* Le barème et les malus d'un chapitre, quel qu'il soit. */
GameState.prototype.xpMaxDe = function(chapitre){
	if (chapitre === 5) return this.xpMax5();
	return chapitre === 2 ? this.xpMax2() : (chapitre === 3 ? this.xpMax3() : this.xpMax());
};

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
/* L'expérience qui compte pour la note : celle gagnée, moins le prix des indices. */
GameState.prototype.xpNet = function(chapitre){
	if (chapitre === 2) return Math.max(0, this.xp2 - this.malus2);
	if (chapitre === 3) return Math.max(0, this.xp3 - this.malus3);
	if (chapitre === 5) return Math.max(0, this.xp5 - this.malus5);
	return Math.max(0, this.xp - this.malus);
};

GameState.prototype.nbIndices = function(chapitre){
	var n = 0;
	for (var id in this.indices){
		if (this.indices.hasOwnProperty(id) && chapitreDeQuete(id) === (chapitre || 1)) n += this.indices[id];
	}
	return n;
};

GameState.prototype.note = function(chapitre){
	var max = this.xpMaxDe(chapitre);
	return Math.round(Math.min(1, this.xpNet(chapitre) / max) * 40) / 2;
};

/*
 * Le chapitre que le joueur est en train de jouer, numéroté comme dans le code : 1 (Terminus),
 * 3 (la panne, en entrant au BatimentB ou d'emblée pour le renfort réseau), 2 (la Crypte, en
 * y descendant ou d'emblée pour la mission cyber).
 */
GameState.prototype.chapitreEnCours = function(){
	if (this.quests["d_entree"] || this.has("ch4Ouvert") && this.has("ch4Direct")) return 5;
	if (this.quests["c_crypte"]) return 2;
	if (this.has("chapitre1Saute") && !this.has("panneDirecte")) return 2;
	if (this.quests["r_batiment"] || this.has("panneDirecte")) return 3;
	return 1;
};

/* L'étape de la quête principale en cours, ou null si tout est fait. */
GameState.prototype.queteEnCours = function(){
	for (var i = 0; i < QUETES_PRINCIPALES.length; i++){
		if (!this.quests[QUETES_PRINCIPALES[i].id]) return QUETES_PRINCIPALES[i];
	}
	// Les chapitres suivants : celui en cours d'abord.
	var listes = [];
	if (this.has("panneOuverte") && typeof QUETES_PANNE !== "undefined") listes.push(QUETES_PANNE);
	if (this.has("crypteOuverte") && typeof QUETES_CHAPITRE2 !== "undefined"){
		if (this.chapitreEnCours() === 2) listes.unshift(QUETES_CHAPITRE2);
		else listes.push(QUETES_CHAPITRE2);
	}
	if (this.has("ch4Ouvert") && typeof QUETES_CH4 !== "undefined"){
		if (this.chapitreEnCours() === 5) listes.unshift(QUETES_CH4);
		else listes.push(QUETES_CH4);
	}
	for (var l = 0; l < listes.length; l++){
		for (var j = 0; j < listes[l].length; j++){
			if (!this.quests[listes[l][j].id]) return listes[l][j];
		}
	}
	return null;
};

/*
 * Ce qui peut coincer un joueur sans qu'il le voie : indice le signale gratuitement,
 * quelle que soit l'étape en cours.
 */
GameState.prototype.diagnostics = function(){
	var constats = [];
	// Des rouages creux, faits avec touch au lieu de cp.
	var noms = ["rouage1", "rouage2", "rouage3", "rouage4", "rouage5"];
	var creux = noms.filter(function(n){ var r = ArtisanShop.getItemFromName(n); return r !== -1 && r.getText() === ""; });
	if (!this.has("FiveGearsCopied") && creux.length > 0){
		constats.push("Tes rouages " + creux.join(", ") + " sont creux : touch fabrique un objet vide. Efface-les (rm rouage*) et refais-les avec cp Rouage rouage1, et ainsi de suite.");
	}
	// Un alias qui porte le nom d'un vrai sort le remplace.
	for (var nomAlias in this.alias){
		if (this.alias.hasOwnProperty(nomAlias) && (tousLesSorts().indexOf(nomAlias) > -1)){
			constats.push("Ton alias « " + nomAlias + " » remplace le vrai sort " + nomAlias + " (il lance « " + this.alias[nomAlias] + " »). Pour le retirer : unalias " + nomAlias);
		}
	}
	if (typeof AuthorizedKeys !== "undefined" && this.has("crypteOuverte")){
		if (AuthorizedKeys.getText().indexOf(CLE_LAURENT) === -1){
			constats.push("La clé de Laurent a disparu des clés autorisées de root. Une copie de secours existe : sudo cp .ssh/authorized_keys.orig .ssh/authorized_keys (dans la Racine).");
		}
		if (this.clePublique && this.clePublique === this.cleGrillee){
			constats.push("Ta paire de clés SSH est grillée (tu as confié la clé privée) : refais-en une avec ssh-keygen, puis dépose la nouvelle clé publique.");
		}
		var dossier = Home.getChildFromName(".ssh");
		if (this.has("cleInstallee") && (dossier === -1 || dossier.getItemFromName("id_ed25519") === -1)){
			constats.push("Ta clé privée n'est plus dans ~/.ssh : le coffre ne te reconnaît plus. ssh-keygen, puis dépose la nouvelle clé publique dans la BoiteDeDepot.");
		}
	}
	return constats;
};

/* Les sorts cités dans un texte que le joueur ne connaît pas encore, avec l'endroit où les apprendre. */
GameState.prototype.sortsManquants = function(texte){
	var manquants = [], etat = this;
	// Des sorts qui sont aussi des mots français courants : on ne les repère pas dans une phrase.
	var ambigus = ["du", "sort", "top", "date", "id", "env", "tree", "cut"];
	tousLesSorts().forEach(function(sort){
		if (ambigus.indexOf(sort) > -1) return;
		var re = new RegExp("(^|[\\s(:,])" + sort.replace(/[-]/g, "\\-") + "(?=$|[\\s,.)])");
		if (!etat.knows(sort) && re.test(texte)) manquants.push("Il te manque le sort " + sort + ". " + Shell.ouApprendre(sort));
	});
	return manquants;
};

/* Le sort indice : rappelle l'indice gratuit, puis propose le palier suivant contre des points. */
GameState.prototype.demanderIndice = function(){
	var q = this.queteEnCours();
	if (!q){
		if (this.has("victoire") && !this.has("crypteOuverte") && !this.has("panneOuverte")) return "La quête principale est terminée. Relis Laurent, dans la Citadelle : son P.S. ouvre la suite.";
		return "Il n'y a plus d'étape en cours : la quête principale est terminée. Tape xp pour voir ce qui reste à gagner.";
	}
	var details = INDICES_DETAILLES[q.id] || (typeof INDICES_CHAPITRE2 !== "undefined" && INDICES_CHAPITRE2[q.id]) ||
		(typeof INDICES_PANNE !== "undefined" && INDICES_PANNE[q.id]) ||
		(typeof INDICES_CH4 !== "undefined" && INDICES_CH4[q.id]) || [];
	var pris = this.indices[q.id] || 0;
	var lignes = [C.jaune("Étape en cours : " + q.titre), C.gris("Indice gratuit : ") + q.indice];
	var constats = this.diagnostics();
	for (var c = 0; c < constats.length; c++) lignes.push(C.cyan("À noter : ") + constats[c]);
	for (var i = 0; i < pris && i < details.length; i++){
		lignes.push(C.gris("Indice " + (i + 2) + " (déjà payé) : ") + details[i]);
	}
	var manquantsDeja = pris > 0 ? this.sortsManquants(details.slice(0, pris).join(" ")) : [];
	for (var m = 0; m < manquantsDeja.length; m++) lignes.push(C.cyan("À noter : ") + manquantsDeja[m]);
	if (pris >= details.length){
		lignes.push(C.gris("Tu as déjà tous les indices de cette étape."));
		return lignes.join("\n");
	}
	var cout = COUT_INDICES[pris];
	var etat = this;
	say(lignes.join("\n"));
	term.demander("Un indice " + (pris === 0 ? "plus précis" : "qui donne la solution") + " coûte " + cout +
		" XP sur ta note. Tape oui pour le lire : ", false, function(reponse){
		if (String(reponse).trim().toLowerCase() !== "oui"){
			term.echo("Bien. Cherche encore un peu, tu y es presque.");
			return;
		}
		etat.indices[q.id] = pris + 1;
		var chapitre = chapitreDeQuete(q.id);
		if (chapitre === 2) etat.malus2 += cout;
		else if (chapitre === 3) etat.malus3 += cout;
		else if (chapitre === 5) etat.malus5 += cout;
		else etat.malus += cout;
		var max = etat.xpMaxDe(chapitre);
		var deja = chapitre === 2 ? etat.malus2 : (chapitre === 3 ? etat.malus3 : (chapitre === 5 ? etat.malus5 : etat.malus));
		var manquants = etat.sortsManquants(details[pris]);
		term.echo(C.cyan("Indice " + (pris + 2) + " : ") + details[pris] + "\n" +
			(manquants.length ? manquants.map(function(t){ return C.cyan("À noter : ") + t; }).join("\n") + "\n" : "") + C.gris("-" + cout + " XP sur la note" + (chapitre !== 1 ? " du chapitre " + numeroAffiche(chapitre) : "") + ". Note maximale encore possible : " +
			String(Math.round(Math.min(1, (max - deja) / max) * 40) / 2).replace(".", ",") + " / 20."));
		etat.save();
		if (typeof majEtat === "function") majEtat();
	});
	return "";
};

GameState.prototype.noteTexte = function(chapitre){
	return String(this.note(chapitre)).replace(".", ",") + " / 20";
};

GameState.prototype.mention = function(chapitre){
	var n = this.note(chapitre);
	if (n >= 18) return "Félicitations du jury";
	if (n >= 16) return "Très bien";
	if (n >= 14) return "Bien";
	if (n >= 12) return "Assez bien";
	if (n >= 10) return "Passable";
	return "Admis de justesse (mais root quand même)";
};

/* Une ligne par bloc de compétences : note sur 20 et état. */
GameState.prototype.bulletin = function(){
	var lignes = [];
	for (var i = 0; i < BLOCS_DE_COMPETENCES.length; i++){
		var bloc = BLOCS_DE_COMPETENCES[i], points = 0, utilises = 0;
		for (var k = 0; k < bloc.sorts.length; k++){
			if (this.spells[bloc.sorts[k]]) points += 0.5;
			if (this.usages[bloc.sorts[k]]){ points += 0.5; utilises++; }
		}
		var note = Math.round(points / bloc.sorts.length * 40) / 2;
		var etat = utilises === bloc.sorts.length ? "acquis" : (points > 0 ? "en cours d'acquisition" : "non évalué");
		lignes.push("  " + bloc.code + "  " + completerDroite(bloc.titre, 33) + completerGauche(String(note).replace(".", ","), 4) + " / 20   " + etat);
	}
	return lignes;
};

GameState.prototype.texteDuBulletin = function(){
	var lignes = [C.gras("BULLETIN · relevé de compétences"), ""].concat(this.bulletin());
	lignes.push("");
	lignes.push("  " + completerDroite("Moyenne générale (voir xp)", 40) + completerGauche(String(this.note()).replace(".", ","), 4) + " / 20   " +
		(this.has("victoire") ? this.mention() : "épreuve en cours"));
	lignes.push("");
	lignes.push(C.gris("Un bloc est acquis quand chacun de ses sorts a été appris puis lancé au moins une fois."));
	var manquants = [];
	for (var i = 0; i < BLOCS_DE_COMPETENCES.length; i++){
		for (var k = 0; k < BLOCS_DE_COMPETENCES[i].sorts.length; k++){
			var sort = BLOCS_DE_COMPETENCES[i].sorts[k];
			if (this.spells[sort] && !this.usages[sort]) manquants.push(sort);
		}
	}
	if (manquants.length > 0) lignes.push(C.gris("Sorts connus mais jamais lancés : " + manquants.join(", ")));
	return lignes.join("\n");
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
		Shell.narration.push({ xp: total });
		this.gainsDuTour = [];
	}
	var n = this.niveau();
	if (n > this.niveauAnnonce && !this.has("chapitre1Saute")){
		this.niveauAnnonce = n;
		jouerSon("niveau");
		say(C.cyan("▲ Niveau " + n + " : " + NIVEAUX[n - 1].titre + " !") +
			(n === NIVEAUX.length ? " Il n'y a plus rien au-dessus." : ""));
	}
};

function barre(part, largeur){
	var pleines = Math.round(part * largeur);
	return "[" + new Array(pleines + 1).join("#") + new Array(largeur - pleines + 1).join(".") + "]";
}

GameState.prototype.tableauXP = function(){
	// En renfort, le chapitre 1 ne compte pas : seuls les chapitres joués s'affichent.
	if (this.has("chapitre1Saute") && typeof QUETES_CHAPITRE2 !== "undefined"){
		var blocs = [C.gras("EXPÉRIENCE"), "", C.gris("Renfort : le chapitre 1 n'est pas joué ni noté pour toi."), ""];
		if (this.has("panneOuverte") && typeof QUETES_PANNE !== "undefined") blocs.push(this.tableauXP3(), "");
		if (this.has("crypteOuverte")) blocs.push(this.tableauXP2(), "");
		if (this.has("ch4Ouvert") && typeof QUETES_CH4 !== "undefined") blocs.push(this.tableauXP5(), "");
		return blocs.concat([C.gris("Temps de jeu : " + this.tempsTexte() + ". Sorts lancés : " + this.nbCommandes + "."),
			C.gris("Barème : " + XP_QUETE + " XP par étape (" + XP_VICTOIRE + " pour la dernière), " + XP_QUETE_SECONDAIRE + " par quête secondaire, " +
				XP_SORT_APPRIS + " par sort appris, " + XP_PREMIER_USAGE + " la première fois qu'on s'en sert, " + XP_NOUVEAU_LIEU + " par lieu découvert.")]).join("\n");
	}
	var pr = this.progression();
	var principales = 0, i;
	for (i = 0; i < QUETES_PRINCIPALES.length; i++){ if (this.quests[QUETES_PRINCIPALES[i].id]) principales++; }
	var secondaires = this.nbSecondaires();
	var appris = this.nbSortsChapitre1() - SORTS_DE_DEPART.length;
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
		"Total : " + C.gras(pr.xp + " XP") + " sur " + pr.max + " possibles.   " + (this.has("chapitre1Saute") ?
			C.gris("Pas de note : chapitre 1 non joué (mission cyber).") :
			"Note " + (this.has("victoire") ? "finale" : "provisoire") + " : " + C.gras(this.noteTexte())),
		"",
		C.gras("D'où viennent tes XP"),
		ligne("Quêtes principales", principales, QUETES_PRINCIPALES.length, xpPrincipales),
		ligne("Quêtes secondaires", secondaires, QUETES_SECONDAIRES.length, secondaires * XP_QUETE_SECONDAIRE),
		ligne("Sorts appris", appris, ORDRE_DES_SORTS.length - SORTS_DE_DEPART.length, appris * XP_SORT_APPRIS),
		ligne("Premières utilisations", utilises, ORDRE_DES_SORTS.length, utilises * XP_PREMIER_USAGE),
		ligne("Lieux découverts", visites, lieux.length - 1, visites * XP_NOUVEAU_LIEU),
		""
	];
	if (this.malus > 0){
		lignes.push(C.jaune("Indices payants : " + this.nbIndices() + ", soit -" + this.malus + " XP sur la note (" + this.xpNet() + " XP retenus)."));
		lignes.push("");
	}
	if (oublies.length > 0) lignes.push("Sorts appris mais jamais lancés : " + oublies.join(", "));
	var aVoir = lieuxAVoir(this, 1);
	if (aVoir.lignes) lignes.push(aVoir.lignes);
	if (this.has("panneOuverte") && typeof QUETES_PANNE !== "undefined") lignes.push("", this.tableauXP3(), "");
	if (this.has("crypteOuverte") && typeof QUETES_CHAPITRE2 !== "undefined") lignes.push("", this.tableauXP2(), "");
	if (this.has("ch4Ouvert") && typeof QUETES_CH4 !== "undefined") lignes.push("", this.tableauXP5(), "");
	lignes.push(C.gris("Temps de jeu : " + this.tempsTexte() + ". Sorts lancés : " + this.nbCommandes + "."));
	lignes.push(C.gris("Barème : " + XP_QUETE + " XP par étape de la quête principale (" + XP_VICTOIRE + " pour la dernière), " +
		XP_QUETE_SECONDAIRE + " par quête secondaire, " + XP_SORT_APPRIS + " par sort appris, " +
		XP_PREMIER_USAGE + " la première fois qu'on s'en sert, " + XP_NOUVEAU_LIEU + " par lieu découvert."));
	return lignes.join("\n");
};

/*
 * Les lieux pas encore visités qu'on peut deviner : ceux qui touchent un lieu déjà visité.
 * Les autres restent une surprise, on dit seulement combien il en reste.
 */
function lieuxAVoir(etat, chapitre){
	var proches = [], caches = 0;
	lieuxVisitables(chapitre).forEach(function(lieu){
		if (etat.visited[lieu.id] || lieu === Home) return;
		var parent = lieu.parents[0];
		var voisin = parent && etat.visited[parent.id] && (parent.children.indexOf(lieu) > -1);
		var machine = typeof racineDe === "function" ? racineDe(lieu) : null;
		if (machine === lieu && typeof Machines !== "undefined" && lieu.parents[0] === Machines){
			// Une machine du réseau : on y entre par ssh, une fois le réseau découvert (ou la panne commencée, pour les siennes).
			if (etat.has("reseauCartographie") || (lieu.chapitre === 3 && etat.quests["r_batiment"]) || (lieu.chapitre === 5 && etat.has("ch4Ouvert"))) proches.push("la machine " + lieu.room_name + C.gris(" (ssh " + lieu.room_name + ")"));
			else caches++;
			return;
		}
		if (machine === lieu){
			if (voisin) proches.push(lieu.room_name + C.gris(" (dans " + parent.room_name + ")"));
			else caches++;
			return;
		}
		if (machine && voisin){ proches.push(machine.racineHote + ":" + Shell.cheminAffiche(lieu)); return; }
		if (voisin) proches.push(lieu.room_name + C.gris(" (dans " + parent.room_name + ")"));
		else caches++;
	});
	var texte = "";
	if (proches.length) texte = "Lieux pas encore visités, à côté de lieux connus : " + proches.join(", ");
	if (caches) texte += (texte ? "\n" : "") + C.gris("Et " + caches + " lieu" + (caches > 1 ? "x" : "") + " encore " + (caches > 1 ? "cachés" : "caché") + " plus loin.");
	return { lignes: texte };
}

GameState.prototype.tableauXP3 = function(){
	var principales = QUETES_PANNE.filter(function(q){ return this.quests[q.id]; }, this).length;
	var secondaires = QUETES_SECONDAIRES_PANNE.filter(function(q){ return this.quests[q.id]; }, this).length;
	var appris = ORDRE_DES_SORTS_3.filter(function(x){ return this.spells[x]; }, this).length;
	var utilises = ORDRE_DES_SORTS_3.filter(function(x){ return this.usages[x]; }, this).length;
	var lieux = lieuxVisitables(3), visites = lieux.filter(function(l){ return this.visited[l.id]; }, this).length;
	function ligne(nom, fait, total){
		return "  " + completerDroite(nom, 22) + completerGauche(fait + " / " + total, 8);
	}
	var lignes = [
		C.gras("CHAPITRE 2 : LA PANNE") + "   " + C.gras(this.xpNet(3) + " XP") + " sur " + this.xpMax3() + "   Note : " + C.gras(this.noteTexte(3)),
		ligne("Quêtes principales", principales, QUETES_PANNE.length),
		ligne("Quêtes secondaires", secondaires, QUETES_SECONDAIRES_PANNE.length),
		ligne("Sorts appris", appris, ORDRE_DES_SORTS_3.length),
		ligne("Premières utilisations", utilises, ORDRE_DES_SORTS_3.length),
		ligne("Lieux découverts", visites, lieux.length)
	];
	var aVoir = lieuxAVoir(this, 3);
	if (aVoir.lignes) lignes.push("  " + aVoir.lignes.replace(/\n/g, "\n  "));
	if (this.malus3 > 0) lignes.push(C.jaune("  Indices payants : " + this.nbIndices(3) + ", soit -" + this.malus3 + " XP sur la note du chapitre."));
	return lignes.join("\n");
};

GameState.prototype.tableauXP2 = function(){
	var principales = QUETES_CHAPITRE2.filter(function(q){ return this.quests[q.id]; }, this).length;
	var secondaires = QUETES_SECONDAIRES_2.filter(function(q){ return this.quests[q.id]; }, this).length;
	var appris = ORDRE_DES_SORTS_2.filter(function(x){ return this.spells[x]; }, this).length;
	var utilises = ORDRE_DES_SORTS_2.filter(function(x){ return this.usages[x]; }, this).length;
	var lieux = lieuxVisitables(2), visites = lieux.filter(function(l){ return this.visited[l.id]; }, this).length;
	function ligne(nom, fait, total){
		return "  " + completerDroite(nom, 22) + completerGauche(fait + " / " + total, 8);
	}
	var lignes = [
		C.gras("CHAPITRE 3 : LA CRYPTE") + "   " + C.gras(this.xpNet(2) + " XP") + " sur " + this.xpMax2() + "   Note : " + C.gras(this.noteTexte(2)),
		ligne("Quêtes principales", principales, QUETES_CHAPITRE2.length),
		ligne("Quêtes secondaires", secondaires, QUETES_SECONDAIRES_2.length),
		ligne("Sorts appris", appris, ORDRE_DES_SORTS_2.length),
		ligne("Premières utilisations", utilises, ORDRE_DES_SORTS_2.length),
		ligne("Lieux découverts", visites, lieux.length)
	];
	var aVoir = lieuxAVoir(this, 2);
	if (aVoir.lignes) lignes.push("  " + aVoir.lignes.replace(/\n/g, "\n  "));
	if (this.malus2 > 0) lignes.push(C.jaune("  Indices payants : " + this.nbIndices(2) + ", soit -" + this.malus2 + " XP sur la note du chapitre."));
	return lignes.join("\n");
};

GameState.prototype.tableauXP5 = function(){
	var principales = QUETES_CH4.filter(function(q){ return this.quests[q.id]; }, this).length;
	var secondaires = (typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4 : []).filter(function(q){ return this.quests[q.id]; }, this).length;
	var totalSec = typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4.length : 0;
	var appris = ORDRE_DES_SORTS_5.filter(function(x){ return this.spells[x]; }, this).length;
	var utilises = ORDRE_DES_SORTS_5.filter(function(x){ return this.usages[x]; }, this).length;
	var lieux = lieuxVisitables(5), visites = lieux.filter(function(l){ return this.visited[l.id]; }, this).length;
	function ligne(nom, fait, total){
		return "  " + completerDroite(nom, 22) + completerGauche(fait + " / " + total, 8);
	}
	var lignes = [
		C.gras("CHAPITRE 4 : L'ACADÉMIE DES ARCANES") + "   " + C.gras(this.xpNet(5) + " XP") + " sur " + this.xpMax5() + "   Note : " + C.gras(this.noteTexte(5)),
		ligne("Quêtes principales", principales, QUETES_CH4.length),
		ligne("Quêtes secondaires", secondaires, totalSec),
		ligne("Sorts appris", appris, ORDRE_DES_SORTS_5.length),
		ligne("Premières utilisations", utilises, ORDRE_DES_SORTS_5.length),
		ligne("Lieux découverts", visites, lieux.length)
	];
	var aVoir = lieuxAVoir(this, 5);
	if (aVoir.lignes) lignes.push("  " + aVoir.lignes.replace(/\n/g, "\n  "));
	if (this.malus5 > 0) lignes.push(C.jaune("  Indices payants : " + this.nbIndices(5) + ", soit -" + this.malus5 + " XP sur la note du chapitre."));
	return lignes.join("\n");
};

GameState.prototype.texteDuCertificat5 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre5 || 0)) / 60000);
	var totalSec = typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4.length : 0;
	var secFaites = (typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4 : []).filter(function(q){ return this.quests[q.id]; }, this).length;
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT AVANCÉ (L'ACADÉMIE DES ARCANES)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir, en une nuit, mesuré l'ampleur d'une fuite, minimisé\n" +
		"  les données transmises, croisé des listes, mis en quarantaine,\n" +
		"  désamorcé une bombe logique, restauré les archives, appliqué un\n" +
		"  correctif, écrit un script contre un script, et rédigé le retour\n" +
		"  d'expérience, le tout en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 4  : " + this.xpNet(5) + " XP sur " + this.xpMax5() + "\n" +
		"  NOTE                 : " + this.noteTexte(5) + "\n" +
		"  Mention              : " + this.mention(5) + "\n" +
		"  Sorts avancés        : " + ORDRE_DES_SORTS_5.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_5.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus5 ? this.nbIndices(5) + " (-" + this.malus5 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat5() + "\n" +
		"==================================";
};

GameState.prototype.codeDuCertificat5 = function(){
	var f = this.compteursFiges(5, this.xpNet(5), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre5 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(5), max: this.xpMax5(), note: this.note(5),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(5), chapitre: 5,
		date: this.dateVictoire5 || dateDuJour(), graine: PROFIL.graine
	});
};

GameState.prototype.texteDuCertificat = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre2 || 0)) / 60000);
	return "" +
		"==================================\n" +
		"         CYBERSUP · CERTIFICAT DE DÉFENSE DU SYSTÈME\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir repéré un programme trafiqué, décodé un message caché,\n" +
		"  trouvé et désarmé une porte SUID, coupé une écoute réseau,\n" +
		"  révoqué une clé SSH et démasqué l'intrus, le tout en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 3  : " + this.xpNet(2) + " XP sur " + this.xpMax2() + "\n" +
		"  NOTE                 : " + this.noteTexte(2) + "\n" +
		"  Mention              : " + this.mention(2) + "\n" +
		"  Sorts de sécurité    : " + ORDRE_DES_SORTS_2.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_2.length + "\n" +
		"  Quêtes secondaires   : " + QUETES_SECONDAIRES_2.filter(function(q){ return this.quests[q.id]; }, this).length + " sur " + QUETES_SECONDAIRES_2.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus2 ? this.nbIndices(2) + " (-" + this.malus2 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat() + "\n" +
		"==================================";
};

/*
 * Le code ne change pas d'une lecture à l'autre : le nombre de sorts et le temps sont relevés
 * au moment où le score a bougé pour la dernière fois.
 */
GameState.prototype.compteursFiges = function(chapitre, score, commandes, minutes){
	this.codesFiges = this.codesFiges || {};
	var f = this.codesFiges[chapitre];
	if (!f || f.score !== score) f = this.codesFiges[chapitre] = { score: score, commandes: commandes, minutes: minutes };
	return f;
};

GameState.prototype.codeDuCertificat = function(){
	var f = this.compteursFiges(2, this.xpNet(2), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre2 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(2), max: this.xpMax2(), note: this.note(2),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(2), chapitre: 2,
		date: this.dateVictoire2 || dateDuJour(), graine: PROFIL.graine
	});
};

/* Coupe une liste trop longue pour un certificat en lignes d'au plus « largeur » caractères. */
function couperEnLignes(texte, largeur, separateur){
	var lignes = [""];
	texte.split(" ").forEach(function(mot){
		var l = lignes[lignes.length - 1];
		if (l.length && l.length + 1 + mot.length > largeur) lignes.push(mot);
		else lignes[lignes.length - 1] = l ? l + " " + mot : mot;
	});
	return lignes.join(separateur);
}

/* Le certificat de la panne (chapitre 2 pour le joueur). */
GameState.prototype.texteDuCertificatReseau = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre3 || 0)) / 60000);
	return "" +
		"==================================\n" +
		"       CYBERSUP · CERTIFICAT D'ADMINISTRATION RÉSEAU\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  pour avoir remis en route le réseau de l'école, couche par couche :\n" +
		"  le lien, l'adresse, la route, les noms, le DHCP, la configuration\n" +
		"  permanente, le serveur web, l'horloge, le pare-feu et le routage,\n" +
		"  fermé un telnet oublié, puis rendu son Wi-Fi à l'Annexe (radio,\n" +
		"  faux point d'accès, DHCP, routage, DNS, switch et débit),\n" +
		"  le tout en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 2  : " + this.xpNet(3) + " XP sur " + this.xpMax3() + "\n" +
		"  NOTE                 : " + this.noteTexte(3) + "\n" +
		"  Mention              : " + this.mention(3) + "\n" +
		"  Sorts réseau         : " + ORDRE_DES_SORTS_3.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_3.length + "\n" +
		"  Quêtes secondaires   : " + QUETES_SECONDAIRES_PANNE.filter(function(q){ return this.quests[q.id]; }, this).length + " sur " + QUETES_SECONDAIRES_PANNE.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus3 ? this.nbIndices(3) + " (-" + this.malus3 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Radia, M1 réseau (campus de Marseille)\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificatReseau() + "\n" +
		"==================================";
};

GameState.prototype.codeDuCertificatReseau = function(){
	var f = this.compteursFiges(3, this.xpNet(3), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre3 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(3), max: this.xpMax3(), note: this.note(3),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(3), chapitre: 3,
		date: this.dateVictoire3 || dateDuJour(), graine: PROFIL.graine
	});
};

/* ---------------- quetes ---------------- */

function trouverQuete(id){
	var toutes = QUETES_PRINCIPALES.concat(QUETES_SECONDAIRES);
	if (typeof QUETES_CHAPITRE2 !== "undefined") toutes = toutes.concat(QUETES_CHAPITRE2, QUETES_SECONDAIRES_2);
	if (typeof QUETES_PANNE !== "undefined") toutes = toutes.concat(QUETES_PANNE, QUETES_SECONDAIRES_PANNE);
	if (typeof QUETES_CH4 !== "undefined") toutes = toutes.concat(QUETES_CH4, typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4 : []);
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
	var principale = id.charAt(0) === "m" || id.indexOf("c_") === 0 || id.indexOf("r_") === 0 || id.indexOf("d_") === 0;
	var finale = id === "m_boss" || id === "c_rapport" || id === "r_fin" || id === "d_fin";
	var points = principale ? (finale ? XP_VICTOIRE : XP_QUETE) : XP_QUETE_SECONDAIRE;
	var chapitre = chapitreDeQuete(id);
	if (chapitre === 2) this.xp2 += points;
	else if (chapitre === 3) this.xp3 += points;
	else if (chapitre === 5) this.xp5 += points;
	else if (!this.has("chapitre1Saute")) this.xp += points;
	else points = 0;
	if (principale) this.chronos[id] = this.tempsMs;
	jouerSon(finale ? "victoire" : "quete");
	say(C.jaune("★ " + (principale ? "Quête accomplie" : "Quête secondaire accomplie") + " : " + quete.titre) + (points ? C.gris("  +" + points + " XP") : ""));
};

GameState.prototype.nbSecondaires = function(){
	var n = 0;
	for (var i = 0; i < QUETES_SECONDAIRES.length; i++){
		if (this.quests[QUETES_SECONDAIRES[i].id]) n++;
	}
	return n;
};

GameState.prototype.journal = function(detail){
	var lignes = [C.gras("JOURNAL DE QUÊTES"), ""];
	// Après le chapitre 1, il se replie sur une ligne (quetes 1 le déplie).
	var replie = this.chapitreEnCours() !== 1 && detail !== "1";
	if (replie){
		lignes.push(C.gras("Chapitre 1 : Terminus") + "   " + (this.has("chapitre1Saute") ? C.gris("non joué (renfort)") :
			C.vert("terminé") + C.gris(", quêtes secondaires " + this.nbSecondaires() + " sur " + QUETES_SECONDAIRES.length)) +
			C.gris("   (détail : quetes 1)"));
	}
	lignes.push(C.gras("Quête principale"));
	var enCours = false;
	for (var i = 0; i < QUETES_PRINCIPALES.length && !replie; i++){
		var q = QUETES_PRINCIPALES[i];
		if (this.quests[q.id]){
			lignes.push("  " + C.vert("[x]") + " " + q.titre);
		} else if (!enCours){
			enCours = true;
			lignes.push("  " + C.jaune("[ ] " + q.titre));
			lignes.push(C.gris("      Indice : " + q.indice));
			lignes.push(C.gris("      Toujours bloqué ? Le sort indice en donne de plus précis, contre quelques points."));
		}
	}
	if (replie) lignes.pop();
	if (!enCours && !replie) lignes.push("  " + C.vert("Terminée. Le monde reste ouvert : il te reste peut-être des choses à découvrir."));
	if (!replie){
		lignes.push("");
		lignes.push(C.gras("Quêtes secondaires") + " (" + this.nbSecondaires() + " accomplie" + (this.nbSecondaires() > 1 ? "s" : "") + " sur " + QUETES_SECONDAIRES.length + ")");
	}
	var inconnues = 0;
	for (var j = 0; j < QUETES_SECONDAIRES.length && !replie; j++){
		var s = QUETES_SECONDAIRES[j];
		if (this.quests[s.id]) lignes.push("  " + C.vert("[x]") + " " + s.titre);
		else if (this.seen[s.id]) lignes.push("  [ ] " + s.titre);
		else inconnues++;
	}
	if (inconnues > 0){
		lignes.push(C.gris("  ... et " + inconnues + " autre" + (inconnues > 1 ? "s" : "") + " à découvrir en parlant aux habitants et en fouillant partout."));
	}
	if (this.has("panneOuverte") && typeof QUETES_PANNE !== "undefined"){
		this.sectionDuJournal(lignes, 3, "Chapitre 2 : la panne", QUETES_PANNE, QUETES_SECONDAIRES_PANNE,
			"Terminé. Ton CertificatReseau t'attend dans ta Maison : cat ~/CertificatReseau");
	}
	if (this.has("crypteOuverte") && typeof QUETES_CHAPITRE2 !== "undefined"){
		this.sectionDuJournal(lignes, 2, "Chapitre 3 : la Crypte", QUETES_CHAPITRE2, QUETES_SECONDAIRES_2,
			"Terminé. Ton CertificatCyber t'attend dans ta Maison : cat ~/CertificatCyber");
	}
	if (this.has("ch4Ouvert") && typeof QUETES_CH4 !== "undefined"){
		this.sectionDuJournal(lignes, 5, "Chapitre 4 : l'Académie des Arcanes", QUETES_CH4,
			typeof QUETES_SECONDAIRES_CH4 !== "undefined" ? QUETES_SECONDAIRES_CH4 : [],
			"Terminé. Ton CertificatAvance t'attend dans ta Maison : cat ~/CertificatAvance");
	}
	lignes.push("");
	var pr = this.progression();
	if (!this.has("chapitre1Saute")) lignes.push(C.cyan("Niveau " + pr.niveau + " : " + pr.titre) + C.gris("   " + pr.xp + " XP sur " + pr.max + " (détail : xp)"));
	lignes.push(C.gris("Sorts appris : " + this.knownSpells().length + " sur " + tousLesSorts().length + ". Sorts lancés : " + this.nbCommandes + "."));
	return lignes.join("\n");
};

/* Un chapitre dans le journal : ses étapes, l'étape en cours avec son indice, ses quêtes secondaires et sa note. */
GameState.prototype.sectionDuJournal = function(lignes, chapitre, titre, quetes, secondaires, fin){
	lignes.push("");
	lignes.push(C.gras(titre));
	var enCours = false;
	for (var c = 0; c < quetes.length; c++){
		var q = quetes[c];
		if (this.quests[q.id]){
			lignes.push("  " + C.vert("[x]") + " " + q.titre);
		} else if (!enCours){
			enCours = true;
			lignes.push("  " + C.jaune("[ ] " + q.titre));
			lignes.push(C.gris("      Indice : " + q.indice));
		}
	}
	if (!enCours) lignes.push("  " + C.vert(fin));
	var faites = secondaires.filter(function(q){ return this.quests[q.id]; }, this).length;
	lignes.push(C.gras("  Quêtes secondaires du chapitre " + numeroAffiche(chapitre)) + " (" + faites + " sur " + secondaires.length + ")");
	var inconnues = 0;
	for (var d = 0; d < secondaires.length; d++){
		var s2 = secondaires[d];
		if (this.quests[s2.id]) lignes.push("    " + C.vert("[x]") + " " + s2.titre);
		else if (this.seen[s2.id]) lignes.push("    [ ] " + s2.titre);
		else inconnues++;
	}
	if (inconnues > 0 && chapitre === 5) lignes.push(C.gris("    ... et " + inconnues + " autre" + (inconnues > 1 ? "s" : "") + " : les défis des maîtres, à découvrir en leur parlant aile par aile."));
	if (inconnues > 0 && chapitre === 3) lignes.push(C.gris("    ... et " + inconnues + " autre" + (inconnues > 1 ? "s" : "") + " à découvrir dans les notes des machines."));
	lignes.push(C.cyan("  Note du chapitre " + numeroAffiche(chapitre) + " : " + this.noteTexte(chapitre)) + C.gris("   " + this.xpNet(chapitre) + " XP sur " + this.xpMaxDe(chapitre)));
};

GameState.prototype.texteDuDiplome = function(){
	if (this.has("chapitre1Saute")){
		return "==================================\n" +
			"            CYBERSUP · DIPLÔME DE MAGE DU TERMINAL\n" +
			"==================================\n\n" +
			"  Chapitre 1 non passé : accès direct au chapitre " + (this.has("panneDirecte") ? "2" : "3") + ".\n" +
			"  Pas de note pour ce chapitre. " + (this.has("panneDirecte") ?
				"Celle du chapitre 2 figurera sur\n  le CertificatReseau, à gagner au BatimentB de Cybersup.\n\n" :
				"Celle du chapitre 3 figurera sur\n  le CertificatCyber, à gagner sous la Citadelle (cd Crypte).\n\n") +
			"==================================";
	}
	var pr = this.progression();
	var complet = this.xp >= pr.max;
	return "" +
		"==================================\n" +
		"            CYBERSUP · DIPLÔME DE MAGE DU TERMINAL\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + "\n" +
		"\n" +
		"  promo B1 de Cybersup, pour avoir vaincu le Sorcier Noir\n" +
		"  lors de l'épreuve pratique de Terminus, armé d'un simple terminal.\n" +
		"\n" +
		"  SCORE FINAL         : " + this.xpNet() + " XP sur " + pr.max + "\n" +
		"  NOTE                : " + this.noteTexte() + "\n" +
		"  Mention             : " + this.mention() + "\n" +
		"  Niveau atteint      : " + pr.niveau + " sur " + NIVEAUX.length + ", " + pr.titre + "\n" +
		"\n" +
		"  Relevé de compétences\n" + this.bulletin().join("\n") + "\n" +
		"\n" +
		"  Sorts maîtrisés     : " + this.nbSortsChapitre1() + " sur " + ORDRE_DES_SORTS.length + "\n" +
		"  Quêtes secondaires  : " + this.nbSecondaires() + " sur " + QUETES_SECONDAIRES.length + "\n" +
		"  Sorts lancés        : " + this.nbCommandes + "\n" +
		"  Temps de jeu        : " + this.tempsTexte() + "\n" +
		"  Indices payants     : " + (this.malus ? this.nbIndices() + " (-" + this.malus + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          (et Sorcier Noir à ses heures)\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuDiplome() + "\n" +
		"==================================" +
		(this.nom ? "" : "\n(Pour faire figurer ton nom sur le diplôme, va signer le LivreDOr de la Taverne.)") +
		(complet ? "" : "\n(La note peut encore monter : le diplôme se met à jour tout seul. Tape xp pour voir où il reste des points à prendre.)");
};


/* Le code qui résume la partie : le formateur le vérifie avec verifier CODE. */
GameState.prototype.codeDuDiplome = function(){
	var f = this.compteursFiges(1, this.xpNet(), this.nbCommandes, Math.round(this.tempsMs / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(), max: this.xpMax(), note: this.note(),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(), chapitre: PROFIL.chapitre || 1,
		date: this.dateVictoire || dateDuJour(), graine: PROFIL.graine
	});
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
    	case "attaquantIdentifie":
    		say("Grace tape l'adresse sur son clavier. « " + ADRESSE_ATTAQUANT + "... Attends. Ce n'est pas une adresse de l'extérieur : \
c'est une machine de chez nous. Regarde hotes.txt, en SalleReseau : elle s'appelle citadelle. L'attaque part de l'intérieur de Terminus.\n\
Et tu as vu la toute dernière ligne du journal ? Il a fini par entrer... avec le compte de Laurent. \
Soit on lui a volé son mot de passe, soit... Non. Non, rien. Trouve cette citadelle. »");
    		CheffeDeQuart.addCmdText("less", "« Bien joué pour l'adresse. On sait maintenant d'où vient l'attaque : la machine citadelle, \
quelque part au fond de Terminus. D'ici, on ne peut rien contre elle : nos comptes sont verrouillés. Toi, tu peux y aller. \
On te suit sur l'EcranMural. »");
    		this.complete("s_soc");
    		break;
    	case "inventaireFait":
    		poser(BDE, Autocollant);
    		say("« " + NB_SWEATS + " ! Pile ce que j'aurais dit, à quelques dizaines près. » Ada fouille dans un carton. \
« Tiens, ton Autocollant. Et passe jeudi à l'afterwork, il y aura des pizzas. »");
    		this.complete("s_bde");
    		break;
    	case "campusVisites":
    		say("Lille et Marseille : les trois campus de l'école te connaissent désormais, et tu n'as pas usé une semelle.");
    		this.complete("s_campus");
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
    		if (!this.dateVictoire) this.dateVictoire = dateDuJour();
    		Citadelle.removeItem(SorcierNoir);
    		poser(Citadelle, Laurent);
    		poser(Citadelle, Diplome);
    		Citadelle.changeIntroText("La Citadelle n'a plus rien de menaçant : le grand terminal affiche un fond d'écran avec un pingouin. \
Laurent t'y attend ; sa cape noire est posée sur une chaise.");
    		relier(Citadelle, Paradise);
    		BureauDeLaurent.mode = "rwxr-xr-x";
    		poser(BureauDeLaurent, MotDeLaurent);
    		poser(BureauDeLaurent, Credits);
    		var agenda = BureauDeLaurent.getItemFromName("Agenda");
    		if (agenda !== -1) agenda.mode = "rw-r--r--";
    		if (EasternMountains.removeItem(OldMan)) poser(EasternMountains, MotDuVieilHomme);
    		EasternMountains.changeIntroText("Tu suis un sentier de montagne qui finit par te mener à l'entrée d'une grotte. \
Le rocher où s'asseyait le vieil homme est vide.");
    		// Le rideau tombe : les habitants de Terminus n'ont plus de rôle à tenir.
    		Tavernier.addCmdText("less", "Le tavernier a tombé le tablier. « Examen terminé, je peux arrêter de faire semblant de savoir tirer une bière. \
Ken, promo d'il y a trois ans, aujourd'hui analyste dans un centre d'opérations de sécurité. Laurent rappelle toujours quelques anciens \
pour jouer les habitants. Et entre nous : trier, compter, repérer celui qui revient trop souvent, c'est exactement ce que je fais \
toute la journée, avec les mêmes sorts. Sauf que ce ne sont pas des chopes. »");
    		Librarian.addCmdText("less", "« Tu peux m'appeler Barbara. Je ne suis pas vraiment bibliothécaire : je donne le cours d'analyse de journaux \
aux B3, et Laurent m'a demandé de garder un œil sur Grep. C'est plutôt lui qui me surveille. » Grep hausse les épaules. « Greeep. »");
    		Vendor.addCmdText("less", "Le marchand retire ses dents en or : un dentier de farces et attrapes. « Tim, M1, trésorier du BDE. \
Laurent m'a donné le rôle parce que j'ai, paraît-il, une tête à vendre des sorts. Si tu veux un vrai sweat, la boutique est au local du BDE, à l'école. »");
    		Artisan.addCmdText("less", "« Annie. Dans la vraie vie, je viens le jeudi parler d'automatisation aux M1 : tout ce qu'on fait deux fois, \
on l'écrit dans un script. Tu l'as vu avec le dragon. Les horloges, en revanche, sont vraiment à moi. »");
    		Farmer.addCmdText("less", "« Alan, B2, en alternance chez un hébergeur. Le coup de l'épi unique, c'est moi qui l'ai proposé : \
chez nous, on appelle ça ne pas avoir de sauvegarde. Depuis, j'en fais deux. »");
    		CheffeDeQuart.addCmdText("less", "« C'était TOI, dans la Citadelle ! On a tout suivi sur l'écran. Les voyants sont repassés au vert, \
et devine qui est sorti du simulateur en retirant une fausse barbe ? L'intrus, les comptes verrouillés, la crise : \
il nous faisait passer notre épreuve à nous aussi, pendant que tu passais la tienne. On a eu 14. \
Il paraît qu'on a mis trop longtemps à penser à la nouvelle recrue. »");
    		TableauAffichage.setText(TEXTE_TABLEAU + "\n\nRÉSULTATS DE L'ÉPREUVE PRATIQUE : une seule copie rendue, et elle est bonne. Félicitations à " + (this.nom || JOUEUR) +
    			", qui a vaincu le Sorcier Noir. Le directeur pédagogique rappelle qu'il n'était « pas si méchant ».");
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
    		if (this.has("chapitre1Saute")){
    			say(C.vert(C.gras("FIN")) + "\n\nLe Paradis de l'épreuve de première année. Tu es venu en renfort : ce chapitre n'est pas noté pour toi.\n" +
    				"Ta note est celle de ton chapitre, sur ton certificat (ls ~). Et maintenant, ouvre un vrai terminal : tout ce que tu sais y fonctionne.");
    			break;
    		}
    		var bilan = this.progression();
    		say(C.vert(C.gras("FIN")) + "\n\n" +
    			C.gras("SCORE FINAL : " + this.xpNet() + " XP sur " + bilan.max) + (this.malus ? C.gris("  (" + this.xp + " gagnés, -" + this.malus + " d'indices)") : "") + "\n" +
    			C.gras("NOTE : " + this.noteTexte()) + "   Mention : " + this.mention() + "\n" +
    			"Niveau " + bilan.niveau + " sur " + NIVEAUX.length + " : " + bilan.titre + "\n\n" +
    			"Sorts appris : " + this.nbSortsChapitre1() + " sur " + ORDRE_DES_SORTS.length +
    			". Quêtes secondaires : " + this.nbSecondaires() + " sur " + QUETES_SECONDAIRES.length +
    			". Sorts lancés : " + this.nbCommandes + ". Temps de jeu : " + this.tempsTexte() + ".\n\n" +
    			(this.xp >= bilan.max ?
    				"Score parfait : il ne reste rien à découvrir. Chapeau.\n" :
    				"Le monde reste ouvert, et ta note peut encore monter : « xp » montre où il reste des points, « quetes » ce qu'il reste à faire. Le BureauDeLaurent, à Cybersup, t'attend aussi.\n") +
    			"Ton code de vérification est sur ton Diplome (cat Diplome) : remets-le à ton formateur.\n" +
    			"Et maintenant, ouvre un vrai terminal. Tout ce que tu sais y fonctionne.");
    		break;
		default:
			if (typeof etatChapitre2 === "function") etatChapitre2(param_name);
			if (typeof etatPanne === "function") etatPanne(param_name);
			if (typeof etatChapitre4 === "function") etatChapitre4(param_name);
			break;
	};
};

/* ---------------- succès ---------------- */

var SUCCES = [
	{ id: "premiers_pas", titre: "Premiers pas", detail: "lancer 10 sorts",
	  test: function(e){ return e.nbCommandes >= 10; } },
	{ id: "plombier", titre: "Plombier", detail: "enchaîner au moins 4 sorts dans un seul tuyau",
	  test: function(e){ return e.has("tuyau4"); } },
	{ id: "trou_noir", titre: "Trou noir", detail: "envoyer quelque chose dans /dev/null",
	  test: function(e){ return e.has("trouNoir"); } },
	{ id: "fouineur", titre: "Fouineur", detail: "trouver les deux quêtes secrètes du chapitre 1",
	  test: function(e){ return e.quests["s_chaussette"] && e.quests["s_annales"]; } },
	{ id: "sans_filet", titre: "Sans filet", detail: "vaincre le Sorcier Noir sans indice payant",
	  test: function(e){ return e.has("victoire") && !e.has("chapitre1Saute") && e.malus === 0; } },
	{ id: "eclair", titre: "Éclair", detail: "vaincre le Sorcier Noir en moins d'une heure de jeu",
	  test: function(e){ return e.has("victoire") && !e.has("chapitre1Saute") && e.chronos["m_boss"] !== undefined && e.chronos["m_boss"] < 3600000; } },
	{ id: "econome", titre: "Économe", detail: "vaincre le Sorcier Noir en moins de 250 sorts lancés",
	  test: function(e){ return e.has("victoire") && !e.has("chapitre1Saute") && e.has("victoirePeuDeSorts"); } },
	{ id: "root", titre: "Root", detail: "atteindre le dernier niveau",
	  test: function(e){ return e.niveau() === NIVEAUX.length; } },
	{ id: "perfection", titre: "Perfection", detail: "20 / 20 au chapitre 1",
	  test: function(e){ return !e.has("chapitre1Saute") && e.note() === 20; } },
	{ id: "noctambule", titre: "Noctambule", detail: "jouer entre minuit et cinq heures du matin",
	  test: function(e){ return e.has("nuit"); } },
	{ id: "couche_par_couche", titre: "Couche par couche", detail: "réparer le réseau de l'école, au chapitre 2",
	  test: function(e){ return !!e.quests["r_fin"]; } },
	{ id: "sans_filet_reseau", titre: "Sans filet ni câble", detail: "terminer le chapitre 2 sans indice payant",
	  test: function(e){ return !!e.quests["r_fin"] && e.malus3 === 0; } },
	{ id: "cles_en_main", titre: "Clés en main", detail: "terminer le chapitre 3",
	  test: function(e){ return !!e.quests["c_rapport"]; } },
	{ id: "parano", titre: "Parano (au bon sens du terme)", detail: "protéger sa clé par une phrase de passe sans jamais confier sa clé privée",
	  test: function(e){ return !!e.quests["c_coffre"] && !!e.quests["s_c_passphrase"] && !e.cleGrillee; } },
	{ id: "sans_filet_2", titre: "Sans filet, le retour", detail: "terminer le chapitre 3 sans indice payant",
	  test: function(e){ return !!e.quests["c_rapport"] && e.malus2 === 0; } },
	{ id: "speedrun", titre: "Speedrun", detail: "terminer le chapitre 1 et la Crypte en moins de quatre heures de jeu",
	  test: function(e){ return !!e.quests["c_rapport"] && !e.has("chapitre1Saute") && e.chronos["c_rapport"] < 14400000; } }
];

/* Appelée après chaque ligne : annonce les succès qui viennent d'être débloqués. */
GameState.prototype.verifierSucces = function(){
	var heure = new Date().getHours();
	if (heure >= 0 && heure < 5) this.set("nuit");
	if (this.has("victoire") && !this.has("victoireNotee")){
		this.set("victoireNotee");
		if (this.nbCommandes < 250) this.set("victoirePeuDeSorts");
	}
	for (var i = 0; i < SUCCES.length; i++){
		var s = SUCCES[i];
		if (this.succes[s.id] || !s.test(this)) continue;
		this.succes[s.id] = true;
		jouerSon("succes");
		say(C.magenta("◆ Succès débloqué : " + s.titre) + C.gris(" · succes"));
	}
};

GameState.prototype.texteDesSucces = function(){
	var n = 0, lignes = [];
	for (var i = 0; i < SUCCES.length; i++){
		var s = SUCCES[i];
		if (this.succes[s.id]) n++;
		lignes.push("  " + (this.succes[s.id] ? C.magenta("◆ " + completerDroite(s.titre, 30)) : C.gris("◇ " + completerDroite(s.titre, 30))) +
			(this.succes[s.id] ? s.detail : C.gris(s.detail)));
	}
	return C.gras("SUCCÈS") + " (" + n + " sur " + SUCCES.length + ")\n\n" + lignes.join("\n");
};

function dureeTexte(ms){
	var secondes = Math.floor(ms / 1000);
	var h = Math.floor(secondes / 3600), m = Math.floor(secondes / 60) % 60, sec = secondes % 60;
	return (h > 0 ? h + ":" + deuxChiffres(m) : String(m)) + ":" + deuxChiffres(sec);
}

/* Le chronomètre : temps de jeu et temps de passage à chaque étape, façon speedrun. */
GameState.prototype.texteDuChrono = function(){
	var lignes = [C.gras("CHRONO") + "   temps de jeu : " + C.gras(dureeTexte(this.tempsMs)) + C.gris("  (les pauses de plus de deux minutes ne comptent pas)"), ""];
	var listes = [{ titre: "Chapitre 1", quetes: QUETES_PRINCIPALES, depart: 0 }];
	if (typeof QUETES_PANNE !== "undefined" && this.has("panneOuverte")){
		listes.push({ titre: "Chapitre 2 : la panne", quetes: QUETES_PANNE, depart: this.debutChapitre3 || 0 });
	}
	if (typeof QUETES_CHAPITRE2 !== "undefined" && this.has("crypteOuverte")){
		listes.push({ titre: "Chapitre 3 : la Crypte", quetes: QUETES_CHAPITRE2, depart: this.debutChapitre2 || 0 });
	}
	for (var l = 0; l < listes.length; l++){
		lignes.push(C.gras(listes[l].titre));
		var precedent = listes[l].depart;
		for (var i = 0; i < listes[l].quetes.length; i++){
			var q = listes[l].quetes[i];
			var t = this.chronos[q.id];
			if (t === undefined){
				lignes.push(C.gris("  " + completerDroite(q.titre, 46) + "   --:--"));
				continue;
			}
			lignes.push("  " + completerDroite(q.titre, 46) + completerGauche(dureeTexte(t), 8) + C.gris("  (+" + dureeTexte(Math.max(0, t - precedent)) + ")"));
			precedent = t;
		}
		lignes.push("");
	}
	lignes.push(C.gris("Pour un speedrun : recommencer, puis viser les succès Éclair et Speedrun (tape succes)."));
	return lignes.join("\n");
};

/* ---------------- sauvegarde ---------------- */

function copierTextes(cmd_text, sansLess){
	var copie = {};
	for (var cle in cmd_text){
		if (cmd_text.hasOwnProperty(cle) && !(sansLess && cle === "less")) copie[cle] = cmd_text[cle];
	}
	return copie;
}

var PROPRIETES_SAUVEGARDEES = ["gzip", "gpg", "immuable", "format", "age", "heure", "attributs"];

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
	if (item.sansFinDeLigne) o.sf = 1;
	if (item.binaire) o.b = item.binaire;
	// Les propriétés des objets du chapitre 2 (archives, chiffrement, attributs, dates).
	var extra = {};
	PROPRIETES_SAUVEGARDEES.forEach(function(k){ if (item[k] !== undefined) extra[k] = item[k]; });
	if (Object.keys(extra).length) o.ex = JSON.parse(JSON.stringify(extra));
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
	/* Un texte calculé (un personnage qui réagit, l'ordre de mission) garde son calcul : le lire ici le figerait
	   à sa valeur du chargement, avant même que l'épreuve ou le chapitre soient restaurés. */
	var descripteur = Object.getOwnPropertyDescriptor(item.cmd_text, "less");
	item.cmd_text = copierTextes(o.c, false);
	if (o.x){ item.modifie = true; }
	else if (descripteur) Object.defineProperty(item.cmd_text, "less", descripteur);
	else delete item.cmd_text["less"];
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
	item.sansFinDeLigne = !!o.sf;
	if (o.b) item.binaire = o.b;
	PROPRIETES_SAUVEGARDEES.forEach(function(k){ delete item[k]; });
	if (o.ex) for (var k in o.ex){ if (o.ex.hasOwnProperty(k)) item[k] = o.ex[k]; }
	return item;
}

/* connus : les identifiants présents dans la sauvegarde. Un lieu ou un objet ajouté au monde depuis
   (une nouvelle version du jeu : un personnage, un fichier) n'y figure pas : il reste là où le monde l'a posé,
   au lieu de disparaître parce que la vieille sauvegarde ne le connaissait pas. */
function restaurerLieu(lieu, o, connus){
	var enfantsAvant = lieu.children.slice(), objetsAvant = lieu.items.slice();
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
		var enfant = typeof o.k[i] === "string" ? World.rooms[o.k[i]] : restaurerLieu(new Room(o.k[i].n), o.k[i], connus);
		if (!enfant) continue;
		lieu.children.push(enfant);
		enfant.parents[0] = lieu;
	}
	for (var j = 0; j < o.it.length; j++){
		var item = typeof o.it[j] === "string" ? World.items[o.it[j]] : restaurerObjet(new Item(o.it[j].n, ""), o.it[j]);
		if (item) lieu.items.push(item);
	}
	if (connus){
		enfantsAvant.forEach(function(enfant){
			if (enfant.id && !connus.lieux.hasOwnProperty(enfant.id) && lieu.children.indexOf(enfant) === -1){ lieu.children.push(enfant); enfant.parents[0] = lieu; }
		});
		objetsAvant.forEach(function(item){
			if (item.id && !connus.objets.hasOwnProperty(item.id) && lieu.items.indexOf(item) === -1) lieu.items.push(item);
		});
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
	// Après un passage de chapitre raté, la page va se recharger sur l'ancienne sauvegarde : on n'y touche plus.
	if (Shell.sauvegardeBloquee) return;
	try {
		var donnees = {
			v: VERSION_SAUVEGARDE,
			flags: this.flags, spells: this.spells, depart: SORTS_DE_DEPART, quests: this.quests, seen: this.seen,
			nb: this.nbCommandes, nom: this.nom, lieu: this.dernierLieu,
			xp: this.xp, usages: this.usages, freq: this.frequences, quiz: this.quiz, visites: this.visited, niveau: this.niveauAnnonce, temps: this.tempsMs,
			env: this.env, alias: this.alias, paquets: this.paquets, cron: this.cron, arcanes: this.arcanes || null,
			indices: this.indices, malus: this.malus, dateVictoire: this.dateVictoire,
			xp2: this.xp2, malus2: this.malus2, cles: this.clesGenerees, pub: this.clePublique, priv: this.clePrivee,
			grillee: this.cleGrillee, debut2: this.debutChapitre2, dateVictoire2: this.dateVictoire2, codesFiges: this.codesFiges || {},
			succes: this.succes, chronos: this.chronos, reseau: this.reseau,
			xp3: this.xp3, malus3: this.malus3, debut3: this.debutChapitre3, dateVictoire3: this.dateVictoire3, panne: this.panne, examen: this.examen || null,
				xp5: this.xp5, malus5: this.malus5, debut5: this.debutChapitre5, dateVictoire5: this.dateVictoire5, ch4: this.ch4,
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
			if (World.rooms[id]) restaurerLieu(World.rooms[id], donnees.lieux[id], { lieux: donnees.lieux, objets: donnees.objets });
		}
		this.flags = donnees.flags || {};
		this.spells = donnees.spells || {};
		// Les sorts de départ ont pu changer depuis la sauvegarde (cat est connu d'emblée) :
		// un sort devenu « de départ » ne rapporte plus d'XP, on retire ce qu'il avait rapporté.
		var departAvant = donnees.depart || ["ls", "cd", "pwd", "less", "help", "man", "clear", "exit"];
		for (var d = 0; d < SORTS_DE_DEPART.length; d++){
			if (this.spells[SORTS_DE_DEPART[d]] && departAvant.indexOf(SORTS_DE_DEPART[d]) === -1 && donnees.xp) donnees.xp = Math.max(0, donnees.xp - XP_SORT_APPRIS);
			this.spells[SORTS_DE_DEPART[d]] = true;
		}
		this.quests = donnees.quests || {};
		this.seen = donnees.seen || {};
		this.nbCommandes = donnees.nb || 0;
		this.nom = donnees.nom || null;
		this.dernierLieu = donnees.lieu || null;
		this.xp = donnees.xp || 0;
		this.usages = donnees.usages || {};
		this.frequences = donnees.freq || {};
		this.quiz = donnees.quiz || {};
		this.visited = donnees.visites || {};
		this.niveauAnnonce = donnees.niveau || 1;
		this.tempsMs = donnees.temps || 0;
		this.env = donnees.env || {};
		this.alias = donnees.alias || {};
		this.paquets = donnees.paquets || {};
		this.indices = donnees.indices || {};
		this.malus = donnees.malus || 0;
		this.dateVictoire = donnees.dateVictoire || null;
		this.xp2 = donnees.xp2 || 0;
		this.malus2 = donnees.malus2 || 0;
		this.clesGenerees = donnees.cles || 0;
		this.clePublique = donnees.pub || null;
		this.clePrivee = donnees.priv || null;
		this.cleGrillee = donnees.grillee || null;
		this.debutChapitre2 = donnees.debut2 === undefined ? null : donnees.debut2;
		this.dateVictoire2 = donnees.dateVictoire2 || null;
		this.codesFiges = donnees.codesFiges || {};
		this.succes = donnees.succes || {};
		if (donnees.reseau) this.reseau = donnees.reseau;
		this.xp3 = donnees.xp3 || 0;
		this.malus3 = donnees.malus3 || 0;
		this.debutChapitre3 = donnees.debut3 === undefined ? null : donnees.debut3;
		this.dateVictoire3 = donnees.dateVictoire3 || null;
		// L'état de la panne : ce qui manque à une ancienne sauvegarde reprend sa valeur de départ.
		this.panne = typeof etatPanneInitial === "function" ? etatPanneInitial() : {};
		if (donnees.panne) for (var cle in donnees.panne){ if (donnees.panne.hasOwnProperty(cle)) this.panne[cle] = donnees.panne[cle]; }
		this.xp5 = donnees.xp5 || 0;
			this.malus5 = donnees.malus5 || 0;
			this.debutChapitre5 = donnees.debut5 === undefined ? null : donnees.debut5;
			this.dateVictoire5 = donnees.dateVictoire5 || null;
			this.ch4 = typeof etatCh4Initial === "function" ? etatCh4Initial() : {};
			if (donnees.ch4) for (var cle5 in donnees.ch4){ if (donnees.ch4.hasOwnProperty(cle5)) this.ch4[cle5] = donnees.ch4[cle5]; }
			this.chronos = donnees.chronos || {};
		this.examen = donnees.examen || null;
		if (donnees.cron) this.cron = donnees.cron;
		// Les tâches de at et l'état des timers (SortsArcanes.js).
		this.arcanes = donnees.arcanes || null;
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

/* ------------------------------------------------------------------ */
/* Les comptes : un identifiant, un mot de passe, une partie            */
/* ------------------------------------------------------------------ */

function lireComptes(){
	try { return JSON.parse(window.localStorage.getItem(CLE_COMPTES)) || {}; }
	catch (e){ return {}; }
}
function ecrireComptes(comptes){
	window.localStorage.setItem(CLE_COMPTES, JSON.stringify(comptes));
}

/* Le mot de passe n'est jamais gardé tel quel : seulement son empreinte SHA-256, salée. */
function empreinteMotDePasse(sel, motDePasse){
	return sha256(sel + ":" + motDePasse);
}

function verifierMotDePasse(id, motDePasse){
	var c = lireComptes()[id];
	return !!c && c.empreinte === empreinteMotDePasse(c.sel, motDePasse);
}

/* Crée le compte et y range la partie neuve en cours. Renvoie "neuve", ou null si c'est impossible. */
function creerCompte(prenom, motDePasse, nomComplet, email){
	var id = identifiantDepuisPrenom(prenom);
	try {
		var comptes = lireComptes();
		var sel = base64Aleatoire("sel-" + id + "-" + Date.now() + "-" + Math.random(), 12);
		comptes[id] = { prenom: String(nomComplet || prenom).trim(), email: email || "", sel: sel, empreinte: empreinteMotDePasse(sel, motDePasse), creation: Date.now() };
		ecrireComptes(comptes);
		window.localStorage.setItem(CLE_ACTIF, id);
		// La partie neuve en cours passe sous le nom du compte.
		COMPTE_ACTIF = id;
		var ancienProfil = CLE_PROFIL, ancienneSauvegarde = CLE_SAUVEGARDE;
		CLE_PROFIL = "terminus-cybersup-profil-" + id;
		CLE_SAUVEGARDE = "terminus-cybersup-partie-" + id + (PROFIL.modeExamen ? "-examen" : "");
		enregistrerProfil();
		state.save();
		window.localStorage.removeItem(ancienProfil);
		window.localStorage.removeItem(ancienneSauvegarde);
		return "neuve";
	} catch (e){
		return null;
	}
}

/* Se connecter à un compte existant : sa partie se charge (la page se recharge). */
function ouvrirSession(id){
	try {
		window.localStorage.setItem(CLE_ACTIF, id);
		Shell.sauvegardeBloquee = true;
		return true;
	} catch (e){
		return false;
	}
}

/* Fermer sa session : la partie reste enregistrée dans le compte, l'écran revient à la connexion. */
function fermerSession(){
	try {
		state.save();
		window.localStorage.removeItem(CLE_ACTIF);
		window.localStorage.removeItem("terminus-cybersup-profil");
		window.localStorage.removeItem("terminus-cybersup");
		try { window.sessionStorage.setItem("terminus-sans-intro", "1"); } catch (e){}
		Shell.sauvegardeBloquee = true;
		return true;
	} catch (e){
		return false;
	}
}

GameState.prototype.reset = function(){
	// Plus rien ne doit être enregistré d'ici le rechargement de la page, sinon l'ancienne partie reviendrait.
	Shell.sauvegardeBloquee = true;
	try {
		window.localStorage.removeItem(CLE_SAUVEGARDE);
		if (COMPTE_ACTIF){
			// Le compte reste (identifiant et mot de passe) : seule la partie repart de zéro, avec une nouvelle graine.
			window.localStorage.setItem(CLE_PROFIL, JSON.stringify({ graine: 1 + Math.floor(Math.random() * 2147483645), prenom: PROFIL.prenom, chapitre: 1, aChoisir: true }));
			try { window.sessionStorage.setItem("terminus-sans-intro", "1"); } catch (e){}
		} else {
			window.localStorage.removeItem(CLE_PROFIL);
		}
	} catch (e){}
};

/* ------------------------------------------------------------------ */
/* Le prénom du joueur                                                 */
/* ------------------------------------------------------------------ */

var IDENTIFIANTS_RESERVES = {
	"root": "root, c'est l'administrateur. Tu le deviendras peut-être, mais il faut le mériter.",
	"laurent": "Laurent ? Ce nom est déjà pris sur ce système. Et crois-moi, tu ne voudrais pas être à sa place à la fin de l'histoire.",
	"sorcier": "Le Sorcier a déjà un compte ici, et il n'aime pas qu'on le lui emprunte.",
	"terminus": "terminus, c'est le nom du système lui-même. Choisis quelque chose de plus humain.",
	"apprenti": "Trop modeste. Donne ton vrai prénom."
};

/* Renvoie un message d'erreur si le prénom ne convient pas, sinon null. */
function prenomRefuse(prenom){
	var texte = String(prenom || "").trim();
	if (texte === "") return "Il me faut au moins un prénom.";
	var id = identifiantDepuisPrenom(texte);
	if (id === "") return "Un prénom qui commence par une lettre, s'il te plaît : il servira d'identifiant sur le système.";
	if (IDENTIFIANTS_RESERVES.hasOwnProperty(id)) return IDENTIFIANTS_RESERVES[id];
	return null;
}

/* Parcourt tout ce qui existe dans le monde, y compris ce que le joueur a fabriqué. */
function pourChaqueNoeud(fonction){
	var vus = [];
	function visiter(lieu){
		if (!lieu || vus.indexOf(lieu) > -1) return;
		vus.push(lieu);
		fonction(lieu);
		for (var i = 0; i < lieu.items.length; i++) fonction(lieu.items[i]);
		for (var j = 0; j < lieu.children.length; j++) visiter(lieu.children[j]);
	}
	for (var id in World.rooms){
		if (World.rooms.hasOwnProperty(id)) visiter(World.rooms[id]);
	}
	for (var k in World.items){
		if (World.items.hasOwnProperty(k)) fonction(World.items[k]);
	}
}

/*
 * Le joueur devient « prenom » sur le système : tout ce qui appartenait à
 * l'ancien identifiant (apprenti au départ) change de propriétaire, ses
 * processus aussi, et le prénom figure sur la carte étudiante et le diplôme.
 */
function adopterPrenom(prenom){
	var texte = String(prenom).trim().replace(/\s+/g, " ").substring(0, 30);
	var ancien = JOUEUR;
	var nouveau = identifiantDepuisPrenom(texte);
	pourChaqueNoeud(function(noeud){
		if (noeud.owner === ancien) noeud.owner = nouveau;
		if (noeud.procs){
			for (var i = 0; i < noeud.procs.length; i++){
				if (noeud.procs[i].owner === ancien) noeud.procs[i].owner = nouveau;
			}
		}
	});
	if (typeof UTILISATEURS !== "undefined"){
		delete UTILISATEURS[ancien];
		UTILISATEURS[nouveau] = 1000;
	}
	JOUEUR = nouveau;
	PROFIL.prenom = texte;
	enregistrerProfil();
	state.nom = texte;
	return nouveau;
}
