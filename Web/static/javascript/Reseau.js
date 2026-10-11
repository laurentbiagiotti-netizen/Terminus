/**
 * Reseau.js : le chapitre 2 s'étend au réseau de l'école.
 *
 * Après la Crypte, l'enquête remonte la piste du Corbeau de machine en machine, par ssh :
 * le labo de TP par où il est entré, le serveur web où il a laissé une porte dérobée, la
 * messagerie qui a reçu le mail piégé, le DNS qu'il a falsifié, le pare-feu qui le bloquera,
 * le serveur de sauvegarde où l'on met les preuves à l'abri. Chaque machine a sa vraie
 * arborescence Linux (/etc, /var/log, /tmp, /home...).
 *
 * Tout ce qui ressemble ici à un outil d'attaque est une coquille vide, décrite en mots :
 * le jeu apprend à repérer et à nettoyer, jamais à attaquer.
 */

/* ------------------------------------------------------------------ */
/* Les valeurs de la partie                                            */
/* ------------------------------------------------------------------ */

var IP_LABO = "10.0.92.60";
var HEURE_PREMIERE = "03:" + deuxChiffres(aleaEntier("heure-premiere", 10, 49));
var PHRASE_CORBEAU = aleaChoix("phrase-corbeau", ["plume", "corniche", "brindille", "girouette", "lucarne", "gouttiere"]) + "-noire-" + aleaEntier("phrase-num", 10, 99);
var COMPTE_CACHE = "maintenance";

function rot13(texte){
	return texte.replace(/[a-zA-Z]/g, function(c){
		var base = c <= "Z" ? 65 : 97;
		return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
	});
}

UTILISATEURS["corbeau"] = 1666;
UTILISATEURS[COMPTE_CACHE] = 0;
UTILISATEURS["www-data"] = 33;
UTILISATEURS["stagiaire"] = 1047;
UTILISATEURS["evi"] = 1002;

/* La porte dérobée cache, parmi ses octets, son adresse de rendez-vous et une phrase en ROT13. */
PorteDerobee.cmd_text["less"] = texteBinaire("binaire-porte-1", 90) + "\ncorbeau-rdv=" + ADRESSE_POSTE_CORBEAU + ":51234\n" +
	texteBinaire("binaire-porte-2", 60) + "\nnotes=/tmp/.cache/notes.gpg phrase_rot13=" + rot13(PHRASE_CORBEAU) + "\n" + texteBinaire("binaire-porte-3", 70);

/* ------------------------------------------------------------------ */
/* Fabriquer des machines                                              */
/* ------------------------------------------------------------------ */

var Machines = new Room(".machines", "Les machines du réseau de l'école.", "loc_cluster.gif");
Machines.owner = "root";
Machines.mode = "rwx------";
Machines.horsBareme = true;
Machines.removeCommand("cd");
Machines.addCmdText("cd", "Ce ne sont pas des lieux où l'on marche : ce sont des machines. On y entre par le réseau, avec ssh.");
link_rooms(SalleReseau, Machines);

function machine(nom, intro, image){
	var racine = lieuDuChapitre2(new Room(nom, intro, image || "loc_cluster.gif"));
	racine.racineHote = nom;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + nom);
	link_rooms(Machines, racine);
	return racine;
}

function dossier(parent, nom, intro, options){
	options = options || {};
	var lieu = lieuDuChapitre2(new Room(nom, intro || "Un dossier du système.", options.image || "loc_darkroom.gif"));
	lieu.owner = options.owner || "root";
	lieu.mode = options.mode || "rwxr-xr-x";
	link_rooms(parent, lieu);
	return lieu;
}

