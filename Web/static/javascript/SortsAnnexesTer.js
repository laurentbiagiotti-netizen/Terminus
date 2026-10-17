/**
 * SortsAnnexesTer.js : les sorts des quêtes annexes du chapitre 5 (le Bastion). Strictement défensifs.
 *
 * Comme SortsAnnexes.js : aucune étape ni aucun défi d'un chapitre ne les enseigne. Pages de manuel hors barème.
 *
 *  - la clé des machines : ssh-keyscan (-t, -p, -H), ssh-keygen -F, -R (known_hosts, et sa copie .old) ;
 *  - les certificats SSH : ssh-keygen -s CA -I ID -n PRINCIPAUX -V VALIDITÉ -z SÉRIE CLÉ.pub, ssh-keygen -L -f CERTIFICAT ;
 *  - la qualité des mots de passe : pwscore, selon /etc/security/pwquality.conf (minlen, minclass, maxrepeat, dictcheck...) ;
 *  - le greffier de sudo : Defaults log_output enregistre chaque session lancée avec sudo, sudoreplay -l et sudoreplay ID ;
 *  - le chiffrement d'un fichier : openssl enc -aes-256-cbc (-pbkdf2, -iter, -salt, -a, -in, -out, -pass, -d), et cmp.
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   axKeyscan { hotes, sortie }   axKnownHosts { action, hote, trouve }   axCertificat { action, item, ca, principaux }
 *   axPwscore { ok, score, raison, config }   axSudoreplay { action, tsid, sortie }   axSudoIo { tsid, commande }
 *   axChiffre { sens, item, pbkdf2, algo, ok }   axCmp { a, b, identiques }
 */

World.fige = false;

if (typeof PROPRIETES_SAUVEGARDEES !== "undefined"){
	["axCert", "axChiffre"].forEach(function(k){ if (PROPRIETES_SAUVEGARDEES.indexOf(k) === -1) PROPRIETES_SAUVEGARDEES.push(k); });
}
/* La date affichée par les outils (l'heure de la machine où l'on est, sinon l'heure réelle). */
function axMaintenant(){
	var h = Shell.hote();
	try { if (typeof estMachine === "function" && estMachine(h)) return maintenantMachine(h); } catch (e){}
	try { if (typeof maintenantBastion === "function" && h === "bastion") { var b = maintenantBastion(); if (b instanceof Date) return b.getTime(); if (typeof b === "number") return b; } } catch (e){}
	return Date.now();
}
function axIso(ms){ var d = new Date(ms); return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + "T" + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); }
/* L'empreinte d'une clé publique : celle du blob s'il se lit en base64, sinon celle du texte (une clé fabriquée par le jeu). */
function axEmpreinteSouple(ligne){
	var e = axEmpreinteCle(ligne);
	if (e) return e;
	var m = /^(\S+)\s+(\S+)/.exec(String(ligne || "").trim());
	return "SHA256:" + axBase64(axSha256(axOctetsTexte(m ? m[2] : String(ligne)))).replace(/=+$/, "");
}

/* ================================================================== */
/* ssh-keyscan, ssh-keygen -F et -R                                    */
/* ================================================================== */

Shell.sorts["ssh-keyscan"] = function(args, io){
	var types = null, port = "22", hacher = false, hotes = [];
	for (var k = 0; k < args.length; k++){
		var a = args[k];
		if (a === "-t"){ types = String(args[++k] || "").split(","); continue; }
		if (a === "-p"){ port = args[++k]; continue; }
		if (a === "-H"){ hacher = true; continue; }
		if (a === "-T"){ k++; continue; }
		if (/^-[46cDqv]+$/.test(a)) continue;
		if (/^-/.test(a)) throw new ShellError("unknown option -- " + a.replace(/^-+/, "").charAt(0) + "\nusage: ssh-keyscan [-46cDHv] [-f file] [-O option] [-p port] [-T timeout]\n                   [-t type] [host | addrlist namelist]", 1);
		hotes.push(a);
	}
	if (!hotes.length) throw new ShellError("usage: ssh-keyscan [-46cDHv] [-f file] [-O option] [-p port] [-T timeout]\n                   [-t type] [host | addrlist namelist]", 1);
	var ici = Shell.hote(), sortie = [];
	hotes.forEach(function(nom){
		var h = trouverHote(nom);
		if (!h){ io.err("getaddrinfo " + nom + ": Name or service not known"); io.code = 1; return; }
		var x = HOTES[h];
		if (x.axSsh && (!axJoignable(h, ici) || String(x.axPort || 22) !== String(port))){ io.code = 1; return; }
		if (!x.axSsh && !(x.ports || {})[port] && h !== "bastion"){ io.code = 1; return; }
		if (types && types.indexOf("ed25519") === -1) return;
		io.err("# " + nom + ":" + port + " SSH-2.0-OpenSSH_9.2p1 Debian-2+deb12u3");
		var cle = axCleHote(h);
		var etiquette = port === "22" ? nom : "[" + nom + "]:" + port;
		if (hacher) etiquette = axHacherNom(etiquette, axBase64(axOctetsAlea("hache-" + nom + "-" + state.nbCommandes, 20)));
		sortie.push(etiquette + " " + cle);
	});
	var texte = sortie.join("\n");
	GameEvents.fire({ type: "axKeyscan", hotes: hotes, sortie: texte, de: ici });
	return texte;
};

