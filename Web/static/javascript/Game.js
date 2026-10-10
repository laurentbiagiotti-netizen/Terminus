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
	"Examine un objet ou parle à quelqu'un avec " + C.vert("less OBJET") + ".\n\n" +
	"Si tu ne sais plus où tu es, tape " + C.vert("pwd") + ". Si tu ne sais plus quoi faire, tape " + C.vert("quetes") + ".\n" +
	"Chaque sort appris, chaque lieu découvert et chaque quête rapportent de l'expérience : tape " + C.vert("xp") + " pour voir ta note.\n\n" +
	"Vas-y, explore. Nous espérons que ce que tu trouveras te plaira. Commence par taper ls.\n";

/* Met à jour le bandeau d'expérience au-dessus de l'image. */
function majEtat(){
	var niveau = document.getElementById("etat-niveau");
	if (!niveau) return;
	var pr = state.progression();
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
		formulaire: document.getElementById("ligne")
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
		var identifiant = adopterPrenom(reponse);
		term.echo("\nEnchanté, " + C.gras(PROFIL.prenom) + ". Sur ce système, tu seras " + C.vert(identifiant) +
			C.gris(" (c'est ce que répondra le sort whoami)") + ".\n");
		state.save();
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
