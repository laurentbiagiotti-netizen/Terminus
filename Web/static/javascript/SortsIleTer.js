/**
 * SortsIleTer.js : le moteur des services réseau de l'île, cinquième partie : les sceaux et l'Arche.
 *
 *  - Une autorité de certification interne, avec openssl : genrsa, genpkey, req (-new -key, -x509 pour l'autorité,
 *    -subj, -addext subjectAltName), x509 -req -CA -CAkey (-CAcreateserial, -days, -extfile, -copy_extensions copy),
 *    verify (-CAfile), x509 -modulus et rsa -modulus (la clé va-t-elle avec le certificat ?), s_client -starttls imap /
 *    ldap / smtp (et imaps), avec le magasin de confiance de la machine cliente. update-ca-certificates
 *    (/usr/local/share/ca-certificates/*.crt). Dovecot et slapd servent les certificats qu'on leur donne.
 *  - borg : init (-e repokey, none), create (--stats, {hostname}, {now}), list, info, check, prune (--keep-*), extract,
 *    delete, break-lock, compact ; un dépôt distant par ssh (--rsh, BORG_RSH, ~/.ssh/config), la clé et la ligne
 *    authorized_keys du compte borg (command="borg serve --restrict-to-path ...", restrict), la phrase (BORG_PASSPHRASE
 *    ou demandée), le verrou.
 */

/* ================================================================== */
/* Les certificats de l'île                                             */
/* ================================================================== */

/* Le même format que fabriquerCertificat, avec qui l'a signé (la clé de l'émetteur) : de quoi vérifier une chaîne. */
function fabriquerCertificatIle(o){
	var donnees = { sujet: o.sujet, emetteur: o.emetteur || o.sujet, debut: o.debut.toISOString(), fin: o.fin.toISOString(), san: o.san || [], algo: o.algo || "rsa:2048",
		cle: o.cle, serie: o.serie || hexDe("serie:" + o.sujet + o.debut.toISOString() + Math.random(), 32).toUpperCase(), ca: !!o.ca, signe: o.signe || o.cle };
	var brut = String.fromCharCode(0x30, 0x82, 0x05, 0x12, 0x30, 0x82, 0x03, 0xfa) + "terminus-x509:" + asciiJson(donnees) +
		hexDe("signature:" + donnees.serie + donnees.signe, 96).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); });
	return blocPem("CERTIFICATE", brut);
}
function signataireIle(cert){ return cert.signe || (cert.emetteur === cert.sujet ? cert.cle : null); }
function lireCsrIle(texte){
	var brut = lirePem(texte, "CERTIFICATE REQUEST");
	if (brut === null) return null;
	var k = brut.indexOf("terminus-csr:");
	if (k === -1) return { inconnu: true };
	try { return JSON.parse(brut.substring(k + 13)); } catch (e){ return { inconnu: true }; }
}
function tousLesCertificatsIle(texte){
	var l = [], re = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g, m;
	while ((m = re.exec(String(texte || "")))) { var c = lireCertificat(m[0]); if (c && !c.inconnu) l.push(c); }
	return l;
}
/* Le magasin de confiance d'une machine : le paquet du système (ou un fichier -CAfile). */
function confianceIle(h, fichier){ return tousLesCertificatsIle(lireIle(h, fichier || "/etc/ssl/certs/ca-certificates.crt")); }
/* Vérifier un certificat contre un magasin : { code, texte } (0 : ok), comme OpenSSL. */
function verifierChaineIle(h, cert, magasin, nom){
	var quand = new Date(maintenantMachine(h) - DECALAGE_HISTOIRE * 3600000);
	if (quand < cert.debut) return { code: 9, texte: "certificate is not yet valid" };
	if (quand > cert.fin) return { code: 10, texte: "certificate has expired" };
	var auto = cert.emetteur === cert.sujet && signataireIle(cert) === cert.cle;
	if (auto){
		if (magasin.some(function(c){ return c.serie === cert.serie; })) return { code: 0, texte: "ok", ca: cert };
		return { code: 18, texte: "self-signed certificate" };
	}
	var ca = magasin.filter(function(c){ return c.sujet === cert.emetteur; });
	if (!ca.length) return { code: 20, texte: "unable to get local issuer certificate" };
	var bon = ca.filter(function(c){ return c.cle === signataireIle(cert); })[0];
	if (!bon) return { code: 7, texte: "certificate signature failure" };
	if (!bon.ca) return { code: 24, texte: "invalid CA certificate" };
	if (quand > bon.fin) return { code: 10, texte: "certificate has expired" };
	if (nom && !nomCouvert(cert, nom)) return { code: 62, texte: "hostname mismatch" };
	return { code: 0, texte: "ok", ca: bon };
}
function sujetDepuisSubjIle(subj){
	if (!subj) return null;
	if (subj.charAt(0) !== "/") return null;
	return subj.substring(1).split("/").filter(Boolean).map(function(x){ var k = x.indexOf("="); return x.substring(0, k) + " = " + x.substring(k + 1); }).join(", ");
}
function sanDepuisTexteIle(t){ return String(t || "").replace(/^.*?=/, "").split(",").map(function(x){ return x.trim(); }).filter(function(x){ return /^DNS:/i.test(x); }).map(function(x){ return x.substring(4).trim(); }); }
function lireObjetIle(chemin, io, cmd, quoi){
	var r;
	try { r = Shell.objetLisible(chemin, io, cmd); }
	catch (e){
		if (/Permission/.test(e.message)) throw new ShellError("Could not open file or uri for loading " + quoi + " from " + chemin + "\n4027E3F5C27F0000:error:8000000D:system library:file_open:Permission denied:../providers/implementations/storemgmt/file_store.c:267:calling stat(" + chemin + ")" + astuce(io, "Ce fichier n'est lisible que par son propriétaire : sudo openssl ..."), 1);
		throw new ShellError("Could not open file or uri for loading " + quoi + " from " + chemin + "\n4027E3F5C27F0000:error:80000002:system library:file_open:No such file or directory:../providers/implementations/storemgmt/file_store.c:267:calling stat(" + chemin + ")", 1);
	}
	return r.item.getText();
}
function moduleIle(cle){ return hexDe("module:" + cle, 512).toUpperCase(); }

/* ================================================================== */
/* openssl sur l'île                                                    */
/* ================================================================== */

