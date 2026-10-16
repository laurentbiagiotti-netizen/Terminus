/**
 * Test de robustesse : bombarde l'interpréteur de lignes aléatoires, sensées ou
 * absurdes, et vérifie qu'aucune ne le fait planter. Une erreur du jeu doit
 * toujours être un message pour le joueur, jamais une exception JavaScript.
 *
 *    node tests/robustesse.js [nombre de lignes] [graine]
 */
var fs = require("fs");
var path = require("path");
var nouveauMonde = require("./monde.js").nouveauMonde;

// Un monde en mode épreuve finale (la Forteresse), pour la bombarder aussi.
function mondeExamen(){
	var j = nouveauMonde({ "terminus-cybersup-profil": JSON.stringify({ graine: 4242, prenom: "Ada", chapitre: 1, modeExamen: true }) });
	j.lire("state.nom = 'Ada'; demarrerExamen(); Shell.narration = [];");
	return j;
}

var combien = parseInt(process.argv[2], 10) || 20000;
var graine = parseInt(process.argv[3], 10) || 12345;
function hasard(){ graine = (graine * 48271) % 2147483647; return graine / 2147483647; }
function choix(liste){ return liste[Math.floor(hasard() * liste.length)]; }

// Les commandes de la solution, pour disposer d'un monde où tout est débloqué.
var solution = [];
var dansBloc = false;
fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(ligne){
	if (ligne.indexOf("```") === 0){ dansBloc = !dansBloc; return; }
	if (dansBloc && ligne.trim() !== "") solution.push(ligne);
});

var sorts = ["ls", "cd", "pwd", "less", "help", "man", "clear", "exit", "mv", "cat", "head", "tail", "wc", "diff", "history",
	"chmod", "rm", "mkdir", "rmdir", "touch", "cp", "bash", "date", "grep", "echo", "export", "env", "alias", "unalias", "ln",
	"sort", "uniq", "cut", "ps", "kill", "top", "whoami", "id", "chown", "find", "tree", "df", "du", "tar", "crontab",
	"hostname", "ping", "ssh", "apt", "cowsay", "sudo", "quetes", "xp", "sl", "vim", "./remonter.sh", "ll", "", "!!",
	"sha256sum", "base64", "nano", "ss", "ssh-keygen", "indice", "chapitre", "succes", "chrono", "son", "bulletin", "./.porte",
	"strings", "file", "xxd", "md5sum", "sha1sum", "stat", "chattr", "lsattr", "gzip", "gunzip", "zcat", "sed", "awk", "tr", "rev", "tee",
	"which", "uname", "dmesg", "journalctl", "last", "who", "lsof", "pgrep", "pkill", "systemctl", "userdel", "usermod", "groups", "visudo",
	"ip", "traceroute", "dig", "nmap", "nc", "curl", "ufw", "scp", "ssh-copy-id", "gpg", "vi", "logout",
	"ethtool", "hostnamectl", "dhclient", "nmcli", "netplan", "reboot", "wget", "host", "nslookup", "resolvectl", "iptables", "tcpdump",
	"mtr", "openssl", "timedatectl", "telnet", "carte", "examen", "kamikaze", "verifier",
	// Les sorts du chapitre 4 (SortsArcanes.js).
	"jq", "xargs", "paste", "join", "comm", "column", "tac", "shuf", "split", "patch", "rsync", "at", "atq", "atrm",
	"nl", "fold", "read", "printf", "seq", "basename", "dirname", "expr", "sleep", "grimoire", "badges", "quiz",
	// Les sorts du Bastion (SortsBastion.js).
	"faillock", "pwck", "grpck", "su", "useradd", "umask", "sshd", "systemd-analyze", "apt-get", "dpkg", "etckeeper", "chage", "lastlog", "passwd", "netstat", "debsums",
	// Les sorts de la Tour de Guet (SortsGuet.js) et le chapitre 5 (le Bastion) : son plan, ses tours, ses pare-feu.
	"apachectl", "apache2ctl", "a2enmod", "a2dismod", "a2enconf", "a2disconf", "a2ensite", "a2dissite", "getcap", "setcap", "mount", "findmnt", "lsmod", "modprobe",
	"grub-mkpasswd-pbkdf2", "update-grub", "grub-mkconfig", "cryptsetup", "auditctl", "augenrules", "ausearch", "aureport", "logger", "rsyslogd", "logrotate",
	"aa-status", "aa-enforce", "aa-complain", "aa-disable", "apparmor_parser", "lynis", "aide", "nft", "sysctl", "fail2ban-client", "rkhunter", "rempart"];
