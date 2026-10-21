/**
 * SortsGit.js : le moteur de git (chapitre 9 pour le joueur, numéro interne 10, la Chronique d'Éternité), le cœur.
 *
 * Un dépôt est un vrai dossier .git dans le système de fichiers du jeu (des lieux et des objets), comme sous Linux :
 *   .git/HEAD, config, description, refs/heads/*, refs/tags/*, refs/remotes/R/*, refs/stash, packed-refs,
 *   logs/HEAD et logs/refs/... (le reflog, au vrai format), ORIG_HEAD, MERGE_HEAD, MERGE_MSG, CHERRY_PICK_HEAD,
 *   REVERT_HEAD, rebase-merge/ (l'état d'un rebase), BISECT_*, hooks/, info/exclude, index, objects/xx/yyyy (les
 *   objets « loose ») et objects/pack/pack-*.pack (les objets rangés en pack, comme après un clone ou un git gc).
 * Les refs se lisent DANS les fichiers : echo HASH > .git/refs/heads/x se voit aussitôt. Supprimer .git, c'est
 * supprimer l'historique. Les objets ont leurs vrais formats et le vrai SHA-1 : le hash d'un commit est celui que
 * donnerait le vrai git pour le même contenu, le même auteur et la même date.
 *
 * Un objet loose est un objet du jeu dont le texte affiché est un charabia binaire (comme le zlib du vrai) ; sa donnée
 * est dans la propriété sauvegardée gitObjet { t: type, c: contenu }. Un pack porte tous ses objets dans gitPack
 * { o: { hash: [type, contenu] } }. L'index porte ses entrées dans gitIndex { e: [[chemin, hash, mode, étage]] }.
 * Un blob est un texte (son contenu exact, fin de ligne comprise), un arbre une liste [[mode, nom, hash]], un commit
 * ou un tag son texte.
 *
 * Ce fichier : les octets et le SHA-1, le système de fichiers (île ou machine), la découverte du dépôt, la config,
 * les objets, les refs et le reflog, l'index, les arbres, les commits, la copie de travail, .gitignore, le diff
 * (Myers, compactage et heuristique d'indentation comme xdiff), la fusion à trois voies (diff3), les révisions,
 * le parcours de l'historique, les transports (chemins locaux, hote:/chemin, ssh://hote/chemin), les signatures
 * ssh, le constructeur des scénarios et l'API de lecture pour le chapitre.
 * Les commandes elles-mêmes : SortsGitCli.js. La forge (gh) : SortsGitForge.js.
 *
 * --- Ce que le monde (le chapitre) peut appeler ---
 *   gitMaintenant(h)                       l'horloge (ms), surchargeable ; h vaut null sur l'île
 *   gitDepot(h, chemin)                    le dépôt (objet R) dont ce chemin fait partie, ou null
 *   gitResoudre(h, chemin, rev)            le hash complet d'une révision (ou null)
 *   gitCommitLu(h, chemin, hash)           { arbre, parents, auteur, mail, date, commiteur, message, signature } ou null
 *   gitHistorique(h, chemin, rev, { premierParent, tous }) les hash, du plus récent au plus ancien
 *   gitBranches(h, chemin) / gitTags(h, chemin)   { nom: hash }
 *   gitStatut(h, chemin)                   { branche, detache, indexees, modifiees, nonSuivies, conflits, etat }
 *   gitFichierA(h, chemin, rev, fichier)   le contenu d'un fichier à une révision (null s'il n'y est pas)
 *   gitEstAncetre(h, chemin, a, b)         a est-il un ancêtre de b (ou égal) ?
 *   gitReflog(h, chemin, ref)              [{ ancien, nouveau, message, date }] du plus récent au plus ancien
 *   gitIgnore(h, chemin, fichier)          vrai si .gitignore ignore ce fichier
 *   gitDiffTexte(h, chemin, a, b)          le diff unifié entre deux révisions
 *   gitConfigLue(h, chemin, cle)           la valeur effective d'une clé de config
 *   gitConstructeur(h, chemin, options)    semer un dépôt (voir plus bas), gitClonerDirect, gitPousserDirect
 */

/* ================================================================== */
/* Les octets et le SHA-1                                              */
/* ================================================================== */

function gUtf8(texte){
	var s = String(texte), o = [];
	for (var i = 0; i < s.length; i++){
		var c = s.charCodeAt(i);
		if (c < 0x80) o.push(c);
		else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63));
		else if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length){
			var d = s.charCodeAt(++i), u = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
			o.push(0xf0 | (u >> 18), 0x80 | ((u >> 12) & 63), 0x80 | ((u >> 6) & 63), 0x80 | (u & 63));
		}
		else o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
	}
	return o;
}
function gLongueurUtf8(texte){
	var s = String(texte), n = 0;
	for (var i = 0; i < s.length; i++){
		var c = s.charCodeAt(i);
		if (c < 0x80) n++; else if (c < 0x800) n += 2; else if (c >= 0xd800 && c < 0xdc00){ n += 4; i++; } else n += 3;
	}
	return n;
}
/* Le SHA-1 d'une liste d'octets, en hexadécimal (le vrai : même résultat que sha1sum). */
function gSha1(octets){
	var n = octets.length, bits = n * 8;
	var total = ((n + 9 + 63) >> 6) << 6;
	var m = new Array(total);
	for (var i = 0; i < n; i++) m[i] = octets[i];
	m[n] = 0x80;
	for (i = n + 1; i < total; i++) m[i] = 0;
	var haut = Math.floor(bits / 4294967296), bas = bits >>> 0;
	m[total - 8] = (haut >>> 24) & 255; m[total - 7] = (haut >>> 16) & 255; m[total - 6] = (haut >>> 8) & 255; m[total - 5] = haut & 255;
	m[total - 4] = (bas >>> 24) & 255; m[total - 3] = (bas >>> 16) & 255; m[total - 2] = (bas >>> 8) & 255; m[total - 1] = bas & 255;
	var h0 = 0x67452301, h1 = 0xEFCDAB89 | 0, h2 = 0x98BADCFE | 0, h3 = 0x10325476, h4 = 0xC3D2E1F0 | 0;
	var w = new Array(80);
	for (var bloc = 0; bloc < total; bloc += 64){
		for (var t = 0; t < 16; t++){ var j = bloc + t * 4; w[t] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]; }
		for (t = 16; t < 80; t++){ var x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]; w[t] = (x << 1) | (x >>> 31); }
		var a = h0, b = h1, c = h2, d = h3, e = h4;
		for (t = 0; t < 80; t++){
			var f, k;
			if (t < 20){ f = (b & c) | (~b & d); k = 0x5A827999; }
			else if (t < 40){ f = b ^ c ^ d; k = 0x6ED9EBA1; }
			else if (t < 60){ f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC | 0; }
			else { f = b ^ c ^ d; k = 0xCA62C1D6 | 0; }
			var tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) | 0;
			e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = tmp;
		}
		h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
	}
	return [h0, h1, h2, h3, h4].map(function(v){ return ("00000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
}
function gSha1Texte(texte){ return gSha1(gUtf8(texte)); }

var GIT_VIDE = "0000000000000000000000000000000000000000";
var GIT_ARBRE_VIDE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
var GIT_FUSEAU = "+0200", GIT_DECALAGE = 7200;
var GIT_VERSION = "2.43.0";

/* Le corps d'un objet, en octets. Un arbre : « mode nom\0 » puis les 20 octets du hash, pour chaque entrée. */
function gCorpsObjet(t, c){
	if (t !== "tree") return gUtf8(c);
	var o = [];
	for (var i = 0; i < c.length; i++){
		var e = c[i], tete = gUtf8(e[0] + " " + e[1]);
		for (var k = 0; k < tete.length; k++) o.push(tete[k]);
		o.push(0);
		for (k = 0; k < 40; k += 2) o.push(parseInt(e[2].substr(k, 2), 16));
	}
	return o;
}
function gHashObjet(t, c){
	var corps = gCorpsObjet(t, c);
	var tete = gUtf8(t + " " + corps.length);
	tete.push(0);
	return gSha1(tete.concat(corps));
}
function gTailleObjet(t, c){ return t === "tree" ? gCorpsObjet(t, c).length : gLongueurUtf8(c); }

/* ================================================================== */
/* Le système de fichiers du jeu : l'île (sans machine) ou une machine  */
/* ================================================================== */

function gJoueur(){ return typeof JOUEUR !== "undefined" ? JOUEUR : "joueur"; }
/* L'hôte d'un lieu : le nom de la machine, ou null sur l'île. */
function gHoteDe(lieu){ var r = typeof racineDe === "function" ? racineDe(lieu) : null; return r ? r.racineHote : null; }
/* La maison du joueur : sur l'île, Home ; sur une machine, /home/JOUEUR. */
function gMaison(lieu){
	var r = typeof racineDe === "function" ? racineDe(lieu) : null;
	if (!r) return Home;
	var m = r.getChildFromName("home"); m = m !== -1 ? m.getChildFromName(gJoueur()) : -1;
	return m !== -1 ? m : r;
}
/* Le chemin absolu tel que le montrerait un vrai Linux : /home/JOUEUR/... sur l'île, /... sur une machine. */
function gCheminReel(lieu){
	if (!lieu) return "";
	var r = typeof racineDe === "function" ? racineDe(lieu) : null;
	var morceaux = [], l = lieu, garde = 0;
	while (l && l !== r && l.parents && l.parents.length && garde++ < 200){ morceaux.unshift(l.room_name); l = l.parents[0]; }
	if (r) return "/" + morceaux.join("/");
	return "/home/" + gJoueur() + (morceaux.length ? "/" + morceaux.join("/") : "");
}
/* Suit un chemin (relatif, ~, /home/JOUEUR sur l'île, / sur une machine) sans contrôle de droits : { dir, nom, noeud } ou null. */
function gChemin(depart, chemin){
	chemin = String(chemin);
	var lieu = depart;
	if (chemin.charAt(0) === "~"){ lieu = gMaison(depart); chemin = chemin.replace(/^~\/?/, ""); }
	else if (chemin.charAt(0) === "/"){
		var r = typeof racineDe === "function" ? racineDe(depart) : null;
		if (r){ lieu = r; chemin = chemin.replace(/^\/+/, ""); }
		else {
			var p = "/home/" + gJoueur();
			if (chemin === p || chemin.indexOf(p + "/") === 0){ lieu = Home; chemin = chemin.substring(p.length).replace(/^\/+/, ""); }
			else return null;
		}
	}
	var m = chemin.split("/").filter(function(x){ return x !== "" && x !== "."; });
	if (!m.length) return { dir: lieu.parents[0] || lieu, nom: lieu.room_name, noeud: lieu };
	for (var i = 0; i < m.length - 1; i++){
		if (m[i] === ".."){ lieu = lieu.parents[0] || lieu; continue; }
		var s = lieu.getChildFromName(m[i]);
		if (s === -1 || !s) return null;
		lieu = s;
	}
	var dernier = m[m.length - 1];
	if (dernier === "..") return { dir: (lieu.parents[0] || lieu).parents[0] || lieu, nom: (lieu.parents[0] || lieu).room_name, noeud: lieu.parents[0] || lieu };
	return { dir: lieu, nom: dernier, noeud: lieu.getNode(dernier) };
}
/* Le lieu d'un chemin d'hôte (h null : l'île, chemin depuis la Maison). */
function gLieuHote(h, chemin){
	if (!h){ var r = gChemin(Home, chemin); return r && r.noeud instanceof Room ? r.noeud : null; }
	return typeof dossierHote === "function" ? dossierHote(h, chemin) : null;
}

/* Le contenu exact d'un objet du jeu (fin de ligne comprise), comme le lirait git. */
function gContenu(item){
	if (item.lien) return String(item.lien);
	var t = item.getText();
	if (t === null || t === undefined) t = "";
	t = String(t);
	return typeof contenuExact === "function" ? contenuExact(t, item.sansFinDeLigne) : (item.sansFinDeLigne || t === "" || /\n$/.test(t) ? t : t + "\n");
}
/* Pose un contenu exact dans un objet du jeu (sans fin de ligne finale : le jeu la rajoute à la lecture). */
function gPoserContenu(item, contenu){
	contenu = String(contenu);
	if (contenu === ""){ item.setText(""); item.sansFinDeLigne = false; return; }
	if (contenu.charAt(contenu.length - 1) === "\n"){
		var sans = contenu.substring(0, contenu.length - 1);
		if (sans !== "" && sans.charAt(sans.length - 1) !== "\n") item.setText(sans); else item.setText(contenu);
		item.sansFinDeLigne = false;
		return;
	}
	item.setText(contenu);
	item.sansFinDeLigne = true;
}
function gNouveauDossier(parent, nom, proprio, mode){
	var r = new Room(nom, "Un dossier.", "loc_etc.gif");
	r.owner = proprio || gJoueur();
	r.mode = mode || "rwxr-xr-x";
	if (parent.chapitre) r.chapitre = parent.chapitre;
	if (parent.horsBareme) r.horsBareme = true;
	link_rooms(parent, r);
	return r;
}
/* Le sous-dossier (créé au besoin) d'un lieu, chemin relatif en / ; null si un fichier barre la route. */
function gDossier(base, rel, creer, proprio){
	var lieu = base, m = String(rel).split("/").filter(Boolean);
	for (var i = 0; i < m.length; i++){
		var s = lieu.getChildFromName(m[i]);
		if (s === -1 || !s){
			if (!creer) return null;
			if (lieu.getItemFromName(m[i]) !== -1) return null;
			s = gNouveauDossier(lieu, m[i], proprio || lieu.owner || gJoueur(), "rwxr-xr-x");
		}
		lieu = s;
	}
	return lieu;
}
/* Un chemin tel que git l'affiche (core.quotePath) : entre guillemets s'il contient un caractère spécial ou non ASCII
 * (en octal, octet par octet) ; avecEspace : une espace suffit aussi (status -s). */
function gCiter(p, avecEspace){
	p = String(p);
	var special = avecEspace ? /[ "\\\x00-\x1f\x7f-￿]/ : /["\\\x00-\x1f\x7f-￿]/;
	if (!special.test(p)) return p;
	var s = "", octets = gUtf8(p);
	var echap = { 7: "\\a", 8: "\\b", 9: "\\t", 10: "\\n", 11: "\\v", 12: "\\f", 13: "\\r", 34: "\\\"", 92: "\\\\" };
	for (var i = 0; i < octets.length; i++){
		var b = octets[i];
		if (echap[b]) s += echap[b];
		else if (b < 32 || b >= 127) s += "\\" + ("00" + b.toString(8)).slice(-3);
		else s += String.fromCharCode(b);
	}
	return "\"" + s + "\"";
}
function gNoeud(base, rel){
	var m = String(rel).split("/").filter(Boolean), lieu = base;
	for (var i = 0; i < m.length - 1; i++){ var s = lieu.getChildFromName(m[i]); if (s === -1 || !s) return null; lieu = s; }
	if (!m.length) return base;
	return lieu.getNode(m[m.length - 1]);
}
function gItem(base, rel){ var n = gNoeud(base, rel); return n instanceof Item ? n : null; }
function gLire(base, rel){ var it = gItem(base, rel); return it ? gContenu(it) : null; }
/* Écrit un fichier (contenu exact) sous un lieu ; crée les dossiers ; renvoie l'objet. */
function gEcrire(base, rel, contenu, options){
	options = options || {};
	var coupe = String(rel).lastIndexOf("/");
	var dossier = coupe > -1 ? gDossier(base, rel.substring(0, coupe), true, options.owner) : base;
	if (!dossier) return null;
	var nom = rel.substring(coupe + 1);
	var it = dossier.getNode(nom);
	if (it instanceof Room) return null;
	if (!it){
		it = new Item(nom, "", options.image || "item_sign.gif");
		it.owner = options.owner || gJoueur();
		it.mode = options.mode || "rw-r--r--";
		dossier.addItem(it);
	} else if (options.mode) it.mode = options.mode;
	if (it.lien && !options.lien) delete it.lien;
	gPoserContenu(it, contenu);
	if (options.lien !== undefined){ it.lien = options.lien; it.mode = "rwxrwxrwx"; }
	return it;
}
function gSupprimer(base, rel){
	var coupe = String(rel).lastIndexOf("/");
	var dossier = coupe > -1 ? gDossier(base, rel.substring(0, coupe), false) : base;
	if (!dossier) return false;
	var n = dossier.getNode(rel.substring(coupe + 1));
	if (!n) return false;
	if (n instanceof Room) dossier.removeChild(n); else dossier.removeItem(n);
	return true;
}
/* Retire les dossiers devenus vides au-dessus d'un chemin (git ne garde pas de dossier vide). */
function gNettoyerVides(base, rel){
	var m = String(rel).split("/").filter(Boolean);
	for (var k = m.length - 1; k >= 1; k--){
		var d = gDossier(base, m.slice(0, k).join("/"), false);
		if (!d || d.items.length || d.children.length) return;
		if (d === current_room || (typeof current_room !== "undefined" && gContient(d, current_room))) return;
		var parent = d.parents[0];
		if (parent) parent.removeChild(d);
	}
}
function gContient(dossier, lieu){ for (var l = lieu, g = 0; l && g++ < 300; l = l.parents[0]) if (l === dossier) return true; return false; }
/* Le chemin relatif d'un lieu sous un autre ("" pour lui-même), ou null s'il n'est pas dessous. */
function gRelatif(haut, lieu){
	var m = [], l = lieu, g = 0;
	while (l && l !== haut && g++ < 300){ m.unshift(l.room_name); l = l.parents[0]; }
	return l === haut ? m.join("/") : null;
}

/* ================================================================== */
/* L'horloge, l'identité, la signature temporelle                       */
/* ================================================================== */

/* L'instant (ms) : le chapitre peut la remplacer (son horloge). h vaut null sur l'île. */
function gitMaintenant(h){
	if (h && typeof maintenantMachine === "function" && typeof estMachine === "function"){ try { if (estMachine(h)) return maintenantMachine(h); } catch (e){} }
	return Date.now();
}
var GIT_DERNIERE_SECONDE = 0;
function gSecondes(R){ return Math.floor(gitMaintenant(R ? R.h : null) / 1000); }
/* « 1729500000 +0200 », ou la date d'une variable GIT_AUTHOR_DATE / GIT_COMMITTER_DATE (@epoch ou epoch, avec fuseau). */
/* Une variable d'environnement : celles posées devant la commande (NOM=valeur git ...) et celles du shell. */
function gEnv(nom){
	var v = null;
	try { if (typeof Shell !== "undefined" && Shell.variable) v = Shell.variable(nom); } catch (e){ v = null; }
	if (!v && typeof state !== "undefined" && state && state.env) v = state.env[nom];
	return v || null;
}
function gDateEnv(nom){
	var v = gEnv(nom);
	if (!v) return null;
	var m = /^@?(\d+)(?:\s+([+-]\d{4}))?$/.exec(String(v).trim());
	return m ? { s: +m[1], tz: m[2] || GIT_FUSEAU } : null;
}
var GIT_JOURS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], GIT_MOIS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function gDecalageTz(tz){ var m = /^([+-])(\d\d)(\d\d)$/.exec(tz || GIT_FUSEAU); if (!m) return GIT_DECALAGE; var s = (+m[2]) * 3600 + (+m[3]) * 60; return m[1] === "-" ? -s : s; }
/* « Wed Oct 21 15:04:05 2026 +0200 », comme git log. */
function gDateTexte(s, tz){
	var d = new Date((s + gDecalageTz(tz)) * 1000);
	return GIT_JOURS[d.getUTCDay()] + " " + GIT_MOIS[d.getUTCMonth()] + " " + d.getUTCDate() + " " + deuxChiffresG(d.getUTCHours()) + ":" + deuxChiffresG(d.getUTCMinutes()) + ":" + deuxChiffresG(d.getUTCSeconds()) + " " + d.getUTCFullYear() + " " + (tz || GIT_FUSEAU);
}
function gDateIso(s, tz){
	var d = new Date((s + gDecalageTz(tz)) * 1000);
	return d.getUTCFullYear() + "-" + deuxChiffresG(d.getUTCMonth() + 1) + "-" + deuxChiffresG(d.getUTCDate()) + " " + deuxChiffresG(d.getUTCHours()) + ":" + deuxChiffresG(d.getUTCMinutes()) + ":" + deuxChiffresG(d.getUTCSeconds()) + " " + (tz || GIT_FUSEAU);
}
function gDateCourte(s, tz){ var d = new Date((s + gDecalageTz(tz)) * 1000); return d.getUTCFullYear() + "-" + deuxChiffresG(d.getUTCMonth() + 1) + "-" + deuxChiffresG(d.getUTCDate()); }
function deuxChiffresG(n){ return n < 10 ? "0" + n : "" + n; }
/* Une date selon --date : default, iso, iso-strict, short, relative, unix, raw, rfc. */
function gDateSelon(s, tz, mode, maintenant){
	tz = tz || GIT_FUSEAU;
	var d = new Date((s + gDecalageTz(tz)) * 1000);
	var heure = deuxChiffresG(d.getUTCHours()) + ":" + deuxChiffresG(d.getUTCMinutes()) + ":" + deuxChiffresG(d.getUTCSeconds());
	switch (mode){
		case "iso": case "iso8601": return gDateCourte(s, tz) + " " + heure + " " + tz;
		case "iso-strict": case "iso8601-strict": return gDateCourte(s, tz) + "T" + heure + tz.substring(0, 3) + ":" + tz.substring(3);
		case "short": return gDateCourte(s, tz);
		case "relative": return gDateRelative(s, maintenant || s);
		case "unix": return String(s);
		case "raw": return s + " " + tz;
		case "rfc": case "rfc2822": return GIT_JOURS[d.getUTCDay()] + ", " + d.getUTCDate() + " " + GIT_MOIS[d.getUTCMonth()] + " " + d.getUTCFullYear() + " " + heure + " " + tz;
		default: return gDateTexte(s, tz);
	}
}
/* « 3 hours ago », comme --date=relative. */
function gDateRelative(s, maintenant){
	var d = Math.max(0, maintenant - s);
	function p(n, u){ return n + " " + u + (n === 1 ? "" : "s") + " ago"; }
	if (d < 90) return p(d, "second");
	if (d < 90 * 60) return p(Math.round(d / 60), "minute");
	if (d < 36 * 3600) return p(Math.round(d / 3600), "hour");
	if (d < 14 * 86400) return p(Math.round(d / 86400), "day");
	if (d < 70 * 86400) return p(Math.round(d / 604800), "week");
	if (d < 365 * 86400) return p(Math.round(d / 2592000), "month");
	return p(Math.round(d / 31536000), "year");
}
/* Une date de --since / --until : « 2026-10-20 », « 2 days ago », « yesterday », une epoch. */
function gDateDepuisTexte(t, maintenant){
	t = String(t).trim().toLowerCase();
	var m = /^(\d{4})-(\d\d)-(\d\d)(?:[ t](\d\d):(\d\d)(?::(\d\d))?)?$/.exec(t);
	if (m) return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) / 1000) - GIT_DECALAGE;
	m = /^(\d+)[ .]*(second|minute|hour|day|week|month|year)s?[ .]*(ago)?$/.exec(t);
	if (m) return maintenant - (+m[1]) * { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000, year: 31536000 }[m[2]];
	if (t === "yesterday") return maintenant - 86400;
	if (t === "now" || t === "today") return maintenant;
	if (/^@?\d+$/.test(t)) return +t.replace("@", "");
	return null;
}

