/**
 * HabitantsIle.js : les quêtes annexes de Port-Aube (chapitre 7 pour le joueur, numéro interne 8).
 *
 * Six habitants de l'île confient chacun une petite histoire, en quatre étapes, sur les machines de l'île. Chaque annexe
 * apporte des notions qu'aucun chapitre n'enseigne ailleurs (ni dans ses étapes, ni dans ses défis) :
 *   a7_imprimerie  Ilyès (le quai)              l'impression : lpadmin, lpstat, lp, cancel, cupsenable, cupsaccept
 *   a7_repondeur   Clara (la Poste)             le tri du courrier : un filtre Sieve (fileinto, vacation), sievec, dovecot-lda
 *   a7_fete        Mehdi (la Halle)             la découverte en .local : avahi-browse, avahi-resolve, avahi-publish, .service
 *   a7_pont        Sara (le Phare-Relais)       un tunnel VPN (wg) : wg genkey, wg pubkey, wg0.conf, wg-quick, wg show
 *   a7_miroir      Rayan (le Grand Registre)    le démon rsync : rsyncd.conf (module, read only, hosts allow), rsync://
 *   a7_devoirs     Fama (les Portes)            sftp seul et enfermé : Match Group, ForceCommand internal-sftp, ChrootDirectory
 * Le mécanisme (proposition, étapes, récompenses, badge « Ami de Port-Aube ») est dans QuetesAnnexes.js.
 */

World.fige = false;

function ouverteCh7(){ return state && state.has && state.has("ch7Ouvert") && ileOuverte(); }
function habitantCh7(lieu, nom, image, texte, sorts){
	var it = new Item(nom, "", image).personnage();
	if (sorts && sorts.length){ it.enseigne.apply(it, sorts); declarerSortsAnnexes(sorts); }
	texteVivant(it, texte);
	lieu.addItem(it);
	return it;
}
/* Ce que le joueur a fait pour les annexes : les sorts lancés sur l'île et leur sortie. */
function vuAnnexeCh7(cle){ return !!(sCh7().annexesVus || {})[cle]; }
function noterAnnexeCh7(cle){ var c = sCh7(); c.annexesVus = c.annexesVus || {}; c.annexesVus[cle] = true; }

var APPELER_AVANT_HABITANTS_ILE = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_HABITANTS_ILE.apply(this, arguments);
	try {
		var h = ileOuverte() ? ileIci() : null;
		if (h){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "", a = args || [];
			if (nom === "lpstat" && /scheduler is running/.test(s) && /brouillon/.test(s)) noterAnnexeCh7("lpstatT");
			if (nom === "avahi-browse" && /Presse de la gazette/.test(s) && /Halle/.test(s)) noterAnnexeCh7("browseTout");
			if (nom === "avahi-browse" && /f[eê]te/i.test(sansAccentCh7(s))) noterAnnexeCh7("browseFete");
			if (nom === "avahi-resolve" && /halle\.local\s+10\.0\.70\.45/.test(s)) noterAnnexeCh7("resolveHalle");
			if (nom === "wg" && a[0] === "show" && /latest handshake/.test(s)) noterAnnexeCh7("wgShow");
		}
	} catch (e){ /* une annexe ne doit jamais casser un sort */ }
	return sortie;
};
GameEvents.addListener("ile", function(e){
	if (!ileOuverte()) return;
	if (e.cmd === "pingTunnel" && e.ok) noterAnnexeCh7("pingTunnel");
	if (e.cmd === "rsync-liste" && e.hote === "quai" && e.serveur === "bibliotheque" && (e.modules || []).indexOf("archives") > -1) noterAnnexeCh7("rsyncListe");
	if (e.cmd === "rsync-module" && e.hote === "quai" && e.serveur === "bibliotheque" && e.ok && (e.copies || []).length) noterAnnexeCh7("rsyncCopie");
	if (e.cmd === "sievec" && e.ok && (e.require || []).indexOf("fileinto") > -1 && (e.require || []).indexOf("vacation") > -1) noterAnnexeCh7("sievec");
	if (e.cmd === "sieve" && e.compte === "capitaine" && e.dossier === "Horaires") noterAnnexeCh7("sieveRange");
	if (e.cmd === "sieve" && e.compte === "capitaine" && e.vacation) noterAnnexeCh7("sieveAbsence");
	if (e.cmd === "sftpPut" && e.serveur === "halle" && e.compte === "depot" && e.chroot) noterAnnexeCh7("sftpDepot");
	if (e.cmd === "sshForce" && e.serveur === "halle" && e.compte === "depot" && !e.shell) noterAnnexeCh7("sshRefuse");
});

