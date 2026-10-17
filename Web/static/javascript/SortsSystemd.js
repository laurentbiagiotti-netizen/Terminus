/**
 * SortsSystemd.js : le moteur des machines modélisées, troisième partie : systemd et les journaux.
 *
 * Sur une machine modélisée, une unité systemd fait vivre de vrais processus : start les lance (selon ExecStart,
 * User=, et le profil que le monde déclare), stop les arrête, restart en donne de nouveaux (nouveau PID), et
 * Restart= est réellement appliqué quand le processus principal meurt (kill -9, systemctl kill, OOM). Les limites
 * de l'unité comptent : MemoryMax=, CPUQuota=, LimitNOFILE=, OOMScoreAdjust=, TimeoutStartSec=. Un service oneshot
 * exécute son ExecStart (un script du disque, lancé en root) puis s'arrête.
 *
 * Commandes : systemctl status (Main PID, Memory, CGroup, les dernières lignes du journal), kill, show, set-property,
 * reset-failed, --failed, list-dependencies, list-timers, les timers (OnCalendar, Persistent), systemd-analyze
 * (time, blame, critical-chain, calendar, verify ; security reste au Bastion), systemd-run, systemd-cgtop,
 * journalctl (-u, -b, --list-boots, -k, -p, -f, -n, -r, --since, --until, -g, -t, -o, --disk-usage, --vacuum-*),
 * dmesg (-T, -l, -H, -c). Ailleurs, chaque commande garde le comportement d'avant.
 *
 * --- Ce que le monde peut déclarer dans def (declarerMachine) ---
 *   profils: { "nom.service": function(h, M, directives){ return [gabarits de processus] } }   (le premier est le principal)
 *   tempsDemarrage: { "nom.service": ms }      pour systemd-analyze blame et critical-chain
 */

/* ================================================================== */
/* Les unités et leurs limites                                          */
/* ================================================================== */

function directivesMachine(h, unite){
	var charge = directivesChargees(h, unite);
	var f = fichiersUnite(vueSystemd(h), unite);
	if (!f.principal) charge = directivesUnite(fichiersUnite(vueLive(h), unite));
	var M = etatMachine(h), p = (M.proprietes || {})[unite];
	if (p){ charge.Service = charge.Service || {}; Object.keys(p).forEach(function(k){ charge.Service[k] = [p[k]]; }); }
	return charge;
}
function lireMemoireUnite(v){
	if (v === null || v === undefined || v === "" || v === "infinity") return null;
	var m = /^(\d+(?:\.\d+)?)([KMGT]?)$/i.exec(String(v).trim());
	if (!m) return null;
	return Math.round(+m[1] * ({ "": 1, K: KIO, M: MIO, G: GIO, T: TIO }[m[2].toUpperCase()]));
}
function lireDureeSystemd(v, defaut){
	if (v === null || v === undefined) return defaut;
	var t = String(v).trim(), total = 0, m, re = /(\d+(?:\.\d+)?)\s*(ms|msec|s|sec|min|m|h|hr|d|us)?/g, vu = false;
	if (t === "infinity") return Infinity;
	while ((m = re.exec(t))){ vu = true; total += +m[1] * ({ ms: 0.001, msec: 0.001, us: 0.000001, s: 1, sec: 1, min: 60, m: 60, h: 3600, hr: 3600, d: 86400 }[m[2] || "s"]); }
	return vu ? total : defaut;
}
/* Les limites effectives d'une unité : celles chargées au démarrage du service, plus set-property (immédiat). */
function limitesUnite(h, unite){
	var M = etatMachine(h), s = (M.services || {})[unite];
	var base = s && s.limites ? copieJson(s.limites) : limitesDepuisDirectives(directivesMachine(h, unite));
	var p = (M.proprietes || {})[unite] || {};
	if (p.MemoryMax !== undefined) base.memMax = lireMemoireUnite(p.MemoryMax);
	if (p.CPUQuota !== undefined) base.cpuQuota = /^(\d+)%$/.test(p.CPUQuota) ? +RegExp.$1 : null;
	return base;
}
function limitesDepuisDirectives(d){
	var v = function(k){ return derniere(d, "Service", k); };
	var cpu = v("CPUQuota");
	return { memMax: lireMemoireUnite(v("MemoryMax") || v("MemoryLimit")), cpuQuota: cpu && /^(\d+)%$/.test(cpu) ? +cpu.replace("%", "") : null,
		nofile: v("LimitNOFILE") ? (/^infinity$/.test(v("LimitNOFILE")) ? 1048576 : +String(v("LimitNOFILE")).split(":")[0]) : null,
		nofileDur: v("LimitNOFILE") ? +String(v("LimitNOFILE")).split(":").pop() || null : null,
		restart: v("Restart") || "no", restartSec: lireDureeSystemd(v("RestartSec"), 0.1), type: v("Type") || "simple", user: v("User") || "root",
		oomAdj: v("OOMScoreAdjust") !== null ? +v("OOMScoreAdjust") : null, timeoutStart: lireDureeSystemd(v("TimeoutStartSec"), 90),
		execStart: (v("ExecStart") || "").replace(/^[-@+!:]+/, ""), remain: oui(v("RemainAfterExit")), nice: v("Nice") !== null ? +v("Nice") : null,
		workingDirectory: v("WorkingDirectory") };
}
function utilisateurExiste(h, nom){ return (texteHote(h, "/etc/passwd") || "").split("\n").some(function(l){ return l.split(":")[0] === nom; }); }
function profilUnite(h, unite, lim){
	var d = defMachine(h) || {}, M = etatMachine(h);
	var exec = lim.execStart || "/usr/bin/" + unite.replace(/\.service$/, "");
	var gabarits = null;
	if (d.profils && typeof d.profils[unite] === "function"){ try { gabarits = d.profils[unite](h, M, lim); } catch (e){ gabarits = null; } }
	if (!gabarits || !gabarits.length) gabarits = [{ comm: exec.split(/\s+/)[0].split("/").pop(), cpu: 0.3, rss: 18000 }];
	return gabarits.map(function(g, i){ var x = copieJson(g); if (i === 0){ x.cmd = x.cmd || exec; } return x; });
}
/* Ce qui empêche un service de démarrer : un exécutable absent, un utilisateur inconnu, un port déjà pris. */
function refusDemarrage(h, unite, lim){
	var exe = lim.execStart.split(/\s+/)[0];
	if (!lim.execStart) return { code: "203/EXEC", message: unite + ": Service has no ExecStart=, ExecStop=, or SuccessAction=. Refusing." };
	if (exe.charAt(0) !== "/") return { code: "203/EXEC", message: unite + ": Executable path is not absolute, ignoring: " + lim.execStart };
	var f = fichierHote(h, exe);
	if (!f && !/^\/(usr\/)?(s?bin|lib)\//.test(exe)) return { code: "203/EXEC", message: unite.replace(/\.service$/, "") + ": Failed to execute " + exe + ": No such file or directory", ligne: unite + ": Failed at step EXEC spawning " + exe + ": No such file or directory" };
	if (f && !/x/.test(f.mode)) return { code: "203/EXEC", message: unite.replace(/\.service$/, "") + ": Failed to execute " + exe + ": Permission denied", ligne: unite + ": Failed at step EXEC spawning " + exe + ": Permission denied" };
	if (lim.user && lim.user !== "root" && !utilisateurExiste(h, lim.user)) return { code: "217/USER", message: unite + ": Failed to determine user credentials: No such process", ligne: unite + ": Failed at step USER spawning " + exe + ": No such process" };
	var gab = profilUnite(h, unite, lim)[0];
	var pris = (gab.ports || []).filter(function(port){ return procsMachine(h).some(function(p){ return p.unite !== unite && (p.ports || []).indexOf(port) > -1 && p.etat !== "Z"; }); });
	if (pris.length) return { code: "1/FAILURE", message: gab.comm + ": bind 0.0.0.0:" + pris[0] + ": Address already in use", processus: true };
	return null;
}
/* Démarrer les processus d'une unité. */
function lancerUnite(h, unite, raison){
	var M = etatMachine(h);
	M.services = M.services || {};
	var lim = limitesDepuisDirectives(directivesMachine(h, unite));
	var desc = uniteInfo(h, unite).description;
	var precedent = M.services[unite] || {};
	var gabs = profilUnite(h, unite, lim);
	var principal = null;
	gabs.forEach(function(g, i){
		g.user = g.user || lim.user;
		g.unite = unite;
		g.principal = i === 0;
		g.groupeUnite = i > 0;
		g.limiteNofile = lim.nofile || 1024;
		g.limiteNofileDure = lim.nofileDur || 524288;
		if (lim.oomAdj !== null) g.oomAdj = lim.oomAdj;
		if (lim.nice !== null) g.ni = lim.nice;
		if (lim.workingDirectory) g.cwd = lim.workingDirectory;
		if (i > 0 && principal) g.ppid = principal.pid;
		// Sous MemoryMax, un service démarre petit : il grossit ensuite (sa fuite) jusqu'à la limite.
		if (lim.memMax && (g.rss || 0) * 1024 > lim.memMax * 0.4) g.rss = Math.round(lim.memMax * 0.4 / 1024);
		var p = lancerProcessusMachine(h, g);
		if (i === 0) principal = p;
	});
	M.services[unite] = { pid: principal.pid, depuis: maintenantMachine(h), limites: lim, redemarrages: raison === "restart-auto" ? (precedent.redemarrages || 0) + 1 : (precedent.redemarrages || 0), resultat: "success" };
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: (lim.type === "oneshot" ? "Starting " : "Started ") + unite + " - " + desc + (lim.type === "oneshot" ? "..." : ".") });
	if (gabs[0].annonceJournal) journalMachine(h, { unite: principal.comm, pid: principal.pid, unit: unite, message: gabs[0].annonceJournal });
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "lancee", unite: unite, pid: principal.pid, raison: raison || "start" });
	if (lim.type === "oneshot") executerOneshot(h, unite, principal, lim, desc);
	return principal;
}
/* Un service oneshot exécute son ExecStart tout de suite : un script du disque, lancé en root comme le ferait systemd. */
var EXECUTION_SERVICE_MACHINE = 0;
var KNOWS_AVANT_MACHINES = GameState.prototype.knows;
GameState.prototype.knows = function(sort){ if (EXECUTION_SERVICE_MACHINE > 0) return true; return KNOWS_AVANT_MACHINES.apply(this, arguments); };
function executerOneshot(h, unite, principal, lim, desc){
	var M = etatMachine(h), argv = lim.execStart.split(/\s+/), code = 0, erreurs = [], sortie = "";
	var io = { sudo: true, tty: false, stdin: null, code: 0, err: function(m){ erreurs.push(sansAnsi(String(m))); }, errFin: function(m){ erreurs.push(sansAnsi(String(m))); } };
	EXECUTION_SERVICE_MACHINE++;
	Shell.enRoot++;
	var narration = Shell.narration.slice();
	try {
		var f = fichierHote(h, argv[0]);
		if (f && !f.binaire) sortie = Shell.lancerScript(argv[0], io, true, argv.slice(1)) || "";
		else { var r = Shell.lancerSousCommande([argv[0].split("/").pop()].concat(argv.slice(1)), io, "systemd"); sortie = r.sortie; code = r.code; }
		code = code || io.code || 0;
	} catch (e){
		if (!(e instanceof ShellError)) throw e;
		erreurs.push(sansAnsi(e.message)); code = e.code || 1;
	} finally { EXECUTION_SERVICE_MACHINE--; Shell.enRoot--; Shell.narration = narration; }
	String(sortie || "").split("\n").filter(Boolean).slice(0, 8).forEach(function(l){ journalMachine(h, { unite: argv[0].split("/").pop(), pid: principal.pid, unit: unite, message: sansAnsi(l) }); });
	erreurs.slice(0, 8).forEach(function(l){ journalMachine(h, { unite: argv[0].split("/").pop(), pid: principal.pid, unit: unite, prio: 3, message: l }); });
	retirerProcessus(h, principal);
	var s = M.services[unite];
	s.pid = null; s.dernierPid = principal.pid; s.fin = maintenantMachine(h); s.code = code;
	var info = uniteInfo(h, unite);
	if (code){
		s.resultat = "exit-code";
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 3, message: unite + ": Main process exited, code=exited, status=" + code + "/FAILURE" });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 4, message: unite + ": Failed with result 'exit-code'." });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 3, message: "Failed to start " + unite + " - " + desc + "." });
		marquerEchec(h, info);
	} else {
		s.resultat = "success";
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: unite + ": Deactivated successfully." });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: "Finished " + unite + " - " + desc + "." });
		if (!lim.remain) changerEtatUnite(h, uniteInfo(h, unite), { actif: false });
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "oneshot", unite: unite, code: code });
}
function arreterUnite(h, unite, silence){
	var M = etatMachine(h), desc = uniteInfo(h, unite).description;
	var procs = procsMachine(h).filter(function(p){ return p.unite === unite; });
	if (!procs.length && !silence) return;
	procs.forEach(function(p){ retirerProcessus(h, p); });
	if (M.services && M.services[unite]){ M.services[unite].dernierPid = M.services[unite].pid; M.services[unite].pid = null; M.services[unite].fin = maintenantMachine(h); }
	if (!silence){
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: "Stopping " + unite + " - " + desc + "..." });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: unite + ": Deactivated successfully." });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: "Stopped " + unite + " - " + desc + "." });
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "arretee", unite: unite });
}
/* Le processus principal d'un service est mort (kill, systemctl kill, OOM) : Restart= décide. */
var NOMS_STATUTS_SIGNAUX = { 1: "HUP", 2: "INT", 9: "KILL", 15: "TERM", 6: "ABRT", 11: "SEGV" };
function uniteMorteMachine(h, p, signal, origine){
	var M = etatMachine(h), unite = p.unite, s = (M.services || {})[unite];
	if (!s || s.pid !== p.pid) return;
	var lim = limitesUnite(h, unite), desc = uniteInfo(h, unite).description;
	var propre = signal === 15 || signal === 1 || signal === 2;
	var nomSig = NOMS_STATUTS_SIGNAUX[signal] || String(signal);
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: propre ? 6 : 5, message: unite + ": Main process exited, code=killed, status=" + signal + "/" + nomSig });
	var relancer = lim.restart === "always" || (!propre && ["on-failure", "on-abnormal", "on-abort"].indexOf(lim.restart) > -1) || (lim.restart === "on-success" && propre);
	if (origine === "cgroup-oom" || origine === "oom") relancer = ["always", "on-failure", "on-abnormal"].indexOf(lim.restart) > -1;
	s.pid = null;
	s.dernierPid = p.pid;
	s.resultat = origine === "cgroup-oom" || origine === "oom" ? "oom-kill" : "signal";
	if (!propre) journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 4, message: unite + ": Failed with result '" + s.resultat + "'." });
	else journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: unite + ": Deactivated successfully." });
	if (relancer){
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: unite + ": Scheduled restart job, restart counter is at " + ((s.redemarrages || 0) + 1) + "." });
		journalMachine(h, { unite: "systemd", pid: 1, unit: unite, message: "Stopped " + unite + " - " + desc + "." });
		var nouveau = lancerUnite(h, unite, "restart-auto");
		GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "relancee", unite: unite, ancien: p.pid, pid: nouveau.pid, signal: signal });
		return;
	}
	var info = uniteInfo(h, unite);
	if (propre && lim.restart !== "always") changerEtatUnite(h, info, { actif: false });
	else marquerEchec(h, info);
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "morte", unite: unite, signal: signal });
}
/* Les unités qu'on fait vivre : celles qui ont un service sur le disque. */
function unitesAvecProcessus(h){
	return unitesHote(h).filter(function(u){ return /\.service$/.test(u) && !!uniteInfo(h, u).fichiers.principal; });
}
/* Mettre les processus d'accord avec l'état systemd (après un systemctl, ou au démarrage du chapitre). */
function synchroniserUnites(h, unites){
	var M = etatMachine(h);
	M.services = M.services || {};
	(unites || unitesAvecProcessus(h)).forEach(function(u){
		var e = etatUnite(h, u), procs = procsMachine(h).filter(function(p){ return p.unite === u && p.principal; });
		var lim = limitesDepuisDirectives(directivesMachine(h, u));
		if (e.actif && !procs.length && lim.type !== "oneshot") lancerUnite(h, u, "start");
		if (!e.actif && procs.length) arreterUnite(h, u, false);
	});
}
/* Une dépendance dure (Requires=, BindsTo=) vers une unité qui n'existe pas : systemd refuse de démarrer. */
function dependancesManquantes(h, unite){
	var d = directivesMachine(h, unite), l = [];
	["Requires", "BindsTo", "Requisite"].forEach(function(k){
		var v = derniere(d, "Unit", k);
		String(v || "").split(/\s+/).filter(Boolean).forEach(function(n){ if (!uniteInfo(h, n).existe) l.push(nomUniteComplet(n)); });
	});
	return l;
}
controleAvantDemarrage(function(h, unite, action){
	if (!estMachine(h) || action === "reload" || !/\.service$/.test(unite)) return null;
	var info = uniteInfo(h, unite);
	if (!info.fichiers.principal) return null;
	var manque = dependancesManquantes(h, unite);
	if (!manque.length) return null;
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 3, message: "Dependency failed for " + unite + " - " + info.description + "." });
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 4, message: unite + ": Job " + unite + "/" + action + " failed with result 'dependency'." });
	marquerEchec(h, info);
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "dependance", unite: unite, manque: manque });
	throw new ShellError("Failed to " + (action === "restart" ? "restart" : "start") + " " + unite + ": Unit " + manque[0] + " not found.", 5);
});
/* Un contrôle avant start/restart : exécutable, utilisateur, port. */
controleAvantDemarrage(function(h, unite, action){
	if (!estMachine(h) || action === "reload" || !/\.service$/.test(unite)) return null;
	var info = uniteInfo(h, unite);
	if (!info.fichiers.principal) return null;
	var lim = limitesDepuisDirectives(directivesMachine(h, unite));
	if (action === "restart"){ arreterUnite(h, unite, true); }
	var r = refusDemarrage(h, unite, lim);
	if (!r) return null;
	var M = etatMachine(h), pid = nouveauPid(h);
	M.services = M.services || {};
	M.services[unite] = { pid: null, dernierPid: pid, depuis: maintenantMachine(h), fin: maintenantMachine(h), limites: lim, redemarrages: (M.services[unite] || {}).redemarrages || 0, resultat: "exit-code", code: r.code };
	if (r.processus) journalMachine(h, { unite: profilUnite(h, unite, lim)[0].comm, pid: pid, unit: unite, prio: 3, message: r.message });
	else journalMachine(h, { unite: "(" + lim.execStart.split(/\s+/)[0].split("/").pop() + ")", pid: pid, unit: unite, prio: 3, message: r.ligne || r.message });
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 5, message: unite + ": Main process exited, code=exited, status=" + r.code });
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 4, message: unite + ": Failed with result 'exit-code'." });
	journalMachine(h, { unite: "systemd", pid: 1, unit: unite, prio: 3, message: "Failed to start " + unite + " - " + info.description + "." });
	GameEvents.fire({ type: "machine", hote: h, cmd: "unite", action: "echec", unite: unite, code: r.code });
	return r.message;
});

