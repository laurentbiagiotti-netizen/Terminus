/**
 * Le moteur des machines modélisées (SortsMachines.js, SortsProcessus.js, SortsSystemd.js, SortsExploitation.js),
 * commande par commande, sur une machine de test « atelier » : disques et inodes, LVM, RAID, SMART, fsck, fstab,
 * échange, processus (ps, top, kill, renice, zombies, boucles), mémoire et charge, systemd (unités écrites à la main,
 * Restart= réellement appliqué, MemoryMax, LimitNOFILE, timers, oneshot), journaux, archives, compressions, paquets
 * cassés, l'heure, les quotas, les tâches (&, Ctrl-Z, bg, fg, disown, nohup, tmux), curl -w. Chaque sort doit lire
 * l'état au moment où on le lance, le changer comme le vrai outil, et les commandes doivent rester cohérentes entre elles.
 *
 * Lancer : node tests/machines-moteur.js      (-v pour tout voir)
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 1500)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 1500)); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }

var G = 1073741824, M_ = 1048576;
var FIXTURE = `
World.fige = false;
var Atelier = new Room('atelier', 'La machine de test du moteur.', 'loc_cluster.gif');
Atelier.racineHote = 'atelier'; Atelier.owner = 'root'; Atelier.mode = 'rwxr-xr-x'; Atelier.removeCommand('cd');
link_rooms(Machines, Atelier);
decrireHote('atelier', { ip: '10.0.97.12', ouvert: true, noyau: '6.1.0-26-amd64', arrivee: function(){ return Atelier; } });
function fx(c, t, o){ o = o || {}; var it = poserFichierHote('atelier', c, t, o); if (o.taille !== undefined) it.taille = o.taille; if (o.mtime !== undefined) it.mtimeMs = o.mtime; return it; }
var T0 = new Date(); T0.setHours(6, 0, 0, 0); T0 = T0.getTime();
var MAINTENANT_ATELIER = function(){ return T0 + ((state.reseau.machines && state.reseau.machines.atelier) ? state.reseau.machines.atelier.tics * 120000 : 0); };
['/etc', '/var/log/app', '/var/lib/lumen/sessions', '/srv/donnees', '/srv/archives/registres', '/proc', '/home', '/tmp', '/usr/local/bin', '/opt/app', '/lib/systemd/system', '/etc/systemd/system', '/boot', '/mnt/sauvegarde', '/srv/sauvegardes', '/root', '/run', '/var/backups', '/var/log/journal'].forEach(function(d){ creerDossierHote('atelier', d); });
dossierHote('atelier', '/tmp').mode = 'rwxrwxrwt';
fx('/etc/passwd', ['root:x:0:0:root:/root:/bin/bash', 'daemon:x:1:1::/usr/sbin:/usr/sbin/nologin', 'www-data:x:33:33::/var/www:/usr/sbin/nologin', JOUEUR + ':x:1000:1000::/home/' + JOUEUR + ':/bin/bash',
	'operateur:x:1001:1001::/home/operateur:/bin/bash', 'app:x:998:998::/opt/app:/usr/sbin/nologin', 'ada:x:1101:1101::/home/ada:/bin/bash', 'bob:x:1102:1102::/home/bob:/bin/bash'].join('\\n'));
fx('/etc/group', ['root:x:0:', 'adm:x:4:' + JOUEUR, 'sudo:x:27:' + JOUEUR, 'www-data:x:33:', JOUEUR + ':x:1000:', 'operateur:x:1001:', 'app:x:998:', 'ada:x:1101:', 'bob:x:1102:', 'lumen:x:1200:ada,bob,' + JOUEUR].join('\\n'));
fx('/etc/shadow', 'root:!:20000:0:99999:7:::\\n', { mode: 'rw-r-----' });
fx('/etc/hosts', '127.0.0.1\\tlocalhost\\n10.0.97.12\\tatelier\\n10.0.97.40\\tbase-ancienne\\n');
fx('/etc/fstab', [
	'# /etc/fstab',
	'/dev/mapper/vg_test-lv_racine /               ext4    errors=remount-ro 0 1',
	'UUID=11111111-2222-3333-4444-555555555555 /boot  ext4    defaults        0 2',
	'/dev/mapper/vg_test-lv_var    /var            ext4    defaults        0 2',
	'/dev/mapper/vg_test-lv_sessions /var/lib/lumen/sessions ext4 defaults,noatime 0 2',
	'/dev/mapper/vg_test-lv_donnees /srv/donnees   ext4    defaults        0 2',
	'/dev/mapper/vg_test-lv_home   /home           ext4    defaults,usrquota 0 2',
	'UUID=aaaa0000-bbbb-cccc-dddd-eeeeffff0000 /srv/archives ext4 defaults 0 2',
	'LABEL=SAUVEGARDE              /mnt/sauvegarde ext4    defaults        0 2'].join('\\n'));
fx('/etc/systemd/journald.conf', '[Journal]\\n#Storage=auto\\n#SystemMaxUse=\\n');
fx('/etc/logrotate.conf', 'weekly\\nrotate 4\\ncreate\\ninclude /etc/logrotate.d\\n');
creerDossierHote('atelier', '/etc/logrotate.d');
fx('/var/log/app/app.log', 'GET / 200\\nGET /x 200\\n', { taille: 3 * ${G}, mode: 'rw-r-----' });
fx('/var/backups/vieille-copie.tar.gz', '', { taille: 4 * ${G}, mtime: T0 - 200 * 86400000 });
fx('/var/backups/recente.tar.gz', '', { taille: 10 * ${M_}, mtime: T0 - 2 * 86400000 });
fx('/srv/donnees/base.dat', '', { taille: 26 * ${G} });
fx('/srv/archives/registres/registre-1.txt', 'Le registre des archives.\\n');
fx('/etc/app.conf', 'base = base-ancienne:5432\\n');
fx('/usr/local/bin/sauvegarde.sh', '#!/bin/bash\\nset -e\\ntar czf /srv/sauvegardes/test-$(date +%F).tar.gz /etc/app.conf /srv/archives/registres\\necho sauvegarde terminee\\n', { mode: 'rwxr-xr-x' });
fx('/usr/local/bin/recopier', '#!/bin/bash\\n# copie longue\\n', { mode: 'rwxr-xr-x' });
fx('/opt/app/app', 'ELF app', { mode: 'rwxr-xr-x' });
fx('/opt/app/cache', 'ELF cache', { mode: 'rwxr-xr-x' });
fx('/opt/app/veilleur', 'ELF veilleur', { mode: 'rwxr-xr-x' });
fx('/lib/systemd/system/app.service', '[Unit]\\nDescription=Application de test\\n\\n[Service]\\nUser=app\\nExecStart=/opt/app/app --port 8080\\nRestart=on-failure\\n\\n[Install]\\nWantedBy=multi-user.target\\n');
fx('/lib/systemd/system/cache.service', '[Unit]\\nDescription=Cache qui fuit\\n\\n[Service]\\nExecStart=/opt/app/cache\\nRestart=always\\n\\n[Install]\\nWantedBy=multi-user.target\\n');
fx('/lib/systemd/system/veilleur.service', '[Unit]\\nDescription=Veilleur\\n\\n[Service]\\nExecStart=/opt/app/veilleur\\n\\n[Install]\\nWantedBy=multi-user.target\\n');
fx('/lib/systemd/system/systemd-journald.service', '[Unit]\\nDescription=Journal Service\\n\\n[Service]\\nExecStart=/lib/systemd/systemd-journald\\n');
fx('/lib/systemd/system/logrotate.timer', '[Unit]\\nDescription=Daily rotation of log files\\n\\n[Timer]\\nOnCalendar=daily\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n');
fx('/lib/systemd/system/logrotate.service', '[Unit]\\nDescription=Rotate log files\\n\\n[Service]\\nType=oneshot\\nExecStart=/usr/sbin/logrotate /etc/logrotate.conf\\n');
fx('/var/log/journal/' + hexDe('machine-id:atelier', 32) + '/system.journal', '', { taille: 64 * ${M_}, mtime: T0 });
for (var j = 0; j < 20; j++) fx('/var/log/journal/' + hexDe('machine-id:atelier', 32) + '/system@' + hexDe('a' + j, 32) + '.journal', '', { taille: 128 * ${M_}, mtime: T0 - (30 - j) * 86400000 });
fx('/proc/meminfo', ''); texteVivant(fichierHote('atelier', '/proc/meminfo'), function(){ return texteProcMachine('atelier', 'meminfo'); });
fx('/proc/mdstat', ''); texteVivant(fichierHote('atelier', '/proc/mdstat'), function(){ return texteProcMachine('atelier', 'mdstat'); });
fx('/proc/loadavg', ''); texteVivant(fichierHote('atelier', '/proc/loadavg'), function(){ return texteProcMachine('atelier', 'loadavg'); });
fx('/var/lib/dpkg/status', '');
declarerUnite('atelier', 'systemd-journald.service', { actif: true, enabled: true });
declarerUnite('atelier', 'app.service', { actif: true, enabled: true });
declarerUnite('atelier', 'cache.service', { actif: true, enabled: true });
declarerUnite('atelier', 'veilleur.service', { actif: true, enabled: true });
declarerUnite('atelier', 'logrotate.timer', { actif: true, enabled: true });
declarerPaquet('atelier', 'libssl3', { version: '3.0.14-1~deb12u2', disponible: '3.0.15-1~deb12u1', description: 'Secure Sockets Layer toolkit - shared libraries', fichiers: {} });
declarerPaquet('atelier', 'app-web', { version: '2.4.1', description: 'application web de test', fichiers: {}, depends: ['libssl3', 'app-base'] });
declarerPaquet('atelier', 'app-base', { version: '15.4-1', disponible: '15.5-1', description: 'base de donnees de test', fichiers: {} });
var GI = ${G};
declarerMachine('atelier', {
	maintenant: MAINTENANT_ATELIER, pas: 2,
	initial: function(){
		var mapper = function(lv){ return nomMapper('vg_test', lv); };
		return {
			cpus: 4, memoire: { total: 8148512, noyau: 380000, cache: 300000 }, demarrage: T0 - 41 * 86400000, fuseau: 'UTC', derive: 71,
			demarrages: [{ idx: -1, debut: T0 - 120 * 86400000, fin: T0 - 41 * 86400000 - 300000, crash: true }, { idx: 0, debut: T0 - 41 * 86400000 }],
			disques: [
				{ nom: 'sda', taille: 128035676160, modele: 'DISQUE SYSTEME 128', parts: [{ nom: 'sda1', taille: GI, partuuid: 'p1' }, { nom: 'sda2', taille: 119 * GI, contenu: 'LVM2_member' }], smart: { sain: true, realloues: 0, heures: 21000, temperature: 33 } },
				{ nom: 'sdb', taille: 500 * GI, rotation: 7200, parts: [{ nom: 'sdb1', taille: 499 * GI, contenu: 'linux_raid_member' }], smart: { sain: false, realloues: 2400, heures: 41000, temperature: 45, attente: 312 } },
				{ nom: 'sdc', taille: 500 * GI, rotation: 7200, parts: [{ nom: 'sdc1', taille: 499 * GI, contenu: 'linux_raid_member' }], smart: { sain: true, realloues: 184, heures: 40000, temperature: 41, degradation: 3 } },
				{ nom: 'sdd', taille: 500 * GI, rotation: 7200, parts: [{ nom: 'sdd1', taille: 499 * GI }], smart: { sain: true, realloues: 0, heures: 3, temperature: 30 } },
				{ nom: 'sde', taille: 50 * GI }],
			raid: [{ nom: 'md0', niveau: 1, disques: 2, taille: 498 * GI, uuid: 'a1b2c3d4:e5f60718:293a4b5c:6d7e8f90', creation: 'Mon Mar  3 10:12:44 2025', vitesse: 25,
				membres: [{ dev: 'sdb1', numero: 0, etat: 'faulty', rang: -1, mineur: 17 }, { dev: 'sdc1', numero: 1, etat: 'active', rang: 1, mineur: 33 }] }],
			pvs: [{ chemin: '/dev/sda2', vg: 'vg_test', taille: 119 * GI, arrondi: true }],
			vgs: [{ nom: 'vg_test' }],
			lvs: [{ vg: 'vg_test', nom: 'lv_racine', taille: 20 * GI }, { vg: 'vg_test', nom: 'lv_var', taille: 20 * GI }, { vg: 'vg_test', nom: 'lv_sessions', taille: GI },
				{ vg: 'vg_test', nom: 'lv_donnees', taille: 30 * GI }, { vg: 'vg_test', nom: 'lv_home', taille: 8 * GI }],
			fs: [
				{ source: mapper('lv_racine'), cible: '/', type: 'ext4', taille: 20 * GI, inodes: 1310720, base: 6 * GI, baseInodes: 150000, uuid: 'r000', reserve: 0.05, options: 'errors=remount-ro', systeme: true },
				{ source: '/dev/sda1', cible: null, pointDeMontage: '/boot', type: 'ext4', taille: GI, inodes: 65536, base: 200 * 1048576, baseInodes: 400, uuid: '9f8e7d6c-1111-2222-3333-444455556666', reserve: 0.05 },
				{ source: mapper('lv_var'), cible: '/var', type: 'ext4', taille: 20 * GI, inodes: 1310720, base: 5.5 * GI, baseInodes: 30000, uuid: 'v000', reserve: 0.05 },
				{ source: mapper('lv_sessions'), cible: '/var/lib/lumen/sessions', type: 'ext4', taille: GI, inodes: 65536, base: 30 * 1048576, baseInodes: 16, uuid: 's000', reserve: 0.05, options: 'noatime' },
				{ source: mapper('lv_donnees'), cible: '/srv/donnees', type: 'ext4', taille: 30 * GI, inodes: 1966080, base: 2 * GI, baseInodes: 200, uuid: 'd000', reserve: 0.05, inodesParOctet: 16384 },
				{ source: mapper('lv_home'), cible: '/home', type: 'ext4', taille: 8 * GI, inodes: 524288, base: 300 * 1048576, baseInodes: 100, uuid: 'h000', reserve: 0.05, options: 'usrquota' },
				{ source: '/dev/md0', cible: '/srv/archives', type: 'ext4', taille: 498 * GI, inodes: 32604160, base: 200 * GI, baseInodes: 40000, uuid: 'aaaa0000-bbbb-cccc-dddd-eeeeffff0000', label: 'archives', reserve: 0.05, ro: true, erreurs: 3, options: 'errors=remount-ro' },
				{ source: 'tmpfs', cible: '/run', type: 'tmpfs', taille: 814 * 1048576, virtuel: true, utilise: 2 * 1048576, inodes: 994000, inodesUtilises: 900, cache: true }],
			virtuels: { '/var/lib/lumen/sessions': [
				{ prefixe: 'sess_', nombre: 60000, ageMin: 4000, taille: 180, graine: 'v1', owner: 'www-data', mode: 'rw-------' },
				{ prefixe: 'sess_', nombre: 5500, ageMin: 400, taille: 180, graine: 'v2', owner: 'www-data', mode: 'rw-------' },
				{ prefixe: 'sess_', nombre: 20, ageMin: 20, taille: 180, graine: 'v3', owner: 'www-data', mode: 'rw-------' }] },
			procs: [
				{ pid: 812, ppid: 1, user: 'root', comm: 'sshd', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', cpu: 0, rss: 9000 },
				{ pid: 1990, ppid: 1, user: 'operateur', comm: 'bash', cmd: '/bin/bash /home/operateur/export-boucle.sh', cpu: 0, rss: 3400, boucle: { comm: 'export', cmd: '/usr/local/bin/export --tout', cpu: 99.7, rss: 52000, etat: 'R' } },
				{ pid: 1991, ppid: 1990, user: 'operateur', comm: 'export', cmd: '/usr/local/bin/export --tout', cpu: 99.7, rss: 52000, etat: 'R' },
				{ pid: 3001, ppid: 1, user: 'root', comm: 'archiviste', cmd: '/usr/local/bin/archiviste', cwd: '/srv/archives', fichiers: [{ fd: '4r', type: 'REG', chemin: '/srv/archives/registres/registre-1.txt', taille: 26 }] }
			],
			io: { sda: { util: 12, r: 3, w: 40 }, sdc: { util: 97, r: 210, w: 80 } },
			sockets: { estab: 312, closed: 4, orphaned: 0, timewait: 1180 },
			dpkg: { interrompu: true, casses: [], retenus: [], aConfigurer: [{ nom: 'app-base', version: '15.4-1' }, { nom: 'app-web', version: '2.4.1', casse: { depend: 'libssl3', version: '3.0.15-1~deb12u1', installee: '3.0.14-1~deb12u2' } }] },
			programmesLongs: { recopier: { comm: 'recopier', chemin: '/usr/local/bin/recopier', cpu: 12, rss: 9000, etat: 'D', tache: { nom: 'recopier', total: 9, pas: 1, libelle: 'copie des archives' }, annonce: 'Copie des archives en cours...' },
				'chat-errant': { comm: 'chat-errant', cpu: 3, rss: 2048, etat: 'S', annonce: 'Ron... ron... (un chat errant ronronne)', annonceFg: 'Le chat revient sur tes genoux.' } },
			croissanceJournal: 0
		};
	},
	profils: {
		'app.service': function(h, M, lim){ return [{ comm: 'app', cmd: '/opt/app/app --port 8080', cpu: 4, rss: 120000, ports: [8080], fichiers: [{ fd: '5w', type: 'REG', chemin: '/var/log/app/debug.log', taille: 0 }], nofile: 1021 }]; },
		'cache.service': function(h, M, lim){ return [{ comm: 'cache', cmd: '/opt/app/cache --rapports', cpu: 40, rss: 4000000, etat: 'R', fuite: 60000 }]; },
		'veilleur.service': function(h, M, lim){ return [{ comm: 'veilleur', cmd: '/opt/app/veilleur', cpu: 0.2, rss: 30000 }, { comm: 'veilleur-tache', cmd: '[veilleur-tache]', etat: 'Z', rss: 0 }, { comm: 'veilleur-tache', cmd: '[veilleur-tache]', etat: 'Z', rss: 0 }]; }
	},
	bibliotheques: { 'app.service': true },
	web: function(h, chemin, methode){
		var M = etatMachine(h);
		if (!etatUnite(h, 'app.service').actif) return { injoignable: true };
		var plein = libreFs(h, fsParCible(h, '/var')).dispo === 0;
		return { code: plein ? 503 : 200, temps: plein ? 4.8 : 0.08, corps: '<html><body>atelier</body></html>' };
	},
	tempsDemarrage: { 'app.service': 2311, 'cache.service': 90012 }
});
fx('/var/log/app/debug.log', 'debug\\n', { taille: 5 * ${G} });
World.fige = true;
`;

function nouveauJeu(stockage){
	var jeu = monde.nouveauMonde(stockage || {}, 4242, { avant: FIXTURE });
	jeu.lire("tousLesSorts().concat(SORTS_ARCANES, SORTS_BASTION, SORTS_GUET, SORTS_MACHINES, ['nl', 'fold', 'rev']).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });" +
		"state.set('sudoOK'); Shell.fin = function(){ avancerToutesMachines(); Shell.narration = []; };");
	return jeu;
}
var STOCKAGE = {};
var jeu = nouveauJeu(STOCKAGE);
var TRACE = process.env.TRACE;
function t(ligne, rep){
	if (TRACE) process.stderr.write("$ " + ligne + "\n");
	var d = Date.now(), r = jeu.taper(ligne, rep);
	if (TRACE) process.stderr.write("  [" + (Date.now() - d) + " ms]" + (TRACE === "2" ? "\n" + r : "") + "\n");
	return r;
}
function code(){ return jeu.lire("Shell.statut"); }
function L(e){ return jeu.lire(e); }

/* --- 0. L'arrivée --- */
contient(t("ssh atelier"), "Bienvenue sur atelier", "ssh atelier");
egal(L("estMachine('atelier')"), true, "atelier est une machine modélisée");
// Les processus des services sont lancés au premier coup d'œil (synchronisation).
L("synchroniserUnites('atelier')");
verifier(L("procsMachine('atelier').some(function(p){ return p.comm === 'app' && p.principal; })"), "le service app a son processus");

