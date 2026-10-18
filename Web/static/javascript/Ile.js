/**
 * Ile.js : la vie de Port-Aube (chapitre 7 pour le joueur, numéro interne 8).
 *
 * Chapitre7.js pose le monde, l'horloge, les 27 étapes, la Tempête et la Marée. Ici, la cité prend vie :
 *  - les dix maîtres bâtisseurs, un par maison, ont un texte VIVANT : ils entrent en scène, expliquent leur service par
 *    une image (avec le vrai mot du métier à côté), donnent la syntaxe, confient la mission sans en dicter la commande,
 *    réagissent aux erreurs fréquentes, puis racontent une histoire du métier ;
 *  - les défis (quêtes secondaires s_p7_*) : cinq par maison, révélés par le maître, deux défis d'honneur, et le
 *    dernier, qui ne s'ouvre qu'après la fête ;
 *  - les badges du chapitre, le plan de la cité (chantier), le bestiaire et les noms imagés des sorts.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis de Port-Aube (quêtes secondaires, cinq par maison)         */
/* ------------------------------------------------------------------ */

function oCh7(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function surCh7(h){ return ileIci() === h; }

/* appel(nom, args, sortie, io, h) : le sort lancé sur l'île, et sa sortie, le prouvent. monde() : l'état des machines le prouve.
   evenement + quand(e) : un événement du moteur de l'île (GameEvents « ile »). */
var DEFIS_ILE = [
	// La Maison des Noms (Badis)
	{ id: "s_p7_dig_soa", m: "noms", titre: "Maison des Noms : la série, en une ligne (dig @noms port-aube.lan SOA +short)",
	  appel: function(n, a, s){ return n === "dig" && a.some(function(x){ return /^soa$/i.test(x); }) && a.indexOf("+short") > -1 && /\b20\d{8}\b/.test(s); } },
	{ id: "s_p7_checkconf_z", m: "noms", titre: "Maison des Noms : vérifier la configuration ET les zones (named-checkconf -z)",
	  appel: function(n, a, s, io){ return n === "named-checkconf" && oCh7(a).indexOf("z") > -1 && /loaded serial/.test(s); } },
	{ id: "s_p7_rndc_status", m: "noms", titre: "Maison des Noms : l'état du serveur de noms (rndc status)",
	  appel: function(n, a, s){ return n === "rndc" && a[0] === "status" && /number of zones/.test(s); } },
	{ id: "s_p7_dig_ns", m: "noms", titre: "Maison des Noms : qui fait autorité sur l'île (dig NS port-aube.lan)",
	  appel: function(n, a, s){ return n === "dig" && a.some(function(x){ return /^ns$/i.test(x); }) && /noms\.port-aube\.lan/.test(s) && /phare\.port-aube\.lan/.test(s); } },
	{ id: "s_p7_cname", m: "noms", titre: "Maison des Noms : un alias suivi jusqu'au bout (dig imap.port-aube.lan : CNAME, puis A)",
	  appel: function(n, a, s){ return n === "dig" && /imap/.test(a.join(" ")) && /CNAME/.test(s) && /10\.0\.70\.25/.test(s); } },
	// Le Phare-Relais (Maeva)
	{ id: "s_p7_zonestatus", m: "phare", titre: "Phare-Relais : l'état de la copie, sur le phare (rndc zonestatus)",
	  appel: function(n, a, s, io, h){ return n === "rndc" && a[0] === "zonestatus" && h === "phare" && /type: secondary/.test(s); } },
	{ id: "s_p7_axfr_phare", m: "phare", titre: "Phare-Relais : le transfert permis, depuis le phare (dig AXFR @noms)",
	  appel: function(n, a, s, io, h){ return n === "dig" && h === "phare" && a.some(function(x){ return /^axfr$/i.test(x); }) && /SOA/.test(s) && !/Transfer failed/.test(s); } },
	{ id: "s_p7_tsig", m: "phare", titre: "Phare-Relais : forger une clé de signature (tsig-keygen)",
	  appel: function(n, a, s){ return n === "tsig-keygen" && /secret/.test(s); } },
	{ id: "s_p7_nsupdate_delete", m: "phare", titre: "Phare-Relais : retirer un nom à chaud (nsupdate, update delete)",
	  evenement: "ile", quand: function(e){ return e.cmd === "nsupdate" && (e.ops || []).some(function(o){ return o.action === "delete"; }); } },
	{ id: "s_p7_dig_x", m: "phare", titre: "Phare-Relais : le nom de la Maison des Noms, depuis son adresse (dig -x 10.0.70.53)",
	  appel: function(n, a, s){ return n === "dig" && a.indexOf("-x") > -1 && a.indexOf("10.0.70.53") > -1 && /noms\.port-aube\.lan/.test(s); } },
	// La Poste (Younes)
	{ id: "s_p7_postconf_d", m: "poste", titre: "La Poste : les valeurs par défaut, pour comparer (postconf -d)",
	  appel: function(n, a, s){ return n === "postconf" && oCh7(a).indexOf("d") > -1 && s.trim() !== ""; } },
	{ id: "s_p7_postcat", m: "poste", titre: "La Poste : ouvrir une lettre en attente avant d'en décider (postcat -q)",
	  appel: function(n, a, s){ return n === "postcat" && a.indexOf("-q") > -1 && /MESSAGE CONTENTS/.test(s); } },
	{ id: "s_p7_sendmail_t", m: "poste", titre: "La Poste : une lettre dont les en-têtes disent le destinataire (sendmail -t)",
	  appel: function(n, a, s, io){ return n === "sendmail" && a.indexOf("-t") > -1 && !io.code; } },
	{ id: "s_p7_maillog", m: "poste", titre: "La Poste : la preuve qu'une lettre est arrivée, dans le journal (status=sent)",
	  appel: function(n, a, s){ return (n === "tail" || n === "grep" || n === "cat" || n === "journalctl" || n === "less") && /status=sent/.test(s); } },
	{ id: "s_p7_postqueue_p", m: "poste", titre: "La Poste : la file, sous son vrai nom (postqueue -p)",
	  appel: function(n, a, s){ return n === "postqueue" && oCh7(a).indexOf("p") > -1; } },
	// Le Bureau des Lettres (Syrine)
	{ id: "s_p7_doveconf_n", m: "lettres", titre: "Bureau des Lettres : la configuration de Dovecot, après tous les !include (doveconf -n)",
	  appel: function(n, a, s){ return n === "doveconf" && oCh7(a).indexOf("n") > -1 && /mail_location/.test(s); } },
	{ id: "s_p7_doveadm_fetch", m: "lettres", titre: "Bureau des Lettres : les sujets de ta boîte (doveadm fetch hdr.subject)",
	  appel: function(n, a, s){ return n === "doveadm" && a[0] === "fetch" && /hdr\.subject: /.test(s); } },
	{ id: "s_p7_doveadm_search", m: "lettres", titre: "Bureau des Lettres : chercher une lettre (doveadm search)",
	  appel: function(n, a, s){ return n === "doveadm" && a[0] === "search" && s.trim() !== ""; } },
	{ id: "s_p7_dig_dkim", m: "lettres", titre: "Bureau des Lettres : la clé publique DKIM, telle que le monde la lit (dig TXT SELECTEUR._domainkey)",
	  appel: function(n, a, s){ return n === "dig" && /_domainkey/.test(a.join(" ")) && /v=DKIM1/.test(s); } },
	{ id: "s_p7_spf_strict", m: "lettres", titre: "Bureau des Lettres : un SPF qui refuse tout le reste (-all)",
	  monde: function(){ return valeursDnsCh7("noms", DOMAINE_ILE, "TXT").some(function(t){ return /^v=spf1\b/.test(t) && /-all\s*$/.test(t); }); } },
	// Les Greniers (Noam)
	{ id: "s_p7_exportfs_s", m: "greniers", titre: "Greniers : ce qui est publié, tel que le noyau l'applique (exportfs -s)",
	  appel: function(n, a, s){ return n === "exportfs" && oCh7(a).indexOf("s") > -1 && /\/srv\/homes/.test(s); } },
	{ id: "s_p7_showmount_quai", m: "greniers", titre: "Greniers : ce que voit le quai (showmount -e greniers, depuis le quai)",
	  appel: function(n, a, s, io, h){ return n === "showmount" && h === "quai" && /\/srv\/homes/.test(s); } },
	{ id: "s_p7_mount_nfs4", m: "greniers", titre: "Greniers : les montages réseau du quai (mount -t nfs4)",
	  appel: function(n, a, s, io, h){ return n === "mount" && a.indexOf("nfs4") > -1 && /greniers:/.test(s); } },
	{ id: "s_p7_umount", m: "greniers", titre: "Greniers : démonter proprement ce qu'on a monté à la main (umount)",
	  evenement: "ile", quand: function(e){ return e.cmd === "demontageNfs" && !e.auto; } },
	{ id: "s_p7_ls_n", m: "greniers", titre: "Greniers : des propriétaires sans nom, des numéros (ls -ln /srv/homes, sur les Greniers)",
	  appel: function(n, a, s, io, h){ return n === "ls" && h === "greniers" && oCh7(a).indexOf("n") > -1 && /\b1000\d\b/.test(s); } },
	// La Halle (Zélia)
	{ id: "s_p7_testparm_s", m: "halle", titre: "Halle : la configuration de Samba, sans attendre (testparm -s)",
	  appel: function(n, a, s){ return n === "testparm" && a.indexOf("-s") > -1; } },
	{ id: "s_p7_smbclient_ls", m: "halle", titre: "Halle : lister le partage de la promo (smbclient -c ls)",
	  evenement: "ile", quand: function(e){ return e.cmd === "smbLs" && /^promo$/i.test(e.partage || ""); } },
	{ id: "s_p7_smbget", m: "halle", titre: "Halle : reprendre un fichier déposé (smbclient -c get)",
	  evenement: "ile", quand: function(e){ return e.cmd === "smbGet" && /^promo$/i.test(e.partage || ""); } },
	{ id: "s_p7_invite_refuse", m: "halle", titre: "Halle : un invité qui frappe à la promo, refusé (smbclient -N)",
	  evenement: "ile", quand: function(e){ return e.cmd === "smbPartage" && e.invite && e.ok === false && /^promo$/i.test(e.partage || ""); } },
	{ id: "s_p7_pdbedit_v", m: "halle", titre: "Halle : le détail des comptes de Samba (pdbedit -L -v)",
	  appel: function(n, a, s){ return n === "pdbedit" && oCh7(a).indexOf("v") > -1 && /Unix username/.test(s); } },
	// Le Grand Registre (Kamal)
	{ id: "s_p7_slapcat", m: "registre", titre: "Grand Registre : tout le registre, d'un coup, pour le sauvegarder (slapcat)",
	  appel: function(n, a, s){ return n === "slapcat" && /createTimestamp/.test(s); } },
	{ id: "s_p7_ldapwhoami", m: "registre", titre: "Grand Registre : qui suis-je pour lui ? (ldapwhoami -x)",
	  appel: function(n, a, s){ return n === "ldapwhoami" && s.trim() !== ""; } },
	{ id: "s_p7_filtre_et", m: "registre", titre: "Grand Registre : une recherche à deux conditions (filtre (&(...)(...)))",
	  appel: function(n, a, s){ return n === "ldapsearch" && a.some(function(x){ return /^\(&\(/.test(x); }) && /dn: /.test(s); } },
	{ id: "s_p7_cn_config", m: "registre", titre: "Grand Registre : relire la configuration de slapd (ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=config)",
	  appel: function(n, a, s){ return n === "ldapsearch" && a.indexOf("EXTERNAL") > -1 && /cn=config/.test(a.join(" ")) && /olcRootDN/.test(s); } },
	{ id: "s_p7_ldappasswd", m: "registre", titre: "Grand Registre : changer un mot de passe sans le voir passer (ldappasswd -S)",
	  evenement: "ile", quand: function(e){ return e.cmd === "ldapModify" && e.motDePasse; } },
	// Les Portes de la cité (Lamia)
	{ id: "s_p7_getent_group", m: "portes", titre: "Portes : la promo vue du quai (getent group promo)",
	  appel: function(n, a, s, io, h){ return n === "getent" && a[0] === "group" && h === "quai" && /^promo:/.test(s); } },
	{ id: "s_p7_id_ldap", m: "portes", titre: "Portes : un bâtisseur, ses numéros et ses groupes, vus du quai (id)",
	  appel: function(n, a, s, io, h){ return n === "id" && h === "quai" && /batisseurs/.test(s); } },
	{ id: "s_p7_sss_cache", m: "portes", titre: "Portes : faire oublier au quai ce qu'il croit savoir (sss_cache -E)",
	  evenement: "ile", quand: function(e){ return e.cmd === "sss_cache" && e.tout; } },
	{ id: "s_p7_sssd_journal", m: "portes", titre: "Portes : le journal de sssd (journalctl -u sssd)",
	  appel: function(n, a, s){ return n === "journalctl" && /sssd/.test(a.join(" ")) && /sssd/.test(s); } },
	{ id: "s_p7_ls_noms", m: "portes", titre: "Portes : des noms, et plus des numéros (ls -l d'un dossier monté, sur le quai)",
	  appel: function(n, a, s, io, h){ return n === "ls" && h === "quai" && oCh7(a).indexOf("l") > -1 && BATISSEURS_ILE.some(function(b){ return new RegExp("^\\S+\\s+\\d+\\s+" + b[0] + "\\s", "m").test(s); }); } },
	// La Forge des Sceaux (Miguel)
	{ id: "s_p7_x509_text", m: "forge", titre: "Forge : lire la racine en entier (openssl x509 -text : CA:TRUE)",
	  appel: function(n, a, s){ return n === "openssl" && a[0] === "x509" && a.indexOf("-text") > -1 && /CA:TRUE/.test(s); } },
	{ id: "s_p7_verify", m: "forge", titre: "Forge : éprouver une chaîne (openssl verify -CAfile)",
	  appel: function(n, a, s){ return n === "openssl" && a[0] === "verify" && a.indexOf("-CAfile") > -1 && /: OK/.test(s); } },
	{ id: "s_p7_modulus", m: "forge", titre: "Forge : la clé va-t-elle avec le sceau ? (x509 -modulus et rsa -modulus)",
	  evenement: "ile", quand: function(e){ var c = sCh7(); c.modulus = c.modulus || {}; if (e.cmd === "modulus") c.modulus[e.quoi === "x509" ? "c" : "k"] = e.cle; return !!c.modulus.c && c.modulus.c === c.modulus.k; } },
	{ id: "s_p7_ldap_tls", m: "forge", titre: "Forge : le Registre lui aussi derrière un sceau (ldapsearch -ZZ, depuis le quai)",
	  evenement: "ile", quand: function(e){ return e.cmd === "ldapsearch" && e.hote === "quai" && e.ok && e.tls; } },
	{ id: "s_p7_cle_gardee", m: "forge", titre: "Forge : la clé de l'autorité, lisible par root seul, dans un dossier fermé",
	  monde: function(){ return autoriteOkCh7(); } },
	// L'Arche (Amina)
	{ id: "s_p7_borg_info", m: "arche", titre: "Arche : ce que sait le dépôt de lui-même (borg info)",
	  evenement: "ile", quand: function(e){ return e.cmd === "borg" && e.ordre === "info" && e.ok && !!depotArcheCh7() && depotArcheCh7().chiffrement !== "none"; } },
	{ id: "s_p7_borg_prune", m: "arche", titre: "Arche : ce que garderait le ménage, à blanc (borg prune --list --dry-run)",
	  evenement: "ile", quand: function(e){ var a = e.args || []; return e.cmd === "borg" && e.ordre === "prune" && e.ok && a.indexOf("--list") > -1 && (a.indexOf("--dry-run") > -1 || a.indexOf("-n") > -1) && (e.gardees || []).length > 0; } },
	{ id: "s_p7_borg_check_v", m: "arche", titre: "Arche : vérifier le dépôt et chaque archive, à voix haute (borg check -v)",
	  evenement: "ile", quand: function(e){ var a = e.args || []; return e.cmd === "borg" && e.ordre === "check" && e.ok && (a.indexOf("-v") > -1 || a.indexOf("--verbose") > -1); } },
	{ id: "s_p7_list_timers", m: "arche", titre: "Arche : la prochaine sauvegarde, à l'horloge (systemctl list-timers, sur les Greniers)",
	  appel: function(n, a, s, io, h){ return n === "systemctl" && a.indexOf("list-timers") > -1 && h === "greniers" && /sauvegarde-borg/.test(s); } },
	{ id: "s_p7_borg_list_archive", m: "arche", titre: "Arche : le contenu d'une archive (borg list DEPOT::ARCHIVE)",
	  evenement: "ile", quand: function(e){ return e.cmd === "borg" && e.ordre === "list" && e.ok && e.contenu; } },
	// Les défis d'honneur (Laurent), et la dernière page
	{ id: "s_p7_avant_tempete", m: "honneur", titre: "Honneur : les dix maisons bâties avant 14 h, l'heure de la Tempête" },
	{ id: "s_p7_sans_indice", m: "honneur", titre: "Honneur : remettre le rapport sans avoir acheté un seul indice" },
	{ id: "s_p7_phare_noir", m: "honneur", titre: "Après la fête : consigner l'inconnu dans le rapport (phare-noir, le passager)",
	  monde: function(){ var t = sansAccentCh7(rapportCh7() || ""); return state.has("victoireCh7") && /phare-noir/.test(t) && (/203\.0\.113\.66/.test(t) || /passager/.test(t)); } }
];
DEFIS_ILE.forEach(function(d){ QUETES_SECONDAIRES_CH7.push({ id: d.id, titre: d.titre }); });
function defisMaison(cle){ return DEFIS_ILE.filter(function(d){ return d.m === cle; }); }
function idsDefisMaison(cle){ return defisMaison(cle).map(function(d){ return d.id; }); }
function listeDefisMaison(cle){
	return defisMaison(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}
function reussirDefiIle(id){
	if (!ileOuverte() || state.quests[id]) return;
	state.complete(id);
}

/* Les sorts lancés sur l'île (et leur sortie), une fois qu'ils ont réussi. */
var APPELER_AVANT_ILE_DEFIS = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_ILE_DEFIS.apply(this, arguments);
	var h = ileOuverte() ? ileIci() : null;
	if (h){
		try {
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "";
			DEFIS_ILE.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args || [], s, io || {}, h)) reussirDefiIle(d.id); });
		} catch (e){ /* un défi ne doit jamais casser un sort */ }
	}
	return sortie;
};
(function(){
	var types = {};
	DEFIS_ILE.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!ileOuverte()) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiIle(d.id); } catch (x){} });
		});
	});
})();