/* ------------------------------------------------------------------ */
/* 1. L'imprimerie de la gazette (Ilyès, sur le quai)                   */
/* ------------------------------------------------------------------ */

function presseOkCh7(){
	var C2 = etatCupsIle(), p = C2.imprimantes.gazette;
	return !!p && /^ipps?:\/\/(presse(\.port-aube\.lan)?|10\.0\.70\.32)(:\d+)?\//.test(p.uri || "") && p.modele === "everywhere" && C2.defaut === "gazette";
}
var IlyesIle = habitantCh7(HallPortAube, "Ilyes", "item_ilyes.gif", function(){
	if (aFait("a7_imprimerie")) return "Ilyès agite une gazette encore chaude. « Numéro un, imprimé à l'heure ! Ce soir, chaque passager du navire en aura un exemplaire. »";
	return "Un garçon aux manches noires d'encre court sur le quai, une liasse de feuilles blanches sous le bras.\n\n" +
		"« Ilyès, de la gazette de l'île ! Le premier numéro doit sortir avant la marée : les cinq cents passagers le liront en débarquant. La presse est là, dans l'atelier (une imprimante réseau, presse.port-aube.lan, qui parle IPP). " +
		"Mais le serveur d'impression, la machine imprimerie, est dans un drôle d'état : hier, quelqu'un a lancé une affiche géante en cinq cents exemplaires sur la vieille file brouillon, et tout est bloqué.\n\n" +
		"Regarde d'abord l'état de tout (les imprimantes, les travaux). Annule ce travail fou. Puis déclare la presse sous le nom gazette, et fais-en l'imprimante par défaut. " +
		"Elle naîtra en pause : remets-la en marche, qu'elle accepte les travaux, et imprime /srv/gazette/gazette-du-port.txt. »\n\n" +
		C.gris("Les outils (sur imprimerie, tu es du groupe lpadmin) : lpstat -t ; cancel NUMERO ; lpadmin -p gazette -v ipp://presse.port-aube.lan/ipp/print -m everywhere ; lpadmin -d gazette ; " +
			"cupsenable gazette ; cupsaccept gazette ; lp -d gazette FICHIER ; lpstat -W completed -o.");
}, ["lpadmin", "lpstat", "lp", "cancel", "cupsenable", "cupsdisable", "cupsaccept", "cupsreject"]);
declarerAnnexe({ id: "a7_imprimerie", chapitre: 8, titre: "L'imprimerie de la gazette", habitant: "Ilyès", lieu: "sur le quai", item: function(){ return IlyesIle; }, ouverte: ouverteCh7,
	indice: "sur le quai, un garçon court avec des feuilles blanches.",
	resume: "Le serveur d'impression : l'état (lpstat), un travail annulé (cancel), une imprimante réseau (lpadmin), une file remise en marche (cupsenable), une impression (lp).",
	etapes: [
		{ titre: "Voir l'état des imprimantes et des travaux (lpstat -t)", fait: function(){ return vuAnnexeCh7("lpstatT"); } },
		{ titre: "Annuler le travail fou de la file brouillon (cancel)", fait: function(){ return etatCupsIle().travaux.some(function(j){ return j.id === 1 && j.statut === "canceled"; }); } },
		{ titre: "Déclarer la presse sous le nom gazette, par défaut (lpadmin -p, lpadmin -d)", fait: function(){ return presseOkCh7(); } },
		{ titre: "La remettre en marche et imprimer la gazette (cupsenable, cupsaccept, lp)", fait: function(){ return presseOkCh7() && etatCupsIle().travaux.some(function(j){ return j.file === "gazette" && j.statut === "completed" && /gazette-du-port/.test(j.titre); }); } }
	],
	souvenir: { nom: "Gazette-numero-un", texte: "LA GAZETTE DE PORT-AUBE, numéro un. En première page : « La cité ouvre ses portes ». En bas, à l'encre fraîche : « Imprimé par l'Architecte, à l'aube. »" },
	lumiere: "la vitrine de l'imprimerie, sur le quai",
	merci: "Ilyès plie la première gazette et te la tend. « Le premier exemplaire est pour toi. Les cinq cents autres sont pour eux. »"
});

