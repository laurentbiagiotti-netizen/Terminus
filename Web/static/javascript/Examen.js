/**
 * Examen.js : la mission spéciale, l'épreuve finale.
 *
 * Une partie à part, ouverte par un code que donne le formateur (sort examen) : la recrue est
 * seule dans la Forteresse, un serveur pris par la sorcière Myriam et gardé par Dylan le Saltimbanque,
 * avec Steve l'elfe rigolo pour seule compagnie (il fait rire, il n'aide pas). Treize épreuves
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

var FortHome = lieuExamen(Forteresse, "home", "Les quartiers des comptes de la Forteresse.");
var QuartiersRecrue = lieuExamen(FortHome, JOUEUR, "Tes quartiers : un lit de camp, une lampe, et le silence.", { owner: JOUEUR, image: "loc_forteresse.gif" });
var Arsenal = lieuExamen(QuartiersRecrue, "arsenal", "Ton arsenal : ce que l'école t'a laissé pour te défendre.", { owner: JOUEUR, image: "loc_backroom.gif" });
var RapportExamen = lieuExamen(QuartiersRecrue, "rapport", "Ton rapport d'épreuve : ce que tu y déposes sera relu par le jury.", { owner: JOUEUR, image: "loc_library.gif" });
var FortEtc = lieuExamen(Forteresse, "etc", "La configuration de la Forteresse.", { image: "loc_etc.gif" });
var FortDhcp = lieuExamen(FortEtc, "dhcp", "La configuration de la Mairie (le serveur DHCP).", { image: "loc_etc.gif" });
var FortVar = lieuExamen(Forteresse, "var", "Les données de la Forteresse.", { image: "loc_etc.gif" });
var FortLog = lieuExamen(FortVar, "log", "Les journaux de la Forteresse : tout ce qui s'y passe y laisse une trace.", { image: "loc_journaux.gif" });
var FortSrv = lieuExamen(Forteresse, "srv", "Les archives servies par la Forteresse.", { image: "loc_library.gif" });
var FortOpt = lieuExamen(Forteresse, "opt", "Les programmes ajoutés à la Forteresse.", { image: "loc_bin.gif" });
var Gardiens = lieuExamen(FortOpt, "gardiens", "Les gardiens de la Forteresse : des programmes qui veillent sur ses portes. L'un d'eux a changé de camp.", { image: "loc_bin.gif" });
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
objetExamen(FortEtc, "hosts",
	"127.0.0.1\tlocalhost\n127.0.1.1\tforteresse\n" + IP_VRAI_ORACLE + "\toracle dns.cybersup.lan\n10.0.92.20\tintranet\n10.0.97.1\tmairie\n");
objetExamen(FortEtc, "hostname", "forteresse\n");
var DhcpdExamen = objetExamen(FortDhcp, "dhcpd.conf",
	"# isc-dhcp-server : les adresses de la Forteresse\n" +
	"subnet 10.0.97.0 netmask 255.255.255.192 {\n" +
	"  range 10.0.97.100 10.0.97.150;\n" +
	"  option routers 10.0.97.1;\n" +
	"  option domain-name-servers " + IP_VRAI_ORACLE + ";\n" +
	"}\n");
objetExamen(FortEtc, "passwd",
	"root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n" +
	"sshd:x:105:65534::/run/sshd:/usr/sbin/nologin\n" + JOUEUR + ":x:1000:1000:Recrue de l'épreuve finale:/home/" + JOUEUR + ":/bin/bash\n");

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
		["02:48", "sudo", "myriam : COMMAND=/usr/bin/systemctl disable --now nginx"],
		["02:49", "sudo", "myriam : COMMAND=/usr/bin/nano /etc/dhcp/dhcpd.conf"]];
	var verdict = verdictDhcpExamen();
	if (verdict) j.push(["02:51", "isc-dhcp-server", verdict]);
	return lignesDeJournal(j);
} });

/* Steve, l'elfe rigolo : il fait rire, il ne donne aucune piste. */
var BLAGUES_DE_STEVE = [
	"« Tu sais pourquoi les elfes ne font jamais de sudo ? Parce qu'ils sont déjà au-dessus de tout le monde. Bon. Je sors. »",
	"« Dylan le Saltimbanque jongle avec sept torches. Moi, avec une seule, j'ai brûlé mon bonnet. »",
	"« Myriam m'a transformé en grenouille, une fois. J'ai trouvé ça très reposant. »",
	"« Un elfe entre dans un serveur. Le serveur dit : Permission denied. Fin de l'histoire. C'est la mienne, d'ailleurs. »",
	"« Je t'aiderais bien, mais le Mage Rouxblanc a dit : pas d'aide. Et il a une barbe qui fait peur quand il est fâché. »",
	"« Mon plus grand exploit ? J'ai fait un ls dans une pièce vide. Très émouvant. »"
];
var ElfeSteve = new Item("Steve", "", "item_elfe.gif").personnage();
Object.defineProperty(ElfeSteve.cmd_text, "less", { get: function(){
	var n = state && state.examen ? nbReussiesExamen() + (state.nbCommandes % BLAGUES_DE_STEVE.length) : 0;
	return "Steve, l'elfe rigolo, coincé ici depuis que Myriam a fermé la Forteresse. Il agite ses longues oreilles.\n\n" +
		BLAGUES_DE_STEVE[n % BLAGUES_DE_STEVE.length];
}, set: function(){}, enumerable: true, configurable: true });
QuartiersRecrue.addItem(ElfeSteve);

