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
var VERSION_SAUVEGARDE = 1;

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
	  indice: "Ses démons sont des processus. À Cybersup (depuis la Maison), on apprend à les lister et à les arrêter. Ceux des autres demandent sudo, et les têtus demandent -9." },
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
	say(C.vert("✦ Nouveau sort appris : " + sort) + " (" + MANUEL[sort].resume + "). Détail : man " + sort);
	GameEvents.fire({ type: "learn", spell: sort });
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
	say(C.jaune("★ " + (principale ? "Quête accomplie" : "Quête secondaire accomplie") + " : " + quete.titre));
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
	lignes.push(C.gris("Sorts appris : " + this.knownSpells().length + " sur " + ORDRE_DES_SORTS.length + ". Sorts lancés : " + this.nbCommandes + "."));
	return lignes.join("\n");
};

GameState.prototype.texteDuDiplome = function(){
	var n = this.nbSecondaires();
	var total = QUETES_SECONDAIRES.length;
	var mention = "Passable (mais root quand même)";
	if (n >= total) mention = "Félicitations du jury";
	else if (n >= 10) mention = "Très bien";
	else if (n >= 7) mention = "Bien";
	else if (n >= 4) mention = "Assez bien";
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
		"  Sorts maîtrisés     : " + this.knownSpells().length + " sur " + ORDRE_DES_SORTS.length + "\n" +
		"  Quêtes secondaires  : " + n + " sur " + total + "\n" +
		"  Sorts lancés        : " + this.nbCommandes + "\n" +
		"  Mention             : " + mention + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          (et Sorcier Noir à ses heures)\n" +
		"=====================================================" +
		(this.nom ? "" : "\n(Pour faire figurer ton nom sur le diplôme, va signer le LivreDOr de la Taverne.)") +
		(n < total ? "\n(La mention s'améliore avec les quêtes secondaires : tape quetes.)" : "");
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
    		Artisan.addCmdText("less", "« Ha, déjà fini ? Tu apprends vite, on dirait. Eh bien, \
merci pour le coup de main. Un conseil d'artisane : quand tu voudras faire le ménage, \
“rm rouage*” efface tout ce qui commence par rouage. Mais pas ici, hein. J'en ai besoin. »");
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
    		say(C.vert("FIN") + "\n\nTu as terminé Terminus en " + this.nbCommandes + " sorts lancés, avec " +
    			this.knownSpells().length + " sorts appris sur " + ORDRE_DES_SORTS.length + " et " +
    			this.nbSecondaires() + " quêtes secondaires sur " + QUETES_SECONDAIRES.length + ".\n" +
    			"Le monde reste ouvert : le BureauDeLaurent, à Cybersup, t'attend, et « quetes » te dira ce qu'il te reste à découvrir.\n" +
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
			ici: current_room.path(),
			avant: Shell.lieu_precedent ? Shell.lieu_precedent.path() : null,
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
