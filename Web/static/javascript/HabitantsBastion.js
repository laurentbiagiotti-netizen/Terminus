/**
 * HabitantsBastion.js : les quêtes annexes du chapitre 5 (le Bastion, numéro interne 6). Strictement défensives.
 *
 * Six habitants de la garnison, dans les tours du Bastion. Les notions, absentes de tous les chapitres (étapes, défis,
 * autres annexes) :
 *   a5_voyageur    le Colporteur  (Pont-levis)  known_hosts, ssh-keygen -F et -R, ssh-keyscan, vérifier une empreinte
 *   a5_devise      le Sergent     (Herse)       pam_pwquality : /etc/security/pwquality.conf (minlen, minclass), pwscore
 *   a5_guetteur    la Sentinelle  (Guet)        une unité systemd .path (PathChanged=/etc/passwd), list-units --type=path
 *   a5_greffier    le Greffier    (Sceau)       Defaults log_output (visudo -f), sudoreplay -l, sudoreplay ID
 *   a5_coffre      la Cantinière  (Coffres)     openssl enc -aes-256-cbc -pbkdf2 (chiffrer, déchiffrer), cmp
 *   a5_certificat  le Héraut      (Bannière)    les certificats SSH : ssh-keygen -s, -I, -n, -V, ssh-keygen -L, TrustedUserCAKeys
 * Toutes faites : le badge « Ami du Bastion ».
 */

World.fige = false;

function axOuverteCh5(){ return typeof bastionOuvert === "function" && bastionOuvert(); }
function axTour(cle){ return tourCh5(cle).lieu; }

/* ------------------------------------------------------------------ */
/* Ce que le Bastion déclare à l'ouverture : les paquets de pwquality   */
/* ------------------------------------------------------------------ */

var AX_PWQUALITY_CONF = "# Configuration for systemwide password quality limits\n# Defaults:\n#\n# Number of characters in the new password that must not be present in the\n# old password.\n# difok = 1\n#\n" +
	"# Minimum acceptable size for the new password (plus one if\n# credits are not disabled which is the default). (See pam_cracklib manual.)\n# Cannot be set to lower value than 6.\n# minlen = 8\n#\n" +
	"# The maximum credit for having digits in the new password. If less than 0\n# it is the minimum number of digits in the new password.\n# dcredit = 0\n#\n# ucredit = 0\n# lcredit = 0\n# ocredit = 0\n#\n" +
	"# The minimum number of required classes of characters for the new\n# password (digits, uppercase, lowercase, others).\n# minclass = 0\n#\n# The maximum number of allowed consecutive same characters in the new password.\n# The check is disabled if the value is 0.\n# maxrepeat = 0\n#\n" +
	"# Whether to check for the words from the passwd entry GECOS string of the user.\n# usercheck = 1\n#\n# Whether to check if it contains words from the cracklib dictionary.\n# dictcheck = 1\n";
var AX_COMMON_PASSWORD = "#\n# /etc/pam.d/common-password - password-related modules common to all services\n#\n# here are the per-package modules (the \"Primary\" block)\n" +
	"password\trequisite\t\t\tpam_pwquality.so retry=3\npassword\t[success=1 default=ignore]\tpam_unix.so obscure use_authtok try_first_pass yescrypt\n# here's the fallback if no module succeeds\npassword\trequisite\t\t\tpam_deny.so\npassword\trequired\t\t\tpam_permit.so\n# end of pam-auth-update config\n";
var DECLARER_MONDE_BASTION_AVANT_ANNEXES = declarerMondeBastion;
declarerMondeBastion = function(){
	var deja = BASTION_DECLARE;
	DECLARER_MONDE_BASTION_AVANT_ANNEXES.apply(this, arguments);
	if (deja || !BASTION_DECLARE) return;
	declarerPaquet(H5, "libpam-pwquality", { version: "1.4.5-1+b1", description: "PAM module to check password strength", installe: false, poser: false, taille: 61, section: "admin",
		fichiers: { "/etc/security/pwquality.conf": AX_PWQUALITY_CONF.replace(/\n$/, ""), "/etc/pam.d/common-password": AX_COMMON_PASSWORD.replace(/\n$/, ""), "/usr/lib/x86_64-linux-gnu/security/pam_pwquality.so": "ELF pam_pwquality.so 1.4.5" },
		conffiles: ["/etc/security/pwquality.conf", "/etc/pam.d/common-password"] });
	declarerPaquet(H5, "libpwquality-tools", { version: "1.4.5-1+b1", description: "library for password quality checking and generation (tools)", installe: false, poser: false, taille: 46, section: "admin",
		fichiers: { "/usr/bin/pwscore": "ELF pwscore 1.4.5", "/usr/bin/pwmake": "ELF pwmake 1.4.5" } });
};

