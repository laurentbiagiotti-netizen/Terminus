/**
 * SortsPortSwarm.js : le moteur des conteneurs du Grand Port, septième partie : l'escadre (swarm).
 *
 * docker swarm init / join / join-token / leave ; docker node ls, inspect (--pretty), ps, update (--availability,
 * --label-add, --label-rm), promote, demote, rm ; docker service create (--replicas, --mode global, -p, -e, --mount,
 * --network, --constraint, --secret, --limit-memory, --limit-cpu, --health-*, --update-*, --rollback-*,
 * --with-registry-auth, -d), ls, ps, logs, inspect (--pretty), scale, update (--image, --replicas, --env-add,
 * --publish-add, --update-parallelism, --update-delay, --update-failure-action, --rollback), rollback, rm ;
 * docker stack deploy -c (deploy.replicas, placement.constraints, resources, update_config, secrets), ls, ps,
 * services, rm ; docker secret create, ls, inspect, rm.
 *
 * L'ordonnanceur place chaque tâche sur un navire prêt et actif qui satisfait les contraintes, en étalant ; la tâche
 * tire son image du registre (avec les identifiants du gestionnaire si --with-registry-auth), et sinon elle est
 * rejetée (« No such image »). Le maillage de routage : un port publié répond sur chaque navire. Les réseaux overlay
 * relient les tâches de tous les navires ; le nom d'un service se résout depuis ses tâches. Une mise à jour avance lot
 * par lot (parallelism, delay) ; failure_action pause ou rollback ; un retour arrière remet la spécification d'avant.
 * Un navire qui sombre (perdreNoeudPort) : ses tâches sont replacées ailleurs.
 *
 * --- Ce que le monde peut appeler ---
 *   swarmPort() l'état de l'escadre (ou null) ; noeudsSwarmPort() ; serviceSwarmPort(nom) ; tachesSwarmPort(service)
 *   repliquesEnMarchePort(service) ; convergePort(service) ; perdreNoeudPort(h) ; releverNoeudPort(h)
 *   mettreAJourServicePort(nom, image, { detache, parallelisme, delai }) (la mise à jour de l'automate)
 *   poserImagePiegeePort() pousse ecole:1.1 (la couche-témoin) dans le registre de l'entrepôt ; renvoie son digest
 */

/* ================================================================== */
/* L'état de l'escadre                                                  */
/* ================================================================== */

function idSwarmPort(graine){ var t = hexDe("swarm:" + graine, 40), a = "abcdefghijklmnopqrstuvwxyz0123456789", s = ""; for (var i = 0; i < 25; i++) s += a.charAt(parseInt(t.substring(i, i + 2), 16) % 36); return s; }
function gestionnairePort(){
	for (var i = 0; i < HOTES_DOCKER_PORT.length; i++){
		var M = state.reseau && state.reseau.machines && state.reseau.machines[HOTES_DOCKER_PORT[i]];
		if (M && M.port && M.port.swarm) return HOTES_DOCKER_PORT[i];
	}
	return null;
}
function swarmPort(){ var g = gestionnairePort(); return g ? etatPort(g).swarm : null; }
function swarmActifPort(h){ var s = swarmPort(); return !!(s && s.noeuds[h] && !etatPort(h).aQuitte); }
function estGestionnairePort(h){ var s = swarmPort(); return !!(s && s.noeuds[h] && s.noeuds[h].role === "manager"); }
function noeudsSwarmPort(){ var s = swarmPort(); return s ? Object.keys(s.noeuds).map(function(k){ return s.noeuds[k]; }) : []; }
function servicesSwarmPort(){ var s = swarmPort(); return s ? Object.keys(s.services).map(function(k){ return s.services[k]; }) : []; }
function serviceSwarmPort(ref){
	var l = servicesSwarmPort();
	return l.filter(function(x){ return x.nom === ref; })[0] || l.filter(function(x){ return x.id === ref; })[0] || (ref && ref.length >= 3 ? l.filter(function(x){ return x.id.indexOf(ref) === 0; })[0] : null) || null;
}
function tachesSwarmPort(service){ var s = swarmPort(); if (!s) return []; return Object.keys(s.taches).map(function(k){ return s.taches[k]; }).filter(function(t){ return !service || t.service === service.id; }); }
function noeudPort(ref){ var l = noeudsSwarmPort(); return l.filter(function(n){ return n.hote === ref || n.id === ref || (ref && ref.length >= 3 && n.id.indexOf(ref) === 0); })[0] || null; }
function noeudPretPort(n){ return n.etat === "ready" && !etatPort(n.hote).aQuitte && demonActifPort(n.hote) && !(sCh8().sombres && sCh8().sombres[n.hote]); }
function exigerGestionnairePort(h){
	if (!swarmActifPort(h)) throw new ShellError("Error response from daemon: This node is not a swarm manager. Use \"docker swarm init\" or \"docker swarm join\" to connect this node to swarm and try again.", 1);
	if (!estGestionnairePort(h)) throw new ShellError("Error response from daemon: This node is not a swarm manager. Worker nodes can't be used to view or modify cluster state. Please run this command on a manager node or promote the current node to a manager.", 1);
}
function etatSwarmLocalPort(h){
	var s = swarmPort();
	if (!s || !s.noeuds[h]) return { NodeID: "", NodeAddr: "", LocalNodeState: "inactive", ControlAvailable: false, Error: "", RemoteManagers: null };
	var n = s.noeuds[h];
	return { NodeID: n.id, NodeAddr: ipPort(h), LocalNodeState: "active", ControlAvailable: n.role === "manager", Error: "", RemoteManagers: [{ NodeID: s.noeuds[gestionnairePort()].id, Addr: ipPort(gestionnairePort()) + ":2377" }],
		Nodes: Object.keys(s.noeuds).length, Managers: noeudsSwarmPort().filter(function(x){ return x.role === "manager"; }).length, ClusterID: s.id };
}

/* ================================================================== */
/* Les réseaux overlay (les mêmes sur chaque navire)                    */
/* ================================================================== */

function creerReseauOverlayPort(h, nom, o){
	var s = swarmPort();
	o = o || {};
	s.reseaux = s.reseaux || {};
	if (s.reseaux[nom]) return s.reseaux[nom];
	var n = Object.keys(s.reseaux).length;
	var r = { id: idSwarmPort("net:" + nom + ":" + s.id), nom: nom, sousReseau: o.sousReseau || "10.0." + (n + 1) + ".0/24", passerelle: o.passerelle || "10.0." + (n + 1) + ".1", attachable: !!o.attachable, interne: !!o.interne, labels: o.labels || {}, ingress: !!o.ingress, prochain: 2, vip: {} };
	s.reseaux[nom] = r;
	evenementDockerPort(gestionnairePort(), "network", "create", r.id, { name: nom, type: "overlay" });
	return { id: r.id, nom: nom };
}
/* Le réseau overlay sur un navire (créé là quand une tâche y arrive). */
function overlaySurNoeudPort(h, nom){
	var s = swarmPort(), g = s.reseaux[nom];
	var P = etatPort(h);
	if (!P.reseaux[g.id]) P.reseaux[g.id] = { id: g.id, nom: nom, pilote: "overlay", portee: "swarm", sousReseau: g.sousReseau, passerelle: g.passerelle, cree: maintenantPort(h), interne: g.interne, attachable: g.attachable, labels: g.labels, options: { "com.docker.network.driver.overlay.vxlanid_list": String(4096 + Object.keys(s.reseaux).indexOf(nom)) }, defaut: false, ingress: g.ingress, swarm: true };
	return P.reseaux[g.id];
}
function ipOverlayPort(nom){ var g = swarmPort().reseaux[nom]; var n = g.prochain++; var b = g.sousReseau.split("/")[0].split("."); return b[0] + "." + b[1] + "." + b[2] + "." + n; }

/* ================================================================== */
/* L'ordonnanceur                                                       */
/* ================================================================== */

