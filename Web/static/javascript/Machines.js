/**
 * Machines.js : la vie de Lumen (chapitre 6 pour le joueur, numéro interne 7).
 *
 * Chapitre6.js pose le monde, la machine lumen, l'horloge, les 37 étapes et la Longue Nuit. Ici, la cité prend vie :
 *  - les seize gardiens, un par quartier, ont un texte VIVANT : ils entrent en scène, expliquent leur avarie par une
 *    image (avec le vrai mot du métier à côté), donnent la syntaxe, confient la mission sans en dicter la commande,
 *    réagissent aux erreurs fréquentes, puis racontent une anecdote du métier ;
 *  - les 82 défis (quêtes secondaires s_m6_*) : cinq par quartier, révélés par le gardien, et deux défis d'honneur ;
 *  - les badges du chapitre, le plan de la cité (lanterne), le bestiaire et les noms imagés des sorts.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis de Lumen (quêtes secondaires, cinq par quartier)           */
/* ------------------------------------------------------------------ */

function oCh6(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function pidDe6(comm){ var p = procCh6(comm); return p ? String(p.pid) : "\u0000"; }

/* appel(nom, args, sortie, io) : le sort lancé sur lumen, et sa sortie, le prouvent. monde() : l'état de la machine le prouve. */
var DEFIS_LUMEN = [
	// Les Docks (Seymour)
	{ id: "s_m6_du_profondeur", q: "docks", titre: "Docks : un seul niveau de profondeur (du -h --max-depth=1 /var)",
	  appel: function(n, a, s){ var i = a.indexOf("-d"); return n === "du" && (a.indexOf("--max-depth=1") > -1 || (i > -1 && a[i + 1] === "1") || a.some(function(x){ return /^-\w*d1$/.test(x); })) && /\/var\/log/.test(s); } },
	{ id: "s_m6_df_types", q: "docks", titre: "Docks : les types des systèmes de fichiers (df -hT)",
	  appel: function(n, a, s){ return n === "df" && oCh6(a).indexOf("T") > -1 && /ext4/.test(s); } },
	{ id: "s_m6_ncdu", q: "docks", titre: "Docks : le plan des entrepôts, trié par taille (ncdu /var)",
	  appel: function(n, a, s){ return n === "ncdu" && a.some(function(x){ return /^\/var/.test(x); }); } },
	{ id: "s_m6_find_vieux", q: "docks", titre: "Docks : ce qui dort depuis plus d'un mois (find /var -mtime +30)",
	  appel: function(n, a, s){ var i = a.indexOf("-mtime"); return n === "find" && i > -1 && /^\+\d+$/.test(a[i + 1] || "") && +a[i + 1].substring(1) >= 30 && s.trim() !== ""; } },
	{ id: "s_m6_liens_casses", q: "docks", titre: "Docks : les panneaux qui ne mènent nulle part (find -xtype l), retirés",
	  monde: function(){ return vu("xtype") && !F6("/var/www/lumen/ancien-plan.html"); } },
	// Les Archives (Kathleen)
	{ id: "s_m6_ls_f", q: "archives", titre: "Archives : lire les tiroirs sans les trier (ls -f | head)",
	  appel: function(n, a, s){ return n === "ls" && oCh6(a).indexOf("f") > -1 && /sess_/.test(s); } },
	{ id: "s_m6_stat_inode", q: "archives", titre: "Archives : le numéro de fiche d'un fichier (stat -c %i)",
	  appel: function(n, a, s){ return n === "stat" && a.some(function(x){ return /%i/.test(x); }) && /^\d+$/m.test(s); } },
	{ id: "s_m6_tune2fs_inodes", q: "archives", titre: "Archives : combien de fiches en tout (tune2fs -l, Inode count)",
	  appel: function(n, a, s){ return n === "tune2fs" && /lv_sessions/.test(a.join(" ")) && /Inode count/.test(s); } },
	{ id: "s_m6_rm_trop_long", q: "archives", titre: "Archives : constater que rm sess_* ne passe pas (Argument list too long)",
	  appel: function(n, a, s){ return n === "rm" && /Argument list too long/.test(s); } },
	{ id: "s_m6_tmpfiles_cat", q: "archives", titre: "Archives : relire toutes les règles de ménage (systemd-tmpfiles --cat-config)",
	  appel: function(n, a, s){ return n === "systemd-tmpfiles" && a.indexOf("--cat-config") > -1 && /sessions/.test(s); } },
	// La Gazette (Ida)
	{ id: "s_m6_journal_since", q: "gazette", titre: "Gazette : le journal depuis une heure précise (journalctl --since)",
	  appel: function(n, a, s){ return n === "journalctl" && a.some(function(x){ return x === "--since" || x === "-S" || /^--since=/.test(x); }) && s.trim() !== ""; } },
	{ id: "s_m6_journal_u", q: "gazette", titre: "Gazette : le journal d'un seul service (journalctl -u lumen-web)",
	  appel: function(n, a, s){ return n === "journalctl" && a.some(function(x){ return /lumen-web/.test(x); }) && /lumen-web/.test(s); } },
	{ id: "s_m6_journal_f", q: "gazette", titre: "Gazette : suivre le journal en direct (journalctl -f)",
	  appel: function(n, a, s){ return n === "journalctl" && (a.indexOf("-f") > -1 || a.indexOf("--follow") > -1); } },
	{ id: "s_m6_vacuum_time", q: "gazette", titre: "Gazette : ne garder qu'une semaine de journal (journalctl --vacuum-time)",
	  appel: function(n, a, s, io){ return n === "journalctl" && io.sudo && a.some(function(x){ return /^--vacuum-time=/.test(x); }); } },
	{ id: "s_m6_journal_iso", q: "gazette", titre: "Gazette : des dates sans ambiguïté (journalctl -o short-iso)",
	  appel: function(n, a, s){ return n === "journalctl" && (a.indexOf("short-iso") > -1 || a.indexOf("--output=short-iso") > -1) && /\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s); } },
	// Les Forges (Gordon)
	{ id: "s_m6_vmstat", q: "forges", titre: "Forges : les échanges avec le disque, seconde par seconde (vmstat 1 5)",
	  appel: function(n, a, s){ return n === "vmstat" && a.length > 0 && /si\s+so/.test(s); } },
	{ id: "s_m6_ps_mem", q: "forges", titre: "Forges : les plus gros mangeurs de mémoire (ps aux --sort=-%mem)",
	  appel: function(n, a, s){ return n === "ps" && a.some(function(x){ return /^--sort=-(%mem|rss|pmem)/.test(x); }); } },
	{ id: "s_m6_oom_adj", q: "forges", titre: "Forges : protéger la base de l'OOM killer (oom_score_adj négatif)",
	  monde: function(){ var p = principalCh6("lumen-base.service"); return !!p && (p.oomAdj || 0) <= -100; } },
	{ id: "s_m6_pmap", q: "forges", titre: "Forges : la carte de la mémoire d'un processus (pmap)",
	  appel: function(n, a, s){ return n === "pmap" && /total/.test(s); } },
	{ id: "s_m6_meminfo", q: "forges", titre: "Forges : le registre du noyau (MemAvailable dans /proc/meminfo)",
	  appel: function(n, a, s){ return (n === "cat" || n === "grep") && a.indexOf("/proc/meminfo") > -1 && /MemAvailable/.test(s); } },
	// La Tour de l'Horloge (Niklaus)
	{ id: "s_m6_pgrep", q: "horloge", titre: "Tour : trouver un processus et sa ligne de commande (pgrep -a)",
	  appel: function(n, a, s){ return n === "pgrep" && oCh6(a).indexOf("a") > -1 && s.trim() !== ""; } },
	{ id: "s_m6_pidof", q: "horloge", titre: "Tour : le numéro d'un programme par son nom (pidof)",
	  appel: function(n, a, s){ return n === "pidof" && /^\d+/.test(s.trim()); } },
	{ id: "s_m6_nice", q: "horloge", titre: "Tour : lancer une commande à faible priorité (nice -n 10)",
	  appel: function(n, a, s, io){ return n === "nice" && a.indexOf("-n") > -1 && !io.code; } },
	{ id: "s_m6_kill_l", q: "horloge", titre: "Tour : la liste des signaux (kill -l)",
	  appel: function(n, a, s){ return n === "kill" && a.indexOf("-l") > -1 && /KILL/.test(s); } },
	{ id: "s_m6_top_b", q: "horloge", titre: "Tour : un instantané de top, lisible dans un fichier (top -b -n 1)",
	  appel: function(n, a, s){ return n === "top" && oCh6(a).indexOf("b") > -1 && /load average/.test(s); } },
	// Les Citernes (Sophie)
	{ id: "s_m6_pvcreate", q: "citernes", titre: "Citernes : préparer la cuve neuve (pvcreate /dev/sde)",
	  monde: function(){ return (etatMachine(H6).pvs || []).some(function(p){ return p.chemin === "/dev/sde"; }); } },
	{ id: "s_m6_vgextend", q: "citernes", titre: "Citernes : la relier à la réserve commune (vgextend)",
	  monde: function(){ return (etatMachine(H6).pvs || []).some(function(p){ return p.chemin === "/dev/sde" && p.vg === "vg_lumen"; }); } },
	{ id: "s_m6_blkid", q: "citernes", titre: "Citernes : les étiquettes de chaque volume (blkid)",
	  appel: function(n, a, s){ return n === "blkid" && /UUID="/.test(s); } },
	{ id: "s_m6_lsblk", q: "citernes", titre: "Citernes : l'arbre des disques et des volumes (lsblk)",
	  appel: function(n, a, s){ return n === "lsblk" && /vg_lumen-lv_donnees/.test(s); } },
	{ id: "s_m6_vgdisplay", q: "citernes", titre: "Citernes : le détail de la réserve (vgdisplay)",
	  appel: function(n, a, s){ return n === "vgdisplay" && /Free\s+PE/.test(s); } },
	// La Porte du Matin (Lynn)
	{ id: "s_m6_findmnt_racine", q: "porte", titre: "Porte : ce qui est monté sur / (findmnt /)",
	  appel: function(n, a, s){ return n === "findmnt" && a.indexOf("/") > -1 && /lv_racine/.test(s); } },
	{ id: "s_m6_blkid_value", q: "porte", titre: "Porte : l'UUID seul, prêt à copier (blkid -s UUID -o value)",
	  appel: function(n, a, s){ return n === "blkid" && a.indexOf("value") > -1 && /^[0-9a-f-]{36}$/m.test(s.trim()); } },
	{ id: "s_m6_proc_mounts", q: "porte", titre: "Porte : les montages vus par le noyau (cat /proc/mounts)",
	  appel: function(n, a, s){ return n === "cat" && a.indexOf("/proc/mounts") > -1 && /ext4/.test(s); } },
	{ id: "s_m6_lsblk_o", q: "porte", titre: "Porte : choisir ses colonnes (lsblk -o NAME,UUID,MOUNTPOINT)",
	  appel: function(n, a, s){ return n === "lsblk" && a.indexOf("-o") > -1 && /UUID/.test(s); } },
	{ id: "s_m6_df_boot", q: "porte", titre: "Porte : /boot monté et mesuré (df -h /boot)",
	  appel: function(n, a, s){ return n === "df" && a.indexOf("/boot") > -1 && /sda1/.test(s); } },
	// Les Ateliers des automates (Mary)
	{ id: "s_m6_verify", q: "ateliers", titre: "Ateliers : faire relire la feuille de route (systemd-analyze verify)",
	  evenement: "machine", quand: function(e){ return e.cmd === "systemd-analyze" && e.action === "verify" && e.ok && (e.unites || []).some(function(u){ return /allumeur/.test(u); }); } },
	{ id: "s_m6_cat_unit", q: "ateliers", titre: "Ateliers : la feuille telle que systemd la lit (systemctl cat allumeur)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("cat") > -1 && /ExecStart=\/opt\/lumen\/allumeur/.test(s); } },
	{ id: "s_m6_is_enabled", q: "ateliers", titre: "Ateliers : vérifier qu'il démarrera au réveil (systemctl is-enabled)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("is-enabled") > -1 && /^enabled$/m.test(s); } },
	{ id: "s_m6_systemd_run", q: "ateliers", titre: "Ateliers : une tâche différée, sans écrire d'unité (systemd-run --on-active)",
	  evenement: "machine", quand: function(e){ return e.cmd === "systemd-run" && !!e.delai; } },
	{ id: "s_m6_show_restart", q: "ateliers", titre: "Ateliers : lire une seule propriété (systemctl show -p Restart)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("show") > -1 && /^Restart=(on-failure|always|on-abnormal)$/m.test(s); } },
	// La Crypte des mémoires (Betty)
	{ id: "s_m6_tar_t", q: "memoires", titre: "Crypte : lister une archive sans l'ouvrir (tar tzf)",
	  appel: function(n, a, s){ return n === "tar" && a.some(function(x){ return /^-?[A-Za-z]*t[A-Za-z]*$/.test(x); }) && /registre-1880/.test(s); } },
	{ id: "s_m6_calendar", q: "memoires", titre: "Crypte : quand sonnera la prochaine sauvegarde (systemd-analyze calendar)",
	  appel: function(n, a, s){ return n === "systemd-analyze" && a.indexOf("calendar") > -1 && /Next elapse/.test(s); } },
	{ id: "s_m6_rsync_dry", q: "memoires", titre: "Crypte : une copie à blanc vers le disque de sauvegarde (rsync -an)",
	  appel: function(n, a, s){ return n === "rsync" && (/n/.test(oCh6(a)) || a.indexOf("--dry-run") > -1) && /\/mnt\/sauvegarde/.test(a.join(" ")); } },
	{ id: "s_m6_rsync", q: "memoires", titre: "Crypte : la vraie copie des registres sur le disque de sauvegarde (rsync -a)",
	  monde: function(){ return !!F6("/mnt/sauvegarde/archives/registres/registre-1880.txt"); } },
	{ id: "s_m6_journal_sauvegarde", q: "memoires", titre: "Crypte : ce que la sauvegarde a dit (journalctl -u sauvegarde)",
	  appel: function(n, a, s){ return n === "journalctl" && /sauvegarde/.test(a.join(" ")) && /sauvegarde terminee/.test(s); } },
	// L'Observatoire (Donald)
	{ id: "s_m6_uptime_p", q: "observatoire", titre: "Observatoire : depuis quand le Cœur bat, en clair (uptime -p)",
	  appel: function(n, a, s){ return n === "uptime" && a.indexOf("-p") > -1 && /^up /.test(s); } },
	{ id: "s_m6_sar_q", q: "observatoire", titre: "Observatoire : l'histoire de la charge (sar -q)",
	  appel: function(n, a, s){ return n === "sar" && a.indexOf("-q") > -1 && /ldavg/.test(s); } },
	{ id: "s_m6_sar_r", q: "observatoire", titre: "Observatoire : l'histoire de la mémoire (sar -r)",
	  appel: function(n, a, s){ return n === "sar" && a.indexOf("-r") > -1 && /kbavail|memused/.test(s); } },
	{ id: "s_m6_curl_code", q: "observatoire", titre: "Observatoire : le code de réponse seul (curl -w '%{http_code}')",
	  appel: function(n, a, s){ return n === "curl" && /http_code/.test(a.join(" ")) && /\b200\b/.test(s); } },
	{ id: "s_m6_iostat_dev", q: "observatoire", titre: "Observatoire : un seul disque à la loupe (iostat -x sdc)",
	  appel: function(n, a, s){ return n === "iostat" && a.indexOf("sdc") > -1 && /%util/.test(s); } },
	// Le Puits aux deux sources (Dorothy)
	{ id: "s_m6_mdadm_examine", q: "puits", titre: "Puits : la carte d'identité d'un membre du miroir (mdadm --examine)",
	  appel: function(n, a, s){ return n === "mdadm" && (a.indexOf("--examine") > -1 || a.indexOf("-E") > -1) && /Array UUID/.test(s); } },
	{ id: "s_m6_lsblk_f", q: "puits", titre: "Puits : qui appartient à quoi (lsblk -f)",
	  appel: function(n, a, s){ return n === "lsblk" && oCh6(a).indexOf("f") > -1 && /linux_raid_member/.test(s); } },
	{ id: "s_m6_detail_scan", q: "puits", titre: "Puits : la ligne à garder dans mdadm.conf (mdadm --detail --scan)",
	  appel: function(n, a, s){ return n === "mdadm" && a.indexOf("--scan") > -1 && /ARRAY \/dev\/md0/.test(s); } },
	{ id: "s_m6_smart_test", q: "puits", titre: "Puits : un court examen du disque, et son résultat (smartctl -t short, -l selftest)",
	  appel: function(n, a, s){ return n === "smartctl" && a.indexOf("selftest") > -1 && /Completed without error|Completed/.test(s); } },
	{ id: "s_m6_smart_i", q: "puits", titre: "Puits : le modèle et les heures de vol d'un disque (smartctl -i)",
	  appel: function(n, a, s){ return n === "smartctl" && a.indexOf("-i") > -1 && /Device Model|Model Family/.test(s); } },
	// Les Thermes (Ruth)
	{ id: "s_m6_dmesg_t", q: "thermes", titre: "Thermes : l'erreur de la nuit, à l'heure lisible (dmesg -T)",
	  appel: function(n, a, s){ return n === "dmesg" && oCh6(a).indexOf("T") > -1 && /EXT4-fs/.test(s); } },
	{ id: "s_m6_fuser", q: "thermes", titre: "Thermes : qui se baigne encore (fuser -vm)",
	  appel: function(n, a, s){ return n === "fuser" && /m/.test(oCh6(a)) && /archiviste/.test(s); } },
	{ id: "s_m6_lsof_dir", q: "thermes", titre: "Thermes : les fichiers ouverts sous un dossier (lsof +D)",
	  appel: function(n, a, s){ return n === "lsof" && a.indexOf("+D") > -1 && /archiv/.test(s); } },
	{ id: "s_m6_remount", q: "thermes", titre: "Thermes : rouvrir en écriture sans démonter (mount -o remount,rw)",
	  appel: function(n, a, s, io){ return n === "mount" && /remount/.test(a.join(" ")) && /rw/.test(a.join(" ")) && io.sudo && !io.code; } },
	{ id: "s_m6_tune2fs_i", q: "thermes", titre: "Thermes : une vérification au moins tous les six mois (tune2fs -i)",
	  monde: function(){ var f = systemesMachine(H6).filter(function(x){ return x.source === "/dev/md0"; })[0]; return !!f && f.intervalle >= 1 && f.intervalle <= 180; } },
	// Le Grand Marché (Charles)
	{ id: "s_m6_dpkg_l", q: "marche", titre: "Marché : l'état de chaque paquet de la cité (dpkg -l | grep lumen)",
	  appel: function(n, a, s){ return (n === "grep" || n === "dpkg") && /^ii\s+lumen-/m.test(s); } },
	{ id: "s_m6_apt_policy", q: "marche", titre: "Marché : la version installée et la candidate (apt policy)",
	  appel: function(n, a, s){ return n === "apt" && a.indexOf("policy") > -1 && /Candidate:/.test(s); } },
	{ id: "s_m6_apt_depends", q: "marche", titre: "Marché : de quoi dépend un paquet (apt-cache depends)",
	  appel: function(n, a, s){ return n === "apt-cache" && a.indexOf("depends") > -1 && /Depends:/.test(s); } },
	{ id: "s_m6_uname_r", q: "marche", titre: "Marché : le noyau qui tourne, face à celui qui attend (uname -r)",
	  appel: function(n, a, s){ return n === "uname" && a.indexOf("-r") > -1 && /6\.1\.0-26/.test(s); } },
	{ id: "s_m6_dpkg_audit", q: "marche", titre: "Marché : demander à dpkg ce qui cloche encore (dpkg --audit)",
	  appel: function(n, a, s){ return n === "dpkg" && (a.indexOf("--audit") > -1 || a.indexOf("-C") > -1); } },
	// Le Labyrinthe (John)
	{ id: "s_m6_list_deps", q: "labyrinthe", titre: "Labyrinthe : l'arbre des portes d'un service (systemctl list-dependencies)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("list-dependencies") > -1 && /lumen/.test(a.join(" ")); } },
	{ id: "s_m6_journal_k", q: "labyrinthe", titre: "Labyrinthe : le journal du noyau seul (journalctl -k)",
	  appel: function(n, a, s){ return n === "journalctl" && (a.indexOf("-k") > -1 || a.indexOf("--dmesg") > -1) && /kernel/.test(s); } },
	{ id: "s_m6_analyze_time", q: "labyrinthe", titre: "Labyrinthe : combien de temps dure le réveil (systemd-analyze)",
	  appel: function(n, a, s){ return n === "systemd-analyze" && /Startup finished/.test(s); } },
	{ id: "s_m6_list_boots", q: "labyrinthe", titre: "Labyrinthe : les réveils passés (journalctl --list-boots)",
	  appel: function(n, a, s){ return n === "journalctl" && a.indexOf("--list-boots") > -1; } },
	{ id: "s_m6_journal_b1", q: "labyrinthe", titre: "Labyrinthe : le journal du réveil d'avant, et comment il a fini (journalctl -b -1)",
	  appel: function(n, a, s){ return n === "journalctl" && a.indexOf("-1") > -1 && /Kernel panic/.test(s); } },
	// La Bibliothèque des limites (Kay)
	{ id: "s_m6_ulimit_n", q: "limites", titre: "Bibliothèque : ta propre limite de livres ouverts (ulimit -n)",
	  appel: function(n, a, s){ return n === "ulimit" && a.indexOf("-n") > -1 && /^\d+$/.test(s.trim()); } },
	{ id: "s_m6_ulimit_a", q: "limites", titre: "Bibliothèque : toutes tes limites (ulimit -a)",
	  appel: function(n, a, s){ return n === "ulimit" && a.indexOf("-a") > -1 && /open files/.test(s); } },
	{ id: "s_m6_lsof_p", q: "limites", titre: "Bibliothèque : les fichiers ouverts d'un seul lecteur (lsof -p)",
	  appel: function(n, a, s){ return n === "lsof" && a.indexOf("-p") > -1 && /lumen-catalogue|catalogue/.test(s); } },
	{ id: "s_m6_proc_status", q: "limites", titre: "Bibliothèque : la fiche d'un processus (cat /proc/PID/status)",
	  appel: function(n, a, s){ return n === "cat" && a.some(function(x){ return /^\/proc\/\d+\/status$/.test(x); }) && /VmRSS/.test(s); } },
	{ id: "s_m6_show_nofile", q: "limites", titre: "Bibliothèque : la limite vue par systemd (systemctl show -p LimitNOFILE)",
	  appel: function(n, a, s){ return n === "systemctl" && a.indexOf("show") > -1 && /LimitNOFILE=65536/.test(s); } },
	// Le Guetteur (Klara)
	{ id: "s_m6_hostnamectl", q: "guetteur", titre: "Guetteur : le nom et l'identité de la machine (hostnamectl)",
	  appel: function(n, a, s){ return n === "hostnamectl" && /Static hostname/.test(s); } },
	{ id: "s_m6_timezone", q: "guetteur", titre: "Guetteur : mettre le Cœur à l'heure de la cité (timedatectl set-timezone Europe/Paris)",
	  monde: function(){ return etatMachine(H6).fuseau === "Europe/Paris"; } },
	{ id: "s_m6_screen_ls", q: "guetteur", titre: "Guetteur : l'autre multiplexeur, ses sessions (screen -ls)",
	  appel: function(n, a, s){ return n === "screen" && a.indexOf("-ls") > -1; } },
	{ id: "s_m6_getent", q: "guetteur", titre: "Guetteur : demander une adresse comme le fait le système (getent hosts)",
	  appel: function(n, a, s){ return n === "getent" && a.indexOf("hosts") > -1 && s.trim() !== ""; } },
	{ id: "s_m6_watch", q: "guetteur", titre: "Guetteur : relancer une commande toutes les deux secondes (watch -n 2)",
	  appel: function(n, a, s){ return n === "watch" && a.indexOf("-n") > -1; } },
	// Les défis d'honneur (Laurent)
	{ id: "s_m6_avant_midi", q: "honneur", titre: "Honneur : les seize quartiers rallumés avant midi" },
	{ id: "s_m6_sans_indice", q: "honneur", titre: "Honneur : remettre le rapport sans avoir acheté un seul indice" }
];
DEFIS_LUMEN.forEach(function(d){ QUETES_SECONDAIRES_CH6.push({ id: d.id, titre: d.titre }); });
function defisQuartier(cle){ return DEFIS_LUMEN.filter(function(d){ return d.q === cle; }); }
function idsDefisQuartier(cle){ return defisQuartier(cle).map(function(d){ return d.id; }); }
function listeDefisQuartier(cle){
	return defisQuartier(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}
function reussirDefiLumen(id){
	if (!lumenOuvert() || state.quests[id]) return;
	state.complete(id);
}

/* Les sorts lancés sur lumen (et leur sortie), une fois qu'ils ont réussi. */
var APPELER_AVANT_LUMEN_DEFIS = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_LUMEN_DEFIS.apply(this, arguments);
	if (lumenOuvert() && surLumen()){
		try {
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "";
			DEFIS_LUMEN.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args || [], s, io || {})) reussirDefiLumen(d.id); });
			if (nom === "find" && (args || []).indexOf("-xtype") > -1 && /ancien-plan\.html/.test(s)) noterVu("xtype");
		} catch (e){ /* un défi ne doit jamais casser un sort */ }
	}
	return sortie;
};
(function(){
	var types = {};
	DEFIS_LUMEN.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!lumenOuvert() || (e.hote && e.hote !== H6)) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiLumen(d.id); } catch (x){} });
		});
	});
})();

