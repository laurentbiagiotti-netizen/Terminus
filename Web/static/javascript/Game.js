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
/* ------------------------------------------------------------------ */
/* Les effets : bannières, transition des images, écran de victoire    */
/* ------------------------------------------------------------------ */

var calmeDemande = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Une bannière en haut du panneau de l'image, le temps de savourer une quête, un succès, un niveau. */
var bannieres = [];
function banniere(genre, texte){
	var panneau = document.getElementById("pics");
	if (!panneau) return;
	var titres = { quete: "Quête accomplie", sort: "Nouveau sort", succes: "Succès débloqué", niveau: "Niveau supérieur" };
	var detail = texte.replace(/^[★✦◆▲]\s*/, "").replace(/^(Quête secondaire accomplie|Quête accomplie|Nouveau sort appris|Succès débloqué)\s*:\s*/, "")
		.replace(/\s+\+\d+ XP$/, "").replace(/\s*\(.*$/, "").replace(/\. Tape succes.*$/, "");
	if (genre === "sort") detail = detail.split(" ")[0];
	var b = document.createElement("div");
	b.className = "banniere banniere-" + genre;
	b.setAttribute("role", "status");
	var t = document.createElement("span"); t.className = "banniere-titre";
	t.textContent = /secondaire/.test(texte) ? "Quête secondaire" : titres[genre];
	var d = document.createElement("span"); d.className = "banniere-detail"; d.textContent = detail;
	b.appendChild(t); b.appendChild(d);
	panneau.appendChild(b);
	bannieres.push(b);
	// Les bannières s'empilent ; au-delà de trois, les plus anciennes s'effacent.
	while (bannieres.length > (window.innerWidth < 820 ? 1 : 3)){ var vieille = bannieres.shift(); if (vieille.parentNode) vieille.parentNode.removeChild(vieille); }
	bannieres.forEach(function(x, i){ x.style.setProperty("--rang", String(bannieres.length - 1 - i)); });
	setTimeout(function(){
		b.classList.add("banniere-sortie");
		setTimeout(function(){
			if (b.parentNode) b.parentNode.removeChild(b);
			bannieres = bannieres.filter(function(x){ return x !== b; });
		}, calmeDemande ? 0 : 300);
	}, genre === "niveau" ? 4200 : 2800);
}

/* Quand l'image du panneau change, la nouvelle se dévoile par blocs de pixels, très vite. */
var montrerImageSansEffet = montrerImage;
montrerImage = function(src, legende){
	var scene = document.getElementById("scene");
	var avant = scene ? scene.getAttribute("src") : null;
	montrerImageSansEffet(src, legende);
	if (!scene || calmeDemande || avant === scene.getAttribute("src") || scene.hidden) return;
	var panneau = document.getElementById("pics");
	var voile = document.getElementById("voile-scene");
	if (!voile){
		voile = document.createElement("canvas");
		voile.id = "voile-scene";
		voile.setAttribute("aria-hidden", "true");
		panneau.appendChild(voile);
	}
	var r = scene.getBoundingClientRect(), rp = panneau.getBoundingClientRect();
	if (!r.width || !r.height) return;
	voile.style.left = (r.left - rp.left) + "px";
	voile.style.top = (r.top - rp.top) + "px";
	voile.width = Math.round(r.width);
	voile.height = Math.round(r.height);
	voile.style.width = r.width + "px";
	voile.style.height = r.height + "px";
	var ctx = voile.getContext("2d");
	ctx.fillStyle = "#000000";
	ctx.fillRect(0, 0, voile.width, voile.height);
	voile.hidden = false;
	var taille = Math.max(8, Math.round(voile.width / 16)), blocs = [];
	for (var y = 0; y < voile.height; y += taille) for (var x = 0; x < voile.width; x += taille) blocs.push([x, y]);
	for (var i = blocs.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var t = blocs[i]; blocs[i] = blocs[j]; blocs[j] = t; }
	var parImage = Math.ceil(blocs.length / 10), position = 0, jeton = {};
	voile.jeton = jeton;
	(function etape(){
		if (voile.jeton !== jeton) return;
		for (var k = 0; k < parImage && position < blocs.length; k++, position++) ctx.clearRect(blocs[position][0], blocs[position][1], taille, taille);
		if (position < blocs.length) requestAnimationFrame(etape);
		else voile.hidden = true;
	})();
};

/* La fin d'un chapitre : un écran de victoire, puis on retourne au jeu. */
function ecranDeVictoire(chapitre){
	var fond = document.createElement("div");
	fond.id = "victoire";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Chapitre terminé");
	var cadre = document.createElement("div");
	cadre.className = "victoire-cadre";
	var image = document.createElement("img");
	image.src = sourceImage(chapitre === 2 ? "./static/img/item_locker.gif" : "./static/img/item_grad.gif");
	image.alt = "";
	var titre = document.createElement("p");
	titre.className = "victoire-titre";
	titre.textContent = chapitre === 2 ? "Incident clos" : "Le Sorcier Noir est vaincu";
	var note = document.createElement("p");
	note.className = "victoire-note";
	note.textContent = state.noteTexte(chapitre === 2 ? 2 : undefined);
	var mention = document.createElement("p");
	mention.className = "victoire-mention";
	mention.textContent = state.mention(chapitre === 2 ? 2 : undefined);
	var commande = document.createElement("p");
	commande.className = "victoire-commande";
	commande.appendChild(document.createTextNode(chapitre === 2 ? "Ton certificat : " : "Ton diplôme : "));
	var code = document.createElement("code");
	code.textContent = chapitre === 2 ? "cat ~/CertificatCyber" : "cat Diplome";
	commande.appendChild(code);
	var suite = document.createElement("p");
	suite.className = "victoire-suite";
	suite.textContent = "Appuie sur Entrée pour continuer";
	[image, titre, note, mention, commande, suite].forEach(function(e){ cadre.appendChild(e); });
	fond.appendChild(cadre);
	document.body.appendChild(fond);
	function fermer(e){
		if (e && e.type === "keydown"){ e.preventDefault(); e.stopPropagation(); }
		document.removeEventListener("keydown", fermer, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		document.getElementById("saisie").focus();
	}
	setTimeout(function(){
		document.addEventListener("keydown", fermer, true);
		fond.addEventListener("click", fermer);
	}, 500);
}
/* Le Corbeau démasqué : l'oiseau se brouille, et derrière lui apparaît la personne. */
function revelationDuCorbeau(){
	var fond = document.createElement("div");
	fond.id = "revelation";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Le Corbeau démasqué");
	var scene = document.createElement("div");
	scene.className = "revelation-scene";
	var image = document.createElement("img");
	image.src = sourceImage("./static/img/item_corbeau.gif");
	image.alt = "";
	var nom = document.createElement("p");
	nom.className = "revelation-nom";
	nom.textContent = "Le Corbeau";
	var vrai = document.createElement("p");
	vrai.className = "revelation-vrai";
	vrai.textContent = "Frances, la stagiaire de Laurent";
	var suite = document.createElement("p");
	suite.className = "revelation-suite";
	suite.textContent = "Corbeau démasqué. Appuie sur Entrée pour l'écouter.";
	[image, nom, vrai, suite].forEach(function(e){ scene.appendChild(e); });
	fond.appendChild(scene);
	document.body.appendChild(fond);
	var minuteurs = [];
	function finale(){
		minuteurs.forEach(clearTimeout);
		fond.classList.remove("revelation-brouille");
		fond.classList.add("revelation-demasque", "revelation-fin");
		image.src = sourceImage(Corbeau.picturename || "./static/img/item_student.gif");
	}
	function fermer(e){
		if (e && e.type === "keydown"){ e.preventDefault(); e.stopPropagation(); }
		if (!fond.classList.contains("revelation-fin")){ finale(); return; }
		document.removeEventListener("keydown", fermer, true);
		if (fond.parentNode) fond.parentNode.removeChild(fond);
		document.getElementById("saisie").focus();
	}
	document.addEventListener("keydown", fermer, true);
	fond.addEventListener("click", fermer);
	if (calmeDemande){ finale(); return; }
	minuteurs.push(setTimeout(function(){ fond.classList.add("revelation-brouille"); }, 1600));
	minuteurs.push(setTimeout(function(){
		image.src = sourceImage(Corbeau.picturename || "./static/img/item_student.gif");
		fond.classList.add("revelation-demasque");
	}, 2300));
	minuteurs.push(setTimeout(function(){ fond.classList.remove("revelation-brouille"); }, 2700));
	minuteurs.push(setTimeout(function(){ fond.classList.add("revelation-fin"); }, 3300));
}

var completerSansFete = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = this.quests[id];
	completerSansFete.call(this, id);
	if (!deja && (id === "m_boss" || id === "c_rapport") && !Shell.sauvegardeBloquee && !this.has("rejeuEnCours")){
		setTimeout(function(){ ecranDeVictoire(id === "c_rapport" ? 2 : 1); }, 700);
	}
	if (!deja && id === "c_corbeau" && !Shell.sauvegardeBloquee) revelationDuCorbeau();
};

/* La barre d'état : vingt cases, une par point de la note sur 20. */
function remplirBarre(note){
	var barre = document.getElementById("etat-barre");
	if (!barre) return;
	if (barre.children.length !== 20){
		barre.textContent = "";
		for (var i = 0; i < 20; i++){ var c = document.createElement("span"); c.className = "case"; barre.appendChild(c); }
	}
	for (var k = 0; k < 20; k++){
		var cls = "case" + (k + 1 <= note ? " pleine" : (k + 0.5 <= note ? " demie" : ""));
		var c = barre.children[k];
		if (c.getAttribute("data-etat") !== cls){
			var allume = c.hasAttribute("data-etat") && cls !== "case";
			c.setAttribute("data-etat", cls);
			c.className = cls + (allume ? " allumee" : "");
		}
	}
	barre.setAttribute("aria-label", "Note : " + String(note).replace(".", ",") + " sur 20");
}

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
		remplirBarre(state.note(2));
		document.getElementById("etat-xp").textContent = state.xpNet(2) + " XP · " + state.noteTexte(2) + (state.malus2 ? " (indices -" + state.malus2 + ")" : "");
		document.getElementById("etat").title = "Note du chapitre 2. Tape xp pour le détail.";
		return;
	}
	niveau.textContent = "Niveau " + pr.niveau + " · " + pr.titre;
	remplirBarre(state.has("chapitre1Saute") ? 0 : state.note());
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
	term.onEvenement = banniere;
	term.onCompletion = Shell.completer;
	term.historique = Shell.historique.slice();
	term.positionHistorique = term.historique.length;

	// Remet le monde d'aplomb apres un rechargement, sans rejouer les annonces.
	verifierMonde();
	Shell.narration = [];

	montrerImage("./static/img/titlescreen_cybersup.gif", "");
	var sansIntro = false;
	try { sansIntro = window.sessionStorage.getItem("terminus-sans-intro") === "1"; window.sessionStorage.removeItem("terminus-sans-intro"); } catch (e){}
	if (!COMPTE_ACTIF){
		var connexion = function(){ demanderPrenom(); document.getElementById("saisie").focus(); };
		if (sansIntro) connexion(); else intro(connexion);
	} else if (PROFIL.aChoisir){
		// recommencer : même compte, partie neuve, on rechoisit son parcours.
		delete PROFIL.aChoisir;
		enregistrerProfil();
		state.save();
		term.echo(C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\nPartie neuve pour " + C.gras(PROFIL.prenom) + ". Ton compte et ton mot de passe n'ont pas changé.\n");
		demanderParcours();
	} else {
		accueillir();
	}
	// La radio du SOC reprend là où l'enquête en est.
	if (state.chapitreEnCours() === 2 && typeof texteRadio === "function" && state.has("crypteOuverte")) radioSOC(texteRadio());
	state.dernierInstant = Date.now();
	majEtat();
	document.getElementById("saisie").focus();
}

