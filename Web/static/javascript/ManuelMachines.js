/**
 * ManuelMachines.js : les pages de manuel des sorts du moteur des machines (chapitre 6), en français.
 * Chaque page dit à quoi sert le sort, ses options courantes, un exemple, et le piège classique.
 * La liste SORTS_MACHINES range ces sorts : tant qu'aucun chapitre ne les enseigne, ils sont hors barème.
 */

MANUEL["ncdu"] = page("voir ce qui remplit un disque, dossier par dossier", "NCurses Disk Usage",
	"ncdu parcourt un dossier et classe ce qu'il contient du plus lourd au plus léger, avec une barre par ligne.\n" +
	"Dans un vrai terminal, il est interactif : les flèches pour se déplacer, Entrée pour descendre, d pour supprimer,\n" +
	"q pour quitter. Ici, il montre son premier écran.\n\n" +
	"  ncdu /var         le contenu de /var, trié par taille\n" +
	"  ncdu -x /         sans traverser les autres systèmes de fichiers montés dessous\n\n" +
	"Le cousin en une ligne : du -h --max-depth=1 /var | sort -h");
MANUEL["pvs"] = page("lister les volumes physiques LVM", "Physical Volume Show",
	"LVM empile trois étages : les volumes physiques (PV, des disques ou des partitions), regroupés en groupes de\n" +
	"volumes (VG), découpés en volumes logiques (LV) qu'on formate et qu'on monte comme des partitions, mais souples.\n\n" +
	"  sudo pvs           chaque PV : son groupe, sa taille (PSize), ce qui reste libre (PFree)\n" +
	"  sudo pvdisplay     le même, en détail");
MANUEL["vgs"] = page("lister les groupes de volumes LVM", "Volume Group Show",
	"  sudo vgs           chaque groupe : nombre de PV et de LV, taille (VSize) et surtout VFree, la place pas encore\n" +
	"                     distribuée, celle qui permet d'agrandir un volume sans rien arrêter\n" +
	"  sudo vgdisplay     le détail (Free PE / Size)");
MANUEL["lvs"] = page("lister les volumes logiques LVM", "Logical Volume Show",
	"  sudo lvs           chaque LV : son groupe, ses attributs, sa taille (LSize) ; un instantané (snapshot) a un\n" +
	"                     s en tête de ses attributs, son origine, et Data% : la part de sa réserve déjà utilisée\n" +
	"  sudo lvdisplay /dev/vg/lv      le détail d'un volume");
MANUEL["lvextend"] = page("agrandir un volume logique", "Logical Volume EXTEND",
	"  sudo lvextend -L +20G /dev/vg_lumen/lv_donnees      20 Gio de plus (pris sur VFree)\n" +
	"  sudo lvextend -L 50G /dev/vg_lumen/lv_donnees       jusqu'à 50 Gio\n" +
	"  sudo lvextend -l +100%FREE /dev/vg_lumen/lv_donnees toute la place libre du groupe\n" +
	"  sudo lvextend -r -L +20G ...                         et agrandir aussi le système de fichiers (resize2fs)\n\n" +
	"Le piège : lvextend agrandit le contenant, pas le contenu. Tant que resize2fs n'est pas passé, df ne voit rien.\n" +
	"Tout se fait à chaud, système de fichiers monté, pour agrandir. Rétrécir, c'est une autre histoire.");
MANUEL["resize2fs"] = page("agrandir (ou rétrécir) un système de fichiers ext4", "RESIZE ext2/3/4 File System",
	"  sudo resize2fs /dev/mapper/vg_lumen-lv_donnees       l'étend à toute la taille de son volume\n" +
	"  sudo resize2fs /dev/... 40G                          à une taille précise\n\n" +
	"Agrandir se fait à chaud (monté). Rétrécir exige de démonter, puis e2fsck -f, puis resize2fs.");
MANUEL["pvcreate"] = page("préparer un disque pour LVM", "Physical Volume CREATE",
	"  sudo pvcreate /dev/sde      écrit l'en-tête LVM sur le disque : il devient un volume physique\n\n" +
	"Toutes les données qui s'y trouvaient sont perdues : vérifie avec lsblk -f et blkid qu'il est bien neuf.");
MANUEL["vgextend"] = page("ajouter un disque à un groupe de volumes", "Volume Group EXTEND",
	"  sudo vgextend vg_lumen /dev/sde      le disque rejoint le groupe ; sa place s'ajoute à VFree (vgs)");
MANUEL["lvcreate"] = page("créer un volume logique, ou un instantané", "Logical Volume CREATE",
	"  sudo lvcreate -L 10G -n lv_neuf vg_lumen                         un nouveau volume\n" +
	"  sudo lvcreate -s -L 2G -n avant_maj /dev/vg_lumen/lv_donnees     un instantané (snapshot) de lv_donnees\n\n" +
	"Un instantané garde l'état du volume à l'instant où on le prend : avant une opération risquée (une mise à jour,\n" +
	"une migration), on le crée ; si tout va bien, on le retire (lvremove) ; sinon, on revient en arrière.\n" +
	"Sa taille (-L) n'est pas une copie : c'est la réserve pour noter ce qui change ensuite. Pleine, il devient inutilisable.");
MANUEL["lvremove"] = page("supprimer un volume logique ou un instantané", "Logical Volume REMOVE",
	"  sudo lvremove /dev/vg_lumen/avant_maj        demande confirmation (y), puis supprime\n" +
	"  sudo lvremove -y /dev/vg_lumen/avant_maj     sans question\n\n" +
	"Un instantané oublié se remplit au fil des écritures, et ralentit son volume d'origine : on ne le garde pas.");