var options = ["-a", "-l", "-la", "-r", "-rf", "-n", "-n 3", "-9", "-s", "-c", "-i", "-v", "-u", "-d:", "-f1", "-f", "-x", "-tf", "-xf", "-cf",
	"--help", "-", "--", "-z", "-c", "-d", "-tlnp", "-perm -4000", "-perm /u=s", "-perm", "-user root", "2>/dev/null", "2>err", "2>>err", "2>&1", "u-s", "4755", "+t", "-1", "-0", "-99999", "+x", "-x", "755", "000", "u+rwx", "o-r", "a=", "999", "-name", "-type", "d", "f", "-L", "-u sorcier",
	"-exec cat {} \\;", "-exec rm {} +", "-exec", "{}", "\\;", "-delete", "-o", "!", "\\(", "\\)", "-size +1k", "-size -1", "-empty", "-maxdepth 1", "-mindepth 2", "-mmin -5",
	"-I {}", "-t", "-0", "-d ,", "-n 2", "-L 1", "-12", "-3", "-t -s :", "-e", "-r", "-c", "--arg x y", "--argjson n 3", "-S", "-R", "-p1", "-p0", "--dry-run", "-av", "-avn",
	"--delete", "--exclude '*.tmp'", "-U 1", "-sd ,", "-a 1", "-v 2", "-o 1.1,2.2", "-x", "-f", "-l", "-c 3",
	"now + 5 minutes", "teatime", "noon", "tomorrow", "14:00", "list-timers", "logrotate.timer", "status logrotate.timer", "disable --now apt-daily.timer", "-d tomorrow", "-d '3 days ago'",
	"--user root", "--reset", "-tulpn", "-loptn", "-tulnp4", "security", "security sshd", "mask ctrl-alt-del.target", "unmask ctrl-alt-del.target", "edit sshd", "cat sshd",
	"daemon-reload", "is-enabled sshd", "list-unit-files --state=enabled", "list-units --type=service", "list --upgradable", "purge telnet", "install --reinstall cowsay",
	"-V", "-S /usr/bin/ls", "-l", "-ll", "-l -U root", "-c", "-f /etc/sudoers.d/x", "commit 'x'", "vcs log", "vcs status", "-T", "-t", "-M 90", "-E 2026-12-31", "-b 90",
	"-s /usr/sbin/nologin", "-e 2026-12-31", "-m -G sudo", "027", "-S", "u=rwx,g=,o=", "TMOUT=0", "-t ed25519 -N ''", "-t rsa -b 512",
	"audit system", "--init", "--check", "--update", "default deny incoming", "allow 22/tcp", "enable", "status verbose", "status numbered", "delete 1", "logging on", "limit 22/tcp",
	"list ruleset", "flush ruleset", "-f /etc/nftables.conf", "-w net.ipv4.ip_forward=0", "--system", "-r usb-storage", "-n -v usb-storage", "-w /etc/passwd -p wa -k comptes",
	"--load", "-k comptes", "configtest", "-M", "reload", "status sshd", "set sshd unbanip 10.0.92.119", "--check --sk", "-r /", "-r /usr/bin/python3.11", "/tmp", "status sda3_crypt"];
