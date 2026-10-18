/**
 * SortsIlePoste.js : le moteur des services réseau de l'île, deuxième partie : le courrier.
 *
 *  - Postfix : main.cf (paramètres, $variables, doublons, paramètres inconnus), postconf (-n, -d, -h, -e, -X), postfix
 *    (check, start, stop, reload, status, flush), la file (mailq, postqueue -p / -f / -i, postsuper -d / -r, postcat -q),
 *    l'envoi (mail -s, sendmail, sendmail -t, sendmail -bp) et la livraison réelle : mydestination, les alias
 *    (/etc/aliases), les comptes (getpwnam : /etc/passwd puis sssd), le relais (relayhost) ; dans un Maildir
 *    (mail_spool_directory avec une barre finale, ou home_mailbox), ou par Dovecot (mailbox_command, et Sieve).
 *    Les journaux : journalctl -u postfix, et /var/log/mail.log.
 *  - Dovecot : dovecot.conf et conf.d (les !include), doveconf (-n, CLÉ), doveadm (user, mailbox list / status / create,
 *    fetch, search, reload), le stockage (mail_location : maildir ou mbox), la configuration TLS (ssl, ssl_cert, ssl_key).
 *  - DKIM : opendkim-genkey (la clé privée et l'enregistrement TXT à publier dans la zone).
 */

/* ================================================================== */
/* Les comptes d'une machine : /etc/passwd (sssd ajoute ceux du Registre, SortsIleBis.js) */
/* ================================================================== */

function lignePasswdIle(l){ var c = l.split(":"); return c.length >= 7 ? { nom: c[0], uid: +c[2], gid: +c[3], gecos: c[4], home: c[5], shell: c[6] } : null; }
function utilisateurLocalIle(h, nom){
	var t = lireIle(h, "/etc/passwd") || "";
	return t.split("\n").map(lignePasswdIle).filter(function(u){ return u && u.nom === nom; })[0] || null;
}
function utilisateurLocalParUidIle(h, uid){
	var t = lireIle(h, "/etc/passwd") || "";
	return t.split("\n").map(lignePasswdIle).filter(function(u){ return u && u.uid === +uid; })[0] || null;
}
/* Le compte d'un nom, comme getpwnam : local, puis l'annuaire par sssd (si nsswitch et sssd le permettent). */
function comptePourIle(h, nom){
	var l = utilisateurLocalIle(h, nom);
	if (l) return l;
	if (typeof utilisateurSssIle === "function") return utilisateurSssIle(h, nom);
	return null;
}

/* ================================================================== */
/* Postfix : main.cf                                                    */
/* ================================================================== */

