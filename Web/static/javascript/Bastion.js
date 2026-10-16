/**
 * Bastion.js : la vie du Bastion (chapitre 5 pour le joueur, numéro interne 6).
 *
 * Chapitre5.js pose le monde, la machine bastion, l'horloge, les 29 étapes et l'aube. Ici, le Bastion prend vie :
 *  - les douze maîtres, un par tour, ont un texte VIVANT (comme ceux de l'Académie) : ils entrent en scène,
 *    expliquent leur mur par une image (avec le vrai mot du métier à côté), donnent la syntaxe, confient la mission
 *    sans en dicter la commande, réagissent aux erreurs fréquentes, puis racontent une anecdote du métier ;
 *  - les 74 défis (quêtes secondaires s_h_*) : six par tour, révélés par le maître, et deux défis d'honneur de Laurent ;
 *  - les badges du chapitre, le plan du Bastion (rempart), le bestiaire et les noms imagés des sorts.
 *
 * Tout ce qui touche à la Nuée reste narratif et inerte : le joueur durcit, vérifie, détecte, répare, documente.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis du Bastion (quêtes secondaires, six par tour)             */
/* ------------------------------------------------------------------ */

function surBastion(){ return Shell.hote() === H5; }
function optionsLettres(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function secondesSsh(v){ var m = /^(\d+)([smh]?)$/i.exec(String(v || "").trim()); return m ? +m[1] * ({ "": 1, s: 1, m: 60, h: 3600 }[m[2].toLowerCase()]) : null; }

/* appel(nom, args, sortie, io) : le sort lancé, et sa sortie, le prouvent. monde() : l'état de la machine le prouve.
   evenement + quand(e) : un événement du moteur le prouve. */
var DEFIS_BASTION = [
	// La Herse (Fernando)
	{ id: "s_h_faillock_liste", tour: "herse", titre: "Herse : lire le registre des échecs d'un compte (faillock --user)",
	  evenement: "faillock", quand: function(e){ return e.hote === H5 && e.action === "list" && !!e.user && e.echecs > 0; } },
	{ id: "s_h_faillock_reset", tour: "herse", titre: "Herse : rendre la main au secrétariat après vérification (faillock --reset)",
	  evenement: "faillock", quand: function(e){ return e.hote === H5 && e.action === "reset" && e.user === "secretariat" && !compteBloqueFaillock(H5, "secretariat"); } },
	{ id: "s_h_dormant", tour: "herse", titre: "Herse : repérer le compte qui dort depuis des mois (lastlog) et le verrouiller",
	  monde: function(){ var s = shadowDe(H5, "stagiaire"); return !!sCh5().dormantVu && (!s || !mdpUtilisable(s.mdp) || (s.expire !== "" && s.expire !== undefined && +s.expire <= joursDepuis1970(maintenantBastion()))); } },
	{ id: "s_h_pwck", tour: "herse", titre: "Herse : vérifier la cohérence des comptes et des groupes (pwck -r, grpck -r)",
	  monde: function(){ return !!sCh5().pwckVu && !!sCh5().grpckVu; } },
	{ id: "s_h_wheel", tour: "herse", titre: "Herse : réserver su au groupe wheel (pam_wheel)",
	  monde: function(){ return controleLynisOk("AUTH-9218") === true; } },
	{ id: "s_h_tmout", tour: "herse", titre: "Herse : fermer les sessions oubliées (TMOUT en lecture seule, dans /etc/profile.d)",
	  monde: function(){ return controleLynisOk("SHLL-6220") === true; } },
	// Le Sceau du Roi (Butler)
	{ id: "s_h_sudo_liste", tour: "sceau", titre: "Sceau : lire les droits sudo d'un autre compte (sudo -l -U deploiement)",
	  evenement: "sudoListe", quand: function(e){ return e.hote === H5 && e.qui === "deploiement"; } },
	{ id: "s_h_visudo_c", tour: "sceau", titre: "Sceau : faire relire tout sudoers par visudo, sans une faute (visudo -c)",
	  evenement: "visudo", quand: function(e){ return surBastion() && e.action === "c" && e.ok && e.fichier === "/etc/sudoers"; } },
	{ id: "s_h_sudoers_drop", tour: "sceau", titre: "Sceau : écrire une règle étroite dans /etc/sudoers.d avec visudo -f",
	  evenement: "visudo", quand: function(e){
		if (!surBastion() || e.action !== "edit" || !e.ok || !/^\/etc\/sudoers\.d\/[^\/.]+$/.test(e.fichier || "") || /deploiement|vint|README/.test(e.fichier)) return false;
		var f = F5(e.fichier), t = f ? f.getText() : "";
		return !!f && f.mode === "r--r-----" && lignesConf(t).length > 0 && !/NOPASSWD\s*:\s*ALL\s*$/m.test(t) && !/\)\s*ALL\s*$/m.test(t);
	  } },
	{ id: "s_h_cron_root", tour: "sceau", titre: "Sceau : relire la roue de root (sudo crontab -l)",
	  appel: function(n, a, s, io){ return n === "crontab" && surBastion() && io.sudo && a.indexOf("-l") > -1 && a.indexOf("-u") === -1 && s.trim() !== ""; } },
	{ id: "s_h_su_refus", tour: "sceau", titre: "Sceau : constater qu'un compte verrouillé ne s'ouvre plus (su vers invite)",
	  evenement: "su", quand: function(e){ return e.hote === H5 && e.cible === "invite" && !e.ok && (e.raison === "verrouille" || e.raison === "motdepasse"); } },
	{ id: "s_h_timers", tour: "sceau", titre: "Sceau : passer en revue les horloges de clocher du Bastion (systemctl list-timers --all)",
	  appel: function(n, a, s){ return n === "systemctl" && surBastion() && a.indexOf("list-timers") > -1 && a.indexOf("--all") > -1; } },
	// Le Pont-levis (Tatu)
	{ id: "s_h_sshd_T", tour: "pontlevis", titre: "Pont-levis : lire la configuration réelle de sshd (sshd -T | grep)",
	  appel: function(n, a, s, io){ return n === "sshd" && surBastion() && io.sudo && a.indexOf("-T") > -1 && /permitrootlogin no/.test(s); } },
	{ id: "s_h_keygen_phrase", tour: "pontlevis", titre: "Pont-levis : une clé ed25519 protégée par une phrase de passe",
	  evenement: "keygen", quand: function(e){ return e.typeCle === "ed25519" && !!e.passphrase; } },
	{ id: "s_h_x11", tour: "pontlevis", titre: "Pont-levis : plus de fenêtres X11 à travers SSH (X11Forwarding no, rechargé)",
	  monde: function(){ return /^no$/i.test(configSshEffective(H5).x11forwarding || ""); } },
	{ id: "s_h_banniere_ssh", tour: "pontlevis", titre: "Pont-levis : afficher la bannière légale avant la connexion (Banner /etc/issue.net)",
	  monde: function(){ return configSshEffective(H5).banner === "/etc/issue.net"; } },
	{ id: "s_h_grace", tour: "pontlevis", titre: "Pont-levis : pas plus d'une minute pour s'identifier (LoginGraceTime)",
	  monde: function(){ var v = secondesSsh(configSshEffective(H5).logingracetime); return v !== null && v > 0 && v <= 60; } },
	{ id: "s_h_clientalive", tour: "pontlevis", titre: "Pont-levis : couper les sessions mortes (ClientAliveInterval, ClientAliveCountMax)",
	  monde: function(){ var s = configSshEffective(H5), v = secondesSsh(s.clientaliveinterval); return v !== null && v > 0 && v <= 600 && +s.clientalivecountmax >= 1 && +s.clientalivecountmax <= 3; } },
	// Les Portes condamnées (Jean)
	{ id: "s_h_ss", tour: "portes", titre: "Portes : voir chaque porte ouverte et qui la tient (sudo ss -tulpn)",
	  appel: function(n, a, s, io){ var o = optionsLettres(a); return n === "ss" && surBastion() && io.sudo && ["t", "u", "l", "p", "n"].every(function(c){ return o.indexOf(c) > -1; }) && /users:\(\(/.test(s); } },
	{ id: "s_h_netstat", tour: "portes", titre: "Portes : le même relevé avec le vieux sort (sudo netstat -loptn)",
	  appel: function(n, a, s, io){ var o = optionsLettres(a); return n === "netstat" && surBastion() && io.sudo && ["l", "o", "p", "t", "n"].every(function(c){ return o.indexOf(c) > -1; }) && /\/sshd/.test(s); } },
	{ id: "s_h_mask", tour: "portes", titre: "Portes : murer une porte pour de bon (systemctl mask avahi-daemon)",
	  monde: function(){ return !!etatUnite(H5, "avahi-daemon").masque; } },
	{ id: "s_h_analyse_tout", tour: "portes", titre: "Portes : noter tous les services d'un coup (systemd-analyze security)",
	  evenement: "systemdSecurity", quand: function(e){ return e.hote === H5 && !e.unite && e.liste && e.liste.length > 3; } },
	{ id: "s_h_unit_files", tour: "portes", titre: "Portes : la liste de ce qui démarre avec la machine (list-unit-files --state=enabled)",
	  appel: function(n, a, s){ return n === "systemctl" && surBastion() && a.indexOf("list-unit-files") > -1 && a.some(function(x){ return /^--state=enabled/.test(x); }) && /enabled/.test(s); } },
	{ id: "s_h_cron_sandbox", tour: "portes", titre: "Portes : enfermer aussi cron (sa note descend sous 9)",
	  monde: function(){ return expositionUnite(H5, "cron").exposition < 9 && etatUnite(H5, "cron").actif; } },
	// Les Remparts (Vint)
	{ id: "s_h_ufw_numbered", tour: "remparts", titre: "Remparts : les règles numérotées, pour savoir laquelle retirer (ufw status numbered)",
	  evenement: "ufwBastion", quand: function(e){ return e.action === "status" && e.option === "numbered" && e.actif; } },
	{ id: "s_h_ufw_logging", tour: "remparts", titre: "Remparts : noter les visiteurs refusés (ufw logging on)",
	  monde: function(){ return pfCh5().ufw.journal !== "off" && pfCh5().ufw.actif; } },
	{ id: "s_h_ufw_limit", tour: "remparts", titre: "Remparts : ralentir qui insiste sur le port 22 (ufw limit)",
	  monde: function(){ return pfCh5().ufw.actif && pfCh5().ufw.regles.some(function(r){ return r.port === 22 && r.action === "limit"; }); } },
	{ id: "s_h_nft_lecture", tour: "remparts", titre: "Remparts : lire la loi telle que le noyau l'applique (sudo nft list ruleset)",
	  evenement: "nftBastion", quand: function(e){ return e.action === "list" && (e.ufw || e.charge); } },
	{ id: "s_h_https_dehors", tour: "remparts", titre: "Remparts : depuis le hall, le site HTTPS répond encore (curl -kI https://bastion/)",
	  evenement: "curl", quand: function(e){ return !!e.guet && e.hote === H5 && !!e.https && e.code === 200 && !surBastion() && parefeuCh5().filtre; } },
	{ id: "s_h_ssh_dehors", tour: "remparts", titre: "Remparts : depuis le hall, ssh bastion passe toujours, pare-feu levé",
	  evenement: "ssh", quand: function(e){ return e.host === H5 && parefeuCh5().filtre && portOuvertCh5(22, "tcp"); } },
	// La Salle des Coffres (Evelyn)
	{ id: "s_h_find_suid", tour: "coffres", titre: "Coffres : chercher tous les passe-partout (find / -perm -4000)",
	  appel: function(n, a, s){ return n === "find" && surBastion() && a.some(function(x){ return /^-?(4000|u=s|\/4000)$/.test(x); }) && /\/usr\/bin\/passwd/.test(s); } },
	{ id: "s_h_find_ww", tour: "coffres", titre: "Coffres : chercher les fichiers que tout le monde peut modifier (find / -perm -0002 -type f)",
	  appel: function(n, a, s){ return n === "find" && surBastion() && a.some(function(x){ return /^-?(0002|002|o\+w|\/o\+w|\/0002)$/.test(x); }) && a.indexOf("-type") > -1; } },
	{ id: "s_h_getcap", tour: "coffres", titre: "Coffres : relever toutes les capacités de la machine (getcap -r /)",
	  appel: function(n, a, s){ return n === "getcap" && surBastion() && a.indexOf("-r") > -1 && /cap_net_raw/.test(s); } },
	{ id: "s_h_findmnt", tour: "coffres", titre: "Coffres : vérifier les options de /tmp (findmnt /tmp)",
	  appel: function(n, a, s){ return n === "findmnt" && surBastion() && a.indexOf("/tmp") > -1 && /noexec/.test(s); } },
	{ id: "s_h_noexec", tour: "coffres", titre: "Coffres : constater qu'un script de /tmp ne s'exécute plus (noexec)",
	  evenement: "noexec", quand: function(e){ return e.hote === H5 && /^\/tmp\//.test(e.chemin || ""); } },
	{ id: "s_h_ls_shadow", tour: "coffres", titre: "Coffres : lire les droits de /etc/shadow, rw-r----- (ls -l)",
	  appel: function(n, a, s){ return n === "ls" && surBastion() && a.indexOf("-l") > -1 && /rw-r-----.*shadow/.test(s); } },
	// Le Cœur (Edsger)
	{ id: "s_h_sysctl_a", tour: "coeur", titre: "Cœur : passer tous les leviers en revue (sysctl -a | grep redirects)",
	  appel: function(n, a, s){ return n === "sysctl" && surBastion() && a.indexOf("-a") > -1 && /accept_redirects/.test(s); } },
	{ id: "s_h_lsmod", tour: "coeur", titre: "Cœur : regarder les pièces chargées dans le noyau (lsmod)",
	  appel: function(n, a, s){ return n === "lsmod" && surBastion() && /Module\s+Size/.test(s); } },
	{ id: "s_h_core", tour: "coeur", titre: "Cœur : interdire les vidages mémoire (* hard core 0 dans limits.conf)",
	  monde: function(){ return controleLynisOk("KRNL-5820") === true; } },
	{ id: "s_h_modprobe_n", tour: "coeur", titre: "Cœur : demander à blanc ce que ferait modprobe usb-storage (modprobe -n -v)",
	  evenement: "modprobe", quand: function(e){ return e.hote === H5 && e.action === "dry-run" && e.bloque === true; } },
	{ id: "s_h_fs_rares", tour: "coeur", titre: "Cœur : interdire les systèmes de fichiers rares (cramfs, freevxfs, jffs2, hfs, hfsplus, udf)",
	  monde: function(){ return controleLynisOk("FILE-6430") === true; } },
	{ id: "s_h_protocoles", tour: "coeur", titre: "Cœur : interdire les protocoles réseau inutiles (dccp, sctp, rds, tipc)",
	  monde: function(){ return controleLynisOk("NETW-3200") === true; } },
	// La Poterne (Joan)
	{ id: "s_h_luks_status", tour: "poterne", titre: "Poterne : vérifier que le disque est chiffré (cryptsetup status)",
	  appel: function(n, a, s, io){ return n === "cryptsetup" && surBastion() && a.indexOf("status") > -1 && /is active/.test(s); } },
	{ id: "s_h_luksdump", tour: "poterne", titre: "Poterne : lire l'en-tête LUKS du disque (cryptsetup luksDump)",
	  appel: function(n, a, s){ return n === "cryptsetup" && surBastion() && a.indexOf("luksDump") > -1 && /LUKS header information/.test(s); } },
	{ id: "s_h_isluks", tour: "poterne", titre: "Poterne : demander si /dev/sda3 est bien un volume LUKS (cryptsetup isLuks -v)",
	  appel: function(n, a, s){ return n === "cryptsetup" && surBastion() && a.indexOf("isLuks") > -1 && /Command successful/.test(s); } },
	{ id: "s_h_grub_iter", tour: "poterne", titre: "Poterne : un hash plus coûteux à deviner (grub-mkpasswd-pbkdf2 -c 100000)",
	  evenement: "grubMdp", quand: function(e){ return e.ok && e.iterations >= 100000; } },
	{ id: "s_h_mkconfig", tour: "poterne", titre: "Poterne : relire ce que GRUB fabriquerait (grub-mkconfig | grep superusers)",
	  appel: function(n, a, s){ return n === "grub-mkconfig" && surBastion() && /set superusers=/.test(s); } },
	{ id: "s_h_ctrl_verif", tour: "poterne", titre: "Poterne : vérifier que Ctrl+Alt+Suppr est muré (systemctl is-enabled)",
	  appel: function(n, a, s){ return n === "systemctl" && surBastion() && a.indexOf("is-enabled") > -1 && a.some(function(x){ return /ctrl-alt-del/.test(x); }) && /masked/.test(s); } },
	// La Bannière (Robert)
	{ id: "s_h_x509", tour: "banniere", titre: "Bannière : lire les dates du vieux sceau (openssl x509 -noout -dates)",
	  evenement: "x509", quand: function(e){ return e.expire === true && surBastion(); } },
	{ id: "s_h_tls11", tour: "banniere", titre: "Bannière : TLS 1.1 refusé (openssl s_client -tls1_1)",
	  evenement: "s_client", quand: function(e){ return e.hote === H5 && e.protocole === "TLSv1.1" && !e.ok; } },
	{ id: "s_h_tls12", tour: "banniere", titre: "Bannière : TLS 1.2 accepté, certificat vérifié (openssl s_client -tls1_2)",
	  evenement: "s_client", quand: function(e){ return e.hote === H5 && e.protocole === "TLSv1.2" && e.ok && e.verification === 0; } },
	{ id: "s_h_apache_M", tour: "banniere", titre: "Bannière : la liste des modules chargés (apachectl -M)",
	  evenement: "apachectl", quand: function(e){ return e.hote === H5 && e.action === "-M" && e.ok; } },
	{ id: "s_h_trace", tour: "banniere", titre: "Bannière : la méthode TRACE refusée (curl -X TRACE, réponse 405)",
	  evenement: "curl", quand: function(e){ return !!e.guet && e.hote === H5 && e.methode === "TRACE" && e.code === 405; } },
	{ id: "s_h_hsts", tour: "banniere", titre: "Bannière : l'en-tête HSTS dans la réponse (curl -kI https://bastion/)",
	  evenement: "curl", quand: function(e){ return !!e.guet && e.hote === H5 && !!e.https && e.enTetes && !!(e.enTetes["Strict-Transport-Security"] || e.enTetes["strict-transport-security"]); } },
	// La Tour de Guet (Katherine)
	{ id: "s_h_ausearch", tour: "guet", titre: "Guet : retrouver les écritures sur les comptes (sudo ausearch -k)",
	  evenement: "ausearch", quand: function(e){ return e.hote === H5 && !!e.cle && e.nombre > 0; } },
	{ id: "s_h_aureport", tour: "guet", titre: "Guet : le résumé du registre d'audit (sudo aureport)",
	  evenement: "aureport", quand: function(e){ return e.hote === H5; } },
	{ id: "s_h_logger", tour: "guet", titre: "Guet : écrire une ligne au journal (logger -t) et la retrouver (sudo journalctl -t)",
	  monde: function(){ return !!sCh5().loggerRetrouve; } },
	{ id: "s_h_rsyslog_distant", tour: "guet", titre: "Guet : envoyer les journaux à la machine journaux, au loin (rsyslog, @@journaux:514)",
	  monde: function(){ return controleLynisOk("LOGG-2154") === true; } },
	{ id: "s_h_logrotate", tour: "guet", titre: "Guet : faire tourner le registre à blanc (logrotate -d)",
	  evenement: "logrotate", quand: function(e){ return e.hote === H5 && e.debug; } },
	{ id: "s_h_auditctl_l", tour: "guet", titre: "Guet : lister les règles d'audit chargées (sudo auditctl -l)",
	  appel: function(n, a, s, io){ return n === "auditctl" && surBastion() && io.sudo && a.indexOf("-l") > -1 && /-w \/etc\/passwd/.test(s); } },
	// Les Sceaux d'intégrité (Ralph)
	{ id: "s_h_debsums", tour: "sceaux", titre: "Sceaux : comparer chaque fichier à son paquet (sudo debsums -s)",
	  appel: function(n, a, s, io){ return n === "debsums" && surBastion() && io.sudo && a.indexOf("-s") > -1; } },
	{ id: "s_h_dpkg_V", tour: "sceaux", titre: "Sceaux : la même vérification avec dpkg (sudo dpkg -V)",
	  evenement: "dpkgVerify", quand: function(e){ return e.hote === H5; } },
	{ id: "s_h_dpkg_S", tour: "sceaux", titre: "Sceaux : retrouver le paquet d'un fichier (dpkg -S /usr/bin/ps)",
	  evenement: "dpkg", quand: function(e){ return e.hote === H5 && e.action === "S" && /\/usr\/bin\/ps/.test(e.motif || ""); } },
	{ id: "s_h_rkhunter", tour: "sceaux", titre: "Sceaux : passer le chasseur de rootkits (sudo rkhunter --check --sk)",
	  evenement: "rkhunter", quand: function(e){ return e.hote === H5; } },
	{ id: "s_h_etckeeper", tour: "sceaux", titre: "Sceaux : garder la mémoire de /etc (sudo etckeeper commit)",
	  evenement: "etckeeper", quand: function(e){ return e.hote === H5 && e.action === "commit"; } },
	{ id: "s_h_aide_update", tour: "sceaux", titre: "Sceaux : valider les changements voulus dans la base (aide --update, puis la mettre en place)",
	  monde: function(){ var c = sCh5(), b = baseAideCh5(); if (!c.aideUpdate || !b) return false; var d = comparerAide(b, inventaireAide()); return !d.ajoutes.length && !d.retires.length && !d.changes.length; } },
	// La Garde (Adele)
	{ id: "s_h_f2b_status", tour: "garde", titre: "Garde : l'état de la prison sshd (sudo fail2ban-client status sshd)",
	  evenement: "fail2ban", quand: function(e){ return e.hote === H5 && e.action === "status" && e.jail === "sshd"; } },
	{ id: "s_h_f2b_get", tour: "garde", titre: "Garde : demander une valeur à la sentinelle (fail2ban-client get sshd maxretry)",
	  evenement: "fail2ban", quand: function(e){ return e.hote === H5 && e.action === "get" && e.jail === "sshd"; } },
	{ id: "s_h_f2b_vint", tour: "garde", titre: "Garde : libérer le poste de Vint, banni par erreur (fail2ban-client set sshd unbanip)",
	  monde: function(){ var c = sCh5(), f = etatHote(H5).f2b; return !!c.vintBanni && !((f.bannis.sshd || []).indexOf(IP_VINT) > -1); } },
	{ id: "s_h_aa_status", tour: "garde", titre: "Garde : la liste des cellules AppArmor (sudo aa-status)",
	  evenement: "apparmor", quand: function(e){ return e.hote === H5 && e.action === "status"; } },
	{ id: "s_h_aa_tous", tour: "garde", titre: "Garde : tous les profils AppArmor en enforce (rsyslogd aussi)",
	  monde: function(){ return controleLynisOk("MACF-6208") === true; } },
	{ id: "s_h_bantime", tour: "garde", titre: "Garde : bannir une heure au moins (bantime, rechargé)",
	  monde: function(){ var j = etatHote(H5).f2b.conf && etatHote(H5).f2b.conf.sshd; return !!j && (j.bantime >= 3600 || j.bantime === -1); } },
	// Les défis d'honneur (Laurent)
	{ id: "s_h_avant_quatre", tour: "honneur", titre: "Honneur : les douze tours fermées avant 4 h" },
	{ id: "s_h_sans_indice", tour: "honneur", titre: "Honneur : remettre le rapport sans avoir acheté un seul indice" }
];
DEFIS_BASTION.forEach(function(d){ QUETES_SECONDAIRES_CH5.push({ id: d.id, titre: d.titre }); });
function defisTour(cle){ return DEFIS_BASTION.filter(function(d){ return d.tour === cle; }); }
function idsDefisTour(cle){ return defisTour(cle).map(function(d){ return d.id; }); }
function listeDefisTour(cle){
	return defisTour(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}
function reussirDefiBastion(id){
	if (!bastionOuvert() || state.quests[id]) return;
	state.complete(id);
}

/* Les sorts lancés (et leur sortie), une fois qu'ils ont réussi. */
var APPELER_AVANT_BASTION_DEFIS = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_BASTION_DEFIS.apply(this, arguments);
	if (bastionOuvert()){
		try { effetBastion(nom, args || [], typeof sortie === "string" ? sansAnsi(sortie) : "", io || {}); }
		catch (e){ /* un défi ne doit jamais casser un sort */ }
	}
	return sortie;
};
function effetBastion(nom, args, sortie, io){
	DEFIS_BASTION.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args, sortie, io)) reussirDefiBastion(d.id); });
	var c = sCh5();
	if (!surBastion()) return;
	if (nom === "pwck" && args.indexOf("-r") > -1 && io.sudo) c.pwckVu = true;
	if (nom === "grpck" && args.indexOf("-r") > -1 && io.sudo) c.grpckVu = true;
	if (nom === "journalctl" && c.loggerTag && args.indexOf("-t") > -1 && args.indexOf(c.loggerTag) > -1 && sortie.indexOf(c.loggerMessage || "\u0000") > -1) c.loggerRetrouve = true;
}
/* Les défis qui se lisent dans un événement du moteur. */
(function(){
	var types = {};
	DEFIS_BASTION.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!bastionOuvert()) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiBastion(d.id); } catch (x){} });
		});
	});
})();
GameEvents.addListener("lastlog", function(e){ if (bastionOuvert() && e.host === H5 && (e.dormants || []).indexOf("stagiaire") > -1) sCh5().dormantVu = true; });
GameEvents.addListener("logger", function(e){ if (bastionOuvert() && e.hote === H5 && e.tag){ sCh5().loggerTag = e.tag; sCh5().loggerMessage = String(e.message || "").split("\n")[0]; } });
GameEvents.addListener("aide", function(e){ if (bastionOuvert() && e.hote === H5 && e.action === "update") sCh5().aideUpdate = true; });

