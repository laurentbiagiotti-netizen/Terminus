/**
 * Audit « et si l'étudiant ne parle jamais à ce personnage ? » (lot a) : chapitre 1 (Terminus), chapitre 2 (la panne,
 * numéro 3 dans le code, Annexe comprise), chapitre 3 (la Crypte, numéro 2 dans le code), et ce que l'épreuve finale
 * suppose acquis.
 *
 * Pour chaque personnage dont la lecture a un effet (un sort, une étape, un objet, un lieu), y compris les relectures
 * qui font avancer une demande (l'Artisane, Radia, la Radio), on rejoue le chemin principal sans cette lecture. Le chemin
 * doit soit aboutir, soit buter sur un message qui nomme le personnage (et où le trouver).
 *
 * Corrigé par ce lot (ces vérifications échouent sans la correction) :
 *   - grep manquant : le message nommait la Bibliothécaire « dans ArriereSalle », un lieu caché ; il dit maintenant
 *     que le LevierDiscret de la Bibliotheque en ouvre le passage ;
 *   - un sort pas encore appris, lancé avec 2>/dev/null (find . -perm -4000 2>/dev/null, comme l'Inscription de la Crypte
 *     le montre) : le message qui nomme le personnage partait dans /dev/null, l'écran restait muet (et la quête secondaire
 *     « faire taire les plaintes de find » se validait) ; le jeu parle maintenant toujours à l'écran ;
 *   - la panne finie sans le compte rendu à Radia : aller 3 répondait « recommencer » sans nommer Radia ;
 *     aller 3 et chapitre 3 disent maintenant d'aller voir Radia (cat Radia), même après rechargement de la page.
 *
 * Lancer : node --max-old-space-size=3000 tests/sans-parler-a.js        (-v pour tout voir)
 */
var nouveauMonde = require("./monde.js").nouveauMonde;

var echecs = 0, verifications = 0;
function verifier(condition, message){
	verifications++;
	if (!condition){ echecs++; console.log("ÉCHEC : " + message); }
}
function contient(texte, morceau, message){
	verifier(String(texte).indexOf(morceau) > -1, (message || "") + " : « " + morceau + " » attendu, reçu :\n" + texte + "\n");
}

