/**
 * SortsIle.js : le moteur des services réseau de l'île (chapitre 7, Port-Aube), première partie : les outils
 * communs et le DNS (BIND 9).
 *
 * Chaque machine de l'île est une machine modélisée (declarerMachine, voir SortsMachines.js) : ses services ont de
 * vrais processus (systemctl, ps, ss, journalctl), et chaque service lit SA configuration sur SON disque, au moment
 * où on le démarre ou le recharge, comme le vrai. Ce qui est « chargé » vit dans etatMachine(h).ile, sauvegardé
 * avec la partie. Aucune réponse n'est écrite pour une quête : le chapitre pose des fichiers et lit l'état.
 *
 *  - BIND : named.conf (include, options, zone, key), les fichiers de zone (SOA, NS, A, AAAA, CNAME, MX, PTR, TXT, SRV,
 *    $TTL, $ORIGIN, parenthèses), named-checkconf (-z), named-checkzone, rndc (reload, reconfig, status, zonestatus,
 *    retransfer, notify, freeze, thaw, flush), le primaire et le secondaire (allow-transfer, also-notify, NOTIFY,
 *    AXFR, numéro de série), les mises à jour dynamiques (nsupdate -k, clés TSIG de tsig-keygen, allow-update),
 *    et dig (@serveur, -x, +short, +noall +answer, AXFR, TXT, SOA, NS, MX...).
 *
 * Les autres parties : SortsIlePoste.js (Postfix, Dovecot, DKIM), SortsIleBis.js (NFS, autofs, Samba, LDAP, sssd),
 * SortsIleTer.js (la CA interne avec openssl, borg, et les sorts des quêtes annexes).
 *
 * --- Les événements (GameEvents) ---
 *   ile { hote, cmd, ... }   pour chaque commande de ce moteur qui lit ou change l'état (voir chaque sort)
 */

/* ================================================================== */
/* Les outils communs de l'île                                          */
/* ================================================================== */

var DOMAINE_ILE = "port-aube.lan";
/* Les machines de l'île : celles que le chapitre déclare (declarerHoteIle). */
var HOTES_ILE = [];
function declarerHoteIle(h){ if (HOTES_ILE.indexOf(h) === -1) HOTES_ILE.push(h); }
function estHoteIle(h){ return HOTES_ILE.indexOf(h) > -1 && estMachine(h); }
function ileIci(){ var h = Shell.hote(); return estHoteIle(h) ? h : null; }
function etatIle(h){ var M = etatMachine(h); if (!M.ile || typeof M.ile !== "object") M.ile = {}; return M.ile; }
function ipIle(h){ return HOTES[h] && HOTES[h].ip ? HOTES[h].ip : null; }
function hoteDeIpIle(ip){
	for (var h in HOTES){ if (HOTES.hasOwnProperty(h) && HOTES[h].ip === ip) return h; }
	return null;
}
/* Un nom de machine tel qu'on le tape : court (poste), complet (poste.port-aube.lan, avec ou sans point final) ou une adresse. */
function resoudreHoteIle(nom){
	if (!nom) return null;
	var n = String(nom).toLowerCase().replace(/\.$/, "");
	if (n === "localhost" || n === "127.0.0.1" || n === "::1") return Shell.hote();
	if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) return hoteDeIpIle(n);
	var court = n.replace(new RegExp("\\." + DOMAINE_ILE.replace(/\./g, "\\.") + "$"), "");
	if (HOTES.hasOwnProperty(court)) return court;
	return null;
}
function journalIle(h, ident, unite, message, prio, pid){
	journalMachine(h, { unite: ident, unit: unite ? nomUniteComplet(unite) : null, message: message, prio: prio === undefined ? 6 : prio, pid: pid || pidServiceIle(h, unite) });
}
function pidServiceIle(h, unite){
	if (!unite) return null;
	var p = procsMachine(h).filter(function(x){ return x.unite === nomUniteComplet(unite) && x.principal; })[0];
	return p ? p.pid : null;
}
function serviceActifIle(h, unite){ return estMachine(h) && etatUnite(h, nomUniteComplet(unite)).actif; }
/* Lire une configuration de la machine sans contrôle de droits (c'est le démon qui la lit). */
function lireIle(h, chemin){ return texteHote(h, chemin); }
function fichierIle(h, chemin){ return fichierHote(h, chemin); }
function dateIle(h, ms){ return dateMachine(h, ms === undefined ? maintenantMachine(h) : ms); }
function dateDigIle(h){
	var d = dateIle(h);
	return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + abregeFuseau(h) + " " + d.getFullYear();
}
function dateGmtIle(h, ms){
	var d = new Date((ms === undefined ? maintenantMachine(h) : ms) - DECALAGE_HISTOIRE * 3600000);
	return JOURS_EN[d.getDay()] + ", " + deuxChiffres(d.getDate()) + " " + MOIS_EN[d.getMonth()] + " " + d.getFullYear() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " GMT";
}
function evenementIle(h, cmd, infos){
	var e = { type: "ile", hote: h, cmd: cmd };
	for (var k in (infos || {})) if (infos.hasOwnProperty(k)) e[k === "type" ? "typeInfo" : k] = infos[k];
	GameEvents.fire(e);
}
/* Les alias des unités de Debian : systemctl restart bind9 relance named. */
var ALIAS_UNITES_ILE = { "bind9.service": "named.service", "nfs-kernel-server.service": "nfs-server.service", "samba.service": "smbd.service",
	"openldap.service": "slapd.service", "rsyncd.service": "rsync.service" };
var SYSTEMCTL_AVANT_ILE = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var h = ileIci();
	if (h) args = args.map(function(a){ var c = nomUniteComplet(a); return a.charAt(0) !== "-" && ALIAS_UNITES_ILE[c] ? ALIAS_UNITES_ILE[c] : a; });
	return SYSTEMCTL_AVANT_ILE.call(this, args, io);
};
/* Un nombre entier dans une option (-p 22) ; null s'il n'y est pas. */
function optionIle(args, noms){
	for (var i = 0; i < args.length; i++){
		for (var k = 0; k < noms.length; k++){
			if (args[i] === noms[k]) return args[i + 1] === undefined ? "" : args[i + 1];
			if (noms[k].length > 2 && args[i].indexOf(noms[k] + "=") === 0) return args[i].substring(noms[k].length + 1);
		}
	}
	return null;
}
/* Les arguments qui restent, sans les options (et sans la valeur de celles qui en prennent une). */
function argumentsIle(args, avecValeur){
	var reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a.length > 1 && a.charAt(0) === "-"){
			if (avecValeur.indexOf(a) > -1) i++;
			continue;
		}
		reste.push(a);
	}
	return reste;
}
/* Lire un fichier par son chemin, avec les droits du joueur (sudo compris), pour un sort : le texte, ou une erreur. */
function lireFichierJoueurIle(chemin, io, cmd){
	var t = Shell.objetLisible(chemin, io, cmd);
	return { texte: t.item.getText(), item: t.item };
}
/* Les droits d'un fichier sont-ils exactement ceux-là (mode « rw------- », propriétaire) ? */
function droitsIle(item, mode, owner){ return !!item && item.mode === mode && (!owner || item.owner === owner); }

/* ================================================================== */
/* BIND : named.conf                                                    */
/* ================================================================== */

