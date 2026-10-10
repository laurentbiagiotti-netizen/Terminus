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
	if (state.chapitreEnCours() === 2){
		var max2 = state.xpMax2();
		niveau.textContent = "Chapitre 2 · la Crypte";
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

function demarrer(){
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
		demanderPrenom();
	} else {
		accueillir();
	}
	state.dernierInstant = Date.now();
	majEtat();
	document.getElementById("saisie").focus();
}

/* Premier lancement : le prénom remplace « apprenti » partout sur le système. */
function demanderPrenom(){
	term.echo(C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
		"Un terminal s'allume. Quelque part, un serveur attend un nouvel utilisateur.\n");
	term.demander("Avant de commencer, quel est ton prénom ? ", false, function(reponse){
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

/* Deux convocations possibles : l'épreuve de première année, ou la mission cyber pour ceux qui connaissent les bases. */
function demanderParcours(){
	term.echo("Dans ta boîte aux lettres, deux enveloppes portent ton nom. Une seule est pour toi.\n\n" +
		"  " + C.vert("1") + "  Une convocation à l'épreuve pratique de première année.\n" +
		"     Tu découvres le terminal Linux : c'est le début de l'histoire. " + C.gris("(chapitre 1, puis chapitre 2)") + "\n" +
		"  " + C.vert("2") + "  Un ordre de mission de la WarRoom : renfort demandé d'urgence.\n" +
		"     Tu connais déjà les bases du terminal, on a besoin de toi tout de suite. " + C.gris("(chapitre 2 directement)") + "\n");
	term.demander("Tape 1 ou 2 : ", false, function(reponse){
		var choix = String(reponse).trim();
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
