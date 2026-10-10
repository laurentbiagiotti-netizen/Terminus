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
		var editeur = document.getElementById("editeur");
		if (editeur){
			// Un éditeur est ouvert : les touches lui reviennent, jamais au terminal caché derrière.
			var champ = editeur.querySelector(".vim-capture, textarea");
			if (champ && e.target !== champ){
				e.preventDefault();
				champ.focus();
				if (champ.className === "vim-capture") champ.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, bubbles: false, cancelable: true }));
			}
			return;
		}
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && document.activeElement !== self.saisie){
			// Ctrl+D hors de la ligne : pas de « ajouter aux favoris », mais la même chose que dans la ligne.
			e.preventDefault();
			if (self.saisie.value === "" && !self.question){
				self.echo(self.texteInvite + "logout");
				self.onCommande("logout");
				self.defiler();
			}
			return;
		}
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
	if (options.mode === "vim") return this.editerVim(options, enregistrer);
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
		if (options.quitter) options.quitter({ commandes: {} });
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

/* Les annonces du jeu (quête, sort, succès, niveau, radio) ont leur propre allure. */
var GENRES_DE_BLOC = [
	[/^★/, "evt evt-quete", "quete"], [/^✦/, "evt evt-sort", "sort"], [/^◆/, "evt evt-succes", "succes"],
	[/^▲/, "evt evt-niveau", "niveau"], [/^\+\d+ XP/, "gain", null], [/^La radio grésille/, "evt evt-radio", null]
];

Terminal.prototype.echo = function(texte){
	if (texte === undefined || texte === null) return;
	var bloc = document.createElement("div");
	bloc.className = "bloc";
	var brut = String(texte).replace(/\x1b\[[0-9;]*m/g, "");
	for (var g = 0; g < GENRES_DE_BLOC.length; g++){
		if (!GENRES_DE_BLOC[g][0].test(brut)) continue;
		bloc.className += " " + GENRES_DE_BLOC[g][1];
		if (GENRES_DE_BLOC[g][2] && this.onEvenement) this.onEvenement(GENRES_DE_BLOC[g][2], brut);
		break;
	}
	bloc.innerHTML = ansiVersHTML(String(texte)) || "&nbsp;";
	this.sortie.appendChild(bloc);
	this.defiler();
};

/* Ajoute un élément déjà construit (des boutons, une image) dans la sortie du terminal. */
Terminal.prototype.ajouterElement = function(element){
	this.sortie.appendChild(element);
	this.defiler();
};

/* Répond à la question en cours comme si le joueur l'avait tapée (un clic sur un choix). */
Terminal.prototype.repondre = function(texte){
	if (!this.question) return;
	this.saisie.value = texte;
	this.valider();
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
	} else if (e.key === "d" && e.ctrlKey && this.saisie.value === "" && !this.question){
		// Ctrl+D sur une ligne vide : fin de session, comme dans un vrai terminal.
		e.preventDefault();
		this.echo(this.texteInvite + "logout");
		this.onCommande("logout");
		this.defiler();
	} else if (e.key === "c" && e.ctrlKey && this.saisie.selectionStart === this.saisie.selectionEnd){
		e.preventDefault();
		this.echo(this.texteInvite + this.saisie.value + "^C");
		this.saisie.value = "";
	}
};

/*
 * Un petit vim : modes normal, insertion, commande (:) et recherche (/).
 * enregistrer(texte, info) est appelé à chaque :w ; options.quitter(info) à la sortie.
 * info.commandes note les commandes utilisées (pour les leçons du labo).
 */