/* Les jetons d'un fichier de configuration de BIND : mots, chaînes, { } ; avec leur ligne. Les commentaires sautent. */
function jetonsBindIle(texte){
	var t = String(texte || ""), jetons = [], ligne = 1, i = 0;
	while (i < t.length){
		var c = t.charAt(i);
		if (c === "\n"){ ligne++; i++; continue; }
		if (/\s/.test(c)){ i++; continue; }
		if (c === "#" || (c === "/" && t.charAt(i + 1) === "/")){ while (i < t.length && t.charAt(i) !== "\n") i++; continue; }
		if (c === "/" && t.charAt(i + 1) === "*"){
			i += 2;
			while (i < t.length && !(t.charAt(i) === "*" && t.charAt(i + 1) === "/")){ if (t.charAt(i) === "\n") ligne++; i++; }
			i += 2; continue;
		}
		if (c === "{" || c === "}" || c === ";"){ jetons.push({ v: c, l: ligne, ponct: true }); i++; continue; }
		if (c === "\""){
			var j = i + 1, s = "";
			while (j < t.length && t.charAt(j) !== "\""){ if (t.charAt(j) === "\n") ligne++; s += t.charAt(j); j++; }
			jetons.push({ v: s, l: ligne, chaine: true });
			i = j + 1; continue;
		}
		var m = "";
		while (i < t.length && !/[\s{};"]/.test(t.charAt(i))){ m += t.charAt(i); i++; }
		jetons.push({ v: m, l: ligne });
	}
	return jetons;
}
/* L'arbre d'un fichier : [{ mot, args: [jetons], bloc: [...] ou null, l }]. Les erreurs comme named-checkconf. */
function arbreBindIle(jetons, fichier, erreurs){
	var p = 0;
	function lireBloc(fermant){
		var stmts = [];
		while (p < jetons.length){
			var j = jetons[p];
			if (j.ponct && j.v === "}"){
				if (!fermant){ erreurs.push(fichier + ":" + j.l + ": '}' unexpected"); p++; continue; }
				return stmts;
			}
			if (j.ponct && j.v === ";"){ p++; continue; }
			if (j.ponct && j.v === "{"){
				// Une liste anonyme (rare) : on la lit et on la garde comme bloc sans mot.
				p++;
				var anon = lireBloc(true);
				p++;
				stmts.push({ mot: "", args: [], bloc: anon, l: j.l });
				continue;
			}
			var s = { mot: j.v, args: [], bloc: null, l: j.l, chaine: !!j.chaine };
			p++;
			while (p < jetons.length && !jetons[p].ponct){ s.args.push(jetons[p]); p++; }
			if (p < jetons.length && jetons[p].v === "{"){
				p++;
				s.bloc = lireBloc(true);
				if (p >= jetons.length){ erreurs.push(fichier + ":" + (jetons.length ? jetons[jetons.length - 1].l : 1) + ": unexpected end of input"); return stmts.concat([s]); }
				p++;
				// Après le }, un ; est obligatoire.
				if (p < jetons.length && jetons[p].v === ";") p++;
				else erreurs.push(fichier + ":" + (p < jetons.length ? jetons[p].l : jetons[p - 1].l) + ": missing ';' before " + (p < jetons.length ? "'" + jetons[p].v + "'" : "end of file"));
				stmts.push(s);
				continue;
			}
			if (p < jetons.length && jetons[p].v === ";"){ p++; stmts.push(s); continue; }
			if (p < jetons.length && jetons[p].v === "}"){
				erreurs.push(fichier + ":" + jetons[p].l + ": missing ';' before '}'");
				stmts.push(s);
				continue;
			}
			erreurs.push(fichier + ":" + (p < jetons.length ? jetons[p].l : s.l) + ": unexpected end of input");
			stmts.push(s);
		}
		if (fermant) erreurs.push(fichier + ":" + (jetons.length ? jetons[jetons.length - 1].l : 1) + ": unexpected end of input");
		return stmts;
	}
	return lireBloc(false);
}
/* Une liste d'adresses BIND ({ 10.0.70.54; key x; any; }) : [{ type: "ip"|"reseau"|"any"|"none"|"key"|"nom", v }]. */
function listeAdressesBindIle(bloc, fichier, erreurs){
	return (bloc || []).map(function(s){
		var v = s.mot;
		if (v === "key") return { type: "key", v: s.args[0] ? s.args[0].v : "", l: s.l };
		if (v === "any" || v === "none" || v === "localhost" || v === "localnets") return { type: v, v: v, l: s.l };
		var neg = v.charAt(0) === "!";
		if (neg) v = v.substring(1);
		var m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\/(\d+))?$/.exec(v);
		if (m){
			if ([m[1], m[2], m[3], m[4]].some(function(x){ return +x > 255; }) || (m[5] && +m[5] > 32)) erreurs.push(fichier + ":" + s.l + ": '" + v + "' is not a valid address");
			return { type: m[5] ? "reseau" : "ip", v: v, neg: neg, l: s.l };
		}
		return { type: "nom", v: v, neg: neg, l: s.l };
	});
}
function ipDansReseauIle(ip, reseau){
	var m = /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/.exec(reseau);
	if (!m) return ip === reseau;
	var n = function(x){ return x.split(".").reduce(function(a, b){ return a * 256 + (+b); }, 0); };
	var bits = +m[2];
	if (bits === 0) return true;
	var masque = Math.pow(2, 32) - Math.pow(2, 32 - bits);
	return Math.floor(n(ip) / Math.pow(2, 32 - bits)) === Math.floor(n(m[1]) / Math.pow(2, 32 - bits)) && masque > 0;
}
/* Une liste d'adresses accepte-t-elle cette adresse (et cette clé TSIG) ? */
function listeAccepteIle(liste, ip, cle){
	for (var i = 0; i < liste.length; i++){
		var e = liste[i], ok = false;
		if (e.type === "any") ok = true;
		else if (e.type === "none") ok = false;
		else if (e.type === "localhost") ok = ip === "127.0.0.1";
		else if (e.type === "ip") ok = ip === e.v;
		else if (e.type === "reseau") ok = ipDansReseauIle(ip, e.v);
		else if (e.type === "key") ok = !!cle && cle === e.v;
		if (ok) return !e.neg;
	}
	return false;
}

var OPTIONS_ZONE_BIND = ["type", "file", "masters", "primaries", "allow-transfer", "also-notify", "allow-update", "allow-query", "notify", "update-policy",
	"journal", "check-names", "masterfile-format", "inline-signing", "dnssec-policy", "max-journal-size", "allow-notify", "notify-source"];
var INSTRUCTIONS_BIND = ["options", "zone", "include", "key", "acl", "logging", "controls", "view", "server", "statistics-channels", "trust-anchors", "managed-keys", "trusted-keys", "tls", "http"];
/*
 * La configuration de named, telle que named-checkconf la lit : { zones: [...], cles: { nom: { algo, secret } },
 * options: { recursion, allowTransfer, notify }, erreurs: [...] }. include est suivi.
 */
function configBindIle(h, fichierDepart){
	var conf = { zones: [], cles: {}, options: { recursion: true, allowTransfer: null, notify: true, directory: "/var/cache/bind" }, erreurs: [], fichiers: [] };
	var vusZones = {};
	function lire(chemin, profondeur, depuis){
		if (profondeur > 6) return;
		var texte = lireIle(h, chemin);
		if (texte === null){ conf.erreurs.push((depuis || chemin) + ": open: " + chemin + ": file not found"); return; }
		conf.fichiers.push(chemin);
		var erreurs = [];
		var arbre = arbreBindIle(jetonsBindIle(texte), chemin, erreurs);
		erreurs.forEach(function(e){ conf.erreurs.push(e); });
		if (erreurs.length) return;
		arbre.forEach(function(s){
			var ou = chemin + ":" + s.l;
			if (INSTRUCTIONS_BIND.indexOf(s.mot) === -1){ conf.erreurs.push(ou + ": unknown option '" + s.mot + "'"); return; }
			if (s.mot === "include"){
				if (!s.args[0]){ conf.erreurs.push(ou + ": unexpected end of input"); return; }
				lire(s.args[0].v, profondeur + 1, ou);
				return;
			}
			if (s.mot === "key"){
				var nom = s.args[0] ? s.args[0].v : "";
				var c = { algo: null, secret: null };
				(s.bloc || []).forEach(function(x){ if (x.mot === "algorithm") c.algo = x.args[0] ? x.args[0].v : null; if (x.mot === "secret") c.secret = x.args[0] ? x.args[0].v : null; });
				if (!c.secret) conf.erreurs.push(ou + ": key '" + nom + "': missing 'secret'");
				if (!c.algo) conf.erreurs.push(ou + ": key '" + nom + "': missing 'algorithm'");
				conf.cles[nom] = c;
				return;
			}
			if (s.mot === "options"){
				(s.bloc || []).forEach(function(x){
					if (x.mot === "recursion") conf.options.recursion = !x.args[0] || /^(yes|true|1)$/.test(x.args[0].v);
					if (x.mot === "directory" && x.args[0]) conf.options.directory = x.args[0].v;
					if (x.mot === "allow-transfer") conf.options.allowTransfer = listeAdressesBindIle(x.bloc, chemin, conf.erreurs);
					if (x.mot === "notify" && x.args[0]) conf.options.notify = /^(yes|true|explicit)$/.test(x.args[0].v);
				});
				return;
			}
			if (s.mot === "zone"){
				var nomZone = s.args[0] ? (s.args[0].v === "." ? "." : s.args[0].v.toLowerCase().replace(/\.$/, "")) : "";
				var z = { nom: nomZone, type: null, fichier: null, primaires: [], allowTransfer: null, alsoNotify: [], allowUpdate: null, notify: null, ou: ou };
				if (!nomZone){ conf.erreurs.push(ou + ": unexpected end of input"); return; }
				if (s.args[1] && !/^(IN|in)$/.test(s.args[1].v)){ conf.erreurs.push(ou + ": '" + s.args[1].v + "' unexpected"); return; }
				if (!s.bloc){ conf.erreurs.push(ou + ": missing '{' after zone name"); return; }
				s.bloc.forEach(function(x){
					var ox = chemin + ":" + x.l;
					if (OPTIONS_ZONE_BIND.indexOf(x.mot) === -1){ conf.erreurs.push(ox + ": unknown option '" + x.mot + "'"); return; }
					var a0 = x.args[0] ? x.args[0].v : null;
					if (x.mot === "type"){
						var t = (a0 || "").toLowerCase();
						if (t === "master") t = "primary";
						if (t === "slave") t = "secondary";
						if (["primary", "secondary", "hint", "forward", "stub", "mirror"].indexOf(t) === -1){ conf.erreurs.push(ox + ": '" + (a0 || "") + "' unexpected"); return; }
						z.type = t;
					}
					if (x.mot === "file") z.fichier = a0;
					if (x.mot === "masters" || x.mot === "primaries") z.primaires = listeAdressesBindIle(x.bloc, chemin, conf.erreurs).filter(function(e){ return e.type === "ip"; }).map(function(e){ return e.v; });
					if (x.mot === "allow-transfer") z.allowTransfer = listeAdressesBindIle(x.bloc, chemin, conf.erreurs);
					if (x.mot === "also-notify") z.alsoNotify = listeAdressesBindIle(x.bloc, chemin, conf.erreurs).filter(function(e){ return e.type === "ip"; }).map(function(e){ return e.v; });
					if (x.mot === "allow-update") z.allowUpdate = listeAdressesBindIle(x.bloc, chemin, conf.erreurs);
					if (x.mot === "notify" && a0) z.notify = /^(yes|true|explicit)$/.test(a0);
				});
				if (!z.type){ conf.erreurs.push(ou + ": zone '" + nomZone + "': type not present"); return; }
				if (z.type === "hint") return;
				if (z.type === "primary" && !z.fichier){ conf.erreurs.push(ou + ": zone '" + nomZone + "': missing 'file' entry"); return; }
				if (z.type === "secondary" && !z.primaires.length){ conf.erreurs.push(ou + ": zone '" + nomZone + "': missing 'primaries' entry"); return; }
				if (vusZones[nomZone]){ conf.erreurs.push(ou + ": zone '" + nomZone + "': already exists previous definition: " + vusZones[nomZone]); return; }
				vusZones[nomZone] = ou;
				conf.zones.push(z);
			}
		});
	}
	lire(fichierDepart || "/etc/bind/named.conf", 0, null);
	// Une clé citée dans allow-update doit exister.
	conf.zones.forEach(function(z){
		(z.allowUpdate || []).forEach(function(e){ if (e.type === "key" && !conf.cles[e.v]) conf.erreurs.push(z.ou + ": undefined key '" + e.v + "'"); });
		(z.allowTransfer || []).forEach(function(e){ if (e.type === "key" && !conf.cles[e.v]) conf.erreurs.push(z.ou + ": undefined key '" + e.v + "'"); });
	});
	return conf;
}
/* Le chemin d'un fichier de zone : relatif, il part de « directory » (/var/cache/bind sous Debian). */
function cheminZoneIle(conf, fichier){
	if (!fichier) return null;
	return fichier.charAt(0) === "/" ? fichier : (conf.options.directory || "/var/cache/bind").replace(/\/$/, "") + "/" + fichier;
}

/* ================================================================== */
/* BIND : les fichiers de zone                                          */
/* ================================================================== */

var TYPES_RR_ILE = ["SOA", "NS", "A", "AAAA", "CNAME", "MX", "PTR", "TXT", "SRV", "CAA", "HINFO"];
function lireTtlIle(t){
	var m = /^(\d+)([smhdwSMHDW]?)$/.exec(String(t));
	if (m) return +m[1] * ({ "": 1, s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2].toLowerCase()]);
	var total = 0, re = /(\d+)([smhdw])/gi, x, vu = false;
	while ((x = re.exec(t))){ vu = true; total += +x[1] * ({ s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[x[2].toLowerCase()]); }
	return vu && /^(\d+[smhdw])+$/i.test(t) ? total : null;
}
function ipv4ValideIle(t){ var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t); return !!m && [m[1], m[2], m[3], m[4]].every(function(x){ return +x <= 255; }); }
/* Un nom de la zone, absolu (avec le point final), en minuscules. */
function nomAbsoluIle(nom, origine){
	if (nom === "@") return origine;
	if (/\.$/.test(nom)) return nom.toLowerCase();
	return (nom + "." + origine).toLowerCase();
}
/* Les champs d'une ligne : les chaînes entre guillemets restent entières (avec leurs guillemets). */
function champsZoneIle(ligne){
	var champs = [], i = 0;
	while (i < ligne.length){
		var c = ligne.charAt(i);
		if (/\s/.test(c)){ i++; continue; }
		if (c === "\""){
			var j = i + 1;
			while (j < ligne.length && ligne.charAt(j) !== "\""){ if (ligne.charAt(j) === "\\") j++; j++; }
			champs.push(ligne.substring(i, j + 1));
			i = j + 1; continue;
		}
		var k = i;
		while (k < ligne.length && !/\s/.test(ligne.charAt(k))) k++;
		champs.push(ligne.substring(i, k));
		i = k;
	}
	return champs;
}
/*
 * Lit un fichier de zone : { enregistrements: [{ nom, ttl, type, donnees, l }], serie, erreurs: [messages], avertissements }.
 * Les messages ressemblent à ceux de named-checkzone (dns_master_load, dns_rdata_fromtext, zone X/IN: ...).
 */