/* --- 1. df, du, find, lsof +L1, le fichier fantôme --- */
var s = t("df -h");
contient(s, "Filesystem", "df -h : en-tête");
contient(s, "/var", "df -h : /var");
var ligneVar = s.split("\n").filter(function(l){ return / \/var$/.test(l); })[0] || "";
contient(ligneVar, "100%", "df -h : /var est plein (fichiers + fichier supprimé ouvert)");
contient(t("df -hT"), "ext4", "df -hT : le type");
var di = t("df -i");
contient(di.split("\n").filter(function(l){ return /sessions$/.test(l); })[0] || "", "100%", "df -i : les inodes des sessions à 100 %");
s = t("sudo du -sh /var/* | sort -h");
verifier(/G\t\/var\/log/.test(s) || /G\t\/var\/backups/.test(s), "du -sh /var/* : des dossiers en Go\n" + s);
s = t("sudo du -h --max-depth=1 /var");
contient(s, "/var/backups", "du --max-depth=1");
s = t("sudo find /var -size +500M");
contient(s, "/var/backups/vieille-copie.tar.gz", "find -size +500M trouve la vieille archive");
contient(s, "/var/log/app/app.log", "find -size +500M trouve le gros journal");
absent(s, "recente", "find -size +500M ignore la petite archive");
s = t("sudo find /var/backups -mtime +30");
contient(s, "vieille-copie", "find -mtime +30");
absent(s, "recente", "find -mtime +30 : pas la récente");
contient(t("ncdu /var"), "/log", "ncdu : un classement");
// Le fichier fantôme : debug.log est supprimé, mais app le tient ouvert.
t("sudo rm /var/log/app/debug.log");
var avant = L("libreFs('atelier', fsParCible('atelier', '/var')).utilise");
s = t("sudo lsof +L1");
contient(s, "/var/log/app/debug.log (deleted)", "lsof +L1 : le fichier supprimé encore ouvert");
contient(s, "NLINK", "lsof +L1 : la colonne NLINK");
t("sudo rm /var/backups/vieille-copie.tar.gz");
var apres = L("libreFs('atelier', fsParCible('atelier', '/var')).utilise");
verifier(avant - apres >= 3.5 * G, "supprimer l'archive libère 4 Gio (" + (avant - apres) + ")");
egal(L("libreFs('atelier', fsParCible('atelier', '/var')).dispo > 0"), true, "/var a de nouveau de la place");
var avantFantome = L("libreFs('atelier', fsParCible('atelier', '/var')).utilise");
var pidApp = L("procsMachine('atelier').filter(function(p){ return p.comm === 'app'; })[0].pid");
t("sudo systemctl restart app");
var pidApp2 = L("procsMachine('atelier').filter(function(p){ return p.comm === 'app'; })[0].pid");
verifier(pidApp !== pidApp2, "restart : un nouveau PID (" + pidApp + " puis " + pidApp2 + ")");
verifier(avantFantome - L("libreFs('atelier', fsParCible('atelier', '/var')).utilise") >= 5 * G - 4096, "restart d'app : la place du fichier fantôme est rendue");
absent(t("sudo lsof +L1"), "debug.log", "lsof +L1 : plus de fichier fantôme");