MANUEL["vgdisplay"] = page("le détail d'un groupe de volumes", "Volume Group DISPLAY", "  sudo vgdisplay        taille, PE (morceaux de 4 Mio), alloués, libres");
MANUEL["lvdisplay"] = page("le détail d'un volume logique", "Logical Volume DISPLAY", "  sudo lvdisplay /dev/vg_lumen/lv_var");
MANUEL["pvdisplay"] = page("le détail des volumes physiques", "Physical Volume DISPLAY", "  sudo pvdisplay");
MANUEL["blkid"] = page("l'identité des disques : UUID, étiquette, type", "BLocK device ID",
	"  blkid                         chaque périphérique : LABEL, UUID, TYPE (ext4, swap, LVM2_member...)\n" +
	"  blkid /dev/sda1               un seul\n" +
	"  blkid -s UUID -o value /dev/sda1      seulement la valeur de l'UUID (pour un script, ou /etc/fstab)\n\n" +
	"/etc/fstab désigne les disques par UUID=... : un nom comme /dev/sdb peut changer d'un démarrage à l'autre,\n" +
	"l'UUID, jamais (sauf si on reformate).");
MANUEL["lsblk"] = page("l'arbre des disques, partitions et volumes", "LiSt BLocK devices",
	"  lsblk             disques, partitions, grappes RAID (md), volumes LVM, et où ils sont montés\n" +
	"  lsblk -f          avec le système de fichiers, l'étiquette, l'UUID, la place libre\n" +
	"  lsblk -d          les disques seulement\n" +
	"  lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS      les colonnes choisies");
MANUEL["umount"] = page("démonter un système de fichiers", "UnMOUNT",
	"  sudo umount /srv/archives        le démonte (par son point de montage ou son périphérique)\n\n" +
	"« target is busy » : un processus y a un fichier ouvert ou y est installé (son dossier courant), et peut-être\n" +
	"ton propre terminal. fuser -vm /srv/archives ou lsof /srv/archives disent qui.");
MANUEL["fuser"] = page("qui utilise ce fichier ou ce montage ?", "File USER",
	"  fuser -vm /srv/archives     les processus qui utilisent ce système de fichiers (m), en détail (v)\n" +
	"                              ACCESS : c = son dossier courant, F = un fichier ouvert\n" +
	"  sudo fuser -km /srv/archives      les tuer tous (à manier avec précaution)");
MANUEL["mdadm"] = page("gérer le RAID logiciel", "Multiple Disk ADMinistration",
	"Un RAID 1 (miroir) écrit tout sur deux disques : si l'un meurt, l'autre continue. /proc/mdstat montre l'état :\n" +
	"[UU] les deux disques vont bien ; [_U] ou [U_] la grappe est dégradée (un seul disque la porte encore).\n\n" +
	"  cat /proc/mdstat                         l'état de toutes les grappes, et une reconstruction en cours\n" +
	"  sudo mdadm --detail /dev/md0             le détail : State, disques actifs, en panne (faulty), absents\n" +
	"  sudo mdadm --examine /dev/sdc1           l'en-tête RAID écrit sur un disque membre\n" +
	"  sudo mdadm /dev/md0 --fail /dev/sdb1     marquer un disque en panne\n" +
	"  sudo mdadm /dev/md0 --remove /dev/sdb1   le retirer de la grappe (il doit être marqué en panne)\n" +
	"  sudo mdadm /dev/md0 --add /dev/sdd1      ajouter le disque neuf : la reconstruction (recovery) commence\n" +
	"  sudo mdadm --detail --scan               la ligne ARRAY à mettre dans /etc/mdadm/mdadm.conf\n\n" +
	"Tant que la reconstruction n'est pas finie, la grappe reste fragile : on la suit (watch cat /proc/mdstat).");
MANUEL["smartctl"] = page("la santé d'un disque (SMART)", "SMART ConTroL",
	"Chaque disque surveille lui-même sa santé (SMART). smartctl la lit :\n\n" +
	"  sudo smartctl -H /dev/sdc        le verdict : PASSED ou FAILED\n" +
	"  sudo smartctl -a /dev/sdc        tout : modèle, heures de marche, et les attributs\n" +
	"  sudo smartctl -t short /dev/sdc  lancer un court test (deux minutes)\n" +
	"  sudo smartctl -l selftest /dev/sdc       le résultat des tests\n\n" +
	"Le piège : PASSED ne veut pas dire « tout va bien ». Reallocated_Sector_Ct (les secteurs déjà remplacés) et\n" +
	"Current_Pending_Sector qui grimpent annoncent la panne : on prépare le remplacement avant.");
MANUEL["e2fsck"] = page("vérifier et réparer un système de fichiers ext4", "ext2/3/4 File System ChecK",
	"  sudo e2fsck -f -y /dev/md0       vérifier même s'il semble propre (-f), réparer sans demander (-y)\n" +
	"  sudo e2fsck -n /dev/md0          seulement lire, ne rien changer\n" +
	"  sudo e2fsck -p /dev/md0          les réparations sans risque, automatiquement\n\n" +
	"La règle d'or : JAMAIS sur un système de fichiers monté. umount d'abord. Code de retour : 0 rien à faire,\n" +
	"1 erreurs corrigées, 4 erreurs laissées, 8 erreur d'utilisation.");
MANUEL["fsck"] = page("vérifier un système de fichiers (le lanceur générique)", "File System ChecK",
	"fsck lance le bon vérificateur selon le type (fsck.ext4, c'est-à-dire e2fsck, pour ext4).\n\n  sudo fsck -f -y /dev/md0          même règle : démonté d'abord");
