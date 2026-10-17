/**
 * SortsProcessus.js : le moteur des machines modélisées, deuxième partie : les processus et les ressources.
 *
 * La table des processus d'une machine (M.procs) : PID, parent, utilisateur, commande, état (R, S, D, Z, T),
 * CPU, mémoire (RSS en Kio), nice, terminal, fichiers ouverts (dont ceux supprimés mais encore tenus), dossier
 * courant, limite de fichiers ouverts, ce que le processus attend (strace). Les commandes la lisent et la changent :
 * ps, top, kill, killall, pkill, pgrep, pidof, renice, nice, pstree, pmap, lsof, strace, free, vmstat, uptime, nproc,
 * iostat, sar, ss -s, ulimit, /proc/PID/..., et le travail dans la durée : &, jobs, bg, fg, Ctrl-Z, disown, nohup,
 * tmux, screen, watch.
 *
 * À chaque commande tapée (un « tic »), la machine vit : une fuite de mémoire grossit (et la limite MemoryMax ou
 * l'OOM killer tranchent), une boucle relance son enfant, la charge se lisse, sar note un relevé toutes les dix
 * minutes, une tâche longue avance.
 *
 * --- Ce que le monde peut appeler ---
 *   lancerProcessusMachine(h, { comm, cmd, user, ppid, cpu, rss, ... })  -> le processus (avec son PID)
 *   tuerProcessusMachine(h, proc, signal, origine)    procParPid(h, pid)    procsMachine(h)
 *   memoireMachine(h) : { total, utilise, libre, cache, dispo, swapTotal, swapUtilise }
 *   chargeMachine(h) : [1 min, 5 min, 15 min]
 */

/* ================================================================== */
/* La table des processus                                               */
/* ================================================================== */

function procsMachine(h){ return etatMachine(h).procs; }
function procParPid(h, pid){ return procsMachine(h).filter(function(p){ return p.pid === +pid; })[0] || null; }
function nouveauPid(h){
	var M = etatMachine(h);
	M.prochainPid = (M.prochainPid || 5000) + 1 + Math.floor(alea("pid:" + h + ":" + M.prochainPid) * 37);
	if (M.prochainPid > 32000) M.prochainPid = 3000;
	while (procParPid(h, M.prochainPid)) M.prochainPid++;
	return M.prochainPid;
}
function lancerProcessusMachine(h, t){
	var p = copieJson(t);
	p.pid = t.pid || nouveauPid(h);
	p.ppid = t.ppid === undefined ? 1 : t.ppid;
	p.user = t.user || "root";
	p.comm = t.comm || String(t.cmd || "?").split(/\s+/)[0].split("/").pop();
	p.cmd = t.cmd || p.comm;
	p.etat = t.etat || "S";
	p.cpu = t.cpu || 0;
	p.rss = t.rss || 4096;
	p.vsz = t.vsz || Math.round(p.rss * 2.6 + 18000);
	p.ni = t.ni || 0;
	p.tty = t.tty || "?";
	p.debut = t.debut || maintenantMachine(h);
	p.fichiers = t.fichiers || [];
	procsMachine(h).push(p);
	return p;
}
function enfantsDe(h, pid){ return procsMachine(h).filter(function(p){ return p.ppid === pid; }); }
function retirerProcessus(h, p){
	var M = etatMachine(h);
	M.procs = M.procs.filter(function(x){ return x !== p; });
	// Les orphelins sont adoptés par init ; les zombies d'un parent disparu sont aussitôt récoltés par init.
	M.procs.forEach(function(x){ if (x.ppid === p.pid){ x.ppid = 1; } });
	M.procs = M.procs.filter(function(x){ return !(x.etat === "Z" && x.ppid === 1); });
}
var NOMS_SIGNAUX = ["", "HUP", "INT", "QUIT", "ILL", "TRAP", "ABRT", "BUS", "FPE", "KILL", "USR1", "SEGV", "USR2", "PIPE", "ALRM", "TERM", "STKFLT", "CHLD", "CONT", "STOP",
	"TSTP", "TTIN", "TTOU", "URG", "XCPU", "XFSZ", "VTALRM", "PROF", "WINCH", "POLL", "PWR", "SYS"];
function lireSignal(texte){
	var t = String(texte || "").toUpperCase().replace(/^SIG/, "");
	if (/^\d+$/.test(t)) return +t >= 1 && +t <= 64 ? +t : null;
	if (t === "IO") return 29;
	var i = NOMS_SIGNAUX.indexOf(t);
	return i > 0 ? i : null;
}
/* Ce qui arrive à un processus qui reçoit un signal. Renvoie un message (ou null). */
function tuerProcessusMachine(h, p, signal, origine){
	if (!p) return null;
	if (p.etat === "Z") return null;   // on ne tue pas un mort : seul son parent peut le récolter
	if (signal === 0) return null;
	if (signal === 19 || signal === 20 || signal === 21 || signal === 22){ p.etatAvantArret = p.etat; p.etat = "T"; GameEvents.fire({ type: "machine", hote: h, cmd: "signal", signal: signal, pid: p.pid, comm: p.comm, origine: origine }); return null; }
	if (signal === 18){ if (p.etat === "T") p.etat = p.etatAvantArret || "S"; GameEvents.fire({ type: "machine", hote: h, cmd: "signal", signal: signal, pid: p.pid, comm: p.comm, origine: origine }); return null; }
	if (signal === 28 || signal === 17 || signal === 23) return null;
	if (signal === 1 && p.nohup) return null;
	if (p.ignore && p.ignore.indexOf(signal) > -1) return null;
	if (signal === 1 && p.rechargeHup){ GameEvents.fire({ type: "machine", hote: h, cmd: "signal", signal: 1, pid: p.pid, comm: p.comm, recharge: true }); return null; }
	var M = etatMachine(h);
	retirerProcessus(h, p);
	// Les enfants d'un service tombent avec lui (même groupe de contrôle) ; un zombie s'évanouit avec son parent.
	if (p.unite && p.principal){
		procsMachine(h).filter(function(x){ return x.unite === p.unite && x.ppid !== 1 || (x.unite === p.unite && x.ppid === 1 && !x.principal && x.groupeUnite); }).forEach(function(x){ retirerProcessus(h, x); });
	}
	if (p.etat === "T" && signal !== 9) { /* un processus arrêté reçoit le signal à sa reprise : ici, il part */ }
	GameEvents.fire({ type: "machine", hote: h, cmd: "signal", signal: signal, pid: p.pid, comm: p.comm, origine: origine, unite: p.unite || null, mort: true, user: p.user });
	if (p.unite && p.principal && typeof uniteMorteMachine === "function") uniteMorteMachine(h, p, signal, origine);
	return null;
}

/* ================================================================== */
/* La mémoire et la charge                                              */
/* ================================================================== */

function memoireMachine(h){
	var M = etatMachine(h), m = M.memoire || { total: 8148512, noyau: 380000, cache: 600000 };
	var rss = procsMachine(h).reduce(function(s, p){ return s + (p.etat === "Z" ? 0 : (p.rss || 0)); }, 0);
	var swapTotal = (M.swaps || []).reduce(function(s, x){ return s + x.taille; }, 0);
	var besoin = m.noyau + rss;
	var swapUtilise = 0;
	var seuil = m.total - 220000 - (M.swappiness !== undefined ? 0 : 0);
	if (swapTotal && besoin > seuil) swapUtilise = Math.min(swapTotal, besoin - seuil);
	var utilise = Math.min(m.total - 40000, besoin - swapUtilise);
	var cache = Math.max(60000, Math.min(m.cache, m.total - utilise - 50000));
	var libre = Math.max(28000, m.total - utilise - cache);
	var dispo = Math.max(0, libre + Math.round(cache * 0.7) - 20000);
	(M.swaps || []).forEach(function(s, i){ s.utilise = i === 0 ? Math.min(s.taille, swapUtilise) : Math.max(0, Math.min(s.taille, swapUtilise - (M.swaps[0].taille))); });
	return { total: m.total, utilise: utilise, libre: libre, cache: cache, dispo: dispo, partage: 41228, tampons: Math.round(cache * 0.08), swapTotal: swapTotal, swapUtilise: swapUtilise, besoin: besoin };
}
function cpuEffectif(h, p){
	if (p.etat !== "R") return p.etat === "D" ? Math.min(p.cpu || 0, 3) : (p.etat === "T" || p.etat === "Z" ? 0 : Math.min(p.cpu || 0, 2));
	var lim = p.unite ? limitesUnite(h, p.unite).cpuQuota : null;
	return lim ? Math.min(p.cpu, lim) : p.cpu;
}
function chargeInstantanee(h){
	var procs = procsMachine(h);
	var cpu = procs.reduce(function(s, p){ return s + (p.etat === "R" ? cpuEffectif(h, p) : 0); }, 0);
	var bloques = procs.filter(function(p){ return p.etat === "D"; }).length;
	return Math.round((cpu / 100 + bloques + 0.08) * 100) / 100;
}
function chargeMachine(h){
	var M = etatMachine(h);
	if (!M.charge) { var c = chargeInstantanee(h); M.charge = [c, c, c]; }
	return M.charge;
}
function nprocMachine(h){ return (etatMachine(h).cpus) || 4; }

/* La vie de la machine, à chaque commande. */
surTicMachine(function(h, M){
	var pas = pasMachine(h);
	// Les fuites : la mémoire grossit ; la limite du service (MemoryMax) ou l'OOM killer tranchent.
	procsMachine(h).slice().forEach(function(p){
		if (!p.fuite || p.etat === "Z" || p.etat === "T") return;
		p.rss += p.fuite;
		p.vsz += Math.round(p.fuite * 1.1);
		if (p.unite){
			var lim = limitesUnite(h, p.unite);
			if (lim.memMax && p.rss * 1024 > lim.memMax){
				journalMachine(h, { unite: "kernel", noyau: true, prio: 3, message: "Memory cgroup out of memory: Killed process " + p.pid + " (" + p.comm + ") total-vm:" + p.vsz + "kB, anon-rss:" + p.rss + "kB, file-rss:0kB, shmem-rss:0kB, UID:" + uidMachine(h, p.user) + " pgtables:" + Math.round(p.rss / 500) + "kB oom_score_adj:" + (p.oomAdj || 0) });
				journalMachine(h, { unite: "systemd", pid: 1, unit: p.unite, prio: 4, message: p.unite + ": A process of this unit has been killed by the OOM killer." });
				tuerProcessusMachine(h, p, 9, "cgroup-oom");
			}
		}
	});
	// L'OOM killer de la machine entière : la mémoire et l'échange sont épuisés.
	var mem = memoireMachine(h);
	if (mem.besoin > mem.total - 60000 + mem.swapTotal){
		var victime = procsMachine(h).filter(function(p){ return p.etat !== "Z" && p.pid > 300 && (p.oomAdj || 0) > -1000; })
			.sort(function(a, b){ return (b.rss * (1 + (b.oomAdj || 0) / 1000)) - (a.rss * (1 + (a.oomAdj || 0) / 1000)); })[0];
		if (victime){
			journalMachine(h, { unite: "kernel", noyau: true, prio: 3, message: "Out of memory: Killed process " + victime.pid + " (" + victime.comm + ") total-vm:" + victime.vsz + "kB, anon-rss:" + victime.rss + "kB, file-rss:0kB, shmem-rss:0kB, UID:" + uidMachine(h, victime.user) + " pgtables:" + Math.round(victime.rss / 500) + "kB oom_score_adj:" + (victime.oomAdj || 0) });
			tuerProcessusMachine(h, victime, 9, "oom");
		}
	}
	// Les boucles : un parent qui relance son enfant dès qu'il meurt (while true; do ...; done).
	procsMachine(h).slice().forEach(function(p){
		if (!p.boucle || p.etat === "T" || p.etat === "Z") return;
		if (!enfantsDe(h, p.pid).some(function(x){ return x.comm === p.boucle.comm && x.etat !== "Z"; })){
			var t = copieJson(p.boucle); t.ppid = p.pid; t.user = t.user || p.user; t.tty = p.tty; t.session = p.session;
			lancerProcessusMachine(h, t);
		}
	});
	// Les tâches longues avancent (une copie, une reconstruction) ; une fois finies, le processus se termine.
	procsMachine(h).slice().forEach(function(p){
		if (!p.tache || p.etat === "T" || p.etat === "Z") return;
		p.tache.fait = Math.min(p.tache.total, (p.tache.fait || 0) + (p.tache.pas || 1));
		if (p.tache.fait >= p.tache.total){
			GameEvents.fire({ type: "machine", hote: h, cmd: "tache", action: "fin", nom: p.tache.nom, pid: p.pid, tmux: p.tmux || null, nohup: !!p.nohup, job: p.job || null });
			if (p.tache.fin) journalMachine(h, { unite: p.comm, pid: p.pid, message: p.tache.fin });
			M.tachesFinies = M.tachesFinies || {};
			M.tachesFinies[p.tache.nom] = { quand: maintenantMachine(h), tmux: p.tmux || null, nohup: !!p.nohup, disown: !!p.disown, job: !!p.job };
			retirerProcessus(h, p);
			if (p.job){ var j = (M.jobs || []).filter(function(x){ return x.pid === p.pid; })[0]; if (j) j.fini = true; }
		}
	});
	// La charge : une moyenne glissante, comme celle du noyau.
	var inst = chargeInstantanee(h), c = chargeMachine(h);
	var a1 = 1 - Math.exp(-pas / 1), a5 = 1 - Math.exp(-pas / 5), a15 = 1 - Math.exp(-pas / 15);
	M.charge = [c[0] + (inst - c[0]) * a1, c[1] + (inst - c[1]) * a5, c[2] + (inst - c[2]) * a15].map(function(x){ return Math.round(x * 100) / 100; });
	// sar note un relevé toutes les dix minutes.
	var t = maintenantMachine(h), d = dateMachine(h, t);
	var dizaine = Math.floor(t / 600000);
	if (M.dernierReleve !== dizaine){ M.dernierReleve = dizaine; M.sar = M.sar || []; M.sar.push(releveMachine(h, Math.floor(t / 600000) * 600000 + 1000)); if (M.sar.length > 200) M.sar.shift(); }
	void d;
});
/* Un relevé de l'état (sar, iostat, vmstat) : CPU, mémoire, file d'attente, disques. */
function releveMachine(h, t){
	var procs = procsMachine(h), n = nprocMachine(h), mem = memoireMachine(h);
	var cpuUser = 0, cpuSys = 0, cpuNice = 0;
	procs.forEach(function(p){ if (p.etat !== "R") return; var c = cpuEffectif(h, p); if (p.ni > 0) cpuNice += c; else if (p.noyau) cpuSys += c; else cpuUser += c; });
	var bloques = procs.filter(function(p){ return p.etat === "D"; }).length;
	var iowait = Math.min(60, bloques * 9 + (etatMachine(h).ioAttente || 0));
	var total = n * 100;
	var u = Math.min(95, cpuUser / total * 100), ni = Math.min(95 - u, cpuNice / total * 100), s = Math.min(95 - u - ni, cpuSys / total * 100 + 2.1);
	var w = Math.min(100 - u - ni - s, iowait), idle = Math.max(0, 100 - u - ni - s - w);
	var c = chargeMachine(h);
	return { t: t, user: u, nice: ni, sys: s, iowait: w, steal: 0, idle: idle, memLibre: mem.libre, memDispo: mem.dispo, memUtilise: mem.utilise, memPct: mem.utilise / mem.total * 100,
		tampons: mem.tampons, cache: mem.cache, engage: mem.besoin + 900000, swapPct: mem.swapTotal ? mem.swapUtilise / mem.swapTotal * 100 : 0,
		runq: procs.filter(function(p){ return p.etat === "R"; }).length, plist: procs.length + 120, l1: c[0], l5: c[1], l15: c[2], bloques: bloques };
}

