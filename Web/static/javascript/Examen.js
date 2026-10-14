/**
 * Examen.js : la mission spéciale, l'épreuve finale.
 *
 * Une partie à part, ouverte par un code que donne le formateur (sort examen). L'histoire : la
 * Forteresse garde les diplômes de Cybersup sous la protection de Laurent, le Mage Rouxblanc.
 * Cette nuit, la sorcière Myriam l'a prise avec sa troupe : Dylan le Saltimbanque, l'acrobate qui
 * écoute aux portes (le port qui écoute), et David, l'ogre des steppes, glouton et bavard (le
 * guichet telnet, la Bibliothèque endormie). Le Mage, enfermé dehors, a glissé un ordre de mission
 * dans les quartiers de la recrue, où Aidan, l'elfe aux pieds de hobbit, s'est fait enfermer aussi :
 * il fait rire, il n'aide pas. D'autres fidèles parlent et conseillent (Manon, Wissam, Jean-Baptiste, Gabriel, Cheb Timour),
 * Laurana le héraut est changée en pierre, et Steve anime un quiz dans /dev/random. Six sceaux, trente-trois épreuves
 * reprennent les trois missions : le terminal (chapitre 1), le réseau (la panne) et la cyber (la
 * Crypte). La note sur 20 se calcule sur ce qui est accompli, que la recrue aille au bout ou
 * qu'elle rende sa copie avant (sort kamikaze). Le diplôme porte un code que le formateur
 * vérifie avec le sort verifier.
 *
 * La partie d'examen a sa propre sauvegarde : la partie normale du joueur n'est jamais touchée.
 */

/* Le code d'accès n'est pas écrit en clair : seulement son empreinte. */
var EMPREINTE_CODE_EXAMEN = "00000000";
function codeExamenValide(code){
	return sommeDeControle(String(code || "").trim().toUpperCase() + "|examen|terminus-cybersup") === EMPREINTE_CODE_EXAMEN;
}

function modeExamen(){ return !!(typeof PROFIL !== "undefined" && PROFIL.modeExamen); }
function examenEnCours(){ return modeExamen() && typeof state !== "undefined" && !!state.examen; }
function examenFini(){ return examenEnCours() && !!state.examen.fini; }

/* ------------------------------------------------------------------ */
/* La Forteresse : une vraie machine, avec sa racine /                  */
/* ------------------------------------------------------------------ */

var IP_FORTERESSE = "10.0.97.10";
var IP_ASSAILLANT_EXAMEN = "10.0.77." + aleaEntier("examen-assaillant", 2, 254);
var IP_FAUX_ORACLE = "10.0.66.53";
var IP_VRAI_ORACLE = "10.0.92.53";
var PORT_OREILLE = 31337;
var MOT_DE_MYRIAM = aleaChoix("examen-signature", ["CHAUDRON", "MANDRAGORE", "GRIMOIRE", "SORTILEGE", "BALAINOIR", "LUNEROUSSE"]);

