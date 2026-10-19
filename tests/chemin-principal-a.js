/**
 * Le chemin principal seul, comme un étudiant pressé : chapitre 1 (Terminus), chapitre 2 (la panne,
 * Annexe comprise), chapitre 3 (la Crypte), sans aucune quête secondaire ni annexe, puis l'enchaînement
 * vers le chapitre 4. Aussi : les départs directs (chapitre 2, chapitre 3), et les blocages corrigés.
 *    node tests/chemin-principal-a.js   (-v pour tout voir)
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
function absent(texte, morceau, message){
	verifier(String(texte).indexOf(morceau) === -1, (message || "") + " : « " + morceau + " » inattendu dans :\n" + texte + "\n");
}

/* Joue une liste de commandes ; « chapitre N » répond oui. Rend les sorties qui disent qu'un sort manque. */
function jouer(jeu, commandes){
	var manques = [];
	commandes.forEach(function(c){
		var s = /^(chapitre|aller) [0-9]$/.test(c) ? jeu.taper(c, "oui") : jeu.jouerSolution(c);
		if (/ne connais pas encore le sort/.test(s)) manques.push("$ " + c + "\n" + s);
	});
	return manques;
}
function manquantes(jeu, liste){
	return jeu.lire(liste + ".filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')");
}

var VILLAGE = "~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage";

/* Chapitre 1 : les treize étapes, rien d'autre. Pas de Scriptorium, pas de Taverne sinon le Barde (echo),
   pas d'atelier au-delà de touch, pas de raccourci ~/Village. */
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

/* Chapitre 2 : le bâtiment B puis l'Annexe, sans Nour, sans sacoche, sans quête secondaire. */
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

/* Chapitre 3 : la Crypte et le réseau, sans leçon de vim, sans quête secondaire. */
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
/* Ce qu'un étudiant pressé n'a pas fait au chapitre 1, et que les messages du jeu l'envoient chercher au chapitre 3. */
var RATTRAPAGE_CH1 = [
	"cd " + VILLAGE + "/Taverne", "less Tavernier",
	"cd ../Atelier", "less Artisane", "touch Rouage", "less Artisane",
	"cp Rouage rouage1", "cp Rouage rouage2", "cp Rouage rouage3", "cp Rouage rouage4", "cp Rouage rouage5", "less Artisane",
	"cd ~/Cybersup/SalleDeCours", "less EtudianteCurieuse"
];