MANUEL["fsck.ext4"] = page("vérifier un système de fichiers ext4", "File System ChecK ext4", "Le même que e2fsck. Voir man e2fsck.");
MANUEL["tune2fs"] = page("lire et régler les paramètres d'un système ext4", "TUNE ext2/3/4 File System",
	"  sudo tune2fs -l /dev/md0         tous les paramètres : Filesystem state, Inode count, Block count,\n" +
	"                                   Reserved block count, Mount count, Last checked, Check interval...\n" +
	"  sudo tune2fs -c 30 /dev/md0      vérification forcée tous les 30 montages (-1 : jamais)\n" +
	"  sudo tune2fs -i 1m /dev/md0      ou tous les mois\n" +
	"  sudo tune2fs -m 1 /dev/md0       1 % de blocs réservés à root (5 % par défaut : sur un grand disque de\n" +
	"                                   données, c'est beaucoup de place perdue ; sur /, c'est une sécurité)\n" +
	"  sudo tune2fs -L archives /dev/md0     une étiquette");
MANUEL["fallocate"] = page("réserver la place d'un fichier, d'un coup", "File ALLOCATE",
	"  sudo fallocate -l 2G /swapfile    un fichier de 2 Gio, réservé instantanément (sans écrire 2 Gio de zéros)\n\n" +
	"L'usage classique : préparer un fichier d'échange (swap). Il faut ensuite chmod 600, mkswap, swapon.");
MANUEL["mkswap"] = page("préparer une zone d'échange (swap)", "MaKe SWAP",
	"  sudo mkswap /swapfile       écrit l'en-tête d'échange : le fichier (ou la partition) peut servir de swap\n\n" +
	"Le fichier doit être en 600 (lisible par root seul) : la mémoire des programmes y sera recopiée.");
MANUEL["swapon"] = page("activer une zone d'échange, ou les lister", "SWAP ON",
	"L'échange (swap) est de la mémoire de secours sur le disque : beaucoup plus lente que la RAM, mais elle évite\n" +
	"que l'OOM killer tue des programmes quand la mémoire est pleine.\n\n" +
	"  swapon --show             les zones actives (taille, utilisée, priorité)\n" +
	"  sudo swapon /swapfile     en activer une\n" +
	"  sudo swapon -a            activer toutes celles de /etc/fstab (pour vérifier la ligne avant de redémarrer)\n\n" +
	"Pour qu'elle revienne au démarrage, une ligne dans /etc/fstab :  /swapfile none swap sw 0 0\n" +
	"Et vm.swappiness (de 0 à 100, 60 par défaut) dit au noyau s'il échange tôt ou tard : 10 sur un serveur.");
MANUEL["swapoff"] = page("désactiver une zone d'échange", "SWAP OFF", "  sudo swapoff /swapfile      ce qu'elle contient revient en mémoire (il faut de la place)");
MANUEL["setquota"] = page("fixer le quota disque d'un compte", "SET QUOTA",
	"Un quota limite la place qu'un compte (ou un groupe) peut prendre sur un système de fichiers monté avec usrquota.\n" +
	"Deux limites : la souple (on peut la dépasser pendant un délai de grâce) et la dure (jamais).\n\n" +
	"  sudo setquota -u ada 500M 600M 0 0 /home      500 Mio souple, 600 Mio dur, pas de limite de fichiers\n" +
	"  sudo setquota -g lumen 2G 3G 0 0 /home        pour un groupe\n" +
	"Les tailles sont en blocs de 1 Kio, ou avec un suffixe (K, M, G).");
MANUEL["quota"] = page("voir son quota disque", "QUOTA",
	"  quota                 le tien : blocks (utilisés), quota (souple), limit (dure), files...\n" +
	"  sudo quota -u ada     celui d'un autre compte");
MANUEL["repquota"] = page("le rapport des quotas de tous les comptes", "REPort QUOTA",
	"  sudo repquota -a      tous les systèmes de fichiers à quotas : chaque compte, sa place, ses limites\n" +
	"                        (+- en tête de ligne : la limite souple est dépassée)");
MANUEL["edquota"] = page("modifier un quota dans l'éditeur", "EDit QUOTA",
	"  sudo edquota -u ada              ouvre le quota d'ada dans l'éditeur : on change soft et hard, on enregistre\n" +
	"  sudo edquota -p ada bob carole   copier le quota d'ada sur bob et carole (-p : prototype)");
MANUEL["updatedb"] = page("fabriquer la base de locate", "UPDATE DataBase",
	"  sudo updatedb       parcourt tout le disque et note chaque chemin dans /var/lib/plocate/plocate.db");
MANUEL["locate"] = page("trouver un fichier par son nom, instantanément", "LOCATE",
	"  locate lettre       chaque chemin qui contient « lettre », lu dans la base (pas sur le disque)\n" +
	"  locate -i Lettre    sans tenir compte des majuscules ;  -c : seulement le nombre\n\n" +
	"Le piège : la base date du dernier updatedb. Un fichier créé depuis n'y est pas ; un fichier supprimé y est encore.");
MANUEL["renice"] = page("changer la priorité d'un processus qui tourne", "RE-NICE",
	"La « gentillesse » (nice) d'un processus va de -20 (prioritaire) à 19 (passe après tout le monde).\n\n" +
	"  sudo renice +19 -p 4242     le processus 4242 laisse passer les autres\n" +
	"  sudo renice -n 5 -u ada     tous ceux d'ada\n\n" +
	"Seul root peut rendre un processus plus prioritaire (baisser son nice) ; chacun peut ralentir les siens.\n" +
	"ps -o pid,ni,cmd et la colonne NI de top montrent la valeur.");
MANUEL["nice"] = page("lancer une commande avec une priorité plus basse", "NICE",
	"  nice -n 10 tar czf /srv/sauvegardes/x.tar.gz /srv/donnees     la commande passe après les autres\n" +
	"  nice                    affiche ta gentillesse actuelle (0)");