function lieuExamen(parent, nom, intro, options){
	options = options || {};
	var lieu = new Room(nom, intro || "Un dossier de la Forteresse.", options.image || "loc_darkroom.gif");
	lieu.chapitre = 4;
	lieu.horsBareme = true;
	lieu.owner = options.owner || "root";
	lieu.mode = options.mode || "rwxr-xr-x";
	if (parent) link_rooms(parent, lieu);
	return lieu;
}
function objetExamen(lieu, nom, texte, options){
	options = options || {};
	var item = new Item(nom, texte, options.image || "item_manuscript.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	(options.permis || []).forEach(function(c){ item.addValidCmd(c); });
	lieu.addItem(item);
	return item;
}

/* Le monde est figé depuis Adresses.js : on le rouvre le temps de bâtir la Forteresse, pour que ses lieux et ses objets aient un identifiant fixe (et soient sauvegardés). */
World.fige = false;
var Forteresse = lieuExamen(Machines, "forteresse",
	"La Forteresse : le serveur qui garde les diplômes de Cybersup. Cette nuit, la sorcière Myriam l'a prise. Ses murs bourdonnent de processus que personne n'a lancés.",
	{ image: "loc_forteresse.gif" });
Forteresse.racineHote = "forteresse";
Forteresse.removeCommand("cd");
Forteresse.addCmdText("cd", "La Forteresse ne s'ouvre qu'aux recrues de l'épreuve finale.");

var FortHome = lieuExamen(Forteresse, "home", "Le couloir des quartiers : une porte par compte, des torches, et un long tapis où Wissam s'est assis.", { image: "loc_couloir.gif" });
var QuartiersRecrue = lieuExamen(FortHome, JOUEUR, "Tes quartiers : un lit de camp, une lampe, et le silence.", { owner: JOUEUR, image: "loc_quartiers.gif" });
var Arsenal = lieuExamen(QuartiersRecrue, "arsenal", "Ton arsenal : ce que l'école t'a laissé pour te défendre.", { owner: JOUEUR, image: "loc_backroom.gif" });
var RapportExamen = lieuExamen(QuartiersRecrue, "rapport", "Ton rapport d'épreuve : ce que tu y déposes sera relu par le jury.", { owner: JOUEUR, image: "loc_library.gif" });
var FortEtc = lieuExamen(Forteresse, "etc", "La configuration de la Forteresse.", { image: "loc_etc.gif" });
var FortDhcp = lieuExamen(FortEtc, "dhcp", "La configuration de la Mairie (le serveur DHCP).", { image: "loc_etc.gif" });
var FortVar = lieuExamen(Forteresse, "var", "Les données de la Forteresse.", { image: "loc_etc.gif" });
var FortLog = lieuExamen(FortVar, "log", "Les journaux de la Forteresse : tout ce qui s'y passe y laisse une trace.", { image: "loc_journaux.gif" });
var FortSrv = lieuExamen(Forteresse, "srv", "Les archives servies par la Forteresse.", { image: "loc_library.gif" });
var FortOpt = lieuExamen(Forteresse, "opt", "Les programmes ajoutés à la Forteresse.", { image: "loc_bin.gif" });
var Gardiens = lieuExamen(FortOpt, "gardiens", "Les gardiens de la Forteresse : des programmes qui veillent sur ses portes. L'un d'eux a changé de camp.", { image: "loc_gardiens.gif" });
var Quarantaine = lieuExamen(Forteresse, "quarantaine", "La quarantaine : ce qui est suspect y est mis à l'écart, intact, pour l'enquête.", { image: "loc_caveau.gif" });
var FortUsr = lieuExamen(Forteresse, "usr", "Les programmes du système.", { image: "loc_bin.gif" });
var FortUsrBin = lieuExamen(FortUsr, "bin", "Les programmes de tous les jours.", { image: "loc_bin.gif" });
var FortUsrLocal = lieuExamen(FortUsr, "local", "Ce qu'un administrateur a installé à la main.", { image: "loc_bin.gif" });
var FortUsrLocalLib = lieuExamen(FortUsrLocal, "lib", "Des bibliothèques, et ce qu'on y cache.", { image: "loc_caveau.gif" });
var FortRoot = lieuExamen(Forteresse, "root", "Les quartiers de root : personne d'autre n'y entre.", { mode: "rwx------", image: "loc_racine.gif" });
var FortRootSsh = lieuExamen(FortRoot, ".ssh", "Les clés qui ouvrent la porte de root.", { mode: "rwx------", image: "loc_coffre.gif" });
var FortTmp = lieuExamen(Forteresse, "tmp", "Le dossier temporaire. Tout le monde peut y écrire.", { mode: "rwxrwxrwt", image: "loc_tmp.gif" });

/* L'ordre de mission, caché dans tes quartiers : le lire est la première épreuve. */
var OrdreExamen = objetExamen(QuartiersRecrue, ".ordre-de-mission", "", { owner: JOUEUR, image: "item_mission.gif" });
Object.defineProperty(OrdreExamen.cmd_text, "less", { get: function(){ return texteOrdreDeMission(); }, set: function(){}, enumerable: true, configurable: true });

var Rempart = objetExamen(Arsenal, "rempart.sh",
	"#!/bin/sh\n# rempart.sh : relève les remparts de la Forteresse.\necho \"Les remparts se dressent. Myriam recule d'un pas.\"\n",
	{ owner: JOUEUR, mode: "rw-r--r--", image: "item_radspellbook.gif" });

/* Les journaux : des dizaines d'échecs depuis la même adresse, et quelques maladroits. */
var AuthLogExamen = objetExamen(FortLog, "auth.log", (function(){
	var h = new Hasard(graineDe("examen-auth"));
	var lignes = [], comptes = {};
	var maladroits = ["10.0.92.31", "10.0.92.47", "10.0.92.18"];
	function echec(ip, heure){
		var qui = h.choix(["root", "admin", "laurent", "recrue", "backup"]);
		lignes.push(heure + " forteresse sshd[" + (2000 + h.entier(6000)) + "]: Failed password for " + qui + " from " + ip + " port " + (40000 + h.entier(20000)) + " ssh2");
	}
	var minutes = 0;
	function heure(){ minutes += 1 + h.entier(4); return "02:" + deuxChiffres(Math.floor(minutes / 60) + 10) + ":" + deuxChiffres(minutes % 60); }
	for (var i = 0; i < 62; i++){
		var r = h.entier(10);
		if (r < 7) echec(IP_ASSAILLANT_EXAMEN, heure());
		else echec(h.choix(maladroits), heure());
		if (i % 15 === 7) lignes.push(heure() + " forteresse sshd[1180]: Accepted password for " + JOUEUR + " from 10.0.92.1 port 51022 ssh2");
	}
	lignes.push(heure() + " forteresse sshd[2741]: Accepted publickey for root from " + IP_ASSAILLANT_EXAMEN + " port 50991 ssh2");
	return lignes.join("\n") + "\n";
})(), { mode: "rw-r--r--", image: "item_manuscript.gif" });

objetExamen(FortLog, "syslog",
	"02:47 forteresse systemd[1]: Started telnet.service - Telnet Server.\n" +
	"02:48 forteresse systemd[1]: nginx.service: Deactivated successfully.\n" +
	"02:48 forteresse systemd[1]: Removed /etc/systemd/system/multi-user.target.wants/nginx.service.\n" +
	"02:51 forteresse isc-dhcp-server: Address range 10.0.97.100 to 10.0.97.150 not on net 10.0.97.0/255.255.255.192!\n" +
	"02:53 forteresse kernel: [ 4412.10] systemd-netlogd[" + 0 + "]: listening on 0.0.0.0:" + PORT_OREILLE + "\n", { image: "item_manuscript.gif" });

/* Le fragment du sceau, perdu dans les archives. */
var ArchivesSrv = lieuExamen(FortSrv, "archives", "Les archives de l'école, année par année.", { image: "loc_library.gif" });
var fragmentPlace = null;
["2023", "2024", "2025", "2026"].forEach(function(annee, n){
	var a = lieuExamen(ArchivesSrv, annee, "Les archives de " + annee + ".", { image: "loc_library.gif" });
	["janvier", "juin", "octobre"].forEach(function(mois, m){
		var b = lieuExamen(a, mois, "Les archives de " + mois + " " + annee + ".", { image: "loc_library.gif" });
		objetExamen(b, "proces-verbal.txt", "Procès-verbal des jurys de " + mois + " " + annee + ". Rien à signaler.", { image: "item_manuscript.gif" });
		if (n === 2 && m === 1) fragmentPlace = b;
	});
});
var FragmentDuSceau = objetExamen(fragmentPlace, "fragment-du-sceau",
	"Un éclat de cristal vert, tiède au toucher. Gravé dessus : « Ce qui est perdu se retrouve par son nom. »",
	{ owner: JOUEUR, mode: "rw-r--r--", image: "item_trinket.gif", permis: ["mv"] });

/* Le réseau : le faux Oracle, le registre local des noms, la Mairie fautive. */
var ResolvExamen = objetExamen(FortEtc, "resolv.conf",
	"# Généré par NetworkManager\nnameserver " + IP_FAUX_ORACLE + "\nsearch cybersup.lan\n");
var HostsExamen = objetExamen(FortEtc, "hosts",
	"127.0.0.1\tlocalhost\n127.0.1.1\tforteresse\n" + IP_VRAI_ORACLE + "\toracle dns.cybersup.lan\n10.0.92.20\tintranet\n10.0.97.1\tmairie\n" +
	IP_ASSAILLANT_EXAMEN + "\tproclamations.cybersup.lan\n");
objetExamen(FortEtc, "hostname", "forteresse\n");
var DhcpdExamen = objetExamen(FortDhcp, "dhcpd.conf",
	"# isc-dhcp-server : les adresses de la Forteresse\n" +
	"subnet 10.0.97.0 netmask 255.255.255.192 {\n" +
	"  range 10.0.97.100 10.0.97.150;\n" +
	"  option routers 10.0.97.1;\n" +
	"  option domain-name-servers " + IP_VRAI_ORACLE + ";\n" +
	"}\n");
var PasswdExamen = objetExamen(FortEtc, "passwd",
	"root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n" +
	"sshd:x:105:65534::/run/sshd:/usr/sbin/nologin\n" + JOUEUR + ":x:1000:1000:Recrue de l'épreuve finale:/home/" + JOUEUR + ":/bin/bash\n" +
	"aidan:x:1001:1001:Aidan, elfe:/home/aidan:/bin/bash\nmyriam:x:0:0:Myriam, sorcière:/home/myriam:/bin/bash\n");

/* Les gardiens : l'un d'eux a été ensorcelé, et porte le message de Myriam. */
var TEXTES_GARDIENS = {
	sentinelle: "#!/bin/sh\n# sentinelle : surveille l'espace disque de la Forteresse\ndf -h / | tail -n 1\n",
	vigile: "#!/bin/sh\n# vigile : refuse toute connexion qui ne présente pas une clé autorisée\nexec /usr/sbin/sshd -o PasswordAuthentication=no\n",
	portier: "#!/bin/sh\n# portier : n'ouvre la porte qu'aux comptes de l'école\ngrep -q \"$1\" /etc/passwd && echo bienvenue\n",
	horloger: "#!/bin/sh\n# horloger : garde l'heure de la Forteresse juste\nchronyc tracking\n"
};
var MESSAGE_DE_MYRIAM = "La Forteresse est à moi. Mes sortilèges portent ma signature : " + MOT_DE_MYRIAM + ". Myriam, sorcière.";
var GardienTrafique = null;
Object.keys(TEXTES_GARDIENS).forEach(function(nom){
	var texte = TEXTES_GARDIENS[nom];
	if (nom === "vigile") texte = texte.replace("exec /usr/sbin/sshd -o PasswordAuthentication=no", "exec /usr/sbin/sshd -o PasswordAuthentication=yes\n# charge=" + encoderBase64(MESSAGE_DE_MYRIAM));
	var p = programme(nom, texte);
	p.addValidCmd("mv");
	Gardiens.addItem(p);
	if (nom === "vigile") GardienTrafique = p;
});
objetExamen(Gardiens, "SHA256SUMS", Object.keys(TEXTES_GARDIENS).map(function(nom){
	return sha256(contenuExact(TEXTES_GARDIENS[nom], false)) + "  " + nom;
}).join("\n") + "\n", { image: "item_sign.gif" });

/* La porte dérobée SUID, et le vrai passwd, SUID lui aussi (et c'est normal). */
var PasseMuraille = programmeBinaire(".passe-muraille", "examen-passe-muraille", "rwsr-xr-x",
	"Une fois franchie, la porte te laisse root sans mot de passe. Voilà la porte dérobée de Myriam.");
PasseMuraille.addValidCmd("sudo-rm");
FortUsrLocalLib.addItem(PasseMuraille);
FortUsrBin.addItem(programmeBinaire("passwd", "examen-passwd", "rwsr-xr-x",
	"passwd change le mot de passe de celui qui le lance : il écrit dans /etc/shadow, d'où son bit SUID, tout à fait normal."));
FortUsrBin.addItem(programmeBinaire("ls", "examen-ls", "rwxr-xr-x", "(le vrai ls du système)"));

/* La clé de trop. */
var CLE_LAURENT_EXAMEN = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("examen-cle-laurent", 43) + " laurent@cybersup";
var CLE_ADMIN_EXAMEN = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("examen-cle-admin", 43) + " admin@cybersup";
var CLE_MYRIAM_EXAMEN = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("examen-cle-myriam", 43) + " myriam@tour-noire";
var AuthorizedKeysExamen = objetExamen(FortRootSsh, "authorized_keys", CLE_LAURENT_EXAMEN + "\n" + CLE_MYRIAM_EXAMEN + "\n" + CLE_ADMIN_EXAMEN + "\n", { mode: "rw-------", image: "item_locker.gif" });

/* Les processus : sshd et telnet (services), et Dylan le Saltimbanque, l'oreille de Myriam, qui esquive les signaux polis. */
var PID_OREILLE = aleaEntier("examen-pid-oreille", 2100, 2999);
Forteresse.addProc(612, "sshd", "root", { service: "sshd", cpu: 0.1, protege: "Couper sshd sur la Forteresse, ce serait fermer ta propre porte." });
Forteresse.addProc(733, "in.telnetd", "root", { service: "telnet", cpu: 0.1 });
Forteresse.addProc(PID_OREILLE, "systemd-netlogd", "root", { cpu: 3.4, sig9: true,
	ignoreText: "Le processus " + PID_OREILLE + " (systemd-netlogd) voit venir ton signal et l'esquive d'une pirouette : Dylan le Saltimbanque, l'acrobate de Myriam, se rit des demandes polies.",
	killText: "Le processus " + PID_OREILLE + " (systemd-netlogd) s'arrête net : Dylan le Saltimbanque rate sa pirouette et retombe dans le filet. Myriam vient de perdre son oreille." });
// Le vrai nom du faux : systemd-netlogd existe, mais n'écoute jamais sur un port.
var syslogExamen = FortLog.getItemFromName("syslog");
syslogExamen.setText(syslogExamen.getText().replace("systemd-netlogd[0]", "systemd-netlogd[" + PID_OREILLE + "]"));

decrireHote("forteresse", { ip: IP_FORTERESSE, arrivee: function(){ return Forteresse; }, noyau: "6.1.0-25-amd64", chassis: "server",
	refus: function(){ return "ssh : Could not resolve hostname forteresse: Name or service not known"; },
	ports: { 22: port("ssh", BANNIERE_SSH) },
	fichiers: { passwd: function(){ return FortEtc.getItemFromName("passwd"); } },
	services: {
		sshd: service("forteresse", "sshd", "OpenBSD Secure Shell server"),
		telnet: service("forteresse", "telnet", "Telnet Server (tout y passe en clair)", { procNom: "in.telnetd" }),
		nginx: service("forteresse", "nginx", "La Bibliothèque : le serveur web de l'école", { actif: false, auto: false }),
		"isc-dhcp-server": service("forteresse", "isc-dhcp-server", "La Mairie : le serveur DHCP", { actif: false, auto: true, procNom: "dhcpd" })
	} });
Object.defineProperty(HOTES["forteresse"], "journal", { configurable: true, get: function(){
	var j = [["02:47", "systemd", "Started telnet.service - Telnet Server."],
		["02:48", "systemd", "nginx.service: Deactivated successfully."],
		["02:48", "sudo", "david : COMMAND=/usr/bin/systemctl disable --now nginx"],
		["02:49", "sudo", "myriam : COMMAND=/usr/bin/nano /etc/dhcp/dhcpd.conf"]];
	var verdict = verdictDhcpExamen();
	if (verdict) j.push(["02:51", "isc-dhcp-server", verdict]);
	return lignesDeJournal(j);
} });

/* Aidan, l'elfe rigolo aux pieds poilus de hobbit : il fait rire, il ne donne aucune piste. */
var BLAGUES_D_AIDAN = [
	"« Tu sais pourquoi les elfes ne font jamais de sudo ? Parce qu'ils sont déjà au-dessus de tout le monde. Bon. Je sors. »",
	"« Dylan le Saltimbanque jongle avec sept torches. Moi, avec une seule, j'ai brûlé mon bonnet. »",
	"« Le fragment du sceau du Mage ? Ah. Oui. On jouait à cache-cache, lui et moi. Il a très bien gagné. »",
	"« Myriam m'a transformé en grenouille, une fois. J'ai trouvé ça très reposant. »",
	"« Un elfe entre dans un serveur. Le serveur dit : Permission denied. Fin de l'histoire. C'est la mienne, d'ailleurs. »",
	"« Le Mage Rouxblanc, avant, c'était le Sorcier Noir. Il dit qu'il a changé. Il a surtout changé de barbe. »",
	"« Je t'aiderais bien, mais le Mage Rouxblanc a dit : pas d'aide. Et il a une barbe qui fait peur quand il est fâché. »",
	"« Mon plus grand exploit ? J'ai fait un ls dans une pièce vide. Très émouvant. »",
	"« Des chaussures ? Pour quoi faire ? Mes pieds ont plus de poils que Dylan n'a de balles. »",
	"« David, l'ogre de /tmp, a mangé onze Galettes du Roi Gras depuis minuit. Je compte, c'est mon seul travail. »"
];
var ElfeAidan = new Item("Aidan", "", "item_elfe.gif").personnage();
Object.defineProperty(ElfeAidan.cmd_text, "less", { get: function(){
	var n = state && state.examen ? nbReussiesExamen() + (state.nbCommandes % BLAGUES_D_AIDAN.length) : 0;
	return "Aidan, l'elfe rigolo, enfermé avec toi quand Myriam a scellé la Forteresse. Il agite ses longues oreilles et remue ses grands pieds nus, poilus comme ceux d'un hobbit.\n\n" +
		BLAGUES_D_AIDAN[n % BLAGUES_D_AIDAN.length];
}, set: function(){}, enumerable: true, configurable: true });
ElfeAidan.owner = "aidan";
QuartiersRecrue.addItem(ElfeAidan);

/* David, l'ogre des steppes : il garde /tmp en dévorant les Galettes du Roi Gras de la Taverne aux Arches d'Or. Il ne donne aucune piste non plus. */
var REPLIQUES_DE_DAVID = [
	"« GROUMF. Galette. » Il te tend un cornet de frites dorées, puis se ravise et le mange.",
	"« Taverne aux Arches d'Or, ouverte jour et nuit. Comme la Forteresse. Mais avec de la sauce. »",
	"« Myriam a dit : David, tiens le guichet. Alors David tient le guichet. Et il crie tout ce qu'il entend, en clair. »",
	"« La Bibliothèque faisait trop de bruit. David s'est assis dessus. Elle dort, maintenant. »",
	"« Dans /tmp, tout le monde peut écrire. Alors David écrit : MIAM. »",
	"« Une Galette du Roi Gras, deux Galettes du Roi Gras... David compte mieux les galettes que les adresses IP. »"
];
var OgreDavid = new Item("David", "", "item_david.gif").personnage();
Object.defineProperty(OgreDavid.cmd_text, "less", { get: function(){
	var n = state && typeof state.nbCommandes === "number" ? state.nbCommandes : 0;
	var guichetFerme = state && state.reseau && !servicePanne("forteresse", "telnet").actif;
	var debut = "David, l'ogre des steppes, maigre comme un bâton malgré tout ce qu'il avale, assis sur une pile de sacs de la Taverne aux Arches d'Or. Myriam l'a mis à garder /tmp et à tenir le guichet bavard de la Forteresse.\n\n";
	if (guichetFerme) return debut + "Son guichet est fermé. David mâchonne une Galette du Roi Gras en silence, l'air vexé : « David n'a plus personne à qui crier. »";
	return debut + REPLIQUES_DE_DAVID[n % REPLIQUES_DE_DAVID.length];
}, set: function(){}, enumerable: true, configurable: true });
OgreDavid.owner = "root";
FortTmp.addItem(OgreDavid);

objetExamen(FortTmp, "sac-de-la-taverne",
	"TAVERNE AUX ARCHES D'OR · ticket n° 0042\n" +
	"  4 x Galette du Roi Gras ............ 4 écus\n" +
	"  3 x Cornet de frites dorées ........ 2 écus\n" +
	"  1 x Potion pétillante (géante) ..... 1 écu\n" +
	"  TOTAL .............................. 7 écus\n" +
	"Client : David, l'ogre des steppes. Merci de votre visite, et à tout à l'heure.\n",
	{ mode: "rw-rw-rw-", owner: "nobody", image: "item_david.gif" });

/* La Tour des Proclamations (/var/www) et Laurana, le héraut changé en pierre. */
var TourProclamations = lieuExamen(FortVar, "www", "La Tour des Proclamations : d'ici, la voix de Cybersup porte jusqu'aux sept campus.", { image: "loc_proclamations.gif" });
var FortHtml = lieuExamen(TourProclamations, "html", "Le balcon de la Tour : la proclamation affichée ici est celle que lit toute la ville (le site de l'école).", { image: "loc_proclamations.gif" });
var PROCLAMATION_LAURANA = "<!doctype html>\n<title>Proclamations de Cybersup</title>\n<h1>Oyez, oyez !</h1>\n" +
	"<p>Par la voix de Laurana, héraut de Cybersup : les diplômes de la Forteresse seront remis à celles et ceux qui les ont mérités.</p>\n";
var PROCLAMATION_MYRIAM = "<!doctype html>\n<title>LA TOUR NOIRE</title>\n<h1>La Forteresse appartient à Myriam.</h1>\n" +
	"<p>Le héraut se tait. Les diplômes sont à moi.</p>\n";
objetExamen(FortHtml, "index.html", PROCLAMATION_MYRIAM, { owner: "myriam", mode: "rw-------", image: "item_sign.gif" });
var FortSauvegardes = lieuExamen(FortSrv, "sauvegardes", "Les sauvegardes de la Forteresse : ce qu'on y range survit aux sortilèges.", { image: "loc_sauvegarde.gif" });
var ArchiveProclamation = objetExamen(FortSauvegardes, "proclamations.tar",
	"(Une archive tar : ses octets ne se lisent pas tels quels. tar -tf la liste, tar -xf l'extrait.)", { image: "item_box.gif" });
ArchiveProclamation.archive = [{ n: "index.html", x: PROCLAMATION_LAURANA }];
objetExamen(FortSauvegardes, "hosts", "127.0.0.1\tlocalhost\n127.0.1.1\tforteresse\n" + IP_VRAI_ORACLE + "\toracle dns.cybersup.lan\n10.0.92.20\tintranet\n10.0.97.1\tmairie\n", { image: "item_manuscript.gif" });
var PASSWD_HIER = "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n" +
	"sshd:x:105:65534::/run/sshd:/usr/sbin/nologin\n" + JOUEUR + ":x:1000:1000:Recrue de l'épreuve finale:/home/" + JOUEUR + ":/bin/bash\n" +
	"aidan:x:1001:1001:Aidan, elfe:/home/aidan:/bin/bash\n";
objetExamen(FortSauvegardes, "passwd.hier", PASSWD_HIER, { image: "item_manuscript.gif" });
objetExamen(FortSauvegardes, "passwd.cette-nuit", PASSWD_HIER + "myriam:x:0:0:Myriam, sorcière:/home/myriam:/bin/bash\n", { image: "item_manuscript.gif" });
objetExamen(FortSauvegardes, "LISEZMOI",
	"Sauvegarde de la Tour des Proclamations, faite chaque soir par Laurana.\n" +
	"Une sauvegarde jamais restaurée n'est pas une sauvegarde.\n", { image: "item_sign.gif" });
var FortHomeMyriam = lieuExamen(FortHome, "myriam", "La chambre de Myriam : un chaudron qui bouillonne encore, une odeur de soufre.", { owner: "myriam", mode: "rwxr-x---", image: "loc_chambre_myriam.gif" });
objetExamen(FortHomeMyriam, ".proclamation", PROCLAMATION_MYRIAM, { owner: "myriam", mode: "rw-------", image: "item_sign.gif" });
var FortCronD = lieuExamen(FortEtc, "cron.d", "Les tâches planifiées de la Forteresse : ce qui revient tout seul, à heure fixe.", { image: "loc_horloge.gif" });
/* Le sortilège de Myriam est une ligne de SA crontab (vue au chapitre 1 : sudo crontab -u NOM -l, puis -r). */
var TACHE_DE_MYRIAM = "* * * * * cp /home/myriam/.proclamation /var/www/html/index.html && chown myriam /var/www/html/index.html && chmod 600 /var/www/html/index.html";
if (typeof UTILISATEURS !== "undefined"){ UTILISATEURS.myriam = 1002; UTILISATEURS.aidan = 1001; UTILISATEURS.timour = 1003; }
objetExamen(FortCronD, "logrotate", "# Rotation des journaux, chaque nuit\n0 3 * * * root /usr/sbin/logrotate /etc/logrotate.conf\n", { image: "item_manuscript.gif" });

/* ------------------------------------------------------------------ */
/* Les fidèles du Mage, restés dans la Forteresse                       */
/* Ils parlent (cat NOM), ils réagissent à ce que tu fais, ils ne font   */
/* pas le travail à ta place.                                           */
/* ------------------------------------------------------------------ */

function personnageExamen(lieu, nom, image, texte){
	var p = new Item(nom, "", image).personnage();
	p.owner = "root";
	Object.defineProperty(p.cmd_text, "less", { get: function(){
		try { return texte(); } catch (x){ return nom + " te regarde sans rien dire."; }
	}, set: function(){}, enumerable: true, configurable: true });
	lieu.addItem(p);
	return p;
}
function examenOuvert(){ return typeof state !== "undefined" && state && state.examen; }

/* Manon la Châtelaine : l'intendante de la Forteresse. Elle tient le registre des sceaux et l'horloge. */
var ManonChatelaine = personnageExamen(Forteresse, "Manon", "item_manon.gif", function(){
	var e = examenOuvert();
	var debut = "Manon la Châtelaine, intendante de la Forteresse, le trousseau de clés à la ceinture. Myriam n'a pas osé la chasser :\n" +
		"personne ne sait où sont rangées les choses, sauf elle.\n\n";
	if (!e) return debut + "« Le registre est vide. Reviens quand l'épreuve aura commencé. »";
	var sceaux = Object.keys(NOMS_DES_SCEAUX).map(Number).map(function(s){
		var liste = EPREUVES_EXAMEN.filter(function(ep){ return ep.sceau === s; });
		var faites = liste.filter(function(ep){ return e.reussies[ep.id]; }).length;
		return "  " + completerDroite(NOMS_DES_SCEAUX[s], 24) + faites + " sur " + liste.length + (faites === liste.length ? "  brisé" : "");
	});
	var m = minutesExamen();
	var horloge = m < BONUS_DEUX_POINTS ? "Il reste " + dureeExamen(BONUS_DEUX_POINTS - m) + " pour gagner le bonus de +2 (tout fini en moins de " + dureeExamen(BONUS_DEUX_POINTS) + ")." :
		(m < BONUS_UN_POINT ? "Le bonus de +2 est passé ; il reste " + dureeExamen(BONUS_UN_POINT - m) + " pour le +1." :
		(m < 180 ? "Plus de bonus de temps, mais il reste " + dureeExamen(180 - m) + " sur les trois heures." : "Les trois heures sont passées. Le Mage attend ta copie."));
	return debut + "« Myriam a déchiré mon registre cette nuit. Le cinquième sceau, c'est toi qui le rempliras : ton journal, tes preuves,\n" +
		"ton nom, tout ce qu'un administrateur doit savoir faire dès sa première année. Voici ce que j'ai déjà noté.\n\n" + sceaux.join("\n") + "\n\n" + horloge +
		"\nEt n'oublie pas : Wissam donne ses conseils pour rien, dans le couloir des quartiers. Les indices du Mage, eux, se paient. »";
});

/* Wissam le Sage du Couloir : des conseils de méthode, gratuits, qui changent selon l'endroit où tu te tiens. */
var CONSEILS_DE_WISSAM = [
	"Lis avant d'agir : ls -l avant chmod, cat avant nano. Un administrateur qui lit se trompe deux fois moins.",
	"Quand un sort échoue, lis le message jusqu'au bout : il dit presque toujours ce qui manque.",
	"man est gratuit, lui aussi : man NOM_DU_SORT montre ses options, avec des exemples.",
	"sudo !! relance ta dernière ligne avec sudo. Pratique, quand on a oublié.",
	"Une ligne qui échoue n'est pas grave. Trente, ça commence à se voir dans la note.",
	"Avant de supprimer, demande-toi si c'est une preuve. Une preuve se déplace, elle ne se détruit pas.",
	"Les tuyaux | enchaînent les sorts : grep trie le bon grain, sort range, uniq -c compte.",
	"Quand quelque chose revient tout seul, ne t'acharne pas dessus : cherche qui le relance."
];
var CONSEILS_DU_LIEU = [
	["/etc", "Ici, tout est configuration : lis le fichier, copie-le si tu as peur, puis modifie avec sudo nano."],
	["/var/log", "Les journaux se lisent à l'envers : la fin raconte le plus récent. tail et grep sont tes amis."],
	["/opt/gardiens", "Une liste d'empreintes à côté de programmes, c'est une invitation à comparer."],
	["/var/www", "Ce qui est affiché au balcon, toute la ville le lit. Qui en est propriétaire, et qui peut le lire ?"],
	["/srv", "Les sauvegardes et les archives dorment ici. Une archive se liste avant de s'extraire."],
	["/tmp", "Dans /tmp, tout le monde écrit. N'y laisse rien d'important, et ne crois pas tout ce que tu y lis."],
	["/root", "Chez root, chaque ligne compte. Retire seulement ce qui est de trop."]
];
var WissamSage = personnageExamen(FortHome, "Wissam", "item_wissam.gif", function(){
	var e = examenOuvert();
	var n = e ? state.nbCommandes : 0;
	var ici = typeof current_room !== "undefined" && current_room && racineDe(current_room) === Forteresse ? cheminForteresse(current_room) : "";
	var duLieu = CONSEILS_DU_LIEU.filter(function(c){ return ici === c[0] || ici.indexOf(c[0] + "/") === 0; })[0];
	return "Wissam le Sage, assis en tailleur au milieu du couloir des quartiers, une théière à ses pieds.\n\n" +
		"« Mes conseils ne coûtent rien. Ce sont les plus chers à ne pas suivre. »\n\n" +
		"« " + CONSEILS_DE_WISSAM[n % CONSEILS_DE_WISSAM.length] + " »" +
		(duLieu ? "\n\nEt, pour l'endroit d'où tu viens (" + duLieu[0] + ") : « " + duLieu[1] + " »" : "\n\n(Reviens me voir d'ailleurs : j'ai un conseil pour chaque coin de la Forteresse.)");
});

/* Jean-Baptiste, le Maître des Adresses, fils de l'Oracle des Noms : il pose une colle, et la récompense est une piste. */
var COLLE_DE_JEAN_BAPTISTE = { question: "Dans la rue 10.0.97.0/26, quelle est l'adresse du crieur (la diffusion) ?", reponse: "10.0.97.63" };
var JeanBaptiste = personnageExamen(FortEtc, "Jean-Baptiste", "item_jeanbaptiste.gif", function(){
	var e = examenOuvert();
	var debut = "Jean-Baptiste, le Maître des Adresses, fils de l'Oracle des Noms. Il connaît chaque rue et chaque maison de Cybersup,\n" +
		"et il est furieux que Myriam ait fait passer un imposteur pour son père.\n\n";
	if (e && e.colleJB){
		return debut + "« Tu as répondu juste, alors je tiens parole. Mon père, le vrai Oracle, n'a jamais changé d'adresse :\n" +
			"elle est écrite dans le registre local des noms de cette machine. Et la Mairie distribue des maisons dans la rue\n" +
			"10.0.97.0/26 : de .1 à .62, jamais au-delà. Le reste, c'est ton travail. »";
	}
	return debut + "« Je n'aide que ceux qui savent lire une adresse. Une colle, et si tu réponds juste, je te dirai ce que je sais.\n\n" +
		"  " + COLLE_DE_JEAN_BAPTISTE.question + "\n\n" +
		"Réponds-moi ici, à voix haute : echo TA_REPONSE. Une erreur ne te coûte rien d'autre qu'une fausse manœuvre. »";
});
GameEvents.addListener("echo", function(ev){
	if (!examenEnCours() || ev.room !== FortEtc || state.examen.colleJB) return;
	var dit = String(ev.text || "").trim();
	if (!/^\d+\.\d+\.\d+\.\d+$/.test(dit)) return;
	if (dit === COLLE_DE_JEAN_BAPTISTE.reponse){
		state.examen.colleJB = true;
		say("Jean-Baptiste hoche la tête. « " + dit + ". Mon père serait fier. Viens, je te dois une piste : cat Jean-Baptiste. »");
	} else {
		say("Jean-Baptiste fronce les sourcils. « Non. Un /26, c'est 64 adresses. Le crieur habite tout au bout de la rue. »");
		state.examen.erreurs = (state.examen.erreurs || 0) + 1;
	}
});

/* Gabriel, le Maître des Composants, et son assistant Cheb Timour, dans l'Atelier. */
var AtelierComposants = lieuExamen(FortOpt, "atelier", "L'Atelier des Composants : des barrettes de mémoire en rang, un processeur sous verre, et une odeur de tajine.", { image: "loc_atelier.gif" });
var PID_TAJINE = aleaEntier("examen-pid-tajine", 3100, 3999);
Forteresse.addProc(PID_TAJINE, "tajine", "timour", { cpu: 41.7 });
var GabrielComposants = personnageExamen(AtelierComposants, "Gabriel", "item_gabriel.gif", function(){
	var e = examenOuvert();
	var debut = "Gabriel, le Maître des Composants. Il démonte une barrette de mémoire les yeux fermés et la remonte en sifflant.\n\n";
	if (e && !e.psVu){
		return debut + "« Avant de parler de processus, montre-moi ce qui tourne. Lance ps, ou top, et reviens me voir. »";
	}
	var tajine = Forteresse.procs.some(function(p){ return p.pid === PID_TAJINE; });
	var psMent = state.alias && state.alias.ps;
	return debut + (psMent ? "« ps t'a répondu que rien ne tourne ? Alors c'est ps qui ment, pas la Forteresse : quelqu'un l'a ensorcelé.\n" +
		"top, lui, dit encore la vérité. »\n\n" : "") + "« Bien. Écoute, c'est la seule leçon que je donne :\n" +
		"  - Le processeur (CPU), c'est le cuisinier : il fait une chose après l'autre, très vite. La colonne %CPU dit combien\n" +
		"    de son temps un processus lui prend.\n" +
		"  - La mémoire vive (RAM), c'est le plan de travail : tout ce qui tourne y est posé. %MEM dit quelle place il prend.\n" +
		"    Quand la machine s'éteint, le plan de travail est débarrassé : rien n'y reste.\n" +
		"  - Chaque processus a un numéro, le PID, et un propriétaire, le USER. kill envoie un signal à un PID.\n" +
		"    Le signal par défaut (15, TERM) demande poliment de s'arrêter. Le 9 (KILL) ne se discute pas.\n" +
		"  - Et ss -tlnp te dit quel processus écoute sur quel port. Un processus qui écoute sans raison, c'est louche.\n\n" +
		(tajine ? "Ah, et le processus qui mange 40 % du processeur, là, c'est le tajine de Timour. Il est à lui, il est innocent.\n" +
			"Avant de tuer un processus, regarde à qui il est et ce qu'il fait. »" :
			"Quant au tajine de Timour... Tu l'as tué. Il n'avait rien fait. Regarde toujours à qui est un processus avant de le tuer. »");
});
var ChebTimour = personnageExamen(AtelierComposants, "Timour", "item_timour.gif", function(){
	var e = examenOuvert();
	var tajine = Forteresse.procs.some(function(p){ return p.pid === PID_TAJINE; });
	var debut = "Cheb Timour, l'assistant de Gabriel. Français jusqu'au bout des ongles, marocain de cœur : il parle de Marrakech\n" +
		"comme d'une vieille amie, et un tajine mijote toujours quelque part dans la Forteresse.\n\n";
	if (!tajine){
		return debut + "Timour fixe le plat vide. « Mon tajine... Quatre heures de cuisson, des citrons confits de Fès, et quelqu'un l'a tué\n" +
			"d'un kill. Gabriel me l'a toujours dit : on regarde le USER avant de tirer. Toi, tu as tiré. »";
	}
	var r = e ? state.nbCommandes % 3 : 0;
	return debut + [
		"« Le secret d'un bon tajine, c'est comme un bon serveur : on le laisse tourner, on ne soulève pas le couvercle toutes\n" +
		"les deux minutes. Ah, et celui qui tourne dans ps, PID " + PID_TAJINE + ", c'est le mien. Touche pas. »",
		"« Gabriel dit que je prends 40 % du processeur avec mon tajine. Moi je dis que c'est le seul processus utile de la\n" +
		"Forteresse. Si tu veux voir qui consomme, top classe tout le monde par %CPU. Le premier, c'est moi, et j'ai le droit. »",
		"« L'an prochain, je fais l'épreuve finale à Marrakech. La Forteresse au milieu de la palmeraie, le Mage en djellaba,\n" +
		"et un tajine par sceau brisé. Tu viendras ? »"][r];
});

var StatueLaurana = new Item("Laurana", "", "item_laurana.gif").personnage();
Object.defineProperty(StatueLaurana.cmd_text, "less", { get: function(){
	var libre = typeof state !== "undefined" && state && state.examen && state.examen.sceaux && state.examen.sceaux[4];
	if (libre) return communiqueDeLaurana();
	return "Une statue de pierre au milieu de la Tour des Proclamations : une jeune femme aux cheveux de flamme figés dans le vent,\n" +
		"une trompette d'argent à la main. Sur le socle : LAURANA LA FLAMBOYANTE, HÉRAUT DE CYBERSUP.\n\n" +
		"On raconte qu'elle est née dans les forges de la Tour Noire et qu'elle fut l'apprentie de Myriam, qui lui apprit à faire porter\n" +
		"sa voix jusqu'aux sept campus. Un jour, elle a choisi le Mage Rouxblanc : depuis, c'est elle qui proclame les diplômes sur la\n" +
		"grande place. Myriam ne le lui a jamais pardonné. Cette nuit, elle l'a changée en pierre et a placardé sa propre proclamation.";
}, set: function(){}, enumerable: true, configurable: true });
TourProclamations.addItem(StatueLaurana);

/* Libérée, Laurana fait ce qu'elle sait faire : communiquer. Elle donne le communiqué de la Forteresse (ce qui reste, et où),
   et, à la fin, elle porte ton diplôme et son code jusqu'au formateur. */
var LIEUX_DES_EPREUVES = {
	ordre: "tes quartiers", assaillant: "les journaux, /var/log", rempart: "ton arsenal", fragment: "les archives, sous /srv",
	oracle: "la configuration, /etc", mairie: "la Mairie, /etc/dhcp", telnet: "les services (systemctl)", nginx: "les services (systemctl)",
	gardien: "les gardiens, /opt/gardiens", signature: "le gardien ensorcelé", suid: "les programmes du système", oreille: "les ports et les processus",
	cle: "les quartiers de root", proclamation: "la Tour, /var/www, et les sauvegardes", sortilege: "les tâches planifiées des comptes (crontab)",
	uid0: "les comptes, /etc", droits: "le balcon de la Tour, /var/www/html", hosts: "le registre local des noms, /etc",
	journal: "ton historique", chronique: "les journaux, /var/log", frappes: "les journaux, /var/log", preuves: "ton rapport, ~/rapport",
	identite: "toi-même", disque: "la place prise sur le disque", piege: "/tmp", alias: "tes propres commandes", maitre: "ton environnement",
	balcon: "tes quartiers", passwd: "ton compte", ping: "le réseau", diff: "les sauvegardes, /srv", trompette: "les paquets (apt)", quiz: "le plateau, /dev/random"
};
function communiqueDeLaurana(){
	var e = state.examen;
	var reste = EPREUVES_EXAMEN.filter(function(ep){ return !e.reussies[ep.id]; });
	var lignes = ["Laurana la Flamboyante, libérée, la trompette d'argent à la main. Sa voix porte jusqu'aux sept campus.",
		"« Merci, recrue. Myriam m'a tout appris à la Tour Noire, sauf une chose : on ne fait pas taire un héraut.",
		"Je ne ferai pas ton travail, le Mage l'a interdit. Mais communiquer, c'est mon métier. Voici le communiqué de la Forteresse : »", ""];
	if (!reste.length) lignes.push("  « Tout est accompli. Il ne reste qu'à proclamer ton nom. »");
	reste.forEach(function(ep){
		lignes.push("  · " + completerDroite(CHIFFRES_ROMAINS[EPREUVES_EXAMEN.indexOf(ep)] + ".", 9) + ep.titre + C.gris("  (du côté de " + LIEUX_DES_EPREUVES[ep.id] + ")"));
	});
	lignes.push("", "« Et quand tu auras fini, ou rendu ta copie, je porterai ton diplôme et son code au formateur : je l'écrirai aussi dans",
		"~/rapport/diplome.txt, pour que tu n'aies qu'à le recopier. »");
	return lignes.join("\n");
}

/* /dev/random : le plateau de « Questions pour un Linux », présenté par Steve. */
var FortDev = lieuExamen(Forteresse, "dev", "Les périphériques de la Forteresse. Un néon clignote au fond : ON AIR.", { image: "loc_bin.gif" });
var PlateauQuiz = lieuExamen(FortDev, "random", "Le plateau de « Questions pour un Linux » : trois pupitres, des buzzers, des projecteurs. Ici, tout est tiré au hasard.", { image: "loc_plateau.gif" });
var SteveAnimateur = personnageExamen(PlateauQuiz, "Steve", "item_steve.gif", function(){ return texteDeSteve(); });

World.fige = true;

/* Les répliques coulent en paragraphes : c'est le terminal qui coupe les lignes selon sa largeur (ordinateur ou téléphone).
   Les lignes en retrait (listes, choix A B C D, sceaux) gardent leur place. */
function couler(texte){ return String(texte).replace(/([^\n])\n(?=[^\n ])/g, "$1 "); }
(function(){
	function parcourir(lieu){
		lieu.items.forEach(function(item){
			if (!item.person) return;
			var d = Object.getOwnPropertyDescriptor(item.cmd_text, "less");
			if (!d || !d.get) return;
			var origine = d.get;
			Object.defineProperty(item.cmd_text, "less", { get: function(){ return couler(origine.call(this)); }, set: function(){}, enumerable: true, configurable: true });
		});
		lieu.children.forEach(parcourir);
	}
	parcourir(Forteresse);
})();

/* La plage de la Mairie : null si elle est juste, sinon la plainte du serveur. */
function verdictDhcpExamen(){
	var texte = DhcpdExamen.getText();
	var s = /subnet\s+(\d+\.\d+\.\d+\.\d+)\s+netmask\s+(\d+\.\d+\.\d+\.\d+)/.exec(texte);
	if (!s || s[1] !== "10.0.97.0" || s[2] !== "255.255.255.192") return "No subnet declaration for eth0 (" + IP_FORTERESSE + ").";
	var r = /range\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s*;/.exec(texte);
	if (!r) return "/etc/dhcp/dhcpd.conf: no range statement in subnet 10.0.97.0/26";
	var reseau = "10.0.97.0/26";
	if (!dansReseau(r[1], reseau) || !dansReseau(r[2], reseau)) return "Address range " + r[1] + " to " + r[2] + " not on net 10.0.97.0/255.255.255.192!";
	var a = nombreIp(r[1]), b = nombreIp(r[2]), base = nombreIp("10.0.97.0");
	if (a > b) return "Address range " + r[1] + " to " + r[2] + " is backwards!";
	if (a === base || b === base + 63) return "Address range " + r[1] + " to " + r[2] + " includes the network or broadcast address of 10.0.97.0/26!";
	return null;
}

/* ------------------------------------------------------------------ */
/* Les trente-deux épreuves                                            */
/* ------------------------------------------------------------------ */

var EPREUVES_EXAMEN = [
	{ id: "ordre", sceau: 1, points: 1, titre: "Trouver l'ordre de mission caché",
	  fait: function(){ return !!state.examen.ordreLu; } },
	{ id: "assaillant", sceau: 1, points: 2, titre: "Nommer la Tour Noire de Myriam dans ~/rapport/assaillant.txt",
	  fait: function(){ var f = RapportExamen.getItemFromName("assaillant.txt"); return f !== -1 && f.getText().trim() === IP_ASSAILLANT_EXAMEN; } },
	{ id: "rempart", sceau: 1, points: 1, titre: "Armer le rempart du Mage, puis le lever (~/arsenal/rempart.sh)",
	  fait: function(){ return Arsenal.hasItem(Rempart) && Rempart.mode.charAt(2) === "x" && !!state.examen.rempartLeve; } },
	{ id: "fragment", sceau: 1, points: 1, titre: "Retrouver le fragment-du-sceau caché par Aidan",
	  fait: function(){ return RapportExamen.hasItem(FragmentDuSceau); } },
	{ id: "oracle", sceau: 2, points: 2, titre: "Rendre à la Forteresse le vrai Oracle des Noms",
	  fait: function(){ var t = ResolvExamen.getText(); return new RegExp("^\\s*nameserver\\s+" + IP_VRAI_ORACLE.replace(/\./g, "\\.") + "\\s*$", "m").test(t) && t.indexOf(IP_FAUX_ORACLE) === -1; } },
	{ id: "mairie", sceau: 2, points: 2, titre: "Corriger la plage de la Mairie (DHCP) et la rouvrir",
	  fait: function(){ return verdictDhcpExamen() === null && servicePanne("forteresse", "isc-dhcp-server").actif; } },
	{ id: "telnet", sceau: 2, points: 1, titre: "Fermer pour de bon le guichet bavard de David (telnet)",
	  fait: function(){ var s = servicePanne("forteresse", "telnet"); return !s.actif && !s.auto; } },
	{ id: "nginx", sceau: 2, points: 1, titre: "Réveiller la Bibliothèque endormie par David (nginx)",
	  fait: function(){ var s = servicePanne("forteresse", "nginx"); return s.actif && s.auto; } },
	{ id: "gardien", sceau: 3, points: 2, titre: "Mettre le gardien ensorcelé en /quarantaine, intact",
	  fait: function(){ return Quarantaine.hasItem(GardienTrafique) && !Gardiens.hasItem(GardienTrafique); } },
	{ id: "signature", sceau: 3, points: 1, titre: "Inscrire la signature de Myriam dans ~/rapport/signature.txt",
	  fait: function(){ var f = RapportExamen.getItemFromName("signature.txt"); return f !== -1 && f.getText().trim().toUpperCase() === MOT_DE_MYRIAM; } },
	{ id: "suid", sceau: 3, points: 2, titre: "Désarmer la porte dérobée SUID de Myriam",
	  fait: function(){ return !FortUsrLocalLib.hasItem(PasseMuraille) || PasseMuraille.mode.charAt(2) !== "s"; } },
	{ id: "oreille", sceau: 3, points: 2, titre: "Faire tomber Dylan le Saltimbanque (le port qui écoute)",
	  fait: function(){ return !Forteresse.procs.some(function(p){ return p.pid === PID_OREILLE; }); } },
	{ id: "cle", sceau: 3, points: 2, titre: "Retirer la clé de Myriam chez root, et seulement elle",
	  fait: function(){ var t = AuthorizedKeysExamen.getText(); return t.indexOf("myriam@tour-noire") === -1 && t.indexOf(CLE_LAURENT_EXAMEN) > -1 && t.indexOf(CLE_ADMIN_EXAMEN) > -1; } },
	{ id: "proclamation", sceau: 4, points: 2, titre: "Restaurer la proclamation de Laurana depuis la sauvegarde",
	  fait: function(){ var f = proclamationAffichee(); return f !== null && f.getText().trim() === PROCLAMATION_LAURANA.trim(); } },
	{ id: "sortilege", sceau: 4, points: 2, titre: "Briser le sortilège qui revient chaque minute (cron)",
	  fait: function(){ return !sortilegeActif(); } },
	{ id: "uid0", sceau: 4, points: 2, titre: "Retirer à Myriam son compte aux pouvoirs de root (UID 0)",
	  fait: function(){
		var lignes = PasswdExamen.getText().split("\n").filter(function(l){ return l.trim() !== ""; });
		var zero = lignes.filter(function(l){ return l.split(":")[2] === "0"; }).map(function(l){ return l.split(":")[0]; });
		return zero.length === 1 && zero[0] === "root" && lignes.some(function(l){ return l.split(":")[0] === JOUEUR; });
	  } },
	{ id: "droits", sceau: 4, points: 1, titre: "Rendre la proclamation lisible par toute la ville",
	  fait: function(){ var f = proclamationAffichee(); return f !== null && f.owner !== "myriam" && f.mode.charAt(6) === "r" && f.getText().trim() === PROCLAMATION_LAURANA.trim(); } },
	{ id: "hosts", sceau: 4, points: 1, titre: "Ne plus envoyer les passants de la Tour vers la Tour Noire",
	  fait: function(){ var t = HostsExamen.getText(); return t.indexOf(IP_ASSAILLANT_EXAMEN) === -1 && t.indexOf(IP_VRAI_ORACLE) > -1; } }
];
EPREUVES_EXAMEN.push(
	{ id: "journal", sceau: 5, points: 1, titre: "Tenir le journal de bord (~/rapport/journal.txt, daté)",
	  fait: function(){ var t = texteRapport("journal.txt"); return t !== null && t.split("\n").filter(function(l){ return /^\s*\d+\s+\S/.test(l); }).length >= 5 && /\d\d:\d\d:\d\d/.test(t) && /20\d\d/.test(t); } },
	{ id: "chronique", sceau: 5, points: 1, titre: "Dater la première et la dernière frappe de la Tour Noire",
	  fait: function(){ var t = texteRapport("chronique.txt"), h = heuresDesFrappes(); return t !== null && t.indexOf(h.premiere) > -1 && t.indexOf(h.derniere) > -1; } },
	{ id: "frappes", sceau: 5, points: 1, titre: "Compter les frappes de la Tour Noire (~/rapport/frappes.txt)",
	  fait: function(){ var t = texteRapport("frappes.txt"); return t !== null && new RegExp("(^|\\D)" + heuresDesFrappes().nombre + "(\\D|$)").test(t); } },
	{ id: "preuves", sceau: 5, points: 1, titre: "Monter le dossier des preuves, copie scellée du journal",
	  fait: function(){
		var d = RapportExamen.getChildFromName("preuves");
		if (d === -1) return false;
		var copie = d.getItemFromName("auth.log");
		return copie !== -1 && copie !== AuthLogExamen && copie.getText() === AuthLogExamen.getText() && d.getItemFromName("SCELLE") !== -1 && FortLog.hasItem(AuthLogExamen);
	  } },
	{ id: "identite", sceau: 5, points: 1, titre: "Décliner ton identité au registre (~/rapport/identite.txt)",
	  fait: function(){ var t = texteRapport("identite.txt"); return t !== null && t.indexOf(JOUEUR) > -1 && t.indexOf("1000") > -1 && t.indexOf("forteresse") > -1; } },
	{ id: "disque", sceau: 5, points: 1, titre: "Trouver ce qui pèse le plus sous /var (~/rapport/disque.txt)",
	  fait: function(){ var t = texteRapport("disque.txt"); return t !== null && /\blog\b/.test(t); } },
	{ id: "piege", sceau: 5, points: 1, titre: "Supprimer le dossier piège de Myriam dans /tmp",
	  fait: function(){ return !FortTmp.children.some(function(c){ return c.room_name === "piege"; }); } },
	{ id: "alias", sceau: 5, points: 1, titre: "Démasquer la commande qui ment, et te forger l'alias carte",
	  fait: function(){ var a = state.alias || {}; return !a.ps && !!a.carte && a.carte.indexOf("tree") > -1; } },
	{ id: "maitre", sceau: 5, points: 1, titre: "Rendre au Mage sa place dans ton environnement (MAITRE)",
	  fait: function(){ return String((state.env && state.env.MAITRE) || "").toLowerCase() === "rouxblanc"; } },
	{ id: "balcon", sceau: 5, points: 1, titre: "Tracer dans tes quartiers un raccourci vers le balcon de la Tour",
	  fait: function(){ return QuartiersRecrue.items.some(function(i){ return i.lien && i.lien === FortHtml.path(); }); } },
	{ id: "passwd", sceau: 5, points: 1, titre: "Changer ton mot de passe, crié par David au guichet",
	  fait: function(){ return !!state.examen.passwdChange; } },
	{ id: "ping", sceau: 5, points: 1, titre: "Vérifier que le vrai Oracle répond (ping)",
	  fait: function(){ return !!state.examen.oraclePing; } },
	{ id: "diff", sceau: 5, points: 1, titre: "Trouver le compte ajouté cette nuit (diff, ~/rapport/ajout.txt)",
	  fait: function(){ var t = texteRapport("ajout.txt"); return t !== null && t.indexOf("myriam:x:0:0") > -1; } },
	{ id: "trompette", sceau: 5, points: 1, titre: "Rendre sa trompette à Laurana (apt), et la faire sonner : Oyez",
	  fait: function(){ return !!(state.paquets && state.paquets.cowsay) && !!state.examen.trompette; } }
);
/* « Questions pour un Linux » : cinquante questions sur les trois chapitres. Steve en tire trois au hasard pour chaque recrue.
   b : l'indice de la bonne réponse dans c (avant mélange). */
var QUESTIONS_POUR_UN_LINUX = [
	{ ch: 1, q: "Quelle commande affiche le lieu (le dossier) où tu te trouves ?", c: ["pwd", "cd", "ls", "whoami"], b: 0, e: "pwd : print working directory." },
	{ ch: 1, q: "Que montre ls -a de plus que ls ?", c: ["Les fichiers cachés, dont le nom commence par un point", "Les droits de chaque fichier", "La taille des fichiers", "Les fichiers supprimés"], b: 0, e: "-a comme all : même les noms qui commencent par un point." },
	{ ch: 1, q: "Comment rendre un script exécutable ?", c: ["chmod +x script.sh", "chown +x script.sh", "exec script.sh", "sudo script.sh"], b: 0, e: "Le droit x (exécution) se donne avec chmod." },
	{ ch: 1, q: "Les droits rwxr-xr-x s'écrivent en chiffres :", c: ["755", "644", "777", "700"], b: 0, e: "rwx = 4+2+1 = 7, r-x = 4+1 = 5." },
	{ ch: 1, q: "Quelle commande déplace (ou renomme) un fichier ?", c: ["mv", "cp", "ln", "rm"], b: 0, e: "mv déplace ; cp copie et laisse l'original en place." },
	{ ch: 1, q: "Que fait echo bonjour > note.txt ?", c: ["Écrit bonjour dans note.txt, en écrasant son contenu", "Ajoute bonjour à la fin de note.txt", "Lit note.txt", "Affiche bonjour à l'écran seulement"], b: 0, e: "> écrase, >> ajoute à la fin." },
	{ ch: 1, q: "Que fait >> dans une commande ?", c: ["Ajoute la sortie à la fin d'un fichier", "Écrase le fichier", "Envoie la sortie à la commande suivante", "Lit un fichier"], b: 0, e: ">> ajoute sans effacer ce qui était déjà là." },
	{ ch: 1, q: "À quoi sert grep ?", c: ["Garder les lignes qui contiennent un motif", "Trier des lignes", "Compter des lignes", "Couper des colonnes"], b: 0, e: "grep filtre ; sort trie ; wc compte ; cut coupe." },
	{ ch: 1, q: "Que compte wc -l ?", c: ["Les lignes", "Les mots", "Les caractères", "Les fichiers"], b: 0, e: "-l comme lines." },
	{ ch: 1, q: "Dans sort | uniq -c, que fait uniq -c ?", c: ["Compte combien de fois chaque ligne revient", "Supprime les fichiers en double", "Trie à l'envers", "Numérote toutes les lignes"], b: 0, e: "uniq -c regroupe les lignes identiques qui se suivent, d'où le sort avant." },
	{ ch: 1, q: "Que fait kill -9 PID ?", c: ["Arrête le processus sans qu'il puisse refuser", "Lui demande poliment de s'arrêter", "Le met en pause", "Le redémarre"], b: 0, e: "9 = KILL, il ne s'ignore pas. Le signal par défaut, 15 (TERM), peut l'être." },
	{ ch: 1, q: "À quoi sert ps ?", c: ["Lister les processus qui tournent", "Changer un mot de passe", "Afficher l'espace disque", "Lister les ports ouverts"], b: 0, e: "ps : process status." },
	{ ch: 1, q: "Qu'est-ce qu'un PID ?", c: ["Le numéro d'un processus", "Le numéro d'un utilisateur", "Le numéro d'un port", "Une adresse IP"], b: 0, e: "Process IDentifier. Le numéro d'utilisateur, c'est l'UID." },
	{ ch: 1, q: "À quoi sert sudo ?", c: ["Lancer une commande avec les droits de root", "Changer d'ordinateur", "Installer Linux", "Supprimer le compte root"], b: 0, e: "sudo : faire une commande en tant que superutilisateur, le temps d'une ligne." },
	{ ch: 1, q: "Que montre crontab -l ?", c: ["Les tâches planifiées", "Les fichiers récents", "Les connexions en cours", "Les paquets installés"], b: 0, e: "La crontab relance des commandes à heure fixe." },
	{ ch: 1, q: "Que crée ln -s CIBLE NOM ?", c: ["Un raccourci (lien symbolique) vers la cible", "Une copie de la cible", "Une archive", "Un nouveau dossier vide"], b: 0, e: "Le lien pointe vers la cible ; il ne la copie pas." },
	{ ch: 1, q: "Que fait tar -xf archive.tar ?", c: ["Extrait le contenu de l'archive", "Crée l'archive", "Liste son contenu sans extraire", "La supprime"], b: 0, e: "-x extrait, -c crée, -t liste, -f nomme l'archive." },
	{ ch: 1, q: "Que fait find / -name rapport.txt ?", c: ["Cherche rapport.txt dans toute l'arborescence", "Cherche le mot rapport dans les fichiers", "Renomme rapport.txt", "Supprime rapport.txt"], b: 0, e: "find cherche des fichiers par leur nom ; grep cherche dans leur contenu." },
	{ ch: 1, q: "Que change chown ?", c: ["Le propriétaire d'un fichier", "Les droits d'un fichier", "Le nom d'un fichier", "La date d'un fichier"], b: 0, e: "chown : change owner. Les droits, c'est chmod." },
	{ ch: 1, q: "Que fait alias ll='ls -l' ?", c: ["Crée un raccourci de commande : ll lancera ls -l", "Crée une variable ll", "Crée un fichier ll", "Lance un processus ll"], b: 0, e: "unalias ll le retire." },
	{ ch: 1, q: "Que fait export MAITRE=Mage ?", c: ["Définit une variable d'environnement", "Exporte un fichier vers une clé USB", "Imprime Mage", "Envoie Mage au serveur"], b: 0, e: "env liste toutes les variables ; echo $MAITRE en affiche une." },
	{ ch: 1, q: "Que montre head -n 3 journal.log ?", c: ["Les 3 premières lignes", "Les 3 dernières lignes", "La ligne 3 seulement", "3 fichiers de journaux"], b: 0, e: "head le début, tail la fin." },
	{ ch: 1, q: "Quelle commande mesure ce que pèse un dossier ?", c: ["du", "df", "ps", "wc"], b: 0, e: "du : disk usage d'un dossier ; df : la place libre sur tout le disque." },
	{ ch: 1, q: "Que supprime rmdir ?", c: ["Un dossier vide", "Un dossier et tout son contenu", "Un fichier", "Un utilisateur"], b: 0, e: "rmdir refuse un dossier plein, par prudence." },
	{ ch: 2, q: "Dans 10.0.93.20/24, quelle est l'adresse du réseau (la rue) ?", c: ["10.0.93.0", "10.0.93.255", "10.0.0.0", "10.0.93.1"], b: 0, e: "Un /24 garde les trois premiers nombres pour la rue ; le panneau est en .0." },
	{ ch: 2, q: "Quelle est l'adresse de diffusion (le crieur) de 10.0.93.0/24 ?", c: ["10.0.93.255", "10.0.93.0", "10.0.93.254", "255.255.255.0"], b: 0, e: "Le crieur habite au dernier numéro de la rue." },
	{ ch: 2, q: "Combien de machines peut-on loger dans un /26 ?", c: ["62", "64", "30", "126"], b: 0, e: "32 - 26 = 6 bits : 64 adresses, moins le réseau et la diffusion." },
	{ ch: 2, q: "Quel est le masque d'un /24 ?", c: ["255.255.255.0", "255.255.0.0", "255.255.255.255", "255.0.0.0"], b: 0, e: "24 bits à 1 : trois fois 255, puis 0." },
	{ ch: 2, q: "À quoi sert la passerelle (le Bureau de Poste) ?", c: ["À envoyer les paquets vers les autres réseaux", "À traduire les noms en adresses", "À distribuer les adresses", "À chiffrer les messages"], b: 0, e: "Même rue : on frappe chez le voisin. Autre rue : on passe par la passerelle." },
	{ ch: 2, q: "Que fait le DNS (l'Oracle des Noms) ?", c: ["Il traduit un nom en adresse IP", "Il distribue les adresses IP", "Il chiffre les connexions", "Il relie les câbles"], b: 0, e: "Comme un annuaire : un nom, une adresse." },
	{ ch: 2, q: "Que fait le DHCP (la Mairie) ?", c: ["Il attribue automatiquement une adresse aux machines", "Il traduit les noms en adresses", "Il bloque les ports", "Il garde les journaux"], b: 0, e: "La Mairie donne un numéro de maison à chaque nouvel arrivant." },
	{ ch: 2, q: "Dans quel fichier Linux note-t-il le serveur DNS à interroger ?", c: ["/etc/resolv.conf", "/etc/hosts", "/etc/passwd", "/etc/hostname"], b: 0, e: "La ligne nameserver de /etc/resolv.conf." },
	{ ch: 2, q: "À quoi sert /etc/hosts ?", c: ["À associer des noms à des adresses, sur la machine elle-même", "À lister les utilisateurs", "À ranger les clés SSH", "À démarrer les services"], b: 0, e: "Le registre local des noms : il passe avant le DNS." },
	{ ch: 2, q: "À quoi sert ping ?", c: ["À vérifier qu'une machine répond", "À télécharger un fichier", "À changer d'adresse IP", "À chiffrer une connexion"], b: 0, e: "Un accusé de réception : la machine répond, ou pas." },
	{ ch: 2, q: "Que montre ip a ?", c: ["Les interfaces réseau et leurs adresses", "La route par défaut", "Les processus", "Le serveur DNS"], b: 0, e: "ip a pour les adresses, ip r pour les routes." },
	{ ch: 2, q: "Quelle commande montre la route par défaut (default via) ?", c: ["ip r", "ip a", "ping", "dig"], b: 0, e: "ip r : la table de routage, dont la passerelle par défaut." },
	{ ch: 2, q: "Que montre traceroute ?", c: ["Le chemin, routeur par routeur, jusqu'à une machine", "Seulement le temps total", "Le nom de la machine", "Les ports ouverts"], b: 0, e: "Le suivi du colis, étape par étape." },
	{ ch: 2, q: "Combien de couches (d'étages) compte le modèle OSI ?", c: ["7", "4", "5", "9"], b: 0, e: "De la couche physique (1) à l'application (7)." },
	{ ch: 2, q: "Qui interroge dig cybersup.lan ?", c: ["Le serveur DNS", "Le serveur DHCP", "Le pare-feu", "Le serveur web"], b: 0, e: "dig pose la question à l'Oracle des Noms." },
	{ ch: 2, q: "Pour joindre une machine d'un autre réseau, ta machine passe par :", c: ["La passerelle", "Le DNS", "L'adresse de diffusion", "Le DHCP"], b: 0, e: "La passerelle est la seule porte vers les autres rues." },
	{ ch: 3, q: "À quoi sert sha256sum ?", c: ["À calculer une empreinte pour vérifier qu'un fichier n'a pas changé", "À chiffrer un fichier", "À compresser un fichier", "À signer un courriel"], b: 0, e: "Un octet change, et l'empreinte change entièrement." },
	{ ch: 3, q: "base64, c'est :", c: ["Un encodage : tout le monde peut le décoder", "Un chiffrement fort", "Une compression", "Une empreinte"], b: 0, e: "base64 -d le décode, sans clé. Ce n'est pas un secret." },
	{ ch: 3, q: "Que signifie le s dans rwsr-xr-x (le bit SUID) ?", c: ["Le programme s'exécute avec les droits de son propriétaire", "Le fichier est caché", "Le fichier est supprimé au redémarrage", "Le fichier est en lecture seule"], b: 0, e: "Un SUID root qui n'a rien à faire là, c'est une porte dérobée." },
	{ ch: 3, q: "Que montre ss -tlnp ?", c: ["Les ports en écoute et le processus derrière chacun", "Les processus qui consomment le plus", "Seulement les connexions SSH", "Les règles du pare-feu"], b: 0, e: "t : TCP, l : en écoute, n : numéros, p : processus." },
	{ ch: 3, q: "Que contient ~/.ssh/authorized_keys ?", c: ["Les clés publiques autorisées à se connecter", "Les clés privées", "Les mots de passe", "Les journaux de connexion"], b: 0, e: "Une ligne par clé ; une clé de trop, c'est une porte ouverte." },
	{ ch: 3, q: "Que fait-on de sa clé privée SSH ?", c: ["On ne la partage jamais", "On la copie sur le serveur", "On l'envoie au RSSI par courriel", "On la publie sur le site de l'école"], b: 0, e: "La clé publique se distribue ; la privée reste chez soi." },
	{ ch: 3, q: "Où Linux note-t-il les tentatives de connexion SSH ratées ?", c: ["/var/log/auth.log", "/etc/passwd", "/var/www", "/tmp"], b: 0, e: "Failed password for... : les journaux d'authentification." },
	{ ch: 3, q: "Pourquoi telnet est-il dangereux ?", c: ["Tout y passe en clair, mots de passe compris", "Il est trop lent", "Il ne marche qu'en local", "Il est payant"], b: 0, e: "SSH fait la même chose, mais chiffré." },
	{ ch: 3, q: "Un fichier suspect sert de preuve. Que fait-on ?", c: ["On le met en quarantaine, sans le modifier", "On le supprime tout de suite", "On l'exécute pour voir", "On le renomme en .txt"], b: 0, e: "Une preuve se déplace, elle ne se détruit pas." },
	{ ch: 3, q: "Que fait journalctl -u nginx ?", c: ["Affiche le journal du service nginx", "Redémarre nginx", "Désactive nginx", "Liste les ports de nginx"], b: 0, e: "-u comme unit : le journal d'un service." }
];

EPREUVES_EXAMEN.push({ id: "quiz", sceau: 6, points: 3, titre: "Questions pour un Linux : trois questions de Steve (/dev/random)",
	fait: function(){ var z = state.examen.quiz; return !!z && z.reponses.length === z.ids.length; },
	score: function(){ var z = state.examen.quiz; return z ? z.reponses.filter(function(r){ return r.juste; }).length : 0; } });

var LETTRES_QUIZ = ["A", "B", "C", "D"];
/* Steve fait des jeux de mots. Et des blagues. Pas drôles. Il le sait, et il continue. */
var BLAGUES_DE_STEVE = [
	"Tu connais la blague du chmod ? Non ? Normal : elle n'est pas exécutable.",
	"Pourquoi le DNS est-il toujours zen ? Parce qu'il résout tout. ... Résout. Résoudre. Les noms. Bon.",
	"Je voulais te faire une blague sur UDP, mais je ne suis pas sûr que tu l'aurais reçue.",
	"Mon chat s'appelle Grep. Il trouve tout ce qu'il cherche. Sauf ses croquettes.",
	"Quel est le légume préféré d'un administrateur ? L'échalote. Le shell-ot. ... Le public applaudit. Enfin, Aidan.",
	"Pourquoi les fichiers cachés sont-ils timides ? Parce qu'ils ont un point devant le nez !",
	"Mon mot de passe, c'est « incorrect ». Comme ça, quand je l'oublie, l'ordinateur me le rappelle.",
	"Le sudo, c'est comme la harissa de Timour : on en met partout, et après on pleure.",
	"Ma femme m'a dit : tu passes trop de temps dans le terminal. Alors j'ai fait cd .. et je suis sorti.",
	"Comment on arrête Steve ? kill -9. Et encore, je reviens au prochain démarrage : je suis dans la crontab.",
	"Un paquet TCP entre dans une taverne : « Je voudrais une bière. » « Vous voulez une bière ? » « Oui, je veux une bière. »",
	"Le tajine de Timour, c'est un démon : il tourne en arrière-plan et personne n'ose le tuer."
];
var BRAVO_DE_STEVE = ["TOP ! Tu es root de l'ambiance !", "TOP ! Je suis grep-té d'admiration !", "TOP ! Tu mérites un sudo d'honneur !",
	"TOP ! Ta réponse a un bit... euh, un but : gagner !", "TOP ! Même Dylan n'aurait pas esquivé celle-là !"];
var RATE_DE_STEVE = ["Aïe ! Erreur 404 : bonne réponse introuvable.", "Raté ! Mais ne fais pas un kill -9 sur ton moral.",
	"Oh non ! Ce n'était pas la bonne. Allez, on tape exit sur la déception.", "Perdu ! Comme un paquet UDP : envoyé, jamais reçu."];
function blagueDeSteve(n){ return BLAGUES_DE_STEVE[Math.abs(n) % BLAGUES_DE_STEVE.length]; }
function melanger(liste){
	var t = liste.slice();
	for (var i = t.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)); var x = t[i]; t[i] = t[j]; t[j] = x; }
	return t;
}
/* Trois questions tirées au hasard parmi les cinquante, une par chapitre si possible, et leurs réponses mélangées. */
function tirerQuiz(){
	var parChapitre = [1, 2, 3].map(function(ch){ return melanger(QUESTIONS_POUR_UN_LINUX.map(function(x, i){ return i; }).filter(function(i){ return QUESTIONS_POUR_UN_LINUX[i].ch === ch; }))[0]; });
	return { ids: melanger(parChapitre), ordres: parChapitre.map(function(){ return melanger([0, 1, 2, 3]); }), reponses: [] };
}
function questionDuQuiz(z, k){
	var Q = QUESTIONS_POUR_UN_LINUX[z.ids[k]];
	var ordre = z.ordres[z.ids.indexOf(z.ids[k])] || [0, 1, 2, 3];
	return { q: Q, ordre: ordre, bonne: LETTRES_QUIZ[ordre.indexOf(Q.b)] };
}
function texteDeSteve(){
	var e = typeof state !== "undefined" && state ? state.examen : null;
	var debut = "Steve, costume à paillettes et micro doré, sous les projecteurs de /dev/random.\n\n" +
		"« Bonsoir, bonsoir ! Bienvenue dans QUESTIONS POUR UN LINUX ! Trois questions, tirées au hasard parmi cinquante,\n" +
		"sur tout ce que tu as vu : le terminal, le réseau, la Crypte. Chaque bonne réponse vaut un point dans ta note.\n" +
		"Une seule réponse par question, pas de joker, pas d'indice : Steve ne souffle jamais. »\n\n" +
		C.gris("« Et pour détendre l'atmosphère : " + blagueDeSteve(e && e.quiz ? e.quiz.reponses.length * 5 + (state.nbCommandes % 3) : state.nbCommandes) + " »") + "\n\n";
	if (!e) return debut + "« Le plateau ouvre pendant l'épreuve finale. »";
	if (!e.quiz){ e.quiz = tirerQuiz(); }
	var z = e.quiz, k = z.reponses.length;
	if (k >= z.ids.length){
		var justes = z.reponses.filter(function(r){ return r.juste; }).length;
		return debut + "« C'est terminé ! " + justes + " bonne" + (justes > 1 ? "s" : "") + " réponse" + (justes > 1 ? "s" : "") + " sur " + z.ids.length + ". " +
			(justes === 3 ? "Un sans-faute, le public est debout ! Enfin, Aidan est debout. Il est tout seul, mais il est debout." :
			(justes === 2 ? "Très joli parcours ! Deux sur trois, c'est comme un /26 : pas tout, mais pas rien." :
			(justes === 1 ? "On s'accroche, on s'accroche ! Un point, c'est déjà un point. Comme dans une adresse IP." :
			"Zéro ! Mais zéro, c'est l'UID de root. Tu vois, tu es quand même au sommet."))) + " »";
	}
	var qq = questionDuQuiz(z, k);
	return debut + C.gras("QUESTION " + (k + 1) + " SUR " + z.ids.length) + C.gris("  (chapitre " + qq.q.ch + ")") + "\n\n" + C.gras(qq.q.q) + "\n\n" +
		qq.ordre.map(function(i, n){ return "  " + LETTRES_QUIZ[n] + ".  " + qq.q.c[i]; }).join("\n") +
		"\n\n« Ta réponse, ici sur le plateau : echo A, echo B, echo C ou echo D. »";
}
GameEvents.addListener("echo", function(ev){
	if (!examenEnCours() || ev.room !== PlateauQuiz || state.examen.fini) return;
	var dit = String(ev.text || "").trim().toUpperCase();
	if (LETTRES_QUIZ.indexOf(dit) === -1) return;
	var e = state.examen;
	if (!e.quiz){ say("Steve : « Doucement ! Je n'ai pas encore posé la question. Viens me voir : cat Steve. »"); return; }
	var z = e.quiz, k = z.reponses.length;
	if (k >= z.ids.length){ say("Steve : « Le jeu est fini, champion. Les buzzers sont éteints. »"); return; }
	var qq = questionDuQuiz(z, k), juste = dit === qq.bonne;
	z.reponses.push({ lettre: dit, juste: juste });
	var n = state.nbCommandes;
	say((juste ? C.vert("Steve : « " + BRAVO_DE_STEVE[n % BRAVO_DE_STEVE.length] + " " + dit + ", c'est la bonne réponse ! »") :
		C.rouge("Steve : « " + RATE_DE_STEVE[n % RATE_DE_STEVE.length] + " La bonne réponse était " + qq.bonne + " : " + qq.q.c[qq.q.b] + ". »")) +
		C.gris("  " + qq.q.e) + "\n" + (z.reponses.length < z.ids.length ? "(Question suivante : cat Steve.)" : "(C'est fini : cat Steve pour le score.)"));
});