/* ================================================================== */
/* La découverte du dépôt                                              */
/* ================================================================== */

/* Un lieu qui a la forme d'un dossier git (HEAD, objects, refs) : un .git, ou un dépôt nu. */
function gEstDossierGit(lieu){
	if (!(!!lieu && lieu instanceof Room && lieu.getItemFromName("HEAD") !== -1 && lieu.getChildFromName("objects") !== -1 && lieu.getChildFromName("refs") !== -1)) return false;
	// Comme le vrai : un HEAD illisible (ni « ref: refs/... », ni un hash) ne fait pas un dépôt.
	var tete = lieu.getItemFromName("HEAD");
	var texte = String(tete.getText ? tete.getText() : "").trim();
	return /^ref: refs\//.test(texte) || /^[0-9a-f]{40}$/.test(texte);
}
function gDepotDe(git, top){
	var R = { git: git, top: top || null, nu: !top, h: gHoteDe(git), cache: {}, abbrevPrefixes: null };
	return R;
}
/* Le dépôt du lieu donné : on remonte jusqu'à trouver un .git (ou un dépôt nu). null sinon. */
function gTrouverDepot(lieu){
	var l = lieu, g = 0;
	while (l && g++ < 300){
		var d = l.getChildFromName(".git");
		if (d !== -1 && d && gEstDossierGit(d)) return gDepotDe(d, l);
		// Un worktree (git worktree add) : un fichier .git « gitdir: CHEMIN ».
		var f = l.getItemFromName(".git");
		if (f !== -1 && f){
			var m = /^gitdir:\s*(\S+)/.exec(gContenu(f));
			if (m){
				var r = gChemin(l, m[1]);
				if (r && r.noeud instanceof Room && r.noeud.getItemFromName("HEAD") !== -1){
					var R = gDepotDe(r.noeud, l);
					var commun = gLire(r.noeud, "commondir");
					if (commun){ var c = gChemin(r.noeud, commun.trim()); if (c && c.noeud instanceof Room) R.commun = c.noeud; }
					R.worktree = true;
					return R;
				}
			}
		}
		if (gEstDossierGit(l)){
			var conf = gLire(l, "config") || "";
			if (/bare\s*=\s*true/i.test(conf) || l.room_name !== ".git") return gDepotDe(l, null);
			return gDepotDe(l, l.parents[0] || null);
		}
		if (l.parents.length === 0) break;
		l = l.parents[0];
	}
	return null;
}
/* Le dossier des données partagées (objets, refs) : le dépôt principal pour un worktree. */
function gCommun(R){ return R.commun || R.git; }

/* ================================================================== */
/* La configuration (INI, comme le vrai)                               */
/* ================================================================== */