function lireZoneIle(texte, origine, fichier){
	origine = origine.toLowerCase().replace(/\.?$/, ".");
	var r = { enregistrements: [], erreurs: [], avertissements: [], serie: null, origine: origine };
	var lignes = String(texte || "").split("\n"), ttlDefaut = null, dernierNom = null, courant = origine;
	var logiques = [];
	// Les commentaires retirés, puis les parenthèses réunies en une seule ligne logique.
	var tampon = null, debutTampon = 0, profondeur = 0;
	for (var i = 0; i < lignes.length; i++){
		var brute = lignes[i], propre = "", dansChaine = false;
		for (var k = 0; k < brute.length; k++){
			var c = brute.charAt(k);
			if (c === "\"" && brute.charAt(k - 1) !== "\\") dansChaine = !dansChaine;
			if (c === ";" && !dansChaine) break;
			propre += c;
		}
		var ouvre = (propre.match(/\(/g) || []).length, ferme = (propre.match(/\)/g) || []).length;
		if (tampon !== null){
			tampon += " " + propre.replace(/[()]/g, " ");
			profondeur += ouvre - ferme;
			if (profondeur <= 0){ logiques.push({ texte: tampon, l: debutTampon, blanc: tampon.charAt(0) === " " || tampon.charAt(0) === "\t" }); tampon = null; }
			continue;
		}
		if (ouvre > ferme){
			tampon = propre.replace(/[()]/g, " ");
			debutTampon = i + 1;
			profondeur = ouvre - ferme;
			continue;
		}
		if (ferme > ouvre){ r.erreurs.push("dns_master_load: " + fichier + ":" + (i + 1) + ": unbalanced parentheses"); continue; }
		logiques.push({ texte: propre.replace(/[()]/g, " "), l: i + 1, blanc: /^\s/.test(propre) });
	}
	if (tampon !== null) r.erreurs.push("dns_master_load: " + fichier + ":" + debutTampon + ": unbalanced parentheses");
	logiques.forEach(function(lg){
		if (lg.texte.trim() === "") return;
		var champs = champsZoneIle(lg.texte), ou = fichier + ":" + lg.l;
		if (/^\$TTL$/i.test(champs[0])){
			var t = lireTtlIle(champs[1] || "");
			if (t === null) r.erreurs.push("dns_master_load: " + ou + ": $TTL: bad ttl");
			else ttlDefaut = t;
			return;
		}
		if (/^\$ORIGIN$/i.test(champs[0])){ if (champs[1]) courant = nomAbsoluIle(champs[1], courant); return; }
		if (/^\$INCLUDE$/i.test(champs[0])){ r.erreurs.push("dns_master_load: " + ou + ": $INCLUDE: file not found"); return; }
		var nom;
		if (lg.blanc){
			if (dernierNom === null){ r.erreurs.push("dns_master_load: " + ou + ": no current owner name"); return; }
			nom = dernierNom;
		} else {
			nom = nomAbsoluIle(champs.shift(), courant);
		}
		var ttl = null, type = null;
		while (champs.length){
			var f = champs[0];
			if (/^(IN|CH|HS)$/i.test(f)){ champs.shift(); continue; }
			var tt = lireTtlIle(f);
			if (tt !== null && ttl === null && TYPES_RR_ILE.indexOf(f.toUpperCase()) === -1){ ttl = tt; champs.shift(); continue; }
			type = champs.shift().toUpperCase();
			break;
		}
		if (!type){ r.erreurs.push("dns_rdata_fromtext: " + ou + ": near eol: unexpected end of input"); return; }
		if (TYPES_RR_ILE.indexOf(type) === -1){ r.erreurs.push("dns_master_load: " + ou + ": unknown RR type '" + type.toLowerCase() + "'"); return; }
		dernierNom = nom;
		if (ttl === null){
			if (ttlDefaut === null){
				if (type === "SOA" && champs.length >= 7){ ttlDefaut = lireTtlIle(champs[6]); r.avertissements.push("dns_master_load: " + ou + ": no TTL specified; using SOA MINTTL instead"); }
				else if (!r.enregistrements.length) r.avertissements.push("dns_master_load: " + ou + ": no TTL specified; using SOA MINTTL instead");
			}
			ttl = ttlDefaut !== null ? ttlDefaut : 3600;
		}
		var donnees = null, mauvais = function(v, quoi){ r.erreurs.push("dns_rdata_fromtext: " + ou + ": near '" + v + "': " + quoi); };
		var fin = function(){ r.erreurs.push("dns_rdata_fromtext: " + ou + ": near eol: unexpected end of input"); };
		if (type === "A"){
			if (!champs[0]) return fin();
			if (!ipv4ValideIle(champs[0])) return mauvais(champs[0], "bad dotted quad");
			donnees = champs[0];
		} else if (type === "AAAA"){
			if (!champs[0]) return fin();
			if (!/^[0-9a-f:]+$/i.test(champs[0]) || champs[0].indexOf(":") === -1) return mauvais(champs[0], "bad IPv6 address");
			donnees = champs[0].toLowerCase();
		} else if (type === "NS" || type === "CNAME" || type === "PTR"){
			if (!champs[0]) return fin();
			donnees = nomAbsoluIle(champs[0], courant);
		} else if (type === "MX"){
			if (champs.length < 2) return fin();
			if (!/^\d+$/.test(champs[0])) return mauvais(champs[0], "not a valid number");
			donnees = { pref: +champs[0], cible: nomAbsoluIle(champs[1], courant) };
		} else if (type === "SRV"){
			if (champs.length < 4) return fin();
			donnees = { prio: +champs[0], poids: +champs[1], port: +champs[2], cible: nomAbsoluIle(champs[3], courant) };
		} else if (type === "TXT"){
			if (!champs.length) return fin();
			donnees = champs.map(function(x){ return /^".*"$/.test(x) ? x.substring(1, x.length - 1).replace(/\\"/g, "\"") : x; });
		} else if (type === "SOA"){
			if (champs.length < 7) return fin();
			for (var n = 2; n < 7; n++){ if (lireTtlIle(champs[n]) === null) return mauvais(champs[n], "not a valid number"); }
			donnees = { mname: nomAbsoluIle(champs[0], courant), rname: nomAbsoluIle(champs[1], courant), serie: +champs[2], refresh: lireTtlIle(champs[3]),
				retry: lireTtlIle(champs[4]), expire: lireTtlIle(champs[5]), minimum: lireTtlIle(champs[6]) };
		} else {
			donnees = champs.join(" ");
		}
		if (nom !== origine && nom.substring(nom.length - origine.length - 1) !== "." + origine){
			r.avertissements.push("dns_master_load: " + ou + ": " + nom + ": ignoring out-of-zone data (" + origine + ")");
			return;
		}
		r.enregistrements.push({ nom: nom, ttl: ttl, type: type, donnees: donnees, l: lg.l });
	});
	verifierZoneIle(r, origine.replace(/\.$/, ""), fichier);
	return r;
}
/* Les contrôles de la zone entière, une fois lue (comme named-checkzone : SOA, NS, CNAME, MX). */
function verifierZoneIle(r, nomZone, fichier){
	var origine = nomZone + ".", recs = r.enregistrements;
	var soas = recs.filter(function(x){ return x.type === "SOA"; });
	var prefixe = "zone " + nomZone + "/IN: ";
	if (soas.length !== 1 || soas[0].nom !== origine){
		if (soas.length && soas[0].nom !== origine) r.erreurs.push("dns_master_load: " + fichier + ":" + soas[0].l + ": " + soas[0].nom + ": not at top of zone");
		else r.erreurs.push(prefixe + "has " + soas.length + " SOA records");
	} else r.serie = soas[0].donnees.serie;
	var ns = recs.filter(function(x){ return x.type === "NS" && x.nom === origine; });
	if (!ns.length) r.erreurs.push(prefixe + "has no NS records");
	var parNom = {};
	recs.forEach(function(x){ (parNom[x.nom] = parNom[x.nom] || []).push(x); });
	Object.keys(parNom).forEach(function(n){
		var l = parNom[n];
		if (l.some(function(x){ return x.type === "CNAME"; }) && l.some(function(x){ return x.type !== "CNAME"; })){
			var c = l.filter(function(x){ return x.type === "CNAME"; })[0];
			r.erreurs.push("dns_master_load: " + fichier + ":" + c.l + ": " + n + ": CNAME and other data");
		}
	});
	var dansZone = function(n){ return n === origine || n.substring(n.length - origine.length - 1) === "." + origine; };
	var adresse = function(n){ return (parNom[n] || []).some(function(x){ return x.type === "A" || x.type === "AAAA"; }); };
	var cname = function(n){ return (parNom[n] || []).some(function(x){ return x.type === "CNAME"; }); };
	ns.forEach(function(x){
		if (!dansZone(x.donnees)) return;
		if (!adresse(x.donnees)) r.erreurs.push(prefixe + "NS '" + x.donnees.replace(/\.$/, "") + "' has no address records (A or AAAA)");
		if (cname(x.donnees)) r.erreurs.push(prefixe + "NS '" + x.donnees.replace(/\.$/, "") + "' is a CNAME (illegal)");
	});
	recs.filter(function(x){ return x.type === "MX"; }).forEach(function(x){
		if (!dansZone(x.donnees.cible)) return;
		if (cname(x.donnees.cible)) r.erreurs.push(prefixe + "MX '" + x.donnees.cible.replace(/\.$/, "") + "' is a CNAME (illegal)");
		else if (!adresse(x.donnees.cible)) r.avertissements.push(prefixe + "MX '" + x.donnees.cible.replace(/\.$/, "") + "' has no address records (A or AAAA)");
	});
}
/* Le texte d'un enregistrement, comme dig l'écrit. */
function texteRrIle(x){
	var d = x.donnees, v;
	if (x.type === "MX") v = d.pref + " " + d.cible;
	else if (x.type === "SRV") v = d.prio + " " + d.poids + " " + d.port + " " + d.cible;
	else if (x.type === "SOA") v = d.mname + " " + d.rname + " " + d.serie + " " + d.refresh + " " + d.retry + " " + d.expire + " " + d.minimum;
	else if (x.type === "TXT") v = d.map(function(s){ return "\"" + String(s).replace(/"/g, "\\\"") + "\""; }).join(" ");
	else v = String(d);
	return v;
}
function ligneRrIle(x){
	var n = x.nom, tab = n.length < 8 ? "\t\t\t" : (n.length < 16 ? "\t\t" : "\t");
	return n + tab + x.ttl + "\tIN\t" + x.type + "\t" + texteRrIle(x);
}
function memeRrIle(a, b){ return a.nom === b.nom && a.type === b.type && texteRrIle(a) === texteRrIle(b); }
/* Le texte complet d'une zone, comme BIND la réécrit (rndc freeze, fichier d'un secondaire) : les commentaires disparaissent. */
function texteZoneIle(zone){
	var soa = zone.enregistrements.filter(function(x){ return x.type === "SOA"; })[0];
	var lignes = ["$ORIGIN .", "$TTL " + (soa ? soa.ttl : 3600) + "\t; " + Math.round((soa ? soa.ttl : 3600) / 60) + " minutes"];
	var ordre = zone.enregistrements.slice().sort(function(a, b){
		if (a.type === "SOA") return -1;
		if (b.type === "SOA") return 1;
		return a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0);
	});
	ordre.forEach(function(x){ lignes.push(x.nom + "\t" + x.ttl + "\tIN " + x.type + "\t" + texteRrIle(x)); });
	return lignes.join("\n") + "\n";
}