/* --- 2. Les inodes : stat, ls -f, find -mmin -delete --- */
s = t("sudo find /var/lib/lumen/sessions -type f | wc -l");
egal(s.trim(), "65520", "find | wc -l compte les 65 520 sessions");
contient(t("cd /var/lib/lumen/sessions"), "", "cd dans les sessions");
s = t("ls -f | head -3");
egal(s.split("\n").length, 3, "ls -f | head -3");
contient(s, ".", "ls -f commence par . et ..");
var unNom = L("nomVirtuel(groupesVirtuels('atelier', '/var/lib/lumen/sessions')[2], 0)");
verifier(/^\d+$/.test(t("stat -c %i " + unNom).trim()), "stat -c %i donne un numéro d'inode");
contient(t("rm sess_*"), "Argument list too long", "rm sess_* : la liste est trop longue");
t("cd /");
var e = t("sudo touch /var/lib/lumen/sessions/essai");
contient(e, "No space left on device", "écrire dans un système de fichiers sans inode : refusé");
t("sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete");
egal(L("compteVirtuels('atelier', '/var/lib/lumen/sessions').nombre"), 20, "find -mmin +60 -delete : seules les 20 sessions récentes restent");
var di2 = t("df -i");
verifier(!/100%/.test(di2.split("\n").filter(function(l){ return /sessions$/.test(l); })[0] || ""), "df -i : les inodes sont libérés");
contient(t("sudo tune2fs -l /dev/mapper/vg_test-lv_sessions"), "Inode count:              65536", "tune2fs -l : Inode count");

