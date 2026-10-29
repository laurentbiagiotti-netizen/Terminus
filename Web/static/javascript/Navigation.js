/**
 * Navigation.js : voir les dix chapitres et passer de l'un à l'autre en cours de partie.
 *
 *   chapitres (et chapitre sans numéro) : la liste des chapitres, leur état, ta note, comment t'y rendre ;
 *   aller N : t'emmène au lieu d'entrée d'un chapitre ouvert, ou propose d'ouvrir en renfort
 *             un chapitre 4 à 10 pas encore ouvert, sans rien perdre des autres.
 *
 * Numéros : le joueur voit 1 à 10 ; le code numérote 1 (Terminus), 3 (la panne), 2 (la Crypte), 5 à 11 (l'Académie
 * au Lac Profond). state.navigation (GameState.js) garde le chapitre choisi et les sorts prêtés par un renfort.
 *
 * Tant que le joueur n'utilise pas aller (navigation.actif faux), rien ne change : le chapitre en cours,
 * l'étape en cours et les horloges suivent les règles de toujours. Ensuite :
 *   le chapitre en cours est celui choisi (aller N), puis celui dont on franchit une étape ou dont on passe l'entrée ;
 *   l'étape en cours est celle de ce chapitre, puis celle des autres chapitres ouverts, dans l'ordre de l'histoire ;
 *   seule l'horloge du chapitre en cours avance (la bombe, l'aube, la Longue Nuit, la marée, la flotte).
 *
 * Chargé après tous les chapitres (HabitantsPort.js), avant AideDuJeu.js et Intro.js.
 */

/* Numéro affiché (1 à 10) -> numéro du code. */
var INTERNE_DU_CHAPITRE = { 1: 1, 2: 3, 3: 2, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11 };
/* L'ordre de l'histoire, en numéros du code. */
var ORDRE_DES_CHAPITRES = [1, 3, 2, 5, 6, 7, 8, 9, 10, 11];

var CHAPITRES_NAV = {
	1: { nom: "Terminus", court: "Terminus", desc: "L'épreuve de première année : Linux de base, jusqu'au Sorcier Noir. Note sur le Diplome." },
	3: { nom: "La panne", court: "la panne", desc: "Le réseau de l'école est tombé : le réparer couche par couche, du câble au pare-feu. Note sur le CertificatReseau." },
	2: { nom: "La Crypte", court: "la Crypte", desc: "La mission cyber : la Crypte, puis tout le réseau de l'école, jusqu'au rapport d'incident. Note sur le CertificatCyber." },
	5: { nom: "L'Académie", court: "l'Académie", desc: "Niveau avancé : une nuit de réponse à incident face à la Nuée (jq, awk, sed, rsync, timers, scripts). Note sur le CertificatAvance." },
	6: { nom: "Le Bastion", court: "le Bastion", desc: "Durcissement Linux : douze murs à dresser sur un serveur neuf avant l'inspection de l'aube. Note sur le CertificatBastion." },
	7: { nom: "Lumen", court: "Lumen", desc: "Exploitation Linux : rallumer seize quartiers d'une cité avant la Longue Nuit (disques, mémoire, services, RAID). Note sur le CertificatLumen." },
	8: { nom: "Port-Aube", court: "Port-Aube", desc: "Services réseau Linux : bâtir les dix maisons d'une cité avant la marée (DNS, courrier, NFS, Samba, LDAP, TLS, sauvegardes). Note sur le CertificatPortAube." },
	9: { nom: "Le Grand Port", court: "le Grand Port", desc: "Les conteneurs, de zéro à héros : quatorze quais, cinq épreuves de rang et une bataille à l'aube (docker, compose, swarm). Note sur le CertificatGrandPort." },
	10: { nom: "La Chronothèque", court: "la Chronothèque", desc: "Git, de zéro à Chronomancien : quatorze salles, cinq épreuves de rang et une bataille du temps à l'aube (commits, branches, rebase, remotes, revue). Note sur le CertificatChronotheque." },
	11: { nom: "Le Lac Profond", court: "le Lac Profond", desc: "La grande finale, Linux et Docker pour la donnée : quinze postes, cinq épreuves de rang et la Grande Marée à l'aube (CSV, encodages, scripts, cron, disque, ETL en conteneurs). Note sur le CertificatLac." }
};

