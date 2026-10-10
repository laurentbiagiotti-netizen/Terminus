/**
 * Terminal.js : un petit terminal maison, sans dependance.
 *
 * Il remplace jquery.terminal de la version d'origine. La saisie passe par un
 * vrai champ <input>, ce qui regle les soucis de claviers AZERTY (|, ~, >, *)
 * et rend le jeu utilisable sur telephone.
 *
 * API :
 *   var term = new Terminal({ sortie, saisie, invite, formulaire });
 *   term.echo("texte avec couleurs ANSI");
 *   term.onCommande = function(ligne){ ... };
 *   term.onCompletion = function(texteAvantCurseur){ return {valeur, choix}; };
 *   term.demander("Mot de passe : ", true, function(reponse){ ... });
 */

var ANSI_CLASSES = {
	"1": "gras", "2": "pale", "3": "italique",
	"31": "rouge", "32": "vert", "33": "jaune", "34": "bleu",
	"35": "magenta", "36": "cyan", "90": "gris"
};

function echapperHTML(texte){
	return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Convertit les sequences ANSI (ESC[32m ...) en <span class="...">. */
function ansiVersHTML(texte){
	var morceaux = texte.split(/(\x1b\[[0-9;]*m)/);
	var html = "";
	var actives = [];
	for (var i = 0; i < morceaux.length; i++){
		var m = morceaux[i];
		var code = /^\x1b\[([0-9;]*)m$/.exec(m);
		if (!code){
			if (m === "") continue;
			if (actives.length){
				html += "<span class=\"" + actives.join(" ") + "\">" + echapperHTML(m) + "</span>";
			} else {
				html += echapperHTML(m);
			}
			continue;
		}
		var codes = code[1] === "" ? ["0"] : code[1].split(";");
		for (var j = 0; j < codes.length; j++){
			if (codes[j] === "0"){
				actives = [];
			} else if (ANSI_CLASSES[codes[j]] && actives.indexOf(ANSI_CLASSES[codes[j]]) === -1){
				actives.push(ANSI_CLASSES[codes[j]]);
			}
		}
	}
	return html;
}

function Terminal(elements){
	this.sortie = elements.sortie;
	this.saisie = elements.saisie;
	this.invite = elements.invite;
	this.formulaire = elements.formulaire;
	this.conteneur = elements.conteneur;
	this.historique = [];
	this.positionHistorique = 0;
	this.brouillon = "";
	this.question = null;       // { rappel, masque } quand on attend une reponse
	this.texteInvite = "$ ";
	this.onCommande = function(){};
	this.onCompletion = null;

	var self = this;
	this.formulaire.addEventListener("submit", function(e){
		e.preventDefault();
		self.valider();
	});
	this.saisie.addEventListener("keydown", function(e){ self.touche(e); });
	// Taper n'importe ou sur la page ecrit dans le terminal, meme sans avoir clique dedans.
	document.addEventListener("keydown", function(e){
		if (document.activeElement === self.saisie) return;
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		var cible = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
		if (cible === "input" || cible === "textarea" || cible === "select" || cible === "button") return;
		if (e.key.length === 1 || e.key === "Backspace" || e.key === "ArrowUp" || e.key === "Tab" || e.key === "Enter"){
			self.saisie.focus();
			if (e.key === "ArrowUp" || e.key === "Tab" || e.key === "Enter"){
				e.preventDefault();
				if (e.key === "Enter") self.valider(); else self.touche(e);
			}
		}
	});
	// La barre de touches pour téléphone : les caractères difficiles à trouver sur un clavier tactile.
	if (elements.touches){
		var boutons = elements.touches.querySelectorAll("button");
		for (var b = 0; b < boutons.length; b++){
			boutons[b].addEventListener("mousedown", function(e){ e.preventDefault(); });
			boutons[b].addEventListener("click", function(e){
				e.preventDefault();
				var bouton = e.currentTarget;
				if (bouton.getAttribute("data-touche")){
					self.saisie.focus();
					self.touche({ key: bouton.getAttribute("data-touche"), preventDefault: function(){} });
				} else {
					self.inserer(bouton.getAttribute("data-texte"));
				}
			});
		}
	}
	// Un clic n'importe ou dans le terminal redonne la main au champ de saisie,
	// sauf si le joueur est en train de selectionner du texte pour le copier.
	this.conteneur.addEventListener("mouseup", function(){
		var selection = window.getSelection ? String(window.getSelection()) : "";
		if (selection === "") self.saisie.focus();
	});
}

/* Insère du texte à la place du curseur, comme si on l'avait tapé. */
Terminal.prototype.inserer = function(texte){
	var champ = this.saisie;
	var debut = champ.selectionStart === null ? champ.value.length : champ.selectionStart;
	var fin = champ.selectionEnd === null ? debut : champ.selectionEnd;
	champ.value = champ.value.substring(0, debut) + texte + champ.value.substring(fin);
	champ.selectionStart = champ.selectionEnd = debut + texte.length;
	champ.focus();
};

/*
 * Un petit nano : un éditeur plein écran au-dessus du terminal.
 * enregistrer(texte) est appelé à chaque Ctrl+O (ou en quittant avec O).
 */
Terminal.prototype.editer = function(options, enregistrer){
	var self = this;
	var fond = document.createElement("div");
	fond.id = "editeur";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-label", "Éditeur nano");
	var entete = document.createElement("div");
	entete.className = "editeur-entete";
	entete.textContent = "GNU nano · " + options.titre;
	var zone = document.createElement("textarea");
	zone.value = options.texte;
	zone.spellcheck = false;
	zone.setAttribute("autocapitalize", "off");
	zone.setAttribute("autocorrect", "off");
	var message = document.createElement("div");
	message.className = "editeur-message";
	var pied = document.createElement("div");
	pied.className = "editeur-pied";
	function bouton(texte, action){
		var b = document.createElement("button");
		b.type = "button";
		b.textContent = texte;
		b.addEventListener("mousedown", function(e){ e.preventDefault(); });
		b.addEventListener("click", function(e){ e.preventDefault(); action(); });
		pied.appendChild(b);
		return b;
	}
	var modifie = false, confirmation = false;
	function dire(texte){ message.textContent = texte; }
	function enregistrerMaintenant(){
		if (options.lectureSeule){
			dire("[ Impossible d'écrire : lecture seule. Quitte avec Ctrl+X ]");
			enregistrer(zone.value);
			return;
		}
		enregistrer(zone.value);
		modifie = false;
		var n = zone.value.split("\n").length;
		dire("[ " + n + " ligne" + (n > 1 ? "s" : "") + " écrite" + (n > 1 ? "s" : "") + " ]");
	}
	function fermer(){
		document.body.removeChild(fond);
		self.saisie.focus();
	}
	function quitter(){
		if (!modifie || options.lectureSeule){ fermer(); return; }
		confirmation = true;
		dire("Enregistrer le tampon modifié ?   O : oui   N : non   Ctrl+C : annuler");
		boutonsConfirmation(true);
	}
	function couperLigne(){
		var texte = zone.value, position = zone.selectionStart;
		var debut = texte.lastIndexOf("\n", position - 1) + 1;
		var fin = texte.indexOf("\n", position);
		fin = fin === -1 ? texte.length : fin + 1;
		zone.value = texte.substring(0, debut) + texte.substring(fin);
		zone.selectionStart = zone.selectionEnd = Math.min(debut, zone.value.length);
		modifie = true;
		dire("[ Ligne coupée ]");
	}
	function repondre(oui){
		confirmation = false;
		boutonsConfirmation(false);
		if (oui) enregistrerMaintenant();
		fermer();
	}
	var boutonsNormaux = [
		bouton("^O Enregistrer", enregistrerMaintenant),
		bouton("^K Couper la ligne", couperLigne),
		bouton("^X Quitter", quitter)
	];
	var boutonsOuiNon = [
		bouton("O Oui", function(){ repondre(true); }),
		bouton("N Non", function(){ repondre(false); }),
		bouton("^C Annuler", function(){ confirmation = false; boutonsConfirmation(false); dire(""); zone.focus(); })
	];
	function boutonsConfirmation(actifs){
		boutonsNormaux.forEach(function(b){ b.hidden = actifs; });
		boutonsOuiNon.forEach(function(b){ b.hidden = !actifs; });
	}
	boutonsConfirmation(false);
	zone.addEventListener("input", function(){ modifie = true; });
	zone.addEventListener("keydown", function(e){
		var touche = e.key.toLowerCase();
		if (confirmation){
			e.preventDefault();
			if (touche === "o" || touche === "y") repondre(true);
			else if (touche === "n") repondre(false);
			else if ((e.ctrlKey && touche === "c") || touche === "escape"){ confirmation = false; boutonsConfirmation(false); dire(""); }
			return;
		}
		if (!e.ctrlKey) return;
		if (touche === "o" || touche === "s"){ e.preventDefault(); enregistrerMaintenant(); }
		else if (touche === "x"){ e.preventDefault(); quitter(); }
		else if (touche === "k"){ e.preventDefault(); couperLigne(); }
	});
	fond.appendChild(entete);
	fond.appendChild(zone);
	fond.appendChild(message);
	fond.appendChild(pied);
	document.body.appendChild(fond);
	dire(options.lectureSeule ? "[ Lecture seule : cet objet ne t'appartient pas ]" : "[ " + options.texte.split("\n").length + " lignes lues ]");
	zone.focus();
	zone.selectionStart = zone.selectionEnd = 0;
};

Terminal.prototype.definirInvite = function(texte){
	this.texteInvite = texte;
	if (!this.question) this.invite.innerHTML = ansiVersHTML(texte);
};

Terminal.prototype.echo = function(texte){
	if (texte === undefined || texte === null) return;
	var bloc = document.createElement("div");
	bloc.className = "bloc";
	bloc.innerHTML = ansiVersHTML(String(texte)) || "&nbsp;";
	this.sortie.appendChild(bloc);
	this.defiler();
};

Terminal.prototype.effacer = function(){
	this.sortie.innerHTML = "";
};

Terminal.prototype.defiler = function(){
	this.conteneur.scrollTop = this.conteneur.scrollHeight;
};

/* Pose une question au joueur ; la prochaine ligne validee part dans rappel. */
Terminal.prototype.demander = function(texte, masque, rappel){
	this.question = { rappel: rappel, masque: !!masque, texte: texte };
	this.invite.innerHTML = ansiVersHTML(texte);
	this.saisie.type = masque ? "password" : "text";
	this.saisie.value = "";
	this.saisie.focus();
};

Terminal.prototype.valider = function(){
	var ligne = this.saisie.value;
	this.saisie.value = "";
	if (this.question){
		var q = this.question;
		this.question = null;
		this.saisie.type = "text";
		this.echo(q.texte + (q.masque ? "" : ligne));
		this.invite.innerHTML = ansiVersHTML(this.texteInvite);
		q.rappel(ligne);
		this.defiler();
		return;
	}
	this.echo(this.texteInvite + ligne);
	if (ligne.trim() !== ""){
		if (this.historique[this.historique.length - 1] !== ligne) this.historique.push(ligne);
	}
	this.positionHistorique = this.historique.length;
	this.brouillon = "";
	this.onCommande(ligne);
	this.defiler();
};

Terminal.prototype.touche = function(e){
	if (this.question) return;
	if (e.key === "ArrowUp"){
		e.preventDefault();
		if (this.positionHistorique === this.historique.length) this.brouillon = this.saisie.value;
		if (this.positionHistorique > 0){
			this.positionHistorique--;
			this.saisie.value = this.historique[this.positionHistorique];
		}
	} else if (e.key === "ArrowDown"){
		e.preventDefault();
		if (this.positionHistorique < this.historique.length){
			this.positionHistorique++;
			this.saisie.value = this.positionHistorique === this.historique.length ?
				this.brouillon : this.historique[this.positionHistorique];
		}
	} else if (e.key === "Tab"){
		e.preventDefault();
		if (!this.onCompletion) return;
		var curseur = this.saisie.selectionStart;
		var avant = this.saisie.value.substring(0, curseur);
		var apres = this.saisie.value.substring(curseur);
		var resultat = this.onCompletion(avant);
		if (!resultat) return;
		if (resultat.valeur !== avant){
			this.saisie.value = resultat.valeur + apres;
			this.saisie.selectionStart = this.saisie.selectionEnd = resultat.valeur.length;
		} else if (resultat.choix && resultat.choix.length > 1){
			this.echo(this.texteInvite + this.saisie.value);
			this.echo(resultat.choix.join("   "));
		}
	} else if (e.key === "l" && e.ctrlKey){
		e.preventDefault();
		this.effacer();
	} else if (e.key === "c" && e.ctrlKey && this.saisie.selectionStart === this.saisie.selectionEnd){
		e.preventDefault();
		this.echo(this.texteInvite + this.saisie.value + "^C");
		this.saisie.value = "";
	}
};
