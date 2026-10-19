/**
 * Annexe.js : le second acte du chapitre 2 (la panne), l'Annexe et son Wi-Fi.
 *
 * Une fois le bâtiment B réparé, Radia envoie la recrue à l'Annexe, la cafétéria des étudiants :
 * le stagiaire est passé là aussi. On y répare, toujours de bas en haut :
 *   la radio coupée (rfkill), le vrai réseau Wi-Fi face à un jumeau (iw, nmcli),
 *   la mairie de l'Annexe (le DHCP) dont la plage sort de la rue (ipcalc, dhcpd.conf), le passage de la
 *   borne (sysctl ip_forward), la zone DNS de l'Annexe (named-checkzone), un port du switch
 *   éteint (ip link, lldpctl) et un programme qui avale tout le débit (iftop, nethogs).
 * Et dans la boîte à outils de Vint : arp-scan, fping, whois, chronyc, smbclient, vnstat, conntrack.
 *
 * Comme le reste de la panne, c'est le chapitre 2 pour le joueur et le numéro 3 dans le code.
 */

var RESEAU_ANNEXE = "10.0.94.0/26";
var IP_BORNE = "10.0.94.1";              // la borne, côté Annexe (br0 : le Wi-Fi et le switch)
var IP_BORNE_COEUR = "10.0.92.94";       // la même borne, côté cœur du réseau (eth0)
var IP_SWITCH = "10.0.94.2";
var IP_AFFICHAGE = "10.0.94.40";
var IP_FAUX_AP = "192.168.66.1";
var IP_FAUSSE = "192.168.66.23";
var MAC_BORNE_WIFI = "52:54:00:5e:94:01";
var MAC_PORTABLE = "52:54:00:7a:31:0c";
var BSSID_FAUX = "02:" + sha256("bssid-faux").substring(0, 10).match(/../g).join(":");
var SSID_BON = "Cybersup-Etudiants";
var SSID_FAUX = "Cybersup-Free";
var MDP_WIFI = aleaChoix("mdp-wifi", ["Cafet", "Croissant", "Pause", "Annexe", "Expresso"]) + "-" + aleaEntier("mdp-wifi-n", 1000, 9999);
var DOMAINE_FAUX = "cybersup-free.net";
var IP_CDN = "203.0.113.80";
var NOM_CDN = "cdn.videos-promo.example";

function etatAnnexeInitial(){
	return {
		rfkill: true,          // la radio Wi-Fi du portable est coupée (mode avion)
		bluetooth: true,
		wlan: false,           // wlan0 est-elle UP ?
		ssid: null,            // le réseau Wi-Fi auquel le portable est associé
		adresse: null,         // l'adresse du portable (DHCP de la borne, ou du faux point d'accès)
		forward: false,        // net.ipv4.ip_forward sur la borne
		forwardGrave: false,   // la ligne est active dans /etc/sysctl.conf (et sysctl -p l'a appliquée)
		zone: false,           // la zone annexe.cybersup.lan est chargée par named, sur le routeur
		zoneValeurs: {},
		ports: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false, 8: false },
		scanVu: false
	};
}
function annexe(){
	if (!state.panne) state.panne = etatPanneInitial();
	if (!state.panne.annexe) state.panne.annexe = etatAnnexeInitial();
	return state.panne.annexe;
}
function annexeOuverte(){ return state.has("panneOuverte") && !!state.quests["r_telnet"]; }
function queteAnnexe(id){ if (annexeOuverte()) state.complete(id); }

/* ------------------------------------------------------------------ */
/* Les lieux : l'Annexe, le portable de la cafétéria, et trois machines */
/* ------------------------------------------------------------------ */

var Annexe = lieuDuChapitre3(new Room("Annexe",
	"L'Annexe, la cafétéria des étudiants : des tables hautes, une machine à café qui siffle, et au mur un grand écran tout noir. \
Sur le comptoir, le Portable de la cafétéria attend qu'on s'y assoie (cd Portable). Gaspard, le régisseur, tape du pied.",
	"loc_annexe.gif"));
Annexe.owner = "root";
Annexe.mode = "rwxr-xr-x";

var Gaspard = new Item("Gaspard",
	"« Gaspard, régisseur de l'Annexe. Depuis hier soir : plus de Wi-Fi, l'écran de la cafétéria est tout noir, et le stagiaire de Vint est passé « faire des tests ».\n\n" +
	"Le portable du comptoir ne voit même plus le Wi-Fi. Vint m'a laissé son CarnetDeLAnnexe et sa BoiteAOutils. Le code du Wi-Fi est sur l'AfficheWifi. »",
	"item_gaspard.gif").personnage();
var AfficheWifi = new Item("AfficheWifi",
	"WI-FI DES ÉTUDIANTS\n\n" +
	"  Réseau        : " + SSID_BON + "\n" +
	"  Mot de passe  : " + MDP_WIFI + "\n\n" +
	SSID_BON + " est le SEUL réseau de l'école, protégé par mot de passe (WPA2).\n" +
	"Un réseau au nom voisin, ouvert à tous, n'est pas le nôtre : n'y entre pas.",
	"item_sign.gif").revele("s_r_jumeau");
var CarnetDeLAnnexe = new Item("CarnetDeLAnnexe",
	"LE CARNET DE L'ANNEXE (Vint)\n" +
	"L'Annexe a son propre réseau, 10.0.94.0/26, derrière la borne Wi-Fi.\n\n" +
	"  rfkill list                     les radios coupées (le mode avion)\n" +
	"  sudo rfkill unblock wifi        rallumer le Wi-Fi\n" +
	"  sudo iw dev wlan0 scan          les réseaux Wi-Fi autour\n" +
	"  iw dev wlan0 link               à quoi je suis connecté, et le signal\n" +
	"  nmcli device wifi connect NOM password MDP\n" +
	"  ipcalc 10.0.94.0/26             les adresses permises d'un réseau\n" +
	"  sysctl net.ipv4.ip_forward      la borne fait-elle passer ? (1 : oui)\n\n" +
	"La borne s'administre depuis le Poste du BatimentB, ou d'ici : ssh borne.",
	"item_manuscript.gif").enseigne("rfkill", "iw", "ipcalc", "sysctl").revele("s_r_ipcalc", "s_r_signal", "s_r_sysctl");
var BoiteAOutils = new Item("BoiteAOutils",
	"LA BOÎTE À OUTILS DE VINT (sous le comptoir)\n\n" +
	"  sudo arp-scan -l              toutes les machines de ta rue\n" +
	"  fping -a -g RÉSEAU            appeler tout un réseau d'un coup\n" +
	"  whois DOMAINE                 à qui est un nom de domaine, depuis quand\n" +
	"  chronyc sources               les horloges qu'écoute un serveur\n" +
	"  smbclient -L //intranet -N    les dossiers partagés d'un serveur",
	"item_box.gif").enseigne("arp-scan", "fping", "whois", "chronyc", "smbclient")
	.revele("s_r_arpscan", "s_r_fping", "s_r_whois", "s_r_chrony", "s_r_smb");
var BoitierSousLaTable = new Item("BoitierSousLaTable",
	"Un petit boîtier noir scotché sous une table, avec une antenne et une batterie. C'est lui qui annonce le réseau « " + SSID_FAUX + " ».\n" +
	"Une étiquette : « portail de connexion : connexion." + DOMAINE_FAUX + " ».\n\n" +
	"Un faux point d'accès (un « jumeau maléfique ») : qui s'y connecte lui confie tout ce qu'il envoie. Gaspard l'a mis de côté pour Vint.",
	"item_boitier.gif");
[Gaspard, AfficheWifi, CarnetDeLAnnexe, BoiteAOutils].forEach(function(i){ Annexe.addItem(i); });

var Portable = lieuDuChapitre3(new Room("Portable",
	"Le portable de la cafétéria, posé sur le comptoir. Son écran affiche une petite icône d'avion. Chaque sort lancé ici s'exécute sur lui.",
	"loc_portable.gif"));
Portable.racineHote = "portable";
Portable.owner = "root";
Portable.mode = "rwxr-xr-x";
link_rooms(Annexe, Portable);
fichier(Portable, "PostIt", "Un post-it collé sur l'écran : « Le stagiaire a joué avec le mode avion. Bon courage. Gaspard »", { image: "item_sign.gif" });

/* Depuis où les machines de l'Annexe s'administrent : le Poste du bâtiment B, ou le portable de la cafétéria. */
function depuisPortable(){
	if (Shell.hote() === "portable") return true;
	return Shell.pile_ssh.some(function(l){ return racineDe(l) === Portable; });
}
function refusAnnexe(nom){
	return function(){
		if (!annexeOuverte()) return "ssh : Could not resolve hostname " + nom + ": Name or service not known\n" +
			C.gris("(Cette machine est à l'Annexe : Radia t'y enverra une fois le bâtiment B réparé.)");
		if (depuisPosteB() || depuisPortable()) return null;
		return "ssh : connect to host " + nom + " port 22 : Connection timed out\n" +
			C.gris("(Les équipements de l'Annexe s'administrent depuis le Poste du BatimentB ou depuis le Portable de l'Annexe.)");
	};
}

var Borne = machine3("borne", "Le Relais sans fil, la borne Wi-Fi de l'Annexe : il relie le Wi-Fi et le switch de la cafétéria (la rue 10.0.94.0/26) au reste de la ville. \
La petite mairie de l'Annexe y tient aussi son guichet : elle attribue les adresses (son serveur DHCP).", "loc_borne.gif");
var BorneEtc = dossier3(Borne, "etc", "La configuration de la borne.", { image: "loc_etc.gif" });
var BorneDhcp = dossier3(BorneEtc, "dhcp", "La configuration du serveur DHCP de l'Annexe.", { image: "loc_etc.gif" });
fichier(BorneEtc, "hostname", "borne");
var DhcpdBorne = fichier(BorneDhcp, "dhcpd.conf",
	"# isc-dhcp-server : les adresses de l'Annexe (Wi-Fi et switch)\n" +
	"subnet 10.0.94.0 netmask 255.255.255.192 {\n" +
	"  range 10.0.94.100 10.0.94.150;   # modifié par stagiaire : « plus de place »\n" +
	"  option routers " + IP_BORNE + ";\n" +
	"  option domain-name-servers " + IP_DNS + ";\n" +
	"  option domain-search \"annexe.cybersup.lan\", \"cybersup.lan\";\n" +
	"}\n");
var SysctlBorne = fichier(BorneEtc, "sysctl.conf",
	"# /etc/sysctl.conf : réglages du noyau, appliqués à chaque démarrage (et par sysctl -p)\n" +
	"#\n" +
	"# La borne fait passer les paquets entre l'Annexe et l'école :\n" +
	"#net.ipv4.ip_forward=1\n");
fichier(Borne, "NoticeDeLaBorne",
	"NOTICE DE LA BORNE (Vint)\n" +
	"br0 (10.0.94.1) : le Wi-Fi et le switch de l'Annexe. eth0 (10.0.92.94) : l'école.\n" +
	"Elle attribue les adresses (isc-dhcp-server) et transmet le courrier d'une rue à l'autre (ip_forward).\n\n" +
	"  sudo iftop        QUI consomme le débit, en direct\n" +
	"  sudo nethogs      QUEL programme consomme, sur la machine où on le lance\n" +
	"  vnstat            la consommation, jour par jour\n" +
	"  sudo conntrack -L les connexions qui traversent la borne\n\n" +
	"Config : /etc/dhcp/dhcpd.conf et /etc/sysctl.conf.",
	{ enseigne: ["iftop", "nethogs", "vnstat", "conntrack"], revele: ["s_r_vnstat", "s_r_conntrack"], image: "item_manuscript.gif" });

var Switch = machine3("switch", "La Rangée de Boîtes, le switch de l'Annexe : huit ports, comme huit boîtes aux lettres au bout de huit câbles. Ses voyants clignotent... sauf deux.", "loc_switch.gif");
fichier(Switch, "CarnetDuSwitch",
	"LE CARNET DU SWITCH (Vint)\n\n" +
	"  port1        la borne\n" +
	"  port2        l'imprimante (partie en réparation, câble débranché)\n" +
	"  port3 à 6    les postes de la salle d'étude\n" +
	"  port7        l'écran de la cafétéria (affichage)\n" +
	"  port8        la prise du couloir : COUPÉE EXPRÈS, personne n'a à s'y brancher\n\n" +
	"ip link : l'état des ports. sudo ip link set portN up : rallumer un port.\n" +
	"lldpctl : qui est branché où (les machines s'annoncent sur leur câble).",
	{ enseigne: ["lldpctl"], revele: ["s_r_lldp"], image: "item_manuscript.gif" });

var Affichage = machine3("affichage", "Le Grand Tableau, l'écran de la cafétéria : un petit ordinateur collé derrière la dalle, qui affiche le menu et les vidéos de l'école.", "loc_affichage.gif");

var RouteurBind = dossier3(RouteurEtc, "bind", "Le serveur DNS du routeur : la zone de l'Annexe.", { image: "loc_etc.gif" });
var ZoneAnnexe = fichier(RouteurBind, "annexe.zone",
	"$TTL 300\n" +
	"@          IN SOA routeur.cybersup.lan. vint.cybersup.lan. ( 2026101001 3600 600 86400 300 )\n" +
	"@          IN NS  routeur.cybersup.lan.\n" +
	"borne      IN A   " + IP_BORNE + "\n" +
	"switch     IN A   " + IP_SWITCH + "\n" +
	"affichage  IN A   10.0.94.300   ; l'écran de la cafétéria (étiquette au dos de la dalle : " + IP_AFFICHAGE + ")\n");
fichier(RouteurBind, "MemoZone",
	"MÉMO DE VINT : LA ZONE DE L'ANNEXE\n" +
	"Le routeur sert aussi les noms de l'Annexe : named, zone annexe.cybersup.lan.\n" +
	"Les adresses de l'Annexe sont fixes : borne " + IP_BORNE + ", switch " + IP_SWITCH + ", écran de la cafétéria " + IP_AFFICHAGE + ".\n" +
	"(Les portables reçoivent la leur de la borne, par DHCP : elles ne vont jamais dans la zone.)\n\n" +
	"  sudo named-checkzone annexe.cybersup.lan annexe.zone   vérifier le fichier\n" +
	"  sudo nano annexe.zone                                  le corriger\n" +
	"  sudo systemctl reload named                            le recharger\n\n" +
	"Sans vérifier d'abord, une seule faute et named refuse toute la zone.",
	{ enseigne: ["named-checkzone"], revele: ["s_r_dig_annexe"], image: "item_manuscript.gif" });

/* ------------------------------------------------------------------ */
/* La description des machines                                         */
/* ------------------------------------------------------------------ */

decrireHote("portable", { arrivee: function(){ return Portable; }, noyau: "6.1.0-25-amd64", panne: true, chassis: "laptop",
	refus: function(){
		return "ssh : connect to host portable port 22 : Connection refused\n" +
			C.gris("(Le portable de la cafétéria n'a pas de serveur ssh : on s'assoit devant. cd ~/Cybersup/Annexe/Portable)");
	},
	ports: {},
	services: { "NetworkManager": service("portable", "NetworkManager", "Network Manager") } });
Object.defineProperty(HOTES["portable"], "ip", { configurable: true, get: function(){ return annexe().adresse; } });
decrireHote("borne", { ip: IP_BORNE_COEUR, arrivee: function(){ return Borne; }, refus: refusAnnexe("borne"), noyau: "6.1.0-25-arm64", panne: true, chassis: "embedded",
	ports: { 22: port("ssh", BANNIERE_SSH) },
	services: {
		sshd: service("borne", "sshd", "OpenBSD Secure Shell server"),
		hostapd: service("borne", "hostapd", "Access point and authentication server for Wi-Fi"),
		"isc-dhcp-server": service("borne", "isc-dhcp-server", "ISC DHCP IPv4 server", { actif: false, procNom: "dhcpd" }),
		chrony: service("borne", "chrony", "chrony, an NTP client/server", { procNom: "chronyd" }),
		vnstat: service("borne", "vnstat", "vnStat network traffic monitor")
	} });