/* Le chapitre k (numéro du code) est-il ouvert dans cette partie ? */
function chapitreOuvertNav(k, etat){
	etat = etat || state;
	if (k === 1) return !etat.has("chapitre1Saute");
	if (k === 3) return etat.has("panneOuverte") && !etat.has("panneSautee");
	if (k === 2) return etat.has("crypteOuverte");
	return etat.has("ch" + (k - 1) + "Ouvert");
}
/* Le chapitre k est-il terminé ? */
function chapitreFiniNav(k, etat){
	etat = etat || state;
	var fin = { 1: "m_boss", 3: "r_fin", 2: "c_rapport", 5: "d_fin", 6: "h_rapport", 7: "m6_rapport", 8: "p7_rapport", 9: "n8_rapport", 10: "n9_rapport", 11: "n10_rapport" }[k];
	return k === 1 ? etat.has("victoire") : !!etat.quests[fin];
}
/* Les étapes de la quête principale du chapitre k. */
function quetesNav(k){
	var liste = {
		1: typeof QUETES_PRINCIPALES !== "undefined" ? QUETES_PRINCIPALES : null, 3: typeof QUETES_PANNE !== "undefined" ? QUETES_PANNE : null,
		2: typeof QUETES_CHAPITRE2 !== "undefined" ? QUETES_CHAPITRE2 : null, 5: typeof QUETES_CH4 !== "undefined" ? QUETES_CH4 : null,
		6: typeof QUETES_CH5 !== "undefined" ? QUETES_CH5 : null, 7: typeof QUETES_CH6 !== "undefined" ? QUETES_CH6 : null,
		8: typeof QUETES_CH7 !== "undefined" ? QUETES_CH7 : null, 9: typeof QUETES_CH8 !== "undefined" ? QUETES_CH8 : null,
		10: typeof QUETES_CH9 !== "undefined" ? QUETES_CH9 : null,
		11: typeof QUETES_CH10 !== "undefined" ? QUETES_CH10 : null
	}[k];
	return liste || [];
}
/* À quel chapitre appartient une étape de la quête principale (null pour une quête secondaire ou annexe) ? */
function chapitreDeLEtapeNav(id){
	for (var i = 0; i < ORDRE_DES_CHAPITRES.length; i++){
		var k = ORDRE_DES_CHAPITRES[i];
		if (quetesNav(k).some(function(q){ return q.id === id; })) return k;
	}
	return null;
}
/* Le lieu d'entrée d'un chapitre (la Crypte se rejoint par ssh citadelle). */
function entreeDuChapitreNav(k){
	return { 1: Home, 3: BatimentB, 2: Crypte, 5: Academie, 6: HallBastion, 7: HallLumen, 8: HallPortAube, 9: GrandPortCh8, 10: ChronothequeCh9, 11: typeof LacCh10 !== "undefined" ? LacCh10 : null }[k];
}
function cheminDuChapitreNav(k){
	if (k === 2) return "ssh citadelle, puis cd Crypte";
	return "cd " + Shell.cheminAffiche(entreeDuChapitreNav(k));
}
function navigationActive(etat){
	etat = etat || state;
	return !!(etat && etat.navigation && etat.navigation.actif);
}

/* ------------------------------------------------------------------ */
/* Le chapitre en cours, l'étape en cours                               */
/* ------------------------------------------------------------------ */

var CHAPITRE_EN_COURS_AVANT_NAV = GameState.prototype.chapitreEnCours;
GameState.prototype.chapitreEnCours = function(){
	var nav = this.navigation;
	if (nav && nav.actif && nav.choisi && chapitreOuvertNav(nav.choisi, this)) return nav.choisi;
	return CHAPITRE_EN_COURS_AVANT_NAV.call(this);
};

var QUETE_EN_COURS_AVANT_NAV = GameState.prototype.queteEnCours;
GameState.prototype.queteEnCours = function(){
	if (!navigationActive(this)) return QUETE_EN_COURS_AVANT_NAV.call(this);
	// Le chapitre en cours d'abord ; s'il est fini, les autres chapitres ouverts, dans l'ordre de l'histoire.
	var enCours = this.chapitreEnCours(), etat = this;
	var ordre = [enCours].concat(ORDRE_DES_CHAPITRES.filter(function(k){ return k !== enCours; }));
	for (var i = 0; i < ordre.length; i++){
		if (!chapitreOuvertNav(ordre[i], etat)) continue;
		var liste = quetesNav(ordre[i]);
		for (var j = 0; j < liste.length; j++){
			if (!this.quests[liste[j].id]) return liste[j];
		}
	}
	return null;
};