World.fige = true;

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
/* Les treize épreuves                                                  */
/* ------------------------------------------------------------------ */

var EPREUVES_EXAMEN = [
	{ id: "ordre", sceau: 1, points: 1, titre: "Trouver l'ordre de mission caché",
	  fait: function(){ return !!state.examen.ordreLu; } },
	{ id: "assaillant", sceau: 1, points: 2, titre: "Nommer l'assaillant dans ~/rapport/assaillant.txt",
	  fait: function(){ var f = RapportExamen.getItemFromName("assaillant.txt"); return f !== -1 && f.getText().trim() === IP_ASSAILLANT_EXAMEN; } },
	{ id: "rempart", sceau: 1, points: 1, titre: "Rendre ~/arsenal/rempart.sh exécutable",
	  fait: function(){ return Arsenal.hasItem(Rempart) && Rempart.mode.charAt(2) === "x"; } },
	{ id: "fragment", sceau: 1, points: 1, titre: "Ranger le fragment-du-sceau dans ~/rapport",
	  fait: function(){ return RapportExamen.hasItem(FragmentDuSceau); } },
	{ id: "oracle", sceau: 2, points: 2, titre: "Rendre à la Forteresse le vrai Oracle des Noms",
	  fait: function(){ var t = ResolvExamen.getText(); return new RegExp("^\\s*nameserver\\s+" + IP_VRAI_ORACLE.replace(/\./g, "\\.") + "\\s*$", "m").test(t) && t.indexOf(IP_FAUX_ORACLE) === -1; } },
	{ id: "mairie", sceau: 2, points: 2, titre: "Corriger la plage de la Mairie (DHCP) et la rouvrir",
	  fait: function(){ return verdictDhcpExamen() === null && servicePanne("forteresse", "isc-dhcp-server").actif; } },
	{ id: "telnet", sceau: 2, points: 1, titre: "Fermer pour de bon le guichet bavard (telnet)",
	  fait: function(){ var s = servicePanne("forteresse", "telnet"); return !s.actif && !s.auto; } },
	{ id: "nginx", sceau: 2, points: 1, titre: "Réveiller la Bibliothèque (nginx), à chaque démarrage aussi",
	  fait: function(){ var s = servicePanne("forteresse", "nginx"); return s.actif && s.auto; } },
	{ id: "gardien", sceau: 3, points: 2, titre: "Mettre le gardien trafiqué en /quarantaine, intact",
	  fait: function(){ return Quarantaine.hasItem(GardienTrafique) && !Gardiens.hasItem(GardienTrafique); } },
	{ id: "signature", sceau: 3, points: 1, titre: "Inscrire la signature de Myriam dans ~/rapport/signature.txt",
	  fait: function(){ var f = RapportExamen.getItemFromName("signature.txt"); return f !== -1 && f.getText().trim().toUpperCase() === MOT_DE_MYRIAM; } },
	{ id: "suid", sceau: 3, points: 2, titre: "Désarmer la porte dérobée SUID",
	  fait: function(){ return !FortUsrLocalLib.hasItem(PasseMuraille) || PasseMuraille.mode.charAt(2) !== "s"; } },
	{ id: "oreille", sceau: 3, points: 2, titre: "Faire tomber Dylan le Saltimbanque (le port qui écoute)",
	  fait: function(){ return !Forteresse.procs.some(function(p){ return p.pid === PID_OREILLE; }); } },
	{ id: "cle", sceau: 3, points: 2, titre: "Retirer la clé de trop chez root, et seulement elle",
	  fait: function(){ var t = AuthorizedKeysExamen.getText(); return t.indexOf("myriam@tour-noire") === -1 && t.indexOf(CLE_LAURENT_EXAMEN) > -1 && t.indexOf(CLE_ADMIN_EXAMEN) > -1; } }
];
var NOMS_DES_SCEAUX = { 1: "LE SCEAU DU TERMINAL", 2: "LE SCEAU DES LETTRES", 3: "LE SCEAU DE LA CRYPTE" };
var CHIFFRES_ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