/* ------------------------------------------------------------------ */
/* 1. La clé du voyageur (le Colporteur)                               */
/* ------------------------------------------------------------------ */

function axCleRelais(graine){ return "ssh-ed25519 " + axBase64([0, 0, 0, 11].concat(axOctetsTexte("ssh-ed25519"), [0, 0, 0, 32], axOctetsAlea("cle-hote-" + graine, 32))); }
var AX_CLE_RELAIS = axCleRelais("relais-2026"), AX_CLE_RELAIS_ANCIENNE = axCleRelais("relais-2025");
var AxRelais = axMachine("relais", "10.0.99.20", "Le relais des courriers de la garnison : réinstallé cette semaine, il porte une clé neuve.", "loc_cluster.gif",
	{ axVerifierCle: true, axCleHote: AX_CLE_RELAIS });
axFichier(AxRelais, "LISEZMOI", "LE RELAIS DES COURRIERS\n\nRéinstallé le 14 octobre par Vint. Nouvelle clé de la machine (ED25519) :\n  " + axEmpreinteCle(AX_CLE_RELAIS) + "\nSi ssh t'en a montré une autre, préviens la garnison.", { image: "item_sign.gif" });
function axKnownHostsAvec(cle){
	var it = axKnownHosts(false);
	return !!it && lignesDe(it.getText()).some(function(l){ return axLigneKnownHosts(l, ["relais", "10.0.99.20"]) && l.indexOf(cle.split(" ")[1]) > -1; });
}
var AxColporteur = axHabitant(axTour("pontlevis"), "Colporteur", function(){
	if (aFait("a5_voyageur")) return "Le Colporteur rajuste sa besace. « Une clé vérifiée par un autre chemin, puis gardée. La prochaine fois que ssh criera, tu sauras pourquoi, et quoi faire. »";
	return "Un homme couvert de poussière, une besace de lettres sur l'épaule, attend au pied du pont-levis.\n\n" +
		"« Le Colporteur. Chaque matin, je prends les courriers sur le relais (la machine relais). Tu t'y es connecté le mois dernier, souviens-toi : ta machine a gardé sa clé. " +
		"Mais ce matin, ssh relais hurle que l'identité du relais a changé, que quelqu'un est peut-être au milieu.\n\n" +
		"Vint m'a dit par téléphone qu'il avait réinstallé le relais, et il m'a dicté l'empreinte de la nouvelle clé : " + axEmpreinteCle(AX_CLE_RELAIS) + ". " +
		"Vérifie, avant de faire confiance. Regarde ce que ta machine garde du relais, relève la clé qu'il présente aujourd'hui, oublie l'ancienne, " +
		"puis connecte-toi en acceptant la nouvelle seulement si son empreinte est bien celle que Vint m'a dictée. »\n\n" +
		C.gris("Les outils : ssh relais (pour voir) ; ssh-keygen -F relais ; ssh-keyscan relais ; ssh-keygen -R relais ; ssh relais (comparer, puis yes).");
}, ["ssh-keyscan"]);
declarerAnnexe({ id: "a5_voyageur", chapitre: 6, titre: "La clé du voyageur", habitant: "le Colporteur", lieu: "au Pont-levis", item: function(){ return AxColporteur; }, ouverte: axOuverteCh5,
	indice: "au Pont-levis, un homme couvert de poussière attend ses lettres.",
	resume: "Une clé de serveur qui change : ce que garde known_hosts (ssh-keygen -F), la clé présentée (ssh-keyscan), oublier l'ancienne (-R), vérifier l'empreinte.",
	etapes: [
		{ titre: "Ce que ta machine garde du relais (ssh-keygen -F relais)", fait: function(){ return axVu("a5_voyageur", "F"); } },
		{ titre: "La clé que le relais présente aujourd'hui (ssh-keyscan relais)", fait: function(){ return axVu("a5_voyageur", "scan"); } },
		{ titre: "Oublier l'ancienne clé (ssh-keygen -R relais)", fait: function(){ return axVu("a5_voyageur", "R") && !axKnownHostsAvec(AX_CLE_RELAIS_ANCIENNE); } },
		{ titre: "Se connecter, l'empreinte vérifiée (ssh relais)", fait: function(){ return axVu("a5_voyageur", "connecte") && axKnownHostsAvec(AX_CLE_RELAIS); } }
	],
	souvenir: { nom: "Sceau-de-cire", texte: "Un sceau de cire, brisé puis recollé. Le Colporteur dit qu'on ne recolle un sceau qu'après avoir appelé l'expéditeur." },
	lumiere: "la lanterne du relais des courriers",
	merci: "Le Colporteur ouvre sa besace : les courriers sont là, intacts. « Vérifié par un autre chemin : c'est ça, la confiance. »"
});
GameEvents.addListener("read", function(e){
	if (e.item === AxColporteur && axOuverteCh5() && annexeProposee(annexeParId("a5_voyageur")) && !axVu("a5_voyageur", "souvenirPose")){
		axNoter("a5_voyageur", "souvenirPose");
		var kh = axKnownHosts(true);
		if (!lignesDe(kh.getText()).some(function(l){ return axLigneKnownHosts(l, ["relais", "10.0.99.20"]); })) kh.setText((kh.getText() === "" ? "" : kh.getText().replace(/\n$/, "") + "\n") + "relais " + AX_CLE_RELAIS_ANCIENNE);
	}
});
GameEvents.addListener("axKnownHosts", function(e){
	if (!axOuverteCh5() || e.hote !== "relais") return;
	if (e.action === "F" && e.trouve) axNoter("a5_voyageur", "F");
	if (e.action === "R" && e.trouve) axNoter("a5_voyageur", "R");
});
GameEvents.addListener("axKeyscan", function(e){ if (axOuverteCh5() && e.sortie.indexOf(AX_CLE_RELAIS.split(" ")[1]) > -1) axNoter("a5_voyageur", "scan"); });
GameEvents.addListener("axSsh", function(e){ if (axOuverteCh5() && e.hote === "relais" && e.session) axNoter("a5_voyageur", "connecte"); });