/* Franchir une étape d'un chapitre en fait le chapitre en cours. */
var COMPLETE_AVANT_NAV = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = this.quests[id];
	var r = COMPLETE_AVANT_NAV.apply(this, arguments);
	if (!deja && navigationActive(this) && !this.has("rejeuEnCours")){
		var k = chapitreDeLEtapeNav(id);
		if (k && chapitreOuvertNav(k, this)) this.navigation.choisi = k;
	}
	return r;
};

/* Passer l'entrée d'un chapitre (la Crypte, l'Académie, le Bastion, Lumen, Port-Aube, le Grand Port) en fait le chapitre en cours. */
function chapitreDuLieuNav(lieu){
	var halls = [[Crypte, 2], [Academie, 5], [HallBastion, 6], [HallLumen, 7], [HallPortAube, 8], [GrandPortCh8, 9], [ChronothequeCh9, 10]];
	if (typeof LacCh10 !== "undefined") halls.push([LacCh10, 11]);
	for (var l = lieu, garde = 0; l && garde++ < 100; l = l.parents[0]){
		for (var i = 0; i < halls.length; i++) if (halls[i][0] === l) return halls[i][1];
	}
	return null;
}
GameEvents.addListener("enter", function(e){
	if (!navigationActive() || !e.room || state.has("rejeuEnCours")) return;
	var k = chapitreDuLieuNav(e.room);
	if (k && chapitreOuvertNav(k)) state.navigation.choisi = k;
});

/* ------------------------------------------------------------------ */
/* Les horloges : seule celle du chapitre en cours avance               */
/* ------------------------------------------------------------------ */

function horlogeEnPauseNav(k){
	return navigationActive() && state.chapitreEnCours() !== k;
}
/* Une horloge en pause oublie les commandes jouées ailleurs : au retour, elle reprend où elle était. */
if (typeof avancerHorloge === "function"){
	var AVANCER_HORLOGE_CH4_AVANT_NAV = avancerHorloge;
	avancerHorloge = function(){
		if (horlogeEnPauseNav(5)){ if (state.ch4 && typeof state.ch4 === "object") state.ch4.dernierNb = state.nbCommandes; return; }
		return AVANCER_HORLOGE_CH4_AVANT_NAV.apply(this, arguments);
	};
}
if (typeof avancerHorlogeCh5 === "function"){
	var AVANCER_HORLOGE_CH5_AVANT_NAV = avancerHorlogeCh5;
	avancerHorlogeCh5 = function(){
		if (horlogeEnPauseNav(6)){ sCh5().dernierNb = state.nbCommandes; return; }
		return AVANCER_HORLOGE_CH5_AVANT_NAV.apply(this, arguments);
	};
}
if (typeof avancerHorlogeCh6 === "function"){
	var AVANCER_HORLOGE_CH6_AVANT_NAV = avancerHorlogeCh6;
	avancerHorlogeCh6 = function(){
		if (horlogeEnPauseNav(7)){ sCh6().dernierNb = state.nbCommandes; return; }
		return AVANCER_HORLOGE_CH6_AVANT_NAV.apply(this, arguments);
	};
}
if (typeof avancerHorlogeCh7 === "function"){
	var AVANCER_HORLOGE_CH7_AVANT_NAV = avancerHorlogeCh7;
	avancerHorlogeCh7 = function(){
		if (horlogeEnPauseNav(8)){ sCh7().dernierNb = state.nbCommandes; return; }
		return AVANCER_HORLOGE_CH7_AVANT_NAV.apply(this, arguments);
	};
}
/* Au Grand Port, l'horloge compte les commandes : on ne les compte pas quand on joue ailleurs. */
if (typeof compterCommandeCh8 === "function"){
	var COMPTER_COMMANDE_CH8_AVANT_NAV = compterCommandeCh8;
	compterCommandeCh8 = function(n){
		if (horlogeEnPauseNav(9)) return;
		return COMPTER_COMMANDE_CH8_AVANT_NAV.apply(this, arguments);
	};
}
/* À la Chronothèque aussi. */
if (typeof compterCommandeCh9 === "function"){
	var COMPTER_COMMANDE_CH9_AVANT_NAV = compterCommandeCh9;
	compterCommandeCh9 = function(n){
		if (horlogeEnPauseNav(10)) return;
		return COMPTER_COMMANDE_CH9_AVANT_NAV.apply(this, arguments);
	};
}
/* Au Lac Profond aussi. */
if (typeof compterCommandeCh10 === "function"){
	var COMPTER_COMMANDE_CH10_AVANT_NAV = compterCommandeCh10;
	compterCommandeCh10 = function(n){
		if (horlogeEnPauseNav(11)) return;
		return COMPTER_COMMANDE_CH10_AVANT_NAV.apply(this, arguments);
	};
}

