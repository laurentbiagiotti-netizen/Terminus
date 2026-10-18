/**
 * Le chapitre 5 (le Bastion, numéro 6 dans le code) : on le joue du début à la fin, tour par tour,
 * en vérifiant que chaque validation repose sur l'état réel de la machine bastion (et pas sur la seule
 * frappe d'une commande), que les variantes légitimes passent, que les raccourcis sont refusés (au
 * moins un par tour), qu'un rechargement refusé ne compte pas, puis l'horloge, l'aube (avec et sans
 * tours ouvertes), la Pierre d'Inspection, les défis d'honneur, les badges, rempart, le quiz, les
 * images, la sauvegarde en cours de chapitre et une partie complète à 20 sur 20.
 *
 * Lancer : node tests/chapitre5.js        (-v pour tout voir)
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function vrai(jeu, expr, m){ verifier(jeu.lire(expr) === true, m + "  [" + expr + "]"); }
function faux(jeu, expr, m){ verifier(jeu.lire(expr) === false, m + "  [" + expr + "]"); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : ne devrait PAS être accompli"); }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }
function absent(texte, mot, m){ verifier(String(texte).indexOf(mot) === -1, m + " : « " + mot + " » ne devrait pas apparaître"); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");

/* Une partie neuve, partie directement au Bastion (la cinquième enveloppe ou « chapitre 5 »). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 5", "oui");
	return jeu;
}
function t(jeu, c){ return jeu.jouerSolution(c); }
function jouer(jeu, liste){ liste.forEach(function(c){ t(jeu, c); }); }
/* Prêt à travailler : Laurent et la mission lus, la clé posée, sur bastion, les sorts du chapitre connus. */
function pret(jeu, sansPierre){
	jeu.lire("ORDRE_DES_SORTS_6.forEach(function(s){ state.spells[s] = true; })");
	jouer(jeu, ["cat Laurent", "cat Mission", "ssh-keygen", "ssh-copy-id bastion", "ssh bastion"]);
	if (!sansPierre) t(jeu, "sudo lynis audit system");
	return jeu;
}
function surBastion(){ return pret(neuf()); }
function score(jeu){ return jeu.lire("scoreLynis('bastion').score"); }

/* Les commandes de chaque tour (celles de la solution), pour fermer une tour d'un coup. */
var TOURS = {
	herse: ["sudo passwd -l invite", "sudo userdel depannage", "sudo sed -i 's/^# deny = 3/deny = 5/' /etc/security/faillock.conf",
		"sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS\\t90/' /etc/login.defs", "sudo chage -M 90 <moi>", "sudo chage -M 90 vint",
		"sudo usermod -s /usr/sbin/nologin sauvegarde", "sudo usermod -s /usr/sbin/nologin deploiement"],
	sceau: ["sudo sed -i 's/NOPASSWD: ALL/\\/usr\\/bin\\/systemctl restart apache2/' /etc/sudoers.d/deploiement", "sudo chmod 440 /etc/sudoers.d/deploiement",
		"printf 'root\\n<moi>\\n' | sudo tee /etc/cron.allow /etc/at.allow"],
	pontlevis: ["printf 'PermitRootLogin no\\nPasswordAuthentication no\\nAllowUsers <moi>\\nMaxAuthTries 3\\nCiphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com\\nMACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com\\nKexAlgorithms curve25519-sha256\\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf",
		"sudo sshd -t", "sudo systemctl reload ssh"],
	portes: ["sudo systemctl disable --now telnet.socket rpcbind avahi-daemon", "sudo apt purge telnetd", "sudo mkdir -p /etc/systemd/system/apache2.service.d",
		"printf '[Service]\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=full\\n' | sudo tee /etc/systemd/system/apache2.service.d/override.conf", "sudo systemctl daemon-reload"],
	remparts: ["sudo ufw default deny incoming", "sudo ufw allow 22/tcp", "sudo ufw allow 443/tcp", "sudo ufw enable", "sudo ufw delete allow 80/tcp", "sudo ufw status verbose",
		"exit", "curl -I http://bastion/", "ssh bastion"],
	coffres: ["sudo chmod 640 /etc/shadow", "sudo chmod o-w /etc/cron.d/rotation-sauvegardes /usr/local/bin/sauver.sh", "sudo chmod 1777 /tmp", "sudo chmod u-s /usr/local/bin/vieil-outil",
		"sudo setcap -r /usr/bin/python3.11", "echo 'tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0' | sudo tee -a /etc/fstab", "sudo mount /tmp", "sudo sed -i 's/^UMASK.*/UMASK\\t\\t027/' /etc/login.defs"],
	coeur: ["printf 'net.ipv4.ip_forward = 0\\nnet.ipv4.conf.all.rp_filter = 1\\nnet.ipv4.conf.all.accept_redirects = 0\\nkernel.dmesg_restrict = 1\\nkernel.kptr_restrict = 2\\nkernel.randomize_va_space = 2\\nfs.protected_symlinks = 1\\n' | sudo tee /etc/sysctl.d/99-bastion.conf",
		"sudo sysctl --system", "printf 'install usb-storage /bin/false\\nblacklist cramfs\\n' | sudo tee /etc/modprobe.d/bastion.conf", "sudo modprobe -r usb-storage"],
	poterne: ["echo 'set superusers=\"gardien\"' | sudo tee -a /etc/grub.d/40_custom",
		"printf 'Gardien-du-Bastion\\nGardien-du-Bastion\\n' | grub-mkpasswd-pbkdf2 | awk '/grub.pbkdf2/ { print \"password_pbkdf2 gardien\", $NF }' | sudo tee -a /etc/grub.d/40_custom",
		"sudo update-grub", "sudo systemctl mask ctrl-alt-del.target"],
	banniere: ["sudo sed -i -e 's/^ServerTokens OS/ServerTokens Prod/' -e 's/^ServerSignature On/ServerSignature Off/' -e 's/^TraceEnable On/TraceEnable Off/' /etc/apache2/conf-available/security.conf",
		"sudo a2dismod -f autoindex",
		"sudo sed -i -e 's#/etc/ssl/certs/bastion.pem#/etc/ssl/certs/bastion-2026.pem#' -e 's/SSLEngine on/SSLEngine on\\n\\tSSLProtocol -all +TLSv1.2 +TLSv1.3\\n\\tHeader always set Strict-Transport-Security \"max-age=63072000\"/' /etc/apache2/sites-available/default-ssl.conf",
		"sudo a2enmod headers", "apachectl configtest", "sudo systemctl restart apache2"],
	guet: ["printf -- '-w /etc/passwd -p wa -k comptes\\n-w /etc/shadow -p wa -k comptes\\n-w /etc/sudoers -p wa -k sudoers\\n' | sudo tee /etc/audit/rules.d/bastion.rules",
		"sudo augenrules --load", "sudo sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf", "sudo systemctl restart systemd-journald",
		"sudo timedatectl set-ntp true", "echo 'Acces reserve aux personnes autorisees. Toute connexion est surveillee.' | sudo tee /etc/issue /etc/issue.net"],
	sceaux: ["sudo aide --init", "sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db", "sudo aide --check", "sudo apt update", "sudo apt upgrade",
		"sudo apt install unattended-upgrades", "printf 'APT::Periodic::Update-Package-Lists \"1\";\\nAPT::Periodic::Unattended-Upgrade \"1\";\\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades",
		"sudo debsums -s", "sudo apt install --reinstall procps"],
	garde: ["printf '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 1h\\n' | sudo tee /etc/fail2ban/jail.local", "sudo fail2ban-client reload", "sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2"]
};
var ORDRE_TOURS = ["herse", "sceau", "pontlevis", "portes", "remparts", "coffres", "coeur", "poterne", "banniere", "guet", "sceaux", "garde"];
var ETAPES = { herse: ["h_comptes_vides", "h_comptes_regles"], sceau: ["h_sudo", "h_planif"], pontlevis: ["h_ssh_acces", "h_ssh_algos"], portes: ["h_portes", "h_sandbox"],
	remparts: ["h_parefeu", "h_parefeu_verif"], coffres: ["h_droits", "h_capacites"], coeur: ["h_sysctl", "h_modules"], poterne: ["h_grub", "h_ctrlaltdel"],
	banniere: ["h_apache_bavard", "h_apache_tls"], guet: ["h_auditd", "h_journaux"], sceaux: ["h_aide", "h_paquets"], garde: ["h_fail2ban", "h_apparmor"] };
function fermer(jeu, tours){ (tours || ORDRE_TOURS).forEach(function(cle){ jouer(jeu, TOURS[cle]); }); }

/* ================================================================== */
/* 1. Les fichiers, les images, l'écriture                              */
/* ================================================================== */
/* Le compte est créé à la connexion, après la construction du monde : bastion prend le bon identifiant. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.lire("adopterPrenom('Ada')");
	jeu.taper("chapitre 5", "oui");
	jeu.taper("ssh-copy-id bastion"); jeu.taper("ssh bastion");
	verifier(jeu.taper("grep -c '^ada:' /etc/passwd").trim() === "1", "bastion : le compte du joueur porte son identifiant (ada)");
	verifier(jeu.taper("grep -c apprenti /etc/passwd /etc/group /etc/shadow").indexOf(":1") === -1, "bastion : plus aucune trace de l'identifiant provisoire");
	verifier(jeu.taper("ls /home").indexOf("ada/") > -1, "bastion : /home/ada");
	verifier(jeu.taper("sudo chage -M 90 ada", jeu.lire("MOT_DE_PASSE_SUDO")).indexOf("does not exist") === -1, "bastion : chage trouve le compte du joueur");
})();

/* L'horloge de la nuit : date sur bastion, et le journal qui passe au lendemain après minuit. */
(function(){
	var jeu = neuf();
	jeu.taper("ssh-copy-id bastion"); jeu.taper("ssh bastion");
	verifier(/ 22:\d\d:\d\d/.test(jeu.taper("date")), "date sur bastion : l'heure de la nuit (22 h au départ)");
	jeu.lire("state.ch5.horloge = 140"); jeu.taper("ls");
	verifier(/^0[0-2]:/.test(jeu.taper("date +%H:%M").trim()), "date sur bastion : après minuit, l'heure de la nuit continue");
	jeu.lire("journalGuet(H5, { unite: 'essai-nuit', message: 'avant' })");
	var veille = jeu.lire("new Date(state.ch5.base).getDate()");
	var sortie = jeu.taper("sudo journalctl -t essai-nuit", jeu.lire("MOT_DE_PASSE_SUDO"));
	var jour = /^[A-Z][a-z]{2} (\d\d) /m.exec(sortie);
	verifier(jour && +jour[1] !== veille, "journal : une entrée d'après minuit porte la date du lendemain");
})();