/* ------------------------------------------------------------------ */
/* 2. Le répondeur du capitaine (Clara, à la Poste)                     */
/* ------------------------------------------------------------------ */

function sieveBrancheCh7(){
	var p = paramsPosteCh7();
	var cmd = p ? developperPostfixIle("poste", p, valeurPostfixIle("poste", p, "mailbox_command")) : "";
	var r = reglagesDovecotIle("poste");
	return /dovecot-lda/.test(cmd) && /\bsieve\b/.test((r["protocol lda/mail_plugins"] || "") + " " + (r.mail_plugins || ""));
}
function sieveActifCh7(){
	var c = utilisateurLocalIle("poste", "capitaine");
	var s = c ? scriptActifSieveIle("poste", c) : null;
	if (!s) return false;
	var lu = lireSieveIle(s.texte, "x");
	return !lu.erreurs && lu.require.indexOf("fileinto") > -1 && lu.require.indexOf("vacation") > -1;
}
var ClaraIle = habitantCh7(maisonCh7("poste").lieu, "Clara", "item_clara.gif", function(){
	if (aFait("a7_repondeur")) return "Clara range le carnet du capitaine. « Ses horaires vont dans le bon tiroir, et chacun reçoit une réponse. Il peut dormir en mer, maintenant. »";
	return "Une jeune femme en caban, un carnet de bord sous le bras, attend au guichet de la Poste.\n\n" +
		"« Clara, je tiens le courrier du capitaine du navire. Il a un compte ici (capitaine, sur la machine poste), et ce soir, cinq cents familles vont lui écrire. Il sera en mer, sans réseau. " +
		"Il me faudrait deux choses, faites par la Poste elle-même, à l'arrivée de chaque lettre : que celles qui parlent d'horaires aillent dans un dossier Horaires, et que chaque expéditeur reçoive une réponse, une seule fois par jour : « Le capitaine est en mer ». " +
		"Ça s'appelle un filtre Sieve. Mais il n'agit que si c'est Dovecot qui range les lettres (dovecot-lda), pas Postfix tout seul. »\n\n" +
		C.gris("Les outils (sur poste) : le filtre dans /home/capitaine/sieve/repondeur.sieve (require [\"fileinto\", \"vacation\"]; if header :contains \"subject\" \"horaire\" { fileinto \"Horaires\"; } vacation ...) ; " +
			"sudo sievec FICHIER ; sudo doveadm sieve activate -u capitaine repondeur ; 15-lda.conf : mail_plugins = $mail_plugins sieve ; " +
			"postconf -e 'mailbox_command = /usr/lib/dovecot/dovecot-lda -f \"$SENDER\" -a \"$RECIPIENT\"' ; reload de Dovecot et de Postfix ; puis une lettre au capitaine, et sudo doveadm mailbox list -u capitaine.");
}, ["sievec"]);
declarerAnnexe({ id: "a7_repondeur", chapitre: 8, titre: "Le répondeur du capitaine", habitant: "Clara", lieu: "à la Poste", item: function(){ return ClaraIle; }, ouverte: ouverteCh7,
	indice: "au guichet de la Poste, quelqu'un tient un carnet de bord.",
	resume: "Un filtre Sieve qui range et qui répond : fileinto, vacation, sievec, l'activation, et la livraison par dovecot-lda.",
	etapes: [
		{ titre: "Écrire le filtre du capitaine et le compiler sans erreur (sievec)", fait: function(){ return vuAnnexeCh7("sievec"); } },
		{ titre: "L'activer pour le capitaine (doveadm sieve activate, ou le lien ~/.dovecot.sieve)", fait: function(){ return sieveActifCh7(); } },
		{ titre: "Que Dovecot range les lettres, Sieve compris (dovecot-lda, mail_plugins = sieve)", fait: function(){ return sieveBrancheCh7(); } },
		{ titre: "Une lettre sur les horaires rangée dans Horaires, et la réponse d'absence reçue", fait: function(){ return vuAnnexeCh7("sieveRange") && vuAnnexeCh7("sieveAbsence"); } }
	],
	souvenir: { nom: "Carnet-du-capitaine", texte: "Une page arrachée du carnet du capitaine : « Mer belle, vent de noroît. La Poste de Port-Aube répond pour moi. Merci à l'Architecte. »" },
	lumiere: "la lampe du guichet de la Poste",
	merci: "Clara referme le carnet de bord. « Il ne verra jamais ce que tu as fait. C'est comme ça qu'on sait que c'est bien fait. »"
});