function opensslGenrsaIle(args, io, h){
	var sortie = optionIle(args, ["-out"]), bits = +(args.filter(function(a, i){ return /^\d+$/.test(a) && args[i - 1] !== "-out"; })[0] || 2048);
	if (bits < 512) throw new ShellError("genrsa: Invalid number of bits " + bits, 1);
	var id = hexDe("cle-ile:" + h + ":" + state.nbCommandes + ":" + Math.random(), 16);
	var texte = fabriquerCle(id, "rsa:" + bits);
	var chiffre = args.some(function(a){ return /^-(aes\d+|des3|aria\d+|camellia\d+)$/.test(a); });
	var finir = function(){
		if (chiffre) texte = texte.replace(/PRIVATE KEY/g, "ENCRYPTED PRIVATE KEY");
		if (sortie){ ecrireFichier(sortie, texte, io, "openssl", { mode: "rw-------" }); evenementIle(h, "genrsa", { fichier: sortie, cle: id, bits: bits, chiffre: chiffre }); return ""; }
		evenementIle(h, "genrsa", { fichier: null, cle: id, bits: bits });
		return texte;
	};
	if (!chiffre) return finir();
	if (!io.tty || !term || !term.demander) throw new ShellError("genrsa: Can't read password", 1);
	term.demander("Enter PEM pass phrase:", true, function(a){ term.demander("Verifying - Enter PEM pass phrase:", true, function(b){
		if (a !== b){ term.echo("Verify failure\nUser interface error"); Shell.fin(); return; }
		var s = finir(); if (s) term.echo(s); Shell.fin();
	}); });
	return "";
}
function opensslReqIle(args, io, h){
	var x509 = args.indexOf("-x509") > -1, cleF = optionIle(args, ["-key"]), nouvelle = optionIle(args, ["-newkey"]);
	// Relire une demande : req -in FICHIER -noout -subject (ou -text).
	var entree = optionIle(args, ["-in"]);
	if (entree && !x509 && !cleF && !nouvelle && args.indexOf("-new") === -1){
		var csr = lireCsrIle(lireObjetIle(entree, io, "openssl", "X509 request"));
		if (!csr || csr.inconnu) throw new ShellError("Could not read X509 request from " + entree + "\nUnable to load X509 request", 1);
		var l = [];
		if (args.indexOf("-text") > -1){
			l.push("Certificate Request:", "    Data:", "        Version: 1 (0x0)", "        Subject: " + csr.sujet, "        Subject Public Key Info:", "            Public Key Algorithm: rsaEncryption");
			if ((csr.san || []).length) l.push("        Attributes:", "            Requested Extensions:", "                X509v3 Subject Alternative Name: ", "                    " + csr.san.map(function(x){ return "DNS:" + x; }).join(", "));
		}
		if (args.indexOf("-subject") > -1) l.push("subject=" + csr.sujet);
		if (args.indexOf("-noout") === -1) l.push(lireObjetIle(entree, io, "openssl", "X509 request").trim());
		return l.join("\n");
	}
	var sortie = optionIle(args, ["-out"]), sortieCle = optionIle(args, ["-keyout"]), jours = +(optionIle(args, ["-days"]) || 30);
	var subj = optionIle(args, ["-subj"]), sujet = sujetDepuisSubjIle(subj);
	if (subj !== null && !sujet) throw new ShellError("req: Subject or issuer missing: name is expected to be in the format /type0=value0/type1=value1/type2=... where characters may be escaped by \\.", 1);
	if (!sujet) throw new ShellError("You are about to be asked to enter information that will be incorporated\ninto your certificate request." + astuce(io, "Ici, donne le sujet d'un coup avec -subj, par exemple : -subj \"/CN=poste.port-aube.lan\""), 1);
	var id, algo = "rsa:2048";
	if (cleF){
		var lue = lireCle(lireObjetIle(cleF, io, "openssl", "private key"));
		if (!lue || lue.inconnu) throw new ShellError("Could not read private key from " + cleF, 1);
		id = lue.id; algo = lue.algo;
	} else if (nouvelle){
		id = hexDe("cle-ile:" + h + ":" + state.nbCommandes + ":" + Math.random(), 16);
		algo = nouvelle === "rsa" ? "rsa:2048" : nouvelle;
		if (args.indexOf("-nodes") === -1 && args.indexOf("-noenc") === -1) throw new ShellError("req: une clé neuve sans -nodes demanderait une phrase" + astuce(io, "Pour une clé de serveur (que le service lit seul au démarrage) : -nodes. Ou fabrique la clé à part : openssl genrsa -out ..."), 1);
		var texteCle = fabriquerCle(id, algo);
		if (sortieCle) ecrireFichier(sortieCle, texteCle, io, "openssl", { mode: "rw-------" });
	} else throw new ShellError("req: no -newkey or -key given" + astuce(io, "Exemple : openssl req -new -key poste.key -subj \"/CN=poste.port-aube.lan\" -out poste.csr"), 1);
	var san = [];
	args.forEach(function(a, i){ if (args[i - 1] === "-addext" && /subjectAltName/.test(a)) san = sanDepuisTexteIle(a); });
	var basique = args.some(function(a, i){ return args[i - 1] === "-addext" && /basicConstraints\s*=\s*.*CA:FALSE/i.test(a); });
	var pem;
	if (x509){
		var debut = new Date(maintenantMachine(h) - DECALAGE_HISTOIRE * 3600000);
		pem = fabriquerCertificatIle({ sujet: sujet, emetteur: sujet, debut: debut, fin: new Date(debut.getTime() + jours * 86400000), san: san, cle: id, algo: algo, ca: !basique, signe: id });
	} else pem = blocPem("CERTIFICATE REQUEST", String.fromCharCode(0x30, 0x82, 0x02, 0x9a) + "terminus-csr:" + asciiJson({ sujet: sujet, cle: id, san: san }));
	if (sortie) ecrireFichier(sortie, pem, io, "openssl");
	evenementIle(h, "req", { x509: x509, sujet: sujet, cle: id, fichier: sortie, san: san, ca: x509 && !basique, jours: jours });
	if (nouvelle) io.err("..+....+...+..+.+......+.....+++++++++++++++++++++++++++++++++++++++*.+....+..+...+++++++\n-----");
	return sortie ? "" : pem;
}
function opensslSignerIle(args, io, h){
	var entree = optionIle(args, ["-in"]), caF = optionIle(args, ["-CA"]), caCleF = optionIle(args, ["-CAkey"]), sortie = optionIle(args, ["-out"]);
	var jours = +(optionIle(args, ["-days"]) || 30), extfile = optionIle(args, ["-extfile"]), copie = optionIle(args, ["-copy_extensions"]);
	if (!entree && io.stdin === null) throw new ShellError("x509: No input given" + astuce(io, "La demande à signer : -in demande.csr"), 1);
	var csr = lireCsrIle(entree ? lireObjetIle(entree, io, "openssl", "certificate request") : io.stdin);
	if (!csr || csr.inconnu) throw new ShellError("Could not read certificate request from " + (entree || "<stdin>") + "\nUnable to load certificate request input", 1);
	var san = [];
	if (copie && /^(copy|copyall)$/.test(copie)) san = csr.san || [];
	if (extfile){
		var t = lireObjetIle(extfile, io, "openssl", "extensions");
		var ligne = t.split("\n").filter(function(l){ return /^\s*subjectAltName\s*=/.test(l); })[0];
		if (ligne) san = sanDepuisTexteIle(ligne);
	}
	var debut = new Date(maintenantMachine(h) - DECALAGE_HISTOIRE * 3600000), fin = new Date(debut.getTime() + jours * 86400000);
	var emetteur = csr.sujet, signe = csr.cle, caCert = null;
	if (caF){
		caCert = lireCertificat(lireObjetIle(caF, io, "openssl", "CA certificate"));
		if (!caCert || caCert.inconnu) throw new ShellError("Could not read CA certificate from " + caF, 1);
		if (!caCleF) throw new ShellError("x509: Warning: ignoring -CAkey option since no -CA option is given\nx509: Option -CAkey missing" + astuce(io, "Il faut aussi la clé de l'autorité : -CAkey"), 1);
		var cleCa = lireCle(lireObjetIle(caCleF, io, "openssl", "CA private key"));
		if (!cleCa || cleCa.inconnu) throw new ShellError("Could not read CA private key from " + caCleF, 1);
		if (cleCa.id !== caCert.cle){ evenementIle(h, "signature", { ok: false, raison: "cle" }); throw new ShellError("40F7D2D8A27F0000:error:05800074:x509 certificate routines:X509_check_private_key:key values mismatch:../crypto/x509/x509_cmp.c:405:\nx509: CA certificate and CA private key do not match", 1); }
		emetteur = caCert.sujet; signe = caCert.cle;
		var srl = caF.replace(/\.[^.\/]*$/, "") + ".srl";
		var serie = hexDe("serie:" + csr.sujet + ":" + state.nbCommandes, 40).toUpperCase();
		if (args.indexOf("-CAcreateserial") > -1){ try { ecrireFichier(srl, serie, io, "openssl"); } catch (e){ /* le dossier de l'autorité peut refuser l'écriture : la série reste aléatoire */ } }
	}
	var pem = fabriquerCertificatIle({ sujet: csr.sujet, emetteur: emetteur, debut: debut, fin: fin, san: san, cle: csr.cle, signe: signe, ca: false, serie: serie });
	if (sortie) ecrireFichier(sortie, pem, io, "openssl");
	io.err("Certificate request self-signature ok\nsubject=" + csr.sujet);
	evenementIle(h, "signature", { ok: true, sujet: csr.sujet, emetteur: emetteur, san: san, jours: jours, ca: caCert ? caCert.sujet : null, fichier: sortie });
	return sortie ? "" : pem;
}
function opensslVerifyIle(args, io, h){
	var caF = optionIle(args, ["-CAfile"]), nom = optionIle(args, ["-verify_hostname"]);
	var fichiers = argumentsIle(args.slice(1), ["-CAfile", "-verify_hostname", "-CApath", "-untrusted", "-purpose"]);
	var magasin = caF ? tousLesCertificatsIle(lireObjetIle(caF, io, "openssl", "certificates")) : confianceIle(h);
	var sortie = [];
	fichiers.forEach(function(f){
		var c = lireCertificat(lireObjetIle(f, io, "openssl", "certificate"));
		if (!c || c.inconnu) throw new ShellError("Could not read certificate from " + f + "\nUnable to load certificate file", 2);
		var v = verifierChaineIle(h, c, magasin, nom);
		evenementIle(h, "verify", { fichier: f, code: v.code, sujet: c.sujet, caFile: caF });
		if (v.code === 0) sortie.push(f + ": OK");
		else { io.code = 2; sortie.push(c.sujet + "\nerror " + v.code + " at 0 depth lookup: " + v.texte + "\nerror " + f + ": verification failed"); }
	});
	return sortie.filter(Boolean).join("\n");
}
var OPENSSL_AVANT_ILE = Shell.sorts.openssl;
Shell.sorts.openssl = function(args, io){
	var h = ileIci();
	if (!h) return OPENSSL_AVANT_ILE.apply(this, arguments);
	var sous = args[0];
	if (sous === "genrsa") return opensslGenrsaIle(args, io, h);
	if (sous === "genpkey"){ var alg = (optionIle(args, ["-algorithm"]) || "RSA").toLowerCase(); return opensslGenrsaIle(["genrsa", "-out", optionIle(args, ["-out"])].filter(Boolean).concat(alg === "ed25519" ? [] : ["2048"]), io, h); }
	if (sous === "req") return opensslReqIle(args, io, h);
	if (sous === "verify") return opensslVerifyIle(args, io, h);
	if (sous === "x509" && args.indexOf("-req") > -1) return opensslSignerIle(args, io, h);
	if ((sous === "x509" || sous === "rsa" || sous === "pkey") && args.indexOf("-modulus") > -1){
		var f = optionIle(args, ["-in"]), t = f ? lireObjetIle(f, io, "openssl", sous === "x509" ? "certificate" : "private key") : io.stdin;
		var id = sous === "x509" ? (lireCertificat(t) || {}).cle : (lireCle(t) || {}).id;
		if (!id) throw new ShellError("Could not read " + (sous === "x509" ? "certificate" : "private key") + " from " + (f || "<stdin>"), 1);
		evenementIle(h, "modulus", { quoi: sous, cle: id });
		return "Modulus=" + moduleIle(id);
	}
	if (sous === "rsa" && args.indexOf("-check") > -1){
		var f2 = optionIle(args, ["-in"]), cle = lireCle(lireObjetIle(f2, io, "openssl", "private key"));
		if (!cle || cle.inconnu) throw new ShellError("Could not read private key from " + f2, 1);
		return "RSA key ok";
	}
	if (sous === "s_client") return opensslSClientIle(args, io, h);
	return OPENSSL_AVANT_ILE.apply(this, arguments);
};