/* Départ direct : sans la Crypte, le joueur n'a pas de clés SSH ; Grace lui en fabrique une paire à l'entrée du Bastion. */
(function(){
	var st = {};
	var jeu = neuf(st);
	verifier(jeu.lire("Home.getChildFromName('.ssh') !== -1 && Home.getChildFromName('.ssh').getItemFromName('id_ed25519.pub') !== -1"), "départ direct : une paire de clés SSH dans ~/.ssh");
	verifier(jeu.taper("ssh-copy-id bastion").indexOf("Number of key(s) added: 1") > -1, "départ direct : ssh-copy-id bastion pose la clé");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	verifier(jeu2.lire("Home.getChildFromName('.ssh') !== -1 && Home.getChildFromName('.ssh').getItemFromName('id_ed25519') !== -1"), "la paire de clés survit au rechargement");
})();

(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var iGuet = index.indexOf("SortsGuet.js"), iC5 = index.indexOf("Chapitre5.js"), iB = index.indexOf("/Bastion.js?"), iIntro = index.indexOf("Intro.js");
	verifier(iC5 > iGuet && iB > iC5 && iIntro > iB, "index.html : Chapitre5.js puis Bastion.js, après SortsGuet.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf('"SortsGuet.js", "Chapitre5.js", "Bastion.js"') > -1, "tests/monde.js charge Chapitre5.js puis Bastion.js");
	["Chapitre5.js", "Bastion.js"].forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		verifier(!/Forteresse/.test(src), f + " : le décor est le Bastion, jamais la Forteresse");
		verifier(!/Canonical|ANSSI|CISOfy|\bNIST\b|\bCIS\b/.test(src), f + " : aucun nom de marque, d'organisme ou de référentiel");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		verifier(chaines.every(function(x){ return x.indexOf(" & ") === -1; }), f + " : pas d'esperluette en prose");
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
		verifier(/^World\.fige = false;/m.test(src) && /^World\.fige = true;\s*$/m.test(src), f + " : le monde est ouvert puis refigé");
	});
	var images = ["loc_bastion.gif", "loc_serveur_bastion.gif", "item_pierre.gif", "item_lettre_inspection.gif"];
	["herse", "sceau", "pontlevis", "portes", "remparts", "coffres", "coeur", "poterne", "banniere", "guet", "sceaux", "garde"].forEach(function(c){ images.push("loc_tour_" + c + ".gif"); });
	["fernando", "butler", "tatu", "jean", "vint", "evelyn", "edsger", "joan", "robert", "katherine", "ralph", "adele"].forEach(function(m){ images.push("item_" + m + ".gif"); });
	["tour_herse", "tour_sceau", "tour_pontlevis", "tour_portes", "tour_remparts", "tour_coffres", "tour_coeur", "tour_poterne", "tour_banniere", "tour_guet", "tour_sceaux", "tour_garde",
	 "h_pierre", "h_aube", "h_rapport", "s_h_avant_quatre", "platine_ch5"].forEach(function(b){ images.push("badge_" + b + ".gif"); });
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, im)), "image " + im + " présente"); });
	egal(images.length, 45, "45 images du chapitre");
	var jeu = monde.nouveauMonde({});
	// Toutes les images que le chapitre nomme existent.
	var noms = jeu.lire("[HallBastion, ServeurBastion, BoiteDuBastion].concat(TOURS_CH5.map(function(t){ return t.lieu; })).map(function(r){ return r.room_pic; }).concat([LaurentBastion, PierreDInspection, FrancesBastion, CertificatBastion].concat(Object.keys(MAITRES_BASTION).map(function(k){ return MAITRES_BASTION[k].item; })).map(function(i){ return i.picturename; })).join('|')").split("|");
	noms.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, n.replace(/^.*\//, ""))), "image du monde présente : " + n); });
	// Le décor n'apparaît pas avant l'ouverture.
	faux(jeu, "state.has('ch5Ouvert')", "partie neuve : le Bastion est fermé");
	contient(jeu.taper("rempart"), "s'ouvre avec le chapitre 5", "rempart avant le chapitre");
	var s = jeu.taper("ssh bastion");
	verifier(/Could not resolve|pas encore|Permission denied|n'apparaît/.test(s), "ssh bastion avant l'ouverture : refusé");
})();

/* ================================================================== */
/* 2. Le départ direct, puis l'ouverture après l'Académie               */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch5Ouvert')", "départ direct : le Bastion s'ouvre");
	vrai(jeu, "state.has('ch5Direct')", "départ direct : drapeau ch5Direct");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	egal(jeu.lire("current_room.room_name"), "Bastion", "départ direct : on arrive dans le hall du Bastion");
	egal(jeu.lire("state.chapitreEnCours()"), 6, "chapitreEnCours vaut 6");
	egal(jeu.lire("numeroAffiche(6)"), 5, "le numéro affiché est 5");
	fait(jeu, "h_entree", "h_entree (entrée dans le Bastion)");
	egal(jeu.lire("state.queteEnCours().id"), "h_pierre", "l'étape en cours est h_pierre (pas le chapitre 1)");
	verifier(jeu.taper("indice").indexOf("ForetOuest") === -1, "indice ne renvoie pas au chapitre 1");
	var avant = jeu.lire("tousLesSorts().filter(function(s){ return [1, 2, 3, 5].indexOf(chapitreDuSort(s)) > -1; })");
	avant.forEach(function(s){ vrai(jeu, "state.knows(" + JSON.stringify(s) + ")", "socle acquis au départ direct : " + s); });
	jeu.lire("ORDRE_DES_SORTS_6").forEach(function(s){ faux(jeu, "state.knows(" + JSON.stringify(s) + ")", s + " s'apprend auprès d'un maître du Bastion"); });
	egal(jeu.lire("ORDRE_DES_SORTS_6.length"), 42, "42 sorts au chapitre 5");
	jeu.lire("ORDRE_DES_SORTS_6").forEach(function(s){ egal(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ")"), 6, "chapitreDuSort(" + s + ")"); });
	egal(jeu.lire("Shell.cheminAffiche(HallBastion)"), "~/Cybersup/SalleServeurs/Bastion", "départ direct : le hall est au fond de la SalleServeurs");
	contient(jeu.taper("chapitre"), "5. Le Bastion", "chapitre : la ligne 5");
	contient(jeu.taper("chapitre 5"), "déjà ouvert", "chapitre 5 déjà ouvert : message clair");
	contient(jeu.taper("chapitre 9"), "1, 2, 3, 4, 5, 6, 7 et 8", "chapitre 9 : il n'existe pas");
	contient(jeu.taper("help 5"), "Tes sorts du chapitre 5", "help 5");
	contient(jeu.taper("quetes"), "Pierre", "quetes : l'étape de la Pierre");
	contient(jeu.taper("xp"), "CHAPITRE 5 : LE BASTION", "xp : le tableau du chapitre 5");
	contient(jeu.taper("xp"), "7500", "xp : 7500 XP au maximum");
	egal(jeu.lire("state.xpMax6()"), 7500, "xpMax6");
	egal(jeu.lire("QUETES_CH5.length"), 29, "29 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH5.length"), 74, "74 défis (72 des tours, 2 d'honneur)");
	egal(jeu.lire("QUETES_CH5.map(function(q){ return q.id; }).filter(function(id){ return !/^h_/.test(id); }).length"), 0, "les étapes s'appellent h_*");
	egal(jeu.lire("QUETES_SECONDAIRES_CH5.filter(function(q){ return !/^s_h_/.test(q.id); }).length"), 0, "les défis s'appellent s_h_*");
	egal(jeu.lire("chapitreDeQuete('s_h_pwck')"), 6, "chapitreDeQuete d'un défi");
	// Le départ direct depuis une partie engagée est refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("cd");
	jeu2.taper("ls");
	jeu2.lire("state.complete('m_marche')");
	var r = jeu2.taper("chapitre 5", "oui");
	verifier(/Tu as déjà commencé|déjà commencé/.test(r) || jeu2.lire("state.has('ch5Ouvert')") === false, "une partie engagée ne part pas directement au Bastion");

	// L'ouverture normale : après la victoire de l'Académie (d_fin).
	var jeu3 = monde.nouveauMonde({});
	jeu3.taper("chapitre 4", "oui");
	faux(jeu3, "state.has('ch5Ouvert')", "Académie en cours : le Bastion reste fermé");
	jeu3.lire("state.complete('d_fin'); verifierMonde()");
	vrai(jeu3, "state.has('ch5Ouvert')", "après d_fin : le Bastion s'ouvre");
	faux(jeu3, "state.has('ch5Direct')", "après d_fin : pas un départ direct");
	vrai(jeu3, "Academie.children.indexOf(HallBastion) > -1", "après d_fin : le Bastion est au fond de l'Académie");
	egal(jeu3.lire("Shell.cheminAffiche(HallBastion)"), "~/Cybersup/SalleServeurs/Academie/Bastion", "le chemin du hall après l'Académie");
	jeu3.taper("cd ~/Cybersup/SalleServeurs/Academie");
	var s = jeu3.taper("cd Bastion");
	contient(s, "Bastion", "cd Bastion depuis l'Académie");
	fait(jeu3, "h_entree", "h_entree après l'Académie");
	egal(jeu3.lire("state.chapitreEnCours()"), 6, "après l'entrée, chapitreEnCours vaut 6");
	contient(jeu3.taper("cat Radio"), "Grace", "la radio de Grace au Bastion");
})();