/* ================================================================== */
/* ps                                                                   */
/* ================================================================== */

function etatAffiche(p){
	var e = p.etat || "S";
	if (e === "Z") return "Z";
	var x = e;
	if (p.ni > 0) x += "N";
	if (p.ni < 0) x += "<";
	if (p.chef) x += "s";
	if (p.threads > 1) x += "l";
	if (p.premierPlan) x += "+";
	return x;
}
function tempsCpu(h, p, format){
	var secondes = Math.floor((maintenantMachine(h) - p.debut) / 1000 * (cpuEffectif(h, p) || 0.2) / 100) + (p.cpuCumule || 0);
	var m = Math.floor(secondes / 60), s = secondes % 60;
	if (format === "top") return m + ":" + deuxChiffres(s) + "." + deuxChiffres(Math.floor(secondes * 7) % 100);
	if (format === "ps") return Math.floor(m / 60) ? Math.floor(m / 60) + ":" + deuxChiffres(m % 60) : m + ":" + deuxChiffres(s);
	return deuxChiffres(Math.floor(m / 60)) + ":" + deuxChiffres(m % 60) + ":" + deuxChiffres(s);
}
function debutPs(h, p){
	var d = dateMachine(h, p.debut), n = dateMachine(h);
	if (maintenantMachine(h) - p.debut < 86400000 && d.getDate() === n.getDate()) return deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes());
	return MOIS_EN[d.getMonth()] + deuxChiffres(d.getDate());
}
function dureeEcoulee(h, p){
	var s = Math.max(0, Math.floor((maintenantMachine(h) - p.debut) / 1000)), j = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
	return (j ? j + "-" : "") + (j || hh ? deuxChiffres(hh) + ":" : "") + deuxChiffres(m) + ":" + deuxChiffres(s % 60);
}
/* Les processus vus par ps : ceux de la machine, plus ta session (sshd, bash) et ps lui-même. */
function procsVisibles(h, io, nom){
	var M = etatMachine(h), liste = procsMachine(h).slice();
	var bash = M.pidBash || PID_BASH;
	// init et le fil du noyau qui engendre les autres : toujours là, toujours 1 et 2.
	if (!procParPid(h, 1)) liste.unshift({ pid: 1, ppid: 0, user: "root", comm: "systemd", cmd: "/sbin/init", etat: "S", cpu: 0, rss: 13200, vsz: 168000, ni: 0, tty: "?", debut: M.demarrage || maintenantMachine(h) - 86400000 },
		{ pid: 2, ppid: 0, user: "root", comm: "kthreadd", cmd: "[kthreadd]", etat: "S", cpu: 0, rss: 0, vsz: 0, ni: 0, tty: "?", debut: M.demarrage || maintenantMachine(h) - 86400000, noyau: true });
	if (!procParPid(h, bash)){
		liste.push({ pid: bash - 1, ppid: M.pidSshd || 812, user: JOUEUR, comm: "sshd", cmd: "sshd: " + JOUEUR + "@pts/0", etat: "S", cpu: 0, rss: 7012, vsz: 17480, ni: 0, tty: "?", debut: M.connexion || maintenantMachine(h) - 600000, session: true });
		liste.push({ pid: bash, ppid: bash - 1, user: JOUEUR, comm: "bash", cmd: "-bash", etat: "S", cpu: 0, rss: 5240, vsz: 8728, ni: 0, tty: "pts/0", debut: M.connexion || maintenantMachine(h) - 600000, chef: true, session: true });
	}
	liste.push({ pid: 9000 + (state.nbCommandes % 900) * 7, ppid: bash, user: io.sudo ? "root" : JOUEUR, comm: nom, cmd: nom + " " + (io.args || ""), etat: "R", cpu: 0, rss: 4100, vsz: 11200, ni: 0, tty: "pts/0", debut: maintenantMachine(h), premierPlan: true, soi: true });
	return liste;
}
var COLONNES_PS = {
	pid: ["PID", function(h, p){ return p.pid; }, true], ppid: ["PPID", function(h, p){ return p.ppid; }, true], user: ["USER", function(h, p){ return p.user.length > 8 ? p.user.substring(0, 7) + "+" : p.user; }],
	uid: ["UID", function(h, p){ return uidMachine(h, p.user); }, true], ruser: ["RUSER", function(h, p){ return p.user; }], euser: ["EUSER", function(h, p){ return p.user; }],
	"%cpu": ["%CPU", function(h, p){ return (Math.round(cpuEffectif(h, p) * 10) / 10).toFixed(1); }, true], pcpu: ["%CPU", function(h, p){ return (Math.round(cpuEffectif(h, p) * 10) / 10).toFixed(1); }, true],
	"%mem": ["%MEM", function(h, p){ return (p.rss / memoireMachine(h).total * 100).toFixed(1); }, true], pmem: ["%MEM", function(h, p){ return (p.rss / memoireMachine(h).total * 100).toFixed(1); }, true],
	rss: ["RSS", function(h, p){ return p.etat === "Z" ? 0 : p.rss; }, true], rssize: ["RSS", function(h, p){ return p.rss; }, true], vsz: ["VSZ", function(h, p){ return p.etat === "Z" ? 0 : p.vsz; }, true],
	ni: ["NI", function(h, p){ return p.ni; }, true], nice: ["NI", function(h, p){ return p.ni; }, true], pri: ["PRI", function(h, p){ return 19 - p.ni; }, true],
	stat: ["STAT", function(h, p){ return etatAffiche(p); }], s: ["S", function(h, p){ return p.etat; }], state: ["S", function(h, p){ return p.etat; }],
	tty: ["TT", function(h, p){ return p.tty; }], tt: ["TT", function(h, p){ return p.tty; }], start: ["STARTED", function(h, p){ return debutPs(h, p); }], stime: ["STIME", function(h, p){ return debutPs(h, p); }],
	lstart: ["STARTED", function(h, p){ return dateCtimeMachine(h, p.debut); }], etime: ["ELAPSED", function(h, p){ return dureeEcoulee(h, p); }, true],
	time: ["TIME", function(h, p){ return tempsCpu(h, p); }, true], comm: ["COMMAND", function(h, p){ return p.etat === "Z" ? p.comm + " <defunct>" : p.comm; }], ucomm: ["COMMAND", function(h, p){ return p.comm; }],
	cmd: ["CMD", function(h, p){ return p.etat === "Z" ? "[" + p.comm + "] <defunct>" : p.cmd; }], args: ["COMMAND", function(h, p){ return p.etat === "Z" ? "[" + p.comm + "] <defunct>" : p.cmd; }],
	command: ["COMMAND", function(h, p){ return p.etat === "Z" ? "[" + p.comm + "] <defunct>" : p.cmd; }], wchan: ["WCHAN", function(h, p){ return p.etat === "D" ? (p.wchan || "io_schedule") : (p.etat === "Z" ? "-" : (p.wchan || "do_epoll_wait")); }],
	nlwp: ["NLWP", function(h, p){ return p.threads || 1; }, true], thcount: ["THCNT", function(h, p){ return p.threads || 1; }, true],
	cgroup: ["CGROUP", function(h, p){ return p.unite ? "0::/system.slice/" + p.unite : "0::/user.slice/user-1000.slice/session-3.scope"; }], unit: ["UNIT", function(h, p){ return p.unite || "session-3.scope"; }],
	pgid: ["PGID", function(h, p){ return p.pgid || p.pid; }, true], sid: ["SID", function(h, p){ return p.sid || p.pid; }, true], f: ["F", function(h, p){ return p.etat === "Z" ? 1 : 4; }, true],
	c: ["C", function(h, p){ return Math.min(99, Math.round(cpuEffectif(h, p))); }, true], sz: ["SZ", function(h, p){ return Math.round(p.vsz / 4); }, true], psr: ["PSR", function(h, p){ return p.pid % nprocMachine(h); }, true]
};
var ALIAS_TRI_PS = { "%cpu": "%cpu", pcpu: "%cpu", "%mem": "%mem", pmem: "%mem", rss: "rss", vsz: "vsz", pid: "pid", ppid: "ppid", ni: "ni", nice: "ni", time: "time", etime: "etime", start_time: "start", user: "user", comm: "comm", cmd: "cmd", args: "cmd", uid: "uid", s: "s", stat: "stat" };
var PS_AVANT_MACHINES = Shell.sorts.ps;
Shell.sorts.ps = function(args, io){
	var h = machineIci();
	if (!h) return PS_AVANT_MACHINES.apply(this, arguments);
	var tous = false, complet = false, bsd = { a: false, u: false, x: false }, format = null, tri = [], pids = [], cmds = [], users = [], foret = false, sansEntete = false, ppids = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-e" || a === "-A") { tous = true; continue; }
		if (a === "-f") { complet = true; continue; }
		if (a === "-ef" || a === "-fe" || a === "-eF" || a === "-Af"){ tous = true; complet = true; continue; }
		if (a === "-o" || a === "--format" || a === "-O"){ format = (format ? format + "," : "") + args[++i]; continue; }
		if (/^-[eAfFlyw]+o$/.test(a)){ if (/[eA]/.test(a)) tous = true; if (/[fF]/.test(a)) complet = true; format = (format ? format + "," : "") + args[++i]; continue; }
		if (/^ax[o]?$/.test(a) && a === "axo"){ tous = true; format = (format ? format + "," : "") + args[++i]; continue; }
		if (/^-o.+/.test(a)){ format = (format ? format + "," : "") + a.substring(2); continue; }
		if ((m = /^--format=(.+)$/.exec(a))){ format = m[1]; continue; }
		if (a === "-p" || a === "--pid" || a === "p" || a === "q"){ (args[++i] || "").split(",").forEach(function(x){ pids.push(+x); }); continue; }
		if ((m = /^-p(\d.*)$/.exec(a)) || (m = /^--pid=(.+)$/.exec(a))){ m[1].split(",").forEach(function(x){ pids.push(+x); }); continue; }
		if (a === "--ppid"){ (args[++i] || "").split(",").forEach(function(x){ ppids.push(+x); }); continue; }
		if (a === "-C"){ (args[++i] || "").split(",").forEach(function(x){ cmds.push(x); }); continue; }
		if (a === "-u" || a === "-U" || a === "--user"){ (args[++i] || "").split(",").forEach(function(x){ users.push(x); }); continue; }
		if ((m = /^--sort=(.+)$/.exec(a))){ tri = m[1].split(","); continue; }
		if (a === "--sort" || a === "k"){ tri = (args[++i] || "").split(","); continue; }
		if (a === "--forest" || a === "-H" || a === "f") { foret = true; continue; }
		if (a === "--no-headers" || a === "--no-heading") { sansEntete = true; continue; }
		if (/^[auxwfej]+$/.test(a) && a.charAt(0) !== "-"){ a.split("").forEach(function(c){ if (c === "f") foret = true; else if (c === "e" || c === "w" || c === "j") return; else bsd[c] = true; }); continue; }
		if (/^-[efFlywHA]+$/.test(a)){ if (/[eA]/.test(a)) tous = true; if (/[fF]/.test(a)) complet = true; if (a.indexOf("H") > -1) foret = true; continue; }
		if (a === "axo" || a === "-axo" || a === "aux" ) { tous = true; continue; }
		throw new ShellError("error: unsupported option (BSD syntax)\n\nUsage:\n ps [options]\n\n Try 'ps --help <simple|list|output|threads|misc|all>'\n  or 'ps --help <s|l|o|t|m|a>'\n for additional help text.", 1);
	}
	if (bsd.a && bsd.x) tous = true;
	io.args = args.join(" ");
	var liste = procsVisibles(h, io, "ps");
	if (pids.length) liste = liste.filter(function(p){ return pids.indexOf(p.pid) > -1; });
	else if (ppids.length) liste = liste.filter(function(p){ return ppids.indexOf(p.ppid) > -1; });
	else if (cmds.length) liste = liste.filter(function(p){ return cmds.indexOf(p.comm) > -1; });
	else if (users.length) liste = liste.filter(function(p){ return users.indexOf(p.user) > -1 || users.indexOf(String(uidMachine(h, p.user))) > -1; });
	else if (!tous) liste = liste.filter(function(p){ return bsd.x ? p.user === JOUEUR : p.tty === "pts/0"; });
	var colonnes;
	if (format) colonnes = format.split(/[,\s]+/).filter(Boolean).map(function(c){
		var x = c.split("="), cle = x[0].toLowerCase();
		if (!COLONNES_PS[cle]) throw new ShellError("error: unknown user-defined format specifier \"" + x[0] + "\"\n\nUsage:\n ps [options]", 1);
		return { cle: cle, titre: x.length > 1 ? x.slice(1).join("=") : COLONNES_PS[cle][0] };
	});
	else if (bsd.u) colonnes = ["user", "pid", "%cpu", "%mem", "vsz", "rss", "tty", "stat", "start", "time", "command"].map(function(c){ return { cle: c, titre: COLONNES_PS[c][0] }; });
	else if (complet) colonnes = [{ cle: "uid", titre: "UID" }, { cle: "pid", titre: "PID" }, { cle: "ppid", titre: "PPID" }, { cle: "c", titre: "C" }, { cle: "stime", titre: "STIME" }, { cle: "tty", titre: "TTY" }, { cle: "time", titre: "TIME" }, { cle: "cmd", titre: "CMD" }];
	else if (bsd.a || bsd.x) colonnes = [{ cle: "pid", titre: "PID" }, { cle: "tty", titre: "TTY" }, { cle: "stat", titre: "STAT" }, { cle: "time", titre: "TIME" }, { cle: "command", titre: "COMMAND" }];
	else colonnes = [{ cle: "pid", titre: "PID" }, { cle: "tty", titre: "TTY" }, { cle: "time", titre: "TIME" }, { cle: "cmd", titre: "CMD" }];
	if (complet && !format) colonnes[0] = { cle: "user", titre: "UID" };
	if (tri.length){
		tri.slice().reverse().forEach(function(t){
			var desc = t.charAt(0) === "-", cle = ALIAS_TRI_PS[t.replace(/^[-+]/, "").toLowerCase()];
			if (!cle) throw new ShellError("error: unknown sort specifier\n\nUsage:\n ps [options]", 1);
			var v = function(p){ var x = COLONNES_PS[cle] ? COLONNES_PS[cle][1](h, p) : p[cle]; return COLONNES_PS[cle] && COLONNES_PS[cle][2] ? parseFloat(x) || 0 : String(x); };
			liste.sort(function(a, b){ var x = v(a), y = v(b); var r = x < y ? -1 : (x > y ? 1 : 0); return desc ? -r : r; });
		});
	} else liste.sort(function(a, b){ return a.pid - b.pid; });
	if (foret){
		var ordre = [], vus = {};
		var racines = liste.filter(function(p){ return !liste.some(function(q){ return q.pid === p.ppid && q !== p; }); });
		(function descendre(l, prof){ l.forEach(function(p){ if (vus[p.pid]) return; vus[p.pid] = true; p.prof = prof; ordre.push(p); descendre(liste.filter(function(q){ return q.ppid === p.pid && q !== p; }), prof + 1); }); })(racines, 0);
		liste = ordre;
	}
	var rangs = liste.map(function(p){
		return colonnes.map(function(c){
			var v = String(COLONNES_PS[c.cle][1](h, p));
			if (foret && /^(cmd|args|command|comm)$/.test(c.cle) && p.prof) v = new Array(p.prof).join("    ") + " \\_ " + v;
			return v;
		});
	});
	var vide = colonnes.every(function(c){ return c.titre === ""; });
	var largeurs = colonnes.map(function(c, k){ return Math.max.apply(null, [c.titre.length].concat(rangs.map(function(r){ return k === colonnes.length - 1 ? 0 : r[k].length; }))); });
	var lignes = [];
	if (!sansEntete && !vide) lignes.push(colonnes.map(function(c, k){ return k === colonnes.length - 1 ? c.titre : (COLONNES_PS[c.cle][2] ? completerGauche(c.titre, largeurs[k]) : completerDroite(c.titre, largeurs[k])); }).join(" "));
	rangs.forEach(function(r){ lignes.push(r.map(function(v, k){ return k === r.length - 1 ? v : (COLONNES_PS[colonnes[k].cle][2] ? completerGauche(v, largeurs[k]) : completerDroite(v, largeurs[k])); }).join(" ").replace(/\s+$/, "")); });
	if (!liste.length) io.code = 1;
	GameEvents.fire({ type: "machine", hote: h, cmd: "ps", args: args.slice(), colonnes: colonnes.map(function(c){ return c.cle; }), tri: tri, pids: liste.filter(function(p){ return !p.soi; }).map(function(p){ return p.pid; }), sortie: lignes.join("\n") });
	return lignes.join("\n");
};