function contraintesOkPort(n, contraintes){
	return (contraintes || []).every(function(c){
		var m = /^\s*([\w.]+)\s*(==|!=)\s*(.+?)\s*$/.exec(c);
		if (!m) return false;
		var v;
		if (m[1] === "node.hostname") v = n.hote;
		else if (m[1] === "node.role") v = n.role;
		else if (m[1] === "node.id") v = n.id;
		else if (m[1] === "node.platform.os") v = "linux";
		else if (m[1] === "node.platform.arch") v = "x86_64";
		else if (/^node\.labels\./.test(m[1])) v = (n.labels || {})[m[1].substring(12)];
		else if (/^engine\.labels\./.test(m[1])) v = undefined;
		else return false;
		return m[2] === "==" ? v === m[3] : v !== m[3];
	});
}
function noeudsEligiblesPort(sv){ return noeudsSwarmPort().filter(function(n){ return noeudPretPort(n) && n.dispo === "active" && contraintesOkPort(n, sv.spec.contraintes); }); }
function tachesActivesPort(sv){ return tachesSwarmPort(sv).filter(function(t){ return t.etatVoulu === "running" && ["new", "pending", "assigned", "preparing", "starting", "running"].indexOf(t.etat) > -1; }); }
function repliquesEnMarchePort(sv){ return tachesSwarmPort(sv).filter(function(t){ return t.etatVoulu === "running" && t.etat === "running" && noeudPretPort(noeudPort(t.noeud) || {}); }).length; }
function voulusPort(sv){ return sv.spec.mode === "global" ? noeudsEligiblesPort(sv).length : sv.spec.repliques; }
function convergePort(sv){ return repliquesEnMarchePort(sv) === voulusPort(sv) && !(sv.maj && (sv.maj.etat === "updating" || sv.maj.etat === "rollback_started")); }
/* Tirer l'image d'une tâche sur un navire : l'image locale, ou le registre (avec les identifiants transmis). */
function imagePourTachePort(h, sv){
	var ref = sv.spec.image;
	var im = imagePort(h, ref);
	if (im) return { image: im };
	var a = analyserRefPort(ref);
	if (a.registre === REGISTRE_CONTINENT_PORT){
		var r0 = tirerImagePort(h, ref, null, true);
		return r0.erreur ? { erreur: "No such image: " + ref } : { image: r0.image };
	}
	var j = joindreRegistrePort(h, a.registre, sv.auth || null);
	if (j.erreur || !j.auth.ok) return { erreur: "No such image: " + ref };
	var x = imageDepuisRegistrePort(j.hr, j.cr, a.depot, a.digest || a.tag);
	if (!x || x.liste) return { erreur: "No such image: " + ref };
	x.image.couches.forEach(function(id){ var c = couchePort(h, id); if (c && !COUCHES_PORT[id]) etatPort(h).couches[id] = c; });
	var pose = poserImagePort(h, x.image, a.tag ? a.nomTag : null, a.court + "@" + x.digest);
	return { image: pose };
}
/* Lancer une tâche sur un navire : un conteneur nommé service.slot.id. */
function lancerTachePort(sv, slot, n){
	var s = swarmPort();
	s.compteur = (s.compteur || 0) + 1;
	var t = { id: idSwarmPort("tache:" + sv.id + ":" + slot + ":" + s.compteur), service: sv.id, slot: slot, noeud: n.hote, etatVoulu: "running", etat: "preparing", message: "preparing", erreur: "", cree: maintenantPort(n.hote), maj: maintenantPort(n.hote), version: sv.version, image: sv.spec.image, conteneur: null };
	s.taches[t.id] = t;
	var ti = imagePourTachePort(n.hote, sv);
	if (ti.erreur){ t.etat = "rejected"; t.etatVoulu = "shutdown"; t.erreur = ti.erreur; t.message = "preparing"; return t; }
	var spec = sv.spec;
	var o = { nom: sv.nom + "." + slot + "." + t.id, env: spec.env.slice(), montages: copieJson(spec.montages || []), tmpfs: copieJson(spec.tmpfs || {}), labels: copieJson(spec.labelsConteneur || {}), cmd: spec.cmd, entrypoint: spec.entrypoint,
		user: spec.user, workdir: spec.workdir, memoire: spec.memoire || 0, cpus: spec.cpus || 0, readOnly: spec.readOnly, capDrop: spec.capDrop || [], capAdd: spec.capAdd || [], secOpt: spec.secOpt || [], sante: spec.sante, hostname: spec.hostname,
		secrets: (spec.secrets || []).map(function(x){ var sec = s.secrets[x.id]; return { nom: x.nom, cible: x.cible, texte: sec ? sec.donnees : "" }; }), swarm: { service: sv.id, tache: t.id }, restart: { nom: "no", max: 0 }, log: spec.log || null };
	o.labels["com.docker.swarm.service.id"] = sv.id; o.labels["com.docker.swarm.service.name"] = sv.nom; o.labels["com.docker.swarm.task.id"] = t.id; o.labels["com.docker.swarm.task.name"] = sv.nom + "." + slot + "." + t.id; o.labels["com.docker.swarm.node.id"] = n.id;
	if (spec.stack) o.labels["com.docker.stack.namespace"] = spec.stack;
	o.reseau = "none";
	var c;
	try { c = creerConteneurPort(n.hote, ti.image, o, spec.image); }
	catch (e){ if (e instanceof ShellError){ t.etat = "rejected"; t.etatVoulu = "shutdown"; t.erreur = e.message.replace(/^docker: Error response from daemon: /, "").replace(/\n[\s\S]*$/, ""); return t; } throw e; }
	delete c.reseaux.none;
	c.hote.reseau = spec.reseaux.length ? spec.reseaux[0] : "ingress";
	(spec.reseaux.length ? spec.reseaux : []).concat(spec.ports.length ? ["ingress"] : []).forEach(function(nr){
		if (!s.reseaux[nr]) return;
		var r = overlaySurNoeudPort(n.hote, nr);
		var ip = ipOverlayPort(nr);
		c.reseaux[nr] = { id: r.id, ip: ip, alias: nr === "ingress" ? [] : [spec.alias || sv.nom].concat([c.id.substring(0, 12)]), passerelle: r.passerelle, mac: macPort(ip), endpoint: idPort("ep:" + c.id + ":" + r.id) };
	});
	t.conteneur = c.id;
	var r2 = demarrerConteneurPort(n.hote, c, {});
	if (!r2.ok){ t.etat = "failed"; t.etatVoulu = "shutdown"; t.erreur = r2.erreur.replace(/^docker: Error response from daemon: /, "").replace(/^.*error during container init: /, "starting container failed: "); t.maj = maintenantPort(n.hote); return t; }
	if (!enMarchePort(c)){ t.etat = c.etat.code === 0 ? "complete" : "failed"; t.etatVoulu = "shutdown"; t.erreur = c.etat.code ? "task: non-zero exit (" + c.etat.code + ")" : ""; return t; }
	t.etat = "running"; t.message = "started"; t.maj = maintenantPort(n.hote);
	return t;
}
function arreterTachePort(t, raison){
	t.etatVoulu = "shutdown";
	var c = t.conteneur ? (etatPort(t.noeud).conteneurs[t.conteneur] || null) : null;
	if (c && enMarchePort(c)) arreterConteneurPort(t.noeud, c, { signal: 15, garder: true, parDemon: true });
	if (t.etat === "running" || t.etat === "preparing" || t.etat === "starting") t.etat = "shutdown";
	t.message = raison || "shutdown";
	t.maj = maintenantPort(t.noeud);
}
/* La tâche est morte (son conteneur s'est arrêté). */
function tacheSwarmMortePort(h, c, code){
	var s = swarmPort();
	if (!s || !c.swarm) return;
	var t = s.taches[c.swarm.tache];
	if (!t || t.etatVoulu !== "running") return;
	t.etat = code === 0 ? "complete" : "failed";
	t.erreur = code ? "task: non-zero exit (" + code + ")" : "";
	t.etatVoulu = "shutdown";
	t.maj = maintenantPort(h);
}
/* Mettre l'escadre d'accord avec ce qui est voulu : les tâches manquantes, en trop, perdues. */
function reconcilierPort(sv, maxNouvelles){
	var s = swarmPort();
	var faites = 0;
	// Les tâches d'un navire perdu, drainé ou en panne : arrêtées (et remplacées).
	tachesSwarmPort(sv).forEach(function(t){
		if (t.etatVoulu !== "running") return;
		var n = noeudPort(t.noeud);
		if (!n || !noeudPretPort(n)){ t.etatVoulu = "shutdown"; t.message = "node down"; return; }
		if (n.dispo === "drain"){ arreterTachePort(t, "drained"); return; }
		if (!contraintesOkPort(n, sv.spec.contraintes)){ arreterTachePort(t, "constraint"); return; }
		var c = t.conteneur ? etatPort(t.noeud).conteneurs[t.conteneur] : null;
		if (c && c.etat.sante && c.etat.sante.statut === "unhealthy"){ t.erreur = "task: non-zero exit (137): dockerexec: unhealthy container"; arreterTachePort(t, "unhealthy"); t.etat = "failed"; return; }
		if (!c || !enMarchePort(c)){ t.etatVoulu = "shutdown"; if (t.etat === "running") t.etat = "failed"; }
	});
	if (sv.spec.mode === "global"){
		noeudsEligiblesPort(sv).forEach(function(n){
			if (faites >= (maxNouvelles || 99)) return;
			if (!tachesActivesPort(sv).some(function(t){ return t.noeud === n.hote; })){ lancerTachePort(sv, n.id, n); faites++; }
		});
		return faites;
	}
	var actives = tachesActivesPort(sv);
	// En trop : les slots les plus hauts s'arrêtent.
	actives.filter(function(t){ return t.slot > sv.spec.repliques; }).forEach(function(t){ arreterTachePort(t, "scaled down"); t.etat = "shutdown"; });
	for (var slot = 1; slot <= sv.spec.repliques; slot++){
		if (faites >= (maxNouvelles || 99)) break;
		if (tachesActivesPort(sv).some(function(t){ return t.slot === slot; })) continue;
		var eligibles = noeudsEligiblesPort(sv);
		if (!eligibles.length){
			var tp = { id: idSwarmPort("attente:" + sv.id + ":" + slot), service: sv.id, slot: slot, noeud: "", etatVoulu: "running", etat: "pending", message: "pending", erreur: "no suitable node (" + (sv.spec.contraintes.length ? "scheduling constraints not satisfied on " + noeudsSwarmPort().length + " nodes" : "0 nodes available") + ")", cree: maintenantPort("docks"), maj: maintenantPort("docks"), version: sv.version, image: sv.spec.image };
			s.taches[tp.id] = tp;
			continue;
		}
		// Étaler : le navire qui porte le moins de tâches de ce service, puis le moins de tâches tout court.
		eligibles.sort(function(a, b){
			var ta = tachesActivesPort(sv).filter(function(t){ return t.noeud === a.hote; }).length, tb = tachesActivesPort(sv).filter(function(t){ return t.noeud === b.hote; }).length;
			if (ta !== tb) return ta - tb;
			var ra = conteneursPort(a.hote).filter(enMarchePort).length, rb = conteneursPort(b.hote).filter(enMarchePort).length;
			return ra - rb || (a.hote < b.hote ? -1 : 1);
		});
		// Une tâche rejetée sur ce navire tout à l'heure : on en essaie un autre d'abord.
		var rejets = tachesSwarmPort(sv).filter(function(t){ return t.slot === slot && t.etat === "rejected"; }).map(function(t){ return t.noeud; });
		var choix = eligibles.filter(function(n){ return rejets.indexOf(n.hote) === -1; })[0] || eligibles[0];
		lancerTachePort(sv, slot, choix);
		faites++;
	}
	// Les tâches en attente qui ont maintenant une place sont nettoyées.
	tachesSwarmPort(sv).forEach(function(t){ if (t.etat === "pending" && t.noeud === "" && tachesActivesPort(sv).some(function(x){ return x.slot === t.slot && x.noeud; })) delete s.taches[t.id]; });
	return faites;
}
/* Un pas de mise à jour (ou de retour arrière) : un lot de parallelism tâches. */
function pasMiseAJourPort(sv){
	var m = sv.maj;
	if (!m || (m.etat !== "updating" && m.etat !== "rollback_started")) return false;
	var cfg = m.etat === "updating" ? sv.spec.miseAJour : sv.spec.retourArriere;
	var par = cfg.parallelisme === 0 ? 999 : (cfg.parallelisme || 1);
	var vieilles = tachesActivesPort(sv).filter(function(t){ return t.version !== sv.version; }).sort(function(a, b){ return a.slot - b.slot; });
	if (!vieilles.length){
		reconcilierPort(sv);
		m.etat = m.etat === "updating" ? "completed" : "rollback_completed";
		m.fin = maintenantPort("docks");
		m.message = m.etat === "completed" ? "update completed" : "rollback completed";
		evenementPort(gestionnairePort(), "serviceMaj", { service: sv.nom, etat: m.etat, image: sv.spec.image });
		return false;
	}
	var lot = vieilles.slice(0, par), echec = null;
	lot.forEach(function(t){
		arreterTachePort(t, "replaced"); t.etat = "shutdown";
		var n = noeudPort(t.noeud);
		var neuve = lancerTachePort(sv, t.slot, n && noeudPretPort(n) && n.dispo === "active" && contraintesOkPort(n, sv.spec.contraintes) ? n : (noeudsEligiblesPort(sv)[0] || n));
		if (neuve.etat !== "running") echec = neuve;
	});
	if (echec){
		var action = cfg.action || "pause";
		if (m.etat === "updating" && action === "rollback" && sv.precedent){ demarrerRetourArrierePort(sv, "update rolled back due to failure or early termination of task " + echec.id); return true; }
		if (action !== "continue"){ m.etat = m.etat === "updating" ? "paused" : "rollback_paused"; m.message = "update paused due to failure or early termination of task " + echec.id; evenementPort(gestionnairePort(), "serviceMaj", { service: sv.nom, etat: m.etat, image: sv.spec.image }); return false; }
	}
	return true;
}
function demarrerRetourArrierePort(sv, message){
	var ancien = sv.spec;
	sv.spec = copieJson(sv.precedent);
	sv.precedent = ancien;
	sv.version++;
	sv.maj = { etat: "rollback_started", debut: maintenantPort("docks"), message: message || "manually requested rollback" };
}
/* Le tic de l'escadre (sur le gestionnaire) : les mises à jour détachées avancent d'un lot, l'escadre se répare. */
function ticSwarmPort(h){
	var s = etatPort(h).swarm;
	if (!s) return;
	servicesSwarmPort().forEach(function(sv){
		if (sv.maj && (sv.maj.etat === "updating" || sv.maj.etat === "rollback_started") && sv.detache) pasMiseAJourPort(sv);
		else reconcilierPort(sv, 3);
	});
}
/* Le maillage de routage : le port publié d'un service répond sur chaque navire de l'escadre. */
function ecouteurSwarmPort(cible, port){
	var s = swarmPort();
	if (!s || !s.noeuds[cible] || !noeudPretPort(s.noeuds[cible])) return null;
	var sv = servicesSwarmPort().filter(function(x){ return x.spec.ports.some(function(p){ return +p.publie === port; }); })[0];
	if (!sv) return null;
	var cible2 = sv.spec.ports.filter(function(p){ return +p.publie === port; })[0];
	var taches = tachesSwarmPort(sv).filter(function(t){ return t.etatVoulu === "running" && t.etat === "running" && noeudPretPort(noeudPort(t.noeud) || {}); });
	if (!taches.length) return { reponse: null, hote: cible, conteneur: null, port: port, vide: true };
	s.tour = ((s.tour || 0) + 1) % 1000;
	var t = taches[s.tour % taches.length];
	var c = etatPort(t.noeud).conteneurs[t.conteneur];
	if (!c) return null;
	return { hote: t.noeud, conteneur: c, port: +cible2.cible };
}
function ecoutesSwarmPort(h){
	var s = swarmPort();
	if (!s || !s.noeuds[h]) return [];
	var l = [];
	servicesSwarmPort().forEach(function(sv){ sv.spec.ports.forEach(function(p){ l.push({ proto: "tcp", etat: "LISTEN", adresse: "*", port: +p.publie, pairAdresse: "*", pairPort: "*", programme: "dockerd", pid: (procsMachine(h).filter(function(x){ return x.comm === "dockerd"; })[0] || {}).pid || 900, utilisateur: "root", unite: "docker.service" }); }); });
	return l;
}
/* Le nom d'un service, vu d'une tâche sur un réseau overlay. */
function resoudreServiceSwarmPort(h, c, nom){
	var s = swarmPort();
	if (!s) return null;
	var reseaux = Object.keys(c.reseaux || {}).filter(function(k){ return s.reseaux && s.reseaux[k] && k !== "ingress"; });
	if (!reseaux.length) return null;
	var sv = servicesSwarmPort().filter(function(x){ return (x.nom === nom || x.spec.alias === nom) && x.spec.reseaux.some(function(r){ return reseaux.indexOf(r) > -1; }); })[0];
	if (!sv){
		// Une tâche par son nom de conteneur (service.1.id).
		var tn = tachesSwarmPort().filter(function(t){ return t.etat === "running" && t.conteneur && etatPort(t.noeud).conteneurs[t.conteneur] && etatPort(t.noeud).conteneurs[t.conteneur].nom === nom; })[0];
		if (!tn) return null;
		var ct = etatPort(tn.noeud).conteneurs[tn.conteneur];
		return { ip: ct.reseaux[reseaux[0]] ? ct.reseaux[reseaux[0]].ip : "", conteneur: ct, hoteConteneur: tn.noeud, swarm: true };
	}
	var reseau = sv.spec.reseaux.filter(function(r){ return reseaux.indexOf(r) > -1; })[0];
	var g = s.reseaux[reseau];
	if (!g.vip[sv.id]) g.vip[sv.id] = ipOverlayPort(reseau);
	var taches = tachesSwarmPort(sv).filter(function(t){ return t.etatVoulu === "running" && t.etat === "running" && noeudPretPort(noeudPort(t.noeud) || {}); });
	if (!taches.length) return { ip: g.vip[sv.id], inconnu: false, swarm: true, conteneur: null };
	s.tour = ((s.tour || 0) + 1) % 1000;
	var t = taches[s.tour % taches.length];
	return { ip: g.vip[sv.id], conteneur: etatPort(t.noeud).conteneurs[t.conteneur], hoteConteneur: t.noeud, swarm: true, nomComplet: nom };
}
function tacheParIpSwarmPort(ip){
	var trouve = null;
	tachesSwarmPort().forEach(function(t){ if (trouve || !t.conteneur || t.etat !== "running") return; var c = etatPort(t.noeud).conteneurs[t.conteneur]; if (c) Object.keys(c.reseaux || {}).forEach(function(k){ if (c.reseaux[k].ip === ip) trouve = { ip: ip, conteneur: c, hoteConteneur: t.noeud, swarm: true }; }); });
	return trouve;
}