function axCheminKnownHosts(f){ return f || "~/.ssh/known_hosts"; }
function axAfficheKh(f){ return f ? f : axCheminMaison() + "/.ssh/known_hosts"; }
function axKeygenF(nom, fichier, io){
	var it = axLireFichierSsh(axCheminKnownHosts(fichier));
	if (!it) throw new ShellError("do_known_hosts: hostkeys_foreach failed for " + axAfficheKh(fichier) + ": No such file or directory", 255);
	var lignes = lignesDe(it.getText()), sortie = [];
	lignes.forEach(function(l, k){ if (axLigneKnownHosts(l, [nom])) sortie.push("# Host " + nom + " found: line " + (k + 1) + " ", l); });
	GameEvents.fire({ type: "axKnownHosts", action: "F", hote: trouverHote(nom) || nom, trouve: sortie.length > 0 });
	if (!sortie.length){ io.code = 1; return ""; }
	return sortie.join("\n");
}
function axKeygenR(nom, fichier, io){
	var chemin = axCheminKnownHosts(fichier), it = axLireFichierSsh(chemin);
	if (!it) throw new ShellError("do_known_hosts: hostkeys_foreach failed for " + axAfficheKh(fichier) + ": No such file or directory", 255);
	var lignes = lignesDe(it.getText()), gardees = [], trouvees = [];
	lignes.forEach(function(l, k){ if (axLigneKnownHosts(l, [nom])) trouvees.push(k + 1); else gardees.push(l); });
	GameEvents.fire({ type: "axKnownHosts", action: "R", hote: trouverHote(nom) || nom, trouve: trouvees.length > 0 });
	if (!trouvees.length) return "Host " + nom + " not found in " + axAfficheKh(fichier);
	var r = Shell.chercher(chemin.replace(/^~/, "~"), io, "ssh-keygen");
	var vieux = r.dir.getItemFromName(r.name + ".old");
	if (vieux !== -1) r.dir.removeItem(vieux);
	var copie = new Item(r.name + ".old", it.getText(), "item_locker.gif").droits("rw-r--r--", JOUEUR);
	r.dir.addItem(copie);
	it.setText(gardees.join("\n"));
	return trouvees.map(function(n){ return "# Host " + nom + " found: line " + n; }).join("\n") + "\n" + axAfficheKh(fichier) + " updated.\nOriginal contents retained as " + axAfficheKh(fichier) + ".old";
}

/* ================================================================== */
/* Les certificats SSH : ssh-keygen -s, -L                             */
/* ================================================================== */