function fichier(lieu, nom, texte, options){
	options = options || {};
	var item = new Item(nom, texte, options.image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	["age", "heure", "format", "immuable", "gzip", "gpg"].forEach(function(k){ if (options[k] !== undefined) item[k] = options[k]; });
	if (options.enseigne) item.enseigne.apply(item, options.enseigne);
	if (options.revele) item.revele.apply(item, options.revele);
	lieu.addItem(item);
	return item;
}

function lignesDeJournal(liste){
	return liste.map(function(e){ return { heure: e[0], unite: e[1], message: e[2] }; });
}

/* L'état d'un service vit dans state.reseau (sauvegardé) ; sa description, ici. */
function service(hote, nom, description, options){
	options = options || {};
	var s = { description: description, execStart: options.execStart, restart: options.restart, fichier: options.fichier, procNom: options.procNom || nom, owner: options.owner || "root" };
	function etat(){
		var cle = hote + "/" + nom;
		if (!state.reseau.services[cle]) state.reseau.services[cle] = { actif: options.actif !== false, auto: options.auto !== false };
		return state.reseau.services[cle];
	}
	Object.defineProperty(s, "actif", { get: function(){ return etat().actif; }, set: function(v){ etat().actif = v; } });
	Object.defineProperty(s, "auto", { get: function(){ return etat().auto; }, set: function(v){ etat().auto = v; } });
	Object.defineProperty(s, "pid", { get: function(){
		var p = racineDe(HOTES[hote].arrivee()).procs.filter(function(x){ return x.service === nom; })[0];
		return p ? p.pid : null;
	} });
	return s;
}

function arreterService(hote, nom){
	var s = HOTES[hote].services[nom];
	s.actif = false;
	var racine = HOTES[hote].arrivee();
	racine.procs = racine.procs.filter(function(p){ return p.service !== nom; });
	GameEvents.fire({ type: "service", host: hote, service: nom, actif: false });
}

function demarrerService(hote, nom){
	var s = HOTES[hote].services[nom];
	s.actif = true;
	var racine = HOTES[hote].arrivee();
	if (!racine.procs.some(function(p){ return p.service === nom; })){
		racine.addProc(4000 + Math.floor(alea("service-" + nom + "-" + state.nbCommandes) * 4000), s.procNom, s.owner, { service: nom, cpu: 0.4 });
	}
	GameEvents.fire({ type: "service", host: hote, service: nom, actif: true });
}

/* Les ports de chaque machine, pour nmap et nc. */
function port(service, banniere){ return { service: service, banniere: banniere }; }
var BANNIERE_SSH = "SSH-2.0-OpenSSH_9.2p1";

/* L'accès par ssh aux machines du réseau : il faut d'abord les avoir découvertes. */
function refusReseau(nom, autre){
	return function(){
		if (!state.has("reseauCartographie")){
			return "ssh : Could not resolve hostname " + nom + ": Name or service not known\n" +
				C.gris("(Tu ne connais pas encore les machines du réseau de l'école. Le MementoReseau, dans la SalleReseau de Cybersup, explique comment les découvrir.)");
		}
		return autre ? autre() : null;
	};
}

/* ------------------------------------------------------------------ */
/* La Citadelle : ses dossiers système                                 */
/* ------------------------------------------------------------------ */

var CitadelleEtc = dossier(Citadelle, "etc", "Le dossier de la configuration du système. Les comptes, les groupes, les droits sudo.");
var CitadelleVar = dossier(Citadelle, "var", "Les données qui varient : journaux, files d'attente...");
var CitadelleLog = dossier(CitadelleVar, "log", "Les journaux de la Citadelle. Tout ce qui s'y passe laisse une trace ici.", { image: "loc_library.gif" });
var CitadelleTmp = dossier(Citadelle, "tmp", "Le dossier des fichiers temporaires. Tout le monde peut y écrire, ce qui en fait une cachette appréciée.", { mode: "rwxrwxrwt" });
var CacheCorbeau = dossier(CitadelleTmp, ".cache", "Une cachette au nom anodin.", { owner: "corbeau", mode: "rwxr-xr-x" });
[CitadelleEtc, CitadelleVar, CitadelleTmp].forEach(function(l){ Citadelle.removeChild ? Citadelle.removeChild(l) : null; });

var PasswdCitadelle = fichier(CitadelleEtc, "passwd",
	"root:x:0:0:root:/root:/bin/bash\n" +
	"daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
	"sorcier:x:666:666:Sorcier Noir:/home/sorcier:/bin/bash\n" +
	"laurent:x:1001:1001:Laurent:/home/laurent:/bin/bash\n" +
	"corbeau:x:1666:1666::/home/corbeau:/bin/bash\n" +
	COMPTE_CACHE + ":x:0:0:Maintenance:/root:/bin/bash\n" +
	"terminus:x:999:999::/home/terminus:/usr/sbin/nologin", { age: 0, heure: HEURE_PREMIERE });
var ShadowCitadelle = fichier(CitadelleEtc, "shadow",
	"root:$y$j9T$" + base64Aleatoire("sh-root", 20) + ":19950:0:99999:7:::\n" +
	"laurent:$y$j9T$" + base64Aleatoire("sh-laurent", 20) + ":19950:0:99999:7:::\n" +
	"corbeau:$y$j9T$" + base64Aleatoire("sh-corbeau", 20) + ":20371:0:99999:7:::\n" +
	COMPTE_CACHE + ":$y$j9T$" + base64Aleatoire("sh-cache", 20) + ":20371:0:99999:7:::", { mode: "rw-r-----" });
var GroupCitadelle = fichier(CitadelleEtc, "group",
	"root:x:0:\nsudo:x:27:laurent,corbeau\nadm:x:4:laurent\ncorbeau:x:1666:\nlaurent:x:1001:");
var SudoersCitadelle = fichier(CitadelleEtc, "sudoers",
	"# /etc/sudoers : à modifier UNIQUEMENT avec visudo.\n" +
	"Defaults env_reset\n" +
	"root ALL=(ALL:ALL) ALL\n" +
	"%sudo ALL=(ALL:ALL) ALL\n" +
	"corbeau ALL=(ALL) NOPASSWD: ALL", { mode: "r--r-----", age: 0, heure: HEURE_PREMIERE });
fichier(CitadelleEtc, "ProcedureComptes",
	"PROCÉDURE : NETTOYER LES COMPTES APRÈS UNE INTRUSION (fiche d'Evi)\n\n" +
	"1. Chercher les comptes qui ont l'UID 0 : ce sont tous des root.\n   awk -F: '$3 == 0 { print $1 }' /etc/passwd\n   Un seul doit sortir : root. Tout autre est un compte caché.\n" +
	"2. Le supprimer : sudo userdel NOM\n" +
	"3. Vérifier qui a le droit sudo : on peut l'avoir par le groupe sudo (groups NOM), ou par une ligne à son nom dans sudoers.\n" +
	"4. Le retirer du groupe sudo : sudo usermod -rG sudo NOM\n" +
	"5. Retirer sa ligne de sudoers : JAMAIS en éditant le fichier directement. sudo visudo, qui vérifie la syntaxe.\n   (visudo ouvre vim si tu le connais, nano sinon.) Ne touche pas aux lignes de root et du groupe sudo.\n\n" +
	"Rappel : /etc/passwd liste les comptes (nom:x:UID:GID:...), /etc/shadow leurs mots de passe chiffrés,\n/etc/group les groupes, /etc/sudoers qui peut devenir root.",
	{ enseigne: ["userdel", "usermod", "visudo", "groups", "awk"], image: "item_manuscript.gif" });

function journalAuth(lignes){ return lignes.join("\n") + "\n"; }
var AuthLog2 = fichier(CitadelleLog, "auth.log.2.gz", "", {
	gzip: { nom: "auth.log.2", contenu: journalAuth([
		HEURE_PREMIERE.replace(/:\d+$/, ":0" + aleaEntier("s1", 1, 9)) + " citadelle sshd[2210]: Failed password for root from " + IP_LABO + " port 50112 ssh2",
		HEURE_PREMIERE + " citadelle sshd[2214]: Accepted publickey for corbeau from " + IP_LABO + " port 50118 ssh2",
		HEURE_PREMIERE + " citadelle sudo: corbeau : TTY=pts/1 ; USER=root ; COMMAND=/usr/sbin/useradd -o -u 0 " + COMPTE_CACHE,
		HEURE_PREMIERE + " citadelle sudo: corbeau : TTY=pts/1 ; USER=root ; COMMAND=/usr/bin/chmod u+s /Crypte/Caveau/.porte"
	]) }, image: "item_manuscript.gif" });
AuthLog2.setText(brouiller(AuthLog2.gzip.contenu, "auth2"));
AuthLog2.modifie = false;
var AuthLog1 = fichier(CitadelleLog, "auth.log.1.gz", "", {
	gzip: { nom: "auth.log.1", contenu: journalAuth([
		"08:00 citadelle sshd[1001]: Accepted publickey for laurent from 10.0.92.1 port 41000 ssh2",
		"08:02 citadelle sudo: laurent : TTY=pts/0 ; USER=root ; COMMAND=/usr/bin/crontab -u sorcier -e",
		"08:15 citadelle sshd[1050]: Accepted publickey for sorcier from 10.0.92.1 port 41022 ssh2"
	]) }, image: "item_manuscript.gif" });
AuthLog1.setText(brouiller(AuthLog1.gzip.contenu, "auth1"));
AuthLog1.modifie = false;
fichier(CitadelleLog, "auth.log",
	"09:00 citadelle sshd[3001]: Accepted publickey for laurent from 10.0.92.1 port 42000 ssh2\n" +
	"09:30 citadelle sshd[3044]: Accepted publickey for " + JOUEUR + " from 10.0.92.1 port 42100 ssh2\n" +
	"(Les journaux plus anciens sont compressés : auth.log.1.gz, auth.log.2.gz.)", { image: "item_manuscript.gif" });
fichier(CitadelleLog, "CarnetDuVeilleur",
	"Le carnet du veilleur de nuit, écrit au crayon :\n\n« Chaque nuit, les journaux de la veille sont compressés pour gagner de la place : auth.log devient auth.log.1.gz, \n" +
	"puis auth.log.2.gz. Pas besoin de les décompresser pour les lire : zcat auth.log.2.gz | grep Accepted.\n" +
	"gzip compresse, gunzip décompresse.\n\nEt le journal du système entier, services compris : sudo journalctl. Par service : sudo journalctl -u sshd. »",
	{ enseigne: ["zcat", "gzip", "gunzip", "journalctl"], image: "item_manuscript.gif" });

var NotesCorbeau = fichier(CacheCorbeau, "notes.gpg", texteArmure("notes-corbeau"), {
	owner: "corbeau", mode: "rw-r--r--", age: 0, heure: HEURE_PREMIERE, image: "item_locker.gif",
	gpg: { phrase: PHRASE_CORBEAU, armure: texteArmure("notes-corbeau"), clair:
		"CARNET DU CORBEAU\n\n" +
		"- Entrée par le labo : la clé SSH d'un compte de TP traînait dans un dossier partagé.\n" +
		"- De là, la Citadelle. Un compte de secours, " + COMPTE_CACHE + ", avec l'UID 0. Au cas où.\n" +
		"- Une porte SUID dans le Caveau, un faux kworker sur le port " + PORT_CORBEAU + ".\n" +
		"- Une page déposée sur le site web, un faux enregistrement DNS, un service qui se relance tout seul sur le labo.\n" +
		"- Mon poste : " + ADRESSE_POSTE_CORBEAU + ".\n\n" +
		"Si quelqu'un lit ceci, c'est qu'il a tout suivi. Bravo. Rendez-vous dans le coffre de l'école. Je t'attendrai." } });

/* Le faux kworker garde ses notes ouvertes : lsof -p les montre. */
procCorbeau() && (procCorbeau().fichiers = [
	"/tmp/.cache/notes.gpg",
	"TCP *:" + PORT_CORBEAU + " (LISTEN)",
	"TCP citadelle:" + PORT_CORBEAU + "->" + ADRESSE_POSTE_CORBEAU + ":51234 (ESTABLISHED)"
]);
Racine.procs.forEach(function(p){ if (!p.corbeau) p.fichiers = ["[noyau]"]; });

var FicheReflexe = fichier(Racine, "FicheReflexe",
	"FICHE RÉFLEXE : ANALYSER UN PROCESSUS SUSPECT (de la part de Grace)\n\n" +
	"- pgrep NOM donne son PID ; sudo lsof -p PID montre TOUT ce qu'il a ouvert : fichiers, connexions.\n" +
	"- sudo lsof -i :PORT dit qui tient un port.\n" +
	"- Un programme compilé ne se lit pas avec cat : strings en sort le texte lisible.\n" +
	"- file dit ce qu'est vraiment un fichier, quel que soit son nom ; xxd montre ses octets, et les premiers trahissent le format.\n" +
	"- Un texte qui ressemble à du charabia de lettres ? Essaie le ROT13 : tr 'A-Za-z' 'N-ZA-Mn-za-m'\n" +
	"- Un fichier .gpg est chiffré pour de vrai : gpg -d FICHIER, avec la phrase de passe.\n" +
	"- pkill NOM arrête des processus par leur nom.",
	{ enseigne: ["pgrep", "lsof", "strings", "tr", "gpg", "pkill", "file", "xxd"], revele: ["s_c_xxd"], image: "item_manuscript.gif" });

var PHRASE_GRAFFITI = "Je reviens chaque nuit à trois heures, par la porte que personne ne regarde.";
var Graffiti = fichier(Caveau, "Graffiti", PHRASE_GRAFFITI.split("").reverse().join(""),
	{ enseigne: ["rev"], revele: ["s_c_rev"], image: "item_sign.gif" });
GameEvents.addListener("read", function(e){
	if (e.item === Graffiti && e.cmd !== "rev") say(C.gris("(Quelqu'un a écrit à l'envers. rev remet chaque ligne à l'endroit : rev Graffiti)"));
});

/* ------------------------------------------------------------------ */
/* Les machines du réseau                                              */
/* ------------------------------------------------------------------ */

/* --- web : le site vitrine de l'école --- */
var Web = machine("web", "Le serveur du site de l'école. Les pages que voient les futurs étudiants sortent d'ici.", "loc_web.gif");
var WebEtc = dossier(Web, "etc", "La configuration du serveur web.");
var WebVar = dossier(Web, "var", "Les données du serveur.");
var WebLog = dossier(WebVar, "log", "Les journaux du serveur web.", { image: "loc_library.gif" });
var WebWww = dossier(WebVar, "www", "La racine du site : ce qui est ici est publié sur le web.", { image: "loc_square.gif" });
var WebUploads = dossier(WebWww, "uploads", "Les fichiers envoyés par le formulaire de candidature.", { owner: "www-data", mode: "rwxr-xr-x" });
fichier(WebEtc, "hostname", "web");
fichier(WebEtc, "httpd.conf", "# Configuration du serveur web\nListen 80\nListen 443\nDocumentRoot /var/www\nUser www-data\n");
fichier(Web, "LISEZMOI",
	"Note de Vint, l'administrateur réseau, scotchée sur le serveur :\n\n" +
	"« Pour voir le site comme un visiteur : curl http://web/ (curl -I pour les en-têtes seulement).\n" +
	"Pour dater un fichier : stat FICHIER. Pour lister ce qui a bougé depuis hier : find /var/www -mtime -1.\n" +
	"Certains fichiers refusent d'être supprimés même par root : ils ont l'attribut immuable. lsattr le montre, sudo chattr -i le retire.\n" +
	"Et pour corriger un texte en vitesse : sed 's/ancien/nouveau/g'. »",
	{ enseigne: ["curl", "stat", "lsattr", "chattr", "sed"], image: "item_sign.gif" });
fichier(WebWww, "index.html", "<!DOCTYPE html>\n<html><head><title>Cybersup, école de cybersécurité</title></head>\n<body><h1>Bienvenue à Cybersup</h1>\n<p>Candidatures ouvertes. Envoyez vos documents par le formulaire.</p>\n</body></html>");
fichier(WebWww, "robots.txt", "User-agent: *\nDisallow: /brouillons/\n# Note aux robots : il n'y a rien de secret dans /brouillons, juste le menu de la cantine.\n# Note aux humains : robots.txt dit aux moteurs de recherche où ne pas aller. Ce n'est PAS une protection.");
fichier(WebUploads, "photo-promo.png", "‰PNG (une photo de la promo, tout le monde sourit)", { format: "png", age: 12, image: "item_grad.gif", owner: "www-data" });
fichier(WebUploads, "cv-candidat.pdf", "(un CV, envoyé par le formulaire de candidature)", { age: 5, owner: "www-data" });
var PagePiegee = fichier(WebUploads, "maj.php",
	"<?php\n// Page déposée par le Corbeau le " + dateDuJour() + " à " + HEURE_PREMIERE + ".\n// Elle lui aurait permis de lancer des commandes sur ce serveur depuis un navigateur.\n" +
	"// (Contenu neutralisé pour le jeu : ce fichier ne fait plus rien.)\n?>",
	{ owner: "www-data", age: 0, heure: HEURE_PREMIERE, immuable: true, image: "item_radspellbook.gif" });
PagePiegee.addValidCmd("sudo-rm");
fichier(WebLog, "access.log",
	"10.0.92.1 - - [" + dateDuJour() + " 02:58] \"GET / HTTP/1.1\" 200\n" +
	IP_LABO + " - - [" + dateDuJour() + " " + HEURE_PREMIERE + "] \"POST /uploads/ HTTP/1.1\" 201\n" +
	IP_LABO + " - - [" + dateDuJour() + " " + HEURE_PREMIERE + "] \"GET /uploads/maj.php HTTP/1.1\" 200\n" +
	"10.0.92.1 - - [" + dateDuJour() + " 09:15] \"GET /robots.txt HTTP/1.1\" 200\n", { image: "item_manuscript.gif" });

/* --- mail : la messagerie --- */
var Mail = machine("mail", "Le serveur de messagerie de l'école. Des milliers de messages par jour, et parfois un piège.", "loc_mail.gif");
var MailEtc = dossier(Mail, "etc", "La configuration de la messagerie.");
var MailVar = dossier(Mail, "var", "Les données de la messagerie.");
var MailLog = dossier(MailVar, "log", "Les journaux de la messagerie.", { image: "loc_library.gif" });
var MailSpool = dossier(MailVar, "spool", "La file des messages en attente d'analyse.", { image: "loc_backroom.gif" });
fichier(MailEtc, "hostname", "mail");
fichier(Mail, "AideMemoireMail",
	"AIDE-MÉMOIRE DE LA MESSAGERIE\n\n" +
	"- Une pièce jointe voyage encodée en base64 dans le message. Pour l'extraire : sed -n pour garder les bonnes lignes, puis base64 -d.\n" +
	"- file dit ce qu'est vraiment un fichier, quel que soit son nom. xxd montre ses premiers octets.\n" +
	"- awk découpe les journaux en colonnes : awk '{ print $3 }' mail.log\n" +
	"- nc MACHINE PORT ouvre une connexion brute et affiche la bannière du service : nc mail 25",
	{ enseigne: ["file", "xxd", "awk", "nc"], image: "item_sign.gif" });
var PIECE_JOINTE = "#!/bin/sh\n# charge du Corbeau (neutralisée pour le jeu)\n# Ouverte, elle aurait installé un accès sur le labo de TP.\necho \"Ceci était un piège. Ne lancez jamais une pièce jointe .sh\"\n";
fichier(MailSpool, "message-0042.eml",
	"From: Service informatique <support@cybersup-securite.com>\n" +
	"To: tp-labo@cybersup.lan\n" +
	"Subject: URGENT : votre mot de passe expire aujourd'hui\n" +
	"Date: " + dateDuJour() + " 02:41\n\n" +
	"Bonjour,\nVotre mot de passe expire dans 2 heures. Ouvrez la pièce jointe pour le renouveler.\nLe service informatique\n\n" +
	"--- pièce jointe : renouvellement.pdf.sh (base64) ---\n" + encoderBase64(PIECE_JOINTE).replace(/(.{64})/g, "$1\n").replace(/\n$/, "") + "\n--- fin de la pièce jointe ---\n",
	{ age: 0, heure: "02:41", image: "item_manuscript.gif" });
fichier(MailLog, "mail.log",
	"02:41 mail postfix: from=<support@cybersup-securite.com> to=<tp-labo@cybersup.lan> status=sent\n" +
	"08:10 mail postfix: from=<laurent@cybersup.lan> to=<b1@cybersup.lan> status=sent\n" +
	"08:12 mail postfix: from=<bde@cybersup.lan> to=<tous@cybersup.lan> status=sent\n" +
	"09:02 mail postfix: from=<grace@cybersup.lan> to=<soc@cybersup.lan> status=sent\n", { image: "item_manuscript.gif" });

/* --- dns --- */
var Dns = machine("dns", "Le serveur DNS de l'école : il traduit les noms en adresses. Le falsifier, c'est détourner tout le monde.", "loc_dns.gif");
var DnsEtc = dossier(Dns, "etc", "La configuration du DNS.");
var DnsBind = dossier(DnsEtc, "bind", "Les fichiers de zone : un nom, une adresse, une ligne.");
fichier(Dns, "NotesDNS",
	"NOTES SUR LE DNS\n\ndig NOM demande l'adresse d'un nom : dig web.cybersup.lan (ou dig +short web).\ndig -x ADRESSE fait l'inverse : le nom d'une adresse.\n" +
	"La zone de l'école est dans /etc/bind/ecole.zone. Une ligne inconnue dans ce fichier peut envoyer tout le monde chez quelqu'un d'autre.\n" +
	"On la retire avec un éditeur, en sudo : sudo vim /etc/bind/ecole.zone (ou nano).", { enseigne: ["dig"], image: "item_sign.gif" });
var ZoneEcole = fichier(DnsBind, "ecole.zone",
	"; zone cybersup.lan\n" +
	"cybersup  IN A 10.0.92.1\n" +
	"web       IN A 10.0.92.10\n" +
	"mail      IN A 10.0.92.11\n" +
	"imprimante IN A 10.0.92.30\n" +
	"badgeuse  IN A 10.0.92.31\n" +
	"dns       IN A 10.0.92.53\n" +
	"labo      IN A " + IP_LABO + "\n" +
	"poste-47  IN A " + ADRESSE_POSTE_CORBEAU + "\n" +
	"sauvegarde IN A 10.0.92.200\n" +
	"coffre    IN A 10.0.92.250\n" +
	"parefeu   IN A 10.0.92.254\n" +
	"maj       IN A " + ADRESSE_POSTE_CORBEAU + "\n", { age: 0, heure: HEURE_PREMIERE });
function fichierZoneDns(){ return ZoneEcole; }
var ZONE_LEGITIME = [["cybersup", "10.0.92.1"], ["web", "10.0.92.10"], ["mail", "10.0.92.11"], ["imprimante", "10.0.92.30"], ["badgeuse", "10.0.92.31"],
	["dns", "10.0.92.53"], ["labo", IP_LABO], ["poste-47", ADRESSE_POSTE_CORBEAU], ["sauvegarde", "10.0.92.200"], ["coffre", "10.0.92.250"], ["parefeu", "10.0.92.254"]];

/* --- labo : la salle de TP, par où le Corbeau est entré --- */
var Labo = machine("labo", "La machine du labo de TP. Les étudiants s'y connectent pour s'entraîner. Le Corbeau aussi, cette nuit.", "loc_labo.gif");
var LaboEtc = dossier(Labo, "etc", "La configuration du labo.");
var LaboVar = dossier(Labo, "var", "Les données du labo.");
var LaboLog = dossier(LaboVar, "log", "Les journaux du labo.", { image: "loc_library.gif" });
var LaboTmp = dossier(Labo, "tmp", "Le dossier temporaire du labo.", { mode: "rwxrwxrwt" });
var LaboHome = dossier(Labo, "home", "Les dossiers personnels des comptes du labo.");
var LaboEtudiant = dossier(LaboHome, "etudiant", "Ton dossier sur le labo.", { owner: JOUEUR, mode: "rwxr-xr-x" });
var VimTuteur = dossier(LaboEtudiant, "vimtuteur", "Les leçons de vim, à faire dans l'ordre.", { owner: JOUEUR, mode: "rwxr-xr-x", image: "loc_classroom.gif" });
fichier(LaboEtc, "hostname", "labo");
var PasswdLabo = fichier(LaboEtc, "passwd", "root:x:0:0:root:/root:/bin/bash\netudiant:x:1000:1000::/home/etudiant:/bin/bash\ncorbeau:x:1666:1666::/home/corbeau:/bin/bash\nstagiaire:x:1047:1047::/home/stagiaire:/bin/bash");
var ShadowLabo = fichier(LaboEtc, "shadow", "root:$y$j9T$" + base64Aleatoire("lr", 20) + ":19950:::::\netudiant:$y$j9T$" + base64Aleatoire("le", 20) + ":19950:::::\ncorbeau:$y$j9T$" + base64Aleatoire("lc", 20) + ":20371:::::\nstagiaire:$y$j9T$" + base64Aleatoire("ls", 20) + ":20100:::::", { mode: "rw-r-----" });
var GroupLabo = fichier(LaboEtc, "group", "root:x:0:\nsudo:x:27:\ntp:x:500:etudiant,stagiaire,corbeau\ncorbeau:x:1666:");
fichier(Labo, "TableauDuLabo",
	"Au tableau blanc du labo, une liste de commandes, entourée en rouge :\n\n" +
	"who            qui est connecté en ce moment, et d'où\nlast           qui s'est connecté avant\n" +
	"pgrep / pkill  trouver et arrêter des processus par leur nom (sudo pkill -u NOM : tous ceux d'un utilisateur)\n" +
	"systemctl      les services : status, stop, disable --now\n" +
	"usermod -L     verrouiller un compte\ngroups NOM     les groupes d'un compte\n" +
	"ssh-copy-id    installer sa clé publique sur une machine\n\nEt en bas, d'une autre écriture : « Les leçons de vim sont dans /home/etudiant/vimtuteur. »",
	{ enseigne: ["who", "last", "systemctl", "pgrep", "pkill", "usermod", "groups", "ssh-copy-id"], image: "item_sign.gif" });
fichier(LaboLog, "syslog",
	HEURE_PREMIERE + " labo systemd[1]: Created unit maj-auto.service (Mise à jour automatique)\n" +
	HEURE_PREMIERE + " labo systemd[1]: Started maj-auto.service.\n", { image: "item_manuscript.gif", age: 0, heure: HEURE_PREMIERE });
fichier(LaboTmp, "vacances.jpg", "", {
	gzip: { nom: "vacances.jpg", contenu: "Ce n'est pas une photo de vacances.\nListe des machines à visiter, dans l'ordre :\n1. labo (fait)\n2. citadelle\n3. web\n4. dns\n5. coffre\n-- le Corbeau\n" },
	owner: "corbeau", age: 0, heure: HEURE_PREMIERE, image: "item_trinket.gif", revele: ["s_c_photo"] });
(function(){ var v = LaboTmp.getItemFromName("vacances.jpg"); v.setText(brouiller(v.gzip.contenu, "vacances")); v.modifie = false; })();

/* Les leçons de vim, inspirées du tutoriel qui accompagne vim depuis toujours. */
var LECONS_VIM = {
	"lecon1.txt": "LEÇON 1 : se déplacer et supprimer un caractère\n\n" +
		"Déplace le curseur avec h (gauche), j (bas), k (haut), l (droite). Les flèches marchent aussi.\n" +
		"Place-toi sur chaque lettre en trop et tape x pour la supprimer. Puis :wq pour enregistrer et quitter.\n\n" +
		"---> La vvache saauta paar-dessus la luune.\n",
	"lecon2.txt": "LEÇON 2 : écrire du texte\n\n" +
		"i passe en mode INSERTION avant le curseur ; tout ce que tu tapes s'écrit. Échap revient au mode normal.\n" +
		"A ajoute à la fin de la ligne, où que soit le curseur.\n\n" +
		"---> Il manque des dans cette ligne.\n" +
		"---> Cette ligne s'arrête au milieu\n\n" +
		"La première doit devenir : Il manque des mots dans cette ligne.\n" +
		"La deuxième doit se terminer par : de nulle part.\n",
	"lecon3.txt": "LEÇON 3 : supprimer des mots et des lignes, annuler\n\n" +
		"dw supprime un mot (place-toi au début du mot). dd supprime la ligne entière. u annule la dernière action.\n\n" +
		"---> Le le pare-feu protège protège le réseau.\n" +
		"---> Cette ligne ne sert à rien : supprime-la avec dd.\n\n" +
		"La première doit devenir : Le pare-feu protège le réseau.\n" +
		"Essaie aussi u pour annuler une suppression, puis refais-la.\n",
	"lecon4.txt": "LEÇON 4 : couper, coller, remplacer, changer\n\n" +
		"dd coupe une ligne, p la colle sous le curseur. r suivi d'une lettre remplace le caractère sous le curseur.\n" +
		"cw change un mot : il le supprime et passe en insertion.\n\n" +
		"---> 2) deuxième\n" +
		"---> 1) première\n" +
		"---> 3) troisième\n\n" +
		"---> Le Corbeau a lancé une attoque.\n" +
		"---> Le pare-feu est ouvert.\n\n" +
		"Remets les lignes 1), 2), 3) dans l'ordre. Corrige attoque avec r. Remplace ouvert par fermé avec cw.\n",
	"lecon5.txt": (function(){
		var t = "LEÇON 5 : chercher, remplacer partout, aller au bout\n\n" +
			"/mot cherche mot ; n va au suivant, N au précédent.\n:%s/ancien/nouveau/g remplace partout dans le fichier.\n" +
			"G va à la dernière ligne, gg à la première.\n\n1. Remplace chaque erreur par succès, en une seule commande.\n" +
			"2. Va à la toute dernière ligne avec G : elle finit par un point d'interrogation. Remplace-le par un point (place-toi dessus avec $, puis r.).\n\n";
		var lignes = ["Analyse du journal : erreur de connexion à 03:12.", "Le service répond.", "Le disque est plein à 40 %.",
			"Sauvegarde : erreur de copie.", "Le pare-feu filtre les paquets.", "Le DNS répond en 2 ms.",
			"Mise à jour : erreur de signature.", "Les badges fonctionnent.", "L'imprimante a encore du papier.",
			"Messagerie : erreur de livraison.", "Le site web répond.", "Tout le reste va bien."];
		for (var i = 0; i < 2; i++) t += lignes.join("\n") + "\n";
		return t + "---> FIN ?\n";
	})()
};
Object.keys(LECONS_VIM).forEach(function(nom){
	fichier(VimTuteur, nom, LECONS_VIM[nom], { owner: JOUEUR, mode: "rw-r--r--", image: "item_manuscript.gif" });
});
fichier(VimTuteur, "TuteurVim",
	"LE TUTEUR VIM\n\n" +
	"vim est l'éditeur qu'on trouve sur TOUS les serveurs, même les plus dépouillés. Il paraît étrange au début parce qu'il a des MODES :\n" +
	"- le mode NORMAL, où chaque touche est une commande (au démarrage) ;\n- le mode INSERTION, où l'on écrit (i pour y entrer, Échap pour en sortir) ;\n" +
	"- la ligne de commande, qui commence par : (:w enregistre, :q quitte, :wq les deux, :q! quitte sans enregistrer).\n\n" +
	"Les cinq leçons de ce dossier se font dans l'ordre : vim lecon1.txt, et ainsi de suite. Chacune dit quoi faire.\n" +
	"Si tu es perdu : Échap, puis :q! pour sortir sans rien casser. Tout le monde est passé par là.\n" +
		"Une leçon abîmée ? rm leconN.txt : le tuteur en remet une copie neuve.\n\n" +
	"(Les boutons en bas de l'éditeur aident sur téléphone : Échap, i, x, dd, u, :w, :wq, :q!.)",
	{ enseigne: ["vim"], revele: ["s_v_quitter", "s_v_x", "s_v_i", "s_v_A", "s_v_dw", "s_v_dd", "s_v_u", "s_v_p", "s_v_r", "s_v_cw", "s_v_recherche", "s_v_substitution", "s_v_G", "s_v_quitter_force"], image: "item_professor.gif" });

/* --- parefeu --- */
var Parefeu = machine("parefeu", "Le pare-feu de l'école : tout ce qui entre et sort du réseau passe par lui.", "loc_parefeu.gif");
var ParefeuEtc = dossier(Parefeu, "etc", "La configuration du pare-feu.");
var ParefeuVar = dossier(Parefeu, "var", "Les données du pare-feu.");
var ParefeuLog = dossier(ParefeuVar, "log", "Les journaux du pare-feu.", { image: "loc_library.gif" });
fichier(ParefeuEtc, "hostname", "parefeu");
fichier(Parefeu, "ConsignesParefeu",
	"CONSIGNES DU PARE-FEU\n\nsudo ufw status numbered      les règles, numérotées\nsudo ufw deny from ADRESSE    bloquer une machine\n" +
	"sudo ufw enable               activer le pare-feu (sans ça, les règles ne servent à rien)\nsudo ufw delete N             retirer la règle N\n\n" +
	"traceroute MACHINE montre que tout passe par ici.", { enseigne: ["ufw", "traceroute"], image: "item_sign.gif" });
var ParefeuUfwLog = fichier(ParefeuLog, "ufw.log", "(vide : le pare-feu est désactivé depuis une mise à jour, la semaine dernière. Oups.)", { image: "item_manuscript.gif" });

/* --- sauvegarde --- */
var Sauvegarde = machine("sauvegarde", "Le serveur de sauvegarde : il garde des copies de tout, et maintenant les preuves de l'enquête.", "loc_sauvegarde.gif");
var SauvegardePreuves = dossier(Sauvegarde, "preuves", "Le dossier des preuves de l'incident. Ce qui entre ici ne doit plus jamais être modifié.", { mode: "rwxrwxrwt", image: "loc_backroom.gif" });
var SauvegardeArchives = dossier(Sauvegarde, "archives", "Les sauvegardes de la nuit.");
fichier(SauvegardeArchives, "nuit.tar.gz", "", { gzip: { nom: "nuit.tar", contenu: "(la sauvegarde complète de la nuit dernière)" }, age: 1 });
var RegistrePreuves = fichier(SauvegardePreuves, "registre.txt", "REGISTRE DES PREUVES (empreinte SHA-256, puis nom du fichier)\n", { mode: "rw-rw-rw-" });

/* --- imprimante et badgeuse --- */
var Imprimante = machine("imprimante", "L'imprimante du couloir. Elle aussi a une adresse sur le réseau, et une mémoire.", "loc_imprimante.gif");
var ImprimanteSpool = dossier(Imprimante, "spool", "Les documents en attente d'impression.");
fichier(ImprimanteSpool, "job-017.txt",
	"Document oublié dans la file d'impression, envoyé à 02:55 depuis " + ADRESSE_POSTE_CORBEAU + " :\n\n" +
	"« Liste de choses à rendre avant de partir : la clé USB du labo, le badge B-047, et les excuses que je dois à Laurent. »",
	{ age: 0, heure: "02:55", revele: ["s_c_imprimante"], image: "item_manuscript.gif" });
var Badgeuse = machine("badgeuse", "La badgeuse de l'entrée. Elle note qui entre, à quelle heure, et par quelle porte.", "loc_badgeuse.gif");
var BadgeuseJournaux = dossier(Badgeuse, "journaux", "Les journaux des badges.");
fichier(BadgeuseJournaux, "badges.log", (function(){
	var t = "";
	var badges = ["B-112", "B-087", "B-131", "B-047", "B-099"];
	["07:52", "08:03", "08:10", "08:31", "08:47", "09:05"].forEach(function(h, i){ t += dateDuJour() + " " + h + " " + badges[i % badges.length] + " entree\n"; });
	["01:58", "02:30", "03:47"].forEach(function(h){ t += dateDuJour() + " " + h + " B-047 entree\n"; });
	return t;
})(), { revele: ["s_c_badgeuse"], image: "item_manuscript.gif" });

fichier(Badgeuse, "NoteDuGardien",
	"Le gardien de nuit a scotché une note sur le boîtier :\n\n" +
	"« Chaque ligne de journaux/badges.log donne la date, l'heure, le numéro du badge et le sens.\n" +
	"Pour ne garder que les passages d'un badge : awk '$3 == \"B-112\"' badges.log\n" +
	"Pour la nuit seulement, on ajoute une condition : && $2 < \"06:00\"\n" +
	"La nuit, personne n'est censé entrer. Si un badge passe quand même, je veux le savoir. »",
	{ revele: ["s_c_badgeuse"], image: "item_sign.gif" });

/* --- le poste d'où venaient les connexions --- */
var Poste = machine("poste-47", "Un poste de travail ordinaire. Un sweat du BDE est posé sur le dossier de la chaise.", "loc_poste.gif");
var PosteHome = dossier(Poste, "home", "Les dossiers personnels.");
var PosteStagiaire = dossier(PosteHome, "stagiaire", "Le dossier de la stagiaire.", { owner: "stagiaire" });
var PosteTmp = dossier(Poste, "tmp", "Le dossier temporaire.", { mode: "rwxrwxrwt" });
fichier(PosteStagiaire, "a-faire.txt", "- Rendre la clé USB.\n- Écrire à Laurent.\n- Apprendre la divulgation responsable (c'est fait, maintenant).", { owner: "stagiaire", image: "item_manuscript.gif" });
fichier(PosteTmp, "rapport-pour-laurent.txt", "Brouillon : « Votre Citadelle avait au moins cinq trous. Je les ai tous trouvés. Pardon de les avoir utilisés. » ", { owner: "stagiaire" });

/* ------------------------------------------------------------------ */
/* La description des machines (pour ssh, nmap, nc, journalctl...)     */
/* ------------------------------------------------------------------ */

function decrireHote(nom, infos){
	HOTES[nom] = HOTES[nom] || {};
	for (var k in infos){ if (infos.hasOwnProperty(k)) HOTES[nom][k] = infos[k]; }
}

decrireHote("web", { ip: "10.0.92.10", arrivee: function(){ return Web; }, refus: refusReseau("web"), noyau: "6.1.0-21-amd64",
	web: function(){ return WebWww; },
	ports: { 22: port("ssh", BANNIERE_SSH), 80: port("http", "HTTP/1.1 400 Bad Request\nServer: httpd/2.4"), 443: port("https", "(chiffré : ici, nc ne lit que du bruit)") },
	journal: lignesDeJournal([["02:58", "httpd", "GET / 200"], [HEURE_PREMIERE, "httpd", "POST /uploads/ 201 depuis " + IP_LABO], [HEURE_PREMIERE, "httpd", "GET /uploads/maj.php 200 depuis " + IP_LABO], ["09:15", "httpd", "GET /robots.txt 200"]]),
	last: [{ qui: "laurent", tty: "pts/0", depuis: "10.0.92.1", quand: "lun. 08:02 - 08:30" }],
	services: { sshd: service("web", "sshd", "OpenBSD Secure Shell server"), httpd: service("web", "httpd", "Le serveur web") } });
decrireHote("mail", { ip: "10.0.92.11", arrivee: function(){ return Mail; }, refus: refusReseau("mail"), noyau: "6.1.0-21-amd64",
	ports: { 22: port("ssh", BANNIERE_SSH), 25: port("smtp", "220 mail.cybersup.lan ESMTP courrier 3.1 prêt"), 143: port("imap", "* OK [CAPABILITY IMAP4rev1] mail.cybersup.lan prêt") },
	journal: lignesDeJournal([["02:41", "postfix", "message reçu de support@cybersup-securite.com (domaine inconnu de l'école)"], ["08:10", "postfix", "message de laurent@cybersup.lan livré"]]),
	services: { sshd: service("mail", "sshd", "OpenBSD Secure Shell server"), postfix: service("mail", "postfix", "La messagerie") } });
decrireHote("dns", { ip: "10.0.92.53", arrivee: function(){ return Dns; }, refus: refusReseau("dns"), noyau: "6.1.0-21-amd64",
	ports: { 22: port("ssh", BANNIERE_SSH), 53: port("domain", "(le DNS parle en binaire : interroge-le avec dig)") },
	journal: lignesDeJournal([[HEURE_PREMIERE, "named", "zone cybersup.lan rechargée (ecole.zone modifiée)"]]),
	services: { sshd: service("dns", "sshd", "OpenBSD Secure Shell server"), named: service("dns", "named", "Le serveur DNS") } });
decrireHote("labo", { ip: IP_LABO, arrivee: function(){ return Labo; }, refus: refusReseau("labo"), noyau: "6.1.0-21-amd64",
	ports: { 22: port("ssh", BANNIERE_SSH) },
	fichiers: { passwd: function(){ return PasswdLabo; }, shadow: function(){ return ShadowLabo; }, group: function(){ return GroupLabo; } },
	journal: lignesDeJournal([[HEURE_PREMIERE, "sshd", "Accepted publickey for corbeau from " + ADRESSE_POSTE_CORBEAU], [HEURE_PREMIERE, "systemd", "Started maj-auto.service (Mise à jour automatique)."]]),
	sessions: function(){
		return Labo.procs.some(function(p){ return p.name === "sshd: corbeau@pts/1"; }) ?
			[{ qui: "corbeau", tty: "pts/1", depuis: "(" + ADRESSE_POSTE_CORBEAU + ")", heure: HEURE_PREMIERE }] : [];
	},
	last: function(){
		return [{ qui: JOUEUR, tty: "pts/0", depuis: "10.0.92.1", quand: "aujourd'hui   still logged in" },
			{ qui: "corbeau", tty: "pts/1", depuis: ADRESSE_POSTE_CORBEAU, quand: "aujourd'hui " + HEURE_PREMIERE + (state.quests["c_labo"] ? " - coupée" : "   still logged in") },
			{ qui: "stagiaire", tty: "pts/2", depuis: ADRESSE_POSTE_CORBEAU, quand: "hier 18:40 - 19:02" },
			{ qui: "etudiant", tty: "pts/1", depuis: "10.0.92.1", quand: "hier 14:00 - 17:00" }];
	},
	services: { sshd: service("labo", "sshd", "OpenBSD Secure Shell server"),
		"maj-auto": service("labo", "maj-auto", "Mise à jour automatique", { execStart: "/tmp/.maj/maj-auto", restart: "always", owner: "corbeau", procNom: "maj-auto" }) } });
decrireHote("parefeu", { ip: "10.0.92.254", arrivee: function(){ return Parefeu; }, refus: refusReseau("parefeu"), noyau: "6.1.0-21-amd64",
	ports: { 22: port("ssh", BANNIERE_SSH) },
	services: { sshd: service("parefeu", "sshd", "OpenBSD Secure Shell server") } });
decrireHote("sauvegarde", { ip: "10.0.92.200", arrivee: function(){ return Sauvegarde; }, noyau: "6.1.0-21-amd64",
	refus: refusReseau("sauvegarde", function(){
		var dossierCle = Home.getChildFromName(".ssh");
		var pub = dossierCle !== -1 ? dossierCle.getItemFromName("id_ed25519.pub") : -1;
		if (pub === -1 || state.reseau.cles["sauvegarde"] !== pub.getText()){
			return JOUEUR + "@sauvegarde : Permission denied (publickey).\n" +
				C.gris("(Le serveur de sauvegarde n'accepte que les clés. Fabrique ta paire avec ssh-keygen si ce n'est pas fait, puis installe-la : ssh-copy-id sauvegarde)");
		}
		return null;
	}),
	avantCle: function(){ return state.has("reseauCartographie") ? null : "ssh: Could not resolve hostname sauvegarde: Name or service not known"; },
	ports: { 22: port("ssh", BANNIERE_SSH) },
	services: { sshd: service("sauvegarde", "sshd", "OpenBSD Secure Shell server") } });
decrireHote("imprimante", { ip: "10.0.92.30", arrivee: function(){ return Imprimante; }, refus: refusReseau("imprimante"), noyau: "4.19.0-imprimante",
	ports: { 22: port("ssh", BANNIERE_SSH), 9100: port("jetdirect", "@PJL INFO STATUS\nCODE=10001 \"PRET\"") } });
decrireHote("badgeuse", { ip: "10.0.92.31", arrivee: function(){ return Badgeuse; }, refus: refusReseau("badgeuse"), noyau: "5.10.0-badgeuse",
	ports: { 22: port("ssh", BANNIERE_SSH), 8080: port("http-alt", "HTTP/1.1 401 Unauthorized") } });
decrireHote("poste-47", { ip: ADRESSE_POSTE_CORBEAU, arrivee: function(){ return Poste; }, noyau: "6.8.0-poste",
	refus: refusReseau("poste-47", function(){
		return state.quests["c_corbeau"] ? null : JOUEUR + "@poste-47 : Permission denied (publickey).\n" +
			C.gris("(C'est le poste personnel de quelqu'un. Sans son accord, on n'y entre pas, même en pleine enquête.)");
	}),
	ports: { 22: port("ssh", BANNIERE_SSH) },
	dmesg: ["[    0.000000] Linux version 6.8.0-poste", "[ 7712.104331] usb 1-2: new high-speed USB device number 4 using xhci_hcd",
		"[ 7712.251908] usb 1-2: Product: CLE-USB-LABO", "[ 7712.251913] usb 1-2: SerialNumber: B047-STAGIAIRE",
		"[ 7712.260117] sd 2:0:0:0: [sdb] 15630336 512-byte logical blocks: (8.00 GB/7.45 GiB)"] });
decrireHote("cybersup", { ports: { 22: port("ssh", BANNIERE_SSH), 80: port("http", "HTTP/1.1 301 Moved Permanently") }, noyau: "6.1.0-21-amd64" });
decrireHote("coffre", { ports: { 22: port("ssh", BANNIERE_SSH) }, noyau: "6.1.0-21-amd64" });
decrireHote("citadelle", { noyau: "6.1.0-citadelle",
	fichiers: { passwd: function(){ return PasswdCitadelle; }, shadow: function(){ return ShadowCitadelle; }, group: function(){ return GroupCitadelle; }, sudoers: function(){ return SudoersCitadelle; } },
	journal: lignesDeJournal([[HEURE_PREMIERE, "sshd", "Accepted publickey for corbeau from " + IP_LABO], [HEURE_PREMIERE, "sudo", "corbeau : COMMAND=/usr/sbin/useradd -o -u 0 " + COMPTE_CACHE], ["09:00", "sshd", "Accepted publickey for laurent from 10.0.92.1"]]),
	last: [{ qui: "corbeau", tty: "pts/1", depuis: IP_LABO, quand: "aujourd'hui " + HEURE_PREMIERE }, { qui: "laurent", tty: "pts/0", depuis: "10.0.92.1", quand: "aujourd'hui 09:00" }],
	dmesg: ["[    0.000000] Linux version 6.1.0-citadelle", "[  412.000101] kworker: tout va bien (c'est ce qu'il dit)"] });

/* Le service de persistance tourne sur le labo, et la session du Corbeau est encore ouverte. */
Labo.addProc(812, "sshd", "root", { cpu: 0.1, fichiers: ["TCP *:22 (LISTEN)"] });
Labo.addProc(tirerPids("session-corbeau", 1, 2000, 2999)[0], "sshd: corbeau@pts/1", "corbeau", { cpu: 0.2, session: true,
	fichiers: ["TCP labo:22->" + ADRESSE_POSTE_CORBEAU + ":51900 (ESTABLISHED)"] });
Labo.addProc(tirerPids("bash-corbeau", 1, 3000, 3999)[0], "-bash", "corbeau", { cpu: 0.1, session: true });
Labo.addProc(tirerPids("maj-auto", 1, 4000, 4999)[0], "maj-auto", "corbeau", { cpu: 3.2, service: "maj-auto",
	fichiers: ["/tmp/.maj/maj-auto", "TCP labo:43122->" + ADRESSE_POSTE_CORBEAU + ":51234 (ESTABLISHED)"] });

/*
 * Les démons qui tiennent les ports de chaque machine : ps, ss -tlnp, lsof et nmap racontent la même histoire.
 * On ne les tue pas à la main (un service se gère avec systemctl).
 */
var DEMONS_PAR_SERVICE = { ssh: "sshd", http: "httpd", https: "httpd", smtp: "postfix", imap: "dovecot", domain: "named", jetdirect: "jetdirect", "http-alt": "badged" };
var TEXTE_SERVICE_PROTEGE = "(Le tuer couperait le service pour toute l'école, et parfois ta propre connexion. Un service se gère avec systemctl, pas avec kill.)";
Racine.addProc(PID_SSHD, "sshd", "root", { cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE, fichiers: ["TCP *:22 (LISTEN)"] });
Racine.addProc(588, "postier", "root", { cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE, fichiers: ["TCP 127.0.0.1:25 (LISTEN)"] });
Object.keys(HOTES).forEach(function(nom){
	var h = HOTES[nom];
	if (!h.arrivee || !h.ports) return;
	var racine = h.arrivee();
	Object.keys(h.ports).forEach(function(numero){
		var demon = DEMONS_PAR_SERVICE[h.ports[numero].service] || h.ports[numero].service;
		var existant = racine.procs.filter(function(p){ return p.name === demon; })[0];
		if (!existant) existant = racine.addProc(tirerPids("demon-" + nom + "-" + demon, 1, 300, 999)[0], demon, "root", { cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE, fichiers: [] });
		existant.protege = TEXTE_SERVICE_PROTEGE;
		existant.fichiers = (existant.fichiers || []).concat(["TCP *:" + numero + " (LISTEN)"]).filter(function(f, i, t){ return t.indexOf(f) === i; });
	});
});
var prisesDeLaCitadelle = prisesDe;
prisesDe = function(hote){
	var h = HOTES[hote];
	if (!h || !h.arrivee || !h.ports) return prisesDeLaCitadelle(hote);
	var racine = h.arrivee();
	return Object.keys(h.ports).map(function(numero){
		var demon = DEMONS_PAR_SERVICE[h.ports[numero].service] || h.ports[numero].service;
		var p = racine.procs.filter(function(x){ return x.name === demon; })[0];
		return { etat: "LISTEN", local: "0.0.0.0:" + numero, service: h.ports[numero].service, pair: "0.0.0.0:*", proc: demon, pid: p ? p.pid : 0, owner: "root" };
	});
};

/* À l'ouverture de la Crypte, ce qui sert à l'enquête apparaît dans le monde. */
var MementoReseau = new Item("MementoReseau",
	"Un mémo de Vint, l'administrateur réseau, punaisé au-dessus des câbles :\n\n" +
	"« Pour savoir où tu es : ip a (ton adresse), uname -a (le système), hostname.\n" +
	"Pour découvrir les machines du réseau de l'école, et seulement de l'école : nmap 10.0.92.0/24.\n" +
	"Une fois qu'elles sont connues, on s'y connecte : ssh labo, ssh web, ssh mail, ssh dns...\n" +
	"Pour savoir où est installé un programme : which. Et ce que le noyau a vu passer : sudo dmesg.\n" +
	"Rappel légal : scanner un réseau sans l'autorisation de son propriétaire est un délit. Ici, la mission t'y autorise. »",
	"item_sign.gif").enseigne("ip", "nmap", "uname", "which", "dmesg").revele("s_c_uname", "s_c_banniere", "s_c_dig_inverse");
var ProcedurePreuves = new Item("ProcedurePreuves",
	"PROCÉDURE : METTRE LES PREUVES À L'ABRI (fiche d'Evi)\n\n" +
	"1. Le serveur de sauvegarde n'accepte que les clés. Une paire : ssh-keygen. L'installer : ssh-copy-id sauvegarde\n" +
	"2. Copier la preuve sans la modifier : scp FICHIER sauvegarde:/preuves/\n" +
	"3. Sur la sauvegarde (ssh sauvegarde, cd /preuves), noter son empreinte dans le registre, en la gardant à l'écran :\n" +
	"   sha256sum FICHIER | tee -a registre.txt\n\n" +
	"L'empreinte prouve plus tard que la preuve n'a pas bougé. C'est la « chaîne de traçabilité ».",
	"item_sign.gif").enseigne("scp", "tee", "ssh-copy-id", "ssh-keygen");
var ModeleRapport = new Item("ModeleRapport",
	"RAPPORT D'INCIDENT : CITADELLE\n\n" +
	"Adresse du poste de l'attaquant : \n" +
	"Compte caché supprimé : \n" +
	"Port de la porte dérobée : \n" +
	"Heure de la première connexion : \n\n" +
	"Rédigé par : " + "\n", "item_manuscript.gif");

/* ------------------------------------------------------------------ */
/* Les quêtes du chapitre 2                                            */
/* ------------------------------------------------------------------ */

var QUETES_CHAPITRE2 = [
	{ id: "c_crypte", titre: "Descendre dans la Crypte",
	  indice: "Une trappe s'est ouverte dans le sol de la Citadelle : c'est par là que passe le trafic que voit Grace. ssh citadelle, puis regarde autour de toi." },
	{ id: "c_integrite", titre: "Repérer le programme trafiqué",
	  indice: "L'Archiviste de la Crypte explique comment vérifier les empreintes du dossier bin." },
	{ id: "c_message", titre: "Décoder le message du Corbeau",
	  indice: "Le programme trafiqué transporte une charge qui ne ressemble à rien. Ce n'est pas du chiffrement, juste un emballage." },
	{ id: "c_suid", titre: "Trouver la porte dérobée",
	  indice: "Le message parle du Caveau et d'un bit. L'Inscription du Caveau explique lequel, et comment le chercher." },
	{ id: "c_racine", titre: "Entrer dans la Racine",
	  indice: "Une porte dérobée, c'est un programme : il s'exécute." },
	{ id: "c_ecoute", titre: "Couper l'écoute du Corbeau",
	  indice: "Grace, à la radio, voit du trafic sur un port inhabituel. Un sort montre quel processus écoute sur quel port." },
	{ id: "c_journaux", titre: "Retrouver la première connexion du Corbeau",
	  indice: "Les journaux de la Citadelle sont dans son dossier var/log. Les plus anciens sont compressés. Le CarnetDuVeilleur explique comment les lire." },
	{ id: "c_carto", titre: "Cartographier le réseau de l'école",
	  indice: "Le Corbeau est entré par une autre machine de l'école. Le MementoReseau, dans la SalleReseau de Cybersup, explique comment découvrir les machines." },
	{ id: "c_labo", titre: "Couper la session du Corbeau sur le labo",
	  indice: "La première connexion venait de l'adresse du labo. Connecte-toi au labo et regarde qui y est encore connecté. Le TableauDuLabo donne les commandes." },
	{ id: "c_service", titre: "Neutraliser le service de persistance",
	  indice: "Sur le labo, quelque chose se relance tout seul. Les services se gèrent avec systemctl." },
	{ id: "c_web", titre: "Retirer la page piégée du site web",
	  indice: "Le journal du site web (/var/log/access.log) montre un envoi depuis le labo, cette nuit. Le LISEZMOI du serveur web aide." },
	{ id: "c_mail", titre: "Démonter le mail piégé",
	  indice: "Le Corbeau a d'abord piégé le labo avec un mail. La file des messages est dans /var/spool sur la machine mail." },
	{ id: "c_dns", titre: "Corriger le faux enregistrement DNS",
	  indice: "La zone DNS de l'école est sur la machine dns, dans /etc/bind. Un nom y pointe vers une adresse qui n'a rien à faire là." },
	{ id: "c_parefeu", titre: "Bloquer le poste de l'attaquant au pare-feu",
	  indice: "Le Corbeau est passé par le labo, mais il venait d'un poste à lui : who, sur le labo, montre d'où venait sa session. C'est ce poste qu'il faut bloquer, sur la machine parefeu." },
	{ id: "c_compte", titre: "Supprimer le compte caché d'UID 0",
	  indice: "Sur la Citadelle, /etc/passwd liste les comptes. La ProcedureComptes, dans /etc, explique comment repérer un faux root." },
	{ id: "c_sudo", titre: "Retirer le droit sudo du Corbeau",
	  indice: "Le Corbeau a le droit sudo de deux façons : une ligne à son nom dans /etc/sudoers, et sa place dans le groupe sudo (groups corbeau). Il faut retirer les deux. sudoers ne se modifie qu'avec visudo." },
	{ id: "c_cle", titre: "Retirer la clé du Corbeau",
	  indice: "Le Corbeau a laissé sa clé dans les clés autorisées de root, dans le dossier caché de la Racine. Le ManuelDeNano explique comment modifier un fichier." },
	{ id: "c_coffre", titre: "Obtenir un accès au coffre",
	  indice: "Les ConsignesDuCoffre sont dans la SalleServeurs de Cybersup." },
	{ id: "c_preuves", titre: "Mettre les notes du Corbeau à l'abri",
	  indice: "Le faux kworker gardait un fichier ouvert dans /tmp de la Citadelle. La ProcedurePreuves, dans la SalleServeurs, dit comment le mettre à l'abri sur la sauvegarde." },
	{ id: "c_gpg", titre: "Déchiffrer les notes du Corbeau",
	  indice: "Les notes sont chiffrées avec gpg. La phrase de passe est cachée dans la porte dérobée elle-même. La FicheReflexe de la Racine dit comment lire un binaire." },
	{ id: "c_corbeau", titre: "Démasquer le Corbeau",
	  indice: "Les notes donnent rendez-vous dans le coffre de l'école : ssh coffre. Le Corbeau ne s'y montre qu'une fois toutes ses portes fermées (toutes les étapes précédentes)." },
	{ id: "c_rapport", titre: "Rédiger le rapport d'incident avec vim",
	  indice: "Le modèle est dans ta Maison (ModeleRapport). Copie-le en rapport.txt, puis remplis-le avec vim." }
];

var QUETES_SECONDAIRES_2 = [
	{ id: "s_c_base64", titre: "Emballer ton prénom en base64" },
	{ id: "s_c_silence", titre: "Faire taire les plaintes de find" },
	{ id: "s_c_trace", titre: "Garder une trace des erreurs dans un objet" },
	{ id: "s_c_suidfix", titre: "Retirer le bit SUID de la porte dérobée" },
	{ id: "s_c_passphrase", titre: "Protéger ta clé privée par une phrase de passe" },
	{ id: "s_c_empreintes", titre: "Calculer trois empreintes d'un même fichier" },
	{ id: "s_c_xxd", titre: "Lire la signature d'un programme avec xxd" },
	{ id: "s_c_photo", titre: "Démasquer la fausse photo de vacances" },
	{ id: "s_c_rev", titre: "Lire le graffiti écrit à l'envers" },
	{ id: "s_c_tee", titre: "Afficher et enregistrer en même temps avec tee" },
	{ id: "s_c_uname", titre: "Relever le système de quatre machines" },
	{ id: "s_c_dmesg", titre: "Repérer la clé USB dans les messages du noyau" },
	{ id: "s_c_imprimante", titre: "Récupérer le document oublié dans l'imprimante" },
	{ id: "s_c_badgeuse", titre: "Retrouver les entrées de nuit à la badgeuse" },
	{ id: "s_c_robots", titre: "Lire le robots.txt du site" },
	{ id: "s_c_banniere", titre: "Lire la bannière d'un service avec nc" },
	{ id: "s_c_dig_inverse", titre: "Faire une recherche DNS inverse" },
	{ id: "s_c_gzip", titre: "Compresser puis décompresser un fichier" },
	{ id: "s_c_verrou", titre: "Verrouiller le compte du Corbeau sur le labo" },
	{ id: "s_c_gpg", titre: "Chiffrer un fichier à toi avec gpg -c" },
	{ id: "s_v_quitter", titre: "Réussir à sortir de vim" },
	{ id: "s_v_quitter_force", titre: "Quitter vim sans enregistrer avec :q!" },
	{ id: "s_v_x", titre: "Leçon 1 de vim : supprimer avec x" },
	{ id: "s_v_i", titre: "Leçon 2 de vim : insérer avec i" },
	{ id: "s_v_A", titre: "Leçon 2 de vim : ajouter en fin de ligne avec A" },
	{ id: "s_v_dw", titre: "Leçon 3 de vim : supprimer un mot avec dw" },
	{ id: "s_v_dd", titre: "Leçon 3 de vim : supprimer une ligne avec dd" },
	{ id: "s_v_u", titre: "Leçon 3 de vim : annuler avec u" },
	{ id: "s_v_p", titre: "Leçon 4 de vim : déplacer une ligne avec dd et p" },
	{ id: "s_v_r", titre: "Leçon 4 de vim : remplacer un caractère avec r" },
	{ id: "s_v_cw", titre: "Leçon 4 de vim : changer un mot avec cw" },
	{ id: "s_v_recherche", titre: "Leçon 5 de vim : chercher avec / et n" },
	{ id: "s_v_substitution", titre: "Leçon 5 de vim : remplacer partout avec :%s" },
	{ id: "s_v_G", titre: "Leçon 5 de vim : aller à la fin avec G" }
];

INDICES_CHAPITRE2.c_crypte = [
	"La trappe mène à un lieu nommé Crypte, juste sous la Citadelle.",
	"ssh citadelle, puis cd Crypte"];
INDICES_CHAPITRE2.c_integrite = [
	"La liste SHA256SUMS contient les empreintes d'origine. sha256sum -c la relit et compare chaque programme.",
	"cd bin puis sha256sum -c SHA256SUMS"];
INDICES_CHAPITRE2.c_message = [
	"Lis le programme qui a répondu ÉCHEC : sa dernière ligne commence par charge=. Ce qui suit est du base64.",
	"Dans bin : grep charge= gardien | cut -d= -f2 | base64 -d"];
INDICES_CHAPITRE2.c_suid = [
	"Le bit SUID se cherche avec find et le critère -perm -4000, depuis le Caveau.",
	"cd ../Caveau puis find . -perm -4000 2>/dev/null"];
INDICES_CHAPITRE2.c_racine = [
	"La porte s'appelle .porte. On lance un programme qui est là où l'on se trouve avec ./NOM.",
	"Dans le Caveau : ./.porte puis cd Racine"];
INDICES_CHAPITRE2.c_ecoute = [
	"ss -tlnp montre les ports en écoute et le PID du processus. Les processus de root ne s'affichent qu'avec sudo.",
	"Dans la Racine : sudo ss -tlnp, repère le PID sur le port " + PORT_CORBEAU + ", puis sudo kill -9 PID"];
INDICES_CHAPITRE2.c_journaux = [
	"auth.log.2.gz est une archive gzip : zcat la lit sans la décompresser. Cherche la ligne Accepted avec grep.",
	"ssh citadelle, cd var/log, puis zcat auth.log.2.gz | grep Accepted"];
INDICES_CHAPITRE2.c_carto = [
	"ip a donne ton adresse ; nmap scanne tout le réseau de l'école d'un coup : 10.0.92.0/24.",
	"Dans la SalleReseau : less MementoReseau, puis nmap 10.0.92.0/24"];
INDICES_CHAPITRE2.c_labo = [
	"who montre les sessions ouvertes. Une session, ce sont des processus : pkill -u arrête tous ceux d'un utilisateur, avec sudo.",
	"ssh labo, less TableauDuLabo, who, puis sudo pkill -u corbeau"];
INDICES_CHAPITRE2.c_service = [
	"systemctl list-units montre un service au nom rassurant. Tuer son processus ne suffit pas : il est relancé. Il faut l'arrêter ET le désactiver.",
	"Sur le labo : sudo systemctl disable --now maj-auto"];
INDICES_CHAPITRE2.c_web = [
	"find /var/www -mtime -1 liste ce qui a changé depuis hier. Le fichier refuse d'être supprimé : regarde ses attributs avec lsattr.",
	"ssh web, cd /var/www/uploads, lsattr, sudo chattr -i maj.php, sudo rm maj.php"];
INDICES_CHAPITRE2.c_mail = [
	"La pièce jointe est encodée en base64 entre deux lignes « pièce jointe ». sed -n garde un intervalle de lignes, grep -v retire celles qui gênent.",
	"ssh mail, cd /var/spool, puis sed -n '/^--- pièce jointe/,/^--- fin/p' message-0042.eml | grep -v '^---' | base64 -d"];
INDICES_CHAPITRE2.c_dns = [
	"dig maj.cybersup.lan donne une adresse, et dig -x sur cette adresse dit à qui elle est vraiment : poste-47, un simple poste de travail. Le nom maj n'a rien à faire là. La ligne est dans /etc/bind/ecole.zone, à retirer en sudo (et seulement elle).",
	"ssh dns, sudo vim /etc/bind/ecole.zone, place-toi sur la ligne maj, dd, puis :wq"];
INDICES_CHAPITRE2.c_parefeu = [
	"Le pare-feu est désactivé. Il faut bloquer l'adresse du POSTE du Corbeau, celle d'où venait sa session sur le labo (who), et activer le pare-feu. Pas l'adresse du labo : le labo est une machine de l'école qu'il a seulement traversée.",
	"ssh parefeu, sudo ufw deny from " + ADRESSE_POSTE_CORBEAU + ", puis sudo ufw enable"];
INDICES_CHAPITRE2.c_compte = [
	"Un compte d'UID 0 est un root. awk -F: '$3 == 0' /etc/passwd les liste tous.",
	"ssh citadelle, cd etc, awk -F: '$3 == 0 { print $1 }' passwd, puis sudo userdel " + COMPTE_CACHE];
INDICES_CHAPITRE2.c_sudo = [
	"Une ligne commence par corbeau dans /etc/sudoers (sudo visudo l'ouvre), et groups corbeau montre qu'il est aussi dans le groupe sudo : usermod -rG retire quelqu'un d'un groupe.",
	"Sur la Citadelle : sudo usermod -rG sudo corbeau, puis sudo visudo, place-toi sur la ligne corbeau, supprime-la (dd dans vim, Ctrl+K dans nano), et enregistre (:wq)"];
INDICES_CHAPITRE2.c_cle = [
	"Le fichier est .ssh/authorized_keys, dans la Racine. Il appartient à root : sudo nano. La ligne à retirer finit par corbeau@nid.",
	"Dans la Racine : sudo nano .ssh/authorized_keys, place le curseur sur la ligne corbeau@nid, Ctrl+K, puis Ctrl+X et O pour enregistrer."];
INDICES_CHAPITRE2.c_coffre = [
	"ssh-keygen fabrique ta paire de clés dans ~/.ssh. Seule la clé publique (.pub) se donne.",
	"ssh-keygen, puis cp ~/.ssh/id_ed25519.pub ~/Cybersup/SalleServeurs/BoiteDeDepot"];
INDICES_CHAPITRE2.c_preuves = [
	"Le fichier est /tmp/.cache/notes.gpg sur la Citadelle. ssh-copy-id, scp, puis sha256sum | tee -a dans /preuves.",
	"ssh-copy-id sauvegarde ; depuis la Citadelle : scp tmp/.cache/notes.gpg sauvegarde:/preuves/ ; puis ssh sauvegarde, cd /preuves, sha256sum notes.gpg | tee -a registre.txt"];
INDICES_CHAPITRE2.c_gpg = [
	"strings .porte (dans le Caveau) montre une ligne phrase_rot13=. Le ROT13 se défait avec tr.",
	"Dans le Caveau : strings .porte | grep phrase | cut -d= -f3 | tr 'A-Za-z' 'N-ZA-Mn-za-m', puis gpg -d sur notes.gpg avec cette phrase"];
INDICES_CHAPITRE2.c_corbeau = [
	"Le coffre est une machine : on s'y connecte avec ssh, depuis n'importe où.",
	"ssh coffre puis less Corbeau"];
INDICES_CHAPITRE2.c_rapport = [
	"Les quatre réponses sont dans ton enquête : l'adresse vue par who sur le labo, le compte d'UID 0, le port du faux kworker, l'heure de la ligne Accepted dans auth.log.2.gz.",
	"cp ~/ModeleRapport ~/rapport.txt, vim ~/rapport.txt, place-toi en fin de chaque ligne avec A, écris la réponse, Échap, et :wq à la fin."];

/* ------------------------------------------------------------------ */
/* La radio suit l'enquête                                             */
/* ------------------------------------------------------------------ */

function texteRadioReseau(){
	var q = state.quests;
	if (!q["c_ecoute"]) return null;
	var etape = (typeof QUETES_CHAPITRE2 !== "undefined") ? QUETES_CHAPITRE2.filter(function(x){ return !q[x.id]; })[0] : null;
	var debut = "La radio grésille. « ";
	if (!etape) return debut + "Grace, terminé. Ton rapport est sur le bureau de Laurent, Frances commence en B1 à la rentrée, et le SOC est enfin calme. Beau boulot. »";
	switch (etape.id){
		case "c_journaux": return debut + "L'écoute est coupée. Maintenant, il faut savoir par où il est entré. Les journaux de la Citadelle sont dans var/log, et les vieux sont compressés. Cherche sa première connexion. »";
		case "c_carto": return debut + "Il venait de " + IP_LABO + ". Ce n'est pas la Citadelle, c'est une autre machine de l'école. Vint a laissé un MementoReseau dans la SalleReseau : découvre le réseau. »";
		case "c_labo": return debut + "C'est le labo de TP ! Va voir qui y est connecté en ce moment : ssh labo. Le TableauDuLabo donne les commandes. »";
		case "c_service": return debut + "Session coupée. Mais mes sondes voient encore le labo parler au poste du Corbeau. Quelque chose se relance tout seul là-bas : un service. »";
		case "c_web": return debut + "Le labo est propre. Le Corbeau a aussi touché au site web cette nuit : regarde les journaux du serveur web. »";
		case "c_mail": return debut + "Bien. Reste à comprendre comment il a eu accès au labo au départ. Un mail suspect est arrivé à 02:41 sur la machine mail. »";
		case "c_dns": return debut + "Le mail venait d'un faux domaine. Et le Corbeau a ajouté un nom dans notre DNS pour détourner les mises à jour. Machine dns, dossier /etc/bind. »";
		case "c_parefeu": return debut + "DNS corrigé. Maintenant on ferme la porte : le pare-feu est désactivé depuis une semaine, et le poste du Corbeau peut toujours entrer. Machine parefeu. »";
		case "c_compte": return debut + "Pare-feu actif. Retour sur la Citadelle : son journal montre un useradd en pleine nuit. Un compte de trop, avec les droits de root. »";
		case "c_sudo": return debut + "Compte supprimé. Mais le Corbeau a toujours le droit sudo sur la Citadelle : par /etc/sudoers, et par le groupe sudo. Retire-lui les deux. »";
		case "c_cle": return debut + "Plus de sudo. Reste sa clé SSH dans les clés autorisées de root, dans la Racine. Evi a laissé un ManuelDeNano par là. »";
		case "c_coffre": return debut + "Toutes ses portes sont fermées. Il reste à savoir QUI c'est. Evi peut t'ouvrir le coffre, où tout converge : ses ConsignesDuCoffre sont dans la SalleServeurs. »";
		case "c_preuves": return debut + "Avant d'aller plus loin : le faux kworker gardait un fichier ouvert. C'est une preuve. Mets-la à l'abri sur la sauvegarde avant de la toucher : la ProcedurePreuves est dans la SalleServeurs. »";
		case "c_gpg": return debut + "Preuve à l'abri. Elle est chiffrée, mais le Corbeau a laissé sa phrase de passe quelque part, à peine cachée. Commence par sa porte dérobée. »";
		case "c_corbeau": return debut + "Ses notes te donnent rendez-vous au coffre. Vas-y : ssh coffre. »";
		case "c_rapport": return debut + "Laurent attend ton rapport. Le modèle est dans ta Maison. Avec vim, s'il te plaît : c'est l'éditeur de tous les serveurs. »";
	}
	return null;
}

/* ------------------------------------------------------------------ */
/* Le monde réagit                                                     */
/* ------------------------------------------------------------------ */

function verifierReseau(){
	if (!state.has("crypteOuverte")) return;
	function une(nom, condition){ if (!state.has(nom) && condition) state.applyState(nom); }
	une("reseauOuvert", true);
	// Le service maj-auto est configuré pour redémarrer tout seul (Restart=always).
	var majAuto = HOTES["labo"].services["maj-auto"];
	if (majAuto.actif && !Labo.procs.some(function(p){ return p.service === "maj-auto"; })){
		demarrerService("labo", "maj-auto");
		if (state.quests["c_labo"]) say(C.jaune("systemd : maj-auto.service a redémarré tout seul (Restart=always).") + C.gris(" Tuer son processus ne suffit pas : systemctl."));
	}
	if (!majAuto.actif && !majAuto.auto) state.complete("c_service");
	if (!Labo.procs.some(function(p){ return p.name === "sshd: corbeau@pts/1"; })) state.complete("c_labo");
	if (!WebUploads.hasItem(PagePiegee) && !WebUploads.getNode("maj.php")) state.complete("c_web");
	// Le DNS est corrigé quand la ligne maj a disparu et que toutes les vraies machines y sont encore.
	var zone = zoneDns();
	var manquantes = ZONE_LEGITIME.filter(function(l){ return !zone.some(function(r){ return r.nom === l[0] && r.type === "A" && r.valeur === l[1]; }); });
	var majPresent = zone.some(function(r){ return r.nom === "maj"; });
	if (!majPresent && manquantes.length === 0) state.complete("c_dns");
	else if (manquantes.length && state.texteZoneSignale !== manquantes.join("|")){
		state.texteZoneSignale = manquantes.join("|");
		say("La radio grésille : « Attention, la zone DNS a perdu des lignes qui servaient : " + manquantes.map(function(l){ return l[0]; }).join(", ") +
			". Plus personne ne trouve ces machines par leur nom ! Remets-les (par exemple : " + manquantes[0][0] + " IN A " + manquantes[0][1] + "), et ne retire que la ligne maj. »");
	}
	var pf = state.reseau.parefeu;
	if (posteBloque()) state.complete("c_parefeu");
	else if (state.quests["c_parefeu"] && !state.has("parefeuRouvert")){
		state.set("parefeuRouvert");
		say("La radio grésille. C'est Grace : « Mes sondes revoient passer le poste " + ADRESSE_POSTE_CORBEAU + " : le pare-feu ne le bloque plus ! sudo ufw status numbered sur parefeu. »");
	}
	if (posteBloque()) delete state.flags["parefeuRouvert"];
	ParefeuUfwLog.setText(pf.actif ?
		"[UFW BLOCK] IN=eth0 SRC=" + (posteBloque() ? ADRESSE_POSTE_CORBEAU + " DST=10.0.92.53 PROTO=TCP DPT=22 (bloqué)" : "(rien de bloqué pour l'instant)") :
		"(vide : le pare-feu est désactivé depuis une mise à jour, la semaine dernière. Oups.)");
	ParefeuUfwLog.modifie = false;
	if (!/^maintenance:/m.test(PasswdCitadelle.getText())){
		delete UTILISATEURS[COMPTE_CACHE];
		state.complete("c_compte");
	}
	if (sudoCorbeauRetire()) state.complete("c_sudo");
	if (/^corbeau:!/m.test(ShadowLabo.getText())) state.complete("s_c_verrou");
	// La preuve : une copie identique de notes.gpg dans /preuves, et son empreinte au registre.
	// La copie doit être identique à la preuve telle que le Corbeau l'a laissée, et son empreinte notée au registre.
	var copie = SauvegardePreuves.getItemFromName("notes.gpg");
	var empreinteOrigine = sha256(contenuExact(NotesCorbeau.gpg.armure));
	if (copie !== -1 && sha256(contenuExact(copie.getText())) === empreinteOrigine && RegistrePreuves.getText().indexOf(empreinteOrigine) > -1) state.complete("c_preuves");
	else if (copie !== -1 && sha256(contenuExact(copie.getText())) !== empreinteOrigine && !state.has("preuveAbimee")){
		state.set("preuveAbimee");
		say("La radio grésille. C'est Grace : « La copie de notes.gpg sur la sauvegarde ne correspond pas à l'original : la preuve a été modifiée. " +
			"Une preuve abîmée ne vaut plus rien. Il y a une copie intacte dans la mémoire du faux kworker : je la remets dans /tmp/.cache de la Citadelle. Recommence, sans y toucher. »");
	}
	// Tant que la preuve n'est pas à l'abri, l'original abîmé ou effacé est remis en place (une fois annoncé).
	if (!state.quests["c_preuves"] && state.has("reseauOuvert") && (NotesCorbeau.getText() !== NotesCorbeau.gpg.armure || CacheCorbeau.getItemFromName("notes.gpg") === -1)){
		var ancienne = CacheCorbeau.getItemFromName("notes.gpg");
		if (ancienne !== -1 && ancienne !== NotesCorbeau) CacheCorbeau.removeItem(ancienne);
		NotesCorbeau.setText(NotesCorbeau.gpg.armure);
		NotesCorbeau.modifie = false;
		if (!CacheCorbeau.hasItem(NotesCorbeau)) CacheCorbeau.addItem(NotesCorbeau);
		if (!state.has("preuveRestauree")){
			state.set("preuveRestauree");
			say("La radio grésille. C'est Grace : « Tu as touché à notes.gpg avant de le mettre à l'abri ! Une preuve modifiée ne vaut plus rien. " +
				"Heureusement, le faux kworker en gardait une copie en mémoire : je la remets dans /tmp/.cache. Cette fois, copie-la d'abord, sans la modifier. »");
		}
	}
	// Le Corbeau n'attend au coffre que lorsque toutes ses portes sont fermées.
	var restantes = etapesAvantCorbeau();
	if (state.quests["c_gpg"] && restantes.length === 0 && !Coffre.hasItem(Corbeau) && !state.quests["c_corbeau"]) poser(Coffre, Corbeau);
	if (state.quests["c_gpg"] && restantes.length > 0 && !state.has("corbeauPatiente")){
		state.set("corbeauPatiente");
		say("La radio grésille. C'est Grace : « Ses notes donnent rendez-vous au coffre. Mais il est encore chez lui sur notre réseau : " +
			"tant que toutes ses portes ne sont pas fermées, il ne se montrera pas. Il te reste : " + restantes.map(function(q){ return q.titre.toLowerCase(); }).join(", ") + ". »");
	}
	if (state.quests["c_corbeau"] && !Home.hasItem(ModeleRapport) && !state.has("modelePose")){ state.set("modelePose"); poser(Home, ModeleRapport); }
	if (state.has("cleCorbeauRetiree") && !SalleServeurs.hasItem(ProcedurePreuves)) poser(SalleServeurs, ProcedurePreuves);
	if (Object.keys(state.reseau.hotesUname || {}).length >= 4) state.complete("s_c_uname");
	// Une leçon de vim supprimée revient, neuve, comme quand on relance vimtutor.
	Object.keys(LECONS_VIM).forEach(function(nom){
		if (VimTuteur.getItemFromName(nom) !== -1) return;
		fichier(VimTuteur, nom, LECONS_VIM[nom], { owner: JOUEUR, mode: "rw-r--r--", image: "item_manuscript.gif" });
		say(C.gris("(Le tuteur remet une copie neuve de " + nom + " dans vimtuteur.)"));
	});
}

/*
 * Le droit sudo du Corbeau est retiré quand : sa ligne a disparu de sudoers (modifié avec visudo),
 * il n'est plus dans le groupe sudo, et sudoers donne toujours les droits à root et au groupe sudo.
 */
function sudoCorbeauRetire(){
	var sudoers = SudoersCitadelle.getText();
	var groupes = lignesDe(GroupCitadelle.getText()).filter(function(l){ return l.split(":")[0] === "sudo"; })[0] || "";
	var membres = (groupes.split(":")[3] || "").split(",");
	return state.has("visudoUtilise") && !/^\s*corbeau\s/m.test(sudoers) && membres.indexOf("corbeau") === -1 &&
		/^\s*root\s+ALL/m.test(sudoers) && /^\s*%sudo\s+ALL/m.test(sudoers);
}

/* Le pare-feu, comme ufw : la première règle qui concerne l'adresse décide (une règle limitée à un port ne suffit pas). */
function adresseDansPlage(plage, ip){
	if (plage === "Anywhere" || plage === "any") return true;
	var m = /^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/.exec(plage);
	if (!m) return false;
	var bits = m[2] === undefined ? 32 : parseInt(m[2], 10);
	function nombre(a){ return a.split(".").reduce(function(t, o){ return t * 256 + parseInt(o, 10); }, 0); }
	var bloc = Math.pow(2, 32 - bits);
	return Math.floor(nombre(m[1]) / bloc) === Math.floor(nombre(ip) / bloc);
}
function posteBloque(){
	var pf = state.reseau.parefeu;
	if (!pf.actif) return false;
	for (var i = 0; i < pf.regles.length; i++){
		var r = pf.regles[i];
		if ((r.vers || "Anywhere") !== "Anywhere" || !adresseDansPlage(r.de, ADRESSE_POSTE_CORBEAU)) continue;
		return r.action === "deny" || r.action === "reject";
	}
	return false;
}

/* Les étapes principales à boucler avant de rencontrer le Corbeau. */
function etapesAvantCorbeau(){
	var liste = [];
	for (var i = 0; i < QUETES_CHAPITRE2.length; i++){
		if (QUETES_CHAPITRE2[i].id === "c_corbeau") break;
		if (!state.quests[QUETES_CHAPITRE2[i].id]) liste.push(QUETES_CHAPITRE2[i]);
	}
	return liste;
}

/* Appelé par etatChapitre2 pour les événements propres au réseau. */
function etatReseau(nom){
	if (nom === "reseauOuvert"){
		[CitadelleEtc, CitadelleVar, CitadelleTmp].forEach(function(l){ relier(Citadelle, l); });
		poser(SalleReseau, MementoReseau);
	}
	if (nom === "reseauCartographie"){
		say("Le réseau de l'école se dessine : web, mail, dns, labo, parefeu, sauvegarde, imprimante, badgeuse, coffre... " +
			"Tu peux maintenant t'y connecter par leur nom : ssh labo, ssh web...");
		state.complete("c_carto");
	}
}

/* Le texte qui permet de rédiger le rapport : les quatre réponses, chacune sur sa ligne. */
function rapportComplet(texte){
	var t = texte.toLowerCase();
	function ligne(debut){
		var l = lignesDe(texte).filter(function(x){ return x.toLowerCase().indexOf(debut) === 0; })[0];
		return l ? l.toLowerCase() : "";
	}
	return ligne("adresse du poste").indexOf(ADRESSE_POSTE_CORBEAU) > -1 &&
		ligne("compte caché").indexOf(COMPTE_CACHE) > -1 &&
		ligne("port de la porte").indexOf(String(PORT_CORBEAU)) > -1 &&
		ligne("heure de la première").indexOf(HEURE_PREMIERE) > -1;
}

GameEvents.addListener("read", function(e){
	if (e.item === AuthLog2 && e.cmd === "zcat") state.complete("c_journaux");
	if (e.item && e.item.itemname === "job-017.txt" && current_room === ImprimanteSpool || (e.item && e.item.itemname === "job-017.txt")) state.complete("s_c_imprimante");
});
GameEvents.addListener("ufwChange", function(e){
	if (e.regle && e.regle.de && (e.regle.action === "deny" || e.regle.action === "reject") && adresseDansPlage(e.regle.de, IP_LABO) && !adresseDansPlage(e.regle.de, ADRESSE_POSTE_CORBEAU)){
		say("La radio grésille. C'est Grace : « Tu viens de bloquer " + e.regle.de + " : c'est le labo de TP, une machine de l'école ! Le Corbeau l'a seulement traversé. " +
			"Son vrai poste, c'est l'adresse d'où venait sa session sur le labo (who). Retire cette règle : sudo ufw delete N. »");
	}
	if (e.regle && (e.regle.action === "allow") && adresseDansPlage(e.regle.de, ADRESSE_POSTE_CORBEAU)){
		say(C.jaune("Attention : cette règle AUTORISE le poste du Corbeau. Si elle passe avant un deny, c'est elle qui décide."));
	}
});
GameEvents.addListener("nmap", function(e){ if (e.reseau && !state.has("reseauCartographie")) state.applyState("reseauCartographie"); });
GameEvents.addListener("base64", function(e){ if (e.decode && e.text.indexOf("charge du Corbeau") > -1) state.complete("c_mail"); });
GameEvents.addListener("gpg", function(e){
	if (e.decrypt && e.ok && e.item && e.item.gpg && e.item.gpg.phrase === PHRASE_CORBEAU) state.complete("c_gpg");
	if (!e.decrypt && e.item) state.set("gpgChiffre");
	if (state.has("gpgChiffre")) state.complete("s_c_gpg");
});
GameEvents.addListener("empreinte", function(e){
	e.item.empreintes = e.item.empreintes || {};
	e.item.empreintes[e.algo] = true;
	if (e.item.empreintes.md5sum && e.item.empreintes.sha1sum && e.item.empreintes.sha256sum) state.complete("s_c_empreintes");
});
GameEvents.addListener("sha256sum", function(e){
	if (!e.item) return;
	e.item.empreintes = e.item.empreintes || {};
	e.item.empreintes.sha256sum = true;
	if (e.item.empreintes.md5sum && e.item.empreintes.sha1sum) state.complete("s_c_empreintes");
});
GameEvents.addListener("xxd", function(e){ if (e.item.binaire) state.complete("s_c_xxd"); });
GameEvents.addListener("file", function(e){ if (e.item.itemname === "vacances.jpg") state.set("photoExaminee"); });
GameEvents.addListener("read", function(e){
	if (e.item && e.item.itemname === "vacances.jpg" && e.cmd === "zcat" && state.has("photoExaminee")) state.complete("s_c_photo");
});
GameEvents.addListener("rev", function(e){ if (e.text.indexOf(PHRASE_GRAFFITI) > -1) state.complete("s_c_rev"); });
GameEvents.addListener("tee", function(e){ if (e.files.length) state.complete("s_c_tee"); });
GameEvents.addListener("uname", function(e){ state.reseau.hotesUname[e.host] = true; });
GameEvents.addListener("dmesg", function(e){ if (e.host === "poste-47") state.complete("s_c_dmesg"); });
GameEvents.addListener("awk", function(e){
	if (current_room === BadgeuseJournaux && /B-047/.test(e.sortie) && e.sortie.split("\n").length <= 4) state.complete("s_c_badgeuse");
});
GameEvents.addListener("curl", function(e){ if (e.chemin === "/robots.txt" && e.code === 200) state.complete("s_c_robots"); });
GameEvents.addListener("nc", function(e){ if (e.port !== "22") state.complete("s_c_banniere"); });
GameEvents.addListener("dig", function(e){ if (e.inverse && e.reponses.length) state.complete("s_c_dig_inverse"); });
GameEvents.addListener("gzip", function(e){
	if (e.compresse) state.set("aCompresse");
	else if (state.has("aCompresse")) state.complete("s_c_gzip");
});
GameEvents.addListener("kill", function(e){
	// Couper la session : son bash part avec elle.
	if (e.proc.name === "sshd: corbeau@pts/1"){
		Labo.procs = Labo.procs.filter(function(p){ return p.name !== "-bash" || p.owner !== "corbeau"; });
	}
});

/* Les leçons de vim et la sortie de vim. */
GameEvents.addListener("vimQuitte", function(e){
	state.complete("s_v_quitter");
	if (e.info && e.info.commandes && e.info.commandes[":q!modifie"]) state.complete("s_v_quitter_force");
});
GameEvents.addListener("write", function(e){
	if (e.item === SudoersCitadelle){
		var t = e.text || "";
		if (e.visudo) state.set("visudoUtilise");
		else if (!state.has("sudoersAlaMain")){
			state.set("sudoersAlaMain");
			say("Evi, à la radio : « Tu as modifié /etc/sudoers directement ? Une seule faute de frappe et plus personne ne peut utiliser sudo sur la Citadelle. " +
				"Rouvre-le avec sudo visudo : il vérifie la syntaxe avant d'enregistrer. »");
		}
		if (!/^\s*root\s+ALL/m.test(t) || !/^\s*%sudo\s+ALL/m.test(t)){
			say("Evi, à la radio : « Attention, sudoers ne donne plus les droits à " + (!/^\s*root\s+ALL/m.test(t) ? "root" : "au groupe sudo (et donc à Laurent)") +
				". Ne retire que la ligne du Corbeau : remets les autres (la copie d'origine : root ALL=(ALL:ALL) ALL et %sudo ALL=(ALL:ALL) ALL). »");
		}
		return;
	}
	if (!e.vim) return;
	var cmds = e.vim.commandes || {};
	var t = e.text, nom = e.item.itemname;
	if (cmds.u) state.complete("s_v_u");
	if (e.room === VimTuteur){
		if (nom === "lecon1.txt" && cmds.x && t.indexOf("---> La vache sauta par-dessus la lune.") > -1) state.complete("s_v_x");
		if (nom === "lecon2.txt"){
			if ((cmds.i || cmds.a) && t.indexOf("---> Il manque des mots dans cette ligne.") > -1) state.complete("s_v_i");
			if (cmds.A && t.indexOf("---> Cette ligne s'arrête au milieu de nulle part.") > -1) state.complete("s_v_A");
		}
		if (nom === "lecon3.txt"){
			if ((cmds.dw || cmds.de) && t.indexOf("---> Le pare-feu protège le réseau.") > -1) state.complete("s_v_dw");
			if (cmds.dd && t.indexOf("ne sert à rien") === -1) state.complete("s_v_dd");
		}
		if (nom === "lecon4.txt"){
			var a = t.indexOf("---> 1) première"), b = t.indexOf("---> 2) deuxième"), c = t.indexOf("---> 3) troisième");
			if (cmds.dd && cmds.p && a > -1 && a < b && b < c) state.complete("s_v_p");
			if (cmds.r && t.indexOf("une attaque.") > -1) state.complete("s_v_r");
			if ((cmds.cw || cmds.ce) && t.indexOf("---> Le pare-feu est fermé.") > -1) state.complete("s_v_cw");
		}
		if (nom === "lecon5.txt"){
			if (cmds["/"] && cmds.n) state.complete("s_v_recherche");
			if (cmds[":%s"] && t.indexOf("erreur") === -1 && t.indexOf("succès") > -1) state.complete("s_v_substitution");
			if (cmds.G && /---> FIN ?\.\s*$/.test(t)) state.complete("s_v_G");
		}
	}
	if (nom === "rapport.txt" && e.room === Home && rapportComplet(t) && !state.has("victoireCyber")) state.applyState("victoireCyber");
});
GameEvents.addListener("write", function(e){
	if (e.vim || e.visudo) return;
	if (e.item && e.item.itemname === "rapport.txt" && e.room === Home && rapportComplet(e.text) && !state.has("victoireCyber")){
		say("Laurent lit par-dessus ton épaule. « Le contenu est bon. Mais je t'ai demandé vim : sur un serveur, tu n'auras souvent que lui. Rouvre-le avec vim, et enregistre avec :wq. »");
	}
});

/* Les PNJ du chapitre 1 restent les mêmes : on ajoute seulement des enseignements à l'Archiviste. */
Whitfield.enseigne("md5sum", "sha1sum");
Whitfield.revele("s_c_empreintes", "s_c_xxd");

/* Les illustrations de Cybersup, de la Crypte et des dossiers système (outils/dessiner_lieux.py). */
[[Cybersup, "loc_cybersup.gif"], [SalleReseau, "loc_sallereseau.gif"], [SalleServeurs, "loc_salleserveurs.gif"], [Baie1, "loc_baie.gif"],
 [Baie2, "loc_baie.gif"], [Baie3, "loc_baie.gif"], [BDE, "loc_bde.gif"], [BureauDeLaurent, "loc_bureau.gif"], [CampusLille, "loc_lille.gif"],
 [CampusMarseille, "loc_marseille.gif"], [Coffre, "loc_coffre.gif"], [Crypte, "loc_crypte.gif"], [DossierBin, "loc_bin.gif"],
 [Caveau, "loc_caveau.gif"], [Racine, "loc_racine.gif"]].forEach(function(x){ x[0].room_pic = "./static/img/" + x[1]; });
Object.keys(World.rooms).forEach(function(id){
	var n = World.rooms[id];
	if (n.chapitre !== 2 || (n.room_pic.indexOf("loc_darkroom") === -1 && n.room_pic.indexOf("loc_library") === -1)) return;
	if (n.room_name === "etc" || n.room_name === "bind") n.room_pic = "./static/img/loc_etc.gif";
	else if (n.room_name === "log" || n.room_name === "journaux") n.room_pic = "./static/img/loc_journaux.gif";
	else if (n.room_name === "tmp" || n.room_name === ".cache") n.room_pic = "./static/img/loc_tmp.gif";
});

/* World.fige est posé à la fin de Panne.js, une fois le chapitre de la panne construit. */