/* ------------------------------------------------------------------ */
/* 2. La devise de la garnison (le Sergent)                            */
/* ------------------------------------------------------------------ */

function axPaquetInstalle(nom){ var e = typeof etatPaquet === "function" ? etatPaquet(H5, nom) : null; return !!(e && e.etat === "ii"); }
function axDeviseEcrite(){
	var t = texteHote(H5, "/etc/security/pwquality.conf");
	if (t === null) return false;
	var c = axConfigPwquality(t);
	return c.minlen >= 12 && c.minclass >= 3;
}
var AxSergent = axHabitant(axTour("herse"), "Sergent", function(){
	if (aFait("a5_devise")) return "Le Sergent bombe le torse. « Douze caractères, trois sortes au moins. La devise est gravée, et le Bastion la fait respecter tout seul. »";
	return "Un soldat moustachu, un clairon à la ceinture, inspecte les mots de passe de la garnison comme on inspecte des bottes.\n\n" +
		"« Sergent de la garnison ! Les mots de passe de mes hommes sont une honte : soleil, bastion, 123456. " +
		"Sur le Bastion, rien n'empêche quelqu'un de choisir un mot faible quand il le change. Il nous faut une devise, appliquée par le serveur lui-même.\n\n" +
		"Installe le gardien des mots de passe (le module pwquality de PAM) et son outil d'essai. Puis grave la devise dans sa configuration : " +
		"douze caractères au moins, et trois sortes de caractères au moins (chiffres, majuscules, minuscules, autres). " +
		"Éprouve-la : un mot faible doit être refusé, un mot solide accepté. »\n\n" +
		C.gris("Les outils, sur le Bastion : sudo apt install libpam-pwquality libpwquality-tools ; /etc/security/pwquality.conf (minlen = 12, minclass = 3) ; echo \"MOT\" | pwscore.");
}, ["pwscore"]);
declarerAnnexe({ id: "a5_devise", chapitre: 6, titre: "La devise de la garnison", habitant: "le Sergent", lieu: "à la Herse", item: function(){ return AxSergent; }, ouverte: axOuverteCh5,
	indice: "à la Herse, un sergent inspecte les mots de passe comme des bottes.",
	resume: "Imposer des mots de passe solides (pam_pwquality, /etc/security/pwquality.conf), et les éprouver (pwscore).",
	etapes: [
		{ titre: "Installer pwquality et son outil d'essai (apt install libpam-pwquality libpwquality-tools)", fait: function(){ return axPaquetInstalle("libpam-pwquality") && axPaquetInstalle("libpwquality-tools"); } },
		{ titre: "Graver la devise : minlen = 12 et minclass = 3 (/etc/security/pwquality.conf)", fait: function(){ return axDeviseEcrite(); } },
		{ titre: "Un mot faible est refusé (pwscore)", fait: function(){ return axVu("a5_devise", "refus"); } },
		{ titre: "Un mot solide est accepté (pwscore)", fait: function(){ return axVu("a5_devise", "accepte"); } }
	],
	souvenir: { nom: "Clairon-du-sergent", texte: "Un petit clairon de cuivre. Gravé sur le pavillon : « minlen = 12, minclass = 3 »." },
	lumiere: "les torches de la Herse",
	merci: "Le Sergent sonne du clairon. « Garde-à-vous ! Plus un mot de passe faible ne franchira la Herse. »"
});
GameEvents.addListener("axPwscore", function(e){
	if (!axOuverteCh5() || e.hote !== H5 || !(e.config.minlen >= 12 && e.config.minclass >= 3)) return;
	if (!e.ok) axNoter("a5_devise", "refus");
	if (e.ok) axNoter("a5_devise", "accepte");
});
/* pwscore n'existe sur le Bastion qu'une fois libpwquality-tools installé. */
var PWSCORE_AVANT_BASTION = Shell.sorts.pwscore;
Shell.sorts.pwscore = function(args, io){
	var h = Shell.hote();
	if (!fichierHote(h, "/usr/bin/pwscore")) throw new ShellError("-bash: pwscore: command not found" + axAstuce(io, "(pwscore vient du paquet libpwquality-tools : sudo apt install libpwquality-tools, sur le Bastion.)"), 127);
	return PWSCORE_AVANT_BASTION.apply(this, arguments);
};