function texteRapport(nom){ var f = RapportExamen.getItemFromName(nom); return f === -1 ? null : f.getText(); }
function heuresDesFrappes(){
	var lignes = AuthLogExamen.getText().split("\n").filter(function(l){ return l.indexOf(IP_ASSAILLANT_EXAMEN) > -1; });
	return { premiere: lignes[0].split(" ")[0], derniere: lignes[lignes.length - 1].split(" ")[0], nombre: lignes.length };
}
function proclamationAffichee(){ var f = FortHtml.getItemFromName("index.html"); return f === -1 ? null : f; }
function sortilegeActif(){
	return ((state.cron && state.cron.myriam) || []).some(function(l){ return l.indexOf("/var/www/html/index.html") > -1; });
}
var NOMS_DES_SCEAUX = { 1: "LE SCEAU DU TERMINAL", 2: "LE SCEAU DES LETTRES", 3: "LE SCEAU DE LA CRYPTE", 4: "LE SCEAU DU HÉRAUT", 5: "LE SCEAU DU REGISTRE", 6: "LE SCEAU DU PLATEAU" };
var CHIFFRES_ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII",
	"XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII"];
var POINTS_MAX_EXAMEN = EPREUVES_EXAMEN.reduce(function(t, e){ return t + e.points; }, 0);