/* ================================================================== */
/* 3. La Pierre d'Inspection : le score de départ, Laurent et la mission */
/* ================================================================== */
(function(){
	var jeu = neuf();
	jeu.lire("ORDRE_DES_SORTS_6.forEach(function(s){ state.spells[s] = true; })");
	jouer(jeu, ["ssh-keygen", "ssh-copy-id bastion", "ssh bastion", "sudo lynis audit system"]);
	pasFait(jeu, "h_pierre", "h_pierre sans Laurent ni la mission");
	jouer(jeu, ["exit", "cat Laurent"]);
	pasFait(jeu, "h_pierre", "h_pierre avec Laurent seul");
	jouer(jeu, ["cat Mission"]);
	fait(jeu, "h_pierre", "h_pierre : Laurent, la mission, et une inspection déjà faite");
	t(jeu, "ssh bastion");
	var s = t(jeu, "sudo lynis audit system | grep \"Hardening index\"");
	contient(s, "Hardening index", "la Pierre donne l'indice de durcissement");
	fait(jeu, "h_pierre", "h_pierre après Laurent, la mission et l'inspection");
	var depart = jeu.lire("state.ch5.scoreDepart");
	verifier(depart >= 35 && depart <= 41, "le score de départ est autour de 38 (" + depart + ")");
	egal(score(jeu), depart, "scoreLynis donne le même score");
	contient(t(jeu, "lynis audit system"), "", "lynis sans sudo ne plante pas");
	jouer(jeu, ["exit"]);
	var p = jeu.taper("cat PierreDInspection");
	contient(p, String(depart), "PierreDInspection rappelle le dernier score");
	verifier(/manque|cède|à corriger|reste/i.test(p), "PierreDInspection dit ce qui manque");
	var r = jeu.taper("rempart");
	contient(r, "LE PLAN DU BASTION", "rempart : le plan");
	contient(r, depart + " / 100", "rempart : le score de la Pierre");
	["Herse", "Sceau", "PontLevis", "Portes", "Remparts", "Coffres", "Coeur", "Poterne", "Banniere", "Guet", "Sceaux", "Garde"].forEach(function(n){ contient(r, n, "rempart : la tour " + n); });
	["Fernando", "Butler", "Tatu", "Jean", "Vint", "Evelyn", "Edsger", "Joan", "Robert", "Katherine", "Ralph", "Adele"].forEach(function(n){ contient(r, n, "rempart : le maître " + n); });
	contient(r, "Tours fermées : 0 sur 12", "rempart : aucune tour fermée");
	contient(r, "Défis d'honneur", "rempart : les défis d'honneur");
	contient(jeu.taper("man rempart"), "rempart n'est PAS une commande Linux", "man rempart");
	contient(jeu.taper("help"), "rempart", "help liste rempart parmi les commandes du jeu");
})();

/* ================================================================== */
/* 4. Les maîtres vivants : sorts, défis, textes                       */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var maitres = { herse: "Fernando", sceau: "Butler", pontlevis: "Tatu", portes: "Jean", remparts: "Vint", coffres: "Evelyn", coeur: "Edsger", poterne: "Joan",
		banniere: "Robert", guet: "Katherine", sceaux: "Ralph", garde: "Adele" };
	var salles = { herse: "Herse", sceau: "Sceau", pontlevis: "PontLevis", portes: "Portes", remparts: "Remparts", coffres: "Coffres", coeur: "Coeur", poterne: "Poterne",
		banniere: "Banniere", guet: "Guet", sceaux: "Sceaux", garde: "Garde" };
	var hall = jeu.lire("Shell.cheminAffiche(HallBastion)");
	ORDRE_TOURS.forEach(function(cle){
		var s = jeu.taper("cd " + hall + "/" + salles[cle]);
		contient(s, salles[cle], "cd vers la tour " + salles[cle]);
		var texte = jeu.taper("cat " + maitres[cle]);
		contient(texte, maitres[cle], maitres[cle] + " : son nom");
		contient(texte, "Les défis", maitres[cle] + " : la liste de ses défis");
		egal((texte.match(/\[ \]/g) || []).length, 6, maitres[cle] + " : six défis à faire");
		contient(texte, "Ta mission", maitres[cle] + " : la mission");
		contient(texte, "Le métier", maitres[cle] + " : le mot du métier");
		jeu.lire("SORTS_DES_TOURS[" + JSON.stringify(cle) + "]").forEach(function(sort){ vrai(jeu, "state.knows(" + JSON.stringify(sort) + ")", maitres[cle] + " enseigne " + sort); });
		jeu.lire("idsDefisTour(" + JSON.stringify(cle) + ")").forEach(function(id){ vrai(jeu, "!!state.seen[" + JSON.stringify(id) + "]", maitres[cle] + " révèle " + id); });
		verifier(texte.indexOf("—") === -1, maitres[cle] + " : pas de tiret cadratin");
	});
	jeu.taper("cd " + hall);
	contient(jeu.taper("cat Laurent"), "Deux défis d'honneur", "Laurent annonce les défis d'honneur");
	vrai(jeu, "state.knows('lynis')", "Laurent enseigne lynis");
	vrai(jeu, "!!state.seen.s_h_avant_quatre && !!state.seen.s_h_sans_indice", "Laurent révèle les deux défis d'honneur");
	var b = jeu.taper("cat Bestiaire");
	["pam_faillock", "sudo", "SSH", "ufw", "sysctl", "GRUB", "auditd", "AIDE", "fail2ban", "AppArmor"].forEach(function(mot){ contient(b, mot, "le Bestiaire traduit en vrai mot : " + mot); });
	contient(jeu.taper("cat Frances"), "Cèdent encore", "Frances liste les murs qui cèdent");
	verifier(/Il est \d\d:\d\d/.test(jeu.taper("cat Horloge")), "l'Horloge marque la nuit");
	egal(jeu.lire("Object.keys(MAITRES_BASTION).length"), 12, "douze maîtres");
	egal(jeu.lire("DEFIS_BASTION.filter(function(d){ return d.tour !== 'honneur'; }).length"), 72, "72 défis de tours");
	ORDRE_TOURS.forEach(function(cle){ egal(jeu.lire("defisTour(" + JSON.stringify(cle) + ").length"), 6, "six défis pour " + cle); });
	jeu.lire("DEFIS_BASTION").forEach(function(d){
		verifier(!!(d.appel || d.monde || d.evenement || d.tour === "honneur"), "le défi " + d.id + " a une condition de réussite");
		verifier(d.titre && d.titre.indexOf("—") === -1, "le défi " + d.id + " a un titre propre");
	});
})();

/* ================================================================== */
/* 5. La Herse : raccourcis refusés, variantes acceptées                */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	fait(jeu, "h_pierre", "h_pierre dans la mise en place");
	// Raccourci : verrouiller le second root au lieu de le supprimer.
	jouer(jeu, ["sudo passwd -l invite", "sudo passwd -l depannage"]);
	pasFait(jeu, "h_comptes_vides", "second root seulement verrouillé : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(TOURS_CH5[0].lieu)") + "/Fernando"), "UID est toujours 0", "Fernando signale l'UID 0 verrouillé");
	t(jeu, "sudo userdel depannage");
	fait(jeu, "h_comptes_vides", "second root supprimé, invite verrouillé");
	// Raccourci : login.defs sans chage.
	jouer(jeu, ["sudo sed -i 's/^# deny = 3/deny = 5/' /etc/security/faillock.conf", "sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS\\t90/' /etc/login.defs",
		"sudo usermod -s /usr/sbin/nologin sauvegarde", "sudo usermod -s /usr/sbin/nologin deploiement"]);
	pasFait(jeu, "h_comptes_regles", "PASS_MAX_DAYS sans chage pour les administrateurs : refusé");
	t(jeu, "sudo chage -M 90 <moi>");
	pasFait(jeu, "h_comptes_regles", "chage pour un seul administrateur sur deux : refusé");
	t(jeu, "sudo chage -M 60 vint");
	fait(jeu, "h_comptes_regles", "variante : chage -M 60 accepté");
	// Variantes : supprimer invite au lieu de le verrouiller, deny = 3, PASS_MAX_DAYS 60.
	var j2 = surBastion();
	jouer(j2, ["sudo userdel invite", "sudo userdel depannage"]);
	fait(j2, "h_comptes_vides", "variante : userdel invite accepté");
	jouer(j2, ["sudo sed -i 's/^# deny = 3/deny = 3/' /etc/security/faillock.conf", "sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS 60/' /etc/login.defs",
		"sudo chage -M 60 <moi>", "sudo chage -M 60 vint", "sudo usermod -s /usr/sbin/nologin sauvegarde"]);
	pasFait(j2, "h_comptes_regles", "un compte de service garde son shell : refusé");
	t(j2, "sudo usermod -s /bin/false deploiement");
	fait(j2, "h_comptes_regles", "variante : /bin/false accepté");
	// faillock en commentaire : refusé.
	var j3 = surBastion();
	jouer(j3, TOURS.herse.filter(function(c){ return c.indexOf("faillock.conf") === -1; }));
	pasFait(j3, "h_comptes_regles", "deny resté en commentaire : refusé");
	t(j3, "printf 'deny = 5\\nunlock_time = 600\\n' | sudo tee -a /etc/security/faillock.conf");
	fait(j3, "h_comptes_regles", "variante : deny ajouté avec tee -a");
	vrai(j3, "tourFermeeCh5('herse')", "la Herse est fermée");
	vrai(j3, "state.has('tour_herse')", "badge de la Herse");
	vrai(j3, "!!state.ch5.murs.herse", "Frances a éprouvé la Herse");
	t(j3, "exit");
	var fr = j3.taper("cat Frances");
	var cedent = fr.substring(fr.indexOf("Cèdent encore"), fr.indexOf("»", fr.indexOf("Cèdent encore")));
	absent(cedent, "la Herse des Comptes", "Frances ne cite plus la Herse parmi les murs qui cèdent");
	contient(fr, "Tiennent déjà : la Herse des Comptes", "Frances cite la Herse parmi les murs qui tiennent");
})();

/* ================================================================== */
/* 6. Le Sceau du Roi                                                  */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	t(jeu, "sudo chmod 440 /etc/sudoers.d/deploiement");
	pasFait(jeu, "h_sudo", "0440 mais NOPASSWD: ALL toujours là : refusé");
	var j2 = surBastion();
	t(j2, "sudo sed -i 's/NOPASSWD: ALL/\\/usr\\/bin\\/systemctl restart apache2/' /etc/sudoers.d/deploiement");
	pasFait(j2, "h_sudo", "règle étroite mais fichier en 0644 : refusé");
	t(j2, "sudo chmod 440 /etc/sudoers.d/deploiement");
	fait(j2, "h_sudo", "règle étroite et 0440");
	// Variante : supprimer le fichier.
	var j3 = surBastion();
	t(j3, "sudo rm /etc/sudoers.d/deploiement");
	fait(j3, "h_sudo", "variante : le fichier supprimé");
	// La planification.
	t(jeu, "printf 'root\\n<moi>\\n' | sudo tee /etc/cron.allow");
	pasFait(jeu, "h_planif", "cron.allow seul : refusé");
	t(jeu, "printf 'root\\n<moi>\\nstagiaire\\n' | sudo tee /etc/at.allow");
	pasFait(jeu, "h_planif", "at.allow qui nomme un compte de trop : refusé");
	t(jeu, "printf 'root\\n<moi>\\n' | sudo tee /etc/at.allow");
	fait(jeu, "h_planif", "cron.allow et at.allow : root et le joueur");
	// sudo ne doit jamais cesser de marcher pour le joueur.
	var j4 = surBastion();
	jouer(j4, ["sudo sed -i 's/NOPASSWD: ALL/\\/usr\\/bin\\/systemctl restart apache2/' /etc/sudoers.d/deploiement", "sudo chmod 440 /etc/sudoers.d/deploiement"]);
	vrai(j4, "VALIDATIONS_CH5.h_sudo()", "validation h_sudo vraie");
	j4.lire("ecrireFichierHote('bastion', '/etc/sudoers', texteHote('bastion', '/etc/sudoers').replace(/^%sudo.*$/m, '# sudo retire'))");
	faux(j4, "VALIDATIONS_CH5.h_sudo()", "le joueur n'a plus sudo : h_sudo refusé");
})();

