/**
 * SortsPortCli.js : le moteur des conteneurs du Grand Port, quatrième partie : la commande docker.
 *
 * Le répartiteur (docker COMMANDE, docker container COMMANDE...), la lecture des options comme le vrai (drapeaux courts
 * groupés -dit, --opt=valeur, valeurs collées -p8080:80, « unknown flag »), l'accès au démon (root ou le groupe docker de
 * la session), les manœuvres que les maîtres du port enseignent une à une, et les sous-commandes : run, create, start,
 * stop, restart, kill, rm, ps, logs, exec, inspect, top, port, rename, wait, cp, diff, pause, unpause, update, stats,
 * events, container prune ; images, pull, push, tag, rmi, history, image inspect/prune, save, load ; volume ; network ;
 * system df/prune/info/events ; info, version, login, logout, context.
 * build, compose, swarm, node, service, stack, secret, buildx et manifest sont dans leurs propres fichiers.
 *
 * Et autour, sur les machines du port : htpasswd, dockerd (--validate, --version), ctr, ssh-keygen -lf sur un fichier
 * known_hosts, les ports de docker-proxy dans ss, id et groups qui disent les groupes de la SESSION, $PWD.
 *
 * --- Ce que le monde peut appeler ---
 *   apprendreManoeuvresPort(maitre)   débloque les sous-commandes qu'enseigne ce maître (Kylian, Julien...)
 *   manoeuvreConnuePort(sous)         vrai si la sous-commande est permise
 *   MANOEUVRES_PORT                   { sous-commande: maître }
 */

/* ================================================================== */
/* Les manœuvres : chaque maître enseigne ses sous-commandes            */
/* ================================================================== */

var MANOEUVRES_PORT = {
	run: "Kylian", ps: "Kylian", version: "Kylian", info: "Kylian", images: "Kylian", pull: "Kylian", rm: "Kylian", context: "Kylian",
	start: "Julien", stop: "Julien", restart: "Julien", logs: "Julien", exec: "Julien", inspect: "Julien", top: "Julien", port: "Julien", container: "Julien", rename: "Julien", wait: "Julien", kill: "Julien", pause: "Julien", unpause: "Julien",
	tag: "Grégoire", rmi: "Grégoire", image: "Grégoire", history: "Grégoire", system: "Grégoire",
	volume: "Chahla", network: "Adonis", build: "Eden", builder: "Eden",
	login: "Déborah", logout: "Déborah", push: "Déborah",
	compose: "Elias", stats: "Remi", events: "Remi", update: "Remi",
	save: "Soufiane", load: "Soufiane", create: "Soufiane", cp: "Soufiane", diff: "Soufiane",
	swarm: "Arnaud", node: "Arnaud", service: "Arnaud", stack: "Arnaud", secret: "Arnaud", config: "Arnaud",
	buildx: "Ronan", manifest: "Ronan"
};
var LIEUX_MAITRES_PORT = { "Kylian": "au Quai des Premiers Pas", "Julien": "à la Capitainerie", "Grégoire": "à l'Entrepôt des plans", "Chahla": "aux Soutes", "Adonis": "aux Chenaux",
	"Eden": "au Chantier naval", "Megane": "aux Cales", "Jahmal": "au Chantier des maîtres", "Déborah": "au Registre du port", "Elias": "à la Feuille de route", "Remi": "à la Vigie",
	"Ian": "à l'Armurerie", "Soufiane": "à la Douane", "Arnaud": "à l'Escadre", "Ronan": "sur les docks" };
function manoeuvresActivesPort(){
	var c = typeof sCh8 === "function" ? sCh8() : {};
	if (c.verrouManoeuvres === true) return true;
	if (c.verrouManoeuvres === false) return false;
	return typeof QUETES_CH8 !== "undefined";
}
function manoeuvreConnuePort(sous){
	if (!MANOEUVRES_PORT[sous] || !manoeuvresActivesPort()) return true;
	var c = sCh8();
	return !!(c.manoeuvres && c.manoeuvres[sous]);
}
function apprendreManoeuvresPort(maitre){
	var c = sCh8(), appris = [];
	c.manoeuvres = c.manoeuvres || {};
	Object.keys(MANOEUVRES_PORT).forEach(function(k){ if (MANOEUVRES_PORT[k] === maitre && !c.manoeuvres[k]){ c.manoeuvres[k] = true; appris.push(k); } });
	return appris;
}
function toutesManoeuvresPort(){ Object.keys(LIEUX_MAITRES_PORT).forEach(function(m){ apprendreManoeuvresPort(m); }); }
function refusManoeuvrePort(sous){
	var m = MANOEUVRES_PORT[sous];
	return new ShellError("docker " + sous + " : manœuvre encore inconnue. " + m + " l'enseigne " + (LIEUX_MAITRES_PORT[m] || "au port") + " (cat " + m.replace("é", "e") + ").", 1);
}

/* ================================================================== */
/* La lecture des options, comme pflag                                  */
/* ================================================================== */

/*
 * def : { court: { d: "detach" }, valeurs: ["env", "publish", ...], booleens: ["detach", ...], repetables: [...] }
 * Renvoie { o: { nom: valeur | [valeurs] | true }, reste: [...] } ; s'arrête au premier argument positionnel si stop.
 */
function lireDrapeauxPort(args, def, cmd, stop){
	var o = {}, reste = [], i = 0;
	var court = def.court || {}, valeurs = def.valeurs || [], booleens = def.booleens || [], rep = def.repetables || [];
	function poser(nom, v){
		if (rep.indexOf(nom) > -1){ (o[nom] = o[nom] || []).push(v); }
		else o[nom] = v;
	}
	for (; i < args.length; i++){
		var a = args[i];
		if (a === "--"){ reste = reste.concat(args.slice(i + 1)); break; }
		if (a.substring(0, 2) === "--"){
			var eq = a.indexOf("="), nom = eq > 0 ? a.substring(2, eq) : a.substring(2);
			nom = (def.alias || {})[nom] || nom;
			if (valeurs.indexOf(nom) > -1){
				var v = eq > 0 ? a.substring(eq + 1) : args[++i];
				if (v === undefined) throw new ShellError("flag needs an argument: --" + nom + "\nSee 'docker " + cmd + " --help'.", 125);
				poser(nom, v); continue;
			}
			if (booleens.indexOf(nom) > -1){ o[nom] = eq > 0 ? !/^(false|0)$/.test(a.substring(eq + 1)) : true; continue; }
			throw new ShellError("unknown flag: --" + nom + "\nSee 'docker " + cmd + " --help'.", 125);
		}
		if (a.charAt(0) === "-" && a.length > 1){
			for (var k = 1; k < a.length; k++){
				var l = a.charAt(k), n = court[l];
				if (!n) throw new ShellError("unknown shorthand flag: '" + l + "' in " + a + "\nSee 'docker " + cmd + " --help'.", 125);
				if (valeurs.indexOf(n) > -1){
					var vv = a.substring(k + 1).replace(/^=/, "");
					if (vv === "") vv = args[++i];
					if (vv === undefined) throw new ShellError("flag needs an argument: '" + l + "' in -" + l + "\nSee 'docker " + cmd + " --help'.", 125);
					poser(n, vv);
					break;
				}
				o[n] = true;
			}
			continue;
		}
		if (stop){ reste = reste.concat(args.slice(i)); break; }
		reste.push(a);
	}
	return { o: o, reste: reste };
}
function listePort(v){ return v === undefined ? [] : (Array.isArray(v) ? v : [v]); }
/* « 30s », « 1m30s », « 500ms » : des nanosecondes. */
function dureeNsDepuisPort(t){
	var m, total = 0, re = /(\d+(?:\.\d+)?)(ms|s|m|h)/g, ok = false;
	while ((m = re.exec(String(t)))){ ok = true; total += +m[1] * { ms: 1e6, s: 1e9, m: 60e9, h: 3600e9 }[m[2]]; }
	return ok ? total : null;
}
function texteDureeNsPort(ns){ var s = ns / 1e9; if (s >= 60 && s % 60 === 0) return (s / 60) + "m0s"; return s + "s"; }
/* 512m, 1g, 64M : des octets (unités de 1024, comme docker). */
function memoireDepuisPort(t){
	var m = /^(\d+(?:\.\d+)?)([bkmg]?)b?$/i.exec(String(t).trim());
	if (!m) return null;
	return Math.round(+m[1] * { "": 1, b: 1, k: 1024, m: 1048576, g: 1073741824 }[m[2].toLowerCase()]);
}

/* ================================================================== */
/* Le répartiteur                                                       */
/* ================================================================== */

var USAGE_DOCKER_PORT = "\nUsage:  docker [OPTIONS] COMMAND\n\nA self-sufficient runtime for containers\n\nCommon Commands:\n  run         Create and run a new container from an image\n  exec        Execute a command in a running container\n" +
	"  ps          List containers\n  build       Build an image from a Dockerfile\n  pull        Download an image from a registry\n  push        Upload an image to a registry\n  images      List images\n  login       Authenticate to a registry\n" +
	"  logout      Log out from a registry\n  version     Show the Docker version information\n  info        Display system-wide information\n\nManagement Commands:\n  builder     Manage builds\n  buildx*     Docker Buildx\n" +
	"  compose*    Docker Compose\n  container   Manage containers\n  context     Manage contexts\n  image       Manage images\n  manifest    Manage Docker image manifests and manifest lists\n  network     Manage networks\n" +
	"  system      Manage Docker\n  volume      Manage volumes\n\nSwarm Commands:\n  node        Manage Swarm nodes\n  secret      Manage Swarm secrets\n  service     Manage Swarm services\n  stack       Manage Swarm stacks\n  swarm       Manage Swarm\n\n" +
	"Commands:\n  cp          Copy files/folders between a container and the local filesystem\n  create      Create a new container\n  diff        Inspect changes to files or directories on a container's filesystem\n" +
	"  events      Get real time events from the server\n  history     Show the history of an image\n  inspect     Return low-level information on Docker objects\n  kill        Kill one or more running containers\n" +
	"  load        Load an image from a tar archive or STDIN\n  logs        Fetch the logs of a container\n  pause       Pause all processes within one or more containers\n  port        List port mappings or a specific mapping for the container\n" +
	"  rename      Rename a container\n  restart     Restart one or more containers\n  rm          Remove one or more containers\n  rmi         Remove one or more images\n  save        Save one or more images to a tar archive (streamed to STDOUT by default)\n" +
	"  start       Start one or more stopped containers\n  stats       Display a live stream of container(s) resource usage statistics\n  stop        Stop one or more running containers\n  tag         Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE\n" +
	"  top         Display the running processes of a container\n  unpause     Unpause all processes within one or more containers\n  update      Update configuration of one or more containers\n  wait        Block until one or more containers stop, then print their exit codes\n\n" +
	"Global Options:\n  -D, --debug              Enable debug mode\n  -H, --host list          Daemon socket to connect to\n  -l, --log-level string   Set the logging level (\"debug\", \"info\", \"warn\", \"error\", \"fatal\") (default \"info\")\n  -v, --version            Print version information and quit\n\nRun 'docker COMMAND --help' for more information on a command.";
var SOUS_CONTENEUR_PORT = { ls: "ps", list: "ps", ps: "ps", run: "run", create: "create", start: "start", stop: "stop", restart: "restart", kill: "kill", rm: "rm", remove: "rm", logs: "logs", exec: "exec",
	inspect: "inspect", top: "top", port: "port", rename: "rename", wait: "wait", cp: "cp", diff: "diff", prune: "prune", stats: "stats", update: "update", pause: "pause", unpause: "unpause", attach: "attach" };
var SOUS_IMAGE_PORT = { ls: "images", list: "images", pull: "pull", push: "push", tag: "tag", rm: "rmi", remove: "rmi", inspect: "image-inspect", history: "history", prune: "image-prune", save: "save", load: "load", build: "build" };
Shell.sorts.docker = function(args, io){
	var h = Shell.hote();
	if (!estHoteDockerPort(h)){
		if (HOTES_PORT.indexOf(h) > -1) throw new ShellError("bash: docker: command not found" + astuce(io, h === "chaloupe" ? "La chaloupe n'a pas de démon docker : on y travaille avec podman." : "Cette machine n'a pas de démon docker."), 127);
		throw new ShellError("bash: docker: command not found" + astuce(io, "docker vit sur les machines du Grand Port : ssh docks."), 127);
	}
	var a = args.slice();
	// Les options globales
	while (a.length && /^-/.test(a[0])){
		if (a[0] === "-v" || a[0] === "--version"){ accesClientPort(h); return "Docker version " + VERSION_DOCKER_PORT + ", build a72d7cd"; }
		if (a[0] === "-H" || a[0] === "--host" || a[0] === "-c" || a[0] === "--context" || a[0] === "-l" || a[0] === "--log-level" || a[0] === "--config"){ a.splice(0, 2); continue; }
		if (a[0] === "-D" || a[0] === "--debug"){ a.shift(); continue; }
		throw new ShellError("unknown flag: " + a[0] + "\nSee 'docker --help'.", 125);
	}
	if (!a.length) return USAGE_DOCKER_PORT;
	var sous = a.shift();
	if (sous === "container" || sous === "image"){
		var s2 = a.shift();
		var table = sous === "container" ? SOUS_CONTENEUR_PORT : SOUS_IMAGE_PORT;
		if (!s2 || !table[s2]) return "\nUsage:  docker " + sous + " COMMAND\n\nManage " + sous + "s\n\nCommands:\n  " + Object.keys(table).join("\n  ") + "\n\nRun 'docker " + sous + " COMMAND --help' for more information on a command." + (s2 ? "" : "");
		if (!manoeuvreConnuePort(sous)) throw refusManoeuvrePort(sous);
		var cible = table[s2];
		if (cible === "prune") return conteneurPrunePort(h, a, io);
		if (cible === "image-prune") return imagePrunePort(h, a, io);
		if (cible === "image-inspect") return inspecterPort(h, ["--type", "image"].concat(a), io);
		if (cible === "build") sous = "build";
		else return docker1Port(h, cible, a, io, true);
	}
	if (!manoeuvreConnuePort(sous)) throw refusManoeuvrePort(sous);
	return docker1Port(h, sous, a, io, false);
};
function docker1Port(h, sous, a, io, viaGestion){
	switch (sous){
		case "version": return versionDockerPort(h, a, io);
		case "info": return infoDockerPort(h, a, io);
		case "run": return runPort(h, a, io, false);
		case "create": return runPort(h, a, io, true);
		case "ps": return psPort(h, a, io);
		case "start": return startPort(h, a, io);
		case "stop": return stopPort(h, a, io, "stop");
		case "restart": return stopPort(h, a, io, "restart");
		case "kill": return stopPort(h, a, io, "kill");
		case "rm": return rmPort(h, a, io);
		case "logs": return logsPort(h, a, io);
		case "exec": return execPort(h, a, io);
		case "inspect": return inspecterPort(h, a, io);
		case "top": return topPort(h, a, io);
		case "port": return portPort(h, a, io);
		case "rename": return renamePort(h, a, io);
		case "wait": return waitPort(h, a, io);
		case "cp": return cpPort(h, a, io);
		case "diff": return diffPort(h, a, io);
		case "pause": case "unpause": return pausePort(h, a, io, sous);
		case "update": return updatePort(h, a, io);
		case "stats": return statsPort(h, a, io);
		case "events": return eventsPort(h, a, io);
		case "attach": accesDemonPort(h, io); throw new ShellError("docker attach : le jeu ne sait pas s'attacher à un conteneur déjà lancé. docker logs -f le suit, docker exec -it y ouvre un shell.", 1);
		case "images": return imagesPortCli(h, a, io);
		case "pull": return pullPortCli(h, a, io);
		case "push": return pushPort(h, a, io);
		case "tag": return tagPort(h, a, io);
		case "rmi": return rmiPort(h, a, io);
		case "history": return historyPort(h, a, io);
		case "save": return savePort(h, a, io);
		case "load": return loadPort(h, a, io);
		case "volume": return volumeCliPort(h, a, io);
		case "network": return networkCliPort(h, a, io);
		case "system": return systemCliPort(h, a, io);
		case "login": return loginPort(h, a, io);
		case "logout": return logoutPort(h, a, io);
		case "context": return contextPort(h, a, io);
		case "build": if (typeof buildPort === "function") return buildPort(h, a, io); break;
		case "builder": if (typeof builderPort === "function") return builderPort(h, a, io); break;
		case "compose": if (typeof composePort === "function") return composePort(h, a, io); break;
		case "swarm": case "node": case "service": case "stack": case "secret": case "config": if (typeof swarmCliPort === "function") return swarmCliPort(h, sous, a, io); break;
		case "buildx": if (typeof buildxPort === "function") return buildxPort(h, a, io); break;
		case "manifest": if (typeof manifestPort === "function") return manifestPort(h, a, io); break;
		case "search": accesDemonPort(h, io); throw new ShellError("Error response from daemon: Unexpected status code 404" + astuce(io, "Le registre du continent ne se fouille pas d'ici : on y tire des images par leur nom (docker pull alpine:3.20)."), 1);
	}
	throw new ShellError("docker: unknown command: docker " + sous + "\n\nRun 'docker --help' for more information", 1);
}
/* Le client seul (docker --version) n'a pas besoin du démon. */
function accesClientPort(h){ return true; }
function conteneurOuErreurPort(h, ref){
	var c = conteneurPort(h, ref);
	if (!c) throw new ShellError("Error response from daemon: No such container: " + ref, 1);
	if (c.ambigu) throw new ShellError("Error response from daemon: Multiple IDs found with provided prefix: " + ref, 1);
	return c;
}

/* ================================================================== */
/* version, info, context                                               */
/* ================================================================== */

