/**
 * Guide.js : ce qui rend le jeu fluide, dans le navigateur.
 *
 *   le tutoriel des premières minutes (cinq sorts guidés, la commande suggérée en gris) ;
 *   la correction proposée après une erreur (Tab l'écrit) et une piste offerte quand on tourne en rond ;
 *   les scènes de passage d'un chapitre à l'autre, le récapitulatif de fin de chapitre et son quiz ;
 *   l'ambiance sonore de chaque chapitre, la taille du texte et le contraste fort.
 *
 * Chargé après Game.js. Rien ici ne change le barème : ce sont des aides et des décors.
 */

/* ------------------------------------------------------------------ */
/* Un petit message dans le coin, comme les bannières                  */
/* ------------------------------------------------------------------ */

function toast(titre, detail, classe){
	var panneau = document.getElementById("pics");
	if (!panneau) return;
	var b = document.createElement("div");
	b.className = "banniere banniere-guide" + (classe ? " " + classe : "");
	b.setAttribute("role", "status");
	var t = document.createElement("span"); t.className = "banniere-titre"; t.textContent = titre;
	var d = document.createElement("span"); d.className = "banniere-detail"; d.textContent = detail;
	b.appendChild(t); b.appendChild(d);
	var pile = document.getElementById("bannieres");
	if (!pile){ pile = document.createElement("div"); pile.id = "bannieres"; panneau.appendChild(pile); }
	pile.appendChild(b);
	bannieres.push(b);
	while (bannieres.length > (window.innerWidth < 820 ? 1 : 3)){ var vieille = bannieres.shift(); if (vieille.parentNode) vieille.parentNode.removeChild(vieille); }
	setTimeout(function(){
		b.classList.add("banniere-sortie");
		setTimeout(function(){ if (b.parentNode) b.parentNode.removeChild(b); bannieres = bannieres.filter(function(x){ return x !== b; }); }, calmeDemande ? 0 : 300);
	}, 2600);
}

/* ------------------------------------------------------------------ */
/* Le tutoriel : cinq sorts guidés, puis on lâche la main               */
/* ------------------------------------------------------------------ */

var TUTORIEL = [
	{ titre: "Regarde autour de toi", cmd: "ls", aide: "ls montre les lieux (en bleu) et les objets d'ici.",
	  fait: function(l){ return /^ls\b/.test(l); } },
	{ titre: "Lis la lettre posée chez toi", cmd: "cat LettreDeBienvenue", aide: "cat affiche un objet. Tab complète les noms longs.",
	  fait: function(l, lu){ return lu === "LettreDeBienvenue"; } },
	{ titre: "Va dans la forêt", cmd: "cd ForetOuest", aide: "cd entre dans un lieu. cd .. revient en arrière.",
	  fait: function(){ return /ForetOuest/.test(Shell.cheminAffiche(current_room)); } },
	{ titre: "Regarde ce qu'il y a dans la forêt", cmd: "ls", aide: "Chaque lieu a ses chemins et ses objets.",
	  fait: function(l){ return /^ls\b/.test(l) && current_room.room_name === "ForetOuest"; } },
	{ titre: "Entre à l'Académie des sorts", cmd: "cd AcademieDesSorts", aide: "Tab : tape cd Aca, puis Tab.",
	  fait: function(){ return /AcademieDesSorts/.test(Shell.cheminAffiche(current_room)); } }
];
var tutoEtape = -1;
var dernierObjetLu = null;
GameEvents.addListener("read", function(e){ dernierObjetLu = e.item ? e.item.itemname : null; });

function demarrerTuto(){
	if (state.has("tutoFini") || state.has("chapitre1Saute") || state.chapitreEnCours() !== 1) return;
	// Une partie déjà entamée (sauvegardée avant le tutoriel) n'en a pas besoin.
	if (Object.keys(state.quests).length > 3){ state.set("tutoFini"); return; }
	tutoEtape = 0;
	montrerEtapeTuto();
}
function montrerEtapeTuto(){
	if (tutoEtape < 0 || !term) return;
	var e = TUTORIEL[tutoEtape];
	term.proposer(e.cmd, "tape : ");
	majObjectif();
}
function suivreTuto(ligne){
	if (tutoEtape < 0) return;
	// Un joueur qui va plus vite que le tutoriel (cd ForetOuest/AcademieDesSorts d'un coup) saute les étapes
	// déjà dépassées ; et une fois l'aventure vraiment lancée (plus de trois quêtes), le tutoriel se retire.
	for (var j = TUTORIEL.length - 1; j > tutoEtape; j--){
		if (TUTORIEL[j].fait(ligne.trim(), dernierObjetLu)){ tutoEtape = j; break; }
	}
	if (Object.keys(state.quests).length > 3) tutoEtape = TUTORIEL.length - 1;
	var e = TUTORIEL[tutoEtape];
	if (Object.keys(state.quests).length <= 3 && !e.fait(ligne.trim(), dernierObjetLu)){
		// Une autre commande : on remet la suggestion, sans gronder.
		if (!Shell.proposition) term.proposer(e.cmd, "tape : ");
		return;
	}
	jouerSon("sort");
	tutoEtape++;
	if (tutoEtape >= TUTORIEL.length){
		tutoEtape = -1;
		state.set("tutoFini");
		state.save();
		term.proposer(null);
		toast("Tutoriel terminé", "À toi de jouer : suis la quête, à droite.", "banniere-quete");
		majObjectif();
		return;
	}
	toast("Bien joué  " + tutoEtape + "/" + TUTORIEL.length, TUTORIEL[tutoEtape - 1].aide, "banniere-sort");
	montrerEtapeTuto();
}

/* Le message d'accueil, plus court : le tutoriel fait le reste. */
MESSAGE_ACCUEIL = C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
	"Ici, tout se fait en tapant des sorts : de vraies commandes Linux.\n" +
	"Suis le tutoriel, à droite : cinq sorts, et le monde est à toi.\n" +
	C.gris("Perdu ? quetes (ton journal), indice (un coup de pouce), help (tes sorts).") + "\n";
var ACCUEILLIR_SANS_TUTO = accueillir;
accueillir = function(){
	ACCUEILLIR_SANS_TUTO();
	if (!partieRestauree) demarrerTuto();
};

/* ------------------------------------------------------------------ */
/* L'objectif, à droite : le tutoriel, la quête, et la piste offerte    */
/* ------------------------------------------------------------------ */

var suiviBlocage = { id: null, actif: 0, dernierTour: Date.now() };
var derniereTouche = Date.now();
document.addEventListener("keydown", function(){ derniereTouche = Date.now(); }, true);
document.addEventListener("click", function(){ derniereTouche = Date.now(); }, true);
var MINUTES_AVANT_PISTE = 4;

function detailsDeQuete(id){
	return INDICES_DETAILLES[id] || (typeof INDICES_CHAPITRE2 !== "undefined" && INDICES_CHAPITRE2[id]) ||
		(typeof INDICES_PANNE !== "undefined" && INDICES_PANNE[id]) || (typeof INDICES_CH5 !== "undefined" && INDICES_CH5[id]) ||
		(typeof INDICES_CH6 !== "undefined" && INDICES_CH6[id]) || (typeof INDICES_CH7 !== "undefined" && INDICES_CH7[id]) ||
		(typeof INDICES_CH8 !== "undefined" && INDICES_CH8[id]) || (typeof INDICES_CH9 !== "undefined" && INDICES_CH9[id]) || (typeof INDICES_CH10 !== "undefined" && INDICES_CH10[id]) || [];
}

var MAJ_OBJECTIF_SANS_GUIDE = majObjectif;
majObjectif = function(){
	MAJ_OBJECTIF_SANS_GUIDE();
	var bloc = document.getElementById("objectif");
	if (!bloc) return;
	var piste = bloc.querySelector(".objectif-piste");
	if (!piste){ piste = document.createElement("span"); piste.className = "objectif-piste"; bloc.appendChild(piste); }
	bloc.classList.toggle("objectif-tuto", tutoEtape >= 0);
	if (tutoEtape >= 0){
		var e = TUTORIEL[tutoEtape];
		bloc.hidden = false;
		bloc.querySelector(".objectif-mot").textContent = "Tutoriel " + (tutoEtape + 1) + "/" + TUTORIEL.length;
		bloc.querySelector(".objectif-nom").textContent = e.titre;
		bloc.querySelector(".objectif-indice").textContent = "";
		piste.textContent = "Tape : " + e.cmd;
		return;
	}
	bloc.querySelector(".objectif-mot").textContent = "Quête";
	var q = state.queteEnCours();
	var details = q ? detailsDeQuete(q.id) : [];
	piste.textContent = q && state.indices[q.id] >= 1 && details[0] ? "Piste : " + details[0] : "";
	bloc.classList.toggle("avec-piste", !!piste.textContent);
};

/* Toutes les dix secondes : depuis combien de temps le joueur cherche-t-il, activement, la même étape ? */
setInterval(function(){
	if (document.hidden || !state || tutoEtape >= 0 || Shell.sauvegardeBloquee) return;
	var q = state.queteEnCours();
	var maintenant = Date.now();
	if (!q){ suiviBlocage.id = null; return; }
	if (suiviBlocage.id !== q.id){ suiviBlocage = { id: q.id, actif: 0, dernierTour: maintenant }; return; }
	// Le temps ne compte que si le joueur est là : une touche dans les deux dernières minutes.
	if (maintenant - derniereTouche < 120000) suiviBlocage.actif += maintenant - suiviBlocage.dernierTour;
	suiviBlocage.dernierTour = maintenant;
	if (suiviBlocage.actif < MINUTES_AVANT_PISTE * 60000) return;
	var details = detailsDeQuete(q.id);
	if (!details[0] || (state.indices[q.id] || 0) >= 1) return;
	// La première piste est offerte, sans retirer de points : elle remplace le premier indice payant.
	state.indices[q.id] = 1;
	state.save();
	majObjectif();
	jouerSon("succes");
	toast("Une piste t'attend", "Tu cherches depuis un moment : regarde l'objectif, à droite.", "banniere-quete");
}, 10000);

/* ------------------------------------------------------------------ */
/* Après chaque commande : la correction proposée, le tutoriel, l'ambiance */
/* ------------------------------------------------------------------ */

var sortieDuTour = [];
var ECHO_SANS_GUIDE = null;
function brancherGuide(){
	if (!term || term.guideBranche) return;
	term.guideBranche = true;
	ECHO_SANS_GUIDE = term.echo;
	term.echo = function(texte){ sortieDuTour.push(String(texte === undefined ? "" : texte)); return ECHO_SANS_GUIDE.apply(term, arguments); };
	var commande = term.onCommande;
	term.onCommande = function(ligne){
		sortieDuTour = [];
		commande(ligne);
		var brut = sortieDuTour.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
		var proposition = Shell.proposition;
		// Refusé faute de droits, alors que le sort sudo est connu : on propose la même ligne avec sudo.
		if (!proposition && !/^\s*sudo\b/.test(ligne) && state.knows("sudo") &&
			/Permission denied|Permission non accordée|Operation not permitted|Access denied|réservé à root|You need to be root|il faut être root/i.test(brut) &&
			/sudo /.test(brut)) proposition = "sudo " + ligne.trim();
		if (proposition && proposition !== ligne.trim()) term.proposer(proposition, "tu voulais dire : ");
		suivreTuto(ligne);
		majAmbiance();
	};
}

