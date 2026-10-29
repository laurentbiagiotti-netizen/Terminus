/**
 * Le chapitre 6 (Lumen, la cité qui s'éteint, numéro 7 dans le code) : le départ direct et l'ouverture après le
 * Bastion, l'horloge, le Phare (lanterne), les fausses validations refusées (chaque étape repose sur l'état réel
 * de la machine lumen, pas sur la frappe d'une commande), la Longue Nuit et ses avaries, le rapport, l'identifiant
 * du joueur sur lumen, la sauvegarde en cours de chapitre, les quêtes annexes (et leur règle : aucune notion déjà
 * enseignée), les images, puis la solution documentée jouée de bout en bout, à 20 sur 20.
 *
 * Lancer : node tests/chapitre6.js        (-v pour tout voir)
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

/* Une partie neuve, partie directement à Lumen (la sixième enveloppe ou « chapitre 6 »). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 6", "oui");
	return jeu;
}
function t(jeu, c){ return jeu.jouerSolution(c); }
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
/* Prêt à travailler : Laurent et la mission lus, le Phare consulté, les sorts du chapitre connus, sur lumen. */
function pret(jeu){
	jeu.lire("ORDRE_DES_SORTS_7.forEach(function(s){ state.spells[s] = true; })");
	jouer(jeu, ["cat Laurent", "cat Mission", "lanterne", "ssh lumen"]);
	return jeu;
}
function surLumen(){ return pret(neuf()); }
function lumiere(jeu){ return jeu.lire("scoreLanterneCh6()"); }

/* Les commandes de chaque quartier (celles de la solution), pour rallumer un quartier d'un coup. */
var QUARTIERS = {
	docks: ["df -h", "sudo du -sh /var/* | sort -h", "sudo rm /var/backups/lumen-2024.tar.gz", "sudo lsof +L1", "sudo systemctl restart lumen-web"],
	archives: ["df -i", "sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete",
		"echo 'd /var/lib/lumen/sessions 1733 root root 1h' | sudo tee /etc/tmpfiles.d/lumen-sessions.conf", "sudo systemd-tmpfiles --clean"],
	gazette: ["printf '/var/log/lumen/*.log {\\n\\tdaily\\n\\trotate 7\\n\\tcompress\\n\\tmissingok\\n\\tnotifempty\\n\\tmaxsize 100M\\n}\\n' | sudo tee /etc/logrotate.d/lumen",
		"sudo logrotate -d /etc/logrotate.d/lumen", "sudo logrotate -f /etc/logrotate.d/lumen", "journalctl --disk-usage", "sudo journalctl --vacuum-size=200M",
		"sudo sed -i 's/^#SystemMaxUse=/SystemMaxUse=200M/' /etc/systemd/journald.conf", "sudo systemctl restart systemd-journald"],
	forges: ["free -h", "sudo dmesg -T | grep -i oom", "sudo mkdir -p /etc/systemd/system/cache-rapports.service.d",
		"printf '[Service]\\nMemoryMax=1G\\n' | sudo tee /etc/systemd/system/cache-rapports.service.d/memoire.conf", "sudo systemctl daemon-reload", "sudo systemctl restart cache-rapports",
		"sudo fallocate -l 2G /swapfile", "sudo chmod 600 /swapfile", "sudo mkswap /swapfile", "sudo swapon /swapfile", "echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab",
		"echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/99-swap.conf", "sudo sysctl --system"]
};

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, les images                  */
/* ================================================================== */
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var iManuel = index.indexOf("ManuelMachines.js"), iC6 = index.indexOf("Chapitre6.js"), iM = index.indexOf("/Machines.js?"),
		iQA = index.indexOf("QuetesAnnexes.js"), iH = index.indexOf("Habitants.js"), iIntro = index.indexOf("Intro.js");
	verifier(iManuel > -1 && iC6 > iManuel && iM > iC6 && iQA > iM && iH > iQA && iIntro > iH, "index.html : Chapitre6.js, Machines.js, QuetesAnnexes.js puis Habitants.js, après ManuelMachines.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf('"Chapitre6.js", "Machines.js", "QuetesAnnexes.js", "Habitants.js"') > -1, "tests/monde.js charge les quatre fichiers du chapitre 6");
	["Chapitre6.js", "Machines.js", "QuetesAnnexes.js", "Habitants.js", "SortsMachines.js", "SortsSystemd.js", "SortsExploitation.js", "SortsProcessus.js", "ManuelMachines.js"].forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		verifier(chaines.every(function(x){ return x.indexOf(" & ") === -1 || /2>&1|&&|>&|\| |« & »|nohup \S+[^"]* &/.test(x); }), f + " : pas d'esperluette en prose (hors syntaxe du shell)");
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
	});
	var images = ["loc_lumen.gif", "loc_lumen_nuit.gif", "loc_lumen_rallumee.gif", "loc_coeur_lumen.gif", "item_lanterne_lumen.gif"];
	["docks", "archives", "gazette", "forges", "horloge", "citernes", "porte", "ateliers", "memoires", "observatoire", "puits", "thermes", "marche", "labyrinthe", "limites", "guetteur"].forEach(function(c){
		images.push("loc_q_" + c + ".gif"); images.push("badge_quartier_" + c + ".gif");
	});
	["seymour", "kathleen", "ida", "gordon", "niklaus", "sophie", "lynn", "mary", "betty", "donald", "dorothy", "ruth", "charles", "john", "kay", "klara",
	 "logeuse", "allumeur", "veilleuse", "horloger", "imprimeur", "postiere"].forEach(function(m){ images.push("item_" + m + ".gif"); });
	["m6_lanterne", "m6_nuit", "m6_rapport", "s_m6_avant_midi", "platine_ch6", "ami_ch6"].forEach(function(b){ images.push("badge_" + b + ".gif"); });
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, im)), "image " + im + " présente"); });
	egal(images.length, 65, "65 images du chapitre");
	var jeu = monde.nouveauMonde({});
	var noms = jeu.lire("[HallLumen, CoeurDeLumen, BoiteDeLumen].concat(QUARTIERS_CH6.map(function(q){ return q.lieu; })).map(function(r){ return r.room_pic; }).concat([LaurentLumen, MissionLumen, PhareDeLumen, RadioLumen, HorlogeLumen, CertificatLumen, BestiaireLumen].concat(Object.keys(GARDIENS_LUMEN).map(function(k){ return GARDIENS_LUMEN[k].item; })).map(function(i){ return i.picturename; })).join('|')").split("|");
	noms.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, n.replace(/^.*\//, ""))), "image du monde présente : " + n); });
	// Le décor n'apparaît pas avant l'ouverture.
	faux(jeu, "state.has('ch6Ouvert')", "partie neuve : Lumen est fermée");
	var jb = monde.nouveauMonde({});
	jb.taper("chapitre 5", "oui");
	var s = jb.taper("ssh lumen");
	verifier(/Could not resolve/.test(s) && /n'apparaît/.test(s), "ssh lumen avant l'ouverture (au Bastion) : refusé");
	contient(jeu.taper("chapitre"), "6. ", "chapitre : la ligne 6");
	contient(jeu.taper("chapitre 11"), "chapitres 1 à 10", "chapitre 11 : il n'existe pas");
})();