/* ------------------------------------------------------------------ */
/* La liste des chapitres                                               */
/* ------------------------------------------------------------------ */

/* Le joueur peut-il partir directement (tout début d'une partie neuve) ? */
function departDirectPossibleNav(){
	return !state.has("chapitre1Saute") && typeof chapitre2Possible === "function" && chapitre2Possible();
}

/* Pourquoi un chapitre 4 à 10 fermé ne peut pas s'ouvrir en renfort maintenant (null : il le peut). */
function renfortRefuseNav(n){
	if (typeof examenEnCours === "function" && examenEnCours()) return "Pendant l'épreuve finale, il n'y a que la Forteresse.";
	if (n < 4 || n > 10) return "Seuls les chapitres 4 à 10 s'ouvrent en renfort en cours de partie.";
	if (quetesNav(INTERNE_DU_CHAPITRE[n]).length === 0) return "Le chapitre " + n + " n'est pas encore disponible.";
	if (!state.has("victoire") && !state.has("chapitre1Saute")){
		return "Le renfort se mérite : termine d'abord l'épreuve de première année (bats le Sorcier Noir, au bout du chapitre 1). " +
			"Ensuite, aller " + n + " ouvrira le chapitre " + n + " sans rien perdre de ta partie.\n" +
			C.gris("(Pour partir directement au chapitre " + n + " : recommencer, puis chapitre " + n + ", sur une partie neuve.)");
	}
	return null;
}
/* La phrase ajoutée par chapitre N quand le chapitre N est fermé en cours de partie. */
function conseilRenfort(n){
	var refus = renfortRefuseNav(n);
	if (!refus) return C.gris("(Ou, sans rien perdre de ta partie : aller " + n + " l'ouvre en renfort.)");
	return C.gris("(En renfort, sans rien perdre : aller " + n + ", une fois le Sorcier Noir battu.)");
}