/* ================================================================== */
/* 7. Le Pont-levis : tester avant de recharger                         */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	t(jeu, TOURS.pontlevis[0]);
	t(jeu, "sudo systemctl reload ssh");
	pasFait(jeu, "h_ssh_acces", "reload sans sshd -t : refusé");
	pasFait(jeu, "h_ssh_algos", "algos rechargés sans sshd -t : refusés");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('pontlevis').lieu)") + "/Tatu"), "sans passer par sshd -t", "Tatu signale le reload sans test");
	jouer(jeu, ["sudo sshd -t", "sudo systemctl reload ssh"]);
	fait(jeu, "h_ssh_acces", "sshd -t puis reload");
	fait(jeu, "h_ssh_algos", "algorithmes modernes et clé ed25519");
	egal(jeu.lire("configSshEffective('bastion').permitrootlogin"), "no", "sshd applique PermitRootLogin no");
	// Une configuration fausse : sshd -t la refuse, le reload aussi, l'ancienne reste.
	var j2 = surBastion();
	t(j2, "printf 'PermitRootLogin no\\nPasswordAuthentication no\\nAllowUsers <moi>\\nMaxAuthTries 3\\nPermitRootLogn yes\\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf");
	var s = t(j2, "sudo sshd -t");
	verifier(/Bad configuration|bad configuration|unsupported|Unsupported/.test(s), "sshd -t refuse une faute de frappe (" + s.substring(0, 120) + ")");
	t(j2, "sudo systemctl reload ssh");
	pasFait(j2, "h_ssh_acces", "configuration fausse : rechargement refusé, étape refusée");
	verifier(j2.lire("configSshEffective('bastion').permitrootlogin") !== "no", "le rechargement refusé laisse l'ancienne configuration");
	// Des algorithmes faibles : refusés.
	var j3 = surBastion();
	t(j3, "printf 'PermitRootLogin no\\nPasswordAuthentication no\\nAllowUsers <moi>\\nMaxAuthTries 3\\nCiphers aes128-cbc,3des-cbc\\nMACs hmac-md5\\nKexAlgorithms diffie-hellman-group1-sha1\\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf");
	jouer(j3, ["sudo sshd -t", "sudo systemctl reload ssh"]);
	fait(j3, "h_ssh_acces", "accès fermé (algos à part)");
	pasFait(j3, "h_ssh_algos", "algorithmes faibles : refusés");
	// Sans clé posée : h_ssh_algos refusé, et le refus de ssh le dit.
	var j4 = neuf();
	j4.lire("ORDRE_DES_SORTS_6.forEach(function(s){ state.spells[s] = true; })");
	jouer(j4, ["cat Laurent", "cat Mission", "ssh bastion"]);
	jouer(j4, TOURS.pontlevis);
	fait(j4, "h_ssh_acces", "accès fermé même sans clé (la session reste ouverte)");
	pasFait(j4, "h_ssh_algos", "sans clé ed25519 posée : refusé");
	t(j4, "exit");
	contient(t(j4, "ssh bastion"), "ta clé n'est pas posée", "sans clé : le Pont-levis refuse, et dit pourquoi");
	// AllowUsers qui ne nomme pas le joueur : refusé.
	var j5 = surBastion();
	t(j5, "printf 'PermitRootLogin no\\nPasswordAuthentication no\\nAllowUsers vint\\nMaxAuthTries 3\\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf");
	jouer(j5, ["sudo sshd -t", "sudo systemctl reload ssh"]);
	pasFait(j5, "h_ssh_acces", "AllowUsers sans le joueur : refusé (il se couperait)");
})();

/* ================================================================== */
/* 8. Les Portes condamnées                                            */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	t(jeu, "sudo systemctl stop telnet.socket rpcbind avahi-daemon");
	pasFait(jeu, "h_portes", "stop seul (encore activés au démarrage) : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('portes').lieu)") + "/Jean"), "disable --now", "Jean signale stop sans disable");
	t(jeu, "sudo systemctl disable telnet.socket rpcbind avahi-daemon");
	pasFait(jeu, "h_portes", "désactivés mais le paquet telnetd est toujours là : refusé");
	t(jeu, "sudo apt purge telnetd");
	fait(jeu, "h_portes", "arrêtés, désactivés, telnetd purgé");
	// Variante : mask au lieu de disable.
	var j2 = surBastion();
	jouer(j2, ["sudo systemctl mask --now rpcbind avahi-daemon", "sudo systemctl disable --now telnet.socket", "sudo apt purge telnetd"]);
	fait(j2, "h_portes", "variante : mask --now accepté");
	// Le bac à sable : sans daemon-reload, refusé.
	jouer(jeu, ["sudo mkdir -p /etc/systemd/system/apache2.service.d", "printf '[Service]\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=full\\n' | sudo tee /etc/systemd/system/apache2.service.d/override.conf"]);
	pasFait(jeu, "h_sandbox", "drop-in écrit, sans daemon-reload : refusé");
	t(jeu, "sudo systemctl daemon-reload");
	fait(jeu, "h_sandbox", "drop-in chargé");
	verifier(jeu.lire("expositionUnite('bastion', 'apache2').exposition") < 9, "la note d'Apache passe sous 9");
	// Un bac à sable trop faible (une seule directive) : refusé.
	var j3 = surBastion();
	jouer(j3, ["sudo mkdir -p /etc/systemd/system/apache2.service.d", "printf '[Service]\\nPrivateTmp=yes\\n' | sudo tee /etc/systemd/system/apache2.service.d/override.conf", "sudo systemctl daemon-reload"]);
	pasFait(j3, "h_sandbox", "PrivateTmp seul : refusé");
	// Apache arrêté : le bac à sable ne compte pas.
	var j4 = surBastion();
	jouer(j4, ["sudo systemctl stop apache2"].concat(TOURS.portes.slice(2)));
	pasFait(j4, "h_sandbox", "Apache arrêté : refusé (un service arrêté n'est pas durci)");
})();

/* ================================================================== */
/* 9. Les Remparts : ufw ou nftables, vérifier depuis l'extérieur        */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	jouer(jeu, ["sudo ufw default deny incoming", "sudo ufw enable"]);
	pasFait(jeu, "h_parefeu", "deny incoming sans exception : refusé (22 et 443 fermés)");
	jouer(jeu, ["sudo ufw allow 22/tcp"]);
	pasFait(jeu, "h_parefeu", "443 encore fermé : refusé");
	t(jeu, "sudo ufw allow 443/tcp");
	fait(jeu, "h_parefeu", "deny incoming, 22 et 443 ouverts");
	pasFait(jeu, "h_parefeu_verif", "la vieille règle du port 80 est toujours là");
	jouer(jeu, ["sudo ufw delete allow 80/tcp"]);
	pasFait(jeu, "h_parefeu_verif", "sans lire la loi ni éprouver depuis l'extérieur : refusé");
	t(jeu, "sudo ufw status verbose");
	pasFait(jeu, "h_parefeu_verif", "sans éprouver depuis l'extérieur : refusé");
	t(jeu, "curl -I http://bastion/");
	pasFait(jeu, "h_parefeu_verif", "curl depuis bastion lui-même : ne compte pas");
	jouer(jeu, ["exit", "curl -I http://bastion/"]);
	fait(jeu, "h_parefeu_verif", "vérifié depuis le hall");
	egal(jeu.lire("portsJoignablesCh5().join(',')"), "22,443", "seuls 22 et 443 répondent");
	// Variante : nftables directement.
	var j2 = surBastion();
	t(j2, "printf 'flush ruleset\\ntable inet filter {\\n\\tchain input {\\n\\t\\ttype filter hook input priority 0; policy drop;\\n\\t\\tct state established,related accept\\n\\t\\tiif lo accept\\n\\t\\ttcp dport { 22, 443 } accept\\n\\t}\\n}\\n' | sudo tee /etc/nftables.conf");
	t(j2, "sudo nft -f /etc/nftables.conf");
	fait(j2, "h_parefeu", "variante : nftables (policy drop, 22 et 443)");
	jouer(j2, ["sudo nft list ruleset", "exit", "curl -I http://bastion/"]);
	fait(j2, "h_parefeu_verif", "variante : nftables vérifié");
	// Raccourci : ufw sans politique (allow incoming) mais actif.
	var j3 = surBastion();
	jouer(j3, ["sudo ufw allow 22/tcp", "sudo ufw allow 443/tcp", "sudo ufw enable"]);
	pasFait(j3, "h_parefeu", "ufw actif mais politique allow : refusé");
	contient(j3.taper("cat " + j3.lire("Shell.cheminAffiche(tourCh5('remparts').lieu)") + "/Vint"), "default deny incoming", "Vint signale la politique");
	// ufw sans sudo : refusé par le système.
	contient(t(j3, "ufw status"), "You need to be root", "ufw sans sudo");
})();