/* ------------------------------------------------------------------ */
/* 3. Le guetteur automatique (la Sentinelle)                          */
/* ------------------------------------------------------------------ */

function axDirectives(texte){
	var d = {}, section = null;
	lignesDe(texte || "").forEach(function(l){
		var s = /^\s*\[([A-Za-z]+)\]\s*$/.exec(l);
		if (s){ section = s[1]; d[section] = d[section] || {}; return; }
		var m = /^\s*([A-Za-z]+)\s*=\s*(.*?)\s*$/.exec(l);
		if (m && section && !/^\s*[#;]/.test(l)) (d[section][m[1]] = d[section][m[1]] || []).push(m[2]);
	});
	return d;
}
/* Les unités .path actives qui surveillent un fichier : [{ unite, service }]. */
function axGuetteurs(chemin){
	var liste = [];
	fichiersDuDossier(H5, "/etc/systemd/system").forEach(function(f){
		if (!/\.path$/.test(f.nom) || !f.item || f.item.lien) return;
		var d = axDirectives(f.item.getText()), p = d.Path || {};
		var vise = (p.PathChanged || []).concat(p.PathModified || []);
		if (vise.indexOf(chemin) === -1) return;
		var e = etatUnite(H5, f.nom);
		if (!e.actif) return;
		var service = (p.Unit && p.Unit[0]) || f.nom.replace(/\.path$/, ".service");
		liste.push({ unite: f.nom, service: service });
	});
	return liste;
}
function axLancerServiceGuet(service){
	var f = fichierHote(H5, "/etc/systemd/system/" + service) || fichierHote(H5, "/lib/systemd/system/" + service);
	if (!f) { journalGuet(H5, { unite: "systemd[1]", message: service + ": Failed to start: Unit " + service + " not found.", prio: 3 }); return false; }
	var d = axDirectives(f.getText()), exec = ((d.Service || {}).ExecStart || [""])[0];
	var desc = ((d.Unit || {}).Description || [service])[0];
	journalGuet(H5, { unite: "systemd[1]", message: "Starting " + service + " - " + desc + "..." });
	var m = /^\s*(?:\/usr\/bin\/)?logger\s+(.*)$/.exec(exec);
	if (m){
		var mots = (m[1].match(/"[^"]*"|'[^']*'|\S+/g) || []).map(function(x){ return x.replace(/^["']|["']$/g, ""); });
		var tag = "logger", prio = 5, msg = [];
		for (var i = 0; i < mots.length; i++){
			if (mots[i] === "-t"){ tag = mots[++i] || tag; continue; }
			if (mots[i] === "-p"){ var p = (mots[++i] || "").split(".").pop(); var k = typeof PRIORITES_SYSLOG !== "undefined" ? PRIORITES_SYSLOG.indexOf(p) : -1; if (k > -1) prio = k; continue; }
			msg.push(mots[i]);
		}
		journalGuet(H5, { unite: tag, message: msg.join(" "), prio: prio, fac: "auth" });
	}
	journalGuet(H5, { unite: "systemd[1]", message: service + ": Deactivated successfully." });
	journalGuet(H5, { unite: "systemd[1]", message: "Finished " + service + " - " + desc + "." });
	return !!m;
}
function axTicGuetteur(){
	if (!axOuverteCh5()) return;
	var f = fichierHote(H5, "/etc/passwd");
	if (!f) return;
	var empreinte = md5(f.getText()), s = axEtat("a5_guetteur");
	if (s.passwd === undefined){ s.passwd = empreinte; return; }
	if (s.passwd === empreinte) return;
	s.passwd = empreinte;
	var guetteurs = axGuetteurs("/etc/passwd");
	guetteurs.forEach(function(g){ if (axLancerServiceGuet(g.service)) axNoter("a5_guetteur", "declenche"); });
}
var VERIFIER_ANNEXES_AVANT_GUET = verifierAnnexes;
verifierAnnexes = function(){
	try { axTicGuetteur(); } catch (e){}
	return VERIFIER_ANNEXES_AVANT_GUET.apply(this, arguments);
};
function axUnitesGuetEcrites(){
	var p = texteHote(H5, "/etc/systemd/system/guet-passwd.path"), sv = texteHote(H5, "/etc/systemd/system/guet-passwd.service");
	if (p === null || sv === null) return false;
	var dp = axDirectives(p), ds = axDirectives(sv);
	var vise = ((dp.Path || {}).PathChanged || []).concat((dp.Path || {}).PathModified || []);
	return vise.indexOf("/etc/passwd") > -1 && /logger/.test(((ds.Service || {}).ExecStart || [""])[0]);
}
var AxSentinelle = axHabitant(axTour("guet"), "Sentinelle", function(){
	if (aFait("a5_guetteur")) return "La Sentinelle s'étire. « Le fichier des comptes bouge, et la cloche sonne toute seule dans le journal. Je peux enfin dormir. »";
	return "Une jeune femme en cotte de mailles, les yeux cernés, fixe un registre sans ciller.\n\n" +
		"« La Sentinelle. Ma consigne : sonner l'alarme chaque fois que le fichier des comptes (/etc/passwd) change. Un compte ajouté en douce, c'est le début d'une invasion. " +
		"Mais je ne peux pas le fixer jour et nuit.\n\n" +
		"systemd sait guetter un fichier pour moi. Écris deux unités dans /etc/systemd/system : guet-passwd.path, qui surveille /etc/passwd, " +
		"et guet-passwd.service, qu'il déclenche, et qui écrit une alerte dans le journal (avec logger). Charge-les, active le guetteur, et vérifie qu'il est bien à son poste. " +
		"Puis éprouve-le : un compte de test ajouté doit faire sonner l'alerte, que tu liras dans le journal. »\n\n" +
		C.gris("Les outils, sur le Bastion : [Path] PathChanged=/etc/passwd ; [Service] Type=oneshot, ExecStart=/usr/bin/logger -t guetteur \"...\" ; [Install] WantedBy=multi-user.target ;\n" +
			"sudo systemctl daemon-reload ; sudo systemctl enable --now guet-passwd.path ; systemctl list-units --type=path ; sudo useradd ... ; sudo journalctl -t guetteur.");
}, [], ["useradd"]);
declarerAnnexe({ id: "a5_guetteur", chapitre: 6, titre: "Le guetteur automatique", habitant: "la Sentinelle", lieu: "à la Tour de Guet", item: function(){ return AxSentinelle; }, ouverte: axOuverteCh5,
	indice: "à la Tour de Guet, une sentinelle aux yeux cernés fixe un registre.",
	resume: "Une unité systemd .path qui surveille /etc/passwd et déclenche une alerte (PathChanged, logger, list-units --type=path).",
	etapes: [
		{ titre: "Écrire guet-passwd.path (PathChanged=/etc/passwd) et guet-passwd.service (logger)", fait: function(){ return axUnitesGuetEcrites(); } },
		{ titre: "Les charger, activer le guetteur, et le voir à son poste (systemctl list-units --type=path)", fait: function(){ var e = etatUnite(H5, "guet-passwd.path"); return e.actif && e.enabled && axVu("a5_guetteur", "liste"); } },
		{ titre: "Ajouter un compte de test : le guetteur déclenche l'alerte", fait: function(){ return axVu("a5_guetteur", "declenche"); } },
		{ titre: "Lire l'alerte dans le journal (journalctl)", fait: function(){ return axVu("a5_guetteur", "lue"); } }
	],
	souvenir: { nom: "Cloche-du-guet", texte: "Une clochette de bronze, sans battant : la Sentinelle dit que celle-là sonne dans le journal." },
	lumiere: "le feu de la Tour de Guet",
	merci: "Au loin, une alerte s'inscrit dans le journal du Bastion. La Sentinelle sourit : « Elle a sonné sans moi. »"
});
var SYSTEMCTL_AVANT_GUET_ANNEXES = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var sortie = SYSTEMCTL_AVANT_GUET_ANNEXES.apply(this, arguments);
	try {
		if (axOuverteCh5() && Shell.hote() === H5 && args.indexOf("list-units") > -1 && args.some(function(a){ return /^--type=path$|^-t$/.test(a); }) && /guet-passwd\.path/.test(sansAnsi(String(sortie || "")))) axNoter("a5_guetteur", "liste");
	} catch (e){}
	return sortie;
};
var JOURNALCTL_AVANT_ANNEXES = Shell.sorts.journalctl;
Shell.sorts.journalctl = function(args, io){
	var sortie = JOURNALCTL_AVANT_ANNEXES.apply(this, arguments);
	try { if (axOuverteCh5() && Shell.hote() === H5 && axVu("a5_guetteur", "declenche") && /guet|passwd/i.test(sansAnsi(String(sortie || ""))) && /logger|guetteur|alerte|ALERTE/.test(sansAnsi(String(sortie || "")))) axNoter("a5_guetteur", "lue"); } catch (e){}
	return sortie;
};