function texteDesChapitres(){
	var enCours = state.chapitreEnCours(), depart = departDirectPossibleNav();
	var plusLoin = function(k){ var i = ORDRE_DES_CHAPITRES.indexOf(k); return ORDRE_DES_CHAPITRES.slice(i + 1).some(function(x){ return chapitreOuvertNav(x); }); };
	var lignes = [C.gras("LES CHAPITRES"), ""];
	for (var n = 1; n <= 10; n++){
		var k = INTERNE_DU_CHAPITRE[n], ouvert = chapitreOuvertNav(k), fini = chapitreFiniNav(k);
		var etat, couleur, note = "", acces = "";
		if (k === 1 && state.has("chapitre1Saute")){ etat = "non joué (renfort)"; couleur = C.gris; }
		else if (k === 3 && state.has("panneSautee")){ etat = "pas au programme (mission cyber)"; couleur = C.gris; }
		else if (fini && ouvert){ etat = "terminé"; couleur = C.vert; }
		else if (ouvert){ etat = k === 1 ? "en cours" : "ouvert"; couleur = C.jaune; }
		else if (plusLoin(k)){ etat = "non joué (renfort)"; couleur = C.gris; }
		else { etat = "fermé"; couleur = C.gris; }
		if (ouvert) note = state.noteTexte(k === 1 ? undefined : k) + (fini ? "" : " pour l'instant");
		if (ouvert) acces = "aller " + n;
		else if (depart && n > 1) acces = "chapitre " + n + " (départ direct)";
		else if (n >= 4 && !renfortRefuseNav(n)) acces = "aller " + n + " (en renfort)";
		var ici = ouvert && k === enCours;
		lignes.push("  " + n + ". " + completerDroite(CHAPITRES_NAV[k].nom, 17) + couleur(completerDroite(etat, 20)) + " " +
			completerDroite(note, 26) +(acces ? C.vert(acces) : "") + (ici ? C.cyan("  ◀ tu es ici") : ""));
		lignes.push(C.gris("     " + CHAPITRES_NAV[k].desc));
	}
	lignes.push("");
	if (depart){
		lignes.push(C.gris("La panne (chapitre 2) s'ouvre en battant le Sorcier Noir, la Crypte (chapitre 3) en réparant le réseau, l'Académie (chapitre 4) après la Crypte, le Bastion (chapitre 5) après l'Académie, Lumen (chapitre 6) après le Bastion, Port-Aube (chapitre 7) après Lumen, le Grand Port (chapitre 8) après Port-Aube, la Chronothèque (chapitre 9) après le Grand Port, le Lac Profond (chapitre 10) après la Chronothèque. " +
			"Si tu connais déjà les bases, tu peux aussi partir tout de suite : chapitre 2 (la panne), chapitre 3 (la mission cyber), chapitre 4 (l'Académie des Arcanes), chapitre 5 (le Bastion), chapitre 6 (Lumen), chapitre 7 (Port-Aube), chapitre 8 (le Grand Port), chapitre 9 (la Chronothèque) ou chapitre 10 (le Lac Profond)."));
		return lignes.join("\n");
	}
	var q = state.queteEnCours(), nomEnCours = CHAPITRES_NAV[enCours] ? CHAPITRES_NAV[enCours].court : "";
	var etape = q && chapitreDeLEtapeNav(q.id) === enCours ? " Étape en cours : " + q.titre + "." :
		(chapitreFiniNav(enCours) ? " Ce chapitre est terminé." : "");
	lignes.push("Tu es au chapitre " + numeroAffiche(enCours) + " (" + nomEnCours + ")." + etape + " " + C.gris("Son entrée : " + cheminDuChapitreNav(enCours) + "."));
	lignes.push(C.gris("aller N t'emmène à l'entrée d'un chapitre ouvert. Un chapitre 4 à 10 encore fermé s'ouvre en renfort, sans rien perdre des autres." +
		(state.has("victoire") || state.has("chapitre1Saute") ? "" : " (Le renfort s'ouvre une fois le Sorcier Noir battu.)")));
	return lignes.join("\n");
}

/* ------------------------------------------------------------------ */
/* Se rendre à un chapitre ouvert                                       */
/* ------------------------------------------------------------------ */

/* Ferme proprement les connexions ssh en cours (comme autant d'exit) ; renvoie le lieu de départ, sur ta machine. */
function fermerConnexionsNav(lignes){
	var pile = Shell.pile_ssh;
	if (!pile.length) return current_room;
	var vrai = current_room, hotes = [];
	try {
		hotes.push(Shell.hote());
		for (var i = pile.length - 1; i > 0; i--){ current_room = pile[i]; hotes.push(Shell.hote()); }
	} finally {
		current_room = vrai;
	}
	hotes.forEach(function(h){ lignes.push(C.gris("Connexion à " + h + " fermée.")); });
	var depart = pile[0];
	Shell.pile_ssh = [];
	return depart;
}

/* L'étape en cours d'un chapitre, ou ce qu'il en reste quand il est fini. */
function etapeDuChapitreNav(k){
	if (chapitreFiniNav(k)){
		var certificat = { 1: "ton Diplome (cat ~/Diplome)", 3: "ton CertificatReseau (cat ~/CertificatReseau)", 2: "ton CertificatCyber (cat ~/CertificatCyber)",
			5: "ton CertificatAvance (cat ~/CertificatAvance)", 6: "ton CertificatBastion (cat ~/CertificatBastion)", 7: "ton CertificatLumen (cat ~/CertificatLumen)",
			8: "ton CertificatPortAube (cat ~/CertificatPortAube)", 9: "ton CertificatGrandPort (cat ~/CertificatGrandPort)", 10: "ton CertificatChronotheque (cat ~/CertificatChronotheque)", 11: "ton CertificatLac (cat ~/CertificatLac)" }[k];
		return C.vert("Ce chapitre est terminé : " + state.noteTexte(k === 1 ? undefined : k) + ".") + " " + C.gris("Sa note est sur " + certificat + ". Le monde reste ouvert.");
	}
	var liste = quetesNav(k);
	for (var i = 0; i < liste.length; i++){
		if (!state.quests[liste[i].id]) return C.jaune("Étape en cours : " + liste[i].titre) + "\n" + C.gris("      Indice : " + liste[i].indice);
	}
	return "";
}

