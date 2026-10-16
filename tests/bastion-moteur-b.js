/**
 * Le moteur du Bastion, seconde moitié (SortsGuet.js) : Apache et curl, TLS, capacités et montages, noyau,
 * démarrage, audit et journaux, protections, la Pierre d'Inspection (lynis).
 *
 * Le test monte lui-même une machine « fort » (ses vrais fichiers de configuration), s'y connecte par ssh,
 * et vérifie que chaque commande lit l'état réel au moment où on la lance : les vrais cas, les erreurs,
 * les tuyaux, sudo, et la sauvegarde.
 *
 * Lancer : node tests/bastion-moteur-b.js        (-v pour tout voir)
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(obtenu, attendu, m){ verifier(obtenu === attendu, m + "\n--- attendu :\n" + attendu + "\n--- obtenu :\n" + obtenu); }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + t); }
function correspond(t, re, msg){ verifier(re.test(String(t)), (msg || "") + " : " + re + " ne correspond pas à\n" + t); }

/* La machine de test : ses fichiers, posés comme sur un vrai Debian. */
var MONTER = "(function(){" +
	"World.fige = false;" +
	"var r = new Room('fort', 'Le fort de test.', 'loc_cluster.gif'); r.racineHote = 'fort'; r.owner = 'root'; r.mode = 'rwxr-xr-x'; r.removeCommand('cd'); link_rooms(Machines, r);" +
	"decrireHote('fort', { ip: '10.0.92.66', ouvert: true, arrivee: function(){ return r; }, noyau: '6.1.0-21-amd64', journal: lignesDeJournal([['21:00', 'systemd', 'Started Journal Service.']])," +
	"  services: { sshd: service('fort', 'sshd', 'OpenBSD Secure Shell server'), apache2: service('fort', 'apache2', 'The Apache HTTP Server', { procNom: 'apache2' })," +
	"   auditd: service('fort', 'auditd', 'Security Auditing Service'), rsyslog: service('fort', 'rsyslog', 'System Logging Service'), fail2ban: service('fort', 'fail2ban', 'Fail2Ban Service')," +
	"   chrony: service('fort', 'chrony', 'chrony, an NTP client/server', { actif: false, auto: false }), 'telnet.socket': service('fort', 'telnet.socket', 'Telnet Server Activation Socket') } });" +
	"decrireHote('voisin', { ip: '10.0.92.67', ouvert: true, arrivee: function(){ return Home; } });" +
	"installerApacheDebian('fort', { serverName: 'fort', ssl: true, modules: ['ssl', 'socache_shmcb'], tokens: 'OS', signature: 'On', trace: 'On'," +
	"  cert: '/etc/ssl/certs/fort.pem', cle: '/etc/ssl/private/fort.key', index: '<h1>Le fort</h1>' });" +
	"var maintenant = new Date();" +
	"poserFichierHote('fort', '/etc/ssl/certs/fort.pem', fabriquerCertificat({ sujet: 'CN = fort', emetteur: 'C = FR, O = Cybersup, CN = Cybersup Root CA', debut: new Date(maintenant.getTime() - 400 * 86400000), fin: new Date(maintenant.getTime() - 35 * 86400000), san: ['fort', 'fort.cybersup.lan'], cle: 'cle-fort' }));" +
	"poserFichierHote('fort', '/etc/ssl/private/fort.key', fabriquerCle('cle-fort'), { mode: 'rw-------' });" +
	"poserFichierHote('fort', '/etc/ssl/certs/fort-neuf.pem', fabriquerCertificat({ sujet: 'CN = fort', emetteur: 'C = FR, O = Cybersup, CN = Cybersup Root CA', debut: new Date(maintenant.getTime() - 2 * 86400000), fin: new Date(maintenant.getTime() + 363 * 86400000), san: ['fort'], cle: 'cle-fort' }));" +
	"poserFichierHote('fort', '/var/www/html/sauvegardes/base.sql', 'INSERT INTO comptes VALUES (1);');" +
	"poserFichierHote('fort', '/var/www/html/prive.txt', 'secret', { mode: 'rw-------' });" +
	"poserFichierHote('fort', '/etc/fstab', '# /etc/fstab\\nUUID=1b2c3d4e / ext4 errors=remount-ro 0 1\\nUUID=9f8e7d6c none swap sw 0 0\\n');" +
	"creerDossierHote('fort', '/tmp', { mode: 'rwxrwxrwx' });" +
	"var t = poserFichierHote('fort', '/tmp/lancer.sh', 'echo lance', { mode: 'rwxr-xr-x', owner: JOUEUR });" +
	"poserFichierHote('fort', '/usr/bin/python3.11', 'ELF', { mode: 'rwxr-xr-x' }).capacites = 'cap_setuid=ep';" +
	"poserFichierHote('fort', '/usr/bin/ping', 'ELF', { mode: 'rwxr-xr-x' }).capacites = 'cap_net_raw=ep';" +
	"poserFichierHote('fort', '/usr/bin/passwd', 'ELF', { mode: 'rwsr-xr-x' });" +
	"poserFichierHote('fort', '/usr/local/bin/outil', 'ELF', { mode: 'rwsr-xr-x' });" +
	"poserFichierHote('fort', '/etc/sysctl.conf', '#net.ipv4.ip_forward=1\\n');" +
	"poserFichierHote('fort', '/etc/sysctl.d/10-defaut.conf', 'net.ipv4.ip_forward = 1\\nkernel.randomize_va_space = 0\\n');" +
	"poserFichierHote('fort', '/usr/lib/sysctl.d/50-pid-max.conf', 'kernel.pid_max = 4194304\\n');" +
	"poserFichierHote('fort', '/etc/modprobe.d/alsa-base.conf', 'options snd-usb-audio index=-2\\n');" +
	"poserFichierHote('fort', '/etc/default/grub', 'GRUB_DEFAULT=0\\nGRUB_TIMEOUT=5\\nGRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`\\nGRUB_CMDLINE_LINUX_DEFAULT=\"quiet\"\\nGRUB_CMDLINE_LINUX=\"\"\\n');" +
	"['00_header', '05_debian_theme', '10_linux', '30_os-prober', '30_uefi-firmware', '41_custom'].forEach(function(n){ poserFichierHote('fort', '/etc/grub.d/' + n, '#! /bin/sh\\nset -e\\n', { mode: 'rwxr-xr-x' }); });" +
	"poserFichierHote('fort', '/etc/grub.d/40_custom', '#!/bin/sh\\nexec tail -n +3 $0\\n# This file provides an easy way to add custom menu entries.\\n', { mode: 'rwxr-xr-x' });" +
	"poserFichierHote('fort', '/etc/grub.d/README', 'All executable files in this directory are processed in shell expansion order.');" +
	"poserFichierHote('fort', '/boot/grub/grub.cfg', '# vieux grub.cfg\\n', { mode: 'r--r--r--' });" +
	"poserFichierHote('fort', '/etc/crypttab', 'sda3_crypt UUID=5a1b2c3d-0000-4000-8000-123456789abc none luks,discard\\n');" +
	"poserFichierHote('fort', '/etc/audit/auditd.conf', 'log_file = /var/log/audit/audit.log\\n');" +
	"creerDossierHote('fort', '/etc/audit/rules.d');" +
	"poserFichierHote('fort', '/etc/audit/rules.d/audit.rules', '-D\\n-b 8192\\n-f 1\\n');" +
	"poserFichierHote('fort', '/etc/rsyslog.conf', 'module(load=\"imuxsock\")\\nmodule(load=\"imklog\")\\n$FileOwner root\\n$FileGroup adm\\n$FileCreateMode 0640\\n$IncludeConfig /etc/rsyslog.d/*.conf\\n*.*;auth,authpriv.none\\t\\t-/var/log/syslog\\nauth,authpriv.*\\t\\t\\t/var/log/auth.log\\n*.emerg\\t\\t\\t\\t:omusrmsg:*\\n');" +
	"creerDossierHote('fort', '/etc/rsyslog.d');" +
	"poserFichierHote('fort', '/etc/logrotate.conf', 'weekly\\nrotate 4\\ncreate\\ninclude /etc/logrotate.d\\n');" +
	"poserFichierHote('fort', '/etc/logrotate.d/fort', '/var/log/fort/*.log {\\n\\tweekly\\n\\trotate 2\\n\\tcompress\\n\\tdelaycompress\\n\\tmissingok\\n\\tnotifempty\\n\\tcreate 0640 root adm\\n}\\n');" +
	"poserFichierHote('fort', '/var/log/fort/acces.log', 'GET / 200\\nGET /admin 403\\n', { mode: 'rw-r-----' });" +
	"poserFichierHote('fort', '/var/log/fort/vide.log', '', { mode: 'rw-r-----' });" +
	"poserFichierHote('fort', '/etc/systemd/journald.conf', '[Journal]\\n#Storage=auto\\n#Compress=yes\\n');" +
	"poserFichierHote('fort', '/etc/chrony/chrony.conf', 'confdir /etc/chrony/conf.d\\npool 2.debian.pool.ntp.org iburst\\nsourcedir /etc/chrony/sources.d\\ndriftfile /var/lib/chrony/chrony.drift\\n');" +
	"poserFichierHote('fort', '/etc/apparmor.d/usr.sbin.apache2', '#include <tunables/global>\\n\\n/usr/sbin/apache2 flags=(attach_disconnected,complain) {\\n  #include <abstractions/base>\\n  /var/www/** r,\\n}\\n');" +
	"poserFichierHote('fort', '/etc/apparmor.d/usr.sbin.chronyd', '/usr/sbin/chronyd {\\n  /etc/chrony/** r,\\n}\\n');" +
	"creerDossierHote('fort', '/etc/apparmor.d/abstractions');" +
	"poserFichierHote('fort', '/etc/fail2ban/jail.conf', '[DEFAULT]\\nbantime = 10m\\nfindtime = 10m\\nmaxretry = 5\\n\\n[sshd]\\nport = ssh\\n');" +
	"poserFichierHote('fort', '/etc/rkhunter.conf', 'ALLOW_SSH_ROOT_USER=no\\n');" +
	"poserFichierHote('fort', '/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\\n' + JOUEUR + ':x:1000:1000::/home/' + JOUEUR + ':/bin/bash\\ntoor:x:0:0::/root:/bin/bash\\ninvite:x:1003:1003::/home/invite:/bin/bash\\n');" +
	"poserFichierHote('fort', '/etc/shadow', 'root:$y$j9T$abc:20000:0:99999:7:::\\ndaemon:*:20000:0:99999:7:::\\n' + JOUEUR + ':$y$j9T$def:20000:0:99999:7:::\\ntoor:$y$j9T$ghi:20000:0:99999:7:::\\ninvite::20000:0:99999:7:::\\n', { mode: 'rw-r--r--' });" +
	"poserFichierHote('fort', '/etc/ssh/sshd_config', 'Include /etc/ssh/sshd_config.d/*.conf\\nPermitRootLogin yes\\n#PasswordAuthentication yes\\nX11Forwarding yes\\n');" +
	"creerDossierHote('fort', '/etc/ssh/sshd_config.d');" +
	"poserFichierHote('fort', '/etc/login.defs', 'PASS_MAX_DAYS\\t99999\\nUMASK\\t\\t022\\n');" +
	"poserFichierHote('fort', '/etc/issue', 'Debian GNU/Linux 12 \\\\n \\\\l\\n');" +
	"poserFichierHote('fort', '/etc/sudoers', 'root ALL=(ALL:ALL) ALL\\n%sudo ALL=(ALL:ALL) ALL\\n');" +
	"World.fige = true;" +
	"})()";

var TOUS = "tousLesSorts().concat(SORTS_GUET, ['sysctl', 'chronyc', 'journalctl', 'timedatectl', 'openssl', 'curl', 'systemctl', 'fail2ban-client', 'rkhunter', 'ssh', 'bash'," +
	" 'cat', 'grep', 'ls', 'echo', 'chmod', 'touch', 'rm', 'mv', 'cp', 'head', 'tail', 'wc', 'sed', 'sudo', 'tee', 'ln', 'stat', 'nano'])";