/* ================================================================== */
/* 10. La Salle des Coffres                                            */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	jouer(jeu, ["sudo chmod 640 /etc/shadow", "sudo chmod o-w /etc/cron.d/rotation-sauvegardes /usr/local/bin/sauver.sh", "sudo chmod 755 /tmp", "sudo chmod u-s /usr/local/bin/vieil-outil"]);
	pasFait(jeu, "h_droits", "/tmp en 755 (plus personne n'y dépose) : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('coffres').lieu)") + "/Evelyn"), "1777", "Evelyn signale le /tmp fermé");
	t(jeu, "sudo chmod 1777 /tmp");
	fait(jeu, "h_droits", "sticky bit posé");
	jouer(jeu, ["sudo setcap -r /usr/bin/python3.11", "echo 'tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0' | sudo tee -a /etc/fstab", "sudo sed -i 's/^UMASK.*/UMASK\\t\\t027/' /etc/login.defs"]);
	pasFait(jeu, "h_capacites", "la ligne de fstab sans monter /tmp : refusé");
	t(jeu, "sudo mount /tmp");
	fait(jeu, "h_capacites", "/tmp monté nodev,nosuid,noexec");
	// Un SUID oublié : refusé.
	var j2 = surBastion();
	jouer(j2, ["sudo chmod 640 /etc/shadow", "sudo chmod o-w /etc/cron.d/rotation-sauvegardes /usr/local/bin/sauver.sh", "sudo chmod 1777 /tmp"]);
	pasFait(j2, "h_droits", "le SUID de vieil-outil oublié : refusé");
	// Variante : supprimer le vieil outil, shadow en 600.
	jouer(j2, ["sudo rm /usr/local/bin/vieil-outil", "sudo chmod 600 /etc/shadow"]);
	fait(j2, "h_droits", "variante : vieil-outil supprimé, shadow en 600");
	// Un fstab sans noexec : refusé.
	var j3 = surBastion();
	jouer(j3, ["sudo setcap -r /usr/bin/python3.11", "echo 'tmpfs /tmp tmpfs defaults,nodev,nosuid 0 0' | sudo tee -a /etc/fstab", "sudo mount /tmp", "sudo sed -i 's/^UMASK.*/UMASK 077/' /etc/login.defs"]);
	pasFait(j3, "h_capacites", "/tmp sans noexec : refusé");
	// La capacité laissée : refusé.
	var j4 = surBastion();
	jouer(j4, TOURS.coffres.filter(function(c){ return c.indexOf("setcap") === -1; }));
	pasFait(j4, "h_capacites", "cap_setuid laissée sur python : refusé");
})();

/* ================================================================== */
/* 11. Le Cœur                                                         */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	["net.ipv4.ip_forward=0", "net.ipv4.conf.all.rp_filter=1", "net.ipv4.conf.all.accept_redirects=0", "kernel.dmesg_restrict=1", "kernel.kptr_restrict=2", "kernel.randomize_va_space=2", "fs.protected_symlinks=1"]
		.forEach(function(k){ t(jeu, "sudo sysctl -w " + k); });
	pasFait(jeu, "h_sysctl", "sysctl -w sans fichier (perdu au redémarrage) : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('coeur').lieu)") + "/Edsger"), "Grave-le", "Edsger signale le réglage non gravé");
	var j2 = surBastion();
	t(j2, TOURS.coeur[0]);
	pasFait(j2, "h_sysctl", "fichier écrit sans sysctl --system : refusé");
	t(j2, "sudo sysctl --system");
	fait(j2, "h_sysctl", "fichier gravé et appliqué");
	// Un fichier qui passe AVANT le vieux réglage de routeur : refusé.
	var j3 = surBastion();
	t(j3, TOURS.coeur[0].replace("99-bastion", "05-bastion"));
	t(j3, "sudo sysctl --system");
	pasFait(j3, "h_sysctl", "05-bastion.conf lu avant 10-routeur.conf : ip_forward revient à 1, refusé");
	// Les modules.
	t(j2, TOURS.coeur[2]);
	pasFait(j2, "h_modules", "règle posée, usb_storage encore chargé : refusé");
	t(j2, "sudo modprobe -r usb-storage");
	fait(j2, "h_modules", "usb_storage interdit et retiré");
	// Variante : install cramfs /bin/true au lieu de blacklist.
	var j4 = surBastion();
	jouer(j4, ["printf 'install usb-storage /bin/true\\ninstall cramfs /bin/true\\n' | sudo tee /etc/modprobe.d/bastion.conf", "sudo modprobe -r usb-storage"]);
	fait(j4, "h_modules", "variante : install /bin/true accepté");
})();

/* ================================================================== */
/* 12. La Poterne                                                      */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	jouer(jeu, TOURS.poterne.slice(0, 2));
	pasFait(jeu, "h_grub", "40_custom sans update-grub : refusé");
	t(jeu, "sudo update-grub");
	fait(jeu, "h_grub", "40_custom et grub.cfg régénéré");
	// Raccourci : écrire grub.cfg à la main.
	var j2 = surBastion();
	jouer(j2, ["echo 'set superusers=\"gardien\"' | sudo tee -a /boot/grub/grub.cfg",
		"printf 'X\\nX\\n' | grub-mkpasswd-pbkdf2 | awk '/grub.pbkdf2/ { print \"password_pbkdf2 gardien\", $NF }' | sudo tee -a /boot/grub/grub.cfg"]);
	pasFait(j2, "h_grub", "grub.cfg écrit à la main : refusé");
	contient(j2.taper("cat " + j2.lire("Shell.cheminAffiche(tourCh5('poterne').lieu)") + "/Joan"), "40_custom", "Joan signale grub.cfg écrit à la main");
	// Un mot de passe en clair : refusé.
	var j3 = surBastion();
	jouer(j3, ["printf 'set superusers=\"gardien\"\\npassword gardien secret\\n' | sudo tee -a /etc/grub.d/40_custom", "sudo update-grub"]);
	pasFait(j3, "h_grub", "mot de passe GRUB en clair : refusé");
	// Ctrl+Alt+Suppr : disable ne suffit pas.
	t(j3, "sudo systemctl disable ctrl-alt-del.target");
	pasFait(j3, "h_ctrlaltdel", "disable au lieu de mask : refusé");
	t(j3, "sudo systemctl mask ctrl-alt-del.target");
	fait(j3, "h_ctrlaltdel", "ctrl-alt-del.target masqué");
})();

/* ================================================================== */
/* 13. La Bannière : configtest avant de recharger                      */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	jouer(jeu, [TOURS.banniere[0], TOURS.banniere[1], "sudo systemctl restart apache2"]);
	pasFait(jeu, "h_apache_bavard", "restart sans apachectl configtest : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('banniere').lieu)") + "/Robert"), "configtest", "Robert signale le rechargement sans test");
	jouer(jeu, ["apachectl configtest", "sudo systemctl reload apache2"]);
	fait(jeu, "h_apache_bavard", "configtest puis reload");
	// Le fichier modifié mais pas rechargé : refusé.
	var j2 = surBastion();
	jouer(j2, [TOURS.banniere[0], TOURS.banniere[1], "apachectl configtest"]);
	pasFait(j2, "h_apache_bavard", "configuration sur le disque, pas rechargée : refusé");
	// Une configuration fausse : configtest la refuse, reload aussi.
	var j3 = surBastion();
	jouer(j3, ["sudo sed -i 's/^ServerTokens OS/ServerTokens Prod\\nServerTokns Full/' /etc/apache2/conf-available/security.conf"]);
	var s = t(j3, "apachectl configtest");
	verifier(/Syntax error|Invalid command|AH00526/.test(s), "configtest refuse une faute de frappe");
	t(j3, "sudo systemctl reload apache2");
	pasFait(j3, "h_apache_bavard", "reload d'une configuration fausse : refusé");
	vrai(j3, "serviceActif('bastion', 'apache2')", "Apache tourne toujours (reload refusé, ancienne configuration)");
	// TLS : TLS 1.2 minimum mais le vieux certificat : refusé.
	var j4 = surBastion();
	jouer(j4, ["sudo sed -i -e 's/SSLEngine on/SSLEngine on\\n\\tSSLProtocol -all +TLSv1.2 +TLSv1.3\\n\\tHeader always set Strict-Transport-Security \"max-age=63072000\"/' /etc/apache2/sites-available/default-ssl.conf",
		"sudo a2enmod headers", "apachectl configtest", "sudo systemctl restart apache2"]);
	pasFait(j4, "h_apache_tls", "certificat expiré : refusé");
	jouer(j4, ["sudo sed -i 's#/etc/ssl/certs/bastion.pem#/etc/ssl/certs/bastion-2026.pem#' /etc/apache2/sites-available/default-ssl.conf", "apachectl configtest", "sudo systemctl reload apache2"]);
	fait(j4, "h_apache_tls", "certificat neuf, TLS 1.2, HSTS");
	// Variante : reload (un rechargement gracieux relit aussi les modules).
	var j5 = surBastion();
	jouer(j5, [TOURS.banniere[2], "sudo a2enmod headers", "apachectl configtest", "sudo systemctl reload apache2"]);
	fait(j5, "h_apache_tls", "variante : configtest puis reload");
	// headers activé sans rechargement : HSTS absent, refusé.
	var j6 = surBastion();
	jouer(j6, [TOURS.banniere[2], "sudo a2enmod headers"]);
	pasFait(j6, "h_apache_tls", "configuration TLS écrite mais pas rechargée : refusé");
})();

/* ================================================================== */
/* 14. La Tour de Guet                                                 */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	jouer(jeu, ["sudo auditctl -w /etc/passwd -p wa -k comptes", "sudo auditctl -w /etc/shadow -p wa -k comptes", "sudo auditctl -w /etc/sudoers -p wa -k sudoers"]);
	pasFait(jeu, "h_auditd", "règles chargées mais pas permanentes : refusé");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(tourCh5('guet').lieu)") + "/Katherine"), "rules.d", "Katherine signale les règles non permanentes");
	var j2 = surBastion();
	t(j2, TOURS.guet[0]);
	pasFait(j2, "h_auditd", "règles écrites mais pas chargées : refusé");
	t(j2, "sudo augenrules --load");
	fait(j2, "h_auditd", "règles écrites et chargées");
	// Le registre : une bannière qui donne la version : refusé.
	jouer(j2, ["sudo sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf", "sudo systemctl restart systemd-journald", "sudo timedatectl set-ntp true",
		"echo 'Debian GNU/Linux 12 \\\\n \\\\l' | sudo tee /etc/issue /etc/issue.net"]);
	pasFait(j2, "h_journaux", "bannière avec le nom du système : refusé");
	t(j2, "echo 'Acces reserve. Connexions surveillees.' | sudo tee /etc/issue /etc/issue.net");
	fait(j2, "h_journaux", "journal persistant, heure juste, bannière légale");
	// journald.conf sans restart : refusé.
	var j3 = surBastion();
	jouer(j3, ["sudo sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf", "sudo timedatectl set-ntp true", "echo 'Acces reserve.' | sudo tee /etc/issue /etc/issue.net"]);
	pasFait(j3, "h_journaux", "journald.conf modifié sans restart : refusé");
})();