function pointsExamen(){
	return EPREUVES_EXAMEN.reduce(function(t, e){ return t + (state.examen.reussies[e.id] ? e.points : 0); }, 0);
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
		"Cette nuit, la sorcière Myriam a pris la Forteresse, le serveur qui garde",
		"les diplômes de l'école. Sur ses remparts bondit Dylan le Saltimbanque, son",
		"acrobate, qui esquive tous les coups polis. Radia et Grace sont injoignables :",
		"tu es seule ou seul face à eux. Seul Steve, l'elfe rigolo, est resté coincé",
		"dans tes quartiers. Il te fera rire ; il ne t'aidera pas. C'est ton épreuve finale.",
		"",
		"Trois sceaux tiennent la Forteresse sous l'emprise de Myriam. Brise-les dans l'ordre",
		"que tu veux. Chaque épreuve accomplie compte, même si tu ne vas pas au bout.",
		""
	];
	var textes = {
		ordre: "Tu as trouvé cet ordre, caché dans tes quartiers : c'était la première épreuve.",
		assaillant: "Dans les journaux de la Forteresse, une adresse a frappé à la porte des\n        dizaines de fois. Inscris-la, seule, dans ~/rapport/assaillant.txt",
		rempart: "Ton arme, ~/arsenal/rempart.sh, refuse de servir : rends-la exécutable.",
		fragment: "Un fragment-du-sceau s'est perdu quelque part sous /srv.\n        Retrouve-le et range-le dans ~/rapport.",
		oracle: "La Forteresse interroge un faux Oracle des Noms. Rends-lui le vrai :\n        son adresse est écrite dans le registre local des noms de la machine.",
		mairie: "La Mairie (le service isc-dhcp-server) refuse d'ouvrir : sa plage\n        d'adresses sort de la rue. Corrige-la, puis rouvre la Mairie.",
		telnet: "Un guichet bavard parle en clair à qui veut l'entendre : ferme-le,\n        et qu'il ne rouvre pas au prochain démarrage.",
		nginx: "La Bibliothèque (nginx) dort : réveille-la, maintenant et à chaque démarrage.",
		gardien: "L'un des gardiens de /opt/gardiens a été trafiqué. Démasque-le et mets-le\n        dans /quarantaine. Ne détruis aucune preuve.",
		signature: "Le traître porte un message caché. Déchiffre-le et inscris la signature\n        de Myriam, seule, dans ~/rapport/signature.txt",
		suid: "Une porte dérobée donne les pleins pouvoirs à qui la franchit.\n        Trouve-la et désarme-la.",
		oreille: "Dylan le Saltimbanque écoute la Forteresse pour Myriam, sur un port que personne\n        n'explique. Il esquive les coups polis : fais-le tomber.",
		cle: "Une clé de trop ouvre la porte de root. Retire-la, et seulement elle."
	};
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(e, i){
		if (e.sceau !== sceau){ sceau = e.sceau; lignes.push(NOMS_DES_SCEAUX[sceau]); }
		var coche = state.examen && state.examen.reussies[e.id] ? "[x]" : "[ ]";
		lignes.push("  " + coche + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 6) + textes[e.id].replace(/\n\s+/g, "\n            ") + "  (" + e.points + " pt" + (e.points > 1 ? "s" : "") + ")");
	});
	lignes.push("",
		"Ton mot de passe sudo : " + MOT_DE_PASSE_SUDO + ". Pas d'indice, pas de radio : man reste ton seul allié.",
		"examen : où tu en es.   kamikaze : tout arrêter et rendre ta copie.",
		"",
		"Que tes commandes soient justes. On compte sur toi.",
		"                                   Laurent, le Mage Rouxblanc");
	return lignes.join("\n");
}