function objetVersionPort(h){
	return { Client: { Version: VERSION_DOCKER_PORT, ApiVersion: API_DOCKER_PORT, DefaultAPIVersion: API_DOCKER_PORT, GitCommit: "a72d7cd", GoVersion: GO_DOCKER_PORT, Os: "linux", Arch: "amd64", BuildTime: "Wed Sep 11 21:27:22 2024", Context: "default" },
		Server: { Platform: { Name: "" }, Version: VERSION_DOCKER_PORT, ApiVersion: API_DOCKER_PORT, MinAPIVersion: "1.24", GitCommit: "411e817", GoVersion: GO_DOCKER_PORT, Os: "linux", Arch: "amd64", KernelVersion: NOYAU_PORT, BuildTime: "2024-09-11T21:27:22.000000000+00:00",
			Components: [{ Name: "Engine", Version: VERSION_DOCKER_PORT }, { Name: "containerd", Version: VERSION_CONTAINERD_PORT }, { Name: "runc", Version: VERSION_RUNC_PORT }, { Name: "docker-init", Version: "0.19.0" }] } };
}
function versionDockerPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "format" }, valeurs: ["format"] }, "version");
	var client = "Client:\n Version:           " + VERSION_DOCKER_PORT + "\n API version:       " + API_DOCKER_PORT + "\n Go version:        " + GO_DOCKER_PORT + "\n Git commit:        a72d7cd\n Built:             Wed Sep 11 21:27:22 2024\n OS/Arch:           linux/amd64\n Context:           default";
	var acces = null;
	try { accesDemonPort(h, io, "version"); } catch (e){ acces = e; }
	evenementPort(h, "version", { format: d.o.format || null, demon: !acces });
	if (d.o.format){
		if (acces) throw acces;
		return gabaritPort(d.o.format, objetVersionPort(h));
	}
	if (acces){ io.err(acces.message); io.code = 1; return client; }
	return client + "\n\nServer:\n Engine:\n  Version:          " + VERSION_DOCKER_PORT + "\n  API version:      " + API_DOCKER_PORT + " (minimum version 1.24)\n  Go version:       " + GO_DOCKER_PORT + "\n  Git commit:       411e817\n  Built:            Wed Sep 11 21:27:22 2024\n  OS/Arch:          linux/amd64\n  Experimental:     false\n" +
		" containerd:\n  Version:          " + VERSION_CONTAINERD_PORT + "\n  GitCommit:        " + VERSION_CONTAINERD_PORT + "-1\n runc:\n  Version:          " + VERSION_RUNC_PORT + "\n  GitCommit:        " + VERSION_RUNC_PORT + "-1\n docker-init:\n  Version:          0.19.0\n  GitCommit:        ";
}
function objetInfoPort(h){
	var cs = conteneursPort(h), P = etatPort(h), cfg = configDemonPort(h), M = etatMachine(h);
	var swarm = typeof etatSwarmLocalPort === "function" ? etatSwarmLocalPort(h) : { LocalNodeState: "inactive" };
	var secu = ["name=apparmor", "name=seccomp,profile=builtin", "name=cgroupns"];
	if (cfg["userns-remap"]) secu.push("name=userns");
	return {
		ID: hexDe("demon:" + h, 8) + "-" + hexDe("demon2:" + h, 4) + "-" + hexDe("demon3:" + h, 4) + "-" + hexDe("demon4:" + h, 4) + "-" + hexDe("demon5:" + h, 12),
		Containers: cs.length, ContainersRunning: cs.filter(enMarchePort).length, ContainersPaused: cs.filter(function(c){ return c.etat.statut === "paused"; }).length, ContainersStopped: cs.filter(function(c){ return !enMarchePort(c); }).length,
		Images: imagesPort(h).length, Driver: "overlay2", DriverStatus: [["Backing Filesystem", "extfs"], ["Supports d_type", "true"], ["Using metacopy", "false"], ["Native Overlay Diff", "true"], ["userxattr", "false"]],
		Plugins: { Volume: ["local"], Network: ["bridge", "host", "ipvlan", "macvlan", "null", "overlay"], Authorization: null, Log: ["fluentd", "gelf", "journald", "json-file", "local", "syslog"] },
		MemoryLimit: true, SwapLimit: true, CpuCfsPeriod: true, CpuCfsQuota: true, IPv4Forwarding: true, Debug: !!cfg.debug, NFd: 36, NGoroutines: 52, SystemTime: dateIsoPort(maintenantPort(h)),
		LoggingDriver: cfg["log-driver"] || "json-file", CgroupDriver: "systemd", CgroupVersion: "2", NEventsListener: 0, KernelVersion: NOYAU_PORT, OperatingSystem: "Debian GNU/Linux 13 (trixie)", OSVersion: "13", OSType: "linux",
		Architecture: "x86_64", IndexServerAddress: "https://" + REGISTRE_CONTINENT_PORT + "/v1/",
		RegistryConfig: { AllowNondistributableArtifactsCIDRs: null, InsecureRegistryCIDRs: ["127.0.0.0/8"], IndexConfigs: (function(){ var x = { __table: true }; x[REGISTRE_CONTINENT_PORT] = { Name: REGISTRE_CONTINENT_PORT, Mirrors: [], Secure: true, Official: true }; registresNonSursPort(h).forEach(function(r){ x[r] = { Name: r, Mirrors: [], Secure: false, Official: false }; }); return x; })(), Mirrors: cfg["registry-mirrors"] || null },
		NCPU: (M.cpus || 2), MemTotal: Math.round((M.memoire ? M.memoire.total : 4026512) * 1024), DockerRootDir: cfg["data-root"] || (cfg["userns-remap"] ? "/var/lib/docker/100000.100000" : "/var/lib/docker"),
		Name: h, Labels: [], ExperimentalBuild: false, ServerVersion: VERSION_DOCKER_PORT, Runtimes: { __table: true, "io.containerd.runc.v2": { path: "runc" }, runc: { path: "runc" } }, DefaultRuntime: "runc",
		Swarm: swarm, LiveRestoreEnabled: !!cfg["live-restore"], Isolation: "", InitBinary: "docker-init", SecurityOptions: secu, Warnings: null
	};
}
function infoDockerPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "format" }, valeurs: ["format"] }, "info");
	var client = "Client:\n Version:    " + VERSION_DOCKER_PORT + "\n Context:    default\n Debug Mode: false\n Plugins:\n  buildx: docker buildx\n    Version:  " + VERSION_BUILDX_PORT + "\n    Path:     /usr/libexec/docker/cli-plugins/docker-buildx\n  compose: docker compose\n    Version:  " + VERSION_COMPOSE_PORT + "\n    Path:     /usr/libexec/docker/cli-plugins/docker-compose\n";
	var acces = null;
	try { accesDemonPort(h, io, "info"); } catch (e){ acces = e; }
	evenementPort(h, "info", { format: d.o.format || null, demon: !acces, sudo: !!io.sudo });
	if (d.o.format){ if (acces) throw acces; return gabaritPort(d.o.format, objetInfoPort(h)); }
	if (acces){ io.code = 1; return client + "\nServer:\nERROR: " + acces.message.split("\n")[0] + "\nerrors pretty printing info"; }
	var i = objetInfoPort(h), cfg = configDemonPort(h);
	var swarm = i.Swarm.LocalNodeState === "active" ? "active\n  NodeID: " + i.Swarm.NodeID + "\n  Is Manager: " + (i.Swarm.ControlAvailable ? "true" : "false") + (i.Swarm.ControlAvailable ? "\n  ClusterID: " + i.Swarm.ClusterID + "\n  Managers: " + i.Swarm.Managers + "\n  Nodes: " + i.Swarm.Nodes : "") + "\n  Node Address: " + ipPort(h) : "inactive";
	return client + "\nServer:\n Containers: " + i.Containers + "\n  Running: " + i.ContainersRunning + "\n  Paused: " + i.ContainersPaused + "\n  Stopped: " + i.ContainersStopped + "\n Images: " + i.Images +
		"\n Server Version: " + VERSION_DOCKER_PORT + "\n Storage Driver: overlay2\n  Backing Filesystem: extfs\n  Supports d_type: true\n  Using metacopy: false\n  Native Overlay Diff: true\n  userxattr: false\n Logging Driver: " + i.LoggingDriver +
		"\n Cgroup Driver: systemd\n Cgroup Version: 2\n Plugins:\n  Volume: local\n  Network: bridge host ipvlan macvlan null overlay\n  Log: fluentd gelf journald json-file local syslog\n Swarm: " + swarm +
		"\n Runtimes: io.containerd.runc.v2 runc\n Default Runtime: runc\n Init Binary: docker-init\n containerd version: " + VERSION_CONTAINERD_PORT + "\n runc version: " + VERSION_RUNC_PORT + "\n init version: \n Security Options:\n  apparmor\n  seccomp\n   Profile: builtin\n  cgroupns" + (cfg["userns-remap"] ? "\n  userns" : "") +
		"\n Kernel Version: " + NOYAU_PORT + "\n Operating System: Debian GNU/Linux 13 (trixie)\n OSType: linux\n Architecture: x86_64\n CPUs: " + i.NCPU + "\n Total Memory: " + tailleBinPort(i.MemTotal) + "\n Name: " + h + "\n ID: " + i.ID +
		"\n Docker Root Dir: " + i.DockerRootDir + "\n Debug Mode: false\n Experimental: false\n Insecure Registries:\n" + registresNonSursPort(h).map(function(r){ return "  " + r + "\n"; }).join("") + "  127.0.0.0/8\n" + (cfg["registry-mirrors"] ? " Registry Mirrors:\n" + cfg["registry-mirrors"].map(function(r){ return "  " + r + "\n"; }).join("") : "") + " Live Restore Enabled: " + (cfg["live-restore"] ? "true" : "false");
}
function contextPort(h, a, io){
	if (a[0] === "ls" || a[0] === "list") return "NAME        DESCRIPTION                               DOCKER ENDPOINT               ERROR\ndefault *   Current DOCKER_HOST based configuration   unix:///var/run/docker.sock   ";
	if (a[0] === "show") return "default";
	return "\nUsage:  docker context COMMAND\n\nManage contexts\n\nCommands:\n  ls          List contexts\n  show        Print the name of the current context\n";
}

/* ================================================================== */
/* run et create                                                        */
/* ================================================================== */

var DEF_RUN_PORT = {
	court: { d: "detach", i: "interactive", t: "tty", e: "env", p: "publish", P: "publish-all", v: "volume", u: "user", w: "workdir", m: "memory", h: "hostname", l: "label", q: "quiet" },
	valeurs: ["env", "env-file", "publish", "volume", "mount", "tmpfs", "network", "net", "network-alias", "net-alias", "restart", "memory", "cpus", "cap-drop", "cap-add", "security-opt", "user", "workdir", "entrypoint",
		"health-cmd", "health-interval", "health-retries", "health-timeout", "health-start-period", "log-driver", "log-opt", "label", "hostname", "name", "pids-limit", "expose", "add-host", "dns", "platform",
		"memory-swap", "stop-signal", "pull", "ulimit", "shm-size", "cpu-shares", "link", "label-file", "volumes-from", "stop-timeout", "group-add", "device", "secret"],
	booleens: ["detach", "interactive", "tty", "rm", "publish-all", "read-only", "privileged", "init", "no-healthcheck", "quiet", "oom-kill-disable"],
	repetables: ["env", "env-file", "publish", "volume", "mount", "tmpfs", "network-alias", "net-alias", "cap-drop", "cap-add", "security-opt", "log-opt", "label", "expose", "add-host", "dns", "ulimit", "link", "group-add", "device"],
	alias: { net: "network", "net-alias": "network-alias" }
};
function lireVolumeArgPort(h, spec, io){
	var parts = String(spec).split(":");
	if (parts.length === 1) return { type: "volume", source: null, cible: parts[0], ro: false, anonyme: true };
	var src = parts[0], cible = parts[1], opts = (parts[2] || "").split(",");
	if (!cible || cible.charAt(0) !== "/") throw new ShellError("docker: Error response from daemon: invalid volume specification: '" + spec + "': invalid mount config for type \"" + (src.charAt(0) === "/" ? "bind" : "volume") + "\": invalid mount path: '" + (cible || "") + "' mount path must be absolute.\n\nSee 'docker run --help'.", 125);
	var ro = opts.indexOf("ro") > -1;
	if (/^[.~]?\//.test(src) || src === "." || src === "~"){
		var abs = src.charAt(0) === "~" ? (maisonMachine(h) || "/root") + src.substring(1) : (src.charAt(0) === "." ? cheminNormal(cheminDuLieuMachine(current_room) + "/" + src) : src);
		return { type: "bind", source: cheminNormal(abs), cible: cheminNormal(cible), ro: ro, creer: true };
	}
	if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(src)) throw new ShellError("docker: Error response from daemon: create " + src + ": \"" + src + "\" includes invalid characters for a local volume name, only \"[a-zA-Z0-9][a-zA-Z0-9_.-]\" are allowed. If you intended to pass a host directory, use absolute path.\n\nSee 'docker run --help'.", 125);
	return { type: "volume", source: src, cible: cheminNormal(cible), ro: ro, nocopy: opts.indexOf("nocopy") > -1 };
}
function lireMountArgPort(h, spec){
	var m = {};
	String(spec).split(",").forEach(function(kv){ var i = kv.indexOf("="); if (i > 0) m[kv.substring(0, i)] = kv.substring(i + 1); else m[kv] = "true"; });
	var type = m.type || "volume", src = m.source || m.src, cible = m.target || m.destination || m.dst;
	if (!cible) throw new ShellError("invalid argument \"" + spec + "\" for \"--mount\" flag: target is required\nSee 'docker run --help'.", 125);
	var ro = m.readonly === "true" || m.readonly === "1" || m.ro === "true" || m.readonly === "" || spec.indexOf(",readonly") > -1 || spec.indexOf(",ro") > -1;
	if (type === "bind"){
		var abs = /^~/.test(src) ? (maisonMachine(h) || "/root") + src.substring(1) : (/^\./.test(src) ? cheminNormal(cheminDuLieuMachine(current_room) + "/" + src) : src);
		if (!src || !noeudHote(h, abs)) throw new ShellError("docker: Error response from daemon: invalid mount config for type \"bind\": bind source path does not exist: " + (abs || "") + ".\n\nSee 'docker run --help'.", 125);
		return { type: "bind", source: cheminNormal(abs), cible: cheminNormal(cible), ro: ro };
	}
	if (type === "tmpfs") return { type: "tmpfs", cible: cheminNormal(cible), opts: m["tmpfs-size"] ? "size=" + m["tmpfs-size"] : "" };
	return { type: "volume", source: src || null, cible: cheminNormal(cible), ro: ro, anonyme: !src, nocopy: m["volume-nocopy"] === "true" };
}
function lirePortArgPort(spec){
	var proto = "tcp", s = String(spec);
	var mp = /\/(tcp|udp|sctp)$/.exec(s);
	if (mp){ proto = mp[1]; s = s.substring(0, s.length - mp[0].length); }
	var parts = s.split(":");
	var r;
	if (parts.length === 1) r = { ip: "", hp: null, cp: +parts[0], proto: proto, auto: true };
	else if (parts.length === 2) r = { ip: "", hp: parts[0] === "" ? null : +parts[0], cp: +parts[1], proto: proto };
	else r = { ip: parts[0], hp: parts[1] === "" ? null : +parts[1], cp: +parts[2], proto: proto };
	if (isNaN(r.cp) || (r.hp !== null && isNaN(r.hp))) throw new ShellError("docker: invalid containerPort: " + spec + ".\nSee 'docker run --help'.", 125);
	return r;
}
function lireEnvFilePort(h, chemin, io){
	var r = Shell.chercher(chemin, io, "docker");
	if (!(r.node instanceof Item)) throw new ShellError("docker: open " + chemin + ": no such file or directory.\nSee 'docker run --help'.", 125);
	var l = [];
	r.node.getText().split("\n").forEach(function(x){ x = x.trim(); if (!x || x.charAt(0) === "#") return; if (x.indexOf("=") === -1){ var v = Shell.variable(x); if (v !== "") l.push(x + "=" + v); return; } l.push(x); });
	return l;
}
/* Les options de run en options du moteur (creerConteneurPort). */
function optionsRunPort(h, o, io){
	var r = { env: [], ports: [], montages: [], tmpfs: {}, alias: listePort(o["network-alias"]), capDrop: [], capAdd: [], secOpt: [], labels: {}, expose: listePort(o.expose) };
	listePort(o["env-file"]).forEach(function(f){ r.env = r.env.concat(lireEnvFilePort(h, f, io)); });
	listePort(o.env).forEach(function(e){ if (e.indexOf("=") === -1){ var v = Shell.variable(e); if (v !== "" || state.env.hasOwnProperty(e)) r.env.push(e + "=" + v); } else r.env.push(e); });
	listePort(o.publish).forEach(function(p){ r.ports.push(lirePortArgPort(p)); });
	listePort(o.volume).forEach(function(v){ r.montages.push(lireVolumeArgPort(h, v, io)); });
	listePort(o.mount).forEach(function(m){ var x = lireMountArgPort(h, m); if (x.type === "tmpfs") r.tmpfs[x.cible] = x.opts; else r.montages.push(x); });
	listePort(o.tmpfs).forEach(function(t){ var i = t.indexOf(":"); r.tmpfs[cheminNormal(i > -1 ? t.substring(0, i) : t)] = i > -1 ? t.substring(i + 1) : ""; });
	listePort(o["cap-drop"]).forEach(function(c){ c.split(",").forEach(function(x){ r.capDrop.push(x.toUpperCase().replace(/^CAP_/, "")); }); });
	listePort(o["cap-add"]).forEach(function(c){ c.split(",").forEach(function(x){ r.capAdd.push(x.toUpperCase().replace(/^CAP_/, "")); }); });
	r.capDrop.concat(r.capAdd).forEach(function(c){ if (c !== "ALL" && CAPS_TOUTES_PORT.indexOf(c) === -1) throw new ShellError("docker: Error response from daemon: invalid CapAdd: unknown capability: \"CAP_" + c + "\".\n\nSee 'docker run --help'.", 125); });
	listePort(o["security-opt"]).forEach(function(s){
		if (!/^(no-new-privileges(:true|=true|:false|=false)?|seccomp[=:].+|apparmor[=:].+|label[=:].+)$/.test(s)) throw new ShellError("docker: Error response from daemon: invalid --security-opt 2: \"" + s + "\".\n\nSee 'docker run --help'.", 125);
		r.secOpt.push(s === "no-new-privileges" || s === "no-new-privileges=true" ? "no-new-privileges" : s.replace("=", ":"));
	});
	listePort(o.label).forEach(function(l){ var i = l.indexOf("="); r.labels[i > 0 ? l.substring(0, i) : l] = i > 0 ? l.substring(i + 1) : ""; });
	if (o.restart){
		var m = /^(no|always|unless-stopped|on-failure)(?::(\d+))?$/.exec(o.restart);
		if (!m) throw new ShellError("docker: Error response from daemon: invalid restart policy: unknown policy '" + o.restart.split(":")[0] + "'; use one of 'no', 'always', 'on-failure', or 'unless-stopped'.\n\nSee 'docker run --help'.", 125);
		if (m[2] && m[1] !== "on-failure") throw new ShellError("docker: Error response from daemon: invalid restart policy: maximum retry count can only be used with 'on-failure'.\n\nSee 'docker run --help'.", 125);
		r.restart = { nom: m[1], max: m[2] ? +m[2] : 0 };
	}
	if (o.rm && r.restart && r.restart.nom !== "no") throw new ShellError("docker: Conflicting options: --restart and --rm.\nSee 'docker run --help'.", 125);
	if (o.memory){ r.memoire = memoireDepuisPort(o.memory); if (r.memoire === null) throw new ShellError("invalid argument \"" + o.memory + "\" for \"-m, --memory\" flag: invalid size: '" + o.memory + "'\nSee 'docker run --help'.", 125); }
	if (o.cpus){ r.cpus = parseFloat(o.cpus); if (isNaN(r.cpus) || r.cpus <= 0) throw new ShellError("invalid argument \"" + o.cpus + "\" for \"--cpus\" flag: failed to parse " + o.cpus + " as a rational number\nSee 'docker run --help'.", 125); if (r.cpus > 2) throw new ShellError("docker: Error response from daemon: range of CPUs is from 0.01 to 2.00, as there are only 2 CPUs available.\n\nSee 'docker run --help'.", 125); }
	if (o["pids-limit"]) r.pidsLimit = +o["pids-limit"];
	if (o.network) r.reseau = o.network === "bridge" ? "default" : o.network;
	if (o.user !== undefined) r.user = o.user;
	if (o.workdir) r.workdir = cheminNormal(o.workdir);
	if (o.entrypoint !== undefined) r.entrypoint = o.entrypoint === "" ? [""] : [o.entrypoint];
	if (o.hostname) r.hostname = o.hostname;
	if (o["read-only"]) r.readOnly = true;
	if (o.privileged) r.privileged = true;
	if (o.init) r.init = true;
	if (o["publish-all"]) r.publierTout = true;
	if (o["stop-signal"]) r.arreter = o["stop-signal"];
	if (o["log-driver"] || o["log-opt"]){
		r.log = { type: o["log-driver"] || configDemonPort(h)["log-driver"] || "json-file", opts: copieJson(configDemonPort(h)["log-opts"] || {}) };
		listePort(o["log-opt"]).forEach(function(x){ var i = x.indexOf("="); r.log.opts[x.substring(0, i)] = x.substring(i + 1); });
		if (["json-file", "local", "none", "syslog", "journald", "gelf", "fluentd"].indexOf(r.log.type) === -1) throw new ShellError("docker: Error response from daemon: failed to create task for container: failed to initialize logging driver: logger: no log driver named '" + r.log.type + "' is registered.", 125);
	}
	if (o["no-healthcheck"]) r.sante = false;
	else if (o["health-cmd"]){
		r.sante = { Test: ["CMD-SHELL", o["health-cmd"]] };
		if (o["health-interval"]) r.sante.Interval = dureeNsDepuisPort(o["health-interval"]);
		if (o["health-timeout"]) r.sante.Timeout = dureeNsDepuisPort(o["health-timeout"]);
		if (o["health-start-period"]) r.sante.StartPeriod = dureeNsDepuisPort(o["health-start-period"]);
		if (o["health-retries"]) r.sante.Retries = +o["health-retries"];
	}
	listePort(o["add-host"]).forEach(function(x){ var p = x.split(":"); (r.hotesExtra = r.hotesExtra || []).push((p[1] === "host-gateway" ? "172.17.0.1" : p.slice(1).join(":")) + "\t" + p[0]); });
	if (o.name) r.nom = o.name;
	r.detache = !!o.detach; r.tty = !!o.tty; r.interactif = !!o.interactive; r.autoRemove = !!o.rm;
	// Les dossiers de l'hôte montés avec -v sont créés s'ils manquent (par root, comme le vrai).
	r.montages.forEach(function(m){ if (m.type === "bind" && m.creer && !noeudHote(h, m.source)) moteurSeul(function(){ creerDossiersHote(h, m.source); }); });
	return r;
}
/* Trouver l'image (ou la tirer, comme « Unable to find image ... locally »). */
function imagePourRunPort(h, ref, io, toujours){
	var a = analyserRefPort(ref);
	if (!a.valide || /[A-Z]/.test(ref.split("@")[0].split("/").pop().split(":")[0])) throw new ShellError("docker: invalid reference format: repository name (" + a.depot + ") must be lowercase.\n\nSee 'docker run --help'.", 125);
	var img = imagePort(h, ref);
	if (img && !toujours) return img;
	if (!img) io.err("Unable to find image '" + nomCourtPort(ref).replace(/^([^:@]+)$/, "$1:latest") + "' locally");
	var r = tirerImagePort(h, ref, io, false);
	if (r.erreur) throw new ShellError("docker: " + r.erreur + "\n\nSee 'docker run --help'.", 125);
	io.err(r.texte);
	return r.image;
}
function runPort(h, a, io, seulementCreer){
	var cmd = seulementCreer ? "create" : "run";
	var d = lireDrapeauxPort(a, DEF_RUN_PORT, cmd, true);
	if (!d.reste.length) throw new ShellError("\"docker " + cmd + "\" requires at least 1 argument.\nSee 'docker " + cmd + " --help'.\n\nUsage:  docker " + cmd + " [OPTIONS] IMAGE [COMMAND] [ARG...]\n\n" + (cmd === "run" ? "Create and run a new container from an image" : "Create a new container"), 1);
	accesDemonPort(h, io, "containers/create");
	var o = optionsRunPort(h, d.o, io);
	var ref = d.reste[0];
	if (d.o.pull === "always") imagePourRunPort(h, ref, io, true);
	var img = imagePourRunPort(h, ref, io, false);
	if (d.reste.length > 1) o.cmd = d.reste.slice(1);
	var c = creerConteneurPort(h, img, o, nomCourtPort(ref));
	if (o.hotesExtra) c.hotesExtra = o.hotesExtra;
	evenementPort(h, cmd, { conteneur: c.nom, id: c.id, image: c.imageRef, imageId: img.id, options: d.o, argv: d.reste.slice(1) });
	if (seulementCreer) return c.id;
	var sortie = [];
	if (o.detache){
		var r = demarrerConteneurPort(h, c, {});
		if (!r.ok){ io.err(r.erreur); io.code = r.code === 127 || r.code === 126 ? r.code : 125; return c.id; }
		if (c.avertissementHost) io.err("WARNING: Published ports are discarded when using host network mode");
		return c.id;
	}
	// Au premier plan : le programme tourne, sa sortie s'affiche.
	var res = demarrerConteneurPort(h, c, {});
	if (!res.ok){
		io.err(res.erreur.replace(/^docker: /, "docker: ") + (/OCI runtime/.test(res.erreur) ? "\n" : ""));
		io.code = res.code === 127 || res.code === 126 ? res.code : 125;
		if (o.autoRemove) supprimerConteneurPort(h, c, true);
		return "";
	}
	var prog = c.programme || {};
	if ((prog.type === "shell-interactif" || prog.type === "python-repl") && o.tty && o.interactif){
		ouvrirSessionPort(h, c, { principale: true, retirer: o.autoRemove, python: prog.type === "python-repl", cmd: (prog.processus && prog.processus[0] && prog.processus[0].cmd) || "/bin/sh" });
		if (prog.type === "python-repl") return "Python 3.12.7 (main, Oct  1 2024, 22:28:49) [GCC 12.2.0] on linux\nType \"help\", \"copyright\", \"credits\" or \"license\" for more information.";
		return "";
	}
	var journaux = c.journaux.map(function(j){ return j.l; }).join("\n").replace(/^\n+/, "");
	if (!enMarchePort(c)){
		io.code = c.etat.code;
		return journaux.replace(/\n+$/, "");
	}
	return (journaux ? journaux + "\n" : "") + astuce(io, "Au premier plan, docker run garde la main jusqu'à Ctrl+C. Ici, le jeu te la rend : le conteneur " + c.nom + " tourne toujours (docker ps). -d le lance d'emblée en arrière-plan.").replace(/^\n/, "");
}

/* ================================================================== */
/* ps                                                                   */
/* ================================================================== */