/* ================================================================== */
/* systemctl, sur une machine modélisée                                 */
/* ================================================================== */

function dateSystemdMachine(h, ms){ var d = dateMachine(h, ms); return JOURS_EN[d.getDay()] + " " + d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + abregeFuseau(h); }
function dureeSystemd(ms){
	var s = Math.max(0, Math.round(ms / 1000));
	if (s < 60) return s + "s";
	var m = Math.floor(s / 60);
	if (m < 60) return (m + "min " + (s % 60 ? (s % 60) + "s" : "")).trim();
	var hh = Math.floor(m / 60);
	if (hh < 24) return hh + "h " + (m % 60) + "min";
	var j = Math.floor(hh / 24);
	return j + " day" + (j > 1 ? "s" : "") + " " + (hh % 24) + "h";
}
function memoireTexte(o){ return humainFree(Math.round(o / 1024)).replace("Gi", "G").replace("Mi", "M").replace("Ki", "K"); }
function lignesJournalUnite(h, unite, n){
	var M = etatMachine(h);
	return (M.journal || []).filter(function(e){ return e.unit === unite && e.b === 0; }).slice(-n).map(function(e){ return ligneJournal(h, e, "short"); });
}
function statutMachine(h, unite, io){
	var info = uniteInfo(h, unite);
	if (!info.existe && !info.masque){ io.code = 4; throw new ShellError("Unit " + info.unite + " could not be found.", 4); }
	if (info.masque || info.type !== "service" && info.type !== "timer") return statutUnite(h, info, io);
	var M = etatMachine(h), s = (M.services || {})[info.unite] || {}, lignes = [];
	var lim = limitesUnite(h, info.unite), puce = info.echec ? (io.tty ? C.rouge("×") : "×") : (info.actif ? (io.tty ? C.vert("●") : "●") : "○");
	lignes.push(puce + " " + info.unite + " - " + info.description);
	lignes.push("     Loaded: loaded (" + (info.chemin || "/lib/systemd/system/" + info.unite) + "; " + (info.etatFichier || "static") + "; preset: enabled)");
	if (info.fichiers.dropins.length){
		var parDossier = {};
		info.fichiers.dropins.forEach(function(x){ var d = dossierDe(x.chemin); (parDossier[d] = parDossier[d] || []).push(x.nom); });
		Object.keys(parDossier).forEach(function(d, k){ lignes.push((k === 0 ? "    Drop-In: " : "             ") + d, "             └─" + parDossier[d].join(", ")); });
	}
	if (info.type === "timer"){
		var t = timerInfo(h, info.unite);
		lignes.push("     Active: " + (info.actif ? (io.tty ? C.vert("active (waiting)") : "active (waiting)") + " since " + dateSystemdMachine(h, s.depuis || maintenantMachine(h)) + "; " + dureeSystemd(maintenantMachine(h) - (s.depuis || maintenantMachine(h))) + " ago" : "inactive (dead)"));
		lignes.push("    Trigger: " + (info.actif && t.prochain ? dateSystemdMachine(h, t.prochain) + "; " + dureeSystemd(t.prochain - maintenantMachine(h)) + " left" : "n/a"));
		lignes.push("   Triggers: ● " + t.active);
		io.code = info.actif ? 0 : 3;
		return lignes.join("\n");
	}
	var declencheur = timersMachine(h).filter(function(t){ return t.active === info.unite; })[0];
	if (declencheur) lignes.push("TriggeredBy: " + (etatUnite(h, declencheur.unite).actif ? "● " : "○ ") + declencheur.unite);
	var p = s.pid ? procParPid(h, s.pid) : null;
	if (info.echec){
		lignes.push("     Active: " + (io.tty ? C.rouge("failed") : "failed") + " (Result: " + (s.resultat || "exit-code") + ") since " + dateSystemdMachine(h, s.fin || maintenantMachine(h)) + "; " + dureeSystemd(maintenantMachine(h) - (s.fin || maintenantMachine(h))) + " ago");
		if (s.dernierPid) lignes.push("    Process: " + s.dernierPid + " ExecStart=" + lim.execStart + " (code=" + (s.resultat === "signal" || s.resultat === "oom-kill" ? "killed, signal=KILL" : "exited, status=" + (s.code || "1/FAILURE")) + ")", "   Main PID: " + s.dernierPid + " (code=" + (s.resultat === "signal" || s.resultat === "oom-kill" ? "killed, signal=KILL" : "exited, status=" + (s.code || "1/FAILURE")) + ")");
	} else if (info.actif && p){
		lignes.push("     Active: " + (io.tty ? C.vert("active (running)") : "active (running)") + " since " + dateSystemdMachine(h, s.depuis) + "; " + dureeSystemd(maintenantMachine(h) - s.depuis) + " ago");
		lignes.push("   Main PID: " + p.pid + " (" + p.comm + ")");
		var procs = procsMachine(h).filter(function(x){ return x.unite === info.unite; });
		var rss = procs.reduce(function(a, x){ return a + (x.etat === "Z" ? 0 : x.rss); }, 0) * 1024;
		lignes.push("      Tasks: " + procs.reduce(function(a, x){ return a + (x.threads || 1); }, 0) + " (limit: 9387)");
		lignes.push("     Memory: " + memoireTexte(rss) + (lim.memMax ? " (max: " + memoireTexte(lim.memMax) + " available: " + memoireTexte(Math.max(0, lim.memMax - rss)) + ")" : ""));
		lignes.push("        CPU: " + tempsCpu(h, p, "systemd").replace(/^00:/, "").replace(/^(\d\d):(\d\d)$/, function(t, m, sec){ return (+m ? +m + "min " : "") + +sec + ".312s"; }));
		lignes.push("     CGroup: /system.slice/" + info.unite);
		procs.forEach(function(x, k){ lignes.push("             " + (k === procs.length - 1 ? "└─" : "├─") + x.pid + " " + (x.etat === "Z" ? "[" + x.comm + "] <defunct>" : x.cmd)); });
	} else if (lim.type === "oneshot" && s.dernierPid){
		lignes.push("     Active: inactive (dead) since " + dateSystemdMachine(h, s.fin) + "; " + dureeSystemd(maintenantMachine(h) - s.fin) + " ago");
		lignes.push("    Process: " + s.dernierPid + " ExecStart=" + lim.execStart + " (code=exited, status=" + (s.code ? s.code + "/FAILURE" : "0/SUCCESS") + ")", "   Main PID: " + s.dernierPid + " (code=exited, status=" + (s.code ? s.code + "/FAILURE" : "0/SUCCESS") + ")");
	} else {
		lignes.push("     Active: inactive (dead)" + (s.fin ? " since " + dateSystemdMachine(h, s.fin) + "; " + dureeSystemd(maintenantMachine(h) - s.fin) + " ago" : ""));
	}
	var j = lignesJournalUnite(h, info.unite, 6);
	if (j.length) lignes.push("", j.join("\n"));
	if (changeSurDisque(h, info.unite)) lignes.push("", (io.tty ? C.jaune("Warning:") : "Warning:") + " The unit file, source configuration file or drop-ins of " + info.unite + " changed on disk. Run 'systemctl daemon-reload' to reload units.");
	io.code = info.echec ? 3 : (info.actif ? 0 : 3);
	return lignes.join("\n");
}
var ACTIONS_VIE_SYSTEMCTL = ["start", "stop", "restart", "reload", "try-restart", "reload-or-restart", "try-reload-or-restart", "enable", "disable", "reenable", "mask"];
/* Sur une machine modélisée, une unité qu'on vient d'écrire n'est pas activée tant qu'on n'a pas fait enable. */
var UNITE_INFO_AVANT_MACHINES = uniteInfo;
uniteInfo = function(hote, nom){
	var i = UNITE_INFO_AVANT_MACHINES.apply(this, arguments);
	if (!estMachine(hote) || i.service || i.masque || !i.existe) return i;
	var b = etatBastion(), etat = (b.unites[hote] || {})[i.unite], decl = (UNITES_DECLAREES[hote] || {})[i.unite];
	if ((!etat || etat.auto === undefined) && (!decl || decl.enabled === undefined) && i.auto){
		i.auto = false;
		if (i.etatFichier === "enabled") i.etatFichier = "disabled";
	}
	return i;
};
var SYSTEMCTL_AVANT_MACHINES = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var h = machineIci();
	if (!h) return SYSTEMCTL_AVANT_MACHINES.apply(this, arguments);
	// Les options qui prennent une valeur (-s KILL, -p MemoryMax, -t service, -n 20) : la valeur n'est pas une unité.
	var AVEC_VALEUR = ["-s", "--signal", "-p", "--property", "-t", "--type", "--state", "-n", "--lines", "-o", "--output", "-H", "--host", "-M", "--machine", "--kill-whom", "--kill-who"];
	var mots = [], options = [];
	for (var ia = 0; ia < args.length; ia++){
		if (args[ia].charAt(0) !== "-"){ mots.push(args[ia]); continue; }
		options.push(args[ia]);
		if (AVEC_VALEUR.indexOf(args[ia]) > -1 && args[ia + 1] !== undefined){ ia++; options.push(args[ia]); }
	}
	var action = mots[0] || "list-units";
	var opt = function(nom){ var o = options.filter(function(x){ return x.indexOf(nom + "=") === 0; })[0]; return o ? o.substring(nom.length + 1).split(",") : null; };
	var noms = mots.slice(1).map(function(n){ return nomUniteComplet(n); });
	if (options.indexOf("--failed") > -1 || (action === "list-units" && opt("--state") && opt("--state").indexOf("failed") > -1)) return listeEchecs(h, io);
	if (action === "status" && noms.length) return noms.map(function(u){ GameEvents.fire({ type: "systemctl", action: "status", host: h, service: u.replace(/\.service$/, "") }); GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "status", unite: uniteInfo(h, u).unite }); return statutMachine(h, u, io); }).join("\n\n");
	if (action === "kill") return systemctlKill(h, noms, args, io);
	if (action === "show") return systemctlShow(h, noms, args, io);
	if (action === "set-property") return systemctlSetProperty(h, mots.slice(1), options, io);
	if (action === "reset-failed") return systemctlResetFailed(h, noms, io);
	if (action === "list-dependencies") return systemctlDependances(h, noms[0] || "default.target", io);
	if (action === "list-timers" || (ACTIONS_VIE_SYSTEMCTL.concat(["is-active", "is-enabled", "cat"]).indexOf(action) > -1 && noms.some(function(n){ return /\.timer$/.test(n); }))){
		if (action === "list-timers") return listeTimers(h, options.indexOf("--all") > -1, io);
		var sortieT = systemctlGere(h, action, [action].concat(mots.slice(1).filter(function(n){ return /\.timer$/.test(n); })), options, io, options.indexOf("--all") > -1, options.indexOf("--now") > -1, opt);
		noms.forEach(function(u){ if (/\.timer$/.test(u)){ var M = etatMachine(h); M.services = M.services || {}; var st = M.services[u] = M.services[u] || {}; if (etatUnite(h, u).actif && !st.depuis) st.depuis = maintenantMachine(h); if (!etatUnite(h, u).actif) st.depuis = null; GameEvents.fire({ type: "machine", hote: h, cmd: "timer", action: action, unite: u, actif: etatUnite(h, u).actif, enabled: etatUnite(h, u).enabled }); } });
		var autres = noms.filter(function(n){ return !/\.timer$/.test(n); });
		if (autres.length && ACTIONS_VIE_SYSTEMCTL.indexOf(action) > -1){ var r2 = Shell.sorts.systemctl([action].concat(options, autres), io); return [sortieT, r2].filter(Boolean).join("\n"); }
		return sortieT;
	}
	if (action === "daemon-reload"){ var rr = SYSTEMCTL_AVANT_MACHINES.apply(this, arguments); etatMachine(h).fstabCharge = texteHote(h, "/etc/fstab") || ""; GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "daemon-reload" }); return rr; }
	if (ACTIONS_VIE_SYSTEMCTL.indexOf(action) === -1) return SYSTEMCTL_AVANT_MACHINES.apply(this, arguments);
	var avant = {};
	noms.forEach(function(u){ var i = uniteInfo(h, u); avant[i.unite] = etatUnite(h, i.unite).actif; });
	var sortie;
	try { sortie = SYSTEMCTL_AVANT_MACHINES.apply(this, arguments); }
	finally {
		Object.keys(avant).forEach(function(u){
			if (!/\.service$/.test(u) || !uniteInfo(h, u).fichiers.principal) return;
			var e = etatUnite(h, u), lim = limitesDepuisDirectives(directivesMachine(h, u));
			var principal = procsMachine(h).filter(function(p){ return p.unite === u && p.principal; })[0];
			var relance = (action === "restart" || action === "try-restart" || (action === "reload-or-restart" && !avant[u])) || (action === "start" && lim.type === "oneshot");
			if (e.actif && relance && !e.echec){ if (principal) arreterUnite(h, u, true); lancerUnite(h, u, action); }
			else if (e.actif && !principal && lim.type !== "oneshot") lancerUnite(h, u, action);
			else if (e.actif && action === "reload" && principal){ journalMachine(h, { unite: "systemd", pid: 1, unit: u, message: "Reloading " + u + " - " + uniteInfo(h, u).description + "..." }); journalMachine(h, { unite: "systemd", pid: 1, unit: u, message: "Reloaded " + u + " - " + uniteInfo(h, u).description + "." }); principal.recharge = maintenantMachine(h); }
			else if (!e.actif && principal) arreterUnite(h, u, false);
			GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: action, unite: u, actif: etatUnite(h, u).actif, echec: etatUnite(h, u).echec, now: options.indexOf("--now") > -1 });
		});
		if (noms.indexOf("systemd-journald.service") > -1 && /start|restart/.test(action)) appliquerJournald(h);
	}
	return sortie;
};
function listeEchecs(h, io){
	var l = unitesHote(h).map(function(u){ return uniteInfo(h, u); }).filter(function(i){ return i.echec; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "failed", nombre: l.length, unites: l.map(function(i){ return i.unite; }) });
	var larg = Math.max(4, Math.max.apply(null, l.map(function(i){ return i.unite.length; }).concat([0])));
	var lignes = ["  " + completerDroite("UNIT", larg) + " LOAD   ACTIVE SUB    DESCRIPTION"];
	l.forEach(function(i){ lignes.push((io.tty ? C.rouge("●") : "●") + " " + completerDroite(i.unite, larg) + " loaded failed failed " + i.description); });
	lignes.push("", "LOAD   = Reflects whether the unit definition was properly loaded.", "ACTIVE = The high-level unit activation state, i.e. generalization of SUB.", "SUB    = The low-level unit activation state, values depend on unit type.", l.length + " loaded units listed.");
	return lignes.join("\n");
}
function systemctlKill(h, noms, args, io){
	var signal = 15, qui = "all";
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-s" || args[i] === "--signal"){ signal = lireSignal(args[++i]); continue; }
		if (/^--signal=/.test(args[i])){ signal = lireSignal(args[i].split("=")[1]); continue; }
		if (/^--kill-whom=/.test(args[i])){ qui = args[i].split("=")[1]; continue; }
		if (/^--kill-who=/.test(args[i])){ qui = args[i].split("=")[1]; continue; }
	}
	if (signal === null) throw new ShellError("Failed to parse signal string " + args[args.indexOf("-s") + 1] + ".", 1);
	if (!noms.length) throw new ShellError("Too few arguments.", 1);
	noms.forEach(function(u){
		var info = uniteInfo(h, u);
		if (!io.sudo) throw new ShellError("Failed to kill unit " + info.unite + ": Access denied" + astuce(io, "sudo systemctl kill ..."), 1);
		if (!info.existe) throw new ShellError("Failed to kill unit " + info.unite + ": Unit " + info.unite + " not loaded.", 1);
		var procs = procsMachine(h).filter(function(p){ return p.unite === info.unite && (qui === "all" || (qui === "main" ? p.principal : !p.principal)); });
		if (!procs.length) throw new ShellError("Failed to kill unit " + info.unite + ": No main PID to kill", 1);
		var principal = procs.filter(function(p){ return p.principal; })[0];
		procs.filter(function(p){ return !p.principal; }).forEach(function(p){ tuerProcessusMachine(h, p, signal, "systemctl-kill"); });
		if (principal) tuerProcessusMachine(h, principal, signal, "systemctl-kill");
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "kill", unite: info.unite, signal: signal });
	});
	return "";
}
function systemctlShow(h, noms, args, io){
	var props = [], valeur = args.indexOf("--value") > -1;
	args.forEach(function(a, i){ if (a === "-p" || a === "--property") props = props.concat((args[i + 1] || "").split(",")); if (/^--property=/.test(a)) props = props.concat(a.substring(11).split(",")); if (/^-p.+/.test(a)) props = props.concat(a.substring(2).split(",")); });
	noms = noms.filter(function(n){ return props.indexOf(n.replace(/\.service$/, "")) === -1; });
	if (!noms.length) noms = [];
	var blocs = noms.map(function(u){
		var info = uniteInfo(h, u), lim = limitesUnite(h, info.unite), M = etatMachine(h), s = (M.services || {})[info.unite] || {};
		var procs = procsMachine(h).filter(function(p){ return p.unite === info.unite; });
		var memoire = procs.reduce(function(a, p){ return a + p.rss; }, 0) * 1024;
		var t = {
			Type: lim.type, Restart: lim.restart, RestartUSec: lim.restartSec >= 1 ? lim.restartSec + "s" : Math.round(lim.restartSec * 1000) + "ms", TimeoutStartUSec: lim.timeoutStart === 90 ? "1min 30s" : dureeSystemdCourte(lim.timeoutStart),
			MainPID: s.pid || 0, NRestarts: s.redemarrages || 0, Result: s.resultat || "success", ExecMainPID: s.pid || s.dernierPid || 0,
			MemoryCurrent: info.actif ? memoire : "[not set]", MemoryMax: lim.memMax || "infinity", MemoryHigh: "infinity", CPUQuotaPerSecUSec: lim.cpuQuota ? lim.cpuQuota * 10 + "ms" : "infinity",
			LimitNOFILE: lim.nofileDur || (lim.nofile ? lim.nofile : 524288), LimitNOFILESoft: lim.nofile || 1024, OOMScoreAdjust: lim.oomAdj || 0, TasksCurrent: procs.length, TasksMax: 9387,
			User: lim.user === "root" ? "" : lim.user, Id: info.unite, Names: info.unite, Description: info.description, LoadState: info.existe ? "loaded" : "not-found",
			ActiveState: info.echec ? "failed" : (info.actif ? "active" : "inactive"), SubState: info.echec ? "failed" : (info.actif ? (lim.type === "oneshot" ? "exited" : "running") : "dead"),
			FragmentPath: info.chemin || "", DropInPaths: info.fichiers.dropins.map(function(x){ return x.chemin; }).join(" "), UnitFileState: info.etatFichier || "",
			ExecStart: "{ path=" + lim.execStart.split(/\s+/)[0] + " ; argv[]=" + lim.execStart + " ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a] ; pid=0 ; code=(null) ; status=0/0 }",
			Requires: (derniere(info.directives, "Unit", "Requires") || ""), After: (derniere(info.directives, "Unit", "After") || ""), WantedBy: (derniere(info.directives, "Install", "WantedBy") || "")
		};
		var cles = props.length ? props : Object.keys(t);
		return cles.map(function(k){ var v = t.hasOwnProperty(k) ? t[k] : ""; return valeur ? String(v) : k + "=" + v; }).join("\n");
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "show", unites: noms, proprietes: props });
	return blocs.join("\n\n");
}
function dureeSystemdCourte(s){ if (s === Infinity) return "infinity"; if (s >= 60) return Math.floor(s / 60) + "min" + (s % 60 ? " " + s % 60 + "s" : ""); return s + "s"; }
function systemctlSetProperty(h, mots, options, io){
	if (mots.length < 2) throw new ShellError("Too few arguments.", 1);
	var info = uniteInfo(h, nomUniteComplet(mots[0]));
	if (!io.sudo) throw new ShellError("Failed to set unit properties on " + info.unite + ": Access denied" + astuce(io, "sudo systemctl set-property ..."), 1);
	if (!info.existe) throw new ShellError("Failed to set unit properties on " + info.unite + ": Unit " + info.unite + " not found.", 1);
	var M = etatMachine(h), runtime = options.indexOf("--runtime") > -1;
	M.proprietes = M.proprietes || {};
	var connues = ["CPUQuota", "MemoryMax", "MemoryHigh", "CPUWeight", "IOWeight", "TasksMax", "MemoryLow", "AllowedCPUs"];
	mots.slice(1).forEach(function(kv){
		var m = /^([A-Za-z]+)=(.*)$/.exec(kv);
		if (!m || connues.indexOf(m[1]) === -1) throw new ShellError("Failed to set unit properties on " + info.unite + ": Cannot set property " + (m ? m[1] : kv) + ", or unknown property.", 1);
		if (m[1] === "CPUQuota" && !/^\d+%$/.test(m[2])) throw new ShellError("Failed to parse " + m[1] + "= value: " + m[2], 1);
		if (/^Memory/.test(m[1]) && m[2] !== "infinity" && lireMemoireUnite(m[2]) === null) throw new ShellError("Failed to parse " + m[1] + "= value: " + m[2], 1);
		(M.proprietes[info.unite] = M.proprietes[info.unite] || {})[m[1]] = m[2];
		moteurSeul(function(){ ecrireFichierHote(h, (runtime ? "/run" : "/etc") + "/systemd/system.control/" + info.unite + ".d/50-" + m[1] + ".conf", "# This is a drop-in unit file extension, created via \"systemctl set-property\"\n# or an equivalent operation. Do not edit.\n[Service]\n" + m[1] + "=" + m[2] + "\n", { mode: "rw-r--r--", evenement: false }); });
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "set-property", unite: info.unite, cle: m[1], valeur: m[2] });
	});
	return "";
}
function systemctlResetFailed(h, noms, io){
	if (!io.sudo) throw new ShellError("Failed to reset failed state: Access denied" + astuce(io, "sudo systemctl reset-failed"), 1);
	var e = sousEtat("echecs", h);
	(noms.length ? noms.map(function(n){ return uniteInfo(h, n).unite; }) : Object.keys(e)).forEach(function(u){ delete e[u]; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "reset-failed", unites: noms });
	return "";
}
function systemctlDependances(h, nom, io){
	var info = uniteInfo(h, nom), lignes = [info.unite], vus = {};
	function ajouter(u, prefixe, dernier, prof){
		var i = uniteInfo(h, u);
		var puce = !i.existe ? (io.tty ? C.rouge("○") : "○") : (i.echec ? (io.tty ? C.rouge("×") : "×") : (i.actif ? (io.tty ? C.vert("●") : "●") : "○"));
		lignes.push(prefixe + (dernier ? "└─" : "├─") + puce + " " + i.unite + (!i.existe ? " (not-found)" : ""));
		if (prof > 3 || vus[i.unite]) return;
		vus[i.unite] = true;
		var deps = dependancesDe(h, i);
		deps.forEach(function(d, k){ ajouter(d, prefixe + (dernier ? "  " : "│ "), k === deps.length - 1, prof + 1); });
	}
	var deps = dependancesDe(h, info);
	deps.forEach(function(d, k){ ajouter(d, "", k === deps.length - 1, 1); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "list-dependencies", unite: info.unite });
	return lignes.join("\n");
}
function dependancesDe(h, info){
	var d = info.directives.Unit || {};
	var l = [].concat(d.Requires || [], d.Wants || [], d.BindsTo || []).join(" ").split(/\s+/).filter(Boolean);
	if (info.unite === "multi-user.target" || info.unite === "default.target") l = unitesHote(h).filter(function(u){ var i = uniteInfo(h, u); return /\.service$/.test(u) && i.etatFichier === "enabled" && /multi-user/.test(derniere(i.directives, "Install", "WantedBy") || ""); });
	if (/\.service$/.test(info.unite) && !l.length) l = ["system.slice", "sysinit.target"];
	return l.filter(function(x, i){ return l.indexOf(x) === i; });
}