/* ------------------------------------------------------------------ */
/* Les seize gardiens, vivants                                         */
/* ------------------------------------------------------------------ */

function texteGardienLumen(g){
	var q = quartierCh6(g.q), e1 = aFait(q.etapes[0]), e2 = aFait(q.etapes[1]);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouh]/.test(g.nom) ? "d'" : "de ") + g.nom) + C.gris(" (des quêtes secondaires, sur lumen)") + "\n" + listeDefisQuartier(g.q);
	if (e1 && e2) return g.fin() + defis;
	var erreur = null;
	try { erreur = g.erreur ? g.erreur() : null; } catch (x){ erreur = null; }
	var corps = (e1 || e2) ? g.entre(e1) : g.entree() + "\n\n" + g.image() + "\n\n" + g.syntaxe() + "\n\n" + g.mission();
	return corps + (erreur ? "\n\n" + C.jaune(erreur) : "") + "\n\n" + C.gris(g.metier) + defis;
}

var GARDIENS_LUMEN = {
	docks: { nom: "Seymour", q: "docks",
		metier: "Le métier : un disque plein arrête tout, et sans prévenir. On le surveille (df), on cherche (du, ncdu, find), et on n'efface jamais un fichier ouvert : on le vide, ou on relance son service.",
		entree: function(){ return "Seymour est assis sur une caisse, au bord d'un quai encombré jusqu'à la voûte. « Plus rien n'entre, plus rien ne sort. Les bateaux attendent depuis l'aube. Tu viens pour les Docks ? »"; },
		image: function(){ return "« Les Docks, c'est le disque /var : là où la machine range ce qui change sans cesse (journaux, bases, caches). " +
			"Quand l'entrepôt est plein, plus personne ne peut écrire, et les services tombent un à un : No space left on device. " +
			"Le coupable est rarement celui qu'on croit : une vieille caisse oubliée dans un coin (une copie de sauvegarde), ou pire, une caisse qu'on a jetée mais que quelqu'un tient encore à bout de bras (un fichier effacé, encore ouvert). »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  df -h                          la place de chaque entrepôt (Use%)\n" +
			"  sudo du -sh /var/* | sort -h    le poids de chaque dossier, trié\n" +
			"  sudo du -h --max-depth=1 /var   un seul niveau de profondeur\n" +
			"  ncdu /var                      le même, en tableau\n" +
			"  sudo find /var -size +500M     les fichiers de plus de 500 Mo\n" +
			"  sudo find /var -mtime +30      ceux qui n'ont pas bougé depuis un mois\n" +
			"  sudo lsof +L1                  les fichiers effacés mais encore ouverts (NLINK 0)\n\n" +
			"Le piège : rm ne rend la place que si personne ne tient le fichier. »"; },
		mission: function(){ return "« Ta mission : trouver ce qui remplit /var et retirer la vieille caisse oubliée. Puis, si df dit encore plein, trouver le fantôme : un fichier effacé que tient un service, et rendre la place sans rien casser. »"; },
		entre: function(premier){ return premier ? "Seymour regarde le quai qui se vide. « La vieille caisse est partie, mais l'entrepôt ne respire toujours pas. Quelqu'un tient encore une caisse effacée : lsof +L1. »" :
			"« Le fantôme est parti. Mais il reste la vieille caisse oubliée : cherche dans /var, du plus lourd au plus léger. »"; },
		erreur: function(){
			if (!aFait("m6_disque") && !F6("/var/backups/lumen-2024.tar.gz") && !vu("coupable")) return "Seymour lève un sourcil. « Tu as retiré la bonne caisse, mais sans la chercher. Montre-moi comment tu l'aurais trouvée : du, ncdu ou find, sur /var. »";
			if (!aFait("m6_disque") && !vu("dfVarPlein")) return "« Commence par df -h : regarde /var de tes yeux avant de toucher à quoi que ce soit. »";
			if (aFait("m6_disque") && !aFait("m6_fantome") && fantomesCh6().length && vu("lsofL1")) return "« Tu as vu le fantôme : lumen-web tient debug.log. Relance le service (sudo systemctl restart lumen-web), et le disque rendra la place. »";
			return null;
		},
		fin: function(){ return "Seymour se lève : les bateaux accostent de nouveau. « Les Docks respirent.\n\n" +
			"Un vendredi soir, un collègue a vu un disque plein, a effacé un journal de 40 Go, et il est rentré chez lui. Le lundi, le disque était toujours plein : le serveur web tenait le fichier ouvert. " +
			"Depuis, on vide un journal avec > fichier, ou on relance le service. Et on ne part pas en week-end sur un df qu'on n'a pas relu. »"; }
	},
	archives: { nom: "Kathleen", q: "archives",
		metier: "Le métier : chaque fichier consomme une fiche (un inode), quelle que soit sa taille. Un dossier de sessions jamais nettoyé suffit à bloquer un disque à moitié vide.",
		entree: function(){ return "Kathleen tire un tiroir : il est plein à craquer de petites fiches, toutes pareilles. « Il reste de la place dans les armoires, et pourtant plus rien ne rentre. Tu sais pourquoi ? »"; },
		image: function(){ return "« Chaque fichier a sa fiche, son inode : son propriétaire, ses droits, ses dates, l'adresse de ses données. Le nombre de fiches est fixé quand on crée le système de fichiers. " +
			"Ici, la cité garde une fiche par visite (une session), et personne ne les jette : des dizaines de milliers de fichiers minuscules. Plus une seule fiche libre, alors que df -h montre de la place. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  df -i                                  les fiches, comme df -h montre les octets (IUse%)\n" +
			"  sudo find DOSSIER -type f | wc -l      combien de fichiers\n" +
			"  sudo ls -f DOSSIER | head              lire sans trier (sinon ls trie des milliers de noms)\n" +
			"  stat -c %i FICHIER                     le numéro de fiche\n" +
			"  sudo find DOSSIER -type f -mmin +60 -delete     retirer ce qui n'a pas bougé depuis une heure\n" +
			"  /etc/tmpfiles.d/NOM.conf               d CHEMIN MODE UTILISATEUR GROUPE ÂGE : un ménage automatique\n" +
			"  sudo systemd-tmpfiles --clean          le ménage, tout de suite\n\n" +
			"rm sess_* ne passera pas : la liste des noms est trop longue pour une seule commande. »"; },
		mission: function(){ return "« Ta mission : rendre des fiches aux Archives sans jeter les sessions des habitants connectés (moins d'une heure). Puis que les vieilles fiches partent seules : une règle tmpfiles, éprouvée. »"; },
		entre: function(premier){ return premier ? "Kathleen referme un tiroir qui glisse enfin. « Il y a des fiches libres. Maintenant, que le ménage se fasse seul : une ligne dans /etc/tmpfiles.d, puis systemd-tmpfiles --clean. »" :
			"« La règle de ménage est écrite. Mais les tiroirs sont toujours pleins : df -i, puis find -mmin +60 -delete. »"; },
		erreur: function(){
			if (!aFait("m6_inodes") && sessionsRecentesCh6() < 20) return "Kathleen pâlit. « Tu as jeté les sessions des habitants connectés, eux aussi : ils viennent d'être déconnectés. Les nouvelles visites vont les recréer ; la prochaine fois, -mmin +60. »";
			if (!aFait("m6_tmpfiles") && fichiersDuDossier(H6, "/etc/tmpfiles.d").length && !tmpfilesSessionsCh6()) return "« Ta règle tmpfiles ne couvre pas /var/lib/lumen/sessions avec un âge d'un jour au plus (6 champs : d CHEMIN MODE UTILISATEUR GROUPE ÂGE). »";
			return null;
		},
		fin: function(){ return "Kathleen range sa dernière fiche, et la cité semble respirer. « Les Archives ont de la place.\n\n" +
			"Un jour, une boutique en ligne est tombée en plein soldes : disque plein, disait l'alerte. df -h montrait 40 % d'utilisation. Il a fallu une heure pour penser à df -i : " +
			"onze millions de sessions de visiteurs, jamais nettoyées. Depuis, je regarde toujours les deux colonnes. »"; }
	},
	gazette: { nom: "Ida", q: "gazette",
		metier: "Le métier : tout journal qu'on ne fait pas tourner finit par remplir le disque. logrotate pour les journaux des programmes, journald pour celui de systemd : les deux ont leurs bornes.",
		entree: function(){ return "Ida enjambe un rouleau de papier qui déborde jusque dans la rue. « La Gazette imprime tout, depuis des mois, et ne jette rien. Viens, on va relier tout ça. »"; },
		image: function(){ return "« Les journaux, c'est la mémoire de la machine : chaque programme y écrit ce qu'il fait. Sans rotation, un seul fichier grossit sans fin. " +
			"La rotation (logrotate) relie le journal du jour, le compresse, en garde quelques-uns et jette le plus vieux. Et systemd tient son propre journal (journald), qu'il faut borner lui aussi. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  /etc/logrotate.d/lumen        /var/log/lumen/*.log { daily ; rotate 7 ; compress ; missingok ; notifempty ; maxsize 100M }\n" +
			"  sudo logrotate -d FICHIER     à blanc : ce que logrotate ferait\n" +
			"  sudo logrotate -f FICHIER     la rotation, tout de suite\n" +
			"  journalctl --disk-usage       le poids du journal de systemd\n" +
			"  sudo journalctl --vacuum-size=200M    ne garder que 200 Mo (ou --vacuum-time=7d)\n" +
			"  /etc/systemd/journald.conf    SystemMaxUse=200M, puis sudo systemctl restart systemd-journald\n" +
			"  journalctl -u SERVICE --since \"1 hour ago\" -f     lire, filtrer, suivre\n\n" +
			"Une directive par ligne dans le bloc de logrotate, et les accolades fermées. »"; },
		mission: function(){ return "« Ta mission : une règle de rotation pour les journaux de la cité, éprouvée à blanc puis appliquée. Puis le journal de systemd ramené sous 500 Mo, et borné pour toujours. »"; },
		entre: function(premier){ return premier ? "Ida coupe le dernier rouleau. « Le journal de la cité tourne. Reste celui de systemd : --disk-usage, --vacuum-size, puis SystemMaxUse et un redémarrage de journald. »" :
			"« journald est borné. Mais le journal de la cité grossit toujours : /etc/logrotate.d/lumen, logrotate -d, puis -f. »"; },
		erreur: function(){
			if (!aFait("m6_logrotate") && blocLogrotateCh6() && !logrotateConfOkCh6()) return "Ida relit ta règle. « Il manque quelque chose : compress, missingok, un rotate entre 1 et 14, et daily (ou maxsize). »";
			if (!aFait("m6_journal") && systemMaxUseCh6() !== null && etatMachine(H6).journaldMax !== systemMaxUseCh6()) return "« SystemMaxUse est écrit, mais journald ne l'a pas relu : sudo systemctl restart systemd-journald. »";
			return null;
		},
		fin: function(){ return "Ida plie la dernière Gazette et la glisse sous ton bras. « Tout est relié, rangé, compressé.\n\n" +
			"Une nuit, un programme s'est mis à écrire la même erreur mille fois par seconde. Au matin, le disque était plein, et le journal, illisible. " +
			"La rotation avec maxsize l'aurait coupé à 100 Mo, et on aurait encore eu la première ligne : celle qui disait pourquoi. »"; }
	},
	forges: { nom: "Gordon", q: "forges",
		metier: "Le métier : on lit available, pas free. Linux se sert de la mémoire libre comme cache, et la rend dès qu'on la demande. Quand elle manque vraiment, l'OOM killer choisit une victime.",
		entree: function(){ return "Gordon essuie son front devant le seul fourneau qui rugit encore. « Celui-là avale tout le charbon de la cité. Cette nuit, il a même étouffé la base. Regarde. »"; },
		image: function(){ return "« La mémoire, c'est le charbon des Forges. Chaque programme en prend ; le noyau garde le reste en réserve (le cache). Un programme qui fuit en reprend sans jamais rendre. " +
			"Quand il n'y a plus rien, le noyau désigne une victime et l'abat : c'est l'OOM killer. Cette nuit, il a tué la base. " +
			"Un groupe de contrôle (MemoryMax) met un service dans son propre fourneau : il ne peut plus dépasser sa ration. Et l'échange (swap), c'est un tas de charbon de secours, plus lent, sur le disque. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  free -h                          la colonne available, pas free\n" +
			"  vmstat 1 5                       si et so : la machine échange-t-elle avec le disque ?\n" +
			"  sudo dmesg -T | grep -i oom      les victimes de l'OOM killer\n" +
			"  ps aux --sort=-%mem | head       les plus gros mangeurs\n" +
			"  sudo systemctl edit SERVICE      [Service] MemoryMax=1G (ou un drop-in à la main, puis daemon-reload), et restart\n" +
			"  sudo fallocate -l 2G /swapfile ; sudo chmod 600 /swapfile ; sudo mkswap /swapfile ; sudo swapon /swapfile\n" +
			"  /etc/fstab : /swapfile none swap sw 0 0          pour le prochain réveil\n" +
			"  /etc/sysctl.d/99-swap.conf : vm.swappiness = 10   puis sudo sysctl --system »"; },
		mission: function(){ return "« Ta mission : trouver le fourneau qui dévore tout, et le mettre dans son propre fourneau (MemoryMax, appliqué). Puis un tas de charbon de secours (un fichier d'échange de 2 Go, permanent), et une machine qui ne s'en sert qu'en dernier recours (swappiness 10). »"; },
		entre: function(premier){ return premier ? "Gordon referme la porte du fourneau. « Il a sa ration. Maintenant, du charbon de secours : un fichier d'échange, dans fstab, et vm.swappiness à 10. »" :
			"« Le secours est en place. Mais le fourneau dévore toujours : free -h, dmesg, ps --sort=-%mem, puis MemoryMax. »"; },
		erreur: function(){
			var f = F6("/swapfile");
			if (!aFait("m6_swap") && f && f.mode !== "rw-------") return "Gordon montre /swapfile. « Lisible par tous : n'importe qui pourrait y lire des morceaux de mémoire. chmod 600, avant mkswap. »";
			if (!aFait("m6_swap") && swapActifCh6() && !fstabSwapCh6()) return "« L'échange tourne, mais il disparaîtra au prochain réveil : une ligne dans /etc/fstab. »";
			if (!aFait("m6_swap") && String(sysctlDemarrage(H6)["vm.swappiness"]) === "10" && String(etatHote(H6).sysctl["vm.swappiness"]) !== "10") return "« La swappiness est gravée, mais pas appliquée : sudo sysctl --system. »";
			if (!aFait("m6_memoire") && typeof changeSurDisque === "function" && changeSurDisque(H6, "cache-rapports.service")) return "« Ta limite est écrite, systemd ne l'a pas relue : sudo systemctl daemon-reload, puis restart. »";
			return null;
		},
		fin: function(){ return "Gordon rallume un à un les fourneaux éteints. « Chacun sa ration, et du secours pour les mauvais jours.\n\n" +
			"J'ai vu une équipe ajouter de la mémoire à un serveur, trois fois de suite. À chaque fois, la fuite la mangeait en deux jours. " +
			"Une limite MemoryMax a tout calmé : le service redémarrait seul une fois par jour au lieu d'emporter la machine. Ça ne répare pas la fuite, mais ça laisse le temps de la trouver. »"; }
	},
	horloge: { nom: "Niklaus", q: "horloge",
		metier: "Le métier : on commence toujours par le geste le plus doux. renice, puis SIGTERM (kill), et SIGKILL (kill -9) seulement si le processus refuse de partir.",
		entree: function(){ return "Niklaus tient une burette d'huile au pied d'un engrenage qui tourne à toute vitesse. Dans l'escalier, des ombres immobiles. « L'un tourne fou, les autres ne partent plus. Bienvenue dans ma tour. »"; },
		image: function(){ return "« Chaque engrenage est un processus. Celui-là, un export, tourne à 100 % depuis hier soir : à chaque fois qu'il s'arrête, une boucle le relance (son parent). " +
			"La charge (load average) se lit face au nombre de cœurs : 8 sur 4 cœurs, c'est deux fois trop. " +
			"Et les ombres de l'escalier, ce sont des spectres : des processus finis, dont le parent n'a jamais relevé le compte (des zombies, état Z, <defunct>). On ne tue pas un spectre : il est déjà mort. On s'occupe de son parent. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  uptime ; nproc                    la charge, face au nombre de cœurs\n" +
			"  top -b -n 1 | head -15            un instantané de top\n" +
			"  ps -eo pid,ppid,ni,%cpu,stat,cmd --sort=-%cpu | head     qui, son parent, sa priorité, son état\n" +
			"  sudo renice +19 -p PID            la priorité la plus basse (le geste doux)\n" +
			"  sudo kill PID ;  sudo kill -9 PID SIGTERM, puis SIGKILL si vraiment il le faut\n" +
			"  pgrep -a NOM ; pidof NOM ; pstree -p PID      trouver, nommer, voir la famille\n" +
			"  ps -o ppid= -p PID                le parent d'un processus\n\n" +
			"Tuer l'enfant d'une boucle ne sert à rien : elle le relance. »"; },
		mission: function(){ return "« Ta mission : calmer l'engrenage fou (renice d'abord, puis kill), lui ET la boucle qui le relance. Puis libérer les spectres : trouve leur parent, et relance-le. »"; },
		entre: function(premier){ return premier ? "Niklaus repose sa burette : l'engrenage s'est arrêté. « Bien. Maintenant les spectres de l'escalier : ps -o ppid=, et relance leur parent. »" :
			"« Les spectres sont partis. Mais l'engrenage tourne toujours fou : renice, puis kill, lui et sa boucle. »"; },
		erreur: function(){
			if (!aFait("m6_cpu") && !vu("renice") && !procCh6("export-registre")) return "Niklaus secoue la tête. « Arrêté d'un coup, sans même ralentir d'abord ? Sur un serveur, on essaie renice avant : relance-le si tu veux t'exercer, et refais-le dans l'ordre. »";
			if (!aFait("m6_cpu") && procsMachine(H6).some(function(p){ return p.boucle; }) && vu("renice")) return "« Tu as ralenti l'export, mais sa boucle le relance à chaque fois : son parent (ps -o ppid=) est une boucle bash. »";
			if (!aFait("m6_zombie") && spectresCh6().length) return "« kill -9 sur un spectre ne fait rien : il est déjà mort. C'est son parent qui doit relever son compte. »";
			return null;
		},
		fin: function(){ return "Niklaus remonte l'horloge, qui sonne l'heure juste pour la première fois depuis des jours. « Les engrenages tournent rond.\n\n" +
			"Un jour, un stagiaire a tué au kill -9 un processus qui écrivait une base. Il a gagné une seconde et perdu une nuit de réparation. " +
			"SIGTERM laisse au programme le temps de ranger ses affaires ; SIGKILL arrache la prise. On commence toujours par demander poliment. »"; }
	},
	citernes: { nom: "Sophie", q: "citernes",
		metier: "Le métier : un volume logique s'agrandit à chaud, en deux temps (le volume, puis le système de fichiers). Et avant une opération risquée, un instantané.",
		entree: function(){ return "Sophie tourne une vanne de laiton : rien ne coule. « La citerne de la base déborde, et la réserve commune est à moitié vide. Il suffit de les relier. Ou presque. »"; },
		image: function(){ return "« Les disques physiques (PV) versent leur eau dans une réserve commune (le groupe de volumes, VG). Dans cette réserve, on taille des citernes à la demande (les volumes logiques, LV). " +
			"Agrandir une citerne, c'est deux gestes : élargir la cuve (lvextend), puis dire au système de fichiers qu'il a plus de place (resize2fs). Et avant de toucher à une cuve pleine, on prend une photo (un instantané, snapshot). »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  lsblk ;  sudo pvs ;  sudo vgs ;  sudo lvs        l'arbre, les disques, la réserve (VFree), les volumes\n" +
			"  sudo lvextend -L +20G /dev/vg_lumen/lv_donnees   élargir la cuve\n" +
			"  sudo resize2fs /dev/mapper/vg_lumen-lv_donnees   agrandir le système de fichiers (ou lvextend -r : les deux)\n" +
			"  sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees    un instantané\n" +
			"  sudo lvremove -y /dev/vg_lumen/avant_maj         le retirer\n" +
			"  sudo pvcreate /dev/sde ;  sudo vgextend vg_lumen /dev/sde        une cuve neuve dans la réserve\n\n" +
			"Un instantané n'est pas une sauvegarde : il vit sur les mêmes disques. »"; },
		mission: function(){ return "« Ta mission : donner vingt gigaoctets de plus à la base, à chaud, et que df le voie. Puis prendre un instantané avant l'opération risquée suivante, le regarder, et le retirer. »"; },
		entre: function(premier){ return premier ? "Sophie regarde l'eau monter dans la citerne agrandie. « Bien. Maintenant, l'habitude des prudents : un instantané avant de toucher, lvs, puis lvremove. »" :
			"« L'instantané est fait et retiré. Mais la base déborde toujours : lvextend, puis resize2fs. »"; },
		erreur: function(){
			var f = fsCh6("/srv/donnees"), lv = (lvsMachine(H6) || []).filter(function(l){ return l.nom === "lv_donnees"; })[0];
			if (!aFait("m6_lvm") && f && lv && lv.taille > f.taille) return "Sophie montre la cuve. « Tu as élargi le volume, mais le système de fichiers ne le sait pas : df ne voit rien. sudo resize2fs. »";
			if (!aFait("m6_snapshot") && (lvsMachine(H6) || []).some(function(l){ return l.origine; })) return "« Ton instantané est là. Regarde-le (sudo lvs), puis retire-le : il mange la réserve tant qu'il existe. »";
			return null;
		},
		fin: function(){ return "Sophie ferme la dernière vanne, satisfaite. « Les Citernes sont à niveau.\n\n" +
			"J'ai connu quelqu'un qui avait agrandi un volume sans resize2fs, puis cherché pendant une heure pourquoi df ne bougeait pas. " +
			"Et quelqu'un d'autre qui gardait des instantanés « au cas où », jusqu'au jour où la réserve s'est vidée et qu'ils sont tous devenus invalides en même temps. »"; }
	},
	porte: { nom: "Lynn", q: "porte",
		metier: "Le métier : une faute dans fstab se paie au redémarrage suivant, souvent des semaines plus tard. On vérifie (findmnt --verify), on monte tout de suite (mount -a), et nofail pour ce qui peut manquer.",
		entree: function(){ return "Lynn tient une longue liste à la main, au pied d'une porte immense. « Chaque matin, la cité ouvre ses salles dans l'ordre de cette liste. Et si une salle a disparu, la porte reste fermée. Tout le monde attend. »"; },
		image: function(){ return "« La liste, c'est /etc/fstab : ce que la machine monte au démarrage, et où. Une ligne vers un disque qui n'existe plus, et la machine s'arrête en mode secours, une console et rien d'autre. " +
			"Chaque disque a une étiquette qui ne change pas (un UUID) : c'est elle qu'on écrit, pas /dev/sdX, qui peut changer d'un démarrage à l'autre. Et pour un disque amovible, nofail : s'il manque, on démarre quand même. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  sudo findmnt --verify           vérifie fstab : chaque source existe-t-elle ?\n" +
			"  sudo blkid ;  sudo blkid -s UUID -o value /dev/sda1      les étiquettes, l'UUID seul\n" +
			"  lsblk -f ;  findmnt /boot       ce qui est monté où\n" +
			"  sudo sed -i 's/ANCIEN/NOUVEAU/' /etc/fstab      corriger une ligne\n" +
			"  defaults,nofail                 les options d'un disque qui peut manquer\n" +
			"  sudo mount -a                   monter tout ce que fstab liste, maintenant\n" +
			"  sudo systemctl daemon-reload    systemd relit fstab (il en fait des unités .mount) »"; },
		mission: function(){ return "« Ta mission : une liste juste. L'UUID de /boot corrigé, nofail pour le disque de sauvegarde amovible, findmnt --verify sans erreur, systemd qui a relu le fichier. Puis tout monter maintenant, /boot compris, sans un mot d'erreur. »"; },
		entre: function(premier){ return premier ? "Lynn coche sa liste. « Elle est juste. Maintenant, ouvre les salles sans attendre demain : sudo mount -a, puis findmnt /boot. »" :
			"« Tout est monté. Mais la liste reste fausse pour le prochain réveil : findmnt --verify. »"; },
		erreur: function(){
			if (!aFait("m6_fstab") && erreursFstabCh6() === 0 && nofailSauvegardeCh6() && !fstabRechargeCh6()) return "Lynn sourit. « La liste est juste. Mais systemd lit encore l'ancienne : sudo systemctl daemon-reload. »";
			if (!aFait("m6_fstab") && erreursFstabCh6() === 0 && !nofailSauvegardeCh6()) return "« Plus d'erreur, mais le disque de sauvegarde est amovible : s'il manque un matin, la porte reste fermée. nofail. »";
			return null;
		},
		fin: function(){ return "Lynn ouvre la Porte du Matin en grand. « Demain, la cité se réveillera seule.\n\n" +
			"Un serveur a refusé de redémarrer après une coupure de courant. Six semaines plus tôt, quelqu'un avait retiré un disque et oublié sa ligne dans fstab. " +
			"Personne ne s'en souvenait. On a passé la nuit à genoux devant une console de secours. Depuis, après chaque changement : findmnt --verify, puis mount -a. »"; }
	},
	ateliers: { nom: "Mary", q: "ateliers",
		metier: "Le métier : un programme lancé à la main dans un terminal n'est pas un service. Il ne redémarre pas, ne se journalise pas, et meurt avec la session.",
		entree: function(){ return "Mary règle un automate de cuivre qui allume les réverbères de la place. « Il tourne à la main, dans un terminal oublié par l'opérateur. Si la session tombe, la place s'éteint. On va lui écrire sa feuille de route. »"; },
		image: function(){ return "« La feuille de route d'un automate, c'est une unité systemd : un fichier .service qui dit quoi lancer (ExecStart), sous quel compte (User), quoi faire s'il tombe (Restart), " +
			"et quand le démarrer au réveil (WantedBy=multi-user.target, dans [Install]). Écrite à la main dans /etc/systemd/system, relue par daemon-reload, activée par enable. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  [Unit]\n  Description=...\n  After=network-online.target\n\n" +
			"  [Service]\n  User=allumeur\n  ExecStart=/opt/lumen/allumeur --port 8080\n  Restart=on-failure\n  RestartSec=5\n\n" +
			"  [Install]\n  WantedBy=multi-user.target\n\n" +
			"  systemd-analyze verify FICHIER        relire avant de charger\n" +
			"  sudo systemctl daemon-reload ;  sudo systemctl enable --now allumeur\n" +
			"  systemctl status allumeur ;  sudo journalctl -u allumeur\n" +
			"  sudo systemctl kill -s KILL allumeur  l'éprouver\n\n" +
			"Un port ne se partage pas : l'ancien allumeur, lancé à la main, le tient encore. »"; },
		mission: function(){ return "« Ta mission : que l'allumeur devienne un service (allumeur.service), lancé par le compte allumeur, relancé s'il tombe, démarré au réveil ; et l'ancien, lancé à la main, arrêté. Puis l'éprouver : tue-le, il doit revenir seul, et le journal doit le dire. »"; },
		entre: function(premier){ return premier ? "Mary tapote l'automate, qui tourne seul désormais. « Éprouve-le : sudo systemctl kill -s KILL allumeur. S'il revient, le journal le dira. »" :
			"« Il revient seul. Mais sa feuille de route n'est pas complète : User, ExecStart, Restart, WantedBy, enable --now. »"; },
		erreur: function(){
			var e = etatUnite(H6, "allumeur.service");
			if (!aFait("m6_unite") && F6("/etc/systemd/system/allumeur.service") && !allumeurUniteOkCh6()) return "Mary relit ta feuille. « Il manque quelque chose : User=allumeur, ExecStart=/opt/lumen/allumeur --port 8080, Restart=on-failure, et WantedBy=multi-user.target dans [Install]. »";
			if (!aFait("m6_unite") && allumeurUniteOkCh6() && e.echec) return "« Il a échoué au démarrage : regarde son journal. Si le port est pris, c'est l'ancien allumeur, lancé à la main (pgrep -a allumeur). »";
			if (!aFait("m6_unite") && e.actif && !e.enabled) return "« Il tourne, mais il ne redémarrera pas au réveil : enable. »";
			return null;
		},
		fin: function(){ return "Mary regarde les réverbères de la place s'allumer seuls, un à un. « Les automates ont leur feuille de route.\n\n" +
			"Un service d'école tournait depuis deux ans dans un screen, sur le compte d'un stagiaire parti depuis. Le jour où son compte a été supprimé, le service est mort avec. " +
			"Personne ne savait comment le relancer. Une unité systemd, c'est aussi la documentation de la façon dont on lance un programme. »"; }
	},
	memoires: { nom: "Betty", q: "memoires",
		metier: "Le métier : une sauvegarde se juge à la restauration. Celle qu'on n'a jamais restaurée, on ne sait pas si elle existe.",
		entree: function(){ return "Betty allume une bougie devant une niche vide. « Chaque nuit, on devait ranger ici une copie de la cité. Personne n'a jamais vérifié. Et cette nuit, personne n'a rien rangé. »"; },
		image: function(){ return "« Une sauvegarde, c'est une copie datée, faite sans qu'on y pense : un service qui la fabrique (Type=oneshot, il s'exécute puis s'arrête), et un réveil qui le lance chaque nuit (un timer, OnCalendar). " +
			"Persistent=true : si la machine dormait à l'heure dite, la copie se fait au réveil. Et une sauvegarde ne vaut que si on l'a restaurée : on extrait ailleurs, et on compare. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  sauvegarde.service : [Service] Type=oneshot ; ExecStart=/usr/local/bin/sauvegarde.sh\n" +
			"  sauvegarde.timer   : [Timer] OnCalendar=*-*-* 02:00 ; Persistent=true ; [Install] WantedBy=timers.target\n" +
			"  sudo systemctl daemon-reload ;  sudo systemctl enable --now sauvegarde.timer ;  systemctl list-timers\n" +
			"  systemd-analyze calendar '*-*-* 02:00'          quand sonnera-t-il ?\n" +
			"  sudo systemctl start sauvegarde                  une copie, tout de suite\n" +
			"  tar tzf ARCHIVE ;  sudo tar xzf ARCHIVE -C /tmp/restauration\n" +
			"  diff -r ORIGINAL COPIE                           rien : identiques\n" +
			"  rsync -an SOURCE/ CIBLE/ ;  rsync -a SOURCE/ CIBLE/      à blanc, puis pour de vrai »"; },
		mission: function(){ return "« Ta mission : une sauvegarde chaque nuit à 2 h, programmée et persistante. Puis la prouver : lance-la, restaure-la dans /tmp/restauration, et compare avec les originaux. »"; },
		entre: function(premier){ return premier ? "Betty pose la bougie devant la niche. « Elle sera faite chaque nuit. Maintenant, prouve-la : start, tar xzf -C /tmp/restauration, diff -r. »" :
			"« Restaurée et comparée : bien. Mais rien ne la refera demain : un service oneshot et son timer. »"; },
		erreur: function(){
			if (!aFait("m6_timer") && F6("/etc/systemd/system/sauvegarde.timer") && !sauvegardeUnitesOkCh6()) return "Betty relit les deux fichiers. « Type=oneshot et ExecStart=/usr/local/bin/sauvegarde.sh pour le service ; OnCalendar et Persistent=true pour le timer. »";
			if (!aFait("m6_timer") && sauvegardeUnitesOkCh6() && !etatUnite(H6, "sauvegarde.timer").enabled) return "« Les deux fichiers sont justes. C'est le timer qu'on active : sudo systemctl enable --now sauvegarde.timer. »";
			if (!aFait("m6_restauration") && archivesSauvegardeCh6().length && !restaurationPresenteCh6()) return "« L'archive existe. Extrais-la dans /tmp/restauration (tar xzf ... -C), puis compare. »";
			return null;
		},
		fin: function(){ return "Betty range une copie dans la niche, et la flamme se redresse. « La cité se souvient.\n\n" +
			"Une école a perdu un serveur, un matin. Les sauvegardes tournaient tous les soirs depuis trois ans. On a voulu restaurer : les archives étaient vides, " +
			"le script écrivait dans un dossier qui n'existait plus. Trois ans de sauvegardes, zéro octet. Depuis, je restaure une fois par mois, juste pour voir. »"; }
	},
	observatoire: { nom: "Donald", q: "observatoire",
		metier: "Le métier : on mesure avant de croire, et on garde les mesures. La charge se lit face aux cœurs, l'occupation d'un disque face à son %util, et le temps de réponse au chronomètre.",
		entree: function(){ return "Donald a l'œil vissé à une lunette braquée sur le Cœur. « Ici, on ne répare rien. On mesure. Et ce que je mesure cette nuit ne me plaît pas : 4,91 secondes pour une page. »"; },
		image: function(){ return "« Mes instruments : la charge (uptime), face au nombre de cœurs (nproc) ; l'occupation des disques (iostat -x, la colonne %util) ; l'histoire de la machine, relevée toutes les dix minutes (sar) ; " +
			"le résumé des connexions (ss -s). Et le chronomètre de la cité : combien de temps la page met à répondre (curl -w). Cette nuit, j'ai noté 4,91 secondes. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  uptime ;  nproc                       la charge sur 1, 5, 15 minutes ; le nombre de cœurs\n" +
			"  iostat -x 1 3                         chaque disque : %util, temps d'attente\n" +
			"  sar -u ;  sar -r ;  sar -q            l'histoire : processeur, mémoire, charge\n" +
			"  ss -s                                 le résumé des connexions\n" +
			"  curl -o /dev/null -s -w '%{time_total}\\n' http://lumen/      le temps de réponse, en secondes\n" +
			"  ... >> ~/carnet.txt                   noter la mesure dans ton carnet\n\n" +
			"Une mesure qu'on n'a pas notée n'existe pas. »"; },
		mission: function(){ return "« Ta mission : relève mes cinq instruments sur lumen. Puis chronomètre la cité : elle doit répondre en moins d'une demi-seconde, et pour ça, il faut que les Docks respirent et que l'engrenage fou de la Tour se taise. Note ta mesure dans ton carnet (~/carnet.txt, sur lumen), et garde la mienne pour ton rapport. »"; },
		entre: function(premier){ return premier ? "Donald prend des notes. « Les instruments sont relevés. Maintenant le chronomètre : curl -w, et le carnet. Tant que /var est plein, la page mettra quatre secondes. »" :
			"« La mesure est notée. Relève aussi mes instruments : uptime, nproc, iostat -x, sar, ss -s. »"; },
		erreur: function(){
			if (!aFait("m6_latence") && ETATS_CH6.m6_latence() && !carnetOkCh6()) return "Donald tend son carnet. « La cité répond vite, mais ta mesure n'est notée nulle part : ajoute-la à ~/carnet.txt (sur lumen), avec >>. »";
			if (!aFait("m6_latence") && (etatMachine(H6).mesuresCurl || []).length > 1 && varPleinCh6()) return "« Tant que /var est plein, la cité répond en quatre secondes et une erreur 503. Les Docks d'abord. »";
			if (!aFait("m6_latence") && !ETATS_CH6.m6_latence() && (etatMachine(H6).mesuresCurl || []).length > 1 && procCh6("export-registre")) return "« Mieux, mais pas encore : l'engrenage fou de la Tour de l'Horloge mange le processeur, et la page attend son tour. Arrête-le, puis remesure. »";
			return null;
		},
		fin: function(){ return "Donald recule de sa lunette. « La cité répond en moins d'une demi-seconde. Je l'écris.\n\n" +
			"Un jour, une équipe a passé une semaine à optimiser du code parce que « le site était lent ». Personne n'avait mesuré. Le disque était à 100 % d'occupation : " +
			"une sauvegarde mal planifiée tournait en pleine journée. Une ligne de iostat aurait suffi. »"; }
	},
	puits: { nom: "Dorothy", q: "puits",
		metier: "Le métier : un RAID protège d'une panne de disque, pas d'une erreur humaine. Et SMART prévient souvent avant la panne : encore faut-il le lire.",
		entree: function(){ return "Dorothy remonte un seau à moitié vide. « Deux sources jumelles, pour que la cité boive même si l'une tarit. L'une s'est tarie cette nuit. L'autre fatigue. »"; },
		image: function(){ return "« Le Puits, c'est un miroir (RAID 1) : deux disques qui portent les mêmes données. Si l'un meurt, l'autre continue seul : le miroir est dégradé ([_U] dans /proc/mdstat). " +
			"On retire le disque mort (--fail, --remove), on ajoute le neuf (--add), et le miroir se reconstruit en recopiant tout. Et chaque disque tient son carnet de santé (SMART) : " +
			"les secteurs réalloués (Reallocated_Sector_Ct) sont des cicatrices ; quand leur nombre grimpe, le disque prépare sa mort. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  cat /proc/mdstat                               l'état du miroir ([UU] : sain, [_U] : dégradé), la reconstruction\n" +
			"  sudo mdadm --detail /dev/md0                   le détail : faulty, active, spare\n" +
			"  sudo mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1     retirer le mort\n" +
			"  sudo mdadm /dev/md0 --add /dev/sdd1            ajouter le neuf\n" +
			"  sudo mdadm --examine /dev/sdc1                 la carte d'un membre\n" +
			"  sudo smartctl -H /dev/sdb ;  sudo smartctl -a /dev/sdc       le verdict ; tout le carnet de santé\n\n" +
			"Ne retire jamais le dernier disque vivant d'un miroir. »"; },
		mission: function(){ return "« Ta mission : remplacer la source tarie par la neuve, et suivre la reconstruction jusqu'au bout ([UU]). Puis lire la santé des deux vieux disques : celui qui est mort, et celui qui va mourir. Ce dernier doit figurer dans ton rapport. »"; },
		entre: function(premier){ return premier ? "Dorothy écoute l'eau couler des deux sources. « Le miroir est entier. Maintenant, la santé : smartctl -H sur sdb, smartctl -a sur sdc. »" :
			"« Tu as lu leur santé. Mais le miroir boite encore : retire sdb1, ajoute sdd1, et suis /proc/mdstat. »"; },
		erreur: function(){
			var r = (etatMachine(H6).raid || [])[0];
			if (!aFait("m6_raid") && r && r.reconstruction) return "Dorothy montre le seau qui se remplit lentement. « La reconstruction avance : relis /proc/mdstat dans quelques commandes. »";
			if (!aFait("m6_raid") && r && r.membres.some(function(m){ return m.dev === "sdb1" && m.etat === "faulty"; }) && r.membres.some(function(m){ return m.dev === "sdd1"; })) return "« Le neuf est là, mais le mort aussi : --remove /dev/sdb1. »";
			return null;
		},
		fin: function(){ return "Dorothy remplit un seau à ras bord, des deux sources à la fois. « Le Puits chante de nouveau.\n\n" +
			"J'ai vu un RAID dégradé tourner six mois sur un seul disque, sans que personne lise l'alerte. Le second disque est mort un dimanche. " +
			"Ce n'était pas une panne : c'était deux pannes, à six mois d'écart, et une alerte qu'on avait le temps de lire. »"; }
	},
	thermes: { nom: "Ruth", q: "thermes",
		metier: "Le métier : on ne répare jamais un système de fichiers monté. On démonte (en trouvant qui le tient), on vérifie, on remonte.",
		entree: function(){ return "Ruth montre une grille fermée devant les bassins. « Une fissure est apparue cette nuit. Depuis, les Thermes se regardent, mais personne ne peut plus s'y baigner. »"; },
		image: function(){ return "« Quand le noyau trouve une incohérence dans un système de fichiers ext4, il le remonte en lecture seule pour ne rien aggraver (errors=remount-ro). Tout ce qui écrit échoue : Read-only file system. " +
			"Pour réparer, il faut e2fsck, sur le volume DÉMONTÉ : le vérifier pendant que quelqu'un s'y baigne l'abîmerait. Et pour démonter, il faut que tout le monde sorte : fuser et lsof disent qui reste. " +
			"tune2fs, lui, règle le bassin : tous les combien on le vérifie, et quelle part reste réservée au gardien (root). »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  mount | grep archives ;  sudo dmesg -T | grep EXT4       la lecture seule ; l'erreur de la nuit\n" +
			"  sudo fuser -vm /srv/archives ;  sudo lsof +D /srv/archives     qui y travaille\n" +
			"  sudo systemctl stop SERVICE ;  sudo umount /srv/archives\n" +
			"  sudo e2fsck -f -y /dev/md0                 vérifier, et réparer sans demander\n" +
			"  sudo mount /srv/archives                   remonter (fstab dit comment)\n" +
			"  sudo tune2fs -l /dev/md0                   Mount count, Maximum mount count, Reserved block count\n" +
			"  sudo tune2fs -c 30 /dev/md0 ;  sudo tune2fs -m 1 /dev/md0      une vérification tous les 30 montages ; 1 % réservé »"; },
		mission: function(){ return "« Ta mission : réparer les archives (démonter, e2fsck, remonter en écriture, sans erreur). Puis régler le bassin : une vérification tous les trente montages au plus, et 1 % de réserve seulement (sur 500 Go, 5 % c'est beaucoup). »"; },
		entre: function(premier){ return premier ? "Ruth ouvre la grille. « On peut de nouveau s'y baigner. Maintenant, règle le bassin : tune2fs -l, puis -c 30 et -m 1. »" :
			"« Le bassin est réglé. Mais il est toujours fermé : démonte, e2fsck -f -y, remonte. »"; },
		erreur: function(){
			var f = systemesMachine(H6).filter(function(x){ return x.source === "/dev/md0"; })[0];
			if (!aFait("m6_fsck") && f && !f.cible && !f.erreurs) return "Ruth sourit. « Réparé. Il ne reste qu'à le remonter : sudo mount /srv/archives, et à relancer l'archiviste. »";
			if (!aFait("m6_fsck") && f && f.cible && f.erreurs && f.ro === false) return "« Tu l'as rouvert en écriture sans le réparer : les erreurs sont toujours là. Démonte, et e2fsck. »";
			return null;
		},
		fin: function(){ return "Ruth plonge la main dans l'eau tiède. « Les Thermes sont rouverts.\n\n" +
			"Un administrateur pressé a lancé fsck sur un disque monté, en se disant que ce serait plus rapide. Il a transformé une petite incohérence en un dossier entier de fichiers orphelins dans lost+found. " +
			"Démonter prend une minute. Ne pas démonter peut prendre une semaine. »"; }
	},
	marche: { nom: "Charles", q: "marche",
		metier: "Le métier : une mise à jour interrompue se reprend là où elle s'est arrêtée, avant toute autre. Et une mise à jour de bibliothèque n'est finie que quand les services qui l'utilisent ont été relancés.",
		entree: function(){ return "Charles redresse un étal renversé. « Une livraison s'est arrêtée au milieu de l'allée cette nuit : la machine a manqué de place pendant la mise à jour. Depuis, plus personne ne peut rien acheter. »"; },
		image: function(){ return "« Le Marché, ce sont les paquets : apt les achète, dpkg les installe et les configure. Si la livraison s'arrête au milieu, dpkg refuse tout le reste tant qu'on ne l'a pas finie (dpkg was interrupted). " +
			"Puis il faut réparer les dépendances cassées. Certaines marchandises ne doivent pas changer sans qu'on le décide (la base de données) : on les épingle (hold). " +
			"Et une bibliothèque neuve ne sert à rien tant que les programmes tournent avec l'ancienne en mémoire : needrestart dit lesquels relancer. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  sudo dpkg --configure -a              finir la livraison interrompue\n" +
			"  sudo apt --fix-broken install         réparer les dépendances\n" +
			"  sudo apt update ;  apt list --upgradable     relire les dépôts ; ce qui attend\n" +
			"  sudo apt-mark hold lumen-base ;  apt-mark showhold      épingler ; voir les épinglés\n" +
			"  apt policy PAQUET ;  apt-cache depends PAQUET          versions ; dépendances\n" +
			"  cat /var/run/reboot-required ;  uname -r              un noyau neuf attend un redémarrage\n" +
			"  sudo needrestart -r l                 les services à relancer (sans rien faire) »"; },
		mission: function(){ return "« Ta mission : remettre apt d'aplomb (la livraison finie, les dépendances réparées, les dépôts relus, la liste de ce qui attend). Puis épingler la base, lire l'avis de redémarrage, et relancer les services qui tournent encore avec l'ancienne bibliothèque. »"; },
		entre: function(premier){ return premier ? "Charles range ses étals. « Le Marché rouvre. Maintenant : apt-mark hold sur la base, reboot-required, needrestart, et relance ce qu'il dit. »" :
			"« La base est épinglée. Mais apt est toujours bloqué : dpkg --configure -a, d'abord. »"; },
		erreur: function(){
			var d = paquetsMachine(H6);
			if (!aFait("m6_dpkg") && !d.interrompu && (d.aConfigurer || []).length) return "Charles montre un carton encore fermé. « La livraison est reprise, mais un paquet attend une dépendance : sudo apt --fix-broken install. »";
			if (!aFait("m6_hold") && aRedemarrerCh6().length && vu("needrestart")) return "« needrestart te l'a dit : " + aRedemarrerCh6().join(", ") + " tournent avec l'ancienne bibliothèque. Relance-les. »";
			return null;
		},
		fin: function(){ return "Charles rouvre son étal, et les clients reviennent. « Le Marché est ouvert.\n\n" +
			"Une faille de sécurité dans une bibliothèque : l'équipe a mis à jour tout le parc en une heure, fière d'elle. Une semaine plus tard, un audit a montré que la moitié des services tournaient encore avec l'ancienne version. " +
			"Personne ne les avait relancés. La mise à jour, c'est le paquet ET le redémarrage. »"; }
	},
	labyrinthe: { nom: "John", q: "labyrinthe",
		metier: "Le métier : un service en échec se comprend dans son journal, pas en le relançant dix fois. Et un démarrage lent se mesure (systemd-analyze) avant de se corriger.",
		entree: function(){ return "John est assis devant une porte qui ne s'ouvre pas, au milieu des couloirs. « Celle-ci attend une porte qui n'existe pas. Et là-bas, une autre fait patienter tout le monde à chaque réveil. »"; },
		image: function(){ return "« Les services s'attendent les uns les autres : Requires= dit « je ne démarre pas sans lui », After= dit seulement « après lui ». " +
			"Une seule lettre fausse dans un Requires=, et le service ne démarrera jamais : il attend une porte qui n'existe pas. " +
			"Et au démarrage, un service lent retarde tout ce qui vient après lui : systemd-analyze blame les classe, critical-chain montre la chaîne qui attend. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  systemctl --failed                            les services en échec\n" +
			"  sudo journalctl -b -p err ;  sudo journalctl -k    les erreurs de ce démarrage ; le noyau\n" +
			"  systemctl list-dependencies SERVICE           l'arbre de ses dépendances\n" +
			"  sudo cp /lib/systemd/system/X.service /etc/systemd/system/      une copie à soi (elle passe avant celle du paquet)\n" +
			"  sudo systemctl daemon-reload ;  sudo systemctl start SERVICE ;  sudo systemctl reset-failed\n" +
			"  systemd-analyze ;  systemd-analyze blame ;  systemd-analyze critical-chain\n" +
			"  [Service] TimeoutStartSec=10                  ne pas attendre 90 s ; ou disable, s'il ne sert plus »"; },
		mission: function(){ return "« Ta mission : comprendre pourquoi la gazette ne démarre pas, la réparer, et qu'il ne reste plus un seul service en échec. Puis trouver qui fait attendre la cité à chaque réveil, et l'empêcher de recommencer. »"; },
		entre: function(premier){ return premier ? "John franchit la porte. « Plus un échec. Maintenant, le réveil : systemd-analyze blame, critical-chain, et règle le retardataire. »" :
			"« Le réveil est rapide. Mais un service est toujours en échec : systemctl --failed, son journal, ses dépendances. »"; },
		erreur: function(){
			var g = etatUnite(H6, "lumen-gazette.service");
			if (!aFait("m6_failed") && g.actif && echecsCh6().length) return "John montre la liste. « La gazette tourne, mais systemd se souvient de l'échec : sudo systemctl reset-failed. »";
			if (!aFait("m6_failed") && dependancesManquantes(H6, "lumen-gazette.service").length === 0 && !g.actif) return "« La dépendance est juste. Il reste à le démarrer : daemon-reload, puis start. »";
			return null;
		},
		fin: function(){ return "John laisse toutes les portes ouvertes derrière lui. « On ne se perd plus dans le Labyrinthe.\n\n" +
			"Un serveur mettait quatre minutes à démarrer. On a acheté des disques plus rapides. Il mettait toujours quatre minutes. " +
			"systemd-analyze blame a pris deux secondes : un service attendait un partage réseau supprimé depuis un an, avec un délai de 90 secondes, deux fois. »"; }
	},
	limites: { nom: "Kay", q: "limites",
		metier: "Le métier : les limites d'un service vivent dans son unité systemd (LimitNOFILE, CPUQuota, MemoryMax). ulimit dans ton shell ne change que ton shell.",
		entree: function(){ return "Kay pose un doigt sur ses lèvres, entre deux rayonnages. « Un lecteur étouffe : il n'a droit qu'à mille livres ouverts, et il lui en faut deux mille. Un autre prend toute la lumière de la salle. »"; },
		image: function(){ return "« Chaque processus a des limites : combien de fichiers ouverts à la fois (nofile), par exemple. Les connexions réseau en sont aussi : un serveur très demandé dépasse vite mille. " +
			"Au-delà : Too many open files. Les limites d'un service se règlent dans son unité, pas dans le shell. " +
			"Et les groupes de contrôle (cgroups) donnent à chaque service une part de la machine : CPUQuota=50% (une demi-lampe), MemoryMax (une étagère). »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  sudo journalctl -u lumen-catalogue             « Too many open files »\n" +
			"  ulimit -n ;  ulimit -a                         TES limites (pas celles du service)\n" +
			"  cat /proc/PID/limits                           les limites du processus (Max open files)\n" +
			"  sudo ls /proc/PID/fd | wc -l ;  sudo lsof -p PID | wc -l      combien il en a d'ouverts\n" +
			"  [Service] LimitNOFILE=65536                    dans un drop-in, puis daemon-reload et restart\n" +
			"  systemd-cgtop                                  la part de chaque service\n" +
			"  sudo systemctl set-property SERVICE CPUQuota=50% MemoryMax=2G\n" +
			"  systemctl show -p CPUQuotaPerSecUSec,MemoryMax SERVICE »"; },
		mission: function(){ return "« Ta mission : que le catalogue respire (au moins 4096 fichiers ouverts, appliqué et vérifié). Puis que l'indexeur n'ait plus qu'une demi-lampe (CPUQuota 50 % au plus) et une étagère (MemoryMax). »"; },
		entre: function(premier){ return premier ? "Kay sourit : le catalogue tourne ses pages sans s'arrêter. « Maintenant l'indexeur : systemd-cgtop, set-property, show -p. »" :
			"« L'indexeur a sa part. Mais le catalogue étouffe toujours : /proc/PID/limits, puis LimitNOFILE dans son unité. »"; },
		erreur: function(){
			var p = principalCh6("lumen-catalogue.service");
			if (!aFait("m6_ulimit") && vu("ulimitShell") && p && (p.limiteNofile || 0) < 4096) return "Kay secoue la tête. « ulimit n'a changé que ton shell. Le catalogue est lancé par systemd : sa limite est dans son unité (LimitNOFILE). »";
			if (!aFait("m6_ulimit") && limitesDepuisDirectives(directivesMachine(H6, "lumen-catalogue.service")).nofile >= 4096 && p && (p.limiteNofile || 0) < 4096) return "« La limite est écrite et relue, mais le catalogue tourne toujours avec l'ancienne : restart. »";
			return null;
		},
		fin: function(){ return "Kay rallume les lampes de la salle de lecture. « Chacun ses livres, chacun sa part de lumière.\n\n" +
			"Un site de billetterie s'effondrait à chaque ouverture des ventes : Too many open files. On a doublé les serveurs. Ils s'effondraient deux fois plus vite. " +
			"La limite était restée à 1024 dans l'unité du service. Une ligne, LimitNOFILE, et le même serveur tenait la charge. »"; }
	},
	guetteur: { nom: "Klara", q: "guetteur",
		metier: "Le métier : strace montre ce qu'un programme demande au noyau. Quand il ne dit rien, il attend : un connect, un read, un verrou. Et une opération longue se lance toujours dans tmux.",
		entree: function(){ return "Klara, au sommet de la tour, tient l'oreille collée à un cornet de cuivre. « J'écoute ce que les programmes demandent au noyau, appel par appel. Le messager attend une réponse depuis des heures. Écoute avec moi. »"; },
		image: function(){ return "« Un programme qui ne répond plus n'est pas forcément mort : il attend peut-être. ps le dit (l'état S, le canal d'attente WCHAN). strace écoute ses appels au noyau : " +
			"s'il est bloqué sur connect, il attend une machine qui ne répond pas. Reste à savoir laquelle : getent hosts demande au système l'adresse d'un nom, comme le ferait le programme. " +
			"Et pour une longue recopie, une session qui survit à la déconnexion : tmux garde ton terminal ouvert sur la machine, même quand tu t'en vas. »"; },
		syntaxe: function(){ return "« Sur lumen :\n\n" +
			"  ps -o pid,stat,wchan,cmd -C NOM               l'état et ce qu'il attend\n" +
			"  sudo strace -p PID                            ses appels au noyau, en direct\n" +
			"  sudo lsof -p PID ;  cat /proc/PID/status      ses fichiers et connexions ; sa fiche\n" +
			"  getent hosts NOM                              l'adresse d'un nom, comme le système la trouve\n" +
			"  tmux new -s NOM ;  tmux detach ;  tmux ls ;  tmux attach -t NOM\n" +
			"  nohup COMMANDE &                              l'autre façon de survivre à la déconnexion\n" +
			"  watch -n 2 COMMANDE                           relancer une commande toutes les 2 secondes »"; },
		mission: function(){ return "« Ta mission : comprendre ce que le messager attend, et lui donner la bonne adresse (le registre a déménagé dans le Cœur), puis le relancer. Ensuite, lance la longue recopie des registres de façon qu'elle survive à ta déconnexion : déconnecte-toi pour de vrai pendant qu'elle tourne, et retrouve-la. »"; },
		entre: function(premier){ return premier ? "Klara repose son cornet. « Le messager parle de nouveau. Maintenant la recopie : tmux new, la commande, detach, exit, et reviens la voir. »" :
			"« La recopie a survécu. Mais le messager attend toujours : ps, strace -p, getent hosts. »"; },
		erreur: function(){
			if (!aFait("m6_strace") && messagerJoignableCh6() && principalCh6("lumen-messager.service") && principalCh6("lumen-messager.service").strace) return "Klara sourit. « La bonne adresse est écrite, mais le messager l'a lue au démarrage : relance-le. »";
			if (!aFait("m6_tmux") && copieFinieCh6() && !vu("deconnexionCopie")) return "« Elle a fini, mais tu ne t'es pas déconnecté pendant qu'elle tournait : l'épreuve, c'est exit au milieu. Relance-la, et pars. »";
			return null;
		},
		fin: function(){ return "Klara laisse le cornet se taire. « Tout le monde parle à qui il faut.\n\n" +
			"Une migration de base de données de six heures, lancée sur une connexion SSH depuis un train. Tunnel, coupure, migration tuée à 80 %. " +
			"Il a fallu restaurer et recommencer, de nuit. tmux, c'est trois secondes de plus au début, et le droit de perdre sa connexion. »"; }
	}
};