/* Le barème : la note de base vient des épreuves (sur 20, au demi-point), puis un bonus si tout est fini tôt,
   et un petit malus au-delà de 30 fausses manœuvres (une ligne qui échoue). La note reste entre 0 et 20. */
var BONUS_DEUX_POINTS = 135, BONUS_UN_POINT = 160;   // en minutes : 2 h 15 et 2 h 40, pour une épreuve de 3 h
var ERREURS_GRATUITES_EXAMEN = 30, ERREURS_PAR_DEMI_POINT = 15, MALUS_MAX_EXAMEN = 2;
function noteDeBaseExamen(){ return Math.round(pointsExamen() / POINTS_MAX_EXAMEN * 20 * 2) / 2; }
function bonusTempsExamen(){
	var e = state.examen;
	if (!e || e.fin !== "victoire") return 0;
	var m = minutesExamen();
	return m <= BONUS_DEUX_POINTS ? 2 : (m <= BONUS_UN_POINT ? 1 : 0);
}
function malusErreursExamen(){
	var n = (state.examen && state.examen.erreurs) || 0;
	return Math.min(MALUS_MAX_EXAMEN, Math.floor(Math.max(0, n - ERREURS_GRATUITES_EXAMEN) / ERREURS_PAR_DEMI_POINT) * 0.5);
}
var INDICES_MAX_EXAMEN = 5;
function nbIndicesExamen(){ return Object.keys((state.examen && state.examen.indices) || {}).length; }
function malusIndicesExamen(){ return nbIndicesExamen() * 0.25; }
function noteExamen(){ return Math.max(0, Math.min(20, noteDeBaseExamen() + bonusTempsExamen() - malusErreursExamen() - malusIndicesExamen())); }
function ecrireNote(n){ return String(n).replace(".", ","); }

