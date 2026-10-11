/**
 * Panne.js : le chapitre 2, la panne générale du réseau de l'école.
 *
 * Pendant l'épreuve des B1, le stagiaire de Vint (l'administrateur réseau, en vacances)
 * a « essayé des trucs » : le bâtiment B est coupé du monde, l'intranet affiche une page
 * par défaut, les mails ne partent plus, Lille ne répond plus. Radia, M1 réseau du campus
 * de Marseille, attend la recrue au BatimentB de Cybersup.
 *
 * La panne se répare couche par couche, de bas en haut : le lien (ip link), l'adresse
 * (ip addr, dhclient), la route (ip route), les noms (resolv.conf, dig), le DHCP du routeur
 * (systemctl, journalctl), la configuration permanente (netplan), puis les services :
 * le serveur web (ss, systemctl), l'horloge (timedatectl, openssl), le pare-feu (iptables),
 * le routage vers Lille (traceroute, ip route) et un telnet oublié (tcpdump).
 * Puis, second acte (Annexe.js) : le Wi-Fi de l'Annexe, sa borne, son switch et son écran.
 *
 * Numérotation : ce chapitre est le deuxième pour le joueur. Dans le code, il porte le
 * numéro 3 (le 2 est la Crypte, écrite avant lui) : quêtes r_ et s_r_, xp3, note(3).
 * Les sorts sont dans CommandesPanne.js.
 */

/* ------------------------------------------------------------------ */
/* Les adresses du réseau                                              */
/* ------------------------------------------------------------------ */

var IP_POSTE = "10.0.93.20";
var IP_ROUTEUR = "10.0.93.254";          // le routeur, côté bâtiment B (eth0)
var IP_ROUTEUR_COEUR = "10.0.92.249";    // le même routeur, côté cœur du réseau (eth1)
var IP_DNS = "10.0.92.53";
var IP_DNS_FAUX = "10.0.92.35";          // la faute de frappe du stagiaire
var IP_INTRANET = "10.0.92.20";
var IP_LILLE_GW = "10.0.92.248";
var IP_PAREFEU = "10.0.92.254";
var IP_LILLE = "10.0.59.1";
var IP_PRESTATAIRE = "10.0.92.66";       // le script du prestataire qui se connecte en telnet
var MAC_POSTE = "52:54:00:5d:14:20";
var MAC_ROUTEUR = "52:54:00:5d:fe:01";
var MOT_DE_PASSE_TELNET = aleaChoix("mdp-telnet", ["Routeur", "Armoire", "Switch", "Reseau", "Cable"]) + aleaEntier("mdp-telnet-n", 10, 99) + "!";

/* L'état du poste et du routeur : ce qui n'est pas un fichier ni un service. */
function etatPanneInitial(){
	return {
		lien: false,           // eth0 est-elle UP ?
		adresses: [],          // adresses posées sur eth0 : { ip, prefixe, dhcp }
		routes: [],            // routes du poste : { vers: "default" ou "10.0.92.0/24", via, dhcp }
		dnsRuntime: null,      // serveur DNS donné par resolvectl ou par le DHCP (prioritaire sur resolv.conf)
		bail: false,           // un bail DHCP est en cours
		bailRendu: false,      // dhclient -r a été fait (quête secondaire)
		arp: false,            // le poste a déjà parlé au routeur (ip neigh)
		routesRouteur: [],     // routes ajoutées à la main sur le routeur
		iptables: {
			INPUT: [], OUTPUT: [],
			FORWARD: [{ proto: "tcp", dport: "25", src: "10.0.93.0/24", cible: "DROP", commentaire: "test anti-spam (stagiaire)", paquets: 1342, octets: 80520 }]
		},
		nginxEchec: true,      // nginx a échoué au démarrage (port 80 déjà pris)
		netplanOK: false,      // netplan apply a donné un réseau qui marche
		annonce: null,         // dernière étape annoncée au talkie-walkie
		carte: { poste: true },  // les lieux de la carte sortis de la brume (RpgPanne.js)
		premiers: {}           // les sorts déjà lancés pendant la panne
	};
}

function lieuDuChapitre3(lieu){
	lieu.chapitre = 3;
	return lieu;
}
function dossier3(parent, nom, intro, options){
	return lieuDuChapitre3(dossier(parent, nom, intro, options));
}

/* ------------------------------------------------------------------ */
/* Le bâtiment B et le poste de l'accueil                              */
/* ------------------------------------------------------------------ */

var BatimentB = lieuDuChapitre3(new Room("BatimentB",
	"Le bâtiment B de Cybersup, tombé dans le Silence. Dans l'armoire réseau, tous les voyants sont orange : plus aucun messager n'entre ni ne sort. \
Ni intranet, ni mails, ni nouvelles de Lille. Une mage du réseau est assise par terre devant l'armoire, un ordinateur portable sur les genoux. \
Derrière le comptoir, le Poste de garde (le Poste de l'accueil) attend qu'on le réveille.",
	"loc_batimentb.gif"));
BatimentB.owner = "root";
BatimentB.mode = "rwxr-xr-x";

var Radia = new Item("Radia", "", "item_radia.gif").personnage().enseigne("ip", "ethtool", "hostnamectl").revele("s_r_hostnamectl");
BatimentB.addItem(Radia);

/* Le lexique de Radia : chaque notion du chapitre en deux phrases, pour qui n'a jamais touché un réseau. */
var Lexique = new Item("Lexique",
	"LE LEXIQUE DE RADIA : l'image du royaume, puis le vrai mot du métier.\n\n" +
	"La tour des sept étages   le modèle OSI (cat ModeleOSI)\n" +
	"Les messagers             les paquets\n" +
	"La porte du poste         la carte réseau (eth0, ou wlan0 en Wi-Fi)\n" +
	"L'adresse                 l'adresse IP (10.0.93.20)\n" +
	"La rue                    le réseau, défini par le masque (/24, /26)\n" +
	"La Tour                   la passerelle (le routeur)\n" +
	"Le chemin                 la route (et la route par défaut)\n" +
	"L'Oracle des Noms         le DNS : un nom vers une adresse\n" +
	"La Source                 le DHCP : adresse, passerelle, DNS\n" +
	"Les gardiens              les services (systemctl)\n" +
	"Les portes                les ports : 22 ssh, 25 mails, 53 DNS, 80 web\n" +
	"La Herse                  le pare-feu\n" +
	"Le blason                 le certificat d'un site https\n" +
	"La Tour des Ondes         la borne Wi-Fi (son nom : le SSID)\n" +
	"Le Carrefour des Prises   le switch, et ses ports\n" +
	"Parler en clair           sans chiffrement (le contraire : ssh, https)\n\n" +
	"schema dessine la carte du royaume : vert, ça marche ; rouge, en panne ; brume, pas encore exploré.",
	"item_manuscript.gif");
BatimentB.addItem(Lexique);

/* Le modèle OSI : la clé de tout le chapitre, affichée sur l'armoire. */
var ModeleOSI = new Item("ModeleOSI",
	"LE MODÈLE OSI : LA TOUR DES SEPT ÉTAGES (l'affiche de Vint)\n" +
	"Un message descend les étages chez l'expéditeur, passe le câble, remonte chez\n" +
	"le destinataire. Si un étage casse, tout ce qui est au-dessus tombe.\n\n" +
	"  7 Application    le web, les mails, les noms      curl, dig, ssh\n" +
	"  6 Présentation   le chiffrement (le s de https)   openssl\n" +
	"  5 Session        une conversation qui dure        ssh, w\n" +
	"  4 Transport      les PORTES : TCP, UDP, ports     ss, nc\n" +
	"  3 Réseau         les ADRESSES IP et les routes    ip a, ip r, ping\n" +
	"  2 Liaison        le voisin, l'adresse MAC         ip neigh, arping\n" +
	"  1 Physique       le câble, la carte réseau        ip link, ethtool\n\n" +
	"De bas en haut : « Pour Le Réseau, Tout Se Passe Automatiquement ».\n" +
	"On dépanne toujours en partant du bas. Les sept voyants montrent le Poste.\n\n" +
	"Entraîne-toi : écris les sept étages, du bas vers le haut, dans ~/osi.txt\n" +
	"  echo Physique Liaison Réseau Transport Session Présentation Application > ~/osi.txt",
	"item_osi.gif").revele("s_r_osi");
BatimentB.addItem(ModeleOSI);

/* La sacoche de Radia : ses sorts de terrain, en plus de ceux du chapitre. */
var SacocheDeRadia = new Item("SacocheDeRadia",
	"LA SACOCHE DE RADIA : ses sorts de terrain\n\n" +
	"  sudo arping -c 3 10.0.93.254   le Cri : qui a cette adresse, dans ma rue ?\n" +
	"  sudo arping -D -c 2 ADRESSE    cette adresse est-elle libre ?\n" +
	"  tracepath lille                le Petit Fil : le chemin, sans être root\n" +
	"  getent hosts NOM               le Traducteur : un nom vers une adresse\n" +
	"  uptime -p                      l'Horloge : éveillée depuis quand ?\n" +
	"  iperf3 -c intranet             la Course : le débit jusqu'au serveur\n" +
	"  sudo nft list ruleset          la Nouvelle Herse (sur le routeur)\n\n" +
	"Les vieux sorts d'avant ip sont dans le tiroir du Poste : GrimoireDesAnciens.",
	"item_manuscript.gif").enseigne("arping", "tracepath", "getent", "uptime", "iperf3", "nft")
	.revele("s_r_arping", "s_r_tracepath", "s_r_getent", "s_r_uptime", "s_r_iperf", "s_r_nft");
BatimentB.addItem(SacocheDeRadia);

/* Le poste est une vraie machine Linux : on s'assoit devant (cd Poste), sa racine est « / ». */
var PosteB = lieuDuChapitre3(new Room("Poste",
	"Le Poste de garde du bâtiment B : un vieux PC de bureau, une étiquette jaunie collée sous l'écran, un câble réseau bien branché. \
Tu es assis devant : chaque sort que tu lances ici s'exécute sur lui. C'est ta tour d'observation pour tout le chapitre.",
	"loc_posteb.gif"));
PosteB.racineHote = "poste-b";
PosteB.owner = "root";
PosteB.mode = "rwxr-xr-x";
link_rooms(BatimentB, PosteB);

var PosteEtc = dossier3(PosteB, "etc", "La configuration du poste.", { image: "loc_etc.gif" });
var PosteNetplan = dossier3(PosteEtc, "netplan", "La configuration réseau permanente : ce qui est écrit ici est appliqué à chaque démarrage.", { image: "loc_etc.gif" });
var PosteVar = dossier3(PosteB, "var", "Les données du poste.", { image: "loc_etc.gif" });
var PosteLog = dossier3(PosteVar, "log", "Les journaux du poste.", { image: "loc_journaux.gif" });
var PosteTmp = dossier3(PosteB, "tmp", "Le dossier temporaire du poste. Tout le monde peut y écrire.", { mode: "rwxrwxrwt", image: "loc_tmp.gif" });

fichier(PosteB, "Etiquette",
	"Une étiquette jaunie, collée sous l'écran :\n\n" +
	"  POSTE DE L'ACCUEIL · BÂTIMENT B\n" +
	"  nom        : poste-b\n" +
	"  adresse    : " + IP_POSTE + "/24\n" +
	"  passerelle : " + IP_ROUTEUR + " (le routeur du bâtiment)\n" +
	"  DNS        : " + IP_DNS + "\n\n" +
	"En temps normal, le DHCP du routeur donne tout ça tout seul. Ces valeurs servent quand il est en panne.",
	{ image: "item_sign.gif" });