/* ================================================================== */
/* BIND : ce que named a chargé, le transfert, la notification          */
/* ================================================================== */

function etatBindIle(h){ var e = etatIle(h); if (!e.bind || typeof e.bind !== "object") e.bind = { zones: {}, charge: null }; return e.bind; }
function bindTourne(h){ return serviceActifIle(h, "named"); }
/* Les enregistrements servis pour une zone chargée : ceux du fichier, plus les mises à jour dynamiques. */
function enregistrementsServisIle(z){ return z.enregistrements || []; }
/* La zone qui fait autorité pour un nom, sur un serveur (la plus longue qui le contient). */
function zoneServieIle(h, nom){
	var b = etatBindIle(h), meilleure = null;
	nom = nom.toLowerCase().replace(/\.?$/, ".");
	Object.keys(b.zones).forEach(function(n){
		var z = b.zones[n];
		if (!z || !z.chargee) return;
		var o = n + ".";
		if (nom === o || nom.substring(nom.length - o.length - 1) === "." + o){ if (!meilleure || n.length > meilleure.nom.length) meilleure = z; }
	});
	return meilleure;
}
function serieZoneIle(z){ var s = (z.enregistrements || []).filter(function(x){ return x.type === "SOA"; })[0]; return s ? s.donnees.serie : null; }
function changerSerieIle(z, serie){ (z.enregistrements || []).forEach(function(x){ if (x.type === "SOA") x.donnees.serie = serie; }); z.serie = serie; }
/*
 * Charger la configuration et les zones : au démarrage (start, restart) ou au rechargement (rndc reload, reconfig).
 * Renvoie { ok, erreurs } ; une configuration fausse empêche de démarrer (au démarrage) ou garde l'ancienne (au rechargement).
 */
function chargerBindIle(h, mode, seulement){
	var b = etatBindIle(h), conf = configBindIle(h), pid = pidServiceIle(h, "named");
	if (conf.erreurs.length){
		conf.erreurs.forEach(function(e){ journalIle(h, "named", "named", e, 3, pid); });
		journalIle(h, "named", "named", (mode === "start" ? "loading configuration: failure" : "reloading configuration failed: failure"), 3, pid);
		if (mode === "start") journalIle(h, "named", "named", "exiting (due to fatal error)", 2, pid);
		return { ok: false, erreurs: conf.erreurs };
	}
	if (mode === "start"){
		journalIle(h, "named", "named", "starting BIND 9.18.28-1~deb12u2-Debian (Extended Support Version) <id:>", 6, pid);
		journalIle(h, "named", "named", "loading configuration from '/etc/bind/named.conf'", 6, pid);
	} else journalIle(h, "named", "named", "reloading configuration succeeded", 6, pid);
	var anciennes = b.zones, nouvelles = {}, ip = ipIle(h);
	b.conf = { cles: conf.cles, options: { recursion: conf.options.recursion, allowTransfer: conf.options.allowTransfer, notify: conf.options.notify } };
	var aNotifier = [];
	conf.zones.forEach(function(z){
		if (seulement && z.nom !== seulement){ nouvelles[z.nom] = anciennes[z.nom] || null; if (nouvelles[z.nom]) majParametresZoneIle(nouvelles[z.nom], z, conf); return; }
		var ancienne = anciennes[z.nom] || null, chemin = cheminZoneIle(conf, z.fichier);
		var nz = { nom: z.nom, type: z.type, fichier: chemin, chargee: false, enregistrements: [], serie: null, dyn: ancienne ? ancienne.dyn || [] : [], gele: ancienne ? !!ancienne.gele : false, charge: maintenantMachine(h) };
		majParametresZoneIle(nz, z, conf);
		if (z.type === "primary"){
			var texte = lireIle(h, chemin);
			if (texte === null){
				journalIle(h, "named", "named", "zone " + z.nom + "/IN: loading from master file " + z.fichier + " failed: file not found", 3, pid);
				journalIle(h, "named", "named", "zone " + z.nom + "/IN: not loaded due to errors.", 3, pid);
				if (ancienne && ancienne.chargee && mode !== "start") nouvelles[z.nom] = ancienne; else nouvelles[z.nom] = nz;
				return;
			}
			var lu = lireZoneIle(texte, z.nom, z.fichier);
			lu.avertissements.forEach(function(a){ journalIle(h, "named", "named", a, 4, pid); });
			if (lu.erreurs.length){
				lu.erreurs.forEach(function(e){ journalIle(h, "named", "named", e, 3, pid); });
				journalIle(h, "named", "named", "zone " + z.nom + "/IN: not loaded due to errors.", 3, pid);
				nouvelles[z.nom] = ancienne && ancienne.chargee ? ancienne : nz;
				if (ancienne && ancienne.chargee) majParametresZoneIle(ancienne, z, conf);
				return;
			}
			var textePrecedent = ancienne ? ancienne.texteFichier : null;
			// Une zone dynamique : le journal (.jnl) se rejoue sur le fichier, sauf si le fichier a changé derrière le dos de named.
			if (nz.dyn.length && textePrecedent !== null && texte !== textePrecedent){
				if (lu.serie > (ancienne.serie || 0)){
					journalIle(h, "named", "named", "zone " + z.nom + "/IN: journal file is out of date: removing journal file", 4, pid);
					nz.dyn = [];
					supprimerJournalZoneIle(h, chemin);
				} else {
					journalIle(h, "named", "named", "zone " + z.nom + "/IN: journal rollforward failed: journal out of sync with zone", 3, pid);
					journalIle(h, "named", "named", "zone " + z.nom + "/IN: not loaded due to errors.", 3, pid);
					nouvelles[z.nom] = ancienne;
					return;
				}
			}
			nz.texteFichier = texte;
			nz.enregistrements = lu.enregistrements.map(function(x){ return copieJson(x); });
			nz.serieFichier = lu.serie;
			appliquerDynIle(nz);
			nz.serie = serieZoneIle(nz);
			nz.chargee = true;
			if (ancienne && ancienne.chargee && ancienne.serie === nz.serie && textePrecedent !== null && texte !== textePrecedent && !nz.dyn.length){
				journalIle(h, "named", "named", "zone " + z.nom + "/IN: zone serial (" + nz.serie + ") unchanged. zone may fail to transfer to slaves.", 4, pid);
			}
			journalIle(h, "named", "named", "zone " + z.nom + "/IN: loaded serial " + nz.serie + (nz.dyn.length ? " (DNSSEC signed: no)" : ""), 6, pid);
			nouvelles[z.nom] = nz;
			if (!ancienne || !ancienne.chargee || ancienne.serie !== nz.serie) aNotifier.push(z.nom);
			return;
		}
		if (z.type === "secondary"){
			// Le secondaire garde sa dernière copie (sur le disque) ; il demande aussitôt au primaire s'il y a plus neuf.
			if (ancienne && ancienne.chargee){ nz.enregistrements = ancienne.enregistrements; nz.serie = ancienne.serie; nz.chargee = true; }
			else {
				var copie = lireIle(h, chemin);
				if (copie !== null){
					var lc = lireZoneIle(copie, z.nom, z.fichier);
					if (!lc.erreurs.length){ nz.enregistrements = lc.enregistrements; nz.serie = lc.serie; nz.chargee = true; journalIle(h, "named", "named", "zone " + z.nom + "/IN: loaded serial " + lc.serie, 6, pid); }
				}
			}
			nouvelles[z.nom] = nz;
		}
	});
	b.zones = nouvelles;
	b.charge = maintenantMachine(h);
	if (mode === "start") journalIle(h, "named", "named", "all zones loaded", 6, pid);
	if (mode === "start") journalIle(h, "named", "named", "running", 6, pid);
	// Les secondaires demandent un rafraîchissement ; les primaires préviennent les leurs.
	Object.keys(b.zones).forEach(function(n){ var z = b.zones[n]; if (z && z.type === "secondary" && (!seulement || seulement === n)) rafraichirSecondaireIle(h, n, "refresh"); });
	aNotifier.forEach(function(n){ notifierIle(h, n); });
	evenementIle(h, "named", { action: mode, zones: Object.keys(b.zones).filter(function(n){ return b.zones[n] && b.zones[n].chargee; }) });
	return { ok: true, erreurs: [] };
}
function majParametresZoneIle(nz, z, conf){
	nz.primaires = z.primaires.slice();
	nz.allowTransfer = z.allowTransfer || conf.options.allowTransfer || [{ type: "any", v: "any" }];
	nz.alsoNotify = z.alsoNotify.slice();
	nz.allowUpdate = z.allowUpdate || [];
	nz.notify = z.notify === null ? conf.options.notify : z.notify;
	nz.type = z.type;
}
function appliquerDynIle(z){
	(z.dyn || []).forEach(function(op){
		if (op.action === "add"){ if (!z.enregistrements.some(function(x){ return memeRrIle(x, op.rr); })) z.enregistrements.push(copieJson(op.rr)); }
		else z.enregistrements = z.enregistrements.filter(function(x){ return !(x.nom === op.rr.nom && (!op.rr.type || x.type === op.rr.type) && (op.rr.donnees === undefined || texteRrIle(x) === texteRrIle(op.rr))) || x.type === "SOA"; });
		if (op.serie) changerSerieIle(z, op.serie);
	});
}
function supprimerJournalZoneIle(h, chemin){ moteurSeul(function(){ var d = dossierHote(h, dossierDe(chemin)); if (d){ var it = d.getItemFromName(nomDe(chemin) + ".jnl"); if (it !== -1) d.removeItem(it); } }); }
/* Le primaire accepte-t-il de transférer cette zone à cette adresse ? */
function transfertAutoriseIle(h, nomZone, ipClient){
	var z = etatBindIle(h).zones[nomZone];
	if (!z || !z.chargee) return false;
	return listeAccepteIle(z.allowTransfer || [], ipClient, null);
}
/* Le secondaire h demande la zone à son primaire : transfert si le primaire est plus neuf (ou si forcé). */
function rafraichirSecondaireIle(h, nomZone, raison){
	var b = etatBindIle(h), z = b.zones[nomZone], pid = pidServiceIle(h, "named");
	if (!z || z.type !== "secondary" || !bindTourne(h)) return false;
	var ipPrim = z.primaires[0], hp = hoteDeIpIle(ipPrim);
	if (!hp || !estMachine(hp) || !bindTourne(hp)){
		journalIle(h, "named", "named", "zone " + nomZone + "/IN: refresh: retry limit for primary " + ipPrim + "#53 exceeded (source " + ipIle(h) + "#0)", 4, pid);
		return false;
	}
	var zp = etatBindIle(hp).zones[nomZone];
	if (!zp || !zp.chargee || zp.type !== "primary"){
		journalIle(h, "named", "named", "zone " + nomZone + "/IN: refresh: unexpected rcode (REFUSED) from primary " + ipPrim + "#53 (source " + ipIle(h) + "#0)", 4, pid);
		return false;
	}
	if (z.chargee && z.serie !== null && zp.serie <= z.serie && raison !== "retransfer"){
		journalIle(h, "named", "named", "zone " + nomZone + "/IN: refresh: serial " + z.serie + " is up to date (primary " + ipPrim + "#53)", 7, pid);
		return false;
	}
	journalIle(h, "named", "named", "zone " + nomZone + "/IN: Transfer started.", 6, pid);
	if (!transfertAutoriseIle(hp, nomZone, ipIle(h))){
		journalIle(hp, "named", "named", "client @0x7f3a2c01e168 " + ipIle(h) + "#" + (40000 + condense(nomZone + h) % 20000) + " (" + nomZone + "): zone transfer '" + nomZone + "/AXFR/IN' denied", 3);
		journalIle(h, "named", "named", "transfer of '" + nomZone + "/IN' from " + ipPrim + "#53: failed while receiving responses: REFUSED", 3, pid);
		journalIle(h, "named", "named", "transfer of '" + nomZone + "/IN' from " + ipPrim + "#53: Transfer completed: 0 messages, 0 records, 0 bytes, 0.001 secs (0 bytes/sec)", 6, pid);
		evenementIle(h, "transfert", { zone: nomZone, ok: false, primaire: hp });
		return false;
	}
	var recs = zp.enregistrements.map(function(x){ return copieJson(x); });
	journalIle(hp, "named", "named", "client @0x7f3a2c01e168 " + ipIle(h) + "#" + (40000 + condense(nomZone + h) % 20000) + " (" + nomZone + "): transfer of '" + nomZone + "/IN': AXFR started (serial " + zp.serie + ")", 6);
	journalIle(hp, "named", "named", "client @0x7f3a2c01e168 " + ipIle(h) + "#" + (40000 + condense(nomZone + h) % 20000) + " (" + nomZone + "): transfer of '" + nomZone + "/IN': AXFR ended: 1 messages, " + (recs.length + 1) + " records, " + (recs.length * 38 + 64) + " bytes, 0.001 secs (" + (recs.length * 38000 + 64000) + " bytes/sec)", 6);
	z.enregistrements = recs;
	z.serie = zp.serie;
	z.chargee = true;
	z.transfere = maintenantMachine(h);
	moteurSeul(function(){ poserFichierHote(h, z.fichier, texteZoneIle(z), { owner: "bind", mode: "rw-r--r--" }); });
	journalIle(h, "named", "named", "zone " + nomZone + "/IN: transferred serial " + zp.serie, 6, pid);
	journalIle(h, "named", "named", "transfer of '" + nomZone + "/IN' from " + ipPrim + "#53: Transfer completed: 1 messages, " + (recs.length + 1) + " records, " + (recs.length * 38 + 64) + " bytes, 0.002 secs (" + (recs.length * 19000 + 32000) + " bytes/sec) (serial " + zp.serie + ")", 6, pid);
	evenementIle(h, "transfert", { zone: nomZone, ok: true, primaire: hp, serie: zp.serie });
	return true;
}
/* Le primaire prévient ses secondaires (also-notify, et les NS de la zone) qu'une nouvelle version existe. */
function notifierIle(h, nomZone){
	var b = etatBindIle(h), z = b.zones[nomZone], pid = pidServiceIle(h, "named");
	if (!z || !z.chargee || z.type !== "primary" || z.notify === false) return;
	var cibles = z.alsoNotify.slice();
	z.enregistrements.filter(function(x){ return x.type === "NS" && x.nom === nomZone + "."; }).forEach(function(ns){
		var a = z.enregistrements.filter(function(x){ return x.type === "A" && x.nom === ns.donnees; })[0];
		if (a && cibles.indexOf(a.donnees) === -1) cibles.push(a.donnees);
	});
	cibles = cibles.filter(function(ip){ return ip !== ipIle(h); });
	if (!cibles.length) return;
	journalIle(h, "named", "named", "zone " + nomZone + "/IN: sending notifies (serial " + z.serie + ")", 6, pid);
	cibles.forEach(function(ip){
		var hs = hoteDeIpIle(ip);
		if (!hs || !estMachine(hs) || !bindTourne(hs)) return;
		var zs = etatBindIle(hs).zones[nomZone];
		if (!zs || zs.type !== "secondary"){ journalIle(hs, "named", "named", "client @0x7f3a2c01e168 " + ipIle(h) + "#" + (30000 + condense(nomZone) % 9000) + ": received notify for zone '" + nomZone + "': not authoritative", 4); return; }
		if (zs.primaires.indexOf(ipIle(h)) === -1){ journalIle(hs, "named", "named", "zone " + nomZone + "/IN: refused notify from non-primary: " + ipIle(h) + "#53", 4); return; }
		journalIle(hs, "named", "named", "zone " + nomZone + "/IN: notify from " + ipIle(h) + "#" + (30000 + condense(nomZone) % 9000) + ": serial " + z.serie, 6);
		rafraichirSecondaireIle(hs, nomZone, "notify");
	});
}