/* --- 3. Les journaux : logrotate, journalctl --disk-usage, --vacuum-size, SystemMaxUse --- */
t("printf '/var/log/app/*.log {\\n\\tdaily\\n\\trotate 7\\n\\tcompress\\n\\tmissingok\\n\\tnotifempty\\n\\tmaxsize 100M\\n}\\n' | sudo tee /etc/logrotate.d/app");
s = t("sudo logrotate -d /etc/logrotate.d/app");
contient(s, "rotating pattern: /var/log/app/*.log", "logrotate -d lit la configuration");
s = t("sudo logrotate -f /etc/logrotate.d/app");
egal(L("fichierHote('atelier', '/var/log/app/app.log') ? tailleObjetMachine(fichierHote('atelier', '/var/log/app/app.log')) : -1") < 1000, true, "logrotate -f : app.log repart de zéro");
var gz = L("fichierHote('atelier', '/var/log/app/app.log.1.gz') ? tailleObjetMachine(fichierHote('atelier', '/var/log/app/app.log.1.gz')) : -1");
verifier(gz > 100 * M_ && gz < 1 * G, "logrotate -f : app.log.1.gz pèse un dixième du journal (" + gz + ")");
contient(t("journalctl --disk-usage"), "2.6G", "journalctl --disk-usage : 20 archives de 128 Mio et l'actif");
s = t("sudo journalctl --vacuum-size=200M");
contient(s, "Deleted archived journal", "vacuum-size : des archives supprimées");
contient(s, "Vacuuming done", "vacuum-size : fini");
verifier(L("tailleJournal('atelier')") <= 200 * M_, "vacuum-size : le journal tient dans 200 Mio");
t("sudo sed -i 's/^#SystemMaxUse=/SystemMaxUse=150M/' /etc/systemd/journald.conf");
t("sudo systemctl restart systemd-journald");
egal(L("etatMachine('atelier').journaldMax"), 150 * M_, "journald relit SystemMaxUse au redémarrage");

/* --- 4. Mémoire : free, vmstat, dmesg, OOM, MemoryMax, l'échange --- */
s = t("free -h");
contient(s, "available", "free -h : la colonne available");
contient(s, "Swap:", "free -h : la ligne Swap");
contient(t("vmstat 1 3"), "si   so", "vmstat : si et so");
// La fuite : sans limite, le cache grossit à chaque commande, jusqu'à l'OOM.
var rss0 = L("procsMachine('atelier').filter(function(p){ return p.comm === 'cache'; })[0].rss");
t("uptime"); t("uptime");
var rss1 = L("procsMachine('atelier').filter(function(p){ return p.comm === 'cache'; })[0].rss");
verifier(rss1 > rss0, "le cache fuit : sa mémoire grossit à chaque commande");
for (var k = 0; k < 70; k++) t("true");
s = t("sudo dmesg -T | grep -i oom");
contient(s, "Out of memory: Killed process", "dmesg : l'OOM killer a tué le gros consommateur");
verifier(L("procsMachine('atelier').some(function(p){ return p.comm === 'cache'; })"), "Restart=always : systemd a relancé le cache");
contient(t("sudo journalctl -u cache"), "Scheduled restart job", "journalctl -u : le redémarrage automatique est noté");
// Une limite : drop-in, daemon-reload, restart.
t("sudo mkdir -p /etc/systemd/system/cache.service.d");
t("printf '[Service]\\nMemoryMax=1G\\n' | sudo tee /etc/systemd/system/cache.service.d/limite.conf");
t("sudo systemctl daemon-reload");
t("sudo systemctl restart cache");
egal(L("limitesUnite('atelier', 'cache.service').memMax"), G, "MemoryMax : la limite est chargée");
for (var k2 = 0; k2 < 30; k2++) t("true");
verifier(L("procsMachine('atelier').filter(function(p){ return p.comm === 'cache'; })[0].rss") * 1024 <= G, "MemoryMax : le cache ne dépasse plus 1 Gio");
contient(t("sudo journalctl -k | grep -i 'memory cgroup'"), "Memory cgroup out of memory", "le noyau tue dans le groupe de contrôle");
s = t("sudo systemctl status cache");
contient(s, "max: 1.0G", "status : la limite de mémoire");
contient(s, "Main PID:", "status : le PID principal");
// L'échange.
t("sudo fallocate -l 2G /swapfile");
contient(t("sudo mkswap /swapfile"), "insecure permissions", "mkswap prévient pour les droits");
t("sudo chmod 600 /swapfile");
t("sudo mkswap /swapfile");
t("sudo swapon /swapfile");
s = t("swapon --show");
contient(s, "/swapfile", "swapon --show");
contient(s, "2G", "swapon --show : 2G");
contient(t("free -h").split("\n")[2], "2.0Gi", "free -h : l'échange compte");
egal(t("df -h /").indexOf("/") > -1, true, "df / après fallocate");
t("echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab");
contient(t("sudo swapon -a"), "", "swapon -a lit fstab (déjà actif : rien)");

