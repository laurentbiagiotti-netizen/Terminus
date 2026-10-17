/**
 * HabitantsCampus.js : les quêtes annexes du chapitre 2 (la panne du réseau de l'école, numéro interne 3).
 *
 * Six habitants du campus attendent dans le hall du bâtiment B. Chacun confie une petite histoire, en plusieurs
 * étapes, avec des notions qu'aucun chapitre n'enseigne ailleurs (ni étape, ni défi, ni autre annexe) :
 *   a2_inventaire  la Gestionnaire du parc   lscpu, lspci, lsusb, dmidecode -t system (la fiche du Poste de l'accueil)
 *   a2_talkies     l'Appariteur              nc -l (écouter), nc MACHINE PORT (parler), un fichier passé par nc
 *   a2_carnet      la Documentaliste         ~/.ssh/config : Host, HostName, User, Port, IdentityFile
 *   a2_rebond      le Coursier               ssh -J (le rebond), ProxyJump dans ~/.ssh/config
 *   a2_tunnel      la Bibliothécaire         ssh -f -N -L 8080:intranet-lille:80, curl http://localhost:8080
 *   a2_notice      la Tutrice                apropos, man -k, whatis, les sections du manuel (man 5 passwd)
 * Toutes faites : le badge « Ami du campus ». Le mécanisme est celui de QuetesAnnexes.js ; les sorts, SortsAnnexes.js.
 * Le chapitre 2 est ouvert (panneOuverte) : les six habitants sont là dès l'arrivée au bâtiment B, départ direct compris.
 */

World.fige = false;

function axOuverteCh2(){
	return !!(typeof state !== "undefined" && state && state.has && state.has("panneOuverte") && !state.has("panneSautee") &&
		!(typeof examenEnCours === "function" && examenEnCours()));
}

/* ------------------------------------------------------------------ */
/* Les machines : le dépôt des cours, la loge, la passerelle de Lille, */
/* le labo de Lille et l'intranet de Lille                            */
/* ------------------------------------------------------------------ */

var AX_CLE_DEPOT = axDeclarerCle({ nom: "depot", phrase: "", commentaire: "cours@depot" });
var AxDepot = axMachine("depot-cours", "10.0.97.77", "Le dépôt des cours de l'école : les supports, les sujets, les corrigés des années passées.", "loc_cluster.gif",
	{ axPort: 2222, axComptes: { cours: { cle: "depot" } }, ports: { 2222: port("ssh", BANNIERE_SSH) } });
var AxDepotLisezmoi = axFichier(AxDepot, "LISEZMOI",
	"DÉPÔT DES COURS · compte cours\n\n" +
	"  /srv/cours/b1   les supports de première année\n  /srv/cours/b2   ceux de deuxième année\n\n" +
	"Le mot du jour, pour la Documentaliste : « marque-page ».\n" +
	"(Ce serveur n'écoute que sur le port 2222, et n'accepte que la clé du compte cours.)", { image: "item_manuscript.gif" });
var AxDepotSrv = axDossier(AxDepot, "srv", "Les données du dépôt.");
var AxDepotCours = axDossier(AxDepotSrv, "cours", "Les supports de cours.", { image: "loc_library.gif" });
axFichier(axDossier(AxDepotCours, "b1", "Première année."), "linux-01.txt", "Chapitre 1 : le terminal. ls, cd, pwd, cat.");
axFichier(axDossier(AxDepotCours, "b2", "Deuxième année."), "reseau-01.txt", "Chapitre 1 : le modèle OSI, de la couche physique à l'application.");

var AxLoge = axMachine("loge", "10.0.97.70", "Le poste de la loge, à l'entrée du campus : la Gardienne de nuit y fait ses rondes sur écran.", "loc_cluster.gif",
	{ axComptes: {}, ports: { 22: port("ssh", BANNIERE_SSH), 6666: port("talkie", "") } });