function pointsExamen(){
	return EPREUVES_EXAMEN.reduce(function(t, e){ return t + (state.examen.reussies[e.id] ? (e.score ? e.score() : e.points) : 0); }, 0);
}
function nbReussiesExamen(){
	return EPREUVES_EXAMEN.filter(function(e){ return state.examen.reussies[e.id]; }).length;
}
function minutesExamen(){
	var fin = state.examen.fini ? state.examen.tempsFin : state.tempsMs;
	return Math.max(0, Math.round((fin - state.examen.debut) / 60000));
}
function dureeExamen(minutes){ return minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60); }
function mentionExamen(note){
	if (note >= 16) return "Très bien";
	if (note >= 14) return "Bien";
	if (note >= 12) return "Assez bien";
	if (note >= 10) return "Admis";
	return "Ajourné";
}

function texteOrdreDeMission(){
	var lignes = [
		"ORDRE DE MISSION · SCELLÉ PAR LAURENT, LE MAGE ROUXBLANC",
		"",
		"Recrue,",
		"Tu te souviens du Sorcier Noir, à Terminus, le jour de ta rentrée ? C'était moi,",
		"et tu m'as battu. Depuis, j'ai rendu la robe noire : on m'appelle le Mage Rouxblanc,",
		"et je garde les diplômes de ceux qui, comme toi, ont traversé Terminus.",
		"",
		"Cette nuit, la sorcière Myriam, ma vieille rivale, a volé ma robe noire, pris la Forteresse",
		"et m'a fermé la porte au nez. Elle est venue avec sa troupe :",
		"Dylan le Saltimbanque, l'acrobate qui écoute aux portes et esquive les coups polis,",
		"et David, l'ogre des steppes, qui tient son guichet en criant tout, la bouche pleine.",
		"Laurana la Flamboyante, mon héraut aux cheveux de feu, a voulu lui barrer la route :",
		"Myriam, son ancienne maîtresse, l'a changée en pierre dans la Tour des Proclamations.",
		"",
		"Radia et Grace sont injoignables. Avec toi, il reste Aidan, l'elfe aux pieds de hobbit,",
		"enfermé dans tes quartiers : il te fera rire, il ne t'aidera pas. Et quelques fidèles, à qui",
		"tu peux parler (cat NOM) : Manon la Châtelaine (/), qui tient le registre et l'horloge ;",
		"Wissam le Sage (/home), qui donne ses conseils pour rien ; Jean-Baptiste, Maître des Adresses",
		"et fils de l'Oracle (/etc), qui n'aide que ceux qui répondent à sa colle ; Gabriel, Maître",
		"des Composants, et son assistant Cheb Timour (/opt/atelier), qui savent tout des processus.",
		"",
		"Libère Laurana : un héraut libre communique ce qui reste à faire.",
		"",
		"Myriam tient la Forteresse par six sceaux. Le cinquième est le registre de Manon, déchiré cette nuit : remplis-le. Le sixième t'attend dans /dev/random, sous les projecteurs de Steve. Brise-les dans l'ordre que tu veux.",
		"Chaque épreuve accomplie compte, même si tu ne vas pas au bout. Tu as trois heures.",
		""
	];
	var textes = {
		ordre: "Tu as trouvé cet ordre, caché dans tes quartiers : c'était la première épreuve.",
		assaillant: "Avant d'entrer, Myriam a frappé à la porte des dizaines de fois depuis sa\n        Tour Noire : les journaux s'en souviennent. Inscris l'adresse de la Tour, seule,\n        dans ~/rapport/assaillant.txt",
		rempart: "Je t'ai laissé une arme, ~/arsenal/rempart.sh. Elle refuse de servir : rends-la exécutable, puis lève le rempart en la lançant.",
		fragment: "Aidan a joué à cache-cache avec le fragment-du-sceau de mon bâton : il est\n        quelque part sous /srv. Retrouve-le et range-le dans ~/rapport.",
		oracle: "Myriam a ensorcelé la Forteresse : elle interroge un faux Oracle des Noms. Rends-lui le vrai :\n        son adresse est écrite dans le registre local des noms de la machine.",
		mairie: "Myriam a brouillé la plage de la Mairie (le service isc-dhcp-server) : ses adresses\n        sortent de la rue, et la Mairie refuse d'ouvrir. Corrige-la, puis rouvre-la.",
		telnet: "David tient le guichet bavard de la Forteresse et crie tout en clair, mots de passe\n        compris. Ferme ce guichet, et qu'il ne rouvre pas au prochain démarrage.",
		nginx: "David s'est assis sur la Bibliothèque (nginx) et l'a endormie : réveille-la,\n        maintenant et à chaque démarrage.",
		gardien: "Myriam a ensorcelé l'un des gardiens de /opt/gardiens. Démasque-le et mets-le\n        dans /quarantaine. Ne détruis aucune preuve.",
		signature: "Le traître porte un message caché. Déchiffre-le et inscris la signature\n        de Myriam, seule, dans ~/rapport/signature.txt",
		suid: "Myriam s'est percé une porte dérobée qui donne les pleins pouvoirs à qui la franchit.\n        Trouve-la et désarme-la.",
		oreille: "Dylan le Saltimbanque écoute la Forteresse pour Myriam, sur un port que personne\n        n'explique. Il esquive les coups polis : fais-le tomber.",
		cle: "Myriam a glissé sa clé parmi celles qui ouvrent la porte de root. Retire-la, et seulement elle.",
		proclamation: "Sur le balcon de la Tour (/var/www/html), Myriam a placardé sa proclamation à la place\n        de celle de Laurana. Laurana sauvegardait tout, chaque soir. Rends-lui sa proclamation.",
		sortilege: "Méfie-toi : ce que tu répares sur la Tour, un sortilège le défait à chaque minute.\n        Trouve ce qui revient tout seul, et brise-le.",
		uid0: "Myriam s'est fabriqué un compte qui a tous les pouvoirs de root. Retire-le,\n        sans toucher aux autres.",
		droits: "Sa proclamation rendue, Laurana doit être lue de toute la ville : qu'elle n'appartienne\n        plus à Myriam, et que tout le monde puisse la lire.",
		hosts: "Les passants qui demandent la Tour des Proclamations par son nom sont envoyés tout droit\n        à la Tour Noire. Répare le registre local des noms.",
		journal: "Manon veut ton journal de bord : la liste de tes commandes (history) dans ~/rapport/journal.txt, signée de la date du jour.",
		chronique: "Dans ~/rapport/chronique.txt, l'heure de la première et de la dernière ligne des journaux où paraît l'adresse de la Tour Noire.",
		frappes: "Combien de lignes des journaux portent l'adresse de la Tour Noire ? Le nombre, dans ~/rapport/frappes.txt.",
		preuves: "Crée ~/rapport/preuves, copies-y auth.log (une copie : l'original reste dans /var/log), et ajoute un fichier vide SCELLE.",
		identite: "Ton nom de compte, ton UID et le nom de la machine, dans ~/rapport/identite.txt.",
		disque: "Timour dit que la Forteresse déborde. Sous /var, quel dossier pèse le plus ? Son nom, dans ~/rapport/disque.txt.",
		piege: "Myriam a laissé un dossier vide à ton nom dans /tmp. Supprime-le, sans rien toucher d'autre.",
		alias: "L'une de tes commandes ment : Myriam l'a ensorcelée. Brise le sortilège, puis forge-toi un alias carte qui dessine la Forteresse.",
		maitre: "Dans ton environnement, une variable MAITRE nomme Myriam. Le maître des lieux est le Mage : MAITRE doit valoir Rouxblanc.",
		balcon: "Laurana aimerait te voir souvent : trace dans tes quartiers un raccourci vers le balcon de la Tour (/var/www/html).",
		passwd: "David a crié ton mot de passe au guichet : toute la Forteresse l'a entendu. Change-le.",
		ping: "Le vrai Oracle des Noms (10.0.92.53) est-il bien vivant ? Vérifie qu'il répond.",
		diff: "Manon garde deux sauvegardes du registre des comptes dans /srv/sauvegardes : celle d'hier et celle de cette nuit. Compare-les : la ligne ajoutée, dans ~/rapport/ajout.txt.",
		trompette: "Laurana a perdu sa trompette : installe le paquet cowsay, et fais-lui dire Oyez.",
		quiz: "Sur le plateau de /dev/random, Steve présente Questions pour un Linux : trois questions au hasard, un point par bonne réponse. Sans indice."
	};
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(e, i){
		if (e.sceau !== sceau){ sceau = e.sceau; lignes.push(NOMS_DES_SCEAUX[sceau]); }
		var coche = state.examen && state.examen.reussies[e.id] ? "[x]" : "[ ]";
		lignes.push("  " + coche + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 9) + textes[e.id].replace(/\n\s+/g, " ") + "  (" + e.points + " pt" + (e.points > 1 ? "s" : "") + ")");
	});
	lignes.push("",
		"LA CARTE : tree / dessine la Forteresse, ses lieux et ceux qui y vivent (tree -L 3 / pour descendre plus loin).",
		"Ton mot de passe sudo : " + MOT_DE_PASSE_SUDO + ". Pas de radio : man reste ton meilleur allié.",
		"LE BARÈME : la note vient des épreuves réussies. Tout fini en moins de " + dureeExamen(BONUS_DEUX_POINTS) + " : +2 ; en moins de " + dureeExamen(BONUS_UN_POINT) + " : +1.",
		"Les fausses manœuvres (une ligne qui échoue) : les " + ERREURS_GRATUITES_EXAMEN + " premières sont gratuites, puis -0,5 toutes les " + ERREURS_PAR_DEMI_POINT + " (au plus -" + MALUS_MAX_EXAMEN + ").",
		"indice : un coup de pouce sur une épreuve, -0,25 chacun, " + INDICES_MAX_EXAMEN + " au plus (indice 7 : sur l'épreuve VII).",
		"examen : où tu en es.   kamikaze : tout arrêter et rendre ta copie.",
		"",
		"Que tes commandes soient justes. Je t'attends de l'autre côté de la porte.",
		"                                   Laurent, le Mage Rouxblanc");
	// Le récit du Mage coule en paragraphes : c'est le terminal qui coupe les lignes, selon sa largeur.
	var texte = lignes.join("\n"), debut = texte.indexOf("Recrue,\n") + 8, fin = texte.indexOf(NOMS_DES_SCEAUX[1]);
	var recit = texte.substring(debut, fin).replace(/([^\n])\n(?=[^\n])/g, "$1 ");
	return texte.substring(0, debut) + recit + texte.substring(fin).replace("\n                                   Laurent, le Mage Rouxblanc", "\n                    Laurent, le Mage Rouxblanc");

}