decrireHote("switch", { ip: IP_SWITCH, arrivee: function(){ return Switch; }, refus: refusAnnexe("switch"), noyau: "6.1.0-25-arm64", panne: true, chassis: "embedded",
	ports: { 22: port("ssh", BANNIERE_SSH) },
	services: { sshd: service("switch", "sshd", "OpenBSD Secure Shell server"), lldpd: service("switch", "lldpd", "LLDP daemon") } });
decrireHote("affichage", { ip: IP_AFFICHAGE, arrivee: function(){ return Affichage; }, refus: refusAnnexe("affichage"), noyau: "6.1.0-25-arm64", panne: true, chassis: "embedded",
	ports: { 22: port("ssh", BANNIERE_SSH) },
	services: {
		sshd: service("affichage", "sshd", "OpenBSD Secure Shell server"),
		lldpd: service("affichage", "lldpd", "LLDP daemon"),
		"synchro-videos": service("affichage", "synchro-videos", "Synchronisation des vidéos de l'écran", { execStart: "/usr/local/bin/synchro-videos --qualite 4k --boucle", restart: "always", owner: "affichage" })
	} });
HOTES["routeur"].services.named = service("routeur", "named", "BIND Domain Name Server");
HOTES["intranet"].services.smbd = service("intranet", "smbd", "Samba SMB Daemon");
HOTES["intranet"].ports[445] = port("microsoft-ds", "(SMB parle en binaire : smbclient -L //intranet -N)");
NOMS_DE_PORTS["445"] = "microsoft-ds";