/* Les gardiens dans leurs quartiers, avec leurs sorts et leurs défis. */
Object.keys(GARDIENS_LUMEN).forEach(function(cle){
	var g = GARDIENS_LUMEN[cle], q = quartierCh6(cle);
	g.item = new Item(g.nom, "", "item_" + g.nom.toLowerCase() + ".gif").personnage();
	if (SORTS_DES_QUARTIERS[cle].length) g.item.enseigne.apply(g.item, SORTS_DES_QUARTIERS[cle]);
	g.item.revele.apply(g.item, idsDefisQuartier(cle));
	texteVivant(g.item, function(){ return texteGardienLumen(g); });
	q.lieu.addItem(g.item);
});
LaurentLumen.revele("s_m6_avant_midi", "s_m6_sans_indice");
HorlogeLumen.revele("s_m6_avant_midi");

/* ------------------------------------------------------------------ */
/* Le bestiaire de Lumen                                               */
/* ------------------------------------------------------------------ */

var BestiaireLumen = new Item("Bestiaire",
	"LE BESTIAIRE DE LUMEN : l'image de la cité, puis le vrai mot du métier.\n\n" +
	"Le Cœur de Lumen               le serveur de production (la machine lumen)\n" +
	"Le Phare de Lumen              un tableau de santé du serveur (ici, la commande du jeu lanterne)\n" +
	"Les Docks pleins               un système de fichiers plein (df, du, ncdu, find -size)\n" +
	"La caisse jetée mais tenue      un fichier effacé encore ouvert (lsof +L1)\n" +
	"Les fiches des Archives        les inodes (df -i, stat -c %i)\n" +
	"Le ménage des fiches           systemd-tmpfiles et /etc/tmpfiles.d\n" +
	"Les rouleaux de la Gazette     la rotation des journaux (logrotate) et le journal de systemd (journald)\n" +
	"Le charbon des Forges          la mémoire (free, vmstat, /proc/meminfo)\n" +
	"Le fourneau qui dévore         une fuite de mémoire, l'OOM killer\n" +
	"La ration d'un fourneau        une limite de groupe de contrôle (MemoryMax)\n" +
	"Le charbon de secours          l'espace d'échange (swap, swappiness)\n" +
	"L'engrenage fou                un processus qui monopolise le processeur (top, renice, kill)\n" +
	"Les spectres de l'escalier     les processus zombies (état Z, <defunct>), libérés par leur parent\n" +
	"Les Citernes et la réserve     LVM : volumes physiques, groupe, volumes logiques (lvextend, resize2fs)\n" +
	"La photo de la cuve            un instantané LVM (lvcreate -s)\n" +
	"La liste de la Porte du Matin  /etc/fstab, les UUID, nofail, findmnt --verify\n" +
	"La feuille de route            une unité systemd (.service), Restart=\n" +
	"Le réveil de la Crypte         un timer systemd (OnCalendar, Persistent)\n" +
	"La copie relue                 une restauration de sauvegarde vérifiée (tar, diff -r)\n" +
	"Les instruments de Donald      les mesures (uptime, iostat, sar, ss, curl -w)\n" +
	"Les deux sources du Puits      le RAID 1 logiciel (mdadm, /proc/mdstat)\n" +
	"Le carnet de santé             SMART (smartctl, Reallocated_Sector_Ct)\n" +
	"Les Thermes fermés             un système de fichiers en lecture seule, réparé par e2fsck\n" +
	"Le réglage du bassin           tune2fs (vérifications, réserve)\n" +
	"La livraison interrompue       dpkg --configure -a, apt --fix-broken install\n" +
	"La marchandise épinglée        apt-mark hold\n" +
	"La porte qui n'existe pas      une dépendance systemd manquante (Requires=, systemctl --failed)\n" +
	"Celui qui fait attendre        un service lent au démarrage (systemd-analyze blame)\n" +
	"Les livres ouverts             la limite des fichiers ouverts (LimitNOFILE, /proc/PID/limits)\n" +
	"La part de lumière             le quota de processeur d'un groupe de contrôle (CPUQuota)\n" +
	"Le cornet du Guetteur          strace\n" +
	"La session qui survit          tmux, nohup\n" +
	"La Longue Nuit                 un incident en production, qu'on surveille en direct\n" +
	"Le rapport de remise en service    le rapport d'incident : avaries, causes, réparations, mesures, ce qui reste",
	"item_historybook.gif");
