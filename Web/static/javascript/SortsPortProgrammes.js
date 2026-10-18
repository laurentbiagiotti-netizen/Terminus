/**
 * SortsPortProgrammes.js : le moteur des conteneurs du Grand Port, troisième partie : les programmes.
 *
 * Ce que fait un conteneur démarré dépend de son Entrypoint et de sa Cmd, lus dans SON image : les scripts d'entrée
 * des images de base (nginx, postgres, redis, registry), un shell (sh -c, ou interactif avec -it), hello, sleep, et les
 * programmes de l'école (des scripts Python, le binaire du phare). Chacun lit sa configuration là où le vrai la lit,
 * échoue comme le vrai (un exécutable absent, une variable manquante, un module non installé, un fichier en lecture
 * seule, un hôte introuvable au démarrage de nginx...), écrit ses journaux, tient ses ports, consomme de la mémoire.
 *
 * Ici aussi : un petit SQL pour postgres (CREATE TABLE, INSERT, SELECT count(*)...), psql, pg_isready, redis-cli,
 * le registre privé (l'API /v2/, l'authentification htpasswd, le stockage sur disque), les healthchecks, et les
 * outils de paquets d'une image (apt-get, apk, pip) et de construction (make, gcc) utilisés par les RUN des Dockerfile.
 */

/* ================================================================== */
/* Démarrer le programme d'un conteneur                                 */
/* ================================================================== */

var HELLO_PORT = "\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n\nTo generate this message, Docker took the following steps:\n 1. The Docker client contacted the Docker daemon.\n 2. The Docker daemon pulled the \"hello-world\" image from the registry.\n    (amd64)\n 3. The Docker daemon created a new container from that image which runs the\n    executable that produces the output you are currently reading.\n 4. The Docker daemon streamed that output to the Docker client, which sent it\n    to your terminal.\n\nTo try something more ambitious, you can run a Debian container with:\n $ docker run -it debian:12 bash\n\nFor more examples and ideas:\n $ man docker\n";

/* Lancer le programme : { ok } ou { erreurOci, code } ou { erreurDemon }. */
function lancerProgrammePort(h, c, options){
	var argv = (c.config.Entrypoint || []).concat(c.config.Cmd || []);
	if (!argv.length) return { erreurDemon: "no command specified" };
	var ctx = contexteShellPort(h, c, {});
	ctx.cwd = c.config.WorkingDir || "/";
	// Le dossier de travail est créé s'il manque (comme le vrai).
	if (c.config.WorkingDir && !entreeConteneurPort(h, c, c.config.WorkingDir)){ try { ecrireEntreePort(fsPort(h, c), null, c.config.WorkingDir, dPort(), { force: true }); } catch (e){} }
	var journal = [];
	var spec = programmePourArgvPort(h, c, ctx, argv, journal, 0);
	if (spec.erreurOci) return spec;
	journal.forEach(function(j){ ajouterJournalPort(h, c, j[0], j[1]); });
	if (spec.fin){
		marquerEnMarchePort(h, c, { type: spec.type || "commande", argv: argv, processus: [{ cmd: argv.join(" "), user: ctx.user.uid }], memoire: 600 * 1024, ecoutes: [] });
		if (spec.sortie) ajouterJournalPort(h, c, "stdout", spec.sortie.replace(/\n$/, ""));
		if (spec.erreurs) ajouterJournalPort(h, c, "stderr", spec.erreurs.replace(/\n$/, ""));
		c.programme.codeArret = spec.code;
		conteneurMortPort(h, c, spec.code || 0, "fin");
		return { ok: true, fini: true, code: spec.code || 0 };
	}
	spec.argv = argv;
	marquerEnMarchePort(h, c, spec);
	(spec.journalApres || []).forEach(function(j){ ajouterJournalPort(h, c, j[0], j[1]); });
	if (spec.finTics !== undefined && spec.finTics !== null) c.programme.finA = (etatMachine(h).tics || 0) + spec.finTics;
	if (c.etat.sante) verifierSantePort(h, c, true);
	return { ok: true };
}

/* Ce que devient argv : un programme long (serveur), ou une commande qui finit (fin: true, code, sortie). */
function programmePourArgvPort(h, c, ctx, argv, journal, prof){
	if (prof > 6) return { fin: true, code: 1, erreurs: "exec: too many levels\n" };
	var nom = argv[0];
	var p = trouverProgrammePort(ctx, nom);
	if (!p){
		if (nom.indexOf("/") > -1) return { erreurOci: "exec: \"" + nom + "\": stat " + nom + ": no such file or directory", code: 127 };
		return { erreurOci: "exec: \"" + nom + "\": executable file not found in $PATH", code: 127 };
	}
	if (p.e.m.indexOf("x") === -1) return { erreurOci: "exec: \"" + nom + "\": permission denied", code: 126 };
	var impl = implementationPort(p, nom);
	var x = impl.genre === "programme" ? impl.nom : (impl.genre === "applet" ? impl.nom : null);
	var args = argv.slice(1);
	var suite = function(nv){ return programmePourArgvPort(h, c, ctx, nv, journal, prof + 1); };
	switch (x){
		case "entree-nginx":
			if (args[0] === "nginx" || args[0] === "nginx-debug"){
				["/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration", "/docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/",
					"/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh", "10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf",
					"10-listen-on-ipv6-by-default.sh: info: Enabled listen on IPv6 in /etc/nginx/conf.d/default.conf", "/docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh",
					"/docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh", "/docker-entrypoint.sh: Configuration complete; ready for start up"].forEach(function(l){ journal.push(["stdout", l]); });
			}
			return args.length ? suite(args) : { fin: true, code: 0 };
		case "entree-postgres": return entreePostgresPort(h, c, ctx, args, journal, suite);
		case "entree-redis":
			if (args.length && (args[0].charAt(0) === "-" || /\.conf$/.test(args[0]))) args = ["redis-server"].concat(args);
			if (args[0] === "redis-server" && ctx.user.uid === 0){
				if (!aCapPort(c, "SETUID") || !aCapPort(c, "SETGID")) return { fin: true, code: 1, erreurs: "setpriv: setresgid failed: Operation not permitted\n" };
				ctx.user = { nom: "redis", uid: 999, gid: 1000 };
			}
			return args.length ? suite(args) : { fin: true, code: 0 };
		case "entree-registry":
			if (args.length && /\.ya?ml$/.test(args[0])) args = ["registry", "serve"].concat(args);
			else if (args.length && /^(serve|garbage-collect|help|-)/.test(args[0])) args = ["registry"].concat(args);
			return args.length ? suite(args) : { fin: true, code: 0 };
		case "flotte":
			journal.push(["stdout", "Le pavillon noir flotte sur ce navire."]);
			return args.length ? suite(args) : { fin: true, code: 0 };
		case "sh": case "ash": case "bash": case "dash":
			return shellProgrammePort(h, c, ctx, x, args, suite);
		case "hello": return { fin: true, code: 0, sortie: HELLO_PORT, type: "hello" };
		case "sleep":
			if (args[0] === "infinity") return attentePort(ctx, argv, "sleep");
			var s = parseFloat(args[0]);
			if (isNaN(s)) return { fin: true, code: 1, erreurs: "sleep: invalid number '" + args[0] + "'\n" };
			var spec = attentePort(ctx, argv, "sleep");
			spec.finTics = Math.max(1, Math.ceil(s / 300));
			return spec;
		case "tail":
			if (args.indexOf("-f") > -1 || args.indexOf("-F") > -1) return attentePort(ctx, argv, "tail");
			break;
		case "yes":
			var oui = attentePort(ctx, argv, "yes");
			oui.repete = args.length ? args.join(" ") : "y";
			oui.journalApres = [["stdout", oui.repete], ["stdout", oui.repete], ["stdout", oui.repete]];
			return oui;
		case "cat":
			if (!args.length && c.config.OpenStdin) return attentePort(ctx, argv, "cat");
			break;
		case "nginx": return nginxProgrammePort(h, c, ctx, args);
		case "postgres": return postgresServeurPort(h, c, ctx, args);
		case "redis": return redisProgrammePort(h, c, ctx, args);
		case "registry": return registreProgrammePort(h, c, ctx, args);
		case "python": return pythonProgrammePort(h, c, ctx, args, argv);
		case "phare": return phareProgrammePort(h, c, ctx, p);
	}
	// Une commande ordinaire : elle s'exécute et rend son code.
	var sortie = "", erreurs = "";
	var sous = Object.create(ctx);
	sous.sortir = function(t){ sortie += t; }; sous.erreur = function(t){ erreurs += t; };
	var code;
	try { code = lancerImplementationPort(sous, impl, nom, args, p); }
	catch (e){ if (e instanceof ErreurFsPort){ erreurs += nom + ": " + MESSAGES_FS_PORT[e.code] + "\n"; code = 1; } else throw e; }
	return { fin: true, code: code || 0, sortie: sortie, erreurs: erreurs, type: "commande" };
}
function attentePort(ctx, argv, comm){ return { type: "attente", comm: comm, processus: [{ cmd: argv.join(" "), user: ctx.user.uid, comm: comm }], memoire: 400 * 1024, ecoutes: [] }; }
function shellProgrammePort(h, c, ctx, quel, args, suite){
	var shell = quel === "sh" ? ctx.sh || "ash" : quel;
	var i = args.indexOf("-c");
	if (i > -1){
		var script = args[i + 1] || "";
		var ex = /^\s*exec\s+(.+?)\s*$/.exec(script);
		if (ex && !/[;&|]/.test(ex[1])) return suite(ex[1].match(/"[^"]*"|'[^']*'|\S+/g).map(function(m){ return m.replace(/^["']|["']$/g, ""); }));
		// La dernière commande d'une suite simple (cd /app && python app.py) : le shell la lance, et elle peut tenir le conteneur.
		var an = analyserShellPort(script);
		if (!an.erreur && an.listes.length && an.listes.every(function(l){ return l.pipeline.length === 1 && (l.op === ";" || l.op === "&&"); })){
			var derniere = an.listes[an.listes.length - 1].pipeline[0];
			if (!derniere.redirs.length){
				var sousCtx = Object.create(ctx); sousCtx.sh = shell; sousCtx.exite = null; sousCtx.env = copieJson(ctx.env); sousCtx.cwd = ctx.cwd;
				var motsDerniers = derniere.mots.map(function(segs){ return developperMotPort(sousCtx, segs, true)[0]; });
				var avantTexte = "", ok = true, sortieAvant = "", erreursAvant = "";
				if (an.listes.length > 1){
					var lignesAvant = script.substring(0, script.lastIndexOf(an.listes.length > 1 ? (script.lastIndexOf("&&") > script.lastIndexOf(";") ? "&&" : ";") : ""));
					var r1 = executerLignePort(sousCtx, lignesAvant);
					sortieAvant = r1.sortie; erreursAvant = r1.erreurs; ok = r1.code === 0 || an.listes[an.listes.length - 1].op === ";";
					if (!ok) return { fin: true, code: r1.code, sortie: r1.sortie, erreurs: r1.erreurs, type: "shell" };
				}
				var pDer = trouverProgrammePort(sousCtx, motsDerniers[0] || "");
				var implDer = pDer ? implementationPort(pDer, motsDerniers[0]) : null;
				var nomDer = implDer ? (implDer.genre === "applet" || implDer.genre === "programme" ? implDer.nom : null) : null;
				var longs = ["nginx", "postgres", "redis", "registry", "phare", "entree-nginx", "entree-postgres", "entree-redis", "entree-registry", "flotte"];
				var pythonServeur = nomDer === "python" && motsDerniers[1] && motsDerniers[1].charAt(0) !== "-" && (function(){ var tx = lireTextePort(sousCtx, motsDerniers[1]); return tx !== null && analyserPythonPort(tx).genre !== "script"; })();
				if (nomDer && (longs.indexOf(nomDer) > -1 || pythonServeur || (nomDer === "python" && motsDerniers[1] === "-m") || (nomDer === "sleep" && motsDerniers[1] === "infinity") || (nomDer === "tail" && motsDerniers.indexOf("-f") > -1))){
					ctx.cwd = sousCtx.cwd;
					var spec0 = suite(motsDerniers);
					if (!spec0.fin && !spec0.erreurOci){
						spec0.processus = [{ cmd: "/bin/sh -c " + script, user: ctx.user.uid, comm: "sh" }].concat(spec0.processus || []);
						if (sortieAvant) spec0.journalApres = [["stdout", sortieAvant.replace(/\n$/, "")]].concat(spec0.journalApres || []);
					}
					return spec0;
				}
			}
		}
		if (/sleep\s+(infinity|\d{3,})|tail\s+-f|while\s+true|while\s+:/.test(script)){
			var att = attentePort(ctx, [quel, "-c", script], quel);
			// Ce que le script écrit avant sa boucle passe dans les journaux.
			var avant = script.split(/;\s*(?:while|sleep\s+infinity|tail\s+-f)/)[0];
			if (avant && avant !== script){ var r0 = executerLignePort(Object.create(ctx, { sh: { value: shell, writable: true } }), avant); att.journalApres = [["stdout", r0.sortie.replace(/\n$/, "")]].filter(function(x){ return x[1]; }); }
			// Le corps d'une boucle sans fin qui écrit : il écrit sans cesse (les journaux grossissent).
			var corps = /while\s+(?:true|:)\s*;\s*do\s+([\s\S]*?);?\s*done/.exec(script);
			if (corps && !/sleep\s+\d/.test(corps[1])){
				var rb = executerLignePort(Object.create(ctx, { sh: { value: shell, writable: true } }), corps[1]);
				var txt = String(rb.sortie || "").replace(/\n$/, "");
				if (txt){ att.repete = txt; att.journalApres = (att.journalApres || []).concat([["stdout", txt], ["stdout", txt], ["stdout", txt]]); }
			}
			return att;
		}
		var sous = Object.create(ctx);
		sous.sh = shell; sous.argv0 = quel === "bash" ? "bash" : "/bin/sh"; sous.exite = null; sous.env = copieJson(ctx.env);
		var r = executerLignePort(sous, script);
		return { fin: true, code: sous.exite !== null && sous.exite !== undefined ? sous.exite : r.code, sortie: r.sortie, erreurs: r.erreurs, type: "shell" };
	}
	if (args.length && args[0].charAt(0) !== "-"){
		var sous2 = Object.create(ctx); sous2.sortie = ""; var so = "", se = "";
		sous2.sortir = function(t){ so += t; }; sous2.erreur = function(t){ se += t; };
		var code = shellImbriquePort(sous2, shell, args, quel);
		return { fin: true, code: code, sortie: so, erreurs: se, type: "shell" };
	}
	if (c.config.OpenStdin) return { type: "shell-interactif", comm: quel, processus: [{ cmd: quel === "sh" ? "/bin/sh" : quel, user: ctx.user.uid, comm: quel }], memoire: 900 * 1024, ecoutes: [] };
	return { fin: true, code: 0, type: "shell" };
}

/* Le tic d'un programme : la mémoire qui grossit, les journaux qui s'allongent. */
function ticProgrammePort(h, c, tic){
	var prog = c.programme || {};
	if (prog.type === "redis"){
		var cible = 9 * 1048576 + (prog.donnees || 0);
		c.memoire = Math.min(cible, (c.memoire || cible) + 600 * 1024);
		if (c.memoire < cible) c.memoire = cible;
	}
	if (prog.type === "python-app"){ c.memoire = Math.min(prog.memoireMax || 64 * 1048576, (c.memoire || 0) + (prog.croissance || 0)); }
	if (prog.repete){
		for (var k = 0; k < 3; k++) ajouterJournalPort(h, c, "stdout", prog.repete);
		var lr = fichierJournalHotePort(h, c);
		if (lr){ lr.taille = (lr.taille || 0) + 4 * 1048576; rotationJournalPort(h, c); }
	}
	if (prog.type === "nginx" || prog.type === "python-app" || prog.type === "registry"){ var lf = fichierJournalHotePort(h, c); if (lf){ lf.taille = (lf.taille || 0) + (prog.bavard || 2400); rotationJournalPort(h, c); } }
}

/* ================================================================== */
/* Les healthchecks                                                     */
/* ================================================================== */