function commandePsPort(c, tronquer){
	var argv = (c.config.Entrypoint || []).concat(c.config.Cmd || []);
	var t = argv.join(" ");
	if (tronquer && t.length > 20) t = t.substring(0, 19) + "…";
	return "\"" + t + "\"";
}
function texteStatutPort(h, c){
	var e = c.etat;
	if (e.statut === "created") return "Created";
	if (e.statut === "restarting") return "Restarting (" + e.code + ") " + dureeDockerPort(maintenantPort(h) - (e.fin || maintenantPort(h))) + " ago";
	if (e.statut === "exited") return "Exited (" + e.code + ") " + dureeDockerPort(maintenantPort(h) - (e.fin || maintenantPort(h))) + " ago";
	if (e.statut === "paused") return "Up " + dureeDockerPort(maintenantPort(h) - e.debut) + " (Paused)";
	var s = "Up " + dureeDockerPort(maintenantPort(h) - e.debut);
	if (e.sante) s += e.sante.statut === "starting" ? " (health: starting)" : " (" + e.sante.statut + ")";
	return s;
}
function textePortsPort(h, c){
	var publies = enMarchePort(c) ? portsPubliesPort(h, c) : [];
	var morceaux = [];
	publies.forEach(function(p){
		if (p.ip) morceaux.push(p.ip + ":" + p.hp + "->" + p.cp + "/" + p.proto);
		else { morceaux.push("0.0.0.0:" + p.hp + "->" + p.cp + "/" + p.proto); morceaux.push(":::" + p.hp + "->" + p.cp + "/" + p.proto); }
	});
	Object.keys(c.config.ExposedPorts || {}).sort().forEach(function(k){ if (!publies.some(function(p){ return p.cp + "/" + p.proto === k; })) morceaux.push(k); });
	if (c.hote.reseau === "host") return "";
	return morceaux.join(", ");
}
function objetPsPort(h, c){
	var reseaux = Object.keys(c.reseaux || {});
	return { __type: "*formatter.ContainerContext", ID: c.id.substring(0, 12), Image: c.imageRef, Command: commandePsPort(c, true), CreatedAt: dateLocalePort(h, c.cree), RunningFor: ilYaPort(h, c.cree), Ports: textePortsPort(h, c),
		State: c.etat.statut, Status: texteStatutPort(h, c), Size: "0B", Names: c.nom, Labels: Object.keys(c.config.Labels || {}).map(function(k){ return k + "=" + c.config.Labels[k]; }).join(","),
		Mounts: (c.hote.montages || []).map(function(m){ return m.type === "volume" ? (m.source.length > 15 ? m.source.substring(0, 15) + "…" : m.source) : m.source; }).join(","), Networks: reseaux.join(","), LocalVolumes: String((c.hote.montages || []).filter(function(m){ return m.type === "volume"; }).length) };
}
var ENTETES_PS_PORT = { ID: "CONTAINER ID", Image: "IMAGE", Command: "COMMAND", CreatedAt: "CREATED AT", RunningFor: "CREATED", Ports: "PORTS", State: "STATE", Status: "STATUS", Size: "SIZE", Names: "NAMES", Labels: "LABELS", Mounts: "MOUNTS", Networks: "NETWORKS", LocalVolumes: "LOCAL VOLUMES" };
function filtrerConteneursPort(h, liste, filtres){
	return liste.filter(function(c){
		return filtres.every(function(f){
			var i = f.indexOf("="), k = f.substring(0, i), v = f.substring(i + 1);
			switch (k){
				case "status": return c.etat.statut === v;
				case "name": return new RegExp(v.replace(/^\^?/, "")).test(c.nom);
				case "id": return c.id.indexOf(v) === 0;
				case "ancestor": { var im = imagePort(h, v); return (im && c.image === im.id) || c.imageRef === v; }
				case "label": { var j = v.indexOf("="); return j > 0 ? (c.config.Labels || {})[v.substring(0, j)] === v.substring(j + 1) : (c.config.Labels || {}).hasOwnProperty(v); }
				case "exited": return c.etat.statut === "exited" && c.etat.code === +v;
				case "health": return (c.etat.sante ? c.etat.sante.statut : "none") === v;
				case "network": return (c.reseaux || {}).hasOwnProperty(v);
				case "volume": return (c.hote.montages || []).some(function(m){ return m.source === v || m.cible === v; });
				case "publish": return portsPubliesPort(h, c).some(function(p){ return String(p.hp) === v.split("/")[0]; });
				case "expose": return Object.keys(c.config.ExposedPorts || {}).some(function(p){ return p.split("/")[0] === v.split("/")[0]; });
				case "is-task": return !!c.swarm === (v === "true");
				default: throw new ShellError("Error response from daemon: invalid filter '" + k + "'", 1);
			}
		});
	});
}
function psPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet", l: "latest", n: "last", s: "size", f: "filter" }, valeurs: ["filter", "format", "last"], booleens: ["all", "quiet", "latest", "size", "no-trunc"], repetables: ["filter"] }, "ps");
	accesDemonPort(h, io, "containers/json");
	var liste = conteneursPort(h);
	var filtres = listePort(d.o.filter);
	if (!d.o.all && !filtres.some(function(f){ return /^status=/.test(f) || /^exited=/.test(f); })) liste = liste.filter(enMarchePort).concat(liste.filter(function(c){ return c.etat.statut === "restarting"; }));
	if (d.o.all || filtres.some(function(f){ return /^status=/.test(f) || /^exited=/.test(f); })) liste = conteneursPort(h);
	liste = filtrerConteneursPort(h, liste, filtres);
	if (!d.o.all && !filtres.length) liste = liste.filter(function(c){ return enMarchePort(c) || c.etat.statut === "restarting"; });
	if (d.o.latest) liste = conteneursPort(h).slice(0, 1);
	if (d.o.last) liste = conteneursPort(h).slice(0, +d.o.last);
	evenementPort(h, "ps", { tous: !!d.o.all, quiet: !!d.o.quiet, format: d.o.format || null, filtres: filtres, nombre: liste.length, conteneurs: liste.map(function(c){ return { nom: c.nom, statut: c.etat.statut, code: c.etat.code }; }) });
	if (d.o.quiet) return liste.map(function(c){ return d.o["no-trunc"] ? c.id : c.id.substring(0, 12); }).join("\n");
	if (d.o.format) return formaterListePort(d.o.format, liste.map(function(c){ return objetPsPort(h, c); }), ENTETES_PS_PORT);
	var lignes = liste.map(function(c){
		return [d.o["no-trunc"] ? c.id : c.id.substring(0, 12), c.imageRef, d.o["no-trunc"] ? commandePsPort(c, false) : commandePsPort(c, true), ilYaPort(h, c.cree), texteStatutPort(h, c), textePortsPort(h, c), c.nom].concat(d.o.size ? [tailleDockerPort(tailleDiffPort(c)) + " (virtual " + tailleDockerPort(tailleImagePort(h, imageDuConteneurPort(h, c) || { couches: [] }) + tailleDiffPort(c)) + ")"] : []);
	});
	return tableauPort(["CONTAINER ID", "IMAGE", "COMMAND", "CREATED", "STATUS", "PORTS", "NAMES"].concat(d.o.size ? ["SIZE"] : []), lignes);
}
function tailleDiffPort(c){ var t = 0; Object.keys(c.diff || {}).forEach(function(p){ var e = c.diff[p].e; if (e && e.t === "f") t += e.s || 0; }); return t; }

/* ================================================================== */
/* start, stop, restart, kill, rm, pause                                */
/* ================================================================== */

var SIGNAUX_PORT = { HUP: 1, INT: 2, QUIT: 3, KILL: 9, USR1: 10, USR2: 12, TERM: 15 };
function numeroSignalPort(s){ if (!s) return 15; if (/^\d+$/.test(s)) return +s; return SIGNAUX_PORT[String(s).toUpperCase().replace(/^SIG/, "")] || null; }
function startPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "attach", i: "interactive" }, booleens: ["attach", "interactive"] }, "start");
	if (!d.reste.length) throw new ShellError("\"docker start\" requires at least 1 argument.\nSee 'docker start --help'.\n\nUsage:  docker start [OPTIONS] CONTAINER [CONTAINER...]\n\nStart one or more stopped containers", 1);
	accesDemonPort(h, io, "containers/start");
	var sortie = [], echecs = [];
	d.reste.forEach(function(ref){
		var c = conteneurPort(h, ref);
		if (!c || c.ambigu){ io.err("Error response from daemon: No such container: " + ref); echecs.push(ref); return; }
		if (enMarchePort(c)){ sortie.push(ref); return; }
		c.etat.arreteMain = false;
		var r = demarrerConteneurPort(h, c, {});
		evenementPort(h, "start", { conteneur: c.nom, id: c.id, ok: r.ok });
		if (!r.ok){ io.err(r.erreur.replace(/^docker: /, "")); echecs.push(ref); return; }
		if (d.o.attach || d.o.interactive){
			if (c.programme && c.programme.type === "shell-interactif" && d.o.interactive){ ouvrirSessionPort(h, c, { principale: true }); return; }
			sortie.push(c.journaux.map(function(j){ return j.l; }).join("\n"));
			if (!enMarchePort(c)) io.code = c.etat.code;
			return;
		}
		sortie.push(ref);
	});
	if (echecs.length){ io.err("Error: failed to start containers: " + echecs.join(", ")); io.code = 1; }
	return sortie.join("\n");
}
function stopPort(h, a, io, action){
	var d = lireDrapeauxPort(a, { court: { t: "time", s: "signal" }, valeurs: ["time", "timeout", "signal"] }, action);
	if (!d.reste.length) throw new ShellError("\"docker " + action + "\" requires at least 1 argument.\nSee 'docker " + action + " --help'.\n\nUsage:  docker " + action + " [OPTIONS] CONTAINER [CONTAINER...]", 1);
	accesDemonPort(h, io, "containers/" + action);
	var sortie = [];
	d.reste.forEach(function(ref){
		var c = conteneurPort(h, ref);
		if (!c || c.ambigu){ io.err("Error response from daemon: No such container: " + ref); io.code = 1; return; }
		if (action === "kill"){
			if (!enMarchePort(c)){ io.err("Error response from daemon: cannot kill container: " + ref + ": container " + c.id + " is not running"); io.code = 1; return; }
			var sig = numeroSignalPort(d.o.signal || "KILL");
			if (sig === null){ io.err("Error response from daemon: Invalid signal: " + d.o.signal); io.code = 1; return; }
			evenementDockerPort(h, "container", "kill", c.id, { image: c.imageRef, name: c.nom, signal: String(sig) });
			arreterConteneurPort(h, c, { signal: sig, kill: true });
			if (c.swarm) {} else if (c.hote.restart.nom === "always" || c.hote.restart.nom === "unless-stopped" || c.hote.restart.nom === "on-failure"){ /* un kill n'est pas un arrêt « à la main » pour on-failure */ }
			evenementPort(h, "kill", { conteneur: c.nom, id: c.id, signal: sig });
			sortie.push(ref);
			return;
		}
		if (action === "restart"){
			if (enMarchePort(c)) arreterConteneurPort(h, c, { signal: numeroSignalPort(c.config.StopSignal) || 15, garder: true });
			c.etat.arreteMain = false;
			c.etat.redemarrages = c.etat.redemarrages || 0;
			var r = demarrerConteneurPort(h, c, {});
			evenementDockerPort(h, "container", "restart", c.id, { image: c.imageRef, name: c.nom });
			evenementPort(h, "restart", { conteneur: c.nom, id: c.id, ok: r.ok });
			if (!r.ok){ io.err(r.erreur.replace(/^docker: /, "")); io.code = 1; return; }
			sortie.push(ref);
			return;
		}
		var sig2 = d.o.signal ? numeroSignalPort(d.o.signal) : (numeroSignalPort(c.config.StopSignal) || 15);
		var etaitEnMarche = enMarchePort(c) || c.etat.statut === "restarting";
		arreterConteneurPort(h, c, { signal: sig2 });
		c.etat.arreteMain = true;
		evenementPort(h, "stop", { conteneur: c.nom, id: c.id, etaitEnMarche: etaitEnMarche });
		sortie.push(ref);
	});
	return sortie.join("\n");
}
function rmPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "force", v: "volumes", l: "link" }, booleens: ["force", "volumes", "link"] }, "rm");
	if (!d.reste.length) throw new ShellError("\"docker rm\" requires at least 1 argument.\nSee 'docker rm --help'.\n\nUsage:  docker rm [OPTIONS] CONTAINER [CONTAINER...]\n\nRemove one or more containers", 1);
	accesDemonPort(h, io, "containers/delete");
	var sortie = [];
	d.reste.forEach(function(ref){
		var c = conteneurPort(h, ref);
		if (!c || c.ambigu){ io.err("Error response from daemon: No such container: " + ref); io.code = 1; return; }
		if (enMarchePort(c) || c.etat.statut === "restarting"){
			if (!d.o.force){ io.err("Error response from daemon: cannot remove container \"/" + c.nom + "\": container is " + (c.etat.statut === "restarting" ? "restarting" : "running") + ": stop the container before removing or force remove"); io.code = 1; return; }
			evenementDockerPort(h, "container", "kill", c.id, { image: c.imageRef, name: c.nom, signal: "9" });
			arreterConteneurPort(h, c, { signal: 9, kill: true, garder: true });
		}
		if (c.swarm){ io.err("Error response from daemon: cannot remove container \"/" + c.nom + "\": container is a swarm task; remove the service instead"); }
		supprimerConteneurPort(h, c, !!d.o.volumes);
		evenementPort(h, "rm", { conteneur: c.nom, id: c.id, image: c.image, volumes: !!d.o.volumes });
		sortie.push(ref);
	});
	return sortie.join("\n");
}
function pausePort(h, a, io, action){
	accesDemonPort(h, io);
	return a.map(function(ref){
		var c = conteneurOuErreurPort(h, ref);
		if (action === "pause"){ if (!enMarchePort(c)) throw new ShellError("Error response from daemon: container " + c.id + " is not running", 1); c.etat.statut = "paused"; evenementDockerPort(h, "container", "pause", c.id, { image: c.imageRef, name: c.nom }); }
		else { if (c.etat.statut !== "paused") throw new ShellError("Error response from daemon: container " + c.id + " is not paused", 1); c.etat.statut = "running"; evenementDockerPort(h, "container", "unpause", c.id, { image: c.imageRef, name: c.nom }); }
		return ref;
	}).join("\n");
}
function conteneurPrunePort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force"], valeurs: ["filter"], repetables: ["filter"] }, "container prune");
	accesDemonPort(h, io);
	var faire = function(){
		var arretes = conteneursPort(h).filter(function(c){ return c.etat.statut === "exited" || c.etat.statut === "created" || c.etat.statut === "dead"; });
		listePort(d.o.filter).forEach(function(f){ var m = /^until=(.+)$/.exec(f); if (m){ var t = lireInstantPort(h, m[1]); arretes = arretes.filter(function(c){ return c.cree < t; }); } });
		var gain = 0;
		arretes.forEach(function(c){ gain += tailleDiffPort(c); supprimerConteneurPort(h, c, false); });
		evenementPort(h, "prune", { quoi: "conteneurs", supprimes: arretes.map(function(c){ return c.nom; }) });
		return (arretes.length ? "Deleted Containers:\n" + arretes.map(function(c){ return c.id; }).join("\n") + "\n\n" : "") + "Total reclaimed space: " + tailleDockerPort(gain);
	};
	if (d.o.force) return faire();
	return demanderConfirmationPort("WARNING! This will remove all stopped containers.\nAre you sure you want to continue? [y/N] ", faire, io);
}
/* Une confirmation [y/N] à l'écran. */
function demanderConfirmationPort(question, faire, io){
	if (!io.tty || !term || !term.demander) throw new ShellError(question.split("\n")[0] + "\nError: aborting: confirmation needed (ajoute -f).", 1);
	term.demander(question, false, function(rep){
		if (/^y(es)?$/i.test(String(rep).trim())){ try { term.echo(faire()); } catch (e){ if (e instanceof ShellError) term.echo(e.message); else throw e; } }
		Shell.fin();
	});
	return "";
}

/* ================================================================== */
/* logs                                                                 */
/* ================================================================== */

function logsPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "follow", t: "timestamps", n: "tail" }, valeurs: ["tail", "since", "until"], booleens: ["follow", "timestamps", "details"] }, "logs");
	if (d.reste.length !== 1) throw new ShellError("\"docker logs\" requires exactly 1 argument.\nSee 'docker logs --help'.\n\nUsage:  docker logs [OPTIONS] CONTAINER\n\nFetch the logs of a container", 1);
	accesDemonPort(h, io, "containers/logs");
	var c = conteneurOuErreurPort(h, d.reste[0]);
	if (!journauxLisiblesPort(c)) throw new ShellError("Error response from daemon: configured logging driver does not support reading", 1);
	var l = c.journaux.slice();
	if (d.o.since){ var t1 = lireInstantPort(h, d.o.since); if (isNaN(t1)) throw new ShellError("invalid value for \"since\": failed to parse value as time or duration: \"" + d.o.since + "\"", 1); l = l.filter(function(x){ return x.t >= t1; }); }
	if (d.o.until){ var t2 = lireInstantPort(h, d.o.until); l = l.filter(function(x){ return x.t <= t2; }); }
	if (d.o.tail !== undefined && d.o.tail !== "all"){ var n = parseInt(d.o.tail, 10); if (isNaN(n)) throw new ShellError("invalid value for \"tail\": " + d.o.tail, 1); l = n === 0 ? [] : l.slice(-n); }
	var ligne = function(x){ return (d.o.timestamps ? dateIsoPort(x.t).replace(/Z$/, "") + "Z " : "") + x.l; };
	evenementPort(h, "logs", { conteneur: c.nom, id: c.id, suivre: !!d.o.follow, queue: d.o.tail || null, depuis: d.o.since || null, lignes: l.length, texte: l.map(function(x){ return x.l; }).join("\n") });
	var fin = d.o.follow && enMarchePort(c) ? astuce(io, "docker logs -f suit le journal en direct jusqu'à Ctrl+C ; ici, le jeu te rend la main.") : "";
	if (io.tty) return l.map(ligne).join("\n") + fin;
	var err = l.filter(function(x){ return x.s === "stderr"; });
	if (err.length) io.err(err.map(ligne).join("\n"));
	return l.filter(function(x){ return x.s !== "stderr"; }).map(ligne).join("\n");
}

/* ================================================================== */
/* exec                                                                 */
/* ================================================================== */

function execPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { i: "interactive", t: "tty", d: "detach", u: "user", e: "env", w: "workdir" }, valeurs: ["user", "env", "workdir", "env-file"], booleens: ["interactive", "tty", "detach", "privileged"], repetables: ["env"] }, "exec", true);
	if (d.reste.length < 2) throw new ShellError("\"docker exec\" requires at least 2 arguments.\nSee 'docker exec --help'.\n\nUsage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]\n\nExecute a command in a running container", 1);
	accesDemonPort(h, io, "exec");
	var c = conteneurOuErreurPort(h, d.reste[0]);
	if (!enMarchePort(c)) throw new ShellError("Error response from daemon: container " + c.id + " is not running", 1);
	if (c.etat.statut === "paused") throw new ShellError("Error response from daemon: container " + c.id + " is paused, unpause the container before exec", 1);
	var argv = d.reste.slice(1), execId = hexDe("exec:" + c.id + ":" + state.nbCommandes, 64);
	var opts = { env: listePort(d.o.env), cwd: d.o.workdir ? cheminNormal(d.o.workdir) : undefined, userDemande: d.o.user };
	if (d.o.user !== undefined){
		var u = utilisateurConteneurPort(h, c, d.o.user);
		if (u.erreur) throw new ShellError("Error response from daemon: " + u.erreur, 126);
		opts.user = u;
	}
	evenementDockerPort(h, "container", "exec_create: " + argv.join(" "), c.id, { execID: execId, image: c.imageRef, name: c.nom });
	evenementDockerPort(h, "container", "exec_start: " + argv.join(" "), c.id, { execID: execId, image: c.imageRef, name: c.nom });
	var estShell = /^(\/bin\/|\/usr\/bin\/)?(sh|ash|bash|dash)$/.test(argv[0]) && argv.length === 1;
	if (estShell && d.o.interactive && d.o.tty){
		var ctx0 = contexteShellPort(h, c, opts);
		var p = trouverProgrammePort(ctx0, argv[0]);
		if (!p) throw new ShellError("OCI runtime exec failed: exec failed: unable to start container process: exec: \"" + argv[0] + "\": executable file not found in $PATH: unknown", 126);
		var quel = argv[0].split("/").pop(), impl = implementationPort(p, argv[0]);
		var sh = quel === "bash" ? "bash" : (impl.style === "gnu" || (p.e.x === "dash") ? "dash" : (impl.nom === "sh" && impl.style === "busybox" ? "ash" : ctx0.sh));
		if (quel === "sh" && p.e.x === "dash") sh = "dash";
		ouvrirSessionPort(h, c, { user: opts.user, env: opts.env, cwd: opts.cwd, sh: sh, argv0: quel === "bash" ? "bash" : "/bin/sh", execId: execId, cmd: argv[0] });
		evenementPort(h, "exec", { conteneur: c.nom, id: c.id, argv: argv, interactif: true, user: (opts.user || {}).uid });
		return "";
	}
	var stdin = d.o.interactive ? io.stdin : null;
	var r = executerArgvPort(h, c, argv, { env: opts.env, cwd: opts.cwd, user: opts.user, stdin: stdin, tty: !!d.o.tty });
	if (r.erreurOci){
		evenementPort(h, "exec", { conteneur: c.nom, id: c.id, argv: argv, code: r.code, introuvable: true });
		throw new ShellError("OCI runtime exec failed: exec failed: unable to start container process: " + r.erreurOci + ": unknown", r.code);
	}
	evenementDockerPort(h, "container", "exec_die", c.id, { execID: execId, exitCode: String(r.code), image: c.imageRef, name: c.nom });
	evenementPort(h, "exec", { conteneur: c.nom, id: c.id, argv: argv, code: r.code, sortie: r.sortie, erreurs: r.erreurs, user: r.ctx ? r.ctx.user.uid : 0, env: r.ctx ? r.ctx.env : null });
	io.code = r.code;
	if (d.o.detach) return "";
	if (io.tty) return r.melee.replace(/\n$/, "");
	if (r.erreurs) io.err(r.erreurs.replace(/\n$/, ""));
	return r.sortie.replace(/\n$/, "");
}

/* ================================================================== */
/* inspect                                                              */
/* ================================================================== */