function axValidite(v, maintenant){
	if (!v || v === "always:forever" || v === "forever") return { debut: null, fin: null };
	var morceaux = String(v).split(":"), debut = maintenant - 60000, fin = null;
	function lire(t, base){
		var m = /^([+-])(\d+)([smhdw]?)$/.exec(t);
		if (m){ var n = +m[2] * ({ "": 1, s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[3]]) * 1000; return base + (m[1] === "+" ? n : -n); }
		if (/^\d{8}$/.test(t)) return new Date(+t.substring(0, 4), +t.substring(4, 6) - 1, +t.substring(6, 8)).getTime();
		if (t === "always") return null;
		if (t === "forever") return null;
		throw new ShellError("Invalid relative certificate time " + t, 255);
	}
	if (morceaux.length === 1) fin = lire(morceaux[0], maintenant);
	else { debut = lire(morceaux[0], maintenant); fin = lire(morceaux[1], maintenant); }
	return { debut: debut, fin: fin };
}
var SSH_KEYGEN_AVANT_ANNEXES = Shell.sorts["ssh-keygen"];
Shell.sorts["ssh-keygen"] = function(args, io){
	var o = { F: null, R: null, s: null, I: null, n: null, V: null, z: null, L: false, f: null, h: false, autres: [], cles: [] };
	for (var k = 0; k < args.length; k++){
		var a = args[k];
		if (a === "-F"){ o.F = args[++k]; continue; }
		if (a === "-R"){ o.R = args[++k]; continue; }
		if (a === "-s"){ o.s = args[++k]; continue; }
		if (a === "-I"){ o.I = args[++k]; continue; }
		if (a === "-n"){ o.n = args[++k]; continue; }
		if (a === "-V"){ o.V = args[++k]; continue; }
		if (a === "-z"){ o.z = args[++k]; continue; }
		if (a === "-L"){ o.L = true; continue; }
		if (a === "-h"){ o.h = true; continue; }
		if (a === "-f"){ o.f = args[++k]; continue; }
		if (/^-/.test(a)){ o.autres.push(a); if (["-t", "-b", "-C", "-N", "-a"].indexOf(a) > -1) o.autres.push(args[++k]); continue; }
		o.cles.push(a);
	}
	if (o.F !== null){ if (o.F === undefined) throw new ShellError("option requires an argument -- F", 1); return axKeygenF(o.F, o.f, io); }
	if (o.R !== null){ if (o.R === undefined) throw new ShellError("option requires an argument -- R", 1); return axKeygenR(o.R, o.f, io); }
	if (o.L){
		if (!o.f) throw new ShellError("ssh-keygen : -L a besoin d'un certificat : ssh-keygen -L -f CLÉ-cert.pub", 1);
		var t = Shell.objetLisible(o.f, io, "ssh-keygen"), c = t.item.axCert;
		if (!c) throw new ShellError(o.f + " is not a certificate" + axAstuce(io, "(Un certificat s'appelle d'ordinaire NOM-cert.pub, et commence par ssh-ed25519-cert-v01@openssh.com.)"), 255);
		var lignes = [o.f + ":", "        Type: ssh-ed25519-cert-v01@openssh.com " + (c.hote ? "host" : "user") + " certificate",
			"        Public key: ED25519-CERT " + c.empreinte, "        Signing CA: ED25519 " + c.ca + " (using ssh-ed25519)",
			"        Key ID: \"" + c.id + "\"", "        Serial: " + c.serie,
			"        Valid: " + (c.debut === null && c.fin === null ? "forever" : "from " + (c.debut === null ? "always" : axIso(c.debut)) + " to " + (c.fin === null ? "forever" : axIso(c.fin))),
			"        Principals: " + (c.principaux.length ? "" : "(none)")];
		c.principaux.forEach(function(p){ lignes.push("                " + p); });
		lignes.push("        Critical Options: (none)");
		if (c.hote) lignes.push("        Extensions: (none)");
		else lignes.push("        Extensions: ", "                permit-X11-forwarding", "                permit-agent-forwarding", "                permit-port-forwarding", "                permit-pty", "                permit-user-rc");
		GameEvents.fire({ type: "axCertificat", action: "L", item: t.item, ca: c.ca, principaux: c.principaux.slice(), id: c.id });
		return lignes.join("\n");
	}
	if (o.s !== null){
		if (!o.I) throw new ShellError("Must specify key id (-I) when certifying", 255);
		if (!o.cles.length) throw new ShellError("Too few arguments.", 255);
		var ca = Shell.chercher(o.s, io, "ssh-keygen");
		if (!ca.node || ca.node instanceof Room) throw new ShellError("Load key \"" + o.s + "\": No such file or directory", 255);
		if (!Shell.bit(ca.node, "r", io)) throw new ShellError("Load key \"" + o.s + "\": Permission denied" + axAstuce(io, "(La clé privée de l'autorité est lisible par root seul : sudo ssh-keygen -s ...)"), 255);
		if (!/^-----BEGIN OPENSSH PRIVATE KEY-----/.test(ca.node.getText())) throw new ShellError("Load key \"" + o.s + "\": invalid format", 255);
		var caPub = ca.dir.getItemFromName(ca.name + ".pub");
		if (caPub === -1) throw new ShellError("Load key \"" + o.s + ".pub\": No such file or directory", 255);
		var empreinteCa = axEmpreinteSouple(caPub.getText());
		var v = axValidite(o.V, axMaintenant());
		var principaux = o.n ? o.n.split(",").filter(Boolean) : [];
		var messages = [];
		o.cles.forEach(function(chemin){
			var r = Shell.chercher(chemin, io, "ssh-keygen");
			if (!r.node || r.node instanceof Room) throw new ShellError(chemin + ": No such file or directory", 255);
			var pub = r.node.getText().trim(), m = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+)\s+(\S+)(?:\s+(.*))?$/.exec(pub);
			if (!m) throw new ShellError("load pubkey \"" + chemin + "\": invalid format", 255);
			var nomCert = r.name.replace(/\.pub$/, "") + "-cert.pub";
			Shell.verifierEcriture(r.dir, io, "ssh-keygen", nomCert);
			var ancien = r.dir.getItemFromName(nomCert);
			if (ancien !== -1) r.dir.removeItem(ancien);
			var serie = o.z ? +o.z : 0;
			var corps = axBase64(axOctetsTexte("ssh-ed25519-cert-v01@openssh.com").concat(axOctetsAlea("cert-" + pub + "-" + o.I + "-" + serie, 180)));
			var cert = new Item(nomCert, "ssh-ed25519-cert-v01@openssh.com " + corps + " " + (m[3] || ""), "item_locker.gif").droits("rw-r--r--", io.sudo ? "root" : JOUEUR);
			cert.axCert = { id: o.I, principaux: principaux, debut: v.debut, fin: v.fin, serie: serie, ca: empreinteCa, empreinte: axEmpreinteSouple(pub), hote: o.h };
			r.dir.addItem(cert);
			var cheminCert = (chemin.lastIndexOf("/") > -1 ? chemin.substring(0, chemin.lastIndexOf("/") + 1) : "") + nomCert;
			messages.push("Signed " + (o.h ? "host" : "user") + " key " + cheminCert + ": id \"" + o.I + "\" serial " + serie + " for " + (principaux.length ? principaux.join(",") : "*") +
				" valid " + (v.debut === null && v.fin === null ? "forever" : "from " + (v.debut === null ? "always" : axIso(v.debut)) + " to " + (v.fin === null ? "forever" : axIso(v.fin))));
			GameEvents.fire({ type: "axCertificat", action: "signature", item: cert, ca: empreinteCa, caChemin: ca.dir === Shell.chercher(o.s, io, "ssh-keygen").dir ? o.s : o.s, principaux: principaux, id: o.I, hote: Shell.hote() });
		});
		messages.forEach(function(x){ io.err(x); });
		if (!principaux.length && io.tty) io.errFin(C.gris("(Sans -n, le certificat vaut pour n'importe quel compte : on le limite toujours à ses principaux, -n COMPTE.)"));
		return "";
	}
	return SSH_KEYGEN_AVANT_ANNEXES.apply(this, arguments);
};

/* ================================================================== */
/* pwscore : la qualité d'un mot de passe, selon pwquality.conf        */
/* ================================================================== */

var AX_MOTS_DU_DICTIONNAIRE = ["password", "motdepasse", "azerty", "qwerty", "soleil", "bonjour", "chateau", "bastion", "admin", "secret", "dragon", "princesse", "football",
	"loulou", "doudou", "chocolat", "marseille", "paris", "nicolas", "camille", "julien", "iloveyou", "welcome", "master", "monkey", "letmein", "garnison", "devise", "123456"];