/* named : démarrer refuse une configuration fausse ; démarrer ou recharger charge les zones. */
controleAvantDemarrage(function(h, unite, action){
	if (!estHoteIle(h) || unite !== "named.service") return null;
	var conf = configBindIle(h);
	if (!conf.erreurs.length) return null;
	conf.erreurs.forEach(function(e){ journalIle(h, "named", "named", e, 3); });
	journalIle(h, "named", "named", "loading configuration: failure", 3);
	journalIle(h, "named", "named", "exiting (due to fatal error)", 2);
	return "named: " + conf.erreurs[0];
});
GameEvents.addListener("machine", function(e){
	if (!e.hote || !estHoteIle(e.hote) || !e.unite) return;
	if (e.unite === "named.service"){
		if (e.cmd === "unite" && e.action === "lancee"){
			var r = chargerBindIle(e.hote, "start");
			// Une configuration fausse au démarrage : named s'arrête aussitôt, et l'unité est en échec.
			if (!r.ok){ arreterUnite(e.hote, "named.service", true); marquerEchec(e.hote, uniteInfo(e.hote, "named.service")); }
		}
		if (e.cmd === "systemctl" && e.action === "reload" && e.actif) chargerBindIle(e.hote, "reload");
		if ((e.cmd === "unite" && (e.action === "arretee" || e.action === "morte"))) { var b = etatBindIle(e.hote); Object.keys(b.zones).forEach(function(n){ /* la copie reste sur le disque */ }); }
	}
});

/* ================================================================== */
/* named-checkconf, named-checkzone                                     */
/* ================================================================== */

Shell.sorts["named-checkconf"] = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/etc/bind/named.conf")) throw new ShellError("named-checkconf: command not found" + astuce(io, "Le paquet bind9-utils est installé sur les serveurs de noms de l'île (noms, phare)."), 127);
	var z = args.indexOf("-z") > -1, fichier = argumentsIle(args, ["-t"])[0] || "/etc/bind/named.conf";
	var cheminFichier = fichier.charAt(0) === "/" ? fichier : cheminDuLieuMachine(current_room).replace(/\/$/, "") + "/" + fichier;
	if (!lireIle(h, cheminFichier)) throw new ShellError("none:0: open: " + fichier + ": file not found", 1);
	var it = fichierHote(h, cheminFichier);
	if (it && !io.sudo && !Shell.bit(it, "r", io)) throw new ShellError("none:0: open: " + fichier + ": permission denied", 1);
	var conf = configBindIle(h, cheminFichier);
	evenementIle(h, "named-checkconf", { ok: !conf.erreurs.length, z: z, erreurs: conf.erreurs.slice() });
	if (conf.erreurs.length){ io.code = 1; return conf.erreurs.join("\n") + astuce(io, "Une seule faute, et named refuse de démarrer : la ligne est dans le message (fichier:ligne)."); }
	if (!z) return io.tty && !args.length ? C.gris("(Rien à redire : named-checkconf ne parle que quand il trouve une faute. -z charge aussi les zones primaires.)") : "";
	var lignes = [], code = 0;
	conf.zones.forEach(function(zone){
		if (zone.type !== "primary") return;
		var chemin = cheminZoneIle(conf, zone.fichier), texte = lireIle(h, chemin);
		if (texte === null){ lignes.push("zone " + zone.nom + "/IN: loading from master file " + zone.fichier + " failed: file not found", "zone " + zone.nom + "/IN: not loaded due to errors."); code = 1; return; }
		var lu = lireZoneIle(texte, zone.nom, zone.fichier);
		lu.avertissements.forEach(function(a){ lignes.push(a); });
		if (lu.erreurs.length){ lu.erreurs.forEach(function(e){ lignes.push(e); }); lignes.push("zone " + zone.nom + "/IN: not loaded due to errors."); code = 1; return; }
		lignes.push("zone " + zone.nom + "/IN: loaded serial " + lu.serie);
	});
	io.code = code;
	return lignes.join("\n");
};
var CHECKZONE_AVANT_ILE = Shell.sorts["named-checkzone"];
Shell.sorts["named-checkzone"] = function(args, io){
	var h = ileIci();
	if (!h) return CHECKZONE_AVANT_ILE ? CHECKZONE_AVANT_ILE.apply(this, arguments) : "";
	var reste = argumentsIle(args, ["-k", "-i", "-o", "-f", "-F", "-c", "-t", "-w", "-m", "-n", "-r", "-M", "-S", "-T", "-W", "-l", "-L"]);
	var quiet = args.indexOf("-q") > -1;
	if (reste.length < 2) throw new ShellError("usage: named-checkzone [-djqvD] [-c class] [-f inputformat] [-F outputformat] [-J filename] [-s (full|relative)] [-t directory] [-w directory] [-k (ignore|warn|fail)] [-m (ignore|warn|fail)] [-n (ignore|warn|fail)] [-r (ignore|warn|fail)] [-i (full|full-sibling|local|local-sibling|none)] [-M (ignore|warn|fail)] [-S (ignore|warn|fail)] [-W (ignore|warn)] [-o filename] zonename [ (filename|-) ]" +
		astuce(io, "Deux arguments : le nom de la zone, puis son fichier. Exemple : named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan"), 1);
	var lu;
	try { lu = lireFichierJoueurIle(reste[1], io, "named-checkzone"); }
	catch (e){ throw new ShellError("zone " + reste[0].replace(/\.$/, "") + "/IN: loading from master file " + reste[1] + " failed: file not found\nzone " + reste[0].replace(/\.$/, "") + "/IN: not loaded due to errors.", 1); }
	var z = lireZoneIle(lu.texte, reste[0], reste[1]);
	var nomZone = reste[0].replace(/\.$/, "").toLowerCase(), lignes = z.avertissements.slice();
	evenementIle(h, "named-checkzone", { zone: nomZone, ok: !z.erreurs.length, serie: z.serie, fichier: reste[1], erreurs: z.erreurs.slice(), avertissements: z.avertissements.slice() });
	if (z.erreurs.length){
		io.code = 1;
		return quiet ? "" : z.erreurs.concat(lignes).concat(["zone " + nomZone + "/IN: not loaded due to errors."]).join("\n");
	}
	if (quiet) return "";
	lignes.push("zone " + nomZone + "/IN: loaded serial " + z.serie, "OK");
	return lignes.join("\n");
};