/* ------------------------------------------------------------------ */
/* Les scènes : l'entrée dans un chapitre                               */
/* ------------------------------------------------------------------ */

var SCENES = {
	r_batiment: { image: "loc_batimentb.gif", titre: "Chapitre 2 · La panne", chapitre: 2,
		lignes: ["Ici, une adresse postale s'écrit 10.0.93.20 : le réseau, c'est la poste.", "Plus une lettre ne sort du bâtiment B. Radia t'y attend.", "On répare de bas en haut : la Grande Poste aux sept étages."] },
	r_annexe: { image: "loc_annexe.gif", titre: "Chapitre 2 · Acte II : l'Annexe", chapitre: 2,
		lignes: ["Le bâtiment B tient. La cafétéria, non.", "Plus de Wi-Fi, un écran noir, une fausse boîte aux lettres.", "Même méthode : du câble jusqu'au web."] },
	c_crypte: { image: "loc_crypte.gif", titre: "Chapitre 3 · La Crypte", chapitre: 3,
		lignes: ["Un mage noir s'est glissé dans la Citadelle.", "Ses sorts dorment dans le donjon, sous tes pieds.", "Grace te guide à la radio. La chasse est ouverte."] },
	d_entree: { image: "loc_academie.gif", titre: "Chapitre 4 · L'Académie des Arcanes", chapitre: 4,
		lignes: ["La Nuée a frappé le serveur d'archives cette nuit.", "Données volées, et une bombe programmée pour minuit.", "Huit maîtres, une horloge qui tourne : mesure, nettoie, restaure, documente."] },
	h_entree: { image: "loc_bastion.gif", titre: "Chapitre 5 · Le Bastion", chapitre: 5,
		lignes: ["Un serveur neuf, installé « par défaut » : toutes ses portes bâillent.", "L'inspection passe à l'aube, et la Nuée a juré de revenir avant.", "Douze tours, douze maîtres : mesure, durcis, vérifie, rends compte."] },
	m6_entree: { image: "loc_lumen.gif", titre: "Chapitre 6 · Lumen, la cité qui s'éteint", chapitre: 6,
		lignes: ["Sous l'école dort une cité, et une seule machine l'éclaire : le Cœur.", "Seize quartiers sont éteints. À 14 h, la Longue Nuit tombera sur eux.", "Seize gardiens : mesure, répare, prévois, rends compte."] },
	p7_quai: { image: "loc_port_aube.gif", titre: "Chapitre 7 · Port-Aube, la cité à bâtir", chapitre: 7,
		lignes: ["Une île au large, dix maisons debout, et pas une lumière.", "À 14 h, la tempête. À 19 h, la marée, et cinq cents étudiants.", "Dix maîtres bâtisseurs : bâtis, vérifie, sauvegarde. Tu es l'Architecte."] },
	n8_quai: { image: "loc_grand_port.gif", titre: "Chapitre 8 · La Flotte noire", chapitre: 8,
		lignes: ["Derrière le phare noir, une flotte de conteneurs se rassemble.", "Elle paraîtra à l'aube du quatrième jour. Il est 6 h, le premier.", "Quatorze quais, cinq épreuves : tu entres Mousse, tu sortiras Amiral."] },
	n9_entree: { image: "loc_chronotheque.gif", titre: "Chapitre 9 · La Chronique d'Éternité", chapitre: 9,
		lignes: ["Sous la tour de l'horloge dort la Chronique, et quelqu'un la réécrit.", "À l'aube du quatrième jour, la Grande Synchronisation. Il est 6 h, le premier.", "Quatorze salles, cinq épreuves : tu entres Apprenti, tu sortiras Chronomancien."] },
	n10_entree: { image: "loc_lac.gif", titre: "Chapitre 10 · Le Lac Profond", chapitre: 10,
		lignes: ["Sous la Chronothèque dort le lac de données de l'école, et Pipelinus avec.", "À l'aube du quatrième jour, la Grande Marée. Il est 6 h, le premier.", "Quinze postes, cinq épreuves : tu entres Riverain, tu sortiras Maître du Lac."] }
};
function sceneDeChapitre(scene){
	var fond = document.createElement("div");
	fond.className = "scene-chapitre";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", scene.titre);
	var cadre = document.createElement("div");
	cadre.className = "scene-cadre";
	var image = document.createElement("img");
	image.src = sourceImage("./static/img/" + scene.image);
	image.alt = "";
	var titre = document.createElement("p");
	titre.className = "scene-titre";
	titre.textContent = scene.titre;
	cadre.appendChild(image);
	cadre.appendChild(titre);
	scene.lignes.forEach(function(l, i){
		var p = document.createElement("p");
		p.className = "scene-ligne";
		p.style.animationDelay = (calmeDemande ? 0 : 400 + i * 700) + "ms";
		p.textContent = l.replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
		cadre.appendChild(p);
	});
	// La carte des chapitres : celui qui commence s'allume.
	var carte = document.createElement("p");
	carte.className = "scene-carte";
	["Terminus", "La panne", "La Crypte", "L'Académie", "Le Bastion", "Lumen", "Port-Aube", "Le Grand Port"].forEach(function(nom, i){
		var etape = document.createElement("span");
		var n = i + 1;
		var fini = n < scene.chapitre || (n === 1 && state.has("victoire")) || (n === 2 && state.quests["r_fin"]) || (n === 3 && state.quests["c_rapport"]) || (n === 4 && state.quests["d_fin"]) || (n === 5 && state.quests["h_rapport"]) || (n === 6 && state.quests["m6_rapport"]) || (n === 7 && state.quests["p7_rapport"]) || (n === 8 && state.quests["n8_rapport"]);
		etape.className = "scene-etape" + (n === scene.chapitre ? " scene-ici" : (fini ? " scene-fait" : ""));
		etape.textContent = (n === scene.chapitre ? "● " : (fini ? "✓ " : "○ ")) + nom;
		carte.appendChild(etape);
		if (i < 7){ var trait = document.createElement("span"); trait.className = "scene-trait"; trait.textContent = " ── "; carte.appendChild(trait); }
	});
	cadre.appendChild(carte);
	var suite = document.createElement("p");
	suite.className = "scene-suite";
	suite.textContent = toucheOuEntree() + " pour commencer";
	cadre.appendChild(suite);
	fond.appendChild(cadre);
	document.body.appendChild(fond);
	jouerSon("niveau");
	fermerSur(fond, function(){ majAmbiance(true); });
}
function fermerSur(fond, apres){
	function fermer(e){
		if (e && e.type === "keydown"){ e.preventDefault(); e.stopPropagation(); }
		document.removeEventListener("keydown", fermer, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		var champ = document.getElementById("saisie");
		if (champ) champ.focus();
		if (apres) apres();
	}
	setTimeout(function(){
		document.addEventListener("keydown", fermer, true);
		fond.addEventListener("click", fermer);
	}, 600);
}

var COMPLETE_SANS_SCENES = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = this.quests[id];
	COMPLETE_SANS_SCENES.call(this, id);
	if (!deja && SCENES[id] && !Shell.sauvegardeBloquee && !this.has("rejeuEnCours") && term){
		setTimeout(function(){ sceneDeChapitre(SCENES[id]); }, 500);
	}
};

/* ------------------------------------------------------------------ */
/* La fin d'un chapitre : le récapitulatif, puis le quiz                 */
/* ------------------------------------------------------------------ */

/* Les numéros internes : 1, la panne (3), la Crypte (2). */
function recapChapitre(chapitre){
	var minutes, badges = [], sorts;
	if (chapitre === 1){ minutes = Math.round(state.tempsMs / 60000); }
	else if (chapitre === 3){ minutes = Math.round((state.tempsMs - (state.debutChapitre3 || 0)) / 60000); }
	else if (chapitre === 5){ minutes = Math.round((state.tempsMs - (state.debutChapitre5 || 0)) / 60000); }
	else if (chapitre === 6){ minutes = Math.round((state.tempsMs - (state.debutChapitre6 || 0)) / 60000); }
	else if (chapitre === 7){ minutes = Math.round((state.tempsMs - (state.debutChapitre7 || 0)) / 60000); }
	else if (chapitre === 8){ minutes = Math.round((state.tempsMs - (state.debutChapitre8 || 0)) / 60000); }
	else if (chapitre === 9){ minutes = Math.round((state.tempsMs - (state.debutChapitre9 || 0)) / 60000); }
	else if (chapitre === 10){ minutes = Math.round((state.tempsMs - (state.debutChapitre10 || 0)) / 60000); }
	else if (chapitre === 11){ minutes = Math.round((state.tempsMs - (state.debutChapitre11 || 0)) / 60000); }
	else { minutes = Math.round((state.tempsMs - (state.debutChapitre2 || 0)) / 60000); }
	if (chapitre === 3 && typeof RELIQUES !== "undefined") badges = Object.keys(RELIQUES).filter(function(id){ return state.quests[id]; });
	if (chapitre === 2 && typeof TROPHEES_CRYPTE !== "undefined") badges = Object.keys(TROPHEES_CRYPTE).filter(function(id){ return state.quests[id]; });
	if (chapitre === 5 && typeof TROPHEES_CH4 !== "undefined") badges = Object.keys(TROPHEES_CH4).filter(function(id){ return state.quests[id]; });
	if (chapitre === 6 && typeof TROPHEES_CH5 !== "undefined") badges = Object.keys(TROPHEES_CH5).filter(function(id){ return badgeGagne(id); });
	if (chapitre === 7 && typeof TROPHEES_CH6 !== "undefined") badges = Object.keys(TROPHEES_CH6).filter(function(id){ return badgeGagne(id); });
	if (chapitre === 8 && typeof TROPHEES_CH7 !== "undefined") badges = Object.keys(TROPHEES_CH7).filter(function(id){ return badgeGagne(id); });
	if (chapitre === 9 && typeof TROPHEES_CH8 !== "undefined") badges = Object.keys(TROPHEES_CH8).filter(function(id){ return badgeGagne(id); });
	if (chapitre === 10 && typeof TROPHEES_CH9 !== "undefined") badges = Object.keys(TROPHEES_CH9).filter(function(id){ return badgeGagne(id); });
	if (chapitre === 11 && typeof TROPHEES_CH10 !== "undefined") badges = Object.keys(TROPHEES_CH10).filter(function(id){ return badgeGagne(id); });
	sorts = Object.keys(state.frequences || {}).filter(function(s){ return SORTS_DU_JEU.indexOf(s) === -1; }).filter(function(s){ return chapitreDuSort(s) === chapitre || (chapitre === 1 && ["ls", "cd", "cat"].indexOf(s) > -1); });
	sorts.sort(function(a, b){ return state.frequences[b] - state.frequences[a]; });
	return { minutes: minutes, badges: badges, top: sorts.slice(0, 3).map(function(s){ return s + " ×" + state.frequences[s]; }) };
}

