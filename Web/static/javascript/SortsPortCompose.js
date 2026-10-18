/**
 * SortsPortCompose.js : le moteur des conteneurs du Grand Port, sixième partie : docker compose (la feuille de route).
 *
 * Un lecteur YAML (le sous-ensemble qu'écrivent les fichiers compose : tables, listes, chaînes citées, listes et tables
 * en ligne, blocs | et >, commentaires ; les erreurs au texte de la bibliothèque yaml), l'interpolation ${VAR},
 * ${VAR:-défaut} avec le fichier .env du projet, et docker compose : up (-d, --build, --scale, --force-recreate,
 * --no-deps, --wait), down (-v, --rmi), ps, logs, exec, run, config (--services, --volumes, -q), start, stop, restart,
 * kill, rm, pull, build, images, top, port, ls, version. Le projet porte le nom de son dossier ; ses conteneurs
 * s'appellent projet-service-N, son réseau projet_default, ses volumes projet_nom. depends_on attend vraiment
 * (condition: service_healthy fait tourner le healthcheck de la dépendance) ; les secrets de fichier sont montés en
 * lecture seule sous /run/secrets.
 *
 * --- Ce que le monde peut lire ---
 *   projetsComposePort(h) : { nom: { dossier, fichiers, services: { nom: [ids] }, config } } (le dernier up de chaque projet)
 *   serviceComposePort(h, projet, service) : les conteneurs d'un service ; lireYamlPort(texte) : l'objet, ou { erreur }
 */

/* ================================================================== */
/* Le lecteur YAML                                                      */
/* ================================================================== */