/* ------------------------------------------------------------------ */
/* Les dix maîtres bâtisseurs, vivants                                 */
/* ------------------------------------------------------------------ */

function texteMaitreIle(g){
	var m = maisonCh7(g.m), e1 = aFait(m.etapes[0]), e2 = aFait(m.etapes[1]);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouhÉ]/.test(g.nom) ? "d'" : "de ") + g.nom) + C.gris(" (des quêtes secondaires, sur la machine " + m.machine + ")") + "\n" + listeDefisMaison(g.m);
	var tempete = sCh7().incidentsTempete && sCh7().incidentsTempete[g.m] && !INCIDENTS_TEMPETE_CH7[g.m].reparee() ? "\n\n" + C.rouge("La Tempête : " + INCIDENTS_TEMPETE_CH7[g.m].phrase + ".") : "";
	if (e1 && e2) return g.fin() + tempete + defis;
	var erreur = null;
	try { erreur = g.erreur ? g.erreur() : null; } catch (x){ erreur = null; }
	var corps = (e1 || e2) ? g.entre(e1) : g.entree() + "\n\n" + g.image() + "\n\n" + g.syntaxe() + "\n\n" + g.mission();
	return corps + (erreur ? "\n\n" + C.jaune(erreur) : "") + tempete + "\n\n" + C.gris(g.metier) + defis;
}