var ECRAN_VICTOIRE_SEUL = ecranDeVictoire;
ecranDeVictoire = function(chapitre){
	ECRAN_VICTOIRE_SEUL(chapitre);
	var fond = document.getElementById("victoire");
	if (!fond) return;
	var cadre = fond.querySelector(".victoire-cadre");
	var r = recapChapitre(chapitre);
	var recap = document.createElement("div");
	recap.className = "victoire-recap";
	[["Temps", r.minutes < 60 ? r.minutes + " min" : Math.floor(r.minutes / 60) + " h " + deuxChiffres(r.minutes % 60)],
	 [chapitre === 1 ? "Sorts" : "Badges", chapitre === 1 ? state.knownSpells().filter(function(s){ return chapitreDuSort(s) === 1; }).length + " appris" : r.badges.length + " gagnés"],
	 ["Tes sorts favoris", r.top.join(", ") || "(aucun)"]].forEach(function(c){
		var ligne = document.createElement("p");
		var nom = document.createElement("span"); nom.className = "recap-nom"; nom.textContent = c[0];
		var val = document.createElement("span"); val.className = "recap-valeur"; val.textContent = c[1];
		ligne.appendChild(nom); ligne.appendChild(val);
		recap.appendChild(ligne);
	});
	var suite = cadre.querySelector(".victoire-suite");
	cadre.insertBefore(recap, suite);
	suite.textContent = toucheOuEntree() + " : le quiz du chapitre (5 questions)";
	// À la fermeture de l'écran de victoire, le quiz s'ouvre.
	var observateur = new MutationObserver(function(){
		if (!document.getElementById("victoire")){ observateur.disconnect(); setTimeout(function(){ lancerQuiz(chapitre); }, 200); }
	});
	observateur.observe(document.body, { childList: true });
};