/* ================================================================== */
/* 15. Les Sceaux d'intégrité                                          */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	t(jeu, "sudo aide --init");
	pasFait(jeu, "h_aide", "base fabriquée mais pas mise en place : refusé");
	contient(t(jeu, "sudo aide --check"), "cannot open", "aide --check sans base : l'erreur du vrai AIDE");
	t(jeu, "sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db");
	pasFait(jeu, "h_aide", "base en place mais jamais vérifiée : refusé");
	t(jeu, "sudo aide --check");
	fait(jeu, "h_aide", "base en place et vérifiée");
	// Une fausse base : refusée.
	var j2 = surBastion();
	jouer(j2, ["echo 'base' | sudo tee /var/lib/aide/aide.db", "sudo aide --check"]);
	pasFait(j2, "h_aide", "un aide.db fabriqué à la main : refusé");
	// Les paquets.
	jouer(jeu, ["sudo apt update", "sudo apt upgrade"]);
	pasFait(jeu, "h_paquets", "à jour, sans unattended-upgrades : refusé");
	jouer(jeu, ["sudo apt install unattended-upgrades", TOURS.sceaux[6]]);
	pasFait(jeu, "h_paquets", "le binaire modifié n'est pas réinstallé : refusé");
	t(jeu, "sudo apt install --reinstall procps");
	fait(jeu, "h_paquets", "tout à jour, mises à jour automatiques, procps réinstallé");
	// 20auto-upgrades à 0 : refusé.
	var j3 = surBastion();
	jouer(j3, ["sudo apt update", "sudo apt upgrade", "sudo apt install unattended-upgrades", "printf 'APT::Periodic::Update-Package-Lists \"1\";\\nAPT::Periodic::Unattended-Upgrade \"0\";\\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades", "sudo apt install --reinstall procps"]);
	pasFait(j3, "h_paquets", "Unattended-Upgrade à 0 : refusé");
})();

/* ================================================================== */
/* 16. La Garde                                                        */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	t(jeu, TOURS.garde[0]);
	pasFait(jeu, "h_fail2ban", "jail.local écrit sans reload : refusé");
	t(jeu, "sudo fail2ban-client reload");
	fait(jeu, "h_fail2ban", "prison sshd chargée");
	var j2 = surBastion();
	jouer(j2, ["printf '[sshd]\\nenabled = true\\nmaxretry = 10\\nbantime = 1h\\n' | sudo tee /etc/fail2ban/jail.local", "sudo fail2ban-client reload"]);
	pasFait(j2, "h_fail2ban", "maxretry 10 : refusé");
	var j3 = surBastion();
	jouer(j3, ["printf '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 60\\n' | sudo tee /etc/fail2ban/jail.local", "sudo fail2ban-client reload"]);
	pasFait(j3, "h_fail2ban", "bantime d'une minute : refusé");
	// AppArmor.
	t(jeu, "sudo aa-complain /etc/apparmor.d/usr.sbin.apache2");
	pasFait(jeu, "h_apparmor", "Apache en complain : refusé");
	t(jeu, "sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2");
	fait(jeu, "h_apparmor", "Apache en enforce");
	// Vint, banni par la Garde dès qu'elle veille.
	vrai(jeu, "!!state.ch5.vintBanni", "la Garde bannit Vint (une fois)");
	vrai(jeu, "etatHote('bastion').f2b.bannis.sshd.indexOf(IP_VINT) > -1", "le poste de Vint est banni");
	t(jeu, "sudo fail2ban-client set sshd unbanip <vint>");
	fait(jeu, "s_h_f2b_vint", "Vint libéré");
})();

/* ================================================================== */
/* 17. L'horloge de la nuit                                            */
/* ================================================================== */
(function(){
	var jeu = neuf();
	egal(jeu.lire("heureCh5()"), "22:00", "il est 22 h à l'entrée");
	jeu.taper("ls");
	egal(jeu.lire("heureCh5()"), "22:03", "une commande avance l'horloge de 3 minutes");
	jeu.taper("pwd"); jeu.taper("ls");
	egal(jeu.lire("heureCh5()"), "22:09", "trois commandes : 9 minutes");
	contient(jeu.taper("cat Horloge"), "Il est 22:09", "cat Horloge donne l'heure");
	egal(jeu.lire("new Date(maintenantBastion()).getHours()"), 22, "maintenantBastion suit l'horloge (heure)");
	egal(jeu.lire("new Date(maintenantBastion()).getMinutes()"), 12, "maintenantBastion suit l'horloge (minutes)");
	egal(jeu.lire("minutesAvantAube()"), 468, "l'aube dans 468 minutes");
	jeu.lire("state.ch5.horloge = 118");
	var s = jeu.taper("ls");
	contient(s, "Grace : il est minuit", "la radio annonce minuit");
	jeu.lire("state.ch5.horloge = 178");
	contient(jeu.taper("ls"), "il est 1 h", "la radio annonce 1 h");
	contient(jeu.taper("rempart"), "Il est 01:", "rempart donne l'heure");
	// La date des journaux suit l'horloge de la nuit.
	t(jeu, "ssh-keygen"); t(jeu, "ssh-copy-id bastion"); t(jeu, "ssh bastion");
	jeu.lire("state.spells.logger = true");
	t(jeu, "logger -t veille 'ronde de nuit'");
	contient(t(jeu, "sudo journalctl -t veille"), " 01:", "le journal de bastion suit l'horloge de la nuit");
	contient(jeu.taper("timedatectl"), "", "timedatectl ne plante pas");
	// La sauvegarde garde l'horloge.
})();

/* ================================================================== */
/* 18. L'aube : avec des tours ouvertes, une trace par mur tombé          */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	fermer(jeu, ["herse", "sceau", "pontlevis", "portes", "remparts", "coffres", "coeur", "poterne", "banniere", "guet"]);
	// Les Sceaux et la Garde restent ouverts.
	jeu.lire("state.ch5.horloge = 478");
	var s = t(jeu, "ls");
	contient(s, "6 h. L'aube.", "l'aube sonne à 6 h");
	contient(s, "Ont cédé", "l'assaut nomme les murs tombés");
	vrai(jeu, "state.ch5.assaut", "l'assaut a eu lieu");
	egal(jeu.lire("tracesRestantesCh5().sort().join(',')"), "garde,sceaux", "une trace pour chacun des deux murs ouverts");
	var j = t(jeu, "sudo journalctl -t bastion-garde");
	contient(j, "trace laissée dans /usr/bin/id", "le journal nomme la trace des Sceaux");
	contient(j, "/etc/fail2ban/jail.d/nuee.local", "le journal nomme la trace de la Garde");
	contient(j, "le mur a tenu", "les murs fermés ont tenu");
	pasFait(jeu, "h_aube", "traces non réparées : refusé");
	verifier(jeu.lire("fichiersModifiesPaquet('bastion', 'coreutils').modifies.indexOf('/usr/bin/id') > -1"), "/usr/bin/id est vraiment modifié (debsums le verra)");
	contient(t(jeu, "sudo debsums -s"), "/usr/bin/id", "debsums montre le binaire touché");
	contient(t(jeu, "sudo cat /etc/fail2ban/jail.d/nuee.local"), "inerte", "la trace est inerte et le dit");
	// On répare.
	jouer(jeu, ["sudo apt install --reinstall coreutils", "sudo rm /etc/fail2ban/jail.d/nuee.local"]);
	egal(jeu.lire("tracesRestantesCh5().length"), 0, "plus aucune trace");
	fait(jeu, "h_aube", "traces réparées, journaux relus, intégrité vérifiée");
	// Puis on ferme les deux tours, la Pierre dépasse 85.
	fermer(jeu, ["sceaux", "garde"]);
	t(jeu, "sudo lynis audit system");
	fait(jeu, "h_pierre_finale", "la Pierre au-dessus de 85 après l'aube");
	verifier(jeu.lire("state.ch5.scoreFinal") > 85, "score final > 85 (" + jeu.lire("state.ch5.scoreFinal") + ")");
	pasFait(jeu, "s_h_avant_quatre", "tours fermées après l'aube : pas de défi de 4 h");

	// Toutes les tours ouvertes : douze traces, chacune réparable.
	var j2 = surBastion();
	j2.lire("state.ch5.horloge = 478");
	t(j2, "ls");
	egal(j2.lire("tracesRestantesCh5().length"), 12, "aucune tour fermée : douze traces");
	j2.lire("Object.keys(TRACES_CH5)").forEach(function(cle){
		var f = j2.lire("TRACES_CH5[" + JSON.stringify(cle) + "].fichier");
		verifier(typeof f === "string" && f.charAt(0) === "/", "la trace " + cle + " nomme un fichier (" + f + ")");
		var phrase = j2.lire("TRACES_CH5[" + JSON.stringify(cle) + "].phrase");
		verifier(!/exploit|payload|reverse shell|injection/i.test(phrase), "la trace " + cle + " reste narrative");
	});
	contient(t(j2, "sudo ausearch -k comptes"), "", "ausearch après l'aube ne plante pas");
	contient(t(j2, "sudo aureport"), "failed", "aureport compte les tentatives refusées");
})();