var MAITRES_ILE = {
	noms: { nom: "Badis", m: "noms",
		metier: "Le métier : une zone se vérifie avant de se charger (named-checkzone, named-checkconf), et chaque modification fait monter sa série. Un nom faux, et toute une maison disparaît du réseau.",
		entree: function(){ return "Badis est perché en haut d'une échelle, devant des rayonnages où chaque étiquette est vide. Il descend d'un bond. « Enfin ! Une cité sans noms, c'est un tas de pierres qui ne se reconnaissent pas. Tu viens me rendre la mémoire ? »"; },
		image: function(){ return "« La Maison des Noms, c'est le DNS : la machine noms traduit chaque nom de l'île (poste.port-aube.lan) en adresse (10.0.70.25). Ici, c'est BIND qui veille, le démon named. " +
			"La zone port-aube.lan est un fichier : une ligne SOA en tête (qui fait autorité, et le numéro de série), des NS (les serveurs de noms), des A (un nom, une adresse), des CNAME (un alias), des MX (qui reçoit le courrier). " +
			"J'ai écrit le brouillon sur le pont du navire, par gros temps : il y a deux fautes dedans. Et la zone n'est déclarée nulle part : named ne sait même pas qu'elle existe. »"; },
		syntaxe: function(){ return "« Sur noms :\n\n" +
			"  sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan    le fichier de zone est-il juste ?\n" +
			"  /etc/bind/named.conf.local       zone \"port-aube.lan\" { type primary; file \"...\"; allow-transfer { ... }; };\n" +
			"  sudo named-checkconf -z          la configuration, et chaque zone déclarée\n" +
			"  sudo rndc reload                 named relit tout, sans s'arrêter\n" +
			"  dig @noms poste.port-aube.lan    la question, posée au bon serveur\n" +
			"  dig @noms port-aube.lan SOA +short          la série\n\n" +
			"La série s'écrit AAAAMMJJNN : 2026101701, puis 2026101702 à la modification suivante. Un nom sans point final prend le domaine en suffixe. »"; },
		mission: function(){ return "« Ta mission : corrige mon brouillon, déclare la zone (et que seul le Phare puisse la copier), charge-la, et prouve-moi que noms répond. Puis inscris deux maisons de plus : imprimerie (10.0.70.31) et bibliotheque (10.0.70.73). Et n'oublie pas la série. »"; },
		entre: function(premier){ return premier ? "Badis colle les premières étiquettes. « La zone vit. Maintenant, imprimerie et bibliotheque, et la série d'un cran : dig @noms port-aube.lan SOA me dira si tu as pensé à tout. »" :
			"« Les deux noms sont là. Mais la zone elle-même ne se charge pas : named-checkzone, puis named-checkconf -z. »"; },
		erreur: function(){
			var z = zoneCh7("noms");
			if (!aFait("p7_zone") && !z && /port-aube/.test(lireIle("noms", "/etc/bind/named.conf.local") || "")) return "Badis plisse les yeux. « Ta zone est déclarée, mais named ne l'a pas chargée. Le journal le dit : sudo journalctl -u named -n 20. Et named-checkzone avant tout. »";
			if (!aFait("p7_serie") && z && valeursDnsCh7("noms", "imprimerie." + DOMAINE_ILE).length === 0 && /imprimerie/.test(lireIle("noms", z.fichier || "") || "")) return "« imprimerie est dans le fichier, mais noms ne la sert pas. Tu as rechargé ? Et la série a-t-elle bougé ? »";
			return null;
		},
		fin: function(){ return "Badis redescend de son échelle, et chaque rayon porte un nom. « La cité se reconnaît.\n\n" +
			"Une nuit, un grand site a disparu d'Internet pendant des heures : une seule ligne fausse dans une zone, chargée sans être relue. " +
			"Depuis, on ne recharge jamais sans named-checkzone. Et on n'oublie jamais la série : sans elle, les secondaires gardent l'ancien monde. »"; }
	},
	phare: { nom: "Maeva", m: "phare",
		metier: "Le métier : un secondaire copie la zone par transfert (AXFR), et ce transfert se donne au secondaire seulement. La zone inverse répond à la question à l'envers. Et une mise à jour à chaud se signe d'une clé.",
		entree: function(){ return "Maeva est au sommet du phare, la main sur la grande lentille éteinte. « Si la Maison des Noms se tait une seule minute, toute la cité devient aveugle. Mon phare garde la copie des noms. Encore faut-il la lui donner. »"; },
		image: function(){ return "« Le Phare-Relais, c'est le serveur de noms secondaire : la machine phare. Il ne s'écrit pas à la main : il demande la zone au primaire (un transfert, AXFR) et la recopie, chaque fois que la série monte. " +
			"Le primaire, lui, ne donne sa zone qu'au phare : un transfert ouvert à tous, c'est la carte de l'île offerte au premier venu. " +
			"Et il y a l'autre sens : d'une adresse, retrouver le nom. C'est la zone inverse, 70.0.10.in-addr.arpa, écrite à l'envers, faite de PTR. " +
			"Enfin, parfois on ajoute un nom sans toucher au fichier : nsupdate, signé d'une clé TSIG que named reconnaît. »"; },
		syntaxe: function(){ return "« Sur phare :\n\n" +
			"  zone \"port-aube.lan\" { type secondary; primaries { 10.0.70.53; }; file \"/var/cache/bind/db.port-aube.lan\"; };\n" +
			"  sudo rndc reload ;  dig @phare port-aube.lan SOA +short      la copie a-t-elle la même série ?\n" +
			"  dig port-aube.lan AXFR @noms                                   depuis une autre machine : refusé\n\n" +
			"La zone inverse, sur noms : un fichier db.10.0.70 (SOA, NS, et 25 IN PTR poste.port-aube.lan.), sa zone \"70.0.10.in-addr.arpa\" ;\n" +
			"sa copie sur phare ; dig -x 10.0.70.25.\n\n" +
			"  tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key       une clé, à inclure dans named.conf.local (include)\n" +
			"  allow-update { key cle-phare; };                               dans la zone inverse : elle accepte les ajouts signés\n" +
			"  sudo nsupdate -k /etc/bind/cle-phare.key                       server, zone, update add, send\n\n" +
			"Une zone dynamique ne s'édite plus à la main : rndc freeze, puis éditer, puis rndc thaw. Sinon, le journal de named\n" +
			"et le fichier ne disent plus la même chose. »"; },
		mission: function(){ return "« Ta mission : donne au phare la copie de port-aube.lan, et à lui seul : qu'une autre machine se fasse refuser le transfert sous tes yeux. Puis la zone inverse, sur noms et sa copie sur phare, ouverte aux ajouts signés. Et ajoutes-y à chaud le PTR de la capitainerie (10.0.70.60), sans toucher au fichier. »"; },
		entre: function(premier){ return premier ? "Maeva sourit : la lentille tourne. « La copie est au phare. Maintenant, le chemin inverse : 70.0.10.in-addr.arpa. Et un nom ajouté avec nsupdate. »" :
			"« La zone inverse brille. Mais le phare n'a pas encore la copie de port-aube.lan, ou n'importe qui peut la prendre. »"; },
		erreur: function(){
			var zs = zoneCh7("phare");
			if (!aFait("p7_secondaire") && zs && zs.serie !== serieCh7("noms")) return "Maeva fronce les sourcils. « Le phare a une copie, mais pas la dernière : la série du primaire a bougé sans qu'il le sache. rndc retransfer sur le phare, ou rndc notify sur noms. »";
			if (!aFait("p7_secondaire") && zoneCh7("noms") && !transfertRestreintCh7()) return "« N'importe qui peut copier la zone : allow-transfer { 10.0.70.54; }; dans la zone du primaire. »";
			if ((sCh7().ajoutsDyn || []).length && !ajoutDynamiqueCh7()) return "Maeva s'assombrit. « Ton ajout à chaud a disparu : le fichier de la zone inverse a été réécrit derrière le dos de named. Une zone dynamique s'édite avec rndc freeze, puis rndc thaw. Refais l'ajout avec nsupdate. »";
			return null;
		},
		fin: function(){ return "Maeva allume la lentille, et le faisceau balaie la mer. « Deux voix disent les noms de l'île, maintenant.\n\n" +
			"Une école a perdu son seul serveur de noms un samedi : plus de courrier, plus de connexions, plus rien, jusqu'au lundi. Un secondaire, c'est une heure de travail. " +
			"Et un transfert de zone laissé ouvert, c'est le plan de tout un réseau donné au premier curieux : on ferme. »"; }
	},
	poste: { nom: "Younes", m: "poste",
		metier: "Le métier : main.cf se lit avant de se changer (postconf -n), se vérifie (postfix check) et se recharge (postfix reload). Une file de courrier se lit avant de se vider : chaque lettre dit pourquoi elle attend.",
		entree: function(){ return "Younes est assis sur une pile de sacs postaux, une lettre à la main. « Tamponnée à l'aube, toujours là. Depuis que les bâtisseurs ont branché la Poste, rien ne part et rien n'arrive. Tu viens rouvrir le guichet ? »"; },
		image: function(){ return "« La Poste, c'est Postfix, sur la machine poste : il reçoit les lettres, les trie, les remet. Sa feuille de route s'appelle main.cf. " +
			"Quatre lignes y comptent plus que tout : myhostname (le nom complet de la Poste), mydestination (les domaines qu'on livre ICI), relayhost (à qui confier ce qui part ailleurs : vide, on livre soi-même), " +
			"mynetworks (qui a le droit d'envoyer par nous). Les bâtisseurs ont écrit une ligne deux fois, fait une faute de frappe, laissé un relais mort, et ouvert la Poste au monde entier. Et les lettres attendent dans la file. »"; },
		syntaxe: function(){ return "« Sur poste :\n\n" +
			"  postconf -n                      ce qui est réglé (et les avertissements : overriding, unused)\n" +
			"  postconf mydestination relayhost     quelques paramètres\n" +
			"  sudo postfix check               sans un mot : tout va bien\n" +
			"  sudo postconf -e 'relayhost ='   changer un paramètre\n" +
			"  sudo postfix reload              relire main.cf\n" +
			"  mailq                            la file : chaque lettre, et entre parenthèses, pourquoi elle attend\n" +
			"  sudo postqueue -f                retenter tout de suite ;  sudo postcat -q ID : lire une lettre\n" +
			"  echo 'Bonjour' | mail -s 'Sujet' badis     une lettre ;  sudo tail /var/log/mail.log : status=sent ?\n\n" +
			"Un relais ouvert à tous (mynetworks = 0.0.0.0/0), c'est une machine à spam en une nuit. »"; },
		mission: function(){ return "« Ta mission : remets main.cf d'aplomb (la Poste de poste.port-aube.lan livre port-aube.lan, sans relais, et seulement pour l'île), recharge, fais partir la file, et envoie une lettre qui arrive pour de bon. Le journal fera foi. »"; },
		entre: function(premier){ return premier ? "Younes tamponne une enveloppe : « Ouvert ». « main.cf est juste. Maintenant la file : mailq, puis fais-la partir, et envoie-moi une vraie lettre. »" :
			"« Une lettre est passée, mais main.cf n'est pas encore propre : postconf -n, postfix check. »"; },
		erreur: function(){
			var cf = lireMainCfIle("poste");
			if (!aFait("p7_postfix") && !cf.avertissements.length && paramsPosteCh7() && JSON.stringify(cf.params) !== JSON.stringify(paramsPosteCh7())) return "Younes tapote main.cf. « Le fichier est juste, mais Postfix lit toujours l'ancien : sudo postfix reload. »";
			if (!aFait("p7_postfix") && cf.avertissements.length) return "« postconf râle encore : " + cf.avertissements[0].replace(/^postconf: /, "") + ". »";
			return null;
		},
		fin: function(){ return "Younes ouvre grand le guichet. « Les lettres partent, les lettres arrivent.\n\n" +
			"Une petite entreprise a ouvert son serveur de courrier à tous, par erreur, un vendredi. Le lundi, il avait envoyé deux millions de messages pour des inconnus, " +
			"et plus aucun de ses propres courriers n'arrivait nulle part : son adresse était sur toutes les listes noires. mynetworks, ça se règle au plus juste. »"; }
	},
	lettres: { nom: "Syrine", m: "lettres",
		metier: "Le métier : Postfix livre, Dovecot lit, et ils doivent parler du même endroit. SPF, DKIM et DMARC défendent le nom du domaine : on les publie dans la zone, on les vérifie avec dig.",
		entree: function(){ return "Syrine passe la main sur des casiers de bois, tous vides. « La Poste remplit des boîtes que personne ne sait ouvrir. Et quand la cité aura du courrier, quelqu'un voudra en écrire à sa place. Aide-moi à poser les sceaux. »"; },
		image: function(){ return "« Le Bureau des Lettres, c'est Dovecot : il garde les boîtes et les ouvre à leurs habitants (IMAP). Postfix range chaque lettre dans un Maildir, un dossier par habitant, un fichier par lettre : /var/mail/NOM/new/. " +
			"Mais Dovecot cherche ailleurs : une mbox, un seul gros fichier. Il faut qu'ils parlent du même endroit (mail_location).\n\n" +
			"Et puis les sceaux contre les faussaires. SPF : la liste de ceux qui ont le droit d'écrire au nom de port-aube.lan. DKIM : une signature sur chaque lettre, dont la clé publique est dans la zone. " +
			"DMARC : la consigne aux destinataires, que faire d'une lettre qui échoue. Trois lignes TXT dans la zone, que le monde lit avec dig. »"; },
		syntaxe: function(){ return "« Sur poste :\n\n" +
			"  doveadm user NOM ;  doveadm mailbox list           ce que Dovecot voit (et ses erreurs)\n" +
			"  sudo doveconf mail_location ;  sudo doveconf -n    sa configuration\n" +
			"  /etc/dovecot/conf.d/10-mail.conf                   mail_location = maildir:/var/mail/%u\n" +
			"  sudo systemctl reload dovecot\n" +
			"  doveadm mailbox status messages INBOX ;  doveadm fetch 'hdr.subject' all\n" +
			"  sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys     la clé DKIM, et la ligne TXT à publier\n\n" +
			"Dans la zone (sur noms) :  @  IN TXT \"v=spf1 mx -all\" ;  aube._domainkey IN TXT \"v=DKIM1; k=rsa; p=...\" ;\n" +
			"_dmarc IN TXT \"v=DMARC1; p=quarantine\". La série, rndc reload, puis dig TXT pour chacun. »"; },
		mission: function(){ return "« Ta mission : que Dovecot lise les boîtes que la Poste remplit, et qu'on y trouve les lettres des bâtisseurs. Puis pose les trois sceaux dans la zone, la clé DKIM fabriquée sur la Poste, et lis-les comme le monde les lira. »"; },
		entre: function(premier){ return premier ? "Syrine ouvre un casier : il est plein. « On lit, enfin. Maintenant les sceaux : SPF, DKIM, DMARC, dans la zone, et dig TXT. »" :
			"« Les sceaux sont posés. Mais Dovecot ne lit toujours pas les boîtes : doveadm mailbox list te dira pourquoi. »"; },
		erreur: function(){
			if (!aFait("p7_imap") && /maildir/.test((lireIle("poste", "/etc/dovecot/conf.d/10-mail.conf") || "").split("\n").filter(function(l){ return /^mail_location/.test(l); }).join("")) && !/^maildir/.test(reglagesDovecotIle("poste").mail_location || "")) return "Syrine montre 10-mail.conf. « Le fichier est juste ; Dovecot ne l'a pas relu : sudo systemctl reload dovecot. »";
			if (!aFait("p7_usurpation") && Object.keys(etatIle("poste").dkim || {}).length && !dkimPublieCh7()) return "« La clé est fabriquée, mais la zone ne la publie pas encore (ou pas la bonne) : copie la ligne de SELECTEUR.txt dans la zone, la série, rndc reload. »";
			return null;
		},
		fin: function(){ return "Syrine scelle une lettre à la cire bleue. « On lit, et personne n'écrira plus en notre nom sans qu'on le sache.\n\n" +
			"Une école a reçu, un matin, un courrier de son propre directeur demandant les coordonnées bancaires des familles. Ce n'était pas lui. " +
			"Avec SPF, DKIM et DMARC en place, ce courrier aurait fini en quarantaine chez tous les destinataires. Trois lignes TXT. »"; }
	},
	greniers: { nom: "Noam", m: "greniers",
		metier: "Le métier : un export NFS s'ouvre au plus petit réseau possible, en root_squash. Root sur un client n'a pas à être root sur le serveur : c'est la frontière qui protège les dossiers de chacun.",
		entree: function(){ return "Noam marche sous les grandes charpentes, une lanterne à la main. Sur chaque étagère, un dossier, une étiquette. « Les Greniers sont pleins de dossiers vides, et leurs portes sont fermées. Ouvre-les à l'île. Mais à l'île seulement. »"; },
		image: function(){ return "« Les Greniers, c'est NFS : la machine greniers garde /srv/homes, un dossier par habitant, et le prête aux autres machines par le réseau. Sur le quai, ce dossier apparaîtra comme s'il était sur place. " +
			"On le publie dans /etc/exports : à qui (un réseau, une machine), et comment (rw, sync, root_squash). " +
			"root_squash, c'est la règle d'or : root sur une machine cliente devient nobody aux Greniers. Sinon, n'importe qui avec sudo sur le quai serait le maître de toutes les maisons. »"; },
		syntaxe: function(){ return "« Sur greniers :\n\n" +
			"  /etc/exports :   /srv/homes  10.0.70.0/24(rw,sync,root_squash,no_subtree_check)\n" +
			"  sudo exportfs -ra                relire et appliquer\n" +
			"  sudo exportfs -v                 ce qui est publié, avec toutes les options\n" +
			"  ls -ln /srv/homes                les propriétaires : des numéros (les Greniers ne connaissent pas les noms)\n\n" +
			"Sur le quai :\n" +
			"  showmount -e greniers                             ce que les Greniers publient\n" +
			"  sudo mount -t nfs greniers:/srv/homes /mnt/greniers      monter ;  sudo umount /mnt/greniers\n\n" +
			"Le piège : une espace entre le réseau et la parenthèse. « 10.0.70.0/24 (rw) » ouvre en écriture au monde entier. »"; },
		mission: function(){ return "« Ta mission : publie /srv/homes à l'île, en lecture et écriture, en root_squash, et vérifie depuis le quai ce qu'il voit. Puis la preuve : monte les Greniers sur le quai, et essaie d'écrire en root dans le dossier de Badis. Ça doit être refusé. »"; },
		entre: function(premier){ return premier ? "Noam pousse les portes des Greniers. « Ouverts, à l'île. Maintenant la preuve : monte-les sur le quai, et essaie d'écrire en root chez Badis. »" :
			"« Tu as essayé, et c'est refusé : bien. Mais l'export n'est pas encore comme il faut : exportfs -v. »"; },
		erreur: function(){
			var e = etatNfsIle("greniers").actifs.filter(function(x){ return x.chemin === "/srv/homes"; })[0];
			if (!aFait("p7_exports") && e && e.client === "*") return "Noam s'arrête net. « Ton export est ouvert à tout le monde (*) : une espace avant la parenthèse ? Relis /etc/exports. »";
			if (!aFait("p7_exports") && e && !e.options.root_squash) return "« no_root_squash ! Root du quai serait maître de toutes les maisons. root_squash, et exportfs -ra. »";
			if (!aFait("p7_exports") && !e && /\/srv\/homes/.test(lireIle("greniers", "/etc/exports") || "")) return "« La ligne est écrite, mais rien n'est publié : sudo exportfs -ra. »";
			return null;
		},
		fin: function(){ return "Noam accroche sa lanterne à la plus haute poutre. « Les Greniers sont ouverts, et chacun y garde sa clé.\n\n" +
			"Dans un laboratoire, un export en no_root_squash a permis à un poste piraté de modifier les dossiers de tous les chercheurs, scripts de connexion compris. " +
			"Une seule option. root_squash ne coûte rien, et ferme cette porte-là. »"; }
	},
	halle: { nom: "Zélia", m: "halle",
		metier: "Le métier : un partage Samba se donne à un groupe (valid users = @promo), jamais aux invités. testparm relit la configuration : une faute de frappe y est ignorée en silence, et le partage marche mal sans rien dire.",
		entree: function(){ return "Zélia est debout au milieu de la Halle, sous la grande verrière. « Ici, la promo déposera ses cours, ses affiches, ses projets. La promo, et personne d'autre. Je voudrais y accrocher la première affiche, ce soir. »"; },
		image: function(){ return "« La Halle, c'est Samba : la machine halle partage un dossier, /srv/promo, avec le protocole des postes de travail (SMB). " +
			"Un partage s'écrit dans /etc/samba/smb.conf : son nom entre crochets, son chemin (path), qui y entre (valid users, et @ devant un groupe), si on y écrit (read only = no). " +
			"Samba garde ses propres mots de passe : chaque compte doit exister pour le système (ici, par le Registre) ET pour Samba (smbpasswd -a). " +
			"Et le dossier lui-même doit appartenir au groupe promo, avec le droit d'écrire pour le groupe. »"; },
		syntaxe: function(){ return "« Sur halle :\n\n" +
			"  sudo mkdir -p /srv/promo ;  sudo chgrp promo /srv/promo ;  sudo chmod 2770 /srv/promo\n" +
			"  /etc/samba/smb.conf :   [promo]  path = /srv/promo   valid users = @promo   read only = no\n" +
			"  testparm -s                      Samba relit sa configuration (et dit ce qu'il ignore)\n" +
			"  sudo smbpasswd -a NOM            un compte Samba ;  sudo pdbedit -L : la liste\n\n" +
			"Sur le quai :\n" +
			"  smbclient -L //halle -N                          les partages\n" +
			"  smbclient //halle/promo -U NOM -c 'put FICHIER; ls'      entrer, déposer, lister »"; },
		mission: function(){ return "« Ta mission : ouvre le partage [promo] à la promo seulement, et vérifie-le. Puis donne-moi un compte Samba, et que je dépose ma première affiche dans la Halle, depuis le quai. Il faudra que le Registre me connaisse, et que je sois de la promo. »"; },
		entre: function(premier){ return premier ? "Zélia sourit sous la verrière. « Le partage est prêt. Donne-moi mon compte (smbpasswd -a zelia), et je dépose l'affiche depuis le quai. »" :
			"« Mon affiche est accrochée, mais le partage n'est pas encore juste : testparm -s, et les droits de /srv/promo. »"; },
		erreur: function(){
			var p = partagePromoCh7();
			if (!aFait("p7_partage") && p && p.invite) return "Zélia secoue la tête. « guest ok : n'importe qui entrerait. On retire cette ligne. »";
			if (!aFait("p7_partage") && p && p.path && !dossierHote("halle", p.path)) return "« Le partage pointe vers " + p.path + ", qui n'existe pas encore. »";
			if (!aFait("p7_promo_acces") && !comptePourIle("halle", "zelia")) return "« La Halle ne me connaît pas encore : il faut que le Registre m'inscrive, et que la Halle le lise (sssd). Va voir Kamal. »";
			return null;
		},
		fin: function(){ return "Zélia accroche son affiche : « Bienvenue à la promo ». « La Halle est à eux, maintenant.\n\n" +
			"Une association a partagé ses dossiers « pour tout le monde » le temps d'un week-end, avec un compte invité. Le lundi, le partage contenait les fichiers d'un inconnu, " +
			"et il en manquait d'autres. Un partage se donne à un groupe, et on relit testparm. »"; }
	},
	registre: { nom: "Kamal", m: "registre",
		metier: "Le métier : l'annuaire est la source de vérité des comptes de toute la cité. Son mot de passe d'administration se garde haché, et chaque modification passe par un LDIF qu'on relit avant de l'envoyer.",
		entree: function(){ return "Kamal se tient devant un livre immense, ouvert sur un lutrin de chêne. Une seule ligne y est écrite. « Le Grand Registre a perdu son sceau pendant la traversée : plus personne ne peut y écrire. Il faudra en forger un autre. »"; },
		image: function(){ return "« Le Grand Registre, c'est LDAP : la machine registre fait tourner slapd, un annuaire. Tout y est rangé en arbre : la racine dc=port-aube,dc=lan, des branches (ou=people pour les habitants, ou=groups pour les groupes), " +
			"et des entrées, chacune avec son nom complet (dn) et ses attributs. Un habitant est un posixAccount : uid, uidNumber, gidNumber, homeDirectory, loginShell. " +
			"Le sceau, c'est le mot de passe de l'administrateur (olcRootPW, dans la configuration de slapd elle-même, cn=config). Personne ne le connaît plus : on en forge un neuf (slappasswd), " +
			"et on le pose par la porte de root, le socket local (ldapi:///, -Y EXTERNAL). »"; },
		syntaxe: function(){ return "« Sur registre :\n\n" +
			"  slappasswd                                            un mot de passe haché ({SSHA}...)\n" +
			"  sudo ldapmodify -Y EXTERNAL -H ldapi:///             dn: olcDatabase={1}mdb,cn=config / changetype: modify / replace: olcRootPW\n" +
			"  ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f FICHIER.ldif        ajouter (-c : continuer malgré les erreurs)\n" +
			"  ldapsearch -x -LLL -b dc=port-aube,dc=lan '(uid=badis)'              chercher\n" +
			"  ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W       changetype: modify / add: memberUid\n\n" +
			"Un groupe : objectClass: posixGroup, cn, gidNumber, et un memberUid par membre.\n" +
			"Les dix bâtisseurs sont dans /root/batisseurs.ldif, écrit sur le pont : ldapadd te dira ses deux fautes. »"; },
		mission: function(){ return "« Ta mission : reforge le sceau, crée les branches people et groups, inscris les dix bâtisseurs. Puis deux groupes : batisseurs (gidNumber 10000, les dix), et promo (gidNumber 10100), dont Zélia sera la première, pour accueillir les autres. Et ajoute au moins un membre avec ldapmodify. »"; },
		entre: function(premier){ return premier ? "Kamal tourne une page : dix noms, d'une belle écriture. « Les dix sont inscrits. Maintenant les groupes : batisseurs et promo, et leurs membres. »" :
			"« Les groupes sont là, mais le Registre ne connaît pas encore les dix (ou n'a pas de sceau connu). »"; },
		erreur: function(){
			if (!aFait("p7_annuaire") && !rootPwConnuCh7()) return "Kamal pose la main sur le livre. « Le vieux sceau tient toujours : olcRootPW est l'ancien. slappasswd, puis ldapmodify par ldapi:///, en root. »";
			if (!aFait("p7_annuaire") && entreeLdapIle("ou=people," + SUFFIXE_ILE) && !entreeUidCh7("noam")) return "« Noam manque : dans le LDIF, il n'a pas de uidNumber (Object class violation). Et Lamia a un gidNumber écrit en lettres. »";
			return null;
		},
		fin: function(){ return "Kamal referme le Grand Registre. « Une cité qui sait qui elle est.\n\n" +
			"Une entreprise avait un compte par machine, et une centaine de machines. Quand une employée est partie, on a fermé quatre-vingt-dix-sept de ses comptes. " +
			"Les trois autres ont servi, six mois plus tard. Avec un annuaire, on ferme un compte une fois, il est fermé partout. »"; }
	},
	portes: { nom: "Lamia", m: "portes",
		metier: "Le métier : une machine reconnaît les comptes de l'annuaire par sssd et nsswitch, sans un seul compte local ; autofs ouvre chaque dossier personnel à la demande, depuis le serveur de fichiers.",
		entree: function(){ return "Lamia attend sous l'auvent du débarcadère, adossée à la borne du quai. « C'est ici que le premier étudiant posera la main sur un clavier. Ce soir, la borne doit le reconnaître, et lui ouvrir sa maison. Aujourd'hui, elle ne connaît personne. »"; },
		image: function(){ return "« Les Portes, c'est la machine quai. Pour qu'elle connaisse les habitants sans qu'on les crée un par un, elle demande au Registre : c'est sssd, configuré dans /etc/sssd/sssd.conf (lisible par root seul, sinon il refuse de démarrer). " +
			"Puis on dit au système d'interroger sssd après les fichiers : passwd: files sss, dans /etc/nsswitch.conf. Alors getent passwd badis répond, et id badis aussi. " +
			"Et la maison : autofs monte /home/badis depuis les Greniers à l'instant où quelqu'un y entre, et rien d'autre. »"; },
		syntaxe: function(){ return "« Sur le quai :\n\n" +
			"  /etc/sssd/sssd.conf :\n" +
			"    [sssd]               services = nss, pam ;  domains = port-aube\n" +
			"    [domain/port-aube]   id_provider = ldap ;  auth_provider = ldap\n" +
			"                         ldap_uri = ldap://registre.port-aube.lan ;  ldap_search_base = dc=port-aube,dc=lan\n" +
			"  sudo chmod 600 /etc/sssd/sssd.conf ;  sudo systemctl start sssd\n" +
			"  /etc/nsswitch.conf :   passwd: files sss    group: files sss\n" +
			"  getent passwd badis ;  id badis ;  sudo sss_cache -E (oublier le cache)\n\n" +
			"  /etc/auto.master.d/home.autofs :   /home  /etc/auto.home\n" +
			"  /etc/auto.home :                   *  -fstype=nfs,rw  greniers:/srv/homes/&\n" +
			"  sudo systemctl reload autofs ;  ls /home/badis     (& prend le nom demandé) »"; },
		mission: function(){ return "« Ta mission : que le quai reconnaisse les comptes du Registre (getent, id), sans en créer un seul à la main. Puis que la maison de chacun s'ouvre seule, depuis les Greniers, quand on y entre. »"; },
		entre: function(premier){ return premier ? "Lamia passe la main sur la borne : un nom s'affiche. « Le quai les connaît. Maintenant les maisons : autofs, et qu'elles s'ouvrent seules. »" :
			"« Les maisons s'ouvrent, mais le quai ne reconnaît pas encore les habitants : sssd, et nsswitch. »"; },
		erreur: function(){
			var it = fichierHote("quai", "/etc/sssd/sssd.conf");
			if (!aFait("p7_sssd") && it && it.mode !== "rw-------") return "Lamia montre le fichier. « sssd refuse de démarrer avec un sssd.conf que d'autres peuvent lire : chmod 600. Le journal le dit (journalctl -u sssd). »";
			if (!aFait("p7_sssd") && sssdActifIle("quai") && !nssUtiliseIle("quai", "passwd")) return "« sssd tourne, mais le système ne lui demande rien : passwd: files sss, dans /etc/nsswitch.conf. »";
			return null;
		},
		fin: function(){ return "Lamia tapote la borne, qui brille d'un vert doux. « Le quai reconnaît la cité, et chaque maison s'ouvre à son habitant.\n\n" +
			"Une salle de cours de quarante postes, un compte local par poste et par étudiant. Un jour, quelqu'un a changé son mot de passe sur un seul poste. " +
			"Il a fallu le refaire sur les trente-neuf autres, à la main. Un annuaire et sssd : on change une fois. »"; }
	},
	forge: { nom: "Miguel", m: "forge",
		metier: "Le métier : la clé d'une autorité de certification ne quitte jamais sa machine. Un certificat se vérifie par la chaîne qui mène à une autorité de confiance, pas seulement par le cadenas.",
		entree: function(){ return "Miguel bat le métal sur l'enclume, et des étincelles bleues retombent sur le sol de pierre. « Chaque maison voudra montrer un sceau. Encore faut-il qu'il vienne d'une main sûre. C'est ici qu'on la forge. »"; },
		image: function(){ return "« La Forge des Sceaux, c'est une autorité de certification : la machine forge garde une clé secrète, et un certificat racine qui dit « je suis la Forge ». " +
			"Une maison (la Poste) fabrique sa propre clé, et une demande (une CSR) : « voici mon nom, voici ma clé publique ». La demande voyage jusqu'à la Forge ; la clé de la Poste, jamais. " +
			"La Forge signe : c'est le certificat de la Poste. Puis chaque machine qui doit faire confiance (le quai) ajoute le certificat racine de la Forge à son magasin (update-ca-certificates). " +
			"Alors, quand la Poste montre son sceau (TLS), le quai remonte la chaîne jusqu'à la Forge, et dit : vérifié. »"; },
		syntaxe: function(){ return "« Sur forge :\n\n" +
			"  sudo openssl genrsa -out /srv/forge/forge.key 4096\n" +
			"  sudo openssl req -x509 -new -key /srv/forge/forge.key -days 3650 -subj '/CN=Forge des Sceaux de Port-Aube' -out /srv/forge/forge.crt\n" +
			"  sudo openssl x509 -req -in DEMANDE.csr -CA /srv/forge/forge.crt -CAkey /srv/forge/forge.key -CAcreateserial -days 365 -copy_extensions copy -out SCEAU.crt\n\n" +
			"Sur poste :\n" +
			"  openssl req -new -key poste.key -subj '/CN=poste.port-aube.lan' -addext 'subjectAltName=DNS:poste.port-aube.lan' -out poste.csr\n" +
			"  /srv/demandes, sur forge : le dépôt des demandes (ouvert à tous, la Forge, elle, reste fermée)\n" +
			"  10-ssl.conf de Dovecot : ssl_cert = </chemin/du/sceau ;  ssl_key = </chemin/de/la/cle\n\n" +
			"Sur le quai :\n" +
			"  sudo cp forge.crt /usr/local/share/ca-certificates/forge-port-aube.crt ;  sudo update-ca-certificates\n" +
			"  openssl s_client -connect poste.port-aube.lan:143 -starttls imap       Verify return code: 0 (ok) ? »"; },
		mission: function(){ return "« Ta mission : forge l'autorité de la cité, et garde sa clé à la Forge, lisible par root seul. Puis le sceau de la Poste : sa demande vient jusqu'ici, il repart signé, Dovecot le sert. Et le quai doit le reconnaître, chaîne comprise. »"; },
		entre: function(premier){ return premier ? "Miguel plonge le premier sceau dans l'eau froide. « L'autorité est forgée. Maintenant le sceau de la Poste, et un quai qui sait le lire. »" :
			"« Le sceau de la Poste est vérifié, mais la Forge elle-même n'est pas sûre : sa clé, ses droits. »"; },
		erreur: function(){
			var a = autoriteForgeCh7();
			if (a && cleForgeSortieCh7(a.idCle)) return "Miguel lâche son marteau. « La clé de la Forge est sortie de la Forge ! Une copie traîne sur une autre machine. Retire-la : une clé d'autorité copiée, c'est n'importe qui qui signe en notre nom. »";
			if (!aFait("p7_sceaux") && a && !confianceIle("quai").some(function(x){ return x.serie === a.cert.serie; })) return "« Le quai ne connaît pas la Forge : la racine (le .crt, jamais la clé) dans /usr/local/share/ca-certificates, puis sudo update-ca-certificates. »";
			return null;
		},
		fin: function(){ return "Miguel accroche les sceaux au-dessus de la forge, et ils brillent dans la lumière du feu. « Chaque maison peut prouver qui elle est.\n\n" +
			"Une entreprise a laissé la clé de son autorité interne sur un partage, « pour dépanner ». Un an après, quelqu'un s'en est servi pour signer un faux site interne, " +
			"parfaitement reconnu par tous les postes. On a dû refaire tous les certificats, un week-end entier. La clé reste à la Forge. »"; }
	},
	arche: { nom: "Amina", m: "arche",
		metier: "Le métier : une sauvegarde est chiffrée, éloignée, automatique, et la clé qui la dépose ne sait rien faire d'autre (command=, restrict). Et une sauvegarde se juge à la restauration.",
		entree: function(){ return "Amina se tient sur la colline, devant l'Arche, et regarde la tempête qui monte sur la mer. « Tout ce que la cité ne veut pas perdre dormira ici, loin des vagues. Mais une arche vide ne sauve personne. »"; },
		image: function(){ return "« L'Arche, c'est borg, un outil de sauvegarde : il découpe les fichiers en morceaux, ne garde chaque morceau qu'une fois (la déduplication), chiffre tout, et range chaque passage dans une archive. " +
			"Les Greniers envoient leurs dossiers à l'Arche par ssh, dans un dépôt : borg@arche:/srv/borg/greniers. " +
			"La clé ssh qui sert à ça, on l'enferme : dans authorized_keys du compte borg, sa ligne commence par command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict. " +
			"Même volée, elle ne sait faire qu'une chose. Et le service sauvegarde-borg existe déjà sur les Greniers : il lui manque sa clé, son dépôt, sa phrase, et son horloge. »"; },
		syntaxe: function(){ return "« Sur greniers :\n\n" +
			"  sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''       une clé pour cette seule tâche\n" +
			"  sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers\n" +
			"  /root/.borg-phrase (600)                                   la phrase, pour le script\n" +
			"  sudo systemctl start sauvegarde-borg                       une sauvegarde, tout de suite\n" +
			"  sudo borg list --rsh ... DEPOT ;  sudo borg check ... DEPOT\n" +
			"  sudo borg extract --rsh ... DEPOT::ARCHIVE srv/homes/badis       (dans un dossier vide)\n" +
			"  sudo diff -r /srv/homes/badis /tmp/retour/srv/homes/badis       sans un mot : identique\n\n" +
			"Sur arche :  /home/borg/.ssh/authorized_keys :  command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict ssh-ed25519 AAAA...\n" +
			"Et sur greniers, un timer : /etc/systemd/system/sauvegarde-borg.timer (OnCalendar, Persistent), enable --now. »"; },
		mission: function(){ return "« Ta mission : un dépôt chiffré sur l'Arche, une clé qui ne sait faire qu'une chose, la phrase gardée par root, et une première sauvegarde des Greniers. Puis la sauvegarde de chaque nuit, à l'horloge, et la preuve : restaure un dossier, et compare-le à l'original. »"; },
		entre: function(premier){ return premier ? "Amina pose la main sur la coque de l'Arche. « Le premier chargement est à bord. Maintenant l'horloge de chaque nuit, et une restauration comparée. »" :
			"« L'horloge tourne, mais le dépôt n'est pas encore comme il faut : chiffré, la clé enfermée, la phrase en 600. »"; },
		erreur: function(){
			var d = depotArcheCh7();
			if (!aFait("p7_depot") && d && d.chiffrement === "none") return "Amina secoue la tête. « Un dépôt en clair, loin de la cité : n'importe qui sur l'Arche lirait tout. On le refait chiffré (-e repokey). »";
			if (!aFait("p7_depot") && d && !ligneArcheCh7()) return "« La clé des Greniers ouvre tout l'Arche : sa ligne d'authorized_keys doit commencer par command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict. »";
			if (!aFait("p7_depot") && d && fichierHote("greniers", "/root/.borg-phrase") && fichierHote("greniers", "/root/.borg-phrase").mode !== "rw-------") return "« La phrase du dépôt est lisible par d'autres que root : chmod 600. »";
			return null;
		},
		fin: function(){ return "Amina referme la porte de l'Arche, et la pluie glisse sur sa coque. « Ce que la cité ne veut pas perdre est à l'abri.\n\n" +
			"Un service a sauvegardé ses données chaque nuit pendant trois ans. Le jour où il en a eu besoin, l'archive était illisible depuis dix-huit mois : personne n'avait jamais essayé de la relire. " +
			"Une sauvegarde qu'on n'a jamais restaurée n'existe pas. »"; }
	}
};