var QUIZ = {
	1: [
		["Quel sort montre ce qu'il y a autour de toi ?", ["ls", "cd", "pwd", "cat"], 0, "ls liste les lieux et les objets du lieu où tu es."],
		["Comment revenir au lieu précédent, celui qui contient le lieu actuel ?", ["cd ..", "cd ~", "cd /", "ls .."], 0, ".. désigne le lieu parent ; ~ ta Maison ; / la racine."],
		["Dans -rwxr-x---, que peut faire le groupe ?", ["Lire et exécuter", "Tout faire", "Rien", "Seulement écrire"], 0, "Les trois lettres du milieu (r-x) sont celles du groupe : lire et exécuter, pas écrire."],
		["À quoi sert sudo ?", ["Lancer un sort avec les droits de root", "Changer de mot de passe", "Supprimer un fichier", "Ouvrir une session à distance"], 0, "sudo SORT : le sort part avec les pleins pouvoirs, après ton mot de passe."],
		["Que fait la barre | entre deux sorts ?", ["Elle envoie la sortie du premier dans le second", "Elle lance les deux en même temps", "Elle annule le premier", "Elle écrit dans un fichier"], 0, "cut -d: -f1 Registre | sort : la sortie de cut devient l'entrée de sort."],
		["Comment chercher le mot « motdepasse » dans tous les objets du lieu ?", ["grep motdepasse *", "find motdepasse", "cat motdepasse", "ls motdepasse"], 0, "grep cherche un mot dans des textes ; * désigne tous les objets d'ici."],
		["Comment voir les objets cachés (ceux qui commencent par un point) ?", ["ls -a", "ls -l", "cat .", "cd -a"], 0, "-a, comme all : ls -a montre aussi les noms qui commencent par un point."],
		["Que fait chmod +x script ?", ["Il rend le script exécutable", "Il le supprime", "Il le rend invisible", "Il le copie"], 0, "+x ajoute le droit d'exécution."]
	],
	3: [
		["Le modèle OSI, de bas en haut, commence par :", ["Physique, Liaison, Réseau", "Application, Transport, Réseau", "Réseau, Liaison, Physique", "Session, Transport, Réseau"], 0, "« Pour Le Réseau, Tout Se Passe Automatiquement » : Physique, Liaison, Réseau, Transport, Session, Présentation, Application."],
		["ip link montre eth0 DOWN. Que fais-tu ?", ["sudo ip link set eth0 up", "sudo dhclient eth0", "ping eth0", "sudo reboot"], 0, "On dépanne de bas en haut : d'abord rallumer la carte (étage 1)."],
		["À quoi sert le DNS ?", ["Traduire un nom en adresse IP", "Donner une adresse aux machines", "Chiffrer le web", "Filtrer les paquets"], 0, "Le DNS traduit ; c'est le DHCP qui donne les adresses."],
		["nc -zv mail 25 répond « timed out ». Le plus probable ?", ["Un pare-feu jette les paquets", "Le port est fermé", "Le serveur est éteint depuis un an", "Le câble est débranché du poste"], 0, "Port fermé : « refused », tout de suite. Rien du tout : un pare-feu avale les paquets."],
		["Combien d'adresses utilisables dans un /26 ?", ["62", "64", "254", "26"], 0, "64 adresses, moins celle du réseau et celle de diffusion."],
		["Un Wi-Fi ouvert porte presque le nom de celui de l'école. Tu fais quoi ?", ["Tu ne t'y connectes pas", "Tu t'y connectes, il capte mieux", "Tu changes ton mot de passe dessus", "Tu le scannes avec nmap"], 0, "C'est un faux point d'accès : il verrait tout ce que tu envoies."],
		["Pour qu'un service démarre maintenant ET à chaque démarrage :", ["systemctl enable --now", "systemctl start", "systemctl restart", "systemctl status"], 0, "start : maintenant seulement. enable : au démarrage. --now : les deux."],
		["Pourquoi fermer telnet ?", ["Tout y passe en clair, mots de passe compris", "Il est trop lent", "Il consomme trop de débit", "Il empêche le DNS"], 0, "telnet ne chiffre rien ; ssh fait le même travail, chiffré."]
	],
	2: [
		["sha256sum -c SHA256SUMS sert à :", ["vérifier qu'aucun fichier n'a été modifié", "chiffrer des fichiers", "compresser des fichiers", "trouver des fichiers cachés"], 0, "Une empreinte change dès qu'on touche une virgule : ÉCHEC = fichier modifié."],
		["base64, c'est :", ["Un encodage, pas un chiffrement", "Un chiffrement solide", "Un format d'image", "Un mot de passe"], 0, "N'importe qui le déballe avec base64 -d."],
		["Le bit SUID (-rwsr-xr-x) veut dire :", ["Le programme s'exécute avec les droits de son propriétaire", "Le fichier est caché", "Le fichier est en lecture seule", "Le programme est un script"], 0, "Un programme SUID de root que personne n'a installé : une porte dérobée."],
		["Un compte d'UID 0 dans /etc/passwd, c'est :", ["Un second root", "Un compte désactivé", "Un compte invité", "Le compte du système de fichiers"], 0, "UID 0 = root, quel que soit le nom."],
		["Quelle clé ne doit jamais quitter ton dossier ?", ["La clé privée (id_ed25519)", "La clé publique (id_ed25519.pub)", "Les deux", "Aucune"], 0, "La publique se donne ; la privée, jamais."],
		["Un service relancé par Restart=always : tuer son processus suffit-il ?", ["Non : systemctl disable --now", "Oui, kill -9 suffit", "Oui, il faut juste redémarrer", "Non : il faut supprimer le compte"], 0, "systemd le relance aussitôt ; il faut l'arrêter et le désactiver."],
		["Avant d'analyser une preuve, on :", ["la copie intacte et note son empreinte", "la corrige", "la supprime de la machine", "l'envoie par mail"], 0, "C'est la chaîne de traçabilité : l'empreinte prouve qu'elle n'a pas bougé."],
		["/etc/sudoers se modifie avec :", ["visudo", "nano directement", "echo >>", "chmod"], 0, "visudo vérifie la syntaxe : une faute dans sudoers peut bloquer tout le monde."]
	],
	5: [
		["Dans une expression régulière, que veut dire un point seul (.) ?", ["N'importe quel caractère", "Un vrai point", "La fin de la ligne", "Rien du tout"], 0, "Pour un vrai point, on l'échappe : \\. Sinon 10.0 attrape aussi 1000."],
		["awk '{ s += $4 } END { print s }' fait :", ["La somme de la 4e colonne", "La 4e ligne", "Le nombre de colonnes", "La moyenne de la 4e colonne"], 0, "Chaque ligne ajoute son 4e champ à s ; END affiche le total à la fin."],
		["Avant de transmettre un export à la CNIL, on :", ["le minimise : on masque ce qui n'est pas nécessaire", "l'envoie brut, pour être complet", "le chiffre avec base64", "le supprime"], 0, "La minimisation est un principe du RGPD ; et la notification se fait sous 72 heures."],
		["jq -r '.[] | select(.gravite == \"critique\") | .machine' sert à :", ["Lister les machines des alertes critiques", "Compter les alertes", "Supprimer les alertes critiques", "Trier le fichier"], 0, "select ne laisse passer que les alertes critiques ; .machine en garde le nom ; -r enlève les guillemets."],
		["Un compte fantôme vient d'être découvert. Le bon réflexe :", ["Le verrouiller (usermod -L), puis enquêter", "Le supprimer tout de suite", "Changer son nom", "L'ignorer"], 0, "Un compte supprimé, c'est une preuve perdue : on verrouille, on note, on supprime après."],
		["Une bombe logique peut se cacher dans :", ["Un timer systemd, une tâche at ou une crontab", "Seulement une crontab", "Seulement /tmp", "Seulement le noyau"], 0, "Trois serrures du temps : systemctl list-timers, sudo atq, crontab -u NOM -l. On cherche partout."],
		["rsync -a --delete SAUVEGARDE/ ARCHIVES/ :", ["Rend ARCHIVES identique à SAUVEGARDE", "Efface la sauvegarde", "Copie ARCHIVES dans SAUVEGARDE", "Compresse les archives"], 0, "La barre finale copie le contenu ; --delete retire ce qui n'existe pas dans la source. -n d'abord, pour voir."],
		["La règle 3-2-1 des sauvegardes :", ["3 copies, 2 supports, 1 hors ligne", "3 jours, 2 heures, 1 minute", "3 serveurs, 2 mots de passe, 1 clé", "3 sauvegardes par jour"], 0, "Une copie hors ligne échappe au rançongiciel : c'est elle qui a sauvé les archives cette nuit."],
		["Dans un script, set -e veut dire :", ["S'arrêter à la première commande qui échoue", "Afficher chaque commande", "Exporter toutes les variables", "Ignorer les erreurs"], 0, "Avec un contrôle des arguments et exit 1, c'est le garde-fou d'un script sûr."],
		["Un service se relance tout seul et redépose des fichiers. Dans quel ordre agir ?", ["Arrêter et désactiver le service, puis nettoyer", "Nettoyer, puis nettoyer encore", "Redémarrer la machine", "Supprimer /srv"], 0, "Tant que la persistance tourne, nettoyer ne sert à rien : systemctl disable --now d'abord."]
	],
	6: [
		["Tu viens de modifier sshd_config. Dans quel ordre agir ?", ["sudo sshd -t, puis sudo systemctl reload ssh", "sudo systemctl reload ssh, puis sudo sshd -t", "sudo systemctl restart ssh tout de suite", "Fermer ta session, puis te reconnecter"], 0, "sshd -t vérifie la configuration sans rien appliquer. On garde aussi une session ouverte pendant le test."],
		["Pour activer ufw à distance sans se couper soi-même :", ["default deny incoming, allow 22/tcp, puis enable", "enable, puis allow 22/tcp", "enable, puis default deny incoming", "disable, puis reset"], 0, "La politique, les exceptions, l'activation : dans cet ordre. Et on vérifie depuis l'extérieur."],
		["PASS_MAX_DAYS 90 dans /etc/login.defs suffit-il pour les comptes qui existent déjà ?", ["Non : il faut aussi chage -M 90 pour chacun", "Oui, il s'applique à tous", "Oui, après un redémarrage", "Non : il faut supprimer les comptes"], 0, "login.defs ne vaut que pour les comptes créés ensuite ; chage règle un compte existant."],
		["Un réglage fait avec sudo sysctl -w :", ["Est perdu au prochain redémarrage s'il n'est pas dans /etc/sysctl.d", "Est permanent", "Ne s'applique qu'après un redémarrage", "Modifie le noyau sur le disque"], 0, "On le grave dans /etc/sysctl.d/99-bastion.conf, puis sudo sysctl --system."],
		["Le mot de passe de GRUB s'écrit :", ["Dans /etc/grub.d/40_custom, sous forme d'empreinte, puis update-grub", "En clair dans /boot/grub/grub.cfg", "Dans /etc/shadow", "Dans /etc/default/grub, en clair"], 0, "grub-mkpasswd-pbkdf2 donne l'empreinte ; grub.cfg se régénère, on ne l'écrit jamais à la main."],
		["Un fichier de /etc/sudoers.d doit être en mode :", ["0440", "0777", "0644", "0600 appartenant à l'utilisateur"], 0, "Lisible par root et son groupe, modifiable par personne : sudo ignore un fichier trop ouvert. visudo -c le vérifie."],
		["Une base AIDE sert à :", ["Comparer chaque fichier à son empreinte prise sur un système sain", "Bloquer les connexions SSH", "Mettre à jour les paquets", "Chiffrer le disque"], 0, "aide --init la fabrique, on la met en place (aide.db), puis aide --check compare."],
		["AppArmor en mode complain :", ["Note les écarts du programme, mais ne bloque rien", "Bloque tout ce que le profil n'autorise pas", "Désactive le programme", "Chiffre les fichiers du programme"], 0, "En enforce, la cellule est fermée : aa-enforce."],
		["Pourquoi ServerTokens Prod sur Apache ?", ["Pour ne plus afficher la version du serveur", "Pour accélérer les pages", "Pour activer HTTPS", "Pour bloquer la méthode TRACE"], 0, "Une version affichée, c'est la liste des failles connues offerte à qui la lit. TRACE, c'est TraceEnable Off."],
		["Un rapport d'inspection honnête contient :", ["Les constats, les mesures, le score avant et après, et ce qui reste", "Seulement le score final", "Seulement ce qui a marché", "Les mots de passe changés"], 0, "On ne cache pas le reste : c'est ce qui permet à l'équipe suivante de continuer."]
	],
	7: [
		["df -h montre /var à 100 %. On a effacé un journal de 6 Go, et df ne bouge pas. Pourquoi ?", ["Un processus tient encore le fichier ouvert", "df se met à jour une fois par jour", "Le fichier est dans la corbeille", "Il faut redémarrer la machine"], 0, "La place n'est rendue qu'à la fermeture du fichier : lsof +L1 le montre, relancer le service le libère."],
		["« No space left on device », mais df -h montre de la place. Que regarder ?", ["df -i : les inodes sont peut-être épuisés", "free -h", "La température du disque", "Le pare-feu"], 0, "Un fichier, une fiche (un inode) : des millions de petits fichiers épuisent les inodes avant les octets."],
		["Dans free -h, quelle colonne dit la mémoire qu'on peut encore donner aux programmes ?", ["available", "free", "shared", "buff/cache"], 0, "Linux remplit la mémoire libre de cache, et la rend dès qu'on la demande : available en tient compte."],
		["Un processus est à l'état Z (<defunct>). Comment s'en débarrasser ?", ["Relancer (ou arrêter) son parent, qui doit relever son compte", "kill -9 sur le zombie", "Redémarrer la machine, toujours", "rm /proc/PID"], 0, "Un zombie est déjà mort : c'est son parent qui doit lire son code de retour. ps -o ppid= le nomme."],
		["Après lvextend -L +20G, df -h montre toujours l'ancienne taille. Il manque :", ["resize2fs (ou lvextend -r)", "Un redémarrage", "mkfs.ext4", "mount -a"], 0, "lvextend agrandit le volume, resize2fs le système de fichiers. lvextend -r fait les deux."],
		["Une ligne de /etc/fstab pointe vers un disque amovible souvent débranché. Quelle option ajouter ?", ["nofail", "noexec", "ro", "noatime"], 0, "Sans nofail, le démarrage s'arrête en mode secours si le disque manque. findmnt --verify vérifie fstab avant le redémarrage."],
		["Pour qu'un service se relance tout seul s'il meurt, on écrit dans son unité :", ["Restart=on-failure", "WantedBy=multi-user.target", "After=network.target", "Type=oneshot"], 0, "WantedBy le démarre au réveil (avec enable) ; Restart le relance s'il tombe."],
		["On ne lance jamais e2fsck sur un système de fichiers :", ["Monté", "Démonté", "En ext4", "Sur un RAID"], 0, "On démonte d'abord (fuser -vm dit qui l'occupe), on répare, on remonte."],
		["« Too many open files » dans le journal d'un service. Où lever la limite ?", ["LimitNOFILE= dans son unité systemd, puis restart", "ulimit -n dans ton shell", "Dans /etc/fstab", "Avec chmod"], 0, "ulimit ne change que ton shell ; un service hérite des limites de son unité. cat /proc/PID/limits vérifie."],
		["Une copie de six heures sur un serveur distant se lance :", ["Dans tmux (ou screen, ou avec nohup)", "Directement dans la session SSH", "Avec sudo -i", "Dans un timer systemd quotidien"], 0, "Les connexions tombent : tmux garde la session ouverte sur la machine, tmux attach la retrouve."]
	],
	8: [
		["Tu as ajouté un nom dans la zone du primaire et rechargé. Le secondaire ne le voit pas. Le plus probable ?", ["Le numéro de série n'a pas été augmenté", "Le secondaire est éteint depuis un an", "Le nom est trop long", "Il faut redémarrer le primaire"], 0, "Le secondaire compare les séries : sans série plus grande, il garde sa copie. named le dit : « zone serial unchanged »."],
		["Pourquoi restreindre allow-transfer au seul secondaire ?", ["Un transfert ouvert donne la carte complète du réseau à qui la demande", "Pour accélérer les réponses", "Parce que dig ne marche pas sinon", "Pour économiser le disque"], 0, "AXFR, c'est toute la zone d'un coup : on ne la donne qu'aux serveurs qui doivent la recopier."],
		["Dans une zone, MX 10 poste.port-aube.lan (sans point final) donne :", ["poste.port-aube.lan.port-aube.lan", "poste.port-aube.lan", "Une erreur de named-checkzone", "Un MX vers la racine"], 0, "Un nom sans point final est relatif : la zone ajoute son propre nom derrière."],
		["mynetworks = 0.0.0.0/0 dans main.cf de Postfix, c'est :", ["Un relais ouvert à tous : une machine à spam", "La configuration normale", "Un serveur qui refuse tout", "Un réglage du DNS"], 0, "Le serveur relaierait le courrier de n'importe qui : on le limite au réseau qui doit envoyer."],
		["Que publient SPF, DKIM et DMARC dans la zone ?", ["Qui peut envoyer, la clé de signature, et que faire des faux", "Les mots de passe des boîtes", "Les adresses des clients IMAP", "La liste des utilisateurs"], 0, "Trois TXT contre l'usurpation : on les relit avec dig TXT."],
		["root_squash sur un export NFS veut dire :", ["root sur un client devient nobody sur le serveur", "root seul peut monter l'export", "L'export est en lecture seule", "Les fichiers de root sont compressés"], 0, "Sinon, quiconque a sudo sur un client serait maître de tous les dossiers du serveur."],
		["sssd refuse de démarrer après ta modification de sssd.conf. Le plus fréquent ?", ["Le fichier n'est pas en 600, à root", "Il manque un redémarrage de la machine", "Le DNS est en panne", "Le fichier est trop court"], 0, "sssd exige un sssd.conf lisible par root seul : chmod 600, chown root."],
		["Pour que getent passwd interroge l'annuaire après les fichiers locaux :", ["passwd: files sss dans /etc/nsswitch.conf", "Ajouter le compte dans /etc/passwd", "Redémarrer slapd", "Monter /home en NFS"], 0, "nsswitch dit dans quel ordre le système cherche : les fichiers, puis sss."],
		["La clé privée d'une autorité de certification interne :", ["Ne quitte jamais sa machine", "Se copie sur chaque serveur qui doit faire confiance", "Se met dans /usr/local/share/ca-certificates", "S'envoie avec chaque certificat"], 0, "On distribue le certificat racine ; la clé, jamais : qui la tient signe au nom de tous."],
		["Dans authorized_keys, command=\"borg serve --restrict-to-path ...\",restrict sert à :", ["Que cette clé ne puisse faire qu'une sauvegarde, dans un seul dépôt", "Chiffrer la sauvegarde", "Accélérer ssh", "Donner un shell à borg"], 0, "Même volée, la clé ne sait faire que ça : pas de shell, pas de tunnel, pas d'autre dépôt."]
	],
	9: [
		["Qu'est-ce qu'un conteneur, pour le noyau ?", ["Un processus de l'hôte, cloisonné (espaces de noms) et rationné (cgroups)", "Une machine virtuelle avec son propre noyau", "Un fichier compressé", "Un utilisateur sans mot de passe"], 0, "Il partage le noyau de l'hôte : c'est pour ça qu'il démarre en un instant, et pour ça qu'on le cloisonne avec soin."],
		["Pourquoi ne met-on pas n'importe qui dans le groupe docker ?", ["Parce qu'il donne l'équivalent de root sur la machine", "Parce qu'il ralentit le démon", "Parce qu'il efface les images", "Parce qu'il bloque ssh"], 0, "Qui parle au démon peut lancer un conteneur qui monte / : le groupe docker vaut root."],
		["Une base de données tourne dans un conteneur sans volume. On le supprime et on le recrée. Les données ?", ["Perdues : elles étaient dans la couche du conteneur", "Intactes, dans l'image", "Intactes, dans /tmp de l'hôte", "Sauvées par docker stop"], 0, "Ce qui doit survivre au conteneur va dans un volume (ou un montage)."],
		["Sur le réseau bridge par défaut, ping NOM_DU_CONTENEUR échoue. La solution ?", ["Un réseau défini par l'utilisateur (docker network create), où le DNS donne les noms", "Publier tous les ports", "Lancer les conteneurs en root", "Ajouter le nom dans /etc/hosts de l'hôte"], 0, "Seuls les réseaux définis par l'utilisateur ont la résolution des noms entre conteneurs."],
		["Dans un Dockerfile, pourquoi COPY requirements.txt et pip install AVANT COPY . . ?", ["Pour que pip reste en cache quand seul le code change", "Parce que COPY . . est interdit en premier", "Pour que l'image soit en lecture seule", "Pour que pip soit plus rapide à l'exécution"], 0, "Une couche changée invalide toutes celles du dessus : on copie en dernier ce qui change le plus souvent."],
		["RUN apt-get update, puis dans un autre RUN rm -rf /var/lib/apt/lists/*. L'image est-elle allégée ?", ["Non : la première couche garde les listes, cachées sous la seconde", "Oui, d'autant", "Oui, après docker image prune", "Non, sauf avec --squash obligatoire"], 0, "Une couche ne s'efface jamais : on nettoie dans le même RUN, avec &&."],
		["Une construction en plusieurs étapes (multi-stage) sert surtout à :", ["N'emporter dans l'image finale que le résultat, sans les outils de compilation", "Construire deux images à la fois", "Accélérer le réseau", "Chiffrer l'image"], 0, "FROM ... AS build, puis COPY --from=build : le compilateur reste dans l'étape de construction."],
		["depends_on avec la forme courte, dans compose, attend :", ["Seulement le démarrage du service, pas qu'il soit prêt", "Que le service soit healthy", "Que le service ait fini", "Rien du tout"], 0, "condition: service_healthy attend le bilan de santé de la dépendance."],
		["Pourquoi ne jamais monter /var/run/docker.sock dans un conteneur ?", ["Qui tient le socket commande le démon, donc toute la machine", "Parce que le conteneur ne démarre pas", "Parce que les journaux se perdent", "Parce que les ports se ferment"], 0, "Le socket, c'est la clé du coffre : un conteneur qui l'a peut en lancer un autre, privilégié, qui monte le disque de l'hôte."],
		["Le tag nginx:1.27-alpine a changé de contenu sur le registre. Comment déployer à coup sûr l'ancien ?", ["L'épingler par son digest : nginx:1.27-alpine@sha256:...", "Utiliser latest", "Faire docker pull deux fois", "Redémarrer le démon"], 0, "Un tag est une étiquette mobile ; le digest est le sceau du contenu."]
	],
	10: [
		["Que fait git commit ?", ["Il scelle ce qui est sur l'index (la zone de préparation), et seulement ça", "Il envoie les fichiers sur le serveur", "Il scelle tous les fichiers du dossier", "Il crée une branche"], 0, "add pose sur l'index, commit scelle l'index ; push seul parle au serveur."],
		["Un .env a déjà été commité. On l'ajoute à .gitignore. Git l'oublie-t-il ?", ["Non : .gitignore ne cache que ce qui n'est pas suivi ; il faut git rm --cached .env", "Oui, aussitôt", "Oui, au prochain push", "Non, il faut supprimer le dossier .git"], 0, "Et un secret commité doit être changé : il reste dans l'historique."],
		["Sur une branche déjà poussée et partagée, comment annuler un commit ?", ["git revert : un nouveau commit qui défait l'ancien", "git reset --hard puis git push --force", "git commit --amend", "git rebase -i et drop"], 0, "On ne réécrit pas ce que d'autres ont déjà : revert allonge l'histoire au lieu de la changer."],
		["Une branche a été effacée par erreur avec git branch -D. Ses commits ?", ["Toujours là : git reflog les retrouve, git branch NOM HASH leur rend un nom", "Perdus pour toujours", "Dans la corbeille du système", "Sur le serveur uniquement"], 0, "Une branche n'est qu'un nom ; le reflog garde les positions passées de HEAD."],
		["Qu'est-ce qu'une branche, pour Git ?", ["Un fichier qui contient le hash d'un commit", "Une copie complète du dépôt", "Un dossier à part", "Un serveur distant"], 0, ".git/refs/heads/main : quarante et un octets. C'est pour ça qu'une branche ne coûte rien."],
		["Après une fusion sans aucun conflit, le code est-il forcément correct ?", ["Non : deux changements compatibles ligne à ligne peuvent être incompatibles en sens ; on lance les tests", "Oui, Git l'a vérifié", "Oui, si la fusion est fast-forward", "Non, il faut toujours tout réécrire"], 0, "C'est le conflit invisible : Git compare des lignes, pas des intentions."],
		["Que fait git bisect run ./test.sh ?", ["Il coupe l'historique en deux à chaque pas et lance le test pour trouver le premier commit fautif", "Il lance le test sur tous les commits un par un", "Il annule les commits fautifs", "Il fusionne deux branches"], 0, "Recherche dichotomique : 64 commits, six questions."],
		["Quand a-t-on le droit de réécrire des commits avec rebase -i ?", ["Quand ils n'ont encore été partagés avec personne", "Toujours", "Jamais", "Seulement sur main"], 0, "Rebase crée de nouveaux commits : ceux qui avaient les anciens se retrouvent avec une histoire divergente."],
		["git push est refusé : « rejected (fetch first) ». Que faire d'abord ?", ["git fetch et regarder (git log main..origin/main), puis git pull --rebase", "git push --force", "Supprimer le dépôt et recloner", "git commit --amend"], 0, "Le serveur a des commits que tu n'as pas : on regarde avant d'intégrer."],
		["Pourquoi signer ses commits ?", ["Parce que user.name et user.email se changent en une ligne : seule la signature prouve qui a vraiment commité", "Pour les compresser", "Pour qu'ils passent la CI", "Pour pouvoir les rebaser"], 0, "Un commit non signé peut porter n'importe quel nom ; une signature se vérifie contre une clé connue."],
		["Une Pull Request a tous ses tests verts. Peut-on la fusionner sans la lire ?", ["Non : la CI vérifie ce qu'on lui a appris, pas le sens ; la relecture humaine reste indispensable", "Oui, les tests suffisent", "Oui, si l'auteur est connu", "Non, il faut d'abord la rebaser"], 0, "Une ligne empoisonnée peut passer tous les tests."],
		["Pourquoi --force-with-lease plutôt que --force ?", ["Il refuse d'écraser la branche distante si elle a bougé depuis ton dernier fetch", "Il est plus rapide", "Il signe le push", "Il crée une sauvegarde sur le serveur"], 0, "Tu n'écrases jamais par surprise le travail que tu n'as pas vu."]
	],
	11: [
		["Un CSV s'ouvre avec des caractères bizarres (Ã©) et des ^M en fin de ligne. Que faire d'abord ?", ["Le regarder octet par octet (file, od -c), puis iconv -f ISO-8859-1 -t UTF-8 et dos2unix", "Le supprimer et le redemander", "Le passer tel quel au pipeline", "Remplacer les accents à la main"], 0, "On mesure avant de corriger : file et od disent l'encodage et les fins de ligne."],
		["Pourquoi trier avant uniq ?", ["uniq ne supprime que les doublons qui se suivent", "uniq trie déjà", "Pour aller plus vite", "uniq ne marche que sur des nombres"], 0, "sort | uniq, ou sort -u ; uniq -c compte, uniq -d montre les doublons."],
		["Que garantit set -euo pipefail dans un script ?", ["Il s'arrête à la première erreur, refuse les variables non définies et voit l'échec au milieu d'un tube", "Il rend le script plus rapide", "Il le lance en root", "Il cache les erreurs"], 0, "Sans pipefail, cmd_qui_echoue | sort renvoie 0 : l'erreur passe inaperçue."],
		["Un script lancé par cron marche à la main mais pas la nuit. Cause la plus probable ?", ["L'environnement de cron est minimal : PATH court, pas de répertoire courant ; chemins absolus et journal 2>&1", "cron est en panne", "Le script est trop long", "cron ne lance que du Python"], 0, "On écrit des chemins absolus et on redirige la sortie vers un journal pour voir ce qui se passe."],
		["df dit 100 % mais du ne trouve rien de gros. Où chercher ?", ["Un fichier supprimé encore ouvert par un processus : lsof +L1, puis redémarrer le service", "Dans la corbeille", "Dans /proc/cpuinfo", "Nulle part : df se trompe"], 0, "L'espace n'est rendu qu'à la fermeture du dernier descripteur ouvert."],
		["Un export doit partir vers l'extérieur et contient des emails de pêcheurs. Que faire ?", ["Pseudonymiser ou retirer la colonne avant l'export, et ne donner les droits qu'à qui en a besoin", "L'envoyer tel quel, c'est interne", "Le compresser", "Le renommer"], 0, "Minimisation des données : on n'exporte que ce qui sert."],
		["Pourquoi épingler une image par sa version (etl:1.0) ou son digest plutôt que latest ?", ["latest peut changer de contenu sans prévenir ; une version fixe rend le pipeline reproductible", "latest est plus lent", "latest n'existe pas", "Pour gagner de la place"], 0, "Et le digest garantit que personne n'a remplacé l'image sous le même nom."],
		["Le volume de la base PostgreSQL a été effacé. Qu'est-ce qui sauve les données ?", ["Une sauvegarde faite avant (pg_dump) et testée par une restauration", "docker restart", "Le cache du conteneur", "docker logs"], 0, "Une sauvegarde qu'on n'a jamais restaurée n'est qu'un espoir."],
		["Dans un compose, depends_on sans condition garantit-il que la base est prête ?", ["Non : il attend le démarrage du conteneur, pas sa santé ; il faut un healthcheck et condition: service_healthy", "Oui, toujours", "Oui, si la base est PostgreSQL", "Non, il faut un sleep 30"], 0, "Démarré ne veut pas dire prêt."],
		["Un conteneur sature la machine. Quelle protection mettre ?", ["Des limites de ressources (mem_limit, cpus) et une politique de redémarrage raisonnable", "Plus de swap", "Le lancer en root", "Le supprimer à chaque fois"], 0, "Une limite empêche un bras de tout emporter."],
		["Pourquoi ne pas mettre un mot de passe dans le compose.yaml ?", ["Le fichier finit dans Git et partout ; on le met dans un env_file non suivi, aux droits 600", "Ça ralentit Docker", "YAML refuse les mots de passe", "C'est interdit par Linux"], 0, "Les secrets vivent à part, et ne se commitent pas."],
		["Que fait parallel -j4 ./traiter.sh ::: *.csv ?", ["Il lance le script sur chaque fichier, quatre à la fois", "Il découpe chaque fichier en quatre", "Il fusionne les CSV", "Il lance quatre fois le même fichier"], 0, "Et flock empêche deux lancements du même travail de se marcher dessus."]
	]
};