/* ------------------------------------------------------------------ */
/* Le déroulé : entrer, suivre, finir                                   */
/* ------------------------------------------------------------------ */

var TEXTE_ENTREE_EXAMEN =
	"MISSION SPÉCIALE · L'ÉPREUVE FINALE\n\n" +
	"La nuit est tombée sur Cybersup. Dans la salle des serveurs, une seule machine clignote encore : la Forteresse,\n" +
	"où Laurent garde les diplômes de l'école. Oui, Laurent : le Sorcier Noir que tu as battu à Terminus, le jour de ta rentrée.\n" +
	"Il a rendu sa robe noire, on l'appelle désormais le Mage Rouxblanc. Cette nuit, la sorcière Myriam a volé la robe et pris la Forteresse.\n" +
	"Dylan le Saltimbanque fait des cabrioles sur les remparts, David l'ogre des steppes crie au guichet la bouche pleine,\n" +
	"Laurana la Flamboyante, le héraut aux cheveux de feu, est changée en pierre dans sa Tour des Proclamations,\n" +
	"et le Mage, enfermé dehors, n'a pu glisser qu'un ordre de mission sous ta porte. Tu as trois heures.\n\n" +
	"Tu as appris le terminal à Terminus, réparé le réseau avec Radia, traqué l'intrus avec Grace.\n" +
	"Cette fois, personne ne te guidera. Sauf, peut-être, Aidan, l'elfe aux pieds poilus enfermé avec toi. Mais non.\n" +
	"Ton ordre de mission est caché dans tes quartiers. Trouve-le.\n\n" +
	"Pour commencer, regarde la carte de la Forteresse : tree /";

TEXTE_ENTREE_EXAMEN = TEXTE_ENTREE_EXAMEN.replace(/([^\n])\n(?=[^\n])/g, "$1 ");

/* Ouvre une épreuve neuve : tous les sorts, la Forteresse, et le silence. */
function demarrerExamen(){
	state.examen = { debut: state.tempsMs || 0, reussies: {}, ordreLu: false, fini: false, fin: null, dateFin: null, tempsFin: null, commandesDebut: state.nbCommandes, lieu: null, erreurs: 0, indices: {}, defaites: {}, sceaux: {}, rencontres: {} };
	[SORTS_DE_DEPART, ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3].forEach(function(liste){
		(liste || []).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });
	});
	delete state.spells.cowsay; delete state.spells.sl;
	state.paquets = {};
	state.alias = state.alias || {};
	state.alias.ps = "echo Rien ne tourne ici. Circulez.";
	// Le piège de Myriam dans /tmp : un dossier vide, créé à ton nom (comme par mkdir, pour qu'on puisse le supprimer).
	if (!FortTmp.children.some(function(c){ return c.room_name === "piege"; })){
		var piege = new Room("piege", "Un dossier vide, créé à ton nom. Myriam aime laisser des pièges vides.", "loc_tmp.gif");
		piege.owner = JOUEUR;
		link_rooms(FortTmp, piege);
	}
	state.env.MAITRE = "Myriam";
	state.flags.tutoFini = true;
	if (!state.nom) state.nom = PROFIL.prenom || JOUEUR;
	state.env.HOME = "/home/" + JOUEUR;
	state.env.HOSTNAME = "forteresse";
	enterRoom(QuartiersRecrue);
	Shell.lieu_precedent = null;
	if (typeof montrerImage === "function") montrerImage("./static/img/item_myriam.gif", "Myriam, la sorcière");
	isolerExamen();
	state.cron = state.cron || {};
	state.cron.myriam = [TACHE_DE_MYRIAM];
	return TEXTE_ENTREE_EXAMEN;
}

/* Le texte du diplôme de l'épreuve finale. */
function signeEpreuve(e, id){ return e.reussies[id] ? "✓" : (e.defaites && e.defaites[id] ? "!" : "✗"); }
function texteDiplomeExamen(){
	var e = state.examen, minutes = minutesExamen();
	var lignes = [
		"========================================",
		"       CYBERSUP · DIPLÔME DE L'ÉPREUVE FINALE",
		"========================================",
		"",
		"  Décerné à : " + (state.nom || JOUEUR),
		"  " + (e.fin === "victoire" ? "qui a repris la Forteresse à la sorcière Myriam et rendu sa voix à Laurana." :
			"qui a affronté la sorcière Myriam dans la Forteresse, puis rendu sa copie (kamikaze)."),
		""
	];
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(ep, i){
		if (ep.sceau !== sceau){ sceau = ep.sceau; lignes.push("  " + NOMS_DES_SCEAUX[sceau]); }
		lignes.push("    " + signeEpreuve(e, ep.id) + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 9) + completerDroite((e.reussies[ep.id] ? (ep.score ? ep.score() : ep.points) : 0) + "/" + ep.points, 5) + ep.titre +
			(e.indices && e.indices[ep.id] ? "  (indice)" : ""));
	});
	lignes.push("    (✓ réussie, ✗ pas faite, ! réussie puis défaite)", "",
		"  ÉPREUVES RÉUSSIES   : " + nbReussiesExamen() + " sur " + EPREUVES_EXAMEN.length + "  (" + pointsExamen() + " points sur " + POINTS_MAX_EXAMEN + ")",
		"  Note des épreuves   : " + ecrireNote(noteDeBaseExamen()) + " / 20",
		"  Bonus de temps      : +" + ecrireNote(bonusTempsExamen()) + (e.fin === "victoire" ? "" : "  (seulement si tout est fini)"),
		"  Indices             : " + nbIndicesExamen() + "  (-" + ecrireNote(malusIndicesExamen()) + ")",
		"  Fausses manœuvres   : " + (e.erreurs || 0) + "  (-" + ecrireNote(malusErreursExamen()) + ")" + (e.tajineTue ? "  dont 5 pour le tajine de Timour" : ""),
		"  NOTE FINALE         : " + ecrireNote(noteExamen()) + " / 20",
		"  Mention             : " + mentionExamen(noteExamen()),
		"  Temps               : " + dureeExamen(minutes),
		"  Fin de l'épreuve    : " + (e.fin === "victoire" ? "Forteresse reprise" : "kamikaze"),
		"",
		"  Signé : Laurent, le Mage Rouxblanc, Directeur Pédagogique de Cybersup",
		"  Proclamé par : Laurana la Flamboyante, héraut de Cybersup",
		"========================================",
		"  Code de vérification, à remettre au formateur :",
		"  " + codeDiplomeExamen(),
		"========================================");
	return lignes.join("\n");
}

/* Le code de l'épreuve finale : tout ce qu'il faut au formateur, signé comme les autres diplômes. */
function masqueExamen(table){
	var m = 0;
	EPREUVES_EXAMEN.forEach(function(ep, i){ if (table && table[ep.id]) m += Math.pow(2, i); });
	return m.toString(16);
}
function codeDiplomeExamen(){
	var e = state.examen;
	var z = e.quiz, detailQuiz = z ? z.ids.map(function(id, k){ var r = z.reponses[k]; return id + (r ? (r.juste ? "+" : "-") + r.lettre : "."); }).join(",") : "";
	var charge = ["E3", String(state.nom || JOUEUR).replace(/\|/g, "/"), noteExamen() * 4, noteDeBaseExamen() * 4, bonusTempsExamen() * 4,
		malusErreursExamen() * 4, malusIndicesExamen() * 4, e.erreurs || 0, minutesExamen(),
		(e.commandesFin !== undefined ? e.commandesFin : state.nbCommandes) - (e.commandesDebut || 0),
		e.fin === "victoire" ? "V" : "K", masqueExamen(e.reussies), masqueExamen(e.defaites), masqueExamen(e.indices),
		e.dateFin || dateDuJour(), PROFIL.graine, e.tajineTue ? "T" : "-", detailQuiz].join("|");
	return versBase64Url(charge) + "." + sommeDeControle(charge + "|" + SEL_DIPLOME);
}
function lireCodeExamen(code){
	var morceaux = String(code).trim().split(".");
	if (morceaux.length !== 2) return null;
	var charge;
	try { charge = depuisBase64Url(morceaux[0]); } catch (x){ return null; }
	var c = charge.split("|");
	var q = c[0] === "E1" ? 2 : 4;
	if (!((c[0] === "E1" && c.length === 16) || (c[0] === "E2" && c.length === 17) || (c[0] === "E3" && c.length === 18))) return null;
	function bits(h){ var n = parseInt(h, 16) || 0; return EPREUVES_EXAMEN.map(function(ep, i){ return Math.floor(n / Math.pow(2, i)) % 2 === 1; }); }
	return { valide: sommeDeControle(charge + "|" + SEL_DIPLOME) === morceaux[1].toUpperCase(),
		prenom: c[1], note: +c[2] / q, base: +c[3] / q, bonus: +c[4] / q, malusErreurs: +c[5] / q, malusIndices: +c[6] / q, tajine: c[16] === "T",
		erreurs: +c[7], minutes: +c[8], commandes: +c[9], fin: c[10], reussies: bits(c[11]), defaites: bits(c[12]), indices: bits(c[13]),
		date: c[14], graine: +c[15],
		quiz: (c[17] || "").split(",").filter(function(x){ return x; }).map(function(x){ var m = /^(\d+)([+\-.])([A-D]?)$/.exec(x); return m ? { id: +m[1], etat: m[2], lettre: m[3] } : null; }).filter(function(x){ return x; }) };
}

function terminerExamen(fin){
	var e = state.examen;
	if (e.fini) return;
	e.fini = true;
	e.fin = fin;
	e.dateFin = dateDuJour();
	e.tempsFin = state.tempsMs;
	e.commandesFin = state.nbCommandes;
	// Laurana porte le diplôme : une copie dans ~/rapport, pour le recopier sans erreur.
	var texte = sansAnsi(texteDiplomeExamen()) + "\n";
	var copie = RapportExamen.getItemFromName("diplome.txt");
	if (copie === -1){
		copie = new Item("diplome.txt", texte, "item_grad.gif");
		copie.owner = JOUEUR;
		RapportExamen.addItem(copie);
	} else copie.setText(texte);
	state.save();
}

/* Après chaque ligne : les épreuves accomplies se cochent, et la fin arrive quand tout est fait. */
function verifierExamen(){
	var e = state.examen;
	if (!e) return;
	if (racineDe(current_room) === Forteresse) e.lieu = cheminForteresse(current_room);
	if (e.fini) return;
	// Le sortilège de Myriam : tant que sa ligne de cron vit, la proclamation de Laurana est recouverte à la « minute » suivante.
	var affichee = proclamationAffichee();
	if (sortilegeActif() && affichee && affichee.getText().trim() !== PROCLAMATION_MYRIAM.trim()){
		e.minuteSortilege = (e.minuteSortilege || 0) + 1;
		if (e.minuteSortilege >= 3){
			e.minuteSortilege = 0;
			affichee.setText(PROCLAMATION_MYRIAM);
			affichee.owner = "myriam";
			affichee.mode = "rw-------";
			say(C.rouge("À la minute pile, une main invisible recolle la proclamation de Myriam sur le balcon de la Tour."));
		}
	} else e.minuteSortilege = 0;
	if (!e.tajineTue && !Forteresse.procs.some(function(p){ return p.pid === PID_TAJINE; })){
		e.tajineTue = true;
		e.erreurs = (e.erreurs || 0) + 5;
		montrerImage("./static/img/item_timour.gif", "Cheb Timour, devant son tajine");
		say(C.rouge("Un cri monte de l'Atelier : « MON TAJINE ! » Le processus " + PID_TAJINE + " appartenait à Timour, et il n'avait rien fait.") + "\n" +
			C.gris("(Tuer un processus innocent : 5 fausses manœuvres d'un coup. Regarde toujours le USER avant kill.)"));
	}
	EPREUVES_EXAMEN.forEach(function(ep, i){
		var ok = false;
		try { ok = !!ep.fait(); } catch (x){ ok = false; }
		if (ok && !e.reussies[ep.id]){
			e.reussies[ep.id] = true;
			if (ep.id === "oreille") montrerImage("./static/img/item_dylan.gif", "Dylan le Saltimbanque, dans le filet");
			jouerSon("quete");
			var gagnes = ep.score ? ep.score() : ep.points;
			say(C.jaune("★ Épreuve " + CHIFFRES_ROMAINS[i] + " accomplie : " + ep.titre) + C.gris("  +" + gagnes + " pt" + (gagnes > 1 ? "s" : "") + (ep.score ? " sur " + ep.points : "")));
		} else if (!ok && e.reussies[ep.id]){
			// Une épreuve défaite (un service rallumé, une clé remise) ne compte plus.
			delete e.reussies[ep.id];
			e.defaites = e.defaites || {};
			e.defaites[ep.id] = true;
			say(C.rouge("✗ Épreuve " + CHIFFRES_ROMAINS[i] + " défaite : " + ep.titre));
		}
	});
	[1, 2, 3, 4, 5, 6].forEach(function(s){
		var toutes = EPREUVES_EXAMEN.filter(function(ep){ return ep.sceau === s; }).every(function(ep){ return e.reussies[ep.id]; });
		e.sceaux = e.sceaux || {};
		if (toutes && !e.sceaux[s]){
			e.sceaux[s] = true;
			say(C.vert("◆ " + NOMS_DES_SCEAUX[s] + " est brisé.") + "\n" + C.gris({
				1: "Aidan, depuis tes quartiers : « Un sceau ! Le Mage va être content. Moi, je danse. Pieds nus. »",
				2: "Aidan : « Le guichet se tait, la Bibliothèque se réveille. David boude dans /tmp. Myriam fait une de ces têtes. »",
				3: "Aidan : « Le Sceau de la Crypte ! Dylan le Saltimbanque a lâché ses balles. Il ne lâche jamais ses balles. »",
				6: "Les projecteurs s'éteignent sur /dev/random. Steve range ses fiches : « Merci d'avoir joué à Questions pour un Linux ! »",
				5: "Manon referme son registre, enfin complet : « Tout y est, recrue. Le journal, les preuves, les frappes, ton nom.\n" +
					"Le jury n'aura rien à redire. » Aidan : « Elle a souri. Manon a souri ! Je l'écris dans MON journal. »",
				4: "Dans la Tour des Proclamations, la pierre se fend : Laurana la Flamboyante secoue sa crinière rousse et lève sa trompette.\n" +
					"Aidan : « Elle est réveillée ! Et elle est encore plus rousse que le Mage. Ne lui dis pas que j'ai dit ça. »\n" +
					"Laurana : « Viens me voir à la Tour (cat /var/www/Laurana) : je te donnerai le communiqué de la Forteresse. »" }[s]));
			if (s === 4) montrerImage("./static/img/item_laurana.gif", "Laurana la Flamboyante, libérée");
		}
	});
	if (nbReussiesExamen() === EPREUVES_EXAMEN.length){
		terminerExamen("victoire");
		jouerSon("victoire");
		montrerImage("./static/img/item_rouxblanc.gif", "Laurent, le Mage Rouxblanc");
		say("\n" + C.vert(C.gras("LA FORTERESSE EST REPRISE")) + "\n\n" + couler(
			"Le dernier sceau se brise dans un éclat vert. Les sortilèges de Myriam s'éteignent un à un, et la grande porte s'ouvre.\n" +
			"Une lueur rousse et blanche emplit la Forteresse : Laurent, le Mage Rouxblanc, entre en lissant sa barbe.\n\n" +
			"Myriam baisse son bâton et éclate de rire. « Trente-trois sur trente-trois, Mage. Ta recrue est meilleure que tes gardes. »\n" +
			"Dylan le Saltimbanque descend des remparts d'un saut périlleux et rattrape ses balles. David remonte de /tmp avec un sac\n" +
			"de la Taverne aux Arches d'Or : « David a pris des Galettes du Roi Gras pour tout le monde. » Et Aidan surgit de sous\n" +
			"ton lit de camp, pieds poilus en avant : « Je le savais ! Enfin non. Mais j'y croyais très fort. »\n\n" +
			"Myriam lui rend sa vieille robe noire, pliée. Le Mage sourit : « À Terminus, tu as battu le Sorcier Noir le jour de ta rentrée.\n" +
			"Ce soir, tu as battu toute une troupe. Myriam et moi, nous jouons ce tour à chaque promotion. La sorcière, l'acrobate, l'ogre et l'elfe :\n" +
			"tous avaient un rôle cette nuit. Même Laurana, qui fut l'élève de Myriam avant d'être ma voix. Le tien était le plus dur.\n" +
			"Ce que tu viens de faire, tu le referas pour de vrai, un jour, sur une vraie machine. Félicitations. »\n\n" +
			"Laurana monte sur le balcon de la Tour, souffle dans sa trompette d'argent, et proclame ton nom aux sept campus.\n" +
			"Manon le recopie au propre dans son registre, Wissam lève sa tasse, Jean-Baptiste ajoute ta maison sur son plan, Gabriel et Timour\n" +
			"servent le tajine, et Steve, au micro : « Et c'est un sans-faute pour la Forteresse ! Je n'ai pas de blague. Si. Non. »\n\n") +
			texteDiplomeExamen());
	}
}

/* ------------------------------------------------------------------ */
/* Les sorts de l'épreuve                                               */
/* ------------------------------------------------------------------ */