fichier(PosteB, "AideMemoire",
	"AIDE-MÉMOIRE DU POSTE (Vint). On répare de bas en haut :\n" +
	"  1. le lien      ip link, ethtool eth0     eth0 est-elle UP ?\n" +
	"  2. l'adresse    ip a                      une ligne inet ?\n" +
	"  3. la route     ip r, ping -c 4 ROUTEUR   par où sortir ?\n" +
	"  4. les noms     cat /etc/resolv.conf      le DNS répond-il ?\n" +
	"  5. le service   curl -I http://NOM/, nc   il écoute ?\n\n" +
	"Adresse par DHCP : sudo dhclient eth0 (la rendre : sudo dhclient -r eth0).\n" +
	"À la main : sudo ip addr add ADRESSE/24 dev eth0\n" +
	"            sudo ip route add default via PASSERELLE\n" +
	"Ce qu'on fait avec ip s'efface au redémarrage. Pour que ça dure :\n" +
	"  netplan get, sudo netplan set ethernets.eth0.dhcp4=true, sudo netplan apply, sudo reboot\n" +
	"Aussi : nmcli device status, sudo nano FICHIER, wget URL.",
	{ enseigne: ["dhclient", "nmcli", "netplan", "reboot", "nano", "curl", "wget"],
	  revele: ["s_r_ping", "s_r_nmcli", "s_r_bail", "s_r_reboot", "s_r_wget", "s_r_entetes"], image: "item_manuscript.gif" });

var GrimoireDesAnciens = fichier(PosteB, "GrimoireDesAnciens",
	"LE GRIMOIRE DES ANCIENS : les sorts d'avant ip (net-tools), encore partout\n\n" +
	"  ifconfig -a       les cartes, même éteintes    aujourd'hui : ip a\n" +
	"  route -n          les routes                   aujourd'hui : ip r\n" +
	"  arp -n            les voisins (MAC)            aujourd'hui : ip neigh\n" +
	"  netstat -tulnp    les ports en écoute          aujourd'hui : ss -tulnp\n" +
	"  netstat -i        les compteurs des cartes     aujourd'hui : ip -s link\n\n" +
	"Piège : sans -a, ifconfig cache les cartes éteintes. Ici, ils lisent seulement.",
	{ enseigne: ["ifconfig", "route", "arp", "netstat"], revele: ["s_r_anciens"], image: "item_historybook.gif" });

fichier(PosteEtc, "hostname", "poste-b");
var PosteHosts = fichier(PosteEtc, "hosts",
	"127.0.0.1\tlocalhost\n127.0.1.1\tposte-b\n\n# Les noms écrits ici passent avant le DNS, sur ce poste seulement.\n");
var ResolvConf = fichier(PosteEtc, "resolv.conf",
	"# Écrit à la main par stagiaire (le DHCP ne marchait plus)\nnameserver " + IP_DNS_FAUX + "\nsearch cybersup.lan\n");
fichier(PosteEtc, "MemoDNS",
	"MÉMO DNS : le DNS traduit les noms en adresses.\n" +
	"Le poste interroge le serveur noté dans /etc/resolv.conf (ligne nameserver).\n\n" +
	"  dig intranet                l'adresse d'intranet, par le serveur du poste\n" +
	"  dig @" + IP_DNS + " intranet    la même question, posée au vrai serveur\n" +
	"  dig MX cybersup.lan         qui reçoit le courrier de l'école\n" +
	"  host intranet, nslookup intranet     pareil, en plus court\n" +
	"  resolvectl status           le serveur vraiment utilisé\n\n" +
	"dig @serveur marche mais pas dig ? Le DNS va bien : c'est le poste qui se trompe.\n" +
	"/etc/hosts passe avant le DNS : « ADRESSE NOM » y crée un raccourci local.",
	{ enseigne: ["dig", "host", "nslookup", "resolvectl"], revele: ["s_r_host", "s_r_nslookup", "s_r_mx", "s_r_hosts", "s_r_resolvectl"], image: "item_manuscript.gif" });
var NETPLAN_INITIAL =
	"# Configuration réseau du poste de l'accueil\n" +
	"# Modifié par stagiaire : le DHCP ne répondait plus, alors je l'ai coupé.\n" +
	"network:\n" +
	"  version: 2\n" +
	"  renderer: NetworkManager\n" +
	"  ethernets:\n" +
	"    eth0:\n" +
	"      dhcp4: false\n";
var NetplanPoste = fichier(PosteNetplan, "01-poste.yaml", NETPLAN_INITIAL, { mode: "rw-------" });
fichier(PosteLog, "syslog",
	"hier 18:10 poste-b sudo: stagiaire : COMMAND=/usr/sbin/ip link set eth0 down\n" +
	"hier 18:12 poste-b sudo: stagiaire : COMMAND=/usr/bin/nano /etc/netplan/01-poste.yaml\n" +
	"08:00 poste-b kernel: rtc_cmos 00:00: setting system clock to 2001-01-01T00:00:00 UTC (la pile de la carte mère est à plat)\n" +
	"08:01 poste-b NetworkManager: device (eth0): state change: disconnected (administratively down)\n" +
	"08:01 poste-b systemd-timesyncd: synchronisation désactivée\n", { image: "item_manuscript.gif" });

/* ------------------------------------------------------------------ */
/* Le routeur et l'intranet                                            */
/* ------------------------------------------------------------------ */

function machine3(nom, intro, image){
	return lieuDuChapitre3(machine(nom, intro, image));
}

var Routeur = machine3("routeur", "La Tour du Carrefour (le routeur du bâtiment B). Tous les messagers du bâtiment passent par ici pour rejoindre le reste du royaume. À son pied coule la Source qui distribue les adresses (le DHCP).", "loc_routeur.gif");
var RouteurEtc = dossier3(Routeur, "etc", "La configuration du routeur.", { image: "loc_etc.gif" });
var RouteurDhcp = dossier3(RouteurEtc, "dhcp", "La configuration du serveur DHCP.", { image: "loc_etc.gif" });
var RouteurVar = dossier3(Routeur, "var", "Les données du routeur.", { image: "loc_etc.gif" });
var RouteurLog = dossier3(RouteurVar, "log", "Les journaux du routeur.", { image: "loc_journaux.gif" });
fichier(RouteurEtc, "hostname", "routeur");
fichier(RouteurDhcp, "dhcpd.conf",
	"# isc-dhcp-server : les adresses du bâtiment B\n" +
	"subnet 10.0.93.0 netmask 255.255.255.0 {\n" +
	"  range 10.0.93.100 10.0.93.199;\n" +
	"  option routers " + IP_ROUTEUR + ";\n" +
	"  option domain-name-servers " + IP_DNS + ";\n" +
	"  option domain-name \"cybersup.lan\";\n" +
	"}\n" +
	"# Le poste de l'accueil reçoit toujours la même adresse.\n" +
	"host poste-b {\n" +
	"  hardware ethernet " + MAC_POSTE + ";\n" +
	"  fixed-address " + IP_POSTE + ";\n" +
	"}\n");
fichier(Routeur, "CahierDuRouteur",
	"CAHIER DU ROUTEUR : il relie le bâtiment B (eth0) à l'école (eth1).\n" +
	"C'est aussi la Source du bâtiment : le service DHCP isc-dhcp-server.\n\n" +
	"Services   systemctl status NOM, systemctl --failed\n" +
	"           sudo systemctl enable --now NOM   (démarré ET relancé au boot)\n" +
	"           sudo journalctl -u NOM            (qui l'a arrêté : /var/log/syslog)\n" +
	"Ports      sudo ss -tulnp                    (t : TCP, u : UDP)\n" +
	"Herse      sudo iptables -L FORWARD -n -v --line-numbers\n" +
	"           sudo iptables -D FORWARD N        (retire la règle N)\n" +
	"Routes     ip r, sudo ip route add RÉSEAU via PASSERELLE\n" +
	"           Lille (10.0.59.0/24) passe par lille-gw (" + IP_LILLE_GW + ")\n" +
	"Chemin     traceroute -n MACHINE, mtr --report MACHINE\n" +
	"Écoute     sudo tcpdump -i any -n port 53, sudo tcpdump -i any -A port N\n" +
	"Cartes     ip neigh (les voisins), ip -s link (les compteurs)\n\n" +
	"On n'écoute que le réseau dont on a la charge. Celui-là, c'est le nôtre.",
	{ enseigne: ["systemctl", "journalctl", "ss", "iptables", "tcpdump", "traceroute", "mtr"],
	  revele: ["s_r_udp", "s_r_failed", "s_r_iptables_v", "s_r_dns_capture", "s_r_clair", "s_r_mtr", "s_r_traceroute_n", "s_r_voisins", "s_r_erreurs"],
	  image: "item_manuscript.gif" });
fichier(RouteurLog, "syslog",
	"hier 18:02 routeur sudo: stagiaire : COMMAND=/usr/bin/systemctl disable --now isc-dhcp-server\n" +
	"hier 18:05 routeur sudo: stagiaire : COMMAND=/usr/sbin/iptables -I FORWARD -s 10.0.93.0/24 -p tcp --dport 25 -j DROP -m comment --comment \"test anti-spam (stagiaire)\"\n" +
	"hier 18:07 routeur sudo: stagiaire : COMMAND=/usr/sbin/ip route del 10.0.59.0/24 via " + IP_LILLE_GW + "\n" +
	"(Le journal complet des services : sudo journalctl.)\n", { image: "item_manuscript.gif" });

var Intranet = machine3("intranet", "La Bibliothèque (le serveur de l'intranet) : planning, menus de la cantine, annonces. Tout le royaume vient y lire, personne ne sait où elle est.", "loc_intranet.gif");
var IntranetEtc = dossier3(Intranet, "etc", "La configuration du serveur.", { image: "loc_etc.gif" });
var IntranetNginx = dossier3(IntranetEtc, "nginx", "La configuration de nginx, le serveur web de l'intranet.", { image: "loc_etc.gif" });
var IntranetSsl = dossier3(IntranetEtc, "ssl", "Les certificats du serveur.", { image: "loc_etc.gif" });
var IntranetVar = dossier3(Intranet, "var", "Les données du serveur.", { image: "loc_etc.gif" });
var IntranetWww = dossier3(IntranetVar, "www", "Les sites servis par cette machine.", { image: "loc_web.gif" });
var IntranetHtml = dossier3(IntranetWww, "html", "La page par défaut d'apache2. Personne ne l'a demandée.", { image: "loc_web.gif" });
var IntranetSite = dossier3(IntranetWww, "intranet", "Les pages de l'intranet, servies par nginx.", { image: "loc_web.gif" });
fichier(IntranetEtc, "hostname", "intranet");
fichier(IntranetNginx, "intranet.conf",
	"server {\n    listen 80;\n    listen 443 ssl;\n    server_name intranet.cybersup.lan;\n    root /var/www/intranet;\n" +
	"    ssl_certificate     /etc/ssl/intranet.pem;\n    ssl_certificate_key /etc/ssl/intranet.key;\n}\n");
fichier(Intranet, "NoteDeVint",
	"NOTE DE VINT : l'intranet, c'est nginx (pages dans /var/www/intranet).\n" +
	"Un seul serveur web sur le port 80 : sudo ss -tlnp dit qui le tient.\n\n" +
	"https      openssl s_client -connect intranet:443   (voir le certificat)\n" +
	"           openssl x509 -noout -dates -in /etc/ssl/intranet.pem\n" +
	"Horloge    timedatectl, sudo timedatectl set-ntp true\n" +
	"Un certificat a des dates : une horloge fausse le fait refuser.\n\n" +
	"Un port    nc -zv MACHINE PORT : succeeded, refused (fermé) ou timed out (pare-feu)\n" +
	"           telnet MACHINE PORT : le client sert encore à tester.\n" +
	"Un SERVEUR telnet, jamais : tout y passe en clair.",
	{ enseigne: ["openssl", "timedatectl", "nc", "telnet"], revele: ["s_r_x509", "s_r_banniere", "s_r_telnet"], image: "item_manuscript.gif" });