function lancerQuiz(chapitre){
	var banque = (QUIZ[chapitre] || []).slice();
	if (!banque.length) return;
	for (var i = banque.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var x = banque[i]; banque[i] = banque[j]; banque[j] = x; }
	var questions = banque.slice(0, 5), n = 0, bons = 0;
	var fond = document.createElement("div");
	fond.className = "scene-chapitre quiz";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Quiz du chapitre");
	var cadre = document.createElement("div");
	cadre.className = "scene-cadre quiz-cadre";
	fond.appendChild(cadre);
	document.body.appendChild(fond);
	var attente = null;
	function fermer(){
		document.removeEventListener("keydown", clavier, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		var champ = document.getElementById("saisie");
		if (champ) champ.focus();
	}
	function clavier(e){
		e.preventDefault(); e.stopPropagation();
		if (e.key === "Escape"){ fermer(); return; }
		if (attente){ if (e.key === "Enter" || e.key === " ") attente(); return; }
		var k = parseInt(e.key, 10);
		var boutons = cadre.querySelectorAll(".quiz-choix");
		if (k >= 1 && k <= boutons.length) boutons[k - 1].click();
	}
	document.addEventListener("keydown", clavier, true);
	function question(){
		attente = null;
		cadre.innerHTML = "";
		var q = questions[n];
		var entete = document.createElement("p"); entete.className = "quiz-entete";
		entete.textContent = "Quiz · question " + (n + 1) + " sur " + questions.length;
		var texte = document.createElement("p"); texte.className = "quiz-question"; texte.textContent = q[0];
		cadre.appendChild(entete); cadre.appendChild(texte);
		var ordre = q[1].map(function(t, i){ return i; });
		for (var a = ordre.length - 1; a > 0; a--){ var b = Math.floor(Math.random() * (a + 1)); var y = ordre[a]; ordre[a] = ordre[b]; ordre[b] = y; }
		ordre.forEach(function(idx, pos){
			var bouton = document.createElement("button");
			bouton.type = "button";
			bouton.className = "quiz-choix";
			bouton.textContent = (pos + 1) + "  " + q[1][idx];
			bouton.addEventListener("click", function(ev){
				if (ev) ev.stopPropagation();
				if (attente) return;
				var juste = idx === q[2];
				if (juste){ bons++; jouerSon("sort"); } else jouerSon("erreur");
				Array.prototype.forEach.call(cadre.querySelectorAll(".quiz-choix"), function(x){ x.disabled = true; });
				bouton.classList.add(juste ? "quiz-juste" : "quiz-faux");
				if (!juste) Array.prototype.forEach.call(cadre.querySelectorAll(".quiz-choix"), function(x, p){ if (ordre[p] === q[2]) x.classList.add("quiz-juste"); });
				var expl = document.createElement("p"); expl.className = "quiz-explication";
				expl.textContent = (juste ? "Exact. " : "Pas tout à fait. ") + q[3];
				var suite = document.createElement("p"); suite.className = "scene-suite";
				suite.textContent = toucheOuEntree() + (n + 1 < questions.length ? " : question suivante" : " : ton score");
				cadre.appendChild(expl); cadre.appendChild(suite);
				attente = function(){ n++; if (n < questions.length) question(); else resultat(); };
				setTimeout(function(){ fond.addEventListener("click", function suivant(){ fond.removeEventListener("click", suivant); if (attente) attente(); }); }, 300);
			});
			cadre.appendChild(bouton);
		});
	}
	function resultat(){
		attente = null;
		cadre.innerHTML = "";
		var meilleur = Math.max(state.quiz[chapitre] || 0, bons);
		state.quiz[chapitre] = meilleur;
		state.save();
		var note = document.createElement("p"); note.className = "victoire-note"; note.textContent = bons + " / " + questions.length;
		var mot = document.createElement("p"); mot.className = "scene-titre";
		mot.textContent = bons === questions.length ? "Sans faute !" : (bons >= 3 ? "Bien retenu." : "À revoir : badges relit les leçons.");
		var plus = document.createElement("p"); plus.className = "scene-ligne";
		plus.textContent = "Meilleur score : " + meilleur + " / 5. Le quiz se rejoue quand tu veux : quiz " + numeroAffiche(chapitre) + ".";
		var suite = document.createElement("p"); suite.className = "scene-suite"; suite.textContent = toucheOuEntree() + " pour continuer";
		[note, mot, plus, suite].forEach(function(e){ cadre.appendChild(e); });
		jouerSon(bons >= 4 ? "victoire" : "quete");
		attente = fermer;
		setTimeout(function(){ fond.addEventListener("click", function(){ if (attente) attente(); }); }, 300);
	}
	question();
}

Shell.sorts.quiz = function(args, io){
	var choix = { "1": 1, "2": 3, "3": 2, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10, "10": 11 }[args[0]] || (state.chapitreEnCours ? state.chapitreEnCours() : 1);
	var fini = choix === 1 ? state.has("victoire") : (choix === 3 ? !!state.quests["r_fin"] : (choix === 5 ? !!state.quests["d_fin"] : (choix === 6 ? !!state.quests["h_rapport"] : (choix === 7 ? !!state.quests["m6_rapport"] : (choix === 8 ? !!state.quests["p7_rapport"] : (choix === 9 ? !!state.quests["n8_rapport"] : (choix === 10 ? !!state.quests["n9_rapport"] : (choix === 11 ? !!state.quests["n10_rapport"] : !!state.quests["c_rapport"]))))))));
	if (choix === 5 && (typeof QUIZ === "undefined" || !QUIZ[5])) return fini ? "Le quiz du chapitre 4 arrivera bientôt." : "Le quiz du chapitre 4 s'ouvrira à la fin du chapitre.";
	if (!fini) return "Le quiz du chapitre " + numeroAffiche(choix) + " s'ouvre à la fin du chapitre. " + C.gris("(quiz 1, quiz 2, quiz 3, quiz 4, quiz 5, quiz 6, quiz 7, quiz 8, quiz 9 ou quiz 10 pour un chapitre déjà terminé)");
	setTimeout(function(){ lancerQuiz(choix); }, 50);
	return C.gris("(Le quiz du chapitre " + numeroAffiche(choix) + " : 5 questions tirées au hasard. 1 à 4 pour répondre, Échap pour sortir.)");
};

/* ------------------------------------------------------------------ */
/* L'ambiance sonore : un fond discret par chapitre (avec son on)       */
/* ------------------------------------------------------------------ */

var ambiance = { chapitre: null, noeuds: [], minuteurs: [], maitre: null };
function arreterAmbiance(){
	ambiance.minuteurs.forEach(clearInterval);
	ambiance.minuteurs = [];
	if (ambiance.maitre && contexteAudio){
		var m = ambiance.maitre, noeuds = ambiance.noeuds;
		m.gain.setTargetAtTime(0, contexteAudio.currentTime, 0.4);
		setTimeout(function(){ noeuds.forEach(function(n){ try { n.stop(); } catch (e){} }); try { m.disconnect(); } catch (e){} }, 1500);
	}
	ambiance.noeuds = [];
	ambiance.maitre = null;
	ambiance.chapitre = null;
}
function note(frequence, duree, type, volume, glisse){
	if (!ambiance.maitre) return;
	var t = contexteAudio.currentTime, osc = contexteAudio.createOscillator(), g = contexteAudio.createGain();
	osc.type = type || "triangle";
	osc.frequency.setValueAtTime(frequence, t);
	if (glisse) osc.frequency.exponentialRampToValueAtTime(glisse, t + duree);
	g.gain.setValueAtTime(volume || 0.25, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
	osc.connect(g); g.connect(ambiance.echo || ambiance.maitre);
	osc.start(t); osc.stop(t + duree + 0.05);
}
function bourdon(frequence, type, volume){
	var osc = contexteAudio.createOscillator(), g = contexteAudio.createGain();
	osc.type = type || "sine"; osc.frequency.value = frequence; g.gain.value = volume;
	osc.connect(g); g.connect(ambiance.maitre); osc.start();
	ambiance.noeuds.push(osc);
}
function souffle(coupure, volume){
	var taille = contexteAudio.sampleRate * 2, tampon = contexteAudio.createBuffer(1, taille, contexteAudio.sampleRate), d = tampon.getChannelData(0);
	for (var i = 0; i < taille; i++) d[i] = Math.random() * 2 - 1;
	var src = contexteAudio.createBufferSource(); src.buffer = tampon; src.loop = true;
	var filtre = contexteAudio.createBiquadFilter(); filtre.type = "lowpass"; filtre.frequency.value = coupure;
	var g = contexteAudio.createGain(); g.gain.value = volume;
	src.connect(filtre); filtre.connect(g); g.connect(ambiance.maitre); src.start();
	ambiance.noeuds.push(src);
}
function lancerAmbiance(chapitre){
	try {
		if (!contexteAudio) contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
		if (contexteAudio.state === "suspended") contexteAudio.resume();
	} catch (e){ return; }
	arreterAmbiance();
	ambiance.chapitre = chapitre;
	var maitre = contexteAudio.createGain();
	maitre.gain.setValueAtTime(0, contexteAudio.currentTime);
	maitre.gain.linearRampToValueAtTime(0.05, contexteAudio.currentTime + 3);
	maitre.connect(contexteAudio.destination);
	ambiance.maitre = maitre;
	// Un écho, pour les gouttes du donjon et les notes du village.
	var echo = contexteAudio.createDelay(); echo.delayTime.value = 0.32;
	var retour = contexteAudio.createGain(); retour.gain.value = 0.35;
	var entree = contexteAudio.createGain();
	entree.connect(maitre); entree.connect(echo); echo.connect(retour); retour.connect(echo); retour.connect(maitre);
	ambiance.echo = entree;
	var gamme = [392, 440, 523.25, 587.33, 659.25, 783.99];
	if (chapitre === 1){
		// Le village : un accord tenu, et de temps en temps quelques notes de luth.
		bourdon(196, "sine", 0.18); bourdon(293.66, "sine", 0.1);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.6) note(gamme[Math.floor(Math.random() * gamme.length)], 0.9, "triangle", 0.18); }, 2600));
	} else if (chapitre === 11){
		// Le Lac Profond : l'eau noire qui respire sous la voûte, un bourdon très grave, des gouttes, et parfois une bulle qui remonte.
		souffle(180, 0.3); bourdon(41.2, "sine", 0.22); bourdon(61.7, "sine", 0.07);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.7) note(Math.random() < 0.5 ? 1318.5 : 1174.7, 0.12, "sine", 0.05, 1600); }, 2300));
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.3) note(220 + Math.random() * 110, 0.5, "triangle", 0.03, 500); }, 6100));
	} else if (chapitre === 10){
		// La Chronothèque : un bourdon d'orgue sous la voûte, le sable qui coule, et de temps en temps le tic d'une grande horloge.
		souffle(900, 0.12); bourdon(65.4, "sine", 0.2); bourdon(98, "sine", 0.08); bourdon(130.8, "triangle", 0.03);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.8) note(Math.random() < 0.5 ? 1760 : 1568, 0.05, "square", 0.025, 2000); }, 2000));
	} else if (chapitre === 9){
		// Le Grand Port : la houle lourde, un bourdon grave de guerre, et de temps en temps la corne d'un navire au loin.
		souffle(220, 0.48); bourdon(49, "sine", 0.22); bourdon(73.4, "sine", 0.08);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.35) note(110 + Math.floor(Math.random() * 2) * 27.5, 1.6, "sawtooth", 0.035, 300); }, 5200));
	} else if (chapitre === 8){
		// Le port de l'île : la houle sur la jetée, un bourdon de mer, et de temps en temps le cri d'une mouette.
		souffle(260, 0.42); bourdon(55, "sine", 0.2); bourdon(82.4, "sine", 0.07);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.45) note(1500 + Math.random() * 300, 0.35, "sine", 0.07, 900); }, 3400));
	} else if (chapitre === 3){
		// La salle des serveurs : le souffle des ventilateurs, un ronronnement, un bip de temps en temps.
		souffle(380, 0.5); bourdon(60, "sine", 0.25); bourdon(120, "sine", 0.06);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.5) note(1320 + Math.floor(Math.random() * 3) * 220, 0.06, "square", 0.05); }, 4200));
	} else {
		// Le donjon : un grondement sourd, et des gouttes qui tombent dans le noir.
		bourdon(41.2, "sine", 0.35); bourdon(61.7, "sine", 0.12); souffle(160, 0.18);
		ambiance.minuteurs.push(setInterval(function(){ if (Math.random() < 0.7) note(1400 + Math.random() * 600, 0.18, "sine", 0.16, 380); }, 2300));
	}
}
function majAmbiance(forcer){
	var voulu = PROFIL.son && PROFIL.ambiance !== false && !calmeDemande;
	var chapitre = state.chapitreEnCours();
	if (!voulu){ if (ambiance.chapitre !== null) arreterAmbiance(); return; }
	if (ambiance.chapitre !== chapitre || forcer && !ambiance.maitre) lancerAmbiance(chapitre);
}
var SON_SANS_AMBIANCE = Shell.sorts.son;
Shell.sorts.son = function(args, io){
	var r = SON_SANS_AMBIANCE(args, io);
	setTimeout(function(){ majAmbiance(true); }, 0);
	return r + (PROFIL.son ? C.gris("\n(Une ambiance discrète accompagne chaque chapitre : ambiance off pour la couper, en gardant les bips.)") : "");
};
Shell.sorts.ambiance = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : PROFIL.ambiance === false);
	PROFIL.ambiance = voulu;
	if (voulu && !PROFIL.son) PROFIL.son = true;
	enregistrerProfil();
	setTimeout(function(){ majAmbiance(true); }, 0);
	return voulu ? "Ambiance sonore activée : le village, la salle des serveurs, le donjon. (ambiance off pour la couper)" : "Ambiance coupée. Les bips restent (son off pour tout couper).";
};