/* ------------------------------------------------------------------ */
/* 4. Le greffier du roi (le Greffier)                                 */
/* ------------------------------------------------------------------ */

var AxGreffier = axHabitant(axTour("sceau"), "Greffier", function(){
	if (aFait("a5_greffier")) return "Le Greffier souffle sur l'encre. « Tout ce que root a vu est écrit, et peut se relire. Un inspecteur ne demande pas mieux. »";
	return "Un vieil homme voûté, une plume d'oie derrière l'oreille, tient le registre du roi.\n\n" +
		"« Je suis le Greffier. Sur le Bastion, chacun peut parler au nom du roi avec sudo, et le journal note QUELLE commande a été lancée. " +
		"Mais pas ce qu'elle a montré ! Si quelqu'un lit un fichier secret avec sudo, je veux pouvoir relire, après coup, ce qu'il a vu.\n\n" +
		"Demande à sudo d'enregistrer tout ce qu'affichent les commandes, dans un fichier à part de /etc/sudoers.d, écrit comme il se doit (avec visudo). " +
		"Lance ensuite une commande avec sudo, puis montre-moi la liste des sessions enregistrées, et rejoue-m'en une, comme si j'y étais. »\n\n" +
		C.gris("Les outils, sur le Bastion : sudo visudo -f /etc/sudoers.d/greffier (une ligne : Defaults log_output) ; sudo visudo -c ; une commande avec sudo ; sudo sudoreplay -l ; sudo sudoreplay ID.");
}, ["sudoreplay"]);
declarerAnnexe({ id: "a5_greffier", chapitre: 6, titre: "Le greffier du roi", habitant: "le Greffier", lieu: "au Sceau du Roi", item: function(){ return AxGreffier; }, ouverte: axOuverteCh5,
	indice: "au Sceau du Roi, un vieil homme tient le registre, une plume derrière l'oreille.",
	resume: "Enregistrer ce qu'affichent les commandes lancées avec sudo (Defaults log_output) et les relire (sudoreplay).",
	etapes: [
		{ titre: "Defaults log_output, dans /etc/sudoers.d/greffier (visudo -f)", fait: function(){ return axLogOutput(H5) && !!fichierHote(H5, "/etc/sudoers.d/greffier"); } },
		{ titre: "Une session sudo enregistrée", fait: function(){ return axSessionsSudo(H5).length > 0; } },
		{ titre: "La liste des sessions (sudo sudoreplay -l)", fait: function(){ return axVu("a5_greffier", "liste"); } },
		{ titre: "Rejouer une session (sudo sudoreplay ID)", fait: function(){ return axVu("a5_greffier", "rejeu"); } }
	],
	souvenir: { nom: "Plume-du-greffier", texte: "Une plume d'oie, la pointe noircie. Le Greffier dit qu'elle n'oublie rien de ce que root a vu." },
	lumiere: "la chandelle du Greffier",
	merci: "Le Greffier relit la session à voix haute, mot pour mot. « Voilà ce que j'appelle un registre. »"
});
GameEvents.addListener("axSudoreplay", function(e){
	if (!axOuverteCh5() || e.hote !== H5) return;
	if (e.action === "liste" && e.nb > 0) axNoter("a5_greffier", "liste");
	if (e.action === "rejeu") axNoter("a5_greffier", "rejeu");
});