MANUEL["pstree"] = page("l'arbre des processus", "Process STREE",
	"  pstree -p         chaque processus sous son parent, avec son PID\n" +
	"  pstree -p 1312    l'arbre qui part du processus 1312\n" +
	"  pstree -a         avec les arguments\n\n" +
	"Le moyen le plus rapide de voir qu'un processus est relancé par une boucle (son parent).");
MANUEL["pmap"] = page("la carte mémoire d'un processus", "Process MAP",
	"  sudo pmap 1312        chaque zone de mémoire du processus ; [ anon ] est le tas, là où grossit une fuite\n" +
	"  sudo pmap -x 1312     avec ce qui est vraiment en mémoire (RSS)");
MANUEL["strace"] = page("observer les appels système d'un processus", "System call TRACE",
	"Un programme demande tout au noyau : ouvrir un fichier (openat), lire (read), se connecter (connect)...\n" +
	"strace montre chaque demande et sa réponse. Un appel sans « = résultat » est un appel qui attend encore :\n" +
	"c'est là que le processus est bloqué.\n\n" +
	"  sudo strace -p 2210                   s'attacher au processus 2210 (Ctrl-C pour le lâcher)\n" +
	"  sudo strace -p 2210 -e trace=network  seulement le réseau ;  -tt : l'heure de chaque appel\n" +
	"  sudo strace -c -p 2210                le résumé : quels appels, combien de fois\n" +
	"  strace ls                             lancer une commande sous observation");
MANUEL["free"] = page("la mémoire et l'échange", "FREE memory",
	"  free -h        total, used, free, buff/cache, available ; et la ligne Swap\n\n" +
	"Lis available, pas free : Linux remplit la mémoire libre de cache (buff/cache), qu'il rend dès qu'on en a besoin.\n" +
	"free proche de zéro est normal ; available proche de zéro, c'est la mémoire saturée.");
MANUEL["vmstat"] = page("la mémoire, l'échange, les disques et le processeur, seconde par seconde", "Virtual Memory STATistics",
	"  vmstat 1 5        cinq relevés, un par seconde (le premier : la moyenne depuis le démarrage)\n\n" +
	"r : processus qui veulent le processeur ; b : qui attendent le disque ; si/so : mémoire lue/écrite dans le swap\n" +
	"(si et so qui ne retombent pas à zéro : la machine « swappe », elle manque de mémoire) ; wa : attente du disque.\n" +
	"  vmstat -s         les compteurs de mémoire, un par ligne");
MANUEL["nproc"] = page("le nombre de processeurs", "Number of PROCessing units",
	"  nproc     le nombre de cœurs utilisables. À comparer avec la charge (uptime) : une charge de 8 sur 4 cœurs,\n" +
	"            c'est deux fois plus de travail que la machine ne peut en faire.");
MANUEL["iostat"] = page("l'activité des disques", "Input/Output STATistics",
	"  iostat -x 1 3     trois relevés détaillés : par disque, r/s et w/s (lectures et écritures par seconde),\n" +
	"                    r_await et w_await (le temps d'attente, en ms), et %util (la part du temps où il est occupé)\n\n" +
	"Le premier relevé est la moyenne depuis le démarrage : regarde les suivants. %util près de 100 : le disque sature.");
MANUEL["sar"] = page("l'historique de la machine (CPU, mémoire, charge)", "System Activity Report",
	"sar (paquet sysstat) note un relevé toutes les dix minutes, toute la journée : on peut regarder ce qui s'est\n" +
	"passé cette nuit, pendant qu'on dormait.\n\n" +
	"  sar -u       le processeur (%user, %system, %iowait, %idle)\n" +
	"  sar -r       la mémoire (kbavail, %memused, kbcommit)\n" +
	"  sar -q       la file d'attente et la charge (runq-sz, ldavg-1, ldavg-5, ldavg-15, blocked)\n" +
	"  sar -u 1 3   trois relevés en direct, un par seconde");
MANUEL["ulimit"] = page("les limites de ressources du shell", "User LIMITs",
	"  ulimit -n          combien de fichiers ton shell peut ouvrir à la fois (limite souple)\n" +
	"  ulimit -Hn         la limite dure (le plafond de la souple)\n" +
	"  ulimit -a          toutes les limites\n" +
	"  ulimit -n 4096     monter la souple, pour ce shell et ce qu'il lance\n\n" +
	"Pour un service, ce n'est pas ulimit qui compte : c'est LimitNOFILE= dans son unité systemd.\n" +
	"cat /proc/PID/limits montre les limites d'un processus qui tourne.");
MANUEL["jobs"] = page("les tâches de ton shell", "JOBS",
	"  jobs        chaque tâche lancée depuis ce shell : [numéro], Running ou Stopped, la commande\n" +
	"  jobs -l     avec le PID\n\n" +
	"Une tâche se désigne par %1, %2... (ou %% pour la dernière) : fg %1, bg %1, kill %1.");
MANUEL["bg"] = page("relancer une tâche suspendue, en arrière-plan", "BackGround",
	"Ctrl-Z suspend le programme au premier plan (il est Stopped). bg le relance, mais en tâche de fond :\n" +
	"il travaille, et le terminal est de nouveau à toi.\n\n  bg %1");
MANUEL["fg"] = page("ramener une tâche au premier plan", "ForeGround",
	"  fg %1     la tâche 1 revient au premier plan : elle reprend le terminal (Ctrl-Z pour la suspendre de nouveau)");
MANUEL["disown"] = page("détacher une tâche de ton shell", "DISOWN",
	"Quand tu fermes ton terminal (exit, déconnexion), chaque tâche de ton shell reçoit SIGHUP et s'arrête.\n" +
	"disown la retire de la liste : elle survit à la fermeture.\n\n" +
	"  disown %1       la tâche 1 n'est plus attachée à ce shell (jobs ne la montre plus)\n" +
	"  disown -a       toutes\n" +
	"Pour un travail prévu pour durer, on lance plutôt tout de suite dans tmux, ou avec nohup.");