var AxPasserelleLille = axMachine("passerelle-lille", "10.0.59.10", "La passerelle du campus de Lille : la seule machine de Lille qu'on peut joindre depuis Puteaux.", "loc_cluster.gif");
axFichier(AxPasserelleLille, "LISEZMOI",
	"PASSERELLE DU CAMPUS DE LILLE\n\nLes machines internes de Lille (labo-lille, intranet-lille) ne sont joignables que d'ici.\n" +
	"Pour y aller sans t'arrêter ici : ssh -J passerelle-lille labo-lille.\nAucun fichier ne doit rester sur cette passerelle.", { image: "item_sign.gif" });
var AxLaboLille = axMachine("labo-lille", "10.0.59.40", "Le labo de TP du campus de Lille, à l'abri derrière sa passerelle.", "loc_labo.gif",
	{ axDepuis: ["passerelle-lille", "intranet-lille"] });
var AxColisLille = axFichier(axDossier(axDossier(AxLaboLille, "srv", "Les données du labo."), "colis", "Ce qui attend d'être remis."), "a-remettre.txt",
	"COLIS POUR LE COURSIER\n\nDeux cartes réseau de secours, une boîte de câbles, et un mot :\n« Le TP de jeudi est prêt. Le code de la salle est 59-14. » (le labo de Lille)", { image: "item_manuscript.gif" });
var AxIntranetLille = axMachine("intranet-lille", "10.0.59.80", "L'intranet du campus de Lille : la bibliothèque, les horaires, le catalogue.", "loc_cluster.gif",
	{ axDepuis: ["passerelle-lille", "labo-lille"], axComptes: {}, ports: { 22: port("ssh", BANNIERE_SSH), 80: port("http", "HTTP/1.1 400 Bad Request\nServer: nginx") },
	  axWeb: function(){ return AxIntranetLilleWww; } });
var AxIntranetLilleWww = axDossier(axDossier(axDossier(AxIntranetLille, "var", "Les données."), "www", "Le site."), "html", "Les pages de l'intranet.");
var AX_CATALOGUE_LILLE = "CATALOGUE DE LA BIBLIOTHÈQUE DE LILLE · nouveautés\n\n" +
	"  LIN-118  Le shell pas à pas\n  RES-042  Les réseaux, couche par couche\n  SEC-207  Défendre un serveur Linux\n  SEC-311  Réponse à incident : la méthode\n  ADM-090  Sauvegardes et restaurations\n\n" +
	"Les prêts entre campus partent le jeudi.";
axFichier(AxIntranetLilleWww, "index.html", "<!DOCTYPE html>\n<html lang=\"fr\"><head><title>Intranet de Lille</title></head>\n<body>\n<h1>Intranet du campus de Lille</h1>\n" +
	"<p>Bibliothèque : ouverte de 8 h à 19 h, le samedi de 9 h à 12 h.</p>\n<p>Le catalogue des nouveautés : <a href=\"/catalogue.txt\">/catalogue.txt</a></p>\n</body>\n</html>");
axFichier(AxIntranetLilleWww, "catalogue.txt", AX_CATALOGUE_LILLE);

/* ------------------------------------------------------------------ */
/* 1. L'inventaire du labo (la Gestionnaire du parc)                   */
/* ------------------------------------------------------------------ */