/* ------------------------------------------------------------------ */
/* Les douze maîtres, vivants                                          */
/* ------------------------------------------------------------------ */

function maitreBastion(nom, image){ return new Item(nom, "", image).personnage(); }
function texteMaitreBastion(m){
	var t = tourCh5(m.tour), e1 = aFait(t.etapes[0]), e2 = aFait(t.etapes[1]);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouh]/.test(m.nom) ? "d'" : "de ") + m.nom) + C.gris(" (des quêtes secondaires, sur bastion)") + "\n" + listeDefisTour(m.tour);
	if (e1 && e2) return m.fin() + defis;
	var erreur = null;
	try { erreur = m.erreur ? m.erreur() : null; } catch (x){ erreur = null; }
	var corps = (e1 || e2) ? m.entre(e1) : m.entree() + "\n\n" + m.image() + "\n\n" + m.syntaxe() + "\n\n" + m.mission();
	return corps + (erreur ? "\n\n" + C.jaune(erreur) : "") + "\n\n" + C.gris(m.metier) + defis;
}

var MAITRES_BASTION = {
	herse: { nom: "Fernando", tour: "herse",
		metier: "Le métier : les comptes, c'est le premier chapitre de tout audit. Un compte sans mot de passe ou un second root, et le reste du durcissement ne sert à rien.",
		entree: function(){ return "Fernando lève la herse d'un tour de manivelle, juste assez pour te laisser passer, puis la redescend aussitôt. « C'est moi qui ai inventé le mot de passe, tu sais. Enfin, presque. Assieds-toi. »"; },
		image: function(){ return "« La herse, c'est la liste des comptes : /etc/passwd dit qui existe, /etc/shadow garde l'empreinte de chaque mot de passe. " +
			"Un barreau sans serrure, c'est un compte sans mot de passe. Deux clés du donjon, c'est deux comptes d'UID 0, deux root. Et la herse doit se bloquer quand on la secoue trop : c'est le verrouillage après échecs (pam_faillock). »"; },
		syntaxe: function(){ return "« Les gestes, sur bastion :\n\n" +
			"  sudo awk -F: '$2 == \"\"' /etc/shadow       les comptes dont l'empreinte est vide\n" +
			"  awk -F: '$3 == 0' /etc/passwd             les comptes d'UID 0\n" +
			"  sudo passwd -l NOM ;  sudo userdel NOM    verrouiller ; supprimer\n" +
			"  /etc/security/faillock.conf : deny = 5    bloquer après 5 échecs ; sudo faillock --user NOM pour lire le registre\n" +
			"  /etc/login.defs : PASS_MAX_DAYS 90         la durée de vie des NOUVEAUX mots de passe\n" +
			"  sudo chage -M 90 NOM ;  chage -l NOM      celle d'un compte qui existe déjà ; la lire\n" +
			"  sudo usermod -s /usr/sbin/nologin NOM     un compte de service n'a pas besoin de shell\n" +
			"  lastlog ;  last ;  pwck -r ;  grpck -r     les dernières connexions ; la cohérence des fichiers\n\n" +
			"Le piège : login.defs ne change rien aux comptes qui existent déjà. Il faut aussi chage. »"; },
		mission: function(){ return "« Ta mission : plus un compte sans mot de passe, plus un second root. Puis les règles : verrouillage après cinq échecs, " +
			"des mots de passe qui expirent à 90 jours (dans login.defs, et pour chaque administrateur du groupe sudo), et pas de shell pour les comptes de service (ceux dont l'UID est sous 1000). »"; },
		entre: function(premier){ return premier ? "Fernando tâte les barreaux un à un. « Plus de barreau sans serrure, plus de double clé. Maintenant les règles : faillock, PASS_MAX_DAYS et chage, et des comptes de service sans shell. »" :
			"Fernando hoche la tête. « Les règles sont posées. Mais il reste un barreau sans serrure, ou une double clé : regarde /etc/shadow et /etc/passwd. »"; },
		erreur: function(){
			var c = comptesCh5();
			var racines = (c.passwd || []).filter(function(p){ return +p.uid === 0; });
			if (!aFait("h_comptes_vides") && racines.length > 1){
				var autre = racines.filter(function(p){ return p.nom !== "root"; })[0], sh = shadowDe(H5, autre.nom);
				if (sh && /^!/.test(sh.mdp)) return "Fernando secoue la tête. « Tu as verrouillé " + autre.nom + ", mais son UID est toujours 0 : c'est toujours une clé du donjon. Supprime-le (userdel), ou rends-lui un UID ordinaire. »";
			}
			if (!aFait("h_comptes_regles") && aFait("h_comptes_vides")){
				var max = +loginDefs(H5).PASS_MAX_DAYS;
				if (max >= 1 && max <= 90 && membresDe("sudo").some(function(n){ var s = shadowDe(H5, n); return s && mdpUtilisable(s.mdp) && !(+s.max >= 1 && +s.max <= 90); }))
					return "« login.defs est réglé, mais les administrateurs existaient déjà : leurs mots de passe n'expirent toujours pas. chage -M 90, compte par compte (groupe sudo). »";
				if (/^\s*#\s*deny/m.test(T5("/etc/security/faillock.conf") || "") && !/^\s*deny\s*=/m.test(T5("/etc/security/faillock.conf") || "")) return "« La ligne deny de faillock.conf est encore en commentaire : retire le # devant. »";
			}
			return null;
		},
		fin: function(){ return "Fernando laisse retomber la herse, satisfait du bruit qu'elle fait. « Pas un barreau ne bouge.\n\n" +
			"Un jour, j'ai audité un serveur de paie. Tout était parfait, sauf un compte « test » créé à l'installation, sans mot de passe. Il avait sept ans. " +
			"Personne ne s'en servait, personne ne le voyait, et n'importe qui pouvait l'ouvrir. Depuis, je commence toujours par /etc/shadow. »"; }
	},
	sceau: { nom: "Butler", tour: "sceau",
		metier: "Le métier : le moindre privilège. Chacun reçoit les droits dont il a besoin, pas un de plus, et pas sans mot de passe.",
		entree: function(){ return "Butler fait fondre un bâton de cire rouge au-dessus d'une bougie, et laisse tomber une goutte sur un parchemin. Il y appose un sceau, d'un geste sec. « Personne ne parle au nom du roi sans ce sceau. »"; },
		image: function(){ return "« Le sceau du roi, c'est sudo : il permet de parler au nom de root. Le registre de ceux qui ont le droit, c'est /etc/sudoers et le dossier /etc/sudoers.d. " +
			"NOPASSWD: ALL, c'est donner le sceau à quelqu'un, et le laisser s'en servir sans même dire son nom. Et les roues du temps (cron, at) sont un autre sceau : qui programme une tâche décide de ce qui tournera cette nuit. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sudo -l ;  sudo -l -U NOM                 tes droits ; ceux d'un autre compte\n" +
			"  sudo visudo -c                            vérifie tout le registre, fichier par fichier\n" +
			"  sudo visudo -f /etc/sudoers.d/NOM          édite un fichier du registre, vérifié avant d'être enregistré\n" +
			"  sudo chmod 440 /etc/sudoers.d/NOM         le registre se lit, ne s'écrit pas (sudo ignore un fichier modifiable par tous)\n" +
			"  NOM ALL=(root) /usr/bin/systemctl restart apache2     une règle étroite : une seule commande\n" +
			"  /etc/cron.allow ; /etc/at.allow           s'ils existent, seuls les comptes qu'ils nomment peuvent programmer\n\n" +
			"Garde toujours une session root ouverte quand tu touches au registre : une faute, et sudo ne répond plus. »"; },
		mission: function(){ return "« Ta mission : plus de NOPASSWD: ALL nulle part, et chaque fichier de /etc/sudoers.d en 0440. sudo doit toujours marcher pour toi. " +
			"Ensuite, les roues du temps : cron et at réservés à root et à toi. »"; },
		entre: function(premier){ return premier ? "Butler range la cire. « Le registre est propre. Reste le temps : /etc/cron.allow et /etc/at.allow, root et toi. »" :
			"« Les roues sont gardées. Mais le registre ne l'est pas : un NOPASSWD: ALL, ou un fichier aux droits trop larges. »"; },
		erreur: function(){
			if (!verifierSudoers(H5).ok) return "Butler pâlit. « Le registre a une faute : sudo visudo -c te dira laquelle. Corrige-la avec visudo, tant que tu as encore la main. »";
			if (!aFait("h_sudo") && controleLynisOk("AUTH-9252") === true && controleLynisOk("AUTH-9254") === false) return "« La règle est corrigée, mais un fichier de /etc/sudoers.d n'est pas en 0440. »";
			if (!aFait("h_planif") && T5("/etc/cron.allow") !== null && T5("/etc/at.allow") === null) return "« cron.allow est là. Et at.allow ? Les deux roues. »";
			return null;
		},
		fin: function(){ return "Butler souffle la bougie. « Le sceau est en de bonnes mains.\n\n" +
			"J'ai connu un prestataire qui avait mis NOPASSWD: ALL « pour ses scripts de déploiement ». Le jour où son compte a fuité, le voleur n'a même pas eu besoin du mot de passe pour devenir root. " +
			"Une règle étroite, une commande, et la fuite n'aurait coûté qu'un redémarrage d'Apache. »"; }
	},
	pontlevis: { nom: "Tatu", tour: "pontlevis",
		metier: "Le métier : on ne touche jamais à la configuration SSH d'un serveur distant sans garder une session ouverte, et sans sshd -t. Le jour où on l'oublie, on prend le train pour aller brancher un clavier.",
		entree: function(){ return "Tatu donne un tour de treuil : les chaînes grincent, le pont-levis remonte d'une coudée. « J'ai écrit le premier SSH en une après-midi, après une attaque sur mon université. Ce pont-là, je le connais par cœur. »"; },
		image: function(){ return "« Le pont-levis, c'est SSH : le seul passage vers le Bastion depuis l'extérieur. Root ne doit jamais le traverser en personne (PermitRootLogin no). " +
			"Les mots de passe se devinent : on ne laisse passer que les clés (PasswordAuthentication no). Une liste des voyageurs autorisés (AllowUsers), trois essais au plus (MaxAuthTries). " +
			"Et la langue qu'on parle sur le pont doit être moderne : les algorithmes de chiffrement (Ciphers), d'intégrité (MACs) et d'échange de clés (KexAlgorithms). »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  /etc/ssh/sshd_config.d/50-bastion.conf    un fichier à toi ; la PREMIÈRE valeur lue l'emporte\n" +
			"  sudo sshd -t                              vérifie la configuration (rien : tout va bien)\n" +
			"  sudo systemctl reload ssh                 l'applique, sans couper les sessions ouvertes\n" +
			"  sudo sshd -T | grep -i permitrootlogin    la configuration telle que sshd la comprend\n" +
			"  ssh-keygen -t ed25519 ;  ssh-copy-id bastion    ta clé ; la poser sur bastion (depuis le hall)\n\n" +
			"L'ordre est sacré : ta clé d'abord, puis sshd -t, puis reload. Un reload refusé laisse l'ancienne configuration en place : vérifie toujours. »"; },
		mission: function(){ return "« Ta mission : root ne passe plus, les mots de passe non plus, une liste de voyageurs qui te nomme, trois essais au plus. Testé, puis rechargé. " +
			"Ensuite, des algorithmes modernes, explicitement choisis (Ciphers, MACs, KexAlgorithms), et ta clé ed25519 posée sur bastion. »"; },
		entre: function(premier){ return premier ? "Tatu tend l'oreille vers les chaînes. « Plus de root, plus de mots de passe. Maintenant la langue du pont : Ciphers, MACs, KexAlgorithms modernes, et ta clé ed25519. sshd -t, reload. »" :
			"« La langue est moderne. Mais root et les mots de passe passent encore : PermitRootLogin, PasswordAuthentication, AllowUsers, MaxAuthTries. »"; },
		erreur: function(){
			var v = verifierSshd(H5);
			if (!v.ok) return "Tatu fronce les sourcils. « sshd -t refuserait ta configuration : " + (v.erreurs[0] || "une faute") + ". Ne recharge surtout pas avant d'avoir corrigé. »";
			var disque = configSshFichiers(H5), vivant = configSshEffective(H5);
			if (disque.permitrootlogin !== vivant.permitrootlogin || disque.passwordauthentication !== vivant.passwordauthentication) return "« Ton fichier est juste, mais sshd tourne toujours avec l'ancienne configuration : sshd -t, puis systemctl reload ssh. »";
			var c = sCh5();
			if (c.sshApplique && c.sshApplique !== c.sshAppliqueTeste) return "« Tu as rechargé sans passer par sshd -t. Ça a marché, cette fois. Refais-le dans l'ordre : sshd -t, PUIS reload. »";
			if (!aFait("h_ssh_algos") && !clesDuJoueurCh5().length) return "« Tu n'as pas encore de clé ed25519 : ssh-keygen -t ed25519, dans ta Maison. »";
			if (!aFait("h_ssh_algos") && !cleEd25519Installee()) return "« Ta clé n'est pas posée sur bastion : depuis le hall, ssh-copy-id bastion. »";
			return null;
		},
		fin: function(){ return "Tatu bloque le treuil. « Le pont est levé, et seuls passent ceux qui ont une clé.\n\n" +
			"Un soir, un collègue a mis PasswordAuthentication no sur un serveur à six cents kilomètres, sans avoir posé sa clé. Il a rechargé, fermé sa session, et s'est retrouvé dehors. " +
			"Il a pris le premier train du matin. Depuis, dans mon équipe, on garde une session ouverte, et on teste depuis une autre. »"; }
	},
	portes: { nom: "Jean", tour: "portes",
		metier: "Le métier : la surface d'attaque, c'est tout ce qui écoute. Le meilleur durcissement d'un service inutile, c'est de l'arrêter, de le désactiver, et de désinstaller son paquet.",
		entree: function(){ return "Jean longe le mur, une craie à la main, et trace une croix sur chaque porte qu'il ferme. Il en reste beaucoup sans croix. « Bonsoir. Tu vois toutes ces portes ? La moitié ne mène nulle part. »"; },
		image: function(){ return "« Chaque porte du mur, c'est un service qui écoute sur un port. telnet, une porte en papier : tout y passe en clair. rpcbind, avahi : des portes de service que personne n'utilise ici. " +
			"Condamner une porte, c'est l'arrêter ET l'empêcher de revenir au démarrage (disable --now), ou la murer (mask). Et une porte qu'on garde, Apache, on l'enferme dans un sas : le bac à sable de systemd. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sudo ss -tulpn ;  sudo netstat -loptn      qui écoute, sur quel port, quel programme (l'ancien et le nouveau sort)\n" +
			"  sudo systemctl disable --now NOM          arrêter maintenant ET au démarrage\n" +
			"  sudo systemctl mask NOM                   murer : plus rien ne peut la démarrer\n" +
			"  sudo apt purge PAQUET                     le programme et sa configuration disparaissent\n" +
			"  systemd-analyze security apache2          la note du sas, de 0 (sûr) à 10 (grand ouvert)\n" +
			"  sudo systemctl edit apache2               un fichier override.conf : [Service], NoNewPrivileges=yes, PrivateTmp=yes, ProtectSystem=full\n" +
			"  sudo systemctl daemon-reload              systemd relit ses unités (systemctl edit le fait pour toi)\n\n" +
			"stop seul ne suffit pas : au prochain démarrage, la porte se rouvre. »"; },
		mission: function(){ return "« Ta mission : telnet, rpcbind et avahi se taisent, maintenant et au démarrage, et le paquet telnetd s'en va. " +
			"Puis Apache dans son sas : NoNewPrivileges, PrivateTmp, ProtectSystem, et sa note doit passer sous 9. »"; },
		entre: function(premier){ return premier ? "Jean range sa craie. « Les portes inutiles sont condamnées. Reste Apache : un sas systemd, et une note qui descend. »" :
			"« Apache est dans son sas. Mais des portes inutiles sont encore ouvertes : ss -tulpn. »"; },
		erreur: function(){
			var arretes = ["telnet.socket", "rpcbind", "avahi-daemon"].filter(function(u){ var e = etatUnite(H5, u); return e.existe && !e.actif && e.enabled && !e.masque; });
			if (!aFait("h_portes") && arretes.length) return "Jean pointe une porte. « " + arretes.join(", ") + " : arrêté, mais encore activé au démarrage. disable --now, pas seulement stop. »";
			if (!aFait("h_sandbox") && F5("/etc/systemd/system/apache2.service.d/override.conf") && typeof changeSurDisque === "function" && changeSurDisque(H5, "apache2.service")) return "« Ton override.conf est sur le disque, mais systemd ne l'a pas relu : sudo systemctl daemon-reload. »";
			return null;
		},
		fin: function(){ return "Jean trace la dernière croix. « Il ne reste que les portes qui servent.\n\n" +
			"Au début de ma carrière, j'ai trouvé sur un serveur de production un service d'impression, installé par défaut, jamais utilisé. C'est par lui qu'on était entrés. " +
			"Personne ne savait même qu'il tournait. Depuis, à chaque installation, je commence par ss -tulpn, et je ferme tout ce que je ne sais pas justifier. »"; }
	},
	remparts: { nom: "Vint", tour: "remparts",
		metier: "Le métier : un pare-feu se pose dans cet ordre : la politique (tout refuser), les exceptions (22, 443), l'activation. Et on vérifie depuis l'extérieur, jamais seulement depuis la machine.",
		entree: function(){ return "Vint a encore du sable dans les chaussures et un coup de soleil sur le nez. « Ah, la recrue ! On m'a raconté la panne. Désolé pour les vacances. » Il te tend une longue-vue. « Regarde les remparts : pas une meurtrière n'est fermée. »"; },
		image: function(){ return "« Les remparts, c'est le pare-feu de la machine. La règle d'or est gravée au-dessus de la porte : tout refuser en entrée, sauf ce qui doit passer (la politique « deny incoming », puis des exceptions). " +
			"ufw est la main qui écrit les règles ; nftables, la loi que le noyau applique. Et il y a un piège : si tu fermes tout avant d'ouvrir le 22, tu fermes la porte derrière laquelle tu te trouves. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sudo ufw status verbose                   la politique, la journalisation, les règles\n" +
			"  sudo ufw default deny incoming            la politique : tout refuser en entrée\n" +
			"  sudo ufw allow 22/tcp                     une exception (ssh) ; et 443/tcp pour le site HTTPS\n" +
			"  sudo ufw enable                           l'activer (EN DERNIER)\n" +
			"  sudo ufw status numbered ;  sudo ufw delete N     les règles numérotées ; en retirer une\n" +
			"  sudo nft list ruleset                     la loi telle que le noyau l'applique\n" +
			"  (ou nftables directement : /etc/nftables.conf, chaîne input en « policy drop », tcp dport { 22, 443 } accept, puis sudo nft -f /etc/nftables.conf)\n\n" +
			"Avant la panne, j'avais ouvert le port 80 pour un essai. Je crois qu'il l'est encore. »"; },
		mission: function(){ return "« Ta mission : tout refuser en entrée, sauf SSH (22) et HTTPS (443), sans te couper toi-même. " +
			"Ensuite, vérifie : seuls 22 et 443 doivent répondre. Lis la loi (ufw status verbose ou nft list ruleset), puis éprouve-la depuis le hall, comme Frances : curl -I http://bastion/ ne doit plus rien recevoir. »"; },
		entre: function(premier){ return premier ? "Vint plisse les yeux dans sa longue-vue. « Les remparts sont levés. Mais ma vieille règle du port 80 ? Vérifie, retire-la, lis la loi, et éprouve depuis le hall. »" :
			"« La vérification est faite, mais les remparts ne sont plus levés. ufw status verbose. »"; },
		erreur: function(){
			var u = pfCh5().ufw;
			if (!aFait("h_parefeu") && u.actif && u.entree === "allow") return "Vint secoue la tête. « ufw est actif, mais sa politique laisse tout entrer : ufw default deny incoming. »";
			if (!aFait("h_parefeu") && u.entree !== "allow" && !u.actif && u.regles.some(function(r){ return r.port === 22; })) return "« La politique et les exceptions sont prêtes. Il ne reste qu'à activer : sudo ufw enable. »";
			if (aFait("h_parefeu") && !aFait("h_parefeu_verif") && portOuvertCh5(80, "tcp")) return "« Le port 80 répond encore : ma vieille règle. ufw status numbered, puis ufw delete. »";
			if (aFait("h_parefeu") && !aFait("h_parefeu_verif") && !sCh5().parefeuEprouve) return "« Éprouve-le de l'extérieur : exit, puis, depuis le hall, curl -I http://bastion/. »";
			return null;
		},
		fin: function(){ return "Vint replie sa longue-vue. « Les remparts tiennent. Tu fais ça mieux que moi.\n\n" +
			"La dernière fois que j'ai activé un pare-feu à distance, j'ai tapé ufw enable avant ufw allow 22. La session est restée ouverte (les connexions établies passent), " +
			"alors je n'ai rien vu. J'ai fermé mon terminal. Et je suis parti en vacances. Tu connais la suite : c'était la veille de la panne. »"; }
	},
	coffres: { nom: "Evelyn", tour: "coffres",
		metier: "Le métier : un fichier modifiable par tous dans /etc ou /usr, un SUID inattendu, une capacité de trop : ce sont des élévations de privilèges qui attendent leur heure.",
		entree: function(){ return "Evelyn fait tourner un trousseau de clés autour de son doigt. Elle s'arrête devant un coffre entrouvert. « Celui-là, n'importe qui peut l'ouvrir. Et celui-ci... » Elle soulève un passe-partout couvert de poussière. « Ça, ça n'a rien à faire ici. »"; },
		image: function(){ return "« Chaque coffre a ses serrures : les droits du fichier (r, w, x, pour le propriétaire, le groupe, les autres). /etc/shadow ne s'ouvre qu'à root et au groupe shadow (640). " +
			"Un coffre que tout le monde peut modifier (o+w), c'est une lettre que n'importe qui peut réécrire. Les passe-partout, ce sont les programmes SUID (ils tournent avec les droits de leur propriétaire) " +
			"et les capacités (des morceaux du pouvoir de root, comme cap_setuid). Et la salle /tmp, où tout le monde dépose : il lui faut le sticky bit (chacun ne retire que ses affaires) et noexec (rien n'y s'exécute). »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  ls -l /etc/shadow ;  sudo chmod 640 /etc/shadow\n" +
			"  find / -perm -0002 -type f                les fichiers modifiables par tous ; chmod o-w pour les refermer\n" +
			"  find / -perm -4000                        les SUID ; chmod u-s pour retirer le bit\n" +
			"  sudo chmod 1777 /tmp                      le sticky bit (le t de rwxrwxrwt)\n" +
			"  getcap -r / ;  sudo setcap -r FICHIER     les capacités ; les retirer\n" +
			"  tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0    une ligne de /etc/fstab ; puis sudo mount /tmp\n" +
			"  findmnt /tmp                              les options de /tmp, telles que montées\n" +
			"  UMASK 027 dans /etc/login.defs            les fichiers neufs ne sont plus lisibles par les autres »"; },
		mission: function(){ return "« Ta mission : /etc/shadow en 640, plus un fichier système modifiable par tous, le sticky bit sur /tmp, plus un SUID inattendu. " +
			"Puis les pouvoirs cachés : la capacité dangereuse retirée, /tmp monté en nodev,nosuid,noexec, et un umask 027 par défaut. »"; },
		entre: function(premier){ return premier ? "Evelyn referme le coffre d'un claquement. « Les serrures sont justes. Maintenant les pouvoirs cachés : capacités, /tmp en noexec, umask. »" :
			"« Les pouvoirs cachés sont partis. Mais il reste des serrures trop lâches : shadow, find -perm, sticky bit, SUID. »"; },
		erreur: function(){
			var tmp = dossierHote(H5, "/tmp");
			if (!aFait("h_droits") && tmp && tmp.mode === "rwxr-xr-x") return "Evelyn soupire. « Tu as retiré l'écriture de /tmp pour tout le monde : plus personne ne peut y déposer. Il fallait 1777 : tout le monde écrit, chacun ne retire que ses affaires. »";
			if (!aFait("h_capacites") && /^\s*\S+\s+\/tmp\s/m.test(T5("/etc/fstab") || "") && !montages(H5).some(function(m){ return m.cible === "/tmp"; })) return "« La ligne est dans fstab, mais /tmp n'est pas monté : sudo mount /tmp. »";
			return null;
		},
		fin: function(){ return "Evelyn accroche son trousseau à sa ceinture. « Chaque coffre a sa serrure, et plus un passe-partout ne traîne.\n\n" +
			"Une fois, un script de sauvegarde était modifiable par tout le monde. Il tournait chaque nuit, en root. Un stagiaire curieux y a ajouté une ligne pour voir : " +
			"le lendemain, il était root sur toute la ferme de serveurs. Il nous l'a dit, heureusement. Depuis, find -perm -0002 fait partie de mes vérifications du lundi. »"; }
	},
	coeur: { nom: "Edsger", tour: "coeur",
		metier: "Le métier : un réglage du noyau fait avec sysctl -w disparaît au prochain redémarrage. Ce qui n'est pas gravé dans /etc/sysctl.d n'existe pas.",
		entree: function(){ return "Edsger est penché sur un pupitre couvert de leviers de cuivre. Il en abaisse un, en relève un autre, sans quitter des yeux une aiguille qui oscille. « Chut. Le cœur bat. Écoute. »"; },
		image: function(){ return "« Le cœur, c'est le noyau. Ses leviers sont les réglages sysctl : faire suivre les paquets d'une carte à l'autre (ip_forward, un routeur, pas un bastion), " +
			"vérifier qu'un paquet revient par où il est venu (rp_filter), refuser les redirections (accept_redirects), cacher les adresses internes du noyau (kptr_restrict, dmesg_restrict), " +
			"brouiller la mémoire (randomize_va_space). Et les tiroirs, ce sont les modules : des pièces qu'on peut charger à chaud, comme le pilote des clés USB. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sysctl net.ipv4.ip_forward ;  sysctl -a | grep redirects    lire un levier ; tous\n" +
			"  sudo sysctl -w CLE=VALEUR                 le changer maintenant (perdu au redémarrage)\n" +
			"  /etc/sysctl.d/99-bastion.conf             le graver ; les fichiers se lisent par ordre alphabétique, le dernier gagne\n" +
			"  sudo sysctl --system                      relire tous les fichiers, comme au démarrage\n" +
			"  lsmod ;  sudo modprobe -r usb-storage     les modules chargés ; en retirer un\n" +
			"  /etc/modprobe.d/bastion.conf : install usb-storage /bin/false   personne ne peut plus le charger\n" +
			"                                 blacklist cramfs                 il ne se charge plus tout seul »"; },
		mission: function(){ return "« Ta mission : sept leviers, dans un fichier qui passe après les autres, et appliqués : net.ipv4.ip_forward 0, net.ipv4.conf.all.rp_filter 1, " +
			"net.ipv4.conf.all.accept_redirects 0, kernel.dmesg_restrict 1, kernel.kptr_restrict 2, kernel.randomize_va_space 2, fs.protected_symlinks 1. " +
			"Puis les tiroirs : usb-storage interdit et retiré, cramfs sur la liste noire. »"; },
		entre: function(premier){ return premier ? "L'aiguille se stabilise. « Les leviers tiennent. Maintenant les tiroirs : usb-storage et cramfs. »" :
			"« Les tiroirs sont fermés. Mais les leviers ne sont pas tous gravés, ou pas appliqués. »"; },
		erreur: function(){
			var vivant = etatHote(H5).sysctl || {}, grave = sysctlDemarrage(H5);
			var w = SYSCTL_VOULUS_CH5.filter(function(x){ return String(vivant[x[0]]) === x[1] && String(grave[x[0]]) !== x[1]; });
			if (!aFait("h_sysctl") && w.length) return "Edsger tapote l'aiguille. « " + w[0][0] + " est bon maintenant, mais au prochain démarrage il reprendra son ancienne valeur. Grave-le dans /etc/sysctl.d. »";
			var g = SYSCTL_VOULUS_CH5.filter(function(x){ return String(grave[x[0]]) === x[1] && String(vivant[x[0]]) !== x[1]; });
			if (!aFait("h_sysctl") && g.length) return "« Ton fichier est juste, mais le noyau ne l'a pas relu : sudo sysctl --system. »";
			if (!aFait("h_modules") && modulesCharges(H5).indexOf("usb_storage") > -1 && lireModprobe(H5).install.usb_storage !== undefined) return "« La règle est posée, mais usb_storage est encore chargé : sudo modprobe -r usb-storage. »";
			return null;
		},
		fin: function(){ return "Edsger relâche le dernier levier. « Le cœur bat régulièrement.\n\n" +
			"Un administrateur que j'ai connu durcissait ses serveurs avec sysctl -w, à la main, chaque matin. Un jour de coupure de courant, tout est revenu grand ouvert, et personne ne l'a vu pendant six mois. " +
			"Ce qui n'est pas écrit dans un fichier n'existe pas. »"; }
	},
	poterne: { nom: "Joan", tour: "poterne",
		metier: "Le métier : quiconque a la main sur le clavier au démarrage peut demander un shell root au chargeur. Le mot de passe de GRUB et le chiffrement du disque ferment cette porte-là.",
		entree: function(){ return "Joan est accroupie devant une petite porte basse, au ras du sol. Elle passe la main sur la serrure. « Tout le monde surveille la grande porte. Personne ne surveille celle-ci. C'est pour ça que je suis là. »"; },
		image: function(){ return "« La poterne, c'est le démarrage : avant même Linux, le chargeur GRUB décide de ce qui démarre, et comment. Sans mot de passe, n'importe qui au clavier peut modifier une entrée du menu et entrer en mode secours, root, sans rien demander. " +
			"Le mot de passe de GRUB ne s'écrit jamais en clair : on en garde l'empreinte (grub-mkpasswd-pbkdf2). Et trois touches, Ctrl+Alt+Suppr, ne doivent pas suffire à redémarrer le serveur. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  grub-mkpasswd-pbkdf2                      l'empreinte d'un mot de passe : grub.pbkdf2.sha512...\n" +
			"  /etc/grub.d/40_custom                     on y ajoute :  set superusers=\"gardien\"\n" +
			"                                                           password_pbkdf2 gardien grub.pbkdf2.sha512...\n" +
			"  sudo update-grub                          régénère /boot/grub/grub.cfg (on n'écrit jamais grub.cfg à la main)\n" +
			"  sudo systemctl mask ctrl-alt-del.target   plus de redémarrage au clavier\n" +
			"  sudo cryptsetup status sda3_crypt ;  sudo cryptsetup luksDump /dev/sda3    le disque chiffré, en lecture seule\n\n" +
			"Astuce : grub-mkpasswd-pbkdf2 lit aussi un tuyau, et awk sait garder le dernier mot d'une ligne. »"; },
		mission: function(){ return "« Ta mission : un compte gardien et son empreinte dans 40_custom, et un grub.cfg régénéré qui les contient. Puis Ctrl+Alt+Suppr muré. »"; },
		entre: function(premier){ return premier ? "Joan referme la poterne à double tour. « GRUB est protégé. Reste Ctrl+Alt+Suppr : mask. »" : "« Le clavier ne redémarre plus rien. Mais GRUB n'a pas de mot de passe. »"; },
		erreur: function(){
			var t = T5("/etc/grub.d/40_custom") || "", cfg = T5("/boot/grub/grub.cfg") || "";
			if (!aFait("h_grub") && /password_pbkdf2/.test(t) && !/password_pbkdf2/.test(cfg)) return "Joan pointe grub.cfg. « 40_custom est prêt, mais grub.cfg n'a pas été régénéré : sudo update-grub. »";
			if (!aFait("h_grub") && /password_pbkdf2/.test(cfg) && !/password_pbkdf2/.test(t)) return "« Tu as écrit dans grub.cfg à la main ? Au prochain update-grub, tout disparaîtra. C'est 40_custom qu'il faut modifier. »";
			if (!aFait("h_grub") && /password_pbkdf2/.test(t) && !/^\s*set\s+superusers/m.test(t)) return "« Il manque la ligne set superusers. »";
			return null;
		},
		fin: function(){ return "Joan se relève en époussetant ses genoux. « La poterne est close.\n\n" +
			"Un jour, dans une salle serveurs, un visiteur « perdu » a redémarré une machine, ajouté init=/bin/bash dans le menu de GRUB, et changé le mot de passe root en trente secondes. " +
			"On l'a vu sur la caméra. Depuis, chaque serveur que je touche a un mot de passe sur GRUB, et un disque chiffré. »"; }
	},
	banniere: { nom: "Robert", tour: "banniere",
		metier: "Le métier : une version affichée, c'est la liste des failles connues offerte à qui la lit. Et un certificat expiré apprend aux utilisateurs à cliquer sur « continuer quand même ».",
		entree: function(){ return "Robert déroule une immense bannière brodée d'inscriptions : un nom, un numéro de version, la liste des pièces du château. « Magnifique, non ? C'est exactement ce qu'il ne faut pas montrer. »"; },
		image: function(){ return "« La bannière, c'est ce que le serveur web montre au monde. Apache, par défaut, crie sa version dans l'en-tête Server (ServerTokens), la signe au bas des pages d'erreur (ServerSignature), " +
			"renvoie en écho ce qu'on lui envoie (la méthode TRACE), et liste le contenu des dossiers sans index (le module autoindex). " +
			"Et le sceau qui authentifie la bannière, c'est le certificat TLS : le nôtre a expiré, et il parle encore de vieilles langues (TLS 1.0 et 1.1). »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  /etc/apache2/conf-available/security.conf      ServerTokens Prod, ServerSignature Off, TraceEnable Off\n" +
			"  sudo a2dismod -f autoindex ;  sudo a2enmod headers   couper un module ; en activer un\n" +
			"  /etc/apache2/sites-available/default-ssl.conf  SSLCertificateFile, SSLProtocol -all +TLSv1.2 +TLSv1.3,\n" +
			"                                                 Header always set Strict-Transport-Security \"max-age=63072000\"\n" +
			"  openssl x509 -in FICHIER -noout -dates          les dates d'un certificat\n" +
			"  apachectl configtest                            Syntax OK ? SEULEMENT alors :\n" +
			"  sudo systemctl reload apache2 (ou restart après un changement de module)\n" +
			"  curl -kI https://bastion/ ;  openssl s_client -connect bastion:443 -tls1_1    vérifier de l'extérieur »"; },
		mission: function(){ return "« Ta mission : qu'Apache se taise (ServerTokens Prod, ServerSignature Off, TraceEnable Off, plus de listes de dossiers), configtest puis rechargé. " +
			"Ensuite le sceau : le certificat neuf qui dort dans /etc/ssl/certs, TLS 1.2 au minimum, et l'en-tête HSTS. »"; },
		entre: function(premier){ return premier ? "Robert replie la bannière : il n'y reste qu'un mot, Apache. « Bien. Maintenant le sceau : certificat neuf, TLS 1.2, HSTS. »" :
			"« Le sceau est neuf. Mais la bannière parle encore trop : ServerTokens, ServerSignature, TraceEnable, autoindex. »"; },
		erreur: function(){
			var e = etatHote(H5);
			if (e.apacheEchec || !etatUnite(H5, "apache2").actif) return "Robert blêmit. « Apache est tombé : un restart sur une configuration fausse. apachectl configtest te dira où, puis sudo systemctl start apache2. »";
			var c = sCh5();
			if (c.apacheApplique && c.apacheApplique !== c.apacheAppliqueTeste) return "« Tu as rechargé sans apachectl configtest. Ça a marché, cette fois. Dans l'ordre : configtest, PUIS reload. »";
			var disque = configApache(H5);
			if (disque && !disque.erreur && e.apache && disque.serveur.tokens !== e.apache.serveur.tokens) return "« Le fichier dit Prod, mais Apache tourne avec l'ancienne configuration : configtest, puis reload. »";
			if (!aFait("h_apache_tls") && disque && disque.modules.indexOf("headers") > -1 && e.apache && e.apache.modules.indexOf("headers") === -1) return "« headers est activé sur le disque, mais Apache ne l'a pas encore chargé : configtest, puis reload ou restart. »";
			return null;
		},
		fin: function(){ return "Robert range la bannière dans un coffre. « Le Bastion ne dit plus que son nom.\n\n" +
			"Un matin, un robot a balayé tout Internet à la recherche d'une version précise d'un serveur web, celle dont une faille venait d'être publiée. " +
			"Il n'a eu qu'à lire les en-têtes. Les serveurs qui affichaient « Apache » tout court ont été épargnés ce jour-là. »"; }
	},
	guet: { nom: "Katherine", tour: "guet",
		metier: "Le métier : sans trace, pas d'enquête. L'audit et les journaux se posent avant l'incident ; le lendemain, il est trop tard.",
		entree: function(){ return "Katherine est assise au sommet de la tour, un registre ouvert sur les genoux, une longue-vue à portée de main. Elle note l'heure, puis lève les yeux. « Il est " + heureCh5() + ". Je l'écris. J'écris tout. »"; },
		image: function(){ return "« La Tour de Guet, c'est l'audit et les journaux. auditd est la vigie qui note chaque écriture sur un fichier surveillé (une règle -w, une clé -k pour retrouver). " +
			"journald est le registre du système : il doit survivre à un redémarrage (Storage=persistent). L'horloge doit être juste (NTP), sinon les heures du registre mentent. " +
			"Et sur la porte, une bannière légale prévient : accès réservé, connexions surveillées. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sudo auditctl -w /etc/passwd -p wa -k comptes     une règle, perdue au redémarrage\n" +
			"  /etc/audit/rules.d/bastion.rules                   les mêmes règles, une par ligne : elles restent\n" +
			"  sudo augenrules --load ;  sudo auditctl -l         les charger ; les lister\n" +
			"  sudo ausearch -k comptes ;  sudo aureport          chercher ; résumer\n" +
			"  /etc/systemd/journald.conf : Storage=persistent    puis sudo systemctl restart systemd-journald\n" +
			"  sudo timedatectl set-ntp true ;  chronyc tracking  l'heure juste\n" +
			"  /etc/issue, /etc/issue.net                         la bannière, SANS nom ni version du système\n" +
			"  logger -t bastion \"...\" ;  sudo journalctl -t bastion   écrire au journal ; relire »"; },
		mission: function(){ return "« Ta mission : surveiller /etc/passwd, /etc/shadow et /etc/sudoers (écritures et attributs), avec des règles chargées ET permanentes. " +
			"Puis un journal qui survit, une heure juste, et la bannière légale sur /etc/issue et /etc/issue.net. »"; },
		entre: function(premier){ return premier ? "Katherine tourne une page. « La vigie veille. Maintenant le registre : persistant, à l'heure, et la bannière. »" :
			"« Le registre est prêt. Mais la vigie ne surveille pas encore les comptes, ou pas de façon permanente. »"; },
		erreur: function(){
			var e = etatHote(H5);
			var regles = fichiersDuDossierGuet(H5, "/etc/audit/rules.d", "*.rules").map(function(f){ return lireFichierHote(H5, f.chemin); }).join("\n");
			if (!aFait("h_auditd") && /-w\s+\/etc\/shadow/.test(regles) && !e.audit.regles.some(function(r){ return r.chemin === "/etc/shadow"; })) return "Katherine lève un sourcil. « Tes règles sont écrites, pas chargées : sudo augenrules --load. »";
			if (!aFait("h_auditd") && e.audit.regles.some(function(r){ return r.chemin === "/etc/shadow"; }) && !/-w\s+\/etc\/shadow/.test(regles)) return "« La vigie surveille, mais au prochain redémarrage elle oubliera tout : écris les règles dans /etc/audit/rules.d. »";
			if (!aFait("h_journaux") && /Debian|GNU|\\[nlrsvmo]/.test(T5("/etc/issue") || "")) return "« Ta bannière donne encore le nom du système. Une bannière légale prévient, elle ne renseigne pas. »";
			if (!aFait("h_journaux") && /^\s*Storage=persistent/m.test(T5("/etc/systemd/journald.conf") || "") && e.journald !== "persistent") return "« journald.conf est juste, mais journald ne l'a pas relu : restart systemd-journald. »";
			return null;
		},
		fin: function(){ return "Katherine referme le registre et pose la main dessus. « Rien ne bougera sans que je le sache.\n\n" +
			"Sur une enquête, on a su qu'un compte avait été ajouté en pleine nuit. Mais qui, et avec quel programme ? Aucune règle d'audit, un journal effacé au redémarrage, une horloge en retard de quarante minutes. " +
			"On n'a jamais su. Depuis, la Tour de Guet est le premier mur que je dresse. »"; }
	},
	sceaux: { nom: "Ralph", tour: "sceaux",
		metier: "Le métier : une base d'empreintes se fabrique sur un système sain, et se garde à l'abri. Et un système à jour élimine la plupart des failles connues avant même qu'on les cherche.",
		entree: function(){ return "Ralph presse un cachet de cire sur chaque caisse d'une longue étagère, puis compare l'empreinte à un registre. Il s'arrête sur l'une d'elles. « Tiens. Celle-ci ne correspond plus. »"; },
		image: function(){ return "« Un sceau d'intégrité, c'est l'empreinte d'un fichier (une somme sha256) : on la prend quand tout est sain, et demain, on compare. AIDE est l'outil qui le fait pour tout le système. " +
			"Les paquets ont aussi leurs sceaux : dpkg connaît l'empreinte d'origine de chaque fichier installé (debsums, dpkg -V). Et les caisses de pièces neuves, ce sont les mises à jour (apt upgrade), " +
			"qu'on peut faire arriver toutes seules chaque nuit (unattended-upgrades). »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  sudo aide --init                          fabrique la base : /var/lib/aide/aide.db.new\n" +
			"  sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db    la met en place comme référence\n" +
			"  sudo aide --check                         compare le disque à la référence\n" +
			"  apt list --upgradable ;  sudo apt upgrade les pièces en retard ; les poser\n" +
			"  sudo apt install unattended-upgrades      les mises à jour automatiques, et dans /etc/apt/apt.conf.d/20auto-upgrades :\n" +
			"      APT::Periodic::Update-Package-Lists \"1\";\n      APT::Periodic::Unattended-Upgrade \"1\";\n" +
			"  sudo debsums -s ;  dpkg -S FICHIER        un fichier qui n'est plus celui de son paquet ; à quel paquet il appartient\n" +
			"  sudo apt install --reinstall PAQUET       remettre les fichiers d'origine »"; },
		mission: function(){ return "« Ta mission : la base AIDE fabriquée, mise en place, et une vérification qui passe. " +
			"Puis tout à jour, les mises à jour automatiques en place, et le binaire qui ne correspond plus à son paquet remis d'origine. »"; },
		entre: function(premier){ return premier ? "Ralph range ses cachets. « La base est scellée. Maintenant les caisses : upgrade, unattended-upgrades, et le binaire suspect. »" :
			"« Tout est à jour. Mais il n'y a pas encore de base d'empreintes, ou personne ne l'a vérifiée. »"; },
		erreur: function(){
			if (!aFait("h_aide") && F5("/var/lib/aide/aide.db.new") && !F5("/var/lib/aide/aide.db")) return "Ralph montre aide.db.new. « La base est fabriquée, mais elle porte le nom .new : AIDE compare avec aide.db. Copie-la. »";
			if (!aFait("h_aide") && F5("/var/lib/aide/aide.db") && !baseAideCh5()) return "« Ton aide.db n'est pas une base AIDE : elle doit sortir de aide --init. »";
			if (!aFait("h_paquets") && aMettreAJour(H5).length === 0 && fichiersModifiesPaquet(H5, "procps").modifies.length) return "« Tout est à jour, mais un binaire ne correspond toujours pas à son paquet : debsums -s, dpkg -S, puis --reinstall. »";
			return null;
		},
		fin: function(){ return "Ralph appose un dernier sceau. « Tout est scellé, et tout est neuf.\n\n" +
			"Sur une ferme de serveurs, un programme système avait été remplacé, mais il marchait exactement comme l'original. Personne n'a rien vu pendant des mois. " +
			"C'est une base d'empreintes, prise le jour de l'installation, qui l'a trahi : une seule ligne, « changed ». »"; }
	},
	garde: { nom: "Adele", tour: "garde",
		metier: "Le métier : fail2ban ne remplace pas des mots de passe solides ni des clés ; il ralentit qui insiste. AppArmor, lui, limite les dégâts si un programme est pris en défaut.",
		entree: function(){ return "Adele fait sa ronde, une hallebarde sur l'épaule. Elle s'arrête devant une cellule vide dont la porte bat au vent. « Celle d'Apache. Il est censé y dormir. Il se promène. »"; },
		image: function(){ return "« La Garde, ce sont deux métiers. Les sentinelles d'abord : fail2ban lit les journaux, et quand une adresse se trompe trop souvent de mot de passe, il la bannit pour un temps (une prison, jail, par service). " +
			"Ensuite les cellules : AppArmor enferme chaque programme dans un profil (les fichiers qu'il peut lire, écrire, exécuter). En mode complain, la cellule est ouverte : le garde note, mais ne retient personne. En enforce, elle est fermée. »"; },
		syntaxe: function(){ return "« Sur bastion :\n\n" +
			"  /etc/fail2ban/jail.local                  [sshd], enabled = true, maxretry = 3, bantime = 1h\n" +
			"  sudo fail2ban-client reload               relire la configuration\n" +
			"  sudo fail2ban-client status sshd          la prison : échecs, bannis\n" +
			"  sudo fail2ban-client set sshd unbanip IP  libérer une adresse\n" +
			"  sudo aa-status                            les profils, en enforce ou en complain\n" +
			"  sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2    fermer la cellule d'Apache »"; },
		mission: function(){ return "« Ta mission : une prison sshd active, cinq essais au plus, dix minutes de bannissement au moins. Puis la cellule d'Apache fermée (enforce). »"; },
		entre: function(premier){ return premier ? "Adele hoche la tête. « Les sentinelles veillent. Maintenant la cellule d'Apache : aa-enforce. »" : "« Apache est enfermé. Mais aucune sentinelle ne garde la porte SSH. »"; },
		erreur: function(){
			var j = etatHote(H5).f2b.conf;
			if (!aFait("h_fail2ban") && F5("/etc/fail2ban/jail.local") && !(j && j.sshd)) return "Adele montre jail.local. « Ta prison est écrite, pas ouverte : sudo fail2ban-client reload. Et enabled = true, dans la section [sshd]. »";
			return null;
		},
		fin: function(){ return "Adele pose sa hallebarde contre le mur. « Les sentinelles veillent, les cellules sont closes.\n\n" +
			"Un soir, fail2ban a banni l'adresse du directeur, qui avait oublié son mot de passe et réessayé dix fois. Il m'a appelée, furieux. Je l'ai libéré, puis je lui ai montré la liste des autres adresses bannies cette nuit-là : quatre mille. " +
			"Il n'a plus jamais demandé qu'on coupe fail2ban. »"; }
	}
};

/* Les maîtres dans leurs tours, avec leurs sorts et leurs défis. */
Object.keys(MAITRES_BASTION).forEach(function(cle){
	var m = MAITRES_BASTION[cle], t = tourCh5(cle);
	m.item = maitreBastion(m.nom, "item_" + m.nom.toLowerCase() + ".gif");
	if (SORTS_DES_TOURS[cle].length) m.item.enseigne.apply(m.item, SORTS_DES_TOURS[cle]);
	m.item.revele.apply(m.item, idsDefisTour(cle));
	texteVivant(m.item, function(){ return texteMaitreBastion(m); });
	t.lieu.addItem(m.item);
});
LaurentBastion.revele("s_h_avant_quatre", "s_h_sans_indice");
HorlogeBastion.revele("s_h_avant_quatre");

/* ------------------------------------------------------------------ */
/* Le bestiaire du Bastion                                             */
/* ------------------------------------------------------------------ */

var BestiaireBastion = new Item("Bestiaire",
	"LE BESTIAIRE DU BASTION : l'image de la nuit, puis le vrai mot du métier.\n\n" +
	"Le Bastion                    un serveur durci (hardening)\n" +
	"La Pierre d'Inspection        un audit de durcissement (lynis, le Hardening index)\n" +
	"La Herse                      les comptes, /etc/passwd et /etc/shadow\n" +
	"La herse qui se bloque        le verrouillage après échecs (pam_faillock)\n" +
	"Le Sceau du Roi               sudo et le principe du moindre privilège\n" +
	"Les roues du temps            cron et at, réservés par cron.allow et at.allow\n" +
	"Le Pont-levis                 SSH (sshd_config, clés ed25519)\n" +
	"Les Portes condamnées         la réduction de la surface d'attaque (services inutiles)\n" +
	"Le sas                        le bac à sable systemd (NoNewPrivileges, ProtectSystem)\n" +
	"Les Remparts                  le pare-feu de l'hôte (ufw, nftables)\n" +
	"Les passe-partout             les programmes SUID et les capacités (cap_setuid)\n" +
	"Le sticky bit                 /tmp en 1777 : chacun ne retire que ses affaires\n" +
	"Les leviers du Cœur           les réglages du noyau (sysctl)\n" +
	"Les tiroirs du Cœur           les modules du noyau (modprobe, blacklist)\n" +
	"La Poterne                    le chargeur de démarrage (GRUB) et le disque chiffré (LUKS)\n" +
	"La Bannière                   les en-têtes du serveur web (ServerTokens, ServerSignature)\n" +
	"Le sceau de la Bannière       le certificat TLS, TLS 1.2 minimum, HSTS\n" +
	"La vigie                      l'audit du noyau (auditd, ausearch)\n" +
	"Le registre                   les journaux (journald persistant, rsyslog)\n" +
	"Les Sceaux d'intégrité        les empreintes de fichiers (AIDE, debsums)\n" +
	"Les sentinelles               le bannissement après échecs (fail2ban)\n" +
	"Les cellules                  le confinement des programmes (AppArmor)\n" +
	"L'assaut de l'aube            un test d'intrusion (ici, narratif et inerte)\n" +
	"Le rapport d'inspection       le rapport d'audit : constats, mesures, score avant et après, ce qui reste\n\n" +
	"Rien de ce que la Nuée laisse ici ne fonctionne pour de vrai : ce sont des objets du jeu, inertes.",
	"item_historybook.gif");
HallBastion.addItem(BestiaireBastion);

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts du chapitre                               */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH5 = {
	"faillock":        { nom: "le Registre de la Herse",     image: "La herse note chaque échec, et se bloque quand on la secoue trop." },
	"pwck":            { nom: "le Compas des Comptes",       image: "Tu vérifies que chaque compte tient debout : dossier, groupe, shell." },
	"grpck":           { nom: "le Compas des Groupes",       image: "Tu vérifies que chaque groupe ne nomme que des comptes qui existent." },
	"su":              { nom: "la Clé Empruntée",            image: "Tu prends l'identité d'un autre compte, si la herse te laisse passer." },
	"useradd":         { nom: "le Registre des Recrues",     image: "Tu inscris un nouveau compte au registre du Bastion." },
	"umask":           { nom: "le Masque des Serrures",      image: "Les fichiers neufs naissent avec les serrures que tu choisis." },
	"sshd":            { nom: "le Gardien du Pont",          image: "Tu demandes au gardien s'il comprend sa consigne avant de la lui donner." },
	"systemd-analyze": { nom: "la Note du Sas",              image: "Chaque service reçoit une note : de grand ouvert à bien enfermé." },
	"apt-get":         { nom: "le Convoi des Pièces",        image: "Le vieux convoi qui apporte les pièces neuves au Bastion." },
	"dpkg":            { nom: "l'Inventaire des Caisses",    image: "Tu sais d'où vient chaque pièce, et si elle est encore d'origine." },
	"etckeeper":       { nom: "la Mémoire de /etc",          image: "Chaque changement de configuration est gardé, daté, signé." },
	"apachectl":       { nom: "le Héraut de la Bannière",    image: "Tu fais relire la bannière avant de la hisser." },
	"apache2ctl":      { nom: "le Second Héraut",            image: "Le même héraut, sous son nom de Debian." },
	"a2enmod":         { nom: "la Pièce Ajoutée",            image: "Tu fixes une pièce de plus à la bannière." },
	"a2dismod":        { nom: "la Pièce Retirée",            image: "Tu décroches une pièce dont la bannière n'a pas besoin." },
	"a2enconf":        { nom: "le Pli Déplié",               image: "Un morceau de consigne entre en vigueur." },
	"a2disconf":       { nom: "le Pli Replié",               image: "Un morceau de consigne est mis de côté." },
	"a2ensite":        { nom: "l'Étendard Levé",             image: "Un site est hissé au mât." },
	"a2dissite":       { nom: "l'Étendard Amené",            image: "Un site est descendu du mât." },
	"getcap":          { nom: "le Détecteur de Pouvoirs",    image: "Tu repères chaque programme qui porte un morceau du pouvoir de root." },
	"setcap":          { nom: "le Pouvoir Retiré",           image: "Tu reprends à un programme le pouvoir qu'on lui avait prêté." },
	"mount":           { nom: "la Salle Montée",             image: "Une salle s'ouvre au Bastion, avec ses règles d'entrée." },
	"findmnt":         { nom: "le Plan des Salles",          image: "Tu lis les règles de chaque salle montée." },
	"lsmod":           { nom: "l'Inventaire des Tiroirs",    image: "Tu vois les pièces chargées dans le cœur." },
	"modprobe":        { nom: "la Main du Tiroir",           image: "Tu charges ou retires une pièce du cœur." },
	"grub-mkpasswd-pbkdf2": { nom: "l'Empreinte de la Poterne", image: "Le mot de passe devient une empreinte qu'on ne peut pas retourner." },
	"update-grub":     { nom: "le Plan du Démarrage",        image: "Le plan de la poterne est redessiné d'après tes consignes." },
	"grub-mkconfig":   { nom: "l'Esquisse du Démarrage",     image: "Tu vois le plan de la poterne avant de le graver." },
	"cryptsetup":      { nom: "la Serrure du Disque",        image: "Tu vérifies que le disque est bien scellé." },
	"auditctl":        { nom: "la Consigne de la Vigie",     image: "Tu dis à la vigie quels coffres surveiller." },
	"augenrules":      { nom: "la Consigne Gravée",          image: "Les consignes de la vigie survivent au redémarrage." },
	"ausearch":        { nom: "la Longue-Vue",               image: "Tu retrouves dans le registre qui a touché à quoi." },
	"aureport":        { nom: "le Rapport de Garde",         image: "Le registre de la vigie, résumé en un tableau." },
	"logger":          { nom: "la Plume du Registre",        image: "Tu écris toi-même une ligne au registre." },
	"rsyslogd":        { nom: "le Messager du Registre",     image: "Le registre est recopié au loin, à l'abri." },
	"logrotate":       { nom: "la Reliure du Registre",      image: "Les vieux registres sont reliés et rangés." },
	"aa-status":       { nom: "le Tour des Cellules",        image: "Tu passes devant chaque cellule : ouverte ou fermée." },
	"aa-enforce":      { nom: "la Cellule Close",            image: "Tu fermes la porte de la cellule d'un programme." },
	"aa-complain":     { nom: "la Cellule Entrouverte",      image: "Le garde note, mais ne retient personne." },
	"aa-disable":      { nom: "la Cellule Vidée",            image: "Tu retires un programme de sa cellule." },
	"apparmor_parser": { nom: "le Plan des Cellules",        image: "Tu recharges le plan d'une cellule." },
	"lynis":           { nom: "la Pierre d'Inspection",      image: "La pierre juge chaque mur du Bastion, et donne une note sur 100." }
};
var NOM_RPG_AVANT_BASTION = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 6 && SORTS_RPG_CH5[sort]) return SORTS_RPG_CH5[sort].nom;
	return NOM_RPG_AVANT_BASTION(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre : un par tour, la Pierre, l'Aube, le Rapport, 4 h, et le platine */
/* ------------------------------------------------------------------ */

var TROPHEES_CH5 = {
	tour_herse:     ["la Herse Close", "Plus de compte sans mot de passe ni de second UID 0 (awk sur shadow et passwd, passwd -l, userdel) ; faillock.conf (deny), PASS_MAX_DAYS et chage -M, nologin pour les comptes de service."],
	tour_sceau:     ["le Sceau Gardé", "Plus de NOPASSWD: ALL ; /etc/sudoers.d en 0440 ; sudo -l -U et visudo -c pour vérifier ; cron.allow et at.allow réservent la planification."],
	tour_pontlevis: ["le Pont Levé", "PermitRootLogin no, PasswordAuthentication no, AllowUsers, MaxAuthTries 3 ; Ciphers, MACs, KexAlgorithms modernes ; une clé ed25519. sshd -t AVANT systemctl reload ssh."],
	tour_portes:    ["les Portes Condamnées", "ss -tulpn et netstat -loptn ; systemctl disable --now (ou mask) ce qui ne sert pas, apt purge ; systemctl edit et daemon-reload pour un bac à sable (NoNewPrivileges, PrivateTmp, ProtectSystem)."],
	tour_remparts:  ["les Remparts Dressés", "ufw default deny incoming, ufw allow 22/tcp et 443/tcp, ufw enable, dans cet ordre ; ufw status verbose ou nft list ruleset ; on vérifie depuis l'extérieur."],
	tour_coffres:   ["les Coffres Scellés", "/etc/shadow en 640 ; find -perm -0002 et -perm -4000 ; chmod 1777 /tmp ; getcap -r / et setcap -r ; /tmp en nodev,nosuid,noexec ; UMASK 027."],
	tour_coeur:     ["le Cœur Régulier", "Les réglages du noyau gravés dans /etc/sysctl.d puis sysctl --system ; install usb-storage /bin/false et blacklist dans /etc/modprobe.d, modprobe -r."],
	tour_poterne:   ["la Poterne Close", "grub-mkpasswd-pbkdf2, set superusers et password_pbkdf2 dans /etc/grub.d/40_custom, update-grub ; systemctl mask ctrl-alt-del.target ; cryptsetup pour vérifier le chiffrement."],
	tour_banniere:  ["la Bannière Muette", "ServerTokens Prod, ServerSignature Off, TraceEnable Off, a2dismod autoindex ; un certificat valide, SSLProtocol -all +TLSv1.2 +TLSv1.3, HSTS ; apachectl configtest PUIS reload."],
	tour_guet:      ["la Vigie Éveillée", "auditctl -w ... -p wa -k et /etc/audit/rules.d puis augenrules --load ; ausearch -k ; journald persistant, NTP, bannière légale sans version du système."],
	tour_sceaux:    ["les Sceaux Posés", "aide --init, la base mise en place, aide --check ; apt upgrade et unattended-upgrades ; debsums -s, dpkg -S et apt install --reinstall."],
	tour_garde:     ["la Garde Montée", "jail.local ([sshd] enabled = true, maxretry, bantime) et fail2ban-client reload ; aa-status et aa-enforce pour fermer la cellule d'Apache."],
	h_pierre:       ["la Pierre Consultée", "lynis audit system mesure le durcissement (le Hardening index) ; on mesure avant d'agir, pour prouver ce qu'on a fait."],
	h_aube:         ["l'Aube Relue", "Après un incident, on relit avant de réparer : journalctl, ausearch, aide --check, debsums. Puis on répare chaque trace."],
	h_rapport:      ["le Rapport Contresigné", "Un rapport d'inspection dit les constats, les mesures, le score avant et après, et ce qui reste. On ne cache pas le reste."],
	s_h_avant_quatre: ["l'Aube Devancée", "Les douze murs dressés avant 4 h : on durcit avant l'incident, jamais après."]
};
var COMPETENCES_CH5 = {
	tour_herse: "Comptes et mots de passe", tour_sceau: "Droits sudo et planification", tour_pontlevis: "Durcissement SSH", tour_portes: "Services et bac à sable",
	tour_remparts: "Pare-feu de l'hôte", tour_coffres: "Droits et montages", tour_coeur: "Noyau et modules", tour_poterne: "Démarrage protégé",
	tour_banniere: "Serveur web et TLS", tour_guet: "Audit et journaux", tour_sceaux: "Intégrité et mises à jour", tour_garde: "Bannissement et confinement",
	h_pierre: "Audit de durcissement", h_aube: "Lecture des traces", h_rapport: "Rapport d'inspection", s_h_avant_quatre: "Durcissement en temps limité",
	platine_ch5: "Maître du Bastion"
};
/* Le sigle de chaque médaille (outils/dessiner_badges.py) et son rang. */
var SIGLES_CH5 = {
	tour_herse: ["PASS", "argent"], tour_sceau: ["SUDO", "argent"], tour_pontlevis: ["SSH", "or"], tour_portes: ["OFF", "argent"],
	tour_remparts: ["DENY", "or"], tour_coffres: ["PERM", "argent"], tour_coeur: ["KRNL", "argent"], tour_poterne: ["GRUB", "bronze"],
	tour_banniere: ["HTTP", "argent"], tour_guet: ["LOGS", "or"], tour_sceaux: ["AIDE", "argent"], tour_garde: ["BAN", "bronze"],
	h_pierre: ["SCAN", "bronze"], h_aube: ["AUBE", "or"], h_rapport: ["DOC", "or"], s_h_avant_quatre: ["4H", "or"], platine_ch5: ["HARD", "platine"]
};
Object.keys(COMPETENCES_CH5).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH5[id]; });
Object.keys(SIGLES_CH5).forEach(function(id){ if (SIGLES_CH5[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH5[id][1]; });
function badgeCh5Gagne(id){ return /^tour_/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_BASTION = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_BASTION();
	if (state.has("ch5Ouvert") && !state.has("platine_ch5") && Object.keys(TROPHEES_CH5).every(badgeCh5Gagne)){
		state.set("platine_ch5");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch5) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* rempart : le plan des douze tours                                   */
/* ------------------------------------------------------------------ */

function texteRempart(){
	var c = sCh5();
	var lignes = [C.gras("LE PLAN DU BASTION"), C.jaune("commande du jeu, pas Linux (man rempart)"), C.gris("rouge : le mur cède encore · vert : la tour est fermée"), ""];
	var pierre = null;
	try { pierre = etatGuet().hotes[H5] && etatGuet().hotes[H5].lynis ? etatGuet().hotes[H5].lynis.score : null; } catch (e){ pierre = null; }
	lignes.push("  Il est " + C.gras(heureCh5()) + (c.assaut ? C.gris(" · l'aube est passée") : C.gris(" · l'aube dans " + Math.max(0, minutesAvantAube()) + " min")));
	lignes.push("  Pierre d'Inspection : " + (pierre === null ? C.gris("pas encore consultée") : C.gras(pierre + " / 100")) +
		(c.scoreDepart !== null && c.scoreDepart !== undefined ? C.gris(" (départ : " + c.scoreDepart + ", objectif : plus de 85)") : C.gris(" (objectif : plus de 85)")), "");
	TOURS_CH5.forEach(function(t){
		var ok = tourFermeeCh5(t.cle), faites = t.etapes.filter(aFait).length, defis = idsDefisTour(t.cle).filter(aFait).length;
		var trace = c.traces && c.traces[t.cle] && TRACES_CH5[t.cle] && !TRACES_CH5[t.cle].reparee();
		lignes.push("  " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(t.nom, 10)) + completerDroite(MAITRES_BASTION[t.cle].nom, 10) +
			(ok ? C.vert(faites + "/2") : C.gris(faites + "/2")) + C.gris(" · défis " + defis + "/6") + (trace ? C.rouge("  trace de la Nuée") : "") + (current_room === t.lieu ? C.jaune("  ◀ toi") : ""));
	});
	var fermees = toursFermeesCh5().length;
	lignes.push("", "  Tours fermées : " + C.gras(fermees + " sur 12"));
	var h4 = aFait("s_h_avant_quatre") ? C.vert("réussi") : (c.horloge >= QUATRE_HEURES_CH5 ? C.rouge("manqué") : C.jaune("en cours (" + Math.max(0, QUATRE_HEURES_CH5 - c.horloge) + " min)"));
	var hi = aFait("s_h_sans_indice") ? C.vert("réussi") : (state.malus6 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("Défis d'honneur (Laurent)"), "  Les douze tours avant 4 h : " + h4, "  Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH5).filter(badgeCh5Gagne);
	lignes.push("", C.gras("BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH5).length) + C.gris("  (badges bastion : les leçons)"));
	return lignes.join("\n");
}
Shell.sorts.rempart = function(args, io){
	if (!state.has("ch5Ouvert")) return "Le plan du Bastion s'ouvre avec le chapitre 5, après l'Académie des Arcanes. " + C.gris("(Pendant la nuit de la Nuée, c'est grimoire.)");
	var texte = texteRempart();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
if (SORTS_DU_JEU.indexOf("rempart") === -1) SORTS_DU_JEU.push("rempart");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["rempart", "le plan des douze tours du Bastion, l'heure et la Pierre (chapitre 5)"]);
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.rempart = "rempart n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
	"Au Bastion (chapitre 5), il montre le plan des douze tours : en rouge celles dont le mur cède encore,\n" +
	"en vert celles que tu as fermées (les deux étapes du maître faites), avec tes défis, l'heure de la nuit,\n" +
	"le dernier score de la Pierre d'Inspection, les traces laissées par la Nuée après l'aube, et les défis d'honneur.\n\n  rempart          le plan du Bastion";

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio                     */
/* ------------------------------------------------------------------ */

function verifierBastion(){
	if (!bastionOuvert()) return;
	var c = state.ch5;
	if (!c) return;
	// Les défis qui se lisent dans l'état de la machine.
	DEFIS_BASTION.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiBastion(d.id); } });
	// Vint s'est trompé trois fois de mot de passe en rentrant : la sentinelle, dès qu'elle veille, le bannit.
	if (!c.vintBanni && etatHote(H5).f2b.conf && etatHote(H5).f2b.conf.sshd && serviceActif(H5, "fail2ban")){
		c.vintBanni = true;
		fail2banBannir(H5, "sshd", IP_VINT);
		if (!state.has("rejeuEnCours")) say(C.gris("(Radio : « Vint : euh... je crois que la Garde vient de me bannir. J'ai raté mon mot de passe trois fois en rentrant. Mon poste, c'est " + IP_VINT + ". »)"));
	}
	// L'honneur : les douze tours avant 4 h, et le rapport sans indice.
	if (c.toutesFermees !== undefined && c.toutesFermees < QUATRE_HEURES_CH5) reussirDefiBastion("s_h_avant_quatre");
	if (aFait("h_rapport") && !state.malus6) reussirDefiBastion("s_h_sans_indice");
	// Un badge pour chaque mur et chaque grande étape (une tour fermée le reste pour le badge).
	TOURS_CH5.forEach(function(t){ if (tourFermeeCh5(t.cle) && !state.has("tour_" + t.cle)) state.set("tour_" + t.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH5).forEach(function(id){
		if (!badgeCh5Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	// Grace donne l'étape suivante à la radio.
	var suivante = QUETES_CH5.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (aFait("h_entree") && c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "h_pierre") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(HallBastion) + "/Radio.)"));
	}
}
var VERIFIER_CH5_AVANT_BASTION = verifierChapitre5;
verifierChapitre5 = function(){
	VERIFIER_CH5_AVANT_BASTION();
	verifierBastion();
};

World.fige = true;