function gConfigAnalyser(texte){
	var entrees = [], section = null, sous = null;
	String(texte || "").split("\n").forEach(function(ligne, i){
		var l = ligne.replace(/^\s+/, "");
		if (l === "" || l.charAt(0) === "#" || l.charAt(0) === ";") return;
		var m = /^\[\s*([A-Za-z0-9.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]\s*(.*)$/.exec(l);
		if (m){
			section = m[1].toLowerCase(); sous = m[2] !== undefined ? m[2].replace(/\\(.)/g, "$1") : null;
			if (sous === null && section.indexOf(".") > -1){ var p = section.indexOf("."); sous = section.substring(p + 1); section = section.substring(0, p); }
			l = m[3] || "";
			if (l === "" || l.charAt(0) === "#" || l.charAt(0) === ";") return;
		}
		if (section === null) return;
		var k = /^([A-Za-z][A-Za-z0-9-]*)\s*(?:=\s*(.*))?$/.exec(l);
		if (!k) return;
		var v = k[2] === undefined ? "true" : k[2];
		// Les guillemets et les commentaires de fin de ligne.
		var sortie = "", dedans = false;
		for (var j = 0; j < v.length; j++){
			var c = v.charAt(j);
			if (c === "\\" && j + 1 < v.length){ var n = v.charAt(++j); sortie += n === "n" ? "\n" : n === "t" ? "\t" : n; continue; }
			if (c === "\""){ dedans = !dedans; continue; }
			if (!dedans && (c === "#" || c === ";")) break;
			sortie += c;
		}
		if (!/"/.test(v)) sortie = sortie.replace(/\s+$/, "");
		entrees.push({ cle: section + (sous !== null ? "." + sous : "") + "." + k[1].toLowerCase(), valeur: sortie, ligne: i, section: section, sous: sous });
	});
	return entrees;
}
/* Le fichier de configuration d'une portée : { base, rel, chemin affiché } ; global : ~/.gitconfig, système : /etc/gitconfig. */
function gFichierConfig(R, portee, lieu){
	if (portee === "local"){ if (!R) return null; return { base: gCommun(R), rel: "config", affiche: R.nu ? "config" : ".git/config", reel: gCheminReel(gCommun(R)) + "/config" }; }
	if (portee === "worktree"){ return R ? { base: R.git, rel: "config.worktree", affiche: ".git/config.worktree", reel: gCheminReel(R.git) + "/config.worktree" } : null; }
	var ici = lieu || (R ? (R.top || R.git) : current_room);
	if (portee === "global") return { base: gMaison(ici), rel: ".gitconfig", affiche: gCheminReel(gMaison(ici)) + "/.gitconfig", reel: gCheminReel(gMaison(ici)) + "/.gitconfig" };
	var r = typeof racineDe === "function" ? racineDe(ici) : null;
	if (r) return { base: r, rel: "etc/gitconfig", affiche: "/etc/gitconfig", reel: "/etc/gitconfig", systeme: true };
	return { virtuel: true, affiche: "/etc/gitconfig", reel: "/etc/gitconfig", systeme: true };
}
function gTexteConfig(fc){
	if (!fc) return "";
	if (fc.virtuel) return typeof state !== "undefined" && state && state.gitConfigSysteme ? state.gitConfigSysteme : "";
	return gLire(fc.base, fc.rel) || "";
}
function gEcrireTexteConfig(fc, texte){
	if (fc.virtuel){ if (typeof state !== "undefined" && state) state.gitConfigSysteme = texte; return; }
	gEcrire(fc.base, fc.rel, texte, { owner: fc.systeme ? "root" : gJoueur() });
}
/* Toutes les entrées, de la moins à la plus précise : système, global, local (la dernière l'emporte). */
function gConfigToutes(R, lieu){
	var l = [];
	["system", "global", "local", "worktree"].forEach(function(p){
		if ((p === "local" || p === "worktree") && !R) return;
		var fc = gFichierConfig(R, p, lieu);
		if (!fc) return;
		gConfigAnalyser(gTexteConfig(fc)).forEach(function(e){ e.portee = p; e.fichier = fc; l.push(e); });
	});
	// Les variables d'environnement git -c n'existent pas ici ; GIT_AUTHOR_NAME et consorts sont lues à part.
	return l;
}
function gConfig(R, cle, lieu){
	var c = String(cle).toLowerCase(), v = null, morceaux = String(cle).split(".");
	if (morceaux.length > 2) c = morceaux[0].toLowerCase() + "." + morceaux.slice(1, -1).join(".") + "." + morceaux[morceaux.length - 1].toLowerCase();
	var toutes = R && R.cacheConfig ? R.cacheConfig : gConfigToutes(R, lieu);
	if (R) R.cacheConfig = toutes;
	toutes.forEach(function(e){ if (e.cle === c) v = e.valeur; });
	return v;
}
function gConfigTous(R, cle){
	var c = String(cle).toLowerCase(), l = [];
	gConfigToutes(R).forEach(function(e){ if (e.cle === c) l.push(e.valeur); });
	return l;
}
function gConfigVrai(R, cle, defaut){
	var v = gConfig(R, cle);
	if (v === null) return !!defaut;
	return /^(true|yes|on|1)$/i.test(String(v).trim());
}
/* Écrit (ou remplace) une clé dans un fichier de config, en gardant le reste du texte. */
function gConfigPoser(fc, cle, valeur, mode){
	var texte = gTexteConfig(fc), lignes = texte === "" ? [] : texte.replace(/\n$/, "").split("\n");
	var m = String(cle).split(".");
	if (m.length < 2) throw new GitErreur("error: key does not contain a section: " + cle, 2);
	var section = m[0].toLowerCase(), nom = m[m.length - 1], sous = m.length > 2 ? m.slice(1, -1).join(".") : null;
	if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(nom)) throw new GitErreur("error: invalid key: " + cle, 1);
	var cleNorm = section + (sous !== null ? "." + sous : "") + "." + nom.toLowerCase();
	var entrees = gConfigAnalyser(texte);
	var memes = entrees.filter(function(e){ return e.cle === cleNorm; });
	var valeurTexte = /^\s|\s$|[#;"\\]/.test(valeur) ? "\"" + String(valeur).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"" : valeur;
	if (mode === "unset" || mode === "unset-all"){
		if (!memes.length) return false;
		var aRetirer = mode === "unset" ? [memes[memes.length - 1].ligne] : memes.map(function(e){ return e.ligne; });
		lignes = lignes.filter(function(l, i){ return aRetirer.indexOf(i) === -1; });
		// Une section restée vide disparaît, comme avec git config --unset ... la dernière clé (git la garde ; on la garde aussi).
		gEcrireTexteConfig(fc, lignes.length ? lignes.join("\n") + "\n" : "");
		return true;
	}
	if (memes.length && mode !== "add"){
		if (memes.length > 1 && mode !== "replace-all") throw new GitErreur("warning: " + cleNorm + " has multiple values\nerror: cannot overwrite multiple values with a single value\n       Use a regexp, --add or --replace-all to change " + cleNorm + ".", 5);
		lignes[memes[memes.length - 1].ligne] = "\t" + nom + " = " + valeurTexte;
		if (memes.length > 1) lignes = lignes.filter(function(l, i){ return memes.slice(0, -1).map(function(e){ return e.ligne; }).indexOf(i) === -1; });
		gEcrireTexteConfig(fc, lignes.join("\n") + "\n");
		return true;
	}
	// Ajouter dans la section (la dernière ligne de la section), ou créer la section.
	var derniere = -1, debutSection = -1;
	entrees.forEach(function(e){ if (e.section === section && e.sous === sous){ derniere = Math.max(derniere, e.ligne); } });
	lignes.forEach(function(l, i){
		var mm = /^\s*\[\s*([A-Za-z0-9.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]/.exec(l);
		if (mm && mm[1].toLowerCase() === section && (mm[2] !== undefined ? mm[2] : null) === sous) debutSection = i;
	});
	var ligneNeuve = "\t" + nom + " = " + valeurTexte;
	if (derniere > -1 || debutSection > -1){
		var ou = Math.max(derniere, debutSection);
		lignes.splice(ou + 1, 0, ligneNeuve);
	} else {
		lignes.push("[" + section + (sous !== null ? " \"" + sous.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"" : "") + "]", ligneNeuve);
	}
	gEcrireTexteConfig(fc, lignes.join("\n") + "\n");
	return true;
}
function gConfigLocalePoser(R, cle, valeur, mode){ R.cacheConfig = null; return gConfigPoser(gFichierConfig(R, "local"), cle, valeur, mode); }
/* Retire une section entière (git remote remove, git branch -d). */
function gConfigRetirerSection(R, section, sous){
	var fc = gFichierConfig(R, "local"), texte = gTexteConfig(fc), lignes = texte.replace(/\n$/, "").split("\n"), garde = [], dedans = false, trouve = false;
	lignes.forEach(function(l){
		var mm = /^\s*\[\s*([A-Za-z0-9.-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\]/.exec(l);
		if (mm){ dedans = mm[1].toLowerCase() === section && (mm[2] !== undefined ? mm[2] : null) === sous; if (dedans){ trouve = true; return; } }
		if (!dedans) garde.push(l);
	});
	R.cacheConfig = null;
	gEcrireTexteConfig(fc, garde.length && garde.join("") !== "" ? garde.join("\n") + "\n" : "");
	return trouve;
}
function gConfigRenommerSection(R, section, ancien, nouveau){
	var fc = gFichierConfig(R, "local"), texte = gTexteConfig(fc);
	var lignes = texte.replace(/\n$/, "").split("\n").map(function(l){
		var mm = /^(\s*)\[\s*([A-Za-z0-9.-]+)\s+"((?:[^"\\]|\\.)*)"\s*\](.*)$/.exec(l);
		if (mm && mm[2].toLowerCase() === section && mm[3] === ancien) return mm[1] + "[" + section + " \"" + nouveau + "\"]" + mm[4];
		return l;
	});
	R.cacheConfig = null;
	gEcrireTexteConfig(fc, lignes.join("\n") + "\n");
}

/* ================================================================== */
/* Les erreurs                                                         */
/* ================================================================== */

/* Une erreur de git : son message (fatal: ..., error: ...) et son code de sortie. Devient une ShellError à la sortie du sort. */
function GitErreur(message, code){ this.message = message; this.code = code === undefined ? 128 : code; }
function gFatal(m, code){ return new GitErreur("fatal: " + m, code === undefined ? 128 : code); }

/* ================================================================== */
/* Les objets : loose (objects/xx/yyyy) et packs                        */
/* ================================================================== */

var GIT_CHARABIA = "x\u0001\u009d\u0090AN\u00c30\u0010E\u00f7>\u0005";
function gCharabia(hash){ return "x\u0001" + String.fromCharCode(0x80 + parseInt(hash.substr(0, 2), 16) % 120) + hash.substr(2, 4) + "\u00f7\u0091\u0003" + hash.substr(6, 3); }
/*
 * Le contenu d'un pack. En mémoire : gitPack.o = { hash: [type, contenu] } (propriété non énumérable).
 * Dans la sauvegarde : gitPack.z, une forme compacte calculée à la volée (un accesseur énumérable) : la liste des objets
 * sans leurs hash (recalculés au chargement), les références internes (arbres, parents, objets des tags) remplacées par
 * leur rang dans la liste, les modes 100644 omis, les identités des commits rangées dans une table.
 */
function gPackEnveloppe(o){
	var gp = {};
	Object.defineProperty(gp, "o", { value: o || {}, writable: true, enumerable: false, configurable: true });
	Object.defineProperty(gp, "z", { get: function(){ return gPackEncoder(this.o); }, enumerable: true, configurable: true });
	return gp;
}
/* Un pack lu dans la sauvegarde ({ z }) retrouve son contenu ; un pack d'une ancienne forme ({ o } énumérable) aussi. */
function gPackPret(it){
	var gp = it.gitPack;
	if (!gp) return false;
	if (Object.getOwnPropertyDescriptor(gp, "z") && Object.getOwnPropertyDescriptor(gp, "z").get) return true;
	if (gp.z) it.gitPack = gPackEnveloppe(gPackDecoder(gp.z));
	else if (gp.o) it.gitPack = gPackEnveloppe(gp.o);
	else return false;
	return true;
}
function gPackEncoder(o){
	var cles = Object.keys(o), rang = {}, idents = [], rangIdent = {};
	cles.forEach(function(h, i){ rang[h] = i; });
	function ref(h){ return rang.hasOwnProperty(h) ? rang[h] : h; }
	function ident(s){ if (!rangIdent.hasOwnProperty(s)){ rangIdent[s] = idents.length; idents.push(s); } return rangIdent[s]; }
	// Les arbres en delta (comme les vrais packs) : un arbre s'écrit comme un arbre récent dont quelques entrées changent.
	var recents = [], profondeur = {};
	function entree(e){ return e[0] === "100644" ? [e[1], ref(e[2])] : [e[1], ref(e[2]), e[0]]; }
	function enDelta(c, i){
		var meilleur = null;
		recents.forEach(function(b){
			if (profondeur[b] >= 40) return;
			var base = o[cles[b]][1], parNom = {}, ici = {};
			base.forEach(function(e){ parNom[e[1]] = e; });
			var poser = [], retirer = [];
			c.forEach(function(e){ ici[e[1]] = true; var x = parNom[e[1]]; if (!x || x[0] !== e[0] || x[2] !== e[2]) poser.push(entree(e)); });
			base.forEach(function(e){ if (!ici[e[1]]) retirer.push(e[1]); });
			var cout = poser.length * 2 + retirer.length;
			if (cout * 2 < c.length && (!meilleur || cout < meilleur.cout)) meilleur = { cout: cout, x: { b: b, s: poser, d: retirer } };
		});
		recents.push(i); if (recents.length > 4) recents.shift();
		if (meilleur){
			// Prudence : le delta doit redonner exactement l'arbre (même ordre), sinon l'arbre s'écrit en entier.
			var retires = {}, poses = {};
			meilleur.x.d.forEach(function(nom){ retires[nom] = true; });
			c.forEach(function(e){ if (meilleur.x.s.some(function(x){ return x[0] === e[1]; })) poses[e[1]] = e; });
			var refait = o[cles[meilleur.x.b]][1].filter(function(x){ return !retires[x[1]] && !poses[x[1]]; });
			Object.keys(poses).forEach(function(nom){ refait.push(poses[nom]); });
			if (JSON.stringify(gTrierArbre(refait)) !== JSON.stringify(c)) meilleur = null;
		}
		if (meilleur){ profondeur[i] = (profondeur[meilleur.x.b] || 0) + 1; if (!meilleur.x.d.length) delete meilleur.x.d; return meilleur.x; }
		profondeur[i] = 0;
		return c.map(entree);
	}
	var l = cles.map(function(h, i){
		var t = o[h][0], c = o[h][1], m;
		if (t === "blob") return c;
		if (t === "tree") return enDelta(c, i);
		if (t === "commit" && (m = /^tree ([0-9a-f]{40})\n((?:parent [0-9a-f]{40}\n)*)author (.*) (\d+) ([+-]\d{4})\ncommitter (.*) (\d+) ([+-]\d{4})\n/.exec(c))){
			var parents = m[2] ? m[2].replace(/\n$/, "").split("\n").map(function(x){ return ref(x.substring(7)); }) : [];
			var x = { a: ref(m[1]), p: parents, i: [ident(m[3]), +m[4], m[5]], r: c.substring(m[0].length) };
			if (m[6] !== m[3] || m[7] !== m[4] || m[8] !== m[5]) x.j = [ident(m[6]), +m[7], m[8]];
			return x;
		}
		if (t === "tag" && (m = /^object ([0-9a-f]{40})\n/.exec(c))) return { g: ref(m[1]), r: c.substring(m[0].length) };
		return { t: t, c: c };
	});
	return { l: l, n: idents };
}
function gPackDecoder(z){
	var o = {}, l = z.l || [], n = z.n || [], hashs = [], objets = [];
	function ref(x){ return typeof x === "number" ? hash(x) : x; }
	function objet(i){
		if (objets[i]) return objets[i];
		var e = l[i], r;
		if (typeof e === "string") r = ["blob", e];
		else if (Array.isArray(e)) r = ["tree", e.map(function(x){ return [x[2] || "100644", x[0], ref(x[1])]; })];
		else if (e.b !== undefined){
			// Un arbre en delta : l'arbre de base, moins les noms retirés, plus les entrées posées, dans l'ordre de git.
			var retires = {}, poses = {};
			(e.d || []).forEach(function(nom){ retires[nom] = true; });
			e.s.forEach(function(x){ poses[x[0]] = [x[2] || "100644", x[0], ref(x[1])]; });
			var arbre = objet(e.b)[1].filter(function(x){ return !retires[x[1]] && !poses[x[1]]; });
			Object.keys(poses).forEach(function(nom){ arbre.push(poses[nom]); });
			r = ["tree", gTrierArbre(arbre)];
		}
		else if (e.a !== undefined){
			var j = e.j || e.i;
			r = ["commit", "tree " + ref(e.a) + "\n" + e.p.map(function(p){ return "parent " + ref(p) + "\n"; }).join("") +
				"author " + n[e.i[0]] + " " + e.i[1] + " " + e.i[2] + "\ncommitter " + n[j[0]] + " " + j[1] + " " + j[2] + "\n" + e.r];
		}
		else if (e.g !== undefined) r = ["tag", "object " + ref(e.g) + "\n" + e.r];
		else r = [e.t, e.c];
		objets[i] = r;
		return r;
	}
	function hash(i){ if (!hashs[i]){ var x = objet(i); hashs[i] = gHashObjet(x[0], x[1]); } return hashs[i]; }
	for (var i = 0; i < l.length; i++) o[hash(i)] = objet(i);
	return o;
}
/* Les packs d'un dépôt (les objets gitPack). */
function gPacks(R){
	if (R.cache.packs) return R.cache.packs;
	var d = gDossier(gCommun(R), "objects/pack", false), l = [];
	if (d) d.items.forEach(function(it){ if (/\.pack$/.test(it.itemname) && gPackPret(it)) l.push(it); });
	R.cache.packs = l;
	return l;
}
function gObjet(R, hash){
	if (!hash || hash.length !== 40) return null;
	if (R.cache.objets && R.cache.objets[hash]) return R.cache.objets[hash];
	var o = null;
	var d = gCommun(R).getChildFromName("objects");
	if (d !== -1 && d){
		var sd = d.getChildFromName(hash.substring(0, 2));
		if (sd !== -1 && sd){
			var it = sd.getItemFromName(hash.substring(2));
			if (it !== -1 && it && it.gitObjet) o = it.gitObjet;
		}
	}
	if (!o){
		var p = gPacks(R);
		for (var i = 0; i < p.length; i++){ var x = p[i].gitPack.o[hash]; if (x){ o = { t: x[0], c: x[1] }; break; } }
	}
	if (o){ R.cache.objets = R.cache.objets || {}; R.cache.objets[hash] = o; }
	return o;
}
function gObjetExiste(R, hash){ return !!gObjet(R, hash); }
/* Range un objet (loose, ou dans le pack du constructeur) ; renvoie son hash. Un objet déjà là n'est pas recopié. */
function gObjetEcrire(R, t, c){
	var hash = gHashObjet(t, c);
	if (gObjet(R, hash)) return hash;
	if (R.packCible){ R.packCible.gitPack.o[hash] = [t, c]; }
	else {
		var d = gDossier(gCommun(R), "objects/" + hash.substring(0, 2), true, gCommun(R).owner);
		var it = new Item(hash.substring(2), gCharabia(hash), "item_manuscript.gif");
		it.owner = gCommun(R).owner || gJoueur();
		it.mode = "r--r--r--";
		it.sansFinDeLigne = true;
		it.gitObjet = { t: t, c: c };
		d.addItem(it);
	}
	R.cache.objets = R.cache.objets || {};
	R.cache.objets[hash] = { t: t, c: c };
	R.abbrevPrefixes = null;
	return hash;
}
/* Tous les objets : { hash: { t, c, loose } }. */
function gTousObjets(R){
	var tous = {};
	var d = gDossier(gCommun(R), "objects", false);
	if (d) d.children.forEach(function(sd){
		if (!/^[0-9a-f]{2}$/.test(sd.room_name)) return;
		sd.items.forEach(function(it){ if (it.gitObjet && /^[0-9a-f]{38}$/.test(it.itemname)) tous[sd.room_name + it.itemname] = { t: it.gitObjet.t, c: it.gitObjet.c, loose: true, item: it }; });
	});
	gPacks(R).forEach(function(p){ var o = p.gitPack.o; for (var h in o) if (o.hasOwnProperty(h) && !tous[h]) tous[h] = { t: o[h][0], c: o[h][1], loose: false }; });
	return tous;
}
/* Ouvre un pack neuf (le constructeur, un fetch, un gc) ; ferme() lui donne son vrai nom et son .idx. */
function gPackNeuf(R){
	var d = gDossier(gCommun(R), "objects/pack", true, gCommun(R).owner);
	var it = new Item("pack-encours.pack", "PACK\u0000\u0000\u0000\u0002", "item_manuscript.gif");
	it.owner = gCommun(R).owner || gJoueur(); it.mode = "r--r--r--"; it.sansFinDeLigne = true;
	it.gitPack = gPackEnveloppe({});
	d.addItem(it);
	R.cache.packs = null;
	return it;
}
function gPackFermer(R, it){
	var cles = Object.keys(it.gitPack.o).sort();
	var d = gDossier(gCommun(R), "objects/pack", false);
	if (!cles.length){ d.removeItem(it); R.cache.packs = null; return null; }
	var nom = "pack-" + gSha1Texte(cles.join(""));
	var ancien = d.getItemFromName(nom + ".pack");
	if (ancien !== -1 && ancien !== it){
		// Le même pack existe déjà : on fusionne.
		gPackPret(ancien);
		cles.forEach(function(k){ ancien.gitPack.o[k] = it.gitPack.o[k]; });
		d.removeItem(it);
		R.cache.packs = null;
		return ancien;
	}
	it.itemname = nom + ".pack";
	if (d.getItemFromName(nom + ".idx") === -1){
		var idx = new Item(nom + ".idx", "\u00fftOc\u0000\u0000\u0000\u0002", "item_manuscript.gif");
		idx.owner = it.owner; idx.mode = "r--r--r--"; idx.sansFinDeLigne = true;
		d.addItem(idx);
	}
	R.cache.packs = null;
	return it;
}

/* ================================================================== */
/* Les noms courts des objets                                          */
/* ================================================================== */

function gCourt(R, hash, longueur){
	if (!hash) return "";
	var n = longueur || 7;
	if (!R) return hash.substring(0, n);
	if (!R.abbrevPrefixes){
		var t = gTousObjets(R); R.abbrevPrefixes = Object.keys(t);
	}
	var tous = R.abbrevPrefixes;
	while (n < 40){
		var p = hash.substring(0, n), autres = 0;
		for (var i = 0; i < tous.length && autres < 2; i++) if (tous[i].indexOf(p) === 0 && tous[i] !== hash) autres++;
		if (!autres) break;
		n++;
	}
	return hash.substring(0, n);
}
/* Un hash abrégé (4 caractères au moins) : le hash complet, null, ou une erreur s'il est ambigu. */
function gDepuisCourt(R, court){
	if (!/^[0-9a-f]{4,40}$/.test(court)) return null;
	if (court.length === 40) return gObjet(R, court) ? court : null;
	var trouves = Object.keys(gTousObjets(R)).filter(function(h){ return h.indexOf(court) === 0; });
	if (trouves.length > 1){
		// Ambigu : on préfère un commit s'il est seul.
		var commits = trouves.filter(function(h){ return gObjet(R, h).t === "commit"; });
		if (commits.length === 1) return commits[0];
		var e = new GitErreur("error: short object ID " + court + " is ambiguous\nhint: The candidates are:\n" + trouves.map(function(h){ return "hint:   " + gCourt(R, h) + " " + gObjet(R, h).t; }).join("\n") + "\nfatal: ambiguous argument '" + court + "': unknown revision or path not in the working tree.", 128);
		throw e;
	}
	return trouves[0] || null;
}

/* ================================================================== */
/* Les refs et le reflog                                                */
/* ================================================================== */

/* Le contenu d'une ref (sans fin de ligne), lu dans son fichier ; puis dans packed-refs. */
function gRefBrute(R, nom){
	var base = (nom === "HEAD" || /^(ORIG_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD|REVERT_HEAD|FETCH_HEAD|BISECT_HEAD|AUTO_MERGE)$/.test(nom)) ? R.git : gCommun(R);
	var t = gLire(base, nom);
	if (t !== null){
		var l = t.split("\n")[0].trim();
		if (nom === "FETCH_HEAD"){ var m = /^([0-9a-f]{40})/.exec(l); return m ? m[1] : null; }
		return l;
	}
	var p = gLire(gCommun(R), "packed-refs");
	if (p){
		var lignes = p.split("\n");
		for (var i = 0; i < lignes.length; i++){ var mm = /^([0-9a-f]{40}) (\S+)$/.exec(lignes[i]); if (mm && mm[2] === nom) return mm[1]; }
	}
	return null;
}
/* La cible symbolique d'une ref (HEAD -> refs/heads/main), ou null si elle est détachée. */
function gSymbolique(R, nom){
	var b = gRefBrute(R, nom || "HEAD");
	var m = b ? /^ref:\s*(\S+)/.exec(b) : null;
	return m ? m[1] : null;
}
/* Le hash d'une ref (suit les refs symboliques), ou null. */
function gRef(R, nom){
	var garde = 0;
	while (garde++ < 10){
		var b = gRefBrute(R, nom);
		if (b === null) return null;
		var m = /^ref:\s*(\S+)/.exec(b);
		if (!m) return /^[0-9a-f]{40}$/.test(b) ? b : null;
		nom = m[1];
	}
	return null;
}
function gBrancheCourante(R){ var s = gSymbolique(R, "HEAD"); return s && s.indexOf("refs/heads/") === 0 ? s.substring(11) : null; }
function gTete(R){ return gRef(R, "HEAD"); }
/* Toutes les refs sous un préfixe (refs/heads/, refs/tags/...) : [{ nom, hash }], triées. */
function gRefs(R, prefixe){
	var l = {}, base = gCommun(R);
	(function visiter(dossier, chemin){
		dossier.items.forEach(function(it){
			var n = chemin + it.itemname, t = gContenu(it).split("\n")[0].trim();
			if (/^[0-9a-f]{40}$/.test(t)) l[n] = t;
			else if (/^ref:/.test(t)) l[n] = { sym: t.replace(/^ref:\s*/, "") };
		});
		dossier.children.forEach(function(d){ if (d.parents[0] === dossier) visiter(d, chemin + d.room_name + "/"); });
	})(gDossier(base, "refs", false) || new Room("vide"), "refs/");
	var p = gLire(base, "packed-refs");
	if (p) p.split("\n").forEach(function(x){ var m = /^([0-9a-f]{40}) (\S+)$/.exec(x); if (m && !l.hasOwnProperty(m[2])) l[m[2]] = m[1]; });
	return Object.keys(l).filter(function(n){ return !prefixe || n.indexOf(prefixe) === 0; }).sort().map(function(n){
		var v = l[n];
		if (typeof v === "object") return { nom: n, sym: v.sym, hash: gRef(R, v.sym) };
		return { nom: n, hash: v };
	});
}
/* Faut-il tenir un reflog pour cette ref ? (logAllRefUpdates : vrai hors dépôt nu.) */
function gReflogPour(R, nom){
	var v = gConfig(R, "core.logAllRefUpdates");
	var actif = v === null ? !R.nu : /^(true|always)$/i.test(v);
	if (!actif) return false;
	return nom === "HEAD" || /^refs\/(heads|remotes|notes)\//.test(nom) || nom === "refs/stash" || /^always$/i.test(v || "");
}
function gIdentiteReflog(R){
	var id = null;
	try { id = gIdentite(R, "committer"); } catch (e){ id = { nom: gJoueur(), mail: gJoueur() + "@" + (R.h || "terminus") }; }
	return id;
}
function gReflogAjouter(R, nom, ancien, nouveau, message, id, quand){
	if (!gReflogPour(R, nom) && !(nom === "refs/stash")) return;
	var base = nom === "HEAD" ? R.git : gCommun(R);
	var it = gItem(base, "logs/" + nom);
	var ident = id || gIdentiteReflog(R);
	var date = quand || gDateCommit(R, "committer");
	var ligne = (ancien || GIT_VIDE) + " " + (nouveau || GIT_VIDE) + " " + ident.nom + " <" + ident.mail + "> " + date.s + " " + date.tz + "\t" + String(message || "").split("\n")[0];
	var avant = it ? gContenu(it) : "";
	gEcrire(base, "logs/" + nom, avant + ligne + "\n", { owner: base.owner });
}
/* Le reflog d'une ref, du plus récent au plus ancien : [{ ancien, nouveau, nom, mail, s, tz, message }]. */
function gReflogLire(R, nom){
	var base = nom === "HEAD" ? R.git : gCommun(R);
	var t = gLire(base, "logs/" + nom);
	if (!t) return [];
	var l = [];
	t.split("\n").forEach(function(x){
		var m = /^([0-9a-f]{40}) ([0-9a-f]{40}) (.*?) <([^>]*)> (\d+) ([+-]\d{4})\t?(.*)$/.exec(x);
		if (m) l.push({ ancien: m[1], nouveau: m[2], nom: m[3], mail: m[4], s: +m[5], tz: m[6], message: m[7] });
	});
	return l.reverse();
}
/* Écrit une ref (et son reflog, et celui de HEAD si HEAD pointe dessus). */
function gRefEcrire(R, nom, hash, message, options){
	options = options || {};
	var ancien = gRef(R, nom);
	var base = nom === "HEAD" || /^(ORIG_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD|REVERT_HEAD|BISECT_HEAD)$/.test(nom) ? R.git : gCommun(R);
	if (nom === "HEAD"){
		var s = gSymbolique(R, "HEAD");
		if (s && !options.detacher){ gRefEcrire(R, s, hash, message, options); return; }
		gEcrire(R.git, "HEAD", hash + "\n");
		if (message !== null && message !== undefined) gReflogAjouter(R, "HEAD", ancien, hash, message, options.id, options.quand);
		return;
	}
	// Une ref sous un nom qui est aussi un dossier (refs/heads/a et refs/heads/a/b) : refusé, comme le vrai.
	var dossier = gDossier(base, nom, false);
	if (dossier) throw new GitErreur("error: cannot lock ref '" + nom + "': there is a non-empty directory '" + (R.nu ? "" : ".git/") + nom + "' blocking reference '" + nom + "'", 1);
	var parent = nom.substring(0, nom.lastIndexOf("/"));
	var bloquant = parent && gItem(base, parent);
	if (bloquant && /^refs\//.test(parent)) throw new GitErreur("error: cannot lock ref '" + nom + "': '" + parent + "' exists; cannot create '" + nom + "'", 1);
	gEcrire(base, nom, hash + "\n", { owner: base.owner });
	if (message !== null && message !== undefined){
		gReflogAjouter(R, nom, ancien, hash, message, options.id, options.quand);
		if (!options.sansHead && gSymbolique(R, "HEAD") === nom) gReflogAjouter(R, "HEAD", ancien, hash, message, options.id, options.quand);
	}
	// Une ref tassée dans packed-refs : la version loose l'emporte désormais (on ne touche pas au fichier tassé).
}
function gRefSymboliqueEcrire(R, cible, message){
	var ancien = gTete(R);
	gEcrire(R.git, "HEAD", "ref: " + cible + "\n");
	if (message) gReflogAjouter(R, "HEAD", ancien, gRef(R, cible) || ancien, message);
}
function gRefSupprimer(R, nom){
	var base = /^(ORIG_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD|REVERT_HEAD|BISECT_HEAD|MERGE_MSG|AUTO_MERGE)$/.test(nom) ? R.git : gCommun(R);
	var ok = gSupprimer(base, nom);
	if (nom.indexOf("refs/") === 0){
		gNettoyerVidesRefs(base, nom);
		gSupprimer(base, "logs/" + nom);
		var p = gLire(gCommun(R), "packed-refs");
		if (p && p.indexOf(" " + nom + "\n") > -1 || (p && new RegExp(" " + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "m").test(p))){
			var garde = p.split("\n").filter(function(l){ return !new RegExp("^[0-9a-f]{40} " + nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$").test(l); });
			// La ligne ^peeled qui suivait un tag tassé part avec lui.
			gEcrire(gCommun(R), "packed-refs", garde.join("\n").replace(/\n+$/, "") + "\n");
			ok = true;
		}
	}
	return ok;
}
function gNettoyerVidesRefs(base, nom){
	var m = nom.split("/");
	for (var k = m.length - 1; k >= 2; k--){
		var d = gDossier(base, m.slice(0, k).join("/"), false);
		if (!d || d.items.length || d.children.length) return;
		d.parents[0].removeChild(d);
	}
}

/* ================================================================== */
/* L'index                                                             */
/* ================================================================== */

/* Les entrées de l'index : [{ p, h, m, s }] triées par chemin puis étage. */
function gIndex(R){
	var it = gItem(R.git, "index");
	if (!it || !it.gitIndex || !it.gitIndex.e) return [];
	return it.gitIndex.e.map(function(e){ return { p: e[0], h: e[1], m: e[2], s: e[3] || 0 }; });
}
function gIndexEcrire(R, entrees){
	entrees = entrees.slice().sort(function(a, b){ return a.p < b.p ? -1 : a.p > b.p ? 1 : a.s - b.s; });
	var it = gItem(R.git, "index");
	if (!it){
		it = new Item("index", "", "item_manuscript.gif");
		it.owner = R.git.owner || gJoueur(); it.mode = "rw-r--r--";
		R.git.addItem(it);
	}
	it.gitIndex = { e: entrees.map(function(e){ return e.s ? [e.p, e.h, e.m, e.s] : [e.p, e.h, e.m]; }) };
	it.setText("DIRC\u0000\u0000\u0000\u0002" + String.fromCharCode(entrees.length & 255) + "\u0000\u0000\u0000" + (entrees.length ? entrees[0].h.substring(0, 6) : ""));
	it.sansFinDeLigne = true;
}
function gIndexCarte(entrees){ var c = {}; entrees.forEach(function(e){ if (!e.s) c[e.p] = { h: e.h, m: e.m }; }); return c; }
function gConflitsIndex(entrees){ var c = {}; entrees.forEach(function(e){ if (e.s){ c[e.p] = c[e.p] || {}; c[e.p][e.s] = { h: e.h, m: e.m }; } }); return c; }

/* ================================================================== */
/* Les arbres et les commits                                           */
/* ================================================================== */

/* Trie les entrées d'un arbre comme git (un dossier se compare avec un / final). */
function gTrierArbre(entrees){
	return entrees.sort(function(a, b){
		var x = a[1] + (a[0] === "40000" ? "/" : ""), y = b[1] + (b[0] === "40000" ? "/" : "");
		return x < y ? -1 : x > y ? 1 : 0;
	});
}
/* Aplatit un arbre : { chemin: { h, m } }. */
function gAplatir(R, arbre, prefixe, carte){
	carte = carte || {};
	var o = gObjet(R, arbre);
	if (!o) return carte;
	if (o.t === "commit") return gAplatir(R, gCommit(R, arbre).arbre, prefixe, carte);
	if (o.t !== "tree") return carte;
	o.c.forEach(function(e){
		var p = (prefixe ? prefixe + "/" : "") + e[1];
		if (e[0] === "40000") gAplatir(R, e[2], p, carte);
		else carte[p] = { h: e[2], m: e[0] };
	});
	return carte;
}
/* Fabrique les arbres d'une carte { chemin: { h, m } } ; renvoie le hash de l'arbre racine. */
function gArbreDepuisCarte(R, carte){
	var racine = { f: {}, d: {} };
	Object.keys(carte).forEach(function(p){
		var m = p.split("/"), n = racine;
		for (var i = 0; i < m.length - 1; i++){ n.d[m[i]] = n.d[m[i]] || { f: {}, d: {} }; n = n.d[m[i]]; }
		n.f[m[m.length - 1]] = carte[p];
	});
	function ecrire(n){
		var e = [];
		Object.keys(n.f).forEach(function(k){ e.push([n.f[k].m, k, n.f[k].h]); });
		Object.keys(n.d).forEach(function(k){ e.push(["40000", k, ecrire(n.d[k])]); });
		return gObjetEcrire(R, "tree", gTrierArbre(e));
	}
	return ecrire(racine);
}
/* Un commit lu : { arbre, parents, auteur: { nom, mail, s, tz }, commiteur, message, gpgsig, entetes }. */
function gCommit(R, hash){
	if (R.cache.commits && R.cache.commits[hash]) return R.cache.commits[hash];
	var o = gObjet(R, hash);
	// Un objet manquant ou d'un autre type : l'erreur du vrai (un dépôt abîmé ne fait pas planter le jeu).
	if (!o) throw new GitErreur("fatal: bad object " + hash, 128);
	if (o.t !== "commit") throw new GitErreur("fatal: object " + hash + " is a " + o.t + ", not a commit", 128);
	var c = gAnalyserCommit(o.c);
	R.cache.commits = R.cache.commits || {};
	R.cache.commits[hash] = c;
	return c;
}
function gAnalyserCommit(texte){
	var i = texte.indexOf("\n\n");
	var tete = i > -1 ? texte.substring(0, i) : texte, message = i > -1 ? texte.substring(i + 2) : "";
	var c = { arbre: null, parents: [], auteur: null, commiteur: null, message: message, gpgsig: null, brut: texte };
	var lignes = tete.split("\n"), sig = null;
	for (var k = 0; k < lignes.length; k++){
		var l = lignes[k];
		if (sig !== null){ if (l.charAt(0) === " "){ sig.push(l.substring(1)); continue; } c.gpgsig = sig.join("\n"); sig = null; }
		var m = /^(\S+) (.*)$/.exec(l);
		if (!m) continue;
		if (m[1] === "tree") c.arbre = m[2];
		else if (m[1] === "parent") c.parents.push(m[2]);
		else if (m[1] === "author" || m[1] === "committer"){
			var p = /^(.*?) <([^>]*)> (\d+) ([+-]\d{4})$/.exec(m[2]);
			var v = p ? { nom: p[1], mail: p[2], s: +p[3], tz: p[4] } : { nom: m[2], mail: "", s: 0, tz: GIT_FUSEAU };
			if (m[1] === "author") c.auteur = v; else c.commiteur = v;
		}
		else if (m[1] === "gpgsig") sig = [m[2]];
	}
	if (sig !== null) c.gpgsig = sig.join("\n");
	return c;
}
function gTexteCommit(c){
	var l = ["tree " + c.arbre];
	c.parents.forEach(function(p){ l.push("parent " + p); });
	l.push("author " + c.auteur.nom + " <" + c.auteur.mail + "> " + c.auteur.s + " " + c.auteur.tz);
	l.push("committer " + c.commiteur.nom + " <" + c.commiteur.mail + "> " + c.commiteur.s + " " + c.commiteur.tz);
	var tete = l.join("\n");
	if (c.gpgsig) tete += "\ngpgsig " + c.gpgsig.split("\n").join("\n ");
	return tete + "\n\n" + c.message;
}
/* Nettoie un message (comme git commit --cleanup=strip ou whitespace) : lignes de fin vides retirées, une fin de ligne. */
function gNettoyerMessage(m, commentaires){
	var lignes = String(m).split("\n");
	if (commentaires) lignes = lignes.filter(function(l){ return l.charAt(0) !== "#"; });
	lignes = lignes.map(function(l){ return l.replace(/\s+$/, ""); });
	// Plusieurs lignes vides consécutives n'en font qu'une ; les vides du début et de la fin partent.
	var sortie = [];
	lignes.forEach(function(l){ if (l === "" && (sortie.length === 0 || sortie[sortie.length - 1] === "")) return; sortie.push(l); });
	while (sortie.length && sortie[sortie.length - 1] === "") sortie.pop();
	return sortie.length ? sortie.join("\n") + "\n" : "";
}
function gSujet(message){ var l = String(message || "").split("\n\n")[0].replace(/\n/g, " ").trim(); return l; }
/* La date d'un auteur ou d'un commiteur : la variable d'environnement, sinon l'horloge, jamais deux fois la même seconde à l'envers. */
function gDateCommit(R, qui){
	var e = gDateEnv(qui === "author" ? "GIT_AUTHOR_DATE" : "GIT_COMMITTER_DATE");
	if (e) return e;
	return { s: gSecondes(R), tz: GIT_FUSEAU };
}
/* L'identité : user.name et user.email (ou les variables GIT_AUTHOR_NAME...). */
function gIdentite(R, qui){
	var nom = gEnv(qui === "author" ? "GIT_AUTHOR_NAME" : "GIT_COMMITTER_NAME") || gConfig(R, "user.name");
	var mail = gEnv(qui === "author" ? "GIT_AUTHOR_EMAIL" : "GIT_COMMITTER_EMAIL") || gConfig(R, "user.email");
	if (!nom || !mail || !String(nom).trim()){
		throw new GitErreur("Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email \"you@example.com\"\n  git config --global user.name \"Your Name\"\n\n" +
			"to set your account's default identity.\nOmit --global to set the identity only in this repository.\n\nfatal: unable to auto-detect email address (got '" + gJoueur() + "@" + ((R && R.h) || "terminus") + ".(none)')", 128);
	}
	return { nom: String(nom).trim(), mail: String(mail).trim() };
}

/* ================================================================== */
/* La copie de travail                                                 */
/* ================================================================== */

/* Le mode git d'un fichier du jeu : 100755 s'il est exécutable par son propriétaire, 120000 pour un lien. */
function gModeItem(it){ if (it.lien) return "120000"; return /^..x/.test(it.mode || "") ? "100755" : "100644"; }
/* Les fichiers de la copie de travail : { chemin: Item } (sans .git, ni les dépôts imbriqués). */
function gFichiersTravail(R, sousDossier){
	var l = {};
	if (!R.top) return l;
	(function visiter(dossier, prefixe, profondeur){
		if (profondeur > 40) return;
		dossier.items.forEach(function(it){
			if (it.person) return;
			if (prefixe === "" && it.itemname === ".git") return;
			l[prefixe + it.itemname] = it;
		});
		dossier.children.forEach(function(d){
			if (d.parents[0] !== dossier) return;
			if (d.room_name === ".git") return;
			if (d.getChildFromName(".git") !== -1 && prefixe + d.room_name !== "") return;
			visiter(d, prefixe + d.room_name + "/", profondeur + 1);
		});
	})(sousDossier ? (gDossier(R.top, sousDossier, false) || new Room("x")) : R.top, sousDossier ? sousDossier.replace(/\/?$/, "/") : "", 0);
	return l;
}
/* Le hash qu'aurait le contenu d'un fichier de travail (gardé en cache pendant la commande). */
function gHashTravail(R, it){
	var c = gContenu(it);
	R.cache.travail = R.cache.travail || {};
	var k = (it.lien ? "L" : "F") + c;
	if (R.cache.travail[k]) return R.cache.travail[k];
	var h = gHashObjet("blob", c);
	R.cache.travail[k] = h;
	return h;
}
/* Écrit un fichier de la copie de travail depuis un blob. */
function gPoserTravail(R, chemin, hash, mode){
	var o = gObjet(R, hash);
	var contenu = o ? o.c : "";
	var existant = gNoeud(R.top, chemin);
	if (existant instanceof Room){
		// Un dossier est à la place du fichier : git refuserait ; ici on le retire s'il est vide.
		if (!existant.items.length && !existant.children.length) existant.parents[0].removeChild(existant);
		else throw new GitErreur("error: Updating '" + chemin + "' would lose untracked files in it", 1);
	}
	// Un fichier est à la place d'un dossier du chemin.
	var m = chemin.split("/"), lieu = R.top;
	for (var i = 0; i < m.length - 1; i++){
		var x = lieu.getNode(m[i]);
		if (x instanceof Item){ lieu.removeItem(x); x = null; }
		if (!x) x = gNouveauDossier(lieu, m[i], gJoueur(), "rwxr-xr-x");
		lieu = x;
	}
	var it = lieu.getItemFromName(m[m.length - 1]);
	if (it === -1){
		it = new Item(m[m.length - 1], "", "item_sign.gif");
		it.owner = gJoueur(); lieu.addItem(it);
	}
	if (mode === "120000"){ it.lien = contenu; it.mode = "rwxrwxrwx"; it.setText(""); }
	else {
		if (it.lien) delete it.lien;
		gPoserContenu(it, contenu);
		it.mode = mode === "100755" ? "rwxr-xr-x" : "rw-r--r--";
	}
	if (World && World.fige){ it.age = 0; }
	return it;
}
function gRetirerTravail(R, chemin){
	if (gSupprimer(R.top, chemin)) gNettoyerVides(R.top, chemin);
}
function gEcrireTravailTexte(R, chemin, contenu, mode){
	var m = chemin.split("/"), lieu = R.top;
	for (var i = 0; i < m.length - 1; i++){ var x = lieu.getNode(m[i]); if (x instanceof Item){ lieu.removeItem(x); x = null; } if (!x) x = gNouveauDossier(lieu, m[i], gJoueur(), "rwxr-xr-x"); lieu = x; }
	var it = lieu.getItemFromName(m[m.length - 1]);
	if (it === -1){ it = new Item(m[m.length - 1], "", "item_sign.gif"); it.owner = gJoueur(); lieu.addItem(it); }
	if (it.lien) delete it.lien;
	gPoserContenu(it, contenu);
	if (mode) it.mode = mode === "100755" ? "rwxr-xr-x" : "rw-r--r--";
	return it;
}

/* ================================================================== */
/* .gitignore                                                          */
/* ================================================================== */

function gMotifVersRegExp(motif){
	var r = "", i = 0;
	while (i < motif.length){
		var c = motif.charAt(i);
		if (c === "*"){
			if (motif.charAt(i + 1) === "*"){
				var avant = i === 0 || motif.charAt(i - 1) === "/", apres = motif.charAt(i + 2);
				if (avant && apres === "/"){ r += "(?:.*/)?"; i += 3; continue; }
				if (avant && apres === ""){ r += ".*"; i += 2; continue; }
				r += "[^/]*"; i += 2; continue;
			}
			r += "[^/]*"; i++; continue;
		}
		if (c === "?"){ r += "[^/]"; i++; continue; }
		if (c === "["){
			var j = motif.indexOf("]", i + 2);
			if (j > -1){ var cl = motif.substring(i + 1, j).replace(/^!/, "^").replace(/\\/g, "\\\\"); r += "[" + cl + "]"; i = j + 1; continue; }
		}
		if (c === "\\" && i + 1 < motif.length){ r += motif.charAt(i + 1).replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); i += 2; continue; }
		r += c.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
		i++;
	}
	return r;
}
/* Les motifs d'un texte .gitignore, posé dans le dossier base (chemin relatif à la racine). */
function gMotifsIgnore(texte, base, source){
	var l = [];
	String(texte || "").split("\n").forEach(function(ligne, numero){
		var brut = ligne;
		if (/^\s*$/.test(ligne) || ligne.charAt(0) === "#") return;
		ligne = ligne.replace(/(^|[^\\])\s+$/, "$1");
		var negation = false;
		if (ligne.charAt(0) === "!"){ negation = true; ligne = ligne.substring(1); }
		if (ligne.charAt(0) === "\\") ligne = ligne.substring(1);
		var dossierSeul = /\/$/.test(ligne);
		if (dossierSeul) ligne = ligne.replace(/\/+$/, "");
		if (ligne === "") return;
		var ancre = ligne.indexOf("/") > -1;
		ligne = ligne.replace(/^\//, "");
		var re = gMotifVersRegExp(ligne);
		l.push({ re: new RegExp("^" + re + "$"), ancre: ancre, dossierSeul: dossierSeul, negation: negation, base: base, source: source, ligne: numero + 1, texte: brut.replace(/\s+$/, "") });
	});
	return l;
}
/* Un juge d'ignorance pour le dépôt : juge(chemin, estDossier) -> le motif qui décide (ou null). */
function gJugeIgnore(R){
	if (R.cache.juge) return R.cache.juge;
	var globaux = [];
	var exc = gConfig(R, "core.excludesFile");
	if (exc){ var r = gChemin(R.top || R.git, exc.replace(/^~/, "~")); if (r && r.noeud instanceof Item) globaux = globaux.concat(gMotifsIgnore(gContenu(r.noeud), "", exc)); }
	var info = gLire(R.git, "info/exclude");
	if (info) globaux = globaux.concat(gMotifsIgnore(info, "", ".git/info/exclude"));
	var parDossier = {};
	function motifsDe(dossier){
		if (parDossier.hasOwnProperty(dossier)) return parDossier[dossier];
		var d = dossier ? gDossier(R.top, dossier, false) : R.top, l = [];
		if (d){ var it = d.getItemFromName(".gitignore"); if (it !== -1 && it) l = gMotifsIgnore(gContenu(it), dossier, (dossier ? dossier + "/" : "") + ".gitignore"); }
		parDossier[dossier] = l;
		return l;
	}
	function decide(chemin, estDossier){
		var m = chemin.split("/"), dossier = m.slice(0, -1).join("/");
		var motifs = globaux.slice();
		for (var k = 0; k <= m.length - 1; k++) motifs = motifs.concat(motifsDe(m.slice(0, k).join("/")));
		var nom = m[m.length - 1], verdict = null;
		motifs.forEach(function(p){
			if (p.dossierSeul && !estDossier) return;
			var rel;
			if (p.base){ if (chemin.indexOf(p.base + "/") !== 0) return; rel = chemin.substring(p.base.length + 1); }
			else rel = chemin;
			var ok = p.ancre ? p.re.test(rel) : p.re.test(nom);
			if (ok) verdict = p;
		});
		return verdict;
	}
	var juge = function(chemin, estDossier){
		// Un dossier ignoré emporte tout ce qu'il contient (on ne réinclut pas sous un dossier ignoré).
		var m = chemin.split("/");
		for (var k = 1; k < m.length; k++){
			var v = decide(m.slice(0, k).join("/"), true);
			if (v && !v.negation) return v;
		}
		var f = decide(chemin, !!estDossier);
		return f && !f.negation ? f : (f && f.negation ? null : null);
	};
	juge.detail = function(chemin, estDossier){
		var m = chemin.split("/");
		for (var k = 1; k < m.length; k++){ var v = decide(m.slice(0, k).join("/"), true); if (v && !v.negation) return v; }
		return decide(chemin, !!estDossier);
	};
	R.cache.juge = juge;
	return juge;
}

/* ================================================================== */
/* Le diff : Myers, compactage et heuristique d'indentation (xdiff)     */
/* ================================================================== */

/* Coupe un contenu en lignes (chaque ligne garde sa fin de ligne, la dernière peut ne pas en avoir). */
function gLignes(contenu){
	if (contenu === "" || contenu === null || contenu === undefined) return [];
	var l = String(contenu).split("\n");
	var r = [];
	for (var i = 0; i < l.length; i++){
		if (i === l.length - 1){ if (l[i] !== "") r.push(l[i]); }
		else r.push(l[i] + "\n");
	}
	return r;
}
/* Les lignes changées de part et d'autre : { ca: [bool], cb: [bool] } (Myers, puis le compactage de xdiff). */
function gChangements(a, b){
	var n = a.length, m = b.length, ca = new Array(n), cb = new Array(m), i;
	for (i = 0; i < n; i++) ca[i] = false;
	for (i = 0; i < m; i++) cb[i] = false;
	var debut = 0;
	while (debut < n && debut < m && a[debut] === b[debut]) debut++;
	var fa = n, fb = m;
	while (fa > debut && fb > debut && a[fa - 1] === b[fb - 1]){ fa--; fb--; }
	var N = fa - debut, M = fb - debut;
	if (N === 0){ for (i = debut; i < fb; i++) cb[i] = true; }
	else if (M === 0){ for (i = debut; i < fa; i++) ca[i] = true; }
	else {
		// Myers O(ND) avec la trace des V.
		var max = N + M, off = max, v = new Array(2 * max + 2), traces = [], d, k, x, y, trouve = false;
		for (i = 0; i < v.length; i++) v[i] = 0;
		v[off + 1] = 0;
		for (d = 0; d <= max && !trouve; d++){
			traces.push(v.slice());
			for (k = -d; k <= d; k += 2){
				if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
				else x = v[off + k - 1] + 1;
				y = x - k;
				while (x < N && y < M && a[debut + x] === b[debut + y]){ x++; y++; }
				v[off + k] = x;
				if (x >= N && y >= M){ trouve = true; break; }
			}
		}
		// On remonte la trace.
		x = N; y = M;
		for (d = traces.length - 1; d > 0; d--){
			var vv = traces[d];
			k = x - y;
			var kp;
			if (k === -d || (k !== d && vv[off + k - 1] < vv[off + k + 1])) kp = k + 1; else kp = k - 1;
			var xp = vv[off + kp], yp = xp - kp;
			while (x > xp && y > yp){ x--; y--; }
			if (x === xp) cb[debut + yp] = true; else ca[debut + xp] = true;
			x = xp; y = yp;
		}
	}
	gCompacter(a, ca, cb);
	gCompacter(b, cb, ca);
	return { ca: ca, cb: cb };
}
/* Le compactage de xdiff (xdl_change_compact) : glisser les groupes de lignes changées, puis l'heuristique d'indentation. */
function gCompacter(recs, rchg, rchgO){
	var nrec = recs.length, nrecO = rchgO.length;
	function c(i){ return i >= 0 && i < nrec && rchg[i]; }
	function co(i){ return i >= 0 && i < nrecO && rchgO[i]; }
	var g = { start: 0, end: 0 }, go = { start: 0, end: 0 };
	while (c(g.end)) g.end++;
	while (co(go.end)) go.end++;
	function suivant(gr, f, n){ if (gr.end === n) return false; gr.start = gr.end + 1; gr.end = gr.start; while (f(gr.end)) gr.end++; return true; }
	function precedent(gr, f){ if (gr.start === 0) return false; gr.end = gr.start - 1; gr.start = gr.end; while (f(gr.start - 1)) gr.start--; return true; }
	function bas(){ if (g.end < nrec && recs[g.start] === recs[g.end]){ rchg[g.start++] = false; rchg[g.end++] = true; while (c(g.end)) g.end++; return true; } return false; }
	function haut(){ if (g.start > 0 && recs[g.start - 1] === recs[g.end - 1]){ rchg[--g.start] = true; rchg[--g.end] = false; while (c(g.start - 1)) g.start--; return true; } return false; }
	var garde = 0;
	while (garde++ < 100000){
		if (g.end !== g.start){
			var taille, plusTot, finAutre;
			do {
				taille = g.end - g.start;
				finAutre = -1;
				while (haut()) precedent(go, co);
				plusTot = g.end;
				if (go.end > go.start) finAutre = g.end;
				while (true){
					if (!bas()) break;
					suivant(go, co, nrecO);
					if (go.end > go.start) finAutre = g.end;
				}
			} while (taille !== g.end - g.start);
			if (g.end === plusTot){ /* aucun glissement possible */ }
			else if (finAutre !== -1){
				while (go.end === go.start){ if (!haut()) break; if (!precedent(go, co)) break; }
			} else {
				var decalage = plusTot, meilleur = -1, meilleurScore = null;
				if (g.end - taille - 1 > decalage) decalage = g.end - taille - 1;
				if (g.end - 100 > decalage) decalage = g.end - 100;
				for (; decalage <= g.end; decalage++){
					var s = { ei: 0, p: 0 };
					gScoreCoupe(gMesureCoupe(recs, decalage), s);
					gScoreCoupe(gMesureCoupe(recs, decalage - taille), s);
					if (meilleur === -1 || gComparerScores(s, meilleurScore) <= 0){ meilleurScore = s; meilleur = decalage; }
				}
				while (g.end > meilleur){ if (!haut()) break; precedent(go, co); }
			}
		}
		if (!suivant(g, c, nrec)) break;
		if (!suivant(go, co, nrecO)) break;
	}
}
function gIndentation(l){
	var r = 0;
	for (var i = 0; i < l.length; i++){
		var ch = l.charAt(i);
		if (!/\s/.test(ch)) return r;
		if (ch === " ") r += 1; else if (ch === "\t") r += 8 - r % 8;
		if (r >= 200) return 200;
	}
	return -1;
}
function gMesureCoupe(recs, coupe){
	var m = {}, i;
	if (coupe >= recs.length){ m.fin = true; m.indent = -1; } else { m.fin = false; m.indent = gIndentation(recs[coupe]); }
	m.preVide = 0; m.preIndent = -1;
	for (i = coupe - 1; i >= 0; i--){ m.preIndent = gIndentation(recs[i]); if (m.preIndent !== -1) break; m.preVide++; if (m.preVide === 20){ m.preIndent = 0; break; } }
	m.postVide = 0; m.postIndent = -1;
	for (i = coupe + 1; i < recs.length; i++){ m.postIndent = gIndentation(recs[i]); if (m.postIndent !== -1) break; m.postVide++; if (m.postVide === 20){ m.postIndent = 0; break; } }
	return m;
}
function gScoreCoupe(m, s){
	if (m.preIndent === -1 && m.preVide === 0) s.p += 1;
	if (m.fin) s.p += 21;
	var postVide = m.indent === -1 ? 1 + m.postVide : 0;
	var totalVide = m.preVide + postVide;
	s.p += -30 * totalVide;
	s.p += 6 * postVide;
	var indent = m.indent !== -1 ? m.indent : m.postIndent;
	var vides = totalVide !== 0;
	s.ei += indent;
	if (indent === -1){}
	else if (m.preIndent === -1){}
	else if (indent > m.preIndent) s.p += vides ? 10 : -4;
	else if (indent === m.preIndent){}
	else {
		if (m.postIndent !== -1 && m.postIndent > indent) s.p += vides ? 17 : 24;
		else s.p += vides ? 17 : 23;
	}
}
function gComparerScores(a, b){ var ci = (a.ei > b.ei ? 1 : 0) - (a.ei < b.ei ? 1 : 0); return 60 * ci + (a.p - b.p); }

/* Les blocs de différences : [{ a0, a1, b0, b1 }] (intervalles demi-ouverts). */
function gBlocs(a, b){
	var ch = gChangements(a, b), blocs = [], i = 0, j = 0;
	while (i < a.length || j < b.length){
		if (i < a.length && j < b.length && !ch.ca[i] && !ch.cb[j]){ i++; j++; continue; }
		var a0 = i, b0 = j;
		while (i < a.length && ch.ca[i]) i++;
		while (j < b.length && ch.cb[j]) j++;
		if (i === a0 && j === b0){ i++; j++; continue; }
		blocs.push({ a0: a0, a1: i, b0: b0, b1: j });
	}
	return blocs;
}
/* La ligne de contexte d'un hunk (la « funcname » par défaut : une ligne qui commence par une lettre, _ ou $). */
function gFonctionAvant(a, ligne){
	for (var i = ligne - 1; i >= 0; i--){
		if (/^[A-Za-z_$]/.test(a[i])){
			var t = a[i].replace(/\n$/, "");
			var o = gUtf8(t);
			if (o.length > 80){ t = t.substring(0, 80); while (gLongueurUtf8(t) > 80) t = t.substring(0, t.length - 1); }
			return t.replace(/\s+$/, "");
		}
	}
	return "";
}
/* Les hunks unifiés (contexte 3, comme git diff) : texte des @@ et des lignes. */
function gHunks(a, b, contexte){
	var ctx = contexte === undefined ? 3 : contexte;
	var blocs = gBlocs(a, b);
	if (!blocs.length) return [];
	var groupes = [], courant = [blocs[0]];
	for (var i = 1; i < blocs.length; i++){
		if (blocs[i].a0 - courant[courant.length - 1].a1 <= 2 * ctx) courant.push(blocs[i]);
		else { groupes.push(courant); courant = [blocs[i]]; }
	}
	groupes.push(courant);
	return groupes.map(function(gr){
		var premier = gr[0], dernier = gr[gr.length - 1];
		var sa = Math.max(0, premier.a0 - ctx), ea = Math.min(a.length, dernier.a1 + ctx);
		var sb = Math.max(0, premier.b0 - ctx), eb = Math.min(b.length, dernier.b1 + ctx);
		var lignes = [], ia = sa, ib = sb;
		gr.forEach(function(bl){
			while (ia < bl.a0){ lignes.push(" " + a[ia]); ia++; ib++; }
			for (var x = bl.a0; x < bl.a1; x++) lignes.push("-" + a[x]);
			for (var y = bl.b0; y < bl.b1; y++) lignes.push("+" + b[y]);
			ia = bl.a1; ib = bl.b1;
		});
		while (ia < ea){ lignes.push(" " + a[ia]); ia++; ib++; }
		var la = ea - sa, lb = eb - sb;
		var tete = "@@ -" + (la === 0 ? sa : sa + 1) + (la === 1 ? "" : "," + la) + " +" + (lb === 0 ? sb : sb + 1) + (lb === 1 ? "" : "," + lb) + " @@";
		var f = gFonctionAvant(a, sa);
		return { tete: tete + (f ? " " + f : ""), lignes: lignes, a0: sa, a1: ea, b0: sb, b1: eb, blocs: gr };
	});
}
/* Les lignes d'un hunk, avec « \ No newline at end of file » où il faut. */
function gTexteHunk(h){
	var l = [h.tete];
	h.lignes.forEach(function(x){
		if (/\n$/.test(x)) l.push(x.substring(0, x.length - 1));
		else { l.push(x); l.push("\\ No newline at end of file"); }
	});
	return l;
}
function gCompteHunks(hunks){ var plus = 0, moins = 0; hunks.forEach(function(h){ h.lignes.forEach(function(l){ if (l.charAt(0) === "+") plus++; else if (l.charAt(0) === "-") moins++; }); }); return { plus: plus, moins: moins }; }
/* Le diff d'un fichier, en-têtes compris (diff --git a/x b/x ...). a et b : { h, m, c } ou null. */
function gDiffFichier(R, chemin, a, b, options){
	options = options || {};
	var ancien = options.ancien || chemin;
	var l = ["diff --git a/" + ancien + " b/" + chemin];
	if (options.ancien){
		l.push("similarity index " + options.similarite + "%", "rename from " + ancien, "rename to " + chemin);
		if (a.h === b.h) return l.join("\n");
		l.push("index " + gCourt(R, a.h) + ".." + gCourt(R, b.h) + (a.m === b.m ? " " + a.m : ""));
		var hk = gHunks(gLignes(gObjet(R, a.h).c), gLignes(gObjet(R, b.h).c), options.contexte);
		l.push("--- a/" + ancien, "+++ b/" + chemin);
		hk.forEach(function(h){ l = l.concat(gTexteHunk(h)); });
		return l.join("\n");
	}
	var ha = a ? a.h : GIT_VIDE, hb = b ? b.h : GIT_VIDE;
	if (!a) l.push("new file mode " + b.m);
	else if (!b) l.push("deleted file mode " + a.m);
	else if (a.m !== b.m){ l.push("old mode " + a.m, "new mode " + b.m); }
	if (ha !== hb) l.push("index " + gCourt(R, ha) + ".." + gCourt(R, hb) + (a && b && a.m === b.m ? " " + a.m : ""));
	var ca = a ? (a.c !== undefined ? a.c : (gObjet(R, a.h) || { c: "" }).c) : "", cb = b ? (b.c !== undefined ? b.c : (gObjet(R, b.h) || { c: "" }).c) : "";
	if (ha === hb && a && b && a.m !== b.m) return l.join("\n");
	var hunks = gHunks(gLignes(ca), gLignes(cb), options.contexte);
	if (hunks.length){
		l.push("--- " + (a ? "a/" + chemin : "/dev/null"), "+++ " + (b ? "b/" + chemin : "/dev/null"));
		hunks.forEach(function(h){ l = l.concat(gTexteHunk(h)); });
	}
	return l.join("\n");
}
/* Le diff de deux cartes { chemin: { h, m, c? } } : [{ chemin, a, b }] triés. */
function gComparerCartes(A, B){
	var chemins = {};
	Object.keys(A).forEach(function(p){ chemins[p] = true; });
	Object.keys(B).forEach(function(p){ chemins[p] = true; });
	return Object.keys(chemins).sort().map(function(p){
		var a = A[p] || null, b = B[p] || null;
		if (a && b && a.h === b.h && a.m === b.m) return null;
		return { chemin: p, a: a, b: b };
	}).filter(Boolean);
}
/* Les renommages (diff.renames, comme le vrai) : une suppression et un ajout au contenu identique ou semblable à 50 % au moins
 * deviennent { chemin: nouveau, ancien, a, b, similarite }. Les autres changements restent tels quels. */
function gRenommages(R, changes){
	var supp = changes.filter(function(x){ return x.a && !x.b; }), ajouts = changes.filter(function(x){ return !x.a && x.b; });
	if (!supp.length || !ajouts.length) return changes;
	var paires = [], prisS = {}, prisA = {};
	ajouts.forEach(function(ad, j){ supp.forEach(function(sd, i){ if (!prisS[i] && !prisA[j] && sd.a.h === ad.b.h){ prisS[i] = prisA[j] = true; paires.push({ s: sd, a: ad, sim: 100 }); } }); });
	var candidats = [];
	ajouts.forEach(function(ad, j){
		if (prisA[j]) return;
		var cb = (gObjet(R, ad.b.h) || { c: "" }).c;
		supp.forEach(function(sd, i){
			if (prisS[i]) return;
			var ca = (gObjet(R, sd.a.h) || { c: "" }).c;
			var la = gLignes(ca), lb = gLignes(cb);
			if (!la.length && !lb.length) return;
			var ch = gChangements(la, lb), communes = 0;
			for (var k = 0; k < la.length; k++) if (!ch.ca[k]) communes++;
			var octetsCommuns = 0;
			for (var k2 = 0; k2 < la.length; k2++) if (!ch.ca[k2]) octetsCommuns += gLongueurUtf8(la[k2]);
			var taille = Math.max(gLongueurUtf8(ca), gLongueurUtf8(cb)) || 1;
			var sim = Math.floor(octetsCommuns * 100 / taille);
			if (sim >= 50) candidats.push({ i: i, j: j, sim: sim });
		});
	});
	candidats.sort(function(x, y){ return y.sim - x.sim; });
	candidats.forEach(function(c){ if (prisS[c.i] || prisA[c.j]) return; prisS[c.i] = prisA[c.j] = true; paires.push({ s: supp[c.i], a: ajouts[c.j], sim: c.sim }); });
	var sortie = changes.filter(function(x){ return !paires.some(function(p){ return p.s === x || p.a === x; }); });
	paires.forEach(function(p){ sortie.push({ chemin: p.a.chemin, ancien: p.s.chemin, a: p.s.a, b: p.a.b, similarite: p.sim }); });
	return sortie.sort(function(x, y){ return x.chemin < y.chemin ? -1 : x.chemin > y.chemin ? 1 : 0; });
}
/* Le nom d'un renommage dans --stat : « ancien => nouveau », avec la partie commune entre accolades. */
function gNomRenommage(a, b){
	var i = 0;
	while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i++;
	var debut = a.substring(0, i).lastIndexOf("/") + 1;
	var j = 0;
	while (j < a.length - debut && j < b.length - debut && a.charAt(a.length - 1 - j) === b.charAt(b.length - 1 - j)) j++;
	var fin = j ? a.length - j + a.substring(a.length - j).indexOf("/") : a.length;
	var finB = j ? b.length - j + b.substring(b.length - j).indexOf("/") : b.length;
	if (a.substring(a.length - j).indexOf("/") < 0){ fin = a.length; finB = b.length; }
	if (!debut && fin === a.length) return a + " => " + b;
	return a.substring(0, debut) + "{" + a.substring(debut, fin) + " => " + b.substring(debut, finB) + "}" + a.substring(fin);
}
/* Le --stat : « file | 3 ++- » puis « 1 file changed, 2 insertions(+), 1 deletion(-) ». */
function gStat(R, changes, largeur){
	if (!changes.length) return "";
	var lignes = changes.map(function(x){
		var ca = x.a ? (x.a.c !== undefined ? x.a.c : (gObjet(R, x.a.h) || { c: "" }).c) : "", cb = x.b ? (x.b.c !== undefined ? x.b.c : (gObjet(R, x.b.h) || { c: "" }).c) : "";
		var n = gCompteHunks(gHunks(gLignes(ca), gLignes(cb), 0));
		return { nom: x.ancien ? gNomRenommage(x.ancien, x.chemin) : x.chemin, plus: n.plus, moins: n.moins };
	});
	var maxNom = 0, maxTotal = 0, plus = 0, moins = 0;
	lignes.forEach(function(l){ maxNom = Math.max(maxNom, l.nom.length); maxTotal = Math.max(maxTotal, l.plus + l.moins); plus += l.plus; moins += l.moins; });
	var largeurNombre = String(maxTotal).length;
	var place = Math.max(1, (largeur || 80) - maxNom - largeurNombre - 4);
	var echelle = maxTotal > place ? place / maxTotal : 1;
	var sortie = lignes.map(function(l){
		var total = l.plus + l.moins, p = l.plus, m = l.moins;
		if (echelle < 1 && total){ var pp = Math.round(p * echelle), mm = Math.round(m * echelle); if (p && !pp) pp = 1; if (m && !mm) mm = 1; p = pp; m = mm; }
		var nom = l.nom; while (nom.length < maxNom) nom += " ";
		var nb = String(total); while (nb.length < largeurNombre) nb = " " + nb;
		return " " + nom + " | " + nb + (total ? " " + new Array(p + 1).join("+") + new Array(m + 1).join("-") : "");
	});
	var resume = " " + lignes.length + " file" + (lignes.length > 1 ? "s" : "") + " changed";
	if (plus || !moins) resume += ", " + plus + " insertion" + (plus === 1 ? "" : "s") + "(+)";
	if (moins) resume += ", " + moins + " deletion" + (moins === 1 ? "" : "s") + "(-)";
	if (!plus && !moins) resume = " " + lignes.length + " file" + (lignes.length > 1 ? "s" : "") + " changed, 0 insertions(+), 0 deletions(-)";
	sortie.push(resume);
	return sortie.join("\n");
}
/* Le résumé de création et de suppression (create mode 100644 x) d'un commit ou d'une fusion. */
function gResumeModes(changes){
	var l = [];
	changes.forEach(function(x){
		if (x.ancien){ l.push(" rename " + gNomRenommage(x.ancien, x.chemin) + " (" + x.similarite + "%)"); return; }
		if (!x.a) l.push(" create mode " + x.b.m + " " + x.chemin);
		else if (!x.b) l.push(" delete mode " + x.a.m + " " + x.chemin);
		else if (x.a.m !== x.b.m) l.push(" mode change " + x.a.m + " => " + x.b.m + " " + x.chemin);
	});
	return l;
}

/* ================================================================== */
/* La fusion à trois voies d'un fichier (diff3, comme xdl_merge)        */
/* ================================================================== */

/* base, nous, eux : des contenus ; renvoie { texte, conflits }. style : "merge", "diff3" ou "zdiff3". */
function gFusionTexte(base, nous, eux, etiquettes, style){
	if (nous === eux) return { texte: nous, conflits: 0 };
	if (base === nous) return { texte: eux, conflits: 0 };
	if (base === eux) return { texte: nous, conflits: 0 };
	var B = gLignes(base), A = gLignes(nous), C = gLignes(eux);
	var ba = gBlocs(B, A), bc = gBlocs(B, C);
	// Les régions changées de chaque côté, sur les lignes de la base.
	var regions = [];
	ba.forEach(function(x){ regions.push({ s: 0, a0: x.a0, a1: x.a1, b0: x.b0, b1: x.b1 }); });
	bc.forEach(function(x){ regions.push({ s: 1, a0: x.a0, a1: x.a1, b0: x.b0, b1: x.b1 }); });
	regions.sort(function(x, y){ return x.a0 - y.a0 || x.s - y.s; });
	// Les fusionner quand elles se touchent.
	var paquets = [];
	regions.forEach(function(r){
		var p = paquets[paquets.length - 1];
		if (p && (r.a0 < p.a1 || (r.a0 === p.a1 && (r.a0 === r.a1 || p.a0 === p.a1 || true) && r.a0 === p.a1 && (p.cotes[r.s === 0 ? 1 : 0] ? true : false) && r.a0 < p.a1 + 0)) ){ p.a1 = Math.max(p.a1, r.a1); p.l.push(r); p.cotes[r.s] = true; return; }
		if (p && r.a0 === p.a1 && r.a0 === r.a1 && p.cotes[1 - r.s]){ p.l.push(r); p.cotes[r.s] = true; return; }
		if (p && r.a0 === p.a1 && p.a0 === p.a1 && p.cotes[1 - r.s]){ p.a1 = Math.max(p.a1, r.a1); p.l.push(r); p.cotes[r.s] = true; return; }
		var cotes = [false, false]; cotes[r.s] = true;
		paquets.push({ a0: r.a0, a1: r.a1, l: [r], cotes: cotes });
	});
	// Pour un côté, ses lignes sur [a0, a1) de la base.
	function cote(s, a0, a1){
		var L = s === 0 ? A : C, blocs = s === 0 ? ba : bc;
		// Décalage : la position dans L qui correspond à a0.
		function pos(x, fin){
			var d = 0;
			for (var i = 0; i < blocs.length; i++){
				var b = blocs[i];
				// Une insertion pile en x : le début de la région la précède, la fin la comprend.
				if (b.a1 <= x && !(b.a0 === x && b.a1 === x)){ d = (b.b1 - b.a1); continue; }
				if (b.a0 < x && x < b.a1) return fin ? b.b1 : b.b0;
				if (b.a0 === x && b.a1 === x && fin){ d = b.b1 - b.a1; continue; }
				break;
			}
			return x + d;
		}
		return L.slice(pos(a0, false), pos(a1, true));
	}
	var sortie = [], conflits = 0, i = 0;
	paquets.forEach(function(p){
		while (i < p.a0){ sortie.push(B[i]); i++; }
		var lA = cote(0, p.a0, p.a1), lC = cote(1, p.a0, p.a1), lB = B.slice(p.a0, p.a1);
		if (!p.cotes[1]) sortie = sortie.concat(lA);
		else if (!p.cotes[0]) sortie = sortie.concat(lC);
		else if (lA.join("") === lC.join("")) sortie = sortie.concat(lA);
		else {
			// Zélé : les lignes communes au début et à la fin des deux côtés sortent du conflit.
			var deb = 0;
			if (style !== "diff3"){ while (deb < lA.length && deb < lC.length && lA[deb] === lC[deb]) deb++; }
			var fin = 0;
			if (style !== "diff3"){ while (fin < lA.length - deb && fin < lC.length - deb && lA[lA.length - 1 - fin] === lC[lC.length - 1 - fin]) fin++; }
			sortie = sortie.concat(lA.slice(0, deb));
			var mA = lA.slice(deb, lA.length - fin), mC = lC.slice(deb, lC.length - fin);
			function ligne(x){ return /\n$/.test(x) ? x : x + "\n"; }
			sortie.push("<<<<<<< " + etiquettes[0] + "\n");
			mA.forEach(function(x){ sortie.push(ligne(x)); });
			if (style === "diff3" || style === "zdiff3"){ sortie.push("||||||| " + etiquettes[2] + "\n"); lB.forEach(function(x){ sortie.push(ligne(x)); }); }
			sortie.push("=======\n");
			mC.forEach(function(x){ sortie.push(ligne(x)); });
			sortie.push(">>>>>>> " + etiquettes[1] + "\n");
			sortie = sortie.concat(lA.slice(lA.length - fin));
			conflits++;
		}
		i = p.a1;
	});
	while (i < B.length){ sortie.push(B[i]); i++; }
	return { texte: sortie.join(""), conflits: conflits };
}

/* ================================================================== */
/* Les révisions                                                       */
/* ================================================================== */

function gErreurRevision(rev){
	return new GitErreur("fatal: ambiguous argument '" + rev + "': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'", 128);
}
/* Le nom d'une ref complète pour un nom court (refs/heads/x, refs/tags/x...), ou null. */
function gNomRef(R, nom){
	if (nom === "HEAD" || /^(ORIG_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD|REVERT_HEAD|FETCH_HEAD|BISECT_HEAD)$/.test(nom)) return gRefBrute(R, nom) !== null ? nom : null;
	var essais = [nom, "refs/" + nom, "refs/tags/" + nom, "refs/heads/" + nom, "refs/remotes/" + nom, "refs/remotes/" + nom + "/HEAD"];
	for (var i = 0; i < essais.length; i++){ if (essais[i].indexOf("refs/") === 0 || i === 0 && /^refs\//.test(nom)){ if (gRefBrute(R, essais[i]) !== null) return essais[i]; } }
	return null;
}
/* Déroule un tag annoté jusqu'à ce qu'il désigne (un commit, le plus souvent). */
function gPeler(R, hash, type){
	var g = 0;
	while (hash && g++ < 10){
		var o = gObjet(R, hash);
		if (!o) return null;
		if (o.t === "tag" && type !== "tag"){ var m = /^object ([0-9a-f]{40})/m.exec(o.c); hash = m ? m[1] : null; continue; }
		if (type === "tree" && o.t === "commit") return gCommit(R, hash).arbre;
		return hash;
	}
	return hash;
}
/* Résout une révision : HEAD, @, branche, tag, origin/main, hash abrégé, X~n, X^n, X@{n}, @{u}, @{-1}, X:chemin, :chemin. */
function gResoudre(R, rev, options){
	options = options || {};
	var brut = String(rev);
	if (brut === "") throw gErreurRevision(rev);
	// rev:chemin et :chemin (l'index).
	var deux = brut.indexOf(":");
	if (deux > -1 && !/^[^:]*@\{/.test(brut.substring(0, deux + 1))){
		var avant = brut.substring(0, deux), chemin = brut.substring(deux + 1).replace(/^\.\//, "");
		if (avant === "" || /^[0-3]$/.test(avant) && brut.charAt(1) === ":"){
			var etage = avant === "" ? 0 : +avant;
			if (avant !== "" && brut.charAt(1) === ":") chemin = brut.substring(3);
			var e = gIndex(R).filter(function(x){ return x.p === chemin && (x.s || 0) === etage; })[0];
			if (!e) throw new GitErreur("fatal: path '" + chemin + "' does not exist (neither on disk nor in the index)", 128);
			return e.h;
		}
		var c = gResoudre(R, avant, { commit: true });
		var arbre = gPeler(R, c, "tree");
		if (chemin === "") return arbre;
		var carte = gAplatir(R, arbre);
		if (carte[chemin]) return carte[chemin].h;
		// Un dossier.
		var sous = gSousArbre(R, arbre, chemin);
		if (sous) return sous;
		throw new GitErreur("fatal: path '" + chemin + "' does not exist in '" + avant + "'", 128);
	}
	var m = /^(.*?)((?:[~^]\d*|@\{[^}]*\}|\^\{[a-z]*\})*)$/.exec(brut);
	var base = m[1], suite = m[2];
	var hash = null;
	if (base === "" && /^@\{/.test(suite)) base = "HEAD";
	if (base === "@") base = "HEAD";
	// @{-1} : la branche d'avant (le reflog de HEAD).
	var anc = /^@\{-(\d+)\}/.exec(suite);
	if (anc && (base === "HEAD" || base === "")){
		var nb = gBrancheAvant(R, +anc[1]);
		if (!nb) throw gErreurRevision(rev);
		hash = gRef(R, "refs/heads/" + nb) || gResoudre(R, nb);
		suite = suite.substring(anc[0].length);
	} else {
		var ref = gNomRef(R, base);
		if (ref) hash = gRef(R, ref);
		if (!hash){ var court = gDepuisCourt(R, base); if (court) hash = court; }
		if (!hash){
			if (ref === "HEAD" || base === "HEAD") throw new GitErreur("fatal: ambiguous argument 'HEAD': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'", 128);
			throw gErreurRevision(rev);
		}
		// X@{n} et X@{u}.
		var at = /^@\{([^}]*)\}/.exec(suite);
		if (at){
			suite = suite.substring(at[0].length);
			var refNom = ref || (base === "HEAD" ? "HEAD" : null);
			if (/^(u|upstream|push)$/i.test(at[1])){
				var br = refNom === "HEAD" ? gBrancheCourante(R) : (refNom && refNom.indexOf("refs/heads/") === 0 ? refNom.substring(11) : null);
				var amont = br ? gAmont(R, br) : null;
				if (!amont) throw new GitErreur("fatal: no upstream configured for branch '" + (br || base) + "'", 128);
				hash = gRef(R, amont);
				if (!hash) throw new GitErreur("fatal: upstream branch '" + amont + "' not stored as a remote-tracking branch", 128);
			} else if (/^\d+$/.test(at[1])){
				var lf = gReflogLire(R, refNom || "HEAD");
				var n = +at[1];
				if (n === 0 && !lf.length){ /* HEAD@{0} sans reflog : la ref elle-même */ }
				else if (n >= lf.length){
					if (n === lf.length && lf.length) hash = lf[lf.length - 1].ancien !== GIT_VIDE ? lf[lf.length - 1].ancien : null;
					if (!hash || n > lf.length) throw new GitErreur("fatal: log for '" + (refNom === "HEAD" ? "HEAD" : base) + "' only has " + lf.length + " entries", 128);
				}
				else hash = lf[n].nouveau;
			} else {
				var t = gDateDepuisTexte(at[1], gSecondes(R));
				if (t === null) throw gErreurRevision(rev);
				var lt = gReflogLire(R, refNom || "HEAD"), choisi = null;
				for (var q = 0; q < lt.length; q++){ if (lt[q].s <= t){ choisi = lt[q].nouveau; break; } }
				hash = choisi || (lt.length ? lt[lt.length - 1].nouveau : hash);
			}
		}
	}
	// ~n, ^n, ^{type}.
	var re = /\^\{([a-z]*)\}|([~^])(\d*)/g, x;
	while ((x = re.exec(suite)) !== null){
		if (x[1] !== undefined){ hash = gPeler(R, hash, x[1] || "commit"); if (!hash) throw gErreurRevision(rev); continue; }
		x = [x[0], x[2], x[3], undefined];
		if (x[3] !== undefined){ hash = gPeler(R, hash, x[3] || "commit"); if (!hash) throw gErreurRevision(rev); continue; }
		hash = gPeler(R, hash, "commit");
		var nombre = x[2] === "" ? 1 : +x[2];
		if (x[1] === "~"){
			for (var k = 0; k < nombre; k++){
				var cm = gCommit(R, hash);
				if (!cm || !cm.parents.length) throw gErreurRevision(rev);
				hash = cm.parents[0];
			}
		} else {
			if (nombre === 0) continue;
			var cc = gCommit(R, hash);
			if (!cc || cc.parents.length < nombre) throw gErreurRevision(rev);
			hash = cc.parents[nombre - 1];
		}
	}
	if (options.commit){
		var pe = gPeler(R, hash, "commit");
		var o = gObjet(R, pe);
		if (!o || o.t !== "commit") throw new GitErreur("error: object " + hash + " is a " + (o ? o.t : "missing object") + ", not a commit\nfatal: Not a valid object name " + rev, 128);
		return pe;
	}
	return hash;
}
function gSousArbre(R, arbre, chemin){
	var m = chemin.replace(/\/$/, "").split("/"), h = arbre;
	for (var i = 0; i < m.length; i++){
		var o = gObjet(R, h);
		if (!o || o.t !== "tree") return null;
		var e = o.c.filter(function(x){ return x[1] === m[i]; })[0];
		if (!e) return null;
		h = e[2];
	}
	return gObjet(R, h) && gObjet(R, h).t === "tree" ? h : null;
}
/* Essai sans erreur : le hash, ou null. */
function gEssayer(R, rev, options){ try { return gResoudre(R, rev, options); } catch (e){ if (e instanceof GitErreur) return null; throw e; } }
/* La n-ième branche quittée (pour @{-1} et git switch -). */
function gBrancheAvant(R, n){
	var l = gReflogLire(R, "HEAD"), k = 0;
	for (var i = 0; i < l.length; i++){
		var m = /^checkout: moving from (\S+) to \S+$/.exec(l[i].message);
		if (m){ k++; if (k === n) return m[1]; }
	}
	return null;
}
/* La branche amont configurée d'une branche locale : refs/remotes/origin/main, ou null. */
function gAmont(R, branche){
	var remote = gConfig(R, "branch." + branche + ".remote"), merge = gConfig(R, "branch." + branche + ".merge");
	if (!remote || !merge) return null;
	if (remote === ".") return merge;
	return "refs/remotes/" + remote + "/" + merge.replace(/^refs\/heads\//, "");
}

/* ================================================================== */
/* L'historique                                                        */
/* ================================================================== */

/* Les ancêtres d'un ensemble de commits (eux compris) : { hash: true }. */
function gAncetres(R, departs){
	var vus = {}, pile = departs.slice();
	while (pile.length){
		var h = pile.pop();
		if (!h || vus[h]) continue;
		vus[h] = true;
		var c = gCommit(R, h);
		if (c) c.parents.forEach(function(p){ if (!vus[p]) pile.push(p); });
	}
	return vus;
}
function gEstAncetre(R, a, b){ if (!a || !b) return false; if (a === b) return true; return !!gAncetres(R, [b])[a]; }
/* Les bases de fusion de deux commits (les meilleurs ancêtres communs). */
function gBasesFusion(R, a, b){
	var A = gAncetres(R, [a]), B = gAncetres(R, [b]);
	var communs = Object.keys(A).filter(function(h){ return B[h]; });
	// Les meilleurs : ceux qui ne sont ancêtres d'aucun autre commun.
	var meilleurs = communs.filter(function(h){
		return !communs.some(function(o){ return o !== h && gAncetres(R, [o])[h]; });
	});
	meilleurs.sort(function(x, y){ return gCommit(R, y).commiteur.s - gCommit(R, x).commiteur.s; });
	return meilleurs;
}
function gBaseFusion(R, a, b){ var l = gBasesFusion(R, a, b); return l.length ? l[0] : null; }
/* Le parcours de git log : inclus (hash), exclus (hash) ; ordre par date de commit (ou topologique). */
function gParcours(R, inclus, exclus, options){
	options = options || {};
	var interdits = exclus && exclus.length ? gAncetres(R, exclus) : {};
	var vus = {}, file = [], sortie = [], seq = 0;
	function ajouter(h){
		if (!h || vus[h] || interdits[h]) return;
		var c = gCommit(R, h);
		if (!c) return;
		vus[h] = true;
		file.push({ h: h, s: c.commiteur.s, n: seq++ });
	}
	inclus.forEach(ajouter);
	while (file.length){
		// La date la plus récente d'abord ; à égalité, l'ordre d'arrivée.
		var meilleur = 0;
		for (var i = 1; i < file.length; i++){ if (file[i].s > file[meilleur].s || (file[i].s === file[meilleur].s && file[i].n < file[meilleur].n)) meilleur = i; }
		var x = file.splice(meilleur, 1)[0];
		sortie.push(x.h);
		var c = gCommit(R, x.h);
		var parents = options.premierParent ? c.parents.slice(0, 1) : c.parents;
		parents.forEach(ajouter);
	}
	if (options.topo) sortie = gOrdreTopo(R, sortie, options.premierParent);
	return sortie;
}
/* Ordre topologique (un enfant avant ses parents), en gardant au mieux l'ordre des dates, comme --topo-order. */
function gOrdreTopo(R, liste, premierParent){
	var dans = {}, enfants = {};
	liste.forEach(function(h){ dans[h] = true; enfants[h] = 0; });
	liste.forEach(function(h){ var c = gCommit(R, h); (premierParent ? c.parents.slice(0, 1) : c.parents).forEach(function(p){ if (dans[p]) enfants[p]++; }); });
	// Une pile (comme git) : on part des commits sans enfant, dans l'ordre des dates.
	var pile = liste.filter(function(h){ return enfants[h] === 0; }).reverse(), sortie = [], fait = {};
	while (pile.length){
		var h = pile.pop();
		if (fait[h]) continue;
		fait[h] = true;
		sortie.push(h);
		var c = gCommit(R, h), ps = (premierParent ? c.parents.slice(0, 1) : c.parents).filter(function(p){ return dans[p]; });
		// Comme le vrai (une pile) : les parents sont empilés dans l'ordre, le dernier parent ressort donc le premier.
		for (var i = 0; i < ps.length; i++){ enfants[ps[i]]--; if (enfants[ps[i]] === 0) pile.push(ps[i]); }
	}
	return sortie;
}

/* ================================================================== */
/* Les transports : un autre dépôt, local ou par ssh                    */
/* ================================================================== */

/* Analyse une URL : { type: "local"|"ssh", hote, chemin, utilisateur } ; null si illisible. */
function gAnalyserUrl(url){
	url = String(url || "");
	var m = /^ssh:\/\/(?:([^@\/]+)@)?([^\/:]+)(?::\d+)?(\/.*)$/.exec(url);
	if (m) return { type: "ssh", utilisateur: m[1] || null, hote: m[2], chemin: m[3] };
	m = /^file:\/\/(\/.*)$/.exec(url);
	if (m) return { type: "local", chemin: m[1] };
	m = /^(?:([^@\/:]+)@)?([A-Za-z0-9][A-Za-z0-9.-]*):(.*)$/.exec(url);
	if (m && url.indexOf("/") !== 0 && !/^[A-Za-z]:\\/.test(url)) return { type: "ssh", utilisateur: m[1] || null, hote: m[2], chemin: m[3] || "." };
	return { type: "local", chemin: url };
}
/* Le nom de la machine (les noms de domaine de l'île comptent : royaume.chronique.lan -> royaume). */
function gHoteMachine(nom){
	if (typeof HOTES === "undefined") return null;
	if (HOTES.hasOwnProperty(nom)) return nom;
	var court = String(nom).split(".")[0];
	if (HOTES.hasOwnProperty(court)) return court;
	for (var h in HOTES){ if (HOTES.hasOwnProperty(h) && HOTES[h] && HOTES[h].ip === nom) return h; }
	return null;
}
/* Les clés publiques du joueur côté client (sa Maison, sur l'île ; et la machine où il est). */
function gClesClient(lieu){
	var l = [];
	[gMaison(lieu), Home].forEach(function(m){
		if (!m) return;
		var d = m.getChildFromName(".ssh");
		if (d === -1 || !d) return;
		d.items.forEach(function(it){
			if (/\.pub$/.test(it.itemname)){
				var priv = d.getItemFromName(it.itemname.replace(/\.pub$/, ""));
				if (priv !== -1) l.push(gContenu(it).trim());
			}
		});
	});
	return l;
}
function gBlobCle(cle){ var m = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+|sk-ssh-ed25519@openssh.com)\s+(\S+)/.exec(String(cle).trim()); return m ? m[2] : null; }
/* Le joueur est-il autorisé par clé sur cette machine (sous ce compte) ? Le chapitre peut surcharger gitAccesSsh(h, utilisateur, cles). */
function gAccesSsh(h, utilisateur, lieu){
	var cles = gClesClient(lieu).map(gBlobCle).filter(Boolean);
	if (typeof gitAccesSsh === "function"){ var v = gitAccesSsh(h, utilisateur, cles); if (v === true || v === false) return v; }
	if (!cles.length) return false;
	var posees = [];
	var ak = typeof texteHote === "function" ? texteHote(h, "/home/" + utilisateur + "/.ssh/authorized_keys") : null;
	if (utilisateur === "root" && typeof texteHote === "function") ak = (ak || "") + "\n" + (texteHote(h, "/root/.ssh/authorized_keys") || "");
	if (ak) ak.split("\n").forEach(function(x){ var b = gBlobCle(x.replace(/^[^ ]*(?=ssh-|ecdsa-|sk-)/, "")); if (b) posees.push(b); });
	if (utilisateur === gJoueur() && typeof state !== "undefined" && state.reseau && state.reseau.cles && state.reseau.cles[h]){ var b2 = gBlobCle(state.reseau.cles[h]); if (b2) posees.push(b2); }
	return cles.some(function(k){ return posees.indexOf(k) > -1; });
}
/* Ouvre le dépôt désigné par une URL, vu depuis le dépôt R (ou un lieu). Lève les vraies erreurs de git. */
function gOuvrirDistant(R, url, lieu){
	var u = gAnalyserUrl(url);
	var depart = lieu || (R ? (R.top || R.git) : current_room);
	var noeud = null, affiche = url;
	if (u.type === "ssh"){
		var h = gHoteMachine(u.hote);
		if (!h) throw new GitErreur("ssh: Could not resolve hostname " + u.hote + ": Name or service not known\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
		var refus = HOTES[h] && HOTES[h].refus ? HOTES[h].refus() : null;
		if (refus) throw new GitErreur(String(refus).split("\n")[0] + "\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
		var qui = u.utilisateur || gJoueur();
		if (!gAccesSsh(h, qui, depart)) throw new GitErreur(qui + "@" + u.hote + ": Permission denied (publickey).\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
		var chemin = u.chemin;
		if (chemin.charAt(0) !== "/") chemin = "/home/" + qui + "/" + chemin;
		chemin = chemin.replace(/^\/~/, "/home/" + qui);
		noeud = typeof dossierHote === "function" ? dossierHote(h, chemin) : null;
		if (!noeud && !/\.git$/.test(chemin)) noeud = typeof dossierHote === "function" ? dossierHote(h, chemin + ".git") : null;
		if (!noeud) throw new GitErreur("fatal: '" + u.chemin + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
	} else {
		var r = gChemin(depart, u.chemin);
		noeud = r ? r.noeud : null;
		if (!(noeud instanceof Room) && !/\.git$/.test(u.chemin)){ var r2 = gChemin(depart, u.chemin + ".git"); if (r2 && r2.noeud instanceof Room) noeud = r2.noeud; }
		if (!(noeud instanceof Room)) throw new GitErreur("fatal: '" + url + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
	}
	var D;
	if (gEstDossierGit(noeud)) D = gDepotDe(noeud, gLire(noeud, "config") && /bare\s*=\s*true/i.test(gLire(noeud, "config")) ? null : (noeud.room_name === ".git" ? noeud.parents[0] : null));
	else { var g = noeud.getChildFromName(".git"); if (g !== -1 && gEstDossierGit(g)) D = gDepotDe(g, noeud); }
	if (!D) throw new GitErreur("fatal: '" + url + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
	D.url = url; D.ssh = u.type === "ssh"; D.affiche = affiche;
	return D;
}
/* Copie dans DST les objets atteignables depuis des commits de SRC qui manquent à DST ; renvoie leur nombre. */
function gCopierObjets(SRC, DST, departs, options){
	options = options || {};
	var aCopier = [], vus = {};
	function visiter(h){
		if (!h || vus[h]) return;
		vus[h] = true;
		if (gObjet(DST, h)) return;
		var o = gObjet(SRC, h);
		if (!o) return;
		aCopier.push([h, o]);
		if (o.t === "commit"){ var c = gCommit(SRC, h); visiter(c.arbre); c.parents.forEach(visiter); }
		else if (o.t === "tree") o.c.forEach(function(e){ visiter(e[2]); });
		else if (o.t === "tag"){ var m = /^object ([0-9a-f]{40})/m.exec(o.c); if (m) visiter(m[1]); }
	}
	departs.forEach(visiter);
	if (!aCopier.length) return 0;
	if (options.loose){ aCopier.forEach(function(x){ gObjetEcrire(DST, x[1].t, x[1].c); }); }
	else {
		var p = gPackNeuf(DST);
		aCopier.forEach(function(x){ p.gitPack.o[x[0]] = [x[1].t, x[1].c]; });
		gPackFermer(DST, p);
		DST.cache.objets = null;
		DST.abbrevPrefixes = null;
	}
	return aCopier.length;
}

/* ================================================================== */
/* Les signatures ssh des commits                                       */
/* ================================================================== */

/* L'empreinte SHA256: d'une clé, exactement comme ssh-keygen -lf du jeu. */
function gEmpreinteCle(cle){
	var blob = gBlobCle(cle) || String(cle);
	if (typeof empreinteSshPort === "function") return empreinteSshPort(blob);
	var hex = sha256(blob), o = "";
	for (var i = 0; i < 64; i += 2) o += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
	return "SHA256:" + btoa(o).replace(/=+$/, "");
}
/* La signature (le bloc SSH SIGNATURE) d'un contenu par une clé publique : la clé et l'empreinte du contenu y sont lisibles. */
function gSigner(contenu, cle, empreinte){
	var blob = gBlobCle(cle) || "";
	// L'empreinte imposée s'écrit avec ou sans le préfixe SHA256: ; on la garde telle quelle derrière ce préfixe.
	if (empreinte && !/^SHA256:/.test(empreinte)) empreinte = "SHA256:" + empreinte;
	var charge ="SSHSIG|" + blob + "|" + sha256(contenu).substring(0, 32) + (empreinte ? "|" + empreinte : "");
	var b = btoa(unescape(encodeURIComponent(charge)));
	var l = ["-----BEGIN SSH SIGNATURE-----"];
	for (var i = 0; i < b.length; i += 70) l.push(b.substring(i, i + 70));
	l.push("-----END SSH SIGNATURE-----");
	return l.join("\n");
}
/* Vérifie la signature d'un commit : { etat: "aucune"|"bonne"|"inconnue"|"fausse"|"sansFichier", cle, empreinte, principal } */
function gVerifierSignature(R, hash){
	var o = gObjet(R, hash);
	if (!o || o.t !== "commit") return { etat: "aucune" };
	var c = gAnalyserCommit(o.c);
	if (!c.gpgsig) return { etat: "aucune" };
	if (!/BEGIN SSH SIGNATURE/.test(c.gpgsig)) return { etat: "fausse" };
	var corps = c.gpgsig.split("\n").filter(function(l){ return !/-----/.test(l); }).join("");
	var charge = null;
	try { charge = decodeURIComponent(escape(atob(corps))); } catch (e){ return { etat: "fausse" }; }
	var m = /^SSHSIG\|([^|]*)\|([0-9a-f]+)(?:\|(SHA256:\S+))?$/.exec(charge);
	if (!m) return { etat: "fausse" };
	var sans = gTexteCommit({ arbre: c.arbre, parents: c.parents, auteur: c.auteur, commiteur: c.commiteur, message: c.message, gpgsig: null });
	var empreinte = m[3] || gEmpreinteCle("ssh-ed25519 " + m[1]);
	if (sha256(sans).substring(0, 32) !== m[2]) return { etat: "fausse", empreinte: empreinte, blob: m[1] };
	var fichier = gConfig(R, "gpg.ssh.allowedSignersFile");
	if (!fichier) return { etat: "sansFichier", empreinte: empreinte, blob: m[1] };
	var r = gChemin(R.top || R.git, fichier);
	if (!r || !(r.noeud instanceof Item)) return { etat: "sansFichier", empreinte: empreinte, blob: m[1], fichier: fichier };
	var principal = null;
	gContenu(r.noeud).split("\n").forEach(function(l){
		var x = /^(\S+)\s+(?:\S+=\S+\s+)*(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+)\s+(\S+)/.exec(l.trim());
		if (x && x[3] === m[1] && !principal) principal = x[1];
	});
	if (!principal) return { etat: "inconnue", empreinte: empreinte, blob: m[1] };
	return { etat: "bonne", empreinte: empreinte, principal: principal, blob: m[1], mail: c.commiteur.mail };
}
/* Les lignes que montre --show-signature pour un commit. */
function gTexteSignature(R, hash){
	var v = gVerifierSignature(R, hash);
	if (v.etat === "aucune") return [];
	if (v.etat === "sansFichier") return ["error: gpg.ssh.allowedSignersFile needs to be configured and exist for ssh signature verification"];
	if (v.etat === "fausse") return ["Could not verify signature."];
	if (v.etat === "inconnue") return ["Good \"git\" signature with ED25519 key " + v.empreinte, "No principal matched."];
	return ["Good \"git\" signature for " + v.principal + " with ED25519 key " + v.empreinte];
}

/* ================================================================== */
/* Créer un dépôt                                                      */
/* ================================================================== */

var GIT_HOOKS_EXEMPLES = ["applypatch-msg", "commit-msg", "fsmonitor-watchman", "post-update", "pre-applypatch", "pre-commit", "pre-merge-commit", "pre-push", "pre-rebase", "pre-receive", "prepare-commit-msg", "push-to-checkout", "sendemail-validate", "update"];
/* Pose la structure d'un dossier git sous un lieu (git init) ; renvoie R. */
function gInitialiser(lieu, nu, branche, options){
	options = options || {};
	var proprio = options.owner || gJoueur();
	var git = nu ? lieu : gNouveauDossier(lieu, ".git", proprio, "rwxr-xr-x");
	if (!nu) git.intro_text = "Le dossier .git : toute l'histoire du dépôt (objets, refs, index, reflog).";
	["objects/info", "objects/pack", "refs/heads", "refs/tags", "info", "hooks"].forEach(function(d){ gDossier(git, d, true, proprio); });
	gEcrire(git, "HEAD", "ref: refs/heads/" + branche + "\n", { owner: proprio });
	gEcrire(git, "config", "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = " + (nu ? "true" : "false") + "\n" + (nu ? "" : "\tlogallrefupdates = true\n"), { owner: proprio });
	gEcrire(git, "description", "Unnamed repository; edit this file 'description' to name the repository.\n", { owner: proprio });
	gEcrire(git, "info/exclude", "# git ls-files --others --exclude-from=.git/info/exclude\n# Lines that start with '#' are comments.\n# For a project mostly in C, the following would be a good set of\n# exclude patterns (uncomment them if you want to use them):\n# *.[oa]\n# *~\n", { owner: proprio });
	if (!options.sansHooks) GIT_HOOKS_EXEMPLES.forEach(function(h){
		gEcrire(git, "hooks/" + h + ".sample", "#!/bin/sh\n#\n# An example hook script (" + h + ").\n# To enable this hook, rename this file to \"" + h + "\".\n", { owner: proprio, mode: "rwxr-xr-x" });
	});
	return gDepotDe(git, nu ? null : lieu);
}

/* ================================================================== */
/* Le constructeur des scénarios (sans événement, sans XP, sans temps)   */
/* ================================================================== */

/*
 * g = gitConstructeur(h, chemin, { nu, branche, config: { "user.name": ... }, owner })
 *   h : la machine (null : l'île, chemin depuis la Maison, ~/... ou relatif).
 *   g.commit({ fichiers: { chemin: texte | null }, message, auteur: { nom, mail }, date (epoch s), commiteur, dateCommit, signer: { cle } , parents })  -> hash
 *     (fichiers : seulement les changements par rapport au commit courant ; null retire un fichier)
 *   g.branche(nom, depuis) ; g.basculer(nom) ; g.detacher(rev) ; g.fusion(branche, { message, auteur, date }) -> hash
 *   g.tag(nom, rev, { annote, message, auteur, date }) ; g.remote(nom, url) ; g.config(cle, valeur)
 *   g.supprimerBranche(nom) (le reflog de HEAD garde sa trace) ; g.resetDur(rev, message) (écrit le reflog comme reset --hard)
 *   g.extraire() : pose la copie de travail et l'index sur HEAD ; g.fin() : ferme le pack. g.R : le dépôt.
 */
function gitConstructeur(h, chemin, options){
	options = options || {};
	var lieu = null;
	if (h){
		lieu = typeof dossierHote === "function" ? dossierHote(h, chemin) : null;
		if (!lieu && typeof creerDossierHote === "function") lieu = creerDossierHote(h, chemin, { owner: options.owner || "root" });
	} else {
		var r = gChemin(Home, chemin);
		if (r && r.noeud instanceof Room) lieu = r.noeud;
		else {
			var m = String(chemin).replace(/^~\/?/, "").split("/").filter(Boolean);
			lieu = gDossier(Home, m.join("/"), true, options.owner || gJoueur());
		}
	}
	if (!lieu) throw new Error("gitConstructeur : impossible de poser " + chemin);
	var R = gTrouverDepotExact(lieu, !!options.nu) || gInitialiser(lieu, !!options.nu, options.branche || "main", { owner: options.owner, sansHooks: options.sansHooks });
	var pack = gPackNeuf(R);
	R.packCible = pack;
	var cfg = options.config || {};
	Object.keys(cfg).forEach(function(k){ gConfigLocalePoser(R, k, cfg[k]); });
	// L'horloge du constructeur : la dernière date donnée (sans date, dix minutes après la précédente).
	var horloge = options.date || null, BASE = 1760000000;
	var parDefaut = options.auteur || { nom: "Archiviste", mail: "archiviste@chronique.lan" };
	var g = { R: R, lieu: lieu };
	function quand(d){ if (d !== undefined && d !== null) { horloge = d; return d; } horloge = horloge === null ? BASE : horloge + 600; return horloge; }
	/* L'identité et la date des entrées de reflog posées par le constructeur. */
	var dernierAuteur = parDefaut;
	function rl(o){ o = o || {}; var a = o.auteur || dernierAuteur; return { id: { nom: a.nom, mail: a.mail }, quand: { s: o.date !== undefined && o.date !== null ? o.date : (horloge === null ? BASE : horloge), tz: GIT_FUSEAU } }; }
	function carteCourante(){ var t = gTete(R); return t ? gAplatir(R, gCommit(R, t).arbre) : {}; }
	function ecrireCommit(carte, parents, o){
		var arbre = gArbreDepuisCarte(R, carte);
		var d = quand(o.date);
		var a = o.auteur || parDefaut, cm = o.committer || o.commiteur || a;
		var dc = o.committer && o.committer.date !== undefined ? o.committer.date : (o.dateCommit || d);
		var cobj = { arbre: arbre, parents: parents, auteur: { nom: a.nom, mail: a.mail, s: d, tz: o.tz || GIT_FUSEAU }, commiteur: { nom: cm.nom, mail: cm.mail, s: dc, tz: o.tz || GIT_FUSEAU }, message: gNettoyerMessage(o.message || "Sans message") || "Sans message\n", gpgsig: null };
		if (o.signer && o.signer.cle) cobj.gpgsig = gSigner(gTexteCommit(cobj), o.signer.cle, o.signer.empreinte);
		return gObjetEcrire(R, "commit", gTexteCommit(cobj));
	}
	function ouvrir(){ if (!R.packCible) R.packCible = gPackNeuf(R); }
	g.commit = function(o){
		o = o || {};
		ouvrir();
		var carte = o.depuisRien ? {} : carteCourante();
		var f = o.fichiers || {};
		Object.keys(f).forEach(function(p){
			if (f[p] === null) delete carte[p];
			else {
				var v = f[p], mode = "100644", texte = v;
				if (typeof v === "object"){ texte = v.texte; mode = v.mode || (v.executable ? "100755" : "100644"); }
				carte[p] = { h: gObjetEcrire(R, "blob", String(texte)), m: mode };
			}
		});
		var tete = gTete(R);
		var parents = o.parents || (tete ? [tete] : []);
		var hash = ecrireCommit(carte, parents, o);
		var sujet = gSujet(o.message || "");
		if (o.auteur) dernierAuteur = o.auteur;
		var x = rl({ auteur: o.committer || o.commiteur || o.auteur, date: gCommit(R, hash).commiteur.s });
		gRefEcrire(R, "HEAD", hash, (tete ? "commit: " : "commit (initial): ") + sujet, { id: x.id, quand: x.quand });
		return hash;
	};
	g.branche = function(nom, depuis, o){ var h2 = depuis ? gResoudre(R, depuis, { commit: true }) : gTete(R); var x = rl(o); gRefEcrire(R, "refs/heads/" + nom, h2, "branch: Created from " + (depuis || "HEAD"), { sansHead: true, id: x.id, quand: x.quand }); return h2; };
	g.basculer = function(nom, o){
		var avant = gBrancheCourante(R) || gTete(R);
		var a = gTete(R);
		var cible = gRef(R, "refs/heads/" + nom);
		if (!cible){ g.branche(nom, null, o); cible = gTete(R); }
		gEcrire(R.git, "HEAD", "ref: refs/heads/" + nom + "\n");
		var x = rl(o);
		gReflogAjouter(R, "HEAD", a || cible, cible, "checkout: moving from " + avant + " to " + nom, x.id, x.quand);
	};
	g.detacher = function(rev, o){ var avant = gBrancheCourante(R) || gTete(R), hh = gResoudre(R, rev, { commit: true }); var a = gTete(R); gEcrire(R.git, "HEAD", hh + "\n"); var x = rl(o); gReflogAjouter(R, "HEAD", a, hh, "checkout: moving from " + avant + " to " + rev, x.id, x.quand); };
	g.resoudre = function(rev){ return gResoudre(R, rev); };
	g.fusion = function(branche, o){
		o = o || {};
		ouvrir();
		var a = gTete(R), b = gResoudre(R, branche, { commit: true });
		var base = gBaseFusion(R, a, b);
		var A = gAplatir(R, gCommit(R, a).arbre), B = gAplatir(R, gCommit(R, b).arbre), O = base ? gAplatir(R, gCommit(R, base).arbre) : {};
		var carte = {};
		var chemins = {}; [A, B, O].forEach(function(x){ Object.keys(x).forEach(function(p){ chemins[p] = true; }); });
		Object.keys(chemins).forEach(function(p){
			var oa = A[p], ob = B[p], oo = O[p];
			var r;
			if (o.resolutions && o.resolutions.hasOwnProperty(p)){ if (o.resolutions[p] !== null) carte[p] = { h: gObjetEcrire(R, "blob", o.resolutions[p]), m: "100644" }; return; }
			if (gMemeEntree(oa, ob)) r = oa; else if (gMemeEntree(oa, oo)) r = ob; else if (gMemeEntree(ob, oo)) r = oa;
			else if (oa && ob){
				var f = gFusionTexte(oo ? gObjet(R, oo.h).c : "", gObjet(R, oa.h).c, gObjet(R, ob.h).c, ["HEAD", branche, "base"], "merge");
				r = { h: gObjetEcrire(R, "blob", f.texte), m: oa.m };
			} else r = oa || ob;
			if (r) carte[p] = r;
		});
		var nomCourant = gBrancheCourante(R);
		var message = o.message || ("Merge branch '" + branche + "'" + (nomCourant && nomCourant !== "main" && nomCourant !== "master" ? " into " + nomCourant : ""));
		var hash = ecrireCommit(carte, [a, b], { message: message, auteur: o.auteur, date: o.date, signer: o.signer });
		var x = rl({ auteur: o.auteur, date: gCommit(R, hash).commiteur.s });
		gRefEcrire(R, "HEAD", hash, "merge " + branche + ": Merge made by the 'ort' strategy.", { id: x.id, quand: x.quand });
		return hash;
	};
	g.tag = function(nom, rev, o){
		o = o || {};
		ouvrir();
		var cible = rev ? gResoudre(R, rev) : gTete(R);
		if (o.annote || o.message){
			var a = o.auteur || parDefaut, d = quand(o.date);
			var t = "object " + cible + "\ntype " + gObjet(R, cible).t + "\ntag " + nom + "\ntagger " + a.nom + " <" + a.mail + "> " + d + " " + GIT_FUSEAU + "\n\n" + gNettoyerMessage(o.message || nom);
			cible = gObjetEcrire(R, "tag", t);
		}
		gEcrire(gCommun(R), "refs/tags/" + nom, cible + "\n");
		return cible;
	};
	g.remote = function(nom, url){ gConfigLocalePoser(R, "remote." + nom + ".url", url); gConfigLocalePoser(R, "remote." + nom + ".fetch", "+refs/heads/*:refs/remotes/" + nom + "/*"); };
	g.config = function(cle, valeur){ gConfigLocalePoser(R, cle, valeur); };
	g.supprimerBranche = function(nom){ gRefSupprimer(R, "refs/heads/" + nom); };
	// Déplace une branche de force (comme un push --force reçu par ce dépôt), avec sa trace dans le reflog.
	g.forcerRef = function(nom, rev, o){ var h2 = gResoudre(R, rev, { commit: true }); var x = rl(o); gRefEcrire(R, "refs/heads/" + nom, h2, "push: forced-update", { sansHead: true, id: x.id, quand: x.quand }); return h2; };
	g.resetDur = function(rev, o){
		if (typeof o === "string") o = { message: o };
		o = o || {};
		var hh = gResoudre(R, rev, { commit: true }); var a = gTete(R);
		if (o.date !== undefined) quand(o.date);
		gEcrire(R.git, "ORIG_HEAD", a + "\n");
		var x = rl(o);
		gRefEcrire(R, "HEAD", hh, o.message || "reset: moving to " + rev, { id: x.id, quand: x.quand });
	};
	/* Pousse une branche vers le dépôt nu de l'URL du remote (sans clé), et pose refs/remotes/REMOTE/BRANCHE et l'amont. */
	g.pousser = function(remote, branche){
		var url = gConfig(R, "remote." + remote + ".url");
		if (!url) throw new Error("g.pousser : remote inconnu " + remote);
		var u = gAnalyserUrl(url), D = null;
		if (u.type === "ssh"){ var hh = gHoteMachine(u.hote); var l = hh && typeof dossierHote === "function" ? dossierHote(hh, u.chemin.charAt(0) === "/" ? u.chemin : "/home/" + gJoueur() + "/" + u.chemin) : null; D = l ? gTrouverDepotExact(l, true) || gTrouverDepot(l) : null; }
		else { var r = gChemin(R.top || R.git, u.chemin); D = r && r.noeud instanceof Room ? (gTrouverDepotExact(r.noeud, true) || gTrouverDepot(r.noeud)) : null; }
		if (!D) throw new Error("g.pousser : pas de dépôt à " + url);
		g.fin();
		var b = branche || gBrancheCourante(R), hash = gRef(R, "refs/heads/" + b);
		gCopierObjets(R, D, [hash]);
		gEcrire(gCommun(D), "refs/heads/" + b, hash + "\n");
		D.cache = {};
		var x = rl();
		gRefEcrire(R, "refs/remotes/" + remote + "/" + b, hash, "update by push", { sansHead: true, id: x.id, quand: x.quand });
		g.amont(b, remote);
		return hash;
	};
	g.amont = function(branche, remote){ gConfigLocalePoser(R, "branch." + branche + ".remote", remote); gConfigLocalePoser(R, "branch." + branche + ".merge", "refs/heads/" + branche); };
	g.horloge = function(d){ if (d !== undefined) horloge = d; return horloge === null ? BASE : horloge; };
	g.extraire = function(){
		g.fin();
		if (R.nu) return g;
		var t = gTete(R), carte = t ? gAplatir(R, gCommit(R, t).arbre) : {};
		var avant = gFichiersTravail(R);
		Object.keys(avant).forEach(function(p){ if (!carte[p] && gIndexCarte(gIndex(R))[p]) gRetirerTravail(R, p); });
		Object.keys(carte).forEach(function(p){ gPoserTravail(R, p, carte[p].h, carte[p].m); });
		gIndexEcrire(R, Object.keys(carte).map(function(p){ return { p: p, h: carte[p].h, m: carte[p].m, s: 0 }; }));
		return g;
	};
	g.fin = function(){ if (R.packCible){ gPackFermer(R, R.packCible); R.packCible = null; R.cache = {}; } return g; };
	return g;
}
function gMemeEntree(a, b){ if (!a && !b) return true; if (!a || !b) return false; return a.h === b.h && a.m === b.m; }
/* Pose un fichier de la copie de travail dans l'index, sans événement (un git add silencieux, pour semer). */
function gitAjouterIndex(h, cheminDepot, cheminFichier){
	var R = gitDepot(h, cheminDepot);
	if (!R || !R.top) return false;
	var it = gItem(R.top, cheminFichier);
	var e = gIndex(R).filter(function(x){ return x.p !== cheminFichier; });
	if (it){ var hh = gObjetEcrire(R, "blob", gContenu(it)); e.push({ p: cheminFichier, h: hh, m: gModeItem(it), s: 0 }); }
	gIndexEcrire(R, e);
	return true;
}
/* Le dépôt posé exactement dans ce lieu (pas un parent). */
function gTrouverDepotExact(lieu, nu){
	if (nu) return gEstDossierGit(lieu) ? gDepotDe(lieu, null) : null;
	var d = lieu.getChildFromName(".git");
	return d !== -1 && d && gEstDossierGit(d) ? gDepotDe(d, lieu) : null;
}
/* Copie un dépôt vers un autre lieu, comme git clone (sans événement). */
function gitClonerDirect(h1, source, h2, destination, options){
	options = options || {};
	var S = gitDepot(h1, source);
	if (!S) throw new Error("gitClonerDirect : pas de dépôt à " + source);
	var g = gitConstructeur(h2, destination, { nu: !!options.nu, branche: gBrancheCourante(S) || "main", owner: options.owner, sansHooks: options.sansHooks });
	var D = g.R;
	g.fin();
	var refs = gRefs(S, "refs/heads/").concat(gRefs(S, "refs/tags/"));
	gCopierObjets(S, D, refs.map(function(r){ return r.hash; }).filter(Boolean));
	var url = options.url || (h1 ? h1 + ":" + source : source);
	if (options.nu){
		refs.forEach(function(r){ gEcrire(gCommun(D), r.nom, r.hash + "\n"); });
		gEcrire(D.git, "HEAD", "ref: refs/heads/" + (gBrancheCourante(S) || "main") + "\n");
	} else {
		gConfigLocalePoser(D, "remote.origin.url", url);
		gConfigLocalePoser(D, "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*");
		gRefs(S, "refs/heads/").forEach(function(r){ gEcrire(gCommun(D), "refs/remotes/origin/" + r.nom.substring(11), r.hash + "\n"); });
		gRefs(S, "refs/tags/").forEach(function(r){ gEcrire(gCommun(D), r.nom, r.hash + "\n"); });
		var b = gBrancheCourante(S) || "main", t = gRef(S, "refs/heads/" + b);
		gEcrire(gCommun(D), "refs/remotes/origin/HEAD", "ref: refs/remotes/origin/" + b + "\n");
		if (t){
			gRefEcrire(D, "refs/heads/" + b, t, "branch: Created from refs/remotes/origin/" + b, { sansHead: true });
			gEcrire(D.git, "HEAD", "ref: refs/heads/" + b + "\n");
			gReflogAjouter(D, "HEAD", GIT_VIDE, t, "clone: from " + url);
			gConfigLocalePoser(D, "branch." + b + ".remote", "origin");
			gConfigLocalePoser(D, "branch." + b + ".merge", "refs/heads/" + b);
		}
		g.extraire();
	}
	return D;
}
/* Pousse une ref d'un dépôt vers un autre (un PNJ qui pousse) : { force } ; renvoie vrai si la ref a bougé. */
function gitPousserDirect(h, depot, distant, ref, options){
	options = options || {};
	var S = gitDepot(h, depot), D = typeof distant === "string" ? (gitDepot(options.hoteDistant !== undefined ? options.hoteDistant : h, distant)) : distant;
	if (!S || !D) return false;
	var src = /^refs\//.test(ref) ? ref : "refs/heads/" + ref;
	var hash = gRef(S, src);
	if (!hash) return false;
	var actuel = gRef(D, src);
	if (actuel && !options.force && !gEstAncetre(S, actuel, hash)) return false;
	gCopierObjets(S, D, [hash]);
	gEcrire(gCommun(D), src, hash + "\n");
	D.cache = {};
	return true;
}

/* ================================================================== */
/* L'API de lecture pour le chapitre                                   */
/* ================================================================== */

function gLieuDepuis(h, chemin){
	if (h) return typeof dossierHote === "function" ? dossierHote(h, chemin) : null;
	var r = gChemin(Home, chemin);
	return r && r.noeud instanceof Room ? r.noeud : null;
}
function gitDepot(h, chemin){ var l = gLieuDepuis(h, chemin); return l ? gTrouverDepot(l) : null; }
function gAvecDepot(h, chemin, f, defaut){ try { var R = gitDepot(h, chemin); return R ? f(R) : defaut; } catch (e){ return defaut; } }
function gitResoudre(h, chemin, rev){ return gAvecDepot(h, chemin, function(R){ return gEssayer(R, rev); }, null); }
function gitCommitLu(h, chemin, hash){
	return gAvecDepot(h, chemin, function(R){
		var hh = gEssayer(R, hash, { commit: true });
		var c = hh ? gCommit(R, hh) : null;
		if (!c) return null;
		var v = gVerifierSignature(R, hh);
		return { hash: hh, arbre: c.arbre, parents: c.parents.slice(), auteur: c.auteur.nom, mail: c.auteur.mail, date: c.auteur.s, commiteur: c.commiteur.nom, dateCommit: c.commiteur.s, message: c.message, sujet: gSujet(c.message),
			signature: v.etat === "aucune" ? null : { etat: v.etat, cle: v.blob ? "ssh-ed25519 " + v.blob : null, empreinte: v.empreinte || null, principal: v.principal || null,
				verification: { bonne: "bonne", inconnue: "inconnue", fausse: "mauvaise", sansFichier: "sansFichier" }[v.etat] || v.etat } };
	}, null);
}
function gitHistorique(h, chemin, rev, options){
	options = options || {};
	return gAvecDepot(h, chemin, function(R){
		var departs = options.tous ? gRefs(R, "refs/").map(function(r){ return gPeler(R, r.hash, "commit"); }).filter(Boolean).concat(gTete(R) ? [gTete(R)] : []) : [gEssayer(R, rev || "HEAD", { commit: true })].filter(Boolean);
		return gParcours(R, departs, [], { premierParent: !!options.premierParent });
	}, []);
}
function gitBranches(h, chemin){ return gAvecDepot(h, chemin, function(R){ var o = {}; gRefs(R, "refs/heads/").forEach(function(r){ o[r.nom.substring(11)] = r.hash; }); return o; }, {}); }
function gitTags(h, chemin){ return gAvecDepot(h, chemin, function(R){ var o = {}; gRefs(R, "refs/tags/").forEach(function(r){ o[r.nom.substring(10)] = r.hash; }); return o; }, {}); }
function gitStatut(h, chemin){ return gAvecDepot(h, chemin, function(R){ return gEtatDepot(R); }, null); }
function gitFichierA(h, chemin, rev, fichier){
	return gAvecDepot(h, chemin, function(R){ var c = gEssayer(R, rev, { commit: true }); if (!c) return null; var e = gAplatir(R, gCommit(R, c).arbre)[fichier]; return e ? gObjet(R, e.h).c : null; }, null);
}
function gitEstAncetre(h, chemin, a, b){ return gAvecDepot(h, chemin, function(R){ var x = gEssayer(R, a, { commit: true }), y = gEssayer(R, b, { commit: true }); return !!x && !!y && gEstAncetre(R, x, y); }, false); }
function gitReflog(h, chemin, ref){
	return gAvecDepot(h, chemin, function(R){
		var nom = !ref || ref === "HEAD" ? "HEAD" : (gNomRef(R, ref) || "refs/heads/" + ref);
		return gReflogLire(R, nom).map(function(e){ return { ancien: e.ancien, nouveau: e.nouveau, message: e.message, date: e.s }; });
	}, []);
}
function gitIgnore(h, chemin, fichier){ return gAvecDepot(h, chemin, function(R){ return !!gJugeIgnore(R)(fichier, false); }, false); }
function gitDiffTexte(h, chemin, a, b){
	return gAvecDepot(h, chemin, function(R){
		var x = gResoudre(R, a, { commit: true }), y = gResoudre(R, b, { commit: true });
		return gComparerCartes(gAplatir(R, gCommit(R, x).arbre), gAplatir(R, gCommit(R, y).arbre)).map(function(c){ return gDiffFichier(R, c.chemin, c.a, c.b); }).join("\n");
	}, "");
}
function gitConfigLue(h, chemin, cle){ return gAvecDepot(h, chemin, function(R){ return gConfig(R, cle); }, null); }

/* L'état du dépôt (pour status et pour le chapitre). */
function gEtatDepot(R){
	var idx = gIndex(R), carteIdx = gIndexCarte(idx), conflitsIdx = gConflitsIndex(idx);
	var tete = gTete(R), carteTete = tete ? gAplatir(R, gCommit(R, tete).arbre) : {};
	var indexees = [], modifiees = [], nonSuivies = [], conflits = Object.keys(conflitsIdx).sort();
	gComparerCartes(carteTete, carteIdx).forEach(function(c){ if (!conflitsIdx[c.chemin]) indexees.push({ chemin: c.chemin, etat: !c.a ? "A" : !c.b ? "D" : "M" }); });
	var travail = R.top ? gFichiersTravail(R) : {};
	Object.keys(carteIdx).sort().forEach(function(p){
		var it = travail[p];
		if (!it) modifiees.push({ chemin: p, etat: "D" });
		else if (gHashTravail(R, it) !== carteIdx[p].h || gModeItem(it) !== carteIdx[p].m) modifiees.push({ chemin: p, etat: "M" });
	});
	if (R.top){
		var juge = gJugeIgnore(R);
		Object.keys(travail).sort().forEach(function(p){ if (!carteIdx[p] && !conflitsIdx[p] && !juge(p, false)) nonSuivies.push(p); });
	}
	var etat = null;
	if (gItem(R.git, "rebase-merge/head-name") || gDossier(R.git, "rebase-apply", false)) etat = "rebase";
	else if (gRefBrute(R, "MERGE_HEAD")) etat = "fusion";
	else if (gRefBrute(R, "CHERRY_PICK_HEAD")) etat = "cherry-pick";
	else if (gRefBrute(R, "REVERT_HEAD")) etat = "revert";
	else if (gItem(R.git, "BISECT_START")) etat = "bisect";
	return { branche: gBrancheCourante(R), detache: !gSymbolique(R, "HEAD"), tete: tete, indexees: indexees, modifiees: modifiees, nonSuivies: nonSuivies, conflits: conflits, etat: etat };
}