/* ------------------------------------------------------------------ */
/* Le déroulé : entrer, suivre, finir                                   */
/* ------------------------------------------------------------------ */

var TEXTE_ENTREE_EXAMEN =
	"MISSION SPÉCIALE · L'ÉPREUVE FINALE\n\n" +
	"La nuit est tombée sur Cybersup. Dans la salle des serveurs, une seule machine clignote encore :\n" +
	"la Forteresse, celle qui garde les diplômes de l'école. La sorcière Myriam s'en est emparée,\net Dylan le Saltimbanque fait des cabrioles sur ses remparts.\n\n" +
	"Tu as appris le terminal à Terminus, réparé le réseau avec Radia, traqué l'intrus avec Grace.\n" +
	"Cette fois, personne ne te guidera. Ton ordre de mission est caché dans tes quartiers.\n" +
	"Trouve-le.";

/* Ouvre une épreuve neuve : tous les sorts, la Forteresse, et le silence. */
function demarrerExamen(){
	state.examen = { debut: state.tempsMs || 0, reussies: {}, ordreLu: false, fini: false, fin: null, dateFin: null, tempsFin: null, commandesDebut: state.nbCommandes, lieu: null };
	[SORTS_DE_DEPART, ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3].forEach(function(liste){
		(liste || []).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });
	});
	state.flags.tutoFini = true;
	if (!state.nom) state.nom = PROFIL.prenom || JOUEUR;
	state.env.HOME = "/home/" + JOUEUR;
	enterRoom(QuartiersRecrue);
	Shell.lieu_precedent = null;
	if (typeof montrerImage === "function") montrerImage("./static/img/item_myriam.gif", "Myriam, la sorcière");
	return TEXTE_ENTREE_EXAMEN;
}