/* --- 5. Processus : top, ps, renice, kill, boucle, zombies --- */
s = t("top -b -n 1");
contient(s, "load average:", "top -b : la charge");
contient(s, "zombie", "top -b : la ligne des tâches");
contient(s.split("\n").slice(6, 8).join("\n"), "export", "top -b : export en tête (100 % CPU)");
contient(t("uptime"), "load average", "uptime");
egal(t("nproc").trim(), "4", "nproc");
s = t("ps -eo pid,ni,%cpu,cmd --sort=-%cpu | head -3");
contient(s, "export", "ps --sort=-%cpu");
var pidExport = L("procsMachine('atelier').filter(function(p){ return p.comm === 'export'; })[0].pid");
contient(t("renice +19 -p " + pidExport), "Permission denied", "renice sans sudo : refusé");
contient(t("sudo renice +19 -p " + pidExport), "old priority 0, new priority 19", "renice +19");
contient(t("ps -o pid,ni,cmd -p " + pidExport), "19", "ps -o ni : 19");
egal(t("ps -o ppid= -p " + pidExport).trim(), "1990", "ps -o ppid= -p : le parent (la boucle)");
t("sudo kill " + pidExport);
t("true");
var nouveau = L("(procsMachine('atelier').filter(function(p){ return p.comm === 'export'; })[0] || {}).pid");
verifier(nouveau && nouveau !== pidExport, "la boucle relance export après kill (" + nouveau + ")");
contient(t("pstree -p 1990"), "export(", "pstree montre la boucle et son enfant");
t("sudo kill 1990"); t("sudo kill " + nouveau); t("true");
egal(L("procsMachine('atelier').some(function(p){ return p.comm === 'export'; })"), false, "plus d'export : la boucle et l'enfant sont arrêtés");
s = t("ps aux");
contient(s, "<defunct>", "ps aux : les zombies");
contient(t("ps -eo pid,stat,comm | grep veilleur-tache"), " Z ", "ps : l'état Z");
var pidZ = L("procsMachine('atelier').filter(function(p){ return p.etat === 'Z'; })[0].pid");
t("sudo kill -9 " + pidZ);
verifier(L("procsMachine('atelier').some(function(p){ return p.pid === " + pidZ + "; })"), "kill -9 sur un zombie : il reste");
var parent = t("ps -o ppid= -p " + pidZ).trim();
egal(L("procParPid('atelier', " + parent + ").comm"), "veilleur", "le parent des zombies est le veilleur");
t("sudo systemctl restart veilleur");
egal(L("procsMachine('atelier').filter(function(p){ return p.etat === 'Z' && p.pid === " + pidZ + "; }).length"), 0, "restart du parent : les zombies d'avant ont disparu");
contient(t("kill -l"), "9) SIGKILL", "kill -l");
contient(t("pgrep -a veilleur"), "/opt/app/veilleur", "pgrep -a");
verifier(/^\d+$/.test(t("pidof cache").trim()), "pidof");

/* --- 6. LVM --- */
s = t("sudo vgs");
contient(s, "vg_test", "vgs");
contient(s, "VFree", "vgs : VFree");
var dfDonnees = t("df -h /srv/donnees");
contient(dfDonnees, "30G", "df -h /srv/donnees : 30G");
contient(t("sudo lvextend -L +20G /dev/vg_test/lv_donnees"), "successfully resized", "lvextend -L +20G");
contient(t("df -h /srv/donnees"), "30G", "df ne voit rien avant resize2fs");
contient(t("sudo resize2fs /dev/mapper/vg_test-lv_donnees"), "is now 13107200 (4k) blocks long", "resize2fs");
contient(t("df -h /srv/donnees"), "50G", "df -h : 50G après resize2fs");
contient(t("sudo lvextend -L +900G /dev/vg_test/lv_donnees"), "Insufficient free space", "lvextend trop grand : refusé");
contient(t("sudo lvcreate -s -L 2G -n avant_maj /dev/vg_test/lv_donnees"), "created", "lvcreate -s");
contient(t("sudo lvs"), "avant_maj", "lvs : l'instantané");
contient(t("sudo lvs"), "swi-a-s---", "lvs : attributs d'un instantané");
contient(t("sudo lvremove -y /dev/vg_test/avant_maj"), "successfully removed", "lvremove");
contient(t("sudo pvcreate /dev/sde"), "successfully created", "pvcreate");
contient(t("sudo vgextend vg_test /dev/sde"), "successfully extended", "vgextend");
contient(t("lsblk"), "vg_test-lv_donnees", "lsblk montre les volumes");
contient(t("lsblk -f"), "LVM2_member", "lsblk -f");

/* --- 7. fstab, blkid, findmnt --verify, mount -a --- */
s = t("sudo findmnt --verify");
contient(s, "unreachable source: UUID=11111111", "findmnt --verify : l'UUID qui n'existe plus");
contient(s, "LABEL=SAUVEGARDE", "findmnt --verify : le disque de sauvegarde absent");
var uuid = t("blkid -s UUID -o value /dev/sda1").trim();
egal(uuid, "9f8e7d6c-1111-2222-3333-444455556666", "blkid -s UUID -o value");
t("sudo sed -i 's/11111111-2222-3333-4444-555555555555/" + uuid + "/' /etc/fstab");
t("sudo sed -i 's#/mnt/sauvegarde ext4    defaults#/mnt/sauvegarde ext4    defaults,nofail#' /etc/fstab");
contient(t("sudo findmnt --verify"), "Success, no errors", "findmnt --verify : plus d'erreur");
s = t("sudo mount -a");
contient(s, "systemd still uses", "mount -a : l'indice daemon-reload (fstab changé)");
contient(t("findmnt /boot"), "/dev/sda1", "mount -a a monté /boot");
t("sudo systemctl daemon-reload");
absent(t("sudo mount -a"), "systemd still uses", "après daemon-reload : plus d'indice");

