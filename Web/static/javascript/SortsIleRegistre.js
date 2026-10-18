/**
 * SortsIleRegistre.js : le moteur des services réseau de l'île, troisième partie : l'annuaire et l'identité.
 *
 *  - LDAP (slapd sur la machine registre) : un vrai petit annuaire. Les entrées, leurs classes (schéma core, cosine,
 *    nis, inetorgperson : attributs obligatoires, permis, syntaxe des nombres), la base cn=config (olcRootDN,
 *    olcRootPW, olcTLS...), les droits (anonyme : lecture sans userPassword ; rootdn : tout ; soi : son mot de passe),
 *    les filtres (&, |, !, =, =*, jokers), la portée (base, one, sub). Les commandes : ldapsearch, ldapadd, ldapmodify,
 *    ldapdelete, ldappasswd, ldapwhoami, slappasswd, slapcat ; -x, -D, -w, -W, -H (ldap://, ldapi:///), -Y EXTERNAL,
 *    -ZZ (StartTLS, voir SortsIleTer.js pour la confiance), -LLL, -c, -f.
 *  - sssd : sssd.conf (droits 0600 exigés, [sssd], [domain/...]), le cache (entry_cache_timeout, sss_cache -E),
 *    le mode hors ligne (le Registre muet : le cache répond).
 *  - NSS : nsswitch.conf (passwd, group : files sss) ; getent passwd / group, id, et les noms des fichiers (ls -l, chown,
 *    chgrp) passent par là sur les machines de l'île.
 */

/* ================================================================== */
/* Les noms distingués (DN)                                             */
/* ================================================================== */

var SUFFIXE_ILE = "dc=port-aube,dc=lan";
var ROOTDN_ILE = "cn=admin," + SUFFIXE_ILE;
function normeDnIle(dn){
	return String(dn || "").split(",").map(function(r){ var p = r.split("="); return p.length < 2 ? r.trim().toLowerCase() : p[0].trim().toLowerCase() + "=" + p.slice(1).join("=").trim().toLowerCase(); }).join(",");
}
function parentDnIle(dn){ var n = normeDnIle(dn); var i = n.indexOf(","); return i === -1 ? "" : n.substring(i + 1); }
function rdnIle(dn){ var p = String(dn).split(",")[0].split("="); return { attr: p[0].trim(), val: p.slice(1).join("=").trim() }; }
function dnValideIle(dn){ return String(dn).split(",").every(function(r){ return /^\s*[A-Za-z][A-Za-z0-9-]*\s*=\s*\S/.test(r); }); }
function sousDnIle(dn, base){ var a = normeDnIle(dn), b = normeDnIle(base); return a === b || (a.length > b.length && a.substring(a.length - b.length - 1) === "," + b); }

/* ================================================================== */
/* Le schéma                                                            */
/* ================================================================== */

var CLASSES_LDAP_ILE = {
	top: { must: ["objectClass"], may: [] },
	dcobject: { must: ["dc"], may: ["description"], aux: true },
	organization: { must: ["o"], may: ["description", "telephoneNumber", "l", "st", "street", "postalCode", "businessCategory"], structurelle: true },
	organizationalunit: { must: ["ou"], may: ["description", "telephoneNumber", "l", "businessCategory"], structurelle: true },
	person: { must: ["cn", "sn"], may: ["userPassword", "telephoneNumber", "description", "seeAlso"], structurelle: true },
	organizationalperson: { must: ["cn", "sn"], may: ["userPassword", "telephoneNumber", "description", "title", "ou", "l", "st", "street", "postalCode"], structurelle: true },
	inetorgperson: { must: ["cn", "sn"], may: ["userPassword", "telephoneNumber", "description", "title", "ou", "l", "givenName", "mail", "uid", "displayName", "initials", "employeeNumber", "employeeType", "mobile", "jpegPhoto", "preferredLanguage", "manager", "roomNumber"], structurelle: true },
	posixaccount: { must: ["cn", "uid", "uidNumber", "gidNumber", "homeDirectory"], may: ["userPassword", "loginShell", "gecos", "description"], aux: true },
	shadowaccount: { must: ["uid"], may: ["userPassword", "shadowLastChange", "shadowMin", "shadowMax", "shadowWarning", "shadowInactive", "shadowExpire", "shadowFlag", "description"], aux: true },
	posixgroup: { must: ["cn", "gidNumber"], may: ["userPassword", "memberUid", "description"], structurelle: true },
	groupofnames: { must: ["cn", "member"], may: ["description", "o", "ou", "owner", "seeAlso", "businessCategory"], structurelle: true },
	organizationalrole: { must: ["cn"], may: ["description", "roleOccupant", "telephoneNumber", "ou", "l"], structurelle: true },
	simplesecurityobject: { must: ["userPassword"], may: [], aux: true },
	account: { must: ["uid"], may: ["description", "host", "l", "o", "ou", "seeAlso"], structurelle: true },
	device: { must: ["cn"], may: ["description", "l", "o", "ou", "owner", "seeAlso", "serialNumber"], structurelle: true }
};
var ENTIERS_LDAP_ILE = ["uidnumber", "gidnumber", "shadowlastchange", "shadowmin", "shadowmax", "shadowwarning", "shadowinactive", "shadowexpire", "shadowflag"];
var MONOVALUES_LDAP_ILE = ["uidnumber", "gidnumber", "homedirectory", "loginshell", "gecos", "shadowlastchange", "displayname", "employeenumber", "preferredlanguage"];
function attributsConnusIle(){
	var l = {};
	Object.keys(CLASSES_LDAP_ILE).forEach(function(c){ CLASSES_LDAP_ILE[c].must.concat(CLASSES_LDAP_ILE[c].may).forEach(function(a){ l[a.toLowerCase()] = a; }); });
	l.objectclass = "objectClass";
	return l;
}
var ATTRIBUTS_LDAP_ILE = attributsConnusIle();
function nomAttributIle(a){ return ATTRIBUTS_LDAP_ILE[String(a).toLowerCase()] || null; }
/* Le contrôle d'une entrée par le schéma : null si elle est bonne, ou { code, texte, info }. */
function controleSchemaIle(attrs){
	var oc = (attrs.objectClass || []).map(function(c){ return c.toLowerCase(); });
	if (!oc.length) return { code: 65, texte: "Object class violation", info: "no objectClass attribute" };
	for (var i = 0; i < oc.length; i++) if (!CLASSES_LDAP_ILE[oc[i]]) return { code: 21, texte: "Invalid syntax", info: "objectClass: value #" + i + " invalid per syntax" };
	if (!oc.some(function(c){ return CLASSES_LDAP_ILE[c].structurelle; })) return { code: 65, texte: "Object class violation", info: "no structural object class provided" };
	var permis = { objectclass: true };
	var cles = Object.keys(attrs).map(function(a){ return a.toLowerCase(); });
	for (var k = 0; k < oc.length; k++){
		var cl = CLASSES_LDAP_ILE[oc[k]];
		for (var m = 0; m < cl.must.length; m++){
			if (cles.indexOf(cl.must[m].toLowerCase()) === -1) return { code: 65, texte: "Object class violation", info: "object class '" + (attrs.objectClass.filter(function(x){ return x.toLowerCase() === oc[k]; })[0]) + "' requires attribute '" + cl.must[m] + "'" };
		}
		cl.must.concat(cl.may).forEach(function(a){ permis[a.toLowerCase()] = true; });
	}
	for (var j = 0; j < cles.length; j++){
		if (!nomAttributIle(cles[j])) return { code: 17, texte: "Undefined attribute type", info: Object.keys(attrs)[j] + ": attribute type undefined" };
		if (!permis[cles[j]]) return { code: 65, texte: "Object class violation", info: "attribute '" + nomAttributIle(cles[j]) + "' not allowed" };
	}
	for (var a in attrs){
		if (!attrs.hasOwnProperty(a)) continue;
		var b = a.toLowerCase();
		if (ENTIERS_LDAP_ILE.indexOf(b) > -1){
			for (var v = 0; v < attrs[a].length; v++) if (!/^-?\d+$/.test(attrs[a][v])) return { code: 21, texte: "Invalid syntax", info: nomAttributIle(a) + ": value #" + v + " invalid per syntax" };
		}
		if (MONOVALUES_LDAP_ILE.indexOf(b) > -1 && attrs[a].length > 1) return { code: 19, texte: "Constraint violation", info: "attribute '" + nomAttributIle(a) + "' cannot have multiple values" };
	}
	return null;
}

/* ================================================================== */
/* L'annuaire : l'état de slapd                                         */
/* ================================================================== */

function ldapIle(){
	var e = etatIle("registre");
	if (!e.ldap || typeof e.ldap !== "object"){
		e.ldap = {
			entrees: [{ dn: SUFFIXE_ILE, attrs: { objectClass: ["top", "dcObject", "organization"], o: ["Port-Aube"], dc: ["port-aube"] }, cree: DATE_OUVERTURE_CH7 - 86400000 * 3, par: ROOTDN_ILE }],
			// Le sceau perdu pendant la traversée : un hachage dont personne ne connaît plus la phrase.
			config: { rootDN: ROOTDN_ILE, rootPW: "{SSHA}" + hexDe("sceau perdu en mer", 32), suffixe: SUFFIXE_ILE, tlsCert: null, tlsCle: null, tlsCA: null, logLevel: "none" }
		};
	}
	return e.ldap;
}
function entreeLdapIle(dn){ var n = normeDnIle(dn); return ldapIle().entrees.filter(function(x){ return normeDnIle(x.dn) === n; })[0] || null; }
function slapdTourne(){ return estMachine("registre") && serviceActifIle("registre", "slapd"); }
function valeursIle(entree, attr){
	var a = String(attr).toLowerCase();
	for (var k in entree.attrs) if (entree.attrs.hasOwnProperty(k) && k.toLowerCase() === a) return entree.attrs[k];
	return [];
}
function journalSlapdIle(message, prio){ journalIle("registre", "slapd", "slapd", message, prio); }