/* ------------------------------------------------------------------ */
/* 5. Le coffre de la cantinière (la Cantinière)                       */
/* ------------------------------------------------------------------ */

var AX_RECETTE = "LA RECETTE DU RAGOÛT DE LA GARNISON\n\nTrois carottes, deux oignons, une poignée de lentilles.\nLe secret : une cuillère de miel, ajoutée à la toute fin.\nNe jamais le dire au cuisinier du château voisin.";
var AxRecette = axFichier(axTour("coffres"), "recette.txt", AX_RECETTE, { image: "item_manuscript.gif" });
function axChiffreRecette(){
	var it = axObjetMaison("recette.enc");
	return !!it && !!it.axChiffre && it.axChiffre.pbkdf2 && it.axChiffre.algo === "aes-256-cbc" && it.axChiffre.clair.replace(/\n$/, "") === AX_RECETTE;
}
function axDechiffreeRecette(){ return Home.items.filter(function(it){ return !it.person && !it.axChiffre && it.itemname !== "recette.enc" && it.getText().replace(/\n$/, "") === AX_RECETTE; })[0] || null; }
var AxCantiniere = axHabitant(axTour("coffres"), "Cantiniere", function(){
	if (aFait("a5_coffre")) return "La Cantinière tapote son coffre. « Ma recette dort chiffrée, et je sais la retrouver à l'octet près. Le cuisinier d'en face peut toujours courir. »";
	return "Une femme forte, un tablier taché de sauce, serre un parchemin contre elle.\n\n" +
		"« La Cantinière ! Ma recette du ragoût (recette.txt) traîne ici, dans la Salle des Coffres, lisible par tout le monde. " +
		"Je veux la mettre au coffre : chiffrée, avec une phrase de passe que moi seule connaîtrai. Pas un vieux chiffrement de grand-mère : du solide, avec une clé tirée de la phrase comme il faut.\n\n" +
		"Chiffre-la dans ta Maison (~/recette.enc). Puis prouve-moi qu'on sait la retrouver : déchiffre-la dans une autre copie, " +
		"et vérifie, octet par octet, qu'elle est exactement la même que l'originale. »\n\n" +
		C.gris("Les outils : openssl enc -aes-256-cbc -pbkdf2 -salt -in recette.txt -out ~/recette.enc ; openssl enc -d -aes-256-cbc -pbkdf2 -in ~/recette.enc -out ~/recette-dechiffree.txt ; cmp FICHIER1 FICHIER2.");
}, ["cmp"]);
declarerAnnexe({ id: "a5_coffre", chapitre: 6, titre: "Le coffre de la cantinière", habitant: "la Cantinière", lieu: "dans la Salle des Coffres", item: function(){ return AxCantiniere; }, ouverte: axOuverteCh5,
	indice: "dans la Salle des Coffres, quelqu'un serre une recette contre son tablier.",
	resume: "Chiffrer un fichier avec une phrase de passe (openssl enc -aes-256-cbc -pbkdf2), le déchiffrer, et vérifier à l'octet près (cmp).",
	etapes: [
		{ titre: "Chiffrer la recette dans ~/recette.enc (openssl enc -aes-256-cbc -pbkdf2)", fait: function(){ return axChiffreRecette(); } },
		{ titre: "La déchiffrer dans une autre copie, dans ta Maison (openssl enc -d)", fait: function(){ return !!axDechiffreeRecette(); } },
		{ titre: "Vérifier qu'elle est identique à l'originale, octet par octet (cmp)", fait: function(){ return axVu("a5_coffre", "cmp"); } }
	],
	souvenir: { nom: "Cuillere-de-miel", texte: "Une cuillère en bois, encore collante de miel. La Cantinière l'a gardée « pour la prochaine fois que tu passeras »." },
	lumiere: "le feu de la cantine",
	merci: "La Cantinière range la recette chiffrée dans le coffre, et jette l'autre au feu. « Même moi, je ne la lirai plus sans ma phrase. Parfait. »"
});
GameEvents.addListener("axCmp", function(e){
	if (!axOuverteCh5() || !e.identiques || !e.a || !e.b) return;
	var d = axDechiffreeRecette();
	if ((e.a === AxRecette && e.b === d) || (e.b === AxRecette && e.a === d)) axNoter("a5_coffre", "cmp");
});