/* --- 8. Une unité écrite à la main, Restart=, nohup --- */
fx = null;
t("printf '[Unit]\\nDescription=Mon service\\nAfter=network-online.target\\n\\n[Service]\\nUser=app\\nExecStart=/opt/app/veilleur --mon\\nRestart=on-failure\\nRestartSec=5\\n\\n[Install]\\nWantedBy=multi-user.target\\n' | sudo tee /etc/systemd/system/monservice.service");
egal(t("systemd-analyze verify /etc/systemd/system/monservice.service"), "", "systemd-analyze verify : rien à redire");
t("sudo systemctl daemon-reload");
s = t("sudo systemctl enable --now monservice");
contient(s, "Created symlink", "enable --now : le lien");
s = t("systemctl status monservice");
contient(s, "active (running)", "status : active");
var pidMon = L("procsMachine('atelier').filter(function(p){ return p.unite === 'monservice.service'; })[0].pid");
t("sudo systemctl kill -s KILL monservice");
s = t("systemctl status monservice");
contient(s, "active (running)", "Restart=on-failure : le service est revenu seul");
var pidMon2 = L("procsMachine('atelier').filter(function(p){ return p.unite === 'monservice.service'; })[0].pid");
verifier(pidMon !== pidMon2, "Restart : nouveau PID");
contient(t("sudo journalctl -u monservice"), "status=9/KILL", "journal : tué par KILL");
// Sans Restart=, il reste mort (failed).
t("sudo sed -i 's/^Restart=on-failure//' /etc/systemd/system/monservice.service");
t("sudo systemctl daemon-reload"); t("sudo systemctl restart monservice");
t("sudo systemctl kill -s KILL monservice");
contient(t("systemctl status monservice"), "failed", "sans Restart= : failed");
contient(t("systemctl --failed"), "monservice.service", "systemctl --failed");
t("sudo systemctl reset-failed monservice");
absent(t("systemctl --failed"), "monservice", "reset-failed");
contient(t("printf '[Service]\\nRestat=always\\nExecStart=veilleur\\n' | sudo tee /etc/systemd/system/faux.service; systemd-analyze verify /etc/systemd/system/faux.service"), "Unknown key name 'Restat'", "verify : une faute de frappe");
// Port déjà pris : un service lancé à la main tient 8080.
t("sudo systemctl stop app");
L("lancerProcessusMachine('atelier', { comm: 'app', cmd: '/opt/app/app --port 8080', user: 'operateur', ports: [8080] })");
s = t("sudo systemctl start app");
contient(s, "failed", "start : refusé, le port est pris");
contient(t("sudo journalctl -u app -n 5"), "Address already in use", "journal : Address already in use");
t("sudo pkill -u operateur app");
t("sudo systemctl start app");
contient(t("systemctl status app"), "active (running)", "après avoir libéré le port : app démarre");

/* --- 9. Timer, oneshot, tar, restauration, diff --- */
t("printf '[Unit]\\nDescription=Sauvegarde\\n\\n[Service]\\nType=oneshot\\nExecStart=/usr/local/bin/sauvegarde.sh\\n' | sudo tee /etc/systemd/system/sauvegarde.service");
t("printf '[Unit]\\nDescription=Sauvegarde chaque nuit\\n\\n[Timer]\\nOnCalendar=*-*-* 02:00\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde.timer");
t("sudo systemctl daemon-reload");
contient(t("sudo systemctl enable --now sauvegarde.timer"), "timers.target.wants", "enable --now d'un timer");
s = t("systemctl list-timers");
contient(s, "sauvegarde.timer", "list-timers");
contient(s, "02:00:00", "list-timers : 02:00");
s = t("systemd-analyze calendar '*-*-* 02:00'");
contient(s, "Normalized form: *-*-* 02:00:00", "systemd-analyze calendar");
contient(s, "Next elapse:", "calendar : prochaine échéance");
contient(t("systemd-analyze calendar 'toto'"), "", "calendar invalide");
egal(code(), 1, "calendar invalide : code 1");
t("sudo systemctl start sauvegarde");
var nomArchive = L("fichiersDuDossier('atelier', '/srv/sauvegardes').map(function(f){ return f.nom; }).join(',')");
verifier(/^test-\d{4}-\d\d-\d\d\.tar\.gz$/.test(nomArchive), "le oneshot a lancé le script : " + nomArchive);
s = t("systemctl status sauvegarde");
contient(s, "inactive (dead)", "oneshot : inactive après");
contient(s, "status=0/SUCCESS", "oneshot : succès");
s = t("tar tzf /srv/sauvegardes/" + nomArchive);
contient(s, "srv/archives/registres/registre-1.txt", "tar tzf : le contenu");
t("mkdir /tmp/restauration");
t("sudo tar xzf /srv/sauvegardes/" + nomArchive + " -C /tmp/restauration");
egal(t("diff -r /srv/archives/registres /tmp/restauration/srv/archives/registres"), "", "diff -r : identiques");
egal(t("sha256sum /etc/app.conf | cut -d' ' -f1"), t("sha256sum /tmp/restauration/etc/app.conf | cut -d' ' -f1"), "sha256sum : identiques");
contient(t("tar tvzf /srv/sauvegardes/" + nomArchive), "root/root", "tar tvzf");

/* --- 10. Mesures : iostat, sar, ss -s, curl -w --- */
contient(t("iostat -x 1 3"), "%util", "iostat -x");
contient(t("sar -u"), "%iowait", "sar -u");
contient(t("sar -r"), "kbavail", "sar -r");
contient(t("sar -q"), "ldavg-1", "sar -q");
contient(t("ss -s"), "estab 312", "ss -s");
s = t("curl -o /dev/null -s -w '%{time_total}\\n' http://atelier/");
verifier(/^\d+\.\d{6}$/.test(s.trim()), "curl -w time_total : " + s);
contient(t("curl -s -w '%{http_code}' -o /dev/null http://atelier/"), "200", "curl -w http_code");

/* --- 11. RAID, SMART --- */
s = t("cat /proc/mdstat");
contient(s, "[_U]", "mdstat : dégradé");
contient(s, "sdb1[0](F)", "mdstat : sdb1 en panne");
contient(t("sudo mdadm --detail /dev/md0"), "clean, degraded", "mdadm --detail");
contient(t("sudo mdadm /dev/md0 --remove /dev/sdc1"), "busy", "on ne retire pas un disque actif");
contient(t("sudo mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1"), "hot removed /dev/sdb1", "fail puis remove");
contient(t("sudo mdadm /dev/md0 --add /dev/sdd1"), "added /dev/sdd1", "add");
contient(t("cat /proc/mdstat"), "recovery", "mdstat : reconstruction");
for (var k3 = 0; k3 < 6; k3++) t("true");
contient(t("cat /proc/mdstat"), "[UU]", "mdstat : reconstruit [UU]");
contient(t("sudo smartctl -H /dev/sdb"), "FAILED!", "smartctl -H : le disque mort");
s = t("sudo smartctl -a /dev/sdc");
contient(s, "PASSED", "smartctl -a sdc : PASSED");
contient(s, "Reallocated_Sector_Ct", "smartctl -a : les secteurs réalloués");
var r1 = +(/Reallocated_Sector_Ct.* (\d+)$/m.exec(s) || [0, 0])[1];
t("true"); t("true");
var r2 = +(/Reallocated_Sector_Ct.* (\d+)$/m.exec(t("sudo smartctl -a /dev/sdc")) || [0, 0])[1];
verifier(r2 > r1, "Reallocated_Sector_Ct grimpe (" + r1 + " puis " + r2 + ")");
contient(t("sudo smartctl -t short /dev/sdc"), "Testing has begun", "smartctl -t short");
t("true"); t("true"); t("true");
contient(t("sudo smartctl -l selftest /dev/sdc"), "Completed without error", "smartctl -l selftest");