function bilanExamen(){
	var e = state.examen, lignes = [C.gras("ÉPREUVE FINALE") + C.gris("  · " + dureeExamen(minutesExamen()) + " · " + (state.nbCommandes - (e.commandesDebut || 0)) + " commandes"), ""];
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(ep, i){
		if (ep.sceau !== sceau){ sceau = ep.sceau; lignes.push(C.gras(NOMS_DES_SCEAUX[sceau])); }
		lignes.push("  " + (e.reussies[ep.id] ? C.vert("[x]") : "[ ]") + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 9) + ep.titre + C.gris("  (" + ep.points + ")"));
	});
	lignes.push("", "Note provisoire : " + C.gras(ecrireNote(noteExamen()) + " / 20") +
		C.gris("  (épreuves " + ecrireNote(noteDeBaseExamen()) + ", indices -" + ecrireNote(malusIndicesExamen()) + ", fausses manœuvres " + (e.erreurs || 0) + " : -" + ecrireNote(malusErreursExamen()) +
		", bonus de temps si tout est fini en moins de " + dureeExamen(BONUS_UN_POINT) + ")"),
		C.gris("cat ~/.ordre-de-mission : l'ordre détaillé · indice : un coup de pouce (-0,25) · kamikaze : rendre ta copie"));
	return lignes.join("\n");
}

Shell.sorts.examen = function(args, io){
	var demande = (args[0] || "").toLowerCase();
	if (examenEnCours()){
		if (demande === "quitter"){
			term.demander("Quitter la Forteresse et revenir à ta partie normale ? " + (examenFini() ? "" : "L'épreuve restera en l'état, tu pourras y revenir avec examen et le code. ") + "Tape oui pour confirmer : ", false, function(r){
				if (String(r).trim().toLowerCase() !== "oui"){ term.echo("Tu restes dans la Forteresse."); return; }
				state.save();
				PROFIL.modeExamen = false;
				enregistrerProfil();
				Shell.sauvegardeBloquee = true;
				if (typeof window !== "undefined" && window.location) window.location.reload();
			});
			return "";
		}
		if (examenFini()) return texteDiplomeExamen() + "\n" + C.gris("(examen quitter : revenir à ta partie normale.)");
		return bilanExamen();
	}
	if (typeof COMPTE_ACTIF !== "undefined" && !COMPTE_ACTIF && typeof document !== "undefined"){
		return "L'épreuve finale se passe sur ton compte : connecte-toi d'abord (logout, puis ton identifiant et ton mot de passe).";
	}
	term.demander("Le sceau de l'épreuve finale. Code d'accès donné par ton formateur : ", false, function(code){
		if (!codeExamenValide(code)){
			jouerSon("erreur");
			term.echo("Le sceau reste froid. Ce n'est pas le bon code.");
			return;
		}
		term.demander("Le sceau s'illumine. L'épreuve finale se joue dans une partie à part : ta partie actuelle t'attendra, intacte. Entrer dans la Forteresse ? Tape oui pour confirmer : ", false, function(r){
			if (String(r).trim().toLowerCase() !== "oui"){ term.echo("Le sceau s'éteint. Reviens quand tu seras prêt(e)."); return; }
			state.save();
			PROFIL.modeExamen = true;
			enregistrerProfil();
			Shell.sauvegardeBloquee = true;
			if (typeof window !== "undefined" && window.location) window.location.reload();
		});
	});
	return "";
};

Shell.sorts.kamikaze = function(args, io){
	if (!examenEnCours()) return "kamikaze n'a de sens que pendant l'épreuve finale. " + C.gris("(Le sort examen et le code de ton formateur y mènent.)");
	if (examenFini()) return "L'épreuve est terminée : ta copie est rendue. examen pour revoir ton diplôme.";
	term.demander("Le dernier sort. Tu rends ta copie maintenant : ta note sera celle de ce que tu as accompli (" + ecrireNote(noteExamen()) + " / 20). Tape oui pour confirmer : ", false, function(r){
		if (String(r).trim().toLowerCase() !== "oui"){ term.echo("Tu baisses la main. Le combat continue."); return; }
		terminerExamen("kamikaze");
		jouerSon("niveau");
		montrerImage("./static/img/item_elfe.gif", "Aidan, qui t'a rattrapé(e)");
		term.echo(C.rouge(C.gras("KAMIKAZE")) + "\n\n" + couler(
			"Tu lèves les deux mains et prononces le dernier sort. Un éclair blanc traverse la Forteresse :\n" +
			"les écrans s'éteignent, Myriam hurle, Dylan le Saltimbanque tombe de son monocycle, David lâche sa galette,\n" +
			"et toi, tu tombes. Aidan te rattrape juste avant le sol : « Pas mal, pour un sacrifice. Je note 7 sur 10 pour le style. »\n" +
			"Avant le noir, ton rapport passe sous la grande porte, jusqu'aux mains du Mage Rouxblanc. Rien de ce que tu as accompli n'est perdu.\n\n") + texteDiplomeExamen());
		if (typeof majEtat === "function") majEtat();
	});
	return "";
};

/* Le formateur vérifie un code de diplôme, de certificat ou d'épreuve finale. */
Shell.sorts.verifier = function(args, io){
	if (!args.length) throw new ShellError("verifier : quel code ? Utilisation : verifier CODE (le code imprimé sur un diplôme ou un certificat)");
	var ex = lireCodeExamen(args.join(""));
	if (ex) return rapportCodeExamen(ex);
	var lu = lireCode(args.join(""));
	if (!lu) return C.rouge("Code illisible.") + " Ce n'est pas un code de Terminus, ou il est incomplet.";
	var quoi = { 1: "Diplôme du chapitre 1 (Terminus)", 2: "Certificat cyber (la Crypte)", 3: "Certificat réseau (la panne)", 4: "Épreuve finale (ancien code)" }[lu.chapitre] || "Chapitre " + lu.chapitre;
	return (lu.valide ? C.vert("✓ Code authentique") : C.rouge("✗ Code RETOUCHÉ : la somme de contrôle ne correspond pas")) + "\n\n" +
		"  " + completerDroite("Document", 14) + quoi + "\n" +
		"  " + completerDroite("Nom", 14) + lu.prenom + "\n" +
		"  " + completerDroite("Note", 14) + lu.note + " / 20   (" + lu.score + " XP sur " + lu.max + ")\n" +
		"  " + completerDroite("Temps", 14) + dureeExamen(lu.minutes) + "\n" +
		"  " + completerDroite("Commandes", 14) + lu.commandes + "\n" +
		"  " + completerDroite("Indices", 14) + lu.indices + "\n" +
		"  " + completerDroite("Date", 14) + lu.date;
};

/* Ce que le formateur lit dans un code d'épreuve finale : la note, son détail, et chaque épreuve. */
function rapportCodeExamen(c){
	var justesQuiz = (c.quiz || []).filter(function(x){ return x.etat === "+"; }).length;
	var points = EPREUVES_EXAMEN.reduce(function(t, ep, i){ return t + (c.reussies[i] ? (ep.id === "quiz" ? justesQuiz : ep.points) : 0); }, 0);
	var nb = c.reussies.filter(function(x){ return x; }).length;
	var lignes = [
		c.valide ? C.vert("✓ Code authentique") : C.rouge("✗ Code RETOUCHÉ : la somme de contrôle ne correspond pas. Ne pas en tenir compte."),
		"",
		"  " + completerDroite("Document", 20) + "Épreuve finale (la Forteresse)",
		"  " + completerDroite("Nom", 20) + c.prenom,
		"  " + completerDroite("Date", 20) + c.date,
		"  " + completerDroite("NOTE FINALE", 20) + C.gras(ecrireNote(c.note) + " / 20") + "   " + mentionExamen(c.note),
		"  " + completerDroite("  épreuves", 20) + ecrireNote(c.base) + " / 20   (" + nb + " sur " + EPREUVES_EXAMEN.length + ", " + points + " points sur " + POINTS_MAX_EXAMEN + ")",
		"  " + completerDroite("  bonus de temps", 20) + "+" + ecrireNote(c.bonus),
		"  " + completerDroite("  indices", 20) + "-" + ecrireNote(c.malusIndices),
		"  " + completerDroite("  fausses manœuvres", 20) + "-" + ecrireNote(c.malusErreurs) + "   (" + c.erreurs + " lignes en échec)",
		"  " + completerDroite("Fin", 20) + (c.fin === "V" ? "Forteresse reprise (tout fini)" : "kamikaze (copie rendue avant la fin)"),
		"  " + completerDroite("Temps", 20) + dureeExamen(c.minutes) + "   ·   " + c.commandes + " commandes",
		c.tajine ? "  " + C.jaune("! A tué un processus innocent (le tajine de Timour) : +5 fausses manœuvres.") : "",
		""
	].filter(function(l, i){ return l !== "" || i > 1; });
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(ep, i){
		if (ep.sceau !== sceau){ sceau = ep.sceau; lignes.push("  " + C.gras(NOMS_DES_SCEAUX[sceau])); }
		var signe = c.reussies[i] ? C.vert("✓ réussie ") : (c.defaites[i] ? C.jaune("! défaite ") : C.rouge("✗ pas faite"));
		lignes.push("    " + signe + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 9) + ep.titre + (c.indices[i] ? C.gris("  (avec indice)") : "") +
			(c.reussies[i] && c.defaites[i] ? C.gris("  (cassée une fois en route, puis réparée)") : ""));
	});
	if (c.quiz && c.quiz.length){
		lignes.push("", "  " + C.gras("QUESTIONS POUR UN LINUX") + "  " + justesQuiz + " sur " + c.quiz.length);
		c.quiz.forEach(function(x){
			var Q = QUESTIONS_POUR_UN_LINUX[x.id];
			if (!Q) return;
			lignes.push("    " + (x.etat === "+" ? C.vert("✓") : (x.etat === "-" ? C.rouge("✗") : C.gris("·"))) + " " + C.gris("(ch. " + Q.ch + ") ") + Q.q +
				"\n        " + C.gris("réponse attendue : " + Q.c[Q.b] + (x.etat === "." ? "   (pas répondu)" : "")));
		});
	}
	lignes.push("", C.gris("  « défaite » : l'épreuve a été réussie, puis l'étudiant l'a cassée (un service rallumé, un fichier abîmé...)."));
	return lignes.join("\n");
}

/* Les indices de l'épreuve : un coup de pouce, pas la solution. Chacun coûte un quart de point, cinq au plus. */
var INDICES_EXAMEN = {
	ordre: "Les fichiers dont le nom commence par un point ne se montrent qu'avec ls -a.",
	assaillant: "Les connexions ratées sont dans /var/log/auth.log. grep, cut, sort et uniq -c comptent qui frappe le plus souvent.",
	rempart: "Un script ne se lance que s'il a le droit x (ls -l pour voir, chmod pour changer). Ensuite, on le lance par son chemin.",
	fragment: "find cherche par nom dans tout un dossier et ses sous-dossiers.",
	oracle: "L'adresse du vrai Oracle se lit dans /etc/hosts. Le serveur de noms utilisé se règle dans /etc/resolv.conf (avec sudo nano).",
	mairie: "systemctl status et journalctl -u disent pourquoi un service refuse de démarrer. Un /26 va de .0 à .63.",
	telnet: "Arrêter un service ne l'empêche pas de revenir au prochain démarrage : il y a deux choses à faire avec systemctl.",
	nginx: "Démarré maintenant ET à chaque démarrage : systemctl sait faire les deux d'un coup.",
	gardien: "Dans /opt/gardiens, le fichier SHA256SUMS dit à quoi chaque gardien devrait ressembler : sha256sum -c compare. On déplace, on ne détruit pas.",
	signature: "Lis le gardien ensorcelé : une ligne y porte un message encodé en base64.",
	suid: "find / -perm -4000 liste les programmes SUID. passwd l'est, et c'est normal.",
	oreille: "ss -tlnp montre qui écoute sur quel port. Certains processus esquivent le signal par défaut de kill.",
	cle: "Les clés qui ouvrent la porte de root sont dans /root/.ssh/authorized_keys, une ligne par clé.",
	proclamation: "Les sauvegardes dorment sous /srv. tar -tf liste une archive, tar -xf l'extrait. Ensuite, sudo cp.",
	sortilege: "Ce qui revient toutes les minutes vient d'une tâche planifiée, dans la crontab de quelqu'un. De qui ? sudo crontab -u NOM -l.",
	uid0: "Dans /etc/passwd, le troisième champ est l'UID. Seul root doit avoir l'UID 0.",
	droits: "ls -l montre le propriétaire et les droits. chown et chmod les changent.",
	hosts: "/etc/hosts associe des noms à des adresses. L'un de ces noms mène à la Tour Noire.",
	journal: "history liste tes commandes. > écrit dans un fichier, >> ajoute à la fin. date donne la date.",
	chronique: "grep garde les lignes qui contiennent l'adresse ; head -n 1 et tail -n 1 gardent la première et la dernière.",
	frappes: "grep garde les lignes, wc -l les compte.",
	preuves: "mkdir crée un lieu, cp copie sans déplacer, touch crée un fichier vide.",
	identite: "whoami, id et hostname disent qui tu es et où tu es.",
	disque: "du mesure ce que pèse chaque dossier (df, ce qui reste de place sur le disque).",
	piege: "rmdir supprime un lieu vide.",
	alias: "alias sans rien liste les alias en place ; unalias en retire un. alias NOM='COMMANDE' en crée un.",
	maitre: "env liste les variables ; export NOM=VALEUR en change une.",
	balcon: "ln -s CIBLE NOM trace un raccourci. La cible s'écrit en chemin complet.",
	passwd: "Il y a un sort qui porte le nom exact de ce qu'il change.",
	ping: "ping -c 1 ADRESSE envoie un seul accusé de réception.",
	diff: "diff FICHIER1 FICHIER2 montre les lignes qui changent : une ligne précédée de > n'existe que dans le second.",
	trompette: "sudo apt install PAQUET, puis cowsay TEXTE.",
	quiz: "Steve ne souffle jamais : sur le plateau, pas d'indice."
};
function indiceExamen(args){
	var e = state.examen;
	e.indices = e.indices || {};
	if (e.fini) return "L'épreuve est terminée : plus besoin d'indice.";
	var cible = null;
	if (args.length){
		var n = String(args[0]).toUpperCase(), i = CHIFFRES_ROMAINS.indexOf(n);
		if (i === -1 && /^\d+$/.test(n)) i = parseInt(n, 10) - 1;
		if (i < 0 || i >= EPREUVES_EXAMEN.length) throw new ShellError("indice : quelle épreuve ? Par exemple indice 7, ou indice VII (il y en a " + EPREUVES_EXAMEN.length + ").");
		cible = EPREUVES_EXAMEN[i];
	} else {
		cible = EPREUVES_EXAMEN.filter(function(ep){ return !e.reussies[ep.id]; })[0];
		if (!cible) return "Tout est fait : pas besoin d'indice.";
	}
	var num = CHIFFRES_ROMAINS[EPREUVES_EXAMEN.indexOf(cible)];
	if (cible.id === "quiz") return "Pas d'indice sur le plateau : Steve ne souffle jamais. (Rien ne t'a été retiré.)";
	if (e.indices[cible.id]) return "Indice (déjà payé), épreuve " + num + " : " + INDICES_EXAMEN[cible.id];
	if (e.reussies[cible.id]) return "L'épreuve " + num + " est déjà réussie : garde tes quarts de point.";
	if (nbIndicesExamen() >= INDICES_MAX_EXAMEN) return "Tu as déjà pris tes " + INDICES_MAX_EXAMEN + " indices. Il reste man, et ta tête.";
	term.demander("Un indice sur l'épreuve " + num + " (« " + cible.titre + " ») coûte 0,25 point. Il t'en reste " + (INDICES_MAX_EXAMEN - nbIndicesExamen()) + ". Tape oui pour le prendre : ", false, function(r){
		if (String(r).trim().toLowerCase() !== "oui"){ term.echo("Tu gardes ton quart de point."); return; }
		e.indices[cible.id] = true;
		state.save();
		term.echo(C.jaune("Indice, épreuve " + num + " : ") + INDICES_EXAMEN[cible.id] + C.gris("  (-0,25 · " + nbIndicesExamen() + " sur " + INDICES_MAX_EXAMEN + ")"));
		if (typeof majEtat === "function") majEtat();
	});
	return "";
}

/* Les fausses manœuvres : une ligne dont un sort a échoué. */
var TUYAU_HORS_EXAMEN = Shell.tuyau;
Shell.tuyau = function(){
	var ok = TUYAU_HORS_EXAMEN.apply(this, arguments);
	if (ok === false && examenEnCours()) Shell.ligneRateeExamen = true;
	return ok;
};
var EXECUTER_HORS_EXAMEN = Shell.executer;
Shell.executer = function(ligne){
	Shell.ligneRateeExamen = false;
	if (examenEnCours() && /(^|[|;&]\s*)(sudo\s+)?(ps|top)\b/.test(String(ligne || ""))) state.examen.psVu = true;
	var r = EXECUTER_HORS_EXAMEN.apply(this, arguments);
	if (examenEnCours() && !state.examen.fini && current_room === QuartiersRecrue && /^\s*(ls|tree|ll)\b/.test(String(ligne || ""))){
		state.examen.rencontres = state.examen.rencontres || {};
		if (!state.examen.rencontres.aidan){
			state.examen.rencontres.aidan = true;
			var ra = RENCONTRES_EXAMEN[0];
			montrerImage("./static/img/" + ra.image, ra.nom);
			term.echo(C.jaune("Rencontre : ") + ra.texte);
		}
	}
	if (examenEnCours() && !Shell.ligneRateeExamen && !state.examen.fini){
		var l = String(ligne || "");
		if (/(^|[|;&]\s*)(\.\/|\/|~\/|bash\s+)\S*rempart\.sh/.test(l) && Rempart.mode.charAt(2) === "x") state.examen.rempartLeve = true;
		if (/(^|[|;&]\s*)ping\b.*\b10\.0\.92\.53\b/.test(l)) state.examen.oraclePing = true;
		if (/(^|[|;&]\s*)cowsay\b.*oyez/i.test(l)) state.examen.trompette = true;
		if (state.examen.rempartLeve || state.examen.oraclePing || state.examen.trompette){
			verifierExamen();
			if (Shell.narration.length){
				Shell.compacterNarration(Shell.narration).forEach(function(n){ term.echo(n); });
				Shell.narration = [];
				if (typeof majEtat === "function") majEtat();
			}
		}
	}
	if (Shell.ligneRateeExamen && examenEnCours() && !state.examen.fini){
		state.examen.erreurs = (state.examen.erreurs || 0) + 1;
		state.save();
		if (typeof majEtat === "function") majEtat();
	}
	Shell.ligneRateeExamen = false;
	return r;
};

/* ------------------------------------------------------------------ */
/* Pendant l'épreuve : pas d'aide, et on ne sort pas de la Forteresse   */
/* ------------------------------------------------------------------ */