/* ================================================================== */
/* rndc                                                                 */
/* ================================================================== */

Shell.sorts.rndc = function(args, io){
	var h = ileIci();
	if (!h || !fichierHote(h, "/etc/bind/named.conf")) throw new ShellError("rndc: command not found", 127);
	var cle = fichierHote(h, "/etc/bind/rndc.key");
	if (!io.sudo && cle && !Shell.bit(cle, "r", io)) throw new ShellError("open: /etc/bind/rndc.key: permission denied\nrndc: could not load rndc configuration" + astuce(io, "La clé de rndc (/etc/bind/rndc.key) n'est lisible que par root et le groupe bind : sudo rndc ..."), 1);
	var mots = argumentsIle(args, ["-s", "-p", "-k", "-c", "-y", "-V"]);
	var ordre = mots[0], zone = mots[1] ? mots[1].toLowerCase().replace(/\.$/, "") : null;
	if (!ordre) throw new ShellError("Usage: rndc [-b address] [-c config] [-s server] [-p port]\n\t[-k key-file ] [-y key] [-r] [-V] [-4 | -6] command\n\ncommand is one of the following:\n\n  reload\tReload configuration file and zones.\n  reload zone [class [view]]\n\t\tReload a single zone.\n  reconfig\tReload configuration file and new zones only.\n  retransfer zone [class [view]]\n\t\tRetransfer a single zone without checking serial number.\n  freeze zone\tSuspend updates to a dynamic zone.\n  thaw zone\tEnable updates to a frozen dynamic zone and reload it.\n  notify zone\tResend NOTIFY messages for the zone.\n  status\tDisplay status of the server.\n  zonestatus zone\tDisplay the current status of a zone.\n  flush \tFlushes all of the server's caches.", 1);
	if (!bindTourne(h)) throw new ShellError("rndc: connect failed: 127.0.0.1#953: connection refused" + astuce(io, "named ne tourne pas : sudo systemctl status named, puis journalctl -u named pour comprendre."), 1);
	var b = etatBindIle(h), z = zone ? b.zones[zone] : null;
	var pasTrouvee = function(){ throw new ShellError("rndc: '" + ordre + "' failed: not found\nno matching zone '" + zone + "' in any view", 1); };
	evenementIle(h, "rndc", { ordre: ordre, zone: zone });
	switch (ordre){
		case "reload":
			if (zone){
				if (!z) pasTrouvee();
				if (z.type === "secondary") throw new ShellError("rndc: 'reload' failed: not found" + astuce(io, "Sur un secondaire, on ne recharge pas : on retransfère (rndc retransfer " + zone + ")."), 1);
				var avant = z.texteFichier, avantSerie = z.serie;
				var r = chargerBindIle(h, "reload", zone);
				if (!r.ok) throw new ShellError("rndc: 'reload' failed: failure", 1);
				var nz = etatBindIle(h).zones[zone];
				if (!nz || !nz.chargee || (nz === z && nz.texteFichier === avant && nz.serie === avantSerie && lireIle(h, nz.fichier) !== avant)){ io.code = 1; return "rndc: 'reload' failed: failure" + astuce(io, "La zone n'a pas pu être rechargée : journalctl -u named dit pourquoi (named-checkzone aussi). named continue de servir l'ancienne version."); }
				return avant === nz.texteFichier ? "zone reload up-to-date" : "zone reload successful";
			}
			var rr = chargerBindIle(h, "reload");
			if (!rr.ok){ io.code = 1; return "rndc: 'reload' failed: failure" + astuce(io, "La configuration a une faute : named garde l'ancienne. named-checkconf la montre."); }
			return "server reload successful";
		case "reconfig":
			var rc = chargerBindIle(h, "reload");
			if (!rc.ok){ io.code = 1; return "rndc: 'reconfig' failed: failure"; }
			return "";
		case "retransfer":
			if (!z) pasTrouvee();
			if (z.type !== "secondary") throw new ShellError("rndc: 'retransfer' failed: failure\nretransfer: inappropriate zone type: primary", 1);
			rafraichirSecondaireIle(h, zone, "retransfer");
			return "";
		case "notify":
			if (!z) pasTrouvee();
			notifierIle(h, zone);
			return "zone notify queued";
		case "freeze":
			if (!z) pasTrouvee();
			if (!z.allowUpdate || !z.allowUpdate.length) throw new ShellError("rndc: 'freeze' failed: not dynamic", 1);
			if (z.dyn.length){
				moteurSeul(function(){ poserFichierHote(h, z.fichier, texteZoneIle(z), { owner: "bind" }); });
				z.texteFichier = lireIle(h, z.fichier);
				z.dyn = [];
				supprimerJournalZoneIle(h, z.fichier);
			}
			z.gele = true;
			journalIle(h, "named", "named", "freezing zone '" + zone + "/IN': success", 6);
			return "";
		case "thaw":
			if (!z) pasTrouvee();
			z.gele = false;
			chargerBindIle(h, "reload", zone);
			journalIle(h, "named", "named", "thawing zone '" + zone + "/IN': success", 6);
			return "A zone reload and thaw was started.\nCheck the logs to see the result.";
		case "status":
			var nb = Object.keys(b.zones).length;
			return "version: BIND 9.18.28-1~deb12u2-Debian (Extended Support Version) <id:>\nrunning on " + h + ": Linux x86_64 " + versionNoyau(h) + " #1 SMP PREEMPT_DYNAMIC Debian 6.1.112-1 (2024-09-30)\n" +
				"boot time: " + dateGmtIle(h, (etatMachine(h).services["named.service"] || {}).depuis) + "\nlast configured: " + dateGmtIle(h, b.charge) + "\nconfiguration file: /etc/bind/named.conf\n" +
				"CPUs found: 2\nworker threads: 2\nUDP listeners per interface: 2\nnumber of zones: " + (nb + 97) + " (97 automatic)\ndebug level: 0\nxfers running: 0\nxfers deferred: 0\nsoa queries in progress: 0\n" +
				"query logging is OFF\nrecursive clients: 0/900/1000\ntcp clients: 0/150\nTCP high-water: 0\nserver is up and running";
		case "zonestatus":
			if (!z) pasTrouvee();
			var noeuds = {};
			z.enregistrements.forEach(function(x){ noeuds[x.nom] = true; });
			return "name: " + zone + "\ntype: " + z.type + "\nfiles: " + (z.fichier || "") + "\nserial: " + (z.serie === null ? "" : z.serie) + "\nnodes: " + Object.keys(noeuds).length +
				"\nlast loaded: " + dateGmtIle(h, z.charge) + (z.type === "secondary" && z.transfere ? "\nnext refresh: " + dateGmtIle(h, z.transfere + 3600000) + "\nexpires: " + dateGmtIle(h, z.transfere + 604800000) : "") +
				"\nsecure: no\ndynamic: " + (z.allowUpdate && z.allowUpdate.length ? "yes" : "no") + (z.gele ? "\nfrozen: yes" : "") + "\nreconfigurable via modzone: no";
		case "flush": case "flushname": case "sync": case "dumpdb": case "stats":
			return "";
		default:
			throw new ShellError("rndc: '" + ordre + "' failed: unknown command", 1);
	}
};

/* ================================================================== */
/* tsig-keygen, nsupdate                                                */
/* ================================================================== */