/* ================================================================== */
/* update-ca-certificates                                               */
/* ================================================================== */

Shell.sorts["update-ca-certificates"] = function(args, io){
	var h = ileIci();
	if (!h) throw new ShellError("update-ca-certificates: command not found", 127);
	if (!io.sudo) throw new ShellError("Updating certificates in /etc/ssl/certs...\nln: failed to create symbolic link '/etc/ssl/certs/ca-certificates.crt': Permission denied" + astuce(io, "sudo update-ca-certificates"), 1);
	var E = etatIle(h);
	var avant = E.casLocales || [];
	var locales = fichiersDuDossier(h, "/usr/local/share/ca-certificates").concat(
		(dossierHote(h, "/usr/local/share/ca-certificates") || { children: [] }).children.filter(function(c){ return c.parents[0] && c.parents[0].room_name === "ca-certificates"; }).reduce(function(l, d){ return l.concat(d.items.map(function(it){ return { nom: d.room_name + "/" + it.itemname, item: it }; })); }, []));
	var avertissements = [], gardes = [];
	locales.forEach(function(f){
		if (!/\.crt$/.test(f.nom)){ avertissements.push("WARNING: " + f.nom + " does not have a .crt extension, skipping."); return; }
		var c = lireCertificat(f.item.getText());
		if (!c || c.inconnu){ avertissements.push("WARNING: " + f.nom + " does not contain a certificate or CRL: skipping"); return; }
		gardes.push({ nom: f.nom, pem: c.pem, serie: c.serie, sujet: c.sujet });
	});
	var ajoutes = gardes.filter(function(g){ return !avant.some(function(a){ return a.serie === g.serie; }); }).length;
	var retires = avant.filter(function(a){ return !gardes.some(function(g){ return g.serie === a.serie; }); }).length;
	E.casLocales = gardes;
	moteurSeul(function(){
		ecrireFichierHote(h, "/etc/ssl/certs/ca-certificates.crt", BUNDLE_SYSTEME_ILE + gardes.map(function(g){ return g.pem + "\n"; }).join(""), { evenement: false });
		gardes.forEach(function(g){ var n = nomDe(g.nom).replace(/\.crt$/, ".pem"); poserFichierHote(h, "/etc/ssl/certs/" + n, "", { lien: "/usr/local/share/ca-certificates/" + g.nom }); });
	});
	evenementIle(h, "update-ca-certificates", { ajoutes: ajoutes, retires: retires, sujets: gardes.map(function(g){ return g.sujet; }) });
	return avertissements.concat(["Updating certificates in /etc/ssl/certs...", ajoutes + " added, " + retires + " removed; done.", "Running hooks in /etc/ca-certificates/update.d...", "done."]).join("\n");
};

/* ================================================================== */
/* Les services qui servent un certificat                               */
/* ================================================================== */