/* Le texte du diplôme de l'épreuve finale. */
function texteDiplomeExamen(){
	var e = state.examen, points = pointsExamen(), minutes = minutesExamen();
	var lignes = [
		"=================================================================",
		"       CYBERSUP · DIPLÔME DE L'ÉPREUVE FINALE",
		"=================================================================",
		"",
		"  Décerné à : " + (state.nom || JOUEUR),
		"  " + (e.fin === "victoire" ? "qui a repris la Forteresse à la sorcière Myriam, seul(e) et sans aide." :
			"qui a affronté la sorcière Myriam dans la Forteresse, puis rendu sa copie (kamikaze)."),
		""
	];
	var sceau = 0;
	EPREUVES_EXAMEN.forEach(function(ep, i){
		if (ep.sceau !== sceau){ sceau = ep.sceau; lignes.push("  " + NOMS_DES_SCEAUX[sceau]); }
		lignes.push("    " + (e.reussies[ep.id] ? "✓" : "✗") + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 6) + completerDroite((e.reussies[ep.id] ? ep.points : 0) + "/" + ep.points, 5) + ep.titre);
	});
	lignes.push("",
		"  ÉPREUVES RÉUSSIES   : " + nbReussiesExamen() + " sur " + EPREUVES_EXAMEN.length,
		"  NOTE                : " + points + " / 20",
		"  Mention             : " + mentionExamen(points),
		"  Temps               : " + dureeExamen(minutes),
		"  Fin de l'épreuve    : " + (e.fin === "victoire" ? "Forteresse reprise" : "kamikaze"),
		"",
		"  Signé : Laurent, le Mage Rouxblanc, Directeur Pédagogique de Cybersup",
		"=================================================================",
		"  Code de vérification, à remettre au formateur :",
		"  " + codeDiplomeExamen(),
		"=================================================================");
	return lignes.join("\n");
}

function codeDiplomeExamen(){
	var e = state.examen;
	return fabriquerCode({
		prenom: String(state.nom || JOUEUR).replace(/\|/g, "/"),
		score: pointsExamen(), max: 20, note: pointsExamen(),
		commandes: (e.commandesFin !== undefined ? e.commandesFin : state.nbCommandes) - (e.commandesDebut || 0),
		minutes: minutesExamen(), indices: e.fin === "kamikaze" ? 1 : 0, chapitre: 4,
		date: e.dateFin || dateDuJour(), graine: PROFIL.graine
	});
}

function terminerExamen(fin){
	var e = state.examen;
	if (e.fini) return;
	e.fini = true;
	e.fin = fin;
	e.dateFin = dateDuJour();
	e.tempsFin = state.tempsMs;
	e.commandesFin = state.nbCommandes;
	state.save();
}