Shell.sorts["tsig-keygen"] = function(args, io){
	var h = ileIci();
	if (!h || !dossierHote(h, "/etc/bind")) throw new ShellError("tsig-keygen: command not found", 127);
	var algo = optionIle(args, ["-a"]) || "hmac-sha256";
	if (["hmac-md5", "hmac-sha1", "hmac-sha224", "hmac-sha256", "hmac-sha384", "hmac-sha512"].indexOf(algo) === -1) throw new ShellError("tsig-keygen: unsupported algorithm '" + algo + "'", 1);
	var nom = argumentsIle(args, ["-a"])[0] || "tsig-key";
	var secret = btoa(hexDe("tsig:" + nom + ":" + state.nbCommandes + ":" + Math.random(), 64).replace(/../g, function(x){ return String.fromCharCode(parseInt(x, 16)); }));
	evenementIle(h, "tsig-keygen", { nom: nom });
	return "key \"" + nom + "\" {\n\talgorithm " + algo + ";\n\tsecret \"" + secret + "\";\n};";
};
/* Lit une clé TSIG dans un fichier (format de tsig-keygen) : { nom, algo, secret } ou null. */
function lireCleTsigIle(texte){
	var e = [], arbre = arbreBindIle(jetonsBindIle(texte), "cle", e);
	var k = arbre.filter(function(s){ return s.mot === "key"; })[0];
	if (!k || e.length) return null;
	var c = { nom: k.args[0] ? k.args[0].v : "", algo: null, secret: null };
	(k.bloc || []).forEach(function(x){ if (x.mot === "algorithm") c.algo = x.args[0] ? x.args[0].v : null; if (x.mot === "secret") c.secret = x.args[0] ? x.args[0].v : null; });
	return c.secret ? c : null;
}
/* Les ordres de nsupdate, appliqués d'un bloc à « send ». */
function executerNsupdateIle(h, lignes, cle, io){
	var sortie = [], serveur = null, zone = null, ops = [], ttlDefaut = 0, prereqs = [];
	function envoyer(){
		if (!ops.length && !prereqs.length) return;
		var hs = serveur ? resoudreHoteIle(serveur) : null;
		if (!serveur){
			// Sans « server », nsupdate demande le SOA de la zone, puis son serveur primaire.
			var nomRef = zone || (ops[0] ? ops[0].rr.nom : null);
			hs = hoteDepuisResolvIle(h);
			if (hs && nomRef){ var zz = zoneServieIle(hs, nomRef); if (zz && zz.type === "secondary"){ var p = hoteDeIpIle(zz.primaires[0]); if (p) hs = p; } }
		}
		if (!hs || !estMachine(hs) || !bindTourne(hs)){ sortie.push("; Communication with " + (serveur || "server") + "#53 failed: connection refused"); io.code = 2; ops = []; return; }
		var nomZone = zone ? zone.toLowerCase().replace(/\.$/, "") : null;
		var z = nomZone ? etatBindIle(hs).zones[nomZone] : (ops[0] ? zoneServieIle(hs, ops[0].rr.nom) : null);
		if (!z){ sortie.push("update failed: NOTAUTH"); io.code = 2; ops = []; return; }
		nomZone = z.nom;
		if (z.type !== "primary"){ sortie.push("update failed: REFUSED"); io.code = 2; ops = []; return; }
		var confCles = (etatBindIle(hs).conf || {}).cles || {};
		var nomCle = null;
		if (cle){
			var vraie = confCles[cle.nom];
			if (!vraie || vraie.secret !== cle.secret){
				journalIle(hs, "named", "named", "client @0x7f3a2c02a168 " + ipIle(h) + "#" + (50000 + state.nbCommandes % 9000) + ": request has invalid signature: TSIG " + cle.nom + ": tsig verify failure (BADKEY)", 3);
				sortie.push("; TSIG error with server: tsig verify failure"); io.code = 2; ops = []; return;
			}
			nomCle = cle.nom;
		}
		if (!listeAccepteIle(z.allowUpdate || [], ipIle(h), nomCle)){
			journalIle(hs, "named", "named", "client @0x7f3a2c02a168 " + ipIle(h) + "#" + (50000 + state.nbCommandes % 9000) + (nomCle ? "/key " + nomCle : "") + ": update '" + nomZone + "/IN' denied", 3);
			sortie.push("update failed: REFUSED"); io.code = 2; ops = []; return;
		}
		if (z.gele){ sortie.push("update failed: SERVFAIL"); io.code = 2; ops = []; return; }
		var horsZone = ops.filter(function(o){ var n = o.rr.nom, orig = nomZone + "."; return !(n === orig || n.substring(n.length - orig.length - 1) === "." + orig); });
		if (horsZone.length){ sortie.push("update failed: NOTZONE"); io.code = 2; ops = []; return; }
		var serie = (z.serie || 0) + 1;
		ops.forEach(function(o, i){
			o.serie = i === ops.length - 1 ? serie : null;
			z.dyn = z.dyn || [];
			z.dyn.push(copieJson(o));
			journalIle(hs, "named", "named", "client @0x7f3a2c02a168 " + ipIle(h) + "#" + (50000 + state.nbCommandes % 9000) + (nomCle ? "/key " + nomCle : "") + ": updating zone '" + nomZone + "/IN': " +
				(o.action === "add" ? "adding an RR at '" + o.rr.nom.replace(/\.$/, "") + "' " + o.rr.type + " " + texteRrIle(o.rr) : "deleting rrset at '" + o.rr.nom.replace(/\.$/, "") + "'" + (o.rr.type ? " " + o.rr.type : "")), 6);
		});
		appliquerDynIle(z);
		z.serie = serieZoneIle(z);
		moteurSeul(function(){ poserFichierHote(hs, z.fichier + ".jnl", "", { owner: "bind", mode: "rw-r--r--", binaire: { sortie: "" } }); });
		evenementIle(hs, "nsupdate", { zone: nomZone, ops: ops.map(function(o){ return { action: o.action, nom: o.rr.nom, type: o.rr.type, valeur: o.rr.donnees === undefined ? null : texteRrIle(o.rr) }; }), cle: nomCle, depuis: h });
		notifierIle(hs, nomZone);
		ops = [];
	}
	for (var i = 0; i < lignes.length; i++){
		var l = lignes[i].replace(/;.*$/, "").trim();
		if (!l) continue;
		var m = l.split(/\s+/), mot = m[0].toLowerCase();
		if (mot === "server"){ serveur = m[1]; continue; }
		if (mot === "zone"){ zone = m[1]; continue; }
		if (mot === "ttl"){ ttlDefaut = +m[1] || 0; continue; }
		if (mot === "key" || mot === "local" || mot === "class" || mot === "prereq" || mot === "realm" || mot === "gsstsig" || mot === "oldgsstsig"){ continue; }
		if (mot === "show"){ sortie.push("Outgoing update query:\n;; ->>HEADER<<- opcode: UPDATE, status: NOERROR, id:      0\n;; flags:; ZONE: 0, PREREQ: 0, UPDATE: " + ops.length + ", ADDITIONAL: 0\n;; UPDATE SECTION:\n" + ops.map(function(o){ return o.action === "add" ? ligneRrIle(o.rr) : o.rr.nom + "\t\t0\tANY\t" + (o.rr.type || "ANY"); }).join("\n")); continue; }
		if (mot === "send"){ envoyer(); continue; }
		if (mot === "quit"){ envoyer(); break; }
		if (mot === "answer" || mot === "debug"){ continue; }
		if (mot === "update" || mot === "add" || mot === "delete" || mot === "del"){
			var parts = mot === "update" ? m.slice(1) : m;
			var action = parts[0].toLowerCase();
			if (action === "del") action = "delete";
			if (action !== "add" && action !== "delete"){ sortie.push("incorrect section name: " + parts[0]); io.code = 1; continue; }
			var reste = parts.slice(1);
			if (!reste.length){ sortie.push("failed to read owner name"); io.code = 1; continue; }
			var nom = /\.$/.test(reste[0]) ? reste[0].toLowerCase() : (zone ? reste[0].toLowerCase() + "." + zone.toLowerCase().replace(/\.?$/, ".") : reste[0].toLowerCase() + ".");
			var k = 1, ttl = null;
			if (reste[k] && /^\d+$/.test(reste[k])){ ttl = +reste[k]; k++; }
			if (reste[k] && /^IN$/i.test(reste[k])) k++;
			var type = reste[k] ? reste[k].toUpperCase() : null;
			var donnees = reste.slice(k + 1).join(" ");
			if (action === "add"){
				if (ttl === null && !ttlDefaut){ sortie.push("ttl must be specified"); io.code = 1; continue; }
				if (!type || !donnees){ sortie.push("failed to read rdata"); io.code = 1; continue; }
				var lu = lireZoneIle("$TTL " + (ttl || ttlDefaut) + "\n@ IN SOA a. b. 1 1 1 1 1\n@ IN NS a.\n" + nom + " " + type + " " + donnees, "tmp.invalid", "nsupdate");
				var rr = lu.enregistrements.filter(function(x){ return x.nom === nom; })[0];
				var err = lu.erreurs.filter(function(x){ return !/no NS|SOA|has no address/.test(x); })[0];
				if (err || !rr){ sortie.push(err ? err.replace(/^.*?: nsupdate:\d+: /, "") : "failed to read rdata"); io.code = 1; continue; }
				rr.ttl = ttl || ttlDefaut;
				delete rr.l;
				ops.push({ action: "add", rr: rr });
			} else {
				var rrd = { nom: nom, type: type || null };
				if (type && donnees){ var lu2 = lireZoneIle("$TTL 1\n@ IN SOA a. b. 1 1 1 1 1\n@ IN NS a.\n" + nom + " " + type + " " + donnees, "tmp.invalid", "nsupdate"); var x2 = lu2.enregistrements.filter(function(x){ return x.nom === nom; })[0]; if (x2) rrd.donnees = x2.donnees; }
				ops.push({ action: "delete", rr: rrd });
			}
			continue;
		}
		sortie.push("incorrect section name: " + m[0]); io.code = 1;
	}
	envoyer();
	return sortie.join("\n");
}
/* Le serveur de noms qu'interroge une machine : le premier nameserver de /etc/resolv.conf. */
function serveurResolvIle(h){
	var m = /^\s*nameserver\s+(\S+)/m.exec(lireIle(h, "/etc/resolv.conf") || "");
	return m ? m[1] : null;
}
function hoteDepuisResolvIle(h){ var ip = serveurResolvIle(h); return ip ? hoteDeIpIle(ip) : null; }
Shell.sorts.nsupdate = function(args, io){
	var h = ileIci();
	if (!h) throw new ShellError("nsupdate: command not found", 127);
	var fichierCle = optionIle(args, ["-k"]), cle = null;
	if (fichierCle !== null){
		if (!fichierCle) throw new ShellError("nsupdate: option requires an argument -- 'k'", 1);
		var lu;
		try { lu = lireFichierJoueurIle(fichierCle, io, "nsupdate"); }
		catch (e){ throw new ShellError("could not read key from " + fichierCle + ".{private,key}: file not found" + astuce(io, "Le fichier de la clé TSIG doit être lisible : sudo nsupdate -k ..."), 1); }
		cle = lireCleTsigIle(lu.texte);
		if (!cle) throw new ShellError("could not read key from " + fichierCle + ".{private,key}: unexpected token", 1);
	}
	var reste = argumentsIle(args, ["-k", "-y", "-p", "-t", "-u", "-r"]);
	var texte = null;
	if (reste[0]){ texte = lireFichierJoueurIle(reste[0], io, "nsupdate").texte; }
	else if (io.stdin !== null) texte = io.stdin;
	if (texte === null){
		if (!io.tty || !term || !term.demander) throw new ShellError("nsupdate: no input", 1);
		var lignes = [];
		var demander = function(){
			term.demander("> ", false, function(r){
				var l = String(r);
				lignes.push(l);
				if (/^\s*(send|quit)\s*$/.test(l) || /^\s*$/.test(l) && lignes.length > 1){
					var s = executerNsupdateIle(h, lignes, cle, { code: 0 });
					if (s) term.echo(s);
					if (/^\s*quit/.test(l) || /^\s*$/.test(l)){ Shell.fin(); return; }
					lignes = [];
				}
				demander();
			});
		};
		demander();
		return "";
	}
	return executerNsupdateIle(h, texte.split("\n"), cle, io);
};

/* ================================================================== */
/* dig                                                                   */
/* ================================================================== */