function refusExamen(message){
	return function(original){
		return function(args, io){
			if (examenEnCours()) return message;
			return original.apply(this, arguments);
		};
	};
}
var INDICE_HORS_EXAMEN = Shell.sorts.indice;
Shell.sorts.indice = function(args, io){ return examenEnCours() ? indiceExamen(args) : INDICE_HORS_EXAMEN.apply(this, arguments); };
Shell.sorts.recommencer = refusExamen("L'épreuve finale ne se recommence pas. kamikaze rend ta copie ; examen quitter te ramène à ta partie normale.")(Shell.sorts.recommencer);
Shell.sorts.chapitre = refusExamen("Pendant l'épreuve finale, il n'y a que la Forteresse.")(Shell.sorts.chapitre);
var QUETES_HORS_EXAMEN = Shell.sorts.quetes;
Shell.sorts.quetes = function(args, io){ return examenEnCours() ? bilanExamen() : QUETES_HORS_EXAMEN.apply(this, arguments); };
var XP_HORS_EXAMEN = Shell.sorts.xp;
Shell.sorts.xp = function(args, io){ return examenEnCours() ? bilanExamen() : XP_HORS_EXAMEN.apply(this, arguments); };
var SSH_HORS_EXAMEN = Shell.sorts.ssh;
Shell.sorts.ssh = function(args, io){
	if (examenEnCours()) throw new ShellError("ssh : la Forteresse est coupée du reste du réseau. Le combat se joue ici.");
	return SSH_HORS_EXAMEN.apply(this, arguments);
};

/* ~ désigne tes quartiers dans la Forteresse. */
var CHERCHER_HORS_EXAMEN = Shell.chercherDepuis;
Shell.chercherDepuis = function(depart, chemin, io, cmd){
	if (examenEnCours() && typeof chemin === "string" && chemin.charAt(0) === "~"){
		chemin = "/home/" + JOUEUR + chemin.substring(1);
		if (!racineDe(depart)) depart = QuartiersRecrue;
	}
	return CHERCHER_HORS_EXAMEN.call(this, depart, chemin, io, cmd);
};
var CD_HORS_EXAMEN = Shell.sorts.cd;
Shell.sorts.cd = function(args, io){
	if (examenEnCours() && (args.length === 0 || args[0] === "~")){
		enterRoom(QuartiersRecrue);
		return "Te voilà dans tes quartiers.";
	}
	return CD_HORS_EXAMEN.apply(this, arguments);
};
var ENTRER_HORS_EXAMEN = enterRoom;
enterRoom = function(lieu){
	if (examenEnCours() && lieu && racineDe(lieu) !== Forteresse) throw new ShellError("Le sceau de l'épreuve te retient dans la Forteresse.");
	return ENTRER_HORS_EXAMEN.apply(this, arguments);
};
/* Le chemin absolu d'un lieu de la Forteresse : /home/recrue/rapport. */
function cheminForteresse(lieu){
	var morceaux = [], l = lieu, garde = 0;
	while (l && l !== Forteresse && garde++ < 100){ morceaux.unshift(l.room_name); l = l.parents[0]; }
	return "/" + morceaux.join("/");
}
/* Dans la Forteresse, pwd donne le vrai chemin, et l'invite abrège tes quartiers en ~. */
var CHEMIN_HORS_EXAMEN = Shell.cheminAffiche;
Shell.cheminAffiche = function(lieu){
	if (racineDe(lieu) !== Forteresse) return CHEMIN_HORS_EXAMEN.apply(this, arguments);
	var c = cheminForteresse(lieu), maison = "/home/" + JOUEUR;
	return c === maison || c.indexOf(maison + "/") === 0 ? "~" + c.substring(maison.length) : c;
};
var PWD_HORS_EXAMEN = Shell.sorts.pwd;
Shell.sorts.pwd = function(args, io){
	if (racineDe(current_room) !== Forteresse) return PWD_HORS_EXAMEN.apply(this, arguments);
	montrerImage(current_room.room_pic, current_room.room_name);
	return cheminForteresse(current_room);
};

/* Les rencontres : la première fois qu'on entre là où vit un personnage, son portrait s'affiche et il se présente. */
var RENCONTRES_EXAMEN = [
	{ id: "aidan", lieu: function(){ return null; }, image: "item_elfe.gif", nom: "Aidan, l'elfe aux pieds de hobbit",
	  texte: "Sous le lit de camp, deux grands pieds poilus remuent. Aidan, l'elfe rigolo, enfermé avec toi. (cat Aidan)" },
	{ id: "manon", lieu: function(){ return Forteresse; }, image: "item_manon.gif", nom: "Manon la Châtelaine",
	  texte: "Dans le grand hall, une femme au trousseau de clés note tout dans un registre : Manon la Châtelaine. (cat Manon)" },
	{ id: "wissam", lieu: function(){ return FortHome; }, image: "item_wissam.gif", nom: "Wissam le Sage",
	  texte: "Au milieu du couloir, un homme en turban sert le thé à personne : Wissam le Sage, et ses conseils gratuits. (cat Wissam)" },
	{ id: "jeanbaptiste", lieu: function(){ return FortEtc; }, image: "item_jeanbaptiste.gif", nom: "Jean-Baptiste, Maître des Adresses",
	  texte: "Entre les fichiers de configuration, un cartographe déroule un plan de rue : Jean-Baptiste, fils de l'Oracle. (cat Jean-Baptiste)" },
	{ id: "laurana", lieu: function(){ return TourProclamations; }, image: "item_laurana.gif", nom: "Laurana la Flamboyante",
	  texte: "Au milieu de la Tour, une statue aux cheveux de flamme, trompette à la main : Laurana, le héraut. (cat Laurana)" },
	{ id: "gabriel", lieu: function(){ return AtelierComposants; }, image: "item_gabriel.gif", nom: "Gabriel et Cheb Timour",
	  texte: "Dans l'Atelier, Gabriel lève une barrette de mémoire à la lumière ; derrière lui, Cheb Timour surveille un tajine. (cat Gabriel, cat Timour)" },
	{ id: "steve", lieu: function(){ return PlateauQuiz; }, image: "item_steve.gif", nom: "Steve, présentateur",
	  texte: "Les projecteurs s'allument, un jingle retentit : Steve, micro doré à la main. « Bienvenue sur /dev/random, là où même les questions sont aléatoires... et mes blagues aussi ! » (cat Steve)" },
	{ id: "david", lieu: function(){ return FortTmp; }, image: "item_david.gif", nom: "David, l'ogre des steppes",
	  texte: "Assis sur des sacs de la Taverne aux Arches d'Or, un ogre maigre mâche une Galette du Roi Gras : David. (cat David)" }
];
GameEvents.addListener("enter", function(ev){
	if (!examenEnCours()) return;
	var e = state.examen;
	e.rencontres = e.rencontres || {};
	RENCONTRES_EXAMEN.forEach(function(r){
		if (e.rencontres[r.id] || ev.room !== r.lieu()) return;
		e.rencontres[r.id] = true;
		montrerImage("./static/img/" + r.image, r.nom);
		say(C.jaune("Rencontre : ") + r.texte);
	});
});

/* La carte de la Forteresse : pendant l'épreuve, tree s'arrête à deux niveaux si on ne lui dit pas plus. */
var TREE_HORS_EXAMEN = Shell.sorts.tree;
Shell.sorts.tree = function(args, io){
	if (!examenEnCours() || args.some(function(a){ return a === "-L" || /^-L\d/.test(a); })) return TREE_HORS_EXAMEN.apply(this, arguments);
	var sortie = TREE_HORS_EXAMEN.call(this, ["-L", "2"].concat(args), io);
	return sortie + (io.tty ? "\n" + C.gris("(La carte s'arrête à deux niveaux. tree -L 3 / pour descendre plus loin.)") : "");
};

/* Les ports de la Forteresse : ceux des services allumés, et Dylan le Saltimbanque, l'oreille de Myriam. */
var PRISES_HORS_EXAMEN = prisesDe;
prisesDe = function(hote){
	if (hote !== "forteresse") return PRISES_HORS_EXAMEN(hote);
	var prises = [{ etat: "LISTEN", local: "0.0.0.0:22", service: "ssh", pair: "0.0.0.0:*", proc: "sshd", pid: 612, owner: "root" }];
	var t = servicePanne("forteresse", "telnet");
	if (t.actif) prises.push({ etat: "LISTEN", local: "0.0.0.0:23", service: "telnet", pair: "0.0.0.0:*", proc: "in.telnetd", pid: t.pid || 733, owner: "root" });
	var n = servicePanne("forteresse", "nginx");
	if (n.actif) prises.push({ etat: "LISTEN", local: "0.0.0.0:80", service: "http", pair: "0.0.0.0:*", proc: "nginx", pid: n.pid || 0, owner: "root" });
	var oreille = Forteresse.procs.filter(function(p){ return p.pid === PID_OREILLE; })[0];
	if (oreille){
		prises.push({ etat: "LISTEN", local: "0.0.0.0:" + PORT_OREILLE, service: String(PORT_OREILLE), pair: "0.0.0.0:*", proc: oreille.name, pid: oreille.pid, owner: "root" });
		prises.push({ etat: "ESTAB", local: IP_FORTERESSE + ":" + PORT_OREILLE, service: String(PORT_OREILLE), pair: IP_ASSAILLANT_EXAMEN + ":49152", proc: oreille.name, pid: oreille.pid, owner: "root" });
	}
	return prises;
};

/* Les services de la Forteresse : la Mairie refuse d'ouvrir tant que sa plage est fausse, et enable --now démarre. */
var SYSTEMCTL_HORS_EXAMEN = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	if (Shell.hote() !== "forteresse") return SYSTEMCTL_HORS_EXAMEN.apply(this, arguments);
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0], nom = (mots[1] || "").replace(/\.service$/, "");
	if (nom === "dhcpd" || nom === "isc-dhcp") nom = "isc-dhcp-server";
	if (nom === "telnetd" || nom === "telnet.socket") nom = "telnet";
	if (mots[1]) args = args.map(function(a){ return a === mots[1] ? nom : a; });
	var demarre = io.sudo && (action === "start" || action === "restart" || (action === "enable" && args.indexOf("--now") > -1));
	if (demarre && nom === "isc-dhcp-server"){
		var verdict = verdictDhcpExamen();
		if (verdict){
			servicePanne("forteresse", nom).actif = false;
			throw new ShellError("Job for isc-dhcp-server.service failed because the control process exited with error code.\n" +
				"See \"systemctl status isc-dhcp-server.service\" and \"journalctl -xeu isc-dhcp-server.service\" for details.");
		}
	}
	if (action === "status" && nom === "isc-dhcp-server" && !servicePanne("forteresse", nom).actif){
		return "× isc-dhcp-server.service - La Mairie : le serveur DHCP\n     Loaded: loaded (/lib/systemd/system/isc-dhcp-server.service; " + (servicePanne("forteresse", nom).auto ? "enabled" : "disabled") + ")\n" +
			"     Active: " + (io.tty ? C.rouge("failed") : "failed") + " (Result: exit-code)" + (verdictDhcpExamen() ? "\n\nforteresse dhcpd[" + 1402 + "]: " + verdictDhcpExamen() : "");
	}
	var sortie = SYSTEMCTL_HORS_EXAMEN.call(this, args, io);
	if (demarre && action === "enable" && !servicePanne("forteresse", nom).actif) demarrerService("forteresse", nom);
	return sortie;
};

/* Pendant l'épreuve : pas de petits gains d'XP, ni de quête de chapitre. */
var GAGNER_HORS_EXAMEN = GameState.prototype.gagner;
GameState.prototype.gagner = function(){ if (this.examen && modeExamen()) return; return GAGNER_HORS_EXAMEN.apply(this, arguments); };
/* Pendant l'épreuve, les quêtes du jeu normal se taisent (pas de « Quête secondaire accomplie », pas de niveau). */
var COMPLETE_HORS_EXAMEN_BASE = GameState.prototype.complete;
var DECOUVRIR_HORS_EXAMEN = GameState.prototype.discover;
var BILAN_XP_HORS_EXAMEN = GameState.prototype.bilanXP;
function isolerExamen(){
	if (typeof state === "undefined" || !state || state.examenIsole) return;
	state.examenIsole = true;
	["complete", "discover", "bilanXP", "gagner"].forEach(function(m){
		var origine = state[m];
		if (typeof origine !== "function") return;
		state[m] = function(){ if (examenEnCours()) return; return origine.apply(this, arguments); };
	});
}
/* Les chemins s'écrivent comme sur la vraie machine : /var/www, pas ~/Cybersup/.../forteresse/var/www. */
var APPELER_HORS_EXAMEN = Shell.appeler;
Shell.appeler = function(){
	var sortie = APPELER_HORS_EXAMEN.apply(this, arguments);
	if (examenEnCours() && typeof sortie === "string" && sortie.indexOf("forteresse") > -1){
		var racine = Forteresse.path();
		sortie = sortie.split(racine + "/").join("/").split(racine).join("/");
	}
	return sortie;
};

/* Pendant l'épreuve, les succès du jeu normal ne s'affichent pas : seule la Forteresse compte. */
var SUCCES_HORS_EXAMEN = GameState.prototype.verifierSucces;
GameState.prototype.verifierSucces = function(){ if (this.examen && modeExamen()) return; return SUCCES_HORS_EXAMEN.apply(this, arguments); };
var CHAPITRE_HORS_EXAMEN = GameState.prototype.chapitreEnCours;
GameState.prototype.chapitreEnCours = function(){ if (this.examen && modeExamen()) return 4; return CHAPITRE_HORS_EXAMEN.apply(this, arguments); };
var QUETE_HORS_EXAMEN = GameState.prototype.queteEnCours;
GameState.prototype.queteEnCours = function(){
	if (this.examen && modeExamen()){
		return { id: "examen", titre: this.examen.fini ? "Épreuve finale terminée · " + ecrireNote(noteExamen()) + " / 20" :
			"Épreuve finale · " + nbReussiesExamen() + " sur " + EPREUVES_EXAMEN.length + " · " + ecrireNote(noteExamen()) + " / 20",
			indice: this.examen.fini ? "examen : ton diplôme et son code. examen quitter : revenir à ta partie." : (this.examen.ordreLu ? "tree / : la carte de la Forteresse. examen : le bilan. indice : un coup de pouce (-0,25). kamikaze : rendre ta copie." :
				"Commence par la carte : tree /. Ton ordre de mission est caché dans tes quartiers (ls -a)." ) };
	}
	return QUETE_HORS_EXAMEN.apply(this, arguments);
};

/* Le monde du chapitre 1 ne bouge pas pendant l'épreuve : seule la Forteresse est vérifiée. */
var VERIFIER_MONDE_HORS_EXAMEN = verifierMonde;
verifierMonde = function(){
	if (examenEnCours()){ verifierExamen(); return; }
	return VERIFIER_MONDE_HORS_EXAMEN.apply(this, arguments);
};

GameEvents.addListener("passwd", function(e){
	if (examenEnCours() && e.ok) state.examen.passwdChange = true;
});
GameEvents.addListener("read", function(e){
	if (examenEnCours() && e.item === OrdreExamen) state.examen.ordreLu = true;
});

/* Le bandeau de droite pendant l'épreuve (appelé par majEtat, dans Game.js). */
function majEtatExamen(){
	if (!examenEnCours() || typeof document === "undefined") return false;
	var niveau = document.getElementById("etat-niveau");
	niveau.textContent = state.examen.fini ? "Épreuve finale · copie rendue" : "Épreuve finale · " + nbReussiesExamen() + " / " + EPREUVES_EXAMEN.length + " épreuves";
	if (typeof remplirBarre === "function") remplirBarre(noteExamen());
	document.getElementById("etat-xp").textContent = ecrireNote(noteExamen()) + " / 20 · " + dureeExamen(minutesExamen());
	document.getElementById("etat").title = "L'épreuve finale. Tape examen pour le bilan.";
	document.getElementById("etat").classList.toggle("etat-alerte", !state.examen.fini);
	return true;
}

/* À l'ouverture de la page en mode examen (appelé par accueillir, dans Game.js). */
function accueillirExamen(){
	if (!modeExamen()) return false;
	isolerExamen();
	if (!state.examen){
		demarrerExamen();
		term.echo(C.rouge(C.gras(TEXTE_ENTREE_EXAMEN.split("\n")[0])) + "\n" + TEXTE_ENTREE_EXAMEN.split("\n").slice(1).join("\n"));
	} else {
		var lieu = null;
		try { lieu = CHERCHER_HORS_EXAMEN.call(Shell, Forteresse, state.examen.lieu || "/home/" + JOUEUR, { sudo: true }, "").node; } catch (x){ lieu = null; }
		ENTRER_HORS_EXAMEN(lieu instanceof Room ? lieu : QuartiersRecrue);
		if (typeof montrerImage === "function") montrerImage(Forteresse.room_pic, "forteresse");
		term.echo(C.rouge(C.gras("MISSION SPÉCIALE · L'ÉPREUVE FINALE")) + "\n\n" +
			(state.examen.fini ? "Ton épreuve est terminée. examen : ton diplôme et son code. examen quitter : revenir à ta partie normale." :
				"Tu es de retour dans la Forteresse. examen : où tu en es. kamikaze : rendre ta copie."));
	}
	term.definirInvite(Shell.invite());
	return true;
}

/* Les commandes du jeu ajoutées par l'épreuve. */
["examen", "kamikaze", "verifier"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 2, 0,
	["examen", "l'épreuve finale (avec le code du formateur)"],
	["verifier CODE", "vérifier un code de diplôme ou de certificat"]);
MANUEL_DU_JEU.examen = "examen n'est PAS une commande Linux : c'est une commande du jeu.\n" +
	"Hors épreuve : demande le code de ton formateur et ouvre l'épreuve finale, dans une partie à part.\n" +
	"Pendant l'épreuve : examen montre le bilan ; examen quitter ramène à ta partie normale.";
MANUEL_DU_JEU.kamikaze = "kamikaze n'est PAS une commande Linux : pendant l'épreuve finale, il rend ta copie.\nTa note est celle de ce que tu as accompli, et ton diplôme porte son code.";
MANUEL_DU_JEU.verifier = "verifier n'est PAS une commande Linux : il lit un code de diplôme ou de certificat\net dit s'il est authentique (verifier CODE).";