/* ================================================================== */
/* 2. Le départ direct, puis l'ouverture après le Bastion               */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch6Ouvert')", "départ direct : Lumen s'ouvre");
	vrai(jeu, "state.has('ch6Direct')", "départ direct : drapeau ch6Direct");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	egal(jeu.lire("current_room.room_name"), "Lumen", "départ direct : on arrive sur la place de Lumen");
	egal(jeu.lire("state.chapitreEnCours()"), 7, "chapitreEnCours vaut 7");
	egal(jeu.lire("numeroAffiche(7)"), 6, "le numéro affiché est 6");
	fait(jeu, "m6_entree", "m6_entree (descente à Lumen)");
	egal(jeu.lire("state.queteEnCours().id"), "m6_lanterne", "l'étape en cours est m6_lanterne");
	egal(jeu.lire("Shell.cheminAffiche(HallLumen)"), "~/Cybersup/SalleServeurs/Lumen", "départ direct : la place est au fond de la SalleServeurs");
	egal(jeu.lire("heureCh6()"), "06:00", "il est 6 h à l'arrivée");
	var avant = jeu.lire("tousLesSorts().filter(function(s){ return [1, 2, 3, 5, 6].indexOf(chapitreDuSort(s)) > -1; })");
	verifier(avant.length > 150, "socle des chapitres 1 à 5 : " + avant.length + " sorts");
	avant.forEach(function(s){ vrai(jeu, "state.knows(" + JSON.stringify(s) + ")", "socle acquis au départ direct : " + s); });
	jeu.lire("ORDRE_DES_SORTS_7").forEach(function(s){
		faux(jeu, "state.knows(" + JSON.stringify(s) + ")", s + " s'apprend auprès d'un gardien de Lumen");
		egal(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ")"), 7, "chapitreDuSort(" + s + ")");
	});
	egal(jeu.lire("ORDRE_DES_SORTS_7.length"), 47, "47 sorts au chapitre 6");
	egal(jeu.lire("QUETES_CH6.length"), 37, "37 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH6.length"), 82, "82 défis (80 des quartiers, 2 d'honneur)");
	egal(jeu.lire("QUARTIERS_CH6.length"), 16, "seize quartiers");
	egal(jeu.lire("QUARTIERS_CH6.map(function(q){ return q.etapes.length; }).join('')"), "2222222222222222", "deux étapes par quartier");
	egal(jeu.lire("QUETES_CH6.filter(function(q){ return !/^m6_/.test(q.id); }).length"), 0, "les étapes s'appellent m6_*");
	egal(jeu.lire("QUETES_SECONDAIRES_CH6.filter(function(q){ return !/^s_m6_/.test(q.id); }).length"), 0, "les défis s'appellent s_m6_*");
	egal(jeu.lire("chapitreDeQuete('s_m6_ncdu')"), 7, "chapitreDeQuete d'un défi");
	egal(jeu.lire("chapitreDeQuete('a6_chat')"), 7, "chapitreDeQuete d'une annexe");
	egal(jeu.lire("state.xpMax7()"), 8795, "xpMax7");
	contient(jeu.taper("chapitre 6"), "déjà ouvert", "chapitre 6 déjà ouvert : message clair");
	contient(jeu.taper("help 6"), "Tes sorts du chapitre 6", "help 6");
	contient(jeu.taper("xp"), "CHAPITRE 6 : LUMEN", "xp : le tableau du chapitre 6");
	contient(jeu.taper("quetes"), "Laurent", "quetes : l'étape de Laurent");
	contient(jeu.taper("cat Radio"), "Grace", "la radio de Grace à Lumen");
	contient(jeu.taper("cat Horloge"), "06:", "l'horloge de la place");
	// Le départ direct depuis une partie engagée est refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("cd"); jeu2.taper("ls");
	jeu2.lire("state.complete('m_marche')");
	var r = jeu2.taper("chapitre 6", "oui");
	verifier(/déjà commencé/.test(r) && jeu2.lire("state.has('ch6Ouvert')") === false, "une partie engagée ne part pas directement à Lumen");
	// L'ouverture normale : après le rapport du Bastion (h_rapport).
	var jeu3 = monde.nouveauMonde({});
	jeu3.taper("chapitre 5", "oui");
	faux(jeu3, "state.has('ch6Ouvert')", "Bastion en cours : Lumen reste fermée");
	jeu3.lire("state.complete('h_rapport'); verifierMonde()");
	vrai(jeu3, "state.has('ch6Ouvert')", "après h_rapport : Lumen s'ouvre");
	faux(jeu3, "state.has('ch6Direct')", "après h_rapport : pas un départ direct");
	vrai(jeu3, "HallBastion.children.indexOf(HallLumen) > -1", "après h_rapport : Lumen est sous le Bastion");
	jeu3.taper("cd " + jeu3.lire("Shell.cheminAffiche(HallBastion)"));
	contient(jeu3.taper("cd Lumen"), "Lumen", "cd Lumen depuis le hall du Bastion");
	fait(jeu3, "m6_entree", "m6_entree après le Bastion");
	egal(jeu3.lire("state.chapitreEnCours()"), 7, "après l'entrée, chapitreEnCours vaut 7");
})();