/* ================================================================== */
/* Les timers : OnCalendar, list-timers, systemd-analyze calendar       */
/* ================================================================== */

var JOURS_SYSTEMD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var RACCOURCIS_CALENDRIER = { minutely: "*-*-* *:*:00", hourly: "*-*-* *:00:00", daily: "*-*-* 00:00:00", weekly: "Mon *-*-* 00:00:00", monthly: "*-*-01 00:00:00", yearly: "*-01-01 00:00:00", annually: "*-01-01 00:00:00", quarterly: "*-01,04,07,10-01 00:00:00", semiannually: "*-01,07-01 00:00:00" };
/* Une valeur d'un champ du calendrier : *, 5, 1,3,5, 1..5, 0/15, 08..18/2. */
function lireChampCalendrier(t, min, max){
	if (t === "*") return { tout: true, texte: "*" };
	var valeurs = [];
	var ok = String(t).split(",").every(function(p){
		var m = /^(\d+)(?:\.\.(\d+))?(?:\/(\d+))?$/.exec(p) || (/^\*\/(\d+)$/.test(p) ? [p, String(min), String(max), p.split("/")[1]] : null);
		if (!m) return false;
		var a = +m[1], b = m[2] !== undefined ? +m[2] : (m[3] !== undefined ? max : a), pas = m[3] !== undefined ? +m[3] : 1;
		if (a < min || b > max || a > b || pas < 1) return false;
		for (var v = a; v <= b; v += pas) valeurs.push(v);
		return true;
	});
	if (!ok) return null;
	return { valeurs: valeurs, texte: String(t).split(",").map(function(p){ return p.replace(/^(\d)$/, "0$1").replace(/(\D)(\d)$/, "$10$2"); }).join(",") };
}
function lireCalendrier(expr){
	var t = String(expr || "").trim();
	if (RACCOURCIS_CALENDRIER[t]) t = RACCOURCIS_CALENDRIER[t];
	var morceaux = t.split(/\s+/), jours = null, date = "*-*-*", heure = "00:00:00";
	if (morceaux.length && /^[A-Za-z]/.test(morceaux[0])){
		var js = [], okJ = morceaux[0].split(",").every(function(p){
			var m = /^([A-Za-z]{3})[a-z]*(?:\.\.([A-Za-z]{3})[a-z]*)?$/.exec(p);
			if (!m) return false;
			var a = JOURS_SYSTEMD.indexOf(m[1].charAt(0).toUpperCase() + m[1].substring(1, 3).toLowerCase()), b = m[2] ? JOURS_SYSTEMD.indexOf(m[2].charAt(0).toUpperCase() + m[2].substring(1, 3).toLowerCase()) : a;
			if (a < 0 || b < 0) return false;
			for (var k = a; ; k = (k + 1) % 7){ js.push(k); if (k === b) break; }
			return true;
		});
		if (!okJ) return null;
		jours = { valeurs: js, texte: morceaux[0].replace(/([A-Za-z]{3})[a-z]*/g, function(x, y){ return y.charAt(0).toUpperCase() + y.substring(1, 3).toLowerCase(); }) };
		morceaux.shift();
	}
	morceaux.forEach(function(m){ if (m.indexOf("-") > 0 && m.indexOf(":") === -1) date = m; else if (m.indexOf(":") > -1) heure = m; else date = null; });
	if (date === null || morceaux.length > 2) return null;
	var d = date.split("-");
	if (d.length === 2) d = ["*"].concat(d);
	if (d.length !== 3) return null;
	var hms = heure.split(":");
	if (hms.length === 2) hms.push("00");
	if (hms.length !== 3) return null;
	var champs = { an: d[0] === "*" ? { tout: true, texte: "*" } : lireChampCalendrier(d[0], 1970, 2199), mois: lireChampCalendrier(d[1], 1, 12), jour: lireChampCalendrier(d[2], 1, 31),
		h: lireChampCalendrier(hms[0], 0, 23), m: lireChampCalendrier(hms[1], 0, 59), s: lireChampCalendrier(hms[2], 0, 59) };
	if (Object.keys(champs).some(function(k){ return champs[k] === null; })) return null;
	champs.jours = jours;
	champs.normal = (jours ? jours.texte + " " : "") + champs.an.texte + "-" + champs.mois.texte + "-" + champs.jour.texte + " " + champs.h.texte + ":" + champs.m.texte + ":" + champs.s.texte;
	return champs;
}
function correspondChamp(c, v){ return c.tout || c.valeurs.indexOf(v) > -1; }
/* La prochaine échéance (en ms du jeu) après depuis (ms), à l'heure de la machine. */
function prochaineEcheance(h, cal, depuis){
	var decalage = (DECALAGE_HISTOIRE - decalageFuseau(fuseauMachine(h))) * 3600000;
	var d = new Date(depuis - decalage + 1000);
	d.setMilliseconds(0);
	for (var j = 0; j < 800; j++){
		var jour = new Date(d.getFullYear(), d.getMonth(), d.getDate() + j);
		if (!correspondChamp(cal.an, jour.getFullYear()) || !correspondChamp(cal.mois, jour.getMonth() + 1) || !correspondChamp(cal.jour, jour.getDate()) || (cal.jours && cal.jours.valeurs.indexOf(jour.getDay()) === -1)) continue;
		for (var hh = 0; hh < 24; hh++){
			if (!correspondChamp(cal.h, hh)) continue;
			for (var mm = 0; mm < 60; mm++){
				if (!correspondChamp(cal.m, mm)) continue;
				for (var ss = 0; ss < 60; ss++){
					if (!correspondChamp(cal.s, ss)) continue;
					var t = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), hh, mm, ss);
					if (t.getTime() >= d.getTime()) return t.getTime() + decalage;
				}
			}
		}
	}
	return null;
}
function timersMachine(h){
	return unitesHote(h).filter(function(u){ return /\.timer$/.test(u); }).map(function(u){ return timerInfo(h, u); });
}
function timerInfo(h, unite){
	var info = uniteInfo(h, unite), d = info.directives.Timer || {};
	var cal = d.OnCalendar ? lireCalendrier(d.OnCalendar[d.OnCalendar.length - 1]) : null;
	var M = etatMachine(h), s = (M.services || {})[unite] || {};
	var active = d.Unit ? d.Unit[d.Unit.length - 1] : unite.replace(/\.timer$/, ".service");
	var prochain = null;
	if (cal) prochain = prochaineEcheance(h, cal, maintenantMachine(h));
	else if (d.OnActiveSec && s.depuis) prochain = s.depuis + lireDureeSystemd(d.OnActiveSec[0], 0) * 1000;
	else if (d.OnBootSec) prochain = (M.demarrage || 0) + lireDureeSystemd(d.OnBootSec[0], 0) * 1000;
	if (d.OnUnitActiveSec && s.dernier) prochain = s.dernier + lireDureeSystemd(d.OnUnitActiveSec[0], 0) * 1000;
	return { unite: unite, active: active, cal: cal, prochain: info.actif ? prochain : null, dernier: s.dernier || (M.timersDernier || {})[unite] || null, persistant: oui(d.Persistent ? d.Persistent[d.Persistent.length - 1] : null), info: info };
}
function listeTimers(h, tous, io){
	var t = timersMachine(h).filter(function(x){ return tous || x.info.actif; }).sort(function(a, b){ return (a.prochain || Infinity) - (b.prochain || Infinity); });
	var maintenant = maintenantMachine(h);
	var rangs = t.map(function(x){ return [x.prochain ? dateSystemdMachine(h, x.prochain) : "-", x.prochain ? dureeSystemd(x.prochain - maintenant) + " left" : "-", x.dernier ? dateSystemdMachine(h, x.dernier) : "-", x.dernier ? dureeSystemd(maintenant - x.dernier) + " ago" : "-", x.unite, x.active]; });
	var entetes = ["NEXT", "LEFT", "LAST", "PASSED", "UNIT", "ACTIVATES"];
	var larg = entetes.map(function(e, k){ return Math.max.apply(null, [e.length].concat(rangs.map(function(r){ return r[k].length; }))); });
	var lignes = [entetes].concat(rangs).map(function(r){ return r.map(function(v, k){ return k === r.length - 1 ? v : completerDroite(v, larg[k]); }).join(" "); });
	lignes.push("", t.length + " timers listed.");
	if (!tous) lignes.push("Pass --all to see loaded but inactive timers, too.");
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemctl", action: "list-timers", timers: t.map(function(x){ return x.unite; }) });
	GameEvents.fire({ type: "systemctl", action: "list-timers", host: h });
	return lignes.join("\n");
}
/* Un timer échu déclenche son service (et les unités transitoires de systemd-run). */
surTicMachine(function(h, M){
	var t = maintenantMachine(h);
	M.timersDernier = M.timersDernier || {};
	timersMachine(h).forEach(function(x){
		if (!x.info.actif || !x.prochain) return;
		var s = (M.services || {})[x.unite] || {};
		if (s.prochainVu === undefined || s.prochainVu === null){ M.services = M.services || {}; M.services[x.unite] = s; s.prochainVu = x.prochain; return; }
		if (t >= s.prochainVu){
			s.dernier = s.prochainVu;
			M.timersDernier[x.unite] = s.prochainVu;
			s.prochainVu = prochaineEcheance(h, x.cal || lireCalendrier("daily"), t);
			var cible = x.active;
			if (uniteInfo(h, cible).existe){ changerEtatUnite(h, uniteInfo(h, cible), { actif: true }); lancerUnite(h, cible, "timer"); }
			GameEvents.fire({ type: "machine", hote: h, cmd: "timer", action: "declenche", unite: x.unite, cible: cible });
		}
	});
});