MANUEL["nohup"] = page("lancer une commande qui survit à la déconnexion", "NO HangUP",
	"  nohup /usr/local/bin/recopier-archives &      ignore SIGHUP : la fermeture du terminal ne l'arrête pas ;\n" +
	"                                                sa sortie va dans nohup.out\n\n" +
	"Le piège : sans &, nohup garde le terminal (la commande tourne au premier plan).");
MANUEL["tmux"] = page("des sessions de terminal qui survivent à la déconnexion", "Terminal MUltipleXer",
	"tmux ouvre une session de terminal qui tourne sur la machine, indépendamment de ta connexion ssh : si elle tombe,\n" +
	"la session continue, avec tout ce qu'elle a lancé. On la retrouve plus tard.\n\n" +
	"  tmux new -s copie            une nouvelle session, nommée copie (tu es dedans)\n" +
	"  tmux detach                  la quitter sans l'arrêter (au clavier : Ctrl-b puis d)\n" +
	"  tmux ls                      les sessions qui tournent\n" +
	"  tmux attach -t copie         y revenir\n" +
	"  tmux new -d -s copie 'commande'      la lancer détachée, avec une commande\n" +
	"  tmux kill-session -t copie   la fermer\n" +
	"Dans la session, exit ferme la session elle-même.");
MANUEL["screen"] = page("l'ancêtre de tmux", "SCREEN",
	"  screen -ls     ses sessions. Les idées sont les mêmes que tmux (détacher, rattacher), les touches non (Ctrl-a).");
MANUEL["watch"] = page("relancer une commande toutes les N secondes", "WATCH",
	"  watch -n 2 cat /proc/mdstat     l'état du RAID, rafraîchi toutes les 2 secondes, jusqu'à Ctrl-C\n" +
	"  watch -n 5 df -h                la place des disques\n" +
	"Les guillemets servent quand la commande a un tuyau : watch -n 2 'ps aux | grep sauvegarde'");
MANUEL["killall"] = page("envoyer un signal à tous les processus d'un nom", "KILL ALL",
	"  sudo killall export-registre        TERM à tous les processus qui s'appellent exactement ainsi\n" +
	"  sudo killall -9 export-registre     KILL\n" +
	"  sudo killall -u operateur -v bash   ceux d'un utilisateur, en disant ce qui a été fait\n" +
	"Le piège : killall tue par NOM, tous. Vérifie d'abord avec pgrep -a.");
MANUEL["pidof"] = page("le PID d'un programme, par son nom", "PID OF",
	"  pidof cache-rapports      le ou les PID des processus de ce nom (le nom exact du programme)");
MANUEL["systemd-run"] = page("lancer une commande comme un service, maintenant ou plus tard", "SYSTEMD RUN",
	"  sudo systemd-run --unit=essai /usr/local/bin/sauvegarde.sh       comme un service transitoire, tout de suite\n" +
	"  sudo systemd-run --on-active=30min /usr/local/bin/sauvegarde.sh  dans 30 minutes (un timer transitoire)\n" +
	"  sudo systemd-run --on-calendar='*-*-* 03:00' ...                 à une heure fixe\n" +
	"systemctl list-timers montre les timers transitoires, journalctl -u NOM leur sortie. Ils disparaissent au redémarrage.");
MANUEL["systemd-cgtop"] = page("qui consomme quoi, service par service", "SYSTEMD Control Group TOP",
	"Comme top, mais par groupe de contrôle : chaque service avec tous ses processus, son %CPU et sa mémoire.\n" +
	"Le moyen le plus rapide de trouver le service gourmand.\n\n  systemd-cgtop");
MANUEL["chgrp"] = page("changer le groupe d'un fichier ou d'un dossier", "CHange GRouP",
	"  sudo chgrp habitants /home/commun          le dossier appartient au groupe habitants\n" +
	"  sudo chgrp -R habitants /home/commun       et tout ce qu'il contient\n" +
	"(sudo chown ninon:habitants fichier change le propriétaire et le groupe d'un coup.)");
MANUEL["systemd-tmpfiles"] = page("faire le ménage des dossiers temporaires, selon des règles", "SYSTEMD TMPFILES",
	"Chaque ligne d'un fichier de /etc/tmpfiles.d (ou /usr/lib/tmpfiles.d) décrit un dossier et ce qu'on y fait :\n\n" +
	"  TYPE  CHEMIN                      MODE  UTILISATEUR  GROUPE  ÂGE\n" +
	"  d     /var/lib/lumen/sessions     1733  root         root    1h\n\n" +
	"d crée le dossier s'il manque et, avec un ÂGE (30m, 1h, 7d), y retire ce qui n'a pas bougé depuis plus longtemps.\n" +
	"Un timer (systemd-tmpfiles-clean.timer) fait ce ménage chaque jour, tout seul.\n\n" +
	"  sudo systemd-tmpfiles --clean        le ménage, tout de suite\n" +
	"  sudo systemd-tmpfiles --create       créer ce qui manque\n" +
	"  systemd-tmpfiles --cat-config        toutes les règles, fichier par fichier\n\n" +
	"Un fichier de /etc/tmpfiles.d remplace celui de même nom dans /usr/lib/tmpfiles.d.");
MANUEL["groupadd"] = page("créer un groupe", "GROUP ADD", "  sudo groupadd familles      un nouveau groupe dans /etc/group (sudo usermod -aG familles ada y ajoute ada)");
MANUEL["newgrp"] = page("changer de groupe courant", "NEW GRouP",
	"  newgrp lumen      un nouveau shell où ton groupe courant est lumen : les fichiers que tu crées lui appartiennent\n" +
	"                    (il faut être membre du groupe). exit revient au groupe d'avant.");