function nouveauJeu(stockage){
	var jeu = monde.nouveauMonde(stockage);
	jeu.lire(TOUS + ".forEach(function(s){ state.spells[s] = true; state.usages[s] = true; }); state.set('sudoOK'); Shell.fin = function(){ Shell.narration = []; };");
	jeu.lire(MONTER);
	jeu.taper("cd ~");
	return jeu;
}
function sansCouleur(t){ return String(t).replace(/\x1b\[[0-9;]*m/g, ""); }

var STOCKAGE = {};
var jeu = nouveauJeu(STOCKAGE);
var t = function(l, r){ return jeu.taper(l, r); };
var s;

/* Les événements : on les note tous, et on relit le dernier de chaque type. */
jeu.lire("var EV = {}; ['apachectl', 'apacheReload', 'a2mod', 'curl', 's_client', 'x509', 'opensslReq', 'setcap', 'getcap', 'mount', 'sysctl', 'sysctlSystem', 'modprobe', 'lsmod'," +
	" 'grubMdp', 'grubUpdate', 'cryptsetup', 'auditctl', 'augenrules', 'audit', 'ausearch', 'aureport', 'logger', 'rsyslog', 'logrotate', 'journald', 'timedatectl', 'chronyc'," +
	" 'apparmor', 'fail2ban', 'rkhunter', 'lynis', 'noexec', 'chronycGuet'].forEach(function(type){ GameEvents.addListener(type, function(e){ EV[type] = e; EV[type + '#'] = (EV[type + '#'] || 0) + 1; }); });");
function ev(expr){ return jeu.lire("(function(){ try { return " + expr + "; } catch (e){ return undefined; } })()"); }
function code(ligne){ t(ligne); return jeu.lire("Shell.statut"); }

/* --- 0. Se rendre sur le fort --- */
s = t("ssh fort");
contient(s, "Connexion à fort (10.0.92.66)", "ssh fort");
egal(jeu.lire("Shell.hote()"), "fort", "on est sur le fort");
verifier(jeu.lire("etatGuet().hotes.fort.demarre") === true, "le fort a démarré en y entrant");
egal(t("cat /etc/hostname 2>/dev/null; echo $?").split("\n").pop(), "1", "un fichier absent reste absent");

/* ================================================================== */
/* 1. Apache                                                          */
/* ================================================================== */

s = t("apachectl configtest");
contient(s, "Syntax OK", "configtest : Syntax OK");
absent(s, "AH00558", "ServerName global : pas d'avertissement AH00558");
egal(t("apachectl configtest 2>/dev/null"), "", "configtest écrit sur la sortie d'erreur, comme le vrai");
egal(code("apachectl configtest"), 0, "configtest : code 0");
verifier(ev("EV.apachectl.ok") === true && ev("EV.apachectl.action") === "configtest", "événement apachectl configtest");
contient(t("apache2ctl -t"), "Syntax OK", "apache2ctl -t");
s = t("apachectl -M");
contient(s, "Loaded Modules:", "-M : en-tête");
contient(s, " core_module (static)", "-M : un module statique");
contient(s, " ssl_module (shared)", "-M : ssl chargé");
contient(s, " autoindex_module (shared)", "-M : autoindex chargé");
absent(s, "headers_module", "-M : headers n'est pas chargé");
contient(s, " mpm_event_module (shared)", "-M : le MPM");
s = t("apachectl -S");
contient(s, "VirtualHost configuration:", "-S : en-tête");
correspond(s, /\*:443\s+fort \(\/etc\/apache2\/sites-enabled\/default-ssl\.conf:1\)/, "-S : le site HTTPS, son fichier et sa ligne");
correspond(s, /\*:80\s+fort \(\/etc\/apache2\/sites-enabled\/000-default\.conf:1\)/, "-S : le site HTTP");
contient(s, "ServerRoot: \"/etc/apache2\"", "-S : ServerRoot");
contient(s, "User: name=\"www-data\" id=33", "-S : User");
contient(t("apachectl -v"), "Server version: Apache/2.4.62 (Debian)", "apachectl -v");
contient(t("apachectl nimportequoi"), "Usage: apachectl start|stop|restart|graceful", "apachectl : usage");

/* curl : la configuration active */
s = t("curl -I http://fort/");
contient(s, "HTTP/1.1 200 OK", "curl -I : 200");
contient(s, "Server: Apache/2.4.62 (Debian)", "curl -I : ServerTokens OS");
correspond(s, /^Date: [A-Z][a-z]{2}, \d\d [A-Z][a-z]{2} \d{4} \d\d:\d\d:\d\d GMT$/m, "curl -I : Date au format HTTP");
contient(s, "Content-Type: text/html", "curl -I : Content-Type");
contient(s, "Accept-Ranges: bytes", "curl -I : Accept-Ranges");
correspond(s, /^ETag: "[0-9a-f]+-[0-9a-f]+"$/m, "curl -I : ETag");
contient(s, "Vary: Accept-Encoding", "curl -I : Vary (deflate)");
egal(t("curl -s http://fort/"), "<h1>Le fort</h1>", "curl : la page d'accueil");
verifier(ev("EV.curl.guet") === true && ev("EV.curl.code") === 200 && ev("EV.curl.hote") === "fort", "événement curl");
s = t("curl http://fort/existe-pas");
contient(s, "<title>404 Not Found</title>", "curl : 404");
contient(s, "<address>Apache/2.4.62 (Debian) Server at fort Port 80</address>", "404 : la signature (ServerSignature On)");
s = t("curl http://fort/sauvegardes/");
contient(s, "<title>Index of /sauvegardes</title>", "Options Indexes : le dossier est listé");
contient(s, "base.sql", "la liste montre base.sql");
s = t("curl -I http://fort/sauvegardes");
contient(s, "HTTP/1.1 301 Moved Permanently", "un dossier sans / final : 301");
contient(s, "Location: http://fort/sauvegardes/", "301 : Location");
contient(t("curl http://fort/prive.txt"), "403 Forbidden", "un fichier illisible pour www-data : 403");
s = t("curl -i -X TRACE http://fort/");
contient(s, "HTTP/1.1 200 OK", "TRACE activé : 200");
contient(s, "Content-Type: message/http", "TRACE : message/http");
contient(s, "TRACE / HTTP/1.1", "TRACE : la requête est renvoyée");
s = t("curl -i -X OPTIONS http://fort/");
contient(s, "Allow: GET,POST,OPTIONS,HEAD,TRACE", "OPTIONS : Allow");
contient(t("curl -X POST http://fort/index.html"), "405 Method Not Allowed", "POST sur un fichier statique : 405");
egal(t("curl -s -o /dev/null -w '%{http_code}' http://fort/existe-pas"), "404", "-w %{http_code}");
egal(code("curl -sf http://fort/existe-pas"), 22, "curl -f : code 22 sur une erreur HTTP");
s = t("curl https://fort/");
contient(s, "curl: (60) SSL certificate problem: certificate has expired", "HTTPS : le certificat expiré est refusé");
contient(s, "More details here: https://curl.se/docs/sslcerts.html", "curl 60 : le texte de curl");
egal(code("curl https://fort/"), 60, "curl 60 : code 60");
egal(t("curl -sk https://fort/"), "<h1>Le fort</h1>", "curl -k passe outre");
s = t("curl -k -I https://fort/");
contient(s, "Server: Apache/2.4.62 (Debian)\n", "HTTPS : ServerTokens OS, sans les modules (Full les ajouterait)");
absent(s, "Strict-Transport-Security", "pas encore de HSTS");
s = t("curl -kv https://fort/ 2>&1 >/dev/null");
contient(s, "* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384", "curl -v : la poignée de main sur la sortie d'erreur");
contient(s, "*  subject: CN=fort", "curl -v : le sujet du certificat");
contient(s, "> GET / HTTP/1.1", "curl -v : la requête");
contient(s, "< HTTP/1.1 200 OK", "curl -v : la réponse");
contient(t("curl -k http://fort:443/"), "speaking plain HTTP to an SSL-enabled server port", "HTTP vers le port 443 : 400");
contient(t("curl http://fort:8080/"), "curl: (7) Failed to connect to fort port 8080 after 0 ms: Couldn't connect to server", "port fermé : curl 7");
contient(t("curl --zut http://fort/"), "curl: option --zut: is unknown", "option inconnue de curl");
contient(t("curl -kI --tlsv1.1 --tls-max 1.1 https://fort/"), "HTTP/1.1 200 OK", "TLS 1.1 encore accepté (SSLProtocol all -SSLv3)");
egal(t("curl -s http://localhost/"), "<h1>Le fort</h1>", "curl localhost depuis le fort");
egal(t("curl -s -H 'Host: fort' http://10.0.92.66/"), "<h1>Le fort</h1>", "curl par l'adresse IP");
contient(t("curl -s http://fort/ | grep fort"), "Le fort", "curl dans un tuyau");

/* Durcir security.conf : rien ne change tant qu'on ne recharge pas */
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/apache2/conf-available/security.conf'); it.setText(it.getText().replace('ServerTokens OS', 'ServerTokens Prod').replace('ServerSignature On', 'ServerSignature Off').replace('TraceEnable On', 'TraceEnable Off')); })()");
contient(t("curl -I http://fort/"), "Server: Apache/2.4.62 (Debian)", "fichier modifié, pas rechargé : l'ancienne configuration tourne");
contient(t("apachectl configtest"), "Syntax OK", "configtest du fichier modifié");
s = t("systemctl reload apache2");
contient(s, "Failed to reload apache2.service: Access denied", "reload sans sudo : refusé");
egal(t("sudo systemctl reload apache2"), "", "sudo systemctl reload apache2");
verifier(ev("EV.apacheReload.ok") === true && ev("EV.apacheReload.action") === "reload", "événement apacheReload");
contient(t("curl -I http://fort/"), "Server: Apache\n", "après reload : ServerTokens Prod");
s = t("curl http://fort/existe-pas");
absent(s, "<address>", "ServerSignature Off : plus de signature");
contient(s, "<h1>Not Found</h1>", "la page 404 reste");
s = t("curl -i -X TRACE http://fort/");
contient(s, "HTTP/1.1 405 Method Not Allowed", "TraceEnable Off : 405");
contient(s, "The requested method TRACE is not allowed for this URL.", "405 : le texte d'Apache");
contient(t("curl -i -X OPTIONS http://fort/"), "Allow: GET,POST,OPTIONS,HEAD\n", "OPTIONS sans TRACE");

/* Une faute dans la configuration : configtest la trouve, reload la refuse, restart éteint le site */
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/apache2/conf-available/security.conf'); it.setText(it.getText() + '\\nServerTokenz Prod'); })()");
s = t("apachectl configtest 2>&1");
contient(s, "AH00526: Syntax error on line " + jeu.lire("fichierHote('fort', '/etc/apache2/conf-available/security.conf').getText().split('\\n').length") + " of /etc/apache2/conf-enabled/security.conf:", "configtest : le fichier et la ligne");
contient(s, "Invalid command 'ServerTokenz', perhaps misspelled or defined by a module not included in the server configuration", "configtest : le message d'Apache");
contient(s, "Action 'configtest' failed.", "configtest : Action failed");
egal(code("apachectl configtest"), 1, "configtest en échec : code 1");
verifier(ev("EV.apachectl.ok") === false, "événement apachectl en échec");
s = t("sudo systemctl reload apache2");
contient(s, "Job for apache2.service failed.", "reload d'une configuration cassée : refusé");
contient(s, "journalctl -xeu apache2.service", "reload refusé : le conseil de systemd");
verifier(ev("EV.apacheReload.ok") === false, "événement apacheReload refusé");
contient(t("curl -I http://fort/"), "Server: Apache\n", "reload refusé : l'ancienne configuration tourne toujours");
egal(t("systemctl status apache2 | head -1"), "● apache2.service - The Apache HTTP Server", "le service tourne encore");
s = t("sudo journalctl -u apachectl");
contient(s, "Invalid command 'ServerTokenz'", "le journal garde l'erreur");
s = t("sudo systemctl restart apache2");
contient(s, "Job for apache2.service failed because the control process exited with error code.", "restart d'une configuration cassée");
contient(t("curl http://fort/"), "curl: (7) Failed to connect to fort port 80", "après un restart raté, le site est éteint");
s = t("systemctl status apache2");
contient(s, "× apache2.service - The Apache HTTP Server", "status : failed");
contient(s, "Active: failed (Result: exit-code)", "status : Result exit-code");
contient(s, "ServerTokenz", "status : l'erreur");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/apache2/conf-available/security.conf'); it.setText(it.getText().replace('\\nServerTokenz Prod', '')); })()");
egal(t("sudo systemctl start apache2"), "", "la faute corrigée, Apache redémarre");
contient(t("curl -I http://fort/"), "HTTP/1.1 200 OK", "le site répond de nouveau");
contient(t("sudo systemctl reload apache2 2>&1; echo $?"), "0", "reload possible de nouveau");

/* D'autres fautes classiques */
function casser(chemin, ajout){ jeu.lire("(function(){ var it = fichierHote('fort', " + JSON.stringify(chemin) + "); it.setText(it.getText() + " + JSON.stringify(ajout) + "); })()"); }
function reparer(chemin, ajout){ jeu.lire("(function(){ var it = fichierHote('fort', " + JSON.stringify(chemin) + "); it.setText(it.getText().replace(" + JSON.stringify(ajout) + ", '')); })()"); }
[["\n<Directory /var/www/html>\n\tOptions -Indexes\n", "<Directory> was not closed."],
	["\n</Directory>", "</Directory> without matching <Directory> section"],
	["\nOptions Indexes -FollowSymLinks", "Either all Options must start with + or -, or no Option may."],
	["\nOptions Indexs", "Illegal option Indexs"],
	["\nServerSignature Maybe", "ServerSignature: use one of: off | on | email"],
	["\nTraceEnable peut-etre", "TraceEnable must be one of 'on', 'off', or 'extended'"],
	["\nServerTokens Secret", "ServerTokens takes 1 argument"],
	["\nHeader always set Strict-Transport-Security \"max-age=63072000\"", "Invalid command 'Header'"],
	["\nInclude /etc/apache2/absent.conf", "Could not open configuration file /etc/apache2/absent.conf: No such file or directory"]].forEach(function(c){
	casser("/etc/apache2/conf-available/security.conf", c[0]);
	contient(t("apachectl configtest 2>&1"), c[1], "configtest : " + c[1]);
	reparer("/etc/apache2/conf-available/security.conf", c[0]);
});
casser("/etc/apache2/sites-available/default-ssl.conf", "\n<VirtualHost *:8443>\n\tSSLEngine on\n\tSSLProtocol all -TLSv1.4\n</VirtualHost>");
contient(t("apachectl configtest 2>&1"), "SSLProtocol: Illegal protocol 'TLSv1.4'", "SSLProtocol inconnu");
reparer("/etc/apache2/sites-available/default-ssl.conf", "\n<VirtualHost *:8443>\n\tSSLEngine on\n\tSSLProtocol all -TLSv1.4\n</VirtualHost>");
casser("/etc/apache2/sites-available/default-ssl.conf", "\n<VirtualHost *:8443>\n\tSSLEngine on\n\tSSLCertificateFile /etc/ssl/certs/absent.pem\n</VirtualHost>");
contient(t("apachectl configtest 2>&1"), "SSLCertificateFile: file '/etc/ssl/certs/absent.pem' does not exist or is empty", "certificat absent");
reparer("/etc/apache2/sites-available/default-ssl.conf", "\n<VirtualHost *:8443>\n\tSSLEngine on\n\tSSLCertificateFile /etc/ssl/certs/absent.pem\n</VirtualHost>");
contient(t("apachectl configtest"), "Syntax OK", "tout est réparé");

/* a2enmod, a2dismod, a2enconf, a2ensite */
s = t("a2enmod headers");
contient(s, "ERROR: Could not create /etc/apache2/mods-enabled/headers.load: Permission denied", "a2enmod sans sudo");
s = t("sudo a2enmod headers");
egal(sansCouleur(s).split("\n").slice(0, 3).join("\n"), "Enabling module headers.\nTo activate the new configuration, you need to run:\n  systemctl restart apache2", "a2enmod headers");
verifier(ev("EV.a2mod.action") === "enable" && ev("EV.a2mod.noms[0]") === "headers" && ev("EV.a2mod.changes.length") === 1, "événement a2mod");
egal(t("sudo a2enmod headers"), "Module headers already enabled", "a2enmod : déjà actif");
contient(t("ls -l /etc/apache2/mods-enabled/headers.load"), "headers.load -> ../mods-available/headers.load", "le lien est relatif, comme celui de Debian");
contient(t("cat /etc/apache2/mods-enabled/headers.load"), "LoadModule headers_module /usr/lib/apache2/modules/mod_headers.so", "on lit le module à travers le lien");
contient(t("apachectl -M"), "headers_module (shared)", "-M voit headers sur le disque");
egal(t("sudo a2enmod inconnu 2>&1"), "ERROR: Module inconnu does not exist!", "a2enmod : module inconnu");
egal(code("sudo a2enmod inconnu"), 1, "a2enmod : code 1");
contient(t("sudo a2enmod"), "Your choices are:", "a2enmod sans argument");
casser("/etc/apache2/conf-available/security.conf", "\nHeader always set Strict-Transport-Security \"max-age=63072000\"");
contient(t("apachectl configtest"), "Syntax OK", "Header accepté avec headers");
contient(t("curl -kI https://fort/"), "Server: Apache\n", "pas encore rechargé");
absent(t("curl -kI https://fort/"), "Strict-Transport-Security", "pas encore de HSTS sans restart");
t("sudo systemctl restart apache2");
contient(t("curl -kI https://fort/"), "Strict-Transport-Security: max-age=63072000", "HSTS après restart");
contient(t("curl -I http://fort/existe-pas"), "Strict-Transport-Security: max-age=63072000", "Header always : aussi sur une erreur");
s = t("sudo a2dismod autoindex", "non");
contient(s, "WARNING: The following essential module will be disabled.", "a2dismod d'un module essentiel : avertissement");
contient(s, "Aborting", "a2dismod : réponse fausse, on abandonne");
contient(t("apachectl -M"), "autoindex_module", "autoindex toujours là");
s = t("sudo a2dismod autoindex", "Yes, do as I say!");
contient(s, "Module autoindex disabled.", "a2dismod autoindex confirmé");
contient(s, "systemctl restart apache2", "a2dismod : le conseil");
egal(t("sudo a2dismod autoindex"), "Module autoindex already disabled", "a2dismod : déjà coupé");
t("sudo a2enmod -q autoindex");
s = t("sudo a2dismod -f autoindex");
contient(s, "Module autoindex disabled.", "a2dismod -f : sans question");
absent(s, "WARNING", "a2dismod -f : pas d'avertissement");
contient(t("curl http://fort/sauvegardes/"), "Index of /sauvegardes", "pas encore redémarré : la liste reste");
t("sudo systemctl restart apache2");
contient(t("curl http://fort/sauvegardes/"), "403 Forbidden", "sans autoindex : 403");
s = t("sudo a2enmod ssl");
contient(s, "Considering dependency setenvif for ssl:", "a2enmod ssl : les dépendances");
contient(s, "Module socache_shmcb already enabled", "a2enmod ssl : socache déjà là");
contient(s, "Module ssl already enabled", "a2enmod ssl : déjà là");
s = t("sudo a2disconf charset");
contient(s, "Conf charset disabled.", "a2disconf");
contient(s, "systemctl reload apache2", "a2disconf : reload suffit");
egal(t("sudo a2enconf charset").split("\n")[0], "Enabling conf charset.", "a2enconf");
egal(t("sudo a2ensite default-ssl"), "Site default-ssl already enabled", "a2ensite : déjà");
egal(t("sudo a2ensite fantome 2>&1"), "ERROR: Site fantome does not exist!", "a2ensite : site inconnu");
s = t("sudo a2dissite default-ssl");
contient(s, "Site default-ssl disabled.", "a2dissite");
t("sudo systemctl reload apache2");
contient(t("curl -k https://fort/"), "wrong version number", "plus de site HTTPS : le port 443 (Listen reste) parle HTTP en clair");
t("sudo a2ensite default-ssl");
t("sudo systemctl reload apache2");
contient(t("curl -kI https://fort/"), "200 OK", "le site HTTPS revient");

/* TLS côté serveur : SSLProtocol et le nouveau certificat */
s = t("openssl s_client -connect fort:443 -tls1_1");
contient(s, "New, TLSv1/SSLv3, Cipher is ECDHE-RSA-AES256-SHA", "s_client -tls1_1 : accepté tant que SSLProtocol all");
contient(s, "Protocol  : TLSv1.1", "s_client : la session");
contient(s, "Verify return code: 10 (certificate has expired)", "s_client : certificat expiré");
contient(s, "verify error:num=10:certificate has expired", "s_client : l'erreur de vérification");
verifier(ev("EV.s_client.negocie") === "TLSv1.1" && ev("EV.s_client.verification") === 10, "événement s_client");
casser("/etc/apache2/sites-available/default-ssl.conf", "");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/apache2/sites-available/default-ssl.conf'); it.setText(it.getText().replace('/etc/ssl/certs/fort.pem', '/etc/ssl/certs/fort-neuf.pem').replace('\\tSSLEngine on', '\\tSSLEngine on\\n\\tSSLProtocol -all +TLSv1.2 +TLSv1.3')); })()");
contient(t("apachectl configtest"), "Syntax OK", "nouveau certificat et SSLProtocol");
t("sudo systemctl reload apache2");
s = t("openssl s_client -connect fort:443 -tls1_1");
contient(s, "CONNECTED(00000003)", "s_client -tls1_1 refusé : connecté d'abord");
contient(s, "no peer certificate available", "refusé : pas de certificat");
contient(t("openssl s_client -connect fort:443 -tls1_1 2>&1 >/dev/null"), "tlsv1 alert protocol version", "refus : l'alerte protocol version (sortie d'erreur)");
egal(code("openssl s_client -connect fort:443 -tls1_1"), 1, "s_client refusé : code 1");
verifier(ev("EV.s_client.ok") === false, "événement s_client refusé");
s = t("openssl s_client -connect fort:443 -tls1_2");
contient(s, "Protocol  : TLSv1.2", "-tls1_2 accepté");
contient(s, "Verify return code: 0 (ok)", "le certificat neuf est vérifié");
contient(s, "depth=1 C = FR, O = Cybersup, CN = Cybersup Root CA", "la chaîne : l'autorité");
contient(t("openssl s_client -connect fort:443"), "New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384", "par défaut : TLS 1.3");
contient(t("openssl s_client -connect fort:443 -brief"), "Protocol version: TLSv1.3", "-brief");
contient(t("openssl s_client -connect fort:80 2>&1"), "wrong version number", "s_client vers le port 80");
contient(t("openssl s_client -connect fort:9999"), "connect:errno=111", "s_client vers un port fermé");
egal(t("curl -s https://fort/"), "<h1>Le fort</h1>", "curl sans -k : le certificat neuf passe");
contient(t("curl --tls-max 1.1 https://fort/"), "curl: (35) OpenSSL/3.0.15: error:0A00042E:SSL routines::tlsv1 alert protocol version", "curl forcé en TLS 1.1 : refusé");
contient(t("curl -s https://fort.cybersup.lan/ 2>&1; curl https://10.0.92.66/"), "no alternative certificate subject name matches target host name '10.0.92.66'", "nom absent du certificat");

/* Redirection vers HTTPS */
casser("/etc/apache2/sites-available/000-default.conf", "");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/apache2/sites-available/000-default.conf'); it.setText(it.getText().replace('DocumentRoot /var/www/html', 'DocumentRoot /var/www/html\\n\\tRedirect permanent / https://fort/')); })()");
t("sudo systemctl reload apache2");
s = t("curl -I http://fort/admin");
contient(s, "HTTP/1.1 301 Moved Permanently", "Redirect permanent");
contient(s, "Location: https://fort/admin", "la redirection garde le chemin");
egal(t("curl -sL http://fort/"), "<h1>Le fort</h1>", "curl -L suit vers HTTPS");
s = t("curl -sIL http://fort/");
correspond(s, /301 Moved Permanently[\s\S]*200 OK/, "curl -IL montre les deux réponses");

/* ================================================================== */
/* 2. openssl x509 et req                                              */
/* ================================================================== */

s = t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -dates");
correspond(s, /^notBefore=[A-Z][a-z]{2} [ \d]\d \d\d:\d\d:\d\d \d{4} GMT\nnotAfter=[A-Z][a-z]{2} [ \d]\d \d\d:\d\d:\d\d \d{4} GMT/, "x509 -dates : le format d'OpenSSL");
contient(s, "a expiré", "x509 -dates : l'astuce sur l'expiration");
verifier(ev("EV.x509.expire") === true, "événement x509 expire");
egal(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -subject"), "subject=CN = fort", "x509 -subject");
egal(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -issuer"), "issuer=C = FR, O = Cybersup, CN = Cybersup Root CA", "x509 -issuer");
correspond(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -enddate | cat"), /^notAfter=.* GMT$/, "x509 -enddate dans un tuyau");
egal(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -checkend 0"), "Certificate will expire", "-checkend 0 sur un expiré");
egal(code("openssl x509 -in /etc/ssl/certs/fort.pem -noout -checkend 0"), 1, "-checkend : code 1");
egal(t("openssl x509 -in /etc/ssl/certs/fort-neuf.pem -noout -checkend 2592000"), "Certificate will not expire", "-checkend 30 jours sur le neuf");
egal(code("openssl x509 -in /etc/ssl/certs/fort-neuf.pem -noout -checkend 2592000"), 0, "-checkend : code 0");
s = t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -text");
contient(s, "Signature Algorithm: sha256WithRSAEncryption", "-text : l'algorithme");
contient(s, "Public-Key: (2048 bit)", "-text : la clé");
contient(s, "DNS:fort, DNS:fort.cybersup.lan", "-text : les noms");
correspond(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -fingerprint -sha256"), /^sha256 Fingerprint=([0-9A-F]{2}:){31}[0-9A-F]{2}$/, "-fingerprint -sha256");
correspond(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -serial"), /^serial=[0-9A-F]{32}$/, "-serial");
s = t("openssl x509 -in /etc/ssl/certs/fort.pem");
correspond(s, /^-----BEGIN CERTIFICATE-----\nMII/, "sans -noout : le PEM (MII... comme un vrai)");
contient(t("cat /etc/ssl/certs/fort.pem | openssl x509 -noout -subject"), "subject=CN = fort", "x509 lit un tuyau");
contient(t("openssl x509 -in /etc/ssl/certs/absent.pem -noout -dates"), "Could not open file or uri for loading certificate from /etc/ssl/certs/absent.pem", "x509 : fichier absent");
contient(t("openssl x509 -in /etc/ssl/private/fort.key -noout -dates"), "Permission denied", "x509 : fichier illisible sans sudo");
contient(t("openssl x509 -in /etc/fstab -noout -dates"), "Unable to load certificate", "x509 : pas un certificat");
contient(t("openssl x509 -in /etc/ssl/certs/fort.pem -noout -zut"), "x509: Unknown option", "x509 : option inconnue");
contient(t("openssl version"), "OpenSSL 3.0", "openssl version (l'ancien sort)");
t("cd /tmp");
s = t("openssl req -x509 -newkey rsa:2048 -days 30 -nodes -keyout essai.key -out essai.pem -subj '/C=FR/O=Cybersup/CN=essai'");
contient(s, "-----", "req : la fin de la génération");
egal(t("openssl x509 -in essai.pem -noout -subject"), "subject=C = FR, O = Cybersup, CN = essai", "req -x509 : le sujet");
egal(t("openssl x509 -in essai.pem -noout -issuer"), "issuer=C = FR, O = Cybersup, CN = essai", "req -x509 : auto-signé");
egal(t("openssl x509 -in essai.pem -noout -checkend 2500000"), "Certificate will not expire", "req -days 30");
egal(t("openssl x509 -in essai.pem -noout -checkend 2600000"), "Certificate will expire", "req -days 30 : expire avant 30 jours et un peu");
correspond(t("ls -l essai.key"), /^-rw-------/, "la clé est en 600");
verifier(ev("EV.opensslReq.jours") === 30, "événement opensslReq");
contient(t("openssl req -x509 -newkey rsa:2048 -nodes -out x.pem"), "-subj", "req sans sujet");
contient(t("openssl req -x509 -newkey dsa:1024 -nodes -out x.pem -subj /CN=x"), "Unknown algorithm", "req : algorithme inconnu");
s = t("openssl req -x509 -newkey rsa:2048 -keyout chiffree.key -out chiffree.pem -subj /CN=c", ["phrase longue", "phrase longue"]);
contient(t("head -1 chiffree.key"), "-----BEGIN ENCRYPTED PRIVATE KEY-----", "req sans -nodes : la clé est chiffrée");
t("openssl req -x509 -newkey rsa:2048 -keyout autre.key -out autre.pem -subj /CN=c", ["un", "deux"]);
contient(t("ls"), "chiffree.pem", "req chiffré : le certificat");
absent(t("ls"), "autre.pem", "phrases différentes : rien n'est écrit");
t("rm essai.key essai.pem chiffree.key chiffree.pem");
t("cd /");

/* ================================================================== */
/* 3. Capacités, montages, noexec                                      */
/* ================================================================== */

s = t("getcap -r /");
contient(s, "/usr/bin/python3.11 cap_setuid=ep", "getcap -r : la capacité dangereuse");
contient(s, "/usr/bin/ping cap_net_raw=ep", "getcap -r : ping");
egal(t("getcap /usr/bin/ping"), "/usr/bin/ping cap_net_raw=ep", "getcap FICHIER");
egal(t("getcap /usr/bin/passwd"), "", "getcap sans capacité : rien");
contient(t("getcap /usr/bin/absent"), "Failed to get capabilities of file '/usr/bin/absent' (No such file or directory)", "getcap : absent");
egal(t("getcap -r /usr/bin | wc -l").trim(), "2", "getcap -r dans un tuyau");
contient(t("setcap -r /usr/bin/python3.11"), "unable to set CAP_SETFCAP effective capability: Operation not permitted", "setcap sans sudo");
egal(t("sudo setcap -r /usr/bin/python3.11"), "", "sudo setcap -r");
absent(t("getcap -r /"), "python3.11", "la capacité est retirée");
verifier(ev("EV.setcap.retire") === true && ev("EV.setcap.chemin") === "/usr/bin/python3.11", "événement setcap");
t("sudo setcap cap_net_bind_service=+ep /usr/local/bin/outil");
egal(t("getcap /usr/local/bin/outil"), "/usr/local/bin/outil cap_net_bind_service=ep", "setcap +ep : la forme normalisée");
t("sudo setcap cap_setuid,cap_setgid+eip /usr/local/bin/outil");
egal(t("getcap /usr/local/bin/outil"), "/usr/local/bin/outil cap_setgid,cap_setuid=eip", "setcap : plusieurs capacités, dans l'ordre du noyau");
contient(t("sudo setcap cap_voler=ep /usr/local/bin/outil"), "fatal error: Invalid argument", "setcap : capacité inconnue");
t("sudo setcap -r /usr/local/bin/outil");
s = t("mount");
contient(s, "/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)", "mount : la racine depuis fstab");
contient(s, "proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)", "mount : /proc");
absent(s, " on /tmp ", "mount : /tmp n'est pas un montage à part");
contient(t("mount -t ext4"), "/dev/sda1 on /", "mount -t");
egal(t("findmnt /tmp; echo $?"), "1", "findmnt /tmp : rien, code 1");
contient(t("sudo mount -o remount /tmp"), "mount: /tmp: mount point not mounted or bad option.", "remount d'un /tmp qui n'est pas monté");
s = t("findmnt");
correspond(s, /^TARGET\s+SOURCE\s+FSTYPE\s+OPTIONS\n\/\s+\/dev\/sda1\s+ext4\s+rw,relatime,errors=remount-ro/, "findmnt : l'arbre");
contient(s, "├─/sys", "findmnt : les branches");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/fstab'); it.setText(it.getText() + '\\ntmpfs /tmp tmpfs defaults,size=512M 0 0'); })()");
contient(t("mount /tmp"), "must be superuser to use mount", "mount sans sudo");
egal(t("sudo mount /tmp"), "", "sudo mount /tmp depuis fstab");
egal(t("findmnt -n -o OPTIONS /tmp"), "rw,relatime,size=512M,inode64", "findmnt -n -o OPTIONS");
contient(t("sudo mount /tmp"), "already mounted on /tmp", "mount deux fois");
t("cd /tmp");
egal(t("./lancer.sh"), "lance", "/tmp exécutable pour l'instant");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/fstab'); it.setText(it.getText().replace('defaults,size=512M', 'defaults,nodev,nosuid,noexec,size=512M')); })()");
egal(t("./lancer.sh"), "lance", "fstab modifié mais pas remonté : ça s'exécute encore");
egal(t("sudo mount -o remount /tmp"), "", "sudo mount -o remount /tmp");
verifier(ev("EV.mount.action") === "remount" && ev("EV.mount.options.indexOf('noexec')") > -1, "événement mount remount");
egal(t("findmnt -n -o OPTIONS /tmp"), "rw,nosuid,nodev,noexec,relatime,size=512M,inode64", "remount : les options de fstab");
s = t("./lancer.sh");
contient(s, "-bash: ./lancer.sh: Permission denied", "noexec : ./script refusé");
egal(code("./lancer.sh"), 126, "noexec : code 126");
verifier(ev("EV.noexec.chemin") === "/tmp/lancer.sh", "événement noexec");
egal(t("bash lancer.sh"), "lance", "noexec : bash script marche encore (comme le vrai)");
contient(t("mount | grep /tmp"), "tmpfs on /tmp type tmpfs (rw,nosuid,nodev,noexec,relatime,size=512M,inode64)", "mount | grep");
t("sudo mount -o remount,exec /tmp");
egal(t("./lancer.sh"), "lance", "remount,exec : exécutable de nouveau");
t("sudo mount -o remount /tmp");
contient(t("findmnt --fstab"), "defaults,nodev,nosuid,noexec,size=512M", "findmnt --fstab");
contient(t("findmnt -T /tmp/lancer.sh"), "/tmp", "findmnt -T");
contient(t("findmnt --zut"), "findmnt: invalid option", "findmnt : option inconnue");
t("cd /");

/* ================================================================== */
/* 4. Le noyau : sysctl, modules                                       */
/* ================================================================== */

egal(t("sysctl net.ipv4.ip_forward"), "net.ipv4.ip_forward = 1", "au démarrage, 10-defaut.conf a été appliqué");
egal(t("sysctl -n kernel.randomize_va_space"), "0", "sysctl -n");
egal(t("sysctl kernel.pid_max"), "kernel.pid_max = 4194304", "un fichier de /usr/lib/sysctl.d");
s = t("sysctl -a");
contient(s, "fs.protected_symlinks = 0", "sysctl -a");
contient(s, "kernel.hostname = fort", "sysctl -a : le nom");
egal(t("sysctl -a | grep -c '^net.ipv4.conf.all'"), "6", "sysctl -a | grep");
contient(t("sysctl net.ipv4.inconnu 2>&1"), "sysctl: cannot stat /proc/sys/net/ipv4/inconnu: No such file or directory", "clé inconnue");
contient(t("sysctl -w net.ipv4.ip_forward=0 2>&1"), "sysctl: permission denied on key \"net.ipv4.ip_forward\"", "sysctl -w sans sudo");
s = t("sudo sysctl -w net.ipv4.ip_forward=0");
contient(s, "net.ipv4.ip_forward = 0", "sudo sysctl -w");
contient(s, "/etc/sysctl.d/NN-nom.conf", "sysctl -w : l'astuce sur la durée");
egal(t("sudo sysctl kernel.dmesg_restrict=1 | cat"), "kernel.dmesg_restrict = 1", "sysctl clé=valeur sans -w");
contient(t("sudo sysctl -w kernel.randomize_va_space=7 2>&1"), "sysctl: setting key \"kernel.randomize_va_space\": Invalid argument", "valeur impossible");
contient(t("sudo sysctl -w kernel.osrelease=1 2>&1"), "Operation not permitted", "clé en lecture seule");
t("cd /etc/sysctl.d");
jeu.lire("poserFichierHote('fort', '/etc/sysctl.d/99-fort.conf', '# durcissement\\nnet.ipv4.ip_forward=0\\nnet.ipv4.conf.all.rp_filter = 1\\nnet.ipv4.conf.all.accept_redirects=0\\nkernel.kptr_restrict=2\\nkernel.randomize_va_space=2\\nfs.protected_symlinks=1\\n-net.ipv4.inexistant=1\\nligne sans egal\\n')");
s = t("sudo sysctl --system 2>/dev/null");
var ordre = s.split("\n").filter(function(l){ return l.indexOf("* Applying") === 0; });
egal(ordre.join("\n"), "* Applying /etc/sysctl.d/10-defaut.conf ...\n* Applying /usr/lib/sysctl.d/50-pid-max.conf ...\n* Applying /etc/sysctl.d/99-fort.conf ...\n* Applying /etc/sysctl.conf ...", "sysctl --system : l'ordre des fichiers");
contient(s, "kernel.kptr_restrict = 2", "--system : les valeurs appliquées");
contient(t("sudo sysctl --system 2>&1 >/dev/null"), "sysctl: /etc/sysctl.d/99-fort.conf(9): invalid syntax, continuing...", "--system : la ligne fautive");
absent(t("sudo sysctl --system 2>&1 >/dev/null"), "inexistant", "une ligne préfixée de - ne dit rien");
verifier(ev("EV.sysctlSystem.fichiers.length") === 4 && ev("EV.sysctlSystem.cles.indexOf('kernel.kptr_restrict')") > -1, "événement sysctlSystem");
egal(t("sysctl net.ipv4.ip_forward kernel.randomize_va_space"), "net.ipv4.ip_forward = 0\nkernel.randomize_va_space = 2", "99-fort.conf passe après 10-defaut.conf");
s = t("sysctl --system 2>&1");
contient(s, "permission denied", "--system sans sudo");
contient(t("sudo sysctl -p /etc/sysctl.d/99-fort.conf 2>/dev/null"), "net.ipv4.conf.all.rp_filter = 1", "sysctl -p FICHIER");
contient(t("sudo sysctl -p /etc/absent.conf"), "sysctl: cannot open \"/etc/absent.conf\": No such file or directory", "sysctl -p absent");
egal(t("sudo sysctl -p 2>&1"), "", "sysctl -p : sysctl.conf tout en commentaire");
contient(t("sysctl --zut"), "sysctl: invalid option", "sysctl : option inconnue");
t("cd /");
s = t("lsmod");
egal(s.split("\n")[0], "Module                  Size  Used by", "lsmod : l'en-tête");
correspond(s, /^usb_storage\s+81920  0$/m, "lsmod : usb_storage");
correspond(s, /^usbcore\s+348160  1 usb_storage$/m, "lsmod : qui l'utilise");
egal(t("lsmod | grep -c usb_storage"), "3", "lsmod | grep (le module et ceux qu'il utilise)");
contient(t("modprobe -r usb-storage"), "modprobe: ERROR: could not remove 'usb_storage': Operation not permitted", "modprobe -r sans sudo");
egal(t("sudo modprobe -r usb-storage"), "", "sudo modprobe -r usb-storage");
egal(t("lsmod | grep -c usb_storage"), "0", "usb_storage retiré");
verifier(ev("EV.modprobe.action") === "remove" && ev("EV.modprobe.module") === "usb_storage", "événement modprobe remove");
egal(t("sudo modprobe -r usb-storage"), "", "retirer un module absent : rien");
egal(t("modprobe -n -v usb-storage"), "insmod /lib/modules/6.1.0-21-amd64/kernel/drivers/usb/storage/usb-storage.ko ", "modprobe -n -v : ce qu'il ferait");
jeu.lire("poserFichierHote('fort', '/etc/modprobe.d/fort.conf', 'blacklist cramfs\\ninstall usb-storage /bin/false\\ninstall dccp /bin/true\\n')");
egal(t("modprobe -n -v usb-storage"), "install /bin/false ", "modprobe -n -v : la règle install");
s = t("sudo modprobe usb-storage");
contient(s, "Error running install command '/bin/false' for module usb_storage: retcode 1", "install /bin/false : refusé");
contient(s, "modprobe: ERROR: could not insert 'usb_storage': Invalid argument", "install /bin/false : le message de kmod");
verifier(ev("EV.modprobe.bloque") === true, "événement modprobe bloqué");
egal(t("lsmod | grep -c usb_storage"), "0", "toujours pas chargé");
s = t("sudo modprobe cramfs");
contient(s, "blacklist", "blacklist n'empêche pas un chargement explicite (l'astuce le dit)");
contient(t("lsmod"), "cramfs", "cramfs chargé malgré blacklist");
t("sudo modprobe -r cramfs");
egal(t("sudo modprobe dccp; lsmod | grep -c dccp"), "0", "install /bin/true : succès, mais rien de chargé");
contient(t("sudo modprobe uas"), "for module usb_storage", "uas dépend d'usb_storage : la règle install s'applique à la dépendance");
egal(jeu.lire("modulesCharges('fort').indexOf('usb_storage') > -1"), false, "la règle install bloque aussi la dépendance");
t("sudo modprobe -r uas");
contient(t("modprobe -c"), "install usb_storage /bin/false", "modprobe -c");
contient(t("modprobe zzz"), "modprobe: FATAL: Module zzz not found in directory /lib/modules/6.1.0-21-amd64", "module inconnu");
jeu.lire("modulesCharges('fort'); etatHote('fort').modules.unshift('uas'); etatHote('fort').modules.unshift('usb_storage');");
contient(t("sudo modprobe -r usb_storage"), "modprobe: FATAL: Module usb_storage is in use.", "module utilisé par un autre");
t("sudo modprobe -r uas usb_storage");
jeu.lire("etatHote('fort').modules = etatHote('fort').modules.filter(function(m){ return m !== 'uas' && m !== 'usb_storage'; })");

/* ================================================================== */
/* 5. Démarrage : GRUB, cryptsetup                                     */
/* ================================================================== */

s = t("grub-mkpasswd-pbkdf2", ["Une phrase solide", "Une phrase solide"]);
correspond(s, /PBKDF2 hash of your password is grub\.pbkdf2\.sha512\.10000\.[0-9A-F]{128}\.[0-9A-F]{128}/, "grub-mkpasswd-pbkdf2 : le hash");
var hash = /grub\.pbkdf2\.sha512\.10000\.[0-9A-F]+\.[0-9A-F]+/.exec(s)[0];
var hash2 = /grub\.pbkdf2\.sha512\.10000\.[0-9A-F]+\.[0-9A-F]+/.exec(t("grub-mkpasswd-pbkdf2", ["Une phrase solide", "Une phrase solide"]))[0];
egal(hash2, hash, "le hash est déterministe pour un même mot de passe");
absent(hash, "Une", "le mot de passe n'apparaît pas");
verifier(ev("EV.grubMdp.ok") === true, "événement grubMdp");
contient(t("grub-mkpasswd-pbkdf2", ["un", "deux"]), "grub-mkpasswd-pbkdf2: error: passwords don't match.", "mots de passe différents");
correspond(t("echo -e 'abc\\nabc' | grub-mkpasswd-pbkdf2"), /grub\.pbkdf2\.sha512\.10000\./, "grub-mkpasswd-pbkdf2 lit un tuyau");
correspond(t("grub-mkpasswd-pbkdf2 -c 20000", ["x", "x"]), /grub\.pbkdf2\.sha512\.20000\./, "-c : les itérations");
contient(t("update-grub"), "/usr/sbin/grub-mkconfig: 270: cannot create /boot/grub/grub.cfg.new: Permission denied", "update-grub sans sudo");
s = t("sudo update-grub 2>&1");
contient(s, "Generating grub configuration file ...", "update-grub : le début");
contient(s, "Found linux image: /boot/vmlinuz-6.1.0-21-amd64", "update-grub : le noyau");
contient(s, "Warning: os-prober will not be executed", "update-grub : os-prober");
correspond(s, /done$/m, "update-grub : done");
var cfg = t("cat /boot/grub/grub.cfg");
contient(cfg, "# DO NOT EDIT THIS FILE", "grub.cfg régénéré");
contient(cfg, "### BEGIN /etc/grub.d/40_custom ###", "grub.cfg : 40_custom");
contient(cfg, "linux\t/boot/vmlinuz-6.1.0-21-amd64 root=UUID=", "grub.cfg : la ligne linux");
contient(cfg, "set timeout=5", "grub.cfg : GRUB_TIMEOUT");
absent(cfg, "exec tail", "40_custom : les deux premières lignes sautent");
correspond(t("ls -l /boot/grub/grub.cfg"), /^-r--r--r--/, "grub.cfg en 444 sans mot de passe");
verifier(ev("EV.grubUpdate.ok") === true && ev("EV.grubUpdate.protege") === false, "événement grubUpdate sans protection");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/grub.d/40_custom'); it.setText(it.getText() + '\\nset superusers=\"gardien\"\\npassword_pbkdf2 gardien " + hash + "'); })()");
s = t("sudo update-grub");
contient(s, "protégé", "update-grub : le menu est protégé");
verifier(ev("EV.grubUpdate.protege") === true && ev("EV.grubUpdate.superusers") === "gardien", "événement grubUpdate protégé");
contient(t("sudo cat /boot/grub/grub.cfg"), "password_pbkdf2 gardien grub.pbkdf2.sha512", "grub.cfg contient le hash");
correspond(t("ls -l /boot/grub/grub.cfg"), /^-r--------/, "grub.cfg en 400 avec un mot de passe");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/grub.d/40_custom'); it.setText(it.getText() + '\\nmenuentry \"Secours {'); })()");
s = t("sudo update-grub 2>&1");
contient(s, "Syntax errors are detected in generated GRUB config file.", "update-grub : faute de syntaxe");
contient(t("sudo cat /boot/grub/grub.cfg"), "password_pbkdf2", "l'ancien grub.cfg reste");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/grub.d/40_custom'); it.setText(it.getText().replace('\\nmenuentry \"Secours {', '')); it.mode = 'rw-r--r--'; })()");
s = t("sudo update-grub");
contient(s, "Ignorés car non exécutables (chmod +x) : 40_custom", "un script non exécutable est ignoré");
absent(t("sudo cat /boot/grub/grub.cfg"), "password_pbkdf2", "sans le droit x, plus de mot de passe");
jeu.lire("fichierHote('fort', '/etc/grub.d/40_custom').mode = 'rwxr-xr-x'");
t("sudo update-grub");
contient(t("grub-mkconfig 2>/dev/null | grep superusers"), "set superusers=\"gardien\"", "grub-mkconfig sans -o écrit sur la sortie");
s = t("sudo cryptsetup status sda3_crypt");
contient(s, "/dev/mapper/sda3_crypt is active and is in use.", "cryptsetup status");
contient(s, "type:    LUKS2", "status : LUKS2");
contient(s, "cipher:  aes-xts-plain64", "status : le chiffrement");
contient(t("cryptsetup status sda3_crypt"), "Cannot initialize device-mapper", "status sans sudo");
s = t("sudo cryptsetup luksDump /dev/sda3");
contient(s, "LUKS header information", "luksDump");
contient(s, "Version:       \t2", "luksDump : version 2");
contient(s, "PBKDF:      argon2id", "luksDump : argon2id");
contient(s, "UUID:          \t5a1b2c3d-0000-4000-8000-123456789abc", "luksDump : l'UUID de crypttab");
contient(s, "  0: luks2", "luksDump : un keyslot");
contient(t("sudo cryptsetup luksDump /dev/sda1"), "Device /dev/sda1 is not a valid LUKS device.", "luksDump : pas LUKS");
contient(t("sudo cryptsetup luksDump /dev/sdz9"), "does not exist or access denied", "luksDump : disque absent");
egal(t("sudo cryptsetup status autre"), "/dev/mapper/autre is inactive.", "status : nom inconnu");
egal(t("sudo cryptsetup isLuks -v /dev/sda3"), "Command successful.", "isLuks");
contient(t("sudo cryptsetup luksFormat /dev/sda3"), "refusé ici", "luksFormat : refusé");
egal(t("cryptsetup --version"), "cryptsetup 2.6.1 flags: UDEV BLKID KEYRING KERNEL_CAPI", "cryptsetup --version");
verifier(ev("EV['cryptsetup#']") > 3, "événements cryptsetup");

/* ================================================================== */
/* 6. Audit                                                            */
/* ================================================================== */

contient(t("auditctl -l"), "You must be root to run this program.", "auditctl sans sudo");
egal(t("sudo auditctl -l"), "No rules", "auditctl -l : aucune règle");
egal(t("sudo auditctl -w /etc/passwd -p wa -k comptes | cat"), "", "auditctl -w ... -k comptes : silencieux, comme le vrai");
egal(t("sudo auditctl -l"), "-w /etc/passwd -p wa -k comptes", "auditctl -l");
contient(t("sudo auditctl -w /etc/passwd -p wa -k comptes"), "Error sending add rule data request (Rule exists)", "règle en double");
t("sudo auditctl -w /etc/shadow -p aw -k comptes");
egal(t("sudo auditctl -l | tail -1"), "-w /etc/shadow -p wa -k comptes", "les permissions sont rangées dans l'ordre rwxa");
contient(t("sudo auditctl -w /nulle/part/x -p w"), "No such file or directory", "dossier parent absent");
contient(t("sudo auditctl -w /etc/hosts -p z"), "Permission z isn't supported", "permission inconnue");
s = t("sudo auditctl -s");
contient(s, "enabled 1", "auditctl -s : enabled");
correspond(s, /pid \d+/, "auditctl -s : pid");
verifier(ev("EV.auditctl.action") === "status", "événement auditctl");
// Une modification surveillée laisse sa trace, avec le nom du programme
jeu.editer("function(t){ return t + '\\nnouveau:x:1004:1004::/home/nouveau:/bin/bash'; }");
t("sudo nano /etc/passwd");
s = t("sudo ausearch -k comptes");
contient(s, "type=SYSCALL", "ausearch : l'événement");
contient(s, "comm=\"nano\" exe=\"/usr/bin/nano\"", "ausearch : le programme");
contient(s, "key=\"comptes\"", "ausearch : la clé");
contient(s, "name=\"/etc/passwd\"", "ausearch : le fichier");
contient(s, "auid=1000 uid=0", "ausearch : qui (auid), sous quel compte (uid)");
correspond(s, /^time->[A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d\d:\d\d:\d\d \d{4}$/m, "ausearch : la ligne time->");
contient(s, "type=CONFIG_CHANGE", "ausearch : l'ajout des règles aussi");
s = t("sudo ausearch -k comptes -i");
contient(s, "comm=nano exe=/usr/bin/nano", "ausearch -i : lisible");
contient(s, "syscall=openat", "ausearch -i : le nom de l'appel système");
contient(s, "auid=" + jeu.lire("JOUEUR") + " uid=root", "ausearch -i : les noms");
s = t("sudo ausearch -k comptes --format text");
contient(s, jeu.lire("JOUEUR") + ", acting as root, successfully opened-file /etc/passwd using /usr/bin/nano", "ausearch --format text");
t("sudo sed -i 's/^invite::/invite:!:/' /etc/shadow");
contient(t("sudo ausearch -f /etc/shadow -i"), "comm=sed", "sed -i sous sudo");
t("sudo chmod 600 /etc/shadow");
contient(t("sudo ausearch -f /etc/shadow -i"), "syscall=fchmodat", "chmod : changement d'attribut (a)");
t("sudo chmod 640 /etc/shadow");
t("cat /etc/hosts 2>/dev/null; sudo cat /etc/passwd > /dev/null");
absent(t("sudo ausearch -f /etc/passwd -i"), "comm=cat", "une lecture n'est pas notée sans -p r");
t("sudo auditctl -w /etc/sudoers -p r -k lecture");
t("sudo cat /etc/sudoers");
contient(t("sudo ausearch -k lecture -i"), "a2=O_RDONLY", "-p r : la lecture est notée");
egal(t("sudo ausearch -k inexistante 2>/dev/null; echo $?"), "1", "ausearch sans résultat : code 1");
contient(t("sudo ausearch -k inexistante 2>&1"), "<no matches>", "ausearch : <no matches>");
contient(t("ausearch -k comptes"), "Error opening /var/log/audit/audit.log (Permission denied)", "ausearch sans sudo");
contient(t("sudo ausearch -k comptes --start today"), "type=SYSCALL", "--start today");
contient(t("sudo ausearch -k comptes --start 12/31/2099 2>&1"), "<no matches>", "--start dans le futur");
contient(t("sudo ausearch -k comptes --start hier"), "Invalid start time", "--start invalide");
verifier(ev("EV.ausearch.cle") === "comptes", "événement ausearch");
contient(t("sudo cat /var/log/audit/audit.log"), "type=SYSCALL msg=audit(", "le journal d'audit est écrit sur le disque");
s = t("sudo aureport");
contient(s, "Summary Report", "aureport : le résumé");
correspond(s, /Number of changes in configuration: [1-9]/, "aureport : les changements de configuration");
correspond(s, /Number of keys: [1-9]/, "aureport : les clés");
s = t("sudo aureport -f -i");
contient(s, "File Report", "aureport -f");
contient(s, "# date time file syscall success exe auid event", "aureport -f : l'en-tête");
contient(s, "/etc/passwd openat yes /usr/bin/nano " + jeu.lire("JOUEUR"), "aureport -f -i : une ligne");
s = t("sudo aureport -k --summary");
contient(s, "Key Summary Report", "aureport -k --summary");
correspond(s, /^\d+  comptes$/m, "aureport -k --summary : le compte par clé");
contient(t("sudo aureport -au"), "<no events of interest were found>", "aureport -au sans événement");
contient(t("sudo ausearch -k lecture --raw | sudo aureport -f"), "/etc/sudoers", "ausearch --raw | aureport -f");
absent(t("sudo ausearch -k lecture --raw | sudo aureport -f"), "/etc/passwd", "aureport ne garde que ce qui arrive par le tuyau");
verifier(ev("EV.aureport.rapport") === "-f", "événement aureport");
// Le monde ajoute ses propres événements
jeu.lire("ajouterEvenementAudit('fort', { type: 'USER_AUTH', acct: 'invite', adresse: '10.0.66.6', succes: false, comm: 'sshd' })");
s = t("sudo aureport -au -i");
contient(s, "invite 10.0.66.6 ssh /usr/sbin/sshd no", "un événement du monde dans aureport -au");
jeu.lire("auditSous('fort', { comm: 'useradd', auid: 4294967295, uid: 0 }, function(){ var it = fichierHote('fort', '/etc/passwd'); it.setText(it.getText() + '\\nnuee:x:0:0::/root:/bin/bash'); })");
s = t("sudo ausearch -k comptes -i --format text");
contient(s, "unset, acting as root, successfully opened-file /etc/passwd using /usr/sbin/useradd", "auditSous : la trace du monde, avec son programme");
verifier(jeu.lire("ajouterEvenementAudit('fort', { chemin: '/etc/hosts', comm: 'vim' })") === null, "un fichier non surveillé ne laisse pas de trace");
// Les règles permanentes
jeu.lire("poserFichierHote('fort', '/etc/audit/rules.d/fort.rules', '-w /etc/passwd -p wa -k comptes\\n-w /etc/shadow -p wa -k comptes\\n-w /etc/sudoers -p wa -k sudo\\n-a always,exit -F arch=b64 -S execve -k exec\\n')");
egal(t("sudo augenrules --check"), "/usr/sbin/augenrules: Rules have changed and should be updated", "augenrules --check");
s = t("sudo augenrules --load");
contient(s, "No rules", "augenrules --load : le -D du premier fichier");
contient(s, "enabled 1", "augenrules --load : l'état");
s = t("sudo auditctl -l");
egal(s, "-w /etc/passwd -p wa -k comptes\n-w /etc/shadow -p wa -k comptes\n-w /etc/sudoers -p wa -k sudo\n-a always,exit -F arch=b64 -S execve -k exec", "augenrules : les règles de rules.d");
egal(t("sudo augenrules --check"), "/usr/sbin/augenrules: No change", "augenrules --check après chargement");
contient(t("sudo cat /etc/audit/audit.rules"), "-w /etc/sudoers -p wa -k sudo", "audit.rules est assemblé");
verifier(ev("EV.augenrules.ok") === true && ev("EV.augenrules.regles.length") === 4, "événement augenrules");
t("sudo auditctl -D");
egal(t("sudo auditctl -l"), "No rules", "auditctl -D");
t("sudo systemctl restart auditd");
contient(t("sudo auditctl -l"), "-k sudo", "restart auditd recharge rules.d");
t("sudo auditctl -W /etc/sudoers -p wa -k sudo");
absent(t("sudo auditctl -l"), "sudoers", "auditctl -W retire la règle");
contient(t("sudo auditctl -W /etc/sudoers -p wa -k sudo"), "No such file or directory", "retirer une règle absente");
t("sudo auditctl -e 2");
contient(t("sudo auditctl -w /etc/hosts -p wa"), "Operation not permitted", "-e 2 : plus aucun changement");
contient(t("sudo augenrules --load"), "immutable", "-e 2 : augenrules refuse aussi");
jeu.lire("redemarrerGuet('fort')");
contient(t("sudo auditctl -s"), "enabled 1", "au redémarrage, le verrou tombe (et rules.d est relu)");
contient(t("sudo auditctl -l"), "-k sudo", "au redémarrage, les règles permanentes reviennent");
jeu.lire("arreterService('fort', 'auditd')");
t("sudo touch /etc/passwd2; sudo chmod 600 /etc/shadow");
var avantArret = t("sudo ausearch -k comptes -i | grep -c fchmodat");
jeu.lire("demarrerService('fort', 'auditd')");
egal(t("sudo ausearch -k comptes -i | grep -c fchmodat"), avantArret, "auditd arrêté : rien n'est noté");
t("sudo chmod 640 /etc/shadow");

/* ================================================================== */
/* 7. Journaux : logger, rsyslog, logrotate, journald                 */
/* ================================================================== */

egal(t("logger -t garde -p auth.warning 'Test de la Tour'"), "", "logger");
verifier(ev("EV.logger.priorite") === "auth.warning" && ev("EV.logger.tag") === "garde", "événement logger");
contient(t("sudo journalctl -t garde"), "fort garde: Test de la Tour", "journalctl -t");
contient(t("sudo cat /var/log/auth.log"), "fort garde: Test de la Tour", "auth.* va dans auth.log");
absent(t("sudo cat /var/log/syslog 2>&1"), "Test de la Tour", "auth.none : pas dans syslog");
t("logger 'message ordinaire'");
contient(t("sudo cat /var/log/syslog"), "message ordinaire", "user.notice va dans syslog");
correspond(t("sudo tail -1 /var/log/syslog"), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}[+-]\d\d:\d\d fort \S+: message ordinaire$/, "syslog : le format RFC 3339 de Debian 12");
contient(t("logger -p rien.info x"), "logger: unknown facility name: rien", "facility inconnue");
contient(t("logger -p user.bavard x"), "logger: unknown priority name: bavard", "priorité inconnue");
t("echo -e 'ligne un\\nligne deux' | logger -t tuyau");
egal(t("sudo journalctl -t tuyau | wc -l").trim(), "2", "logger lit un tuyau ligne à ligne");
contient(t("sudo journalctl -p warning"), "Test de la Tour", "journalctl -p");
absent(t("sudo journalctl -p err"), "Test de la Tour", "journalctl -p err filtre");
contient(t("sudo journalctl"), "Started Journal Service.", "le journal de la machine reste là");
s = t("rsyslogd -N1 2>&1");
contient(s, "rsyslogd: version 8.2302.0, config validation run (level 1), master config /etc/rsyslog.conf", "rsyslogd -N1");
contient(s, "rsyslogd: End of config validation run. Bye.", "rsyslogd -N1 : valide");
jeu.lire("poserFichierHote('fort', '/etc/rsyslog.d/90-distant.conf', '*.* @@journaux:514\\n')");
contient(t("rsyslogd -N1 2>&1"), "Bye.", "règle distante valide");
verifier(ev("EV.rsyslog.distants.indexOf('journaux:514')") > -1, "événement rsyslog check");
t("logger 'avant restart'");
verifier(jeu.lire("Object.keys(journauxDistants('fort')).length") === 0, "pas encore relu : rien ne part");
t("sudo systemctl restart rsyslog");
t("logger -t envoi 'vers les journaux'");
contient(jeu.lire("journauxDistants('fort')['journaux:514'].join('\\n')"), "envoi: vers les journaux", "après restart : la ligne part vers journaux:514");
verifier(ev("EV.rsyslog.action") === "forward", "événement rsyslog forward");
jeu.lire("poserFichierHote('fort', '/etc/rsyslog.d/91-faute.conf', 'kern.bavard /var/log/x\\n$Inconnue on\\nmail.* @@serveur:port\\nuser.*\\n')");
s = t("rsyslogd -N1 2>&1");
contient(s, "rsyslogd: unknown priority name \"bavard\"", "rsyslog : priorité inconnue");
contient(s, "invalid or yet-unknown config file command 'Inconnue'", "rsyslog : directive inconnue");
contient(s, "invalid port \"port\"", "rsyslog : port invalide");
contient(s, "syntax error", "rsyslog : ligne sans action");
absent(s, "Bye.", "rsyslog en faute : pas de Bye");
egal(code("rsyslogd -N1"), 1, "rsyslogd -N1 en faute : code 1");
jeu.lire("supprimerFichierHote('fort', '/etc/rsyslog.d/91-faute.conf')");
contient(t("rsyslogd"), "already exist", "rsyslogd tout seul : déjà lancé");
s = t("logrotate -d /etc/logrotate.d/fort");
contient(s, "warning: logrotate in debug mode does nothing except printing debug messages!", "logrotate -d : l'avertissement");
contient(s, "reading config file /etc/logrotate.d/fort", "logrotate -d : la lecture");
contient(s, "rotating pattern: /var/log/fort/*.log  weekly (2 rotations)", "logrotate -d : le motif");
contient(s, "empty log files are not rotated, old logs are removed", "logrotate -d : notifempty");
contient(s, "considering log /var/log/fort/acces.log", "logrotate -d : le fichier");
contient(s, "log does not need rotating (log is empty)", "logrotate -d : le vide");
egal(t("ls /var/log/fort | wc -l").trim(), "2", "logrotate -d ne touche à rien");
verifier(ev("EV.logrotate.debug") === true, "événement logrotate");
s = t("sudo logrotate -d -f /etc/logrotate.d/fort");
contient(s, "forced from command line (2 rotations)", "logrotate -d -f");
contient(s, "renaming /var/log/fort/acces.log to /var/log/fort/acces.log.1", "logrotate -d -f : ce qu'il ferait");
egal(t("ls /var/log/fort | wc -l").trim(), "2", "-d -f ne fait toujours rien");
contient(t("logrotate -f /etc/logrotate.d/fort 2>&1"), "Permission denied", "logrotate -f sans sudo : refusé");
egal(t("sudo logrotate -f /etc/logrotate.d/fort"), "", "sudo logrotate -f");
egal(t("ls /var/log/fort | cat").split("\n").sort().join(" "), "acces.log acces.log.1 vide.log", "après rotation : acces.log.1");
egal(t("sudo cat /var/log/fort/acces.log.1 | head -1"), "GET / 200", "acces.log.1 a l'ancien contenu");
egal(t("sudo cat /var/log/fort/acces.log"), "", "acces.log est recréé, vide");
correspond(t("ls -l /var/log/fort/acces.log"), /^-rw-r-----/, "create 0640");
jeu.lire("fichierHote('fort', '/var/log/fort/acces.log').setText('GET /nouveau 200')");
t("sudo logrotate -f /etc/logrotate.d/fort");
egal(t("ls /var/log/fort | cat").split("\n").sort().join(" "), "acces.log acces.log.1 acces.log.2.gz vide.log", "delaycompress : l'ancien .1 devient .2.gz");
egal(t("sudo zcat /var/log/fort/acces.log.2.gz | head -1"), "GET / 200", "le .gz se relit avec zcat");
verifier(ev("EV.logrotate.fichiers.length") === 1, "événement logrotate force");
contient(t("sudo cat /var/lib/logrotate/status"), "\"/var/log/fort/acces.log\"", "l'état de logrotate est écrit");
jeu.lire("fichierHote('fort', '/etc/logrotate.d/fort').mode = 'rw-rw-rw-'");
contient(t("logrotate -d /etc/logrotate.d/fort 2>&1"), "error: Ignoring /etc/logrotate.d/fort because of bad file mode - must be 0644 or 0444.", "une configuration modifiable par tous est ignorée");
jeu.lire("fichierHote('fort', '/etc/logrotate.d/fort').mode = 'rw-r--r--'");
jeu.lire("poserFichierHote('fort', '/etc/logrotate.d/faute', '/var/log/absent.log {\\n\\tdaily\\n\\trotatte 3\\n}\\n')");
s = t("logrotate -d /etc/logrotate.d/faute 2>&1");
contient(s, "error: /etc/logrotate.d/faute:3 unknown option 'rotatte' -- ignoring line", "logrotate : option inconnue");
contient(s, "error: stat of /var/log/absent.log failed: No such file or directory", "logrotate : journal absent sans missingok");
jeu.lire("supprimerFichierHote('fort', '/etc/logrotate.d/faute')");
s = t("journalctl --disk-usage");
contient(s, "Archived and active journals take 8.0M in the file system.", "journalctl --disk-usage");
contient(s, "volatil", "--disk-usage : l'astuce sur le stockage volatil");
contient(t("sudo journalctl --header"), "File path: /run/log/journal/", "--header : en mémoire");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/systemd/journald.conf'); it.setText(it.getText().replace('#Storage=auto', 'Storage=persistent')); })()");
contient(t("sudo journalctl --header"), "/run/log/journal/", "journald.conf modifié, pas redémarré");
contient(t("sudo systemctl reload systemd-journald"), "Job type reload is not applicable", "journald ne se recharge pas");
egal(t("sudo systemctl restart systemd-journald"), "", "restart systemd-journald");
contient(t("sudo journalctl --header"), "File path: /var/log/journal/", "après restart : persistant");
contient(t("ls /var/log"), "journal", "/var/log/journal est créé");
verifier(ev("EV.journald.stockage") === "persistent", "événement journald");
contient(t("journalctl --disk-usage"), "24.0M", "--disk-usage persistant");
egal(t("sudo journalctl --flush"), "", "journalctl --flush");
contient(t("journalctl --vacuum-size=10M"), "Permission denied", "--vacuum sans sudo");

/* L'heure */
s = t("timedatectl");
contient(s, "System clock synchronized: no", "timedatectl : pas synchronisé (chrony arrêté)");
contient(s, "NTP service: inactive", "timedatectl : NTP inactif");
contient(s, "Time zone: Europe/Paris", "timedatectl : le fuseau");
contient(t("chronyc tracking"), "506 Cannot talk to daemon", "chronyc : chrony arrêté");
contient(t("timedatectl set-ntp true"), "Failed to set ntp: Access denied", "set-ntp sans sudo");
egal(t("sudo timedatectl set-ntp true"), "", "sudo timedatectl set-ntp true");
verifier(ev("EV.timedatectl.action") === "set-ntp" && ev("EV.timedatectl.oui") === true, "événement timedatectl");
contient(t("timedatectl status"), "System clock synchronized: yes", "synchronisé");
contient(t("timedatectl"), "NTP service: active", "NTP actif");
contient(t("systemctl status chrony"), "enabled", "set-ntp true active aussi chrony au démarrage");
s = t("chronyc tracking");
contient(s, "Leap status     : Normal", "chronyc tracking");
contient(s, "Stratum         : 3", "chronyc tracking : la strate");
s = t("chronyc sources");
contient(s, "MS Name/IP address         Stratum Poll Reach LastRx Last sample", "chronyc sources : l'en-tête");
contient(s, "^* ntp1.debian.pool.ntp.org", "chronyc sources : la source suivie");
egal(t("chronyc sources | grep -c '^\\^'"), "4", "le pool donne quatre sources");
contient(t("chronyc activity"), "4 sources online", "chronyc activity");
verifier(ev("EV.chronycGuet.action") === "activity", "événement chronycGuet");
contient(t("timedatectl show"), "NTPSynchronized=yes", "timedatectl show");
contient(t("timedatectl set-time 12:00"), "Automatic time synchronization is enabled", "set-time refusé avec NTP");
t("sudo timedatectl set-ntp false");
contient(t("timedatectl"), "System clock synchronized: no", "set-ntp false");
t("sudo timedatectl set-ntp true");

/* ================================================================== */
/* 8. Protections : AppArmor, fail2ban, rkhunter                       */
/* ================================================================== */

contient(t("aa-status"), "You do not have enough privilege to read the profile set.", "aa-status sans sudo");
s = t("sudo aa-status");
contient(s, "apparmor module is loaded.", "aa-status");
contient(s, "2 profiles are loaded.", "aa-status : deux profils");
contient(s, "1 profiles are in complain mode.\n   /usr/sbin/apache2", "aa-status : apache2 en complain");
correspond(s, /1 processes are in complain mode\.\n   \/usr\/sbin\/apache2 \(\d+\) /, "aa-status : le processus d'apache2");
contient(t("aa-enforce /etc/apparmor.d/usr.sbin.apache2"), "Permission denied", "aa-enforce sans sudo");
egal(t("sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2"), "Setting /etc/apparmor.d/usr.sbin.apache2 to enforce mode.", "aa-enforce");
verifier(ev("EV.apparmor.action") === "enforce" && ev("EV.apparmor.profil") === "/usr/sbin/apache2", "événement apparmor");
contient(t("cat /etc/apparmor.d/usr.sbin.apache2"), "/usr/sbin/apache2 flags=(attach_disconnected) {", "aa-enforce réécrit les drapeaux du profil");
contient(t("sudo aa-status"), "2 profiles are in enforce mode.", "les deux profils en enforce");
egal(t("sudo aa-complain /usr/sbin/chronyd"), "Setting /etc/apparmor.d/usr.sbin.chronyd to complain mode.", "aa-complain par le programme");
contient(t("cat /etc/apparmor.d/usr.sbin.chronyd"), "/usr/sbin/chronyd flags=(complain) {", "aa-complain ajoute flags=(complain)");
egal(t("sudo aa-enforce /usr/sbin/inconnu"), "Profile for /usr/sbin/inconnu not found, skipping", "profil introuvable");
egal(t("sudo aa-disable usr.sbin.chronyd"), "Disabling /etc/apparmor.d/usr.sbin.chronyd.", "aa-disable");
contient(t("sudo aa-status"), "1 profiles are loaded.", "aa-disable : déchargé");
contient(t("ls -l /etc/apparmor.d/disable"), "usr.sbin.chronyd -> ../usr.sbin.chronyd", "aa-disable : le lien");
egal(t("sudo aa-enforce usr.sbin.chronyd"), "Setting /etc/apparmor.d/usr.sbin.chronyd to enforce mode.", "aa-enforce réactive");
absent(t("ls /etc/apparmor.d/disable"), "chronyd", "aa-enforce retire le lien disable");
egal(t("sudo aa-status --enforced"), "2", "aa-status --enforced");
contient(t("fail2ban-client status"), "you must be root", "fail2ban sans sudo");
s = t("sudo fail2ban-client status");
contient(s, "Number of jail:\t0", "aucune prison active");
jeu.lire("poserFichierHote('fort', '/etc/fail2ban/jail.local', '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 1h\\n')");
egal(t("sudo fail2ban-client status | tail -1"), "`- Jail list:\t", "jail.local écrit, pas rechargé");
egal(t("sudo fail2ban-client reload"), "OK", "fail2ban-client reload");
s = t("sudo fail2ban-client status");
contient(s, "Number of jail:\t1", "une prison");
contient(s, "Jail list:\tsshd", "la prison sshd");
s = t("sudo fail2ban-client status sshd");
contient(s, "Status for the jail: sshd", "status sshd");
contient(s, "Currently banned:\t0", "personne n'est banni");
egal(t("sudo fail2ban-client get sshd maxretry"), "3", "get maxretry");
egal(t("sudo fail2ban-client get sshd bantime"), "3600", "get bantime (1h)");
jeu.lire("fail2banEchec('fort', 'sshd', '10.0.66.6', 2)");
contient(t("sudo fail2ban-client status sshd"), "Currently failed:\t1", "deux échecs : pas encore banni");
verifier(jeu.lire("fail2banEchec('fort', 'sshd', '10.0.66.6')") === true, "le troisième échec bannit");
s = t("sudo fail2ban-client status sshd");
contient(s, "Banned IP list:\t10.0.66.6", "l'adresse est bannie");
contient(s, "Total failed:\t3", "trois échecs au total");
egal(t("sudo fail2ban-client banned"), "[{'sshd': ['10.0.66.6']}]", "fail2ban-client banned");
egal(t("sudo fail2ban-client set sshd unbanip 10.0.66.6"), "1", "unbanip");
contient(t("sudo fail2ban-client set sshd unbanip 10.0.66.6"), "is not banned", "unbanip d'une adresse libre");
egal(t("sudo fail2ban-client set sshd banip 10.0.66.7"), "1", "banip");
contient(t("sudo fail2ban-client status apache"), "Sorry but the jail 'apache' does not exist", "prison inconnue");
jeu.lire("poserFichierHote('fort', '/etc/fail2ban/jail.local', '[sshd]\\nenabled = true\\nbantime = beaucoup\\n')");
contient(t("sudo fail2ban-client reload"), "Wrong value for 'bantime'", "reload d'une configuration fausse");
egal(t("sudo fail2ban-client get sshd maxretry"), "3", "l'ancienne configuration reste");
jeu.lire("poserFichierHote('fort', '/etc/fail2ban/jail.local', '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 1h\\n[maison]\\nenabled = true\\n')");
contient(t("sudo fail2ban-client reload"), "Found no accessible config files for 'filter.d/maison'", "prison sans filtre");
jeu.lire("poserFichierHote('fort', '/etc/fail2ban/jail.local', '[sshd]\\nenabled = true\\nmaxretry = 3\\nbantime = 1h\\n')");
t("sudo fail2ban-client reload");
egal(t("sudo fail2ban-client ping"), "Server replied: pong", "ping");
verifier(ev("EV.fail2ban.hote") === "fort", "événement fail2ban");
jeu.lire("arreterService('fort', 'fail2ban')");
contient(t("sudo fail2ban-client status"), "Is fail2ban running?", "fail2ban arrêté");
jeu.lire("demarrerService('fort', 'fail2ban')");
contient(t("rkhunter --check --sk"), "You must be the root user to run this program.", "rkhunter sans sudo");
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/shadow'); it.setText(it.getText().replace('invite:!:', 'invite::')); })()");
s = t("sudo rkhunter --check --sk");
contient(s, "[ Rootkit Hunter version 1.4.6 ]", "rkhunter");
correspond(s, /\/usr\/bin\/ping\s+\[ OK \]/, "rkhunter : un binaire d'origine est OK");
correspond(s, /Checking for root equivalent \(UID 0\) accounts\s+\[ Warning \]/, "rkhunter : un second UID 0");
correspond(s, /Checking if SSH root access is allowed\s+\[ Warning \]/, "rkhunter : PermitRootLogin yes");
correspond(s, /Checking for passwordless accounts\s+\[ Warning \]/, "rkhunter : compte sans mot de passe");
contient(s, "One or more warnings have been found while checking the system.", "rkhunter : le bilan");
verifier(ev("EV.rkhunter.alertes") >= 3, "événement rkhunter");
contient(t("sudo cat /var/log/rkhunter.log"), "Warning:", "rkhunter écrit son journal");
t("sudo rkhunter --propupd");
jeu.lire("fichierHote('fort', '/usr/bin/ping').setText('ELF piégé')");
contient(t("sudo rkhunter --check --sk --rwo"), "File /usr/bin/ping has changed", "rkhunter --propupd puis un binaire modifié");

/* ================================================================== */
/* 9. La Pierre d'Inspection                                           */
/* ================================================================== */

s = t("sudo lynis audit system");
contient(s, "[ Lynis 3.0.8 ]", "lynis : la bannière");
contient(s, "[+] SSH Support", "lynis : une section");
correspond(s, /  - Checking SSH option PermitRootLogin\s+\[ WARNING \]/, "lynis : PermitRootLogin en WARNING");
correspond(s, /  - Checking Apache ServerTokens\s+\[ OK \]/, "lynis : ServerTokens Prod en OK (configuration active)");
correspond(s, /  - Checking \/tmp mount options \(nodev,nosuid,noexec\)\s+\[ OK \]/, "lynis : /tmp noexec en OK");
correspond(s, /  - Checking users with an UID of zero\s+\[ WARNING \]/, "lynis : UID 0 multiples");
contient(s, "! Root can directly login via SSH [SSH-7408]", "lynis : la liste des warnings");
contient(s, "- Details  : PermitRootLogin (set YES to NO)", "lynis : le détail");
correspond(s, /  Hardening index : \d+ \[#* *\]/, "lynis : le Hardening index");
contient(s, "Test and debug information      : /var/log/lynis.log", "lynis : les fichiers");
var score1 = ev("EV.lynis.score");
verifier(typeof score1 === "number" && score1 > 0 && score1 < 100, "événement lynis : un score entre 0 et 100 (" + score1 + ")");
verifier(ev("EV.lynis.controles.length") > 40, "événement lynis : la liste des contrôles");
egal(jeu.lire("scoreLynis('fort').score"), score1, "scoreLynis donne le même score");
var barre = /Hardening index : (\d+) \[(#*) *\]/.exec(sansCouleur(s));
egal(barre[2].length, Math.floor(+barre[1] / 5), "la barre : un # par tranche de 5");
contient(t("sudo cat /var/log/lynis.log"), "Performing test ID SSH-7408:PermitRootLogin", "lynis.log");
contient(t("sudo cat /var/log/lynis-report.dat"), "hardening_index=" + score1, "lynis-report.dat");
contient(t("sudo cat /var/log/lynis-report.dat"), "warning[]=SSH-7408|Root can directly login via SSH|", "lynis-report.dat : les warnings");
contient(t("lynis show details SSH-7408"), "Result: Warning: Root can directly login via SSH", "lynis show details");
egal(t("lynis --version"), "3.0.8", "lynis --version");
egal(t("sudo lynis audit system | grep 'Hardening index'").trim(), "Hardening index : " + score1 + " [" + barre[2] + new Array(21 - barre[2].length).join(" ") + "]", "lynis | grep Hardening");
contient(t("lynis"), "audit system", "lynis sans commande : l'usage");
s = t("lynis audit system");
contient(s, "Non-privileged scan mode", "lynis sans sudo : prévenu");
// Durcir : le score monte
jeu.lire("(function(){ var it = fichierHote('fort', '/etc/ssh/sshd_config'); it.setText(it.getText().replace('PermitRootLogin yes', 'PermitRootLogin no')); })()");
jeu.lire("(function(){ var p = fichierHote('fort', '/etc/passwd'); p.setText(p.getText().split('\\n').filter(function(l){ return !/^(toor|nuee|pirate):/.test(l); }).join('\\n')); var s = fichierHote('fort', '/etc/shadow'); s.setText(s.getText().replace('invite::', 'invite:!:').split('\\n').filter(function(l){ return !/^(toor|pirate):/.test(l); }).join('\\n')); s.mode = 'rw-r-----'; })()");
t("sudo lynis audit system");
var score2 = ev("EV.lynis.score");
verifier(score2 > score1, "le score monte après durcissement (" + score1 + " -> " + score2 + ")");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'SSH-7408:PermitRootLogin'; })[0].ok") === true, "PermitRootLogin passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'AUTH-9204'; })[0].ok") === true, "UID 0 passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'AUTH-9283'; })[0].ok") === true, "comptes sans mot de passe : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'FILE-7524'; })[0].ok") === true, "shadow 640 : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'HTTP-6660'; })[0].ok") === true, "TLS 1.0/1.1 coupés : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'CRYP-7902'; })[0].ok") === true, "certificat neuf : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'HTTP-6650'; })[0].ok") === true, "autoindex coupé : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'BOOT-5122'; })[0].ok") === true, "GRUB protégé : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'USB-1000'; })[0].ok") === true, "usb-storage bloqué : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'TIME-3104'; })[0].ok") === true, "NTP : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'MACF-6208'; })[0].ok") === true, "AppArmor enforce : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'TOOL-5190'; })[0].ok") === true, "fail2ban sshd : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'LOGG-2138'; })[0].ok") === true, "journald persistant : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'LOGG-2154'; })[0].ok") === true, "rsyslog distant : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'ACCT-9630'; })[0].ok") === true, "règles d'audit : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'KRNL-6000:kernel.kptr_restrict'; })[0].ok") === true, "kptr_restrict : passe");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'BOOT-5264'; })[0].ok") === false, "telnet.socket actif : échoue");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'FILE-7528'; })[0].ok") === false, "SUID inattendu (/usr/local/bin/outil) : échoue");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'BOOT-5180'; })[0].ok") === false, "ctrl-alt-del non masqué : échoue");
verifier(ev("EV.lynis.controles.filter(function(c){ return c.id === 'PKGS-7392'; }).length") === 0, "paquets : non applicable sans source");
jeu.lire("poserFichierHote('fort', '/etc/systemd/system/ctrl-alt-del.target', null, { lien: '/dev/null' })");
verifier(jeu.lire("scoreLynis('fort').controles.filter(function(c){ return c.id === 'BOOT-5180'; })[0].ok") === true, "ctrl-alt-del masqué (lien vers /dev/null) : passe");
jeu.lire("SOURCES_GUET.paquetsEnRetard = function(h){ return h === 'fort' ? 3 : null; }");
verifier(jeu.lire("scoreLynis('fort').controles.filter(function(c){ return c.id === 'PKGS-7392'; })[0].ok") === false, "une source branchée : paquets en retard");
jeu.lire("SOURCES_GUET.paquetsEnRetard = null");
// Un contrôle déclaré par le monde
jeu.lire("declarerControleLynis({ id: 'BAST-0001', section: 'Boot and services', libelle: 'Checking the drawbridge', poids: 5, gravite: 'warning', conseil: 'Raise the drawbridge', verifier: function(h){ return !!fichierHote(h, '/etc/pont-leve'); } })");
s = t("sudo lynis audit system");
correspond(s, /  - Checking the drawbridge\s+\[ WARNING \]/, "declarerControleLynis : le contrôle apparaît");
contient(s, "! Raise the drawbridge [BAST-0001]", "declarerControleLynis : son conseil");
var score3 = ev("EV.lynis.score");
jeu.lire("poserFichierHote('fort', '/etc/pont-leve', 'oui')");
t("sudo lynis audit system");
verifier(ev("EV.lynis.score") > score3, "le contrôle du monde compte dans le score");
jeu.lire("retirerControleLynis('BAST-0001')");
absent(t("sudo lynis audit system"), "drawbridge", "retirerControleLynis");
egal(jeu.lire("scoreLynis('fort', function(c){ return c.id === 'AUTH-9204'; }).score"), 100, "scoreLynis avec un filtre");
contient(t("sudo lynis audit system --tests AUTH-9204"), "Tests performed : 1", "lynis --tests");