function ErreurYamlPort(ligne, message){ this.message = "yaml: line " + ligne + ": " + message; }
function scalaireYamlPort(t, ligne){
	t = String(t).trim();
	if (t === "" || t === "~" || t === "null" || t === "Null" || t === "NULL") return null;
	if (/^"/.test(t)){
		if (!/"$/.test(t) || t.length < 2) throw new ErreurYamlPort(ligne, "found unexpected end of stream");
		try { return JSON.parse(t); } catch (e){ return t.slice(1, -1); }
	}
	if (/^'/.test(t)){
		if (!/'$/.test(t) || t.length < 2) throw new ErreurYamlPort(ligne, "found unexpected end of stream");
		return t.slice(1, -1).replace(/''/g, "'");
	}
	if (/^\[.*\]$/.test(t) || /^\{.*\}$/.test(t)) return enLigneYamlPort(t, ligne);
	if (/^(true|True|TRUE)$/.test(t)) return true;
	if (/^(false|False|FALSE)$/.test(t)) return false;
	if (/^-?\d+$/.test(t) && t.length < 16 && !/^0\d/.test(t)) return +t;
	if (/^-?\d+\.\d+$/.test(t)) return +t;
	return t;
}
/* [a, "b", 3] ou { a: 1, b: "x" } */
function enLigneYamlPort(t, ligne){
	var i = 0;
	function blancs(){ while (i < t.length && /\s/.test(t.charAt(i))) i++; }
	function valeur(){
		blancs();
		var c = t.charAt(i);
		if (c === "["){ i++; var l = []; blancs(); if (t.charAt(i) === "]"){ i++; return l; } while (i < t.length){ l.push(valeur()); blancs(); if (t.charAt(i) === ","){ i++; continue; } if (t.charAt(i) === "]"){ i++; return l; } throw new ErreurYamlPort(ligne, "did not find expected ',' or ']'"); } throw new ErreurYamlPort(ligne, "did not find expected ',' or ']'"); }
		if (c === "{"){ i++; var o = {}; blancs(); if (t.charAt(i) === "}"){ i++; return o; } while (i < t.length){ blancs(); var k = cleEnLigne(); blancs(); if (t.charAt(i) !== ":") throw new ErreurYamlPort(ligne, "did not find expected ',' or '}'"); i++; o[k] = valeur(); blancs(); if (t.charAt(i) === ","){ i++; continue; } if (t.charAt(i) === "}"){ i++; return o; } throw new ErreurYamlPort(ligne, "did not find expected ',' or '}'"); } throw new ErreurYamlPort(ligne, "did not find expected ',' or '}'"); }
		if (c === "\"" || c === "'"){ var j = i + 1; while (j < t.length && t.charAt(j) !== c){ if (c === "\"" && t.charAt(j) === "\\") j++; j++; } var brut = t.substring(i, j + 1); i = j + 1; return scalaireYamlPort(brut, ligne); }
		var d = i; while (i < t.length && ",]}".indexOf(t.charAt(i)) === -1) i++;
		return scalaireYamlPort(t.substring(d, i), ligne);
	}
	function cleEnLigne(){ var c = t.charAt(i); if (c === "\"" || c === "'"){ var j = t.indexOf(c, i + 1); var k = t.substring(i + 1, j); i = j + 1; return k; } var d = i; while (i < t.length && t.charAt(i) !== ":") i++; return t.substring(d, i).trim(); }
	var v = valeur();
	return v;
}
/* Retirer un commentaire « # » qui n'est pas dans une chaîne. */
function sansCommentaireYamlPort(l){
	var q = null;
	for (var i = 0; i < l.length; i++){
		var c = l.charAt(i);
		if (q){ if (c === q) q = null; continue; }
		if ((c === "\"" || c === "'") && (i === 0 || /[\s:\[{,-]/.test(l.charAt(i - 1)))) { q = c; continue; }
		if (c === "#" && (i === 0 || /\s/.test(l.charAt(i - 1)))) return l.substring(0, i).replace(/\s+$/, "");
	}
	return l.replace(/\s+$/, "");
}
function lireYamlPort(texte){
	try {
		var brutes = String(texte || "").split("\n");
		var lignes = [];
		for (var n = 0; n < brutes.length; n++){
			var b = brutes[n];
			if (/^\t/.test(b) || /^ *\t/.test(b) && b.trim()) throw new ErreurYamlPort(n + 1, "found character that cannot start any token");
			if (/^---\s*$/.test(b) || /^\.\.\.\s*$/.test(b)) continue;
			var sc = sansCommentaireYamlPort(b);
			if (sc.trim() === ""){ lignes.push({ vide: true, n: n + 1, brut: b }); continue; }
			lignes.push({ ind: /^ */.exec(sc)[0].length, t: sc.trim(), n: n + 1, brut: b });
		}
		var pos = 0;
		function prochaine(){ while (pos < lignes.length && lignes[pos].vide) pos++; return lignes[pos] || null; }
		function blocScalaire(indParent, style){
			var r = [], indBloc = null;
			while (pos < lignes.length){
				var l = lignes[pos];
				if (l.vide){ r.push(""); pos++; continue; }
				if (l.ind <= indParent) break;
				if (indBloc === null) indBloc = l.ind;
				r.push(l.brut.substring(indBloc));
				pos++;
			}
			while (r.length && r[r.length - 1] === "") r.pop();
			if (style.charAt(0) === "|") return r.join("\n") + (style === "|-" ? "" : "\n");
			return r.join(" ").replace(/\s+\n/g, "\n") + (style === ">-" ? "" : "\n");
		}
		function noeud(ind){
			var l = prochaine();
			if (!l || l.ind < ind) return null;
			if (/^- |^-$/.test(l.t)) return liste(l.ind);
			return table(l.ind);
		}
		function valeurApres(reste, indCle, l){
			if (reste === "" ){
				var s = prochaine();
				if (s && (s.ind > indCle || (s.ind === indCle && /^- |^-$/.test(s.t)))) return noeud(s.ind);
				return null;
			}
			if (/^[|>][-+]?$/.test(reste)) return blocScalaire(indCle, reste);
			if (/^&\w+/.test(reste)) reste = reste.replace(/^&\w+\s*/, "");
			if (/^\*\w+/.test(reste)) return null;
			return scalaireYamlPort(reste, l.n);
		}
		function table(ind){
			var o = {};
			while (true){
				var l = prochaine();
				if (!l || l.ind < ind) return o;
				if (l.ind > ind) throw new ErreurYamlPort(l.n, "mapping values are not allowed in this context");
				if (/^- |^-$/.test(l.t)) throw new ErreurYamlPort(l.n, "did not find expected key");
				var m = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^:"'][^:]*?|[^:]+?)\s*:(?:\s+(.*)|\s*$)/.exec(l.t);
				if (!m) throw new ErreurYamlPort(l.n + 1 <= lignes.length ? l.n : l.n, "could not find expected ':'");
				var cle = m[1].replace(/^["']|["']$/g, "");
				if (o.hasOwnProperty(cle)) throw new ErreurYamlPort(l.n, "mapping key \"" + cle + "\" already defined at line " + (o.__lignes ? o.__lignes[cle] : l.n));
				pos++;
				o[cle] = valeurApres(m[2] === undefined ? "" : m[2].trim(), ind, l);
				Object.defineProperty(o, "__lignes", { value: o.__lignes || {}, enumerable: false, writable: true });
				o.__lignes[cle] = l.n;
			}
		}
		function liste(ind){
			var r = [];
			while (true){
				var l = prochaine();
				if (!l || l.ind < ind) return r;
				if (l.ind > ind) throw new ErreurYamlPort(l.n, "did not find expected '-' indicator");
				if (!/^- |^-$/.test(l.t)) return r;
				var reste = l.t.replace(/^-\s*/, "");
				if (reste === ""){ pos++; var s = prochaine(); r.push(s && s.ind > ind ? noeud(s.ind) : null); continue; }
				var km = /^("[^"]*"|'[^']*'|[^\s:"'][^:]*?)\s*:(?:\s+(.*)|\s*$)/.exec(reste);
				if (km && !/^["']/.test(reste.trim()) && !/^\[|^\{/.test(reste)){
					// Une table dans la liste : « - cle: valeur » puis les clés suivantes, plus indentées.
					var indInterne = ind + (l.t.length - reste.length);
					lignes[pos] = { ind: indInterne, t: reste, n: l.n, brut: l.brut };
					r.push(table(indInterne));
					continue;
				}
				pos++;
				r.push(scalaireYamlPort(reste, l.n));
			}
		}
		var p = prochaine();
		if (!p) return {};
		var res = noeud(p.ind);
		var reste2 = prochaine();
		if (reste2) throw new ErreurYamlPort(reste2.n, "did not find expected key");
		return res;
	} catch (e){
		if (e instanceof ErreurYamlPort) return { erreur: e.message };
		throw e;
	}
}
/* L'écriture YAML de docker compose config : clés triées, chaînes citées quand il faut. */
function ecrireYamlPort(v, ind){
	ind = ind || 0;
	var esp = new Array(ind + 1).join(" ");
	var scal = function(x){
		if (x === null || x === undefined) return "null";
		if (typeof x === "boolean" || typeof x === "number") return String(x);
		var s = String(x);
		if (s === "" || /^[\s#&*!|>'"%@`{}\[\],?:-]|[:#]\s|\s$|^(true|false|null|yes|no|on|off|~)$/i.test(s) || /^-?\d+(\.\d+)?$/.test(s) || /\n/.test(s) || /: /.test(s)) return JSON.stringify(s);
		return s;
	};
	if (Array.isArray(v)){
		if (!v.length) return " []";
		return "\n" + v.map(function(x){
			if (x !== null && typeof x === "object" && !Array.isArray(x)){
				var t = ecrireYamlPort(x, ind + 2).replace(/^\n/, "");
				return esp + "- " + t.substring(ind + 2);
			}
			return esp + "- " + scal(x);
		}).join("\n");
	}
	if (v !== null && typeof v === "object"){
		var cles = Object.keys(v).filter(function(k){ return v[k] !== undefined; });
		if (!cles.length) return " {}";
		return "\n" + cles.map(function(k){
			var x = v[k];
			if (x !== null && typeof x === "object") return esp + (/^[\w.\/-]+$/.test(k) ? k : JSON.stringify(k)) + ":" + ecrireYamlPort(x, ind + 2);
			return esp + (/^[\w.\/-]+$/.test(k) ? k : JSON.stringify(k)) + ": " + scal(x);
		}).join("\n");
	}
	return " " + scal(v);
}

/* ================================================================== */
/* Le projet compose : lecture, interpolation, normalisation            */
/* ================================================================== */

var NOMS_FICHIERS_COMPOSE_PORT = ["compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml"];
var CLES_SERVICE_PORT = ["image", "build", "ports", "expose", "volumes", "networks", "environment", "env_file", "depends_on", "healthcheck", "restart", "mem_limit", "memswap_limit", "cpus", "deploy", "command",
	"entrypoint", "user", "working_dir", "read_only", "tmpfs", "cap_drop", "cap_add", "security_opt", "privileged", "logging", "labels", "container_name", "hostname", "secrets", "init", "stop_signal",
	"pids_limit", "extra_hosts", "profiles", "stdin_open", "tty", "configs", "pull_policy", "platform", "dns", "ulimits", "stop_grace_period", "network_mode", "scale", "domainname", "shm_size"];
function interpolerComposePort(texte, vars, avertir){
	return String(texte).replace(/\$\$/g, "\u0002").replace(/\$\{(\w+)(?:(:?)([-?+])([^}]*))?\}|\$(\w+)/g, function(t, n1, deux, op, mot, n2){
		var n = n1 || n2, v = vars.hasOwnProperty(n) ? vars[n] : undefined;
		if (op === "-") return (v === undefined || (deux && v === "")) ? mot : v;
		if (op === "+") return (v === undefined || (deux && v === "")) ? "" : mot;
		if (op === "?"){ if (v === undefined || (deux && v === "")) throw new ShellError("error while interpolating services: required variable " + n + " is missing a value: " + mot, 1); return v; }
		if (v === undefined){ avertir("The \"" + n + "\" variable is not set. Defaulting to a blank string."); return ""; }
		return v;
	}).replace(/\u0002/g, "$");
}
/* Trouver et lire le projet : { dossier, fichier, nom, config, avertissements } ou lever une ShellError. */
function chargerProjetComposePort(h, o, io){
	var dossierLieu = current_room, fichiers = listePort(o.file);
	var chemins = [];
	if (fichiers.length){
		fichiers.forEach(function(f){
			var r = Shell.chercher(f, io, "docker");
			if (!(r.node instanceof Item)) throw new ShellError("open " + cheminNormal(cheminDuLieuMachine(r.dir || current_room) + "/" + f) + ": no such file or directory", 14);
			chemins.push({ item: r.node, chemin: cheminNormal(cheminDuLieuMachine(r.dir) + "/" + r.name), dossier: cheminDuLieuMachine(r.dir) });
		});
	} else {
		var lieu = dossierLieu;
		while (lieu && !chemins.length){
			NOMS_FICHIERS_COMPOSE_PORT.forEach(function(n){ if (!chemins.length){ var it = lieu.getItemFromName(n); if (it !== -1) chemins.push({ item: it, chemin: cheminNormal(cheminDuLieuMachine(lieu) + "/" + n), dossier: cheminDuLieuMachine(lieu) }); } });
			if (!chemins.length){ var parent = lieu.parents[0]; if (!parent || !racineDe(parent) || lieu === racineDe(lieu)) break; lieu = parent; }
		}
		if (!chemins.length) throw new ShellError("no configuration file provided: not found", 14);
	}
	var dossier = chemins[0].dossier;
	var avertissements = [];
	var vars = {};
	var envFichier = texteHote(h, dossier + "/.env");
	if (envFichier) envFichier.split("\n").forEach(function(l){ l = l.trim(); if (!l || l.charAt(0) === "#") return; var i = l.indexOf("="); if (i > 0) vars[l.substring(0, i).trim()] = l.substring(i + 1).trim().replace(/^["'](.*)["']$/, "$1"); });
	Object.keys(state.env || {}).forEach(function(k){ vars[k] = state.env[k]; });
	var config = { services: {}, volumes: {}, networks: {}, secrets: {} }, nomProjet = o["project-name"] || null;
	chemins.forEach(function(c){
		var t = interpolerComposePort(c.item.getText(), vars, function(a){ if (avertissements.indexOf(a) === -1) avertissements.push(a); });
		var y = lireYamlPort(t);
		if (y && y.erreur) throw new ShellError(y.erreur, 15);
		if (!y || typeof y !== "object" || Array.isArray(y)) throw new ShellError("Top-level object must be a mapping", 15);
		if (y.version !== undefined) avertissements.push(c.chemin + ": the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion");
		Object.keys(y).forEach(function(k){ if (["version", "services", "volumes", "networks", "secrets", "configs", "name", "include"].indexOf(k) === -1 && !/^x-/.test(k)) throw new ShellError("validating " + c.chemin + ": additional properties '" + k + "' not allowed", 15); });
		if (y.name && !nomProjet) nomProjet = String(y.name);
		["services", "volumes", "networks", "secrets"].forEach(function(s){ var x = y[s] || {}; Object.keys(x).forEach(function(k){ config[s][k] = config[s][k] && typeof config[s][k] === "object" && x[k] && typeof x[k] === "object" ? fusionComposePort(config[s][k], x[k]) : (x[k] || {}); }); });
	});
	if (!Object.keys(config.services).length) throw new ShellError("no service selected", 15);
	if (!nomProjet) nomProjet = nomDe(dossier).toLowerCase().replace(/[^a-z0-9_-]/g, "");
	Object.keys(config.services).forEach(function(s){
		var sv = config.services[s];
		if (!sv || typeof sv !== "object") throw new ShellError("services." + s + " must be a mapping", 15);
		Object.keys(sv).forEach(function(k){ if (CLES_SERVICE_PORT.indexOf(k) === -1) throw new ShellError("validating " + chemins[0].chemin + ": services." + s + " additional properties '" + k + "' not allowed", 15); });
		if (!sv.image && !sv.build) throw new ShellError("service \"" + s + "\" has neither an image nor a build context specified: invalid compose project", 15);
		var deps = dependancesComposePort(sv);
		Object.keys(deps).forEach(function(d){ if (!config.services[d]) throw new ShellError("service \"" + s + "\" depends on undefined service \"" + d + "\": invalid compose project", 15); });
		listePort(sv.secrets).forEach(function(x){ var n = typeof x === "string" ? x : x.source; if (!config.secrets[n]) throw new ShellError("service \"" + s + "\" refers to undefined secret " + n + ": invalid compose project", 15); });
		reseauxServiceComposePort(sv).forEach(function(x){ if (x.nom !== "default" && !config.networks.hasOwnProperty(x.nom)) throw new ShellError("service \"" + s + "\" refers to undefined network " + x.nom + ": invalid compose project", 15); });
	});
	// Les cycles de depends_on.
	var ordre = ordreComposePort(config);
	if (ordre.cycle) throw new ShellError("dependency cycle detected: " + ordre.cycle.join(" -> "), 15);
	return { dossier: dossier, fichiers: chemins.map(function(c){ return c.chemin; }), nom: nomProjet, config: config, avertissements: avertissements, ordre: ordre.liste, vars: vars };
}
function fusionComposePort(a, b){
	var r = copieJson(a);
	Object.keys(b).forEach(function(k){ r[k] = (r[k] && typeof r[k] === "object" && !Array.isArray(r[k]) && b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) ? fusionComposePort(r[k], b[k]) : b[k]; });
	return r;
}
function dependancesComposePort(sv){
	var d = {};
	if (Array.isArray(sv.depends_on)) sv.depends_on.forEach(function(x){ d[x] = { condition: "service_started" }; });
	else if (sv.depends_on && typeof sv.depends_on === "object") Object.keys(sv.depends_on).forEach(function(k){ d[k] = { condition: (sv.depends_on[k] || {}).condition || "service_started", restart: (sv.depends_on[k] || {}).restart }; });
	return d;
}
function ordreComposePort(config){
	var liste = [], vus = {}, enCours = {}, cycle = null;
	function visiter(s, chemin){
		if (cycle || vus[s]) return;
		if (enCours[s]){ cycle = chemin.concat([s]); return; }
		enCours[s] = true;
		Object.keys(dependancesComposePort(config.services[s] || {})).forEach(function(d){ visiter(d, chemin.concat([s])); });
		enCours[s] = false; vus[s] = true; liste.push(s);
	}
	Object.keys(config.services).forEach(function(s){ visiter(s, []); });
	return { liste: liste, cycle: cycle };
}
function reseauxServiceComposePort(sv){
	if (sv.network_mode) return [];
	if (!sv.networks) return [{ nom: "default", alias: [] }];
	if (Array.isArray(sv.networks)) return sv.networks.map(function(n){ return { nom: n, alias: [] }; });
	return Object.keys(sv.networks).map(function(n){ return { nom: n, alias: (sv.networks[n] && sv.networks[n].aliases) || [] }; });
}
function listeEnvComposePort(env){
	if (!env) return [];
	if (Array.isArray(env)) return env.map(function(e){ return String(e); });
	return Object.keys(env).map(function(k){ return k + "=" + (env[k] === null || env[k] === undefined ? "" : String(env[k])); });
}

/* La forme normalisée (docker compose config) d'un projet. */
function configNormaliseePort(h, p){
	var c = p.config, out = { name: p.nom, services: {} };
	Object.keys(c.services).sort().forEach(function(s){
		var sv = c.services[s], o = {};
		if (sv.build) o.build = typeof sv.build === "string" ? { context: cheminNormal(sv.build.charAt(0) === "/" ? sv.build : p.dossier + "/" + sv.build), dockerfile: "Dockerfile" } : { context: cheminNormal(String(sv.build.context || ".").charAt(0) === "/" ? sv.build.context : p.dossier + "/" + (sv.build.context || ".")), dockerfile: sv.build.dockerfile || "Dockerfile", args: sv.build.args, target: sv.build.target };
		if (sv.cap_add) o.cap_add = sv.cap_add; if (sv.cap_drop) o.cap_drop = sv.cap_drop;
		if (sv.command) o.command = typeof sv.command === "string" ? sv.command.split(/\s+/) : sv.command;
		if (sv.container_name) o.container_name = sv.container_name;
		var deps = dependancesComposePort(sv);
		if (Object.keys(deps).length){ o.depends_on = {}; Object.keys(deps).forEach(function(d){ o.depends_on[d] = { condition: deps[d].condition, required: true }; }); }
		if (sv.deploy) o.deploy = sv.deploy;
		if (sv.entrypoint) o.entrypoint = typeof sv.entrypoint === "string" ? sv.entrypoint.split(/\s+/) : sv.entrypoint;
		var env = envServiceComposePort(h, p, sv);
		if (env.length){ o.environment = {}; env.forEach(function(e){ var i = e.indexOf("="); o.environment[e.substring(0, i)] = e.substring(i + 1); }); }
		if (sv.healthcheck) o.healthcheck = sv.healthcheck;
		if (sv.hostname) o.hostname = sv.hostname;
		if (sv.image) o.image = sv.image;
		if (sv.logging) o.logging = sv.logging;
		if (sv.mem_limit) o.mem_limit = String(memoireDepuisPort(sv.mem_limit) || sv.mem_limit);
		o.networks = {}; reseauxServiceComposePort(sv).forEach(function(x){ o.networks[x.nom] = x.alias.length ? { aliases: x.alias } : null; });
		if (sv.ports) o.ports = listePort(sv.ports).map(function(x){ if (typeof x === "object") return { mode: "ingress", host_ip: x.host_ip, target: +x.target, published: String(x.published), protocol: x.protocol || "tcp" }; var r = lirePortArgPort(String(x)); var q = { mode: "ingress" }; if (r.ip) q.host_ip = r.ip; q.target = r.cp; if (r.hp) q.published = String(r.hp); q.protocol = r.proto; return q; });
		if (sv.read_only) o.read_only = true; if (sv.restart) o.restart = sv.restart;
		if (sv.secrets) o.secrets = listePort(sv.secrets).map(function(x){ return typeof x === "string" ? { source: x } : x; });
		if (sv.security_opt) o.security_opt = sv.security_opt; if (sv.tmpfs) o.tmpfs = listePort(sv.tmpfs);
		if (sv.user) o.user = String(sv.user);
		if (sv.volumes) o.volumes = listePort(sv.volumes).map(function(v){ var m = montageComposePort(h, p, v); return m.type === "volume" ? { type: "volume", source: m.nomCourt, target: m.cible, read_only: m.ro || undefined, volume: {} } : { type: m.type, source: m.source, target: m.cible, read_only: m.ro || undefined, bind: m.type === "bind" ? { create_host_path: true } : undefined }; });
		if (sv.working_dir) o.working_dir = sv.working_dir;
		out.services[s] = o;
	});
	out.networks = { default: { name: p.nom + "_default" } };
	Object.keys(c.networks).forEach(function(n){ out.networks[n] = { name: (c.networks[n] && c.networks[n].name) || (c.networks[n] && c.networks[n].external ? n : p.nom + "_" + n) }; if (c.networks[n] && c.networks[n].internal) out.networks[n].internal = true; if (c.networks[n] && c.networks[n].external) out.networks[n].external = true; });
	if (Object.keys(c.volumes).length){ out.volumes = {}; Object.keys(c.volumes).forEach(function(v){ out.volumes[v] = { name: (c.volumes[v] && c.volumes[v].name) || (c.volumes[v] && c.volumes[v].external ? v : p.nom + "_" + v) }; if (c.volumes[v] && c.volumes[v].external) out.volumes[v].external = true; }); }
	if (Object.keys(c.secrets).length){ out.secrets = {}; Object.keys(c.secrets).forEach(function(s){ var x = c.secrets[s] || {}; out.secrets[s] = { name: p.nom + "_" + s }; if (x.file) out.secrets[s].file = cheminNormal(String(x.file).charAt(0) === "/" ? x.file : p.dossier + "/" + x.file); if (x.external) out.secrets[s].external = true; if (x.environment) out.secrets[s].environment = x.environment; }); }
	return out;
}
function envServiceComposePort(h, p, sv){
	var env = [];
	listePort(sv.env_file).forEach(function(f){
		var chemin = cheminNormal(String(f.path || f).charAt(0) === "/" ? (f.path || f) : p.dossier + "/" + (f.path || f));
		var t = texteHote(h, chemin);
		if (t === null){ if (f.required === false) return; throw new ShellError("env file " + chemin + " not found: stat " + chemin + ": no such file or directory", 14); }
		t.split("\n").forEach(function(l){ l = l.trim(); if (!l || l.charAt(0) === "#") return; if (l.indexOf("=") === -1) return; env = env.filter(function(e){ return e.split("=")[0] !== l.split("=")[0]; }); env.push(l.replace(/=["'](.*)["']$/, "=$1")); });
	});
	listeEnvComposePort(sv.environment).forEach(function(e){ var k = e.split("=")[0]; if (e.indexOf("=") === -1){ if (p.vars.hasOwnProperty(e)) e = e + "=" + p.vars[e]; else return; } env = env.filter(function(x){ return x.split("=")[0] !== k; }); env.push(e); });
	return env;
}
/* Un montage de compose (court ou long) en montage du moteur. */
function montageComposePort(h, p, v){
	var nomVol = function(n){ var d = p.config.volumes[n]; if (d && d.external) return (d.name || n); return (d && d.name) || p.nom + "_" + n; };
	if (v && typeof v === "object"){
		var t = v.type || "volume";
		if (t === "bind") return { type: "bind", source: cheminNormal(String(v.source).charAt(0) === "/" ? v.source : p.dossier + "/" + v.source), cible: v.target, ro: !!v.read_only, creer: true };
		if (t === "tmpfs") return { type: "tmpfs", cible: v.target };
		return { type: "volume", source: v.source ? nomVol(v.source) : null, nomCourt: v.source, cible: v.target, ro: !!v.read_only, anonyme: !v.source };
	}
	var parts = String(v).split(":");
	if (parts.length === 1) return { type: "volume", source: null, cible: parts[0], anonyme: true };
	var src = parts[0], ro = parts[2] === "ro";
	if (/^[.~\/]/.test(src)) return { type: "bind", source: cheminNormal(src.charAt(0) === "/" ? src : (src.charAt(0) === "~" ? "/home/" + JOUEUR + src.substring(1) : p.dossier + "/" + src)), cible: parts[1], ro: ro, creer: true };
	if (!p.config.volumes.hasOwnProperty(src)) throw new ShellError("service volume refers to undefined volume " + src + ": invalid compose project", 15);
	return { type: "volume", source: nomVol(src), nomCourt: src, cible: parts[1], ro: ro };
}
/* Les options de conteneur d'un service. */
function optionsServiceComposePort(h, p, s, numero){
	var sv = p.config.services[s];
	var o = { env: envServiceComposePort(h, p, sv), ports: [], montages: [], tmpfs: {}, labels: {}, capDrop: listePort(sv.cap_drop).map(function(x){ return String(x).toUpperCase().replace(/^CAP_/, ""); }), capAdd: listePort(sv.cap_add).map(function(x){ return String(x).toUpperCase().replace(/^CAP_/, ""); }), secOpt: listePort(sv.security_opt).map(function(x){ return x === "no-new-privileges:true" || x === "no-new-privileges=true" || x === "no-new-privileges" ? "no-new-privileges" : x; }) };
	listePort(sv.ports).forEach(function(x){ if (typeof x === "object") o.ports.push({ ip: x.host_ip || "", hp: x.published ? +x.published : null, cp: +x.target, proto: x.protocol || "tcp" }); else o.ports.push(lirePortArgPort(String(x))); });
	listePort(sv.volumes).forEach(function(v){ var m = montageComposePort(h, p, v); if (m.type === "tmpfs") o.tmpfs[m.cible] = ""; else { if (m.type === "bind" && !noeudHote(h, m.source)) moteurSeul(function(){ creerDossiersHote(h, m.source); }); o.montages.push(m); } });
	listePort(sv.tmpfs).forEach(function(t){ var i = String(t).indexOf(":"); o.tmpfs[cheminNormal(i > -1 ? t.substring(0, i) : t)] = i > -1 ? t.substring(i + 1) : ""; });
	if (sv.restart){ var mr = /^(no|always|unless-stopped|on-failure)(?::(\d+))?$/.exec(String(sv.restart)); o.restart = mr ? { nom: mr[1], max: mr[2] ? +mr[2] : 0 } : { nom: "no", max: 0 }; }
	var lim = sv.deploy && sv.deploy.resources && sv.deploy.resources.limits;
	if (sv.mem_limit || (lim && lim.memory)){ o.memoire = memoireDepuisPort(sv.mem_limit || lim.memory); if (o.memoire !== null && o.memoire < 6 * 1048576) throw new ShellError("Error response from daemon: Minimum memory limit allowed is 6MB", 1); }
	if (sv.cpus || (lim && lim.cpus)) o.cpus = parseFloat(sv.cpus || lim.cpus);
	if (sv.pids_limit) o.pidsLimit = +sv.pids_limit;
	if (sv.read_only) o.readOnly = true;
	if (sv.privileged) o.privileged = true;
	if (sv.init) o.init = true;
	if (sv.user !== undefined) o.user = String(sv.user);
	if (sv.working_dir) o.workdir = sv.working_dir;
	if (sv.hostname) o.hostname = sv.hostname;
	if (sv.stop_signal) o.arreter = sv.stop_signal;
	if (sv.command) o.cmd = typeof sv.command === "string" ? (sv.command.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(function(x){ return x.replace(/^["']|["']$/g, ""); }) : sv.command.map(String);
	if (sv.entrypoint) o.entrypoint = typeof sv.entrypoint === "string" ? (sv.entrypoint.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(function(x){ return x.replace(/^["']|["']$/g, ""); }) : sv.entrypoint.map(String);
	if (sv.logging){ o.log = { type: sv.logging.driver || "json-file", opts: {} }; Object.keys(sv.logging.options || {}).forEach(function(k){ o.log.opts[k] = String(sv.logging.options[k]); }); }
	if (sv.healthcheck){
		var hc = sv.healthcheck;
		if (hc.disable) o.sante = false;
		else if (hc.test){
			var test = typeof hc.test === "string" ? ["CMD-SHELL", hc.test] : hc.test.map(String);
			o.sante = { Test: test };
			if (hc.interval) o.sante.Interval = dureeNsDepuisPort(hc.interval);
			if (hc.timeout) o.sante.Timeout = dureeNsDepuisPort(hc.timeout);
			if (hc.start_period) o.sante.StartPeriod = dureeNsDepuisPort(hc.start_period);
			if (hc.retries) o.sante.Retries = +hc.retries;
		}
	}
	Object.keys(sv.labels || {}).forEach(function(k){ o.labels[k] = String(sv.labels[k]); });
	if (Array.isArray(sv.labels)) sv.labels.forEach(function(l){ var i = l.indexOf("="); o.labels[l.substring(0, i)] = l.substring(i + 1); });
	o.labels["com.docker.compose.project"] = p.nom;
	o.labels["com.docker.compose.service"] = s;
	o.labels["com.docker.compose.container-number"] = String(numero);
	o.labels["com.docker.compose.oneoff"] = "False";
	o.labels["com.docker.compose.project.working_dir"] = p.dossier;
	o.labels["com.docker.compose.project.config_files"] = p.fichiers.join(",");
	o.labels["com.docker.compose.version"] = VERSION_COMPOSE_PORT;
	o.labels["com.docker.compose.config-hash"] = hashServiceComposePort(h, p, s);
	o.secrets = listePort(sv.secrets).map(function(x){
		var n = typeof x === "string" ? x : x.source, d = p.config.secrets[n] || {};
		var cible = typeof x === "object" && x.target ? (String(x.target).charAt(0) === "/" ? x.target : "/run/secrets/" + x.target) : "/run/secrets/" + n;
		if (d.file) return { nom: n, cible: cible, hoteSource: cheminNormal(String(d.file).charAt(0) === "/" ? d.file : p.dossier + "/" + d.file) };
		if (d.environment) return { nom: n, cible: cible, texte: p.vars[d.environment] || "" };
		return { nom: n, cible: cible, texte: "" };
	});
	o.compose = { projet: p.nom, service: s, numero: numero };
	o.nom = sv.container_name || p.nom + "-" + s + "-" + numero;
	var res = reseauxServiceComposePort(sv);
	o.reseauxCompose = res.map(function(x){ return { nom: nomReseauComposePort(p, x.nom), alias: [s].concat(x.alias) }; });
	if (sv.network_mode) o.reseau = sv.network_mode;
	else if (o.reseauxCompose.length) { o.reseau = o.reseauxCompose[0].nom; o.alias = o.reseauxCompose[0].alias; }
	return o;
}
function nomReseauComposePort(p, n){
	if (n === "default") return p.nom + "_default";
	var d = p.config.networks[n] || {};
	if (d.external) return d.name || n;
	return d.name || p.nom + "_" + n;
}
function hashServiceComposePort(h, p, s){ return sha256(JSON.stringify(p.config.services[s]) + JSON.stringify(envServiceComposePort(h, p, p.config.services[s]))); }
function conteneursComposePort(h, projet, service){
	return conteneursPort(h).filter(function(c){ return c.compose && c.compose.projet === projet && (!service || c.compose.service === service) && !c.compose.unique; }).sort(function(a, b){ return a.compose.service < b.compose.service ? -1 : (a.compose.service > b.compose.service ? 1 : a.compose.numero - b.compose.numero); });
}
function projetsComposePort(h){
	var r = {};
	conteneursPort(h).forEach(function(c){ if (!c.compose) return; var x = r[c.compose.projet] = r[c.compose.projet] || { services: {}, dossier: c.config.Labels["com.docker.compose.project.working_dir"], fichiers: (c.config.Labels["com.docker.compose.project.config_files"] || "").split(",") }; (x.services[c.compose.service] = x.services[c.compose.service] || []).push(c.id); });
	var P = etatPort(h);
	Object.keys(P.projets || {}).forEach(function(n){ if (r[n]) r[n].config = P.projets[n]; });
	return r;
}
function serviceComposePort(h, projet, service){ return conteneursComposePort(h, projet, service); }

/* ================================================================== */
/* docker compose                                                       */
/* ================================================================== */

function ligneComposePort(etat, quoi, statut, temps, echec){
	return " " + (echec ? "✘" : "✔") + " " + completerDroite(quoi, 30) + " " + completerDroite(statut, 39) + (temps || "0.1s");
}
var DEF_COMPOSE_PORT = { court: { f: "file", p: "project-name" }, valeurs: ["file", "project-name", "profile", "env-file", "project-directory", "progress", "ansi"], booleens: ["dry-run", "compatibility"], repetables: ["file", "profile"] };
function composePort(h, a, io){
	var g = lireDrapeauxPort(a, DEF_COMPOSE_PORT, "compose", true);
	var sous = g.reste.shift();
	if (!sous) return "\nUsage:  docker compose [OPTIONS] COMMAND\n\nDefine and run multi-container applications with Docker\n\nCommands:\n  build       Build or rebuild services\n  config      Parse, resolve and render compose file in canonical format\n  down        Stop and remove containers, networks\n  exec        Execute a command in a running container\n  images      List images used by the created containers\n  kill        Force stop service containers\n  logs        View output from containers\n  ls          List running compose projects\n  port        Print the public port for a port binding\n  ps          List containers\n  pull        Pull service images\n  restart     Restart service containers\n  rm          Removes stopped service containers\n  run         Run a one-off command on a service\n  start       Start services\n  stop        Stop services\n  top         Display the running processes\n  up          Create and start containers\n  version     Show the Docker Compose version information\n\nRun 'docker compose COMMAND --help' for more information on a command.";
	if (sous === "version") return "Docker Compose version " + VERSION_COMPOSE_PORT;
	accesDemonPort(h, io, "containers/json");
	if (sous === "ls") return composeLsPort(h, g.reste, io);
	var p = chargerProjetComposePort(h, g.o, io);
	p.avertissements.forEach(function(w){ io.err("WARN[0000] " + w); });
	var P = etatPort(h);
	P.projets = P.projets || {};
	var a2 = g.reste;
	switch (sous){
		case "config": return composeConfigPort(h, p, a2, io);
		case "up": return composeUpPort(h, p, a2, io);
		case "down": return composeDownPort(h, p, a2, io);
		case "ps": return composePsPort(h, p, a2, io);
		case "logs": return composeLogsPort(h, p, a2, io);
		case "exec": return composeExecPort(h, p, a2, io);
		case "run": return composeRunPort(h, p, a2, io);
		case "start": case "stop": case "restart": case "kill": case "pause": case "unpause": return composeCyclePort(h, p, sous, a2, io);
		case "rm": return composeRmPort(h, p, a2, io);
		case "pull": return composePullPort(h, p, a2, io);
		case "build": return composeBuildPort(h, p, a2, io);
		case "images": return composeImagesPort(h, p, a2, io);
		case "top": return composeTopPort(h, p, a2, io);
		case "port": return composePortPort(h, p, a2, io);
		case "create": return composeUpPort(h, p, ["--no-start"].concat(a2), io);
	}
	throw new ShellError("unknown docker command: \"compose " + sous + "\"", 1);
}
function composeConfigPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { q: "quiet" }, booleens: ["quiet", "services", "volumes", "images", "hash", "no-interpolate", "resolve-image-digests"], valeurs: ["format", "output"] }, "compose config");
	evenementPort(h, "composeConfig", { projet: p.nom, dossier: p.dossier, services: Object.keys(p.config.services), option: d.o.services ? "services" : (d.o.volumes ? "volumes" : (d.o.quiet ? "quiet" : "tout")) });
	if (d.o.quiet) return "";
	if (d.o.services) return p.ordre.join("\n");
	if (d.o.volumes) return Object.keys(p.config.volumes).join("\n");
	if (d.o.images) return Object.keys(p.config.services).map(function(s){ return p.config.services[s].image || p.nom + "-" + s; }).join("\n");
	var n = configNormaliseePort(h, p);
	if (d.o.format === "json") return JSON.stringify(n, null, 2);
	return ecrireYamlPort(n, 0).replace(/^\n/, "");
}
/* Préparer les réseaux et les volumes du projet. */
function preparerProjetComposePort(h, p, lignes){
	var nets = {};
	Object.keys(p.config.services).forEach(function(s){ reseauxServiceComposePort(p.config.services[s]).forEach(function(x){ nets[x.nom] = true; }); });
	Object.keys(nets).forEach(function(n){
		var nom = nomReseauComposePort(p, n), def = p.config.networks[n] || {};
		if (reseauPort(h, nom) && reseauPort(h, nom).nom === nom) return;
		if (def.external) throw new ShellError("network " + nom + " declared as external, but could not be found", 1);
		creerReseauPort(h, nom, { pilote: def.driver === "overlay" ? "bridge" : (def.driver || "bridge"), interne: !!def.internal, labels: { "com.docker.compose.network": n, "com.docker.compose.project": p.nom, "com.docker.compose.version": VERSION_COMPOSE_PORT }, compose: p.nom });
		lignes.push(ligneComposePort("", "Network " + nom, "Created", "0.1s"));
	});
	Object.keys(p.config.volumes).forEach(function(v){
		var def = p.config.volumes[v] || {}, nom = def.external ? (def.name || v) : (def.name || p.nom + "_" + v);
		if (volumePort(h, nom)) return;
		if (def.external) throw new ShellError("external volume \"" + nom + "\" not found", 1);
		var utilise = Object.keys(p.config.services).some(function(s){ return listePort(p.config.services[s].volumes).some(function(x){ return String(typeof x === "object" ? x.source : String(x).split(":")[0]) === v; }); });
		if (!utilise) return;
		creerVolumePort(h, nom, { labels: { "com.docker.compose.project": p.nom, "com.docker.compose.volume": v, "com.docker.compose.version": VERSION_COMPOSE_PORT }, compose: p.nom });
		lignes.push(ligneComposePort("", "Volume \"" + nom + "\"", "Created", "0.0s"));
	});
}
/* L'image d'un service : celle du fichier, ou bâtie (build:). */
function imageServiceComposePort(h, p, s, io, forcerBuild, lignes){
	var sv = p.config.services[s];
	var nomImg = sv.image || (p.nom + "-" + s);
	var img = imagePort(h, nomImg);
	if (sv.build && (forcerBuild || !img)){
		var ctxDir = cheminNormal(String(typeof sv.build === "string" ? sv.build : (sv.build.context || ".")).charAt(0) === "/" ? (sv.build.context || sv.build) : p.dossier + "/" + (typeof sv.build === "string" ? sv.build : (sv.build.context || ".")));
		var dfNom = (typeof sv.build === "object" && sv.build.dockerfile) || "Dockerfile";
		var texte = texteHote(h, cheminNormal(ctxDir + "/" + dfNom));
		if (texte === null) throw new ShellError("failed to solve: failed to read dockerfile: open " + dfNom + ": no such file or directory", 1);
		var args = {}; if (typeof sv.build === "object" && sv.build.args){ (Array.isArray(sv.build.args) ? sv.build.args.map(function(x){ var i = x.indexOf("="); return [x.substring(0, i), x.substring(i + 1)]; }) : Object.keys(sv.build.args).map(function(k){ return [k, String(sv.build.args[k])]; })).forEach(function(x){ args[x[0]] = x[1]; }); }
		var res;
		try { res = construireImagePort({ h: h, texte: texte, nomFichier: dfNom, dossier: ctxDir, tags: [nomImg], buildArgs: args, cible: typeof sv.build === "object" ? sv.build.target : null }); }
		catch (e){ if (e instanceof ErreurBuildPort) throw new ShellError("failed to solve: " + e.message, 1); throw e; }
		img = poserImagePort(h, res.image, analyserRefPort(nomImg).nomTag, null);
		res.record.tags = [analyserRefPort(nomImg).nomTag];
		etatPort(h).builds.push(res.record);
		evenementPort(h, "build", { ok: true, image: img.id, tags: res.record.tags, dossier: ctxDir, record: res.record, compose: p.nom });
		lignes.push(ligneComposePort("", "Service " + s, "Built", "3.2s"));
		return { img: img, ref: nomImg };
	}
	if (!img){
		var r = tirerImagePort(h, nomImg, io, true);
		if (r.erreur) throw new ShellError(r.erreur.replace(/^Error response from daemon: /, "Error response from daemon: "), 18);
		img = r.image;
		lignes.push(ligneComposePort("", s, "Pulled", "4.6s"));
	}
	return { img: img, ref: nomImg };
}
/* Attendre qu'une dépendance soit prête (comme compose : la santé se vérifie plusieurs fois). */
function attendreDependancePort(h, c, condition){
	if (condition === "service_started") return enMarchePort(c) ? "ok" : "arrete";
	if (condition === "service_completed_successfully"){ if (enMarchePort(c)){ var pr = c.programme || {}; if (pr.finA !== undefined && pr.finA !== null) conteneurMortPort(h, c, pr.codeFin || 0, "fin"); } return !enMarchePort(c) && c.etat.code === 0 ? "ok" : "echec"; }
	if (!c.config.Healthcheck || c.config.Healthcheck.Test[0] === "NONE") return "sansSante";
	for (var k = 0; k < 6 && enMarchePort(c); k++){
		verifierSantePort(h, c, false);
		if (c.etat.sante.statut === "healthy") return "ok";
		if (c.etat.sante.statut === "unhealthy") return "malade";
	}
	return c.etat.sante && c.etat.sante.statut === "healthy" ? "ok" : (enMarchePort(c) ? "malade" : "arrete");
}
function composeUpPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { d: "detach" }, booleens: ["detach", "build", "no-build", "force-recreate", "no-recreate", "no-deps", "wait", "remove-orphans", "no-start", "quiet-pull", "pull", "always-recreate-deps", "abort-on-container-exit"], valeurs: ["scale", "timeout", "wait-timeout"], repetables: ["scale"] }, "compose up");
	var lignes = [], P = etatPort(h);
	var echelle = {};
	listePort(d.o.scale).forEach(function(x){ var m = /^(\w[\w.-]*)=(\d+)$/.exec(x); if (!m) throw new ShellError("invalid scale: " + x, 1); if (!p.config.services[m[1]]) throw new ShellError("no such service: " + m[1], 1); echelle[m[1]] = +m[2]; });
	var choisis = d.reste.length ? d.reste : p.ordre.slice();
	d.reste.forEach(function(s){ if (!p.config.services[s]) throw new ShellError("no such service: " + s, 1); });
	if (!d.o["no-deps"]){ var tous = {}; (function ajouter(l){ l.forEach(function(s){ if (tous[s]) return; tous[s] = true; ajouter(Object.keys(dependancesComposePort(p.config.services[s]))); }); })(choisis); choisis = p.ordre.filter(function(s){ return tous[s]; }); }
	preparerProjetComposePort(h, p, lignes);
	P.projets[p.nom] = { dossier: p.dossier, fichiers: p.fichiers, config: copieJson(p.config), cree: maintenantPort(h) };
	var etats = {}, erreurFinale = null;
	for (var i = 0; i < choisis.length && !erreurFinale; i++){
		var s = choisis[i], sv = p.config.services[s];
		var voulu = echelle[s] !== undefined ? echelle[s] : (sv.scale !== undefined ? +sv.scale : (sv.deploy && sv.deploy.replicas !== undefined ? +sv.deploy.replicas : 1));
		var im;
		try { im = imageServiceComposePort(h, p, s, io, !!d.o.build && !!sv.build, lignes); }
		catch (e){ if (e instanceof ShellError){ erreurFinale = e.message; lignes.push(ligneComposePort("", "Service " + s, "Error", "0.0s", true)); break; } throw e; }
		var existants = conteneursComposePort(h, p.nom, s);
		var hash = hashServiceComposePort(h, p, s);
		// Les conteneurs en trop (un --scale plus petit).
		existants.filter(function(c){ return c.compose.numero > voulu; }).forEach(function(c){ arreterConteneurPort(h, c, { signal: 15 }); supprimerConteneurPort(h, c, true); lignes.push(ligneComposePort("", "Container " + c.nom, "Removed", "0.2s")); });
		var deps = dependancesComposePort(sv);
		// Attendre les dépendances.
		var depOk = true;
		Object.keys(deps).forEach(function(dep){
			if (!depOk) return;
			conteneursComposePort(h, p.nom, dep).forEach(function(cd){
				if (!depOk) return;
				var r = attendreDependancePort(h, cd, deps[dep].condition);
				if (r === "malade"){ erreurFinale = "dependency failed to start: container " + cd.nom + " is unhealthy"; depOk = false; etats[cd.nom] = "Error"; }
				else if (r === "arrete" || r === "echec"){ erreurFinale = deps[dep].condition === "service_completed_successfully" ? "service \"" + dep + "\" didn't complete successfully: exit " + cd.etat.code : "dependency failed to start: container " + cd.nom + " exited (" + cd.etat.code + ")"; depOk = false; etats[cd.nom] = "Error"; }
				else if (r === "sansSante" && deps[dep].condition === "service_healthy"){ erreurFinale = "dependency failed to start: container " + cd.nom + " has no healthcheck configured"; depOk = false; etats[cd.nom] = "Error"; }
				else if (deps[dep].condition === "service_healthy") etats[cd.nom] = "Healthy";
			});
		});
		for (var n = 1; n <= voulu; n++){
			var c = existants.filter(function(x){ return x.compose.numero === n; })[0];
			var o = optionsServiceComposePort(h, p, s, n);
			if (c && (d.o["force-recreate"] || c.config.Labels["com.docker.compose.config-hash"] !== hash || c.image !== im.img.id) && !d.o["no-recreate"]){
				arreterConteneurPort(h, c, { signal: numeroSignalPort(c.config.StopSignal) || 15, garder: true });
				supprimerConteneurPort(h, c, false);
				c = null;
				etats[o.nom] = "Recreated";
			}
			var neuf = false;
			if (!c){
				try { c = creerConteneurPort(h, im.img, o, im.ref); }
				catch (e2){ if (e2 instanceof ShellError){ erreurFinale = e2.message.replace(/^docker: /, "").replace(/\n\nSee 'docker run --help'\.$/, ""); break; } throw e2; }
				(o.reseauxCompose || []).slice(1).forEach(function(x){ var r = reseauPort(h, x.nom); if (r){ connecterPort(h, c, r, x.alias); c.reseaux[r.nom].alias = x.alias.concat([c.id.substring(0, 12)]); } });
				if (o.reseauxCompose && o.reseauxCompose[0] && c.reseaux[o.reseauxCompose[0].nom]) c.reseaux[o.reseauxCompose[0].nom].alias = o.reseauxCompose[0].alias.concat([c.nom, c.id.substring(0, 12)]);
				neuf = true;
				if (!etats[o.nom]) etats[o.nom] = "Created";
			}
			if (!depOk || d.o["no-start"]){ if (!etats[c.nom]) etats[c.nom] = "Created"; continue; }
			if (!enMarchePort(c)){
				c.etat.arreteMain = false;
				var r2 = demarrerConteneurPort(h, c, {});
				if (!r2.ok){ erreurFinale = r2.erreur.replace(/^docker: /, ""); etats[c.nom] = "Error"; break; }
				etats[c.nom] = etats[c.nom] === "Recreated" ? "Started" : "Started";
			} else if (!neuf && etats[c.nom] !== "Recreated") etats[c.nom] = "Running";
		}
		if (echelle[s] !== undefined) evenementPort(h, "composeScale", { projet: p.nom, service: s, voulu: voulu });
	}
	// L'ordre d'affichage : les conteneurs du projet, dans l'ordre des dépendances.
	choisis.forEach(function(s){
		conteneursComposePort(h, p.nom, s).forEach(function(c){
			var e = etats[c.nom] || (enMarchePort(c) ? "Running" : "Created");
			if (e === "Started" && c.etat.sante && d.o.wait){ attendreDependancePort(h, c, "service_healthy"); e = c.etat.sante.statut === "healthy" ? "Healthy" : "Error"; }
			lignes.push(ligneComposePort("", "Container " + c.nom, e, e === "Running" ? "0.0s" : tempsPort(c.id + e), e === "Error"));
		});
	});
	var total = lignes.length, oks = lignes.filter(function(l){ return l.indexOf("✘") === -1; }).length;
	evenementPort(h, "composeUp", { projet: p.nom, dossier: p.dossier, ok: !erreurFinale, erreur: erreurFinale, services: choisis, detache: !!d.o.detach, echelle: echelle });
	var sortie = "[+] Running " + oks + "/" + total + "\n" + lignes.join("\n");
	if (erreurFinale){ io.code = 1; return sortie + "\n" + erreurFinale; }
	if (d.o.detach || d.o["no-start"]) return sortie;
	var attaches = conteneursComposePort(h, p.nom).filter(function(c){ return choisis.indexOf(c.compose.service) > -1; });
	var large = Math.max.apply(null, attaches.map(function(c){ return c.nom.length; }).concat([0]));
	var journal = [];
	attaches.forEach(function(c){ c.journaux.forEach(function(j){ journal.push({ t: j.t, l: completerDroite(c.nom, large) + "  | " + j.l }); }); });
	journal.sort(function(x, y){ return x.t - y.t; });
	return sortie + "\nAttaching to " + attaches.map(function(c){ return c.nom; }).join(", ") + "\n" + journal.map(function(j){ return j.l; }).join("\n") + astuce(io, "Au premier plan, compose montre les journaux jusqu'à Ctrl+C (qui arrête tout). Ici, le jeu te rend la main ; les conteneurs tournent. -d les lance en arrière-plan.");
}
function composeDownPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { v: "volumes", t: "timeout" }, booleens: ["volumes", "remove-orphans"], valeurs: ["rmi", "timeout"] }, "compose down");
	var lignes = [];
	var cs = conteneursPort(h).filter(function(c){ return c.compose && c.compose.projet === p.nom; });
	var ordre = p.ordre.slice().reverse();
	cs.sort(function(x, y){ return ordre.indexOf(x.compose.service) - ordre.indexOf(y.compose.service); });
	cs.forEach(function(c){ arreterConteneurPort(h, c, { signal: numeroSignalPort(c.config.StopSignal) || 15, garder: true }); supprimerConteneurPort(h, c, !!d.o.volumes); lignes.push(ligneComposePort("", "Container " + c.nom, "Removed", tempsPort(c.id + "rm"))); });
	var volumes = [];
	if (d.o.volumes){
		Object.keys(p.config.volumes).forEach(function(v){ var def = p.config.volumes[v] || {}; if (def.external) return; var nom = def.name || p.nom + "_" + v; if (volumePort(h, nom) && !volumeUtilisePort(h, nom).length){ supprimerVolumePort(h, nom); volumes.push(nom); lignes.push(ligneComposePort("", "Volume " + nom, "Removed", "0.0s")); } });
	}
	var nets = {};
	Object.keys(p.config.services).forEach(function(s){ reseauxServiceComposePort(p.config.services[s]).forEach(function(x){ nets[x.nom] = true; }); });
	Object.keys(nets).forEach(function(n){
		var def = p.config.networks[n] || {}; if (def.external) return;
		var r = reseauPort(h, nomReseauComposePort(p, n));
		if (!r || r.nom !== nomReseauComposePort(p, n)) return;
		if (conteneursPort(h).some(function(c){ return c.reseaux && c.reseaux[r.nom]; })) return;
		delete etatPort(h).reseaux[r.id];
		evenementDockerPort(h, "network", "destroy", r.id, { name: r.nom, type: r.pilote });
		lignes.push(ligneComposePort("", "Network " + r.nom, "Removed", "0.1s"));
	});
	if (d.o.rmi){ Object.keys(p.config.services).forEach(function(s){ var sv = p.config.services[s]; if (d.o.rmi === "local" && sv.image) return; var im = imagePort(h, sv.image || p.nom + "-" + s); if (im && !conteneursPort(h).some(function(c){ return c.image === im.id; })){ supprimerImagePort(h, im); lignes.push(ligneComposePort("", "Image " + (sv.image || p.nom + "-" + s), "Removed", "0.0s")); } }); }
	evenementPort(h, "composeDown", { projet: p.nom, volumes: !!d.o.volumes, volumesSupprimes: volumes, conteneurs: cs.map(function(c){ return c.nom; }) });
	return "[+] Running " + lignes.length + "/" + lignes.length + "\n" + lignes.join("\n");
}
function composePsPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet" }, booleens: ["all", "quiet", "services", "no-trunc", "orphans"], valeurs: ["format", "filter", "status"], repetables: ["filter", "status"] }, "compose ps");
	var cs = conteneursComposePort(h, p.nom).filter(function(c){ return (d.o.all || enMarchePort(c) || c.etat.statut === "restarting") && (!d.reste.length || d.reste.indexOf(c.compose.service) > -1); });
	listePort(d.o.status).forEach(function(st){ cs = cs.filter(function(c){ return c.etat.statut === st; }); });
	evenementPort(h, "composePs", { projet: p.nom, format: d.o.format || null, conteneurs: cs.map(function(c){ return c.nom; }) });
	if (d.o.quiet) return cs.map(function(c){ return c.id; }).join("\n");
	if (d.o.services) return cs.map(function(c){ return c.compose.service; }).filter(function(v, i, t){ return t.indexOf(v) === i; }).join("\n");
	var objets = cs.map(function(c){ var o = objetPsPort(h, c); o.Name = c.nom; o.Service = c.compose.service; o.Project = p.nom; o.Health = c.etat.sante ? c.etat.sante.statut : ""; o.ExitCode = c.etat.code; o.Publishers = portsPubliesPort(h, c); o.Command = commandePsPort(c, true); return o; });
	if (d.o.format) return formaterListePort(d.o.format, objets, { Name: "NAME", Image: "IMAGE", Command: "COMMAND", Service: "SERVICE", RunningFor: "CREATED", Status: "STATUS", Ports: "PORTS", State: "STATE", Health: "HEALTH", Project: "PROJECT", ID: "CONTAINER ID", ExitCode: "EXIT CODE" });
	return tableauPort(["NAME", "IMAGE", "COMMAND", "SERVICE", "CREATED", "STATUS", "PORTS"], objets.map(function(o){ return [o.Name, o.Image, o.Command, o.Service, o.RunningFor, o.Status, o.Ports]; }));
}
function composeLogsPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "follow", t: "timestamps", n: "tail" }, booleens: ["follow", "timestamps", "no-color", "no-log-prefix"], valeurs: ["tail", "since", "until"] }, "compose logs");
	var cs = conteneursComposePort(h, p.nom).filter(function(c){ return !d.reste.length || d.reste.indexOf(c.compose.service) > -1; });
	d.reste.forEach(function(s){ if (!p.config.services[s]) throw new ShellError("no such service: " + s, 1); });
	var large = Math.max.apply(null, cs.map(function(c){ return c.nom.length; }).concat([0]));
	var journal = [];
	cs.forEach(function(c){
		var l = c.journaux.slice();
		if (d.o.since){ var t1 = lireInstantPort(h, d.o.since); l = l.filter(function(x){ return x.t >= t1; }); }
		if (d.o.tail !== undefined && d.o.tail !== "all") l = l.slice(-(+d.o.tail || 0));
		l.forEach(function(j){ journal.push({ t: j.t, l: (d.o["no-log-prefix"] ? "" : completerDroite(c.nom, large) + "  | ") + (d.o.timestamps ? dateIsoPort(j.t) + " " : "") + j.l }); });
	});
	journal.sort(function(x, y){ return x.t - y.t; });
	evenementPort(h, "composeLogs", { projet: p.nom, services: d.reste, suivre: !!d.o.follow, lignes: journal.length });
	return journal.map(function(j){ return j.l; }).join("\n") + (d.o.follow ? astuce(io, "compose logs -f suit jusqu'à Ctrl+C ; ici, le jeu te rend la main.") : "");
}
function composeExecPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { T: "no-TTY", u: "user", e: "env", w: "workdir", d: "detach" }, booleens: ["no-TTY", "detach", "privileged", "interactive", "tty"], valeurs: ["user", "env", "workdir", "index"], repetables: ["env"] }, "compose exec", true);
	if (d.reste.length < 2) throw new ShellError("\"docker compose exec\" requires at least 2 arguments.", 1);
	var s = d.reste[0];
	if (!p.config.services[s]) throw new ShellError("no such service: " + s, 1);
	var c = conteneursComposePort(h, p.nom, s).filter(function(x){ return x.compose.numero === +(d.o.index || 1); })[0];
	if (!c || !enMarchePort(c)) throw new ShellError("service \"" + s + "\" is not running", 1);
	var args = [];
	if (!d.o["no-TTY"] && io.tty) args.push("-it");
	if (d.o.user) args.push("-u", d.o.user);
	if (d.o.workdir) args.push("-w", d.o.workdir);
	listePort(d.o.env).forEach(function(e){ args.push("-e", e); });
	evenementPort(h, "composeExec", { projet: p.nom, service: s, argv: d.reste.slice(1) });
	return execPort(h, args.concat([c.id]).concat(d.reste.slice(1)), io);
}
function composeRunPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { d: "detach", e: "env", u: "user", w: "workdir", T: "no-TTY", p: "publish", v: "volume" }, booleens: ["rm", "detach", "no-TTY", "no-deps", "service-ports", "build"], valeurs: ["env", "user", "workdir", "name", "entrypoint", "publish", "volume"], repetables: ["env", "publish", "volume"] }, "compose run", true);
	var s = d.reste[0];
	if (!s || !p.config.services[s]) throw new ShellError("no such service: " + (s || ""), 1);
	var lignes = [];
	preparerProjetComposePort(h, p, lignes);
	var im = imageServiceComposePort(h, p, s, io, false, lignes);
	var o = optionsServiceComposePort(h, p, s, 1);
	o.nom = d.o.name || p.nom + "-" + s + "-run-" + hexDe("run" + state.nbCommandes, 12);
	o.compose.unique = true;
	o.labels["com.docker.compose.oneoff"] = "True";
	if (!d.o["service-ports"]) o.ports = [];
	if (d.reste.length > 1) o.cmd = d.reste.slice(1);
	listePort(d.o.env).forEach(function(e){ o.env.push(e); });
	if (d.o.user) o.user = d.o.user;
	o.autoRemove = !!d.o.rm;
	o.interactif = !d.o["no-TTY"]; o.tty = !d.o["no-TTY"] && io.tty;
	var c = creerConteneurPort(h, im.img, o, im.ref);
	var r = demarrerConteneurPort(h, c, {});
	if (!r.ok){ io.code = 1; return r.erreur.replace(/^docker: /, ""); }
	if (d.o.detach) return c.nom;
	if (c.programme && (c.programme.type === "shell-interactif" || c.programme.type === "python-repl") && o.tty){ ouvrirSessionPort(h, c, { principale: true, retirer: !!d.o.rm, python: c.programme.type === "python-repl" }); return ""; }
	var sortie = c.journaux.map(function(j){ return j.l; }).join("\n");
	if (!enMarchePort(c)) io.code = c.etat.code;
	return sortie;
}
function composeCyclePort(h, p, quoi, a, io){
	var d = lireDrapeauxPort(a, { court: { t: "timeout", s: "signal" }, valeurs: ["timeout", "signal"] }, "compose " + quoi);
	var cs = conteneursComposePort(h, p.nom).filter(function(c){ return !d.reste.length || d.reste.indexOf(c.compose.service) > -1; });
	if (quoi === "stop" || quoi === "kill" || quoi === "pause") cs.reverse();
	var lignes = [];
	cs.forEach(function(c){
		if (quoi === "start"){ if (!enMarchePort(c)){ c.etat.arreteMain = false; var r = demarrerConteneurPort(h, c, {}); lignes.push(ligneComposePort("", "Container " + c.nom, r.ok ? "Started" : "Error", "0.4s", !r.ok)); } }
		else if (quoi === "stop"){ arreterConteneurPort(h, c, { signal: numeroSignalPort(c.config.StopSignal) || 15 }); lignes.push(ligneComposePort("", "Container " + c.nom, "Stopped", tempsPort(c.id + "st"))); }
		else if (quoi === "kill"){ if (enMarchePort(c)){ arreterConteneurPort(h, c, { signal: numeroSignalPort(d.o.signal || "KILL"), kill: true }); lignes.push(ligneComposePort("", "Container " + c.nom, "Killed", "0.2s")); } }
		else if (quoi === "restart"){ arreterConteneurPort(h, c, { signal: numeroSignalPort(c.config.StopSignal) || 15, garder: true }); c.etat.arreteMain = false; var r2 = demarrerConteneurPort(h, c, {}); evenementDockerPort(h, "container", "restart", c.id, { image: c.imageRef, name: c.nom }); lignes.push(ligneComposePort("", "Container " + c.nom, r2.ok ? "Started" : "Error", "0.9s", !r2.ok)); }
		else if (quoi === "pause" || quoi === "unpause"){ if (quoi === "pause" && enMarchePort(c)) c.etat.statut = "paused"; if (quoi === "unpause" && c.etat.statut === "paused") c.etat.statut = "running"; lignes.push(ligneComposePort("", "Container " + c.nom, quoi === "pause" ? "Paused" : "Unpaused", "0.1s")); }
	});
	evenementPort(h, "compose" + quoi.charAt(0).toUpperCase() + quoi.substring(1), { projet: p.nom, services: d.reste });
	return "[+] " + ({ start: "Running", stop: "Stopping", restart: "Restarting", kill: "Killing", pause: "Pausing", unpause: "Unpausing" }[quoi]) + " " + lignes.length + "/" + lignes.length + "\n" + lignes.join("\n");
}
function composeRmPort(h, p, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "force", s: "stop", v: "volumes" }, booleens: ["force", "stop", "volumes"] }, "compose rm");
	var cs = conteneursComposePort(h, p.nom).filter(function(c){ return (!d.reste.length || d.reste.indexOf(c.compose.service) > -1) && (!enMarchePort(c) || d.o.stop); });
	if (!cs.length) return "No stopped containers";
	var faire = function(){ cs.forEach(function(c){ if (enMarchePort(c)) arreterConteneurPort(h, c, { signal: 15, garder: true }); supprimerConteneurPort(h, c, !!d.o.volumes); }); return "[+] Removing " + cs.length + "/" + cs.length + "\n" + cs.map(function(c){ return ligneComposePort("", "Container " + c.nom, "Removed", "0.0s"); }).join("\n"); };
	if (d.o.force) return faire();
	return demanderConfirmationPort("Going to remove " + cs.map(function(c){ return c.nom; }).join(", ") + "\n? Are you sure? (y/N) ", faire, io);
}
function composePullPort(h, p, a, io){
	var l = [];
	Object.keys(p.config.services).forEach(function(s){ var sv = p.config.services[s]; if (!sv.image) { l.push(ligneComposePort("", s, "Skipped - No image to be pulled", "0.0s")); return; } var r = tirerImagePort(h, sv.image, io, true); l.push(ligneComposePort("", s, r.erreur ? "Error" : "Pulled", "2.1s", !!r.erreur)); });
	return "[+] Pulling " + l.length + "/" + l.length + "\n" + l.join("\n");
}
function composeBuildPort(h, p, a, io){
	var l = [];
	Object.keys(p.config.services).forEach(function(s){ if (!p.config.services[s].build || (a.length && a.indexOf(s) === -1)) return; imageServiceComposePort(h, p, s, io, true, l); });
	return l.length ? "[+] Building " + l.length + "/" + l.length + "\n" + l.join("\n") : "";
}
function composeImagesPort(h, p, a, io){
	var cs = conteneursComposePort(h, p.nom);
	return tableauPort(["CONTAINER", "REPOSITORY", "TAG", "IMAGE ID", "SIZE"], cs.map(function(c){ var im = imageDuConteneurPort(h, c), t = (im && im.tags[0]) || c.imageRef; return [c.nom, t.substring(0, t.lastIndexOf(":")) || t, t.substring(t.lastIndexOf(":") + 1), courtPort(c.image), tailleDockerPort(im ? tailleImagePort(h, im) : 0)]; }));
}
function composeTopPort(h, p, a, io){
	var services = a.filter(function(x){ return x.charAt(0) !== "-"; });
	services.forEach(function(sv){ if (!p.config.services[sv]) throw new ShellError("no such service: " + sv, 1); });
	evenementPort(h, "composeTop", { projet: p.nom, services: services });
	return conteneursComposePort(h, p.nom).filter(function(c){ return enMarchePort(c) && (!services.length || services.indexOf(c.compose.service) > -1); }).map(function(c){
		var procs = procsMachine(h).filter(function(x){ return x.conteneur === c.id && !x.shim && !x.proxy; });
		return c.nom + "\n" + tableauSerrePort(["UID", "PID", "PPID", "C", "STIME", "TTY", "TIME", "CMD"], procs.map(function(x){ var d = dateMachine(h, x.debut); return [x.user, x.pid, x.ppid, "0", deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()), "?", "00:00:00", x.cmd]; }), 3);
	}).join("\n\n");
}
function composePortPort(h, p, a, io){
	var s = a[0], port = a[1];
	if (!s || !port) throw new ShellError("\"docker compose port\" requires exactly 2 arguments.", 1);
	var c = conteneursComposePort(h, p.nom, s)[0];
	if (!c) throw new ShellError("no container found for " + s + "_1", 1);
	var x = portsPubliesPort(h, c).filter(function(q){ return +q.cp === +String(port).split("/")[0]; })[0];
	if (!x) throw new ShellError("no port " + port + " for container " + c.nom, 1);
	return (x.ip || "0.0.0.0") + ":" + x.hp;
}
function composeLsPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet" }, booleens: ["all", "quiet"], valeurs: ["format", "filter"] }, "compose ls");
	var pr = projetsComposePort(h);
	var lignes = Object.keys(pr).sort().map(function(n){
		var ids = []; Object.keys(pr[n].services).forEach(function(s){ ids = ids.concat(pr[n].services[s]); });
		var cs = ids.map(function(id){ return etatPort(h).conteneurs[id]; }).filter(Boolean);
		var enM = cs.filter(enMarchePort).length, sortis = cs.length - enM;
		return [n, (enM ? "running(" + enM + ")" : "") + (sortis ? (enM ? ", " : "") + "exited(" + sortis + ")" : ""), pr[n].fichiers.join(",")];
	}).filter(function(l){ return d.o.all || /running/.test(l[1]); });
	if (d.o.quiet) return lignes.map(function(l){ return l[0]; }).join("\n");
	return tableauPort(["NAME", "STATUS", "CONFIG FILES"], lignes);
}
