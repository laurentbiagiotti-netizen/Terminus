/**
 * Les sorts du Bastion, première moitié (SortsBastion.js) : comptes, sudo, planification, SSH, services, paquets.
 *
 * Un petit monde de test pose une machine « bastion » avec de vrais fichiers de configuration (Debian 12), ses unités
 * systemd, ses ports et ses paquets ; chaque sort doit lire cet état au moment où on le lance, répondre comme le vrai
 * outil, et garder ce qu'il change dans la sauvegarde.
 *
 * Lancer : node tests/bastion-moteur-a.js      (-v pour tout voir)
 */
var monde = require("./monde.js");
var fs = require("fs"), path = require("path");
var bavard = process.argv.indexOf("-v") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(obtenu, attendu, m){ verifier(obtenu === attendu, m + "\n--- attendu :\n" + attendu + "\n--- obtenu :\n" + obtenu); }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + t); }

/* --- Le monde de test : la machine bastion --- */
var FIXTURE = [
	"World.fige = false;",
	"var BastionTest = new Room('bastion', 'Le Bastion de test.', 'loc_cluster.gif');",
	"BastionTest.racineHote = 'bastion'; BastionTest.owner = 'root'; BastionTest.mode = 'rwxr-xr-x'; BastionTest.removeCommand('cd');",
	"link_rooms(Machines, BastionTest);",
	"decrireHote('bastion', { ip: '10.0.92.80', ouvert: true, noyau: '6.1.0-bastion', arrivee: function(){ return BastionTest; },",
	"  services: { ssh: service('bastion', 'ssh', 'OpenBSD Secure Shell server', { procNom: 'sshd' }), apache2: service('bastion', 'apache2', 'The Apache HTTP Server'),",
	"    cron: service('bastion', 'cron', 'Regular background program processing daemon'), rpcbind: service('bastion', 'rpcbind', 'RPC bind portmap service'),",
	"    'telnet.socket': service('bastion', 'telnet.socket', 'Telnet Server Socket', { procNom: 'systemd' }) } });",
	"BastionTest.addProc(612, 'sshd', 'root', { service: 'ssh', cpu: 0.1 });",
	"BastionTest.addProc(733, 'apache2', 'root', { service: 'apache2', cpu: 0.3 });",
	"BastionTest.addProc(498, 'cron', 'root', { service: 'cron', cpu: 0.0 });",
	"BastionTest.addProc(511, 'rpcbind', '_rpc', { service: 'rpcbind', cpu: 0.0 });",
	"function fx(chemin, texte, mode, owner){ ecrireFichierHote('bastion', chemin, texte, { evenement: false, mode: mode || 'rw-r--r--', owner: owner || 'root' }); }",
	"fx('/etc/passwd', ['root:x:0:0:root:/root:/bin/bash', 'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin', 'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',",
	"  JOUEUR + ':x:1000:1000:Admin:/home/' + JOUEUR + ':/bin/bash', 'olduser:x:1001:1001::/home/olduser:/bin/bash', 'svc:x:998:998::/opt/svc:/bin/bash',",
	"  'toor:x:0:0::/root:/bin/bash', 'backup2:x:1002:1002::/home/backup2:/bin/bash', 'orphan:x:1003:4242::/home/orphan:/bin/fish', 'deploy:x:900:900::/home/deploy:/bin/bash'].join('\\n') + '\\n');",
	"fx('/etc/shadow', ['root:!:20000:0:99999:7:::', 'daemon:*:20000:0:99999:7:::', 'www-data:*:20000:0:99999:7:::',",
	"  JOUEUR + ':$y$j9T$abc:20000:0:99999:7:::', 'olduser:$y$j9T$def:19000:0:99999:7:::', 'svc:$y$j9T$ghi:20000:0:99999:7:::', 'toor:$y$j9T$jkl:20000:0:99999:7:::',",
	"  'backup2::20000:0:99999:7:::', 'deploy:$y$j9T$dep:20000:0:99999:7:::', 'ghost:$y$j9T$zzz:20000:0:99999:7:::'].join('\\n') + '\\n', 'rw-r-----');",
	"fx('/etc/group', ['root:x:0:', 'daemon:x:1:', 'www-data:x:33:', 'sudo:x:27:' + JOUEUR, 'adm:x:4:' + JOUEUR + ',fantome', JOUEUR + ':x:1000:', 'olduser:x:1001:',",
	"  'svc:x:998:', 'backup2:x:1002:', 'deploy:x:900:', 'wheel:x:10:'].join('\\n') + '\\n');",
	"fx('/etc/login.defs', 'MAIL_DIR        /var/mail\\nPASS_MAX_DAYS\\t99999\\nPASS_MIN_DAYS\\t0\\nPASS_WARN_AGE\\t7\\nUID_MIN\\t\\t\\t 1000\\nUID_MAX\\t\\t\\t60000\\nUMASK\\t\\t022\\nUSERGROUPS_ENAB yes\\n');",
	"creerDossiersHote('bastion', '/home/' + JOUEUR); creerDossiersHote('bastion', '/home/backup2'); creerDossiersHote('bastion', '/root'); creerDossiersHote('bastion', '/var/www');",
	"creerDossiersHote('bastion', '/var/mail'); creerDossiersHote('bastion', '/tmp').mode = 'rwxrwxrwt';",
	"fx('/etc/sudoers', '#\\n# This file MUST be edited with the \\'visudo\\' command as root.\\n#\\nDefaults\\tenv_reset\\nDefaults\\tmail_badpass\\n' +",
	"  'Defaults\\tsecure_path=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"\\nDefaults\\tuse_pty\\n\\n# User privilege specification\\nroot\\tALL=(ALL:ALL) ALL\\n\\n' +",
	"  '# Allow members of group sudo to execute any command\\n%sudo\\tALL=(ALL:ALL) ALL\\n\\n@includedir /etc/sudoers.d\\n', 'r--r-----');",
	"fx('/etc/sudoers.d/README', '#\\n# Files in /etc/sudoers.d are read by sudo.\\n#\\n', 'r--r-----');",
	"fx('/etc/sudoers.d/deploy', 'deploy ALL=(ALL) NOPASSWD: ALL\\n' + JOUEUR + ' ALL=(root) NOPASSWD: /usr/bin/systemctl restart apache2, /usr/bin/journalctl\\n', 'rw-rw-rw-');",
	"fx('/etc/sudoers.d/old.bak', 'ceci nest pas lu ALL ALL\\n', 'r--r-----');",
	"fx('/etc/pam.d/su', 'auth       sufficient pam_rootok.so\\n# auth       required   pam_wheel.so\\nsession    required   pam_env.so readenv=1\\n@include common-auth\\n');",
	"fx('/etc/pam.d/common-auth', 'auth\\t[success=1 default=ignore]\\tpam_unix.so nullok\\nauth\\trequisite\\t\\t\\tpam_deny.so\\nauth\\trequired\\t\\t\\tpam_permit.so\\n');",
	"fx('/etc/security/faillock.conf', '# Configuration de pam_faillock\\n# deny = 3\\n# fail_interval = 900\\n# unlock_time = 600\\n');",
	"fx('/etc/ssh/sshd_config', 'Include /etc/ssh/sshd_config.d/*.conf\\n\\n#Port 22\\nPermitRootLogin yes\\n#MaxAuthTries 6\\nPasswordAuthentication yes\\nKbdInteractiveAuthentication no\\nUsePAM yes\\n' +",
	"  'X11Forwarding yes\\nPrintMotd no\\nAcceptEnv LANG LC_*\\nSubsystem\\tsftp\\t/usr/lib/openssh/sftp-server\\n');",
	"creerDossiersHote('bastion', '/etc/ssh/sshd_config.d');",
	"fx('/lib/systemd/system/apache2.service', '[Unit]\\nDescription=The Apache HTTP Server\\nAfter=network.target remote-fs.target nss-lookup.target\\nDocumentation=https://httpd.apache.org/docs/2.4/\\n\\n' +",
	"  '[Service]\\nType=forking\\nEnvironment=APACHE_STARTED_BY_SYSTEMD=true\\nExecStart=/usr/sbin/apachectl start\\nExecStop=/usr/sbin/apachectl graceful-stop\\nExecReload=/usr/sbin/apachectl graceful\\n' +",
	"  'KillMode=mixed\\nPrivateTmp=true\\nRestart=on-abort\\n\\n[Install]\\nWantedBy=multi-user.target\\n');",
	"fx('/lib/systemd/system/ssh.service', '[Unit]\\nDescription=OpenBSD Secure Shell server\\nDocumentation=man:sshd(8) man:sshd_config(5)\\n\\n[Service]\\nExecStartPre=/usr/sbin/sshd -t\\nExecStart=/usr/sbin/sshd -D $SSHD_OPTS\\n' +",
	"  'ExecReload=/usr/sbin/sshd -t\\nExecReload=/bin/kill -HUP $MAINPID\\nKillMode=process\\nRestart=on-failure\\n\\n[Install]\\nWantedBy=multi-user.target\\nAlias=sshd.service\\n');",
	"fx('/lib/systemd/system/cron.service', '[Unit]\\nDescription=Regular background program processing daemon\\n\\n[Service]\\nExecStart=/usr/sbin/cron -f $EXTRA_OPTS\\nKillMode=process\\n\\n[Install]\\nWantedBy=multi-user.target\\n');",
	"fx('/lib/systemd/system/rpcbind.service', '[Unit]\\nDescription=RPC bind portmap service\\n\\n[Service]\\nExecStart=/sbin/rpcbind -f -w\\n\\n[Install]\\nWantedBy=multi-user.target\\n');",
	"fx('/lib/systemd/system/telnet.socket', '[Unit]\\nDescription=Telnet Server Socket\\n\\n[Socket]\\nListenStream=23\\nAccept=yes\\n\\n[Install]\\nWantedBy=sockets.target\\n');",
	"fx('/lib/systemd/system/systemd-journald.service', '[Unit]\\nDescription=Journal Service\\n\\n[Service]\\nExecStart=/lib/systemd/systemd-journald\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=strict\\n');",
	"creerDossiersHote('bastion', '/etc/systemd/system');",
	"declarerUnite('bastion', 'systemd-journald.service', { actif: true });",
	"declarerEcoute('bastion', 'ssh', [{ proto: 'tcp', adresse: '0.0.0.0', port: 22 }, { proto: 'tcp', adresse: '::', port: 22 }]);",
	"declarerEcoute('bastion', 'apache2', [{ proto: 'tcp', adresse: '*', port: 80 }, { proto: 'tcp', adresse: '*', port: 443 }]);",
	"declarerEcoute('bastion', 'telnet.socket', [{ proto: 'tcp', adresse: '::', port: 23 }]);",
	"declarerEcoute('bastion', 'rpcbind', [{ proto: 'tcp', adresse: '0.0.0.0', port: 111, utilisateur: '_rpc' }, { proto: 'udp', adresse: '0.0.0.0', port: 111, utilisateur: '_rpc' }]);",
	"declarerPaquet('bastion', 'openssh-server', { version: '1:9.2p1-2+deb12u3', description: 'secure shell (SSH) server, for secure access from remote machines', services: ['ssh'],",
	"  fichiers: { '/usr/sbin/sshd': 'ELF sshd 9.2p1\\n', '/etc/ssh/moduli': '# moduli\\n' }, taille: 1923 });",
	"declarerPaquet('bastion', 'coreutils', { version: '9.1-1', description: 'GNU core utilities', fichiers: { '/usr/bin/ls': 'ELF ls 9.1\\n', '/usr/bin/cat': 'ELF cat 9.1\\n' }, taille: 18062 });",
	"declarerPaquet('bastion', 'telnetd', { version: '0.17+2.4-2+deb12u1', description: 'basic telnet server', services: ['telnet.socket'],",
	"  fichiers: { '/usr/sbin/in.telnetd': 'ELF in.telnetd\\n', '/etc/default/telnetd': 'OPTIONS=\\n', '/lib/systemd/system/telnet.socket': BastionTest.getChildFromName('lib').getChildFromName('systemd').getChildFromName('system').getItemFromName('telnet.socket').getText() }, taille: 123 });",
	"declarerPaquet('bastion', 'sudo', { version: '1.9.13p3-1+deb12u1', disponible: '1.9.13p3-1+deb12u2', description: 'Provide limited super user privileges to specific users', fichiers: { '/usr/bin/sudo': 'ELF sudo 1.9.13p3 u1\\n' }, taille: 6550 });",
	"declarerPaquet('bastion', 'apache2', { version: '2.4.62-1~deb12u1', disponible: '2.4.62-1~deb12u2', description: 'Apache HTTP Server', services: ['apache2'], fichiers: { '/usr/sbin/apache2': 'ELF apache2\\n' }, taille: 563 });",
	"declarerPaquet('bastion', 'etckeeper', { version: '1.18.20-1', description: 'store /etc in git, mercurial, brz or darcs', fichiers: { '/usr/bin/etckeeper': '#!/bin/sh\\n' }, taille: 220 });",
	"declarerPaquet('bastion', 'nmap', { version: '7.93+dfsg1-1', description: 'The Network Mapper', installe: false, fichiers: { '/usr/bin/nmap': 'ELF nmap\\n' } });",
	"ecrireFichierHote('bastion', '/usr/bin/ls', 'ELF ls 9.1 TRAFIQUE\\n', { evenement: false, mode: 'rwxr-xr-x' });",
	"declarerConnexions('bastion', [{ qui: JOUEUR, tty: 'pts/0', depuis: '10.0.92.1', quand: Date.now() - 3600000, fin: 'still' },",
	"  { qui: 'olduser', tty: 'pts/1', depuis: '10.0.92.47', quand: Date.now() - 200 * 86400000, fin: Date.now() - 200 * 86400000 + 1800000 },",
	"  { qui: 'root', tty: 'tty1', depuis: '', quand: Date.now() - 2 * 86400000, fin: Date.now() - 2 * 86400000 + 600000 }]);",
	"declarerMotDePasse('bastion', 'root', 'Racine-du-Bastion-2026');",
	"World.fige = true;"
].join("\n");