/* ================================================================== */
/* systemd-analyze, systemd-run, systemd-cgtop                          */
/* ================================================================== */

function tempsDemarrageUnites(h){
	var d = defMachine(h) || {}, l = [];
	var base = d.tempsDemarrage || {};
	unitesHote(h).forEach(function(u){
		var i = uniteInfo(h, u);
		if (!/\.(service|mount)$/.test(u) || i.etatFichier !== "enabled" && !base[u]) return;
		if (i.etatFichier !== "enabled" && i.etatFichier !== "static") return;
		var ms = base[u] !== undefined ? base[u] : 40 + (parseInt(sha256(u).substring(0, 4), 16) % 600);
		var lim = limitesDepuisDirectives(directivesMachine(h, u));
		if (ms > lim.timeoutStart * 1000) ms = lim.timeoutStart * 1000 + 4;
		l.push({ unite: u, ms: ms });
	});
	return l.sort(function(a, b){ return b.ms - a.ms; });
}
function msTexte(ms){
	if (ms >= 60000) return Math.floor(ms / 60000) + "min " + ((ms % 60000) / 1000).toFixed(3) + "s";
	if (ms >= 1000) return (ms / 1000).toFixed(3) + "s";
	return Math.round(ms) + "ms";
}
var SYSTEMD_ANALYZE_AVANT_MACHINES = Shell.sorts["systemd-analyze"];
Shell.sorts["systemd-analyze"] = function(args, io){
	var h = machineIci();
	var action = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "time";
	if (action === "calendar") return analyseCalendrier(h, args, io);
	if (!h || action === "security") return SYSTEMD_ANALYZE_AVANT_MACHINES.apply(this, arguments);
	var temps = tempsDemarrageUnites(h), userspace = temps.reduce(function(m, x){ return Math.max(m, x.ms); }, 0) + 11800;
	if (action === "time"){
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-analyze", action: "time", total: userspace });
		return "Startup finished in 3.112s (kernel) + " + msTexte(userspace) + " (userspace) = " + msTexte(userspace + 3112) + " \nmulti-user.target reached after " + msTexte(userspace - 72) + " in userspace.";
	}
	if (action === "blame"){
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-analyze", action: "blame", premier: temps[0] ? temps[0].unite : null });
		return temps.map(function(x){ return completerGauche(msTexte(x.ms), 16) + " " + x.unite; }).join("\n");
	}
	if (action === "critical-chain"){
		var lent = temps[0], suivant = temps.filter(function(x){ return x !== lent; })[0];
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-analyze", action: "critical-chain", premier: lent ? lent.unite : null });
		var debut = 1677, l = ["The time when unit became active or started is printed after the \"@\" character.", "The time the unit took to start is printed after the \"+\" character.", "",
			"multi-user.target @" + msTexte(debut + (lent ? lent.ms : 0) + (suivant ? suivant.ms : 0))];
		if (suivant) l.push("└─" + suivant.unite + " @" + msTexte(debut + (lent ? lent.ms : 0)) + " +" + msTexte(suivant.ms));
		if (lent) l.push((suivant ? "  " : "") + "└─" + lent.unite + " @" + msTexte(debut) + " +" + msTexte(lent.ms));
		l.push((suivant ? "    " : "  ") + "└─network.target @1.664s", (suivant ? "      " : "    ") + "└─systemd-networkd.service @1.432s +231ms", (suivant ? "        " : "      ") + "└─systemd-udevd.service @412ms +1.017s");
		return l.join("\n");
	}
	if (action === "verify") return analyseVerify(h, args.filter(function(a){ return a.charAt(0) !== "-"; }).slice(1), io);
	return SYSTEMD_ANALYZE_AVANT_MACHINES.apply(this, arguments);
};
function analyseCalendrier(h, args, io){
	var exprs = args.filter(function(a){ return a.charAt(0) !== "-"; }).slice(1), iter = 1;
	args.forEach(function(a){ var m = /^--iterations=(\d+)$/.exec(a); if (m) iter = Math.min(10, +m[1]); });
	if (!exprs.length) throw new ShellError("Too few arguments.", 1);
	var blocs = [], hh = h || Shell.hote();
	exprs.forEach(function(e){
		var c = lireCalendrier(e);
		if (!c){ io.code = 1; io.err("Failed to parse calendar specification '" + e + "': Invalid argument"); return; }
		var t = h ? maintenantMachine(h) : Date.now();
		var l = ["  Original form: " + e, "Normalized form: " + c.normal];
		for (var k = 0; k < iter; k++){
			var p = h ? prochaineEcheance(h, c, t) : null;
			if (p === null){ l.push("    Next elapse: never"); break; }
			l.push((k === 0 ? "    Next elapse: " : "       Iter. #" + (k + 1) + ": ") + dateSystemdMachine(h, p));
			if (k === 0){ var u = new Date(p - DECALAGE_HISTOIRE * 3600000); l.push("       (in UTC): " + JOURS_EN[u.getDay()] + " " + u.getFullYear() + "-" + deuxChiffres(u.getMonth() + 1) + "-" + deuxChiffres(u.getDate()) + " " + deuxChiffres(u.getHours()) + ":" + deuxChiffres(u.getMinutes()) + ":" + deuxChiffres(u.getSeconds()) + " UTC", "       From now: " + dureeSystemd(p - t) + " left"); }
			t = p + 1000;
		}
		blocs.push(l.join("\n"));
	});
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-analyze", action: "calendar", expressions: exprs, ok: !io.code });
	void hh;
	return blocs.join("\n\n");
}
var CLES_UNITE_VALIDES = {
	Unit: ["Description", "Documentation", "Requires", "Wants", "BindsTo", "PartOf", "Requisite", "Conflicts", "Before", "After", "OnFailure", "Condition", "ConditionPathExists", "ConditionPathIsDirectory", "AssertPathExists", "StartLimitIntervalSec", "StartLimitBurst", "DefaultDependencies", "RequiresMountsFor"],
	Service: ["Type", "ExecStart", "ExecStartPre", "ExecStartPost", "ExecStop", "ExecReload", "Restart", "RestartSec", "User", "Group", "WorkingDirectory", "Environment", "EnvironmentFile", "TimeoutStartSec", "TimeoutStopSec", "TimeoutSec",
		"RemainAfterExit", "PIDFile", "KillMode", "KillSignal", "StandardOutput", "StandardError", "SyslogIdentifier", "LimitNOFILE", "LimitNPROC", "MemoryMax", "MemoryHigh", "MemoryLimit", "CPUQuota", "CPUWeight", "Nice", "OOMScoreAdjust",
		"NoNewPrivileges", "PrivateTmp", "ProtectSystem", "ProtectHome", "ReadWritePaths", "DynamicUser", "SuccessExitStatus", "RuntimeDirectory", "StateDirectory", "LogsDirectory", "UMask", "TasksMax", "IOWeight", "AmbientCapabilities", "CapabilityBoundingSet"],
	Timer: ["OnCalendar", "OnBootSec", "OnStartupSec", "OnActiveSec", "OnUnitActiveSec", "OnUnitInactiveSec", "Persistent", "Unit", "AccuracySec", "RandomizedDelaySec", "WakeSystem"],
	Install: ["WantedBy", "RequiredBy", "Alias", "Also", "DefaultInstance"],
	Socket: ["ListenStream", "ListenDatagram", "Accept"], Mount: ["What", "Where", "Type", "Options"]
};
function analyseVerify(h, noms, io){
	var messages = [];
	noms.forEach(function(n){
		var chemin = /^\//.test(n) ? n : null, unite = chemin ? nomDe(chemin) : nomUniteComplet(n);
		var texte = chemin ? texteHote(h, chemin) : null;
		if (!chemin){ var info = uniteInfo(h, unite); chemin = info.chemin; texte = info.fichiers.principal ? info.fichiers.principal.texte : null; }
		if (texte === null){ messages.push("Failed to prepare filename " + n + ": No such file or directory"); io.code = 1; return; }
		var section = null, d = {};
		String(texte).split("\n").forEach(function(l, i){
			var t = l.trim();
			if (!t || /^[#;]/.test(t)) return;
			var s = /^\[([^\]]+)\]$/.exec(t);
			if (s){ section = s[1]; if (!CLES_UNITE_VALIDES[section]) messages.push(chemin + ":" + (i + 1) + ": Unknown section '" + section + "'. Ignoring."); return; }
			var kv = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(t);
			if (!kv){ messages.push(chemin + ":" + (i + 1) + ": Missing '=', ignoring line."); return; }
			if (!section){ messages.push(chemin + ":" + (i + 1) + ": Assignment outside of section. Ignoring."); return; }
			if (CLES_UNITE_VALIDES[section] && CLES_UNITE_VALIDES[section].indexOf(kv[1]) === -1 && !/^Condition|^Assert/.test(kv[1])) messages.push(chemin + ":" + (i + 1) + ": Unknown key name '" + kv[1] + "' in section '" + section + "', ignoring.");
			(d[section] = d[section] || {})[kv[1]] = kv[2];
		});
		if (/\.service$/.test(unite)){
			var svc = d.Service || {};
			if (!svc.ExecStart && svc.Type !== "oneshot") messages.push(unite + ": Service has no ExecStart=, ExecStop=, or SuccessAction=. Refusing.");
			else if (svc.ExecStart && !/^[-@+!:]*\//.test(svc.ExecStart)) messages.push(unite + ": Executable path is not absolute, ignoring: " + svc.ExecStart);
			else if (svc.ExecStart){ var exe = svc.ExecStart.replace(/^[-@+!:]+/, "").split(/\s+/)[0]; if (!fichierHote(h, exe) && !/^\/(usr\/)?(s?bin)\//.test(exe)) messages.push(unite + ": Command " + exe + " is not executable: No such file or directory"); }
			if (svc.Restart && ["no", "on-success", "on-failure", "on-abnormal", "on-watchdog", "on-abort", "always"].indexOf(svc.Restart) === -1) messages.push(chemin + ": Failed to parse service restart specifier, ignoring: " + svc.Restart);
			if (svc.User && !utilisateurExiste(h, svc.User)) messages.push(unite + ": User " + svc.User + " does not exist (verified with getent passwd).");
		}
		if (/\.timer$/.test(unite)){
			var tm = d.Timer || {};
			if (tm.OnCalendar && !lireCalendrier(tm.OnCalendar)) messages.push(chemin + ": Failed to parse calendar specification, ignoring: " + tm.OnCalendar);
			if (!tm.OnCalendar && !tm.OnBootSec && !tm.OnActiveSec && !tm.OnUnitActiveSec) messages.push(unite + ": Timer unit lacks value setting. Refusing.");
		}
		if (d.Install && d.Install.WantedBy && !/\.target$/.test(d.Install.WantedBy)) messages.push(chemin + ": WantedBy= " + d.Install.WantedBy + " is not a target.");
	});
	if (messages.length) io.code = 1;
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-analyze", action: "verify", unites: noms, ok: !messages.length });
	return messages.join("\n");
}
Shell.sorts["systemd-run"] = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("systemd-run : il faut une machine qui tourne sous systemd (ssh lumen, au chapitre 6).", 1);
	var nom = null, delai = null, calendrier = null, i = 0;
	for (; i < args.length; i++){
		var a = args[i], m;
		if ((m = /^--unit=(.+)$/.exec(a))){ nom = m[1]; continue; }
		if (a === "--unit" || a === "-u"){ nom = args[++i]; continue; }
		if ((m = /^--on-active=(.+)$/.exec(a))){ delai = m[1]; continue; }
		if ((m = /^--on-calendar=(.+)$/.exec(a))){ calendrier = m[1]; continue; }
		if (a === "--on-active" ){ delai = args[++i]; continue; }
		if (/^--(description|property|setenv)=/.test(a) || a === "--user" || a === "--wait" || a === "-q" || a === "--quiet" || a === "--collect") continue;
		if (a.charAt(0) === "-") throw new ShellError("systemd-run: unrecognized option '" + a + "'", 1);
		break;
	}
	var commande = args.slice(i);
	if (!commande.length) throw new ShellError("Command line to execute required.", 1);
	if (!io.sudo) throw new ShellError("Failed to start transient " + (delai || calendrier ? "timer" : "service") + " unit: Access denied" + astuce(io, "sudo systemd-run ..."), 1);
	var M = etatMachine(h);
	nom = (nom || "run-u" + (100 + (M.transitoires || []).length * 7)).replace(/\.(service|timer)$/, "");
	var exe = commande[0].charAt(0) === "/" ? commande[0] : "/usr/bin/" + commande[0];
	moteurSeul(function(){
		ecrireFichierHote(h, "/run/systemd/transient/" + nom + ".service", "# This is a transient unit file, created programmatically via the systemd API. Do not edit.\n[Unit]\nDescription=/usr/bin/" + commande.join(" ") + "\n\n[Service]\nType=oneshot\nExecStart=" + exe + (commande.length > 1 ? " " + commande.slice(1).join(" ") : "") + "\n", { evenement: false });
		if (delai || calendrier) ecrireFichierHote(h, "/run/systemd/transient/" + nom + ".timer", "# This is a transient unit file, created programmatically via the systemd API. Do not edit.\n[Unit]\nDescription=/usr/bin/" + commande.join(" ") + "\n\n[Timer]\n" + (delai ? "OnActiveSec=" + delai : "OnCalendar=" + calendrier) + "\nRemainAfterElapse=no\n", { evenement: false });
	});
	if (DOSSIERS_UNITES.indexOf("/run/systemd/transient") === -1) DOSSIERS_UNITES.push("/run/systemd/transient");
	M.transitoires = (M.transitoires || []).concat([nom]);
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-run", unite: nom, delai: delai, calendrier: calendrier, commande: commande.slice() });
	if (delai || calendrier){
		changerEtatUnite(h, uniteInfo(h, nom + ".timer"), { actif: true });
		M.services = M.services || {};
		M.services[nom + ".timer"] = { depuis: maintenantMachine(h) };
		return "Running timer as unit: " + nom + ".timer\nWill run service as unit: " + nom + ".service";
	}
	changerEtatUnite(h, uniteInfo(h, nom + ".service"), { actif: true });
	lancerUnite(h, nom + ".service", "systemd-run");
	return "Running as unit: " + nom + ".service; invocation ID: " + hexDe(nom + state.nbCommandes, 32);
};
Shell.sorts["systemd-cgtop"] = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("systemd-cgtop: command not found", 127);
	var groupes = {};
	procsMachine(h).forEach(function(p){
		var g = p.unite ? "system.slice/" + p.unite : (p.session ? "user.slice/user-1000.slice" : "system.slice");
		groupes[g] = groupes[g] || { taches: 0, cpu: 0, mem: 0 };
		groupes[g].taches += p.threads || 1; groupes[g].cpu += cpuEffectif(h, p); groupes[g].mem += p.etat === "Z" ? 0 : p.rss;
	});
	var liste = Object.keys(groupes).map(function(k){ return { nom: k, g: groupes[k] }; }).sort(function(a, b){ return b.g.cpu - a.g.cpu; });
	var tot = liste.reduce(function(s, x){ s.t += x.g.taches; s.c += x.g.cpu; s.m += x.g.mem; return s; }, { t: 0, c: 0, m: 0 });
	var l = ["Control Group                                    Tasks   %CPU   Memory  Input/s Output/s", completerDroite("/", 47) + completerGauche(tot.t + 120, 7) + completerGauche(tot.c.toFixed(1), 7) + completerGauche(memoireTexte(tot.m * 1024 + 400 * MIO), 9) + "        -        -"];
	l.push(completerDroite("system.slice", 47) + completerGauche(tot.t, 7) + completerGauche(tot.c.toFixed(1), 7) + completerGauche(memoireTexte(tot.m * 1024), 9) + "        -        -");
	liste.forEach(function(x){ l.push(completerDroite(x.nom, 47) + completerGauche(x.g.taches, 7) + completerGauche(x.g.cpu.toFixed(1), 7) + completerGauche(memoireTexte(x.g.mem * 1024), 9) + "        -        -"); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-cgtop", premier: liste[0] ? liste[0].nom : null });
	return l.join("\n") + astuce(io, "systemd-cgtop se rafraîchit comme top (q pour quitter) : chaque ligne est un groupe de contrôle, c'est-à-dire un service avec tous ses processus. Ici, une photo.");
};

/* ================================================================== */
/* Le journal : journalctl et dmesg                                     */
/* ================================================================== */

function ligneJournal(h, e, format){
	var d = dateMachine(h, e.t);
	var ident = e.k ? "kernel" : e.u + (e.pid ? "[" + e.pid + "]" : "");
	if (format === "cat") return e.m;
	if (format === "short-iso") return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + "T" + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + texteDecalage(h) + " " + h + " " + ident + ": " + e.m;
	return MOIS_EN[d.getMonth()] + " " + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + h + " " + ident + ": " + e.m;
}
var PRIOS_JOURNAL = ["emerg", "alert", "crit", "err", "warning", "notice", "info", "debug"];
function lirePrio(t){ if (/^\d$/.test(t)) return +t; var i = PRIOS_JOURNAL.indexOf(String(t).toLowerCase().replace(/^warn$/, "warning").replace(/^error$/, "err")); return i; }
/* « today », « yesterday », « 09:30 », « 2026-10-17 09:30 », « 1 hour ago », « -2h » : un instant de la machine. */
function lireInstantJournal(h, texte){
	var t = String(texte).trim(), maint = maintenantMachine(h), d = dateMachine(h, maint), decal = maint - d.getTime(), m;
	var minuit = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + decal;
	if (t === "today") return minuit;
	if (t === "yesterday") return minuit - 86400000;
	if (t === "now") return maint;
	if ((m = /^(\d+)\s*(s|sec|second|seconds|min|minute|minutes|m|h|hour|hours|d|day|days)\s+ago$/.exec(t)) || (m = /^-(\d+)\s*(s|min|m|h|d)$/.exec(t))) return maint - +m[1] * ({ s: 1, sec: 1, second: 1, seconds: 1, min: 60, minute: 60, minutes: 60, m: 60, h: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400 }[m[2]]) * 1000;
	if ((m = /^(\d\d?):(\d\d)(?::(\d\d))?$/.exec(t))) return minuit + (+m[1] * 3600 + +m[2] * 60 + (+m[3] || 0)) * 1000;
	if ((m = /^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d?):(\d\d)(?::(\d\d))?)?$/.exec(t))) return new Date(+m[1], +m[2] - 1, +m[3], +m[4] || 0, +m[5] || 0, +m[6] || 0).getTime() + decal;
	return null;
}
function dossierJournal(h){ return "/var/log/journal/" + hexDe("machine-id:" + h, 32); }
function fichiersJournal(h){
	var d = dossierHote(h, dossierJournal(h));
	return d ? d.items.slice().sort(function(a, b){ return (a.mtimeMs || 0) - (b.mtimeMs || 0); }) : [];
}
function tailleJournal(h){ return fichiersJournal(h).reduce(function(s, it){ return s + tailleObjetMachine(it); }, 0); }
function nettoyerJournal(h, limite, ageMax){
	var supprimes = [], libere = 0;
	var d = dossierHote(h, dossierJournal(h));
	if (!d) return { supprimes: supprimes, libere: 0 };
	var maint = maintenantMachine(h);
	fichiersJournal(h).forEach(function(it){
		if (it.itemname === "system.journal") return;
		var trop = (limite !== null && tailleJournal(h) > limite) || (ageMax !== null && maint - (it.mtimeMs || 0) > ageMax);
		if (!trop) return;
		libere += tailleObjetMachine(it);
		supprimes.push(it);
		moteurSeul(function(){ d.removeItem(it); });
	});
	return { supprimes: supprimes, libere: libere };
}
/* journald relit sa configuration au redémarrage : SystemMaxUse= plafonne la place prise. */
function appliquerJournald(h){
	var t = texteHote(h, "/etc/systemd/journald.conf") || "", section = null, max = null;
	String(t).split("\n").forEach(function(l){ var x = l.trim(); if (/^\[.*\]$/.test(x)){ section = x; return; } var m = /^SystemMaxUse\s*=\s*(\S+)/.exec(x); if (m && section === "[Journal]") max = lireTaille(m[1]); });
	var M = etatMachine(h);
	M.journaldMax = max;
	if (max !== null) nettoyerJournal(h, max, null);
	journalMachine(h, { unite: "systemd-journald", pid: 211, message: "System Journal (" + dossierJournal(h) + ") is " + humain(tailleJournal(h)).replace(/([KMG])$/, "$1") + ", max " + (max ? humain(max) : "4.0G") + ", " + (max ? humain(Math.max(0, max - tailleJournal(h))) : "1.2G") + " free." });
	GameEvents.fire({ type: "machine", hote: h, cmd: "journald", action: "restart", max: max });
}
surTicMachine(function(h, M){
	var d = dossierHote(h, dossierJournal(h));
	if (!d || !M.croissanceJournal) return;
	var actif = d.getItemFromName("system.journal");
	if (actif === -1) return;
	actif.taille = (actif.taille || 0) + M.croissanceJournal;
	actif.mtimeMs = maintenantMachine(h);
	if (actif.taille > 128 * MIO){
		var arch = new Item("system@" + hexDe("seq" + maintenantMachine(h), 32) + "-" + hexDe("p" + maintenantMachine(h), 16) + "-" + hexDe("q" + maintenantMachine(h), 16) + ".journal", "", "item_sign.gif");
		arch.owner = "root"; arch.mode = "rw-r-----"; arch.taille = actif.taille; arch.mtimeMs = maintenantMachine(h);
		moteurSeul(function(){ d.addItem(arch); });
		actif.taille = 8 * MIO;
	}
	if (M.journaldMax) nettoyerJournal(h, M.journaldMax, null);
});
var JOURNALCTL_AVANT_MACHINES = Shell.sorts.journalctl;
Shell.sorts.journalctl = function(args, io){
	var h = machineIci();
	if (!h) return JOURNALCTL_AVANT_MACHINES.apply(this, arguments);
	var M = etatMachine(h), o = { unites: [], boot: null, noyau: false, prio: null, suivre: false, n: null, inverse: false, depuis: null, jusqua: null, motif: null, ident: null, format: "short", pid: null, fin: false };
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-u" || a === "--unit"){ o.unites.push(nomUniteComplet(args[++i] || "")); continue; }
		if ((m = /^--unit=(.+)$/.exec(a))){ o.unites.push(nomUniteComplet(m[1])); continue; }
		if (/^-u.+/.test(a)){ o.unites.push(nomUniteComplet(a.substring(2))); continue; }
		if (a === "-b" || a === "--boot"){ o.boot = /^-?\d+$/.test(args[i + 1] || "") ? +args[++i] : 0; continue; }
		if ((m = /^--boot=(-?\d+)$/.exec(a)) || (m = /^-b(-?\d+)$/.exec(a))){ o.boot = +m[1]; continue; }
		if (a === "-k" || a === "--dmesg"){ o.noyau = true; if (o.boot === null) o.boot = 0; continue; }
		if (a === "-p" || a === "--priority"){ o.prio = args[++i]; continue; }
		if ((m = /^--priority=(.+)$/.exec(a))){ o.prio = m[1]; continue; }
		if (a === "-f" || a === "--follow"){ o.suivre = true; continue; }
		if (a === "-n" || a === "--lines"){ o.n = parseInt(args[++i], 10); continue; }
		if ((m = /^--lines=(\d+)$/.exec(a)) || (m = /^-n(\d+)$/.exec(a))){ o.n = +m[1]; continue; }
		if (a === "-r" || a === "--reverse"){ o.inverse = true; continue; }
		if (a === "-e" || a === "--pager-end"){ o.fin = true; continue; }
		if (a === "-S" || a === "--since"){ o.depuis = args[++i]; continue; }
		if ((m = /^--since=(.+)$/.exec(a))){ o.depuis = m[1]; continue; }
		if (a === "-U" || a === "--until"){ o.jusqua = args[++i]; continue; }
		if ((m = /^--until=(.+)$/.exec(a))){ o.jusqua = m[1]; continue; }
		if (a === "-g" || a === "--grep"){ o.motif = args[++i]; continue; }
		if (a === "-t" || a === "--identifier"){ o.ident = args[++i]; continue; }
		if (a === "-o" || a === "--output"){ o.format = args[++i]; continue; }
		if ((m = /^--output=(.+)$/.exec(a))){ o.format = m[1]; continue; }
		if ((m = /^_PID=(\d+)$/.exec(a))){ o.pid = +m[1]; continue; }
		if (a === "--disk-usage") return journalDisque(h, io);
		if ((m = /^--vacuum-(size|time|files)=(.+)$/.exec(a))) return journalVide(h, m[1], m[2], io);
		if (a === "--list-boots") return listeDemarrages(h, io);
		if (a === "--rotate" || a === "--flush" || a === "--sync"){ if (!io.sudo) throw new ShellError("Failed to " + a.substring(2) + " journal: Permission denied", 1); return ""; }
		if (a === "--verify") return "PASS: " + dossierJournal(h) + "/system.journal";
		if (/^-[xaqm]+$/.test(a) || a === "--no-pager" || a === "--no-hostname" || a === "--utc" || a === "--all" || a === "--quiet" || a === "--catalog") continue;
		if (/^-[a-zA-Z]+$/.test(a) && /^-[xefrk]+$/.test(a)){ if (a.indexOf("f") > -1) o.suivre = true; if (a.indexOf("e") > -1) o.fin = true; if (a.indexOf("r") > -1) o.inverse = true; if (a.indexOf("k") > -1) o.noyau = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("journalctl: unrecognized option '" + a + "'", 1);
	}
	// Les membres des groupes adm et systemd-journal lisent tout le journal, comme root.
	var lecteur = io.sudo || M.journalPourTous || (typeof groupesMachine === "function" && groupesMachine(h).some(function(g){ return (g.nom === "adm" || g.nom === "systemd-journal") && g.membres.indexOf(JOUEUR) > -1; }));
	if (!lecteur) io.err("Hint: You are currently not seeing messages from other users and the system.\n      Users in groups 'adm', 'systemd-journal' can see all messages.\n      Pass -q to turn off this notice.");
	var entrees = (M.journal || []).slice();
	if (!lecteur) entrees = [];
	if (o.boot !== null) entrees = entrees.filter(function(e){ return e.b === o.boot; });
	if (o.boot !== null && o.boot < -((M.demarrages || []).length - 1) && (M.demarrages || []).length) throw new ShellError("Data from the specified boot (" + o.boot + ") is not available: No such boot ID in journal", 1);
	if (o.noyau) entrees = entrees.filter(function(e){ return e.k; });
	if (o.unites.length) entrees = entrees.filter(function(e){ return o.unites.indexOf(e.unit) > -1; });
	if (o.ident) entrees = entrees.filter(function(e){ return (e.k ? "kernel" : e.u) === o.ident; });
	if (o.pid) entrees = entrees.filter(function(e){ return e.pid === o.pid; });
	if (o.prio !== null){
		var bornes = String(o.prio).split(".."), hautP = lirePrio(bornes[bornes.length - 1]), basP = bornes.length > 1 ? lirePrio(bornes[0]) : 0;
		if (hautP < 0 || basP < 0) throw new ShellError("Failed to parse log level: " + o.prio, 1);
		var mini = Math.min(basP, hautP), maxi = Math.max(basP, hautP);
		entrees = entrees.filter(function(e){ return e.p <= maxi && e.p >= (bornes.length > 1 ? mini : 0); });
	}
	if (o.depuis){ var t1 = lireInstantJournal(h, o.depuis); if (t1 === null) throw new ShellError("Failed to parse timestamp: " + o.depuis, 1); entrees = entrees.filter(function(e){ return e.t >= t1; }); }
	if (o.jusqua){ var t2 = lireInstantJournal(h, o.jusqua); if (t2 === null) throw new ShellError("Failed to parse timestamp: " + o.jusqua, 1); entrees = entrees.filter(function(e){ return e.t <= t2; }); }
	if (o.motif){ var re; try { re = new RegExp(o.motif, /[A-Z]/.test(o.motif) ? "" : "i"); } catch (x){ throw new ShellError("Failed to compile pattern: " + o.motif, 1); } entrees = entrees.filter(function(e){ return re.test(e.m); }); }
	entrees.sort(function(a, b){ return a.t - b.t; });
	if (o.suivre && o.n === null) o.n = 10;
	if (o.n !== null) entrees = entrees.slice(-o.n);
	if (o.fin && !o.n) entrees = entrees.slice(-40);
	if (o.inverse) entrees.reverse();
	var lignes = entrees.map(function(e){ var l = ligneJournal(h, e, o.format); return io.tty && e.p <= 3 ? C.rouge(l) : (io.tty && e.p === 4 ? C.jaune(l) : l); });
	if (!entrees.length && o.format !== "cat") lignes = ["-- No entries --"];
	GameEvents.fire({ type: "machine", hote: h, cmd: "journalctl", unites: o.unites, boot: o.boot, noyau: o.noyau, prio: o.prio, suivre: o.suivre, nombre: entrees.length, motif: o.motif, sortie: entrees.map(function(e){ return e.m; }).join("\n") });
	GameEvents.fire({ type: "journalctl", host: h });
	var texte = lignes.join("\n");
	if (o.suivre) texte += astuce(io, "-f suit le journal en direct : les nouvelles lignes s'ajoutent au fil de l'eau, jusqu'à Ctrl-C. Ici, une photo des dernières lignes.");
	return texte;
};
function journalDisque(h, io){
	var t = tailleJournal(h);
	GameEvents.fire({ type: "machine", hote: h, cmd: "journalctl", action: "disk-usage", taille: t });
	return "Archived and active journals take " + humain(t) + " in the file system.";
}
function journalVide(h, mode, valeur, io){
	if (!io.sudo) throw new ShellError("Failed to vacuum journal: Permission denied" + astuce(io, "sudo journalctl --vacuum-" + mode + "=" + valeur), 1);
	var r;
	if (mode === "size"){ var l = lireTaille(valeur); if (l === null) throw new ShellError("Failed to parse size value: " + valeur, 1); r = nettoyerJournal(h, l, null); }
	else if (mode === "time"){ var s = lireDureeSystemd(valeur.replace(/(\d+)\s*(weeks|week|w)$/, function(x, n){ return (n * 7) + "d"; }).replace(/(\d+)\s*(months|month)$/, function(x, n){ return (n * 30) + "d"; }), null); if (s === null) throw new ShellError("Failed to parse timestamp: " + valeur, 1); r = nettoyerJournal(h, null, s * 1000); }
	else { var n = parseInt(valeur, 10); var garder = fichiersJournal(h).slice(-n); r = { supprimes: [], libere: 0 }; fichiersJournal(h).forEach(function(it){ if (garder.indexOf(it) === -1 && it.itemname !== "system.journal"){ r.libere += tailleObjetMachine(it); r.supprimes.push(it); moteurSeul(function(){ dossierHote(h, dossierJournal(h)).removeItem(it); }); } }); }
	GameEvents.fire({ type: "machine", hote: h, cmd: "journalctl", action: "vacuum", mode: mode, libere: r.libere, taille: tailleJournal(h) });
	return r.supprimes.map(function(it){ return "Deleted archived journal " + dossierJournal(h) + "/" + it.itemname + " (" + humain(tailleObjetMachine(it)).replace(/(\d)([KMG])$/, "$1.0$2").replace(/\.(\d)\.0/, ".$1") + ")."; })
		.concat(["Vacuuming done, freed " + humain(r.libere) + " of archived journals from " + dossierJournal(h) + "."]).join("\n");
}
function listeDemarrages(h, io){
	var M = etatMachine(h), boots = M.demarrages || [{ idx: 0, debut: M.demarrage }];
	var l = ["IDX BOOT ID                          FIRST ENTRY                  LAST ENTRY                  "];
	boots.forEach(function(b){ l.push(completerGauche(b.idx, 3) + " " + hexDe("boot:" + h + ":" + b.idx, 32) + " " + dateSystemdMachine(h, b.debut) + " " + dateSystemdMachine(h, b.idx === 0 ? maintenantMachine(h) : b.fin)); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "journalctl", action: "list-boots" });
	return l.join("\n");
}
/* La redirection du moteur du Bastion vers le journal de la machine modélisée. */
var JOURNAL_GUET_AVANT_MACHINES = journalGuet;
journalGuet = function(h, entree){
	if (estMachine(h)){ journalMachine(h, { unite: entree.unite, message: entree.message, prio: entree.prio, t: entree.quand instanceof Date ? entree.quand.getTime() : undefined, unit: entree.unit }); return; }
	return JOURNAL_GUET_AVANT_MACHINES.apply(this, arguments);
};
var DMESG_AVANT_MACHINES = Shell.sorts.dmesg;
Shell.sorts.dmesg = function(args, io){
	var h = machineIci();
	if (!h) return DMESG_AVANT_MACHINES.apply(this, arguments);
	var M = etatMachine(h), humainT = false, niveaux = null, vider = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-T" || a === "--ctime"){ humainT = true; continue; }
		if (a === "-l" || a === "--level"){ niveaux = (args[++i] || "").split(","); continue; }
		if (/^--level=/.test(a)){ niveaux = a.substring(8).split(","); continue; }
		if (a === "-c" || a === "--read-clear" || a === "-C" || a === "--clear"){ vider = true; continue; }
		if (/^-[THwxeLk]+$/.test(a) || a === "--follow" || a === "--human" || a === "--color=never"){ if (a.indexOf("T") > -1) humainT = true; continue; }
		throw new ShellError("dmesg: unrecognized option '" + a + "'\nTry 'dmesg --help' for more information.", 1);
	}
	if (!io.sudo) throw new ShellError("dmesg: read kernel buffer failed: Operation not permitted" + astuce(io, "Sur cette machine, le journal du noyau est réservé à root (kernel.dmesg_restrict = 1) : sudo dmesg"), 1);
	var entrees = (M.journal || []).filter(function(e){ return e.k && e.b === 0 && (!M.dmesgVide || e.t > M.dmesgVide); });
	if (niveaux){
		var voulus = niveaux.map(function(n){ return lirePrio(n === "warn" ? "warning" : n); });
		if (voulus.some(function(v){ return v < 0; })) throw new ShellError("dmesg: unknown level '" + niveaux.join(",") + "'", 1);
		entrees = entrees.filter(function(e){ return voulus.indexOf(e.p) > -1; });
	}
	var demarrage = M.demarrage || 0;
	var lignes = entrees.map(function(e){
		var prefixe = humainT ? "[" + dateCtimeMachine(h, e.t) + "]" : "[" + completerGauche(((e.t - demarrage) / 1000).toFixed(6), 12) + "]";
		var l = prefixe + " " + e.m;
		return io.tty && e.p <= 3 ? C.rouge(l) : (io.tty && e.p === 4 ? C.jaune(l) : l);
	});
	if (vider) M.dmesgVide = maintenantMachine(h);
	GameEvents.fire({ type: "machine", hote: h, cmd: "dmesg", humain: humainT, niveaux: niveaux, sortie: entrees.map(function(e){ return e.m; }).join("\n") });
	return lignes.join("\n");
};

/* ================================================================== */
/* systemd-tmpfiles : le ménage des dossiers temporaires                 */
/* ================================================================== */

/* « 1h », « 30m », « 2d », « 90 » (secondes) : un âge en minutes, ou null (« - »). */
function ageTmpfilesEnMinutes(t){
	var m = /^~?(\d+)(us|ms|s|sec|m|min|h|hr|d|w)?$/.exec(String(t || "").trim());
	if (!m) return null;
	var n = +m[1], u = m[2] || "s";
	return { us: n / 6e7, ms: n / 60000, s: n / 60, sec: n / 60, m: n, min: n, h: n * 60, hr: n * 60, d: n * 1440, w: n * 10080 }[u];
}
function fichiersTmpfiles(h){
	var par = {};
	["/usr/lib/tmpfiles.d", "/run/tmpfiles.d", "/etc/tmpfiles.d"].forEach(function(d){
		fichiersDuDossier(h, d).forEach(function(f){ if (/\.conf$/.test(f.nom)) par[f.nom] = f; });
	});
	return Object.keys(par).sort().map(function(n){ return par[n]; });
}
function reglesTmpfiles(h){
	var l = [];
	fichiersTmpfiles(h).forEach(function(f){
		String(f.item.getText()).split("\n").forEach(function(x, i){
			var t = x.trim();
			if (!t || t.charAt(0) === "#") return;
			var c = t.split(/\s+/);
			l.push({ type: c[0].replace(/[!+=~^-]+$/, ""), chemin: c[1], mode: c[2], user: c[3], groupe: c[4], age: c[5], fichier: f.chemin, ligne: i + 1, champs: c.length });
		});
	});
	return l;
}
Shell.sorts["systemd-tmpfiles"] = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("systemd-tmpfiles : il faut une machine qui tourne sous systemd (ssh lumen, au chapitre 6).", 1);
	var action = args.filter(function(a){ return /^--(clean|create|remove|cat-config)$/.test(a); })[0];
	if (!action) throw new ShellError("systemd-tmpfiles: You need to specify at least one of --clean, --create, --remove, or --purge.", 1);
	if (action === "--cat-config"){
		GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-tmpfiles", action: "cat-config" });
		return fichiersTmpfiles(h).map(function(f){ return "# " + f.chemin + "\n" + String(f.item.getText()).replace(/\n$/, ""); }).join("\n\n");
	}
	if (!io.sudo) throw new ShellError("Failed to open " + (action === "--clean" ? "directory" : "file") + ": Permission denied" + astuce(io, "Le ménage touche aux dossiers du système : sudo systemd-tmpfiles " + action), 1);
	var erreurs = [], retires = 0, crees = 0;
	reglesTmpfiles(h).forEach(function(r){
		if (r.champs < 2){ erreurs.push(r.fichier + ":" + r.ligne + ": Syntax error."); return; }
		if (!/^[dDeqQxXfFLrRvzZtTwcbpaAh]$/.test(r.type)){ erreurs.push(r.fichier + ":" + r.ligne + ": Unknown command type '" + r.type + "'."); return; }
		var chemin = cheminNormal(r.chemin);
		if (action === "--create" && /^[dDqQv]$/.test(r.type) && !dossierHote(h, chemin)){
			moteurSeul(function(){ creerDossierHote(h, chemin, { mode: (r.mode && /^\d{3,4}$/.test(r.mode) && modeDepuisOctal(r.mode.slice(-3))) || "rwxr-xr-x", owner: r.user && r.user !== "-" ? r.user : "root" }); });
			crees++;
		}
		if (action === "--clean" && /^[dDeqQvxX]$/.test(r.type)){
			var age = ageTmpfilesEnMinutes(r.age);
			if (age === null || !(age > 0)) return;
			var gs = groupesVirtuels(h, chemin);
			if (gs) gs.forEach(function(g){ if (g.nombre > 0 && g.ageMin > age){ retires += g.nombre; g.nombre = 0; } });
			var lieu = dossierHote(h, chemin);
			if (lieu) lieu.items.slice().forEach(function(it){
				if (ageEnMinutes(it) > age && !it.protege){ moteurSeul(function(){ lieu.removeItem(it); }); retires++; }
			});
		}
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "systemd-tmpfiles", action: action.substring(2), retires: retires, crees: crees, erreurs: erreurs.length });
	if (erreurs.length){ io.code = 1; return erreurs.join("\n"); }
	return "";
};