/* ================================================================== */
/* Les gestes du monde : le naufrage, la mise à jour de l'automate       */
/* ================================================================== */

function perdreNoeudPort(h){
	var c = sCh8(); c.sombres = c.sombres || {}; c.sombres[h] = true;
	var s = swarmPort();
	if (s && s.noeuds[h]){ s.noeuds[h].etat = "down"; s.noeuds[h].message = "heartbeat failure"; }
	conteneursPort(h).forEach(function(x){ if (enMarchePort(x)){ retirerProcessusConteneurPort(h, x); } });
	evenementPort(gestionnairePort() || "docks", "noeudPerdu", { hote: h });
	servicesSwarmPort().forEach(function(sv){ reconcilierPort(sv); });
}
function releverNoeudPort(h){
	var c = sCh8(); if (c.sombres) delete c.sombres[h];
	var s = swarmPort();
	if (s && s.noeuds[h]){ s.noeuds[h].etat = "ready"; delete s.noeuds[h].message; }
}
function mettreAJourServicePort(nom, image, o){
	o = o || {};
	var sv = serviceSwarmPort(nom);
	if (!sv) return null;
	sv.precedent = copieJson(sv.spec);
	sv.spec.image = image;
	if (o.parallelisme !== undefined) sv.spec.miseAJour.parallelisme = o.parallelisme;
	sv.version++;
	sv.maj = { etat: "updating", debut: maintenantPort("docks"), message: "update in progress" };
	sv.detache = o.detache !== false;
	sv.auth = sv.auth || null;
	evenementPort(gestionnairePort(), "serviceMaj", { service: sv.nom, etat: "updating", image: image, automate: !!o.automate });
	if (!sv.detache) while (pasMiseAJourPort(sv)){}
	return sv;
}
/* L'image piégée de la bataille : ecole:1.1 dans le registre de l'entrepôt, la même couche-témoin que l'éclaireur. */
function poserImagePiegeePort(){
	var ec = ecouteurHotePort("entrepot", 5000, "entrepot", false);
	if (!ec || !ec.conteneur || !ec.conteneur.programme || ec.conteneur.programme.type !== "registry") return null;
	var base = (function(){
		var depots = depotsRegistrePort(ec.hote, ec.conteneur);
		if (depots.indexOf("ecole") > -1){ var tags = tagsRegistrePort(ec.hote, ec.conteneur, "ecole"); var x = tags.length ? imageDepuisRegistrePort(ec.hote, ec.conteneur, "ecole", tags[0]) : null; if (x && x.image) return x.image; }
		return imageCataloguePort("python@slim");
	})();
	cataloguePort();
	var img = copieJson(base);
	img.couches = base.couches.concat([COUCHE_TEMOIN_PORT, COUCHE_FLOTTE_PORT]);
	img.historique = base.historique.concat([{ created: "2026-10-20T04:12:09Z", created_by: "ADD temoin.txt /usr/local/share/flotte/temoin.txt # buildkit", comment: "buildkit.dockerfile.v0" }, { created: "2026-10-20T04:12:09Z", created_by: "COPY flotte.sh /etc/profile.d/flotte.sh # buildkit", comment: "buildkit.dockerfile.v0" }]);
	img.config = copieJson(base.config || {});
	img.config.Labels = { "port.constructeur": "P.G.", "port.signature": signatureBastionPort() };
	img.config.Env = (img.config.Env || []).filter(function(e){ return !/^VERSION=/.test(e); }).concat(["VERSION=1.1"]);
	img.cree = "2026-10-20T04:12:09Z";
	img.origine = "registre";
	img.id = sha256(configJsonPort(img));
	var r = pousserDansRegistrePort("entrepot", img, ec.hote, ec.conteneur, "ecole", "1.1");
	sCh8().digestPiege = r.digest;
	return r.digest;
}

/* ================================================================== */
/* La commande : swarm, node, service, stack, secret                    */
/* ================================================================== */