function allerAuChapitreNav(n){
	var k = INTERNE_DU_CHAPITRE[n], lignes = [];
	var avant = state.chapitreEnCours();
	var depart = fermerConnexionsNav(lignes);
	if (k === 2){
		// La Crypte est sous la Citadelle : on s'y connecte depuis sa machine, comme avec ssh citadelle.
		current_room = depart;
		if (!joueurDans(Citadelle)){
			Shell.pile_ssh.push(depart);
			lignes.push(C.gris("ssh citadelle : connexion à citadelle" + (typeof HOTES !== "undefined" && HOTES.citadelle ? " (" + HOTES.citadelle.ip + ")" : "") + ", puis cd Crypte. (exit te ramènera.)"));
		}
	}
	if (!state.navigation.actif && k !== avant) state.navigation.actif = true;
	if (state.navigation.actif) state.navigation.choisi = k;
	var entree = entreeDuChapitreNav(k);
	enterRoom(entree);
	if (k !== 2) Shell.lieu_precedent = null;
	lignes.push(C.vert(C.gras("CHAPITRE " + n + " : " + CHAPITRES_NAV[k].nom.toUpperCase())));
	lignes.push("Tu es maintenant dans " + current_room.toString() + " (" + (k === 2 ? "sur citadelle, " : "") + Shell.cheminAffiche(current_room) + "). " + current_room.intro_text);
	var etape = etapeDuChapitreNav(k);
	if (etape) lignes.push("", etape);
	return lignes.join("\n");
}

/* ------------------------------------------------------------------ */
/* Ouvrir un chapitre 4 à 10 en renfort, en cours de partie              */
/* ------------------------------------------------------------------ */

/* Les sorts d'un chapitre (numéro du code). */
function sortsDuChapitreNav(k){
	return {
		1: typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], 3: typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [],
		2: typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [], 5: typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
		6: typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], 7: typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
		8: typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : [], 9: typeof ORDRE_DES_SORTS_9 !== "undefined" ? ORDRE_DES_SORTS_9 : [],
		10: typeof ORDRE_DES_SORTS_10 !== "undefined" ? ORDRE_DES_SORTS_10 : [],
		11: typeof ORDRE_DES_SORTS_11 !== "undefined" ? ORDRE_DES_SORTS_11 : []
	}[k] || [];
}
/* Les sorts des chapitres d'avant (dans l'ordre de l'histoire) : ceux que le chapitre suppose acquis. */
function socleDuChapitreNav(k){
	var socle = [];
	for (var i = 0; i < ORDRE_DES_CHAPITRES.length && ORDRE_DES_CHAPITRES[i] !== k; i++) socle = socle.concat(sortsDuChapitreNav(ORDRE_DES_CHAPITRES[i]));
	return socle;
}

