/**
 * SortsPortBuild.js : le moteur des conteneurs du Grand Port, cinquième partie : construire ses propres plans.
 *
 * docker build lit un vrai Dockerfile (FROM [AS], RUN, COPY [--from, --chown, --chmod], ADD, WORKDIR, ENV, ARG et
 * --build-arg, EXPOSE, CMD et ENTRYPOINT en forme exec ou shell, USER, HEALTHCHECK, LABEL, VOLUME, STOPSIGNAL, SHELL,
 * ONBUILD ; les continuations « \ », les commentaires, la directive « # syntax= ») et le contexte qu'on lui donne,
 * filtré par .dockerignore. Chaque RUN s'exécute vraiment dans le petit shell, sur les couches déjà bâties : apt-get,
 * apk, pip, make y écrivent des fichiers, et ce qui change devient une couche (sa taille vient de ce qu'elle ajoute ;
 * un « rm » dans un autre RUN ne rend rien). Le cache est réel : la clé d'une étape est la chaîne des étapes d'avant,
 * plus le texte de l'instruction, plus l'empreinte des fichiers copiés ; une étape manquée invalide toute la suite.
 * Plusieurs étapes (multi-stage), --target, --no-cache, -f, --progress=plain, -q. La sortie imite BuildKit.
 *
 * --- Ce que le monde peut lire ---
 *   etatPort(h).builds : [{ tags, dossier, dockerfile, etapes: [{ texte, cache, stage, type, couche }], contexteOctets,
 *                          contexteFichiers, stages, cible, buildArgs, t, image, ok, erreur }]
 *   dernierBuildPort(h, filtre) ; construireSilencieuxPort(h, texteDockerfile, dossierContexte, tag)
 */

var INSTRUCTIONS_PORT = ["FROM", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV", "ADD", "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL"];

/* ================================================================== */
/* Lire un Dockerfile                                                   */
/* ================================================================== */

function analyserDockerfilePort(texte){
	var lignes = String(texte).split("\n"), instr = [], i = 0, directives = {};
	var enTete = true;
	while (i < lignes.length){
		var brute = lignes[i], debut = i + 1;
		if (/^\s*#/.test(brute)){
			var dm = /^\s*#\s*(syntax|escape|check)\s*=\s*(\S+)/i.exec(brute);
			if (dm && enTete) directives[dm[1].toLowerCase()] = dm[2];
			i++; continue;
		}
		if (brute.trim() === ""){ i++; continue; }
		enTete = false;
		var complete = brute;
		while (/\\\s*$/.test(complete) && i + 1 < lignes.length){
			i++;
			var suite = lignes[i];
			if (/^\s*#/.test(suite)) { complete = complete.replace(/\\\s*$/, "\\"); continue; }
			complete = complete.replace(/\\\s*$/, " ") + suite.replace(/^\s+/, "");
		}
		complete = complete.replace(/\\\s*$/, "");
		var m = /^\s*(\S+)\s*(.*)$/.exec(complete);
		instr.push({ mot: m[1], cle: m[1].toUpperCase(), args: m[2].trim(), ligne: debut, fin: i + 1, brute: complete.trim() });
		i++;
	}
	return { instructions: instr, directives: directives, lignes: lignes };
}
/* La suggestion de BuildKit pour une instruction mal écrite. */
function suggestionInstructionPort(mot){
	var u = mot.toUpperCase(), meilleur = null, d = 99;
	INSTRUCTIONS_PORT.forEach(function(k){
		var dist = distanceLevenshteinPort(u, k);
		if (dist < d){ d = dist; meilleur = k; }
	});
	return d <= 2 ? meilleur : null;
}
function distanceLevenshteinPort(a, b){
	var m = [];
	for (var i = 0; i <= a.length; i++){ m[i] = [i]; }
	for (var j = 0; j <= b.length; j++) m[0][j] = j;
	for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
	return m[a.length][b.length];
}
/* L'extrait que BuildKit montre autour d'une ligne fautive. */
function extraitDockerfilePort(nom, lignes, ligne, fin){
	var debut = Math.max(1, ligne - 2), dernier = Math.min(lignes.length, (fin || ligne) + 2);
	var l = [nom + ":" + ligne + (fin && fin > ligne ? "-" + fin : ""), "--------------------"];
	for (var k = debut; k <= dernier; k++){
		var marque = k >= ligne && k <= (fin || ligne);
		l.push(completerGauche(k, 4) + " | " + (marque ? ">>> " : "    ") + (lignes[k - 1] || ""));
	}
	l.push("--------------------");
	return l.join("\n");
}
/* Une forme exec ["a", "b"] ou une forme shell. */
function lireFormeExecPort(args){
	var t = String(args).trim();
	if (t.charAt(0) === "["){ try { var j = JSON.parse(t); if (Array.isArray(j) && j.every(function(x){ return typeof x === "string"; })) return { exec: true, argv: j }; } catch (e){} }
	return { exec: false, texte: t };
}
/* $VAR, ${VAR}, ${VAR:-defaut} dans une instruction (ENV, ARG, WORKDIR, COPY, FROM...). */
function substituerPort(texte, vars){
	return String(texte).replace(/\\\$/g, "\u0001").replace(/\$\{(\w+)(?::?([-+])([^}]*))?\}|\$(\w+)/g, function(t, n1, op, mot, n2){
		var n = n1 || n2, v = vars.hasOwnProperty(n) ? vars[n] : undefined;
		if (op === "-") return v === undefined || v === "" ? mot : v;
		if (op === "+") return v === undefined || v === "" ? "" : mot;
		return v === undefined ? "" : v;
	}).replace(/\u0001/g, "$");
}
/* ENV K=V K2="V 2", ou ENV K V. LABEL pareil. */
function lirePairesPort(args, cle){
	var r = [], t = String(args).trim();
	if (!/^\S+=/.test(t)){
		var m = /^(\S+)\s+(.*)$/.exec(t);
		if (!m) return null;
		return [[m[1], m[2].replace(/^"(.*)"$/, "$1")]];
	}
	var re = /([^\s=]+)=("(?:[^"\\]|\\.)*"|'[^']*'|\S*)/g, x;
	while ((x = re.exec(t))) r.push([x[1].replace(/^"(.*)"$/, "$1"), x[2].replace(/^"([\s\S]*)"$/, "$1").replace(/^'(.*)'$/, "$1").replace(/\\"/g, "\"")]);
	return r;
}

/* ================================================================== */
/* Le contexte et .dockerignore                                         */
/* ================================================================== */