function inspectConteneurPort(h, c){
	var img = imageDuConteneurPort(h, c), st = c.etat;
	var reseaux = { __table: true };
	Object.keys(c.reseaux || {}).forEach(function(n){
		var x = c.reseaux[n], r = reseauPort(h, n);
		reseaux[n] = { IPAMConfig: null, Links: null, Aliases: x.alias && x.alias.length ? x.alias.slice() : null, MacAddress: x.mac || "", DriverOpts: null, NetworkID: x.id, EndpointID: enMarchePort(c) ? x.endpoint : "",
			Gateway: enMarchePort(c) ? x.passerelle : "", IPAddress: enMarchePort(c) ? x.ip : "", IPPrefixLen: enMarchePort(c) && x.ip ? +(r && r.sousReseau ? r.sousReseau.split("/")[1] : 16) : 0, IPv6Gateway: "", GlobalIPv6Address: "", GlobalIPv6PrefixLen: 0,
			DNSNames: r && !r.defaut ? [c.nom, c.id.substring(0, 12)].concat(x.alias || []).filter(function(v, i, t){ return t.indexOf(v) === i; }) : null };
	});
	var defaut = c.reseaux && c.reseaux.bridge;
	var ports = { __table: true };
	Object.keys(c.config.ExposedPorts || {}).forEach(function(k){ ports[k] = null; });
	if (enMarchePort(c)) portsPubliesPort(h, c).forEach(function(p){ var k = p.cp + "/" + p.proto; ports[k] = (ports[k] || []).concat(p.ip ? [{ HostIp: p.ip, HostPort: String(p.hp) }] : [{ HostIp: "0.0.0.0", HostPort: String(p.hp) }, { HostIp: "::", HostPort: String(p.hp) }]); });
	var liaisons = { __table: true };
	(c.hote.ports || []).forEach(function(p){ var k = p.cp + "/" + p.proto; liaisons[k] = (liaisons[k] || []).concat([{ HostIp: p.ip || "", HostPort: p.hp === null || p.hp === undefined ? "" : String(p.hp) }]); });
	var tmpfs = Object.keys(c.hote.tmpfs || {}).length ? (function(){ var t = { __table: true }; Object.keys(c.hote.tmpfs).forEach(function(k){ t[k] = c.hote.tmpfs[k]; }); return t; })() : null;
	var sante = st.sante ? { Status: st.sante.statut, FailingStreak: st.sante.echecs, Log: (st.sante.journal || []).map(function(j){ return { Start: j.Start, End: j.End, ExitCode: j.ExitCode, Output: j.Output }; }) } : undefined;
	var etat = { Status: st.statut === "restarting" ? "restarting" : st.statut, Running: enMarchePort(c) || st.statut === "restarting", Paused: st.statut === "paused", Restarting: st.statut === "restarting", OOMKilled: !!st.oom, Dead: false,
		Pid: st.pid || 0, ExitCode: st.code || 0, Error: st.erreur || "", StartedAt: st.debut ? dateIsoPort(st.debut) : "0001-01-01T00:00:00Z", FinishedAt: st.fin ? dateIsoPort(st.fin) : "0001-01-01T00:00:00Z" };
	if (sante) etat.Health = sante;
	var argv = (c.config.Entrypoint || []).concat(c.config.Cmd || []);
	var o = {
		Id: c.id, Created: dateIsoPort(c.cree), Path: argv[0] || "", Args: argv.slice(1), State: etat, Image: "sha256:" + c.image,
		ResolvConfPath: "/var/lib/docker/containers/" + c.id + "/resolv.conf", HostnamePath: "/var/lib/docker/containers/" + c.id + "/hostname", HostsPath: "/var/lib/docker/containers/" + c.id + "/hosts",
		LogPath: c.hote.log.type === "json-file" ? "/var/lib/docker/containers/" + c.id + "/" + c.id + "-json.log" : "", Name: "/" + c.nom, RestartCount: st.redemarrages || 0, Driver: "overlay2", Platform: "linux",
		MountLabel: "", ProcessLabel: "", AppArmorProfile: c.hote.privileged ? "unconfined" : "docker-default", ExecIDs: null,
		HostConfig: { Binds: (c.hote.montages || []).filter(function(m){ return !m.anonyme && !m.viaMount; }).map(function(m){ return m.source + ":" + m.cible + (m.ro ? ":ro" : ""); }), ContainerIDFile: "",
			LogConfig: { Type: c.hote.log.type, Config: (function(){ var t = { __table: true }; Object.keys(c.hote.log.opts || {}).forEach(function(k){ t[k] = String(c.hote.log.opts[k]); }); return t; })() },
			NetworkMode: c.hote.reseau === "default" ? "bridge" : c.hote.reseau, PortBindings: liaisons, RestartPolicy: { Name: c.hote.restart.nom, MaximumRetryCount: c.hote.restart.max || 0 }, AutoRemove: !!c.hote.autoRemove,
			VolumeDriver: "", VolumesFrom: null, ConsoleSize: [0, 0], CapAdd: c.hote.capAdd.length ? c.hote.capAdd.slice() : null, CapDrop: c.hote.capDrop.length ? c.hote.capDrop.slice() : null, CgroupnsMode: "private", Dns: [], DnsOptions: [], DnsSearch: [],
			ExtraHosts: c.hotesExtra || null, GroupAdd: null, IpcMode: "private", Cgroup: "", Links: null, OomScoreAdj: 0, PidMode: "", Privileged: !!c.hote.privileged, PublishAllPorts: !!c.hote.publierTout,
			ReadonlyRootfs: !!c.hote.readOnly, SecurityOpt: c.hote.secOpt.length ? c.hote.secOpt.slice() : null, Tmpfs: tmpfs, UTSMode: "", UsernsMode: c.hote.userns ? "" : "", ShmSize: 67108864, Runtime: "runc", Isolation: "",
			CpuShares: 0, Memory: c.hote.memoire || 0, NanoCpus: Math.round((c.hote.cpus || 0) * 1e9), CgroupParent: "", BlkioWeight: 0, CpuPeriod: 0, CpuQuota: 0, CpusetCpus: "", CpusetMems: "", Devices: [],
			MemoryReservation: 0, MemorySwap: c.hote.memoire ? c.hote.memoire * 2 : 0, MemorySwappiness: null, OomKillDisable: null, PidsLimit: c.hote.pidsLimit || null, Ulimits: [], MaskedPaths: c.hote.privileged ? null : ["/proc/asound", "/proc/acpi", "/proc/kcore", "/proc/keys", "/proc/latency_stats", "/proc/timer_list", "/proc/timer_stats", "/proc/sched_debug", "/proc/scsi", "/sys/firmware", "/sys/devices/virtual/powercap"],
			ReadonlyPaths: c.hote.privileged ? null : ["/proc/bus", "/proc/fs", "/proc/irq", "/proc/sys", "/proc/sysrq-trigger"], Init: c.hote.init ? true : null },
		GraphDriver: { Data: { __table: true, LowerDir: "/var/lib/docker/overlay2/" + hexDe("upper" + c.id, 64) + "-init/diff:" + (img ? img.couches.slice().reverse().map(function(id){ return "/var/lib/docker/overlay2/" + hexDe("cache:" + id, 64) + "/diff"; }).join(":") : ""),
			MergedDir: "/var/lib/docker/overlay2/" + hexDe("upper" + c.id, 64) + "/merged", UpperDir: "/var/lib/docker/overlay2/" + hexDe("upper" + c.id, 64) + "/diff", WorkDir: "/var/lib/docker/overlay2/" + hexDe("upper" + c.id, 64) + "/work" }, Name: "overlay2" },
		Mounts: (c.hote.montages || []).map(function(m){
			if (m.type === "volume") return { Type: "volume", Name: m.source, Source: cheminVolumePort(m.source).replace(/^/, "") ? "/var/lib/docker/volumes/" + m.source + "/_data" : "", Destination: m.cible, Driver: "local", Mode: m.ro ? "ro" : "z", RW: !m.ro, Propagation: "" };
			return { Type: "bind", Source: m.source, Destination: m.cible, Mode: m.ro ? "ro" : "", RW: !m.ro, Propagation: "rprivate" };
		}).concat(Object.keys(c.hote.tmpfs || {}).map(function(t){ return { Type: "tmpfs", Source: "", Destination: t, Mode: "", RW: true, Propagation: "" }; })),
		Config: { Hostname: c.config.Hostname, Domainname: "", User: c.config.User || "", AttachStdin: !!c.config.AttachStdin, AttachStdout: !!c.config.AttachStdout, AttachStderr: !!c.config.AttachStderr,
			ExposedPorts: Object.keys(c.config.ExposedPorts || {}).length ? (function(){ var t = { __table: true }; Object.keys(c.config.ExposedPorts).forEach(function(k){ t[k] = {}; }); return t; })() : undefined,
			Tty: !!c.config.Tty, OpenStdin: !!c.config.OpenStdin, StdinOnce: !!c.config.StdinOnce, Env: c.config.Env.slice(), Cmd: c.config.Cmd ? c.config.Cmd.slice() : null,
			Healthcheck: c.config.Healthcheck ? healthcheckJsonPort(c.config.Healthcheck) : undefined, Image: c.imageRef, Volumes: c.config.Volumes ? (function(){ var t = { __table: true }; Object.keys(c.config.Volumes).forEach(function(k){ t[k] = {}; }); return t; })() : null,
			WorkingDir: c.config.WorkingDir || "", Entrypoint: c.config.Entrypoint ? c.config.Entrypoint.slice() : null, OnBuild: null, Labels: (function(){ var t = { __table: true }; Object.keys(c.config.Labels || {}).forEach(function(k){ t[k] = c.config.Labels[k]; }); return t; })(),
			StopSignal: c.config.StopSignal || undefined },
		NetworkSettings: { Bridge: "", SandboxID: enMarchePort(c) ? hexDe("sandbox" + c.id, 64) : "", SandboxKey: enMarchePort(c) ? "/var/run/docker/netns/" + hexDe("netns" + c.id, 12) : "", Ports: ports, HairpinMode: false, LinkLocalIPv6Address: "", LinkLocalIPv6PrefixLen: 0,
			SecondaryIPAddresses: null, SecondaryIPv6Addresses: null, EndpointID: defaut && enMarchePort(c) ? defaut.endpoint : "", Gateway: defaut && enMarchePort(c) ? defaut.passerelle : "", GlobalIPv6Address: "", GlobalIPv6PrefixLen: 0,
			IPAddress: defaut && enMarchePort(c) ? defaut.ip : "", IPPrefixLen: defaut && enMarchePort(c) ? 16 : 0, IPv6Gateway: "", MacAddress: defaut && enMarchePort(c) ? defaut.mac : "", Networks: reseaux }
	};
	if (o.Config.ExposedPorts === undefined) delete o.Config.ExposedPorts;
	if (o.Config.Healthcheck === undefined) delete o.Config.Healthcheck;
	if (o.Config.StopSignal === undefined) delete o.Config.StopSignal;
	if (!o.HostConfig.Tmpfs) delete o.HostConfig.Tmpfs;
	o.__type = "types.ContainerJSON";
	return o;
}
function healthcheckJsonPort(hc){
	var o = { Test: hc.Test.slice() };
	if (hc.Interval) o.Interval = hc.Interval; if (hc.Timeout) o.Timeout = hc.Timeout; if (hc.StartPeriod) o.StartPeriod = hc.StartPeriod; if (hc.Retries) o.Retries = hc.Retries;
	return o;
}
function inspectImagePort(h, img){
	var c = img.config || {};
	var t = function(m){ if (!m || !Object.keys(m).length) return null; var x = { __table: true }; Object.keys(m).forEach(function(k){ x[k] = m[k]; }); return x; };
	var cfg = { Hostname: "", Domainname: "", User: c.User || "", AttachStdin: false, AttachStdout: false, AttachStderr: false };
	if (c.ExposedPorts && Object.keys(c.ExposedPorts).length) cfg.ExposedPorts = t(c.ExposedPorts);
	cfg.Tty = false; cfg.OpenStdin = false; cfg.StdinOnce = false; cfg.Env = (c.Env || []).slice(); cfg.Cmd = c.Cmd ? c.Cmd.slice() : null;
	if (c.Healthcheck) cfg.Healthcheck = healthcheckJsonPort(c.Healthcheck);
	cfg.Image = ""; cfg.Volumes = t(c.Volumes); cfg.WorkingDir = c.WorkingDir || ""; cfg.Entrypoint = c.Entrypoint ? c.Entrypoint.slice() : null; cfg.OnBuild = null; cfg.Labels = t(c.Labels);
	if (c.StopSignal) cfg.StopSignal = c.StopSignal;
	var taille = tailleImagePort(h, img);
	var o = { Id: "sha256:" + img.id, RepoTags: (img.tags || []).slice(), RepoDigests: (img.digests || []).slice(), Parent: "", Comment: img.origine === "build" ? "buildkit.dockerfile.v0" : "", Created: img.cree, DockerVersion: "", Author: "",
		Config: cfg, Architecture: img.arch || "amd64", Os: img.os || "linux", Size: taille, GraphDriver: { Data: { __table: true, MergedDir: "/var/lib/docker/overlay2/" + hexDe("m" + img.id, 64) + "/merged", UpperDir: "/var/lib/docker/overlay2/" + hexDe("u" + img.id, 64) + "/diff", WorkDir: "/var/lib/docker/overlay2/" + hexDe("u" + img.id, 64) + "/work" }, Name: "overlay2" },
		RootFS: { Type: "layers", Layers: (img.couches || []).map(function(id){ return "sha256:" + id; }) }, Metadata: { LastTagTime: img.tagueA ? dateIsoPort(img.tagueA) : "0001-01-01T00:00:00Z" } };
	if (img.variante) o.Variant = img.variante;
	o.__type = "types.ImageInspect";
	return o;
}
function inspectVolumePort(h, v){
	var t = { __table: true }; Object.keys(v.labels || {}).forEach(function(k){ t[k] = v.labels[k]; });
	var o = { CreatedAt: dateEvenementPort(h, v.cree).replace(/\.\d+/, ""), Driver: "local", Labels: Object.keys(v.labels || {}).length ? t : null, Mountpoint: "/var/lib/docker/volumes/" + v.nom + "/_data", Name: v.nom, Options: Object.keys(v.options || {}).length ? v.options : null, Scope: "local" };
	o.__type = "volume.Volume";
	return o;
}
function inspectReseauPort(h, r){
	var conts = { __table: true };
	conteneursPort(h).forEach(function(c){ var x = c.reseaux && c.reseaux[r.nom]; if (x && enMarchePort(c)) conts[c.id] = { Name: c.nom, EndpointID: x.endpoint, MacAddress: x.mac, IPv4Address: x.ip ? x.ip + "/" + (r.sousReseau ? r.sousReseau.split("/")[1] : "16") : "", IPv6Address: "" }; });
	var opts = { __table: true }; Object.keys(r.options || {}).forEach(function(k){ opts[k] = r.options[k]; });
	var labels = { __table: true }; Object.keys(r.labels || {}).forEach(function(k){ labels[k] = r.labels[k]; });
	var o = { Name: r.nom, Id: r.id, Created: dateIsoPort(r.cree).replace("Z", "+02:00"), Scope: r.portee, Driver: r.pilote, EnableIPv6: false,
		IPAM: { Driver: "default", Options: r.defaut ? null : {}, Config: r.sousReseau ? [{ Subnet: r.sousReseau, Gateway: r.passerelle }] : [] }, Internal: !!r.interne, Attachable: !!r.attachable, Ingress: !!r.ingress,
		ConfigFrom: { Network: "" }, ConfigOnly: false, Containers: conts, Options: opts, Labels: labels };
	o.__type = "network.Inspect";
	return o;
}
function inspecterPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "format", s: "size" }, valeurs: ["format", "type"], booleens: ["size"] }, "inspect");
	if (!d.reste.length) throw new ShellError("\"docker inspect\" requires at least 1 argument.\nSee 'docker inspect --help'.\n\nUsage:  docker inspect [OPTIONS] NAME|ID [NAME|ID...]\n\nReturn low-level information on Docker objects", 1);
	accesDemonPort(h, io, "containers/json");
	var type = d.o.type || null, objets = [], manquants = [];
	d.reste.forEach(function(ref){
		var o = null, quoi = null;
		if (!type || type === "container"){ var c = conteneurPort(h, ref); if (c && !c.ambigu){ o = inspectConteneurPort(h, c); quoi = "conteneur"; } }
		if (!o && (!type || type === "image")){ var im = imagePort(h, ref); if (im){ o = inspectImagePort(h, im); quoi = "image"; } }
		if (!o && (!type || type === "volume")){ var v = volumePort(h, ref); if (v){ o = inspectVolumePort(h, v); quoi = "volume"; } }
		if (!o && (!type || type === "network")){ var r = reseauPort(h, ref); if (r){ o = inspectReseauPort(h, r); quoi = "reseau"; } }
		if (!o && typeof inspecterSwarmPort === "function" && (!type || ["service", "node", "secret", "task"].indexOf(type) > -1)){ var s = inspecterSwarmPort(h, ref, type); if (s){ o = s; quoi = "swarm"; } }
		if (o){ objets.push(o); evenementPort(h, "inspect", { ref: ref, quoi: quoi, format: d.o.format || null, objet: sansMetaPort(o) }); }
		else manquants.push(ref);
	});
	var sortie;
	if (d.o.format) sortie = objets.map(function(o){ return gabaritPort(d.o.format, o); }).join("\n");
	else sortie = jsonDockerPort(objets.map(sansMetaPort));
	if (manquants.length){
		io.err(manquants.map(function(m){ return "Error: No such " + (type || "object") + ": " + m; }).join("\n"));
		io.code = 1;
		if (!objets.length && !d.o.format) return "[]";
	}
	return sortie;
}

/* ================================================================== */
/* top, port, rename, wait, cp, diff, update, stats, events             */
/* ================================================================== */