MANUEL["bzip2"] = page("compresser avec bzip2", "Burrows-Wheeler ZIP 2",
	"  bzip2 fichier          remplace fichier par fichier.bz2 (plus petit que gzip, plus lent)\n" +
	"  bzip2 -k fichier       garde l'original ;  -v : dit le taux ;  -d : décompresser ;  -9 : le plus fort\n" +
	"  bzcat fichier.bz2      le lire sans le décompresser sur le disque");
MANUEL["bunzip2"] = page("décompresser un .bz2", "B UNZIP 2", "  bunzip2 fichier.bz2     (le même que bzip2 -d)");
MANUEL["bzcat"] = page("lire un .bz2", "BZip CAT", "  bzcat fichier.bz2 | less");
MANUEL["xz"] = page("compresser avec xz", "XZ",
	"  xz fichier         remplace fichier par fichier.xz : souvent le plus petit, et le plus lent à compresser\n" +
	"  xz -k -9 fichier   garder l'original, compression la plus forte\n" +
	"  xz -l fichier.xz   la taille avant et après, et le rapport (Ratio)\n" +
	"  xz -d fichier.xz   décompresser (unxz) ;  xzcat : lire");
MANUEL["unxz"] = page("décompresser un .xz", "UN XZ", "  unxz fichier.xz");
MANUEL["xzcat"] = page("lire un .xz", "XZ CAT", "  xzcat fichier.xz | head");
MANUEL["zstd"] = page("compresser avec zstd", "Z STandarD",
	"  zstd fichier           crée fichier.zst et GARDE l'original (au contraire de gzip, bzip2 et xz)\n" +
	"  zstd --rm fichier      supprime l'original ;  -19 : le plus fort ;  -1 : le plus rapide\n" +
	"  zstd -d fichier.zst    décompresser (unzstd) ;  zstdcat : lire\n" +
	"zstd est très rapide, à taux comparable à gzip : le choix moderne pour les sauvegardes et les journaux.");
MANUEL["unzstd"] = page("décompresser un .zst", "UN ZSTD", "  unzstd fichier.zst");
MANUEL["zstdcat"] = page("lire un .zst", "ZSTD CAT", "  zstdcat fichier.zst | tail");
MANUEL["zless"] = page("lire un fichier compressé, page par page", "Z LESS",
	"  zless /var/log/lumen/lumen.log.3.gz      comme less, sans décompresser sur le disque (espace, /mot, q)");
MANUEL["zgrep"] = page("chercher dans des fichiers compressés", "Z GREP",
	"  zgrep -i chant /var/log/lumen/*.gz      comme grep, à travers la compression gzip (et dans les fichiers non compressés)\n" +
	"  zgrep -c erreur ...    compter ;  -n : le numéro de ligne ;  -l : seulement les noms de fichiers");
MANUEL["apt-mark"] = page("épingler un paquet (le retenir à sa version)", "APT MARK",
	"  sudo apt-mark hold lumen-base       apt upgrade ne le mettra plus à jour (« kept back »)\n" +
	"  apt-mark showhold                   les paquets retenus\n" +
	"  sudo apt-mark unhold lumen-base     le libérer\n\n" +
	"On retient une base de données, un noyau, un logiciel métier : pour choisir soi-même le moment de sa mise à jour,\n" +
	"pas pour l'oublier.");
MANUEL["apt-cache"] = page("interroger la liste des paquets", "APT CACHE",
	"  apt-cache policy lumen-base      la version installée, la candidate, d'où elle vient\n" +
	"  apt-cache depends lumen-web      de quoi il dépend ;  rdepends : qui dépend de lui\n" +
	"  apt-cache search mot             chercher un paquet");
MANUEL["needrestart"] = page("quels services relancer après une mise à jour", "NEED RESTART",
	"Une bibliothèque mise à jour (libssl, par exemple) ne sert qu'aux programmes démarrés APRÈS : ceux qui tournaient\n" +
	"gardent l'ancienne en mémoire, avec ses failles. needrestart les trouve.\n\n" +
	"  sudo needrestart -r l      la liste : services à relancer, noyau en attente d'un redémarrage\n" +
	"  sudo needrestart -b        la même chose, pour un script\n" +
	"/var/run/reboot-required (s'il existe) dit qu'un redémarrage est attendu, et pourquoi (.pkgs).");
MANUEL["hwclock"] = page("l'horloge matérielle", "HardWare CLOCK",
	"Deux horloges : celle du système (tenue par le noyau, réglée par NTP) et l'horloge matérielle (RTC), une petite\n" +
	"horloge à pile sur la carte mère, qui tourne même éteinte et donne l'heure au démarrage.\n\n" +
	"  sudo hwclock --show       l'heure de l'horloge matérielle\n" +
	"  sudo hwclock --systohc    l'horloge matérielle prend l'heure du système (system to hardware clock)\n" +
	"  sudo hwclock --hctosys    l'inverse : le système prend l'heure de l'horloge matérielle\n" +
	"Une horloge matérielle qui dérive, et chaque démarrage commence à la mauvaise heure.");
MANUEL["cal"] = page("un calendrier", "CALendar",
	"  cal              le mois en cours, aujourd'hui en surbrillance\n" +
	"  cal -3           le mois précédent, celui-ci et le suivant ;  -m : la semaine commence le lundi\n" +
	"  cal 12 2026      un mois précis ;  cal -y : l'année entière ;  cal 2027 : une autre année");