function dureeNsPort(ns, defaut){ return ns ? ns / 1e9 : defaut; }
/* Une vérification : le test dans le conteneur ; la série d'échecs, retries, start-period. */
function verifierSantePort(h, c, premiere){
	var hc = c.config.Healthcheck;
	if (!hc || !hc.Test || hc.Test[0] === "NONE" || !enMarchePort(c)) return;
	var s = c.etat.sante = c.etat.sante || { statut: "starting", echecs: 0, journal: [] };
	var intervalle = dureeNsPort(hc.Interval, 30), retries = hc.Retries || 3, debutPeriode = dureeNsPort(hc.StartPeriod, 0);
	var n = premiere ? 1 : Math.max(1, Math.min(retries + 1, Math.floor(300 / Math.max(1, intervalle))));
	for (var i = 0; i < n && enMarchePort(c); i++){
		var debut = maintenantPort(h) + i * intervalle * 1000;
		var r;
		if (hc.Test[0] === "CMD-SHELL") r = executerDansConteneurPort(h, c, hc.Test.slice(1).join(" "), {});
		else { r = executerArgvPort(h, c, hc.Test.slice(1), {}); if (r.erreurOci){ r = { code: 127, melee: "OCI runtime exec failed: exec failed: unable to start container process: " + r.erreurOci + ": unknown" }; } }
		var code = r.code;
		s.journal.push({ Start: dateIsoPort(debut), End: dateIsoPort(debut + 40), ExitCode: code > 1 && hc.Test[0] !== "CMD-SHELL" ? code : code, Output: String(r.melee || "").substring(0, 4096) });
		if (s.journal.length > 5) s.journal.splice(0, s.journal.length - 5);
		var dansPeriode = debutPeriode && (debut - (s.debut || c.etat.debut)) / 1000 < debutPeriode;
		if (code === 0){ var avant = s.statut; s.echecs = 0; s.statut = "healthy"; if (avant !== "healthy") evenementDockerPort(h, "container", "health_status: healthy", c.id, { image: c.imageRef, name: c.nom }); }
		else if (!dansPeriode || s.statut === "healthy"){
			s.echecs++;
			if (s.echecs >= retries && s.statut !== "unhealthy"){ s.statut = "unhealthy"; evenementDockerPort(h, "container", "health_status: unhealthy", c.id, { image: c.imageRef, name: c.nom }); }
		}
		evenementDockerPort(h, "container", "exec_die", c.id, { execID: hexDe("hc" + c.id + debut, 64), exitCode: String(code), image: c.imageRef, name: c.nom });
	}
	evenementPort(h, "sante", { conteneur: c.nom, id: c.id, statut: s.statut, echecs: s.echecs });
}

/* ================================================================== */
/* nginx                                                                */
/* ================================================================== */

var DIRECTIVES_NGINX_PORT = ["user", "worker_processes", "error_log", "pid", "events", "worker_connections", "http", "include", "default_type", "log_format", "access_log", "sendfile", "tcp_nopush", "tcp_nodelay",
	"keepalive_timeout", "gzip", "server", "listen", "server_name", "location", "root", "index", "try_files", "proxy_pass", "proxy_set_header", "proxy_http_version", "return", "error_page", "alias", "add_header",
	"client_max_body_size", "upstream", "autoindex", "rewrite", "set", "resolver", "proxy_read_timeout", "proxy_connect_timeout", "expires", "charset", "types", "stub_status", "deny", "allow", "proxy_redirect", "server_tokens"];