/* ------------------------------------------------------------------ */
/* L'accessibilité : la taille du texte et le contraste fort             */
/* ------------------------------------------------------------------ */

var TAILLES = [0.85, 1, 1.15, 1.3, 1.5];
function appliquerAffichage(){
	var echelle = TAILLES.indexOf(PROFIL.taille) > -1 ? PROFIL.taille : 1;
	document.documentElement.style.fontSize = (16 * echelle) + "px";
	document.body.style.fontSize = (16 * echelle) + "px";
	document.body.classList.toggle("contraste", !!PROFIL.contraste);
}
Shell.sorts.texte = function(args, io){
	var i = TAILLES.indexOf(TAILLES.indexOf(PROFIL.taille) > -1 ? PROFIL.taille : 1);
	var a = args[0] || "";
	if (a === "+" || a === "plus" || a === "grand") i = Math.min(TAILLES.length - 1, i + 1);
	else if (a === "-" || a === "moins" || a === "petit") i = Math.max(0, i - 1);
	else if (a === "normal" || a === "0") i = 1;
	else return "Taille du texte : " + Math.round(TAILLES[i] * 100) + " %. " + C.gris("texte + pour agrandir, texte - pour réduire, texte normal pour revenir.");
	PROFIL.taille = TAILLES[i];
	enregistrerProfil();
	appliquerAffichage();
	return "Taille du texte : " + Math.round(TAILLES[i] * 100) + " %.";
};
Shell.sorts.contraste = function(args, io){
	var voulu = args[0] === "on" || args[0] === "oui" ? true : (args[0] === "off" || args[0] === "non" ? false : !PROFIL.contraste);
	PROFIL.contraste = voulu;
	if (voulu) PROFIL.crt = false;
	enregistrerProfil();
	appliquerCrt();
	appliquerAffichage();
	return voulu ? "Contraste fort activé : texte blanc, couleurs vives, sans effet de vieil écran. (contraste off pour revenir)" : "Contraste normal. (crt on pour remettre le vieil écran)";
};