/* --- 12. Thermes : ro, umount occupé, e2fsck --- */
contient(t("mount | grep archives"), "(ro,", "mount : /srv/archives en lecture seule");
contient(t("sudo touch /srv/archives/x"), "Read-only file system", "touch : Read-only file system");
contient(t("sudo e2fsck -f -y /dev/md0"), "is mounted", "e2fsck refuse un système monté");
var u1 = t("sudo umount /srv/archives");
contient(u1, "target is busy", "umount : occupé");
contient(t("sudo fuser -vm /srv/archives"), "archiviste", "fuser -vm : qui l'occupe");
t("sudo kill 3001");
t("sudo umount /srv/archives");
egal(L("fsParCible('atelier', '/srv/archives')"), null, "umount : démonté");
contient(t("sudo e2fsck -f -y /dev/md0"), "FILE SYSTEM WAS MODIFIED", "e2fsck -f -y répare");
egal(code(), 1, "e2fsck : code 1 (erreurs corrigées)");
contient(t("sudo e2fsck -f -y /dev/md0"), "/dev/md0:", "e2fsck une seconde fois");
t("sudo mount /srv/archives");
contient(t("findmnt /srv/archives"), "rw", "remonté en écriture");
contient(t("sudo tune2fs -l /dev/md0"), "Filesystem state:         clean", "tune2fs -l : propre");
contient(t("sudo tune2fs -c 30 /dev/md0"), "maximal mount count to 30", "tune2fs -c");
var dispoAvant = L("libreFs('atelier', fsParCible('atelier', '/srv/archives')).dispo");
contient(t("sudo tune2fs -m 1 /dev/md0"), "1%", "tune2fs -m 1");
verifier(L("libreFs('atelier', fsParCible('atelier', '/srv/archives')).dispo") > dispoAvant, "tune2fs -m 1 : df voit plus de place disponible");

/* --- 13. Paquets cassés --- */
contient(t("sudo apt upgrade"), "dpkg was interrupted", "apt upgrade : dpkg interrompu");
s = t("sudo dpkg --configure -a");
contient(s, "Setting up app-base", "dpkg --configure -a");
contient(s, "dependency problems", "dpkg --configure -a : une dépendance cassée");
contient(t("sudo apt install curl"), "--fix-broken", "apt : dépendances cassées");
contient(t("sudo apt --fix-broken install"), "Setting up libssl3", "apt --fix-broken install");
contient(t("sudo apt-mark hold app-base"), "set on hold", "apt-mark hold");
egal(t("apt-mark showhold").trim(), "app-base", "apt-mark showhold");
contient(t("apt policy app-base"), "Candidate: 15.5-1", "apt policy");
contient(t("apt-cache depends app-web"), "Depends: libssl3", "apt-cache depends");
contient(t("sudo needrestart -r l"), "systemctl restart app.service", "needrestart : app tourne avec l'ancienne libssl");
t("sudo systemctl restart app");
absent(t("sudo needrestart -r l"), "restart app.service", "après restart : plus rien à relancer");
contient(t("uname -r"), "6.1.0-26-amd64", "uname -r");

/* --- 14. Limites : ulimit, /proc/PID/limits, fd, LimitNOFILE --- */
egal(t("ulimit -n").trim(), "1024", "ulimit -n");
var pidApp3 = L("procsMachine('atelier').filter(function(p){ return p.comm === 'app' && p.principal; })[0].pid");
contient(t("cat /proc/" + pidApp3 + "/limits"), "Max open files            1024", "/proc/PID/limits");
egal(t("sudo ls /proc/" + pidApp3 + "/fd | wc -l").trim(), "1021", "ls /proc/PID/fd | wc -l");
t("sudo mkdir -p /etc/systemd/system/app.service.d");
t("printf '[Service]\\nLimitNOFILE=65536\\n' | sudo tee /etc/systemd/system/app.service.d/fichiers.conf");
t("sudo systemctl daemon-reload"); t("sudo systemctl restart app");
pidApp3 = L("procsMachine('atelier').filter(function(p){ return p.comm === 'app' && p.principal; })[0].pid");
contient(t("cat /proc/" + pidApp3 + "/limits"), "Max open files            65536", "LimitNOFILE appliqué");
t("sudo systemctl set-property cache CPUQuota=50% MemoryMax=1G");
contient(t("systemctl show -p CPUQuotaPerSecUSec,MemoryMax cache"), "CPUQuotaPerSecUSec=500ms", "show -p CPUQuotaPerSecUSec");
contient(t("systemd-cgtop"), "system.slice/cache.service", "systemd-cgtop");
verifier(L("cpuEffectif('atelier', procsMachine('atelier').filter(function(p){ return p.comm === 'cache'; })[0])") <= 50, "CPUQuota : 50 % au plus");

/* --- 15. strace, oom_score_adj, pmap --- */
L("lancerProcessusMachine('atelier', { pid: 2210, comm: 'messager', cmd: '/usr/local/bin/messager', strace: ['connect(7, {sa_family=AF_INET, sin_port=htons(5432), sin_addr=inet_addr(\"10.0.97.40\")}, 16'] })");
contient(t("strace -p 2210"), "Operation not permitted", "strace sans sudo");
contient(t("sudo strace -p 2210"), "inet_addr(\"10.0.97.40\")", "strace -p : l'appel bloqué");
contient(t("getent hosts base-ancienne"), "10.0.97.40", "getent hosts lit /etc/hosts de la machine");
t("echo -500 | sudo tee /proc/2210/oom_score_adj");
egal(L("procParPid('atelier', 2210).oomAdj"), -500, "oom_score_adj s'écrit");
contient(t("sudo pmap 2210"), "total", "pmap");