var DEFAUTS_POSTFIX = {
	alias_database: "hash:/etc/aliases", alias_maps: "hash:/etc/aliases, nis:mail.aliases", append_dot_mydomain: "no", biff: "yes",
	command_directory: "/usr/sbin", compatibility_level: "0", config_directory: "/etc/postfix", daemon_directory: "/usr/lib/postfix/sbin",
	data_directory: "/var/lib/postfix", default_transport: "smtp", home_mailbox: "", inet_interfaces: "all", inet_protocols: "all",
	local_recipient_maps: "proxy:unix:passwd.byname $alias_maps", mail_name: "Postfix", mail_owner: "postfix", mail_spool_directory: "/var/mail",
	mailbox_command: "", mailbox_size_limit: "51200000", mailq_path: "/usr/bin/mailq", manpage_directory: "/usr/share/man", message_size_limit: "10240000",
	mydestination: "$myhostname, localhost.$mydomain, localhost", mydomain: "", myhostname: "", mynetworks: "127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128",
	mynetworks_style: "host", myorigin: "$myhostname", newaliases_path: "/usr/bin/newaliases", queue_directory: "/var/spool/postfix", readme_directory: "no",
	recipient_delimiter: "", relay_domains: "", relayhost: "", sendmail_path: "/usr/sbin/sendmail", setgid_group: "postdrop",
	smtp_tls_CApath: "", smtp_tls_security_level: "", smtp_tls_session_cache_database: "", smtpd_banner: "$myhostname ESMTP $mail_name",
	smtpd_relay_restrictions: "permit_mynetworks, permit_sasl_authenticated, defer_unauth_destination", smtpd_recipient_restrictions: "",
	smtpd_tls_cert_file: "", smtpd_tls_key_file: "", smtpd_tls_security_level: "", virtual_alias_maps: "$virtual_maps", virtual_mailbox_domains: "$virtual_mailbox_maps",
	virtual_mailbox_maps: "", virtual_maps: "", milter_default_action: "tempfail", smtpd_milters: "", non_smtpd_milters: "", disable_vrfy_command: "no",
	smtpd_helo_required: "no", smtp_host_lookup: "dns", delay_warning_time: "0h", maximal_queue_lifetime: "5d", bounce_queue_lifetime: "5d"
};
function lireMainCfIle(h){
	var texte = lireIle(h, "/etc/postfix/main.cf") || "", r = { params: {}, lignes: {}, avertissements: [] };
	var lignes = texte.split("\n"), courant = null;
	lignes.forEach(function(brute, i){
		if (/^\s*#/.test(brute) || /^\s*$/.test(brute)){ courant = /^\s*$/.test(brute) ? null : courant; return; }
		if (/^\s/.test(brute) && courant){ r.params[courant] += " " + brute.trim(); return; }
		var m = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(brute);
		if (!m){ r.avertissements.push("postconf: warning: /etc/postfix/main.cf, line " + (i + 1) + ": missing '=' after attribute name: \"" + brute.trim().split(/\s+/)[0] + "\""); courant = null; return; }
		if (r.params.hasOwnProperty(m[1])) r.avertissements.push("postconf: warning: /etc/postfix/main.cf, line " + (i + 1) + ": overriding earlier entry: " + m[1] + "=" + r.params[m[1]]);
		r.params[m[1]] = m[2].trim();
		r.lignes[m[1]] = i + 1;
		courant = m[1];
	});
	Object.keys(r.params).forEach(function(k){
		if (!DEFAUTS_POSTFIX.hasOwnProperty(k) && !/^(smtpd?|lmtp|virtual|transport|local|relay|header|body|mime|queue|default|proxy|milter|tls|postscreen|address)_/.test(k)) r.avertissements.push("postconf: warning: /etc/postfix/main.cf: unused parameter: " + k + "=" + r.params[k]);
	});
	return r;
}
/* La valeur effective d'un paramètre (les défauts calculés : myhostname, mydomain). */
function valeurPostfixIle(h, params, k){
	if (params.hasOwnProperty(k)) return params[k];
	if (k === "myhostname") return h + "." + DOMAINE_ILE;
	if (k === "mydomain"){ var hn = developperPostfixIle(h, params, "$myhostname"); return hn.indexOf(".") > -1 ? hn.substring(hn.indexOf(".") + 1) : "localdomain"; }
	return DEFAUTS_POSTFIX.hasOwnProperty(k) ? DEFAUTS_POSTFIX[k] : "";
}
function developperPostfixIle(h, params, v, profondeur){
	profondeur = profondeur || 0;
	if (profondeur > 8) return v;
	return String(v).replace(/\$\{?([A-Za-z0-9_]+)\}?/g, function(t, k){ return developperPostfixIle(h, params, valeurPostfixIle(h, params, k), profondeur + 1); });
}
function listePostfixIle(v){ return String(v || "").split(/[\s,]+/).filter(Boolean); }
/* La configuration chargée (au démarrage, au rechargement) : celle que le maître applique. */
function etatPostfixIle(h){
	var e = etatIle(h);
	if (!e.postfix || typeof e.postfix !== "object") e.postfix = {};
	if (!e.postfix.file) e.postfix.file = [];
	if (!e.postfix.journalLu) e.postfix.journalLu = 0;
	return e.postfix;
}
function chargerPostfixIle(h){ var p = etatPostfixIle(h); p.charge = copieJson(lireMainCfIle(h).params); p.chargeA = maintenantMachine(h); return p.charge; }
function paramsPostfixChargesIle(h){ var p = etatPostfixIle(h); return p.charge || chargerPostfixIle(h); }
function postfixTourne(h){ return serviceActifIle(h, "postfix"); }

/* Une ligne du journal du courrier : dans journalctl, et dans /var/log/mail.log. */
function journalPosteIle(h, ident, message, prio){
	var pids = { "postfix/master": 1100, "postfix/qmgr": 1103, "postfix/pickup": 1102, "postfix/cleanup": 2210, "postfix/local": 2213, "postfix/smtp": 2215, "postfix/bounce": 2218, "postfix/postsuper": 2220, "postfix/postfix-script": 2230, "postfix/postqueue": 2231, "dovecot": 1180, "dovecot-lda": 2240 };
	var pid = pids[ident] || 2200;
	journalMachine(h, { unite: ident, unit: /^dovecot/.test(ident) ? "dovecot.service" : "postfix.service", pid: pid, message: message, prio: prio === undefined ? 6 : prio });
	var d = dateIle(h);
	var ligne = MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + h + " " + ident + "[" + pid + "]: " + message;
	moteurSeul(function(){
		var it = fichierHote(h, "/var/log/mail.log");
		if (!it) it = poserFichierHote(h, "/var/log/mail.log", "", { mode: "rw-r-----" });
		if (it){ var t = it.getText(); it.setText((t ? t.replace(/\n$/, "") + "\n" : "") + ligne); }
	});
}

/* ================================================================== */
/* Postfix : la livraison                                               */
/* ================================================================== */

function aliasPostfixIle(h){
	var r = {};
	(lireIle(h, "/etc/aliases") || "").split("\n").forEach(function(l){
		var m = /^\s*([^#:\s]+)\s*:\s*(.+)$/.exec(l);
		if (m) r[m[1].toLowerCase()] = m[2].split(",").map(function(x){ return x.trim(); }).filter(Boolean);
	});
	return r;
}
function nouvelIdPostfixIle(h){ return hexDe("qid:" + h + ":" + state.nbCommandes + ":" + Math.random(), 10).toUpperCase(); }
function delaiTexteIle(ms){ return (Math.max(0, ms) / 1000).toFixed(2).replace(/\.00$/, ".02"); }
/* Le texte complet d'un message, tel qu'il est rangé dans une boîte. */
function texteMessageIle(h, msg, destinataire){
	var d = dateIle(h, msg.arrivee);
	var dateTexte = JOURS_EN[d.getDay()] + ", " + d.getDate() + " " + MOIS_EN[d.getMonth()] + " " + d.getFullYear() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + texteDecalage(h);
	var entetes = ["Return-Path: <" + msg.de + ">", "X-Original-To: " + destinataire, "Delivered-To: " + destinataire,
		"Received: by " + h + "." + DOMAINE_ILE + " (Postfix, from userid " + (msg.uid === undefined ? 1000 : msg.uid) + ")", "\tid " + msg.id + "; " + dateTexte,
		"From: " + (msg.deNom ? msg.deNom + " <" + msg.de + ">" : msg.de), "To: " + msg.a.join(", "), "Subject: " + (msg.sujet || ""), "Date: " + dateTexte,
		"Message-Id: <" + msg.id.toLowerCase() + "@" + h + "." + DOMAINE_ILE + ">"].concat(msg.entetes || []);
	return entetes.join("\n") + "\n\n" + (msg.corps || "");
}
/* Ranger un message dans un Maildir : DOSSIER/new/FICHIER (les dossiers new, cur, tmp sont créés au besoin, au propriétaire). */
function rangerMaildirIle(h, dossier, msg, texte, proprietaire, sousDossier){
	var base = dossier.replace(/\/$/, "") + (sousDossier ? "/." + sousDossier : "");
	moteurSeul(function(){
		["", "/new", "/cur", "/tmp"].forEach(function(s){
			creerDossierHote(h, base + s, { owner: proprietaire, mode: "rwx------" });
		});
		var nom = Math.floor(maintenantMachine(h) / 1000) + ".M" + (100000 + Math.floor(alea("maildir" + msg.id + base) * 800000)) + "P" + (2000 + state.nbCommandes % 7000) + "." + h + ",S=" + texte.length;
		poserFichierHote(h, base + "/new/" + nom, texte, { owner: proprietaire, mode: "rw-------" });
	});
}
/* Livrer à un compte de la machine : Maildir de Postfix, ou Dovecot (mailbox_command), avec Sieve. */
function livrerLocalIle(h, msg, destinataire, compte, params){
	var commande = developperPostfixIle(h, params, valeurPostfixIle(h, params, "mailbox_command"));
	var texte = texteMessageIle(h, msg, destinataire);
	if (/dovecot-lda|\/deliver\b/.test(commande)){
		var r = typeof livrerDovecotIle === "function" ? livrerDovecotIle(h, compte, msg, texte) : { ok: false, raison: "dovecot-lda absent" };
		return r.ok ? { statut: "sent", texte: "delivered to command: " + commande.split(/\s+/)[0] } : { statut: "deferred", texte: "temporary failure. Command output: " + r.raison };
	}
	var spool = developperPostfixIle(h, params, valeurPostfixIle(h, params, "mail_spool_directory")), home = valeurPostfixIle(h, params, "home_mailbox");
	if (home){
		if (!dossierHote(h, compte.home)) return { statut: "deferred", texte: "temporary failure. Command output: maildir delivery failed: create maildir file " + compte.home + "/" + home + "tmp/...: No such file or directory" };
		if (/\/$/.test(home)) rangerMaildirIle(h, compte.home + "/" + home, msg, texte, compte.nom);
		else { moteurSeul(function(){ var it = fichierHote(h, compte.home + "/" + home) || poserFichierHote(h, compte.home + "/" + home, "", { owner: compte.nom, mode: "rw-------" }); it.setText((it.getText() ? it.getText() + "\n\n" : "") + "From " + msg.de + " " + dateDigIle(h) + "\n" + texte); }); }
		return { statut: "sent", texte: /\/$/.test(home) ? "delivered to maildir" : "delivered to mailbox" };
	}
	if (/\/$/.test(spool)){ rangerMaildirIle(h, spool + compte.nom + "/", msg, texte, compte.nom); return { statut: "sent", texte: "delivered to maildir" }; }
	var chemin = spool.replace(/\/$/, "") + "/" + compte.nom;
	if (dossierHote(h, chemin)) return { statut: "deferred", texte: "temporary failure. Command output: cannot update mailbox " + chemin + " for user " + compte.nom + ". destination " + chemin + " is not a regular file" };
	moteurSeul(function(){ var it = fichierHote(h, chemin) || poserFichierHote(h, chemin, "", { owner: compte.nom, mode: "rw-rw----" }); it.setText((it.getText() ? it.getText() + "\n\n" : "") + "From " + msg.de + "  " + dateDigIle(h) + "\n" + texte); });
	return { statut: "sent", texte: "delivered to mailbox" };
}
/* Une tentative de livraison d'un message de la file. Renvoie vrai s'il a quitté la file. */
function tenterLivraisonIle(h, msg){
	var params = paramsPostfixChargesIle(h);
	var locaux = listePostfixIle(developperPostfixIle(h, params, valeurPostfixIle(h, params, "mydestination"))).map(function(x){ return x.toLowerCase(); });
	var relais = developperPostfixIle(h, params, valeurPostfixIle(h, params, "relayhost")).trim();
	var alias = aliasPostfixIle(h), restants = [], raison = null, delai = delaiTexteIle(maintenantMachine(h) - msg.arrivee);
	msg.a.forEach(function(dest){
		var m = /^([^@]+)@(.+)$/.exec(dest), local = m ? m[1].toLowerCase().split("+")[0] : dest.toLowerCase(), domaine = m ? m[2].toLowerCase() : null;
		if (domaine === null || locaux.indexOf(domaine) > -1){
			// Les alias d'abord (root -> le joueur), puis le compte.
			var cible = local, garde = 0;
			while (alias[cible] && garde++ < 5) cible = alias[cible][0].replace(/@.*$/, "").toLowerCase();
			var compte = comptePourIle(h, cible);
			if (!compte){
				journalPosteIle(h, "postfix/local", msg.id + ": to=<" + dest + ">, relay=local, delay=" + delai + ", delays=0.01/0/0/0, dsn=5.1.1, status=bounced (unknown user: \"" + cible + "\")", 6);
				evenementIle(h, "livraison", { id: msg.id, a: dest, statut: "bounced", compte: cible });
				return;
			}
			var r = livrerLocalIle(h, msg, dest, compte, params);
			journalPosteIle(h, "postfix/local", msg.id + ": to=<" + (cible !== local ? cible + "@" + (domaine || DOMAINE_ILE) : dest) + ">" + (cible !== local ? ", orig_to=<" + dest + ">" : "") + ", relay=local, delay=" + delai + ", delays=0.01/0/0/0.01, dsn=" + (r.statut === "sent" ? "2.0.0" : "4.2.0") + ", status=" + r.statut + " (" + r.texte + ")", r.statut === "sent" ? 6 : 4);
			evenementIle(h, "livraison", { id: msg.id, a: dest, statut: r.statut, compte: compte.nom, sujet: msg.sujet, de: msg.de });
			if (r.statut !== "sent"){ restants.push(dest); raison = r.texte; }
			return;
		}
		// Hors de l'île : par le relais, ou par le MX du domaine.
		var hoteRelais = relais ? relais.replace(/^\[|\](:\d+)?$/g, "").replace(/:\d+$/, "") : null;
		raison = hoteRelais ? "connect to " + hoteRelais + "[10.0.92.25]:" + ((/:(\d+)$/.exec(relais) || [])[1] || "25") + ": Connection timed out" :
			"Host or domain name not found. Name service error for name=" + domaine + " type=MX: Host not found, try again";
		journalPosteIle(h, "postfix/smtp", msg.id + ": to=<" + dest + ">, relay=none, delay=" + delai + ", delays=0.01/0/30/0, dsn=4.4.1, status=deferred (" + raison + ")", 4);
		evenementIle(h, "livraison", { id: msg.id, a: dest, statut: "deferred", raison: raison });
		restants.push(dest);
	});
	if (!restants.length){ journalPosteIle(h, "postfix/qmgr", msg.id + ": removed"); return true; }
	msg.a = restants;
	msg.raison = raison;
	msg.essais = (msg.essais || 0) + 1;
	return false;
}
/* Faire passer la file : chaque message est retenté. */
function viderFilePostfixIle(h, seulement){
	var p = etatPostfixIle(h);
	if (!postfixTourne(h)) return;
	p.file = p.file.filter(function(msg){
		if (seulement && msg.id !== seulement) return true;
		if (msg.retenu) return true;
		return !tenterLivraisonIle(h, msg);
	});
}
/* Un message arrive par sendmail (pickup, cleanup, qmgr), puis tente sa livraison. */
function deposerMessageIle(h, msg){
	var p = etatPostfixIle(h);
	msg.id = nouvelIdPostfixIle(h);
	msg.arrivee = maintenantMachine(h);
	msg.taille = 380 + String(msg.corps || "").length + String(msg.sujet || "").length;
	journalPosteIle(h, "postfix/pickup", msg.id + ": uid=" + (msg.uid === undefined ? 1000 : msg.uid) + " from=<" + msg.de + ">");
	journalPosteIle(h, "postfix/cleanup", msg.id + ": message-id=<" + msg.id.toLowerCase() + "@" + h + "." + DOMAINE_ILE + ">");
	journalPosteIle(h, "postfix/qmgr", msg.id + ": from=<" + msg.de + ">, size=" + msg.taille + ", nrcpt=" + msg.a.length + " (queue active)");
	p.file.push(msg);
	evenementIle(h, "envoi", { id: msg.id, de: msg.de, a: msg.a.slice(), sujet: msg.sujet });
	if (postfixTourne(h)) viderFilePostfixIle(h, msg.id);
	return msg.id;
}

/* ================================================================== */
/* Postfix : postconf, postfix                                          */
/* ================================================================== */

function exigerPosteIle(io, cmd){
	var h = ileIci();
	if (!h || !fichierHote(h, "/etc/postfix/main.cf")) throw new ShellError(cmd + ": command not found" + astuce(io, "Postfix est installé sur la machine poste (ssh poste)."), 127);
	return h;
}
Shell.sorts.postconf = function(args, io){
	var h = exigerPosteIle(io, "postconf");
	var cf = lireMainCfIle(h), params = cf.params;
	cf.avertissements.forEach(function(a){ io.err(a); });
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (args.indexOf("-e") > -1 || args.indexOf("-X") > -1 || args.indexOf("-#") > -1){
		if (!io.sudo) throw new ShellError("postconf: fatal: open /etc/postfix/main.cf for update: Permission denied" + astuce(io, "Changer main.cf est réservé à root : sudo postconf -e ..."), 1);
		var lignes = (lireIle(h, "/etc/postfix/main.cf") || "").replace(/\n$/, "").split("\n");
		var changes = [];
		mots.forEach(function(m){
			if (args.indexOf("-e") > -1){
				var x = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(m);
				if (!x) throw new ShellError("postconf: fatal: missing '=' after attribute name: \"" + m + "\"", 1);
				var vu = false;
				lignes = lignes.filter(function(l){
					var y = /^([A-Za-z0-9_]+)\s*=/.exec(l);
					if (y && y[1] === x[1]){ if (vu) return false; vu = true; }
					return true;
				}).map(function(l){ var y = /^([A-Za-z0-9_]+)\s*=/.exec(l); return y && y[1] === x[1] ? x[1] + " = " + x[2].trim() : l; });
				if (!vu) lignes.push(x[1] + " = " + x[2].trim());
				changes.push(x[1]);
			} else {
				var k = m.split("=")[0];
				lignes = lignes.map(function(l){ var y = /^([A-Za-z0-9_]+)\s*=/.exec(l); return y && y[1] === k ? (args.indexOf("-#") > -1 ? "#" + l : null) : l; }).filter(function(l){ return l !== null; });
				changes.push(k);
			}
		});
		ecrireFichierHote(h, "/etc/postfix/main.cf", lignes.join("\n") + "\n");
		evenementIle(h, "postconf", { action: "edit", params: changes });
		return "";
	}
	var defaut = args.indexOf("-d") > -1, seulementN = args.indexOf("-n") > -1, h1 = args.indexOf("-h") > -1;
	var noms = mots.length ? mots : (seulementN ? Object.keys(params) : Object.keys(DEFAUTS_POSTFIX).concat(Object.keys(params)).filter(function(k, i, t){ return t.indexOf(k) === i; }));
	noms.sort();
	var sortie = [];
	noms.forEach(function(k){
		var connu = DEFAUTS_POSTFIX.hasOwnProperty(k) || params.hasOwnProperty(k);
		if (!connu){ io.err("postconf: warning: " + k + ": unknown parameter"); return; }
		var v = defaut ? (k === "myhostname" ? h + "." + DOMAINE_ILE : (k === "mydomain" ? DOMAINE_ILE : DEFAUTS_POSTFIX[k] || "")) : valeurPostfixIle(h, params, k);
		if (seulementN && !params.hasOwnProperty(k)) return;
		sortie.push(h1 ? v : k + " = " + v);
	});
	evenementIle(h, "postconf", { action: seulementN ? "n" : (defaut ? "d" : "lire"), params: noms, avertissements: cf.avertissements.length });
	return sortie.join("\n");
};
/* Les contrôles de postfix check : les avertissements de main.cf, les droits de la file. */
function verifierPostfixIle(h){
	var cf = lireMainCfIle(h), l = cf.avertissements.slice();
	var params = cf.params;
	var myhostname = developperPostfixIle(h, params, valeurPostfixIle(h, params, "myhostname"));
	if (myhostname.indexOf(".") === -1) l.push("postfix/postfix-script: warning: myhostname " + myhostname + " is not a fully qualified domain name");
	return l;
}
Shell.sorts.postfix = function(args, io){
	var h = exigerPosteIle(io, "postfix");
	var ordre = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!ordre) throw new ShellError("postfix: fatal: usage: postfix [-c config_dir] [-Dv] command" + astuce(io, "Les ordres courants : check, status, start, stop, reload, flush."), 1);
	if (ordre !== "status" && !io.sudo) throw new ShellError("postfix: fatal: to submit mail, use the Postfix sendmail command\npostfix: fatal: the postfix command is reserved for the superuser" + astuce(io, "sudo postfix " + ordre), 1);
	evenementIle(h, "postfix", { ordre: ordre });
	switch (ordre){
		case "check":
			var l = verifierPostfixIle(h);
			evenementIle(h, "postfixCheck", { ok: !l.length, avertissements: l });
			return l.join("\n");
		case "status":
			if (!postfixTourne(h)){ io.code = 1; return "postfix/postfix-script: the Postfix mail system is not running"; }
			return "postfix/postfix-script: the Postfix mail system is running: PID: " + pidServiceIle(h, "postfix");
		case "reload":
			if (!postfixTourne(h)) throw new ShellError("postfix/postfix-script: fatal: the Postfix mail system is not running", 1);
			Shell.sorts.systemctl(["reload", "postfix"], io);
			return "postfix/postfix-script: refreshing the Postfix mail system";
		case "start":
			if (postfixTourne(h)) throw new ShellError("postfix/postfix-script: fatal: the Postfix mail system is already running", 1);
			Shell.sorts.systemctl(["start", "postfix"], io);
			return "postfix/postfix-script: starting the Postfix mail system";
		case "stop":
			if (!postfixTourne(h)) throw new ShellError("postfix/postfix-script: fatal: the Postfix mail system is not running", 1);
			Shell.sorts.systemctl(["stop", "postfix"], io);
			return "postfix/postfix-script: stopping the Postfix mail system";
		case "flush":
			if (!postfixTourne(h)) throw new ShellError("postqueue: fatal: Cannot flush mail queue - mail system is down", 69);
			viderFilePostfixIle(h);
			evenementIle(h, "flush", { reste: etatPostfixIle(h).file.length });
			return "";
		default:
			throw new ShellError("postfix: fatal: unknown command: '" + ordre + "'. Usage: postfix [-c config_dir] [-Dv] command", 1);
	}
};
/* Postfix démarre et recharge : la configuration de main.cf est lue à ce moment-là, et la file repart. */
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || !e.unite) return;
	if (e.unite === "postfix.service" && ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif))){
		chargerPostfixIle(e.hote);
		journalPosteIle(e.hote, "postfix/postfix-script", e.action === "reload" ? "refreshing the Postfix mail system" : "starting the Postfix mail system");
		journalPosteIle(e.hote, "postfix/master", e.action === "reload" ? "reload -- version 3.7.11, configuration /etc/postfix" : "daemon started -- version 3.7.11, configuration /etc/postfix");
	}
	if (e.unite === "dovecot.service" && ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif))){
		chargerDovecotIle(e.hote);
		journalPosteIle(e.hote, "dovecot", "master: Dovecot v2.3.19.1 (9b53102964) " + (e.action === "reload" ? "reloaded" : "starting up for imap"));
	}
});