/* Le chemin principal seul (le même que tests/chemin-principal-a.js). */
var VILLAGE = "~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage";
var CH1 = [
	"cd ForetOuest/AcademieDesSorts/Cours", "less Professeur",
	"cd ~/PrairieNord/MontagnesEst", "cd Grotte/CouloirSombre/SalleHumide", "mv Rocher PetitTrou", "ls -a",
	"cd .Tunnel/ChambreDePierre", "cat Stele", "chmod +x Portail", "cd Portail/PlaceDuVillage",
	"cd Marche", "less SortRm", "less SortMkdir", "cd ..",
	"cd Atelier", "less Artisane", "cd ../PontBrise", "touch Planche",
	"cd Clairiere", "cd SentierSinistre", "rm Ronces", "cd CaverneDesTrolls", "mv TrollMoche ..",
	"cd Toboggan/FichiersDuNoyau", "less Instructions",
	"cd " + VILLAGE + "/Bibliotheque", "less LevierDiscret", "cd ArriereSalle", "less Bibliothecaire",
	"cd ../../Taverne", "less Barde",
	"cd ../PontBrise/Clairiere/SentierSinistre/CaverneDesTrolls/Toboggan/FichiersDuNoyau/ArchivesDuNoyau",
	"grep motdepasse= *", "cd ..", "sudo less Certificat", "cd Citadelle", "less SorcierNoir",
	"cd ~/Cybersup/SalleDeCours", "less Formateur", "cd ../SalleServeurs", "less Administratrice",
	"cd ../SalleReseau", "less AdminReseau",
	"ssh citadelle", "ps", "sudo crontab -u sorcier -r", "sudo kill <pid:demon_bouclier>",
	"sudo kill -9 <pid:demon_illusion>", "sudo kill <pid:demon_corruption>",
	"ls -a", "sudo cat .Phylactere | grep vrai_nom", "echo Laurent", "less Laurent"
];
var CH2 = [
	"cd ~/Cybersup/BatimentB", "cat Radia", "cat ModeleOSI", "cd Poste", "cat Etiquette", "cat AideMemoire",
	"ip link", "sudo ip link set eth0 up", "sudo dhclient eth0", "sudo ip addr add 10.0.93.20/24 dev eth0",
	"ip r", "sudo ip route add default via 10.0.93.254",
	"cd etc", "cat MemoDNS", "cat resolv.conf", "sudo nano resolv.conf",
	"ssh routeur", "cat CahierDuRouteur", "sudo systemctl enable --now isc-dhcp-server", "exit",
	"sudo dhclient eth0", "cd /etc/netplan", "sudo netplan set ethernets.eth0.dhcp4=true", "sudo netplan apply",
	"ssh intranet", "cat NoteDeVint", "sudo ss -tlnp", "sudo systemctl disable --now apache2", "sudo systemctl start nginx", "exit",
	"curl https://intranet/", "sudo timedatectl set-ntp true",
	"ssh routeur", "sudo iptables -L FORWARD -n --line-numbers", "sudo iptables -D FORWARD 1",
	"sudo ip route add 10.0.59.0/24 via 10.0.92.248", "sudo ss -tlnp", "sudo systemctl disable --now telnet.socket", "exit",
	"cd ~/Cybersup/Annexe", "cat Gaspard", "cat AfficheWifi", "cat CarnetDeLAnnexe", "cd Portable",
	"sudo ip link set wlan0 up", "rfkill list", "sudo rfkill unblock wifi", "sudo iw dev wlan0 scan",
	"nmcli device wifi connect Cybersup-Etudiants password <wifi>", "ipcalc 10.0.94.0/26",
	"cd ~/Cybersup/BatimentB/Poste", "ssh borne", "cat NoticeDeLaBorne", "cd etc/dhcp", "sudo nano dhcpd.conf",
	"sudo systemctl restart isc-dhcp-server", "sudo sysctl -w net.ipv4.ip_forward=1", "exit",
	"cd ~/Cybersup/Annexe/Portable", "sudo dhclient wlan0",
	"cd ~/Cybersup/BatimentB/Poste", "ssh routeur", "cd /etc/bind", "cat MemoZone",
	"sudo named-checkzone annexe.cybersup.lan annexe.zone", "sudo nano annexe.zone", "sudo systemctl reload named", "exit",
	"ssh switch", "cat CarnetDuSwitch", "sudo ip link set port7 up", "exit",
	"ssh borne", "sudo iftop", "exit", "ssh affichage", "sudo nethogs", "sudo systemctl disable --now synchro-videos", "exit",
	"cd ~/Cybersup/BatimentB", "cat Radia"
];
var CH3 = [
	"ssh citadelle", "cd Crypte", "less Archiviste", "less Radio", "cd bin", "sha256sum -c SHA256SUMS",
	"grep charge= gardien | cut -d= -f2 | base64 -d", "cd ../Caveau", "less Inscription",
	"find . -perm -4000 2>/dev/null", "ls -la", "./.porte", "cd Racine", "less ManuelDeNano", "less ../../Radio",
	"sudo ss -tlnp", "sudo kill -9 <pid-ecoute>", "less FicheReflexe", "sudo nano .ssh/authorized_keys",
	"cd ~/Cybersup/SalleServeurs", "less ConsignesDuCoffre", "ssh-keygen", "cp ~/.ssh/id_ed25519.pub BoiteDeDepot",
	"ssh citadelle", "cd var", "cd log", "less CarnetDuVeilleur", "zcat auth.log.2.gz | grep Accepted", "exit",
	"cd ~/Cybersup/SalleReseau", "less MementoReseau", "nmap 10.0.92.0/24",
	"ssh labo", "less TableauDuLabo", "who", "cd /home/etudiant/vimtuteur", "less TuteurVim",
	"sudo pkill -u corbeau", "sudo systemctl disable --now maj-auto", "exit",
	"ssh web", "less LISEZMOI", "cd /var/www/uploads", "lsattr", "sudo chattr -i maj.php", "sudo rm maj.php", "exit",
	"ssh mail", "less AideMemoireMail", "cd /var/spool",
	"sed -n '/^--- pièce jointe/,/^--- fin/p' message-0042.eml | grep -v '^---' | base64 -d", "exit",
	"ssh dns", "less NotesDNS", "cd /etc/bind", "sudo vim ecole.zone", "exit",
	"ssh parefeu", "less ConsignesParefeu", "sudo ufw route deny from <poste>", "sudo ufw enable", "exit",
	"ssh citadelle", "cd etc", "less ProcedureComptes", "sudo userdel maintenance", "sudo gpasswd -d corbeau sudo", "sudo visudo", "exit",
	"cd ~/Cybersup/SalleServeurs", "less ProcedurePreuves", "ssh-copy-id sauvegarde",
	"ssh citadelle", "cd /tmp/.cache", "scp notes.gpg sauvegarde:/preuves/", "exit",
	"ssh sauvegarde", "cd preuves", "sha256sum notes.gpg >> registre.txt", "exit",
	"ssh citadelle", "cd Crypte/Caveau", "strings .porte | grep phrase | cut -d= -f3 | tr 'A-Za-z' 'N-ZA-Mn-za-m'",
	"cd /tmp/.cache", "gpg -d notes.gpg", "exit",
	"ssh coffre", "less Corbeau", "exit", "cd ~", "cp ModeleRapport rapport.txt", "vim rapport.txt"
];
/* Ce que le chemin pressé du chapitre 1 n'a pas appris, et qu'il rattrape au chapitre 3. */
var RATTRAPAGE_CH1 = [
	"cd " + VILLAGE + "/Taverne", "less Tavernier",
	"cd ../Atelier", "less Artisane", "touch Rouage", "less Artisane",
	"cp Rouage rouage1", "cp Rouage rouage2", "cp Rouage rouage3", "cp Rouage rouage4", "cp Rouage rouage5", "less Artisane",
	"cd ~/Cybersup/SalleDeCours", "less EtudianteCurieuse"
];