/* ------------------------------------------------------------------ */
/* 3. La fête du port (Mehdi, à la Halle)                                */
/* ------------------------------------------------------------------ */

function feteAnnonceeCh7(){ return servicesAvahiIle("quai").some(function(s){ return /fete/i.test(sansAccentCh7(s.nom)) && s.type === "_http._tcp"; }); }
var MehdiIle = habitantCh7(maisonCh7("halle").lieu, "Mehdi", "item_mehdi.gif", function(){
	if (aFait("a7_fete")) return "Mehdi accroche la dernière guirlande. « Tout le monde trouvera la fête, sans demander son chemin. Viens danser, ce soir ! »";
	return "Un grand garçon déroule des guirlandes de lampions entre les piliers de la Halle.\n\n" +
		"« Mehdi ! J'organise la fête du port, ce soir, quand le navire aura accosté. Le problème : les passagers arrivent avec des portables qui ne connaissent rien de l'île. Pas de configuration, pas de serveur de noms. " +
		"Mais sur un réseau local, les machines peuvent s'annoncer toutes seules : « je suis la Halle », « je suis une imprimante » (les noms en .local, la découverte de services). Sur le quai, avahi l'écoute.\n\n" +
		"Montre-moi tout ce qui s'annonce sur l'île. Trouve l'adresse de la Halle sans le DNS. Puis annonce la fête : un service web, « La fête du port », sur le port 8080. Et vérifie qu'on la voit. »\n\n" +
		C.gris("Les outils (sur le quai) : avahi-browse -a -t ; avahi-resolve -n halle.local ; un fichier /etc/avahi/services/fete.service (service-group, name, service, type _http._tcp, port 8080), " +
			"ou avahi-publish -s 'La fete du port' _http._tcp 8080 ; avahi-browse -t _http._tcp.");
}, ["avahi-browse", "avahi-resolve", "avahi-publish"]);
declarerAnnexe({ id: "a7_fete", chapitre: 8, titre: "La fête du port", habitant: "Mehdi", lieu: "à la Halle", item: function(){ return MehdiIle; }, ouverte: ouverteCh7,
	indice: "à la Halle, quelqu'un déroule des guirlandes de lampions.",
	resume: "La découverte en .local : avahi-browse, avahi-resolve, et un service annoncé (fichier .service ou avahi-publish).",
	etapes: [
		{ titre: "Voir tout ce qui s'annonce sur l'île (avahi-browse -a -t)", fait: function(){ return vuAnnexeCh7("browseTout"); } },
		{ titre: "Trouver l'adresse de la Halle sans DNS (avahi-resolve -n halle.local)", fait: function(){ return vuAnnexeCh7("resolveHalle"); } },
		{ titre: "Annoncer la fête du port, un service web sur le port 8080", fait: function(){ return feteAnnonceeCh7(); } },
		{ titre: "La voir s'annoncer (avahi-browse)", fait: function(){ return feteAnnonceeCh7() && vuAnnexeCh7("browseFete"); } }
	],
	souvenir: { nom: "Lampion-de-la-fete", texte: "Un lampion de papier rouge, un peu froissé, avec une ancre peinte dessus. Mehdi dit qu'il a éclairé la toute première danse de Port-Aube." },
	lumiere: "les lampions de la fête, sous la Halle",
	merci: "Mehdi allume le premier lampion. « Ils trouveront la fête tout seuls. Comme si l'île les appelait par leur nom. »"
});

/* ------------------------------------------------------------------ */
/* 4. Le pont sous la mer (Sara, au Phare-Relais)                       */
/* ------------------------------------------------------------------ */