/* ================================================================== */
/* Postfix : la file (mailq, postqueue, postsuper, postcat)            */
/* ================================================================== */

function texteFileIle(h){
	var p = etatPostfixIle(h);
	if (!p.file.length) return "Mail queue is empty";
	var lignes = ["-Queue ID-  --Size-- ----Arrival Time---- -Sender/Recipient-------"], total = 0;
	p.file.forEach(function(m){
		var d = dateIle(h, m.arrivee);
		var arrivee = JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds());
		lignes.push(completerDroite(m.id + (m.retenu ? "!" : ""), 11) + completerGauche(m.taille, 9) + " " + arrivee + "  " + m.de);
		if (m.raison) lignes.push(completerDroite("", 41) + "(" + m.raison + ")");
		m.a.forEach(function(a){ lignes.push(completerDroite("", 41) + a); });
		lignes.push("");
		total += m.taille;
	});
	lignes.push("-- " + Math.max(1, Math.round(total / 1024)) + " Kbytes in " + p.file.length + " Request" + (p.file.length > 1 ? "s" : "") + ".");
	return lignes.join("\n");
}
Shell.sorts.mailq = function(args, io){
	var h = exigerPosteIle(io, "mailq");
	evenementIle(h, "mailq", { taille: etatPostfixIle(h).file.length });
	return texteFileIle(h);
};
Shell.sorts.postqueue = function(args, io){
	var h = exigerPosteIle(io, "postqueue");
	if (args.indexOf("-p") > -1){ evenementIle(h, "mailq", { taille: etatPostfixIle(h).file.length }); return texteFileIle(h); }
	if (args.indexOf("-j") > -1) return etatPostfixIle(h).file.map(function(m){ return JSON.stringify({ queue_name: "deferred", queue_id: m.id, arrival_time: Math.floor(m.arrivee / 1000), message_size: m.taille, sender: m.de, recipients: m.a.map(function(a){ return { address: a, delay_reason: m.raison || "" }; }) }); }).join("\n");
	var f = args.indexOf("-f") > -1, i = optionIle(args, ["-i"]);
	if (!f && i === null) throw new ShellError("postqueue: fatal: usage: postqueue -f | postqueue -i queueid | postqueue -j | postqueue -p | postqueue -s site", 64);
	if (!postfixTourne(h)) throw new ShellError("postqueue: fatal: Cannot flush mail queue - mail system is down" + astuce(io, "Postfix ne tourne pas : sudo systemctl start postfix."), 69);
	var avant = etatPostfixIle(h).file.length;
	viderFilePostfixIle(h, i || null);
	evenementIle(h, "flush", { avant: avant, reste: etatPostfixIle(h).file.length });
	return "";
};
Shell.sorts.postsuper = function(args, io){
	var h = exigerPosteIle(io, "postsuper");
	if (!io.sudo) throw new ShellError("postsuper: fatal: use of this command is reserved for the superuser", 1);
	var p = etatPostfixIle(h), d = optionIle(args, ["-d"]), r = optionIle(args, ["-r"]), hold = optionIle(args, ["-h"]), lib = optionIle(args, ["-H"]);
	function choisir(v){ return v === "ALL" ? p.file.slice() : p.file.filter(function(m){ return m.id === v; }); }
	if (d !== null){
		var l = choisir(d);
		p.file = p.file.filter(function(m){ return l.indexOf(m) === -1; });
		l.forEach(function(m){ journalPosteIle(h, "postfix/postsuper", m.id + ": removed"); });
		p.supprimes = (p.supprimes || []).concat(l.map(function(m){ return copieJson(m); }));
		evenementIle(h, "postsuper", { action: "delete", ids: l.map(function(m){ return m.id; }) });
		return l.length ? "postsuper: Deleted: " + l.length + " message" + (l.length > 1 ? "s" : "") : "";
	}
	if (r !== null){ var lr = choisir(r); lr.forEach(function(m){ m.essais = 0; }); return lr.length ? "postsuper: Requeued: " + lr.length + " message" + (lr.length > 1 ? "s" : "") : ""; }
	if (hold !== null){ var lh = choisir(hold); lh.forEach(function(m){ m.retenu = true; }); return lh.length ? "postsuper: Placed on hold: " + lh.length + " message" + (lh.length > 1 ? "s" : "") : ""; }
	if (lib !== null){ var ll = choisir(lib); ll.forEach(function(m){ m.retenu = false; }); return ll.length ? "postsuper: Released from hold: " + ll.length + " message" + (ll.length > 1 ? "s" : "") : ""; }
	throw new ShellError("postsuper: fatal: usage: postsuper [-c config_dir] [-d queue_id (delete)] [-h queue_id (hold)] [-H queue_id (un-hold)] [-p (purge temporary files)] [-r queue_id (requeue)] [-s (structure fix)] [-S (structure fix)] [-v (verbose)] [queue...]", 1);
};
Shell.sorts.postcat = function(args, io){
	var h = exigerPosteIle(io, "postcat");
	if (!io.sudo) throw new ShellError("postcat: fatal: open queue file " + (optionIle(args, ["-q"]) || "") + ": Permission denied", 1);
	var id = optionIle(args, ["-q"]);
	var m = etatPostfixIle(h).file.filter(function(x){ return x.id === id; })[0];
	if (!m) throw new ShellError("postcat: fatal: open queue file " + id + ": No such file or directory", 1);
	evenementIle(h, "postcat", { id: id });
	return "*** ENVELOPE RECORDS deferred/" + id.charAt(0) + "/" + id + " ***\nmessage_size:             " + m.taille + "             " + m.taille + "               1               0             " + m.taille + "               0\n" +
		"message_arrival_time: " + dateDigIle(h) + "\nsender: " + m.de + "\n" + m.a.map(function(a){ return "original_recipient: " + a + "\nrecipient: " + a; }).join("\n") +
		"\n*** MESSAGE CONTENTS deferred/" + id.charAt(0) + "/" + id + " ***\n" + texteMessageIle(h, m, m.a[0]) + "\n*** HEADER EXTRACTED deferred/" + id.charAt(0) + "/" + id + " ***\n*** MESSAGE FILE END deferred/" + id.charAt(0) + "/" + id + " ***";
};