/* ================================================================== */
/* 19. L'aube quand tout est fermé ; la Pierre au-dessus de 85           */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	var depart = score(jeu);
	verifier(depart >= 35 && depart <= 41, "score de départ ~38 (" + depart + ")");
	fermer(jeu);
	ORDRE_TOURS.forEach(function(cle){ ETAPES[cle].forEach(function(id){ fait(jeu, id, "toutes les tours : " + id); }); });
	ORDRE_TOURS.forEach(function(cle){ vrai(jeu, "tourFermeeCh5(" + JSON.stringify(cle) + ")", "tour fermée : " + cle); });
	var apres = score(jeu);
	verifier(apres > 85, "douze tours fermées : la Pierre dépasse 85 (" + apres + ")");
	verifier(apres >= 90 && apres <= 95, "douze tours fermées : la Pierre vers 92 (" + apres + ")");
	fait(jeu, "s_h_avant_quatre", "les douze tours avant 4 h");
	verifier(jeu.lire("state.ch5.toutesFermees") < 360, "fermées avant 4 h (" + jeu.lire("heureCh5()") + ")");
	pasFait(jeu, "h_pierre_finale", "la Pierre finale attend l'aube");
	t(jeu, "sudo lynis audit system");
	pasFait(jeu, "h_pierre_finale", "inspection avant l'aube : ne compte pas comme finale");
	jeu.lire("state.ch5.horloge = 478");
	var s = t(jeu, "ls");
	contient(s, "Tous les murs ont tenu", "l'assaut échoue, et le jeu le dit");
	egal(jeu.lire("tracesRestantesCh5().length"), 0, "aucune trace");
	pasFait(jeu, "h_aube", "l'aube : il faut encore relire les journaux et l'intégrité");
	t(jeu, "sudo journalctl -t bastion-garde");
	pasFait(jeu, "h_aube", "journaux relus, intégrité pas encore vérifiée");
	t(jeu, "sudo dpkg -V");
	fait(jeu, "h_aube", "journaux relus, intégrité vérifiée");
	t(jeu, "sudo lynis audit system");
	fait(jeu, "h_pierre_finale", "la Pierre au-dessus de 85 après l'aube");
	vrai(jeu, "state.has('tour_herse') && state.has('tour_garde')", "badges des tours");
	// Le rapport.
	jouer(jeu, ["exit", "mkdir -p ~/bastion"]);
	t(jeu, "printf 'Constats : tout ouvert.\\nMesures : douze tours.\\nScore avant : 12\\nScore apres : 99\\nCe qui reste : peu.\\n' > ~/bastion/rapport.txt");
	var r = t(jeu, "cp ~/bastion/rapport.txt BoiteDeLaurent");
	contient(r, "Les scores ne sont pas ceux de la Pierre", "scores faux : Laurent demande les vrais chiffres");
	pasFait(jeu, "h_rapport", "rapport aux scores faux : refusé");
	var depart2 = jeu.lire("state.ch5.scoreDepart"), fin2 = jeu.lire("state.ch5.scoreFinal");
	t(jeu, "printf 'Constats : tout ouvert.\\nMesures : douze tours.\\nScore avant : " + depart2 + "\\nScore apres : " + fin2 + "\\nCe qui reste : peu.\\n' > ~/bastion/rapport.txt");
	t(jeu, "cp ~/bastion/rapport.txt BoiteDeLaurent");
	fait(jeu, "h_rapport", "rapport juste : contresigné");
	vrai(jeu, "state.has('victoireCh5')", "victoire du chapitre 5");
	fait(jeu, "s_h_sans_indice", "sans indice acheté : défi d'honneur");
	contient(t(jeu, "cat ~/CertificatBastion"), "CERTIFICAT DU BASTION", "le CertificatBastion est posé");
	var code = jeu.lire("state.codeDuCertificat6()");
	contient(t(jeu, "verifier " + code), "Code authentique", "verifier lit le code du certificat");
	contient(t(jeu, "verifier " + code), "le Bastion", "verifier nomme le chapitre 5");
	egal(jeu.lire("state.queteEnCours() === null || state.queteEnCours().id"), true, "chapitre fini en départ direct : plus d'étape en cours");
})();

/* ================================================================== */
/* 20. Le rapport trop tôt ; les défis d'honneur manqués                 */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	fermer(jeu, ["herse"]);
	jouer(jeu, ["exit", "mkdir -p ~/bastion"]);
	t(jeu, "printf 'Constats : ...\\nMesures : ...\\nScore avant : 38\\nScore apres : 50\\nCe qui reste : tout le reste.\\n' > ~/bastion/rapport.txt");
	var s = t(jeu, "cp ~/bastion/rapport.txt BoiteDeLaurent");
	contient(s, "je ne contresigne pas une inspection inachevée", "rapport trop tôt : Laurent le garde");
	contient(s, "l'aube n'est pas encore passée", "Laurent dit ce qui reste");
	pasFait(jeu, "h_rapport", "rapport trop tôt : refusé");
	// Un rapport sans rubriques : ignoré.
	t(jeu, "echo 'tout va bien' > ~/Cybersup/SalleServeurs/Bastion/BoiteDeLaurent/rapport.txt");
	pasFait(jeu, "h_rapport", "rapport sans rubriques : refusé");
	// Défi de 4 h manqué.
	var j2 = surBastion();
	fermer(j2, ORDRE_TOURS.slice(0, 11));
	j2.lire("state.ch5.horloge = 365");
	fermer(j2, ["garde"]);
	vrai(j2, "toursFermeesCh5().length === 12", "douze tours fermées");
	pasFait(j2, "s_h_avant_quatre", "fermées après 4 h : défi manqué");
	contient(j2.taper("rempart"), "manqué", "rempart : le défi de 4 h manqué");
	// Un indice acheté : le défi sans indice est perdu.
	var j3 = surBastion();
	var i = j3.taper("indice", "oui");
	verifier(j3.lire("state.malus6") > 0 || /indice/i.test(i), "indice : un palier acheté au Bastion (" + i.substring(0, 80) + ")");
	if (j3.lire("state.malus6") === 0) j3.taper("indice oui");
	verifier(j3.lire("state.malus6") > 0, "malus6 compte l'indice acheté");
	contient(j3.taper("rempart"), "indice acheté", "rempart : le défi sans indice est perdu");
})();

/* ================================================================== */
/* 21. Les badges du chapitre                                          */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var ids = jeu.lire("Object.keys(TROPHEES_CH5)");
	egal(ids.length, 16, "seize badges d'étape (12 tours, Pierre, Aube, Rapport, 4 h)");
	ids.concat(["platine_ch5"]).forEach(function(id){
		var sigle = jeu.lire("SIGLES_CH5[" + JSON.stringify(id) + "] && SIGLES_CH5[" + JSON.stringify(id) + "][0]");
		verifier(/^[A-Z0-9\/?]{2,4}$/.test(sigle || ""), "sigle de " + id + " : 2 à 4 caractères (A-Z, 0-9, /, ?) : " + sigle);
		var rang = jeu.lire("rangDuBadge(" + JSON.stringify(id) + ")");
		verifier(["bronze", "argent", "or", "platine"].indexOf(rang) > -1, "rang de " + id + " : " + rang);
		egal(rang, jeu.lire("SIGLES_CH5[" + JSON.stringify(id) + "][1]"), "rang de " + id + " conforme au sigle");
		verifier(typeof jeu.lire("COMPETENCES[" + JSON.stringify(id) + "]") === "string", "compétence nommée : " + id);
		verifier(fs.existsSync(path.join(IMG, "badge_" + id + ".gif")), "image du badge " + id);
	});
	ids.forEach(function(id){ verifier(jeu.lire("TROPHEES_CH5[" + JSON.stringify(id) + "][1]").length > 40, "leçon du badge " + id); });
	egal(jeu.lire("rangDuBadge('platine_ch5')"), "platine", "le platine du chapitre 5");
	var b = jeu.taper("badges bastion");
	contient(b, "DURCISSEMENT LINUX : LE BASTION", "badges bastion : la section");
	contient(b, "0 sur 16, plus le platine", "badges bastion : le compte");
	ids.forEach(function(id){ contient(b, jeu.lire("COMPETENCES[" + JSON.stringify(id) + "]"), "badges bastion liste " + id); });
	contient(jeu.taper("man badges"), "badges bastion", "man badges cite badges bastion");
	// Le décompte du parcours de l'épreuve finale ne bouge pas.
	egal(jeu.lire("BADGES_DU_PARCOURS.length"), 42, "BADGES_DU_PARCOURS reste à 42");
	// Une tour fermée rapporte son badge, qui reste acquis.
	var j2 = surBastion();
	fermer(j2, ["coeur"]);
	vrai(j2, "badgeGagne('tour_coeur')", "badge de la tour du Cœur");
	contient(j2.taper("badges bastion"), "✦ Noyau et modules", "badges bastion : le badge gagné");
	j2.lire("ecrireFichierHote('bastion', '/etc/modprobe.d/bastion.conf', '')");
	vrai(j2, "badgeGagne('tour_coeur')", "le badge reste acquis même si le mur cède plus tard");
})();

/* ================================================================== */
/* 22. Le quiz, les scènes, le chapitre dans les autres écrans            */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var guideSrc = fs.readFileSync(path.join(JS, "Guide.js"), "utf8");
	var bloc = guideSrc.substring(guideSrc.indexOf("\n\t6: [\n"), guideSrc.indexOf("\n\t]\n};", guideSrc.indexOf("\n\t6: [\n")));
	var quiz = bloc.split("\n").filter(function(l){ return /^\t\t\[/.test(l); }).map(function(l){ return JSON.parse(l.trim().replace(/,$/, "")); });
	verifier(quiz && quiz.length >= 6, "au moins six questions au quiz du chapitre 5 (" + (quiz || []).length + ")");
	(quiz || []).forEach(function(qq, i){
		verifier(typeof qq[0] === "string" && qq[0].length > 10, "quiz " + i + " : une question");
		verifier(Array.isArray(qq[1]) && qq[1].length === 4, "quiz " + i + " : quatre réponses");
		verifier(qq[2] >= 0 && qq[2] < 4, "quiz " + i + " : la bonne réponse existe");
		verifier(typeof qq[3] === "string" && qq[3].length > 10, "quiz " + i + " : une explication");
		verifier((qq[0] + qq[1].join("") + qq[3]).indexOf("—") === -1, "quiz " + i + " : pas de tiret cadratin");
	});
	var guide = guideSrc;
	contient(guide, 'h_entree: { image: "loc_bastion.gif", titre: "Chapitre 5 · Le Bastion", chapitre: 5', "scène d'entrée du Bastion");
	contient(guide, '"4": 5, "5": 6, "6": 7, "7": 8, "8": 9 }[args[0]]', "quiz 5 : le chapitre interne 6");
	contient(guide, "INDICES_CH5[id]", "les pistes du Bastion dans detailsDeQuete");
	contient(guide, 'chapitre === 6 && typeof TROPHEES_CH5', "le récapitulatif de fin compte les badges du Bastion");
	contient(guide, '["Terminus", "La panne", "La Crypte", "L\'Académie", "Le Bastion", "Lumen", "Port-Aube", "Le Grand Port"]', "la carte des huit chapitres");
	var game = fs.readFileSync(path.join(JS, "Game.js"), "utf8");
	contient(game, "item_lettre_inspection.gif", "la cinquième enveloppe");
	contient(game, "Lettre de l'Inspection", "la cinquième enveloppe : son titre");
	contient(game, "Chapitre 5 directement (durcissement Linux)", "la cinquième enveloppe : son texte");
	contient(game, 'id === "h_rapport" ? 6', "l'écran de victoire du chapitre 5");
	contient(game, "cat ~/CertificatBastion", "l'écran de victoire nomme le certificat");
	egal(jeu.lire("nomRpg('lynis', 6)"), "la Pierre d'Inspection", "nomRpg du chapitre 6");
	jeu.lire("ORDRE_DES_SORTS_6").forEach(function(s){ verifier(!!jeu.lire("MANUEL[" + JSON.stringify(s) + "] && MANUEL[" + JSON.stringify(s) + "].page.length > 40"), "man " + s); });
	jeu.lire("ORDRE_DES_SORTS_6").forEach(function(s){ verifier(!jeu.lire("MANUEL[" + JSON.stringify(s) + "].horsBareme"), s + " au barème"); });
	jeu.lire("QUETES_CH5").forEach(function(qq){
		var ind = jeu.lire("INDICES_CH5[" + JSON.stringify(qq.id) + "]");
		if (qq.id !== "h_entree") verifier(Array.isArray(ind) && ind.length === 2, "deux paliers d'indice pour " + qq.id);
	});
	// Les examens et le parcours ne comptent pas le chapitre 5.
	var ex = fs.readFileSync(path.join(JS, "Examen.js"), "utf8");
	verifier(ex.indexOf("ORDRE_DES_SORTS_6") === -1, "l'épreuve finale n'ajoute pas les sorts du chapitre 5");
})();