/* ================================================================== */
/* 3. Le Phare (lanterne), Laurent, la mission, l'horloge               */
/* ================================================================== */
(function(){
	var jeu = neuf();
	pasFait(jeu, "m6_lanterne", "rien lu : pas de m6_lanterne");
	var l = jeu.taper("lanterne");
	contient(l, "LE PHARE DE LUMEN", "lanterne : le titre");
	contient(l, "pas Linux", "lanterne : une commande du jeu, dit-elle");
	jeu.lire("QUARTIERS_CH6").forEach(function(qq){ contient(l, qq.nom, "lanterne : le quartier " + qq.nom); });
	contient(l, "25 / 100", "lanterne : la lumière de départ (25)");
	pasFait(jeu, "m6_lanterne", "lanterne sans Laurent ni mission : pas de m6_lanterne");
	jeu.taper("cat Laurent");
	pasFait(jeu, "m6_lanterne", "Laurent sans la mission : pas encore");
	jeu.taper("cat Mission");
	fait(jeu, "m6_lanterne", "Laurent, la mission, et le Phare déjà consulté");
	egal(jeu.lire("state.ch6.scoreDepart"), 25, "lumière de départ retenue : 25");
	jeu.taper("cd Docks");
	contient(jeu.taper("lanterne"), "◀ toi", "lanterne montre où l'on est");
	// L'horloge : deux minutes par commande.
	var h0 = jeu.lire("state.ch6.horloge");
	jeu.taper("ls"); jeu.taper("ls"); jeu.taper("ls");
	egal(jeu.lire("state.ch6.horloge") - h0, 6, "trois commandes : six minutes");
	contient(jeu.taper("man lanterne"), "lanterne", "man lanterne existe");
	// Un gardien vivant : il apprend ses sorts et révèle ses défis.
	var g = jeu.taper("cat Seymour");
	contient(g, "Seymour", "Seymour se présente");
	vrai(jeu, "state.knows('ncdu')", "Seymour apprend ncdu");
	verifier((g.match(/\[ \]/g) || []).length === 5, "Seymour montre cinq défis à faire");
})();