var noms = [".", "..", "~", "/", "*", "?", ".*", "~/", "../..", "./.", "//", "a/b/c", "~/Village", "Marche", "Boite", "Cage", "Portail",
	"Rocher", "Stele", "Certificat", ".Phylactere", "SorcierNoir", "Laurent", "Diplome", "LivreDOr", "Registre", "remonter.sh",
	"Mannequin*", "rouage*", "x", "X", "Truc", ".cache", "nouveau", "copie", "Chaumiere", "Planche", "Rouage", "EpiDeMais", "TrollMoche",
	"~/Cybersup", "~/Cybersup/BureauDeLaurent", "/opt/gardiens/vigile", "/quarantaine", "~/rapport", "/etc/resolv.conf", "/root/.ssh/authorized_keys", "examen", "kamikaze", "isc-dhcp-server", "telnet", "nginx", "BureauDeLaurent/Agenda", "sauvegarde-lundi.tar", "archive.tar", "terminus", "cybersup",
	"citadelle", "apprenti", "root", "sorcier", "66", "404", "1", "1337", "0", "-5", "abc", "é", "$USER", "$PWD", "${HOME}", "$", "$$",
	"A=b", "ll='ls -l'", "z=", "=x", "\"deux mots\"", "'apostrophe'", "\"", "'", "\\", "[", "(", "a(b", "*.log", "motdepasse=", "vrai_nom",
	"cowsay", "tree", "install", "update", "list", "<b>", "'.'", "'.[] | .nom'", "'.a.b[0]'", "'map(.x) | add'", "'{a: .b}'", "'.[] as $x | $x'",
	"'reduce .[] as $x (0; . + $x)'", "'def f: 1; f'", "'@csv'", "'\\(.)'", "'.[1:'", "'..'", "'paths'", "'.a |= . + 1'", "'error(\"x\")'", "'[range(1e9)]'", "'repeat(1)'",
	"'limit(3; repeat(1))'", "'\"\\(1,2)\"'", "'{\"a\":1}'", "'def f: f; f'", "'[.[] | select(. > 1)]'", "'.[] |= empty'", "'label $f | 1, break $f'",
	"c.diff", "a.diff", "dst/", "src/", "'*/5 * * * * echo'", "'61 * * * * x'", "Crypte", "bin", "Caveau", "Racine", ".ssh", ".ssh/authorized_keys", "SHA256SUMS",
	"gardien", ".porte", "BoiteDeDepot", "coffre", "~/.ssh/id_ed25519", "~/.ssh/id_ed25519.pub", "Corbeau", "CertificatCyber", "/dev/null", "2", "oui",
	"labo", "web", "mail", "dns", "parefeu", "badgeuse", "imprimante", "poste-47", "/etc/passwd", "/var/log", "/tmp", "/", "/etc/bind/ecole.zone",
	"10.0.92.0/24", "10.0.92.60", "http://web/", "http://web/robots.txt", "sauvegarde:/preuves/", "web:/tmp", "auth.log.2.gz", "notes.gpg", "maj.php",
	"'s/a/b/g'", "'/a/,/b/p'", "'2,3p'", "'$3 == 0'", "'{ print $1, $3 }'", "'A-Za-z' 'N-ZA-Mn-za-m'", "-F:", "-i :6666", "-x", "+short", "-I", "-o",
	"status", "stop", "disable --now", "list-units", "maj-auto", "sshd", "enable", "deny from", "delete 1",
	"eth0", "eth1", "link", "addr", "route", "neigh", "set", "up", "down", "add", "del", "flush", "default", "via", "dev", "get", "10.0.93.20/24", "10.0.93.20",
	"10.0.93.254", "10.0.92.53", "10.0.92.35", "10.0.59.0/24", "10.0.92.248", "intranet", "routeur", "poste-b", "lille", "lille-gw", "https://intranet/",
	"http://intranet/planning.txt", "intranet:443", "FORWARD", "INPUT", "-D FORWARD 1", "-L FORWARD", "-A FORWARD -p tcp --dport 25 -j DROP", "port 23", "port 53",
	"s_client -connect intranet:443", "x509 -noout -dates -in /etc/ssl/intranet.pem", "set-ntp true", "set-ntp", "apply", "try", "set ethernets.eth0.dhcp4=true",
	"MX", "@10.0.92.53", "@routeur", "nginx", "apache2", "telnet.socket", "isc-dhcp-server", "--failed", "-xeu nginx", "/etc/resolv.conf", "/etc/hosts",
	"/etc/netplan/01-poste.yaml", "~/Cybersup/BatimentB/Poste", "BatimentB", "Poste", "Radia", "--report", "-br", "-tulnp", "dns eth0 10.0.92.53", "query intranet", "25", "23", "-L", "-U", "corbeau", "maintenance", "-u sshd", "-d", "-c", "-k", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	// L'Académie des Arcanes (chapitre 4) : ses lieux, ses maîtres, ses registres, le serveur archives.
	"~/Cybersup/SalleServeurs/Academie", "Academie", "Runes", "Divination", "Transmutation", "Grimoires", "Alchimie", "Chronomancie", "Archives", "Invocation",
	"Reserve", "Parchemins", "BoiteDeLaurent", "Henry", "Alfred", "Lee", "Stephen", "Doug", "Paul", "Andrew", "Brian", "Frances", "Radio", "Horloge", "Bestiaire",
	"registre-des-sorts.log", "potions.txt", "recettes.txt", "bibliotheque.json", "formule.txt", "amelioration.diff", "salut.sh", "liste-des-eleves.txt",
	"archives", "/srv/archives", "/srv/sauvegarde-hors-ligne/", "/srv/depots", "/var/log/acces.log", "/var/log/proxy.log", "/srv/edr/alertes.json",
	"/etc/archives.conf", "/usr/local/bin/depot.sh", "nuee-regen", "maj-nocturne.timer", "~/academie", "~/academie/nettoyage.sh", "~/correctif.diff", "-u nuee", "4h45", "04:45"];