/* ================================================================== */
/* top                                                                  */
/* ================================================================== */

function texteUptimeCourt(h){
	var M = etatMachine(h), s = Math.floor((maintenantMachine(h) - (M.demarrage || maintenantMachine(h) - 41 * 86400000)) / 1000);
	var j = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60);
	return (j ? j + " day" + (j > 1 ? "s" : "") + ", " : "") + (hh ? completerGauche(hh, 2) + ":" + deuxChiffres(mm) : mm + " min");
}
function utilisateursConnectes(h){ return (etatMachine(h).connectes || 1); }
function texteCharge(c){ return c.map(function(x){ return x.toFixed(2); }).join(", "); }
var TOP_AVANT_MACHINES = Shell.sorts.top;
Shell.sorts.top = function(args, io){
	var h = machineIci();
	if (!h) return TOP_AVANT_MACHINES.apply(this, arguments);
	var lot = false, n = 1, tri = "%CPU", user = null, pids = [], complet = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-b") { lot = true; continue; }
		if (a === "-n"){ n = parseInt(args[++i], 10) || 1; continue; }
		if (/^-n\d+$/.test(a)){ n = +a.substring(2); continue; }
		if (/^-bn\d+$/.test(a)){ lot = true; n = +a.substring(3); continue; }
		if (a === "-o"){ tri = (args[++i] || "%CPU").replace(/^[-+]/, "").toUpperCase(); continue; }
		if (a === "-u" || a === "-U"){ user = args[++i]; continue; }
		if (a === "-p"){ (args[++i] || "").split(",").forEach(function(x){ pids.push(+x); }); continue; }
		if (a === "-c"){ complet = true; continue; }
		if (a === "-d" || a === "-w"){ i++; continue; }
		if (/^-[bcHi]+$/.test(a)){ if (a.indexOf("b") > -1) lot = true; if (a.indexOf("c") > -1) complet = true; continue; }
		throw new ShellError("top: unknown option '" + a.replace(/^-/, "") + "'\nUsage:\n  top -hv | -bcEeHiOSs1 -d secs -n max -u|U user -p pid(s) -o field -w [cols]", 1);
	}
	io.args = args.join(" ");
	var M = etatMachine(h), procs = procsVisibles(h, io, "top"), mem = memoireMachine(h), r = releveMachine(h, maintenantMachine(h)), c = chargeMachine(h), d = dateMachine(h);
	var etats = { R: 0, S: 0, T: 0, Z: 0 };
	procs.forEach(function(p){ var e = p.etat === "D" || p.etat === "I" ? "S" : p.etat; etats[e] = (etats[e] || 0) + 1; });
	var nb = procs.length + 118;
	var entete = ["top - " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " up " + texteUptimeCourt(h) + ",  " + utilisateursConnectes(h) + " user" + (utilisateursConnectes(h) > 1 ? "s" : "") + ",  load average: " + texteCharge(c),
		"Tasks: " + completerGauche(nb, 3) + " total, " + completerGauche(etats.R, 3) + " running, " + completerGauche(nb - etats.R - etats.T - etats.Z, 3) + " sleeping, " + completerGauche(etats.T, 3) + " stopped, " + completerGauche(etats.Z, 3) + " zombie",
		"%Cpu(s): " + completerGauche(r.user.toFixed(1), 4) + " us, " + completerGauche(r.sys.toFixed(1), 4) + " sy, " + completerGauche(r.nice.toFixed(1), 4) + " ni, " + completerGauche(r.idle.toFixed(1), 4) + " id, " + completerGauche(r.iowait.toFixed(1), 4) + " wa,  0.0 hi,  0.3 si,  0.0 st",
		"MiB Mem : " + completerGauche((mem.total / 1024).toFixed(1), 7) + " total, " + completerGauche((mem.libre / 1024).toFixed(1), 7) + " free, " + completerGauche((mem.utilise / 1024).toFixed(1), 7) + " used, " + completerGauche((mem.cache / 1024).toFixed(1), 7) + " buff/cache",
		"MiB Swap: " + completerGauche((mem.swapTotal / 1024).toFixed(1), 7) + " total, " + completerGauche(((mem.swapTotal - mem.swapUtilise) / 1024).toFixed(1), 7) + " free, " + completerGauche((mem.swapUtilise / 1024).toFixed(1), 7) + " used. " + completerGauche((mem.dispo / 1024).toFixed(1), 7) + " avail Mem ", ""];
	var liste = procs.slice();
	if (user) liste = liste.filter(function(p){ return p.user === user; });
	if (pids.length) liste = liste.filter(function(p){ return pids.indexOf(p.pid) > -1; });
	var cles = { "%CPU": function(p){ return cpuEffectif(h, p); }, "%MEM": function(p){ return p.rss; }, RES: function(p){ return p.rss; }, PID: function(p){ return -p.pid; }, TIME: function(p){ return cpuEffectif(h, p); }, "TIME+": function(p){ return cpuEffectif(h, p); }, NI: function(p){ return p.ni; } };
	if (!cles[tri]) throw new ShellError("top: unrecognized field name '" + tri + "'", 1);
	liste.sort(function(a, b){ return cles[tri](b) - cles[tri](a) || a.pid - b.pid; });
	var lignes = entete.concat(["    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND"]);
	liste.slice(0, lot ? 40 : 18).forEach(function(p){
		var res = p.etat === "Z" ? 0 : p.rss, virt = p.etat === "Z" ? 0 : p.vsz;
		var fmt = function(k){ return k >= 10485760 ? (k / 1048576).toFixed(1) + "g" : (k >= 1048576 ? (k / 1048576).toFixed(1) + "g" : String(k)); };
		var ligne = completerGauche(p.pid, 7) + " " + completerDroite(p.user.length > 8 ? p.user.substring(0, 7) + "+" : p.user, 8) + " " + completerGauche(p.noyau ? "rt" : 20 + p.ni, 3) + " " + completerGauche(p.ni, 3) + " " +
			completerGauche(fmt(virt), 7) + " " + completerGauche(fmt(res), 6) + " " + completerGauche(Math.round(res * 0.08), 6) + " " + (p.etat === "D" || p.etat === "I" ? p.etat : p.etat) + " " + completerGauche(cpuEffectif(h, p).toFixed(1), 5) + " " +
			completerGauche((res / mem.total * 100).toFixed(1), 5) + " " + completerGauche(tempsCpu(h, p, "top"), 9) + " " + (complet ? (p.etat === "Z" ? p.comm : p.cmd) : p.comm);
		lignes.push(io.tty && cpuEffectif(h, p) >= 50 ? C.rouge(ligne) : (io.tty && p.etat === "Z" ? C.jaune(ligne) : ligne));
	});
	var texte = lignes.join("\n");
	if (n > 1) texte = Array.apply(null, new Array(Math.min(n, 3))).map(function(){ return texte; }).join("\n\n");
	GameEvents.fire({ type: "machine", hote: h, cmd: "top", lot: lot, tri: tri, premier: liste[0] ? liste[0].comm : null, zombies: etats.Z });
	return texte + (!lot && io.tty ? astuce(io, "top se rafraîchit toutes les 3 secondes et se quitte avec q ; ici, une photo. top -b -n 1 en donne une aussi, sans les couleurs, prête pour un tuyau. Tri : P (CPU), M (mémoire), ou -o %MEM.") : "");
};

/* ================================================================== */
/* kill, killall, pkill, pgrep, pidof                                   */
/* ================================================================== */

function texteListeSignaux(){
	var l = [];
	for (var i = 1; i <= 31; i++) l.push(completerGauche(i, 2) + ") SIG" + completerDroite(NOMS_SIGNAUX[i], 8));
	var lignes = [];
	for (var k = 0; k < l.length; k += 5) lignes.push(l.slice(k, k + 5).join(" ").replace(/\s+$/, ""));
	lignes.push("34) SIGRTMIN\t35) SIGRTMIN+1\t36) SIGRTMIN+2\t37) SIGRTMIN+3\t38) SIGRTMIN+4", "...", "64) SIGRTMAX");
	return lignes.join("\n");
}
function peutSignaler(h, p, io){ return io.sudo || p.user === JOUEUR; }
/* Envoyer un signal à un processus, avec le message qu'imprimerait le vrai kill. */
function signalerMachine(h, pid, signal, io, cmd){
	var p = procParPid(h, pid);
	if (!p){
		if (pid === (etatMachine(h).pidBash || PID_BASH)) return { msg: "Tuer ton propre bash, c'est fermer ta session sur " + h + ". Mauvaise idée ici." };
		return { erreur: (cmd === "kill" ? "bash: kill: (" + pid + ") - No such process" : cmd + ": (" + pid + ") - No such process") };
	}
	if (!peutSignaler(h, p, io)) return { erreur: "bash: kill: (" + pid + ") - Operation not permitted", refus: true };
	if (p.pid === 1) return { msg: null };
	var etaitZombie = p.etat === "Z";
	tuerProcessusMachine(h, p, signal, cmd);
	return { zombie: etaitZombie, proc: p };
}
var KILL_AVANT_MACHINES = Shell.sorts.kill;
Shell.sorts.kill = function(args, io){
	var h = machineIci();
	if (!h) return KILL_AVANT_MACHINES.apply(this, arguments);
	var signal = 15, cibles = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-l" || a === "-L" || a === "--list"){
			if (args[i + 1] && /^\d+$/.test(args[i + 1])) return NOMS_SIGNAUX[+args[i + 1] % 128] || "";
			GameEvents.fire({ type: "machine", hote: h, cmd: "kill", action: "liste" });
			return texteListeSignaux();
		}
		if (a === "-s" || a === "--signal" || a === "-n"){ var s = lireSignal(args[++i]); if (s === null) throw new ShellError("bash: kill: " + args[i] + ": invalid signal specification", 1); signal = s; continue; }
		if (/^-\w+$/.test(a) && !/^-\d+$/.test(a) || /^-\d+$/.test(a) && cibles.length === 0 && i === 0){
			var s2 = lireSignal(a.substring(1));
			if (s2 === null) throw new ShellError("bash: kill: " + a.substring(1) + ": invalid signal specification", 1);
			signal = s2; continue;
		}
		cibles.push(a);
	}
	if (!cibles.length) throw new ShellError("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]", 2);
	var erreurs = [], effets = [];
	cibles.forEach(function(c){
		var pid;
		if (/^%/.test(c)){ var j = trouverJob(h, c); if (!j){ erreurs.push("bash: kill: " + c + ": no such job"); return; } pid = j.pid; }
		else if (/^\d+$/.test(c)) pid = +c;
		else { erreurs.push("bash: kill: " + c + ": arguments must be process or job IDs"); return; }
		var r = signalerMachine(h, pid, signal, io, "kill");
		if (r.erreur) erreurs.push(r.erreur); else effets.push(r);
		if (r.msg) erreurs.push(r.msg);
	});
	erreurs.forEach(function(e){ io.err(e); });
	if (erreurs.length) io.code = 1;
	GameEvents.fire({ type: "machine", hote: h, cmd: "kill", signal: signal, cibles: cibles, zombies: effets.filter(function(e){ return e.zombie; }).length });
	var notes = [];
	if (io.tty && effets.some(function(e){ return e.zombie; })) notes.push("Rien ne bouge : ce processus est un zombie (état Z). Il est déjà mort ; seule son entrée attend que son parent la récolte. On ne tue pas un mort : ps -o ppid= -p PID donne le parent.");
	return notes.length ? astuce(io, notes.join(" ")).replace(/^\n/, "") : "";
};
function correspondProc(p, motif, complet, exact){
	var cible = complet ? p.cmd : p.comm;
	if (exact) return cible === motif;
	try { return new RegExp(motif).test(cible); } catch (e){ return cible.indexOf(motif) > -1; }
}
var PGREP_AVANT_MACHINES = Shell.sorts.pgrep;
Shell.sorts.pgrep = function(args, io){
	var h = machineIci();
	var o = { l: false, a: false, f: false, x: false, c: false, n: false, o: false, u: null, d: "\n" }, motifs = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-u" || a === "-U"){ o.u = args[++i]; continue; }
		if (a === "-d"){ o.d = args[++i]; continue; }
		if (/^-[lafxcno]+$/.test(a)){ a.substring(1).split("").forEach(function(x){ o[x] = true; }); continue; }
		if (a === "--list-full") { o.a = true; continue; }
		if (a === "--full") { o.f = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("pgrep: invalid option -- '" + a.charAt(1) + "'\n\nUsage:\n pgrep [options] <pattern>", 2);
		motifs.push(a);
	}
	if (!h){
		if (!motifs.length) throw new ShellError("pgrep: no matching criteria specified\nTry `pgrep --help' for more information.", 2);
		return PGREP_AVANT_MACHINES.apply(this, arguments);
	}
	if (!motifs.length && !o.u) throw new ShellError("pgrep: no matching criteria specified\nTry `pgrep --help' for more information.", 2);
	var liste = procsMachine(h).filter(function(p){ return (!motifs.length || correspondProc(p, motifs[0], o.f, o.x)) && (!o.u || p.user === o.u); }).sort(function(a, b){ return a.pid - b.pid; });
	if (o.n) liste = liste.slice(-1);
	if (o.o) liste = liste.slice(0, 1);
	GameEvents.fire({ type: "machine", hote: h, cmd: "pgrep", motif: motifs[0] || null, complet: o.a, pids: liste.map(function(p){ return p.pid; }) });
	if (!liste.length){ io.code = 1; return ""; }
	if (o.c) return String(liste.length);
	return liste.map(function(p){ return p.pid + (o.a ? " " + (p.etat === "Z" ? "[" + p.comm + "] <defunct>" : p.cmd) : (o.l ? " " + p.comm : "")); }).join(o.d);
};
Shell.sorts.pidof = function(args, io){
	var h = machineIci();
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), seul = args.indexOf("-s") > -1;
	if (!noms.length){ io.code = 1; return ""; }
	var liste = h ? procsMachine(h) : Shell.procsDeLHote().map(function(e){ return { pid: e.proc.pid, comm: e.proc.name, etat: "S" }; });
	var res = [];
	noms.forEach(function(n){ liste.filter(function(p){ return p.comm === n.split("/").pop() && p.etat !== "Z"; }).sort(function(a, b){ return b.pid - a.pid; }).forEach(function(p){ res.push(p.pid); }); });
	if (seul) res = res.slice(0, 1);
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "pidof", noms: noms, pids: res });
	if (!res.length){ io.code = 1; return ""; }
	return res.join(" ");
};
function tuerParNom(cmd){
	var avant = Shell.sorts[cmd];
	return function(args, io){
		var h = machineIci();
		if (!h){ if (avant) return avant.apply(this, arguments); throw new ShellError(cmd + ": command not found", 127); }
		var signal = 15, motifs = [], complet = false, exact = cmd === "killall", user = null, interactif = false, verbeux = false;
		for (var i = 0; i < args.length; i++){
			var a = args[i];
			if (a === "-s" || a === "--signal"){ signal = lireSignal(args[++i]); if (signal === null) throw new ShellError(cmd + ": unknown signal; " + cmd + " -l lists signals.", 1); continue; }
			if (a === "-u" || a === "--user"){ user = args[++i]; continue; }
			if (a === "-f" || a === "--full"){ complet = true; continue; }
			if (a === "-e" || a === "--exact"){ exact = true; continue; }
			if (a === "-v" || a === "--verbose"){ verbeux = true; continue; }
			if (a === "-i"){ interactif = true; continue; }
			if (a === "-l"){ return texteListeSignaux(); }
			if (/^-\w+$/.test(a)){ var s = lireSignal(a.substring(1)); if (s === null) throw new ShellError(cmd + ": unknown signal; " + cmd + " -l lists signals.", 1); signal = s; continue; }
			motifs.push(a);
		}
		if (!motifs.length) throw new ShellError(cmd === "killall" ? "Usage: killall [OPTION]... [--] NAME...\n       killall -l, --list\n       killall -V, --version" : "pkill: no matching criteria specified", cmd === "killall" ? 1 : 2);
		var touches = 0, sorties = [];
		motifs.forEach(function(m){
			var liste = procsMachine(h).filter(function(p){ return p.etat !== "Z" && (exact ? (complet ? p.cmd === m : p.comm === m) : correspondProc(p, m, complet, false)) && (!user || p.user === user); });
			if (!liste.length && cmd === "killall"){ io.err(m + ": no process found"); io.code = 1; return; }
			liste.forEach(function(p){
				if (!peutSignaler(h, p, io)){ io.err(cmd + ": killing pid " + p.pid + " failed: Operation not permitted"); io.code = 1; return; }
				tuerProcessusMachine(h, p, signal, cmd);
				touches++;
				if (verbeux) sorties.push("Killed " + p.comm + "(" + p.pid + ") with signal " + signal);
			});
		});
		if (!touches && cmd === "pkill") io.code = 1;
		void interactif;
		GameEvents.fire({ type: "machine", hote: h, cmd: cmd, motifs: motifs, signal: signal, touches: touches });
		return sorties.join("\n");
	};
}
Shell.sorts.killall = tuerParNom("killall");
Shell.sorts.pkill = tuerParNom("pkill");