Terminal.prototype.editerVim = function(options, enregistrer){
	var self = this;
	var lignes = options.texte === "" ? [""] : options.texte.replace(/\n$/, "").split("\n");
	var l = 0, c = 0, mode = "normal", attente = "", nombre = "", ligneCommande = "";
	var registre = null, annulations = [], modifie = false, derniere = null, message = "";
	var commandes = {}, enregistre = false;

	var fond = document.createElement("div");
	fond.id = "editeur";
	fond.className = "vim";
	fond.setAttribute("role", "dialog");
	fond.setAttribute("aria-modal", "true");
	fond.setAttribute("aria-label", "Éditeur vim");
	var zone = document.createElement("div");
	zone.className = "vim-texte";
	var statut = document.createElement("div");
	statut.className = "vim-statut";
	var capture = document.createElement("textarea");
	capture.className = "vim-capture";
	capture.setAttribute("autocapitalize", "off");
	capture.setAttribute("autocorrect", "off");
	capture.setAttribute("aria-label", "Saisie de vim");
	capture.spellcheck = false;
	var pied = document.createElement("div");
	pied.className = "editeur-pied";
	[["Échap", function(){ touche("Escape"); }], ["i", function(){ touche("i"); }], ["x", function(){ touche("x"); }], ["dd", function(){ touche("d"); touche("d"); }],
		["u", function(){ touche("u"); }], [":w", function(){ commandeDirecte("w"); }], [":wq", function(){ commandeDirecte("wq"); }], [":q!", function(){ commandeDirecte("q!"); }]].forEach(function(b){
		var bouton = document.createElement("button");
		bouton.type = "button";
		bouton.textContent = b[0];
		bouton.addEventListener("mousedown", function(e){ e.preventDefault(); });
		bouton.addEventListener("click", function(e){ e.preventDefault(); b[1](); dessiner(); capture.focus(); });
		pied.appendChild(bouton);
	});

	function note(cmd){ commandes[cmd] = true; }
	function memoriser(){
		annulations.push({ lignes: lignes.slice(), l: l, c: c });
		if (annulations.length > 100) annulations.shift();
	}
	function borner(){
		if (l < 0) l = 0;
		if (l > lignes.length - 1) l = lignes.length - 1;
		var max = mode === "insertion" ? lignes[l].length : Math.max(0, lignes[l].length - 1);
		if (c > max) c = max;
		if (c < 0) c = 0;
	}
	function changer(){ modifie = true; }

	function dessiner(){
		borner();
		zone.innerHTML = "";
		var hauteur = Math.max(lignes.length, 20);
		for (var i = 0; i < hauteur; i++){
			var div = document.createElement("div");
			div.className = "vim-ligne";
			if (i >= lignes.length){
				div.textContent = "~";
				div.classList.add("vim-vide");
			} else if (i === l){
				var t = lignes[i];
				var avant = document.createTextNode(t.substring(0, c));
				var curseur = document.createElement("span");
				curseur.className = mode === "insertion" ? "vim-curseur vim-insertion" : "vim-curseur";
				curseur.textContent = t.charAt(c) || " ";
				var apres = document.createTextNode(t.substring(c + 1));
				div.appendChild(avant); div.appendChild(curseur); div.appendChild(apres);
			} else {
				div.textContent = lignes[i] === "" ? " " : lignes[i];
			}
			zone.appendChild(div);
		}
		var gauche = mode === "commande" ? ":" + ligneCommande : (mode === "recherche" ? "/" + ligneCommande :
			(message || (mode === "insertion" ? "-- INSERTION --" : "")));
		statut.textContent = "";
		var g = document.createElement("span"); g.textContent = gauche;
		var d = document.createElement("span"); d.className = "vim-position";
		d.textContent = (options.titre || "") + (modifie ? " [+]" : "") + (options.lectureSeule ? " [RO]" : "") + "   " + (l + 1) + "," + (c + 1);
		statut.appendChild(g); statut.appendChild(d);
		var courant = zone.children[l];
		if (courant && courant.scrollIntoView) courant.scrollIntoView({ block: "nearest" });
	}

	function fermer(){
		if (fond.parentNode) document.body.removeChild(fond);
		self.saisie.focus();
		if (options.quitter) options.quitter({ commandes: commandes, enregistre: enregistre });
	}
	function ecrire(){
		if (options.lectureSeule){ message = "E45: 'readonly' option is set (add ! to override)"; enregistrer(lignes.join("\n"), { commandes: commandes }); return false; }
		enregistrer(lignes.join("\n"), { commandes: commandes });
		modifie = false;
		enregistre = true;
		message = "\"" + (options.titre || "") + "\" " + lignes.length + "L écrites";
		return true;
	}
	function commandeDirecte(cmd){ ligneCommande = cmd; executerCommande(); }
	function executerCommande(){
		var cmd = ligneCommande.trim();
		mode = "normal";
		ligneCommande = "";
		message = "";
		var m;
		if (/^(w|wq|x)!$/.test(cmd)){
			if (options.lectureSeule){ message = "E212: Can't open file for writing" + (options.sudo ? "" : " (fichier d'un autre : il faut le rouvrir avec sudo vim)"); return; }
			cmd = cmd.replace("!", "");
		}
		if (cmd === "w"){ note(":w"); ecrire(); return; }
		if (cmd === "wq" || cmd === "x"){ note(":wq"); if (ecrire()) fermer(); return; }
		if (cmd === "q"){
			note(":q");
			if (modifie){ message = "E37: No write since last change (add ! to override)"; return; }
			fermer();
			return;
		}
		if (cmd === "q!"){ note(":q!"); if (modifie) note(":q!modifie"); fermer(); return; }
		if (/^\d+$/.test(cmd)){ l = parseInt(cmd, 10) - 1; c = 0; note(":N"); return; }
		if ((m = /^(%?)s\/((?:\\\/|[^\/])*)\/((?:\\\/|[^\/])*)\/?(g?)$/.exec(cmd))){
			var re;
			try { re = new RegExp(m[2], m[4] ? "g" : ""); } catch (e){ message = "E486: Pattern not found: " + m[2]; return; }
			memoriser();
			var trouve = false;
			var debut = m[1] ? 0 : l, fin = m[1] ? lignes.length - 1 : l;
			for (var i = debut; i <= fin; i++){
				if (re.test(lignes[i])){ trouve = true; re.lastIndex = 0; lignes[i] = lignes[i].replace(re, m[3]); }
				re.lastIndex = 0;
			}
			if (!trouve){ annulations.pop(); message = "E486: Pattern not found: " + m[2]; return; }
			note(m[1] ? ":%s" : ":s");
			changer();
			return;
		}
		message = "E492: Not an editor command: " + cmd;
	}
	function chercher(sens){
		if (!derniere) return;
		var re = new RegExp(derniere.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
		for (var k = 1; k <= lignes.length; k++){
			var i = ((l + sens * k) % lignes.length + lignes.length) % lignes.length;
			var position = lignes[i].search(re);
			if (position > -1){ l = i; c = position; return; }
		}
		if (re.test(lignes[l])){ c = lignes[l].search(re); return; }
		message = "E486: Pattern not found: " + derniere;
	}
	function motSuivant(){
		var t = lignes[l];
		var i = c;
		while (i < t.length && /\S/.test(t.charAt(i))) i++;
		while (i < t.length && /\s/.test(t.charAt(i))) i++;
		if (i >= t.length && l < lignes.length - 1){ l++; c = 0; return; }
		c = i;
	}
	function finDuMot(t, depuis){
		var i = depuis;
		while (i < t.length && /\S/.test(t.charAt(i))) i++;
		return i;
	}

	function normal(cle){
		message = "";
		if (attente === "r"){
			attente = "";
			if (cle.length !== 1 || lignes[l] === "") return;
			memoriser();
			lignes[l] = lignes[l].substring(0, c) + cle + lignes[l].substring(c + 1);
			note("r"); changer();
			return;
		}
		if (/^[1-9]$/.test(cle) || (cle === "0" && nombre !== "")){ nombre += cle; return; }
		var n = nombre === "" ? 1 : parseInt(nombre, 10);
		var avecNombre = nombre !== "";
		nombre = "";
		var seq = attente + cle;
		var i;
		switch (seq){
			case "h": case "ArrowLeft": c -= n; note("h"); return;
			case "l": case "ArrowRight": c += n; note("l"); return;
			case "j": case "ArrowDown": l += n; note("j"); return;
			case "k": case "ArrowUp": l -= n; note("k"); return;
			case "0": c = 0; note("0"); return;
			case "$": c = lignes[l].length; note("$"); return;
			case "^": c = lignes[l].search(/\S/); note("^"); return;
			case "w": for (i = 0; i < n; i++) motSuivant(); note("w"); return;
			case "b":
				for (i = 0; i < n; i++){
					if (c === 0 && l > 0){ l--; c = lignes[l].length; }
					var t = lignes[l], j = Math.max(0, c - 1);
					while (j > 0 && /\s/.test(t.charAt(j))) j--;
					while (j > 0 && /\S/.test(t.charAt(j - 1))) j--;
					c = j;
				}
				note("b");
				return;
			case "e": c = Math.max(0, finDuMot(lignes[l], c + 1) - 1); note("e"); return;
			case "G": l = avecNombre ? n - 1 : lignes.length - 1; c = 0; note("G"); return;
			case "g": attente = "g"; return;
			case "gg": attente = ""; l = avecNombre ? n - 1 : 0; c = 0; note("gg"); return;
			case "x":
				if (lignes[l] === "") return;
				memoriser();
				registre = { texte: lignes[l].substring(c, c + n), ligne: false };
				lignes[l] = lignes[l].substring(0, c) + lignes[l].substring(c + n);
				note("x"); changer(); return;
			case "d": case "c": case "y": attente = cle; nombre = avecNombre ? String(n) : ""; return;
			case "dd":
				attente = ""; memoriser();
				registre = { lignes: lignes.splice(l, n), ligne: true };
				if (lignes.length === 0) lignes = [""];
				note("dd"); changer(); return;
			case "yy":
				attente = ""; registre = { lignes: lignes.slice(l, l + n), ligne: true }; note("yy"); message = n + " ligne(s) copiée(s)"; return;
			case "dw": case "de": case "cw": case "ce":
				attente = ""; memoriser();
				var fin = c;
				for (i = 0; i < n; i++){
					fin = finDuMot(lignes[l], fin);
					if (seq === "dw") while (fin < lignes[l].length && /\s/.test(lignes[l].charAt(fin))) fin++;
					else if (i < n - 1) while (fin < lignes[l].length && /\s/.test(lignes[l].charAt(fin))) fin++;
				}
				registre = { texte: lignes[l].substring(c, fin), ligne: false };
				lignes[l] = lignes[l].substring(0, c) + lignes[l].substring(fin);
				note(seq); changer();
				if (seq.charAt(0) === "c") mode = "insertion";
				return;
			case "d$": case "D": case "c$": case "C":
				attente = ""; memoriser();
				registre = { texte: lignes[l].substring(c), ligne: false };
				lignes[l] = lignes[l].substring(0, c);
				note(seq === "D" || seq === "d$" ? "D" : "C"); changer();
				if (seq === "c$" || seq === "C") mode = "insertion";
				return;
			case "p": case "P":
				if (!registre) return;
				memoriser();
				if (registre.ligne){
					var position = cle === "p" ? l + 1 : l;
					Array.prototype.splice.apply(lignes, [position, 0].concat(registre.lignes));
					l = position; c = 0;
				} else {
					var o = cle === "p" && lignes[l] !== "" ? c + 1 : c;
					lignes[l] = lignes[l].substring(0, o) + registre.texte + lignes[l].substring(o);
					c = o + registre.texte.length - 1;
				}
				note("p"); changer(); return;
			case "r": attente = "r"; return;
			case "dG":
				attente = ""; memoriser();
				registre = { lignes: lignes.splice(l), ligne: true };
				if (lignes.length === 0) lignes = [""];
				l = Math.max(0, Math.min(l, lignes.length - 1)); c = 0;
				note("dG"); changer(); return;
			case "Z": attente = "Z"; return;
			case "ZZ": attente = ""; note(":wq"); if (!modifie){ fermer(); return; } if (ecrire()) fermer(); return;
			case "ZQ": attente = ""; commandeDirecte("q!"); return;
			case "u":
				if (!annulations.length){ message = "Already at oldest change"; return; }
				var etat = annulations.pop();
				lignes = etat.lignes; l = etat.l; c = etat.c;
				note("u"); modifie = true; return;
			case "i": mode = "insertion"; note("i"); memoriser(); return;
			case "a": mode = "insertion"; c = Math.min(c + 1, lignes[l].length); note("a"); memoriser(); return;
			case "A": mode = "insertion"; c = lignes[l].length; note("A"); memoriser(); return;
			case "I": mode = "insertion"; c = Math.max(0, lignes[l].search(/\S/)); note("I"); memoriser(); return;
			case "o": memoriser(); lignes.splice(l + 1, 0, ""); l++; c = 0; mode = "insertion"; note("o"); changer(); return;
			case "O": memoriser(); lignes.splice(l, 0, ""); c = 0; mode = "insertion"; note("O"); changer(); return;
			case ":": mode = "commande"; ligneCommande = ""; return;
			case "/": mode = "recherche"; ligneCommande = ""; note("/"); return;
			case "n": chercher(1); note("n"); return;
			case "N": chercher(-1); note("N"); return;
			case "Escape": attente = ""; return;
		}
		attente = "";
	}

	function insertion(cle){
		if (cle === "Escape"){ mode = "normal"; c = Math.max(0, c - 1); return; }
		if (cle === "Enter"){
			var reste = lignes[l].substring(c);
			lignes[l] = lignes[l].substring(0, c);
			lignes.splice(l + 1, 0, reste);
			l++; c = 0; changer(); return;
		}
		if (cle === "Backspace"){
			if (c > 0){ lignes[l] = lignes[l].substring(0, c - 1) + lignes[l].substring(c); c--; changer(); }
			else if (l > 0){ c = lignes[l - 1].length; lignes[l - 1] += lignes[l]; lignes.splice(l, 1); l--; changer(); }
			return;
		}
		if (cle === "ArrowLeft"){ c--; return; }
		if (cle === "ArrowRight"){ c++; return; }
		if (cle === "ArrowUp"){ l--; return; }
		if (cle === "ArrowDown"){ l++; return; }
		if (cle === "Tab") cle = "\t";
		if (cle.length !== 1 && cle !== "\t") return;
		lignes[l] = lignes[l].substring(0, c) + cle + lignes[l].substring(c);
		c++; changer();
	}

	function ligneDeCommande(cle){
		if (cle === "Escape"){ mode = "normal"; ligneCommande = ""; return; }
		if (cle === "Enter"){
			if (mode === "recherche"){ mode = "normal"; derniere = ligneCommande; ligneCommande = ""; chercher(1); return; }
			executerCommande();
			return;
		}
		if (cle === "Backspace"){
			if (ligneCommande === ""){ mode = "normal"; return; }
			ligneCommande = ligneCommande.slice(0, -1);
			return;
		}
		if (cle.length === 1) ligneCommande += cle;
	}

	function touche(cle){
		if (mode === "insertion") insertion(cle);
		else if (mode === "commande" || mode === "recherche") ligneDeCommande(cle);
		else normal(cle);
	}

	capture.addEventListener("keydown", function(e){
		if (e.key === "Unidentified" || e.key === "Process") return; // clavier de téléphone : on passe par l'événement input
		if (e.ctrlKey && e.key.toLowerCase() === "c"){ e.preventDefault(); touche("Escape"); dessiner(); return; }
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d"){ e.preventDefault(); return; }
		if (e.ctrlKey || e.metaKey) return;
		if (e.key.length === 1 || ["Escape", "Enter", "Backspace", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(e.key) > -1){
			e.preventDefault();
			touche(e.key);
			if (fond.parentNode) dessiner();
		}
	});
	capture.addEventListener("input", function(){
		var texte = capture.value;
		capture.value = "";
		for (var i = 0; i < texte.length; i++) touche(texte.charAt(i) === "\n" ? "Enter" : texte.charAt(i));
		if (fond.parentNode) dessiner();
	});
	// Un clic n'importe où dans l'éditeur (hors boutons) garde la saisie dans vim.
	fond.addEventListener("mousedown", function(e){
		if (e.target && e.target.tagName === "BUTTON") return;
		e.preventDefault();
		capture.focus();
	});

	fond.appendChild(zone);
	fond.appendChild(statut);
	fond.appendChild(capture);
	fond.appendChild(pied);
	document.body.appendChild(fond);
	message = "\"" + (options.titre || "") + "\" " + (options.nouveau ? "[Nouveau]" : lignes.length + "L") + (options.lectureSeule ? " [lecture seule]" : "") + "  (i écrire, Échap puis :wq)";
	dessiner();
	capture.focus();
};