function clesPhareCh7(){
	var pr = fichierHote("phare", "/etc/wireguard/privatekey"), pu = fichierHote("phare", "/etc/wireguard/publickey");
	return !!pr && !!pu && pr.mode === "rw-------" && cleWgValideIle(pr.getText()) && pu.getText().trim() === publiqueWgIle(pr.getText().trim());
}
function boutWgCh7(h){ var I = (etatIle(h).wg || {}).wg0; return I && I.haut ? I : null; }
var SaraIle = habitantCh7(maisonCh7("phare").lieu, "Sara", "item_sara.gif", function(){
	if (aFait("a7_pont")) return "Sara écoute le grésillement du câble. « Le pont tient. L'ancien campus et l'île se parlent, et personne au milieu ne comprend ce qu'ils se disent. »";
	return "Une femme en ciré jaune vérifie un gros câble qui plonge dans la mer, au pied du phare.\n\n" +
		"« Sara. De l'autre côté de cette mer, il y a l'ancien campus, et ma machine, rive. Je voudrais qu'elle parle au phare comme si la mer n'existait pas : un pont, un tunnel chiffré (un VPN, la commande wg). " +
		"Chaque bout a sa clé privée, qu'il garde, et donne sa clé publique à l'autre. J'ai préparé mon bout : sur rive, tout est écrit dans /etc/wireguard/wg0.conf, sauf la clé publique du phare (A_REMPLACER).\n\n" +
		"Fabrique les clés du phare (lisibles par root seul), écris son bout du pont (10.99.0.1, vers rive, qui est 10.99.0.2), monte-le. Puis passe de mon côté, recopie la clé publique du phare, et monte le mien. " +
		"Un ping à travers la mer, et je te crois. »\n\n" +
		C.gris("Les outils : umask 077 ; wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey ; /etc/wireguard/wg0.conf ([Interface] PrivateKey, Address 10.99.0.1/24, ListenPort 51820 ; " +
			"[Peer] PublicKey, Endpoint rive:51820, AllowedIPs 10.99.0.2/32), chmod 600 ; sudo wg-quick up wg0 ; sur rive, la clé du phare dans wg0.conf, sudo wg-quick up wg0 ; ping 10.99.0.2 ; sudo wg show.");
}, ["wg", "wg-quick"]);
declarerAnnexe({ id: "a7_pont", chapitre: 8, titre: "Le pont sous la mer", habitant: "Sara", lieu: "au Phare-Relais", item: function(){ return SaraIle; }, ouverte: ouverteCh7,
	indice: "au pied du phare, quelqu'un vérifie un câble qui plonge dans la mer.",
	resume: "Un tunnel VPN (wg) entre le phare et la rive : les clés (wg genkey, wg pubkey), wg0.conf, wg-quick up, wg show, un ping à travers.",
	etapes: [
		{ titre: "Les clés du phare, lisibles par root seul (wg genkey, wg pubkey)", fait: function(){ return clesPhareCh7(); } },
		{ titre: "Le bout du phare : wg0.conf (600), monté (wg-quick up)", fait: function(){ var it = fichierHote("phare", "/etc/wireguard/wg0.conf"); return clesPhareCh7() && !!boutWgCh7("phare") && !!it && it.mode === "rw-------"; } },
		{ titre: "Le bout de la rive : la clé du phare recopiée, monté", fait: function(){ var b = boutWgCh7("rive"), p = fichierHote("phare", "/etc/wireguard/publickey"); return !!b && !!p && b.conf.pairs.some(function(x){ return x.publique === p.getText().trim(); }); } },
		{ titre: "Un ping à travers la mer, et la poignée de main (wg show)", fait: function(){ return vuAnnexeCh7("pingTunnel") && vuAnnexeCh7("wgShow"); } }
	],
	souvenir: { nom: "Bout-de-cable", texte: "Un bout de câble sous-marin, gainé de noir, long comme la main. Sara dit qu'il a entendu les premiers mots échangés entre l'île et le continent." },
	lumiere: "la lueur verte du pont, au pied du phare",
	merci: "Sara pose la main sur le câble. « Deux rives, un seul réseau. Et la mer n'a rien entendu. »"
});

/* ------------------------------------------------------------------ */
/* 5. Le miroir de la bibliothèque (Rayan, au Grand Registre)           */
/* ------------------------------------------------------------------ */