/* ================================================================== */
/* renice, nice                                                         */
/* ================================================================== */

Shell.sorts.renice = function(args, io){
	var h = machineIci();
	var prio = null, pids = [], mode = "p";
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-n" || a === "--priority"){ prio = parseInt(args[++i], 10); continue; }
		if (a === "-p" || a === "--pid"){ mode = "p"; continue; }
		if (a === "-u" || a === "--user"){ mode = "u"; continue; }
		if (a === "-g" || a === "--pgrp"){ mode = "g"; continue; }
		if (/^[+-]?\d+$/.test(a) && prio === null){ prio = parseInt(a, 10); continue; }
		pids.push({ mode: mode, v: a });
	}
	if (prio === null || isNaN(prio) || !pids.length) throw new ShellError("renice: bad priority value\nUsage:\n renice [-n|--priority|--relative] <priority> [-p|--pid] <pid>...", 1);
	prio = Math.max(-20, Math.min(19, prio));
	if (!h) throw new ShellError("renice: failed to set priority for " + pids[0].v + " (process ID): No such process", 1);
	var sorties = [];
	pids.forEach(function(c){
		var liste = c.mode === "u" ? procsMachine(h).filter(function(p){ return p.user === c.v; }) : [procParPid(h, c.v)].filter(Boolean);
		if (!liste.length){ io.err("renice: failed to get priority for " + c.v + " (process ID): No such process"); io.code = 1; return; }
		liste.forEach(function(p){
			if (!io.sudo && (p.user !== JOUEUR || prio < p.ni)){ io.err("renice: failed to set priority for " + p.pid + " (process ID): Permission denied"); io.code = 1; return; }
			var ancien = p.ni;
			p.ni = prio;
			sorties.push(p.pid + " (process ID) old priority " + ancien + ", new priority " + prio);
			GameEvents.fire({ type: "machine", hote: h, cmd: "renice", pid: p.pid, comm: p.comm, ancien: ancien, ni: prio });
		});
	});
	return sorties.join("\n");
};
Shell.sorts.nice = function(args, io){
	var h = machineIci();
	var n = 10, i = 0;
	if (!args.length) return "0";
	if (args[0] === "-n" || args[0] === "--adjustment"){ n = parseInt(args[1], 10); i = 2; }
	else if (/^-\d+$/.test(args[0])){ n = parseInt(args[0].substring(1), 10); i = 1; }
	else if (/^--adjustment=/.test(args[0])){ n = parseInt(args[0].split("=")[1], 10); i = 1; }
	if (isNaN(n)) throw new ShellError("nice: invalid adjustment '" + args[1] + "'", 125);
	var commande = args.slice(i);
	if (!commande.length) return String(n);
	if (n < 0 && !io.sudo){ io.err("nice: cannot set niceness: Permission denied"); }
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "nice", ni: n, commande: commande.slice() });
	var r = Shell.lancerSousCommande(commande, io, "nice");
	if (r.code) io.code = r.code;
	return r.sortie;
};

/* ================================================================== */
/* pstree, pmap                                                         */
/* ================================================================== */

Shell.sorts.pstree = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("pstree: command not found", 127);
	var avecPid = args.some(function(a){ return /^-\w*p/.test(a); }), arguments_ = args.some(function(a){ return /^-\w*a/.test(a); });
	var depart = args.filter(function(a){ return /^\d+$/.test(a); })[0];
	io.args = "";
	var procs = procsVisibles(h, io, "pstree").filter(function(p){ return !p.soi; });
	procs.push({ pid: 1, ppid: 0, comm: "systemd", cmd: "/sbin/init", user: "root", etat: "S" });
	function nom(p){ return (arguments_ ? (p.etat === "Z" ? "(" + p.comm + ")" : p.cmd) : (p.etat === "Z" ? "(" + p.comm + ")" : p.comm)) + (avecPid ? "(" + p.pid + ")" : ""); }
	var lignes = [];
	function dessiner(p, prefixe, dernier, racine){
		var enf = procs.filter(function(x){ return x.ppid === p.pid && x !== p; }).sort(function(a, b){ return a.comm < b.comm ? -1 : 1; });
		lignes.push(racine ? nom(p) : prefixe + (dernier ? "└─" : "├─") + nom(p));
		enf.forEach(function(e, k){ dessiner(e, racine ? "" : prefixe + (dernier ? "  " : "│ "), k === enf.length - 1, false); });
	}
	var r = depart ? procs.filter(function(p){ return p.pid === +depart; })[0] : procs.filter(function(p){ return p.pid === 1; })[0];
	if (!r){ io.code = 1; return ""; }
	dessiner(r, "", true, true);
	GameEvents.fire({ type: "machine", hote: h, cmd: "pstree", depart: depart || 1 });
	return lignes.join("\n");
};
Shell.sorts.pmap = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("pmap: command not found", 127);
	var pid = args.filter(function(a){ return /^\d+$/.test(a); })[0], etendu = args.indexOf("-x") > -1;
	var p = pid ? procParPid(h, pid) : null;
	if (!p){ io.code = 42; return ""; }
	if (!io.sudo && p.user !== JOUEUR) throw new ShellError(pid + ":   " + p.cmd + "\npmap: cannot read /proc/" + pid + "/maps: Permission denied", 1);
	var tas = Math.max(0, p.rss - 21000);
	var zones = [["0000556f3a2c1000", 112, "r----", p.comm], ["0000556f3a2dd000", 2048, "r-x--", p.comm], ["0000556f3a4dd000", 316, "r----", p.comm], ["0000556f3c112000", tas, "rw---", "  [ anon ]"],
		["00007f2a91e00000", 1924, "r-x--", "libc.so.6"], ["00007f2a92200000", 4096, "rw-s-", "  [ shmem ]"], ["00007ffd5b9f2000", 132, "rw---", "  [ stack ]"]];
	var l = [pid + ":   " + p.cmd];
	if (etendu) l.push("Address           Kbytes     RSS   Dirty Mode  Mapping");
	zones.forEach(function(z){ l.push(etendu ? z[0] + " " + completerGauche(z[1], 7) + " " + completerGauche(z[1], 7) + " " + completerGauche(z[2].indexOf("w") > -1 ? z[1] : 0, 7) + " " + z[2] + " " + z[3].trim() : z[0] + " " + completerGauche(z[1] + "K", 7) + " " + z[2] + " " + z[3]); });
	var total = zones.reduce(function(s, z){ return s + z[1]; }, 0);
	l.push(etendu ? "---------------- ------- ------- -------\ntotal kB         " + completerGauche(p.vsz, 7) + " " + completerGauche(p.rss, 7) + " " + completerGauche(tas, 7) : " total " + completerGauche(p.vsz + "K", 15));
	void total;
	GameEvents.fire({ type: "machine", hote: h, cmd: "pmap", pid: p.pid, comm: p.comm });
	return l.join("\n");
};

/* ================================================================== */
/* lsof, strace                                                         */
/* ================================================================== */