/* Les maîtres dans leurs maisons, avec leurs sorts et leurs défis. */
Object.keys(MAITRES_ILE).forEach(function(cle){
	var g = MAITRES_ILE[cle], m = maisonCh7(cle);
	g.item = new Item(g.nom, "", "item_" + sansAccentCh7(g.nom) + ".gif").personnage();
	if (SORTS_DES_MAISONS[cle].length) g.item.enseigne.apply(g.item, SORTS_DES_MAISONS[cle]);
	g.item.revele.apply(g.item, idsDefisMaison(cle));
	texteVivant(g.item, function(){ return texteMaitreIle(g); });
	m.lieu.addItem(g.item);
});
LaurentPortAube.revele("s_p7_avant_tempete", "s_p7_sans_indice");
HorlogePortAube.revele("s_p7_avant_tempete");

/* ------------------------------------------------------------------ */
/* Le bestiaire de Port-Aube                                           */
/* ------------------------------------------------------------------ */

var BestiairePortAube = new Item("Bestiaire",
	"LE BESTIAIRE DE PORT-AUBE : l'image de la cité, puis le vrai mot du métier.\n\n" +
	"L'Architecte                  l'administrateur des services réseau\n" +
	"Le plan de la cité            un tableau de santé de l'infrastructure (ici, la commande du jeu chantier)\n" +
	"La Maison des Noms            le serveur DNS primaire (BIND, named), la zone et son numéro de série\n" +
	"Les étiquettes des rayons     les enregistrements : SOA, NS, A, CNAME, MX, TXT, PTR\n" +
	"Le Phare-Relais               le serveur DNS secondaire, le transfert de zone (AXFR, allow-transfer, NOTIFY)\n" +
	"Le chemin inverse             la zone inverse (in-addr.arpa, PTR, dig -x)\n" +
	"Le nom ajouté à chaud         la mise à jour dynamique (nsupdate) signée d'une clé TSIG\n" +
	"La Poste et son guichet       le serveur de courrier (Postfix, main.cf, postconf)\n" +
	"Les sacs en attente           la file d'attente (mailq, postqueue, postsuper)\n" +
	"Le relais ouvert aux vents    un open relay (mynetworks trop large)\n" +
	"Les casiers des habitants     les boîtes aux lettres (Maildir, Dovecot, IMAP, doveadm)\n" +
	"Les trois sceaux de cire      SPF, DKIM et DMARC, contre l'usurpation\n" +
	"Les Greniers                  le serveur de fichiers NFS (/etc/exports, exportfs, showmount)\n" +
	"La frontière du grenier       root_squash : root sur un client devient nobody\n" +
	"La Halle d'échange            le partage Samba (smb.conf, testparm, smbpasswd, smbclient)\n" +
	"Le Grand Registre             l'annuaire LDAP (slapd, LDIF, ldapadd, ldapsearch, ldapmodify)\n" +
	"Le sceau du Registre          le mot de passe d'administration (olcRootPW, slappasswd)\n" +
	"Les Portes de la cité         les comptes centralisés (sssd, nsswitch, getent, id)\n" +
	"La maison qui s'ouvre seule   le montage à la demande (autofs, auto.master)\n" +
	"La Forge des Sceaux           l'autorité de certification interne (openssl, CA)\n" +
	"Le sceau d'une maison         un certificat signé, servi en TLS (StartTLS, s_client)\n" +
	"Le magasin de confiance       les autorités reconnues (update-ca-certificates)\n" +
	"L'Arche                       la sauvegarde distante, chiffrée et dédupliquée (borg)\n" +
	"La clé qui ne fait qu'une chose    authorized_keys avec command= et restrict\n" +
	"La Tempête                    un incident sur une infrastructure en production\n" +
	"La Marée                      la mise en service, l'arrivée des utilisateurs\n" +
	"Le Premier Pas                le test de bout en bout, par un vrai utilisateur\n" +
	"Le rapport de mise en service le rapport : ce qui est bâti, ce qui a cassé, ce qui a été fait, ce qui reste",
	"item_historybook.gif");