/* Dovecot : le certificat et la clé de sa configuration chargée (ssl_cert = <fichier). */
function tlsDovecotIle(h){
	var r = reglagesDovecotIle(h);
	if (!/^(yes|required)$/.test(r.ssl || "yes")) return { erreur: "ssl" };
	var cf = (r.ssl_cert || "").replace(/^</, "").trim(), kf = (r.ssl_key || "").replace(/^</, "").trim();
	var cert = lireCertificat(lireIle(h, cf) || ""), cle = lireCle(lireIle(h, kf) || "");
	if (!cert || cert.inconnu || !cle || cle.inconnu) return { erreur: "lecture", fichierCert: cf };
	if (cle.id !== cert.cle) return { erreur: "paire", fichierCert: cf };
	return { cert: cert, fichierCert: cf, fichierCle: kf };
}
/* Postfix : smtpd_tls_cert_file et smtpd_tls_key_file. */
function tlsPostfixIle(h){
	var p = paramsPostfixChargesIle(h);
	var cert = lireCertificat(lireIle(h, valeurPostfixIle(h, p, "smtpd_tls_cert_file")) || ""), cle = lireCle(lireIle(h, valeurPostfixIle(h, p, "smtpd_tls_key_file")) || "");
	if (!cert || cert.inconnu || !cle || cle.inconnu) return { erreur: "lecture" };
	if (cle.id !== cert.cle) return { erreur: "paire" };
	return { cert: cert };
}
/* slapd : les fichiers doivent exister, être lisibles par openldap, et aller ensemble. */
function lisibleParIle(h, chemin, compte, groupes){
	var it = fichierHote(h, chemin);
	if (!it) return false;
	if (it.owner === compte) return it.mode.charAt(0) === "r";
	var g = groupeNoeud(h, it);
	if (groupes.indexOf(g) > -1) return it.mode.charAt(3) === "r";
	return it.mode.charAt(6) === "r";
}
function controleTlsSlapdIle(c){
	var h = "registre", groupes = ["openldap"].concat(groupesMachine(h).filter(function(g){ return g.membres.indexOf("openldap") > -1; }).map(function(g){ return g.nom; }));
	if (!c.tlsCert || !c.tlsCle) return "incomplet";
	if (!lisibleParIle(h, c.tlsCert, "openldap", groupes) || !lisibleParIle(h, c.tlsCle, "openldap", groupes)) return "droits";
	var cert = lireCertificat(lireIle(h, c.tlsCert) || ""), cle = lireCle(lireIle(h, c.tlsCle) || "");
	if (!cert || cert.inconnu || !cle || cle.inconnu || cle.id !== cert.cle) return "paire";
	return null;
}
/* StartTLS vers le Registre, vu d'une machine cliente (ldap.conf : TLS_CACERT, TLS_REQCERT). */
function starttlsLdapIle(hClient, conf){
	var c = ldapIle().config;
	if (!c.tlsCert || controleTlsSlapdIle(c)) return { ok: false, erreur: "ldap_start_tls: Protocol error (2)\n\tadditional info: unsupported extended operation", code: 2 };
	var cert = lireCertificat(lireIle("registre", c.tlsCert));
	var exige = (conf.TLS_REQCERT || "demand").toLowerCase();
	if (exige === "never" || exige === "allow") return { ok: true, cert: cert };
	var v = verifierChaineIle(hClient, cert, confianceIle(hClient, conf.TLS_CACERT || "/etc/ssl/certs/ca-certificates.crt"), "registre." + DOMAINE_ILE);
	if (v.code !== 0) return { ok: false, erreur: "ldap_start_tls: Connect error (-11)\n\tadditional info: error:0A000086:SSL routines::certificate verify failed (" + v.texte + ")", code: 1, verification: v };
	return { ok: true, cert: cert };
}

/* ================================================================== */
/* openssl s_client sur l'île                                           */
/* ================================================================== */

var PORTS_TLS_ILE = { 143: { service: "dovecot", starttls: "imap" }, 993: { service: "dovecot", direct: true }, 25: { service: "postfix", starttls: "smtp" }, 587: { service: "postfix", starttls: "smtp" },
	389: { service: "slapd", starttls: "ldap" }, 636: { service: "slapd", direct: true } };
function opensslSClientIle(args, io, h){
	var cible = optionIle(args, ["-connect"]);
	var m = cible ? /^([^:]+):(\d+)$/.exec(cible) : null;
	var s = m ? resoudreHoteIle(m[1]) : null;
	if (!m || !s || !estHoteIle(s)) return OPENSSL_AVANT_ILE.apply(this, [args, io]);
	var port = +m[2], starttls = optionIle(args, ["-starttls"]), caF = optionIle(args, ["-CAfile"]), nomVerif = optionIle(args, ["-verify_hostname"]);
	var def = PORTS_TLS_ILE[port];
	var errId = "40C7B1E2A07F0000";
	var refus = function(){ evenementIle(h, "s_client", { serveur: s, port: port, ok: false }); throw new ShellError(errId + ":error:8000006F:system library:BIO_connect:Connection refused:../crypto/bio/bio_sock2.c:114:calling connect()\n" + errId + ":error:10000067:BIO routines:BIO_connect:connect error:../crypto/bio/bio_sock2.c:116:\nconnect:errno=111", 1); };
	if (!def || !serviceActifIle(s, def.service)) refus();
	if (def.starttls && !starttls){
		evenementIle(h, "s_client", { serveur: s, port: port, ok: false, sansStarttls: true });
		io.err(errId + ":error:0A00010B:SSL routines:ssl3_get_record:wrong version number:../ssl/record/ssl3_record.c:354:");
		io.code = 1;
		return "CONNECTED(00000003)\n---\nno peer certificate available\n---\nNo client certificate CA names sent\n---\nSSL handshake has read 5 bytes and written 289 bytes\nVerification: OK\n---\nNew, (NONE), Cipher is (NONE)\nVerify return code: 0 (ok)\n---" +
			astuce(io, "Le port " + port + " commence en clair : il faut demander TLS en cours de route, avec -starttls " + def.starttls + ".");
	}
	if (starttls && def.starttls && starttls !== def.starttls){ io.code = 1; throw new ShellError("Didn't find STARTTLS in server response, trying anyway...\n" + errId + ":error:0A00010B:SSL routines:ssl3_get_record:wrong version number", 1); }
	var t = def.service === "dovecot" ? tlsDovecotIle(s) : (def.service === "postfix" ? tlsPostfixIle(s) : (function(){ var c = ldapIle().config; var e = controleTlsSlapdIle(c); return e ? { erreur: e } : { cert: lireCertificat(lireIle("registre", c.tlsCert)) }; })());
	if (t.erreur){
		evenementIle(h, "s_client", { serveur: s, port: port, ok: false, erreur: t.erreur });
		if (def.service === "dovecot" && t.erreur === "paire") journalPosteIle(s, "dovecot", "imap-login: Error: Failed to initialize SSL server context: Can't load SSL private key: error:05800074:x509 certificate routines::key values mismatch", 3);
		io.code = 1;
		return (def.service === "slapd" ? "CONNECTED(00000003)\nDidn't find STARTTLS in server response, trying anyway..." : "CONNECTED(00000003)") + "\n" + errId + ":error:0A000410:SSL routines:ssl3_read_bytes:sslv3 alert handshake failure:../ssl/record/rec_layer_s3.c:1586:SSL alert number 40\n---\nno peer certificate available\n---";
	}
	var cert = t.cert, magasin = caF ? tousLesCertificatsIle(lireObjetIle(caF, io, "openssl", "CA certificates")) : confianceIle(h);
	var v = verifierChaineIle(h, cert, magasin, nomVerif);
	evenementIle(h, "s_client", { serveur: s, port: port, ok: true, starttls: starttls, verification: v.code, sujet: cert.sujet, emetteur: cert.emetteur, caFile: caF, nom: m[1] });
	var l = ["CONNECTED(00000003)"];
	if (v.code === 0 && v.ca && v.ca !== cert) l.push("depth=1 " + v.ca.sujet, "verify return:1");
	if (v.code === 0) l.push("depth=0 " + cert.sujet, "verify return:1");
	else l.push("depth=0 " + cert.sujet, "verify error:num=" + v.code + ":" + v.texte, "verify return:1", "depth=0 " + cert.sujet, "verify return:1");
	l.push("---", "Certificate chain", " 0 s:" + cert.sujet, "   i:" + cert.emetteur, "   a:PKEY: rsaEncryption, 2048 (bit); sigalg: RSA-SHA256", "   v:NotBefore: " + dateUtcOpenssl(cert.debut) + "; NotAfter: " + dateUtcOpenssl(cert.fin), "---",
		"Server certificate", cert.pem, "subject=" + cert.sujet, "issuer=" + cert.emetteur, "---", "No client certificate CA names sent", "Peer signing digest: SHA256", "Peer signature type: RSA-PSS", "Server Temp Key: X25519, 253 bits", "---",
		"SSL handshake has read 2210 bytes and written 389 bytes", "Verification" + (v.code === 0 ? ": OK" : " error: " + v.texte), "---", "New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384", "Server public key is 2048 bit",
		"Secure Renegotiation IS NOT supported", "Compression: NONE", "Expansion: NONE", "No ALPN negotiated", "Early data was not sent", "Verify return code: " + v.code + " (" + v.texte + ")", "---");
	if (def.service === "dovecot") l.push("* OK [CAPABILITY IMAP4rev1 SASL-IR LOGIN-REFERRALS ID ENABLE IDLE LITERAL+ AUTH=PLAIN] Dovecot (Debian) ready.");
	if (def.service === "postfix") l.push("250 CHUNKING");
	l.push("DONE");
	var texte = l.join("\n");
	if (io.tty && v.code !== 0) texte += astuce(io, v.code === 20 ? "Le certificat est signé par une autorité que cette machine ne connaît pas : son magasin (/etc/ssl/certs/ca-certificates.crt) ne contient pas la Forge." :
		(v.code === 18 ? "Un certificat qui se signe lui-même : personne ne s'en porte garant." : "Vérification : " + v.texte + "."));
	return texte;
};