function fichiersOuvertsListe(h, p){
	var l = [{ fd: "cwd", type: "DIR", chemin: p.cwd || "/", taille: 4096 }, { fd: "rtd", type: "DIR", chemin: "/", taille: 4096 }, { fd: "txt", type: "REG", chemin: p.exe || (String(p.cmd).split(/\s+/)[0].charAt(0) === "/" ? String(p.cmd).split(/\s+/)[0] : "/usr/bin/" + p.comm), taille: 1024000 }];
	(p.fichiers || []).forEach(function(f){ l.push(f); });
	(p.ports || []).forEach(function(port, i){ l.push({ fd: (3 + (p.fichiers || []).length + i) + "u", type: "IPv4", chemin: "*:" + port + " (LISTEN)", proto: "TCP", reseau: true }); });
	(p.connexions || []).forEach(function(cx, i){ l.push({ fd: (20 + i) + "u", type: "IPv4", chemin: cx, proto: "TCP", reseau: true }); });
	return l;
}
var LSOF_AVANT_MACHINES = Shell.sorts.lsof;
Shell.sorts.lsof = function(args, io){
	var h = machineIci();
	if (!h) return LSOF_AVANT_MACHINES.apply(this, arguments);
	var o = { L1: false, pids: [], users: [], cmds: [], reseau: null, chemins: [], dossier: null, f: false };
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "+L1" || a === "+L"){ o.L1 = true; continue; }
		if (a === "-p"){ (args[++i] || "").split(",").forEach(function(x){ o.pids.push(+x); }); continue; }
		if (a === "-u"){ o.users.push(args[++i]); continue; }
		if (a === "-c"){ o.cmds.push(args[++i]); continue; }
		if (a === "-i"){ o.reseau = /^-/.test(args[i + 1] || "-") ? "" : args[++i]; continue; }
		if (/^-i.+/.test(a)){ o.reseau = a.substring(2); continue; }
		if (a === "+D"){ o.dossier = cheminNormal(args[++i] || "/"); continue; }
		if (a === "+f" || a === "--"){ o.f = true; continue; }
		if (/^-[nPlt]+$/.test(a)) { if (a.indexOf("t") > -1) o.t = true; continue; }
		if (a.charAt(0) === "-" || a.charAt(0) === "+") throw new ShellError("lsof: unsupported option: " + a + "\nlsof 4.95.0\n latest revision: https://github.com/lsof-org/lsof\n usage: [-?abhKlnNoOPRtUvVX] [+|-c c] [+|-d s] [+D D] [+|-E] [+|-e s] [+|-f[gG]] [+|-L [l]] [-p s] [+|-r [t]] [-s [p:s]] [-S [t]] [-T [t]] [-u s] [+|-w] [-x [fl]] [--] [names]", 1);
		o.chemins.push(cheminNormal(/^\//.test(a) ? a : cheminDuLieuMachine(current_room) + "/" + a));
	}
	if (!io.sudo){ io.err("lsof: WARNING: can't stat() fuse.gvfsd-fuse file system /run/user/1000/gvfs\n      Output information may be incomplete."); }
	var lignes = [], visibles = procsMachine(h).filter(function(p){ return p.etat !== "Z" && (io.sudo || p.user === JOUEUR); });
	var nb = 0;
	visibles.forEach(function(p){
		if (o.pids.length && o.pids.indexOf(p.pid) === -1) return;
		if (o.users.length && o.users.indexOf(p.user) === -1) return;
		if (o.cmds.length && !o.cmds.some(function(c){ return p.comm.indexOf(c) === 0; })) return;
		fichiersOuvertsListe(h, p).forEach(function(f){
			if (o.L1 && !f.supprime) return;
			if (o.reseau !== null && !f.reseau) return;
			if (o.reseau && o.reseau.charAt(0) === ":" && String(f.chemin).indexOf(o.reseau.substring(1)) === -1) return;
			if (o.dossier && String(f.chemin).indexOf(o.dossier + "/") !== 0 && f.chemin !== o.dossier) return;
			if (o.chemins.length && !o.chemins.some(function(c){ var fs = o.f ? fsParCible(h, c) : null; return f.chemin === c || (fs || o.f) && String(f.chemin).indexOf(c + "/") === 0 || f.chemin.indexOf(c + "/") === 0 && dossierHote(h, c); })) return;
			nb++;
			if (o.t){ lignes.push(String(p.pid)); return; }
			lignes.push([completerDroite(p.comm.substring(0, 9), 9), completerGauche(p.pid, 6), completerDroite(p.user.substring(0, 8), 8), completerGauche(f.fd || "3w", 4) + " ", completerDroite(f.type || "REG", 6),
				completerGauche(f.reseau ? "0x" + hexDe(p.pid + f.chemin, 6) : "253," + (f.dm || 1), 18), completerGauche(f.reseau ? "0t0" : (f.taille || 0), 12)].concat(o.L1 ? [completerGauche(f.supprime ? 0 : 1, 5)] : [])
				.concat([completerGauche(f.reseau ? f.proto : inodeDe(h, f.chemin), 8), f.chemin + (f.supprime ? " (deleted)" : "")]).join(" "));
		});
	});
	if (o.t){ GameEvents.fire({ type: "machine", hote: h, cmd: "lsof", args: args.slice(), nombre: nb }); return lignes.filter(function(x, i, t){ return t.indexOf(x) === i; }).join("\n"); }
	var entete = ["COMMAND  ", "   PID", "USER    ", "  FD ", "TYPE  ", "            DEVICE", "   SIZE/OFF"].concat(o.L1 ? ["NLINK"] : []).concat(["    NODE", "NAME"]).join(" ");
	GameEvents.fire({ type: "machine", hote: h, cmd: "lsof", args: args.slice(), nombre: nb, supprimes: o.L1, sortie: lignes.join("\n") });
	if (!lignes.length){ io.code = 1; return ""; }
	return tronquerSortieMachine([entete].concat(lignes), io, "lsof");
};
Shell.sorts.strace = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("strace: command not found", 127);
	var pid = null, compter = false, horodate = false, filtre = null, sortieFichier = null, commande = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-p"){ pid = +args[++i]; continue; }
		if (/^-p\d+$/.test(a)){ pid = +a.substring(2); continue; }
		if (a === "-c"){ compter = true; continue; }
		if (a === "-tt" || a === "-t" || a === "-ttt"){ horodate = true; continue; }
		if (a === "-f" || a === "-ff" || a === "-y" || a === "-yy") continue;
		if (a === "-e"){ filtre = args[++i]; continue; }
		if (a === "-o"){ sortieFichier = args[++i]; continue; }
		if (a === "-s"){ i++; continue; }
		if (a.charAt(0) === "-") throw new ShellError("strace: invalid option -- '" + a.charAt(1) + "'\nTry 'strace -h' for more information.", 1);
		commande = args.slice(i); break;
	}
	if (pid === null && !commande.length) throw new ShellError("strace: must have PROG [ARGS] or -p PID\nTry 'strace -h' for more information.", 1);
	if (commande.length){
		var r = Shell.lancerSousCommande(commande, io, "strace");
		var nom = commande[0];
		return "execve(\"/usr/bin/" + nom + "\", [\"" + commande.join("\", \"") + "\"], 0x7ffc1e8a2f70 /* 23 vars */) = 0\nbrk(NULL)                               = 0x55d5f2a2b000\nopenat(AT_FDCWD, \"/etc/ld.so.cache\", O_RDONLY|O_CLOEXEC) = 3\n" + (r.sortie ? "write(1, \"" + String(r.sortie).split("\n")[0].substring(0, 32).replace(/"/g, "\\\"") + "\"..., " + String(r.sortie).length + ") = " + String(r.sortie).length + "\n" : "") + "exit_group(0)                           = ?\n+++ exited with 0 +++" + (r.sortie ? "\n" + r.sortie : "");
	}
	var p = procParPid(h, pid);
	if (!p) throw new ShellError("strace: attach: ptrace(PTRACE_SEIZE, " + pid + "): No such process", 1);
	if (!io.sudo) throw new ShellError("strace: attach: ptrace(PTRACE_SEIZE, " + pid + "): Operation not permitted" + astuce(io, "Observer un processus qui n'est pas à toi (et même un des tiens, avec la protection ptrace de Debian) demande root : sudo strace -p " + pid), 1);
	if (p.etat === "Z") throw new ShellError("strace: attach: ptrace(PTRACE_SEIZE, " + pid + "): Operation not permitted", 1);
	var appels = p.strace || (p.etat === "R" ? ["read(5, \"\\x7f\\x02\\x00\\x00\"..., 65536) = 65536", "write(6, \"..\"..., 65536) = 65536", "read(5, \"\\x01\\x00\\x00\\x00\"..., 65536) = 65536", "write(6, \"..\"..., 65536) = 65536"] :
		(p.etat === "T" ? ["--- stopped by SIGSTOP ---"] : ["epoll_wait(4, [], 64, 1000)             = 0", "epoll_wait(4, [], 64, 1000)             = 0"]));
	if (filtre){ var f2 = filtre.replace(/^trace=/, "").split(","); appels = appels.filter(function(l){ return f2.some(function(x){ return l.indexOf(x === "network" ? "connect" : (x === "file" ? "open" : x)) === 0 || x === "network" && /^(socket|connect|recv|send|poll)/.test(l); }); }); }
	var d = dateMachine(h), t0 = deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds());
	var lignes = ["strace: Process " + pid + " attached"].concat(appels.map(function(l){ return (horodate ? t0 + ".4" + String(100000 + (l.length * 137) % 99999).substring(1) + " " : "") + l; }));
	if (compter) lignes = ["strace: Process " + pid + " attached", "^Cstrace: Process " + pid + " detached", "% time     seconds  usecs/call     calls    errors syscall", "------ ----------- ----------- --------- --------- ----------------",
		" 98.12    0.000000           0         1           " + String(appels[0] || "epoll_wait").split("(")[0], "------ ----------- ----------- --------- --------- ----------------", "100.00    0.000000                     1           total"];
	else lignes.push("^Cstrace: Process " + pid + " detached");
	GameEvents.fire({ type: "machine", hote: h, cmd: "strace", pid: pid, comm: p.comm, appels: appels.slice() });
	var texte = lignes.join("\n");
	if (sortieFichier){
		moteurSeul(function(){ var r2 = Shell.chercher(sortieFichier, io, "strace"); if (r2.dir){ var it = r2.node instanceof Item ? r2.node : new Item(r2.name, "", "item_sign.gif"); it.setText(texte); it.owner = io.sudo ? "root" : JOUEUR; if (!(r2.node instanceof Item)) r2.dir.addItem(it); } });
		return "strace: Process " + pid + " attached\n^Cstrace: Process " + pid + " detached";
	}
	return texte + astuce(io, "strace montre les appels système, un par ligne, au fil de l'eau. Un appel sans « = résultat » est un appel qui attend encore : c'est là que le processus est bloqué. Ici, le jeu appuie pour toi sur Ctrl-C pour détacher strace.");
};

/* ================================================================== */
/* free, vmstat, uptime, nproc, iostat, sar                             */
/* ================================================================== */

Shell.sorts.free = function(args, io){
	var h = machineIci();
	var hum = args.some(function(a){ return /^-\w*h/.test(a) || a === "--human"; }), mega = args.indexOf("-m") > -1 || args.indexOf("--mega") > -1, giga = args.indexOf("-g") > -1, total = args.indexOf("-t") > -1 || args.indexOf("--total") > -1, large = args.indexOf("-w") > -1;
	var m = h ? memoireMachine(h) : { total: 4028500, utilise: 812300, libre: 2100400, cache: 1115800, dispo: 2950100, partage: 12304, tampons: 90000, swapTotal: 2097148, swapUtilise: 0 };
	var f = hum ? humainFree : (mega ? function(k){ return String(Math.floor(k / 1024)); } : (giga ? function(k){ return String(Math.floor(k / 1048576)); } : String));
	var w = function(t){ return completerGauche(t, 12); };
	var lignes = ["               total        used        free      shared  buff/cache   available",
		"Mem:    " + [m.total, m.utilise, m.libre, m.partage, m.cache, m.dispo].map(function(x){ return w(f(x)); }).join("").substring(1),
		"Swap:   " + [m.swapTotal, m.swapUtilise, m.swapTotal - m.swapUtilise].map(function(x){ return w(f(x)); }).join("").substring(1)];
	if (total) lignes.push("Total:  " + [m.total + m.swapTotal, m.utilise + m.swapUtilise, m.libre + m.swapTotal - m.swapUtilise].map(function(x){ return w(f(x)); }).join("").substring(1));
	void large;
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "free", humain: hum, dispo: m.dispo, swap: m.swapTotal });
	return lignes.join("\n") + (h && io.tty && m.dispo < m.total * 0.1 ? astuce(io, "Lis la colonne available, pas free : c'est ce que les programmes peuvent encore obtenir (la mémoire libre plus le cache qu'on peut vider). Ici, presque rien.") : "");
};
Shell.sorts.vmstat = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("vmstat: command not found", 127);
	var nombres = args.filter(function(a){ return /^\d+$/.test(a); }).map(Number), largeur = args.indexOf("-w") > -1, unite = args.indexOf("-S") > -1 ? args[args.indexOf("-S") + 1] : "K";
	if (args.indexOf("-s") > -1){
		var m0 = memoireMachine(h);
		return [[m0.total, "K total memory"], [m0.utilise, "K used memory"], [m0.dispo, "K active memory"], [m0.libre, "K free memory"], [m0.tampons, "K buffer memory"], [m0.cache, "K swap cache"], [m0.swapTotal, "K total swap"], [m0.swapUtilise, "K used swap"], [m0.swapTotal - m0.swapUtilise, "K free swap"]]
			.map(function(x){ return completerGauche(x[0], 13) + " " + x[1]; }).join("\n");
	}
	var n = nombres.length > 1 ? Math.min(nombres[1], 10) : (nombres.length ? 3 : 1);
	var lignes = ["procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----", " r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st"];
	var M = etatMachine(h);
	for (var i = 0; i < n; i++){
		var m = memoireMachine(h), r = releveMachine(h, maintenantMachine(h)), echange = m.swapTotal > 0;
		var pression = m.besoin > m.total * 0.9;
		var si = echange && pression ? 120 + (i * 37) % 90 : 0, so = echange && pression ? 340 + (i * 53) % 150 : 0;
		var bi = pression ? 18000 + (i * 911) % 4000 : 210 + i * 13, bo = 2400 + (M.ioEcritures || 0) + (i * 77) % 300;
		var dv = function(k){ return unite === "M" ? Math.floor(k / 1024) : k; };
		lignes.push([completerGauche(r.runq, 2), completerGauche(r.bloques, 2), completerGauche(dv(m.swapUtilise), 6), completerGauche(dv(m.libre), 6), completerGauche(dv(m.tampons), 6), completerGauche(dv(m.cache), 6),
			completerGauche(si, 4), completerGauche(so, 4), completerGauche(bi, 5), completerGauche(bo, 5), completerGauche(1800 + i * 23, 4), completerGauche(3100 + i * 41, 4),
			completerGauche(Math.round(r.user + r.nice), 2), completerGauche(Math.round(r.sys), 2), completerGauche(Math.round(r.idle), 2), completerGauche(Math.round(r.iowait), 2), completerGauche(0, 2)].join(" "));
	}
	void largeur;
	GameEvents.fire({ type: "machine", hote: h, cmd: "vmstat", releves: n });
	return lignes.join("\n") + astuce(io, "La première ligne est la moyenne depuis le démarrage ; les suivantes, une par intervalle. si et so : la mémoire échangée avec le disque (swap in, swap out) ; wa : le temps perdu à attendre le disque ; r et b : les processus qui tournent et ceux qui attendent.");
};
var UPTIME_AVANT_MACHINES = Shell.sorts.uptime;
Shell.sorts.uptime = function(args, io){
	var h = machineIci();
	if (!h) return UPTIME_AVANT_MACHINES.apply(this, arguments);
	var M = etatMachine(h), d = dateMachine(h);
	GameEvents.fire({ type: "machine", hote: h, cmd: "uptime", charge: chargeMachine(h).slice() });
	if (args.indexOf("-p") > -1 || args.indexOf("--pretty") > -1){
		var s = Math.floor((maintenantMachine(h) - (M.demarrage || 0)) / 1000), sem = Math.floor(s / 604800), j = Math.floor(s % 604800 / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60);
		return "up " + [sem ? sem + " week" + (sem > 1 ? "s" : "") : "", j ? j + " day" + (j > 1 ? "s" : "") : "", hh ? hh + " hour" + (hh > 1 ? "s" : "") : "", mm + " minute" + (mm > 1 ? "s" : "")].filter(Boolean).join(", ");
	}
	if (args.indexOf("-s") > -1 || args.indexOf("--since") > -1){ var b = dateMachine(h, M.demarrage); return b.getFullYear() + "-" + deuxChiffres(b.getMonth() + 1) + "-" + deuxChiffres(b.getDate()) + " " + deuxChiffres(b.getHours()) + ":" + deuxChiffres(b.getMinutes()) + ":" + deuxChiffres(b.getSeconds()); }
	return " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " up " + texteUptimeCourt(h) + ",  " + utilisateursConnectes(h) + " user" + (utilisateursConnectes(h) > 1 ? "s" : "") + ",  load average: " + texteCharge(chargeMachine(h)) +
		(io.tty && chargeMachine(h)[0] > nprocMachine(h) ? astuce(io, "La charge, c'est le nombre moyen de processus qui veulent le processeur (ou attendent le disque) sur 1, 5 et 15 minutes. Au-dessus du nombre de cœurs (nproc), la machine fait la queue.") : "");
};
Shell.sorts.nproc = function(args, io){
	var h = machineIci();
	var n = h ? nprocMachine(h) : 2;
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "nproc", n: n });
	if (args.indexOf("--all") > -1) return String(n);
	return String(n);
};
function enteteSysstat(h){
	var d = dateMachine(h);
	return "Linux " + (typeof versionNoyau === "function" ? versionNoyau(h) : "6.1.0-28-amd64") + " (" + h + ") \t" + deuxChiffres(d.getMonth() + 1) + "/" + deuxChiffres(d.getDate()) + "/" + d.getFullYear() + " \t_x86_64_\t(" + nprocMachine(h) + " CPU)";
}
function utilDisques(h){
	var M = etatMachine(h);
	return (M.disques || []).filter(function(d){ return !d.absent; }).map(function(d){
		var u = (M.io && M.io[d.nom]) || { util: 3, r: 2, w: 8 };
		if (typeof u === "function") u = u();
		return { nom: d.nom, util: Math.min(100, u.util), r: u.r, w: u.w, rkb: u.r * 31, wkb: u.w * 52, attente: u.attente || (u.util > 80 ? 48.2 : 1.3) };
	});
}
Shell.sorts.iostat = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("iostat: command not found", 127);
	var etendu = args.some(function(a){ return /^-\w*x/.test(a); }), nombres = args.filter(function(a){ return /^\d+$/.test(a); }).map(Number);
	var n = nombres.length > 1 ? Math.min(3, nombres[1]) : 1;
	var blocs = [enteteSysstat(h), ""];
	for (var i = 0; i < n; i++){
		var r = releveMachine(h, maintenantMachine(h));
		blocs.push("avg-cpu:  %user   %nice %system %iowait  %steal   %idle", "          " + [r.user, r.nice, r.sys, r.iowait, 0, r.idle].map(function(x){ return completerGauche(x.toFixed(2), 6); }).join("  "), "");
		if (etendu){
			blocs.push("Device            r/s     rkB/s   rrqm/s  %rrqm r_await rareq-sz     w/s     wkB/s   wrqm/s  %wrqm w_await wareq-sz     d/s     dkB/s   drqm/s  %drqm d_await dareq-sz     f/s f_await  aqu-sz  %util");
			utilDisques(h).forEach(function(d){
				blocs.push(completerDroite(d.nom, 12) + [d.r.toFixed(2), d.rkb.toFixed(2), "0.00", "0.00", (d.attente / 3).toFixed(2), "31.00", d.w.toFixed(2), d.wkb.toFixed(2), (d.w * 0.4).toFixed(2), "28.57", d.attente.toFixed(2), "52.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.00", "0.30", "0.42", (d.util / 30).toFixed(2), d.util.toFixed(2)]
					.map(function(x, k){ return completerGauche(x, [6, 9, 8, 6, 7, 8, 7, 9, 8, 6, 7, 8, 7, 9, 8, 6, 7, 8, 7, 7, 7, 6][k]); }).join(" "));
			});
		} else {
			blocs.push("Device             tps    kB_read/s    kB_wrtn/s    kB_dscd/s    kB_read    kB_wrtn    kB_dscd");
			utilDisques(h).forEach(function(d){ blocs.push(completerDroite(d.nom, 12) + completerGauche((d.r + d.w).toFixed(2), 10) + completerGauche(d.rkb.toFixed(2), 13) + completerGauche(d.wkb.toFixed(2), 13) + "         0.00   " + completerGauche(Math.round(d.rkb * 3600), 8) + "   " + completerGauche(Math.round(d.wkb * 3600), 8) + "          0"); });
		}
		blocs.push("");
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "iostat", etendu: etendu, util: utilDisques(h).map(function(d){ return [d.nom, d.util]; }) });
	return blocs.join("\n").replace(/\n+$/, "") + (etendu ? astuce(io, "%util : la part du temps où le disque a été occupé. À 100 %, il ne suit plus ; w_await : combien de millisecondes attend chaque écriture. Le premier relevé est la moyenne depuis le démarrage.") : "");
};
Shell.sorts.sar = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("sar: command not found" + astuce(io, "sar (paquet sysstat) tient l'historique d'une machine d'exploitation."), 127);
	var M = etatMachine(h), mode = "u";
	args.forEach(function(a){ if (/^-[urqbBdW]$/.test(a)) mode = a.charAt(1); if (a === "-A") mode = "A"; });
	var nombres = args.filter(function(a){ return /^\d+$/.test(a); }).map(Number);
	var releves;
	if (nombres.length){ var n = Math.min(nombres[1] || 1, 5); releves = []; for (var i = 0; i < n; i++) releves.push(releveMachine(h, maintenantMachine(h) + i * 1000)); }
	else releves = (M.sar || []).slice(-60);
	var heure = function(t){ var d = dateMachine(h, t); return deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); };
	var f2 = function(x, l){ return completerGauche((+x).toFixed(2), l || 9); };
	var lignes = [enteteSysstat(h), ""];
	var moy = function(cle){ return releves.reduce(function(s, r){ return s + r[cle]; }, 0) / Math.max(1, releves.length); };
	if (mode === "u" || mode === "A"){
		lignes.push(heure(releves.length ? releves[0].t : maintenantMachine(h)) + "     CPU     %user     %nice   %system   %iowait    %steal     %idle");
		releves.forEach(function(r){ lignes.push(heure(r.t) + "     all" + f2(r.user, 10) + f2(r.nice, 10) + f2(r.sys, 10) + f2(r.iowait, 10) + f2(0, 10) + f2(r.idle, 10)); });
		lignes.push("Average:        all" + f2(moy("user"), 10) + f2(moy("nice"), 10) + f2(moy("sys"), 10) + f2(moy("iowait"), 10) + f2(0, 10) + f2(moy("idle"), 10));
	}
	if (mode === "r" || mode === "A"){
		if (mode === "A") lignes.push("");
		lignes.push(heure(releves.length ? releves[0].t : maintenantMachine(h)) + " kbmemfree   kbavail kbmemused  %memused kbbuffers  kbcached  kbcommit   %commit  kbactive   kbinact   kbdirty");
		var tot = memoireMachine(h).total;
		releves.forEach(function(r){ lignes.push(heure(r.t) + " " + [r.memLibre, r.memDispo, r.memUtilise].map(function(x){ return completerGauche(Math.round(x), 9); }).join(" ") + f2(r.memPct, 10) + " " + completerGauche(Math.round(r.tampons), 9) + " " + completerGauche(Math.round(r.cache), 9) + " " + completerGauche(Math.round(r.engage), 9) + f2(r.engage / tot * 100, 10) + " " + completerGauche(Math.round(r.memUtilise * 0.7), 9) + " " + completerGauche(Math.round(r.memUtilise * 0.2), 9) + " " + completerGauche(812, 9)); });
		lignes.push("Average:  " + [moy("memLibre"), moy("memDispo"), moy("memUtilise")].map(function(x){ return completerGauche(Math.round(x), 9); }).join(" ") + f2(moy("memPct"), 10));
	}
	if (mode === "q" || mode === "A"){
		if (mode === "A") lignes.push("");
		lignes.push(heure(releves.length ? releves[0].t : maintenantMachine(h)) + "   runq-sz  plist-sz   ldavg-1   ldavg-5  ldavg-15   blocked");
		releves.forEach(function(r){ lignes.push(heure(r.t) + " " + completerGauche(r.runq, 9) + " " + completerGauche(r.plist, 9) + f2(r.l1, 10) + f2(r.l5, 10) + f2(r.l15, 10) + " " + completerGauche(r.bloques, 9)); });
		lignes.push("Average:  " + completerGauche(Math.round(moy("runq")), 9) + " " + completerGauche(Math.round(moy("plist")), 9) + f2(moy("l1"), 10) + f2(moy("l5"), 10) + f2(moy("l15"), 10) + " " + completerGauche(Math.round(moy("bloques")), 9));
	}
	if (mode === "b" || mode === "d" || mode === "B" || mode === "W"){
		lignes.push(heure(maintenantMachine(h)) + "       tps      rtps      wtps      dtps   bread/s   bwrtn/s   bdscd/s");
		utilDisques(h).slice(0, 1).forEach(function(d){ lignes.push(heure(maintenantMachine(h)) + f2(d.r + d.w, 10) + f2(d.r, 10) + f2(d.w, 10) + f2(0, 10) + f2(d.rkb * 2, 10) + f2(d.wkb * 2, 10) + f2(0, 10)); });
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "sar", mode: mode, historique: !nombres.length });
	return lignes.join("\n");
};