function topPort(h, a, io){
	if (!a.length) throw new ShellError("\"docker top\" requires at least 1 argument.\nSee 'docker top --help'.\n\nUsage:  docker top CONTAINER [ps OPTIONS]\n\nDisplay the running processes of a container", 1);
	accesDemonPort(h, io);
	var c = conteneurOuErreurPort(h, a[0]);
	if (!enMarchePort(c)) throw new ShellError("Error response from daemon: container " + c.id + " is not running", 1);
	var procs = procsMachine(h).filter(function(p){ return p.conteneur === c.id && !p.shim && !p.proxy; });
	evenementPort(h, "top", { conteneur: c.nom, id: c.id, processus: procs.length });
	if (a.indexOf("aux") > -1 || a.indexOf("-aux") > -1){
		return tableauSerrePort(["USER", "PID", "%CPU", "%MEM", "VSZ", "RSS", "TTY", "STAT", "START", "TIME", "COMMAND"], procs.map(function(p){ var d = dateMachine(h, p.debut); return [p.user, p.pid, "0.0", "0.1", p.vsz, p.rss, "?", "Ss", deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()), "0:00", p.cmd]; }), 17).replace(/ {17}/g, function(x){ return x; });
	}
	var l = procs.map(function(p){ var d = dateMachine(h, p.debut); return [p.user, String(p.pid), String(p.ppid), "0", deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()), "?", "00:00:00", p.cmd]; });
	var ent = ["UID", "PID", "PPID", "C", "STIME", "TTY", "TIME", "CMD"];
	return [ent].concat(l).map(function(r){ return r.map(function(v, i){ return i < r.length - 1 ? completerDroite(v, 20) : v; }).join(""); }).join("\n");
}
function portPort(h, a, io){
	if (!a.length) throw new ShellError("\"docker port\" requires at least 1 argument.\nSee 'docker port --help'.\n\nUsage:  docker port CONTAINER [PRIVATE_PORT[/PROTO]]\n\nList port mappings or a specific mapping for the container", 1);
	accesDemonPort(h, io);
	var c = conteneurOuErreurPort(h, a[0]);
	var ps = enMarchePort(c) ? portsPubliesPort(h, c) : [];
	evenementPort(h, "port", { conteneur: c.nom, id: c.id, ports: ps });
	if (a[1]){
		var cp = +String(a[1]).split("/")[0], pr = String(a[1]).split("/")[1] || "tcp";
		var l = ps.filter(function(p){ return +p.cp === cp && p.proto === pr; });
		if (!l.length) throw new ShellError("Error: No public port '" + cp + "/" + pr + "' published for " + a[0], 1);
		return l.map(function(p){ return p.ip ? p.ip + ":" + p.hp : "0.0.0.0:" + p.hp + "\n[::]:" + p.hp; }).join("\n");
	}
	return ps.map(function(p){ var k = p.cp + "/" + p.proto; return p.ip ? k + " -> " + p.ip + ":" + p.hp : k + " -> 0.0.0.0:" + p.hp + "\n" + k + " -> [::]:" + p.hp; }).join("\n");
}
function renamePort(h, a, io){
	if (a.length !== 2) throw new ShellError("\"docker rename\" requires exactly 2 arguments.\nSee 'docker rename --help'.\n\nUsage:  docker rename CONTAINER NEW_NAME\n\nRename a container", 1);
	accesDemonPort(h, io);
	var c = conteneurOuErreurPort(h, a[0]);
	var autre = conteneurPort(h, a[1]);
	if (autre && autre !== c && !autre.ambigu) throw new ShellError("Error response from daemon: Error when allocating new name: Conflict. The container name \"/" + a[1] + "\" is already in use by container \"" + autre.id + "\". You have to remove (or rename) that container to be able to reuse that name.", 1);
	var ancien = c.nom;
	c.nom = a[1];
	evenementDockerPort(h, "container", "rename", c.id, { image: c.imageRef, name: c.nom, oldName: "/" + ancien });
	evenementPort(h, "rename", { id: c.id, ancien: ancien, nouveau: c.nom });
	return "";
}
function waitPort(h, a, io){
	if (!a.length) throw new ShellError("\"docker wait\" requires at least 1 argument.\nSee 'docker wait --help'.\n\nUsage:  docker wait CONTAINER [CONTAINER...]\n\nBlock until one or more containers stop, then print their exit codes", 1);
	accesDemonPort(h, io);
	return a.map(function(ref){
		var c = conteneurOuErreurPort(h, ref);
		if (enMarchePort(c)){
			var prog = c.programme || {};
			if (prog.finA !== undefined && prog.finA !== null){ conteneurMortPort(h, c, prog.codeFin || 0, "fin"); }
			else throw new ShellError(astuce(io, "docker wait attend que " + ref + " s'arrête ; il tourne sans fin prévue (son programme ne s'arrête pas de lui-même). Ctrl+C l'abandonnerait : ici, le jeu te rend la main.").replace(/^\n/, "") || "docker wait: container is still running", 1);
		}
		evenementPort(h, "wait", { conteneur: c.nom, id: c.id, code: c.etat.code });
		return String(c.etat.code);
	}).join("\n");
}
/* docker cp : entre un conteneur (même arrêté) et le disque de la machine. */
function cpPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "archive", L: "follow-link", q: "quiet" }, booleens: ["archive", "follow-link", "quiet"] }, "cp");
	if (d.reste.length !== 2) throw new ShellError("\"docker cp\" requires exactly 2 arguments.\nSee 'docker cp --help'.\n\nUsage:  docker cp [OPTIONS] CONTAINER:SRC_PATH DEST_PATH|-\n\tdocker cp [OPTIONS] SRC_PATH|- CONTAINER:DEST_PATH\n\nCopy files/folders between a container and the local filesystem", 1);
	accesDemonPort(h, io);
	var src = d.reste[0], dst = d.reste[1];
	var mS = /^([^\/:][^:]*):(.*)$/.exec(src), mD = /^([^\/:][^:]*):(.*)$/.exec(dst);
	if (mS && mD) throw new ShellError("copying between containers is not supported", 1);
	if (!mS && !mD) throw new ShellError("must specify at least one container source", 1);
	var octets = 0;
	if (mS){
		var c = conteneurOuErreurPort(h, mS[1]);
		var chemin = cheminNormal(mS[2].charAt(0) === "/" ? mS[2] : (c.config.WorkingDir || "/") + "/" + mS[2]);
		var fs = fsPort(h, c), r;
		try { r = resoudreCheminPort(fs, chemin, true); } catch (e){ r = { e: null }; }
		if (!r.e) throw new ShellError("Error response from daemon: Could not find the file " + chemin + " in container " + mS[1], 1);
		if (dst === "-"){ return r.e.c || ""; }
		var hcible = Shell.chercher(dst, io, "docker");
		var destDossier = hcible.node instanceof Room ? hcible.node : hcible.dir;
		var nom = hcible.node instanceof Room ? nomDe(chemin) : hcible.name;
		if (!destDossier) throw new ShellError("invalid output path: directory " + dossierDe(dst) + " does not exist", 1);
		if (!io.sudo && !Shell.bit(destDossier, "w", io)) throw new ShellError("open " + dst + ": permission denied", 1);
		var base = cheminDuLieuMachine(destDossier);
		(function copier(cs, ch, e){
			if (e.t === "d"){ var dd = creerDossierHote(h, ch, {}); if (dd){ dd.owner = io.sudo ? "root" : JOUEUR; dd.mode = e.m; } listerPort(fs, cs).forEach(function(n){ var p = cheminNormal(cs + "/" + n); copier(p, ch + "/" + n, entreeBrutePort(fs, p)); }); return; }
			var x = copieJson(e); delete x.hote;
			moteurSeul(function(){ var it = ecrireEntreeHotePort(h, ch, x); if (it){ it.owner = io.sudo ? nomHotePourUidPort(h, e.u) : JOUEUR; } });
			octets += e.s || octetsPort(e.c || "");
		})(r.chemin, cheminNormal(base + "/" + nom), r.e);
		evenementPort(h, "cp", { sens: "sortie", conteneur: c.nom, id: c.id, chemin: chemin, destination: cheminNormal(base + "/" + nom), demarre: !!c.etat.debut, image: c.image });
		return d.o.quiet ? "" : "Successfully copied " + tailleDockerPort(octets).replace("kB", "kB") + " to " + cheminNormal(base + "/" + nom);
	}
	var c2 = conteneurOuErreurPort(h, mD[1]);
	var cheminD = cheminNormal(mD[2].charAt(0) === "/" ? mD[2] : (c2.config.WorkingDir || "/") + "/" + mD[2]);
	var hsrc = Shell.chercher(src, io, "docker");
	if (!hsrc.node) throw new ShellError("lstat " + cheminNormal(cheminDuLieuMachine(hsrc.dir || current_room) + "/" + hsrc.name) + ": no such file or directory", 1);
	var fs2 = fsPort(h, c2), ed = null;
	try { ed = resoudreCheminPort(fs2, cheminD, true).e; } catch (e){}
	var racineDest = ed && ed.t === "d" ? cheminNormal(cheminD + "/" + (hsrc.node instanceof Room ? hsrc.node.room_name : hsrc.node.itemname)) : cheminD;
	try {
		(function copier(n, cible){
			if (n instanceof Room){
				ecrireEntreePort(fs2, null, cible, { t: "d", m: n.mode, u: uidHotePort(h, n.owner), g: uidHotePort(h, n.owner) }, { force: true });
				n.items.forEach(function(it){ copier(it, cible + "/" + it.itemname); });
				n.children.forEach(function(x){ if (x.parents[0] === n) copier(x, cible + "/" + x.room_name); });
				return;
			}
			var e = entreeDepuisHotePort(h, n); delete e.hote;
			ecrireEntreePort(fs2, null, cible, e, { force: true });
			octets += e.s || 0;
		})(hsrc.node, racineDest);
	} catch (x){ if (x instanceof ErreurFsPort) throw new ShellError("Error response from daemon: " + (x.code === "EROFS" ? "container rootfs is marked read-only" : "mkdir " + x.chemin + ": " + MESSAGES_FS_PORT[x.code]), 1); throw x; }
	evenementPort(h, "cp", { sens: "entree", conteneur: c2.nom, id: c2.id, chemin: racineDest });
	return d.o.quiet ? "" : "Successfully copied " + tailleDockerPort(octets) + " to " + c2.nom + ":" + racineDest;
}
function diffPort(h, a, io){
	if (a.length !== 1) throw new ShellError("\"docker diff\" requires exactly 1 argument.\nSee 'docker diff --help'.\n\nUsage:  docker diff CONTAINER\n\nInspect changes to files or directories on a container's filesystem", 1);
	accesDemonPort(h, io);
	var c = conteneurOuErreurPort(h, a[0]);
	var l = diffConteneurPort(c);
	evenementPort(h, "diff", { conteneur: c.nom, id: c.id, lignes: l, demarre: !!c.etat.debut, image: c.image });
	return l.join("\n");
}
function updatePort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { m: "memory" }, valeurs: ["memory", "cpus", "restart", "pids-limit", "memory-swap", "cpu-shares"] }, "update");
	if (!d.reste.length) throw new ShellError("\"docker update\" requires at least 1 argument.\nSee 'docker update --help'.\n\nUsage:  docker update [OPTIONS] CONTAINER [CONTAINER...]\n\nUpdate configuration of one or more containers", 1);
	accesDemonPort(h, io);
	return d.reste.map(function(ref){
		var c = conteneurOuErreurPort(h, ref);
		if (d.o.memory){
			var m = memoireDepuisPort(d.o.memory);
			if (m === null) throw new ShellError("invalid argument \"" + d.o.memory + "\" for \"-m, --memory\" flag: invalid size: '" + d.o.memory + "'", 125);
			if (m < 6 * 1048576) throw new ShellError("Error response from daemon: Cannot update container " + c.id + ": Minimum memory limit allowed is 6MB", 1);
			if (enMarchePort(c) && m < c.memoire) throw new ShellError("Error response from daemon: Cannot update container " + c.id + ": Memory limit should be larger than already set memory usage", 1);
			c.hote.memoire = m;
		}
		if (d.o.cpus) c.hote.cpus = parseFloat(d.o.cpus);
		if (d.o["pids-limit"]) c.hote.pidsLimit = +d.o["pids-limit"];
		if (d.o.restart){ var mr = /^(no|always|unless-stopped|on-failure)(?::(\d+))?$/.exec(d.o.restart); if (!mr) throw new ShellError("Error response from daemon: invalid restart policy", 1); c.hote.restart = { nom: mr[1], max: mr[2] ? +mr[2] : 0 }; }
		evenementDockerPort(h, "container", "update", c.id, { image: c.imageRef, name: c.nom });
		evenementPort(h, "update", { conteneur: c.nom, id: c.id, memoire: c.hote.memoire, cpus: c.hote.cpus, restart: c.hote.restart.nom, enMarche: enMarchePort(c) });
		return ref;
	}).join("\n");
}
function objetStatsPort(h, c){
	var M = etatMachine(h), total = (M.memoire ? M.memoire.total : 4026512) * 1024, lim = c.hote.memoire || total;
	var mem = enMarchePort(c) ? c.memoire || 0 : 0, cpu = enMarchePort(c) ? ((condense(c.id + (M.tics || 0)) % 90) / 100 + (c.programme && c.programme.type === "python-app" ? 0.4 : 0)) : 0;
	var req = (c.programme && c.programme.requetes) || 0;
	return { __type: "formatter.containerStatsContext", Container: c.id.substring(0, 12), Name: c.nom, ID: c.id, CPUPerc: cpu.toFixed(2) + "%", MemUsage: tailleBinPort(mem) + " / " + tailleBinPort(lim), MemPerc: (lim ? mem * 100 / lim : 0).toFixed(2) + "%",
		NetIO: tailleDockerPort(1090 + req * 610) + " / " + tailleDockerPort(req * 840), BlockIO: tailleDockerPort((c.journaux.length) * 120) + " / " + tailleDockerPort(tailleDiffPort(c) + 4096), PIDs: String(enMarchePort(c) ? ((c.programme && c.programme.processus) || []).length || 1 : 0) };
}
function statsPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all" }, booleens: ["all", "no-stream", "no-trunc"], valeurs: ["format"] }, "stats");
	accesDemonPort(h, io);
	var liste = d.reste.length ? d.reste.map(function(r){ return conteneurOuErreurPort(h, r); }) : conteneursPort(h).filter(function(c){ return d.o.all || enMarchePort(c); });
	var objets = liste.map(function(c){ return objetStatsPort(h, c); });
	evenementPort(h, "stats", { flux: !d.o["no-stream"], format: d.o.format || null, conteneurs: objets.map(function(o){ return { nom: o.Name, mem: o.MemUsage }; }) });
	var sortie = d.o.format ? formaterListePort(d.o.format, objets, { Container: "CONTAINER", Name: "NAME", ID: "CONTAINER ID", CPUPerc: "CPU %", MemUsage: "MEM USAGE / LIMIT", MemPerc: "MEM %", NetIO: "NET I/O", BlockIO: "BLOCK I/O", PIDs: "PIDS" }) :
		tableauSerrePort(["CONTAINER ID", "NAME", "CPU %", "MEM USAGE / LIMIT", "MEM %", "NET I/O", "BLOCK I/O", "PIDS"], objets.map(function(o){ return [o.Container, o.Name, o.CPUPerc, o.MemUsage, o.MemPerc, o.NetIO, o.BlockIO, o.PIDs]; }), 3);
	if (!d.o["no-stream"]) sortie += astuce(io, "docker stats se met à jour chaque seconde jusqu'à Ctrl+C ; ici, une seule mesure (comme --no-stream).");
	return sortie;
}
function eventsPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "filter" }, valeurs: ["since", "until", "filter", "format"], repetables: ["filter"] }, "events");
	accesDemonPort(h, io);
	var depuis = d.o.since !== undefined ? lireInstantPort(h, d.o.since) : null, jusqua = d.o.until !== undefined ? lireInstantPort(h, d.o.until) : null;
	if (depuis !== null && isNaN(depuis)) throw new ShellError("invalid value for \"since\": failed to parse value as time or duration: \"" + d.o.since + "\"", 1);
	var filtres = {};
	listePort(d.o.filter).forEach(function(f){ var i = f.indexOf("="); (filtres[f.substring(0, i)] = filtres[f.substring(0, i)] || []).push(f.substring(i + 1)); });
	var l = evenementsPort(h).filter(function(e){
		if (depuis !== null && e.t < depuis) return false;
		if (jusqua !== null && e.t > jusqua) return false;
		if (filtres.type && filtres.type.indexOf(e.type) === -1) return false;
		if (filtres.event && !filtres.event.some(function(v){ return e.action === v || e.action.indexOf(v + ":") === 0; })) return false;
		if (filtres.container && !filtres.container.some(function(v){ return e.id.indexOf(v) === 0 || e.attrs.name === v; })) return false;
		if (filtres.image && !filtres.image.some(function(v){ return e.attrs.image === v; })) return false;
		if (filtres.network && !filtres.network.some(function(v){ return e.attrs.name === v || e.id.indexOf(v) === 0; })) return false;
		if (filtres.volume && !filtres.volume.some(function(v){ return e.id === v; })) return false;
		return true;
	});
	if (depuis === null && jusqua === null) l = [];
	evenementPort(h, "events", { depuis: d.o.since || null, jusqua: d.o.until || null, filtres: listePort(d.o.filter), nombre: l.length });
	var texte = l.map(function(e){
		if (d.o.format) return gabaritPort(d.o.format, { __type: "events.Message", Type: e.type, Action: e.action, Actor: { ID: e.id, Attributes: (function(){ var t = { __table: true }; Object.keys(e.attrs).forEach(function(k){ t[k] = e.attrs[k]; }); return t; })() }, Status: e.action, ID: e.id, From: e.attrs.image || "", Time: Math.floor(e.t / 1000), TimeNano: e.t * 1e6 });
		var attrs = Object.keys(e.attrs).sort().map(function(k){ return k + "=" + e.attrs[k]; }).join(", ");
		return dateEvenementPort(h, e.t) + " " + e.type + " " + e.action + " " + e.id + (attrs ? " (" + attrs + ")" : "");
	}).join("\n");
	if (jusqua === null) texte += astuce(io, depuis === null ? "docker events attend les événements à venir, jusqu'à Ctrl+C. Pour ceux d'avant : docker events --since 30m --until 0s." : "Sans --until, docker events continue d'attendre la suite ; ici, le jeu te rend la main.");
	return texte.replace(/^\n/, "");
}

/* ================================================================== */
/* Les images : images, pull, push, tag, rmi, history, prune            */
/* ================================================================== */