function axConfigPwquality(texte){
	var c = { minlen: 8, minclass: 0, maxrepeat: 0, maxclassrepeat: 0, dcredit: 0, ucredit: 0, lcredit: 0, ocredit: 0, dictcheck: 1, usercheck: 1, difok: 1 };
	lignesDe(texte || "").forEach(function(l){
		var m = /^\s*([a-z_]+)\s*=\s*(-?\d+)\s*(#.*)?$/.exec(l);
		if (m && c.hasOwnProperty(m[1])) c[m[1]] = +m[2];
	});
	return c;
}
function axJugerMotDePasse(mot, c, compte){
	var classes = [/[0-9]/, /[A-Z]/, /[a-z]/, /[^0-9A-Za-z]/].filter(function(re){ return re.test(mot); }).length;
	if (!mot.length) return { ok: false, raison: "The password is empty" };
	// minlen compte des « crédits » : chaque classe présente peut valoir un caractère de plus (dcredit... positifs).
	var bonus = 0;
	[["dcredit", /[0-9]/g], ["ucredit", /[A-Z]/g], ["lcredit", /[a-z]/g], ["ocredit", /[^0-9A-Za-z]/g]].forEach(function(x){
		var n = (mot.match(x[1]) || []).length;
		if (c[x[0]] > 0) bonus += Math.min(n, c[x[0]]);
	});
	if (mot.length + bonus < c.minlen) return { ok: false, raison: "The password is shorter than " + (c.minlen - bonus) + " characters" };
	var manques = [["dcredit", /[0-9]/g, "digits"], ["ucredit", /[A-Z]/g, "uppercase letters"], ["lcredit", /[a-z]/g, "lowercase letters"], ["ocredit", /[^0-9A-Za-z]/g, "non-alphanumeric characters"]];
	for (var i = 0; i < manques.length; i++){
		var x = manques[i];
		if (c[x[0]] < 0 && (mot.match(x[1]) || []).length < -c[x[0]]) return { ok: false, raison: "The password contains less than " + (-c[x[0]]) + " " + x[2] };
	}
	if (classes < c.minclass) return { ok: false, raison: "The password contains less than " + c.minclass + " character classes" };
	if (c.maxrepeat > 0){ var re = new RegExp("(.)\\1{" + c.maxrepeat + ",}"); if (re.test(mot)) return { ok: false, raison: "The password contains more than " + c.maxrepeat + " same characters consecutively" }; }
	if (c.usercheck && compte && compte.length >= 3 && mot.toLowerCase().indexOf(compte.toLowerCase()) > -1) return { ok: false, raison: "The password contains the user name in some form" };
	if (c.dictcheck){
		var base = mot.toLowerCase().replace(/[^a-z]/g, "").replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a");
		var simple = mot.toLowerCase().replace(/[^a-z0-9]/g, "");
		if (AX_MOTS_DU_DICTIONNAIRE.some(function(w){ return base === w || simple === w || (base.indexOf(w) > -1 && base.length <= w.length + 3); })) return { ok: false, raison: "The password fails the dictionary check - it is based on a dictionary word" };
	}
	var score = Math.min(100, Math.max(0, Math.round((mot.length - c.minlen) * 6 + classes * 12 + (new Set(mot.split("")).size) * 1.5)));
	return { ok: true, score: score };
}
Shell.sorts.pwscore = function(args, io){
	var compte = args.filter(function(a){ return !/^-/.test(a); })[0] || null;
	var h = Shell.hote();
	var conf = typeof texteHote === "function" ? texteHote(h, "/etc/security/pwquality.conf") : null;
	if (io.stdin === null) throw new ShellError("pwscore : le mot de passe arrive par l'entrée, jamais en argument (il resterait dans l'historique) : echo \"MOT\" | pwscore" +
		axAstuce(io, "(Sans entrée, pwscore attendrait que tu le tapes, puis Entrée.)"), 1);
	var mot = lignesDe(io.stdin)[0] || "";
	var c = axConfigPwquality(conf);
	var j = axJugerMotDePasse(mot, c, compte);
	GameEvents.fire({ type: "axPwscore", ok: j.ok, score: j.score, raison: j.raison, config: c, hote: h });
	if (!j.ok){ io.code = 1; throw new ShellError("Password quality check failed:\n " + j.raison, 1); }
	return String(j.score);
};

/* ================================================================== */
/* Le greffier de sudo : Defaults log_output, sudoreplay               */
/* ================================================================== */

/* log_output est-il en vigueur sur cette machine ? (une ligne Defaults sans « ! » dans sudoers ou un fichier inclus) */
function axLogOutput(h){
	if (typeof fichiersSudoers !== "function" || !racineHote(h)) return false;
	var actif = false;
	try {
		fichiersSudoers(h).forEach(function(f){
			(f.lu.defauts || []).forEach(function(d){
				if (d.portee && d.portee !== ":" + JOUEUR && d.portee.charAt(0) !== "@") return;
				(d.liste || []).forEach(function(x){
					var nom = typeof x === "string" ? x : (x.nom || x.cle || "");
					var neg = typeof x === "string" ? /^!/.test(x) : !!x.negation;
					if (String(nom).replace(/^!/, "") === "log_output") actif = !neg;
				});
			});
		});
	} catch (e){ return false; }
	return actif;
}
function axSessionsSudo(h){ if (!state.reseau.axSudoIo) state.reseau.axSudoIo = {}; if (!state.reseau.axSudoIo[h]) state.reseau.axSudoIo[h] = []; return state.reseau.axSudoIo[h]; }
function axTsid(n){ var t = ("000000" + n.toString(36).toUpperCase()).slice(-6); return t; }
function axDateSudo(ms){ var d = new Date(ms); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()] + " " + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + d.getFullYear(); }
var APPELER_AVANT_SUDO_IO = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var enregistrer = false, h = null;
	try { h = Shell.hote(); enregistrer = !!(io && io.sudo && !io.racine && nom !== "sudoreplay" && nom !== "visudo" && nom !== "sudo" && axLogOutput(h)); } catch (e){ enregistrer = false; }
	var sortie, erreur = null;
	try { sortie = APPELER_AVANT_SUDO_IO.apply(this, arguments); }
	catch (e){ erreur = e; }
	if (enregistrer){
		try {
			var liste = axSessionsSudo(h), n = liste.length + 1, tsid = axTsid(n);
			var texte = sansAnsi(String(sortie || "")) + (erreur && erreur.message ? (sortie ? "\n" : "") + sansAnsi(erreur.message) : "");
			liste.push({ tsid: tsid, quand: axMaintenant(), user: JOUEUR, runas: "root", tty: "/dev/pts/0", cwd: Shell.cheminAffiche(current_room), commande: (nom.charAt(0) === "/" ? nom : "/usr/bin/" + nom) + (args.length ? " " + args.join(" ") : ""), sortie: texte.substring(0, 4000) });
			if (liste.length > 60) liste.splice(0, liste.length - 60);
			var base = "/var/log/sudo-io/" + tsid.substring(0, 2) + "/" + tsid.substring(2, 4) + "/" + tsid.substring(4, 6);
			if (typeof poserFichierHote === "function"){
				poserFichierHote(h, base + "/log", JOUEUR + ":root:root:/dev/pts/0\n" + Math.floor(axMaintenant() / 1000) + ":24:80\n" + Shell.cheminAffiche(current_room) + "\n" + liste[liste.length - 1].commande, { mode: "rw-------", owner: "root" });
				poserFichierHote(h, base + "/timing", "4 0.000231 " + texte.length, { mode: "rw-------", owner: "root" });
				poserFichierHote(h, base + "/ttyout", "(compressé : sudoreplay le relit)", { mode: "rw-------", owner: "root" });
				poserFichierHote(h, "/var/log/sudo-io/seq", tsid, { mode: "rw-------", owner: "root" });
			}
			GameEvents.fire({ type: "axSudoIo", hote: h, tsid: tsid, commande: liste[liste.length - 1].commande });
		} catch (x){}
	}
	if (erreur) throw erreur;
	return sortie;
};
Shell.sorts.sudoreplay = function(args, io){
	var h = Shell.hote();
	if (!io.sudo) throw new ShellError("sudoreplay: unable to open /var/log/sudo-io/seq: Permission denied" + axAstuce(io, "(Les sessions enregistrées sont lisibles par root seul : sudo sudoreplay ...)"), 1);
	var liste = (state.reseau.axSudoIo || {})[h] || [];
	var lister = args.indexOf("-l") > -1, ids = args.filter(function(a){ return !/^-/.test(a); });
	if (lister){
		var filtre = ids.join(" "), choisis = liste;
		var m = /^(?:command|cmd)\s+(\S+)$/.exec(filtre);
		if (m) choisis = liste.filter(function(s){ return s.commande.indexOf(m[1]) > -1; });
		var u = /^user\s+(\S+)$/.exec(filtre);
		if (u) choisis = liste.filter(function(s){ return s.user === u[1]; });
		var sortie = choisis.map(function(s){ return axDateSudo(s.quand) + " : " + s.user + " : TTY=" + s.tty + " ; CWD=" + s.cwd + " ; USER=" + s.runas + " ; TSID=" + s.tsid + " ; COMMAND=" + s.commande; }).join("\n");
		GameEvents.fire({ type: "axSudoreplay", action: "liste", sortie: sortie, hote: h, nb: choisis.length });
		if (!liste.length && io.tty) return C.gris("(Aucune session enregistrée : sudo n'enregistre que si Defaults log_output est en vigueur, et seulement les commandes lancées APRÈS.)");
		return sortie;
	}
	if (!ids.length) throw new ShellError("usage: sudoreplay [-hnRS] [-d dir] [-m num] [-s num] ID\nusage: sudoreplay [-h] [-d dir] -l [search expression]", 1);
	var s = liste.filter(function(x){ return x.tsid === ids[0].toUpperCase() || x.tsid.replace(/^0+/, "") === ids[0].replace(/^0+/, ""); })[0];
	if (!s) throw new ShellError("sudoreplay: unable to open /var/log/sudo-io/" + ids[0] + "/log: No such file or directory", 1);
	GameEvents.fire({ type: "axSudoreplay", action: "rejeu", tsid: s.tsid, sortie: s.sortie, hote: h });
	return "Replaying sudo session: " + s.commande + "\n" + s.sortie;
};