HallLumen.addItem(BestiaireLumen);

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts du chapitre                               */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH6 = {
	"ncdu":             { nom: "le Plan des Entrepôts",      image: "Tu vois chaque entrepôt des Docks, du plus lourd au plus léger." },
	"systemd-tmpfiles": { nom: "le Balai des Archives",      image: "Les vieilles fiches partent seules, à l'âge que tu as fixé." },
	"free":             { nom: "le Tas de Charbon",          image: "Tu vois ce qui reste de charbon, et ce qu'on peut reprendre." },
	"vmstat":           { nom: "le Soufflet des Forges",     image: "Seconde par seconde, tu vois la machine échanger avec le disque." },
	"pmap":             { nom: "la Carte du Fourneau",       image: "Tu vois où un processus range sa mémoire." },
	"fallocate":        { nom: "la Pelle de Secours",        image: "Tu creuses d'un coup la place d'un fichier." },
	"mkswap":           { nom: "le Charbon Préparé",         image: "Le fichier devient un tas de charbon de secours." },
	"swapon":           { nom: "le Secours Allumé",          image: "Le tas de secours entre dans le fourneau." },
	"swapoff":          { nom: "le Secours Éteint",          image: "Le tas de secours sort du fourneau." },
	"renice":           { nom: "l'Huile de la Burette",      image: "Tu ralentis un engrenage sans l'arrêter." },
	"nice":             { nom: "l'Engrenage Doux",           image: "Tu lances un engrenage qui cède la place aux autres." },
	"pstree":           { nom: "l'Arbre des Engrenages",     image: "Tu vois qui a lancé qui." },
	"pidof":            { nom: "le Nom de l'Engrenage",      image: "Tu retrouves le numéro d'un programme par son nom." },
	"killall":          { nom: "l'Arrêt Général",            image: "Tu arrêtes tous les engrenages d'un même nom." },
	"pvs":              { nom: "les Sources des Citernes",   image: "Tu vois chaque disque qui verse dans la réserve." },
	"vgs":              { nom: "la Réserve Commune",         image: "Tu vois ce qui reste dans la réserve." },
	"lvs":              { nom: "les Citernes",               image: "Tu vois chaque citerne taillée dans la réserve." },
	"lvextend":         { nom: "la Cuve Élargie",            image: "Tu donnes plus de place à une citerne." },
	"resize2fs":        { nom: "le Niveau Remonté",          image: "Le système de fichiers prend toute la place de sa cuve." },
	"pvcreate":         { nom: "la Source Préparée",         image: "Un disque neuf devient une source pour la réserve." },
	"vgextend":         { nom: "la Réserve Agrandie",        image: "Une source neuve rejoint la réserve commune." },
	"lvcreate":         { nom: "la Cuve Taillée",            image: "Tu tailles une citerne, ou la photo d'une autre." },
	"lvremove":         { nom: "la Cuve Vidée",              image: "Tu rends une citerne à la réserve." },
	"vgdisplay":        { nom: "le Registre de la Réserve",  image: "Tout le détail de la réserve commune." },
	"blkid":            { nom: "les Étiquettes",             image: "Tu lis l'étiquette qui ne change jamais de chaque volume." },
	"lsblk":            { nom: "l'Arbre des Disques",        image: "Tu vois chaque disque, ses partitions, ses volumes." },
	"umount":           { nom: "la Salle Fermée",            image: "Tu fermes une salle, quand plus personne n'y est." },
	"systemd-run":      { nom: "l'Ordre Différé",            image: "Tu confies une tâche à systemd, pour plus tard." },
	"nproc":            { nom: "le Compte des Cœurs",        image: "Tu sais combien de cœurs battent dans la machine." },
	"iostat":           { nom: "la Lunette des Disques",     image: "Tu vois à quel point chaque disque est occupé." },
	"sar":              { nom: "le Registre des Relevés",    image: "Tu relis l'histoire de la machine, dix minutes par dix minutes." },
	"mdadm":            { nom: "la Corde du Puits",          image: "Tu retires une source tarie et tu en ajoutes une neuve." },
	"smartctl":         { nom: "le Carnet de Santé",         image: "Tu lis les cicatrices d'un disque." },
	"e2fsck":           { nom: "la Réparation du Bassin",    image: "Tu répares un système de fichiers, une fois vidé." },
	"fsck":             { nom: "le Contrôle du Bassin",      image: "Le même geste, sous son nom générique." },
	"tune2fs":          { nom: "le Réglage du Bassin",       image: "Tu règles les vérifications et la réserve du gardien." },
	"fuser":            { nom: "Qui Se Baigne",              image: "Tu vois qui travaille encore dans une salle." },
	"apt-mark":         { nom: "l'Épingle du Marché",        image: "Une marchandise ne change plus sans ton accord." },
	"apt-cache":        { nom: "le Catalogue du Marché",     image: "Tu lis ce que chaque marchandise exige." },
	"needrestart":      { nom: "la Cloche du Marché",        image: "Elle sonne pour chaque service qui tourne avec l'ancienne pièce." },
	"ulimit":           { nom: "la Carte de Lecteur",        image: "Tu lis (ou changes) tes propres limites." },
	"systemd-cgtop":    { nom: "les Parts de Lumière",       image: "Tu vois la part de la machine que prend chaque service." },
	"strace":           { nom: "le Cornet du Guetteur",      image: "Tu entends chaque demande d'un programme au noyau." },
	"tmux":             { nom: "la Session Gardée",          image: "Ton terminal reste ouvert sur la machine, même quand tu pars." },
	"screen":           { nom: "la Vieille Session",         image: "L'ancêtre de tmux : une session qui survit, elle aussi." },
	"nohup":            { nom: "Le Sourd au Départ",         image: "Le programme ne s'arrête pas quand tu fermes la porte." },
	"watch":            { nom: "la Ronde du Guetteur",       image: "Tu relances une commande toutes les deux secondes." }
};
var NOM_RPG_AVANT_LUMEN = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 7 && SORTS_RPG_CH6[sort]) return SORTS_RPG_CH6[sort].nom;
	return NOM_RPG_AVANT_LUMEN(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre : un par quartier, le Phare, la Nuit, le Rapport, midi, et le platine */
/* ------------------------------------------------------------------ */

var TROPHEES_CH6 = {
	quartier_docks:        ["les Docks Dégagés", "df -h, du -sh /var/* | sort -h, ncdu, find -size : trouver ce qui remplit /var ; lsof +L1 et systemctl restart pour le fichier effacé encore ouvert."],
	quartier_archives:     ["les Fiches Rendues", "df -i compte les inodes ; find -type f -mmin +60 -delete retire les vieilles sessions ; /etc/tmpfiles.d et systemd-tmpfiles --clean pour que le ménage se fasse seul."],
	quartier_gazette:      ["la Gazette Reliée", "/etc/logrotate.d (daily, rotate, compress, missingok, notifempty, maxsize), logrotate -d puis -f ; journalctl --disk-usage, --vacuum-size, SystemMaxUse."],
	quartier_forges:       ["les Forges Rationnées", "free -h (available), vmstat, dmesg | grep -i oom ; MemoryMax dans l'unité ; fallocate, chmod 600, mkswap, swapon, fstab ; vm.swappiness."],
	quartier_horloge:      ["l'Horloge Remontée", "uptime face à nproc, top -b, ps --sort=-%cpu ; renice +19 avant kill ; les zombies se libèrent par leur parent (ps -o ppid=)."],
	quartier_citernes:     ["les Citernes à Niveau", "pvs, vgs, lvs ; lvextend puis resize2fs (ou lvextend -r), à chaud ; un instantané (lvcreate -s) avant l'opération risquée, retiré après."],
	quartier_porte:        ["la Porte Ouverte", "findmnt --verify, blkid pour le vrai UUID, nofail pour l'amovible, daemon-reload ; mount -a pour tout monter tout de suite."],
	quartier_ateliers:     ["l'Automate en Service", "Une unité écrite à la main : User, ExecStart, Restart=on-failure, WantedBy ; daemon-reload, enable --now ; éprouvée par systemctl kill -s KILL."],
	quartier_memoires:     ["la Mémoire Prouvée", "Un service oneshot et son timer (OnCalendar, Persistent) ; la sauvegarde lancée, restaurée ailleurs (tar xzf -C), comparée (diff -r)."],
	quartier_observatoire: ["l'Observatoire Éveillé", "uptime et nproc, iostat -x, sar, ss -s ; curl -w '%{time_total}' pour le temps de réponse, noté dans un carnet."],
	quartier_puits:        ["les Deux Sources", "/proc/mdstat et mdadm --detail ; --fail, --remove, --add, la reconstruction suivie ; smartctl -H et -a, Reallocated_Sector_Ct."],
	quartier_thermes:      ["les Thermes Rouverts", "La lecture seule (mount, dmesg), fuser pour démonter, e2fsck -f -y sur le volume démonté, puis remonté ; tune2fs -l, -c, -m."],
	quartier_marche:       ["le Marché Rouvert", "dpkg --configure -a, apt --fix-broken install, apt update ; apt-mark hold, reboot-required, needrestart et les services relancés."],
	quartier_labyrinthe:   ["le Labyrinthe Déjoué", "systemctl --failed, journalctl -b -p err, list-dependencies, la dépendance réparée, reset-failed ; systemd-analyze blame et critical-chain."],
	quartier_limites:      ["les Parts Justes", "/proc/PID/limits, /proc/PID/fd ; LimitNOFILE dans l'unité ; systemd-cgtop, set-property CPUQuota et MemoryMax, show -p."],
	quartier_guetteur:     ["le Guetteur Attentif", "ps -o stat,wchan, strace -p (bloqué sur connect), getent hosts, la conf corrigée ; tmux new, detach, attach : une opération qui survit."],
	m6_lanterne:           ["le Phare Consulté", "On mesure l'état d'un serveur avant d'agir : sans point de départ, on ne prouve rien."],
	m6_nuit:               ["la Nuit Tenue", "Pendant un incident, on surveille en direct (uptime, free, top, journalctl -f), puis on répare, avarie par avarie."],
	m6_rapport:            ["le Rapport Contresigné", "Un rapport de remise en service : avaries, causes, réparations, mesures avant et après, ce qui reste à faire."],
	s_m6_avant_midi:       ["Midi Devancé", "Les seize quartiers rallumés avant midi : on répare avant l'incident, pas pendant."]
};
var COMPETENCES_CH6 = {
	quartier_docks: "Disque plein", quartier_archives: "Inodes et nettoyage", quartier_gazette: "Rotation des journaux", quartier_forges: "Mémoire et échange",
	quartier_horloge: "Processus et zombies", quartier_citernes: "Volumes LVM", quartier_porte: "fstab et montages", quartier_ateliers: "Unités systemd",
	quartier_memoires: "Sauvegarde et restauration", quartier_observatoire: "Mesures de performance", quartier_puits: "RAID et SMART", quartier_thermes: "Réparer un système de fichiers",
	quartier_marche: "Paquets cassés", quartier_labyrinthe: "Démarrage et dépendances", quartier_limites: "Limites et groupes de contrôle", quartier_guetteur: "strace et tmux",
	m6_lanterne: "État de départ mesuré", m6_nuit: "Incident en direct", m6_rapport: "Rapport de remise en service", s_m6_avant_midi: "Exploitation en temps limité",
	platine_ch6: "Gardien de Lumen"
};
var SIGLES_CH6 = {
	quartier_docks: ["DISK", "argent"], quartier_archives: ["INOD", "argent"], quartier_gazette: ["ROT", "argent"], quartier_forges: ["OOM", "or"],
	quartier_horloge: ["CPU", "argent"], quartier_citernes: ["LVM", "or"], quartier_porte: ["FSTB", "argent"], quartier_ateliers: ["UNIT", "or"],
	quartier_memoires: ["BAK", "or"], quartier_observatoire: ["IO", "bronze"], quartier_puits: ["RAID", "or"], quartier_thermes: ["FSCK", "argent"],
	quartier_marche: ["APT", "argent"], quartier_labyrinthe: ["BOOT", "argent"], quartier_limites: ["CGRP", "argent"], quartier_guetteur: ["TRCE", "bronze"],
	m6_lanterne: ["PHAR", "bronze"], m6_nuit: ["NUIT", "or"], m6_rapport: ["DOC", "or"], s_m6_avant_midi: ["12H", "or"], platine_ch6: ["OPS", "platine"]
};
Object.keys(COMPETENCES_CH6).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH6[id]; });
Object.keys(SIGLES_CH6).forEach(function(id){ if (SIGLES_CH6[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH6[id][1]; });
function badgeCh6Gagne(id){ return /^quartier_/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_LUMEN = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_LUMEN();
	if (state.has("ch6Ouvert") && !state.has("platine_ch6") && Object.keys(TROPHEES_CH6).every(badgeCh6Gagne)){
		state.set("platine_ch6");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch6) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* lanterne : le Phare de Lumen et le plan des seize quartiers         */
/* ------------------------------------------------------------------ */

function texteLanterne(){
	var c = sCh6(), score = scoreLanterneCh6();
	var lignes = [C.gras("LE PHARE DE LUMEN"), C.jaune("commande du jeu, pas Linux (man lanterne)"), C.gris("rouge : le quartier est éteint · vert : il est rallumé · l'état est lu sur la machine lumen"), ""];
	lignes.push("  Il est " + C.gras(heureCh6()) + (c.nuit ? C.gris(" · la Longue Nuit est tombée") : C.gris(" · la Longue Nuit dans " + texteAvantNuit())));
	lignes.push("  Lumière de la cité : " + C.gras(score + " / 100") + (c.scoreDepart !== null && c.scoreDepart !== undefined ? C.gris(" (départ : " + c.scoreDepart + ", objectif : plus de 90 après la Nuit)") : C.gris(" (objectif : plus de 90 après la Nuit)")), "");
	QUARTIERS_CH6.forEach(function(q){
		var ok = quartierAllumeCh6(q.cle), faites = q.etapes.filter(aFait).length, defis = idsDefisQuartier(q.cle).filter(aFait).length;
		var etats = q.etapes.filter(function(id){ try { return ETATS_CH6[id](); } catch (e){ return false; } }).length;
		var avarie = c.avaries && c.avaries[q.cle] && AVARIES_CH6[q.cle] && !AVARIES_CH6[q.cle].reparee();
		lignes.push("  " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(q.nom, 20)) + q.gardien + (current_room === q.lieu ? C.jaune("  ◀ toi") : ""));
		lignes.push("      " + (ok ? C.vert(faites + " sur 2 étapes") : C.gris(faites + " sur 2 étapes")) + C.gris(" · " + etats + " sur 2 réparé" + (etats > 1 ? "s" : "") + " sur la machine · " + defis + " sur 5 défis") + (avarie ? C.rouge(" · avarie de la Nuit : " + AVARIES_CH6[q.cle].phrase) : ""));
	});
	if (c.nuit && !SURPRISE_CH6.reparee()) lignes.push("", "  " + C.rouge("●") + " La place : " + SURPRISE_CH6.phrase);
	if (typeof lumieresAnnexes === "function"){ var la = lumieresAnnexes(7); if (la.length) lignes.push("", C.gras("Les lumières des habitants"), la.map(function(x){ return "  " + C.jaune("✺") + " " + x; }).join("\n")); }
	lignes.push("", "  Quartiers rallumés : " + C.gras(quartiersAllumesCh6().length + " sur 16"));
	var midi = aFait("s_m6_avant_midi") ? C.vert("réussi") : (c.horloge >= MIDI_CH6 ? C.rouge("manqué") : C.jaune("en cours (" + Math.max(0, MIDI_CH6 - c.horloge) + " min)"));
	var hi = aFait("s_m6_sans_indice") ? C.vert("réussi") : (state.malus7 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("Défis d'honneur (Laurent)"), "  Les seize quartiers avant midi : " + midi, "  Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH6).filter(badgeCh6Gagne);
	lignes.push("", C.gras("BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH6).length) + C.gris("  (badges lumen : les leçons)"));
	return lignes.join("\n");
}
Shell.sorts.lanterne = function(args, io){
	if (!state.has("ch6Ouvert")) return "Le Phare de Lumen s'allume avec le chapitre 6, après le Bastion. " + C.gris("(Au Bastion, c'est rempart.)");
	var c = sCh6(), score = scoreLanterneCh6();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = score;
	c.scoreDernier = score;
	if (c.nuit) c.scoreFinalCandidat = score;
	GameEvents.fire({ type: "lanterne", score: score });
	var texte = texteLanterne();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
if (SORTS_DU_JEU.indexOf("lanterne") === -1) SORTS_DU_JEU.push("lanterne");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["lanterne", "le Phare de Lumen : la lumière de la cité et le plan des seize quartiers (chapitre 6)"]);
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.lanterne = "lanterne n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
	"À Lumen (chapitre 6), elle allume le Phare : la lumière de la cité, de 0 à 100, calculée sur l'état RÉEL de la machine lumen,\n" +
	"et le plan des seize quartiers : en rouge ceux qui sont encore éteints, en vert ceux que tu as rallumés (les deux étapes\n" +
	"du gardien faites), avec ce qui est réparé sur la machine, tes défis, l'heure, les avaries de la Longue Nuit,\n" +
	"les lumières des habitants (quêtes annexes) et les défis d'honneur.\n\n  lanterne          le Phare et le plan de Lumen";

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio                     */
/* ------------------------------------------------------------------ */

function verifierLumen(){
	if (!lumenOuvert()) return;
	var c = state.ch6;
	if (!c) return;
	DEFIS_LUMEN.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiLumen(d.id); } });
	if (c.tousAllumes !== undefined && c.tousAllumes < MIDI_CH6) reussirDefiLumen("s_m6_avant_midi");
	if (aFait("m6_rapport") && !state.malus7) reussirDefiLumen("s_m6_sans_indice");
	QUARTIERS_CH6.forEach(function(q){ if (quartierAllumeCh6(q.cle) && !state.has("quartier_" + q.cle)) state.set("quartier_" + q.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH6).forEach(function(id){
		if (!badgeCh6Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	var suivante = QUETES_CH6.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (aFait("m6_entree") && c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "m6_lanterne") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(HallLumen) + "/Radio.)"));
	}
}
var VERIFIER_CH6_AVANT_LUMEN = verifierChapitre6;
verifierChapitre6 = function(){
	VERIFIER_CH6_AVANT_LUMEN();
	verifierLumen();
};

World.fige = true;