/* Le certificat de l'intranet : valide depuis vingt jours, pour quatre-vingt-dix jours en tout. */
function dateDecalee(jours){
	var d = new Date();
	d.setDate(d.getDate() + jours);
	return d;
}
var MOIS_ANGLAIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateOpenssl(d){
	return MOIS_ANGLAIS[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " 08:00:00 " + d.getFullYear() + " GMT";
}
var CERTIFICAT_INTRANET = { sujet: "CN = intranet.cybersup.lan", emetteur: "CN = Cybersup CA interne", debut: dateDecalee(-20), fin: dateDecalee(70) };
var TEXTE_CERTIFICAT = (function(){
	var lignes = ["-----BEGIN CERTIFICATE-----"];
	for (var i = 0; i < 6; i++) lignes.push(base64Aleatoire("cert-intranet-" + i, 64));
	lignes.push("-----END CERTIFICATE-----");
	return lignes.join("\n") + "\n";
})();
fichier(IntranetSsl, "intranet.pem", TEXTE_CERTIFICAT, { image: "item_locker.gif" });
fichier(IntranetSsl, "intranet.key", "-----BEGIN PRIVATE KEY-----\n(la clé privée du serveur : elle ne sort jamais d'ici)\n-----END PRIVATE KEY-----\n", { mode: "rw-------", image: "item_locker.gif" });
var PAGE_APACHE = "<!DOCTYPE html>\n<html><head><title>Apache2 Debian Default Page: It works</title></head>\n<body><h1>Apache2 Debian Default Page</h1>\n" +
	"<p>It works!</p>\n<p>This is the default welcome page used to test the correct operation of the Apache2 server after installation.</p>\n</body></html>";
fichier(IntranetHtml, "index.html", PAGE_APACHE);
fichier(IntranetSite, "index.html",
	"<!DOCTYPE html>\n<html><head><title>Intranet de Cybersup</title></head>\n<body><h1>Intranet de Cybersup</h1>\n" +
	"<ul>\n<li><a href=\"planning.txt\">Le planning de la semaine</a></li>\n<li>Menu de la cantine : lasagnes (encore)</li>\n" +
	"<li>Objets trouvés : une cape noire, une fausse barbe (voir le bureau de Laurent)</li>\n</ul>\n</body></html>");
fichier(IntranetSite, "planning.txt",
	"PLANNING DE LA SEMAINE\n\nLundi    retour de Vint (enfin)\nMardi    TP réseau au bâtiment B (si le réseau marche)\n" +
	"Mercredi partiel de Linux des B1 (le Sorcier Noir a promis d'être gentil)\nJeudi    afterwork du BDE\nVendredi Laurent corrige les copies\n");

/* ------------------------------------------------------------------ */
/* La description des machines                                         */
/* ------------------------------------------------------------------ */

/* Les équipements de la panne ne s'administrent que depuis le poste du bâtiment B. */
function depuisPosteB(){
	if (Shell.hote() === "poste-b") return true;
	return Shell.pile_ssh.some(function(l){ return racineDe(l) === PosteB; });
}
function refusPanne(nom){
	return function(){
		if (depuisPosteB()) return null;
		return "ssh : connect to host " + nom + " port 22 : Connection timed out\n" +
			C.gris("(Les équipements réseau du bâtiment B ne s'administrent que depuis le Poste de l'accueil : cd ~/Cybersup/BatimentB/Poste, puis ssh " + nom + ".)");
	};
}

function servicePanne(hote, nom){ return HOTES[hote].services[nom]; }
function telnetActif(){ return servicePanne("routeur", "telnet.socket").actif; }
function dhcpActif(){ return servicePanne("routeur", "isc-dhcp-server").actif; }
function nginxActif(){ return servicePanne("intranet", "nginx").actif; }
function apacheActif(){ return servicePanne("intranet", "apache2").actif; }

decrireHote("poste-b", { ip: IP_POSTE, arrivee: function(){ return PosteB; }, noyau: "6.1.0-25-amd64", panne: true, chassis: "desktop",
	refus: function(){
		return "ssh : connect to host poste-b port 22 : Connection refused\n" +
			C.gris("(Le poste de l'accueil n'a pas de serveur ssh : on s'assoit devant. cd ~/Cybersup/BatimentB/Poste)");
	},
	ports: {},
	services: {
		"NetworkManager": service("poste-b", "NetworkManager", "Network Manager"),
		"systemd-resolved": service("poste-b", "systemd-resolved", "Network Name Resolution"),
		"systemd-timesyncd": service("poste-b", "systemd-timesyncd", "Network Time Synchronization", { actif: false, auto: false })
	} });
decrireHote("routeur", { ip: IP_ROUTEUR, ip2: IP_ROUTEUR_COEUR, arrivee: function(){ return Routeur; }, refus: refusPanne("routeur"), noyau: "6.1.0-25-amd64", panne: true, chassis: "server",
	ports: {
		22: port("ssh", BANNIERE_SSH),
		23: { service: "telnet", banniere: "Debian GNU/Linux 12\nrouteur login: ", ferme: function(){ return !telnetActif(); } }
	},
	services: {
		sshd: service("routeur", "sshd", "OpenBSD Secure Shell server"),
		"isc-dhcp-server": service("routeur", "isc-dhcp-server", "ISC DHCP IPv4 server", { actif: false, auto: false, procNom: "dhcpd" }),
		"telnet.socket": service("routeur", "telnet.socket", "Telnet Server Activation Socket", { procNom: "in.telnetd" })
	} });
decrireHote("intranet", { ip: IP_INTRANET, arrivee: function(){ return Intranet; }, refus: refusPanne("intranet"), noyau: "6.1.0-25-amd64", panne: true, chassis: "vm",
	web: function(){ return apacheActif() ? IntranetHtml : IntranetSite; },
	ports: {
		22: port("ssh", BANNIERE_SSH),
		80: { service: "http", banniere: function(){ return "HTTP/1.1 400 Bad Request\nServer: " + (apacheActif() ? "Apache/2.4.57 (Debian)" : "nginx/1.22.1"); },
			ferme: function(){ return !apacheActif() && !nginxActif(); } },
		443: { service: "https", banniere: "(chiffré : ici, nc ne lit que du bruit)", ferme: function(){ return !nginxActif(); } }
	},
	services: {
		sshd: service("intranet", "sshd", "OpenBSD Secure Shell server"),
		nginx: service("intranet", "nginx", "A high performance web server and a reverse proxy server", { actif: false }),
		apache2: service("intranet", "apache2", "The Apache HTTP Server"),
		"fwupd-refresh": service("intranet", "fwupd-refresh", "Refresh fwupd metadata", { actif: false })
	} });

/* Le journal de chaque machine suit ce qui s'y passe. */
Object.defineProperty(HOTES["routeur"], "journal", { configurable: true, get: function(){
	var j = [["hier 18:02", "isc-dhcp-server", "Stopping isc-dhcp-server.service - ISC DHCP IPv4 server..."],
		["hier 18:02", "sudo", "stagiaire : COMMAND=/usr/bin/systemctl disable --now isc-dhcp-server"],
		["hier 18:05", "sudo", "stagiaire : COMMAND=/usr/sbin/iptables -I FORWARD -s 10.0.93.0/24 -p tcp --dport 25 -j DROP"],
		["hier 18:07", "sudo", "stagiaire : COMMAND=/usr/sbin/ip route del 10.0.59.0/24 via " + IP_LILLE_GW],
		["08:05", "in.telnetd", "connect from " + IP_PRESTATAIRE + " (script de supervision du prestataire, toutes les cinq minutes)"],
		["08:10", "in.telnetd", "connect from " + IP_PRESTATAIRE]];
	if (dhcpActif()) j.push(["09:20", "isc-dhcp-server", "Started isc-dhcp-server.service - ISC DHCP IPv4 server."]);
	if (state.panne && state.panne.bail) j.push(["09:21", "dhcpd", "DHCPACK on " + IP_POSTE + " to " + MAC_POSTE + " (poste-b) via eth0"]);
	if (!telnetActif()) j.push(["09:40", "systemd", "telnet.socket: Deactivated successfully."]);
	return lignesDeJournal(j);
} });
Object.defineProperty(HOTES["intranet"], "journal", { configurable: true, get: function(){
	var j = [["hier 18:20", "apt", "Installation de php-cli (par stagiaire), avec sa dépendance apache2"],
		["06:00", "apache2", "Started apache2.service - The Apache HTTP Server."],
		["06:00", "nginx", "Starting nginx.service - A high performance web server..."],
		["06:00", "nginx", "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"],
		["06:00", "nginx", "nginx.service: Failed with result 'exit-code'."],
		["06:01", "fwupd-refresh", "fwupd-refresh.service: Failed (pas d'accès à internet pour les mises à jour du micrologiciel, sans gravité)"]];
	if (!apacheActif()) j.push(["09:30", "apache2", "Stopped apache2.service - The Apache HTTP Server."]);
	if (nginxActif()) j.push(["09:31", "nginx", "Started nginx.service - A high performance web server and a reverse proxy server."]);
	return lignesDeJournal(j);
} });
Object.defineProperty(HOTES["poste-b"], "journal", { configurable: true, get: function(){
	var j = [["hier 18:10", "sudo", "stagiaire : COMMAND=/usr/sbin/ip link set eth0 down"],
		["08:00", "kernel", "rtc_cmos 00:00: setting system clock to 2001-01-01T00:00:00 UTC (pile de la carte mère à plat)"],
		["08:01", "NetworkManager", "device (eth0): state change: disconnected (administratively down)"]];
	if (horlogePosteOK()) j.push(["09:25", "systemd-timesyncd", "Contacted time server " + IP_DNS + ":123. Initial clock synchronization."]);
	return lignesDeJournal(j);
} });
HOTES["poste-b"].dmesg = ["[    0.000000] Linux version 6.1.0-25-amd64", "[    0.412377] rtc_cmos 00:00: setting system clock to 2001-01-01T00:00:00 UTC",
	"[    2.103344] e1000e 0000:00:19.0 eth0: (PCI Express:2.5GT/s) 52:54:00:5d:14:20"];
HOTES["routeur"].dmesg = ["[    0.000000] Linux version 6.1.0-25-amd64", "[    1.900120] e1000e eth0: Link is Up 1000 Mbps Full Duplex", "[    1.900355] e1000e eth1: Link is Up 1000 Mbps Full Duplex"];

/* Les processus des services qui tournent au départ. */
PosteB.addProc(611, "NetworkManager", "root", { service: "NetworkManager", cpu: 0.2, protege: TEXTE_SERVICE_PROTEGE });
PosteB.addProc(498, "systemd-resolved", "systemd-resolve", { service: "systemd-resolved", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Routeur.addProc(tirerPids("routeur-sshd", 1, 300, 999)[0], "sshd", "root", { service: "sshd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Routeur.addProc(tirerPids("routeur-telnet", 1, 300, 999)[0], "in.telnetd", "root", { service: "telnet.socket", cpu: 0.1 });
Intranet.addProc(tirerPids("intranet-sshd", 1, 300, 999)[0], "sshd", "root", { service: "sshd", cpu: 0.1, protege: TEXTE_SERVICE_PROTEGE });
Intranet.addProc(tirerPids("intranet-apache", 1, 1000, 1999)[0], "apache2", "root", { service: "apache2", cpu: 0.6, protege: TEXTE_SERVICE_PROTEGE });

/* Les noms de la panne entrent dans la zone DNS de l'école (et dans la liste des noms légitimes). */
var ZONE_PANNE = [["intranet", IP_INTRANET], ["routeur", IP_ROUTEUR], ["poste-b", IP_POSTE], ["lille-gw", IP_LILLE_GW], ["lille", IP_LILLE], ["marseille", "10.0.13.1"]];
var LIGNE_MX = "@         IN MX 10 mail.cybersup.lan.";
function lignesZonePanne(){
	return ZONE_PANNE.map(function(l){ return completerDroite(l[0], 9) + " IN A " + l[1]; }).concat([LIGNE_MX]);
}
ZoneEcole.setText(ZoneEcole.getText() + lignesZonePanne().join("\n") + "\n");
ZoneEcole.modifie = false;
ZONE_PANNE.forEach(function(l){ ZONE_LEGITIME.push(l); });

/* ------------------------------------------------------------------ */
/* Le réseau de la panne : qui joint qui                               */
/* ------------------------------------------------------------------ */

function nombreIp(ip){ return ip.split(".").reduce(function(t, o){ return t * 256 + parseInt(o, 10); }, 0); }
function ipValide(ip){ return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(ip) && ip.split(".").every(function(o){ return +o <= 255; }); }
function dansReseau(ip, cidr){
	var m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(cidr);
	if (!m || !ipValide(ip)) return false;
	var bloc = Math.pow(2, 32 - parseInt(m[2], 10));
	return Math.floor(nombreIp(m[1]) / bloc) === Math.floor(nombreIp(ip) / bloc);
}
function reseauDe(ip, prefixe){
	var bloc = Math.pow(2, 32 - prefixe), n = Math.floor(nombreIp(ip) / bloc) * bloc;
	return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".") + "/" + prefixe;
}

/* L'adresse utile du poste : la première posée dans le réseau du bâtiment B, en /24. */
function adressePoste(){
	var a = (state.panne.adresses || []).filter(function(x){ return x.prefixe === 24 && dansReseau(x.ip, "10.0.93.0/24") && x.ip !== IP_ROUTEUR; })[0];
	return a ? a.ip : null;
}
/* Les réseaux directement branchés au poste. */
function reseauxPoste(){
	if (!state.panne.lien) return [];
	return state.panne.adresses.map(function(a){ return reseauDe(a.ip, a.prefixe); });
}
function routeDuPoste(ip){
	var p = state.panne;
	if (reseauxPoste().some(function(r){ return dansReseau(ip, r); })) return "direct";
	var meilleure = null, longueur = -1;
	p.routes.forEach(function(r){
		var l = r.vers === "default" ? 0 : parseInt(r.vers.split("/")[1], 10);
		if ((r.vers === "default" || dansReseau(ip, r.vers)) && l > longueur){ meilleure = r; longueur = l; }
	});
	return meilleure ? meilleure.via : null;
}
function routeParDefautPoste(){
	var r = state.panne.routes.filter(function(x){ return x.vers === "default"; })[0];
	return r ? r.via : null;
}
function routesDuRouteur(){
	return [{ vers: "default", via: IP_PAREFEU, dev: "eth1", base: true }].concat(state.panne.routesRouteur);
}
function routeDuRouteur(ip){
	if (dansReseau(ip, "10.0.93.0/24") || dansReseau(ip, "10.0.92.0/24")) return "direct";
	var meilleure = null, longueur = -1;
	routesDuRouteur().forEach(function(r){
		var l = r.vers === "default" ? 0 : parseInt(r.vers.split("/")[1], 10);
		if ((r.vers === "default" || dansReseau(ip, r.vers)) && l > longueur){ meilleure = r; longueur = l; }
	});
	return meilleure ? meilleure.via : null;
}

/* Le filtrage du routeur, comme iptables : la première règle qui correspond décide. */
function regleCorrespond(r, paquet){
	if (r.proto && r.proto !== "all" && r.proto !== paquet.proto) return false;
	if (r.dport && r.dport !== String(paquet.dport)) return false;
	if (r.src && !(r.src.indexOf("/") > -1 ? dansReseau(paquet.src, r.src) : r.src === paquet.src)) return false;
	if (r.dst && !(r.dst.indexOf("/") > -1 ? dansReseau(paquet.dst || "", r.dst) : r.dst === paquet.dst)) return false;
	return true;
}
function verdictForward(paquet){
	var regles = state.panne.iptables.FORWARD;
	for (var i = 0; i < regles.length; i++){
		if (regleCorrespond(regles[i], paquet)) return regles[i].cible;
	}
	return "ACCEPT";
}

/* Le nom d'une adresse connue. */
function nomDeIp(ip){
	if (ip === IP_ROUTEUR_COEUR) return "routeur";
	if (ip === IP_LILLE_GW) return "lille-gw";
	for (var h in HOTES){
		if (HOTES.hasOwnProperty(h) && HOTES[h].ip === ip) return h;
	}
	return null;
}
function ipDeHote(h){ return h === "poste-b" ? (adressePoste() || IP_POSTE) : (HOTES[h] || {}).ip; }

/* Un port est-il ouvert sur la machine visée ? */
function portOuvert(nom, proto, numero){
	if (proto === "udp"){
		if (numero === "53") return nom === "dns";
		if (numero === "67") return nom === "routeur" && dhcpActif();
		if (numero === "123") return nom === "dns";
		return false;
	}
	var ports = (HOTES[nom] || {}).ports || {};
	var p = ports[numero];
	return !!p && !(p.ferme && p.ferme());
}

/*
 * Le chemin d'une machine de la panne vers une adresse : { ok, erreur, sauts }.
 * erreur : "reseau" (Network is unreachable), "hote" (Destination Host Unreachable),
 * "delai" (personne ne répond), "refus" (port fermé), "rejet" (rejeté par un pare-feu).
 */
function cheminVers(depuis, ip, options){
	options = options || {};
	var paquet = { proto: options.proto || "icmp", dport: options.port, dst: ip };
	var sauts = [];
	if (ip === "127.0.0.1" || ip === ipDeHote(depuis) || (depuis === "routeur" && ip === IP_ROUTEUR_COEUR)){
		return arrivee(depuis, ip, [], options, true);
	}
	if (depuis === "poste-b"){
		if (!state.panne.lien) return { ok: false, erreur: "reseau", sauts: [] };
		var gw = routeDuPoste(ip);
		if (!adressePoste() && !state.panne.adresses.length) return { ok: false, erreur: "reseau", sauts: [] };
		if (gw === null) return { ok: false, erreur: "reseau", sauts: [] };
		if (gw === "direct"){
			// Sur le câble du bâtiment B, il n'y a que le réseau 10.0.93.0/24 : le reste ne répond pas aux demandes ARP.
			if (!dansReseau(ip, "10.0.93.0/24")) return { ok: false, erreur: "hote", sauts: [] };
			if (ip === IP_ROUTEUR) state.panne.arp = true;
			return arrivee(depuis, ip, sauts, options);
		}
		if (gw !== IP_ROUTEUR || !adressePoste()) return { ok: false, erreur: "hote", sauts: [] };
		state.panne.arp = true;
		sauts.push(["routeur", IP_ROUTEUR]);
		if (ip === IP_ROUTEUR_COEUR) return arrivee("routeur", ip, sauts, options, true);
		paquet.src = adressePoste();
		var v = verdictForward(paquet);
		var regle = state.panne.iptables.FORWARD.filter(function(r){ return regleCorrespond(r, paquet); })[0];
		if (regle && options.compter) regle.paquets = (regle.paquets || 0) + 1;
		if (v === "DROP") return { ok: false, erreur: "delai", sauts: sauts };
		if (v === "REJECT") return { ok: false, erreur: "rejet", sauts: sauts };
		return depuisLeRouteur(ip, sauts, options);
	}
	if (depuis === "routeur") return depuisLeRouteur(ip, sauts, options);
	// L'intranet, et les autres serveurs du cœur : le routeur est leur passerelle vers le reste.
	if (dansReseau(ip, "10.0.92.0/24")) return arrivee(depuis, ip, sauts, options);
	sauts.push(["routeur", IP_ROUTEUR_COEUR]);
	return depuisLeRouteur(ip, sauts, options);
}
function depuisLeRouteur(ip, sauts, options){
	var gw = routeDuRouteur(ip);
	if (gw === "direct") return arrivee("routeur", ip, sauts, options);
	if (gw === IP_LILLE_GW){
		sauts.push(["lille-gw", IP_LILLE_GW]);
		return arrivee("routeur", ip, sauts, options);
	}
	if (gw !== IP_PAREFEU) return { ok: false, erreur: "delai", sauts: sauts };
	sauts.push(["parefeu", IP_PAREFEU]);
	if (ip === IP_PAREFEU) { sauts.pop(); return arrivee("routeur", ip, sauts, options); }
	// Le parefeu ne laisse pas passer le trafic vers Lille : il a sa liaison à lui.
	if (dansReseau(ip, "10.0.59.0/24")) return { ok: false, erreur: "delai", sauts: sauts };
	return arrivee("routeur", ip, sauts, options);
}
function arrivee(depuis, ip, sauts, options, local){
	var nom = ip === "127.0.0.1" ? depuis : nomDeIp(ip);
	if (!nom && /^10\./.test(ip)) return { ok: false, erreur: "hote", sauts: sauts };
	// Le poste ne répond que s'il a vraiment cette adresse, carte allumée.
	if (nom === "poste-b" && !local && !(state.panne.lien && adressePoste() === ip)) return { ok: false, erreur: "hote", sauts: sauts };
	sauts = sauts.concat([[nom || ip, ip]]);
	if (options.port !== undefined && !portOuvert(nom || "", options.proto || "tcp", String(options.port))){
		return { ok: false, erreur: options.proto === "udp" ? "delai" : "refus", sauts: sauts, nom: nom };
	}
	return { ok: true, sauts: sauts, nom: nom };
}

/* Le serveur DNS que le poste interroge vraiment : celui de resolvectl ou du DHCP, sinon le premier de resolv.conf. */
function dnsDuFichier(){
	var m = /^\s*nameserver\s+(\S+)/m.exec(ResolvConf.getText());
	return m ? m[1] : null;
}
function dnsEffectif(depuis){
	if ((depuis || Shell.hote()) !== "poste-b") return IP_DNS;
	return state.panne.dnsRuntime || dnsDuFichier();
}
function dnsRepond(depuis, serveur){
	return serveur === IP_DNS && cheminVers(depuis, serveur, { proto: "udp", port: "53" }).ok;
}
/* /etc/hosts du poste */
function depuisHosts(nom){
	var trouve = null;
	lignesDe(PosteHosts.getText()).forEach(function(l){
		var c = l.replace(/#.*$/, "").trim().split(/\s+/);
		if (c.length >= 2 && !trouve && c.slice(1).some(function(n){ return n === nom; })) trouve = c[0];
	});
	return trouve;
}
function nomCourt(nom){ return String(nom).replace(/\.$/, "").replace(/\.cybersup\.lan$/, ""); }
/* Un enregistrement de la zone (A par défaut). */
function chercherZone(nom, type){
	var court = nomCourt(nom);
	if (court === "cybersup.lan" || court === "") court = "@";
	return zoneDns().filter(function(r){ return r.nom === court && r.type === (type || "A"); }).map(function(r){ return r.valeur; });
}

/* Traduire un nom en adresse, depuis une machine : { ip } ou { erreur: "temp" | "inconnu" }. */
function resoudreDepuis(depuis, nom){
	if (ipValide(nom)) return { ip: nom };
	if (nom === "localhost") return { ip: "127.0.0.1" };
	var court = nomCourt(nom);
	if (depuis === "poste-b"){
		var local = depuisHosts(nom) || depuisHosts(court);
		if (local){
			if (local !== "127.0.0.1" && local !== "127.0.1.1" && chercherZone(court).length === 0) state.complete("s_r_hosts");
			return { ip: local === "127.0.1.1" ? "127.0.0.1" : local };
		}
		if (!dnsRepond(depuis, dnsEffectif(depuis))) return { erreur: "temp" };
	} else if (!estHotePanne(depuis)){
		// Ailleurs, les noms des machines connues se résolvent aussi directement (comme avant la panne).
		if (HOTES[court] && HOTES[court].ip) return { ip: HOTES[court].ip };
	}
	var a = chercherZone(court);
	return a.length ? { ip: a[0] } : { erreur: "inconnu" };
}

function estHotePanne(h){ return !!(HOTES[h] && HOTES[h].panne); }

/* La résolution des noms marche-t-elle sur le poste (sans compter /etc/hosts) ? */
function dnsPosteOK(){
	return !!adressePoste() && state.panne.lien && dnsRepond("poste-b", dnsEffectif("poste-b"));
}
function reseauPosteOK(){
	return !!adressePoste() && state.panne.lien && routeParDefautPoste() === IP_ROUTEUR && dnsPosteOK();
}
/* L'horloge du poste : sa pile est à plat, elle repart de 2001 tant qu'elle n'est pas synchronisée. */
function horlogePosteOK(){
	return servicePanne("poste-b", "systemd-timesyncd").actif && cheminVers("poste-b", IP_DNS, { proto: "udp", port: "123" }).ok;
}
function dateDuPoste(){
	var d = new Date();
	if (Shell.hote() !== "poste-b" || horlogePosteOK()) return d;
	return new Date(2001, 0, 1, d.getHours(), d.getMinutes(), d.getSeconds());
}

/* Le DHCP : le serveur du routeur répond si le lien est là et le service tourne. */
function obtenirBail(){
	var p = state.panne;
	if (!p.lien || !dhcpActif()) return false;
	p.adresses = p.adresses.filter(function(a){ return !a.dhcp && a.ip !== IP_POSTE; });
	p.adresses.unshift({ ip: IP_POSTE, prefixe: 24, dhcp: true });
	p.routes = p.routes.filter(function(r){ return r.vers !== "default"; });
	p.routes.push({ vers: "default", via: IP_ROUTEUR, dhcp: true });
	p.dnsRuntime = IP_DNS;
	p.bail = true;
	return true;
}
function rendreBail(){
	var p = state.panne;
	p.adresses = p.adresses.filter(function(a){ return !a.dhcp; });
	p.routes = p.routes.filter(function(r){ return !r.dhcp; });
	if (p.bail) p.dnsRuntime = null;
	p.bail = false;
}

/* ------------------------------------------------------------------ */
/* netplan : un tout petit lecteur de YAML                             */
/* ------------------------------------------------------------------ */

function ErreurYaml(ligne, message){ this.ligne = ligne; this.message = message; }

function lireYaml(texte){
	var lignes = [];
	texte.split("\n").forEach(function(brute, i){
		if (/\t/.test(brute.replace(/#.*$/, ""))) throw new ErreurYaml(i + 1, "found character '\\t' that cannot start any token (pas de tabulation en YAML : des espaces)");
		var sans = brute.replace(/\s+#.*$/, "").replace(/^#.*$/, "");
		if (sans.trim() === "") return;
		lignes.push({ indent: sans.match(/^ */)[0].length, contenu: sans.trim(), num: i + 1 });
	});
	var pos = 0;
	function scalaire(v){
		v = v.trim();
		if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(",").map(function(x){ return scalaire(x); }).filter(function(x){ return x !== ""; });
		if (/^(true|yes)$/i.test(v)) return true;
		if (/^(false|no)$/i.test(v)) return false;
		return v.replace(/^["']|["']$/g, "");
	}
	function bloc(indent){
		if (pos >= lignes.length) return null;
		if (lignes[pos].contenu.charAt(0) === "-"){
			var liste = [];
			while (pos < lignes.length && lignes[pos].indent === indent && lignes[pos].contenu.charAt(0) === "-"){
				var reste = lignes[pos].contenu.replace(/^-\s*/, "");
				if (/^[^:\s\[]+:(\s|$)/.test(reste)){
					lignes[pos] = { indent: indent + 2, contenu: reste, num: lignes[pos].num };
					liste.push(bloc(indent + 2));
				} else {
					liste.push(scalaire(reste));
					pos++;
				}
			}
			return liste;
		}
		var objet = {};
		while (pos < lignes.length && lignes[pos].indent === indent){
			var l = lignes[pos];
			var m = /^([^:]+):(?:\s+(.*))?$/.exec(l.contenu);
			if (!m) throw new ErreurYaml(l.num, "could not find expected ':'");
			pos++;
			if (m[2] !== undefined && m[2].trim() !== ""){ objet[m[1].trim()] = scalaire(m[2]); continue; }
			if (pos < lignes.length && lignes[pos].indent > indent) objet[m[1].trim()] = bloc(lignes[pos].indent);
			else if (pos < lignes.length && lignes[pos].indent === indent && lignes[pos].contenu.charAt(0) === "-") objet[m[1].trim()] = bloc(indent);
			else objet[m[1].trim()] = null;
		}
		if (pos < lignes.length && lignes[pos].indent > indent) throw new ErreurYaml(lignes[pos].num, "mapping values are not allowed in this context (indentation inattendue)");
		return objet;
	}
	var racine = lignes.length ? bloc(lignes[0].indent) : {};
	if (pos < lignes.length) throw new ErreurYaml(lignes[pos].num, "did not find expected key (indentation incohérente)");
	return racine || {};
}

/* Ce que dit la configuration netplan du poste pour eth0. */
function confNetplan(){
	var y;
	try { y = lireYaml(NetplanPoste.getText()); }
	catch (e){ if (e instanceof ErreurYaml) return { erreur: "/etc/netplan/01-poste.yaml:" + e.ligne + ": Invalid YAML: " + e.message }; throw e; }
	var eth = y && y.network && y.network.ethernets && y.network.ethernets.eth0;
	if (!eth || typeof eth !== "object") return { erreur: "/etc/netplan/01-poste.yaml: network.ethernets.eth0 introuvable" };
	var conf = { dhcp4: eth.dhcp4 === true, adresses: [], passerelle: null, dns: null };
	(Array.isArray(eth.addresses) ? eth.addresses : []).forEach(function(a){
		var m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(String(a));
		if (m && ipValide(m[1])) conf.adresses.push({ ip: m[1], prefixe: parseInt(m[2], 10) });
	});
	if (eth.gateway4) conf.passerelle = String(eth.gateway4);
	(Array.isArray(eth.routes) ? eth.routes : []).forEach(function(r){
		if (r && (r.to === "default" || r.to === "0.0.0.0/0") && r.via) conf.passerelle = String(r.via);
	});
	if (eth.nameservers && Array.isArray(eth.nameservers.addresses) && eth.nameservers.addresses.length) conf.dns = String(eth.nameservers.addresses[0]);
	return conf;
}

/* netplan apply (et le démarrage) : la configuration du fichier remplace celle du moment. */
function appliquerNetplan(){
	var conf = confNetplan();
	if (conf.erreur) return conf;
	var p = state.panne;
	p.lien = true;
	p.adresses = [];
	p.routes = [];
	p.dnsRuntime = null;
	p.bail = false;
	conf.adresses.forEach(function(a){ p.adresses.push({ ip: a.ip, prefixe: a.prefixe }); });
	if (conf.passerelle && p.adresses.some(function(a){ return dansReseau(conf.passerelle, reseauDe(a.ip, a.prefixe)); })) p.routes.push({ vers: "default", via: conf.passerelle });
	if (conf.dns) p.dnsRuntime = conf.dns;
	conf.bail = conf.dhcp4 ? obtenirBail() : false;
	if (reseauPosteOK()) p.netplanOK = true;
	return conf;
}

/* ------------------------------------------------------------------ */
/* Les quêtes du chapitre                                              */
/* ------------------------------------------------------------------ */

var QUETES_PANNE = [
	{ id: "r_batiment", titre: "Rejoindre Radia au BatimentB",
	  indice: "Laurent a ajouté un P.S. : relis-le (less Laurent, dans la Citadelle). Le BatimentB est à Cybersup." },
	{ id: "r_osi", titre: "Comprendre le modèle OSI, la clé du réseau",
	  indice: "Radia montre l'affiche punaisée sur l'armoire du BatimentB : cat ModeleOSI. Sept étages, du câble jusqu'au web." },
	{ id: "r_lien", titre: "Réveiller la carte réseau du poste",
	  indice: "Radia explique la méthode : on part du bas. Sur le Poste, ip link montre si eth0 est UP." },
	{ id: "r_ip", titre: "Donner une adresse IP au poste",
	  indice: "ip a ne montre aucune ligne inet sur eth0. Le DHCP ne répond pas : l'Etiquette du poste donne l'adresse à poser à la main." },
	{ id: "r_passerelle", titre: "Indiquer au poste sa passerelle",
	  indice: "Le routeur répond, le reste du réseau non : il manque la route par défaut. ip r la montre, l'Etiquette donne la passerelle." },
	{ id: "r_dns", titre: "Réparer la résolution des noms",
	  indice: "Les adresses passent, les noms non. Regarde quel serveur le poste interroge : /etc/resolv.conf. Le MemoDNS, dans /etc, aide." },
	{ id: "r_dhcp", titre: "Relancer le serveur DHCP du routeur",
	  indice: "Le DHCP n'a jamais répondu. Il tourne sur le routeur : ssh routeur, puis lis le CahierDuRouteur." },
	{ id: "r_netplan", titre: "Rendre la configuration du poste permanente",
	  indice: "La configuration qui survit au redémarrage est dans /etc/netplan, sur le poste. L'AideMemoire du poste explique netplan." },
	{ id: "r_web", titre: "Rendre l'intranet à nginx",
	  indice: "curl http://intranet/ affiche une page par défaut. Sur l'intranet (ssh intranet), quelqu'un d'autre tient le port 80. La NoteDeVint aide." },
	{ id: "r_https", titre: "Remettre le poste à l'heure",
	  indice: "curl https://intranet/, depuis le poste, refuse un certificat « pas encore valide ». Compare les dates du certificat avec date, sur le poste." },
	{ id: "r_smtp", titre: "Débloquer l'envoi des mails",
	  indice: "nc -zv mail 25, depuis le poste : timed out. Un paquet avalé sans réponse, c'est un pare-feu. Le routeur filtre avec iptables." },
	{ id: "r_lille", titre: "Rétablir la route vers Lille",
	  indice: "traceroute lille, depuis le poste, montre où les paquets se perdent. Le CahierDuRouteur dit par où passe la liaison avec Lille." },
	{ id: "r_telnet", titre: "Fermer le telnet du routeur",
	  indice: "ss -tlnp, sur le routeur, montre un port 23 ouvert. sudo tcpdump -A port 23 montre pourquoi c'est grave." },
	{ id: "r_fin", titre: "Faire le compte rendu à Radia",
	  indice: "Tout remarche : retourne voir Radia, au BatimentB (cat Radia)." }
];

var QUETES_SECONDAIRES_PANNE = [
	{ id: "s_r_ping", titre: "Envoyer exactement quatre paquets avec ping -c 4" },
	{ id: "s_r_voisins", titre: "Lire l'adresse MAC du routeur avec ip neigh" },
	{ id: "s_r_erreurs", titre: "Lire les compteurs de la carte avec ip -s link" },
	{ id: "s_r_hostnamectl", titre: "Relever l'identité de trois machines avec hostnamectl" },
	{ id: "s_r_host", titre: "Résoudre un nom avec host" },
	{ id: "s_r_nslookup", titre: "Résoudre un nom avec nslookup" },
	{ id: "s_r_mx", titre: "Trouver le serveur de courrier de l'école (dig MX)" },
	{ id: "s_r_hosts", titre: "Se créer un raccourci de nom dans /etc/hosts" },
	{ id: "s_r_resolvectl", titre: "Voir quel DNS le poste interroge avec resolvectl" },
	{ id: "s_r_nmcli", titre: "Faire le point sur les cartes avec nmcli" },
	{ id: "s_r_bail", titre: "Rendre puis reprendre un bail DHCP" },
	{ id: "s_r_reboot", titre: "Redémarrer le poste et retrouver le réseau tout seul" },
	{ id: "s_r_udp", titre: "Voir le port du DHCP avec ss -u" },
	{ id: "s_r_failed", titre: "Lister les services en échec" },
	{ id: "s_r_wget", titre: "Télécharger le planning de l'intranet avec wget" },
	{ id: "s_r_entetes", titre: "Lire les en-têtes de l'intranet avec curl -I" },
	{ id: "s_r_x509", titre: "Lire les dates du certificat avec openssl x509" },
	{ id: "s_r_banniere", titre: "Lire la bannière du serveur de mail avec nc" },
	{ id: "s_r_telnet", titre: "Parler au serveur de mail avec telnet" },
	{ id: "s_r_iptables_v", titre: "Compter les paquets bloqués avec iptables -v" },
	{ id: "s_r_mtr", titre: "Faire un rapport mtr" },
	{ id: "s_r_traceroute_n", titre: "Tracer une route sans les noms (traceroute -n)" },
	{ id: "s_r_dns_capture", titre: "Voir passer des questions DNS avec tcpdump" },
	{ id: "s_r_clair", titre: "Voir un mot de passe passer en clair avec tcpdump -A" },
	{ id: "s_r_osi", titre: "Réciter les sept étages du modèle OSI dans ~/osi.txt" },
	{ id: "s_r_anciens", titre: "Lancer les quatre sorts des anciens : ifconfig, route, arp et netstat" },
	{ id: "s_r_arping", titre: "Vérifier avec arping -D que personne n'a pris l'adresse du poste" },
	{ id: "s_r_tracepath", titre: "Mesurer avec tracepath la taille des messagers jusqu'à Lille" },
	{ id: "s_r_getent", titre: "Retrouver ton raccourci de /etc/hosts avec getent hosts" },
	{ id: "s_r_uptime", titre: "Constater avec uptime que le poste vient de se réveiller" },
	{ id: "s_r_iperf", titre: "Mesurer le débit jusqu'à l'intranet avec iperf3" },
	{ id: "s_r_nft", titre: "Lire la loi de la herse dans la langue moderne (nft list ruleset)" }
];

var INDICES_PANNE = {
	r_osi: [
		"L'affiche est dans le BatimentB, sur l'armoire réseau, à côté de Radia.",
		"cd ~/Cybersup/BatimentB puis cat ModeleOSI"],
	r_batiment: [
		"Le BatimentB est un lieu de Cybersup, comme la SalleReseau.",
		"cd ~/Cybersup/BatimentB puis cat Radia"],
	r_lien: [
		"ip link montre eth0 sans le mot UP entre les chevrons : la carte est éteinte. ip link set la rallume, avec sudo.",
		"cd Poste, puis sudo ip link set eth0 up"],
	r_ip: [
		"Le DHCP ne répond pas (sudo dhclient eth0 ne reçoit rien). On pose l'adresse de l'Etiquette à la main, avec son masque /24.",
		"Sur le Poste : sudo ip addr add " + IP_POSTE + "/24 dev eth0"],
	r_passerelle: [
		"ip r ne montre aucune ligne « default » : le poste ne sait pas par où sortir de son réseau. La passerelle est le routeur, " + IP_ROUTEUR + ".",
		"Sur le Poste : sudo ip route add default via " + IP_ROUTEUR],
	r_dns: [
		"cat /etc/resolv.conf : le serveur noté là, " + IP_DNS_FAUX + ", n'existe pas. Le bon est sur l'Etiquette. dig @" + IP_DNS + " intranet le prouve.",
		"Sur le Poste : sudo nano /etc/resolv.conf, remplace " + IP_DNS_FAUX + " par " + IP_DNS + ", Ctrl+O, Ctrl+X (ou : sudo resolvectl dns eth0 " + IP_DNS + ")"],
	r_dhcp: [
		"Sur le routeur, systemctl status isc-dhcp-server le montre arrêté ET désactivé. Il faut les deux : le démarrer, et l'activer au démarrage.",
		"ssh routeur, puis sudo systemctl enable --now isc-dhcp-server"],
	r_netplan: [
		"Dans /etc/netplan/01-poste.yaml, le stagiaire a écrit dhcp4: false. Remets true, puis applique : la configuration du fichier remplace celle du moment.",
		"Sur le Poste : sudo netplan set ethernets.eth0.dhcp4=true, puis sudo netplan apply"],
	r_web: [
		"sudo ss -tlnp, sur l'intranet : c'est apache2 qui tient le port 80, et nginx n'a pas pu démarrer. Arrête et désactive apache2, puis démarre nginx.",
		"ssh intranet, sudo systemctl disable --now apache2, puis sudo systemctl start nginx"],
	r_https: [
		"Le certificat est valide depuis vingt jours, mais date, sur le poste, affiche 2001 : pour lui, le certificat n'existe pas encore. Synchronise son horloge.",
		"Sur le Poste : sudo timedatectl set-ntp true"],
	r_smtp: [
		"sudo iptables -L FORWARD -n --line-numbers, sur le routeur : une règle DROP vise le port 25 du bâtiment B. Retire-la par son numéro.",
		"ssh routeur, puis sudo iptables -D FORWARD 1"],
	r_lille: [
		"Le traceroute passe par le parefeu, qui jette tout ce qui va vers Lille. Il manque la route vers 10.0.59.0/24 par lille-gw, sur le routeur.",
		"ssh routeur, puis sudo ip route add 10.0.59.0/24 via " + IP_LILLE_GW],
	r_telnet: [
		"Le port 23 est tenu par un socket systemd, telnet.socket. Il faut l'arrêter ET le désactiver.",
		"ssh routeur, puis sudo systemctl disable --now telnet.socket"],
	r_fin: [
		"Radia est au BatimentB de Cybersup.",
		"cd ~/Cybersup/BatimentB puis cat Radia"]
};

function routeLilleOK(){
	return state.panne.routesRouteur.some(function(r){ return r.vers === "10.0.59.0/24" && r.via === IP_LILLE_GW; });
}

/*
 * Ce qui ne marche plus, au moment de faire le compte rendu : une étape franchie puis défaite
 * (un redémarrage, une règle remise...) doit être refaite avant que Radia signe le certificat.
 */
function pannesRestantes(){
	var p = state.panne, liste = [];
	var dhcp = servicePanne("routeur", "isc-dhcp-server"), apache = servicePanne("intranet", "apache2"), nginx = servicePanne("intranet", "nginx");
	var telnet = servicePanne("routeur", "telnet.socket");
	if (!p.lien) liste.push("la carte eth0 du poste est éteinte");
	else if (!adressePoste()) liste.push("le poste n'a plus d'adresse");
	else if (routeParDefautPoste() !== IP_ROUTEUR) liste.push("le poste n'a plus de passerelle");
	else if (!dnsPosteOK()) liste.push("le poste ne résout plus les noms");
	if (!(dhcp.actif && dhcp.auto)) liste.push("le serveur DHCP du routeur n'est pas démarré et activé");
	var conf = confNetplan();
	if (conf.erreur || !(conf.dhcp4 || (conf.adresses.length && conf.passerelle && conf.dns))) liste.push("la configuration netplan du poste ne tiendrait pas au redémarrage");
	if (apache.actif || apache.auto || !nginx.actif || !nginx.auto) liste.push("l'intranet n'est plus servi par nginx");
	if (!horlogePosteOK()) liste.push("l'horloge du poste n'est plus synchronisée");
	if (verdictForward({ proto: "tcp", dport: "25", src: IP_POSTE, dst: "10.0.92.11" }) !== "ACCEPT") liste.push("le routeur bloque de nouveau les mails");
	if (!routeLilleOK()) liste.push("la route vers Lille a disparu");
	if (telnet.actif || telnet.auto) liste.push("le telnet du routeur est de nouveau ouvert");
	return liste;
}

/* La prochaine étape de la panne, ou null. */
function prochaineEtapePanne(){
	for (var i = 0; i < QUETES_PANNE.length; i++){
		if (!state.quests[QUETES_PANNE[i].id]) return QUETES_PANNE[i];
	}
	return null;
}

/* ------------------------------------------------------------------ */
/* Radia : ce qu'elle dit, au BatimentB et au talkie-walkie            */
/* ------------------------------------------------------------------ */

var TALKIE = {
	r_osi: "Avant de toucher à quoi que ce soit, lis l'affiche sur l'armoire : cat ModeleOSI. Sept étages, et tout le chapitre tient dedans.",
	r_lien: "La tour, tu l'as en tête. Maintenant, le Poste, derrière le comptoir (cd Poste), étage 1 : ip link. eth0 est-elle UP ?",
	r_ip: "La porte est ouverte (eth0 est UP) ! Mais le Poste n'a pas d'adresse : ip a. Lis l'AideMemoire du Poste (cat AideMemoire) : elle t'apprend à appeler la Source (sudo dhclient eth0). Si la Source reste muette, l'Etiquette du poste donne l'adresse à poser à la main.",
	r_passerelle: "Le Poste a une adresse. Lance l'Écho vers la Tour (ping " + IP_ROUTEUR + ") : elle doit répondre. Mais pour sortir de la rue, il faut un chemin vers elle : ip r, et l'Etiquette.",
	r_dns: "Les messagers circulent ! Mais ping intranet échoue : le Poste consulte un oracle qui n'existe pas. cat /etc/resolv.conf, et le MemoDNS, dans /etc.",
	r_dhcp: "Tout marche... à la main. Pourquoi la Source n'a rien donné ? Elle coule au pied de la Tour : ssh routeur, et lis le CahierDuRouteur.",
	r_netplan: "La Source coule de nouveau. Mais au prochain sommeil (redémarrage), le Poste oubliera tout ce que tu as fait avec ip. Ce qui doit durer se grave dans /etc/netplan. L'AideMemoire explique.",
	r_web: "Le bâtiment B est reconnecté pour de bon. La Bibliothèque, maintenant : curl http://intranet/ affiche n'importe quoi. Va voir sur place : ssh intranet.",
	r_https: "La Bibliothèque a retrouvé son gardien ! Mais curl https://intranet/, depuis le Poste, refuse son blason (le certificat). Lis ses dates avec openssl s_client, l'heure du Poste avec date : compare.",
	r_smtp: "Le Poste est à l'heure. Les pigeons de la Volière ne partent plus du bâtiment B : nc -zv mail 25, depuis le Poste. Timed out ou refused ? Ça change tout.",
	r_lille: "Les mails partent ! Reste le Comptoir du Nord : traceroute lille, depuis le Poste, déroule le Fil d'Ariane jusqu'à l'endroit où les messagers se perdent.",
	r_telnet: "Lille répond ! Une dernière chose : ss -tlnp, sur la Tour, montre une porte 23 ouverte. Telnet, où tout se dit à voix haute. Écoute ce qui y passe (sudo tcpdump -A port 23), puis scelle-la.",
	r_fin: "Plus un voyant orange dans l'armoire. Reviens me voir au BatimentB : cat Radia."
};

/* L'étage du modèle OSI où se joue chaque étape. */
var ETAGE_OSI = {
	r_lien: "Étages 1 et 2 (Physique, Liaison)", r_ip: "Étage 3 (Réseau)", r_passerelle: "Étage 3 (Réseau)",
	r_dns: "Étage 7 (Application)", r_dhcp: "Étage 7 (Application)", r_netplan: "Étages 1 à 3, gravés pour de bon",
	r_web: "Étages 4 et 7 (Transport, Application)", r_https: "Étage 6 (Présentation)", r_smtp: "Étage 4 (Transport)",
	r_lille: "Étage 3 (Réseau)", r_telnet: "Étages 5 à 7 (Session, Présentation, Application)"
};
function talkiePour(id){ return (ETAGE_OSI[id] ? ETAGE_OSI[id] + ". " : "") + TALKIE[id]; }

/* Ce qu'il faut comprendre avant chaque étape, expliqué à quelqu'un qui n'a jamais touché un réseau. */
var NOTIONS_LIEN = "Étage 1, le câble et la carte réseau. Étage 2, parler à ses voisins grâce à leur adresse MAC. Une carte éteinte (DOWN) coupe tout le reste.";
var NOTIONS = {
	r_ip: "Sans ADRESSE IP, une machine est une maison sans adresse postale : personne ne peut lui écrire. D'habitude, la Source (le DHCP) en donne une toute seule.",
	r_passerelle: "Le Poste parle à ses voisins de rue. Pour aller plus loin, il doit passer par la Tour du Carrefour (la PASSERELLE) : il lui faut une route par défaut.",
	r_dns: "Les humains retiennent des noms, les machines des adresses. L'Oracle des Noms (le DNS) traduit l'un en l'autre.",
	r_dhcp: "La Source est un SERVICE, un programme qui veille. Il doit être éveillé (start) ET se réveiller à chaque démarrage (enable).",
	r_netplan: "Ce qu'on règle avec ip s'efface au redémarrage, comme une craie. Ce qui doit durer s'écrit dans /etc/netplan.",
	r_web: "Chaque service écoute derrière une PORTE numérotée (un PORT) : 22 pour ssh, 80 pour le web. Une porte n'a qu'un seul gardien.",
	r_https: "https, c'est le web chiffré. Le serveur montre un BLASON (un certificat) valable entre deux dates : si l'horloge du Poste ment, il est refusé.",
	r_smtp: "La Herse (le PARE-FEU) laisse passer, jette ou renvoie chaque messager. « refused » : porte fermée. « timed out » : messager jeté.",
	r_lille: "La Tour envoie chaque messager selon ses ROUTES. Sans route précise, tout part vers internet. Or Lille a son propre pont.",
	r_telnet: "telnet parle EN CLAIR : tout s'entend, mots de passe compris. ssh fait le même travail dans un tunnel chiffré."
};

/* Ce qu'il faut retenir, juste après chaque réparation. */
var A_RETENIR = {
	r_osi: "Le modèle OSI range le réseau en sept étages : Physique, Liaison, Réseau, Transport, Session, Présentation, Application. On dépanne de bas en haut.",
	r_lien: "Une carte réseau éteinte (DOWN) ne laisse rien passer. ip link montre son état, sudo ip link set eth0 up l'allume.",
	r_ip: "Une adresse IP identifie une machine sur le réseau. ip a la montre ; le /24 dit que les machines en 10.0.93.x sont dans le même réseau.",
	r_passerelle: "Pour sortir de son réseau, il faut une route par défaut vers la passerelle (le routeur). ip r montre les routes.",
	r_dns: "Le DNS traduit les noms en adresses. Le poste interroge le serveur noté dans /etc/resolv.conf : s'il est faux, plus aucun nom ne marche.",
	r_dhcp: "Un service doit être démarré (start) ET activé au démarrage (enable). enable --now fait les deux.",
	r_netplan: "Ce qu'on fait avec ip s'efface au redémarrage ; la configuration permanente s'écrit dans /etc/netplan, puis netplan apply.",
	r_web: "Un port = un service. ss -tlnp dit quel programme tient quel port. Deux programmes ne peuvent pas partager le même port.",
	r_https: "Un certificat est valable entre deux dates : une horloge fausse le fait refuser. timedatectl set-ntp true synchronise l'heure.",
	r_smtp: "« refused » : port fermé. « timed out » : un pare-feu jette les paquets. iptables -L montre les règles, la première qui correspond décide.",
	r_lille: "Une route précise passe avant la route par défaut. ip route add RÉSEAU via PASSERELLE en ajoute une.",
	r_telnet: "telnet envoie tout en clair, ssh chiffre. Un service dangereux s'arrête et se désactive : disable --now."
};

function texteRadia(){
	var etape = prochaineEtapePanne();
	if (!etape){
		if (state.has("crypteOuverte") && !state.quests["c_rapport"]) return "Radia range son portable. « Le réseau tient. Grace t'attend sous la Citadelle : ssh citadelle, puis cd Crypte. »";
		return "Radia range son portable. « Le réseau tient. Vint rentre lundi : il va être jaloux. Merci, la recrue. »";
	}
	// Une réplique courte : l'étage OSI, l'idée en deux phrases, ce qu'on fait. Le reste est dans le panneau.
	var etage = function(id){ return ETAGE_OSI[id] ? C.gris("[" + ETAGE_OSI[id] + "]") + "\n" : ""; };
	switch (etape.id){
		case "r_batiment":
		case "r_osi":
			return "« " + (state.has("chapitre1Saute") ? "Merci d'être venu en renfort ! " : "Ah, la recrue de Laurent ! ") +
				"Radia, mage du réseau. Le bâtiment B est tombé dans le Silence : plus d'intranet, plus de mails, plus de Lille. Vint, le gardien, est en vacances.\n\n" +
				"Un réseau, c'est une tour de sept étages : le MODÈLE OSI. On répare toujours en partant du bas. Lis l'affiche sur l'armoire : cat ModeleOSI. »\n" +
				C.gris("(schema : la tour et la carte. badges : ce que tu as appris. Ma SacocheDeRadia est sur le comptoir.)");
		case "r_lien":
			return "« On commence tout en bas, étages 1 et 2. " + NOTIONS_LIEN + "\n\nVa au Poste, derrière le comptoir (cd Poste), et lance l'Œil du Réseau : ip link. eth0 porte-t-elle le mot UP ? »";
		case "r_annexe":
			return "« " + TALKIE.r_annexe + " »";
		case "r_fin":
			return "« Tu as remonté les sept étages, du câble jusqu'au web, au bâtiment B comme à l'Annexe. C'est comme ça qu'on dépanne un vrai réseau. Ton CertificatReseau t'attend dans ta Maison.\n\n" +
				"Grace, de la WarRoom, voit du trafic bizarre sous la Citadelle. Une trappe vient de s'ouvrir : ssh citadelle, puis cd Crypte. Ce sera ton troisième chapitre. »";
	}
	if (NOTIONS[etape.id]) return etage(etape.id) + "« " + NOTIONS[etape.id] + "\n\n" + TALKIE[etape.id] + " »";
	return "« On continue ? »";
}

/* ------------------------------------------------------------------ */
/* Les voyants du réseau et le schema                                  */
/* ------------------------------------------------------------------ */

/* Les sept étages du modèle OSI, vus depuis le Poste : chacun tient-il, à cet instant ? */
function etagesOSI(){
	var v = {};
	voyantsPanne().forEach(function(x){ v[x.id] = x.ok; });
	var p = state.panne;
	return [
		{ n: 1, id: "physique", titre: "1 Physique", court: "1 Phys.", ok: v.lien },
		{ n: 2, id: "liaison", titre: "2 Liaison", court: "2 Liais.", ok: !!(v.lien && p.arp && adressePoste()) },
		{ n: 3, id: "reseau", titre: "3 Réseau", court: "3 Rés.", ok: !!(v.adresse && v.route) },
		{ n: 4, id: "transport", titre: "4 Transport", court: "4 Transp.", ok: !!(v.mail && v.web) },
		{ n: 5, id: "session", titre: "5 Session", court: "5 Sess.", ok: !!(v.route && v.telnet) },
		{ n: 6, id: "presentation", titre: "6 Présentation", court: "6 Prés.", ok: !!v.heure },
		{ n: 7, id: "application", titre: "7 Application", court: "7 Appli.", ok: !!(v.noms && v.dhcp && v.web) }
	];
}

/* L'état de chaque couche et de chaque service, tel qu'il est vraiment, à cet instant. */
function voyantsPanne(){
	var p = state.panne;
	var dhcp = servicePanne("routeur", "isc-dhcp-server"), nginx = servicePanne("intranet", "nginx"), apache = servicePanne("intranet", "apache2");
	return [
		{ id: "lien", titre: "Lien", ok: !!p.lien },
		{ id: "adresse", titre: "Adresse", ok: !!(p.lien && adressePoste()) },
		{ id: "route", titre: "Route", ok: !!(p.lien && adressePoste() && routeParDefautPoste() === IP_ROUTEUR) },
		{ id: "noms", titre: "Noms", ok: dnsPosteOK() },
		{ id: "dhcp", titre: "DHCP", ok: dhcp.actif && dhcp.auto },
		{ id: "web", titre: "Web", ok: nginx.actif && !apache.actif },
		{ id: "heure", titre: "Heure", ok: horlogePosteOK() },
		{ id: "mail", titre: "Mail", ok: verdictForward({ proto: "tcp", dport: "25", src: IP_POSTE, dst: "10.0.92.11" }) === "ACCEPT" },
		{ id: "lille", titre: "Lille", ok: routeLilleOK() },
		{ id: "telnet", titre: "Telnet", ok: !servicePanne("routeur", "telnet.socket").actif }
	];
}

/*
 * La carte du royaume (le réseau de l'école), étroite pour tenir dans le panneau de droite :
 * une machine par ligne, les liens en vert ou en rouge, la brume sur ce qui n'est pas encore exploré.
 */
function texteSchema(){
	var v = {};
	voyantsPanne().forEach(function(x){ v[x.id] = x.ok; });
	var ici = Shell.hote();
	var carte = typeof carteRpg === "function" ? carteRpg() : null;
	function connu(cle){ return !carte || carte[cle]; }
	function ok(b, texte){ return b ? C.vert(texte) : C.rouge(texte); }
	function voyant(b, texte){ return ok(b, "● " + texte); }
	function branche(cle, b, texte){ return connu(cle) ? ok(b, texte) : C.gris(texte); }
	function lieu(cle, vrai, rpg){
		if (!connu(cle)) return C.gris("░░░░░░░░  dans la brume");
		var t = C.gras(completerDroite(vrai, 9)) + " " + rpg;
		return t + (ici === vrai ? C.jaune("  ◀ toi") : "");
	}
	var relie = v.lien && v.adresse && v.route;
	var avecAnnexe = typeof annexeOuverte === "function" && annexeOuverte(), an = avecAnnexe ? annexe() : null;
	var tour = [C.gras("LA TOUR OSI DU POSTE") + C.gris("  (cat ModeleOSI)")];
	etagesOSI().slice().reverse().forEach(function(e){ tour.push("  " + ok(e.ok, "█ ") + completerDroite(e.titre, 16) + (e.ok ? C.vert("tient") : C.rouge("cassé"))); });
	tour.push("");
	var lignes = tour.concat([
		C.gras("CARTE DU ROYAUME DE CYBERSUP"),
		C.jaune("commande du jeu, pas Linux (man schema)"),
		C.gris("vert : ça marche · rouge : en panne"),
		C.gris("░ : pas encore exploré (lance des sorts)"),
		"",
		"  " + lieu("poste", "poste-b", "Poste de garde"),
		"    " + C.gris(adressePoste() || "pas d'adresse"),
		"    " + voyant(v.lien, "lien") + "  " + voyant(v.adresse, "adresse"),
		"    " + voyant(v.route, "route") + "  " + voyant(v.noms, "noms"),
		"      " + ok(relie, "│"),
		"  " + lieu("routeur", "routeur", "Tour du Carrefour"),
		connu("routeur") ? "    " + voyant(v.dhcp, "Source (DHCP)") + "  " + voyant(v.telnet, "porte 23 close") : null,
		"      " + ok(true, "│"),
		"      " + branche("dns", v.noms, "├─") + " " + lieu("dns", "dns", "Oracle des Noms"),
		"      " + branche("intranet", v.web, "├─") + " " + lieu("intranet", "intranet", "Bibliothèque"),
		connu("intranet") ? "      │    " + voyant(v.web, "web") + "  " + voyant(v.heure, "blason https") : null,
		"      " + branche("mail", v.mail, "├─") + " " + lieu("mail", "mail", "Volière"),
		connu("mail") ? "      │    " + voyant(v.mail, "porte 25 (mails)") : null,
		"      " + branche("parefeu", true, "├─") + " " + lieu("parefeu", "parefeu", "Muraille (internet)"),
		"      " + branche("lille", v.lille, avecAnnexe ? "├─" : "└─") + " " + lieu("lille", "lille", "Comptoir du Nord")
	]).concat(avecAnnexe ? [
		"      " + branche("borne", an.forward && dhcpBorneActif(), "└─") + " " + lieu("borne", "borne", "Tour des Ondes"),
		connu("borne") ? "           " + voyant(!an.rfkill && an.wlan, "radio") + "  " + voyant(dhcpBorneActif(), "Source") : null,
		connu("borne") ? "           " + voyant(an.forward, "passage") + "  " + voyant(an.zone, "noms") : null,
		"           " + branche("switch", true, "└─") + " " + lieu("switch", "switch", "Prises"),
		"              " + branche("affichage", an.ports[7], "└─") + " " + lieu("affichage", "affichage", "Grand Tableau")
	] : []).filter(function(l){ return l !== null; });
	if (typeof reliquesObtenues === "function"){
		var r = reliquesObtenues(), total = Object.keys(RELIQUES).length;
		lignes.push("", C.gras("BADGES : " + r.length + " sur " + total) + C.gris("  (badges : les leçons)"));
		Object.keys(RELIQUES).filter(function(id){ return state.quests[id]; }).forEach(function(id){ lignes.push("  " + C.jaune("✦ ") + (typeof nomDuBadge === "function" ? nomDuBadge(id) : RELIQUES[id])); });
		if (!r.length) lignes.push(C.gris("  Chaque réparation en rapporte une."));
	}
	return lignes.join("\n");
}

Shell.sorts.schema = function(args, io){
	if (!state.has("panneOuverte")) return "Le schéma du réseau de l'école s'affiche pendant la panne (chapitre 2). " + C.gris(state.has("crypteOuverte") ? "En mission cyber, c'est traque." : "Pour l'instant, hotes.txt, dans la SalleReseau de Cybersup, liste les machines.");
	var texte = texteSchema();
	GameEvents.fire({ type: "schema" });
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le schéma remplace aussi l'image jusqu'à ton prochain déplacement. schema pour le revoir.)");
	return texte;
};

/* ------------------------------------------------------------------ */
/* Le monde réagit                                                     */
/* ------------------------------------------------------------------ */

var CertificatReseau = new Item("CertificatReseau", "", "item_manuscript.gif");

function verifierPanne(){
	if (!state.panne) state.panne = etatPanneInitial();
	// Les anciennes sauvegardes n'ont pas le TableauBlanc du chapitre 1 ni le Lexique de Radia.
	if (typeof TableauBlanc !== "undefined" && !SalleReseau.hasItem(TableauBlanc)) SalleReseau.addItem(TableauBlanc);
	if (!BatimentB.hasItem(Lexique)) BatimentB.addItem(Lexique);
	if (!BatimentB.hasItem(SacocheDeRadia)) BatimentB.addItem(SacocheDeRadia);
	if (!BatimentB.hasItem(ModeleOSI)) BatimentB.addItem(ModeleOSI);
	if (!PosteB.hasItem(GrimoireDesAnciens)) PosteB.addItem(GrimoireDesAnciens);
	// Les portraits redessinés dans le style d'origine remplacent ceux des anciennes sauvegardes.
	[[Whitfield, "item_archiviste.gif"], [Corbeau, "item_frances.gif"], [Radia, "item_radia.gif"]].forEach(function(x){
		if (x[0].picturename !== "./static/img/" + x[1]) x[0].picturename = "./static/img/" + x[1];
	});
	// En mission cyber (la Crypte directement), la panne n'est pas au programme.
	if (state.has("chapitre1Saute") && !state.has("panneDirecte") && !state.has("panneSautee")) state.set("panneSautee");
	if (!state.has("panneOuverte") && state.has("victoire") && !state.has("panneSautee")) state.applyState("panneOuverte");
	if (!state.has("panneOuverte")) return;
	// Aussi pour les sauvegardes faites avant ce chapitre : Cybersup y est restauré sans le bâtiment B.
	if (Cybersup.children.indexOf(BatimentB) === -1) relier(Cybersup, BatimentB);
	if (!state.has("zonePanne")){
		state.set("zonePanne");
		var zone = zoneDns();
		var manquantes = lignesZonePanne().filter(function(l){ var c = l.trim().split(/\s+/); return !zone.some(function(r){ return r.nom === c[0] && r.type === c[2]; }); });
		if (manquantes.length) ZoneEcole.setText(ZoneEcole.getText().replace(/\n?$/, "\n") + manquantes.join("\n") + "\n");
	}
	var p = state.panne;
	var osi = Home.getItemFromName("osi.txt");
	if (osi !== -1 && etagesRecites(osi.getText())) state.complete("s_r_osi");
	if (p.lien) state.complete("r_lien");
	if (p.lien && adressePoste()) state.complete("r_ip");
	if (p.lien && adressePoste() && routeParDefautPoste() === IP_ROUTEUR) state.complete("r_passerelle");
	if (dnsPosteOK()) state.complete("r_dns");
	var dhcp = servicePanne("routeur", "isc-dhcp-server");
	if (dhcp.actif && dhcp.auto) state.complete("r_dhcp");
	if (p.netplanOK) state.complete("r_netplan");
	var apache = servicePanne("intranet", "apache2"), nginx = servicePanne("intranet", "nginx");
	if (!apache.actif && !apache.auto && nginx.actif && nginx.auto) state.complete("r_web");
	if (horlogePosteOK()) state.complete("r_https");
	if (verdictForward({ proto: "tcp", dport: "25", src: IP_POSTE, dst: "10.0.92.11" }) === "ACCEPT") state.complete("r_smtp");
	if (routeLilleOK()) state.complete("r_lille");
	var telnet = servicePanne("routeur", "telnet.socket");
	if (!telnet.actif && !telnet.auto) state.complete("r_telnet");
	if (typeof verifierAnnexe === "function") verifierAnnexe();
	if (Radia.getText() !== texteRadia()) Radia.cmd_text["less"] = texteRadia();
	// Après chaque réparation, une ligne à retenir.
	p.retenus = p.retenus || {};
	Object.keys(A_RETENIR).forEach(function(id){
		if (!state.quests[id] || p.retenus[id]) return;
		p.retenus[id] = true;
		if (state.has("rejeuEnCours")) return;
		// Une seule ligne dans le terminal : le badge. La leçon se relit avec badges.
		if (typeof RELIQUES !== "undefined" && RELIQUES[id]) say(C.jaune("✦ Badge gagné : " + (typeof nomDuBadge === "function" ? nomDuBadge(id) : RELIQUES[id])) + C.gris(" · badges"));
	});
	// Radia annonce la suite au talkie-walkie, à chaque étape franchie.
	var suivante = prochaineEtapePanne();
	if (state.quests["r_batiment"] && suivante && p.annonce !== suivante.id){
		if (p.annonce !== null && TALKIE[suivante.id] && !state.has("rejeuEnCours")){
			// La consigne complète s'affiche dans le talkie-walkie, à côté du terminal ; ici, juste un signal.
			if (typeof radioSOC === "function") radioSOC("Radia, au talkie-walkie : « " + talkiePour(suivante.id) + " »");
			say(C.gris("(Nouveau message de Radia : regarde le talkie-walkie.)"));
		}
		p.annonce = suivante.id;
	}
	if (state.has("victoireReseau")) CertificatReseau.cmd_text["less"] = state.texteDuCertificatReseau();
}

/* Les événements de l'histoire du chapitre (appelés par GameState.applyState). */
function etatPanne(nom){
	switch (nom){
		case "panneOuverte":
			relier(Cybersup, BatimentB);
			break;
		case "victoireReseau":
			if (!state.dateVictoire3) state.dateVictoire3 = dateDuJour();
			state.complete("r_fin");
			poser(Home, CertificatReseau);
			BatimentB.room_pic = "./static/img/loc_batimentb_ok.gif";
			BatimentB.changeIntroText("Le bâtiment B de Cybersup. Dans l'armoire réseau, tous les voyants sont passés au vert. Radia range son portable, l'air satisfait. Derrière le comptoir, le Poste de l'accueil ronronne tranquillement.");
			if (typeof montrerImage === "function") montrerImage(BatimentB.room_pic, BatimentB.room_name);
			CertificatReseau.cmd_text["less"] = state.texteDuCertificatReseau();
			say(C.gris("(Ton CertificatReseau est posé dans ta Maison : cat ~/CertificatReseau. Il porte la note du chapitre 2 et son code de vérification.)"));
			if (typeof radioSOC === "function" && typeof texteTalkie === "function") radioSOC(texteTalkie());
			break;
	}
}

GameEvents.addListener("enter", function(e){
	if (e.room === BatimentB && !state.quests["r_batiment"] && state.has("panneOuverte")){
		state.debutChapitre3 = state.tempsMs;
		state.complete("r_batiment");
	}
});
/* Les sept étages, dans l'ordre, quelle que soit la façon de les écrire (accents, majuscules, une ligne ou plusieurs). */
function etagesRecites(texte){
	var t = String(texte).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	var ordre = ["physique", "liaison", "reseau", "transport", "session", "presentation", "application"];
	var pos = -1;
	for (var i = 0; i < ordre.length; i++){
		var k = t.indexOf(ordre[i], pos + 1);
		if (k === -1) return false;
		pos = k;
	}
	return true;
}
GameEvents.addListener("read", function(e){
	if (e.item === ModeleOSI && state.has("panneOuverte")) state.complete("r_osi");
});
GameEvents.addListener("read", function(e){
	if (e.item !== Radia || state.has("victoireReseau")) return;
	var restantes = QUETES_PANNE.filter(function(q){ return q.id !== "r_fin" && !state.quests[q.id]; });
	if (restantes.length) return;
	var pannes = pannesRestantes();
	if (pannes.length){
		say("Radia fronce les sourcils devant son portable. « Attends... ça ne tient plus. " + pannes.join(", ").replace(/^./, function(c){ return c.toUpperCase(); }) +
			". Remets ça d'aplomb, et reviens me voir. »");
		return;
	}
	state.applyState("victoireReseau");
});

/* Les illustrations des machines de la panne (outils/dessiner_lieux.py). */
[[Routeur, "loc_routeur.gif"], [Intranet, "loc_intranet.gif"]].forEach(function(x){ x[0].room_pic = "./static/img/" + x[1]; });

/* World.fige est posé à la fin d'Annexe.js, une fois le second acte de la panne construit. */