/* --- 16. Les tâches : &, jobs, Ctrl-Z, bg, fg, disown, nohup, tmux --- */
s = t("chat-errant &");
contient(s, "[1]", "& : la tâche 1");
contient(t("jobs"), "Running", "jobs : Running");
t("fg %1");
contient(t("ls"), "occupe encore le terminal", "fg : le programme tient le terminal");
L("Shell.suspendre()");
contient(t("jobs"), "Stopped", "Ctrl-Z : Stopped");
contient(t("ps -o stat= -p " + L("etatMachine('atelier').jobs[0].pid")), "T", "ps : l'état T");
contient(t("bg %1"), "&", "bg");
contient(t("jobs"), "Running", "bg : Running");
var pidChat = L("procsMachine('atelier').filter(function(p){ return p.comm === 'chat-errant'; })[0].pid");
t("kill -STOP " + pidChat);
egal(L("procParPid('atelier', " + pidChat + ").etat"), "T", "kill -STOP");
t("kill -CONT " + pidChat);
egal(L("procParPid('atelier', " + pidChat + ").etat"), "S", "kill -CONT");
t("disown %1");
egal(t("jobs").trim(), "", "disown : plus dans jobs");
// La copie longue : dans tmux, elle survit à la déconnexion ; à nu, elle meurt.
t("/usr/local/bin/recopier &");
t("exit");
t("ssh atelier");
verifier(L("procsMachine('atelier').some(function(p){ return p.comm === 'chat-errant'; })"), "disown : le chat survit à la déconnexion");
verifier(!L("procsMachine('atelier').some(function(p){ return p.comm === 'recopier'; })"), "sans nohup ni tmux : la copie meurt à la déconnexion");
contient(t("tmux new -s copie"), "[copie]", "tmux new -s");
contient(t("/usr/local/bin/recopier"), "tmux", "dans tmux, la copie tourne");
contient(t("tmux detach"), "detached", "tmux detach");
t("exit"); t("ssh atelier");
contient(t("tmux ls"), "copie:", "tmux ls après reconnexion");
contient(t("tmux attach -t copie"), "copie des archives", "tmux attach : la copie avance");
t("tmux detach");
for (var k4 = 0; k4 < 8; k4++) t("true");
verifier(L("!!etatMachine('atelier').tachesFinies.recopier && etatMachine('atelier').tachesFinies.recopier.tmux === 'copie'"), "la copie s'est terminée dans tmux");
contient(t("nohup /usr/local/bin/recopier &"), "nohup: ignoring input", "nohup ... &");
contient(t("watch -n 2 cat /proc/loadavg"), "Every 2.0s", "watch");
contient(t("screen -ls"), "No Sockets", "screen -ls");

/* --- 17. Groupes, setgid, quotas --- */
t("sudo mkdir /home/commun");
t("sudo chgrp lumen /home/commun");
t("sudo chmod 2775 /home/commun");
contient(t("ls -ld /home/commun"), "drwxrwsr-x", "chmod 2775 : le s du groupe");
t("touch /home/commun/note");
contient(t("ls -l /home/commun"), " lumen ", "setgid : le fichier hérite du groupe lumen");
t("sudo chmod g-s /home/commun");
t("touch /home/commun/autre");
contient(t("ls -l /home/commun | grep autre"), JOUEUR_PLACEHOLDER(), "sans setgid : le groupe principal");
t("sudo chmod g+s /home/commun");
contient(t("ls -ld /home/commun"), "rwxrwsr-x", "chmod g+s");
t("newgrp lumen");
t("touch /tmp/de-lumen");
contient(t("ls -l /tmp/de-lumen"), " lumen ", "newgrp : les fichiers prennent le groupe courant");
t("sudo setquota -u ada 500M 600M 0 0 /home");
contient(t("sudo quota -u ada"), "512000", "quota -u : la limite souple en blocs");
contient(t("sudo repquota -a"), "ada", "repquota -a");
t("sudo edquota -p ada bob");
contient(t("sudo quota -u bob"), "614400", "edquota -p : le quota copié");
contient(t("sudo setquota -u ada 500M 600M 0 0 /srv/donnees"), "no quota enabled", "setquota : pas de quota sur /srv/donnees");

/* --- 18. Compressions --- */
t("sudo cp /etc/app.conf /tmp/rouleau.txt");
L("fichierHote('atelier', '/tmp/rouleau.txt').taille = 100 * 1048576");
t("sudo chown " + L("JOUEUR") + " /tmp/rouleau.txt");
t("bzip2 -k /tmp/rouleau.txt"); t("xz -k /tmp/rouleau.txt"); t("zstd /tmp/rouleau.txt"); t("gzip -k /tmp/rouleau.txt");
var tailles = ["bz2", "xz", "zst", "gz"].map(function(x){ return L("tailleObjetMachine(fichierHote('atelier', '/tmp/rouleau.txt." + x + "'))"); });
verifier(tailles[1] < tailles[0] && tailles[0] < tailles[2] && tailles[2] < tailles[3], "xz < bzip2 < zstd < gzip : " + tailles.join(", "));
contient(t("xz -l /tmp/rouleau.txt.xz"), "Ratio", "xz -l");
egal(t("xzcat /tmp/rouleau.txt.xz").trim(), "base = base-ancienne:5432", "xzcat");
contient(t("file /tmp/rouleau.txt.zst"), "Zstandard", "file : zstd");
contient(t("ls -lh /tmp"), "rouleau.txt.xz", "ls -lh");
t("gzip /tmp/rouleau.txt");
contient(t("zgrep base /tmp/rouleau.txt.gz"), "base-ancienne", "zgrep");
contient(t("zless /tmp/rouleau.txt.gz"), "base-ancienne", "zless");

/* --- 19. L'heure --- */
contient(t("date"), "UTC", "date : la machine est en UTC");
verifier(/^\d{10}$/.test(t("date +%s").trim()), "date +%s");
var ep = t("date +%s").trim();
egal(t("date -d @" + ep + " +%s").trim(), ep, "date -d @ : aller-retour");
contient(t("sudo hwclock --show"), "+00:00", "hwclock --show");
egal(L("etatMachine('atelier').derive"), 71, "l'horloge matérielle dérive de 71 s");
t("sudo hwclock --systohc");
egal(L("etatMachine('atelier').derive"), 0, "hwclock --systohc");
contient(t("cal"), "Su Mo Tu We Th Fr Sa", "cal");
contient(t("cal -3"), "Mo", "cal -3");
t("sudo timedatectl set-timezone Europe/Paris");
contient(t("date"), "CEST", "set-timezone : CEST");
contient(t("timedatectl"), "Europe/Paris", "timedatectl");

/* --- 20. last -x, journalctl -b, --list-boots, locate --- */
contient(t("last -x reboot"), "system boot", "last -x reboot");
contient(t("last -x"), "crash", "last -x : l'arrêt brutal");
contient(t("sudo journalctl --list-boots"), " -1 ", "journalctl --list-boots");
contient(t("locate app.conf"), "updatedb", "locate sans base");
t("sudo updatedb");
contient(t("locate app.conf"), "/etc/app.conf", "locate après updatedb");

/* --- 21. Sauvegarde et rechargement : l'état de la machine survit --- */
jeu.lire("state.save()");
var jeu2 = nouveauJeu(STOCKAGE);
egal(jeu2.lire("etatMachine('atelier').fuseau"), "Europe/Paris", "rechargement : le fuseau");
egal(jeu2.lire("lvsMachine('atelier').filter(function(l){ return l.nom === 'lv_donnees'; })[0].taille"), 50 * G, "rechargement : le volume agrandi");
egal(jeu2.lire("tailleObjetMachine(fichierHote('atelier', '/swapfile'))"), 2 * G, "rechargement : la taille de /swapfile");
egal(jeu2.lire("compteVirtuels('atelier', '/var/lib/lumen/sessions').nombre"), 20, "rechargement : les sessions");

console.log(ok + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
function JOUEUR_PLACEHOLDER(){ return " " + jeu.lire("JOUEUR") + " "; }