/* ================================================================== */
/* openssl enc et cmp                                                  */
/* ================================================================== */

var AX_CHIFFRES = { "aes-256-cbc": 32, "aes-192-cbc": 24, "aes-128-cbc": 16, "aes-256-ctr": 32, "aes-128-ctr": 16 };
function axOpensslEnc(args, io){
	var sous = args[0], i = 1, o = { algo: null, d: false, pbkdf2: false, iter: null, a: false, sel: true, entree: null, sortie: null, pass: null, md: "sha256", p: false };
	if (sous !== "enc"){ o.algo = sous.replace(/^-/, ""); }
	for (; i < args.length; i++){
		var a = args[i];
		if (/^-(aes-(128|192|256)-(cbc|ctr|gcm))$/.test(a)) o.algo = a.substring(1);
		else if (a === "-d" || a === "-decrypt") o.d = true;
		else if (a === "-e" || a === "-encrypt") o.d = false;
		else if (a === "-pbkdf2") o.pbkdf2 = true;
		else if (a === "-iter"){ o.iter = +args[++i]; o.pbkdf2 = true; }
		else if (a === "-a" || a === "-base64") o.a = true;
		else if (a === "-salt") o.sel = true;
		else if (a === "-nosalt") o.sel = false;
		else if (a === "-in") o.entree = args[++i];
		else if (a === "-out") o.sortie = args[++i];
		else if (a === "-pass") o.pass = args[++i];
		else if (a === "-k") o.pass = "pass:" + args[++i];
		else if (a === "-md") o.md = args[++i];
		else if (a === "-p" || a === "-P") o.p = true;
		else if (a === "-v") continue;
		else throw new ShellError("enc: Unknown option: " + a + "\nenc: Use -help for summary.", 1);
	}
	if (!o.algo) throw new ShellError("enc : quel algorithme ? Exemple : openssl enc -aes-256-cbc -pbkdf2 -in FICHIER -out FICHIER.enc", 1);
	if (o.algo === "aes-256-gcm" || o.algo === "aes-128-gcm") throw new ShellError("enc: AEAD ciphers not supported", 1);
	if (o.algo !== "none" && !AX_CHIFFRES[o.algo]) throw new ShellError("enc: Unrecognized flag " + o.algo, 1);
	// L'entrée.
	var item = null, texteEntree;
	if (o.entree){ var t = Shell.objetLisible(o.entree, io, "openssl"); item = t.item; texteEntree = item.getText(); }
	else { if (io.stdin === null) throw new ShellError("enc : le texte arrive par -in FICHIER (ou un tuyau).", 1); texteEntree = io.stdin; }
	function avertir(){ if (!o.pbkdf2) io.err("*** WARNING : deprecated key derivation used.\nUsing -iter or -pbkdf2 would be better."); }
	function ecrire(texte, octets, chiffre){
		if (o.sortie){
			Shell.ecrire(o.sortie, texte, false, true);
			var cree = Shell.chercher(o.sortie, io, "openssl").node;
			if (cree instanceof Item){ cree.octets = octets || null; if (chiffre) cree.axChiffre = chiffre; else delete cree.axChiffre; cree.sansFinDeLigne = !!octets; }
			return "";
		}
		if (io.sortie1 && io.sortie1.t === "fichier"){
			// Redirigé (> FICHIER) : le fichier recevra ces octets ; on y accroche ce qu'il faut pour le déchiffrer.
			AX_CHIFFRE_EN_COURS = { cible: io.sortie1.cible, octets: octets, chiffre: chiffre };
		}
		return texte;
	}
	if (o.algo === "none"){
		if (o.d){ var oc = axDepuisBase64(texteEntree); if (!oc) throw new ShellError("bad decrypt", 1); return ecrire(axDecoderUtf8(oc, true).texte); }
		var b = axBase64(versOctetsUtf8(contenuExact(texteEntree, false))), l = [];
		for (var k = 0; k < b.length; k += 64) l.push(b.substring(k, k + 64));
		return ecrire(l.join("\n"));
	}
	var sel = axOctetsAlea("sel-enc-" + state.nbCommandes, 8);
	var suite = function(mdp){
		if (o.d){
			var ch = item && item.axChiffre;
			if (!ch && o.a){ var t2 = texteEntree.replace(/\s+/g, ""); ch = AX_CHIFFRES_PAR_TEXTE[t2] || null; }
			if (!ch){ io.code = 1; throw new ShellError(o.a ? "error reading input file" : "bad magic number", 1); }
			if (o.a !== !!ch.base64){ io.code = 1; throw new ShellError(o.a ? "error reading input file" : "bad magic number" + axAstuce(io, "(Ce fichier est en base64 : il faut -a pour le déchiffrer.)"), 1); }
			avertir();
			var bon = mdp === ch.mdp && o.algo === ch.algo && o.pbkdf2 === ch.pbkdf2 && (o.iter || 10000) === (ch.iter || 10000) && o.md === ch.md;
			GameEvents.fire({ type: "axChiffre", sens: "dechiffre", item: item, ok: bon, pbkdf2: o.pbkdf2 });
			if (!bon){ io.code = 1; throw new ShellError("bad decrypt\n40B7A2D1C17F0000:error:1C800064:Provider routines:ossl_cipher_unpadblock:bad decrypt:../providers/implementations/ciphers/ciphercommon_block.c:124:" +
				axAstuce(io, "(Mauvaise phrase de passe, ou pas les mêmes options qu'au chiffrement : même algorithme, même -pbkdf2, même -iter.)"), 1); }
			return ecrire(ch.clair);
		}
		avertir();
		var clair = contenuExact(texteEntree, item ? item.sansFinDeLigne : false);
		var n = Math.floor(versOctetsUtf8(clair).length / 16) * 16 + 16;
		var octets = axOctetsTexte("Salted__").concat(sel, axOctetsAlea("chiffre-" + mdp + "-" + axHex(sel) + clair, n));
		var chiffre = { mdp: mdp, algo: o.algo, pbkdf2: o.pbkdf2, iter: o.iter || 10000, md: o.md, clair: texteEntree, base64: o.a };
		GameEvents.fire({ type: "axChiffre", sens: "chiffre", item: item, ok: true, pbkdf2: o.pbkdf2, algo: o.algo });
		if (o.a){
			var b64 = axBase64(octets), lignes = [];
			for (var k2 = 0; k2 < b64.length; k2 += 64) lignes.push(b64.substring(k2, k2 + 64));
			AX_CHIFFRES_PAR_TEXTE[lignes.join("")] = chiffre;
			return ecrire(lignes.join("\n"), null, chiffre) + (o.p ? "" : "");
		}
		var texte = octets.map(function(x){ return String.fromCharCode(x); }).join("");
		if (!o.sortie && io.tty) texte = texte.replace(/[\x00-\x1f\x7f-\xff]/g, "\uFFFD");
		return ecrire(texte, octets, chiffre);
	};
	if (o.pass){
		var m = /^(pass|env|file):(.*)$/.exec(o.pass);
		if (!m) throw new ShellError("Invalid password argument \"" + o.pass + "\"\nError getting password", 1);
		var mdp = m[1] === "pass" ? m[2] : m[1] === "env" ? Shell.variable(m[2]) : (lignesDe(Shell.objetLisible(m[2], io, "openssl").item.getText())[0] || "");
		if (m[1] === "pass" && io.tty && !state.has("axPassVu")){ state.set("axPassVu"); io.errFin(C.gris("(-pass pass:... laisse la phrase dans l'historique du shell et dans la liste des processus. Sans -pass, openssl la demande sans l'afficher.)")); }
		return suite(mdp);
	}
	if (!term || !term.demander) throw new ShellError("enc : quelle phrase de passe ? -pass pass:PHRASE", 1);
	var nomAlgo = o.algo.toUpperCase();
	term.demander("enter " + nomAlgo + " " + (o.d ? "decryption" : "encryption") + " password:", true, function(p1){
		var finir = function(mdp){
			var r = "";
			try { r = suite(mdp); } catch (e){ if (!(e instanceof ShellError)) throw e; term.echo(e.message); Shell.fin(); return; }
			io.erreurs.forEach(function(x){ term.echo(x); });
			if (r) term.echo(r);
			Shell.fin();
		};
		if (o.d){ finir(p1); return; }
		term.demander("Verifying - enter " + nomAlgo + " encryption password:", true, function(p2){
			if (p1 !== p2){ term.echo("Verify failure\nbad password read"); Shell.fin(); return; }
			finir(p1);
		});
	});
	return "";
}
var AX_CHIFFRES_PAR_TEXTE = {};
var AX_CHIFFRE_EN_COURS = null;
/* Un chiffré envoyé par > FICHIER : le fichier reçoit les octets et de quoi être déchiffré. */
var ECRIRE_AVANT_CHIFFRE = Shell.ecrire;
Shell.ecrire = function(cible, texte, ajout, sansFin){
	var r = ECRIRE_AVANT_CHIFFRE.apply(this, arguments);
	if (AX_CHIFFRE_EN_COURS && AX_CHIFFRE_EN_COURS.cible === cible){
		try {
			var it = Shell.chercher(cible, { sudo: false }, "écriture").node;
			if (it instanceof Item){ if (AX_CHIFFRE_EN_COURS.octets) it.octets = AX_CHIFFRE_EN_COURS.octets; if (AX_CHIFFRE_EN_COURS.chiffre) it.axChiffre = AX_CHIFFRE_EN_COURS.chiffre; }
		} catch (e){}
		AX_CHIFFRE_EN_COURS = null;
	}
	return r;
};

