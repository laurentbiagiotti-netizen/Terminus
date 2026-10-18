/**
 * SortsPort.js : le moteur des conteneurs du Grand Port (chapitre 8 pour le joueur, numéro interne 9), première partie.
 *
 * Le Grand Port de Port-Aube a ses machines (GrandPort.js) : docks, entrepot, navire1 à navire3, douane, chaloupe,
 * cabine. Sur chacune, un démon docker modélisé : images faites de couches, conteneurs qui vivent (processus, journaux,
 * santé, redémarrages, mémoire), volumes posés sur le vrai disque (/var/lib/docker/volumes/NOM/_data), réseaux et
 * résolution des noms. Tout est lu sur l'état réel au moment de la commande et changé comme le ferait le vrai outil.
 *
 * Cette première partie : les constantes, l'état par machine, les formats (tailles « 47.9MB », durées « About an
 * hour », tableaux, gabarits Go de --format), le registre du continent (les images de base et leurs couches), les
 * images (références, tags, digests, pull), les réseaux et les volumes, les conteneurs (création, démarrage, arrêt,
 * programmes, santé, politiques de redémarrage, mémoire, journaux), les événements et le tic des machines.
 *
 * Les autres parties : SortsPortShell.js (le système de fichiers d'un conteneur, son petit shell, les sessions -it,
 * les programmes, curl et les noms), SortsPortCli.js (la commande docker), SortsPortBuild.js (Dockerfile et cache),
 * SortsPortCompose.js (docker compose), SortsPortSwarm.js (l'escadre), SortsPortAnnexes.js (podman, unshare, nsenter,
 * lsns, ip netns, skopeo, buildx, manifest, hadolint, systemd-nspawn, machinectl).
 *
 * --- Ce que le monde (Chapitre8.js, Port.js) peut appeler pour valider sur l'état réel ---
 *   etatPort(h)                         l'état docker d'une machine (images, conteneurs, volumes, réseaux, événements...)
 *   conteneursPort(h)                   la liste des conteneurs ; conteneurPort(h, nomOuId) un seul (ou null)
 *   enMarchePort(c)                     vrai si le conteneur tourne ; santePort(c) "healthy" | "unhealthy" | "starting" | null
 *   imagePort(h, ref)                   l'image désignée (tag, id court, digest) ou null ; imagesPort(h) toutes
 *   tagsPort(h, image) / digestsPort(image) / tailleImagePort(h, image)
 *   coucheContientPort(h, image, chemin) { id, index, cmd } de la couche qui a posé ce chemin, ou null ;
 *   fichiersImagePort(h, image) les chemins de l'image (SortsPortShell.js)
 *   volumePort(h, nom) ; reseauPort(h, nom) ; evenementsPort(h, filtre)
 *   lireFichierConteneurPort(h, c, chemin)  le texte d'un fichier vu depuis le conteneur (couches, montages)
 *   requetePort(depuisHote, hoteCible, port, chemin) { code, corps } une requête HTTP comme curl la ferait
 * Les événements GameEvents : { type: "port", hote, cmd, ... } pour chaque action du moteur (voir evenementPort).
 */

/* ================================================================== */
/* Les machines et l'ouverture                                         */
/* ================================================================== */

var DOMAINE_PORT = "port-aube.lan";
var IP_PORT = { docks: "10.0.80.10", entrepot: "10.0.80.20", navire1: "10.0.80.31", navire2: "10.0.80.32", navire3: "10.0.80.33",
	douane: "10.0.80.40", chaloupe: "10.0.80.51", cabine: "10.0.80.52" };
var HOTES_PORT = ["docks", "entrepot", "navire1", "navire2", "navire3", "douane", "chaloupe", "cabine"];
/* Les machines qui ont un démon docker (la chaloupe a podman, la cabine systemd-nspawn). */
var HOTES_DOCKER_PORT = ["docks", "entrepot", "navire1", "navire2", "navire3", "douane"];
var REGISTRE_CONTINENT_PORT = "continent.lan";
var REGISTRE_ENTREPOT_PORT = "entrepot.port-aube.lan:5000";
var VERSION_DOCKER_PORT = "26.1.5+dfsg1", API_DOCKER_PORT = "1.45", GO_DOCKER_PORT = "go1.22.6";
var VERSION_CONTAINERD_PORT = "1.7.20~ds1", VERSION_RUNC_PORT = "1.1.15+ds1", VERSION_COMPOSE_PORT = "2.26.1", VERSION_BUILDX_PORT = "0.13.1+ds1";
var NOYAU_PORT = "6.12.9-amd64";
var SOCKET_DOCKER_PORT = "unix:///var/run/docker.sock";

function grandPortOuvert(){
	return typeof state !== "undefined" && state && state.has && state.has("ch8Ouvert") && !(typeof examenEnCours === "function" && examenEnCours());
}
function estHotePort(h){ return HOTES_PORT.indexOf(h) > -1 && typeof estMachine === "function" && estMachine(h); }
function estHoteDockerPort(h){ return HOTES_DOCKER_PORT.indexOf(h) > -1 && estHotePort(h); }
/* La chaloupe n'a pas de démon : podman y lance les conteneurs (le même moteur, sans démon, sans root). */
var HOTE_PODMAN_PORT = "chaloupe";
var MODE_PODMAN_PORT = false;
function aDesConteneursPort(h){ return estHoteDockerPort(h) || (h === HOTE_PODMAN_PORT && estHotePort(h)); }
function portIci(){ var h = Shell.hote(); return estHotePort(h) ? h : null; }
function ipPort(h){ return IP_PORT[h] || (HOTES[h] && HOTES[h].ip) || null; }
function hoteDeIpPort(ip){ for (var h in IP_PORT) if (IP_PORT.hasOwnProperty(h) && IP_PORT[h] === ip) return h; return null; }
/* Un nom de machine tel qu'on le tape (court, complet, avec point final, une adresse). */
function resoudreHotePort(nom, depuis){
	if (!nom) return null;
	var n = String(nom).toLowerCase().replace(/\.$/, "");
	if (n === "localhost" || n === "127.0.0.1" || n === "::1") return depuis || Shell.hote();
	if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) return hoteDeIpPort(n);
	var court = n.replace(/\.port-aube\.lan$/, "");
	return IP_PORT.hasOwnProperty(court) ? court : null;
}

/* L'état docker d'une machine : dans etatMachine(h).port, sauvegardé avec la partie. */
function etatPort(h){
	var M = etatMachine(h);
	if (!M.port || typeof M.port !== "object") M.port = {};
	var P = M.port;
	["images", "couches", "conteneurs", "volumes", "reseaux", "cache", "ips", "sessions", "execs"].forEach(function(k){ if (!P[k] || typeof P[k] !== "object") P[k] = {}; });
	if (!Array.isArray(P.evenements)) P.evenements = [];
	if (!Array.isArray(P.builds)) P.builds = [];
	if (!P.compteur) P.compteur = 0;
	if (!P.daemon || typeof P.daemon !== "object") P.daemon = { config: {}, charge: 0 };
	if (!P.reseauxPrets){ P.reseauxPrets = true; reseauxParDefautPort(h, P); }
	return P;
}
function compteurPort(h){ var P = etatPort(h); P.compteur++; return P.compteur; }
/* Des identifiants hexadécimaux stables. */
function idPort(graine){ return hexDe("port:" + graine, 64); }
function courtPort(id){ return String(id || "").replace(/^sha256:/, "").substring(0, 12); }
function evenementPort(h, cmd, infos){
	var e = { type: "port", hote: h, cmd: cmd };
	for (var k in (infos || {})) if (infos.hasOwnProperty(k)) e[k === "type" ? "typeInfo" : (k === "cmd" ? "commande" : k)] = infos[k];   /* « cmd » nomme l'événement : la commande lancée devient « commande » */
	try { GameEvents.fire(e); } catch (x){}
	return e;
}
function maintenantPort(h){ return maintenantMachine(h || "docks"); }

/* ================================================================== */
/* Les formats de docker                                                */
/* ================================================================== */