var RENFORTS_NAV = {
	4: { etat: "ch4", initial: function(){ return etatCh4Initial(); }, entree: function(){ return Academie; },
		titre: "L'ACADÉMIE DES ARCANES",
		texte: "La Nuée, un groupe de rançonneurs, a frappé cette nuit le serveur d'archives de l'école : données exfiltrées, bombe programmée pour minuit, pièges partout. " +
			"Grace t'appelle en renfort à l'Académie des Arcanes. " + "cat Frances, puis cat AVIS.txt." },
	5: { etat: "ch5", initial: function(){ return etatCh5Initial(); }, entree: function(){ return HallBastion; },
		titre: "LE BASTION",
		texte: "L'école passe une inspection de sécurité à l'aube. Laurent te confie le Bastion : un serveur Debian neuf, installé « par défaut », donc ouvert de partout. " +
			"La Nuée a juré de revenir avant l'inspecteur. cat Laurent, puis cat Mission." },
	6: { etat: "ch6", initial: function(){ return etatCh6Initial(); }, entree: function(){ return HallLumen; },
		titre: "LUMEN, LA CITÉ QUI S'ÉTEINT",
		texte: "Sous l'école dort Lumen, une cité alimentée par une seule machine, le Cœur, qui s'épuise. Il est 6 h ; à 14 h, la Longue Nuit tombera. " +
			"cat Laurent, puis cat Mission." },
	7: { etat: "ch7", initial: function(){ return etatCh7Initial(); }, entree: function(){ return HallPortAube; },
		titre: "PORT-AUBE, LA CITÉ À BÂTIR",
		texte: "Sur l'île de l'école, dix maisons neuves attendent leurs services. Il est 7 h ; à 14 h, une tempête ; à 19 h, la marée et cinq cents étudiants. " +
			"cat Laurent, puis cat Mission." },
	8: { etat: "ch8", initial: function(){ return etatCh8Initial(); }, entree: function(){ return GrandPortCh8; },
		titre: "LA FLOTTE NOIRE",
		texte: "Derrière le phare noir, une flotte se rassemble, chargée de conteneurs. Elle paraîtra à l'aube du quatrième jour. Laurent t'ouvre le Grand Port de l'île. " +
			"cat Laurent, puis cat Ordre." },
	9: { etat: "ch9", initial: function(){ return etatCh9Initial(); }, entree: function(){ return ChronothequeCh9; },
		titre: "LA CHRONIQUE D'ÉTERNITÉ",
		texte: "Sous la vieille tour de l'horloge dort la Chronique de l'école, un dépôt Git, et quelqu'un qui signe P.G. la réécrit. À l'aube du quatrième jour, la Grande Synchronisation. " +
			"cat Laurent, puis cat Ordre." },
	10: { etat: "ch10", initial: function(){ return etatCh10Initial(); }, entree: function(){ return LacCh10; },
		titre: "LE LAC PROFOND",
		texte: "Sous la Chronothèque dort le lac de données de l'école, et dans ses profondeurs Pipelinus, la pieuvre qui signait P.G. À l'aube du quatrième jour, la Grande Marée. " +
			"cat Wissam, puis cat Ordre." }
};