/*
 * L'écran de connexion : un identifiant (le prénom), puis un mot de passe.
 * Un identifiant inconnu crée un compte ; un identifiant connu demande son mot de passe.
 */
function demanderPrenom(){
	term.echo(C.vert(C.gras("TERMINUS")) + C.gris("  édition Cybersup") + "\n\n" +
		"Un terminal s'allume. Quelque part, un serveur attend un utilisateur.\n" +
		C.gris("Première fois ? Tape ton prénom : il deviendra ton identifiant, puis choisis un mot de passe.\n" +
		"Déjà venu ? Ton identifiant, puis ton mot de passe : tu retrouves ta partie.") + "\n");
	demanderLogin();
}

function demanderLogin(){
	term.demander("terminus login: ", false, function(reponse){
		var refus = prenomRefuse(reponse);
		if (refus){
			term.echo(C.jaune(refus));
			demanderLogin();
			return;
		}
		var id = identifiantDepuisPrenom(reponse);
		if (lireComptes()[id]) demanderMotDePasse(id, 1);
		else creerNouveauCompte(String(reponse).trim(), id);
	});
}

function demanderMotDePasse(id, essai){
	term.demander("Password: ", true, function(motDePasse){
		if (verifierMotDePasse(id, motDePasse)){
			term.echo("Bienvenue, " + lireComptes()[id].prenom + ". On recharge ta partie...");
			if (ouvrirSession(id)) window.location.reload();
			else term.echo(C.jaune("Impossible d'ouvrir la session (stockage indisponible)."));
			return;
		}
		term.echo("\nLogin incorrect" + (essai >= 3 ? "\n" + C.gris("(Mot de passe oublié ? Seul ton formateur peut effacer les comptes de cet ordinateur. Tu peux aussi créer un autre identifiant, par exemple ton prénom suivi d'une initiale.)") : ""));
		demanderLoginApres(essai);
	});
}
function demanderLoginApres(essai){
	term.demander("terminus login: ", false, function(reponse){
		var refus = prenomRefuse(reponse);
		if (refus){ term.echo(C.jaune(refus)); demanderLoginApres(essai); return; }
		var id = identifiantDepuisPrenom(reponse);
		if (lireComptes()[id]) demanderMotDePasse(id, essai + 1);
		else creerNouveauCompte(String(reponse).trim(), id);
	});
}