var TYPES_DIG_ILE = ["A", "AAAA", "MX", "NS", "TXT", "SOA", "PTR", "CNAME", "SRV", "ANY", "AXFR", "IXFR", "CAA"];
/* Une question posée à un serveur de l'île : { statut, aa, reponses, autorite, transfert }. */
function questionIle(hs, nom, type, ipClient){
	var r = { statut: "NOERROR", aa: false, reponses: [], autorite: [], refuse: false };
	nom = nom.toLowerCase().replace(/\.?$/, ".");
	var b = etatBindIle(hs), conf = b.conf || { options: { recursion: false } };
	var z = zoneServieIle(hs, nom);
	if (!z){
		r.statut = conf.options && conf.options.recursion ? "SERVFAIL" : "REFUSED";
		return r;
	}
	r.aa = true;
	var recs = enregistrementsServisIle(z);
	if (type === "AXFR" || type === "IXFR"){
		if (!listeAccepteIle(z.allowTransfer || [], ipClient, null)){ r.refuse = true; journalIle(hs, "named", "named", "client @0x7f3a2c01e168 " + ipClient + "#" + (40000 + state.nbCommandes % 20000) + " (" + z.nom + "): zone transfer '" + z.nom + "/AXFR/IN' denied", 3); return r; }
		var soa = recs.filter(function(x){ return x.type === "SOA"; })[0];
		r.transfert = [soa].concat(recs.filter(function(x){ return x.type !== "SOA"; })).concat([soa]);
		journalIle(hs, "named", "named", "client @0x7f3a2c01e168 " + ipClient + "#" + (40000 + state.nbCommandes % 20000) + " (" + z.nom + "): transfer of '" + z.nom + "/IN': AXFR started (serial " + z.serie + ")", 6);
		return r;
	}
	var chaine = [], courant = nom, garde = 0;
	while (garde++ < 8){
		var ici = recs.filter(function(x){ return x.nom === courant; });
		if (!ici.length){
			// Un nom absent : est-ce un nœud intermédiaire (des enfants existent) ?
			var enfants = recs.some(function(x){ return x.nom.substring(x.nom.length - courant.length - 1) === "." + courant; });
			if (!chaine.length && !enfants) r.statut = "NXDOMAIN";
			break;
		}
		var cname = ici.filter(function(x){ return x.type === "CNAME"; })[0];
		if (cname && type !== "CNAME" && type !== "ANY"){
			chaine.push(cname);
			courant = cname.donnees;
			var zz = zoneServieIle(hs, courant);
			if (!zz || zz !== z){ break; }
			continue;
		}
		ici.forEach(function(x){ if (type === "ANY" || x.type === type) chaine.push(x); });
		break;
	}
	r.reponses = chaine;
	if (!chaine.length || (chaine.length && chaine[chaine.length - 1].type === "CNAME" && type !== "CNAME" && r.statut === "NOERROR" && !recs.some(function(x){ return x.nom === courant; }))){
		var soaA = recs.filter(function(x){ return x.type === "SOA"; })[0];
		if (soaA) r.autorite = [soaA];
	}
	return r;
}
function nomInverseIle(ip){ return ip.split(".").reverse().join(".") + ".in-addr.arpa."; }
var DIG_AVANT_ILE = Shell.sorts.dig;
Shell.sorts.dig = function(args, io){
	var ici = Shell.hote(), surIle = estHoteIle(ici);
	var serveur = null, type = null, nom = null, court = false, sansTout = false, avecReponse = true, inverse = false, tcp = false, recurse = true, simples = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "+short") court = true;
		else if (a === "+noall"){ sansTout = true; avecReponse = false; }
		else if (a === "+answer") avecReponse = true;
		else if (a === "+tcp") tcp = true;
		else if (a === "+norecurse" || a === "+norec") recurse = false;
		else if (a.charAt(0) === "+") continue;
		else if (a.charAt(0) === "@") serveur = a.substring(1);
		else if (a === "-x"){ inverse = true; nom = args[++i] ? nomInverseIle(args[i]) : null; type = "PTR"; }
		else if (a === "-t"){ type = (args[++i] || "A").toUpperCase(); }
		else if (a === "-p" || a === "-k" || a === "-b" || a === "-q" || a === "-c"){ if (a === "-q") nom = args[i + 1]; i++; }
		else if (a === "-4" || a === "-6") continue;
		else if (a.charAt(0) === "-") throw new ShellError("Invalid option: " + a + "\nUsage:  dig [@global-server] [domain] [q-type] [q-class] {q-opt}\n            {global-d-opt} host [@local-server] {local-d-opt}\n            [ host [@local-server] {local-d-opt} [...]]\n\nUse \"dig -h\" (or \"dig -h | more\") for complete list of options", 1);
		else simples.push(a);
	}
	simples.forEach(function(a){
		if (TYPES_DIG_ILE.indexOf(a.toUpperCase()) > -1 && type === null && (nom !== null || simples.length > 1)) type = a.toUpperCase();
		else if (/^(IN|CH|HS)$/i.test(a)) return;
		else if (nom === null) nom = a;
		else if (TYPES_DIG_ILE.indexOf(a.toUpperCase()) > -1 && type === null) type = a.toUpperCase();
	});
	// Le serveur interrogé : l'option @, sinon /etc/resolv.conf de la machine.
	var hs = null, ipServeur = null, nomServeur = null;
	if (serveur){
		hs = resoudreHoteIle(serveur);
		ipServeur = /^\d+\.\d+\.\d+\.\d+$/.test(serveur) ? serveur : (hs ? ipIle(hs) : null);
		nomServeur = serveur;
	} else if (surIle){
		ipServeur = serveurResolvIle(ici);
		hs = ipServeur ? hoteDeIpIle(ipServeur) : null;
		nomServeur = ipServeur;
	}
	if (!(surIle || (hs && estHoteIle(hs)))) return DIG_AVANT_ILE.apply(this, arguments);
	if (!state.knows("dig")) throw new ShellError("Tu ne connais pas encore le sort « dig ». " + Shell.ouApprendre("dig"), 127);
	if (serveur && !ipServeur) throw new ShellError("dig: couldn't get address for '" + serveur + "': not found", 10);
	if (!nom){ nom = "."; type = type || "NS"; }
	type = type || "A";
	var questionNom = nom.toLowerCase().replace(/\.?$/, ".");
	var entete = "\n; <<>> DiG 9.18.28-1~deb12u2-Debian <<>> " + args.join(" ") + "\n" + (serveur ? "; (1 server found)\n" : "") + ";; global options: +cmd";
	var ipClient = surIle ? ipIle(ici) : (HOTES[ici] && HOTES[ici].ip) || "10.0.92.1";
	var joignable = hs && estMachine(hs) && bindTourne(hs);
	if (!joignable){
		var err = [];
		for (var e = 0; e < 3; e++) err.push(";; communications error to " + ipServeur + "#53: " + (hs && estMachine(hs) ? "connection refused" : "timed out"));
		io.code = 9;
		evenementIle(ici, "dig", { serveur: hs, nom: questionNom, type: type, ok: false, injoignable: true });
		return (court ? err.join("\n") + "\n;; no servers could be reached" : err.join("\n") + "\n" + entete + "\n;; no servers could be reached") +
			astuce(io, hs && estMachine(hs) ? "Personne n'écoute sur le port 53 de " + hs + " : named ne tourne pas (sudo systemctl status named, là-bas)." : "Ce serveur ne répond pas.");
	}
	var q = questionIle(hs, questionNom, type, ipClient);
	evenementIle(ici, "dig", { serveur: hs, nom: questionNom, type: type, ok: !q.refuse && q.statut === "NOERROR" && (q.reponses.length > 0 || !!q.transfert), statut: q.statut,
		refuse: !!q.refuse, transfert: !!q.transfert, reponses: q.reponses.map(function(x){ return { nom: x.nom, type: x.type, valeur: texteRrIle(x) }; }), court: court, inverse: inverse, client: ici });
	var srv = ";; SERVER: " + ipServeur + "#53(" + nomServeur + ") (" + (type === "AXFR" || tcp ? "TCP" : "UDP") + ")";
	if (type === "AXFR" || type === "IXFR"){
		if (q.refuse || !q.transfert){
			io.code = 0;
			return court ? "; Transfer failed." : entete.replace(/^\n/, "") + "\n; Transfer failed." + astuce(io, "Le serveur refuse de donner toute la zone à cette machine (allow-transfer). C'est voulu : seuls les secondaires y ont droit.");
		}
		var lt = q.transfert.map(ligneRrIle);
		if (court) return q.transfert.map(texteRrIle).join("\n");
		return entete.replace(/^\n/, "") + "\n" + lt.join("\n") + "\n;; Query time: 1 msec\n" + srv + "\n;; WHEN: " + dateDigIle(ici) + "\n;; XFR size: " + q.transfert.length + " records (messages 1, bytes " + (q.transfert.length * 38 + 64) + ")\n";
	}
	if (court){
		if (q.statut !== "NOERROR") return "";
		return q.reponses.map(texteRrIle).join("\n");
	}
	var id = 10000 + Math.floor(alea("dig-" + state.nbCommandes + questionNom) * 55000);
	var drapeaux = "qr" + (q.aa ? " aa" : "") + (recurse ? " rd" : "");
	var add = 1;
	var l = [];
	if (!sansTout){
		l.push(entete.replace(/^\n/, ""), ";; Got answer:", ";; ->>HEADER<<- opcode: QUERY, status: " + q.statut + ", id: " + id,
			";; flags: " + drapeaux + "; QUERY: 1, ANSWER: " + q.reponses.length + ", AUTHORITY: " + q.autorite.length + ", ADDITIONAL: " + add);
		if (recurse) l.push(";; WARNING: recursion requested but not available");
		l.push("", ";; OPT PSEUDOSECTION:", "; EDNS: version: 0, flags:; udp: 1232", "; COOKIE: " + hexDe("cookie:" + hs + state.nbCommandes, 16) + "0100000067" + hexDe("cookie2:" + state.nbCommandes, 22) + " (good)",
			";; QUESTION SECTION:", ";" + questionNom + (questionNom.length < 15 ? "\t\t\t" : "\t\t") + "IN\t" + type, "");
	}
	if (q.reponses.length && avecReponse){
		if (!sansTout) l.push(";; ANSWER SECTION:");
		q.reponses.forEach(function(x){ l.push(ligneRrIle(x)); });
		if (!sansTout) l.push("");
	}
	if (q.autorite.length && !sansTout){
		l.push(";; AUTHORITY SECTION:");
		q.autorite.forEach(function(x){ l.push(ligneRrIle(x)); });
		l.push("");
	}
	if (!sansTout){
		l.push(";; Query time: 0 msec", srv, ";; WHEN: " + dateDigIle(ici), ";; MSG SIZE  rcvd: " + (40 + q.reponses.length * 32 + q.autorite.length * 60), "");
	}
	var texte = l.join("\n");
	if (io.tty && !sansTout){
		if (q.statut === "REFUSED"){
			var complet = new RegExp("(^|\\.)" + DOMAINE_ILE.replace(/\./g, "\\.") + "\\.?$").test(nom);
			texte += astuce(io, hs + " ne fait autorité pour aucune zone chargée qui contient ce nom, et ne cherche pas ailleurs (recursion no). " +
				(complet ? "La zone " + DOMAINE_ILE + " n'est pas chargée sur " + hs + " : journalctl -u named dit pourquoi." : "Un nom complet, peut-être : " + nom.replace(/\.$/, "") + "." + DOMAINE_ILE));
		}
		else if (q.statut === "NXDOMAIN") texte += astuce(io, "NXDOMAIN : ce nom n'existe pas dans la zone servie par " + hs + ".");
	}
	return texte;
};

/* mkdir -p sur une machine de l'île : chaque dossier manquant du chemin est créé, l'un après l'autre (avec les mêmes droits). */
var MKDIR_AVANT_ILE = Shell.sorts.mkdir;
Shell.sorts.mkdir = function(args, io){
	var h = ileIci();
	var parents = args.some(function(a){ return /^-[a-zA-Z]*p/.test(a) || a === "--parents"; });
	if (!h || !parents) return MKDIR_AVANT_ILE.apply(this, arguments);
	var options = args.filter(function(a){ return a.charAt(0) === "-"; }), sorties = [];
	args.filter(function(a){ return a.charAt(0) !== "-"; }).forEach(function(a){
		var abs = cheminNormal(a.charAt(0) === "/" ? a : cheminDuLieuMachine(current_room) + "/" + a), x = "";
		abs.split("/").filter(Boolean).forEach(function(m){
			x += "/" + m;
			if (dossierHote(h, x)) return;
			var s = MKDIR_AVANT_ILE.call(this, options.concat([x]), io);
			if (s) sorties.push(s);
		});
	});
	return sorties.join("\n");
};