/* Ce qu'on ajoute aux pages des sorts qui existaient déjà. */
(function(){
	function ajout(nom, texte){ if (MANUEL[nom]) MANUEL[nom].page += "\n\n" + texte; }
	ajout("df", "Sur un serveur (chapitre 6) :\n  df -h         la place de chaque système de fichiers ;  df -hT : avec son type\n  df -i         les inodes : un disque peut être plein de fichiers minuscules sans être plein d'octets\n  df -h /var    seulement celui qui contient /var\n" +
		"df compte aussi les fichiers supprimés mais encore ouverts par un processus (lsof +L1) : du, lui, ne les voit pas.");
	ajout("du", "Sur un serveur (chapitre 6) :\n  sudo du -sh /var/* | sort -h       le poids de chaque dossier de /var, le plus lourd en dernier\n  sudo du -h --max-depth=1 /var      un niveau de profondeur\n  du -x                              sans traverser les autres montages ;  --apparent-size : la taille, pas la place");
	ajout("find", "Sur un serveur (chapitre 6) :\n  sudo find /var -size +500M                   les fichiers de plus de 500 Mio\n  sudo find /var/backups -mtime +30            pas modifiés depuis plus de 30 jours\n" +
		"  sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete     supprimer ceux de plus d'une heure (-mmin : en minutes)\n  Toujours lancer d'abord sans -delete, pour voir ce qui partirait.\n" +
		"  find /var/www -xtype l                       les liens cassés (qui pointent vers un fichier qui n'existe plus)\n" +
		"  find /srv/courrier -newermt \"2026-10-17 00:00\"     modifiés après une date et une heure précises");
	ajout("ps", "Sur un serveur (chapitre 6) :\n  ps aux --sort=-%mem | head     les plus gourmands en mémoire\n  ps -eo pid,ppid,ni,stat,%cpu,%mem,cmd --sort=-%cpu      les colonnes choisies\n" +
		"  ps -o ppid= -p 4242            le parent d'un processus (le = vide supprime l'en-tête)\n  ps -ef --forest                l'arbre\n" +
		"STAT : R (tourne), S (dort), D (attend le disque, ne s'interrompt pas), Z (zombie : mort, pas encore récolté par son parent),\nT (arrêté, Ctrl-Z ou SIGSTOP) ; N : nice positif ; < : prioritaire ; s : chef de session ; + : au premier plan.");
	ajout("kill", "Sur un serveur (chapitre 6) :\n  kill -l          la liste des signaux\n  kill 4242        TERM (15) : « arrête-toi proprement » ; le programme peut finir ce qu'il fait\n  kill -9 4242     KILL : le noyau l'arrête sur-le-champ, sans qu'il puisse rien sauver. En dernier recours.\n" +
		"  kill -STOP 4242 ;  kill -CONT 4242       le figer ; le relancer\n  kill %1          la tâche 1 de ton shell (jobs)\n" +
		"On ne tue pas un zombie : il est déjà mort. On relance (ou on arrête) son parent, qui le récolte.");
	ajout("top", "Sur un serveur (chapitre 6) :\n  top -b -n 1          une photo, prête pour un tuyau (b : batch)\n  top -o %MEM          trié par mémoire ;  -u ada : les processus d'ada ;  -p 4242 : un seul\n" +
		"En haut : la charge (load average), les tâches (dont les zombies), le CPU (wa : l'attente du disque), la mémoire (avail Mem).");
	ajout("journalctl", "Sur un serveur (chapitre 6) :\n  journalctl -u lumen-web          un service ;  -f : en direct ;  -n 50 : les 50 dernières lignes\n  journalctl -b -p err             les erreurs depuis le démarrage ;  -k : le noyau\n" +
		"  journalctl --since \"09:00\" --until \"10:00\"      une plage horaire ;  --since today, --since \"1 hour ago\"\n  journalctl --disk-usage          la place qu'il prend\n" +
		"  sudo journalctl --vacuum-size=200M      ne garder que 200 Mio d'archives ;  --vacuum-time=7d : une semaine\n  Et pour de bon : SystemMaxUse=200M dans /etc/systemd/journald.conf, puis sudo systemctl restart systemd-journald.");
	ajout("systemctl", "Écrire son propre service (chapitre 6) : un fichier /etc/systemd/system/NOM.service\n  [Unit]\n  Description=...\n  After=network-online.target\n  [Service]\n  User=...\n  ExecStart=/chemin/absolu/du/programme --options\n  Restart=on-failure\n  RestartSec=5\n  [Install]\n  WantedBy=multi-user.target\n" +
		"puis sudo systemctl daemon-reload, sudo systemctl enable --now NOM.\n" +
		"  sudo systemctl kill -s KILL NOM        tuer son processus (Restart= décide s'il revient)\n  systemctl --failed ;  sudo systemctl reset-failed      les services en échec ; effacer l'échec\n" +
		"  systemctl list-dependencies NOM        ce dont il a besoin\n  systemctl show -p MemoryMax,CPUQuotaPerSecUSec NOM    une propriété\n" +
		"  sudo systemctl set-property NOM CPUQuota=50% MemoryMax=1G      des limites, tout de suite (et gardées)\n  systemctl list-timers                  les minuteries : la prochaine échéance de chacune\n" +
		"Un timer : un fichier NOM.timer ([Timer] OnCalendar=*-*-* 02:00, Persistent=true, [Install] WantedBy=timers.target) à côté de NOM.service ;\non active le timer (sudo systemctl enable --now NOM.timer), pas le service.");
	ajout("systemd-analyze", "Et aussi (chapitre 6) :\n  systemd-analyze                  le temps du dernier démarrage\n  systemd-analyze blame            chaque service et son temps de démarrage, le plus lent en haut\n" +
		"  systemd-analyze critical-chain   la chaîne qui a retardé le démarrage\n  systemd-analyze calendar '*-*-* 02:00'    vérifier une expression OnCalendar et sa prochaine échéance\n  systemd-analyze verify NOM.service        vérifier une unité avant de la charger");
	ajout("tar", "Sur un serveur (chapitre 6) :\n  sudo tar czf /srv/sauvegardes/lumen-$(date +%F).tar.gz /etc/lumen /srv/lumen      des dossiers entiers, compressés (z : gzip)\n" +
		"  tar tzf archive.tar.gz            la liste ;  tvzf : en détail\n  sudo tar xzf archive.tar.gz -C /tmp/restauration     extraire ailleurs\n" +
		"  sudo tar xzf archive.tar.gz -C /tmp etc/lumen/lumen.conf    un seul fichier\n  j : bzip2 ;  J : xz ;  --zstd : zstd ;  a : d'après l'extension du nom\n" +
		"Une sauvegarde qu'on n'a jamais restaurée n'existe pas : on extrait, et on compare (diff -r).");
	ajout("date", "  date +%s          les secondes écoulées depuis le 1er janvier 1970 (le temps Unix, celui des journaux)");
	ajout("lsof", "Sur un serveur (chapitre 6) :\n  sudo lsof +L1                 les fichiers supprimés mais encore ouverts (NLINK 0) : leur place n'est pas rendue\n  sudo lsof -p 1312             tout ce qu'un processus a ouvert ;  -i :8080 : qui tient ce port\n  sudo lsof /srv/archives       qui utilise ce dossier");
	ajout("dmesg", "  sudo dmesg -T | grep -i oom     les meurtres de l'OOM killer (quand la mémoire manque), avec l'heure lisible (-T)\n  sudo dmesg -l err,warn          seulement les erreurs et les avertissements");
	ajout("uptime", "  uptime : l'heure, depuis quand la machine tourne, et la charge sur 1, 5 et 15 minutes (à comparer à nproc).");
	ajout("stat", "  stat -c %i FICHIER     le numéro d'inode : la fiche du fichier dans le système de fichiers (droits, dates,\n                         où sont ses données). Un nom n'est qu'une étiquette qui pointe vers un inode.");
	ajout("mount", "  sudo mount -a          monter tout ce que /etc/fstab décrit (et voir tout de suite si une ligne est fausse)\n  sudo mount -o remount,rw /srv/archives      remonter en écriture");
	ajout("findmnt", "  sudo findmnt --verify      vérifier /etc/fstab avant de redémarrer : UUID introuvable, type inconnu...\n  Une ligne avec nofail ne bloque pas le démarrage si le disque est absent (un disque amovible).");
	ajout("logrotate", "  /etc/logrotate.d/NOM :\n  /var/log/lumen/*.log {\n      daily\n      rotate 7\n      compress\n      missingok\n      notifempty\n      maxsize 100M\n  }\n  sudo logrotate -d /etc/logrotate.d/NOM     à blanc ;  sudo logrotate -f ...  pour de vrai, tout de suite");
	ajout("apt", "Quand une mise à jour a été interrompue (chapitre 6) :\n  sudo dpkg --configure -a          finir de configurer ce qui est à moitié installé\n  sudo apt --fix-broken install     réparer les dépendances cassées");
	ajout("dpkg", "  sudo dpkg --configure -a     finir une installation interrompue ;  dpkg --audit : ce qui est à moitié installé");
	ajout("curl", "  curl -o /dev/null -s -w \"%{time_total}\\n\" http://lumen/      le temps de réponse d'un site, en secondes (sans afficher la page)\n  %{http_code} : le code de la réponse ;  %{time_connect} : le temps de connexion");
	ajout("last", "  last -x          avec les démarrages et les arrêts (reboot, shutdown) ;  last -x reboot : seulement les démarrages\n  « crash » à la place d'une heure de fin : la machine s'est arrêtée sans s'éteindre proprement.");
	ajout("chmod", "  chmod 2775 dossier   (ou g+s) : le bit setgid sur un dossier : tout ce qu'on y crée prend le groupe du dossier\n  (ls -l montre un s à la place du x du groupe : drwxrwsr-x).");
	ajout("getent", "  getent hosts NOM     comment la machine résout un nom (/etc/hosts d'abord, puis le DNS)");
	ajout("timedatectl", "  timedatectl list-timezones | grep Paris ;  sudo timedatectl set-timezone Europe/Paris      le fuseau horaire");
})();