Shell.sorts.cmp = function(args, io){
	var silencieux = false, liste = false, noms = [];
	args.forEach(function(a){
		if (a === "-s" || a === "--quiet" || a === "--silent") silencieux = true;
		else if (a === "-l" || a === "--verbose") liste = true;
		else if (/^-./.test(a)) throw new ShellError("cmp: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'cmp --help' for more information.", 2);
		else noms.push(a);
	});
	if (noms.length < 1) throw new ShellError("cmp: missing operand after 'cmp'\nTry 'cmp --help' for more information.", 2);
	if (noms.length < 2) noms.push("-");
	var objets = noms.map(function(n){
		if (n === "-"){ if (io.stdin === null) throw new ShellError("cmp: -: aucune entrée", 2); return { nom: "-", octets: versOctetsUtf8(contenuExact(io.stdin, io.stdinSansFin)), item: null }; }
		var t;
		try { t = Shell.objetLisible(n, io, "cmp"); } catch (e){ if (!(e instanceof ShellError)) throw e; throw new ShellError("cmp: " + n + ": No such file or directory", 2); }
		return { nom: n, octets: t.item.octets && t.item.octets.length ? t.item.octets.slice() : versOctetsUtf8(contenuExact(t.item.getText(), t.item.sansFinDeLigne)), item: t.item };
	});
	var a = objets[0].octets, b = objets[1].octets, ligne = 1, diff = [];
	for (var k = 0; k < Math.min(a.length, b.length); k++){
		if (a[k] !== b[k]){
			if (!liste){ diff.push({ k: k, ligne: ligne }); break; }
			diff.push({ k: k, a: a[k], b: b[k] });
		}
		if (a[k] === 10) ligne++;
	}
	var identiques = !diff.length && a.length === b.length;
	GameEvents.fire({ type: "axCmp", a: objets[0].item, b: objets[1].item, identiques: identiques });
	if (identiques) return "";
	io.code = 1;
	if (silencieux) return "";
	if (liste){
		var l = diff.map(function(d){ return completerGauche(d.k + 1, 7) + " " + completerGauche(d.a.toString(8), 3) + " " + completerGauche(d.b.toString(8), 3); });
		if (a.length !== b.length) io.errFin("cmp: EOF on " + (a.length < b.length ? objets[0].nom : objets[1].nom) + " after byte " + Math.min(a.length, b.length));
		return l.join("\n");
	}
	if (diff.length) return objets[0].nom + " " + objets[1].nom + " differ: byte " + (diff[0].k + 1) + ", line " + diff[0].ligne;
	io.err("cmp: EOF on " + (a.length < b.length ? objets[0].nom : objets[1].nom) + " after byte " + Math.min(a.length, b.length) + ", line " + ligne);
	return "";
};