function swarmCliPort(h, sous, a, io){
	accesDemonPort(h, io, "swarm");
	switch (sous){
		case "swarm": return swarmSousPort(h, a, io);
		case "node": return nodeSousPort(h, a, io);
		case "service": return serviceSousPort(h, a, io);
		case "stack": return stackSousPort(h, a, io);
		case "secret": return secretSousPort(h, a, io);
		case "config": throw new ShellError("docker config : les configs de l'escadre ne sont pas au programme du port ; les secrets (docker secret) le sont.", 1);
	}
}
function texteJoinPort(s, role){
	return "To add a " + role + " to this swarm, run the following command:\n\n    docker swarm join --token " + s.jetons[role] + " " + ipPort(gestionnairePort()) + ":2377\n";
}
function swarmSousPort(h, a, io){
	var s0 = a.shift();
	if (s0 === "init"){
		var d = lireDrapeauxPort(a, { valeurs: ["advertise-addr", "listen-addr", "data-path-addr", "default-addr-pool"], booleens: ["force-new-cluster", "autolock"] }, "swarm init");
		if (swarmActifPort(h)) throw new ShellError("Error response from daemon: This node is already part of a swarm. Use \"docker swarm leave\" to leave this swarm and join another one.", 1);
		if (swarmPort()) throw new ShellError("Error response from daemon: This node is already part of a swarm. Use \"docker swarm leave\" to leave this swarm and join another one.", 1);
		if (d.o["advertise-addr"] && d.o["advertise-addr"].split(":")[0] !== ipPort(h) && d.o["advertise-addr"] !== "ens3") throw new ShellError("Error response from daemon: advertise address must be a non-zero IP address or network interface (with optional port number)", 1);
		var P = etatPort(h);
		var id = idSwarmPort("cluster:" + h + ":" + state.nbCommandes);
		P.swarm = { id: id, cree: maintenantPort(h), jetons: { worker: "SWMTKN-1-" + hexDe("tk:" + id, 50).replace(/(.{50})/, "$1") + "-" + idSwarmPort("w:" + id), manager: "SWMTKN-1-" + hexDe("tk:" + id, 50) + "-" + idSwarmPort("m:" + id) }, noeuds: {}, services: {}, taches: {}, secrets: {}, reseaux: {}, stacks: {}, compteur: 0 };
		P.aQuitte = false;
		P.swarm.noeuds[h] = { id: idSwarmPort("node:" + h + ":" + id), hote: h, role: "manager", leader: true, dispo: "active", etat: "ready", labels: {}, rejoint: maintenantPort(h) };
		creerReseauOverlayPort(h, "ingress", { ingress: true, sousReseau: "10.0.0.0/24", passerelle: "10.0.0.1" });
		var gw = creerReseauPort(h, "docker_gwbridge", { pilote: "bridge", sousReseau: "172.18.0.0/16" });
		gw.defaut = false;
		evenementDockerPort(h, "node", "create", P.swarm.noeuds[h].id, { name: h });
		evenementPort(h, "swarmInit", { id: id });
		return "Swarm initialized: current node (" + P.swarm.noeuds[h].id + ") is now a manager.\n\n" + texteJoinPort(P.swarm, "worker") + "\nTo add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.";
	}
	if (s0 === "join"){
		var d2 = lireDrapeauxPort(a, { valeurs: ["token", "advertise-addr", "listen-addr", "availability", "data-path-addr"] }, "swarm join");
		var s = swarmPort();
		if (swarmActifPort(h)) throw new ShellError("Error response from daemon: This node is already part of a swarm. Use \"docker swarm leave\" to leave this swarm and join another one.", 1);
		if (!d2.reste.length) throw new ShellError("\"docker swarm join\" requires exactly 1 argument.\nSee 'docker swarm join --help'.\n\nUsage:  docker swarm join [OPTIONS] HOST:PORT\n\nJoin a swarm as a node and/or manager", 1);
		var cible = d2.reste[0].split(":")[0], port = +(d2.reste[0].split(":")[1] || 2377);
		var g = resoudreHotePort(cible, h);
		if (!s || !g || g !== gestionnairePort() || port !== 2377 || h === "douane") throw new ShellError("Error response from daemon: rpc error: code = Unavailable desc = connection error: desc = \"transport: Error while dialing: dial tcp " + (g ? ipPort(g) : cible) + ":" + port + ": connect: connection refused\"", 1);
		var role = d2.o.token === s.jetons.worker ? "worker" : (d2.o.token === s.jetons.manager ? "manager" : null);
		if (!role) throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = A valid join token is necessary to join this cluster", 1);
		etatPort(h).aQuitte = false;
		s.noeuds[h] = { id: s.noeuds[h] ? s.noeuds[h].id : idSwarmPort("node:" + h + ":" + s.id), hote: h, role: role, leader: false, dispo: d2.o.availability || "active", etat: "ready", labels: s.noeuds[h] ? s.noeuds[h].labels : {}, rejoint: maintenantPort(h) };
		evenementDockerPort(gestionnairePort(), "node", "create", s.noeuds[h].id, { name: h });
		evenementPort(h, "swarmJoin", { hote: h, role: role });
		return "This node joined a swarm as a " + role + ".";
	}
	if (s0 === "join-token"){
		exigerGestionnairePort(h);
		var d3 = lireDrapeauxPort(a, { court: { q: "quiet" }, booleens: ["quiet", "rotate"] }, "swarm join-token");
		var role2 = d3.reste[0];
		if (role2 !== "worker" && role2 !== "manager") throw new ShellError("unknown role " + (role2 || ""), 1);
		var s2 = swarmPort();
		if (d3.o.rotate){ s2.jetons[role2] = "SWMTKN-1-" + hexDe("tk:" + s2.id, 50) + "-" + idSwarmPort("r:" + s2.id + state.nbCommandes); }
		evenementPort(h, "joinToken", { role: role2 });
		if (d3.o.quiet) return s2.jetons[role2];
		return (d3.o.rotate ? "Successfully rotated " + role2 + " join token.\n\n" : "") + texteJoinPort(s2, role2);
	}
	if (s0 === "leave"){
		var d4 = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force"] }, "swarm leave");
		if (!swarmActifPort(h)) throw new ShellError("Error response from daemon: This node is not part of a swarm", 1);
		var s3 = swarmPort();
		if (s3.noeuds[h].role === "manager" && !d4.o.force) throw new ShellError("Error response from daemon: You are attempting to leave the swarm on a node that is participating as a manager. Removing the last manager erases all current state of the swarm. Use `--force` to ignore this message.", 1);
		tachesSwarmPort().filter(function(t){ return t.noeud === h; }).forEach(function(t){ arreterTachePort(t, "left"); });
		conteneursPort(h).filter(function(c){ return c.swarm; }).forEach(function(c){ supprimerConteneurPort(h, c, true); });
		if (s3.noeuds[h].role === "manager" && gestionnairePort() === h){ servicesSwarmPort().forEach(function(sv){ tachesSwarmPort(sv).forEach(function(t){ var c = etatPort(t.noeud).conteneurs[t.conteneur]; if (c){ arreterConteneurPort(t.noeud, c, { signal: 15, garder: true, parDemon: true }); supprimerConteneurPort(t.noeud, c, true); } }); }); etatPort(h).swarm = null; }
		else { s3.noeuds[h].etat = "down"; etatPort(h).aQuitte = true; }
		evenementPort(h, "swarmLeave", { hote: h });
		return "Node left the swarm.";
	}
	if (s0 === "inspect"){ exigerGestionnairePort(h); var s4 = swarmPort(); return jsonDockerPort([{ ID: s4.id, Version: { Index: 10 }, CreatedAt: dateIsoPort(s4.cree), UpdatedAt: dateIsoPort(s4.cree), Spec: { Name: "default", Orchestration: { TaskHistoryRetentionLimit: 5 }, Raft: { SnapshotInterval: 10000, KeepOldSnapshots: 0, LogEntriesForSlowFollowers: 500, ElectionTick: 10, HeartbeatTick: 1 }, Dispatcher: { HeartbeatPeriod: 5000000000 } }, JoinTokens: { Worker: s4.jetons.worker, Manager: s4.jetons.manager } }]); }
	return "\nUsage:  docker swarm COMMAND\n\nManage Swarm\n\nCommands:\n  init        Initialize a swarm\n  join        Join a swarm as a node and/or manager\n  join-token  Manage join tokens\n  leave       Leave the swarm\n\nRun 'docker swarm COMMAND --help' for more information on a command.";
}
function nodeSousPort(h, a, io){
	var s0 = a.shift();
	exigerGestionnairePort(h);
	var s = swarmPort();
	if (s0 === "ls" || s0 === "list"){
		var d = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet"], valeurs: ["filter", "format"], repetables: ["filter"] }, "node ls");
		var l = noeudsSwarmPort().slice().sort(function(x, y){ return x.hote < y.hote ? -1 : 1; });
		evenementPort(h, "nodeLs", { noeuds: l.map(function(n){ return { hote: n.hote, etat: noeudPretPort(n) ? "Ready" : "Down", dispo: n.dispo, role: n.role }; }) });
		if (d.o.quiet) return l.map(function(n){ return n.id; }).join("\n");
		var objets = l.map(function(n){ return { __type: "formatter.nodeContext", ID: n.id + (n.hote === h ? " *" : ""), Self: n.hote === h, Hostname: n.hote, Status: noeudPretPort(n) ? "Ready" : (n.etat === "down" || !noeudPretPort(n) ? "Down" : "Unknown"), Availability: n.dispo.charAt(0).toUpperCase() + n.dispo.substring(1), ManagerStatus: n.role === "manager" ? (n.leader ? "Leader" : "Reachable") : "", EngineVersion: VERSION_DOCKER_PORT, TLSStatus: "Ready" }; });
		if (d.o.format) return formaterListePort(d.o.format, objets, { ID: "ID", Hostname: "HOSTNAME", Status: "STATUS", Availability: "AVAILABILITY", ManagerStatus: "MANAGER STATUS", EngineVersion: "ENGINE VERSION" });
		return tableauPort(["ID", "HOSTNAME", "STATUS", "AVAILABILITY", "MANAGER STATUS", "ENGINE VERSION"], objets.map(function(o){ return [o.ID, o.Hostname, o.Status, o.Availability, o.ManagerStatus, o.EngineVersion]; }));
	}
	if (s0 === "inspect"){
		var d2 = lireDrapeauxPort(a, { court: { f: "format" }, valeurs: ["format"], booleens: ["pretty"] }, "node inspect");
		var cibles = d2.reste.length ? d2.reste : ["self"];
		var objs = cibles.map(function(r){ var n = r === "self" ? s.noeuds[h] : noeudPort(r); if (!n) throw new ShellError("Error response from daemon: node " + r + " not found", 1); return n; });
		evenementPort(h, "nodeInspect", { noeuds: objs.map(function(n){ return n.hote; }) });
		if (d2.o.pretty) return objs.map(function(n){ return "ID:\t\t\t" + n.id + "\nLabels:\n" + Object.keys(n.labels).map(function(k){ return " - " + k + "=" + n.labels[k] + "\n"; }).join("") + "Hostname:              \t" + n.hote + "\nJoined at:             \t" + dateIsoPort(n.rejoint) + "\nStatus:\n State:\t\t\t" + (noeudPretPort(n) ? "Ready" : "Down") + "\n Availability:         \t" + n.dispo.charAt(0).toUpperCase() + n.dispo.substring(1) + "\n Address:\t\t" + ipPort(n.hote) + "\n" + (n.role === "manager" ? "Manager Status:\n Address:\t\t" + ipPort(n.hote) + ":2377\n Raft Status:\t\tReachable\n Leader:\t\t" + (n.leader ? "Yes" : "No") + "\n" : "") + "Platform:\n Operating System:\tlinux\n Architecture:\t\tx86_64\nResources:\n CPUs:\t\t\t2\n Memory:\t\t3.84GiB\nEngine Version:\t\t" + VERSION_DOCKER_PORT; }).join("\n\n");
		var j = objs.map(function(n){ return { __type: "swarm.Node", ID: n.id, Version: { Index: 20 }, CreatedAt: dateIsoPort(n.rejoint), UpdatedAt: dateIsoPort(n.rejoint), Spec: { Labels: (function(){ var t = { __table: true }; Object.keys(n.labels).forEach(function(k){ t[k] = n.labels[k]; }); return t; })(), Role: n.role, Availability: n.dispo }, Description: { Hostname: n.hote, Platform: { Architecture: "x86_64", OS: "linux" }, Resources: { NanoCPUs: 2000000000, MemoryBytes: 4123148288 }, Engine: { EngineVersion: VERSION_DOCKER_PORT } }, Status: { State: noeudPretPort(n) ? "ready" : "down", Addr: ipPort(n.hote) }, ManagerStatus: n.role === "manager" ? { Leader: !!n.leader, Reachability: "reachable", Addr: ipPort(n.hote) + ":2377" } : undefined }; });
		if (d2.o.format) return j.map(function(o){ return gabaritPort(d2.o.format, o); }).join("\n");
		return jsonDockerPort(j.map(sansMetaPort));
	}
	if (s0 === "update"){
		var d3 = lireDrapeauxPort(a, { valeurs: ["availability", "label-add", "label-rm", "role"], repetables: ["label-add", "label-rm"] }, "node update");
		var n = noeudPort(d3.reste[0]);
		if (!n) throw new ShellError("Error response from daemon: node " + (d3.reste[0] || "") + " not found", 1);
		if (d3.o.availability){ if (["active", "pause", "drain"].indexOf(d3.o.availability) === -1) throw new ShellError("invalid argument \"" + d3.o.availability + "\" for \"--availability\" flag: invalid availability: " + d3.o.availability, 1); n.dispo = d3.o.availability; }
		listePort(d3.o["label-add"]).forEach(function(x){ var i = x.indexOf("="); n.labels[i > 0 ? x.substring(0, i) : x] = i > 0 ? x.substring(i + 1) : ""; });
		listePort(d3.o["label-rm"]).forEach(function(k){ delete n.labels[k]; });
		if (d3.o.role) n.role = d3.o.role;
		evenementDockerPort(h, "node", "update", n.id, { name: n.hote, availability: n.dispo });
		evenementPort(h, "nodeUpdate", { hote: n.hote, dispo: n.dispo, labels: copieJson(n.labels) });
		servicesSwarmPort().forEach(function(sv){ reconcilierPort(sv); });
		return n.hote;
	}
	if (s0 === "promote" || s0 === "demote"){
		return a.map(function(r){ var n = noeudPort(r); if (!n) throw new ShellError("Error response from daemon: node " + r + " not found", 1); n.role = s0 === "promote" ? "manager" : "worker"; return s0 === "promote" ? "Node " + r + " promoted to a manager in the swarm." : "Manager " + r + " demoted in the swarm."; }).join("\n");
	}
	if (s0 === "rm" || s0 === "remove"){
		var d4 = lireDrapeauxPort(a, { court: { f: "force" }, booleens: ["force"] }, "node rm");
		return d4.reste.map(function(r){
			var n = noeudPort(r);
			if (!n) throw new ShellError("Error response from daemon: node " + r + " not found", 1);
			if (n.role === "manager") throw new ShellError("Error response from daemon: rpc error: code = FailedPrecondition desc = node " + n.id + " is a cluster manager and is a member of the raft cluster. It must be demoted to worker before removal", 1);
			if (noeudPretPort(n) && !d4.o.force) throw new ShellError("Error response from daemon: rpc error: code = FailedPrecondition desc = node " + n.id + " is not down and can't be removed", 1);
			tachesSwarmPort().filter(function(t){ return t.noeud === n.hote; }).forEach(function(t){ arreterTachePort(t, "node removed"); });
			delete s.noeuds[n.hote];
			evenementDockerPort(h, "node", "remove", n.id, { name: n.hote });
			evenementPort(h, "nodeRm", { hote: n.hote });
			servicesSwarmPort().forEach(function(sv){ reconcilierPort(sv); });
			return r;
		}).join("\n");
	}
	if (s0 === "ps"){
		var cible = a.filter(function(x){ return x.charAt(0) !== "-"; })[0];
		var n2 = cible ? noeudPort(cible) : s.noeuds[h];
		if (!n2) throw new ShellError("Error response from daemon: node " + cible + " not found", 1);
		return tableauTachesPort(tachesSwarmPort().filter(function(t){ return t.noeud === n2.hote; }), false, false);
	}
	return "\nUsage:  docker node COMMAND\n\nManage Swarm nodes\n\nCommands:\n  demote      Demote one or more nodes from manager in the swarm\n  inspect     Display detailed information on one or more nodes\n  ls          List nodes in the swarm\n  promote     Promote one or more nodes to manager in the swarm\n  ps          List tasks running on one or more nodes, defaults to current node\n  rm          Remove one or more nodes from the swarm\n  update      Update a node\n\nRun 'docker node COMMAND --help' for more information on a command.";
}
function texteEtatTachePort(t){
	var e = t.etat;
	var noms = { new: "New", pending: "Pending", assigned: "Assigned", preparing: "Preparing", starting: "Starting", running: "Running", complete: "Complete", shutdown: "Shutdown", failed: "Failed", rejected: "Rejected", orphaned: "Orphaned" };
	return (noms[e] || e) + " " + ilYaPort("docks", t.maj || t.cree);
}
function tableauTachesPort(taches, noTrunc, quiet){
	var s = swarmPort();
	var groupes = {};
	taches.forEach(function(t){ var k = t.service + ":" + t.slot; (groupes[k] = groupes[k] || []).push(t); });
	var lignes = [];
	Object.keys(groupes).sort(function(a, b){ var ga = groupes[a][0], gb = groupes[b][0]; var sa = s.services[ga.service], sb = s.services[gb.service]; var na = sa ? sa.nom : "", nb = sb ? sb.nom : ""; return na < nb ? -1 : (na > nb ? 1 : (typeof ga.slot === "number" ? ga.slot - gb.slot : 0)); }).forEach(function(k){
		var l = groupes[k].slice().sort(function(a, b){ return (b.cree - a.cree) || (a.etatVoulu === "running" ? -1 : 1); });
		l.forEach(function(t, i){
			var sv = s.services[t.service];
			var nom = (sv ? sv.nom : "?") + (typeof t.slot === "number" ? "." + t.slot : "." + t.slot);
			var err = t.erreur ? (noTrunc ? "\"" + t.erreur + "\"" : "\"" + (t.erreur.length > 29 ? t.erreur.substring(0, 28) + "…" : t.erreur) + "\"") : "";
			lignes.push([noTrunc ? t.id : t.id.substring(0, 12), (i === 0 ? "" : " \\_ ") + nom, (noTrunc ? t.image : t.image.replace(/@sha256:[0-9a-f]+$/, "")), t.noeud, t.etatVoulu === "running" ? "Running" : "Shutdown", texteEtatTachePort(t), err, ""]);
		});
	});
	if (quiet) return lignes.map(function(l){ return l[0]; }).join("\n");
	return tableauPort(["ID", "NAME", "IMAGE", "NODE", "DESIRED STATE", "CURRENT STATE", "ERROR", "PORTS"], lignes);
}

/* ---------------- service ---------------- */

var DEF_SERVICE_PORT = { court: { d: "detach", e: "env", p: "publish", l: "label", q: "quiet", u: "user", w: "workdir", t: "tty" },
	valeurs: ["name", "replicas", "mode", "publish", "env", "mount", "network", "constraint", "secret", "limit-memory", "limit-cpu", "reserve-memory", "reserve-cpu", "health-cmd", "health-interval", "health-retries", "health-timeout", "health-start-period",
		"update-parallelism", "update-delay", "update-failure-action", "update-order", "update-monitor", "rollback-parallelism", "rollback-delay", "rollback-failure-action", "label", "container-label", "hostname", "user", "workdir", "entrypoint", "restart-condition",
		"restart-max-attempts", "cap-drop", "cap-add", "image", "env-add", "env-rm", "publish-add", "publish-rm", "secret-add", "secret-rm", "constraint-add", "constraint-rm", "mount-add", "mount-rm", "network-add", "network-rm", "log-driver", "log-opt", "stop-signal", "read-only"],
	booleens: ["detach", "quiet", "with-registry-auth", "no-healthcheck", "rollback", "force", "tty", "init", "no-resolve-image"],
	repetables: ["publish", "env", "mount", "network", "constraint", "secret", "label", "container-label", "cap-drop", "cap-add", "env-add", "env-rm", "publish-add", "publish-rm", "secret-add", "secret-rm", "constraint-add", "constraint-rm", "mount-add", "mount-rm", "network-add", "network-rm", "log-opt"] };