["quiz", "ambiance", "texte", "contraste"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 2, 0,
	["quiz", "le quiz d'un chapitre terminé (quiz 1, quiz 2, quiz 3)"],
	["ambiance", "l'ambiance sonore de chaque chapitre"],
	["texte + / -", "agrandir ou réduire le texte"],
	["contraste", "le contraste fort, plus lisible"]);
/* Leurs pages d'aide (help quiz, quiz --help, man quiz...) sont dans AideDuJeu.js. */

/* Au démarrage : l'affichage choisi, et le guide branché sur le terminal (une fois le terminal créé). */
appliquerAffichage();
if (term) brancherGuide();
else document.addEventListener("DOMContentLoaded", function(){ brancherGuide(); majObjectif(); });

/* ------------------------------------------------------------------ */
/* Les cinématiques : l'ouverture de chaque chapitre                    */
/* ------------------------------------------------------------------ */
/*
 * Avant la carte de chapitre (sceneDeChapitre), quatre plans : une illustration du jeu qui se
 * reconstruit par blocs de pixels (comme l'écran titre), et une phrase qui s'écrit lettre à lettre.
 * Une seule fois par chapitre (drapeau cinematiqueN) ; la commande du jeu « cinematique N » la rejoue.
 * Entrée : plan suivant. Échap : passer. Mouvement réduit demandé : on va droit à la carte.
 */
var CINEMATIQUES = {
	1: { titre: "Chapitre 1 · Terminus", plans: [
		{ image: "loc_cybersup.gif", texte: "Cybersup, Puteaux. Ce matin : l'épreuve pratique de première année." },
		{ image: "titlescreen_cybersup.gif", texte: "Pas de copie, pas de QCM. Un terminal. Chaque commande est un sort." },
		{ image: "loc_forest.gif", texte: "Derrière ta Maison s'étend Terminus : forêts, villages, grottes. Des fichiers partout." },
		{ image: "item_sorciernoir.gif", texte: "Et au bout du chemin, dans la Citadelle, le Sorcier Noir t'attend." }] },
	2: { titre: "Chapitre 2 · La panne", plans: [
		{ image: "item_ticket.gif", texte: "Un ticket d'incident, priorité haute. Plus une lettre ne sort du bâtiment B." },
		{ image: "loc_batimentb.gif", texte: "Le réseau de l'école est tombé. Les mails dorment, Lille ne répond plus." },
		{ image: "item_radia.gif", texte: "Radia, M1 réseau, t'attend devant l'armoire, son talkie-walkie à la main." },
		{ image: "item_osi.gif", texte: "Sept étages, du câble jusqu'au web. On répare de bas en haut." }] },
	3: { titre: "Chapitre 3 · La Crypte", plans: [
		{ image: "loc_warroom.gif", texte: "La WarRoom. Sur l'écran mural, les voyants passent au rouge, un par un." },
		{ image: "item_corbeau.gif", texte: "Un intrus signe ses traces d'une plume noire. On l'appelle le Corbeau." },
		{ image: "loc_citadelle.gif", texte: "Il s'est glissé dans la Citadelle, le serveur de l'école. Grace prend la radio." },
		{ image: "loc_crypte.gif", texte: "Ses sorts dorment dans le donjon, sous tes pieds. La chasse est ouverte." }] },
	4: { titre: "Chapitre 4 · L'Académie des Arcanes", plans: [
		{ image: "item_frances.gif", texte: "Quelques semaines ont passé. Les notes de Frances ont fuité sur un forum." },
		{ image: "item_corbeau.gif", texte: "Une bande de rançonneurs, la Nuée, a repris le nom du Corbeau." },
		{ image: "loc_aile_chronomancie.gif", texte: "Cette nuit, elle a frappé les archives. Une bombe logique vise minuit." },
		{ image: "loc_academie.gif", texte: "Huit maîtres t'attendent à l'Académie des Arcanes. L'horloge tourne déjà." }] },
	5: { titre: "Chapitre 5 · Le Bastion", plans: [
		{ image: "loc_serveur_bastion.gif", texte: "Quelques jours plus tard. Un serveur neuf, installé par défaut : toutes ses portes bâillent." },
		{ image: "item_pierre.gif", texte: "La Pierre d'Inspection s'allume à peine : 38 sur 100." },
		{ image: "item_frances.gif", texte: "La Nuée a juré de revenir à l'aube. Frances éprouvera chaque mur avant elle." },
		{ image: "loc_bastion.gif", texte: "Douze tours à dresser avant 6 h. L'inspecteur arrive juste derrière." }] },
	6: { titre: "Chapitre 6 · Lumen, la cité qui s'éteint", plans: [
		{ image: "loc_lumen_nuit.gif", texte: "Sous l'école dort Lumen, une cité bâtie par les premiers ingénieurs." },
		{ image: "loc_coeur_lumen.gif", texte: "Une seule machine l'éclaire : le Cœur. Depuis le départ de la Nuée, il s'épuise." },
		{ image: "loc_lumen.gif", texte: "Quartier après quartier, les lumières s'éteignent. Il est 6 h." },
		{ image: "item_lanterne_lumen.gif", texte: "À 14 h, la Longue Nuit tombera. Seize gardiens attendent une lanterne." }] },
	7: { titre: "Chapitre 7 · Port-Aube, la cité à bâtir", plans: [
		{ image: "cine7_mer_aube.gif", texte: "Lumen brille. Au petit jour, la mer est d'argent, et une île sort de la brume." },
		{ image: "cine7_quai_laurent.gif", texte: "Sur le quai, Laurent attend, le col relevé. « Voici Port-Aube. Tu vas la bâtir. »" },
		{ image: "cine7_maisons_vides.gif", texte: "Dix maisons neuves regardent la mer. Pas un nom, pas une lettre, pas une lumière." },
		{ image: "cine7_phare_orage.gif", texte: "À l'horizon, l'orage roule sur les vagues. Il frappera à 14 h. Le phare attend sa flamme." },
		{ image: "cine7_maree.gif", texte: "Ce soir, à la marée de 19 h, cinq cents étudiants. Bienvenue, Architecte." }] },
	8: { titre: "Chapitre 8 · La Flotte noire", plans: [
		{ image: "cine8_lettre.gif", texte: "Au matin de la fête, une lettre sur la table. Une plume grise. « Nous aussi, nous avons un navire. »" },
		{ image: "cine8_phare_noir.gif", texte: "Derrière le phare noir, sous une lune énorme, une flotte se rassemble. Ses navires portent des conteneurs." },
		{ image: "cine8_port_eveil.gif", texte: "Le Grand Port s'éveille. Une à une, les grues allument leurs feux verts dans le soleil levant." },
		{ image: "cine8_galons.gif", texte: "Laurent te tend une patte d'épaule, nue. « Mousse. Tout le monde commence ici. Même les amiraux. »" },
		{ image: "cine8_quais_vides.gif", texte: "Quatorze quais vides dans la brume. Une grue immobile. Une caisse oubliée. Tout est à construire." },
		{ image: "cine8_flotte_horizon.gif", texte: "L'orage gronde sur l'horizon noir de voiles. À l'aube du quatrième jour, ils seront là." }] },
	9: { titre: "Chapitre 9 · La Chronique d'Éternité", plans: [
		{ image: "cine9_empreinte.gif", texte: "Une empreinte de clé, deux initiales : P.G. La piste ne mène pas au large. Elle mène sous l'école." },
		{ image: "cine9_tour_horloge.gif", texte: "Sous la vieille tour de l'horloge, un escalier que personne n'a descendu depuis des années." },
		{ image: "cine9_chronique.gif", texte: "La Chronique : le grimoire où tout ce qui arrive à l'école est scellé. Chaque page, un sceau." },
		{ image: "cine9_page_reecrite.gif", texte: "Cette nuit, une page s'est réécrite toute seule. Dans la nouvelle version, la flotte noire était notre alliée." },
		{ image: "cine9_sablier.gif", texte: "À l'aube du quatrième jour, la Grande Synchronisation enverra sa version à tous les Royaumes." },
		{ image: "cine9_salles.gif", texte: "Quatorze maîtres du temps. Tu ne sais pas ce qu'est un commit. Dans trois jours, Chronomancien." }] },
	10: { titre: "Chapitre 10 · Le Lac Profond", plans: [
		{ image: "cine10_sceau_demain.gif", texte: "Un dernier sceau, daté de demain. Signé P.G. Quelqu'un savait ce qui allait arriver." },
		{ image: "cine10_escalier_lac.gif", texte: "Sous la Chronothèque, un escalier descend en spirale vers une lueur verte." },
		{ image: "cine10_lac.gif", texte: "Le lac de données de l'école : dix ans de journaux, d'exports et de sauvegardes, versés sans tri." },
		{ image: "cine10_oeil.gif", texte: "Sous la surface, un œil s'ouvre. Pipelinus, Gardien du Lac. P.G." },
		{ image: "cine10_bras.gif", texte: "Huit bras, huit pipelines. À l'aube du quatrième jour, la Grande Marée les lancera sur l'école." },
		{ image: "cine10_wissam.gif", texte: "Wissam lève sa lanterne. « Quinze postes, trois jours. Tu sortiras d'ici Maître du Lac. »" }] }
};
/* La carte du chapitre 1 (les autres sont dans SCENES, à l'entrée de chaque chapitre). */
var SCENE_CHAPITRE_1 = { image: "item_convocation.gif", titre: "Chapitre 1 · Terminus", chapitre: 1,
	lignes: ["Ta Maison d'abord : regarde autour de toi.", "Chaque sort appris ouvre un bout du monde.", "Le tutoriel, à droite, te guide pour les premiers pas."] };