/* « Parler à » NOM : le lire, d'ici ou par un chemin. */
function parleA(commande, nom){ return new RegExp("^(sudo )?(less|cat|more|head|tail) (\\S*/)?" + nom + "$").test(commande); }

/* Joue les commandes en sautant les lectures de NOM : toutes, ou seulement la rang-ième (compteur partagé entre les listes). */
function jouerSans(jeu, commandes, nom, rang, compteur){
	compteur = compteur || { vu: 0 };
	var sorties = [];
	commandes.forEach(function(c){
		if (nom && parleA(c, nom)){
			compteur.vu++;
			if (!rang || rang === compteur.vu) return;
		}
		sorties.push(/^(chapitre|aller) [0-9]$/.test(c) ? jeu.taper(c, "oui") : jeu.jouerSolution(c));
	});
	return sorties;
}
function manquantes(jeu, liste){
	return jeu.lire(liste + ".filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
}
/* Le premier refus qui dit qu'un sort manque. */
function premierBlocage(sorties){
	return sorties.filter(function(s){ return /ne connais pas encore le sort|tu ne sais pas encore lancer un script/.test(s); })[0] || "";
}
/* Une photo de la partie, pour repartir d'un point du chemin sans tout rejouer. */
function photo(jeu, stockage){ jeu.lire("state.save()"); return JSON.stringify(stockage); }
function reprendre(cliche){ return nouveauMonde(JSON.parse(cliche)); }

/* La table : ce que chaque lecture déclenche, et ce qu'il advient du chemin principal sans elle. */
console.log("Personnages à effet du lot a (chapitres 1 à 3), et le chemin principal sans eux :");
function ligne(nom, effet, bloquant){ console.log("  " + (nom + "                         ").slice(0, 26) + (bloquant ? "bloquant, nommé  " : "non bloquant     ") + effet); }

/* --- 1. Chapitre 1 : chaque habitant à effet du chemin principal --- */
var CHAPITRE1 = [
	{ nom: "Professeur", effet: "enseigne mv (étape m_mv)", noms: ["Professeur", "Cours"] },
	{ nom: "Artisane", effet: "enseigne touch, puis cp (Rouage) et bash (rouages copiés)", noms: ["Artisane", "Atelier"] },
	{ nom: "Bibliothecaire", effet: "enseigne grep (m_mdp passe aussi par cat *, mais grep resservira)", noms: ["Bibliothecaire", "LevierDiscret"], ouAboutit: true },
	{ nom: "Barde", effet: "enseigne echo (étape m_boss)", noms: ["Barde", "Taverne"] },
	{ nom: "Formateur", effet: "enseigne ps, top, kill, whoami (étape m_demons)", noms: ["Formateur", "SalleDeCours"] },
	{ nom: "Administratrice", effet: "enseigne df, du, tar, crontab (étape m_demons)", noms: ["Administratrice", "SalleServeurs"] },
	{ nom: "AdminReseau", effet: "enseigne hostname, ping, ssh (ssh citadelle, et tout le chapitre 2)", noms: ["AdminReseau"] },
	{ nom: "SorcierNoir", effet: "rien (le décor du combat)", noms: null }
];
CHAPITRE1.forEach(function(p){
	var jeu = nouveauMonde({}, 4242);
	var sorties = jouerSans(jeu, CH1, p.nom);
	var reste = manquantes(jeu, "QUETES_PRINCIPALES");
	ligne(p.nom, p.effet, !!p.noms && !p.ouAboutit);
	if (!p.noms){ verifier(reste === "", "chapitre 1 sans " + p.nom + " : le chemin aboutit (reste " + reste + ")"); return; }
	if (!p.ouAboutit) verifier(reste !== "", "chapitre 1 sans " + p.nom + " : sa lecture compte (sinon ce test ne prouve rien)");
	var bloque = premierBlocage(sorties);
	verifier(bloque !== "", "chapitre 1 sans " + p.nom + " : un sort manque quelque part (sinon ce test ne prouve rien)");
	p.noms.forEach(function(n){ contient(bloque, n, "chapitre 1 sans " + p.nom + " : le premier refus dit vers qui aller"); });
});

/* Le chapitre 1 joué jusqu'au bout, sauf la dernière lecture de Laurent. */
var stock = {};
var base = nouveauMonde(stock, 4242);
jouerSans(base, CH1.slice(0, -1));
var avantLaurent = photo(base, stock);

/* --- 2. Laurent (fin du chapitre 1) et la panne : Radia, Gaspard --- */
ligne("Laurent", "P.S. qui annonce le chapitre 2 (le chapitre 2 s'ouvre à la victoire)", false);
var sansLaurent = reprendre(avantLaurent);
jouerSans(sansLaurent, CH2);
verifier(manquantes(sansLaurent, "QUETES_PANNE") === "", "sans relire Laurent, la panne se joue jusqu'au bout : reste " + manquantes(sansLaurent, "QUETES_PANNE"));

ligne("Radia (1re lecture)", "enseigne ip, ethtool, hostnamectl", true);
var sansRadia = reprendre(avantLaurent);
var sortiesRadia = jouerSans(sansRadia, ["less Laurent"].concat(CH2), "Radia");
verifier(manquantes(sansRadia, "QUETES_PANNE") !== "", "sans Radia, la panne ne finit pas (sinon ce test ne prouve rien)");
contient(premierBlocage(sortiesRadia), "Radia", "sans Radia : ip manquant nomme Radia");
contient(premierBlocage(sortiesRadia), "BatimentB", "sans Radia : ip manquant dit où elle est");

ligne("Gaspard", "rien (l'étape r_annexe se valide en entrant à l'Annexe)", false);
var stockPanne = JSON.parse(avantLaurent);
var panne = nouveauMonde(stockPanne);
jouerSans(panne, ["less Laurent"].concat(CH2.slice(0, -1)), "Gaspard");
verifier(manquantes(panne, "QUETES_PANNE") === "r_fin", "sans Gaspard, toute la panne se répare (reste " + manquantes(panne, "QUETES_PANNE") + ")");
var avantCompteRendu = photo(panne, stockPanne);

ligne("Radia (compte rendu)", "étape r_fin, CertificatReseau, ouvre la Crypte", true);
contient(panne.taper("quetes"), "cat Radia", "compte rendu oublié : le journal envoie à Radia");
var aller3 = panne.taper("aller 3", "oui");
contient(aller3, "Radia", "compte rendu oublié : aller 3 nomme Radia");
contient(aller3, "cat Radia", "compte rendu oublié : aller 3 dit quoi faire");
contient(aller3, "s'ouvre à la fin de la panne", "aller 3 : la Crypte suit la panne");
contient(panne.taper("chapitre 3", "oui"), "cat Radia", "compte rendu oublié : chapitre 3 envoie à Radia");
verifier(!panne.lire("state.has('crypteOuverte')"), "aller 3 n'ouvre pas la Crypte en douce");
// Une partie déjà en cours, rechargée : le message est calculé à la demande, il nomme Radia aussi.
contient(reprendre(avantCompteRendu).taper("aller 3", "oui"), "cat Radia", "partie rechargée : aller 3 nomme Radia");
// Encore des étapes : aller 3 le dit, et nomme quand même Radia.
var tot = reprendre(avantLaurent);
jouerSans(tot, ["less Laurent", "cd ~/Cybersup/BatimentB", "cat Radia"]);
var aller3tot = tot.taper("aller 3", "oui");
contient(aller3tot, "Il te reste des étapes de la panne", "aller 3 en pleine panne : il reste des étapes");
contient(aller3tot, "Radia", "aller 3 en pleine panne : Radia nommée");
// Le compte rendu fait, le chapitre 3 s'ouvre.
panne.taper("cd ~/Cybersup/BatimentB");
panne.taper("cat Radia");
verifier(panne.lire("state.quests.r_fin === true && state.has('crypteOuverte')"), "le compte rendu à Radia ouvre la Crypte");
var apresPanne = photo(panne, stockPanne);

/* --- 3. Le chapitre 3, après la panne : les habitants du chapitre 1 qu'il faut rattraper --- */
var RATTRAPES = [
	{ nom: "Tavernier", rang: 0, effet: "enseigne sort, uniq, cut (cut sert dans la Crypte)", noms: ["Tavernier", "Taverne"] },
	{ nom: "Artisane", rang: 2, effet: "2e lecture (Rouage posé) : enseigne cp", noms: ["Artisane", "Atelier"] },
	{ nom: "Artisane", rang: 3, effet: "3e lecture (rouages copiés) : enseigne bash et ./", noms: ["Artisane", "Atelier"] },
	{ nom: "EtudianteCurieuse", rang: 0, effet: "enseigne find (find -perm -4000, dans la Crypte)", noms: ["EtudianteCurieuse", "SalleDeCours"] }
];
RATTRAPES.forEach(function(p){
	var jeu = reprendre(apresPanne);
	var compteur = { vu: 0 };
	var sorties = jouerSans(jeu, RATTRAPAGE_CH1.concat(CH3), p.nom, p.rang, compteur);
	ligne(p.nom + (p.rang ? " (" + p.rang + "e)" : ""), p.effet, true);
	verifier(manquantes(jeu, "QUETES_CHAPITRE2") !== "", "chapitre 3 sans " + p.nom + " : sa lecture compte (sinon ce test ne prouve rien)");
	var bloque = premierBlocage(sorties);
	p.noms.forEach(function(n){ contient(bloque, n, "chapitre 3 sans " + p.nom + (p.rang ? " (lecture " + p.rang + ")" : "") + " : le refus dit vers qui aller"); });
});

/* --- 4. Les personnages de la Crypte (départ direct au chapitre 3, et à la suite de la panne) --- */
var CRYPTE = [
	{ nom: "Archiviste", rang: 0, effet: "enseigne sha256sum, base64 (étapes c_integrite, c_message)", noms: ["Archiviste", "Crypte"] },
	{ nom: "Radio", rang: 1, effet: "1re lecture : Grace présente la chasse (rien d'indispensable)", noms: null },
	{ nom: "Radio", rang: 2, effet: "relecture après la Racine : enseigne ss (en mission cyber)", noms: ["Radio"], ouAboutit: true },
	{ nom: "Corbeau", rang: 0, effet: "étape c_corbeau, pose le ModeleRapport", noms: null, histoire: true }
];
CRYPTE.forEach(function(p){
	var jeu = nouveauMonde({}, 4444);
	jeu.taper("chapitre 3", "oui");
	var sorties = jouerSans(jeu, CH3, p.nom, p.rang);
	var reste = manquantes(jeu, "QUETES_CHAPITRE2");
	ligne(p.nom + (p.rang ? " (" + p.rang + "e)" : ""), p.effet, !!p.noms && !p.ouAboutit || !!p.histoire);
	if (p.histoire){
		verifier(/c_corbeau/.test(reste), "sans le Corbeau, l'étape c_corbeau reste à faire (sinon ce test ne prouve rien)");
		var journal = jeu.taper("quetes");
		contient(journal, "Démasquer le Corbeau", "sans le Corbeau : le journal le nomme");
		contient(journal, "ssh coffre", "sans le Corbeau : le journal dit où il attend");
		return;
	}
	if (!p.noms){ verifier(reste === "", "Crypte sans " + p.nom + " : le chemin aboutit (reste " + reste + ")"); return; }
	var bloque = premierBlocage(sorties);
	if (p.ouAboutit && reste === "" && !bloque) return;
	if (!p.ouAboutit) verifier(reste !== "", "Crypte sans " + p.nom + " : sa lecture compte (sinon ce test ne prouve rien)");
	p.noms.forEach(function(n){ contient(bloque, n, "Crypte sans " + p.nom + " : le refus dit vers qui aller"); });
});
// À la suite de la panne (ss déjà appris auprès du CahierDuRouteur), sans relire la Radio : le chemin aboutit.
var suite = reprendre(apresPanne);
var sortiesSuite = jouerSans(suite, RATTRAPAGE_CH1.concat(CH3), "Radio", 2);
verifier(manquantes(suite, "QUETES_CHAPITRE2") === "" && premierBlocage(sortiesSuite) === "",
	"à la suite de la panne, sans relire la Radio, la Crypte va au bout : reste " + manquantes(suite, "QUETES_CHAPITRE2") + "\n" + premierBlocage(sortiesSuite));

/* --- 5. Le message de grep, partout où il s'affiche : la Bibliothécaire et le levier qui ouvre son arrière-salle --- */
var g = nouveauMonde({}, 4242);
contient(g.taper("grep x y"), "LevierDiscret", "grep manquant : le levier qui ouvre l'ArriereSalle");
contient(g.lire("Shell.ouApprendre('grep')"), "Bibliotheque", "grep manquant : la Bibliotheque du village");

/* --- 5 bis. Un sort pas encore appris, lancé avec 2>/dev/null : le jeu le dit quand même, et nomme le personnage --- */
var muet = reprendre(apresPanne);
jouerSans(muet, ["ssh citadelle", "cd Crypte/Caveau"]);
var silence = muet.taper("find . -perm -4000 2>/dev/null");
contient(silence, "EtudianteCurieuse", "find inconnu, 2>/dev/null : le message nomme l'EtudianteCurieuse quand même");
verifier(!muet.lire("!!state.quests.s_c_silence"), "find inconnu : « faire taire les plaintes de find » ne se valide pas pour rien");
contient(muet.taper("find . 2>&1 | grep porte"), "EtudianteCurieuse", "find inconnu, 2>&1 dans un tuyau : le message reste à l'écran");
contient(muet.taper("./.porte 2>/dev/null"), "Artisane", "./ inconnu, 2>/dev/null : le message nomme l'Artisane");
// Un vrai message d'erreur d'un sort connu, lui, part toujours dans /dev/null.
verifier(muet.taper("ls nimporte 2>/dev/null").indexOf("nimporte") === -1, "l'erreur d'un sort connu se jette toujours dans /dev/null");

/* --- 6. Les départs directs : le socle couvre les sorts des personnages des chapitres sautés --- */
function sortsDe(jeu, noms, chapitres){
	return jeu.lire("(function(){ var noms = " + JSON.stringify(noms) + ", ch = " + JSON.stringify(chapitres) + ", sorts = [];" +
		"Object.keys(World.rooms).forEach(function(id){ var r = World.rooms[id]; if (ch.indexOf(r.chapitre || 1) === -1) return;" +
		"  r.items.forEach(function(it){ if (it.person && noms.indexOf(it.itemname) > -1) sorts = sorts.concat(it.teaches); }); });" +
		"return sorts; })()");
}
var HABITANTS_CH1 = ["Professeur", "Copiste", "ApprentiCopiste", "Bibliothecaire", "Artisane", "Barde", "Tavernier", "RSSI",
	"Formateur", "EtudianteCurieuse", "Administratrice", "AdminReseau"];
var d2 = nouveauMonde({}, 4343);
d2.taper("chapitre 2", "oui");
var sortsCh1 = sortsDe(d2, HABITANTS_CH1, [1]).concat(["cp", "bash"]);
verifier(sortsCh1.length > 25, "les habitants du chapitre 1 enseignent bien des sorts (" + sortsCh1.length + ")");
var oubliesD2 = sortsCh1.filter(function(s){ return !d2.lire("state.knows(" + JSON.stringify(s) + ")"); });
verifier(oubliesD2.length === 0, "départ direct au chapitre 2 : les sorts des habitants du chapitre 1 sont acquis, sauf " + oubliesD2.join(", "));
var d3 = nouveauMonde({}, 4444);
d3.taper("chapitre 3", "oui");
var oubliesD3 = sortsCh1.filter(function(s){ return !d3.lire("state.knows(" + JSON.stringify(s) + ")"); });
verifier(oubliesD3.length === 0, "départ direct au chapitre 3 : les sorts des habitants du chapitre 1 sont acquis, sauf " + oubliesD3.join(", "));

/* --- 7. L'épreuve finale suppose acquis les sorts des trois chapitres : elle les donne tous, personne à aller voir --- */
var examen = d2.lire("[].concat(SORTS_DE_DEPART, ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3)");
var sortsPersonnages = sortsCh1.concat(sortsDe(d2, ["Radia"], [3]), sortsDe(d2, ["Archiviste"], [2]), ["ss"]);
var horsExamen = sortsPersonnages.filter(function(s){ return examen.indexOf(s) === -1; });
verifier(horsExamen.length === 0, "l'épreuve finale donne tous les sorts des personnages des chapitres 1 à 3, sauf " + horsExamen.join(", "));
verifier(/\[SORTS_DE_DEPART, ORDRE_DES_SORTS, ORDRE_DES_SORTS_2, ORDRE_DES_SORTS_3\]/.test(d2.lire("demarrerExamen.toString()")),
	"l'épreuve finale apprend d'office les sorts des chapitres 1 à 3");

/* --- 8. Shell.ouApprendre ne répond jamais « quelqu'un, quelque part » : il nomme l'objet ou le personnage, le lieu,
       et le moment où il apparaît ; ou il dit honnêtement que rien ne l'enseigne. Avec l'article qui convient. --- */
function ou(jeu, s){
	return jeu.lire("(function(){ var k = state.spells[" + JSON.stringify(s) + "]; delete state.spells[" + JSON.stringify(s) + "];" +
		" var r = Shell.ouApprendre(" + JSON.stringify(s) + "); if (k) state.spells[" + JSON.stringify(s) + "] = k; return r; })()");
}
function aucunQuelquun(jeu, quand){
	var vagues = jeu.lire("Object.keys(MANUEL)").filter(function(s){ return /Quelqu'un, quelque part/.test(ou(jeu, s)); });
	verifier(vagues.length === 0, quand + " : ouApprendre répond « quelqu'un, quelque part » pour " + vagues.join(", "));
}
var neuf = nouveauMonde({}, 4242);
aucunQuelquun(neuf, "partie neuve");
["nmap", "uname", "which", "dmesg"].forEach(function(s){
	var r = ou(neuf, s);
	contient(r, "MementoReseau", s + " avant la Crypte : l'objet qui l'enseigne");
	contient(r, "SalleReseau", s + " avant la Crypte : le lieu");
	contient(r, "ouverture de la Crypte", s + " avant la Crypte : le moment");
});
["scp", "tee"].forEach(function(s){
	var r = ou(neuf, s);
	contient(r, "ProcedurePreuves", s + " : l'objet qui l'enseigne");
	contient(r, "SalleServeurs", s + " : le lieu");
	contient(r, "clé du Corbeau retirée", s + " : le moment");
});
["fsck.ext4", "locate", "updatedb", "lvdisplay", "pvdisplay"].forEach(function(s){
	contient(ou(neuf, s), "Aucun personnage ni objet ne l'enseigne", s + " : rien ne l'enseigne, le jeu le dit");
});
contient(ou(neuf, "touch"), "auprès de l'Artisane", "élision : l'Artisane");
contient(ou(neuf, "mv"), "auprès du Professeur", "article : du Professeur");
contient(ou(neuf, "cut"), "auprès du Tavernier", "article : du Tavernier");
contient(neuf.lire("Shell.chezQui(Radia)"), "auprès de Radia", "un prénom sans article : Radia");
contient(neuf.lire("Shell.chezQui({ itemname: 'Logeuse', person: true })"), "auprès de la Logeuse", "article : la Logeuse");
contient(neuf.lire("Shell.chezQui({ itemname: 'Tresorier', person: true })"), "auprès du Tresorier", "article : du Tresorier");
contient(neuf.lire("Shell.chezQui({ itemname: 'Horloger', person: true })"), "auprès de l'Horloger", "élision : l'Horloger");
var tousLesPersonnages = neuf.lire("(function(){ var n = {}; Object.keys(World.items).forEach(function(k){ var it = World.items[k]; if (it.person && it.teaches.length) n[it.itemname] = Shell.chezQui(it); }); return n; })()");
Object.keys(tousLesPersonnages).forEach(function(nom){
	// Un nom de métier (un mot en -eur, -euse, -ice, -iste, -ier...) prend son article : pas de « auprès de Logeuse ».
	var metier = /(eur|euse|ice|iste|ane|ier|iere|aire|elle|ante|ent|aut|in|de|ste|SSI)$/.test(nom) && /^[A-Z][a-z]+([A-Z][a-z]+)?$|^RSSI$/.test(nom) &&
		["Adele", "Butler", "Kylian", "Robert", "Laurent", "Clara", "Remi"].indexOf(nom) === -1;
	verifier(!/auprès de le /.test(tousLesPersonnages[nom]) && (!metier || tousLesPersonnages[nom] !== "auprès de " + nom),
		"grammaire : " + nom + " => " + tousLesPersonnages[nom]);
});
// En mission cyber (panne sautée), la Tutrice et la Gestionnaire du BatimentB sont hors d'atteinte : le jeu le dit.
var cyber = nouveauMonde({}, 4444);
cyber.taper("chapitre 3", "oui");
aucunQuelquun(cyber, "mission cyber");
["apropos", "whatis"].forEach(function(s){
	var r = ou(cyber, s);
	contient(r, "En mission cyber, rien ne l'enseigne", s + " en mission cyber : honnête");
	contient(r, "la Tutrice", s + " en mission cyber : qui l'enseigne pendant la panne");
});
["dmidecode", "lscpu", "lspci", "lsusb"].forEach(function(s){
	contient(ou(cyber, s), "la Gestionnaire", s + " en mission cyber : qui l'enseigne pendant la panne");
});
contient(ou(cyber, "nmap"), "MementoReseau", "nmap, Crypte ouverte : le MementoReseau, posé");

console.log(verifications + " vérifications, " + echecs + " échec" + (echecs > 1 ? "s" : "") + ".");
process.exit(echecs ? 1 : 0);