function lirePublishServicePort(x){
	if (/=/.test(x)){ var m = {}; String(x).split(",").forEach(function(kv){ var i = kv.indexOf("="); m[kv.substring(0, i)] = kv.substring(i + 1); }); return { publie: +(m.published || m.p), cible: +(m.target || m.t), proto: m.protocol || "tcp", mode: m.mode || "ingress" }; }
	var r = lirePortArgPort(x);
	return { publie: r.hp || 30000 + (condense(x) % 2000), cible: r.cp, proto: r.proto, mode: "ingress" };
}
function lireSecretServicePort(h, x){
	var s = swarmPort(), m = {};
	if (/=/.test(x)) String(x).split(",").forEach(function(kv){ var i = kv.indexOf("="); m[kv.substring(0, i)] = kv.substring(i + 1); }); else m.source = x;
	var sec = Object.keys(s.secrets).map(function(k){ return s.secrets[k]; }).filter(function(z){ return z.nom === m.source || z.id === m.source; })[0];
	if (!sec) throw new ShellError("Error response from daemon: secret not found: " + m.source, 1);
	return { nom: sec.nom, id: sec.id, cible: "/run/secrets/" + (m.target || sec.nom) };
}
function specServicePort(h, d, base){
	var o = d.o, s = swarmPort();
	var spec = base ? copieJson(base) : { image: null, mode: "replicated", repliques: 1, env: [], ports: [], montages: [], tmpfs: {}, reseaux: [], contraintes: [], secrets: [], labels: {}, labelsConteneur: {}, memoire: 0, cpus: 0, sante: null, cmd: null, entrypoint: null, user: undefined, workdir: undefined,
		miseAJour: { parallelisme: 1, delai: 0, action: "pause", ordre: "stop-first" }, retourArriere: { parallelisme: 1, delai: 0, action: "pause", ordre: "stop-first" }, stack: null, alias: null, readOnly: false, capDrop: [], capAdd: [], secOpt: [] };
	if (o.mode){ if (["replicated", "global"].indexOf(o.mode) === -1) throw new ShellError("invalid argument \"" + o.mode + "\" for \"--mode\" flag: invalid replicated mode " + o.mode, 1); spec.mode = o.mode; }
	if (o.replicas !== undefined){ if (spec.mode === "global") throw new ShellError("replicas can only be used with replicated mode", 1); spec.repliques = +o.replicas; }
	listePort(o.env).concat(listePort(o["env-add"])).forEach(function(e){ var k = e.split("=")[0]; spec.env = spec.env.filter(function(x){ return x.split("=")[0] !== k; }); spec.env.push(e); });
	listePort(o["env-rm"]).forEach(function(k){ spec.env = spec.env.filter(function(x){ return x.split("=")[0] !== k; }); });
	listePort(o.publish).concat(listePort(o["publish-add"])).forEach(function(x){ var p = lirePublishServicePort(x); spec.ports = spec.ports.filter(function(q){ return +q.publie !== +p.publie; }); spec.ports.push(p); });
	listePort(o["publish-rm"]).forEach(function(x){ spec.ports = spec.ports.filter(function(q){ return String(q.publie) !== String(x).split(":")[0] && String(q.cible) !== String(x).split(":").pop(); }); });
	listePort(o.mount).concat(listePort(o["mount-add"])).forEach(function(x){ var m = lireMountArgPort(h, x); if (m.type === "tmpfs") spec.tmpfs[m.cible] = ""; else spec.montages.push(m); });
	listePort(o.network).concat(listePort(o["network-add"])).forEach(function(n){ if (!s.reseaux[n]) throw new ShellError("Error response from daemon: network " + n + " not found", 1); if (s.reseaux[n].ingress) throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = Service cannot be explicitly attached to the ingress network \"ingress\"", 1); if (spec.reseaux.indexOf(n) === -1) spec.reseaux.push(n); });
	listePort(o["network-rm"]).forEach(function(n){ spec.reseaux = spec.reseaux.filter(function(x){ return x !== n; }); });
	listePort(o.constraint).concat(listePort(o["constraint-add"])).forEach(function(c){ if (!/^\s*[\w.]+\s*(==|!=)\s*.+$/.test(c)) throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = ContainerSpec: invalid constraint: " + c, 1); spec.contraintes.push(c); });
	listePort(o["constraint-rm"]).forEach(function(c){ spec.contraintes = spec.contraintes.filter(function(x){ return x !== c; }); });
	listePort(o.secret).concat(listePort(o["secret-add"])).forEach(function(x){ var sc = lireSecretServicePort(h, x); spec.secrets = spec.secrets.filter(function(y){ return y.nom !== sc.nom; }); spec.secrets.push(sc); });
	listePort(o["secret-rm"]).forEach(function(n){ spec.secrets = spec.secrets.filter(function(y){ return y.nom !== n; }); });
	listePort(o.label).forEach(function(l){ var i = l.indexOf("="); spec.labels[i > 0 ? l.substring(0, i) : l] = i > 0 ? l.substring(i + 1) : ""; });
	listePort(o["container-label"]).forEach(function(l){ var i = l.indexOf("="); spec.labelsConteneur[i > 0 ? l.substring(0, i) : l] = i > 0 ? l.substring(i + 1) : ""; });
	if (o["limit-memory"]) spec.memoire = memoireDepuisPort(o["limit-memory"]);
	if (o["limit-cpu"]) spec.cpus = parseFloat(o["limit-cpu"]);
	if (o["no-healthcheck"]) spec.sante = { Test: ["NONE"] };
	else if (o["health-cmd"]){ spec.sante = { Test: ["CMD-SHELL", o["health-cmd"]] }; if (o["health-interval"]) spec.sante.Interval = dureeNsDepuisPort(o["health-interval"]); if (o["health-retries"]) spec.sante.Retries = +o["health-retries"]; if (o["health-timeout"]) spec.sante.Timeout = dureeNsDepuisPort(o["health-timeout"]); if (o["health-start-period"]) spec.sante.StartPeriod = dureeNsDepuisPort(o["health-start-period"]); }
	if (o["update-parallelism"] !== undefined) spec.miseAJour.parallelisme = +o["update-parallelism"];
	if (o["update-delay"]) spec.miseAJour.delai = dureeNsDepuisPort(o["update-delay"]) || 0;
	if (o["update-failure-action"]){ if (["pause", "continue", "rollback"].indexOf(o["update-failure-action"]) === -1) throw new ShellError("invalid argument \"" + o["update-failure-action"] + "\" for \"--update-failure-action\" flag", 1); spec.miseAJour.action = o["update-failure-action"]; }
	if (o["update-order"]) spec.miseAJour.ordre = o["update-order"];
	if (o["rollback-parallelism"] !== undefined) spec.retourArriere.parallelisme = +o["rollback-parallelism"];
	if (o["rollback-delay"]) spec.retourArriere.delai = dureeNsDepuisPort(o["rollback-delay"]) || 0;
	if (o["rollback-failure-action"]) spec.retourArriere.action = o["rollback-failure-action"];
	if (o.user !== undefined) spec.user = o.user;
	if (o.workdir) spec.workdir = o.workdir;
	if (o.hostname) spec.hostname = o.hostname;
	if (o.entrypoint) spec.entrypoint = o.entrypoint.split(/\s+/);
	if (o["read-only"]) spec.readOnly = true;
	listePort(o["cap-drop"]).forEach(function(c){ spec.capDrop.push(c.toUpperCase()); });
	listePort(o["cap-add"]).forEach(function(c){ spec.capAdd.push(c.toUpperCase()); });
	if (o["log-driver"] || o["log-opt"]){ spec.log = { type: o["log-driver"] || "json-file", opts: {} }; listePort(o["log-opt"]).forEach(function(x){ var i = x.indexOf("="); spec.log.opts[x.substring(0, i)] = x.substring(i + 1); }); }
	return spec;
}
/* L'image d'un service : son digest, si le gestionnaire peut lire le registre (sinon l'avertissement du vrai). */
function resoudreImageServicePort(h, ref, auth, io){
	var a = analyserRefPort(ref);
	if (a.digest) return ref;
	if (a.registre === REGISTRE_CONTINENT_PORT){
		var r = resoudreContinentPort(a.depot, a.tag, null);
		if (!r.erreur) return a.court + ":" + a.tag + "@" + r.image.digestDepot;
	} else {
		var j = joindreRegistrePort(h, a.registre, auth);
		if (!j.erreur && j.auth.ok){ var dg = digestTagRegistrePort(j.hr, j.cr, a.depot, a.tag); if (dg) return a.court + ":" + a.tag + "@" + dg; }
	}
	if (io) io.err("image " + nomCourtPort(ref) + " could not be accessed on a registry to record\nits digest. Each node will access " + nomCourtPort(ref) + " independently,\npossibly leading to different nodes running different\nversions of the image.\n");
	return nomCourtPort(ref);
}
function progresServicePort(sv, rollback){
	var n = voulusPort(sv), r = repliquesEnMarchePort(sv);
	var l = [sv.nom];
	if (rollback) l.push("rollback: manually requested rollback ");
	l.push("overall progress: " + (rollback ? "rolling back update: " : "") + r + " out of " + n + " tasks ");
	for (var i = 1; i <= n; i++){
		var t = tachesSwarmPort(sv).filter(function(x){ return x.slot === i && x.etatVoulu === "running"; })[0];
		var etat = t ? t.etat : "pending";
		l.push(i + "/" + n + ": " + completerDroite(etat === "running" ? "running" : (t && t.erreur ? t.erreur.substring(0, 40) : etat), 9) + " [" + (etat === "running" ? "==================================================>" : ">                                                 ") + "] ");
	}
	if (r === n) l.push("verify: Service " + sv.nom + " converged ");
	return l.join("\n");
}
function serviceSousPort(h, a, io){
	var s0 = a.shift();
	exigerGestionnairePort(h);
	var s = swarmPort();
	if (s0 === "create"){
		var d = lireDrapeauxPort(a, DEF_SERVICE_PORT, "service create", true);
		if (!d.reste.length) throw new ShellError("\"docker service create\" requires at least 1 argument.\nSee 'docker service create --help'.\n\nUsage:  docker service create [OPTIONS] IMAGE [COMMAND] [ARG...]\n\nCreate a new service", 1);
		var nom = d.o.name || ADJECTIFS_PORT[s.compteur % ADJECTIFS_PORT.length] + "_" + NOMS_MARINS_PORT[(s.compteur * 7) % NOMS_MARINS_PORT.length];
		if (serviceSwarmPort(nom) && serviceSwarmPort(nom).nom === nom) throw new ShellError("Error response from daemon: rpc error: code = AlreadyExists desc = name conflicts with an existing object: service " + nom + " already exists", 1);
		var spec = specServicePort(h, d, null);
		var auth = d.o["with-registry-auth"] ? identifiantsPort(h, analyserRefPort(d.reste[0]).registre, io) : null;
		spec.image = d.o["no-resolve-image"] ? nomCourtPort(d.reste[0]) : resoudreImageServicePort(h, d.reste[0], identifiantsPort(h, analyserRefPort(d.reste[0]).registre, io), io);
		if (d.reste.length > 1) spec.cmd = d.reste.slice(1);
		spec.ports.forEach(function(p){ var pris = servicesSwarmPort().some(function(x){ return x.spec.ports.some(function(q){ return +q.publie === +p.publie; }); }) || portsPrisPort(h).some(function(x){ return x.port === +p.publie; }); if (pris) throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = port '" + p.publie + "' is already in use by service '" + ((servicesSwarmPort().filter(function(x){ return x.spec.ports.some(function(q){ return +q.publie === +p.publie; }); })[0] || {}).nom || "(un conteneur)") + "' (" + ((servicesSwarmPort().filter(function(x){ return x.spec.ports.some(function(q){ return +q.publie === +p.publie; }); })[0] || {}).id || "") + ") as an ingress port", 1); });
		var sv = { id: idSwarmPort("service:" + nom + ":" + s.compteur++), nom: nom, spec: spec, version: 1, cree: maintenantPort(h), maj: null, auth: auth, detache: true, precedent: null };
		s.services[sv.id] = sv;
		evenementDockerPort(h, "service", "create", sv.id, { name: nom });
		evenementPort(h, "serviceCreate", { service: nom, image: spec.image, repliques: spec.repliques, auth: !!auth });
		reconcilierPort(sv);
		if (d.o.detach || d.o.quiet) return sv.id;
		var p = progresServicePort(sv, false).split("\n").slice(1).join("\n");
		return sv.id + "\n" + p + (convergePort(sv) ? "" : astuce(io, "Le service attend que ses tâches tournent ; docker service ps " + nom + " dit pourquoi. Ctrl+C rendrait la main, le service resterait créé."));
	}
	if (s0 === "ls" || s0 === "list"){
		var d2 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet"], valeurs: ["format", "filter"], repetables: ["filter"] }, "service ls");
		var l = servicesSwarmPort().slice().sort(function(x, y){ return x.nom < y.nom ? -1 : 1; });
		listePort(d2.o.filter).forEach(function(f){ var i = f.indexOf("="), k = f.substring(0, i), v = f.substring(i + 1); if (k === "name") l = l.filter(function(x){ return x.nom.indexOf(v) === 0; }); if (k === "label") l = l.filter(function(x){ return x.spec.labels.hasOwnProperty(v.split("=")[0]); }); });
		evenementPort(h, "serviceLs", { services: l.map(function(x){ return { nom: x.nom, enMarche: repliquesEnMarchePort(x), voulus: voulusPort(x) }; }) });
		if (d2.o.quiet) return l.map(function(x){ return x.id; }).join("\n");
		var objets = l.map(function(x){ return { __type: "formatter.serviceContext", ID: x.id.substring(0, 12), Name: x.nom, Mode: x.spec.mode, Replicas: repliquesEnMarchePort(x) + "/" + voulusPort(x) + (x.maj && x.maj.etat === "updating" ? " (update in progress)" : ""), Image: x.spec.image.replace(/@sha256:[0-9a-f]+$/, ""), Ports: x.spec.ports.map(function(p){ return "*:" + p.publie + "->" + p.cible + "/" + p.proto; }).join(", ") }; });
		if (d2.o.format) return formaterListePort(d2.o.format, objets, { ID: "ID", Name: "NAME", Mode: "MODE", Replicas: "REPLICAS", Image: "IMAGE", Ports: "PORTS" });
		return tableauPort(["ID", "NAME", "MODE", "REPLICAS", "IMAGE", "PORTS"], objets.map(function(o){ return [o.ID, o.Name, o.Mode, o.Replicas, o.Image, o.Ports]; }));
	}
	if (s0 === "ps"){
		var d3 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet", "no-trunc", "no-resolve"], valeurs: ["format", "filter"], repetables: ["filter"] }, "service ps");
		var svs = d3.reste.map(function(r){ var x = serviceSwarmPort(r); if (!x) throw new ShellError("no such service: " + r, 1); return x; });
		var taches = [];
		svs.forEach(function(x){ taches = taches.concat(tachesSwarmPort(x)); });
		listePort(d3.o.filter).forEach(function(f){ var i = f.indexOf("="), k = f.substring(0, i), v = f.substring(i + 1); if (k === "desired-state") taches = taches.filter(function(t){ return (t.etatVoulu === "running" ? "running" : "shutdown") === v; }); if (k === "node") taches = taches.filter(function(t){ return t.noeud === v; }); });
		evenementPort(h, "servicePs", { services: svs.map(function(x){ return x.nom; }), taches: taches.map(function(t){ return { noeud: t.noeud, etat: t.etat, voulu: t.etatVoulu, erreur: t.erreur, image: t.image }; }) });
		if (d3.o.format){ var s3 = swarmPort(); return taches.map(function(t){ return gabaritPort(d3.o.format, { ID: t.id.substring(0, 12), Name: (s3.services[t.service] || {}).nom + "." + t.slot, Image: t.image, Node: t.noeud, DesiredState: t.etatVoulu === "running" ? "Running" : "Shutdown", CurrentState: texteEtatTachePort(t), Error: t.erreur, Ports: "" }); }).join("\n"); }
		return tableauTachesPort(taches, !!d3.o["no-trunc"], !!d3.o.quiet);
	}
	if (s0 === "logs"){
		var d4 = lireDrapeauxPort(a, { court: { f: "follow", t: "timestamps", n: "tail" }, booleens: ["follow", "timestamps", "no-trunc", "no-task-ids", "raw", "no-resolve"], valeurs: ["tail", "since"] }, "service logs");
		var sv4 = serviceSwarmPort(d4.reste[0]);
		if (!sv4) throw new ShellError("Error response from daemon: service " + (d4.reste[0] || "") + " not found", 1);
		var lignes = [];
		tachesSwarmPort(sv4).forEach(function(t){
			var c = t.conteneur ? etatPort(t.noeud).conteneurs[t.conteneur] : null;
			if (!c) return;
			c.journaux.forEach(function(j){ lignes.push({ t: j.t, l: (d4.o.raw ? "" : sv4.nom + "." + t.slot + "." + t.id.substring(0, 12) + "@" + t.noeud + "    | ") + j.l }); });
		});
		lignes.sort(function(x, y){ return x.t - y.t; });
		if (d4.o.tail !== undefined && d4.o.tail !== "all") lignes = lignes.slice(-(+d4.o.tail));
		evenementPort(h, "serviceLogs", { service: sv4.nom, lignes: lignes.length });
		return lignes.map(function(x){ return x.l; }).join("\n");
	}
	if (s0 === "inspect"){
		var d5 = lireDrapeauxPort(a, { court: { f: "format" }, valeurs: ["format"], booleens: ["pretty"] }, "service inspect");
		var svs5 = d5.reste.map(function(r){ var x = serviceSwarmPort(r); if (!x) throw new ShellError("Status: Error: no such service: " + r + ", Code: 1", 1); return x; });
		evenementPort(h, "serviceInspect", { services: svs5.map(function(x){ return x.nom; }), images: svs5.map(function(x){ return x.spec.image; }), pretty: !!d5.o.pretty, format: d5.o.format || null });
		if (d5.o.pretty) return svs5.map(prettyServicePort).join("\n\n");
		var objs = svs5.map(inspectServicePort);
		if (d5.o.format) return objs.map(function(o){ return gabaritPort(d5.o.format, o); }).join("\n");
		return jsonDockerPort(objs.map(sansMetaPort));
	}
	if (s0 === "scale"){
		var d6 = lireDrapeauxPort(a, { court: { d: "detach" }, booleens: ["detach"] }, "service scale");
		return d6.reste.map(function(x){
			var m = /^(.+)=(\d+)$/.exec(x);
			if (!m) throw new ShellError("invalid scale specifier '" + x + "'.\nSee 'docker service scale --help'.", 1);
			var sv6 = serviceSwarmPort(m[1]);
			if (!sv6) throw new ShellError("Error response from daemon: service " + m[1] + " not found", 1);
			if (sv6.spec.mode === "global") throw new ShellError(m[1] + ": scale can only be used with replicated mode", 1);
			sv6.spec.repliques = +m[2];
			reconcilierPort(sv6);
			evenementDockerPort(h, "service", "update", sv6.id, { name: sv6.nom, "replicas.new": m[2] });
			evenementPort(h, "serviceScale", { service: sv6.nom, repliques: +m[2] });
			return sv6.nom + " scaled to " + m[2] + (d6.o.detach ? "" : "\n" + progresServicePort(sv6, false).split("\n").slice(1).join("\n"));
		}).join("\n");
	}
	if (s0 === "update"){
		var d7 = lireDrapeauxPort(a, DEF_SERVICE_PORT, "service update");
		var sv7 = serviceSwarmPort(d7.reste[0]);
		if (!sv7) throw new ShellError("Error response from daemon: service " + (d7.reste[0] || "") + " not found", 1);
		if (d7.o.rollback) return rollbackServicePort(h, sv7, !!d7.o.detach, io);
		var ancienne = copieJson(sv7.spec);
		var spec7 = specServicePort(h, d7, sv7.spec);
		if (d7.o.image) spec7.image = resoudreImageServicePort(h, d7.o.image, identifiantsPort(h, analyserRefPort(d7.o.image).registre, io), io);
		if (d7.o["with-registry-auth"]) sv7.auth = identifiantsPort(h, analyserRefPort(spec7.image).registre, io);
		var seulementEchelle = JSON.stringify(ancienne.repliques) !== JSON.stringify(spec7.repliques) && JSON.stringify(copieJson(ancienne).image) === JSON.stringify(spec7.image) && Object.keys(d7.o).every(function(k){ return k === "replicas" || k === "detach"; });
		var changeTaches = JSON.stringify(Object.assign ? (function(){ var x = copieJson(ancienne); delete x.repliques; delete x.miseAJour; delete x.retourArriere; delete x.labels; return x; })() : {}) !== JSON.stringify((function(){ var x = copieJson(spec7); delete x.repliques; delete x.miseAJour; delete x.retourArriere; delete x.labels; return x; })()) || d7.o.force;
		sv7.precedent = ancienne;
		sv7.spec = spec7;
		evenementDockerPort(h, "service", "update", sv7.id, { name: sv7.nom });
		if (changeTaches){
			sv7.version++;
			sv7.maj = { etat: "updating", debut: maintenantPort(h), message: "update in progress" };
			sv7.detache = !!d7.o.detach;
		}
		evenementPort(h, "serviceUpdate", { service: sv7.nom, image: spec7.image, parallelisme: spec7.miseAJour.parallelisme, delai: spec7.miseAJour.delai, detache: !!d7.o.detach, taches: changeTaches });
		if (!changeTaches){ reconcilierPort(sv7); return sv7.nom + (d7.o.detach ? "" : "\n" + progresServicePort(sv7, false).split("\n").slice(1).join("\n")); }
		if (d7.o.detach) return sv7.nom;
		while (pasMiseAJourPort(sv7)){}
		var fin = sv7.maj.etat;
		var out = progresServicePort(sv7, false);
		if (fin === "paused") return out + "\nservice update paused: " + sv7.maj.message;
		if (fin === "rollback_started" || fin === "rollback_completed"){ while (pasMiseAJourPort(sv7)){} return out + "\nservice rolled back: rollback completed"; }
		return out;
	}
	if (s0 === "rollback"){
		var d8 = lireDrapeauxPort(a, { court: { d: "detach", q: "quiet" }, booleens: ["detach", "quiet"] }, "service rollback");
		var sv8 = serviceSwarmPort(d8.reste[0]);
		if (!sv8) throw new ShellError("Error response from daemon: service " + (d8.reste[0] || "") + " not found", 1);
		return rollbackServicePort(h, sv8, !!d8.o.detach, io);
	}
	if (s0 === "rm" || s0 === "remove"){
		return a.filter(function(x){ return x.charAt(0) !== "-"; }).map(function(r){
			var sv9 = serviceSwarmPort(r);
			if (!sv9) throw new ShellError("Error: no such service: " + r, 1);
			tachesSwarmPort(sv9).forEach(function(t){ arreterTachePort(t, "removed"); var c = t.conteneur ? etatPort(t.noeud).conteneurs[t.conteneur] : null; if (c) supprimerConteneurPort(t.noeud, c, true); delete s.taches[t.id]; });
			delete s.services[sv9.id];
			evenementDockerPort(h, "service", "remove", sv9.id, { name: sv9.nom });
			evenementPort(h, "serviceRm", { service: sv9.nom });
			return r;
		}).join("\n");
	}
	return "\nUsage:  docker service COMMAND\n\nManage Swarm services\n\nCommands:\n  create      Create a new service\n  inspect     Display detailed information on one or more services\n  logs        Fetch the logs of a service or task\n  ls          List services\n  ps          List the tasks of one or more services\n  rm          Remove one or more services\n  rollback    Revert changes to a service's configuration\n  scale       Scale one or multiple replicated services\n  update      Update a service\n\nRun 'docker service COMMAND --help' for more information on a command.";
}
function rollbackServicePort(h, sv, detache, io){
	if (!sv.precedent) throw new ShellError("Error response from daemon: rpc error: code = FailedPrecondition desc = service " + sv.id + " does not have a previous spec", 1);
	demarrerRetourArrierePort(sv, "manually requested rollback");
	sv.detache = detache;
	evenementPort(h, "serviceRollback", { service: sv.nom, image: sv.spec.image });
	if (detache) return sv.nom;
	while (pasMiseAJourPort(sv)){}
	return progresServicePort(sv, true);
}
function inspectServicePort(sv){
	var sp = sv.spec;
	var o = { __type: "swarm.Service", ID: sv.id, Version: { Index: 10 + sv.version }, CreatedAt: dateIsoPort(sv.cree), UpdatedAt: dateIsoPort(sv.maj && sv.maj.debut || sv.cree),
		Spec: { Name: sv.nom, Labels: (function(){ var t = { __table: true }; Object.keys(sp.labels || {}).forEach(function(k){ t[k] = sp.labels[k]; }); return t; })(),
			TaskTemplate: { ContainerSpec: { Image: sp.image, Labels: (function(){ var t = { __table: true }; Object.keys(sp.labelsConteneur || {}).forEach(function(k){ t[k] = sp.labelsConteneur[k]; }); return t; })(), Args: sp.cmd || undefined, Env: sp.env.length ? sp.env.slice() : undefined, User: sp.user,
				Init: false, Mounts: (sp.montages || []).map(function(m){ return { Type: m.type, Source: m.source, Target: m.cible, ReadOnly: !!m.ro }; }), Secrets: (sp.secrets || []).map(function(x){ return { File: { Name: x.cible.replace(/^\/run\/secrets\//, ""), UID: "0", GID: "0", Mode: 292 }, SecretID: x.id, SecretName: x.nom }; }),
				Healthcheck: sp.sante || undefined, StopGracePeriod: 10000000000, DNSConfig: {}, Isolation: "default" },
				Resources: { Limits: sp.memoire || sp.cpus ? { NanoCPUs: Math.round((sp.cpus || 0) * 1e9), MemoryBytes: sp.memoire || 0 } : {}, Reservations: {} }, RestartPolicy: { Condition: "any", Delay: 5000000000, MaxAttempts: 0 },
				Placement: { Constraints: sp.contraintes.length ? sp.contraintes.slice() : undefined, Platforms: [{ Architecture: "amd64", OS: "linux" }] }, Networks: sp.reseaux.map(function(n){ return { Target: swarmPort().reseaux[n].id, Aliases: [sp.alias || sv.nom] }; }), ForceUpdate: 0, Runtime: "container" },
			Mode: sp.mode === "global" ? { Global: {} } : { Replicated: { Replicas: sp.repliques } },
			UpdateConfig: { Parallelism: sp.miseAJour.parallelisme, Delay: sp.miseAJour.delai || 0, FailureAction: sp.miseAJour.action, Monitor: 5000000000, MaxFailureRatio: 0, Order: sp.miseAJour.ordre },
			RollbackConfig: { Parallelism: sp.retourArriere.parallelisme, Delay: sp.retourArriere.delai || 0, FailureAction: sp.retourArriere.action, Monitor: 5000000000, MaxFailureRatio: 0, Order: sp.retourArriere.ordre },
			EndpointSpec: { Mode: "vip", Ports: sp.ports.map(function(p){ return { Protocol: p.proto, TargetPort: +p.cible, PublishedPort: +p.publie, PublishMode: "ingress" }; }) } },
		PreviousSpec: sv.precedent ? { Name: sv.nom, TaskTemplate: { ContainerSpec: { Image: sv.precedent.image } } } : undefined,
		Endpoint: { Spec: { Mode: "vip", Ports: sp.ports.map(function(p){ return { Protocol: p.proto, TargetPort: +p.cible, PublishedPort: +p.publie, PublishMode: "ingress" }; }) }, Ports: sp.ports.map(function(p){ return { Protocol: p.proto, TargetPort: +p.cible, PublishedPort: +p.publie, PublishMode: "ingress" }; }), VirtualIPs: [] },
		UpdateStatus: sv.maj ? { State: sv.maj.etat, StartedAt: dateIsoPort(sv.maj.debut), CompletedAt: sv.maj.fin ? dateIsoPort(sv.maj.fin) : undefined, Message: sv.maj.message } : undefined };
	return o;
}
function prettyServicePort(sv){
	var sp = sv.spec;
	var l = ["ID:\t\t" + sv.id, "Name:\t\t" + sv.nom];
	if (Object.keys(sp.labels).length){ l.push("Labels:"); Object.keys(sp.labels).forEach(function(k){ l.push(" " + k + "=" + sp.labels[k]); }); }
	l.push("Service Mode:\t" + (sp.mode === "global" ? "Global" : "Replicated"));
	if (sp.mode !== "global") l.push(" Replicas:\t" + sp.repliques);
	if (sv.maj){ l.push("UpdateStatus:", " State:\t\t" + sv.maj.etat, " Started:\t" + ilYaPort("docks", sv.maj.debut)); if (sv.maj.fin) l.push(" Completed:\t" + ilYaPort("docks", sv.maj.fin)); l.push(" Message:\t" + sv.maj.message); }
	l.push("Placement:"); if (sp.contraintes.length) l.push(" Constraints:\t[" + sp.contraintes.join(" ") + "]");
	l.push("UpdateConfig:", " Parallelism:\t" + sp.miseAJour.parallelisme); if (sp.miseAJour.delai) l.push(" Delay:\t\t" + texteDureeNsPort(sp.miseAJour.delai));
	l.push(" On failure:\t" + sp.miseAJour.action, " Monitoring Period: 5s", " Max failure ratio: 0", " Update order:      " + sp.miseAJour.ordre);
	l.push("RollbackConfig:", " Parallelism:\t" + sp.retourArriere.parallelisme, " On failure:\t" + sp.retourArriere.action, " Monitoring Period: 5s", " Max failure ratio: 0", " Rollback order:    " + sp.retourArriere.ordre);
	l.push("ContainerSpec:", " Image:\t\t" + sp.image);
	if (sp.cmd) l.push(" Args:\t\t" + sp.cmd.join(" ") + " ");
	if (sp.env.length) l.push(" Env:\t\t" + sp.env.join(" "));
	l.push(" Init:\t\tfalse");
	if (sp.secrets.length){ l.push("Secrets:"); sp.secrets.forEach(function(x){ l.push(" Target:\t" + x.cible.replace(/^\/run\/secrets\//, ""), "  Source:\t" + x.nom); }); }
	if (sp.montages.length){ l.push("Mounts:"); sp.montages.forEach(function(m){ l.push(" Target:\t" + m.cible, "  Source:\t" + m.source, "  ReadOnly:\t" + !!m.ro, "  Type:\t\t" + m.type); }); }
	l.push("Resources:"); if (sp.memoire) l.push(" Limits:", "  Memory:\t" + tailleBinPort(sp.memoire));
	if (sp.reseaux.length) l.push("Networks: " + sp.reseaux.join(" ") + " ");
	l.push("Endpoint Mode:\tvip");
	if (sp.ports.length){ l.push("Ports:"); sp.ports.forEach(function(p){ l.push(" PublishedPort = " + p.publie, "  Protocol = " + p.proto, "  TargetPort = " + p.cible, "  PublishMode = ingress"); }); }
	return l.join("\n") + " ";
}
function inspecterSwarmPort(h, ref, type){
	if (!swarmActifPort(h) || !estGestionnairePort(h)) return null;
	if (!type || type === "service"){ var sv = serviceSwarmPort(ref); if (sv) return inspectServicePort(sv); }
	if (!type || type === "node"){ var n = noeudPort(ref); if (n) return { __type: "swarm.Node", ID: n.id, Spec: { Role: n.role, Availability: n.dispo, Labels: n.labels }, Description: { Hostname: n.hote }, Status: { State: noeudPretPort(n) ? "ready" : "down", Addr: ipPort(n.hote) } }; }
	if (!type || type === "secret"){ var s = swarmPort(); var sec = Object.keys(s.secrets).map(function(k){ return s.secrets[k]; }).filter(function(x){ return x.nom === ref || x.id === ref; })[0]; if (sec) return inspectSecretPort(sec); }
	return null;
}

/* ---------------- secret ---------------- */

function inspectSecretPort(sec){ return { __type: "swarm.Secret", ID: sec.id, Version: { Index: 11 }, CreatedAt: dateIsoPort(sec.cree), UpdatedAt: dateIsoPort(sec.cree), Spec: { Name: sec.nom, Labels: sec.labels || {} } }; }
function secretSousPort(h, a, io){
	var s0 = a.shift();
	exigerGestionnairePort(h);
	var s = swarmPort();
	var liste = function(){ return Object.keys(s.secrets).map(function(k){ return s.secrets[k]; }); };
	if (s0 === "create"){
		var d = lireDrapeauxPort(a, { court: { l: "label", d: "driver" }, valeurs: ["label", "driver", "template-driver"], repetables: ["label"] }, "secret create");
		if (d.reste.length !== 2) throw new ShellError("\"docker secret create\" requires exactly 2 arguments.\nSee 'docker secret create --help'.\n\nUsage:  docker secret create [OPTIONS] SECRET [file|-]\n\nCreate a secret from a file or STDIN as content", 1);
		var nom = d.reste[0];
		if (liste().some(function(x){ return x.nom === nom; })) throw new ShellError("Error response from daemon: rpc error: code = AlreadyExists desc = secret " + nom + " already exists", 1);
		var donnees;
		if (d.reste[1] === "-") donnees = io.stdin || "";
		else { var r = Shell.chercher(d.reste[1], io, "docker"); if (!(r.node instanceof Item)) throw new ShellError("open " + d.reste[1] + ": no such file or directory", 1); if (!io.sudo && !Shell.bit(r.node, "r", io)) throw new ShellError("open " + d.reste[1] + ": permission denied", 1); donnees = r.node.getText(); }
		if (donnees === "") throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = secret data must be larger than 0 and less than 500 KiB", 1);
		var sec = { id: idSwarmPort("secret:" + nom + ":" + s.id), nom: nom, donnees: donnees, cree: maintenantPort(h), labels: {} };
		s.secrets[sec.id] = sec;
		evenementDockerPort(h, "secret", "create", sec.id, { name: nom });
		evenementPort(h, "secretCreate", { nom: nom, depuisStdin: d.reste[1] === "-" });
		return sec.id;
	}
	if (s0 === "ls" || s0 === "list"){
		var d2 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet"], valeurs: ["format", "filter"], repetables: ["filter"] }, "secret ls");
		evenementPort(h, "secretLs", { secrets: liste().map(function(x){ return x.nom; }) });
		if (d2.o.quiet) return liste().map(function(x){ return x.id; }).join("\n");
		return tableauPort(["ID", "NAME", "DRIVER", "CREATED", "UPDATED"], liste().sort(function(x, y){ return x.nom < y.nom ? -1 : 1; }).map(function(x){ return [x.id, x.nom, "", ilYaPort(h, x.cree), ilYaPort(h, x.cree)]; }));
	}
	if (s0 === "inspect"){
		var d3 = lireDrapeauxPort(a, { court: { f: "format" }, valeurs: ["format"], booleens: ["pretty"] }, "secret inspect");
		var objs = d3.reste.map(function(r){ var x = liste().filter(function(y){ return y.nom === r || y.id === r; })[0]; if (!x) throw new ShellError("Error response from daemon: no such secret: " + r, 1); return inspectSecretPort(x); });
		if (d3.o.pretty) return objs.map(function(o){ return "ID:              " + o.ID + "\nName:              " + o.Spec.Name + "\nDriver:            \nCreated at:        " + o.CreatedAt + "\nUpdated at:        " + o.UpdatedAt; }).join("\n\n");
		if (d3.o.format) return objs.map(function(o){ return gabaritPort(d3.o.format, o); }).join("\n");
		return jsonDockerPort(objs.map(sansMetaPort));
	}
	if (s0 === "rm" || s0 === "remove"){
		return a.map(function(r){
			var x = liste().filter(function(y){ return y.nom === r || y.id === r; })[0];
			if (!x) throw new ShellError("Error response from daemon: no such secret: " + r, 1);
			var users = servicesSwarmPort().filter(function(sv){ return sv.spec.secrets.some(function(z){ return z.id === x.id; }); });
			if (users.length) throw new ShellError("Error response from daemon: rpc error: code = InvalidArgument desc = secret '" + x.nom + "' is in use by the following service: " + users.map(function(u){ return u.nom; }).join(", "), 1);
			delete s.secrets[x.id];
			evenementDockerPort(h, "secret", "remove", x.id, { name: x.nom });
			return r;
		}).join("\n");
	}
	return "\nUsage:  docker secret COMMAND\n\nManage Swarm secrets\n\nCommands:\n  create      Create a secret from a file or STDIN as content\n  inspect     Display detailed information on one or more secrets\n  ls          List secrets\n  rm          Remove one or more secrets\n\nRun 'docker secret COMMAND --help' for more information on a command.";
}

/* ---------------- stack ---------------- */

function stackSousPort(h, a, io){
	var s0 = a.shift();
	exigerGestionnairePort(h);
	var s = swarmPort();
	if (s0 === "deploy" || s0 === "up"){
		var d = lireDrapeauxPort(a, { court: { c: "compose-file" }, valeurs: ["compose-file", "resolve-image"], booleens: ["with-registry-auth", "prune", "detach", "quiet"], repetables: ["compose-file"] }, "stack deploy");
		if (d.reste.length !== 1) throw new ShellError("\"docker stack deploy\" requires exactly 1 argument.\nSee 'docker stack deploy --help'.\n\nUsage:  docker stack deploy [OPTIONS] STACK\n\nDeploy a new stack or update an existing stack", 1);
		if (!d.o["compose-file"]) throw new ShellError("Please specify only one compose file (with --compose-file).", 1);
		var nomStack = d.reste[0];
		var p = chargerProjetComposePort(h, { file: listePort(d.o["compose-file"]) }, io);
		p.nom = nomStack;
		var lignes = [];
		var ignores = {};
		Object.keys(p.config.services).forEach(function(sn){ ["build", "restart", "container_name", "depends_on", "mem_limit", "cpus", "links", "network_mode", "security_opt"].forEach(function(k){ if (p.config.services[sn][k] !== undefined && k !== "depends_on") ignores[k] = true; }); });
		if (Object.keys(ignores).length) lignes.push("Ignoring unsupported options: " + Object.keys(ignores).sort().join(", "), "");
		// Les réseaux de la pile (overlay).
		var reseaux = {};
		Object.keys(p.config.services).forEach(function(sn){ reseauxServiceComposePort(p.config.services[sn]).forEach(function(x){ reseaux[x.nom] = true; }); });
		Object.keys(reseaux).forEach(function(n){
			var def = p.config.networks[n] || {}, nom = def.external ? (def.name || n) : nomStack + "_" + n;
			if (def.external){ if (!s.reseaux[nom]) throw new ShellError("network \"" + nom + "\" is declared as external, but could not be found. You need to create a swarm-scoped network before the stack is deployed", 1); return; }
			if (!s.reseaux[nom]){ creerReseauOverlayPort(h, nom, { interne: !!def.internal, attachable: !!def.attachable, labels: { "com.docker.stack.namespace": nomStack } }); lignes.push("Creating network " + nom); }
		});
		// Les secrets de la pile.
		Object.keys(p.config.secrets).forEach(function(n){
			var def = p.config.secrets[n] || {}, nom = def.external ? (def.name || n) : (def.name || nomStack + "_" + n);
			var existe = Object.keys(s.secrets).map(function(k){ return s.secrets[k]; }).filter(function(x){ return x.nom === nom; })[0];
			if (def.external){ if (!existe) throw new ShellError("service " + Object.keys(p.config.services)[0] + ": secret not found: " + nom, 1); return; }
			if (existe) return;
			var t = def.file ? texteHote(h, cheminNormal(String(def.file).charAt(0) === "/" ? def.file : p.dossier + "/" + def.file)) : (def.environment ? (p.vars[def.environment] || "") : null);
			if (t === null) throw new ShellError("open " + cheminNormal(p.dossier + "/" + def.file) + ": no such file or directory", 1);
			var sec = { id: idSwarmPort("secret:" + nom + ":" + s.id), nom: nom, donnees: t, cree: maintenantPort(h), labels: { "com.docker.stack.namespace": nomStack } };
			s.secrets[sec.id] = sec;
			lignes.push("Creating secret " + nom);
		});
		var auth = d.o["with-registry-auth"];
		Object.keys(p.config.services).forEach(function(sn){
			var sv = p.config.services[sn], nomService = nomStack + "_" + sn;
			if (!sv.image) throw new ShellError("Since --detach=false was not specified, tasks will be created in the background.\ninvalid image reference for service " + sn + ": no image specified", 1);
			var dep = sv.deploy || {};
			var faux = { o: {}, reste: [] };
			faux.o.replicas = dep.replicas !== undefined ? dep.replicas : 1;
			if (dep.mode === "global"){ faux.o.mode = "global"; delete faux.o.replicas; }
			faux.o.env = envServiceComposePort(h, p, sv);
			faux.o.publish = listePort(sv.ports).map(function(x){ if (typeof x === "object") return "published=" + x.published + ",target=" + x.target; return String(x); });
			faux.o.constraint = listePort(dep.placement && dep.placement.constraints);
			var lim = dep.resources && dep.resources.limits;
			if (lim && lim.memory) faux.o["limit-memory"] = String(lim.memory);
			if (lim && lim.cpus) faux.o["limit-cpu"] = String(lim.cpus);
			var uc = dep.update_config || {};
			if (uc.parallelism !== undefined) faux.o["update-parallelism"] = uc.parallelism;
			if (uc.delay) faux.o["update-delay"] = uc.delay;
			if (uc.failure_action) faux.o["update-failure-action"] = uc.failure_action;
			if (uc.order) faux.o["update-order"] = uc.order;
			var rc = dep.rollback_config || {};
			if (rc.parallelism !== undefined) faux.o["rollback-parallelism"] = rc.parallelism;
			if (sv.healthcheck && sv.healthcheck.test){ faux.o["health-cmd"] = typeof sv.healthcheck.test === "string" ? sv.healthcheck.test : (sv.healthcheck.test[0] === "CMD-SHELL" ? sv.healthcheck.test.slice(1).join(" ") : sv.healthcheck.test.slice(1).join(" ")); if (sv.healthcheck.interval) faux.o["health-interval"] = sv.healthcheck.interval; if (sv.healthcheck.retries) faux.o["health-retries"] = sv.healthcheck.retries; }
			faux.o.secret = listePort(sv.secrets).map(function(x){ var n = typeof x === "string" ? x : x.source, def = p.config.secrets[n] || {}, nomS = def.external ? (def.name || n) : (def.name || nomStack + "_" + n); return "source=" + nomS + ",target=" + (typeof x === "object" && x.target ? x.target : n); });
			faux.o.network = reseauxServiceComposePort(sv).map(function(x){ var def = p.config.networks[x.nom] || {}; return def.external ? (def.name || x.nom) : nomStack + "_" + x.nom; });
			faux.o.mount = listePort(sv.volumes).map(function(v){ var m = montageComposePort(h, p, v); return m.type === "bind" ? "type=bind,source=" + m.source + ",target=" + m.cible + (m.ro ? ",readonly" : "") : (m.type === "tmpfs" ? "type=tmpfs,target=" + m.cible : "type=volume,source=" + nomStack + "_" + (m.nomCourt || "") + ",target=" + m.cible + (m.ro ? ",readonly" : "")); });
			faux.o.label = ["com.docker.stack.image=" + sv.image, "com.docker.stack.namespace=" + nomStack];
			faux.o["container-label"] = ["com.docker.stack.namespace=" + nomStack];
			if (sv.user !== undefined) faux.o.user = String(sv.user);
			if (sv.read_only) faux.o["read-only"] = true;
			faux.o["cap-drop"] = listePort(sv.cap_drop); faux.o["cap-add"] = listePort(sv.cap_add);
			var spec;
			// Les montages de la pile : un volume nommé par service et par navire (comme le vrai).
			var existant = serviceSwarmPort(nomService);
			try { spec = specServicePort(h, faux, null); }
			catch (e){ throw e; }
			spec.stack = nomStack; spec.alias = sn;
			spec.tmpfs = {}; listePort(sv.tmpfs).forEach(function(t){ spec.tmpfs[cheminNormal(String(t).split(":")[0])] = ""; });
			if (sv.security_opt) spec.secOpt = listePort(sv.security_opt).map(function(x){ return /^no-new-privileges/.test(x) ? "no-new-privileges" : x; });
			if (sv.command) spec.cmd = typeof sv.command === "string" ? sv.command.split(/\s+/) : sv.command.map(String);
			var authSv = auth ? identifiantsPort(h, analyserRefPort(sv.image).registre, io) : null;
			spec.image = d.o["resolve-image"] === "never" ? nomCourtPort(sv.image) : resoudreImageServicePort(h, sv.image, identifiantsPort(h, analyserRefPort(sv.image).registre, io), null);
			if (existant){
				existant.precedent = existant.spec;
				var change = JSON.stringify(existant.spec) !== JSON.stringify(spec);
				existant.spec = spec;
				if (auth) existant.auth = authSv;
				if (change){ existant.version++; existant.maj = { etat: "updating", debut: maintenantPort(h), message: "update in progress" }; existant.detache = true; while (pasMiseAJourPort(existant)){} }
				else reconcilierPort(existant);
				lignes.push("Updating service " + nomService + " (id: " + existant.id + ")");
			} else {
				var nv = { id: idSwarmPort("service:" + nomService + ":" + s.compteur++), nom: nomService, spec: spec, version: 1, cree: maintenantPort(h), maj: null, auth: authSv, detache: true, precedent: null };
				s.services[nv.id] = nv;
				evenementDockerPort(h, "service", "create", nv.id, { name: nomService });
				reconcilierPort(nv);
				lignes.push("Creating service " + nomService);
			}
		});
		if (d.o.prune) servicesSwarmPort().filter(function(x){ return x.spec.stack === nomStack && !p.config.services[x.nom.substring(nomStack.length + 1)]; }).forEach(function(x){ serviceSousPort(h, ["rm", x.nom], io); lignes.push("Removing service " + x.nom); });
		s.stacks[nomStack] = { fichier: listePort(d.o["compose-file"])[0], dossier: p.dossier, deploye: maintenantPort(h), auth: !!auth };
		evenementPort(h, "stackDeploy", { stack: nomStack, services: Object.keys(p.config.services).map(function(x){ return nomStack + "_" + x; }), auth: !!auth });
		return lignes.join("\n");
	}
	var servicesDe = function(n){ return servicesSwarmPort().filter(function(x){ return x.spec.stack === n; }); };
	if (s0 === "ls" || s0 === "list"){
		var noms = {}; servicesSwarmPort().forEach(function(x){ if (x.spec.stack) noms[x.spec.stack] = (noms[x.spec.stack] || 0) + 1; });
		evenementPort(h, "stackLs", { stacks: Object.keys(noms) });
		return tableauPort(["NAME", "SERVICES"], Object.keys(noms).sort().map(function(n){ return [n, noms[n]]; }));
	}
	if (s0 === "services"){
		var n2 = a.filter(function(x){ return x.charAt(0) !== "-"; })[0];
		if (!servicesDe(n2).length) return "Nothing found in stack: " + n2;
		evenementPort(h, "stackServices", { stack: n2 });
		return serviceSousPort(h, ["ls", "--filter", "label=com.docker.stack.namespace=" + n2].concat(a.filter(function(x){ return x.charAt(0) === "-"; })), io).split("\n").filter(function(l, i){ return i === 0 || servicesDe(n2).some(function(x){ return l.indexOf(" " + x.nom + " ") > -1; }); }).join("\n");
	}
	if (s0 === "ps"){
		var d3 = lireDrapeauxPort(a, { court: { q: "quiet", f: "filter" }, booleens: ["quiet", "no-trunc", "no-resolve"], valeurs: ["format", "filter"], repetables: ["filter"] }, "stack ps");
		var n3 = d3.reste[0];
		var svs = servicesDe(n3);
		if (!svs.length) return "nothing found in stack: " + n3;
		var taches = []; svs.forEach(function(x){ taches = taches.concat(tachesSwarmPort(x)); });
		listePort(d3.o.filter).forEach(function(f){ if (/^desired-state=running$/.test(f)) taches = taches.filter(function(t){ return t.etatVoulu === "running"; }); });
		evenementPort(h, "stackPs", { stack: n3, taches: taches.map(function(t){ return { noeud: t.noeud, etat: t.etat, voulu: t.etatVoulu }; }) });
		return tableauTachesPort(taches, !!d3.o["no-trunc"], !!d3.o.quiet);
	}
	if (s0 === "rm" || s0 === "remove" || s0 === "down"){
		var n4 = a.filter(function(x){ return x.charAt(0) !== "-"; })[0];
		var svs4 = servicesDe(n4);
		if (!svs4.length) return "Nothing found in stack: " + n4;
		var l4 = [];
		svs4.forEach(function(x){ serviceSousPort(h, ["rm", x.nom], io); l4.push("Removing service " + x.nom); });
		Object.keys(s.secrets).forEach(function(k){ var x = s.secrets[k]; if (x.labels && x.labels["com.docker.stack.namespace"] === n4){ delete s.secrets[k]; l4.push("Removing secret " + x.nom); } });
		Object.keys(s.reseaux).forEach(function(k){ var r = s.reseaux[k]; if (r.labels && r.labels["com.docker.stack.namespace"] === n4){ delete s.reseaux[k]; HOTES_DOCKER_PORT.forEach(function(hh){ var M = state.reseau.machines[hh]; if (M && M.port && M.port.reseaux[r.id]) delete M.port.reseaux[r.id]; }); l4.push("Removing network " + k); } });
		delete s.stacks[n4];
		evenementPort(h, "stackRm", { stack: n4 });
		return l4.join("\n");
	}
	return "\nUsage:  docker stack [OPTIONS] COMMAND\n\nManage Swarm stacks\n\nCommands:\n  deploy      Deploy a new stack or update an existing stack\n  ls          List stacks\n  ps          List the tasks in the stack\n  rm          Remove one or more stacks\n  services    List the services in the stack\n\nRun 'docker stack COMMAND --help' for more information on a command.";
}