/* La première carte de chaque chapitre : c'est elle que la cinématique précède. */
var PREMIERE_SCENE = { 2: "r_batiment", 3: "c_crypte", 4: "d_entree", 5: "h_entree", 6: "m6_entree", 7: "p7_quai", 8: "n8_quai", 9: "n9_entree", 10: "n10_entree" };

function lancerCinematique(n, apres, forcer){
	var cine = CINEMATIQUES[n];
	apres = apres || function(){};
	if (!cine || (!forcer && state.has("cinematique" + n))){ apres(); return; }
	state.set("cinematique" + n);
	if (calmeDemande){ apres(); return; }
	var fond = document.createElement("div");
	fond.id = "cinematique";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Cinématique : " + cine.titre);
	var haut = document.createElement("p"); haut.className = "cine-titre"; haut.textContent = cine.titre;
	var cadre = document.createElement("div"); cadre.className = "cine-cadre";
	var image = document.createElement("img"); image.className = "cine-image"; image.alt = "";
	var voile = document.createElement("canvas"); voile.className = "cine-voile"; voile.setAttribute("aria-hidden", "true");
	var texte = document.createElement("p"); texte.className = "cine-texte"; texte.setAttribute("aria-live", "polite");
	var bas = document.createElement("p"); bas.className = "cine-aide";
	var points = document.createElement("span"); points.className = "cine-points";
	bas.appendChild(points);
	bas.appendChild(document.createTextNode(window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? "  touche : suite" : "  Entrée : suite · Échap : passer"));
	cadre.appendChild(image); cadre.appendChild(voile);
	[haut, cadre, texte, bas].forEach(function(e){ fond.appendChild(e); });
	document.body.appendChild(fond);
	jouerSon("niveau");

	var plan = -1, minuteurs = [], fini = false, ecriture = null;
	function plusTard(f, ms){ minuteurs.push(setTimeout(f, ms)); }
	function arreter(){ minuteurs.forEach(clearTimeout); minuteurs = []; if (ecriture){ clearInterval(ecriture); ecriture = null; } }
	function terminer(){
		if (fini) return;
		fini = true;
		arreter();
		document.removeEventListener("keydown", touche, true);
		fond.classList.add("cine-sortie");
		setTimeout(function(){ if (fond.parentNode) fond.parentNode.removeChild(fond); apres(); }, 280);
	}
	function reconstruire(){
		var largeur = image.clientWidth || 416, hauteur = image.clientHeight || 404;
		var taille = Math.max(8, Math.round(largeur / 22));
		voile.width = largeur; voile.height = hauteur; voile.style.display = "block";
		var ctx = voile.getContext("2d");
		ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, largeur, hauteur);
		var blocs = [];
		for (var y = 0; y < hauteur; y += taille) for (var x = 0; x < largeur; x += taille) blocs.push([x, y]);
		for (var i = blocs.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = blocs[i]; blocs[i] = blocs[j]; blocs[j] = t; }
		var parImage = Math.ceil(blocs.length / 30), position = 0, numero = plan;
		(function etape(){
			if (fini || numero !== plan) return;
			for (var k = 0; k < parImage && position < blocs.length; k++, position++) ctx.clearRect(blocs[position][0], blocs[position][1], taille, taille);
			if (position < blocs.length) requestAnimationFrame(etape); else voile.style.display = "none";
		})();
	}
	function montrer(i){
		arreter();
		if (i >= cine.plans.length){ terminer(); return; }
		plan = i;
		// Typographie française : une espace insécable avant : ; ! ? et », pour que la ponctuation ne commence jamais une ligne.
		var p = { image: cine.plans[i].image, texte: cine.plans[i].texte.replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0") };
		points.textContent = cine.plans.map(function(x, k){ return k === i ? "●" : "○"; }).join(" ");
		fond.classList.remove("cine-plan");
		void fond.offsetWidth;
		fond.classList.add("cine-plan");
		texte.textContent = "";
		image.onload = function(){ if (plan === i) reconstruire(); };
		image.src = sourceImage("./static/img/" + p.image);
		if (image.complete) reconstruire();
		var lettres = 0;
		plusTard(function(){
			ecriture = setInterval(function(){
				lettres++;
				texte.textContent = p.texte.substring(0, lettres);
				if (lettres >= p.texte.length){ clearInterval(ecriture); ecriture = null; plusTard(function(){ montrer(i + 1); }, 2200); }
			}, 28);
		}, 450);
	}
	// Entrée (ou un toucher) : finir la phrase en cours, puis passer au plan suivant. Échap : tout passer.
	function avancer(){
		if (fini) return;
		if (ecriture){ arreter(); texte.textContent = cine.plans[plan].texte.replace(/ ([:;!?»])/g, "\u00a0$1").replace(/« /g, "«\u00a0"); voile.style.display = "none"; plusTard(function(){ montrer(plan + 1); }, 2200); return; }
		montrer(plan + 1);
	}
	function touche(e){
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		e.preventDefault(); e.stopPropagation();
		if (e.key === "Escape") terminer(); else avancer();
	}
	setTimeout(function(){
		if (fini) return;
		document.addEventListener("keydown", touche, true);
		fond.addEventListener("click", avancer);
	}, 300);
	montrer(0);
}

/* La carte d'un chapitre : sa cinématique d'abord, la première fois. */
var SCENE_SANS_CINEMATIQUE = sceneDeChapitre;
sceneDeChapitre = function(scene){
	var n = scene && scene.chapitre;
	var premiere = n === 1 ? scene === SCENE_CHAPITRE_1 : (PREMIERE_SCENE[n] && SCENES[PREMIERE_SCENE[n]] === scene);
	if (premiere && CINEMATIQUES[n] && !state.has("cinematique" + n)){
		lancerCinematique(n, function(){ SCENE_SANS_CINEMATIQUE(scene); });
		return;
	}
	SCENE_SANS_CINEMATIQUE(scene);
};

/* La commande du jeu : revoir une cinématique. */
if (typeof SORTS_DU_JEU !== "undefined" && SORTS_DU_JEU.indexOf("cinematique") === -1) SORTS_DU_JEU.push("cinematique");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["cinematique", "revoir l'ouverture d'un chapitre (cinematique 1 à 10)"]);
/* Sa page d'aide (help cinematique) est dans AideDuJeu.js. Les chapitres : 1 (Terminus), 2 (la panne), 3 (la Crypte), 4 (l'Académie),
   5 (le Bastion), 6 (Lumen), 7 (Port-Aube), 8 (le Grand Port), 9 (la Chronothèque), 10 (le Lac Profond) ; sans numéro, celle du chapitre en cours. */
Shell.sorts.cinematique = function(args){
	var affiche = { 1: 1, 2: 3, 3: 2, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9, 11: 10 }[state.chapitreEnCours()] || 1;
	var n = args && args[0] ? parseInt(args[0], 10) : affiche;
	if (!CINEMATIQUES[n]) throw new ShellError("cinematique : un numéro de chapitre, de 1 à 10. Exemple : cinematique 3");
	if (calmeDemande) return C.gris("(Ton système demande de réduire les animations : les cinématiques sont coupées.)");
	setTimeout(function(){ lancerCinematique(n, function(){ var champ = document.getElementById("saisie"); if (champ) champ.focus(); }, true); }, 50);
	return "";
};