/* Après chaque ligne : les épreuves accomplies se cochent, et la fin arrive quand tout est fait. */
function verifierExamen(){
	var e = state.examen;
	if (!e) return;
	if (racineDe(current_room) === Forteresse) e.lieu = cheminForteresse(current_room);
	if (e.fini) return;
	EPREUVES_EXAMEN.forEach(function(ep, i){
		var ok = false;
		try { ok = !!ep.fait(); } catch (x){ ok = false; }
		if (ok && !e.reussies[ep.id]){
			e.reussies[ep.id] = true;
			if (ep.id === "oreille") montrerImage("./static/img/item_dylan.gif", "Dylan le Saltimbanque, dans le filet");
			jouerSon("quete");
			say(C.jaune("★ Épreuve " + CHIFFRES_ROMAINS[i] + " accomplie : " + ep.titre) + C.gris("  +" + ep.points + " pt" + (ep.points > 1 ? "s" : "")));
		} else if (!ok && e.reussies[ep.id]){
			// Une épreuve défaite (un service rallumé, une clé remise) ne compte plus.
			delete e.reussies[ep.id];
			say(C.rouge("✗ Épreuve " + CHIFFRES_ROMAINS[i] + " défaite : " + ep.titre));
		}
	});
	[1, 2, 3].forEach(function(s){
		var toutes = EPREUVES_EXAMEN.filter(function(ep){ return ep.sceau === s; }).every(function(ep){ return e.reussies[ep.id]; });
		e.sceaux = e.sceaux || {};
		if (toutes && !e.sceaux[s]){
			e.sceaux[s] = true;
			say(C.vert("◆ " + NOMS_DES_SCEAUX[s] + " est brisé.") + "\n" + C.gris({
				1: "Steve, depuis tes quartiers : « Un sceau ! Je danse. Enfin, intérieurement. »",
				2: "Steve : « Deux sceaux ! Myriam fait une tête, tu verrais ça. Moi, je l'ai vue. C'était génial. »",
				3: "Steve : « Le Sceau de la Crypte ! Dylan le Saltimbanque a lâché ses balles. Il ne lâche jamais ses balles. »" }[s]));
		}
	});
	if (nbReussiesExamen() === EPREUVES_EXAMEN.length){
		terminerExamen("victoire");
		jouerSon("victoire");
		montrerImage("./static/img/item_rouxblanc.gif", "Laurent, le Mage Rouxblanc");
		say("\n" + C.vert(C.gras("LA FORTERESSE EST REPRISE")) + "\n\n" +
			"Le dernier sceau se brise dans un éclat vert. Sur l'écran, les sortilèges de Myriam s'éteignent un à un.\n" +
			"La sorcière baisse son bâton et éclate de rire. Derrière elle, Dylan le Saltimbanque salue d'un saut périlleux, et Steve\n" +
			"surgit de sous ton lit de camp : « Je le savais ! Enfin non. Mais j'y croyais très fort. »\n\n" +
			"Une lueur rousse et blanche emplit la pièce : Laurent, le Mage Rouxblanc, entre en lissant sa barbe.\n" +
			"« Treize sur treize. Sans indice, sans radio. Myriam, Dylan et Steve ont joué le jeu pour toi cette nuit.\n" +
			"Ce que tu viens de faire, tu le referas pour de vrai, un jour, sur une vraie machine. Félicitations. »\n\n" +
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
		lignes.push("  " + (e.reussies[ep.id] ? C.vert("[x]") : "[ ]") + " " + completerDroite(CHIFFRES_ROMAINS[i] + ".", 6) + ep.titre + C.gris("  (" + ep.points + ")"));
	});
	lignes.push("", "Note provisoire : " + C.gras(pointsExamen() + " / 20") + C.gris("  · l'ordre de mission détaillé : cat ~/.ordre-de-mission · kamikaze pour rendre ta copie"));
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
	term.demander("Le dernier sort. Tu rends ta copie maintenant : ta note sera celle de ce que tu as accompli (" + pointsExamen() + " / 20). Tape oui pour confirmer : ", false, function(r){
		if (String(r).trim().toLowerCase() !== "oui"){ term.echo("Tu baisses la main. Le combat continue."); return; }
		terminerExamen("kamikaze");
		jouerSon("niveau");
		montrerImage("./static/img/item_elfe.gif", "Steve, qui t'a rattrapé(e)");
		term.echo(C.rouge(C.gras("KAMIKAZE")) + "\n\n" +
			"Tu lèves les deux mains et prononces le dernier sort. Un éclair blanc traverse la Forteresse :\n" +
			"les écrans s'éteignent, Myriam hurle, Dylan le Saltimbanque tombe de son monocycle, et toi, tu tombes.\n" +
			"Steve te rattrape juste avant le sol : « Pas mal, pour un sacrifice. Je note 7 sur 10 pour le style. »\n" +
			"Avant le noir, ton rapport s'envole jusqu'à la tour du Mage Rouxblanc. Rien de ce que tu as accompli n'est perdu.\n\n" + texteDiplomeExamen());
		if (typeof majEtat === "function") majEtat();
	});
	return "";
};