/* ================================================================== */
/* 4. Les fausses validations : l'état réel de lumen, pas la frappe     */
/* ================================================================== */
/* Les Docks : une commande écrite dans un echo ne compte pas ; supprimer sans avoir constaté ne suffit pas encore. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["echo sudo rm /var/backups/lumen-2024.tar.gz", "echo 'sudo rm /var/backups/lumen-2024.tar.gz' > /tmp/fait.txt", "df -h", "sudo du -sh /var/* | sort -h"]);
	pasFait(jeu, "m6_disque", "echo de la commande : l'archive est toujours là");
	vrai(jeu, "!!F6('/var/backups/lumen-2024.tar.gz')", "l'archive est toujours sur lumen");
	t(jeu, "sudo rm /var/backups/lumen-2024.tar.gz");
	fait(jeu, "m6_disque", "l'archive vraiment retirée");
	pasFait(jeu, "m6_fantome", "le fichier fantôme n'est pas encore libéré");
	t(jeu, "sudo systemctl restart lumen-web");
	pasFait(jeu, "m6_fantome", "relancer sans avoir regardé (lsof +L1) : pas encore");
	t(jeu, "sudo lsof +L1");
	fait(jeu, "m6_fantome", "lsof +L1 puis l'état : validé");
})();
/* Les Archives : supprimer toutes les sessions, y compris celles des habitants connectés, est refusé. */
(function(){
	var jeu = surLumen();
	jouer(jeu, QUARTIERS.docks);
	jouer(jeu, ["df -i", "sudo find /var/lib/lumen/sessions -type f -delete"]);
	pasFait(jeu, "m6_inodes", "toutes les sessions effacées (habitants déconnectés) : refusé");
	verifier(jeu.lire("sessionsRecentesCh6()") < 20, "les sessions récentes ont bien disparu");
	// Une règle tmpfiles fausse (pas d'âge) n'est pas acceptée.
	jouer(jeu, ["echo 'd /var/lib/lumen/sessions 1733 root root' | sudo tee /etc/tmpfiles.d/lumen-sessions.conf", "sudo systemd-tmpfiles --clean"]);
	pasFait(jeu, "m6_tmpfiles", "règle tmpfiles sans âge : refusée");
	jouer(jeu, ["echo 'd /var/lib/lumen/sessions 1733 root root 1h' | sudo tee /etc/tmpfiles.d/lumen-sessions.conf"]);
	pasFait(jeu, "m6_tmpfiles", "règle écrite mais jamais éprouvée (--clean) : pas encore");
	t(jeu, "sudo systemd-tmpfiles --clean");
	fait(jeu, "m6_tmpfiles", "règle juste, puis --clean");
})();
/* La Gazette : une rotation sans compression, ou un vidage sans borne durable, ne comptent pas. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["printf '/var/log/lumen/*.log {\\n\\tdaily\\n\\trotate 7\\n}\\n' | sudo tee /etc/logrotate.d/lumen", "sudo logrotate -d /etc/logrotate.d/lumen", "sudo logrotate -f /etc/logrotate.d/lumen"]);
	pasFait(jeu, "m6_logrotate", "rotation sans compress ni maxsize : refusée");
	jouer(jeu, ["journalctl --disk-usage", "sudo journalctl --vacuum-size=200M"]);
	pasFait(jeu, "m6_journal", "vacuum sans SystemMaxUse : le journal regrossira, refusé");
	jouer(jeu, ["sudo sed -i 's/^#SystemMaxUse=/SystemMaxUse=200M/' /etc/systemd/journald.conf"]);
	pasFait(jeu, "m6_journal", "SystemMaxUse écrit mais journald pas relancé : pas encore");
	t(jeu, "sudo systemctl restart systemd-journald");
	fait(jeu, "m6_journal", "borne écrite et journald relancé");
})();
/* Les Forges : relancer le cache sans limite, ou un fichier d'échange lisible par tous, ne suffisent pas. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["free -h", "sudo dmesg -T | grep -i oom", "sudo systemctl restart cache-rapports"]);
	pasFait(jeu, "m6_memoire", "redémarrer sans MemoryMax : refusé");
	jouer(jeu, ["sudo fallocate -l 2G /swapfile", "sudo mkswap /swapfile", "sudo swapon /swapfile", "echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab",
		"echo 'vm.swappiness = 10' | sudo tee /etc/sysctl.d/99-swap.conf", "sudo sysctl --system"]);
	pasFait(jeu, "m6_swap", "fichier d'échange sans chmod 600 : refusé");
	jouer(jeu, ["sudo chmod 600 /swapfile"]);
	fait(jeu, "m6_swap", "chmod 600 : le fichier d'échange est accepté");
})();
/* La Tour de l'Horloge : tuer l'export sans sa boucle, il revient ; tuer un spectre ne sert à rien. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["sudo renice +19 -p $(pgrep -x export-registre)", "sudo killall export-registre", "ls", "ls"]);
	pasFait(jeu, "m6_cpu", "l'export tué sans sa boucle : elle le relance");
	vrai(jeu, "!!procCh6('export-registre')", "l'export est revenu");
	jouer(jeu, ["sudo kill -9 $(pgrep -x ronde-de-nuit | head -1)", "ps -o ppid= -p $(pgrep -x ronde-de-nuit | head -1)"]);
	pasFait(jeu, "m6_zombie", "kill -9 sur un spectre : il reste un spectre");
	egal(jeu.lire("spectresCh6().length"), 3, "les trois spectres sont toujours là");
	jouer(jeu, ["sudo kill $(pgrep -f export-boucle)", "sudo killall export-registre"]);
	fait(jeu, "m6_cpu", "la boucle puis l'export : l'engrenage s'arrête");
	t(jeu, "sudo systemctl restart lumen-veilleur");
	fait(jeu, "m6_zombie", "le parent relancé : les spectres partent");
})();
/* Les Citernes : agrandir le volume sans le système de fichiers ne donne pas de place. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["sudo vgs", "sudo lvextend -L +20G /dev/vg_lumen/lv_donnees"]);
	pasFait(jeu, "m6_lvm", "lvextend sans resize2fs : df ne voit rien");
	t(jeu, "sudo resize2fs /dev/mapper/vg_lumen-lv_donnees");
	fait(jeu, "m6_lvm", "lvextend puis resize2fs");
	jouer(jeu, ["sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees", "sudo lvs"]);
	pasFait(jeu, "m6_snapshot", "instantané laissé en place : pas encore");
	t(jeu, "sudo lvremove -y /dev/vg_lumen/avant_maj");
	fait(jeu, "m6_snapshot", "instantané créé, vu, retiré");
})();
/* Les Ateliers : l'allumeur relancé à la main avec nohup n'est pas un service. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["sudo pkill -x allumeur", "nohup /opt/lumen/allumeur --port 8080 &"]);
	pasFait(jeu, "m6_unite", "nohup n'est pas une unité systemd");
	jouer(jeu, ["printf '[Unit]\\nDescription=L allumeur\\n\\n[Service]\\nExecStart=/opt/lumen/allumeur --port 8080\\n' | sudo tee /etc/systemd/system/allumeur.service",
		"sudo systemctl daemon-reload", "sudo systemctl start allumeur"]);
	pasFait(jeu, "m6_unite", "unité sans User, Restart ni WantedBy, ni enable : refusée");
})();
/* L'Observatoire : une latence recopiée à la main dans le carnet ne compte pas. */
(function(){
	var jeu = surLumen();
	jouer(jeu, QUARTIERS.docks);
	t(jeu, "curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/ >> ~/carnet.txt");
	pasFait(jeu, "m6_latence", "les Docks seuls : l'export ralentit encore la page");
	t(jeu, "exit");
	contient(jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(QUARTIERS_CH6[9].lieu)") + "/Donald"), "engrenage fou", "Donald explique ce qui ralentit encore");
	jouer(jeu, ["ssh lumen", "sudo kill $(pgrep -f export-boucle)", "sudo killall export-registre"]);
	jouer(jeu, ["echo 0.123456 >> ~/carnet.txt", "cat ~/carnet.txt"]);
	pasFait(jeu, "m6_latence", "une mesure inventée dans le carnet : refusée");
	t(jeu, "curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/");
	pasFait(jeu, "m6_latence", "une vraie mesure, mais pas notée dans le carnet : pas encore");
	t(jeu, "curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/ >> ~/carnet.txt");
	fait(jeu, "m6_latence", "la vraie mesure notée dans le carnet");
})();
/* Les Thermes : e2fsck sur un système monté est refusé ; le Labyrinthe : reset-failed seul ne répare rien. */
(function(){
	var jeu = surLumen();
	var s = jouer(jeu, ["mount | grep archives", "sudo e2fsck -f -y /dev/md0"]);
	verifier(/is mounted|monté|mounted/i.test(s), "e2fsck sur un système monté : refusé par l'outil");
	pasFait(jeu, "m6_fsck", "e2fsck sur un système monté : pas de réparation");
	jouer(jeu, ["systemctl --failed", "sudo journalctl -b -p err", "sudo systemctl reset-failed"]);
	pasFait(jeu, "m6_failed", "reset-failed seul : la gazette n'est pas réparée");
})();
/* Le Guetteur : la recopie lancée dans la session ssh meurt à la déconnexion. */
(function(){
	var jeu = surLumen();
	jouer(jeu, ["/usr/local/bin/recopier-archives &", "exit", "ssh lumen"]);
	for (var i = 0; i < 20; i++) t(jeu, "uptime");
	pasFait(jeu, "m6_tmux", "recopie lancée sans tmux ni nohup : morte avec la session");
	contient(jeu.taper("tmux ls"), "no server", "aucune session tmux");
})();

/* ================================================================== */
/* 5. La Longue Nuit : avaries sur les quartiers éteints                */
/* ================================================================== */
(function(){
	var jeu = surLumen();
	jouer(jeu, QUARTIERS.docks);
	fait(jeu, "m6_disque"); fait(jeu, "m6_fantome");
	vrai(jeu, "quartierAllumeCh6('docks')", "les Docks sont rallumés");
	faux(jeu, "!!state.ch6.nuit", "pas encore la Nuit");
	jeu.lire("state.ch6.horloge = NUIT_CH6 - 2");
	t(jeu, "uptime");
	vrai(jeu, "!!state.ch6.nuit", "14 h : la Longue Nuit tombe");
	faux(jeu, "!!state.ch6.nuitEnAvance", "à l'heure, pas en avance");
	faux(jeu, "!!state.ch6.avaries.docks", "les Docks rallumés n'ont pas d'avarie");
	egal(jeu.lire("Object.keys(state.ch6.avaries).length"), 15, "quinze avaries sur les quinze quartiers éteints");
	faux(jeu, "!!F6('/var/tmp/core.lumen-web.3141')", "pas de vidage mémoire aux Docks rallumés");
	vrai(jeu, "!!procCh6('rapport-de-nuit')", "les Forges éteintes : un rapport de nuit dévore la mémoire");
	vrai(jeu, "T6('/etc/fstab').indexOf('/srv/ancien') > -1", "la Porte éteinte : une ligne fausse dans fstab");
	vrai(jeu, "!!F6('/var/log/lumen/connexions.log')", "la surprise : le journal des connexions explose");
	vrai(jeu, "avariesRestantesCh6().indexOf('surprise') > -1", "la surprise compte parmi les avaries");
	contient(jeu.taper("sudo journalctl -t lumen-phare"), "Longue Nuit", "le journal de lumen dit la Nuit");
	var l = jeu.taper("lanterne");
	contient(l, "Longue Nuit est tombée", "lanterne : la Nuit est tombée");
	verifier(lumiere(jeu) < 50, "une Nuit sur une cité éteinte : la lumière reste basse (" + lumiere(jeu) + ")");
	pasFait(jeu, "m6_nuit", "avaries non réparées : pas de m6_nuit");
	// Le rapport déposé trop tôt : Laurent le garde et dit ce qui reste.
	jouer(jeu, ["exit", "mkdir -p ~/lumen", "echo 'Avaries, causes, reparations, mesures, ce qui reste : sdc.' > ~/lumen/rapport.txt"]);
	var r = t(jeu, "cp ~/lumen/rapport.txt BoiteDeLaurent");
	contient(r, "inachevée", "rapport trop tôt : Laurent ne contresigne pas");
	pasFait(jeu, "m6_rapport", "rapport trop tôt : refusé");
})();
/* La Nuit en avance : les seize quartiers rallumés la font tomber aussitôt (partie complète, plus bas). */

/* ================================================================== */
/* 6. L'identifiant du joueur sur lumen, la sauvegarde en cours de route */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.lire("adopterPrenom('Ada')");
	jeu.taper("chapitre 6", "oui");
	jeu.taper("ssh lumen");
	verifier(jeu.taper("grep -c '^ada:' /etc/passwd").trim() === "1", "lumen : le compte du joueur porte son identifiant (ada)");
	verifier(jeu.taper("grep -c apprenti /etc/passwd /etc/group").indexOf(":1") === -1, "lumen : plus aucune trace de l'identifiant provisoire");
	contient(jeu.taper("ls /home"), "ada", "lumen : /home/ada");
	jeu.taper("cd");
	egal(jeu.taper("pwd").trim(), "/home/ada", "cd sur lumen : /home/ada");
	contient(jeu.taper("whoami"), "ada", "whoami sur lumen");
})();
(function(){
	var st = {};
	var jeu = neuf(st);
	pret(jeu);
	jouer(jeu, QUARTIERS.docks);
	var heure = jeu.lire("state.ch6.horloge");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	vrai(jeu2, "state.has('ch6Ouvert')", "rechargement : Lumen toujours ouverte");
	fait(jeu2, "m6_disque", "rechargement : les Docks gardent leurs étapes");
	fait(jeu2, "m6_fantome", "rechargement : le fantôme reste réglé");
	egal(jeu2.lire("state.ch6.horloge"), heure, "rechargement : l'horloge reprend où elle était");
	faux(jeu2, "!!F6('/var/backups/lumen-2024.tar.gz')", "rechargement : l'archive retirée ne revient pas");
	jeu2.taper("ssh lumen");
	contient(jeu2.taper("df -h /var"), "/var", "rechargement : lumen répond");
})();