HallPortAube.addItem(BestiairePortAube);

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts du chapitre                               */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH7 = {
	"named-checkconf":  { nom: "la Relecture des Rayons",     image: "Tu relis toute la bibliothèque des noms avant d'ouvrir ses portes." },
	"rndc":             { nom: "la Cloche de la Maison",      image: "Tu ordonnes à la Maison des Noms de relire ses rayons, sans fermer." },
	"nsupdate":         { nom: "l'Étiquette Posée à Chaud",   image: "Tu ajoutes un nom à la bibliothèque, signé de ta clé." },
	"tsig-keygen":      { nom: "la Clé du Relais",            image: "Tu forges la clé qui signe les ordres de la Maison des Noms." },
	"postconf":         { nom: "le Registre du Guichet",      image: "Tu lis et tu règles la feuille de route de la Poste." },
	"postfix":          { nom: "le Guichet de la Poste",      image: "Tu ouvres, vérifies et relances la Poste." },
	"mailq":            { nom: "les Sacs en Attente",         image: "Tu vois chaque lettre coincée, et pourquoi." },
	"postqueue":        { nom: "le Coup de Sifflet",          image: "Les sacs en attente repartent tous ensemble." },
	"postsuper":        { nom: "le Tampon du Chef de Poste",  image: "Tu retires, retiens ou relâches une lettre." },
	"postcat":          { nom: "l'Enveloppe Ouverte",         image: "Tu lis une lettre en attente avant d'en décider." },
	"mail":             { nom: "la Plume et l'Enveloppe",     image: "Tu écris une lettre à un habitant." },
	"sendmail":         { nom: "la Boîte de la Poste",        image: "Tu glisses une lettre toute prête dans la Poste." },
	"doveconf":         { nom: "le Plan des Casiers",         image: "Tu lis comment le Bureau range les lettres." },
	"doveadm":          { nom: "la Clé des Casiers",          image: "Tu ouvres le casier d'un habitant, et tu comptes ses lettres." },
	"opendkim-genkey":  { nom: "le Sceau de Cire",            image: "Tu fabriques le sceau qui signera chaque lettre de la cité." },
	"exportfs":         { nom: "les Portes des Greniers",     image: "Tu ouvres les Greniers à l'île, et à l'île seulement." },
	"showmount":        { nom: "la Liste des Greniers",       image: "Tu vois ce que les Greniers prêtent, et à qui." },
	"testparm":         { nom: "la Relecture de la Halle",    image: "Tu relis les règles de la Halle avant d'ouvrir." },
	"smbpasswd":        { nom: "le Jeton de la Halle",        image: "Tu donnes à un habitant le droit d'entrer dans la Halle." },
	"pdbedit":          { nom: "le Registre de la Halle",     image: "Tu vois qui a son jeton." },
	"ldapsearch":       { nom: "le Doigt sur le Registre",    image: "Tu cherches une ligne dans le Grand Registre." },
	"ldapadd":          { nom: "la Plume du Registre",        image: "Tu inscris de nouveaux habitants dans le Grand Registre." },
	"ldapmodify":       { nom: "la Rature du Registre",       image: "Tu corriges une ligne, ou le Registre lui-même." },
	"ldapdelete":       { nom: "la Page Arrachée",            image: "Tu retires une ligne du Registre." },
	"ldapwhoami":       { nom: "le Miroir du Registre",       image: "Le Registre te dit qui tu es pour lui." },
	"ldappasswd":       { nom: "le Mot Changé",               image: "Tu changes le mot de passe d'un habitant, sans le voir passer." },
	"slappasswd":       { nom: "le Sceau Reforgé",            image: "Tu forges le haché d'un mot de passe, pour le Registre." },
	"slapcat":          { nom: "la Copie du Registre",        image: "Tout le Registre, recopié d'un trait." },
	"sss_cache":        { nom: "l'Oubli des Portes",          image: "Les Portes oublient ce qu'elles croyaient savoir, et redemandent au Registre." },
	"update-ca-certificates": { nom: "le Magasin de Confiance", image: "Une machine apprend à reconnaître les sceaux de la Forge." },
	"borg":             { nom: "l'Arche",                     image: "Tout ce que la cité ne veut pas perdre, à l'abri, chiffré, loin des vagues." }
};
var NOM_RPG_AVANT_ILE = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 8 && SORTS_RPG_CH7[sort]) return SORTS_RPG_CH7[sort].nom;
	return NOM_RPG_AVANT_ILE(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre : un par maison, la Tempête, la Marée, le Premier Pas, le Rapport, 14 h, et le platine */
/* ------------------------------------------------------------------ */

var TROPHEES_CH7 = {
	maison_noms:     ["la Maison des Noms", "named-checkzone, named.conf.local (type primary), named-checkconf -z, rndc reload, dig @noms ; la série AAAAMMJJNN, qui monte à chaque modification."],
	maison_phare:    ["le Phare Allumé", "Un secondaire (type secondary, primaries), allow-transfer au secondaire seul, AXFR refusé aux autres ; la zone inverse (PTR, dig -x) ; nsupdate signé d'une clé TSIG."],
	maison_poste:    ["la Poste Rouverte", "postconf -n, postfix check, postconf -e, postfix reload ; mydestination, relayhost, mynetworks au plus juste ; mailq, postqueue -f, le journal (status=sent)."],
	maison_lettres:  ["les Trois Sceaux", "Dovecot et Postfix d'accord (mail_location = maildir) ; doveadm ; SPF, DKIM (opendkim-genkey) et DMARC publiés dans la zone, relus avec dig TXT."],
	maison_greniers: ["les Greniers Ouverts", "/etc/exports (rw, sync, root_squash, un réseau précis), exportfs -ra et -v, showmount -e ; un montage NFS, et root qui devient nobody."],
	maison_halle:    ["la Halle de la Promo", "Un partage [promo] : path, valid users = @promo, read only = no, sans invité ; testparm, smbpasswd -a, pdbedit -L, smbclient."],
	maison_registre: ["le Registre Scellé", "slappasswd et olcRootPW par ldapi:///, ou=people et ou=groups, les posixAccount (LDIF corrigé), les posixGroup et leurs memberUid ; ldapsearch -x."],
	maison_portes:   ["les Portes qui Reconnaissent", "sssd.conf (600, id_provider = ldap), passwd: files sss ; getent, id ; autofs (auto.master, carte avec * et &) qui monte chaque maison à la demande."],
	maison_forge:    ["la Forge des Sceaux", "Une autorité (genrsa, req -x509), sa clé qui ne sort pas ; une demande signée (x509 -req -CA), servie par Dovecot ; update-ca-certificates ; s_client -starttls."],
	maison_arche:    ["l'Arche à Flot", "borg init chiffré, une clé enfermée (command=, restrict), la phrase en 600 ; un timer systemd ; borg check, et une restauration comparée (extract, diff -r)."],
	p7_chantier:     ["le Plan Déroulé", "On mesure l'état d'une infrastructure avant de la bâtir : sans point de départ, on ne prouve rien."],
	p7_tempete:      ["la Tempête Tenue", "Pendant un incident, on lit avant d'agir, et on répare une maison à la fois."],
	p7_maree:        ["la Marée Accueillie", "Une mise en service se prépare : ce qui n'est pas prêt à l'arrivée des utilisateurs devient un incident."],
	p7_premier_pas:  ["le Premier Pas", "Le vrai test, c'est le premier utilisateur : compte, maison, courrier, partage, sceau, sauvegarde, de bout en bout."],
	p7_rapport:      ["le Rapport Contresigné", "Un rapport de mise en service : ce qui est bâti, la tempête, la marée, le premier pas, ce qui reste à faire."],
	s_p7_avant_tempete: ["Plus Vite que l'Orage", "Les dix maisons debout avant 14 h : on construit avant l'incident, pas pendant."]
};
var COMPETENCES_CH7 = {
	maison_noms: "DNS primaire", maison_phare: "DNS secondaire et inverse", maison_poste: "Serveur de courrier", maison_lettres: "IMAP et anti-usurpation",
	maison_greniers: "Partage NFS", maison_halle: "Partage Samba", maison_registre: "Annuaire LDAP", maison_portes: "Comptes centralisés",
	maison_forge: "Autorité de certification", maison_arche: "Sauvegarde distante", p7_chantier: "Infrastructure mesurée", p7_tempete: "Incident réseau tenu",
	p7_maree: "Mise en service", p7_premier_pas: "Test de bout en bout", p7_rapport: "Rapport de mise en service", s_p7_avant_tempete: "Construction en temps limité",
	platine_ch7: "Architecte de Port-Aube"
};
var SIGLES_CH7 = {
	maison_noms: ["DNS", "or"], maison_phare: ["AXFR", "argent"], maison_poste: ["SMTP", "or"], maison_lettres: ["IMAP", "argent"],
	maison_greniers: ["NFS", "argent"], maison_halle: ["SMB", "argent"], maison_registre: ["LDAP", "or"], maison_portes: ["SSSD", "argent"],
	maison_forge: ["PKI", "or"], maison_arche: ["BORG", "or"], p7_chantier: ["PLAN", "bronze"], p7_tempete: ["ORAG", "or"], p7_maree: ["MAREE", "argent"],
	p7_premier_pas: ["PAS", "or"], p7_rapport: ["DOC", "or"], s_p7_avant_tempete: ["14H", "or"], platine_ch7: ["ARCH", "platine"]
};
Object.keys(COMPETENCES_CH7).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH7[id]; });
Object.keys(SIGLES_CH7).forEach(function(id){ if (SIGLES_CH7[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH7[id][1]; });
function badgeCh7Gagne(id){ return /^maison_/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_ILE = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_ILE();
	if (state.has("ch7Ouvert") && !state.has("platine_ch7") && Object.keys(TROPHEES_CH7).every(badgeCh7Gagne)){
		state.set("platine_ch7");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch7) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* chantier : le plan de la cité et ses dix maisons                     */
/* ------------------------------------------------------------------ */

function texteChantier(){
	var c = sCh7(), score = scoreChantierCh7();
	var lignes = [C.gras("LE PLAN DE PORT-AUBE"), C.jaune("commande du jeu, pas Linux (man chantier)"), C.gris("rouge : la maison est en friche · vert : elle est bâtie · l'état est lu sur les machines de l'île"), ""];
	lignes.push("  Il est " + C.gras(heureCh7()) + (c.maree ? C.gris(" · le navire est à quai") : C.gris(" · " + (c.tempete ? "la Tempête souffle" : "la Tempête dans " + Math.max(0, TEMPETE_CH7 - c.horloge) + " min") + " · la marée dans " + texteAvantMaree())));
	lignes.push("  La cité : " + C.gras(score + " / 100") + (c.scoreDepart !== null && c.scoreDepart !== undefined ? C.gris(" (départ : " + c.scoreDepart + ", objectif : plus de 90 après la Marée)") : C.gris(" (objectif : plus de 90 après la Marée)")), "");
	MAISONS_CH7.forEach(function(m){
		var ok = maisonBatieCh7(m.cle), faites = m.etapes.filter(aFait).length, defis = idsDefisMaison(m.cle).filter(aFait).length;
		var etats = m.etapes.filter(function(id){ try { return ETATS_CH7[id](); } catch (e){ return false; } }).length;
		var incident = c.incidentsTempete && c.incidentsTempete[m.cle] && !INCIDENTS_TEMPETE_CH7[m.cle].reparee();
		lignes.push("  " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(m.nom, 18)) + completerDroite(m.maitre, 8) + C.gris(" (" + m.machine + ")") + (current_room === m.lieu ? C.jaune("  ◀ toi") : ""));
		lignes.push("      " + (ok ? C.vert(faites + " sur 2 étapes") : C.gris(faites + " sur 2 étapes")) + C.gris(" · " + etats + " sur 2 en place sur la machine · " + defis + " sur 5 défis") + (incident ? C.rouge(" · la Tempête : " + INCIDENTS_TEMPETE_CH7[m.cle].phrase) : ""));
	});
	if (c.maree && !SURPRISE_MAREE_CH7.reparee()) lignes.push("", "  " + C.rouge("●") + " La capitainerie : " + SURPRISE_MAREE_CH7.phrase);
	if (c.maree && (c.inacheveesMaree || []).length) lignes.push("", C.gris("  À la marée, il manquait : " + c.inacheveesMaree.map(function(k){ return maisonCh7(k).titre; }).join(", ") + "."));
	if (c.maree) lignes.push("", "  Le Premier Pas : " + (c.premierPas ? C.vert(c.premierPas + " est entré dans la cité") : C.jaune("le premier étudiant attend sur le quai (ssh PRENOM@quai)")));
	if (typeof lumieresAnnexes === "function"){ var la = lumieresAnnexes(8); if (la.length) lignes.push("", C.gras("Les lumières des habitants"), la.map(function(x){ return "  " + C.jaune("✺") + " " + x; }).join("\n")); }
	lignes.push("", "  Maisons bâties : " + C.gras(maisonsBatiesCh7().length + " sur 10"));
	var avant = aFait("s_p7_avant_tempete") ? C.vert("réussi") : (c.horloge >= TEMPETE_CH7 ? C.rouge("manqué") : C.jaune("en cours (" + Math.max(0, TEMPETE_CH7 - c.horloge) + " min)"));
	var hi = aFait("s_p7_sans_indice") ? C.vert("réussi") : (state.malus8 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("Défis d'honneur (Laurent)"), "  Les dix maisons avant 14 h : " + avant, "  Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH7).filter(badgeCh7Gagne);
	lignes.push("", C.gras("BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH7).length) + C.gris("  (badges port-aube : les leçons)"));
	return lignes.join("\n");
}
Shell.sorts.chantier = function(args, io){
	if (!state.has("ch7Ouvert")) return "Le plan de Port-Aube se déroule avec le chapitre 7, après Lumen. " + C.gris("(À Lumen, c'est lanterne.)");
	var c = sCh7(), score = scoreChantierCh7();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = score;
	c.scoreDernier = score;
	if (c.maree) c.scoreFinalCandidat = score;
	GameEvents.fire({ type: "chantier", score: score });
	var texte = texteChantier();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
if (SORTS_DU_JEU.indexOf("chantier") === -1) SORTS_DU_JEU.push("chantier");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["chantier", "le plan de Port-Aube : la note de la cité et ses dix maisons (chapitre 7)"]);
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.chantier = "chantier n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
	"À Port-Aube (chapitre 7), il déroule le plan de la cité : la note, de 0 à 100, calculée sur l'état RÉEL des machines de l'île,\n" +
	"et les dix maisons : en rouge celles qui sont en friche, en vert celles que tu as bâties (les deux étapes du maître faites),\n" +
	"avec ce qui est en place sur les machines, tes défis, l'heure, la Tempête et la Marée, le Premier Pas, les lumières des\n" +
	"habitants (quêtes annexes) et les défis d'honneur.\n\n  chantier          le plan de Port-Aube";

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio                     */
/* ------------------------------------------------------------------ */

function verifierIle(){
	if (!ileOuverte()) return;
	var c = state.ch7;
	if (!c) return;
	DEFIS_ILE.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiIle(d.id); } });
	if (c.toutesBaties !== undefined && c.toutesBaties < TEMPETE_CH7) reussirDefiIle("s_p7_avant_tempete");
	if (aFait("p7_rapport") && !state.malus8) reussirDefiIle("s_p7_sans_indice");
	MAISONS_CH7.forEach(function(m){ if (maisonBatieCh7(m.cle) && !state.has("maison_" + m.cle)) state.set("maison_" + m.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH7).forEach(function(id){
		if (!badgeCh7Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	var suivante = QUETES_CH7.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (aFait("p7_quai") && c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "p7_chantier") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(HallPortAube) + "/Radio.)"));
	}
}
var VERIFIER_CH7_AVANT_ILE = verifierChapitre7;
verifierChapitre7 = function(){
	VERIFIER_CH7_AVANT_ILE();
	verifierIle();
};

World.fige = true;