/* ------------------------------------------------------------------ */
/* 6. Le sceau de l'Inspection (le Héraut)                             */
/* ------------------------------------------------------------------ */

var AX_CLE_HERAUT = axDeclarerCle({ nom: "heraut", phrase: "", commentaire: "heraut@inspection" });
P5("/srv/inspection/heraut.pub", AX_CLE_HERAUT.publique, { mode: "rw-r--r--", owner: "root" });
P5("/srv/inspection/LISEZMOI", "LA CLÉ DU HÉRAUT DE L'INSPECTION\n\nheraut.pub : sa clé publique. Elle doit être SIGNÉE par l'autorité de l'Inspection,\npour le seul compte heraut, et pour un an.", { mode: "rw-r--r--", owner: "root" });
/* Les dossiers posés ici ne comptent pas dans le barème du chapitre (comme ceux de la machine bastion). */
["/srv", "/srv/inspection"].forEach(function(c){ var d = dossierHote(H5, c); if (d){ d.horsBareme = true; d.chapitre = 6; } });
function axCaInspection(){
	var priv = fichierHote(H5, "/etc/ssh/ca_inspection"), pub = fichierHote(H5, "/etc/ssh/ca_inspection.pub");
	return priv && pub && /^-----BEGIN OPENSSH PRIVATE KEY-----/.test(priv.getText()) ? pub : null;
}
function axCertHeraut(){
	var c = fichierHote(H5, "/srv/inspection/heraut-cert.pub"), ca = axCaInspection();
	if (!c || !c.axCert || !ca) return null;
	var x = c.axCert;
	return x.ca === axEmpreinteSouple(ca.getText()) && x.principaux.length === 1 && x.principaux[0] === "heraut" && x.fin !== null ? c : null;
}
function axSshdFaitConfiance(){
	var ca = axCaInspection();
	if (!ca) return false;
	var cfg = typeof configSshEffective === "function" ? configSshEffective(H5) : {};
	return cfg.trustedusercakeys === "/etc/ssh/ca_inspection.pub";
}
var AxHeraut = axHabitant(axTour("banniere"), "Heraut", function(){
	if (aFait("a5_certificat")) return "Le Héraut déroule son parchemin, scellé. « Une autorité, un certificat pour un compte et pour un an, et un serveur qui fait confiance au sceau. L'Inspection entrera par la grande porte. »";
	return "Un homme en tabard aux couleurs de l'Inspection, une trompette sous le bras, attend sous la bannière.\n\n" +
		"« Le Héraut de l'Inspection. Demain, à l'aube, les inspecteurs voudront entrer sur le Bastion. " +
		"Ajouter la clé de chacun, une par une, dans chaque authorized_keys ? Et les retirer à la main quand ils partiront ? Non.\n\n" +
		"On procède comme pour les sceaux : une autorité, l'Inspection, possède une paire de clés. Elle SIGNE la clé de chaque inspecteur : " +
		"un certificat, valable pour un seul compte, et pour un temps limité. Le serveur, lui, fait confiance à tout certificat signé par l'autorité.\n\n" +
		"Forge la paire de clés de l'autorité (/etc/ssh/ca_inspection), signe ma clé (/srv/inspection/heraut.pub) pour le seul compte heraut et pour un an, " +
		"montre-moi le certificat, puis dis à sshd de faire confiance à l'autorité, proprement. »\n\n" +
		C.gris("Les outils, sur le Bastion : sudo ssh-keygen -t ed25519 -f /etc/ssh/ca_inspection -C \"autorite de l'Inspection\" ; sudo ssh-keygen -s /etc/ssh/ca_inspection -I heraut -n heraut -V +52w /srv/inspection/heraut.pub ;\n" +
			"ssh-keygen -L -f /srv/inspection/heraut-cert.pub ; TrustedUserCAKeys /etc/ssh/ca_inspection.pub dans sshd_config ; sudo sshd -t ; sudo systemctl reload ssh.\n" +
			"(Dans la vraie vie, la clé privée de l'autorité dort hors du serveur, sur une machine coupée du réseau.)");
}, [], ["sshd"]);
declarerAnnexe({ id: "a5_certificat", chapitre: 6, titre: "Le sceau de l'Inspection", habitant: "le Héraut", lieu: "à la Bannière", item: function(){ return AxHeraut; }, ouverte: axOuverteCh5,
	indice: "à la Bannière, un héraut attend, une trompette sous le bras.",
	resume: "Les certificats SSH : une autorité (ssh-keygen -f), une clé signée pour un compte et un temps (ssh-keygen -s -I -n -V), lue (-L), et TrustedUserCAKeys.",
	etapes: [
		{ titre: "Forger la paire de clés de l'autorité, /etc/ssh/ca_inspection (ssh-keygen)", fait: function(){ return !!axCaInspection(); } },
		{ titre: "Signer la clé du Héraut, pour le seul compte heraut, pour un temps limité (ssh-keygen -s)", fait: function(){ return !!axCertHeraut(); } },
		{ titre: "Lire le certificat (ssh-keygen -L)", fait: function(){ return axVu("a5_certificat", "lu"); } },
		{ titre: "sshd fait confiance à l'autorité (TrustedUserCAKeys, sshd -t, reload)", fait: function(){ return axSshdFaitConfiance(); } }
	],
	souvenir: { nom: "Sceau-de-l-Inspection", texte: "Un sceau de cire rouge, frappé d'une clé et d'une couronne. Valable un an, dit le Héraut, comme les certificats." },
	lumiere: "la bannière de l'Inspection, sur la plus haute tour",
	merci: "Le Héraut souffle dans sa trompette. « Que l'Inspection vienne : le Bastion sait reconnaître ses envoyés. »"
});
GameEvents.addListener("axCertificat", function(e){
	if (e.action === "L" && axOuverteCh5() && e.item === axCertHeraut()) axNoter("a5_certificat", "lu");
});

/* Le badge « Ami du Bastion ». */
declarerAmiAnnexes(6, { badge: "ami_ch5", nom: "Ami du Bastion", phrase: "les six habitants du Bastion te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch5 = "Ami du Bastion";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch5 = "or";
axLumieresDansPlan("rempart", 6);

World.fige = true;