/* ss -s : le résumé des connexions ; le reste reste au moteur du Bastion. */
var SS_AVANT_MACHINES = Shell.sorts.ss;
Shell.sorts.ss = function(args, io){
	var h = machineIci();
	if (!h || !args.some(function(a){ return a === "-s" || a === "--summary"; })) return SS_AVANT_MACHINES.apply(this, arguments);
	var M = etatMachine(h), s = M.sockets || { estab: 42, closed: 3, orphaned: 0, timewait: 118 };
	if (typeof s === "function") s = s();
	GameEvents.fire({ type: "machine", hote: h, cmd: "ss", resume: true, estab: s.estab });
	return "Total: " + (s.estab + s.timewait + 190) + "\nTCP:   " + (s.estab + s.timewait + 9) + " (estab " + s.estab + ", closed " + s.closed + ", orphaned " + s.orphaned + ", timewait " + s.timewait + ")\n\n" +
		"Transport Total     IP        IPv6\nRAW\t  1         0         1        \nUDP\t  6         4         2        \nTCP\t  " + completerDroite(s.estab + 9, 10) + completerDroite(s.estab + 6, 10) + "3        \nINET\t  " + completerDroite(s.estab + 16, 10) + completerDroite(s.estab + 10, 10) + "6        \nFRAG\t  0         0         0        ";
};

/* ================================================================== */
/* ulimit                                                               */
/* ================================================================== */

var LIMITES_SESSION = { n: 1024, Hn: 1048576, u: 31409, s: 8192, c: 0, v: "unlimited", f: "unlimited", l: 8192 };
Shell.sorts.ulimit = function(args, io){
	var dur = args.indexOf("-H") > -1, valeur = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var lettre = (args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a) && a !== "-H" && a !== "-S"; })[0] || "-f").replace(/^-/, "").replace(/[HS]/g, "");
	if (lettre === "a"){
		return ["real-time non-blocking time  (microseconds, -R) unlimited", "core file size              (blocks, -c) 0", "data seg size               (kbytes, -d) unlimited", "scheduling priority                 (-e) 0",
			"file size                   (blocks, -f) unlimited", "pending signals                     (-i) 31409", "max locked memory           (kbytes, -l) 8192", "max memory size             (kbytes, -m) unlimited",
			"open files                          (-n) " + LIMITES_SESSION.n, "pipe size                (512 bytes, -p) 8", "POSIX message queues         (bytes, -q) 819200", "real-time priority                  (-r) 0",
			"stack size                  (kbytes, -s) 8192", "cpu time                   (seconds, -t) unlimited", "max user processes                  (-u) 31409", "virtual memory              (kbytes, -v) unlimited", "file locks                          (-x) unlimited"].join("\n");
	}
	if (lettre === "n" && valeur !== undefined){
		var v = valeur === "unlimited" ? Infinity : parseInt(valeur, 10);
		if (isNaN(v)) throw new ShellError("bash: ulimit: " + valeur + ": invalid number", 1);
		if (v > LIMITES_SESSION.Hn && !io.sudo) throw new ShellError("bash: ulimit: open files: cannot modify limit: Operation not permitted" + astuce(io, "La limite souple monte jusqu'à la limite dure (ulimit -Hn), pas au-delà. Pour un service, c'est LimitNOFILE= dans son unité systemd."), 1);
		if (dur) LIMITES_SESSION.Hn = v; else LIMITES_SESSION.n = v;
		GameEvents.fire({ type: "machine", hote: machineIci(), cmd: "ulimit", action: "set", valeur: v });
		return "";
	}
	GameEvents.fire({ type: "machine", hote: machineIci(), cmd: "ulimit", action: "lire", lettre: lettre, dur: dur });
	if (lettre === "n") return String(dur ? LIMITES_SESSION.Hn : LIMITES_SESSION.n);
	return String(LIMITES_SESSION[lettre] !== undefined ? LIMITES_SESSION[lettre] : "unlimited");
};

/* ================================================================== */
/* /proc : les dossiers des processus, fabriqués au moment où on les lit */
/* ================================================================== */