/* Une taille en unités de 1000, trois chiffres significatifs, comme go-units : 7.8MB, 187MB, 13.3kB, 0B. */
function tailleDockerPort(o){
	o = Math.max(0, +o || 0);
	var u = ["B", "kB", "MB", "GB", "TB"], i = 0;
	while (o >= 1000 && i < u.length - 1){ o /= 1000; i++; }
	var t = o >= 100 ? String(Math.round(o)) : (o >= 10 ? (Math.round(o * 10) / 10).toString() : (Math.round(o * 100) / 100).toString());
	if (i === 0) t = String(Math.round(o));
	return t + u[i];
}
/* En unités de 1024 (docker stats) : 3.828MiB, 1.95GiB. */
function tailleBinPort(o){
	o = Math.max(0, +o || 0);
	var u = ["B", "KiB", "MiB", "GiB", "TiB"], i = 0;
	while (o >= 1024 && i < u.length - 1){ o /= 1024; i++; }
	if (i === 0) return Math.round(o) + "B";
	return (o >= 100 ? o.toFixed(1) : (o >= 10 ? o.toFixed(2) : o.toFixed(3))).replace(/\.?0+$/, function(z){ return z.charAt(0) === "." && z.length > 1 ? "" : z; }) + u[i];
}
/* Une durée humaine (go-units HumanDuration). */
function dureeDockerPort(ms){
	var s = Math.round(Math.max(0, ms) / 1000);
	if (s < 1) return "Less than a second";
	if (s === 1) return "1 second";
	if (s < 60) return s + " seconds";
	var m = Math.round(s / 60);
	if (m === 1) return "About a minute";
	if (m < 60) return m + " minutes";
	var h = Math.round(s / 3600);
	if (h === 1) return "About an hour";
	if (h < 48) return h + " hours";
	if (h < 24 * 7 * 2) return Math.round(h / 24) + " days";
	if (h < 24 * 30 * 2) return Math.round(h / 24 / 7) + " weeks";
	if (h < 24 * 365 * 2) return Math.round(h / 24 / 30) + " months";
	return Math.round(h / 24 / 365) + " years";
}
function ilYaPort(h, ms){ return dureeDockerPort(maintenantPort(h) - ms) + " ago"; }
/* 2026-10-18T07:12:03.123456789Z : l'instant en UTC, comme docker inspect. */
function dateIsoPort(ms){
	var d = new Date(ms - DECALAGE_HISTOIRE * 3600000);
	var p = function(n, l){ n = String(n); while (n.length < (l || 2)) n = "0" + n; return n; };
	return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + "." + p(d.getMilliseconds(), 3) + p(condense(String(ms)) % 1000000, 6) + "Z";
}
/* 2026-10-18 09:12:03 +0200 CEST : l'heure locale de la machine (docker ps --format {{.CreatedAt}}). */
function dateLocalePort(h, ms){
	var d = dateMachine(h, ms);
	return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + texteDecalage(h) + " " + abregeFuseau(h);
}
/* 2026-10-18T09:12:03.000000000+02:00 (docker events). */
function dateEvenementPort(h, ms){
	var d = dateMachine(h, ms), dec = texteDecalage(h);
	return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + "T" + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + "." + ("000000000" + (condense("ev" + ms) % 1000000000)).slice(-9) + dec.substring(0, 3) + ":" + dec.substring(3);
}
/* « 10m », « 1h30m », « 2026-10-18T08:00:00 », un nombre de secondes depuis l'époque : un instant (ou null). */
function lireInstantPort(h, texte){
	if (texte === undefined || texte === null || texte === "") return null;
	var t = String(texte), m, maintenant = maintenantPort(h);
	if ((m = /^(\d+h)?(\d+m)?(\d+s)?$/.exec(t)) && t !== ""){
		var ms = 0;
		if (m[1]) ms += parseInt(m[1], 10) * 3600000;
		if (m[2]) ms += parseInt(m[2], 10) * 60000;
		if (m[3]) ms += parseInt(m[3], 10) * 1000;
		return maintenant - ms;
	}
	if (/^\d{9,}(\.\d+)?$/.test(t)) return Math.round(parseFloat(t) * 1000);
	if ((m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d))?)?/.exec(t))){
		var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
		return d.getTime() + (DECALAGE_HISTOIRE - decalageFuseau(fuseauMachine(h))) * 3600000;
	}
	return NaN;
}
/* Un tableau comme le tabwriter de docker : colonnes d'au moins 10, trois espaces entre elles. */
function tableauPort(entetes, lignes){
	var toutes = [entetes].concat(lignes);
	var n = entetes.length, larg = [];
	for (var i = 0; i < n - 1; i++){
		var max = 0;
		toutes.forEach(function(l){ max = Math.max(max, String(l[i] === undefined ? "" : l[i]).length); });
		larg.push(Math.max(10, max + 3));
	}
	return toutes.map(function(l){
		var s = "";
		for (var k = 0; k < n; k++){
			var v = String(l[k] === undefined ? "" : l[k]);
			s += k < n - 1 ? completerDroite(v, larg[k]) : v;
		}
		return s.replace(/\s+$/, "");
	}).join("\n");
}
/* Un tableau sans largeur minimale (docker stats, docker node ls...) : deux ou trois espaces. */
function tableauSerrePort(entetes, lignes, ecart){
	var toutes = [entetes].concat(lignes), n = entetes.length, larg = [];
	for (var i = 0; i < n - 1; i++){
		var max = 0;
		toutes.forEach(function(l){ max = Math.max(max, String(l[i] === undefined ? "" : l[i]).length); });
		larg.push(max + (ecart || 3));
	}
	return toutes.map(function(l){
		var s = "";
		for (var k = 0; k < n; k++){ var v = String(l[k] === undefined ? "" : l[k]); s += k < n - 1 ? completerDroite(v, larg[k]) : v; }
		return s.replace(/\s+$/, "");
	}).join("\n");
}
/* La sortie JSON de docker inspect : quatre espaces, les clés dans leur ordre. */
function jsonDockerPort(o){ return JSON.stringify(o, null, 4); }
/* Le JSON compact de Go ({{json .X}}) : <, > et & échappés comme encoding/json. */
function jsonGoPort(o){
	if (o === undefined) return "null";
	return JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function octetsPort(texte){ return versOctetsUtf8(String(texte || "")).length; }

/* ================================================================== */
/* Les gabarits Go (--format) : {{.Champ}}, json, index, range, if...   */
/* ================================================================== */

/* Les clés dont la valeur est une table (map) dans les structures de docker : {{.Config.Labels.x}} y lit une entrée. */
var CLES_TABLES_PORT = ["Labels", "Networks", "ExposedPorts", "Volumes", "Ports", "Tmpfs", "Options", "Containers", "DriverOpts", "Config", "Data", "PortBindings", "Sysctls", "Annotations"];
function ErreurGabaritPort(message){ this.message = message; }
function analyserGabaritPort(texte){
	var morceaux = [], i = 0;
	while (i < texte.length){
		var a = texte.indexOf("{{", i);
		if (a === -1){ morceaux.push({ t: "texte", v: texte.substring(i) }); break; }
		if (a > i) morceaux.push({ t: "texte", v: texte.substring(i, a) });
		var b = texte.indexOf("}}", a + 2);
		if (b === -1) throw new ErreurGabaritPort("template parsing error: template: :1: unclosed action");
		var action = texte.substring(a + 2, b);
		var gauche = /^-\s/.test(action), droite = /\s-$/.test(action);
		action = action.replace(/^-\s/, "").replace(/\s-$/, "").trim();
		if (gauche && morceaux.length && morceaux[morceaux.length - 1].t === "texte") morceaux[morceaux.length - 1].v = morceaux[morceaux.length - 1].v.replace(/\s+$/, "");
		morceaux.push({ t: "action", v: action, droite: droite });
		i = b + 2;
		if (droite){ var reste = /^\s*/.exec(texte.substring(i)); i += reste[0].length; }
	}
	// L'arbre : range, if, with, else, end.
	var pos = 0;
	function bloc(fin){
		var noeuds = [];
		while (pos < morceaux.length){
			var m = morceaux[pos];
			if (m.t === "texte"){ noeuds.push(m); pos++; continue; }
			var mot = m.v.split(/\s+/)[0];
			if (mot === "end" || mot === "else"){ if (!fin) throw new ErreurGabaritPort("template parsing error: template: :1: unexpected {{" + mot + "}}"); return noeuds; }
			pos++;
			if (mot === "range" || mot === "if" || mot === "with"){
				var n = { t: mot, expr: m.v.substring(mot.length).trim(), corps: bloc(true), sinon: null };
				if (pos < morceaux.length && morceaux[pos].v.split(/\s+/)[0] === "else"){
					var e = morceaux[pos].v; pos++;
					if (/^else\s+if\s/.test(e)){ n.sinon = [{ t: "if", expr: e.replace(/^else\s+if\s+/, ""), corps: bloc(true), sinon: null }]; var s2 = n.sinon[0]; if (pos < morceaux.length && morceaux[pos].v === "else"){ pos++; s2.sinon = bloc(true); } }
					else n.sinon = bloc(true);
				}
				if (pos >= morceaux.length || morceaux[pos].v !== "end") throw new ErreurGabaritPort("template parsing error: template: :1: unexpected EOF");
				pos++;
				noeuds.push(n);
				continue;
			}
			noeuds.push({ t: "expr", expr: m.v });
		}
		if (fin) throw new ErreurGabaritPort("template parsing error: template: :1: unexpected EOF");
		return noeuds;
	}
	return bloc(false);
}
function jetonsExprPort(expr){
	var j = [], i = 0;
	while (i < expr.length){
		var c = expr.charAt(i);
		if (/\s/.test(c)){ i++; continue; }
		if (c === "|"){ j.push({ t: "|" }); i++; continue; }
		if (c === "(" || c === ")"){ j.push({ t: c }); i++; continue; }
		if (c === "\"" || c === "`"){
			var k = i + 1, s = "";
			while (k < expr.length && expr.charAt(k) !== c){ if (c === "\"" && expr.charAt(k) === "\\" && k + 1 < expr.length){ var n = expr.charAt(k + 1); s += n === "n" ? "\n" : (n === "t" ? "\t" : n); k += 2; continue; } s += expr.charAt(k); k++; }
			j.push({ t: "str", v: s }); i = k + 1; continue;
		}
		var m = /^[^\s|()]+/.exec(expr.substring(i));
		j.push({ t: "mot", v: m[0] }); i += m[0].length;
	}
	return j;
}
function valeurChampPort(obj, chemin, racine, variables){
	if (chemin === ".") return obj;
	var v = obj, parts;
	if (chemin.charAt(0) === "$"){
		var nomVar = /^\$\w*/.exec(chemin)[0];
		v = nomVar === "$" ? racine : variables[nomVar];
		chemin = chemin.substring(nomVar.length);
		if (!chemin) return v;
	}
	parts = chemin.split(".").filter(Boolean);
	for (var i = 0; i < parts.length; i++){
		var p = parts[i];
		if (v === null || v === undefined) return undefined;
		if (typeof v !== "object" || Array.isArray(v)){
			throw new ErreurGabaritPort("template: :1:" + (2 + i) + ": executing \"\" at <." + parts.slice(0, i + 1).join(".") + ">: can't evaluate field " + p + " in type " + (Array.isArray(v) ? "[]string" : typeof v === "string" ? "string" : "interface {}"));
		}
		if (v.__table){ v = v[p]; continue; }
		if (!v.hasOwnProperty(p)){
			if (v.__type) throw new ErreurGabaritPort("template: :1:" + (3 + i) + ": executing \"\" at <." + parts.slice(0, i + 1).join(".") + ">: can't evaluate field " + p + " in type " + v.__type);
			return undefined;
		}
		v = v[p];
	}
	return v;
}
/* Comment Go affiche une valeur avec {{.X}} : map[a:b], [a b], {x y}, <nil>, <no value>. */
function texteGoPort(v, cle){
	if (v === undefined) return "<no value>";
	if (v === null) return cle && CLES_TABLES_PORT.indexOf(cle) > -1 ? "map[]" : (cle && /s$/.test(cle) ? "[]" : "<nil>");
	if (typeof v === "boolean" || typeof v === "number") return String(v);
	if (typeof v === "string") return v;
	if (Array.isArray(v)) return "[" + v.map(function(x){ return texteGoPort(x); }).join(" ") + "]";
	if (v.__table || (cle && CLES_TABLES_PORT.indexOf(cle) > -1)){
		return "map[" + Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).sort().map(function(k){ return k + ":" + texteGoPort(v[k]); }).join(" ") + "]";
	}
	return "{" + Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).map(function(k){ return texteGoPort(v[k], k); }).join(" ") + "}";
}
function sansMetaPort(v){
	if (v === null || typeof v !== "object") return v;
	if (Array.isArray(v)) return v.map(sansMetaPort);
	var o = {};
	Object.keys(v).forEach(function(k){ if (k.indexOf("__") !== 0) o[k] = sansMetaPort(v[k]); });
	return o;
}
var FONCTIONS_GABARIT_PORT = {
	json: function(a){ return jsonGoPort(sansMetaPort(a[0])); },
	index: function(a){ var v = a[0]; for (var i = 1; i < a.length; i++){ if (v === null || v === undefined) return undefined; v = v[a[i]]; } return v; },
	len: function(a){ var v = a[0]; if (v === null || v === undefined) return 0; if (typeof v === "string" || Array.isArray(v)) return v.length; return Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).length; },
	join: function(a){ return (a[0] || []).join(a[1] === undefined ? "" : a[1]); },
	split: function(a){ return String(a[0]).split(a[1]); },
	upper: function(a){ return String(texteGoPort(a[0])).toUpperCase(); },
	lower: function(a){ return String(texteGoPort(a[0])).toLowerCase(); },
	title: function(a){ return String(texteGoPort(a[0])).replace(/\b\w/g, function(x){ return x.toUpperCase(); }); },
	println: function(a){ return a.map(function(x){ return texteGoPort(x); }).join(" ") + "\n"; },
	print: function(a){ return a.map(function(x){ return texteGoPort(x); }).join(""); },
	printf: function(a){ var f = String(a[0]), k = 1; return f.replace(/%[sdvq%]/g, function(x){ if (x === "%%") return "%"; var v = a[k++]; return x === "%q" ? JSON.stringify(texteGoPort(v)) : texteGoPort(v); }); },
	eq: function(a){ for (var i = 1; i < a.length; i++) if (texteGoPort(a[0]) === texteGoPort(a[i])) return true; return false; },
	ne: function(a){ return texteGoPort(a[0]) !== texteGoPort(a[1]); },
	not: function(a){ return !vraiGoPort(a[0]); },
	and: function(a){ for (var i = 0; i < a.length; i++) if (!vraiGoPort(a[i])) return a[i]; return a[a.length - 1]; },
	or: function(a){ for (var i = 0; i < a.length; i++) if (vraiGoPort(a[i])) return a[i]; return a[a.length - 1]; },
	truncate: function(a){ return String(texteGoPort(a[0])).substring(0, +a[1]); },
	pad: function(a){ return completerDroite(String(texteGoPort(a[0])), +a[1] + String(texteGoPort(a[0])).length); }
};
function vraiGoPort(v){
	if (v === undefined || v === null || v === false || v === 0 || v === "") return false;
	if (Array.isArray(v)) return v.length > 0;
	if (typeof v === "object") return Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).length > 0;
	return true;
}
function evaluerExprPort(expr, point, racine, variables){
	var jetons = jetonsExprPort(expr), pos = 0;
	function operande(){
		var j = jetons[pos];
		if (!j) throw new ErreurGabaritPort("template parsing error: template: :1: missing value for command");
		if (j.t === "("){ pos++; var v = pipeline(); if (!jetons[pos] || jetons[pos].t !== ")") throw new ErreurGabaritPort("template parsing error: template: :1: unclosed left paren"); pos++; return { v: v }; }
		if (j.t === "str"){ pos++; return { v: j.v }; }
		if (j.t === "mot"){
			if (/^-?\d+(\.\d+)?$/.test(j.v)){ pos++; return { v: +j.v }; }
			if (j.v === "true" || j.v === "false"){ pos++; return { v: j.v === "true" }; }
			if (j.v === "nil"){ pos++; return { v: null }; }
			if (j.v.charAt(0) === "." || j.v.charAt(0) === "$"){ pos++; var cle = j.v.split(".").pop(); return { v: valeurChampPort(point, j.v, racine, variables), cle: cle }; }
			return null;
		}
		return null;
	}
	function commande(entree, avecEntree){
		var j = jetons[pos];
		if (j && j.t === "mot" && FONCTIONS_GABARIT_PORT.hasOwnProperty(j.v)){
			pos++;
			var args = [];
			while (pos < jetons.length && jetons[pos].t !== "|" && jetons[pos].t !== ")"){ var o = operande(); if (!o) throw new ErreurGabaritPort("template parsing error: template: :1: function \"" + jetons[pos].v + "\" not defined"); args.push(o.v); }
			if (avecEntree) args.push(entree);
			return { v: FONCTIONS_GABARIT_PORT[j.v](args) };
		}
		if (j && j.t === "mot" && !/^[.$\d"-]/.test(j.v) && j.v !== "true" && j.v !== "false" && j.v !== "nil") throw new ErreurGabaritPort("template parsing error: template: :1: function \"" + j.v + "\" not defined");
		var o2 = operande();
		if (!o2) throw new ErreurGabaritPort("template parsing error: template: :1: unexpected token");
		return o2;
	}
	function pipeline(){
		var r = commande(null, false);
		while (pos < jetons.length && jetons[pos].t === "|"){ pos++; r = commande(r.v, true); }
		return r.v === undefined && r.cle ? { __absent: true, cle: r.cle } : (r.cle ? { __val: r.v, cle: r.cle } : { __val: r.v });
	}
	// Une affectation : $x := .Champ
	var aff = /^(\$\w+)\s*:?=\s*(.*)$/.exec(expr);
	if (aff){ var r0 = evaluerExprPort(aff[2], point, racine, variables); variables[aff[1]] = r0.__val; return { __val: "", vide: true }; }
	var res = pipeline();
	if (pos < jetons.length) throw new ErreurGabaritPort("template parsing error: template: :1: unexpected \"" + (jetons[pos].v || jetons[pos].t) + "\" in operand");
	return res;
}
function valeurDePort(r){ return r.__absent ? undefined : (r.__val && r.__val.__val !== undefined ? r.__val.__val : r.__val); }
function executerGabaritPort(noeuds, point, racine, variables){
	var s = "";
	noeuds.forEach(function(n){
		if (n.t === "texte"){ s += n.v; return; }
		if (n.t === "expr"){
			var r = evaluerExprPort(n.expr, point, racine, variables);
			if (r.vide) return;
			s += texteGoPort(valeurDePort(r), r.cle);
			return;
		}
		var rr = evaluerExprPort(n.expr.replace(/^(\$\w+)\s*(,\s*\$\w+\s*)?:=\s*/, ""), point, racine, variables);
		var v = valeurDePort(rr);
		var noms = /^(\$\w+)\s*(?:,\s*(\$\w+)\s*)?:=/.exec(n.expr);
		if (n.t === "if"){ s += vraiGoPort(v) ? executerGabaritPort(n.corps, point, racine, variables) : (n.sinon ? executerGabaritPort(n.sinon, point, racine, variables) : ""); return; }
		if (n.t === "with"){ s += vraiGoPort(v) ? executerGabaritPort(n.corps, v, racine, variables) : (n.sinon ? executerGabaritPort(n.sinon, point, racine, variables) : ""); return; }
		if (n.t === "range"){
			var elements = [];
			if (Array.isArray(v)) elements = v.map(function(x, i){ return [i, x]; });
			else if (v && typeof v === "object") elements = Object.keys(v).filter(function(k){ return k.indexOf("__") !== 0; }).sort().map(function(k){ return [k, v[k]]; });
			if (!elements.length){ if (n.sinon) s += executerGabaritPort(n.sinon, point, racine, variables); return; }
			elements.forEach(function(e){
				if (noms){ if (noms[2]){ variables[noms[1]] = e[0]; variables[noms[2]] = e[1]; } else variables[noms[1]] = e[1]; }
				s += executerGabaritPort(n.corps, e[1], racine, variables);
			});
		}
	});
	return s;
}
/* Appliquer un --format à un objet. Lève une ShellError au texte de docker si le gabarit est faux. */
function gabaritPort(gabarit, objet){
	try {
		var arbre = analyserGabaritPort(String(gabarit).replace(/\\t/g, "\t").replace(/\\n/g, "\n"));
		return executerGabaritPort(arbre, objet, objet, { "$": objet });
	} catch (e){
		if (e instanceof ErreurGabaritPort) throw new ShellError(e.message, 1);
		throw e;
	}
}
/* --format "table {{.ID}}\t{{.Names}}" : l'en-tête vient des noms de champs. */
function formaterListePort(gabarit, objets, entetes){
	var g = String(gabarit);
	if (g === "json") return objets.map(function(o){ return jsonGoPort(sansMetaPort(o)); }).join("\n");
	var table = /^table\s*/.test(g);
	g = g.replace(/^table\s*/, "");
	var lignes = objets.map(function(o){ return gabaritPort(g, o); });
	if (!table) return lignes.join("\n");
	var titre = g.replace(/\{\{\s*\.(\w+)\s*\}\}/g, function(t, k){ return (entetes || {})[k] || k.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase(); }).replace(/\\t/g, "\t");
	var rangs = [titre].concat(lignes).map(function(l){ return l.split("\t"); });
	if (rangs.every(function(r){ return r.length === 1; })) return rangs.map(function(r){ return r[0]; }).join("\n");
	var n = Math.max.apply(null, rangs.map(function(r){ return r.length; }));
	rangs.forEach(function(r){ while (r.length < n) r.push(""); });
	return tableauPort(rangs[0], rangs.slice(1));
}

/* ================================================================== */
/* Le registre du continent : les couches et les images de base         */
/* ================================================================== */

/*
 * Une entrée de couche : { t: "f" | "d" | "l", m: "rwxr-xr-x", u: uid, g: gid, s: octets, c: texte, l: cible, x: programme }.
 * x dit ce que fait un exécutable (busybox, bash, python, nginx...) : voir PROGRAMMES_SHELL_PORT (SortsPortShell.js).
 * Une couche : { id (diff_id), taille, fichiers: { chemin: entrée }, supprimes: [chemins], cmd }.
 * Les couches de base vivent ici (COUCHES_PORT, pas dans la sauvegarde) ; les couches bâties dans etatPort(h).couches.
 * L'identifiant d'une couche est le sha256 de son texte (texteCouchePort) : après docker save et tar -xf,
 * sha256sum blobs/sha256/ID redonne bien ID, comme le vrai.
 */
var COUCHES_PORT = {};
var CATALOGUE_PORT = null;          // construit au premier usage (le chargement du jeu reste rapide)
var DATE_CATALOGUE_PORT = { alpine: "2024-09-06T22:20:07Z", busybox: "2024-09-26T21:31:42Z", hello: "2023-05-02T16:49:27Z", debian: "2024-09-26T00:00:00Z",
	python: "2024-10-01T18:08:43Z", nginx: "2024-10-02T17:55:35Z", postgres: "2024-09-30T20:10:12Z", redis: "2024-10-03T13:41:22Z", registry: "2023-10-02T18:42:59Z" };
var PATH_DEFAUT_PORT = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

function dPort(m, u, g){ return { t: "d", m: m || "rwxr-xr-x", u: u || 0, g: g || 0 }; }
function xPort(taille, prog, m, u, g){ return { t: "f", m: m || "rwxr-xr-x", u: u || 0, g: g || 0, s: taille, x: prog }; }
function tPort(texte, m, u, g){ return { t: "f", m: m || "rw-r--r--", u: u || 0, g: g || 0, s: octetsPort(texte), c: texte }; }
function lPort(cible){ return { t: "l", m: "rwxrwxrwx", u: 0, g: 0, s: cible.length, l: cible }; }
function bPort(taille, m){ return { t: "f", m: m || "rw-r--r--", u: 0, g: 0, s: taille }; }

/* Le texte d'une couche : la liste façon tar -tv, puis le contenu des fichiers texte. Son sha256 est le diff_id. */
function texteCouchePort(couche){
	var chemins = Object.keys(couche.fichiers || {}).sort();
	var l = chemins.map(function(p){
		var e = couche.fichiers[p];
		return (e.t === "d" ? "d" : (e.t === "l" ? "l" : "-")) + e.m + " " + e.u + "/" + e.g + " " + (e.t === "f" ? (e.s || 0) : 0) + " " + p.replace(/^\//, "") + (e.t === "d" ? "/" : "") + (e.l ? " -> " + e.l : "") + (e.x ? " [" + e.x + "]" : "");
	});
	(couche.supprimes || []).forEach(function(p){ l.push("---------- 0/0 0 " + dossierDe(p).replace(/^\//, "") + (dossierDe(p) === "/" ? "" : "/") + ".wh." + nomDe(p)); });
	var corps = chemins.filter(function(p){ return couche.fichiers[p].c !== undefined; }).map(function(p){ return "\n==> " + p + " <==\n" + couche.fichiers[p].c; }).join("");
	return l.join("\n") + "\n" + corps;
}
function enregistrerCouchePort(cle, cmd, taille, fichiers, supprimes){
	var c = { cle: cle, cmd: cmd, taille: taille, fichiers: fichiers || {}, supprimes: supprimes || [] };
	c.id = sha256(texteCouchePort(c));
	COUCHES_PORT[c.id] = c;
	return c;
}
/* Les applets de busybox : un seul binaire, des liens partout. */
var APPLETS_BUSYBOX_PORT = {
	"/bin": "arch ash base64 cat chgrp chmod chown cp date dd df dmesg echo egrep false fgrep getopt grep gunzip gzip hostname ionice kill link ln login ls lsattr mkdir mknod mktemp more mount mountpoint mv netstat nice pidof ping ping6 printenv ps pwd rev rm rmdir run-parts sed setpriv sh sleep stat stty su sync tar touch true umount uname usleep watch zcat",
	"/sbin": "arp blkid halt hwclock ifconfig ifdown ifup init ip ipaddr iplink iproute iprule ldconfig losetup lsmod mdev mkswap modprobe nologin poweroff reboot route swapoff swapon sysctl syslogd udhcpc",
	"/usr/bin": "[ [[ awk basename bc bunzip2 bzcat bzip2 cal cksum clear cmp comm cpio crontab cut dc diff dirname du env expand expr factor fallocate find flock fold free fuser getconf getent groups hd head hexdump hostid iconv id install ipcrm ipcs killall last less logger lsof md5sum mkfifo mkpasswd nc nl nohup nproc nsenter nslookup od paste patch pgrep pkill pmap printf pstree pwdx readlink realpath renice reset seq setsid sha1sum sha256sum sha512sum shred shuf sort split strings sum tac tail tee test time timeout top tr traceroute tree truncate tty uniq unlink unshare unxz unzip uptime uudecode uuencode vi wc wget which whoami xargs xxd xzcat yes",
	"/usr/sbin": "addgroup adduser arping brctl chpasswd chroot crond delgroup deluser killall5 ntpd partprobe rdate sendmail"
};
var PASSWD_ALPINE_PORT = "root:x:0:0:root:/root:/bin/sh\nbin:x:1:1:bin:/bin:/sbin/nologin\ndaemon:x:2:2:daemon:/sbin:/sbin/nologin\nlp:x:4:7:lp:/var/spool/lpd:/sbin/nologin\nsync:x:5:0:sync:/sbin:/bin/sync\n" +
	"shutdown:x:6:0:shutdown:/sbin:/sbin/shutdown\nhalt:x:7:0:halt:/sbin:/sbin/halt\nmail:x:8:12:mail:/var/mail:/sbin/nologin\nnews:x:9:13:news:/usr/lib/news:/sbin/nologin\n" +
	"uucp:x:10:14:uucp:/var/spool/uucppublic:/sbin/nologin\ncron:x:16:16:cron:/var/spool/cron:/sbin/nologin\nftp:x:21:21::/var/lib/ftp:/sbin/nologin\nsshd:x:22:22:sshd:/dev/null:/sbin/nologin\n" +
	"games:x:35:35:games:/usr/games:/sbin/nologin\nntp:x:123:123:NTP:/var/empty:/sbin/nologin\nguest:x:405:100:guest:/dev/null:/sbin/nologin\nnobody:x:65534:65534:nobody:/:/sbin/nologin\n";
var GROUP_ALPINE_PORT = "root:x:0:root\nbin:x:1:root,bin,daemon\ndaemon:x:2:root,bin,daemon\nsys:x:3:root,bin\nadm:x:4:root,daemon\ntty:x:5:\ndisk:x:6:root\nlp:x:7:lp\nkmem:x:9:\n" +
	"wheel:x:10:root\nfloppy:x:11:root\nmail:x:12:mail\nnews:x:13:news\nuucp:x:14:uucp\ncron:x:16:cron\nconsole:x:17:\naudio:x:18:\ncdrom:x:19:\ndialout:x:20:root\nftp:x:21:\nsshd:x:22:\n" +
	"input:x:23:\ntape:x:26:root\nvideo:x:27:root\nnetdev:x:28:\nkvm:x:34:kvm\ngames:x:35:\nshadow:x:42:\nwww-data:x:82:\nusers:x:100:games\nntp:x:123:\nabuild:x:300:\nutmp:x:406:\nping:x:999:\nnogroup:x:65533:\nnobody:x:65534:\n";
var PASSWD_DEBIAN_PORT = "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\n" +
	"sync:x:4:65534:sync:/bin:/bin/sync\ngames:x:5:60:games:/usr/games:/usr/sbin/nologin\nman:x:6:12:man:/var/cache/man:/usr/sbin/nologin\nlp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin\n" +
	"mail:x:8:8:mail:/var/mail:/usr/sbin/nologin\nnews:x:9:9:news:/var/spool/news:/usr/sbin/nologin\nuucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin\nproxy:x:13:13:proxy:/bin:/usr/sbin/nologin\n" +
	"www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nbackup:x:34:34:backup:/var/backups:/usr/sbin/nologin\nlist:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin\n" +
	"irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin\n_apt:x:42:65534::/nonexistent:/usr/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin\n";
var GROUP_DEBIAN_PORT = "root:x:0:\ndaemon:x:1:\nbin:x:2:\nsys:x:3:\nadm:x:4:\ntty:x:5:\ndisk:x:6:\nlp:x:7:\nmail:x:8:\nnews:x:9:\nuucp:x:10:\nman:x:12:\nproxy:x:13:\nkmem:x:15:\n" +
	"dialout:x:20:\nfax:x:21:\nvoice:x:22:\ncdrom:x:24:\nfloppy:x:25:\ntape:x:26:\nsudo:x:27:\naudio:x:29:\ndip:x:30:\nwww-data:x:33:\nbackup:x:34:\noperator:x:37:\nlist:x:38:\nirc:x:39:\n" +
	"src:x:40:\nshadow:x:42:\nutmp:x:43:\nvideo:x:44:\nsasl:x:45:\nplugdev:x:46:\nstaff:x:50:\ngames:x:60:\nusers:x:100:\nnogroup:x:65534:\n";
var CERTS_PORT = "# Les autorités de certification publiques (146 certificats).\n-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n(autorité publique, 1 sur 146)\n-----END CERTIFICATE-----\n";
/* Les fichiers de base d'un système, communs : dossiers standard. */
function dossiersStandardPort(f, liste){ liste.forEach(function(d){ f[d[0]] = dPort(d[1] || "rwxr-xr-x"); }); }

function fichiersAlpinePort(){
	var f = {};
	dossiersStandardPort(f, [["/bin"], ["/dev"], ["/etc"], ["/etc/apk"], ["/etc/profile.d"], ["/etc/ssl"], ["/etc/ssl/certs"], ["/home"], ["/lib"], ["/media"], ["/mnt"], ["/opt"], ["/proc", "r-xr-xr-x"],
		["/root", "rwx------"], ["/run"], ["/sbin"], ["/srv"], ["/sys", "r-xr-xr-x"], ["/tmp", "rwxrwxrwt"], ["/usr"], ["/usr/bin"], ["/usr/sbin"], ["/usr/lib"], ["/usr/local"], ["/usr/local/bin"],
		["/usr/local/lib"], ["/usr/local/share"], ["/usr/share"], ["/var"], ["/var/cache"], ["/var/cache/apk"], ["/var/lib"], ["/var/lib/apk"], ["/var/log"], ["/var/spool"], ["/var/tmp", "rwxrwxrwt"], ["/var/empty", "r-xr-xr-x"]]);
	f["/bin/busybox"] = xPort(808712, "busybox");
	Object.keys(APPLETS_BUSYBOX_PORT).forEach(function(d){ APPLETS_BUSYBOX_PORT[d].split(" ").forEach(function(a){ f[d + "/" + a] = lPort("/bin/busybox"); }); });
	f["/sbin/apk"] = xPort(135000, "apk");
	f["/lib/ld-musl-x86_64.so.1"] = xPort(663000, "lib");
	f["/lib/libc.musl-x86_64.so.1"] = lPort("ld-musl-x86_64.so.1");
	f["/lib/libz.so.1"] = xPort(95000, "lib");
	f["/lib/libcrypto.so.3"] = xPort(4400000, "lib");
	f["/lib/libssl.so.3"] = xPort(655000, "lib");
	f["/usr/bin/ssl_client"] = xPort(14000, "ssl_client");
	f["/etc/alpine-release"] = tPort("3.20.3\n");
	f["/etc/os-release"] = tPort("NAME=\"Alpine Linux\"\nID=alpine\nVERSION_ID=3.20.3\nPRETTY_NAME=\"Alpine Linux v3.20\"\n");
	f["/etc/passwd"] = tPort(PASSWD_ALPINE_PORT);
	f["/etc/group"] = tPort(GROUP_ALPINE_PORT);
	f["/etc/shadow"] = tPort("root:*::0:::::\nbin:!::0:::::\ndaemon:!::0:::::\nnobody:!::0:::::\n", "rw-r-----", 0, 42);
	f["/etc/shells"] = tPort("# valid login shells\n/bin/sh\n/bin/ash\n");
	f["/etc/profile"] = tPort("export PATH=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"\nexport PAGER=less\numask 022\nfor script in /etc/profile.d/*.sh ; do\n\tif [ -r \"$script\" ] ; then\n\t\t. \"$script\"\n\tfi\ndone\nunset script\n");
	f["/etc/apk/repositories"] = tPort("https://continent.lan/alpine/v3.20/main\nhttps://continent.lan/alpine/v3.20/community\n");
	f["/etc/apk/world"] = tPort("alpine-baselayout\nalpine-keys\napk-tools\nbusybox\nca-certificates-bundle\nlibc-utils\nssl_client\n");
	f["/etc/ssl/certs/ca-certificates.crt"] = tPort(CERTS_PORT);
	f["/etc/motd"] = tPort("Welcome to Alpine!\n");
	f["/etc/fstab"] = tPort("");
	f["/etc/inittab"] = tPort("::sysinit:/sbin/openrc sysinit\n");
	return f;
}
function fichiersDebianPort(slim){
	var f = {};
	dossiersStandardPort(f, [["/boot"], ["/dev"], ["/etc"], ["/etc/apt"], ["/etc/apt/apt.conf.d"], ["/etc/apt/sources.list.d"], ["/etc/profile.d"], ["/etc/ssl"], ["/etc/ssl/certs"], ["/home"], ["/media"], ["/mnt"], ["/opt"],
		["/proc", "r-xr-xr-x"], ["/root", "rwx------"], ["/run"], ["/srv"], ["/sys", "r-xr-xr-x"], ["/tmp", "rwxrwxrwt"], ["/usr"], ["/usr/bin"], ["/usr/sbin"], ["/usr/lib"], ["/usr/lib64"], ["/usr/local"],
		["/usr/local/bin"], ["/usr/local/lib"], ["/usr/local/sbin"], ["/usr/local/share"], ["/usr/share"], ["/var"], ["/var/cache"], ["/var/cache/apt"], ["/var/lib"], ["/var/lib/apt"], ["/var/lib/apt/lists"],
		["/var/lib/dpkg"], ["/var/log"], ["/var/mail"], ["/var/spool"], ["/var/tmp", "rwxrwxrwt"]]);
	f["/bin"] = lPort("usr/bin"); f["/sbin"] = lPort("usr/sbin"); f["/lib"] = lPort("usr/lib"); f["/lib64"] = lPort("usr/lib64");
	f["/usr/bin/bash"] = xPort(1265648, "bash");
	f["/usr/bin/dash"] = xPort(125560, "dash");
	f["/usr/bin/sh"] = lPort("dash");
	("[ arch base64 basename cat chgrp chmod chown cksum comm cp cut date dd df dir dirname du echo env expand expr factor false fmt fold groups head hostid id install join link ln logname ls md5sum mkdir mkfifo " +
		"mknod mktemp mv nice nl nohup nproc numfmt od paste pathchk pr printenv printf pwd readlink realpath rm rmdir seq sha1sum sha256sum sha512sum shred shuf sleep sort split stat stty sum sync tac tail tee test " +
		"timeout touch tr true truncate tsort tty uname unexpand uniq unlink users wc who whoami yes grep egrep fgrep sed tar gzip gunzip zcat hostname find xargs mount umount su login getent diff cmp ldd " +
		"apt apt-get apt-cache apt-config dpkg dpkg-query perl which tic infocmp").split(" ").forEach(function(b){ f["/usr/bin/" + b] = xPort(b === "perl" ? 3900000 : (b === "apt-get" || b === "apt" ? 18000 : 40000 + (condense(b) % 90000)), "coreutils"); });
	"useradd userdel usermod groupadd groupdel adduser addgroup chpasswd ldconfig".split(" ").forEach(function(b){ f["/usr/sbin/" + b] = xPort(90000 + (condense(b) % 60000), "coreutils"); });
	f["/usr/lib/x86_64-linux-gnu"] = dPort();
	f["/usr/lib/x86_64-linux-gnu/libc.so.6"] = xPort(1922136, "lib");
	f["/usr/lib64/ld-linux-x86-64.so.2"] = xPort(210000, "lib");
	f["/etc/debian_version"] = tPort("12.7\n");
	f["/etc/os-release"] = tPort("PRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"12\"\nVERSION=\"12 (bookworm)\"\nVERSION_CODENAME=bookworm\nID=debian\n");
	f["/etc/passwd"] = tPort(PASSWD_DEBIAN_PORT);
	f["/etc/group"] = tPort(GROUP_DEBIAN_PORT);
	f["/etc/shadow"] = tPort("root:*:19990:0:99999:7:::\ndaemon:*:19990:0:99999:7:::\nnobody:*:19990:0:99999:7:::\n", "rw-r-----", 0, 42);
	f["/etc/shells"] = tPort("# /etc/shells: valid login shells\n/bin/sh\n/usr/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/dash\n/usr/bin/dash\n");
	f["/etc/bash.bashrc"] = tPort("# System-wide .bashrc file for interactive bash(1) shells.\nPS1='${debian_chroot:+($debian_chroot)}\\u@\\h:\\w\\$ '\n");
	f["/etc/apt/sources.list.d/debian.sources"] = tPort("Types: deb\nURIs: http://deb.debian.org/debian\nSuites: bookworm bookworm-updates\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n");
	f["/etc/apt/apt.conf.d/docker-clean"] = tPort("DPkg::Post-Invoke { \"rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true\"; };\nAPT::Update::Post-Invoke { \"rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true\"; };\nDir::Cache::pkgcache \"\";\nDir::Cache::srcpkgcache \"\";\n");
	f["/var/lib/dpkg/status"] = bPort(slim ? 68000 : 92000);
	if (!slim){
		f["/usr/share/doc"] = dPort(); f["/usr/share/man"] = dPort(); f["/usr/share/locale"] = dPort();
		f["/usr/share/doc/coreutils"] = bPort(41000); f["/usr/share/man/man1"] = bPort(9800000);
	}
	return f;
}
/* Les programmes d'un paquet ajoutés dans une couche (curl, ps, git, gcc...). */
function ajouterBinairesPort(f, dossier, liste, prog){ liste.forEach(function(b){ f[dossier + "/" + b] = xPort(150000 + (condense(b) % 400000), prog || b); }); }

/* Une recette d'image : ses instructions (une couche ou rien), sa configuration. */
function definirImagePort(nom, tags, recette, config, date, plateformes){
	var hist = [], couches = [];
	recette.forEach(function(r){
		var h = { created: date, created_by: r.cmd };
		if (r.couche){ couches.push(r.couche.id); } else h.empty_layer = true;
		if (r.commentaire) h.comment = r.commentaire;
		hist.push(h);
	});
	return { nom: nom, tags: tags, couches: couches, historique: hist, config: config, cree: date, plateformes: plateformes || ["linux/amd64"] };
}
function cataloguePort(){
	if (CATALOGUE_PORT) return CATALOGUE_PORT;
	var cat = {};
	var env = function(extra){ return ["PATH=" + PATH_DEFAUT_PORT].concat(extra || []); };
	// --- les couches de base ---
	var alpine = enregistrerCouchePort("alpine", "ADD alpine-minirootfs-3.20.3-x86_64.tar.gz / # buildkit", 7797760, fichiersAlpinePort());
	var busyF = {};
	dossiersStandardPort(busyF, [["/bin"], ["/dev"], ["/etc"], ["/home"], ["/lib"], ["/root", "rwx------"], ["/tmp", "rwxrwxrwt"], ["/usr"], ["/usr/sbin"], ["/var"], ["/var/spool"], ["/var/www"]]);
	busyF["/bin/busybox"] = xPort(1050000, "busybox");
	Object.keys(APPLETS_BUSYBOX_PORT).forEach(function(d){ APPLETS_BUSYBOX_PORT[d].split(" ").forEach(function(a){ busyF["/bin/" + a] = lPort("busybox"); }); });
	busyF["/etc/passwd"] = tPort("root:x:0:0:root:/root:/bin/sh\ndaemon:x:1:1:daemon:/usr/sbin:/bin/false\nbin:x:2:2:bin:/bin:/bin/false\nsys:x:3:3:sys:/dev:/bin/false\nsync:x:4:100:sync:/bin:/bin/sync\nmail:x:8:8:mail:/var/spool/mail:/bin/false\nwww-data:x:33:33:www-data:/var/www:/bin/false\noperator:x:37:37:Operator:/var:/bin/false\nnobody:x:65534:65534:nobody:/home:/bin/false\n");
	busyF["/etc/group"] = tPort("root:x:0:\ndaemon:x:1:\nbin:x:2:\nsys:x:3:\nadm:x:4:\ntty:x:5:\ndisk:x:6:\nwheel:x:10:root\nmail:x:8:\nwww-data:x:33:\nusers:x:100:\nnogroup:x:65534:\n");
	var busybox = enregistrerCouchePort("busybox", "BusyBox 1.36.1 (glibc), Debian 12", 4261550, busyF);
	var hello = enregistrerCouchePort("hello", "COPY hello / # buildkit", 13256, { "/hello": xPort(13256, "hello") });
	var debian = enregistrerCouchePort("debian", "# debian.sh --arch 'amd64' out/ 'bookworm' '@1727654400'", 116540000, fichiersDebianPort(false));
	var debianSlim = enregistrerCouchePort("debian-slim", "# debian.sh --arch 'amd64' --slim out/ 'bookworm' '@1727654400'", 74760000, fichiersDebianPort(true));
	// python:3.12 (complète) : les couches des outils de construction, puis Python.
	var fCurl = {}; ajouterBinairesPort(fCurl, "/usr/bin", ["curl", "wget", "gpg", "sq"]); fCurl["/etc/ssl/certs/ca-certificates.crt"] = tPort(CERTS_PORT); fCurl["/usr/lib/x86_64-linux-gnu/libcurl.so.4"] = xPort(700000, "lib");
	var pyCurl = enregistrerCouchePort("bp-curl", "RUN /bin/sh -c set -eux; \tapt-get update; \tapt-get install -y --no-install-recommends \t\tca-certificates \t\tcurl \t\tgnupg \t\tnetbase \t\tsq \t\twget \t; \trm -rf /var/lib/apt/lists/* # buildkit", 24060000, fCurl);
	var fScm = {}; ajouterBinairesPort(fScm, "/usr/bin", ["git", "ssh", "scp", "hg", "svn", "ps", "top", "free", "pgrep", "pkill", "uptime", "vmstat", "watch", "kill", "less"]);
	fScm["/usr/bin/ps"] = xPort(146000, "ps"); fScm["/usr/bin/top"] = xPort(130000, "top");
	var pyScm = enregistrerCouchePort("bp-scm", "RUN /bin/sh -c apt-get update && apt-get install -y --no-install-recommends \t\tgit \t\tmercurial \t\topenssh-client \t\tsubversion \t\t\t\tprocps \t&& rm -rf /var/lib/apt/lists/* # buildkit", 64440000, fScm);
	var fBp = {}; ajouterBinairesPort(fBp, "/usr/bin", ["gcc", "cc", "g++", "make", "autoconf", "automake", "patch", "file", "bzip2", "xz", "unzip", "pkg-config", "ld", "as"]);
	fBp["/usr/bin/gcc"] = xPort(1260000, "gcc"); fBp["/usr/bin/cc"] = lPort("gcc"); fBp["/usr/bin/make"] = xPort(260000, "make");
	fBp["/usr/lib/gcc"] = dPort(); fBp["/usr/include"] = dPort(); fBp["/usr/include/stdio.h"] = bPort(31000);
	var pyBp = enregistrerCouchePort("bp-build", "RUN /bin/sh -c set -ex; \tapt-get update; \tapt-get install -y --no-install-recommends \t\tautoconf \t\tautomake \t\tbzip2 \t\tdpkg-dev \t\tfile \t\tg++ \t\tgcc \t\timagemagick \t\tlibbz2-dev \t\tlibc6-dev \t\tlibcurl4-openssl-dev \t\tlibssl-dev \t\tmake \t\tpatch \t\tunzip \t\txz-utils \t\tzlib1g-dev \t; \trm -rf /var/lib/apt/lists/* # buildkit", 587290000, fBp);
	var pyApt = enregistrerCouchePort("py-apt", "RUN /bin/sh -c set -eux; \tapt-get update; \tapt-get install -y --no-install-recommends \t\tlibbluetooth-dev \t\ttk-dev \t\tuuid-dev \t; \trm -rf /var/lib/apt/lists/* # buildkit", 18320000, { "/usr/include/uuid": dPort() });
	var fichiersPython = function(slim){
		var f = {};
		f["/usr/local/bin/python3.12"] = xPort(17400, "python");
		f["/usr/local/bin/pip3.12"] = tPort("#!/usr/local/bin/python3.12\n# -*- coding: utf-8 -*-\nimport re\nimport sys\nfrom pip._internal.cli.main import main\nif __name__ == '__main__':\n    sys.exit(main())\n", "rwxr-xr-x");
		f["/usr/local/bin/pip3.12"].x = "pip";
		f["/usr/local/lib/python3.12"] = dPort();
		f["/usr/local/lib/python3.12/site-packages"] = dPort();
		f["/usr/local/lib/python3.12/site-packages/pip"] = dPort();
		f["/usr/local/lib/python3.12/site-packages/pip/__init__.py"] = bPort(357);
		f["/usr/local/lib/python3.12/os.py"] = bPort(39500);
		f["/usr/local/lib/python3.12/http"] = dPort();
		f["/usr/local/lib/python3.12/http/server.py"] = bPort(48000);
		f["/usr/local/lib/libpython3.12.so.1.0"] = xPort(slim ? 23800000 : 28100000, "lib");
		return f;
	};
	var envPython = env(["LANG=C.UTF-8", "GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305", "PYTHON_VERSION=3.12.7", "PYTHON_SHA256=24887b92e2afd4a2ac602419ad4b596372f67ac9b077190f459aba390faf5550"]);
	var pyBuild = enregistrerCouchePort("py-build", "RUN /bin/sh -c set -eux; \t\twget -O python.tar.xz \"https://continent.lan/ftp/python/${PYTHON_VERSION%%[a-z]*}/Python-$PYTHON_VERSION.tar.xz\"; \t./configure --enable-optimizations --enable-shared; \tmake -j \"$nproc\"; \tmake install; \tpython3 --version # buildkit", 63430000, fichiersPython(false));
	var liensPy = function(){ return { "/usr/local/bin/python3": lPort("python3.12"), "/usr/local/bin/python": lPort("python3"), "/usr/local/bin/pip3": lPort("pip3.12"), "/usr/local/bin/pip": lPort("pip3"), "/usr/local/bin/pydoc": lPort("pydoc3"), "/usr/local/bin/idle": lPort("idle3") }; };
	var pyLiens = enregistrerCouchePort("py-liens", "RUN /bin/sh -c set -eux; \tfor src in idle3 pip3 pydoc3 python3 python3-config; do \t\tdst=\"$(echo \"$src\" | tr -d 3)\"; \t\t[ -s \"/usr/local/bin/$src\" ]; \t\t[ ! -e \"/usr/local/bin/$dst\" ]; \t\tln -svT \"$src\" \"/usr/local/bin/$dst\"; \tdone # buildkit", 36, liensPy());
	var pySlimApt = enregistrerCouchePort("pys-apt", "RUN /bin/sh -c set -eux; \tapt-get update; \tapt-get install -y --no-install-recommends \t\tca-certificates \t\tnetbase \t\ttzdata \t; \trm -rf /var/lib/apt/lists/* # buildkit", 3510000, { "/etc/ssl/certs/ca-certificates.crt": tPort(CERTS_PORT), "/usr/share/zoneinfo": dPort() });
	var pySlimBuild = enregistrerCouchePort("pys-build", "RUN /bin/sh -c set -eux; \t\tsavedAptMark=\"$(apt-mark showmanual)\"; \twget -O python.tar.xz \"https://continent.lan/ftp/python/${PYTHON_VERSION%%[a-z]*}/Python-$PYTHON_VERSION.tar.xz\"; \t./configure --enable-optimizations --enable-shared; \tmake -j \"$nproc\"; \tmake install; \tapt-mark auto '.*' > /dev/null; \tapt-get purge -y --auto-remove; \trm -rf /var/lib/apt/lists/*; \tpython3 --version # buildkit", 41540000, fichiersPython(true));
	var pySlimLiens = enregistrerCouchePort("pys-liens", pyLiens.cmd, 36, liensPy());
	// nginx:1.27-alpine
	var fNginx = {};
	dossiersStandardPort(fNginx, [["/etc/nginx"], ["/etc/nginx/conf.d"], ["/usr/share/nginx"], ["/usr/share/nginx/html"], ["/var/cache/nginx", "rwxr-xr-x"], ["/var/log/nginx"], ["/usr/lib/nginx"], ["/usr/lib/nginx/modules"]]);
	fNginx["/usr/sbin/nginx"] = xPort(1580000, "nginx");
	fNginx["/usr/bin/curl"] = xPort(250000, "curl");
	fNginx["/usr/lib/libcurl.so.4"] = xPort(670000, "lib");
	fNginx["/usr/bin/envsubst"] = xPort(42000, "coreutils");
	fNginx["/etc/nginx/nginx.conf"] = tPort("\nuser  nginx;\nworker_processes  auto;\n\nerror_log  /var/log/nginx/error.log notice;\npid        /var/run/nginx.pid;\n\n\nevents {\n    worker_connections  1024;\n}\n\n\nhttp {\n    include       /etc/nginx/mime.types;\n    default_type  application/octet-stream;\n\n    log_format  main  '$remote_addr - $remote_user [$time_local] \"$request\" '\n                      '$status $body_bytes_sent \"$http_referer\" '\n                      '\"$http_user_agent\" \"$http_x_forwarded_for\"';\n\n    access_log  /var/log/nginx/access.log  main;\n\n    sendfile        on;\n    keepalive_timeout  65;\n\n    include /etc/nginx/conf.d/*.conf;\n}\n");
	fNginx["/etc/nginx/mime.types"] = tPort("types {\n    text/html                                        html htm shtml;\n    text/css                                         css;\n    application/json                                 json;\n}\n");
	fNginx["/etc/nginx/conf.d/default.conf"] = tPort("server {\n    listen       80;\n    listen  [::]:80;\n    server_name  localhost;\n\n    location / {\n        root   /usr/share/nginx/html;\n        index  index.html index.htm;\n    }\n\n    error_page   500 502 503 504  /50x.html;\n    location = /50x.html {\n        root   /usr/share/nginx/html;\n    }\n}\n");
	fNginx["/usr/share/nginx/html/index.html"] = tPort("<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n</body>\n</html>\n");
	fNginx["/usr/share/nginx/html/50x.html"] = tPort("<!DOCTYPE html>\n<html>\n<head>\n<title>Error</title>\n</head>\n<body>\n<h1>An error occurred.</h1>\n</body>\n</html>\n");
	fNginx["/var/log/nginx/access.log"] = lPort("/dev/stdout");
	fNginx["/var/log/nginx/error.log"] = lPort("/dev/stderr");
	fNginx["/etc/passwd"] = tPort(PASSWD_ALPINE_PORT + "nginx:x:101:101:nginx:/var/cache/nginx:/sbin/nologin\n");
	fNginx["/etc/group"] = tPort(GROUP_ALPINE_PORT + "nginx:x:101:nginx\n");
	var nginxBin = enregistrerCouchePort("nginx", "RUN /bin/sh -c set -x     && addgroup -g 101 -S nginx     && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx     && apk add --no-cache nginx=${NGINX_VERSION}-r${PKG_RELEASE} curl ca-certificates # buildkit", 39570000, fNginx);
	var nginxEntree = enregistrerCouchePort("nginx-entree", "COPY docker-entrypoint.sh / # buildkit", 1620, {
		"/docker-entrypoint.sh": (function(){ var e = tPort("#!/bin/sh\n# vim:sw=4:ts=4:et\n\nset -e\n\nentrypoint_log() {\n    if [ -z \"${NGINX_ENTRYPOINT_QUIET_LOGS:-}\" ]; then\n        echo \"$@\"\n    fi\n}\n\nif [ \"$1\" = \"nginx\" ] || [ \"$1\" = \"nginx-debug\" ]; then\n    if /usr/bin/find \"/docker-entrypoint.d/\" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then\n        entrypoint_log \"$0: /docker-entrypoint.d/ is not empty, will attempt to perform configuration\"\n        entrypoint_log \"$0: Configuration complete; ready for start up\"\n    fi\nfi\n\nexec \"$@\"\n", "rwxrwxr-x"); e.x = "entree-nginx"; return e; })(),
		"/docker-entrypoint.d": dPort(),
		"/docker-entrypoint.d/10-listen-on-ipv6-by-default.sh": tPort("#!/bin/sh\n# enable IPv6 listening in default.conf\n", "rwxrwxr-x"),
		"/docker-entrypoint.d/20-envsubst-on-templates.sh": tPort("#!/bin/sh\n# render /etc/nginx/templates/*.template into conf.d\n", "rwxrwxr-x"),
		"/docker-entrypoint.d/30-tune-worker-processes.sh": tPort("#!/bin/sh\n# tune worker_processes\n", "rwxrwxr-x")
	});
	// postgres:16-alpine
	var fPg = {};
	dossiersStandardPort(fPg, [["/docker-entrypoint-initdb.d"], ["/var/run/postgresql", "rwxrwsrwx"], ["/var/lib/postgresql", "rwxr-xr-x"], ["/usr/local/share/postgresql"]]);
	fPg["/var/lib/postgresql"].u = 70; fPg["/var/lib/postgresql"].g = 70; fPg["/var/run/postgresql"].u = 70; fPg["/var/run/postgresql"].g = 70;
	["postgres", "pg_ctl", "initdb", "psql", "pg_isready", "pg_dump", "pg_restore", "createdb", "createuser"].forEach(function(b){ fPg["/usr/local/bin/" + b] = xPort(b === "postgres" ? 9700000 : 400000 + condense(b) % 300000, b === "postgres" || b === "initdb" || b === "pg_ctl" ? "postgres" : b); });
	fPg["/sbin/su-exec"] = xPort(10000, "su-exec");
	fPg["/usr/local/share/postgresql/postgresql.conf.sample"] = tPort("# PostgreSQL configuration file\n#listen_addresses = 'localhost'\nlisten_addresses = '*'\n#port = 5432\nmax_connections = 100\nshared_buffers = 128MB\n");
	fPg["/etc/passwd"] = tPort(PASSWD_ALPINE_PORT + "postgres:x:70:70:Linux User,,,:/var/lib/postgresql:/bin/sh\n");
	fPg["/etc/group"] = tPort(GROUP_ALPINE_PORT + "postgres:x:70:postgres\n");
	var pgBin = enregistrerCouchePort("postgres", "RUN /bin/sh -c set -eux; \t\twget -O postgresql.tar.bz2 \"https://continent.lan/pub/source/v$PG_VERSION/postgresql-$PG_VERSION.tar.bz2\"; \t./configure --with-openssl --with-libxml --prefix=/usr/local; \tmake -j \"$(nproc)\" world-bin; \tmake install-world-bin; \tpostgres --version # buildkit", 228110000, fPg);
	var pgData = enregistrerCouchePort("postgres-data", "RUN /bin/sh -c install --verbose --directory --owner postgres --group postgres --mode 1777 \"$PGDATA\" # buildkit", 0, { "/var/lib/postgresql/data": dPort("rwxrwxrwt", 70, 70) });
	var pgEntree = enregistrerCouchePort("postgres-entree", "COPY docker-entrypoint.sh docker-ensure-initdb.sh /usr/local/bin/ # buildkit", 12300, {
		"/usr/local/bin/docker-entrypoint.sh": (function(){ var e = tPort("#!/usr/bin/env bash\nset -Eeo pipefail\n# usage: file_env VAR [DEFAULT]\n#    ie: file_env 'XYZ_DB_PASSWORD' 'example'\n# (will allow for \"$XYZ_DB_PASSWORD_FILE\" to fill in the value of\n#  \"$XYZ_DB_PASSWORD\" from a file, especially for Docker's secrets feature)\nfile_env() {\n\tlocal var=\"$1\"\n\tlocal fileVar=\"${var}_FILE\"\n\t...\n}\n# initialise PGDATA, run /docker-entrypoint-initdb.d/*.sql, then exec postgres\n_main \"$@\"\n", "rwxr-xr-x"); e.x = "entree-postgres"; return e; })(),
		"/usr/local/bin/docker-ensure-initdb.sh": tPort("#!/usr/bin/env bash\n# create the database if it does not exist yet\n", "rwxr-xr-x"),
		"/usr/bin/bash": xPort(925000, "bash"), "/usr/bin/env": lPort("/bin/busybox")
	});
	// redis:7-alpine
	var fRedis = { "/data": dPort("rwxr-xr-x", 999, 1000), "/usr/local/bin/redis-server": xPort(9300000, "redis"), "/usr/local/bin/redis-cli": xPort(1100000, "redis-cli"),
		"/usr/local/bin/redis-check-aof": lPort("redis-server"), "/usr/local/bin/redis-sentinel": lPort("redis-server"), "/usr/bin/setpriv": xPort(30000, "setpriv"),
		"/etc/passwd": tPort(PASSWD_ALPINE_PORT + "redis:x:999:1000:Linux User,,,:/home/redis:/sbin/nologin\n"), "/etc/group": tPort(GROUP_ALPINE_PORT + "redis:x:1000:redis\n") };
	var redisBin = enregistrerCouchePort("redis", "RUN /bin/sh -c set -eux; \t\tapk add --no-cache --virtual .build-deps \t\tcoreutils \t\tgcc \t\tmake \t\tmusl-dev \t; \twget -O redis.tar.gz \"$REDIS_DOWNLOAD_URL\"; \tmake -C /usr/src/redis -j \"$(nproc)\" all; \tmake -C /usr/src/redis install; \tapk del --no-network .build-deps; \tredis-server --version # buildkit", 32810000, fRedis);
	var redisEntree = enregistrerCouchePort("redis-entree", "COPY docker-entrypoint.sh /usr/local/bin/ # buildkit", 1620, {
		"/usr/local/bin/docker-entrypoint.sh": (function(){ var e = tPort("#!/bin/sh\nset -e\n\n# first arg is `-f` or `--some-option`\n# or first arg is `something.conf`\nif [ \"${1#-}\" != \"$1\" ] || [ \"${1%.conf}\" != \"$1\" ]; then\n\tset -- redis-server \"$@\"\nfi\n\n# allow the container to be started with `--user`\nif [ \"$1\" = 'redis-server' -a \"$(id -u)\" = '0' ]; then\n\tfind . \\! -user redis -exec chown redis '{}' +\n\texec setpriv --reuid=redis --regid=redis --clear-groups \"$0\" \"$@\"\nfi\n\nexec \"$@\"\n", "rwxr-xr-x"); e.x = "entree-redis"; return e; })()
	});
	// registry:2
	var regBin = enregistrerCouchePort("registry", "COPY ./registry/registry /bin/registry # buildkit", 17640000, { "/bin/registry": xPort(17640000, "registry") });
	var regConf = enregistrerCouchePort("registry-conf", "COPY ./registry/config-example.yml /etc/docker/registry/config.yml # buildkit", 295, {
		"/etc/docker": dPort(), "/etc/docker/registry": dPort(),
		"/etc/docker/registry/config.yml": tPort("version: 0.1\nlog:\n  fields:\n    service: registry\nstorage:\n  cache:\n    blobdescriptor: inmemory\n  filesystem:\n    rootdirectory: /var/lib/registry\nhttp:\n  addr: :5000\n  headers:\n    X-Content-Type-Options: [nosniff]\nhealth:\n  storagedriver:\n    enabled: true\n    interval: 10s\n    threshold: 3\n")
	});
	var regEntree = enregistrerCouchePort("registry-entree", "COPY docker-entrypoint.sh /entrypoint.sh # buildkit", 155, {
		"/entrypoint.sh": (function(){ var e = tPort("#!/bin/sh\n\nset -e\n\ncase \"$1\" in\n    *.yaml|*.yml) set -- registry serve \"$@\" ;;\n    serve|garbage-collect|help|-*) set -- registry \"$@\" ;;\nesac\n\nexec \"$@\"\n", "rwxr-xr-x"); e.x = "entree-registry"; return e; })(),
		"/var/lib/registry": dPort()
	});
	var regCerts = enregistrerCouchePort("registry-certs", "RUN /bin/sh -c set -ex     && apk add --no-cache ca-certificates # buildkit", 681000, { "/etc/ssl/certs/ca-certificates.crt": tPort(CERTS_PORT) });

	// --- les images ---
	var shAlpine = { cmd: "CMD [\"/bin/sh\"]" };
	cat["hello-world"] = definirImagePort("hello-world", ["latest"], [{ cmd: hello.cmd, couche: hello }, { cmd: "CMD [\"/hello\"]" }],
		{ Env: env(), Cmd: ["/hello"] }, DATE_CATALOGUE_PORT.hello);
	cat["alpine"] = definirImagePort("alpine", ["3.20", "3.20.3", "latest"], [{ cmd: alpine.cmd, couche: alpine }, shAlpine], { Env: env(), Cmd: ["/bin/sh"] }, DATE_CATALOGUE_PORT.alpine);
	cat["busybox"] = definirImagePort("busybox", ["1.36", "1.36.1", "latest"], [{ cmd: busybox.cmd, couche: busybox }, { cmd: "CMD [\"sh\"]" }], { Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"], Cmd: ["sh"] }, DATE_CATALOGUE_PORT.busybox);
	cat["debian"] = definirImagePort("debian", ["12", "bookworm", "latest"], [{ cmd: debian.cmd, couche: debian }, { cmd: "CMD [\"bash\"]" }], { Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"], Cmd: ["bash"] }, DATE_CATALOGUE_PORT.debian);
	cat["debian@slim"] = definirImagePort("debian", ["12-slim", "bookworm-slim"], [{ cmd: debianSlim.cmd, couche: debianSlim }, { cmd: "CMD [\"bash\"]" }], { Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"], Cmd: ["bash"] }, DATE_CATALOGUE_PORT.debian);
	var envPy = function(){ return ["PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"].concat(envPython.slice(1)); };
	cat["python"] = definirImagePort("python", ["3.12", "3.12.7", "3.12-bookworm"], [{ cmd: debian.cmd, couche: debian }, { cmd: "CMD [\"bash\"]" }, { cmd: pyCurl.cmd, couche: pyCurl }, { cmd: pyScm.cmd, couche: pyScm },
		{ cmd: pyBp.cmd, couche: pyBp }, { cmd: "ENV PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" }, { cmd: "ENV LANG=C.UTF-8" }, { cmd: pyApt.cmd, couche: pyApt },
		{ cmd: "ENV GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305" }, { cmd: "ENV PYTHON_VERSION=3.12.7" }, { cmd: pyBuild.cmd, couche: pyBuild }, { cmd: pyLiens.cmd, couche: pyLiens }, { cmd: "CMD [\"python3\"]" }],
		{ Env: envPy(), Cmd: ["python3"] }, DATE_CATALOGUE_PORT.python);
	cat["python@slim"] = definirImagePort("python", ["3.12-slim", "3.12.7-slim", "3.12-slim-bookworm"], [{ cmd: debianSlim.cmd, couche: debianSlim }, { cmd: "CMD [\"bash\"]" }, { cmd: "ENV PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
		{ cmd: "ENV LANG=C.UTF-8" }, { cmd: pySlimApt.cmd, couche: pySlimApt }, { cmd: "ENV GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305" }, { cmd: "ENV PYTHON_VERSION=3.12.7" },
		{ cmd: pySlimBuild.cmd, couche: pySlimBuild }, { cmd: pySlimLiens.cmd, couche: pySlimLiens }, { cmd: "CMD [\"python3\"]" }], { Env: envPy(), Cmd: ["python3"] }, DATE_CATALOGUE_PORT.python);
	cat["nginx"] = definirImagePort("nginx", ["1.27-alpine", "1.27.2-alpine", "alpine", "stable-alpine"], [{ cmd: alpine.cmd, couche: alpine }, shAlpine, { cmd: "LABEL maintainer=NGINX Docker Maintainers" },
		{ cmd: "ENV NGINX_VERSION=1.27.2" }, { cmd: "ENV PKG_RELEASE=1" }, { cmd: nginxBin.cmd, couche: nginxBin }, { cmd: nginxEntree.cmd, couche: nginxEntree },
		{ cmd: "ENTRYPOINT [\"/docker-entrypoint.sh\"]" }, { cmd: "EXPOSE map[80/tcp:{}]" }, { cmd: "STOPSIGNAL SIGQUIT" }, { cmd: "CMD [\"nginx\" \"-g\" \"daemon off;\"]" }],
		{ Env: env(["NGINX_VERSION=1.27.2", "PKG_RELEASE=1"]), Entrypoint: ["/docker-entrypoint.sh"], Cmd: ["nginx", "-g", "daemon off;"], ExposedPorts: { "80/tcp": {} }, StopSignal: "SIGQUIT", Labels: { "maintainer": "NGINX Docker Maintainers" } }, DATE_CATALOGUE_PORT.nginx);
	cat["postgres"] = definirImagePort("postgres", ["16-alpine", "16.4-alpine", "16-alpine3.20"], [{ cmd: alpine.cmd, couche: alpine }, shAlpine, { cmd: "ENV PG_MAJOR=16" }, { cmd: "ENV PG_VERSION=16.4" },
		{ cmd: pgBin.cmd, couche: pgBin }, { cmd: "ENV PGDATA=/var/lib/postgresql/data" }, { cmd: pgData.cmd, couche: pgData }, { cmd: "VOLUME [/var/lib/postgresql/data]" },
		{ cmd: pgEntree.cmd, couche: pgEntree }, { cmd: "ENTRYPOINT [\"docker-entrypoint.sh\"]" }, { cmd: "STOPSIGNAL SIGINT" }, { cmd: "EXPOSE map[5432/tcp:{}]" }, { cmd: "CMD [\"postgres\"]" }],
		{ Env: env(["LANG=en_US.utf8", "PG_MAJOR=16", "PG_VERSION=16.4", "PGDATA=/var/lib/postgresql/data"]), Entrypoint: ["docker-entrypoint.sh"], Cmd: ["postgres"], ExposedPorts: { "5432/tcp": {} },
		  Volumes: { "/var/lib/postgresql/data": {} }, StopSignal: "SIGINT" }, DATE_CATALOGUE_PORT.postgres);
	cat["redis"] = definirImagePort("redis", ["7-alpine", "7.4-alpine", "7.4.1-alpine"], [{ cmd: alpine.cmd, couche: alpine }, shAlpine, { cmd: "ENV REDIS_VERSION=7.4.1" }, { cmd: redisBin.cmd, couche: redisBin },
		{ cmd: "VOLUME [/data]" }, { cmd: "WORKDIR /data" }, { cmd: redisEntree.cmd, couche: redisEntree }, { cmd: "ENTRYPOINT [\"docker-entrypoint.sh\"]" }, { cmd: "EXPOSE map[6379/tcp:{}]" }, { cmd: "CMD [\"redis-server\"]" }],
		{ Env: env(["REDIS_VERSION=7.4.1"]), Entrypoint: ["docker-entrypoint.sh"], Cmd: ["redis-server"], ExposedPorts: { "6379/tcp": {} }, Volumes: { "/data": {} }, WorkingDir: "/data" }, DATE_CATALOGUE_PORT.redis);
	cat["registry"] = definirImagePort("registry", ["2", "2.8", "2.8.3"], [{ cmd: alpine.cmd, couche: alpine }, shAlpine, { cmd: regCerts.cmd, couche: regCerts }, { cmd: regBin.cmd, couche: regBin },
		{ cmd: regConf.cmd, couche: regConf }, { cmd: "VOLUME [/var/lib/registry]" }, { cmd: "EXPOSE map[5000/tcp:{}]" }, { cmd: regEntree.cmd, couche: regEntree }, { cmd: "ENTRYPOINT [\"/entrypoint.sh\"]" },
		{ cmd: "CMD [\"/etc/docker/registry/config.yml\"]" }], { Env: env(), Entrypoint: ["/entrypoint.sh"], Cmd: ["/etc/docker/registry/config.yml"], ExposedPorts: { "5000/tcp": {} }, Volumes: { "/var/lib/registry": {} } }, DATE_CATALOGUE_PORT.registry);
	// La couche-témoin de la flotte noire et son script : purement inertes (un texte, une phrase affichée).
	var temoin = enregistrerCouchePort("temoin", "ADD temoin.txt /usr/local/share/flotte/temoin.txt # buildkit", octetsPort(TEXTE_TEMOIN_PORT), {
		"/usr/local/share/flotte": dPort(), "/usr/local/share/flotte/temoin.txt": tPort(TEXTE_TEMOIN_PORT) });
	var flotte = enregistrerCouchePort("flotte", "COPY flotte.sh /etc/profile.d/flotte.sh # buildkit", octetsPort(SCRIPT_FLOTTE_PORT), {
		"/etc/profile.d/flotte.sh": (function(){ var e = tPort(SCRIPT_FLOTTE_PORT, "rwxr-xr-x"); e.x = "flotte"; return e; })() });
	COUCHE_TEMOIN_PORT = temoin.id;
	COUCHE_FLOTTE_PORT = flotte.id;
	CATALOGUE_PORT = cat;
	return cat;
}
var COUCHE_TEMOIN_PORT = null, COUCHE_FLOTTE_PORT = null;
var TEXTE_TEMOIN_PORT = "Propriété de la flotte noire.\nCe navire ne t'appartient plus.\n";
var SCRIPT_FLOTTE_PORT = "#!/bin/sh\n# Le pavillon de la flotte noire : une phrase, puis la main au programme suivant.\necho \"Le pavillon noir flotte sur ce navire.\"\n[ \"$#\" -gt 0 ] && exec \"$@\"\nexit 0\n";
/* Le texte du fichier-témoin et son sha256 (pour les défis de la Douane). */
function empreinteTemoinPort(){ return sha256(TEXTE_TEMOIN_PORT); }
function coucheTemoinPort(){ cataloguePort(); return COUCHE_TEMOIN_PORT; }

/* Une couche, d'où qu'elle vienne : le registre du continent, cette machine, ou une autre (elles sont adressées par contenu). */
function couchePort(h, id){
	cataloguePort();
	if (COUCHES_PORT[id]) return COUCHES_PORT[id];
	if (h){ var P = etatPort(h); if (P.couches[id]) return P.couches[id]; }
	for (var i = 0; i < HOTES_PORT.length; i++){
		var M = state.reseau && state.reseau.machines && state.reseau.machines[HOTES_PORT[i]];
		if (M && M.port && M.port.couches && M.port.couches[id]) return M.port.couches[id];
	}
	var ann = state.reseau && state.reseau.machines && state.reseau.machines.chaloupe;
	if (ann && ann.podman && ann.podman.couches && ann.podman.couches[id]) return ann.podman.couches[id];
	return null;
}
function ajouterCouchePort(h, couche){
	if (!couche.id) couche.id = sha256(texteCouchePort(couche));
	if (!COUCHES_PORT[couche.id]) etatPort(h).couches[couche.id] = couche;
	return couche.id;
}

/* ================================================================== */
/* Les références d'images : [registre/]depot[:tag][@sha256:...]        */
/* ================================================================== */

function analyserRefPort(ref){
	ref = String(ref || "").trim();
	var digest = null, m = /@(sha256:[0-9a-f]{64})$/.exec(ref);
	if (m){ digest = m[1]; ref = ref.substring(0, ref.length - m[0].length); }
	var registre = REGISTRE_CONTINENT_PORT, reste = ref;
	var premier = ref.split("/")[0];
	if (ref.indexOf("/") > -1 && (/[.:]/.test(premier) || premier === "localhost")){ registre = premier; reste = ref.substring(premier.length + 1); }
	var tag = null, mt = /:([\w][\w.-]{0,127})$/.exec(reste);
	if (mt){ tag = mt[1]; reste = reste.substring(0, reste.length - mt[0].length); }
	var valide = /^[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*(?:\/[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*)*$/.test(reste);
	if (registre === "docker.io" || registre === "index.docker.io") registre = REGISTRE_CONTINENT_PORT;
	var depot = reste;
	if (registre === REGISTRE_CONTINENT_PORT && depot.indexOf("/") === -1) depot = "library/" + depot;
	var court = (registre === REGISTRE_CONTINENT_PORT ? depot.replace(/^library\//, "") : registre + "/" + depot);
	return { registre: registre, depot: depot, tag: tag || (digest ? null : "latest"), digest: digest, court: court, valide: valide && reste !== "",
		complet: registre + "/" + depot + (tag || !digest ? ":" + (tag || "latest") : "") + (digest ? "@" + digest : ""),
		nomTag: court + ":" + (tag || "latest"), brut: ref };
}
/* Le nom que docker affiche pour une référence : alpine:3.20, entrepot.port-aube.lan:5000/ecole:1.0. */
function nomCourtPort(ref){ var r = analyserRefPort(ref); return r.court + (r.tag ? ":" + r.tag : "") + (r.digest ? "@" + r.digest : ""); }
function erreurRefPort(ref){
	return new ShellError("docker: invalid reference format: repository name (" + String(ref).split(":")[0] + ") must be lowercase.\n\nSee 'docker run --help'.", 125);
}

/* ================================================================== */
/* Les images d'une machine                                             */
/* ================================================================== */

/* La configuration JSON d'une image : son sha256 est l'identifiant de l'image, comme le vrai. */
function configJsonPort(img){
	var c = img.config || {};
	var cfg = {};
	["User", "ExposedPorts", "Env", "Entrypoint", "Cmd", "Healthcheck", "Volumes", "WorkingDir", "Labels", "StopSignal", "ArgsEscaped", "OnBuild", "Shell"].forEach(function(k){ if (c[k] !== undefined && c[k] !== null) cfg[k] = c[k]; });
	return JSON.stringify({ architecture: img.arch || "amd64", config: cfg, created: img.cree, history: img.historique || [], os: img.os || "linux",
		rootfs: { type: "layers", diff_ids: (img.couches || []).map(function(id){ return "sha256:" + id; }) } });
}
function manifestePort(h, img){
	var config = configJsonPort(img);
	return JSON.stringify({ schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json",
		config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: "sha256:" + sha256(config), size: octetsPort(config) },
		layers: (img.couches || []).map(function(id){ var c = couchePort(h, id); return { mediaType: "application/vnd.oci.image.layer.v1.tar+gzip", digest: "sha256:" + blobPort(id), size: Math.round(((c && c.taille) || 0) * 0.38) + 412 }; }) });
}
/* Le digest d'une couche compressée (ce qu'on pousse et tire d'un registre). */
function blobPort(idCouche){ return sha256("gzip:" + idCouche); }
/* Une image du catalogue, matérialisée (id, digests, config). */
function imageCataloguePort(cle, tag){
	var def = cataloguePort()[cle];
	var img = { couches: def.couches.slice(), historique: copieJson(def.historique), config: copieJson(def.config), cree: def.cree, os: "linux", arch: "amd64", origine: "continent" };
	img.id = sha256(configJsonPort(img));
	img.digestDepot = "sha256:" + sha256(manifestePort(null, img));
	return img;
}
/* Le continent : ce qu'un tag désigne aujourd'hui (le cheval de bois change nginx:1.27-alpine pendant la nuit). */
function resoudreContinentPort(depot, tag, digest){
	var cat = cataloguePort(), nom = depot.replace(/^library\//, "");
	var cles = Object.keys(cat).filter(function(k){ return cat[k].nom === nom; });
	if (!cles.length) return { erreur: "inconnu" };
	if (digest){
		for (var i = 0; i < cles.length; i++){ var im = imageCataloguePort(cles[i]); if (im.digestDepot === digest) return { image: im, cle: cles[i] }; }
		var p = piegesContinentPort().filter(function(x){ return x.depot === nom && x.image.digestDepot === digest; })[0];
		if (p) return { image: copieJson(p.image), cle: null, piege: true };
		return { erreur: "manifeste" };
	}
	var piege = piegesContinentPort().filter(function(x){ return x.depot === nom && x.tags.indexOf(tag) > -1 && x.actif; })[0];
	if (piege) return { image: copieJson(piege.image), cle: null, piege: true };
	var cle = cles.filter(function(k){ return cat[k].tags.indexOf(tag) > -1; })[0];
	if (!cle) return { erreur: "manifeste" };
	return { image: imageCataloguePort(cle), cle: cle };
}
/* Les pièges du continent (inertes) : le cheval de bois de l'épreuve V, rangé dans l'état du chapitre quand il s'active. */
function piegesContinentPort(){
	var c = typeof sCh8 === "function" ? sCh8() : {};
	return (c.piegesContinent || []);
}
/* Active le cheval de bois : nginx:1.27-alpine pointe désormais vers une image qui ajoute la couche-témoin et ses Labels. */
function activerChevalDeBoisPort(){
	var c = sCh8();
	c.piegesContinent = c.piegesContinent || [];
	if (c.piegesContinent.some(function(p){ return p.cle === "cheval"; })) return c.piegesContinent.filter(function(p){ return p.cle === "cheval"; })[0];
	var base = imageCataloguePort("nginx");
	var img = copieJson(base);
	cataloguePort();
	img.couches = base.couches.concat([COUCHE_TEMOIN_PORT, COUCHE_FLOTTE_PORT]);
	img.historique = base.historique.slice(0, base.historique.length - 3).concat([
		{ created: "2026-10-17T23:41:07Z", created_by: "ADD temoin.txt /usr/local/share/flotte/temoin.txt # buildkit" },
		{ created: "2026-10-17T23:41:07Z", created_by: "COPY flotte.sh /etc/profile.d/flotte.sh # buildkit" },
		{ created: "2026-10-17T23:41:08Z", created_by: "LABEL port.constructeur=P.G. port.signature=" + signatureBastionPort(), empty_layer: true },
		{ created: "2026-10-17T23:41:08Z", created_by: "ENTRYPOINT [\"/bin/sh\" \"/etc/profile.d/flotte.sh\" \"/docker-entrypoint.sh\"]", empty_layer: true }]).concat(base.historique.slice(base.historique.length - 2));
	img.config.Entrypoint = ["/bin/sh", "/etc/profile.d/flotte.sh", "/docker-entrypoint.sh"];
	img.config.Labels = { "maintainer": "NGINX Docker Maintainers", "port.constructeur": "P.G.", "port.signature": signatureBastionPort() };
	img.cree = "2026-10-17T23:41:08Z";
	img.origine = "continent";
	img.id = sha256(configJsonPort(img));
	img.digestDepot = "sha256:" + sha256(manifestePort(null, img));
	var p = { cle: "cheval", depot: "nginx", tags: ["1.27-alpine", "1.27.2-alpine"], actif: true, image: img };
	c.piegesContinent.push(p);
	return p;
}
/* L'empreinte SSH (SHA256:...) de la clé d'hôte du Bastion (chapitre 5), comme ssh-keygen -l la calcule ici. */
function clePubliqueBastionPort(){ return "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("ch5-hostkey", 43); }
function empreinteSshPort(blob){
	var hex = sha256(blob), o = "";
	for (var i = 0; i < 64; i += 2) o += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
	return "SHA256:" + btoa(o).replace(/=+$/, "");
}
function signatureBastionPort(){ return empreinteSshPort(clePubliqueBastionPort().split(" ")[1]); }

function imagesPort(h){ var P = etatPort(h); return Object.keys(P.images).map(function(id){ return P.images[id]; }); }
/* Une image par tag (alpine, alpine:3.20, entrepot...:5000/ecole:1.0), digest (depot@sha256:...), id complet ou court. */
function imagePort(h, ref){
	if (!ref) return null;
	var P = etatPort(h), r = String(ref).trim(), id = r.replace(/^sha256:/, "");
	if (/^[0-9a-f]{4,64}$/.test(id)){
		var trouves = Object.keys(P.images).filter(function(k){ return k.indexOf(id) === 0; });
		if (trouves.length === 1) return P.images[trouves[0]];
	}
	var a = analyserRefPort(r);
	if (!a.valide) return null;
	var liste = imagesPort(h);
	if (a.digest){
		var parDigest = liste.filter(function(im){ return (im.digests || []).some(function(d){ var x = analyserRefPort(d); return x.court === a.court && x.digest === a.digest; }); })[0];
		if (parDigest) return parDigest;
		if (!a.tag) return null;
	}
	return liste.filter(function(im){ return (im.tags || []).indexOf(a.nomTag) > -1; })[0] || null;
}
function tagsPort(h, img){ return (img && img.tags) || []; }
function digestsPort(img){ return (img && img.digests) || []; }
function tailleImagePort(h, img){ return (img.couches || []).reduce(function(s, id){ var c = couchePort(h, id); return s + (c ? c.taille : 0); }, 0); }
function enleverTagPort(h, tag){
	imagesPort(h).forEach(function(im){ var i = (im.tags || []).indexOf(tag); if (i > -1){ im.tags.splice(i, 1); if (!im.tags.length) im.pendante = true; } });
}
/* Pose une image dans le magasin local et lui donne un tag (l'ancien porteur du tag le perd : il devient <none>). */
function poserImagePort(h, img, tag, digestRef){
	var P = etatPort(h);
	var existante = P.images[img.id];
	if (!existante){
		existante = copieJson(img);
		existante.tags = []; existante.digests = [];
		existante.ajoute = maintenantPort(h);
		P.images[img.id] = existante;
	}
	if (tag){
		var ancien = imagePort(h, tag);
		if (ancien && ancien.id !== existante.id){ enleverTagPort(h, analyserRefPort(tag).nomTag); evenementDockerPort(h, "image", "untag", ancien.id, { name: analyserRefPort(tag).nomTag }); }
		var nt = analyserRefPort(tag).nomTag;
		if (existante.tags.indexOf(nt) === -1) existante.tags.push(nt);
		existante.pendante = false;
	}
	if (digestRef){
		var d = analyserRefPort(digestRef);
		var texte = d.court + "@" + d.digest;
		if (existante.digests.indexOf(texte) === -1) existante.digests.push(texte);
	}
	return existante;
}
function imageUtiliseePort(h, img){
	return conteneursPort(h).some(function(c){ return c.image === img.id; });
}

/* ================================================================== */
/* Le démon : accès, configuration (daemon.json), événements            */
/* ================================================================== */

function demonActifPort(h){ return (estHoteDockerPort(h) && etatUnite(h, "docker.service").actif) || (h === HOTE_PODMAN_PORT && estHotePort(h)); }
/* Les groupes de la session du joueur sur cette machine : ceux de /etc/group au moment du ssh (comme le vrai). */
function groupesSessionPort(h){
	var P = etatPort(h);
	if (P.sessionGroupes) return P.sessionGroupes;
	return groupesMachine(h).filter(function(g){ return g.membres.indexOf(JOUEUR) > -1 || g.nom === JOUEUR; }).map(function(g){ return g.nom; });
}
GameEvents.addListener("ssh", function(e){
	try {
		var h = e.host;
		if (!estHotePort(h)) return;
		etatPort(h).sessionGroupes = groupesMachine(h).filter(function(g){ return g.membres.indexOf(JOUEUR) > -1 || g.nom === JOUEUR; }).map(function(g){ return g.nom; });
	} catch (x){}
});
/* L'accès au démon : root (sudo), ou membre du groupe docker dans CETTE session. */
function accesDemonPort(h, io, appel){
	if (MODE_PODMAN_PORT && h === HOTE_PODMAN_PORT) return true;
	if (!estHoteDockerPort(h)) throw new ShellError("bash: docker: command not found", 127);
	var actif = etatUnite(h, "docker.service").actif;
	// Le socket de systemd réveille le démon au premier appel (docker.socket), comme le vrai.
	if (!actif && etatUnite(h, "docker.socket").actif && !etatUnite(h, "docker.service").echec && (io.sudo || groupesSessionPort(h).indexOf("docker") > -1)){
		try { Shell.sorts.systemctl(["start", "docker.service"], { sudo: true, tty: false, stdin: null, code: 0, err: function(){}, errFin: function(){} }); } catch (e){}
		actif = etatUnite(h, "docker.service").actif;
	}
	if (!io.sudo && groupesSessionPort(h).indexOf("docker") === -1){
		throw new ShellError("permission denied while trying to connect to the Docker daemon socket at " + SOCKET_DOCKER_PORT + ": Get \"http://%2Fvar%2Frun%2Fdocker.sock/v" + API_DOCKER_PORT + "/" + (appel || "containers/json") + "\": dial unix /var/run/docker.sock: connect: permission denied" +
			astuce(io, groupesMachine(h).some(function(g){ return g.nom === "docker" && g.membres.indexOf(JOUEUR) > -1; }) ?
				"Tu es bien dans le groupe docker dans /etc/group, mais pas dans CETTE session : les groupes se lisent à la connexion. exit, puis ssh " + h + "." :
				"Le socket du démon appartient à root et au groupe docker (ls -l /var/run/docker.sock). sudo usermod -aG docker " + JOUEUR + ", puis une nouvelle session (exit, ssh " + h + ")."), 1);
	}
	if (!actif) throw new ShellError("Cannot connect to the Docker daemon at " + SOCKET_DOCKER_PORT + ". Is the docker daemon running?" + astuce(io, "Le démon dockerd ne tourne pas : systemctl status docker, puis sudo systemctl start docker."), 1);
	return true;
}
/* La configuration chargée au démarrage du démon (/etc/docker/daemon.json). */
var CLES_DAEMON_PORT = ["insecure-registries", "registry-mirrors", "log-driver", "log-opts", "userns-remap", "live-restore", "data-root", "default-address-pools", "bip", "dns", "icc",
	"no-new-privileges", "storage-driver", "max-concurrent-downloads", "debug", "experimental", "features", "default-ulimits", "iptables", "ip-forward", "hosts", "group", "selinux-enabled", "userland-proxy", "metrics-addr", "builder"];
function lireDaemonJsonPort(h){
	var t = texteHote(h, "/etc/docker/daemon.json");
	if (t === null || t.trim() === "") return { config: {} };
	var cfg;
	try { cfg = JSON.parse(t); } catch (e){
		var m = /position (\d+)/.exec(e.message || ""), car = m ? t.charAt(+m[1]) : "}";
		return { erreur: "unable to configure the Docker daemon with file /etc/docker/daemon.json: invalid character '" + (car === "\n" ? "\\n" : car) + "' looking for beginning of object key string" };
	}
	if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return { erreur: "unable to configure the Docker daemon with file /etc/docker/daemon.json: json: cannot unmarshal array into Go value of type map[string]interface {}" };
	var inconnues = Object.keys(cfg).filter(function(k){ return CLES_DAEMON_PORT.indexOf(k) === -1; });
	if (inconnues.length) return { erreur: "unable to configure the Docker daemon with file /etc/docker/daemon.json: the following directives don't match any configuration option: " + inconnues.join(", ") };
	if (cfg["insecure-registries"] && !Array.isArray(cfg["insecure-registries"])) return { erreur: "unable to configure the Docker daemon with file /etc/docker/daemon.json: json: cannot unmarshal string into Go struct field Config.insecure-registries of type []string" };
	if (cfg["log-opts"] && typeof cfg["log-opts"] !== "object") return { erreur: "unable to configure the Docker daemon with file /etc/docker/daemon.json: json: cannot unmarshal string into Go struct field Config.log-opts of type map[string]string" };
	return { config: cfg };
}
controleAvantDemarrage(function(h, unite, action){
	if (unite !== "docker.service" || !estHoteDockerPort(h) || action === "reload") return null;
	var r = lireDaemonJsonPort(h);
	if (r.erreur){ journalMachine(h, { unite: "dockerd", pid: 900 + condense(h) % 90, unit: "docker.service", prio: 3, message: r.erreur }); return "daemon.json"; }
	return null;
});
function configDemonPort(h){ return etatPort(h).daemon.config || {}; }
function registresNonSursPort(h){ return (configDemonPort(h)["insecure-registries"] || []).map(String); }
/* Le démon démarre : il relit daemon.json, puis relance les conteneurs qui doivent l'être. */
function demonDemarrePort(h){
	var P = etatPort(h), r = lireDaemonJsonPort(h);
	P.daemon.config = r.config || {};
	P.daemon.depuis = maintenantPort(h);
	P.daemon.demarrages = (P.daemon.demarrages || 0) + 1;
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Starting up" });
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Loading containers: start." });
	conteneursPort(h).forEach(function(c){
		var p = c.hote.restart.nom;
		if (c.swarm) return;
		if (p === "always" || (p === "unless-stopped" && !c.etat.arreteMain) || (c.etat.statut === "running" && configDemonPort(h)["live-restore"])){
			if (c.etat.statut !== "running") demarrerConteneurPort(h, c, { silencieux: true, raison: "daemon" });
		}
	});
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Loading containers: done." });
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Docker daemon commit=" + "411e817" + " containerd-snapshotter=false storage-driver=overlay2 version=" + VERSION_DOCKER_PORT });
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "API listen on /run/docker.sock" });
	evenementPort(h, "demon", { action: "demarre", config: P.daemon.config });
}
function demonArretePort(h){
	var P = etatPort(h);
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Processing signal 'terminated'" });
	conteneursPort(h).forEach(function(c){
		if (c.etat.statut === "running" || c.etat.statut === "restarting"){
			if (configDemonPort(h)["live-restore"]) return;
			arreterConteneurPort(h, c, { signal: 15, silencieux: true, parDemon: true });
		}
	});
	journalMachine(h, { unite: "dockerd", unit: "docker.service", message: "Daemon shutdown complete" });
	P.daemon.depuis = null;
	evenementPort(h, "demon", { action: "arrete" });
}
GameEvents.addListener("machine", function(e){
	try {
		if (e.cmd !== "unite" || e.unite !== "docker.service" || !estHoteDockerPort(e.hote)) return;
		if (e.action === "lancee" || e.action === "relancee") demonDemarrePort(e.hote);
		if (e.action === "arretee" || e.action === "morte") demonArretePort(e.hote);
	} catch (x){}
});
/* docker events : le journal des événements du démon. */
function evenementDockerPort(h, type, action, id, attrs){
	var P = etatPort(h);
	var e = { t: maintenantPort(h) + (P.evenements.length % 997), type: type, action: action, id: id, attrs: attrs || {} };
	P.evenements.push(e);
	if (P.evenements.length > 600) P.evenements.splice(0, P.evenements.length - 600);
	evenementPort(h, "evenement", { genre: type, action: action, id: id, attrs: attrs || {} });
	return e;
}
function evenementsPort(h, filtre){ return etatPort(h).evenements.filter(function(e){ return !filtre || filtre(e); }); }

/* ================================================================== */
/* Les réseaux                                                          */
/* ================================================================== */

function reseauxParDefautPort(h, P){
	var mk = function(nom, pilote, sousReseau, passerelle){
		var id = idPort("reseau:" + h + ":" + nom);
		P.reseaux[id] = { id: id, nom: nom, pilote: pilote, portee: "local", sousReseau: sousReseau, passerelle: passerelle, cree: maintenantMachine(h) - 86400000 * 3, interne: false, attachable: false, labels: {}, defaut: true, options: pilote === "bridge" ? { "com.docker.network.bridge.default_bridge": "true", "com.docker.network.bridge.enable_icc": "true", "com.docker.network.bridge.enable_ip_masquerade": "true", "com.docker.network.bridge.host_binding_ipv4": "0.0.0.0", "com.docker.network.bridge.name": "docker0", "com.docker.network.driver.mtu": "1500" } : {} };
	};
	mk("bridge", "bridge", "172.17.0.0/16", "172.17.0.1");
	mk("host", "host", null, null);
	mk("none", "null", null, null);
}
function reseauxPort(h){ var P = etatPort(h); return Object.keys(P.reseaux).map(function(k){ return P.reseaux[k]; }); }
function reseauPort(h, nom){
	if (!nom) return null;
	var l = reseauxPort(h);
	return l.filter(function(r){ return r.nom === nom; })[0] || l.filter(function(r){ return r.id === nom; })[0] || (String(nom).length >= 3 ? l.filter(function(r){ return r.id.indexOf(nom) === 0; })[0] : null) || null;
}
/* Un nouveau réseau défini par l'utilisateur : 172.18.0.0/16, puis 172.19... */
function creerReseauPort(h, nom, options){
	options = options || {};
	var P = etatPort(h);
	var pris = reseauxPort(h).map(function(r){ return r.sousReseau; });
	var sous = options.sousReseau, pass = options.passerelle;
	if (!sous){
		for (var n = 18; n < 32; n++){ if (pris.indexOf("172." + n + ".0.0/16") === -1){ sous = "172." + n + ".0.0/16"; break; } }
		if (!sous){ for (var k = 0; k < 250; k++){ if (pris.indexOf("192.168." + (k * 16) + ".0/20") === -1){ sous = "192.168." + (k * 16) + ".0/20"; break; } } }
	}
	if (!pass && sous) pass = sous.replace(/\.0\/\d+$/, ".1");
	var id = idPort("reseau:" + h + ":" + nom + ":" + compteurPort(h));
	var r = { id: id, nom: nom, pilote: options.pilote || "bridge", portee: options.pilote === "overlay" ? "swarm" : "local", sousReseau: sous, passerelle: pass, cree: maintenantPort(h),
		interne: !!options.interne, attachable: !!options.attachable, labels: options.labels || {}, options: options.opts || {}, compose: options.compose || null, defaut: false, ingress: !!options.ingress };
	P.reseaux[id] = r;
	evenementDockerPort(h, "network", "create", id, { name: nom, type: r.pilote });
	return r;
}
function prefixeReseauPort(r){ return r.sousReseau ? r.sousReseau.replace(/\.\d+\/\d+$/, ".") : null; }
/* Une adresse libre dans un réseau (la passerelle prend .1). */
function adresseLibrePort(h, r){
	if (!r.sousReseau) return "";
	var P = etatPort(h), base = r.sousReseau.split("/")[0].split(".").map(Number);
	var prises = {};
	conteneursPort(h).forEach(function(c){ var x = c.reseaux && c.reseaux[r.nom]; if (x && x.ip) prises[x.ip] = true; });
	for (var n = 2; n < 65000; n++){
		var ip = base[0] + "." + base[1] + "." + (base[2] + Math.floor(n / 256)) + "." + (n % 256);
		if (n % 256 === 0 || n % 256 === 255) continue;
		if (!prises[ip]) return ip;
	}
	return "";
}
function macPort(ip){ return "02:42:" + String(ip || "0.0.0.0").split(".").map(function(x){ return ("0" + (+x).toString(16)).slice(-2); }).join(":"); }
function connecterPort(h, c, r, alias){
	c.reseaux = c.reseaux || {};
	if (c.reseaux[r.nom]) return false;
	var ip = r.pilote === "bridge" || r.pilote === "overlay" ? adresseLibrePort(h, r) : "";
	c.reseaux[r.nom] = { id: r.id, ip: ip, alias: (alias || []).slice(), passerelle: r.passerelle || "", mac: ip ? macPort(ip) : "", endpoint: idPort("ep:" + c.id + ":" + r.id) };
	evenementDockerPort(h, "network", "connect", r.id, { container: c.id, name: r.nom, type: r.pilote });
	return true;
}
function deconnecterPort(h, c, r){
	if (!c.reseaux || !c.reseaux[r.nom]) return false;
	delete c.reseaux[r.nom];
	evenementDockerPort(h, "network", "disconnect", r.id, { container: c.id, name: r.nom, type: r.pilote });
	return true;
}

/* ================================================================== */
/* Les volumes                                                          */
/* ================================================================== */

function cheminVolumePort(nom){ return "/var/lib/docker/volumes/" + nom + "/_data"; }
function volumesPort(h){ var P = etatPort(h); return Object.keys(P.volumes).map(function(k){ return P.volumes[k]; }); }
function volumePort(h, nom){ return etatPort(h).volumes[nom] || null; }
function creerVolumePort(h, nom, options){
	options = options || {};
	var P = etatPort(h);
	if (!nom) nom = hexDe("volume:" + h + ":" + compteurPort(h), 64);
	if (P.volumes[nom]) return P.volumes[nom];
	var v = { nom: nom, pilote: "local", cree: maintenantPort(h), labels: options.labels || {}, anonyme: !!options.anonyme, options: options.opts || {}, compose: options.compose || null };
	P.volumes[nom] = v;
	moteurSeul(function(){
		var d = creerDossierHote(h, "/var/lib/docker/volumes/" + nom, { mode: "rwx-----x" });
		creerDossierHote(h, cheminVolumePort(nom), { mode: "rwxr-xr-x" });
	});
	evenementDockerPort(h, "volume", "create", nom, { driver: "local" });
	return v;
}
function supprimerVolumePort(h, nom){
	var P = etatPort(h);
	if (!P.volumes[nom]) return false;
	delete P.volumes[nom];
	moteurSeul(function(){ var d = dossierHote(h, "/var/lib/docker/volumes"); if (d){ var x = d.getChildFromName(nom); if (x && x !== -1) supprimerArbreHotePort(d, x); } });
	evenementDockerPort(h, "volume", "destroy", nom, { driver: "local" });
	return true;
}
function supprimerArbreHotePort(parent, lieu){
	var i = parent.children.indexOf(lieu);
	if (i > -1) parent.children.splice(i, 1);
}
function volumeUtilisePort(h, nom){ return conteneursPort(h).filter(function(c){ return (c.hote.montages || []).some(function(m){ return m.type === "volume" && m.source === nom; }); }); }
/* La taille d'un volume (les fichiers sous _data). */
function tailleDossierHotePort(lieu){
	if (!lieu) return 0;
	var t = 0;
	lieu.items.forEach(function(it){ t += tailleObjetMachine(it); });
	lieu.children.forEach(function(c){ if (c.parents[0] === lieu) t += tailleDossierHotePort(c); });
	return t;
}

/* ================================================================== */
/* Les conteneurs : l'état, les noms                                    */
/* ================================================================== */

var ADJECTIFS_PORT = ["calme", "vif", "brave", "sage", "fier", "leste", "agile", "hardi", "serein", "prompt", "solide", "discret", "joyeux", "patient", "vaillant", "rieur", "tenace", "rapide", "loyal", "curieux"];
var NOMS_MARINS_PORT = ["goeland", "cormoran", "phoque", "dauphin", "mouette", "sterne", "macareux", "albatros", "homard", "crabe", "marsouin", "petrel", "balbuzard", "bigorneau", "narval", "orque", "pingouin", "requin", "espadon", "baleine"];
function nomAutoPort(h){
	for (var k = 0; k < 400; k++){
		var n = etatPort(h).compteur + k;
		var nom = ADJECTIFS_PORT[Math.floor(alea("adj:" + h + ":" + n) * ADJECTIFS_PORT.length)] + "_" + NOMS_MARINS_PORT[Math.floor(alea("nom:" + h + ":" + n) * NOMS_MARINS_PORT.length)];
		if (!conteneurPort(h, nom)) return nom;
	}
	return "matelot_" + etatPort(h).compteur;
}
function conteneursPort(h){
	if (!estHotePort(h) && !(state.reseau && state.reseau.machines && state.reseau.machines[h])) return [];
	var P = etatPort(h);
	return Object.keys(P.conteneurs).map(function(k){ return P.conteneurs[k]; }).sort(function(a, b){ return b.cree - a.cree || (b.ordre || 0) - (a.ordre || 0); });
}
/* Un conteneur par nom, id complet ou préfixe d'id. */
function conteneurPort(h, ref){
	if (!ref) return null;
	var P = etatPort(h), r = String(ref).replace(/^\//, "");
	if (P.conteneurs[r]) return P.conteneurs[r];
	var parNom = Object.keys(P.conteneurs).filter(function(k){ return P.conteneurs[k].nom === r; })[0];
	if (parNom) return P.conteneurs[parNom];
	if (/^[0-9a-f]+$/.test(r)){
		var l = Object.keys(P.conteneurs).filter(function(k){ return k.indexOf(r) === 0; });
		if (l.length === 1) return P.conteneurs[l[0]];
		if (l.length > 1) return { ambigu: true };
	}
	return null;
}
function enMarchePort(c){ return !!c && (c.etat.statut === "running" || c.etat.statut === "paused"); }
function santePort(c){ return c && c.etat.sante ? c.etat.sante.statut : null; }
function nomImageConteneurPort(h, c){ return c.imageRef || courtPort(c.image); }
/* L'image d'un conteneur (même si elle a perdu son tag). */
function imageDuConteneurPort(h, c){ return etatPort(h).images[c.image] || null; }

/* Les capacités qu'un conteneur garde (la liste par défaut de docker, moins --cap-drop, plus --cap-add). */
var CAPS_DEFAUT_PORT = ["CHOWN", "DAC_OVERRIDE", "FSETID", "FOWNER", "MKNOD", "NET_RAW", "SETGID", "SETUID", "SETFCAP", "SETPCAP", "NET_BIND_SERVICE", "SYS_CHROOT", "KILL", "AUDIT_WRITE"];
var CAPS_TOUTES_PORT = CAPS_DEFAUT_PORT.concat(["SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "SYS_MODULE", "SYS_RAWIO", "SYS_TIME", "SYS_RESOURCE", "SYS_NICE", "SYS_BOOT", "IPC_LOCK", "IPC_OWNER", "DAC_READ_SEARCH", "LINUX_IMMUTABLE", "NET_BROADCAST", "SYS_PACCT", "SYS_TTY_CONFIG", "LEASE", "AUDIT_CONTROL", "MAC_OVERRIDE", "MAC_ADMIN", "SYSLOG", "WAKE_ALARM", "BLOCK_SUSPEND", "AUDIT_READ", "PERFMON", "BPF", "CHECKPOINT_RESTORE"]);
function capsPort(c){
	if (c.hote.privileged) return CAPS_TOUTES_PORT.slice();
	var drop = (c.hote.capDrop || []).map(function(x){ return String(x).toUpperCase().replace(/^CAP_/, ""); });
	var add = (c.hote.capAdd || []).map(function(x){ return String(x).toUpperCase().replace(/^CAP_/, ""); });
	var base = drop.indexOf("ALL") > -1 ? [] : CAPS_DEFAUT_PORT.filter(function(x){ return drop.indexOf(x) === -1; });
	if (add.indexOf("ALL") > -1) return CAPS_TOUTES_PORT.slice();
	add.forEach(function(x){ if (base.indexOf(x) === -1) base.push(x); });
	return base;
}
function aCapPort(c, cap){ return capsPort(c).indexOf(cap) > -1; }
function sansNouveauxPrivilegesPort(c){ return (c.hote.secOpt || []).some(function(s){ return /^no-new-privileges(:true|=true)?$/.test(s); }); }

/* L'environnement d'un conteneur : celui de l'image, puis -e et --env-file. */
function envConteneurPort(c){
	var m = {};
	(c.config.Env || []).forEach(function(e){ var i = e.indexOf("="); if (i > 0) m[e.substring(0, i)] = e.substring(i + 1); else m[e] = ""; });
	return m;
}
/* Le compte qui fait tourner un conteneur : { nom, uid, gid } lu dans le /etc/passwd du conteneur. */
function utilisateurConteneurPort(h, c, demande){
	var u = demande !== undefined && demande !== null && demande !== "" ? String(demande) : (c.config.User || "");
	if (!u || u === "root" || u === "0") return { nom: "root", uid: 0, gid: 0 };
	var parts = u.split(":"), qui = parts[0], groupe = parts[1];
	var passwd = lireFichierConteneurPort(h, c, "/etc/passwd") || "";
	var ligne = passwd.split("\n").filter(function(l){ var x = l.split(":"); return x[0] === qui || (/^\d+$/.test(qui) && x[2] === qui); })[0];
	var r;
	if (ligne){ var x = ligne.split(":"); r = { nom: x[0], uid: +x[2], gid: +x[3] }; }
	else if (/^\d+$/.test(qui)) r = { nom: qui, uid: +qui, gid: 0, inconnu: true };
	else return { erreur: "unable to find user " + qui + ": no matching entries in passwd file" };
	if (groupe !== undefined){
		if (/^\d+$/.test(groupe)) r.gid = +groupe;
		else {
			var gl = (lireFichierConteneurPort(h, c, "/etc/group") || "").split("\n").filter(function(l){ return l.split(":")[0] === groupe; })[0];
			if (!gl) return { erreur: "unable to find group " + groupe + ": no matching entries in group file" };
			r.gid = +gl.split(":")[2];
		}
	}
	return r;
}

/* ================================================================== */
/* Créer un conteneur                                                   */
/* ================================================================== */

/*
 * o (les options de docker run / create, déjà lues) :
 *   { nom, image (réf), cmd: [..] | null, entrypoint: [..] | null, env: ["K=V"], user, workdir, tty, interactif, ports: [{ip, hp, cp, proto}],
 *     publierTout, montages: [{type, source, cible, ro}], tmpfs: {chemin: options}, reseau, alias: [], restart: {nom, max}, memoire, cpus,
 *     readOnly, capDrop, capAdd, secOpt, privileged, pidsLimit, log: {type, opts}, labels, hostname, autoRemove, init, sante: {...} | false,
 *     compose: {projet, service, numero}, swarm: {service, tache}, secrets: [{source, cible}], arreter: signal }
 */
function creerConteneurPort(h, img, o, imageRef){
	var P = etatPort(h);
	if (o.nom && conteneurPort(h, o.nom) && !conteneurPort(h, o.nom).ambigu){
		var autre = conteneurPort(h, o.nom);
		throw new ShellError("docker: Error response from daemon: Conflict. The container name \"/" + o.nom + "\" is already in use by container \"" + autre.id + "\". You have to remove (or rename) that container to be able to reuse that name.\n\nSee 'docker run --help'.", 125);
	}
	if (o.nom && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(o.nom)) throw new ShellError("docker: Error response from daemon: Invalid container name (" + o.nom + "), only [a-zA-Z0-9][a-zA-Z0-9_.-] are allowed.\n\nSee 'docker run --help'.", 125);
	if (o.memoire && o.memoire < 6 * 1024 * 1024) throw new ShellError("docker: Error response from daemon: Minimum memory limit allowed is 6MB.\n\nSee 'docker run --help'.", 125);
	var n = compteurPort(h);
	var id = idPort("conteneur:" + h + ":" + n + ":" + (o.nom || "") + ":" + img.id);
	var nom = o.nom || nomAutoPort(h);
	var cfgImg = img.config || {};
	var env = (cfgImg.Env || []).slice();
	(o.env || []).forEach(function(e){
		var k = e.split("=")[0];
		env = env.filter(function(x){ return x.split("=")[0] !== k; });
		env.push(e);
	});
	var sante = null;
	if (o.sante === false) sante = { Test: ["NONE"] };
	else if (o.sante) sante = o.sante;
	else if (cfgImg.Healthcheck) sante = copieJson(cfgImg.Healthcheck);
	var exposes = copieJson(cfgImg.ExposedPorts || {});
	(o.ports || []).forEach(function(p){ exposes[p.cp + "/" + (p.proto || "tcp")] = {}; });
	(o.expose || []).forEach(function(p){ exposes[String(p).indexOf("/") > -1 ? p : p + "/tcp"] = {}; });
	var labels = copieJson(cfgImg.Labels || {});
	Object.keys(o.labels || {}).forEach(function(k){ labels[k] = o.labels[k]; });
	var hostname = o.hostname || (o.reseau === "host" ? h : id.substring(0, 12));
	var c = {
		id: id, nom: nom, image: img.id, imageRef: imageRef || img.id, cree: maintenantPort(h), ordre: n,
		config: {
			Hostname: hostname, Domainname: "", User: o.user !== undefined && o.user !== null ? o.user : (cfgImg.User || ""), AttachStdin: !!o.interactif && !o.detache, AttachStdout: !o.detache, AttachStderr: !o.detache,
			ExposedPorts: exposes, Tty: !!o.tty, OpenStdin: !!o.interactif, StdinOnce: !!o.interactif && !o.detache, Env: env,
			Cmd: o.cmd ? o.cmd.slice() : (o.entrypoint ? null : (cfgImg.Cmd ? cfgImg.Cmd.slice() : null)),
			Healthcheck: sante, Image: imageRef || img.id, Volumes: copieJson(cfgImg.Volumes || null), WorkingDir: o.workdir || cfgImg.WorkingDir || "",
			Entrypoint: o.entrypoint ? (o.entrypoint[0] === "" ? null : o.entrypoint.slice()) : (cfgImg.Entrypoint ? cfgImg.Entrypoint.slice() : null), OnBuild: null, Labels: labels,
			StopSignal: o.arreter || cfgImg.StopSignal || null
		},
		hote: {
			ports: (o.ports || []).map(function(p){ return { ip: p.ip || "", hp: p.hp, cp: p.cp, proto: p.proto || "tcp" }; }), publierTout: !!o.publierTout,
			montages: (o.montages || []).map(function(m){ return copieJson(m); }), tmpfs: copieJson(o.tmpfs || {}), readOnly: !!o.readOnly,
			capDrop: (o.capDrop || []).slice(), capAdd: (o.capAdd || []).slice(), secOpt: (o.secOpt || []).slice(), privileged: !!o.privileged, pidsLimit: o.pidsLimit || null,
			restart: o.restart || { nom: "no", max: 0 }, memoire: o.memoire || 0, cpus: o.cpus || 0, log: o.log || { type: configDemonPort(h)["log-driver"] || "json-file", opts: copieJson(configDemonPort(h)["log-opts"] || {}) },
			reseau: o.reseau || "default", autoRemove: !!o.autoRemove, init: !!o.init, userns: configDemonPort(h)["userns-remap"] ? "remap" : "", rootless: MODE_PODMAN_PORT === "rootless" && h === HOTE_PODMAN_PORT
		},
		reseaux: {}, etat: { statut: "created", code: 0, oom: false, debut: null, fin: null, pid: 0, redemarrages: 0, arreteMain: false, sante: null, erreur: "" },
		diff: {}, tmpfsDonnees: {}, journaux: [], compose: o.compose || null, swarm: o.swarm || null, secrets: (o.secrets || []).slice(), processus: [],
		memoire: 0, reseauIO: [0, 0], disqueIO: [0, 0]
	};
	if (c.hote.log && !c.hote.log.opts) c.hote.log.opts = {};
	// Les volumes anonymes des VOLUME de l'image (s'ils ne sont pas déjà montés).
	Object.keys(cfgImg.Volumes || {}).forEach(function(cible){
		if (c.hote.montages.some(function(m){ return cheminNormal(m.cible) === cheminNormal(cible); })) return;
		var v = creerVolumePort(h, null, { anonyme: true });
		c.hote.montages.push({ type: "volume", source: v.nom, cible: cible, ro: false, anonyme: true });
	});
	// Les volumes nommés qui n'existent pas encore sont créés.
	c.hote.montages.forEach(function(m){ if (m.type === "volume" && !volumePort(h, m.source)) creerVolumePort(h, m.source); });
	P.conteneurs[id] = c;
	// Le réseau
	var r = c.hote.reseau === "default" ? reseauPort(h, "bridge") : reseauPort(h, c.hote.reseau);
	if (c.hote.reseau !== "default" && !r && !/^container:/.test(c.hote.reseau)){
		delete P.conteneurs[id];
		throw new ShellError("docker: Error response from daemon: network " + c.hote.reseau + " not found.\n\nSee 'docker run --help'.", 125);
	}
	if (r && r.pilote !== "host" && r.pilote !== "null") connecterPort(h, c, r, o.alias);
	else if (r) c.reseaux[r.nom] = { id: r.id, ip: "", alias: [], passerelle: "", mac: "", endpoint: idPort("ep:" + id + ":" + r.id) };
	if (r && r.pilote === "bridge" && !r.defaut) c.reseaux[r.nom].alias = (o.alias || []).concat([id.substring(0, 12)]);
	// Les fichiers de l'hôte pour ce conteneur.
	moteurSeul(function(){
		creerDossierHote(h, "/var/lib/docker/containers/" + id, { mode: "rwx--x---" });
		poserFichierHote(h, "/var/lib/docker/containers/" + id + "/config.v2.json", "{\"ID\":\"" + id + "\",\"Name\":\"/" + nom + "\"}", { mode: "rw-------" });
		poserFichierHote(h, "/var/lib/docker/containers/" + id + "/hostname", hostname + "\n");
	});
	// Un volume vide reçoit le contenu de l'image à l'endroit où il est monté.
	c.hote.montages.forEach(function(m){ if (m.type === "volume" && !m.nocopy) copierDansVolumeVidePort(h, c, m); });
	evenementDockerPort(h, "container", "create", id, { image: c.imageRef, name: nom });
	return c;
}
function copierDansVolumeVidePort(h, c, m){
	var d = dossierHote(h, cheminVolumePort(m.source));
	if (!d || d.items.length || d.children.some(function(x){ return x.parents[0] === d; })) return;
	var vue = vueImagePort(h, imageDuConteneurPort(h, c) || { couches: [] });
	var cible = cheminNormal(m.cible), pref = cible === "/" ? "/" : cible + "/";
	var base = vue[cible];
	moteurSeul(function(){
		if (base && base.t === "d"){ d.owner = nomHotePourUidPort(h, base.u); d.mode = base.m; }
		Object.keys(vue).filter(function(p){ return p.indexOf(pref) === 0; }).sort().forEach(function(p){
			var e = vue[p], hp = cheminVolumePort(m.source) + "/" + p.substring(pref.length);
			ecrireEntreeHotePort(h, hp, e);
		});
	});
}
/* Le nom d'un uid sur l'hôte (ls -l y montre 70 ou 999 si l'hôte ne connaît pas ce compte). */
function nomHotePourUidPort(h, uid){
	if (uid === 0 || uid === undefined || uid === null) return "root";
	var l = (texteHote(h, "/etc/passwd") || "").split("\n").filter(function(x){ return x.split(":")[2] === String(uid); })[0];
	return l ? l.split(":")[0] : String(uid);
}
function uidHotePort(h, nom){
	if (nom === "root") return 0;
	if (/^\d+$/.test(String(nom))) return +nom;
	return uidMachine(h, nom);
}
/* Écrire une entrée de conteneur sur le disque de l'hôte (un volume, un montage). */
function ecrireEntreeHotePort(h, chemin, e){
	if (e.t === "d"){ var d = creerDossierHote(h, chemin, {}); if (d){ d.owner = nomHotePourUidPort(h, e.u); d.mode = e.m; } return d; }
	var it = poserFichierHote(h, chemin, e.c !== undefined ? e.c : "", e.t === "l" ? { lien: e.l } : {});
	if (!it) return null;
	it.owner = nomHotePourUidPort(h, e.u);
	if (e.t !== "l") it.mode = e.m;
	if (e.c === undefined && e.t === "f") it.taille = e.s || 0; else if (it.taille !== undefined && e.c !== undefined) delete it.taille;
	if (e.archive){ it.archive = e.archive; }
	if (e.comp){ it.comp = e.comp; if (e.comp.algo === "gzip") it.gzip = { contenu: "", nom: e.comp.nom }; it.taille = e.s; }
	if (e.x) it.binaire = { sortie: "", prog: e.x };
	it.mtimeMs = maintenantPort(h);
	return it;
}

/* ================================================================== */
/* Démarrer, arrêter, supprimer                                         */
/* ================================================================== */

/* Les ports publiés : conflit avec un autre conteneur ou un service de l'hôte. */
function portsPrisPort(h, sauf){
	var pris = [];
	conteneursPort(h).forEach(function(c){
		if (c === sauf || !enMarchePort(c)) return;
		portsPubliesPort(h, c).forEach(function(p){ pris.push({ ip: p.ip || "0.0.0.0", port: +p.hp, proto: p.proto, c: c }); });
		if (c.hote.reseau === "host") (c.ecoutes || []).forEach(function(port){ pris.push({ ip: "0.0.0.0", port: port, proto: "tcp", c: c }); });
	});
	procsMachine(h).forEach(function(p){ if (!p.conteneur && p.comm !== "docker-proxy") (p.ports || []).forEach(function(port){ pris.push({ ip: "0.0.0.0", port: +port, proto: "tcp", proc: p }); }); });
	if (etatPort(h).swarmPorts) etatPort(h).swarmPorts.forEach(function(x){ pris.push({ ip: "0.0.0.0", port: +x.port, proto: "tcp", service: x.service }); });
	return pris;
}
/* Les ports publiés d'un conteneur, avec -P résolu (ports hauts choisis par le démon). */
function portsPubliesPort(h, c){
	var l = (c.hote.ports || []).map(function(p){ return { ip: p.ip, hp: p.hp, cp: p.cp, proto: p.proto || "tcp" }; });
	if (c.hote.publierTout){
		var attribues = c.portsAuto || {};
		Object.keys(c.config.ExposedPorts || {}).forEach(function(k){
			var cp = +k.split("/")[0];
			if (l.some(function(p){ return +p.cp === cp; })) return;
			if (attribues[k]) l.push({ ip: "", hp: attribues[k], cp: cp, proto: k.split("/")[1] || "tcp" });
		});
	}
	return l.filter(function(p){ return p.hp !== undefined && p.hp !== null && p.hp !== ""; });
}
function attribuerPortsAutoPort(h, c){
	if (!c.hote.publierTout) return;
	c.portsAuto = c.portsAuto || {};
	var pris = portsPrisPort(h, c).map(function(x){ return x.port; }), prochain = 32768;
	Object.keys(c.config.ExposedPorts || {}).sort().forEach(function(k){
		if (c.portsAuto[k]) return;
		while (pris.indexOf(prochain) > -1) prochain++;
		c.portsAuto[k] = prochain; pris.push(prochain); prochain++;
	});
}

/*
 * Démarrer : les vérifications du démon (ports, image en quarantaine, utilisateur, exécutable), puis le programme.
 * Renvoie { ok, erreur } ; lève une ShellError au texte de docker si options.lever.
 */
function demarrerConteneurPort(h, c, options){
	options = options || {};
	var img = imageDuConteneurPort(h, c);
	var echec = function(message, code, garder){
		c.etat.statut = garder || (c.etat.debut ? "exited" : "created");
		c.etat.code = code;
		c.etat.erreur = message.replace(/^docker: Error response from daemon: /, "");
		if (!options.silencieux) evenementDockerPort(h, "container", "die", c.id, { exitCode: String(code), image: c.imageRef, name: c.nom });
		return { ok: false, erreur: message, code: code };
	};
	if (enMarchePort(c)) return { ok: true, deja: true };
	if (quarantainePort(h, img)){
		return echec("docker: Error response from daemon: failed to create task for container: image " + courtPort(img.id) + " is held in quarantine on " + h + ": refusing to start it", 125);
	}
	// Les ports publiés
	attribuerPortsAutoPort(h, c);
	var pris = portsPrisPort(h, c);
	var publies = portsPubliesPort(h, c);
	for (var i = 0; i < publies.length; i++){
		var p = publies[i];
		var conflit = pris.filter(function(x){ return x.port === +p.hp && x.proto === (p.proto || "tcp") && (x.ip === "0.0.0.0" || !p.ip || p.ip === "0.0.0.0" || x.ip === p.ip); })[0];
		if (conflit){
			var msg = "docker: Error response from daemon: driver failed programming external connectivity on endpoint " + c.nom + " (" + idPort("ep:" + c.id).substring(0, 64) + "): Bind for " + (p.ip || "0.0.0.0") + ":" + p.hp + " failed: port is already allocated";
			if (conflit.proc) msg = "docker: Error response from daemon: driver failed programming external connectivity on endpoint " + c.nom + " (" + idPort("ep:" + c.id) + "): failed to bind port " + (p.ip || "0.0.0.0") + ":" + p.hp + "/tcp: Error starting userland proxy: listen tcp4 " + (p.ip || "0.0.0.0") + ":" + p.hp + ": bind: address already in use";
			return echec(msg, 128);
		}
	}
	if (c.hote.reseau === "host" && publies.length) c.avertissementHost = true;
	// Un conteneur dont le réseau a disparu
	var nomsReseaux = Object.keys(c.reseaux || {});
	for (var k = 0; k < nomsReseaux.length; k++){
		if (!reseauPort(h, nomsReseaux[k]) && !/^container:/.test(c.hote.reseau)) return echec("docker: Error response from daemon: network " + nomsReseaux[k] + " not found", 128);
	}
	// L'utilisateur
	var u = utilisateurConteneurPort(h, c);
	if (u.erreur) return echec("docker: Error response from daemon: " + u.erreur, 128);
	// Le programme
	var r = lancerProgrammePort(h, c, options);
	if (r.erreurDemon) return echec("docker: Error response from daemon: " + r.erreurDemon + ".\nSee 'docker run --help'.", 125);
	if (r.erreurOci){
		return echec("docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: " + r.erreurOci + ": unknown", r.code || 127);
	}
	return { ok: true };
}
/* L'image d'un éclaireur : en quarantaine, on la lit, on ne la lance jamais. */
function quarantainePort(h, img){
	if (!img) return false;
	return img.quarantaine === true || (img.config && img.config.Labels && img.config.Labels["org.opencontainers.image.title"] === "eclaireur");
}

/* Le conteneur tourne : processus sur l'hôte, docker-proxy pour chaque port publié. */
function marquerEnMarchePort(h, c, prog){
	c.etat.statut = "running";
	c.etat.debut = maintenantPort(h) + 1;
	c.etat.fin = null;
	c.etat.code = 0;
	c.etat.oom = false;
	c.etat.erreur = "";
	c.programme = prog;
	c.memoire = prog.memoire || 4 * 1048576;
	c.ecoutes = (prog.ecoutes || []).slice();
	retirerProcessusConteneurPort(h, c);
	var shim = h === HOTE_PODMAN_PORT ? lancerProcessusMachine(h, { comm: "conmon", cmd: "/usr/bin/conmon --api-version 1 -c " + c.id + " -u " + c.id + " -r /usr/bin/crun -n " + c.nom, user: c.hote.rootless ? JOUEUR : "root", rss: 2100, conteneur: c.id, shim: true }) :
		lancerProcessusMachine(h, { comm: "containerd-shim", cmd: "/usr/bin/containerd-shim-runc-v2 -namespace moby -id " + c.id + " -address /run/containerd/containerd.sock", user: "root", rss: 13200, conteneur: c.id, shim: true });
	var procs = prog.processus && prog.processus.length ? prog.processus : [{ user: 0, cmd: (prog.argv || []).join(" ") || "sh" }];
	var premier = null;
	var uidH = function(uid){ if (c.hote.rootless) return !+uid ? JOUEUR : String(100000 + (+uid) - 1); return nomHotePourUidPort(h, c.hote.userns ? 100000 + (+uid || 0) : uid); };
	procs.forEach(function(p, i){
		var proc = lancerProcessusMachine(h, { comm: String(p.comm || p.cmd.split(/\s+/)[0]).split("/").pop().substring(0, 15), cmd: p.cmd, user: uidH(p.user), rss: Math.round((p.rss || c.memoire / procs.length) / 1024), cpu: p.cpu || 0, conteneur: c.id, ppid: i === 0 ? shim.pid : (premier ? premier.pid : shim.pid) });
		if (i === 0) premier = proc;
	});
	c.etat.pid = premier.pid;
	c.etat.shim = shim.pid;
	publierPortsHotePort(h, c);
	if (c.etat.sante === null && c.config.Healthcheck && !(c.config.Healthcheck.Test && c.config.Healthcheck.Test[0] === "NONE")) c.etat.sante = { statut: "starting", echecs: 0, journal: [] };
	else if (c.etat.sante) { c.etat.sante.statut = "starting"; c.etat.sante.echecs = 0; c.etat.sante.debut = maintenantPort(h); }
	if (c.etat.sante) c.etat.sante.debut = maintenantPort(h);
	evenementDockerPort(h, "container", "start", c.id, { image: c.imageRef, name: c.nom });
}
function publierPortsHotePort(h, c){
	portsPubliesPort(h, c).forEach(function(p){
		var ip = (c.reseaux && Object.keys(c.reseaux).map(function(k){ return c.reseaux[k].ip; }).filter(Boolean)[0]) || "";
		[p.ip || "0.0.0.0"].concat(p.ip ? [] : ["::"]).forEach(function(adr){
			if (h === HOTE_PODMAN_PORT){ lancerProcessusMachine(h, { comm: "rootlessport", cmd: "rootlessport", user: c.hote.rootless ? JOUEUR : "root", rss: 7400, conteneur: c.id, proxy: true, portHote: +p.hp, ipHote: adr }); return; }
			lancerProcessusMachine(h, { comm: "docker-proxy", cmd: "/usr/sbin/docker-proxy -proto " + (p.proto || "tcp") + " -host-ip " + adr + " -host-port " + p.hp + " -container-ip " + ip + " -container-port " + p.cp, user: "root", rss: 3700, conteneur: c.id, proxy: true, portHote: +p.hp, ipHote: adr });
		});
	});
}
function retirerProcessusConteneurPort(h, c){
	procsMachine(h).filter(function(p){ return p.conteneur === c.id; }).forEach(function(p){ retirerProcessus(h, p); });
}
/* Le programme s'est arrêté (fin normale, erreur, signal, OOM) : la politique de redémarrage décide. */
function conteneurMortPort(h, c, code, raison){
	if (!enMarchePort(c) && c.etat.statut !== "created") return;
	retirerProcessusConteneurPort(h, c);
	c.etat.statut = "exited";
	c.etat.code = code;
	c.etat.fin = maintenantPort(h) + 2;
	c.etat.pid = 0;
	c.ecoutes = [];
	c.tmpfsDonnees = {};
	if (raison === "oom"){ c.etat.oom = true; evenementDockerPort(h, "container", "oom", c.id, { image: c.imageRef, name: c.nom }); }
	evenementDockerPort(h, "container", "die", c.id, { exitCode: String(code), image: c.imageRef, name: c.nom });
	if (c.etat.sante) c.etat.sante.statut = "unhealthy";
	if (c.swarm){ tacheSwarmMortePort(h, c, code); return; }
	var p = c.hote.restart;
	var relancer = p.nom === "always" || p.nom === "unless-stopped" || (p.nom === "on-failure" && code !== 0 && (!p.max || c.etat.redemarrages < p.max));
	if (relancer && raison !== "main" && demonActifPort(h)){
		c.etat.statut = "restarting";
		c.etat.relanceA = (etatMachine(h).tics || 0) + 1;
		return;
	}
	if (c.hote.autoRemove) supprimerConteneurPort(h, c, true);
}
function arreterConteneurPort(h, c, options){
	options = options || {};
	if (c.etat.statut === "restarting"){ c.etat.statut = "exited"; c.etat.arreteMain = !options.parDemon; return true; }
	if (!enMarchePort(c)) return false;
	var signal = options.signal || 15;
	var prog = c.programme || {};
	var code = signal === 9 ? 137 : (prog.arretPropre === false ? 137 : (prog.codeArret !== undefined ? prog.codeArret : (signal === 15 ? 0 : 128 + signal)));
	if (options.signal === 9) evenementDockerPort(h, "container", "kill", c.id, { image: c.imageRef, name: c.nom, signal: "9" });
	else if (!options.kill) evenementDockerPort(h, "container", "kill", c.id, { image: c.imageRef, name: c.nom, signal: String(signal) });
	journaliserArretPort(h, c, signal);
	retirerProcessusConteneurPort(h, c);
	c.etat.statut = "exited";
	c.etat.code = code;
	c.etat.fin = maintenantPort(h) + 3;
	c.etat.pid = 0;
	c.ecoutes = [];
	c.tmpfsDonnees = {};
	if (!options.parDemon) c.etat.arreteMain = true;
	if (c.etat.sante) c.etat.sante.statut = "unhealthy";
	evenementDockerPort(h, "container", "die", c.id, { exitCode: String(code), image: c.imageRef, name: c.nom });
	if (!options.kill) evenementDockerPort(h, "container", "stop", c.id, { image: c.imageRef, name: c.nom });
	if (c.hote.autoRemove && !options.garder) supprimerConteneurPort(h, c, true);
	return true;
}
function journaliserArretPort(h, c, signal){
	var prog = c.programme || {};
	if (prog.type === "nginx") ajouterJournalPort(h, c, "stderr", horodatageNginxPort(h) + " [notice] 1#1: signal " + (signal === 3 ? "3 (SIGQUIT) received, shutting down" : "15 (SIGTERM) received, exiting"));
	if (prog.type === "postgres"){ ajouterJournalPort(h, c, "stderr", horodatagePgPort(h) + " [1] LOG:  received fast shutdown request"); ajouterJournalPort(h, c, "stderr", horodatagePgPort(h) + " [1] LOG:  database system is shut down"); }
	if (prog.type === "redis") ajouterJournalPort(h, c, "stdout", "1:signal-handler (" + Math.floor(maintenantPort(h) / 1000) + ") Received SIGTERM scheduling shutdown...");
}
function supprimerConteneurPort(h, c, avecVolumesAnonymes){
	var P = etatPort(h);
	retirerProcessusConteneurPort(h, c);
	Object.keys(c.reseaux || {}).forEach(function(n){ var r = reseauPort(h, n); if (r) evenementDockerPort(h, "network", "disconnect", r.id, { container: c.id, name: n, type: r.pilote }); });
	delete P.conteneurs[c.id];
	if (avecVolumesAnonymes) (c.hote.montages || []).forEach(function(m){ if (m.type === "volume" && m.anonyme && !volumeUtilisePort(h, m.source).length) supprimerVolumePort(h, m.source); });
	moteurSeul(function(){ var d = dossierHote(h, "/var/lib/docker/containers"); if (d){ var x = d.getChildFromName(c.id); if (x && x !== -1) supprimerArbreHotePort(d, x); } });
	evenementDockerPort(h, "container", "destroy", c.id, { image: c.imageRef, name: c.nom });
	return true;
}

/* ================================================================== */
/* Les journaux d'un conteneur                                          */
/* ================================================================== */

function horodatageNginxPort(h){ var d = dateMachine(h, maintenantPort(h)); return d.getFullYear() + "/" + deuxChiffres(d.getMonth() + 1) + "/" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours() - 2 < 0 ? d.getHours() + 22 : d.getHours() - 2) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); }
function horodatagePgPort(h){ return dateIsoPort(maintenantPort(h)).replace("T", " ").substring(0, 23) + " UTC"; }
function ajouterJournalPort(h, c, flux, ligne){
	if (c.hote.log && c.hote.log.type === "none") return;
	var t = maintenantPort(h) + c.journaux.length;
	String(ligne).split("\n").forEach(function(l){ c.journaux.push({ t: t, s: flux, l: l }); });
	if (c.journaux.length > 400) c.journaux.splice(0, c.journaux.length - 400);
	var lf = fichierJournalHotePort(h, c);
	if (lf){ lf.taille = (lf.taille || 0) + octetsPort(ligne) + 80; rotationJournalPort(h, c); }
}
function fichierJournalHotePort(h, c){
	if (!c.hote.log || c.hote.log.type !== "json-file") return null;
	var chemin = "/var/lib/docker/containers/" + c.id + "/" + c.id + "-json.log";
	var it = fichierHote(h, chemin);
	if (!it) it = moteurSeul(function(){ var x = poserFichierHote(h, chemin, "", { mode: "rw-r-----" }); if (x) x.taille = 0; return x; });
	return it;
}
/* La rotation de json-file : max-size, max-file. */
function rotationJournalPort(h, c){
	var opts = c.hote.log.opts || {}, max = opts["max-size"] ? lireTaille(String(opts["max-size"]).replace(/b$/i, "")) : 0, n = +(opts["max-file"] || 1);
	if (!max) return;
	var chemin = "/var/lib/docker/containers/" + c.id + "/" + c.id + "-json.log";
	var it = fichierHote(h, chemin);
	if (!it || (it.taille || 0) <= max) return;
	moteurSeul(function(){
		for (var k = n - 1; k >= 1; k--){
			var avant = fichierHote(h, chemin + (k === 1 ? "" : "." + (k - 1)));
			if (!avant) continue;
			var apres = poserFichierHote(h, chemin + "." + k, "", { mode: "rw-r-----" });
			apres.taille = Math.min(avant.taille || 0, max);
		}
		it.taille = Math.round(max / 3);
	});
	c.rotations = (c.rotations || 0) + 1;
}
/* Ce que le démon garde des journaux (docker logs) : avec json-file ou local ; rien avec none, syslog... */
function journauxLisiblesPort(c){ return !c.hote.log || ["json-file", "local", "journald"].indexOf(c.hote.log.type) > -1; }

/* ================================================================== */
/* Le tic : santé, redémarrages, mémoire, journaux qui grossissent      */
/* ================================================================== */

surTicMachine(function(h, M){
	if (!estHotePort(h) || !grandPortOuvert()) return;
	if (!aDesConteneursPort(h)) return;
	if (!M.port) return;
	ticPort(h, M);
});
function ticPort(h, M){
	var P = etatPort(h);
	var tic = M.tics || 0;
	conteneursPort(h).forEach(function(c){
		if (c.etat.statut === "restarting" && demonActifPort(h)){
			if ((c.etat.relanceA || 0) <= tic){
				c.etat.redemarrages++;
				evenementDockerPort(h, "container", "restart", c.id, { image: c.imageRef, name: c.nom });
				demarrerConteneurPort(h, c, { relance: true });
			}
			return;
		}
		if (!enMarchePort(c)) return;
		var prog = c.programme || {};
		// Un programme qui s'arrête de lui-même (sleep 5, un script).
		if (prog.finA !== undefined && prog.finA !== null && prog.finA <= tic){ conteneurMortPort(h, c, prog.codeFin || 0, "fin"); return; }
		if (typeof ticProgrammePort === "function") ticProgrammePort(h, c, tic);
		if (!enMarchePort(c)) return;
		// La mémoire : une limite trop basse, et le noyau tue (OOMKilled, 137).
		if (c.hote.memoire && c.memoire > c.hote.memoire){
			ajouterJournalPort(h, c, "stderr", "");
			journalMachine(h, { noyau: true, message: "Memory cgroup out of memory: Killed process " + c.etat.pid + " (" + (prog.comm || "proc") + ") total-vm:" + Math.round(c.memoire / 1024 * 1.4) + "kB, anon-rss:" + Math.round(c.memoire / 1024) + "kB, file-rss:0kB, shmem-rss:0kB, UID:" + (prog.uid || 0) + " pgtables:120kB oom_score_adj:0" });
			conteneurMortPort(h, c, 137, "oom");
			return;
		}
		// La santé
		if (c.etat.sante && typeof verifierSantePort === "function") verifierSantePort(h, c);
	});
	if (typeof ticSwarmPort === "function") ticSwarmPort(h);
}