function moduleArchivesCh7(){
	var conf = lireRsyncdIle("bibliotheque"), m = conf.modules.archives;
	if (!m) return false;
	var exposeBrouillons = conf.ordre.some(function(x){ return /brouillons|\/srv\/bibliotheque\/?$/.test(valeurRsyncIle(conf, x, "path", "")); });
	var permis = valeurRsyncIle(conf, "archives", "hosts allow", null);
	var ro = !/^(no|false|0)$/i.test(valeurRsyncIle(conf, "archives", "read only", "yes"));
	return cheminNormal(valeurRsyncIle(conf, "archives", "path", "")) === "/srv/bibliotheque/archives" && ro && !exposeBrouillons && !!permis &&
		permis.split(/[\s,]+/).filter(Boolean).some(function(x){ return clientCorrespondIle(x, "quai"); }) && !permis.split(/[\s,]+/).filter(Boolean).some(function(x){ return clientCorrespondIle(x, "rive"); });
}
var RayanIle = habitantCh7(maisonCh7("registre").lieu, "Rayan", "item_rayan.gif", function(){
	if (aFait("a7_miroir")) return "Rayan feuillette la copie du journal de bord. « Le miroir est fidèle, et les brouillons restent à leur place. Une bibliothèque qui se partage sans se donner. »";
	return "Un garçon à lunettes empile des livres numérisés sur une table du Grand Registre.\n\n" +
		"« Rayan, bibliothécaire de l'île. La machine bibliotheque garde les archives de la traversée (/srv/bibliotheque/archives), et les brouillons de ma collègue (/srv/bibliotheque/brouillons), qui ne sont pas à publier. " +
		"Je voudrais que chaque machine de l'île puisse recopier les archives en miroir, sans compte, sans mot de passe, mais sans rien pouvoir y écrire, et que le continent n'y ait pas accès. " +
		"Le démon rsync sait faire ça : on publie un module, et un seul. »\n\n" +
		C.gris("Les outils (sur bibliotheque) : /etc/rsyncd.conf ([archives], path = /srv/bibliotheque/archives, comment, read only = yes, hosts allow = 10.0.70.0/24) ; sudo systemctl start rsync. " +
			"Depuis le quai : rsync rsync://bibliotheque/ (les modules), rsync -av rsync://bibliotheque/archives/ /tmp/miroir/. Un exemple commenté : /usr/share/doc/rsync/examples/rsyncd.conf.");
});
declarerAnnexe({ id: "a7_miroir", chapitre: 8, titre: "Le miroir de la bibliothèque", habitant: "Rayan", lieu: "au Grand Registre", item: function(){ return RayanIle; }, ouverte: ouverteCh7,
	indice: "au Grand Registre, quelqu'un empile des livres numérisés.",
	resume: "Le démon rsync : un module en lecture seule, réservé à l'île (rsyncd.conf, hosts allow), le service, et une copie en miroir depuis le quai.",
	etapes: [
		{ titre: "Un module archives, en lecture seule, pour l'île seulement (/etc/rsyncd.conf)", fait: function(){ return moduleArchivesCh7(); } },
		{ titre: "Le démon rsync en marche", fait: function(){ return moduleArchivesCh7() && serviceActifIle("bibliotheque", "rsync"); } },
		{ titre: "La liste des modules, depuis le quai (rsync rsync://bibliotheque/)", fait: function(){ return vuAnnexeCh7("rsyncListe"); } },
		{ titre: "Le miroir des archives, copié sur le quai", fait: function(){ return vuAnnexeCh7("rsyncCopie"); } }
	],
	souvenir: { nom: "Journal-de-bord", texte: "Une copie du journal de bord du premier navire : « Jour 1 : la terre est en vue au lever du soleil. » Rayan l'a relié en cuir bleu." },
	lumiere: "la lampe de lecture de la bibliothèque",
	merci: "Rayan referme le dernier livre. « Tout le monde peut lire. Personne ne peut abîmer. Une bibliothèque, en somme. »"
});

/* ------------------------------------------------------------------ */
/* 6. Le dépôt des devoirs (Fama, aux Portes de la cité)                */
/* ------------------------------------------------------------------ */