/* ================================================================== */
/* 23. Quelques défis, sur l'état réel ; raccourcis refusés               */
/* ================================================================== */
(function(){
	var jeu = surBastion();
	// Une règle sudo « étroite » qui est en fait NOPASSWD: ALL : refusée.
	jeu.lire("transformation = function(t){ return { texte: 'sauvegarde ALL=(ALL) NOPASSWD: ALL\\n', commandes: { i: true } }; }");
	t(jeu, "sudo visudo -f /etc/sudoers.d/sauvegarde2");
	pasFait(jeu, "s_h_sudoers_drop", "une règle NOPASSWD: ALL ne compte pas pour la règle étroite");
	t(jeu, "sudo visudo -f /etc/sudoers.d/sauvegarde");
	fait(jeu, "s_h_sudoers_drop", "une règle étroite, écrite avec visudo -f");
	// curl https depuis bastion lui-même : ne compte pas pour le défi « depuis le hall ».
	jouer(jeu, TOURS.remparts.slice(0, 6));
	t(jeu, "curl -kI https://bastion/");
	pasFait(jeu, "s_h_https_dehors", "curl depuis bastion : ne compte pas");
	jouer(jeu, ["exit", "curl -kI https://bastion/"]);
	fait(jeu, "s_h_https_dehors", "curl depuis le hall");
	t(jeu, "ssh bastion");
	fait(jeu, "s_h_ssh_dehors", "ssh depuis le hall, pare-feu levé");
	// lastlog sans verrouiller : pas encore.
	t(jeu, "lastlog");
	pasFait(jeu, "s_h_dormant", "le dormant repéré mais pas verrouillé");
	t(jeu, "sudo usermod -L stagiaire");
	fait(jeu, "s_h_dormant", "variante : usermod -L");
	// Le vidage mémoire : une ligne en commentaire ne compte pas.
	t(jeu, "echo '#* hard core 0' | sudo tee -a /etc/security/limits.conf");
	pasFait(jeu, "s_h_core", "ligne en commentaire : refusé");
	t(jeu, "echo '* hard core 0' | sudo tee /etc/security/limits.d/core.conf");
	fait(jeu, "s_h_core", "variante : limits.d");
	// X11 écrit mais pas rechargé : refusé.
	t(jeu, "echo 'X11Forwarding no' | sudo tee /etc/ssh/sshd_config.d/40-x11.conf");
	pasFait(jeu, "s_h_x11", "X11Forwarding écrit sans reload : refusé");
	jouer(jeu, ["sudo sshd -t", "sudo systemctl reload ssh"]);
	fait(jeu, "s_h_x11", "X11Forwarding rechargé");
	// TMOUT sans readonly : refusé.
	t(jeu, "echo 'TMOUT=900' | sudo tee /etc/profile.d/tmout.sh");
	pasFait(jeu, "s_h_tmout", "TMOUT modifiable : refusé");
	t(jeu, "printf 'TMOUT=900\\nreadonly TMOUT\\n' | sudo tee /etc/profile.d/tmout.sh");
	fait(jeu, "s_h_tmout", "TMOUT en lecture seule");
})();

/* ================================================================== */
/* 24. La sauvegarde au milieu du chapitre                              */
/* ================================================================== */
(function(){
	var stock = {};
	var jeu = pret(neuf(stock));
	fermer(jeu, ["herse", "sceau", "pontlevis", "portes", "remparts", "coffres"]);
	t(jeu, "ssh bastion");
	var cles = ["heureCh5()", "Shell.hote()", "current_room.path()", "Object.keys(state.quests).filter(function(q){ return /^h_/.test(q); }).sort().join(',')", "scoreLynis('bastion').score",
		"texteHote('bastion', '/etc/shadow')", "fichierHote('bastion', '/etc/shadow').mode", "JSON.stringify(pfCh5())", "state.xp6", "etatUnite('bastion', 'telnet.socket').actif",
		"configSshEffective('bastion').permitrootlogin", "state.ch5.scoreDepart", "dossierHote('bastion', '/tmp').mode", "JSON.stringify(state.ch5.murs)", "state.has('tour_herse')",
		"texteHote('bastion', '/etc/fstab')", "JSON.stringify(montages('bastion'))", "etatPaquet('bastion', 'telnetd') ? etatPaquet('bastion', 'telnetd').etat : null", "expositionUnite('bastion', 'apache2').exposition"];
	var avant = cles.map(function(c){ return jeu.lire(c); });
	jeu.lire("state.save()");
	var repris = monde.nouveauMonde(stock);
	cles.forEach(function(c, i){ egal(repris.lire(c), avant[i], "rechargement : " + c); });
	vrai(repris, "state.has('ch5Ouvert') && state.has('ch5Direct')", "rechargement : le chapitre reste ouvert");
	egal(repris.lire("state.chapitreEnCours()"), 6, "rechargement : chapitre en cours 6");
	// On finit après le rechargement.
	fermer(repris, ["coeur", "poterne", "banniere", "guet", "sceaux", "garde"]);
	egal(repris.lire("toursFermeesCh5().length"), 12, "après rechargement : les douze tours se ferment");
	verifier(score(repris) > 85, "après rechargement : la Pierre dépasse 85");
	// Une vieille sauvegarde, faite avant le chapitre 5, se charge sans rien casser.
	var vieux = {};
	var j2 = monde.nouveauMonde(vieux);
	j2.taper("ls");
	j2.lire("state.save()");
	var data = JSON.parse(vieux["terminus-cybersup-actif"] ? vieux[Object.keys(vieux).filter(function(k){ return /partie|sauvegarde|actif/.test(k) && vieux[k].charAt(0) === "{"; })[0]] || "{}" : "{}");
	var j3 = monde.nouveauMonde(vieux);
	faux(j3, "state.has('ch5Ouvert')", "vieille sauvegarde : le Bastion reste fermé");
	egal(j3.lire("state.xp6"), 0, "vieille sauvegarde : xp6 à 0");
	verifier(typeof data === "object", "vieille sauvegarde lisible");
})();

/* ================================================================== */
/* 25. La partie complète : la solution documentée, à 20 sur 20          */
/* ================================================================== */
(function(){
	var doc = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");
	var debut = doc.indexOf("## Chapitre 5 : le Bastion"), fin = doc.indexOf("## Chapitre 6 : Lumen");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 5 avant celle du chapitre 6");
	var section = doc.substring(debut, fin);
	for (var n = 33; n <= 48; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 5) : pas de tiret cadratin");
	var commandes = [], dans = false;
	section.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	verifier(commandes.length > 150, "la solution du chapitre 5 compte " + commandes.length + " commandes");
	verifier(commandes.every(function(c){ return !/^\$ |^# /.test(c); }), "solution rejouable : ni $ ni # en tête de ligne");
	var jeu = neuf();
	t(jeu, "ssh-keygen");
	commandes.forEach(function(c){
		if (c.indexOf("cd ~/Cybersup/SalleServeurs/Academie/Bastion") === 0) c = "cd ~/Cybersup/SalleServeurs/Bastion";
		t(jeu, c);
	});
	egal(jeu.lire("QUETES_CH5.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : toutes les étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH5.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : tous les défis");
	jeu.lire("QUETES_SECONDAIRES_CH5").forEach(function(qq){ fait(jeu, qq.id, "partie complète : défi " + qq.id); });
	egal(jeu.lire("state.xp6"), 7500, "partie complète : 7500 XP");
	egal(jeu.lire("state.noteTexte(6)"), "20 / 20", "partie complète : 20 sur 20");
	vrai(jeu, "state.has('platine_ch5')", "partie complète : le platine");
	vrai(jeu, "state.has('victoireCh5')", "partie complète : la victoire");
	egal(jeu.lire("state.ch5.scoreDepart"), 38, "partie complète : score de départ 38");
	verifier(jeu.lire("state.ch5.scoreFinal") > 85, "partie complète : score final > 85 (" + jeu.lire("state.ch5.scoreFinal") + ")");
	verifier(jeu.lire("state.ch5.toutesFermees") < 360, "partie complète : les douze tours avant 4 h");
	egal(jeu.lire("state.malus6"), 0, "partie complète : aucun indice acheté");
	contient(jeu.taper("rempart"), "Tours fermées : 12 sur 12", "rempart : douze tours fermées");
	contient(jeu.taper("rempart"), "BADGES : 16 sur 16", "rempart : seize badges");
	contient(jeu.taper("badges bastion"), "16 sur 16", "badges bastion : seize sur seize");
	contient(jeu.taper("xp"), "20 / 20", "xp : 20 sur 20");
	var cert = jeu.taper("cat ~/CertificatBastion");
	contient(cert, "20", "le certificat porte la note");
	contient(cert, "CHAPITRE 5", "le certificat nomme le chapitre 5");
	["Fernando", "Butler", "Tatu", "Jean", "Vint", "Evelyn", "Edsger", "Joan", "Robert", "Katherine", "Ralph", "Adele"].forEach(function(m, i){
		var tx = jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(TOURS_CH5[" + i + "].lieu)") + "/" + m);
		egal((tx.match(/\[x\]/g) || []).length, 6, m + " coche ses six défis à la fin");
		absent(tx, "Ta mission", m + " ne redonne plus la mission une fois la tour fermée");
	});
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(HallBastion)") + "/Frances"), "", "Frances à la fin");
	egal(jeu.lire("state.queteEnCours()"), null, "départ direct terminé : queteEnCours vaut null");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