/* Les mots de passe : slappasswd fabrique des hachages ; le jeu se souvient de la phrase de chacun (sans la montrer). */
function hachagesIle(){ var c = sCh7(); if (!c.hachages || typeof c.hachages !== "object") c.hachages = {}; return c.hachages; }
function hacherSshaIle(phrase){
	var sel = hexDe("sel:" + phrase + ":" + state.nbCommandes + ":" + Math.random(), 8);
	var h = "{SSHA}" + btoa(hexDe("ssha:" + phrase + ":" + sel, 40).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); }) + sel.substring(0, 4)).replace(/=+$/, "") ;
	hachagesIle()[h] = phrase;
	return h;
}
function motDePasseCorrectIle(stocke, phrase){
	if (stocke === undefined || stocke === null) return false;
	stocke = String(stocke);
	if (/^\{(SSHA|SHA|CRYPT|MD5|SMD5)\}/i.test(stocke)) return hachagesIle()[stocke] === phrase;
	return stocke === phrase;
}

/* ================================================================== */
/* Les filtres                                                          */
/* ================================================================== */

function lireFiltreIle(texte){
	var t = String(texte || "(objectClass=*)").trim(), i = 0;
	if (t.charAt(0) !== "(") t = "(" + t + ")";
	function filtre(){
		if (t.charAt(i) !== "(") throw new Error("bad");
		i++;
		var c = t.charAt(i), r;
		if (c === "&" || c === "|"){ i++; var l = []; while (t.charAt(i) === "(") l.push(filtre()); r = { op: c, l: l }; }
		else if (c === "!"){ i++; r = { op: "!", f: filtre() }; }
		else {
			var j = t.indexOf(")", i);
			if (j === -1) throw new Error("bad");
			var s = t.substring(i, j), m = /^([A-Za-z][A-Za-z0-9-]*)(~=|>=|<=|=)(.*)$/.exec(s);
			if (!m) throw new Error("bad");
			r = { op: "cmp", attr: m[1], cmp: m[2], val: m[3] };
			i = j;
		}
		if (t.charAt(i) !== ")") throw new Error("bad");
		i++;
		return r;
	}
	var f = filtre();
	if (i !== t.length) throw new Error("bad");
	return f;
}
function filtreAccepteIle(f, entree){
	if (f.op === "&") return f.l.every(function(x){ return filtreAccepteIle(x, entree); });
	if (f.op === "|") return f.l.some(function(x){ return filtreAccepteIle(x, entree); });
	if (f.op === "!") return !filtreAccepteIle(f.f, entree);
	var vals = valeursIle(entree, f.attr);
	if (f.cmp === "=" && f.val === "*") return vals.length > 0;
	if (f.cmp === ">=" || f.cmp === "<=") return vals.some(function(v){ return f.cmp === ">=" ? +v >= +f.val : +v <= +f.val; });
	if (f.val.indexOf("*") > -1){
		var re = new RegExp("^" + f.val.split("*").map(function(x){ return x.replace(/[.+?^${}()|[\]\\]/g, "\\$&"); }).join(".*") + "$", "i");
		return vals.some(function(v){ return re.test(v); });
	}
	return vals.some(function(v){ return String(v).toLowerCase() === f.val.toLowerCase(); });
}

/* ================================================================== */
/* Le LDIF                                                              */
/* ================================================================== */