/* ================================================================== */
/* borg                                                                 */
/* ================================================================== */

function etatBorgIle(){ var e = etatIle("arche"); if (!e.borg || typeof e.borg !== "object") e.borg = { depots: {} }; if (!e.borg.depots) e.borg.depots = {}; return e.borg; }
/* Un dépôt écrit comme on le tape : borg@arche:/srv/borg/greniers, ssh://borg@arche/srv/borg/greniers, ou un chemin local. */
function lireDepotIle(h, texte){
	var archive = null, t = String(texte || "");
	var k = t.indexOf("::");
	if (k > -1){ archive = t.substring(k + 2); t = t.substring(0, k); }
	var m = /^ssh:\/\/(?:([^@\/]+)@)?([^\/:]+)(?::\d+)?(\/.*)$/.exec(t) || /^(?:([^@\/:]+)@)?([^\/:]+):(.*)$/.exec(t);
	if (m) return { distant: true, utilisateur: m[1] || null, hoteNom: m[2], hote: resoudreHoteIle(m[2]), chemin: cheminNormal(m[3].replace(/^~\//, "/home/" + (m[1] || "root") + "/")), archive: archive, texte: t };
	if (t.charAt(0) === "/") return { distant: false, hote: h, chemin: cheminNormal(t), archive: archive, texte: t };
	return null;
}
/* La clé que ssh présenterait : --rsh / BORG_RSH « ssh -i FICHIER », ~/.ssh/config (IdentityFile), ou les clés par défaut. */
function cleSshBorgIle(h, io, rsh, hoteNom){
	var maison = io.sudo ? "/root" : "/home/" + JOUEUR, candidats = [];
	var mi = rsh ? /-i\s+(\S+)/.exec(rsh) : null;
	if (mi) candidats.push(mi[1].replace(/^~/, maison));
	var cfg = lireIle(h, maison + "/.ssh/config");
	var utilisateurCfg = null;
	if (cfg){
		var dans = false;
		cfg.split("\n").forEach(function(l){
			var x = /^\s*Host\s+(.+)$/i.exec(l);
			if (x){ dans = x[1].split(/\s+/).some(function(n){ return n === hoteNom || n === "*" ; }); return; }
			var y = /^\s*IdentityFile\s+(\S+)/i.exec(l); if (dans && y) candidats.push(y[1].replace(/^~/, maison));
			var z = /^\s*User\s+(\S+)/i.exec(l); if (dans && z) utilisateurCfg = z[1];
		});
	}
	candidats.push(maison + "/.ssh/id_ed25519", maison + "/.ssh/id_rsa");
	return { candidats: candidats, utilisateur: utilisateurCfg };
}
function blocCleIle(ligne){ var m = /(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+)\s+(\S+)/.exec(ligne || ""); return m ? m[2] : null; }
function optionsAuthorizedIle(ligne){
	var t = String(ligne).trim(), i = t.search(/(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+)\s/);
	var options = i > 0 ? t.substring(0, i).trim() : "";
	var cmd = /command="([^"]*)"/.exec(options);
	return { texte: options, commande: cmd ? cmd[1] : null, restrict: /(^|,)restrict(,|$)/.test(options.replace(/command="[^"]*"/, "")), from: (/from="([^"]*)"/.exec(options) || [])[1] || null };
}
/* Le voyage par ssh jusqu'au dépôt : { ok, ligne (authorized_keys), restriction } ou { erreur }. */
function connexionBorgIle(h, io, d, rsh){
	if (!d.hote || !estHoteIle(d.hote)) return { erreur: "Remote: ssh: Could not resolve hostname " + d.hoteNom + ": Name or service not known\nConnection closed by remote host. Is borg working on the server?" };
	var c = cleSshBorgIle(h, io, rsh, d.hoteNom);
	var u = d.utilisateur || c.utilisateur || (io.sudo ? "root" : JOUEUR);
	if (!serviceActifIle(d.hote, "ssh")) return { erreur: "Remote: ssh: connect to host " + d.hoteNom + " port 22: Connection refused\nConnection closed by remote host. Is borg working on the server?" };
	var compte = utilisateurLocalIle(d.hote, u);
	var ak = compte ? lireIle(d.hote, compte.home + "/.ssh/authorized_keys") : null;
	var lignes = (ak || "").split("\n").filter(function(l){ return l.trim() && !/^\s*#/.test(l); });
	var trouve = null, cleUtilisee = null;
	c.candidats.some(function(p){
		var priv = fichierHote(h, p), pub = lireIle(h, p + ".pub");
		if (!priv || !pub) return false;
		if (!io.sudo && !Shell.bit(priv, "r", io)) return false;
		var b = blocCleIle(pub);
		var l = lignes.filter(function(x){ return blocCleIle(x) === b; })[0];
		if (l){ trouve = l; cleUtilisee = p; return true; }
		return false;
	});
	if (!trouve){
		journalIle(d.hote, "sshd", "ssh", "Connection closed by authenticating user " + u + " " + ipIle(h) + " port " + (50000 + state.nbCommandes % 9999) + " [preauth]", 6);
		return { erreur: "Remote: " + u + "@" + d.hoteNom + ": Permission denied (publickey).\nConnection closed by remote host. Is borg working on the server?", auth: true };
	}
	var o = optionsAuthorizedIle(trouve);
	if (o.from && !clientCorrespondIle(o.from.split(",")[0], h)) return { erreur: "Remote: " + u + "@" + d.hoteNom + ": Permission denied (publickey).\nConnection closed by remote host. Is borg working on the server?", auth: true };
	if (o.commande && !/^(\/usr\/bin\/)?borg serve\b/.test(o.commande)) return { erreur: "Got unexpected RPC data format from server:\n" + o.commande.split(" ")[0] + ": command forced by authorized_keys", forcee: true };
	var restr = o.commande ? ((/--restrict-to-(?:path|repository)[ =](\S+)/.exec(o.commande) || [])[1] || null) : null;
	if (restr && d.chemin !== cheminNormal(restr) && d.chemin.indexOf(cheminNormal(restr) + "/") !== 0) return { erreur: "Repository path not allowed: " + d.chemin, interdit: true };
	journalIle(d.hote, "sshd", "ssh", "Accepted publickey for " + u + " from " + ipIle(h) + " port " + (50000 + state.nbCommandes % 9999) + " ssh2: ED25519 SHA256:" + btoa(hexDe(blocCleIle(trouve) || "", 30)).substring(0, 43));
	return { ok: true, compte: compte, options: o, restriction: restr, cle: cleUtilisee, utilisateur: u };
}
function nomArchiveIle(h, gabarit){
	var d = dateIle(h);
	var iso = d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + "T" + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds());
	return String(gabarit).replace(/\{hostname\}|\{fqdn\}/g, function(x){ return x === "{fqdn}" ? h + "." + DOMAINE_ILE : h; }).replace(/\{now(?::([^}]*))?\}/g, function(t, f){
		if (!f) return iso;
		return f.replace(/%Y/g, d.getFullYear()).replace(/%m/g, deuxChiffres(d.getMonth() + 1)).replace(/%d/g, deuxChiffres(d.getDate())).replace(/%H/g, deuxChiffres(d.getHours())).replace(/%M/g, deuxChiffres(d.getMinutes())).replace(/%S/g, deuxChiffres(d.getSeconds()));
	}).replace(/\{user\}/g, "root");
}
function dateBorgIle(h, ms){ var d = dateIle(h, ms); return JOURS_EN[d.getDay()] + ", " + d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); }
/* Photographier des chemins de la machine (fichiers, dossiers, propriétaires, droits). */
function photographierIle(h, chemins, io){
	var entrees = [];
	chemins.forEach(function(c){
		var base = cheminNormal(c.charAt(0) === "/" ? c : cheminDuLieuMachine(current_room) + "/" + c);
		var d = dossierHote(h, base);
		var f = d ? null : fichierHote(h, base);
		if (!d && !f){ io.err(base + ": [Errno 2] No such file or directory: '" + base + "'"); return; }
		(function visiter(n, chemin){
			if (n instanceof Room){
				entrees.push({ c: chemin.substring(1), d: true, o: n.owner, g: groupeNoeud(h, n, chemin), m: n.mode });
				n.items.forEach(function(it){ visiter(it, chemin + "/" + it.itemname); });
				n.children.forEach(function(e){ if (e.parents[0] === n) visiter(e, chemin + "/" + e.room_name); });
			} else entrees.push({ c: chemin.substring(1), d: false, o: n.owner, g: groupeNoeud(h, n), m: n.mode, t: n.getText() });
		})(d || f, base);
	});
	return entrees;
}
function tailleTexteIle(o){ return o < 1000 ? o + " B" : (o / 1000).toFixed(2) + " kB"; }
function verrouBorgIle(d){ return etatBorgIle().depots[d.hote + ":" + d.chemin] ? etatBorgIle().depots[d.hote + ":" + d.chemin].verrou : null; }
Shell.sorts.borg = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/borg")) throw new ShellError("borg: command not found" + (h ? astuce(io, "borg est installé sur les Greniers (qui sauvegardent) et sur l'Arche (qui garde).") : ""), 127);
	var ordre = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var rsh = optionIle(args, ["--rsh"]);
	var lireEnv = function(n){ if (io.sudo && !Shell.enRoot) return ""; try { return Interpreteur.lire(n) || ""; } catch (e){ return ""; } };
	if (rsh === null) rsh = lireEnv("BORG_RSH") || null;
	var mots = argumentsIle(args, ["--rsh", "-e", "--encryption", "--compression", "-C", "--keep-daily", "--keep-weekly", "--keep-monthly", "--keep-last", "--keep-within", "--keep-hourly", "--keep-yearly", "--exclude", "--prefix", "-a", "--glob-archives", "--format", "--strip-components"]);
	var depotTexte = mots[1] || lireEnv("BORG_REPO");
	if (!ordre) throw new ShellError("usage: borg [-V] [-h] [--critical] [--error] [--warning] [--info] [--debug] [--debug-topic TOPIC] [-p] [--iec] [--log-json] [--lock-wait SECONDS]\n            [--bypass-lock] [--show-version] [--show-rc] [--umask M] [--remote-path PATH] [--remote-ratelimit RATE] [--upload-ratelimit RATE] [--remote-buffer UPLOAD_BUFFER]\n            [--upload-buffer UPLOAD_BUFFER] [--consider-part-files] [--debug-profile FILE] [--rsh RSH]\n            <command> ...", 2);
	if (ordre === "--version" || args.indexOf("--version") > -1 || args.indexOf("-V") > -1) return "borg 1.2.4";
	var d = lireDepotIle(h, depotTexte);
	if (!d) throw new ShellError("borg: error: argument REPOSITORY: Invalid location format: \"" + (depotTexte || "") + "\"", 2);
	var cleDepot = d.hote + ":" + d.chemin;
	var B = etatBorgIle(), depot = B.depots[cleDepot];
	// Le voyage : par ssh si le dépôt est ailleurs, sinon les droits du dossier sur place.
	var cnx = null;
	if (d.distant && d.hote !== h){
		cnx = connexionBorgIle(h, io, d, rsh);
		if (cnx.erreur){ evenementIle(h, "borg", { ordre: ordre, ok: false, erreur: cnx.erreur, depot: d.chemin }); throw new ShellError(cnx.erreur + (cnx.auth ? astuce(io, "La clé de ce compte n'est pas dans ~borg/.ssh/authorized_keys de l'Arche, ou borg n'emploie pas la bonne (--rsh \"ssh -i /root/.ssh/arche\", ou IdentityFile dans ~/.ssh/config).") : ""), 2); }
	} else if (!io.sudo){
		var dd = dossierHote(d.hote, dossierDe(d.chemin));
		if (dd && dd.owner !== JOUEUR && dd.mode.charAt(8) !== "x" && dd.mode.charAt(7) !== "w") throw new ShellError("Repository " + d.chemin + " does not exist." + astuce(io, "Ce dossier n'est accessible qu'à son propriétaire : sudo borg ..."), 2);
	}
	var verrou = depot && depot.verrou;
	var exigerDepot = function(){ if (!depot) throw new ShellError("Repository " + (d.distant ? "ssh://" + (d.utilisateur ? d.utilisateur + "@" : "") + d.hoteNom : "") + d.chemin + " does not exist.", 2); };
	var exigerVerrou = function(){
		if (verrou) throw new ShellError("Failed to create/acquire the lock " + d.chemin + "/lock.exclusive (timeout)." + astuce(io, "Un verrou est resté posé (une sauvegarde interrompue ?). Vérifie qu'aucune borg ne tourne, puis : borg break-lock " + depotTexte), 2);
	};
	var avecPhrase = function(nouvelle, suite){
		var env = lireEnv("BORG_PASSPHRASE");
		if (!nouvelle && depot && depot.chiffrement === "none") return suite("");
		if (env) return suite(env);
		if (!io.tty || !term || !term.demander) throw new ShellError("passphrase supplied in BORG_PASSPHRASE, by BORG_PASSCOMMAND or via BORG_PASSPHRASE_FD is incorrect.", 52);
		var nomDepot = (d.distant ? "ssh://" + (d.utilisateur ? d.utilisateur + "@" : "") + d.hoteNom : "") + d.chemin;
		if (nouvelle){
			term.demander("Enter new passphrase: ", true, function(a){ term.demander("Enter same passphrase again: ", true, function(b){
				if (a !== b){ term.echo("Passphrases do not match"); io.code = 2; Shell.fin(); return; }
				if (!a){ term.echo("Passphrase must not be blank"); io.code = 2; Shell.fin(); return; }
				term.demander("Do you want your passphrase to be displayed for verification? [yN]: ", false, function(){ var s; try { s = suite(a); } catch (e){ if (e instanceof ShellError){ s = e.message; io.code = e.code || 2; } else throw e; } if (s) term.echo(s); Shell.fin(); });
			}); });
		} else {
			term.demander("Enter passphrase for key " + nomDepot + ": ", true, function(a){ var s; try { s = suite(a); } catch (e){ if (e instanceof ShellError){ s = e.message; io.code = e.code || 2; } else throw e; } if (s) term.echo(s); Shell.fin(); });
		}
		return "";
	};
	var verifierPhrase = function(p){ if (depot.chiffrement !== "none" && p !== depot.phrase){ evenementIle(h, "borg", { ordre: ordre, ok: false, phrase: false }); throw new ShellError("passphrase supplied in BORG_PASSPHRASE, by BORG_PASSCOMMAND or via BORG_PASSPHRASE_FD is incorrect.", 52); } };
	var fin = function(infos){ var e = { ordre: ordre, ok: true, depot: d.chemin, hoteDepot: d.hote, depuis: h, restriction: cnx ? cnx.restriction : null, restrict: cnx ? cnx.options.restrict : null, commande: cnx ? cnx.options.commande : null, args: args.slice() }; for (var k in infos) e[k] = infos[k]; evenementIle(h, "borg", e); };
	switch (ordre){
	case "init":
		var chiffrement = optionIle(args, ["-e", "--encryption"]);
		if (!chiffrement) throw new ShellError("borg init: error: the following arguments are required: -e/--encryption", 2);
		if (["none", "repokey", "keyfile", "repokey-blake2", "keyfile-blake2", "authenticated"].indexOf(chiffrement) === -1) throw new ShellError("borg init: error: argument -e/--encryption: invalid choice: '" + chiffrement + "'", 2);
		if (depot) throw new ShellError("A repository already exists at " + d.chemin + ".", 2);
		if (!dossierHote(d.hote, dossierDe(d.chemin))) throw new ShellError("The parent path of the repo directory [" + dossierDe(d.chemin) + "] does not exist.", 2);
		var creer = function(p){
			var proprio = cnx ? cnx.utilisateur : (io.sudo ? "root" : JOUEUR);
			B.depots[cleDepot] = { chiffrement: chiffrement, phrase: p, archives: [], cree: maintenantMachine(d.hote), proprio: proprio, verrou: null };
			moteurSeul(function(){
				creerDossierHote(d.hote, d.chemin, { owner: proprio, mode: "rwx------" });
				poserFichierHote(d.hote, d.chemin + "/README", "This is a Borg Backup repository.\nSee https://borgbackup.readthedocs.io/\n", { owner: proprio, mode: "rw-------" });
				poserFichierHote(d.hote, d.chemin + "/config", "[repository]\nversion = 1\nsegments_per_dir = 1000\nmax_segment_size = 524288000\nappend_only = 0\nstorage_quota = 0\nadditional_free_space = 0\nid = " + hexDe("depot:" + cleDepot, 64) + "\n" + (chiffrement !== "none" ? "key = (la clé du dépôt, chiffrée par la phrase de passe)\n" : ""), { owner: proprio, mode: "rw-------" });
				creerDossierHote(d.hote, d.chemin + "/data", { owner: proprio, mode: "rwx------" });
				poserFichierHote(d.hote, d.chemin + "/hints.1", "", { owner: proprio, mode: "rw-------" });
				poserFichierHote(d.hote, d.chemin + "/index.1", "", { owner: proprio, mode: "rw-------" });
				poserFichierHote(d.hote, d.chemin + "/integrity.1", "", { owner: proprio, mode: "rw-------" });
				poserFichierHote(d.hote, d.chemin + "/nonce", hexDe("nonce" + cleDepot, 16), { owner: proprio, mode: "rw-------" });
			});
			fin({ chiffrement: chiffrement });
			if (chiffrement === "none") return "";
			return "\nBy default repositories initialized with this version will produce security\nerrors if written to with an older version (up to and including Borg 1.0.8).\n\nIf you want to use these older versions, you can disable the check by running:\nborg upgrade --disable-tam " + depotTexte + "\n\nSee https://borgbackup.readthedocs.io/en/stable/changes.html#pre-1-0-9-manifest-spoofing-vulnerability for details about the security implications.\n\nIMPORTANT: you will need both KEY AND PASSPHRASE to access this repo!\nIf you used a repokey mode, the key is stored in the repo, but you should back it up separately.\nUse \"borg key export\" to export the key, optionally in printable format.\nWrite down the passphrase. Store both at safe place(s).";
		};
		if (chiffrement === "none"){ io.err("Warning: Using unencrypted repository. Data are stored in plain text on the server."); return creer(""); }
		return avecPhrase(true, creer);
	case "create":
		exigerDepot(); exigerVerrou();
		if (!d.archive) throw new ShellError("borg create: error: argument ARCHIVE: Invalid location format: \"" + depotTexte + "\" (il manque ::NOM)", 2);
		var chemins = mots.slice(2);
		if (!chemins.length) throw new ShellError("borg create: error: Need at least one PATH argument.", 2);
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			var nom = nomArchiveIle(h, d.archive);
			if (depot.archives.some(function(a){ return a.nom === nom; })) throw new ShellError("Archive " + nom + " already exists", 2);
			var debut = maintenantMachine(h);
			var entrees = photographierIle(h, chemins, io);
			var taille = entrees.reduce(function(s, e){ return s + (e.t ? e.t.length : 0); }, 0);
			depot.archives.push({ nom: nom, date: debut, hote: h, entrees: entrees, taille: taille, empreinte: hexDe("archive:" + nom + debut, 64) });
			journalIle(h, "borg", null, "Archive " + nom + " created (" + entrees.length + " files)");
			fin({ archive: nom, nombre: entrees.length, chemins: chemins.map(function(c){ return cheminNormal(c); }) });
			if (args.indexOf("--stats") === -1 && args.indexOf("-s") === -1) return "";
			var tot = depot.archives.reduce(function(s, a){ return s + a.taille; }, 0);
			return ["------------------------------------------------------------------------------", "Repository: " + (d.distant ? "ssh://" + (d.utilisateur ? d.utilisateur + "@" : "") + d.hoteNom : "") + d.chemin, "Archive name: " + nom,
				"Archive fingerprint: " + hexDe("archive:" + nom + debut, 64), "Time (start): " + dateBorgIle(h, debut), "Time (end):   " + dateBorgIle(h, debut + 2710), "Duration: 2.71 seconds", "Number of files: " + entrees.filter(function(e){ return !e.d; }).length,
				"Utilization of max. archive size: 0%", "------------------------------------------------------------------------------", "                       Original size      Compressed size    Deduplicated size",
				"This archive:          " + completerGauche(tailleTexteIle(taille), 13) + "        " + completerGauche(tailleTexteIle(Math.round(taille * 0.6)), 13) + "        " + completerGauche(tailleTexteIle(Math.round(taille * 0.6)), 13),
				"All archives:          " + completerGauche(tailleTexteIle(tot), 13) + "        " + completerGauche(tailleTexteIle(Math.round(tot * 0.6)), 13) + "        " + completerGauche(tailleTexteIle(Math.round(taille * 0.6)), 13), "",
				"                       Unique chunks         Total chunks", "Chunk index:           " + completerGauche(entrees.length + 2, 13) + "        " + completerGauche(entrees.length * depot.archives.length + 2, 13), "------------------------------------------------------------------------------"].join("\n");
		});
	case "list":
		exigerDepot();
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			if (!d.archive){
				fin({ archives: depot.archives.map(function(a){ return a.nom; }) });
				return depot.archives.map(function(a){ return completerDroite(a.nom, 37) + dateBorgIle(h, a.date) + " [" + a.empreinte + "]"; }).join("\n");
			}
			var a = depot.archives.filter(function(x){ return x.nom === d.archive; })[0];
			if (!a) throw new ShellError("Archive " + d.archive + " does not exist", 2);
			fin({ archive: a.nom, contenu: true });
			return a.entrees.map(function(e){ return (e.d ? "d" : "-") + e.m + " " + completerDroite(e.o, 6) + " " + completerDroite(e.g, 6) + " " + completerGauche(e.t ? e.t.length : 0, 8) + " " + dateBorgIle(h, a.date) + " " + e.c; }).join("\n");
		});
	case "info":
		exigerDepot();
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			fin({});
			return "Repository ID: " + hexDe("depot:" + cleDepot, 64) + "\nLocation: " + (d.distant ? "ssh://" + (d.utilisateur ? d.utilisateur + "@" : "") + d.hoteNom : "") + d.chemin + "\nEncrypted: " + (depot.chiffrement === "none" ? "No" : "Yes (" + depot.chiffrement + ")") + (depot.chiffrement === "none" ? "" : "\nKey file: (dans le dépôt)") + "\nCache: /root/.cache/borg/" + hexDe("depot:" + cleDepot, 64) + "\nSecurity dir: /root/.config/borg/security/" + hexDe("depot:" + cleDepot, 64) + "\n------------------------------------------------------------------------------\nArchives : " + depot.archives.length;
		});
	case "check":
		exigerDepot(); exigerVerrou();
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			fin({ verifie: true });
			if (args.indexOf("-v") === -1 && args.indexOf("--verbose") === -1 && args.indexOf("--info") === -1) return "";
			return "Starting repository check\nfinished segment check at segment " + (depot.archives.length * 2 + 1) + "\nStarting repository index check\nIndex object count match.\nFinished full repository check, no problems found.\nStarting archive consistency check...\n" +
				depot.archives.map(function(a, i){ return "Analyzing archive " + a.nom + " (" + (i + 1) + "/" + depot.archives.length + ")"; }).join("\n") + (depot.archives.length ? "\n" : "") + "Archive consistency check complete, no problems found.";
		});
	case "prune":
		exigerDepot(); exigerVerrou();
		var regles = ["--keep-last", "--keep-hourly", "--keep-daily", "--keep-weekly", "--keep-monthly", "--keep-yearly"].map(function(k){ return [k, optionIle(args, [k])]; }).filter(function(x){ return x[1] !== null; });
		if (!regles.length && optionIle(args, ["--keep-within"]) === null) throw new ShellError("At least one of the \"keep-within\", \"keep-last\", \"keep-secondly\", \"keep-minutely\", \"keep-hourly\", \"keep-daily\", \"keep-weekly\", \"keep-monthly\" or \"keep-yearly\" settings must be specified.", 2);
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			var gardees = {};
			var tri = depot.archives.slice().sort(function(a, b){ return b.date - a.date; });
			regles.forEach(function(r){
				var n = +r[1], vus = {};
				tri.forEach(function(a){
					var dt = dateIle(h, a.date), cle = r[0] === "--keep-last" ? a.nom : (r[0] === "--keep-hourly" ? dt.toDateString() + dt.getHours() : (r[0] === "--keep-daily" ? dt.toDateString() : (r[0] === "--keep-weekly" ? dt.getFullYear() + "-" + Math.floor((dt - new Date(dt.getFullYear(), 0, 1)) / 604800000) : (r[0] === "--keep-monthly" ? dt.getFullYear() + "-" + dt.getMonth() : String(dt.getFullYear())))));
					if (!vus[cle] && Object.keys(vus).length < n){ vus[cle] = true; gardees[a.nom] = r[0].replace("--keep-", ""); }
				});
			});
			var supprimees = depot.archives.filter(function(a){ return !gardees[a.nom]; });
			if (args.indexOf("--dry-run") === -1 && args.indexOf("-n") === -1) depot.archives = depot.archives.filter(function(a){ return gardees[a.nom]; });
			fin({ gardees: Object.keys(gardees), supprimees: supprimees.map(function(a){ return a.nom; }) });
			if (args.indexOf("--list") === -1) return "";
			return depot.archives.concat(supprimees).sort(function(a, b){ return b.date - a.date; }).map(function(a){ return (gardees[a.nom] ? "Keeping archive (rule: " + gardees[a.nom] + " #1):" : "Pruning archive (1/" + supprimees.length + "):     ") + " " + completerDroite(a.nom, 37) + dateBorgIle(h, a.date) + " [" + a.empreinte + "]"; }).join("\n");
		});
	case "extract":
		exigerDepot();
		if (!d.archive) throw new ShellError("borg extract: error: argument ARCHIVE: il faut DEPOT::ARCHIVE", 2);
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			var a = depot.archives.filter(function(x){ return x.nom === d.archive; })[0];
			if (!a) throw new ShellError("Archive " + d.archive + " does not exist", 2);
			var filtres = mots.slice(2).map(function(x){ return x.replace(/^\//, "").replace(/\/$/, ""); });
			var choisies = a.entrees.filter(function(e){ return !filtres.length || filtres.some(function(f){ return e.c === f || e.c.indexOf(f + "/") === 0; }); });
			if (filtres.length && !choisies.length) io.err("Include pattern '" + filtres[0] + "' never matched.");
			var ici = cheminDuLieuMachine(current_room);
			var essai = args.indexOf("--dry-run") > -1 || args.indexOf("-n") > -1;
			if (!essai){
				if (!io.sudo && !Shell.bit(current_room, "w", io)) throw new ShellError("[Errno 13] Permission denied: '" + (choisies[0] ? choisies[0].c.split("/")[0] : ".") + "'", 2);
				moteurSeul(function(){
					choisies.forEach(function(e){
						var cible = cheminNormal(ici + "/" + e.c);
						if (e.d){ var r = creerDossierHote(h, cible, { owner: io.sudo ? e.o : JOUEUR, mode: e.m }); if (r && io.sudo){ r.owner = e.o; r.mode = e.m; if (e.g) r.groupe = e.g; } }
						else { var it = poserFichierHote(h, cible, e.t, {}); if (it){ it.setText(e.t); it.owner = io.sudo ? e.o : JOUEUR; it.mode = e.m; if (e.g && io.sudo) it.groupe = e.g; } }
					});
				});
			}
			fin({ archive: a.nom, extraits: choisies.length, ou: ici, essai: essai });
			return args.indexOf("--list") > -1 ? choisies.map(function(e){ return e.c; }).join("\n") : "";
		});
	case "delete":
		exigerDepot(); exigerVerrou();
		if (!d.archive) throw new ShellError("You requested to completely DELETE the repository *including* all archives it contains:" + astuce(io, "Ici, on n'efface qu'une archive : borg delete DEPOT::ARCHIVE."), 2);
		return avecPhrase(false, function(p){
			verifierPhrase(p);
			var avant = depot.archives.length;
			depot.archives = depot.archives.filter(function(x){ return x.nom !== d.archive; });
			if (avant === depot.archives.length) throw new ShellError("Archive " + d.archive + " does not exist", 2);
			fin({ archive: d.archive, supprime: true });
			return "";
		});
	case "compact":
		exigerDepot(); exigerVerrou(); fin({}); return "";
	case "break-lock":
		exigerDepot();
		var avait = !!depot.verrou;
		depot.verrou = null;
		moteurSeul(function(){ var r = dossierHote(d.hote, d.chemin); if (r){ var k = r.getChildFromName("lock.exclusive"); if (k !== -1) r.children = r.children.filter(function(x){ return x !== k; }); var f = r.getItemFromName("lock.roster"); if (f !== -1) r.removeItem(f); } });
		fin({ verrou: avait });
		return "";
	default:
		throw new ShellError("borg: error: argument <command>: invalid choice: '" + ordre + "' (choose from 'serve', 'init', 'check', 'key', 'change-passphrase', 'create', 'extract', 'export-tar', 'diff', 'rename', 'delete', 'list', 'mount', 'umount', 'info', 'break-lock', 'prune', 'compact', 'upgrade', 'recreate', 'import-tar', 'with-lock', 'config', 'debug', 'help', 'benchmark')", 2);
	}
};
/* Un verrou oublié sur un dépôt (la Tempête) : le dossier lock.exclusive, comme le laisse une sauvegarde coupée. */
function poserVerrouBorgIle(hote, chemin){
	var d = etatBorgIle().depots[hote + ":" + chemin];
	if (!d) return false;
	d.verrou = { pose: maintenantMachine(hote), par: "greniers@" + hexDe("verrou" + chemin, 12) + ".2210-0" };
	moteurSeul(function(){
		creerDossierHote(hote, chemin + "/lock.exclusive", { owner: d.proprio || "borg", mode: "rwx------" });
		poserFichierHote(hote, chemin + "/lock.exclusive/" + d.verrou.par, "", { owner: d.proprio || "borg" });
		poserFichierHote(hote, chemin + "/lock.roster", "{\"exclusive\": [[\"greniers@" + hexDe("verrou" + chemin, 12) + "\", 2210, 0]]}", { owner: d.proprio || "borg" });
	});
	return true;
}