/* Le registre d'un nom : le continent, ou un registre privé (entrepot). { ok, ec, hr, cr, erreur } */
function joindreRegistrePort(h, registre, auth){
	var hote = registre.split(":")[0], port = +(registre.split(":")[1] || 443);
	var nonSur = registresNonSursPort(h).indexOf(registre) > -1 || /^(localhost|127\.)/.test(hote);
	var hr = resoudreHotePort(hote, h);
	if (!hr) return { erreur: "Get \"https://" + registre + "/v2/\": dial tcp: lookup " + hote + " on 10.0.80.1:53: no such host" };
	if (h === "douane" && hr !== "douane") return { erreur: "Get \"https://" + registre + "/v2/\": dial tcp " + ipPort(hr) + ":" + port + ": connect: network is unreachable" };
	var ec = ecouteurHotePort(hr, port, h, false);
	if (!ec) return { erreur: "Get \"" + (nonSur ? "http" : "https") + "://" + registre + "/v2/\": dial tcp " + ipPort(hr) + ":" + port + ": connect: connection refused" };
	if (!nonSur) return { erreur: "Get \"https://" + registre + "/v2/\": http: server gave HTTP response to HTTPS client" };
	if (!ec.conteneur || !ec.conteneur.programme || ec.conteneur.programme.type !== "registry") return { erreur: "Get \"http://" + registre + "/v2/\": unexpected status code 404" };
	var a = authRegistrePort(ec.hote, ec.conteneur, auth);
	return { ok: true, hr: ec.hote, cr: ec.conteneur, auth: a, nonSur: nonSur };
}
/* Les identifiants enregistrés par docker login (~/.docker/config.json de l'utilisateur, sur cette machine). */
function cheminConfigDockerPort(h, io){ return (io && io.sudo ? "/root" : "/home/" + JOUEUR) + "/.docker/config.json"; }
function identifiantsPort(h, registre, io){
	var t = texteHote(h, cheminConfigDockerPort(h, io));
	if (!t) return null;
	try { var j = JSON.parse(t); var a = j.auths && j.auths[registre]; return a && a.auth ? decoderBase64(a.auth) : null; } catch (e){ return null; }
}
/* Tirer une image : { image, texte } ou { erreur }. */
function tirerImagePort(h, ref, io, silencieux){
	var a = analyserRefPort(ref);
	if (!a.valide) return { erreur: "invalid reference format" };
	var lignes = [];
	var resultat;
	if (a.registre === REGISTRE_CONTINENT_PORT){
		if (h === "douane") return { erreur: "Error response from daemon: Get \"https://" + REGISTRE_CONTINENT_PORT + "/v2/\": dial tcp 198.51.100.20:443: connect: network is unreachable" };
		var r = resoudreContinentPort(a.depot, a.tag, a.digest);
		if (r.erreur === "inconnu") return { erreur: "Error response from daemon: pull access denied for " + a.court + ", repository does not exist or may require 'docker login': denied: requested access to the resource is denied" };
		if (r.erreur) return { erreur: "Error response from daemon: manifest for " + a.court + ":" + (a.tag || a.digest) + " not found: manifest unknown: manifest unknown" };
		resultat = { image: r.image, digest: r.image.digestDepot, piege: r.piege };
	} else {
		var j = joindreRegistrePort(h, a.registre, identifiantsPort(h, a.registre, io));
		if (j.erreur) return { erreur: "Error response from daemon: " + j.erreur };
		if (!j.auth.ok) return { erreur: "Error response from daemon: Head \"http://" + a.registre + "/v2/" + a.depot + "/manifests/" + (a.digest || a.tag) + "\": no basic auth credentials" };
		var depot = a.depot;
		var x = imageDepuisRegistrePort(j.hr, j.cr, depot, a.digest || a.tag);
		if (!x) return { erreur: "Error response from daemon: manifest for " + a.court + ":" + (a.tag || a.digest) + " not found: manifest unknown: manifest unknown" };
		if (x.liste){
			var choix = (x.liste.manifests || []).filter(function(m){ return m.platform && m.platform.architecture === "amd64"; })[0];
			if (!choix) return { erreur: "Error response from daemon: no matching manifest for linux/amd64 in the manifest list entries" };
			x = imageDepuisRegistrePort(j.hr, j.cr, depot, choix.digest);
			x.digest = imageDepuisRegistrePort(j.hr, j.cr, depot, a.digest || a.tag).digest;
		}
		resultat = { image: x.image, digest: x.digest };
	}
	var deja = etatPort(h).images[resultat.image.id];
	var tagDeja = deja && a.tag && (deja.tags || []).indexOf(a.nomTag) > -1;
	var tagAffiche = a.tag || a.digest;
	lignes.push((a.digest && !a.tag ? a.digest : a.tag) + ": Pulling from " + (a.registre === REGISTRE_CONTINENT_PORT ? a.depot : a.depot));
	var nouvelles = 0;
	resultat.image.couches.forEach(function(id){
		var present = imagesPort(h).some(function(im){ return im.couches.indexOf(id) > -1; });
		lignes.push(blobPort(id).substring(0, 12) + ": " + (present ? "Already exists" : "Pull complete"));
		if (!present) nouvelles++;
		var couche = couchePort(h, id);
		if (couche && !COUCHES_PORT[id]) etatPort(h).couches[id] = couche;
	});
	var img = poserImagePort(h, resultat.image, a.tag ? a.nomTag : null, a.court + "@" + resultat.digest);
	if (a.tag) img.tagueA = maintenantPort(h);
	lignes.push("Digest: " + resultat.digest);
	lignes.push("Status: " + (deja && !nouvelles ? "Image is up to date for " : "Downloaded newer image for ") + nomCourtPort(ref));
	lignes.push(a.complet.replace(/^continent\.lan\//, REGISTRE_CONTINENT_PORT + "/"));
	if (deja && !nouvelles && !tagDeja) lignes = [(a.tag || a.digest) + ": Pulling from " + a.depot, "Digest: " + resultat.digest, "Status: Downloaded newer image for " + nomCourtPort(ref), a.complet];
	else if (deja && !nouvelles) lignes = [(a.tag || a.digest) + ": Pulling from " + a.depot, "Digest: " + resultat.digest, "Status: Image is up to date for " + nomCourtPort(ref), a.complet];
	evenementDockerPort(h, "image", "pull", nomCourtPort(ref), { name: a.court });
	evenementPort(h, "pull", { ref: nomCourtPort(ref), image: img.id, digest: resultat.digest, registre: a.registre, piege: !!resultat.piege });
	return { image: img, texte: lignes.join("\n"), digest: resultat.digest };
}
function pullPortCli(h, a, io){
	var d = lireDrapeauxPort(a, { court: { q: "quiet", a: "all-tags" }, booleens: ["quiet", "all-tags", "disable-content-trust"], valeurs: ["platform"] }, "pull");
	if (d.reste.length !== 1) throw new ShellError("\"docker pull\" requires exactly 1 argument.\nSee 'docker pull --help'.\n\nUsage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]\n\nDownload an image from a registry", 1);
	accesDemonPort(h, io, "images/create");
	if (/[A-Z]/.test(d.reste[0])) throw new ShellError("invalid reference format: repository name (" + d.reste[0] + ") must be lowercase", 1);
	if (d.o.platform && !/^linux\/amd64/.test(d.o.platform)){ if (!/^linux\/arm64/.test(d.o.platform)) throw new ShellError("Error response from daemon: no matching manifest for " + d.o.platform + " in the manifest list entries", 1); }
	var r = tirerImagePort(h, d.reste[0], io, false);
	if (r.erreur) throw new ShellError(r.erreur, 1);
	return d.o.quiet ? analyserRefPort(d.reste[0]).complet : r.texte;
}
function objetImagePort(h, im, tag){
	var depot = tag ? tag.substring(0, tag.lastIndexOf(":")) : (im.digests && im.digests.length ? im.digests[0].split("@")[0] : "<none>");
	var t = tag ? tag.substring(tag.lastIndexOf(":") + 1) : "<none>";
	var dg = (im.digests || []).filter(function(x){ return x.split("@")[0] === depot; })[0];
	return { __type: "formatter.imageContext", Repository: depot, Tag: t, ID: courtPort(im.id), Digest: dg ? dg.split("@")[1] : "<none>", CreatedSince: ilYaPort(h, Date.parse(im.cree) + DECALAGE_HISTOIRE * 3600000), CreatedAt: dateLocalePort(h, Date.parse(im.cree) + DECALAGE_HISTOIRE * 3600000), Size: tailleDockerPort(tailleImagePort(h, im)), Containers: "N/A", SharedSize: "N/A", UniqueSize: "N/A", VirtualSize: tailleDockerPort(tailleImagePort(h, im)) };
}
function imagesPortCli(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", q: "quiet", f: "filter" }, booleens: ["all", "quiet", "digests", "no-trunc", "tree"], valeurs: ["filter", "format"], repetables: ["filter"] }, "images");
	accesDemonPort(h, io, "images/json");
	var liste = imagesPort(h).slice().sort(function(x, y){ return Date.parse(y.cree) - Date.parse(x.cree) || (y.ajoute || 0) - (x.ajoute || 0); });
	var lignes = [];
	liste.forEach(function(im){ if ((im.tags || []).length) im.tags.forEach(function(t){ lignes.push({ im: im, tag: t }); }); else lignes.push({ im: im, tag: null }); });
	var filtres = listePort(d.o.filter);
	if (d.reste[0]){ var ra = analyserRefPort(d.reste[0]); lignes = lignes.filter(function(l){ return l.tag && (l.tag.split(":")[0] === ra.court && (d.reste[0].indexOf(":") === -1 || l.tag === ra.nomTag)); }); }
	filtres.forEach(function(f){
		var i = f.indexOf("="), k = f.substring(0, i), v = f.substring(i + 1);
		if (k === "dangling") lignes = lignes.filter(function(l){ return (!l.tag) === (v === "true"); });
		else if (k === "reference"){ var re = new RegExp("^" + v.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "(:.*)?$"); lignes = lignes.filter(function(l){ return l.tag && re.test(l.tag); }); }
		else if (k === "label"){ var j = v.indexOf("="); lignes = lignes.filter(function(l){ var lb = l.im.config.Labels || {}; return j > 0 ? lb[v.substring(0, j)] === v.substring(j + 1) : lb.hasOwnProperty(v); }); }
		else if (k === "before" || k === "since"){ var ref = imagePort(h, v); if (!ref) throw new ShellError("Error response from daemon: No such image: " + v, 1); lignes = lignes.filter(function(l){ return k === "before" ? Date.parse(l.im.cree) < Date.parse(ref.cree) : Date.parse(l.im.cree) > Date.parse(ref.cree); }); }
		else throw new ShellError("Error response from daemon: invalid filter '" + k + "'", 1);
	});
	if (!d.o.all) lignes = lignes.filter(function(l){ return l.tag || !l.im.intermediaire; });
	evenementPort(h, "images", { digests: !!d.o.digests, filtres: filtres, format: d.o.format || null, lignes: lignes.map(function(l){ return { id: l.im.id, tag: l.tag, digests: l.im.digests }; }) });
	if (d.o.quiet) return lignes.map(function(l){ return d.o["no-trunc"] ? "sha256:" + l.im.id : courtPort(l.im.id); }).filter(function(v, i, t){ return t.indexOf(v) === i; }).join("\n");
	var objets = lignes.map(function(l){ return objetImagePort(h, l.im, l.tag); });
	if (d.o.format) return formaterListePort(d.o.format, objets, { Repository: "REPOSITORY", Tag: "TAG", ID: "IMAGE ID", Digest: "DIGEST", CreatedSince: "CREATED", CreatedAt: "CREATED AT", Size: "SIZE" });
	return tableauPort(["REPOSITORY", "TAG"].concat(d.o.digests ? ["DIGEST"] : []).concat(["IMAGE ID", "CREATED", "SIZE"]), objets.map(function(o){ return [o.Repository, o.Tag].concat(d.o.digests ? [o.Digest] : []).concat([d.o["no-trunc"] ? "sha256:" + lignes[objets.indexOf(o)].im.id : o.ID, o.CreatedSince, o.Size]); }));
}
function tagPort(h, a, io){
	if (a.length !== 2) throw new ShellError("\"docker tag\" requires exactly 2 arguments.\nSee 'docker tag --help'.\n\nUsage:  docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]\n\nCreate a tag TARGET_IMAGE that refers to SOURCE_IMAGE", 1);
	accesDemonPort(h, io);
	var im = imagePort(h, a[0]);
	if (!im) throw new ShellError("Error response from daemon: No such image: " + nomCourtPort(a[0]).replace(/^([^:@]+)$/, "$1:latest"), 1);
	var cible = analyserRefPort(a[1]);
	if (!cible.valide || /[A-Z]/.test(a[1])) throw new ShellError("Error parsing reference: \"" + a[1] + "\" is not a valid repository/tag: invalid reference format" + (/[A-Z]/.test(a[1]) ? ": repository name must be lowercase" : ""), 1);
	if (cible.digest) throw new ShellError("refusing to create a tag with a digest reference", 1);
	poserImagePort(h, im, cible.nomTag, null);
	im.tagueA = maintenantPort(h);
	evenementDockerPort(h, "image", "tag", "sha256:" + im.id, { name: cible.nomTag });
	evenementPort(h, "tag", { source: a[0], cible: cible.nomTag, image: im.id });
	return "";
}
function rmiPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force", "no-prune"] }, "rmi");
	if (!d.reste.length) throw new ShellError("\"docker rmi\" requires at least 1 argument.\nSee 'docker rmi --help'.\n\nUsage:  docker rmi [OPTIONS] IMAGE [IMAGE...]\n\nRemove one or more images", 1);
	accesDemonPort(h, io);
	var sortie = [];
	d.reste.forEach(function(ref){
		var im = imagePort(h, ref);
		if (!im){ io.err("Error response from daemon: No such image: " + nomCourtPort(ref).replace(/^([^:@]+)$/, "$1:latest")); io.code = 1; return; }
		var parId = /^(sha256:)?[0-9a-f]{4,64}$/.test(ref) && ("sha256:" + im.id).indexOf(ref.replace(/^(sha256:)?/, "sha256:")) === 0;
		var utilisateurs = conteneursPort(h).filter(function(c){ return c.image === im.id; });
		var enMarche = utilisateurs.filter(enMarchePort)[0];
		var r = analyserRefPort(ref);
		// Un tag parmi d'autres : on retire seulement le tag.
		if (!parId && im.tags.length > 1 && im.tags.indexOf(r.nomTag) > -1){
			im.tags.splice(im.tags.indexOf(r.nomTag), 1);
			evenementDockerPort(h, "image", "untag", "sha256:" + im.id, { name: r.nomTag });
			evenementPort(h, "rmi", { ref: ref, image: im.id, untag: true, supprime: false });
			sortie.push("Untagged: " + r.nomTag);
			return;
		}
		if (parId && im.tags.length > 1 && !d.o.force){ io.err("Error response from daemon: conflict: unable to delete " + courtPort(im.id) + " (must be forced) - image is referenced in multiple repositories"); io.code = 1; return; }
		if (enMarche){ io.err("Error response from daemon: conflict: unable to delete " + courtPort(im.id) + " (cannot be forced) - image is being used by running container " + enMarche.id.substring(0, 12)); io.code = 1; return; }
		if (utilisateurs.length && !d.o.force){
			if (!parId && im.tags.length) io.err("Error response from daemon: conflict: unable to remove repository reference \"" + ref + "\" (must force) - container " + utilisateurs[0].id.substring(0, 12) + " is using its referenced image " + courtPort(im.id));
			else io.err("Error response from daemon: conflict: unable to delete " + courtPort(im.id) + " (must be forced) - image is being used by stopped container " + utilisateurs[0].id.substring(0, 12));
			io.code = 1; return;
		}
		im.tags.forEach(function(t){ sortie.push("Untagged: " + t); evenementDockerPort(h, "image", "untag", "sha256:" + im.id, { name: t }); });
		(im.digests || []).forEach(function(dg){ sortie.push("Untagged: " + dg); });
		if (utilisateurs.length && d.o.force){ im.tags = []; im.pendante = true; evenementPort(h, "rmi", { ref: ref, image: im.id, untag: true, supprime: false, force: true }); return; }
		var gain = supprimerImagePort(h, im);
		sortie.push("Deleted: sha256:" + im.id);
		gain.forEach(function(id){ sortie.push("Deleted: sha256:" + id); });
		evenementPort(h, "rmi", { ref: ref, image: im.id, supprime: true, digests: im.digests });
	});
	return sortie.join("\n");
}
/* Retirer une image et les couches que plus personne n'utilise : les ids des couches libérées. */
function supprimerImagePort(h, im){
	var P = etatPort(h);
	delete P.images[im.id];
	evenementDockerPort(h, "image", "delete", "sha256:" + im.id, { name: "sha256:" + im.id });
	var liberees = [];
	(im.couches || []).slice().reverse().forEach(function(id){
		if (imagesPort(h).some(function(x){ return x.couches.indexOf(id) > -1; })) return;
		liberees.push(id);
		if (P.couches[id] && !Object.keys(P.cache).some(function(k){ return P.cache[k] === id; })) delete P.couches[id];
	});
	return liberees;
}
function historyPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { H: "human", q: "quiet" }, booleens: ["human", "quiet", "no-trunc"], valeurs: ["format", "platform"] }, "history");
	if (d.reste.length !== 1) throw new ShellError("\"docker history\" requires exactly 1 argument.\nSee 'docker history --help'.\n\nUsage:  docker history [OPTIONS] IMAGE\n\nShow the history of an image", 1);
	accesDemonPort(h, io);
	var im = imagePort(h, d.reste[0]);
	if (!im) throw new ShellError("Error response from daemon: No such image: " + nomCourtPort(d.reste[0]).replace(/^([^:@]+)$/, "$1:latest"), 1);
	var couches = im.couches.slice(), k = 0;
	var lignes = im.historique.map(function(x, i){
		var taille = 0;
		if (!x.empty_layer){ var c = couchePort(h, couches[k++]); taille = c ? c.taille : 0; }
		return { cree: x.created, cmd: x.created_by || "", taille: taille, commentaire: x.comment || (/# buildkit$/.test(x.created_by || "") || im.origine === "build" ? "buildkit.dockerfile.v0" : "") };
	}).reverse();
	evenementPort(h, "history", { image: im.id, ref: d.reste[0], noTrunc: !!d.o["no-trunc"], lignes: lignes.map(function(l){ return { cmd: l.cmd, taille: l.taille }; }) });
	var idTop = function(i){ return i === 0 ? (d.o["no-trunc"] ? "sha256:" + im.id : courtPort(im.id)) : "<missing>"; };
	if (d.o.quiet) return lignes.map(function(l, i){ return idTop(i); }).join("\n");
	var objets = lignes.map(function(l, i){
		var t = Date.parse(l.cree) + DECALAGE_HISTOIRE * 3600000;
		var cmd = l.cmd.replace(/\t/g, " ");
		if (!d.o["no-trunc"] && cmd.length > 45) cmd = cmd.substring(0, 44) + "…";
		return { __type: "formatter.historyContext", ID: idTop(i), CreatedSince: ilYaPort(h, t), CreatedAt: dateEvenementPort(h, t).replace(/\.\d+/, ""), CreatedBy: cmd, Size: d.o.human === false ? String(l.taille) : tailleDockerPort(l.taille), Comment: l.commentaire };
	});
	if (d.o.format) return formaterListePort(d.o.format, objets, { ID: "IMAGE", CreatedSince: "CREATED", CreatedAt: "CREATED AT", CreatedBy: "CREATED BY", Size: "SIZE", Comment: "COMMENT" });
	return tableauPort(["IMAGE", "CREATED", "CREATED BY", "SIZE", "COMMENT"], objets.map(function(o){ return [o.ID, o.CreatedSince, o.CreatedBy, o.Size, o.Comment]; }));
}
function imagePrunePort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all", f: "force" }, booleens: ["all", "force"], valeurs: ["filter"], repetables: ["filter"] }, "image prune");
	accesDemonPort(h, io);
	var faire = function(){
		var aRetirer = imagesPort(h).filter(function(im){ return (d.o.all ? !conteneursPort(h).some(function(c){ return c.image === im.id; }) : (!im.tags || !im.tags.length) && !conteneursPort(h).some(function(c){ return c.image === im.id; })); });
		var gain = 0, l = [];
		aRetirer.forEach(function(im){
			(im.tags || []).forEach(function(t){ l.push("untagged: " + t); });
			(im.digests || []).forEach(function(dg){ l.push("untagged: " + dg); });
			var avant = tailleImagePort(h, im);
			var lib = supprimerImagePort(h, im);
			l.push("deleted: sha256:" + im.id);
			lib.forEach(function(id){ var c = couchePort(h, id); gain += c ? c.taille : 0; l.push("deleted: sha256:" + id); });
		});
		evenementPort(h, "prune", { quoi: "images", supprimes: aRetirer.map(function(im){ return im.id; }), tous: !!d.o.all, gain: gain });
		return (l.length ? "Deleted Images:\n" + l.join("\n") + "\n\n" : "") + "Total reclaimed space: " + tailleDockerPort(gain);
	};
	if (d.o.force) return faire();
	return demanderConfirmationPort(d.o.all ? "WARNING! This will remove all images without at least one container associated to them.\nAre you sure you want to continue? [y/N] " : "WARNING! This will remove all dangling images.\nAre you sure you want to continue? [y/N] ", faire, io);
}

/* ================================================================== */
/* push, login, logout                                                  */
/* ================================================================== */

function pushPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { a: "all-tags", q: "quiet" }, booleens: ["all-tags", "quiet", "disable-content-trust"] }, "push");
	if (d.reste.length !== 1) throw new ShellError("\"docker push\" requires exactly 1 argument.\nSee 'docker push --help'.\n\nUsage:  docker push [OPTIONS] NAME[:TAG]\n\nUpload an image to a registry", 1);
	accesDemonPort(h, io, "images/push");
	var r = analyserRefPort(d.reste[0]);
	var im = imagePort(h, d.reste[0]);
	if (!im) throw new ShellError("An image does not exist locally with the tag: " + r.court, 1);
	var lignes = ["The push refers to repository [" + (r.registre === REGISTRE_CONTINENT_PORT ? REGISTRE_CONTINENT_PORT + "/" + r.depot : r.registre + "/" + r.depot) + "]"];
	if (r.registre === REGISTRE_CONTINENT_PORT){
		im.couches.slice().reverse().forEach(function(id){ lignes.push(blobPort(id).substring(0, 12) + ": Preparing"); });
		evenementPort(h, "push", { ref: d.reste[0], ok: false, registre: r.registre, image: im.id });
		io.code = 1;
		return lignes.join("\n") + "\ndenied: requested access to the resource is denied" + astuce(io, "Le registre du continent n'est pas à l'école : on n'y pousse rien. Notre registre, c'est celui de l'entrepôt (" + REGISTRE_ENTREPOT_PORT + ").");
	}
	var j = joindreRegistrePort(h, r.registre, identifiantsPort(h, r.registre, io));
	if (j.erreur){ evenementPort(h, "push", { ref: d.reste[0], ok: false, erreur: j.erreur, registre: r.registre, image: im.id }); io.code = 1; return lignes.join("\n") + "\n" + j.erreur; }
	if (!j.auth.ok){
		im.couches.slice().reverse().forEach(function(id){ lignes.push(blobPort(id).substring(0, 12) + ": Preparing"); });
		evenementPort(h, "push", { ref: d.reste[0], ok: false, erreur: "auth", registre: r.registre, image: im.id });
		io.code = 1;
		return lignes.join("\n") + "\nno basic auth credentials" + astuce(io, "Le registre demande un compte : docker login " + r.registre + " d'abord.");
	}
	if (quarantainePort(h, im)) evenementPort(h, "pushEclaireur", { ref: d.reste[0], image: im.id });
	var res = pousserDansRegistrePort(h, im, j.hr, j.cr, r.depot, r.tag);
	res.couches.slice().reverse().forEach(function(x){ lignes.push(x.blob.substring(7, 19) + ": " + (x.deja ? "Layer already exists" : "Pushed")); });
	lignes.push((r.tag || "latest") + ": digest: " + res.digest + " size: " + res.taille);
	poserImagePort(h, im, null, r.court + "@" + res.digest);
	evenementDockerPort(h, "image", "push", r.nomTag, { name: r.court });
	evenementPort(h, "push", { ref: d.reste[0], ok: true, registre: r.registre, depot: r.depot, tag: r.tag, digest: res.digest, image: im.id });
	return lignes.join("\n");
}
function loginPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { u: "username", p: "password" }, valeurs: ["username", "password"], booleens: ["password-stdin"] }, "login");
	var registre = d.reste[0] || REGISTRE_CONTINENT_PORT;
	accesDemonPort(h, io, "auth");
	var finir = function(user, mdp){
		var j = joindreRegistrePort(h, registre, user + ":" + mdp);
		if (registre === REGISTRE_CONTINENT_PORT) j = { ok: true, auth: { ok: false } };
		if (j.erreur) return { erreur: "Error response from daemon: " + j.erreur };
		if (!j.auth.ok){ evenementPort(h, "login", { registre: registre, user: user, ok: false }); return { erreur: "Error response from daemon: login attempt to http://" + registre + "/v2/ failed with status: 401 Unauthorized" }; }
		var chemin = cheminConfigDockerPort(h, io), t = texteHote(h, chemin), cfg = {};
		try { cfg = t ? JSON.parse(t) : {}; } catch (e){ cfg = {}; }
		cfg.auths = cfg.auths || {};
		cfg.auths[registre] = { auth: encoderBase64(user + ":" + mdp) };
		moteurSeul(function(){
			var dd = creerDossierHote(h, dossierDe(chemin), { mode: "rwx------", owner: io.sudo ? "root" : JOUEUR });
			if (dd){ dd.owner = io.sudo ? "root" : JOUEUR; dd.mode = "rwx------"; }
			var it = poserFichierHote(h, chemin, JSON.stringify(cfg, null, "\t") + "\n", { mode: "rw-------", owner: io.sudo ? "root" : JOUEUR });
			if (it){ it.owner = io.sudo ? "root" : JOUEUR; it.mode = "rw-------"; }
		});
		evenementPort(h, "login", { registre: registre, user: user, ok: true });
		evenementDockerPort(h, "daemon", "login", hexDe("demon:" + h, 64).substring(0, 40), { name: registre });
		return { texte: "WARNING! Your password will be stored unencrypted in " + chemin + ".\nConfigure a credential helper to remove this warning.\n\nLogin Succeeded" };
	};
	if (d.o.password !== undefined && d.o["password-stdin"]) throw new ShellError("--password and --password-stdin are mutually exclusive", 1);
	if (d.o.username && (d.o.password !== undefined || d.o["password-stdin"])){
		if (d.o.password !== undefined) io.err("WARNING! Using --password via the CLI is insecure. Use --password-stdin.");
		var mdp = d.o["password-stdin"] ? String(io.stdin || "").replace(/\n$/, "") : d.o.password;
		if (d.o["password-stdin"] && !io.stdin) throw new ShellError("Must provide --username with --password-stdin", 1);
		var r = finir(d.o.username, mdp);
		if (r.erreur) throw new ShellError(r.erreur, 1);
		return r.texte;
	}
	if (d.o["password-stdin"]) throw new ShellError("Must provide --username with --password-stdin", 1);
	if (!io.tty || !term || !term.demander) throw new ShellError("Error: Cannot perform an interactive login from a non TTY device", 1);
	var demanderMdp = function(user){
		term.demander("Password: ", true, function(m){
			var r2 = finir(user, m);
			term.echo(r2.erreur || r2.texte);
			Shell.fin();
		});
	};
	if (d.o.username) demanderMdp(d.o.username);
	else term.demander("Username: ", false, function(u){ demanderMdp(u); });
	return "";
}
function logoutPort(h, a, io){
	var registre = a[0] || REGISTRE_CONTINENT_PORT;
	var chemin = cheminConfigDockerPort(h, io), t = texteHote(h, chemin);
	var cfg; try { cfg = t ? JSON.parse(t) : null; } catch (e){ cfg = null; }
	evenementPort(h, "logout", { registre: registre, etait: !!(cfg && cfg.auths && cfg.auths[registre]) });
	if (!cfg || !cfg.auths || !cfg.auths[registre]) return "Not logged in to " + registre;
	delete cfg.auths[registre];
	moteurSeul(function(){ poserFichierHote(h, chemin, JSON.stringify(cfg, null, "\t") + "\n", { mode: "rw-------" }); });
	return "Removing login credentials for " + registre;
}

/* ================================================================== */
/* save et load                                                         */
/* ================================================================== */