/* Les enregistrements d'un LDIF : [{ dn, ligne, changetype, attrs: [[attr, valeur]...], mods: [{ op, attr, vals }] }]. */
function lireLdifIle(texte){
	var lignes = String(texte || "").replace(/\r/g, "").split("\n"), depliees = [];
	lignes.forEach(function(l, n){
		if (/^ /.test(l) && depliees.length && depliees[depliees.length - 1].t !== "") depliees[depliees.length - 1].t += l.substring(1);
		else depliees.push({ t: l, n: n + 1 });
	});
	var recs = [], courant = null, erreur = null;
	depliees.forEach(function(x){
		if (erreur) return;
		var l = x.t;
		if (/^#/.test(l)) return;
		if (/^\s*$/.test(l)){ courant = null; return; }
		if (l === "-"){ if (courant) courant.mod = null; return; }
		var m = /^([A-Za-z][A-Za-z0-9;-]*)(::?)\s*(.*)$/.exec(l);
		if (!m){ erreur = { ligne: x.n, texte: "ldif_read_file: invalid line: \"" + l + "\"" }; return; }
		var cle = m[1], val = m[3];
		if (m[2] === "::"){ try { val = decodeURIComponent(escape(atob(val))); } catch (e){ val = m[3]; } }
		if (!courant){
			if (cle.toLowerCase() === "version") return;
			if (cle.toLowerCase() !== "dn"){ erreur = { ligne: x.n, texte: "ldapmodify: invalid format (line " + x.n + ") entry: \"\"" }; return; }
			courant = { dn: val.trim(), ligne: x.n, changetype: null, attrs: [], mods: [], mod: null };
			recs.push(courant);
			return;
		}
		var c = cle.toLowerCase();
		if (c === "changetype"){ courant.changetype = val.trim().toLowerCase(); return; }
		if (courant.changetype === "modify" && (c === "add" || c === "replace" || c === "delete") && !courant.mod){
			courant.mod = { op: c, attr: val.trim(), vals: [] };
			courant.mods.push(courant.mod);
			return;
		}
		if (courant.changetype === "modify"){
			if (!courant.mod){ erreur = { ligne: x.n, texte: "ldapmodify: modify operation type is missing at line " + x.n + ", entry \"" + courant.dn + "\"" }; return; }
			if (cle.toLowerCase() !== courant.mod.attr.toLowerCase()){ erreur = { ligne: x.n, texte: "ldapmodify: wrong attributeType at line " + x.n + ", entry \"" + courant.dn + "\"" }; return; }
			courant.mod.vals.push(val);
			return;
		}
		courant.attrs.push([cle, val]);
	});
	return { recs: recs, erreur: erreur };
}
function attrsDeListeIle(liste){
	var a = {};
	liste.forEach(function(p){
		var nom = nomAttributIle(p[0]) || p[0];
		(a[nom] = a[nom] || []).push(p[1]);
	});
	return a;
}
function texteEntreeIle(e, choix, voirMdp, operationnels){
	var l = ["dn: " + e.dn];
	var cles = Object.keys(e.attrs);
	var veut = function(a){ if (!choix || !choix.length || choix.indexOf("*") > -1) return true; return choix.some(function(c){ return c.toLowerCase() === a.toLowerCase(); }); };
	cles.forEach(function(k){
		if (!veut(k)) return;
		if (k.toLowerCase() === "userpassword" && !voirMdp) return;
		e.attrs[k].forEach(function(v){
			if (k.toLowerCase() === "userpassword" || /[^\x20-\x7e]/.test(v)) l.push(k + ":: " + btoa(unescape(encodeURIComponent(v))));
			else l.push(k + ": " + v);
		});
	});
	if (operationnels || (choix && choix.indexOf("+") > -1)){
		var d = new Date((e.cree || DATE_OUVERTURE_CH7) - DECALAGE_HISTOIRE * 3600000), z = d.getFullYear() + deuxChiffres(d.getMonth() + 1) + deuxChiffres(d.getDate()) + deuxChiffres(d.getHours()) + deuxChiffres(d.getMinutes()) + deuxChiffres(d.getSeconds()) + "Z";
		var dm = new Date((e.modifie || e.cree || DATE_OUVERTURE_CH7) - DECALAGE_HISTOIRE * 3600000), zm = dm.getFullYear() + deuxChiffres(dm.getMonth() + 1) + deuxChiffres(dm.getDate()) + deuxChiffres(dm.getHours()) + deuxChiffres(dm.getMinutes()) + deuxChiffres(dm.getSeconds()) + "Z";
		var oc = valeursIle(e, "objectClass").filter(function(c){ return CLASSES_LDAP_ILE[c.toLowerCase()] && CLASSES_LDAP_ILE[c.toLowerCase()].structurelle; });
		l.push("structuralObjectClass: " + (oc[oc.length - 1] || "organization"), "entryUUID: " + hexDe("uuid:" + normeDnIle(e.dn), 8) + "-" + hexDe("u2" + e.dn, 4) + "-" + hexDe("u3" + e.dn, 4) + "-" + hexDe("u4" + e.dn, 4) + "-" + hexDe("u5" + e.dn, 12),
			"creatorsName: " + (e.par || ROOTDN_ILE), "createTimestamp: " + z, "entryCSN: " + z.replace("Z", ".000000Z") + "#000000#000#000000", "modifiersName: " + (e.modifiePar || e.par || ROOTDN_ILE), "modifyTimestamp: " + zm);
	}
	return l.join("\n");
}

/* ================================================================== */
/* cn=config                                                            */
/* ================================================================== */

function entreesConfigIle(){
	var c = ldapIle().config, l = [];
	var g = { objectClass: ["olcGlobal"], cn: ["config"], olcArgsFile: ["/var/run/slapd/slapd.args"], olcLogLevel: [c.logLevel || "none"], olcPidFile: ["/var/run/slapd/slapd.pid"], olcToolThreads: ["1"] };
	if (c.tlsCA) g.olcTLSCACertificateFile = [c.tlsCA];
	if (c.tlsCert) g.olcTLSCertificateFile = [c.tlsCert];
	if (c.tlsCle) g.olcTLSCertificateKeyFile = [c.tlsCle];
	l.push({ dn: "cn=config", attrs: g });
	l.push({ dn: "cn=module{0},cn=config", attrs: { objectClass: ["olcModuleList"], cn: ["module{0}"], olcModulePath: ["/usr/lib/ldap"], olcModuleLoad: ["{0}back_mdb"] } });
	l.push({ dn: "cn=schema,cn=config", attrs: { objectClass: ["olcSchemaConfig"], cn: ["schema"] } });
	["core", "cosine", "nis", "inetorgperson"].forEach(function(s, i){ l.push({ dn: "cn={" + i + "}" + s + ",cn=schema,cn=config", attrs: { objectClass: ["olcSchemaConfig"], cn: ["{" + i + "}" + s] } }); });
	l.push({ dn: "olcDatabase={-1}frontend,cn=config", attrs: { objectClass: ["olcDatabaseConfig", "olcFrontendConfig"], olcDatabase: ["{-1}frontend"], olcAccess: ["{0}to * by dn.exact=gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth manage by * break", "{1}to dn.exact=\"\" by * read", "{2}to dn.base=\"cn=Subschema\" by * read"], olcSizeLimit: ["500"] } });
	l.push({ dn: "olcDatabase={0}config,cn=config", attrs: { objectClass: ["olcDatabaseConfig"], olcDatabase: ["{0}config"], olcAccess: ["{0}to * by dn.exact=gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth manage by * break"], olcRootDN: ["gidNumber=0+uidNumber=0,cn=peercred,cn=external,cn=auth"] } });
	l.push({ dn: "olcDatabase={1}mdb,cn=config", attrs: { objectClass: ["olcDatabaseConfig", "olcMdbConfig"], olcDatabase: ["{1}mdb"], olcDbDirectory: ["/var/lib/ldap"], olcSuffix: [c.suffixe], olcAccess: ["{0}to attrs=userPassword by self write by anonymous auth by * none", "{1}to attrs=shadowLastChange by self write by * read", "{2}to * by * read"], olcLastMod: ["TRUE"], olcRootDN: [c.rootDN], olcRootPW: [c.rootPW], olcDbCheckpoint: ["512 30"], olcDbIndex: ["objectClass eq", "cn,uid eq", "uidNumber,gidNumber eq", "member,memberUid eq"], olcDbMaxSize: ["1073741824"] } });
	return l;
}
/* Une modification de cn=config : les attributs que slapd sait changer à chaud. */
function modifierConfigIle(dn, mods){
	var c = ldapIle().config, n = normeDnIle(dn);
	var cibles = { "cn=config": ["olcTLSCertificateFile", "olcTLSCertificateKeyFile", "olcTLSCACertificateFile", "olcLogLevel"], "olcdatabase={1}mdb,cn=config": ["olcRootPW", "olcRootDN", "olcAccess", "olcDbIndex"] };
	if (!cibles[n]){
		if (entreesConfigIle().some(function(e){ return normeDnIle(e.dn) === n; })) return { code: 53, texte: "Server is unwilling to perform", info: "" };
		return { code: 32, texte: "No such object", info: "" };
	}
	var avant = copieJson(c);
	for (var i = 0; i < mods.length; i++){
		var m = mods[i], a = String(m.attr).toLowerCase();
		var permis = cibles[n].map(function(x){ return x.toLowerCase(); });
		if (permis.indexOf(a) === -1) return { code: 53, texte: "Server is unwilling to perform", info: "" };
		var v = m.vals[0];
		if (a === "olcrootpw") c.rootPW = m.op === "delete" ? null : v;
		else if (a === "olcrootdn"){ if (m.op === "delete") return { code: 53, texte: "Server is unwilling to perform", info: "" }; c.rootDN = v; }
		else if (a === "olcloglevel") c.logLevel = m.op === "delete" ? "none" : v;
		else if (/^olctls/.test(a)){
			var cle = a === "olctlscertificatefile" ? "tlsCert" : (a === "olctlscertificatekeyfile" ? "tlsCle" : "tlsCA");
			c[cle] = m.op === "delete" ? null : v;
		}
	}
	// slapd vérifie les fichiers TLS tout de suite : lisibles par openldap, et la clé qui va avec le certificat.
	if (c.tlsCert || c.tlsCle){
		var err = typeof controleTlsSlapdIle === "function" ? controleTlsSlapdIle(c) : null;
		if (err){ ldapIle().config = avant; journalSlapdIle("main: TLS init def ctx failed: -1", 3); return { code: 80, texte: "Other (e.g., implementation specific) error", info: "" }; }
	}
	journalSlapdIle("conn=1001 op=1 MOD dn=\"" + dn + "\"");
	return null;
}

/* ================================================================== */
/* Une connexion au Registre : où, qui, comment                         */
/* ================================================================== */

/* Le client LDAP : les options communes (-H, -x, -D, -w, -W, -y, -Y, -Z), et ldap.conf pour le reste. */
function lireOptionsLdapIle(args){
	var o = { simple: false, uri: null, dn: null, mdp: null, demander: false, fichierMdp: null, sasl: null, tls: 0, base: null, portee: "sub", lll: 0, continuer: false, fichier: null, ajouter: false, reste: [], s: null, nouveau: null, demanderNouveau: false };
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-x"){ o.simple = true; continue; }
		if (a === "-H"){ o.uri = args[++i]; continue; }
		if (a === "-h"){ o.uri = "ldap://" + args[++i]; continue; }
		if (a === "-D"){ o.dn = args[++i]; continue; }
		if (a === "-w"){ o.mdp = args[++i]; continue; }
		if (a === "-W"){ o.demander = true; continue; }
		if (a === "-y"){ o.fichierMdp = args[++i]; continue; }
		if (a === "-Y"){ o.sasl = (args[++i] || "").toUpperCase(); continue; }
		if (a === "-Q" || a === "-N" || a === "-v" || a === "-n" || a === "-M" || a === "-MM") continue;
		if (a === "-Z"){ o.tls = Math.max(o.tls, 1); continue; }
		if (a === "-ZZ"){ o.tls = 2; continue; }
		if (a === "-b"){ o.base = args[++i]; continue; }
		if (a === "-s"){ o.portee = args[++i]; o.s = o.portee; continue; }
		if (a === "-L"){ o.lll = Math.max(o.lll, 1); continue; }
		if (a === "-LL"){ o.lll = 2; continue; }
		if (a === "-LLL"){ o.lll = 3; continue; }
		if (a === "-c"){ o.continuer = true; continue; }
		if (a === "-f"){ o.fichier = args[++i]; continue; }
		if (a === "-a"){ o.ajouter = true; continue; }
		if (a === "-S"){ o.demanderNouveau = true; continue; }
		if (a === "-o" || a === "-z" || a === "-l" || a === "-P" || a === "-e" || a === "-E" || a === "-R" || a === "-U" || a === "-X" || a === "-O" || a === "-T" || a === "-a" && false){ i++; continue; }
		if (/^-[xZWLcQN]+$/.test(a)){
			a.substring(1).split("").forEach(function(c){ if (c === "x") o.simple = true; if (c === "W") o.demander = true; if (c === "Z") o.tls = Math.min(2, o.tls + 1); if (c === "L") o.lll++; if (c === "c") o.continuer = true; });
			continue;
		}
		if (a.charAt(0) === "-" && a.length > 1) throw new ShellError(a.substring(0, 2).replace("-", "") + ": invalid option\nusage: ldapsearch [options] [filter [attributes...]]", 1);
		o.reste.push(a);
	}
	return o;
}
function ldapConfClientIle(h){
	var r = {};
	(lireIle(h, "/etc/ldap/ldap.conf") || "").split("\n").forEach(function(l){ var m = /^\s*([A-Z_]+)\s+(.+)$/.exec(l); if (m) r[m[1]] = m[2].trim(); });
	return r;
}
/* Ouvrir la connexion : { serveur: "registre" ou null, local: ldapi, identite: dn ou "anonyme" ou "external-root" } ; ou une erreur. */
function connexionLdapIle(h, o, io, mdpDonne){
	var conf = ldapConfClientIle(h);
	var uri = o.uri || conf.URI || "ldap://localhost/";
	uri = String(uri).split(/\s+/)[0];
	var m = /^(ldapi|ldaps|ldap):\/\/([^\/:]*)(?::(\d+))?\/?$/.exec(uri.replace(/%2F/gi, "/"));
	if (!m && !/^ldapi:\/\//.test(uri)) return { erreur: "Could not create LDAP session handle for URI=" + uri + " (-9): Bad parameter to an ldap routine", code: 1 };
	var schema = m ? m[1] : "ldapi", hoteNom = m ? m[2] : "";
	var serveur = schema === "ldapi" ? h : resoudreHoteIle(hoteNom || "localhost");
	var nom = function(){ return "ldap_sasl_bind(SIMPLE): Can't contact LDAP server (-1)"; };
	if (!serveur || serveur !== "registre" || !slapdTourne()){
		return { erreur: o.sasl && !o.simple ? "ldap_sasl_interactive_bind: Can't contact LDAP server (-1)" : nom(), code: 255, injoignable: true, hote: hoteNom };
	}
	if (schema === "ldaps") return { erreur: "ldap_sasl_bind(SIMPLE): Can't contact LDAP server (-1)\n\tadditional info: (unknown error code)", code: 255, injoignable: true };
	var c = { serveur: "registre", local: schema === "ldapi", base: o.base || conf.BASE || null, tls: false, identite: "anonyme", uri: uri };
	// StartTLS : le serveur doit avoir un certificat, et le client doit faire confiance à qui l'a signé.
	if (o.tls){
		var t = typeof starttlsLdapIle === "function" ? starttlsLdapIle(h, conf) : { ok: false, erreur: "ldap_start_tls: Protocol error (2)\n\tadditional info: unsupported extended operation" };
		if (!t.ok){
			if (o.tls === 2) return { erreur: t.erreur, code: t.code || 1, tlsRefus: true };
			io.err(t.erreur.replace(/^ldap_start_tls: /, "ldap_start_tls: ").replace(/\n.*/, ""));
		} else c.tls = true;
	}
	if (o.sasl === "EXTERNAL"){
		if (!c.local) return { erreur: "SASL/EXTERNAL authentication started\nldap_sasl_interactive_bind: Unknown authentication method (-6)\n\tadditional info: SASL(-4): no mechanism available: ", code: 1 };
		io.err("SASL/EXTERNAL authentication started\nSASL username: gidNumber=" + (io.sudo ? 0 : 1000) + "+uidNumber=" + (io.sudo ? 0 : 1000) + ",cn=peercred,cn=external,cn=auth\nSASL SSF: 0");
		c.identite = io.sudo ? "external-root" : "external-" + JOUEUR;
		return c;
	}
	if (!o.simple && !o.sasl){
		return { erreur: "SASL/DIGEST-MD5 authentication started\nldap_sasl_interactive_bind: Invalid credentials (49)\n\tadditional info: SASL(-13): user not found: no secret in database", code: 49, sansX: true };
	}
	if (o.dn){
		var mdp = mdpDonne !== undefined ? mdpDonne : o.mdp;
		if (mdp === null || mdp === undefined || mdp === ""){
			if (o.dn) return { erreur: "ldap_bind: Server is unwilling to perform (53)\n\tadditional info: unauthenticated bind (DN with no password) disallowed", code: 53 };
		}
		var cfg = ldapIle().config;
		if (normeDnIle(o.dn) === normeDnIle(cfg.rootDN)){
			if (!motDePasseCorrectIle(cfg.rootPW, mdp)){ journalSlapdIle("conn=1002 op=0 RESULT tag=97 err=49 text="); evenementIle("registre", "ldapBind", { dn: o.dn, ok: false, depuis: h }); return { erreur: "ldap_bind: Invalid credentials (49)", code: 49 }; }
			c.identite = cfg.rootDN;
		} else {
			var e = entreeLdapIle(o.dn);
			var stocke = e ? valeursIle(e, "userPassword")[0] : null;
			if (!e || !motDePasseCorrectIle(stocke, mdp)){ evenementIle("registre", "ldapBind", { dn: o.dn, ok: false, depuis: h }); return { erreur: "ldap_bind: Invalid credentials (49)", code: 49 }; }
			c.identite = e.dn;
		}
		evenementIle("registre", "ldapBind", { dn: o.dn, ok: true, depuis: h, admin: c.identite === cfg.rootDN });
	}
	return c;
}
function estAdminLdapIle(c){ return c.identite === "external-root" || (c.identite !== "anonyme" && !/^external-/.test(c.identite) && normeDnIle(c.identite) === normeDnIle(ldapIle().config.rootDN)); }
/* Demander les mots de passe nécessaires (-W, -S), puis travailler. */
function avecMotsDePasseLdapIle(io, o, questions, travail){
	var demandes = [];
	if (o.demanderNouveau){ demandes.push(["New password: ", "nouveau"]); demandes.push(["Re-enter new password: ", "nouveau2"]); }
	if (o.demander) demandes.push(["Enter LDAP Password: ", "mdp"]);
	if (o.fichierMdp){
		try { o.mdp = lireFichierJoueurIle(o.fichierMdp, io, "ldap").texte.replace(/\n$/, ""); }
		catch (e){ throw new ShellError("Could not read password from " + o.fichierMdp, 1); }
	}
	if (!demandes.length) return travail({});
	if (!io.tty || !term || !term.demander) throw new ShellError("Could not get password: no terminal", 1);
	var reponses = {}, k = 0;
	function suivante(){
		if (k >= demandes.length){
			var sortie;
			try { sortie = travail(reponses); }
			catch (e){ if (e instanceof ShellError){ term.echo(e.message); io.code = e.code || 1; } else throw e; }
			if (sortie) term.echo(sortie);
			Shell.fin();
			return;
		}
		var d = demandes[k++];
		term.demander(d[0], true, function(r){ reponses[d[1]] = r; suivante(); });
	}
	suivante();
	return "";
}
function exigerClientLdapIle(io, cmd){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/bin/" + (cmd === "ldapadd" ? "ldapmodify" : cmd)) && !fichierHote(h, "/usr/bin/ldapsearch")) throw new ShellError(cmd + ": command not found" + (h ? astuce(io, "Les outils LDAP (ldap-utils) sont installés sur registre et sur quai.") : ""), 127);
	return h;
}

/* ================================================================== */
/* ldapsearch                                                           */
/* ================================================================== */

function chercherLdapIle(c, base, portee, filtre){
	var config = normeDnIle(base) === "cn=config" || /,cn=config$/.test(normeDnIle(base));
	var toutes = config ? entreesConfigIle() : ldapIle().entrees;
	var b = normeDnIle(base);
	if (!toutes.some(function(e){ return normeDnIle(e.dn) === b; })) return { code: 32 };
	var res = toutes.filter(function(e){
		var n = normeDnIle(e.dn);
		if (portee === "base") return n === b;
		if (portee === "one") return parentDnIle(n) === b;
		return sousDnIle(n, b);
	}).filter(function(e){ return filtreAccepteIle(filtre, e); });
	return { code: 0, entrees: res, config: config };
}
Shell.sorts.ldapsearch = function(args, io){
	var h = exigerClientLdapIle(io, "ldapsearch");
	var o = lireOptionsLdapIle(args);
	return avecMotsDePasseLdapIle(io, o, [], function(r){
		var c = connexionLdapIle(h, o, io, r.mdp);
		if (c.erreur){
			evenementIle(h, "ldapsearch", { ok: false, erreur: c.erreur, sansX: !!c.sansX, injoignable: !!c.injoignable, tls: !!o.tls });
			throw new ShellError(c.erreur + (c.sansX ? astuce(io, "Sans -x, ldapsearch tente une authentification SASL. Pour une connexion simple (anonyme, ou -D ... -W) : ldapsearch -x ...") :
				(c.injoignable ? astuce(io, "Personne ne répond à cette adresse : slapd tourne-t-il sur registre (systemctl status slapd) ? Et l'adresse : -H ldap://registre.port-aube.lan") : "")), c.code);
		}
		var base = c.base;
		if (!base){ evenementIle(h, "ldapsearch", { ok: false, sansBase: true }); return "# extended LDIF\n#\n# LDAPv3\n# base <> (default) with scope subtree\n# filter: (objectclass=*)\n# requesting: ALL\n#\n\n# search result\nsearch: 2\nresult: 32 No such object\n\n# numResponses: 1" + astuce(io, "Aucune base : précise-la avec -b dc=port-aube,dc=lan (ou BASE dans /etc/ldap/ldap.conf)."); }
		var mots = o.reste.slice(), texteFiltre = mots.length && /[=(]/.test(mots[0]) ? mots.shift() : "(objectclass=*)";
		var filtre;
		try { filtre = lireFiltreIle(texteFiltre); }
		catch (e){ throw new ShellError("ldapsearch: ldap_search_ext: Bad search filter (-7)", 255); }
		if (c.local === false && /cn=config$/i.test(normeDnIle(base)) && !estAdminLdapIle(c)) {
			evenementIle(h, "ldapsearch", { ok: false, base: base, refus: true });
			return (o.lll < 3 ? "# extended LDIF\n#\n# LDAPv3\n# base <" + base + "> with scope " + (o.portee === "sub" ? "subtree" : o.portee) + "\n# filter: " + texteFiltre + "\n# requesting: ALL\n#\n\n" : "") + "# search result\nsearch: 2\nresult: 32 No such object\n\n# numResponses: 1";
		}
		var res = chercherLdapIle(c, base, o.portee === "one" || o.portee === "onelevel" ? "one" : (o.portee === "base" ? "base" : "sub"), filtre);
		if (res.config && !estAdminLdapIle(c)){ res = { code: 50, entrees: [] }; }
		var admin = estAdminLdapIle(c);
		var lignes = [];
		if (o.lll < 3) lignes.push("# extended LDIF", "#", "# LDAPv3", "# base <" + base + ">" + (o.base ? "" : " (default)") + " with scope " + (o.portee === "sub" ? "subtree" : (o.portee === "one" ? "oneLevel" : o.portee)), "# filter: " + texteFiltre, "# requesting: " + (mots.length ? mots.join(" ") + " " : "ALL"), "#", "");
		(res.entrees || []).forEach(function(e){
			var voir = admin || (c.identite !== "anonyme" && normeDnIle(c.identite) === normeDnIle(e.dn));
			if (o.lll < 3) lignes.push("# " + e.dn.split(",").map(function(r){ return r.split("=").slice(1).join("="); }).join(", ").replace(/port-aube, lan$/, "port-aube.lan"));
			lignes.push(texteEntreeIle(e, mots.length ? mots : null, voir || res.config, false), "");
		});
		if (o.lll < 3){
			lignes.push("# search result", "search: 2", "result: " + (res.code === 32 ? "32 No such object" : (res.code === 50 ? "50 Insufficient access" : "0 Success")), "", "# numResponses: " + ((res.entrees || []).length + 1));
			if ((res.entrees || []).length) lignes.push("# numEntries: " + res.entrees.length);
		} else if (res.code === 32) { io.code = 32; lignes.push("No such object (32)"); }
		evenementIle(h, "ldapsearch", { ok: res.code === 0, base: base, filtre: texteFiltre, nombre: (res.entrees || []).length, dns: (res.entrees || []).map(function(e){ return e.dn; }), admin: admin, tls: c.tls, attributs: mots, config: !!res.config, identite: c.identite });
		if (res.code === 32) io.code = 32;
		return lignes.join("\n").replace(/\n+$/, "");
	});
};

/* ================================================================== */
/* ldapadd, ldapmodify, ldapdelete                                      */
/* ================================================================== */

function ecrireDnPermisIle(c, dn){
	if (estAdminLdapIle(c)) return true;
	return false;
}
function appliquerLdifIle(h, c, recs, defaut, o, io){
	var sortie = [], ok = 0, erreurs = 0;
	var L = ldapIle();
	for (var i = 0; i < recs.length; i++){
		var r = recs[i], type = r.changetype || defaut, err = null;
		var surConfig = /(^|,)cn=config$/.test(normeDnIle(r.dn));
		if (!dnValideIle(r.dn)){ err = { code: 34, texte: "Invalid DN syntax", info: "invalid DN" }; }
		else if (surConfig){
			sortie.push("modifying entry \"" + r.dn + "\"");
			if (c.identite !== "external-root") err = { code: 50, texte: "Insufficient access", info: "" };
			else if (type !== "modify") err = { code: 53, texte: "Server is unwilling to perform", info: "" };
			else err = modifierConfigIle(r.dn, r.mods);
			if (!err) evenementIle("registre", "ldapConfig", { dn: r.dn, attrs: r.mods.map(function(m){ return m.attr; }) });
		} else if (type === "add"){
			sortie.push("adding new entry \"" + r.dn + "\"");
			var attrs = attrsDeListeIle(r.attrs);
			if (!ecrireDnPermisIle(c, r.dn)) err = { code: 50, texte: "Insufficient access", info: "no write access to parent" };
			else if (!sousDnIle(r.dn, L.config.suffixe)) err = { code: 53, texte: "Server is unwilling to perform", info: "no global superior knowledge" };
			else if (entreeLdapIle(r.dn)) err = { code: 68, texte: "Already exists", info: "" };
			else if (!entreeLdapIle(parentDnIle(r.dn)) && normeDnIle(r.dn) !== normeDnIle(L.config.suffixe)) err = { code: 32, texte: "No such object", info: "", matched: (function(){ var p = parentDnIle(r.dn); while (p && !entreeLdapIle(p)) p = parentDnIle(p); return p ? (entreeLdapIle(p) || {}).dn : null; })() };
			else {
				err = controleSchemaIle(attrs);
				if (!err){
					var rdn = rdnIle(r.dn);
					if (!valeursIle({ attrs: attrs }, rdn.attr).some(function(v){ return v.toLowerCase() === rdn.val.toLowerCase(); })) (attrs[nomAttributIle(rdn.attr) || rdn.attr] = attrs[nomAttributIle(rdn.attr) || rdn.attr] || []).push(rdn.val);
					L.entrees.push({ dn: r.dn, attrs: attrs, cree: maintenantMachine("registre"), par: estAdminLdapIle(c) ? L.config.rootDN : c.identite });
					journalSlapdIle("conn=1003 op=" + (i + 1) + " ADD dn=\"" + r.dn + "\"");
					evenementIle("registre", "ldapAdd", { dn: r.dn, depuis: h });
				}
			}
		} else if (type === "delete"){
			sortie.push("deleting entry \"" + r.dn + "\"");
			var e = entreeLdapIle(r.dn);
			if (!ecrireDnPermisIle(c, r.dn)) err = { code: 50, texte: "Insufficient access", info: "" };
			else if (!e) err = { code: 32, texte: "No such object", info: "" };
			else if (L.entrees.some(function(x){ return parentDnIle(x.dn) === normeDnIle(r.dn); })) err = { code: 66, texte: "Operation not allowed on non-leaf", info: "subordinate objects must be deleted first" };
			else { L.entrees = L.entrees.filter(function(x){ return x !== e; }); journalSlapdIle("conn=1003 op=" + (i + 1) + " DEL dn=\"" + r.dn + "\""); evenementIle("registre", "ldapDelete", { dn: r.dn, depuis: h }); }
		} else if (type === "modify"){
			sortie.push("modifying entry \"" + r.dn + "\"");
			var e2 = entreeLdapIle(r.dn);
			var soi = e2 && c.identite !== "anonyme" && normeDnIle(c.identite) === normeDnIle(e2.dn);
			var seulementMdp = r.mods.every(function(m){ return m.attr.toLowerCase() === "userpassword"; });
			if (!estAdminLdapIle(c) && !(soi && seulementMdp)) err = { code: 50, texte: "Insufficient access", info: "no write access to entry" };
			else if (!e2) err = { code: 32, texte: "No such object", info: "" };
			else {
				var neuf = copieJson(e2.attrs);
				for (var k = 0; k < r.mods.length && !err; k++){
					var m = r.mods[k], nom = nomAttributIle(m.attr);
					if (!nom){ err = { code: 17, texte: "Undefined attribute type", info: m.attr + ": attribute type undefined" }; break; }
					var cleEx = Object.keys(neuf).filter(function(x){ return x.toLowerCase() === nom.toLowerCase(); })[0] || nom;
					var actuel = neuf[cleEx] || [];
					if (m.op === "add"){
						for (var v = 0; v < m.vals.length; v++) if (actuel.some(function(x){ return x.toLowerCase() === m.vals[v].toLowerCase(); })){ err = { code: 20, texte: "Type or value exists", info: "modify/add: " + nom + ": value #" + v + " already exists" }; }
						neuf[cleEx] = actuel.concat(m.vals);
					} else if (m.op === "replace"){
						if (m.vals.length) neuf[cleEx] = m.vals.slice(); else delete neuf[cleEx];
					} else {
						if (!actuel.length){ err = { code: 16, texte: "No such attribute", info: "modify/delete: " + nom + ": no such attribute" }; break; }
						if (m.vals.length){
							var reste = actuel.filter(function(x){ return !m.vals.some(function(y){ return y.toLowerCase() === x.toLowerCase(); }); });
							if (reste.length === actuel.length){ err = { code: 16, texte: "No such attribute", info: "modify/delete: " + nom + ": no such value" }; break; }
							if (reste.length) neuf[cleEx] = reste; else delete neuf[cleEx];
						} else delete neuf[cleEx];
					}
				}
				if (!err) err = controleSchemaIle(neuf);
				if (!err){
					e2.attrs = neuf; e2.modifie = maintenantMachine("registre"); e2.modifiePar = estAdminLdapIle(c) ? L.config.rootDN : c.identite;
					journalSlapdIle("conn=1003 op=" + (i + 1) + " MOD dn=\"" + r.dn + "\"");
					evenementIle("registre", "ldapModify", { dn: r.dn, attrs: r.mods.map(function(x){ return x.attr; }), depuis: h });
				}
			}
		} else err = { code: 2, texte: "Protocol error", info: "unknown changetype " + type };
		if (err){
			erreurs++;
			var verbe = type === "add" ? "ldap_add" : (type === "delete" ? "ldap_delete" : "ldap_modify");
			var msg = verbe + ": " + err.texte + " (" + err.code + ")" + (err.matched ? "\n\tmatched DN: " + err.matched : "") + (err.info ? "\n\tadditional info: " + err.info : "");
			sortie.push(msg);
			evenementIle("registre", "ldapErreur", { dn: r.dn, code: err.code, texte: err.texte, info: err.info, type: type, depuis: h });
			if (!o.continuer){ io.code = err.code; break; }
			sortie.push("");
		} else { ok++; sortie.push(""); }
	}
	if (erreurs && o.continuer) io.code = 0;
	return sortie.join("\n").replace(/\n+$/, "");
}
function ldifEntreeIle(o, io){
	if (o.fichier){
		try { return lireFichierJoueurIle(o.fichier, io, "ldapmodify").texte; }
		catch (e){ throw new ShellError("ldapmodify: " + o.fichier + ": " + (/Permission/.test(e.message) ? "Permission denied" : "No such file or directory"), 254); }
	}
	if (io.stdin !== null && io.stdin !== undefined) return io.stdin;
	throw new ShellError("ldapmodify: aucune entrée à lire" + astuce(io, "Donne le LDIF avec -f fichier.ldif, ou par l'entrée standard (ldapadd ... < fichier.ldif)."), 1);
}
function ldapEcrireIle(cmd, defaut){
	return function(args, io){
		var h = exigerClientLdapIle(io, cmd);
		var o = lireOptionsLdapIle(args);
		if (o.ajouter) defaut = "add";
		var texte = ldifEntreeIle(o, io);
		var lu = lireLdifIle(texte);
		if (lu.erreur){ evenementIle(h, cmd, { ok: false, ldif: true }); throw new ShellError(lu.erreur.texte, 1); }
		if (!lu.recs.length) return "";
		return avecMotsDePasseLdapIle(io, o, [], function(r){
			var c = connexionLdapIle(h, o, io, r.mdp);
			if (c.erreur){
				evenementIle(h, cmd, { ok: false, erreur: c.erreur });
				throw new ShellError(c.erreur + (c.sansX ? astuce(io, "Il manque -x (connexion simple) : " + cmd + " -x -D cn=admin,dc=port-aube,dc=lan -W -f ...") : ""), c.code);
			}
			var avant = io.code;
			var s = appliquerLdifIle(h, c, lu.recs, defaut, o, io);
			evenementIle(h, cmd, { ok: !io.code, nombre: lu.recs.length, identite: c.identite });
			return s;
		});
	};
}
Shell.sorts.ldapadd = ldapEcrireIle("ldapadd", "add");
Shell.sorts.ldapmodify = ldapEcrireIle("ldapmodify", "modify");
Shell.sorts.ldapdelete = function(args, io){
	var h = exigerClientLdapIle(io, "ldapdelete");
	var o = lireOptionsLdapIle(args);
	var dns = o.reste.slice();
	if (!dns.length && io.stdin) dns = io.stdin.split("\n").filter(Boolean);
	if (!dns.length) throw new ShellError("ldapdelete: no DN given", 1);
	return avecMotsDePasseLdapIle(io, o, [], function(r){
		var c = connexionLdapIle(h, o, io, r.mdp);
		if (c.erreur) throw new ShellError(c.erreur, c.code);
		var s = appliquerLdifIle(h, c, dns.map(function(d){ return { dn: d, changetype: "delete", attrs: [], mods: [] }; }), "delete", o, io);
		return s.split("\n").filter(function(l){ return !/^deleting entry/.test(l); }).join("\n");
	});
};
Shell.sorts.ldapwhoami = function(args, io){
	var h = exigerClientLdapIle(io, "ldapwhoami");
	var o = lireOptionsLdapIle(args);
	return avecMotsDePasseLdapIle(io, o, [], function(r){
		var c = connexionLdapIle(h, o, io, r.mdp);
		if (c.erreur) throw new ShellError(c.erreur, c.code);
		if (c.identite === "anonyme") return "anonymous";
		if (/^external-/.test(c.identite)) return "dn:gidNumber=" + (io.sudo ? 0 : 1000) + "+uidNumber=" + (io.sudo ? 0 : 1000) + ",cn=peercred,cn=external,cn=auth";
		return "dn:" + c.identite;
	});
};
Shell.sorts.ldappasswd = function(args, io){
	var h = exigerClientLdapIle(io, "ldappasswd");
	var o = lireOptionsLdapIle(args.filter(function(a, i){ return a !== "-s" || false; }));
	var nouveauDonne = optionIle(args, ["-s"]);
	o.portee = "sub";
	var cible = o.reste[0] || o.dn;
	if (nouveauDonne !== null){ o.demanderNouveau = false; o.reste = o.reste.filter(function(x){ return x !== nouveauDonne; }); cible = o.reste[0] || o.dn; }
	return avecMotsDePasseLdapIle(io, o, [], function(r){
		var nouveau = nouveauDonne !== null ? nouveauDonne : r.nouveau;
		if (o.demanderNouveau && r.nouveau !== r.nouveau2) throw new ShellError("passwords do not match", 1);
		var c = connexionLdapIle(h, o, io, r.mdp);
		if (c.erreur) throw new ShellError(c.erreur, c.code);
		var e = entreeLdapIle(cible);
		if (!e) throw new ShellError("Result: No such object (32)", 32);
		if (!estAdminLdapIle(c) && normeDnIle(c.identite) !== normeDnIle(e.dn)) throw new ShellError("Result: Insufficient access (50)", 50);
		var genere = nouveau === undefined || nouveau === null;
		if (genere) nouveau = hexDe("genere:" + e.dn + state.nbCommandes, 8);
		var cle = Object.keys(e.attrs).filter(function(x){ return x.toLowerCase() === "userpassword"; })[0] || "userPassword";
		e.attrs[cle] = [hacherSshaIle(nouveau)];
		e.modifie = maintenantMachine("registre");
		evenementIle("registre", "ldapModify", { dn: e.dn, attrs: ["userPassword"], depuis: h, motDePasse: true });
		return genere ? "New password: " + nouveau : "";
	});
};
Shell.sorts.slappasswd = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/sbin/slappasswd")) throw new ShellError("slappasswd: command not found", 127);
	var s = optionIle(args, ["-s"]);
	if (s !== null){ var hs = hacherSshaIle(s); evenementIle(h, "slappasswd", { hachage: hs }); return hs; }
	if (!io.tty || !term || !term.demander) throw new ShellError("slappasswd: no terminal", 1);
	term.demander("New password: ", true, function(a){
		term.demander("Re-enter new password: ", true, function(b){
			if (a !== b){ term.echo("Password values do not match"); io.code = 1; Shell.fin(); return; }
			var hh = hacherSshaIle(a);
			evenementIle(h, "slappasswd", { hachage: hh });
			term.echo(hh);
			Shell.fin();
		});
	});
	return "";
};
Shell.sorts.slapcat = function(args, io){
	var h = ileIci();
	if (h !== "registre") throw new ShellError("slapcat: command not found", 127);
	if (!io.sudo) throw new ShellError(cheminSlapcat() + "mdb_db_open: database \"" + SUFFIXE_ILE + "\": database \"" + SUFFIXE_ILE + "\" cannot be opened: Permission denied (13). Restore from backup!\nbackend_startup_one (type=mdb, suffix=\"" + SUFFIXE_ILE + "\"): bi_db_open failed! (13)\nslap_startup failed" + astuce(io, "slapcat lit la base directement sur le disque : sudo slapcat"), 1);
	var b = optionIle(args, ["-b"]);
	var l = (b && /cn=config/i.test(b)) ? entreesConfigIle() : ldapIle().entrees;
	evenementIle(h, "slapcat", { config: !!(b && /cn=config/i.test(b)), nombre: l.length });
	return l.map(function(e){ return texteEntreeIle(e, null, true, true); }).join("\n\n");
};
function cheminSlapcat(){ var d = new Date(maintenantMachine("registre")); return hexDe("slapcat" + d.getTime(), 8) + " "; }
/* slapd : le service démarre si sa base de configuration est là ; sinon le Registre se tait. */
controleAvantDemarrage(function(h, unite){
	if (h !== "registre" || unite !== "slapd.service") return null;
	if (!dossierHote(h, "/etc/ldap/slapd.d")) return "slapd: could not stat config file \"/etc/ldap/slapd.d\": No such file or directory (2)";
	return null;
});
GameEvents.addListener("machine", function(e){
	if (e.hote === "registre" && e.unite === "slapd.service" && e.cmd === "unite" && e.action === "lancee"){
		var c = ldapIle().config;
		journalSlapdIle("@(#) $OpenLDAP: slapd 2.5.13+dfsg-5 (Feb  8 2023 01:41:11) $\n\tDebian OpenLDAP Maintainers <pkg-openldap-devel@lists.alioth.debian.org>");
		if (c.tlsCert && typeof controleTlsSlapdIle === "function" && controleTlsSlapdIle(c)) journalSlapdIle("main: TLS init def ctx failed: -1", 3);
		journalSlapdIle("slapd starting");
	}
});

/* ================================================================== */
/* sssd                                                                 */
/* ================================================================== */

function iniIle(texte){
	var r = { sections: {}, ordre: [], erreur: null }, cour = null;
	String(texte || "").split("\n").forEach(function(l, i){
		if (r.erreur) return;
		var t = l.replace(/^\s+|\s+$/g, "");
		if (!t || /^[#;]/.test(t)) return;
		var s = /^\[([^\]]+)\]$/.exec(t);
		if (s){ cour = s[1].trim(); r.sections[cour] = r.sections[cour] || {}; r.ordre.push(cour); return; }
		var kv = /^([^=]+?)\s*=\s*(.*)$/.exec(t);
		if (!kv || !cour){ r.erreur = { ligne: i + 1, texte: t }; return; }
		r.sections[cour][kv[1].trim().toLowerCase()] = kv[2].trim();
	});
	return r;
}
/* La configuration de sssd telle qu'il la lit au démarrage : { ok, domaine, conf } ou { erreur }. */
function configSssdIle(h){
	var it = fichierHote(h, "/etc/sssd/sssd.conf");
	var conf = {}, ini = null;
	if (it){
		if (it.owner !== "root" || !/^rw-------$/.test(it.mode)) return { erreur: "[sssd] [main] (0x0010): File ownership and permissions check failed. Expected root:root and 0600.", droits: true };
		ini = iniIle(it.getText());
		if (ini.erreur) return { erreur: "[sssd] [sss_ini_read_sssd_conf] (0x0020): Config merge error: Failed to parse /etc/sssd/sssd.conf, line " + ini.ligne + ": \"" + ini.erreur.texte + "\"" };
	}
	// Les morceaux de conf.d (droits 0600 aussi).
	var morceaux = fichiersDuDossier(h, "/etc/sssd/conf.d").filter(function(f){ return /\.conf$/.test(f.nom); });
	for (var i = 0; i < morceaux.length; i++){
		if (morceaux[i].item.owner !== "root" || morceaux[i].item.mode !== "rw-------") return { erreur: "[sssd] [main] (0x0010): File ownership and permissions check failed for " + morceaux[i].chemin + ". Expected root:root and 0600.", droits: true };
		var mi = iniIle(morceaux[i].item.getText());
		if (mi.erreur) return { erreur: "[sssd] [sss_ini_read_sssd_conf] (0x0020): Config merge error: Failed to parse " + morceaux[i].chemin + ", line " + mi.erreur.ligne };
		ini = ini || { sections: {}, ordre: [] };
		Object.keys(mi.sections).forEach(function(s){ ini.sections[s] = ini.sections[s] || {}; for (var k in mi.sections[s]) ini.sections[s][k] = mi.sections[s][k]; });
	}
	if (!ini) return { erreur: "[sssd] [load_configuration] (0x0010): Unable to load configuration from /etc/sssd/sssd.conf.\nSSSD couldn't load the configuration database [2]: No such file or directory.", absent: true };
	var s = ini.sections.sssd || {};
	var domaines = (s.domains || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean);
	if (!domaines.length) return { erreur: "[sssd] [confdb_get_domains] (0x0010): No domains configured, fatal error!" };
	var d = ini.sections["domain/" + domaines[0]];
	if (!d) return { erreur: "[sssd] [confdb_get_domain_internal] (0x0010): Unknown domain [" + domaines[0] + "]" };
	if (["ldap", "files", "proxy", "ad", "ipa", "krb5"].indexOf(d.id_provider || "") === -1) return { erreur: "[sssd] [confdb_get_domain_internal] (0x0010): " + (d.id_provider ? "Unknown id provider [" + d.id_provider + "]" : "Domain [" + domaines[0] + "] does not specify an ID provider, disabling!") };
	return { ok: true, domaine: domaines[0], conf: d, services: (s.services || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean) };
}
function etatSssdIle(h){ var e = etatIle(h); if (!e.sssd || typeof e.sssd !== "object") e.sssd = { cache: {}, groupes: {} }; if (!e.sssd.cache) e.sssd.cache = {}; if (!e.sssd.groupes) e.sssd.groupes = {}; return e.sssd; }
controleAvantDemarrage(function(h, unite){
	if (!estHoteIle(h) || unite !== "sssd.service") return null;
	var c = configSssdIle(h);
	if (c.ok) return null;
	journalIle(h, "sssd", "sssd", c.erreur, 3);
	return c.erreur;
});
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || e.unite !== "sssd.service") return;
	if ((e.cmd === "unite" && e.action === "lancee") || (e.cmd === "systemctl" && e.action === "reload" && e.actif)){
		var c = configSssdIle(e.hote);
		if (c.ok){ etatSssdIle(e.hote).charge = copieJson(c); journalIle(e.hote, "sssd", "sssd", "Starting up"); journalIle(e.hote, "sssd_be", "sssd", "Backend is online"); }
	}
});
function sssdActifIle(h){ return serviceActifIle(h, "sssd") && !!etatSssdIle(h).charge; }
function nssUtiliseIle(h, base){
	var l = (lireIle(h, "/etc/nsswitch.conf") || "").split("\n").filter(function(x){ return new RegExp("^\\s*" + base + "\\s*:").test(x); })[0] || "";
	return /\bsss\b/.test(l.replace(/#.*$/, ""));
}
/* Le Registre, vu depuis sssd : joignable ? la base, l'URI, et la confiance TLS si on la demande. */
function registrePourSssdIle(h){
	var ch = etatSssdIle(h).charge;
	if (!ch) return { ok: false };
	var d = ch.conf;
	var uri = (d.ldap_uri || "").split(",")[0].trim();
	var m = /^(ldaps?):\/\/([^\/:]+)/.exec(uri);
	if (!m || resoudreHoteIle(m[2]) !== "registre") return { ok: false, raison: "uri" };
	if (!slapdTourne()) return { ok: false, raison: "injoignable" };
	if (m[1] === "ldaps") return { ok: false, raison: "ldaps" };
	var tls = /^(true|yes|1)$/i.test(d.ldap_id_use_start_tls || "");
	if (tls && typeof starttlsLdapIle === "function"){
		var t = starttlsLdapIle(h, { TLS_CACERT: d.ldap_tls_cacert || "/etc/ssl/certs/ca-certificates.crt", TLS_REQCERT: d.ldap_tls_reqcert || "demand" });
		if (!t.ok) return { ok: false, raison: "tls" };
	}
	return { ok: true, base: d.ldap_search_base || ldapIle().config.suffixe, tls: tls };
}
function compteDepuisEntreeIle(e){
	return { nom: valeursIle(e, "uid")[0], uid: +valeursIle(e, "uidNumber")[0], gid: +valeursIle(e, "gidNumber")[0], gecos: valeursIle(e, "gecos")[0] || valeursIle(e, "cn")[0] || "",
		home: valeursIle(e, "homeDirectory")[0], shell: valeursIle(e, "loginShell")[0] || "/bin/sh", sss: true, dn: e.dn };
}
function ttlCacheSssIle(h){ var ch = etatSssdIle(h).charge; return 60000 * Math.max(1, Math.round((+((ch && ch.conf.entry_cache_timeout) || 5400)) / 60)); }
/* Les comptes de l'annuaire pour cette machine (par nom ou par numéro), comme getpwnam par sss. */
function chercherSssIle(h, quoi, valeur){
	if (!estHoteIle(h) || !nssUtiliseIle(h, quoi === "groupe" || quoi === "gid" ? "group" : "passwd") || !sssdActifIle(h)) return null;
	var S = etatSssdIle(h), cache = quoi === "groupe" || quoi === "gid" ? S.groupes : S.cache, maintenant = maintenantMachine(h);
	var cle = (quoi === "uid" || quoi === "gid" ? "#" : "") + valeur;
	var enCache = cache[cle];
	if (enCache && maintenant - enCache.a < ttlCacheSssIle(h)) return enCache.v;
	var r = registrePourSssdIle(h);
	if (!r.ok) return enCache ? enCache.v : null;      // hors ligne : le cache répond, même vieux
	var res = ldapIle().entrees.filter(function(e){
		if (!sousDnIle(e.dn, r.base)) return false;
		var oc = valeursIle(e, "objectClass").map(function(x){ return x.toLowerCase(); });
		if (quoi === "groupe" || quoi === "gid") return oc.indexOf("posixgroup") > -1 && (quoi === "groupe" ? valeursIle(e, "cn")[0] === valeur : +valeursIle(e, "gidNumber")[0] === +valeur);
		return oc.indexOf("posixaccount") > -1 && (quoi === "nom" ? valeursIle(e, "uid")[0] === valeur : +valeursIle(e, "uidNumber")[0] === +valeur);
	})[0];
	var v = null;
	if (res){
		if (quoi === "groupe" || quoi === "gid") v = { nom: valeursIle(res, "cn")[0], gid: +valeursIle(res, "gidNumber")[0], membres: valeursIle(res, "memberUid").slice(), sss: true };
		else v = compteDepuisEntreeIle(res);
	}
	if (v) cache[cle] = { v: v, a: maintenant };
	else delete cache[cle];
	return v;
}
function utilisateurSssIle(h, nom){ return /^\d+$/.test(String(nom)) ? null : chercherSssIle(h, "nom", nom); }
function groupesSssDeIle(h, nom){
	// Les groupes de l'annuaire dont nom est membre (memberUid), par une recherche (ce que fait initgroups).
	if (!estHoteIle(h) || !nssUtiliseIle(h, "group") || !sssdActifIle(h)) return [];
	var r = registrePourSssdIle(h), S = etatSssdIle(h), cle = "@" + nom, maintenant = maintenantMachine(h);
	if (S.groupes[cle] && (maintenant - S.groupes[cle].a < ttlCacheSssIle(h) || !r.ok)) return S.groupes[cle].v;
	if (!r.ok) return [];
	var v = ldapIle().entrees.filter(function(e){ return sousDnIle(e.dn, r.base) && valeursIle(e, "objectClass").some(function(x){ return x.toLowerCase() === "posixgroup"; }) && valeursIle(e, "memberUid").indexOf(nom) > -1; })
		.map(function(e){ return { nom: valeursIle(e, "cn")[0], gid: +valeursIle(e, "gidNumber")[0], membres: valeursIle(e, "memberUid").slice(), sss: true }; });
	S.groupes[cle] = { v: v, a: maintenant };
	return v;
}
Shell.sorts.sss_cache = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/usr/sbin/sss_cache")) throw new ShellError("sss_cache: command not found", 127);
	if (!io.sudo) throw new ShellError("sss_cache must be run as root" + astuce(io, "sudo sss_cache -E"), 1);
	var S = etatSssdIle(h), u = optionIle(args, ["-u", "--user"]), g = optionIle(args, ["-g", "--group"]);
	if (args.indexOf("-E") > -1 || args.indexOf("--everything") > -1){ S.cache = {}; S.groupes = {}; }
	else if (args.indexOf("-U") > -1 || args.indexOf("--users") > -1) S.cache = {};
	else if (args.indexOf("-G") > -1 || args.indexOf("--groups") > -1) S.groupes = {};
	else if (u !== null){ delete S.cache[u]; Object.keys(S.cache).forEach(function(k){ if (S.cache[k].v && S.cache[k].v.nom === u) delete S.cache[k]; }); delete S.groupes["@" + u]; }
	else if (g !== null){ delete S.groupes[g]; }
	else throw new ShellError("Please select at least one object to invalidate", 1);
	evenementIle(h, "sss_cache", { tout: args.indexOf("-E") > -1 || args.indexOf("--everything") > -1, u: u });
	return "";
};

/* ================================================================== */
/* NSS : les noms des comptes sur les machines de l'île                 */
/* ================================================================== */

var GROUPES_MACHINE_AVANT_ILE = groupesMachine;
groupesMachine = function(h){
	var l = GROUPES_MACHINE_AVANT_ILE(h);
	if (!estHoteIle(h) || !nssUtiliseIle(h, "group") || !sssdActifIle(h)) return l;
	// Les groupes de l'annuaire connus de la machine (ceux du cache, et les deux groupes de la cité).
	["batisseurs", "promo"].forEach(function(n){ var g = chercherSssIle(h, "groupe", n); if (g && !l.some(function(x){ return x.nom === g.nom; })) l.push(g); });
	Object.keys(etatSssdIle(h).groupes).forEach(function(k){ var v = etatSssdIle(h).groupes[k].v; [].concat(v || []).forEach(function(g){ if (g && g.nom && !l.some(function(x){ return x.nom === g.nom; })) l.push(g); }); });
	return l;
};
var GROUPE_PRINCIPAL_AVANT_ILE = groupePrincipal;
groupePrincipal = function(h, user){
	if (!estHoteIle(h) || utilisateurLocalIle(h, user)) return GROUPE_PRINCIPAL_AVANT_ILE(h, user);
	var u = utilisateurSssIle(h, user);
	if (!u) return GROUPE_PRINCIPAL_AVANT_ILE(h, user);
	var g = chercherSssIle(h, "gid", u.gid) || GROUPES_MACHINE_AVANT_ILE(h).filter(function(x){ return x.gid === u.gid; })[0];
	return g ? g.nom : String(u.gid);
};
var UTILISATEUR_EXISTE_AVANT_ILE = utilisateurExiste;
utilisateurExiste = function(h, nom){
	if (UTILISATEUR_EXISTE_AVANT_ILE(h, nom)) return true;
	if (!estHoteIle(h)) return false;
	if (/^\d+$/.test(String(nom))) return true;   // un numéro : chown 10011 marche sans nom
	return !!utilisateurSssIle(h, nom);
};
var UID_MACHINE_AVANT_ILE = uidMachine;
uidMachine = function(h, nom){
	if (estHoteIle(h) && !utilisateurLocalIle(h, nom)){
		if (/^\d+$/.test(String(nom))) return +nom;
		var u = utilisateurSssIle(h, nom);
		if (u) return u.uid;
	}
	return UID_MACHINE_AVANT_ILE(h, nom);
};
/* Le nom d'un propriétaire à afficher : numéro sans nom connu (10005), ou le nom que NSS donne à ce numéro. */
function nomProprioIle(h, owner){
	if (!/^\d+$/.test(String(owner))){
		return owner;
	}
	var l = utilisateurLocalParUidIle(h, +owner);
	if (l) return l.nom;
	var s = chercherSssIle(h, "uid", +owner);
	return s ? s.nom : String(owner);
}
function nomGroupeAfficheIle(h, groupe){
	if (!/^\d+$/.test(String(groupe))) return groupe;
	var g = GROUPES_MACHINE_AVANT_ILE(h).filter(function(x){ return x.gid === +groupe; })[0] || chercherSssIle(h, "gid", +groupe);
	return g ? g.nom : String(groupe);
}
/* Un dossier peut porter son groupe (un numéro venu d'ailleurs, comme sur les Greniers) tant que chgrp n'en a pas posé un. */
var GROUPE_NOEUD_AVANT_ILE = groupeNoeud;
groupeNoeud = function(h, noeud, chemin){
	if (noeud instanceof Room && noeud.groupe !== undefined && estHoteIle(h)){
		var c = chemin || cheminDuLieuMachine(noeud);
		if (!(etatMachine(h).groupesDossiers || {})[c]) return noeud.groupe;
	}
	return GROUPE_NOEUD_AVANT_ILE.apply(this, arguments);
};
var LIGNE_LONGUE_AVANT_ILE = Shell.ligneLongue;
Shell.ligneLongue = function(noeud, nom, io){
	var h = ileIci();
	if (!h || !noeud) return LIGNE_LONGUE_AVANT_ILE.apply(this, arguments);
	var o = noeud.owner, g = noeud.groupe, numerique = LS_NUMERIQUE_ILE;
	var montre = numerique ? String(uidMachine(h, o)) : nomProprioIle(h, o);
	noeud.owner = montre;
	var gr = groupeNoeud(h, noeud), montreG = numerique ? (/^\d+$/.test(String(gr)) ? gr : String((groupesMachine(h).filter(function(x){ return x.nom === gr; })[0] || { gid: gr }).gid)) : nomGroupeAfficheIle(h, gr);
	var c = noeud instanceof Room ? cheminDuLieuMachine(noeud) : null, GD = etatMachine(h).groupesDossiers || {}, gd = c ? GD[c] : undefined;
	noeud.groupe = montreG;
	if (c && gd !== undefined) GD[c] = montreG;
	try { return LIGNE_LONGUE_AVANT_ILE.apply(this, arguments); }
	finally { noeud.owner = o; if (g === undefined) delete noeud.groupe; else noeud.groupe = g; if (c && gd !== undefined) GD[c] = gd; }
};
var LS_NUMERIQUE_ILE = false;
var LS_AVANT_ILE = Shell.sorts.ls;
Shell.sorts.ls = function(args, io){
	var h = ileIci();
	if (!h) return LS_AVANT_ILE.apply(this, arguments);
	var n = args.some(function(a){ return /^-[a-zA-Z]*n/.test(a); });
	LS_NUMERIQUE_ILE = n;
	try { return LS_AVANT_ILE.call(this, n ? args.map(function(a){ return /^-[a-zA-Z]*n/.test(a) ? a.replace("n", "l") : a; }) : args, io); }
	finally { LS_NUMERIQUE_ILE = false; }
};

/* getent passwd / group, et id : les fichiers, puis sss si nsswitch le dit. */
var GETENT_AVANT_ILE = Shell.sorts.getent;
Shell.sorts.getent = function(args, io){
	var h = ileIci();
	if (!h || (args[0] !== "passwd" && args[0] !== "group")) return GETENT_AVANT_ILE.apply(this, arguments);
	var base = args[0], cles = args.slice(1).filter(function(a){ return a.charAt(0) !== "-"; });
	var locaux = (lireIle(h, "/etc/" + base) || "").split("\n").filter(Boolean);
	var lignes = [];
	if (!cles.length) lignes = locaux;      // enumerate = False : l'annuaire ne se déroule pas en entier
	cles.forEach(function(k){
		var num = /^\d+$/.test(k);
		var l = locaux.filter(function(x){ var c = x.split(":"); return num ? c[2] === k : c[0] === k; })[0];
		if (l){ lignes.push(l); return; }
		if (base === "passwd"){
			var u = num ? chercherSssIle(h, "uid", +k) : utilisateurSssIle(h, k);
			if (u) lignes.push(u.nom + ":*:" + u.uid + ":" + u.gid + ":" + u.gecos + ":" + u.home + ":" + u.shell);
		} else {
			var g = num ? chercherSssIle(h, "gid", +k) : chercherSssIle(h, "groupe", k);
			if (g) lignes.push(g.nom + ":*:" + g.gid + ":" + g.membres.join(","));
		}
	});
	evenementIle(h, "getent", { base: base, cles: cles, trouves: lignes.length, sortie: lignes.join("\n"), sss: nssUtiliseIle(h, base) && sssdActifIle(h) });
	if (!lignes.length) io.code = 2;
	return lignes.join("\n");
};
var ID_AVANT_ILE = Shell.sorts.id;
Shell.sorts.id = function(args, io){
	var h = ileIci();
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!h || !noms.length) return ID_AVANT_ILE.apply(this, arguments);
	var nom = noms[0];
	var local = utilisateurLocalIle(h, nom);
	var u = local ? { nom: local.nom, uid: local.uid, gid: local.gid } : utilisateurSssIle(h, nom);
	if (!u){ evenementIle(h, "id", { nom: nom, ok: false }); throw new ShellError("id: '" + nom + "': no such user", 1); }
	var gs = [];
	var gp = GROUPES_MACHINE_AVANT_ILE(h).filter(function(g){ return g.gid === u.gid; })[0] || chercherSssIle(h, "gid", u.gid) || { nom: String(u.gid), gid: u.gid };
	gs.push(gp);
	GROUPES_MACHINE_AVANT_ILE(h).forEach(function(g){ if (g.membres.indexOf(u.nom) > -1 && !gs.some(function(x){ return x.gid === g.gid; })) gs.push(g); });
	groupesSssDeIle(h, u.nom).forEach(function(g){ if (!gs.some(function(x){ return x.gid === g.gid; })) gs.push(g); });
	evenementIle(h, "id", { nom: nom, ok: true, uid: u.uid, groupes: gs.map(function(g){ return g.nom; }), sss: !local });
	if (args.indexOf("-u") > -1) return String(u.uid);
	if (args.indexOf("-g") > -1) return String(u.gid);
	if (args.indexOf("-G") > -1) return gs.map(function(g){ return g.gid; }).join(" ");
	if (args.indexOf("-Gn") > -1 || args.indexOf("-nG") > -1) return gs.map(function(g){ return g.nom; }).join(" ");
	return "uid=" + u.uid + "(" + u.nom + ") gid=" + gp.gid + "(" + gp.nom + ") groups=" + gs.map(function(g){ return g.gid + "(" + g.nom + ")"; }).join(",");
};
/* L'authentification d'un compte de l'annuaire par pam_sss : le bon mot de passe, et sssd qui joint le Registre. */
function authentifierSssIle(h, nom, phrase){
	var u = utilisateurSssIle(h, nom);
	if (!u) return { ok: false, raison: "inconnu" };
	var r = registrePourSssdIle(h);
	if (!r.ok) return { ok: false, raison: "hors-ligne", compte: u };
	var e = entreeLdapIle(u.dn);
	if (!e || !motDePasseCorrectIle(valeursIle(e, "userPassword")[0], phrase)) return { ok: false, raison: "mot-de-passe", compte: u };
	return { ok: true, compte: u };
}