Borne.addProc(tirerPids("borne-sshd", 1, 300, 999)[0], "sshd", "root", { service: "sshd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Borne.addProc(tirerPids("borne-hostapd", 1, 300, 999)[0], "hostapd", "root", { service: "hostapd", cpu: 0.3, protege: TEXTE_SERVICE_PROTEGE });
Borne.addProc(tirerPids("borne-chrony", 1, 300, 999)[0], "chronyd", "_chrony", { service: "chrony", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Switch.addProc(tirerPids("switch-sshd", 1, 300, 999)[0], "sshd", "root", { service: "sshd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Affichage.addProc(tirerPids("affichage-sshd", 1, 300, 999)[0], "sshd", "root", { service: "sshd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
var PID_SYNCHRO = tirerPids("affichage-synchro", 1, 2000, 2999)[0];
Affichage.addProc(PID_SYNCHRO, "synchro-videos", "affichage", { service: "synchro-videos", cpu: 41.0 });
Routeur.addProc(tirerPids("routeur-named", 1, 300, 999)[0], "named", "bind", { service: "named", cpu: 0.2, protege: TEXTE_SERVICE_PROTEGE });
Intranet.addProc(tirerPids("intranet-smbd", 1, 300, 999)[0], "smbd", "root", { service: "smbd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });

/* Les noms de la borne et du switch entrent dans la zone de l'école ; ceux de l'Annexe ont leur propre zone. */
ZONE_PANNE.push(["borne", IP_BORNE_COEUR], ["switch", IP_SWITCH]);
ZoneEcole.setText(ZoneEcole.getText().replace(/\n?$/, "\n") + "borne     IN A " + IP_BORNE_COEUR + "\nswitch    IN A " + IP_SWITCH + "\n");
ZoneEcole.modifie = false;
ZONE_LEGITIME.push(["borne", IP_BORNE_COEUR], ["switch", IP_SWITCH]);

/* ------------------------------------------------------------------ */
/* Ce que disent les fichiers de la borne et du routeur                */
/* ------------------------------------------------------------------ */

/* La plage du DHCP de la borne : { debut, fin } ou { erreur }. */
function confDhcpBorne(){
	var t = DhcpdBorne.getText().replace(/#.*$/gm, "");
	var s = /subnet\s+(\S+)\s+netmask\s+(\S+)\s*\{/.exec(t);
	if (!s || s[1] !== "10.0.94.0" || s[2] !== "255.255.255.192") return { erreur: "No subnet declaration for br0 (" + IP_BORNE + ").\n** Ignoring requests on br0." };
	var r = /range\s+(\S+)\s+(\S+?)\s*;/.exec(t);
	if (!r) return { erreur: "/etc/dhcp/dhcpd.conf: no range statement in subnet 10.0.94.0/26" };
	if (!ipValide(r[1]) || !ipValide(r[2])) return { erreur: "/etc/dhcp/dhcpd.conf: expecting IP address in range statement" };
	var a = nombreIp(r[1]), b = nombreIp(r[2]), base = nombreIp("10.0.94.0");
	if (!dansReseau(r[1], RESEAU_ANNEXE) || !dansReseau(r[2], RESEAU_ANNEXE)) return { erreur: "Address range " + r[1] + " to " + r[2] + " not on net 10.0.94.0/255.255.255.192!" };
	if (a > b) return { erreur: "Address range " + r[1] + " to " + r[2] + " : the first address comes after the last one." };
	if (a === base || b === base + 63) return { erreur: "Address range " + r[1] + " to " + r[2] + " includes the network or broadcast address of 10.0.94.0/26!" };
	return { debut: a, fin: b };
}
/* L'adresse que la mairie de l'Annexe donne au portable : la première libre de la plage. */
function adresseOfferte(){
	var c = confDhcpBorne();
	if (c.erreur) return null;
	var prises = [IP_BORNE, IP_SWITCH, IP_AFFICHAGE].map(nombreIp);
	for (var n = c.debut; n <= c.fin; n++){
		if (prises.indexOf(n) === -1) return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
	}
	return null;
}
function dhcpBorneActif(){ return servicePanne("borne", "isc-dhcp-server").actif; }

/* La zone de l'Annexe : la liste des noms, ou la première faute, comme named-checkzone. */
function lireZoneAnnexe(){
	var noms = {}, lignes = ZoneAnnexe.getText().split("\n");
	for (var i = 0; i < lignes.length; i++){
		var l = lignes[i].replace(/;.*$/, "").trim();
		if (!l || /^\$TTL\s+\d+$/.test(l)) continue;
		if (/^\S+\s+IN\s+(SOA|NS)\s+/.test(l)) continue;
		var m = /^(\S+)\s+(?:\d+\s+)?IN\s+(\S+)\s+(\S+)$/.exec(l);
		if (!m) return { erreur: "annexe.zone:" + (i + 1) + ": unexpected end of input", ligne: i + 1 };
		if (m[2] !== "A" && m[2] !== "CNAME" && m[2] !== "TXT") return { erreur: "annexe.zone:" + (i + 1) + ": unknown RR type '" + m[2] + "'", ligne: i + 1 };
		if (m[2] === "A" && !(ipValide(m[3]))) return { erreur: "dns_rdata_fromtext: annexe.zone:" + (i + 1) + ": near '" + m[3] + "': bad dotted quad", ligne: i + 1 };
		if (m[2] === "A") noms[m[1]] = m[3];
	}
	return { noms: noms };
}

/* ------------------------------------------------------------------ */
/* Le réseau : qui joint qui, avec l'Annexe                            */
/* ------------------------------------------------------------------ */

function presentDansAnnexe(ip){
	var an = annexe();
	if (ip === IP_BORNE || ip === IP_SWITCH) return true;
	if (ip === IP_AFFICHAGE) return an.ports[7];
	return !!(an.adresse && ip === an.adresse && an.ssid === SSID_BON && an.wlan);
}
function versAnnexe(depuis, ip, sauts, options){
	if (!presentDansAnnexe(ip)) return { ok: false, erreur: "hote", sauts: sauts };
	return arrivee(depuis, ip, sauts, options);
}
function parLaBorne(ip, sauts, options){
	if (ip === IP_BORNE_COEUR) return arrivee("borne", ip, sauts.slice(0, -1).concat([]), options);
	if (!annexe().forward) return { ok: false, erreur: "delai", sauts: sauts };
	var t = CHEMIN_AVANT_ANNEXE("borne", ip, options);
	return { ok: t.ok, erreur: t.erreur, nom: t.nom, sauts: sauts.concat(t.sauts) };
}

var CHEMIN_AVANT_ANNEXE = cheminVers;
cheminVers = function(depuis, ip, options){
	options = options || {};
	var an = annexe();
	if (depuis === "portable"){
		if (ip === "127.0.0.1" || (an.adresse && ip === an.adresse)) return arrivee("portable", ip, [], options, true);
		if (!an.wlan || !an.ssid || !an.adresse) return { ok: false, erreur: "reseau", sauts: [] };
		if (an.ssid !== SSID_BON){
			if (ip === IP_FAUX_AP) return { ok: true, sauts: [[IP_FAUX_AP, IP_FAUX_AP]], nom: null };
			return { ok: false, erreur: dansReseau(ip, "192.168.66.0/24") ? "hote" : "delai", sauts: [[IP_FAUX_AP, IP_FAUX_AP]] };
		}
		if (dansReseau(ip, RESEAU_ANNEXE)) return versAnnexe("portable", ip, [], options);
		return parLaBorne(ip, [["borne", IP_BORNE]], options);
	}
	if (depuis === "switch" || depuis === "affichage"){
		if (ip === "127.0.0.1" || ip === HOTES[depuis].ip) return arrivee(depuis, ip, [], options, true);
		if (dansReseau(ip, RESEAU_ANNEXE)) return versAnnexe(depuis, ip, [], options);
		return parLaBorne(ip, [["borne", IP_BORNE]], options);
	}
	if (depuis === "borne"){
		if (ip === IP_BORNE) return arrivee("borne", ip, [], options, true);
		if (dansReseau(ip, RESEAU_ANNEXE)) return versAnnexe("borne", ip, [], options);
		return CHEMIN_AVANT_ANNEXE("borne", ip, options);
	}
	if (dansReseau(ip, RESEAU_ANNEXE)){
		// Depuis le reste de l'école : jusqu'à la borne (côté cœur), puis à travers elle.
		var t = CHEMIN_AVANT_ANNEXE(depuis, IP_BORNE_COEUR, {});
		if (!t.ok) return t;
		var sauts = t.sauts.slice(0, -1).concat([["borne", IP_BORNE_COEUR]]);
		if (ip === IP_BORNE) return arrivee(depuis, ip, sauts.slice(0, -1), options);
		if (!an.forward) return { ok: false, erreur: "delai", sauts: sauts };
		return versAnnexe(depuis, ip, sauts, options);
	}
	return CHEMIN_AVANT_ANNEXE(depuis, ip, options);
};

var NOM_DE_IP_AVANT_ANNEXE = nomDeIp;
nomDeIp = function(ip){
	if (ip === IP_BORNE) return "borne";
	if (ip === IP_FAUX_AP) return null;
	return NOM_DE_IP_AVANT_ANNEXE(ip);
};

var ROUTES_ROUTEUR_AVANT_ANNEXE = routesDuRouteur;
routesDuRouteur = function(){
	return ROUTES_ROUTEUR_AVANT_ANNEXE().concat([{ vers: RESEAU_ANNEXE, via: IP_BORNE_COEUR, dev: "eth1", base: true }]);
};

/* Les noms de l'Annexe : seulement quand sa zone est chargée par le routeur. */
var CHERCHER_ZONE_AVANT_ANNEXE = chercherZone;
chercherZone = function(nom, type){
	var court = nomCourt(nom), seul = court.replace(/\.annexe$/, "");
	var an = annexe();
	if ((type || "A") === "A" && (/\.annexe$/.test(court) || seul === "affichage")){
		return an.zone && HOTES.routeur.services.named.actif && an.zoneValeurs[seul] ? [an.zoneValeurs[seul]] : [];
	}
	return CHERCHER_ZONE_AVANT_ANNEXE(nom, type);
};
var RESOUDRE_AVANT_ANNEXE = resoudreDepuis;
resoudreDepuis = function(depuis, nom){
	if (depuis === "portable" && !ipValide(nom) && nom !== "localhost" && !dnsRepond("portable", IP_DNS)) return { erreur: "temp" };
	return RESOUDRE_AVANT_ANNEXE(depuis, nom);
};

/* ------------------------------------------------------------------ */
/* ip : les cartes, les routes, les voisins des machines de l'Annexe   */
/* ------------------------------------------------------------------ */

function portUp(k){ var an = annexe(); return !!an.ports[k] && k !== 2; }
var INTERFACES_AVANT_ANNEXE = interfacesDe;
interfacesDe = function(h){
	var lo = { nom: "lo", lo: true, up: true, mac: "00:00:00:00:00:00", adresses: [{ ip: "127.0.0.1", prefixe: 8 }] };
	var an = annexe();
	if (h === "portable"){
		return [lo, { nom: "wlan0", up: an.wlan, mac: MAC_PORTABLE, adresses: an.adresse ? [{ ip: an.adresse, prefixe: an.ssid === SSID_BON ? 26 : 24, dhcp: true }] : [] }];
	}
	if (h === "borne"){
		return [lo, { nom: "eth0", up: true, mac: macDe(IP_BORNE_COEUR), adresses: [{ ip: IP_BORNE_COEUR, prefixe: 24 }] },
			{ nom: "eth1", up: true, mac: "52:54:00:5e:94:11", adresses: [] },
			{ nom: "wlan0", up: true, mac: MAC_BORNE_WIFI, adresses: [] },
			{ nom: "br0", up: true, mac: MAC_BORNE_WIFI, adresses: [{ ip: IP_BORNE, prefixe: 26 }] }];
	}
	if (h === "switch"){
		var liste = [lo, { nom: "br0", up: true, mac: macDe(IP_SWITCH), adresses: [{ ip: IP_SWITCH, prefixe: 26 }] }];
		for (var k = 1; k <= 8; k++) liste.push({ nom: "port" + k, up: portUp(k), mac: "52:54:00:5e:9a:0" + k, adresses: [] });
		return liste;
	}
	if (h === "affichage") return [lo, { nom: "eth0", up: true, mac: macDe(IP_AFFICHAGE), adresses: [{ ip: IP_AFFICHAGE, prefixe: 26 }] }];
	return INTERFACES_AVANT_ANNEXE(h);
};

var ROUTES_AVANT_ANNEXE = texteRoutes;
texteRoutes = function(h){
	var an = annexe();
	if (h === "portable"){
		if (!an.wlan || !an.adresse) return [];
		if (an.ssid !== SSID_BON) return ["default via " + IP_FAUX_AP + " dev wlan0 proto dhcp metric 600", "192.168.66.0/24 dev wlan0 proto kernel scope link src " + an.adresse + " metric 600"];
		return ["default via " + IP_BORNE + " dev wlan0 proto dhcp metric 600", RESEAU_ANNEXE + " dev wlan0 proto kernel scope link src " + an.adresse + " metric 600"];
	}
	if (h === "borne") return ["default via " + IP_ROUTEUR_COEUR + " dev eth0 proto static", "10.0.92.0/24 dev eth0 proto kernel scope link src " + IP_BORNE_COEUR,
		RESEAU_ANNEXE + " dev br0 proto kernel scope link src " + IP_BORNE];
	if (h === "switch") return ["default via " + IP_BORNE + " dev br0", RESEAU_ANNEXE + " dev br0 proto kernel scope link src " + IP_SWITCH];
	if (h === "affichage") return ["default via " + IP_BORNE + " dev eth0", RESEAU_ANNEXE + " dev eth0 proto kernel scope link src " + IP_AFFICHAGE];
	var lignes = ROUTES_AVANT_ANNEXE(h);
	if (h === "routeur") lignes.splice(1, 0, RESEAU_ANNEXE + " via " + IP_BORNE_COEUR + " dev eth1 proto static");
	return lignes;
};

var VOISINS_AVANT_ANNEXE = voisinsDe;
voisinsDe = function(h){
	var an = annexe();
	if (h === "portable"){
		if (!an.adresse) return [];
		if (an.ssid !== SSID_BON) return [{ ip: IP_FAUX_AP, dev: "wlan0", mac: BSSID_FAUX, etat: "REACHABLE" }];
		return [{ ip: IP_BORNE, dev: "wlan0", mac: MAC_BORNE_WIFI, etat: "REACHABLE" }];
	}
	if (h === "borne"){
		var v = [{ ip: IP_ROUTEUR_COEUR, dev: "eth0", mac: "52:54:00:5d:fe:02", etat: "REACHABLE" }, { ip: IP_SWITCH, dev: "br0", mac: macDe(IP_SWITCH), etat: "STALE" }];
		if (an.ports[7]) v.push({ ip: IP_AFFICHAGE, dev: "br0", mac: macDe(IP_AFFICHAGE), etat: "REACHABLE" });
		if (presentDansAnnexe(an.adresse)) v.push({ ip: an.adresse, dev: "br0", mac: MAC_PORTABLE, etat: "REACHABLE" });
		return v;
	}
	if (h === "switch" || h === "affichage") return [{ ip: IP_BORNE, dev: h === "switch" ? "br0" : "eth0", mac: MAC_BORNE_WIFI, etat: "REACHABLE" }];
	return VOISINS_AVANT_ANNEXE(h);
};

var MODIFIER_IP_AVANT_ANNEXE = modifierIp;
modifierIp = function(objet, action, reste, h, io){
	if (["portable", "switch", "borne", "affichage"].indexOf(h) === -1) return MODIFIER_IP_AVANT_ANNEXE(objet, action, reste, h, io);
	if (!io.sudo) throw new ShellError("RTNETLINK answers: Operation not permitted\n" + C.gris("(Changer la configuration réseau est réservé à root : sudo ip ...)"));
	if (h === "borne" || h === "affichage") throw new ShellError("ip : pas touche aux cartes de " + h + " : une erreur ici coupe toute l'Annexe, toi compris.\n" +
		C.gris(h === "borne" ? "(Sur la borne, ce qui se règle, c'est son DHCP (/etc/dhcp/dhcpd.conf) et son passage (sysctl).)" : "(L'écran est une machine en service : on l'inspecte, on ne recâble pas ses cartes.)"));
	if (objet !== "link" || action !== "set"){
		throw new ShellError(h === "portable" ? "ip : l'adresse du portable vient du DHCP de la borne (sudo dhclient wlan0). Ici, on ne touche qu'à la carte : sudo ip link set wlan0 up" :
			"ip : sur le switch, on allume ou on éteint des ports, rien d'autre. Exemple : sudo ip link set port7 up");
	}
	var carte = reste[0] === "dev" ? reste[1] : reste[0];
	var sens = reste.indexOf("up") > -1 ? "up" : (reste.indexOf("down") > -1 ? "down" : null);
	if (!carte) throw new ShellError("ip link set : quelle carte ? Exemple : sudo ip link set " + (h === "portable" ? "wlan0" : "port7") + " up");
	if (!sens) throw new ShellError("ip link set : up ou down ?");
	var an = annexe();
	if (h === "portable"){
		if (carte !== "wlan0" && carte !== "lo") throw new ShellError("Cannot find device \"" + carte + "\"");
		if (carte === "lo") return "";
		if (sens === "up" && an.rfkill) throw new ShellError("RTNETLINK answers: Operation not possible due to RF-kill" + (io.tty ? "\n" + C.gris("(La radio est coupée par logiciel, comme en mode avion : rfkill list le montre.)") : ""));
		an.wlan = sens === "up";
		if (!an.wlan){ an.ssid = null; an.adresse = null; }
		return io.tty && an.wlan ? C.gris("(wlan0 est allumée. Elle n'est encore associée à aucun réseau Wi-Fi : sudo iw dev wlan0 scan pour voir ceux qui sont là.)") : "";
	}
	var m = /^port([1-8])$/.exec(carte);
	if (!m && carte !== "br0") throw new ShellError("Cannot find device \"" + carte + "\"");
	if (carte === "br0" || m[1] === "1"){
		if (sens === "down") throw new ShellError("ip : éteindre " + carte + " couperait la borne de tout le switch, et ta propre connexion. On n'y touche pas.");
		return "";
	}
	var k = +m[1];
	an.ports[k] = sens === "up";
	GameEvents.fire({ type: "portSwitch", port: k, up: an.ports[k] });
	if (!io.tty) return "";
	if (k === 8 && sens === "up") return C.jaune("Attention : la prise du couloir était coupée exprès (CarnetDuSwitch). N'importe qui peut s'y brancher : remets-la à DOWN.");
	if (k === 2 && sens === "up") return C.gris("(port2 est allumé, mais il n'y a rien au bout du câble : l'imprimante est partie en réparation. Le port reste DOWN, faute de porteuse.)");
	if (k === 7 && sens === "up") return C.gris("(port7 est allumé : au bout du câble, l'écran de la cafétéria se réveille.)");
	return "";
};

/* ------------------------------------------------------------------ */
/* Les services de l'Annexe                                            */
/* ------------------------------------------------------------------ */

var DEMARRER_AVANT_ANNEXE = demarrerService;
demarrerService = function(hote, nom){
	if (hote === "borne" && nom === "isc-dhcp-server"){
		var c = confDhcpBorne();
		annexe().erreurDhcp = c.erreur || null;
		if (c.erreur) throw new ShellError("Job for isc-dhcp-server.service failed because the control process exited with error code.\n" +
			"See \"systemctl status isc-dhcp-server.service\" and \"journalctl -xeu isc-dhcp-server.service\" for details.");
	}
	DEMARRER_AVANT_ANNEXE(hote, nom);
	if (hote === "routeur" && nom === "named"){
		var z = lireZoneAnnexe(), an = annexe();
		an.zone = !z.erreur;
		an.erreurZone = z.erreur || null;
		if (!z.erreur) an.zoneValeurs = z.noms;
	}
};
var ECHEC_AVANT_ANNEXE = uniteEnEchec;
uniteEnEchec = function(h, nom){
	if (h === "borne" && nom === "isc-dhcp-server") return !HOTES[h].services[nom].actif;
	return ECHEC_AVANT_ANNEXE(h, nom);
};
var SYSTEMCTL_AVANT_ANNEXE = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var h = Shell.hote(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var nom = (mots[1] || "").replace(/\.service$/, "");
	if (h === "borne" && mots[0] === "status" && nom === "isc-dhcp-server" && !dhcpBorneActif()){
		var erreur = annexe().erreurDhcp || confDhcpBorne().erreur || "dhcpd exited.";
		GameEvents.fire({ type: "systemctlPanne", action: "status", host: h, service: nom });
		return "× isc-dhcp-server.service - ISC DHCP IPv4 server\n     Loaded: loaded (/lib/systemd/system/isc-dhcp-server.service; enabled; preset: enabled)\n" +
			"     Active: " + (io.tty ? C.rouge("failed") : "failed") + " (Result: exit-code)\n\n" +
			erreur.split("\n").map(function(l){ return "borne dhcpd[611]: " + l; }).join("\n") + "\nborne systemd[1]: isc-dhcp-server.service: Failed with result 'exit-code'." +
			(io.tty ? "\n" + C.gris("(Activé, mais il refuse de démarrer : c'est sa configuration qui ne va pas. La ligne range de /etc/dhcp/dhcpd.conf.)") : "");
	}
	if (h === "routeur" && mots[0] === "status" && nom === "named"){
		var sortie = SYSTEMCTL_AVANT_ANNEXE(args, io), an = annexe();
		if (!an.zone && HOTES.routeur.services.named.actif) sortie += "\n\nrouteur named[" + (HOTES.routeur.services.named.pid || 1) + "]: zone annexe.cybersup.lan/IN: not loaded due to errors." +
			(io.tty ? "\n" + C.gris("(named tourne, mais il refuse la zone de l'Annexe : une faute dans /etc/bind/annexe.zone. named-checkzone dit laquelle.)") : "");
		return sortie;
	}
	return SYSTEMCTL_AVANT_ANNEXE(args, io);
};

/* Les journaux de l'Annexe. */
Object.defineProperty(HOTES["borne"], "journal", { configurable: true, get: function(){
	var an = annexe();
	var j = [["hier 18:30", "sudo", "stagiaire : COMMAND=/usr/bin/nano /etc/dhcp/dhcpd.conf"],
		["hier 18:31", "isc-dhcp-server", "Address range 10.0.94.100 to 10.0.94.150 not on net 10.0.94.0/255.255.255.192!"],
		["hier 18:31", "isc-dhcp-server", "isc-dhcp-server.service: Failed with result 'exit-code'."],
		["hier 18:33", "sudo", "stagiaire : COMMAND=/usr/sbin/sysctl -w net.ipv4.ip_forward=0 (« pour voir »)"],
		["08:00", "hostapd", "br0: interface state UNINITIALIZED->ENABLED, SSID " + SSID_BON]];
	if (an.erreurDhcp) j.push(["09:50", "isc-dhcp-server", an.erreurDhcp.split("\n")[0]]);
	if (dhcpBorneActif()) j.push(["09:51", "isc-dhcp-server", "Started isc-dhcp-server.service - ISC DHCP IPv4 server."]);
	if (dhcpBorneActif() && presentDansAnnexe(an.adresse)) j.push(["09:52", "dhcpd", "DHCPACK on " + an.adresse + " to " + MAC_PORTABLE + " (portable) via br0"]);
	if (an.forward) j.push(["09:55", "sysctl", "net.ipv4.ip_forward = 1"]);
	return lignesDeJournal(j);
} });
Object.defineProperty(HOTES["switch"], "journal", { configurable: true, get: function(){
	var j = [["hier 18:40", "sudo", "stagiaire : COMMAND=/usr/sbin/ip link set port7 down (« ça clignotait trop »)"],
		["hier 18:40", "kernel", "br0: port 7(port7) entered disabled state"]];
	if (annexe().ports[7]) j.push(["10:05", "kernel", "br0: port 7(port7) entered forwarding state"]);
	return lignesDeJournal(j);
} });
Object.defineProperty(HOTES["affichage"], "journal", { configurable: true, get: function(){
	var j = [["hier 18:45", "systemd", "Started synchro-videos.service - Synchronisation des vidéos de l'écran."],
		["hier 18:45", "synchro-videos", "playlist : 12 vidéos en 4K, retéléchargées en boucle depuis " + NOM_CDN + " (option --boucle, ajoutée par stagiaire)"],
		["10:05", "synchro-videos", "réseau retrouvé : reprise du téléchargement (1,2 Go par vidéo)"]];
	if (!servicePanne("affichage", "synchro-videos").actif) j.push(["10:20", "systemd", "Stopped synchro-videos.service."]);
	return lignesDeJournal(j);
} });
var JOURNAL_ROUTEUR_AVANT_ANNEXE = Object.getOwnPropertyDescriptor(HOTES["routeur"], "journal").get;
Object.defineProperty(HOTES["routeur"], "journal", { configurable: true, get: function(){
	var j = JOURNAL_ROUTEUR_AVANT_ANNEXE.call(this), an = annexe();
	j = j.concat(lignesDeJournal([["hier 18:50", "sudo", "stagiaire : COMMAND=/usr/bin/nano /etc/bind/annexe.zone"],
		["06:00", "named", "dns_rdata_fromtext: annexe.zone:6: near '10.0.94.300': bad dotted quad"],
		["06:00", "named", "zone annexe.cybersup.lan/IN: not loaded due to errors."]]));
	if (an.zone) j = j.concat(lignesDeJournal([["10:00", "named", "zone annexe.cybersup.lan/IN: loaded serial 2026101001"]]));
	return j;
} });

/* Les ports ouverts des machines de l'Annexe. */
var SOCKETS_AVANT_ANNEXE = socketsDe;
socketsDe = function(h){
	var an = annexe(), s = [];
	function ajouter(proto, etat, local, pair, proc, pid){ s.push({ proto: proto, etat: etat, local: local, pair: pair, proc: proc, pid: pid }); }
	function pidDe(n){ var x = HOTES[h].services[n]; return x && x.pid ? x.pid : 1; }
	if (h === "portable"){
		ajouter("udp", "UNCONN", "127.0.0.53%lo:53", "0.0.0.0:*", "systemd-resolve", 498);
		if (an.adresse) ajouter("udp", "UNCONN", "0.0.0.0:68", "0.0.0.0:*", "NetworkManager", 611);
		return s;
	}
	if (h === "borne" || h === "switch" || h === "affichage"){
		ajouter("tcp", "LISTEN", "0.0.0.0:22", "0.0.0.0:*", "sshd", pidDe("sshd"));
		if (h === "borne" && dhcpBorneActif()) ajouter("udp", "UNCONN", "0.0.0.0:67", "0.0.0.0:*", "dhcpd", pidDe("isc-dhcp-server"));
		if (h === "borne") ajouter("udp", "UNCONN", "127.0.0.1:323", "0.0.0.0:*", "chronyd", pidDe("chrony"));
		if (h === "affichage" && servicePanne("affichage", "synchro-videos").actif) ajouter("tcp", "ESTAB", IP_AFFICHAGE + ":51514", IP_CDN + ":443", "synchro-videos", PID_SYNCHRO);
		if (Shell.pile_ssh.length) ajouter("tcp", "ESTAB", (HOTES[h].ip || IP_BORNE) + ":22", (an.adresse || adressePoste() || IP_POSTE) + ":51790", "sshd", pidDe("sshd"));
		return s;
	}
	s = SOCKETS_AVANT_ANNEXE(h);
	if (h === "routeur" && HOTES.routeur.services.named.actif){ s.splice(1, 0, { proto: "tcp", etat: "LISTEN", local: IP_ROUTEUR_COEUR + ":53", pair: "0.0.0.0:*", proc: "named", pid: pidDe("named") },
		{ proto: "udp", etat: "UNCONN", local: IP_ROUTEUR_COEUR + ":53", pair: "0.0.0.0:*", proc: "named", pid: pidDe("named") }); }
	if (h === "intranet" && HOTES.intranet.services.smbd.actif) s.splice(1, 0, { proto: "tcp", etat: "LISTEN", local: "0.0.0.0:445", pair: "0.0.0.0:*", proc: "smbd", pid: pidDe("smbd") });
	return s;
};

/* ------------------------------------------------------------------ */
/* Le Wi-Fi : rfkill, iw, nmcli et dhclient sur le portable            */
/* ------------------------------------------------------------------ */

Shell.sorts.rfkill = function(args, io){
	var h = Shell.hote(), an = annexe();
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0] || "";
	if (h !== "portable" && h !== "borne") throw new ShellError("rfkill: cannot open /dev/rfkill: No such file or directory" +
		(io.tty ? "\n" + C.gris("(" + h + " n'a aucune radio : ni Wi-Fi, ni Bluetooth. rfkill sert sur les portables et les bornes.)") : ""));
	var wifi = h === "portable" ? an.rfkill : false, bt = h === "portable" ? an.bluetooth : false;
	function b(x){ return x ? "blocked" : "unblocked"; }
	GameEvents.fire({ type: "rfkill", action: action || "table", host: h });
	if (action === ""){
		return "ID TYPE      DEVICE    SOFT      HARD\n 0 wlan      phy0   " + completerDroite(b(wifi), 10) + "unblocked" + (h === "portable" ? "\n 1 bluetooth hci0   " + completerDroite(b(bt), 10) + "unblocked" : "");
	}
	if (action === "list"){
		var t = "0: phy0: Wireless LAN\n\tSoft blocked: " + (wifi ? (io.tty ? C.rouge("yes") : "yes") : "no") + "\n\tHard blocked: no";
		if (h === "portable") t += "\n1: hci0: Bluetooth\n\tSoft blocked: " + (bt ? "yes" : "no") + "\n\tHard blocked: no";
		if (wifi && io.tty) t += "\n" + C.gris("(Soft blocked : la radio est coupée par logiciel, comme le mode avion. sudo rfkill unblock wifi la rallume. Hard blocked serait un interrupteur physique.)");
		return t;
	}
	if (action !== "block" && action !== "unblock") throw new ShellError("rfkill : utilisation ici :\n  rfkill                    l'état des radios\n  rfkill list               pareil, en détail\n  sudo rfkill unblock wifi  rallumer le Wi-Fi\n  sudo rfkill block wifi    le couper");
	if (!io.sudo) throw new ShellError("rfkill: cannot open /dev/rfkill: Permission denied\n" + C.gris("(Couper ou rallumer une radio est réservé à root : sudo rfkill " + action + " wifi)"));
	var cible = mots[1];
	if (!cible) throw new ShellError("rfkill " + action + " : quelle radio ? wifi, bluetooth ou all");
	if (h === "borne") throw new ShellError("rfkill : la radio de la borne, c'est le Wi-Fi de toute l'Annexe. On n'y touche pas.");
	var surWifi = ["wifi", "wlan", "all", "0"].indexOf(cible) > -1, surBt = ["bluetooth", "all", "1"].indexOf(cible) > -1;
	if (!surWifi && !surBt) throw new ShellError("rfkill: invalid identifier: " + cible);
	if (surBt) an.bluetooth = action === "block";
	if (surWifi){
		an.rfkill = action === "block";
		an.wlan = !an.rfkill;
		if (an.rfkill){ an.ssid = null; an.adresse = null; }
	}
	GameEvents.fire({ type: "rfkill", action: action, host: h });
	if (!io.tty) return "";
	return surWifi && !an.rfkill ? C.gris("(La radio Wi-Fi est rallumée : NetworkManager relève aussitôt wlan0. ip link le montre UP.)") : "";
};

function texteScan(){
	return "BSS " + MAC_BORNE_WIFI + "(on wlan0)\n\tfreq: 5180\n\tsignal: -58.00 dBm\n\tSSID: " + SSID_BON + "\n\tRSN:\t * Version: 1\n\t\t * Authentication suites: PSK (WPA2)\n" +
		"BSS " + BSSID_FAUX + "(on wlan0)\n\tfreq: 2437\n\tsignal: -31.00 dBm\n\tSSID: " + SSID_FAUX + "\n\t(aucune section RSN : réseau ouvert, rien n'est chiffré)";
}
function exigerRadio(cmd){
	var an = annexe();
	if (an.rfkill) throw new ShellError("command failed: Operation not possible due to RF-kill (-132)\n" + C.gris("(La radio est coupée : rfkill list.)"));
	if (!an.wlan) throw new ShellError("command failed: Network is down (-100)\n" + C.gris("(wlan0 est éteinte : sudo ip link set wlan0 up.)"));
}
Shell.sorts.iw = function(args, io){
	var h = Shell.hote(), an = annexe();
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (h !== "portable" && h !== "borne") throw new ShellError("nl80211 not found.\n" + C.gris("(" + h + " n'a pas de carte Wi-Fi. iw sert sur le portable de l'Annexe et sur la borne.)"));
	GameEvents.fire({ type: "iw", mots: mots.join(" ") });
	if (mots.length === 0 || mots[0] === "help") return "Usage ici :\n  iw dev                     les cartes Wi-Fi\n  sudo iw dev wlan0 scan     les réseaux autour\n  iw dev wlan0 link          la connexion en cours" + (h === "borne" ? "\n  iw dev wlan0 station dump  les appareils connectés à la borne" : "");
	if (mots[0] === "list" || mots[0] === "phy") return "Wiphy phy0\n\tmax # scan SSIDs: 4\n\tSupported interface modes:\n\t\t * managed\n\t\t * AP\n\tBand 1: 2,4 GHz\n\tBand 2: 5 GHz";
	if (mots[0] !== "dev") throw new ShellError("iw : commande inconnue ici. Essaie : iw dev, sudo iw dev wlan0 scan, iw dev wlan0 link");
	if (mots.length === 1){
		if (h === "borne") return "phy#0\n\tInterface wlan0\n\t\tifindex 4\n\t\taddr " + MAC_BORNE_WIFI + "\n\t\tssid " + SSID_BON + "\n\t\ttype AP\n\t\tchannel 36 (5180 MHz), width: 80 MHz";
		return "phy#0\n\tInterface wlan0\n\t\tifindex 3\n\t\taddr " + MAC_PORTABLE.toLowerCase() + (an.ssid ? "\n\t\tssid " + an.ssid : "") + "\n\t\ttype managed";
	}
	if (mots[1] !== "wlan0") throw new ShellError("command failed: No such device (-19)");
	var action = mots[2] || "";
	if (action === "scan"){
		if (!io.sudo) throw new ShellError("command failed: Operation not permitted (-1)\n" + C.gris("(Scanner les ondes est réservé à root : sudo iw dev wlan0 scan)"));
		if (h === "borne") throw new ShellError("command failed: Operation not supported (-95)\n" + C.gris("(La borne émet, elle ne cherche pas. Le scan se fait depuis le portable.)"));
		exigerRadio("scan");
		an.scanVu = true;
		GameEvents.fire({ type: "iwScan" });
		return texteScan() + (io.tty ? "\n" + C.gris("(Deux réseaux au nom voisin. Le plus fort n'est pas le plus sûr : " + SSID_FAUX + " n'a aucun chiffrement. L'AfficheWifi dit lequel est le nôtre.)") : "");
	}
	if (action === "link"){
		if (h === "borne") throw new ShellError("iw : la borne n'est connectée à personne, ce sont les autres qui se connectent à elle : iw dev wlan0 station dump");
		exigerRadio("link");
		if (!an.ssid) return "Not connected.";
		GameEvents.fire({ type: "iwLink", ssid: an.ssid });
		var bon = an.ssid === SSID_BON;
		return "Connected to " + (bon ? MAC_BORNE_WIFI : BSSID_FAUX) + " (on wlan0)\n\tSSID: " + an.ssid + "\n\tfreq: " + (bon ? "5180" : "2437") + "\n\tsignal: " + (bon ? "-58" : "-31") + " dBm\n\ttx bitrate: " + (bon ? "433.3 MBit/s VHT-MCS 9 80MHz" : "72.2 MBit/s MCS 7") +
			(io.tty ? "\n" + C.gris(bon ? "(-58 dBm : un bon signal. Plus le chiffre est proche de 0, plus le signal est fort ; en dessous de -80, ça décroche.)" : "(Connecté au réseau ouvert. Tout ce que tu envoies ici passe en clair par un boîtier inconnu.)") : "");
	}
	if (action === "station"){
		if (h !== "borne") throw new ShellError("iw : station dump se lance sur la borne.");
		if (!presentDansAnnexe(an.adresse)) return "";
		return "Station " + MAC_PORTABLE + " (on wlan0)\n\tsignal: -58 dBm\n\ttx bitrate: 433.3 MBit/s\n\tauthorized: yes\n\tconnected time: 312 seconds";
	}
	throw new ShellError("iw : action « " + action + " » inconnue ici. Essaie : sudo iw dev wlan0 scan, iw dev wlan0 link");
};

function bailPortable(){
	var an = annexe();
	if (!an.wlan || !an.ssid) return false;
	if (an.ssid === SSID_FAUX){ an.adresse = IP_FAUSSE; return true; }
	if (!dhcpBorneActif()) return false;
	an.adresse = adresseOfferte();
	return !!an.adresse;
}

var NMCLI_AVANT_ANNEXE = Shell.sorts.nmcli;
Shell.sorts.nmcli = function(args, io){
	if (Shell.hote() !== "portable") return NMCLI_AVANT_ANNEXE(args, io);
	var an = annexe(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var objet = mots[0] || "";
	GameEvents.fire({ type: "nmcli", objet: objet, host: "portable" });
	var etat = an.rfkill ? "indisponible" : (!an.wlan ? "non disponible" : (an.ssid && an.adresse ? "connecté" : "déconnecté"));
	if (/^(r|ra|rad|radio)$/.test(objet)){
		if (mots[1] !== "wifi" && mots[1] !== "all" && mots[1] !== undefined) throw new ShellError("nmcli radio : wifi ou all. Exemple : nmcli radio wifi on");
		if (!mots[2]) return an.rfkill ? "disabled" : "enabled";
		if (mots[2] === "on"){ an.rfkill = false; an.wlan = true; GameEvents.fire({ type: "rfkill", action: "unblock", host: "portable" }); return ""; }
		if (mots[2] === "off"){ an.rfkill = true; an.wlan = false; an.ssid = null; an.adresse = null; return ""; }
		throw new ShellError("nmcli radio wifi : on ou off ?");
	}
	if (/^(d|de|dev|devi|devic|device)$/.test(objet)){
		var sous = mots[1] || "status";
		if (sous === "status"){
			return "DEVICE  TYPE      ÉTAT                      CONNEXION\nwlan0   wifi      " + completerDroite(etat, 26) + (an.ssid && an.adresse ? an.ssid : "--") + "\nlo      loopback  connecté (en externe)     lo";
		}
		if (sous !== "wifi") throw new ShellError("nmcli device : status ou wifi. Exemples : nmcli device status, nmcli device wifi list");
		var act = mots[2] || "list";
		if (an.rfkill) throw new ShellError("Error: Wi-Fi radio is disabled (rfkill list).");
		if (!an.wlan) throw new ShellError("Error: Device 'wlan0' not available.");
		if (act === "list" || act === "rescan"){
			if (act === "rescan") return "";
			an.scanVu = true;
			GameEvents.fire({ type: "iwScan" });
			return "IN-USE  BSSID              SSID                MODE   CHAN  RATE        SIGNAL  BARS  SECURITY\n" +
				(an.ssid === SSID_FAUX ? "*       " : "        ") + BSSID_FAUX.toUpperCase() + "  " + completerDroite(SSID_FAUX, 20) + "Infra  6     54 Mbit/s   92      ▂▄▆█  --\n" +
				(an.ssid === SSID_BON ? "*       " : "        ") + MAC_BORNE_WIFI.toUpperCase() + "  " + completerDroite(SSID_BON, 20) + "Infra  36    540 Mbit/s  70      ▂▄▆_  WPA2";
		}
		if (act !== "connect") throw new ShellError("nmcli device wifi : list ou connect. Exemple : nmcli device wifi connect NOM password MDP");
		var ssid = mots[3];
		if (!ssid) throw new ShellError("nmcli device wifi connect : à quel réseau ? Exemple : nmcli device wifi connect " + SSID_BON + " password MDP");
		var ip = mots.indexOf("password"), mdp = ip > -1 ? mots[ip + 1] : null;
		if (ssid !== SSID_BON && ssid !== SSID_FAUX) throw new ShellError("Error: No network with SSID '" + ssid + "' found.");
		if (ssid === SSID_BON && mdp !== MDP_WIFI){
			throw new ShellError("Error: Connection activation failed: Secrets were required, but not provided." + (io.tty ? "\n" + C.gris(mdp ? "(Mauvais mot de passe. Il est sur l'AfficheWifi, dans l'Annexe.)" : "(Ce réseau est protégé : il faut « password MDP ». L'AfficheWifi le donne.)") : ""));
		}
		an.ssid = ssid;
		an.adresse = null;
		var ok = bailPortable();
		GameEvents.fire({ type: "wifiConnect", ssid: ssid, ok: ok });
		if (ssid === SSID_FAUX){
			return "Device 'wlan0' successfully activated with '" + sha256("faux").substring(0, 8) + "-…'." + (io.tty ? "\n" + C.jaune("Connecté à " + SSID_FAUX + "... un réseau ouvert, et une adresse en 192.168.66 : ce n'est pas le réseau de l'école ! Ce boîtier voit tout ce que tu envoies. Reconnecte-toi au vrai : " + SSID_BON + ".") : "");
		}
		if (!ok) return "Error: Connection activation failed: IP configuration could not be reserved (no available address, timeout, etc.)." +
			(io.tty ? "\n" + C.gris("(La radio est bien associée à la borne (iw dev wlan0 link), mais personne ne donne d'adresse : la mairie de l'Annexe ne répond pas. Son guichet est sur la borne.)") : "");
		return "Device 'wlan0' successfully activated with '" + sha256("bon").substring(0, 8) + "-…'." + (io.tty ? "\n" + C.gris("(Connecté, et une adresse reçue du DHCP de la borne : " + an.adresse + ".)") : "");
	}
	if (/^(g|ge|gen|general)$/.test(objet)) return "STATE      CONNECTIVITY  WIFI-HW  WIFI      WWAN-HW  WWAN\n" + completerDroite(etat === "connecté" ? "connecté" : "déconnecté", 11) + completerDroite(an.ssid === SSID_BON && an.adresse && an.forward ? "complète" : (an.adresse ? "limitée" : "aucune"), 14) + "activé   " + completerDroite(an.rfkill ? "désactivé" : "activé", 10) + "absent   absent";
	if (objet === "") return "wlan0: " + etat + (an.ssid && an.adresse ? " à " + an.ssid : "") + "\n        wifi (iwlwifi), " + MAC_PORTABLE.toUpperCase() + ", hw, mtu 1500" + (an.adresse ? "\n        inet4 " + an.adresse : "") +
		"\n\nlo: connecté (en externe) à lo\n\nDNS configuration:\n        servers: " + (an.adresse && an.ssid === SSID_BON ? IP_DNS : "(aucun)");
	throw new ShellError("nmcli : objet « " + objet + " » inconnu ici. Essaie : nmcli device status, nmcli device wifi list, nmcli radio wifi");
};

var DHCLIENT_AVANT_ANNEXE = Shell.sorts.dhclient;
Shell.sorts.dhclient = function(args, io){
	if (Shell.hote() !== "portable") return DHCLIENT_AVANT_ANNEXE(args, io);
	exigerSudo(io, "dhclient", "dhclient : Permission denied (il faut être root pour configurer une carte réseau)");
	var an = annexe(), carte = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "wlan0";
	if (carte !== "wlan0") throw new ShellError("Cannot find device \"" + carte + "\"" + (carte === "eth0" ? C.gris("  (Le portable n'a que le Wi-Fi : wlan0.)") : ""));
	if (args.indexOf("-r") > -1){ var avait = an.adresse; an.adresse = null; return avait && io.tty ? "DHCPRELEASE of " + avait + " on wlan0" : ""; }
	var lignes = ["Internet Systems Consortium DHCP Client 4.4.3-P1", "Listening on LPF/wlan0/" + MAC_PORTABLE, "Sending on   LPF/wlan0/" + MAC_PORTABLE,
		"DHCPDISCOVER on wlan0 to 255.255.255.255 port 67 interval 3"];
	if (!an.wlan || !an.ssid){
		lignes.push(an.wlan ? "DHCPDISCOVER on wlan0 to 255.255.255.255 port 67 interval 7" : "send_packet: Network is down", "No DHCPOFFERS received.");
		return lignes.join("\n") + (io.tty ? "\n" + C.gris(an.wlan ? "(wlan0 n'est associée à aucun réseau Wi-Fi : personne ne peut l'entendre. nmcli device wifi connect.)" : "(wlan0 est éteinte : rfkill list, puis la carte.)") : "");
	}
	var source = an.ssid === SSID_FAUX ? IP_FAUX_AP : IP_BORNE;
	if (!bailPortable()){
		lignes.push("DHCPDISCOVER on wlan0 to 255.255.255.255 port 67 interval 7", "DHCPDISCOVER on wlan0 to 255.255.255.255 port 67 interval 12", "No DHCPOFFERS received.");
		GameEvents.fire({ type: "dhclientAnnexe", ok: false });
		return lignes.join("\n") + (io.tty ? "\n" + C.gris("(La borne est là, mais sa mairie (le DHCP) ne répond pas. Va voir son service : ssh borne.)") : "");
	}
	lignes.push("DHCPOFFER of " + an.adresse + " from " + source, "DHCPREQUEST for " + an.adresse + " on wlan0 to 255.255.255.255 port 67",
		"DHCPACK of " + an.adresse + " from " + source, "bound to " + an.adresse + " -- renewal in 1800 seconds.");
	GameEvents.fire({ type: "dhclientAnnexe", ok: true });
	if (an.ssid === SSID_FAUX && io.tty) lignes.push(C.jaune("(Une adresse en 192.168.66 : donnée par le faux point d'accès, pas par l'école.)"));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* ipcalc, sysctl, named-checkzone                                     */
/* ------------------------------------------------------------------ */

function ipDeNombre(n){ return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join("."); }
function prefixeDeMasque(m){
	if (!ipValide(m)) return -1;
	var bits = m.split(".").map(function(o){ return ("00000000" + (+o).toString(2)).slice(-8); }).join("");
	return /^1*0*$/.test(bits) ? bits.indexOf("0") === -1 ? 32 : bits.indexOf("0") : -1;
}
function enBinaire(ip, prefixe){
	var b = ip.split(".").map(function(o){ return ("00000000" + (+o).toString(2)).slice(-8); }).join(".");
	var pos = prefixe + Math.floor(prefixe / 8) - (prefixe % 8 === 0 && prefixe > 0 ? 1 : 0);
	return b.substring(0, pos) + " " + b.substring(pos);
}
Shell.sorts.ipcalc = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!mots.length) throw new ShellError("ipcalc : quel réseau ? Exemple : ipcalc 10.0.94.0/26 (ou ipcalc 10.0.94.0 255.255.255.192)");
	var m = /^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/.exec(mots[0]);
	if (!m || !ipValide(m[1])) throw new ShellError("INVALID ADDRESS: " + mots[0]);
	var prefixe = m[2] !== undefined ? +m[2] : (mots[1] ? prefixeDeMasque(mots[1]) : 24);
	if (prefixe < 0 || prefixe > 32) throw new ShellError("INVALID MASK: " + (m[2] || mots[1]));
	var taille = Math.pow(2, 32 - prefixe), base = Math.floor(nombreIp(m[1]) / taille) * taille;
	var masque = masqueDe(prefixe), hotes = prefixe >= 31 ? taille : taille - 2;
	var joker = ipDeNombre(taille - 1);
	var lignes = ["Address:   " + completerDroite(m[1], 22) + enBinaire(m[1], prefixe),
		"Netmask:   " + completerDroite(masque + " = " + prefixe, 22) + enBinaire(masque, prefixe),
		"Wildcard:  " + completerDroite(joker, 22) + enBinaire(joker, prefixe), "=>",
		"Network:   " + completerDroite(ipDeNombre(base) + "/" + prefixe, 22) + enBinaire(ipDeNombre(base), prefixe),
		"HostMin:   " + ipDeNombre(prefixe >= 31 ? base : base + 1),
		"HostMax:   " + ipDeNombre(prefixe >= 31 ? base + taille - 1 : base + taille - 2),
		"Broadcast: " + ipDeNombre(base + taille - 1),
		"Hosts/Net: " + completerDroite(String(hotes), 21) + (/^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(m[1]) ? "Private Internet" : "")];
	if (io.tty) lignes.push(C.gris("(Un /" + prefixe + " compte " + taille + " adresses : la première est le nom du réseau, la dernière sert à la diffusion. Il en reste " + hotes + " pour les machines, de " +
		ipDeNombre(base + 1) + " à " + ipDeNombre(base + taille - 2) + ".)"));
	GameEvents.fire({ type: "ipcalc", reseau: ipDeNombre(base) + "/" + prefixe });
	return lignes.join("\n");
};

function valeursSysctl(h){
	var an = annexe();
	return {
		"net.ipv4.ip_forward": h === "borne" ? (an.forward ? 1 : 0) : (h === "routeur" ? 1 : 0),
		"net.ipv4.conf.all.rp_filter": 2,
		"net.ipv4.icmp_echo_ignore_all": 0,
		"net.ipv6.conf.all.disable_ipv6": 0,
		"kernel.hostname": h,
		"vm.swappiness": 60
	};
}
function appliquerSysctlBorne(cle, valeur, io){
	var an = annexe();
	if (cle !== "net.ipv4.ip_forward") throw new ShellError("sysctl : ici, on ne règle que net.ipv4.ip_forward. Le reste tourne très bien comme il est.");
	if (valeur !== "0" && valeur !== "1") throw new ShellError("sysctl: setting key \"" + cle + "\": Invalid argument");
	an.forward = valeur === "1";
	return cle + " = " + valeur;
}
Shell.sorts.sysctl = function(args, io){
	var h = Shell.hote(), vals = valeursSysctl(h);
	var ecrire = args.indexOf("-w") > -1, tout = args.indexOf("-a") > -1, charger = args.indexOf("-p") > -1;
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	GameEvents.fire({ type: "sysctl", host: h });
	if (tout) return Object.keys(vals).map(function(k){ return k + " = " + vals[k]; }).join("\n");
	if (charger){
		if (!io.sudo) throw new ShellError("sysctl: permission denied on key \"net.ipv4.ip_forward\"\n" + C.gris("(Changer un réglage du noyau est réservé à root : sudo sysctl -p)"));
		if (h !== "borne") return "";
		var actives = lignesDe(SysctlBorne.getText()).map(function(l){ return l.replace(/#.*$/, "").trim(); }).filter(Boolean);
		var sorties = actives.map(function(l){
			var p = /^(\S+?)\s*=\s*(\S+)$/.exec(l);
			if (!p) throw new ShellError("sysctl: /etc/sysctl.conf: invalid syntax, continuing...");
			return appliquerSysctlBorne(p[1], p[2], io);
		});
		if (actives.some(function(l){ return /^net\.ipv4\.ip_forward\s*=\s*1$/.test(l); })){ annexe().forwardGrave = true; queteAnnexe("s_r_sysctl"); }
		return sorties.join("\n") + (!sorties.length && io.tty ? C.gris("(Rien à appliquer : toutes les lignes de /etc/sysctl.conf sont en commentaire (#).)") : "");
	}
	if (!mots.length) throw new ShellError("sysctl : quel réglage ? Exemples : sysctl net.ipv4.ip_forward, sysctl -a, sudo sysctl -w net.ipv4.ip_forward=1");
	var sortie = [];
	mots.forEach(function(m){
		var p = /^([^=]+)=(.*)$/.exec(m);
		if (p){
			if (!ecrire) throw new ShellError("sysctl: \"" + m + "\" is an unknown key\n" + C.gris("(Pour changer un réglage : sudo sysctl -w " + m + ")"));
			if (!io.sudo) throw new ShellError("sysctl: permission denied on key \"" + p[1] + "\"\n" + C.gris("(sudo sysctl -w " + m + ")"));
			if (!vals.hasOwnProperty(p[1])) throw new ShellError("sysctl: cannot stat /proc/sys/" + p[1].replace(/\./g, "/") + ": No such file or directory");
			if (h !== "borne") throw new ShellError("sysctl : sur " + h + ", ce réglage est très bien comme il est." + (h === "routeur" ? C.gris("  (Le routeur fait déjà passer les paquets : ip_forward = 1.)") : ""));
			sortie.push(appliquerSysctlBorne(p[1], p[2], io));
			if (io.tty && p[1] === "net.ipv4.ip_forward" && p[2] === "1") sortie.push(C.gris("(Réglé pour maintenant. Au prochain démarrage, la borne relira /etc/sysctl.conf, où la ligne est en commentaire : pour que ça dure, il faut l'y écrire.)"));
			return;
		}
		if (!vals.hasOwnProperty(m)) throw new ShellError("sysctl: cannot stat /proc/sys/" + m.replace(/\./g, "/") + ": No such file or directory");
		sortie.push(m + " = " + vals[m]);
		if (io.tty && m === "net.ipv4.ip_forward" && !vals[m] && h === "borne") sortie.push(C.gris("(0 : la borne ne fait passer aucun paquet d'une carte à l'autre. Le Wi-Fi est un cul-de-sac.)"));
	});
	return sortie.join("\n");
};

Shell.sorts["named-checkzone"] = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (mots.length < 2) throw new ShellError("usage: named-checkzone ZONE FICHIER\n" + C.gris("(Exemple : sudo named-checkzone annexe.cybersup.lan /etc/bind/annexe.zone)"));
	var trouve = Shell.objetLisible(mots[1], io, "named-checkzone");
	GameEvents.fire({ type: "checkzone" });
	if (trouve.item !== ZoneAnnexe){
		return "zone " + mots[0] + "/IN: loaded serial 1\nOK" + (io.tty ? "\n" + C.gris("(Rien à redire : mais la zone qui pose problème, c'est annexe.zone.)") : "");
	}
	if (mots[0].replace(/\.$/, "") !== "annexe.cybersup.lan") throw new ShellError("zone " + mots[0] + "/IN: NS 'routeur.cybersup.lan' has no address records (A or AAAA)\nzone " + mots[0] + "/IN: not loaded due to errors.\n" +
		C.gris("(Le premier argument est le nom de la zone : annexe.cybersup.lan)"));
	var z = lireZoneAnnexe();
	if (z.erreur) return z.erreur + "\nzone annexe.cybersup.lan/IN: loading from master file " + mots[1] + " failed: bad dotted quad\nzone annexe.cybersup.lan/IN: not loaded due to errors." +
		(io.tty ? "\n" + C.gris("(Ligne " + z.ligne + " : une adresse IP, ce sont quatre nombres de 0 à 255. Corrige-la avec sudo nano, puis recharge : sudo systemctl reload named.)") : "");
	var ecran = z.noms.affichage;
	if (ecran && ecran !== IP_AFFICHAGE && io.tty){
		return "zone annexe.cybersup.lan/IN: loaded serial 2026101001\nOK\n" +
			C.gris("(La syntaxe est bonne, mais affichage pointe vers " + ecran + " : ce n'est pas l'adresse de l'écran. L'étiquette au dos de la dalle dit " + IP_AFFICHAGE + " (voir aussi le MemoZone). Corrige, puis sudo systemctl reload named.)");
	}
	return "zone annexe.cybersup.lan/IN: loaded serial 2026101001\nOK" + (io.tty && !annexe().zone ? "\n" + C.gris("(Le fichier est bon. Reste à le faire relire à named : sudo systemctl reload named.)") : "");
};

/* ------------------------------------------------------------------ */
/* lldpctl, iftop, nethogs, vnstat, conntrack                          */
/* ------------------------------------------------------------------ */

function voisinLldp(h){
	var an = annexe(), v = [];
	function ajout(iface, nom, port, descr){ v.push({ iface: iface, nom: nom, port: port, descr: descr }); }
	if (h === "switch"){
		ajout("port1", "borne", "eth1", "la borne Wi-Fi de l'Annexe");
		for (var k = 3; k <= 6; k++) ajout("port" + k, "etude-" + (k - 2), "eth0", "poste de la salle d'étude");
		if (an.ports[7]) ajout("port7", "affichage", "eth0", "l'écran de la cafétéria");
		if (an.ports[8]) ajout("port8", "(personne)", "-", "la prise du couloir");
	} else if (h === "borne"){
		ajout("eth1", "switch", "port1", "le switch de l'Annexe");
		ajout("eth0", "coeur-sw2", "ge-0/0/14", "le cœur du réseau de l'école");
	} else if (h === "affichage"){
		ajout("eth0", "switch", "port7", "le switch de l'Annexe");
	}
	return v;
}
Shell.sorts.lldpctl = function(args, io){
	var h = Shell.hote();
	if (["switch", "borne", "affichage", "portable"].indexOf(h) === -1) throw new ShellError("lldpctl: unable to connect to lldpd daemon (lldpd n'est pas installé sur " + h + ")\n" + C.gris("(lldpd tourne sur le switch, la borne et l'écran de l'Annexe.)"));
	if (h === "portable") return "-------------------------------------------------------------------------------\nLLDP neighbors:\n-------------------------------------------------------------------------------" + (io.tty ? "\n" + C.gris("(Personne : LLDP voyage sur les câbles, pas par le Wi-Fi.)") : "");
	var filtre = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var liste = voisinLldp(h).filter(function(v){ return !filtre || v.iface === filtre; });
	var lignes = ["-------------------------------------------------------------------------------", "LLDP neighbors:", "-------------------------------------------------------------------------------"];
	liste.forEach(function(v){
		lignes.push("Interface:    " + v.iface + ", via: LLDP", "  Chassis:", "    SysName:      " + v.nom, "    SysDescr:     " + v.descr, "  Port:", "    PortID:       ifname " + v.port,
			"-------------------------------------------------------------------------------");
	});
	GameEvents.fire({ type: "lldpctl", host: h, sortie: lignes.join("\n") });
	if (h === "switch" && io.tty && !annexe().ports[7]) lignes.push(C.gris("(Rien sur port7 ni port8 : un port éteint ne laisse passer aucune annonce. ip link montre lesquels sont DOWN.)"));
	return lignes.join("\n");
};

function synchroActive(){ return servicePanne("affichage", "synchro-videos").actif && annexe().ports[7]; }
Shell.sorts.iftop = function(args, io){
	var h = Shell.hote();
	if (!io.sudo) throw new ShellError("pcap_open_live(br0): br0: You don't have permission to capture on that device (socket: Operation not permitted)\n" + C.gris("(Écouter le trafic est réservé à root : sudo iftop)"));
	if (h !== "borne" && h !== "routeur") throw new ShellError("iftop : sur " + h + ", il ne passe que son propre trafic. iftop sert là où tout le monde passe : la borne (ou le routeur).");
	var an = annexe(), flux = [];
	if (h === "borne"){
		if (synchroActive()) flux.push(["affichage", NOM_CDN, "1,21Mb", "94,7Mb", "237MB"]);
		if (presentDansAnnexe(an.adresse)) flux.push(["portable", "intranet", "36,0Kb", synchroActive() ? "2,10Mb" : "48,2Kb", "1,4MB"]);
		flux.push(["borne", "routeur", "1,2Kb", "1,9Kb", "18KB"]);
	} else {
		flux.push(["poste-b", "intranet", "12,1Kb", "88,3Kb", "2,2MB"]);
		if (synchroActive()) flux.push(["borne", NOM_CDN, "1,21Mb", "94,7Mb", "237MB"]);
	}
	var lignes = ["interface: " + (h === "borne" ? "br0" : "eth1"), "IP address is: " + (h === "borne" ? IP_BORNE : IP_ROUTEUR_COEUR),
		"   # Host name (port/service if enabled)            last 2s   last 10s cumulative",
		"--------------------------------------------------------------------------------"];
	flux.forEach(function(f, i){
		lignes.push(completerGauche(i + 1, 4) + " " + completerDroite(f[0], 41) + "=>  " + completerGauche(f[2], 8) + completerGauche(f[2], 10) + completerGauche(f[4].replace(/^\d+/, function(n){ return Math.max(1, Math.round(n / 40)); }), 10),
			"     " + completerDroite(f[1], 41) + "<=  " + completerGauche(f[3], 8) + completerGauche(f[3], 10) + completerGauche(f[4], 10));
	});
	lignes.push("--------------------------------------------------------------------------------",
		"Total send and receive rate:" + completerGauche(synchroActive() ? "96,0Mb" : "1,1Mb", 20));
	if (io.tty) lignes.push(C.gris(synchroActive() ? "(Une seule machine avale presque tout le débit : affichage, qui télécharge sans fin depuis " + NOM_CDN + ". Pour savoir QUEL programme : sudo nethogs, sur elle.)" :
		"(Le vrai iftop est interactif : il se rafraîchit en direct, et q le quitte. Ici, un relevé.)"));
	GameEvents.fire({ type: "iftop", host: h, glouton: synchroActive() });
	return lignes.join("\n");
};
Shell.sorts.nethogs = function(args, io){
	var h = Shell.hote();
	if (!io.sudo) throw new ShellError("You need to be root to run NetHogs!\n" + C.gris("(sudo nethogs)"));
	var glouton = h === "affichage" && synchroActive();
	var lignes = ["NetHogs version 0.8.7 (en KB/s)", "", "    PID USER       PROGRAM            SENT  RECEIVED"];
	if (glouton) lignes.push(completerGauche(PID_SYNCHRO, 7) + " affichage  synchro-videos    148,3   11842,7");
	var sshd = (HOTES[h] && HOTES[h].services && HOTES[h].services.sshd) ? HOTES[h].services.sshd.pid : null;
	if (sshd && Shell.pile_ssh.length) lignes.push(completerGauche(sshd, 7) + " root       sshd                0,4       0,1");
	var avecSshd = !!(sshd && Shell.pile_ssh.length);
	lignes.push("      ? root       unknown TCP         0,0       0,0", "", "  TOTAL                           " + (glouton ? "148,7   11842,8" : (avecSshd ? "  0,4       0,1" : "  0,0       0,0")));
	if (io.tty) lignes.push(C.gris(h === "affichage" && synchroActive() ? "(Près de 12 Mo par seconde, soit environ 95 Mbit/s, pour un seul programme : synchro-videos. C'est un service : systemctl status synchro-videos.)" :
		"(Le vrai nethogs est interactif, q le quitte. Il montre le trafic de CETTE machine, programme par programme.)"));
	GameEvents.fire({ type: "nethogs", host: h, glouton: h === "affichage" && synchroActive() });
	return lignes.join("\n");
};
Shell.sorts.vnstat = function(args, io){
	var h = Shell.hote();
	if (h !== "borne") throw new ShellError("vnstat: Error: Unable to open database \"/var/lib/vnstat/vnstat.db\" for reading: No such file or directory\n" + C.gris("(vnstat compte le trafic de la borne de l'Annexe : c'est là qu'il est installé.)"));
	GameEvents.fire({ type: "vnstat" });
	var lignes = ["", " br0 since " + dateDuJour().substring(0, 8) + "01", "", "          rx:  198,41 GiB      tx:  14,10 GiB      total:  212,51 GiB", "",
		"   daily", "                     rx      |     tx      |    total    |   avg. rate",
		"     ------------------------+-------------+-------------+---------------",
		"     hier        2,07 GiB    |  311,25 MiB |    2,37 GiB |  235,10 kbit/s",
		"     aujourd'hui " + (servicePanne("affichage", "synchro-videos").actif ? "41,37 GiB    |    1,12 GiB |   42,49 GiB |   11,02 Mbit/s" : "41,52 GiB    |    1,13 GiB |   42,65 GiB |    9,87 Mbit/s"),
		"     ------------------------+-------------+-------------+---------------",
		"     estimated   " + (servicePanne("affichage", "synchro-videos").actif ? "88,10 GiB" : "42,90 GiB") + "    |    2,38 GiB |   90,48 GiB |"];
	if (io.tty) lignes.push(C.gris("(Vingt fois plus qu'hier, et la journée n'est pas finie. Quelqu'un télécharge beaucoup trop : sudo iftop dit qui, en ce moment.)"));
	return lignes.join("\n");
};
Shell.sorts.conntrack = function(args, io){
	var h = Shell.hote();
	if (!io.sudo) throw new ShellError("conntrack v1.4.7 (conntrack-tools): Operation failed: Operation not permitted\n" + C.gris("(sudo conntrack -L)"));
	if (args.indexOf("-L") === -1 && args.indexOf("--dump") === -1) throw new ShellError("conntrack : utilisation ici : sudo conntrack -L (la liste des connexions suivies)");
	if (h !== "borne" && h !== "routeur") throw new ShellError("conntrack : rien à suivre ici : " + h + " ne fait passer le trafic de personne.");
	var an = annexe(), lignes = [];
	if (h === "borne"){
		if (synchroActive()) lignes.push("tcp      6 431999 ESTABLISHED src=" + IP_AFFICHAGE + " dst=" + IP_CDN + " sport=51514 dport=443 src=" + IP_CDN + " dst=" + IP_AFFICHAGE + " sport=443 dport=51514 [ASSURED] mark=0 use=1");
		if (presentDansAnnexe(an.adresse) && an.forward) lignes.push("udp      17 28 src=" + an.adresse + " dst=" + IP_DNS + " sport=41022 dport=53 src=" + IP_DNS + " dst=" + an.adresse + " sport=53 dport=41022 mark=0 use=1",
			"tcp      6 86397 ESTABLISHED src=" + an.adresse + " dst=" + IP_INTRANET + " sport=44310 dport=443 src=" + IP_INTRANET + " dst=" + an.adresse + " sport=443 dport=44310 [ASSURED] mark=0 use=1");
	} else {
		lignes.push("tcp      6 431980 ESTABLISHED src=" + (adressePoste() || IP_POSTE) + " dst=" + IP_ROUTEUR + " sport=51744 dport=22 src=" + IP_ROUTEUR + " dst=" + (adressePoste() || IP_POSTE) + " sport=22 dport=51744 [ASSURED] mark=0 use=1");
	}
	lignes.push("conntrack v1.4.7 (conntrack-tools): " + lignes.length + " flow entries have been shown.");
	if (io.tty && h === "borne" && !an.forward) lignes.push(C.gris("(Presque rien : avec ip_forward à 0, aucune connexion ne traverse la borne.)"));
	GameEvents.fire({ type: "conntrack", host: h, n: lignes.length - 1 });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* La boîte à outils : arp-scan, fping, whois, chronyc, smbclient      */
/* ------------------------------------------------------------------ */

Shell.sorts["arp-scan"] = function(args, io){
	var h = Shell.hote(), an = annexe();
	if (!io.sudo) throw new ShellError("You need to be root, or arp-scan must be SUID root, to open a link-layer socket.\n" + C.gris("(sudo arp-scan -l)"));
	if (args.indexOf("-l") === -1 && args.indexOf("--localnet") === -1) throw new ShellError("arp-scan : utilisation ici : sudo arp-scan -l (toute ta rue, le réseau local)");
	var iface = interfacesDe(h).filter(function(i){ return !i.lo && i.up && i.adresses.length; })[0];
	if (!iface) throw new ShellError("arp-scan: no suitable interface found." + C.gris("  (Aucune carte allumée avec une adresse : ip a.)"));
	var reseau = reseauDe(iface.adresses[0].ip, iface.adresses[0].prefixe), trouves = [];
	if (h === "poste-b"){ if (cheminVers("poste-b", IP_ROUTEUR).ok) trouves.push([IP_ROUTEUR, MAC_ROUTEUR, "(routeur)"]); }
	else if (reseau === RESEAU_ANNEXE){
		[[IP_BORNE, MAC_BORNE_WIFI, "(borne)"], [IP_SWITCH, macDe(IP_SWITCH), "(switch)"], [an.adresse, MAC_PORTABLE, "(portable)"], [IP_AFFICHAGE, macDe(IP_AFFICHAGE), "(affichage)"]].forEach(function(t){
			if (t[0] && t[0] !== iface.adresses[0].ip && presentDansAnnexe(t[0])) trouves.push(t);
		});
	} else if (an.ssid === SSID_FAUX && h === "portable") trouves.push([IP_FAUX_AP, BSSID_FAUX, "(inconnu)"]);
	else trouves.push([texteRoutes(h)[0].split(" ")[2], "52:54:00:5d:fe:02", "(passerelle)"]);
	var lignes = ["Interface: " + iface.nom + ", type: EN10MB, MAC: " + iface.mac + ", IPv4: " + iface.adresses[0].ip, "Starting arp-scan 1.10.0 with " + (Math.pow(2, 32 - iface.adresses[0].prefixe) - 2) + " hosts"];
	trouves.forEach(function(t){ lignes.push(t[0] + "\t" + t[1] + "\t" + t[2]); });
	lignes.push("", "Ending arp-scan 1.10.0: " + (Math.pow(2, 32 - iface.adresses[0].prefixe) - 2) + " hosts scanned in 1.921 seconds. " + trouves.length + " responded");
	GameEvents.fire({ type: "arpscan", host: h, reseau: reseau, n: trouves.length });
	return lignes.join("\n");
};

Shell.sorts.fping = function(args, io){
	var h = Shell.hote(), seulsVivants = false, plage = null, cibles = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-a") seulsVivants = true;
		else if (a === "-g") plage = args[++i];
		else if (a === "-ag" || a === "-ga"){ seulsVivants = true; plage = args[++i]; }
		else if (a.charAt(0) === "-") continue;
		else cibles.push(a);
	}
	var adresses = [];
	if (plage){
		var p = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(plage || "");
		if (!p || !ipValide(p[1]) || +p[2] < 24 || +p[2] > 30) throw new ShellError("fping : -g attend un réseau, de /24 à /30. Exemple : fping -a -g 10.0.94.0/26");
		var taille = Math.pow(2, 32 - +p[2]), base = Math.floor(nombreIp(p[1]) / taille) * taille;
		for (var n = base + 1; n < base + taille - 1; n++) adresses.push(ipDeNombre(n));
	} else {
		if (!cibles.length) throw new ShellError("fping : qui appeler ? Exemples : fping borne switch affichage, fping -a -g 10.0.94.0/26");
		cibles.forEach(function(c){ var r = resoudreDepuis(h, c); adresses.push(r.erreur ? c : r.ip); });
	}
	var vivants = [], morts = 0, lignes = [];
	adresses.forEach(function(ip){
		var ok = ipValide(ip) && (surPanne() ? cheminVers(h, ip).ok : false);
		if (ok){ vivants.push(ip); lignes.push(ip + (seulsVivants ? "" : " is alive")); }
		else { morts++; if (!plage && !seulsVivants) lignes.push(ip + " is unreachable"); }
	});
	if (plage && !seulsVivants && morts) lignes.push(C.gris("(... et " + morts + " adresses « is unreachable », une par ligne sur un vrai Linux. -a n'affiche que celles qui répondent.)"));
	GameEvents.fire({ type: "fping", host: h, plage: plage, vivants: vivants.length });
	return lignes.join("\n");
};

Shell.sorts.whois = function(args, io){
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!nom) throw new ShellError("whois : quel domaine ? Exemple : whois " + DOMAINE_FAUX);
	nom = nom.toLowerCase().replace(/^connexion\./, "");
	GameEvents.fire({ type: "whois", nom: nom });
	if (/\.lan$/.test(nom) || nom === "cybersup.lan") return "No whois server is known for this kind of object." + (io.tty ? "\n" + C.gris("(.lan n'existe pas sur internet : c'est un nom interne à l'école. whois interroge les registres d'internet.)") : "");
	if (nom === DOMAINE_FAUX){
		var hier = new Date(); hier.setDate(hier.getDate() - 1);
		return "Domain Name: " + DOMAINE_FAUX.toUpperCase() + "\nRegistry Domain ID: 2871" + aleaEntier("whois-id", 100000, 999999) + "_DOMAIN_NET-VRSN\nRegistrar: Registrar Anonyme Example\n" +
			"Creation Date: " + hier.toISOString().substring(0, 10) + "T17:58:12Z\nRegistry Expiry Date: " + (hier.getFullYear() + 1) + hier.toISOString().substring(4, 10) + "T17:58:12Z\n" +
			"Registrant Organization: REDACTED FOR PRIVACY\nName Server: NS1.HEBERGEUR-ANONYME.EXAMPLE\nDNSSEC: unsigned" +
			(io.tty ? "\n" + C.gris("(Créé hier soir, à 17h58, par quelqu'un qui cache son nom : rien à voir avec l'école. Un domaine tout neuf qui imite un vrai nom, c'est la signature d'un piège.)") : "");
	}
	return "No match for \"" + nom.toUpperCase() + "\".\n" + C.gris("(Ici, whois connaît " + DOMAINE_FAUX + ", le domaine du faux Wi-Fi.)");
};

Shell.sorts.chronyc = function(args, io){
	var h = Shell.hote(), action = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "tracking";
	if (["borne", "routeur", "intranet"].indexOf(h) === -1){
		throw new ShellError("506 Cannot talk to daemon" + (io.tty ? "\n" + C.gris("(Pas de chrony sur " + h + " : " + (h === "poste-b" || h === "portable" ? "il se met à l'heure avec systemd-timesyncd (timedatectl)." : "rien à régler ici.") + " chrony tourne sur les serveurs : la borne, le routeur, l'intranet.)") : ""));
	}
	GameEvents.fire({ type: "chronyc", host: h, action: action });
	if (action === "sources") return "MS Name/IP address         Stratum Poll Reach LastRx Last sample\n===============================================================================\n" +
		"^* " + completerDroite(IP_DNS, 27) + "2   6   377    21   +112us[ +140us] +/-   18ms\n^- " + completerDroite("10.0.13.1", 27) + "3   6   377    19  -2310us[-2310us] +/-   41ms" +
		(io.tty ? "\n" + C.gris("(^* : la source suivie, le serveur de temps de l'école. 377 : les huit dernières questions ont toutes eu une réponse.)") : "");
	if (action === "tracking") return "Reference ID    : 0A005C35 (" + IP_DNS + ")\nStratum         : 3\nSystem time     : 0.000112 seconds fast of NTP time\nLeap status     : Normal";
	throw new ShellError("chronyc : ici, chronyc sources ou chronyc tracking.");
};

Shell.sorts.smbclient = function(args, io){
	var h = Shell.hote(), cible = args.filter(function(a){ return /^\/\//.test(a); })[0];
	var lister = args.indexOf("-L") > -1, commande = args.indexOf("-c") > -1 ? args[args.indexOf("-c") + 1] : null;
	if (!cible) throw new ShellError("smbclient : quel serveur ? Exemples : smbclient -L //intranet -N, smbclient //intranet/eleves -N -c ls");
	var m = /^\/\/([^\/]+)(?:\/(.+))?$/.exec(cible), serveur = m[1], partage = m[2];
	var r = resoudreDepuis(h, serveur);
	if (r.erreur) throw new ShellError("do_connect: Connection to " + serveur + " failed (Error NT_STATUS_UNSUCCESSFUL)");
	var t = surPanne() ? cheminVers(h, r.ip, { proto: "tcp", port: "445" }) : { ok: false, erreur: "delai" };
	if (!t.ok) throw new ShellError("do_connect: Connection to " + serveur + " failed (Error NT_STATUS_" + (t.erreur === "refus" ? "CONNECTION_REFUSED" : "IO_TIMEOUT") + ")");
	if (args.indexOf("-N") === -1) throw new ShellError("Password for [" + JOUEUR + "@CYBERSUP]:\nsession setup failed: NT_STATUS_LOGON_FAILURE\n" + C.gris("(Sans compte sur ce serveur : -N, connexion invitée, sans mot de passe.)"));
	GameEvents.fire({ type: "smbclient", serveur: t.nom, lister: lister });
	if (lister) return "\tSharename       Type      Comment\n\t---------       ----      -------\n\televes          Disk      Les documents des étudiants\n\tprofs           Disk      Réservé aux formateurs\n\tIPC$            IPC       IPC Service (Samba 4.17)\nSMB1 disabled -- no workgroup available";
	if (partage === "profs") throw new ShellError("tree connect failed: NT_STATUS_ACCESS_DENIED" + C.gris("  (En invité, pas d'accès aux dossiers des formateurs. Et c'est très bien.)"));
	if (partage === "eleves" && commande === "ls") return "  .                                   D        0  " + dateDuJour() + "\n  ..                                  D        0  " + dateDuJour() + "\n  planning-TP-reseau.pdf              A   182114  " + dateDuJour() + "\n  sujet-partiel-B1-blanc.pdf          A    96211  " + dateDuJour() + "\n\n\t\t48797184 blocks of size 1024. 31220160 blocks available";
	throw new ShellError("smbclient : ici, smbclient -L //intranet -N (la liste), ou smbclient //intranet/eleves -N -c ls (le contenu).");
};

/* iperf3 depuis le portable : le Wi-Fi, et ce qu'en laisse le glouton. */
var IPERF_AVANT_ANNEXE = Shell.sorts.iperf3;
Shell.sorts.iperf3 = function(args, io){
	if (Shell.hote() !== "portable") return IPERF_AVANT_ANNEXE(args, io);
	var i = args.indexOf("-c"), cible = i > -1 ? args[i + 1] : null;
	if (!cible) throw new ShellError("iperf3 : il faut un serveur. Utilisation : iperf3 -c intranet");
	var r = resoudreDepuis("portable", cible);
	if (r.erreur) throw new ShellError("iperf3: error - unable to resolve host " + cible);
	var t = cheminVers("portable", r.ip);
	if (!t.ok || (t.nom || nomDeIp(r.ip)) !== "intranet") throw new ShellError("iperf3: error - unable to connect to server: " + (t.ok ? "Connection refused" : (t.erreur === "reseau" ? "Network is unreachable" : "Connection timed out")));
	var lent = synchroActive(), debit = lent ? "3,12" : "287", mo = lent ? "0,37" : "34,2";
	var lignes = ["Connecting to host " + cible + ", port 5201", "[  5] local " + annexe().adresse + " port 43712 connected to " + r.ip + " port 5201", "[ ID] Interval           Transfer     Bitrate"];
	for (var k = 0; k < 3; k++) lignes.push("[  5]   " + k + ".00-" + (k + 1) + ".00   sec  " + completerGauche(mo, 5) + " MBytes  " + completerGauche(debit, 5) + " Mbits/sec");
	lignes.push("- - - - - - - - - - - - - - - - - - - - - - - - -", "iperf Done.");
	if (io.tty) lignes.push(C.gris(lent ? "(3 Mbit/s en Wi-Fi 5 : presque rien. Quelque chose avale le débit de l'Annexe. La borne voit tout ce qui passe : sudo iftop, sur elle.)" : "(Près de 300 Mbit/s : un bon Wi-Fi, partagé entre tous ceux qui sont connectés.)"));
	GameEvents.fire({ type: "iperfAnnexe", lent: lent });
	return lignes.join("\n");
};

/* arping dans l'Annexe : les voisins de la même rue répondent. */
var PORTEUR_AVANT_ANNEXE = porteurSurLeCable;
porteurSurLeCable = function(h, ip){
	if (dansReseau(ip, RESEAU_ANNEXE) && ["portable", "borne", "switch", "affichage"].indexOf(h) > -1){
		if (!presentDansAnnexe(ip) || ip === HOTES[h].ip || (h === "borne" && ip === IP_BORNE)) return null;
		if (ip === IP_BORNE) return MAC_BORNE_WIFI;
		if (ip === annexe().adresse) return MAC_PORTABLE;
		return macDe(ip);
	}
	return PORTEUR_AVANT_ANNEXE(h, ip);
};
/* ethtool sur une carte Wi-Fi : pas de câble à ausculter. */
var ETHTOOL_AVANT_ANNEXE = Shell.sorts.ethtool;
Shell.sorts.ethtool = function(args, io){
	var carte = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (carte === "wlan0" && (Shell.hote() === "portable" || Shell.hote() === "borne")){
		var up = interfacesDe(Shell.hote()).filter(function(i){ return i.nom === "wlan0"; })[0].up;
		return "Settings for wlan0:\n\tLink detected: " + (up ? "yes" : "no") + (io.tty ? "\n" + C.gris("(Une carte Wi-Fi n'a pas de câble : ethtool en dit peu. iw dev wlan0 link donne le signal et la vitesse.)") : "");
	}
	return ETHTOOL_AVANT_ANNEXE(args, io);
};
/* resolvectl : la bonne carte, sur les machines de l'Annexe. */
var RESOLVECTL_AVANT_ANNEXE = Shell.sorts.resolvectl;
Shell.sorts.resolvectl = function(args, io){
	var sortie = RESOLVECTL_AVANT_ANNEXE(args, io), h = Shell.hote();
	var carte = { portable: "wlan0", borne: "eth0", switch: "br0", affichage: "eth0" }[h];
	return carte ? String(sortie).replace(/Link 2 \(eth0\)/g, "Link 2 (" + carte + ")") : sortie;
};

/* ------------------------------------------------------------------ */
/* Le manuel des nouveaux sorts                                        */
/* ------------------------------------------------------------------ */

MANUEL["rfkill"] = page("couper ou rallumer les radios (Wi-Fi, Bluetooth)", "RF KILL",
	"  rfkill                     l'état des radios\n  rfkill list                pareil, en détail\n  sudo rfkill unblock wifi   rallumer le Wi-Fi\n  sudo rfkill block all      tout couper (le mode avion)\n\n" +
	"Soft blocked : coupé par logiciel, ça se rallume. Hard blocked : un interrupteur physique, il faut le basculer à la main.");
MANUEL["iw"] = page("regarder et régler le Wi-Fi", "IW (wireless)",
	"  iw dev                     les cartes Wi-Fi\n  sudo iw dev wlan0 scan     les réseaux autour : nom (SSID), signal, sécurité\n  iw dev wlan0 link          la connexion en cours et la force du signal\n\n" +
	"Le signal se lit en dBm : -30 très fort, -60 bon, -80 faible. Le plus fort n'est pas forcément le plus sûr.");
MANUEL["ipcalc"] = page("calculer les adresses d'un réseau", "IP CALCulator",
	"  ipcalc 10.0.94.0/26        le réseau, le masque, la première et la dernière adresse utilisable\n  ipcalc 10.0.94.0 255.255.255.192   pareil, avec le masque écrit en entier\n\n" +
	"Un /24 compte 256 adresses, un /26 en compte 64. Dans chaque réseau, la première adresse le nomme et la dernière sert à la diffusion : on ne les donne à personne.");
MANUEL["sysctl"] = page("lire et régler le noyau", "SYStem ConTroL",
	"  sysctl net.ipv4.ip_forward           lire un réglage\n  sudo sysctl -w net.ipv4.ip_forward=1 le changer tout de suite\n  sudo sysctl -p                       appliquer /etc/sysctl.conf\n\n" +
	"net.ipv4.ip_forward = 1 : la machine fait passer les paquets d'une carte à l'autre, comme un routeur. -w s'oublie au redémarrage ; /etc/sysctl.conf reste.");
MANUEL["named-checkzone"] = page("vérifier un fichier de zone DNS", "NAMED CHECK ZONE",
	"  sudo named-checkzone ZONE FICHIER    exemple : named-checkzone annexe.cybersup.lan annexe.zone\n\n" +
	"Il lit le fichier comme le ferait le serveur DNS (named) et dit OK, ou la ligne fautive. À lancer AVANT de recharger : une faute, et toute la zone est refusée.");
MANUEL["lldpctl"] = page("voir qui est branché sur quel câble", "LLDP ConTroL",
	"  lldpctl                    les voisins de chaque câble : leur nom et leur port\n  lldpctl port7              un seul port\n\n" +
	"Avec LLDP, chaque machine annonce son nom sur son câble. Pratique pour savoir ce qui est branché où, sans suivre les câbles à la main.");
MANUEL["iftop"] = page("voir qui consomme le débit, en direct", "IF TOP",
	"  sudo iftop                 les échanges les plus gros, machine par machine\n  sudo iftop -i br0          sur une carte précise\n\n" +
	"=> : ce qui part, <= : ce qui arrive. Sur un vrai Linux, il se rafraîchit en continu, q le quitte.");
MANUEL["nethogs"] = page("voir quel programme consomme le réseau", "NET HOGS (les gloutons du réseau)",
	"  sudo nethogs               le débit de chaque programme de CETTE machine\n\n" +
	"iftop dit QUELLE machine consomme ; nethogs, lancé sur elle, dit QUEL programme.");
MANUEL["vnstat"] = page("la consommation réseau, jour après jour", "VN STAT",
	"  vnstat                     le total, et les jours\n  vnstat -h                  heure par heure\n\n" +
	"vnstat compte en permanence ce qui passe : de quoi repérer un jour anormal.");
MANUEL["conntrack"] = page("les connexions qui traversent une machine", "CONNection TRACKing",
	"  sudo conntrack -L          chaque connexion suivie : protocole, état, source, destination, ports\n\n" +
	"Le pare-feu de Linux suit chaque connexion qui le traverse : c'est elle qu'on lit ici.");
MANUEL["arp-scan"] = page("trouver toutes les machines de son réseau local", "ARP SCAN",
	"  sudo arp-scan -l           chaque adresse de ma rue qui répond, avec son adresse MAC\n\n" +
	"Il parle en ARP, sous l'IP : même une machine qui ignore ping répond. Il ne traverse pas les routeurs.");
MANUEL["fping"] = page("appeler beaucoup de machines d'un coup", "Fast PING",
	"  fping borne switch affichage      plusieurs machines\n  fping -a -g 10.0.94.0/26          tout un réseau, seulement celles qui répondent\n\n" +
	"Comme ping, mais en parallèle et en une ligne par machine : alive ou unreachable.");
MANUEL["whois"] = page("à qui appartient un nom de domaine", "WHO IS",
	"  whois DOMAINE              le registraire, la date de création, les serveurs de noms\n\n" +
	"Un domaine créé la veille, qui imite un vrai nom : la signature classique d'un hameçonnage.");
MANUEL["chronyc"] = page("interroger le service d'heure chrony", "CHRONY Client",
	"  chronyc sources            les serveurs de temps écoutés (^* : celui qu'on suit)\n  chronyc tracking           l'écart avec l'heure exacte\n\n" +
	"Les serveurs utilisent chrony ; les postes, souvent systemd-timesyncd (timedatectl).");
MANUEL["smbclient"] = page("parler à un partage de fichiers Windows (SMB)", "SMB CLIENT",
	"  smbclient -L //intranet -N            la liste des partages, en invité\n  smbclient //intranet/eleves -N -c ls  le contenu d'un partage\n\n" +
	"SMB est le protocole des dossiers partagés (port 445). -N : sans mot de passe, en invité.");

var SORTS_ANNEXE = ["rfkill", "iw", "ipcalc", "sysctl", "named-checkzone", "lldpctl", "iftop", "nethogs", "vnstat", "conntrack", "arp-scan", "fping", "whois", "chronyc", "smbclient"];
ORDRE_DES_SORTS_3 = ORDRE_DES_SORTS_3.concat(SORTS_ANNEXE);
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_ANNEXE.indexOf(c) === -1; });

/* ------------------------------------------------------------------ */
/* Les quêtes de l'Annexe                                              */
/* ------------------------------------------------------------------ */

var QUETES_ANNEXE = [
	{ id: "r_annexe", titre: "Rejoindre Gaspard à l'Annexe",
	  indice: "Radia t'envoie à l'Annexe, la cafétéria de Cybersup : cd ~/Cybersup/Annexe, puis cat Gaspard." },
	{ id: "r_wifi", titre: "Rallumer la radio Wi-Fi du portable",
	  indice: "Sur le Portable de l'Annexe (cd Portable), wlan0 refuse de s'allumer. rfkill list dit pourquoi." },
	{ id: "r_ssid", titre: "Se connecter au vrai Wi-Fi de l'école",
	  indice: "Deux réseaux portent presque le même nom. L'AfficheWifi de l'Annexe donne le bon, et son mot de passe : nmcli device wifi connect." },
	{ id: "r_plan", titre: "Rouvrir la mairie de l'Annexe (le DHCP de la borne)",
	  indice: "Sur la borne (ssh borne, depuis le Poste du BatimentB), la plage de /etc/dhcp/dhcpd.conf sort du réseau 10.0.94.0/26. ipcalc dit quelles adresses sont permises." },
	{ id: "r_forward", titre: "Rouvrir le passage de la borne (ip_forward)",
	  indice: "Le portable parle à la borne, pas plus loin. Sur la borne : sysctl net.ipv4.ip_forward." },
	{ id: "r_zone", titre: "Réparer la zone DNS de l'Annexe",
	  indice: "Sur le routeur, /etc/bind/annexe.zone a une faute. named-checkzone la trouve, nano la corrige, systemctl reload named recharge." },
	{ id: "r_prise", titre: "Rallumer le port de l'écran sur le switch",
	  indice: "ssh switch : ip link montre les ports. Le CarnetDuSwitch dit lequel est l'écran, et lequel doit rester coupé." },
	{ id: "r_debit", titre: "Trouver et couper ce qui sature le Wi-Fi",
	  indice: "Sur la borne, sudo iftop montre QUI consomme. Sur la machine coupable, sudo nethogs montre QUEL programme." }
];
var QUETES_SECONDAIRES_ANNEXE = [
	{ id: "s_r_jumeau", titre: "Noter l'adresse MAC du faux Wi-Fi dans ~/jumeau.txt" },
	{ id: "s_r_whois", titre: "Découvrir avec whois depuis quand existe le domaine du faux Wi-Fi" },
	{ id: "s_r_ipcalc", titre: "Calculer le réseau de l'Annexe avec ipcalc" },
	{ id: "s_r_sysctl", titre: "Graver ip_forward dans /etc/sysctl.conf, puis sysctl -p" },
	{ id: "s_r_arpscan", titre: "Lister les machines de l'Annexe avec arp-scan" },
	{ id: "s_r_fping", titre: "Appeler toute l'Annexe d'un coup avec fping -g" },
	{ id: "s_r_chrony", titre: "Lire les sources de temps d'un serveur avec chronyc" },
	{ id: "s_r_vnstat", titre: "Lire la consommation du jour de la borne avec vnstat" },
	{ id: "s_r_conntrack", titre: "Lister les connexions qui traversent la borne (conntrack -L)" },
	{ id: "s_r_smb", titre: "Lister les dossiers partagés de l'intranet avec smbclient" },
	{ id: "s_r_lldp", titre: "Vérifier avec lldpctl que l'écran est bien sur le port 7" },
	{ id: "s_r_signal", titre: "Lire la force du signal Wi-Fi avec iw dev wlan0 link" },
	{ id: "s_r_dig_annexe", titre: "Résoudre affichage.annexe avec dig +short" }
];
(function(){
	var fin = QUETES_PANNE.filter(function(q){ return q.id === "r_fin"; })[0];
	var avant = QUETES_PANNE.filter(function(q){ return q.id !== "r_fin"; });
	QUETES_PANNE.length = 0;
	avant.concat(QUETES_ANNEXE, [fin]).forEach(function(q){ QUETES_PANNE.push(q); });
	QUETES_SECONDAIRES_ANNEXE.forEach(function(q){ QUETES_SECONDAIRES_PANNE.push(q); });
})();

INDICES_PANNE.r_annexe = ["L'Annexe est un lieu de Cybersup, comme le BatimentB.", "cd ~/Cybersup/Annexe puis cat Gaspard"];
INDICES_PANNE.r_wifi = ["rfkill list montre « Soft blocked: yes » pour le Wi-Fi : le mode avion. rfkill unblock le lève, avec sudo.", "Sur le Portable : sudo rfkill unblock wifi"];
INDICES_PANNE.r_ssid = ["sudo iw dev wlan0 scan montre deux réseaux. Le nôtre est protégé (WPA2) ; l'autre est ouvert et n'est pas à l'école. Le mot de passe est sur l'AfficheWifi.",
	"Sur le Portable : nmcli device wifi connect " + SSID_BON + " password " + MDP_WIFI];
INDICES_PANNE.r_plan = ["ipcalc 10.0.94.0/26 : les adresses permises vont de 10.0.94.1 à 10.0.94.62. La plage du stagiaire, 100 à 150, en sort : le DHCP refuse de démarrer. Corrige-la, redémarre le service, puis redemande une adresse depuis le portable.",
	"Depuis le Poste : ssh borne, sudo nano /etc/dhcp/dhcpd.conf (range 10.0.94.10 10.0.94.50;), sudo systemctl restart isc-dhcp-server, puis sur le Portable : sudo dhclient wlan0"];
INDICES_PANNE.r_forward = ["sysctl net.ipv4.ip_forward vaut 0 sur la borne : elle ne fait rien passer d'une carte à l'autre. sysctl -w le change.", "Sur la borne : sudo sysctl -w net.ipv4.ip_forward=1"];
INDICES_PANNE.r_zone = ["sudo named-checkzone annexe.cybersup.lan annexe.zone, sur le routeur dans /etc/bind : une adresse en .300 n'existe pas. L'écran de la cafétéria est en 10.0.94.40.",
	"Sur le routeur : cd /etc/bind, sudo nano annexe.zone (10.0.94.300 devient 10.0.94.40), puis sudo systemctl reload named"];
INDICES_PANNE.r_prise = ["Sur le switch, ip link : port7 et port8 sont DOWN. port7 est l'écran ; port8, la prise du couloir, doit rester coupée.", "ssh switch, puis sudo ip link set port7 up"];
INDICES_PANNE.r_debit = ["iftop, sur la borne : affichage télécharge des vidéos en boucle. Sur affichage, nethogs montre le programme, synchro-videos : c'est un service, il se relance si on le tue.",
	"ssh affichage, puis sudo systemctl disable --now synchro-videos"];

TALKIE.r_annexe = "Le bâtiment B tient ! Mais Gaspard, à l'Annexe, n'a plus de Wi-Fi depuis hier soir : le stagiaire est passé là-bas aussi. cd ~/Cybersup/Annexe.";
TALKIE.r_wifi = "Assieds-toi au Portable de la cafétéria (cd Portable). ip link : wlan0 refuse de s'allumer ? rfkill list te dira pourquoi. Le CarnetDeLAnnexe aide.";
TALKIE.r_ssid = "La radio est rallumée. Regarde les réseaux autour : sudo iw dev wlan0 scan. Le bon est sur l'AfficheWifi, avec son mot de passe. Méfie-toi des jumeaux.";
TALKIE.r_plan = "Connecté, mais sans adresse : la mairie de l'Annexe ne répond pas. Depuis le Poste du BatimentB, ssh borne : son service DHCP, son journal. ipcalc 10.0.94.0/26 dit quelles adresses sont permises.";
TALKIE.r_forward = "Le portable a une adresse ! Il parle à la borne (ping 10.0.94.1), mais pas plus loin (ping intranet). Sur la borne : sysctl net.ipv4.ip_forward.";
TALKIE.r_zone = "Les lettres sortent de l'Annexe ! Mais dig affichage ne trouve rien. Le registre que l'Oracle des Noms tient pour l'Annexe (sa zone) est sur le routeur, dans /etc/bind : named-checkzone dit où est la faute.";
TALKIE.r_prise = "affichage a un nom, mais ne répond pas (ping affichage). L'écran est branché sur le switch de l'Annexe : ssh switch, ip link, et le CarnetDuSwitch.";
TALKIE.r_debit = "L'écran est rallumé... et tout le Wi-Fi rame (iperf3 -c intranet, depuis le portable). Sur la borne, sudo iftop : QUI consomme. Puis sudo nethogs sur le coupable : QUOI.";
TALKIE.r_fin = "Plus un voyant orange, ni au bâtiment B, ni à l'Annexe. Reviens me voir au BatimentB : cat Radia.";

ETAGE_OSI.r_wifi = "Étage 1 (Physique)";
ETAGE_OSI.r_ssid = "Étage 2 (Liaison)";
ETAGE_OSI.r_plan = "Étage 3 (Réseau)";
ETAGE_OSI.r_forward = "Étage 3 (Réseau)";
ETAGE_OSI.r_zone = "Étage 7 (Application)";
ETAGE_OSI.r_prise = "Étages 1 et 2 (Physique, Liaison)";
ETAGE_OSI.r_debit = "Étages 4 et 7 (Transport, Application)";

NOTIONS.r_wifi = "Le Wi-Fi, c'est une boîte aux lettres sans câble : une radio. Et une radio peut être coupée par logiciel, comme en mode avion.";
NOTIONS.r_ssid = "Un relais sans fil affiche son enseigne (le SSID). N'importe qui peut poser une fausse boîte aux lettres avec la même enseigne : on vérifie toujours le nom ET le cadenas (WPA2).";
NOTIONS.r_plan = "L'Annexe est une petite rue à part : un quartier de 64 adresses (un /26). Sa mairie (le DHCP de la borne) doit attribuer des adresses DE cette rue, pas d'une autre.";
NOTIONS.r_forward = "Une maison à deux boîtes aux lettres ne fait pas suivre le courrier de l'une à l'autre, sauf si on le lui dit : net.ipv4.ip_forward.";
NOTIONS.r_zone = "Les noms de l'Annexe ont leur propre page dans le registre de l'Oracle des Noms, tenu par le routeur. Une seule faute dedans, et l'Oracle refuse toute la page.";
NOTIONS.r_prise = "Un switch est une rangée de boîtes aux lettres, une par câble (ses ports). Un port éteint, et la maison au bout disparaît.";
NOTIONS.r_debit = "Le courrier se partage : un seul gros expéditeur, et tout le monde attend son tour.";

A_RETENIR.r_wifi = "rfkill coupe les radios par logiciel (le mode avion). rfkill list les montre, sudo rfkill unblock wifi rallume le Wi-Fi.";
A_RETENIR.r_ssid = "Un Wi-Fi ouvert qui imite le vrai est un faux point d'accès : il voit tout ce qui passe. On vérifie le nom ET la sécurité (WPA2) avant de se connecter.";
A_RETENIR.r_plan = "Un /26 compte 64 adresses, dont 62 utilisables. ipcalc les calcule. Une plage DHCP hors du réseau empêche le serveur de démarrer.";
A_RETENIR.r_forward = "Pour faire passer les paquets d'un réseau à l'autre, Linux doit avoir net.ipv4.ip_forward = 1. Pour que ça dure : /etc/sysctl.conf.";
A_RETENIR.r_zone = "Une faute dans un fichier de zone, et le DNS refuse toute la zone. named-checkzone vérifie AVANT de recharger (systemctl reload named).";
A_RETENIR.r_prise = "Un port de switch éteint coupe ce qui y est branché. Les ports inutilisés, on les laisse coupés : c'est de la sécurité.";
A_RETENIR.r_debit = "Quand le réseau rame, iftop dit QUI consomme, nethogs dit QUEL programme. Un service gourmand se coupe avec systemctl disable --now.";

/* ------------------------------------------------------------------ */
/* Le monde réagit                                                     */
/* ------------------------------------------------------------------ */

function verifierAnnexe(){
	if (!annexeOuverte()) return;
	var an = annexe();
	if (Cybersup.children.indexOf(Annexe) === -1) relier(Cybersup, Annexe);
	if (!state.has("zoneAnnexe")){
		state.set("zoneAnnexe");
		var zone = zoneDns();
		if (!zone.some(function(r){ return r.nom === "borne"; })) ZoneEcole.setText(ZoneEcole.getText().replace(/\n?$/, "\n") + "borne     IN A " + IP_BORNE_COEUR + "\nswitch    IN A " + IP_SWITCH + "\n");
	}
	if (an.scanVu && !Annexe.hasItem(BoitierSousLaTable)){
		poser(Annexe, BoitierSousLaTable);
		if (!state.has("rejeuEnCours")) say(C.gris("(Gaspard soulève une table : « C'est ça, votre jumeau ? » Un petit boîtier noir est scotché dessous : cat BoitierSousLaTable, dans l'Annexe.)"));
	}
	var jumeau = Home.getItemFromName("jumeau.txt");
	if (jumeau !== -1 && jumeau.getText().toLowerCase().indexOf(BSSID_FAUX) > -1) state.complete("s_r_jumeau");
	if (!an.rfkill && an.wlan) state.complete("r_wifi");
	if (an.ssid === SSID_BON && an.wlan) state.complete("r_ssid");
	if (an.ssid === SSID_BON && an.adresse && dansReseau(an.adresse, RESEAU_ANNEXE)) state.complete("r_plan");
	if (an.forward) state.complete("r_forward");
	if (an.zone && HOTES.routeur.services.named.actif && zoneAffichageJuste()) state.complete("r_zone");
	if (an.ports[7]) state.complete("r_prise");
	var synchro = servicePanne("affichage", "synchro-videos");
	if (!synchro.actif && !synchro.auto) state.complete("r_debit");
}

/* Ce qui ne marche plus dans l'Annexe, au moment du compte rendu. */
function pannesAnnexe(){
	var an = annexe(), l = [];
	if (an.rfkill || !an.wlan) l.push("la radio Wi-Fi du portable de l'Annexe est coupée");
	else if (an.ssid !== SSID_BON) l.push("le portable de l'Annexe n'est pas sur le vrai Wi-Fi");
	if (!dhcpBorneActif()) l.push("la mairie de l'Annexe (le DHCP de la borne) est arrêtée");
	if (!an.forward) l.push("la borne ne fait plus passer les paquets");
	if (!an.zone || !HOTES.routeur.services.named.actif) l.push("la zone DNS de l'Annexe n'est pas chargée (named, sur le routeur)");
	if (!an.ports[7]) l.push("le port de l'écran (port7) est éteint");
	if (an.ports[8]) l.push("la prise du couloir (port8) est ouverte : elle doit rester coupée");
	var s = servicePanne("affichage", "synchro-videos");
	if (s.actif || s.auto) l.push("synchro-videos avale encore le débit de l'Annexe");
	return l;
}
var PANNES_AVANT_ANNEXE = pannesRestantes;
pannesRestantes = function(){ return PANNES_AVANT_ANNEXE().concat(pannesAnnexe()); };

GameEvents.addListener("enter", function(e){
	if (e.room === Annexe && annexeOuverte()) state.complete("r_annexe");
});
GameEvents.addListener("ipcalc", function(e){ if (e.reseau === RESEAU_ANNEXE) queteAnnexe("s_r_ipcalc"); });
GameEvents.addListener("iwLink", function(e){ if (e.ssid === SSID_BON) queteAnnexe("s_r_signal"); });
GameEvents.addListener("arpscan", function(e){ if (e.reseau === RESEAU_ANNEXE && e.n >= 2) queteAnnexe("s_r_arpscan"); });
GameEvents.addListener("fping", function(e){ if (e.plage && dansReseau(e.plage.split("/")[0], RESEAU_ANNEXE) && e.vivants >= 3) queteAnnexe("s_r_fping"); });
GameEvents.addListener("whois", function(e){ if (e.nom === DOMAINE_FAUX) queteAnnexe("s_r_whois"); });
GameEvents.addListener("chronyc", function(e){ if (e.action === "sources") queteAnnexe("s_r_chrony"); });
GameEvents.addListener("vnstat", function(){ queteAnnexe("s_r_vnstat"); });
GameEvents.addListener("conntrack", function(e){ if (e.host === "borne" && e.n > 0) queteAnnexe("s_r_conntrack"); });
GameEvents.addListener("smbclient", function(e){ if (e.lister && e.serveur === "intranet") queteAnnexe("s_r_smb"); });
GameEvents.addListener("lldpctl", function(e){ if (e.host === "switch" && /port7[\s\S]*affichage/.test(e.sortie)) queteAnnexe("s_r_lldp"); });
GameEvents.addListener("dnsPanne", function(e){ if (e.ok && e.outil === "dig" && Shell.historique && /affichage\.annexe/.test(Shell.historique[Shell.historique.length - 1] || "") && /\+short/.test(Shell.historique[Shell.historique.length - 1] || "")) queteAnnexe("s_r_dig_annexe"); });

/* Les illustrations des lieux de l'Annexe (outils/dessiner_panne.py). */
[[Borne, "loc_borne.gif"], [Switch, "loc_switch.gif"], [Affichage, "loc_affichage.gif"]].forEach(function(x){ x[0].room_pic = "./static/img/" + x[1]; });



/* L'écran a une adresse fixe (10.0.94.40). Une zone qui le met ailleurs se charge sans erreur,
   mais ssh affichage arrive alors sur une autre machine (le portable : Connection refused) ou nulle part.
   La quête de la zone n'est validée qu'avec la bonne adresse, et ssh ou ping affichage disent quoi corriger. */
function zoneAffichageJuste(){
	var an = annexe();
	return !an.zoneValeurs || !an.zoneValeurs.affichage || an.zoneValeurs.affichage === IP_AFFICHAGE;
}
function conseilZoneAffichage(args){
	var an = annexe();
	var vise = args.some(function(a){ return a.charAt(0) !== "-" && /^(?:[^@]*@)?affichage(?:\.annexe(?:\.cybersup\.lan)?)?\.?$/.test(a); });
	if (!vise || !an.zone || zoneAffichageJuste()) return "";
	return C.gris("(Le nom affichage pointe vers " + an.zoneValeurs.affichage + " dans la zone de l'Annexe : ce n'est pas l'écran. Son adresse fixe est " + IP_AFFICHAGE +
		" (MemoZone, sur le routeur dans /etc/bind). Corrige annexe.zone avec sudo nano, puis sudo systemctl reload named.)");
}
var SSH_AVANT_CONSEIL_ZONE = Shell.sorts.ssh;
Shell.sorts.ssh = function(args, io){
	try { return SSH_AVANT_CONSEIL_ZONE(args, io); }
	catch (e){
		var conseil = e instanceof ShellError && io && io.tty ? conseilZoneAffichage(args) : "";
		if (conseil) e.message += "\n" + conseil;
		throw e;
	}
};
var PING_AVANT_CONSEIL_ZONE = Shell.sorts.ping;
Shell.sorts.ping = function(args, io){
	try {
		var sortie = PING_AVANT_CONSEIL_ZONE(args, io);
		var conseil = io && io.tty && typeof sortie === "string" ? conseilZoneAffichage(args) : "";
		return conseil ? sortie + "\n" + conseil : sortie;
	} catch (e){
		var c = e instanceof ShellError && io && io.tty ? conseilZoneAffichage(args) : "";
		if (c) e.message += "\n" + c;
		throw e;
	}
};