/* Le formateur vérifie un code de diplôme, de certificat ou d'épreuve finale. */
Shell.sorts.verifier = function(args, io){
	if (!args.length) throw new ShellError("verifier : quel code ? Utilisation : verifier CODE (le code imprimé sur un diplôme ou un certificat)");
	var lu = lireCode(args.join(""));
	if (!lu) return C.rouge("Code illisible.") + " Ce n'est pas un code de Terminus, ou il est incomplet.";
	var quoi = { 1: "Diplôme du chapitre 1 (Terminus)", 2: "Certificat cyber (la Crypte)", 3: "Certificat réseau (la panne)", 4: "Épreuve finale (la Forteresse)" }[lu.chapitre] || "Chapitre " + lu.chapitre;
	return (lu.valide ? C.vert("✓ Code authentique") : C.rouge("✗ Code RETOUCHÉ : la somme de contrôle ne correspond pas")) + "\n\n" +
		"  " + completerDroite("Document", 14) + quoi + "\n" +
		"  " + completerDroite("Nom", 14) + lu.prenom + "\n" +
		"  " + completerDroite("Note", 14) + lu.note + " / 20" + (lu.chapitre === 4 ? "" : "   (" + lu.score + " XP sur " + lu.max + ")") + "\n" +
		"  " + completerDroite("Temps", 14) + dureeExamen(lu.minutes) + "\n" +
		"  " + completerDroite("Commandes", 14) + lu.commandes + "\n" +
		(lu.chapitre === 4 ? "  " + completerDroite("Fin", 14) + (lu.indices ? "kamikaze (copie rendue avant la fin)" : "Forteresse reprise") + "\n" :
			"  " + completerDroite("Indices", 14) + lu.indices + "\n") +
		"  " + completerDroite("Date", 14) + lu.date;
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
Shell.sorts.indice = refusExamen("Pas d'indice pendant l'épreuve finale. man reste ton seul allié.")(Shell.sorts.indice);
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
var CHAPITRE_HORS_EXAMEN = GameState.prototype.chapitreEnCours;
GameState.prototype.chapitreEnCours = function(){ if (this.examen && modeExamen()) return 4; return CHAPITRE_HORS_EXAMEN.apply(this, arguments); };
var QUETE_HORS_EXAMEN = GameState.prototype.queteEnCours;
GameState.prototype.queteEnCours = function(){
	if (this.examen && modeExamen()){
		return { id: "examen", titre: this.examen.fini ? "Épreuve finale terminée · " + pointsExamen() + " / 20" :
			"Épreuve finale · " + nbReussiesExamen() + " sur " + EPREUVES_EXAMEN.length + " · " + pointsExamen() + " / 20",
			indice: this.examen.fini ? "examen : ton diplôme et son code. examen quitter : revenir à ta partie." : "Pas d'aide : ton ordre de mission est dans tes quartiers. examen : le bilan. kamikaze : rendre ta copie." };
	}
	return QUETE_HORS_EXAMEN.apply(this, arguments);
};

/* Le monde du chapitre 1 ne bouge pas pendant l'épreuve : seule la Forteresse est vérifiée. */
var VERIFIER_MONDE_HORS_EXAMEN = verifierMonde;
verifierMonde = function(){
	if (examenEnCours()){ verifierExamen(); return; }
	return VERIFIER_MONDE_HORS_EXAMEN.apply(this, arguments);
};

GameEvents.addListener("read", function(e){
	if (examenEnCours() && e.item === OrdreExamen) state.examen.ordreLu = true;
});

/* Le bandeau de droite pendant l'épreuve (appelé par majEtat, dans Game.js). */
function majEtatExamen(){
	if (!examenEnCours() || typeof document === "undefined") return false;
	var niveau = document.getElementById("etat-niveau");
	niveau.textContent = state.examen.fini ? "Épreuve finale · copie rendue" : "Épreuve finale · " + nbReussiesExamen() + " / " + EPREUVES_EXAMEN.length + " épreuves";
	if (typeof remplirBarre === "function") remplirBarre(pointsExamen());
	document.getElementById("etat-xp").textContent = pointsExamen() + " / 20 · " + dureeExamen(minutesExamen());
	document.getElementById("etat").title = "L'épreuve finale. Tape examen pour le bilan.";
	document.getElementById("etat").classList.toggle("etat-alerte", !state.examen.fini);
	return true;
}

/* À l'ouverture de la page en mode examen (appelé par accueillir, dans Game.js). */
function accueillirExamen(){
	if (!modeExamen()) return false;
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