/* ================================================================== */
/* 7. Les quêtes annexes : mécanisme, ordre, hors note, nouveautés      */
/* ================================================================== */
(function(){
	var jeu = surLumen();
	t(jeu, "exit");
	contient(jeu.taper("quetes annexes"), "QUÊTES ANNEXES", "quetes annexes : le tableau");
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.chapitre === 7; }).length"), 6, "six quêtes annexes à Lumen");
	jouer(jeu, ["cd Ateliers", "cat Logeuse"]);
	vrai(jeu, "state.annexes.a6_habitants.proposee === true", "lire la Logeuse ouvre son annexe");
	var xp7 = jeu.lire("state.xp7");
	t(jeu, "ssh lumen");
	// Les étapes se font dans l'ordre : quota avant setquota ne compte pas.
	t(jeu, "quota -u ninon");
	egal(jeu.lire("JSON.stringify((state.annexes.a6_habitants || {}).etapes || [])").indexOf("true"), -1, "quota avant setquota : aucune étape cochée");
	jouer(jeu, ["sudo setquota -u ninon 900M 1G 0 0 /home", "sudo setquota -u basile 900M 1G 0 0 /home", "quota -u ninon", "sudo repquota -a",
		"sudo chgrp habitants /home/commun", "sudo chmod g+s /home/commun", "touch /home/commun/bienvenue.txt", "ls -l /home/commun", "newgrp habitants", "id"]);
	fait(jeu, "a6_habitants", "la Logeuse : quotas et dossier partagé");
	egal(jeu.lire("state.xp7"), xp7, "une annexe ne change pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") > 0, "une annexe donne un bonus à part");
	t(jeu, "exit");
	vrai(jeu, "Home.getChildFromName('Souvenirs') !== -1", "un souvenir dans ~/Souvenirs");
	vrai(jeu, "Home.getChildFromName('Souvenirs').horsBareme === true", "~/Souvenirs est hors barème");
	// La règle des annexes : aucune notion déjà enseignée aux chapitres 1 à 6.
	var deja = jeu.lire("tousLesSorts().filter(function(s){ return !SORTS_DES_ANNEXES[s]; })");
	Object.keys(jeu.lire("SORTS_DES_ANNEXES")).forEach(function(s){ verifier(deja.indexOf(s) === -1, "annexe : " + s + " n'est enseigné dans aucun chapitre"); });
	egal(jeu.lire("Object.keys(SORTS_DES_ANNEXES).filter(function(s){ return ORDRE_DES_SORTS_7.indexOf(s) > -1; }).length"), 0, "les sorts des annexes ne sont pas dans le barème du chapitre");
})();