function nouveauJeu(stockage){
	var jeu = monde.nouveauMonde(stockage, 4242, { avant: FIXTURE });
	jeu.lire("tousLesSorts().concat(SORTS_ARCANES, SORTS_BASTION, ['nl', 'fold', 'rev']).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });" +
		"state.set('sudoOK'); Shell.fin = function(){ Shell.narration = []; };");
	return jeu;
}
var STOCKAGE = {};
var jeu = nouveauJeu(STOCKAGE);
var JOUEUR = jeu.lire("JOUEUR");
function t(ligne, reponse){ return jeu.taper(ligne, reponse); }
function code(){ return jeu.lire("Shell.statut"); }
jeu.lire("var EVENEMENTS = {}; ['faillock', 'pwck', 'grpck', 'su', 'useradd', 'userdel', 'usermod', 'passwdCompte', 'chage', 'umask', 'tmout', 'sudoListe', 'visudo', 'planifRefusee', 'sshd'," +
	" 'sshReload', 'keygen', 'ss', 'netstat', 'systemctl', 'mask', 'unmask', 'daemonReload', 'systemctlEdit', 'systemdSecurity', 'apt', 'dpkgVerify', 'dpkg', 'debsums', 'etckeeper', 'lastlog', 'write'].forEach(function(type){" +
	" GameEvents.addListener(type, function(e){ EVENEMENTS[type] = e; EVENEMENTS[type + '#'] = (EVENEMENTS[type + '#'] || 0) + 1; }); });");
function evt(expression){ return jeu.lire("(function(){ try { return " + expression + "; } catch (e){ return undefined; } })()"); }
function editer(source){ jeu.editer(source); }

/* --- 0. Le monde de test et l'accès --- */
contient(t("ssh bastion"), "Bienvenue sur bastion", "ssh bastion");
egal(jeu.lire("Shell.hote()"), "bastion", "on est sur bastion");
contient(t("cat /etc/login.defs"), "PASS_MAX_DAYS", "les fichiers du monde se lisent avec cat");
verifier(jeu.lire("fichierHote('bastion', '/etc/ssh/sshd_config') instanceof Item"), "fichierHote trouve /etc/ssh/sshd_config");
verifier(jeu.lire("texteHote('bastion', '/etc/nexistepas') === null"), "texteHote : null pour un fichier absent");
verifier(jeu.lire("noeudHote('bastion', '/etc/ssh') instanceof Room"), "noeudHote trouve un dossier");
egal(jeu.lire("modeOctal('r--r-----')"), "0440", "modeOctal");
egal(jeu.lire("modeOctal('rwxr-xr-x')"), "0755", "modeOctal 755");

/* --- 1. faillock --- */
var s = t("faillock --user root");
contient(s, "Permission denied", "faillock d'un autre sans sudo");
verifier(code() === 1, "faillock refusé : code 1");
s = t("sudo faillock --user olduser");
egal(s.split("\n")[0], "olduser:", "faillock : l'en-tête du compte");
egal(s.split("\n")[1], "When                Type  Source                                           Valid", "faillock : les colonnes comme le vrai");
contient(s, "pam_faillock n'est pas dans /etc/pam.d/common-auth", "faillock prévient si PAM ne l'utilise pas");
verifier(jeu.lire("faillockActif('bastion')") === false, "faillockActif : faux sans pam_faillock");
jeu.lire("ecrireFichierHote('bastion', '/etc/pam.d/common-auth', 'auth\\trequired\\tpam_faillock.so preauth\\nauth\\t[success=1 default=ignore]\\tpam_unix.so nullok\\nauth\\t[default=die]\\tpam_faillock.so authfail\\nauth\\trequisite\\tpam_deny.so\\nauth\\trequired\\tpam_permit.so\\n')");
jeu.lire("ecrireFichierHote('bastion', '/etc/security/faillock.conf', 'deny = 5\\nfail_interval = 900\\nunlock_time = 600\\n')");
verifier(jeu.lire("faillockActif('bastion')") === true, "faillockActif : vrai avec pam_faillock dans common-auth");
egal(jeu.lire("configFaillock('bastion').deny"), 5, "faillock.conf : deny = 5");
egal(jeu.lire("configFaillock('bastion').unlock_time"), 600, "faillock.conf : unlock_time");
jeu.lire("for (var i = 0; i < 4; i++) ajouterEchecConnexion('bastion', 'olduser', '10.0.92.66', maintenantBastion() - 60000 * (4 - i));");
jeu.lire("ajouterEchecConnexion('bastion', 'olduser', '10.0.92.66', maintenantBastion() - 3 * 3600000)");
s = t("sudo faillock --user olduser");
verifier(s.split("\n").filter(function(l){ return /RHOST 10\.0\.92\.66\s+V$/.test(l); }).length === 4, "faillock : 4 échecs valides (V)");
verifier(s.split("\n").filter(function(l){ return /\sI$/.test(l); }).length === 1, "faillock : un échec trop ancien (I)");
verifier(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d RHOST /.test(s.split("\n")[2]), "faillock : date au format du vrai outil");
contient(s, "pas verrouillé", "4 échecs sur deny=5 : pas verrouillé");
verifier(jeu.lire("compteBloqueFaillock('bastion', 'olduser')") === false, "compteBloqueFaillock : faux à 4");
jeu.lire("ajouterEchecConnexion('bastion', 'olduser', '10.0.92.66')");
verifier(jeu.lire("compteBloqueFaillock('bastion', 'olduser')") === true, "compteBloqueFaillock : vrai à 5");
contient(t("sudo faillock --user olduser"), "VERROUILLÉ", "faillock dit le verrou");
verifier(evt("EVENEMENTS.faillock.bloque") === true && evt("EVENEMENTS.faillock.action") === "list", "événement faillock (list, bloque)");
s = t("sudo faillock");
contient(s, "olduser:", "faillock sans --user : tous les comptes");
egal(t("sudo faillock --user olduser --reset | cat"), "", "faillock --reset ne dit rien dans un tuyau");
verifier(jeu.lire("compteBloqueFaillock('bastion', 'olduser')") === false, "après --reset, déverrouillé");
verifier(evt("EVENEMENTS.faillock.action") === "reset", "événement faillock reset");
contient(t("faillock --nimporte"), "Usage: faillock", "faillock : option inconnue");
jeu.lire("ajouterEchecConnexion('bastion', 'root', '10.0.92.66'); ajouterEchecConnexion('bastion', 'root', '10.0.92.66'); for (var i = 0; i < 5; i++) ajouterEchecConnexion('bastion', 'root', '10.0.92.66');");
verifier(jeu.lire("compteBloqueFaillock('bastion', 'root')") === false, "root n'est pas verrouillé sans even_deny_root");

/* --- 2. pwck et grpck --- */
s = t("pwck -r");
contient(s, "cannot open /etc/shadow", "pwck sans sudo ne peut pas lire shadow");
verifier(code() === 3, "pwck sans sudo : code 3");
s = t("sudo pwck -r");
contient(s, "user 'olduser': directory '/home/olduser' does not exist", "pwck : dossier personnel absent");
contient(s, "user 'orphan': no group 4242", "pwck : groupe principal inexistant");
contient(s, "user 'orphan': program '/bin/fish' does not exist", "pwck : shell inexistant");
contient(s, "no matching password file entry in /etc/passwd\ndelete line 'ghost:$y$j9T$zzz:20000:0:99999:7:::'? No", "pwck : une ligne de shadow sans passwd");
contient(s, "no matching password file entry in /etc/shadow\nadd user 'orphan' in /etc/shadow? No", "pwck : un compte sans shadow");
contient(s, "pwck: no changes", "pwck -r : pas de changement");
absent(s, "svc':", "pwck : /opt/svc n'est pas signalé (son dossier parent n'est pas décrit)");
verifier(code() === 2, "pwck : code 2 quand il trouve quelque chose");
verifier(evt("EVENEMENTS.pwck.erreurs.length") >= 5 && evt("EVENEMENTS.pwck.lectureSeule") === true, "événement pwck");
contient(t("sudo pwck -qr"), "no group 4242", "pwck -q garde les vraies erreurs");
absent(t("sudo pwck -qr"), "does not exist", "pwck -q tait les dossiers absents");
contient(t("pwck"), "cannot lock /etc/passwd", "pwck sans -r ni sudo");
contient(t("sudo pwck -z"), "invalid option", "pwck : option inconnue");
s = t("sudo grpck -r");
contient(s, "group adm: no user fantome", "grpck : un membre qui n'existe pas");
contient(s, "grpck: no changes", "grpck : pas de changement");
verifier(code() === 2, "grpck : code 2");
verifier(evt("EVENEMENTS.grpck.erreurs[0]") === "group adm: no user fantome", "événement grpck");

/* --- 3. su et pam_wheel --- */
contient(t("su -", "Racine-du-Bastion-2026"), "su: Authentication failure", "su vers root verrouillé (! dans shadow)");
verifier(evt("EVENEMENTS.su.raison") === "verrouille", "su : raison verrouille");
jeu.lire("modifierLigneCompte('bastion', 'shadow', 'root', function(c){ c[1] = '$y$j9T$racine'; return c; })");
s = t("su -", "Racine-du-Bastion-2026");
contient(s, "Password:", "su demande le mot de passe");
contient(s, "Te voilà root", "su avec le bon mot de passe");
verifier(evt("EVENEMENTS.su.ok") === true && evt("EVENEMENTS.su.cible") === "root", "événement su réussi");
contient(t("su -", "mauvais"), "su: Authentication failure", "su : mauvais mot de passe");
verifier(evt("EVENEMENTS.su.raison") === "motdepasse", "su : raison motdepasse");
verifier(jeu.lire("echecsFaillock('bastion', 'root').length") >= 8, "un su raté est compté par faillock");
contient(t("su backup2"), "n'a PAS de mot de passe", "su vers un compte au mot de passe vide : rien à taper");
verifier(evt("EVENEMENTS.su.raison") === "vide", "su : raison vide");
contient(t("su inconnu"), "su: user inconnu does not exist", "su vers un compte inexistant");
contient(t("su - | cat"), "su: must be run from a terminal", "su dans un tuyau");
contient(t("su -z"), "invalid option", "su : option inconnue");
contient(t("sudo su -"), "Déjà root avec sudo", "sudo su");
jeu.lire("ecrireFichierHote('bastion', '/etc/pam.d/su', 'auth       sufficient pam_rootok.so\\nauth       required   pam_wheel.so\\n@include common-auth\\n')");
egal(jeu.lire("pamWheel('bastion').groupe"), "wheel", "pam_wheel sans group= : le groupe wheel");
s = t("su -", "Racine-du-Bastion-2026");
contient(s, "su: Permission denied", "pam_wheel : refusé hors du groupe wheel, même avec le bon mot de passe");
verifier(evt("EVENEMENTS.su.raison") === "pam_wheel", "su : raison pam_wheel");
jeu.lire("ecrireFichierHote('bastion', '/etc/pam.d/su', 'auth       sufficient pam_rootok.so\\nauth       required   pam_wheel.so group=sudo\\n@include common-auth\\n')");
egal(jeu.lire("pamWheel('bastion').groupe"), "sudo", "pam_wheel group=sudo");
contient(t("su -", "Racine-du-Bastion-2026"), "Te voilà root", "pam_wheel group=sudo : membre du groupe sudo, accepté");
jeu.lire("for (var i = 0; i < 6; i++) ajouterEchecConnexion('bastion', 'root', 'pts/0')");
jeu.lire("ecrireFichierHote('bastion', '/etc/security/faillock.conf', 'deny = 5\\neven_deny_root\\nunlock_time = 600\\n')");
contient(t("su -", "Racine-du-Bastion-2026"), "verrouillé par faillock", "su vers un compte verrouillé par faillock (even_deny_root)");
t("sudo faillock --user root --reset");

