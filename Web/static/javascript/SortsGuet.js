/**
 * SortsGuet.js : les sorts de la Tour de Guet et des remparts du Bastion (chapitre 5, durcissement Linux).
 *
 * Des commandes génériques, fidèles à Debian/Ubuntu, qui LISENT l'état réel d'une machine du jeu au moment où
 * on les lance : les vrais fichiers de configuration posés sur la machine (/etc/apache2, /etc/fstab,
 * /etc/sysctl.d, /etc/modprobe.d, /etc/default/grub, /etc/audit, /etc/rsyslog.conf, /etc/logrotate.d,
 * /etc/systemd/journald.conf, /etc/apparmor.d, /etc/fail2ban...). Aucune réponse n'est écrite en dur pour une quête.
 *
 *  - Apache : apachectl / apache2ctl (configtest, -t, -M, -S, -v, graceful, restart), a2enmod, a2dismod, a2enconf,
 *    a2disconf, a2ensite, a2dissite ; systemctl reload|restart|start apache2 refuse une configuration cassée ;
 *    curl (et curl -I, -v, -X, -L, -k) vers un serveur Apache reflète la configuration ACTIVE (la dernière chargée).
 *  - TLS : openssl x509 (-dates, -subject, -issuer, -enddate, -startdate, -serial, -fingerprint, -text, -checkend),
 *    openssl s_client (-connect, -servername, -tls1 ... -tls1_3, -brief), openssl req -x509 -newkey.
 *  - Fichiers et montages : getcap, setcap, mount, findmnt ; noexec appliqué par le moteur (./script dans /tmp).
 *  - Noyau : sysctl (-a, -n, -w, -p, --system), lsmod, modprobe (-r, -n, -v) qui respecte /etc/modprobe.d.
 *  - Démarrage : grub-mkpasswd-pbkdf2, update-grub, grub-mkconfig, cryptsetup status et luksDump (lecture seule).
 *  - Audit et journaux : auditctl, augenrules, ausearch, aureport, logger, rsyslogd -N1, logrotate -d/-f,
 *    journalctl (--disk-usage, --header, -t, -p), timedatectl, chronyc.
 *  - Protections : aa-status, aa-enforce, aa-complain, aa-disable, fail2ban-client, rkhunter --check.
 *  - La Pierre d'Inspection : lynis audit system, lynis show details, lynis --version.
 *
 * Tout est défensif : on règle, on vérifie, on lit les traces. openssl s_client sert à vérifier sa propre configuration.
 * Ces sorts n'entrent dans aucune liste ORDRE_DES_SORTS : tant qu'aucun chapitre ne les enseigne, ils sont « hors
 * barème » (pas d'XP de premier usage). Les sorts existants qu'on étend (curl, openssl, sysctl, systemctl, journalctl,
 * timedatectl, chronyc, fail2ban-client, rkhunter) gardent leur comportement partout ailleurs : on ne prend la main
 * que sur une machine qui possède les fichiers concernés (voir chaque section).
 *
 * --- État et sauvegarde ---
 * Tout l'état d'exécution (ce qui est « chargé » : configuration active d'Apache, valeurs du noyau, modules, montages,
 * règles et journal d'audit, journald, rsyslog, fail2ban, AppArmor, dernier passage de lynis) vit dans
 * state.reseau.guet.hotes[HOTE], sauvegardé avec la partie (state.reseau est sauvegardé tel quel).
 * Une machine « démarre » (amorcerGuet) la première fois qu'on y entre ou qu'on l'interroge : ses fichiers sont lus
 * comme au démarrage. Ensuite, modifier un fichier ne change rien tant qu'on ne recharge pas (systemctl reload,
 * sysctl --system, mount -o remount, augenrules --load...), comme sur un vrai serveur.
 * Les capacités (setcap) sont rangées sur les objets (item.capacites) et sauvegardées avec eux.
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   apachectl     { hote, action: "configtest" | "-M" | "-S", ok, erreur }
 *   apacheReload  { hote, action: "reload" | "restart" | "start", ok, erreur }      (configuration chargée, ou refusée)
 *   a2mod         { hote, cmd: "a2enmod"..., objet: "module" | "conf" | "site", action: "enable" | "disable", noms, changes }
 *   curl          { guet: true, hote, url, cheminUrl, methode, code, entetes (-I), https, serveur, enTetes: { Nom: valeur }, verification, erreur }
 *   s_client      { hote, port, protocole (demandé : "TLSv1.1"... ou null), negocie, ok, verification (0, 10...), certificat (sujet) }
 *   x509          { fichier, options: [...], expire (bool), checkend (bool ou null) }
 *   opensslReq    { cle, certificat, jours, sujet, x509 }
 *   setcap        { hote, chemin, item, capacites, retire }          getcap { hote, chemins, trouves }
 *   mount         { hote, action: "list" | "all" | "remount" | "mount" | "findmnt", cible, options }
 *   noexec        { hote, chemin }                                   (./script refusé dans un montage noexec)
 *   sysctl        { host, hote, action: "read" | "write" | "all" | "file" | "system", cles }   (comme celui de l'Annexe)
 *   sysctlSystem  { hote, fichiers, cles, sudo }
 *   modprobe      { hote, module, action: "load" | "remove" | "dry-run", ok, bloque, blackliste, retires }    lsmod { hote }
 *   grubMdp       { ok, iterations }    grubUpdate { hote, ok, superusers, motDePasse, protege, erreur, sortie }
 *   cryptsetup    { hote, action, cible }
 *   auditctl      { hote, action: "add" | "remove" | "list" | "delete" | "status" | "enable" | "erreur", regle, chemin, cle, perms }
 *   augenrules    { hote, regles, ok, fichiers }
 *   audit         { hote, evenement }        (le moteur vient d'écrire un événement dans le journal d'audit de la machine)
 *   ausearch      { hote, cle, fichier, nombre, evenements }       aureport { hote, rapport, resume, nombre }
 *   logger        { hote, tag, priorite: "auth.warning", message, serveur }
 *   rsyslog       { hote, action: "check" | "restart" | "forward", ok, distants: ["journaux:514"], message }
 *   logrotate     { hote, debug, force, fichiers (ceux qui ont tourné), erreurs, configs }
 *   journald      { hote, stockage: "persistent" | "volatile", action }
 *   timedatectl   { action, host, hote, oui, service, synchronise, fuseau }    chronycGuet { host, hote, action, synchronise }
 *                 (chronycGuet et non chronyc : l'événement chronyc de l'Annexe valide une quête du chapitre 2)
 *   apparmor      { hote, action: "status" | "enforce" | "complain" | "disable" | "reload" | "remove", profil, fichier }
 *   fail2ban      { args, hote, action, jail, ip }      rkhunter { alertes, hote, details }
 *   lynis         { hote, score, controles: [{ id, ok, poids }], sudo }
 *   et ceux des sorts d'avant : systemctl (reload), service (Reseau.js, quand un service démarre ou s'arrête), write.
 *
 * --- Ce qu'un futur chapitre peut appeler ---
 *   Fichiers d'une machine (chemins absolus de la machine, sans être dessus) :
 *     poserFichierHote(hote, "/etc/x.conf", texte, { mode, owner, lien, binaire, age })   crée les dossiers ; lien relatif accepté
 *     creerDossierHote(hote, "/var/log/x", { mode, owner })   lireFichierHote(hote, chemin) : texte ou null
 *     noeudHoteGuet(hote, chemin) : Room, Item ou null     fichiersDuDossierGuet(hote, dossier, "*.conf")     supprimerFichierHoteGuet(hote, chemin)
 *   installerApacheDebian(hote, { serverName, tokens: "OS", signature: "On", trace: "Off", ssl: false, modules: [], cert, cle, index })
 *     pose un Apache Debian complet (apache2.conf, ports.conf, mods/conf/sites available et enabled, page d'accueil)
 *   configApache(hote) : la configuration sur le disque, parsée     apacheActive(hote) : celle qui tourne (dernier chargement)
 *   fabriquerCertificat({ sujet: "CN = bastion", emetteur, debut: Date, fin: Date, san: ["bastion"], algo: "rsa:2048", cle: "id" }) : PEM
 *   fabriquerCle("id") : PEM     lireCertificat(pem) : { sujet, emetteur, debut, fin, san... } ou null     declarerAutorite("C = FR, ...")
 *   declarerNoyau(hote, { version, sysctl: { "net.ipv4.ip_forward": 1 }, modules: { charges: [...], disponibles: [{ nom, taille, chemin }] } })
 *   declarerChiffrement(hote, { nom: "sda3_crypt", device: "/dev/sda3", uuid, keyslots: [0, 1] })   (sinon /etc/crypttab suffit)
 *   amorcerGuet(hote, force) / redemarrerGuet(hote) : (re)démarrer la machine (fstab, sysctl --system, modules, rules.d, Apache, journald...)
 *   ajouterEvenementAudit(hote, { chemin, perm: "w"|"a"|"r"|"x", cle, comm, exe, auid, uid, succes, quand: Date })   (fichier surveillé)
 *   ajouterEvenementAudit(hote, { type: "USER_AUTH" | "USER_LOGIN" | "ADD_USER"..., acct, adresse, succes, comm, exe, quand })
 *   auditSous(hote, { comm: "useradd", exe, auid: 4294967295, uid: 0 }, function(){ ...modifier des fichiers... })
 *   journalGuet(hote, { unite: "sshd", message, prio: 0..7, fac: "auth", quand: Date })    journauxDistants(hote) : { "journaux:514": [lignes] }
 *   fail2banEchec(hote, "sshd", ip, n) : vrai si l'adresse vient d'être bannie      fail2banBannir(hote, "sshd", ip)
 *   declarerControleLynis({ id, section, libelle, poids, gravite: "warning" | "suggestion", conseil, details,
 *                           verifier: function(hote){ return true | false | null (non applicable) | { ok, details } } })
 *   retirerControleLynis(id)    scoreLynis(hote, filtre) : { score, controles: [{ id, ok, poids }] }    CONTROLES_LYNIS
 *   sshEffectiveGuet(hote), horlogeSynchronisee(hote), uniteMasquee(hote, "ctrl-alt-del.target"), montages(hote), modulesCharges(hote)
 *   definirHorlogeGuet(function(){ return new Date(...); })   l'heure du jeu (l'horloge de la nuit) pour les journaux et les certificats
 *   SOURCES_GUET : les branchements vers d'autres moteurs, chacun avec un repli qui lit les fichiers :
 *     sshEffective(hote) -> { permitrootlogin: "no", ... }   uniteMasquee(hote, unite) -> bool   paquetsEnRetard(hote) -> nombre
 *     parefeuActif(hote) -> bool   portJoignable(source, cible, port) -> bool   aideBase(hote) -> bool
 *   sortGuetHorsBareme(sort) : vrai tant qu'aucune liste ORDRE_DES_SORTS ne contient le sort (pas d'XP de premier usage).
 */

/* ================================================================== */
/* Outils communs                                                      */
/* ================================================================== */

var SORTS_GUET = ["apachectl", "apache2ctl", "a2enmod", "a2dismod", "a2enconf", "a2disconf", "a2ensite", "a2dissite",
	"getcap", "setcap", "mount", "findmnt", "lsmod", "modprobe", "grub-mkpasswd-pbkdf2", "update-grub", "grub-mkconfig", "cryptsetup",
	"auditctl", "augenrules", "ausearch", "aureport", "logger", "rsyslogd", "logrotate", "aa-status", "aa-enforce", "aa-complain",
	"aa-disable", "lynis"];

/* L'heure du jeu : la nuit du Bastion peut avoir sa propre horloge. */
var HORLOGE_GUET = null;
function definirHorlogeGuet(fonction){ HORLOGE_GUET = typeof fonction === "function" ? fonction : null; }
function maintenantGuet(){
	if (HORLOGE_GUET){
		try { var d = HORLOGE_GUET(); if (d instanceof Date && !isNaN(d.getTime())) return new Date(d.getTime()); } catch (e){}
	}
	return new Date();
}

/* Les branchements vers les moteurs voisins (SortsBastion.js...). Chacun peut être remplacé ; null : « je ne sais pas ». */
var SOURCES_GUET = {
	sshEffective: null,      // function(hote) -> { permitrootlogin: "no", ... } (clés en minuscules)
	uniteMasquee: null,      // function(hote, unite) -> bool
	paquetsEnRetard: null,   // function(hote) -> nombre de paquets à mettre à jour, ou null
	parefeuActif: null,      // function(hote) -> bool
	portJoignable: null      // function(source, cible, port) -> bool
};

function deux(n){ return n < 10 ? "0" + n : "" + n; }
function trois(n){ return n < 10 ? "00" + n : (n < 100 ? "0" + n : "" + n); }
function echappeRegExp(t){ return String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function racineDeGuet(h){
	if (!h || typeof HOTES === "undefined" || !HOTES[h] || typeof HOTES[h].arrivee !== "function") return null;
	var lieu;
	try { lieu = HOTES[h].arrivee(); } catch (e){ return null; }
	var r = lieu ? racineDe(lieu) : null;
	return r && r.racineHote === h ? r : null;
}
function hoteIci(){ return Shell.hote(); }

/* Un nœud d'une machine, par son chemin absolu (/etc/apache2/apache2.conf). Les raccourcis sont suivis, sauf le dernier si brut. */
function noeudHoteGuet(h, chemin, brut){
	var racine = racineDeGuet(h);
	if (!racine) return null;
	var morceaux = String(chemin).split("/").filter(function(m){ return m !== "" && m !== "."; });
	var lieu = racine;
	for (var i = 0; i < morceaux.length; i++){
		var m = morceaux[i];
		if (m === ".."){ lieu = lieu === racine ? racine : (lieu.parents[0] || racine); continue; }
		var n = lieu.getNode(m);
		if (n === null) return null;
		var dernier = i === morceaux.length - 1;
		if (n instanceof Item && n.lien && !(dernier && brut)){
			n = suivreLienHote(h, n, lieu);
			if (n === null) return null;
		}
		if (dernier) return n;
		if (!(n instanceof Room)) return null;
		lieu = n;
	}
	return lieu;
}
/* Un raccourci : chemin absolu de la machine (/etc/...), relatif (../mods-available/x.load) ou chemin du jeu (~/...). */
function suivreLienHote(h, item, lieu, garde){
	garde = (garde || 0) + 1;
	if (garde > 8) return null;
	var cible = item.lien, n = null;
	if (cible.charAt(0) === "~"){
		try { n = Shell.chercherDepuis(Home, cible, { sudo: true }, "").node; } catch (e){ n = null; }
	} else if (cible.charAt(0) === "/"){
		n = noeudHoteGuet(h, cible, true);
	} else {
		n = noeudHoteGuet(h, cheminDeLieu(lieu) + "/" + cible, true);
	}
	if (n instanceof Item && n.lien) return suivreLienHote(h, n, null, garde);
	return n;
}
function cheminDeLieu(lieu){ return typeof Shell.cheminAffiche === "function" ? Shell.cheminAffiche(lieu) : lieu.path(); }
function lireFichierHote(h, chemin){
	var n = noeudHoteGuet(h, chemin);
	return n instanceof Item ? n.getText() : null;
}
function fichierHoteGuet(h, chemin){
	var n = noeudHoteGuet(h, chemin);
	return n instanceof Item ? n : null;
}
function dossierHoteGuet(h, chemin){
	var n = noeudHoteGuet(h, chemin);
	return n instanceof Room ? n : null;
}
/* Les objets d'un dossier, triés par nom (comme un glob). */
function fichiersDuDossierGuet(h, chemin, motif){
	var d = dossierHoteGuet(h, chemin);
	if (!d) return [];
	var re = motif ? motifVersRegExp(motif) : null;
	return d.items.map(function(it){ return it.itemname; }).filter(function(n){ return !re || re.test(n); }).sort()
		.map(function(n){ return { nom: n, chemin: chemin.replace(/\/$/, "") + "/" + n, item: d.getItemFromName(n) }; });
}
function creerDossierHote(h, chemin, options){
	options = options || {};
	var racine = racineDeGuet(h);
	if (!racine) return null;
	var lieu = racine, morceaux = String(chemin).split("/").filter(Boolean);
	morceaux.forEach(function(m, k){
		var n = lieu.getNode(m), dernier = k === morceaux.length - 1;
		if (!(n instanceof Room)){
			n = new Room(m, (dernier && options.intro) || "Un dossier du système.", (dernier && options.image) || "loc_etc.gif");
			n.owner = (dernier && options.owner) || "root";
			n.mode = (dernier && options.mode) || "rwxr-xr-x";
			if (lieu.chapitre) n.chapitre = lieu.chapitre;
			link_rooms(lieu, n);
		}
		lieu = n;
	});
	return lieu;
}
function poserFichierHote(h, chemin, texte, options){
	options = options || {};
	var coupe = String(chemin).lastIndexOf("/");
	var dossier = creerDossierHote(h, chemin.substring(0, coupe), {});
	if (!dossier) return null;
	var nom = chemin.substring(coupe + 1);
	var item = dossier.getNode(nom);
	if (item instanceof Room) return null;
	if (!item){
		item = new Item(nom, "", options.image || "item_sign.gif");
		dossier.addItem(item);
	}
	if (options.lien !== undefined){
		item.lien = options.lien;
		item.mode = "rwxrwxrwx";
		if (options.lien.charAt(0) !== "/" && options.lien.charAt(0) !== "~") item.dossierLien = chemin.substring(0, coupe) || "/";
	}
	else {
		item.setText(String(texte === undefined || texte === null ? "" : texte).replace(/\n$/, ""));
		// Posé par le monde au chargement : c'est l'état d'origine, pas une modification de la partie.
		if (!World.fige) item.modifie = false;
	}
	if (options.mode && options.lien === undefined) item.mode = options.mode;
	if (!options.mode && options.lien === undefined && !item.mode) item.mode = "rw-r--r--";
	if (options.owner) item.owner = options.owner;
	else if (item.owner === "terminus") item.owner = "root";
	if (options.binaire) item.binaire = options.binaire;
	if (options.age !== undefined) item.age = options.age;
	return item;
}
function supprimerFichierHoteGuet(h, chemin){
	var coupe = String(chemin).lastIndexOf("/");
	var d = dossierHoteGuet(h, chemin.substring(0, coupe) || "/");
	if (!d) return false;
	return !!d.removeItem(chemin.substring(coupe + 1));
}
/* Les lignes utiles d'un fichier de configuration : sans commentaires (#) ni lignes vides, avec leur numéro. */
function lignesConf(texte, commentaire){
	var re = commentaire || /^\s*#/;
	return String(texte || "").split("\n").map(function(l, i){ return { n: i + 1, texte: l }; })
		.filter(function(l){ return l.texte.trim() !== "" && !re.test(l.texte); });
}
function exigerRacine(io, message, astuceTexte){
	if (!io.sudo) throw new ShellError(message + astuce(io, astuceTexte || "Réservé à root : relance la commande avec sudo devant."));
}
function absentIci(io, cmd, paquet){
	throw new ShellError(cmd + ": command not found" + astuce(io, "Sur " + hoteIci() + ", " + (paquet || cmd) + " n'est pas installé : il n'y a pas sa configuration. " +
		"Ce sort sert sur les serveurs qui l'ont (le Bastion, par exemple)."), 127);
}
function uidDe(nom){
	if (typeof UTILISATEURS !== "undefined" && UTILISATEURS.hasOwnProperty(nom)) return UTILISATEURS[nom];
	return nom === "root" ? 0 : 1000;
}
function nomDeUid(uid){
	if (uid === 4294967295 || uid === -1) return "unset";
	if (typeof UTILISATEURS !== "undefined") for (var k in UTILISATEURS){ if (UTILISATEURS.hasOwnProperty(k) && UTILISATEURS[k] === uid) return k; }
	return String(uid);
}
/* Un petit condensé d'un texte, pour voir s'il a changé (et fabriquer des numéros stables). */
function condense(texte){
	var h = 5381, t = String(texte);
	for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
	return h;
}
function hexa(n, longueur){ var t = (n >>> 0).toString(16); while (t.length < longueur) t = "0" + t; return t; }
/* Des octets hexadécimaux tirés d'un texte, toujours les mêmes pour le même texte. */
function hexDe(texte, longueur){
	var t = "", k = 0;
	while (t.length < longueur){ t += sha256(texte + ":" + k); k++; }
	return t.substring(0, longueur);
}

/* --- Les dates, dans les formats des vrais outils --- */
function dateUtcOpenssl(d){ return MOIS_ANGLAIS[d.getUTCMonth()] + " " + completerGauche(d.getUTCDate(), 2) + " " + deux(d.getUTCHours()) + ":" + deux(d.getUTCMinutes()) + ":" + deux(d.getUTCSeconds()) + " " + d.getUTCFullYear() + " GMT"; }
function dateHttp(d){ return JOURS_EN[d.getUTCDay()] + ", " + deux(d.getUTCDate()) + " " + MOIS_ANGLAIS[d.getUTCMonth()] + " " + d.getUTCFullYear() + " " + deux(d.getUTCHours()) + ":" + deux(d.getUTCMinutes()) + ":" + deux(d.getUTCSeconds()) + " GMT"; }
function dateAudit(d){ return deux(d.getMonth() + 1) + "/" + deux(d.getDate()) + "/" + d.getFullYear() + " " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()); }
function dateCtime(d){ return JOURS_EN[d.getDay()] + " " + MOIS_ANGLAIS[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()) + " " + d.getFullYear(); }
function dateIsoGuet(d){ return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()) + " " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()); }
function dateRsyslog(d){
	var dec = -d.getTimezoneOffset(), signe = dec >= 0 ? "+" : "-";
	dec = Math.abs(dec);
	return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()) + "T" + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()) +
		"." + trois(d.getMilliseconds()) + "000" + signe + deux(Math.floor(dec / 60)) + ":" + deux(dec % 60);
}
function dateSyslogCourte(d){ return MOIS_ANGLAIS[d.getMonth()] + " " + deux(d.getDate()) + " " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()); }

/* ================================================================== */
/* L'état des machines (sauvegardé) et leur démarrage                  */
/* ================================================================== */

function etatGuet(){
	if (!state.reseau || typeof state.reseau !== "object") state.reseau = { parefeu: { actif: false, regles: [] }, services: {}, cles: {}, hotesUname: {} };
	if (!state.reseau.guet || typeof state.reseau.guet !== "object") state.reseau.guet = { hotes: {} };
	if (!state.reseau.guet.hotes) state.reseau.guet.hotes = {};
	return state.reseau.guet;
}
/* L'état d'exécution d'une machine : il est créé au premier usage, comme si la machine venait de démarrer. */
function etatHote(h){
	var g = etatGuet();
	if (!g.hotes[h] || !g.hotes[h].demarre) amorcerGuet(h);
	return g.hotes[h];
}
function machineGardee(h){ return !!racineDeGuet(h); }

/* Ce que le monde déclare du noyau d'une machine (valeurs par défaut, modules présents). */
var NOYAUX_GUET = {};
function declarerNoyau(h, infos){
	NOYAUX_GUET[h] = NOYAUX_GUET[h] || {};
	for (var k in infos){ if (infos.hasOwnProperty(k)) NOYAUX_GUET[h][k] = infos[k]; }
}
function versionNoyau(h){ return (NOYAUX_GUET[h] && NOYAUX_GUET[h].version) || (HOTES[h] && HOTES[h].noyau) || "6.1.0-21-amd64"; }

/* Démarrer une machine : tout ce qui est lu au démarrage est relu (force : même si elle tourne déjà). */
function amorcerGuet(h, force){
	var g = etatGuet();
	if (g.hotes[h] && g.hotes[h].demarre && !force) return g.hotes[h];
	var ancien = g.hotes[h] || {};
	var e = { demarre: true, journal: ancien.journal || [], audit: { regles: [], enabled: 1, failure: 1, journal: (ancien.audit && ancien.audit.journal) || [], serie: (ancien.audit && ancien.audit.serie) || 300, sigs: {} },
		lynis: ancien.lynis || null, f2b: { bannis: (ancien.f2b && ancien.f2b.bannis) || {}, echecs: (ancien.f2b && ancien.f2b.echecs) || {}, total: (ancien.f2b && ancien.f2b.total) || {}, conf: null },
		rsyslog: { conf: null, envois: (ancien.rsyslog && ancien.rsyslog.envois) || {} } };
	g.hotes[h] = e;
	if (!machineGardee(h)) return e;
	try { e.sysctl = sysctlDemarrage(h); } catch (x){ e.sysctl = {}; }
	try { e.modules = modulesDemarrage(h); } catch (x){ e.modules = []; }
	try { e.montages = montagesDemarrage(h); } catch (x){ e.montages = []; }
	try { var c = configApache(h); e.apache = c && !c.erreur ? c : null; e.apacheEchec = !!(c && c.erreur); } catch (x){ e.apache = null; }
	try { chargerReglesAudit(h, e, false); } catch (x){}
	try { e.journald = stockageJournald(h); } catch (x){ e.journald = "volatile"; }
	try { e.rsyslog.conf = lireRsyslog(h).regles; } catch (x){ e.rsyslog.conf = []; }
	try { var f = lireFail2ban(h); e.f2b.conf = f.erreur ? null : f.jails; } catch (x){ e.f2b.conf = null; }
	try { e.apparmor = profilsDemarrage(h); } catch (x){ e.apparmor = {}; }
	return e;
}
function redemarrerGuet(h){ return amorcerGuet(h, true); }

/* On démarre une machine dès qu'on y met le pied : ce qu'on modifie ensuite ne compte qu'une fois rechargé. */
GameEvents.addListener("enter", function(e){
	try {
		var r = e && e.room ? racineDe(e.room) : null;
		if (r && r.racineHote && machineGardee(r.racineHote)){
			var g = etatGuet();
			if (!g.hotes[r.racineHote] || !g.hotes[r.racineHote].demarre) amorcerGuet(r.racineHote);
		}
	} catch (x){}
});

/* Une ligne de journal de la machine (journalctl), recopiée dans /var/log/syslog quand rsyslog tourne. */
var PRIORITES_SYSLOG = ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"];
var FACILITES_SYSLOG = ["kern", "user", "mail", "daemon", "auth", "syslog", "lpr", "news", "uucp", "cron", "authpriv", "ftp",
	"ntp", "security", "console", "solaris-cron", "local0", "local1", "local2", "local3", "local4", "local5", "local6", "local7"];
function journalGuet(h, entree){
	if (!machineGardee(h)) return;
	var e = etatHote(h), d = entree.quand instanceof Date ? entree.quand : maintenantGuet();
	var ligne = { heure: deux(d.getHours()) + ":" + deux(d.getMinutes()), secondes: deux(d.getSeconds()), unite: entree.unite || "kernel",
		message: String(entree.message || ""), prio: entree.prio === undefined ? 6 : entree.prio, fac: entree.fac || "user", t: d.getTime() };
	e.journal.push(ligne);
	if (e.journal.length > 300) e.journal.splice(0, e.journal.length - 300);
	if (entree.syslog !== false) versRsyslog(h, ligne, d);
}

/* ================================================================== */
/* Apache : un modèle générique qui lit /etc/apache2                   */
/* ================================================================== */

var APACHE_VERSION = "2.4.62";
var OPENSSL_VERSION = "3.0.15";
var APACHE_RACINE = "/etc/apache2";
var APACHE_ENV = { APACHE_RUN_USER: "www-data", APACHE_RUN_GROUP: "www-data", APACHE_PID_FILE: "/var/run/apache2/apache2.pid",
	APACHE_RUN_DIR: "/var/run/apache2", APACHE_LOCK_DIR: "/var/lock/apache2", APACHE_LOG_DIR: "/var/log/apache2" };
var MODULES_STATIQUES = ["core", "so", "watchdog", "http", "log_config", "logio", "version", "unixd"];

/* Chaque directive et le module qui la fournit (« core » : toujours là). */
var DIRECTIVES_APACHE = (function(){
	var t = {};
	function ajoute(module, liste){ liste.split(" ").forEach(function(d){ t[d] = module; }); }
	ajoute("core", "acceptfilter acceptpathinfo accessfilename adddefaultcharset allowencodedslashes allowoverride allowoverridelist " +
		"defaultruntimedir define documentroot enablemmap enablesendfile error errordocument errorlog errorlogformat fileetag hostnamelookups " +
		"include includeoptional keepalive keepalivetimeout limitrequestbody limitrequestfields limitrequestfieldsize limitrequestline " +
		"loglevel maxkeepaliverequests mutex options pidfile protocols protocolshonororder servername serveralias serveradmin serverroot " +
		"serversignature servertokens sethandler setinputfilter setoutputfilter timeout traceenable usecanonicalname listen loadmodule " +
		"loadfile user group listenbacklog startservers serverlimit maxrequestworkers maxconnectionsperchild minsparethreads maxsparethreads " +
		"threadlimit threadsperchild minspareservers maxspareservers maxrequestsperchild maxclients defaulttype contentdigest " +
		"httpprotocoloptions mergetrailers qualifyredirecturl regexdefaultoptions");
	ajoute("log_config", "logformat customlog transferlog bufferedlogs globallog");
	ajoute("authz_core", "require authmerging authzsendforbiddenonfailure");
	ajoute("access_compat", "order allow deny satisfy");
	ajoute("alias", "alias aliasmatch redirect redirectmatch redirectpermanent redirecttemp scriptalias scriptaliasmatch");
	ajoute("dir", "directoryindex directoryslash fallbackresource directorycheckhandler directoryindexredirect");
	ajoute("autoindex", "indexoptions indexignore indexignorereset indexorderdefault indexstylesheet indexheadinsert addicon addiconbytype " +
		"addiconbyencoding addalt addaltbytype addaltbyencoding adddescription defaulticon headername readmename");
	ajoute("mime", "addtype addencoding addcharset addhandler addlanguage addoutputfilter addinputfilter typesconfig removehandler removetype defaultlanguage multiviewsmatch");
	ajoute("headers", "header requestheader");
	ajoute("rewrite", "rewriteengine rewriterule rewritecond rewritebase rewriteoptions rewritemap");
	ajoute("ssl", "sslengine sslprotocol sslciphersuite sslcertificatefile sslcertificatekeyfile sslcertificatechainfile sslcacertificatefile " +
		"sslcacertificatepath sslhonorcipherorder sslsessioncache sslsessioncachetimeout sslrandomseed ssloptions sslpassphrasedialog " +
		"sslcompression sslsessiontickets sslusestapling sslstaplingcache sslopensslconfcmd sslverifyclient sslverifydepth sslstrictsnivhostcheck");
	ajoute("setenvif", "setenvif setenvifnocase setenvifexpr browsermatch browsermatchnocase");
	ajoute("negotiation", "languagepriority forcelanguagepriority cachenegotiateddocs");
	ajoute("deflate", "deflatecompressionlevel deflatebuffersize deflatememlevel deflatewindowsize deflatefilternote");
	ajoute("filter", "addoutputfilterbytype filterdeclare filterprovider filterchain filtertrace filterprotocol");
	ajoute("reqtimeout", "requestreadtimeout");
	ajoute("status", "extendedstatus seemrequesttail");
	ajoute("env", "setenv unsetenv passenv");
	ajoute("auth_basic", "authbasicprovider authbasicauthoritative authbasicfake authbasicusedigestalgorithm");
	ajoute("authn_core", "authtype authname");
	ajoute("authn_file", "authuserfile");
	ajoute("authz_user", "");
	ajoute("expires", "expiresactive expiresbytype expiresdefault");
	ajoute("http2", "h2direct h2push h2upgrade h2maxsessionstreams");
	ajoute("socache_shmcb", "");
	return t;
})();
var SECTIONS_APACHE = ["directory", "directorymatch", "files", "filesmatch", "location", "locationmatch", "virtualhost", "ifmodule",
	"ifdefine", "ifversion", "iffile", "limit", "limitexcept", "requireall", "requireany", "requirenone", "if", "elseif", "else", "proxy"];
var OPTIONS_APACHE = { indexes: "Indexes", followsymlinks: "FollowSymLinks", symlinksifownermatch: "SymLinksIfOwnerMatch", execcgi: "ExecCGI",
	includes: "Includes", includesnoexec: "IncludesNOEXEC", multiviews: "MultiViews", all: "All", none: "None" };

function ErreurApache(message, fichier, ligne){ this.message = message; this.fichier = fichier; this.ligne = ligne; }

/* Les mots d'une ligne de configuration Apache : "entre guillemets" (avec \" dedans) ou séparés par des espaces. */
function motsApache(ligne){
	var mots = [], i = 0, n = ligne.length;
	while (i < n){
		var c = ligne.charAt(i);
		if (c === " " || c === "\t"){ i++; continue; }
		if (c === "\"" || c === "'"){
			var q = c, mot = "";
			i++;
			while (i < n && ligne.charAt(i) !== q){
				if (ligne.charAt(i) === "\\" && i + 1 < n){ mot += ligne.charAt(i + 1); i += 2; continue; }
				mot += ligne.charAt(i);
				i++;
			}
			i++;
			mots.push(mot);
			continue;
		}
		var debut = i;
		while (i < n && ligne.charAt(i) !== " " && ligne.charAt(i) !== "\t") i++;
		mots.push(ligne.substring(debut, i));
	}
	return mots;
}
function remplacerEnvApache(texte, avert){
	return texte.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, function(tout, nom){
		if (APACHE_ENV.hasOwnProperty(nom)) return APACHE_ENV[nom];
		if (avert.indexOf(nom) === -1) avert.push(nom);
		return tout;
	});
}
function nomModuleApache(m){ return String(m).replace(/^mod_/, "").replace(/\.c$/, "").replace(/_module$/, ""); }
function cheminNormalGuet(p){
	var morceaux = [];
	String(p).split("/").forEach(function(m){ if (m === "" || m === ".") return; if (m === "..") morceaux.pop(); else morceaux.push(m); });
	return "/" + morceaux.join("/");
}

/*
 * La configuration d'Apache telle qu'elle est sur le disque (ce que lirait « apachectl configtest »).
 * Renvoie null si Apache n'est pas installé (pas de /etc/apache2/apache2.conf), sinon :
 * { erreur: null | { message, fichier, ligne, texte }, avertissements: [...], modules: [...], listen: [ports],
 *   serveur: { tokens, signature, trace, serverName, serverAdmin, documentRoot, headers, options, directories, ssl... },
 *   vhosts: [{ adresse, port, fichier, ligne, serverName, aliases, documentRoot, ssl, sslProtocol, cert, cle, headers,
 *              redirects, rewrites, directories, trace, signature }] }
 */
function configApache(h){
	if (!fichierHoteGuet(h, APACHE_RACINE + "/apache2.conf")) return null;
	var c = { erreur: null, avertissements: [], modules: MODULES_STATIQUES.slice(), listen: [], vhosts: [], varsInconnues: [],
		serveur: { tokens: null, signature: null, trace: null, serverName: null, serverAdmin: null, documentRoot: null, headers: [],
			directories: [], redirects: [], rewrites: [], rewriteEngine: false, sslProtocol: null, sslEngine: false, directoryIndex: null,
			sslSessionCache: null, user: null, group: null }, lus: 0 };
	var pile = [{ type: "racine", actif: true }];
	try {
		lireFichierApache(h, APACHE_RACINE + "/apache2.conf", c, pile, true);
		if (!c.modules.some(function(m){ return /^mpm_/.test(m); })) c.erreur = { message: "AH00534: apache2: Configuration error: No MPM loaded.", sansLigne: true };
		else verifierApacheFinal(h, c);
	} catch (e){
		if (!(e instanceof ErreurApache)) throw e;
		c.erreur = { message: e.message, fichier: e.fichier, ligne: e.ligne };
	}
	if (!c.serveur.serverName) c.avertissements.push("AH00558: apache2: Could not reliably determine the server's fully qualified domain name, using 127.0.1.1. Set the 'ServerName' directive globally to suppress this message");
	c.varsInconnues.forEach(function(v){ c.avertissements.unshift("AH00111: Config variable ${" + v + "} is not defined"); });
	return c;
}
function texteErreurApache(e){
	if (e.sansLigne) return e.message;
	return "AH00526: Syntax error on line " + e.ligne + " of " + e.fichier + ":\n" + e.message;
}

function lireFichierApache(h, chemin, c, pile, obligatoire){
	if (++c.lus > 200) throw new ErreurApache("Exceeded the maximum include directory nesting level of 128.", chemin, 1);
	var item = fichierHoteGuet(h, chemin);
	if (!item) throw new ErreurApache("Could not open configuration file " + chemin + ": No such file or directory", chemin, 1);
	var lignes = String(item.getText()).split("\n"), profondeurDepart = pile.length;
	for (var i = 0; i < lignes.length; i++){
		var numero = i + 1, brute = lignes[i];
		while (/\\\s*$/.test(brute) && i + 1 < lignes.length){ brute = brute.replace(/\\\s*$/, " ") + lignes[++i]; }
		var ligne = brute.trim();
		if (ligne === "" || ligne.charAt(0) === "#") continue;
		ligne = remplacerEnvApache(ligne, c.varsInconnues);
		var haut = pile[pile.length - 1];
		var actif = pile.every(function(p){ return p.actif !== false; });
		if (ligne.charAt(0) === "<"){
			if (ligne.charAt(1) === "/"){
				var nomFin = ligne.replace(/^<\/\s*/, "").replace(/>.*$/, "").trim().toLowerCase();
				if (pile.length <= profondeurDepart || haut.type === "racine"){
					throw new ErreurApache("</" + ligne.replace(/^<\/\s*/, "").replace(/>.*$/, "").trim() + "> without matching <" + ligne.replace(/^<\/\s*/, "").replace(/>.*$/, "").trim() + "> section", chemin, numero);
				}
				if (haut.section !== nomFin){
					throw new ErreurApache("Expected </" + haut.nomAffiche + "> but saw </" + ligne.replace(/^<\/\s*/, "").replace(/>.*$/, "").trim() + ">", chemin, numero);
				}
				pile.pop();
				continue;
			}
			if (ligne.indexOf(">") === -1) throw new ErreurApache("<" + ligne.substring(1).split(/\s/)[0] + "> directive missing closing '>'", chemin, numero);
			var dedans = ligne.substring(1, ligne.lastIndexOf(">")).trim();
			var motsS = motsApache(dedans), nomS = motsS[0], sectionL = nomS.toLowerCase(), argsS = motsS.slice(1);
			if (SECTIONS_APACHE.indexOf(sectionL) === -1){
				if (!actif){ pile.push({ type: "inconnue", section: sectionL, nomAffiche: nomS, actif: false }); continue; }
				throw new ErreurApache("Invalid command '<" + nomS + "', perhaps misspelled or defined by a module not included in the server configuration", chemin, numero);
			}
			if (!argsS.length && sectionL !== "else" && sectionL !== "requireall" && sectionL !== "requireany" && sectionL !== "requirenone"){
				throw new ErreurApache("<" + nomS + "> directive requires additional arguments", chemin, numero);
			}
			var entree = { type: sectionL, section: sectionL, nomAffiche: nomS, actif: true, fichier: chemin, ligne: numero };
			if (!actif) entree.actif = false;
			else if (sectionL === "ifmodule"){
				var negation = argsS[0].charAt(0) === "!", nomMod = nomModuleApache(argsS[0].replace(/^!/, ""));
				var charge = c.modules.indexOf(nomMod) > -1;
				entree.actif = negation ? !charge : charge;
			} else if (sectionL === "ifdefine"){
				entree.actif = argsS[0].charAt(0) === "!";
			} else if (sectionL === "virtualhost"){
				if (pile.some(function(p){ return p.type === "virtualhost"; })) throw new ErreurApache("<VirtualHost> cannot occur within <VirtualHost> section", chemin, numero);
				var adresse = argsS[0], port = /:(\d+|\*)$/.exec(adresse);
				var vh = { adresse: adresse, port: port ? (port[1] === "*" ? 0 : +port[1]) : 0, fichier: chemin, ligne: numero, serverName: null, aliases: [],
					documentRoot: null, ssl: false, sslProtocol: null, cert: null, cle: null, headers: [], redirects: [], rewrites: [], rewriteEngine: false,
					directories: [], trace: null, signature: null, serverAdmin: null };
				c.vhosts.push(vh);
				entree.vhost = vh;
			} else if (sectionL === "directory" || sectionL === "directorymatch"){
				var contexte = vhostCourant(pile) || c.serveur;
				var dir = { chemin: sectionL === "directory" ? cheminNormalGuet(argsS[0].replace(/^"|"$/g, "")) : null, motif: sectionL === "directorymatch" ? argsS[0] : null,
					options: [], require: null, signature: null, headers: [], fichier: chemin, ligne: numero };
				contexte.directories.push(dir);
				entree.directory = dir;
			}
			pile.push(entree);
			continue;
		}
		if (!actif) continue;
		var mots = motsApache(ligne), nom = mots[0], args = mots.slice(1), nomL = nom.toLowerCase();
		if (!DIRECTIVES_APACHE.hasOwnProperty(nomL)){
			throw new ErreurApache("Invalid command '" + nom + "', perhaps misspelled or defined by a module not included in the server configuration", chemin, numero);
		}
		var module = DIRECTIVES_APACHE[nomL];
		if (module !== "core" && c.modules.indexOf(module) === -1 && !(module === "log_config")){
			throw new ErreurApache("Invalid command '" + nom + "', perhaps misspelled or defined by a module not included in the server configuration", chemin, numero);
		}
		directiveApache(h, c, pile, nom, nomL, args, chemin, numero);
	}
	if (pile.length > profondeurDepart){
		var ouverte = pile[pile.length - 1];
		throw new ErreurApache("<" + ouverte.nomAffiche + "> was not closed.", chemin, ouverte.ligne);
	}
}
function vhostCourant(pile){
	for (var i = pile.length - 1; i >= 0; i--) if (pile[i].vhost) return pile[i].vhost;
	return null;
}
function directoryCourante(pile){
	for (var i = pile.length - 1; i >= 0; i--){
		if (pile[i].directory) return pile[i].directory;
		if (pile[i].vhost) return null;
	}
	return null;
}
function dansSection(pile, types){ return pile.some(function(p){ return types.indexOf(p.type) > -1; }); }

function directiveApache(h, c, pile, nom, nomL, args, chemin, numero){
	function erreur(message){ throw new ErreurApache(message, chemin, numero); }
	var vh = vhostCourant(pile), dir = directoryCourante(pile), cible = vh || c.serveur;
	var dansFichiers = dansSection(pile, ["files", "filesmatch", "location", "locationmatch"]);
	switch (nomL){
		case "include":
		case "includeoptional": {
			if (!args.length) erreur(nom + " takes one argument, Name of the config file to be included");
			var motif = args[0].charAt(0) === "/" ? args[0] : APACHE_RACINE + "/" + args[0];
			var coupe = motif.lastIndexOf("/"), dossier = motif.substring(0, coupe), base = motif.substring(coupe + 1);
			if (/[*?[]/.test(base)){
				var liste = fichiersDuDossierGuet(h, dossier, base);
				if (!liste.length && nomL === "include") erreur("No matches for the wildcard '" + base + "' in '" + dossier + "', failing");
				liste.forEach(function(f){ lireFichierApache(h, f.chemin, c, pile); });
			} else {
				if (!fichierHoteGuet(h, motif)){
					if (nomL === "includeoptional") return;
					erreur("Could not open configuration file " + motif + ": No such file or directory");
				}
				lireFichierApache(h, motif, c, pile);
			}
			return;
		}
		case "loadmodule": {
			if (args.length < 2) erreur("LoadModule takes two arguments, a module name and the name of a shared object file to load it from");
			var m = nomModuleApache(args[0]);
			if (c.modules.indexOf(m) > -1) c.avertissements.push("AH01574: module " + args[0] + " is already loaded, skipping");
			else c.modules.push(m);
			return;
		}
		case "listen": {
			if (!args.length) erreur("Listen requires 1 or 2 arguments.");
			var p = /(\d+)$/.exec(args[0]);
			if (!p) erreur("Port must be specified");
			if (c.listen.indexOf(+p[1]) === -1) c.listen.push(+p[1]);
			return;
		}
		case "servertokens": {
			if (vh) erreur("ServerTokens cannot occur within <VirtualHost> section");
			var v = (args[0] || "").toLowerCase();
			var table = { prod: "Prod", productonly: "Prod", major: "Major", minor: "Minor", min: "Minimal", minimal: "Minimal", os: "OS", full: "Full" };
			if (!table[v] || args.length !== 1) erreur("ServerTokens takes 1 argument: 'Prod(uctOnly)', 'Major', 'Minor', 'Min(imal)', 'OS', or 'Full'");
			c.serveur.tokens = table[v];
			return;
		}
		case "serversignature": {
			var s = (args[0] || "").toLowerCase();
			if (["on", "off", "email"].indexOf(s) === -1) erreur("ServerSignature: use one of: off | on | email");
			var sig = { on: "On", off: "Off", email: "EMail" }[s];
			if (dir) dir.signature = sig; else cible.signature = sig;
			return;
		}
		case "traceenable": {
			var t = (args[0] || "").toLowerCase();
			if (["on", "off", "extended"].indexOf(t) === -1) erreur("TraceEnable must be one of 'on', 'off', or 'extended'");
			if (dir || dansFichiers) erreur("TraceEnable cannot occur within <Directory/Location/Files> section");
			cible.trace = t === "off" ? "Off" : (t === "on" ? "On" : "Extended");
			return;
		}
		case "servername":
			if (!args.length) erreur("ServerName takes one argument, The hostname and port of the server");
			cible.serverName = args[0].replace(/^https?:\/\//, "").replace(/:\d+$/, "");
			return;
		case "serveralias":
			if (!vh) erreur("ServerAlias only used in <VirtualHost>");
			vh.aliases = vh.aliases.concat(args);
			return;
		case "serveradmin": cible.serverAdmin = args[0] || null; return;
		case "documentroot": {
			if (!args.length) erreur("DocumentRoot takes one argument, Root directory of the document tree");
			var racine = cheminNormalGuet(args[0]);
			cible.documentRoot = racine;
			if (!dossierHoteGuet(h, racine)) c.avertissements.push("AH00112: Warning: DocumentRoot [" + racine + "] does not exist");
			return;
		}
		case "options": {
			if (!args.length) erreur("Options requires at least one argument");
			var signes = args.filter(function(a){ return /^[+-]/.test(a); }).length;
			if (signes && signes !== args.length) erreur("Either all Options must start with + or -, or no Option may.");
			args.forEach(function(a){
				var cle = a.replace(/^[+-]/, "").toLowerCase();
				if (!OPTIONS_APACHE.hasOwnProperty(cle)) erreur("Illegal option " + a.replace(/^[+-]/, ""));
			});
			var cibleOptions = dir || (dansFichiers ? null : cible);
			if (cibleOptions){
				if (dir) dir.options.push(args.slice());
				else (cible.optionsGlobales = cible.optionsGlobales || []).push(args.slice());
			}
			return;
		}
		case "require": {
			if (!args.length) erreur("Require requires at least one argument");
			if (dir && !dansFichiers){
				if (args[0].toLowerCase() === "all") dir.require = (args[1] || "").toLowerCase() === "granted" ? "granted" : "denied";
				else if (args[0].toLowerCase() === "ip" || args[0].toLowerCase() === "local" || args[0].toLowerCase() === "host") dir.require = "restreint";
				else dir.require = "granted";
			}
			return;
		}
		case "header": {
			var a = args.slice(), cond = "onsuccess";
			if (a.length && /^(always|onsuccess)$/i.test(a[0])) cond = a.shift().toLowerCase();
			var action = (a[0] || "").toLowerCase();
			if (["set", "append", "add", "unset", "merge", "setifempty", "echo", "edit", "edit*", "note"].indexOf(action) === -1){
				erreur("Header requires a valid action: set, add, append, merge, unset, echo, edit, edit*, setifempty or note");
			}
			if (!a[1]) erreur("Header requires three arguments");
			if (["set", "append", "add", "merge", "setifempty"].indexOf(action) > -1 && a[2] === undefined) erreur("Header requires three arguments");
			if (dansFichiers) return;
			(dir || cible).headers.push({ cond: cond, action: action, nom: a[1], valeur: a[2] === undefined ? "" : a[2] });
			return;
		}
		case "redirect":
		case "redirectpermanent":
		case "redirecttemp": {
			var r = args.slice(), code = nomL === "redirectpermanent" ? 301 : 302;
			if (nomL === "redirect" && r.length > 2){
				var st = r.shift().toLowerCase();
				code = { permanent: 301, temp: 302, seeother: 303, gone: 410 }[st] || (/^\d{3}$/.test(st) ? +st : null);
				if (!code) erreur("Redirect: invalid first argument (of three)");
			}
			if (r.length < 2 && code !== 410) erreur("Redirect to non-URL");
			if (r[1] && !/^[a-z]+:\/\//i.test(r[1]) && r[1].charAt(0) !== "/") erreur("Redirect to non-URL");
			cible.redirects.push({ chemin: r[0], url: r[1] || "", code: code });
			return;
		}
		case "rewriteengine": cible.rewriteEngine = /^on$/i.test(args[0] || ""); return;
		case "rewritecond": {
			if (args.length < 2) erreur("RewriteCond: bad argument line '" + args.join(" ") + "'");
			(cible.condsEnAttente = cible.condsEnAttente || []).push({ test: args[0], motif: args[1] });
			return;
		}
		case "rewriterule": {
			if (args.length < 2) erreur("RewriteRule: bad argument line '" + args.join(" ") + "'");
			try { new RegExp(args[0].replace(/^!/, "")); } catch (e){ erreur("RewriteRule: cannot compile regular expression '" + args[0] + "'"); }
			cible.rewrites.push({ motif: args[0], cible: args[1], drapeaux: (args[2] || "").replace(/^\[|\]$/g, "").split(","), conds: cible.condsEnAttente || [] });
			cible.condsEnAttente = [];
			return;
		}
		case "sslengine": {
			var se = (args[0] || "").toLowerCase();
			if (["on", "off", "optional", "addr"].indexOf(se) === -1) erreur("Argument must be On, Off, Optional or Addr");
			cible.ssl = se === "on";
			if (!vh) c.serveur.sslEngine = se === "on";
			return;
		}
		case "sslprotocol": {
			var lu = lireSslProtocol(args);
			if (lu.erreur) erreur(lu.erreur);
			cible.sslProtocol = args.join(" ");
			return;
		}
		case "sslcertificatefile":
		case "sslcertificatekeyfile": {
			var f = args[0] || "";
			var it = fichierHoteGuet(h, f);
			if (!it || String(it.getText()).trim() === "") erreur(nom + ": file '" + f + "' does not exist or is empty");
			if (nomL === "sslcertificatefile") cible.cert = f; else cible.cle = f;
			return;
		}
		case "sslsessioncache": {
			if (/^shmcb:/i.test(args[0] || "") && c.modules.indexOf("socache_shmcb") === -1){
				erreur("SSLSessionCache: 'shmcb' session cache not supported (known names: ). Maybe you need to load the appropriate socache module (mod_socache_shmcb?)");
			}
			c.serveur.sslSessionCache = args[0];
			return;
		}
		case "directoryindex": cible.directoryIndex = args.slice(); return;
		case "user": c.serveur.user = args[0]; return;
		case "group": c.serveur.group = args[0]; return;
		default: return;
	}
}

/* Les versions de TLS qu'accepte un SSLProtocol : comme mod_ssl (un mot sans + ni - remplace tout ce qui précède). */
var PROTOCOLES_TLS = ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"];
function lireSslProtocol(args){
	var ensemble = [], avertissements = [];
	for (var i = 0; i < args.length; i++){
		var w = args[i], action = "";
		if (w.charAt(0) === "+" || w.charAt(0) === "-"){ action = w.charAt(0); w = w.substring(1); }
		var cles = null;
		if (/^all$/i.test(w)) cles = ["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"];
		else {
			var trouve = PROTOCOLES_TLS.filter(function(p){ return p.toLowerCase() === w.toLowerCase(); })[0];
			if (!trouve) return { erreur: "SSLProtocol: Illegal protocol '" + w + "'" };
			cles = [trouve];
		}
		if (action === "-") ensemble = ensemble.filter(function(p){ return cles.indexOf(p) === -1; });
		else if (action === "+") cles.forEach(function(p){ if (ensemble.indexOf(p) === -1) ensemble.push(p); });
		else {
			if (ensemble.length) avertissements.push("SSLProtocol: Protocol '" + w + "' overrides already set parameter(s). Check if a +/- prefix is missing.");
			ensemble = cles.slice();
		}
	}
	return { protocoles: PROTOCOLES_TLS.filter(function(p){ return ensemble.indexOf(p) > -1 && p !== "SSLv3"; }), avertissements: avertissements };
}
function protocolesVhost(c, vh){
	var spec = (vh && vh.sslProtocol) || c.serveur.sslProtocol || "all -SSLv3";
	return lireSslProtocol(spec.split(/\s+/)).protocoles || [];
}

function verifierApacheFinal(h, c){
	c.vhosts.forEach(function(vh){
		if (vh.ssl && c.modules.indexOf("ssl") > -1){
			if (!vh.cert && !c.serveur.cert){
				throw new ErreurApache("AH02572: Failed to configure at least one certificate and key for " + (vh.serverName || c.serveur.serverName || "127.0.1.1") + ":" + (vh.port || 443), vh.fichier, vh.ligne);
			}
		}
	});
}

/* La configuration qui tourne : celle du dernier démarrage ou du dernier rechargement réussi. */
function apacheActive(h){
	if (!machineGardee(h)) return null;
	return etatHote(h).apache || null;
}
function apacheInstalle(h){ return !!fichierHoteGuet(h, APACHE_RACINE + "/apache2.conf"); }
function serviceApache(h){ return (HOTES[h] && HOTES[h].services && (HOTES[h].services.apache2 || HOTES[h].services.httpd)) || null; }

/* La chaîne « Server: » selon ServerTokens. */
function chaineServeur(c){
	var t = c.serveur.tokens || "Full", v = APACHE_VERSION;
	if (t === "Prod") return "Apache";
	if (t === "Major") return "Apache/" + v.split(".")[0];
	if (t === "Minor") return "Apache/" + v.split(".").slice(0, 2).join(".");
	if (t === "Minimal") return "Apache/" + v;
	if (t === "OS") return "Apache/" + v + " (Debian)";
	return "Apache/" + v + " (Debian)" + (c.modules.indexOf("ssl") > -1 ? " OpenSSL/" + OPENSSL_VERSION : "");
}

/* Les Directory qui s'appliquent à un chemin, des plus courtes aux plus longues (le serveur avant le vhost). */
function directoriesPour(c, vh, chemin){
	var liste = [];
	function ajouter(dirs, rang){
		dirs.forEach(function(d, k){
			var ok = false;
			if (d.chemin) ok = d.chemin === "/" || chemin === d.chemin || chemin.indexOf(d.chemin.replace(/\/$/, "") + "/") === 0;
			else if (d.motif){ try { ok = new RegExp(d.motif.replace(/^"|"$/g, "")).test(chemin); } catch (e){ ok = false; } }
			if (ok) liste.push({ d: d, profondeur: d.chemin ? d.chemin.split("/").filter(Boolean).length : 99, rang: rang, k: k });
		});
	}
	ajouter(c.serveur.directories, 0);
	if (vh) ajouter(vh.directories, 1);
	return liste.sort(function(a, b){ return a.profondeur - b.profondeur || a.rang - b.rang || a.k - b.k; }).map(function(x){ return x.d; });
}
/* Les Options qui s'appliquent à un dossier : FollowSymLinks au départ, puis chaque Directory (absolu ou relatif). */
function optionsPour(c, vh, chemin){
	var actives = ["FollowSymLinks"];
	function appliquer(liste){
		var relatif = liste.some(function(a){ return /^[+-]/.test(a); });
		if (!relatif) actives = [];
		liste.forEach(function(a){
			var signe = /^[+-]/.test(a) ? a.charAt(0) : "+", cle = OPTIONS_APACHE[a.replace(/^[+-]/, "").toLowerCase()];
			var cles = cle === "All" ? ["Indexes", "FollowSymLinks", "ExecCGI", "Includes"] : (cle === "None" ? [] : [cle]);
			if (cle === "None" && !relatif) actives = [];
			cles.forEach(function(k){
				if (signe === "-") actives = actives.filter(function(x){ return x !== k; });
				else if (actives.indexOf(k) === -1) actives.push(k);
			});
		});
	}
	(c.serveur.optionsGlobales || []).forEach(appliquer);
	if (vh) (vh.optionsGlobales || []).forEach(appliquer);
	directoriesPour(c, vh, chemin).forEach(function(d){ d.options.forEach(appliquer); });
	return actives;
}
function requirePour(c, vh, chemin){
	var r = "granted";
	directoriesPour(c, vh, chemin).forEach(function(d){ if (d.require) r = d.require; });
	return r;
}
function signaturePour(c, vh, chemin){
	var s = c.serveur.signature || "Off";
	if (vh && vh.signature) s = vh.signature;
	directoriesPour(c, vh, chemin).forEach(function(d){ if (d.signature) s = d.signature; });
	return s;
}
function tracePour(c, vh){ return (vh && vh.trace) || c.serveur.trace || "On"; }

/* Le vhost qui répond sur un port, pour un nom donné (comme le choix par nom d'Apache). */
function vhostPour(c, port, nomHote){
	var candidats = c.vhosts.filter(function(v){ return v.port === port || v.port === 0; });
	if (!candidats.length) return null;
	var exact = candidats.filter(function(v){ return v.serverName === nomHote || v.aliases.indexOf(nomHote) > -1; })[0];
	return exact || candidats[0];
}

var TYPES_MIME = { html: "text/html", htm: "text/html", txt: "text/plain", css: "text/css", js: "text/javascript", json: "application/json",
	xml: "application/xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", pdf: "application/pdf",
	gz: "application/gzip", tar: "application/x-tar", zip: "application/zip", ico: "image/vnd.microsoft.icon" };
var RAISONS_HTTP = { 200: "OK", 301: "Moved Permanently", 302: "Found", 303: "See Other", 400: "Bad Request", 403: "Forbidden", 404: "Not Found",
	405: "Method Not Allowed", 410: "Gone", 500: "Internal Server Error" };

function pageErreurApache(code, texte, signature){
	return "<!DOCTYPE HTML PUBLIC \"-//IETF//DTD HTML 2.0//EN\">\n<html><head>\n<title>" + code + " " + RAISONS_HTTP[code] + "</title>\n</head><body>\n<h1>" +
		RAISONS_HTTP[code] + "</h1>\n" + texte + "\n" + (signature ? "<hr>\n" + signature + "\n" : "") + "</body></html>";
}
function adresseSignature(c, vh, chemin, nom, port){
	var s = signaturePour(c, vh, chemin);
	if (s === "Off") return "";
	var admin = (vh && vh.serverAdmin) || c.serveur.serverAdmin || "webmaster@localhost";
	if (s === "EMail") return "<address>" + chaineServeur(c) + " Server at <a href=\"mailto:" + admin + "\">" + nom + "</a> Port " + port + "</address>";
	return "<address>" + chaineServeur(c) + " Server at " + nom + " Port " + port + "</address>";
}

/*
 * Une requête HTTP vers l'Apache d'une machine, avec la configuration active.
 * req : { methode, chemin, https, port, nom (l'hôte demandé), corps }
 * Renvoie { code, entetes: [[nom, valeur]...], corps, erreurTls } .
 */
function repondreApache(h, c, req){
	var port = req.port, nom = req.nom, chemin = req.chemin || "/";
	var vh = vhostPour(c, port, nom);
	var https = !!req.https;
	var sslIci = vh ? (vh.ssl && c.modules.indexOf("ssl") > -1) : (c.serveur.sslEngine && c.modules.indexOf("ssl") > -1);
	var rep = { code: 200, entetes: [], corps: "", vhost: vh };
	var cheminSeul = chemin.replace(/\?.*$/, "").replace(/#.*$/, "") || "/";
	try { cheminSeul = decodeURIComponent(cheminSeul); } catch (e){}
	var docRoot = (vh && vh.documentRoot) || c.serveur.documentRoot || "/var/www/html";
	var fsChemin = cheminNormalGuet(docRoot + "/" + cheminSeul);
	var echappe = fsChemin.indexOf(cheminNormalGuet(docRoot)) !== 0;
	function erreur(code, texte, extra){
		rep.code = code;
		rep.corps = pageErreurApache(code, texte, adresseSignature(c, vh, fsChemin, nom, port));
		rep.type = "text/html; charset=iso-8859-1";
		if (extra) extra(rep);
		return rep;
	}
	if (sslIci && !https){
		return erreur(400, "<p>Your browser sent a request that this server could not understand.<br />\nReason: You're speaking plain HTTP to an SSL-enabled server port.<br />\n Instead use the HTTPS scheme to access this URL, please.<br />\n</p>");
	}
	var methode = (req.methode || "GET").toUpperCase();
	var trace = tracePour(c, vh);
	if (methode === "TRACE"){
		if (trace === "Off") return erreur(405, "<p>The requested method TRACE is not allowed for this URL.</p>", function(r){ r.entetes.push(["Allow", "GET,POST,OPTIONS,HEAD"]); });
		rep.code = 200;
		rep.type = "message/http";
		rep.corps = "TRACE " + chemin + " HTTP/1.1\r\nHost: " + nom + "\r\nUser-Agent: curl/7.88.1\r\nAccept: */*\r\n";
		return rep;
	}
	// Redirections (mod_alias), puis réécritures (mod_rewrite).
	var contextes = vh ? [vh, c.serveur] : [c.serveur];
	for (var k = 0; k < contextes.length; k++){
		var redirs = contextes[k].redirects || [];
		for (var i = 0; i < redirs.length; i++){
			var r = redirs[i], base = r.chemin.replace(/\/$/, "");
			if (cheminSeul === r.chemin || cheminSeul.indexOf(base + "/") === 0 || base === ""){
				if (c.modules.indexOf("alias") === -1) break;
				var reste = cheminSeul.substring(base.length);
				var url = r.url.replace(/\/$/, "") + reste;
				if (r.code === 410) return erreur(410, "<p>The requested resource is no longer available on this server and there is no forwarding address.\nPlease remove all references to this resource.</p>");
				return redirectionApache(rep, r.code, url, c, vh, fsChemin, nom, port);
			}
		}
		if (contextes[k].rewriteEngine && c.modules.indexOf("rewrite") > -1){
			var reecrit = reecrireApache(contextes[k].rewrites || [], cheminSeul, { https: https, nom: nom, port: port, uri: chemin });
			if (reecrit) return redirectionApache(rep, reecrit.code, reecrit.url, c, vh, fsChemin, nom, port);
		}
	}
	if (methode === "OPTIONS"){
		rep.entetes.push(["Allow", "GET,POST,OPTIONS,HEAD" + (trace !== "Off" ? ",TRACE" : "")]);
		rep.corps = "";
		rep.type = "httpd/unix-directory";
		rep.code = 200;
		rep.sansType = true;
		return rep;
	}
	if (echappe) return erreur(400, "<p>Your browser sent a request that this server could not understand.<br />\n</p>");
	var noeud = noeudHoteGuet(h, fsChemin);
	if (noeud === null) return erreur(404, "<p>The requested URL was not found on this server.</p>");
	var dossierFs = noeud instanceof Room ? fsChemin : fsChemin.replace(/\/[^\/]*$/, "") || "/";
	if (requirePour(c, vh, dossierFs) !== "granted") return erreur(403, "<p>You don't have permission to access this resource.</p>");
	if (noeud instanceof Room){
		if (!/\/$/.test(cheminSeul) && c.modules.indexOf("dir") > -1){
			var schema = https ? "https" : "http", portUrl = (https && port === 443) || (!https && port === 80) ? "" : ":" + port;
			return redirectionApache(rep, 301, schema + "://" + nom + portUrl + cheminSeul + "/", c, vh, fsChemin, nom, port);
		}
		var index = c.modules.indexOf("dir") > -1 ? ((vh && vh.directoryIndex) || c.serveur.directoryIndex || ["index.html"]) : [];
		for (var x = 0; x < index.length; x++){
			var candidat = noeud.getNode(index[x]);
			if (candidat instanceof Item){ noeud = candidat; fsChemin = fsChemin.replace(/\/$/, "") + "/" + index[x]; break; }
		}
		if (noeud instanceof Room){
			var opts = optionsPour(c, vh, fsChemin);
			if (opts.indexOf("Indexes") === -1 || c.modules.indexOf("autoindex") === -1) return erreur(403, "<p>You don't have permission to access this resource.</p>");
			rep.listing = true;
			rep.cheminFs = fsChemin;
			rep.type = "text/html;charset=UTF-8";
			var titre = "Index of " + cheminSeul.replace(/\/$/, "") || "/";
			if (cheminSeul === "/") titre = "Index of /";
			var lignesIndex = ["<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 3.2 Final//EN\">", "<html>", " <head>", "  <title>" + titre + "</title>", " </head>", " <body>", "<h1>" + titre + "</h1>",
				"<ul>" + (cheminSeul !== "/" ? "<li><a href=\"" + cheminSeul.replace(/[^\/]+\/$/, "") + "\"> Parent Directory</a></li>" : "")];
			noeud.children.map(function(l){ return l.room_name + "/"; }).concat(noeud.items.map(function(it){ return it.itemname; })).sort()
				.filter(function(n){ return n.charAt(0) !== "."; }).forEach(function(n){ lignesIndex.push("<li><a href=\"" + n + "\"> " + n + "</a></li>"); });
			lignesIndex.push("</ul>");
			var signature = adresseSignature(c, vh, fsChemin, nom, port);
			if (signature) lignesIndex.push(signature);
			lignesIndex.push("</body></html>");
			rep.corps = lignesIndex.join("\n");
			return rep;
		}
	}
	rep.cheminFs = dossierFs;
	if (!(noeud.mode.charAt(6) === "r" || noeud.owner === "www-data")) return erreur(403, "<p>You don't have permission to access this resource.</p>");
	if (methode !== "GET" && methode !== "HEAD") return erreur(405, "<p>The requested method " + methode + " is not allowed for this URL.</p>", function(r){ r.entetes.push(["Allow", "GET,POST,OPTIONS,HEAD" + (trace !== "Off" ? ",TRACE" : "")]); });
	rep.corps = noeud.getText();
	rep.fichier = noeud;
	var ext = (/\.([A-Za-z0-9]+)$/.exec(noeud.itemname) || [])[1];
	rep.type = ext && TYPES_MIME[ext.toLowerCase()] ? TYPES_MIME[ext.toLowerCase()] : null;
	return rep;
}
function redirectionApache(rep, code, url, c, vh, fsChemin, nom, port){
	rep.code = code;
	rep.entetes.push(["Location", url]);
	rep.corps = pageErreurApache(code, "<p>The document has moved <a href=\"" + url + "\">here</a>.</p>", adresseSignature(c, vh, fsChemin, nom, port));
	rep.type = "text/html; charset=iso-8859-1";
	return rep;
}
function reecrireApache(regles, chemin, env){
	for (var i = 0; i < regles.length; i++){
		var r = regles[i];
		var variables = { HTTPS: env.https ? "on" : "off", HTTP_HOST: env.nom, SERVER_NAME: env.nom, REQUEST_URI: chemin, SERVER_PORT: String(env.port) };
		function remplacer(t, m){ return t.replace(/%\{([A-Z_]+)\}/g, function(x, k){ return variables[k] || ""; }).replace(/\$(\d)/g, function(x, n){ return m && m[+n] !== undefined ? m[+n] : ""; }); }
		var condsOk = (r.conds || []).every(function(cd){
			var valeur = remplacer(cd.test), motif = cd.motif, neg = motif.charAt(0) === "!";
			if (neg) motif = motif.substring(1);
			var ok;
			try { ok = new RegExp(motif, "i").test(valeur); } catch (e){ ok = false; }
			return neg ? !ok : ok;
		});
		if (!condsOk) continue;
		var neg = r.motif.charAt(0) === "!", m;
		try { m = new RegExp(neg ? r.motif.substring(1) : r.motif).exec(chemin); } catch (e){ m = null; }
		if (neg ? m : !m) continue;
		var redir = r.drapeaux.filter(function(d){ return /^R(=\d+)?$/i.test(d.trim()); })[0];
		if (!redir || r.cible === "-") continue;
		var code = /=(\d+)/.test(redir) ? +/=(\d+)/.exec(redir)[1] : 302;
		return { code: code, url: remplacer(r.cible, m) };
	}
	return null;
}

/* Les en-têtes d'une réponse : Date, Server, ceux de « Header » (always partout, sinon seulement en 2xx), puis le reste. */
function entetesApache(c, vh, rep, methode){
	var liste = [["Date", dateHttp(maintenantGuet())], ["Server", chaineServeur(c)]];
	rep.entetes.forEach(function(e){ liste.push(e); });
	if (c.modules.indexOf("headers") > -1){
		var directives = c.serveur.headers.concat(vh ? vh.headers : []);
		if (rep.fichier || rep.listing){
			var dossier = rep.cheminFs || "";
			directoriesPour(c, vh, dossier).forEach(function(d){ directives = directives.concat(d.headers); });
		}
		directives.forEach(function(d){
			if (d.cond !== "always" && (rep.code < 200 || rep.code >= 300)) return;
			var existant = liste.filter(function(e){ return e[0].toLowerCase() === d.nom.toLowerCase(); })[0];
			if (d.action === "set"){ liste = liste.filter(function(e){ return e[0].toLowerCase() !== d.nom.toLowerCase(); }); liste.push([d.nom, d.valeur]); }
			else if (d.action === "add") liste.push([d.nom, d.valeur]);
			else if (d.action === "append" || d.action === "merge"){
				if (existant){ if (d.action === "append" || existant[1].split(/,\s*/).indexOf(d.valeur) === -1) existant[1] += ", " + d.valeur; }
				else liste.push([d.nom, d.valeur]);
			}
			else if (d.action === "setifempty"){ if (!existant) liste.push([d.nom, d.valeur]); }
			else if (d.action === "unset") liste = liste.filter(function(e){ return e[0].toLowerCase() !== d.nom.toLowerCase(); });
		});
	}
	var octets = versOctetsUtf8(rep.corps || "").length;
	if (rep.fichier){
		var d = maintenantGuet(), heure = /^(\d\d):(\d\d)$/.exec(rep.fichier.heure || "") || [null, "09", "00"];
		d.setDate(d.getDate() - (rep.fichier.age === undefined ? 40 : rep.fichier.age));
		d.setHours(+heure[1], +heure[2], 0, 0);
		liste.push(["Last-Modified", dateHttp(d)]);
		liste.push(["ETag", "\"" + octets.toString(16) + "-" + hexa(condense(rep.fichier.getText()), 8).substring(0, 13) + "\""]);
		liste.push(["Accept-Ranges", "bytes"]);
	}
	if (!(rep.sansType && methode === "OPTIONS")) liste.push(["Content-Length", String(octets)]);
	if (rep.type && /^text\//.test(rep.type) && c.modules.indexOf("deflate") > -1 && rep.code === 200) liste.push(["Vary", "Accept-Encoding"]);
	if (rep.type && !(rep.sansType)) liste.push(["Content-Type", rep.type]);
	return liste;
}

/* ================================================================== */
/* Certificats et clés : un PEM qui ressemble au vrai                   */
/* ================================================================== */

var AUTORITES_GUET = ["C = FR, O = Cybersup, CN = Cybersup Root CA", "CN = Cybersup CA interne"];
function declarerAutorite(dn){ if (AUTORITES_GUET.indexOf(dn) === -1) AUTORITES_GUET.push(dn); }
function asciiJson(objet){
	return JSON.stringify(objet).replace(/[\u0080-\uffff]/g, function(c){ return "\\u" + ("000" + c.charCodeAt(0).toString(16)).slice(-4); });
}
function blocPem(type, brut){
	var b64 = btoa(brut), lignes = ["-----BEGIN " + type + "-----"];
	for (var i = 0; i < b64.length; i += 64) lignes.push(b64.substring(i, i + 64));
	lignes.push("-----END " + type + "-----");
	return lignes.join("\n");
}
function fabriquerCertificat(o){
	o = o || {};
	var debut = o.debut instanceof Date ? o.debut : new Date(maintenantGuet().getTime() - 30 * 86400000);
	var fin = o.fin instanceof Date ? o.fin : new Date(debut.getTime() + 365 * 86400000);
	var sujet = o.sujet || "CN = localhost";
	var donnees = { sujet: sujet, emetteur: o.emetteur || sujet, debut: debut.toISOString(), fin: fin.toISOString(),
		san: o.san || [(/CN = ([^,]+)$/.exec(sujet) || [])[1] || "localhost"], algo: o.algo || "rsa:2048", cle: o.cle || hexDe("cle:" + sujet + debut.toISOString(), 16),
		serie: o.serie || hexDe("serie:" + sujet + debut.toISOString(), 32).toUpperCase(), ca: !!o.ca };
	var brut = String.fromCharCode(0x30, 0x82, 0x05, 0x12, 0x30, 0x82, 0x03, 0xfa) + "terminus-x509:" + asciiJson(donnees) +
		hexDe("signature:" + donnees.serie, 96).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); });
	return blocPem("CERTIFICATE", brut);
}
function fabriquerCle(id, algo){
	var brut = String.fromCharCode(0x30, 0x82, 0x04, 0xbe, 0x02, 0x01, 0x00) + "terminus-key:" + id + ":" + (algo || "rsa:2048") + ":" +
		hexDe("cle-privee:" + id, 160).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); });
	return blocPem("PRIVATE KEY", brut);
}
function lirePem(texte, type){
	var re = new RegExp("-----BEGIN " + type + "-----([\\s\\S]*?)-----END " + type + "-----");
	var m = re.exec(String(texte || ""));
	if (!m) return null;
	try { return atob(m[1].replace(/\s+/g, "")); } catch (e){ return null; }
}
function lireCertificat(texte){
	var brut = lirePem(texte, "CERTIFICATE");
	if (brut === null) return null;
	var k = brut.indexOf("terminus-x509:");
	if (k === -1) return { inconnu: true };
	var reste = brut.substring(k + 14), profondeur = 0, fin = -1;
	for (var i = 0; i < reste.length; i++){
		var ch = reste.charAt(i);
		if (ch === "\"") { i++; while (i < reste.length && reste.charAt(i) !== "\""){ if (reste.charAt(i) === "\\") i++; i++; } continue; }
		if (ch === "{") profondeur++;
		if (ch === "}"){ profondeur--; if (profondeur === 0){ fin = i; break; } }
	}
	try {
		var o = JSON.parse(reste.substring(0, fin + 1));
		o.debut = new Date(o.debut);
		o.fin = new Date(o.fin);
		o.pem = "-----BEGIN CERTIFICATE-----" + /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/.exec(texte)[1] + "-----END CERTIFICATE-----";
		return o;
	} catch (e){ return { inconnu: true }; }
}
function lireCle(texte){
	var brut = lirePem(texte, "PRIVATE KEY");
	if (brut === null) return null;
	var m = /terminus-key:([^:]+):([a-z]+:\d+|[^:]+):/.exec(brut);
	return m ? { id: m[1], algo: m[2] } : { inconnu: true };
}
/* La vérification d'un certificat, comme OpenSSL : { code, texte } (0 : ok). */
function verifierCertificat(cert, nom, quand){
	quand = quand || maintenantGuet();
	if (quand < cert.debut) return { code: 9, texte: "certificate is not yet valid" };
	if (quand > cert.fin) return { code: 10, texte: "certificate has expired" };
	if (cert.emetteur === cert.sujet) return { code: 18, texte: "self-signed certificate" };
	if (AUTORITES_GUET.indexOf(cert.emetteur) === -1) return { code: 20, texte: "unable to get local issuer certificate" };
	return { code: 0, texte: "ok" };
}
function nomCouvert(cert, nom){
	var cn = (/CN = ([^,]+)$/.exec(cert.sujet) || [])[1];
	return (cert.san || []).concat(cn ? [cn] : []).some(function(n){
		if (n === nom) return true;
		return /^\*\./.test(n) && nom.split(".").slice(1).join(".") === n.substring(2);
	});
}

/* ================================================================== */
/* Un Apache Debian tout neuf, pour le monde et les tests              */
/* ================================================================== */

var MODULES_DEBIAN = { access_compat: "", alias: "alias", auth_basic: "", authn_core: "", authn_file: "", authz_core: "", authz_host: "", authz_user: "",
	autoindex: "autoindex", deflate: "deflate", dir: "dir", env: "", filter: "", mime: "mime", mpm_event: "mpm_event", negotiation: "negotiation",
	reqtimeout: "reqtimeout", setenvif: "setenvif", status: "status" };
var MODULES_DISPONIBLES = ["headers", "ssl", "socache_shmcb", "rewrite", "http2", "expires", "cgi", "info", "userdir", "proxy", "proxy_http", "mpm_prefork", "mpm_worker"];
var DEPENDANCES_MODULES = { ssl: ["setenvif", "mime", "socache_shmcb"], proxy_http: ["proxy"], authz_user: ["authz_core"], authn_file: ["authn_core"], authz_host: ["authz_core"] };
var CONFS_MODULES = {
	alias: "<IfModule alias_module>\n\tAlias /icons/ \"/usr/share/apache2/icons/\"\n\n\t<Directory \"/usr/share/apache2/icons\">\n\t\tOptions FollowSymlinks\n\t\tAllowOverride None\n\t\tRequire all granted\n\t</Directory>\n</IfModule>",
	autoindex: "<IfModule mod_autoindex.c>\n\tIndexOptions FancyIndexing VersionSort HTMLTable NameWidth=* DescriptionWidth=* Charset=UTF-8\n\tIndexIgnore .??* *~ *# RCS CVS *,v *,t\n</IfModule>",
	deflate: "<IfModule mod_deflate.c>\n\t<IfModule mod_filter.c>\n\t\tAddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript\n\t</IfModule>\n</IfModule>",
	dir: "<IfModule mod_dir.c>\n\tDirectoryIndex index.html index.cgi index.pl index.php index.xhtml index.htm\n</IfModule>",
	mime: "<IfModule mod_mime.c>\n\tTypesConfig /etc/mime.types\n\tAddType application/x-compress .Z\n\tAddType application/x-gzip .gz .tgz\n</IfModule>",
	mpm_event: "<IfModule mpm_event_module>\n\tStartServers\t\t\t 2\n\tMinSpareThreads\t\t 25\n\tMaxSpareThreads\t\t 75\n\tThreadLimit\t\t\t 64\n\tThreadsPerChild\t\t 25\n\tMaxRequestWorkers\t  150\n\tMaxConnectionsPerChild   0\n</IfModule>",
	negotiation: "<IfModule mod_negotiation.c>\n\tLanguagePriority en ca cs da de el eo es et fr he hr it ja ko ltz nl nn no pl pt pt-BR ru sv tr zh-CN zh-TW\n\tForceLanguagePriority Prefer Fallback\n</IfModule>",
	reqtimeout: "<IfModule reqtimeout_module>\n\tRequestReadTimeout header=20-40,minrate=500\n\tRequestReadTimeout body=10,minrate=500\n</IfModule>",
	setenvif: "<IfModule mod_setenvif.c>\n\tBrowserMatch \"Mozilla/2\" nokeepalive\n</IfModule>",
	status: "<IfModule mod_status.c>\n\t<Location /server-status>\n\t\tSetHandler server-status\n\t\tRequire local\n\t</Location>\n\tExtendedStatus On\n</IfModule>",
	ssl: "<IfModule mod_ssl.c>\n\tSSLRandomSeed startup builtin\n\tSSLRandomSeed startup file:/dev/urandom 512\n\tSSLRandomSeed connect builtin\n\tSSLRandomSeed connect file:/dev/urandom 512\n\n\tAddType application/x-x509-ca-cert .crt\n\tAddType application/x-pkcs7-crl .crl\n\n\tSSLPassPhraseDialog  exec:/usr/share/apache2/ask-for-passphrase\n\tSSLSessionCache\t\tshmcb:${APACHE_RUN_DIR}/ssl_scache(512000)\n\tSSLSessionCacheTimeout  300\n\n\tSSLCipherSuite HIGH:!aNULL\n\tSSLProtocol all -SSLv3\n</IfModule>"
};
var TEXTE_SECURITY_CONF = function(o){
	return "# Changing the following options will not really affect the security of the\n# server, but might make attacks slightly more difficult in some cases.\n\n" +
		"#\n# ServerTokens\n# This directive configures what you return as the Server HTTP response\n# Header. The default is 'Full' which sends information about the OS-Type\n# and compiled in modules.\n" +
		"# Set to one of:  Full | OS | Minimal | Minor | Major | Prod\n# where Full conveys the most information, and Prod the least.\n#ServerTokens Minimal\nServerTokens " + o.tokens + "\n#ServerTokens Full\n\n" +
		"#\n# Optionally add a line containing the server version and virtual host\n# name to server-generated pages (internal error documents, FTP directory\n# listings, mod_status and mod_info output etc., but not CGI generated\n# documents or custom error documents).\n" +
		"# Set to \"EMail\" to also include a mailto: link to the ServerAdmin.\n# Set to one of:  On | Off | EMail\n#ServerSignature Off\nServerSignature " + o.signature + "\n\n" +
		"#\n# Allow TRACE method\n#\n# Set to \"extended\" to also reflect the request body (only for testing and\n# diagnostic purposes).\n#\n# Set to one of:  On | Off | extended\nTraceEnable " + o.trace + "\n#TraceEnable On\n\n" +
		"#\n# Forbid access to version control directories\n#\n#<DirectoryMatch \"/\\.git\">\n#   Require all denied\n#</DirectoryMatch>\n\n" +
		"#\n# Setting this header will prevent MSIE from interpreting files as something\n# else than declared by the content type in the HTTP headers.\n# Requires mod_headers to be enabled.\n#\n#Header set X-Content-Type-Options: \"nosniff\"\n\n" +
		"#\n# Setting this header will prevent other sites from embedding pages from this\n# site as frames. This defends against clickjacking attacks.\n# Requires mod_headers to be enabled.\n#\n#Header set Content-Security-Policy \"frame-ancestors 'self';\"";
};
/*
 * Pose sur une machine l'arborescence d'un Apache Debian fraîchement installé (apt install apache2), à retoucher ensuite.
 * o : { serverName, tokens ("OS"), signature ("On"), trace ("Off"), ssl (false), modules: [en plus], cert, cle, index (texte) }
 */
function installerApacheDebian(h, o){
	o = o || {};
	o.tokens = o.tokens || "OS"; o.signature = o.signature || "On"; o.trace = o.trace || "Off";
	var R = APACHE_RACINE;
	poserFichierHote(h, R + "/apache2.conf", "# This is the main Apache server configuration file.  It contains the\n# configuration directives that give the server its instructions.\n" +
		"# See http://httpd.apache.org/docs/2.4/ for detailed information about\n# the directives and /usr/share/doc/apache2/README.Debian about Debian specific\n# hints.\n\n" +
		"DefaultRuntimeDir ${APACHE_RUN_DIR}\nPidFile ${APACHE_PID_FILE}\nTimeout 300\nKeepAlive On\nMaxKeepAliveRequests 100\nKeepAliveTimeout 5\n\n" +
		"User ${APACHE_RUN_USER}\nGroup ${APACHE_RUN_GROUP}\nHostnameLookups Off\nErrorLog ${APACHE_LOG_DIR}/error.log\nLogLevel warn\n\n" +
		"# Include module configuration:\nIncludeOptional mods-enabled/*.load\nIncludeOptional mods-enabled/*.conf\n\n# Include list of ports to listen on\nInclude ports.conf\n\n" +
		(o.serverName ? "ServerName " + o.serverName + "\n\n" : "") +
		"<Directory />\n\tOptions FollowSymLinks\n\tAllowOverride None\n\tRequire all denied\n</Directory>\n\n" +
		"<Directory /usr/share>\n\tAllowOverride None\n\tRequire all granted\n</Directory>\n\n" +
		"<Directory /var/www/>\n\tOptions Indexes FollowSymLinks\n\tAllowOverride None\n\tRequire all granted\n</Directory>\n\n" +
		"AccessFileName .htaccess\n\n<FilesMatch \"^\\.ht\">\n\tRequire all denied\n</FilesMatch>\n\n" +
		"LogFormat \"%v:%p %h %l %u %t \\\"%r\\\" %>s %O \\\"%{Referer}i\\\" \\\"%{User-Agent}i\\\"\" vhost_combined\n" +
		"LogFormat \"%h %l %u %t \\\"%r\\\" %>s %O \\\"%{Referer}i\\\" \\\"%{User-Agent}i\\\"\" combined\nLogFormat \"%h %l %u %t \\\"%r\\\" %>s %O\" common\n\n" +
		"# Include generic snippets of statements\nIncludeOptional conf-enabled/*.conf\n\n# Include the virtual host configurations:\nIncludeOptional sites-enabled/*.conf\n");
	poserFichierHote(h, R + "/ports.conf", "# If you just change the port or add more ports here, you will likely also\n# have to change the VirtualHost statement in\n# /etc/apache2/sites-enabled/000-default.conf\n\n" +
		"Listen 80\n\n<IfModule ssl_module>\n\tListen 443\n</IfModule>\n\n<IfModule mod_gnutls.c>\n\tListen 443\n</IfModule>\n");
	poserFichierHote(h, R + "/envvars", Object.keys(APACHE_ENV).map(function(k){ return "export " + k + "=" + APACHE_ENV[k]; }).join("\n") + "\n");
	Object.keys(MODULES_DEBIAN).concat(MODULES_DISPONIBLES).forEach(function(m){
		var deps = DEPENDANCES_MODULES[m];
		poserFichierHote(h, R + "/mods-available/" + m + ".load", (deps ? "# Depends: " + deps.join(" ") + "\n" : "") +
			(m === "mpm_event" ? "# Conflicts: mpm_worker mpm_prefork\n" : "") + "LoadModule " + m + "_module /usr/lib/apache2/modules/mod_" + m + ".so\n");
		if (CONFS_MODULES[m]) poserFichierHote(h, R + "/mods-available/" + m + ".conf", CONFS_MODULES[m] + "\n");
	});
	creerDossierHote(h, R + "/mods-enabled");
	Object.keys(MODULES_DEBIAN).concat(o.modules || []).forEach(function(m){
		poserFichierHote(h, R + "/mods-enabled/" + m + ".load", null, { lien: "../mods-available/" + m + ".load" });
		if (CONFS_MODULES[m]) poserFichierHote(h, R + "/mods-enabled/" + m + ".conf", null, { lien: "../mods-available/" + m + ".conf" });
	});
	poserFichierHote(h, R + "/conf-available/security.conf", TEXTE_SECURITY_CONF(o) + "\n");
	poserFichierHote(h, R + "/conf-available/charset.conf", "# Read the documentation before enabling AddDefaultCharset.\n#AddDefaultCharset UTF-8\n");
	poserFichierHote(h, R + "/conf-available/other-vhosts-access-log.conf", "# Define an access log for VirtualHosts that don't define their own logfile\nCustomLog ${APACHE_LOG_DIR}/other_vhosts_access.log vhost_combined\n");
	poserFichierHote(h, R + "/conf-available/localized-error-pages.conf", "# Customizable error responses come in three flavors:\n#ErrorDocument 500 \"The server made a boo boo.\"\n");
	["security", "charset", "other-vhosts-access-log", "localized-error-pages"].forEach(function(n){ poserFichierHote(h, R + "/conf-enabled/" + n + ".conf", null, { lien: "../conf-available/" + n + ".conf" }); });
	poserFichierHote(h, R + "/sites-available/000-default.conf", "<VirtualHost *:80>\n\t# The ServerName directive sets the request scheme, hostname and port that\n\t# the server uses to identify itself.\n\t#ServerName www.example.com\n\n" +
		"\tServerAdmin webmaster@localhost\n\tDocumentRoot /var/www/html\n\n\tErrorLog ${APACHE_LOG_DIR}/error.log\n\tCustomLog ${APACHE_LOG_DIR}/access.log combined\n</VirtualHost>\n");
	poserFichierHote(h, R + "/sites-available/default-ssl.conf", "<VirtualHost *:443>\n\tServerAdmin webmaster@localhost\n\tDocumentRoot /var/www/html\n\n" +
		"\tErrorLog ${APACHE_LOG_DIR}/error.log\n\tCustomLog ${APACHE_LOG_DIR}/access.log combined\n\n\tSSLEngine on\n\n" +
		"\tSSLCertificateFile      " + (o.cert || "/etc/ssl/certs/ssl-cert-snakeoil.pem") + "\n\tSSLCertificateKeyFile   " + (o.cle || "/etc/ssl/private/ssl-cert-snakeoil.key") + "\n\n" +
		"\t<FilesMatch \"\\.(?:cgi|shtml|phtml|php)$\">\n\t\tSSLOptions +StdEnvVars\n\t</FilesMatch>\n\t<Directory /usr/lib/cgi-bin>\n\t\tSSLOptions +StdEnvVars\n\t</Directory>\n</VirtualHost>\n");
	poserFichierHote(h, R + "/sites-enabled/000-default.conf", null, { lien: "../sites-available/000-default.conf" });
	if (o.ssl) poserFichierHote(h, R + "/sites-enabled/default-ssl.conf", null, { lien: "../sites-available/default-ssl.conf" });
	if (!fichierHoteGuet(h, "/etc/ssl/certs/ssl-cert-snakeoil.pem")){
		var nomCert = o.serverName || h;
		poserFichierHote(h, "/etc/ssl/certs/ssl-cert-snakeoil.pem", fabriquerCertificat({ sujet: "CN = " + nomCert, san: [nomCert], cle: "snakeoil-" + h }));
		poserFichierHote(h, "/etc/ssl/private/ssl-cert-snakeoil.key", fabriquerCle("snakeoil-" + h), { mode: "rw-r-----" });
	}
	if (!fichierHoteGuet(h, "/var/www/html/index.html")) poserFichierHote(h, "/var/www/html/index.html", o.index || "<!DOCTYPE html>\n<html><head><title>Apache2 Debian Default Page: It works</title></head>\n<body><h1>It works!</h1></body></html>");
	creerDossierHote(h, "/var/log/apache2", { mode: "rwxr-x---" });
}

/* ================================================================== */
/* Écrire un fichier comme le ferait un programme (root avec sudo)     */
/* ================================================================== */

function ecrireFichier(chemin, texte, io, cmd, options){
	options = options || {};
	if (chemin === "/dev/null") return null;
	var r = Shell.chercher(chemin, io, cmd);
	if (r.node instanceof Room) throw new ShellError(cmd + ": " + chemin + ": Is a directory");
	if (r.node === null){
		if (!Shell.bit(r.dir, "w", io)) throw new ShellError(cmd + ": " + chemin + ": Permission denied");
		Shell.nomValide(r.name, cmd);
		var item = new Item(r.name, String(texte).replace(/\n$/, ""), options.image || "item_sign.gif");
		item.owner = io.sudo ? "root" : JOUEUR;
		item.mode = options.mode || "rw-r--r--";
		r.dir.addItem(item);
		GameEvents.fire({ type: "write", item: item, room: r.dir, append: false, text: texte, created: true, previous: "" });
		return item;
	}
	if (r.node.immuable) Shell.verifierImmuable(r.node, cmd);
	if (!Shell.bit(r.node, "w", io)) throw new ShellError(cmd + ": " + chemin + ": Permission denied");
	var ancien = r.node.getText();
	r.node.setText(String(texte).replace(/\n$/, ""));
	if (options.mode) r.node.mode = options.mode;
	GameEvents.fire({ type: "write", item: r.node, room: r.dir, append: false, text: texte, created: false, previous: ancien });
	return r.node;
}
/* Un journal système d'une machine : on y ajoute des lignes (les programmes écrivent leurs journaux eux-mêmes). */
function ajouterAuFichierHote(h, chemin, lignes, options){
	var item = fichierHoteGuet(h, chemin);
	if (!item){
		if (options && options.siExiste) return null;
		item = poserFichierHote(h, chemin, "", options || { mode: "rw-r-----", owner: "root" });
		if (!item) return null;
		item.setText(lignes.join("\n"));
		return item;
	}
	var t = item.getText();
	item.setText((t === "" ? "" : t.replace(/\n$/, "") + "\n") + lignes.join("\n"));
	return item;
}

/* Les raccourcis relatifs (../mods-available/x.load) et absolus (/etc/...) d'une machine se suivent depuis leur dossier. */
var SUIVRE_AVANT_GUET = Shell.suivre;
Shell.suivre = function(noeud, cmd){
	var garde = 0;
	while (noeud instanceof Item && noeud.lien && noeud.lien.charAt(0) !== "~" && garde++ < 8){
		var chemin = noeud.lien.charAt(0) === "/" ? noeud.lien : (noeud.dossierLien || "") + "/" + noeud.lien;
		var cible = null;
		try { cible = Shell.chercherDepuis(current_room, cheminNormalGuet(chemin), { sudo: true }, cmd).node; } catch (e){ if (!(e instanceof ShellError)) throw e; }
		if (cible === null){
			throw new ShellError((cmd ? cmd + " : " : "") + noeud.itemname + " : lien brisé (" + noeud.lien + " n'existe plus ou n'est plus accessible)");
		}
		noeud = cible;
	}
	return SUIVRE_AVANT_GUET(noeud, cmd);
};
if (typeof PROPRIETES_SAUVEGARDEES !== "undefined"){
	["capacites", "dossierLien"].forEach(function(k){ if (PROPRIETES_SAUVEGARDEES.indexOf(k) === -1) PROPRIETES_SAUVEGARDEES.push(k); });
}

/* ================================================================== */
/* Les services gérés ici (systemctl)                                   */
/* ================================================================== */

/* Un service qu'on sait présent sur la machine (sa configuration est là) : on le déclare s'il manque. */
var SERVICES_GUET = {
	apache2: { description: "The Apache HTTP Server", fichier: "/etc/apache2/apache2.conf", proc: "apache2", binaire: "/usr/sbin/apache2" },
	auditd: { description: "Security Auditing Service", fichier: "/etc/audit", proc: "auditd", binaire: "/sbin/auditd" },
	rsyslog: { description: "System Logging Service", fichier: "/etc/rsyslog.conf", proc: "rsyslogd", binaire: "/usr/sbin/rsyslogd" },
	fail2ban: { description: "Fail2Ban Service", fichier: "/etc/fail2ban", proc: "fail2ban-server", binaire: "/usr/bin/fail2ban-server" },
	apparmor: { description: "Load AppArmor profiles", fichier: "/etc/apparmor.d", proc: null },
	chrony: { description: "chrony, an NTP client/server", fichier: "/etc/chrony/chrony.conf", proc: "chronyd", binaire: "/usr/sbin/chronyd" },
	"systemd-journald": { description: "Journal Service", fichier: "/", proc: "systemd-journald", binaire: "/lib/systemd/systemd-journald" }
};
function assurerService(h, nom){
	if (!machineGardee(h) || !SERVICES_GUET[nom]) return null;
	HOTES[h].services = HOTES[h].services || {};
	if (HOTES[h].services[nom]) return HOTES[h].services[nom];
	if (!noeudHoteGuet(h, SERVICES_GUET[nom].fichier)) return null;
	HOTES[h].services[nom] = service(h, nom, SERVICES_GUET[nom].description, { procNom: SERVICES_GUET[nom].proc || nom });
	return HOTES[h].services[nom];
}
function serviceActif(h, nom){
	var s = assurerService(h, nom) || ((HOTES[h] || {}).services || {})[nom];
	return !!(s && s.actif);
}
function serviceAuto(h, nom){
	var s = assurerService(h, nom) || ((HOTES[h] || {}).services || {})[nom];
	return !!(s && s.auto);
}
function uniteMasquee(h, unite){
	if (typeof SOURCES_GUET.uniteMasquee === "function"){ try { var r = SOURCES_GUET.uniteMasquee(h, unite); if (r !== null && r !== undefined) return !!r; } catch (e){} }
	var n = noeudHoteGuet(h, "/etc/systemd/system/" + unite, true);
	if (n instanceof Item && ((n.lien || "") === "/dev/null" || /\/dev\/null$/.test(n.lien || ""))) return true;
	var cle = h + "/" + unite.replace(/\.service$/, "");
	var e = state.reseau && state.reseau.services ? state.reseau.services[cle] : null;
	return !!(e && (e.masque || e.masked || e.masquee));
}

/* Le texte « Job for ... failed » de systemctl. */
function echecJob(unite, controle){
	return "Job for " + unite + ".service failed" + (controle ? " because the control process exited with error code" : "") + ".\n" +
		"See \"systemctl status " + unite + ".service\" and \"journalctl -xeu " + unite + ".service\" for details.";
}

/* Chaque service sait se (re)charger : renvoie { ok, erreur, lignes } . */
var CHARGEURS_GUET = {
	apache2: function(h, action){
		var c = configApache(h);
		if (!c) return { ok: false, erreur: "apache2: no configuration" };
		if (c.erreur) return { ok: false, erreur: texteErreurApache(c.erreur), lignes: [texteErreurApache(c.erreur)] };
		var probleme = paireCertificatCle(h, c);
		if (probleme) return { ok: false, erreur: probleme, lignes: [probleme] };
		var e = etatHote(h);
		e.apache = c;
		e.apacheEchec = false;
		GameEvents.fire({ type: "apacheReload", hote: h, action: action, ok: true, erreur: null });
		return { ok: true };
	},
	auditd: function(h){ var r = chargerReglesAudit(h, etatHote(h), true); return { ok: !r.erreur, erreur: r.erreur }; },
	"systemd-journald": function(h){
		var e = etatHote(h);
		e.journald = stockageJournald(h);
		if (e.journald === "persistent") creerDossierHote(h, "/var/log/journal", { mode: "rwxr-sr-x" });
		GameEvents.fire({ type: "journald", hote: h, stockage: e.journald });
		return { ok: true };
	},
	rsyslog: function(h){
		var r = lireRsyslog(h);
		etatHote(h).rsyslog.conf = r.regles;
		GameEvents.fire({ type: "rsyslog", hote: h, action: "restart", ok: !r.erreurs.length, distants: r.regles.filter(function(x){ return x.distant; }).map(function(x){ return x.action; }) });
		return { ok: true };
	},
	fail2ban: function(h){
		var f = lireFail2ban(h);
		if (f.erreur) return { ok: false, erreur: f.erreur };
		etatHote(h).f2b.conf = f.jails;
		return { ok: true };
	},
	apparmor: function(h){ etatHote(h).apparmor = profilsDemarrage(h); return { ok: true }; },
	chrony: function(){ return { ok: true }; }
};
function paireCertificatCle(h, c){
	var probleme = null;
	c.vhosts.concat([c.serveur]).forEach(function(v){
		if (probleme || !v.ssl || !v.cert || !v.cle) return;
		var cert = lireCertificat(lireFichierHote(h, v.cert)), cle = lireCle(lireFichierHote(h, v.cle));
		if (cert && !cert.inconnu && cle && !cle.inconnu && cert.cle !== cle.id){
			probleme = "AH02565: Certificate and private key " + (v.serverName || c.serveur.serverName || h) + ":" + (v.port || 443) + ":0 from " + v.cert + " and " + v.cle + " do not match";
		}
	});
	return probleme;
}

var ALIAS_UNITES = { httpd: "apache2", apache: "apache2", chronyd: "chrony", rsyslogd: "rsyslog", journald: "systemd-journald", "fail2ban-server": "fail2ban" };
var SYSTEMCTL_AVANT_GUET = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var h = hoteIci(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0], unite = (mots[1] || "").replace(/\.service$/, "");
	unite = ALIAS_UNITES[unite] || unite;
	if (!action || !mots[1] || !machineGardee(h) || !CHARGEURS_GUET[unite] || mots.length > 2) return SYSTEMCTL_AVANT_GUET.apply(this, arguments);
	var s = assurerService(h, unite);
	// Sans sa configuration sur le disque, le service n'est pas géré ici (un service déclaré par un autre fichier, par exemple).
	if (!s || !noeudHoteGuet(h, SERVICES_GUET[unite].fichier)) return SYSTEMCTL_AVANT_GUET.apply(this, arguments);
	var e = etatHote(h), chargeur = CHARGEURS_GUET[unite];
	var autres = args.map(function(a){ return a === mots[1] ? unite : a; });
	if (action === "status" && unite === "apache2" && e.apacheEchec && !s.actif){
		return "× apache2.service - The Apache HTTP Server\n     Loaded: loaded (/lib/systemd/system/apache2.service; " + (s.auto ? "enabled" : "disabled") + "; preset: enabled)\n" +
			"     Active: " + (io.tty ? C.rouge("failed") : "failed") + " (Result: exit-code)\n       Docs: https://httpd.apache.org/docs/2.4/\n\n" +
			(e.apacheErreur || "").split("\n").filter(Boolean).map(function(l){ return h + " apachectl[" + (1200 + condense(l) % 700) + "]: " + l; }).join("\n") +
			"\n" + h + " systemd[1]: apache2.service: Control process exited, code=exited, status=1/FAILURE\n" + h + " systemd[1]: apache2.service: Failed with result 'exit-code'." +
			astuce(io, "Apache est arrêté : sa configuration a été refusée au démarrage. apachectl configtest dit où est la faute.");
	}
	if (["reload", "restart", "start", "try-restart", "reload-or-restart", "try-reload-or-restart"].indexOf(action) === -1) return SYSTEMCTL_AVANT_GUET.call(this, autres, io);
	if (!io.sudo) throw new ShellError("Failed to " + action + " " + unite + ".service: Access denied" + astuce(io, "Gérer les services est réservé à root : sudo systemctl " + action + " " + unite));
	if (uniteMasquee(h, unite + ".service")) throw new ShellError("Failed to " + action + " " + unite + ".service: Unit " + unite + ".service is masked.");
	if (action === "reload" && unite === "systemd-journald") throw new ShellError("Failed to reload systemd-journald.service: Job type reload is not applicable for unit systemd-journald.service." + astuce(io, "journald relit sa configuration en redémarrant : sudo systemctl restart systemd-journald"));
	var veutRecharger = action === "reload" || action === "try-reload-or-restart" || (action === "reload-or-restart" && s.actif);
	if (veutRecharger && !s.actif){
		if (action === "try-reload-or-restart") return "";
		throw new ShellError(unite + ".service is not active, cannot reload." + astuce(io, "Le service est arrêté : il n'y a rien à recharger. sudo systemctl start " + unite));
	}
	if (action === "try-restart" && !s.actif) return "";
	var r = chargeur(h, veutRecharger ? "reload" : (action === "start" ? "start" : "restart"));
	var d = maintenantGuet();
	if (!r.ok){
		journalGuet(h, { unite: "systemd", message: (veutRecharger ? "Reloading " : "Starting ") + unite + ".service - " + s.description + "...", quand: d });
		(r.lignes || [r.erreur]).forEach(function(l){ String(l).split("\n").forEach(function(x){ journalGuet(h, { unite: unite === "apache2" ? "apachectl" : unite, message: x, prio: 3, quand: d }); }); });
		journalGuet(h, { unite: "systemd", message: unite + ".service: Control process exited, code=exited, status=1/FAILURE", prio: 3, quand: d });
		if (unite === "apache2"){ e.apacheErreur = r.erreur; GameEvents.fire({ type: "apacheReload", hote: h, action: veutRecharger ? "reload" : action, ok: false, erreur: r.erreur }); }
		if (veutRecharger){
			journalGuet(h, { unite: "systemd", message: "Reload failed for " + unite + ".service - " + s.description + ".", prio: 3, quand: d });
			throw new ShellError(echecJob(unite, false) + astuce(io, "Rechargement refusé : l'ancienne configuration reste en place, le service tourne toujours. Lis l'erreur (" + (unite === "apache2" ? "apachectl configtest" : "journalctl -xeu " + unite) + "), corrige, recommence."));
		}
		arreterService(h, unite);
		if (unite === "apache2") e.apacheEchec = true;
		journalGuet(h, { unite: "systemd", message: "Failed to start " + unite + ".service - " + s.description + ".", prio: 3, quand: d });
		throw new ShellError(echecJob(unite, true) + astuce(io, unite === "apache2" ? "Redémarrer avec une configuration cassée, c'est éteindre le site : Apache est maintenant arrêté. D'abord apachectl configtest, ensuite seulement reload." : "Le service n'a pas pu démarrer : sa configuration est refusée."));
	}
	if (veutRecharger){
		journalGuet(h, { unite: "systemd", message: "Reloading " + unite + ".service - " + s.description + "...", quand: d });
		journalGuet(h, { unite: "systemd", message: "Reloaded " + unite + ".service - " + s.description + ".", quand: d });
		GameEvents.fire({ type: "systemctl", action: "reload", host: h, service: unite, now: false });
		return "";
	}
	var sortie = SYSTEMCTL_AVANT_GUET.call(this, autres.map(function(a){ return a === "reload-or-restart" || a === "try-restart" ? "restart" : a; }), io);
	if (unite === "apache2"){ e.apacheEchec = false; e.apacheErreur = null; }
	journalGuet(h, { unite: "systemd", message: "Started " + unite + ".service - " + s.description + ".", quand: d });
	return sortie;
};

/* ================================================================== */
/* apachectl, apache2ctl                                               */
/* ================================================================== */

function apachectl(nomCmd){
	return function(args, io){
		var h = hoteIci();
		if (!machineGardee(h) || !apacheInstalle(h)) absentIci(io, nomCmd, "apache2");
		var a = args.filter(function(x){ return x !== "-k"; });
		var action = a[0] || "";
		if (action === "-t" && a.indexOf("-D") > -1){
			var quoi = a[a.indexOf("-D") + 1];
			if (quoi === "DUMP_MODULES") action = "-M";
			else if (quoi === "DUMP_VHOSTS") action = "-S";
		}
		if (action === "configtest" || action === "-t"){
			var c = configApache(h);
			c.avertissements.forEach(function(w){ io.err(w); });
			GameEvents.fire({ type: "apachectl", hote: h, action: "configtest", ok: !c.erreur, erreur: c.erreur ? texteErreurApache(c.erreur) : null });
			if (c.erreur){
				throw new ShellError(texteErreurApache(c.erreur) + "\nAction '" + action + "' failed.\nThe Apache error log may have more information." +
					astuce(io, "La configuration sur le disque est refusée. Tant qu'elle l'est, systemctl reload apache2 la refusera aussi, et Apache garde l'ancienne."));
			}
			io.err("Syntax OK");
			if (io.tty) io.err(C.gris("(La configuration sur le disque est valide. Elle ne s'applique qu'au prochain chargement : sudo systemctl reload apache2.)"));
			return "";
		}
		if (action === "-M" || action === "-S"){
			var cfg = configApache(h);
			cfg.avertissements.forEach(function(w){ io.err(w); });
			GameEvents.fire({ type: "apachectl", hote: h, action: action, ok: !cfg.erreur, erreur: cfg.erreur ? texteErreurApache(cfg.erreur) : null });
			if (cfg.erreur) throw new ShellError(texteErreurApache(cfg.erreur));
			if (action === "-M"){
				return ["Loaded Modules:"].concat(cfg.modules.map(function(m){ return " " + m + "_module (" + (MODULES_STATIQUES.indexOf(m) > -1 ? "static" : "shared") + ")"; })).join("\n") +
					astuce(io, "Les modules de la configuration sur le disque. Ceux qui tournent vraiment sont ceux du dernier chargement (reload ou restart).");
			}
			return texteVhosts(h, cfg);
		}
		if (action === "-v" || action === "-V"){
			var lignes = ["Server version: Apache/" + APACHE_VERSION + " (Debian)", "Server built:   2024-10-04T15:21:08"];
			if (action === "-V") lignes = lignes.concat(["Server's Module Magic Number: 20120211:131", "Server loaded:  APR 1.7.2, APR-UTIL 1.6.3, PCRE 10.42 2022-12-11",
				"Compiled using: APR 1.7.2, APR-UTIL 1.6.3, PCRE 10.42 2022-12-11", "Architecture:   64-bit", "Server MPM:     event", "  threaded:     yes (fixed thread count)",
				"    forked:     yes (variable process count)", "Server compiled with....", " -D APR_HAS_SENDFILE", " -D HTTPD_ROOT=\"/etc/apache2\"", " -D SERVER_CONFIG_FILE=\"apache2.conf\""]);
			return lignes.join("\n");
		}
		var correspondance = { start: "start", stop: "stop", restart: "restart", graceful: "reload", "graceful-stop": "stop", status: "status", fullstatus: "status" };
		if (correspondance[action]){
			return Shell.sorts.systemctl([correspondance[action], "apache2"], io);
		}
		throw new ShellError("Usage: " + nomCmd + " start|stop|restart|graceful|graceful-stop|configtest|status|fullstatus|help\n       " + nomCmd + " <apache2 args>\n       " + nomCmd + " -h            (for help on <apache2 args>)" +
			astuce(io, "Les plus utiles : " + nomCmd + " configtest (vérifier), " + nomCmd + " -M (les modules), " + nomCmd + " -S (les sites)."));
	};
}
function texteVhosts(h, cfg){
	var lignes = ["VirtualHost configuration:"];
	var groupes = {};
	cfg.vhosts.forEach(function(v){ (groupes[v.adresse] = groupes[v.adresse] || []).push(v); });
	Object.keys(groupes).forEach(function(adr){
		var g = groupes[adr];
		function nomV(v){ return v.serverName || cfg.serveur.serverName || "127.0.1.1"; }
		if (g.length === 1) lignes.push(completerDroite(adr, 22) + " " + nomV(g[0]) + " (" + g[0].fichier + ":" + g[0].ligne + ")");
		else {
			lignes.push(completerDroite(adr, 22) + " is a NameVirtualHost");
			lignes.push("         default server " + nomV(g[0]) + " (" + g[0].fichier + ":" + g[0].ligne + ")");
			g.forEach(function(v){ lignes.push("         port " + (v.port || "*") + " namevhost " + nomV(v) + " (" + v.fichier + ":" + v.ligne + ")");
				v.aliases.forEach(function(a){ lignes.push("                 alias " + a); }); });
		}
	});
	lignes.push("ServerRoot: \"" + APACHE_RACINE + "\"", "Main DocumentRoot: \"" + (cfg.serveur.documentRoot || "/var/www/html") + "\"",
		"Main ErrorLog: \"/var/log/apache2/error.log\"", "Mutex default: dir=\"/var/run/apache2/\" mechanism=default ", "Mutex watchdog-callback: using_defaults",
		"PidFile: \"/var/run/apache2/apache2.pid\"", "Define: DUMP_VHOSTS", "Define: DUMP_RUN_CFG", "User: name=\"www-data\" id=33", "Group: name=\"www-data\" id=33");
	return lignes.join("\n");
}
Shell.sorts.apachectl = apachectl("apachectl");
Shell.sorts.apache2ctl = apachectl("apache2ctl");

/* ================================================================== */
/* a2enmod, a2dismod, a2enconf, a2disconf, a2ensite, a2dissite          */
/* ================================================================== */

var MODULES_ESSENTIELS = Object.keys(MODULES_DEBIAN);
function a2commande(cmd, type, activer){
	var dossiers = { module: ["mods-available", "mods-enabled"], conf: ["conf-available", "conf-enabled"], site: ["sites-available", "sites-enabled"] }[type];
	var Nom = { module: "Module", conf: "Conf", site: "Site" }[type];
	var commandeRelance = type === "module" ? "systemctl restart apache2" : "systemctl reload apache2";
	return function(args, io){
		var h = hoteIci();
		if (!machineGardee(h) || !apacheInstalle(h)) absentIci(io, cmd, "apache2");
		var quiet = false, force = false, noms = [];
		args.forEach(function(a){
			if (/^-[qfmp]+$/.test(a)){ if (a.indexOf("q") > -1) quiet = true; if (a.indexOf("f") > -1) force = true; }
			else if (a.charAt(0) === "-") throw new ShellError("Unknown option: " + a.replace(/^-+/, "") + "\nusage: " + cmd + " [ -q|--quiet ] [ -f|--force ] [ -m|--maintmode ] [ -p|--purge ] module [ module ... ]");
			else noms.push(a);
		});
		var dispo = fichiersDuDossierGuet(h, APACHE_RACINE + "/" + dossiers[0], type === "module" ? "*.load" : "*.conf").map(function(f){ return f.nom.replace(/\.(load|conf)$/, ""); });
		var actifs = fichiersDuDossierGuet(h, APACHE_RACINE + "/" + dossiers[1], type === "module" ? "*.load" : "*.conf").map(function(f){ return f.nom.replace(/\.(load|conf)$/, ""); });
		if (!noms.length){
			var choix = activer ? dispo.filter(function(n){ return actifs.indexOf(n) === -1; }) : actifs;
			throw new ShellError("Your choices are: " + choix.join(" ") + "\nWhich " + (type === "module" ? "module(s)" : type + "(s)") + " do you want to " + (activer ? "enable" : "disable") + " (wildcards ok)?" +
				astuce(io, "Donne le nom à la suite : sudo " + cmd + " NOM"));
		}
		var developpes = [];
		noms.forEach(function(n){
			n = n.replace(/\.(load|conf)$/, "");
			if (/[*?[]/.test(n)){
				var re = motifVersRegExp(n);
				(activer ? dispo : actifs).filter(function(x){ return re.test(x); }).forEach(function(x){ developpes.push(x); });
			} else developpes.push(n);
		});
		if (!io.sudo){
			throw new ShellError("ERROR: Could not create " + APACHE_RACINE + "/" + dossiers[1] + "/" + developpes[0] + (type === "module" ? ".load" : ".conf") + ": Permission denied" +
				astuce(io, "Activer ou couper un " + (type === "module" ? "module" : type === "conf" ? "morceau de configuration" : "site") + " modifie /etc/apache2 : sudo " + cmd + " " + noms.join(" ")));
		}
		var lignes = [], changes = [], erreurs = [];
		var essentiels = !activer && type === "module" && !force ? developpes.filter(function(n){ return MODULES_ESSENTIELS.indexOf(n) > -1 && actifs.indexOf(n) > -1; }) : [];
		function faire(){
			developpes.forEach(function(n){
				if (activer) activerElement(n, []);
				else desactiverElement(n);
			});
			GameEvents.fire({ type: "a2mod", hote: h, cmd: cmd, objet: type, action: activer ? "enable" : "disable", noms: developpes, changes: changes });
			if (changes.length && !quiet) lignes.push("To activate the new configuration, you need to run:", "  " + commandeRelance);
			if (changes.length && io.tty && type === "module") lignes.push(C.gris("(Un module se charge au démarrage d'Apache : il faut un restart, pas un simple reload. Et d'abord : apachectl configtest.)"));
			return { texte: lignes.join("\n"), erreur: erreurs.length ? erreurs.join("\n") : null };
		}
		function chemin(dossier, n, ext){ return APACHE_RACINE + "/" + dossier + "/" + n + ext; }
		function activerElement(n, pile){
			if (dispo.indexOf(n) === -1){ erreurs.push("ERROR: " + Nom + " " + n + " does not exist!"); return; }
			if (pile.indexOf(n) > -1) return;
			if (type === "module"){
				var texte = lireFichierHote(h, chemin(dossiers[0], n, ".load")) || "";
				var conflits = (/^#\s*Conflicts:\s*(.*)$/m.exec(texte) || [])[1];
				if (conflits){
					var gene = conflits.trim().split(/\s+/).filter(function(x){ return actifs.indexOf(x) > -1; })[0];
					if (gene){ erreurs.push("ERROR: Module " + gene + " is enabled - cannot proceed due to conflicts. It needs to be disabled first!"); return; }
				}
				var deps = (/^#\s*Depends:\s*(.*)$/m.exec(texte) || [])[1];
				if (deps) deps.trim().split(/\s+/).forEach(function(d){
					lignes.push("Considering dependency " + d + " for " + n + ":");
					activerElement(d, pile.concat([n]));
				});
			}
			if (actifs.indexOf(n) > -1){ if (!quiet) lignes.push(Nom + " " + n + " already enabled"); return; }
			var ext = type === "module" ? ".load" : ".conf";
			poserFichierHote(h, chemin(dossiers[1], n, ext), null, { lien: "../" + dossiers[0] + "/" + n + ext });
			if (type === "module" && fichierHoteGuet(h, chemin(dossiers[0], n, ".conf"))) poserFichierHote(h, chemin(dossiers[1], n, ".conf"), null, { lien: "../" + dossiers[0] + "/" + n + ".conf" });
			actifs.push(n);
			changes.push(n);
			lignes.push("Enabling " + type + " " + n + ".");
			if (type === "module" && n === "ssl") lignes.push("See /usr/share/doc/apache2/README.Debian.gz on how to configure SSL and create self-signed certificates.");
		}
		function desactiverElement(n){
			if (dispo.indexOf(n) === -1 && actifs.indexOf(n) === -1){ erreurs.push("ERROR: " + Nom + " " + n + " does not exist!"); return; }
			if (actifs.indexOf(n) === -1){ if (!quiet) lignes.push(Nom + " " + n + " already disabled"); return; }
			[".load", ".conf"].forEach(function(ext){ supprimerFichierHoteGuet(h, chemin(dossiers[1], n, ext)); });
			actifs = actifs.filter(function(x){ return x !== n; });
			changes.push(n);
			lignes.push(Nom + " " + n + " disabled.");
		}
		function conclure(r){
			if (r.erreur){ io.code = 1; io.err(r.erreur); }
			return r.texte;
		}
		if (essentiels.length){
			var avertissement = "WARNING: The following essential module" + (essentiels.length > 1 ? "s" : "") + " will be disabled.\nThis might result in unexpected behaviour and should NOT be done\n" +
				"unless you know exactly what you are doing!\n " + essentiels.join(" ") + "\n";
			var question = "To continue type in the phrase 'Yes, do as I say!' or retype the package name to abort:";
			if (io.stdin !== null){
				var rep = String(io.stdin).split("\n")[0];
				if (rep !== "Yes, do as I say!") throw new ShellError(avertissement + "\n" + question + "\nAborting");
				return avertissement + "\n" + question + "\n" + conclure(faire());
			}
			term.demander(avertissement + "\n" + question + " ", false, function(reponse){
				if (reponse !== "Yes, do as I say!"){ term.echo("Aborting" + (io.tty ? "\n" + C.gris("(Rien n'a changé. sudo " + cmd + " -f " + noms.join(" ") + " passe outre l'avertissement, si tu sais ce que tu fais.)") : "")); Shell.fin(); return; }
				var r = faire();
				if (r.texte) term.echo(r.texte);
				if (r.erreur) term.echo(r.erreur);
				Shell.fin();
			});
			return "";
		}
		return conclure(faire());
	};
}
Shell.sorts.a2enmod = a2commande("a2enmod", "module", true);
Shell.sorts.a2dismod = a2commande("a2dismod", "module", false);
Shell.sorts.a2enconf = a2commande("a2enconf", "conf", true);
Shell.sorts.a2disconf = a2commande("a2disconf", "conf", false);
Shell.sorts.a2ensite = a2commande("a2ensite", "site", true);
Shell.sorts.a2dissite = a2commande("a2dissite", "site", false);

/* ================================================================== */
/* curl vers un Apache gardé                                           */
/* ================================================================== */

var TEXTE_CURL_60 = "More details here: https://curl.se/docs/sslcerts.html\n\ncurl failed to verify the legitimacy of the server and therefore could not\n" +
	"establish a secure connection to it. To learn more about this situation and\nhow to fix it, please visit the web page mentioned above.";
function versionsTls(min, max){ return ["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"].slice(["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"].indexOf(min), ["TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"].indexOf(max) + 1); }
var CHIFFRES_TLS = { "TLSv1.3": "TLS_AES_256_GCM_SHA384", "TLSv1.2": "ECDHE-RSA-AES256-GCM-SHA384", "TLSv1.1": "ECDHE-RSA-AES256-SHA", "TLSv1": "ECDHE-RSA-AES256-SHA" };
function dnCompact(dn, sep){ return String(dn).split(", ").map(function(x){ return x.replace(" = ", "="); }).join(sep || "; "); }

function portJoignable(source, cible, port){
	if (typeof SOURCES_GUET.portJoignable === "function"){ try { var r = SOURCES_GUET.portJoignable(source, cible, port); if (r !== null && r !== undefined) return !!r; } catch (e){} }
	return true;
}
/* Ce que verrait un client TLS : { erreur, version, cert, verification } . */
function poigneeTls(h, cfg, port, nom, versionsClient){
	var vh = vhostPour(cfg, port, nom);
	var ssl = vh ? vh.ssl : cfg.serveur.sslEngine;
	if (!ssl || cfg.modules.indexOf("ssl") === -1) return { erreur: "version" };
	var serveur = protocolesVhost(cfg, vh);
	var communes = versionsClient.filter(function(v){ return serveur.indexOf(v) > -1; });
	var fichierCert = (vh && vh.cert) || cfg.serveur.cert;
	var cert = fichierCert ? lireCertificat(lireFichierHote(h, fichierCert)) : null;
	if (!communes.length) return { erreur: "protocole", serveur: serveur, vhost: vh };
	return { version: communes[communes.length - 1], cert: cert && !cert.inconnu ? cert : null, vhost: vh, serveur: serveur };
}

function EchecCurl(code){ this.code = code; }
var CURL_AVANT_GUET = Shell.sorts.curl;
Shell.sorts.curl = function(args, io){
	try { return curlGuet.apply(this, arguments); }
	catch (e){ if (e instanceof EchecCurl){ io.code = e.code; return ""; } throw e; }
};
function curlGuet(args, io){
	var avecValeur = ["-o", "--output", "-X", "--request", "-H", "--header", "-w", "--write-out", "-d", "--data", "-A", "--user-agent", "--tls-max", "-m", "--max-time", "--connect-timeout", "-u", "--user", "-e", "--referer"];
	var url = null;
	for (var i = 0; i < args.length; i++){
		if (avecValeur.indexOf(args[i]) > -1){ i++; continue; }
		if (args[i].charAt(0) !== "-"){ url = args[i]; break; }
	}
	var m = url ? /^(?:(https?):\/\/)?([^\/:?#]+)(?::(\d+))?([\/?#].*)?$/.exec(url) : null;
	var h = m ? (m[2] === "localhost" || m[2] === "127.0.0.1" ? hoteIci() : hoteDepuisCible(m[2])) : null;
	if (!m || !h || !machineGardee(h) || !apacheInstalle(h)) return CURL_AVANT_GUET.apply(this, arguments);
	var o = { entetes: false, inclure: false, bavard: false, insecure: false, silencieux: false, montrerErreurs: false, suivre: false, methode: null, sortie: null,
		ecrire: null, echouer: false, nomHote: null, min: "TLSv1.2", max: "TLSv1.3", donnees: null };
	for (var k = 0; k < args.length; k++){
		var a = args[k];
		if (a === url) continue;
		var long = { "--head": "-I", "--include": "-i", "--verbose": "-v", "--insecure": "-k", "--silent": "-s", "--show-error": "-S", "--location": "-L", "--fail": "-f" }[a];
		if (long) a = long;
		if (/^-[IivksSLf]+$/.test(a)){
			a.substring(1).split("").forEach(function(l){
				if (l === "I") o.entetes = true; if (l === "i") o.inclure = true; if (l === "v") o.bavard = true; if (l === "k") o.insecure = true;
				if (l === "s") o.silencieux = true; if (l === "S") o.montrerErreurs = true; if (l === "L") o.suivre = true; if (l === "f") o.echouer = true;
			});
			continue;
		}
		if (a === "-o" || a === "--output"){ o.sortie = args[++k]; continue; }
		if (a === "-X" || a === "--request"){ o.methode = (args[++k] || "GET").toUpperCase(); continue; }
		if (a === "-H" || a === "--header"){ var hd = /^\s*host\s*:\s*(.+)$/i.exec(args[++k] || ""); if (hd) o.nomHote = hd[1].trim(); continue; }
		if (a === "-w" || a === "--write-out"){ o.ecrire = args[++k]; continue; }
		if (a === "-d" || a === "--data"){ o.donnees = args[++k] || ""; continue; }
		if (a === "-A" || a === "--user-agent" || a === "-m" || a === "--max-time" || a === "--connect-timeout" || a === "-u" || a === "--user" || a === "-e" || a === "--referer"){ k++; continue; }
		if (a === "--tls-max"){ var v = args[++k]; o.max = { "1.0": "TLSv1", "1.1": "TLSv1.1", "1.2": "TLSv1.2", "1.3": "TLSv1.3" }[v] || "TLSv1.3"; continue; }
		var t = { "--tlsv1": "TLSv1", "--tlsv1.0": "TLSv1", "--tlsv1.1": "TLSv1.1", "--tlsv1.2": "TLSv1.2", "--tlsv1.3": "TLSv1.3" }[a];
		if (t){ o.min = t; continue; }
		if (a === "--http1.1" || a === "--http2" || a === "--compressed" || a === "-O" || a === "--remote-name" || a === "-#" || a === "--no-progress-meter") continue;
		throw new ShellError("curl: option " + a + ": is unknown\ncurl: try 'curl --help' or 'curl --manual' for more information", 2);
	}
	var methode = o.methode || (o.entetes ? "HEAD" : (o.donnees !== null ? "POST" : "GET"));
	var https = (m[1] || "http") === "https";
	var port = m[3] ? +m[3] : (https ? 443 : 80);
	var chemin = m[4] && m[4].charAt(0) === "/" ? m[4] : "/" + (m[4] || "");
	var nom = o.nomHote || m[2];
	var trace = [], blocs = [], corpsFinal = "", codeFinal = 0, enTetesFinales = {}, ip = m[2] === "localhost" || m[2] === "127.0.0.1" ? "127.0.0.1" : (HOTES[h].ip || "127.0.0.1");
	var verification = 0, tours = 0, s = serviceApache(h) || assurerService(h, "apache2");
	function echec(code, message){
		GameEvents.fire({ type: "curl", guet: true, hote: h, url: url, cheminUrl: chemin, methode: methode, code: 0, erreur: code, entetes: o.entetes, https: https });
		if (trace.length) io.err(trace.join("\n"));
		if (o.silencieux && !o.montrerErreurs) throw new EchecCurl(code);
		throw new ShellError("curl: (" + code + ") " + message, code);
	}
	while (true){
		var cfg = apacheActive(h);
		if (!s || !s.actif || !cfg || cfg.listen.indexOf(port) === -1){
			if (o.bavard) trace.push("*   Trying " + ip + ":" + port + "...", "* connect to " + ip + " port " + port + " failed: Connection refused");
			echec(7, "Failed to connect to " + m[2] + " port " + port + " after 0 ms: Couldn't connect to server");
		}
		if (!portJoignable(hoteIci(), h, port)){
			if (o.bavard) trace.push("*   Trying " + ip + ":" + port + "...");
			echec(28, "Failed to connect to " + m[2] + " port " + port + " after 130000 ms: Connection timed out");
		}
		if (o.bavard) trace.push("*   Trying " + ip + ":" + port + "...", "* Connected to " + m[2] + " (" + ip + ") port " + port + " (#0)");
		if (https){
			var p = poigneeTls(h, cfg, port, nom, versionsTls(o.min, o.max));
			if (p.erreur === "version") echec(35, "OpenSSL/" + OPENSSL_VERSION + ": error:0A00010B:SSL routines::wrong version number");
			if (p.erreur === "protocole") echec(35, "OpenSSL/" + OPENSSL_VERSION + ": error:0A00042E:SSL routines::tlsv1 alert protocol version");
			if (o.bavard){
				trace.push("* ALPN: offers h2,http/1.1", "* " + p.version + " (OUT), TLS handshake, Client hello (1):", "*  CAfile: /etc/ssl/certs/ca-certificates.crt", "*  CApath: /etc/ssl/certs",
					"* " + p.version + " (IN), TLS handshake, Server hello (2):", "* SSL connection using " + p.version + " / " + CHIFFRES_TLS[p.version], "* ALPN: server accepted http/1.1");
				if (p.cert) trace.push("* Server certificate:", "*  subject: " + dnCompact(p.cert.sujet), "*  start date: " + dateUtcOpenssl(p.cert.debut), "*  expire date: " + dateUtcOpenssl(p.cert.fin),
					"*  issuer: " + dnCompact(p.cert.emetteur));
			}
			if (p.cert){
				var verdict = verifierCertificat(p.cert, nom);
				verification = verdict.code;
				if (!o.insecure){
					if (verdict.code !== 0) echec(60, "SSL certificate problem: " + verdict.texte + "\n" + TEXTE_CURL_60 + astuce(io, verdict.code === 10 ? "Le certificat servi a expiré : openssl x509 -noout -dates -in LE_FICHIER le confirme. -k ferait taire curl, pas le problème." : "curl refuse de parler à un serveur qu'il ne peut pas vérifier. -k le force, pour un test seulement."));
					if (!nomCouvert(p.cert, nom)) echec(60, "SSL: no alternative certificate subject name matches target host name '" + nom + "'\n" + TEXTE_CURL_60);
					if (o.bavard) trace.push("*  SSL certificate verify ok.");
				} else if (o.bavard) trace.push("*  SSL certificate verify result: " + verdict.texte + " (" + verdict.code + "), continuing anyway.");
			}
		}
		var rep = repondreApache(h, cfg, { methode: methode, chemin: chemin, https: https, port: port, nom: nom });
		var entetes = entetesApache(cfg, rep.vhost, rep, methode);
		var ligneStatut = "HTTP/1.1 " + rep.code + " " + (RAISONS_HTTP[rep.code] || "");
		if (o.bavard){
			trace.push("> " + methode + " " + chemin + " HTTP/1.1", "> Host: " + nom + (port !== (https ? 443 : 80) ? ":" + port : ""), "> User-Agent: curl/7.88.1", "> Accept: */*", "> ",
				"< " + ligneStatut);
			entetes.forEach(function(e){ trace.push("< " + e[0] + ": " + e[1]); });
			trace.push("< ");
		}
		codeFinal = rep.code;
		enTetesFinales = {};
		entetes.forEach(function(e){ enTetesFinales[e[0]] = e[1]; });
		var bloc = [ligneStatut].concat(entetes.map(function(e){ return e[0] + ": " + e[1]; })).join("\n");
		var location = enTetesFinales.Location;
		if (o.suivre && location && rep.code >= 300 && rep.code < 400 && tours++ < 10){
			if (o.entetes || o.inclure) blocs.push(bloc + "\n");
			var mm = /^(https?):\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(location);
			if (!mm) break;
			https = mm[1] === "https"; port = mm[3] ? +mm[3] : (https ? 443 : 80); chemin = mm[4] || "/";
			var autre = mm[2] === "localhost" ? hoteIci() : hoteDepuisCible(mm[2]);
			if (autre !== h){ blocs.push(bloc); corpsFinal = ""; break; }
			nom = mm[2];
			if (o.bavard) trace.push("* Issue another request to this URL: '" + location + "'");
			continue;
		}
		if (o.entetes){ blocs.push(bloc); corpsFinal = ""; }
		else if (o.inclure){ blocs.push(bloc + "\n"); corpsFinal = methode === "HEAD" ? "" : rep.corps; }
		else corpsFinal = methode === "HEAD" ? "" : rep.corps;
		break;
	}
	if (o.bavard) trace.push("* Connection #0 to host " + m[2] + " left intact");
	GameEvents.fire({ type: "curl", guet: true, hote: h, url: url, cheminUrl: chemin, methode: methode, code: codeFinal, entetes: o.entetes, https: https,
		serveur: enTetesFinales.Server || null, enTetes: enTetesFinales, verification: verification });
	if (o.bavard) io.err(trace.join("\n"));
	if (o.echouer && codeFinal >= 400){
		io.code = 22;
		if (!o.silencieux || o.montrerErreurs) io.err("curl: (22) The requested URL returned error: " + codeFinal);
		return "";
	}
	var texte = blocs.join("\n") + (blocs.length && corpsFinal ? "\n" : "") + corpsFinal;
	var ecrit = "";
	if (o.ecrire){
		ecrit = o.ecrire.replace(/%\{(http_code|response_code)\}/g, String(codeFinal)).replace(/%\{ssl_verify_result\}/g, String(verification))
			.replace(/%\{content_type\}/g, enTetesFinales["Content-Type"] || "").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
	}
	if (o.sortie){
		Shell.ecrire(o.sortie, texte, false);
		if (!o.silencieux){
			var n = versOctetsUtf8(texte).length;
			io.err("  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n" +
				"100 " + completerGauche(n, 5) + "  100 " + completerGauche(n, 5) + "    0     0   " + completerGauche(Math.max(1, Math.round(n / 1.2)) + "", 4) + "      0 --:--:-- --:--:-- --:--:--  " + completerGauche(Math.max(1, Math.round(n / 1.2)) + "", 4));
		}
		if (ecrit){ io.sansFin = !/\n$/.test(ecrit); return ecrit.replace(/\n$/, ""); }
		return "";
	}
	if (ecrit) return texte + ecrit.replace(/\n$/, "");
	return texte;
}

/* ================================================================== */
/* openssl : x509, s_client, req                                        */
/* ================================================================== */

function valeurOption(args, nom){ var i = args.indexOf(nom); return i > -1 ? args[i + 1] : undefined; }
function texteCertificatComplet(cert){
	var serie = cert.serie.toLowerCase().replace(/(..)(?!$)/g, "$1:");
	var module = hexDe("module:" + cert.cle, 512), lignesModule = [];
	for (var i = 0; i < 6; i++) lignesModule.push("                    " + module.substring(i * 30, i * 30 + 30).replace(/(..)(?!$)/g, "$1:") + ":");
	var rsa = /^rsa/.test(cert.algo), bits = rsa ? (cert.algo.split(":")[1] || "2048") : null;
	return ["Certificate:", "    Data:", "        Version: 3 (0x2)", "        Serial Number:", "            " + serie,
		"        Signature Algorithm: " + (rsa ? "sha256WithRSAEncryption" : "ED25519"), "        Issuer: " + cert.emetteur, "        Validity",
		"            Not Before: " + dateUtcOpenssl(cert.debut), "            Not After : " + dateUtcOpenssl(cert.fin), "        Subject: " + cert.sujet,
		"        Subject Public Key Info:", "            Public Key Algorithm: " + (rsa ? "rsaEncryption" : "ED25519")].concat(rsa ?
		["                Public-Key: (" + bits + " bit)", "                Modulus:"].concat(lignesModule).concat(["                Exponent: 65537 (0x10001)"]) :
		["                ED25519 Public-Key:", "                pub:", "                    " + hexDe("pub:" + cert.cle, 64).replace(/(..)(?!$)/g, "$1:")]).concat([
		"        X509v3 extensions:", "            X509v3 Subject Alternative Name: ", "                " + (cert.san || []).map(function(n){ return "DNS:" + n; }).join(", "),
		"            X509v3 Basic Constraints: critical", "                CA:" + (cert.ca ? "TRUE" : "FALSE"),
		"    Signature Algorithm: " + (rsa ? "sha256WithRSAEncryption" : "ED25519"), "    Signature Value:", "        " + hexDe("sig:" + cert.serie, 36).replace(/(..)(?!$)/g, "$1:")]).join("\n");
}
function opensslX509(args, io, avant){
	var fichier = valeurOption(args, "-in"), texte = null;
	if (fichier){
		var r = null;
		try { r = Shell.chercher(fichier, io, "openssl"); } catch (e){ r = null; }
		if (!r || r.node === null){
			if (!machineGardee(hoteIci())) return avant.call(this, args, io);
			throw new ShellError("Could not open file or uri for loading certificate from " + fichier + "\n40D7A1F2E37F0000:error:16000069:STORE routines:ossl_store_get0_loader_int:unregistered scheme:../crypto/store/store_register.c:237:scheme=file\n" +
				"40D7A1F2E37F0000:error:80000002:system library:file_open:No such file or directory:../providers/implementations/storemgmt/file_store.c:267:calling stat(" + fichier + ")\nUnable to load certificate");
		}
		var n = Shell.suivre(r.node, "openssl");
		if (n instanceof Room) throw new ShellError("Could not open file or uri for loading certificate from " + fichier + "\nUnable to load certificate");
		if (!Shell.bit(n, "r", io)){
			throw new ShellError("Could not open file or uri for loading certificate from " + fichier + "\n40D7A1F2E37F0000:error:8000000D:system library:file_open:Permission denied:../providers/implementations/storemgmt/file_store.c:267:calling stat(" + fichier + ")\nUnable to load certificate" +
				astuce(io, "Ce fichier n'est pas lisible pour toi : sudo openssl x509 ..."));
		}
		texte = n.getText();
	} else if (io.stdin !== null) texte = io.stdin;
	var cert = texte === null ? null : lireCertificat(texte);
	if (!cert || cert.inconnu) return avant.call(this, args, io);
	var lignes = [];
	var ordre = args.filter(function(a){ return /^-(subject|issuer|dates|startdate|enddate|serial|fingerprint|text|checkend|ext|pubkey|email|noout|in|nameopt|sha256|sha1|md5|inform|out)$/.test(a) || true; });
	var checkend = valeurOption(args, "-checkend");
	for (var i = 0; i < ordre.length; i++){
		var a = ordre[i];
		if (a === "-in" || a === "-checkend" || a === "-nameopt" || a === "-inform" || a === "-out" || a === "-ext"){
			if (a === "-ext"){ var ext = args[i + 1] || ""; if (/subjectAltName/.test(ext)) lignes.push("X509v3 Subject Alternative Name: \n    " + (cert.san || []).map(function(x){ return "DNS:" + x; }).join(", ")); }
			i++; continue;
		}
		if (a === "-subject") lignes.push("subject=" + cert.sujet);
		else if (a === "-issuer") lignes.push("issuer=" + cert.emetteur);
		else if (a === "-dates"){ lignes.push("notBefore=" + dateUtcOpenssl(cert.debut)); lignes.push("notAfter=" + dateUtcOpenssl(cert.fin)); }
		else if (a === "-startdate") lignes.push("notBefore=" + dateUtcOpenssl(cert.debut));
		else if (a === "-enddate") lignes.push("notAfter=" + dateUtcOpenssl(cert.fin));
		else if (a === "-serial") lignes.push("serial=" + cert.serie.toUpperCase());
		else if (a === "-fingerprint"){
			var sha1 = args.indexOf("-sha1") > -1 || args.indexOf("-sha256") === -1;
			var emp = sha256(cert.pem).toUpperCase().substring(0, sha1 ? 40 : 64).replace(/(..)(?!$)/g, "$1:");
			lignes.push((sha1 ? "SHA1" : "sha256") + " Fingerprint=" + emp);
		}
		else if (a === "-text") lignes.push(texteCertificatComplet(cert));
		else if (a === "-pubkey") lignes.push(blocPem("PUBLIC KEY", String.fromCharCode(0x30, 0x82, 0x01, 0x22) + "terminus-pub:" + cert.cle));
		else if (a === "-noout" || a === "-sha256" || a === "-sha1" || a === "-md5" || a === "x509") continue;
		else if (a.charAt(0) === "-") throw new ShellError("x509: Unknown option or message digest: " + a.substring(1) + "\nx509: Use -help for summary.");
	}
	var expire = maintenantGuet() > cert.fin;
	if (checkend !== undefined){
		var secondes = parseInt(checkend, 10);
		if (isNaN(secondes)) throw new ShellError("x509: Invalid number \"" + checkend + "\" for option -checkend");
		var vaExpirer = maintenantGuet().getTime() + secondes * 1000 > cert.fin.getTime();
		lignes.push(vaExpirer ? "Certificate will expire" : "Certificate will not expire");
		if (vaExpirer) io.code = 1;
	}
	if (args.indexOf("-noout") === -1) lignes.push(cert.pem);
	GameEvents.fire({ type: "x509", fichier: fichier || null, options: args.filter(function(a){ return a.charAt(0) === "-"; }), expire: expire, checkend: checkend === undefined ? null : !!io.code });
	var texteSortie = lignes.join("\n");
	if (io.tty && expire && /notAfter=/.test(texteSortie)) texteSortie += astuce(io, "notAfter est passé : ce certificat a expiré. Tout navigateur, tout curl le refusera.");
	return texteSortie;
}

function opensslSClient(args, io, avant){
	var cible = valeurOption(args, "-connect");
	if (!cible){
		var reste = args.filter(function(a, i){ return i > 0 && a.charAt(0) !== "-" && args[i - 1].charAt(0) !== "-"; });
		cible = reste[0];
	}
	var mc = cible ? /^([^:]+):(\d+)$/.exec(cible) : null;
	var h = mc ? (mc[1] === "localhost" || mc[1] === "127.0.0.1" ? hoteIci() : hoteDepuisCible(mc[1])) : null;
	if (!mc || !h || !machineGardee(h) || !apacheInstalle(h)) return avant.call(this, args, io);
	var port = +mc[2], nom = valeurOption(args, "-servername") || mc[1];
	var versions = ["TLSv1.2", "TLSv1.3"], demande = null;
	[["-tls1", "TLSv1"], ["-tls1_1", "TLSv1.1"], ["-tls1_2", "TLSv1.2"], ["-tls1_3", "TLSv1.3"]].forEach(function(x){ if (args.indexOf(x[0]) > -1){ versions = [x[1]]; demande = x[1]; } });
	[["-no_tls1_3", "TLSv1.3"], ["-no_tls1_2", "TLSv1.2"]].forEach(function(x){ if (args.indexOf(x[0]) > -1) versions = versions.filter(function(v){ return v !== x[1]; }); });
	var bref = args.indexOf("-brief") > -1;
	var cfg = apacheActive(h), s = serviceApache(h) || assurerService(h, "apache2");
	var errId = "40C7B1E2A07F0000";
	function evenement(ok, negocie, verif, cert){ GameEvents.fire({ type: "s_client", hote: h, port: port, protocole: demande, negocie: negocie, ok: ok, verification: verif, certificat: cert ? cert.sujet : null }); }
	if (!s || !s.actif || !cfg || cfg.listen.indexOf(port) === -1 || !portJoignable(hoteIci(), h, port)){
		evenement(false, null, null, null);
		throw new ShellError(errId + ":error:8000006F:system library:BIO_connect:Connection refused:../crypto/bio/bio_sock2.c:114:calling connect()\n" +
			errId + ":error:10000067:BIO routines:BIO_connect:connect error:../crypto/bio/bio_sock2.c:116:\nconnect:errno=111");
	}
	var p = poigneeTls(h, cfg, port, nom, versions);
	if (p.erreur === "version"){
		evenement(false, null, null, null);
		io.err(errId + ":error:0A00010B:SSL routines:ssl3_get_record:wrong version number:../ssl/record/ssl3_record.c:354:");
		io.code = 1;
		return "CONNECTED(00000003)\n---\nno peer certificate available\n---\nNo client certificate CA names sent\n---\nSSL handshake has read 5 bytes and written 289 bytes\nVerification: OK\n---\n" +
			"New, (NONE), Cipher is (NONE)\nSecure Renegotiation IS NOT supported\nCompression: NONE\nExpansion: NONE\nNo ALPN negotiated\nEarly data was not sent\nVerify return code: 0 (ok)\n---" +
			astuce(io, "Ce port ne parle pas TLS : pas de certificat à montrer.");
	}
	if (p.erreur === "protocole"){
		evenement(false, null, null, null);
		io.err(errId + ":error:0A00042E:SSL routines:ssl3_read_bytes:tlsv1 alert protocol version:../ssl/record/rec_layer_s3.c:1586:SSL alert number 70");
		io.code = 1;
		return "CONNECTED(00000003)\n---\nno peer certificate available\n---\nNo client certificate CA names sent\n---\nSSL handshake has read 7 bytes and written 230 bytes\nVerification: OK\n---\n" +
			"New, (NONE), Cipher is (NONE)\nSecure Renegotiation IS NOT supported\nCompression: NONE\nExpansion: NONE\nNo ALPN negotiated\nEarly data was not sent\nVerify return code: 0 (ok)\n---" +
			astuce(io, "Refusé : le serveur n'accepte pas " + (demande || "ces versions") + " (alerte « protocol version »). Il accepte : " + (p.serveur.join(", ") || "rien") + ". C'est exactement ce qu'on veut pour les vieilles versions.");
	}
	var cert = p.cert, verdict = cert ? verifierCertificat(cert, nom) : { code: 21, texte: "unable to verify the first certificate" };
	evenement(true, p.version, verdict.code, cert);
	if (bref){
		return "CONNECTION ESTABLISHED\nProtocol version: " + p.version + "\nCiphersuite: " + CHIFFRES_TLS[p.version] + "\nPeer certificate: " + (cert ? cert.sujet : "") +
			"\nHash used: SHA256\nSignature type: RSA-PSS\nVerification" + (verdict.code === 0 ? ": OK" : " error: " + verdict.texte) + "\nServer Temp Key: X25519, 253 bits\nDONE";
	}
	var lignes = ["CONNECTED(00000003)"];
	if (cert){
		if (verdict.code === 0){
			lignes.push("depth=1 " + cert.emetteur, "verify return:1", "depth=0 " + cert.sujet, "verify return:1");
		} else {
			if (AUTORITES_GUET.indexOf(cert.emetteur) > -1 && cert.emetteur !== cert.sujet) lignes.push("depth=1 " + cert.emetteur, "verify return:1");
			lignes.push("depth=0 " + cert.sujet, "verify error:num=" + verdict.code + ":" + verdict.texte);
			if (verdict.code === 10) lignes.push("notAfter=" + dateUtcOpenssl(cert.fin));
			if (verdict.code === 9) lignes.push("notBefore=" + dateUtcOpenssl(cert.debut));
			lignes.push("verify return:1", "depth=0 " + cert.sujet);
			if (verdict.code === 10) lignes.push("notAfter=" + dateUtcOpenssl(cert.fin));
			lignes.push("verify return:1");
		}
		lignes.push("---", "Certificate chain", " 0 s:" + cert.sujet, "   i:" + cert.emetteur, "   a:PKEY: " + (/^rsa/.test(cert.algo) ? "rsaEncryption, " + (cert.algo.split(":")[1] || "2048") + " (bit); sigalg: RSA-SHA256" : "ED25519, 256 (bit); sigalg: ED25519"),
			"   v:NotBefore: " + dateUtcOpenssl(cert.debut) + "; NotAfter: " + dateUtcOpenssl(cert.fin), "---", "Server certificate", cert.pem, "subject=" + cert.sujet, "issuer=" + cert.emetteur);
	} else lignes.push("---", "no peer certificate available");
	lignes.push("---", "No client certificate CA names sent", "Peer signing digest: SHA256", "Peer signature type: RSA-PSS", "Server Temp Key: X25519, 253 bits", "---",
		"SSL handshake has read 1520 bytes and written " + (p.version === "TLSv1.3" ? 389 : 446) + " bytes", "Verification" + (verdict.code === 0 ? ": OK" : " error: " + verdict.texte), "---",
		"New, " + (p.version === "TLSv1.3" ? "TLSv1.3" : "TLSv1/SSLv3") + ", Cipher is " + CHIFFRES_TLS[p.version], "Server public key is " + (cert && /^rsa/.test(cert.algo) ? (cert.algo.split(":")[1] || "2048") : "256") + " bit",
		"Secure Renegotiation IS " + (p.version === "TLSv1.3" ? "NOT " : "") + "supported", "Compression: NONE", "Expansion: NONE", "No ALPN negotiated",
		p.version === "TLSv1.3" ? "Early data was not sent" : "SSL-Session:", "Verify return code: " + verdict.code + " (" + verdict.texte + ")", "---");
	if (p.version !== "TLSv1.3"){
		var k = lignes.indexOf("SSL-Session:");
		lignes.splice(k + 1, 0, "    Protocol  : " + p.version, "    Cipher    : " + CHIFFRES_TLS[p.version], "    Session-ID: " + hexDe("session:" + h + p.version, 64).toUpperCase(),
			"    Master-Key: " + hexDe("maitre:" + h, 96).toUpperCase(), "    Start Time: " + Math.floor(maintenantGuet().getTime() / 1000), "    Timeout   : 7200 (sec)", "    Verify return code: " + verdict.code + " (" + verdict.texte + ")");
	} else {
		lignes.push("Post-Handshake New Session Ticket arrived:", "SSL-Session:", "    Protocol  : TLSv1.3", "    Cipher    : TLS_AES_256_GCM_SHA384", "    Session-ID: " + hexDe("session:" + h, 64).toUpperCase(),
			"    Start Time: " + Math.floor(maintenantGuet().getTime() / 1000), "    Timeout   : 7200 (sec)", "    Verify return code: " + verdict.code + " (" + verdict.texte + ")", "---");
	}
	lignes.push("DONE");
	var texte = lignes.join("\n");
	if (io.tty) texte += astuce(io, "Négocié : " + p.version + ". " + (verdict.code === 10 ? "Le certificat servi a expiré (Verify return code 10)." : (verdict.code === 0 ? "Certificat vérifié." : "Vérification : " + verdict.texte + ".")) +
		" Pour essayer une version précise : -tls1_1, -tls1_2, -tls1_3.");
	return texte;
}

function lireSujet(subj){
	if (!subj) return null;
	if (subj.charAt(0) !== "/") return null;
	return subj.substring(1).split("/").filter(Boolean).map(function(x){ var k = x.indexOf("="); return x.substring(0, k) + " = " + x.substring(k + 1); }).join(", ");
}
function opensslReq(args, io){
	var x509 = args.indexOf("-x509") > -1, nouvelle = valeurOption(args, "-newkey"), cleExistante = valeurOption(args, "-key");
	var sortieCle = valeurOption(args, "-keyout"), sortie = valeurOption(args, "-out"), jours = parseInt(valeurOption(args, "-days") || "30", 10);
	var sansMdp = args.indexOf("-nodes") > -1 || args.indexOf("-noenc") > -1, subj = valeurOption(args, "-subj"), ext = valeurOption(args, "-addext");
	var sujet = lireSujet(subj);
	if (subj !== undefined && !sujet) throw new ShellError("req: Subject or issuer missing: name is expected to be in the format /type0=value0/type1=value1/type2=... where characters may be escaped by \\.");
	if (!sujet) throw new ShellError("You are about to be asked to enter information that will be incorporated\ninto your certificate request." +
		astuce(io, "Ici, donne le sujet d'un coup avec -subj, par exemple : -subj \"/C=FR/O=Cybersup/CN=bastion\""));
	if (!nouvelle && !cleExistante) throw new ShellError("req: no -newkey or -key given" + astuce(io, "Exemple : openssl req -x509 -newkey rsa:2048 -days 365 -nodes -keyout bastion.key -out bastion.pem -subj \"/CN=bastion\""));
	if (isNaN(jours) || jours <= 0) throw new ShellError("req: Invalid number \"" + valeurOption(args, "-days") + "\" for option -days");
	var algo = nouvelle ? nouvelle.toLowerCase() : null;
	if (algo && !/^(rsa(:\d+)?|ed25519|ec)$/.test(algo)) throw new ShellError("req: Unknown algorithm " + nouvelle);
	if (algo === "rsa") algo = "rsa:2048";
	var id;
	if (cleExistante){
		var lue = lireCle(Shell.objetLisible(cleExistante, io, "openssl").item.getText());
		if (!lue || lue.inconnu) throw new ShellError("Could not read private key from " + cleExistante);
		id = lue.id;
		algo = lue.algo;
	} else id = hexDe("cle-joueur:" + sujet + ":" + Date.now() + ":" + Math.random(), 16);
	var san = [];
	var cn = (/CN = ([^,]+)$/.exec(sujet) || [])[1];
	if (ext && /subjectAltName\s*=/.test(ext)) san = ext.replace(/^.*?=/, "").split(",").map(function(x){ return x.trim().replace(/^DNS:/, ""); });
	else if (cn) san = [cn];
	var debut = maintenantGuet(), fin = new Date(debut.getTime() + jours * 86400000);
	function produire(motDePasse){
		var progres = /^rsa/.test(algo || "") && nouvelle ? "..+....+...+..+.+......+.....+++++++++++++++++++++++++++++++++++++++*.+....+..+...+++++++\n" +
			".+++++++++++++++++++++++++++++++++++++++*..+.....+.+.........+++++++\n-----" : "-----";
		var texteCle = fabriquerCle(id, algo || "rsa:2048");
		if (motDePasse) texteCle = texteCle.replace(/PRIVATE KEY/g, "ENCRYPTED PRIVATE KEY");
		if (nouvelle){
			if (sortieCle) ecrireFichier(sortieCle, texteCle, io, "openssl", { mode: "rw-------" });
		}
		var pem;
		if (x509) pem = fabriquerCertificat({ sujet: sujet, emetteur: sujet, debut: debut, fin: fin, san: san, algo: algo || "rsa:2048", cle: id });
		else pem = blocPem("CERTIFICATE REQUEST", String.fromCharCode(0x30, 0x82, 0x02, 0x9a) + "terminus-csr:" + asciiJson({ sujet: sujet, cle: id }));
		if (sortie) ecrireFichier(sortie, pem, io, "openssl");
		GameEvents.fire({ type: "opensslReq", cle: sortieCle || null, certificat: sortie || null, jours: jours, sujet: sujet, x509: x509 });
		return { progres: progres, pem: pem, cleTexte: nouvelle && !sortieCle ? texteCle : null };
	}
	if (sansMdp || !nouvelle){
		var r = produire(null);
		io.err(r.progres);
		return (r.cleTexte ? r.cleTexte + "\n" : "") + (sortie ? "" : r.pem);
	}
	term.demander("Enter PEM pass phrase:", true, function(un){
		term.demander("Verifying - Enter PEM pass phrase:", true, function(deux){
			if (un !== deux){ term.echo("Verify failure\nbad password read"); Shell.fin(); return; }
			if (un.length < 4){ term.echo("bad password read\nphrase is too short, needs to be at least 4 chars"); Shell.fin(); return; }
			try {
				var r2 = produire(un);
				term.echo(r2.progres);
				if (!sortie) term.echo(r2.pem);
			} catch (e){ if (e instanceof ShellError) term.echo(e.message); else throw e; }
			Shell.fin();
		});
	});
	return "";
}

var OPENSSL_AVANT_GUET = Shell.sorts.openssl;
Shell.sorts.openssl = function(args, io){
	var sous = args[0];
	if (sous === "x509") return opensslX509.call(this, args, io, OPENSSL_AVANT_GUET);
	if (sous === "s_client") return opensslSClient.call(this, args, io, OPENSSL_AVANT_GUET);
	if (sous === "req") return opensslReq(args, io);
	return OPENSSL_AVANT_GUET.apply(this, arguments);
};

/* ================================================================== */
/* Capacités : getcap, setcap                                           */
/* ================================================================== */

var CAPACITES_LINUX = ["chown", "dac_override", "dac_read_search", "fowner", "fsetid", "kill", "setgid", "setuid", "setpcap", "linux_immutable",
	"net_bind_service", "net_broadcast", "net_admin", "net_raw", "ipc_lock", "ipc_owner", "sys_module", "sys_rawio", "sys_chroot", "sys_ptrace",
	"sys_pacct", "sys_admin", "sys_boot", "sys_nice", "sys_resource", "sys_time", "sys_tty_config", "mknod", "lease", "audit_write", "audit_control",
	"setfcap", "mac_override", "mac_admin", "syslog", "wake_alarm", "block_suspend", "audit_read", "perfmon", "bpf", "checkpoint_restore"];
/* « cap_net_bind_service=+ep », « cap_setuid,cap_setgid+eip » : la forme normalisée de getcap (cap_setgid,cap_setuid=ep), ou null. */
function lireCapacites(texte){
	var groupes = String(texte).trim().split(/\s+/), resultat = {};
	for (var g = 0; g < groupes.length; g++){
		var m = /^([a-z_,]+)((?:[=+-][eip]*)+)$/i.exec(groupes[g]);
		if (!m) return null;
		var noms = m[1].toLowerCase().split(","), ops = m[2].toLowerCase().match(/[=+-][eip]*/g);
		var cibles = [];
		for (var i = 0; i < noms.length; i++){
			var n = noms[i].replace(/^cap_/, "");
			if (n === "all"){ cibles = cibles.concat(CAPACITES_LINUX); continue; }
			if (CAPACITES_LINUX.indexOf(n) === -1) return null;
			cibles.push(n);
		}
		cibles.forEach(function(n){
			ops.forEach(function(op){
				var lettres = op.substring(1), actuel = resultat[n] || "";
				if (op.charAt(0) === "=") actuel = lettres;
				else if (op.charAt(0) === "+") lettres.split("").forEach(function(l){ if (actuel.indexOf(l) === -1) actuel += l; });
				else lettres.split("").forEach(function(l){ actuel = actuel.replace(l, ""); });
				resultat[n] = actuel.split("").sort(function(a, b){ return "eip".indexOf(a) - "eip".indexOf(b); }).join("");
			});
		});
	}
	var parDrapeaux = {};
	Object.keys(resultat).filter(function(n){ return resultat[n]; }).sort(function(a, b){ return CAPACITES_LINUX.indexOf(a) - CAPACITES_LINUX.indexOf(b); })
		.forEach(function(n){ (parDrapeaux[resultat[n]] = parDrapeaux[resultat[n]] || []).push("cap_" + n); });
	var morceaux = Object.keys(parDrapeaux).map(function(d){ return parDrapeaux[d].join(",") + "=" + d; });
	return morceaux.length ? morceaux.join(" ") : "";
}
function parcourirHote(h, lieu, chemin, rappel, garde){
	garde = garde || { n: 0 };
	if (garde.n++ > 3000) return;
	lieu.items.forEach(function(it){ rappel(it, (chemin === "/" ? "" : chemin) + "/" + it.itemname, lieu); });
	lieu.children.forEach(function(enfant){
		if (enfant.parents[0] === lieu) parcourirHote(h, enfant, (chemin === "/" ? "" : chemin) + "/" + enfant.room_name, rappel, garde);
	});
}
Shell.sorts.getcap = function(args, io){
	var recursif = false, cibles = [];
	args.forEach(function(a){ if (a === "-r") recursif = true; else if (a === "-v" || a === "-n") return; else if (a.charAt(0) === "-") throw new ShellError("usage: getcap [-h] [-l] [-n] [-r] [-v] <filename> [<filename> ...]\n\n\tdisplays the capabilities on the queried file(s)."); else cibles.push(a); });
	if (!cibles.length) throw new ShellError("usage: getcap [-h] [-l] [-n] [-r] [-v] <filename> [<filename> ...]\n\n\tdisplays the capabilities on the queried file(s).");
	var lignes = [], trouves = [], h = hoteIci();
	cibles.forEach(function(c){
		var r = Shell.chercher(c, io, "getcap");
		if (r.node === null){ io.err("Failed to get capabilities of file '" + c + "' (No such file or directory)"); io.code = 1; return; }
		var base = c.replace(/\/$/, "") || "/";
		if (r.node instanceof Room){
			if (!recursif) return;
			parcourirHote(h, r.node, base, function(it, chemin){ if (it.capacites && !it.lien){ lignes.push(chemin + " " + it.capacites); trouves.push(chemin); } });
		} else if (r.node.capacites && !r.node.lien){ lignes.push(c + " " + r.node.capacites); trouves.push(c); }
	});
	GameEvents.fire({ type: "getcap", hote: h, chemins: cibles, trouves: trouves });
	return lignes.join("\n");
};
Shell.sorts.setcap = function(args, io){
	var usage = "usage: setcap [-h] [-q] [-v] [-n <rootid>] (-r|-|<caps>) <filename> [ ... (-r|-|<capsN>) <filenameN> ]\n\n Note <filename> must be a regular (non-symlink) file.";
	var a = args.filter(function(x){ return x !== "-q" && x !== "-v"; });
	if (a.length < 2) throw new ShellError(usage);
	var h = hoteIci(), sorties = [];
	for (var i = 0; i + 1 < a.length; i += 2){
		var caps = a[i], fichier = a[i + 1];
		var normal = caps === "-r" ? "" : lireCapacites(caps);
		if (normal === null) throw new ShellError("fatal error: Invalid argument\n" + usage);
		var r = Shell.chercher(fichier, io, "setcap");
		if (r.node === null) throw new ShellError("Failed to set capabilities on file `" + fichier + "' (No such file or directory)");
		if (r.node instanceof Room || r.node.lien) throw new ShellError("Failed to set capabilities on file `" + fichier + "' (Invalid argument)\nThe value of the capability argument is not permitted for a file. Or the file is not a regular (non-symlink) file");
		if (!io.sudo) throw new ShellError("unable to set CAP_SETFCAP effective capability: Operation not permitted" + astuce(io, "Poser ou retirer une capacité est réservé à root : sudo setcap ..."));
		if (r.node.immuable) Shell.verifierImmuable(r.node, "setcap");
		if (normal === "") delete r.node.capacites; else r.node.capacites = normal;
		GameEvents.fire({ type: "setcap", hote: h, chemin: fichier, item: r.node, capacites: normal, retire: normal === "" });
	}
	return sorties.join("\n");
};

/* ================================================================== */
/* Montages : mount, findmnt, et noexec appliqué par le moteur          */
/* ================================================================== */

var MONTAGES_VIRTUELS = [
	{ source: "sysfs", cible: "/sys", type: "sysfs", options: ["rw", "nosuid", "nodev", "noexec", "relatime"] },
	{ source: "proc", cible: "/proc", type: "proc", options: ["rw", "nosuid", "nodev", "noexec", "relatime"] },
	{ source: "udev", cible: "/dev", type: "devtmpfs", options: ["rw", "nosuid", "relatime", "size=1966420k", "nr_inodes=491605", "mode=755", "inode64"] },
	{ source: "devpts", cible: "/dev/pts", type: "devpts", options: ["rw", "nosuid", "noexec", "relatime", "gid=5", "mode=620", "ptmxmode=000"] },
	{ source: "tmpfs", cible: "/run", type: "tmpfs", options: ["rw", "nosuid", "nodev", "noexec", "relatime", "size=401060k", "mode=755", "inode64"] },
	{ source: "tmpfs", cible: "/dev/shm", type: "tmpfs", options: ["rw", "nosuid", "nodev", "inode64"] }
];
/* Les lignes de /etc/fstab : { source, cible, type, options (texte), ligne } et les erreurs. */
function lireFstab(h){
	var texte = lireFichierHote(h, "/etc/fstab"), entrees = [], erreurs = [];
	if (texte === null) return { entrees: entrees, erreurs: erreurs, absent: true };
	lignesConf(texte).forEach(function(l){
		var c = l.texte.trim().split(/\s+/);
		if (c.length < 4 && !(c.length === 3)){ erreurs.push("mount: /etc/fstab: parse error at line " + l.n + " -- ignored"); return; }
		entrees.push({ source: c[0], cible: c[1], type: c[2], options: c[3] || "defaults", ligne: l.n });
	});
	return { entrees: entrees, erreurs: erreurs };
}
/* Les options telles que le noyau les affiche : rw, nosuid, nodev, noexec, relatime, puis les options propres. */
function optionsNoyau(liste, type){
	var drapeaux = { ro: false, nosuid: false, nodev: false, noexec: false, temps: "relatime", sync: false }, propres = [];
	liste.forEach(function(o){
		o = o.trim();
		if (!o) return;
		var cle = o.split("=")[0];
		if (o === "ro") drapeaux.ro = true;
		else if (o === "rw") drapeaux.ro = false;
		else if (o === "nosuid") drapeaux.nosuid = true; else if (o === "suid") drapeaux.nosuid = false;
		else if (o === "nodev") drapeaux.nodev = true; else if (o === "dev") drapeaux.nodev = false;
		else if (o === "noexec") drapeaux.noexec = true; else if (o === "exec") drapeaux.noexec = false;
		else if (o === "noatime" || o === "relatime" || o === "strictatime") drapeaux.temps = o;
		else if (o === "sync") drapeaux.sync = true; else if (o === "async") drapeaux.sync = false;
		else if (o === "defaults"){ drapeaux.ro = false; drapeaux.nosuid = false; drapeaux.nodev = false; drapeaux.noexec = false; }
		else if (["auto", "noauto", "user", "nouser", "users", "_netdev", "nofail", "remount", "x-systemd.automount"].indexOf(cle) > -1 || /^x-/.test(cle)) return;
		else {
			propres = propres.filter(function(p){ return p.split("=")[0] !== cle; });
			propres.push(o);
		}
	});
	var sortie = [drapeaux.ro ? "ro" : "rw"];
	if (drapeaux.sync) sortie.push("sync");
	if (drapeaux.nosuid) sortie.push("nosuid");
	if (drapeaux.nodev) sortie.push("nodev");
	if (drapeaux.noexec) sortie.push("noexec");
	if (drapeaux.temps !== "strictatime") sortie.push(drapeaux.temps);
	if (type === "tmpfs" && !propres.some(function(p){ return /^inode/.test(p); })) propres.push("inode64");
	return sortie.concat(propres);
}
function sourceAffichee(spec, index){
	if (/^\/dev\//.test(spec) || spec === "tmpfs" || spec === "none" || spec.indexOf(":") > 0) return spec === "none" ? "none" : spec;
	if (/^(UUID|LABEL|PARTUUID)=/.test(spec)) return "/dev/sda" + (index + 1);
	return spec;
}
function montagesDemarrage(h){
	var f = lireFstab(h), liste = [], racineVue = false, k = 0;
	f.entrees.forEach(function(e){
		if (e.type === "swap" || e.cible === "none" || /(^|,)noauto(,|$)/.test(e.options)) return;
		if (e.cible === "/") racineVue = true;
		liste.push({ source: sourceAffichee(e.source, e.type === "tmpfs" ? -1 : k++), cible: e.cible, type: e.type, options: optionsNoyau(e.options.split(","), e.type), id: e.cible === "/" ? 1 : 30 + liste.length });
	});
	if (!racineVue) liste.unshift({ source: "/dev/sda1", cible: "/", type: "ext4", options: ["rw", "relatime", "errors=remount-ro"], id: 1 });
	return MONTAGES_VIRTUELS.map(function(m){ return JSON.parse(JSON.stringify(m)); }).concat(liste).sort(function(a, b){ return a.cible === "/" ? -1 : (b.cible === "/" ? 1 : 0); });
}
function montages(h){ return machineGardee(h) ? (etatHote(h).montages || []) : []; }
/* Le montage qui contient un chemin (le plus long préfixe). */
function montagePour(h, chemin){
	var meilleur = null;
	montages(h).forEach(function(m){
		var c = m.cible === "/" ? "/" : m.cible.replace(/\/$/, "");
		if (chemin === c || c === "/" || chemin.indexOf(c + "/") === 0){ if (!meilleur || c.length > meilleur.cible.length) meilleur = m; }
	});
	return meilleur;
}

/* ./script dans un dossier monté noexec : Permission denied, comme le noyau. (bash script le lit, et marche encore.) */
var LANCER_SCRIPT_AVANT_GUET = Shell.lancerScript;
Shell.lancerScript = function(chemin, io, direct, args, options){
	if (direct){
		var h = hoteIci();
		if (machineGardee(h)){
			var r = null;
			try { r = Shell.chercher(chemin, io, "bash"); } catch (e){ r = null; }
			if (r && r.node instanceof Item){
				var complet = cheminDeLieu(r.dir) + "/" + r.node.itemname;
				var m = montagePour(h, complet);
				if (m && m.options.indexOf("noexec") > -1){
					GameEvents.fire({ type: "noexec", hote: h, chemin: complet });
					throw new ShellError("-bash: " + chemin + ": Permission denied" + astuce(io, m.cible + " est monté avec l'option noexec : rien ne s'y exécute directement, même avec le droit x. C'est voulu : un dossier où tout le monde écrit ne doit pas servir de rampe de lancement."), 126);
				}
			}
		}
	}
	return LANCER_SCRIPT_AVANT_GUET.apply(this, arguments);
};

Shell.sorts.mount = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) throw new ShellError("mount : ici, ta Maison n'est pas un vrai système de fichiers." + astuce(io, "mount sert sur les machines du réseau : ssh vers l'une d'elles."));
	var e = etatHote(h), options = null, type = null, mots = [], tout = false, liste = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-o" || a === "--options"){ options = args[++i]; if (options === undefined) throw new ShellError("mount: option requires an argument -- 'o'"); continue; }
		if (/^-o./.test(a)){ options = a.substring(2); continue; }
		if (a === "-t" || a === "--types"){ type = args[++i]; continue; }
		if (a === "-a" || a === "--all"){ tout = true; continue; }
		if (a === "-l" || a === "--show-labels" || a === "-v" || a === "--verbose"){ liste = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("mount: invalid option -- '" + a.replace(/^-+/, "") + "'\nTry 'mount --help' for more information.");
		mots.push(a);
	}
	if (!mots.length && !tout && options === null){
		GameEvents.fire({ type: "mount", hote: h, action: "list" });
		return e.montages.filter(function(m){ return !type || m.type === type; }).map(function(m){ return m.source + " on " + m.cible + " type " + m.type + " (" + m.options.join(",") + ")"; }).join("\n");
	}
	if (!io.sudo) throw new ShellError("mount: " + (mots[mots.length - 1] || "/") + ": must be superuser to use mount." + astuce(io, "Monter ou remonter est réservé à root : sudo mount ..."), 32);
	var f = lireFstab(h);
	f.erreurs.forEach(function(x){ io.err(x); });
	if (tout){
		f.entrees.forEach(function(en){
			if (en.type === "swap" || en.cible === "none" || /(^|,)noauto(,|$)/.test(en.options)) return;
			if (e.montages.some(function(m){ return m.cible === en.cible; })) return;
			if (!dossierHoteGuet(h, en.cible)){ io.err("mount: " + en.cible + ": mount point does not exist."); io.code = 32; return; }
			e.montages.push({ source: sourceAffichee(en.source, -1), cible: en.cible, type: en.type, options: optionsNoyau(en.options.split(","), en.type) });
		});
		GameEvents.fire({ type: "mount", hote: h, action: "all" });
		return "";
	}
	var demandees = (options || "").split(",").filter(Boolean);
	var cible = mots[mots.length - 1];
	if (cible && cible !== "/") cible = cible.replace(/\/$/, "");
	if (demandees.indexOf("remount") > -1){
		var m = e.montages.filter(function(x){ return x.cible === cible || x.source === cible; })[0];
		if (!m) throw new ShellError("mount: " + cible + ": mount point not mounted or bad option." + astuce(io, cible + " n'est pas un montage à part : il fait partie de /. Ajoute sa ligne dans /etc/fstab, puis sudo mount " + cible + " (ou mount -a)."), 32);
		var fs = f.entrees.filter(function(x){ return x.cible === m.cible; })[0];
		var base = fs ? fs.options.split(",") : m.options.slice();
		m.options = optionsNoyau(base.concat(demandees.filter(function(o){ return o !== "remount"; })), m.type);
		GameEvents.fire({ type: "mount", hote: h, action: "remount", cible: m.cible, options: m.options.slice() });
		return "";
	}
	if (mots.length === 1){
		var deja = e.montages.filter(function(x){ return x.cible === cible; })[0];
		var ligne = f.entrees.filter(function(x){ return x.cible === cible || x.source === cible; })[0];
		if (!ligne) throw new ShellError("mount: " + cible + ": can't find in /etc/fstab.", 1);
		if (deja) throw new ShellError("mount: " + ligne.cible + ": " + ligne.source + " already mounted on " + ligne.cible + ".", 32);
		if (!dossierHoteGuet(h, ligne.cible)) throw new ShellError("mount: " + ligne.cible + ": mount point does not exist.", 32);
		e.montages.push({ source: sourceAffichee(ligne.source, -1), cible: ligne.cible, type: ligne.type, options: optionsNoyau(ligne.options.split(",").concat(demandees), ligne.type) });
		GameEvents.fire({ type: "mount", hote: h, action: "mount", cible: ligne.cible, options: demandees });
		return "";
	}
	if (mots.length === 2){
		var dest = mots[1].replace(/\/$/, "") || "/";
		if (!dossierHoteGuet(h, dest)) throw new ShellError("mount: " + dest + ": mount point does not exist.", 32);
		if (e.montages.some(function(x){ return x.cible === dest; })) throw new ShellError("mount: " + dest + ": " + mots[0] + " already mounted on " + dest + ".", 32);
		var t = type || (mots[0] === "tmpfs" ? "tmpfs" : null);
		if (!t) throw new ShellError("mount: " + dest + ": special device " + mots[0] + " does not exist.", 32);
		e.montages.push({ source: mots[0], cible: dest, type: t, options: optionsNoyau(demandees, t) });
		GameEvents.fire({ type: "mount", hote: h, action: "mount", cible: dest, options: demandees });
		return "";
	}
	throw new ShellError("mount: bad usage\nTry 'mount --help' for more information.");
};

Shell.sorts.findmnt = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) throw new ShellError("findmnt : ici, ta Maison n'est pas un vrai système de fichiers." + astuce(io, "findmnt sert sur les machines du réseau."));
	var sansTitre = false, colonnes = ["TARGET", "SOURCE", "FSTYPE", "OPTIONS"], fstab = false, liste = false, cibles = [], parChemin = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-n" || a === "--noheadings") sansTitre = true;
		else if (a === "-o" || a === "--output"){ colonnes = (args[++i] || "").toUpperCase().split(","); }
		else if (/^--output=/.test(a)) colonnes = a.substring(9).toUpperCase().split(",");
		else if (a === "-s" || a === "--fstab") fstab = true;
		else if (a === "-l" || a === "--list") liste = true;
		else if (a === "-T" || a === "--target"){ parChemin = true; cibles.push(args[++i]); }
		else if (/^-[nls]+$/.test(a)){ if (a.indexOf("n") > -1) sansTitre = true; if (a.indexOf("l") > -1) liste = true; if (a.indexOf("s") > -1) fstab = true; }
		else if (a.charAt(0) === "-") throw new ShellError("findmnt: invalid option -- '" + a.replace(/^-+/, "") + "'\nTry 'findmnt --help' for more information.");
		else cibles.push(a);
	}
	var valides = ["TARGET", "SOURCE", "FSTYPE", "OPTIONS"];
	colonnes.forEach(function(c){ if (valides.indexOf(c) === -1) throw new ShellError("findmnt: unknown column: " + c); });
	var entrees;
	if (fstab){
		entrees = lireFstab(h).entrees.map(function(x){ return { cible: x.cible, source: x.source, type: x.type, options: x.options.split(",") }; });
	} else entrees = etatHote(h).montages.slice();
	if (cibles.length){
		var c = cibles[0] === "/" ? "/" : String(cibles[0]).replace(/\/$/, "");
		var trouve = entrees.filter(function(m){ return m.cible === c || m.source === c; });
		if (!trouve.length && (parChemin || !fstab)){
			var porteur = fstab ? null : montagePour(h, c);
			trouve = parChemin && porteur ? [porteur] : [];
		}
		entrees = trouve;
		liste = true;
		if (!entrees.length){ io.code = 1; GameEvents.fire({ type: "mount", hote: h, action: "findmnt", cible: c, options: null }); return ""; }
		GameEvents.fire({ type: "mount", hote: h, action: "findmnt", cible: c, options: entrees[0].options.slice() });
	} else GameEvents.fire({ type: "mount", hote: h, action: "findmnt", cible: null });
	var valeur = function(m, col){ return col === "TARGET" ? m.cible : (col === "SOURCE" ? m.source : (col === "FSTYPE" ? m.type : m.options.join(","))); };
	var lignes = entrees.map(function(m, k){
		var cellules = colonnes.map(function(col){ return valeur(m, col); });
		if (!liste && !fstab && colonnes[0] === "TARGET" && m.cible !== "/"){
			var dernier = k === entrees.length - 1;
			cellules[0] = (dernier ? "└─" : "├─") + m.cible;
		}
		return cellules;
	});
	if (!sansTitre) lignes.unshift(colonnes.slice());
	var largeurs = colonnes.map(function(col, j){ return Math.max.apply(null, lignes.map(function(l){ return l[j].length; })); });
	return lignes.map(function(l){ return l.map(function(x, j){ return j === l.length - 1 ? x : completerDroite(x, largeurs[j]); }).join(" "); }).join("\n");
};

/* ================================================================== */
/* Le noyau : sysctl                                                    */
/* ================================================================== */

/* Les réglages du noyau d'une Debian 12 (valeur, et ce qu'on accepte : [min, max] ou null pour du texte). */
var SYSCTL_DEFAUTS = {
	"dev.tty.ldisc_autoload": [1, 0, 1], "fs.protected_fifos": [0, 0, 2], "fs.protected_hardlinks": [0, 0, 1], "fs.protected_regular": [0, 0, 2],
	"fs.protected_symlinks": [0, 0, 1], "fs.suid_dumpable": [0, 0, 2], "kernel.core_uses_pid": [0, 0, 1], "kernel.dmesg_restrict": [0, 0, 1],
	"kernel.kptr_restrict": [0, 0, 2], "kernel.modules_disabled": [0, 0, 1], "kernel.perf_event_paranoid": [3, -1, 4], "kernel.randomize_va_space": [2, 0, 2],
	"kernel.sysrq": [438, 0, 511], "kernel.unprivileged_bpf_disabled": [2, 0, 2], "kernel.yama.ptrace_scope": [0, 0, 3], "kernel.pid_max": [4194304, 301, 4194304],
	"net.core.bpf_jit_harden": [0, 0, 2], "net.ipv4.conf.all.accept_redirects": [1, 0, 1], "net.ipv4.conf.all.accept_source_route": [0, 0, 1],
	"net.ipv4.conf.all.log_martians": [0, 0, 1], "net.ipv4.conf.all.rp_filter": [2, 0, 2], "net.ipv4.conf.all.secure_redirects": [1, 0, 1],
	"net.ipv4.conf.all.send_redirects": [1, 0, 1], "net.ipv4.conf.default.accept_redirects": [1, 0, 1], "net.ipv4.conf.default.accept_source_route": [1, 0, 1],
	"net.ipv4.conf.default.log_martians": [0, 0, 1], "net.ipv4.conf.default.rp_filter": [2, 0, 2], "net.ipv4.conf.default.secure_redirects": [1, 0, 1],
	"net.ipv4.conf.default.send_redirects": [1, 0, 1], "net.ipv4.icmp_echo_ignore_all": [0, 0, 1], "net.ipv4.icmp_echo_ignore_broadcasts": [1, 0, 1],
	"net.ipv4.icmp_ignore_bogus_error_responses": [1, 0, 1], "net.ipv4.ip_forward": [0, 0, 1], "net.ipv4.tcp_rfc1337": [0, 0, 1], "net.ipv4.tcp_syncookies": [1, 0, 2],
	"net.ipv4.tcp_timestamps": [1, 0, 2], "net.ipv6.conf.all.accept_ra": [1, 0, 2], "net.ipv6.conf.all.accept_redirects": [1, 0, 1],
	"net.ipv6.conf.all.disable_ipv6": [0, 0, 1], "net.ipv6.conf.all.forwarding": [0, 0, 1], "net.ipv6.conf.default.accept_ra": [1, 0, 2],
	"net.ipv6.conf.default.accept_redirects": [1, 0, 1], "net.ipv6.conf.default.disable_ipv6": [0, 0, 1], "vm.mmap_min_addr": [65536, 0, 1048576],
	"vm.swappiness": [60, 0, 200]
};
function valeursNoyauDefaut(h){
	var v = {};
	Object.keys(SYSCTL_DEFAUTS).forEach(function(k){ v[k] = String(SYSCTL_DEFAUTS[k][0]); });
	v["kernel.hostname"] = h;
	v["kernel.osrelease"] = versionNoyau(h);
	var d = NOYAUX_GUET[h] && NOYAUX_GUET[h].sysctl;
	if (d) Object.keys(d).forEach(function(k){ v[k] = String(d[k]); });
	return v;
}
var DOSSIERS_SYSCTL = ["/etc/sysctl.d", "/run/sysctl.d", "/usr/local/lib/sysctl.d", "/usr/lib/sysctl.d", "/lib/sysctl.d"];
function fichiersSysctlSysteme(h){
	var vus = {}, liste = [];
	DOSSIERS_SYSCTL.forEach(function(d){
		fichiersDuDossierGuet(h, d, "*.conf").forEach(function(f){ if (!vus[f.nom]){ vus[f.nom] = true; liste.push(f); } });
	});
	liste.sort(function(a, b){ return a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0); });
	if (fichierHoteGuet(h, "/etc/sysctl.conf")) liste.push({ nom: "sysctl.conf", chemin: "/etc/sysctl.conf" });
	return liste;
}
/* Applique une affectation au tableau des valeurs : renvoie null (ok) ou le message d'erreur de sysctl. */
function affecterSysctl(valeurs, cle, valeur){
	cle = cle.replace(/\//g, ".");
	if (!valeurs.hasOwnProperty(cle)) return "sysctl: cannot stat /proc/sys/" + cle.replace(/\./g, "/") + ": No such file or directory";
	var def = SYSCTL_DEFAUTS[cle];
	valeur = String(valeur).trim();
	if (def){
		if (!/^-?\d+$/.test(valeur) || +valeur < def[1] || +valeur > def[2]) return "sysctl: setting key \"" + cle + "\": Invalid argument";
		if (cle === "kernel.modules_disabled" && valeurs[cle] === "1" && valeur === "0") return "sysctl: setting key \"" + cle + "\": Invalid argument";
	} else if (cle === "kernel.osrelease") return "sysctl: setting key \"" + cle + "\": Operation not permitted";
	valeurs[cle] = String(+valeur === +valeur && valeur !== "" ? +valeur : valeur);
	return null;
}
/* Les affectations d'un fichier : [{ cle, valeur, ignorer, ligne }] et les fautes de syntaxe. */
function lireFichierSysctl(texte, chemin, valeursConnues){
	var affectations = [], erreurs = [];
	lignesConf(texte, /^\s*[#;]/).forEach(function(l){
		var t = l.texte.trim(), ignorer = false;
		if (t.charAt(0) === "-"){ ignorer = true; t = t.substring(1); }
		var k = t.indexOf("=");
		if (k === -1){ erreurs.push("sysctl: " + chemin + "(" + l.n + "): invalid syntax, continuing..."); return; }
		var cle = t.substring(0, k).trim().replace(/\//g, "."), valeur = t.substring(k + 1).trim();
		if (/\*/.test(cle) && valeursConnues){
			var re = new RegExp("^" + cle.split("*").map(echappeRegExp).join("[^.]+") + "$");
			Object.keys(valeursConnues).filter(function(x){ return re.test(x); }).forEach(function(x){ affectations.push({ cle: x, valeur: valeur, ignorer: true, ligne: l.n }); });
			return;
		}
		affectations.push({ cle: cle, valeur: valeur, ignorer: ignorer, ligne: l.n });
	});
	return { affectations: affectations, erreurs: erreurs };
}
function sysctlDemarrage(h){
	var v = valeursNoyauDefaut(h);
	if (!dossierHoteGuet(h, "/etc/sysctl.d") && !fichierHoteGuet(h, "/etc/sysctl.conf")) return v;
	fichiersSysctlSysteme(h).forEach(function(f){
		lireFichierSysctl(lireFichierHote(h, f.chemin), f.chemin, v).affectations.forEach(function(a){ affecterSysctl(v, a.cle, a.valeur); });
	});
	return v;
}
var SYSCTL_AVANT_GUET = Shell.sorts.sysctl;
Shell.sorts.sysctl = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h) || !dossierHoteGuet(h, "/etc/sysctl.d")) return SYSCTL_AVANT_GUET.apply(this, arguments);
	var e = etatHote(h), v = e.sysctl;
	var tout = false, nSeul = false, ecrire = false, charger = null, systeme = false, discret = false, ignorerInconnus = false, mots = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--system"){ systeme = true; continue; }
		if (a === "-p" || a === "--load"){ charger = args[i + 1] && args[i + 1].charAt(0) !== "-" ? args[++i] : "/etc/sysctl.conf"; continue; }
		if (/^--load=/.test(a)){ charger = a.substring(7); continue; }
		if (/^-p./.test(a)){ charger = a.substring(2); continue; }
		if (a === "--all" || a === "-A" || a === "-X"){ tout = true; continue; }
		if (a === "--values"){ nSeul = true; continue; }
		if (a === "--write"){ ecrire = true; continue; }
		if (a === "--quiet"){ discret = true; continue; }
		if (/^-[anwqeN]+$/.test(a)){
			if (a.indexOf("a") > -1) tout = true; if (a.indexOf("n") > -1) nSeul = true; if (a.indexOf("w") > -1) ecrire = true;
			if (a.indexOf("q") > -1) discret = true; if (a.indexOf("e") > -1) ignorerInconnus = true;
			continue;
		}
		if (a.charAt(0) === "-") throw new ShellError("sysctl: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nUsage:\n sysctl [options] [variable[=value] ...]\n\nTry 'sysctl --help' for more information.");
		mots.push(a);
	}
	function ligne(cle){ return nSeul ? v[cle] : cle + " = " + v[cle]; }
	var erreurs = [], sorties = [];
	function appliquerFichier(chemin, texte){
		var lu = lireFichierSysctl(texte, chemin, v);
		lu.erreurs.forEach(function(x){ erreurs.push(x); });
		var appliquees = [];
		lu.affectations.forEach(function(af){
			if (!io.sudo){ if (!af.ignorer) erreurs.push("sysctl: permission denied on key \"" + af.cle + "\""); return; }
			var err = affecterSysctl(v, af.cle, af.valeur);
			if (err){ if (!af.ignorer && !(ignorerInconnus && /cannot stat/.test(err))) erreurs.push(err); return; }
			appliquees.push(af.cle);
			if (!discret) sorties.push(ligne(af.cle.replace(/\//g, ".")));
		});
		return appliquees;
	}
	if (systeme){
		var cles = [], fichiers = [];
		fichiersSysctlSysteme(h).forEach(function(f){
			sorties.push("* Applying " + f.chemin + " ...");
			fichiers.push(f.chemin);
			cles = cles.concat(appliquerFichier(f.chemin, lireFichierHote(h, f.chemin)));
		});
		erreurs.forEach(function(x){ io.err(x); });
		if (erreurs.length) io.code = 1;
		GameEvents.fire({ type: "sysctlSystem", hote: h, fichiers: fichiers, cles: cles, sudo: !!io.sudo });
		GameEvents.fire({ type: "sysctl", host: h, hote: h, action: "system", cles: cles });
		if (!io.sudo && io.tty) io.err(C.gris("(Charger des réglages du noyau est réservé à root : sudo sysctl --system)"));
		return sorties.join("\n");
	}
	if (charger !== null){
		var item = null;
		try { var rr = Shell.chercher(charger, io, "sysctl"); item = rr.node instanceof Item ? Shell.suivre(rr.node, "sysctl") : null; } catch (x){ item = null; }
		if (!item || item instanceof Room) throw new ShellError("sysctl: cannot open \"" + charger + "\": No such file or directory");
		var c2 = appliquerFichier(charger, item.getText());
		erreurs.forEach(function(x){ io.err(x); });
		if (erreurs.length) io.code = 1;
		GameEvents.fire({ type: "sysctl", host: h, hote: h, action: "file", cles: c2, fichier: charger });
		return sorties.join("\n");
	}
	if (tout || !mots.length){
		if (!tout) throw new ShellError("\nUsage:\n sysctl [options] [variable[=value] ...]\n\nOptions:\n  -a, --all            display all variables\n  -n, --values         print only values of the given variable(s)\n  -p, --load[=<file>]  read values from file\n  -w, --write          enable writing a value to variable\n      --system         read values from all system directories");
		GameEvents.fire({ type: "sysctl", host: h, hote: h, action: "all", cles: [] });
		return Object.keys(v).sort().map(ligne).join("\n");
	}
	var lues = [];
	mots.forEach(function(m){
		var k = m.indexOf("=");
		if (k > -1){
			var cle = m.substring(0, k).trim().replace(/\//g, "."), valeur = m.substring(k + 1);
			if (!io.sudo){ erreurs.push("sysctl: permission denied on key \"" + cle + "\""); return; }
			var err = affecterSysctl(v, cle, valeur);
			if (err){ erreurs.push(err); return; }
			lues.push(cle);
			if (!discret) sorties.push(ligne(cle));
			GameEvents.fire({ type: "sysctl", host: h, hote: h, action: "write", cles: [cle], valeur: v[cle] });
			return;
		}
		if (ecrire){ erreurs.push("sysctl: \"" + m + "\" must be of the form name=value"); return; }
		var c = m.replace(/\//g, ".");
		if (!v.hasOwnProperty(c)){ if (!ignorerInconnus) erreurs.push("sysctl: cannot stat /proc/sys/" + c.replace(/\./g, "/") + ": No such file or directory"); return; }
		lues.push(c);
		sorties.push(ligne(c));
	});
	if (lues.length) GameEvents.fire({ type: "sysctl", host: h, hote: h, action: "read", cles: lues });
	erreurs.forEach(function(x){ io.err(x); });
	if (erreurs.length) io.code = /permission denied/.test(erreurs[0]) ? 1 : 255;
	var texte = sorties.join("\n");
	if (io.tty && mots.some(function(m){ return m.indexOf("=") > -1; }) && lues.length) texte += astuce(io, "Réglé pour maintenant seulement. Pour que ça tienne au redémarrage : une ligne dans /etc/sysctl.d/NN-nom.conf, puis sudo sysctl --system.");
	return texte;
};

/* ================================================================== */
/* Les modules du noyau : lsmod, modprobe                                */
/* ================================================================== */

/* nom : [taille, chemin dans /lib/modules/VERSION/kernel, dépendances] */
var MODULES_NOYAU = {
	usb_common: [16384, "drivers/usb/common/usb-common.ko", []], usbcore: [348160, "drivers/usb/core/usbcore.ko", ["usb_common"]],
	scsi_common: [16384, "drivers/scsi/scsi_common.ko", []], scsi_mod: [278528, "drivers/scsi/scsi_mod.ko", ["scsi_common"]],
	usb_storage: [81920, "drivers/usb/storage/usb-storage.ko", ["scsi_mod", "usbcore"]], uas: [32768, "drivers/usb/storage/uas.ko", ["usb_storage", "scsi_mod", "usbcore"]],
	sd_mod: [69632, "drivers/scsi/sd_mod.ko", ["scsi_mod"]], libata: [401408, "drivers/ata/libata.ko", ["scsi_mod"]], libahci: [49152, "drivers/ata/libahci.ko", ["libata"]],
	ahci: [49152, "drivers/ata/ahci.ko", ["libahci"]], crc16: [16384, "lib/crc16.ko", []], mbcache: [16384, "fs/mbcache.ko", []], jbd2: [167936, "fs/jbd2/jbd2.ko", []],
	ext4: [1003520, "fs/ext4/ext4.ko", ["mbcache", "jbd2", "crc16"]], failover: [16384, "net/core/failover.ko", []], net_failover: [24576, "drivers/net/net_failover.ko", ["failover"]],
	virtio_net: [69632, "drivers/net/virtio_net.ko", ["net_failover"]], x_tables: [53248, "net/netfilter/x_tables.ko", []], ip_tables: [36864, "net/ipv4/netfilter/ip_tables.ko", ["x_tables"]],
	nfnetlink: [20480, "net/netfilter/nfnetlink.ko", []], libcrc32c: [16384, "lib/libcrc32c.ko", []], nf_tables: [303104, "net/netfilter/nf_tables.ko", ["nfnetlink", "libcrc32c"]],
	dm_mod: [184320, "drivers/md/dm-mod.ko", []], dm_crypt: [61440, "drivers/md/dm-crypt.ko", ["dm_mod"]], cramfs: [24576, "fs/cramfs/cramfs.ko", []],
	freevxfs: [36864, "fs/freevxfs/freevxfs.ko", []], jffs2: [217088, "fs/jffs2/jffs2.ko", []], hfs: [69632, "fs/hfs/hfs.ko", []], hfsplus: [126976, "fs/hfsplus/hfsplus.ko", []],
	squashfs: [77824, "fs/squashfs/squashfs.ko", []], crc_itu_t: [16384, "lib/crc-itu-t.ko", []], udf: [135168, "fs/udf/udf.ko", ["crc_itu_t"]],
	dccp: [126976, "net/dccp/dccp.ko", []], sctp: [462848, "net/sctp/sctp.ko", ["libcrc32c"]], rds: [69632, "net/rds/rds.ko", []],
	udp_tunnel: [32768, "net/ipv4/udp_tunnel.ko", []], ip6_udp_tunnel: [16384, "net/ipv6/ip6_udp_tunnel.ko", []], tipc: [270336, "net/tipc/tipc.ko", ["ip6_udp_tunnel", "udp_tunnel"]],
	rfkill: [36864, "net/rfkill/rfkill.ko", []], ecdh_generic: [16384, "crypto/ecdh_generic.ko", []], bluetooth: [970752, "net/bluetooth/bluetooth.ko", ["ecdh_generic", "rfkill"]],
	btusb: [65536, "drivers/bluetooth/btusb.ko", ["bluetooth", "usbcore"]], firewire_core: [94208, "drivers/firewire/firewire-core.ko", ["crc_itu_t"]],
	firewire_ohci: [53248, "drivers/firewire/firewire-ohci.ko", ["firewire_core"]], floppy: [102400, "drivers/block/floppy.ko", []],
	fat: [94208, "fs/fat/fat.ko", []], vfat: [24576, "fs/fat/vfat.ko", ["fat"]], overlay: [163840, "fs/overlayfs/overlay.ko", []]
};
var MODULES_CHARGES_DEFAUT = ["usb_storage", "dm_crypt", "dm_mod", "ahci", "libahci", "libata", "sd_mod", "scsi_mod", "scsi_common", "usbcore", "usb_common",
	"nf_tables", "libcrc32c", "nfnetlink", "ip_tables", "x_tables", "virtio_net", "net_failover", "failover", "ext4", "crc16", "mbcache", "jbd2"];
function nomModule(n){ return String(n).replace(/-/g, "_").replace(/\.ko$/, ""); }
function catalogueModules(h){
	var c = {};
	Object.keys(MODULES_NOYAU).forEach(function(k){ c[k] = MODULES_NOYAU[k]; });
	var d = NOYAUX_GUET[h] && NOYAUX_GUET[h].modules;
	if (d && d.disponibles) d.disponibles.forEach(function(x){ if (!c[nomModule(x.nom || x)]) c[nomModule(x.nom || x)] = [x.taille || 32768, x.chemin || "drivers/misc/" + (x.nom || x) + ".ko", x.dependances || []]; });
	return c;
}
/* Au démarrage, les modules chargés automatiquement : sauf ceux que /etc/modprobe.d bloque (blacklist ou install). */
function modulesDemarrage(h){
	var d = NOYAUX_GUET[h] && NOYAUX_GUET[h].modules;
	var r = lireModprobe(h), cat = catalogueModules(h);
	var liste = (d && d.charges ? d.charges.map(nomModule) : MODULES_CHARGES_DEFAUT).slice();
	var bloques = liste.filter(function(m){ return r.blacklist.indexOf(m) > -1 || r.install[m] !== undefined; });
	return liste.filter(function(m){
		if (bloques.indexOf(m) > -1) return false;
		return !(cat[m] ? cat[m][2] : []).some(function(dep){ return bloques.indexOf(dep) > -1; });
	});
}
/* /etc/modprobe.d et /lib/modprobe.d : blacklist, install, remove, options. */
function lireModprobe(h){
	var regles = { blacklist: [], install: {}, remove: {}, options: {}, lignes: [] };
	["/lib/modprobe.d", "/usr/lib/modprobe.d", "/run/modprobe.d", "/etc/modprobe.d"].forEach(function(d){
		fichiersDuDossierGuet(h, d, "*.conf").forEach(function(f){
			lignesConf(lireFichierHote(h, f.chemin)).forEach(function(l){
				var m = l.texte.trim().split(/\s+/), quoi = m[0], nom = nomModule(m[1] || "");
				if (!m[1]) return;
				if (quoi === "blacklist"){ if (regles.blacklist.indexOf(nom) === -1) regles.blacklist.push(nom); regles.lignes.push("blacklist " + nom); }
				else if (quoi === "install"){ regles.install[nom] = m.slice(2).join(" "); regles.lignes.push("install " + nom + " " + regles.install[nom]); }
				else if (quoi === "remove"){ regles.remove[nom] = m.slice(2).join(" "); regles.lignes.push("remove " + nom + " " + regles.remove[nom]); }
				else if (quoi === "options"){ regles.options[nom] = m.slice(2).join(" "); regles.lignes.push("options " + nom + " " + regles.options[nom]); }
			});
		});
	});
	return regles;
}
function modulesCharges(h){ return machineGardee(h) ? (etatHote(h).modules || []) : []; }
function utilisateursDe(h, nom){
	var charges = modulesCharges(h), cat = catalogueModules(h);
	return charges.filter(function(m){ return cat[m] && cat[m][2].indexOf(nom) > -1; });
}
Shell.sorts.lsmod = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) throw new ShellError("lsmod : ici, pas de noyau à inspecter." + astuce(io, "lsmod sert sur les machines du réseau."));
	if (args.length) throw new ShellError("Usage: lsmod");
	var cat = catalogueModules(h);
	GameEvents.fire({ type: "lsmod", hote: h });
	return ["Module                  Size  Used by"].concat(modulesCharges(h).map(function(m){
		var util = utilisateursDe(h, m);
		return completerDroite(m, 19) + " " + completerGauche(cat[m] ? cat[m][0] : 16384, 8) + "  " + util.length + (util.length ? " " + util.join(",") : "");
	})).join("\n");
};
Shell.sorts.modprobe = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) throw new ShellError("modprobe : ici, pas de noyau où charger un module." + astuce(io, "modprobe sert sur les machines du réseau."));
	var retirer = false, essai = false, bavard = false, config = false, noms = [];
	args.forEach(function(a){
		if (a === "-r" || a === "--remove") retirer = true;
		else if (a === "-n" || a === "--dry-run" || a === "--show") essai = true;
		else if (a === "-v" || a === "--verbose") bavard = true;
		else if (a === "-c" || a === "--showconfig") config = true;
		else if (a === "-q" || a === "--quiet" || a === "-b" || a === "--use-blacklist") return;
		else if (/^-[rnvq]+$/.test(a)){ if (a.indexOf("r") > -1) retirer = true; if (a.indexOf("n") > -1) essai = true; if (a.indexOf("v") > -1) bavard = true; }
		else if (a.charAt(0) === "-") throw new ShellError("modprobe: ERROR: unknown option -- '" + a.replace(/^-+/, "") + "'");
		else noms.push(a);
	});
	var regles = lireModprobe(h), cat = catalogueModules(h), e = etatHote(h), ver = versionNoyau(h);
	if (config) return regles.lignes.join("\n");
	if (!noms.length) throw new ShellError("modprobe: ERROR: missing parameters. See -h.");
	var nom = nomModule(noms[0]), lignes = [];
	if (!cat[nom]) throw new ShellError("modprobe: FATAL: Module " + noms[0] + " not found in directory /lib/modules/" + ver, 1);
	if (retirer && noms.length > 1 && !essai){
		var sorties = [];
		noms.forEach(function(n){ var x = Shell.sorts.modprobe(["-r"].concat(bavard ? ["-v"] : [], [n]), io); if (x) sorties.push(x); });
		return sorties.join("\n");
	}
	if (retirer){
		if (essai){ if (e.modules.indexOf(nom) > -1 && bavard) lignes.push("rmmod " + nom); GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "dry-run", ok: true }); return lignes.join("\n"); }
		if (e.modules.indexOf(nom) === -1){ GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "remove", ok: true }); return ""; }
		var users = utilisateursDe(h, nom);
		if (users.length) throw new ShellError("modprobe: FATAL: Module " + nom + " is in use." + astuce(io, nom + " sert encore à " + users.join(", ") + " : retire d'abord celui-là (sudo modprobe -r " + users[0] + " " + nom + ")."));
		if (!io.sudo) throw new ShellError("modprobe: ERROR: could not remove '" + nom + "': Operation not permitted" + astuce(io, "Retirer un module du noyau est réservé à root : sudo modprobe -r " + noms[0]));
		var retires = [];
		(function enlever(n){
			if (e.modules.indexOf(n) === -1 || utilisateursDe(h, n).length) return;
			e.modules = e.modules.filter(function(x){ return x !== n; });
			retires.push(n);
			if (bavard) lignes.push("rmmod " + n);
			(cat[n] ? cat[n][2] : []).forEach(function(dep){ if (MODULES_CHARGES_DEFAUT.indexOf(dep) === -1) enlever(dep); });
		})(nom);
		GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "remove", ok: true, retires: retires });
		return lignes.join("\n");
	}
	// Charger : les dépendances d'abord, chacune soumise aux règles « install ».
	var aCharger = [], bloque = null;
	(function prevoir(n, pile){
		if (pile.indexOf(n) > -1) return;
		(cat[n] ? cat[n][2] : []).forEach(function(d){ prevoir(d, pile.concat([n])); });
		if (aCharger.indexOf(n) === -1 && e.modules.indexOf(n) === -1) aCharger.push(n);
	})(nom, []);
	if (essai){
		aCharger.forEach(function(n){ lignes.push(regles.install[n] !== undefined ? "install " + regles.install[n] + " " : "insmod /lib/modules/" + ver + "/kernel/" + cat[n][1] + " "); });
		GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "dry-run", ok: true, bloque: regles.install[nom] !== undefined, liste: lignes.slice() });
		return bavard ? lignes.join("\n") : "";
	}
	if (!aCharger.length){ GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "load", ok: true }); return ""; }
	if (!io.sudo || e.sysctl["kernel.modules_disabled"] === "1"){
		throw new ShellError("modprobe: ERROR: could not insert '" + nom + "': Operation not permitted" + astuce(io, !io.sudo ? "Charger un module dans le noyau est réservé à root." : "kernel.modules_disabled vaut 1 : plus aucun module ne peut entrer avant le prochain démarrage."));
	}
	for (var i = 0; i < aCharger.length; i++){
		var n = aCharger[i];
		if (regles.install[n] !== undefined){
			var commande = regles.install[n];
			if (/^\/(usr\/)?bin\/false\b/.test(commande) || /^false\b/.test(commande)){
				bloque = n;
				GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "load", ok: false, bloque: true });
				throw new ShellError("modprobe: ERROR: ../libkmod/libkmod-module.c:1047 command_do() Error running install command '" + commande + "' for module " + n + ": retcode 1\n" +
					"modprobe: ERROR: could not insert '" + nom + "': Invalid argument" + astuce(io, "Bloqué par la règle « install " + n + " " + commande + " » de /etc/modprobe.d : c'est voulu, ce module ne doit pas se charger."));
			}
			continue;
		}
		e.modules.unshift(n);
	}
	GameEvents.fire({ type: "modprobe", hote: h, module: nom, action: "load", ok: true, bloque: false, blackliste: regles.blacklist.indexOf(nom) > -1 });
	if (io.tty && regles.blacklist.indexOf(nom) > -1) return astuce(io, "Chargé quand même : « blacklist " + nom + " » n'empêche que le chargement automatique. Pour l'interdire vraiment : install " + nom + " /bin/false").replace(/^\n/, "");
	return "";
};

/* ================================================================== */
/* Le démarrage : grub-mkpasswd-pbkdf2, update-grub, grub-mkconfig       */
/* ================================================================== */

function hachePbkdf2(motDePasse, iterations){
	var sel = (sha256("grub-sel:" + motDePasse + ":" + iterations) + sha256("grub-sel-2:" + motDePasse)).toUpperCase();
	var h = sha256(sel + motDePasse);
	for (var i = 0; i < 24; i++) h = sha256(h + sel + i);
	var empreinte = (h + sha256(h + motDePasse + "fin")).toUpperCase();
	return "grub.pbkdf2.sha512." + iterations + "." + sel + "." + empreinte;
}
Shell.sorts["grub-mkpasswd-pbkdf2"] = function(args, io){
	var iterations = 10000;
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-c" || a === "--iteration-count"){ iterations = parseInt(args[++i], 10); continue; }
		if ((m = /^--iteration-count=(\d+)$/.exec(a))){ iterations = +m[1]; continue; }
		if (a === "-l" || a === "-s" || a === "--buflen" || a === "--salt"){ i++; continue; }
		if (/^--(buflen|salt)=/.test(a)) continue;
		throw new ShellError("grub-mkpasswd-pbkdf2: error: unrecognized option '" + a + "'.\nTry 'grub-mkpasswd-pbkdf2 --help' or 'grub-mkpasswd-pbkdf2 --usage' for more information.", 64);
	}
	if (isNaN(iterations) || iterations < 1) throw new ShellError("grub-mkpasswd-pbkdf2: error: invalid iteration count.", 64);
	function resultat(un, deux){
		if (un !== deux){ GameEvents.fire({ type: "grubMdp", ok: false }); return { erreur: "grub-mkpasswd-pbkdf2: error: passwords don't match." }; }
		GameEvents.fire({ type: "grubMdp", ok: true, iterations: iterations });
		return { texte: "PBKDF2 hash of your password is " + hachePbkdf2(un, iterations) };
	}
	if (io.stdin !== null){
		var l = String(io.stdin).split("\n");
		var r = resultat(l[0] || "", l[1] || "");
		if (r.erreur) throw new ShellError("Enter password: \nReenter password: \n" + r.erreur);
		return "Enter password: \nReenter password: " + r.texte;
	}
	term.demander("Enter password: ", true, function(un){
		term.demander("Reenter password: ", true, function(deux){
			var r = resultat(un, deux);
			term.echo(r.erreur || r.texte);
			if (!r.erreur && io.tty) term.echo(C.gris("(Recopie cette ligne entière, de grub.pbkdf2 jusqu'au bout, dans /etc/grub.d/40_custom : password_pbkdf2 NOM HASH, avec set superusers=\"NOM\". Puis sudo update-grub.)"));
			Shell.fin();
		});
	});
	return "";
};

function lireDefautGrub(h){
	var v = { GRUB_DEFAULT: "0", GRUB_TIMEOUT: "5", GRUB_DISTRIBUTOR: "Debian", GRUB_CMDLINE_LINUX_DEFAULT: "quiet", GRUB_CMDLINE_LINUX: "" };
	var texte = lireFichierHote(h, "/etc/default/grub");
	if (texte !== null) lignesConf(texte).forEach(function(l){
		var m = /^\s*([A-Z_][A-Z0-9_]*)=(.*)$/.exec(l.texte);
		if (m) v[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
	});
	if (/lsb_release/.test(v.GRUB_DISTRIBUTOR)) v.GRUB_DISTRIBUTOR = "Debian";
	return v;
}
/* Fabrique grub.cfg à partir de /etc/default/grub et des scripts exécutables de /etc/grub.d. */
function genererGrub(h){
	var d = lireDefautGrub(h), ver = versionNoyau(h), messages = ["Generating grub configuration file ..."], erreur = null;
	var morceaux = ["#", "# DO NOT EDIT THIS FILE", "#", "# It is automatically generated by grub-mkconfig using templates", "# from /etc/grub.d and settings from /etc/default/grub", "#", ""];
	var scripts = fichiersDuDossierGuet(h, "/etc/grub.d", "*").filter(function(f){ return f.item && f.item.mode.charAt(2) === "x" && !/\.(dpkg-|bak|orig)/.test(f.nom) && f.nom !== "README"; });
	var uuid = hexDe("uuid-racine:" + h, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
	var superusers = null, motDePasse = false, enClair = false, ignores = fichiersDuDossierGuet(h, "/etc/grub.d", "*").filter(function(f){ return f.item && f.item.mode.charAt(2) !== "x" && f.nom !== "README"; }).map(function(f){ return f.nom; });
	scripts.forEach(function(f){
		morceaux.push("### BEGIN " + f.chemin + " ###");
		if (/^00_header$/.test(f.nom)) morceaux.push("if [ -s $prefix/grubenv ]; then", "  load_env", "fi", "set default=\"" + d.GRUB_DEFAULT + "\"", "", "if [ x\"${feature_menuentry_id}\" = xy ]; then", "  menuentry_id_option=\"--id\"", "else", "  menuentry_id_option=\"\"", "fi", "", "terminal_output gfxterm", "set timeout=" + d.GRUB_TIMEOUT);
		else if (/^05_debian_theme$/.test(f.nom)) morceaux.push("set menu_color_normal=cyan/blue", "set menu_color_highlight=white/blue");
		else if (/^10_linux$/.test(f.nom)){
			messages.push("Found linux image: /boot/vmlinuz-" + ver, "Found initrd image: /boot/initrd.img-" + ver);
			morceaux.push("menuentry '" + d.GRUB_DISTRIBUTOR + " GNU/Linux' --class debian --class gnu-linux --class gnu --class os $menuentry_id_option 'gnulinux-simple-" + uuid + "' {",
				"\tload_video", "\tinsmod gzio", "\tinsmod part_gpt", "\tinsmod ext2", "\tsearch --no-floppy --fs-uuid --set=root " + uuid, "\techo\t'Loading Linux " + ver + " ...'",
				"\tlinux\t/boot/vmlinuz-" + ver + " root=UUID=" + uuid + " ro " + (d.GRUB_CMDLINE_LINUX + " " + d.GRUB_CMDLINE_LINUX_DEFAULT).trim(),
				"\techo\t'Loading initial ramdisk ...'", "\tinitrd\t/boot/initrd.img-" + ver, "}");
		}
		else if (/^30_os-prober$/.test(f.nom)) messages.push("Warning: os-prober will not be executed to detect other bootable partitions.\nSystems on them will not be added to the GRUB boot configuration.\nCheck GRUB_DISABLE_OS_PROBER documentation entry.");
		else if (/^30_uefi-firmware$/.test(f.nom)){ messages.push("Adding boot menu entry for UEFI Firmware Settings ..."); morceaux.push("menuentry 'UEFI Firmware Settings' $menuentry_id_option 'uefi-firmware' {", "\tfwsetup", "}"); }
		else if (/^41_custom$/.test(f.nom)) morceaux.push("if [ -f  ${config_directory}/custom.cfg ]; then", "  source ${config_directory}/custom.cfg", "elif [ -z \"${config_directory}\" -a -f  $prefix/custom.cfg ]; then", "  source $prefix/custom.cfg", "fi");
		else {
			var lignes = String(f.item.getText()).split("\n");
			if (/^#!/.test(lignes[0]) && /exec tail -n \+3/.test(lignes[1] || "")) lignes = lignes.slice(2);
			else lignes = lignes.filter(function(x){ return !/^#!/.test(x); });
			var texte = lignes.join("\n");
			var simples = (texte.replace(/"[^"]*"/g, "").match(/'/g) || []).length, doubles = (texte.replace(/'[^']*'/g, "").match(/"/g) || []).length;
			var ouvre = (texte.match(/\{/g) || []).length, ferme = (texte.match(/\}/g) || []).length;
			if (simples % 2 || doubles % 2 || ouvre !== ferme) erreur = erreur || f.chemin;
			lignes.forEach(function(l){
				var su = /^\s*set\s+superusers\s*=\s*["']?([^"'\s]+)["']?/.exec(l);
				if (su) superusers = su[1];
				var pw = /^\s*password_pbkdf2\s+(\S+)\s+(\S+)/.exec(l);
				if (pw && /^grub\.pbkdf2\.sha512\.\d+\.[0-9A-F]+\.[0-9A-F]+$/.test(pw[2]) && (!superusers || pw[1] === superusers || true)) motDePasse = pw[1];
				if (/^\s*password\s+\S+\s+\S+/.test(l)) enClair = true;
			});
			morceaux.push(texte);
		}
		morceaux.push("### END " + f.chemin + " ###", "");
	});
	messages.push("done");
	var protege = !!(superusers && motDePasse && (motDePasse === superusers || superusers.split(",").indexOf(motDePasse) > -1));
	return { texte: morceaux.join("\n"), messages: messages, erreur: erreur, superusers: superusers, motDePasse: !!motDePasse, protege: protege, enClair: enClair, ignores: ignores };
}
function grubMkconfig(nomCmd){
	return function(args, io){
		var h = hoteIci();
		if (!machineGardee(h) || !dossierHoteGuet(h, "/etc/grub.d")) absentIci(io, nomCmd, "grub2");
		var sortie = nomCmd === "update-grub" ? "/boot/grub/grub.cfg" : null;
		for (var i = 0; i < args.length; i++){
			if (args[i] === "-o" || args[i] === "--output"){ sortie = args[++i]; continue; }
			if (/^--output=/.test(args[i])){ sortie = args[i].substring(9); continue; }
			throw new ShellError(nomCmd + ": Unrecognized option '" + args[i] + "'\nUsage: grub-mkconfig [OPTION]\nGenerate a grub config file\n\n  -o, --output=FILE       output generated config to FILE [default=stdout]");
		}
		if (sortie && !io.sudo) throw new ShellError("/usr/sbin/grub-mkconfig: 270: cannot create " + sortie + ".new: Permission denied" + astuce(io, "Écrire la configuration du démarrage est réservé à root : sudo " + (nomCmd === "update-grub" ? "update-grub" : "grub-mkconfig -o " + sortie)));
		var g = genererGrub(h);
		g.messages.slice(0, -1).forEach(function(m){ io.err(m); });
		if (g.erreur){
			if (sortie) poserFichierHote(h, sortie + ".new", g.texte, { mode: "r--r--r--" });
			GameEvents.fire({ type: "grubUpdate", hote: h, ok: false, superusers: g.superusers, motDePasse: g.motDePasse, erreur: g.erreur });
			throw new ShellError("error: syntax error.\nerror: Incorrect command.\nerror: syntax error.\nSyntax errors are detected in generated GRUB config file.\n" +
				"Ensure that there are no errors in /etc/default/grub\nand /etc/grub.d/* files or please file a bug report with\n" + (sortie || "/boot/grub/grub.cfg") + ".new file attached." +
				astuce(io, "Une guillemet ou une accolade orpheline dans " + g.erreur + ". L'ancien grub.cfg reste en place : la machine démarrera comme avant."));
		}
		io.err("done");
		GameEvents.fire({ type: "grubUpdate", hote: h, ok: true, superusers: g.superusers, motDePasse: g.motDePasse, protege: g.protege, sortie: sortie });
		if (!sortie) return g.texte;
		poserFichierHote(h, sortie, g.texte, { mode: /^password/m.test(g.texte) ? "r--------" : "r--r--r--" });
		var notes = [];
		if (g.ignores.length) notes.push("Ignorés car non exécutables (chmod +x) : " + g.ignores.join(", ") + ".");
		if (g.protege) notes.push("Le menu de démarrage est protégé : modifier une entrée ou ouvrir la console de GRUB demande désormais le compte « " + g.superusers + " ».");
		else if (g.superusers) notes.push("superusers est posé, mais aucun password_pbkdf2 valide ne lui correspond.");
		if (g.enClair) notes.push("Une ligne « password » en clair : préfère password_pbkdf2 et le hash de grub-mkpasswd-pbkdf2.");
		return notes.length ? astuce(io, notes.join(" ")).replace(/^\n/, "") : "";
	};
}
Shell.sorts["update-grub"] = grubMkconfig("update-grub");
Shell.sorts["grub-mkconfig"] = grubMkconfig("grub-mkconfig");

/* ================================================================== */
/* cryptsetup : lire l'état du chiffrement (lecture seule)              */
/* ================================================================== */

var CHIFFREMENTS_GUET = {};
function declarerChiffrement(h, o){ (CHIFFREMENTS_GUET[h] = CHIFFREMENTS_GUET[h] || []).push(o); }
function volumesChiffres(h){
	var liste = (CHIFFREMENTS_GUET[h] || []).map(function(o){ return { nom: o.nom, device: o.device || "/dev/sda3", uuid: o.uuid, keyslots: o.keyslots || [0] }; });
	var texte = lireFichierHote(h, "/etc/crypttab");
	if (texte !== null) lignesConf(texte).forEach(function(l, k){
		var c = l.texte.trim().split(/\s+/);
		if (liste.some(function(v){ return v.nom === c[0]; })) return;
		liste.push({ nom: c[0], device: /^\/dev\//.test(c[1] || "") ? c[1] : "/dev/sda" + (3 + k), uuid: /^UUID=/.test(c[1] || "") ? c[1].substring(5) : null, keyslots: [0] });
	});
	liste.forEach(function(v){ if (!v.uuid) v.uuid = hexDe("luks:" + h + v.nom, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"); });
	return liste;
}
function octetsHex(sel, n){ return hexDe(sel, n * 2).replace(/(..)(?!$)/g, "$1 "); }
Shell.sorts.cryptsetup = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) absentIci(io, "cryptsetup");
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; }), action = mots[0];
	if (args.indexOf("--version") > -1 || args.indexOf("-V") > -1) return "cryptsetup 2.6.1 flags: UDEV BLKID KEYRING KERNEL_CAPI";
	if (!action) throw new ShellError("Usage: cryptsetup [OPTION...] <action> <action-specific>\n<action> is one of:\n\topen, close, status, resize, luksFormat, luksAddKey, luksDump, isLuks, ..." + astuce(io, "Ici, on lit seulement : cryptsetup status NOM, cryptsetup luksDump /dev/sdXN, cryptsetup isLuks /dev/sdXN"));
	var volumes = volumesChiffres(h), cible = mots[1];
	GameEvents.fire({ type: "cryptsetup", hote: h, action: action, cible: cible || null });
	if (["luksFormat", "open", "luksOpen", "close", "luksClose", "luksAddKey", "luksRemoveKey", "luksKillSlot", "erase", "luksErase", "resize", "reencrypt", "luksChangeKey"].indexOf(action) > -1){
		throw new ShellError("cryptsetup " + action + " : refusé ici." + astuce(io, "Le disque du Bastion est déjà chiffré et en service : on vérifie seulement (status, luksDump, isLuks). Formater un volume LUKS détruit tout ce qu'il contient."));
	}
	if (action === "status"){
		if (!cible) throw new ShellError("Command requires device as argument.");
		if (!io.sudo) throw new ShellError("Cannot initialize device-mapper. Is dm_mod kernel module loaded?\nCannot use device " + cible + ", name is invalid or still in use." + astuce(io, "Interroger le device-mapper est réservé à root : sudo cryptsetup status " + cible));
		var nom = cible.replace(/^\/dev\/mapper\//, "");
		var v = volumes.filter(function(x){ return x.nom === nom; })[0];
		if (!v){ io.code = 4; return "/dev/mapper/" + nom + " is inactive."; }
		return "/dev/mapper/" + nom + " is active and is in use.\n  type:    LUKS2\n  cipher:  aes-xts-plain64\n  keysize: 512 bits\n  key location: keyring\n  device:  " + v.device +
			"\n  sector size:  512\n  offset:  32768 sectors\n  size:    " + (400000000 + condense(v.nom) % 90000000) + " sectors\n  mode:    read/write\n  flags:   discards";
	}
	if (action === "luksDump" || action === "isLuks"){
		if (!cible) throw new ShellError("Command requires device as argument.");
		var vol = volumes.filter(function(x){ return x.device === cible || ("UUID=" + x.uuid) === cible; })[0];
		var disques = ["/dev/sda", "/dev/sda1", "/dev/sda2"].concat(volumes.map(function(x){ return x.device; }), volumes.map(function(x){ return "/dev/mapper/" + x.nom; }));
		if (!io.sudo || disques.indexOf(cible) === -1){
			io.code = 4;
			if (action === "isLuks" && io.sudo) return "";
			throw new ShellError("Device " + cible + " does not exist or access denied." + astuce(io, !io.sudo ? "Lire l'en-tête d'un disque est réservé à root : sudo cryptsetup " + action + " " + cible : "Les volumes chiffrés de cette machine sont listés dans /etc/crypttab."), 4);
		}
		if (!vol){
			io.code = 1;
			if (action === "isLuks") return args.indexOf("-v") > -1 ? "Device " + cible + " is not a valid LUKS device." : "";
			throw new ShellError("Device " + cible + " is not a valid LUKS device.", 1);
		}
		if (action === "isLuks") return args.indexOf("-v") > -1 ? "Command successful." : "";
		var lignes = ["LUKS header information", "Version:       \t2", "Epoch:         \t" + (3 + vol.keyslots.length), "Metadata area: \t16384 [bytes]", "Keyslots area: \t16744448 [bytes]",
			"UUID:          \t" + vol.uuid, "Label:         \t(no label)", "Subsystem:     \t(no subsystem)", "Flags:       \t(no flags)", "", "Data segments:", "  0: crypt",
			"\toffset: 16777216 [bytes]", "\tlength: (whole device)", "\tcipher: aes-xts-plain64", "\tsector: 512 [bytes]", "", "Keyslots:"];
		vol.keyslots.forEach(function(k){
			lignes.push("  " + k + ": luks2", "\tKey:        512 bits", "\tPriority:   normal", "\tCipher:     aes-xts-plain64", "\tCipher key: 512 bits", "\tPBKDF:      argon2id",
				"\tTime cost:  4", "\tMemory:     1048576", "\tThreads:    4", "\tSalt:       " + octetsHex("sel-slot:" + vol.uuid + k, 16), "\t            " + octetsHex("sel-slot2:" + vol.uuid + k, 16),
				"\tAF stripes: 4000", "\tAF hash:    sha256", "\tArea offset:" + (32768 + k * 258048) + " [bytes]", "\tArea length:258048 [bytes]", "\tDigest ID:  0");
		});
		lignes.push("Tokens:", "Digests:", "  0: pbkdf2", "\tHash:       sha256", "\tIterations: 129774", "\tSalt:       " + octetsHex("digest-sel:" + vol.uuid, 16), "\t            " + octetsHex("digest-sel2:" + vol.uuid, 16),
			"\tDigest:     " + octetsHex("digest:" + vol.uuid, 16), "\t            " + octetsHex("digest2:" + vol.uuid, 16));
		return lignes.join("\n") + astuce(io, "LUKS2, aes-xts-plain64, argon2id : le disque est chiffré selon l'état de l'art. Chaque keyslot est une serrure qui ouvre la même clé maîtresse.");
	}
	throw new ShellError("Unknown action." + astuce(io, "Ici : cryptsetup status NOM, cryptsetup luksDump /dev/sdXN, cryptsetup isLuks /dev/sdXN"));
};

/* ================================================================== */
/* L'audit : auditctl, augenrules, le journal d'audit, ausearch, aureport */
/* ================================================================== */

var EXES_AUDIT = { vim: "/usr/bin/vim.basic", vi: "/usr/bin/vim.basic", nano: "/usr/bin/nano", sed: "/usr/bin/sed", usermod: "/usr/sbin/usermod",
	useradd: "/usr/sbin/useradd", userdel: "/usr/sbin/userdel", groupadd: "/usr/sbin/groupadd", passwd: "/usr/bin/passwd", chmod: "/usr/bin/chmod",
	chown: "/usr/bin/chown", cp: "/usr/bin/cp", mv: "/usr/bin/mv", rm: "/usr/bin/rm", touch: "/usr/bin/touch", tee: "/usr/bin/tee", bash: "/usr/bin/bash",
	cat: "/usr/bin/cat", less: "/usr/bin/less", head: "/usr/bin/head", tail: "/usr/bin/tail", grep: "/usr/bin/grep", visudo: "/usr/sbin/visudo",
	chage: "/usr/bin/chage", gpasswd: "/usr/bin/gpasswd", setcap: "/usr/sbin/setcap", chattr: "/usr/bin/chattr", sshd: "/usr/sbin/sshd",
	sudo: "/usr/bin/sudo", crontab: "/usr/bin/crontab", ln: "/usr/bin/ln", awk: "/usr/bin/mawk", rsync: "/usr/bin/rsync", patch: "/usr/bin/patch" };
var SYSCALLS_AUDIT = { openat: 257, unlinkat: 263, rename: 82, renameat2: 316, fchmodat: 268, fchownat: 260, setxattr: 188, execve: 59, truncate: 76 };
var DESCRIPTIONS_TEXTE = { openat: "opened-file", unlinkat: "deleted", rename: "renamed", renameat2: "renamed", fchmodat: "changed-file-permissions-of",
	fchownat: "changed-file-ownership-of", setxattr: "changed-file-attributes-of", execve: "executed", truncate: "truncated" };

function etatAudit(h){ return etatHote(h).audit; }
function exeDe(comm){ return EXES_AUDIT[comm] || "/usr/bin/" + comm; }
function normaliserPerms(p){ return "rwxa".split("").filter(function(c){ return String(p).indexOf(c) > -1; }).join(""); }
function texteRegleGuet(r){
	if (r.type === "w") return "-w " + r.chemin + " -p " + r.perms + (r.cle ? " -k " + r.cle : "");
	return r.texte;
}
function auditActif(h){ return machineGardee(h) && serviceActif(h, "auditd") && etatAudit(h).enabled > 0; }

/* La signature d'un fichier ou d'un dossier surveillé, pour voir ce qui a changé. */
function signatureAudit(n){
	if (n === null) return null;
	if (n instanceof Room) return "d|" + n.mode + "|" + n.owner;
	return "f|" + n.mode + "|" + n.owner + "|" + (n.capacites || "") + "|" + (n.immuable ? 1 : 0) + "|" + condense(n.lien || n.getText());
}
/* Les chemins de fichiers couverts par une règle (un fichier, ou tout ce qu'il y a sous un dossier). */
function cheminsSurveilles(h, r, a){
	var n = noeudHoteGuet(h, r.chemin), liste = [r.chemin];
	if (n instanceof Room){
		var garde = { n: 0 };
		(function visiter(lieu, chemin, profondeur){
			lieu.items.forEach(function(it){ liste.push(chemin + "/" + it.itemname); });
			if (profondeur < 3) lieu.children.forEach(function(c){ if (garde.n++ < 200) visiter(c, chemin + "/" + c.room_name, profondeur + 1); });
		})(n, r.chemin.replace(/\/$/, ""), 0);
	}
	Object.keys(a.sigs).forEach(function(c){ if (c.indexOf(r.chemin.replace(/\/$/, "") + "/") === 0 && liste.indexOf(c) === -1) liste.push(c); });
	return liste;
}
function regleSurChemin(a, chemin, perm){
	return a.regles.filter(function(r){
		if (r.type !== "w" || r.perms.indexOf(perm) === -1) return false;
		return chemin === r.chemin || chemin.indexOf(r.chemin.replace(/\/$/, "") + "/") === 0;
	})[0] || null;
}
function photographierAudit(h, a){
	a.regles.forEach(function(r){ if (r.type === "w") cheminsSurveilles(h, r, a).forEach(function(c){ a.sigs[c] = signatureAudit(noeudHoteGuet(h, c)); }); });
}

/* Écrit un événement dans le journal d'audit de la machine. */
function noterAudit(h, ev){
	var a = etatAudit(h);
	a.serie = (a.serie || 300) + 1;
	ev.s = a.serie;
	ev.t = ev.t || maintenantGuet().getTime();
	a.journal.push(ev);
	if (a.journal.length > 400) a.journal.splice(0, a.journal.length - 400);
	var lignes = rendreAudit(ev, false).filter(function(l){ return l.indexOf("----") !== 0 && l.indexOf("time->") !== 0; }).reverse();
	ajouterAuFichierHote(h, "/var/log/audit/audit.log", lignes, { mode: "rw-------", owner: "root" });
	GameEvents.fire({ type: "audit", hote: h, evenement: ev });
	return ev;
}

/* Après chaque commande : ce qui a changé dans les chemins surveillés est noté, avec le nom du programme. */
function releverAudit(h, qui){
	if (!machineGardee(h)) return;
	var g = etatGuet().hotes[h];
	if (!g || !g.demarre || !g.audit || !g.audit.regles.some(function(r){ return r.type === "w"; })) return;
	var a = g.audit, actif = auditActif(h);
	a.regles.forEach(function(r){
		if (r.type !== "w") return;
		cheminsSurveilles(h, r, a).forEach(function(c){
			var n = noeudHoteGuet(h, c), sig = signatureAudit(n), avant = a.sigs.hasOwnProperty(c) ? a.sigs[c] : undefined;
			if (avant === undefined){ a.sigs[c] = sig; if (sig === null) return; avant = null; if (c === r.chemin) return; }
			if (sig === avant) return;
			a.sigs[c] = sig;
			if (!actif || !qui) return;
			var syscall, perm;
			if (sig === null){ syscall = qui.comm === "mv" ? "rename" : "unlinkat"; perm = "w"; }
			else if (avant === null){ syscall = qui.comm === "mv" ? "rename" : "openat"; perm = "w"; }
			else {
				var x = avant.split("|"), y = sig.split("|");
				if (x[5] !== y[5]){ syscall = qui.comm === "visudo" ? "rename" : "openat"; perm = "w"; }
				else if (x[1] !== y[1]){ syscall = "fchmodat"; perm = "a"; }
				else if (x[2] !== y[2]){ syscall = "fchownat"; perm = "a"; }
				else { syscall = "setxattr"; perm = "a"; }
			}
			var regle = regleSurChemin(a, c, perm);
			if (!regle) return;
			noterAudit(h, evenementFichier(h, c, n, syscall, regle.cle, qui));
		});
	});
}
function evenementFichier(h, chemin, n, syscall, cle, qui){
	var comm = String(qui.comm || "bash").substring(0, 15);
	var uid = qui.uid !== undefined ? qui.uid : (qui.sudo ? 0 : uidDe(JOUEUR));
	return { type: "SYSCALL", syscall: syscall, chemin: chemin, cle: cle || null, succes: qui.succes !== false, comm: comm, exe: qui.exe || exeDe(qui.comm || "bash"),
		auid: qui.auid !== undefined ? qui.auid : uidDe(JOUEUR), uid: uid, t: qui.quand instanceof Date ? qui.quand.getTime() : undefined,
		mode: n instanceof Room ? "dir,755" : (n ? "file," + modeEnNombre(n.mode).toString(8) : null), ouid: n && n.owner ? uidDe(n.owner) : 0,
		lecture: !!qui.lecture, proctitle: qui.proctitle || ((qui.comm || "bash") + (qui.args && qui.args.length ? " " + qui.args.join(" ") : "")), cwd: qui.cwd || "/root", pid: null };
}
/* Lectures (r) et exécutions (x) : on les voit passer. */
GameEvents.addListener("read", function(e){
	try {
		var h = hoteIci();
		if (!e || !e.item || !machineGardee(h)) return;
		var g = etatGuet().hotes[h];
		if (!g || !g.audit || !g.audit.regles.some(function(r){ return r.type === "w" && r.perms.indexOf("r") > -1; })) return;
		g.audit.regles.forEach(function(r){
			if (r.type !== "w" || r.perms.indexOf("r") === -1) return;
			cheminsSurveilles(h, r, g.audit).forEach(function(c){
				if (noeudHoteGuet(h, c) === e.item && auditActif(h)) noterAudit(h, evenementFichier(h, c, e.item, "openat", r.cle, { comm: e.cmd, sudo: e.sudo, lecture: true }));
			});
		});
	} catch (x){}
});
GameEvents.addListener("script", function(e){
	try {
		var h = hoteIci();
		if (!e || !e.item || !machineGardee(h)) return;
		var g = etatGuet().hotes[h];
		if (!g || !g.audit) return;
		g.audit.regles.forEach(function(r){
			if (r.type !== "w" || r.perms.indexOf("x") === -1) return;
			cheminsSurveilles(h, r, g.audit).forEach(function(c){
				if (noeudHoteGuet(h, c) === e.item && auditActif(h)) noterAudit(h, evenementFichier(h, c, e.item, "execve", r.cle, { comm: e.item.itemname, exe: c }));
			});
		});
	} catch (x){}
});
var APPELER_AVANT_GUET = Shell.appeler;
Shell.appeler = function(nom, args, io){
	try { return APPELER_AVANT_GUET.apply(this, arguments); }
	finally { try { releverAudit(hoteIci(), { comm: nom, sudo: !!(io && io.sudo), args: args }); } catch (x){} }
};
var TUYAU_AVANT_GUET = Shell.tuyau;
Shell.tuyau = function(jetons){
	try { return TUYAU_AVANT_GUET.apply(this, arguments); }
	finally { try { releverAudit(hoteIci(), { comm: "bash", sudo: false }); } catch (x){} }
};

/* Le monde écrit dans le journal d'audit (une connexion, un ajout de compte...) ou modifie des fichiers sous l'œil de l'audit. */
function ajouterEvenementAudit(h, o){
	if (!machineGardee(h)) return null;
	o = o || {};
	var a = etatAudit(h);
	if (o.chemin && (!o.type || o.type === "SYSCALL")){
		var perm = o.perm || "w", regle = regleSurChemin(a, o.chemin, perm);
		if ((!regle && !o.force) || !auditActif(h)) return null;
		var n = noeudHoteGuet(h, o.chemin);
		var syscall = o.syscall || (perm === "a" ? "fchmodat" : (perm === "x" ? "execve" : "openat"));
		return noterAudit(h, evenementFichier(h, o.chemin, n, syscall, o.cle || (regle && regle.cle), o));
	}
	if (!serviceActif(h, "auditd") && !o.force) return null;
	return noterAudit(h, { type: o.type || "USER_AUTH", message: o.message || "", cle: o.cle || null, succes: o.succes !== false, comm: o.comm || "sshd",
		exe: o.exe || exeDe(o.comm || "sshd"), auid: o.auid !== undefined ? o.auid : 4294967295, uid: o.uid !== undefined ? o.uid : 0,
		acct: o.acct || null, adresse: o.adresse || null, terminal: o.terminal || "ssh", t: o.quand instanceof Date ? o.quand.getTime() : undefined });
}
function auditSous(h, qui, fonction){
	releverAudit(h, null);
	try { fonction(); } finally { releverAudit(h, qui || { comm: "bash" }); }
}

/* Charge les règles : depuis /etc/audit/rules.d (augenrules), comme au démarrage d'auditd. */
function lireReglesAudit(h){
	var lignes = [], fichiers = fichiersDuDossierGuet(h, "/etc/audit/rules.d", "*.rules");
	fichiers.forEach(function(f){ lignesConf(lireFichierHote(h, f.chemin)).forEach(function(l){ lignes.push({ texte: l.texte.trim(), fichier: f.chemin, n: l.n }); }); });
	return { lignes: lignes, fichiers: fichiers };
}
function chargerReglesAudit(h, e, depuisCommande){
	var a = e.audit, lu = lireReglesAudit(h), erreur = null;
	if (a.enabled === 2 && depuisCommande) return { erreur: "The audit system is in immutable mode, no rule changes allowed" };
	a.regles = [];
	var enAttente = null;
	lu.lignes.forEach(function(l, k){
		var r = appliquerArgsAudit(h, a, motsApache(l.texte), true);
		if (r.erreur && !erreur) erreur = "There was an error in line " + (k + 1) + " of /etc/audit/audit.rules";
		if (r.enable !== undefined) enAttente = r.enable;
	});
	if (enAttente !== null) a.enabled = enAttente;
	photographierAudit(h, a);
	var compile = ["## This file is automatically generated from /etc/audit/rules.d"].concat(lu.lignes.map(function(l){ return l.texte; }));
	if (lu.fichiers.length) poserFichierHote(h, "/etc/audit/audit.rules", compile.join("\n"), { mode: "rw-r-----" });
	return { erreur: erreur, regles: a.regles.length };
}
/* Applique une ligne d'auditctl à l'état : renvoie { ok, erreur, liste, statut, enable }. */
function appliquerArgsAudit(h, a, args, silencieux){
	var res = {}, i = 0, cle = null, perms = null, chemin = null, retrait = false, regleA = null;
	function valeur(){ return args[++i]; }
	for (i = 0; i < args.length; i++){
		var x = args[i];
		if (x === "-D"){ a.regles = []; res.supprime = true; continue; }
		if (x === "-l"){ res.liste = true; continue; }
		if (x === "-s"){ res.statut = true; continue; }
		if (x === "-e"){ var v = valeur(); if (!/^[012]$/.test(v || "")) return { erreur: "Enable must be 0, 1, or 2 was " + v }; res.enable = +v; continue; }
		if (x === "-f"){ var f = valeur(); if (!/^[012]$/.test(f || "")) return { erreur: "Failure must be 0, 1, or 2 was " + f }; a.failure = +f; continue; }
		if (x === "-b"){ var b = valeur(); if (!/^\d+$/.test(b || "")) return { erreur: "Backlog must be a number" }; a.backlog = +b; continue; }
		if (x === "--backlog_wait_time" || x === "-r" || x === "--loginuid-immutable" || x === "-c" || x === "-i"){ if (x === "--backlog_wait_time" || x === "-r") i++; continue; }
		if (x === "-w" || x === "-W"){ chemin = valeur(); retrait = x === "-W"; continue; }
		if (x === "-p"){ perms = valeur() || ""; if (!/^[rwxa]+$/.test(perms)) return { erreur: "Permission " + perms + " isn't supported" }; continue; }
		if (x === "-k" || x === "-F" && /^key=/.test(args[i + 1] || "")){ cle = x === "-k" ? valeur() : valeur().substring(4); continue; }
		if (x === "-a" || x === "-A" || x === "-d"){ regleA = args.slice(i).filter(function(y){ return true; }); var k = regleA.indexOf("-k"); if (k > -1) cle = regleA[k + 1]; i = args.length; continue; }
		if (x === "-R"){ res.fichier = valeur(); continue; }
		return { erreur: "Option " + x + " not supported" };
	}
	if (res.enable !== undefined && !silencieux){
		if (a.enabled === 2) return { erreur: "Error sending enable request (Operation not permitted)" };
		a.enabled = res.enable;
	}
	if (chemin !== null){
		if (!chemin || chemin.charAt(0) !== "/") return { erreur: "Error - path must be absolute: " + chemin };
		if (a.enabled === 2) return { erreur: "Error sending " + (retrait ? "delete" : "add") + " rule data request (Operation not permitted)" };
		var p = normaliserPerms(perms || "rwxa");
		var existante = a.regles.filter(function(r){ return r.type === "w" && r.chemin === chemin && r.perms === p && (r.cle || null) === (cle || null); })[0];
		if (retrait){
			if (!existante) return { erreur: "Error sending delete rule data request (No such file or directory)" };
			a.regles = a.regles.filter(function(r){ return r !== existante; });
			res.retire = existante;
		} else {
			if (existante) return { erreur: "Error sending add rule data request (Rule exists)" };
			var parent = chemin.replace(/\/[^\/]+\/?$/, "") || "/";
			if (!noeudHoteGuet(h, parent)) return { erreur: "Error sending add rule data request (No such file or directory)" };
			var nouvelle = { type: "w", chemin: chemin.replace(/(.)\/$/, "$1"), perms: p, cle: cle || null };
			a.regles.push(nouvelle);
			cheminsSurveilles(h, nouvelle, a).forEach(function(c){ a.sigs[c] = signatureAudit(noeudHoteGuet(h, c)); });
			res.ajoute = nouvelle;
		}
	}
	if (regleA){
		if (a.enabled === 2) return { erreur: "Error sending add rule data request (Operation not permitted)" };
		var texte = regleA.join(" ");
		if (regleA[0] === "-d"){ var avant = a.regles.length; a.regles = a.regles.filter(function(r){ return r.texte !== texte.replace(/^-d/, "-a"); }); if (avant === a.regles.length) return { erreur: "Error sending delete rule data request (No such file or directory)" }; }
		else {
			if (!/^(always|never),(exit|task|user|exclude)$|^(exit|task|user|exclude),(always|never)$/.test(regleA[1] || "")) return { erreur: "Rule must have list,action specified" };
			var t = texte.replace(/^-A/, "-a");
			if (a.regles.some(function(r){ return r.texte === t; })) return { erreur: "Error sending add rule data request (Rule exists)" };
			a.regles.push({ type: "a", texte: t, cle: cle || null });
			res.ajoute = a.regles[a.regles.length - 1];
		}
	}
	return res;
}
function texteStatutAudit(h, a){
	var s = assurerService(h, "auditd");
	return ["enabled " + a.enabled, "failure " + a.failure, "pid " + (s && s.actif ? (s.pid || 612) : 0), "rate_limit 0", "backlog_limit " + (a.backlog || 8192), "lost 0", "backlog 0",
		"backlog_wait_time 60000", "backlog_wait_time_actual 0", "loginuid_immutable 0 unlocked"].join("\n");
}
function exigerAudit(io, cmd){
	var h = hoteIci();
	if (!machineGardee(h) || !dossierHoteGuet(h, "/etc/audit")) absentIci(io, cmd, "auditd");
	return h;
}
Shell.sorts.auditctl = function(args, io){
	var h = exigerAudit(io, "auditctl");
	if (!io.sudo) throw new ShellError("You must be root to run this program." + astuce(io, "Les règles d'audit vivent dans le noyau : sudo auditctl ..."), 4);
	if (!args.length) throw new ShellError("usage: auditctl [options]\n    -a <l,a>            Append rule to end of <l>ist with <a>ction\n    -D                  Delete all rules and watches\n    -e [0..2]           Set enabled flag\n" +
		"    -k <key>            Set filter key on audit rule\n    -l                  List rules\n    -p [r|w|x|a]        Set permissions filter on watch\n    -s                  Report status\n    -w <path>           Insert watch at <path>\n    -W <path>           Remove watch at <path>");
	var a = etatAudit(h);
	var r = appliquerArgsAudit(h, a, args, false);
	if (r.erreur){ GameEvents.fire({ type: "auditctl", hote: h, action: "erreur", erreur: r.erreur }); throw new ShellError(r.erreur, 1); }
	var sorties = [], qui = { auid: uidDe(JOUEUR) };
	function config(op, cleR, extra){
		if (!serviceActif(h, "auditd")) return;
		noterAudit(h, { type: "CONFIG_CHANGE", op: op, cle: cleR || null, succes: true, auid: qui.auid, uid: 0, comm: "auditctl", exe: "/usr/sbin/auditctl", extra: extra || "" });
	}
	if (r.supprime){ sorties.push("No rules"); config("remove_rule", null, "list=4"); GameEvents.fire({ type: "auditctl", hote: h, action: "delete" }); }
	if (r.ajoute){ config("add_rule", r.ajoute.cle, "list=4"); GameEvents.fire({ type: "auditctl", hote: h, action: "add", regle: texteRegleGuet(r.ajoute), chemin: r.ajoute.chemin || null, cle: r.ajoute.cle, perms: r.ajoute.perms || null }); }
	if (r.retire){ config("remove_rule", r.retire.cle, "list=4"); GameEvents.fire({ type: "auditctl", hote: h, action: "remove", regle: texteRegleGuet(r.retire) }); }
	if (r.enable !== undefined){ config("set", null, "audit_enabled=" + r.enable + " old=1"); sorties.push(texteStatutAudit(h, a)); GameEvents.fire({ type: "auditctl", hote: h, action: "enable", valeur: r.enable }); }
	if (r.fichier){
		var it = Shell.objetLisible(r.fichier, io, "auditctl").item, erreurs = [];
		lignesConf(it.getText()).forEach(function(l){ var rr = appliquerArgsAudit(h, a, motsApache(l.texte), false); if (rr.erreur) erreurs.push("There was an error in line " + l.n + " of " + r.fichier); if (rr.supprime) sorties.push("No rules"); });
		erreurs.forEach(function(x){ io.err(x); });
	}
	if (r.liste){
		sorties.push(a.regles.length ? a.regles.map(texteRegleGuet).join("\n") : "No rules");
		GameEvents.fire({ type: "auditctl", hote: h, action: "list", regles: a.regles.map(texteRegleGuet) });
	}
	if (r.statut){ sorties.push(texteStatutAudit(h, a)); GameEvents.fire({ type: "auditctl", hote: h, action: "status" }); }
	var texte = sorties.join("\n");
	if (r.ajoute && io.tty) texte += astuce(io, "Règle ajoutée au noyau, pour maintenant. Elle disparaîtra au redémarrage : pour qu'elle reste, écris-la dans /etc/audit/rules.d/NOM.rules, puis sudo augenrules --load.");
	if (r.ajoute && !serviceActif(h, "auditd") && io.tty) texte += astuce(io, "auditd est arrêté : la règle est posée, mais personne n'écrit le journal d'audit. sudo systemctl start auditd");
	return texte.replace(/^\n/, "");
};
Shell.sorts.augenrules = function(args, io){
	var h = exigerAudit(io, "augenrules");
	var charger = args.indexOf("--load") > -1, verifier = args.indexOf("--check") > -1;
	if (!charger && !verifier) throw new ShellError("Usage: augenrules [--check|--load]");
	if (!io.sudo) throw new ShellError("/usr/sbin/augenrules: Only root should run this script" + astuce(io, "sudo augenrules --load"), 1);
	var lu = lireReglesAudit(h), compile = ["## This file is automatically generated from /etc/audit/rules.d"].concat(lu.lignes.map(function(l){ return l.texte; })).join("\n");
	var actuel = lireFichierHote(h, "/etc/audit/audit.rules");
	if (verifier) return actuel === compile ? "/usr/sbin/augenrules: No change" : "/usr/sbin/augenrules: Rules have changed and should be updated";
	var e = etatHote(h);
	if (e.audit.enabled === 2) throw new ShellError("The audit system is in immutable mode, no rule changes allowed" + astuce(io, "-e 2 verrouille les règles jusqu'au prochain redémarrage : c'est le but."));
	var r = chargerReglesAudit(h, e, true);
	GameEvents.fire({ type: "augenrules", hote: h, regles: e.audit.regles.map(texteRegleGuet), ok: !r.erreur, fichiers: lu.fichiers.map(function(f){ return f.chemin; }) });
	if (serviceActif(h, "auditd")) noterAudit(h, { type: "CONFIG_CHANGE", op: "add_rule", cle: null, succes: true, auid: uidDe(JOUEUR), uid: 0, comm: "auditctl", exe: "/usr/sbin/auditctl", extra: "list=4" });
	var sortie = (/^-D\b/m.test(lu.lignes.map(function(l){ return l.texte; }).join("\n")) ? "No rules\n" : "") + texteStatutAudit(h, e.audit);
	if (r.erreur) io.err(r.erreur);
	return sortie;
};

/* --- Lire le journal d'audit --- */
function dateDepuisAudit(texte, debut){
	var maintenant = maintenantGuet(), d = new Date(maintenant.getTime()), m;
	if (texte === "now") return maintenant;
	if (texte === "recent") return new Date(maintenant.getTime() - 10 * 60000);
	if (texte === "today" || texte === "boot"){ d.setHours(0, 0, 0, 0); if (texte === "boot") d.setTime(maintenant.getTime() - 4 * 3600000); return d; }
	if (texte === "yesterday"){ d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }
	if (texte === "this-week" || texte === "week-ago"){ d.setDate(d.getDate() - (texte === "week-ago" ? 7 : d.getDay())); d.setHours(0, 0, 0, 0); return d; }
	if (texte === "this-month"){ d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
	if (texte === "this-year"){ d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
	if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(texte))){
		var an = +m[3] < 100 ? 2000 + (+m[3]) : +m[3];
		return new Date(an, +m[1] - 1, +m[2], m[4] ? +m[4] : (debut ? 0 : 23), m[5] ? +m[5] : (debut ? 0 : 59), m[6] ? +m[6] : (debut ? 0 : 59));
	}
	if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(texte))){ d.setHours(+m[1], +m[2], m[3] ? +m[3] : 0, 0); return d; }
	return null;
}
function argsTemps(args, i){
	var t = args[i + 1];
	if (t === undefined) return { valeur: null, saut: 0 };
	if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t) && /^\d{1,2}:\d{2}(:\d{2})?$/.test(args[i + 2] || "")) return { valeur: t + " " + args[i + 2], saut: 2 };
	return { valeur: t, saut: 1 };
}
function horodatageAudit(ev){ return (ev.t / 1000).toFixed(3) + ":" + ev.s; }
function rendreAudit(ev, interprete){
	var d = new Date(ev.t), quand = interprete ? dateAudit(d) + "." + trois(d.getMilliseconds()) + ":" + ev.s : horodatageAudit(ev);
	var msg = " msg=audit(" + quand + ")" + (interprete ? " : " : ": ");
	var lignes = ["----"];
	if (!interprete) lignes.push("time->" + dateCtime(d));
	var auid = interprete ? nomDeUid(ev.auid) : String(ev.auid), uid = interprete ? nomDeUid(ev.uid) : String(ev.uid);
	if (ev.type === "SYSCALL"){
		var titre = ev.proctitle || ev.comm;
		lignes.push("type=PROCTITLE" + msg + "proctitle=" + (interprete ? titre : Array.prototype.map.call(titre, function(c){ return ("0" + (c.charCodeAt(0) & 255).toString(16)).slice(-2); }).join("").toUpperCase()));
		lignes.push("type=PATH" + msg + "item=" + (ev.syscall === "execve" ? 0 : 1) + " name=" + (interprete ? ev.chemin : "\"" + ev.chemin + "\"") + " inode=" + (260000 + condense(ev.chemin) % 9000) +
			" dev=08:01 mode=" + (ev.mode ? (interprete ? ev.mode : "0100" + ev.mode.split(",")[1]) : (interprete ? "file,644" : "0100644")) + " ouid=" + (interprete ? nomDeUid(ev.ouid || 0) : (ev.ouid || 0)) +
			" ogid=" + (interprete ? "root" : "0") + " rdev=00:00 nametype=" + (ev.syscall === "unlinkat" ? "DELETE" : (ev.syscall === "openat" && !ev.lecture ? "NORMAL" : "NORMAL")) + " cap_fp=0 cap_fi=0 cap_fe=0 cap_fver=0 cap_frootid=0");
		lignes.push("type=CWD" + msg + "cwd=" + (interprete ? ev.cwd || "/root" : "\"" + (ev.cwd || "/root") + "\""));
		var num = SYSCALLS_AUDIT[ev.syscall] || 257, pid = 2000 + (ev.s % 6000);
		lignes.push("type=SYSCALL" + msg + "arch=" + (interprete ? "x86_64" : "c000003e") + " syscall=" + (interprete ? ev.syscall : num) + " success=" + (ev.succes ? "yes" : "no") +
			" exit=" + (ev.succes ? (ev.syscall === "openat" ? "3" : "0") : (interprete ? "EACCES(Permission denied)" : "-13")) + " a0=" + (interprete && ev.syscall === "openat" ? "AT_FDCWD" : "ffffff9c") +
			" a1=55d0c" + hexa(condense(ev.chemin), 7) + (ev.syscall === "openat" ? " a2=" + (interprete ? (ev.lecture ? "O_RDONLY" : "O_WRONLY|O_CREAT|O_TRUNC") : (ev.lecture ? "0" : "241")) : " a2=0") +
			" a3=" + (interprete ? "0x1b6" : "1b6") + " items=2 ppid=" + (pid - 7) + " pid=" + pid + " auid=" + auid + " uid=" + uid + " gid=" + (ev.uid === 0 ? (interprete ? "root" : "0") : (interprete ? JOUEUR : "1000")) +
			" euid=" + uid + " suid=" + uid + " fsuid=" + uid + " egid=" + (ev.uid === 0 ? (interprete ? "root" : "0") : (interprete ? JOUEUR : "1000")) + " sgid=" + (ev.uid === 0 ? (interprete ? "root" : "0") : (interprete ? JOUEUR : "1000")) +
			" fsgid=" + (ev.uid === 0 ? (interprete ? "root" : "0") : (interprete ? JOUEUR : "1000")) + " tty=pts0 ses=3 comm=" + (interprete ? ev.comm : "\"" + ev.comm + "\"") + " exe=" + (interprete ? ev.exe : "\"" + ev.exe + "\"") +
			" subj=unconfined key=" + (ev.cle ? (interprete ? ev.cle : "\"" + ev.cle + "\"") : (interprete ? "(null)" : "(null)")));
	} else if (ev.type === "CONFIG_CHANGE"){
		lignes.push("type=CONFIG_CHANGE" + msg + "auid=" + auid + " ses=3 subj=unconfined op=" + ev.op + (ev.op === "set" ? " " + ev.extra : " key=" + (ev.cle ? (interprete ? ev.cle : "\"" + ev.cle + "\"") : "(null)") + " " + (ev.extra || "list=4")) + " res=1");
	} else {
		lignes.push("type=" + ev.type + msg + "pid=" + (2000 + ev.s % 6000) + " uid=" + uid + " auid=" + auid + " ses=" + (ev.auid === 4294967295 ? "4294967295" : "3") + " subj=unconfined msg='" +
			(ev.message ? ev.message + " " : "") + (ev.acct ? "acct=" + (interprete ? ev.acct : "\"" + ev.acct + "\"") + " " : "") + "exe=" + (interprete ? ev.exe : "\"" + ev.exe + "\"") +
			" hostname=" + (ev.adresse || "?") + " addr=" + (ev.adresse || "?") + " terminal=" + (ev.terminal || "ssh") + " res=" + (ev.succes ? "success" : "failed") + "'" + (ev.cle ? " key=" + (interprete ? ev.cle : "\"" + ev.cle + "\"") : ""));
	}
	return lignes;
}
function texteFormatAudit(ev){
	var d = new Date(ev.t), quand = "At " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()) + " " + deux(d.getMonth() + 1) + "/" + deux(d.getDate()) + "/" + d.getFullYear();
	var qui = nomDeUid(ev.auid), comme = ev.uid !== ev.auid ? ", acting as " + nomDeUid(ev.uid) + "," : "";
	if (ev.type === "SYSCALL") return quand + " " + qui + comme + " " + (ev.succes ? "successfully" : "unsuccessfully") + " " + (DESCRIPTIONS_TEXTE[ev.syscall] || ev.syscall) + " " + ev.chemin + " using " + ev.exe;
	if (ev.type === "CONFIG_CHANGE") return quand + " " + qui + " " + (ev.succes ? "successfully" : "unsuccessfully") + " " + (ev.op === "add_rule" ? "added-audit-rule" : ev.op === "remove_rule" ? "deleted-audit-rule" : "changed-audit-configuration") + (ev.cle ? " key=" + ev.cle : "");
	return quand + " " + (ev.acct || qui) + " " + (ev.succes ? "successfully" : "failed to") + " " + (ev.type === "USER_AUTH" ? "authenticated" : ev.type === "USER_LOGIN" ? "logged-in" : ev.type === "ADD_USER" ? "added-user-account" : ev.type.toLowerCase()) +
		(ev.adresse ? " from " + ev.adresse : "") + " using " + ev.exe;
}
function filtrerAudit(h, args, cmd){
	var a = etatAudit(h), f = {}, i, t;
	for (i = 0; i < args.length; i++){
		var x = args[i];
		if (cmd === "aureport" && /^-(f|au|k|x|m|l|e|t|u|p|s|r|n|c|tm|ma)$|^--(file|auth|key|executable|mods|login|event|log|user|pid|syscall|response|anomaly|config|terminal|mac)$/.test(x)){ (f.rapports = f.rapports || []).push(x); continue; }
		if (x === "-k" || x === "--key") f.cle = args[++i];
		else if (x === "-f" || x === "--file") f.fichier = args[++i];
		else if (x === "-i" || x === "--interpret") f.interprete = true;
		else if (x === "-r" || x === "--raw") f.brut = true;
		else if (x === "-m" || x === "--message") f.types = (args[++i] || "").split(",");
		else if (x === "-sc" || x === "--syscall") f.syscall = args[++i];
		else if (x === "-ui" || x === "--uid") f.uid = args[++i];
		else if (x === "-ua" || x === "-ul" || x === "--loginuid") f.auid = args[++i];
		else if (x === "-x" && cmd === "ausearch" || x === "--executable") f.exe = args[++i];
		else if (x === "-c" && cmd === "ausearch" || x === "--comm") f.comm = args[++i];
		else if (x === "-sv" || x === "--success") f.succes = args[++i];
		else if (x === "--format") f.format = args[++i];
		else if (x === "--start" || x === "-ts"){ t = argsTemps(args, i); f.debut = dateDepuisAudit(t.valeur, true); if (!f.debut) return { erreur: "Invalid start time (" + t.valeur + "). Hint, start time should be in the form MM/DD/YYYY or a keyword like today." }; i += t.saut; }
		else if (x === "--end" || x === "-te"){ t = argsTemps(args, i); f.fin = dateDepuisAudit(t.valeur, false); if (!f.fin) return { erreur: "Invalid end time (" + t.valeur + ")." }; i += t.saut; }
		else if (x === "--input-logs" || x === "-if"){ if (x === "-if") i++; }
		else if (x === "--failed") f.succes = "no";
		else if (x === "--summary") f.resume = true;
		else if (cmd === "aureport" && x === "--success") f.succes = "yes";
		else return { erreur: (cmd === "ausearch" ? "ausearch" : "aureport") + ": unrecognized option '" + x + "'" };
	}
	var liste = a.journal.filter(function(ev){
		if (f.cle && ev.cle !== f.cle) return false;
		if (f.fichier && !(ev.chemin && (ev.chemin === f.fichier || ev.chemin.indexOf(f.fichier.replace(/\/$/, "") + "/") === 0 || ev.chemin.split("/").pop() === f.fichier))) return false;
		if (f.types && f.types.indexOf(ev.type) === -1 && f.types.indexOf("ALL") === -1) return false;
		if (f.syscall && ev.syscall !== f.syscall && String(SYSCALLS_AUDIT[ev.syscall]) !== f.syscall) return false;
		if (f.uid && String(ev.uid) !== f.uid && nomDeUid(ev.uid) !== f.uid) return false;
		if (f.auid && String(ev.auid) !== f.auid && nomDeUid(ev.auid) !== f.auid) return false;
		if (f.exe && ev.exe !== f.exe) return false;
		if (f.comm && ev.comm !== f.comm) return false;
		if (f.succes && (ev.succes ? "yes" : "no") !== f.succes) return false;
		if (f.debut && ev.t < f.debut.getTime()) return false;
		if (f.fin && ev.t > f.fin.getTime()) return false;
		return true;
	});
	return { f: f, liste: liste };
}
Shell.sorts.ausearch = function(args, io){
	var h = exigerAudit(io, "ausearch");
	if (!io.sudo) throw new ShellError("Error opening /var/log/audit/audit.log (Permission denied)" + astuce(io, "Le journal d'audit est réservé à root : sudo ausearch ..."), 1);
	var r = filtrerAudit(h, args, "ausearch");
	if (r.erreur) throw new ShellError(r.erreur, 1);
	GameEvents.fire({ type: "ausearch", hote: h, cle: r.f.cle || null, fichier: r.f.fichier || null, nombre: r.liste.length, evenements: r.liste });
	if (!r.liste.length){ io.code = 1; io.err("<no matches>"); return ""; }
	if (r.f.format === "text") return r.liste.map(texteFormatAudit).join("\n");
	if (r.f.brut || r.f.format === "raw") return r.liste.map(function(ev){ return rendreAudit(ev, false).filter(function(l){ return l.indexOf("----") !== 0 && l.indexOf("time->") !== 0; }).reverse().join("\n"); }).join("\n");
	return r.liste.map(function(ev){ return rendreAudit(ev, !!r.f.interprete).join("\n"); }).join("\n");
};
Shell.sorts.aureport = function(args, io){
	var h = exigerAudit(io, "aureport");
	if (!io.sudo) throw new ShellError("Error opening /var/log/audit/audit.log (Permission denied)" + astuce(io, "sudo aureport ..."), 1);
	var r = filtrerAudit(h, args, "aureport");
	if (r.erreur) throw new ShellError(r.erreur, 1);
	var liste = r.liste, f = r.f, I = !!f.interprete;
	if (io.stdin !== null){
		var series = {};
		String(io.stdin).replace(/msg=audit\([^:]+:(\d+)\)/g, function(t, s){ series[s] = true; return t; });
		liste = liste.filter(function(ev){ return series[ev.s]; });
	}
	function dt(ev){ var d = new Date(ev.t); return deux(d.getMonth() + 1) + "/" + deux(d.getDate()) + "/" + d.getFullYear() + " " + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()); }
	function tableau(titre, colonnes, lignes, largeur){
		var barre = new Array(largeur + 1).join("=");
		return ["", titre, barre, "# " + colonnes, barre].concat(lignes.length ? lignes.map(function(l, k){ return (k + 1) + ". " + l; }) : ["<no events of interest were found>", ""]).join("\n");
	}
	function resumeDe(titre, valeurs){
		var c = {};
		valeurs.forEach(function(v){ if (v !== null && v !== undefined) c[v] = (c[v] || 0) + 1; });
		var cles = Object.keys(c).sort(function(a, b){ return c[b] - c[a] || (a < b ? -1 : 1); });
		return ["", titre, "===========================", "total  " + titre.split(" ")[0].toLowerCase(), "==========================="].concat(cles.length ? cles.map(function(k){ return c[k] + "  " + k; }) : ["<no events of interest were found>", ""]).join("\n");
	}
	var rapport = (f.rapports || [])[0] || null, texte;
	var fichiers = liste.filter(function(ev){ return ev.type === "SYSCALL"; });
	if (rapport === "-f" || rapport === "--file"){
		texte = f.resume ? resumeDe("File Summary Report", fichiers.map(function(ev){ return ev.chemin; })) :
			tableau("File Report", "date time file syscall success exe auid event", fichiers.map(function(ev){ return dt(ev) + " " + ev.chemin + " " + (I ? ev.syscall : SYSCALLS_AUDIT[ev.syscall]) + " " + (ev.succes ? "yes" : "no") + " " + ev.exe + " " + (I ? nomDeUid(ev.auid) : ev.auid) + " " + ev.s; }), 47);
	} else if (rapport === "-k" || rapport === "--key"){
		var avecCle = liste.filter(function(ev){ return ev.cle; });
		texte = f.resume ? resumeDe("Key Summary Report", avecCle.map(function(ev){ return ev.cle; })) :
			tableau("Key Report", "date time key success exe auid event", avecCle.map(function(ev){ return dt(ev) + " " + ev.cle + " " + (ev.succes ? "yes" : "no") + " " + ev.exe + " " + (I ? nomDeUid(ev.auid) : ev.auid) + " " + ev.s; }), 47);
	} else if (rapport === "-x" || rapport === "--executable"){
		texte = f.resume ? resumeDe("Executable Summary Report", liste.map(function(ev){ return ev.exe; })) :
			tableau("Executable Report", "date time exe term host auid event", liste.map(function(ev){ return dt(ev) + " " + ev.exe + " " + (ev.type === "SYSCALL" ? "pts0" : ev.terminal || "ssh") + " " + (ev.adresse || "?") + " " + (I ? nomDeUid(ev.auid) : ev.auid) + " " + ev.s; }), 36);
	} else if (rapport === "-au" || rapport === "--auth"){
		var auth = liste.filter(function(ev){ return ev.type === "USER_AUTH"; });
		texte = tableau("Authentication Report", "date time acct host term exe success event", auth.map(function(ev){ return dt(ev) + " " + (ev.acct || nomDeUid(ev.auid)) + " " + (ev.adresse || "?") + " " + (ev.terminal || "ssh") + " " + ev.exe + " " + (ev.succes ? "yes" : "no") + " " + ev.s; }), 44);
	} else if (rapport === "-l" || rapport === "--login"){
		var log = liste.filter(function(ev){ return ev.type === "USER_LOGIN"; });
		texte = tableau("Login Report", "date time auid host term exe success event", log.map(function(ev){ return dt(ev) + " " + (ev.acct || nomDeUid(ev.auid)) + " " + (ev.adresse || "?") + " " + (ev.terminal || "ssh") + " " + ev.exe + " " + (ev.succes ? "yes" : "no") + " " + ev.s; }), 44);
	} else if (rapport === "-m" || rapport === "--mods"){
		var mods = liste.filter(function(ev){ return /^(ADD_USER|DEL_USER|USER_MGMT|ADD_GROUP|DEL_GROUP|USER_CHAUTHTOK|USER_ACCT)$/.test(ev.type) || (ev.type === "SYSCALL" && /^\/etc\/(passwd|shadow|group|gshadow|sudoers)/.test(ev.chemin) && ev.syscall !== "openat" || (ev.type === "SYSCALL" && /^\/etc\/(passwd|shadow|group|gshadow|sudoers)/.test(ev.chemin) && !ev.lecture)); });
		texte = tableau("Account Modifications Report", "date time auid addr term exe acct success event", mods.map(function(ev){ return dt(ev) + " " + (I ? nomDeUid(ev.auid) : ev.auid) + " " + (ev.adresse || "?") + " " + (ev.type === "SYSCALL" ? "pts0" : ev.terminal || "?") + " " + ev.exe + " " + (ev.acct || ev.chemin || "?") + " " + (ev.succes ? "yes" : "no") + " " + ev.s; }), 49);
	} else if (rapport){
		texte = tableau("Event Report", "date time event type auid success", liste.map(function(ev){ return dt(ev) + " " + ev.s + " " + ev.type + " " + (I ? nomDeUid(ev.auid) : ev.auid) + " " + (ev.succes ? "yes" : "no"); }), 39);
	} else {
		var debut = liste.length ? new Date(liste[0].t) : maintenantGuet(), fin = liste.length ? new Date(liste[liste.length - 1].t) : maintenantGuet();
		function u(champ){ var v = {}; liste.forEach(function(ev){ if (ev[champ] !== undefined && ev[champ] !== null) v[ev[champ]] = 1; }); return Object.keys(v).length; }
		texte = ["", "Summary Report", "======================", "Range of time in logs: " + dateAudit(debut) + ".000 - " + dateAudit(fin) + ".000", "Selected time for report: " + dateAudit(debut) + " - " + dateAudit(fin) + ".000",
			"Number of changes in configuration: " + liste.filter(function(ev){ return ev.type === "CONFIG_CHANGE"; }).length,
			"Number of changes to accounts, groups, or roles: " + liste.filter(function(ev){ return /^(ADD_USER|DEL_USER|USER_MGMT|ADD_GROUP|DEL_GROUP)$/.test(ev.type); }).length,
			"Number of logins: " + liste.filter(function(ev){ return ev.type === "USER_LOGIN" && ev.succes; }).length, "Number of failed logins: " + liste.filter(function(ev){ return ev.type === "USER_LOGIN" && !ev.succes; }).length,
			"Number of authentications: " + liste.filter(function(ev){ return ev.type === "USER_AUTH" && ev.succes; }).length, "Number of failed authentications: " + liste.filter(function(ev){ return ev.type === "USER_AUTH" && !ev.succes; }).length,
			"Number of users: " + u("auid"), "Number of terminals: " + (liste.length ? 2 : 0), "Number of host names: " + u("adresse"), "Number of executables: " + u("exe"), "Number of commands: " + u("comm"),
			"Number of files: " + u("chemin"), "Number of AVC's: 0", "Number of MAC events: 0", "Number of failed syscalls: " + fichiers.filter(function(ev){ return !ev.succes; }).length,
			"Number of anomaly events: 0", "Number of responses to anomaly events: 0", "Number of crypto events: 0", "Number of integrity events: 0", "Number of virt events: 0",
			"Number of keys: " + u("cle"), "Number of process IDs: " + liste.length, "Number of events: " + liste.length].join("\n");
	}
	GameEvents.fire({ type: "aureport", hote: h, rapport: rapport || "summary", resume: !!f.resume, nombre: liste.length });
	return texte;
};

/* ================================================================== */
/* logger, rsyslog                                                     */
/* ================================================================== */

var VERSION_RSYSLOG = "8.2302.0";
var DIRECTIVES_RSYSLOG = ["$fileowner", "$filegroup", "$filecreatemode", "$dircreatemode", "$umask", "$workdirectory", "$includeconfig", "$modload",
	"$actionfiledefaulttemplate", "$repeatedmsgreduction", "$privdroptouser", "$privdroptogroup", "$actionqueuetype", "$actionqueuefilename",
	"$actionqueuemaxdiskspace", "$actionqueuesaveonshutdown", "$actionresumeretrycount", "$actionqueuesize", "$defaultnetstreamdriver",
	"$defaultnetstreamdrivercafile", "$defaultnetstreamdrivercertfile", "$defaultnetstreamdriverkeyfile", "$actionsendstreamdrivermode",
	"$actionsendstreamdriverauthmode", "$actionsendstreamdriverpermittedpeer", "$maxmessagesize", "$preservefqdn", "$systemlogratelimitinterval",
	"$systemlogratelimitburst", "$inputtcpserverrun", "$udpserverrun", "$inputudpserverrun", "$escapecontrolcharactersonreceive",
	"$actionfileenablesync", "$klogpermitnonkernelfacility", "$mainmsgqueuesize", "$imjournalstatefile", "$omfileforcechown"];
var NIVEAUX_RSYSLOG = PRIORITES_SYSLOG.concat(["warn", "error", "panic", "none", "*"]);
function numeroPriorite(p){ var t = { warn: "warning", error: "err", panic: "emerg" }; return PRIORITES_SYSLOG.indexOf(t[p] || p); }
/* La configuration de rsyslog : { regles: [{ selecteurs, action, distant, fichier }], erreurs: [...], fichiers: [...] } */
function lireRsyslog(h, maitre){
	var resultat = { regles: [], erreurs: [], fichiers: [] };
	var principal = maitre || "/etc/rsyslog.conf";
	function erreurVersion(m){ return m + " [v" + VERSION_RSYSLOG + "]"; }
	function lireUn(chemin, profondeur){
		if (profondeur > 8) return;
		var texte = lireFichierHote(h, chemin);
		if (texte === null){ resultat.erreurs.push("rsyslogd: could not open config file '" + chemin + "': No such file or directory [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/2013 ]"); return; }
		resultat.fichiers.push(chemin);
		var lignes = texte.split("\n"), bloc = null, ouverture = 0;
		for (var i = 0; i < lignes.length; i++){
			var l = lignes[i].replace(/\s+#.*$/, "").trim();
			if (l === "" || l.charAt(0) === "#") continue;
			if (bloc !== null){
				bloc += " " + l;
				if (equilibre(bloc)){ traiterBloc(bloc, chemin, ouverture); bloc = null; }
				continue;
			}
			if (/^(module|input|global|template|action|ruleset|include|main_queue|timezone|parser|lookup_table|dyn_stats)\s*\(/i.test(l) || /^(if|else|\}|&|:)/i.test(l)){
				if (/^(if|else|\}|:|&)/i.test(l)){ traiterControle(l, chemin, i + 1); continue; }
				bloc = l; ouverture = i + 1;
				if (equilibre(bloc)){ traiterBloc(bloc, chemin, ouverture); bloc = null; }
				continue;
			}
			if (l.charAt(0) === "$"){
				var mots = l.split(/\s+/), d = mots[0].toLowerCase();
				if (DIRECTIVES_RSYSLOG.indexOf(d) === -1){
					resultat.erreurs.push("rsyslogd: invalid or yet-unknown config file command '" + mots[0].substring(1) + "' - have you forgotten to load a module? [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/3003 ]");
					continue;
				}
				if (d === "$includeconfig") inclure(mots[1] || "", profondeur);
				continue;
			}
			regle(l, chemin, i + 1);
		}
		if (bloc !== null) resultat.erreurs.push("rsyslogd: error during parsing file " + chemin + ", on or before line " + lignes.length + ": syntax error [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/2207 ]");
	}
	function equilibre(t){ var o = (t.match(/\(/g) || []).length, f = (t.match(/\)/g) || []).length; return o === f; }
	function attribut(bloc, nom){ var m = new RegExp(nom + "\\s*=\\s*\"([^\"]*)\"", "i").exec(bloc); return m ? m[1] : null; }
	function inclure(motif, profondeur){
		var coupe = motif.lastIndexOf("/"), dossier = motif.substring(0, coupe), base = motif.substring(coupe + 1);
		if (/[*?[]/.test(base)) fichiersDuDossierGuet(h, dossier, base).forEach(function(f){ lireUn(f.chemin, profondeur + 1); });
		else if (fichierHoteGuet(h, motif)) lireUn(motif, profondeur + 1);
	}
	function traiterBloc(bloc, chemin, n){
		var type = /^(\w+)/.exec(bloc)[1].toLowerCase();
		if (type === "include"){ var f = attribut(bloc, "file"); if (f) inclure(f, 1); return; }
		if (type === "action"){
			var t = (attribut(bloc, "type") || "").toLowerCase();
			if (!t){ resultat.erreurs.push("rsyslogd: action type missing [v" + VERSION_RSYSLOG + "]"); return; }
			if (t === "omfwd"){
				var cible = attribut(bloc, "target"), port = attribut(bloc, "port") || "514", proto = (attribut(bloc, "protocol") || "udp").toLowerCase();
				if (!cible){ resultat.erreurs.push("rsyslogd: parameter 'target' required but not specified [v" + VERSION_RSYSLOG + "]"); return; }
				resultat.regles.push({ masque: masqueTout(), action: (proto === "tcp" ? "@@" : "@") + cible + ":" + port, distant: cible + ":" + port, fichier: null, source: chemin, ligne: n });
			} else if (t === "omfile"){
				var fichier = attribut(bloc, "file");
				if (fichier) resultat.regles.push({ masque: masqueTout(), action: fichier, distant: null, fichier: fichier, source: chemin, ligne: n });
			}
		}
	}
	function traiterControle(l, chemin, n){
		var m = /^&\s*(.*)$/.exec(l);
		if (m && resultat.regles.length){
			var prec = resultat.regles[resultat.regles.length - 1];
			var act = actionRsyslog(m[1]);
			if (act) resultat.regles.push({ masque: prec.masque, action: m[1], distant: act.distant, fichier: act.fichier, stop: act.stop, source: chemin, ligne: n });
		}
	}
	function masqueTout(){ var m = {}; FACILITES_SYSLOG.forEach(function(f){ m[f] = { op: "*" }; }); return m; }
	function regle(l, chemin, n){
		var m = /^(\S+)\s+(.+)$/.exec(l);
		if (!m){ resultat.erreurs.push("rsyslogd: error during parsing file " + chemin + ", on or before line " + n + ": syntax error [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/2207 ]"); return; }
		var masque = {}, ok = true;
		m[1].split(";").forEach(function(sel){
			if (!ok) return;
			var p = /^([^.]+)\.(.+)$/.exec(sel);
			if (!p){ resultat.erreurs.push("rsyslogd: error during parsing file " + chemin + ", on or before line " + n + ": syntax error [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/2207 ]"); ok = false; return; }
			var facs = p[1] === "*" ? FACILITES_SYSLOG : p[1].split(",");
			var pri = p[2], op = "", niveau = pri;
			var mm = /^(!?=?|!?)(.+)$/.exec(pri);
			op = mm[1]; niveau = mm[2];
			if (NIVEAUX_RSYSLOG.indexOf(niveau) === -1){ resultat.erreurs.push(erreurVersion("rsyslogd: unknown priority name \"" + niveau + "\"")); ok = false; return; }
			for (var k = 0; k < facs.length; k++){
				if (FACILITES_SYSLOG.indexOf(facs[k]) === -1 && facs[k] !== "mark"){ resultat.erreurs.push(erreurVersion("rsyslogd: unknown facility name \"" + facs[k] + "\"")); ok = false; return; }
				masque[facs[k]] = niveau === "none" ? null : { op: niveau === "*" ? (op.indexOf("!") > -1 ? "aucun" : "*") : op || ">=", niveau: numeroPriorite(niveau) };
			}
		});
		if (!ok) return;
		var act = actionRsyslog(m[2].trim());
		if (!act){ resultat.erreurs.push("rsyslogd: error during parsing file " + chemin + ", on or before line " + n + ": syntax error [v" + VERSION_RSYSLOG + " try https://www.rsyslog.com/e/2207 ]"); return; }
		if (act.erreur){ resultat.erreurs.push(erreurVersion("rsyslogd: " + act.erreur)); return; }
		resultat.regles.push({ masque: masque, action: m[2].trim(), distant: act.distant, fichier: act.fichier, stop: act.stop, source: chemin, ligne: n });
	}
	lireUn(principal, 0);
	return resultat;
}
function actionRsyslog(a){
	var m;
	if (/^-?\//.test(a)) return { fichier: a.replace(/^-/, "").split(/[;\s]/)[0] };
	if ((m = /^@@?(\(\w+\))?([^:;\s]+)(?::([^;\s]+))?/.exec(a))){
		if (m[3] && !/^\d+$/.test(m[3])) return { erreur: "invalid port \"" + m[3] + "\"" };
		return { distant: m[2] + ":" + (m[3] || "514"), tcp: a.indexOf("@@") === 0 };
	}
	if (/^(stop|~)$/.test(a)) return { stop: true };
	if (/^(:om\w+:|\||\*|\^)/.test(a) || /^[a-z][\w,]*$/.test(a)) return {};
	return null;
}
function correspond(regle, fac, prio){
	var c = regle.masque[fac];
	if (!c) return false;
	if (c.op === "*") return true;
	if (c.op === "aucun") return false;
	if (c.op === ">=") return prio <= c.niveau;
	if (c.op === "=") return prio === c.niveau;
	if (c.op === "!") return prio > c.niveau;
	if (c.op === "!=") return prio !== c.niveau;
	return false;
}
/* Une ligne qui passe par rsyslog : dans ses fichiers, et vers les serveurs distants. */
function versRsyslog(h, ligne, d){
	var g = etatGuet().hotes[h];
	if (!g || !g.rsyslog || !g.rsyslog.conf || !g.rsyslog.conf.length) return;
	if (!serviceActif(h, "rsyslog")) return;
	var texte = dateRsyslog(d) + " " + h + " " + ligne.unite + ": " + ligne.message, distants = [];
	for (var i = 0; i < g.rsyslog.conf.length; i++){
		var r = g.rsyslog.conf[i];
		if (!correspond(r, ligne.fac || "user", ligne.prio)) continue;
		if (r.stop) break;
		if (r.fichier) ajouterAuFichierHote(h, r.fichier, [texte], { mode: "rw-r-----", owner: "root" });
		if (r.distant){
			var liste = g.rsyslog.envois[r.distant] = g.rsyslog.envois[r.distant] || [];
			liste.push("<" + (FACILITES_SYSLOG.indexOf(ligne.fac || "user") * 8 + ligne.prio) + ">" + texte);
			if (liste.length > 60) liste.splice(0, liste.length - 60);
			distants.push(r.distant);
		}
	}
	if (distants.length) GameEvents.fire({ type: "rsyslog", hote: h, action: "forward", ok: true, distants: distants, message: ligne.message });
}
/* Ce que les serveurs de journaux distants ont reçu d'une machine : { "journaux:514": [lignes] } */
function journauxDistants(h){ return machineGardee(h) ? etatHote(h).rsyslog.envois : {}; }

Shell.sorts.logger = function(args, io){
	var h = hoteIci(), tag = JOUEUR, prio = 5, fac = "user", pid = false, stderr = false, morceaux = [], fichier = null, serveur = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-t" || a === "--tag"){ tag = args[++i]; if (tag === undefined) throw new ShellError("logger: option requires an argument -- 't'"); continue; }
		if (a === "-p" || a === "--priority"){
			var p = args[++i] || "", m = /^([a-z0-9]+)\.([a-z]+)$/.exec(p);
			var f2 = m ? m[1] : "user", n2 = m ? m[2] : p;
			if (m && FACILITES_SYSLOG.indexOf(f2) === -1) throw new ShellError("logger: unknown facility name: " + f2);
			if (numeroPriorite(n2) < 0) throw new ShellError("logger: unknown priority name: " + n2);
			fac = f2; prio = numeroPriorite(n2);
			continue;
		}
		if (a === "-i" || a === "--id"){ pid = true; continue; }
		if (a === "-s" || a === "--stderr"){ stderr = true; continue; }
		if (a === "-f" || a === "--file"){ fichier = args[++i]; continue; }
		if (a === "-n" || a === "--server"){ serveur = args[++i]; continue; }
		if (a === "-P" || a === "--port"){ i++; continue; }
		if (a === "-T" || a === "--tcp" || a === "-d" || a === "--udp" || a === "--rfc3164" || a === "--rfc5424"){ continue; }
		if (a === "--"){ morceaux = morceaux.concat(args.slice(i + 1)); break; }
		if (/^-[is]+$/.test(a)){ if (a.indexOf("i") > -1) pid = true; if (a.indexOf("s") > -1) stderr = true; continue; }
		if (a.charAt(0) === "-" && a.length > 1) throw new ShellError("logger: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'logger --help' for more information.");
		morceaux.push(a);
	}
	var messages;
	if (fichier) messages = lignesDe(Shell.objetLisible(fichier, io, "logger").item.getText());
	else if (morceaux.length) messages = [morceaux.join(" ")];
	else if (io.stdin !== null) messages = lignesDe(io.stdin);
	else throw new ShellError("logger : que faut-il écrire au journal ?" + astuce(io, "Exemple : logger -p auth.warning -t bastion \"Test de la Tour de Guet\""));
	var unite = tag + (pid ? "[" + (2000 + state.nbCommandes % 5000) + "]" : "");
	if (serveur){
		var e = machineGardee(h) ? etatHote(h) : null;
		if (e){ var cle = serveur + ":514"; (e.rsyslog.envois[cle] = e.rsyslog.envois[cle] || []).push.apply(e.rsyslog.envois[cle], messages.map(function(m){ return "<" + (FACILITES_SYSLOG.indexOf(fac) * 8 + prio) + ">" + dateRsyslog(maintenantGuet()) + " " + h + " " + unite + ": " + m; })); }
	} else if (machineGardee(h)){
		messages.forEach(function(m){ journalGuet(h, { unite: unite, message: m, prio: prio, fac: fac }); });
	}
	GameEvents.fire({ type: "logger", hote: h, tag: tag, priorite: fac + "." + PRIORITES_SYSLOG[prio], message: messages.join("\n"), serveur: serveur });
	if (stderr) io.err(messages.map(function(m){ return "<" + (FACILITES_SYSLOG.indexOf(fac) * 8 + prio) + ">" + dateSyslogCourte(maintenantGuet()) + " " + unite + ": " + m; }).join("\n"));
	if (!machineGardee(h) && io.tty) return astuce(io, "Ta Maison n'a pas de journal système : logger écrit sur les serveurs (journalctl, /var/log/syslog).").replace(/^\n/, "");
	return "";
};
Shell.sorts.rsyslogd = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h) || !fichierHoteGuet(h, "/etc/rsyslog.conf")) absentIci(io, "rsyslogd", "rsyslog");
	var niveau = null, maitre = "/etc/rsyslog.conf";
	for (var i = 0; i < args.length; i++){
		var m = /^-N(\d)?$/.exec(args[i]);
		if (m){ niveau = m[1] || args[++i] || "1"; continue; }
		if (args[i] === "-f"){ maitre = args[++i]; continue; }
		if (/^-f./.test(args[i])){ maitre = args[i].substring(2); continue; }
		if (args[i] === "-v" || args[i] === "--version") return "rsyslogd  " + VERSION_RSYSLOG + " (aka 2023.02) compiled with:\n\tPLATFORM:\t\t\t\tx86_64-pc-linux-gnu\n\tFEATURE_REGEXP:\t\t\t\tYes\n\tGSSAPI Kerberos 5 support:\t\tYes";
	}
	if (niveau === null){
		throw new ShellError("rsyslogd: pidfile '/run/rsyslogd.pid' and pid " + (812) + " already exist.\nIf you want to run multiple instances of rsyslog, you need to specify\ndifferent pid files for them (-i option).\n" +
			"rsyslogd: run failed with error -3000 (see rsyslog.h or try https://www.rsyslog.com/e/3000 to learn what that number means)" +
			astuce(io, "rsyslog tourne déjà. Pour vérifier une configuration : rsyslogd -N1 ; pour la faire relire : sudo systemctl restart rsyslog."));
	}
	var r = lireRsyslog(h, maitre);
	io.err("rsyslogd: version " + VERSION_RSYSLOG + ", config validation run (level " + niveau + "), master config " + maitre);
	r.erreurs.forEach(function(x){ io.err(x); });
	GameEvents.fire({ type: "rsyslog", hote: h, action: "check", ok: !r.erreurs.length, distants: r.regles.filter(function(x){ return x.distant; }).map(function(x){ return x.distant; }) });
	if (r.erreurs.length){ io.code = 1; return ""; }
	io.err("rsyslogd: End of config validation run. Bye.");
	return "";
};

/* ================================================================== */
/* logrotate                                                            */
/* ================================================================== */

var OPTIONS_LOGROTATE = ["daily", "weekly", "monthly", "yearly", "hourly", "rotate", "compress", "nocompress", "delaycompress", "nodelaycompress", "missingok",
	"nomissingok", "notifempty", "ifempty", "create", "nocreate", "copytruncate", "nocopytruncate", "copy", "nocopy", "dateext", "nodateext", "dateformat", "dateyesterday",
	"maxage", "minage", "minsize", "size", "maxsize", "sharedscripts", "nosharedscripts", "postrotate", "prerotate", "firstaction", "lastaction", "preremove",
	"endscript", "su", "olddir", "noolddir", "compresscmd", "uncompresscmd", "compressext", "compressoptions", "extension", "tabooext", "include", "mail",
	"nomail", "mailfirst", "maillast", "start", "shred", "noshred", "shredcycles", "createolddir", "nocreateolddir", "renamecopy", "norenamecopy", "allowhardlink"];
function lireLogrotate(h, chemins, io){
	var resultat = { blocs: [], erreurs: [], lus: [] }, global = { rotate: 0, frequence: "weekly" };
	function copie(o){ var c = {}; for (var k in o) if (o.hasOwnProperty(k)) c[k] = o[k]; return c; }
	function lireChemin(chemin, profondeur){
		if (profondeur > 6) return;
		var n = noeudHoteGuet(h, chemin);
		if (n === null){ resultat.erreurs.push("error: cannot stat " + chemin + ": No such file or directory"); return; }
		if (n instanceof Room){ fichiersDuDossierGuet(h, chemin, "*").filter(function(f){ return !/(\.dpkg-|~$|\.bak$|\.disabled$)/.test(f.nom); }).forEach(function(f){ lireChemin(f.chemin, profondeur + 1); }); return; }
		if (/[wW]/.test(n.mode.charAt(4)) || /[wW]/.test(n.mode.charAt(7))){ resultat.erreurs.push("error: Ignoring " + chemin + " because of bad file mode - must be 0644 or 0444."); return; }
		// Lancé par un utilisateur (sans sudo), logrotate accepte aussi ses propres fichiers de configuration.
		if (n.owner !== "root" && !(io && !io.sudo && n.owner === JOUEUR)){ resultat.erreurs.push("error: Ignoring " + chemin + " because the file owner is wrong (should be root or user with uid 0)."); return; }
		resultat.lus.push(chemin);
		var lignes = n.getText().split("\n"), bloc = null, script = false;
		for (var i = 0; i < lignes.length; i++){
			var l = lignes[i].trim(), num = i + 1;
			if (script){ if (l === "endscript") script = false; continue; }
			if (l === "" || l.charAt(0) === "#") continue;
			if (/\{$/.test(l) && bloc === null){
				var motifs = l.replace(/\{$/, "").trim().split(/\s+/).filter(Boolean);
				if (!motifs.length){ resultat.erreurs.push("error: " + chemin + ":" + num + " missing log file name before '{'"); continue; }
				bloc = { motifs: motifs, o: copie(global), fichier: chemin, ligne: num };
				continue;
			}
			if (l === "}"){
				if (bloc === null){ resultat.erreurs.push("error: " + chemin + ":" + num + " unexpected }"); continue; }
				resultat.blocs.push(bloc); bloc = null; continue;
			}
			var mots = l.split(/\s+/), cle = mots[0];
			if (OPTIONS_LOGROTATE.indexOf(cle) === -1){
				if (bloc === null && /^\//.test(cle)){ resultat.erreurs.push("error: " + chemin + ":" + num + " missing '{' after log files definition"); continue; }
				resultat.erreurs.push("error: " + chemin + ":" + num + " unknown option '" + cle + "' -- ignoring line");
				continue;
			}
			if (cle === "include"){ lireChemin(mots[1] || "", profondeur + 1); continue; }
			if (cle === "postrotate" || cle === "prerotate" || cle === "firstaction" || cle === "lastaction" || cle === "preremove"){ script = true; continue; }
			var cible = bloc ? bloc.o : global;
			var booleens = { compress: ["compress", true], nocompress: ["compress", false], delaycompress: ["delaycompress", true], nodelaycompress: ["delaycompress", false],
				missingok: ["missingok", true], nomissingok: ["missingok", false], notifempty: ["notifempty", true], ifempty: ["notifempty", false],
				copytruncate: ["copytruncate", true], nocopytruncate: ["copytruncate", false], dateext: ["dateext", true], nodateext: ["dateext", false],
				sharedscripts: ["sharedscripts", true], nosharedscripts: ["sharedscripts", false], nocreate: ["create", false] };
			if (/^(daily|weekly|monthly|yearly|hourly)$/.test(cle)) cible.frequence = cle;
			else if (cle === "rotate"){ if (!/^-?\d+$/.test(mots[1] || "")){ resultat.erreurs.push("error: " + chemin + ":" + num + " bad rotation count '" + (mots[1] || "") + "'"); continue; } cible.rotate = +mots[1]; }
			else if (cle === "size" || cle === "maxsize" || cle === "minsize") cible[cle] = mots[1];
			else if (cle === "create") cible.create = mots.length > 1 ? { mode: mots[1], owner: mots[2] || "root", groupe: mots[3] || "root" } : { mode: null };
			else if (cle === "su") cible.su = mots.slice(1).join(" ");
			else if (booleens[cle]) cible[booleens[cle][0]] = booleens[cle][1];
		}
		if (bloc !== null) resultat.erreurs.push("error: " + chemin + ":" + lignes.length + " missing '}' at end of file");
	}
	chemins.forEach(function(c){ lireChemin(c, 0); });
	return resultat;
}
Shell.sorts.logrotate = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h) || !fichierHoteGuet(h, "/etc/logrotate.conf") && !dossierHoteGuet(h, "/etc/logrotate.d")) absentIci(io, "logrotate");
	var debug = false, force = false, bavard = false, chemins = [], etatFichier = "/var/lib/logrotate/status";
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-d" || a === "--debug"){ debug = true; continue; }
		if (a === "-f" || a === "--force"){ force = true; continue; }
		if (a === "-v" || a === "--verbose"){ bavard = true; continue; }
		if (a === "-s" || a === "--state"){ etatFichier = args[++i]; continue; }
		if (/^-[dfv]+$/.test(a)){ if (a.indexOf("d") > -1) debug = true; if (a.indexOf("f") > -1) force = true; if (a.indexOf("v") > -1) bavard = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("logrotate: bad argument " + a + ": unknown option\nUsage: logrotate [-dfv?] [-d|--debug] [-f|--force] [-v|--verbose] [-s|--state=statefile] <configfile>");
		var r = Shell.chercher(a, io, "logrotate");
		chemins.push(r.node instanceof Room ? cheminDeLieu(r.node) : cheminDeLieu(r.dir) + "/" + r.name);
	}
	if (!chemins.length) throw new ShellError("logrotate 3.21.0 - Copyright (C) 1995-2001 Red Hat, Inc.\nThis may be freely redistributed under the terms of the GNU General Public License\n\nUsage: logrotate [-dfv?] [-d|--debug] [-f|--force] [-v|--verbose] <configfile>");
	var sortie = [], lu = lireLogrotate(h, chemins, io), maintenant = maintenantGuet(), tournes = [];
	if (debug) sortie.push("warning: logrotate in debug mode does nothing except printing debug messages!  Consider using verbose mode (-v) instead if this is not what you want.", "");
	lu.lus.forEach(function(c){ if (debug || bavard) sortie.push("reading config file " + c); });
	var etatTexte = lireFichierHote(h, etatFichier) || "", dernieres = {};
	etatTexte.split("\n").forEach(function(l){ var m = /^"(.+)" (\d+)-(\d+)-(\d+)-(\d+):(\d+):(\d+)$/.exec(l); if (m) dernieres[m[1]] = new Date(+m[2], +m[3] - 1, +m[4], +m[5], +m[6], +m[7]); });
	if (debug || bavard) sortie.push("Reading state from file: " + etatFichier, "Allocating hash table for state file, size 64 entries");
	var listes = lu.blocs.map(function(b){
		var fichiers = [];
		b.motifs.forEach(function(m){
			var coupe = m.lastIndexOf("/"), dossier = m.substring(0, coupe), base = m.substring(coupe + 1);
			if (/[*?[]/.test(base)) fichiersDuDossierGuet(h, dossier, base).filter(function(f){ return !/\.(\d+)(\.gz)?$/.test(f.nom); }).forEach(function(f){ fichiers.push(f.chemin); });
			else fichiers.push(m);
		});
		return fichiers;
	});
	if (debug || bavard){
		listes.forEach(function(l){ l.forEach(function(c){ if (!dernieres[c]) sortie.push("Creating new state"); }); });
		sortie.push("", "Handling " + lu.blocs.length + " logs");
	}
	var echecs = lu.erreurs.slice();
	lu.blocs.forEach(function(b, k){
		var o = b.o, fichiers = listes[k];
		var freq = force ? "forced from command line" : (o.size ? "after " + o.size + " bytes" : o.frequence);
		if (debug || bavard){
			sortie.push("", "rotating pattern: " + b.motifs.join(" ") + "  " + freq + " (" + (o.rotate || 0) + " rotations)");
			sortie.push("empty log files are " + (o.notifempty ? "not " : "") + "rotated, " + (o.maxage ? "old logs mailed to nobody" : "old logs are removed"));
		}
		if (!fichiers.length && (debug || bavard)) sortie.push("No logs found. Rotation not needed.");
		fichiers.forEach(function(chemin){
			var item = fichierHoteGuet(h, chemin);
			if (debug || bavard) sortie.push("considering log " + chemin);
			if (!item){
				if (o.missingok){ if (debug || bavard) sortie.push("  log " + chemin + " does not exist -- skipping"); }
				else echecs.push("error: stat of " + chemin + " failed: No such file or directory");
				return;
			}
			var dossier = dossierHoteGuet(h, chemin.replace(/\/[^\/]+$/, ""));
			if (dossier && (dossier.mode.charAt(7) === "w" || dossier.mode.charAt(4) === "w") && !o.su){
				echecs.push("error: skipping \"" + chemin + "\" because parent directory has insecure permissions (It's world writable or writable by group which is not \"root\") Set \"su\" directive in config file to tell logrotate which user/group should be used for rotation.");
				return;
			}
			var derniere = dernieres[chemin];
			if (debug || bavard){ sortie.push("  Now: " + dateIsoGuet(maintenant).substring(0, 16)); sortie.push("  Last rotated at " + (derniere ? dateIsoGuet(derniere).substring(0, 16) : dateIsoGuet(maintenant).substring(0, 16))); }
			var vide = item.getText() === "";
			var aFaire = force;
			if (!aFaire && o.size) aFaire = versOctetsUtf8(item.getText()).length >= tailleOctetsLogrotate(o.size);
			else if (!aFaire && derniere){
				var jours = (maintenant - derniere) / 86400000, seuil = { hourly: 1 / 24, daily: 1, weekly: 7, monthly: 28, yearly: 365 }[o.frequence] || 7;
				aFaire = jours >= seuil;
			}
			if (vide && o.notifempty){ if (debug || bavard) sortie.push("  log does not need rotating (log is empty)"); return; }
			if (!aFaire){ if (debug || bavard) sortie.push("  log does not need rotating (log has been rotated at " + dateIsoGuet(derniere || maintenant).substring(0, 16).replace(/:0(\d)$/, ":$1") + ", which is less than " + ({ daily: "a day", weekly: "a week", monthly: "a month", yearly: "a year", hourly: "an hour" }[o.frequence] || "a week") + " ago)"); return; }
			if (debug || bavard) sortie.push("  log needs rotating", "rotating log " + chemin + ", log->rotateCount is " + (o.rotate || 0));
			var ext = o.compress ? ".gz" : "";
			var dossierAMoi = (function(){ var dl = dossierHoteGuet(h, chemin.replace(/\/[^\/]+$/, "")); return !!dl && dl.owner === JOUEUR && item.owner === JOUEUR; })();
			if (!debug && !io.sudo && !dossierAMoi){ echecs.push("error: error renaming " + chemin + " to " + chemin + ".1: Permission denied"); return; }
			var n = o.rotate || 0;
			for (var j = n; j >= 1; j--){
				var plusVieux = [chemin + "." + j + ext, chemin + "." + j];
				plusVieux.forEach(function(p){
					if (!fichierHoteGuet(h, p)) return;
					if (j === n){ if (debug || bavard) sortie.push("removing old log " + p); if (!debug) supprimerFichierHoteGuet(h, p); }
					else {
						var dest = p.replace(new RegExp("\\." + j + "(\\.gz)?$"), "." + (j + 1) + "$1");
						if (debug || bavard) sortie.push("renaming " + p + " to " + dest + " (rotatecount " + n + ", logstart 1, i " + j + "), ");
						if (!debug){ var it = fichierHoteGuet(h, p); supprimerFichierHoteGuet(h, dest); it.itemname = dest.split("/").pop(); }
					}
				});
			}
			if (n === 0){ if (debug || bavard) sortie.push("log " + chemin + " has no rotations: content removed"); if (!debug) item.setText(""); tournes.push(chemin); return; }
			var cible = chemin + ".1" + (o.compress && !o.delaycompress ? ".gz" : "");
			if (debug || bavard) sortie.push((o.copytruncate ? "copying " : "renaming ") + chemin + " to " + chemin + ".1");
			if (!debug){
				var dossierLog = dossierHoteGuet(h, chemin.replace(/\/[^\/]+$/, ""));
				var copie = new Item(chemin.split("/").pop() + ".1", item.getText(), "item_manuscript.gif");
				copie.owner = item.owner; copie.mode = item.mode;
				if (o.compress && !o.delaycompress){ copie.gzip = { contenu: copie.getText(), nom: copie.itemname }; copie.setText(brouiller(copie.getText(), "logrotate")); copie.itemname += ".gz"; }
				if (o.delaycompress && o.compress){
					var second = fichierHoteGuet(h, chemin + ".2");
					if (second){ second.gzip = { contenu: second.getText(), nom: second.itemname }; second.setText(brouiller(second.getText(), "logrotate2")); second.itemname += ".gz"; }
				}
				dossierLog.addItem(copie);
				if (o.copytruncate || o.create){
					item.setText("");
					if (o.create && o.create.mode){ item.mode = modeDepuisOctal(o.create.mode) || item.mode; item.owner = o.create.owner || item.owner; }
				} else dossierLog.removeItem(item);
			}
			if (o.compress && !o.delaycompress && (debug || bavard)) sortie.push("compressing log with: /bin/gzip");
			if (o.create && !o.copytruncate && (debug || bavard)) sortie.push("creating new " + chemin + " mode = 0" + (o.create && o.create.mode ? String(o.create.mode).replace(/^0/, "") : modeEnNombre(item.mode).toString(8)) + " uid = 0 gid = " + (o.create && o.create.groupe === "adm" ? 4 : 0));
			tournes.push(chemin);
			dernieres[chemin] = maintenant;
			void cible;
		});
	});
	if (!debug && tournes.length){
		var etatLignes = ["logrotate state -- version 2"].concat(Object.keys(dernieres).map(function(c){ var d = dernieres[c]; return "\"" + c + "\" " + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "-" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds(); }));
		poserFichierHote(h, etatFichier, etatLignes.join("\n"), { mode: "rw-r--r--" });
	}
	echecs.forEach(function(x){ io.err(x); });
	if (echecs.length) io.code = 1;
	GameEvents.fire({ type: "logrotate", hote: h, debug: debug, force: force, fichiers: tournes, erreurs: echecs.length, configs: lu.lus });
	return sortie.join("\n");
};
function tailleOctetsLogrotate(t){
	var m = /^(\d+)([kMG]?)$/.exec(String(t || ""));
	if (!m) return Infinity;
	return +m[1] * ({ "": 1, k: 1024, M: 1048576, G: 1073741824 }[m[2]]);
}
function modeDepuisOctal(o){
	var m = /^0?([0-7]{3})$/.exec(String(o || ""));
	if (!m) return null;
	return m[1].split("").map(function(c){ var n = +c; return (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-"); }).join("");
}

/* ================================================================== */
/* journald : Storage, journalctl --disk-usage et le reste              */
/* ================================================================== */

function stockageJournald(h){
	var valeur = "auto";
	[["/etc/systemd/journald.conf"]].concat([fichiersDuDossierGuet(h, "/etc/systemd/journald.conf.d", "*.conf").map(function(f){ return f.chemin; })]).forEach(function(liste){
		liste.forEach(function(c){
			var section = null;
			(lireFichierHote(h, c) || "").split("\n").forEach(function(l){
				var t = l.trim();
				if (/^\[.*\]$/.test(t)){ section = t; return; }
				var m = /^Storage\s*=\s*(\S+)/.exec(t);
				if (m && section === "[Journal]") valeur = m[1].toLowerCase();
			});
		});
	});
	if (valeur === "auto") return dossierHoteGuet(h, "/var/log/journal") ? "persistent" : "volatile";
	if (valeur === "persistent" || valeur === "volatile" || valeur === "none") return valeur;
	return "volatile";
}
var JOURNALCTL_AVANT_GUET = Shell.sorts.journalctl;
Shell.sorts.journalctl = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h)) return JOURNALCTL_AVANT_GUET.apply(this, arguments);
	var e = etatHote(h), reste = [], tag = null, prioMax = null, motif = null, special = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "--disk-usage" || a === "--header" || a === "--flush" || a === "--rotate" || a === "--list-boots" || a === "--sync" || /^--vacuum-(size|time|files)=/.test(a)){ special = a; continue; }
		if (a === "-t" || a === "--identifier"){ tag = args[++i]; continue; }
		if ((m = /^--identifier=(.+)$/.exec(a))){ tag = m[1]; continue; }
		if (a === "-p" || a === "--priority"){ var p = args[++i] || ""; prioMax = /^\d$/.test(p) ? +p : numeroPriorite(p.split("..").pop()); if (prioMax < 0) throw new ShellError("Unknown log level " + p); continue; }
		if ((m = /^--priority=(.+)$/.exec(a))){ prioMax = /^\d$/.test(m[1]) ? +m[1] : numeroPriorite(m[1]); continue; }
		if (a === "-g" || a === "--grep"){ motif = args[++i]; continue; }
		if (a === "-k" || a === "--dmesg"){ tag = "kernel"; continue; }
		if (a === "-b" || a === "--boot" || a === "-a" || a === "--all" || a === "-q" || a === "--quiet" || a === "--no-hostname" || a === "--utc") continue;
		if (a === "-o" || a === "--output"){ i++; continue; }
		reste.push(a);
	}
	if (special){
		var persistant = e.journald === "persistent", id = hexDe("machine-id:" + h, 32);
		if (special === "--disk-usage"){
			GameEvents.fire({ type: "journald", hote: h, stockage: e.journald, action: "disk-usage" });
			return "Archived and active journals take " + (persistant ? "24.0M" : "8.0M") + " in the file system." +
				astuce(io, persistant ? "Stockage persistant : les journaux sont dans /var/log/journal, ils survivent au redémarrage." : "Stockage volatil : les journaux vivent dans /run/log/journal, en mémoire. Au prochain redémarrage, tout est perdu. Storage=persistent dans /etc/systemd/journald.conf, puis sudo systemctl restart systemd-journald.");
		}
		if (special === "--header"){
			if (!io.sudo) throw new ShellError("No journal files were opened due to insufficient permissions.");
			return "File path: " + (persistant ? "/var/log/journal/" : "/run/log/journal/") + id + "/system.journal\nFile ID: " + hexDe("file-id:" + h, 32) + "\nMachine ID: " + id +
				"\nBoot ID: " + hexDe("boot:" + h, 32) + "\nSequential number ID: " + hexDe("seq:" + h, 32) + "\nState: ONLINE\nCompatible flags: TAIL_ENTRY_BOOT_ID\nIncompatible flags: COMPRESSED-ZSTD KEYED-HASH COMPACT\nHeader size: 272\nArena size: 8388336";
		}
		if (special === "--list-boots"){
			return "IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY                 \n  0 " + hexDe("boot:" + h, 32) + " " + JOURS_EN[maintenantGuet().getDay()] + " " + dateIsoGuet(new Date(maintenantGuet().getTime() - 4 * 3600000)) + " CET " + JOURS_EN[maintenantGuet().getDay()] + " " + dateIsoGuet(maintenantGuet()) + " CET";
		}
		if (!io.sudo) throw new ShellError("Failed to " + special.replace(/^--/, "").replace(/=.*/, "") + " journal: Permission denied" + astuce(io, "sudo journalctl " + special));
		if (special === "--flush" && !persistant) return "";
		if (/^--vacuum/.test(special)) return "Vacuuming done, freed 0B of archived journals from " + (persistant ? "/var/log/journal/" : "/run/log/journal/") + id + ".";
		return "";
	}
	var base = (function(){ var j = (HOTES[h] && HOTES[h].journal) || []; return typeof j === "function" ? j() : j; })();
	var tout = (base || []).map(function(x, k){ return { e: x, k: k, cle: (x.heure || "00:00") + ":" + (x.secondes || "00") }; })
		.concat(e.journal.map(function(x, k){ return { e: x, k: 10000 + k, cle: x.heure + ":" + x.secondes, t: x.t }; }))
		// Les entrées datées (t) se rangent par leur instant, après le journal d'origine : passé minuit, 00:15 vient après 23:50.
		.sort(function(a, b){
			if (a.t && b.t) return a.t - b.t || a.k - b.k;
			if (a.t || b.t) return a.t ? 1 : -1;
			return a.cle < b.cle ? -1 : (a.cle > b.cle ? 1 : a.k - b.k);
		}).map(function(x){ return x.e; });
	if (tag !== null) tout = tout.filter(function(x){ return String(x.unite).replace(/\[\d+\]$/, "") === tag; });
	if (prioMax !== null) tout = tout.filter(function(x){ return (x.prio === undefined ? 6 : x.prio) <= prioMax; });
	if (motif !== null){ var re; try { re = new RegExp(motif); } catch (x){ throw new ShellError("Failed to compile pattern: " + motif); } tout = tout.filter(function(x){ return re.test(x.message); }); }
	var descripteur = HOTES[h] ? Object.getOwnPropertyDescriptor(HOTES[h], "journal") : null;
	if (!HOTES[h]) return JOURNALCTL_AVANT_GUET.call(this, reste, io);
	Object.defineProperty(HOTES[h], "journal", { configurable: true, enumerable: true, writable: true, value: tout });
	try { return JOURNALCTL_AVANT_GUET.call(this, reste, io); }
	finally {
		if (descripteur) Object.defineProperty(HOTES[h], "journal", descripteur);
		else delete HOTES[h].journal;
	}
};

/* ================================================================== */
/* L'heure : timedatectl, chronyc                                       */
/* ================================================================== */

function serviceNtp(h){
	if (assurerService(h, "chrony")) return "chrony";
	if (((HOTES[h] || {}).services || {})["systemd-timesyncd"]) return "systemd-timesyncd";
	return null;
}
function sourcesChrony(h){
	var texte = lireFichierHote(h, "/etc/chrony/chrony.conf");
	if (texte === null) return [];
	var lignes = lignesConf(texte).map(function(l){ return l.texte.trim(); });
	lignesConf(texte).forEach(function(l){
		var m = /^(sourcedir|confdir|include)\s+(\S+)/.exec(l.texte.trim());
		if (!m) return;
		var motif = m[1] === "include" ? m[2] : m[2].replace(/\/$/, "") + "/" + (m[1] === "sourcedir" ? "*.sources" : "*.conf");
		var coupe = motif.lastIndexOf("/");
		fichiersDuDossierGuet(h, motif.substring(0, coupe), motif.substring(coupe + 1)).forEach(function(f){ lignesConf(lireFichierHote(h, f.chemin)).forEach(function(x){ lignes.push(x.texte.trim()); }); });
	});
	var sources = [];
	lignes.forEach(function(l){
		var m = /^(server|pool|peer)\s+(\S+)/.exec(l);
		if (!m) return;
		var joignable = portJoignable(h, trouverHote(m[2]) || m[2], 123) !== false;
		if (m[1] === "pool") for (var k = 1; k <= 4; k++) sources.push({ nom: "ntp" + k + "." + m[2].replace(/^\d+\./, ""), joignable: joignable, pool: true });
		else sources.push({ nom: m[2], joignable: joignable });
	});
	return sources;
}
function horlogeSynchronisee(h){
	var ntp = serviceNtp(h);
	if (!ntp || !serviceActif(h, ntp)) return false;
	if (ntp === "chrony") return sourcesChrony(h).some(function(s){ return s.joignable; });
	return true;
}
function gereHeure(h){ return machineGardee(h) && (!!fichierHoteGuet(h, "/etc/chrony/chrony.conf") || !!((HOTES[h] || {}).services || {})["systemd-timesyncd"]); }
var TIMEDATECTL_AVANT_GUET = Shell.sorts.timedatectl;
Shell.sorts.timedatectl = function(args, io){
	var h = hoteIci();
	if (!gereHeure(h)) return TIMEDATECTL_AVANT_GUET.apply(this, arguments);
	var e = etatHote(h), mots = args.filter(function(a){ return a.charAt(0) !== "-"; }), action = mots[0] || "status";
	var ntp = serviceNtp(h), actif = ntp ? serviceActif(h, ntp) : false, sync = horlogeSynchronisee(h);
	var d = maintenantGuet(), hiver = d.getMonth() < 2 || d.getMonth() > 9 || (d.getMonth() === 2 && d.getDate() < 25) || (d.getMonth() === 9 && d.getDate() >= 26);
	var tz = e.fuseau || "Europe/Paris", zone = tz === "UTC" ? "UTC" : (hiver ? "CET" : "CEST"), dec = tz === "UTC" ? 0 : (hiver ? 1 : 2);
	var utc = new Date(d.getTime() - dec * 3600000);
	function f(x){ return JOURS_EN[x.getDay()] + " " + dateIsoGuet(x); }
	if (action === "status"){
		GameEvents.fire({ type: "timedatectl", action: "status", host: h, hote: h, synchronise: sync });
		return "               Local time: " + f(d) + " " + zone + "\n           Universal time: " + f(utc) + " UTC\n                 RTC time: " + f(utc) + "\n" +
			"                Time zone: " + tz + " (" + zone + ", " + (dec >= 0 ? "+" : "-") + "0" + Math.abs(dec) + "00)\nSystem clock synchronized: " + (sync ? "yes" : (io.tty ? C.rouge("no") : "no")) +
			"\n              NTP service: " + (ntp ? (actif ? "active" : "inactive") : "n/a") + "\n          RTC in local TZ: no" +
			(!sync && io.tty ? astuce(io, actif ? "Le service de temps tourne, mais aucune source ne répond : regarde les lignes server/pool de /etc/chrony/chrony.conf (chronyc sources)." : "Pas de synchronisation : l'horloge dérive, et les journaux de deux machines ne se recoupent plus. sudo timedatectl set-ntp true") : "");
	}
	if (action === "show"){
		return ["Timezone=" + tz, "LocalRTC=no", "CanNTP=" + (ntp ? "yes" : "no"), "NTP=" + (actif ? "yes" : "no"), "NTPSynchronized=" + (sync ? "yes" : "no"),
			"TimeUSec=" + JOURS_EN[d.getDay()] + " " + dateIsoGuet(d) + " " + zone, "RTCTimeUSec=" + JOURS_EN[d.getDay()] + " " + dateIsoGuet(utc)].join("\n");
	}
	if (action === "set-ntp"){
		var valeur = mots[1];
		if (!/^(true|false|yes|no|1|0|on|off)$/.test(valeur || "")) throw new ShellError("Failed to parse argument: " + (valeur || ""));
		if (!io.sudo) throw new ShellError("Failed to set ntp: Access denied" + astuce(io, "sudo timedatectl set-ntp true"));
		if (!ntp) throw new ShellError("Failed to set ntp: NTP not supported");
		var oui = /^(true|yes|1|on)$/.test(valeur), s = HOTES[h].services[ntp];
		s.auto = oui;
		if (oui && !s.actif) demarrerService(h, ntp);
		if (!oui && s.actif) arreterService(h, ntp);
		GameEvents.fire({ type: "timedatectl", action: "set-ntp", oui: oui, host: h, hote: h, service: ntp });
		return "";
	}
	if (action === "set-timezone"){
		if (!io.sudo) throw new ShellError("Failed to set time zone: Access denied");
		if (!/^(UTC|[A-Z][a-z]+\/[A-Za-z_]+)$/.test(mots[1] || "")) throw new ShellError("Failed to set time zone: Invalid or not installed time zone '" + (mots[1] || "") + "'");
		e.fuseau = mots[1];
		GameEvents.fire({ type: "timedatectl", action: "set-timezone", host: h, hote: h, fuseau: mots[1] });
		return "";
	}
	if (action === "set-time"){
		if (actif) throw new ShellError("Failed to set time: Automatic time synchronization is enabled" + astuce(io, "Avec la synchronisation active, on ne règle pas l'heure à la main."));
		if (!io.sudo) throw new ShellError("Failed to set time: Access denied");
		return "";
	}
	if (action === "timesync-status" || action === "show-timesync"){
		if (ntp !== "systemd-timesyncd") throw new ShellError("Failed to query server: Could not activate remote peer: Unit dbus-org.freedesktop.timesync1.service not found." + astuce(io, "Ici, l'heure est tenue par chrony : chronyc tracking, chronyc sources."));
		return TIMEDATECTL_AVANT_GUET.apply(this, arguments);
	}
	if (action === "list-timezones") return ["Europe/Paris", "Europe/London", "UTC", "America/New_York", "Africa/Casablanca"].join("\n");
	throw new ShellError("Unknown command verb " + action + ".");
};
var CHRONYC_AVANT_GUET = Shell.sorts.chronyc;
Shell.sorts.chronyc = function(args, io){
	var h = hoteIci();
	if (!machineGardee(h) || !fichierHoteGuet(h, "/etc/chrony/chrony.conf")) return CHRONYC_AVANT_GUET.apply(this, arguments);
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; }), action = mots[0] || "tracking";
	assurerService(h, "chrony");
	if (!serviceActif(h, "chrony")) throw new ShellError("506 Cannot talk to daemon" + astuce(io, "chrony est arrêté : sudo systemctl enable --now chrony (ou sudo timedatectl set-ntp true)."), 1);
	var sources = sourcesChrony(h), joignables = sources.filter(function(s){ return s.joignable; });
	var ref = joignables[0], d = maintenantGuet();
	GameEvents.fire({ type: "chronycGuet", host: h, hote: h, action: action, synchronise: !!ref });
	function ipDe(nom){ var x = trouverHote(nom); return x && HOTES[x] && HOTES[x].ip ? HOTES[x].ip : (/^\d+\.\d+\.\d+\.\d+$/.test(nom) ? nom : "10." + (condense(nom) % 200) + "." + (condense(nom + "b") % 250) + "." + (1 + condense(nom + "c") % 250)); }
	if (action === "tracking"){
		if (!ref) return "Reference ID    : 00000000 ()\nStratum         : 0\nRef time (UTC)  : Thu Jan 01 00:00:00 1970\nSystem time     : 0.000000000 seconds fast of NTP time\nLast offset     : +0.000000000 seconds\n" +
			"RMS offset      : 0.000000000 seconds\nFrequency       : 0.000 ppm slow\nResidual freq   : +0.000 ppm\nSkew            : 0.000 ppm\nRoot delay      : 1.000000000 seconds\nRoot dispersion : 1.000000000 seconds\n" +
			"Update interval : 0.0 seconds\nLeap status     : Not synchronised" + astuce(io, "Aucune source ne répond : l'horloge n'est pas synchronisée. Regarde chronyc sources.");
		var ip = ipDe(ref.nom), refId = ip.split(".").map(function(x){ return ("0" + (+x).toString(16)).slice(-2).toUpperCase(); }).join("");
		return "Reference ID    : " + refId + " (" + ref.nom + ")\nStratum         : 3\nRef time (UTC)  : " + JOURS_EN[d.getUTCDay()] + " " + MOIS_ANGLAIS[d.getUTCMonth()] + " " + deux(d.getUTCDate()) + " " + deux(d.getUTCHours()) + ":" + deux(d.getUTCMinutes()) + ":" + deux(d.getUTCSeconds()) + " " + d.getUTCFullYear() +
			"\nSystem time     : 0.000112463 seconds fast of NTP time\nLast offset     : +0.000028117 seconds\nRMS offset      : 0.000041562 seconds\nFrequency       : 12.345 ppm slow\nResidual freq   : +0.001 ppm\nSkew            : 0.032 ppm\n" +
			"Root delay      : 0.001234567 seconds\nRoot dispersion : 0.000456789 seconds\nUpdate interval : 64.2 seconds\nLeap status     : Normal";
	}
	if (action === "sources" || action === "sourcestats"){
		var vue = args.indexOf("-v") > -1;
		if (action === "sourcestats") return "Name/IP Address            NP  NR  Span  Frequency  Freq Skew  Offset  Std Dev\n==============================================================================\n" +
			sources.map(function(s){ return completerDroite(s.nom, 27) + (s.joignable ? "  8   5   450     +0.012      0.088   +112us    41us" : "  0   0     0     +0.000   2000.000     +0ns  4000ms"); }).join("\n");
		return (vue ? "  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.\n / .- Source state '*' = current best, '+' = combined, '-' = not combined,\n| /             'x' = may be in error, '~' = too variable, '?' = unusable.\n||                                                 .- xxxx [ yyyy ] +/- zzzz\n" : "") +
			"MS Name/IP address         Stratum Poll Reach LastRx Last sample               \n===============================================================================\n" +
			sources.map(function(s, k){
				if (!s.joignable) return "^? " + completerDroite(s.nom, 27) + "0   6     0     -     +0ns[   +0ns] +/-    0ns";
				return "^" + (s === ref ? "*" : (k % 2 ? "+" : "-")) + " " + completerDroite(s.nom, 27) + (s === ref ? "2" : "3") + "   6   377    " + completerGauche(21 + k * 3, 2) + "   +" + (112 + k * 37) + "us[ +" + (140 + k * 29) + "us] +/-   " + (18 + k * 4) + "ms";
			}).join("\n");
	}
	if (action === "activity") return "200 OK\n" + joignables.length + " sources online\n" + (sources.length - joignables.length) + " sources offline\n0 sources doing burst (return to online)\n0 sources doing burst (return to offline)\n0 sources with unknown address";
	if (action === "makestep"){ if (!io.sudo) throw new ShellError("501 Not authorised"); return "200 OK"; }
	throw new ShellError("Unrecognized command" + astuce(io, "chronyc tracking (l'état de l'horloge), chronyc sources (les serveurs de temps), chronyc activity"));
};

/* ================================================================== */
/* AppArmor : aa-status, aa-enforce, aa-complain, aa-disable            */
/* ================================================================== */

var ENTETE_PROFIL = /^\s*(?:profile\s+(\S+)\s+)?(\/[^\s{]+|[A-Za-z][\w.-]*)\s+(?:flags\s*=\s*\(([^)]*)\)\s*)?\{/m;
function lireProfil(texte){
	var m = ENTETE_PROFIL.exec(texte || "");
	if (!m) return null;
	var drapeaux = (m[3] || "").split(/[\s,]+/).filter(Boolean);
	return { nom: m[1] || m[2], binaire: m[2] && m[2].charAt(0) === "/" ? m[2] : null, drapeaux: drapeaux, mode: drapeaux.indexOf("complain") > -1 ? "complain" : (drapeaux.indexOf("kill") > -1 ? "kill" : "enforce") };
}
function fichiersProfils(h){
	return fichiersDuDossierGuet(h, "/etc/apparmor.d", "*").filter(function(f){ return f.item && !f.item.lien && !/^\./.test(f.nom) && !/~$/.test(f.nom) && !/\.dpkg-/.test(f.nom); });
}
function profilsDemarrage(h){
	var profils = {};
	if (!dossierHoteGuet(h, "/etc/apparmor.d")) return profils;
	fichiersProfils(h).forEach(function(f){
		if (noeudHoteGuet(h, "/etc/apparmor.d/disable/" + f.nom, true)) return;
		var p = lireProfil(f.item.getText());
		if (!p) return;
		if (noeudHoteGuet(h, "/etc/apparmor.d/force-complain/" + f.nom, true)) p.mode = "complain";
		profils[p.nom] = { fichier: f.chemin, mode: p.mode, binaire: p.binaire };
	});
	return profils;
}
function exigerApparmor(io, cmd){
	var h = hoteIci();
	if (!machineGardee(h) || !dossierHoteGuet(h, "/etc/apparmor.d")) absentIci(io, cmd, "apparmor");
	return h;
}
function procsProfil(h, p){
	if (!p.binaire) return [];
	var base = p.binaire.split("/").pop(), liste = [];
	var racine = racineDeGuet(h);
	(function parcourir(lieu){ lieu.procs.forEach(function(x){ if (String(x.name).split(/[\s:]/)[0] === base) liste.push(x.pid); }); lieu.children.forEach(parcourir); })(racine);
	Object.keys(SERVICES_GUET).forEach(function(n){
		if (SERVICES_GUET[n].binaire === p.binaire && serviceActif(h, n) && !liste.length){ var s = HOTES[h].services[n]; liste.push(s.pid || (1000 + condense(n) % 3000)); }
	});
	return liste;
}
Shell.sorts["aa-status"] = function(args, io){
	var h = exigerApparmor(io, "aa-status");
	if (args.indexOf("--enabled") > -1){ return ""; }
	if (!io.sudo){ io.code = 4; throw new ShellError("You do not have enough privilege to read the profile set." + astuce(io, "sudo aa-status"), 4); }
	var profils = etatHote(h).apparmor || {}, noms = Object.keys(profils).sort();
	var enforce = noms.filter(function(n){ return profils[n].mode === "enforce"; }), complain = noms.filter(function(n){ return profils[n].mode === "complain"; });
	var kill = noms.filter(function(n){ return profils[n].mode === "kill"; });
	if (args.indexOf("--profiled") > -1) return String(noms.length);
	if (args.indexOf("--enforced") > -1) return String(enforce.length);
	if (args.indexOf("--complaining") > -1) return String(complain.length);
	var procE = [], procC = [];
	enforce.forEach(function(n){ procsProfil(h, profils[n]).forEach(function(pid){ procE.push("   " + profils[n].binaire + " (" + pid + ") "); }); });
	complain.forEach(function(n){ procsProfil(h, profils[n]).forEach(function(pid){ procC.push("   " + profils[n].binaire + " (" + pid + ") "); }); });
	GameEvents.fire({ type: "apparmor", hote: h, action: "status", enforce: enforce, complain: complain });
	return ["apparmor module is loaded.", noms.length + " profiles are loaded.", enforce.length + " profiles are in enforce mode."].concat(enforce.map(function(n){ return "   " + n; }))
		.concat([complain.length + " profiles are in complain mode."]).concat(complain.map(function(n){ return "   " + n; }))
		.concat([kill.length + " profiles are in kill mode."]).concat(kill.map(function(n){ return "   " + n; }))
		.concat(["0 profiles are in unconfined mode.", (procE.length + procC.length) + " processes have profiles defined.", procE.length + " processes are in enforce mode."]).concat(procE)
		.concat([procC.length + " processes are in complain mode."]).concat(procC)
		.concat(["0 processes are unconfined but have a profile defined.", "0 processes are in mixed mode.", "0 processes are in kill mode."]).join("\n") +
		(complain.length && io.tty ? astuce(io, "En mode complain, le profil se contente de noter ce qu'il aurait interdit : il ne protège rien. sudo aa-enforce " + profils[complain[0]].fichier) : "");
};
function trouverProfil(h, nom){
	var profils = fichiersProfils(h);
	var direct = profils.filter(function(f){ return f.chemin === nom || f.nom === nom || nom.replace(/^.*\//, "") === f.nom && /^\/etc\/apparmor\.d\//.test(nom); })[0];
	if (direct) return direct;
	return profils.filter(function(f){ var p = lireProfil(f.item.getText()); return p && (p.binaire === nom || p.nom === nom); })[0] || null;
}
function equilibreAccolades(t){ return (String(t).match(/\{/g) || []).length === (String(t).match(/\}/g) || []).length; }
function aaCommande(cmd, mode){
	return function(args, io){
		var h = exigerApparmor(io, cmd), noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
		if (!noms.length) throw new ShellError("usage: " + cmd + " [-h] [-d DIR] [--no-reload] program [program ...]\n" + cmd + ": error: the following arguments are required: program");
		var sorties = [];
		noms.forEach(function(nom){
			var f = trouverProfil(h, nom);
			if (!f){ sorties.push("Profile for " + nom + " not found, skipping"); return; }
			if (!io.sudo) throw new ShellError("ERROR: [Errno 13] Permission denied: '" + f.chemin + "'" + astuce(io, "Changer le mode d'un profil réécrit /etc/apparmor.d : sudo " + cmd + " " + nom));
			var texte = f.item.getText();
			if (!equilibreAccolades(texte)) throw new ShellError("AppArmor parser error for " + f.chemin + " in profile " + f.chemin + " at line " + texte.split("\n").length + ": syntax error, unexpected $end, expecting TOK_CLOSE");
			var p = lireProfil(texte), e = etatHote(h);
			if (mode === "disable"){
				poserFichierHote(h, "/etc/apparmor.d/disable/" + f.nom, null, { lien: "../" + f.nom });
				if (e.apparmor) delete e.apparmor[p.nom];
				sorties.push("Disabling " + f.chemin + ".");
			} else {
				var drapeaux = p.drapeaux.filter(function(d){ return d !== "complain" && d !== "enforce"; });
				if (mode === "complain") drapeaux.push("complain");
				var nouveau = texte.replace(ENTETE_PROFIL, function(tout, profil, chemin){
					return tout.replace(/\s*flags\s*=\s*\([^)]*\)/, "").replace(/\s*\{$/, (drapeaux.length ? " flags=(" + drapeaux.join(",") + ")" : "") + " {");
				});
				f.item.setText(nouveau);
				supprimerFichierHoteGuet(h, "/etc/apparmor.d/disable/" + f.nom);
				if (mode === "enforce") supprimerFichierHoteGuet(h, "/etc/apparmor.d/force-complain/" + f.nom);
				e.apparmor = e.apparmor || {};
				e.apparmor[p.nom] = { fichier: f.chemin, mode: mode, binaire: p.binaire };
				sorties.push("Setting " + f.chemin + " to " + mode + " mode.");
			}
			GameEvents.fire({ type: "apparmor", hote: h, action: mode, profil: p.nom, fichier: f.chemin });
		});
		return sorties.join("\n");
	};
}
Shell.sorts["aa-enforce"] = aaCommande("aa-enforce", "enforce");
Shell.sorts["aa-complain"] = aaCommande("aa-complain", "complain");
Shell.sorts["aa-disable"] = aaCommande("aa-disable", "disable");
Shell.sorts.apparmor_parser = function(args, io){
	var h = exigerApparmor(io, "apparmor_parser");
	var fichiers = args.filter(function(a){ return a.charAt(0) !== "-"; }), retirer = args.indexOf("-R") > -1;
	if (!fichiers.length) throw new ShellError("apparmor_parser: No profile specified." + astuce(io, "sudo apparmor_parser -r /etc/apparmor.d/NOM : recharger un profil"));
	if (!io.sudo) throw new ShellError("apparmor_parser: Unable to replace \"" + fichiers[0] + "\".  Permission denied; attempted to load a profile while confined?");
	var e = etatHote(h);
	fichiers.forEach(function(c){
		var t = lireFichierHote(h, c.charAt(0) === "/" ? c : "/etc/apparmor.d/" + c);
		if (t === null) throw new ShellError("File " + c + " not found, skipping...");
		if (!equilibreAccolades(t)) throw new ShellError("AppArmor parser error for " + c + " in profile " + c + " at line " + t.split("\n").length + ": syntax error, unexpected $end, expecting TOK_CLOSE");
		var p = lireProfil(t);
		if (!p) return;
		if (retirer) delete e.apparmor[p.nom];
		else e.apparmor[p.nom] = { fichier: c, mode: p.mode, binaire: p.binaire };
		GameEvents.fire({ type: "apparmor", hote: h, action: retirer ? "remove" : "reload", profil: p.nom });
	});
	return "";
};

/* ================================================================== */
/* fail2ban                                                            */
/* ================================================================== */

var FILTRES_FAIL2BAN = ["sshd", "apache-auth", "apache-badbots", "apache-noscript", "apache-overflows", "apache-nohome", "apache-botsearch", "apache-fakegooglebot",
	"apache-modsecurity", "apache-shellshock", "nginx-http-auth", "nginx-botsearch", "postfix", "dovecot", "recidive", "pam-generic", "vsftpd", "proftpd", "named-refused", "selinux-ssh"];
function dureeFail2ban(v){
	var m = /^(-?\d+)\s*([smhdw]?)$/.exec(String(v).trim());
	if (!m) return null;
	if (+m[1] < 0) return -1;
	return +m[1] * ({ "": 1, s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2]]);
}
function lireFail2ban(h){
	var sections = { DEFAULT: { bantime: "10m", findtime: "10m", maxretry: "5", backend: "auto", ignoreip: "127.0.0.1/8 ::1" } };
	FILTRES_FAIL2BAN.forEach(function(f){ sections[f] = { port: f === "sshd" ? "ssh" : "http,https", logpath: f === "sshd" ? "%(sshd_log)s" : "%(apache_error_log)s", backend: f === "sshd" ? "%(sshd_backend)s" : "%(default_backend)s" }; });
	var fichiers = ["/etc/fail2ban/jail.conf"].concat(fichiersDuDossierGuet(h, "/etc/fail2ban/jail.d", "*.conf").map(function(f){ return f.chemin; }), ["/etc/fail2ban/jail.local"],
		fichiersDuDossierGuet(h, "/etc/fail2ban/jail.d", "*.local").map(function(f){ return f.chemin; }));
	var lus = [];
	fichiers.forEach(function(c){
		var t = lireFichierHote(h, c);
		if (t === null) return;
		lus.push(c);
		var section = null, cleCourante = null;
		t.split("\n").forEach(function(l){
			if (/^\s*[#;]/.test(l) || l.trim() === "") return;
			var s = /^\s*\[([^\]]+)\]\s*$/.exec(l);
			if (s){ section = s[1].trim(); sections[section] = sections[section] || {}; cleCourante = null; return; }
			if (/^\s+\S/.test(l) && cleCourante && section){ sections[section][cleCourante] += " " + l.trim(); return; }
			var kv = /^\s*([A-Za-z_][\w.-]*)\s*[=:]\s*(.*)$/.exec(l);
			if (kv && section){ cleCourante = kv[1].toLowerCase(); sections[section][cleCourante] = kv[2].replace(/\s+[#;].*$/, "").trim(); }
		});
	});
	var jails = {}, erreur = null;
	Object.keys(sections).forEach(function(nom){
		if (nom === "DEFAULT" || nom === "INCLUDES" || erreur) return;
		var s = sections[nom], d = sections.DEFAULT;
		var v = function(k){ return s[k] !== undefined ? s[k] : d[k]; };
		if (!/^(true|yes|1|on)$/i.test(v("enabled") || "false")) return;
		var filtre = (v("filter") || nom).split("[")[0].trim();
		if (FILTRES_FAIL2BAN.indexOf(filtre) === -1 && !fichierHoteGuet(h, "/etc/fail2ban/filter.d/" + filtre + ".conf") && !fichierHoteGuet(h, "/etc/fail2ban/filter.d/" + filtre + ".local")){
			erreur = "ERROR   Found no accessible config files for 'filter.d/" + filtre + "' under /etc/fail2ban\nERROR   Unable to read the filter '" + filtre + "'\nERROR   Errors in jail '" + nom + "'. Skipping...";
			return;
		}
		var bantime = dureeFail2ban(v("bantime")), findtime = dureeFail2ban(v("findtime")), maxretry = v("maxretry");
		if (bantime === null) { erreur = "ERROR   Failed during configuration: Wrong value for 'bantime' in '" + nom + "' : " + v("bantime"); return; }
		if (findtime === null) { erreur = "ERROR   Failed during configuration: Wrong value for 'findtime' in '" + nom + "' : " + v("findtime"); return; }
		if (!/^\d+$/.test(String(maxretry))) { erreur = "ERROR   Failed during configuration: Wrong value for 'maxretry' in '" + nom + "' : " + maxretry; return; }
		jails[nom] = { bantime: bantime, findtime: findtime, maxretry: +maxretry, backend: (v("backend") || "auto").replace(/%\(sshd_backend\)s/, "systemd").replace(/%\(default_backend\)s/, "auto"),
			logpath: (v("logpath") || "").replace("%(sshd_log)s", "/var/log/auth.log").replace("%(apache_error_log)s", "/var/log/apache2/*error.log"), port: v("port") || "", filtre: filtre };
	});
	return { jails: jails, erreur: erreur, fichiers: lus };
}
function f2bEtat(h){ return etatHote(h).f2b; }
function fail2banBannir(h, jail, ip){
	if (!machineGardee(h)) return false;
	var f = f2bEtat(h);
	f.bannis[jail] = f.bannis[jail] || [];
	if (f.bannis[jail].indexOf(ip) > -1) return false;
	f.bannis[jail].push(ip);
	f.total[jail] = (f.total[jail] || 0) + 1;
	journalGuet(h, { unite: "fail2ban.actions", message: "[" + jail + "] Ban " + ip, prio: 5, fac: "daemon" });
	GameEvents.fire({ type: "fail2ban", hote: h, action: "ban", jail: jail, ip: ip, args: [] });
	return true;
}
function fail2banEchec(h, jail, ip, n){
	if (!machineGardee(h)) return false;
	var f = f2bEtat(h), conf = f.conf && f.conf[jail];
	if (!conf || !serviceActif(h, "fail2ban")) return false;
	f.echecs[jail] = f.echecs[jail] || {};
	f.echecs[jail][ip] = (f.echecs[jail][ip] || 0) + (n || 1);
	f.totalEchecs = f.totalEchecs || {};
	f.totalEchecs[jail] = (f.totalEchecs[jail] || 0) + (n || 1);
	if (f.echecs[jail][ip] >= conf.maxretry){ delete f.echecs[jail][ip]; return fail2banBannir(h, jail, ip); }
	return false;
}
var FAIL2BAN_AVANT_GUET = Shell.sorts["fail2ban-client"];
Shell.sorts["fail2ban-client"] = function(args, io){
	var h = hoteIci();
	if (h === "citadelle" || !machineGardee(h) || !dossierHoteGuet(h, "/etc/fail2ban")) return FAIL2BAN_AVANT_GUET.apply(this, arguments);
	var mots = args.filter(function(a){ return a !== "-q" && a !== "-v" && a !== "-d"; }), action = mots[0] || "";
	if (action === "version" || args.indexOf("-V") > -1 || args.indexOf("--version") > -1) return "1.0.2";
	if (!io.sudo) throw new ShellError("ERROR  Permission denied to socket: /var/run/fail2ban/fail2ban.sock, (you must be root)" + astuce(io, "sudo fail2ban-client " + args.join(" ")), 255);
	assurerService(h, "fail2ban");
	if (!serviceActif(h, "fail2ban")) throw new ShellError("ERROR  Failed to access socket path: /var/run/fail2ban/fail2ban.sock. Is fail2ban running?" + astuce(io, "sudo systemctl enable --now fail2ban"), 255);
	var f = f2bEtat(h), jails = f.conf || {}, noms = Object.keys(jails).sort();
	GameEvents.fire({ type: "fail2ban", args: args, hote: h, action: action, jail: mots[1] || null });
	function inexistante(j){ return new ShellError("ERROR  NOK: ('" + j + "',)\nSorry but the jail '" + j + "' does not exist", 255); }
	if (action === "ping") return "Server replied: pong";
	if (action === "" || action === "status"){
		if (!mots[1]) return "Status\n|- Number of jail:\t" + noms.length + "\n`- Jail list:\t" + noms.join(", ") + (noms.length ? "" : astuce(io, "Aucune prison active : il faut enabled = true dans /etc/fail2ban/jail.local, puis sudo fail2ban-client reload."));
		var j = jails[mots[1]];
		if (!j) throw inexistante(mots[1]);
		var bannis = f.bannis[mots[1]] || [], echecs = f.echecs[mots[1]] || {};
		return "Status for the jail: " + mots[1] + "\n|- Filter\n|  |- Currently failed:\t" + Object.keys(echecs).length + "\n|  |- Total failed:\t" + ((f.totalEchecs || {})[mots[1]] || 0) +
			"\n|  `- " + (j.backend === "systemd" ? "Journal matches:\t_SYSTEMD_UNIT=sshd.service + _COMM=sshd" : "File list:\t" + j.logpath) +
			"\n`- Actions\n   |- Currently banned:\t" + bannis.length + "\n   |- Total banned:\t" + (f.total[mots[1]] || 0) + "\n   `- Banned IP list:\t" + bannis.join(" ");
	}
	if (action === "reload" || action === "restart"){
		var lu = lireFail2ban(h);
		if (lu.erreur) throw new ShellError(lu.erreur + astuce(io, "La configuration est refusée : fail2ban garde les prisons d'avant."), 255);
		if (mots[1] && !lu.jails[mots[1]]) throw inexistante(mots[1]);
		f.conf = lu.jails;
		return action === "restart" ? "Shutdown successful\nServer ready" : "OK";
	}
	if (action === "banned") return "[" + noms.map(function(n){ return "{'" + n + "': [" + (f.bannis[n] || []).map(function(ip){ return "'" + ip + "'"; }).join(", ") + "]}"; }).join(", ") + "]";
	if (action === "get"){
		var jg = jails[mots[1]];
		if (!jg) throw inexistante(mots[1] || "");
		var quoi = mots[2];
		if (quoi === "maxretry") return String(jg.maxretry);
		if (quoi === "bantime") return String(jg.bantime);
		if (quoi === "findtime") return String(jg.findtime);
		if (quoi === "banned" || quoi === "banip") return "[" + (f.bannis[mots[1]] || []).map(function(ip){ return "'" + ip + "'"; }).join(", ") + "]";
		if (quoi === "logpath") return jg.backend === "systemd" ? "No file is currently monitored" : "Current monitored log file(s):\n`- " + jg.logpath;
		if (quoi === "ignoreip") return "These IP addresses/networks are ignored:\n|- 127.0.0.0/8\n`- ::1";
		throw new ShellError("ERROR  Invalid command (no get action or not yet implemented)", 255);
	}
	if (action === "set"){
		var js = mots[1], op = mots[2], ip = mots[3];
		if (!jails[js]) throw inexistante(js || "");
		if ((op === "banip" || op === "unbanip") && ip){
			if (op === "banip") return fail2banBannir(h, js, ip) ? "1" : "0";
			var avant = (f.bannis[js] || []).length;
			f.bannis[js] = (f.bannis[js] || []).filter(function(x){ return x !== ip; });
			if (avant === f.bannis[js].length) throw new ShellError("ERROR  NOK: ('IP " + ip + " is not banned',)\nIP " + ip + " is not banned", 255);
			return "1";
		}
		throw new ShellError("ERROR  Invalid command (no set action or not yet implemented)", 255);
	}
	if (action === "unban"){
		var compte = 0;
		Object.keys(f.bannis).forEach(function(j){ var av = f.bannis[j].length; f.bannis[j] = mots[1] === "--all" ? [] : f.bannis[j].filter(function(x){ return mots.slice(1).indexOf(x) === -1; }); compte += av - f.bannis[j].length; });
		return String(compte);
	}
	throw new ShellError("ERROR  Invalid command" + astuce(io, "Ici : status, status JAIL, reload, banned, get JAIL maxretry, set JAIL banip|unbanip ADRESSE"), 255);
};

/* ================================================================== */
/* Lire l'état d'une machine (pour rkhunter et lynis)                   */
/* ================================================================== */

function comptesHoteGuet(h){
	var passwd = (lireFichierHote(h, "/etc/passwd") || "").split("\n").filter(Boolean).map(function(l){ var c = l.split(":"); return { nom: c[0], mdp: c[1], uid: +c[2], shell: c[6] || "" }; });
	var shadow = {};
	(lireFichierHote(h, "/etc/shadow") || "").split("\n").filter(Boolean).forEach(function(l){ var c = l.split(":"); shadow[c[0]] = c[1]; });
	return { passwd: passwd, shadow: shadow };
}
/* La configuration effective de sshd (comme sshd -T : la première valeur l'emporte), clés en minuscules. */
function sshEffectiveGuet(h){
	if (typeof SOURCES_GUET.sshEffective === "function"){ try { var r = SOURCES_GUET.sshEffective(h); if (r && typeof r === "object") return r; } catch (e){} }
	// La configuration chargée par sshd (SortsBastion.js) n'a de sens que si la machine a une unité ssh qu'on recharge.
	var uniteSsh = typeof uniteInfo === "function" ? (function(){ try { return uniteInfo(h, "ssh.service") || uniteInfo(h, "sshd.service"); } catch (e){ return null; } })() : null;
	if (typeof configSshEffective === "function" && uniteSsh){
		try { var r2 = configSshEffective(h); if (r2 && typeof r2 === "object" && !Array.isArray(r2)){ var bas = {}; Object.keys(r2).forEach(function(k){ bas[k.toLowerCase()] = String(r2[k]).toLowerCase ? String(r2[k]) : r2[k]; }); if (Object.keys(bas).length) return bas; } } catch (e){}
	}
	var valeurs = {};
	function lire(chemin, profondeur){
		var t = lireFichierHote(h, chemin);
		if (t === null || profondeur > 4) return;
		var lignes = lignesConf(t);
		for (var i = 0; i < lignes.length; i++){
			var m = /^\s*(\S+)\s*(?:=\s*|\s+)(.*)$/.exec(lignes[i].texte);
			if (!m) continue;
			var cle = m[1].toLowerCase(), v = m[2].trim();
			if (cle === "match") return "match";
			if (cle === "include"){
				v.split(/\s+/).forEach(function(motif){
					var complet = motif.charAt(0) === "/" ? motif : "/etc/ssh/" + motif, coupe = complet.lastIndexOf("/");
					fichiersDuDossierGuet(h, complet.substring(0, coupe), complet.substring(coupe + 1)).forEach(function(f){ lire(f.chemin, profondeur + 1); });
				});
				continue;
			}
			if (!valeurs.hasOwnProperty(cle)) valeurs[cle] = v;
		}
	}
	lire("/etc/ssh/sshd_config", 0);
	var defauts = { permitrootlogin: "prohibit-password", passwordauthentication: "yes", maxauthtries: "6", x11forwarding: "no", permitemptypasswords: "no", pubkeyauthentication: "yes" };
	Object.keys(defauts).forEach(function(k){ if (!valeurs.hasOwnProperty(k)) valeurs[k] = defauts[k]; });
	if (lireFichierHote(h, "/etc/ssh/sshd_config") === null) valeurs.absent = true;
	return valeurs;
}
function lireLoginDefs(h, cle){
	var t = lireFichierHote(h, "/etc/login.defs");
	if (t === null) return null;
	var v = null;
	lignesConf(t).forEach(function(l){ var m = new RegExp("^\\s*" + cle + "\\s+(\\S+)").exec(l.texte); if (m) v = m[1]; });
	return v;
}
function itemsDeLHote(h, rappel){
	var racine = racineDeGuet(h);
	if (racine) parcourirHote(h, racine, "/", rappel);
}
var SUID_ATTENDUS = ["/usr/bin/passwd", "/usr/bin/su", "/usr/bin/sudo", "/usr/bin/mount", "/usr/bin/umount", "/usr/bin/chsh", "/usr/bin/chfn", "/usr/bin/gpasswd",
	"/usr/bin/newgrp", "/usr/lib/openssh/ssh-keysign", "/usr/lib/dbus-1.0/dbus-daemon-launch-helper", "/usr/bin/pkexec", "/usr/bin/fusermount3", "/bin/su", "/bin/mount", "/bin/umount", "/usr/sbin/unix_chkpwd"];

/* ================================================================== */
/* rkhunter --check sur une machine gardée                              */
/* ================================================================== */

var RKHUNTER_AVANT_GUET = Shell.sorts.rkhunter;
Shell.sorts.rkhunter = function(args, io){
	var h = hoteIci();
	if (h === "citadelle" || !machineGardee(h) || !fichierHoteGuet(h, "/etc/rkhunter.conf")) return RKHUNTER_AVANT_GUET.apply(this, arguments);
	if (args.indexOf("--version") > -1 || args.indexOf("-V") > -1) return "Rootkit Hunter 1.4.6";
	var verifier = args.indexOf("--check") > -1 || args.indexOf("-c") > -1, propupd = args.indexOf("--propupd") > -1;
	if (!verifier && !propupd) throw new ShellError("Usage: rkhunter {--check | --update | --versioncheck |\n                --propupd [{filename | directory | package name},...] |\n                --list [{tests | {lang | languages} | rootkits | perl | propfiles}] |\n                --config-check | --version | --help} [options]");
	if (!io.sudo) throw new ShellError("You must be the root user to run this program." + astuce(io, "sudo rkhunter --check --sk"), 1);
	var e = etatHote(h), binaires = [];
	["/usr/bin", "/usr/sbin", "/bin", "/sbin"].forEach(function(d){ fichiersDuDossierGuet(h, d, "*").forEach(function(f){ if (f.item && !f.item.lien) binaires.push(f); }); });
	if (propupd){
		e.rkhunterBase = {};
		binaires.forEach(function(f){ e.rkhunterBase[f.chemin] = condense(f.item.getText()) + ":" + f.item.mode; });
		return "[ Rootkit Hunter version 1.4.6 ]\nFile created: searched for " + (binaires.length + 140) + " files, found " + (binaires.length + 120);
	}
	var seulementAlertes = args.indexOf("--rwo") > -1 || args.indexOf("--report-warnings-only") > -1;
	function ligne(texte, statut){
		var col = statut === "OK" || statut === "None found" || statut === "Not found" || statut === "Found" || statut === "Not set" ? C.vert : (statut === "Warning" ? C.rouge : C.jaune);
		return "    " + completerDroite(texte, 53) + "[ " + (io.tty ? col(statut) : statut) + " ]";
	}
	var c = comptesHoteGuet(h), ssh = sshEffectiveGuet(h), alertes = [], lignes = ["[ Rootkit Hunter version 1.4.6 ]", "", "Checking system commands...", "", "  Performing 'strings' command checks",
		ligne("Checking 'strings' command", "OK"), "", "  Performing file properties checks"];
	var suspects = 0;
	binaires.slice(0, 40).forEach(function(f){
		var change = e.rkhunterBase ? (e.rkhunterBase[f.chemin] !== undefined && e.rkhunterBase[f.chemin] !== condense(f.item.getText()) + ":" + f.item.mode) : f.item.modifie;
		if (change){ suspects++; alertes.push("File " + f.chemin + " has changed"); }
		lignes.push(ligne(f.chemin, change ? "Warning" : "OK"));
	});
	var uid0 = c.passwd.filter(function(u){ return u.uid === 0; }).length > 1, vides = c.passwd.some(function(u){ return c.shadow[u.nom] === ""; });
	var racineSsh = !/^no$/i.test(ssh.permitrootlogin || "");
	var caches = [];
	["/dev", "/tmp", "/var/tmp"].forEach(function(d){ var r = dossierHoteGuet(h, d); if (r){ r.items.concat(r.children).forEach(function(x){ var n = x.itemname || x.room_name; if (/^\./.test(n) && !/^\.(X11-unix|ICE-unix|font-unix|XIM-unix|Test-unix)$/.test(n)) caches.push(d + "/" + n); }); } });
	if (uid0) alertes.push("Account '" + c.passwd.filter(function(u){ return u.uid === 0 && u.nom !== "root"; }).map(function(u){ return u.nom; }).join(", ") + "' is root equivalent (UID 0)");
	if (vides) alertes.push("Found passwordless account(s)");
	if (racineSsh) alertes.push("The SSH configuration option 'PermitRootLogin' has a value of '" + ssh.permitrootlogin + "'");
	if (caches.length) alertes.push("Hidden file found: " + caches.join(", "));
	lignes = lignes.concat(["", "Checking for rootkits...", "", "  Performing check of known rootkit files and directories", ligne("55808 Trojan - Variant A", "Not found"), ligne("Adore Rootkit", "Not found"),
		ligne("Suckit Rootkit", "Not found"), "", "  Performing additional rootkit checks", ligne("Suckit Rootkit additional checks", "OK"), ligne("Checking for possible rootkit files and directories", "None found"),
		"", "Checking the network...", "", "  Performing checks on the network ports", ligne("Checking for backdoor ports", "None found"), "", "  Performing checks on the network interfaces",
		ligne("Checking for promiscuous interfaces", "None found"), "", "Checking the local host...", "", "  Performing group and account checks", ligne("Checking for passwd file", "Found"),
		ligne("Checking for root equivalent (UID 0) accounts", uid0 ? "Warning" : "None found"), ligne("Checking for passwordless accounts", vides ? "Warning" : "None found"),
		ligne("Checking for passwd file changes", "None found"), "", "  Performing system configuration file checks", ligne("Checking for an SSH configuration file", ssh.absent ? "Not found" : "Found"),
		ligne("Checking if SSH root access is allowed", ssh.absent ? "Not set" : (racineSsh ? "Warning" : "OK")), ligne("Checking if SSH protocol v1 is allowed", "Not set"),
		ligne("Checking for a running system logging daemon", serviceActif(h, "rsyslog") ? "Found" : "Not found"), "", "  Performing filesystem checks",
		ligne("Checking /dev for suspicious file types", "None found"), ligne("Checking for hidden files and directories", caches.length ? "Warning" : "None found"), "",
		"System checks summary", "=====================", "", "File properties checks...", "    Files checked: " + Math.min(binaires.length, 40), "    Suspect files: " + suspects, "",
		"Rootkit checks...", "    Rootkits checked : 498", "    Possible rootkits: 0", "", "Applications checks...", "    All checks skipped", "", "The system checks took: 1 minute and 4 seconds", "",
		"All results have been written to the log file: /var/log/rkhunter.log", ""]);
	lignes.push(alertes.length ? "One or more warnings have been found while checking the system.\nPlease check the log file (/var/log/rkhunter.log)" : "No warnings were found while checking the system.");
	var d = maintenantGuet();
	poserFichierHote(h, "/var/log/rkhunter.log", ["[" + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()) + "] Running Rootkit Hunter version 1.4.6 on " + h]
		.concat(alertes.map(function(a){ return "[" + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()) + "] Warning: " + a; })).join("\n"), { mode: "rw-r-----" });
	GameEvents.fire({ type: "rkhunter", alertes: alertes.length, hote: h, details: alertes });
	if (seulementAlertes) return alertes.map(function(a){ return "Warning: " + a; }).join("\n");
	var texte = lignes.join("\n");
	if (args.indexOf("--sk") === -1 && args.indexOf("--skip-keypress") === -1 && io.tty) texte += astuce(io, "Sans --sk, le vrai rkhunter attend une touche entre chaque section. Ici, tout défile d'un coup.");
	return texte;
};

/* ================================================================== */
/* La Pierre d'Inspection : lynis                                      */
/* ================================================================== */

var VERSION_LYNIS = "3.0.8";
var CONTROLES_LYNIS = [];
var ORDRE_SECTIONS_LYNIS = ["Boot and services", "Kernel", "Users, Groups and Authentication", "Shells", "File systems", "USB Devices", "Networking",
	"Software: firewalls", "Software: webserver", "SSH Support", "Logging and files", "Accounting", "Time and Synchronization", "Cryptography",
	"Security frameworks", "Software: file integrity", "Software: System tooling", "File Permissions", "Kernel Hardening", "Banners and identification",
	"Scheduled tasks", "Ports and packages"];
function declarerControleLynis(c){
	if (!c || !c.id || typeof c.verifier !== "function") return null;
	var controle = { id: c.id, section: c.section || "Security frameworks", libelle: c.libelle || c.id, poids: c.poids === undefined ? 1 : c.poids, verifier: c.verifier,
		conseil: c.conseil || "", gravite: c.gravite === "warning" ? "warning" : "suggestion", details: c.details || null };
	CONTROLES_LYNIS = CONTROLES_LYNIS.filter(function(x){ return x.id !== c.id; });
	CONTROLES_LYNIS.push(controle);
	return controle;
}
function retirerControleLynis(id){ CONTROLES_LYNIS = CONTROLES_LYNIS.filter(function(x){ return x.id !== id; }); }
function idAffiche(id){ return String(id).split(":")[0]; }
/* Le score de la Pierre : la somme des poids des contrôles passés sur le total des contrôles qui s'appliquent. */
function scoreLynis(h, filtre){
	var resultats = [], total = 0, gagne = 0;
	CONTROLES_LYNIS.forEach(function(c){
		if (filtre && !filtre(c)) return;
		var r;
		try { r = c.verifier(h); } catch (e){ r = null; }
		var details = null;
		if (r && typeof r === "object"){ details = r.details || null; r = r.ok === undefined ? null : r.ok; }
		if (r === null || r === undefined){ resultats.push({ id: c.id, ok: null, poids: c.poids, controle: c }); return; }
		total += c.poids;
		if (r) gagne += c.poids;
		resultats.push({ id: c.id, ok: !!r, poids: c.poids, controle: c, details: details || (typeof c.details === "function" ? (function(){ try { return c.details(h); } catch (e){ return null; } })() : c.details) });
	});
	return { score: total ? Math.floor(gagne * 100 / total) : 0, controles: resultats.filter(function(x){ return x.ok !== null; }).map(function(x){ return { id: x.id, ok: x.ok, poids: x.poids }; }), detail: resultats };
}

/* --- Les contrôles par défaut : chacun lit l'état réel de la machine --- */
(function(){
	function D(id, section, libelle, poids, gravite, conseil, verifier, details){ declarerControleLynis({ id: id, section: section, libelle: libelle, poids: poids, gravite: gravite, conseil: conseil, verifier: verifier, details: details }); }
	function fichierExiste(h, c){ return !!fichierHoteGuet(h, c); }
	D("BOOT-5122", "Boot and services", "Checking for password protection", 3, "suggestion", "Set a password on GRUB boot loader to prevent altering boot configuration (e.g. boot in single user mode without password)", function(h){
		if (!dossierHoteGuet(h, "/etc/grub.d") && !fichierExiste(h, "/boot/grub/grub.cfg")) return null;
		var t = lireFichierHote(h, "/boot/grub/grub.cfg") || "";
		return /^\s*set\s+superusers\s*=/m.test(t) && /^\s*password_pbkdf2\s+\S+\s+grub\.pbkdf2\.sha512\./m.test(t);
	});
	D("BOOT-5180", "Boot and services", "Checking Ctrl-Alt-Delete reboot", 2, "suggestion", "Mask ctrl-alt-del.target so a keypress on the console cannot reboot the server", function(h){ return uniteMasquee(h, "ctrl-alt-del.target"); });
	D("BOOT-5264", "Boot and services", "Checking for unneeded network services", 2, "warning", "Disable and stop unneeded services (telnet, rpcbind, avahi-daemon)", function(h){
		var services = (HOTES[h] || {}).services || {}, inutiles = ["telnet", "telnet.socket", "rpcbind", "rpcbind.socket", "avahi-daemon", "avahi-daemon.socket", "xinetd", "vsftpd", "cups"];
		return !inutiles.some(function(n){ var s = services[n]; return s && (s.actif || s.auto); });
	}, function(h){ var s = (HOTES[h] || {}).services || {}; return "Services: " + ["telnet.socket", "rpcbind", "avahi-daemon"].filter(function(n){ return s[n] && (s[n].actif || s[n].auto); }).join(", "); });
	D("KRNL-5820", "Kernel", "Checking core dumps configuration", 1, "suggestion", "If not required, consider explicit disabling of core dump in /etc/security/limits.conf file", function(h){
		var textes = [lireFichierHote(h, "/etc/security/limits.conf") || ""].concat(fichiersDuDossierGuet(h, "/etc/security/limits.d", "*.conf").map(function(f){ return lireFichierHote(h, f.chemin); }));
		return textes.some(function(t){ return lignesConf(t).some(function(l){ return /^\s*\*\s+hard\s+core\s+0\s*$/.test(l.texte); }); });
	});
	[["net.ipv4.ip_forward", "0"], ["net.ipv4.conf.all.rp_filter", "1"], ["net.ipv4.conf.all.accept_redirects", "0"], ["net.ipv4.conf.all.send_redirects", "0"],
		["net.ipv4.conf.all.accept_source_route", "0"], ["net.ipv4.conf.all.log_martians", "1"], ["kernel.dmesg_restrict", "1"], ["kernel.kptr_restrict", "2"],
		["kernel.randomize_va_space", "2"], ["fs.protected_symlinks", "1"], ["fs.protected_hardlinks", "1"], ["fs.suid_dumpable", "0"]].forEach(function(x){
		D("KRNL-6000:" + x[0], "Kernel Hardening", "sysctl key " + x[0] + " (exp: " + x[1] + ")", 1, "suggestion", "One or more sysctl values differ from the scan profile and could be tweaked", function(h){
			if (!dossierHoteGuet(h, "/etc/sysctl.d")) return null;
			var v = etatHote(h).sysctl[x[0]];
			return x[0] === "kernel.kptr_restrict" ? +v >= 1 : String(v) === x[1];
		}, function(h){ return x[0] + " (exp: " + x[1] + ", now: " + etatHote(h).sysctl[x[0]] + ")"; });
	});
	D("AUTH-9204", "Users, Groups and Authentication", "Checking users with an UID of zero", 4, "warning", "Multiple users with UID 0 found in /etc/passwd", function(h){
		if (!fichierExiste(h, "/etc/passwd")) return null;
		return comptesHoteGuet(h).passwd.filter(function(u){ return u.uid === 0; }).length <= 1;
	});
	D("AUTH-9283", "Users, Groups and Authentication", "Checking for accounts without password", 4, "warning", "Found accounts without password: lock them or set a password", function(h){
		if (!fichierExiste(h, "/etc/shadow")) return null;
		var c = comptesHoteGuet(h);
		return !Object.keys(c.shadow).some(function(n){ return c.shadow[n] === ""; }) && !c.passwd.some(function(u){ return u.mdp === ""; });
	}, function(h){ var c = comptesHoteGuet(h); return "Accounts: " + Object.keys(c.shadow).filter(function(n){ return c.shadow[n] === ""; }).join(", "); });
	D("AUTH-9286", "Users, Groups and Authentication", "Checking user password aging (maximum)", 2, "suggestion", "Configure maximum password age in /etc/login.defs", function(h){
		var v = lireLoginDefs(h, "PASS_MAX_DAYS");
		if (v === null && !fichierExiste(h, "/etc/login.defs")) return null;
		return v !== null && +v > 0 && +v <= 90;
	});
	D("AUTH-9328", "Users, Groups and Authentication", "Default umask values", 2, "suggestion", "Default umask in /etc/login.defs could be more strict like 027", function(h){
		var v = lireLoginDefs(h, "UMASK");
		if (v === null && !fichierExiste(h, "/etc/login.defs")) return null;
		return v === "027" || v === "077" || v === "0027" || v === "0077";
	});
	D("AUTH-9408", "Users, Groups and Authentication", "Checking for account lockout (faillock)", 2, "suggestion", "Configure account lockout after failed logins (pam_faillock, deny=5)", function(h){
		var t = lireFichierHote(h, "/etc/security/faillock.conf");
		if (t === null) return null;
		return lignesConf(t).some(function(l){ var m = /^\s*deny\s*=\s*(\d+)/.exec(l.texte); return m && +m[1] > 0 && +m[1] <= 10; });
	});
	D("AUTH-9218", "Users, Groups and Authentication", "Checking su restricted to a group (pam_wheel)", 1, "suggestion", "Restrict su to members of a group with pam_wheel", function(h){
		var t = lireFichierHote(h, "/etc/pam.d/su");
		if (t === null) return null;
		return lignesConf(t).some(function(l){ return /^\s*auth\s+required\s+pam_wheel\.so/.test(l.texte); });
	});
	D("AUTH-9252", "Users, Groups and Authentication", "Checking sudoers for NOPASSWD: ALL", 3, "warning", "A sudo rule grants every command without password", function(h){
		var fichiers = ["/etc/sudoers"].concat(fichiersDuDossierGuet(h, "/etc/sudoers.d", "*").map(function(f){ return f.chemin; }));
		if (!fichierExiste(h, "/etc/sudoers")) return null;
		return !fichiers.some(function(c){ return lignesConf(lireFichierHote(h, c) || "").some(function(l){ return /NOPASSWD\s*:\s*ALL\s*$/.test(l.texte); }); });
	});
	D("AUTH-9254", "Users, Groups and Authentication", "Checking permissions of /etc/sudoers.d files", 1, "suggestion", "Files in /etc/sudoers.d should have mode 0440", function(h){
		if (!dossierHoteGuet(h, "/etc/sudoers.d")) return null;
		return fichiersDuDossierGuet(h, "/etc/sudoers.d", "*").every(function(f){ return !f.item || f.nom === "README" || f.item.mode === "r--r-----"; });
	});
	D("SHLL-6220", "Shells", "Checking session timeout (TMOUT)", 1, "suggestion", "Set a read-only TMOUT in /etc/profile.d to close idle sessions", function(h){
		var textes = [lireFichierHote(h, "/etc/profile") || ""].concat(fichiersDuDossierGuet(h, "/etc/profile.d", "*.sh").map(function(f){ return lireFichierHote(h, f.chemin); }));
		var tout = textes.join("\n");
		return /(^|\s)TMOUT=\d+/m.test(tout) && /(readonly\s+TMOUT|declare\s+-r\s+TMOUT|typeset\s+-r\s+TMOUT|readonly\s+-?\s*TMOUT)/.test(tout);
	});
	D("FILE-6310", "File systems", "Checking /tmp as separate partition", 1, "suggestion", "To decrease the impact of a full /tmp file system, place /tmp on a separate partition", function(h){
		return montages(h).some(function(m){ return m.cible === "/tmp"; });
	});
	D("FILE-6374", "File systems", "Checking /tmp mount options (nodev,nosuid,noexec)", 2, "suggestion", "Mount /tmp with nodev,nosuid,noexec", function(h){
		var m = montages(h).filter(function(x){ return x.cible === "/tmp"; })[0];
		return !!m && ["nodev", "nosuid", "noexec"].every(function(o){ return m.options.indexOf(o) > -1; });
	}, function(h){ var m = montages(h).filter(function(x){ return x.cible === "/tmp"; })[0]; return "/tmp: " + (m ? m.options.join(",") : "not mounted separately"); });
	D("FILE-6362", "File systems", "Checking /tmp sticky bit", 2, "warning", "Set the sticky bit on /tmp (chmod +t /tmp)", function(h){
		var t = dossierHoteGuet(h, "/tmp");
		if (!t) return null;
		return /[tT]$/.test(t.mode);
	});
	D("FILE-6430", "File systems", "Disable mounting of some filesystems", 1, "suggestion", "Consider disabling unused file systems (cramfs, freevxfs, jffs2, hfs, hfsplus, udf)", function(h){
		var r = lireModprobe(h);
		return ["cramfs", "freevxfs", "jffs2", "hfs", "hfsplus", "udf"].every(function(m){ return r.blacklist.indexOf(m) > -1 || r.install[m] !== undefined; });
	});
	D("USB-1000", "USB Devices", "Checking usb-storage driver (modprobe config)", 2, "suggestion", "Disable drivers like USB storage when not used, to prevent unauthorized storage or data theft", function(h){
		var r = lireModprobe(h);
		return (r.install.usb_storage !== undefined && /\/bin\/(true|false)/.test(r.install.usb_storage)) && modulesCharges(h).indexOf("usb_storage") === -1;
	}, function(h){ return modulesCharges(h).indexOf("usb_storage") > -1 ? "usb_storage is loaded (lsmod)" : "no install rule for usb_storage in /etc/modprobe.d"; });
	D("NETW-3200", "Networking", "Determining available network protocols (dccp, sctp, rds, tipc)", 1, "suggestion", "Determine if protocols 'dccp', 'sctp', 'rds', 'tipc' are really needed on this system", function(h){
		var r = lireModprobe(h);
		return ["dccp", "sctp", "rds", "tipc"].every(function(m){ return r.blacklist.indexOf(m) > -1 || r.install[m] !== undefined; });
	});
	D("FIRE-4590", "Software: firewalls", "Checking host based firewall", 3, "warning", "Configure a firewall/packet filter to filter incoming and outgoing traffic", function(h){
		if (typeof SOURCES_GUET.parefeuActif === "function"){ try { var r = SOURCES_GUET.parefeuActif(h); if (r !== null && r !== undefined) return !!r; } catch (e){} }
		var t = lireFichierHote(h, "/etc/ufw/ufw.conf");
		if (t === null) return null;
		return /^\s*ENABLED\s*=\s*yes/m.test(t);
	});
	function apacheOuNull(h){ return apacheInstalle(h) ? apacheActive(h) : null; }
	D("HTTP-6640", "Software: webserver", "Checking Apache ServerTokens", 2, "suggestion", "Set ServerTokens Prod so that the Server header does not reveal the version", function(h){ var c = apacheOuNull(h); return c ? c.serveur.tokens === "Prod" : null; });
	D("HTTP-6641", "Software: webserver", "Checking Apache ServerSignature", 1, "suggestion", "Set ServerSignature Off", function(h){ var c = apacheOuNull(h); return c ? (c.serveur.signature || "Off") === "Off" && c.vhosts.every(function(v){ return !v.signature || v.signature === "Off"; }) : null; });
	D("HTTP-6643", "Software: webserver", "Checking Apache TraceEnable", 2, "suggestion", "Disable the TRACE method (TraceEnable Off)", function(h){ var c = apacheOuNull(h); return c ? (c.serveur.trace === "Off" && c.vhosts.every(function(v){ return !v.trace || v.trace === "Off"; })) : null; });
	D("HTTP-6650", "Software: webserver", "Checking directory listing (Options Indexes)", 2, "suggestion", "Disable directory listing (Options -Indexes, a2dismod autoindex)", function(h){
		var c = apacheOuNull(h);
		if (!c) return null;
		if (c.modules.indexOf("autoindex") === -1) return true;
		var racines = c.vhosts.map(function(v){ return v.documentRoot || c.serveur.documentRoot || "/var/www/html"; });
		return racines.every(function(r, k){ return optionsPour(c, c.vhosts[k], r).indexOf("Indexes") === -1; });
	});
	D("HTTP-6660", "Software: webserver", "Checking TLS protocols (TLS 1.0 and 1.1 disabled)", 3, "warning", "Disable TLSv1 and TLSv1.1 (SSLProtocol -all +TLSv1.2 +TLSv1.3)", function(h){
		var c = apacheOuNull(h);
		if (!c) return null;
		var ssl = c.vhosts.filter(function(v){ return v.ssl; });
		if (!ssl.length || c.modules.indexOf("ssl") === -1) return null;
		return ssl.every(function(v){ var p = protocolesVhost(c, v); return p.indexOf("TLSv1") === -1 && p.indexOf("TLSv1.1") === -1; });
	});
	D("HTTP-6662", "Software: webserver", "Checking HSTS header", 1, "suggestion", "Send a Strict-Transport-Security header on HTTPS sites", function(h){
		var c = apacheOuNull(h);
		if (!c) return null;
		var ssl = c.vhosts.filter(function(v){ return v.ssl; });
		if (!ssl.length || c.modules.indexOf("ssl") === -1) return null;
		if (c.modules.indexOf("headers") === -1) return false;
		return ssl.every(function(v){ return c.serveur.headers.concat(v.headers).some(function(x){ return /^strict-transport-security$/i.test(x.nom) && x.action !== "unset"; }); });
	});
	D("CRYP-7902", "Cryptography", "Checking expire date of SSL certificates", 3, "warning", "Renew the expired certificate served by the web server", function(h){
		var c = apacheOuNull(h);
		if (!c) return null;
		var ssl = c.vhosts.filter(function(v){ return v.ssl && v.cert; });
		if (!ssl.length) return null;
		return ssl.every(function(v){ var cert = lireCertificat(lireFichierHote(h, v.cert)); return !cert || cert.inconnu || cert.fin > maintenantGuet(); });
	});
	function ssh(id, libelle, poids, gravite, conseil, test, detail){
		D("SSH-7408:" + id, "SSH Support", libelle, poids, gravite, conseil, function(h){ var s = sshEffectiveGuet(h); if (s.absent) return null; return test(s); }, function(h){ return detail(sshEffectiveGuet(h)); });
	}
	ssh("PermitRootLogin", "Checking SSH option PermitRootLogin", 4, "warning", "Root can directly login via SSH", function(s){ return /^no$/i.test(s.permitrootlogin || ""); }, function(s){ return "PermitRootLogin (set " + String(s.permitrootlogin).toUpperCase() + " to NO)"; });
	ssh("PasswordAuthentication", "Checking SSH option PasswordAuthentication", 3, "suggestion", "Consider hardening SSH configuration", function(s){ return /^no$/i.test(s.passwordauthentication || ""); }, function(s){ return "PasswordAuthentication (set " + String(s.passwordauthentication).toUpperCase() + " to NO)"; });
	ssh("MaxAuthTries", "Checking SSH option MaxAuthTries", 1, "suggestion", "Consider hardening SSH configuration", function(s){ return +s.maxauthtries <= 3; }, function(s){ return "MaxAuthTries (set " + s.maxauthtries + " to 3)"; });
	ssh("X11Forwarding", "Checking SSH option X11Forwarding", 1, "suggestion", "Consider hardening SSH configuration", function(s){ return /^no$/i.test(s.x11forwarding || "no"); }, function(s){ return "X11Forwarding (set " + String(s.x11forwarding).toUpperCase() + " to NO)"; });
	ssh("AllowUsers", "Checking SSH option AllowUsers / AllowGroups", 1, "suggestion", "Consider hardening SSH configuration", function(s){ return !!(s.allowusers || s.allowgroups); }, function(){ return "AllowUsers (set a list of allowed users)"; });
	ssh("PermitEmptyPasswords", "Checking SSH option PermitEmptyPasswords", 2, "warning", "SSH accepts empty passwords", function(s){ return !/^yes$/i.test(s.permitemptypasswords || "no"); }, function(){ return "PermitEmptyPasswords (set YES to NO)"; });
	D("LOGG-2138", "Logging and files", "Checking journald persistent storage", 1, "suggestion", "Make the journal persistent (Storage=persistent in /etc/systemd/journald.conf)", function(h){ return etatHote(h).journald === "persistent"; });
	D("LOGG-2154", "Logging and files", "Checking remote logging", 1, "suggestion", "Enable logging to an external logging host for archiving purposes and additional protection", function(h){
		if (!fichierExiste(h, "/etc/rsyslog.conf")) return null;
		return serviceActif(h, "rsyslog") && (etatHote(h).rsyslog.conf || []).some(function(r){ return !!r.distant; });
	});
	D("ACCT-9628", "Accounting", "Checking auditd", 2, "suggestion", "Enable auditd to collect audit information", function(h){ return dossierHoteGuet(h, "/etc/audit") ? serviceActif(h, "auditd") : false; });
	D("ACCT-9630", "Accounting", "Checking audit rules (/etc/passwd, /etc/shadow)", 3, "suggestion", "Audit daemon is enabled with an empty ruleset. Disable the daemon or define rules", function(h){
		if (!dossierHoteGuet(h, "/etc/audit")) return false;
		var r = etatHote(h).audit.regles;
		return ["/etc/passwd", "/etc/shadow"].every(function(c){ return r.some(function(x){ return x.type === "w" && (x.chemin === c || x.chemin === "/etc") && x.perms.indexOf("w") > -1; }); });
	});
	D("TIME-3104", "Time and Synchronization", "Checking for a running NTP daemon or client", 2, "suggestion", "Use NTP daemon or NTP client to prevent time issues", function(h){ return serviceNtp(h) ? horlogeSynchronisee(h) : null; });
	D("MACF-6208", "Security frameworks", "Checking AppArmor profiles (enforce mode)", 2, "suggestion", "Put AppArmor profiles in enforce mode (aa-enforce)", function(h){
		if (!dossierHoteGuet(h, "/etc/apparmor.d")) return null;
		var p = etatHote(h).apparmor || {}, noms = Object.keys(p);
		return noms.length > 0 && noms.every(function(n){ return p[n].mode === "enforce"; });
	}, function(h){ var p = etatHote(h).apparmor || {}; return "Complain mode: " + Object.keys(p).filter(function(n){ return p[n].mode !== "enforce"; }).join(", "); });
	D("FINT-4350", "Software: file integrity", "Checking file integrity tool (AIDE database)", 2, "suggestion", "Install a file integrity tool to monitor changes to critical and sensitive files", function(h){
		if (typeof SOURCES_GUET.aideBase === "function"){ try { var r = SOURCES_GUET.aideBase(h); if (r !== null && r !== undefined) return !!r; } catch (e){} }
		if (!dossierHoteGuet(h, "/etc/aide") && !fichierExiste(h, "/etc/aide/aide.conf")) return null;
		return fichierExiste(h, "/var/lib/aide/aide.db") || fichierExiste(h, "/var/lib/aide/aide.db.gz");
	});
	D("TOOL-5190", "Software: System tooling", "Checking intrusion prevention (fail2ban sshd jail)", 2, "suggestion", "Enable fail2ban with the sshd jail", function(h){
		if (!dossierHoteGuet(h, "/etc/fail2ban")) return false;
		return serviceActif(h, "fail2ban") && !!(etatHote(h).f2b.conf || {}).sshd;
	});
	D("FILE-7524", "File Permissions", "Checking permissions of /etc/shadow", 3, "warning", "Restrict /etc/shadow to 640 root:shadow", function(h){
		var s = fichierHoteGuet(h, "/etc/shadow");
		if (!s) return null;
		return s.owner === "root" && ["rw-r-----", "rw-------", "r--r-----", "r--------", "---------"].indexOf(s.mode) > -1;
	});
	D("FILE-7526", "File Permissions", "Checking world writable files", 2, "warning", "Remove the write permission for others on system files", function(h){
		var trouve = false;
		itemsDeLHote(h, function(it, chemin){ if (!it.lien && /^\/(etc|usr|bin|sbin|var\/www|srv|opt|root|boot)\//.test(chemin) && it.mode.charAt(7) === "w") trouve = true; });
		return !trouve;
	});
	D("FILE-7528", "File Permissions", "Checking for unexpected SUID files", 2, "suggestion", "Remove the SUID bit from binaries that do not need it", function(h){
		var trouve = false;
		itemsDeLHote(h, function(it, chemin){ if (!it.lien && /[sS]/.test(it.mode.charAt(2)) && SUID_ATTENDUS.indexOf(chemin) === -1) trouve = true; });
		return !trouve;
	});
	D("FILE-7530", "File Permissions", "Checking dangerous file capabilities", 2, "warning", "Remove dangerous capabilities (cap_setuid, cap_sys_admin...) with setcap -r", function(h){
		var trouve = false;
		itemsDeLHote(h, function(it){ if (it.capacites && /cap_(setuid|setgid|sys_admin|dac_override|dac_read_search|sys_ptrace|sys_module|chown|fowner)/.test(it.capacites)) trouve = true; });
		return !trouve;
	});
	function banniere(id, fichier){
		D(id, "Banners and identification", "Checking " + fichier + " contents", 1, "suggestion", "Add a legal banner to " + fichier + ", to warn unauthorized users", function(h){
			var t = lireFichierHote(h, fichier);
			if (t === null) return false;
			return t.trim().length > 20 && !/\\[srvnmlo]|Debian|Ubuntu|GNU\/Linux|\b\d+\.\d+/.test(t) && /(autoris|interdit|authori[sz]ed|prohib|l[ée]gal|surveill|monitor|poursuite|prosecut)/i.test(t);
		});
	}
	banniere("BANN-7126", "/etc/issue");
	banniere("BANN-7130", "/etc/issue.net");
	D("SCHD-7704", "Scheduled tasks", "Checking cron.allow and at.allow", 1, "suggestion", "Restrict cron and at to allowed users (/etc/cron.allow, /etc/at.allow)", function(h){ return fichierExiste(h, "/etc/cron.allow") && fichierExiste(h, "/etc/at.allow"); });
	D("PKGS-7392", "Ports and packages", "Checking for vulnerable or outdated packages", 3, "warning", "Update your system with apt upgrade", function(h){
		if (typeof SOURCES_GUET.paquetsEnRetard === "function"){ try { var n = SOURCES_GUET.paquetsEnRetard(h); if (n !== null && n !== undefined) return +n === 0; } catch (e){} }
		return null;
	});
})();

Shell.sorts.lynis = function(args, io){
	var h = hoteIci(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (args.indexOf("--version") > -1 || args.indexOf("-V") > -1 || (mots[0] === "show" && mots[1] === "version")) return VERSION_LYNIS;
	if (!machineGardee(h)) absentIci(io, "lynis");
	if (mots[0] === "show"){
		if (mots[1] === "details"){
			var e0 = etatHote(h);
			if (!mots[2]) throw new ShellError("  Error: missing test ID\n  Example: lynis show details SSH-7408");
			if (!e0.lynis) throw new ShellError("  [!] Could not find log file /var/log/lynis.log" + astuce(io, "Lance d'abord sudo lynis audit system."));
			var lignesD = [], dedans = false;
			e0.lynis.journal.forEach(function(l){
				if (/Performing test ID /.test(l)) dedans = l.indexOf("test ID " + mots[2] + " ") > -1 || l.indexOf("test ID " + mots[2] + ":") > -1;
				else if (!/^\S+ \S+ Result: /.test(l)) dedans = false;
				if (dedans) lignesD.push(l);
			});
			if (!lignesD.length) return "";
			return lignesD.join("\n");
		}
		if (mots[1] === "tests") return CONTROLES_LYNIS.map(function(c){ return completerDroite(idAffiche(c.id), 12) + c.section; }).filter(function(x, i, t){ return t.indexOf(x) === i; }).join("\n");
		if (mots[1] === "options") return "--auditor\n--cronjob\n--debug\n--no-colors\n--quick\n--quiet\n--tests\n--tests-from-group";
		throw new ShellError("  Error: unknown show command '" + (mots[1] || "") + "'\n  Valid: lynis show details TEST-ID, lynis show version, lynis show tests");
	}
	if (mots[0] !== "audit" || mots[1] !== "system"){
		throw new ShellError("\n[ Lynis " + VERSION_LYNIS + " ]\n\n  Usage: lynis command [options]\n\n  Command:\n\n    audit\n        audit system                  : Perform local security scan\n\n    show\n        show details TEST-ID          : Show the details of a test\n        show version                  : Show the version\n" +
			astuce(io, "La Pierre d'Inspection se consulte avec : sudo lynis audit system"));
	}
	var tests = null, discret = args.indexOf("--quiet") > -1, k = args.indexOf("--tests");
	if (k > -1 && args[k + 1]) tests = args[k + 1].split(/[\s,]+/);
	var r = scoreLynis(h, tests ? function(c){ return tests.indexOf(idAffiche(c.id)) > -1 || tests.indexOf(c.id) > -1; } : null);
	var d = maintenantGuet(), tty = io.tty;
	function etat(texte, couleur){ return "[ " + (tty ? couleur(texte) : texte) + " ]"; }
	var L = ["", "[ Lynis " + VERSION_LYNIS + " ]", "", "################################################################################",
		"  Lynis comes with ABSOLUTELY NO WARRANTY. This is free software, and you are", "  welcome to redistribute it under the terms of the GNU General Public License.",
		"  See the LICENSE file for details about using this software.", "################################################################################", "", "",
		"[+] Initializing program", "------------------------------------"];
	if (!io.sudo) L.push(completerDroite("  - Non-privileged scan mode", 62) + etat("WARNING", C.rouge));
	L.push(completerDroite("  - Detecting OS...", 62) + etat("DONE", C.vert), completerDroite("  - Checking profiles...", 62) + etat("DONE", C.vert), "",
		"  ---------------------------------------------------", "  Program version:           " + VERSION_LYNIS, "  Operating system:          Linux", "  Operating system name:     Debian",
		"  Operating system version:  12", "  Kernel version:            " + versionNoyau(h).split("-")[0], "  Hardware platform:         x86_64", "  Hostname:                  " + h,
		"  ---------------------------------------------------", "  Profiles:                  /etc/lynis/default.prf", "  Log file:                  /var/log/lynis.log",
		"  Report file:               /var/log/lynis-report.dat", "  Report version:            1.0", "  ---------------------------------------------------", "  Auditor:                   [Not Specified]",
		"  Language:                  en", "  Test category:             all", "  Test group:                all", "  ---------------------------------------------------");
	var journal = [dateIsoGuet(d) + " Starting Lynis " + VERSION_LYNIS + " with PID " + (4000 + state.nbCommandes % 4000) + ", build date 2021-07-29", dateIsoGuet(d) + " ===---------------------------------------------------------------==="];
	var sections = ORDRE_SECTIONS_LYNIS.slice();
	r.detail.forEach(function(x){ if (sections.indexOf(x.controle.section) === -1) sections.push(x.controle.section); });
	sections.forEach(function(s){
		var dans = r.detail.filter(function(x){ return x.controle.section === s && x.ok !== null; });
		if (!dans.length) return;
		L.push("", "[+] " + s, "------------------------------------");
		dans.forEach(function(x){
			var c = x.controle, statut = x.ok ? etat("OK", C.vert) : (c.gravite === "warning" ? etat("WARNING", C.rouge) : etat("SUGGESTION", C.jaune));
			var lib = "  - " + c.libelle;
			L.push(lib.length < 62 ? completerDroite(lib, 62) + statut : lib + " " + statut);
			journal.push(dateIsoGuet(d) + " Performing test ID " + c.id + " (" + c.libelle + ")");
			journal.push(dateIsoGuet(d) + " Result: " + (x.ok ? "OK" : (c.gravite === "warning" ? "Warning: " : "Suggestion: ") + c.conseil + (x.details ? " (" + x.details + ")" : "")));
		});
	});
	var warnings = r.detail.filter(function(x){ return x.ok === false && x.controle.gravite === "warning"; });
	var suggestions = r.detail.filter(function(x){ return x.ok === false && x.controle.gravite !== "warning"; });
	var barre = new Array(Math.floor(r.score / 5) + 1).join("#");
	/* Comme lynis : un même test (KRNL-6000, SSH-7408) et un même conseil ne font qu'une entrée, avec tous ses détails. */
	function regrouper(liste){
		var groupes = [];
		liste.forEach(function(x){
			var g = groupes.filter(function(y){ return idAffiche(y.id) === idAffiche(x.id) && y.conseil === x.controle.conseil; })[0];
			if (!g){ g = { id: x.id, conseil: x.controle.conseil, details: [] }; groupes.push(g); }
			if (x.details) g.details.push(x.details);
		});
		return groupes;
	}
	function lister(signe, groupes){
		groupes.forEach(function(g){
			L.push("  " + signe + " " + g.conseil + " [" + idAffiche(g.id) + "]");
			g.details.forEach(function(d){ L.push("      - Details  : " + d); });
			L.push("");
		});
	}
	var gw = regrouper(warnings), gs = regrouper(suggestions);
	L.push("", "================================================================================", "", "  -[ Lynis " + VERSION_LYNIS + " Results ]-", "");
	if (gw.length){ L.push("  Warnings (" + gw.length + "):", "  ----------------------------"); lister("!", gw); }
	else L.push("  Great, no warnings", "");
	if (gs.length){ L.push("  Suggestions (" + gs.length + "):", "  ----------------------------"); lister("*", gs); }
	L.push("  Follow-up:", "  ----------------------------", "  - Show details of a test (lynis show details TEST-ID)", "  - Check the logfile for all details (less /var/log/lynis.log)", "",
		"================================================================================", "", "  Lynis security scan details:", "",
		"  Hardening index : " + r.score + " [" + completerDroite(barre, 20) + "]", "  Tests performed : " + r.controles.length, "  Plugins enabled : 0", "", "  Components:",
		"  - Firewall               [" + (r.detail.some(function(x){ return x.id === "FIRE-4590" && x.ok; }) ? "V" : "X") + "]", "  - Malware scanner        [" + (fichierHoteGuet(h, "/etc/rkhunter.conf") ? "V" : "X") + "]", "",
		"  Scan mode:", "  Normal [" + (io.sudo ? "V" : " ") + "]  Forensics [ ]  Integration [ ]  Pentest [" + (io.sudo ? " " : "V") + "]", "", "  Lynis modules:", "  - Compliance status      [?]",
		"  - Security audit         [V]", "  - Vulnerability scan     [V]", "", "  Files:", "  - Test and debug information      : /var/log/lynis.log",
		"  - Report data                     : /var/log/lynis-report.dat", "", "================================================================================");
	journal.push(dateIsoGuet(d) + " Hardening index : [" + r.score + "] [" + completerDroite(barre, 20) + "]", dateIsoGuet(d) + " Tests performed : " + r.controles.length, dateIsoGuet(d) + " Lynis " + VERSION_LYNIS + " finished");
	var e = etatHote(h);
	if (io.sudo){
		e.lynis = { score: r.score, date: d.getTime(), controles: r.controles, journal: journal };
		poserFichierHote(h, "/var/log/lynis.log", journal.join("\n"), { mode: "rw-r-----" });
		poserFichierHote(h, "/var/log/lynis-report.dat", ["# Lynis Report", "report_version_major=1", "report_version_minor=0", "report_datetime_start=" + dateIsoGuet(d), "auditor=[Not Specified]",
			"lynis_version=" + VERSION_LYNIS, "os=Linux", "os_name=Debian", "os_version=12", "hostname=" + h, "hardening_index=" + r.score, "lynis_tests_done=" + r.controles.length]
			.concat(warnings.map(function(x){ return "warning[]=" + idAffiche(x.id) + "|" + x.controle.conseil + "|" + (x.details || "-") + "|-|"; }))
			.concat(suggestions.map(function(x){ return "suggestion[]=" + idAffiche(x.id) + "|" + x.controle.conseil + "|" + (x.details || "-") + "|-|"; }))
			.concat(["report_datetime_end=" + dateIsoGuet(d)]).join("\n"), { mode: "rw-r-----" });
	} else if (e.lynis) e.lynis.journal = e.lynis.journal || journal;
	GameEvents.fire({ type: "lynis", hote: h, score: r.score, controles: r.controles, sudo: !!io.sudo });
	var texte = discret ? warnings.map(function(x){ return "  ! " + x.controle.conseil + " [" + idAffiche(x.id) + "]"; }).concat(["  Hardening index : " + r.score + " [" + completerDroite(barre, 20) + "]"]).join("\n") : L.join("\n");
	if (!io.sudo) texte += astuce(io, "Sans sudo, la Pierre ne garde aucune trace (ni /var/log/lynis.log, ni rapport) : sudo lynis audit system.");
	return texte;
};

/* ================================================================== */
/* Le manuel                                                            */
/* ================================================================== */

MANUEL["apachectl"] = page("vérifier et piloter le serveur web Apache", "APACHE ConTroL",
	"  apachectl configtest      vérifie la configuration sur le disque : « Syntax OK », ou la faute avec son fichier et sa ligne\n" +
	"  apachectl -t              la même chose\n" +
	"  apachectl -M              les modules chargés par cette configuration (headers_module, ssl_module...)\n" +
	"  apachectl -S              les sites (VirtualHost) : quel nom, quel port, quel fichier\n" +
	"  apachectl -v              la version d'Apache\n" +
	"  sudo apachectl graceful   recharge sans couper les connexions (comme systemctl reload apache2)\n\n" +
	"La règle d'or : on modifie /etc/apache2, on lance apachectl configtest, et SEULEMENT si c'est « Syntax OK »,\n" +
	"sudo systemctl reload apache2. Un reload refusé laisse l'ancienne configuration en place ; un restart raté éteint le site.\n" +
	"Tant qu'on n'a pas rechargé, Apache sert toujours l'ancienne configuration : curl le montre.\n\n" +
	"Les fichiers : /etc/apache2/apache2.conf (le principal), conf-available/security.conf (ServerTokens, ServerSignature,\n" +
	"TraceEnable), sites-available/*.conf (les sites), mods-available (les modules). Ce qui est actif est relié dans\n" +
	"conf-enabled, sites-enabled, mods-enabled : voir a2enmod, a2enconf, a2ensite.");
MANUEL["apache2ctl"] = page("le même que apachectl (son nom sous Debian)", "APACHE2 ConTroL", "apache2ctl est le nom Debian d'apachectl : mêmes options.\n\n" + MANUEL["apachectl"].page);
MANUEL["a2enmod"] = page("activer un module d'Apache", "Apache2 ENable MODule",
	"  sudo a2enmod headers      active le module headers (pour Header always set ...)\n  sudo a2enmod ssl          active ssl, et ce dont il dépend (socache_shmcb...)\n" +
	"  a2enmod -q NOM            sans bavardage\n\n" +
	"a2enmod relie mods-available/NOM.load (et NOM.conf) dans mods-enabled. Un module se charge au démarrage :\n" +
	"il faut ensuite sudo systemctl restart apache2 (après apachectl configtest).");
MANUEL["a2dismod"] = page("couper un module d'Apache", "Apache2 DISable MODule",
	"  sudo a2dismod autoindex   coupe le module qui fabrique les listes de fichiers\n  sudo a2dismod -f NOM      sans la question de confirmation pour un module essentiel\n\n" +
	"Pour un module essentiel, a2dismod demande de taper 'Yes, do as I say!'. Ensuite : apachectl configtest, puis\n" +
	"sudo systemctl restart apache2. Attention : une directive d'un module coupé (Header, sans headers) devient une faute.");
MANUEL["a2enconf"] = page("activer un morceau de configuration d'Apache", "Apache2 ENable CONFiguration",
	"  sudo a2enconf security    relie conf-available/security.conf dans conf-enabled\n\nEnsuite : apachectl configtest, puis sudo systemctl reload apache2.");
MANUEL["a2disconf"] = page("couper un morceau de configuration d'Apache", "Apache2 DISable CONFiguration",
	"  sudo a2disconf charset    retire le lien de conf-enabled (le fichier reste dans conf-available)\n\nEnsuite : sudo systemctl reload apache2.");
MANUEL["a2ensite"] = page("activer un site d'Apache", "Apache2 ENable SITE",
	"  sudo a2ensite default-ssl   active le site HTTPS par défaut (sites-available/default-ssl.conf)\n\nEnsuite : apachectl configtest, puis sudo systemctl reload apache2.");
MANUEL["a2dissite"] = page("couper un site d'Apache", "Apache2 DISable SITE",
	"  sudo a2dissite 000-default  coupe le site par défaut\n\nEnsuite : sudo systemctl reload apache2.");
MANUEL["getcap"] = page("voir les capacités des programmes", "GET CAPabilities",
	"  getcap FICHIER            les capacités d'un programme (rien : il n'en a pas)\n  getcap -r /               toutes les capacités de la machine, en descendant partout\n\n" +
	"Une capacité est un morceau des pouvoirs de root donné à un programme : cap_net_bind_service (écouter sur le port 80),\n" +
	"cap_net_raw (ping)... cap_setuid, elle, permet de devenir n'importe qui : sur un programme ordinaire, c'est une porte dérobée.");
MANUEL["setcap"] = page("donner ou retirer une capacité à un programme", "SET CAPabilities",
	"  sudo setcap -r FICHIER                        retire toutes ses capacités\n  sudo setcap cap_net_bind_service=+ep FICHIER   lui donne le droit d'écouter sous le port 1024\n\n" +
	"e, p, i : effective, permitted, inheritable. On donne le strict nécessaire, jamais cap_setuid ni cap_sys_admin.");
MANUEL["mount"] = page("voir et (re)monter les systèmes de fichiers", "MOUNT",
	"  mount                         tout ce qui est monté, avec ses options entre parenthèses\n  mount -t tmpfs                seulement les tmpfs\n" +
	"  sudo mount -o remount /tmp    remonte /tmp en relisant ses options dans /etc/fstab\n  sudo mount -o remount,noexec /tmp   en ajoutant une option\n" +
	"  sudo mount /tmp               monte /tmp tel que décrit dans /etc/fstab\n  sudo mount -a                 monte tout ce qui est dans /etc/fstab et ne l'est pas encore\n\n" +
	"Les options qui durcissent : nodev (pas de périphériques), nosuid (le bit SUID est ignoré), noexec (rien ne s'exécute).\n" +
	"Une ligne de /etc/fstab : tmpfs  /tmp  tmpfs  defaults,nodev,nosuid,noexec  0  0");
MANUEL["findmnt"] = page("trouver un point de montage et ses options", "FIND MouNT",
	"  findmnt                   l'arbre des montages\n  findmnt /tmp              /tmp seulement (rien, et le code 1 : il n'est pas monté à part)\n" +
	"  findmnt -n -o OPTIONS /tmp   juste ses options\n  findmnt --fstab           ce que dit /etc/fstab");
MANUEL["lsmod"] = page("lister les modules chargés dans le noyau", "LiSt MODules",
	"  lsmod                     chaque module, sa taille, et qui l'utilise\n  lsmod | grep usb          les modules USB\n\nPour charger ou retirer un module : modprobe.");
MANUEL["modprobe"] = page("charger ou retirer un module du noyau", "MODule PROBE",
	"  sudo modprobe NOM          charge un module (et ce dont il dépend)\n  sudo modprobe -r NOM       le retire\n" +
	"  modprobe -n -v NOM         dit ce qu'il ferait, sans rien faire (insmod ..., ou install /bin/false)\n  modprobe -c               la configuration lue dans /etc/modprobe.d\n\n" +
	"Interdire un module se fait dans /etc/modprobe.d/NOM.conf :\n  blacklist cramfs                 empêche seulement le chargement AUTOMATIQUE\n" +
	"  install usb-storage /bin/false   empêche tout chargement : modprobe échoue\nUn tiret ou un souligné, c'est pareil : usb-storage et usb_storage.");
MANUEL["grub-mkpasswd-pbkdf2"] = page("fabriquer le hash d'un mot de passe pour GRUB", "GRUB MaKe PASSWorD PBKDF2",
	"  grub-mkpasswd-pbkdf2      demande deux fois le mot de passe et affiche grub.pbkdf2.sha512.10000.SEL.HASH\n\n" +
	"On recopie ce hash dans /etc/grub.d/40_custom :\n  set superusers=\"admin\"\n  password_pbkdf2 admin grub.pbkdf2.sha512.10000....\n" +
	"puis sudo update-grub. Le mot de passe lui-même n'est écrit nulle part : seul son hash, impossible à retourner.");
MANUEL["update-grub"] = page("régénérer la configuration du démarrage", "UPDATE GRUB",
	"  sudo update-grub          relit /etc/default/grub et les scripts exécutables de /etc/grub.d, écrit /boot/grub/grub.cfg\n\n" +
	"C'est un raccourci pour sudo grub-mkconfig -o /boot/grub/grub.cfg. On ne modifie jamais grub.cfg à la main :\n" +
	"il serait écrasé à la prochaine mise à jour du noyau. Un script de /etc/grub.d sans le droit x est ignoré.");
MANUEL["grub-mkconfig"] = page("fabriquer la configuration de GRUB", "GRUB MaKe CONFIG",
	"  grub-mkconfig             affiche la configuration qui serait produite\n  sudo grub-mkconfig -o /boot/grub/grub.cfg   l'écrit (c'est ce que fait update-grub)");
MANUEL["cryptsetup"] = page("examiner les disques chiffrés (LUKS)", "CRYPT SETUP",
	"  sudo cryptsetup status NOM          un volume ouvert : type (LUKS2), chiffrement (aes-xts-plain64), taille de clé\n" +
	"  sudo cryptsetup luksDump /dev/sda3  l'en-tête LUKS : les keyslots, la dérivation de clé (argon2id)\n  sudo cryptsetup isLuks -v /dev/sda3 est-ce un volume LUKS ?\n\n" +
	"Les volumes chiffrés de la machine sont listés dans /etc/crypttab. Ici, on ne fait que vérifier :\n" +
	"luksFormat efface tout, et on ne touche pas aux clés d'un disque en service.");
MANUEL["auditctl"] = page("régler l'audit du noyau", "AUDIT ConTroL",
	"  sudo auditctl -w /etc/passwd -p wa -k comptes   surveille les écritures (w) et changements d'attributs (a) de /etc/passwd\n" +
	"  sudo auditctl -l          les règles en place\n  sudo auditctl -W /etc/passwd -p wa -k comptes   retire la règle\n" +
	"  sudo auditctl -D          retire toutes les règles\n  sudo auditctl -s          l'état (enabled, pid d'auditd...)\n  sudo auditctl -e 2        verrouille les règles jusqu'au redémarrage\n\n" +
	"-p : r (lecture), w (écriture), x (exécution), a (attributs : chmod, chown). -k : une clé pour retrouver les événements.\n" +
	"Une règle posée avec auditctl disparaît au redémarrage. Pour qu'elle reste : /etc/audit/rules.d/NOM.rules, puis augenrules --load.");
MANUEL["augenrules"] = page("charger les règles d'audit permanentes", "AUdit GENerate RULES",
	"  sudo augenrules --load    assemble /etc/audit/rules.d/*.rules dans /etc/audit/audit.rules et les charge\n  sudo augenrules --check   dit si les règles ont changé\n\n" +
	"Un fichier de règles contient une règle par ligne, écrite comme pour auditctl : -w /etc/shadow -p wa -k comptes\n" +
	"Au redémarrage d'auditd (sudo systemctl restart auditd), les règles sont rechargées de la même façon.");
MANUEL["ausearch"] = page("chercher dans le journal d'audit", "AUdit SEARCH",
	"  sudo ausearch -k comptes          les événements de la clé comptes\n  sudo ausearch -k comptes -i       les mêmes, lisibles (noms au lieu de numéros)\n" +
	"  sudo ausearch -f /etc/passwd      tout ce qui touche ce fichier\n  sudo ausearch -k comptes --start today   depuis ce matin (aussi : recent, yesterday, 22:00:00)\n" +
	"  sudo ausearch -k comptes --format text   une phrase par événement : qui, quoi, avec quel programme\n\n" +
	"Dans un événement : comm et exe (le programme), auid (qui s'est connecté, même après sudo), uid (sous quel compte).\n" +
	"« <no matches> » : rien trouvé (code 1).");
MANUEL["aureport"] = page("résumer le journal d'audit", "AUdit REPORT",
	"  sudo aureport              le résumé : nombre de changements, de connexions, d'événements\n  sudo aureport -f -i        les fichiers touchés\n" +
	"  sudo aureport -k --summary  combien d'événements par clé\n  sudo aureport -au          les authentifications\n  sudo aureport -x           les programmes\n" +
	"  sudo ausearch -k comptes --raw | sudo aureport -f -i   le rapport d'une recherche");
MANUEL["logger"] = page("écrire une ligne dans le journal du système", "LOGGER",
	"  logger \"Test de la Tour\"              une ligne, au nom de ton compte\n  logger -t bastion -p auth.warning \"...\"  avec une étiquette et une priorité (facility.niveau)\n" +
	"  journalctl -t bastion                   la retrouver\n\nPratique pour vérifier que les journaux arrivent bien là où on les attend (fichier, serveur distant).");
MANUEL["rsyslogd"] = page("vérifier la configuration de rsyslog", "Reliable SYStem LOG Daemon",
	"  rsyslogd -N1              valide /etc/rsyslog.conf et /etc/rsyslog.d/*.conf sans rien lancer\n\n" +
	"Une règle : SÉLECTEUR ACTION. *.* @@journaux:514 envoie tout au serveur journaux en TCP (@ pour UDP).\n" +
	"auth,authpriv.* /var/log/auth.log range les authentifications. Après une modification : rsyslogd -N1, puis\n" +
	"sudo systemctl restart rsyslog. Envoyer ses journaux ailleurs, c'est les garder même si la machine tombe.");
MANUEL["logrotate"] = page("faire tourner les journaux", "LOG ROTATE",
	"  logrotate -d /etc/logrotate.d/NOM     montre ce qu'il ferait (debug), sans rien toucher\n  sudo logrotate -f /etc/logrotate.d/NOM   force la rotation maintenant\n\n" +
	"Un bloc : /var/log/bastion/*.log { weekly  rotate 4  compress  missingok  notifempty  create 0640 root adm }\n" +
	"acces.log devient acces.log.1, l'ancien .1 devient .2.gz... au-delà de rotate N, les plus vieux sont supprimés.\n" +
	"Un fichier de configuration modifiable par d'autres que root est ignoré : c'est voulu.");
MANUEL["aa-status"] = page("voir l'état d'AppArmor", "AppArmor STATUS",
	"  sudo aa-status            les profils chargés, en mode enforce (ils bloquent) ou complain (ils notent seulement)\n\n" +
	"AppArmor enferme un programme dans un profil : les fichiers qu'il peut lire, écrire, exécuter. Un profil en complain\n" +
	"ne protège rien : il note ce qu'il aurait interdit. Voir aa-enforce.");
MANUEL["aa-enforce"] = page("mettre un profil AppArmor en mode enforce", "AppArmor ENFORCE",
	"  sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2   le profil bloque désormais ce qu'il interdit\n  sudo aa-enforce /usr/sbin/apache2                  par le programme, c'est pareil");
MANUEL["aa-complain"] = page("mettre un profil AppArmor en mode complain", "AppArmor COMPLAIN",
	"  sudo aa-complain /etc/apparmor.d/usr.sbin.apache2  le profil note sans bloquer (pour mettre au point un profil)");
MANUEL["aa-disable"] = page("désactiver un profil AppArmor", "AppArmor DISABLE",
	"  sudo aa-disable /etc/apparmor.d/usr.sbin.apache2   retire le profil (un lien dans /etc/apparmor.d/disable)");
MANUEL["apparmor_parser"] = page("charger un profil AppArmor", "AppArmor PARSER",
	"  sudo apparmor_parser -r /etc/apparmor.d/NOM   recharge un profil après l'avoir modifié\n  sudo apparmor_parser -R /etc/apparmor.d/NOM   le retire du noyau");
MANUEL["lynis"] = page("la Pierre d'Inspection : auditer le durcissement de la machine", "LYNIS",
	"  sudo lynis audit system           passe la machine en revue : chaque contrôle OK, WARNING ou SUGGESTION,\n" +
	"                                    puis « Hardening index : 38 [#######             ] » (de 0 à 100)\n" +
	"  sudo lynis audit system | grep \"Hardening index\"   juste le score\n  lynis show details SSH-7408        le détail d'un contrôle, lu dans /var/log/lynis.log\n" +
	"  lynis --version                   la version\n\n" +
	"lynis lit l'état RÉEL : ce qui tourne (Apache rechargé, sysctl appliqués, règles d'audit chargées), pas seulement\n" +
	"les fichiers. Chaque WARNING est une porte ouverte ; chaque SUGGESTION, un mur à renforcer. Le rapport complet est dans\n" +
	"/var/log/lynis-report.dat.");

MANUEL["curl"].page += "\n\nVers un serveur Apache, curl voit la configuration qui TOURNE (la dernière rechargée) :\n" +
	"  curl -I https://bastion           les en-têtes : Server (selon ServerTokens), Strict-Transport-Security...\n" +
	"  curl -X TRACE http://bastion/     la méthode TRACE : 405 si TraceEnable Off\n  curl -v https://bastion/          la poignée de main TLS et le certificat, sur la sortie d'erreur\n" +
	"  curl -k https://...               ne vérifie pas le certificat (pour un test seulement)\n  curl -L http://bastion/           suit les redirections\n" +
	"  curl -s -o /dev/null -w \"%{http_code}\\n\" URL   juste le code HTTP";
MANUEL["openssl"].page += "\n\nPour vérifier sa propre configuration TLS :\n" +
	"  openssl x509 -in FICHIER -noout -dates       début et fin de validité (notBefore, notAfter)\n" +
	"  openssl x509 -in FICHIER -noout -subject -issuer   pour qui, signé par qui\n  openssl x509 -in FICHIER -noout -checkend 2592000  expire-t-il dans les 30 jours ?\n" +
	"  openssl s_client -connect bastion:443 -tls1_1   le serveur accepte-t-il TLS 1.1 ? (refusé : alerte protocol version)\n" +
	"  openssl s_client -connect bastion:443 -tls1_2   et TLS 1.2 ?\n" +
	"  openssl req -x509 -newkey rsa:2048 -days 365 -nodes -keyout c.key -out c.pem -subj \"/CN=bastion\"   un certificat auto-signé";
MANUEL["sysctl"].page += "\n\nSur un serveur qui a /etc/sysctl.d :\n  sudo sysctl --system      applique /etc/sysctl.d/*.conf puis /etc/sysctl.conf, dans l'ordre (« * Applying ... »)\n" +
	"  sudo sysctl -p FICHIER    applique un seul fichier\n  sysctl -a | grep redirects   toutes les clés\n  sysctl -n kernel.dmesg_restrict   juste la valeur\n" +
	"Les réglages durcis : net.ipv4.ip_forward=0, net.ipv4.conf.all.rp_filter=1, accept_redirects=0, kernel.dmesg_restrict=1,\n" +
	"kernel.kptr_restrict=2, kernel.randomize_va_space=2, fs.protected_symlinks=1.";
MANUEL["systemctl"].page += "\n\nRecharger un service après avoir changé sa configuration :\n  sudo systemctl reload apache2    relit la configuration ; refusée si elle est fausse (l'ancienne reste)\n" +
	"  sudo systemctl restart auditd    recharge aussi les règles de /etc/audit/rules.d\n  sudo systemctl restart systemd-journald   applique Storage= de /etc/systemd/journald.conf";
MANUEL["journalctl"].page += "\n\n  journalctl --disk-usage   la place prise par le journal\n  sudo journalctl -t ÉTIQUETTE   les lignes d'une étiquette (logger -t)\n" +
	"  sudo journalctl -p err    seulement les erreurs et plus grave\nStorage=persistent dans /etc/systemd/journald.conf garde le journal après un redémarrage (dans /var/log/journal).";
MANUEL["timedatectl"].page += "\n\n  timedatectl show          les mêmes informations, en CLÉ=valeur\n  sudo timedatectl set-timezone Europe/Paris   le fuseau";
if (MANUEL["chronyc"]) MANUEL["chronyc"].page += "\n\nchronyc lit /etc/chrony/chrony.conf (lignes server et pool). chronyc activity : combien de sources répondent.";
if (MANUEL["fail2ban-client"]) MANUEL["fail2ban-client"].page += "\n\nSur un serveur, la configuration est dans /etc/fail2ban/jail.local :\n  [sshd]\n  enabled = true\n  maxretry = 3\n  bantime = 1h\n" +
	"puis sudo fail2ban-client reload, et sudo fail2ban-client status pour voir les prisons actives.";
if (MANUEL["rkhunter"]) MANUEL["rkhunter"].page += "\n\n  sudo rkhunter --check --sk   sans attendre une touche entre les sections\n  sudo rkhunter --propupd      enregistre l'état actuel des programmes comme référence\n" +
	"  sudo rkhunter --check --rwo  seulement les avertissements";

/* ================================================================== */
/* Le barème et les listes                                              */
/* ================================================================== */

SORTS_GUET.push("apparmor_parser");
/* Ces sorts existent maintenant : plus besoin de dire qu'ils manquent à ce monde. */
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_GUET.indexOf(c) === -1; });
/* Tant qu'aucun chapitre ne les range dans sa liste ORDRE_DES_SORTS, leur premier usage ne rapporte pas d'XP (hors barème). */
function sortGuetHorsBareme(sort){ return SORTS_GUET.indexOf(sort) > -1 && tousLesSorts().indexOf(sort) === -1; }
var PREMIER_USAGE_AVANT_GUET = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if (sortGuetHorsBareme(sort)){
		this.usages[sort] = true;
		return;
	}
	return PREMIER_USAGE_AVANT_GUET.apply(this, arguments);
};

/* FIN DES SORTS DU GUET */