function texteLimitesProc(h, p){
	var n = p.limiteNofile || 1024;
	return ["Limit                     Soft Limit           Hard Limit           Units     ", "Max cpu time              unlimited            unlimited            seconds   ", "Max file size             unlimited            unlimited            bytes     ",
		"Max data size             unlimited            unlimited            bytes     ", "Max stack size            8388608              unlimited            bytes     ", "Max core file size        0                    unlimited            bytes     ",
		"Max resident set          unlimited            unlimited            bytes     ", "Max processes             31409                31409                processes ",
		"Max open files            " + completerDroite(n, 21) + completerDroite(p.limiteNofileDure || Math.max(n, 524288), 21) + "files     ", "Max locked memory         8388608              8388608              bytes     ",
		"Max address space         unlimited            unlimited            bytes     ", "Max file locks            unlimited            unlimited            locks     ", "Max pending signals       31409                31409                signals   ",
		"Max msgqueue size         819200               819200               bytes     ", "Max nice priority         0                    0                    ", "Max realtime priority     0                    0                    ",
		"Max realtime timeout      unlimited            unlimited            us        "].join("\n");
}
function texteStatusProc(h, p){
	var etats = { R: "R (running)", S: "S (sleeping)", D: "D (disk sleep)", Z: "Z (zombie)", T: "T (stopped)", I: "I (idle)" };
	return ["Name:\t" + p.comm, "Umask:\t0022", "State:\t" + (etats[p.etat] || "S (sleeping)"), "Tgid:\t" + p.pid, "Ngid:\t0", "Pid:\t" + p.pid, "PPid:\t" + p.ppid, "TracerPid:\t0",
		"Uid:\t" + [uidMachine(h, p.user), uidMachine(h, p.user), uidMachine(h, p.user), uidMachine(h, p.user)].join("\t"), "Gid:\t" + [uidMachine(h, p.user), uidMachine(h, p.user), uidMachine(h, p.user), uidMachine(h, p.user)].join("\t"),
		"FDSize:\t" + Math.max(64, Math.pow(2, Math.ceil(Math.log(Math.max(2, p.nofile || 8)) / Math.LN2))), "Groups:\t", "VmPeak:\t" + completerGauche(p.vsz + 1024, 8) + " kB", "VmSize:\t" + completerGauche(p.etat === "Z" ? 0 : p.vsz, 8) + " kB",
		"VmLck:\t       0 kB", "VmHWM:\t" + completerGauche(p.rss, 8) + " kB", "VmRSS:\t" + completerGauche(p.etat === "Z" ? 0 : p.rss, 8) + " kB", "RssAnon:\t" + completerGauche(Math.round(p.rss * 0.9), 8) + " kB", "VmSwap:\t       0 kB",
		"Threads:\t" + (p.threads || 1), "SigQ:\t0/31409", "voluntary_ctxt_switches:\t" + (12000 + p.pid % 5000), "nonvoluntary_ctxt_switches:\t" + (300 + p.pid % 400)].join("\n");
}
/* Installer /proc sur une machine : le monde l'appelle après avoir posé le dossier /proc. */
function installerProcMachine(h){
	var proc = dossierHote(h, "/proc");
	if (!proc || proc.procInstalle) return;
	proc.procInstalle = true;
	var getChild = proc.getChildFromName, getNode = proc.getNode;
	function piece(pid){
		var p = procParPid(h, pid);
		if (!p) return null;
		var ancienFige = World.fige;
		World.fige = true;
		var r = new Room(String(pid), "Le dossier du processus " + pid + " (" + p.comm + ") dans /proc : le noyau le fabrique à la volée.", "loc_etc.gif");
		r.owner = p.user; r.mode = "r-xr-xr-x"; r.parents[0] = proc; r.transitoire = true;
		function fichier(nom, texte, mode){
			var it = new Item(nom, texte, "item_sign.gif");
			it.owner = p.user; it.mode = mode || "r--r--r--"; it.taille = 0; it.modifie = false;
			r.items.push(it);
			return it;
		}
		fichier("status", texteStatusProc(h, p));
		fichier("limits", texteLimitesProc(h, p));
		fichier("cmdline", p.etat === "Z" ? "" : String(p.cmd).split(/\s+/).join("\u0000"));
		fichier("comm", p.comm);
		fichier("oom_score", String(Math.max(0, Math.round(p.rss / memoireMachine(h).total * 1000) + (p.oomAdj || 0))));
		var adj = fichier("oom_score_adj", String(p.oomAdj || 0), "rw-r--r--");
		adj.setText = function(t){
			var v = parseInt(String(t).trim(), 10);
			if (isNaN(v) || v < -1000 || v > 1000) throw new ShellError("bash: echo: write error: Invalid argument");
			p.oomAdj = v;
			this.cmd_text.less = String(v);
			GameEvents.fire({ type: "machine", hote: h, cmd: "oom_score_adj", pid: p.pid, comm: p.comm, valeur: v });
		};
		fichier("environ", "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin\u0000LANG=C.UTF-8", "r--------");
		fichier("io", "rchar: " + (p.pid * 4211) + "\nwchar: " + (p.pid * 911) + "\nread_bytes: " + (p.pid * 4096) + "\nwrite_bytes: " + (p.pid * 1024) + "\n");
		var fd = new Room("fd", "Les descripteurs de fichiers ouverts du processus " + pid + ".", "loc_etc.gif");
		fd.owner = p.user; fd.mode = "r-x------"; fd.parents[0] = r; fd.transitoire = true;
		fd.fournisseurVirtuel = function(){
			var l = [{ nom: "0", lien: "/dev/null" }, { nom: "1", lien: "socket:[" + (40000 + p.pid) + "]" }, { nom: "2", lien: "socket:[" + (40001 + p.pid) + "]" }];
			(p.fichiers || []).forEach(function(f, i){ l.push({ nom: String(parseInt(f.fd, 10) || 3 + i), lien: f.chemin + (f.supprime ? " (deleted)" : "") }); });
			var total = p.nofile || l.length;
			for (var k = l.length; k < total; k++) l.push({ nom: String(k), lien: "socket:[" + (50000 + p.pid * 3 + k) + "]" });
			return l.map(function(x){ x.owner = p.user; x.mode = "rwx------"; x.taille = 64; x.ageMin = 3; return x; });
		};
		r.children.push(fd);
		World.fige = ancienFige;
		return r;
	}
	proc.getChildFromName = function(nom){ if (/^\d+$/.test(nom)){ var r = piece(+nom); if (r) return r; } return getChild.apply(this, arguments); };
	proc.getNode = function(nom){ if (/^\d+$/.test(nom)){ var r = piece(+nom); if (r) return r; } return getNode.apply(this, arguments); };
}
/* Les textes vivants de /proc (meminfo, mdstat, loadavg, swaps, uptime, cpuinfo) : le monde les pose, ceci les remplit. */
function texteProcMachine(h, nom){
	var m = memoireMachine(h), M = etatMachine(h);
	switch (nom){
		case "meminfo": return ["MemTotal:       " + completerGauche(m.total, 8) + " kB", "MemFree:        " + completerGauche(m.libre, 8) + " kB", "MemAvailable:   " + completerGauche(m.dispo, 8) + " kB",
			"Buffers:        " + completerGauche(m.tampons, 8) + " kB", "Cached:         " + completerGauche(m.cache - m.tampons, 8) + " kB", "SwapCached:     " + completerGauche(Math.round(m.swapUtilise * 0.05), 8) + " kB",
			"Active:         " + completerGauche(Math.round(m.utilise * 0.7), 8) + " kB", "Inactive:       " + completerGauche(Math.round(m.utilise * 0.2), 8) + " kB", "SwapTotal:      " + completerGauche(m.swapTotal, 8) + " kB",
			"SwapFree:       " + completerGauche(m.swapTotal - m.swapUtilise, 8) + " kB", "Dirty:          " + completerGauche(812, 8) + " kB", "AnonPages:      " + completerGauche(Math.round(m.besoin * 0.85), 8) + " kB",
			"Shmem:          " + completerGauche(m.partage, 8) + " kB", "Slab:           " + completerGauche(Math.round((M.memoire || {}).noyau * 0.6 || 200000), 8) + " kB", "CommitLimit:    " + completerGauche(Math.round(m.total / 2 + m.swapTotal), 8) + " kB",
			"Committed_AS:   " + completerGauche(m.besoin + 900000, 8) + " kB", "HugePages_Total:       0", "Hugepagesize:       2048 kB"].join("\n");
		case "mdstat": return texteMdstat(h);
		case "loadavg": var c = chargeMachine(h); return c.map(function(x){ return x.toFixed(2); }).join(" ") + " " + procsMachine(h).filter(function(p){ return p.etat === "R"; }).length + "/" + (procsMachine(h).length + 118) + " " + (M.prochainPid || 5000);
		case "swaps": return "Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority\n" + (M.swaps || []).map(function(s){ return completerDroite(s.chemin, 40) + completerDroite(s.type, 16) + completerDroite(s.taille, 16) + completerDroite(s.utilise, 16) + s.prio; }).join("\n");
		case "uptime": var s = (maintenantMachine(h) - (M.demarrage || 0)) / 1000; return s.toFixed(2) + " " + (s * nprocMachine(h) * 0.6).toFixed(2);
		case "cpuinfo": var l = []; for (var i = 0; i < nprocMachine(h); i++) l.push("processor\t: " + i + "\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Xeon(R) CPU E-2224 @ 3.40GHz\ncpu MHz\t\t: 3400.000\ncache size\t: 8192 KB\ncpu cores\t: " + nprocMachine(h) + "\n"); return l.join("\n");
		case "mounts": return fsMontes(h).map(function(f){ return f.source + " " + f.cible + " " + f.type + " " + texteOptionsMontage(f) + " 0 0"; }).join("\n");
		case "version": return "Linux version " + (typeof versionNoyau === "function" ? versionNoyau(h) : "6.1.0") + " (debian-kernel@lists.debian.org) (gcc-12 (Debian 12.2.0-14) 12.2.0, GNU ld (GNU Binutils for Debian) 2.40) #1 SMP PREEMPT_DYNAMIC Debian 6.1.115-1 (2024-11-01)";
	}
	return "";
}

/* ================================================================== */
/* Le travail dans la durée : &, jobs, bg, fg, Ctrl-Z, disown, nohup     */
/* ================================================================== */

/*
 * Un « programme long » est une commande que la machine connaît comme durable (M.programmesLongs[nom] = gabarit de
 * processus, ou sleep N, tail -f, watch) : au premier plan, il prend le terminal ; Ctrl-Z le suspend (le jeu propose
 * Shell.suspendre) ; & le lance en tâche de fond ; jobs, bg, fg, disown, kill %N s'en occupent.
 */