/* --- 4. useradd, userdel, usermod, passwd, chage, id --- */
contient(t("useradd -m ada"), "useradd: Permission denied.", "useradd sans sudo");
verifier(code() === 1, "useradd sans sudo : code 1");
egal(t("sudo useradd -m -s /bin/bash -G sudo ada | cat"), "", "useradd -m -s -G");
contient(t("cat /etc/passwd"), "ada:x:1004:1004::/home/ada:/bin/bash", "useradd : la ligne de passwd (UID suivant le plus haut)");
contient(t("sudo cat /etc/shadow"), "ada:!:", "useradd : mot de passe verrouillé dans shadow");
verifier(/ada:!:\d+:0:99999:7:::/.test(t("sudo cat /etc/shadow")), "useradd : les âges de /etc/login.defs");
contient(t("cat /etc/group"), "sudo:x:27:" + JOUEUR + ",ada", "useradd -G : membre du groupe sudo");
contient(t("cat /etc/group"), "ada:x:1004:", "useradd : son groupe");
verifier(jeu.lire("dossierHote('bastion', '/home/ada') !== null && dossierHote('bastion', '/home/ada').owner === 'ada'"), "useradd -m : le dossier personnel");
verifier(evt("EVENEMENTS.useradd.qui") === "ada" && evt("EVENEMENTS.useradd.uid") === 1004, "événement useradd");
contient(t("sudo useradd ada"), "useradd: user 'ada' already exists", "useradd : compte existant");
verifier(code() === 9, "useradd : code 9 pour un compte existant");
contient(t("sudo useradd -G nexistepas bob"), "useradd: group 'nexistepas' does not exist", "useradd : groupe inconnu");
verifier(code() === 6, "useradd : code 6 pour un groupe inconnu");
contient(t("sudo useradd -u 0 bob"), "useradd: UID 0 is not unique", "useradd : UID 0 refusé sans -o");
contient(t("sudo useradd 'Bad Name'"), "invalid user name", "useradd : nom invalide");
t("sudo useradd -r -s /usr/sbin/nologin sentinelle");
contient(t("cat /etc/passwd"), "sentinelle:x:999:", "useradd -r : UID système sous 1000");
contient(t("sudo useradd"), "Usage: useradd", "useradd sans nom");
egal(t("id ada"), "uid=1004(ada) gid=1004(ada) groupes=1004(ada),27(sudo)", "id d'un compte créé en cours de partie");
egal(t("id -u ada"), "1004", "id -u");
contient(t("id personne"), "no such user", "id d'un inconnu");
contient(t("sudo usermod -s nologin svc"), "usermod: invalid shell 'nologin'", "usermod -s : chemin relatif refusé");
verifier(code() === 3, "usermod -s invalide : code 3");
t("sudo usermod -s /usr/sbin/nologin svc");
contient(t("cat /etc/passwd"), "svc:x:998:998::/opt/svc:/usr/sbin/nologin", "usermod -s change le shell");
verifier(evt("EVENEMENTS.usermod.shell") === "/usr/sbin/nologin" && evt("EVENEMENTS.usermod.qui") === "svc", "événement usermod -s");
egal(t("sudo usermod -s /usr/sbin/nologin svc"), "usermod: no changes", "usermod : rien à changer");
contient(t("usermod -s /bin/sh svc"), "Permission denied", "usermod sans sudo");
contient(t("sudo usermod -s /bin/sh personne"), "usermod: user 'personne' does not exist", "usermod d'un inconnu");
t("sudo usermod -e 2026-12-31 olduser");
verifier(jeu.lire("shadowDe('bastion', 'olduser').expire") === String(Date.UTC(2026, 11, 31) / 86400000), "usermod -e : la date d'expiration dans shadow");
contient(t("sudo usermod -e 2026-99-99 olduser"), "invalid date", "usermod -e : date invalide");
t("sudo usermod -L -s /usr/sbin/nologin olduser");
verifier(/^olduser:!\$y\$/m.test(t("sudo cat /etc/shadow")) && /olduser:.*nologin/.test(t("cat /etc/passwd")), "usermod -L et -s ensemble");
t("sudo usermod -U olduser");
verifier(/^olduser:\$y\$/m.test(t("sudo cat /etc/shadow")), "usermod -U déverrouille");
contient(t("sudo usermod -U ada"), "passwordless account", "usermod -U refuse un compte sans mot de passe");
t("sudo usermod -aG adm ada");
contient(t("cat /etc/group"), "adm:x:4:" + JOUEUR + ",fantome,ada", "usermod -aG (l'existant) marche toujours");
contient(t("sudo usermod -G adm ada"), "-aG", "usermod -G seul : toujours refusé avec explication");
t("sudo usermod -c 'Ada Lovelace' ada");
contient(t("cat /etc/passwd"), "ada:x:1004:1004:Ada Lovelace:/home/ada:/bin/bash", "usermod -c");
// passwd -l / -u / -S / -d / -e / -x
egal(t("sudo passwd -S backup2 | cat"), "backup2 NP " + jeu.lire("(function(){ var d = new Date(Date.UTC(1970, 0, 1) + 20000 * 86400000); return deuxChiffres(d.getUTCMonth() + 1) + '/' + deuxChiffres(d.getUTCDate()) + '/' + d.getUTCFullYear(); })()") + " 0 99999 7 -1", "passwd -S : NP pour un mot de passe vide");
contient(t("sudo passwd -l backup2"), "passwd: password changed.", "passwd -l");
verifier(/^backup2:!:/m.test(t("sudo cat /etc/shadow")), "passwd -l : le ! devant");
contient(t("sudo passwd -S backup2"), "backup2 L ", "passwd -S : L après verrouillage");
contient(t("sudo passwd -u backup2"), "passwordless", "passwd -u refuse de rouvrir un compte sans mot de passe");
contient(t("sudo passwd -e ada"), "passwd: password expiry information changed.", "passwd -e");
contient(t("sudo chage -l ada"), "password must be changed", "chage -l après passwd -e");
t("sudo passwd -x 90 ada");
verifier(jeu.lire("shadowDe('bastion', 'ada').max") === "90", "passwd -x 90");
contient(t("passwd -l ada"), "passwd: Permission denied.", "passwd -l sans sudo");
verifier(evt("EVENEMENTS.passwdCompte.action") === "x", "événement passwdCompte");
contient(t("passwd -S"), JOUEUR + " P ", "passwd -S sans sudo pour soi-même");
// chage
s = t("chage -l " + JOUEUR);
verifier(s.split("\n").length === 7, "chage -l : sept lignes");
contient(s, "Last password change\t\t\t\t\t: ", "chage -l : le format du vrai (tabulations)");
contient(s, "Maximum number of days between password change\t\t: 99999", "chage -l : PASS_MAX_DAYS d'origine");
contient(s, "Password expires\t\t\t\t\t: never", "chage -l : n'expire pas");
contient(t("chage -l ada"), "chage: Permission denied.", "chage -l d'un autre sans sudo");
egal(t("sudo chage -M 90 -m 1 -W 14 " + JOUEUR + " | cat"), "", "chage -M -m -W");
verifier(evt("EVENEMENTS.chage.champs.max") === "90", "événement chage avec les champs");
s = t("chage -l " + JOUEUR);
contient(s, "Maximum number of days between password change\t\t: 90", "chage -M 90");
contient(s, "Minimum number of days between password change\t\t: 1", "chage -m 1");
contient(s, "Number of days of warning before password expires\t: 14", "chage -W 14");
contient(s, "Password expires\t\t\t\t\t: " + jeu.lire("dateDesJoursShadow(20090)"), "chage : la date d'expiration calculée");
t("sudo chage -E 2027-01-15 ada");
contient(t("sudo chage -l ada"), "Account expires\t\t\t\t\t\t: Jan 15, 2027", "chage -E date");
contient(t("sudo chage -M abc ada"), "chage: invalid maximum number of days 'abc'", "chage -M invalide");
contient(t("sudo chage -l personne"), "chage: user 'personne' does not exist", "chage d'un inconnu");
contient(t("chage"), "Usage: chage", "chage sans argument");
// userdel -r
t("sudo useradd -m temp");
verifier(jeu.lire("dossierHote('bastion', '/home/temp') !== null"), "le compte temp a son dossier");
s = t("sudo userdel -r temp");
contient(s, "userdel: temp mail spool (/var/mail/temp) not found", "userdel -r : la boîte aux lettres absente, comme le vrai");
verifier(jeu.lire("dossierHote('bastion', '/home/temp') === null"), "userdel -r supprime le dossier personnel");
absent(t("cat /etc/passwd"), "temp:", "userdel : la ligne a disparu");
verifier(evt("EVENEMENTS.userdel.home") === true, "événement userdel avec home");
contient(t("sudo userdel " + JOUEUR), "C'est toi", "userdel refuse toujours de supprimer le joueur (l'existant)");