/* Les sorts du moteur des machines : hors barème tant qu'aucun chapitre ne les enseigne. */
var SORTS_MACHINES = ["ncdu", "pvs", "vgs", "lvs", "lvextend", "resize2fs", "pvcreate", "vgextend", "lvcreate", "lvremove", "vgdisplay", "lvdisplay", "pvdisplay",
	"blkid", "lsblk", "umount", "fuser", "mdadm", "smartctl", "e2fsck", "fsck", "tune2fs", "fallocate", "mkswap", "swapon", "swapoff",
	"setquota", "quota", "repquota", "edquota", "updatedb", "locate", "renice", "nice", "pstree", "pmap", "strace", "free", "vmstat", "nproc", "iostat", "sar", "ulimit",
	"jobs", "bg", "fg", "disown", "nohup", "tmux", "screen", "watch", "killall", "pidof", "systemd-run", "systemd-cgtop", "chgrp", "groupadd", "newgrp",
	"bzip2", "bunzip2", "bzcat", "xz", "unxz", "xzcat", "zstd", "unzstd", "zstdcat", "zless", "zgrep", "apt-mark", "apt-cache", "needrestart", "hwclock", "cal", "fsck.ext4"];
SORTS_MACHINES.forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_MACHINES.indexOf(c) === -1; });
var PREMIER_USAGE_AVANT_MACHINES = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if (SORTS_MACHINES.indexOf(sort) > -1 && tousLesSorts().indexOf(sort) === -1){ this.usages[sort] = true; return; }
	return PREMIER_USAGE_AVANT_MACHINES.apply(this, arguments);
};