var AX_SERIE_POSTE = "CYB-B20-4471";
var AxGestionnaire = axHabitant(BatimentB, "Gestionnaire", function(){
	if (aFait("a2_inventaire")) return "La Gestionnaire du parc agrafe ta fiche au classeur. « Processeur, cartes, USB, numéro de série : le Poste de l'accueil est enfin inventorié. Un parc qu'on ne connaît pas, on ne le protège pas. »";
	return "Une femme en gilet fluo, un classeur sous le bras, compte les postes du bâtiment B.\n\n" +
		"« Je suis la Gestionnaire du parc informatique. Chaque machine de l'école a sa fiche : ce qu'elle a dans le ventre, et son numéro de série. " +
		"Celle du Poste de l'accueil (cd Poste) est vide depuis trois ans. Remplis-la pour moi, sans démonter la tour : Linux sait tout dire de son matériel.\n\n" +
		"Je veux son processeur (combien de cœurs ?), les cartes branchées dessus, dont la carte réseau, ce qui est branché en USB " +
		"(il paraît qu'un lecteur de badges y traîne), et surtout son numéro de série, celui que le constructeur a gravé dans le firmware. " +
		"Note ce numéro dans ~/inventaire.txt, dans ta Maison. »\n\n" +
		C.gris("Les outils, sur le Poste : lscpu ; lspci ; lsusb ; sudo dmidecode -t system (ou -s system-serial-number).");
}, ["lscpu", "lspci", "lsusb", "dmidecode"]);
declarerAnnexe({ id: "a2_inventaire", chapitre: 3, titre: "L'inventaire du labo", habitant: "la Gestionnaire du parc", lieu: "au bâtiment B", item: function(){ return AxGestionnaire; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, quelqu'un compte les postes, un classeur sous le bras.",
	resume: "La fiche matérielle du Poste de l'accueil : processeur (lscpu), cartes (lspci), USB (lsusb), numéro de série (dmidecode).",
	etapes: [
		{ titre: "Le processeur du Poste (lscpu, sur poste-b)", fait: function(){ return axVu("a2_inventaire", "lscpu"); } },
		{ titre: "Ses cartes, dont la carte réseau (lspci)", fait: function(){ return axVu("a2_inventaire", "lspci"); } },
		{ titre: "Ce qui est branché en USB (lsusb)", fait: function(){ return axVu("a2_inventaire", "lsusb"); } },
		{ titre: "Le numéro de série (sudo dmidecode), noté dans ~/inventaire.txt", fait: function(){ return axVu("a2_inventaire", "dmidecode") && (axTexteMaison("inventaire.txt") || "").indexOf(AX_SERIE_POSTE) > -1; } }
	],
	souvenir: { nom: "Etiquette-d-inventaire", texte: "Une étiquette d'inventaire argentée : « PARC CYBERSUP · B-20 · " + AX_SERIE_POSTE + " ». La Gestionnaire en a imprimé une de trop, pour toi." },
	lumiere: "le voyant du classeur de la Gestionnaire",
	merci: "La Gestionnaire colle une étiquette neuve sur la tour du Poste. « Fiche complète. Merci : la prochaine panne, on saura tout de suite à qui on a affaire. »"
});
GameEvents.addListener("axMateriel", function(e){
	if (e.hote !== "poste-b") return;
	if (e.cmd === "lscpu" && /CPU\(s\)/.test(e.sortie)) axNoter("a2_inventaire", "lscpu");
	if (e.cmd === "lspci" && /Ethernet controller/.test(e.sortie)) axNoter("a2_inventaire", "lspci");
	if (e.cmd === "lsusb" && /Badge Reader/.test(e.sortie)) axNoter("a2_inventaire", "lsusb");
	if (e.cmd === "dmidecode" && e.sortie.indexOf(AX_SERIE_POSTE) > -1) axNoter("a2_inventaire", "dmidecode");
});

/* ------------------------------------------------------------------ */
/* 2. Les talkies du campus (l'Appariteur)                             */
/* ------------------------------------------------------------------ */

var AX_CODE_LOGE = String(aleaEntier("a2-code-loge", 1000, 9999));
var AX_PLAN_LOGE = "PLAN DE LA LOGE · rondes de nuit\n\n  22 h   le parking et le bâtiment A\n  23 h   le bâtiment B et l'armoire réseau\n  0 h    l'Annexe, la cafétéria\n  2 h    le tour complet\n  5 h    les portes, avant l'ouverture";
var AxPlanningGardes = axFichier(BatimentB, "planning-gardes.txt",
	"PLANNING DES GARDES · semaine 42\n\nlundi     Gardienne de nuit\nmardi     Gardienne de nuit\nmercredi  remplaçant\njeudi     Gardienne de nuit\nvendredi  Gardienne de nuit\n\nClés de l'armoire réseau : à la loge, jamais ailleurs.",
	{ image: "item_manuscript.gif" });
var AxAppariteur = axHabitant(BatimentB, "Appariteur", function(){
	if (aFait("a2_talkies")) return "L'Appariteur range son talkie-walkie dans un tiroir. « Plus besoin de piles : avec nc, la loge et moi, on se parle d'une machine à l'autre. Un grand merci. »";
	return "Un homme en blouse grise secoue un talkie-walkie muet contre sa paume.\n\n" +
		"« L'Appariteur, c'est moi. Plus de piles dans les talkies, et la Gardienne de nuit est à la loge, à l'autre bout du campus. " +
		"Par chance, le poste de la loge (la machine loge) et le tien sont sur le même réseau. Avec nc, on peut se parler d'une machine à l'autre, comme au talkie.\n\n" +
		"La Gardienne t'appelle sur le port 5555 de ta machine : écoute-le, d'ici, du bâtiment B. Elle te donnera un code. " +
		"Elle, elle écoute sur le port 6666 de la loge : renvoie-lui le code, pour qu'elle sache que c'est bien toi. " +
		"Envoie-lui ensuite mon planning des gardes (planning-gardes.txt, ici même), tel quel. " +
		"Et quand elle te rappellera, garde ce qu'elle t'envoie dans un fichier : c'est le plan de ses rondes. »\n\n" +
		C.gris("Les outils : nc -l 5555 (écouter ; -v pour voir qui se connecte) ; echo \"...\" | nc loge 6666 (parler) ; nc loge 6666 < FICHIER ; nc -l 5555 > FICHIER.");
}, []);
declarerAnnexe({ id: "a2_talkies", chapitre: 3, titre: "Les talkies du campus", habitant: "l'Appariteur", lieu: "au bâtiment B", item: function(){ return AxAppariteur; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, un talkie-walkie ne répond plus.",
	resume: "Se parler d'une machine à l'autre avec nc : écouter un port (nc -l), répondre, passer un fichier dans les deux sens.",
	etapes: [
		{ titre: "Écouter l'appel de la loge (nc -l 5555)", fait: function(){ return axVu("a2_talkies", "ecoute"); } },
		{ titre: "Répondre avec le code de la Gardienne (nc loge 6666)", fait: function(){ return axVu("a2_talkies", "code"); } },
		{ titre: "Lui envoyer le planning des gardes, tel quel (nc loge 6666 < planning-gardes.txt)", fait: function(){ return axVu("a2_talkies", "planning"); } },
		{ titre: "Recevoir le plan des rondes dans un fichier (nc -l 5555 > FICHIER)", fait: function(){ return axVu("a2_talkies", "plan"); } }
	],
	souvenir: { nom: "Pile-de-talkie", texte: "Une pile de talkie-walkie, vide. L'Appariteur te l'a donnée en riant : « Garde-la, on n'en aura plus besoin. »" },
	lumiere: "la lampe de la loge, à l'entrée du campus",
	merci: "Au loin, la lampe de la loge clignote trois fois. L'Appariteur sourit : « Elle dit merci. »"
});
AX_INTERLOCUTEURS["loge"] = {
	parle: function(ici, port){
		if (String(port) !== "5555" || !axOuverteCh2() || !annexeProposee(annexeParId("a2_talkies"))) return null;
		if (!axVu("a2_talkies", "ecoute")){ axNoter("a2_talkies", "ecoute"); return "Ici la loge, la Gardienne de nuit. L'Appariteur t'a prévenu ? Pour que je sache que c'est bien toi, renvoie-moi ce code sur le port 6666 de la loge : " + AX_CODE_LOGE + "\n"; }
		if (axVu("a2_talkies", "planning")) return AX_PLAN_LOGE + "\n";
		if (!axVu("a2_talkies", "code")) return "Ici la loge. J'attends toujours le code, sur le port 6666 de la loge : " + AX_CODE_LOGE + "\n";
		return "Ici la loge. Rien à signaler. J'attends le planning des gardes, sur le port 6666.\n";
	},
	ecoute: {
		"6666": function(texte){
			if (!axOuverteCh2()) return "";
			if (texte.replace(/\n$/, "") === AxPlanningGardes.getText().replace(/\n$/, "")){
				if (axVu("a2_talkies", "code")){ axNoter("a2_talkies", "planning"); return ""; }
				return "";
			}
			if (texte.indexOf(AX_CODE_LOGE) > -1 && axVu("a2_talkies", "ecoute")) axNoter("a2_talkies", "code");
			return "";
		}
	}
};
GameEvents.addListener("write", function(e){
	if (!e.item || !axOuverteCh2() || !axVu("a2_talkies", "planning")) return;
	if (String(e.item.getText()).indexOf("PLAN DE LA LOGE") > -1 && String(e.text || "").indexOf("PLAN DE LA LOGE") > -1) axNoter("a2_talkies", "plan");
});

/* ------------------------------------------------------------------ */
/* 3. Le carnet d'adresses SSH (la Documentaliste)                     */
/* ------------------------------------------------------------------ */

function axCleDepotRangee(){
	var d = axDossierSsh(false);
	if (!d) return false;
	return d.items.some(function(it){ return it.getText() === AX_CLE_DEPOT.privee && it.mode === "rw-------"; });
}
function axFicheDepot(){
	var it = axLireFichierSsh("~/.ssh/config");
	if (!it) return false;
	var c = axConfigConnexion({ cible: "depot", drapeaux: {}, L: [], i: [], O: {}, p: null, l: null, F: null });
	if (c.erreurs.length || !c.viaConfig) return false;
	if (trouverHote(c.hostname) !== "depot-cours" || c.user !== "cours" || c.port !== "2222") return false;
	return c.identites.some(function(f){ var k = axLireFichierSsh(f); return k && k.getText() === AX_CLE_DEPOT.privee; });
}
var AxDocumentaliste = axHabitant(BatimentB, "Documentaliste", function(){
	if (aFait("a2_carnet")) return "La Documentaliste tapote ton carnet. « ssh depot, et c'est tout. Le jour où le port ou l'adresse changeront, tu n'auras qu'une ligne à corriger. »";
	return "Une femme aux lunettes relevées sur le front feuillette un carnet couvert de post-it.\n\n" +
		"« Je suis la Documentaliste. Les cours de l'école sont sur le dépôt : adresse 10.0.97.77, et pas sur le port 22, sur le port 2222. " +
		"On n'y entre qu'avec le compte cours, et seulement avec sa clé : je viens de la glisser dans ta Maison (~/depot_ed25519).\n\n" +
		"Tout le monde tape ssh -p 2222 -i ... cours@10.0.97.77, se trompe une fois sur deux, et vient me voir. " +
		"Range cette clé dans ~/.ssh, comme une clé privée doit l'être : lisible par toi seul. Puis écris la fiche du dépôt dans ~/.ssh/config, " +
		"le carnet d'adresses de ssh, sous le nom depot, que ssh depot suffise. Et rapporte-moi le mot du jour, écrit sur le dépôt. »\n\n" +
		C.gris("Les outils : mkdir -p ~/.ssh ; mv ; chmod 600 ; dans ~/.ssh/config, un bloc :  Host depot / HostName / User / Port / IdentityFile ; ssh depot. man 5 ssh_config pour le détail.");
}, []);
declarerAnnexe({ id: "a2_carnet", chapitre: 3, titre: "Le carnet d'adresses SSH", habitant: "la Documentaliste", lieu: "au bâtiment B", item: function(){ return AxDocumentaliste; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, un carnet déborde de post-it.",
	resume: "Une fiche par machine dans ~/.ssh/config (Host, HostName, User, Port, IdentityFile), puis ssh depot suffit.",
	etapes: [
		{ titre: "Ranger la clé du dépôt dans ~/.ssh, lisible par toi seul (chmod 600)", fait: function(){ return axCleDepotRangee(); } },
		{ titre: "Écrire la fiche du dépôt dans ~/.ssh/config (Host depot)", fait: function(){ return axFicheDepot(); } },
		{ titre: "Se connecter d'un mot : ssh depot", fait: function(){ return axVu("a2_carnet", "connecte"); } },
		{ titre: "Lire le mot du jour sur le dépôt (LISEZMOI)", fait: function(){ return axVu("a2_carnet", "lu"); } }
	],
	souvenir: { nom: "Post-it-du-depot", texte: "Un post-it jaune, de la main de la Documentaliste : « Host depot. Tout le reste, ssh s'en souvient. »" },
	lumiere: "la lampe de lecture du centre de documentation",
	merci: "La Documentaliste arrache un post-it de son carnet et le jette. « Un de moins. Merci ! »"
});
GameEvents.addListener("read", function(e){
	if (e.item === AxDocumentaliste && axOuverteCh2() && annexeProposee(annexeParId("a2_carnet")) && !axVu("a2_carnet", "clePosee")){
		axNoter("a2_carnet", "clePosee");
		if (Home.getItemFromName("depot_ed25519") === -1){
			var cle = new Item("depot_ed25519", AX_CLE_DEPOT.privee, "item_locker.gif").droits("rw-r--r--", JOUEUR);
			Home.addItem(cle);
		}
	}
	if (e.item === AxDepotLisezmoi && axVu("a2_carnet", "connecte")) axNoter("a2_carnet", "lu");
	if (e.item === AxColisLille && axVu("a2_rebond", "config")) axNoter("a2_rebond", "colis");
});
GameEvents.addListener("axSsh", function(e){
	if (e.hote === "depot-cours" && e.alias === "depot" && e.viaConfig && e.user === "cours" && e.session) axNoter("a2_carnet", "connecte");
	if (e.hote === "labo-lille" && e.rebond === "passerelle-lille" && e.rebondLigne) axNoter("a2_rebond", "rebond");
	if (e.hote === "labo-lille" && e.rebond && e.rebondConfig && e.alias === "labo-lille" && e.session) axNoter("a2_rebond", "config");
	if (e.tunnel && e.tunnel.some(function(t){ return trouverHote(t.cible) === "intranet-lille" && +t.portCible === 80 && !t.session; })) axNoter("a2_tunnel", "tunnel");
});

/* ------------------------------------------------------------------ */
/* 4. La passerelle de Lille (le Coursier)                             */
/* ------------------------------------------------------------------ */

var AxCoursier = axHabitant(BatimentB, "Coursier", function(){
	if (aFait("a2_rebond")) return "Le Coursier enfourche son vélo. « Un saut par la passerelle, et je suis au labo de Lille sans quitter Puteaux. Le colis partira jeudi. »";
	return "Un jeune homme en cuissard, un casque de vélo à la main, fait les cent pas.\n\n" +
		"« Le Coursier. Je fais la navette des colis entre les campus. Le labo de Lille (labo-lille) a un colis pour moi, et je dois savoir ce qu'il y a dedans avant jeudi. " +
		"Seulement, le labo n'est pas joignable d'ici : il ne répond qu'à la passerelle de Lille (passerelle-lille), la seule machine de Lille ouverte sur l'extérieur.\n\n" +
		"Se connecter à la passerelle, puis de là au labo, c'est deux sauts, et rien ne doit traîner sur la passerelle. " +
		"Ssh sait rebondir tout seul par une machine intermédiaire. Fais-le une fois en une commande, puis inscris le rebond dans ton ~/.ssh/config, " +
		"pour que ssh labo-lille passe par la passerelle sans qu'on le lui dise. Et lis-moi l'étiquette du colis, sur le labo (/srv/colis). »\n\n" +
		C.gris("Les outils : ssh labo-lille (pour voir) ; ssh -J passerelle-lille labo-lille ; dans ~/.ssh/config :  Host labo-lille / ProxyJump passerelle-lille ; exit.");
}, []);
declarerAnnexe({ id: "a2_rebond", chapitre: 3, titre: "La passerelle de Lille", habitant: "le Coursier", lieu: "au bâtiment B", item: function(){ return AxCoursier; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, un coursier fait les cent pas, casque à la main.",
	resume: "Atteindre une machine cachée derrière une passerelle : ssh -J, puis ProxyJump dans ~/.ssh/config.",
	etapes: [
		{ titre: "Rebondir par la passerelle jusqu'au labo, en une commande (ssh -J)", fait: function(){ return axVu("a2_rebond", "rebond"); } },
		{ titre: "Inscrire le rebond dans ~/.ssh/config (ProxyJump), puis ssh labo-lille", fait: function(){ return axVu("a2_rebond", "config"); } },
		{ titre: "Lire l'étiquette du colis, sur le labo (/srv/colis)", fait: function(){ return axVu("a2_rebond", "colis"); } }
	],
	souvenir: { nom: "Ticket-de-navette", texte: "Un ticket de la navette Puteaux-Lille, poinçonné deux fois : l'aller par la passerelle, le retour aussi." },
	lumiere: "le phare du vélo du Coursier",
	merci: "Le Coursier note « 59-14 » sur sa main. « Le code de la salle ! Je n'aurais jamais pensé à le demander. Merci. »"
});

/* ------------------------------------------------------------------ */
/* 5. Le tunnel vers l'intranet (la Bibliothécaire)                    */
/* ------------------------------------------------------------------ */

function axTunnelLilleOuvert(){
	return axTunnels().some(function(t){ return trouverHote(t.cible) === "intranet-lille" && !t.session && axTunnelVivant(t); });
}
function axCatalogueRapporte(){ return Home.items.some(function(it){ return !it.person && it.getText().replace(/\n$/, "") === AX_CATALOGUE_LILLE; }); }
var AxBibliothecaire = axHabitant(BatimentB, "Bibliothecaire", function(){
	if (aFait("a2_tunnel")) return "La Bibliothécaire range le catalogue de Lille dans son classeur. « Un tunnel ouvert le temps qu'il faut, puis refermé. C'est comme ça qu'on emprunte. »";
	return "Une dame aux cheveux gris, un tampon dateur à la main, soupire devant un écran qui affiche « délai dépassé ».\n\n" +
		"« Je suis la Bibliothécaire. Les prêts entre campus partent jeudi, et il me faut le catalogue des nouveautés de Lille. " +
		"Il est sur l'intranet de Lille (http://intranet-lille/), mais cet intranet ne répond qu'aux machines de Lille : d'ici, rien.\n\n" +
		"On m'a dit que ssh savait creuser un tunnel : un port d'ici, sur ta machine, qui mène à l'intranet de Lille en passant par la passerelle. " +
		"Ouvre-le en arrière-plan, sans session, lis la page d'accueil par le tunnel, et rapporte-moi le catalogue dans ta Maison. " +
		"Puis referme le tunnel : on ne laisse pas une porte ouverte derrière soi. »\n\n" +
		C.gris("Les outils : curl http://intranet-lille/ (pour voir) ; ssh -f -N -L 8080:intranet-lille:80 passerelle-lille ; curl http://localhost:8080/ ; curl -o ~/catalogue.txt ... ; ps, kill PID.");
}, []);
declarerAnnexe({ id: "a2_tunnel", chapitre: 3, titre: "Le tunnel vers l'intranet", habitant: "la Bibliothécaire", lieu: "au bâtiment B", item: function(){ return AxBibliothecaire; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, un écran affiche « délai dépassé ».",
	resume: "Un tunnel ssh (ssh -f -N -L) vers un site qu'on ne peut pas joindre directement, puis curl http://localhost:PORT.",
	etapes: [
		{ titre: "Ouvrir un tunnel vers l'intranet de Lille, en arrière-plan (ssh -f -N -L)", fait: function(){ return axVu("a2_tunnel", "tunnel"); } },
		{ titre: "Lire la page d'accueil par le tunnel (curl http://localhost:PORT/)", fait: function(){ return axVu("a2_tunnel", "accueil"); } },
		{ titre: "Rapporter le catalogue dans ta Maison (curl -o)", fait: function(){ return axCatalogueRapporte(); } },
		{ titre: "Refermer le tunnel (ps, kill)", fait: function(){ return !axTunnelLilleOuvert(); } }
	],
	souvenir: { nom: "Fiche-de-pret", texte: "Une fiche de prêt cartonnée, tamponnée « Lille, jeudi ». La Bibliothécaire t'a inscrit en premier." },
	lumiere: "les lampes vertes de la bibliothèque",
	merci: "La Bibliothécaire tamponne le catalogue d'un coup sec. « Jeudi, Lille aura sa liste. Et toi, une fiche de lecteur. »"
});
GameEvents.addListener("axCurl", function(e){
	if (e.tunnel && e.hote === "intranet-lille" && e.code === 200 && /^\/(index\.html)?$/.test(e.chemin)) axNoter("a2_tunnel", "accueil");
});

/* ------------------------------------------------------------------ */
/* 6. La notice perdue (la Tutrice)                                    */
/* ------------------------------------------------------------------ */

var AxTutrice = axHabitant(BatimentB, "Tutrice", function(){
	if (aFait("a2_notice")) return "La Tutrice referme son cahier. « Le septième champ, le shell. Et la prochaine fois, je chercherai moi-même : apropos, whatis, man 5. »";
	return "Une étudiante de troisième année, un cahier de tutorat ouvert sur les genoux, fronce les sourcils.\n\n" +
		"« Je suis la Tutrice des B1. Demain, je leur explique le fichier des comptes, /etc/passwd, et j'ai perdu ma notice. " +
		"Quand je tape man passwd, je tombe sur la commande qui change un mot de passe, pas sur le fichier ! " +
		"Il paraît que le manuel est rangé en sections, et qu'une même page peut exister dans plusieurs.\n\n" +
		"Aide-moi à retrouver la bonne : cherche-la par un mot, sans connaître son nom ; regarde dans quelles sections passwd existe ; lis celle du fichier. " +
		"Puis dis-moi, dans ~/notice.txt, quel champ (son numéro) donne le shell d'un compte. »\n\n" +
		C.gris("Les outils : apropos MOT (ou man -k MOT) ; whatis passwd (ou man -f passwd) ; man SECTION PAGE ; man 7 man, pour les sections.");
}, ["apropos", "whatis"]);
declarerAnnexe({ id: "a2_notice", chapitre: 3, titre: "La notice perdue", habitant: "la Tutrice", lieu: "au bâtiment B", item: function(){ return AxTutrice; }, ouverte: axOuverteCh2,
	indice: "au bâtiment B, une étudiante cherche une notice dans son cahier.",
	resume: "Chercher dans le manuel sans connaître le nom (apropos, man -k), ses sections (whatis), et man 5 passwd.",
	etapes: [
		{ titre: "Trouver la page du fichier des comptes par un mot (apropos ou man -k)", fait: function(){ return axVu("a2_notice", "apropos"); } },
		{ titre: "Voir dans quelles sections passwd existe (whatis)", fait: function(){ return axVu("a2_notice", "whatis"); } },
		{ titre: "Lire la page du fichier, dans la section 5 (man 5 passwd)", fait: function(){ return axVu("a2_notice", "man5"); } },
		{ titre: "Donner le numéro du champ du shell dans ~/notice.txt", fait: function(){ return /(^|[^0-9])7([^0-9]|$)|sept/i.test(axSansAccent(axTexteMaison("notice.txt") || "")); } }
	],
	souvenir: { nom: "Marque-page-du-manuel", texte: "Un marque-page découpé dans un vieux manuel : « 1 commandes, 5 fichiers, 7 notions, 8 administration ». La Tutrice en a fait un pour chacun de ses B1, et un pour toi." },
	lumiere: "la lampe du bureau de tutorat",
	merci: "La Tutrice recopie la page dans son cahier. « Sept champs, le shell en dernier. Demain, mes B1 sauront lire /etc/passwd. »"
});
GameEvents.addListener("axMan", function(e){
	var s = e.sortie || "";
	if (e.cmd === "apropos" && /passwd \(5\)/.test(s)) axNoter("a2_notice", "apropos");
	if (e.cmd === "whatis" && /passwd \(1\)/.test(s) && /passwd \(5\)/.test(s)) axNoter("a2_notice", "whatis");
	if (e.cmd === "man" && e.section === 5 && e.page === "passwd") axNoter("a2_notice", "man5");
});

/* Le badge « Ami du campus ». */
declarerAmiAnnexes(3, { badge: "ami_ch2", nom: "Ami du campus", phrase: "les six habitants du campus te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch2 = "Ami du campus";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch2 = "or";
axLumieresDansPlan("schema", 3);

World.fige = true;