/* ================================================================== */
/* Le manuel des sorts des annexes (hors barème)                       */
/* ================================================================== */

MANUEL["ssh-keyscan"] = page("relever la clé d'un serveur SSH", "SSH KEY SCAN",
	"  ssh-keyscan serveur               les clés publiques que présente le serveur (comme dans known_hosts)\n" +
	"  ssh-keyscan -t ed25519 serveur    un seul type de clé ;  -p 2222 : un autre port ;  -H : nom haché\n\n" +
	"ssh-keyscan ne prouve RIEN tout seul : il dit quelle clé est présentée, pas qu'elle est la bonne. On compare son empreinte à celle\n" +
	"que l'administrateur a publiée par un autre canal (téléphone, notice signée), AVANT de la mettre dans known_hosts.");
MANUEL["pwscore"] = page("noter la solidité d'un mot de passe", "Password SCORE",
	"pwscore applique les règles de /etc/security/pwquality.conf, celles que pam_pwquality impose à passwd.\n\n" +
	"  echo \"MOT\" | pwscore         un score de 0 à 100, ou la raison du refus\n\n" +
	"Dans pwquality.conf :  minlen = 12 (la longueur)  minclass = 3 (chiffres, majuscules, minuscules, autres : 3 sortes au moins)\n" +
	"  maxrepeat = 3 (pas plus de 3 fois le même caractère d'affilée)  dictcheck = 1 (pas de mot du dictionnaire)");