/* --- 1. Le chemin principal, d'une traite --- */
var jeu = nouveauMonde({}, 4242);
jouer(jeu, CH1);
verifier(manquantes(jeu, "QUETES_PRINCIPALES") === "", "chapitre 1 : étapes manquantes : " + manquantes(jeu, "QUETES_PRINCIPALES"));
verifier(jeu.lire("state.quests.s_client || state.quests.s_rouages || state.quests.s_parchemin") !== true, "chapitre 1 : aucune quête secondaire faite");
var motLaurent = jeu.taper("less Laurent");
verifier(motLaurent.split("P.S.").length === 2, "Laurent n'annonce le chapitre 2 qu'une fois (un seul P.S.) :\n" + motLaurent);
contient(motLaurent, "cd ~/Cybersup/BatimentB", "le P.S. de Laurent dit où aller");
// Les sorts du chapitre 1 que le chemin principal n'apprend pas s'apprennent encore après l'épreuve, là où le jeu le dit.
var oublies = jeu.lire("ORDRE_DES_SORTS.filter(function(s){ return !state.knows(s); })");
["cut", "sort", "uniq", "find", "bash", "head", "tail", "wc", "date"].forEach(function(s){
	verifier(oublies.indexOf(s) > -1, "le chemin pressé ne connaît pas " + s + " (sinon ce test ne prouve rien)");
	var ou = jeu.lire("Shell.ouApprendre(" + JSON.stringify(s) + ")");
	verifier(/Il s'apprend /.test(ou), "après l'épreuve, le jeu dit où apprendre " + s + " : " + ou);
});

var manques2 = jouer(jeu, CH2);
verifier(manquantes(jeu, "QUETES_PANNE") === "", "chapitre 2 : étapes manquantes : " + manquantes(jeu, "QUETES_PANNE"));
verifier(manques2.length === 0, "chapitre 2 : aucun sort du chapitre 1 ne manque au chemin principal :\n" + manques2.join("\n"));
contient(jeu.taper("cat ~/CertificatReseau"), "CERTIFICAT", "chapitre 2 : le certificat");

// Sans rattrapage, le chapitre 3 bute sur cut, find et ./ : chaque message dit où les apprendre.
var essai = nouveauMonde({}, 4242);
jouer(essai, CH1.concat(CH2));
contient(jouer(essai, ["ssh citadelle", "cd Crypte/bin", "grep charge= gardien | cut -d= -f2 | base64 -d"]).join(""), "Tavernier", "cut manquant : le jeu envoie au Tavernier");
contient(essai.taper("find . -perm -4000"), "EtudianteCurieuse", "find manquant : le jeu envoie à l'EtudianteCurieuse");
jouer(essai, ["cd " + VILLAGE + "/Taverne"]);
var tavernier = essai.taper("less Tavernier");
contient(tavernier, "cut -d: -f1 Registre", "après l'épreuve, le Tavernier garde sa demande (cut, sort, uniq, le tuyau) tant qu'elle n'est pas finie");
contient(tavernier, "Ken", "le Tavernier se présente quand même");
verifier(essai.lire("state.knows('cut')"), "le Tavernier apprend toujours cut après l'épreuve");
// Son meilleur client trouvé, il n'a plus rien à demander.
essai.taper("echo " + essai.lire("MEILLEUR_CLIENT"));
verifier(essai.lire("state.quests.s_client === true"), "le meilleur client se trouve encore après l'épreuve");
absent(essai.taper("less Tavernier"), "cut -d: -f1 Registre", "demande finie : le Tavernier n'en parle plus");
// La Bibliothécaire, le Marchand et le Fermier gardent aussi leur demande en cours après leur présentation.
var bibli = essai.lire("Librarian.getText()"), marchand = essai.lire("Vendor.getText()"), fermier = essai.lire("Farmer.getText()");
contient(bibli, "Barbara", "la Bibliothécaire se présente");
contient(bibli, "relever toutes les mentions de SorcierNoir", "la Bibliothécaire garde sa demande (s_enquete)");
contient(marchand, "Tim, M1", "le Marchand se présente");
contient(marchand, "cinq parchemins", "le Marchand garde sa demande (les parchemins de confort)");
contient(fermier, "Alan, B2", "le Fermier se présente");
contient(fermier, "AutreEpiDeMais", "le Fermier garde sa demande (s_mais)");
jouer(essai, ["cd " + VILLAGE + "/Bibliotheque", "grep SorcierNoir HistoireDeTerminus"]);
verifier(essai.lire("state.quests.s_enquete === true"), "les relevés de la Bibliothécaire se font encore après l'épreuve");
absent(essai.lire("Librarian.getText()"), "relever toutes les mentions", "demande finie : la Bibliothécaire n'en parle plus");
// Le chapitre 4 demande head, tail, wc, diff et date : le Scriptorium et les Horloges les enseignent encore après l'épreuve.
jouer(essai, ["cd ~/ForetOuest/AcademieDesSorts/Scriptorium", "less Copiste", "less ApprentiCopiste", "cd " + VILLAGE + "/Atelier", "less Horloges"]);
verifier(essai.lire("['head', 'tail', 'wc', 'diff', 'date'].every(function(s){ return state.knows(s); })"), "après l'épreuve, head, tail, wc, diff et date s'apprennent encore");

var manques3 = jouer(jeu, RATTRAPAGE_CH1.concat(CH3));
verifier(manquantes(jeu, "QUETES_CHAPITRE2") === "", "chapitre 3 : étapes manquantes : " + manquantes(jeu, "QUETES_CHAPITRE2"));
verifier(manques3.length === 0, "chapitre 3 : aucun sort ne manque après le rattrapage :\n" + manques3.join("\n"));
verifier(jeu.lire("state.has('ch4Ouvert')"), "le rapport du chapitre 3 ouvre le chapitre 4");
contient(jeu.taper("cd ~/Cybersup/SalleServeurs/Academie"), "Academie", "chapitre 4 : on descend à l'Académie");

/* --- 2. Le Tavernier d'une partie déjà en cours (épreuve finie avant la correction) --- */
var st = {};
var ancien = nouveauMonde(st, 31);
jouer(ancien, CH1);
ancien.lire("Tavernier.addCmdText('less', 'Le tavernier a tombé le tablier. « Ken, promo d\\'il y a trois ans. »'); " +
	"Librarian.addCmdText('less', '« Tu peux m\\'appeler Barbara. »'); Vendor.addCmdText('less', '« Tim, M1. »'); Farmer.addCmdText('less', '« Alan, B2. »'); state.save();");
var recharge = nouveauMonde(st);
contient(recharge.taper("less " + VILLAGE + "/Taverne/Tavernier"), "cut -d: -f1 Registre", "partie en cours rechargée : le Tavernier retrouve sa demande");
contient(recharge.lire("Librarian.getText()"), "relever toutes les mentions", "partie en cours rechargée : la Bibliothécaire retrouve sa demande");
contient(recharge.lire("Vendor.getText()"), "cinq parchemins", "partie en cours rechargée : le Marchand retrouve sa demande");
contient(recharge.lire("Farmer.getText()"), "AutreEpiDeMais", "partie en cours rechargée : le Fermier retrouve sa demande");

/* --- 3. Départ direct au chapitre 2, puis le chapitre 3 --- */
var direct2 = nouveauMonde({}, 4343);
var manquesD2 = jouer(direct2, ["chapitre 2"].concat(CH2));
verifier(manquantes(direct2, "QUETES_PANNE") === "", "départ direct au chapitre 2 : étapes manquantes : " + manquantes(direct2, "QUETES_PANNE"));
verifier(manquesD2.length === 0, "départ direct au chapitre 2 : aucun sort ne manque :\n" + manquesD2.join("\n"));
var manquesD23 = jouer(direct2, CH3);
verifier(manquantes(direct2, "QUETES_CHAPITRE2") === "", "chapitre 2 direct puis chapitre 3 : étapes manquantes : " + manquantes(direct2, "QUETES_CHAPITRE2"));
verifier(manquesD23.length === 0, "chapitre 2 direct puis chapitre 3 : aucun sort ne manque :\n" + manquesD23.join("\n"));

/* --- 4. Départ direct au chapitre 3 --- */
var direct3 = nouveauMonde({}, 4444);
jouer(direct3, ["chapitre 3"]);
// Le coffre essayé trop tôt : les ConsignesDuCoffre ne sont pas encore posées, le jeu dit quand elles le seront.
var coffreTot = direct3.taper("ssh coffre");
contient(coffreTot, "Permission denied", "le coffre, trop tôt : refusé");
contient(coffreTot, "une fois la clé du Corbeau retirée", "le coffre, trop tôt : le jeu dit quand viendront les ConsignesDuCoffre");
var manquesD3 = jouer(direct3, CH3);
verifier(manquantes(direct3, "QUETES_CHAPITRE2") === "", "départ direct au chapitre 3 : étapes manquantes : " + manquantes(direct3, "QUETES_CHAPITRE2"));
verifier(manquesD3.length === 0, "départ direct au chapitre 3 : aucun sort ne manque :\n" + manquesD3.join("\n"));

/* --- 5. Chapitre 2 : un autre ordre (à l'Annexe, le switch avant la zone DNS), une adresse voisine posée à la main --- */
var ordre = nouveauMonde({}, 4545);
var ch2Ordre = CH2.slice();
var iSwitch = ch2Ordre.indexOf("ssh switch"), blocSwitch = ch2Ordre.slice(iSwitch, iSwitch + 4);
ch2Ordre.splice(iSwitch, 4);
ch2Ordre.splice.apply(ch2Ordre, [ch2Ordre.indexOf("cd /etc/bind") - 1, 0].concat(blocSwitch));
ch2Ordre[ch2Ordre.indexOf("sudo ip addr add 10.0.93.20/24 dev eth0")] = "sudo ip addr add 10.0.93.50/24 dev eth0";
// Trop tôt, avant que la borne fasse passer les paquets : le switch ne répond pas, et le jeu dit pourquoi.
ch2Ordre.splice(ch2Ordre.indexOf("ssh borne"), 0, "ssh switch");
var sorties = [];
["chapitre 2"].concat(ch2Ordre).forEach(function(c){ sorties.push(/^chapitre/.test(c) ? ordre.taper(c, "oui") : ordre.jouerSolution(c)); });
var tropTot = sorties[ch2Ordre.indexOf("ssh switch") + 1];
contient(tropTot, "Connection timed out", "le switch, trop tôt : pas de réponse");
contient(tropTot, "ip_forward", "le switch, trop tôt : le jeu dit que la borne ne fait pas encore passer les paquets");
verifier(manquantes(ordre, "QUETES_PANNE") === "", "chapitre 2 dans un autre ordre : étapes manquantes : " + manquantes(ordre, "QUETES_PANNE"));

/* --- 6. Chapitre 2 : Radia ne promet ni certificat ni Crypte tant que quelque chose s'est défait --- */
var defait = nouveauMonde({}, 4646);
var avantFin = ["chapitre 2"].concat(CH2.slice(0, -2));
jouer(defait, avantFin.concat(["cd ~/Cybersup/Annexe/Portable", "ssh switch", "sudo ip link set port8 up", "exit", "cd ~/Cybersup/BatimentB"]));
var radia = defait.taper("cat Radia");
contient(radia, "ça ne tient plus", "Radia dit ce qui s'est défait");
contient(radia, "port8", "Radia nomme la prise du couloir");
absent(radia, "Ton CertificatReseau t'attend", "Radia ne promet pas le certificat tant que tout ne tient pas");
absent(radia, "cd Crypte", "Radia n'envoie pas à la Crypte tant que tout ne tient pas");
jouer(defait, ["cd ~/Cybersup/Annexe/Portable", "ssh switch", "sudo ip link set port8 down", "exit", "cd ~/Cybersup/BatimentB"]);
contient(defait.taper("cat Radia"), "Ton CertificatReseau t'attend", "tout tient : Radia remet le certificat");
verifier(defait.lire("state.quests.r_fin === true"), "tout tient : le chapitre 2 est fini");

/* --- 7. Les clés des habitants (quêtes annexes) : reposées si le joueur les a perdues --- */
var cles = nouveauMonde({}, 4747);
jouer(cles, ["chapitre 2", "cd ~/Cybersup/BatimentB", "cat Documentaliste"]);
verifier(cles.lire("Home.getItemFromName('depot_ed25519') !== -1"), "la Documentaliste pose la clé du dépôt");
cles.taper("rm ~/depot_ed25519");
contient(cles.taper("cat Documentaliste"), "copie neuve", "clé du dépôt effacée : la Documentaliste en repose une");
verifier(cles.lire("Home.getItemFromName('depot_ed25519') !== -1 && Home.getItemFromName('depot_ed25519').getText() === AX_CLE_DEPOT.privee"), "la clé reposée est la bonne");
// Un objet du joueur portait déjà ce nom avant que la Documentaliste parle : la vraie clé arrive quand même.
var deja = nouveauMonde({}, 4848);
jouer(deja, ["chapitre 2", "echo ma-cle > ~/depot_ed25519", "cd ~/Cybersup/BatimentB", "cat Documentaliste"]);
verifier(deja.lire("Home.items.some(function(it){ return it.getText() === AX_CLE_DEPOT.privee; })"), "un ~/depot_ed25519 à soi n'empêche pas la vraie clé d'arriver");
// Le Passeur, sous la Citadelle, de même.
var passeur = nouveauMonde({}, 4949);
jouer(passeur, ["chapitre 3", "ssh citadelle", "cd Crypte", "cat Passeur"]);
verifier(passeur.lire("Home.getItemFromName('cle-du-passeur') !== -1"), "le Passeur pose sa clé");
passeur.taper("echo abime > ~/cle-du-passeur");
contient(passeur.taper("cat Passeur"), "copie neuve", "clé du Passeur écrasée : il en repose une");
verifier(passeur.lire("Home.items.some(function(it){ return it.getText() === AX_CLE_PASSEUR.privee; })"), "la clé du Passeur reposée est la bonne");

console.log(verifications + " vérifications, " + echecs + " échec" + (echecs > 1 ? "s" : "") + ".");
process.exit(echecs ? 1 : 0);
