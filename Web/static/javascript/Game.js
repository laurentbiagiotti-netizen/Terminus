var state = new GameState();
// Reprend la partie sauvegardee dans le navigateur, s'il y en a une.
var partieRestauree = state.load();
var current_room = state.getCurrentRoom();
var term = null;

var MESSAGE_ACCUEIL =
	C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
	"Bienvenue ! Si tu découvres le jeu, voici quelques conseils :\n\n" +
	"Regarde autour de toi avec le sort " + C.vert("ls") + ".\n" +
	"Va dans un autre lieu avec " + C.vert("cd LIEU") + ".\n" +
	"Reviens sur tes pas avec " + C.vert("cd ..") + ".\n" +
	"Examine un objet ou parle à quelqu'un avec " + C.vert("cat OBJET") + ". Pour un très long texte, " + C.vert("less OBJET") + " en montre la première page.\n\n" +
	"Si tu ne sais plus où tu es, tape " + C.vert("pwd") + ". Si tu ne sais plus quoi faire, tape " + C.vert("quetes") + ".\n" +
	"Chaque sort appris, chaque lieu découvert et chaque quête rapportent de l'expérience : tape " + C.vert("xp") + " pour voir ta note.\n\n" +
	"Vas-y, explore. Nous espérons que ce que tu trouveras te plaira. Commence par taper ls.\n";

/* Des bips 8 bits, coupés par défaut (sort son). */
var contexteAudio = null;
var MELODIES = {
	sort: [[660, 0.06], [990, 0.09]],
	quete: [[523, 0.08], [659, 0.08], [784, 0.14]],
	niveau: [[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.2]],
	succes: [[880, 0.07], [1175, 0.07], [1760, 0.16]],
	victoire: [[523, 0.12], [523, 0.12], [523, 0.12], [698, 0.36], [880, 0.12], [784, 0.12], [1047, 0.5]],
	erreur: [[150, 0.08]]
};
jouerSon = function(nom){
	if (!PROFIL.son || !MELODIES[nom]) return;
	try {
		if (!contexteAudio) contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
		var t = contexteAudio.currentTime;
		MELODIES[nom].forEach(function(note){
			var osc = contexteAudio.createOscillator(), volume = contexteAudio.createGain();
			osc.type = "square";
			osc.frequency.value = note[0];
			volume.gain.setValueAtTime(nom === "erreur" ? 0.03 : 0.05, t);
			volume.gain.exponentialRampToValueAtTime(0.0001, t + note[1]);
			osc.connect(volume);
			volume.connect(contexteAudio.destination);
			osc.start(t);
			osc.stop(t + note[1]);
			t += note[1] * 0.9;
		});
	} catch (e){
		// Pas de son disponible : tant pis, le jeu continue.
	}
};

/* Met à jour le bandeau d'expérience au-dessus de l'image. */
function majEtat(){
	var niveau = document.getElementById("etat-niveau");
	if (!niveau) return;
	var pr = state.progression();
	var etat = document.getElementById("etat");
	var radio = document.getElementById("radio");
	if (radio && radio.hidden && state.chapitreEnCours() === 2 && typeof texteRadio === "function") radioSOC(texteRadio());
	etat.classList.toggle("etat-alerte", state.chapitreEnCours() === 2 && !state.quests["c_rapport"]);
	if (state.chapitreEnCours() === 2){
		var max2 = state.xpMax2();
		niveau.textContent = state.quests["c_rapport"] ? "Chapitre 2 · incident clos" : "Chapitre 2 · incident en cours";
		document.getElementById("etat-plein").style.width = Math.round(Math.min(1, state.xp2 / max2) * 100) + "%";
		document.getElementById("etat-xp").textContent = state.xpNet(2) + " XP · " + state.noteTexte(2) + (state.malus2 ? " (indices -" + state.malus2 + ")" : "");
		document.getElementById("etat").title = "Note du chapitre 2. Tape xp pour le détail.";
		return;
	}
	niveau.textContent = "Niveau " + pr.niveau + " · " + pr.titre;
	document.getElementById("etat-plein").style.width = Math.round(pr.part * 100) + "%";
	document.getElementById("etat-xp").textContent = pr.xp + " XP · " + state.noteTexte() + (state.malus ? " (indices -" + state.malus + ")" : "");
	document.getElementById("etat").title = pr.suivant ?
		"Encore " + (pr.plafond - pr.xp) + " XP avant le niveau « " + pr.suivant + " ». Tape xp pour le détail." :
		"Niveau maximal. Tape xp pour le détail.";
}