function groupeDevoirsCh7(){ var g = groupesMachine("halle").filter(function(x){ return x.nom === "devoirs"; })[0]; return !!g && g.membres.indexOf("depot") > -1; }
function chrootDevoirsCh7(){ var r = dossierHote("halle", "/srv/devoirs/rendus"); return !cheminChrootValideIle("halle", "/srv/devoirs") && !!r && r.owner === "depot" && r.mode.charAt(1) === "w"; }
function sshdDevoirsCh7(){
	var u = utilisateurLocalIle("halle", "depot");
	if (!u || !groupeDevoirsCh7()) return false;
	var cfg = sshdPourIle("halle", "depot", groupesCompteIle("halle", u));
	return cheminNormal(cfg.chrootdirectory || "/x") === "/srv/devoirs" && cfg.forcecommand === "internal-sftp" && /Match\s+Group\s+devoirs/i.test(sshdChargeIle("halle"));
}
var FamaIle = habitantCh7(maisonCh7("portes").lieu, "Fama", "item_fama.gif", function(){
	if (aFait("a7_devoirs")) return "Fama relève une copie dans le dépôt. « Ils déposent, et ils ne voient rien d'autre. Ni les copies des autres, ni le reste de la Halle. Juste ce qu'il faut. »";
	return "Une étudiante de deuxième année, un cartable rempli de copies, attend sous l'auvent.\n\n" +
		"« Fama, je corrige pour les formateurs. Les étudiants doivent déposer leurs devoirs sur la Halle, par un seul compte, depot (son mot de passe : « Rendus du soir 7 »). " +
		"Mais avec ce compte, aujourd'hui, on a un shell complet sur la Halle : on se promène partout. Il faudrait que depot ne puisse faire QUE du sftp, et enfermé dans un seul dossier, /srv/devoirs, sans pouvoir remonter.\n\n" +
		"sshd sait le faire, pour un groupe : Match Group devoirs, ChrootDirectory, ForceCommand internal-sftp. Le piège : le dossier de la prison doit appartenir à root, et personne d'autre ne doit pouvoir y écrire. " +
		"On dépose dans un sous-dossier, rendus, qui lui appartient à depot. »\n\n" +
		C.gris("Les outils (sur halle) : sudo groupadd devoirs ; sudo usermod -aG devoirs depot ; sudo mkdir -p /srv/devoirs/rendus ; sudo chown depot /srv/devoirs/rendus ; " +
			"à la fin de /etc/ssh/sshd_config : Match Group devoirs / ChrootDirectory /srv/devoirs / ForceCommand internal-sftp ; sudo sshd -t ; sudo systemctl reload ssh. " +
			"Depuis le quai : sftp depot@halle (pwd, ls, put FICHIER rendus/), puis ssh depot@halle.");
}, ["sftp", "groupadd"]);
declarerAnnexe({ id: "a7_devoirs", chapitre: 8, titre: "Le dépôt des devoirs", habitant: "Fama", lieu: "aux Portes de la cité", item: function(){ return FamaIle; }, ouverte: ouverteCh7,
	indice: "sous l'auvent des Portes, une étudiante porte un cartable plein de copies.",
	resume: "Un compte qui ne fait que du sftp, enfermé dans un dossier : Match Group, ForceCommand internal-sftp, ChrootDirectory à root.",
	etapes: [
		{ titre: "Un groupe devoirs, et le compte depot dedans", fait: function(){ return groupeDevoirsCh7(); } },
		{ titre: "La prison : /srv/devoirs à root (sans écriture pour les autres), /srv/devoirs/rendus à depot", fait: function(){ return chrootDevoirsCh7(); } },
		{ titre: "sshd : Match Group devoirs, ChrootDirectory, ForceCommand internal-sftp, vérifié et rechargé", fait: function(){ return sshdDevoirsCh7(); } },
		{ titre: "Un devoir déposé par sftp, enfermé ; et ssh refusé au compte depot", fait: function(){ return vuAnnexeCh7("sftpDepot") && vuAnnexeCh7("sshRefuse"); } }
	],
	souvenir: { nom: "Copie-corrigee", texte: "Une copie corrigée à l'encre verte, notée 20 sur 20. En marge, de la main de Fama : « Déposée à l'heure, dans le bon dossier. »" },
	lumiere: "la fenêtre du dépôt des devoirs",
	merci: "Fama tamponne la première copie déposée. « Un dossier, une porte, rien d'autre. Les formateurs vont adorer. »"
});

/* Le badge « Ami de Port-Aube », et une phrase de plus dans la scène finale. */
declarerAmiAnnexes(8, { badge: "ami_ch7", nom: "Ami de Port-Aube", phrase: "les six habitants de Port-Aube te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch7 = "Ami de Port-Aube";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch7 = "or";
function texteAmiFinaleCh7(){
	return annexesToutesFaites(8) ? " Sur le quai, Ilyès, Clara, Mehdi, Sara, Rayan et Fama lèvent chacun une lanterne : celles-là sont pour toi." : "";
}

World.fige = true;