/* Ouvre le chapitre n (4 à 10) en renfort. Si quelque chose échoue, la partie est remise comme avant. Renvoie vrai si c'est fait. */
function ouvrirChapitreEnRenfort(n){
	var k = INTERNE_DU_CHAPITRE[n], def = RENFORTS_NAV[n], nav = state.navigation;
	var avant = null;
	try { state.save(); avant = window.localStorage.getItem(CLE_SAUVEGARDE); } catch (e){ avant = null; }
	var alias = state.alias, ok = false, pretes = 0;
	state.alias = {};   // les alias du joueur ne doivent pas détourner l'ouverture
	state.flags.rejeuEnCours = true;   // pas de fanfare pendant l'ouverture
	try {
		// Les sorts des chapitres d'avant sont prêtés : appris pour de vrai dans leur chapitre, ils rapporteront leurs XP.
		socleDuChapitreNav(k).forEach(function(s){
			if (state.spells[s]) return;
			state.spells[s] = true;
			nav.pretes[s] = true;
			pretes++;
		});
		// Après un départ direct à un chapitre plus loin (chapitre M, au début de la partie), les sorts de CE chapitre ont été
		// donnés d'office, sans XP : on les prête aussi, pour que les apprendre ici rapporte leurs XP comme d'habitude.
		var departDirect = [4, 5, 6, 7, 8, 9, 10].some(function(m){ return m > n && state.has("ch" + m + "Direct") && !state.has("ch" + m + "Renfort"); });
		if (departDirect) sortsDuChapitreNav(k).forEach(function(s){
			if (!state.spells[s] || nav.pretes[s]) return;
			nav.pretes[s] = true;
			pretes++;
		});
		state.set("sudoOK");
		// Le chapitre suivant, déjà ouvert en départ direct, garde sa place (voir Chapitre5.js, Chapitre6.js, Chapitre8.js).
		if (n < 10 && state.has("ch" + (n + 1) + "Ouvert")) state.set("ch" + n + "ApresCh" + (n + 1));
		state.set("ch" + n + "Direct");
		state.set("ch" + n + "Renfort");
		if (!state[def.etat] || typeof state[def.etat] !== "object") state[def.etat] = def.initial();
		state.applyState("ch" + n + "Ouvert");
		ok = state.has("ch" + n + "Ouvert") && def.entree().parents.length > 0;
	} catch (e){
		ok = false;
	}
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (!ok){
		// Rien ne doit rester d'une ouverture ratée : on remet la sauvegarde d'avant et on recharge la page.
		Shell.sauvegardeBloquee = true;
		try {
			if (avant !== null) window.localStorage.setItem(CLE_SAUVEGARDE, avant);
		} catch (e){}
		term.echo(C.rouge("L'ouverture du chapitre " + n + " n'a pas abouti.") + " Ta partie est remise comme avant.");
		window.location.reload();
		return false;
	}
	nav.actif = true;
	nav.choisi = k;
	state["debutChapitre" + k] = state.tempsMs;
	if (n <= 7) state[def.etat].dernierNb = state.nbCommandes;
	var lignes = [];
	fermerConnexionsNav(lignes);
	enterRoom(def.entree());
	Shell.lieu_precedent = null;
	lignes.push(C.vert(C.gras("EN RENFORT : CHAPITRE " + n + ", " + def.titre)), "", def.texte, "",
		"Tes autres chapitres t'attendent tels que tu les as laissés, avec leurs notes : chapitres pour la liste, aller N pour y revenir. " +
		"Seule l'horloge du chapitre où tu es avance." +
		(pretes ? " Les sorts des chapitres d'avant te sont prêtés (" + pretes + ") : appris ensuite pour de vrai dans leur chapitre, ils y rapporteront leurs XP." : ""),
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note."));
	term.echo(lignes.join("\n"));
	return true;
}

/* ------------------------------------------------------------------ */
/* Les commandes du jeu : chapitres et aller                            */
/* ------------------------------------------------------------------ */

Shell.sorts.chapitres = function(args, io){
	if (typeof examenEnCours === "function" && examenEnCours()) return "Pendant l'épreuve finale, il n'y a que la Forteresse.";
	if (args.length && args[0] !== "--help") throw new ShellError("chapitres : pas d'argument. Pour te rendre au chapitre N : aller N.");
	return texteDesChapitres();
};

Shell.sorts.aller = function(args, io){
	if (typeof examenEnCours === "function" && examenEnCours()) return "Pendant l'épreuve finale, il n'y a que la Forteresse.";
	if (!args.length) throw new ShellError("aller : quel chapitre ? Utilisation : aller N (de 1 à 10). Tape chapitres pour la liste.");
	if (args.length > 1 || !/^([1-9]|10)$/.test(args[0])) throw new ShellError("aller : il n'y a que les chapitres 1 à 10. Utilisation : aller N. Tape chapitres pour la liste.");
	var n = parseInt(args[0], 10), k = INTERNE_DU_CHAPITRE[n];
	if (chapitreOuvertNav(k)) return allerAuChapitreNav(n);
	if (n === 1) return "Tu es venu en renfort : le chapitre 1 n'est ni joué ni noté pour toi. Le monde de Terminus reste ouvert si tu veux le visiter : cd ~ pour ta Maison.";
	// Au tout début d'une partie neuve : un départ direct, comme chapitre N.
	if (departDirectPossibleNav()) return Shell.sorts.chapitre([String(n)], io);
	if (n === 2){
		if (state.has("panneSautee")) return "Tu es venu en mission cyber : la panne du réseau (chapitre 2) ne fait pas partie de ta mission. Elle ne s'ouvre pas en renfort.\n" +
			C.gris("(Pour la jouer : recommencer, puis chapitre 2, sur une partie neuve.)");
		return "Le chapitre 2 (la panne) s'ouvre quand tu auras battu le Sorcier Noir : il suit l'épreuve de première année. Il ne s'ouvre pas en renfort.";
	}
	if (n === 3 && state.has("panneOuverte") && typeof texteCrypteAttendRadia === "function") return texteCrypteAttendRadia();
	if (n === 3) return "Le chapitre 3 (la Crypte) s'ouvre à la fin de la panne (chapitre 2), dans l'ordre de l'histoire : il ne s'ouvre pas en renfort en cours de partie.\n" +
		C.gris("(Pour partir directement en mission cyber : recommencer, puis chapitre 3, sur une partie neuve.)");
	var refus = renfortRefuseNav(n);
	if (refus) return refus;
	var nomK = CHAPITRES_NAV[k].nom;
	term.demander("Le chapitre " + n + " (" + nomK + ") n'est pas encore ouvert. L'ouvrir en renfort ? Tes autres chapitres gardent leur progression et leur note ; " +
		"les chapitres sautés restent non joués. Tape oui pour confirmer : ", false, function(reponse){
		if (String(reponse).trim().toLowerCase() !== "oui"){ term.echo("Bien. Rien n'a changé : tu restes où tu es."); return; }
		if (ouvrirChapitreEnRenfort(n)) Shell.fin();
	});
	return "";
};