var liaisons = [" | ", " > ", " >> ", " ; ", " && ", " |", "| ", " || ", ">", " & "];

function ligneAleatoire(){
	var morceaux = [];
	var n = 1 + Math.floor(hasard() * 3);
	for (var i = 0; i < n; i++){
		var cmd = [choix(sorts)];
		if (hasard() < 0.15) cmd.unshift("sudo");
		var arguments_ = Math.floor(hasard() * 4);
		for (var k = 0; k < arguments_; k++) cmd.push(hasard() < 0.35 ? choix(options) : choix(noms));
		morceaux.push(cmd.join(" "));
		if (i < n - 1) morceaux.push(choix(liaisons));
	}
	return morceaux.join("");
}

var plantages = [];
var jeu = null;
var lignesJouees = 0;
for (var i = 0; i < combien; i++){
	// On repart régulièrement d'un monde neuf, tantôt vierge, tantôt entièrement débloqué.
	if (i % 400 === 0){
		var mode = (i / 400) % 5;
		jeu = mode === 2 ? mondeExamen() : nouveauMonde({});
		// Le départ direct au chapitre 4 : l'Académie, la Nuée et sa bombe, bombardées elles aussi.
		if (mode === 3) jeu.taper("chapitre 4", "oui");
		// Le départ direct au chapitre 5 : le Bastion, son horloge et sa machine, sur laquelle on se connecte.
		if (mode === 4){ jeu.taper("chapitre 5", "oui"); jeu.jouerSolution("ssh-keygen"); jeu.jouerSolution("ssh-copy-id bastion"); jeu.jouerSolution("ssh bastion"); }
		if (mode === 1){
			var jusque = Math.floor(hasard() * solution.length);
			for (var s = 0; s <= jusque; s++){
				jeu.jouerSolution(solution[s]);
			}
		}
		// Les sorts avancés (SortsArcanes.js) : on les accorde pour les bombarder aussi, sans attendre les maîtres.
		if (mode !== 0) jeu.lire("SORTS_ARCANES.concat(SORTS_BASTION, SORTS_GUET).forEach(function(s){ state.spells[s] = true; })");
	}
	var ligne = ligneAleatoire();
	try {
		jeu.taper(ligne, [jeu.lire("MOT_DE_PASSE_SUDO"), "oui", "x", "x"]);
		lignesJouees++;
		// La sauvegarde doit toujours pouvoir être relue.
		if (i % 97 === 0){
			var stockage = {};
			jeu.lire("(function(){ var s = {}; window.localStorage.setItem = function(k, v){ s[k] = v; }; state.save(); return JSON.stringify(s); })()");
		}
		if (jeu.lire("state.xp > state.xpMax()")) plantages.push({ ligne: ligne, erreur: "XP au-dessus du maximum" });
		if (jeu.lire("state.xp2 > state.xpMax2()")) plantages.push({ ligne: ligne, erreur: "XP du chapitre 2 au-dessus du maximum" });
		if (jeu.lire("state.xp5 > state.xpMax5()")) plantages.push({ ligne: ligne, erreur: "XP du chapitre 4 (l'Académie) au-dessus du maximum" });
		if (jeu.lire("state.xp6 > state.xpMax6()")) plantages.push({ ligne: ligne, erreur: "XP du chapitre 5 (le Bastion) au-dessus du maximum" });
	} catch (e){
		plantages.push({ ligne: ligne, erreur: String(e && e.message) + "\n" + (e && e.stack ? e.stack.split("\n").slice(0, 6).join("\n") : String(e)) });
		jeu = nouveauMonde({});
	}
}

console.log(lignesJouees + " lignes aléatoires jouées, " + plantages.length + " plantage" + (plantages.length > 1 ? "s" : "") + ".");
var vus = {};
plantages.forEach(function(p){
	var cle = p.erreur.split("\n").slice(0, 2).join("|");
	if (vus[cle]) return;
	vus[cle] = true;
	console.log("\nPLANTAGE avec : " + p.ligne + "\n" + p.erreur);
});
process.exit(plantages.length ? 1 : 0);