function reglesIgnorePort(texte){
	return String(texte || "").split("\n").map(function(l){ return l.trim(); }).filter(function(l){ return l && l.charAt(0) !== "#"; }).map(function(l){
		var neg = l.charAt(0) === "!";
		var p = cheminNormal("/" + l.replace(/^!/, "")).replace(/^\//, "").replace(/\/$/, "");
		var re = new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "(/.*)?$");
		return { neg: neg, re: re, motif: l };
	});
}
function ignorePort(regles, chemin){
	var ignore = false;
	regles.forEach(function(r){ if (r.re.test(chemin)) ignore = !r.neg; });
	return ignore;
}
/* Les fichiers du contexte : { "chemin/relatif": { e, taille, empreinte } }, filtrés. */
function contexteBuildPort(h, dossier, regles){
	var r = dossierHote(h, dossier), fichiers = {}, octets = 0;
	if (!r) return null;
	(function parcourir(lieu, rel){
		lieu.items.forEach(function(it){
			var p = rel ? rel + "/" + it.itemname : it.itemname;
			if (ignorePort(regles, p)) return;
			var e = entreeDepuisHotePort(h, it); delete e.hote; e.u = 0; e.g = 0;
			if (it.binaire && it.binaire.prog) e.x = it.binaire.prog;
			fichiers[p] = e;
			octets += e.s || 0;
		});
		lieu.children.forEach(function(c){
			if (c.parents[0] !== lieu) return;
			var p = rel ? rel + "/" + c.room_name : c.room_name;
			if (ignorePort(regles, p)) return;
			fichiers[p] = { t: "d", m: c.mode || "rwxr-xr-x", u: 0, g: 0 };
			parcourir(c, p);
		});
	})(r, "");
	return { fichiers: fichiers, octets: octets };
}
function empreinteFichiersPort(liste){ return sha256(liste.map(function(x){ return x[0] + ":" + x[1].t + ":" + (x[1].m || "") + ":" + (x[1].s || 0) + ":" + (x[1].c !== undefined ? sha256(x[1].c) : "") + ":" + (x[1].x || ""); }).join("\n")); }

/* ================================================================== */
/* Construire                                                           */
/* ================================================================== */

function ErreurBuildPort(message, extrait, journal){ this.message = message; this.extrait = extrait; this.journal = journal || []; }
/*
 * o : { h, texte (Dockerfile), nomFichier, dossier (contexte), tags: [], buildArgs: {}, sansCache, cible, labels, io (ou null), silencieux }
 * Renvoie { image, etapes, record } ou lève une ErreurBuildPort.
 */