/* Lire nginx.conf et ses include : { serveurs, erreur, upstreams, journal } */
function lireConfNginxPort(ctx){
	var fichiers = [], erreur = null;
	var principal = lireTextePort(ctx, "/etc/nginx/nginx.conf");
	if (principal === null) return { erreur: "open() \"/etc/nginx/nginx.conf\" failed (2: No such file or directory)" };
	var arbre = analyserNginxPort(principal, "/etc/nginx/nginx.conf");
	if (arbre.erreur) return arbre;
	var serveurs = [], upstreams = {};
	function parcourir(noeuds, http){
		noeuds.forEach(function(n){
			if (erreur) return;
			if (DIRECTIVES_NGINX_PORT.indexOf(n.nom) === -1){ erreur = "unknown directive \"" + n.nom + "\" in " + n.fichier + ":" + n.ligne; return; }
			if (n.nom === "include"){
				var motif = n.args[0] || "";
				var liste = /\*/.test(motif) ? jokerPort(ctx, motif) : [motif];
				liste.forEach(function(f){
					if (erreur) return;
					var t = lireTextePort(ctx, f);
					if (t === null){ if (!/\*/.test(motif)) erreur = "open() \"" + f + "\" failed (2: No such file or directory) in " + n.fichier + ":" + n.ligne; return; }
					if (/mime\.types$/.test(f)) return;
					fichiers.push(f);
					var a = analyserNginxPort(t, f);
					if (a.erreur){ erreur = a.erreur; return; }
					parcourir(a.noeuds, http);
				});
				return;
			}
			if (n.nom === "http"){ parcourir(n.enfants || [], true); return; }
			if (n.nom === "events"){ parcourir(n.enfants || [], false); return; }
			if (n.nom === "upstream"){ upstreams[n.args[0]] = (n.enfants || []).filter(function(x){ return x.nom === "server"; }).map(function(x){ return x.args[0]; }); return; }
			if (n.nom === "server"){
				var s = { listen: [], locations: [], root: null, index: ["index.html"], fichier: n.fichier, ligne: n.ligne, retour: null };
				(n.enfants || []).forEach(function(d){
					if (erreur) return;
					if (DIRECTIVES_NGINX_PORT.indexOf(d.nom) === -1){ erreur = "unknown directive \"" + d.nom + "\" in " + d.fichier + ":" + d.ligne; return; }
					if (d.nom === "listen"){ var pm = /(\d+)$/.exec(String(d.args[0]).replace(/^\[::\]:/, "")); if (pm) s.listen.push(+pm[1]); }
					if (d.nom === "root") s.root = d.args[0];
					if (d.nom === "index") s.index = d.args.slice();
					if (d.nom === "return") s.retour = { code: +d.args[0], texte: d.args.slice(1).join(" ").replace(/^["']|["']$/g, "") };
					if (d.nom === "location"){
						var mod = d.args.length > 1 ? d.args[0] : "", chemin = d.args[d.args.length - 1];
						var loc = { mod: mod, chemin: chemin, root: null, alias: null, index: null, proxy: null, retour: null, ligne: d.ligne, fichier: d.fichier, tryFiles: null };
						(d.enfants || []).forEach(function(e){
							if (DIRECTIVES_NGINX_PORT.indexOf(e.nom) === -1){ if (!erreur) erreur = "unknown directive \"" + e.nom + "\" in " + e.fichier + ":" + e.ligne; return; }
							if (e.nom === "root") loc.root = e.args[0];
							if (e.nom === "alias") loc.alias = e.args[0];
							if (e.nom === "index") loc.index = e.args.slice();
							if (e.nom === "proxy_pass") loc.proxy = { url: e.args[0], ligne: e.ligne, fichier: e.fichier };
							if (e.nom === "return") loc.retour = { code: +e.args[0], texte: e.args.slice(1).join(" ").replace(/^["']|["']$/g, "") };
							if (e.nom === "try_files") loc.tryFiles = e.args.slice();
						});
						s.locations.push(loc);
					}
				});
				if (!s.listen.length) s.listen.push(80);
				serveurs.push(s);
			}
		});
	}
	parcourir(arbre.noeuds, false);
	if (erreur) return { erreur: erreur };
	return { serveurs: serveurs, upstreams: upstreams, fichiers: fichiers };
}
function analyserNginxPort(texte, fichier){
	var i = 0, ligne = 1, n = texte.length;
	function jeton(){
		while (i < n){
			var ch = texte.charAt(i);
			if (ch === "\n"){ ligne++; i++; continue; }
			if (/\s/.test(ch)){ i++; continue; }
			if (ch === "#"){ while (i < n && texte.charAt(i) !== "\n") i++; continue; }
			break;
		}
		if (i >= n) return null;
		var c = texte.charAt(i);
		if (c === "{" || c === "}" || c === ";"){ i++; return { v: c, op: true, ligne: ligne }; }
		if (c === "\"" || c === "'"){ var j = texte.indexOf(c, i + 1); if (j === -1) j = n; var v = texte.substring(i + 1, j); ligne += (v.match(/\n/g) || []).length; i = j + 1; return { v: v, ligne: ligne }; }
		var d = i;
		while (i < n && !/[\s{};]/.test(texte.charAt(i))) i++;
		return { v: texte.substring(d, i), ligne: ligne };
	}
	function bloc(dansBloc){
		var noeuds = [], courant = null;
		while (true){
			var j = jeton();
			if (!j){
				if (courant) return { erreur: "unexpected end of file, expecting \";\" or \"}\" in " + fichier + ":" + ligne };
				if (dansBloc) return { erreur: "unexpected end of file, expecting \"}\" in " + fichier + ":" + ligne };
				return { noeuds: noeuds };
			}
			if (j.op && j.v === "}"){
				if (courant) return { erreur: "unexpected \"}\" in " + fichier + ":" + j.ligne };
				if (!dansBloc) return { erreur: "unexpected \"}\" in " + fichier + ":" + j.ligne };
				return { noeuds: noeuds };
			}
			if (j.op && j.v === ";"){ if (courant){ noeuds.push(courant); courant = null; } continue; }
			if (j.op && j.v === "{"){
				if (!courant) return { erreur: "unexpected \"{\" in " + fichier + ":" + j.ligne };
				var b = bloc(true);
				if (b.erreur) return b;
				courant.enfants = b.noeuds;
				noeuds.push(courant); courant = null;
				continue;
			}
			if (!courant) courant = { nom: j.v, args: [], ligne: j.ligne, fichier: fichier };
			else {
				// Un « ; » oublié : le mot suivant est sur une autre ligne et c'est une directive connue.
				if (j.ligne > courant.ligne && DIRECTIVES_NGINX_PORT.indexOf(j.v) > -1 && courant.args.length) return { erreur: "directive \"" + courant.nom + "\" is not terminated by \";\" in " + fichier + ":" + courant.ligne };
				courant.args.push(j.v);
			}
		}
	}
	return bloc(false);
}
function nginxProgrammePort(h, c, ctx, args){
	var horo = horodatageNginxPort(h);
	var echec = function(msg){ return { fin: true, code: 1, erreurs: horo + " [emerg] 1#1: " + msg + "\nnginx: [emerg] " + msg + "\n", type: "nginx" }; };
	if (args.indexOf("-t") > -1 || args.indexOf("-T") > -1){
		var t = lireConfNginxPort(ctx);
		if (t.erreur) return { fin: true, code: 1, erreurs: "nginx: [emerg] " + t.erreur + "\nnginx: configuration file /etc/nginx/nginx.conf test failed\n" };
		return { fin: true, code: 0, erreurs: "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n" };
	}
	if (args.indexOf("-v") > -1) return { fin: true, code: 0, erreurs: "nginx version: nginx/1.27.2\n" };
	var conf = lireConfNginxPort(ctx);
	if (conf.erreur) return echec(conf.erreur);
	var racine = ctx.user.uid === 0;
	// Les dossiers de travail et le fichier pid.
	var fs = ctx.fs;
	var ecrireTest = function(chemin, fichier){
		try { var e = resoudreCheminPort(fs, chemin, true); var x = e.e ? copieJson(e.e) : (fichier ? tPort((ctx.pid || 1) + "\n") : dPort()); delete x.hote; ecrireEntreePort(fs, ctx, e.chemin, x); return null; }
		catch (er){ if (er instanceof ErreurFsPort) return er.code; throw er; }
	};
	var ec = ecrireTest("/var/cache/nginx/client_temp");
	if (ec) return echec("mkdir() \"/var/cache/nginx/client_temp\" failed (" + (ec === "EROFS" ? "30: Read-only file system" : "13: Permission denied") + ")");
	if (racine && !aCapPort(c, "CHOWN")) return echec("chown(\"/var/cache/nginx/client_temp\", 101) failed (1: Operation not permitted)");
	var ep = ecrireTest("/run/nginx.pid", true);
	if (ep) return echec("open() \"/run/nginx.pid\" failed (" + (ep === "EROFS" ? "30: Read-only file system" : "13: Permission denied") + ")");
	var ports = [];
	conf.serveurs.forEach(function(s){ s.listen.forEach(function(p){ if (ports.indexOf(p) === -1) ports.push(p); }); });
	for (var i = 0; i < ports.length; i++){
		if (ports[i] < 1024 && (!racine || !aCapPort(c, "NET_BIND_SERVICE"))) return echec("bind() to 0.0.0.0:" + ports[i] + " failed (13: Permission denied)");
	}
	// Les amonts de proxy_pass doivent se résoudre au démarrage.
	var amonts = {};
	for (var k = 0; k < conf.serveurs.length; k++){
		var locs = conf.serveurs[k].locations;
		for (var j = 0; j < locs.length; j++){
			var px = locs[j].proxy;
			if (!px) continue;
			var m = /^https?:\/\/([^\/:]+)(?::(\d+))?/.exec(px.url);
			if (!m) continue;
			var hoteAmont = m[1];
			if (conf.upstreams[hoteAmont]) continue;
			var r = resoudreDepuisConteneurPort(h, c, hoteAmont);
			if (!r || !r.ip || r.inconnu) return echec("host not found in upstream \"" + hoteAmont + (m[2] ? ":" + m[2] : "") + "\" in " + px.fichier + ":" + px.ligne);
			amonts[hoteAmont] = r.ip;
		}
	}
	if (racine && (!aCapPort(c, "SETUID") || !aCapPort(c, "SETGID"))) return echec("setgid(101) failed (1: Operation not permitted)");
	var journal = [["stderr", horo + " [notice] 1#1: using the \"epoll\" event method"], ["stderr", horo + " [notice] 1#1: nginx/1.27.2"], ["stderr", horo + " [notice] 1#1: built by gcc 13.2.1 20240309 (Alpine 13.2.1_git20240309) "],
		["stderr", horo + " [notice] 1#1: OS: Linux " + NOYAU_PORT], ["stderr", horo + " [notice] 1#1: getrlimit(RLIMIT_NOFILE): 1048576:1048576"], ["stderr", horo + " [notice] 1#1: start worker processes"],
		["stderr", horo + " [notice] 1#1: start worker process 29"], ["stderr", horo + " [notice] 1#1: start worker process 30"]];
	var uidOuvrier = racine ? 101 : ctx.user.uid;
	return { type: "nginx", comm: "nginx", ecoutes: ports, conf: conf, amonts: amonts, uid: ctx.user.uid, uidOuvrier: uidOuvrier, journalApres: journal, memoire: 7.6 * 1048576, codeArret: 0, bavard: 1800,
		processus: [{ cmd: "nginx: master process nginx -g daemon off;", user: ctx.user.uid, comm: "nginx" }, { cmd: "nginx: worker process", user: uidOuvrier, comm: "nginx" }, { cmd: "nginx: worker process", user: uidOuvrier, comm: "nginx" }] };
}
/* Une requête à nginx : un fichier, un return, ou un proxy vers l'amont. */
function repondreNginxPort(h, c, port, req){
	var prog = c.programme, conf = prog.conf;
	var s = conf.serveurs.filter(function(x){ return x.listen.indexOf(port) > -1; })[0];
	if (!s) return null;
	var chemin = String(req.chemin || "/").split("?")[0];
	var loc = null;
	s.locations.forEach(function(l){ if (l.mod === "=" && l.chemin === chemin) loc = l; });
	if (!loc) s.locations.filter(function(l){ return l.mod === "" && chemin.indexOf(l.chemin) === 0; }).sort(function(a, b){ return b.chemin.length - a.chemin.length; }).forEach(function(l){ if (!loc) loc = l; });
	var rep;
	var page = function(code, titre){ return "<html>\r\n<head><title>" + code + " " + titre + "</title></head>\r\n<body>\r\n<center><h1>" + code + " " + titre + "</h1></center>\r\n<hr><center>nginx/1.27.2</center>\r\n</body>\r\n</html>\r\n"; };
	if (s.retour && !loc) rep = { code: s.retour.code, corps: s.retour.texte ? s.retour.texte + "\n" : "" };
	else if (loc && loc.retour) rep = { code: loc.retour.code, corps: loc.retour.texte ? loc.retour.texte + "\n" : "" };
	else if (loc && loc.proxy){
		var m = /^https?:\/\/([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(loc.proxy.url);
		var hoteAmont = m[1], portAmont = m[2] ? +m[2] : 80;
		var cibles = conf.upstreams[hoteAmont] ? conf.upstreams[hoteAmont] : [hoteAmont + (m[2] ? ":" + m[2] : "")];
		var cible = cibles[0].split(":");
		var ipAmont = prog.amonts[hoteAmont] || cible[0];
		var r = requeteDepuisPort(h, c, ipAmont, cible[1] ? +cible[1] : portAmont, { methode: req.methode, chemin: m[3] ? m[3].replace(/\/$/, "") + chemin.substring(loc.chemin.replace(/\/$/, "").length) : chemin, entetes: req.entetes, corps: req.corps, auth: req.auth });
		if (r.erreur){
			ajouterJournalPort(h, c, "stderr", horodatageNginxPort(h) + " [error] 29#29: *" + (1 + c.journaux.length % 97) + " connect() failed (111: Connection refused) while connecting to upstream, client: " + req.source + ", server: localhost, request: \"" + req.methode + " " + chemin + " HTTP/1.1\", upstream: \"http://" + ipAmont + ":" + (cible[1] || portAmont) + chemin + "\", host: \"" + (req.hoteDemande || "localhost") + "\"");
			rep = { code: 502, corps: page(502, "Bad Gateway"), entetes: { "Content-Type": "text/html" } };
		} else rep = { code: r.code, corps: r.corps, entetes: r.entetes };
	} else {
		var racine = (loc && loc.root) || s.root || "/usr/share/nginx/html";
		var fichier = loc && loc.alias ? cheminNormal(loc.alias + "/" + chemin.substring(loc.chemin.length)) : cheminNormal(racine + "/" + chemin);
		var ctx = contexteShellPort(h, c, { user: { nom: "nginx", uid: prog.uidOuvrier, gid: prog.uidOuvrier } });
		var e = null;
		try { e = resoudreCheminPort(ctx.fs, fichier, true).e; } catch (x){}
		if (e && e.t === "d"){
			var idx = ((loc && loc.index) || s.index || ["index.html"]).map(function(n){ return cheminNormal(fichier + "/" + n); }).filter(function(p){ return entreeConteneurPort(h, c, p); })[0];
			if (idx){ fichier = idx; e = entreeConteneurPort(h, c, idx); }
			else e = { forbidden: true };
		}
		if (!e) rep = { code: 404, corps: page(404, "Not Found"), entetes: { "Content-Type": "text/html" } };
		else if (e.forbidden || !peutPort(ctx, e, "r")) rep = { code: 403, corps: page(403, "Forbidden"), entetes: { "Content-Type": "text/html" } };
		else rep = { code: 200, corps: e.c !== undefined ? e.c : "", entetes: { "Content-Type": /\.html?$/.test(fichier) ? "text/html" : (/\.json$/.test(fichier) ? "application/json" : "text/plain"), "Last-Modified": dateHttp(new Date(maintenantPort(h) - 7200000)), "ETag": "\"" + hexDe(fichier, 8) + "-" + (e.s || 0).toString(16) + "\"", "Accept-Ranges": "bytes" } };
		if (rep.code >= 400 && rep.code !== 404) ajouterJournalPort(h, c, "stderr", horodatageNginxPort(h) + " [error] 29#29: *1 open() \"" + fichier + "\" failed (13: Permission denied), client: " + req.source + ", server: localhost, request: \"" + req.methode + " " + chemin + " HTTP/1.1\"");
	}
	rep.serveur = "nginx/1.27.2";
	ajouterJournalPort(h, c, "stdout", req.source + " - " + (req.auth ? String(req.auth).split(":")[0] : "-") + " [" + dateAccesPort(h) + "] \"" + req.methode + " " + chemin + " HTTP/1.1\" " + rep.code + " " + octetsPort(rep.corps || "") + " \"-\" \"" + (req.agent || "curl/8.14.1") + "\" \"-\"");
	return rep;
}
function dateAccesPort(h){
	var d = new Date(maintenantPort(h) - DECALAGE_HISTOIRE * 3600000);
	return deuxChiffres(d.getDate()) + "/" + MOIS_EN[d.getMonth()] + "/" + d.getFullYear() + ":" + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " +0000";
}

/* ================================================================== */
/* postgres et son petit SQL                                            */
/* ================================================================== */

function pgdataPort(ctx){ return ctx.env.PGDATA || "/var/lib/postgresql/data"; }
function lireEnvFichierPort(ctx, nom){
	if (ctx.env[nom + "_FILE"]){
		var t = lireTextePort(Object.create(ctx, { user: { value: { uid: 0, gid: 0 } } }), ctx.env[nom + "_FILE"]);
		return t === null ? { erreur: ctx.env[nom + "_FILE"] } : { valeur: t.replace(/\n$/, "") };
	}
	return { valeur: ctx.env.hasOwnProperty(nom) ? ctx.env[nom] : null };
}
function entreePostgresPort(h, c, ctx, args, journal, suite){
	if (args.length && args[0].charAt(0) === "-") args = ["postgres"].concat(args);
	if (args[0] !== "postgres") return suite(args);
	var data = pgdataPort(ctx);
	var fsRoot = Object.create(ctx); fsRoot.user = { nom: "postgres", uid: 70, gid: 70 };
	var racine = ctx.user.uid === 0;
	var mdp = lireEnvFichierPort(ctx, "POSTGRES_PASSWORD");
	if (mdp.erreur) return { fin: true, code: 1, erreurs: "cat: can't open '" + mdp.erreur + "': No such file or directory\n" };
	var utilisateur = lireEnvFichierPort(ctx, "POSTGRES_USER").valeur || "postgres";
	var base = lireEnvFichierPort(ctx, "POSTGRES_DB").valeur || utilisateur;
	var initialisee = !!entreeConteneurPort(h, c, data + "/PG_VERSION");
	var ecrire = function(chemin, texte, taille){
		var e = taille ? { t: "f", m: "rw-------", u: 70, g: 70, s: taille } : { t: "f", m: "rw-------", u: 70, g: 70, s: octetsPort(texte), c: texte };
		ecrireEntreePort(ctx.fs, null, chemin, e, { force: true });
	};
	var dossier = function(chemin){ if (!entreeConteneurPort(h, c, chemin)) ecrireEntreePort(ctx.fs, null, chemin, { t: "d", m: "rwx------", u: 70, g: 70 }, { force: true }); };
	try {
		// Le dossier des données doit appartenir à postgres : root le lui donne (chown), s'il en a le droit.
		var ed = entreeConteneurPort(h, c, data);
		if (ed && ed.u !== 70){
			if (!racine) return { fin: true, code: 1, erreurs: "initdb: error: could not change permissions of directory \"" + data + "\": Operation not permitted\n" };
			if (!aCapPort(c, "CHOWN")) return { fin: true, code: 1, erreurs: "chown: " + data + ": Operation not permitted\n" };
			var x = copieJson(ed); delete x.hote; x.u = 70; x.g = 70; x.m = "rwx------";
			ecrireEntreePort(ctx.fs, null, data, x, { force: true });
		}
		if (!ed) dossier(data);
	} catch (er){
		if (er instanceof ErreurFsPort) return { fin: true, code: 1, erreurs: "mkdir: can't create directory '" + data + "': " + MESSAGES_FS_PORT[er.code] + "\n" };
		throw er;
	}
	if (initialisee){
		journal.push(["stdout", "", ""]);
		journal.push(["stdout", "PostgreSQL Database directory appears to contain a database; Skipping initialization"]);
		journal.push(["stdout", ""]);
	} else {
		if ((mdp.valeur === null || mdp.valeur === "") && ctx.env.POSTGRES_HOST_AUTH_METHOD !== "trust"){
			return { fin: true, code: 1, erreurs: "Error: Database is uninitialized and superuser password is not specified.\n       You must specify POSTGRES_PASSWORD to a non-empty value for the\n       superuser. For example, \"-e POSTGRES_PASSWORD=password\" on \"docker run\".\n\n       You may also use \"POSTGRES_HOST_AUTH_METHOD=trust\" to allow all\n       connections without a password. This is *not* recommended.\n\n       See PostgreSQL documentation about \"trust\":\n       https://www.postgresql.org/docs/current/auth-trust.html\n" };
		}
		try {
			ecrire(data + "/PG_VERSION", "16\n");
			["base", "global", "pg_wal", "pg_xact", "pg_stat", "pg_tblspc", "pg_logical", "base/1", "base/4", "base/5"].forEach(function(d){ dossier(data + "/" + d); });
			ecrire(data + "/postgresql.conf", "# PostgreSQL configuration file\nlisten_addresses = '*'\nmax_connections = 100\nshared_buffers = 128MB\ndynamic_shared_memory_type = posix\nmax_wal_size = 1GB\nmin_wal_size = 80MB\nlog_timezone = UTC\ndatestyle = 'iso, mdy'\ntimezone = UTC\n");
			ecrire(data + "/pg_hba.conf", "# TYPE  DATABASE        USER            ADDRESS                 METHOD\nlocal   all             all                                     trust\nhost    all             all             127.0.0.1/32            trust\nhost    all             all             ::1/128                 trust\nlocal   replication     all                                     trust\nhost    replication     all             127.0.0.1/32            trust\nhost    replication     all             ::1/128                 trust\nhost all all all scram-sha-256\n");
			ecrire(data + "/pg_wal/000000010000000000000001", "", 16777216);
			ecrire(data + "/base/1/1259", "", 7536640);
			ecrire(data + "/base/4/1259", "", 7462912);
			ecrire(data + "/base/5/1259", "", 7536640);
			ecrire(data + "/global/1260", "", 573440);
			ecrire(data + "/global/roles", utilisateur + ":" + (mdp.valeur || "") + ":super\n");
			if (base !== "postgres"){ dossier(data + "/base/" + base); ecrire(data + "/base/" + base + "/1259", "", 7536640); }
			dossier(data + "/base/postgres");
		} catch (er2){
			if (er2 instanceof ErreurFsPort) return { fin: true, code: 1, erreurs: "initdb: error: could not create directory \"" + data + "/base\": " + MESSAGES_FS_PORT[er2.code] + "\n" };
			throw er2;
		}
		["The files belonging to this database system will be owned by user \"postgres\".", "This user must also own the server process.", "", "The database cluster will be initialized with locale \"en_US.utf8\".",
			"The default database encoding has accordingly been set to \"UTF8\".", "The default text search configuration will be set to \"english\".", "", "Data page checksums are disabled.", "",
			"fixing permissions on existing directory " + data + " ... ok", "creating subdirectories ... ok", "selecting dynamic shared memory implementation ... posix", "selecting default max_connections ... 100",
			"selecting default shared_buffers ... 128MB", "selecting default time zone ... UTC", "creating configuration files ... ok", "running bootstrap script ... ok", "performing post-bootstrap initialization ... ok",
			"syncing data to disk ... ok", "", "", "Success. You can now start the database server using:", "", "    pg_ctl -D " + data + " -l logfile start", "",
			"initdb: warning: enabling \"trust\" authentication for local connections", "initdb: hint: You can change this by editing pg_hba.conf or using the option -A, or --auth-local and --auth-host, the next time you run initdb.",
			"waiting for server to start....done", "server started"].forEach(function(l){ journal.push([/^initdb:/.test(l) ? "stderr" : "stdout", l]); });
		if (base !== "postgres") journal.push(["stdout", "CREATE DATABASE"]);
		journal.push(["stdout", ""]);
		// Les scripts d'initialisation : /docker-entrypoint-initdb.d/*.sql, dans l'ordre.
		var scripts = [];
		try { scripts = listerPort(ctx.fs, "/docker-entrypoint-initdb.d"); } catch (e){}
		for (var i = 0; i < scripts.length; i++){
			var f = "/docker-entrypoint-initdb.d/" + scripts[i];
			if (/\.sql$/.test(f)){
				journal.push(["stdout", "/usr/local/bin/docker-entrypoint.sh: running " + f]);
				var sql = lireTextePort(fsRoot, f);
				if (sql === null){ sql = lireTextePort(ctx, f); }
				if (sql === null){ journal.push(["stderr", "psql:" + f + ": error: could not read file \"" + f + "\": Permission denied"]); return { fin: true, code: 1, type: "postgres" }; }
				var r = executerSqlPort(h, c, ctx, base, utilisateur, sql);
				r.messages.forEach(function(m){ journal.push(["stdout", m]); });
				if (r.erreur){ journal.push(["stderr", "psql:" + f + ":" + r.ligne + ": ERROR:  " + r.erreur]); return { fin: true, code: 3, type: "postgres" }; }
				journal.push(["stdout", ""]);
			} else if (/\.sh$/.test(f)) journal.push(["stdout", "/usr/local/bin/docker-entrypoint.sh: running " + f]);
			else journal.push(["stdout", "/usr/local/bin/docker-entrypoint.sh: ignoring " + f]);
		}
		journal.push(["stdout", ""], ["stdout", "waiting for server to shut down....done"], ["stdout", "server stopped"], ["stdout", ""], ["stdout", "PostgreSQL init process complete; ready for start up."], ["stdout", ""]);
	}
	if (racine){ if (!aCapPort(c, "SETUID") || !aCapPort(c, "SETGID")) return { fin: true, code: 1, erreurs: "su-exec: setgroups: Operation not permitted\n" }; ctx.user = { nom: "postgres", uid: 70, gid: 70 }; }
	return postgresServeurPort(h, c, ctx, args.slice(1));
}
function postgresServeurPort(h, c, ctx, args){
	if (ctx.user.uid === 0) return { fin: true, code: 1, erreurs: "\"root\" execution of the PostgreSQL server is not permitted.\nThe server must be started under an unprivileged user ID to prevent\npossible system security compromise.  See the documentation for\nmore information on how to properly start the server.\n", type: "postgres" };
	var data = pgdataPort(ctx);
	if (!entreeConteneurPort(h, c, data + "/PG_VERSION")) return { fin: true, code: 2, erreurs: "postgres: could not access the server configuration file \"" + data + "/postgresql.conf\": No such file or directory\n", type: "postgres" };
	var horo = horodatagePgPort(h);
	var journal = [["stderr", horo + " [1] LOG:  starting PostgreSQL 16.4 on x86_64-pc-linux-musl, compiled by gcc (Alpine 13.2.1_git20240309) 13.2.1 20240309, 64-bit"],
		["stderr", horo + " [1] LOG:  listening on IPv4 address \"0.0.0.0\", port 5432"], ["stderr", horo + " [1] LOG:  listening on IPv6 address \"::\", port 5432"],
		["stderr", horo + " [1] LOG:  listening on Unix socket \"/var/run/postgresql/.s.PGSQL.5432\""], ["stderr", horo + " [29] LOG:  database system was shut down at " + horo],
		["stderr", horo + " [1] LOG:  database system is ready to accept connections"]];
	var u = ctx.user.uid;
	return { type: "postgres", comm: "postgres", ecoutes: [5432], uid: u, data: data, journalApres: journal, memoire: 26 * 1048576, codeArret: 0,
		processus: [{ cmd: "postgres", user: u }, { cmd: "postgres: checkpointer ", user: u }, { cmd: "postgres: background writer ", user: u }, { cmd: "postgres: walwriter ", user: u },
			{ cmd: "postgres: autovacuum launcher ", user: u }, { cmd: "postgres: logical replication launcher ", user: u }] };
}
/* Les rôles et les bases d'un postgres qui tourne (lus dans son dossier de données). */
function rolesPgPort(h, c){
	var data = c.programme && c.programme.data || "/var/lib/postgresql/data";
	var t = lireFichierConteneurPort(h, c, data + "/global/roles") || "";
	var r = {};
	t.split("\n").filter(Boolean).forEach(function(l){ var x = l.split(":"); r[x[0]] = { mdp: x[1], super: x[2] === "super" }; });
	return r;
}
function basesPgPort(h, c){
	var data = c.programme && c.programme.data || "/var/lib/postgresql/data";
	try { return listerPort(fsPort(h, c), data + "/base").filter(function(n){ return !/^\d+$/.test(n); }); } catch (e){ return []; }
}
function cheminTablePort(c, base, table){ return ((c.programme && c.programme.data) || "/var/lib/postgresql/data") + "/base/" + base + "/" + table + ".tbl"; }
function lireTablePort(h, c, base, table){
	var t = lireFichierConteneurPort(h, c, cheminTablePort(c, base, table));
	if (t === null) return null;
	var l = t.split("\n").filter(Boolean);
	var cols = (l[0] || "#").replace(/^#/, "").split(",").filter(Boolean);
	return { colonnes: cols, lignes: l.slice(1).map(function(x){ try { return JSON.parse(x); } catch (e){ return []; } }) };
}
function ecrireTablePort(h, c, base, table, tab){
	var texte = "#" + tab.colonnes.join(",") + "\n" + tab.lignes.map(function(r){ return JSON.stringify(r); }).join("\n") + (tab.lignes.length ? "\n" : "");
	ecrireEntreePort(fsPort(h, c), null, cheminTablePort(c, base, table), { t: "f", m: "rw-------", u: 70, g: 70, s: 8192 * (1 + Math.floor(tab.lignes.length / 40)), c: texte }, { force: true });
}
/* Le petit SQL : { messages, lignes, colonnes, erreur, ligne } ; c est le conteneur postgres. */
function executerSqlPort(h, c, ctx, base, user, sql){
	var r = { messages: [], resultats: [], erreur: null, ligne: 1 };
	var ordres = [], cour = "", q = false, ligne = 1, debutLigne = 1;
	for (var i = 0; i < sql.length; i++){
		var ch = sql.charAt(i);
		if (ch === "\n") ligne++;
		if (ch === "'" ) q = !q;
		if (!q && ch === "-" && sql.charAt(i + 1) === "-"){ while (i < sql.length && sql.charAt(i) !== "\n") i++; ligne++; cour += "\n"; continue; }
		if (!q && ch === ";"){ ordres.push({ t: cour, l: debutLigne }); cour = ""; debutLigne = ligne; continue; }
		if (cour.trim() === "" && /\s/.test(ch)){ if (ch === "\n") debutLigne = ligne; continue; }
		cour += ch;
	}
	if (cour.trim()) ordres.push({ t: cour, l: debutLigne });
	for (var k = 0; k < ordres.length; k++){
		var o = ordres[k].t.trim(), m;
		r.ligne = ordres[k].l;
		if (!o) continue;
		if ((m = /^create\s+table\s+(if\s+not\s+exists\s+)?(\w+)\s*\(([\s\S]*)\)$/i.exec(o))){
			var nom = m[2].toLowerCase();
			if (lireTablePort(h, c, base, nom)){ if (m[1]){ r.messages.push("NOTICE:  relation \"" + nom + "\" already exists, skipping"); r.messages.push("CREATE TABLE"); continue; } r.erreur = "relation \"" + nom + "\" already exists"; return r; }
			var cols = m[3].split(",").map(function(x){ return x.trim().split(/\s+/)[0].toLowerCase(); }).filter(function(x){ return x && !/^(primary|unique|constraint|foreign)$/.test(x); });
			ecrireTablePort(h, c, base, nom, { colonnes: cols, lignes: [] });
			r.messages.push("CREATE TABLE");
			continue;
		}
		if ((m = /^insert\s+into\s+(\w+)\s*(\(([^)]*)\))?\s*values\s*([\s\S]+)$/i.exec(o))){
			var t = lireTablePort(h, c, base, m[1].toLowerCase());
			if (!t){ r.erreur = "relation \"" + m[1].toLowerCase() + "\" does not exist"; return r; }
			var tuples = m[4].match(/\((?:[^()']|'[^']*')*\)/g) || [];
			tuples.forEach(function(tu){ var vals = tu.slice(1, -1).match(/'[^']*'|[^,]+/g) || []; t.lignes.push(vals.map(function(v){ v = v.trim(); return /^'.*'$/.test(v) ? v.slice(1, -1) : (v.toLowerCase() === "null" ? null : (isNaN(+v) ? v : +v)); })); });
			ecrireTablePort(h, c, base, m[1].toLowerCase(), t);
			r.messages.push("INSERT 0 " + tuples.length);
			continue;
		}
		if ((m = /^select\s+count\(\*\)\s+from\s+(\w+)/i.exec(o))){
			var t2 = lireTablePort(h, c, base, m[1].toLowerCase());
			if (!t2){ r.erreur = "relation \"" + m[1].toLowerCase() + "\" does not exist"; return r; }
			r.resultats.push({ colonnes: ["count"], lignes: [[t2.lignes.length]] });
			continue;
		}
		if ((m = /^select\s+(.+?)\s+from\s+(\w+)(\s+limit\s+(\d+))?$/i.exec(o))){
			var t3 = lireTablePort(h, c, base, m[2].toLowerCase());
			if (!t3){ r.erreur = "relation \"" + m[2].toLowerCase() + "\" does not exist"; return r; }
			var choix = m[1].trim() === "*" ? t3.colonnes : m[1].split(",").map(function(x){ return x.trim().toLowerCase(); });
			var idx = choix.map(function(x){ return t3.colonnes.indexOf(x); });
			if (idx.indexOf(-1) > -1){ r.erreur = "column \"" + choix[idx.indexOf(-1)] + "\" does not exist"; return r; }
			var lignes = t3.lignes.map(function(l){ return idx.map(function(i){ return l[i]; }); });
			if (m[4]) lignes = lignes.slice(0, +m[4]);
			r.resultats.push({ colonnes: choix, lignes: lignes });
			continue;
		}
		if (/^select\s+version\(\)/i.test(o)){ r.resultats.push({ colonnes: ["version"], lignes: [["PostgreSQL 16.4 on x86_64-pc-linux-musl, compiled by gcc (Alpine 13.2.1_git20240309) 13.2.1 20240309, 64-bit"]] }); continue; }
		if ((m = /^select\s+(\d+)$/i.exec(o))){ r.resultats.push({ colonnes: ["?column?"], lignes: [[+m[1]]] }); continue; }
		if ((m = /^drop\s+table\s+(if\s+exists\s+)?(\w+)$/i.exec(o))){
			try { supprimerEntreePort(fsPort(h, c), null, cheminTablePort(c, base, m[2].toLowerCase()), false); r.messages.push("DROP TABLE"); }
			catch (e){ if (m[1]) r.messages.push("DROP TABLE"); else { r.erreur = "table \"" + m[2] + "\" does not exist"; return r; } }
			continue;
		}
		if ((m = /^delete\s+from\s+(\w+)$/i.exec(o))){ var t4 = lireTablePort(h, c, base, m[1].toLowerCase()); if (!t4){ r.erreur = "relation \"" + m[1] + "\" does not exist"; return r; } var nb = t4.lignes.length; t4.lignes = []; ecrireTablePort(h, c, base, m[1].toLowerCase(), t4); r.messages.push("DELETE " + nb); continue; }
		if ((m = /^create\s+database\s+(\w+)$/i.exec(o))){ ecrireEntreePort(fsPort(h, c), null, (c.programme && c.programme.data || "/var/lib/postgresql/data") + "/base/" + m[1].toLowerCase(), { t: "d", m: "rwx------", u: 70, g: 70 }, { force: true }); r.messages.push("CREATE DATABASE"); continue; }
		if ((m = /^create\s+(user|role)\s+(\w+)(?:\s+with)?(?:\s+login)?(?:\s+password\s+'([^']*)')?/i.exec(o))){
			var data = (c.programme && c.programme.data) || "/var/lib/postgresql/data", roles = lireFichierConteneurPort(h, c, data + "/global/roles") || "";
			ecrireEntreePort(fsPort(h, c), null, data + "/global/roles", tPort(roles + m[2] + ":" + (m[3] || "") + ":\n", "rw-------", 70, 70), { force: true });
			r.messages.push("CREATE ROLE"); continue;
		}
		if (/^grant\s/i.test(o)){ r.messages.push("GRANT"); continue; }
		if (/^alter\s/i.test(o)){ r.messages.push("ALTER " + (o.split(/\s+/)[1] || "").toUpperCase()); continue; }
		r.erreur = "syntax error at or near \"" + o.split(/\s+/)[0] + "\"";
		return r;
	}
	return r;
}
/* Le tableau de psql. */
function tableauPsqlPort(res){
	var largeurs = res.colonnes.map(function(c, i){ return Math.max(c.length, Math.max.apply(null, res.lignes.map(function(l){ return String(l[i] === null ? "" : l[i]).length; }).concat([0]))); });
	var centre = function(t, n){ var g = Math.floor((n - t.length) / 2); return new Array(g + 1).join(" ") + t + new Array(n - t.length - g + 1).join(" "); };
	var l = [" " + res.colonnes.map(function(c, i){ return centre(c, largeurs[i]); }).join(" | ") + " ", res.colonnes.map(function(c, i){ return new Array(largeurs[i] + 3).join("-"); }).join("+")];
	res.lignes.forEach(function(r){ l.push(" " + r.map(function(v, i){ var t = String(v === null ? "" : v); return typeof v === "number" ? completerGauche(t, largeurs[i]) : completerDroite(t, largeurs[i]); }).join(" | ") + " "); });
	l.push("(" + res.lignes.length + " row" + (res.lignes.length === 1 ? "" : "s") + ")", "");
	return l.join("\n") + "\n";
}
/* Se connecter à un postgres : { c, h, base } ou { erreur } (au texte des pilotes : psql, les applis). */
function connexionPgPort(h, depuis, hote, port, user, mdp, base, local){
	var cible;
	if (local) cible = { conteneur: depuis, ip: "127.0.0.1" };
	else {
		cible = depuis ? resoudreDepuisConteneurPort(h, depuis, hote) : (resoudreHotePort(hote, h) ? { hote: resoudreHotePort(hote, h), ip: ipPort(resoudreHotePort(hote, h)) } : null);
		if (!cible || !cible.ip || cible.inconnu) return { erreur: "could not translate host name \"" + hote + "\" to address: Name or service not known" };
	}
	var ec = local ? (enMarchePort(depuis) && depuis.programme && depuis.programme.type === "postgres" ? { conteneur: depuis, hote: h } : null) : (depuis ? ecouteurPort(h, depuis, cible, port || 5432) : ecouteurHotePort(cible.hote, port || 5432, h, false));
	var adr = "connection to server at \"" + hote + "\" (" + cible.ip + "), port " + (port || 5432) + " failed: ";
	if (local && !ec) return { erreur: "connection to server on socket \"/var/run/postgresql/.s.PGSQL.5432\" failed: No such file or directory\n\tIs the server running locally and accepting connections on that socket?" };
	if (!ec) return { erreur: adr + "Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?" };
	var pg = ec.conteneur, hp = ec.hote || h;
	if (!pg.programme || pg.programme.type !== "postgres") return { erreur: adr + "server closed the connection unexpectedly\n\tThis probably means the server terminated abnormally\n\tbefore or while processing the request." };
	var roles = rolesPgPort(hp, pg);
	if (!roles[user]) return { erreur: (local ? "connection to server on socket \"/var/run/postgresql/.s.PGSQL.5432\" failed: " : adr) + "FATAL:  role \"" + user + "\" does not exist" };
	if (!local && mdp === null) return { erreur: adr + "fe_sendauth: no password supplied" };
	if (!local && roles[user].mdp !== mdp) return { erreur: adr + "FATAL:  password authentication failed for user \"" + user + "\"" };
	if (basesPgPort(hp, pg).indexOf(base) === -1) return { erreur: (local ? "connection to server on socket \"/var/run/postgresql/.s.PGSQL.5432\" failed: " : adr) + "FATAL:  database \"" + base + "\" does not exist" };
	return { c: pg, h: hp, base: base, user: user };
}

/* ================================================================== */
/* redis                                                                */
/* ================================================================== */

function redisProgrammePort(h, c, ctx, args){
	var opts = {};
	for (var i = 0; i < args.length; i++){ if (/^--/.test(args[i])){ opts[args[i].substring(2)] = args[i + 1]; i++; } }
	var port = +(opts.port || 6379);
	var d = new Date(maintenantPort(h) - DECALAGE_HISTOIRE * 3600000), horo = deuxChiffres(d.getDate()) + " " + MOIS_EN[d.getMonth()] + " " + d.getFullYear() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + ".512";
	var journal = [["stdout", "1:C " + horo + " * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo"], ["stdout", "1:C " + horo + " * Redis version=7.4.1, bits=64, commit=00000000, modified=0, pid=1, just started"],
		["stdout", "1:C " + horo + " # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf"],
		["stdout", "1:M " + horo + " * monotonic clock: POSIX clock_gettime"], ["stdout", "1:M " + horo + " * Running mode=standalone, port=" + port + "."], ["stdout", "1:M " + horo + " * Server initialized"],
		["stdout", "1:M " + horo + " * Ready to accept connections tcp"]];
	var max = opts.maxmemory ? lireTaille(String(opts.maxmemory).replace(/b$/i, "")) : 0;
	return { type: "redis", comm: "redis-server", ecoutes: [port], uid: ctx.user.uid, journalApres: journal, memoire: 9 * 1048576, codeArret: 0, cles: {}, donnees: 0, maxmemory: max, motDePasse: opts.requirepass || null,
		processus: [{ cmd: "redis-server *:" + port, user: ctx.user.uid }] };
}
/* Une commande envoyée à redis : la réponse comme redis-cli l'affiche. */
function commandeRedisPort(h, c, mots){
	var prog = c.programme, cmd = String(mots[0] || "").toUpperCase();
	switch (cmd){
		case "PING": return "PONG";
		case "SET": prog.cles[mots[1]] = mots[2]; prog.donnees += octetsPort(mots[2]) + 64; return "OK";
		case "GET": return prog.cles.hasOwnProperty(mots[1]) ? "\"" + prog.cles[mots[1]] + "\"" : "(nil)";
		case "INCR": prog.cles[mots[1]] = String((+prog.cles[mots[1]] || 0) + 1); return "(integer) " + prog.cles[mots[1]];
		case "DEL": var n = mots.slice(1).filter(function(k){ return prog.cles.hasOwnProperty(k); }).length; mots.slice(1).forEach(function(k){ delete prog.cles[k]; }); return "(integer) " + n;
		case "DBSIZE": return "(integer) " + Object.keys(prog.cles).length;
		case "KEYS": var l = Object.keys(prog.cles).sort(); return l.length ? l.map(function(k, i){ return (i + 1) + ") \"" + k + "\""; }).join("\n") : "(empty array)";
		case "FLUSHALL": prog.cles = {}; prog.donnees = 0; return "OK";
		case "INFO":
			if (String(mots[1] || "").toLowerCase() === "memory") return "# Memory\nused_memory:" + Math.round(c.memoire * 0.12) + "\nused_memory_human:" + (c.memoire * 0.12 / 1048576).toFixed(2) + "M\nused_memory_rss:" + c.memoire + "\nused_memory_rss_human:" + (c.memoire / 1048576).toFixed(2) + "M\nmaxmemory:" + (prog.maxmemory || 0) + "\nmaxmemory_human:" + (prog.maxmemory ? (prog.maxmemory / 1048576).toFixed(2) + "M" : "0B") + "\nmaxmemory_policy:noeviction";
			return "# Server\nredis_version:7.4.1\nredis_mode:standalone\nos:Linux " + NOYAU_PORT + " x86_64\ntcp_port:6379\nuptime_in_seconds:" + Math.round((maintenantPort(h) - c.etat.debut) / 1000) + "\n\n# Clients\nconnected_clients:1\n\n# Keyspace\n" + (Object.keys(prog.cles).length ? "db0:keys=" + Object.keys(prog.cles).length + ",expires=0,avg_ttl=0" : "");
		default: return "(error) ERR unknown command '" + mots[0] + "', with args beginning with: " + mots.slice(1).map(function(x){ return "'" + x + "' "; }).join("");
	}
}
function connexionRedisPort(h, depuis, hote, port, mdp){
	var cible = hote === "127.0.0.1" || hote === "localhost" ? { conteneur: depuis, ip: "127.0.0.1", soiMeme: true } : resoudreDepuisConteneurPort(h, depuis, hote);
	if (!cible || !cible.ip || cible.inconnu) return { erreur: "Could not connect to Redis at " + hote + ":" + (port || 6379) + ": Name or service not known", erreurPy: "Error -2 connecting to " + hote + ":" + (port || 6379) + ". Name or service not known." };
	var ec = cible.soiMeme ? (enMarchePort(depuis) && (depuis.ecoutes || []).indexOf(port || 6379) > -1 ? { conteneur: depuis, hote: h } : null) : ecouteurPort(h, depuis, cible, port || 6379);
	if (!ec || !ec.conteneur.programme || ec.conteneur.programme.type !== "redis") return { erreur: "Could not connect to Redis at " + hote + ":" + (port || 6379) + ": Connection refused", erreurPy: "Error 111 connecting to " + hote + ":" + (port || 6379) + ". Connection refused." };
	if (ec.conteneur.programme.motDePasse && ec.conteneur.programme.motDePasse !== mdp) return { refus: "(error) NOAUTH Authentication required.", c: ec.conteneur, h: ec.hote || h };
	return { c: ec.conteneur, h: ec.hote || h };
}

/* ================================================================== */
/* Le registre privé (registry:2) : l'API /v2/, htpasswd, le stockage   */
/* ================================================================== */

/* Un faux bcrypt, stable : « $2y$05$ » + sel (22) + empreinte (31). Le registre le vérifie. */
var ALPHABET_BCRYPT_PORT = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function bcryptPort(mdp, sel, cout){
	var s = sel || "", k = 0;
	while (s.length < 22){ s += ALPHABET_BCRYPT_PORT.charAt(parseInt(hexDe("sel:" + mdp + ":" + state.nbCommandes + ":" + k, 2), 16) % 64); k++; }
	var h = hexDe("bcrypt:" + s + ":" + mdp, 62), e = "";
	for (var i = 0; i < 31; i++) e += ALPHABET_BCRYPT_PORT.charAt(parseInt(h.substring(i * 2, i * 2 + 2), 16) % 64);
	return "$2y$" + (cout || "05") + "$" + s + e;
}
function verifierBcryptPort(hache, mdp){
	var m = /^\$2[aby]\$(\d\d)\$(.{22})(.{31})$/.exec(hache || "");
	if (!m) return false;
	return bcryptPort(mdp, m[2], m[1]) === hache;
}
function registreProgrammePort(h, c, ctx, args){
	var config = args[args.length - 1] && /\.ya?ml$/.test(args[args.length - 1]) ? args[args.length - 1] : "/etc/docker/registry/config.yml";
	var horo = function(){ return "time=\"" + dateIsoPort(maintenantPort(h)).substring(0, 23) + "Z\""; };
	var fin = " go.version=go1.20.8 instance.id=" + hexDe("inst" + c.id, 8) + "-" + hexDe("inst2" + c.id, 4) + "-4" + hexDe("i3" + c.id, 3) + "-a" + hexDe("i4" + c.id, 3) + "-" + hexDe("i5" + c.id, 12) + " service=registry version=2.8.3";
	var texte = lireTextePort(ctx, config);
	if (texte === null) return { fin: true, code: 1, erreurs: "configuration error: open " + config + ": no such file or directory\n\nUsage: \n  registry serve <config> [flags]\nFlags:\n  -h, --help=false: help for serve\n\n\nAdditional help topics:\n\n" };
	var cfg = typeof lireYamlPort === "function" ? lireYamlPort(texte) : {};
	if (cfg && cfg.erreur) cfg = {};
	var racine = ctx.env.REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY || (cfg.storage && cfg.storage.filesystem && cfg.storage.filesystem.rootdirectory) || "/var/lib/registry";
	var auth = null;
	if (ctx.env.REGISTRY_AUTH === "htpasswd" || (cfg.auth && cfg.auth.htpasswd)){
		auth = { realm: ctx.env.REGISTRY_AUTH_HTPASSWD_REALM || (cfg.auth && cfg.auth.htpasswd && cfg.auth.htpasswd.realm) || "basic-realm", chemin: ctx.env.REGISTRY_AUTH_HTPASSWD_PATH || (cfg.auth && cfg.auth.htpasswd && cfg.auth.htpasswd.path) };
		if (!auth.chemin) return { fin: true, code: 1, erreurs: horo() + " level=fatal msg=\"configuring application: unable to configure authorization (htpasswd): no path specified\"" + fin + "\n" };
		if (lireTextePort(ctx, auth.chemin) === null) return { fin: true, code: 1, erreurs: horo() + " level=fatal msg=\"configuring application: unable to configure authorization (htpasswd): open " + auth.chemin + ": no such file or directory\"" + fin + "\n" };
	}
	var addr = ctx.env.REGISTRY_HTTP_ADDR || (cfg.http && cfg.http.addr) || ":5000";
	var port = +(String(addr).split(":").pop() || 5000);
	var journal = [["stderr", horo() + " level=warning msg=\"No HTTP secret provided - generated random secret. This may cause problems with uploads if multiple registries are behind a load-balancer. To provide a shared secret, fill in http.secret in the configuration file or set the REGISTRY_HTTP_SECRET environment variable.\"" + fin],
		["stderr", horo() + " level=info msg=\"redis not configured\"" + fin], ["stderr", horo() + " level=info msg=\"Starting upload purge in 20m0s\"" + fin],
		["stderr", horo() + " level=info msg=\"using inmemory blob descriptor cache\"" + fin], ["stderr", horo() + " level=info msg=\"listening on [::]:" + port + "\"" + fin]];
	return { type: "registry", comm: "registry", ecoutes: [port], uid: ctx.user.uid, racine: racine, auth: auth, journalApres: journal, memoire: 11.8 * 1048576, codeArret: 2, bavard: 1200,
		processus: [{ cmd: "registry serve " + config, user: ctx.user.uid }] };
}
/* Les comptes du htpasswd du registre, et la vérification d'un « user:motdepasse ». */
function authRegistrePort(h, c, auth){
	var prog = c.programme;
	if (!prog.auth) return { ok: true };
	if (!auth) return { ok: false, raison: "manquant" };
	var i = String(auth).indexOf(":"), u = String(auth).substring(0, i), m = String(auth).substring(i + 1);
	var t = lireFichierConteneurPort(h, c, prog.auth.chemin) || "";
	var ligne = t.split("\n").filter(function(l){ return l.split(":")[0] === u; })[0];
	if (!ligne) return { ok: false, raison: "inconnu", user: u };
	return verifierBcryptPort(ligne.substring(u.length + 1), m) ? { ok: true, user: u } : { ok: false, raison: "mot de passe", user: u };
}
function accesRegistreFsPort(h, c){ var ctx = contexteShellPort(h, c, { user: { nom: "root", uid: 0, gid: 0 } }); return ctx; }
function cheminDepotRegistrePort(c, nom){ return cheminNormal(c.programme.racine + "/docker/registry/v2/repositories/" + nom); }
function cheminBlobRegistrePort(c, digest){ var d = digest.replace(/^sha256:/, ""); return cheminNormal(c.programme.racine + "/docker/registry/v2/blobs/sha256/" + d.substring(0, 2) + "/" + d + "/data"); }
function ecrireRegistrePort(h, c, chemin, texte, taille){
	var ctx = accesRegistreFsPort(h, c);
	var parts = morceauxChemin(chemin), cur = "";
	for (var i = 0; i < parts.length - 1; i++){ cur += "/" + parts[i]; if (!entreeConteneurPort(h, c, cur)) ecrireEntreePort(ctx.fs, ctx, cur, dPort()); }
	var e = { t: "f", m: "rw-r--r--", u: 0, g: 0, s: taille !== undefined ? taille : octetsPort(texte), c: texte };
	ecrireEntreePort(ctx.fs, ctx, chemin, e);
}
/* Les dépôts et les tags d'un registre qui tourne. */
function depotsRegistrePort(h, c){
	var base = cheminNormal(c.programme.racine + "/docker/registry/v2/repositories"), l = [];
	var fs = fsPort(h, c);
	(function parcourir(p, nom){
		var noms; try { noms = listerPort(fs, p); } catch (e){ return; }
		if (noms.indexOf("_manifests") > -1){ l.push(nom); return; }
		noms.forEach(function(n){ parcourir(cheminNormal(p + "/" + n), nom ? nom + "/" + n : n); });
	})(base, "");
	return l.sort();
}
function tagsRegistrePort(h, c, depot){ try { return listerPort(fsPort(h, c), cheminDepotRegistrePort(c, depot) + "/_manifests/tags"); } catch (e){ return []; } }
function digestTagRegistrePort(h, c, depot, tag){ var t = lireFichierConteneurPort(h, c, cheminDepotRegistrePort(c, depot) + "/_manifests/tags/" + tag + "/current/link"); return t ? t.trim() : null; }
function manifesteRegistrePort(h, c, depot, ref){
	var digest = /^sha256:/.test(ref) ? ref : digestTagRegistrePort(h, c, depot, ref);
	if (!digest) return null;
	var t = lireFichierConteneurPort(h, c, cheminBlobRegistrePort(c, digest));
	if (!t) return null;
	try { return { digest: digest, texte: t, json: JSON.parse(t) }; } catch (e){ return null; }
}
/* Pousser une image dans le registre (les couches, la config, le manifeste, le tag). */
function pousserDansRegistrePort(hClient, img, hr, cr, depot, tag){
	var manif = manifestePort(hClient, img);
	var digest = "sha256:" + sha256(manif);
	var config = configJsonPort(img);
	var pousses = [];
	(img.couches || []).forEach(function(id){
		var b = "sha256:" + blobPort(id), chemin = cheminBlobRegistrePort(cr, b);
		var deja = !!entreeConteneurPort(hr, cr, chemin);
		var couche = couchePort(hClient, id);
		if (!deja) ecrireRegistrePort(hr, cr, chemin, "couche:" + id + "\n", Math.round(((couche && couche.taille) || 0) * 0.38) + 412);
		ecrireRegistrePort(hr, cr, cheminDepotRegistrePort(cr, depot) + "/_layers/sha256/" + b.substring(7) + "/link", b + "\n");
		pousses.push({ blob: b, deja: deja, id: id });
		if (couche && !COUCHES_PORT[id]) etatPort(hr).couches[id] = couche;
	});
	ecrireRegistrePort(hr, cr, cheminBlobRegistrePort(cr, "sha256:" + sha256(config)), config);
	ecrireRegistrePort(hr, cr, cheminBlobRegistrePort(cr, digest), manif);
	ecrireRegistrePort(hr, cr, cheminDepotRegistrePort(cr, depot) + "/_manifests/revisions/sha256/" + digest.substring(7) + "/link", digest + "\n");
	if (tag){
		ecrireRegistrePort(hr, cr, cheminDepotRegistrePort(cr, depot) + "/_manifests/tags/" + tag + "/current/link", digest + "\n");
		ecrireRegistrePort(hr, cr, cheminDepotRegistrePort(cr, depot) + "/_manifests/tags/" + tag + "/index/sha256/" + digest.substring(7) + "/link", digest + "\n");
	}
	ajouterJournalPort(hr, cr, "stderr", "time=\"" + dateIsoPort(maintenantPort(hr)).substring(0, 23) + "Z\" level=info msg=\"response completed\" go.version=go1.20.8 http.request.method=PUT http.request.uri=\"/v2/" + depot + "/manifests/" + (tag || digest) + "\" http.response.status=201");
	return { digest: digest, couches: pousses, taille: octetsPort(manif) };
}
/* Tirer une image d'un registre : l'image (config lue, couches retrouvées) ou null. */
function imageDepuisRegistrePort(hr, cr, depot, ref){
	var m = manifesteRegistrePort(hr, cr, depot, ref);
	if (!m) return null;
	if (m.json.manifests) return { liste: m.json, digest: m.digest };
	var cfg = lireFichierConteneurPort(hr, cr, cheminBlobRegistrePort(cr, m.json.config.digest));
	if (!cfg) return null;
	var j = JSON.parse(cfg);
	var img = { couches: (j.rootfs.diff_ids || []).map(function(d){ return d.replace(/^sha256:/, ""); }), historique: j.history || [], config: j.config || {}, cree: j.created, os: j.os || "linux", arch: j.architecture || "amd64", origine: "registre" };
	img.id = sha256(configJsonPort(img));
	return { image: img, digest: m.digest, manifeste: m.json };
}
/* La réponse du registre à une requête HTTP. */
function repondreRegistrePort(h, c, port, req){
	var prog = c.programme, chemin = String(req.chemin || "/").split("?")[0];
	var entetes = { "Content-Type": "application/json; charset=utf-8", "Docker-Distribution-Api-Version": "registry/2.0", "X-Content-Type-Options": "nosniff" };
	var auth = req.auth;
	if (!auth && req.entetes && req.entetes.authorization){ var mm = /^Basic\s+(\S+)/i.exec(req.entetes.authorization); if (mm) auth = decoderBase64(mm[1]); }
	var log = function(code){ ajouterJournalPort(h, c, "stderr", req.source + " - - [" + dateAccesPort(h) + "] \"" + req.methode + " " + chemin + " HTTP/1.1\" " + code + " " + (code === 401 ? 87 : 2) + " \"\" \"" + (req.agent || "curl/8.14.1") + "\""); };
	if (chemin === "/" ){ log(200); return { code: 200, corps: "", entetes: { "Cache-Control": "no-cache" } }; }
	if (chemin.indexOf("/v2") !== 0){ log(404); return { code: 404, corps: "404 page not found\n", entetes: { "Content-Type": "text/plain; charset=utf-8" } }; }
	var a = authRegistrePort(h, c, auth);
	if (!a.ok){
		if (a.raison !== "manquant") ajouterJournalPort(h, c, "stderr", "time=\"" + dateIsoPort(maintenantPort(h)).substring(0, 23) + "Z\" level=warning msg=\"error authorizing context: basic authentication challenge for realm \\\"" + prog.auth.realm + "\\\": invalid authorization credential\"");
		entetes["Www-Authenticate"] = "Basic realm=\"" + prog.auth.realm + "\"";
		log(401);
		return { code: 401, corps: "{\"errors\":[{\"code\":\"UNAUTHORIZED\",\"message\":\"authentication required\",\"detail\":null}]}\n", entetes: entetes };
	}
	var m;
	if (chemin === "/v2/" || chemin === "/v2"){ log(200); return { code: 200, corps: "{}", entetes: entetes }; }
	if (chemin === "/v2/_catalog"){ log(200); return { code: 200, corps: JSON.stringify({ repositories: depotsRegistrePort(h, c) }) + "\n", entetes: entetes }; }
	if ((m = /^\/v2\/(.+)\/tags\/list$/.exec(chemin))){
		var tags = tagsRegistrePort(h, c, m[1]);
		if (!tags.length && depotsRegistrePort(h, c).indexOf(m[1]) === -1){ log(404); return { code: 404, corps: "{\"errors\":[{\"code\":\"NAME_UNKNOWN\",\"message\":\"repository name not known to registry\",\"detail\":{\"name\":\"" + m[1] + "\"}}]}\n", entetes: entetes }; }
		log(200); return { code: 200, corps: JSON.stringify({ name: m[1], tags: tags }) + "\n", entetes: entetes };
	}
	if ((m = /^\/v2\/(.+)\/manifests\/(.+)$/.exec(chemin))){
		var mf = manifesteRegistrePort(h, c, m[1], m[2]);
		if (!mf){ log(404); return { code: 404, corps: "{\"errors\":[{\"code\":\"MANIFEST_UNKNOWN\",\"message\":\"manifest unknown\",\"detail\":{\"Tag\":\"" + m[2] + "\"}}]}\n", entetes: entetes }; }
		entetes["Docker-Content-Digest"] = mf.digest; entetes["Content-Type"] = mf.json.mediaType || "application/vnd.oci.image.manifest.v1+json";
		log(200); return { code: 200, corps: mf.texte, entetes: entetes };
	}
	log(404);
	return { code: 404, corps: "404 page not found\n", entetes: { "Content-Type": "text/plain; charset=utf-8" } };
}

/* ================================================================== */
/* Python : les scripts de l'école, http.server                          */
/* ================================================================== */

/* Ce qu'un script fait à son chargement (au niveau du module) : imports, os.environ["X"], open(...). */
function analyserPythonPort(texte){
	var l = String(texte || "").split("\n"), etapes = [];
	l.forEach(function(ligne, i){
		if (/^\s/.test(ligne) || /^\s*#/.test(ligne)) return;
		var m;
		if ((m = /^import\s+([\w.]+)/.exec(ligne)) || (m = /^from\s+([\w.]+)\s+import/.exec(ligne))) etapes.push({ t: "import", module: m[1].split(".")[0], ligne: i + 1, texte: ligne });
		var re = /os\.environ\[\s*["'](\w+)["']\s*\]/g, x;
		while ((x = re.exec(ligne))) etapes.push({ t: "env", nom: x[1], ligne: i + 1, texte: ligne, col: x.index });
		if ((m = /open\(\s*["']([^"']+)["']\s*,\s*["'][wa]/.exec(ligne))) etapes.push({ t: "ecrire", chemin: m[1], ligne: i + 1, texte: ligne });
		else if ((m = /open\(\s*["']([^"']+)["']\s*\)/.exec(ligne))) etapes.push({ t: "lire", chemin: m[1], ligne: i + 1, texte: ligne });
		if ((m = /secret\(\s*["'](\w+)["']\s*\)/.exec(ligne)) && !/^def /.test(ligne)) etapes.push({ t: "secret", nom: m[1], ligne: i + 1, texte: ligne });
	});
	var genre = /ecole-port-aube/.test(texte) ? "ecole" : (/serveur-cargaison/.test(texte) ? "cargaison" : (/convoi-port-aube/.test(texte) ? "convoi" : (/carto-port-aube/.test(texte) ? "carto" : (/serve_forever|HTTPServer/.test(texte) ? "http" : "script"))));
	var port = /int\(os\.environ\.get\(\s*["']PORT["']\s*,\s*["']?(\d+)/.exec(texte);
	return { etapes: etapes, genre: genre, portDefaut: port ? +port[1] : 8000, prints: (texte.match(/^print\((["'])(.*)\1\)\s*$/mg) || []).map(function(p){ return p.replace(/^print\((["'])/, "").replace(/(["'])\)\s*$/, ""); }) };
}
function tracebackPort(fichier, ligne, texte, type, message){
	return "Traceback (most recent call last):\n  File \"" + fichier + "\", line " + ligne + ", in <module>\n    " + String(texte).trim() + "\n" + type + ": " + message + "\n";
}
function pythonProgrammePort(h, c, ctx, args, argv){
	var i = 0;
	while (i < args.length && /^-[uBOsE]+$/.test(args[i])) i++;
	if (args[i] === "-m" && args[i + 1] === "http.server"){
		var reste = args.slice(i + 2), port = 8000, dossier = ctx.cwd;
		for (var k = 0; k < reste.length; k++){ if (reste[k] === "--directory" || reste[k] === "-d") dossier = absoluPort(ctx, reste[++k]); else if (/^\d+$/.test(reste[k])) port = +reste[k]; }
		return { type: "python-app", genre: "statique", comm: "python", dossier: dossier, ecoutes: [port], uid: ctx.user.uid, memoire: 17 * 1048576, codeArret: 0, croissance: 0,
			journalApres: [["stdout", "Serving HTTP on 0.0.0.0 port " + port + " (http://0.0.0.0:" + port + "/) ..."]], processus: [{ cmd: argv.join(" "), user: ctx.user.uid }] };
	}
	if (args[i] === "-c") return { fin: true, code: 0, sortie: ((/print\((["'])(.*)\1\)/.exec(args[i + 1] || "") || [])[2] || "") + "\n" };
	if (args[i] === "--version" || args[i] === "-V") return { fin: true, code: 0, sortie: "Python 3.12.7\n" };
	if (i >= args.length){
		if (c.config.OpenStdin) return { type: "python-repl", comm: "python3", processus: [{ cmd: argv.join(" "), user: ctx.user.uid }], memoire: 9 * 1048576, ecoutes: [] };
		return { fin: true, code: 0 };
	}
	var script = args[i], chemin = absoluPort(ctx, script);
	var texte = lireTextePort(ctx, chemin);
	if (texte === null) return { fin: true, code: 2, erreurs: (nomDe(argv[0]) || "python") + ": can't open file '" + chemin + "': [Errno 2] No such file or directory\n", type: "python" };
	var a = analyserPythonPort(texte);
	for (var e = 0; e < a.etapes.length; e++){
		var et = a.etapes[e];
		if (et.t === "import" && MODULES_STANDARD_PORT.indexOf(et.module) === -1 && !moduleInstallePort(h, c, et.module))
			return { fin: true, code: 1, erreurs: tracebackPort(chemin, et.ligne, et.texte, "ModuleNotFoundError", "No module named '" + et.module + "'"), type: "python" };
		if (et.t === "env" && !ctx.env.hasOwnProperty(et.nom))
			return { fin: true, code: 1, erreurs: "Traceback (most recent call last):\n  File \"" + chemin + "\", line " + et.ligne + ", in <module>\n    " + et.texte.trim() + "\n  File \"<frozen os>\", line 714, in __getitem__\nKeyError: '" + et.nom + "'\n", type: "python" };
		if (et.t === "lire" && lireTextePort(ctx, et.chemin) === null)
			return { fin: true, code: 1, erreurs: tracebackPort(chemin, et.ligne, et.texte, entreeConteneurPort(h, c, absoluPort(ctx, et.chemin)) ? "PermissionError" : "FileNotFoundError", "[Errno " + (entreeConteneurPort(h, c, absoluPort(ctx, et.chemin)) ? "13] Permission denied" : "2] No such file or directory") + ": '" + et.chemin + "'"), type: "python" };
		if (et.t === "secret" && ctx.env[et.nom + "_FILE"] && lireTextePort(ctx, ctx.env[et.nom + "_FILE"]) === null)
			return { fin: true, code: 1, erreurs: "Traceback (most recent call last):\n  File \"" + chemin + "\", line " + et.ligne + ", in <module>\n    " + et.texte.trim() + "\n  File \"" + chemin + "\", line 12, in secret\n    with open(fichier) as f:\n         ^^^^^^^^^^^^^\nFileNotFoundError: [Errno 2] No such file or directory: '" + ctx.env[et.nom + "_FILE"] + "'\n", type: "python" };
		if (et.t === "ecrire"){
			try { var cible = absoluPort(ctx, et.chemin), ex = resoudreCheminPort(ctx.fs, cible, true); var x = ex.e && ex.e.t === "f" ? copieJson(ex.e) : { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid }; delete x.hote; x.c = "1\n"; x.s = 2; ecrireEntreePort(ctx.fs, ctx, ex.chemin, x); }
			catch (er){ if (!(er instanceof ErreurFsPort)) throw er; return { fin: true, code: 1, erreurs: tracebackPort(chemin, et.ligne, et.texte, er.code === "EROFS" ? "OSError" : "PermissionError", "[Errno " + (er.code === "EROFS" ? "30] Read-only file system" : "13] Permission denied") + ": '" + et.chemin + "'"), type: "python" }; }
		}
	}
	if (a.genre === "script") return { fin: true, code: 0, sortie: a.prints.join("\n") + (a.prints.length ? "\n" : ""), type: "python" };
	var portApp = +(ctx.env.PORT || a.portDefaut);
	var annonce = { ecole: "Gouvernail 3.0.2 : l'appli de l'école écoute sur 0.0.0.0:" + portApp, cargaison: "La caisse du quai écoute sur 0.0.0.0:" + portApp, convoi: "Le convoi écoute sur 0.0.0.0:" + portApp, carto: "La carte des courants écoute sur 0.0.0.0:" + portApp, http: "Serving HTTP on 0.0.0.0 port " + portApp }[a.genre];
	return { type: "python-app", genre: a.genre, comm: "python", script: chemin, ecoutes: [portApp], uid: ctx.user.uid, memoire: (a.genre === "ecole" ? 31 : 19) * 1048576, memoireMax: 58 * 1048576, croissance: a.genre === "ecole" ? 1.5 * 1048576 : 0, codeArret: 0, requetes: 0, env: copieJson(ctx.env),
		journalApres: [["stderr", " * " + annonce]], processus: [{ cmd: argv.join(" "), user: ctx.user.uid }] };
}
/* Lire un secret comme l'appli : NOM_FILE (un fichier, /run/secrets/...) ou NOM. */
function secretAppPort(h, c, env, nom){
	if (env[nom + "_FILE"]){ var t = lireFichierConteneurPort(h, c, env[nom + "_FILE"]); return t === null ? null : t.trim(); }
	return env.hasOwnProperty(nom) ? env[nom] : null;
}
function etatBaseAppPort(h, c, env){
	var host = env.DB_HOST || "base", r = connexionPgPort(h, c, host, +(env.DB_PORT || 5432), env.DB_USER || "ecole", secretAppPort(h, c, env, "DB_PASSWORD"), env.DB_NAME || "ecole", false);
	return r;
}
function repondrePythonPort(h, c, port, req){
	var prog = c.programme, env = prog.env || {}, chemin = String(req.chemin || "/").split("?")[0];
	var log = function(code){ ajouterJournalPort(h, c, "stderr", req.source + " - - [" + (function(){ var d = new Date(maintenantPort(h) - DECALAGE_HISTOIRE * 3600000); return deuxChiffres(d.getDate()) + "/" + MOIS_EN[d.getMonth()] + "/" + d.getFullYear() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); })() + "] \"" + req.methode + " " + chemin + " HTTP/1.1\" " + code + " -"); };
	prog.requetes = (prog.requetes || 0) + 1;
	var rep;
	if (prog.genre === "statique"){
		var f = cheminNormal(prog.dossier + "/" + chemin), e = entreeConteneurPort(h, c, f);
		if (e && e.t === "d"){
			var idx = entreeConteneurPort(h, c, f + "/index.html");
			if (idx) rep = { code: 200, corps: idx.c || "", entetes: { "Content-Type": "text/html" } };
			else { var noms = []; try { noms = listerPort(fsPort(h, c), f); } catch (x){} rep = { code: 200, corps: "<!DOCTYPE HTML>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Directory listing for " + chemin + "</title>\n</head>\n<body>\n<h1>Directory listing for " + chemin + "</h1>\n<hr>\n<ul>\n" + noms.map(function(n){ return "<li><a href=\"" + n + "\">" + n + "</a></li>"; }).join("\n") + "\n</ul>\n<hr>\n</body>\n</html>\n", entetes: { "Content-Type": "text/html; charset=utf-8" } }; }
		} else if (e) rep = { code: 200, corps: e.c || "" };
		else rep = { code: 404, corps: "<!DOCTYPE HTML>\n<html lang=\"en\">\n    <head>\n        <meta charset=\"utf-8\">\n        <title>Error response</title>\n    </head>\n    <body>\n        <h1>Error response</h1>\n        <p>Error code: 404</p>\n        <p>Message: File not found.</p>\n    </body>\n</html>\n", entetes: { "Content-Type": "text/html;charset=utf-8" } };
		rep.serveur = "SimpleHTTP/0.6 Python/3.12.7";
		log(rep.code);
		return rep;
	}
	if (prog.genre === "cargaison"){
		rep = chemin === "/" ? { code: 200, corps: "Caisse ouverte\n" } : { code: 404, corps: "Rien à cet endroit du quai.\n" };
	} else if (prog.genre === "carto"){
		rep = chemin === "/" ? { code: 200, corps: "Carte des courants de la baie : 42 relevés, prête.\n" } : (chemin === "/sante" ? { code: 200, corps: "ok\n" } : { code: 404, corps: "Not Found\n" });
	} else if (prog.genre === "convoi"){
		var b = etatBaseAppPort(h, c, env);
		if (b.erreur){ ajouterJournalPort(h, c, "stderr", "amarre_pg.OperationalError: " + b.erreur.split("\n")[0]); rep = { code: 500, corps: "Erreur : la base ne répond pas (" + b.erreur.split("\n")[0] + ")\n" }; }
		else {
			var t = lireTablePort(b.h, b.c, b.base, "cargaisons");
			rep = t ? { code: 200, corps: t.lignes.length + " cargaisons\n" } : { code: 500, corps: "Erreur : la table cargaisons n'existe pas (le registre n'a pas été initialisé).\n" };
		}
	} else if (prog.genre === "ecole"){
		var base = etatBaseAppPort(h, c, env);
		var cache = connexionRedisPort(h, c, env.CACHE_HOST || "cache", +(env.CACHE_PORT || 6379), secretAppPort(h, c, env, "CACHE_PASSWORD"));
		var etatCache = cache.erreurPy ? "injoignable" : (cache.refus ? "refuse" : "ok");
		if (!cache.erreurPy && !cache.refus){ var pc = cache.c.programme; pc.cles.visites = String((+pc.cles.visites || 0) + 1); pc.donnees += 180; }
		var etatBase = base.erreur ? (/password|role/.test(base.erreur) ? "refusee" : "injoignable") : "ok";
		if (base.erreur) ajouterJournalPort(h, c, "stderr", "amarre_pg.OperationalError: " + base.erreur.split("\n")[0]);
		if (cache.erreurPy) ajouterJournalPort(h, c, "stderr", "amarre_cache.ConnectionError: " + cache.erreurPy);
		if (!base.erreur && !lireTablePort(base.h, base.c, base.base, "inscriptions")) ecrireTablePort(base.h, base.c, base.base, "inscriptions", { colonnes: ["id", "prenom", "quand"], lignes: [] });
		var version = env.VERSION || "1.0";
		if (chemin === "/sante"){
			var corps = JSON.stringify({ etat: base.erreur ? "degrade" : "ok", base: etatBase, cache: etatCache, version: version });
			rep = { code: base.erreur ? 503 : 200, corps: corps + "\n", entetes: { "Content-Type": "application/json" } };
		} else if (chemin === "/version") rep = { code: 200, corps: version + "\n" };
		else if (chemin === "/inscriptions"){
			if (base.erreur) rep = { code: 503, corps: "{\"erreur\": \"base " + etatBase + "\"}\n", entetes: { "Content-Type": "application/json" } };
			else {
				var tab = lireTablePort(base.h, base.c, base.base, "inscriptions");
				if (req.methode === "POST"){ tab.lignes.push([tab.lignes.length + 1, (/prenom=(\w+)/.exec(req.corps || "") || [])[1] || "anonyme", dateIsoPort(maintenantPort(h))]); ecrireTablePort(base.h, base.c, base.base, "inscriptions", tab); }
				rep = { code: req.methode === "POST" ? 201 : 200, corps: JSON.stringify({ inscriptions: tab.lignes.length }) + "\n", entetes: { "Content-Type": "application/json" } };
			}
		} else if (chemin === "/") rep = { code: 200, corps: "<!doctype html>\n<html lang=\"fr\"><head><meta charset=\"utf-8\"><title>Cybersup, le Grand Port</title></head>\n<body><h1>Cybersup, le Grand Port</h1><p>Inscriptions ouvertes. Version " + version + ".</p></body></html>\n", entetes: { "Content-Type": "text/html; charset=utf-8" } };
		else rep = { code: 404, corps: "<!doctype html>\n<title>404 Not Found</title>\n<h1>Not Found</h1>\n", entetes: { "Content-Type": "text/html; charset=utf-8" } };
	} else rep = { code: 200, corps: "OK\n" };
	rep.serveur = rep.serveur || "Gouvernail/3.0.2 Python/3.12.7";
	log(rep.code);
	return rep;
}
/* Le binaire du phare (construit en plusieurs étapes) : un petit serveur sur 8080. */
function phareProgrammePort(h, c, ctx, p){
	if (!p.e.statique && !entreeConteneurPort(h, c, "/lib64/ld-linux-x86-64.so.2") && !entreeConteneurPort(h, c, "/usr/lib64/ld-linux-x86-64.so.2"))
		return { fin: true, code: 255, erreurs: "exec " + p.chemin + ": no such file or directory\n", type: "phare" };
	var port = +(ctx.env.PHARE_PORT || 8080);
	return { type: "phare", comm: "phare", ecoutes: [port], uid: ctx.user.uid, memoire: 1.1 * 1048576, codeArret: 0, journalApres: [["stdout", "phare : le faisceau balaie la baie sur le port " + port]], processus: [{ cmd: p.chemin, user: ctx.user.uid }] };
}
/* Le répartiteur HTTP : selon le programme du conteneur. */
function repondreHttpPort(h, c, port, req){
	var prog = c.programme || {};
	if ((c.ecoutes || []).indexOf(port) === -1) return null;
	if (prog.type === "nginx") return repondreNginxPort(h, c, port, req);
	if (prog.type === "registry") return repondreRegistrePort(h, c, port, req);
	if (prog.type === "python-app") return repondrePythonPort(h, c, port, req);
	if (prog.type === "phare") return String(req.chemin).split("?")[0] === "/sante" ? { code: 200, corps: "ok\n" } : { code: 200, corps: "Le phare veille sur la baie.\n", serveur: "phare/1.0" };
	return null;
}

/* ================================================================== */
/* Les commandes de programmes dans le shell d'un conteneur             */
/* ================================================================== */

/* Les paquets connus du continent : taille installée, programmes ajoutés. */
var PAQUETS_APT_PORT = {
	curl: { taille: 5800000, bin: ["/usr/bin/curl"], x: "curl" }, wget: { taille: 3600000, bin: ["/usr/bin/wget"], x: "wget" }, "ca-certificates": { taille: 410000, bin: [] },
	procps: { taille: 2100000, bin: ["/usr/bin/ps", "/usr/bin/top", "/usr/bin/free", "/usr/bin/pgrep", "/usr/bin/kill"], x: "ps" }, iputils: { taille: 280000, bin: ["/usr/bin/ping"], x: "ping" },
	"iputils-ping": { taille: 280000, bin: ["/usr/bin/ping"], x: "ping" }, iproute2: { taille: 3300000, bin: ["/usr/sbin/ip", "/usr/bin/ss"], x: "ip" }, gcc: { taille: 72000000, bin: ["/usr/bin/gcc", "/usr/bin/cc"], x: "gcc" },
	make: { taille: 1600000, bin: ["/usr/bin/make"], x: "make" }, "build-essential": { taille: 210000000, bin: ["/usr/bin/gcc", "/usr/bin/cc", "/usr/bin/make", "/usr/bin/g++"], x: "gcc" },
	"libc6-dev": { taille: 21000000, bin: [] }, git: { taille: 38000000, bin: ["/usr/bin/git"], x: "git" }, vim: { taille: 39000000, bin: ["/usr/bin/vim"], x: "vim" }, nano: { taille: 2700000, bin: ["/usr/bin/nano"], x: "nano" },
	netcat: { taille: 110000, bin: ["/usr/bin/nc"], x: "nc" }, "netcat-openbsd": { taille: 110000, bin: ["/usr/bin/nc"], x: "nc" }, "dnsutils": { taille: 4900000, bin: ["/usr/bin/dig", "/usr/bin/nslookup"], x: "nslookup" },
	python3: { taille: 23000000, bin: ["/usr/bin/python3"], x: "python" }, "python3-pip": { taille: 16000000, bin: ["/usr/bin/pip3"], x: "pip" }, tini: { taille: 800000, bin: ["/usr/bin/tini"], x: "tini" },
	jq: { taille: 1100000, bin: ["/usr/bin/jq"], x: "jq" }, tzdata: { taille: 3200000, bin: [] }, libpq5: { taille: 900000, bin: [] }, "libpq-dev": { taille: 1600000, bin: [] }, "postgresql-client": { taille: 7200000, bin: ["/usr/bin/psql", "/usr/bin/pg_isready"], x: "psql" }
};
var RECOMMANDES_APT_PORT = { curl: 2400000, gcc: 23000000, git: 21000000, vim: 7000000, "build-essential": 40000000, python3: 9000000, "python3-pip": 36000000 };
var PAQUETS_PIP_PORT = {
	"gouvernail": { taille: 1300000, module: "gouvernail", version: "3.0.2" }, "amarre-pg": { taille: 3100000, module: "amarre_pg", version: "2.9.9" }, "amarre-cache": { taille: 1100000, module: "amarre_cache", version: "5.0.8" },
	"boussole": { taille: 38000000, module: "boussole", version: "4.1.0" }, "houle": { taille: 61000000, module: "houle", version: "2.1.3" }, "maree": { taille: 420000, module: "maree", version: "1.0.4" },
	"gunicorn": { taille: 900000, module: "gunicorn", version: "23.0.0" }, "requests": { taille: 600000, module: "requests", version: "2.32.3" }
};
var PAQUETS_APK_PORT = { curl: { taille: 2600000, bin: ["/usr/bin/curl"], x: "curl" }, bash: { taille: 1400000, bin: ["/bin/bash"], x: "bash" }, gcc: { taille: 54000000, bin: ["/usr/bin/gcc"], x: "gcc" }, make: { taille: 290000, bin: ["/usr/bin/make"], x: "make" },
	"musl-dev": { taille: 4000000, bin: [] }, "ca-certificates": { taille: 690000, bin: [] }, python3: { taille: 48000000, bin: ["/usr/bin/python3"], x: "python" }, "py3-pip": { taille: 11000000, bin: ["/usr/bin/pip"], x: "pip" },
	tini: { taille: 30000, bin: ["/sbin/tini"], x: "tini" }, jq: { taille: 900000, bin: ["/usr/bin/jq"], x: "jq" }, "postgresql-client": { taille: 5100000, bin: ["/usr/bin/psql", "/usr/bin/pg_isready"], x: "psql" }, "build-base": { taille: 180000000, bin: ["/usr/bin/gcc", "/usr/bin/make"], x: "gcc" },
	tzdata: { taille: 1600000, bin: [] }, htop: { taille: 300000, bin: ["/usr/bin/htop"], x: "htop" } };

function poserFichierCtPort(ctx, chemin, e){
	var parts = morceauxChemin(chemin), cur = "";
	for (var i = 0; i < parts.length - 1; i++){ cur += "/" + parts[i]; if (!entreeBrutePort(ctx.fs, cur)) ecrireEntreePort(ctx.fs, ctx, cur, { t: "d", m: "rwxr-xr-x", u: ctx.user.uid, g: ctx.user.gid }); }
	ecrireEntreePort(ctx.fs, ctx, chemin, e);
}
/* Le réseau vers le continent depuis un RUN ou un conteneur. */
function continentJoignablePort(ctx){
	if (ctx.h === "douane") return false;
	if (ctx.build) return true;
	if (ctx.c.hote && ctx.c.hote.reseau === "none") return false;
	return !Object.keys(ctx.c.reseaux || {}).every(function(k){ var r = reseauPort(ctx.h, k); return r && r.interne; });
}
COMMANDES_CONTENEUR_PORT["apt-get"] = function(ctx, args){
	var o = lireOptionsCourtesPort(args), action = o.reste[0], paquets = o.reste.slice(1);
	if (!action){ ctx.sortir("apt 2.6.1 (amd64)\nUsage: apt-get [options] command\n"); return 1; }
	if (ctx.user.uid !== 0){ ctx.erreur("E: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/\n"); return 100; }
	var ro = ctx.c.hote && ctx.c.hote.readOnly && !ctx.c.couchesBuild;
	if (action === "update"){
		if (!continentJoignablePort(ctx)){ ctx.sortir("Ign:1 http://deb.debian.org/debian bookworm InRelease\nErr:1 http://deb.debian.org/debian bookworm InRelease\n  Temporary failure resolving 'deb.debian.org'\n"); ctx.erreur("W: Failed to fetch http://deb.debian.org/debian/dists/bookworm/InRelease  Temporary failure resolving 'deb.debian.org'\nW: Some index files failed to download. They have been ignored, or old ones used instead.\n"); return 0; }
		if (ro){ ctx.erreur("E: List directory /var/lib/apt/lists/partial is missing. - Acquire (30: Read-only file system)\n"); return 100; }
		poserFichierCtPort(ctx, "/var/lib/apt/lists/deb.debian.org_debian_dists_bookworm_main_binary-amd64_Packages.lz4", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: 37400000 });
		poserFichierCtPort(ctx, "/var/lib/apt/lists/deb.debian.org_debian_dists_bookworm-updates_main_binary-amd64_Packages.lz4", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: 1200000 });
		poserFichierCtPort(ctx, "/var/lib/apt/lists/deb.debian.org_debian-security_dists_bookworm-security_main_binary-amd64_Packages.lz4", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: 2600000 });
		poserFichierCtPort(ctx, "/var/lib/apt/lists/lock", { t: "f", m: "rw-r-----", u: 0, g: 0, s: 0, c: "" });
		ctx.sortir("Get:1 http://deb.debian.org/debian bookworm InRelease [151 kB]\nGet:2 http://deb.debian.org/debian bookworm-updates InRelease [55.4 kB]\nGet:3 http://deb.debian.org/debian-security bookworm-security InRelease [48.0 kB]\nGet:4 http://deb.debian.org/debian bookworm/main amd64 Packages [8792 kB]\nGet:5 http://deb.debian.org/debian bookworm-updates/main amd64 Packages [8856 B]\nGet:6 http://deb.debian.org/debian-security bookworm-security/main amd64 Packages [215 kB]\nFetched 9270 kB in 1s (7023 kB/s)\nReading package lists...\n");
		return 0;
	}
	if (action === "install"){
		var listes = entreeBrutePort(ctx.fs, "/var/lib/apt/lists/lock");
		var inconnus = paquets.filter(function(p){ return !PAQUETS_APT_PORT[p.split("=")[0]]; });
		if (!listes){ ctx.sortir("Reading package lists...\nBuilding dependency tree...\nReading state information...\n"); ctx.erreur("E: Unable to locate package " + paquets[0] + "\n"); return 100; }
		if (inconnus.length){ ctx.sortir("Reading package lists...\nBuilding dependency tree...\nReading state information...\n"); ctx.erreur("E: Unable to locate package " + inconnus[0] + "\n"); return 100; }
		if (!o.o.y && !o.o.yes && !o.o["assume-yes"] && !ctx.stdin){ ctx.sortir("Reading package lists...\nBuilding dependency tree...\nReading state information...\nThe following NEW packages will be installed:\n  " + paquets.join(" ") + "\nDo you want to continue? [Y/n] Abort.\n"); return 1; }
		if (ro){ ctx.erreur("E: Could not open lock file /var/lib/dpkg/lock-frontend - open (30: Read-only file system)\n"); return 100; }
		var sans = !!o.o["no-install-recommends"], total = 0;
		paquets.forEach(function(p){
			var nom = p.split("=")[0], def = PAQUETS_APT_PORT[nom], t = def.taille + (sans ? 0 : (RECOMMANDES_APT_PORT[nom] || Math.round(def.taille * 0.15)));
			total += t;
			def.bin.forEach(function(b){ poserFichierCtPort(ctx, b, xPort(Math.round(t * 0.08) + 1000, def.x)); });
			poserFichierCtPort(ctx, "/usr/share/doc/" + nom + "/copyright", tPort("Paquet " + nom + " (Debian).\n"));
			poserFichierCtPort(ctx, "/usr/lib/x86_64-linux-gnu/" + nom + ".paquet", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: t });
		});
		ctx.sortir("Reading package lists...\nBuilding dependency tree...\nReading state information...\nThe following NEW packages will be installed:\n  " + paquets.map(function(p){ return p.split("=")[0]; }).join(" ") + "\n0 upgraded, " + paquets.length + " newly installed, 0 to remove and 0 not upgraded.\nNeed to get " + tailleDockerPort(total * 0.35) + " of archives.\nAfter this operation, " + tailleDockerPort(total) + " of additional disk space will be used.\n" + paquets.map(function(p, i){ return "Get:" + (i + 1) + " http://deb.debian.org/debian bookworm/main amd64 " + p.split("=")[0] + " amd64 [" + Math.round(PAQUETS_APT_PORT[p.split("=")[0]].taille / 3000) + " kB]"; }).join("\n") + "\ndebconf: delaying package configuration, since apt-utils is not installed\n" + paquets.map(function(p){ return "Setting up " + p.split("=")[0] + " ..."; }).join("\n") + "\n");
		return 0;
	}
	if (action === "clean" || action === "autoclean"){ return 0; }
	if (action === "remove" || action === "purge"){ paquets.forEach(function(p){ var def = PAQUETS_APT_PORT[p]; if (def) def.bin.forEach(function(b){ try { supprimerEntreePort(ctx.fs, ctx, b, false); } catch (e){} }); }); ctx.sortir("Reading package lists...\nBuilding dependency tree...\n0 upgraded, 0 newly installed, " + paquets.length + " to remove and 0 not upgraded.\n"); return 0; }
	if (action === "upgrade"){ ctx.sortir("Reading package lists...\nBuilding dependency tree...\nReading state information...\nCalculating upgrade...\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n"); return 0; }
	ctx.erreur("E: Invalid operation " + action + "\n"); return 100;
};
COMMANDES_CONTENEUR_PORT.apt = COMMANDES_CONTENEUR_PORT["apt-get"];
COMMANDES_CONTENEUR_PORT.apk = function(ctx, args){
	var o = lireOptionsCourtesPort(args), action = o.reste[0], paquets = o.reste.slice(1);
	if (ctx.user.uid !== 0){ ctx.erreur("ERROR: Unable to lock database: Permission denied\nERROR: Failed to open apk database: Permission denied\n"); return 99; }
	if (action === "update"){ if (!continentJoignablePort(ctx)){ ctx.erreur("WARNING: updating and opening https://continent.lan/alpine/v3.20/main: temporary error (try again later)\n"); return 1; } poserFichierCtPort(ctx, "/var/cache/apk/APKINDEX.main.tar.gz", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: 1600000 }); ctx.sortir("fetch https://continent.lan/alpine/v3.20/main/x86_64/APKINDEX.tar.gz\nv3.20.3-196 [https://continent.lan/alpine/v3.20/main]\nOK: 24161 distinct packages available\n"); return 0; }
	if (action === "add"){
		var inconnus = paquets.filter(function(p){ return !PAQUETS_APK_PORT[p.split("=")[0]]; });
		if (!continentJoignablePort(ctx)){ ctx.erreur("WARNING: fetching https://continent.lan/alpine/v3.20/main: temporary error (try again later)\nERROR: unable to select packages:\n  " + paquets[0] + " (no such package):\n    required by: world[" + paquets[0] + "]\n"); return 1; }
		if (inconnus.length){ ctx.erreur("ERROR: unable to select packages:\n  " + inconnus[0] + " (no such package):\n    required by: world[" + inconnus[0] + "]\n"); return 1; }
		var lignes = [], total = 0;
		if (o.o["no-cache"]) lignes.push("fetch https://continent.lan/alpine/v3.20/main/x86_64/APKINDEX.tar.gz", "fetch https://continent.lan/alpine/v3.20/community/x86_64/APKINDEX.tar.gz");
		paquets.forEach(function(p, i){ var n = p.split("=")[0], d = PAQUETS_APK_PORT[n]; total += d.taille; d.bin.forEach(function(b){ poserFichierCtPort(ctx, b, xPort(Math.round(d.taille * 0.1) + 1000, d.x)); }); poserFichierCtPort(ctx, "/usr/lib/apk-" + n + ".paquet", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: d.taille }); if (!o.o["no-cache"]) poserFichierCtPort(ctx, "/var/cache/apk/" + n + ".apk", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: Math.round(d.taille * 0.4) }); lignes.push("(" + (i + 1) + "/" + paquets.length + ") Installing " + n + " (" + (d.version || "8.10.1-r0") + ")"); });
		lignes.push("Executing busybox-1.36.1-r29.trigger", "OK: " + Math.round(total / 1048576 + 8) + " MiB in " + (16 + paquets.length) + " packages");
		ctx.sortir(lignes.join("\n") + "\n");
		return 0;
	}
	if (action === "del"){ ctx.sortir("OK: 8 MiB in 15 packages\n"); return 0; }
	ctx.sortir("apk-tools 2.14.4, compiled for x86_64.\n\nusage: apk [<OPTIONS>...] COMMAND [<ARGUMENTS>...]\n");
	return action ? 1 : 0;
};
COMMANDES_CONTENEUR_PORT.pip = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "r"), action = o.reste[0];
	if (action === "--version" || args[0] === "--version" || args[0] === "-V"){ ctx.sortir("pip 24.2 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)\n"); return 0; }
	var site = "/usr/local/lib/python3.12/site-packages";
	if (action === "list" || action === "freeze"){
		var noms = []; try { noms = listerPort(ctx.fs, site); } catch (e){}
		var paquets = Object.keys(PAQUETS_PIP_PORT).filter(function(p){ return noms.indexOf(PAQUETS_PIP_PORT[p].module) > -1; });
		if (action === "freeze") ctx.sortir(paquets.map(function(p){ return p + "==" + PAQUETS_PIP_PORT[p].version; }).join("\n") + (paquets.length ? "\n" : ""));
		else ctx.sortir("Package    Version\n---------- -------\n" + ["pip 24.2"].concat(paquets.map(function(p){ return p + " " + PAQUETS_PIP_PORT[p].version; })).map(function(l){ var x = l.split(" "); return completerDroite(x[0], 10) + " " + x[1]; }).join("\n") + "\n");
		return 0;
	}
	if (action !== "install"){ ctx.sortir("\nUsage:   \n  pip <command> [options]\n\nCommands:\n  install                     Install packages.\n  list                        List installed packages.\n  freeze                      Output installed packages in requirements format.\n"); return action ? 1 : 0; }
	var demandes = o.reste.slice(1);
	if (o.o.r){
		var t = lireTextePort(ctx, o.o.r);
		if (t === null){ ctx.erreur("ERROR: Could not open requirements file: [Errno 2] No such file or directory: '" + o.o.r + "'\n"); return 1; }
		t.split("\n").forEach(function(l){ l = l.replace(/#.*/, "").trim(); if (l) demandes.push(l); });
	}
	if (!continentJoignablePort(ctx)){ ctx.sortir("WARNING: Retrying (Retry(total=4, connect=None, read=None, redirect=None, status=None)) after connection broken by 'NewConnectionError': Failed to establish a new connection: [Errno -3] Temporary failure in name resolution\n"); ctx.erreur("ERROR: Could not find a version that satisfies the requirement " + (demandes[0] || "") + " (from versions: none)\nERROR: No matching distribution found for " + (demandes[0] || "") + "\n"); return 1; }
	var lignes = [], installes = [];
	for (var i = 0; i < demandes.length; i++){
		var nom = demandes[i].split(/[=<>~!]/)[0].trim().toLowerCase(), d = PAQUETS_PIP_PORT[nom];
		if (!d){ ctx.sortir(lignes.join("\n") + (lignes.length ? "\n" : "")); ctx.erreur("ERROR: Could not find a version that satisfies the requirement " + demandes[i] + " (from versions: none)\nERROR: No matching distribution found for " + demandes[i] + "\n"); return 1; }
		lignes.push("Collecting " + demandes[i], "  Downloading " + nom.replace(/-/g, "_") + "-" + d.version + "-py3-none-any.whl (" + Math.round(d.taille / 3000) + " kB)");
		installes.push(nom);
		if (ctx.user.uid !== 0 && !o.o.user){ ctx.sortir(lignes.join("\n") + "\n"); ctx.erreur("ERROR: Could not install packages due to an OSError: [Errno 13] Permission denied: '" + site + "/" + d.module + "'\nCheck the permissions.\n\n"); return 1; }
		try {
			poserFichierCtPort(ctx, site + "/" + d.module + "/__init__.py", { t: "f", m: "rw-r--r--", u: 0, g: 0, s: Math.round(d.taille * 0.02), c: "# " + nom + " " + d.version + "\n__version__ = \"" + d.version + "\"\n" });
			poserFichierCtPort(ctx, site + "/" + d.module + "/_coeur.so", { t: "f", m: "rwxr-xr-x", u: 0, g: 0, s: Math.round(d.taille * 0.98) });
			poserFichierCtPort(ctx, site + "/" + nom.replace(/-/g, "_") + "-" + d.version + ".dist-info", { t: "d", m: "rwxr-xr-x", u: 0, g: 0 });
			if (!o.o["no-cache-dir"] && !ctx.env.PIP_NO_CACHE_DIR) poserFichierCtPort(ctx, (ctx.env.HOME || "/root") + "/.cache/pip/http-v2/" + hexDe(nom, 2) + "/" + hexDe(nom + d.version, 40), { t: "f", m: "rw-------", u: ctx.user.uid, g: ctx.user.gid, s: Math.round(d.taille * 0.36) });
		} catch (er){ if (!(er instanceof ErreurFsPort)) throw er; ctx.erreur("ERROR: Could not install packages due to an OSError: [Errno " + (er.code === "EROFS" ? "30] Read-only file system" : "13] Permission denied") + ": '" + site + "/" + d.module + "'\n"); return 1; }
	}
	lignes.push("Installing collected packages: " + installes.join(", "), "Successfully installed " + installes.map(function(n){ return n + "-" + PAQUETS_PIP_PORT[n].version; }).join(" "));
	if (ctx.user.uid === 0 && !ctx.env.PIP_ROOT_USER_ACTION) lignes.push("WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager, possibly rendering your system unusable.It is recommended to use a virtual environment instead: https://pip.pypa.io/warnings/venv. Use the --root-user-action option if you know what you are doing and want to suppress this warning.");
	ctx.sortir(lignes.join("\n") + "\n");
	return 0;
};
COMMANDES_CONTENEUR_PORT.pip3 = COMMANDES_CONTENEUR_PORT.pip;
COMMANDES_CONTENEUR_PORT.python = function(ctx, args){
	if (args[0] === "--version" || args[0] === "-V"){ ctx.sortir("Python 3.12.7\n"); return 0; }
	if (args[0] === "-c"){ var m = /print\((["'])(.*)\1\)/.exec(args[1] || ""); if (m) ctx.sortir(m[2] + "\n"); var im = /import\s+(\w+)/.exec(args[1] || ""); if (im && MODULES_STANDARD_PORT.indexOf(im[1]) === -1 && !moduleInstallePort(ctx.h, ctx.c, im[1])){ ctx.erreur("Traceback (most recent call last):\n  File \"<string>\", line 1, in <module>\nModuleNotFoundError: No module named '" + im[1] + "'\n"); return 1; } return 0; }
	if (args[0] === "-m" && args[1] === "pip") return COMMANDES_CONTENEUR_PORT.pip(ctx, args.slice(2));
	if (!args.length){ ctx.sortir("Python 3.12.7 (main, Oct  1 2024, 22:28:49) [GCC 12.2.0] on linux\nType \"help\", \"copyright\", \"credits\" or \"license\" for more information.\n>>> \n"); return 0; }
	var t = lireTextePort(ctx, args[0]);
	if (t === null){ ctx.erreur("python: can't open file '" + absoluPort(ctx, args[0]) + "': [Errno 2] No such file or directory\n"); return 2; }
	var a = analyserPythonPort(t);
	for (var e = 0; e < a.etapes.length; e++){ var et = a.etapes[e]; if (et.t === "import" && MODULES_STANDARD_PORT.indexOf(et.module) === -1 && !moduleInstallePort(ctx.h, ctx.c, et.module)){ ctx.erreur(tracebackPort(absoluPort(ctx, args[0]), et.ligne, et.texte, "ModuleNotFoundError", "No module named '" + et.module + "'")); return 1; } }
	if (a.prints.length) ctx.sortir(a.prints.join("\n") + "\n");
	if (a.genre !== "script") ctx.erreur(" * le serveur démarrerait ici, au premier plan (lance-le plutôt comme commande du conteneur)\n");
	return 0;
};
COMMANDES_CONTENEUR_PORT.python3 = COMMANDES_CONTENEUR_PORT.python;
COMMANDES_CONTENEUR_PORT.make = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "C"), dossier = o.o.C ? absoluPort(ctx, o.o.C) : ctx.cwd;
	var mk = lireTextePort(ctx, cheminNormal(dossier + "/Makefile"));
	if (mk === null){ ctx.erreur("make: *** No targets specified and no makefile found.  Stop.\n"); return 2; }
	if (!trouverProgrammePort(ctx, "gcc") && !trouverProgrammePort(ctx, "cc")){ ctx.sortir("cc -O2 -static -o phare phare.c\n"); ctx.erreur("make: cc: No such file or directory\nmake: *** [Makefile:4: phare] Error 127\n"); return 2; }
	var cible = (/^(\w[\w.-]*)\s*:/m.exec(mk) || [])[1] || "a.out";
	var source = (/\b(\w+\.c)\b/.exec(mk) || [])[1] || "main.c";
	var cmd = (/^\t(.+)$/m.exec(mk) || [])[1] || "cc -o " + cible + " " + source;
	if (lireTextePort(ctx, cheminNormal(dossier + "/" + source)) === null){ ctx.erreur("make: *** No rule to make target '" + source + "', needed by '" + cible + "'.  Stop.\n"); return 2; }
	ctx.sortir(cmd.replace(/\$\(CC\)/g, "cc").replace(/\$@/g, cible).replace(/\$</g, source).replace(/\$\(CFLAGS\)/g, (/CFLAGS\s*=\s*(.*)/.exec(mk) || [])[1] || "") + "\n");
	var statique = /-static/.test(mk);
	var e = xPort(statique ? 1874320 : 16520, /phare/.test(cible) ? "phare" : "binaire");
	e.statique = statique;
	poserFichierCtPort(ctx, cheminNormal(dossier + "/" + cible), e);
	return 0;
};
COMMANDES_CONTENEUR_PORT.gcc = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "o"), sources = o.reste.filter(function(a){ return /\.c$/.test(a); });
	if (!sources.length){ ctx.erreur("gcc: fatal error: no input files\ncompilation terminated.\n"); return 1; }
	if (lireTextePort(ctx, sources[0]) === null){ ctx.erreur("cc1: fatal error: " + sources[0] + ": No such file or directory\ncompilation terminated.\n"); return 1; }
	var e = xPort(args.indexOf("-static") > -1 ? 1874320 : 16520, /phare/.test(o.o.o || sources[0]) ? "phare" : "binaire");
	e.statique = args.indexOf("-static") > -1;
	poserFichierCtPort(ctx, absoluPort(ctx, o.o.o || "a.out"), e);
	return 0;
};
COMMANDES_CONTENEUR_PORT.cc = COMMANDES_CONTENEUR_PORT.gcc;
COMMANDES_CONTENEUR_PORT.nginx = function(ctx, args){
	if (args.indexOf("-t") > -1 || args.indexOf("-T") > -1){
		var t = lireConfNginxPort(ctx);
		if (t.erreur){ ctx.erreur("nginx: [emerg] " + t.erreur + "\nnginx: configuration file /etc/nginx/nginx.conf test failed\n"); return 1; }
		ctx.erreur("nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful\n");
		return 0;
	}
	if (args.indexOf("-v") > -1){ ctx.erreur("nginx version: nginx/1.27.2\n"); return 0; }
	if (args[0] === "-s" && args[1] === "reload"){
		var c = ctx.c;
		if (!c.programme || c.programme.type !== "nginx"){ ctx.erreur("nginx: [error] open() \"/run/nginx.pid\" failed (2: No such file or directory)\n"); return 1; }
		var conf = lireConfNginxPort(ctx);
		if (conf.erreur){ ajouterJournalPort(ctx.h, c, "stderr", horodatageNginxPort(ctx.h) + " [emerg] 1#1: " + conf.erreur); return 0; }
		c.programme.conf = conf;
		ajouterJournalPort(ctx.h, c, "stderr", horodatageNginxPort(ctx.h) + " [notice] 1#1: signal 1 (SIGHUP) received from 61, reconfiguring");
		return 0;
	}
	ctx.erreur("nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address in use)\n");
	return 1;
};
COMMANDES_CONTENEUR_PORT.pg_isready = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "hpUdt"), hote = o.o.h, port = +(o.o.p || 5432);
	if (!hote){
		var ok = ctx.c.programme && ctx.c.programme.type === "postgres" && enMarchePort(ctx.c) && port === 5432;
		ctx.sortir("/var/run/postgresql:" + port + " - " + (ok ? "accepting connections" : "no response") + "\n");
		return ok ? 0 : 2;
	}
	var r = resoudreDepuisConteneurPort(ctx.h, ctx.c, hote);
	var ec = r && r.ip ? ecouteurPort(ctx.h, ctx.c, r, port) : null;
	var ok2 = ec && ec.conteneur.programme && ec.conteneur.programme.type === "postgres";
	ctx.sortir(hote + ":" + port + " - " + (ok2 ? "accepting connections" : "no response") + "\n");
	return ok2 ? 0 : 2;
};
COMMANDES_CONTENEUR_PORT.psql = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "hpUdcW"), user = o.o.U || ctx.env.PGUSER || (ctx.user.uid === 0 ? "root" : ctx.user.nom), base = o.o.d || o.reste[0] || ctx.env.PGDATABASE || user;
	var local = !o.o.h;
	var cx = connexionPgPort(ctx.h, ctx.c, o.o.h || "localhost", +(o.o.p || 5432), user, ctx.env.PGPASSWORD !== undefined ? ctx.env.PGPASSWORD : null, base, local);
	if (cx.erreur){ ctx.erreur("psql: error: " + cx.erreur + "\n"); return 2; }
	var sql = o.o.c;
	if (!sql){ ctx.sortir("psql (16.4)\nType \"help\" for help.\n\n" + base + "=# \n(le petit psql du jeu lit une seule commande : psql -c \"...\")\n"); return 0; }
	if (/^\\dt/.test(sql)){
		var tables = []; try { tables = listerPort(fsPort(cx.h, cx.c), cheminTablePort(cx.c, base, "x").replace(/\/x\.tbl$/, "")).filter(function(n){ return /\.tbl$/.test(n); }).map(function(n){ return n.replace(/\.tbl$/, ""); }); } catch (e){}
		if (!tables.length){ ctx.sortir("Did not find any relations.\n"); return 0; }
		ctx.sortir("          List of relations\n Schema |    Name     | Type  | Owner \n--------+-------------+-------+-------\n" + tables.map(function(t){ return " public | " + completerDroite(t, 11) + " | table | " + user; }).join("\n") + "\n(" + tables.length + " row" + (tables.length > 1 ? "s" : "") + ")\n\n");
		return 0;
	}
	if (/^\\l/.test(sql)){ var bases = basesPgPort(cx.h, cx.c); ctx.sortir("                                                      List of databases\n   Name    |  Owner   | Encoding | Locale Provider |  Collate   |   Ctype    \n-----------+----------+----------+-----------------+------------+------------\n" + bases.concat(["template0", "template1"]).map(function(b){ return " " + completerDroite(b, 9) + " | postgres | UTF8     | libc            | en_US.utf8 | en_US.utf8"; }).join("\n") + "\n(" + (bases.length + 2) + " rows)\n\n"); return 0; }
	var r = executerSqlPort(cx.h, cx.c, ctx, base, user, sql);
	r.resultats.forEach(function(x){ ctx.sortir(tableauPsqlPort(x)); });
	if (r.messages.length) ctx.sortir(r.messages.join("\n") + "\n");
	if (r.erreur){ ctx.erreur("ERROR:  " + r.erreur + "\n"); return 1; }
	return 0;
};
COMMANDES_CONTENEUR_PORT["redis-cli"] = function(ctx, args){
	var o = lireOptionsCourtesPort(args, "hpa"), mots = o.reste;
	var cx = connexionRedisPort(ctx.h, ctx.c, o.o.h || "127.0.0.1", +(o.o.p || 6379), o.o.a || null);
	if (cx.erreur){ ctx.sortir(cx.erreur + "\n"); return 1; }
	if (cx.refus){ ctx.sortir(cx.refus + "\n"); return 0; }
	if (!mots.length){ ctx.sortir((o.o.h || "127.0.0.1") + ":" + (o.o.p || 6379) + "> \n(le petit redis-cli du jeu lit une commande : redis-cli ping)\n"); return 0; }
	ctx.sortir(commandeRedisPort(cx.h, cx.c, mots) + "\n");
	return 0;
};
COMMANDES_CONTENEUR_PORT.hello = function(ctx){ ctx.sortir(HELLO_PORT); return 0; };
COMMANDES_CONTENEUR_PORT.registry = function(ctx, args){ if (args[0] === "--version" || args[0] === "-v"){ ctx.sortir("registry github.com/distribution/distribution/v2 v2.8.3\n"); return 0; } ctx.erreur("registry : il se lance comme programme du conteneur, pas depuis un shell.\n"); return 1; };
function programmeEnLignePort(ctx, n, args, nom, p){
	if (n === "flotte"){ ctx.sortir("Le pavillon noir flotte sur ce navire.\n"); return args.length ? executerCommandePort(ctx, args) : 0; }
	if (n === "phare"){ ctx.sortir("phare : le faisceau balaie la baie sur le port " + (ctx.env.PHARE_PORT || 8080) + "\n"); return 0; }
	if (n === "redis"){ ctx.sortir("1:C * Redis is starting (au premier plan : lance-le comme programme du conteneur)\n"); return 0; }
	if (n === "postgres"){ if (ctx.user.uid === 0){ ctx.erreur("\"root\" execution of the PostgreSQL server is not permitted.\n"); return 1; } return 0; }
	if (n === "lib"){ ctx.erreur(prefixeShellPort(ctx) + nom + ": Permission denied\n"); return 126; }
	if (n === "entree-nginx" || n === "entree-postgres" || n === "entree-redis" || n === "entree-registry"){ return args.length ? executerCommandePort(ctx, args) : 0; }
	if (n === "su-exec" || n === "setpriv" || n === "tini"){ return args.length ? executerCommandePort(ctx, args.filter(function(a){ return a.charAt(0) !== "-"; }).slice(n === "su-exec" ? 1 : 0)) : 0; }
	if (n === "jq"){ ctx.sortir(ctx.stdin || ""); return 0; }
	return null;
}