function savePort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { o: "output" }, valeurs: ["output", "platform"] }, "save");
	if (!d.reste.length) throw new ShellError("\"docker save\" requires at least 1 argument.\nSee 'docker save --help'.\n\nUsage:  docker save [OPTIONS] IMAGE [IMAGE...]\n\nSave one or more images to a tar archive (streamed to STDOUT by default)", 1);
	accesDemonPort(h, io);
	if (!d.o.output){ if (io.tty) throw new ShellError("cowardly refusing to save to a terminal. Use the -o flag or redirect", 1); throw new ShellError("docker save : dans ce jeu, l'archive s'écrit avec -o FICHIER (docker save -o image.tar IMAGE).", 1); }
	var imgs = d.reste.map(function(ref){ var im = imagePort(h, ref); if (!im) throw new ShellError("Error response from daemon: reference does not exist", 1); return { im: im, ref: ref }; });
	var entrees = [{ n: "blobs/", d: 1, m: "rwxr-xr-x", o: "root", g: "root" }, { n: "blobs/sha256/", d: 1, m: "rwxr-xr-x", o: "root", g: "root" }];
	var vus = {}, manifestes = [], index = [], repositories = {};
	imgs.forEach(function(x){
		var im = x.im, config = configJsonPort(im), cfgDigest = sha256(config);
		im.couches.forEach(function(id){
			if (vus[id]) return; vus[id] = true;
			var c = couchePort(h, id), texte = c ? texteCouchePort(c) : "";
			var arch = c ? Object.keys(c.fichiers).sort().map(function(p){ var e = c.fichiers[p]; return e.t === "d" ? { n: p.replace(/^\//, "") + "/", d: 1, m: e.m, o: String(e.u === 0 ? "root" : e.u), g: String(e.g === 0 ? "root" : e.g) } : { n: p.replace(/^\//, ""), x: e.c !== undefined ? e.c : "", t: e.c === undefined ? (e.s || 0) : undefined, m: e.m, o: String(e.u === 0 ? "root" : e.u), g: String(e.g === 0 ? "root" : e.g), l: e.l }; }).concat((c.supprimes || []).map(function(p){ return { n: (dossierDe(p) === "/" ? "" : dossierDe(p).replace(/^\//, "") + "/") + ".wh." + nomDe(p), x: "", m: "---------", o: "root", g: "root" }; })) : [];
			entrees.push({ n: "blobs/sha256/" + id, x: texte, t: c ? c.taille + 2048 : 0, m: "rw-r--r--", o: "root", g: "root", c: { algo: "tar", archive: arch, taille: c ? c.taille : 0 } });
		});
		entrees.push({ n: "blobs/sha256/" + cfgDigest, x: config, m: "rw-r--r--", o: "root", g: "root" });
		var ociManifest = JSON.stringify({ schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json", config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: "sha256:" + cfgDigest, size: octetsPort(config) },
			layers: im.couches.map(function(id){ var c = couchePort(h, id); return { mediaType: "application/vnd.oci.image.layer.v1.tar", digest: "sha256:" + id, size: c ? c.taille + 2048 : 0 }; }) });
		var mDigest = sha256(ociManifest);
		entrees.push({ n: "blobs/sha256/" + mDigest, x: ociManifest, m: "rw-r--r--", o: "root", g: "root" });
		var tags = /^[0-9a-f]{12,64}$/.test(x.ref) ? [] : [analyserRefPort(x.ref).nomTag];
		manifestes.push({ Config: "blobs/sha256/" + cfgDigest, RepoTags: tags, Layers: im.couches.map(function(id){ return "blobs/sha256/" + id; }), LayerSources: undefined });
		index.push({ mediaType: "application/vnd.oci.image.manifest.v1+json", digest: "sha256:" + mDigest, size: octetsPort(ociManifest), annotations: tags.length ? { "io.containerd.image.name": analyserRefPort(x.ref).complet, "org.opencontainers.image.ref.name": analyserRefPort(x.ref).tag } : undefined });
		tags.forEach(function(t){ var dep = t.substring(0, t.lastIndexOf(":")); repositories[dep] = repositories[dep] || {}; repositories[dep][t.substring(t.lastIndexOf(":") + 1)] = im.id; });
	});
	entrees.push({ n: "index.json", x: JSON.stringify({ schemaVersion: 2, mediaType: "application/vnd.oci.image.index.v1+json", manifests: index }), m: "rw-r--r--", o: "root", g: "root" });
	entrees.push({ n: "manifest.json", x: JSON.stringify(manifestes.map(function(m){ return { Config: m.Config, RepoTags: m.RepoTags, Layers: m.Layers }; })), m: "rw-r--r--", o: "root", g: "root" });
	entrees.push({ n: "oci-layout", x: "{\"imageLayoutVersion\":\"1.0.0\"}", m: "rw-r--r--", o: "root", g: "root" });
	entrees.push({ n: "repositories", x: JSON.stringify(repositories), m: "rw-r--r--", o: "root", g: "root" });
	var r = Shell.chercher(d.o.output, io, "docker");
	if (r.node instanceof Room) throw new ShellError("open " + d.o.output + ": is a directory", 1);
	if (!r.dir || (!io.sudo && !Shell.bit(r.dir, "w", io))) throw new ShellError("failed to save image: invalid output path: open " + d.o.output + ": permission denied", 1);
	var taille = entrees.reduce(function(s, e){ return s + 512 + (e.d ? 0 : Math.ceil((e.t || octetsPort(e.x || "")) / 512) * 512); }, 1024);
	moteurSeul(function(){
		var it = r.node instanceof Item ? r.node : new Item(r.name, "", "item_sign.gif");
		it.setText(brouiller(JSON.stringify(entrees.map(function(e){ return e.n; })).substring(0, 400), "save" + r.name));
		it.archive = entrees; it.taille = taille; it.owner = io.sudo ? "root" : JOUEUR; it.mode = "rw-------"; it.mtimeMs = maintenantPort(h);
		delete it.comp; delete it.gzip;
		if (!(r.node instanceof Item)) r.dir.addItem(it);
	});
	evenementPort(h, "save", { images: imgs.map(function(x){ return x.im.id; }), refs: d.reste.slice(), fichier: cheminNormal(cheminDuLieuMachine(r.dir) + "/" + r.name) });
	return "";
}
function loadPort(h, a, io){
	var d = lireDrapeauxPort(a, { court: { i: "input", q: "quiet" }, valeurs: ["input", "platform"], booleens: ["quiet"] }, "load");
	accesDemonPort(h, io);
	if (!d.o.input) throw new ShellError("requested load from stdin, but stdin is empty" + astuce(io, "docker load -i ARCHIVE.tar"), 1);
	var r = Shell.chercher(d.o.input, io, "docker");
	if (!(r.node instanceof Item)) throw new ShellError("open " + d.o.input + ": no such file or directory", 1);
	var entrees = lireArchiveMachine(r.node);
	if (!entrees) throw new ShellError("Error response from daemon: unexpected EOF", 1);
	var trouver = function(n){ return entrees.filter(function(e){ return e.n === n; })[0]; };
	var mf = trouver("manifest.json");
	if (!mf) throw new ShellError("Error response from daemon: open /var/lib/docker/tmp/docker-import-" + hexDe("imp" + state.nbCommandes, 9) + "/repositories: no such file or directory", 1);
	var liste = JSON.parse(mf.x);
	var sortie = [];
	liste.forEach(function(m){
		var cfg = trouver(m.Config);
		var j = JSON.parse(cfg.x);
		var img = { couches: (j.rootfs.diff_ids || []).map(function(x){ return x.replace(/^sha256:/, ""); }), historique: j.history || [], config: j.config || {}, cree: j.created, os: j.os, arch: j.architecture, origine: "load" };
		img.couches.forEach(function(id){
			if (couchePort(h, id)) return;
			var b = trouver("blobs/sha256/" + id);
			if (b && b.c && b.c.archive){ var f = {}; b.c.archive.forEach(function(e){ var p = "/" + e.n.replace(/\/$/, ""); if (/\.wh\./.test(p)) return; f[p] = e.d ? dPort(e.m) : { t: e.l ? "l" : "f", m: e.m, u: 0, g: 0, s: e.t !== undefined ? e.t : octetsPort(e.x || ""), c: e.t === undefined ? e.x : undefined, l: e.l }; }); etatPort(h).couches[id] = { id: id, taille: b.c.taille || 0, fichiers: f, supprimes: [], cmd: "" }; }
		});
		img.id = sha256(configJsonPort(img));
		var tags = m.RepoTags || [];
		var pose = poserImagePort(h, img, tags[0] || null, null);
		tags.slice(1).forEach(function(t){ poserImagePort(h, pose, t, null); });
		if (tags.length) tags.forEach(function(t){ sortie.push("Loaded image: " + t); });
		else sortie.push("Loaded image ID: sha256:" + img.id);
		evenementDockerPort(h, "image", "load", "sha256:" + img.id, { name: tags[0] || "" });
		evenementPort(h, "load", { image: img.id, tags: tags, fichier: d.o.input });
	});
	return d.o.quiet ? "" : sortie.join("\n");
}

/* ================================================================== */
/* volume                                                               */
/* ================================================================== */

function volumeCliPort(h, a, io){
	var s = a.shift();
	var usage = "\nUsage:  docker volume COMMAND\n\nManage volumes\n\nCommands:\n  create      Create a volume\n  inspect     Display detailed information on one or more volumes\n  ls          List volumes\n  prune       Remove unused local volumes\n  rm          Remove one or more volumes\n\nRun 'docker volume COMMAND --help' for more information on a command.";
	if (!s) return usage;
	accesDemonPort(h, io, "volumes");
	if (s === "create"){
		var d = lireDrapeauxPort(a, { court: { d: "driver", o: "opt" }, valeurs: ["driver", "label", "opt", "name"], repetables: ["label", "opt"] }, "volume create");
		var nom = d.o.name || d.reste[0] || null;
		if (nom && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(nom)) throw new ShellError("Error response from daemon: create " + nom + ": \"" + nom + "\" includes invalid characters for a local volume name, only \"[a-zA-Z0-9][a-zA-Z0-9_.-]\" are allowed. If you intended to pass a host directory, use absolute path", 1);
		if (d.o.driver && d.o.driver !== "local") throw new ShellError("Error response from daemon: create " + (nom || "") + ": error looking up volume plugin " + d.o.driver + ": plugin \"" + d.o.driver + "\" not found", 1);
		var labels = {}; listePort(d.o.label).forEach(function(l){ var i = l.indexOf("="); labels[i > 0 ? l.substring(0, i) : l] = i > 0 ? l.substring(i + 1) : ""; });
		var v = creerVolumePort(h, nom, { labels: labels });
		evenementPort(h, "volume", { action: "create", nom: v.nom });
		return v.nom;
	}
	if (s === "ls" || s === "list"){
		var d2 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet", "cluster"], valeurs: ["filter", "format"], repetables: ["filter"] }, "volume ls");
		var l = volumesPort(h).sort(function(x, y){ return x.nom < y.nom ? -1 : 1; });
		listePort(d2.o.filter).forEach(function(f){ var i = f.indexOf("="), k = f.substring(0, i), val = f.substring(i + 1);
			if (k === "dangling") l = l.filter(function(v){ return !volumeUtilisePort(h, v.nom).length === (val === "true"); });
			else if (k === "name") l = l.filter(function(v){ return v.nom.indexOf(val) > -1; });
			else if (k === "label") l = l.filter(function(v){ var j = val.indexOf("="); return j > 0 ? v.labels[val.substring(0, j)] === val.substring(j + 1) : v.labels.hasOwnProperty(val); });
			else if (k === "driver") l = l.filter(function(){ return val === "local"; });
			else throw new ShellError("Error response from daemon: invalid filter '" + k + "'", 1); });
		evenementPort(h, "volume", { action: "ls", noms: l.map(function(v){ return v.nom; }) });
		if (d2.o.quiet) return l.map(function(v){ return v.nom; }).join("\n");
		var objets = l.map(function(v){ return { __type: "formatter.volumeContext", Driver: "local", Name: v.nom, Mountpoint: "/var/lib/docker/volumes/" + v.nom + "/_data", Scope: "local", Labels: Object.keys(v.labels).map(function(k){ return k + "=" + v.labels[k]; }).join(","), Links: String(volumeUtilisePort(h, v.nom).length), Size: "N/A" }; });
		if (d2.o.format) return formaterListePort(d2.o.format, objets, { Driver: "DRIVER", Name: "VOLUME NAME", Mountpoint: "MOUNTPOINT", Scope: "SCOPE", Labels: "LABELS", Links: "LINKS", Size: "SIZE" });
		return tableauPort(["DRIVER", "VOLUME NAME"], objets.map(function(o){ return [o.Driver, o.Name]; }));
	}
	if (s === "inspect") return inspecterPort(h, ["--type", "volume"].concat(a), io);
	if (s === "rm" || s === "remove"){
		var d3 = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force"] }, "volume rm");
		var sortie = [];
		d3.reste.forEach(function(n){
			if (!volumePort(h, n)){ if (!d3.o.force){ io.err("Error response from daemon: get " + n + ": no such volume"); io.code = 1; } return; }
			var us = volumeUtilisePort(h, n);
			if (us.length){ io.err("Error response from daemon: remove " + n + ": volume is in use - [" + us.map(function(c){ return c.id; }).join(", ") + "]"); io.code = 1; return; }
			supprimerVolumePort(h, n);
			evenementPort(h, "volume", { action: "rm", nom: n });
			sortie.push(n);
		});
		return sortie.join("\n");
	}
	if (s === "prune"){
		var d4 = lireDrapeauxPort(a, { court: { a: "all", f: "force" }, booleens: ["all", "force"], valeurs: ["filter"], repetables: ["filter"] }, "volume prune");
		var faire = function(){
			var l2 = volumesPort(h).filter(function(v){ return !volumeUtilisePort(h, v.nom).length && (d4.o.all || v.anonyme); });
			var gain = 0;
			l2.forEach(function(v){ gain += tailleDossierHotePort(dossierHote(h, cheminVolumePort(v.nom))); supprimerVolumePort(h, v.nom); });
			evenementPort(h, "prune", { quoi: "volumes", supprimes: l2.map(function(v){ return v.nom; }) });
			return (l2.length ? "Deleted Volumes:\n" + l2.map(function(v){ return v.nom; }).join("\n") + "\n\n" : "") + "Total reclaimed space: " + tailleDockerPort(gain);
		};
		if (d4.o.force) return faire();
		return demanderConfirmationPort(d4.o.all ? "WARNING! This will remove all local volumes not used by at least one container.\nAre you sure you want to continue? [y/N] " : "WARNING! This will remove anonymous local volumes not used by at least one container.\nAre you sure you want to continue? [y/N] ", faire, io);
	}
	throw new ShellError("docker: 'volume " + s + "' is not a docker command.\nSee 'docker volume --help'", 1);
}

/* ================================================================== */
/* network                                                              */
/* ================================================================== */

function networkCliPort(h, a, io){
	var s = a.shift();
	if (!s) return "\nUsage:  docker network COMMAND\n\nManage networks\n\nCommands:\n  connect     Connect a container to a network\n  create      Create a network\n  disconnect  Disconnect a container from a network\n  inspect     Display detailed information on one or more networks\n  ls          List networks\n  prune       Remove all unused networks\n  rm          Remove one or more networks\n\nRun 'docker network COMMAND --help' for more information on a command.";
	accesDemonPort(h, io, "networks");
	if (s === "create"){
		var d = lireDrapeauxPort(a, { court: { d: "driver" }, valeurs: ["driver", "subnet", "gateway", "label", "opt", "ip-range"], booleens: ["internal", "attachable", "ipv6"], repetables: ["label", "opt"] }, "network create");
		if (d.reste.length !== 1) throw new ShellError("\"docker network create\" requires exactly 1 argument.\nSee 'docker network create --help'.\n\nUsage:  docker network create [OPTIONS] NETWORK\n\nCreate a network", 1);
		var nom = d.reste[0];
		if (reseauPort(h, nom) && reseauPort(h, nom).nom === nom) throw new ShellError("Error response from daemon: network with name " + nom + " already exists", 1);
		var pilote = d.o.driver || "bridge";
		if (["bridge", "overlay", "macvlan", "ipvlan"].indexOf(pilote) === -1) throw new ShellError("Error response from daemon: plugin \"" + pilote + "\" not found", 1);
		if (pilote === "overlay" && !(typeof swarmActifPort === "function" && swarmActifPort(h))) throw new ShellError("Error response from daemon: This node is not a swarm manager. Use \"docker swarm init\" or \"docker swarm join\" to connect this node to swarm and try again.", 1);
		if (d.o.subnet && reseauxPort(h).some(function(r){ return r.sousReseau === d.o.subnet; })) throw new ShellError("Error response from daemon: invalid pool request: Pool overlaps with other one on this address space", 1);
		var labels = {}; listePort(d.o.label).forEach(function(l){ var i = l.indexOf("="); labels[i > 0 ? l.substring(0, i) : l] = i > 0 ? l.substring(i + 1) : ""; });
		var r = pilote === "overlay" && typeof creerReseauOverlayPort === "function" ? creerReseauOverlayPort(h, nom, { sousReseau: d.o.subnet, passerelle: d.o.gateway, interne: !!d.o.internal, attachable: !!d.o.attachable, labels: labels }) :
			creerReseauPort(h, nom, { pilote: pilote, sousReseau: d.o.subnet, passerelle: d.o.gateway, interne: !!d.o.internal, attachable: !!d.o.attachable, labels: labels });
		evenementPort(h, "reseau", { action: "create", nom: nom, pilote: pilote, interne: !!d.o.internal });
		return r.id;
	}
	if (s === "ls" || s === "list"){
		var d2 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet", "no-trunc"], valeurs: ["filter", "format"], repetables: ["filter"] }, "network ls");
		var l = reseauxPort(h).sort(function(x, y){ return x.nom < y.nom ? -1 : 1; });
		listePort(d2.o.filter).forEach(function(f){ var i = f.indexOf("="), k = f.substring(0, i), v = f.substring(i + 1);
			if (k === "name") l = l.filter(function(r){ return r.nom.indexOf(v) > -1; }); else if (k === "driver") l = l.filter(function(r){ return r.pilote === v; });
			else if (k === "type") l = l.filter(function(r){ return v === "builtin" ? r.defaut : !r.defaut; }); else if (k === "dangling") l = l.filter(function(r){ return !r.defaut && !conteneursPort(h).some(function(c){ return c.reseaux && c.reseaux[r.nom]; }); });
			else throw new ShellError("Error response from daemon: invalid filter '" + k + "'", 1); });
		evenementPort(h, "reseau", { action: "ls", noms: l.map(function(r){ return r.nom; }) });
		if (d2.o.quiet) return l.map(function(r){ return d2.o["no-trunc"] ? r.id : r.id.substring(0, 12); }).join("\n");
		var objets = l.map(function(r){ return { __type: "formatter.networkContext", ID: d2.o["no-trunc"] ? r.id : r.id.substring(0, 12), Name: r.nom, Driver: r.pilote, Scope: r.portee, IPv6: "false", Internal: String(!!r.interne), Labels: Object.keys(r.labels || {}).map(function(k){ return k + "=" + r.labels[k]; }).join(","), CreatedAt: dateLocalePort(h, r.cree) }; });
		if (d2.o.format) return formaterListePort(d2.o.format, objets, { ID: "NETWORK ID", Name: "NAME", Driver: "DRIVER", Scope: "SCOPE" });
		return tableauPort(["NETWORK ID", "NAME", "DRIVER", "SCOPE"], objets.map(function(o){ return [o.ID, o.Name, o.Driver, o.Scope]; }));
	}
	if (s === "inspect") return inspecterPort(h, ["--type", "network"].concat(a), io);
	if (s === "connect" || s === "disconnect"){
		var d3 = lireDrapeauxPort(a, { court: { f: "force" }, valeurs: ["alias", "ip"], booleens: ["force"], repetables: ["alias"] }, "network " + s);
		if (d3.reste.length !== 2) throw new ShellError("\"docker network " + s + "\" requires exactly 2 arguments.\nSee 'docker network " + s + " --help'.", 1);
		var r3 = reseauPort(h, d3.reste[0]);
		if (!r3) throw new ShellError("Error response from daemon: network " + d3.reste[0] + " not found", 1);
		var c = conteneurOuErreurPort(h, d3.reste[1]);
		if (s === "connect"){
			if (c.reseaux[r3.nom]) throw new ShellError("Error response from daemon: endpoint with name " + c.nom + " already exists in network " + r3.nom, 1);
			if (c.hote.reseau === "host" || c.hote.reseau === "none" || r3.pilote === "host" || r3.pilote === "null") throw new ShellError("Error response from daemon: container cannot be disconnected from host network or connected to host network", 1);
			connecterPort(h, c, r3, listePort(d3.o.alias));
			if (!r3.defaut) c.reseaux[r3.nom].alias = listePort(d3.o.alias).concat([c.id.substring(0, 12)]);
		} else {
			if (!c.reseaux[r3.nom]) throw new ShellError("Error response from daemon: container " + c.id + " is not connected to network " + r3.nom, 1);
			deconnecterPort(h, c, r3);
		}
		evenementPort(h, "reseau", { action: s, reseau: r3.nom, conteneur: c.nom, alias: listePort(d3.o.alias) });
		return "";
	}
	if (s === "rm" || s === "remove"){
		var sortie = [];
		a.filter(function(x){ return x.charAt(0) !== "-"; }).forEach(function(n){
			var r4 = reseauPort(h, n);
			if (!r4){ io.err("Error response from daemon: network " + n + " not found"); io.code = 1; return; }
			if (r4.defaut){ io.err("Error response from daemon: " + r4.nom + " is a pre-defined network and cannot be removed"); io.code = 1; return; }
			if (conteneursPort(h).some(function(c){ return c.reseaux && c.reseaux[r4.nom] && enMarchePort(c); })){ io.err("Error response from daemon: error while removing network: network " + r4.nom + " id " + r4.id + " has active endpoints"); io.code = 1; return; }
			conteneursPort(h).forEach(function(c){ if (c.reseaux && c.reseaux[r4.nom]) delete c.reseaux[r4.nom]; });
			delete etatPort(h).reseaux[r4.id];
			evenementDockerPort(h, "network", "destroy", r4.id, { name: r4.nom, type: r4.pilote });
			evenementPort(h, "reseau", { action: "rm", nom: r4.nom });
			sortie.push(n);
		});
		return sortie.join("\n");
	}
	if (s === "prune"){
		var d5 = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force"], valeurs: ["filter"], repetables: ["filter"] }, "network prune");
		var faire = function(){
			var l5 = reseauxPort(h).filter(function(r){ return !r.defaut && !r.ingress && !conteneursPort(h).some(function(c){ return c.reseaux && c.reseaux[r.nom]; }); });
			l5.forEach(function(r){ delete etatPort(h).reseaux[r.id]; evenementDockerPort(h, "network", "destroy", r.id, { name: r.nom, type: r.pilote }); });
			evenementPort(h, "prune", { quoi: "reseaux", supprimes: l5.map(function(r){ return r.nom; }) });
			return l5.length ? "Deleted Networks:\n" + l5.map(function(r){ return r.nom; }).join("\n") : "";
		};
		if (d5.o.force) return faire();
		return demanderConfirmationPort("WARNING! This will remove all custom networks not used by at least one container.\nAre you sure you want to continue? [y/N] ", faire, io);
	}
	throw new ShellError("docker: 'network " + s + "' is not a docker command.\nSee 'docker network --help'", 1);
}

/* ================================================================== */
/* system                                                               */
/* ================================================================== */

function tailleCachePort(h){ var P = etatPort(h), t = 0, vus = {}; Object.keys(P.cache).forEach(function(k){ var id = P.cache[k]; if (id && !vus[id]){ vus[id] = true; var c = couchePort(h, id); if (c && !imagesPort(h).some(function(im){ return im.couches.indexOf(id) > -1; })) t += c.taille; } }); return t; }
function systemCliPort(h, a, io){
	var s = a.shift();
	if (!s) return "\nUsage:  docker system COMMAND\n\nManage Docker\n\nCommands:\n  df          Show docker disk usage\n  events      Get real time events from the server\n  info        Display system-wide information\n  prune       Remove unused data\n\nRun 'docker system COMMAND --help' for more information on a command.";
	if (s === "info") return infoDockerPort(h, a, io);
	if (s === "events") return eventsPort(h, a, io);
	accesDemonPort(h, io, "system/df");
	if (s === "df"){
		var d = lireDrapeauxPort(a, { court: { v: "verbose" }, booleens: ["verbose"], valeurs: ["format"] }, "system df");
		var imgs = imagesPort(h), cs = conteneursPort(h), vols = volumesPort(h);
		var couches = {}; imgs.forEach(function(im){ im.couches.forEach(function(id){ couches[id] = true; }); });
		var tailleImgs = Object.keys(couches).reduce(function(s2, id){ var c = couchePort(h, id); return s2 + (c ? c.taille : 0); }, 0);
		var actives = imgs.filter(function(im){ return cs.some(function(c){ return c.image === im.id; }); });
		var couchesActives = {}; actives.forEach(function(im){ im.couches.forEach(function(id){ couchesActives[id] = true; }); });
		var recup = tailleImgs - Object.keys(couchesActives).reduce(function(s2, id){ var c = couchePort(h, id); return s2 + (c ? c.taille : 0); }, 0);
		var tailleCs = cs.reduce(function(s2, c){ return s2 + tailleDiffPort(c); }, 0), recupCs = cs.filter(function(c){ return !enMarchePort(c); }).reduce(function(s2, c){ return s2 + tailleDiffPort(c); }, 0);
		var tailleVols = vols.reduce(function(s2, v){ return s2 + tailleDossierHotePort(dossierHote(h, cheminVolumePort(v.nom))); }, 0);
		var volsActifs = vols.filter(function(v){ return volumeUtilisePort(h, v.nom).length; });
		var recupVols = vols.filter(function(v){ return !volumeUtilisePort(h, v.nom).length; }).reduce(function(s2, v){ return s2 + tailleDossierHotePort(dossierHote(h, cheminVolumePort(v.nom))); }, 0);
		var nbCache = Object.keys(etatPort(h).cache).length, tCache = tailleCachePort(h);
		var pc = function(x, t){ return tailleDockerPort(x) + " (" + (t ? Math.round(x * 100 / t) : 0) + "%)"; };
		evenementPort(h, "systemDf", { verbeux: !!d.o.verbose });
		var resume = tableauPort(["TYPE", "TOTAL", "ACTIVE", "SIZE", "RECLAIMABLE"], [["Images", imgs.length, actives.length, tailleDockerPort(tailleImgs), pc(recup, tailleImgs)], ["Containers", cs.length, cs.filter(enMarchePort).length, tailleDockerPort(tailleCs), pc(recupCs, tailleCs)],
			["Local Volumes", vols.length, volsActifs.length, tailleDockerPort(tailleVols), pc(recupVols, tailleVols)], ["Build Cache", nbCache, 0, tailleDockerPort(tCache), tailleDockerPort(tCache)]]);
		if (!d.o.verbose) return resume;
		var ti = tableauPort(["REPOSITORY", "TAG", "IMAGE ID", "CREATED", "SIZE", "SHARED SIZE", "UNIQUE SIZE", "CONTAINERS"], imgs.map(function(im){ var t = (im.tags || [])[0] || "<none>:<none>"; var tot = tailleImagePort(h, im); var uniq = im.couches.filter(function(id){ return !imgs.some(function(x){ return x !== im && x.couches.indexOf(id) > -1; }); }).reduce(function(s2, id){ var c = couchePort(h, id); return s2 + (c ? c.taille : 0); }, 0);
			return [t.substring(0, t.lastIndexOf(":")), t.substring(t.lastIndexOf(":") + 1), courtPort(im.id), ilYaPort(h, Date.parse(im.cree) + DECALAGE_HISTOIRE * 3600000), tailleDockerPort(tot), tailleDockerPort(tot - uniq), tailleDockerPort(uniq), cs.filter(function(c){ return c.image === im.id; }).length]; }));
		var tc = tableauPort(["CONTAINER ID", "IMAGE", "COMMAND", "LOCAL VOLUMES", "SIZE", "CREATED", "STATUS", "NAMES"], cs.map(function(c){ return [c.id.substring(0, 12), c.imageRef, commandePsPort(c, true), (c.hote.montages || []).filter(function(m){ return m.type === "volume"; }).length, tailleDockerPort(tailleDiffPort(c)), ilYaPort(h, c.cree), texteStatutPort(h, c), c.nom]; }));
		var tv = tableauPort(["VOLUME NAME", "LINKS", "SIZE"], vols.map(function(v){ return [v.nom, volumeUtilisePort(h, v.nom).length, tailleDockerPort(tailleDossierHotePort(dossierHote(h, cheminVolumePort(v.nom))))]; }));
		return "Images space usage:\n\n" + ti + "\n\nContainers space usage:\n\n" + tc + "\n\nLocal Volumes space usage:\n\n" + tv + "\n\nBuild cache usage: " + tailleDockerPort(tCache);
	}
	if (s === "prune"){
		var d2 = lireDrapeauxPort(a, { court: { a: "all", f: "force" }, booleens: ["all", "force", "volumes"], valeurs: ["filter"], repetables: ["filter"] }, "system prune");
		var faire = function(){
			var l = [], gain = 0;
			var arretes = conteneursPort(h).filter(function(c){ return !enMarchePort(c) && c.etat.statut !== "restarting"; });
			if (arretes.length){ l.push("Deleted Containers:"); arretes.forEach(function(c){ l.push(c.id); supprimerConteneurPort(h, c, false); }); l.push(""); }
			var res = reseauxPort(h).filter(function(r){ return !r.defaut && !r.ingress && !conteneursPort(h).some(function(c){ return c.reseaux && c.reseaux[r.nom]; }); });
			if (res.length){ l.push("Deleted Networks:"); res.forEach(function(r){ l.push(r.nom); delete etatPort(h).reseaux[r.id]; evenementDockerPort(h, "network", "destroy", r.id, { name: r.nom, type: r.pilote }); }); l.push(""); }
			var vols = [];
			if (d2.o.volumes){ vols = volumesPort(h).filter(function(v){ return !volumeUtilisePort(h, v.nom).length && v.anonyme; }); if (vols.length){ l.push("Deleted Volumes:"); vols.forEach(function(v){ l.push(v.nom); gain += tailleDossierHotePort(dossierHote(h, cheminVolumePort(v.nom))); supprimerVolumePort(h, v.nom); }); l.push(""); } }
			var imgs = imagesPort(h).filter(function(im){ return !conteneursPort(h).some(function(c){ return c.image === im.id; }) && (d2.o.all || !im.tags || !im.tags.length); });
			if (imgs.length){ l.push("Deleted Images:"); imgs.forEach(function(im){ (im.tags || []).forEach(function(t){ l.push("untagged: " + t); }); l.push("deleted: sha256:" + im.id); supprimerImagePort(h, im).forEach(function(id){ var c = couchePort(h, id); gain += c ? c.taille : 0; l.push("deleted: sha256:" + id); }); }); l.push(""); }
			var tc = tailleCachePort(h), nc = Object.keys(etatPort(h).cache);
			if (nc.length){ l.push("Deleted build cache objects:"); nc.forEach(function(k){ l.push(hexDe("cache:" + k, 25)); }); l.push(""); etatPort(h).cache = {}; gain += tc; }
			l.push("Total reclaimed space: " + tailleDockerPort(gain));
			evenementPort(h, "prune", { quoi: "systeme", tous: !!d2.o.all, volumes: !!d2.o.volumes, conteneurs: arretes.map(function(c){ return c.nom; }), images: imgs.map(function(im){ return im.id; }), volumesSupprimes: vols.map(function(v){ return v.nom; }) });
			return l.join("\n");
		};
		if (d2.o.force) return faire();
		return demanderConfirmationPort("WARNING! This will remove:\n  - all stopped containers\n  - all networks not used by at least one container\n" + (d2.o.volumes ? "  - all anonymous volumes not used by at least one container\n" : "") + (d2.o.all ? "  - all images without at least one container associated to them\n" : "  - all dangling images\n") + "  - unused build cache\n\nAre you sure you want to continue? [y/N] ", faire, io);
	}
	throw new ShellError("docker: 'system " + s + "' is not a docker command.\nSee 'docker system --help'", 1);
}

/* ================================================================== */
/* Autour de docker, sur les machines du port                           */
/* ================================================================== */

/* htpasswd (apache2-utils) : -c créer, -B bcrypt, -b le mot de passe en argument, -n sur la sortie. */
Shell.sorts.htpasswd = function(args, io){
	var o = { c: false, B: false, b: false, n: false, D: false, v: false }, reste = [];
	args.forEach(function(a){ if (/^-[cBbnDvim]+$/.test(a)) a.substring(1).split("").forEach(function(l){ o[l] = true; }); else if (/^-C$/.test(a)) {} else reste.push(a); });
	var usage = "Usage:\n\thtpasswd [-cimB25dpsDv] [-C cost] [-r rounds] passwordfile username\n\thtpasswd -b[cmB25dpsDv] [-C cost] [-r rounds] passwordfile username password\n\n\thtpasswd -n[imB25dps] [-C cost] [-r rounds] username\n\thtpasswd -nb[mB25dps] [-C cost] [-r rounds] username password\n -c  Create a new file.\n -n  Don't update file; display results on stdout.\n -b  Use the password from the command line rather than prompting for it.\n -B  Force bcrypt hashing of the password (very secure).\n -D  Delete the specified user.\n -v  Verify password for the specified user.";
	var fichier = o.n ? null : reste.shift(), user = reste.shift(), mdpArg = reste.shift();
	if (!user || (o.b && mdpArg === undefined)) throw new ShellError(usage, 2);
	var h = machineIci() || Shell.hote();
	var ligneDe = function(m){ return user + ":" + (o.B ? bcryptPort(m) : "$apr1$" + hexDe("apr" + m, 8) + "$" + btoa(hexDe("apr1" + m, 16)).substring(0, 22)); };
	var ecrire = function(m){
		if (o.n){ GameEvents.fire({ type: "port", hote: h, cmd: "htpasswd", user: user, bcrypt: o.B, stdout: true }); return ligneDe(m) + "\n"; }
		var r = Shell.chercher(fichier, io, "htpasswd");
		if (!o.c && !(r.node instanceof Item)) throw new ShellError("htpasswd: cannot modify file " + fichier + "; use '-c' to create it", 1);
		if (r.node instanceof Room) throw new ShellError("htpasswd: cannot create file " + fichier, 1);
		if (!r.dir || (!io.sudo && !Shell.bit(r.dir, "w", io)) || (r.node && !io.sudo && !Shell.bit(r.node, "w", io))) throw new ShellError("htpasswd: cannot create file " + fichier, 1);
		var lignes = o.c || !r.node ? [] : r.node.getText().split("\n").filter(Boolean);
		var existe = lignes.some(function(l){ return l.split(":")[0] === user; });
		if (o.D){ lignes = lignes.filter(function(l){ return l.split(":")[0] !== user; }); }
		else if (existe) lignes = lignes.map(function(l){ return l.split(":")[0] === user ? ligneDe(m) : l; });
		else lignes.push(ligneDe(m));
		ecrireFichier(fichier, lignes.join("\n") + "\n", io, "htpasswd");
		GameEvents.fire({ type: "port", hote: h, cmd: "htpasswd", user: user, bcrypt: o.B, fichier: fichier, cree: o.c, supprime: o.D });
		return o.D ? "Deleting password for user " + user : (existe ? "Updating password for user " + user : "Adding password for user " + user);
	};
	if (o.D) return ecrire("");
	if (o.b){ io.err("htpasswd: warning: the password is visible on the command line (and in history)".replace(/.*/, "")); return ecrire(mdpArg); }
	if (!io.tty || !term || !term.demander) throw new ShellError("htpasswd: unable to read password from a pipe (use -b)", 1);
	term.demander("New password: ", true, function(m1){
		term.demander("Re-type new password: ", true, function(m2){
			if (m1 !== m2){ term.echo("htpasswd: password verification error"); Shell.fin(); return; }
			try { term.echo(ecrire(m1)); } catch (e){ if (e instanceof ShellError) term.echo(e.message); else throw e; }
			Shell.fin();
		});
	});
	return "";
};
/* dockerd --validate : la configuration est-elle lisible ? */
Shell.sorts.dockerd = function(args, io){
	var h = Shell.hote();
	if (!estHoteDockerPort(h)) throw new ShellError("bash: dockerd: command not found", 127);
	if (args.indexOf("--version") > -1 || args.indexOf("-v") > -1) return "Docker version " + VERSION_DOCKER_PORT + ", build 411e817";
	if (args.indexOf("--validate") > -1){
		var i = args.indexOf("--config-file"), f = i > -1 ? args[i + 1] : "/etc/docker/daemon.json";
		if (f !== "/etc/docker/daemon.json" && texteHote(h, cheminNormal(f.charAt(0) === "/" ? f : cheminDuLieuMachine(current_room) + "/" + f)) === null) throw new ShellError("unable to configure the Docker daemon with file " + f + ": open " + f + ": no such file or directory", 1);
		var r = lireDaemonJsonPort(h);
		GameEvents.fire({ type: "port", hote: h, cmd: "dockerdValidate", ok: !r.erreur });
		if (r.erreur) throw new ShellError(r.erreur, 1);
		return "configuration OK";
	}
	if (!io.sudo) throw new ShellError("dockerd needs to be started with root privileges. To run dockerd in rootless mode as an unprivileged user, see https://continent.lan/go/rootless/", 1);
	throw new ShellError("failed to start daemon: pid file found, ensure docker is not running or delete /var/run/docker.pid" + astuce(io, "Le démon tourne déjà sous systemd : sudo systemctl restart docker le relance proprement."), 1);
};
/* ctr : containerd vu de dessous (les conteneurs de docker vivent dans l'espace de noms moby). */
Shell.sorts.ctr = function(args, io){
	var h = Shell.hote();
	if (!estHoteDockerPort(h)) throw new ShellError("bash: ctr: command not found", 127);
	if (!io.sudo) throw new ShellError("ctr: failed to dial \"/run/containerd/containerd.sock\": connection error: desc = \"transport: error while dialing: dial unix /run/containerd/containerd.sock: connect: permission denied\"", 1);
	var a = args.slice(), ns = "default";
	for (var i = 0; i < a.length; i++){ if (a[i] === "-n" || a[i] === "--namespace"){ ns = a[i + 1]; a.splice(i, 2); i--; } else if (/^--namespace=/.test(a[i])){ ns = a[i].split("=")[1]; a.splice(i, 1); i--; } }
	var obj = a[0], act = a[1] || "ls";
	if (obj === "version" || a[0] === "--version") return "Client:\n  Version:  " + VERSION_CONTAINERD_PORT + "\n  Revision: \n  Go version: " + GO_DOCKER_PORT + "\n\nServer:\n  Version:  " + VERSION_CONTAINERD_PORT + "\n  Revision: \n  UUID: " + hexDe("ctr" + h, 8) + "-" + hexDe("ctr2" + h, 4) + "-" + hexDe("ctr3" + h, 4) + "-" + hexDe("ctr4" + h, 4) + "-" + hexDe("ctr5" + h, 12);
	if (obj === "namespaces" || obj === "ns") return "NAME LABELS \nmoby        ";
	var cs = ns === "moby" ? conteneursPort(h) : [];
	GameEvents.fire({ type: "port", hote: h, cmd: "ctr", objet: obj, ns: ns });
	if (obj === "containers" || obj === "c" || obj === "container"){
		return tableauSerrePort(["CONTAINER", "IMAGE", "RUNTIME"], cs.filter(function(c){ return c.etat.debut; }).map(function(c){ return [c.id, "-", "io.containerd.runc.v2"]; }), 4);
	}
	if (obj === "tasks" || obj === "t" || obj === "task"){
		return tableauSerrePort(["TASK", "PID", "STATUS"], cs.filter(enMarchePort).map(function(c){ return [c.id, String(c.etat.pid), "RUNNING"]; }), 4);
	}
	if (obj === "images" || obj === "i" || obj === "image") return "REF TYPE DIGEST SIZE PLATFORMS LABELS ";
	return "NAME:\n   ctr - \n        __\n  _____/ /______\n / ___/ __/ ___/\n/ /__/ /_/ /\n\\___/\\__/_/\n\ncontainerd CLI\n\nUSAGE:\n   ctr [global options] command [command options] [arguments...]\n\nCOMMANDS:\n   containers, c, container    Manage containers\n   images, image, i            Manage images\n   namespaces, namespace, ns   Manage namespaces\n   tasks, t, task              Manage tasks\n   version                     Print the client and server versions\n\nGLOBAL OPTIONS:\n   --namespace value, -n value  Namespace to use with commands (default: \"default\")";
};
/* ssh-keygen -lf sur un fichier known_hosts : une empreinte par ligne, l'hôte en commentaire. Et -lf groupé. */
var SSH_KEYGEN_AVANT_PORT = Shell.sorts["ssh-keygen"];
Shell.sorts["ssh-keygen"] = function(args, io){
	var a = [];
	args.forEach(function(x){ if (/^-l[f]$/.test(x)) a.push("-l", "-f"); else if (/^-[EvF]?lf$/.test(x)) a.push("-l", "-f"); else a.push(x); });
	var i = a.indexOf("-f");
	if (a.indexOf("-l") > -1 && i > -1 && a[i + 1]){
		var r = Shell.chercher(a[i + 1], io, "ssh-keygen");
		if (r.node instanceof Item){
			var lignes = r.node.getText().split("\n").filter(function(l){ return l.trim() && l.trim().charAt(0) !== "#"; });
			var known = lignes.length > 1 || (lignes[0] && /^\S+\s+(ssh-ed25519|ssh-rsa|ecdsa-sha2-\S+)\s+\S+/.test(lignes[0]) && !/^(ssh-ed25519|ssh-rsa|ecdsa)/.test(lignes[0]));
			if (known){
				if (!Shell.bit(r.node, "r", io)) throw new ShellError(a[i + 1] + ": Permission denied", 255);
				var sortie = lignes.map(function(l){
					var m = /^(\S+)\s+(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+)\s+(\S+)/.exec(l.trim());
					if (!m) return null;
					var taille = { "ssh-ed25519": 256, "ssh-rsa": 3072 }[m[2]] || 256;
					return taille + " " + empreinteSshPort(m[3]) + " " + m[1] + " (" + ({ "ssh-ed25519": "ED25519", "ssh-rsa": "RSA" }[m[2]] || "ECDSA") + ")";
				}).filter(Boolean);
				GameEvents.fire({ type: "port", hote: Shell.hote(), cmd: "keygenKnownHosts", fichier: a[i + 1], empreintes: sortie.slice() });
				return sortie.join("\n");
			}
		}
	}
	return SSH_KEYGEN_AVANT_PORT.call(this, a, io);
};
/* ss : les ports que tient docker-proxy pour les conteneurs publiés. */
var ECOUTES_AVANT_PORT = ecoutesHote;
ecoutesHote = function(hote){
	var liste = ECOUTES_AVANT_PORT.apply(this, arguments);
	if (!aDesConteneursPort(hote)) return liste;
	procsMachine(hote).filter(function(p){ return p.proxy && p.portHote; }).forEach(function(p){
		liste.push({ proto: "tcp", etat: "LISTEN", adresse: p.ipHote === "::" ? "::" : p.ipHote, port: p.portHote, pairAdresse: p.ipHote === "::" ? "::" : "0.0.0.0", pairPort: "*", programme: p.comm, pid: p.pid, utilisateur: p.user || "root", unite: p.comm === "docker-proxy" ? "docker.service" : null });
	});
	conteneursPort(hote).filter(function(c){ return enMarchePort(c) && c.hote.reseau === "host"; }).forEach(function(c){
		(c.ecoutes || []).forEach(function(port){ liste.push({ proto: "tcp", etat: "LISTEN", adresse: "0.0.0.0", port: port, pairAdresse: "0.0.0.0", pairPort: "*", programme: (c.programme && c.programme.comm) || "?", pid: c.etat.pid, utilisateur: "root", unite: null }); });
	});
	if (typeof ecoutesSwarmPort === "function") ecoutesSwarmPort(hote).forEach(function(x){ liste.push(x); });
	liste.sort(function(x, y){ return x.proto === y.proto ? x.port - y.port : (x.proto === "tcp" ? -1 : 1); });
	return liste;
};
/* id et groups sans argument : les groupes de la SESSION (lus à la connexion), pas ceux de /etc/group aujourd'hui. */
var ID_AVANT_PORT = Shell.sorts.id;
Shell.sorts.id = function(args, io){
	var h = portIci();
	if (!h || io.sudo || args.filter(function(a){ return a.charAt(0) !== "-"; }).length || !etatPort(h).sessionGroupes) return ID_AVANT_PORT.apply(this, arguments);
	var noms = groupesSessionPort(h), gs = groupesMachine(h), uid = uidMachine(h, JOUEUR);
	var membres = noms.map(function(n){ return gs.filter(function(g){ return g.nom === n; })[0]; }).filter(Boolean);
	var gp = gs.filter(function(g){ return g.nom === groupePrincipal(h, JOUEUR); })[0] || { nom: JOUEUR, gid: uid };
	membres = [gp].concat(membres.filter(function(g){ return g !== gp; }));
	if (args.indexOf("-u") > -1) return String(uid);
	if (args.indexOf("-g") > -1) return String(gp.gid);
	if (args.indexOf("-G") > -1) return membres.map(function(g){ return g.gid; }).join(" ");
	if (args.indexOf("-Gn") > -1 || args.indexOf("-nG") > -1) return membres.map(function(g){ return g.nom; }).join(" ");
	if (args.indexOf("-un") > -1 || args.indexOf("-nu") > -1) return JOUEUR;
	return "uid=" + uid + "(" + JOUEUR + ") gid=" + gp.gid + "(" + gp.nom + ") groups=" + membres.map(function(g){ return g.gid + "(" + g.nom + ")"; }).join(",");
};
var GROUPS_AVANT_PORT = Shell.sorts.groups;
Shell.sorts.groups = function(args, io){
	var h = portIci();
	if (!h || args.length || io.sudo || !etatPort(h).sessionGroupes) return GROUPS_AVANT_PORT.apply(this, arguments);
	var noms = groupesSessionPort(h), p = groupePrincipal(h, JOUEUR);
	return [p].concat(noms.filter(function(n){ return n !== p; })).join(" ");
};
/* $PWD sur une machine du port : le vrai chemin (/home/joueur/ecole), comme pwd. */
var VARIABLE_AVANT_PORT = Shell.variable;
Shell.variable = function(nom){
	if (nom === "PWD" && typeof portIci === "function" && portIci()) return Shell.cheminAffiche(current_room);
	if (nom === "HOME" && typeof portIci === "function" && portIci() && !state.env.hasOwnProperty("HOME")) return "/home/" + JOUEUR;
	return VARIABLE_AVANT_PORT.apply(this, arguments);
};
/* ls -l /var/run/docker.sock : un socket (s), au groupe docker. */
var LIGNE_LONGUE_AVANT_PORT = Shell.ligneLongue;
Shell.ligneLongue = function(noeud, nom, io){
	var t = LIGNE_LONGUE_AVANT_PORT.apply(this, arguments);
	if (noeud && noeud.socket && portIci()) return "s" + String(t).substring(1).replace(/ 0 ([A-Z][a-z]{2})/, " 0 $1");
	return t;
};