function construireImagePort(o){
	var h = o.h, P = etatPort(h);
	var df = analyserDockerfilePort(o.texte);
	var etapesAff = [];        // ce que montre BuildKit
	var record = { tags: (o.tags || []).slice(), dossier: o.dossier, dockerfile: o.nomFichier, etapes: [], contexteOctets: 0, contexteFichiers: [], stages: [], cible: o.cible || null, buildArgs: copieJson(o.buildArgs || {}), t: maintenantPort(h), ok: false, sansCache: !!o.sansCache };
	// Les instructions inconnues : refus dès la lecture.
	for (var k = 0; k < df.instructions.length; k++){
		var ins = df.instructions[k];
		if (INSTRUCTIONS_PORT.indexOf(ins.cle) === -1){
			var sug = suggestionInstructionPort(ins.mot);
			throw new ErreurBuildPort("dockerfile parse error on line " + ins.ligne + ": unknown instruction: " + ins.mot + (sug ? " (did you mean " + sug.toLowerCase() + "?)" : ""), extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
		}
	}
	// Les étapes (stages).
	var globaux = {}, stages = [], courant = null;
	df.instructions.forEach(function(ins){
		if (ins.cle === "FROM"){ var m = /^(?:--platform=\S+\s+)?(\S+)(?:\s+as\s+(\S+))?\s*$/i.exec(ins.args); courant = { ref: m ? m[1] : ins.args, nom: m && m[2] ? m[2].toLowerCase() : null, instr: [ins], index: stages.length }; stages.push(courant); return; }
		if (!courant){
			if (ins.cle === "ARG"){ var a = /^(\w+)(?:=(.*))?$/.exec(ins.args); if (a) globaux[a[1]] = o.buildArgs && o.buildArgs.hasOwnProperty(a[1]) ? o.buildArgs[a[1]] : (a[2] !== undefined ? a[2].replace(/^"(.*)"$/, "$1") : ""); return; }
			throw new ErreurBuildPort("no build stage in current context", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
		}
		courant.instr.push(ins);
	});
	if (!stages.length) throw new ErreurBuildPort("failed to parse dockerfile: file with no instructions", null);
	record.stages = stages.map(function(s){ return s.nom || String(s.index); });
	var cibleIdx = stages.length - 1;
	if (o.cible){
		cibleIdx = -1;
		stages.forEach(function(s, i){ if (s.nom === o.cible.toLowerCase()) cibleIdx = i; });
		if (cibleIdx < 0) throw new ErreurBuildPort("target stage \"" + o.cible + "\" could not be found", null);
	}
	// Les étapes nécessaires à la cible.
	var necessaires = {};
	(function besoin(i){
		if (necessaires[i]) return; necessaires[i] = true;
		var s = stages[i];
		var dep = stages.filter(function(x, j){ return j < i && x.nom && x.nom === String(substituerPort(s.ref, globaux)).toLowerCase(); })[0];
		if (dep) besoin(dep.index);
		s.instr.forEach(function(ins){ var m = /--from=(\S+)/.exec(ins.args); if (ins.cle === "COPY" && m){ var n = m[1].toLowerCase(); var d2 = stages.filter(function(x, j){ return j < i && (x.nom === n || String(j) === n); })[0]; if (d2) besoin(d2.index); } });
	})(cibleIdx);
	// Le contexte.
	var regles = reglesIgnorePort(o.dossier ? texteHote(h, cheminNormal(o.dossier + "/.dockerignore")) : "");
	var ctx = o.dossier ? contexteBuildPort(h, o.dossier, regles) : { fichiers: {}, octets: 0 };
	record.contexteOctets = ctx.octets;
	record.contexteFichiers = Object.keys(ctx.fichiers);
	record.dockerignore = regles.map(function(r){ return r.motif; });
	var etats = {};
	var nbOps = 0;
	Object.keys(necessaires).forEach(function(i){ stages[i].instr.forEach(function(ins){ if (["FROM", "RUN", "COPY", "ADD", "WORKDIR"].indexOf(ins.cle) > -1) nbOps++; }); });
	var affiche = { metadonnees: [], etapes: [] };
	var argsUtilises = {};
	stages.forEach(function(s, i){
		if (!necessaires[i]) return;
		var nomStage = s.nom || (stages.length > 1 ? "stage-" + i : null);
		var ops = s.instr.filter(function(ins){ return ["FROM", "RUN", "COPY", "ADD", "WORKDIR"].indexOf(ins.cle) > -1; }).length, n = 0;
		var et = { couches: [], config: { Env: [], Cmd: null, Entrypoint: null, WorkingDir: "", User: "", ExposedPorts: {}, Labels: {}, Volumes: null, Healthcheck: null, StopSignal: null, Shell: null, OnBuild: null }, historique: [], cle: "", args: {}, base: null };
		var vars = function(){ var v = {}; Object.keys(globaux).forEach(function(k){ v[k] = globaux[k]; }); Object.keys(et.args).forEach(function(k){ v[k] = et.args[k]; }); et.config.Env.forEach(function(e){ var x = e.indexOf("="); v[e.substring(0, x)] = e.substring(x + 1); }); return v; };
		var nomEtape = function(){ n++; return "[" + (nomStage ? nomStage + " " : "") + n + "/" + ops + "]"; };
		var ajouterHist = function(cmd, couche){ var x = { created: dateIsoPort(maintenantPort(h)).replace(/\.\d+Z$/, "Z"), created_by: cmd, comment: "buildkit.dockerfile.v0" }; if (!couche) x.empty_layer = true; et.historique.push(x); };
		s.instr.forEach(function(ins){
			var V = vars();
			var texteEtape = ins.cle + " " + ins.args;
			switch (ins.cle){
				case "FROM": {
					var ref = substituerPort(s.ref, globaux).toLowerCase() === "scratch" ? "scratch" : substituerPort(s.ref, globaux);
					var parent = stages.filter(function(x, j){ return j < i && x.nom === ref.toLowerCase(); })[0];
					var e0 = nomEtape();
					if (ref === "scratch"){ et.cle = sha256("scratch"); et.base = "scratch"; n--; break; }
					if (parent){
						var ep = etats[parent.index];
						et.couches = ep.couches.slice(); et.config = copieJson(ep.config); et.historique = copieJson(ep.historique); et.cle = ep.cle; et.base = ep.base;
						affiche.etapes.push({ texte: e0 + " FROM " + ref, cache: true, type: "FROM" });
						break;
					}
					var im = imagePort(h, ref), pull = null;
					if (!im){
						var r = tirerImagePort(h, ref, null, true);
						if (r.erreur){
							var ar = analyserRefPort(ref);
							if (/network is unreachable/.test(r.erreur)) throw new ErreurBuildPort(ar.complet.replace(/:latest$/, ":latest") + ": failed to resolve source metadata for " + ar.complet + ": failed to do request: Head \"https://" + ar.registre + "/v2/" + ar.depot + "/manifests/" + ar.tag + "\": dial tcp 198.51.100.20:443: connect: network is unreachable", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
							if (/manifest unknown|not found/.test(r.erreur)) throw new ErreurBuildPort(ref + ": failed to resolve source metadata for " + ar.complet + ": " + ar.complet + ": not found", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
							throw new ErreurBuildPort(ar.complet + ": failed to resolve source metadata for " + ar.complet + ": pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
						}
						im = r.image; pull = r;
					}
					var aref = analyserRefPort(ref);
					affiche.metadonnees.push(aref.complet.replace(/@.*$/, ""));
					et.couches = im.couches.slice(); et.config = copieJson(im.config || {}); et.historique = copieJson(im.historique || []);
					["Env", "ExposedPorts", "Labels"].forEach(function(k){ if (!et.config[k]) et.config[k] = k === "Env" ? [] : {}; });
					et.cle = sha256("from:" + im.id); et.base = im.id;
					var dg = (im.digests || [])[0];
					affiche.etapes.push({ texte: e0 + " FROM " + aref.complet.replace(/:[^:\/]+$/, function(t){ return t; }) + (dg ? "@" + dg.split("@")[1] : ""), cache: false, type: "FROM", pull: pull ? im.couches.length : 0 });
					break;
				}
				case "ARG": {
					var a = /^(\w+)(?:=(.*))?$/.exec(ins.args);
					if (!a) break;
					var defaut = a[2] !== undefined ? a[2].replace(/^"(.*)"$/, "$1") : (globaux.hasOwnProperty(a[1]) ? globaux[a[1]] : undefined);
					var val = o.buildArgs && o.buildArgs.hasOwnProperty(a[1]) ? o.buildArgs[a[1]] : defaut;
					if (o.buildArgs && o.buildArgs.hasOwnProperty(a[1])) argsUtilises[a[1]] = true;
					if (val !== undefined) et.args[a[1]] = val;
					et.cle = sha256(et.cle + "\nARG " + a[1] + "=" + (val === undefined ? "" : val));
					ajouterHist("ARG " + ins.args, null);
					break;
				}
				case "ENV": {
					var paires = lirePairesPort(substituerPort(ins.args, V));
					if (!paires) throw new ErreurBuildPort("dockerfile parse error on line " + ins.ligne + ": ENV must have two arguments", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
					paires.forEach(function(p){ et.config.Env = et.config.Env.filter(function(e){ return e.split("=")[0] !== p[0]; }); et.config.Env.push(p[0] + "=" + p[1]); });
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("ENV " + paires.map(function(p){ return p[0] + "=" + p[1]; }).join(" "), null);
					break;
				}
				case "LABEL": case "MAINTAINER": {
					var lp = ins.cle === "MAINTAINER" ? [["maintainer", ins.args]] : lirePairesPort(substituerPort(ins.args, V));
					(lp || []).forEach(function(p){ et.config.Labels = et.config.Labels || {}; et.config.Labels[p[0]] = p[1]; });
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("LABEL " + (lp || []).map(function(p){ return p[0] + "=" + p[1]; }).join(" "), null);
					break;
				}
				case "EXPOSE": {
					substituerPort(ins.args, V).split(/\s+/).filter(Boolean).forEach(function(p){ et.config.ExposedPorts = et.config.ExposedPorts || {}; et.config.ExposedPorts[p.indexOf("/") > -1 ? p : p + "/tcp"] = {}; });
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("EXPOSE map[" + Object.keys(et.config.ExposedPorts).map(function(k){ return k + ":{}"; }).join(" ") + "]", null);
					break;
				}
				case "CMD": case "ENTRYPOINT": {
					var f = lireFormeExecPort(ins.args);
					var argv = f.exec ? f.argv : (et.config.Shell || ["/bin/sh", "-c"]).concat([f.texte]);
					if (ins.cle === "CMD") et.config.Cmd = argv; else { et.config.Entrypoint = argv; if (!s.instr.some(function(x){ return x.cle === "CMD" && x.ligne > ins.ligne; })) et.config.Cmd = null; }
					et.config.ArgsEscaped = f.exec ? undefined : true;
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist(ins.cle + " " + (f.exec ? JSON.stringify(f.argv).replace(/","/g, "\" \"") : JSON.stringify(argv).replace(/","/g, "\" \"")), null);
					record.etapes.push({ texte: texteEtape, cache: true, stage: nomStage, type: ins.cle, forme: f.exec ? "exec" : "shell", ligne: ins.ligne });
					break;
				}
				case "USER": {
					et.config.User = substituerPort(ins.args, V).trim();
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("USER " + et.config.User, null);
					break;
				}
				case "STOPSIGNAL": et.config.StopSignal = substituerPort(ins.args, V).trim(); et.cle = sha256(et.cle + "\n" + texteEtape); ajouterHist("STOPSIGNAL " + et.config.StopSignal, null); break;
				case "SHELL": { var sf = lireFormeExecPort(ins.args); if (!sf.exec) throw new ErreurBuildPort("dockerfile parse error on line " + ins.ligne + ": SHELL requires the arguments to be in JSON form", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne)); et.config.Shell = sf.argv; et.cle = sha256(et.cle + "\n" + texteEtape); ajouterHist("SHELL " + JSON.stringify(sf.argv), null); break; }
				case "ONBUILD": et.config.OnBuild = (et.config.OnBuild || []).concat([ins.args]); et.cle = sha256(et.cle + "\n" + texteEtape); ajouterHist("ONBUILD " + ins.args, null); break;
				case "VOLUME": {
					var vf = lireFormeExecPort(ins.args), vl = vf.exec ? vf.argv : substituerPort(ins.args, V).split(/\s+/).filter(Boolean);
					et.config.Volumes = et.config.Volumes || {};
					vl.forEach(function(v){ et.config.Volumes[v] = {}; });
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("VOLUME [" + vl.join(" ") + "]", null);
					break;
				}
				case "HEALTHCHECK": {
					var hm = /^((?:--\S+\s+)*)(CMD|NONE)\b\s*(.*)$/i.exec(ins.args);
					if (!hm) throw new ErreurBuildPort("dockerfile parse error on line " + ins.ligne + ": Unknown type \"" + ins.args.split(/\s+/)[0] + "\" in HEALTHCHECK (try CMD)", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
					if (hm[2].toUpperCase() === "NONE") et.config.Healthcheck = { Test: ["NONE"] };
					else {
						var hf = lireFormeExecPort(hm[3]);
						var hc = { Test: hf.exec ? ["CMD"].concat(hf.argv) : ["CMD-SHELL", hf.texte] };
						var opts = hm[1].match(/--(\w[\w-]*)=(\S+)/g) || [];
						opts.forEach(function(x){ var p = /--([\w-]+)=(\S+)/.exec(x); if (p[1] === "interval") hc.Interval = dureeNsDepuisPort(p[2]); if (p[1] === "timeout") hc.Timeout = dureeNsDepuisPort(p[2]); if (p[1] === "start-period") hc.StartPeriod = dureeNsDepuisPort(p[2]); if (p[1] === "retries") hc.Retries = +p[2]; });
						et.config.Healthcheck = hc;
					}
					et.cle = sha256(et.cle + "\n" + texteEtape);
					ajouterHist("HEALTHCHECK &{" + JSON.stringify(et.config.Healthcheck.Test).replace(/","/g, "\" \"") + "}", null);
					record.etapes.push({ texte: texteEtape, cache: true, stage: nomStage, type: "HEALTHCHECK", ligne: ins.ligne });
					break;
				}
				case "WORKDIR": {
					var wd = cheminNormal(substituerPort(ins.args, V).charAt(0) === "/" ? substituerPort(ins.args, V) : (et.config.WorkingDir || "/") + "/" + substituerPort(ins.args, V));
					et.config.WorkingDir = wd;
					var cleW = sha256(et.cle + "\n" + texteEtape);
					var lib = nomEtape();
					var existe = !!vueCouchesPort(h, et.couches)[wd];
					var cacheW = !o.sansCache && P.cache[cleW] !== undefined;
					if (!existe){
						var idW = cacheW ? P.cache[cleW] : ajouterCouchePort(h, { cle: "workdir:" + wd, cmd: "WORKDIR " + wd, taille: 0, fichiers: (function(){ var f = {}, cur = ""; morceauxChemin(wd).forEach(function(x){ cur += "/" + x; if (!vueCouchesPort(h, et.couches)[cur]) f[cur] = dPort(); }); return f; })(), supprimes: [] });
						P.cache[cleW] = idW;
						et.couches.push(idW);
						ajouterHist("WORKDIR " + wd, idW);
					} else { P.cache[cleW] = P.cache[cleW] || null; ajouterHist("WORKDIR " + wd, null); }
					et.cle = cleW;
					affiche.etapes.push({ texte: lib + " WORKDIR " + ins.args, cache: cacheW, type: "WORKDIR" });
					record.etapes.push({ texte: texteEtape, cache: cacheW, stage: nomStage, type: "WORKDIR", ligne: ins.ligne });
					break;
				}
				case "COPY": case "ADD": {
					var lib2 = nomEtape();
					var opts2 = {}, reste = ins.args;
					var om;
					while ((om = /^--([\w-]+)(?:=(\S+))?\s+/.exec(reste))){ opts2[om[1]] = om[2] === undefined ? true : om[2]; reste = reste.substring(om[0].length); }
					var cf = lireFormeExecPort(reste);
					var mots = cf.exec ? cf.argv : substituerPort(reste, V).match(/"[^"]*"|\S+/g).map(function(x){ return x.replace(/^"(.*)"$/, "$1"); });
					if (mots.length < 2) throw new ErreurBuildPort("dockerfile parse error on line " + ins.ligne + ": " + ins.cle + " requires at least two arguments, but only one was provided. Destination could not be determined", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
					var dest = mots.pop(), sources = mots;
					var destAbs = cheminNormal(dest.charAt(0) === "/" ? dest : (et.config.WorkingDir || "/") + "/" + dest);
					var versDossier = /\/$/.test(dest) || dest === "." || sources.length > 1 || sources.some(function(s2){ return /[*?]/.test(s2); });
					// La source : le contexte, une autre étape, une image.
					var fichiersSrc = {}, vueSrc = null;
					if (opts2.from){
						var nomFrom = String(opts2.from).toLowerCase();
						var st = stages.filter(function(x, j){ return j < i && (x.nom === nomFrom || String(j) === nomFrom); })[0];
						if (st) vueSrc = vueCouchesPort(h, etats[st.index].couches);
						else {
							var imf = imagePort(h, opts2.from) || (function(){ var rr = tirerImagePort(h, opts2.from, null, true); return rr.erreur ? null : rr.image; })();
							if (!imf) throw new ErreurBuildPort("failed to resolve source metadata for " + analyserRefPort(opts2.from).complet + ": pull access denied, repository does not exist or may require authorization", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
							vueSrc = vueImagePort(h, imf);
						}
					}
					var liste = [];
					sources.forEach(function(src){
						if (/^https?:\/\//.test(src)){ throw new ErreurBuildPort("failed to load cache key: invalid response status 404", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne)); }
						var rel = cheminNormal("/" + src).replace(/^\//, "");
						var trouves = [];
						var cles = vueSrc ? Object.keys(vueSrc) : Object.keys(ctx.fichiers).map(function(k){ return "/" + k; });
						var lire = function(p){ return vueSrc ? vueSrc[p] : ctx.fichiers[p.replace(/^\//, "")]; };
						if (/[*?]/.test(rel)){
							var re = new RegExp("^/" + rel.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$");
							cles.forEach(function(p){ if (re.test(p)) trouves.push(p); });
						} else if (rel === "" || rel === "."){ trouves.push("/"); }
						else if (lire("/" + rel)) trouves.push("/" + rel);
						if (!trouves.length){
							var refId = hexDe("ctx" + o.dossier, 25);
							if (vueSrc) throw new ErreurBuildPort("failed to compute cache key: failed to calculate checksum of ref " + refId + "::" + hexDe("ref2" + rel, 25) + ": \"/" + rel + "\": not found", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
							throw new ErreurBuildPort("failed to compute cache key: failed to calculate checksum of ref " + refId + "::" + hexDe("ref" + rel, 25) + ": \"/" + rel + "\": not found", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
						}
						trouves.forEach(function(p){
							var e = p === "/" ? { t: "d" } : lire(p);
							if (e && e.t === "d"){
								// Un dossier : on copie son CONTENU (pas le dossier lui-même).
								var pref = p === "/" ? "/" : p + "/";
								cles.filter(function(k){ return k.indexOf(pref) === 0 && k !== p; }).sort().forEach(function(k){ liste.push([cheminNormal(destAbs + "/" + k.substring(pref.length)), lire(k), k]); });
								if (!versDossier && sources.length === 1) versDossier = true;
							} else liste.push([versDossier ? cheminNormal(destAbs + "/" + nomDe(p)) : destAbs, e, p]);
						});
					});
					// --chown, --chmod
					var uid = 0, gid = 0;
					if (opts2.chown){
						var vueCh = vueCouchesPort(h, et.couches), pw = (vueCh["/etc/passwd"] || {}).c || "", gr = (vueCh["/etc/group"] || {}).c || "";
						var cp = String(opts2.chown).split(":");
						if (/^\d+$/.test(cp[0])) uid = +cp[0]; else { var lu = pw.split("\n").filter(function(l){ return l.split(":")[0] === cp[0]; })[0]; if (!lu) throw new ErreurBuildPort("failed to compute cache key: unable to convert uid/gid chown string to host mapping: can't find uid for user " + cp[0] + ": no such user: " + cp[0], extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne)); uid = +lu.split(":")[2]; gid = +lu.split(":")[3]; }
						if (cp[1] !== undefined){ if (/^\d+$/.test(cp[1])) gid = +cp[1]; else { var lg = gr.split("\n").filter(function(l){ return l.split(":")[0] === cp[1]; })[0]; if (!lg) throw new ErreurBuildPort("failed to compute cache key: unable to convert uid/gid chown string to host mapping: can't find gid for group " + cp[1] + ": no such group: " + cp[1], extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne)); gid = +lg.split(":")[2]; } }
						else if (/^\d+$/.test(cp[0])) gid = uid;
					}
					var fichiersCouche = {}, taille = 0;
					liste.forEach(function(x){
						var e = copieJson(x[1] || { t: "f", m: "rw-r--r--", s: 0, c: "" });
						delete e.hote;
						e.u = uid; e.g = gid;
						if (opts2.chmod && e.t === "f") e.m = modeDepuisOctalPort(opts2.chmod);
						// ADD d'une archive locale : elle est dépliée.
						if (ins.cle === "ADD" && e.archive && !opts2.from){
							e.archive.forEach(function(ae){ var p2 = cheminNormal(dossierDe(x[0]) + "/" + ae.n); fichiersCouche[p2] = ae.d ? dPort(ae.m) : { t: "f", m: ae.m || "rw-r--r--", u: uid, g: gid, s: ae.t !== undefined && ae.t !== null ? ae.t : octetsPort(ae.x || ""), c: ae.t === undefined || ae.t === null ? (ae.x || "") : undefined }; if (!ae.d) taille += fichiersCouche[p2].s || 0; });
							return;
						}
						delete e.archive; delete e.comp;
						fichiersCouche[x[0]] = e;
						if (e.t === "f") taille += e.s || 0;
					});
					// Les dossiers parents de la destination.
					var vueAvant = vueCouchesPort(h, et.couches);
					Object.keys(fichiersCouche).forEach(function(p){ var d = dossierDe(p); while (d !== "/"){ if (!fichiersCouche[d] && !vueAvant[d]) fichiersCouche[d] = { t: "d", m: "rwxr-xr-x", u: uid, g: gid }; d = dossierDe(d); } });
					if (versDossier && !fichiersCouche[destAbs] && !vueAvant[destAbs]) fichiersCouche[destAbs] = { t: "d", m: "rwxr-xr-x", u: uid, g: gid };
					var empreinte = empreinteFichiersPort(Object.keys(fichiersCouche).sort().map(function(k){ return [k, fichiersCouche[k]]; }));
					var cle2 = sha256(et.cle + "\n" + ins.cle + " " + JSON.stringify(opts2) + " " + sources.join(" ") + " " + destAbs + "\n" + empreinte);
					var cache2 = !o.sansCache && P.cache[cle2] !== undefined && P.cache[cle2] !== null && !!couchePort(h, P.cache[cle2]);
					var id2 = cache2 ? P.cache[cle2] : ajouterCouchePort(h, { cle: "copie", cmd: ins.cle + " " + ins.args + " # buildkit", taille: taille, fichiers: fichiersCouche, supprimes: [] });
					P.cache[cle2] = id2;
					et.couches.push(id2);
					et.cle = cle2;
					ajouterHist(ins.cle + " " + ins.args + " # buildkit", id2);
					affiche.etapes.push({ texte: lib2 + " " + ins.cle + " " + ins.args, cache: cache2, type: ins.cle });
					record.etapes.push({ texte: texteEtape, cache: cache2, stage: nomStage, type: ins.cle, couche: id2, sources: liste.map(function(x){ return x[2]; }), destination: destAbs, ligne: ins.ligne, from: opts2.from || null, taille: taille });
					break;
				}
				case "RUN": {
					var lib3 = nomEtape();
					var rf = lireFormeExecPort(ins.args.replace(/^--mount=\S+\s+/, "").replace(/^--network=\S+\s+/, ""));
					var cle3 = sha256(et.cle + "\nRUN " + ins.args);
					var cache3 = !o.sansCache && P.cache[cle3] !== undefined && P.cache[cle3] !== null && !!couchePort(h, P.cache[cle3]);
					var id3;
					if (cache3) id3 = P.cache[cle3];
					else {
						var argsRun = {}; Object.keys(globaux).forEach(function(k){ argsRun[k] = globaux[k]; }); Object.keys(et.args).forEach(function(k){ argsRun[k] = et.args[k]; });
						var faux = { id: "build-" + hexDe("run" + cle3, 12), nom: "build", couchesBuild: et.couches.slice(), diff: {}, envBuild: argsRun, reseaux: {}, hote: { montages: [], tmpfs: {}, readOnly: false, capDrop: [], capAdd: [], secOpt: [], reseau: "default" },
							config: { Env: et.config.Env.slice(), WorkingDir: et.config.WorkingDir || "/", User: et.config.User || "", Hostname: hexDe("buildkitsandbox" + cle3, 12) }, secrets: [] };
						var u = et.config.User ? utilisateurConteneurPort(h, faux, et.config.User) : { nom: "root", uid: 0, gid: 0 };
						if (u.erreur) throw new ErreurBuildPort("failed to solve: " + u.erreur, extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne));
						var res;
						var shellRun = et.config.Shell || ["/bin/sh", "-c"];
						if (rf.exec) res = executerArgvPort(h, faux, rf.argv, { user: u, build: true });
						else {
							var shOk = entreeConteneurPort(h, faux, shellRun[0]);
							if (!shOk) res = { erreurOci: "exec: \"" + shellRun[0] + "\": stat " + shellRun[0] + ": no such file or directory", code: 127 };
							else res = executerDansConteneurPort(h, faux, ins.args, { user: u, build: true, sh: /bash/.test(shellRun[0]) ? "bash" : undefined });
						}
						var journal = String((res && (res.melee || "")) || "").replace(/\n$/, "").split("\n").filter(function(l, k2, t2){ return !(l === "" && k2 === t2.length - 1); });
						if (res.erreurOci){ var errO = new ErreurBuildPort("process \"" + (rf.exec ? rf.argv.join(" ") : shellRun.join(" ") + " " + ins.args) + "\" did not complete successfully: runc run failed: unable to start container process: error during container init: " + res.erreurOci + ": unknown", extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne, ins.fin), []); errO.etape = lib3 + " RUN " + ins.args; throw errO; }
						if (res.code !== 0){
							var errB = new ErreurBuildPort("process \"" + (rf.exec ? rf.argv.join(" ") : shellRun.join(" ") + " " + ins.args) + "\" did not complete successfully: exit code: " + res.code, extraitDockerfilePort(o.nomFichier || "Dockerfile", df.lignes, ins.ligne, ins.fin), journal);
							errB.etape = lib3 + " RUN " + ins.args;
							throw errB;
						}
						// Ce qui a changé devient une couche.
						var fichiers3 = {}, supprimes3 = [], taille3 = 0;
						Object.keys(faux.diff).forEach(function(p){
							var d = faux.diff[p];
							if (d.a === "D") supprimes3.push(p);
							else { fichiers3[p] = d.e; if (d.e && d.e.t === "f") taille3 += d.e.s || 0; }
						});
						id3 = ajouterCouchePort(h, { cle: "run", cmd: "RUN " + (rf.exec ? JSON.stringify(rf.argv) : shellRun.join(" ") + " " + ins.args) + " # buildkit", taille: taille3, fichiers: fichiers3, supprimes: supprimes3 });
						affiche.journalRun = affiche.journalRun || {};
						affiche.journalRun[lib3] = journal;
					}
					P.cache[cle3] = id3;
					et.couches.push(id3);
					et.cle = cle3;
					ajouterHist("RUN " + (rf.exec ? JSON.stringify(rf.argv) : (et.config.Shell || ["/bin/sh", "-c"]).join(" ") + " " + ins.args) + " # buildkit", id3);
					affiche.etapes.push({ texte: lib3 + " RUN " + ins.args, cache: cache3, type: "RUN", journal: affiche.journalRun ? affiche.journalRun[lib3] : null });
					record.etapes.push({ texte: texteEtape, cache: cache3, stage: nomStage, type: "RUN", couche: id3, ligne: ins.ligne, taille: (couchePort(h, id3) || {}).taille || 0 });
					break;
				}
			}
			if (ins.cle === "FROM") record.etapes.push({ texte: texteEtape, cache: true, stage: nomStage, type: "FROM", ligne: ins.ligne, base: et.base });
		});
		etats[i] = et;
	});
	var final = etats[cibleIdx];
	(o.labels ? Object.keys(o.labels) : []).forEach(function(k){ final.config.Labels = final.config.Labels || {}; final.config.Labels[k] = o.labels[k]; });
	var cfg = {};
	["User", "ExposedPorts", "Env", "Entrypoint", "Cmd", "Healthcheck", "Volumes", "WorkingDir", "Labels", "StopSignal", "OnBuild", "Shell", "ArgsEscaped"].forEach(function(k){
		var v = final.config[k];
		if (v === undefined || v === null || v === "") return;
		if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) return;
		cfg[k] = v;
	});
	if (!cfg.Env) cfg.Env = ["PATH=" + PATH_DEFAUT_PORT];
	var img = { couches: final.couches, historique: final.historique, config: cfg, cree: dateIsoPort(maintenantPort(h)).replace(/\.\d+Z$/, "Z"), os: "linux", arch: o.arch || "amd64", origine: "build" };
	img.id = sha256(configJsonPort(img));
	var nonUtilises = Object.keys(o.buildArgs || {}).filter(function(k){ return !argsUtilises[k]; });
	record.ok = true;
	record.image = img.id;
	record.nonUtilises = nonUtilises;
	return { image: img, affiche: affiche, record: record, nbOps: nbOps };
}

/* ================================================================== */
/* docker build                                                         */
/* ================================================================== */

function ligneBuildKitPort(texte, temps){
	var t = " => " + texte;
	var tm = temps !== undefined && temps !== null ? temps : "";
	if (t.length > 75 - tm.length) t = t.substring(0, 74 - tm.length) + "…";
	return completerDroite(t, 80 - tm.length) + tm;
}
function tempsPort(cle){ return (0.1 + (condense(cle) % 90) / 10).toFixed(1) + "s"; }
function buildPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { t: "tag", f: "file", q: "quiet" }, valeurs: ["tag", "file", "build-arg", "target", "progress", "platform", "label", "network", "iidfile", "secret", "cache-from", "output"], booleens: ["no-cache", "quiet", "pull", "load", "push", "rm", "force-rm"], repetables: ["tag", "build-arg", "label", "secret", "cache-from"] }, "build");
	if (d.reste.length !== 1) throw new ShellError("ERROR: \"docker buildx build\" requires exactly 1 argument.\nSee 'docker buildx build --help'.\n\nUsage:  docker buildx build [OPTIONS] PATH | URL | -\n\nStart a build", 1);
	accesDemonPort(h, io, "build");
	return lancerBuildPort(h, d, io, null);
}
function lancerBuildPort(h, d, io, buildx){
	var chemin = d.reste[0];
	var dossier = null, texte = null, nomFichier = "Dockerfile";
	if (chemin === "-"){ texte = io.stdin || ""; }
	else {
		var r = Shell.chercher(chemin, io, "docker");
		if (!(r.node instanceof Room)) throw new ShellError("ERROR: unable to prepare context: path \"" + chemin + "\" not found", 1);
		dossier = cheminDuLieuMachine(r.node);
		var cheminDf = d.o.file ? (d.o.file === "-" ? null : cheminNormal(d.o.file.charAt(0) === "/" ? d.o.file : cheminDuLieuMachine(current_room) + "/" + d.o.file)) : dossier + "/Dockerfile";
		if (d.o.file === "-") texte = io.stdin || "";
		else {
			texte = texteHote(h, cheminDf);
			if (texte === null) throw new ShellError("[+] Building 0.0s (1/1) FINISHED" + completerGauche("docker:default", 49) + "\n" + ligneBuildKitPort("[internal] load build definition from " + nomDe(cheminDf), "0.0s") + "\n" + ligneBuildKitPort("=> transferring dockerfile: 2B", "0.0s") + "\nERROR: failed to solve: failed to read dockerfile: open " + nomDe(cheminDf) + ": no such file or directory", 1);
			nomFichier = nomDe(cheminDf);
			var df = fichierHote(h, cheminDf);
			if (df && !io.sudo && !Shell.bit(df, "r", io)) throw new ShellError("ERROR: failed to solve: failed to read dockerfile: open " + nomFichier + ": permission denied", 1);
		}
	}
	var tags = listePort(d.o.tag);
	tags.forEach(function(t){ var ra = analyserRefPort(t); if (!ra.valide || /[A-Z]/.test(t)) throw new ShellError("ERROR: invalid tag \"" + t + "\": repository name must be lowercase", 1); });
	var buildArgs = {};
	listePort(d.o["build-arg"]).forEach(function(x){ var i = x.indexOf("="); if (i > 0) buildArgs[x.substring(0, i)] = x.substring(i + 1); else { var v = Shell.variable(x); if (v !== "") buildArgs[x] = v; } });
	var labels = {};
	listePort(d.o.label).forEach(function(x){ var i = x.indexOf("="); labels[i > 0 ? x.substring(0, i) : x] = i > 0 ? x.substring(i + 1) : ""; });
	var plain = d.o.progress === "plain" || (!io.tty && d.o.progress !== "tty");
	var t0 = maintenantPort(h);
	var res;
	try {
		res = construireImagePort({ h: h, texte: texte, nomFichier: nomFichier, dossier: dossier, tags: tags, buildArgs: buildArgs, sansCache: !!d.o["no-cache"], cible: d.o.target || null, labels: labels, arch: buildx && buildx.arch });
	} catch (e){
		if (!(e instanceof ErreurBuildPort)) throw e;
		var recE = { tags: tags, dossier: dossier, dockerfile: nomFichier, ok: false, erreur: e.message, t: t0, etapes: [] };
		etatPort(h).builds.push(recE);
		if (etatPort(h).builds.length > 60) etatPort(h).builds.splice(0, etatPort(h).builds.length - 60);
		evenementPort(h, "build", { ok: false, erreur: e.message, dossier: dossier, tags: tags });
		var l = [];
		if (e.etape){
			l.push(plain ? "#8 " + e.etape.replace(/^\[/, "[") : ligneBuildKitPort("ERROR " + e.etape, tempsPort(e.etape)));
			l.push("------", " > " + e.etape + ":");
			e.journal.forEach(function(x, k){ l.push((0.2 + k * 0.012).toFixed(3) + " " + x); });
			l.push("------");
		}
		if (e.extrait) l.push(e.extrait);
		l.push("ERROR: failed to solve: " + e.message);
		io.code = 1;
		throw new ShellError((plain ? "" : "[+] Building " + tempsPort(t0 + "e") + " (" + (e.etape ? "8/9" : "1/1") + ") FINISHED" + completerGauche("docker:default", 47) + "\n" + ligneBuildKitPort("[internal] load build definition from " + nomFichier, "0.0s") + "\n" + ligneBuildKitPort("=> transferring dockerfile: " + octetsPort(texte) + "B", "0.0s") + "\n") + l.join("\n"), 1);
	}
	var img = res.image;
	var dejaPresente = !!etatPort(h).images[img.id];
	var pose = poserImagePort(h, img, null, null);
	tags.forEach(function(t){ poserImagePort(h, pose, analyserRefPort(t).nomTag, null); evenementDockerPort(h, "image", "tag", "sha256:" + img.id, { name: analyserRefPort(t).nomTag }); });
	pose.tagueA = maintenantPort(h);
	if (!tags.length && !dejaPresente) pose.pendante = true;
	res.record.tags = tags.map(function(t){ return analyserRefPort(t).nomTag; });
	etatPort(h).builds.push(res.record);
	if (etatPort(h).builds.length > 60) etatPort(h).builds.splice(0, etatPort(h).builds.length - 60);
	evenementPort(h, "build", { ok: true, image: img.id, tags: res.record.tags, dossier: dossier, record: res.record });
	if (d.o.quiet) return "sha256:" + img.id;
	// La sortie de BuildKit.
	var aff = res.affiche, lignes = [], num = 0, ctxTaille = res.record.contexteOctets;
	var ctxTexte = (ctxTaille >= 1e6 ? (ctxTaille / 1e6).toFixed(2) + "MB" : (ctxTaille >= 1e3 ? (ctxTaille / 1e3).toFixed(2) + "kB" : ctxTaille + "B"));
	var ignore = dossier ? texteHote(h, cheminNormal(dossier + "/.dockerignore")) : null;
	var blocs = [];
	blocs.push({ titre: "[internal] load build definition from " + nomFichier, lignes: ["transferring dockerfile: " + octetsPort(texte) + "B"], temps: "0.0s" });
	aff.metadonnees.forEach(function(m){ blocs.push({ titre: "[internal] load metadata for " + m, lignes: [], temps: tempsPort(m) }); });
	blocs.push({ titre: "[internal] load .dockerignore", lignes: ["transferring context: " + (ignore ? octetsPort(ignore) : 2) + "B"], temps: "0.0s" });
	var contexteMontre = false;
	aff.etapes.forEach(function(e){
		if (e.type !== "FROM" && !contexteMontre && dossier){ contexteMontre = true; blocs.push({ titre: "[internal] load build context", lignes: ["transferring context: " + ctxTexte], temps: (0.1 + ctxTaille / 1.5e8).toFixed(1) + "s" }); }
		blocs.push({ titre: (e.cache && e.type !== "FROM" ? "CACHED " : "") + e.texte, lignes: e.journal && plain ? e.journal : [], temps: e.cache ? "0.0s" : tempsPort(e.texte + t0), cache: e.cache && e.type !== "FROM", pull: e.pull });
	});
	if (!contexteMontre && dossier) blocs.push({ titre: "[internal] load build context", lignes: ["transferring context: " + ctxTexte], temps: "0.1s" });
	var nomTag = res.record.tags.map(function(t){ return analyserRefPort(t).complet.replace(/^continent\.lan\/library\//, REGISTRE_CONTINENT_PORT + "/library/"); });
	blocs.push({ titre: "exporting to image", lignes: ["exporting layers", "writing image sha256:" + img.id].concat(nomTag.map(function(t){ return "naming to " + t; })), temps: "0.1s" });
	if (plain){
		var p = ["#0 building with \"default\" instance using docker driver", ""];
		blocs.forEach(function(b){
			num++;
			p.push("#" + num + " " + b.titre.replace(/^CACHED /, ""));
			b.lignes.forEach(function(x){ p.push("#" + num + " " + (/^(transferring|exporting|writing|naming)/.test(x) ? x + " done" : x)); });
			p.push("#" + num + (b.cache ? " CACHED" : " DONE " + b.temps), "");
		});
		if (res.record.nonUtilises && res.record.nonUtilises.length) p.push(" 1 warning found (use docker --debug to expand):", " - UndefinedArgInFrom: build-arg " + res.record.nonUtilises.join(", ") + " was not consumed");
		return p.join("\n").replace(/\n+$/, "");
	}
	var total = blocs.length;
	lignes.push("[+] Building " + (blocs.reduce(function(s, b){ return s + parseFloat(b.temps); }, 0)).toFixed(1) + "s (" + total + "/" + total + ") FINISHED" + completerGauche("docker:default", 44));
	blocs.forEach(function(b){
		lignes.push(ligneBuildKitPort(b.titre, b.temps));
		b.lignes.forEach(function(x){ lignes.push(ligneBuildKitPort("=> " + x, "0.0s")); });
	});
	if (res.record.nonUtilises && res.record.nonUtilises.length) lignes.push("", " 1 warning found (use docker --debug to expand):", " - UndefinedArgInFrom: build-arg " + res.record.nonUtilises.join(", ") + " was not consumed");
	return lignes.join("\n");
}
/* Une construction silencieuse (l'ancien équipage a bâti ces images avant le chapitre). */
function construireSilencieuxPort(h, texte, dossier, tag, cree){
	var res = construireImagePort({ h: h, texte: texte, nomFichier: "Dockerfile", dossier: dossier, tags: [tag], buildArgs: {}, sansCache: false });
	res.image.cree = cree || "2026-10-11T16:42:05Z";
	res.image.historique.forEach(function(x){ if (x.created > res.image.cree) x.created = res.image.cree; });
	res.image.id = sha256(configJsonPort(res.image));
	var img = poserImagePort(h, res.image, analyserRefPort(tag).nomTag, null);
	img.ajoute = maintenantPort(h) - 6 * 86400000;
	return img;
}
function dernierBuildPort(h, filtre){
	var l = etatPort(h).builds.filter(function(b){ return !filtre || filtre(b); });
	return l.length ? l[l.length - 1] : null;
}
/* docker builder prune / ls */
function builderPort(h, a, io){
	var s = a.shift();
	accesDemonPort(h, io);
	if (s === "prune"){
		var d = lireDrapeauxPort(a, { court: { a: "all", f: "force" }, booleens: ["all", "force"], valeurs: ["filter", "keep-storage"], repetables: ["filter"] }, "builder prune");
		var faire = function(){
			var P = etatPort(h), cles = Object.keys(P.cache), t = tailleCachePort(h);
			var ids = cles.map(function(k){ return hexDe("cache:" + k, 25); });
			P.cache = {};
			Object.keys(P.couches).forEach(function(id){ if (!imagesPort(h).some(function(im){ return im.couches.indexOf(id) > -1; })) delete P.couches[id]; });
			evenementPort(h, "builderPrune", { objets: cles.length, taille: t });
			return (ids.length ? "ID\t\t\t\t\t\tRECLAIMABLE\tSIZE\t\tLAST ACCESSED\n" + ids.map(function(x){ return x + "\ttrue\t\t0B\t\tAbout a minute ago"; }).join("\n") + "\n" : "") + "Total:\t" + tailleDockerPort(t);
		};
		if (d.o.force) return faire();
		return demanderConfirmationPort("WARNING! This will remove all dangling build cache. Are you sure you want to continue? [y/N] ", faire, io);
	}
	if (s === "ls") return "NAME/NODE     DRIVER/ENDPOINT   STATUS    BUILDKIT   PLATFORMS\ndefault*      docker                                 \n \\_ default    \\_ default       running   v0.13.2    linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/386";
	if (s === "build") return buildPort(h, a, io);
	return "\nUsage:  docker builder COMMAND\n\nManage builds\n\nCommands:\n  build       Build an image from a Dockerfile\n  prune       Remove build cache\n\nRun 'docker builder COMMAND --help' for more information on a command.";
}