/* --- 5. lastlog et last --- */
s = t("lastlog");
egal(s.split("\n")[0], "Username         Port     From             Latest", "lastlog : l'en-tête");
contient(s, "olduser          pts/1    10.0.92.47       ", "lastlog : la dernière connexion d'olduser");
verifier(/svc\s+\*\*Never logged in\*\*/.test(s), "lastlog : jamais connecté");
verifier(/olduser .* [A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d\d:\d\d:\d\d [+-]\d{4} \d{4}/.test(s), "lastlog : la date au format du vrai");
contient(s, "Comptes avec un vrai shell", "lastlog signale les comptes dormants");
verifier(evt("EVENEMENTS.lastlog.dormants").indexOf("deploy") > -1, "événement lastlog avec les dormants (deploy, jamais connecté)");
s = t("lastlog -b 90");
contient(s, "olduser", "lastlog -b 90 : olduser (200 jours)");
absent(s, JOUEUR + " ", "lastlog -b 90 : pas le joueur (connecté aujourd'hui)");
s = t("lastlog -t 7");
contient(s, JOUEUR, "lastlog -t 7 : le joueur");
absent(s, "olduser", "lastlog -t 7 : pas olduser");
absent(s, "Never", "lastlog -t 7 : pas les jamais connectés");
egal(t("lastlog -u root | wc -l"), "2", "lastlog -u root");
contient(t("lastlog -u inconnu"), "lastlog: Unknown user or range: inconnu", "lastlog -u inconnu");
s = t("last");
contient(s.split("\n")[0], JOUEUR, "last : la plus récente en premier");
contient(s, "still logged in", "last : session en cours");
contient(s, "wtmp begins", "last : la fin");
contient(t("last olduser"), "(00:30)", "last : la durée");
egal(t("last -n 1 | grep -c pts"), "1", "last -n 1");

/* --- 6. umask et TMOUT --- */
egal(t("umask"), "0022", "umask par défaut (UMASK de login.defs)");
egal(t("umask -S"), "u=rwx,g=rx,o=rx", "umask -S");
egal(t("umask 027 | cat"), "", "umask 027");
egal(t("umask"), "0027", "umask lit le nouveau masque");
egal(t("umask -S"), "u=rwx,g=rx,o=", "umask -S 027");
verifier(evt("EVENEMENTS.umask.masque") === "0027", "événement umask");
t("cd /tmp");
t("echo test > fichier-umask");
contient(t("ls -l fichier-umask"), "rw-r-----", "un fichier créé avec umask 027 est en 640");
t("cd /");
contient(t("umask 999"), "octal number out of range", "umask hors limites");
contient(t("umask u=rwx,g=,o="), "", "umask symbolique");
egal(t("umask"), "0077", "umask u=rwx,g=,o= donne 0077");
contient(t("umask -p"), "umask 0077", "umask -p");
contient(t("sudo umask"), "sudo: umask: command not found", "sudo umask n'existe pas");
contient(t("umask x+y"), "invalid symbolic mode operator", "umask : mode symbolique faux");
t("umask 022");
jeu.lire("ecrireFichierHote('bastion', '/etc/profile.d/tmout.sh', 'TMOUT=900\\nreadonly TMOUT\\nexport TMOUT\\n')");
egal(t("echo $TMOUT"), "900", "TMOUT se lit dans /etc/profile.d");
contient(t("TMOUT=0"), "bash: TMOUT: readonly variable", "TMOUT en lecture seule");
contient(t("export TMOUT=0"), "readonly variable", "export TMOUT refusé");
contient(t("unset TMOUT"), "cannot unset: readonly variable", "unset TMOUT refusé");
verifier(evt("EVENEMENTS.tmout.refuse") === true, "événement tmout");
egal(t("AUTRE=1 ; echo $AUTRE"), "1", "les autres variables restent libres");

/* --- 7. sudo -l, visudo --- */
s = t("sudo -l");
contient(s, "Matching Defaults entries for " + JOUEUR + " on bastion:", "sudo -l : les Defaults");
contient(s, "    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin, use_pty", "sudo -l : la liste des Defaults, comme sudo les écrit");
contient(s, "User " + JOUEUR + " may run the following commands on bastion:", "sudo -l : l'en-tête");
contient(s, "    (ALL : ALL) ALL", "sudo -l : la règle du groupe sudo");
contient(s, "sudo: /etc/sudoers.d/deploy is world writable", "sudo avertit d'un fichier de sudoers.d modifiable par tous");
absent(s, "NOPASSWD: /usr/bin/systemctl", "sudo ignore un fichier de sudoers.d modifiable par tous");
jeu.lire("fichierHote('bastion', '/etc/sudoers.d/deploy').mode = 'r--r-----'");
s = t("sudo -l");
contient(s, "    (root) NOPASSWD: /usr/bin/systemctl restart apache2, /usr/bin/journalctl", "sudo -l : la règle de sudoers.d");
verifier(evt("EVENEMENTS.sudoListe.autorise") === true && evt("EVENEMENTS.sudoListe.regles.length") === 2, "événement sudoListe");
s = t("sudo -l -U deploy");
contient(s, "(ALL) NOPASSWD: ALL", "sudo -l -U deploy");
contient(s, "NOPASSWD: ALL : root sans même retaper", "sudo -l alerte sur NOPASSWD: ALL");
contient(t("sudo -l -U olduser"), "User olduser is not allowed to run sudo on bastion.", "sudo -l -U d'un compte sans droit");
contient(t("sudo -l -U personne"), "sudo: unknown user personne", "sudo -l -U inconnu");
egal(t("sudo -l systemctl | cat"), "/usr/bin/systemctl", "sudo -l COMMANDE permise");
s = t("sudo -ll");
contient(s, "Sudoers entry: /etc/sudoers.d/deploy", "sudo -ll : l'origine de chaque droit");
contient(s, "    Options: !authenticate", "sudo -ll : NOPASSWD devient !authenticate");
contient(s, "    RunAsUsers: ALL\n    RunAsGroups: ALL", "sudo -ll : RunAsUsers et RunAsGroups");
contient(t("sudo -z ls"), "sudo: invalid option -- 'z'", "sudo : option inconnue");
egal(t("sudo -u root whoami"), "root", "sudo -u root CMD");
contient(t("sudo -u ada whoami"), "ne lance les commandes qu'en root", "sudo -u autre : pas pris en charge, et on le dit");
egal(t("sudo -E whoami"), "root", "sudo -E CMD");
contient(t("sudo -i"), "shell root interactif", "sudo -i sans commande");
verifier(jeu.lire("reglesSudo('bastion', 'deploy').regles[0].commandes[0]") === "ALL", "reglesSudo pour le monde");
// visudo -c
s = t("sudo visudo -c");
contient(s, "/etc/sudoers: parsed OK", "visudo -c : sudoers");
contient(s, "/etc/sudoers.d/README: parsed OK", "visudo -c : sudoers.d/README");
contient(s, "/etc/sudoers.d/deploy: parsed OK", "visudo -c : sudoers.d/deploy");
absent(s, "old.bak", "visudo -c : les noms avec un point sont ignorés, comme sudo");
egal(code(), 0, "visudo -c : code 0");
jeu.lire("fichierHote('bastion', '/etc/sudoers.d/deploy').mode = 'rw-r--r--'");
s = t("sudo visudo -c");
contient(s, "visudo: /etc/sudoers.d/deploy: bad permissions, should be mode 0440", "visudo -c : droits faux");
verifier(s.indexOf("/etc/sudoers.d/README: parsed OK") > -1 && s.indexOf("/etc/sudoers.d/README: parsed OK") < s.indexOf("bad permissions"), "visudo -c : le fichier fautif à la place de son « parsed OK », après les autres");
absent(s, "/etc/sudoers.d/deploy: parsed OK", "visudo -c : pas de parsed OK pour le fichier aux droits faux");
egal(code(), 1, "visudo -c : code 1 pour des droits faux");
t("sudo chmod 440 /etc/sudoers.d/deploy");
contient(t("sudo visudo -c"), "/etc/sudoers.d/deploy: parsed OK", "après chmod 440 : parsed OK");
jeu.lire("ecrireFichierHote('bastion', '/etc/sudoers.d/casse', 'bob ALL=(ALL) NOPASSWD ALL\\n', { mode: 'r--r-----' })");
s = t("sudo visudo -c");
contient(s, "/etc/sudoers.d/casse:1:24: syntax error\nbob ALL=(ALL) NOPASSWD ALL\n                       ^~~", "visudo -c : l'erreur de syntaxe, sa ligne et sa colonne, comme sudo 1.9");
egal(code(), 1, "visudo -c : code 1 pour une faute");
verifier(evt("EVENEMENTS.visudo.ok") === false && evt("EVENEMENTS.visudo.action") === "c", "événement visudo -c");
contient(t("sudo visudo -c -f /etc/sudoers.d/deploy"), "/etc/sudoers.d/deploy: parsed OK", "visudo -c -f un seul fichier");
contient(t("sudo visudo -c -f /etc/sudoers.d/nexistepas"), "unable to open", "visudo -c -f absent");
contient(t("visudo -c"), "Permission denied", "visudo sans sudo");
verifier(jeu.lire("verifierSudoers('bastion').ok") === false, "verifierSudoers voit la faute");
// visudo -f : l'éditeur
editer("function(t){ return t.replace('NOPASSWD ALL', 'NOPASSWD: ALL'); }");
s = t("sudo visudo -f /etc/sudoers.d/casse");
contient(s, "[vim /etc/sudoers.d/casse.tmp]", "visudo -f ouvre le fichier (dans vim, quand on le connaît)");
egal(jeu.lire("texteHote('bastion', '/etc/sudoers.d/casse')"), "bob ALL=(ALL) NOPASSWD: ALL\n", "visudo -f enregistre une syntaxe correcte");
verifier(jeu.lire("verifierSudoers('bastion').ok") === true, "verifierSudoers : tout va bien");
editer("function(t){ return t + 'ada ALL=(ALL NOPASSWD: ALL\\n'; }");
s = t("sudo visudo -f /etc/sudoers.d/casse");
contient(s, "syntax error", "visudo -f refuse une syntaxe cassée");
contient(s, "rien n'a été enregistré", "visudo -f : rien n'est écrit");
absent(jeu.lire("texteHote('bastion', '/etc/sudoers.d/casse')"), "ada", "visudo -f : le fichier n'a pas changé");
editer("function(t){ return 'ada ALL=(ALL:ALL) /usr/bin/apt update\\n'; }");
t("sudo visudo -f /etc/sudoers.d/ada");
egal(jeu.lire("fichierHote('bastion', '/etc/sudoers.d/ada').mode"), "r--r-----", "visudo -f crée un fichier en 0440");
contient(t("sudo -l -U ada"), "(ALL : ALL) /usr/bin/apt update", "le nouveau droit se voit avec sudo -l");
editer("function(t){ return t.replace('%sudo\\tALL=(ALL:ALL) ALL', '%sudo ALL=(ALL:ALL) ALL\\nDefaults timestamp_timeout=5'); }");
t("sudo visudo");
contient(t("sudo cat /etc/sudoers"), "timestamp_timeout=5", "visudo sans -f modifie /etc/sudoers");
editer("function(t){ return t + 'Defaults inventee\\n'; }");
contient(t("sudo visudo"), "unknown defaults entry \"inventee\"", "visudo : un Defaults inconnu");
// Les formes de sudoers que le lecteur doit accepter
var CORRECTS = ["root ALL=(ALL:ALL) ALL", "%sudo ALL=(ALL:ALL) ALL", "%admin ALL=(ALL) ALL", "ada ALL=(root) NOPASSWD: /usr/bin/systemctl restart apache2",
	"User_Alias ADMINS = ada, bob", "Cmnd_Alias SERVICES = /usr/bin/systemctl, /usr/sbin/service", "ADMINS ALL=(root) SERVICES", "Defaults:ada !lecture",
	"Defaults env_keep += \"LANG\"", "ada ALL=(ALL) NOPASSWD: ALL, !/usr/bin/su", "#includedir /etc/sudoers.d", "ada bastion=(root:adm) /usr/bin/less /var/log/syslog",
	"Host_Alias SERVEURS = bastion, archives", "ada SERVEURS = /usr/bin/uptime", "ada ALL=(ALL) NOEXEC: SETENV: /usr/bin/vim", "#1000 ALL=(ALL) ALL", "ada ALL = /usr/bin/chown root\\:root /srv"];
CORRECTS.forEach(function(l){ verifier(jeu.lire("lireSudoers(" + JSON.stringify(l + "\n") + ", 'x').erreurs.length") === 0, "sudoers accepte : " + l); });
var FAUX = ["ada tout", "ada ALL=(ALL NOPASSWD ALL", "ada ALL=(ALL) NOPASSWD ALL", "ada ALL=", "ada ALL=(ALL) ", "User_Alias admins = ada", "Defaults nimporte", "ada ALL=(ALL) NOPASSWD: ALL junk"];
FAUX.forEach(function(l){ verifier(jeu.lire("lireSudoers(" + JSON.stringify(l + "\n") + ", 'x').erreurs.length") > 0, "sudoers refuse : " + l); });

/* --- 8. cron.allow, at.allow --- */
contient(t("crontab -l"), "pas de crontab", "crontab permis sans cron.allow");
jeu.lire("ecrireFichierHote('bastion', '/etc/cron.allow', 'root\\nada\\n')");
s = t("crontab -l");
contient(s, "You (" + JOUEUR + ") are not allowed to use this program (crontab)\nSee crontab(1) for more information", "cron.allow : refusé, le message exact");
egal(code(), 1, "crontab refusé : code 1");
verifier(evt("EVENEMENTS.planifRefusee.programme") === "crontab", "événement planifRefusee");
absent(t("sudo crontab -l"), "not allowed", "root a toujours droit à crontab");
jeu.lire("ecrireFichierHote('bastion', '/etc/cron.allow', 'root\\n' + JOUEUR + '\\n')");
contient(t("crontab -l"), "pas de crontab", "cron.allow qui nomme le joueur : permis");
jeu.lire("supprimerFichierHote('bastion', '/etc/cron.allow'); ecrireFichierHote('bastion', '/etc/cron.deny', JOUEUR + '\\n')");
contient(t("crontab -l"), "not allowed to use this program", "cron.deny nomme le joueur : refusé");
jeu.lire("supprimerFichierHote('bastion', '/etc/cron.deny')");
contient(t("echo 'echo x' | at now + 5 minutes"), "job ", "at permis sans at.allow");
jeu.lire("ecrireFichierHote('bastion', '/etc/at.allow', 'root\\n')");
contient(t("echo 'echo x' | at now + 5 minutes"), "You do not have permission to use at.", "at.allow : refusé");
contient(t("atq"), "You do not have permission to use atq.", "at.allow : atq refusé");
contient(t("atrm 1"), "You do not have permission to use atrm.", "at.allow : atrm refusé");
contient(t("echo 'echo y' | sudo at now + 5 minutes"), "job ", "root a toujours droit à at");
jeu.lire("supprimerFichierHote('bastion', '/etc/at.allow'); ecrireFichierHote('bastion', '/etc/at.deny', 'nobody\\n')");
contient(t("atq"), "", "at.deny sans le joueur : permis");
jeu.lire("supprimerFichierHote('bastion', '/etc/at.deny')");

/* --- 9. sshd -t, sshd -T, reload ssh --- */
contient(t("sshd -t"), "sshd: no hostkeys available -- exiting.", "sshd -t sans sudo");
egal(t("sudo sshd -t | cat"), "", "sshd -t : rien quand tout va bien");
egal(code(), 0, "sshd -t : code 0");
s = t("sudo sshd -T");
contient(s, "port 22\n", "sshd -T : port");
contient(s, "permitrootlogin yes", "sshd -T : la valeur du fichier");
contient(s, "passwordauthentication yes", "sshd -T : passwordauthentication");
contient(s, "maxauthtries 6", "sshd -T : la valeur par défaut d'OpenSSH");
contient(s, "kbdinteractiveauthentication no", "sshd -T : kbdinteractiveauthentication");
contient(s, "x11forwarding yes", "sshd -T : x11forwarding");
contient(s, "ciphers chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com", "sshd -T : les ciphers par défaut");
contient(s, "kexalgorithms sntrup761x25519-sha512@openssh.com,curve25519-sha256", "sshd -T : kexalgorithms par défaut");
contient(s, "macs umac-64-etm@openssh.com", "sshd -T : macs par défaut");
contient(s, "listenaddress 0.0.0.0:22\nlistenaddress [::]:22", "sshd -T : listenaddress");
contient(s, "acceptenv LANG LC_*", "sshd -T : acceptenv");
contient(s, "subsystem sftp /usr/lib/openssh/sftp-server", "sshd -T : subsystem");
absent(s, "allowusers", "sshd -T : pas d'allowusers par défaut");
verifier(s.split("\n").every(function(l){ return l === "" || /^[a-z0-9]+ /.test(l); }), "sshd -T : mots-clés en minuscules");
egal(t("sudo sshd -T | grep -i permitrootlogin"), "permitrootlogin yes", "sshd -T | grep");
verifier(evt("EVENEMENTS.sshd.action") === "T" && evt("EVENEMENTS.sshd.ok") === true, "événement sshd -T");
// Un drop-in : la première valeur l'emporte.
jeu.lire("ecrireFichierHote('bastion', '/etc/ssh/sshd_config.d/50-bastion.conf', 'PermitRootLogin no\\nMaxAuthTries 3\\nAllowUsers ' + JOUEUR + ' ada\\nPasswordAuthentication no\\nCiphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com\\nMACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com\\nKexAlgorithms curve25519-sha256\\n')");
s = t("sudo sshd -T");
contient(s, "permitrootlogin no", "le drop-in l'emporte sur la suite de sshd_config (première valeur)");
contient(s, "maxauthtries 3", "sshd -T : maxauthtries du drop-in");
contient(s, "allowusers " + JOUEUR + " ada", "sshd -T : allowusers");
contient(s, "ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com\n", "sshd -T : ciphers choisis");
contient(s, "kexalgorithms curve25519-sha256\n", "sshd -T : kex choisis");
egal(jeu.lire("configSshFichiers('bastion').permitrootlogin"), "no", "configSshFichiers : sur le disque");
egal(jeu.lire("configSshEffective('bastion').permitrootlogin"), "yes", "configSshEffective : le démon n'a pas rechargé");
egal(jeu.lire("configSshEffective('bastion').maxauthtries"), "6", "configSshEffective : l'ancienne valeur tant que pas de reload");
egal(t("sudo systemctl reload ssh | cat"), "", "systemctl reload ssh avec une configuration valide");
egal(jeu.lire("configSshEffective('bastion').permitrootlogin"), "no", "après reload : la nouvelle configuration est appliquée");
egal(jeu.lire("configSshEffective('bastion').allowusers.join(' ')"), JOUEUR + " ada", "configSshEffective : allowusers en tableau");
verifier(evt("EVENEMENTS.sshReload.ok") === true, "événement sshReload réussi");
// Une faute : sshd -t la voit, reload refuse, l'ancienne configuration reste.
jeu.lire("ecrireFichierHote('bastion', '/etc/ssh/sshd_config.d/60-faute.conf', 'PermitRootLogn no\\n')");
s = t("sudo sshd -t");
contient(s, "/etc/ssh/sshd_config.d/60-faute.conf: line 1: Bad configuration option: PermitRootLogn", "sshd -t : option inconnue, le message d'OpenSSH");
contient(s, "/etc/ssh/sshd_config: terminating, 1 bad configuration options", "sshd -t : la ligne finale");
egal(code(), 255, "sshd -t : code 255");
verifier(evt("EVENEMENTS.sshd.ok") === false && evt("EVENEMENTS.sshd.erreurs.length") === 2, "événement sshd -t raté");
s = t("sudo systemctl reload ssh");
contient(s, "Job for ssh.service failed because the control process exited with error code.", "reload ssh refusé");
contient(s, "garde l'ancienne", "reload : l'ancienne configuration reste, et on le dit");
egal(code(), 1, "reload refusé : code 1");
egal(jeu.lire("configSshEffective('bastion').permitrootlogin"), "no", "reload refusé : la configuration appliquée ne change pas");
verifier(jeu.lire("HOTES.bastion.services.ssh.actif") === true, "reload refusé : sshd tourne toujours");
s = t("systemctl status ssh");
contient(s, "Bad configuration option: PermitRootLogn", "status ssh : le journal de l'échec");
contient(s, "Reload failed for ssh.service", "status ssh : Reload failed");
contient(s, "active (running)", "status ssh : toujours actif");
verifier(evt("EVENEMENTS.sshReload.ok") === false, "événement sshReload raté");
s = t("sudo systemctl restart ssh");
contient(s, "Job for ssh.service failed", "restart ssh avec une faute");
contient(s, "ARRÊTÉ", "restart raté : le service est arrêté, et on le dit");
verifier(jeu.lire("HOTES.bastion.services.ssh.actif") === false, "restart raté : sshd arrêté");
contient(t("systemctl status ssh"), "failed (Result: exit-code)", "status : failed");
egal(t("systemctl is-active ssh"), "failed", "is-active : failed");
egal(t("systemctl is-failed ssh"), "failed", "is-failed : failed");
jeu.lire("supprimerFichierHote('bastion', '/etc/ssh/sshd_config.d/60-faute.conf')");
egal(t("sudo systemctl start ssh | cat"), "", "start ssh après correction");
egal(t("systemctl is-active ssh"), "active", "ssh de nouveau actif");
absent(t("systemctl status ssh"), "Reload failed", "status : plus d'échec affiché");
// Les fautes de valeur
var VALEURS = [["PermitRootLogin maybe", "line 1: unsupported option \"maybe\"."], ["MaxAuthTries trois", "line 1: MaxAuthTries integer value invalid."],
	["Port 70000", "line 1: Badly formatted port number."], ["Ciphers aes128-cbc,rot13", "line 1: Bad SSH2 cipher spec 'aes128-cbc,rot13'."],
	["MACs hmac-sha3", "line 1: Bad SSH2 mac spec 'hmac-sha3'."], ["KexAlgorithms diffie-hellman-group99", "line 1: Bad SSH2 KexAlgorithms 'diffie-hellman-group99'."],
	["LoginGraceTime 2x", "line 1: invalid time value."], ["PasswordAuthentication", "line 1: missing argument."], ["LogLevel BAVARD", "line 1: unsupported log level 'BAVARD'"]];
VALEURS.forEach(function(v){
	jeu.lire("ecrireFichierHote('bastion', '/etc/ssh/sshd_config.d/70-test.conf', " + JSON.stringify(v[0] + "\n") + ")");
	var r = t("sudo sshd -t");
	contient(r, "/etc/ssh/sshd_config.d/70-test.conf " + v[1], "sshd -t : « " + v[0] + " »");
	verifier(code() === 255, "sshd -t : code 255 pour « " + v[0] + " »");
});
jeu.lire("ecrireFichierHote('bastion', '/etc/ssh/sshd_config.d/70-test.conf', 'Protocol 2\\nCiphers +aes128-cbc\\nMACs -hmac-sha1*\\n')");
s = t("sudo sshd -T");
contient(s, "Deprecated option Protocol", "sshd : une option obsolète est signalée sans être fatale");
egal(code(), 0, "option obsolète : code 0");
verifier(jeu.lire("listeAlgos('+aes128-cbc', CIPHERS_SSH, DEFAUT_CIPHERS).split(',').pop()") === "aes128-cbc", "Ciphers +algo : ajouté à la liste par défaut");
verifier(jeu.lire("listeAlgos('-hmac-sha1*', MACS_SSH, DEFAUT_MACS).indexOf('hmac-sha1') === -1"), "MACs -motif : retiré");
egal(jeu.lire("listeAlgos('^aes256-ctr', CIPHERS_SSH, DEFAUT_CIPHERS).split(',')[0]"), "aes256-ctr", "Ciphers ^algo : en tête");
jeu.lire("supprimerFichierHote('bastion', '/etc/ssh/sshd_config.d/70-test.conf')");
jeu.lire("ecrireFichierHote('bastion', '/etc/ssh/sshd_config.d/80-match.conf', 'Match User ada\\n  PasswordAuthentication yes\\n')");
egal(jeu.lire("configSshFichiers('bastion').passwordauthentication"), "no", "Match : le bloc conditionnel ne change pas la configuration globale");
jeu.lire("supprimerFichierHote('bastion', '/etc/ssh/sshd_config.d/80-match.conf')");
contient(t("sudo sshd"), "c'est le service ssh", "sshd sans -t ni -T");
contient(t("sudo sshd -x"), "sshd: illegal option -- x", "sshd : option inconnue");
contient(t("sshd -V 2>&1"), "OpenSSH_9.2p1", "sshd -V");
verifier(jeu.lire("verifierSshd('bastion').ok") === true, "verifierSshd pour le monde");

/* --- 10. ssh-keygen --- */
t("cd ~");
s = t("ssh-keygen -t ed25519 -C ada@poste -N '' -f ~/.ssh/bastion");
contient(s, "Generating public/private ed25519 key pair.", "ssh-keygen -t ed25519 -N");
contient(s, "Your public key has been saved in ~/.ssh/bastion.pub", "ssh-keygen -f : le nom choisi");
contient(s, "ada@poste", "ssh-keygen -C : le commentaire");
contient(t("cat ~/.ssh/bastion.pub"), "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI", "la clé publique ed25519");
contient(t("ls -l ~/.ssh/bastion"), "rw-------", "la clé privée en 600");
verifier(evt("EVENEMENTS.keygen.typeCle") === "ed25519" && evt("EVENEMENTS.keygen.passphrase") === false, "événement keygen avec le type");
s = t("ssh-keygen -t rsa -b 4096 -N 'phrase' -f ~/.ssh/vieux");
contient(s, "rsa key pair", "ssh-keygen -t rsa");
contient(s, "+---[RSA 4096]----+", "ssh-keygen : le dessin dit RSA 4096, centré comme le vrai");
contient(t("ssh-keygen -t rsa -b 512 -N '' -f ~/.ssh/court"), "Invalid RSA key length: minimum is 1024 bits", "ssh-keygen : RSA trop court");
contient(t("ssh-keygen -t dsa"), "unknown key type dsa", "ssh-keygen : DSA refusé");
contient(t("ssh-keygen -t ed448"), "unknown key type ed448", "ssh-keygen : type inconnu");
verifier(/^256 SHA256:\S+ ada@poste \(ED25519\)$/.test(t("ssh-keygen -l -f ~/.ssh/bastion.pub")), "ssh-keygen -l : l'empreinte");
contient(t("ssh-keygen -y"), "unknown option -- y", "ssh-keygen : option inconnue");
s = t("ssh-keygen", ["", ""]);
contient(s, "Generating public/private ed25519 key pair.", "ssh-keygen sans option : la fabrique d'origine");
contient(s, "~/.ssh/id_ed25519", "ssh-keygen sans option : id_ed25519");
contient(t("ssh-keygen -t ed25519", ["y", "", ""]), "Your identification has been saved in ~/.ssh/id_ed25519", "ssh-keygen -t ed25519 : la même fabrique");
t("ssh bastion");

/* --- 11. ss et netstat --- */
s = t("ss -tulpn");
egal(s.split("\n")[0], "Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess", "ss -tulpn : l'en-tête aligné comme iproute2");
contient(s, "tcp   LISTEN 0      128          0.0.0.0:22         0.0.0.0:*", "ss -tulpn : sshd en IPv4");
contient(s, "tcp   LISTEN 0      128             [::]:22            [::]:*", "ss -tulpn : sshd en IPv6");
contient(s, "tcp   LISTEN 0      511                *:80               *:*", "ss -tulpn : apache2 sur *");
contient(s, "udp   UNCONN 0      0            0.0.0.0:111        0.0.0.0:*", "ss -tulpn : rpcbind en UDP");
contient(s, "[::]:23", "ss -tulpn : telnet.socket");
absent(s, "users:((", "ss -p sans sudo : pas les processus des autres");
contient(s, "La colonne Process reste vide", "ss -p sans sudo : on le dit");
s = t("sudo ss -tulpn");
var pidSshd = jeu.lire("HOTES.bastion.services.ssh.pid");
contient(s, "users:((\"sshd\",pid=" + pidSshd + ",fd=3))", "sudo ss -tulpn : sshd et son PID (celui de ps)");
contient(s, "users:((\"apache2\",pid=733,fd=3))", "sudo ss -tulpn : apache2");
contient(s, "users:((\"systemd\",pid=1,fd=3))", "sudo ss -tulpn : un socket systemd (telnet.socket)");
contient(s, "users:((\"rpcbind\",pid=511,fd=5))", "sudo ss -tulpn : rpcbind en UDP (fd 5)");
contient(t("sudo ps aux"), String(pidSshd), "ps montre le même PID de sshd");
s = t("ss -tln");
absent(s, "Netid", "ss -t seul : pas de colonne Netid");
absent(s, "udp", "ss -tln : pas d'UDP");
contient(t("ss -ul"), "sunrpc", "ss sans -n : le nom du port");
contient(t("ss -tl"), ":ssh", "ss -tl : :ssh");
contient(t("ss -tln4"), "0.0.0.0:22", "ss -4 : IPv4");
absent(t("ss -tln4"), "[::]:22", "ss -4 : pas d'IPv6");
absent(t("ss -tln6"), "0.0.0.0:22", "ss -6 : pas d'IPv4");
contient(t("ss -ta"), "ESTAB", "ss -ta : la session ssh établie");
contient(t("ss -t"), "ESTAB", "ss -t : seulement les établies");
absent(t("ss -t"), "LISTEN", "ss -t sans -l : pas d'écoute");
egal(t("ss -tlnH | head -1").indexOf("State"), -1, "ss -H : sans en-tête");
contient(t("ss -z"), "ss: invalid option -- 'z'", "ss : option inconnue");
verifier(evt("EVENEMENTS.ss.generique") === true, "événement ss générique");
s = t("netstat -loptn 2>/dev/null");
egal(s.split("\n")[0], "Active Internet connections (only servers)", "netstat -loptn : le titre");
egal(s.split("\n")[1], "Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    Timer", "netstat -loptn : l'en-tête");
contient(s, "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -                   off (0.00/0/0)", "netstat -loptn : sshd, - sans sudo, Timer");
contient(s, "tcp6       0      0 :::80                   :::*                    LISTEN", "netstat : apache2 en tcp6");
contient(t("netstat -loptn 2>&1 >/dev/null"), "(Not all processes could be identified", "netstat -p sans sudo : l'avertissement du vrai, sur la sortie d'erreur");
s = t("sudo netstat -loptn");
contient(s, pidSshd + "/sshd", "sudo netstat -loptn : PID/programme");
absent(s, "Not all processes", "sudo netstat : pas d'avertissement");
s = t("sudo netstat -tulpn");
contient(s, "udp        0      0 0.0.0.0:111             0.0.0.0:*                           511/rpcbind", "netstat -tulpn : UDP sans état");
contient(t("netstat -tl"), "0.0.0.0:ssh", "netstat sans -n : les noms");
contient(t("netstat -tan"), "ESTABLISHED", "netstat -tan : la session");
contient(t("netstat -ta"), "Active Internet connections (servers and established)", "netstat -a : le titre");
contient(t("netstat -t"), "Active Internet connections (w/o servers)", "netstat sans -l : le titre");
contient(t("netstat -z"), "invalid option", "netstat : option inconnue");
// La cohérence : ce que ss voit, netstat le voit.
var portsSs = jeu.lire("EVENEMENTS.ss.ports.slice().sort().join(',')");
t("sudo ss -tulpn");
portsSs = jeu.lire("EVENEMENTS.ss.ports.slice().sort().join(',')");
t("sudo netstat -tulpn");
egal(jeu.lire("EVENEMENTS.netstat.ports.slice().sort().join(',')"), portsSs, "ss et netstat voient les mêmes ports");
verifier(jeu.lire("ecoutesHote('bastion').length") >= 7, "ecoutesHote pour le monde");

/* --- 12. systemctl --- */
s = t("systemctl status apache2");
contient(s, "\u25CF apache2.service - The Apache HTTP Server", "status : la puce et la description de l'unité");
contient(s, "Loaded: loaded (/lib/systemd/system/apache2.service; enabled; preset: enabled)", "status : Loaded");
contient(s, "Active: active (running)", "status : Active");
contient(s, "Main PID: 733 (apache2)", "status : Main PID");
contient(s, "Docs: https://httpd.apache.org/docs/2.4/", "status : Docs");
egal(t("systemctl is-enabled apache2"), "enabled", "is-enabled");
egal(t("systemctl is-active apache2"), "active", "is-active");
egal(code(), 0, "is-active : code 0");
egal(t("systemctl is-enabled ctrl-alt-del.target"), "static", "ctrl-alt-del.target : static");
contient(t("systemctl status nimporte"), "Unit nimporte.service could not be found.", "status d'une unité inconnue");
egal(code(), 4, "status inconnue : code 4");
contient(t("systemctl stop telnet.socket"), "Access denied", "stop sans sudo");
s = t("sudo systemctl disable --now telnet.socket");
contient(s, "Removed \"/etc/systemd/system/sockets.target.wants/telnet.socket\".", "disable --now d'un socket");
egal(t("systemctl is-active telnet.socket"), "inactive", "telnet.socket arrêté");
egal(code(), 3, "is-active inactive : code 3");
egal(t("systemctl is-enabled telnet.socket"), "disabled", "telnet.socket désactivé");
absent(t("ss -tln"), ":23 ", "ss ne voit plus le port 23");
absent(t("netstat -tln"), ":23 ", "netstat ne voit plus le port 23");
verifier(evt("EVENEMENTS.systemctl.action") === "disable" && evt("EVENEMENTS.systemctl.now") === true, "événement systemctl disable --now");
s = t("sudo systemctl enable --now telnet.socket");
contient(s, "Created symlink /etc/systemd/system/sockets.target.wants/telnet.socket \u2192 /lib/systemd/system/telnet.socket.", "enable --now");
contient(t("ss -tln"), ":23", "le port 23 revient");
t("sudo systemctl disable --now telnet.socket rpcbind");
egal(t("systemctl is-active rpcbind"), "inactive", "disable --now de deux unités");
// mask
s = t("sudo systemctl mask ctrl-alt-del.target");
egal(s.split("\n")[0], "Created symlink /etc/systemd/system/ctrl-alt-del.target \u2192 /dev/null.", "mask : le lien vers /dev/null");
contient(t("ls -l /etc/systemd/system"), "ctrl-alt-del.target -> /dev/null", "mask : ls -l voit le lien");
egal(t("systemctl is-enabled ctrl-alt-del.target"), "masked", "is-enabled : masked");
egal(code(), 1, "is-enabled masked : code 1");
contient(t("systemctl status ctrl-alt-del.target"), "Loaded: masked (Reason: Unit ctrl-alt-del.target is masked.)", "status d'une unité masquée");
contient(t("sudo systemctl start ctrl-alt-del.target"), "Failed to start ctrl-alt-del.target: Unit ctrl-alt-del.target is masked.", "start d'une unité masquée");
verifier(evt("EVENEMENTS.mask.unite") === "ctrl-alt-del.target", "événement mask");
t("sudo systemctl mask --now rpcbind");
contient(t("sudo systemctl enable rpcbind"), "Failed to enable unit: Unit file /etc/systemd/system/rpcbind.service is masked.", "enable d'une unité masquée");
contient(t("systemctl list-unit-files --state=masked"), "rpcbind.service", "list-unit-files --state=masked");
s = t("sudo systemctl unmask rpcbind");
egal(s, "Removed \"/etc/systemd/system/rpcbind.service\".", "unmask");
egal(t("systemctl is-enabled rpcbind"), "disabled", "après unmask : de nouveau disabled");
verifier(evt("EVENEMENTS.unmask.unite") === "rpcbind.service", "événement unmask");
contient(t("sudo systemctl mask cron.service --now"), "Created symlink", "mask --now (option après)");
egal(t("systemctl is-active cron"), "inactive", "mask --now arrête");
t("sudo systemctl unmask cron"); t("sudo systemctl start cron");
// list-units, list-unit-files
s = t("systemctl list-unit-files --state=enabled");
egal(s.split("\n")[0].replace(/\s+/g, " "), "UNIT FILE STATE PRESET", "list-unit-files : l'en-tête");
contient(s, "apache2.service", "list-unit-files --state=enabled : apache2");
absent(s, "telnet.socket", "list-unit-files --state=enabled : pas telnet.socket");
contient(s, "unit files listed.", "list-unit-files : le total");
s = t("systemctl list-units --type=service");
contient(s, "apache2.service", "list-units --type=service");
absent(s, ".target", "list-units --type=service : pas de cible");
absent(s, "rpcbind", "list-units : pas les arrêtés");
contient(t("systemctl list-units --type=service --all"), "rpcbind.service", "list-units --all : aussi les arrêtés");
contient(s, "loaded units listed. Pass --all to see loaded but inactive units, too.", "list-units : la fin du vrai");
contient(t("systemctl list-sockets --all"), "telnet.socket", "list-sockets --all");
// cat, edit, daemon-reload
s = t("systemctl cat apache2");
egal(s.split("\n")[0], "# /lib/systemd/system/apache2.service", "cat : le chemin en tête");
contient(s, "PrivateTmp=true", "cat : le contenu");
contient(t("systemctl cat nimporte"), "No files found for nimporte.service.", "cat d'une unité inconnue");
s = t("systemd-analyze security apache2");
contient(s, "\u2192 Overall exposure level for apache2.service: 9.3 UNSAFE", "systemd-analyze : apache2 9.3 UNSAFE");
contient(s, "\u2713 PrivateTmp=", "systemd-analyze : PrivateTmp en place");
contient(s, "\u2717 NoNewPrivileges=", "systemd-analyze : NoNewPrivileges absent");
contient(s, "Service processes may acquire new privileges", "systemd-analyze : la description");
contient(s, "\u2717 ProtectSystem=", "systemd-analyze : ProtectSystem absent");
verifier(evt("EVENEMENTS.systemdSecurity.exposition") === 9.3 && evt("EVENEMENTS.systemdSecurity.predicat") === "UNSAFE", "événement systemdSecurity");
s = t("systemd-analyze security");
egal(s.split("\n")[0].replace(/\s+/g, " "), "UNIT EXPOSURE PREDICATE HAPPY", "systemd-analyze security : l'en-tête");
verifier(/cron\.service\s+9\.6 UNSAFE/.test(s), "cron.service : 9.6 UNSAFE (un service sans protection)");
verifier(/systemd-journald\.service\s+\d\.\d (MEDIUM|EXPOSED|OK)/.test(s), "journald : mieux protégé");
contient(t("systemd-analyze security nimporte"), "Unit nimporte.service not found.", "systemd-analyze : unité inconnue");
contient(t("systemctl edit apache2"), "Permission denied", "edit sans sudo");
editer("function(t){ return t.replace('### Anything between here and the comment below will become the new contents of the file\\n\\n', '### Anything between here and the comment below will become the new contents of the file\\n[Service]\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=full\\n'); }");
s = t("sudo systemctl edit apache2");
contient(s, "[nano /etc/systemd/system/apache2.service.d/.#override.conf", "edit ouvre un fichier temporaire du drop-in");
egal(jeu.lire("texteHote('bastion', '/etc/systemd/system/apache2.service.d/override.conf')"), "[Service]\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=full\n", "edit écrit override.conf");
verifier(evt("EVENEMENTS.systemctlEdit.unite") === "apache2.service", "événement systemctlEdit");
verifier(evt("EVENEMENTS.daemonReload.hote") === "bastion", "edit relit les unités (daemonReload)");
s = t("systemd-analyze security apache2");
contient(s, "Overall exposure level for apache2.service: 8.6 EXPOSED", "la note descend après le drop-in");
contient(s, "\u2713 NoNewPrivileges=", "NoNewPrivileges en place");
contient(s, "Service has very limited write access to the OS file hierarchy", "ProtectSystem=full : la description");
s = t("systemctl status apache2");
contient(s, "Drop-In: /etc/systemd/system/apache2.service.d", "status : le drop-in");
contient(s, "override.conf", "status : override.conf");
s = t("systemctl cat apache2");
contient(s, "# /etc/systemd/system/apache2.service.d/override.conf\n[Service]\nNoNewPrivileges=yes", "cat : le drop-in après le fichier");
// Une modification à la main : daemon-reload nécessaire.
jeu.lire("ecrireFichierHote('bastion', '/etc/systemd/system/apache2.service.d/override.conf', '[Service]\\nNoNewPrivileges=yes\\nPrivateTmp=yes\\nProtectSystem=strict\\nProtectHome=yes\\n')");
contient(t("systemctl status apache2"), "changed on disk. Run 'systemctl daemon-reload' to reload units.", "status : changé sur le disque");
contient(t("systemd-analyze security apache2"), "8.6 EXPOSED", "sans daemon-reload, systemd garde l'ancienne version");
contient(t("systemctl daemon-reload"), "Access denied", "daemon-reload sans sudo");
egal(t("sudo systemctl daemon-reload | cat"), "", "daemon-reload");
s = t("systemd-analyze security apache2");
verifier(/apache2\.service: (7\.\d|8\.[0-5]) /.test(s), "après daemon-reload, la note baisse encore");
absent(t("systemctl status apache2"), "changed on disk", "après daemon-reload : plus d'avertissement");
editer("function(t){ return t.replace(/\\[Service\\][\\s\\S]*?(\\n\\n### Lines below)/, '$1'); }");
contient(t("sudo systemctl edit apache2"), "canceled: temporary file is empty", "edit vidé : annulé");
verifier(jeu.lire("texteHote('bastion', '/etc/systemd/system/apache2.service.d/override.conf') !== null"), "edit annulé : override.conf reste");
editer("function(t){ return t.replace('ExecStart=/usr/sbin/cron -f $EXTRA_OPTS', 'ExecStart=/usr/sbin/cron -f $EXTRA_OPTS\\nNoNewPrivileges=yes'); }");
t("sudo systemctl edit --full cron");
contient(jeu.lire("texteHote('bastion', '/etc/systemd/system/cron.service')"), "NoNewPrivileges=yes", "edit --full : une copie complète dans /etc/systemd/system");
contient(t("systemctl status cron"), "Loaded: loaded (/etc/systemd/system/cron.service;", "la copie de /etc l'emporte sur /lib");
contient(t("systemctl edit nimporte"), "Permission denied", "edit inconnu sans sudo");
contient(t("sudo systemctl edit nimporte"), "No files found for nimporte.service.", "edit d'une unité inconnue");
contient(t("sudo systemctl frobnicate apache2"), "Unknown command verb 'frobnicate'.", "systemctl : action inconnue");
// Les contrôles d'un autre fichier (apache : apachectl configtest)
jeu.lire("controleAvantDemarrage(function(h, u, a){ return u === 'apache2.service' && typeof APACHE_CASSE !== 'undefined' && APACHE_CASSE ? 'AH00526: Syntax error' : null; }); var APACHE_CASSE = true;");
contient(t("sudo systemctl reload apache2"), "Job for apache2.service failed", "un contrôle d'un autre fichier refuse le reload");
verifier(jeu.lire("HOTES.bastion.services.apache2.actif") === true, "reload refusé : apache2 tourne toujours");
jeu.lire("APACHE_CASSE = false");
egal(t("sudo systemctl reload apache2 | cat"), "", "le contrôle passe : reload accepté");
// Les timers restent ceux de SortsArcanes.js
contient(t("systemctl list-timers --all"), "logrotate.timer", "list-timers : SortsArcanes");
egal(jeu.lire("etatUnite('bastion', 'apache2').actif"), true, "etatUnite pour le monde");
egal(jeu.lire("uniteInfo('bastion', 'sshd').unite"), "ssh.service", "sshd désigne ssh.service");
jeu.lire("var B2 = new Room('b2', 'test'); B2.racineHote = 'b2'; link_rooms(Machines, B2); decrireHote('b2', { ip: '10.0.92.81', arrivee: function(){ return B2; }, services: { sshd: service('b2', 'sshd', 'OpenBSD Secure Shell server') } });" +
	"ecrireFichierHote('b2', '/lib/systemd/system/ssh.service', '[Unit]\\nDescription=OpenBSD Secure Shell server\\n[Service]\\nExecStart=/usr/sbin/sshd -D\\n[Install]\\nWantedBy=multi-user.target\\n')");
egal(jeu.lire("uniteInfo('b2', 'sshd').unite"), "ssh.service", "une clé sshd dans decrireHote suit le fichier ssh.service");
egal(jeu.lire("unitesHote('b2').filter(function(u){ return /^sshd?\\./.test(u); }).join(' ')"), "ssh.service", "unitesHote : une seule unité ssh");
verifier(jeu.lire("hoteGere('b2')") === true && jeu.lire("hoteGere('archives')") === false, "hoteGere : seulement les machines dont systemd est décrit sur le disque");
// Sur une machine des chapitres précédents, rien ne change.
t("exit");
jeu.lire("Shell.pile_ssh.push(current_room); enterRoom(Citadelle)");
egal(jeu.lire("Shell.hote()"), "citadelle", "sur la Citadelle (chapitre 3)");
contient(t("systemctl status sshd 2>&1"), "sshd.service", "citadelle : systemctl inchangé");
contient(t("sudo systemctl mask truc"), "Created symlink /etc/systemd/system/truc.service \u2192 /dev/null.", "citadelle : mask dans l'état (pas de /etc/systemd sur cette machine)");
contient(t("sudo systemctl start truc"), "is masked", "citadelle : start d'une unité masquée");
egal(t("systemctl is-enabled truc"), "masked", "citadelle : is-enabled masked");
t("sudo systemctl unmask truc");
s = t("sudo -l");
contient(s, "User " + JOUEUR + " may run the following commands on citadelle:", "citadelle : sudo -l lit son sudoers");
contient(s, "(ALL : ALL) ALL", "citadelle : les pleins pouvoirs du joueur (le jeu les lui donne)");
contient(t("sudo -l -U corbeau"), "(ALL) NOPASSWD: ALL", "citadelle : la ligne du Corbeau se voit avec sudo -l -U");
t("exit");
contient(t("sudo -l"), "(ALL : ALL) ALL", "une machine sans sudoers : sudo -l dit les pleins pouvoirs du joueur");
t("ssh bastion");
t("exit");
t("ssh bastion");

/* --- 13. Les paquets --- */
s = t("apt list --upgradable 2>/dev/null");
egal(s.split("\n")[0], "En train de lister... Fait", "apt list --upgradable : la première ligne");
contient(s, "sudo/stable-security 1.9.13p3-1+deb12u2 amd64 [pouvant être mis à jour depuis : 1.9.13p3-1+deb12u1]", "apt list --upgradable : sudo");
contient(s, "apache2/stable-security 2.4.62-1~deb12u2 amd64 [pouvant être mis à jour depuis : 2.4.62-1~deb12u1]", "apt list --upgradable : apache2");
absent(s, "coreutils", "apt list --upgradable : pas les paquets à jour");
contient(t("apt list --upgradable 2>&1 | head -2"), "AVERTISSEMENT : apt n'a pas d'interface en ligne de commande stable", "apt dans un tuyau : l'avertissement");
egal(t("apt-get list"), "E: L'opération list n'est pas valable", "apt-get list n'existe pas");
s = t("apt list --installed 2>/dev/null");
contient(s, "coreutils/stable,now 9.1-1 amd64 [installé]", "apt list --installed");
contient(s, "sudo/stable-security,now 1.9.13p3-1+deb12u2 amd64 [installé, pouvant être mis à jour vers : 1.9.13p3-1+deb12u2]", "apt list --installed : à mettre à jour");
absent(s, "nmap", "apt list --installed : pas nmap (non installé)");
contient(t("apt update"), "Impossible d'obtenir le verrou de dpkg", "apt update sans sudo");
egal(code(), 100, "apt sans sudo : code 100");
s = t("sudo apt update");
contient(s, "2 paquets peuvent être mis à jour. Exécutez « apt list --upgradable » pour les voir.", "apt update : le nombre");
// dpkg -V et debsums
s = t("sudo dpkg -V");
contient(s, "??5??????   /usr/bin/ls", "dpkg -V : un binaire modifié");
absent(s, "/usr/bin/cat", "dpkg -V : les fichiers intacts ne sont pas listés");
egal(code(), 1, "dpkg -V : code 1 quand quelque chose a changé");
t("sudo dpkg -V coreutils");
verifier(evt("EVENEMENTS.dpkgVerify.modifies[0]") === "/usr/bin/ls" && evt("EVENEMENTS.dpkgVerify.paquet") === "coreutils", "événement dpkgVerify");
s = t("sudo debsums -s");
egal(s.split("\n")[0], "debsums: changed file /usr/bin/ls (from coreutils package)", "debsums -s");
egal(code(), 2, "debsums -s : code 2");
s = t("debsums coreutils");
verifier(/^\/usr\/bin\/cat\s+OK$/m.test(s) && /^\/usr\/bin\/ls\s+FAILED$/m.test(s), "debsums PAQUET");
egal(t("debsums -c | head -1"), "/usr/bin/ls", "debsums -c");
contient(t("debsums inexistant 2>&1"), "debsums: package inexistant is not installed", "debsums d'un paquet absent");
verifier(evt("EVENEMENTS.debsums.generique") === true, "événement debsums générique");
egal(t("dpkg -S /usr/bin/ls"), "coreutils: /usr/bin/ls", "dpkg -S");
contient(t("dpkg -S sshd"), "openssh-server: /usr/sbin/sshd", "dpkg -S motif");
contient(t("dpkg -S /usr/bin/inconnu"), "dpkg-query: aucun chemin ne correspond au motif /usr/bin/inconnu", "dpkg -S : rien");
egal(code(), 1, "dpkg -S sans résultat : code 1");
s = t("dpkg -l");
contient(s, "||/ Nom", "dpkg -l : l'en-tête");
verifier(/^ii  openssh-server\s+1:9\.2p1-2\+deb12u3\s+amd64\s+secure shell/m.test(s), "dpkg -l : une ligne ii");
absent(s, "nmap", "dpkg -l : pas les paquets absents");
contient(t("dpkg -l 'tel*'"), "telnetd", "dpkg -l motif");
contient(t("dpkg -l nmap"), "un  nmap", "dpkg -l d'un paquet absent : un");
contient(t("dpkg -l zzz"), "aucun paquet ne correspond", "dpkg -l sans résultat");
contient(t("dpkg -L coreutils"), "/usr/bin/cat\n/usr/bin/ls", "dpkg -L");
contient(t("dpkg -s sudo"), "Status: install ok installed", "dpkg -s");
contient(t("dpkg"), "une option d'action est nécessaire", "dpkg sans action");
// reinstall
s = t("sudo apt install --reinstall coreutils");
contient(s, "0 mis à jour, 0 nouvellement installés, 1 réinstallés, 0 à enlever et 2 non mis à jour.", "apt install --reinstall : le bilan");
contient(s, "Dépaquetage de coreutils (9.1-1) sur (9.1-1) ...", "apt install --reinstall : le dépaquetage");
egal(jeu.lire("texteHote('bastion', '/usr/bin/ls')"), "ELF ls 9.1\n", "--reinstall : le binaire d'origine revient");
egal(t("sudo debsums -s | cat"), "", "debsums -s : plus rien après réinstallation");
verifier(evt("EVENEMENTS.apt.action") === "reinstall" && evt("EVENEMENTS.apt.paquets[0]") === "coreutils", "événement apt reinstall");
contient(t("sudo apt install coreutils"), "coreutils est déjà la version la plus récente (9.1-1).", "apt install d'un paquet à jour");
// upgrade
s = t("sudo apt upgrade");
contient(s, "Les paquets suivants seront mis à jour :\n  apache2 sudo", "apt upgrade : la liste");
contient(s, "2 mis à jour, 0 nouvellement installés, 0 à enlever et 0 non mis à jour.", "apt upgrade : le bilan");
contient(s, "Paramétrage de sudo (1.9.13p3-1+deb12u2) ...", "apt upgrade : le paramétrage");
egal(jeu.lire("etatPaquet('bastion', 'sudo').version"), "1.9.13p3-1+deb12u2", "apt upgrade : la nouvelle version");
verifier(evt("EVENEMENTS.apt.action") === "upgrade" && evt("EVENEMENTS.apt.paquets.length") === 2, "événement apt upgrade");
egal(t("apt list --upgradable 2>/dev/null"), "En train de lister... Fait", "plus rien à mettre à jour");
contient(t("sudo apt-get upgrade"), "0 mis à jour, 0 nouvellement installés, 0 à enlever et 0 non mis à jour.", "apt-get upgrade : rien");
// remove, purge
t("sudo systemctl enable --now telnet.socket");
contient(t("ss -tln"), ":23", "telnet écoute avant la purge");
s = t("sudo apt purge telnetd");
contient(s, "Les paquets suivants seront ENLEVÉS :\n  telnetd*", "apt purge : l'étoile");
contient(s, "Suppression de telnetd (0.17+2.4-2+deb12u1) ...", "apt purge : suppression");
contient(s, "Purge des fichiers de configuration de telnetd (0.17+2.4-2+deb12u1) ...", "apt purge : purge de la configuration");
absent(t("ss -tln"), ":23", "après purge : plus de port 23");
contient(t("systemctl status telnet.socket"), "could not be found", "après purge : l'unité a disparu");
verifier(jeu.lire("texteHote('bastion', '/usr/sbin/in.telnetd') === null && texteHote('bastion', '/etc/default/telnetd') === null"), "purge : programme et configuration effacés");
contient(t("dpkg -l telnetd"), "un  telnetd", "dpkg -l après purge");
verifier(evt("EVENEMENTS.apt.action") === "purge", "événement apt purge");
contient(t("sudo apt purge telnetd"), "Le paquet « telnetd » n'est pas installé, et ne peut donc être supprimé", "purge d'un paquet absent");
s = t("sudo apt install telnetd");
contient(s, "Les NOUVEAUX paquets suivants seront installés :\n  telnetd", "réinstaller un paquet purgé");
contient(t("ss -tln"), ":23", "le socket revient avec le paquet");
s = t("sudo apt-get remove telnetd");
contient(s, "Les paquets suivants seront ENLEVÉS :\n  telnetd\n", "apt-get remove : sans étoile");
contient(t("dpkg -l telnetd"), "rc  telnetd", "remove : rc (configuration gardée)");
verifier(jeu.lire("texteHote('bastion', '/etc/default/telnetd') !== null && texteHote('bastion', '/usr/sbin/in.telnetd') === null"), "remove : la configuration reste, le programme part");
contient(t("sudo apt purge telnetd"), "Purge des fichiers de configuration de telnetd", "purge d'un paquet rc");
contient(t("sudo apt install inconnu"), "E: Impossible de trouver le paquet inconnu", "apt install inconnu");
egal(code(), 100, "apt : code 100 pour un paquet inconnu");
contient(t("apt show sudo"), "Package: sudo", "apt show");
contient(t("sudo apt frobnicate"), "Opération frobnicate non valable", "apt : opération inconnue");
contient(t("sudo apt install cowsay"), "cowsay", "apt install cowsay (l'ancien apt) marche toujours sur le bastion");
// etckeeper
contient(t("etckeeper commit 'x'"), "must be run as root", "etckeeper sans sudo");
s = t("sudo etckeeper vcs log --oneline");
contient(s, "Initial commit", "etckeeper : le commit initial");
s = t("sudo etckeeper vcs status");
contient(s, "modified:   pam.d/common-auth", "vcs status : le changement de common-auth (depuis l'installation)");
contient(s, "modified:   pam.d/su", "vcs status : pam.d/su");
contient(s, "ssh/sshd_config.d/50-bastion.conf", "vcs status : un fichier ajouté");
s = t("sudo etckeeper vcs diff");
contient(s, "diff --git a/pam.d/su b/pam.d/su", "vcs diff : l'en-tête git");
contient(s, "-# auth       required   pam_wheel.so", "vcs diff : la ligne retirée");
contient(s, "+auth       required   pam_wheel.so group=sudo", "vcs diff : la ligne ajoutée");
s = t("sudo etckeeper commit \"Durcissement : SSH, sudo, pam\"");
verifier(/^\[master [0-9a-f]{7}\] Durcissement : SSH, sudo, pam\n \d+ files changed, \d+ insertions?\(\+\), \d+ deletions?\(-\)/.test(s), "etckeeper commit : la réponse de git");
contient(s, "create mode 100644 ssh/sshd_config.d/50-bastion.conf", "etckeeper commit : create mode");
verifier(evt("EVENEMENTS.etckeeper.action") === "commit" && evt("EVENEMENTS.etckeeper.fichiers").indexOf("pam.d/su") > -1, "événement etckeeper commit");
egal(t("sudo etckeeper vcs status"), "On branch master\nnothing to commit, working tree clean", "vcs status après commit");
contient(t("sudo etckeeper commit 'rien'"), "Rien à enregistrer", "commit sans changement");
s = t("sudo etckeeper vcs log");
verifier(/^commit [0-9a-f]{40}\nAuthor: \S+ <\S+@bastion>\nDate:   [A-Z][a-z]{2} [A-Z][a-z]{2} \d+ \d\d:\d\d:\d\d \d{4} [+-]\d{4}\n\n    Durcissement/.test(s), "vcs log : le format de git log");
egal(jeu.lire("etckeeperHistorique('bastion').length"), 2, "etckeeperHistorique pour le monde");
jeu.lire("ecrireFichierHote('bastion', '/etc/issue', 'Accès réservé.\\n')");
contient(t("sudo etckeeper vcs status"), "\tissue", "vcs status : un nouveau fichier");
egal(t("sudo etckeeper unclean; echo $?"), "0", "etckeeper unclean : 0 s'il reste des changements");

/* --- 14. Le manuel, les droits de sortie, l'XP --- */
jeu.lire("SORTS_BASTION").forEach(function(sort){
	verifier(jeu.lire("!!MANUEL[" + JSON.stringify(sort) + "] && MANUEL[" + JSON.stringify(sort) + "].page.length > 80"), "page de manuel pour " + sort);
	verifier(jeu.lire("MANUEL[" + JSON.stringify(sort) + "].horsBareme === true"), sort + " est hors barème tant qu'aucun chapitre ne l'enseigne");
	verifier(jeu.lire("COMMANDES_REELLES.indexOf(" + JSON.stringify(sort) + ") === -1"), sort + " n'est plus une « vraie commande absente de ce monde »");
	contient(t("man " + sort), sort, "man " + sort);
});
["sudo", "visudo", "usermod", "chage", "passwd", "crontab", "at", "systemctl", "ss", "netstat", "apt", "debsums", "ssh-keygen", "lastlog"].forEach(function(sort){
	verifier(jeu.lire("MANUEL[" + JSON.stringify(sort) + "].page").length > 300, "la page de " + sort + " est complétée");
});
contient(t("man sshd"), "sudo sshd -t", "man sshd");
contient(t("systemd-analyze --help"), "systemctl edit", "--help");
var xpAvant = jeu.lire("state.xp");
jeu.lire("delete state.usages.pwck");
t("sudo pwck -r");
verifier(jeu.lire("state.xp") === xpAvant, "un sort hors barème ne rapporte pas d'XP (" + xpAvant + " puis " + jeu.lire("state.xp") + ")");
var source = fs.readFileSync(path.join(__dirname, "..", "Web", "static", "javascript", "SortsBastion.js"), "utf8");
verifier(source.indexOf("\u2014") === -1, "pas de tiret cadratin dans SortsBastion.js");
verifier(source.indexOf("CyberSup") === -1, "Cybersup bien écrit");
verifier((source.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(source.match(/\/\*[\s\S]*?\*\//g) || []).every(function(x){ return x.indexOf(" & ") === -1; }), "pas d'esperluette en prose");
verifier(!/\beval\s*\(|new Function\s*\(/.test(source), "ni eval ni Function");
var tirets = jeu.lire("Object.keys(MANUEL).filter(function(k){ return /\\u2014/.test(MANUEL[k].page + MANUEL[k].resume + MANUEL[k].titre); }).join(' ')");
egal(tirets, "", "pas de tiret cadratin dans le manuel");
contient(t("su"), "", "su sans tty sur le terminal de test : pas de plantage");
contient(t("apt-get install cowsay"), "", "apt-get connu : il marche");
jeu.lire("delete state.spells['apt-get']");
contient(t("apt-get install cowsay"), "s'appelle apt", "apt-get inconnu : la réponse d'avant");
jeu.lire("state.spells['apt-get'] = true");

/* --- 15. Sauvegarde et rechargement --- */
t("sudo faillock --user olduser --reset");
jeu.lire("ajouterEchecConnexion('bastion', 'olduser', '10.0.92.99')");
t("sudo systemctl mask ctrl-alt-del.target");
t("sudo systemctl disable --now rpcbind");
jeu.lire("state.save()");
var reprise = nouveauJeu(STOCKAGE);
function r(ligne, reponse){ return reprise.taper(ligne, reponse); }
egal(reprise.lire("Shell.hote()"), "bastion", "rechargement : on est toujours sur bastion");
contient(r("sudo faillock --user olduser"), "10.0.92.99", "rechargement : le registre de faillock");
egal(r("systemctl is-enabled ctrl-alt-del.target"), "masked", "rechargement : le masque (le lien est un fichier du monde)");
egal(r("systemctl is-active rpcbind"), "inactive", "rechargement : un service arrêté");
egal(r("systemctl is-enabled rpcbind"), "disabled", "rechargement : un service désactivé");
contient(r("cat /etc/passwd"), "ada:x:1004:1004:Ada Lovelace", "rechargement : le compte créé");
contient(r("sudo sshd -T"), "permitrootlogin no", "rechargement : sshd_config.d");
egal(reprise.lire("configSshEffective('bastion').permitrootlogin"), "no", "rechargement : la configuration appliquée par sshd");
contient(r("systemd-analyze security apache2"), "apache2.service: " + jeu.lire("expositionUnite('bastion', 'apache2').texte"), "rechargement : la note d'apache2 (drop-in et daemon-reload)");
egal(reprise.lire("etatPaquet('bastion', 'sudo').version"), "1.9.13p3-1+deb12u2", "rechargement : la version mise à jour");
contient(r("dpkg -l telnetd"), "un  telnetd", "rechargement : le paquet purgé");
egal(reprise.lire("texteHote('bastion', '/usr/sbin/in.telnetd')"), null, "rechargement : les fichiers purgés restent absents");
egal(reprise.lire("etckeeperHistorique('bastion').length"), 2, "rechargement : l'historique d'etckeeper");
contient(r("sudo etckeeper vcs status"), "\tissue", "rechargement : etckeeper voit toujours le fichier non enregistré");
egal(reprise.lire("texteHote('bastion', '/etc/systemd/system/apache2.service.d/override.conf')"), jeu.lire("texteHote('bastion', '/etc/systemd/system/apache2.service.d/override.conf')"), "rechargement : le drop-in");
contient(r("sudo visudo -c"), "/etc/sudoers.d/ada: parsed OK", "rechargement : le fichier de sudoers.d créé par visudo -f");
egal(reprise.lire("fichierHote('bastion', '/etc/sudoers.d/ada').mode"), "r--r-----", "rechargement : ses droits 0440");
egal(r("sudo debsums -s | cat"), "", "rechargement : le binaire réinstallé est toujours sain");
contient(r("ls -l ~/.ssh"), "bastion.pub", "rechargement : les clés fabriquées");
egal(reprise.lire("VERSION_SAUVEGARDE"), jeu.lire("VERSION_SAUVEGARDE"), "la version de sauvegarde n'a pas changé");

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