/* ================================================================== */
/* 8. La partie complète : la solution documentée, à 20 sur 20           */
/* ================================================================== */
(function(){
	var doc = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");
	var debut = doc.indexOf("## Chapitre 6 : Lumen"), fin = doc.indexOf("## Chapitre 7 : Port-Aube");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 6 avant celle du chapitre 7");
	var section = doc.substring(debut, fin);
	for (var n = 49; n <= 61; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 6) : pas de tiret cadratin");
	var commandes = [], dans = false;
	section.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	verifier(commandes.length > 300, "la solution du chapitre 6 compte " + commandes.length + " commandes");
	verifier(commandes.every(function(c){ return !/^\$ |^# /.test(c); }), "solution rejouable : ni $ ni # en tête de ligne");
	var jeu = neuf();
	var midiVu = false, apres = 0, sorties = [];
	commandes.forEach(function(c){
		if (c.indexOf("cd ~/Cybersup/SalleServeurs/Academie/Bastion/Lumen") === 0) c = "cd ~/Cybersup/SalleServeurs/Lumen";
		sorties.push(t(jeu, c));
		if (!midiVu && jeu.lire("QUETES_CH6.filter(function(q){ return /^m6_/.test(q.id) && q.id !== 'm6_nuit' && q.id !== 'm6_lanterne_finale' && q.id !== 'm6_rapport' && !state.quests[q.id]; }).length") === 0){
			midiVu = true; apres = jeu.lire("state.nbCommandes");
		}
	});
	verifier(midiVu, "partie complète : les 34 premières étapes rallumées");
	egal(jeu.lire("QUETES_CH6.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : toutes les étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH6.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : tous les défis");
	egal(jeu.lire("state.xp7"), 8795, "partie complète : 8795 XP");
	egal(jeu.lire("state.noteTexte(7)"), "20 / 20", "partie complète : 20 sur 20");
	egal(jeu.lire("state.malus7"), 0, "partie complète : aucun indice acheté");
	vrai(jeu, "state.has('platine_ch6')", "partie complète : le platine");
	vrai(jeu, "state.has('victoireCh6')", "partie complète : la victoire");
	fait(jeu, "s_m6_avant_midi", "partie complète : les seize quartiers avant midi");
	verifier(jeu.lire("state.ch6.tousAllumes") < 360, "partie complète : tout rallumé avant midi (" + jeu.lire("heureCh6()") + " à la fin)");
	vrai(jeu, "!!state.ch6.nuitEnAvance", "partie complète : la Nuit tombe en avance, tout étant rallumé");
	egal(jeu.lire("Object.keys(state.ch6.avaries).length"), 0, "partie complète : aucune avarie de quartier, seulement la surprise");
	egal(jeu.lire("state.ch6.scoreDepart"), 25, "partie complète : lumière de départ 25");
	verifier(jeu.lire("state.ch6.scoreFinal") > 90, "partie complète : lumière finale > 90 (" + jeu.lire("state.ch6.scoreFinal") + ")");
	verifier(sorties.some(function(s){ return /Quartier rallumé/.test(s); }), "partie complète : les quartiers rallumés sont annoncés");
	verifier(sorties.some(function(s){ return /Longue Nuit tombe en avance/.test(s); }), "partie complète : la Nuit en avance est annoncée");
	verifier(sorties.some(function(s){ return /Lumen brille/.test(s); }), "partie complète : Laurent contresigne");
	// Les annexes : toutes finies, le badge Ami de Lumen.
	jeu.lire("QUETES_ANNEXES").filter(function(a){ return a.chapitre === 7; }).forEach(function(a){ fait(jeu, a.id, "partie complète : annexe " + a.id); });
	vrai(jeu, "state.has('ami_ch6')", "partie complète : Ami de Lumen");
	egal(jeu.lire("state.xp7"), 8795, "les annexes ne changent pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") >= 300, "les annexes donnent leur bonus (" + jeu.lire("state.xpAnnexes") + ")");
	egal(jeu.lire("Home.getChildFromName('Souvenirs').items.length"), 6, "six souvenirs");
	var lt = jeu.taper("lanterne");
	contient(lt, "100 / 100", "lanterne : la cité brille");
	contient(jeu.taper("xp"), "20 / 20", "xp : 20 sur 20");
	contient(jeu.taper("badges lumen"), "Ami de Lumen", "badges lumen : Ami de Lumen");
	var cert = jeu.taper("cat ~/CertificatLumen");
	contient(cert, "20", "le certificat porte la note");
	contient(cert, "CHAPITRE 6", "le certificat nomme le chapitre 6");
	var code = jeu.lire("state.codeDuCertificat7()");
	verifier(typeof code === "string" && code.length > 8, "le certificat a un code de vérification");
	contient(jeu.taper("verifier " + code), "Lumen", "verifier CODE : le certificat de Lumen");
	jeu.lire("QUARTIERS_CH6").forEach(function(qq, i){
		var tx = jeu.taper("cat " + jeu.lire("Shell.cheminAffiche(QUARTIERS_CH6[" + i + "].lieu)") + "/" + qq.gardien);
		egal((tx.match(/\[x\]/g) || []).length, 5, qq.gardien + " coche ses cinq défis à la fin");
	});
	egal(jeu.lire("state.queteEnCours()"), null, "départ direct terminé : queteEnCours vaut null");
})();

/* Le quiz du chapitre (Guide.js, navigateur) : dix questions, et « quiz 6 » mène au chapitre interne 7. */
(function(){
	var guide = fs.readFileSync(path.join(JS, "Guide.js"), "utf8");
	var bloc = guide.substring(guide.indexOf("var QUIZ = {"), guide.indexOf("var banque"));
	var i = bloc.search(/\n\t7: \[/);
	verifier(i > -1, "Guide.js : le quiz du chapitre 6 (QUIZ[7])");
	egal((bloc.substring(i + 3).split(/\n\t\d+: \[/)[0].match(/\n\t\t\["/g) || []).length, 10, "dix questions au quiz du chapitre 6");
	verifier(/"6"\s*:\s*7/.test(guide), "Guide.js : quiz 6 mène au chapitre interne 7");
	verifier(guide.indexOf("m6_entree") > -1 && guide.indexOf("loc_lumen_nuit.gif") > -1, "Guide.js : la scène et la cinématique de Lumen");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