/*
 * Un identifiant inconnu : on crée l'utilisateur comme le ferait adduser sur une Debian,
 * messages compris. Le mot de passe ne s'affiche pas pendant la frappe, comme dans un vrai terminal.
 */
function creerNouveauCompte(login, id){
	var uid = 1000 + Object.keys(lireComptes()).length + 1;
	term.echo("\n" + C.gris("(Nouvel utilisateur : le jeu le crée comme le fait la commande adduser sous Linux.)") + "\n" +
		"Adding user `" + id + "' ...\n" +
		"Adding new group `" + id + "' (" + uid + ") ...\n" +
		"Adding new user `" + id + "' (" + uid + ") with group `" + id + "' ...\n" +
		"Creating home directory `/home/" + id + "' ...\n" +
		"Copying files from `/etc/skel' ...");
	demanderNouveauMotDePasse(login, id);
}

function demanderNouveauMotDePasse(login, id){
	term.demander("New password: ", true, function(premier){
		if (String(premier).length < 4){
			term.echo("BAD PASSWORD: The password is shorter than 4 characters");
			demanderNouveauMotDePasse(login, id);
			return;
		}
		term.demander("Retype new password: ", true, function(second){
			if (second !== premier){
				term.echo("Sorry, passwords do not match.\npasswd: Authentication token manipulation error\npasswd: password unchanged\n" +
					C.gris("(Les deux saisies doivent être identiques. On recommence.)"));
				demanderNouveauMotDePasse(login, id);
				return;
			}
			term.echo("passwd: password updated successfully\n" +
				"Changing the user information for " + id + "\n" +
				"Enter the new value, or press ENTER for the default");
			demanderInformations(login, id, premier);
		});
	});
}