/* ================================================================== */
/* 10. Le manuel, le barème, les listes                                */
/* ================================================================== */

jeu.lire("SORTS_GUET").forEach(function(sort){
	verifier(jeu.lire("!!MANUEL[" + JSON.stringify(sort) + "] && MANUEL[" + JSON.stringify(sort) + "].page.length > 80"), "page de manuel pour " + sort);
	verifier(jeu.lire("COMMANDES_REELLES.indexOf(" + JSON.stringify(sort) + ") === -1"), sort + " n'est plus une « vraie commande absente de ce monde »");
	verifier(jeu.lire("typeof Shell.sorts[" + JSON.stringify(sort) + "] === 'function'"), sort + " existe");
});
contient(t("man lynis"), "Hardening index", "man lynis");
contient(t("apachectl --help"), "configtest", "--help montre la page");
contient(t("man curl"), "ServerTokens", "la page de curl est complétée");
contient(t("man openssl"), "-checkend", "la page d'openssl est complétée");
contient(t("man sysctl"), "--system", "la page de sysctl est complétée");
var tirets = jeu.lire("Object.keys(MANUEL).filter(function(k){ return /\\u2014/.test(MANUEL[k].page + MANUEL[k].resume + MANUEL[k].titre); }).join(' ')");
egal(tirets, "", "pas de tiret cadratin dans le manuel");
var source = require("fs").readFileSync(require("path").join(__dirname, "..", "Web", "static", "javascript", "SortsGuet.js"), "utf8");
verifier(source.indexOf("\u2014") === -1, "pas de tiret cadratin dans SortsGuet.js");
verifier(source.indexOf("CyberSup") === -1, "Cybersup s'écrit avec un s minuscule");
verifier(!/\beval\s*\(|new Function\s*\(/.test(source), "ni eval ni Function");
var xpAvant = jeu.lire("state.xp");
jeu.lire("delete state.usages.lsmod");
t("lsmod");
verifier(jeu.lire("state.xp") === xpAvant && jeu.lire("state.usages.lsmod === true"), "hors barème : pas d'XP de premier usage");
jeu.lire("delete state.spells.lynis");
contient(t("lynis --version"), "Tu ne connais pas encore le sort « lynis »", "lynis s'apprend comme les autres sorts");
jeu.lire("state.spells.lynis = true");

/* ================================================================== */
/* 11. Ailleurs : les anciens sorts gardent leur comportement          */
/* ================================================================== */

t("cd ~");
contient(t("apachectl configtest"), "command not found", "apachectl dans la Maison");
contient(t("sysctl net.ipv4.ip_forward"), "net.ipv4.ip_forward = 0", "sysctl ailleurs : l'ancien sort");
contient(t("chronyc tracking"), "506 Cannot talk to daemon", "chronyc ailleurs : l'ancien sort");
contient(t("auditctl -l"), "command not found", "auditctl dans la Maison");
contient(t("mount"), "ta Maison", "mount dans la Maison");
contient(t("lynis audit system"), "command not found", "lynis dans la Maison");
contient(t("curl http://web/robots.txt 2>&1"), "Disallow: /brouillons/", "curl vers une autre machine : l'ancien sort");
verifier(ev("EV.curl.guet") === undefined && ev("EV.curl.chemin") === "/robots.txt", "curl vers web : l'événement de l'ancien sort");
contient(t("openssl x509 -noout -dates"), "openssl x509 : quel certificat ?", "openssl x509 ailleurs : l'ancien message");
contient(t("timedatectl"), "System clock synchronized: yes", "timedatectl ailleurs");
egal(jeu.lire("Shell.hote()"), "terminus", "de retour à la Maison");
s = t("curl -k -I https://fort/");
contient(s, "Server: Apache\n", "curl depuis la Maison vers le fort");
contient(t("openssl s_client -connect fort:443 -tls1_2"), "Protocol  : TLSv1.2", "s_client depuis la Maison");
jeu.lire("SOURCES_GUET.portJoignable = function(source, cible, port){ return !(cible === 'fort' && port === 443); }");
contient(t("curl -k https://fort/"), "curl: (28) Failed to connect to fort port 443 after 130000 ms: Connection timed out", "un pare-feu branché : le port ne répond plus");
jeu.lire("SOURCES_GUET.portJoignable = null");

/* ================================================================== */
/* 12. Sauvegarde et rechargement                                      */
/* ================================================================== */

t("ssh fort");
t("sudo setcap cap_net_bind_service=+ep /usr/local/bin/outil");
t("sudo sysctl -w vm.swappiness=10");
t("sudo modprobe -r usb_storage; sudo modprobe floppy");
t("sudo auditctl -w /etc/hosts -p wa -k hotes");
var etatsAvant = { regles: t("sudo auditctl -l"), mount: t("findmnt -n -o OPTIONS /tmp"), lsmod: t("lsmod"), apache: t("curl -kI https://fort/ | grep -v Date"), aa: t("sudo aa-status"), f2b: t("sudo fail2ban-client status sshd"), journal: t("sudo journalctl -t envoi") };
jeu.lire("state.save()");
var jeu2 = monde.nouveauMonde(STOCKAGE);
jeu2.lire(TOUS + ".forEach(function(s){ state.spells[s] = true; state.usages[s] = true; }); state.set('sudoOK'); Shell.fin = function(){ Shell.narration = []; };");
jeu2.lire(MONTER);
jeu2.lire("state.load(); current_room = state.getCurrentRoom();");
var t2 = function(l, r){ return jeu2.taper(l, r); };
egal(jeu2.lire("Shell.hote()"), "fort", "rechargement : toujours sur le fort");
egal(t2("getcap /usr/local/bin/outil"), "/usr/local/bin/outil cap_net_bind_service=ep", "rechargement : la capacité est restée sur l'objet");
egal(t2("sysctl -n vm.swappiness"), "10", "rechargement : la valeur du noyau");
egal(t2("sudo auditctl -l"), etatsAvant.regles, "rechargement : les règles d'audit chargées");
egal(t2("findmnt -n -o OPTIONS /tmp"), etatsAvant.mount, "rechargement : les montages");
egal(t2("lsmod"), etatsAvant.lsmod, "rechargement : les modules");
egal(t2("curl -kI https://fort/ | grep -v Date"), etatsAvant.apache, "rechargement : la configuration active d'Apache");
egal(t2("sudo aa-status"), etatsAvant.aa, "rechargement : AppArmor");
egal(t2("sudo fail2ban-client status sshd"), etatsAvant.f2b, "rechargement : fail2ban");
egal(t2("sudo journalctl -t envoi"), etatsAvant.journal, "rechargement : le journal");
contient(t2("ls -l /etc/apache2/mods-enabled/headers.load"), "-> ../mods-available/headers.load", "rechargement : les liens relatifs");
contient(t2("cat /etc/apache2/mods-enabled/headers.load"), "LoadModule headers_module", "rechargement : on suit le lien relatif");
contient(t2("sudo ausearch -k comptes --format text"), "using /usr/bin/nano", "rechargement : le journal d'audit");
contient(t2("lynis show details AUTH-9204"), "Performing test ID AUTH-9204", "rechargement : le dernier passage de lynis");
contient(t2("timedatectl"), "System clock synchronized: yes", "rechargement : l'heure");
contient(t2("sudo journalctl --header"), "/var/log/journal/", "rechargement : journald persistant");
t2("cd /tmp");
contient(t2("./lancer.sh"), "Permission denied", "rechargement : noexec appliqué");
t2("sudo touch /etc/hosts");
contient(t2("sudo ausearch -k hotes -i"), "comm=touch", "rechargement : l'audit continue de surveiller");

/* ================================================================== */
/* 13. Robustesse : des lignes au hasard, jamais d'exception JavaScript */
/* ================================================================== */

var graine = 77;
function hasard(){ graine = (graine * 48271) % 2147483647; return graine / 2147483647; }
function choix(l){ return l[Math.floor(hasard() * l.length)]; }
var sorts = jeu2.lire("SORTS_GUET").concat(["curl", "openssl", "sysctl", "systemctl", "journalctl", "timedatectl", "chronyc", "fail2ban-client", "rkhunter"]);
var bouts = ["", "-a", "-l", "-r", "-n", "-v", "-t", "-p", "-w", "-k comptes", "-f", "-i", "-o remount", "-S", "-M", "configtest", "status", "reload", "restart apache2", "audit system",
	"show details", "/", "/tmp", "/etc/passwd", "headers", "autoindex", "ssl", "usb-storage", "x509", "s_client", "-connect", "fort:443", "-tls1_1", "-in", "/etc/ssl/certs/fort.pem",
	"https://fort/", "http://fort/", "-X", "TRACE", "-I", "net.ipv4.ip_forward=1", "--system", "set-ntp", "true", "tracking", "sources", "sshd", "banip", "1.2.3.4", "--check",
	"--sk", "luksDump", "/dev/sda3", "-e", "2", "--load", "-D", "-W", "--format", "text", "'", "\"", "|", "--", "*", "-o", "OPTIONS", "--fstab", "-d", "/etc/logrotate.d/fort", "-N1"];
var plantages = 0;
for (var n = 0; n < 400; n++){
	var ligne = (choix([true, false]) ? "sudo " : "") + choix(sorts) + " " + choix(bouts) + " " + choix(bouts) + (choix([true, false, false]) ? " " + choix(bouts) : "");
	try { jeu2.taper(ligne, ["x", "x"]); } catch (e){ plantages++; console.log("PLANTAGE : " + ligne + "\n" + (e && e.stack || e)); }
}
egal(plantages, 0, "400 lignes au hasard sans exception JavaScript");

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