/*
 * Au chapitre 2, la salle de crise : les messages radio de Grace, d'Evi et de Laurent
 * s'affichent aussi dans un bandeau, comme sur un écran du SOC.
 */
function radioSOC(texte){
	if (typeof document === "undefined" || state.chapitreEnCours() !== 2) return;
	var brut = String(texte).replace(/\x1b\[[0-9;]*m/g, "");
	var m = /(La radio grésille[.,]?|Evi, à la radio|Grace, à la radio)\s*(.*)$/.exec(brut.replace(/\n/g, " "));
	if (!m) return;
	var qui = /Evi/.test(brut) ? "Evi" : (/C'est Laurent|Laurent :/.test(brut) ? "Laurent" : "Grace");
	var message = m[2].replace(/^C'est (Grace|Evi|Laurent)\s*:\s*/, "").replace(/^:\s*/, "").trim();
	var radio = document.getElementById("radio");
	if (!radio) return;
	var d = new Date();
	radio.querySelector(".radio-qui").textContent = qui + ", " + (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
	radio.querySelector(".radio-texte").textContent = message;
	radio.hidden = false;
	radio.classList.remove("radio-nouveau");
	void radio.offsetWidth;
	radio.classList.add("radio-nouveau");
}

/* La carte prend la place de l'image dans le panneau de droite (sur un écran assez large). */
function montrerCarte(texte){
	var panneau = document.getElementById("pics"), scene = document.getElementById("scene");
	if (!panneau || !scene) return false;
	var carte = document.getElementById("carte");
	if (!carte){
		carte = document.createElement("pre");
		carte.id = "carte";
		carte.setAttribute("aria-label", "Carte des lieux visités");
		panneau.insertBefore(carte, scene);
	}
	carte.innerHTML = ansiVersHTML(texte);
	scene.hidden = true;
	document.getElementById("legende").textContent = "";
	return true;
}

/* Le mode vieil écran est activé par défaut ; crt off le coupe. */
function appliquerCrt(){
	document.body.classList.toggle("crt", PROFIL.crt !== false);
}

function demarrer(){
	appliquerCrt();
	term = new Terminal({
		conteneur: document.getElementById("term"),
		sortie: document.getElementById("sortie"),
		saisie: document.getElementById("saisie"),
		invite: document.getElementById("invite"),
		formulaire: document.getElementById("ligne"),
		touches: document.getElementById("touches")
	});
	term.onCommande = Shell.executer;
	term.onCompletion = Shell.completer;
	term.historique = Shell.historique.slice();
	term.positionHistorique = term.historique.length;

	// Remet le monde d'aplomb apres un rechargement, sans rejouer les annonces.
	verifierMonde();
	Shell.narration = [];

	montrerImage("./static/img/titlescreen_cybersup.gif", "");
	if (!PROFIL.prenom){
		intro(function(){
			demanderPrenom();
			document.getElementById("saisie").focus();
		});
	} else {
		accueillir();
	}
	// La radio du SOC reprend là où l'enquête en est.
	if (state.chapitreEnCours() === 2 && typeof texteRadio === "function" && state.has("crypteOuverte")) radioSOC(texteRadio());
	state.dernierInstant = Date.now();
	majEtat();
	document.getElementById("saisie").focus();
}

/* Premier lancement : le prénom remplace « apprenti » partout sur le système. */
function demanderPrenom(){
	term.echo(C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
		"Un terminal s'allume. Quelque part, un serveur attend un nouvel utilisateur.\n" +
		C.gris("Connecte-toi avec ton prénom : il deviendra ton identifiant sur le système.") + "\n");
	term.demander("terminus login: ", false, function(reponse){
		var refus = prenomRefuse(reponse);
		if (refus){
			term.echo(C.jaune(refus));
			demanderPrenom();
			return;
		}
		var anciennes = sessionsDuPrenom(reponse);
		if (anciennes.length){
			proposerReprise(reponse, anciennes);
			return;
		}
		nouvellePartie(reponse);
	});
}

function nouvellePartie(prenom){
	var identifiant = adopterPrenom(prenom);
	term.echo("\nEnchanté, " + C.gras(PROFIL.prenom) + ". Sur ce système, tu seras " + C.vert(identifiant) +
		C.gris(" (c'est ce que répondra le sort whoami)") + ".\n");
	state.save();
	demanderParcours();
}

/* Des parties à ce prénom attendent sur cet ordinateur : on demande avant d'en reprendre une. */
function proposerReprise(prenom, anciennes){
	var texte = "\n" + (anciennes.length === 1 ? "Une partie à ce prénom a été mise de côté sur cet ordinateur :" : "Des parties à ce prénom ont été mises de côté sur cet ordinateur :") + "\n";
	anciennes.forEach(function(x, i){ texte += "  " + C.vert(String(i + 1)) + "  " + decrireSession(x) + "\n"; });
	texte += "  " + C.vert("n") + "  ce n'est pas la mienne : commencer une nouvelle partie\n";
	term.echo(texte);
	term.demander(anciennes.length === 1 ? "Tape 1 pour la reprendre, ou n : " : "Tape le numéro de ta partie, ou n : ", false, function(reponse){
		var choix = String(reponse).trim().toLowerCase();
		var n = parseInt(choix, 10);
		if (n >= 1 && n <= anciennes.length){
			if (reprendreSession(anciennes[n - 1])){
				term.echo("On reprend ta partie...");
				window.location.reload();
			} else {
				term.echo(C.jaune("Impossible de reprendre cette partie (stockage indisponible)."));
			}
			return;
		}
		if (choix === "n" || choix === "non" || choix === "nouvelle"){
			nouvellePartie(prenom);
			return;
		}
		term.echo(C.jaune("Réponds par un numéro de la liste, ou n."));
		proposerReprise(prenom, anciennes);
	});
}

/* Les deux enveloppes, à choisir au clavier (1 ou 2) ou d'un clic. */
function enveloppes(){
	var boite = document.createElement("div");
	boite.className = "enveloppes";
	[["1", "item_convocation.gif", "Convocation", "L'épreuve pratique de première année : tu découvres le terminal Linux. Chapitre 1, puis chapitre 2."],
	 ["2", "item_mission.gif", "Ordre de mission", "La WarRoom demande un renfort d'urgence, pour qui connaît déjà les bases. Chapitre 2 directement."]].forEach(function(e){
		var bouton = document.createElement("button");
		bouton.type = "button";
		bouton.className = "enveloppe";
		var image = document.createElement("img");
		image.src = sourceImage("./static/img/" + e[1]);
		image.alt = "";
		var titre = document.createElement("span");
		titre.className = "enveloppe-titre";
		titre.textContent = e[0] + "  " + e[2];
		var texte = document.createElement("span");
		texte.className = "enveloppe-texte";
		texte.textContent = e[3];
		bouton.appendChild(image);
		bouton.appendChild(titre);
		bouton.appendChild(texte);
		bouton.addEventListener("click", function(){
			if (!term.question) return;
			boite.classList.add("enveloppes-choisi");
			bouton.classList.add("enveloppe-choisie");
			term.repondre(e[0]);
		});
		boite.appendChild(bouton);
	});
	return boite;
}

/* Deux convocations possibles : l'épreuve de première année, ou la mission cyber pour ceux qui connaissent les bases. */
function demanderParcours(){
	term.echo("Dans ta boîte aux lettres, deux enveloppes portent ton nom. Une seule est pour toi.");
	term.ajouterElement(enveloppes());
	term.demander("Tape 1 ou 2 (ou choisis une enveloppe) : ", false, function(reponse){
		var choix = String(reponse).trim();
		Array.prototype.forEach.call(document.querySelectorAll(".enveloppes"), function(b){
			b.classList.add("enveloppes-choisi");
			Array.prototype.forEach.call(b.querySelectorAll(".enveloppe"), function(e, i){ if (String(i + 1) === choix) e.classList.add("enveloppe-choisie"); e.disabled = true; });
		});
		if (choix !== "1" && choix !== "2"){
			term.echo(C.jaune("Réponds 1 ou 2. En cas de doute, choisis 1 : c'est le début de l'histoire."));
			demanderParcours();
			return;
		}
		if (choix === "2" && commencerChapitre2()){
			Shell.fin();
			return;
		}
		accueillir();
		term.definirInvite(Shell.invite());
		majEtat();
	});
}

function accueillir(){
	if (partieRestauree){
		term.echo(C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
			"Content de te revoir, " + PROFIL.prenom + ". Ta partie a été retrouvée : tu es dans " + current_room.toString() + ".\n" +
			C.gris("Tape ls pour regarder autour de toi, quetes pour ton journal, xp pour ta note, recommencer pour repartir de zéro.") + "\n");
	} else {
		term.echo(MESSAGE_ACCUEIL);
	}
	term.definirInvite(Shell.invite());
}

if (document.readyState === "loading"){
	document.addEventListener("DOMContentLoaded", demarrer);
} else {
	demarrer();
}