MANUEL["sudoreplay"] = page("relire une session lancée avec sudo", "SUDO REPLAY",
	"Avec Defaults log_output dans sudoers (visudo), sudo enregistre ce que chaque commande a affiché, dans /var/log/sudo-io.\n\n" +
	"  sudo sudoreplay -l                      la liste des sessions enregistrées (TSID, qui, où, quelle commande)\n" +
	"  sudo sudoreplay -l command /usr/bin/cat seulement celles d'une commande\n  sudo sudoreplay 000001                  rejouer une session, comme si on y était\n\n" +
	"Le greffier écrit tout : ce que root a vu, mots de passe compris s'ils s'affichent. Les enregistrements se protègent (root seul).");
MANUEL["cmp"] = page("comparer deux fichiers octet par octet", "CoMPare",
	"  cmp a b       rien, et le code 0, s'ils sont identiques ; sinon le premier octet qui diffère\n  cmp -s a b    sans rien afficher : seul le code de retour parle (echo $?)\n  cmp -l a b    tous les octets différents\n\n" +
	"diff compare des lignes de texte ; cmp compare des octets, il marche aussi pour une image ou une archive.");
var SORTS_ANNEXES_3 = ["ssh-keyscan", "pwscore", "sudoreplay", "cmp"];
SORTS_ANNEXES_3.forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
(function(){
	function ajout(nom, texte){ if (MANUEL[nom]) MANUEL[nom].page += "\n\n" + texte; }
	ajout("ssh-keygen", "La mémoire des clés des serveurs, ~/.ssh/known_hosts :\n  ssh-keygen -F serveur     la clé gardée pour ce serveur\n  ssh-keygen -R serveur     l'oublier (une copie reste dans known_hosts.old)\n" +
		"Les certificats : une autorité (une paire de clés) signe les clés des comptes.\n  ssh-keygen -s ca -I ID -n COMPTE -V +52w cle.pub   fabrique cle-cert.pub\n  ssh-keygen -L -f cle-cert.pub                      le lire : qui, pour quels comptes, jusqu'à quand\n" +
		"  côté serveur, dans sshd_config : TrustedUserCAKeys /etc/ssh/ca.pub");
	ajout("openssl", "  openssl enc -aes-256-cbc -pbkdf2 -salt -in clair.txt -out secret.enc     chiffrer (la phrase de passe est demandée deux fois)\n" +
		"  openssl enc -d -aes-256-cbc -pbkdf2 -in secret.enc -out clair.txt         déchiffrer, avec les MÊMES options\n" +
		"  -a : le résultat en base64 (du texte) ;  -iter 100000 : plus d'itérations, plus lent à attaquer\n  Sans -pbkdf2, openssl prévient : la dérivation de la clé est trop faible.");
	ajout("visudo", "  Defaults log_output   sudo enregistre ce qu'affiche chaque commande (relire avec sudo sudoreplay -l)");
})();

World.fige = true;