/* ================================================================== */
/* L'envoi : mail, sendmail                                             */
/* ================================================================== */

function expediteurIle(h, io){
	var params = lireMainCfIle(h).params;
	var origine = valeurPostfixIle(h, params, "myorigin");
	if (/^\//.test(origine)) origine = (lireIle(h, origine) || "").split("\n")[0].trim() || h;
	else origine = developperPostfixIle(h, params, origine);
	return (io.sudo ? "root" : JOUEUR) + "@" + origine;
}
Shell.sorts.mail = function(args, io){
	var h = exigerPosteIle(io, "mail");
	var sujet = optionIle(args, ["-s"]), de = optionIle(args, ["-r"]);
	var dests = argumentsIle(args, ["-s", "-r", "-a", "-c", "-b", "-A"]);
	if (!dests.length){
		var boite = "/var/mail/" + JOUEUR;
		if (dossierHote(h, boite)) return "No mail for " + JOUEUR + astuce(io, "mail ne lit que les boîtes mbox. La tienne est un Maildir (/var/mail/" + JOUEUR + "/new) : Dovecot la lit (doveadm fetch, ou un client IMAP).");
		return "No mail for " + JOUEUR;
	}
	var envoyer = function(corps){
		var a = dests.map(function(d){ return d.indexOf("@") > -1 ? d : d + "@" + DOMAINE_ILE; });
		var id = deposerMessageIle(h, { de: de || expediteurIle(h, io), a: a, sujet: sujet || "", corps: String(corps || "").replace(/\n$/, ""), uid: io.sudo ? 0 : 1000 });
		return id;
	};
	if (io.stdin !== null){ envoyer(io.stdin); return ""; }
	if (!io.tty || !term || !term.demander){ envoyer(""); return ""; }
	var suite = function(s){
		sujet = s;
		term.demander("(Le texte du message, sur une ligne : il part dès que tu appuies sur Entrée.) ", false, function(corps){ envoyer(corps); term.echo("EOT"); Shell.fin(); });
	};
	if (sujet === null) term.demander("Subject: ", false, suite);
	else suite(sujet);
	return "";
};
Shell.sorts.sendmail = function(args, io){
	var h = exigerPosteIle(io, "sendmail");
	if (args.indexOf("-bp") > -1) return Shell.sorts.mailq([], io);
	var de = optionIle(args, ["-f"]);
	var dests = argumentsIle(args, ["-f", "-F", "-o", "-B", "-N", "-R", "-V", "-X", "-C"]);
	var texte = io.stdin !== null ? io.stdin : "";
	var parties = texte.split(/\n\s*\n/), entete = /^[A-Za-z-]+:/.test(texte) ? parties.shift() : "";
	var corps = parties.join("\n\n");
	var champ = function(nom){ var m = new RegExp("^" + nom + ":\\s*(.*)$", "im").exec(entete); return m ? m[1].trim() : null; };
	if (args.indexOf("-t") > -1){
		["To", "Cc", "Bcc"].forEach(function(n){ var v = champ(n); if (v) v.split(",").forEach(function(x){ var y = /<([^>]+)>/.exec(x); dests.push((y ? y[1] : x).trim()); }); });
	}
	if (!dests.length) throw new ShellError("sendmail: fatal: " + JOUEUR + "(1000): No recipient addresses found in message header", 75);
	var a = dests.map(function(d){ return d.indexOf("@") > -1 ? d : d + "@" + DOMAINE_ILE; });
	var from = champ("From");
	deposerMessageIle(h, { de: de || (from ? ((/<([^>]+)>/.exec(from) || [])[1] || from) : expediteurIle(h, io)), a: a, sujet: champ("Subject") || "", corps: corps, uid: io.sudo ? 0 : 1000 });
	return "";
};

/* ================================================================== */
/* Dovecot : la configuration                                           */
/* ================================================================== */

var CLES_DOVECOT = ["protocols", "listen", "mail_location", "mail_privileged_group", "mail_uid", "mail_gid", "first_valid_uid", "last_valid_uid", "mail_plugins",
	"ssl", "ssl_cert", "ssl_key", "ssl_ca", "ssl_dh", "ssl_client_ca_dir", "ssl_min_protocol", "ssl_cipher_list", "ssl_prefer_server_ciphers",
	"disable_plaintext_auth", "auth_mechanisms", "auth_username_format", "auth_verbose", "auth_debug", "log_path", "info_log_path", "mail_debug",
	"postmaster_address", "hostname", "lda_mailbox_autocreate", "lda_mailbox_autosubscribe", "recipient_delimiter", "namespace", "mailbox", "inbox", "separator", "prefix",
	"port", "address", "mode", "user", "group", "driver", "args", "default_fields", "override_fields", "special_use", "auto", "sieve", "sieve_dir", "sieve_before",
	"sieve_after", "sieve_global", "sieve_extensions", "default_process_limit", "default_client_limit", "process_limit", "vsz_limit", "service_count", "login_greeting",
	"submission_host", "quota", "quota_rule", "mail_max_userip_connections", "imap_idle_notify_interval", "verbose_ssl", "login_trusted_networks", "mail_home", "base_dir"];
/*
 * La configuration de Dovecot, comme doveconf la lit : { reglages: { "ssl": "yes", "plugin/sieve": "..." }, lignes: { cle: "fichier:ligne" }, erreur }.
 * Les sections (service imap-login { ... }) donnent des clés préfixées (« service imap-login/inet_listener imap/port »).
 */
function configDovecotIle(h){
	var r = { reglages: {}, lignes: {}, erreur: null };
	function lire(chemin, profondeur, essai){
		if (profondeur > 6 || r.erreur) return;
		var texte = lireIle(h, chemin);
		if (texte === null){ if (!essai) r.erreur = "doveconf: Fatal: Error in configuration file " + chemin + ": No such file or directory"; return; }
		var pile = [];
		texte.split("\n").forEach(function(brute, i){
			if (r.erreur) return;
			var l = brute.replace(/(^|\s)#.*$/, "").trim();
			if (!l) return;
			var ou = chemin + " line " + (i + 1);
			var inc = /^!include(_try)?\s+(\S+)$/.exec(l);
			if (inc){
				var motif = inc[2].charAt(0) === "/" ? inc[2] : dossierDe(chemin) + "/" + inc[2];
				var dossier = dossierDe(motif), nomMotif = nomDe(motif);
				if (/\*/.test(nomMotif)){
					var re = new RegExp("^" + nomMotif.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
					fichiersDuDossier(h, dossier).filter(function(f){ return re.test(f.nom); }).forEach(function(f){ lire(f.chemin, profondeur + 1, true); });
				} else lire(motif, profondeur + 1, !!inc[1]);
				return;
			}
			if (l === "}"){ if (!pile.length){ r.erreur = "doveconf: Fatal: Error in configuration file " + ou + ": Unexpected '}'"; return; } pile.pop(); return; }
			var sec = /^([A-Za-z_]+)(?:\s+([^{=]*?))?\s*\{$/.exec(l);
			if (sec){ pile.push(sec[1] + (sec[2] ? " " + sec[2].trim() : "")); return; }
			var kv = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(l);
			if (!kv){ r.erreur = "doveconf: Fatal: Error in configuration file " + ou + ": Expecting '='"; return; }
			if (CLES_DOVECOT.indexOf(kv[1]) === -1 && !(pile.length && /^plugin/.test(pile[0]))){ r.erreur = "doveconf: Fatal: Error in configuration file " + ou + ": Unknown setting: " + kv[1]; return; }
			var cle = pile.concat([kv[1]]).join("/"), valeur = kv[2].trim();
			if (kv[1] === "protocols" && /\$protocols/.test(valeur)) valeur = valeur.replace(/\$protocols/, r.reglages.protocols || "").trim();
			if (/^mail_plugins$/.test(kv[1]) && /\$mail_plugins/.test(valeur)) valeur = valeur.replace(/\$mail_plugins/, r.reglages.mail_plugins || "").trim();
			if (/^</.test(valeur)){
				var f = valeur.substring(1).trim();
				if (lireIle(h, f) === null){ r.erreur = "doveconf: Fatal: Error in configuration file " + ou + ": " + kv[1] + ": Can't open file " + f + ": No such file or directory"; return; }
			}
			r.reglages[cle] = valeur;
			r.lignes[cle] = ou;
		});
		if (pile.length && !r.erreur) r.erreur = "doveconf: Fatal: Error in configuration file " + chemin + ": Missing '}'";
	}
	lire("/etc/dovecot/dovecot.conf", 0, false);
	return r;
}
function etatDovecotIle(h){ var e = etatIle(h); if (!e.dovecot || typeof e.dovecot !== "object") e.dovecot = {}; return e.dovecot; }
function chargerDovecotIle(h){ var c = configDovecotIle(h); var d = etatDovecotIle(h); if (!c.erreur){ d.charge = copieJson(c.reglages); d.chargeA = maintenantMachine(h); } return c; }
function reglagesDovecotIle(h){ var d = etatDovecotIle(h); return d.charge || chargerDovecotIle(h).reglages || {}; }
function dovecotTourne(h){ return serviceActifIle(h, "dovecot"); }
controleAvantDemarrage(function(h, unite, action){
	if (!estHoteIle(h) || unite !== "dovecot.service") return null;
	var c = configDovecotIle(h);
	if (!c.erreur) return null;
	journalPosteIle(h, "dovecot", c.erreur.replace(/^doveconf: /, ""), 2);
	return c.erreur;
});
var DEFAUTS_DOVECOT = { protocols: "imap pop3 lmtp", mail_location: "", ssl: "yes", disable_plaintext_auth: "yes", auth_mechanisms: "plain", listen: "*, ::" };
Shell.sorts.doveconf = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/etc/dovecot/dovecot.conf")) throw new ShellError("doveconf: command not found", 127);
	var c = configDovecotIle(h);
	if (c.erreur){ io.code = 89; evenementIle(h, "doveconf", { ok: false, erreur: c.erreur }); throw new ShellError(c.erreur, 89); }
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	evenementIle(h, "doveconf", { ok: true, n: args.indexOf("-n") > -1, cles: mots });
	if (mots.length){
		return mots.map(function(k){
			var v = c.reglages.hasOwnProperty(k) ? c.reglages[k] : DEFAUTS_DOVECOT[k];
			if (v === undefined){ io.code = 1; return "doveconf: Fatal: Unknown setting: " + k; }
			return args.indexOf("-h") > -1 ? v : k + " = " + v;
		}).join("\n");
	}
	var lignes = ["# 2.3.19.1 (9b53102964): /etc/dovecot/dovecot.conf", "# Pigeonhole version 0.5.19 (4eae2f79)", "# OS: Linux " + versionNoyau(h) + " x86_64 Debian 12.7", "# Hostname: " + h];
	var simples = Object.keys(c.reglages).filter(function(k){ return k.indexOf("/") === -1; }).sort();
	simples.forEach(function(k){ lignes.push(k + " = " + c.reglages[k]); });
	var sections = {};
	Object.keys(c.reglages).filter(function(k){ return k.indexOf("/") > -1; }).forEach(function(k){ var p = k.split("/"); var s = p.slice(0, -1).join(" { ") ; (sections[s] = sections[s] || []).push([p[p.length - 1], c.reglages[k], p.length - 1]); });
	Object.keys(sections).sort().forEach(function(s){
		var n = s.split(" { ").length;
		lignes.push(s + " {");
		sections[s].forEach(function(x){ lignes.push("  " + x[0] + " = " + x[1]); });
		lignes.push(new Array(n + 1).join("}").split("").join("\n"));
	});
	return lignes.join("\n");
};

/* ================================================================== */
/* Dovecot : les boîtes                                                 */
/* ================================================================== */

/* Où sont les boîtes d'un compte, selon mail_location : { type: "maildir" | "mbox", chemin, inbox }. */
function emplacementBoitesIle(h, compte, reglages){
	var loc = (reglages || reglagesDovecotIle(h)).mail_location || "";
	var dev = function(t){ return String(t).replace(/%u|%n/g, compte.nom).replace(/%d/g, "").replace(/%h/g, compte.home).replace(/^~/, compte.home); };
	var m;
	if ((m = /^maildir:([^:]+)/.exec(loc))) return { type: "maildir", chemin: dev(m[1]) };
	if ((m = /^mbox:([^:]+)(?::INBOX=([^:]+))?/.exec(loc))) return { type: "mbox", chemin: dev(m[1]), inbox: m[2] ? dev(m[2]) : "/var/mail/" + compte.nom };
	// Sans réglage : Dovecot cherche tout seul (~/Maildir, puis /var/mail/NOM en mbox).
	if (dossierHote(h, compte.home + "/Maildir")) return { type: "maildir", chemin: compte.home + "/Maildir" };
	return { type: "mbox", chemin: compte.home + "/mail", inbox: "/var/mail/" + compte.nom };
}
/* Les dossiers et les messages d'un compte, ou une erreur comme doveadm l'écrit. */
function boitesIle(h, compte, io){
	var e = emplacementBoitesIle(h, compte);
	var refus = function(chemin){
		var d = dossierHote(h, chemin);
		if (!d) return null;
		if (d.owner !== compte.nom && d.owner !== String(compte.uid)) return "Error: stat(" + chemin + "/cur) failed: Permission denied (euid=" + compte.uid + "(" + compte.nom + ") egid=" + compte.gid + "(" + compte.nom + ") missing +x perm: " + chemin + ", dir owned by 0:8 mode=" + modeOctal(d.mode).substring(1) + ")";
		return null;
	};
	if (e.type === "mbox"){
		if (dossierHote(h, e.inbox)) return { erreur: "Error: Syncing mailbox 'INBOX' failed: Mailbox INBOX: mbox file " + e.inbox + " is actually a directory" };
		var f = fichierHote(h, e.inbox);
		var msgs = f ? f.getText().split(/\n(?=From )/).filter(function(x){ return /^From /.test(x); }).map(function(x, i){ return { nom: "mbox-" + i, texte: x.replace(/^From .*\n/, ""), nouveau: true }; }) : [];
		return { type: "mbox", boites: { INBOX: msgs } };
	}
	var err = refus(e.chemin);
	if (err) return { erreur: err };
	var racine = dossierHote(h, e.chemin), boites = { INBOX: [] };
	if (!racine) return { type: "maildir", boites: boites, chemin: e.chemin };
	var lireDossier = function(d){
		var l = [];
		["new", "cur"].forEach(function(s){ var x = d.getChildFromName(s); if (x !== -1) x.items.forEach(function(it){ l.push({ nom: it.itemname, texte: it.getText(), nouveau: s === "new", item: it }); }); });
		return l;
	};
	boites.INBOX = lireDossier(racine);
	racine.children.forEach(function(c){ if (c.parents[0] === racine && /^\./.test(c.room_name) && c.room_name !== "." && c.room_name !== "..") boites[c.room_name.substring(1)] = lireDossier(c); });
	return { type: "maildir", boites: boites, chemin: e.chemin };
}
function enteteMessageIle(texte, nom){
	var tete = String(texte).split(/\n\n/)[0];
	var m = new RegExp("^" + nom + ":\\s*(.*)$", "im").exec(tete);
	return m ? m[1] : "";
}
function compteDoveadmIle(h, args, io){
	var u = optionIle(args, ["-u"]);
	if (!u) u = JOUEUR;
	if (u !== JOUEUR && !io.sudo) throw new ShellError("doveadm(" + u + "): Fatal: Couldn't drop privileges: setgid(" + (comptePourIle(h, u) || { gid: 0 }).gid + ") failed: Operation not permitted" + astuce(io, "Lire la boîte d'un autre compte est réservé à root : sudo doveadm ..."), 75);
	var c = comptePourIle(h, u);
	if (!c) throw new ShellError("doveadm(" + u + "): Error: User doesn't exist\nuserdb lookup: user " + u + " doesn't exist", 67);
	return c;
}
Shell.sorts.doveadm = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/etc/dovecot/dovecot.conf")) throw new ShellError("doveadm: command not found", 127);
	var mots = argumentsIle(args, ["-u", "-A", "-F", "-o"]);
	var ordre = mots[0], sous = mots[1];
	if (!ordre) throw new ShellError("usage: doveadm [-Dv] [-f <formatter>] <command> [<args>]\n\n  auth          cache flush|test|lookup\n  fetch         [-u <user>|-A] <fields> <search query>\n  mailbox       list|create|delete|rename|status ...\n  reload\n  search        [-u <user>|-A] <search query>\n  sieve         list|put|get|activate|deactivate|delete ...\n  stop\n  user          [-a <userdb socket path>] [-x <auth info>] [-f field] [-m] <user mask> [...]", 64);
	if (ordre === "reload" || ordre === "stop"){
		if (!io.sudo) throw new ShellError("doveadm(" + JOUEUR + "): Error: master: Couldn't send command to master: Permission denied", 75);
		Shell.sorts.systemctl([ordre === "reload" ? "reload" : "stop", "dovecot"], io);
		return "";
	}
	if (ordre === "sieve" && typeof doveadmSieveIle === "function") return doveadmSieveIle(h, mots.slice(1), args, io);
	if (!dovecotTourne(h) && ordre !== "user") throw new ShellError("doveadm(" + (optionIle(args, ["-u"]) || JOUEUR) + "): Error: Couldn't connect to /run/dovecot/doveadm-server: No such file or directory" + astuce(io, "Dovecot ne tourne pas : sudo systemctl start dovecot (journalctl -u dovecot dit pourquoi il s'est arrêté)."), 75);
	if (ordre === "user"){
		var nom = mots[1] || JOUEUR;
		if (!io.sudo && nom !== JOUEUR) throw new ShellError("doveadm(" + JOUEUR + "): Error: userdb lookup failed: Permission denied", 75);
		var c = comptePourIle(h, nom);
		evenementIle(h, "doveadm", { ordre: "user", compte: nom, ok: !!c });
		if (!c){ io.code = 67; return "userdb lookup: user " + nom + " doesn't exist"; }
		return "field\tvalue\nuid\t" + c.uid + "\ngid\t" + c.gid + "\nhome\t" + c.home + "\nsystem_groups_user\t" + c.nom;
	}
	var compte = compteDoveadmIle(h, args, io);
	var b = boitesIle(h, compte, io);
	if (b.erreur){ evenementIle(h, "doveadm", { ordre: ordre, sous: sous, compte: compte.nom, ok: false, erreur: b.erreur }); throw new ShellError("doveadm(" + compte.nom + "): " + b.erreur, 75); }
	if (ordre === "mailbox"){
		if (sous === "list"){ evenementIle(h, "doveadm", { ordre: "mailbox", sous: "list", compte: compte.nom, ok: true, boites: Object.keys(b.boites) }); return Object.keys(b.boites).join("\n"); }
		if (sous === "status"){
			var champs = (mots[2] || "messages").split(/\s+/), nomBoite = mots[3] || "INBOX";
			var l = b.boites[nomBoite];
			if (!l) throw new ShellError("doveadm(" + compte.nom + "): Error: Mailbox " + nomBoite + ": Failed to get mailbox status: Mailbox doesn't exist: " + nomBoite, 68);
			evenementIle(h, "doveadm", { ordre: "mailbox", sous: "status", compte: compte.nom, ok: true, messages: l.length });
			return champs.map(function(c){ return c + "=" + (c === "messages" ? l.length : (c === "unseen" || c === "recent" ? l.filter(function(x){ return x.nouveau; }).length : (c === "vsize" ? l.reduce(function(s, x){ return s + x.texte.length; }, 0) : 0))); }).join(" ");
		}
		if (sous === "create"){
			if (!mots[2]) throw new ShellError("doveadm mailbox create: Missing mailbox name", 64);
			if (b.type === "maildir") moteurSeul(function(){ ["", "/new", "/cur", "/tmp"].forEach(function(s){ creerDossierHote(h, b.chemin + "/." + mots[2] + s, { owner: compte.nom, mode: "rwx------" }); }); });
			return "";
		}
		throw new ShellError("doveadm mailbox: unknown command: " + (sous || ""), 64);
	}
	if (ordre === "fetch" || ordre === "search"){
		var reste = mots.slice(ordre === "fetch" ? 2 : 1);
		var champsF = ordre === "fetch" ? (mots[1] || "").split(/\s+/) : [];
		var boite = "INBOX", filtres = [];
		for (var i = 0; i < reste.length; i++){
			var r = reste[i].toLowerCase();
			if (r === "mailbox"){ boite = reste[++i]; continue; }
			if (r === "all") continue;
			if (r === "subject" || r === "from" || r === "to" || r === "body" || r === "text"){ filtres.push([r, reste[++i] || ""]); continue; }
			if (r === "unseen" || r === "new"){ filtres.push(["unseen"]); continue; }
			if (r === "seen"){ filtres.push(["seen"]); continue; }
		}
		var liste = b.boites[boite];
		if (!liste) throw new ShellError("doveadm(" + compte.nom + "): Error: Mailbox " + boite + ": Mailbox doesn't exist: " + boite, 68);
		var choisis = liste.filter(function(x){
			return filtres.every(function(f){
				if (f[0] === "unseen") return x.nouveau;
				if (f[0] === "seen") return !x.nouveau;
				var cible = f[0] === "body" || f[0] === "text" ? x.texte : enteteMessageIle(x.texte, f[0]);
				return cible.toLowerCase().indexOf(f[1].toLowerCase()) > -1;
			});
		});
		evenementIle(h, "doveadm", { ordre: ordre, compte: compte.nom, ok: true, boite: boite, nombre: choisis.length, sujets: choisis.map(function(x){ return enteteMessageIle(x.texte, "Subject"); }), champs: champsF });
		if (ordre === "search") return choisis.map(function(x, k){ return hexDe("guid:" + x.nom, 32) + " " + (k + 1); }).join("\n");
		if (!champsF.length || !champsF[0]) throw new ShellError("doveadm fetch: Missing fields parameter", 64);
		return choisis.map(function(x, k){
			return champsF.map(function(c){
				var cc = c.toLowerCase();
				if (cc === "hdr") return "hdr:\n" + x.texte.split(/\n\n/)[0];
				if (cc === "body") return "body:\n" + x.texte.split(/\n\n/).slice(1).join("\n\n");
				if (cc === "text") return "text:\n" + x.texte;
				if (cc === "uid") return "uid: " + (k + 1);
				if (cc === "flags") return "flags: " + (x.nouveau ? "\\Recent" : "\\Seen");
				if (cc === "mailbox") return "mailbox: " + boite;
				if (cc === "guid") return "guid: " + hexDe("guid:" + x.nom, 32);
				if (/^hdr\./.test(cc)) return cc + ": " + enteteMessageIle(x.texte, c.substring(4));
				if (cc === "date.received" || cc === "date.saved") return cc + ": " + enteteMessageIle(x.texte, "Date");
				return cc + ": ";
			}).join("\n");
		}).join("\n\f\n");
	}
	throw new ShellError("doveadm: Unknown command '" + ordre + "'", 64);
};
/* Dovecot livre lui-même (dovecot-lda, appelé par Postfix) : la boîte de mail_location, et Sieve s'il est branché. */
function livrerDovecotIle(h, compte, msg, texte){
	var reglages = reglagesDovecotIle(h);
	var e = emplacementBoitesIle(h, compte, reglages);
	var dossier = "INBOX", reponse = null;
	if (/sieve/.test(reglages["protocol lda/mail_plugins"] || reglages.mail_plugins || "") && typeof appliquerSieveIle === "function"){
		var s = appliquerSieveIle(h, compte, msg, texte, reglages);
		if (s){ dossier = s.dossier || "INBOX"; reponse = s.reponse || null; if (s.journal) journalPosteIle(h, "dovecot-lda", "lda(" + compte.nom + ")<" + (2240 + state.nbCommandes % 99) + "><" + hexDe("sess" + msg.id, 8) + ">: sieve: " + s.journal); }
	}
	if (e.type !== "maildir"){
		if (dossierHote(h, e.inbox)) return { ok: false, raison: "Mailbox INBOX: mbox file " + e.inbox + " is actually a directory" };
		moteurSeul(function(){ var it = fichierHote(h, e.inbox) || poserFichierHote(h, e.inbox, "", { owner: compte.nom, mode: "rw-------" }); it.setText((it.getText() ? it.getText() + "\n\n" : "") + "From " + msg.de + " " + dateDigIle(h) + "\n" + texte); });
	} else rangerMaildirIle(h, e.chemin, msg, texte, compte.nom, dossier === "INBOX" ? null : dossier);
	journalPosteIle(h, "dovecot-lda", "lda(" + compte.nom + ")<" + (2240 + state.nbCommandes % 99) + "><" + hexDe("sess" + msg.id, 8) + ">: msgid=<" + msg.id.toLowerCase() + "@" + h + "." + DOMAINE_ILE + ">: saved mail to " + dossier);
	if (reponse) deposerMessageIle(h, reponse);
	return { ok: true };
}

/* ================================================================== */
/* DKIM : opendkim-genkey                                               */
/* ================================================================== */

function pDkimIle(selecteur, domaine, graine){
	var b = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA" + btoa(hexDe("dkim:" + selecteur + ":" + domaine + ":" + graine, 240).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); })).replace(/=+$/, "").replace(/[+/]/g, "A");
	return b.substring(0, 388) + "IDAQAB";
}
Shell.sorts["opendkim-genkey"] = function(args, io){
	var h = ileIci();
	if (!h || !dossierHote(h, "/etc/opendkim")) throw new ShellError("opendkim-genkey: command not found", 127);
	var sel = optionIle(args, ["-s", "--selector"]) || "default", dom = optionIle(args, ["-d", "--domain"]) || "example.com", dir = optionIle(args, ["-D", "--directory"]) || ".";
	var bits = +(optionIle(args, ["-b", "--bits"]) || 2048);
	if (bits < 1024) throw new ShellError("opendkim-genkey: key size " + bits + " too small (minimum 1024)", 1);
	var graine = String(state.nbCommandes) + ":" + Math.floor(alea("dkim-" + state.nbCommandes) * 1e6);
	var p = pDkimIle(sel, dom, graine);
	var morceaux = [];
	for (var i = 0; i < p.length; i += 250) morceaux.push(p.substring(i, i + 250));
	var txt = sel + "._domainkey\tIN\tTXT\t( \"v=DKIM1; h=sha256; k=rsa; \"\n\t  \"p=" + morceaux.join("\"\n\t  \"") + "\" )  ; ----- DKIM key " + sel + " for " + dom + "\n";
	var base = dir.replace(/\/$/, "") + "/";
	ecrireFichier(base + sel + ".private", "-----BEGIN RSA PRIVATE KEY-----\n" + btoa(hexDe("dkim-prive:" + p, 96)).substring(0, 64) + "\n(clé privée DKIM, " + bits + " bits)\n-----END RSA PRIVATE KEY-----\n", io, "opendkim-genkey", { mode: "rw-------" });
	ecrireFichier(base + sel + ".txt", txt, io, "opendkim-genkey", { mode: "rw-------" });
	var e = etatIle(h);
	e.dkim = e.dkim || {};
	e.dkim[sel + "." + dom] = p;
	evenementIle(h, "opendkim-genkey", { selecteur: sel, domaine: dom, p: p });
	return "";
};
/* Une clé DKIM publiée correspond-elle à une clé fabriquée sur la Poste ? */
function cleDkimFabriqueeIle(h, p){
	var e = etatIle(h);
	return Object.keys(e.dkim || {}).some(function(k){ return e.dkim[k] === p; });
}