function programmeLong(h, argv){
	var M = etatMachine(h), nom = String(argv[0] || "").split("/").pop();
	if (M.programmesLongs && M.programmesLongs[nom]){
		var t = copieJson(M.programmesLongs[nom]);
		t.cmd = argv.join(" ");
		return t;
	}
	if (nom === "sleep" && /^\d+$/.test(argv[1] || "") && +argv[1] >= 30) return { comm: "sleep", cmd: argv.join(" "), cpu: 0, rss: 1024, etat: "S", tache: { nom: "sleep", total: Math.ceil(+argv[1] / 120), pas: 1 } };
	return null;
}
function jobsMachine(h){ var M = etatMachine(h); M.jobs = (M.jobs || []).filter(function(j){ return !j.disparu; }); return M.jobs; }
function trouverJob(h, spec){
	var jobs = jobsMachine(h).filter(function(j){ return !j.fini && procParPid(h, j.pid); });
	if (!jobs.length) return null;
	if (!spec || spec === "%" || spec === "%%" || spec === "%+") return jobs[jobs.length - 1];
	if (spec === "%-") return jobs[jobs.length - 2] || null;
	var m = /^%(\d+)$/.exec(spec);
	if (m) return jobs.filter(function(j){ return j.n === +m[1]; })[0] || null;
	var nom = spec.replace(/^%\??/, "");
	return jobs.filter(function(j){ return j.cmd.indexOf(nom) > -1; })[0] || null;
}
function nouveauJob(h, p, cmd){
	var jobs = jobsMachine(h);
	var n = 1;
	while (jobs.some(function(j){ return j.n === n && !j.fini; })) n++;
	var j = { n: n, pid: p.pid, cmd: cmd };
	jobs.push(j);
	p.job = n;
	return j;
}
/* Lancer un programme long : au premier plan (il prend le terminal), ou en tâche de fond (&). */
function lancerLongMachine(h, argv, fond, io){
	var t = programmeLong(h, argv);
	if (!t) return null;
	var M = etatMachine(h);
	t.user = io.sudo ? "root" : JOUEUR;
	t.ppid = M.pidBash || PID_BASH;
	t.tty = "pts/0";
	t.session = M.sessionSsh || 1;
	t.cwd = cheminDuLieuMachine(current_room);
	if (M.tmuxIci){ t.tmux = M.tmuxIci; t.tty = "pts/" + (2 + Object.keys(M.tmux || {}).indexOf(M.tmuxIci)); t.ppid = (M.tmux[M.tmuxIci] || {}).pidShell || t.ppid; }
	if (io.nohup) t.nohup = true;
	var p = lancerProcessusMachine(h, t);
	GameEvents.fire({ type: "machine", hote: h, cmd: "long", action: fond ? "fond" : "premierPlan", nom: p.comm, pid: p.pid, tmux: p.tmux || null, nohup: !!p.nohup });
	if (M.tmuxIci && !fond){
		M.tmux[M.tmuxIci].occupe = p.pid;
		return { sortie: (p.annonce || "") + astuce(io, "Le programme tourne dans la session tmux « " + M.tmuxIci + " ». Pour la quitter sans l'arrêter : tmux detach (ou Ctrl-b puis d)."), proc: p };
	}
	var j = nouveauJob(h, p, argv.join(" "));
	if (fond){
		io.err("[" + j.n + "] " + p.pid);
		return { sortie: p.annonceFond || "", proc: p };
	}
	p.premierPlan = true;
	M.premierPlan = p.pid;
	return { sortie: (p.annonce || "") + astuce(io, p.comm + " tourne au premier plan : il occupe ton terminal. Ctrl-Z le suspend (puis bg le relance en tâche de fond), Ctrl-C l'arrête."), proc: p };
}
/* Ctrl-Z : le programme au premier plan est suspendu (SIGTSTP). */
Shell.suspendre = function(){
	var h = machineIci();
	if (!h) return false;
	var M = etatMachine(h), p = M.premierPlan ? procParPid(h, M.premierPlan) : null;
	if (!p) return false;
	p.premierPlan = false;
	M.premierPlan = null;
	tuerProcessusMachine(h, p, 20, "ctrl-z");
	var j = jobsMachine(h).filter(function(x){ return x.pid === p.pid; })[0];
	term.echo("^Z\n[" + (j ? j.n : 1) + "]+  Stopped                 " + (j ? j.cmd : p.cmd));
	GameEvents.fire({ type: "machine", hote: h, cmd: "ctrl-z", pid: p.pid, comm: p.comm });
	if (typeof Shell.fin === "function") Shell.fin();
	return true;
};
/* Ctrl-C sur un programme au premier plan : SIGINT. */
var INTERROMPRE_AVANT_MACHINES = Shell.interrompre;
Shell.interrompre = function(){
	var h = machineIci();
	if (h){
		var M = etatMachine(h), p = M.premierPlan ? procParPid(h, M.premierPlan) : null;
		if (p){ M.premierPlan = null; tuerProcessusMachine(h, p, 2, "ctrl-c"); GameEvents.fire({ type: "machine", hote: h, cmd: "ctrl-c", pid: p.pid, comm: p.comm }); if (typeof Shell.fin === "function") Shell.fin(); return; }
	}
	return INTERROMPRE_AVANT_MACHINES.apply(this, arguments);
};
/* Tant qu'un programme tient le terminal, les commandes attendent. */
var EXECUTER_AVANT_MACHINES = Shell.executer;
Shell.executer = function(ligne){
	var h = machineIci();
	if (h && ligne.trim() !== ""){
		var M = etatMachine(h), p = M.premierPlan ? procParPid(h, M.premierPlan) : null;
		if (p){
			term.echo(ligne);
			term.echo(C.gris("(" + p.comm + " occupe encore le terminal : ce que tu tapes lui est destiné, pas au shell. Ctrl-Z le suspend, Ctrl-C l'arrête.)"));
			return;
		}
		if (M.premierPlan) M.premierPlan = null;
	}
	return EXECUTER_AVANT_MACHINES.apply(this, arguments);
};
{
	Interpreteur.lancerEnFond = function(e, auPremierPlan){
		var h = machineIci();
		if (!h || !e.fond) return undefined;
		var n = e.noeud, argv = null;
		try { argv = argvSimple(n); } catch (x){ argv = null; }
		var nohup = false;
		if (argv && argv[0] === "nohup"){ nohup = true; argv = argv.slice(1); }
		var sudo = false;
		if (argv && argv[0] === "sudo"){ sudo = true; argv = argv.slice(1); }
		if (argv && programmeLong(h, argv)){
			var io = { sudo: sudo, tty: true, nohup: nohup, err: function(t){ term.echo(t); } };
			if (nohup) term.echo("nohup: ignoring input and appending output to 'nohup.out'");
			var r = lancerLongMachine(h, argv, true, io);
			if (r && r.sortie) term.echo(r.sortie);
			return 0;
		}
		var code = auPremierPlan();
		var M = etatMachine(h), j = { n: (jobsMachine(h).length + 1), pid: nouveauPid(h), cmd: argv ? argv.join(" ") : "commande" };
		term.echo("[" + j.n + "] " + j.pid);
		term.echo("[" + j.n + "]+  Done                    " + j.cmd);
		void M;
		return code;
	};
}
/* Les mots d'une commande simple (sans tuyau ni redirection), pour reconnaître un programme long lancé avec &. */
function argvSimple(n){
	if (!n) return null;
	if (n.k === "simple"){
		if (n.redirs && n.redirs.length) return null;
		return (n.mots || []).map(function(m){ var l = typeof Interpreteur.litteralDe === "function" ? Interpreteur.litteralDe(m.parts || []) : null; return l !== null ? l : String(m.brut || "").replace(/^['"]|['"]$/g, ""); });
	}
	if (n.k === "tuyau" && n.cmds && n.cmds.length === 1 && !n.neg) return argvSimple(n.cmds[0]);
	if (n.k === "liste" && n.elements && n.elements.length === 1) return argvSimple(n.elements[0].noeud);
	return null;
}
Shell.sorts.jobs = function(args, io){
	var h = machineIci();
	if (!h) return "";
	var l = args.indexOf("-l") > -1, p = args.indexOf("-p") > -1;
	var jobs = jobsMachine(h).filter(function(j){ return !j.annonce; });
	var lignes = [];
	jobs.forEach(function(j, k){
		var proc = procParPid(h, j.pid);
		var etat = !proc ? "Done" : (proc.etat === "T" ? "Stopped" : "Running");
		var marque = k === jobs.length - 1 ? "+" : (k === jobs.length - 2 ? "-" : " ");
		if (p) lignes.push(String(j.pid));
		else lignes.push("[" + j.n + "]" + marque + "  " + (l ? j.pid + " " : "") + completerDroite(etat, 24) + j.cmd + (etat === "Running" ? " &" : ""));
		if (!proc) j.annonce = true;
	});
	etatMachine(h).jobs = jobsMachine(h).filter(function(j){ return !j.annonce; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "jobs", nombre: jobs.length, etats: jobs.map(function(j){ var x = procParPid(h, j.pid); return x ? x.etat : "fini"; }) });
	return lignes.join("\n");
};
Shell.sorts.bg = function(args, io){
	var h = machineIci();
	var j = h ? trouverJob(h, args[0]) : null;
	if (!j) throw new ShellError("bash: bg: " + (args[0] || "current") + ": no such job", 1);
	var p = procParPid(h, j.pid);
	if (p.etat !== "T") throw new ShellError("bash: bg: job " + j.n + " already in background", 1);
	tuerProcessusMachine(h, p, 18, "bg");
	GameEvents.fire({ type: "machine", hote: h, cmd: "bg", pid: p.pid, comm: p.comm });
	return "[" + j.n + "]+ " + j.cmd + " &";
};
Shell.sorts.fg = function(args, io){
	var h = machineIci();
	var j = h ? trouverJob(h, args[0]) : null;
	if (!j) throw new ShellError("bash: fg: " + (args[0] || "current") + ": no such job", 1);
	var p = procParPid(h, j.pid), M = etatMachine(h);
	if (p.etat === "T") tuerProcessusMachine(h, p, 18, "fg");
	p.premierPlan = true;
	M.premierPlan = p.pid;
	GameEvents.fire({ type: "machine", hote: h, cmd: "fg", pid: p.pid, comm: p.comm });
	return j.cmd + (p.annonceFg ? "\n" + p.annonceFg : "") + astuce(io, p.comm + " est revenu au premier plan : il occupe le terminal. Ctrl-Z pour le suspendre de nouveau.");
};
Shell.sorts.disown = function(args, io){
	var h = machineIci();
	var tous = args.indexOf("-a") > -1, garder = args.indexOf("-h") > -1;
	var spec = args.filter(function(a){ return a.charAt(0) === "%" || /^\d+$/.test(a); })[0];
	if (!h) return "";
	var cibles = tous ? jobsMachine(h).slice() : [trouverJob(h, spec)].filter(Boolean);
	if (!cibles.length) throw new ShellError("bash: disown: " + (spec || "current") + ": no such job", 1);
	cibles.forEach(function(j){
		var p = procParPid(h, j.pid);
		if (p){ p.disown = true; p.nohup = true; delete p.job; }
		if (!garder) j.disparu = true;
		GameEvents.fire({ type: "machine", hote: h, cmd: "disown", pid: j.pid, comm: p ? p.comm : "", etat: p ? p.etat : null });
	});
	return "";
};
Shell.sorts.nohup = function(args, io){
	var h = machineIci();
	if (!args.length) throw new ShellError("nohup: missing operand\nTry 'nohup --help' for more information.", 125);
	if (h && programmeLong(h, args)){
		io.nohup = true;
		var r = lancerLongMachine(h, args, false, io);
		return "nohup: ignoring input and appending output to 'nohup.out'\n" + (r ? r.sortie : "");
	}
	var r2 = Shell.lancerSousCommande(args, io, "nohup");
	return "nohup: ignoring input and appending output to 'nohup.out'" + (r2.sortie ? "\n" + r2.sortie : "");
};
/* Une commande qui est un programme long, tapée au premier plan : elle prend le terminal. */
var APPELER_LONG_AVANT_MACHINES = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var h = machineIci();
	if (h && programmeLong(h, [nom].concat(args || [])) && (nom.indexOf("/") > -1 || (Shell.sorts.hasOwnProperty(nom) === false && etatMachine(h).programmesLongs && etatMachine(h).programmesLongs[nom.split("/").pop()]))){
		var t = etatMachine(h).programmesLongs && etatMachine(h).programmesLongs[nom.split("/").pop()];
		if (t && t.chemin){ var f = fichierHote(h, t.chemin); if (!f) return APPELER_LONG_AVANT_MACHINES.apply(this, arguments); if (!io.sudo && !Shell.bit(f, "x", io)) throw new ShellError("bash: " + nom + ": Permission denied", 126); }
		var r = lancerLongMachine(h, [nom].concat(args || []), false, io);
		return r.sortie;
	}
	return APPELER_LONG_AVANT_MACHINES.apply(this, arguments);
};
/* Fermer sa connexion : les processus de la session reçoivent SIGHUP, sauf ceux qu'on a protégés (nohup, disown, tmux). */
var EXIT_AVANT_MACHINES = Shell.sorts.exit;
Shell.sorts.exit = function(args, io){
	var h = machineIci();
	if (h && Shell.pile_ssh.length){
		var M = etatMachine(h);
		if (M.tmuxIci){
			var s = M.tmuxIci;
			M.tmuxIci = null;
			GameEvents.fire({ type: "machine", hote: h, cmd: "tmux", action: "quitte", session: s });
			return "[exited]" + astuce(io, "Tu as quitté le shell de la session tmux « " + s + " » : la session est fermée. Pour la laisser tourner, c'est tmux detach.");
		}
		var tues = [];
		procsMachine(h).slice().forEach(function(p){
			if (p.session && p.session === M.sessionSsh && !p.nohup && !p.disown && !p.tmux && p.etat !== "Z"){
				tues.push(p.comm);
				journalMachine(h, { unite: p.comm, pid: p.pid, prio: 4, message: "received SIGHUP (terminal closed), exiting" });
				tuerProcessusMachine(h, p, 1, "exit");
			}
		});
		M.premierPlan = null;
		M.jobs = [];
		GameEvents.fire({ type: "machine", hote: h, cmd: "deconnexion", tues: tues });
		var sortie = EXIT_AVANT_MACHINES.apply(this, arguments);
		return (tues.length ? "There are " + tues.length + " running jobs.\n" : "") + sortie;
	}
	return EXIT_AVANT_MACHINES.apply(this, arguments);
};
GameEvents.addListener("ssh", function(e){
	try {
		if (!estMachine(e.host)) return;
		var M = etatMachine(e.host);
		M.sessionSsh = (M.sessionSsh || 0) + 1;
		M.connexion = maintenantMachine(e.host);
		M.pidBash = 7000 + M.sessionSsh * 13;
		M.pidSshd = 812;
		M.tmuxIci = null;
	} catch (x){}
});

/* ================================================================== */
/* tmux et screen                                                       */
/* ================================================================== */

Shell.sorts.tmux = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("tmux: command not found" + astuce(io, "tmux est installé sur les machines d'exploitation (chapitre 6)."), 127);
	var M = etatMachine(h);
	M.tmux = M.tmux || {};
	var action = args[0] || "new-session";
	var alias = { "new": "new-session", ls: "list-sessions", a: "attach-session", at: "attach-session", attach: "attach-session", "kill-session": "kill-session", detach: "detach-client", "detach-client": "detach-client", "list-sessions": "list-sessions", "attach-session": "attach-session", "new-session": "new-session", "kill-server": "kill-server", "capture-pane": "capture-pane" };
	action = alias[action] || action;
	var o = {}, reste = [];
	for (var i = 1; i < args.length; i++){
		if (args[i] === "-s" || args[i] === "-t" || args[i] === "-n" || args[i] === "-c"){ o[args[i].charAt(1)] = args[++i]; continue; }
		if (/^-[dAp]+$/.test(args[i])){ args[i].substring(1).split("").forEach(function(c){ o[c] = true; }); continue; }
		reste.push(args[i]);
	}
	var d = dateMachine(h);
	var dateTexte = JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + d.getFullYear();
	if (action === "new-session"){
		if (M.tmuxIci && !o.d) throw new ShellError("sessions should be nested with care, unset $TMUX to force", 1);
		var nom = o.s || String(Object.keys(M.tmux).length);
		if (M.tmux[nom]) throw new ShellError("duplicate session: " + nom, 1);
		M.tmux[nom] = { cree: dateTexte, pidShell: nouveauPid(h), fenetres: 1 };
		GameEvents.fire({ type: "machine", hote: h, cmd: "tmux", action: "new", session: nom, detache: !!o.d });
		if (reste.length){
			var argv = reste.length === 1 ? reste[0].split(/\s+/) : reste;
			var ancien = M.tmuxIci;
			M.tmuxIci = nom;
			var r = programmeLong(h, argv) ? lancerLongMachine(h, argv, false, io) : null;
			if (!r){ try { Shell.lancerSousCommande(argv, io, "tmux"); } catch (e){} }
			M.tmuxIci = o.d ? ancien : nom;
			return o.d ? "" : "[tmux] " + nom + (r ? "\n" + r.sortie : "");
		}
		if (o.d) return "";
		M.tmuxIci = nom;
		return C.vert("[" + nom + "] 0:bash*") + astuce(io, "Tu es dans la session tmux « " + nom + " ». Ce que tu y lances survit si ta connexion tombe. tmux detach (Ctrl-b puis d) la laisse tourner ; tmux attach -t " + nom + " y revient.");
	}
	if (action === "list-sessions"){
		var noms = Object.keys(M.tmux);
		GameEvents.fire({ type: "machine", hote: h, cmd: "tmux", action: "ls", sessions: noms });
		if (!noms.length) throw new ShellError("no server running on /tmp/tmux-" + uidMachine(h, JOUEUR) + "/default", 1);
		return noms.map(function(n){ return n + ": " + M.tmux[n].fenetres + " windows (created " + M.tmux[n].cree + ")" + (M.tmuxIci === n ? " (attached)" : ""); }).join("\n");
	}
	if (action === "attach-session"){
		var cible = o.t || Object.keys(M.tmux).slice(-1)[0];
		if (!cible || !M.tmux[cible]) throw new ShellError(Object.keys(M.tmux).length ? "can't find session: " + (o.t || "") : "no sessions", 1);
		if (M.tmuxIci) throw new ShellError("sessions should be nested with care, unset $TMUX to force", 1);
		M.tmuxIci = cible;
		var occupe = M.tmux[cible].occupe ? procParPid(h, M.tmux[cible].occupe) : null;
		var fini = !occupe && M.tachesFinies ? Object.keys(M.tachesFinies).filter(function(k){ return M.tachesFinies[k].tmux === cible; })[0] : null;
		GameEvents.fire({ type: "machine", hote: h, cmd: "tmux", action: "attach", session: cible, occupe: occupe ? occupe.comm : null });
		return C.vert("[" + cible + "] 0:bash*") + (occupe && occupe.tache ? "\n" + texteAvanceTache(occupe) : (fini ? "\n" + (M.tachesFinies[fini].texte || fini + " : terminé.") : ""));
	}
	if (action === "detach-client"){
		if (!M.tmuxIci) throw new ShellError("no current client", 1);
		var s = M.tmuxIci;
		M.tmuxIci = null;
		GameEvents.fire({ type: "machine", hote: h, cmd: "tmux", action: "detach", session: s });
		return "[detached (from session " + s + ")]";
	}
	if (action === "kill-session"){
		var k = o.t || M.tmuxIci;
		if (!k || !M.tmux[k]) throw new ShellError("can't find session: " + (k || ""), 1);
		procsMachine(h).slice().forEach(function(p){ if (p.tmux === k) tuerProcessusMachine(h, p, 1, "tmux"); });
		delete M.tmux[k];
		if (M.tmuxIci === k) M.tmuxIci = null;
		return "";
	}
	if (action === "kill-server"){ Object.keys(M.tmux).forEach(function(k2){ procsMachine(h).slice().forEach(function(p){ if (p.tmux === k2) tuerProcessusMachine(h, p, 1, "tmux"); }); }); M.tmux = {}; M.tmuxIci = null; return ""; }
	throw new ShellError("unknown command: " + args[0], 1);
};
function texteAvanceTache(p){
	var t = p.tache, pc = Math.round(t.fait / t.total * 100);
	return (t.libelle || p.comm) + " : " + pc + " % [" + new Array(Math.floor(pc / 5) + 1).join("#") + new Array(21 - Math.floor(pc / 5)).join(".") + "]";
}
Shell.sorts.screen = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("screen: command not found", 127);
	var M = etatMachine(h);
	if (args[0] === "-ls" || args[0] === "-list"){
		var noms = Object.keys(M.tmux || {});
		GameEvents.fire({ type: "machine", hote: h, cmd: "screen", action: "ls" });
		if (!noms.length){ io.code = 1; return "No Sockets found in /run/screen/S-" + JOUEUR + ".\n" + astuce(io, "Aucune session screen. Ici, les sessions qui durent sont celles de tmux (tmux ls) : screen est son ancêtre, mêmes idées, autres touches.").replace(/^\n/, ""); }
		return "No Sockets found in /run/screen/S-" + JOUEUR + "." + astuce(io, "screen ne voit pas les sessions de tmux : ce sont deux outils différents. tmux ls pour les tiennes.");
	}
	throw new ShellError("screen : sur cette machine, on travaille avec tmux (tmux new -s NOM). screen -ls liste les sessions screen.", 1);
};
Shell.sorts.watch = function(args, io){
	var intervalle = 2, i = 0;
	while (i < args.length && args[i].charAt(0) === "-"){
		if (args[i] === "-n" || args[i] === "--interval"){ intervalle = parseFloat(args[i + 1]) || 2; i += 2; continue; }
		if (/^-n[\d.]+$/.test(args[i])){ intervalle = parseFloat(args[i].substring(2)); i++; continue; }
		i++;
	}
	var commande = args.slice(i);
	if (!commande.length) throw new ShellError("Usage:\n watch [options] command", 1);
	var argv = commande.length === 1 ? commande[0].split(/\s+/) : commande;
	var h = machineIci(), blocs = [];
	for (var k = 0; k < 3; k++){
		if (h && k > 0){ etatMachine(h).nb = state.nbCommandes - 1; avancerMachine(h); }
		var r = Shell.lancerSousCommande(argv, io, "watch");
		var d = h ? dateMachine(h) : new Date();
		blocs.push("Every " + intervalle.toFixed(1) + "s: " + argv.join(" ") + new Array(20).join(" ") + (h || Shell.hote()) + ": " + JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + d.getDate() + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + d.getFullYear() + "\n\n" + r.sortie);
	}
	if (h) GameEvents.fire({ type: "machine", hote: h, cmd: "watch", commande: argv.slice(), intervalle: intervalle });
	return blocs.join("\n\n") + astuce(io, "watch relance la commande toutes les " + intervalle + " secondes, en plein écran, jusqu'à Ctrl-C. Ici : trois rafraîchissements.");
};