/* Les informations du compte, comme le demande adduser : le nom complet (celui du diplôme) et l'adresse e-mail. */
function demanderInformations(login, id, motDePasse){
	term.demander("\u00a0\u00a0\u00a0\u00a0Full Name []: ", false, function(nom){
		nom = String(nom).trim().substring(0, 30);
		(function demanderEmail(){
			term.demander("\u00a0\u00a0\u00a0\u00a0Email []: ", false, function(email){
				email = String(email).trim().substring(0, 80);
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
					term.echo("adduser: invalid email address" + C.gris("  (exemple : prenom.nom@cybersup.fr)"));
					demanderEmail();
					return;
				}
				term.demander("Is the information correct? [Y/n] ", false, function(reponse){
					if (/^n/i.test(String(reponse).trim())){ demanderInformations(login, id, motDePasse); return; }
					nouvellePartie(login, motDePasse, nom, email);
				});
			});
		})();
	});
}

function nouvellePartie(prenom, motDePasse, nomComplet, email){
	var identifiant = adopterPrenom(prenom);
	if (nomComplet){
		// Le nom complet de adduser est celui qui figure sur le diplôme ; l'identifiant reste celui du login.
		PROFIL.prenom = nomComplet;
		state.nom = nomComplet;
		enregistrerProfil();
	}
	if (email){ PROFIL.email = email; enregistrerProfil(); }
	if (motDePasse !== undefined && creerCompte(prenom, motDePasse, nomComplet, email) === null){
		term.echo(C.jaune("Impossible d'enregistrer ton compte sur cet ordinateur : la partie se joue quand même, mais ne sera pas retenue."));
	}
	term.echo("\nBienvenue, " + C.gras(PROFIL.prenom) + ". Sur ce système, tu es " + C.vert(identifiant) +
		C.gris(" (c'est ce que répondra le sort whoami)") + ".\n");
	state.save();
	demanderParcours();
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
