/**
 * SortsMachines.js : le moteur des machines « modélisées » (chapitre 6), première partie : les disques.
 *
 * Une machine modélisée est une machine du réseau (decrireHote) dont le monde déclare aussi le matériel et l'état
 * d'exploitation avec declarerMachine(hote, def) : processeurs, mémoire, disques et partitions, grappe RAID,
 * volumes LVM, systèmes de fichiers (taille, inodes, réservé, erreurs), processus. Les commandes lisent cet état
 * au moment où on les lance et le changent comme le vrai outil : df après lvextend et resize2fs, free après
 * swapon, ps après kill ou renice, /proc/mdstat pendant une reconstruction...
 *
 * Cette première partie : le registre des machines, l'horloge (une commande = def.pas minutes), les tailles
 * (item.taille, en octets, pour un fichier énorme dont le texte ne dit pas le poids), les dossiers « virtuels »
 * (des dizaines de milliers de fichiers de session, comptés sans être créés un par un), les systèmes de fichiers
 * et leurs montages, LVM, RAID logiciel, SMART, e2fsck et tune2fs, fstab, blkid, lsblk, findmnt, mount, umount,
 * fuser, l'échange (fallocate, mkswap, swapon, swapoff), df, du, ncdu, stat, find, ls, rm sur les dossiers
 * virtuels, les quotas, updatedb et locate.
 *
 * Les processus, la mémoire, systemd et les journaux sont dans SortsProcessus.js ; les archives, les paquets,
 * l'heure, curl et le manuel dans SortsExploitation.js. Ailleurs (une machine non modélisée), chaque commande
 * étendue garde son comportement d'avant.
 *
 * --- Ce que le monde (un chapitre) appelle ---
 *   declarerMachine(hote, { initial: function(){ return { ... }; }, maintenant: function(){ return ms; }, pas: 2,
 *                   actif: function(){ return bool; }, tic: function(hote, M){}, fournisseurs: { chemin: function(hote, M) } })
 *   etatMachine(hote)       l'état sauvegardé (state.reseau.machines[hote]), créé au premier usage depuis def.initial()
 *   estMachine(hote)        vrai si la machine est modélisée et active
 *   fsDe(hote, chemin)      le système de fichiers monté qui contient ce chemin
 *   usageFs(hote, fs)       { octets, inodes } réellement occupés
 *   journalMachine(hote, { unite, message, prio, pid, noyau })
 *
 * --- Les événements (GameEvents) ---
 *   machine { hote, cmd, action, ... }  pour chaque commande du moteur qui lit ou change l'état (voir chaque sort)
 */

/* ================================================================== */
/* Le registre des machines et leur horloge                            */
/* ================================================================== */

var MACHINES_DECLAREES = {};
function declarerMachine(h, def){ MACHINES_DECLAREES[h] = def || {}; }
function defMachine(h){ return MACHINES_DECLAREES[h] || null; }
function estMachine(h){
	var d = defMachine(h);
	if (!d || !racineHote(h)) return false;
	if (typeof d.actif === "function"){ try { return !!d.actif(); } catch (e){ return false; } }
	return true;
}
function machineIci(){ var h = Shell.hote(); return estMachine(h) ? h : null; }
function copieJson(o){ return JSON.parse(JSON.stringify(o)); }
function etatMachine(h){
	if (!state.reseau || typeof state.reseau !== "object") state.reseau = { parefeu: { actif: false, regles: [] }, services: {}, cles: {}, hotesUname: {} };
	if (!state.reseau.machines || typeof state.reseau.machines !== "object") state.reseau.machines = {};
	var M = state.reseau.machines[h];
	if (!M){
		var d = defMachine(h) || {};
		M = typeof d.initial === "function" ? copieJson(d.initial()) : {};
		M.nb = state.nbCommandes;
		M.tics = 0;
		M.journal = M.journal || [];
		M.procs = M.procs || [];
		M.prochainPid = M.prochainPid || 5000;
		state.reseau.machines[h] = M;
		if (typeof d.apresInit === "function") d.apresInit(h, M);
	}
	return M;
}
function maintenantMachine(h){
	var d = defMachine(h);
	if (d && typeof d.maintenant === "function"){ try { var t = d.maintenant(); if (typeof t === "number" && !isNaN(t)) return t; } catch (e){} }
	var M = state && state.reseau && state.reseau.machines ? state.reseau.machines[h] : null;
	return Date.now() + (M ? (M.tics || 0) * pasMachine(h) * 60000 : 0);
}
function pasMachine(h){ var d = defMachine(h); return d && d.pas ? d.pas : 2; }

/* Le fuseau de la machine : l'histoire se raconte à l'heure de Paris ; une machine réglée en UTC retarde de deux heures. */
var FUSEAUX_MACHINES = { "UTC": 0, "Etc/UTC": 0, "Europe/Paris": 2, "Europe/Brussels": 2, "Europe/Berlin": 2, "Europe/London": 1, "Europe/Lisbon": 1,
	"Europe/Madrid": 2, "Europe/Rome": 2, "Europe/Zurich": 2, "Europe/Luxembourg": 2, "Europe/Amsterdam": 2, "Africa/Casablanca": 1, "Africa/Tunis": 1,
	"Africa/Algiers": 1, "America/New_York": -4, "America/Montreal": -4, "America/Los_Angeles": -7, "Asia/Tokyo": 9, "Indian/Reunion": 4,
	"America/Martinique": -4, "America/Guadeloupe": -4, "Pacific/Noumea": 11, "Pacific/Tahiti": -10, "Australia/Sydney": 11 };
var DECALAGE_HISTOIRE = 2;
function fuseauMachine(h){ var M = etatMachine(h); return M.fuseau || "UTC"; }
function decalageFuseau(nom){ return FUSEAUX_MACHINES.hasOwnProperty(nom) ? FUSEAUX_MACHINES[nom] : 0; }
/* L'instant affiché par la machine (une Date dont getHours() donne l'heure de la machine). */
function dateMachine(h, ms){
	var t = ms === undefined ? maintenantMachine(h) : ms;
	return new Date(t - (DECALAGE_HISTOIRE - decalageFuseau(fuseauMachine(h))) * 3600000);
}
function texteDecalage(h){
	var d = decalageFuseau(fuseauMachine(h));
	return (d < 0 ? "-" : "+") + deuxChiffres(Math.abs(d)) + "00";
}
function abregeFuseau(h){
	var f = fuseauMachine(h), d = decalageFuseau(f);
	if (d === 0) return "UTC";
	if (f === "Europe/Paris" || f === "Europe/Brussels" || f === "Europe/Berlin" || f === "Europe/Madrid" || f === "Europe/Rome" || f === "Europe/Zurich" || f === "Europe/Luxembourg" || f === "Europe/Amsterdam") return "CEST";
	return (d < 0 ? "-" : "+") + deuxChiffres(Math.abs(d));
}

/* Avancer la machine : chaque commande tapée fait passer def.pas minutes (fuites, reconstructions, charge...). */
var TICS_MACHINES = [];
function surTicMachine(f){ TICS_MACHINES.push(f); }
function avancerMachine(h){
	if (!estMachine(h)) return;
	var M = etatMachine(h);
	if (M.nb === undefined || M.nb === null || M.nb > state.nbCommandes) M.nb = state.nbCommandes;
	var n = Math.min(60, state.nbCommandes - M.nb);
	M.nb = state.nbCommandes;
	for (var i = 0; i < n; i++){
		M.tics = (M.tics || 0) + 1;
		TICS_MACHINES.forEach(function(f){ try { f(h, M); } catch (e){ /* un tic ne casse jamais une commande */ } });
		var d = defMachine(h);
		if (d && typeof d.tic === "function"){ try { d.tic(h, M); } catch (e){} }
	}
}
function avancerToutesMachines(){ Object.keys(MACHINES_DECLAREES).forEach(function(h){ if (estMachine(h)) avancerMachine(h); }); }

/* Le monde vérifie l'état à chaque commande : les machines avancent d'abord. */
var VERIFIER_MONDE_AVANT_MACHINES = verifierMonde;
verifierMonde = function(){
	try { avancerToutesMachines(); } catch (e){}
	return VERIFIER_MONDE_AVANT_MACHINES.apply(this, arguments);
};

/* Les écritures du joueur sur une machine modélisée : un disque plein ou en lecture seule les refuse. */
var GARDE_ECRITURE_MACHINES = 0;
var APPELER_AVANT_MACHINES = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var h = machineIci();
	if (h){ avancerMachine(h); GARDE_ECRITURE_MACHINES++; }
	try { return APPELER_AVANT_MACHINES.apply(this, arguments); }
	finally { if (h) GARDE_ECRITURE_MACHINES--; }
};
function moteurSeul(f){
	var g = GARDE_ECRITURE_MACHINES;
	GARDE_ECRITURE_MACHINES = 0;
	try { return f(); } finally { GARDE_ECRITURE_MACHINES = g; }
}
function cheminDuLieuMachine(lieu){
	var r = racineDe(lieu);
	if (!r) return null;
	var m = [], l = lieu, g = 0;
	while (l && l !== r && g++ < 100){ m.unshift(l.room_name); l = l.parents[0]; }
	return "/" + m.join("/");
}
function refusEcritureMachine(lieu, nom, creation){
	if (GARDE_ECRITURE_MACHINES <= 0) return null;
	var r = racineDe(lieu);
	if (!r || !estMachine(r.racineHote)) return null;
	var h = r.racineHote, chemin = cheminDuLieuMachine(lieu);
	if (chemin === null || /^\/(proc|sys|dev)(\/|$)/.test(chemin)) return null;
	var fs = fsDe(h, chemin);
	if (!fs) return null;
	if (fs.ro) return "Read-only file system";
	if (creation){
		var u = usageFs(h, fs);
		if (fs.inodes && u.inodes >= fs.inodes) return "No space left on device";
		if (u.octets >= fs.taille) return "No space left on device";
	}
	return null;
}
var ADD_ITEM_AVANT_MACHINES = Room.prototype.addItem;
Room.prototype.addItem = function(item){
	if (item && this.items.indexOf(item) === -1){
		var refus = refusEcritureMachine(this, item.itemname, true);
		if (refus) throw new ShellError(item.itemname + ": " + refus);
	}
	return ADD_ITEM_AVANT_MACHINES.apply(this, arguments);
};
var REMOVE_ITEM_AVANT_MACHINES = Room.prototype.removeItem;
Room.prototype.removeItem = function(item){
	var refus = refusEcritureMachine(this, typeof item === "string" ? item : (item && item.itemname), false);
	if (refus === "Read-only file system") throw new ShellError("rm: cannot remove '" + (typeof item === "string" ? item : item.itemname) + "': Read-only file system");
	return REMOVE_ITEM_AVANT_MACHINES.apply(this, arguments);
};

/* ================================================================== */
/* Les tailles                                                          */
/* ================================================================== */

var KIO = 1024, MIO = 1048576, GIO = 1073741824, TIO = 1099511627776;
if (typeof PROPRIETES_SAUVEGARDEES !== "undefined"){
	["taille", "mtimeMs", "inode"].forEach(function(p){ if (PROPRIETES_SAUVEGARDEES.indexOf(p) === -1) PROPRIETES_SAUVEGARDEES.push(p); });
}
/* « 20G », « +20G », « 512M », « 2g », « 100k », « 4096 » : en octets (null si illisible). */
function lireTaille(texte, uniteDefaut){
	var m = /^([+-]?)(\d+(?:[.,]\d+)?)\s*([kKmMgGtTpP]?)(i?[bB]?)?$/.exec(String(texte || "").trim());
	if (!m) return null;
	var u = (m[3] || uniteDefaut || "").toUpperCase();
	var mult = { "": 1, K: KIO, M: MIO, G: GIO, T: TIO, P: TIO * 1024 }[u];
	return Math.round(parseFloat(m[2].replace(",", ".")) * mult) * (m[1] === "-" ? -1 : 1);
}
/* La taille d'un objet en octets : sa taille déclarée (un fichier énorme), sinon son texte. */
function tailleObjetMachine(item){
	if (!item) return 0;
	if (item.taille !== undefined && item.taille !== null) return item.taille;
	try { return versOctetsUtf8(contenuExact(item.getText ? item.getText() : "", item.sansFinDeLigne)).length; } catch (e){ return String(item.getText ? item.getText() : "").length; }
}
if (typeof tailleOctets === "function"){
	var TAILLE_OCTETS_AVANT_MACHINES = tailleOctets;
	tailleOctets = function(item){
		if (item && !(item instanceof Room) && item.taille !== undefined && item.taille !== null) return item.taille;
		return TAILLE_OCTETS_AVANT_MACHINES.apply(this, arguments);
	};
}
/* Comme df -h et ls -h : puissances de 1024, une décimale sous 10, arrondi au-dessus. */
function humain(n, suffixeOctet){
	n = Math.max(0, Math.round(n));
	if (n < 1024) return String(n) + (suffixeOctet || "");
	var u = "KMGTPE", i = -1, v = n;
	do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
	if (v < 10){
		v = Math.ceil(v * 10) / 10;
		if (v >= 10) return String(Math.ceil(v)) + u.charAt(i);
		return v.toFixed(1) + u.charAt(i);
	}
	return String(Math.ceil(v)) + u.charAt(i);
}
/* Comme free -h : « 7,8Gi », « 512Mi ». */
function humainFree(kio){
	var o = kio * 1024;
	if (o < 1024) return o + "B";
	var u = ["Ki", "Mi", "Gi", "Ti"], i = -1, v = o;
	do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
	return (v < 10 ? (Math.round(v * 10) / 10).toFixed(1) : String(Math.round(v))) + u[i];
}
/* Comme lsblk et LVM : « 119G », « 476,9G », « <119.00g ». */
function humainLsblk(o){
	if (o < 1024) return o + "B";
	var u = "KMGTPE", i = -1, v = o;
	do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
	var t = Math.round(v * 10) / 10;
	return (t === Math.floor(t) ? String(t) : t.toFixed(1)) + u.charAt(i);
}
function humainLvm(o){
	var g = o / GIO;
	if (g < 1) return (o / MIO).toFixed(2) + "m";
	if (g >= 1024) return (g / 1024).toFixed(2) + "t";
	return g.toFixed(2) + "g";
}
function entierAvecEspaces(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

/* ================================================================== */
/* L'heure des fichiers (find -mtime, -mmin ; ls -l ; stat)            */
/* ================================================================== */

function ageFichierMinutes(item){
	var r = Shell.hote(), h = estMachine(r) ? r : null;
	if (item && item.mtimeMs !== undefined && item.mtimeMs !== null && h) return Math.max(0, Math.floor((maintenantMachine(h) - item.mtimeMs) / 60000));
	return null;
}
if (typeof ageEnMinutes === "function"){
	var AGE_MINUTES_AVANT_MACHINES = ageEnMinutes;
	ageEnMinutes = function(noeud){ var a = ageFichierMinutes(noeud); return a === null ? AGE_MINUTES_AVANT_MACHINES.apply(this, arguments) : a; };
}
if (typeof ageEnJours === "function"){
	var AGE_JOURS_AVANT_MACHINES = ageEnJours;
	ageEnJours = function(noeud){ var a = ageFichierMinutes(noeud); return a === null ? AGE_JOURS_AVANT_MACHINES.apply(this, arguments) : Math.floor(a / 1440); };
}
/* Un objet modifié sur une machine modélisée prend l'heure de la machine. */
function dateFichierMachine(h, item){
	if (item && item.mtimeMs !== undefined && item.mtimeMs !== null) return new Date(item.mtimeMs);
	var jours = item && item.age !== undefined ? item.age : 40;
	return new Date(maintenantMachine(h) - jours * 86400000 - 3 * 3600000);
}
GameEvents.addListener("write", function(e){
	try {
		var r = e.room ? racineDe(e.room) : null;
		if (r && estMachine(r.racineHote) && e.item){ e.item.mtimeMs = maintenantMachine(r.racineHote); if (!e.created || e.item.taille === undefined) delete e.item.taille; }
	} catch (x){}
});

/* L'inode d'un chemin : un numéro stable (le même pour la même machine et le même chemin). */
function inodeDe(h, chemin, item){
	if (item && item.inode) return item.inode;
	var x = parseInt(sha256("inode:" + h + ":" + chemin).substring(0, 7), 16);
	return 1048576 + (x % 6000000);
}

/* ================================================================== */
/* Les dossiers virtuels : beaucoup de fichiers, comptés sans être créés */
/* ================================================================== */

/*
 * M.virtuels[chemin] = [{ prefixe, nombre, ageMin, taille, graine, owner, mode }] : nombre fichiers prefixe + empreinte,
 * âgés de ageMin minutes. Un lieu peut aussi porter lieu.fournisseurVirtuel = function(){ return [{ nom, taille, lien, ageMin }] }.
 */
function groupesVirtuels(h, chemin){
	var M = etatMachine(h);
	return (M.virtuels && M.virtuels[chemin]) || null;
}
function nomVirtuel(g, i){ return g.prefixe + hexDe(g.graine + ":" + i, g.longueur || 26); }
function entreesVirtuelles(h, chemin, lieu){
	if (lieu && typeof lieu.fournisseurVirtuel === "function"){
		try { return lieu.fournisseurVirtuel() || []; } catch (e){ return []; }
	}
	var gs = groupesVirtuels(h, chemin);
	if (!gs) return null;
	var liste = [];
	gs.forEach(function(g, k){
		for (var i = g.debut || 0; i < g.nombre + (g.debut || 0); i++) liste.push({ nom: nomVirtuel(g, i), taille: g.taille, ageMin: g.ageMin, owner: g.owner, mode: g.mode, groupe: k, index: i });
	});
	return liste;
}
function compteVirtuels(h, chemin, lieu){
	if (lieu && typeof lieu.fournisseurVirtuel === "function"){ var l = entreesVirtuelles(h, chemin, lieu); return { nombre: l.length, octets: l.reduce(function(s, x){ return s + (x.taille || 0); }, 0) }; }
	var gs = groupesVirtuels(h, chemin);
	if (!gs) return { nombre: 0, octets: 0 };
	return gs.reduce(function(s, g){ s.nombre += g.nombre; s.octets += g.nombre * Math.max(4096, Math.ceil((g.taille || 0) / 4096) * 4096); return s; }, { nombre: 0, octets: 0 });
}
function estVirtuel(h, lieu){
	if (!lieu) return false;
	if (typeof lieu.fournisseurVirtuel === "function") return true;
	var c = cheminDuLieuMachine(lieu);
	return c !== null && !!groupesVirtuels(h, c);
}
/* Retire des fichiers virtuels par leur nom : les groupes se partagent (un groupe entier part d'un coup, s'il le faut). */
function retirerVirtuels(h, chemin, noms){
	var gs = groupesVirtuels(h, chemin);
	if (!gs || !noms.length) return 0;
	var parGroupe = {};
	noms.forEach(function(n){ var p = /^(\d+):(\d+)$/.exec(n); if (p) (parGroupe[p[1]] = parGroupe[p[1]] || []).push(+p[2]); });
	var retires = 0;
	Object.keys(parGroupe).forEach(function(k){
		var g = gs[+k];
		if (!g) return;
		var ix = parGroupe[k].sort(function(a, b){ return a - b; });
		retires += ix.length;
		g.retires = (g.retires || []).concat(ix);
		if (g.retires.length >= g.nombre){ g.nombre = 0; g.retires = []; }
	});
	// Un groupe ne garde pas la liste de ses absents : il se resserre (les noms restants changent peu, l'empreinte suit l'index).
	gs.forEach(function(g){ if (g.retires && g.retires.length){ g.nombre = Math.max(0, g.nombre - g.retires.length); g.debut = (g.debut || 0) + g.retires.length; g.retires = []; } });
	M_nettoyerGroupes(gs);
	return retires;
}
function M_nettoyerGroupes(gs){ for (var i = gs.length - 1; i >= 0; i--) if (gs[i].nombre <= 0) gs[i].nombre = 0; }
/* Des faux objets, le temps d'une commande (find, rm) : ils se comportent comme des fichiers. */
function fauxObjetVirtuel(h, e, chemin){
	var it = Object.create(Item.prototype);
	it.itemname = e.nom;
	it.cmd_text = { less: "" };
	it.valid_cmds = ["less"];
	it.mode = e.mode || "rw-------";
	it.owner = e.owner || "root";
	it.person = false; it.teaches = []; it.reveals = []; it.id = null;
	it.taille = e.taille || 0;
	it.mtimeMs = maintenantMachine(h) - (e.ageMin || 0) * 60000;
	it.age = Math.floor((e.ageMin || 0) / 1440);
	it.virtuel = { chemin: chemin, cle: e.groupe + ":" + e.index };
	if (e.lien) it.lien = e.lien;
	return it;
}

/* ================================================================== */
/* Les systèmes de fichiers et leurs montages                          */
/* ================================================================== */

/*
 * M.fs = [{ source, cible (null : démonté), type, taille (octets), inodes, base (octets hors modèle), baseInodes, uuid, label,
 *           options, ro, erreurs (nombre), reserve (part réservée à root, 0.05), montages, maxMontages, dernierCheck (ms),
 *           virtuel (proc, sysfs, tmpfs...), quotas, lv (« vg/lv ») ou disque (« sda1 », « md0 ») }]
 */
function systemesMachine(h){ return etatMachine(h).fs || []; }
function fsMontes(h){ return systemesMachine(h).filter(function(f){ return f.cible; }); }
function fsDe(h, chemin){
	var meilleur = null;
	fsMontes(h).forEach(function(f){
		var c = f.cible;
		if (chemin === c || c === "/" || chemin.indexOf(c + "/") === 0){
			if (!meilleur || c.length > meilleur.cible.length) meilleur = f;
		}
	});
	return meilleur;
}
function fsParSource(h, source){
	var s = resoudreSource(h, source);
	if (!s) return null;
	return systemesMachine(h).filter(function(f){ return f.source === s.chemin || (s.fs && f === s.fs); })[0] || null;
}
function fsParCible(h, cible){ return fsMontes(h).filter(function(f){ return f.cible === cheminNormal(cible); })[0] || null; }
/* Ce qu'un système de fichiers occupe vraiment : les fichiers de son arbre (sans les montages dessous), plus ce qui
   est hors modèle (le système lui-même), plus les fichiers supprimés mais encore ouverts. */
function usageFs(h, fs){
	if (fs.virtuel) return { octets: fs.utilise || 0, inodes: fs.inodesUtilises || 0 };
	var octets = fs.base || 0, inodes = fs.baseInodes || 0;
	var autres = fsMontes(h).filter(function(f){ return f !== fs && f.cible !== fs.cible && (fs.cible === "/" ? f.cible !== "/" : f.cible.indexOf(fs.cible + "/") === 0); }).map(function(f){ return f.cible; });
	var depart = fs.cible ? dossierHote(h, fs.cible) : null;
	if (depart){
		(function parcourir(lieu, chemin, n){
			if (n > 30) return;
			lieu.items.forEach(function(it){ octets += Math.max(it.lien ? 0 : 4096, Math.ceil(tailleObjetMachine(it) / 4096) * 4096); inodes++; });
			var v = compteVirtuels(h, chemin, lieu);
			octets += v.octets; inodes += v.nombre;
			lieu.children.forEach(function(c){
				if (c.parents[0] !== lieu) return;
				var cc = (chemin === "/" ? "" : chemin) + "/" + c.room_name;
				if (autres.indexOf(cc) > -1 || /^\/(proc|sys|dev|run)$/.test(cc)) return;
				octets += 4096; inodes++;
				parcourir(c, cc, n + 1);
			});
		})(depart, fs.cible, 0);
	}
	etatMachine(h).procs.forEach(function(p){
		(p.fichiers || []).forEach(function(f){ if (f.supprime && f.fs === fs.source){ octets += f.taille || 0; inodes++; } });
	});
	return { octets: octets, inodes: inodes };
}
function libreFs(h, fs){
	var u = usageFs(h, fs);
	var reserve = Math.floor(fs.taille * (fs.reserve || 0));
	return { taille: fs.taille, utilise: Math.min(u.octets, fs.taille), dispo: Math.max(0, fs.taille - u.octets - reserve), inodes: fs.inodes || 0, iutilises: u.inodes, reserve: reserve };
}
function pourcentUsage(utilise, dispo){ return utilise + dispo === 0 ? 0 : Math.ceil(utilise * 100 / (utilise + dispo)); }

/* Les périphériques : disques, partitions, grappes RAID, volumes logiques, et ce qui s'y trouve (UUID, type). */
function nomMapper(vg, lv){ return "/dev/mapper/" + vg.replace(/-/g, "--") + "-" + lv.replace(/-/g, "--"); }
function peripheriques(h){
	var M = etatMachine(h), liste = [];
	(M.disques || []).forEach(function(d){
		if (d.absent) return;
		liste.push({ chemin: "/dev/" + d.nom, nom: d.nom, type: "disk", taille: d.taille, disque: d, rm: !!d.amovible, majeur: d.majeur || 8, mineur: d.mineur || 0, contenu: d.contenu || null });
		(d.parts || []).forEach(function(p, i){
			liste.push({ chemin: "/dev/" + p.nom, nom: p.nom, type: "part", taille: p.taille, disque: d, part: p, parent: d.nom, majeur: d.majeur || 8, mineur: (d.mineur || 0) + i + 1, contenu: p.contenu || null });
		});
	});
	(M.raid || []).forEach(function(r){ liste.push({ chemin: "/dev/" + r.nom, nom: r.nom, type: "raid" + r.niveau, taille: r.taille, raid: r, majeur: 9, mineur: +r.nom.replace(/\D/g, "") || 0, contenu: r.contenu || null }); });
	(M.lvs || []).forEach(function(l, i){ liste.push({ chemin: nomMapper(l.vg, l.nom), alias: "/dev/" + l.vg + "/" + l.nom, nom: l.vg.replace(/-/g, "--") + "-" + l.nom.replace(/-/g, "--"), type: "lvm", taille: l.taille, lv: l, majeur: 253, mineur: i, contenu: l.contenu || null }); });
	return liste;
}
/* Une source de fstab ou de la ligne de commande : /dev/sda1, UUID=..., LABEL=..., /dev/vg/lv, /dev/mapper/... */
function resoudreSource(h, source){
	source = String(source || "").replace(/^"|"$/g, "");
	var periphs = peripheriques(h), m;
	var fsListe = systemesMachine(h);
	function parFs(f){ var p = periphs.filter(function(x){ return x.chemin === f.source || x.alias === f.source; })[0]; return { chemin: f.source, fs: f, periph: p || null }; }
	if ((m = /^UUID=(.+)$/i.exec(source))){
		var f1 = fsListe.filter(function(f){ return f.uuid === m[1]; })[0];
		if (f1) return parFs(f1);
		var s1 = (etatMachine(h).echanges || []).filter(function(s){ return s.uuid === m[1]; })[0];
		if (s1) return { chemin: s1.chemin, swap: s1 };
		return null;
	}
	if ((m = /^LABEL=(.+)$/i.exec(source))){
		var f2 = fsListe.filter(function(f){ return f.label === m[1]; })[0];
		return f2 ? parFs(f2) : null;
	}
	if ((m = /^PARTUUID=(.+)$/i.exec(source))){
		var p2 = periphs.filter(function(x){ return x.part && x.part.partuuid === m[1]; })[0];
		if (!p2) return null;
		var f3 = fsListe.filter(function(f){ return f.source === p2.chemin; })[0];
		return f3 ? parFs(f3) : { chemin: p2.chemin, periph: p2 };
	}
	var normal = source;
	var p = periphs.filter(function(x){ return x.chemin === normal || x.alias === normal; })[0];
	if (p){
		var f4 = fsListe.filter(function(f){ return f.source === p.chemin || f.source === p.alias; })[0];
		return { chemin: p.chemin, periph: p, fs: f4 || null };
	}
	var f5 = fsListe.filter(function(f){ return f.source === normal; })[0];
	if (f5) return parFs(f5);
	if (/^\//.test(normal) && fichierHote(h, normal)) return { chemin: normal, fichier: fichierHote(h, normal) };
	return null;
}
function lireFstabMachine(h){
	var t = texteHote(h, "/etc/fstab") || "", lignes = [];
	t.split("\n").forEach(function(l, i){
		var x = l.trim();
		if (x === "" || x.charAt(0) === "#") return;
		var c = x.split(/\s+/);
		lignes.push({ num: i + 1, source: c[0], cible: c[1], type: c[2], options: (c[3] || "defaults").split(","), dump: c[4], pass: c[5], brut: l, champs: c.length });
	});
	return lignes;
}
var TYPES_FS_CONNUS = ["ext4", "ext3", "ext2", "xfs", "btrfs", "vfat", "swap", "tmpfs", "nfs", "nfs4", "cifs", "iso9660", "auto", "proc", "sysfs", "devtmpfs", "ntfs", "exfat"];

/* ================================================================== */
/* df                                                                   */
/* ================================================================== */

var DF_AVANT_MACHINES = Shell.sorts.df;
Shell.sorts.df = function(args, io){
	var h = machineIci();
	if (!h) return DF_AVANT_MACHINES.apply(this, arguments);
	var o = { h: false, H: false, T: false, i: false, k: false, m: false, a: false, x: [], t: [], l: false, P: false, total: false }, chemins = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--human-readable"){ o.h = true; continue; }
		if (a === "--si"){ o.H = true; continue; }
		if (a === "--print-type"){ o.T = true; continue; }
		if (a === "--inodes"){ o.i = true; continue; }
		if (a === "--all"){ o.a = true; continue; }
		if (a === "--local"){ o.l = true; continue; }
		if (a === "--total"){ o.total = true; continue; }
		if (a === "--portability"){ o.P = true; continue; }
		if (a === "-x" || a === "--exclude-type"){ o.x.push(args[++i]); continue; }
		if (a === "-t" || a === "--type"){ o.t.push(args[++i]); continue; }
		if (/^--exclude-type=/.test(a)){ o.x.push(a.split("=")[1]); continue; }
		if (/^--type=/.test(a)){ o.t.push(a.split("=")[1]); continue; }
		if (/^--output/.test(a)) continue;
		if (/^-[hHTikmalP]+$/.test(a)){ a.substring(1).split("").forEach(function(c){ o[c] = true; }); continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("df: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'df --help' for more information.");
		chemins.push(a);
	}
	var liste = fsMontes(h).slice();
	if (chemins.length){
		liste = [];
		chemins.forEach(function(c){
			var r = Shell.chercher(c, io, "df");
			if (r.node === null){ io.err("df: " + c + ": No such file or directory"); io.code = 1; return; }
			var chemin = r.node instanceof Room ? cheminDuLieuMachine(r.node) : cheminDuLieuMachine(r.dir) + "/" + r.name;
			var f = fsDe(h, cheminNormal(chemin));
			if (f && liste.indexOf(f) === -1) liste.push(f);
		});
	} else if (!o.a){
		liste = liste.filter(function(f){ return !f.cache; });
	}
	if (o.t.length) liste = liste.filter(function(f){ return o.t.indexOf(f.type) > -1; });
	if (o.x.length) liste = liste.filter(function(f){ return o.x.indexOf(f.type) === -1; });
	var lignes = [];
	var entete;
	if (o.i) entete = ["Filesystem", o.T ? "Type" : null, "Inodes", "IUsed", "IFree", "IUse%", "Mounted on"];
	else entete = ["Filesystem", o.T ? "Type" : null, o.h || o.H ? "Size" : (o.m ? "1M-blocks" : "1K-blocks"), "Used", o.h || o.H ? "Avail" : "Available", "Use%", "Mounted on"];
	entete = entete.filter(function(x){ return x !== null; });
	var rangs = [entete];
	var totaux = { t: 0, u: 0, d: 0 };
	liste.forEach(function(f){
		var l = libreFs(h, f), ligne;
		if (o.i){
			var ifree = Math.max(0, l.inodes - l.iutilises), pc = l.inodes ? Math.ceil(l.iutilises * 100 / l.inodes) + "%" : "-";
			var fmt = function(n){ return o.h ? humain(n).replace(/(\.\d)?([KMG])$/, function(x){ return x; }) : String(n); };
			ligne = [f.source, o.T ? f.type : null, fmt(l.inodes), fmt(Math.min(l.iutilises, l.inodes || l.iutilises)), fmt(ifree), pc, f.cible];
		} else {
			var fmt2 = o.h ? humain : (o.m ? function(n){ return String(Math.ceil(n / MIO)); } : function(n){ return String(Math.ceil(n / 1024)); });
			ligne = [f.source, o.T ? f.type : null, fmt2(l.taille), fmt2(l.utilise), fmt2(l.dispo), pourcentUsage(l.utilise, l.dispo) + "%", f.cible];
			totaux.t += l.taille; totaux.u += l.utilise; totaux.d += l.dispo;
		}
		rangs.push(ligne.filter(function(x){ return x !== null; }));
	});
	if (o.total && !o.i){
		var fmt3 = o.h ? humain : function(n){ return String(Math.ceil(n / 1024)); };
		rangs.push(["total", o.T ? "-" : null, fmt3(totaux.t), fmt3(totaux.u), fmt3(totaux.d), pourcentUsage(totaux.u, totaux.d) + "%", "-"].filter(function(x){ return x !== null; }));
	}
	var largeurs = entete.map(function(x, k){ return Math.max.apply(null, rangs.map(function(r){ return String(r[k]).length; })); });
	rangs.forEach(function(r, n){
		var txt = r.map(function(c, k){
			if (k === r.length - 1) return c;
			if (k === 0 || (o.T && k === 1)) return completerDroite(c, largeurs[k]);
			return completerGauche(c, largeurs[k]);
		}).join(" ");
		var pc = parseInt(r[r.length - 2], 10);
		lignes.push(io.tty && n > 0 && pc >= 90 ? C.rouge(txt) : txt);
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "df", inodes: o.i, humain: o.h, types: o.T, cibles: liste.map(function(f){ return f.cible; }),
		pleins: liste.filter(function(f){ var l = libreFs(h, f); return o.i ? l.inodes && l.iutilises >= l.inodes : l.dispo === 0; }).map(function(f){ return f.cible; }) });
	return lignes.join("\n");
};

/* ================================================================== */
/* du et ncdu                                                           */
/* ================================================================== */

function blocsOctets(n){ return Math.ceil(n / 4096) * 4096; }
/* La place d'un lieu sur le disque, sans traverser les autres montages (-x) ni /proc. */
function tailleLieuMachine(h, lieu, chemin, options, rappel, profondeur){
	var somme = 4096;
	if (profondeur > 30) return somme;
	var montes = fsMontes(h).map(function(f){ return f.cible; });
	var fsBase = options.x ? fsDe(h, chemin) : null;
	if (options.demonte && options.demonte(chemin)) return somme;
	lieu.items.forEach(function(it){
		var t = options.apparent ? tailleObjetMachine(it) : (it.lien ? 0 : blocsOctets(tailleObjetMachine(it)));
		somme += t;
		if (rappel && options.tous) rappel((chemin === "/" ? "" : chemin) + "/" + it.itemname, t, profondeur + 1, false);
	});
	var v = compteVirtuels(h, chemin, lieu);
	somme += v.octets;
	lieu.children.forEach(function(c){
		if (c.parents[0] !== lieu) return;
		var cc = (chemin === "/" ? "" : chemin) + "/" + c.room_name;
		if (/^\/(proc|sys|dev|run)$/.test(cc)) return;
		if (options.x && montes.indexOf(cc) > -1 && fsDe(h, cc) !== fsBase) return;
		var t = tailleLieuMachine(h, c, cc, options, rappel, profondeur + 1);
		somme += t;
	});
	if (rappel) rappel(chemin, somme, profondeur, true);
	return somme;
}
function lieuDemonte(h, chemin){
	var M = etatMachine(h);
	return (M.fs || []).some(function(f){ return !f.cible && f.pointDeMontage === chemin; });
}
var DU_AVANT_MACHINES = Shell.sorts.du;
Shell.sorts.du = function(args, io){
	var h = machineIci();
	if (!h) return DU_AVANT_MACHINES.apply(this, arguments);
	var o = { s: false, h: false, a: false, c: false, x: false, k: true, m: false, profondeur: null, apparent: false, exclure: [] }, cibles = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "--summarize"){ o.s = true; continue; }
		if (a === "--human-readable"){ o.h = true; continue; }
		if (a === "--all"){ o.a = true; continue; }
		if (a === "--total"){ o.c = true; continue; }
		if (a === "--one-file-system"){ o.x = true; continue; }
		if (a === "--apparent-size"){ o.apparent = true; continue; }
		if ((m = /^--max-depth=(\d+)$/.exec(a))){ o.profondeur = +m[1]; continue; }
		if (a === "-d" || a === "--max-depth"){ o.profondeur = parseInt(args[++i], 10); if (isNaN(o.profondeur)) throw new ShellError("du: invalid maximum depth '" + args[i] + "'"); continue; }
		if (/^-d\d+$/.test(a)){ o.profondeur = +a.substring(2); continue; }
		if ((m = /^--exclude=(.+)$/.exec(a))){ o.exclure.push(m[1]); continue; }
		if (/^-[shacxkmb]+$/.test(a)){
			a.substring(1).split("").forEach(function(c){ if (c === "b"){ o.apparent = true; o.octets = true; } else o[c] = true; });
			continue;
		}
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("du: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'du --help' for more information.");
		cibles.push(a);
	}
	if (o.s && o.profondeur !== null && o.profondeur > 0) throw new ShellError("du: cannot both summarize and show all entries");
	if (!cibles.length) cibles = ["."];
	var lignes = [], total = 0;
	var fmt = function(n){ return o.h ? humain(n) : (o.m ? String(Math.ceil(n / MIO)) : (o.octets ? String(n) : String(Math.ceil(n / 1024)))); };
	var exclus = o.exclure.map(function(x){ return motifVersRegExp(x); });
	cibles.forEach(function(c){
		var r;
		try { r = Shell.chercher(c, io, "du"); } catch (e){ if (!(e instanceof ShellError)) throw e; io.err(e.message); io.code = 1; return; }
		if (r.node === null){ io.err("du: cannot access '" + c + "': No such file or directory"); io.code = 1; return; }
		var affiche = c.replace(/\/+$/, "") || c;
		if (r.node instanceof Item){
			var t = o.apparent ? tailleObjetMachine(r.node) : blocsOctets(tailleObjetMachine(r.node));
			total += t;
			lignes.push(fmt(t) + "\t" + affiche);
			return;
		}
		if (!Shell.bit(r.node, "r", io) || !Shell.bit(r.node, "x", io)){ io.err("du: cannot read directory '" + affiche + "': Permission denied"); io.code = 1; }
		var cheminReel = cheminDuLieuMachine(r.node);
		var refusLu = false;
		var t2 = tailleLieuMachine(h, r.node, cheminReel, { x: o.x, apparent: o.apparent, tous: o.a, demonte: function(p){ return lieuDemonte(h, p); } }, function(chemin, taille, prof, estLieu){
			if (exclus.some(function(re){ return re.test(chemin.split("/").pop()); })) return;
			var vu = affiche === "." ? (chemin === cheminReel ? "." : "./" + chemin.substring(cheminReel.length + (cheminReel === "/" ? 0 : 1))) : affiche + chemin.substring(cheminReel.length);
			if (o.s){ if (prof === 0) lignes.push(fmt(taille) + "\t" + vu); return; }
			if (o.profondeur !== null && prof > o.profondeur) return;
			if (!estLieu && !o.a) return;
			lignes.push(fmt(taille) + "\t" + vu);
		}, 0);
		void refusLu;
		total += t2;
	});
	if (o.c) lignes.push(fmt(total) + "\ttotal");
	GameEvents.fire({ type: "machine", hote: h, cmd: "du", cibles: cibles, resume: o.s, humain: o.h, profondeur: o.profondeur, sortie: lignes.join("\n") });
	return lignes.join("\n");
};

Shell.sorts.ncdu = function(args, io){
	var h = machineIci();
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || ".";
	if (!h) throw new ShellError("ncdu: command not found" + astuce(io, "ncdu est installé sur les machines d'exploitation (ssh lumen, au chapitre 6). Ici : du -sh *."), 127);
	var x = args.indexOf("-x") > -1;
	var r = Shell.chercher(cible, io, "ncdu");
	if (!(r.node instanceof Room)) throw new ShellError("ncdu: " + cible + ": Not a directory");
	var chemin = cheminDuLieuMachine(r.node), entrees = [];
	r.node.children.forEach(function(c){
		if (c.parents[0] !== r.node) return;
		var cc = (chemin === "/" ? "" : chemin) + "/" + c.room_name;
		if (/^\/(proc|sys|dev|run)$/.test(cc)) return;
		if (x && fsDe(h, cc) !== fsDe(h, chemin)) return;
		entrees.push({ nom: "/" + c.room_name, t: tailleLieuMachine(h, c, cc, { x: x }, null, 1) });
	});
	r.node.items.forEach(function(it){ entrees.push({ nom: " " + it.itemname, t: blocsOctets(tailleObjetMachine(it)) }); });
	var v = compteVirtuels(h, chemin, r.node);
	if (v.nombre) entrees.push({ nom: " (" + v.nombre + " fichiers)", t: v.octets });
	entrees.sort(function(a, b){ return b.t - a.t; });
	var max = entrees.length ? entrees[0].t : 1, total = entrees.reduce(function(s, e){ return s + e.t; }, 0);
	var lignes = ["ncdu 1.18 ~ Use the arrow keys to navigate, press ? for help", "--- " + chemin + " " + new Array(Math.max(2, 60 - chemin.length)).join("-")];
	entrees.slice(0, 20).forEach(function(e){
		var n = Math.round(e.t / max * 10);
		var t = humainFree(Math.round(e.t / 1024)).replace("Ki", " KiB").replace("Mi", " MiB").replace("Gi", " GiB").replace("Ti", " TiB");
		lignes.push(completerGauche(t, 11) + " [" + new Array(n + 1).join("#") + new Array(11 - n).join(" ") + "] " + e.nom);
	});
	lignes.push("", " Total disk usage: " + humainFree(Math.round(total / 1024)).replace("Gi", " GiB").replace("Mi", " MiB") + "  Apparent size: " + humainFree(Math.round(total / 1024)).replace("Gi", " GiB").replace("Mi", " MiB") + "  Items: " + (entrees.length + v.nombre));
	GameEvents.fire({ type: "machine", hote: h, cmd: "ncdu", cible: chemin, premier: entrees[0] ? entrees[0].nom.trim() : null });
	return lignes.join("\n") + astuce(io, "ncdu est interactif (flèches, Entrée pour descendre, d pour supprimer, q pour quitter) ; ici, c'est une photo de son premier écran.");
};

/* ================================================================== */
/* stat                                                                 */
/* ================================================================== */

function dateStat(h, d){
	return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" +
		deuxChiffres(d.getSeconds()) + "." + String(100000000 + (d.getTime() % 1000) * 1000000 + 4211).substring(1) + " " + texteDecalage(h);
}
var STAT_AVANT_MACHINES = Shell.sorts.stat;
Shell.sorts.stat = function(args, io){
	var h = machineIci();
	if (!h) return STAT_AVANT_MACHINES.apply(this, arguments);
	var format = null, fsMode = false, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-c" || a === "--format"){ format = args[++i]; if (format === undefined) throw new ShellError("stat: option requires an argument -- 'c'"); continue; }
		if (/^--format=/.test(a)){ format = a.substring(9); continue; }
		if (/^--printf=/.test(a)){ format = a.substring(9).replace(/\\n/g, "\n"); continue; }
		if (a === "-f" || a === "--file-system"){ fsMode = true; continue; }
		if (a === "-L" || a === "--dereference" || a === "-t" || a === "--terse") continue;
		if (a.charAt(0) === "-") throw new ShellError("stat: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'");
		noms.push(a);
	}
	if (!noms.length) throw new ShellError("stat: missing operand\nTry 'stat --help' for more information.");
	var sorties = [];
	noms.forEach(function(nom){
		var r = Shell.chercher(nom, io, "stat"), noeud = r.node, chemin;
		if (noeud === null){
			var virt = fauxDansVirtuel(h, r.dir, r.name);
			if (virt) noeud = virt;
		}
		if (noeud === null){ io.err("stat: cannot statx '" + nom + "': No such file or directory"); io.code = 1; return; }
		chemin = noeud instanceof Room ? cheminDuLieuMachine(noeud) : cheminDuLieuMachine(r.dir) + "/" + (noeud.itemname || r.name);
		chemin = cheminNormal(chemin);
		var fs = fsDe(h, chemin);
		if (fsMode){
			var l = libreFs(h, fs);
			sorties.push("  File: \"" + nom + "\"\n    ID: " + hexDe(fs.uuid || fs.source, 16) + " Namelen: 255     Type: " + (fs.type === "ext4" ? "ext2/ext3" : fs.type) + "\nBlock size: 4096       Fundamental block size: 4096\n" +
				"Blocks: Total: " + Math.floor(l.taille / 4096) + "    Free: " + Math.floor((l.taille - l.utilise) / 4096) + "    Available: " + Math.floor(l.dispo / 4096) + "\nInodes: Total: " + l.inodes + "    Free: " + Math.max(0, l.inodes - l.iutilises));
			return;
		}
		var estLieu = noeud instanceof Room;
		var taille = estLieu ? 4096 : tailleObjetMachine(noeud);
		var ino = inodeDe(h, chemin, noeud), d = dateFichierMachine(h, noeud);
		var mode = (estLieu ? "d" : (noeud.lien ? "l" : "-")) + noeud.mode;
		var uid = uidMachine(h, noeud.owner);
		var valeurs = { n: nom, N: noeud.lien ? "'" + nom + "' -> '" + noeud.lien + "'" : "'" + nom + "'", s: String(taille), i: String(ino), a: modeOctal(noeud.mode).replace(/^0/, "") || "0",
			A: mode, U: noeud.owner, G: groupeDe(noeud.owner), u: String(uid), g: String(uid), h: String(estLieu ? 2 + noeud.children.length : 1), b: String(Math.ceil(taille / 512)),
			B: "512", F: estLieu ? "directory" : (noeud.lien ? "symbolic link" : (taille === 0 ? "regular empty file" : "regular file")), y: dateStat(h, d), Y: String(Math.floor(d.getTime() / 1000)),
			x: dateStat(h, d), z: dateStat(h, d), m: fs ? fs.cible : "/", d: String(fs ? 64768 + systemesMachine(h).indexOf(fs) : 2049), o: "4096", "%": "%" };
		if (format !== null){
			sorties.push(format.replace(/%(.)/g, function(t, c){ return valeurs.hasOwnProperty(c) ? valeurs[c] : t; }));
			return;
		}
		sorties.push("  File: " + valeurs.N.replace(/^'|'$/g, "") + "\n  Size: " + completerDroite(taille, 15) + "Blocks: " + completerDroite(valeurs.b, 10) + " IO Block: 4096   " + valeurs.F + "\n" +
			"Device: " + valeurs.d + "     Inode: " + completerDroite(ino, 11) + " Links: " + valeurs.h + "\n" +
			"Access: (0" + valeurs.a + "/" + mode + ")  Uid: (" + completerGauche(uid, 5) + "/" + completerGauche(noeud.owner, 8) + ")   Gid: (" + completerGauche(uid, 5) + "/" + completerGauche(valeurs.G, 8) + ")\n" +
			"Access: " + valeurs.x + "\nModify: " + valeurs.y + "\nChange: " + valeurs.z + "\n Birth: " + valeurs.y);
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "stat", noms: noms, format: format });
	return sorties.join("\n");
};
function uidMachine(h, nom){
	var t = texteHote(h, "/etc/passwd") || "";
	var l = t.split("\n").filter(function(x){ return x.split(":")[0] === nom; })[0];
	return l ? +l.split(":")[2] : (nom === "root" ? 0 : 1000);
}
function groupeDe(nom){ return nom; }
/* Un fichier virtuel désigné par son nom (stat, rm, ls d'un seul fichier). */
function fauxDansVirtuel(h, lieu, nom){
	if (!lieu || !estVirtuel(h, lieu)) return null;
	var c = cheminDuLieuMachine(lieu);
	var e = (entreesVirtuelles(h, c, lieu) || []).filter(function(x){ return x.nom === nom; })[0];
	return e ? fauxObjetVirtuel(h, e, c) : null;
}

/* ================================================================== */
/* ls et rm dans un dossier virtuel                                     */
/* ================================================================== */

var LS_HUMAIN_MACHINES = false;
var LIGNE_LONGUE_AVANT_MACHINES = Shell.ligneLongue;
Shell.ligneLongue = function(noeud, nom, io){
	var h = machineIci();
	if (!h || noeud instanceof Room || noeud.lien || (noeud.taille === undefined && noeud.mtimeMs === undefined)) return LIGNE_LONGUE_AVANT_MACHINES.apply(this, arguments);
	var affiche = nom || noeud.toString();
	if (io.tty && !noeud.person && noeud.mode.indexOf("x") > -1) affiche = C.vert(affiche);
	var t = tailleObjetMachine(noeud);
	return "-" + noeud.mode + "  " + completerDroite(noeud.owner, 9) + " " + completerGauche(LS_HUMAIN_MACHINES ? humain(t) : t, 6) + "  " + affiche;
};
var LS_AVANT_MACHINES = Shell.sorts.ls;
Shell.sorts.ls = function(args, io){
	var h = machineIci();
	if (!h) return LS_AVANT_MACHINES.apply(this, arguments);
	var opts = {}, cibles = [];
	args.forEach(function(a){ if (/^-[a-zA-Z1]+$/.test(a)) a.substring(1).split("").forEach(function(c){ opts[c] = true; }); else if (a === "--all") opts.a = true; else if (a === "--human-readable") opts.h = true; else cibles.push(a); });
	var virtuelles = [];
	(cibles.length ? cibles : ["."]).forEach(function(c){
		try {
			var r = Shell.chercher(c, io, "ls");
			if (r.node instanceof Room && (estVirtuel(h, r.node) || cheminDuLieuMachine(r.node) === "/proc" || lieuDemonte(h, cheminDuLieuMachine(r.node)))) virtuelles.push({ c: c, r: r });
		} catch (e){}
	});
	if (!virtuelles.length || cibles.length > 1){
		LS_HUMAIN_MACHINES = !!opts.h;
		try { return LS_AVANT_MACHINES.apply(this, [args.filter(function(a){ return !/^-[a-zA-Z1]+$/.test(a) || true; }).map(function(a){ return /^-[a-zA-Z1]+$/.test(a) ? a.replace(/[hf1]/g, "") === "-" ? "-1" : a.replace(/[hf]/g, "") : a; }), io]); }
		finally { LS_HUMAIN_MACHINES = false; }
	}
	var lieu = virtuelles[0].r.node, chemin = cheminDuLieuMachine(lieu);
	if (!Shell.bit(lieu, "r", io)) throw new ShellError("ls: cannot open directory '" + virtuelles[0].c + "': Permission denied", 2);
	if (lieuDemonte(h, chemin)){ GameEvents.fire({ type: "ls", room: lieu, all: !!opts.a, long: !!opts.l }); return opts.l ? "total 0" : ""; }
	var noms = [];
	if (chemin === "/proc"){
		var pids = etatMachine(h).procs.map(function(p){ return p.pid; }).sort(function(a, b){ return a - b; });
		noms = pids.map(String).map(function(n){ return { nom: n, lieu: true }; });
		lieu.items.forEach(function(it){ noms.push({ nom: it.itemname, item: it }); });
		lieu.children.forEach(function(c){ if (c.parents[0] === lieu) noms.push({ nom: c.room_name, lieu: true }); });
		if (!opts.f) noms.sort(function(a, b){ var x = /^\d+$/.test(a.nom), y = /^\d+$/.test(b.nom); if (x && y) return +a.nom - +b.nom; if (x !== y) return x ? -1 : 1; return a.nom < b.nom ? -1 : 1; });
	} else {
		lieu.children.forEach(function(c){ if (c.parents[0] === lieu && (opts.a || opts.f || c.room_name.charAt(0) !== ".")) noms.push({ nom: c.room_name, lieu: true }); });
		lieu.items.forEach(function(it){ if (opts.a || opts.f || it.itemname.charAt(0) !== ".") noms.push({ nom: it.itemname, item: it }); });
		(entreesVirtuelles(h, chemin, lieu) || []).forEach(function(e){ noms.push({ nom: e.nom, virtuel: e }); });
		if (!opts.f) noms.sort(function(a, b){ return a.nom < b.nom ? -1 : (a.nom > b.nom ? 1 : 0); });
		if (opts.f) noms = [{ nom: ".", lieu: true }, { nom: "..", lieu: true }].concat(noms);
	}
	var lignes;
	if (opts.l){
		var d = new Date(maintenantMachine(h));
		var dateLs = function(ms){ var x = dateMachine(h, ms); return MOIS_EN[x.getMonth()] + " " + completerGauche(x.getDate(), 2) + " " + deuxChiffres(x.getHours()) + ":" + deuxChiffres(x.getMinutes()); };
		lignes = ["total " + Math.ceil(noms.length * 4)];
		noms.forEach(function(n){
			if (n.lieu) lignes.push("dr-xr-xr-x  2 root     root        0 " + dateLs(d.getTime()) + " " + n.nom);
			else if (n.item) lignes.push(Shell.ligneLongue(n.item, null, io));
			else { var e = n.virtuel; lignes.push((e.lien ? "l" : "-") + (e.mode || "rw-------") + " 1 " + completerDroite(e.owner || "root", 8) + " " + completerDroite(e.owner || "root", 8) + " " + completerGauche(opts.h ? humain(e.taille || 0) : e.taille || 0, 5) + " " + dateLs(d.getTime() - (e.ageMin || 0) * 60000) + " " + e.nom + (e.lien ? " -> " + e.lien : "")); }
		});
	} else {
		lignes = noms.map(function(n){ return n.nom; });
	}
	GameEvents.fire({ type: "ls", room: lieu, all: !!opts.a, long: !!opts.l });
	GameEvents.fire({ type: "machine", hote: h, cmd: "ls", chemin: chemin, nombre: noms.length, sansTri: !!opts.f });
	return tronquerSortieMachine(lignes, io, "ls");
};
/* Des dizaines de milliers de lignes sur l'écran : le vrai terminal les déroulerait toutes ; ici, le début et un mot. */
var LIGNES_ECRAN_MAX_MACHINES = 400;
function tronquerSortieMachine(lignes, io, cmd){
	if (!io.tty || lignes.length <= LIGNES_ECRAN_MAX_MACHINES) return lignes.join("\n");
	return lignes.slice(0, 200).join("\n") + "\n" + C.gris("(... et " + entierAvecEspaces(lignes.length - 200).replace(/,/g, " ") + " lignes de plus : le vrai terminal les aurait toutes déroulées pendant de longues secondes. " +
		"Pour compter : " + cmd + " ... | wc -l ; pour regarder le début : | head.)");
}

var RM_AVANT_MACHINES = Shell.sorts.rm;
Shell.sorts.rm = function(args, io){
	var h = machineIci();
	if (!h) return RM_AVANT_MACHINES.apply(this, arguments);
	var noms = args.filter(function(a){ return a.charAt(0) !== "-" || a === "-"; }), options = args.filter(function(a){ return a.charAt(0) === "-" && a !== "-"; });
	var reels = [], messages = [], virtuels = {};
	noms.forEach(function(n){
		var coupe = n.lastIndexOf("/"), dossier = coupe > -1 ? n.substring(0, coupe) || "/" : ".", base = n.substring(coupe + 1);
		var r = null;
		try { r = Shell.chercher(dossier, io, "rm"); } catch (e){}
		var lieu = r && r.node instanceof Room ? r.node : null;
		if (lieu && estVirtuel(h, lieu) && lieu.getNode(base) === null){
			var c = cheminDuLieuMachine(lieu);
			if (/[*?[]/.test(base)){ messages.push("bash: /usr/bin/rm: Argument list too long" + astuce(io, "Des dizaines de milliers de noms ne tiennent pas sur une ligne de commande. find " + c + " -type f ... -delete les traite un par un, sans limite.")); io.code = 126; return; }
			var e = (entreesVirtuelles(h, c, lieu) || []).filter(function(x){ return x.nom === base; })[0];
			if (!e){ reels.push(n); return; }
			if (e.owner !== JOUEUR && !io.sudo){ messages.push("rm: cannot remove '" + n + "': Permission denied"); io.code = 1; return; }
			(virtuels[c] = virtuels[c] || []).push(e.groupe + ":" + e.index);
			return;
		}
		reels.push(n);
	});
	Object.keys(virtuels).forEach(function(c){ retirerVirtuels(h, c, virtuels[c]); });
	var sortie = reels.length ? RM_AVANT_MACHINES.call(this, options.concat(reels), io) : "";
	return messages.concat(sortie ? [sortie] : []).join("\n");
};

/* find : les fichiers virtuels sont prêtés le temps de la recherche (et -delete les retire pour de vrai). */
var FIND_AVANT_MACHINES = Shell.sorts.find;
Shell.sorts.find = function(args, io){
	var h = machineIci();
	if (!h) return FIND_AVANT_MACHINES.apply(this, arguments);
	var M = etatMachine(h), prets = [];
	var chemins = Object.keys(M.virtuels || {});
	chemins.forEach(function(c){
		var lieu = dossierHote(h, c);
		if (!lieu) return;
		var reels = lieu.items;
		var faux = (entreesVirtuelles(h, c, lieu) || []).map(function(e){ return fauxObjetVirtuel(h, e, c); });
		if (!faux.length) return;
		var tous = reels.concat(faux), retires = {};
		tous.indexOf = function(x){ if (x && x.virtuel) return retires[x.virtuel.cle] ? -1 : 0; return Array.prototype.indexOf.call(reels, x); };
		lieu.items = tous;
		prets.push({ lieu: lieu, reels: reels, retires: retires, chemin: c });
	});
	// Les démontés : leur contenu ne se voit pas.
	var caches = [];
	(M.fs || []).forEach(function(f){ if (!f.cible && f.pointDeMontage){ var l = dossierHote(h, f.pointDeMontage); if (l){ caches.push({ lieu: l, items: l.items, children: l.children }); l.items = []; l.children = []; } } });
	var rmAvant = Shell.sorts.rm;
	Shell.sorts.rm = function(a, o){
		var chemin = a[a.length - 1];
		var p = prets.filter(function(x){ return chemin.indexOf("/") > -1 && cheminNormal(chemin.substring(0, chemin.lastIndexOf("/")) || "/") === x.chemin; })[0];
		if (!p && !/^\//.test(chemin)){
			var base = cheminDuLieuMachine(current_room);
			p = prets.filter(function(x){ return cheminNormal(base + "/" + chemin.substring(0, chemin.lastIndexOf("/"))) === x.chemin; })[0];
		}
		if (p){
			var nom = chemin.substring(chemin.lastIndexOf("/") + 1);
			var f = p.lieu.items.filter(function(x){ return x.virtuel && x.itemname === nom; })[0];
			if (f){
				if (f.owner !== JOUEUR && !o.sudo) return "rm : impossible de supprimer « " + nom + " » : Permission denied";
				p.retires[f.virtuel.cle] = true;
				return nom + " disparaît.";
			}
		}
		return rmAvant.apply(this, arguments);
	};
	var sortie;
	try { sortie = FIND_AVANT_MACHINES.apply(this, arguments); }
	finally {
		Shell.sorts.rm = rmAvant;
		prets.forEach(function(p){ p.lieu.items = p.reels; retirerVirtuels(h, p.chemin, Object.keys(p.retires)); });
		caches.forEach(function(c){ c.lieu.items = c.items; c.lieu.children = c.children; });
	}
	var lignes = String(sortie).split("\n");
	GameEvents.fire({ type: "machine", hote: h, cmd: "find", args: args.slice(), nombre: sortie === "" ? 0 : lignes.length, sortie: lignes.length < 2000 ? sansAnsi(sortie) : "", supprime: args.indexOf("-delete") > -1 });
	return io.tty && lignes.length > LIGNES_ECRAN_MAX_MACHINES ? tronquerSortieMachine(lignes, io, "find") : sortie;
};

/* ================================================================== */
/* LVM : pvs, vgs, lvs, pvcreate, vgextend, lvextend, lvcreate, lvremove, resize2fs */
/* ================================================================== */

var EXTENT = 4 * MIO;
function vgsMachine(h){ return etatMachine(h).vgs || []; }
function lvsMachine(h){ return etatMachine(h).lvs || []; }
function pvsMachine(h){ return etatMachine(h).pvs || []; }
function vgMachine(h, nom){ return vgsMachine(h).filter(function(v){ return v.nom === nom; })[0] || null; }
function tailleVg(h, vg){ return pvsMachine(h).filter(function(p){ return p.vg === vg.nom; }).reduce(function(s, p){ return s + p.taille; }, 0); }
function utiliseVg(h, vg){ return lvsMachine(h).filter(function(l){ return l.vg === vg.nom; }).reduce(function(s, l){ return s + l.taille; }, 0); }
function libreVg(h, vg){ return tailleVg(h, vg) - utiliseVg(h, vg); }
/* « /dev/vg_lumen/lv_donnees », « /dev/mapper/vg_lumen-lv_donnees », « vg_lumen/lv_donnees » */
function trouverLv(h, nom){
	var m;
	if ((m = /^\/dev\/mapper\/(.+)$/.exec(nom))){
		return lvsMachine(h).filter(function(l){ return l.vg.replace(/-/g, "--") + "-" + l.nom.replace(/-/g, "--") === m[1]; })[0] || null;
	}
	if ((m = /^(?:\/dev\/)?([^\/]+)\/([^\/]+)$/.exec(nom))) return lvsMachine(h).filter(function(l){ return l.vg === m[1] && l.nom === m[2]; })[0] || null;
	return null;
}
function fsDuLv(h, lv){ return systemesMachine(h).filter(function(f){ return f.source === nomMapper(lv.vg, lv.nom) || f.source === "/dev/" + lv.vg + "/" + lv.nom; })[0] || null; }
function exigerRootLvm(io, cmd){
	if (!io.sudo) throw new ShellError("  WARNING: Running as a non-root user. Functionality may be unavailable.\n  /run/lock/lvm/P_global:aux: open failed: Permission denied" + astuce(io, "LVM se manie en root : sudo " + cmd + " ..."), 5);
}
function tableLvm(entetes, rangs, alignDroite){
	var largeurs = entetes.map(function(e, k){ return Math.max.apply(null, [e.length].concat(rangs.map(function(r){ return String(r[k]).length; }))); });
	return [entetes].concat(rangs).map(function(r){
		return "  " + r.map(function(c, k){ return alignDroite.indexOf(k) > -1 ? completerGauche(c, largeurs[k]) : completerDroite(c, largeurs[k]); }).join(" ").replace(/\s+$/, "");
	}).join("\n");
}
function attrLv(h, l){
	var snap = !!l.origine, origine = lvsMachine(h).some(function(x){ return x.origine === l.vg + "/" + l.nom; });
	var fs = fsDuLv(h, l);
	return (snap ? "s" : (origine ? "o" : "-")) + "wi-a" + (fs && fs.cible ? "o" : "-") + (snap ? "s" : "-") + "---";
}
Shell.sorts.pvs = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("pvs: command not found", 127);
	exigerRootLvm(io, "pvs");
	var rangs = pvsMachine(h).map(function(p){ var occupe = lvsMachine(h).filter(function(l){ return l.vg === p.vg; }).reduce(function(s, l){ return s + l.taille; }, 0);
		var vg = vgMachine(h, p.vg), part = vg ? Math.min(p.taille, Math.max(0, occupe - pvsMachine(h).filter(function(q){ return q.vg === p.vg && pvsMachine(h).indexOf(q) < pvsMachine(h).indexOf(p); }).reduce(function(s, q){ return s + q.taille; }, 0))) : 0;
		return [p.chemin, p.vg || "", "lvm2", p.vg ? "a--" : "---", (p.arrondi ? "<" : "") + humainLvm(p.taille), humainLvm(p.vg ? p.taille - part : p.taille)]; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "pvs" });
	return tableLvm(["PV", "VG", "Fmt", "Attr", "PSize", "PFree"], rangs, [4, 5]);
};
Shell.sorts.vgs = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("vgs: command not found", 127);
	exigerRootLvm(io, "vgs");
	var rangs = vgsMachine(h).map(function(v){
		var nbPv = pvsMachine(h).filter(function(p){ return p.vg === v.nom; }).length, lvs = lvsMachine(h).filter(function(l){ return l.vg === v.nom; });
		return [v.nom, String(nbPv), String(lvs.length), String(lvs.filter(function(l){ return l.origine; }).length), "wz--n-", "<" + humainLvm(tailleVg(h, v)), humainLvm(libreVg(h, v))];
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "vgs", libre: vgsMachine(h).map(function(v){ return libreVg(h, v); }) });
	return tableLvm(["VG", "#PV", "#LV", "#SN", "Attr", "VSize", "VFree"], rangs, [1, 2, 3, 5, 6]);
};
Shell.sorts.lvs = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lvs: command not found", 127);
	exigerRootLvm(io, "lvs");
	var rangs = lvsMachine(h).map(function(l){
		var data = l.origine ? (Math.min(100, (l.utilise || 0) / l.taille * 100)).toFixed(2) : "";
		return [l.nom, l.vg, attrLv(h, l), humainLvm(l.taille), "", l.origine ? l.origine.split("/")[1] : "", data, "", "", "", "", ""];
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "lvs" });
	return tableLvm(["LV", "VG", "Attr", "LSize", "Pool", "Origin", "Data%", "Meta%", "Move", "Log", "Cpy%Sync", "Convert"], rangs, [3, 6]);
};
function lireTailleLvm(texte, base, libre){
	var m = /^([+-]?)(\d+(?:\.\d+)?)([bBsSkKmMgGtT]?)$/.exec(texte);
	if (!m) return null;
	var mult = { "": MIO, b: 1, B: 1, s: 512, S: 512, k: KIO, K: KIO, m: MIO, M: MIO, g: GIO, G: GIO, t: TIO, T: TIO }[m[3]];
	var v = Math.round(parseFloat(m[2]) * mult);
	return m[1] === "+" ? base + v : (m[1] === "-" ? base - v : v);
}
function lireExtentsLvm(texte, base, libre, taillVg){
	var m = /^([+-]?)(\d+)(%(FREE|VG|ORIGIN|PVS))?$/.exec(texte);
	if (!m) return null;
	var n = +m[2];
	var v = m[3] ? Math.floor((m[4] === "FREE" ? libre : taillVg) * n / 100 / EXTENT) * EXTENT : n * EXTENT;
	return m[1] === "+" ? base + v : (m[1] === "-" ? base - v : v);
}
function texteRedimFs(h, fs, lv){
	var blocs = Math.floor(fs.taille / 4096);
	return "resize2fs 1.47.0 (5-Feb-2023)\nFilesystem at " + fs.source + " is mounted on " + fs.cible + "; on-line resizing required\nold_desc_blocks = " + Math.ceil((lv ? lv.ancienne || fs.taille : fs.taille) / GIO / 8) + ", new_desc_blocks = " + Math.ceil(fs.taille / GIO / 8) +
		"\nThe filesystem on " + fs.source + " is now " + blocs + " (4k) blocks long.\n";
}
function agrandirFs(h, fs, cible){
	var avant = fs.taille;
	fs.taille = cible;
	fs.inodes = fs.inodesParOctet ? Math.floor(cible / fs.inodesParOctet) : fs.inodes;
	journalMachine(h, { unite: "kernel", noyau: true, message: "EXT4-fs (" + (fs.dm || "dm-2") + "): resizing filesystem from " + Math.floor(avant / 4096) + " to " + Math.floor(cible / 4096) + " blocks" });
	journalMachine(h, { unite: "kernel", noyau: true, message: "EXT4-fs (" + (fs.dm || "dm-2") + "): resized filesystem to " + Math.floor(cible / 4096) });
}
Shell.sorts.lvextend = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lvextend: command not found", 127);
	exigerRootLvm(io, "lvextend");
	var taille = null, extents = null, redim = false, cible = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-L" || a === "--size"){ taille = args[++i]; continue; }
		if (/^-L.+/.test(a)){ taille = a.substring(2); continue; }
		if (/^--size=/.test(a)){ taille = a.substring(7); continue; }
		if (a === "-l" || a === "--extents"){ extents = args[++i]; continue; }
		if (/^-l.+/.test(a)){ extents = a.substring(2); continue; }
		if (a === "-r" || a === "--resizefs"){ redim = true; continue; }
		if (/^-[rv]+$/.test(a)){ if (a.indexOf("r") > -1) redim = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("lvextend: unrecognized option '" + a + "'", 3);
		cible = a;
	}
	if (!cible) throw new ShellError("  Please specify a logical volume path.\n  Run `lvextend --help' for more information.", 3);
	if (taille === null && extents === null) throw new ShellError("  Please specify either size or extents but not both.\n  Run `lvextend --help' for more information.", 3);
	var lv = trouverLv(h, cible);
	if (!lv) throw new ShellError("  Volume group \"" + (cible.split("/").filter(Boolean).slice(-2)[0] || cible) + "\" not found\n  Cannot process volume group " + cible, 5);
	var vg = vgMachine(h, lv.vg), libre = libreVg(h, vg);
	var nouvelle = taille !== null ? lireTailleLvm(taille, lv.taille, libre) : lireExtentsLvm(extents, lv.taille, libre, tailleVg(h, vg));
	if (nouvelle === null) throw new ShellError("  Invalid argument for --size: " + (taille || extents) + "\n  Error during parsing of command line.", 3);
	nouvelle = Math.ceil(nouvelle / EXTENT) * EXTENT;
	if (nouvelle < lv.taille) throw new ShellError("  New size given (" + nouvelle / EXTENT + " extents) not larger than existing size (" + lv.taille / EXTENT + " extents)", 5);
	if (nouvelle === lv.taille) throw new ShellError("  New size (" + nouvelle / EXTENT + " extents) matches existing size (" + lv.taille / EXTENT + " extents).", 5);
	if (nouvelle - lv.taille > libre) throw new ShellError("  Insufficient free space: " + (nouvelle - lv.taille) / EXTENT + " extents needed, but only " + Math.floor(libre / EXTENT) + " available", 5);
	var ancienne = lv.taille;
	lv.ancienne = ancienne;
	lv.taille = nouvelle;
	var sortie = "  Size of logical volume " + lv.vg + "/" + lv.nom + " changed from " + (ancienne / GIO).toFixed(2) + " GiB (" + ancienne / EXTENT + " extents) to " + (nouvelle / GIO).toFixed(2) + " GiB (" + nouvelle / EXTENT + " extents).\n  Logical volume " + lv.vg + "/" + lv.nom + " successfully resized.";
	var fs = fsDuLv(h, lv);
	if (redim && fs){
		agrandirFs(h, fs, nouvelle);
		sortie += "\n" + texteRedimFs(h, fs, lv).replace(/\n$/, "");
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "lvextend", lv: lv.vg + "/" + lv.nom, taille: nouvelle, redim: redim && !!fs });
	return sortie + (!redim && fs && io.tty ? astuce(io, "Le volume a grandi, pas encore le système de fichiers qu'il porte : df ne voit rien. sudo resize2fs " + fs.source + " (ou lvextend -r la prochaine fois).") : "");
};
Shell.sorts.resize2fs = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("resize2fs: command not found", 127);
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!noms.length) throw new ShellError("Usage: resize2fs [-d debug_flags] [-f] [-F] [-M] [-P] [-p] device [-b|-s|new_size] [-S RAID-stride] [-z undo_file]", 1);
	if (!io.sudo) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nresize2fs: Permission denied to resize filesystem" + astuce(io, "sudo resize2fs ..."), 1);
	var s = resoudreSource(h, noms[0]);
	if (!s || !s.fs) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nopen: No such file or directory while opening " + noms[0], 1);
	var fs = s.fs, lv = s.periph && s.periph.lv, max = lv ? lv.taille : (s.periph ? s.periph.taille : fs.taille);
	var voulue = noms[1] ? lireTaille(noms[1], "K") : max;
	if (voulue === null) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nresize2fs: Invalid new size: " + noms[1], 1);
	if (voulue > max) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nThe containing partition (or device) is only " + Math.floor(max / 4096) + " (4k) blocks.\nYou requested a new size of " + Math.floor(voulue / 4096) + " blocks.\n", 1);
	if (voulue === fs.taille) return "resize2fs 1.47.0 (5-Feb-2023)\nThe filesystem is already " + Math.floor(fs.taille / 4096) + " (4k) blocks long.  Nothing to do!\n" + astuce(io, "Le système de fichiers occupe déjà tout le volume. Si df trouve toujours trop peu, c'est le volume qu'il faut d'abord agrandir : lvextend.");
	if (voulue < fs.taille && fs.cible) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nFilesystem at " + fs.source + " is mounted on " + fs.cible + "; on-line resizing required\nresize2fs: On-line shrinking not supported", 1);
	if (fs.erreurs && !fs.cible) throw new ShellError("resize2fs 1.47.0 (5-Feb-2023)\nPlease run 'e2fsck -f " + fs.source + "' first.\n", 1);
	agrandirFs(h, fs, voulue);
	GameEvents.fire({ type: "machine", hote: h, cmd: "resize2fs", source: fs.source, taille: voulue });
	return texteRedimFs(h, fs, lv).replace(/\n$/, "");
};
Shell.sorts.pvcreate = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("pvcreate: command not found", 127);
	exigerRootLvm(io, "pvcreate");
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), sortie = [];
	if (!noms.length) throw new ShellError("  Please enter a physical volume path.\n  Run `pvcreate --help' for more information.", 3);
	noms.forEach(function(n){
		var p = peripheriques(h).filter(function(x){ return x.chemin === n; })[0];
		if (!p) throw new ShellError("  No device found for " + n + ".", 5);
		var deja = pvsMachine(h).filter(function(x){ return x.chemin === n; })[0];
		if (deja && deja.vg) throw new ShellError("  Can't initialize physical volume \"" + n + "\" of volume group \"" + deja.vg + "\" without -ff\n  " + n + ": physical volume not initialized.", 5);
		if (p.type === "disk" && (p.disque.parts || []).length) throw new ShellError("  Cannot use " + n + ": device is partitioned", 5);
		if (p.contenu && p.contenu !== "LVM2_member") throw new ShellError("WARNING: " + p.contenu + " signature detected on " + n + ". Wipe it? [y/n]: n\n  Aborted wiping of " + p.contenu + ".\n  1 existing signature left on the device.\n  Aborting pvcreate on " + n + ".", 5);
		if (!deja){ etatMachine(h).pvs.push({ chemin: n, vg: null, taille: p.taille }); }
		if (p.disque && p.type === "disk") p.disque.contenu = "LVM2_member"; else if (p.part) p.part.contenu = "LVM2_member";
		sortie.push("  Physical volume \"" + n + "\" successfully created.");
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "pvcreate", pvs: noms });
	return sortie.join("\n");
};
Shell.sorts.vgextend = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("vgextend: command not found", 127);
	exigerRootLvm(io, "vgextend");
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (noms.length < 2) throw new ShellError("  Please enter volume group name and physical volume(s)\n  Run `vgextend --help' for more information.", 3);
	var vg = vgMachine(h, noms[0].replace(/^\/dev\//, ""));
	if (!vg) throw new ShellError("  Volume group \"" + noms[0] + "\" not found\n  Cannot process volume group " + noms[0], 5);
	var sortie = [];
	noms.slice(1).forEach(function(n){
		var pv = pvsMachine(h).filter(function(x){ return x.chemin === n; })[0];
		if (!pv){
			var p = peripheriques(h).filter(function(x){ return x.chemin === n; })[0];
			if (!p) throw new ShellError("  No device found for " + n + ".", 5);
			pv = { chemin: n, vg: null, taille: p.taille };
			etatMachine(h).pvs.push(pv);
			if (p.disque && p.type === "disk") p.disque.contenu = "LVM2_member";
			sortie.push("  Physical volume \"" + n + "\" successfully created.");
		}
		if (pv.vg && pv.vg !== vg.nom) throw new ShellError("  Physical volume '" + n + "' is already in volume group '" + pv.vg + "'\n  Unable to add physical volume '" + n + "' to volume group '" + vg.nom + "'", 5);
		if (pv.vg === vg.nom) throw new ShellError("  Physical volume '" + n + "' is already in volume group '" + vg.nom + "'", 5);
		pv.vg = vg.nom;
	});
	sortie.push("  Volume group \"" + vg.nom + "\" successfully extended");
	GameEvents.fire({ type: "machine", hote: h, cmd: "vgextend", vg: vg.nom });
	return sortie.join("\n");
};
Shell.sorts.lvcreate = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lvcreate: command not found", 127);
	exigerRootLvm(io, "lvcreate");
	var snap = false, taille = null, nom = null, cible = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-s" || a === "--snapshot"){ snap = true; continue; }
		if (a === "-L" || a === "--size"){ taille = args[++i]; continue; }
		if (/^-L.+/.test(a)){ taille = a.substring(2); continue; }
		if (a === "-n" || a === "--name"){ nom = args[++i]; continue; }
		if (/^-n.+/.test(a)){ nom = a.substring(2); continue; }
		if (/^-[sn]+$/.test(a)) continue;
		if (a.charAt(0) === "-") throw new ShellError("lvcreate: unrecognized option '" + a + "'", 3);
		cible = a;
	}
	if (taille === null) throw new ShellError("  Please specify either size or extents.\n  Run `lvcreate --help' for more information.", 3);
	var t = lireTailleLvm(taille, 0, 0);
	if (t === null || t <= 0) throw new ShellError("  Invalid argument for --size: " + taille, 3);
	t = Math.ceil(t / EXTENT) * EXTENT;
	var vgNom, origine = null;
	if (snap){
		var o = trouverLv(h, cible || "");
		if (!o) throw new ShellError("  Failed to find logical volume \"" + (cible || "") + "\"", 5);
		vgNom = o.vg; origine = o.vg + "/" + o.nom;
	} else vgNom = (cible || "").replace(/^\/dev\//, "");
	var vg = vgMachine(h, vgNom);
	if (!vg) throw new ShellError("  Volume group \"" + vgNom + "\" not found", 5);
	if (!nom) nom = snap ? "lvol" + lvsMachine(h).length : "lvol" + lvsMachine(h).length;
	if (lvsMachine(h).some(function(l){ return l.vg === vgNom && l.nom === nom; })) throw new ShellError("  Logical Volume \"" + nom + "\" already exists in volume group \"" + vgNom + "\"", 5);
	if (t > libreVg(h, vg)) throw new ShellError("  Volume group \"" + vgNom + "\" has insufficient free space (" + Math.floor(libreVg(h, vg) / EXTENT) + " extents): " + t / EXTENT + " required.", 5);
	var lv = { vg: vgNom, nom: nom, taille: t, origine: origine, utilise: 0, cree: maintenantMachine(h) };
	etatMachine(h).lvs.push(lv);
	GameEvents.fire({ type: "machine", hote: h, cmd: "lvcreate", snapshot: snap, lv: vgNom + "/" + nom, origine: origine });
	return "  Logical volume \"" + nom + "\" created.";
};
Shell.sorts.lvremove = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lvremove: command not found", 127);
	exigerRootLvm(io, "lvremove");
	var forcer = args.some(function(a){ return /^-(f|y|-force|-yes)$|^-[fy]+$/.test(a); }), noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!noms.length) throw new ShellError("  Please enter one or more logical volume paths.\n  Run `lvremove --help' for more information.", 3);
	var lv = trouverLv(h, noms[0]);
	if (!lv) throw new ShellError("  Failed to find logical volume \"" + noms[0].replace(/^\/dev\//, "") + "\"", 5);
	var fs = fsDuLv(h, lv);
	if (fs && fs.cible) throw new ShellError("  Logical volume " + lv.vg + "/" + lv.nom + " contains a filesystem in use.", 5);
	if (lvsMachine(h).some(function(l){ return l.origine === lv.vg + "/" + lv.nom; })) throw new ShellError("  Removing origin " + lv.nom + " will also remove 1 snapshot(s): refusé ici.", 5);
	function retirer(){
		var M = etatMachine(h);
		M.lvs = M.lvs.filter(function(l){ return l !== lv; });
		GameEvents.fire({ type: "machine", hote: h, cmd: "lvremove", lv: lv.vg + "/" + lv.nom, snapshot: !!lv.origine });
		return "  Logical volume \"" + lv.nom + "\" successfully removed.";
	}
	if (forcer) return retirer();
	term.demander("Do you really want to remove active logical volume " + lv.vg + "/" + lv.nom + "? [y/n]: ", false, function(r){
		if (/^\s*y/i.test(String(r))) term.echo(retirer());
		else term.echo("  Logical volume " + lv.vg + "/" + lv.nom + " not removed.");
		Shell.fin();
	});
	return "";
};
function blocDisplay(lignes){ return lignes.map(function(l){ return l[0] === "" ? "" : "  " + completerDroite(l[0], 22) + l[1]; }).join("\n"); }
Shell.sorts.vgdisplay = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("vgdisplay: command not found", 127);
	exigerRootLvm(io, "vgdisplay");
	return vgsMachine(h).map(function(v){
		var t = tailleVg(h, v), l = libreVg(h, v);
		return "  --- Volume group ---\n" + blocDisplay([["VG Name", v.nom], ["System ID", ""], ["Format", "lvm2"], ["VG Access", "read/write"], ["VG Status", "resizable"],
			["Cur LV", lvsMachine(h).filter(function(x){ return x.vg === v.nom; }).length], ["Open LV", lvsMachine(h).filter(function(x){ return x.vg === v.nom && fsDuLv(h, x) && fsDuLv(h, x).cible; }).length],
			["Cur PV", pvsMachine(h).filter(function(p){ return p.vg === v.nom; }).length], ["VG Size", "<" + (t / GIO).toFixed(2) + " GiB"], ["PE Size", "4.00 MiB"], ["Total PE", Math.floor(t / EXTENT)],
			["Alloc PE / Size", Math.floor((t - l) / EXTENT) + " / " + ((t - l) / GIO).toFixed(2) + " GiB"], ["Free  PE / Size", Math.floor(l / EXTENT) + " / " + (l / GIO).toFixed(2) + " GiB"], ["VG UUID", v.uuid || hexDe(v.nom, 32)]]);
	}).join("\n\n");
};
Shell.sorts.lvdisplay = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lvdisplay: command not found", 127);
	exigerRootLvm(io, "lvdisplay");
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var liste = noms.length ? noms.map(function(n){ return trouverLv(h, n); }).filter(Boolean) : lvsMachine(h);
	return liste.map(function(l){
		return "  --- Logical volume ---\n" + blocDisplay([["LV Path", "/dev/" + l.vg + "/" + l.nom], ["LV Name", l.nom], ["VG Name", l.vg], ["LV UUID", hexDe(l.vg + l.nom, 32)],
			["LV Write Access", "read/write"], ["LV Status", "available"], ["LV Size", (l.taille / GIO).toFixed(2) + " GiB"], ["Current LE", l.taille / EXTENT], ["Segments", 1], ["Allocation", "inherit"],
			["Read ahead sectors", "auto"], ["Block device", "253:" + lvsMachine(h).indexOf(l)]].concat(l.origine ? [["LV snapshot status", "active destination for " + l.origine.split("/")[1]]] : []));
	}).join("\n\n");
};
Shell.sorts.pvdisplay = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("pvdisplay: command not found", 127);
	exigerRootLvm(io, "pvdisplay");
	return pvsMachine(h).map(function(p){
		return "  --- Physical volume ---\n" + blocDisplay([["PV Name", p.chemin], ["VG Name", p.vg || ""], ["PV Size", (p.taille / GIO).toFixed(2) + " GiB"], ["Allocatable", p.vg ? "yes" : "NO"],
			["PE Size", "4.00 MiB"], ["Total PE", Math.floor(p.taille / EXTENT)], ["PV UUID", hexDe(p.chemin, 32)]]);
	}).join("\n\n");
};

/* ================================================================== */
/* lsblk et blkid                                                       */
/* ================================================================== */

function contenuPeriph(h, p){
	var fs = systemesMachine(h).filter(function(f){ return f.source === p.chemin || f.source === p.alias; })[0];
	if (fs) return { type: fs.type, uuid: fs.uuid, label: fs.label || "", fs: fs, version: fs.type === "ext4" ? "1.0" : "" };
	var sw = (etatMachine(h).echanges || []).filter(function(s){ return s.chemin === p.chemin; })[0];
	if (sw) return { type: "swap", uuid: sw.uuid, label: "", version: "1" };
	if (p.contenu === "LVM2_member") return { type: "LVM2_member", uuid: (p.part && p.part.uuid) || (p.disque && p.disque.uuid) || hexDe("pv" + p.chemin, 32).replace(/(.{6})(.{4})(.{4})(.{4})(.{4})(.{4})(.{6})/, "$1-$2-$3-$4-$5-$6-$7"), version: "LVM2 001" };
	if (p.contenu === "linux_raid_member") return { type: "linux_raid_member", uuid: (p.part && p.part.uuidRaid) || "", label: (p.part && p.part.labelRaid) || "", version: "1.2" };
	return null;
}
Shell.sorts.blkid = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("blkid: command not found", 127);
	var tag = null, format = null, noms = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-s" || args[i] === "--match-tag"){ tag = args[++i]; continue; }
		if (args[i] === "-o" || args[i] === "--output"){ format = args[++i]; continue; }
		if (args[i].charAt(0) === "-") continue;
		noms.push(args[i]);
	}
	var periphs = peripheriques(h).filter(function(p){ return !noms.length || noms.indexOf(p.chemin) > -1 || noms.indexOf(p.alias) > -1; });
	if (noms.length && !periphs.length){ io.code = 2; return ""; }
	var lignes = [];
	periphs.forEach(function(p){
		var c = contenuPeriph(h, p);
		if (!c && !(p.part && p.part.partuuid)) return;
		var champs = [];
		if (c && c.label) champs.push(["LABEL", c.label]);
		if (c && c.uuid) champs.push(["UUID", c.uuid]);
		if (c && c.type === "ext4") champs.push(["BLOCK_SIZE", "4096"]);
		if (c && c.type) champs.push(["TYPE", c.type]);
		if (p.part && p.part.partuuid) champs.push(["PARTUUID", p.part.partuuid]);
		if (tag) champs = champs.filter(function(x){ return x[0] === tag; });
		if (!champs.length) return;
		if (format === "value") champs.forEach(function(x){ lignes.push(x[1]); });
		else lignes.push((noms.length && p.alias && noms.indexOf(p.alias) > -1 ? p.alias : p.chemin) + ": " + champs.map(function(x){ return x[0] + "=\"" + x[1] + "\""; }).join(" "));
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "blkid", noms: noms, sortie: lignes.join("\n") });
	if (!lignes.length) io.code = 2;
	return lignes.join("\n");
};
Shell.sorts.lsblk = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("lsblk: command not found", 127);
	var f = false, d = false, colonnes = null, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-f" || a === "--fs"){ f = true; continue; }
		if (a === "-d" || a === "--nodeps"){ d = true; continue; }
		if (a === "-o" || a === "--output"){ colonnes = (args[++i] || "").toUpperCase().split(","); continue; }
		if (/^--output=/.test(a)){ colonnes = a.substring(9).toUpperCase().split(","); continue; }
		if (/^-[fdpa]+$/.test(a)){ if (a.indexOf("f") > -1) f = true; if (a.indexOf("d") > -1) d = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("lsblk: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'");
		noms.push(a);
	}
	if (!colonnes) colonnes = f ? ["NAME", "FSTYPE", "FSVER", "LABEL", "UUID", "FSAVAIL", "FSUSE%", "MOUNTPOINTS"] : ["NAME", "MAJ:MIN", "RM", "SIZE", "RO", "TYPE", "MOUNTPOINTS"];
	var M = etatMachine(h), periphs = peripheriques(h), rangs = [];
	function enfantsDe(p){
		var l = [];
		if (p.type === "disk") (p.disque.parts || []).forEach(function(x){ l.push(periphs.filter(function(y){ return y.chemin === "/dev/" + x.nom; })[0]); });
		var chemin = p.chemin;
		(M.raid || []).forEach(function(r){ if (r.membres.some(function(m){ return "/dev/" + m.dev === chemin && m.etat !== "removed"; })) l.push(periphs.filter(function(y){ return y.chemin === "/dev/" + r.nom; })[0]); });
		pvsMachine(h).forEach(function(pv){ if (pv.chemin === chemin && pv.vg) lvsMachine(h).filter(function(lv){ return lv.vg === pv.vg && (lv.pv || pvsMachine(h).filter(function(q){ return q.vg === pv.vg; })[0].chemin) === chemin; }).forEach(function(lv){ l.push(periphs.filter(function(y){ return y.lv === lv; })[0]); }); });
		return l.filter(Boolean);
	}
	function valeur(p, col){
		var c = contenuPeriph(h, p), fs = c && c.fs;
		switch (col){
			case "NAME": return p.nom;
			case "KNAME": return p.nom;
			case "PATH": return p.chemin;
			case "MAJ:MIN": return completerGauche(p.majeur, 3) + ":" + p.mineur;
			case "RM": return p.rm ? "1" : "0";
			case "SIZE": return humainLsblk(p.taille);
			case "RO": return "0";
			case "TYPE": return p.type;
			case "MOUNTPOINT": case "MOUNTPOINTS":
				if (c && c.type === "swap") return (M.swaps || []).some(function(s){ return s.chemin === p.chemin; }) ? "[SWAP]" : "";
				return fs && fs.cible ? fs.cible : "";
			case "FSTYPE": return c ? c.type : "";
			case "FSVER": return c ? c.version : "";
			case "LABEL": return c ? c.label : "";
			case "UUID": return c ? c.uuid : "";
			case "FSAVAIL": return fs && fs.cible ? humain(libreFs(h, fs).dispo) : "";
			case "FSUSE%": if (!fs || !fs.cible) return ""; var l = libreFs(h, fs); return pourcentUsage(l.utilise, l.dispo) + "%";
			case "MODEL": return p.disque && p.type === "disk" ? p.disque.modele || "" : "";
			case "SERIAL": return p.disque && p.type === "disk" ? p.disque.serie || "" : "";
			case "ROTA": return p.disque ? (p.disque.rotation ? "1" : "0") : "0";
			case "STATE": return p.type === "disk" ? "running" : "";
			default: return "";
		}
	}
	var vus = [];
	function ajouter(p, prefixe, dernier, niveau){
		var nomAffiche = niveau === 0 ? p.nom : prefixe + (dernier ? "└─" : "├─") + p.nom;
		rangs.push(colonnes.map(function(col){ return col === "NAME" ? nomAffiche : valeur(p, col); }));
		if (d) return;
		var enf = enfantsDe(p);
		enf.forEach(function(e, k){ ajouter(e, niveau === 0 ? "" : prefixe + (dernier ? "  " : "│ "), k === enf.length - 1, niveau + 1); });
		vus.push(p);
	}
	var racines = periphs.filter(function(p){ return p.type === "disk" && (!noms.length || noms.indexOf(p.chemin) > -1); });
	if (noms.length) periphs.filter(function(p){ return p.type !== "disk" && noms.indexOf(p.chemin) > -1; }).forEach(function(p){ racines.push(p); });
	racines.forEach(function(p){ ajouter(p, "", true, 0); });
	var largeurs = colonnes.map(function(c, k){ return Math.max.apply(null, [c.length].concat(rangs.map(function(r){ return String(r[k]).length; }))); });
	var droite = ["SIZE", "FSAVAIL", "FSUSE%", "RM", "RO"];
	var lignes = [colonnes].concat(rangs).map(function(r){ return r.map(function(v, k){ return k === r.length - 1 ? v : (droite.indexOf(colonnes[k]) > -1 ? completerGauche(v, largeurs[k]) : completerDroite(v, largeurs[k])); }).join(" ").replace(/\s+$/, ""); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "lsblk", fs: f });
	return lignes.join("\n");
};

/* ================================================================== */
/* mount, umount, findmnt, fuser                                        */
/* ================================================================== */

function texteOptionsMontage(fs){
	var o = (fs.ro ? ["ro"] : ["rw"]).concat(String(fs.options || "relatime").split(",").filter(function(x){ return x && x !== "rw" && x !== "ro" && x !== "defaults" && x !== "nofail" && x !== "auto" && x !== "noauto"; }));
	if (fs.type === "ext4" && fs.erreurs && fs.ro && o.indexOf("errors=remount-ro") === -1) o.push("errors=remount-ro");
	return o.join(",");
}
function monterFs(h, fs, cible, options){
	fs.cible = cheminNormal(cible);
	fs.pointDeMontage = fs.cible;
	if (options) fs.options = options;
	fs.ro = /(^|,)ro(,|$)/.test(fs.options || "");
	fs.montages = (fs.montages || 0) + 1;
	fs.dernierMontage = maintenantMachine(h);
	creerDossiersHote(h, fs.cible);
	journalMachine(h, { unite: "kernel", noyau: true, message: "EXT4-fs (" + nomCourtPeriph(fs.source) + "): mounted filesystem " + (fs.uuid || "") + " " + (fs.ro ? "ro" : "r/w") + " with ordered data mode. Quota mode: " + (/quota/.test(fs.options || "") ? "journalled" : "none") + "." });
}
function nomCourtPeriph(source){ return String(source).replace(/^\/dev\/(mapper\/)?/, ""); }
/* Ce qui tient un montage occupé : un processus qui y a un fichier ouvert ou son dossier courant, ou ton propre terminal. */
function occupantsMontage(h, cible){
	var occ = [];
	etatMachine(h).procs.forEach(function(p){
		if (p.etat === "Z") return;
		var c = (p.cwd && (p.cwd === cible || p.cwd.indexOf(cible + "/") === 0)) ? "c" : "";
		var f = (p.fichiers || []).some(function(x){ return !x.supprime && x.chemin && (x.chemin === cible || x.chemin.indexOf(cible + "/") === 0); }) ? "f" : "";
		if (c || f) occ.push({ proc: p, acces: c || f });
	});
	var ici = cheminDuLieuMachine(current_room);
	if (ici && (ici === cible || ici.indexOf(cible + "/") === 0)) occ.push({ proc: { pid: PID_BASH, user: JOUEUR, comm: "bash" }, acces: "c", toi: true });
	return occ;
}
var MOUNT_AVANT_MACHINES = Shell.sorts.mount;
Shell.sorts.mount = function(args, io){
	var h = machineIci();
	if (!h) return MOUNT_AVANT_MACHINES.apply(this, arguments);
	var tous = false, options = null, type = null, noms = [], bavard = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-a" || a === "--all"){ tous = true; continue; }
		if (a === "-o" || a === "--options"){ options = args[++i]; continue; }
		if (/^-o.+/.test(a)){ options = a.substring(2); continue; }
		if (a === "-t" || a === "--types"){ type = args[++i]; continue; }
		if (a === "-v" || a === "--verbose"){ bavard = true; continue; }
		if (/^-[av]+$/.test(a)){ if (a.indexOf("a") > -1) tous = true; if (a.indexOf("v") > -1) bavard = true; continue; }
		if (a === "-l") continue;
		if (a.charAt(0) === "-") throw new ShellError("mount: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'");
		noms.push(a);
	}
	var M = etatMachine(h);
	if (!tous && !noms.length){
		var l = fsMontes(h).map(function(f){ return f.source + " on " + f.cible + " type " + f.type + " (" + texteOptionsMontage(f) + ")"; });
		if (type) l = l.filter(function(x){ return x.indexOf(" type " + type + " ") > -1; });
		GameEvents.fire({ type: "machine", hote: h, cmd: "mount", action: "liste" });
		return l.join("\n");
	}
	if (!io.sudo) throw new ShellError("mount: only root can do that" + astuce(io, "Monter un système de fichiers est réservé à root : sudo mount ..."), 1);
	var fstab = lireFstabMachine(h), sortie = [];
	function indice(){
		if (M.fstabCharge !== undefined && M.fstabCharge !== (texteHote(h, "/etc/fstab") || "")) sortie.push("mount: (hint) your fstab has been modified, but systemd still uses\n       the old version; use 'systemctl daemon-reload' to reload.");
	}
	function monterLigne(l, depuisTous){
		if (l.type === "swap" || l.cible === "none") return;
		if (l.options.indexOf("noauto") > -1 && depuisTous) return;
		if (!TYPES_FS_CONNUS.concat(["none"]).some(function(t){ return t === l.type; })){ io.err("mount: " + l.cible + ": unknown filesystem type '" + l.type + "'."); io.code = 32; return; }
		var deja = fsParCible(h, l.cible);
		var s = resoudreSource(h, l.source);
		if (deja && (!s || s.fs === deja)){ if (bavard) sortie.push("mount: " + l.cible + ": already mounted"); return; }
		if (!s || !s.fs){
			if (l.options.indexOf("nofail") > -1){ if (bavard) sortie.push("mount: " + l.cible + ": can't find " + l.source + " (nofail : ignoré)"); return; }
			io.err("mount: " + l.cible + ": can't find " + l.source + "."); io.code = 32; return;
		}
		if (s.fs.cible && s.fs.cible !== cheminNormal(l.cible)){ io.err("mount: " + l.cible + ": " + s.fs.source + " already mounted on " + s.fs.cible + "."); io.code = 32; return; }
		if (s.fs.type !== l.type && l.type !== "auto"){ io.err("mount: " + l.cible + ": wrong fs type, bad option, bad superblock on " + s.fs.source + ", missing codepage or helper program, or other error.\n       dmesg(1) may have more information after failed mount system call."); io.code = 32; return; }
		monterFs(h, s.fs, l.cible, l.options.filter(function(x){ return x !== "defaults" && x !== "nofail"; }).join(",") || "relatime");
		if (s.fs.erreurs) s.fs.ro = false;
		if (bavard) sortie.push("mount: " + s.fs.source + " mounted on " + l.cible + ".");
		GameEvents.fire({ type: "machine", hote: h, cmd: "mount", action: "monte", cible: cheminNormal(l.cible), source: s.fs.source });
	}
	if (tous){
		fstab.forEach(function(l){ monterLigne(l, true); });
		indice();
		GameEvents.fire({ type: "machine", hote: h, cmd: "mount", action: "tous", ok: !io.code });
		GameEvents.fire({ type: "mount", hote: h, action: "all" });
		return sortie.join("\n");
	}
	// mount -o remount,rw CIBLE
	if (options && /(^|,)remount(,|$)/.test(options)){
		var cibleR = noms[noms.length - 1];
		var f = fsParCible(h, cibleR) || (resoudreSource(h, cibleR) || {}).fs;
		if (!f || !f.cible) throw new ShellError("mount: " + cibleR + ": mount point not mounted or bad option.", 32);
		var veutRw = /(^|,)rw(,|$)/.test(options), veutRo = /(^|,)ro(,|$)/.test(options);
		if (veutRw && f.erreurs && f.erreursFatales) throw new ShellError("mount: " + f.cible + ": cannot remount " + f.source + " read-write, is write-protected.\n       dmesg(1) may have more information after failed mount system call.", 32);
		if (veutRw) f.ro = false;
		if (veutRo) f.ro = true;
		var autres = options.split(",").filter(function(x){ return ["remount", "rw", "ro", "defaults"].indexOf(x) === -1; });
		if (autres.length) f.options = autres.join(",");
		if (veutRw && f.erreurs) journalMachine(h, { unite: "kernel", noyau: true, prio: 4, message: "EXT4-fs (" + nomCourtPeriph(f.source) + "): warning: mounting fs with errors, running e2fsck is recommended" });
		GameEvents.fire({ type: "machine", hote: h, cmd: "mount", action: "remount", cible: f.cible, ro: f.ro });
		return "";
	}
	if (noms.length === 1){
		var ligne = fstab.filter(function(l){ return cheminNormal(l.cible) === cheminNormal(noms[0]) || l.source === noms[0]; })[0];
		if (!ligne) throw new ShellError("mount: " + noms[0] + ": can't find in /etc/fstab.", 1);
		monterLigne(ligne, false);
		indice();
		return sortie.join("\n");
	}
	var s = resoudreSource(h, noms[0]);
	if (!s || !s.fs) throw new ShellError("mount: " + noms[1] + ": special device " + noms[0] + " does not exist.", 32);
	if (s.fs.cible) throw new ShellError("mount: " + noms[1] + ": " + s.fs.source + " already mounted on " + s.fs.cible + ".", 32);
	if (!dossierHote(h, noms[1])) throw new ShellError("mount: " + noms[1] + ": mount point does not exist.", 32);
	monterFs(h, s.fs, noms[1], options || "relatime");
	GameEvents.fire({ type: "machine", hote: h, cmd: "mount", action: "monte", cible: cheminNormal(noms[1]), source: s.fs.source });
	return "";
};
Shell.sorts.umount = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("umount : il n'y a rien à démonter ici." + astuce(io, "umount sert sur les machines d'exploitation (chapitre 6)."), 1);
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), paresseux = args.indexOf("-l") > -1;
	if (!noms.length) throw new ShellError("Usage:\n umount [-hV]\n umount -a [options]\n umount [options] <source> | <directory>", 1);
	if (!io.sudo) throw new ShellError("umount: " + noms[0] + ": must be superuser to unmount." + astuce(io, "sudo umount " + noms[0]), 32);
	var sortie = [];
	noms.forEach(function(n){
		var f = fsParCible(h, n) || ((resoudreSource(h, n) || {}).fs);
		if (!f || !f.cible){ io.err("umount: " + n + ": not mounted."); io.code = 32; return; }
		if (f.cible === "/" || f.systeme){ io.err("umount: " + f.cible + ": target is busy."); io.code = 32; return; }
		var occ = occupantsMontage(h, f.cible);
		if (occ.length && !paresseux){
			io.err("umount: " + f.cible + ": target is busy." + (occ.some(function(o){ return o.toi; }) ? astuce(io, "Ton propre terminal est dedans (son dossier courant) : cd / d'abord.") : astuce(io, "Un processus y a encore un fichier ouvert : fuser -vm " + f.cible + " ou lsof " + f.cible + " dira lequel.")));
			io.code = 32;
			GameEvents.fire({ type: "machine", hote: h, cmd: "umount", cible: f.cible, occupe: true });
			return;
		}
		f.pointDeMontage = f.cible;
		f.cible = null;
		GameEvents.fire({ type: "machine", hote: h, cmd: "umount", cible: f.pointDeMontage, occupe: false });
	});
	return sortie.join("\n");
};
Shell.sorts.fuser = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("fuser: command not found", 127);
	var m = false, v = false, k = false, noms = [];
	args.forEach(function(a){ if (/^-[mvkiu]+$/.test(a)){ if (a.indexOf("m") > -1) m = true; if (a.indexOf("v") > -1) v = true; if (a.indexOf("k") > -1) k = true; } else noms.push(a); });
	if (!noms.length) throw new ShellError("No process specification given\nUsage: fuser [-fIMuvw] [-a|-s] [-4|-6] [-c|-m|-n SPACE]\n             [-k [-i] [-SIGNAL]] NAME...", 1);
	var lignes = [], trouve = false;
	if (v) lignes.push(completerGauche("USER", 21) + "        PID ACCESS COMMAND");
	noms.forEach(function(n){
		var chemin = cheminNormal(/^\//.test(n) ? n : cheminDuLieuMachine(current_room) + "/" + n);
		var cible = m ? ((fsDe(h, chemin) || {}).cible || chemin) : chemin;
		var occ = occupantsMontage(h, cible).filter(function(o){ return m || o.proc.cwd === chemin || (o.proc.fichiers || []).some(function(f){ return f.chemin === chemin; }) || o.toi; });
		if (!occ.length) return;
		trouve = true;
		if (v) occ.forEach(function(o, i){ lignes.push(completerDroite(i === 0 ? n + ":" : "", 21) + completerDroite(o.proc.user, 8) + completerGauche(o.proc.pid, 7) + " " + (o.acces === "c" ? "..c.." : "F....") + " " + o.proc.comm); });
		else lignes.push(n + ": " + occ.map(function(o){ return o.proc.pid + o.acces; }).join(" "));
		if (k){
			if (!io.sudo) throw new ShellError("Could not kill process " + occ[0].proc.pid + ": Operation not permitted", 1);
			occ.forEach(function(o){ if (!o.toi && typeof tuerProcessusMachine === "function") tuerProcessusMachine(h, o.proc, 9, "fuser"); });
		}
	});
	if (!trouve) io.code = 1;
	GameEvents.fire({ type: "machine", hote: h, cmd: "fuser", noms: noms, montage: m });
	return lignes.join("\n");
};
var FINDMNT_AVANT_MACHINES = Shell.sorts.findmnt;
Shell.sorts.findmnt = function(args, io){
	var h = machineIci();
	if (!h) return FINDMNT_AVANT_MACHINES.apply(this, arguments);
	if (args.indexOf("--verify") > -1){
		var fstab = lireFstabMachine(h), erreurs = 0, avert = 0, lignes = [], bavard = args.indexOf("--verbose") > -1 || args.indexOf("-v") > -1;
		var cibles = {};
		fstab.forEach(function(l){
			var msgs = [];
			if (l.champs < 4) { msgs.push("[E] parse error: missing fields"); erreurs++; }
			if (l.cible !== "none" && l.type !== "swap"){
				if (cibles[l.cible]){ msgs.push("[W] " + l.cible + " is already listed (line " + cibles[l.cible] + ")"); avert++; }
				cibles[l.cible] = l.num;
				if (!dossierHote(h, l.cible) && l.cible !== "none"){ msgs.push("[W] target does not exist"); avert++; }
			}
			if (TYPES_FS_CONNUS.indexOf(l.type) === -1){ msgs.push("[E] unsupported filesystem type: " + l.type); erreurs++; }
			var s = resoudreSource(h, l.source);
			if (!s){
				if (l.options.indexOf("nofail") > -1){ if (bavard){ msgs.push("   [ ] unreachable source " + l.source + " (nofail)"); } }
				else { msgs.push("[E] unreachable source: " + l.source + ": No such file or directory"); erreurs++; }
			} else if (s.fs && s.fs.type !== l.type && l.type !== "auto" && l.type !== "swap"){ msgs.push("[E] " + l.type + " does not match with on-disk " + s.fs.type); erreurs++; }
			if (msgs.length || bavard) lignes.push(l.cible === "none" ? l.source : l.cible);
			msgs.forEach(function(x){ lignes.push("   " + x); });
			if (bavard && !msgs.length) lignes.push("   [ ] target exists", "   [ ] source " + l.source + " exists");
		});
		GameEvents.fire({ type: "machine", hote: h, cmd: "findmnt", action: "verify", erreurs: erreurs, avertissements: avert });
		io.code = erreurs ? 1 : 0;
		lignes.push(erreurs || avert ? "\n0 parse errors, " + erreurs + " error" + (erreurs > 1 ? "s" : "") + ", " + avert + " warning" + (avert > 1 ? "s" : "") : "Success, no errors or warnings detected");
		return lignes.join("\n");
	}
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var montes = fsMontes(h);
	if (noms.length){
		montes = montes.filter(function(f){ return noms.some(function(n){ return f.cible === cheminNormal(n) || f.source === n; }); });
		if (!montes.length){ io.code = 1; return ""; }
	}
	var rangs = montes.map(function(f){ return [f.cible, f.source, f.type, texteOptionsMontage(f)]; });
	var larg = [6, 6, 6].map(function(x, k){ return Math.max.apply(null, [["TARGET", "SOURCE", "FSTYPE"][k].length].concat(rangs.map(function(r){ return r[k].length; }))); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "findmnt", cibles: noms });
	GameEvents.fire({ type: "mount", hote: h, action: "findmnt", cible: noms[0] || null, options: rangs[0] ? rangs[0][3] : "" });
	return [["TARGET", "SOURCE", "FSTYPE", "OPTIONS"]].concat(rangs).map(function(r){ return completerDroite(r[0], larg[0]) + " " + completerDroite(r[1], larg[1]) + " " + completerDroite(r[2], larg[2]) + " " + r[3]; }).join("\n");
};

/* ================================================================== */
/* RAID logiciel : /proc/mdstat, mdadm                                  */
/* ================================================================== */

function texteMdstat(h){
	var M = etatMachine(h), l = ["Personalities : [raid1] [linear] [multipath] [raid0] [raid6] [raid5] [raid4] [raid10] "];
	(M.raid || []).forEach(function(r){
		var actifs = r.membres.filter(function(m){ return m.etat !== "removed"; });
		var slots = [];
		for (var i = 0; i < r.disques; i++){
			var m = r.membres.filter(function(x){ return x.rang === i && x.etat === "active"; })[0];
			slots.push(m ? "U" : "_");
		}
		l.push(r.nom + " : active raid" + r.niveau + " " + actifs.map(function(m){ return m.dev + "[" + m.numero + "]" + (m.etat === "faulty" ? "(F)" : (m.etat === "spare" ? "(S)" : "")); }).join(" "));
		l.push("      " + Math.floor(r.taille / 1024) + " blocks super 1.2 [" + r.disques + "/" + slots.filter(function(s){ return s === "U"; }).length + "] [" + slots.join("") + "]");
		if (r.reconstruction){
			var p = r.reconstruction.avance, n = Math.floor(p / 5);
			var reste = Math.max(1, Math.round((100 - p) / 100 * 42 * 10) / 10);
			l.push("      [" + new Array(n + 1).join("=") + ">" + new Array(Math.max(1, 21 - n)).join(".") + "]  recovery = " + p.toFixed(1) + "% (" + Math.floor(r.taille / 1024 * p / 100) + "/" + Math.floor(r.taille / 1024) + ") finish=" + reste + "min speed=" + (180000 + (state.nbCommandes % 9) * 1311) + "K/sec");
		}
		l.push("      bitmap: " + (r.reconstruction ? 4 : 0) + "/4 pages [16KB], 65536KB chunk", "");
	});
	l.push("unused devices: <none>");
	return l.join("\n");
}
function raidMachine(h, nom){ return (etatMachine(h).raid || []).filter(function(r){ return "/dev/" + r.nom === nom || r.nom === nom || "/dev/md/" + r.nom.replace(/^md/, "") === nom; })[0] || null; }
function etatRaid(r){
	var actifs = r.membres.filter(function(m){ return m.etat === "active"; }).length;
	if (r.reconstruction) return "clean, degraded, recovering";
	return actifs < r.disques ? "clean, degraded" : "clean";
}
surTicMachine(function(h, M){
	(M.raid || []).forEach(function(r){
		if (!r.reconstruction) return;
		r.reconstruction.avance = Math.min(100, r.reconstruction.avance + (r.vitesse || 4.5));
		if (r.reconstruction.avance >= 100){
			var m = r.membres.filter(function(x){ return x.dev === r.reconstruction.dev; })[0];
			if (m){ m.etat = "active"; m.rang = r.reconstruction.rang; }
			delete r.reconstruction;
			journalMachine(h, { unite: "kernel", noyau: true, message: "md: " + r.nom + ": recovery done." });
			journalMachine(h, { unite: "mdadm", message: "RebuildFinished event detected on md device /dev/" + r.nom });
		}
	});
});
Shell.sorts.mdadm = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("mdadm: command not found", 127);
	if (!io.sudo) throw new ShellError("mdadm: must be super-user to perform this action" + astuce(io, "sudo mdadm ..."), 1);
	var M = etatMachine(h);
	if (args[0] === "--detail" || args[0] === "-D"){
		if (args[1] === "--scan" || args[1] === "-s") return (M.raid || []).map(function(r){ return "ARRAY /dev/" + r.nom + " metadata=1.2 name=" + h + ":" + r.nom.replace(/^md/, "") + " UUID=" + r.uuid; }).join("\n");
		var r = raidMachine(h, args[1] || "");
		if (!r) throw new ShellError("mdadm: cannot open " + (args[1] || "") + ": No such file or directory", 1);
		var actifs = r.membres.filter(function(m){ return m.etat === "active"; }).length, fautifs = r.membres.filter(function(m){ return m.etat === "faulty"; }).length, recon = r.membres.filter(function(m){ return m.etat === "spare"; }).length;
		var l = ["/dev/" + r.nom + ":", "           Version : 1.2", "     Creation Time : " + r.creation, "        Raid Level : raid" + r.niveau, "        Array Size : " + Math.floor(r.taille / 1024) + " (" + (r.taille / GIO).toFixed(2) + " GiB " + (r.taille / 1e9).toFixed(2) + " GB)",
			"     Used Dev Size : " + Math.floor(r.taille / 1024) + " (" + (r.taille / GIO).toFixed(2) + " GiB " + (r.taille / 1e9).toFixed(2) + " GB)", "      Raid Devices : " + r.disques, "     Total Devices : " + r.membres.filter(function(m){ return m.etat !== "removed"; }).length,
			"       Persistence : Superblock is persistent", "", "     Intent Bitmap : Internal", "", "       Update Time : " + dateCtimeMachine(h), "             State : " + etatRaid(r) + " ",
			"    Active Devices : " + actifs, "   Working Devices : " + (actifs + recon), "    Failed Devices : " + fautifs, "     Spare Devices : " + recon, "", "Consistency Policy : bitmap", ""];
		if (r.reconstruction) l.push("    Rebuild Status : " + Math.floor(r.reconstruction.avance) + "% complete", "");
		l.push("              Name : " + h + ":" + r.nom.replace(/^md/, "") + "  (local to host " + h + ")", "              UUID : " + r.uuid, "            Events : " + (r.evenements || 1874), "",
			"    Number   Major   Minor   RaidDevice State");
		for (var i = 0; i < r.disques; i++){
			var m = r.membres.filter(function(x){ return x.rang === i && x.etat === "active"; })[0] || r.membres.filter(function(x){ return x.etat === "spare" && r.reconstruction && x.dev === r.reconstruction.dev && r.reconstruction.rang === i; })[0];
			if (m) l.push("       " + m.numero + "       8       " + completerGauche(m.mineur || 17, 2) + "        " + i + "      " + (m.etat === "spare" ? "spare rebuilding" : "active sync") + "   /dev/" + m.dev);
			else l.push("       -       0        0        " + i + "      removed");
		}
		r.membres.filter(function(m){ return m.etat === "faulty"; }).forEach(function(m){ l.push("", "       " + m.numero + "       8       " + completerGauche(m.mineur || 17, 2) + "        -      faulty   /dev/" + m.dev); });
		GameEvents.fire({ type: "machine", hote: h, cmd: "mdadm", action: "detail", raid: r.nom });
		return l.join("\n");
	}
	if (args[0] === "--examine" || args[0] === "-E"){
		var dev = (args[1] || "").replace(/^\/dev\//, "");
		var trouve = null;
		(M.raid || []).forEach(function(r){ r.membres.forEach(function(m){ if (m.dev === dev) trouve = { r: r, m: m }; }); });
		if (!trouve) throw new ShellError("mdadm: No md superblock detected on " + args[1] + ".", 1);
		GameEvents.fire({ type: "machine", hote: h, cmd: "mdadm", action: "examine", dev: dev });
		return "/dev/" + dev + ":\n          Magic : a92b4efc\n        Version : 1.2\n    Feature Map : 0x1\n     Array UUID : " + trouve.r.uuid + "\n           Name : " + h + ":" + trouve.r.nom.replace(/^md/, "") +
			"\n  Creation Time : " + trouve.r.creation + "\n     Raid Level : raid" + trouve.r.niveau + "\n   Raid Devices : " + trouve.r.disques + "\n\n    Device Role : Active device " + trouve.m.numero +
			"\n    Array State : " + (trouve.m.etat === "faulty" ? "AA ('A' == active, '.' == missing, 'R' == replacing)" : texteMdstat(h).indexOf("[UU]") > -1 ? "AA ('A' == active, '.' == missing, 'R' == replacing)" : ".A ('A' == active, '.' == missing, 'R' == replacing)") +
			"\n         Events : " + (trouve.m.etat === "faulty" ? 1203 : (trouve.r.evenements || 1874));
	}
	// mdadm /dev/md0 --fail /dev/sdb1 --remove /dev/sdb1 --add /dev/sdd1 (ou --manage)
	var cible = args.filter(function(a){ return /^\/dev\/md/.test(a); })[0];
	var r2 = cible ? raidMachine(h, cible) : null;
	if (!r2) throw new ShellError("mdadm: No devices given.\nUsage: mdadm --help\n  for help", 1);
	var sortie = [], action = null;
	for (var k = 0; k < args.length; k++){
		var a = args[k];
		if (a === "--fail" || a === "-f" || a === "--set-faulty"){ action = "fail"; continue; }
		if (a === "--remove" || a === "-r"){ action = "remove"; continue; }
		if (a === "--add" || a === "-a"){ action = "add"; continue; }
		if (a === "--manage" || a === cible) continue;
		if (!action) continue;
		var d2 = a.replace(/^\/dev\//, "");
		var m2 = r2.membres.filter(function(x){ return x.dev === d2; })[0];
		if (action === "fail"){
			if (!m2 || m2.etat === "removed") throw new ShellError("mdadm: set device faulty failed for " + a + ":  No such device", 1);
			if (m2.etat === "active" && r2.membres.filter(function(x){ return x.etat === "active"; }).length <= 1){ throw new ShellError("mdadm: set device faulty failed for " + a + ":  Device or resource busy" + astuce(io, "C'est le dernier disque sain du miroir : le marquer en panne arrêterait la grappe."), 1); }
			m2.etat = "faulty";
			sortie.push("mdadm: set " + a + " faulty in /dev/" + r2.nom);
		} else if (action === "remove"){
			if (!m2 || m2.etat === "removed") throw new ShellError("mdadm: hot remove failed for " + a + ": No such device or address", 1);
			if (m2.etat === "active") throw new ShellError("mdadm: hot remove failed for " + a + ": Device or resource busy" + astuce(io, "On ne retire qu'un disque marqué en panne : --fail d'abord."), 1);
			m2.etat = "removed";
			r2.evenements = (r2.evenements || 1874) + 2;
			sortie.push("mdadm: hot removed " + a + " from /dev/" + r2.nom);
		} else if (action === "add"){
			if (m2 && m2.etat !== "removed") throw new ShellError("mdadm: Cannot open " + a + ": Device or resource busy", 1);
			var p = peripheriques(h).filter(function(x){ return x.chemin === a; })[0];
			if (!p) throw new ShellError("mdadm: cannot find " + a + ": No such file or directory", 1);
			if (p.taille < r2.taille) throw new ShellError("mdadm: " + a + " not large enough to join array", 1);
			var libre = -1;
			for (var i2 = 0; i2 < r2.disques; i2++) if (!r2.membres.some(function(x){ return x.rang === i2 && x.etat === "active"; })) libre = i2;
			r2.membres = r2.membres.filter(function(x){ return x.dev !== d2; });
			var nouveau = { dev: d2, numero: Math.max.apply(null, r2.membres.map(function(x){ return x.numero; })) + 1, etat: libre > -1 ? "spare" : "spare", rang: -1, mineur: p.mineur };
			r2.membres.push(nouveau);
			if (p.part) p.part.contenu = "linux_raid_member";
			if (libre > -1){ r2.reconstruction = { dev: d2, rang: libre, avance: 0.1 }; journalMachine(h, { unite: "kernel", noyau: true, message: "md: recovery of RAID array " + r2.nom }); }
			sortie.push("mdadm: added " + a);
		}
		GameEvents.fire({ type: "machine", hote: h, cmd: "mdadm", action: action, dev: d2, raid: r2.nom });
	}
	return sortie.join("\n");
};
function dateCtimeMachine(h, ms){ var d = dateMachine(h, ms); return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + completerGauche(d.getDate(), 2) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()) + " " + d.getFullYear(); }

/* ================================================================== */
/* SMART                                                                */
/* ================================================================== */

surTicMachine(function(h, M){
	(M.disques || []).forEach(function(d){ if (d.smart && d.smart.degradation && d.smart.realloues !== undefined) d.smart.realloues += d.smart.degradation; if (d.smart && d.smart.test && d.smart.test.reste > 0) d.smart.test.reste--; });
});
Shell.sorts.smartctl = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("smartctl: command not found", 127);
	var entete = "smartctl 7.3 2022-02-28 r5338 [x86_64-linux-" + (typeof versionNoyau === "function" ? versionNoyau(h) : "6.1.0") + "] (local build)\nCopyright (C) 2002-22, Bruce Allen, Christian Franke, www.smartmontools.org\n";
	if (!io.sudo) throw new ShellError(entete + "\nSmartctl open device: " + (args[args.length - 1] || "") + " failed: Permission denied" + astuce(io, "sudo smartctl ..."), 2);
	var dev = args.filter(function(a){ return /^\/dev\//.test(a); })[0];
	var d = dev ? (etatMachine(h).disques || []).filter(function(x){ return "/dev/" + x.nom === dev && !x.absent; })[0] : null;
	if (!d) throw new ShellError(entete + "\nSmartctl open device: " + (dev || "") + " failed: No such device", 2);
	var s = d.smart || { sain: true, realloues: 0, heures: 1000, temperature: 35 };
	var a = args.indexOf("-a") > -1 || args.indexOf("--all") > -1 || args.indexOf("-x") > -1;
	var H = args.indexOf("-H") > -1 || args.indexOf("--health") > -1 || a;
	var i = args.indexOf("-i") > -1 || args.indexOf("--info") > -1 || a;
	var t = args.indexOf("-t") > -1 ? args[args.indexOf("-t") + 1] : null;
	var l = args.indexOf("-l") > -1 ? args[args.indexOf("-l") + 1] : null;
	var sortie = [entete];
	if (t){
		if (!/^(short|long|conveyance|offline)$/.test(t || "")) throw new ShellError(entete + "\n=======> INVALID ARGUMENT TO -t: " + t, 1);
		s.test = { type: t, reste: t === "short" ? 2 : 6, debut: maintenantMachine(h) };
		d.smart = s;
		GameEvents.fire({ type: "machine", hote: h, cmd: "smartctl", action: "test", dev: d.nom });
		return sortie.concat(["=== START OF OFFLINE IMMEDIATE AND SELF-TEST SECTION ===", "Sending command: \"Execute SMART " + (t === "short" ? "Short" : "Extended") + " self-test routine immediately in off-line mode\".",
			"Drive command \"Execute SMART " + (t === "short" ? "Short" : "Extended") + " self-test routine immediately in off-line mode\" successful.", "Testing has begun.", "Please wait " + (t === "short" ? 2 : 74) + " minutes for test to complete.",
			"Test will complete after " + dateCtimeMachine(h, maintenantMachine(h) + (t === "short" ? 2 : 74) * 60000), "", "Use smartctl -X to abort test."]).join("\n");
	}
	if (l === "selftest"){
		var lignes = ["=== START OF READ SMART DATA SECTION ===", "SMART Self-test log structure revision number 1", "Num  Test_Description    Status                  Remaining  LifeTime(hours)  LBA_of_first_error"];
		if (s.test){
			if (s.test.reste > 0) lignes.push("# 1  " + completerDroite(s.test.type === "short" ? "Short offline" : "Extended offline", 20) + completerDroite("Self-test routine in progress", 24) + " 60%      " + completerGauche(s.heures, 5) + "         -");
			else lignes.push("# 1  " + completerDroite(s.test.type === "short" ? "Short offline" : "Extended offline", 20) + completerDroite(s.sain ? "Completed without error" : "Completed: read failure", 24) + "  00%      " + completerGauche(s.heures, 5) + "         " + (s.sain ? "-" : "1953525100"));
		}
		lignes.push("# " + (s.test ? 2 : 1) + "  Short offline       Completed without error       00%      " + completerGauche(s.heures - 720, 5) + "         -");
		GameEvents.fire({ type: "machine", hote: h, cmd: "smartctl", action: "selftest", dev: d.nom, fini: !!(s.test && s.test.reste <= 0) });
		return sortie.concat(lignes).join("\n");
	}
	if (i) sortie.push("=== START OF INFORMATION SECTION ===", "Device Model:     " + (d.modele || "LUMEN DISK"), "Serial Number:    " + (d.serie || hexDe(d.nom, 12).toUpperCase()), "Firmware Version: " + (d.firmware || "CC45"),
		"User Capacity:    " + entierAvecEspaces(d.taille) + " bytes [" + Math.round(d.taille / 1e9) + " GB]", "Sector Size:      512 bytes logical/physical", "Rotation Rate:    " + (d.rotation ? d.rotation + " rpm" : "Solid State Device"),
		"Device is:        Not in smartctl database 7.3/5319", "ATA Version is:   ACS-3 T13/2161-D revision 5", "SATA Version is:  SATA 3.2, 6.0 Gb/s (current: 6.0 Gb/s)", "Local Time is:    " + dateCtimeMachine(h) + " " + abregeFuseau(h),
		"SMART support is: Available - device has SMART capability.", "SMART support is: Enabled", "");
	if (H){
		sortie.push("=== START OF READ SMART DATA SECTION ===", "SMART overall-health self-assessment test result: " + (s.sain ? "PASSED" : "FAILED!"));
		if (!s.sain) sortie.push("Drive failure expected in less than 24 hours. SAVE ALL DATA.", "See vendor-specific Attribute list for failed Attributes.");
		sortie.push("");
	}
	if (a){
		sortie.push("SMART Attributes Data Structure revision number: 16", "Vendor Specific SMART Attributes with Thresholds:",
			"ID# ATTRIBUTE_NAME          FLAG     VALUE WORST THRESH TYPE      UPDATED  WHEN_FAILED RAW_VALUE",
			"  1 Raw_Read_Error_Rate     0x002f   " + (s.sain ? "200   200   051" : "001   001   051") + "    Pre-fail  Always       " + (s.sain ? "-       " : "FAILING_NOW") + " " + (s.sain ? 0 : 48213),
			"  5 Reallocated_Sector_Ct   0x0033   " + completerGauche(Math.max(1, 200 - Math.floor(s.realloues / 8)), 3) + "   " + completerGauche(Math.max(1, 200 - Math.floor(s.realloues / 8)), 3) + "   140    Pre-fail  Always       -       " + s.realloues,
			"  9 Power_On_Hours          0x0032   071   071   000    Old_age   Always       -       " + s.heures,
			"194 Temperature_Celsius     0x0022   " + (150 - s.temperature) + "   099   000    Old_age   Always       -       " + s.temperature,
			"197 Current_Pending_Sector  0x0032   200   200   000    Old_age   Always       -       " + (s.attente || 0),
			"198 Offline_Uncorrectable   0x0030   100   253   000    Old_age   Offline      -       " + (s.sain ? 0 : 211),
			"199 UDMA_CRC_Error_Count    0x0032   200   200   000    Old_age   Always       -       0", "");
	}
	if (!H && !i && !a) throw new ShellError(entete + "\nERROR: smartctl requires a device name as the final command-line argument.\n\nUse smartctl -h to get a usage summary", 1);
	GameEvents.fire({ type: "machine", hote: h, cmd: "smartctl", action: a ? "all" : (H ? "health" : "info"), dev: d.nom, sain: s.sain, realloues: s.realloues });
	if (!s.sain) io.code = 8;
	return sortie.join("\n").replace(/\n+$/, "");
};

/* ================================================================== */
/* e2fsck, fsck, tune2fs                                                */
/* ================================================================== */

function e2fsck(nomCmd){
	return function(args, io){
		var h = machineIci();
		if (!h) throw new ShellError(nomCmd + ": command not found", 127);
		var oui = false, non = false, force = false, preen = false, dev = null;
		args.forEach(function(a){
			if (/^-[fynpvC0-9]+$/.test(a)){ if (a.indexOf("y") > -1) oui = true; if (a.indexOf("n") > -1) non = true; if (a.indexOf("f") > -1) force = true; if (a.indexOf("p") > -1) preen = true; }
			else if (a === "-a") preen = true;
			else if (a.charAt(0) !== "-") dev = a;
		});
		var t = "e2fsck 1.47.0 (5-Feb-2023)\n";
		if (!dev) throw new ShellError("Usage: e2fsck [-panyrcdfktvDFV] [-b superblock] [-B blocksize]\n\t\t[-l|-L bad_blocks_file] [-C fd] [-j external_journal]\n\t\t[-E extended-options] [-z undo_file] device", 16);
		if (!io.sudo) throw new ShellError(t + nomCmd + ": Permission denied while trying to open " + dev + "\nYou must have r/w access to the filesystem or be root" + astuce(io, "sudo " + nomCmd + " ..."), 8);
		var s = resoudreSource(h, dev);
		if (!s || !s.fs) throw new ShellError(t + nomCmd + ": No such file or directory while trying to open " + dev + "\nPossibly non-existent device?", 8);
		var fs = s.fs, nom = dev;
		if (fs.cible && !non){
			GameEvents.fire({ type: "machine", hote: h, cmd: "e2fsck", dev: fs.source, monte: true });
			throw new ShellError(t + nom + " is mounted.\ne2fsck: Cannot continue, aborting.\n\n" + astuce(io, "On ne répare jamais un système de fichiers monté : les écritures en cours le corrompraient davantage. umount d'abord (et fuser -vm si c'est occupé)."), 8);
		}
		if (!oui && !non && !preen) throw new ShellError(t + nomCmd + ": need terminal for interactive repairs" + astuce(io, "Dans un vrai terminal, e2fsck pose une question par réparation. Ici : -y (répondre oui à tout), -n (ne rien changer, juste lire) ou -p (les réparations sans risque)."), 8);
		var l = libreFs(h, fs);
		var resume = nom + ": " + Math.max(11, l.iutilises) + "/" + (fs.inodes || 0) + " files (" + (fs.erreurs ? "3.7" : "0.4") + "% non-contiguous), " + Math.floor(l.utilise / 4096) + "/" + Math.floor(fs.taille / 4096) + " blocks";
		if (!fs.erreurs && !force){
			GameEvents.fire({ type: "machine", hote: h, cmd: "e2fsck", dev: fs.source, propre: true });
			return t + nom + ": clean, " + resume.substring(nom.length + 2);
		}
		var sortie = [t.replace(/\n$/, "")];
		if (!force && fs.erreurs) sortie.push(nom + " contains a file system with errors, check forced.");
		sortie.push("Pass 1: Checking inodes, blocks, and sizes");
		if (fs.erreurs){
			sortie.push("Inode 1572903 has illegal block(s).  Clear? " + (non ? "no" : "yes"), "", "Illegal block #12 (4294967295) in inode 1572903.  " + (non ? "IGNORED" : "CLEARED") + ".");
			sortie.push("Inode 1572903, i_blocks is 2048, should be 2040.  Fix? " + (non ? "no" : "yes"), "");
		}
		sortie.push("Pass 2: Checking directory structure");
		if (fs.erreurs) sortie.push("Entry 'releve-0412.dat' in /registres (1572880) has deleted/unused inode 1572911.  Clear? " + (non ? "no" : "yes"), "");
		sortie.push("Pass 3: Checking directory connectivity", "Pass 4: Checking reference counts", "Pass 5: Checking group summary information");
		if (fs.erreurs) sortie.push("Block bitmap differences:  -(6291458--6291465)", "Fix? " + (non ? "no" : "yes"), "", "Free blocks count wrong for group #192 (31481, counted=31489).", "Fix? " + (non ? "no" : "yes"), "");
		if (non && fs.erreurs){
			sortie.push("", nom + ": ********** WARNING: Filesystem still has errors **********", "", resume);
			io.code = 4;
			GameEvents.fire({ type: "machine", hote: h, cmd: "e2fsck", dev: fs.source, lecture: true });
			return sortie.join("\n");
		}
		var avait = fs.erreurs;
		fs.erreurs = 0;
		fs.erreursFatales = false;
		fs.dernierCheck = maintenantMachine(h);
		fs.montages = 0;
		fs.etat = "clean";
		if (avait) sortie.push("", nom + ": ***** FILE SYSTEM WAS MODIFIED *****");
		sortie.push(resume);
		io.code = avait ? 1 : 0;
		GameEvents.fire({ type: "machine", hote: h, cmd: "e2fsck", dev: fs.source, repare: !!avait, force: force });
		return sortie.join("\n");
	};
}
Shell.sorts.e2fsck = e2fsck("e2fsck");
Shell.sorts["fsck.ext4"] = e2fsck("fsck.ext4");
Shell.sorts.fsck = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("fsck: command not found", 127);
	return "fsck from util-linux 2.38.1\n" + e2fsck("fsck.ext4")(args.filter(function(a){ return a !== "-t" && a !== "ext4"; }), io);
};
Shell.sorts.tune2fs = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("tune2fs: command not found", 127);
	var dev = args.filter(function(a, i){ return /^\//.test(a) && !/^-/.test(args[i - 1] || "") || /^\/dev\//.test(a); }).pop();
	var t = "tune2fs 1.47.0 (5-Feb-2023)\n";
	if (!dev) throw new ShellError("Usage: tune2fs [-c max_mounts_count] [-e errors_behavior] [-f] [-g group]\n\t[-i interval[d|m|w]] [-j] [-J journal_options] [-l]\n\t[-m reserved_blocks_percent] [-o [^]mount_options[,...]]\n\t[-r reserved_blocks_count] [-u user] [-C mount_count]\n\t[-L volume_label] [-M last_mounted_dir] device", 1);
	if (!io.sudo) throw new ShellError(t + "tune2fs: Permission denied while trying to open " + dev + "\nCouldn't find valid filesystem superblock." + astuce(io, "sudo tune2fs ..."), 1);
	var s = resoudreSource(h, dev);
	if (!s || !s.fs) throw new ShellError(t + "tune2fs: No such file or directory while trying to open " + dev + "\nCouldn't find valid filesystem superblock.", 1);
	var fs = s.fs, sortie = [t.replace(/\n$/, "")], change = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-c"){ var c = parseInt(args[++i], 10); if (isNaN(c)) throw new ShellError(t + "tune2fs: bad mounts count - " + args[i], 1); fs.maxMontages = c; sortie.push("Setting maximal mount count to " + c); change = true; }
		else if (a === "-C"){ fs.montages = parseInt(args[++i], 10) || 0; sortie.push("Setting current mount count to " + fs.montages); change = true; }
		else if (a === "-m"){ var p = parseFloat(args[++i]); if (isNaN(p) || p < 0 || p > 50) throw new ShellError(t + "tune2fs: bad reserved block ratio - " + args[i], 1); fs.reserve = p / 100; sortie.push("Setting reserved blocks percentage to " + p + "% (" + Math.floor(fs.taille / 4096 * p / 100) + " blocks)"); change = true; }
		else if (a === "-i"){ var iv = args[++i] || ""; var mm = /^(\d+)([dwm]?)$/.exec(iv); if (!mm) throw new ShellError(t + "tune2fs: bad interval - " + iv, 1); fs.intervalle = +mm[1] * ({ "": 1, d: 1, w: 7, m: 30 }[mm[2]]); sortie.push("Setting interval between checks to " + fs.intervalle * 86400 + " seconds"); change = true; }
		else if (a === "-L"){ fs.label = args[++i]; change = true; }
		else if (a === "-e"){ fs.comportement = args[++i]; sortie.push("Setting error behavior to " + ({ "continue": 1, "remount-ro": 2, panic: 3 }[fs.comportement] || 1)); change = true; }
	}
	if (args.indexOf("-l") > -1){
		var l = libreFs(h, fs), d = function(ms){ return dateCtimeMachine(h, ms); };
		sortie.push("Filesystem volume name:   " + (fs.label || "<none>"), "Last mounted on:          " + (fs.cible || fs.pointDeMontage || "<not available>"), "Filesystem UUID:          " + fs.uuid,
			"Filesystem magic number:  0xEF53", "Filesystem revision #:    1 (dynamic)",
			"Filesystem features:      has_journal ext_attr resize_inode dir_index filetype " + (fs.cible ? "needs_recovery " : "") + "extent 64bit flex_bg sparse_super large_file huge_file dir_nlink extra_isize metadata_csum" + (/quota/.test(fs.options || "") ? " quota" : ""),
			"Filesystem flags:         signed_directory_hash ", "Default mount options:    user_xattr acl", "Filesystem state:         " + (fs.erreurs ? "clean with errors" : "clean"),
			"Errors behavior:          " + ({ "continue": "Continue", "remount-ro": "Remount read-only", panic: "Panic" }[fs.comportement || "continue"]), "Filesystem OS type:       Linux",
			"Inode count:              " + (fs.inodes || 0), "Block count:              " + Math.floor(fs.taille / 4096), "Reserved block count:     " + Math.floor(fs.taille / 4096 * (fs.reserve || 0)),
			"Overhead clusters:        " + Math.floor(fs.taille / 4096 / 64), "Free blocks:              " + Math.floor((fs.taille - l.utilise) / 4096), "Free inodes:              " + Math.max(0, (fs.inodes || 0) - l.iutilises),
			"First block:              0", "Block size:               4096", "Fragment size:            4096", "Group descriptor size:    64", "Reserved GDT blocks:      1024", "Blocks per group:         32768",
			"Inodes per group:         " + Math.max(1, Math.floor((fs.inodes || 8192) / Math.max(1, Math.ceil(fs.taille / 4096 / 32768)))), "Flex block group size:    16",
			"Filesystem created:       " + d(fs.creation || maintenantMachine(h) - 420 * 86400000), "Last mount time:          " + d(fs.dernierMontage || maintenantMachine(h) - 41 * 86400000),
			"Last write time:          " + d(maintenantMachine(h) - 60000), "Mount count:              " + (fs.montages || 0), "Maximum mount count:      " + (fs.maxMontages === undefined ? -1 : fs.maxMontages),
			"Last checked:             " + d(fs.dernierCheck || fs.creation || maintenantMachine(h) - 420 * 86400000), "Check interval:           " + (fs.intervalle ? fs.intervalle * 86400 + " (" + (fs.intervalle % 30 === 0 ? fs.intervalle / 30 + " month" + (fs.intervalle > 30 ? "s" : "") : fs.intervalle + " days") + ")" : "0 (<none>)"),
			"Lifetime writes:          " + Math.round((fs.ecritures || 812) ) + " GB", "Reserved blocks uid:      0 (user root)", "Reserved blocks gid:      0 (group root)", "First inode:              11", "Inode size:\t          256",
			"Required extra isize:     32", "Desired extra isize:      32", "Journal inode:            8", "Default directory hash:   half_md4", "Journal backup:           inode blocks", "Checksum type:            crc32c");
		if (fs.erreurs) sortie.push("FS Error count:           " + fs.erreurs, "First error time:         " + d(fs.premiereErreur || maintenantMachine(h) - 9 * 3600000), "First error function:     ext4_validate_block_bitmap", "First error line #:       421");
	}
	GameEvents.fire({ type: "machine", hote: h, cmd: "tune2fs", dev: fs.source, lecture: args.indexOf("-l") > -1, change: change, reserve: fs.reserve, maxMontages: fs.maxMontages });
	return sortie.join("\n");
};

/* ================================================================== */
/* L'échange : fallocate, mkswap, swapon, swapoff                       */
/* ================================================================== */

Shell.sorts.fallocate = function(args, io){
	var h = machineIci();
	var taille = null, nom = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-l" || args[i] === "--length"){ taille = args[++i]; continue; }
		if (/^-l.+/.test(args[i])){ taille = args[i].substring(2); continue; }
		if (/^--length=/.test(args[i])){ taille = args[i].substring(9); continue; }
		if (args[i].charAt(0) === "-") continue;
		nom = args[i];
	}
	if (taille === null || nom === null) throw new ShellError("fallocate: no length argument specified\nTry 'fallocate --help' for more information.", 1);
	var octets = lireTaille(taille);
	if (octets === null || octets <= 0) throw new ShellError("fallocate: invalid length value specified", 1);
	var r = Shell.chercher(nom, io, "fallocate");
	if (r.node instanceof Room) throw new ShellError("fallocate: " + nom + ": Is a directory", 1);
	if (!r.dir) throw new ShellError("fallocate: cannot open " + nom + ": No such file or directory", 1);
	if (!io.sudo && !Shell.bit(r.dir, "w", io)) throw new ShellError("fallocate: cannot open " + nom + ": Permission denied" + astuce(io, "sudo fallocate ..."), 1);
	if (h){
		var chemin = cheminNormal(cheminDuLieuMachine(r.dir) + "/" + r.name), fs = fsDe(h, chemin), l = libreFs(h, fs);
		if (fs.ro) throw new ShellError("fallocate: cannot open " + nom + ": Read-only file system", 1);
		if (octets > l.dispo + (r.node ? tailleObjetMachine(r.node) : 0)) throw new ShellError("fallocate: fallocate failed: No space left on device", 1);
	}
	var item = r.node;
	moteurSeul(function(){
		if (!item){ item = new Item(r.name, "", "item_sign.gif"); item.owner = io.sudo ? "root" : JOUEUR; item.mode = "rw-r--r--"; r.dir.addItem(item); }
	});
	item.taille = octets;
	item.cmd_text.less = "";
	item.binaire = undefined;
	if (h) item.mtimeMs = maintenantMachine(h);
	GameEvents.fire({ type: "machine", hote: h, cmd: "fallocate", chemin: h ? cheminNormal(cheminDuLieuMachine(r.dir) + "/" + r.name) : nom, taille: octets });
	return "";
};
Shell.sorts.mkswap = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("mkswap: command not found", 127);
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!nom) throw new ShellError("mkswap: no device specified\nTry 'mkswap --help' for more information.", 1);
	if (!io.sudo) throw new ShellError("mkswap: cannot open " + nom + ": Permission denied" + astuce(io, "sudo mkswap " + nom), 1);
	var r = Shell.chercher(nom, io, "mkswap");
	if (!(r.node instanceof Item)) throw new ShellError("mkswap: cannot open " + nom + ": No such file or directory", 1);
	var taille = tailleObjetMachine(r.node);
	if (taille < 40960) throw new ShellError("mkswap: error: swap area needs to be at least 40 KiB", 1);
	var chemin = cheminNormal(cheminDuLieuMachine(r.dir) + "/" + r.name);
	var M = etatMachine(h), uuid = hexDe("swap:" + chemin + ":" + state.nbCommandes, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
	M.echanges = (M.echanges || []).filter(function(s){ return s.chemin !== chemin; });
	M.echanges.push({ chemin: chemin, uuid: uuid, taille: taille });
	r.node.swap = uuid;
	var avert = r.node.mode !== "rw-------" ? "mkswap: " + chemin + ": insecure permissions " + modeOctal(r.node.mode).replace(/^0/, "0") + ", fix with: chmod 0600 " + chemin + "\n" : "";
	GameEvents.fire({ type: "machine", hote: h, cmd: "mkswap", chemin: chemin });
	return avert + "Setting up swapspace version 1, size = " + humainFree(Math.floor(taille / 1024) - 4).replace("Gi", " GiB").replace("Mi", " MiB") + " (" + (taille - 4096) + " bytes)\nno label, UUID=" + uuid;
};
function activerSwap(h, chemin, io, prio){
	var M = etatMachine(h);
	var e = (M.echanges || []).filter(function(s){ return s.chemin === chemin; })[0];
	var f = fichierHote(h, chemin);
	if (!f && !e) throw new ShellError("swapon: cannot open " + chemin + ": No such file or directory", 1);
	if (!e) throw new ShellError("swapon: " + chemin + ": read swap header failed" + astuce(io, "Le fichier n'est pas encore une zone d'échange : sudo mkswap " + chemin), 1);
	if ((M.swaps || []).some(function(s){ return s.chemin === chemin; })) throw new ShellError("swapon: " + chemin + ": swapon failed: Device or resource busy", 1);
	var avert = "";
	if (f && f.mode !== "rw-------") avert = "swapon: " + chemin + ": insecure permissions " + modeOctal(f.mode) + ", 0600 suggested.";
	M.swaps = M.swaps || [];
	M.swaps.push({ chemin: chemin, type: f ? "file" : "partition", taille: Math.floor(e.taille / 1024) - 4, utilise: 0, prio: prio === undefined ? -2 - M.swaps.length : prio });
	journalMachine(h, { unite: "kernel", noyau: true, message: "Adding " + (Math.floor(e.taille / 1024) - 4) + "k swap on " + chemin + ".  Priority:-2 extents:1 across:" + (Math.floor(e.taille / 1024) - 4) + "k SS" });
	GameEvents.fire({ type: "machine", hote: h, cmd: "swapon", chemin: chemin });
	return avert;
}
Shell.sorts.swapon = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("swapon: command not found", 127);
	var M = etatMachine(h);
	var montrer = args.length === 0 || args.indexOf("--show") > -1 || args.indexOf("-s") > -1 || args.indexOf("--summary") > -1;
	if (args.indexOf("-a") > -1 || args.indexOf("--all") > -1){
		if (!io.sudo) throw new ShellError("swapon: cannot open: Permission denied", 1);
		var avs = [];
		lireFstabMachine(h).filter(function(l){ return l.type === "swap"; }).forEach(function(l){
			var s = resoudreSource(h, l.source);
			var chemin = s ? s.chemin : l.source;
			if ((M.swaps || []).some(function(x){ return x.chemin === chemin; })) return;
			try { var a = activerSwap(h, chemin, io); if (a) avs.push(a); } catch (e){ if (!(e instanceof ShellError)) throw e; if (l.options.indexOf("nofail") === -1){ io.err(e.message); io.code = 1; } }
		});
		return avs.join("\n");
	}
	if (montrer){
		GameEvents.fire({ type: "machine", hote: h, cmd: "swapon", action: "show" });
		var sw = M.swaps || [];
		if (!sw.length) return "";
		if (args.indexOf("-s") > -1 || args.indexOf("--summary") > -1) return "Filename\t\t\t\tType\t\tSize\t\tUsed\t\tPriority\n" + sw.map(function(s){ return completerDroite(s.chemin, 40) + completerDroite(s.type, 16) + completerDroite(s.taille, 16) + completerDroite(s.utilise, 16) + s.prio; }).join("\n");
		return "NAME      TYPE SIZE USED PRIO\n" + sw.map(function(s){ return completerDroite(s.chemin, 9) + " " + completerDroite(s.type, 4) + " " + completerGauche(humainLsblk(s.taille * 1024), 4) + " " + completerGauche(humainLsblk(s.utilise * 1024).replace(/^0B$/, "0B"), 4) + " " + completerGauche(s.prio, 4); }).join("\n");
	}
	if (!io.sudo) throw new ShellError("swapon: " + (args[args.length - 1] || "") + ": swapon failed: Operation not permitted" + astuce(io, "sudo swapon ..."), 1);
	var prio = args.indexOf("-p") > -1 ? parseInt(args[args.indexOf("-p") + 1], 10) : undefined;
	var cible = args.filter(function(a, i){ return a.charAt(0) !== "-" && args[i - 1] !== "-p"; })[0];
	return activerSwap(h, cheminNormal(/^\//.test(cible) ? cible : cheminDuLieuMachine(current_room) + "/" + cible), io, prio);
};
Shell.sorts.swapoff = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("swapoff: command not found", 127);
	if (!io.sudo) throw new ShellError("swapoff: Not superuser.", 1);
	var M = etatMachine(h), cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (args.indexOf("-a") > -1){ M.swaps = []; return ""; }
	var chemin = cheminNormal(/^\//.test(cible || "") ? cible : cheminDuLieuMachine(current_room) + "/" + (cible || ""));
	if (!(M.swaps || []).some(function(s){ return s.chemin === chemin; })) throw new ShellError("swapoff: " + chemin + ": swapoff failed: Invalid argument", 1);
	M.swaps = M.swaps.filter(function(s){ return s.chemin !== chemin; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "swapoff", chemin: chemin });
	return "";
};

/* ================================================================== */
/* Les quotas                                                           */
/* ================================================================== */

function fsQuota(h, cible, io, cmd){
	var fs = fsParCible(h, cible) || (resoudreSource(h, cible) || {}).fs;
	if (!fs || !fs.cible) throw new ShellError(cmd + ": Mountpoint (or device) " + cible + " not found or has no quota enabled.", 1);
	if (!/usrquota|quota/.test(fs.options || "")) throw new ShellError(cmd + ": Mountpoint (or device) " + cible + " not found or has no quota enabled." + astuce(io, "Les quotas se posent sur un système de fichiers monté avec l'option usrquota (voir /etc/fstab)."), 1);
	fs.quotas = fs.quotas || { u: {}, g: {} };
	return fs;
}
function utilisationQuota(h, fs, qui, groupe){
	var octets = 0, fichiers = 0, d = dossierHote(h, fs.cible);
	if (d) (function parcourir(l){ l.items.forEach(function(it){ if ((groupe ? it.groupe : it.owner) === qui){ octets += blocsOctets(tailleObjetMachine(it)); fichiers++; } }); l.children.forEach(function(c){ if (c.parents[0] === l){ if (c.owner === qui && !groupe){ octets += 4096; fichiers++; } parcourir(c); } }); })(d);
	return { blocs: Math.ceil(octets / 1024), fichiers: fichiers };
}
function lireLimiteQuota(v){
	var m = /^(\d+)([KMGT]?)$/i.exec(String(v));
	if (!m) return null;
	return +m[1] * ({ "": 1, K: 1, M: 1024, G: 1048576, T: 1073741824 }[m[2].toUpperCase()]);
}
Shell.sorts.setquota = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("setquota: command not found", 127);
	if (!io.sudo) throw new ShellError("setquota: Cannot open quotafile: Permission denied" + astuce(io, "sudo setquota ..."), 1);
	var groupe = args.indexOf("-g") > -1, mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (mots.length < 6) throw new ShellError("setquota: Bad number of arguments.\nUsage:\n  setquota [-u|-g] [-rm] [-F quotaformat] <user|group>\n\t<block-softlimit> <block-hardlimit> <inode-softlimit> <inode-hardlimit> -a|<filesystem>...", 1);
	var fs = fsQuota(h, mots[5], io, "setquota");
	var qui = mots[0];
	if (!groupe && uidMachine(h, qui) === 1000 && !(texteHote(h, "/etc/passwd") || "").split("\n").some(function(l){ return l.split(":")[0] === qui; })) throw new ShellError("setquota: user " + qui + " does not exist.", 1);
	var vals = mots.slice(1, 5).map(lireLimiteQuota);
	if (vals.some(function(v){ return v === null; })) throw new ShellError("setquota: Bad block soft limit: " + mots[1], 1);
	fs.quotas[groupe ? "g" : "u"][qui] = { bs: vals[0], bh: vals[1], is: vals[2], ih: vals[3] };
	GameEvents.fire({ type: "machine", hote: h, cmd: "setquota", qui: qui, groupe: groupe, limites: fs.quotas[groupe ? "g" : "u"][qui], cible: fs.cible });
	return "";
};
Shell.sorts.quota = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("quota: command not found", 127);
	var qui = args.indexOf("-u") > -1 ? args[args.indexOf("-u") + 1] : JOUEUR;
	if (qui !== JOUEUR && !io.sudo) throw new ShellError("quota: Cannot get quota for user " + qui + ": Operation not permitted", 1);
	var fsq = fsMontes(h).filter(function(f){ return /quota/.test(f.options || "") && f.quotas && f.quotas.u && f.quotas.u[qui]; });
	GameEvents.fire({ type: "machine", hote: h, cmd: "quota", qui: qui });
	if (!fsq.length) return "Disk quotas for user " + qui + " (uid " + uidMachine(h, qui) + "): none";
	return "Disk quotas for user " + qui + " (uid " + uidMachine(h, qui) + "): \n     Filesystem  blocks   quota   limit   grace   files   quota   limit   grace\n" + fsq.map(function(f){
		var q = f.quotas.u[qui], u = utilisationQuota(h, f, qui);
		return completerGauche(f.source, 15) + "\n" + completerGauche(u.blocs, 23) + completerGauche(q.bs, 8) + completerGauche(q.bh, 8) + "        " + completerGauche(u.fichiers, 8) + completerGauche(q.is, 8) + completerGauche(q.ih, 8);
	}).join("\n");
};
Shell.sorts.repquota = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("repquota: command not found", 127);
	if (!io.sudo) throw new ShellError("repquota: Cannot open quotafile: Permission denied", 1);
	var fsq = fsMontes(h).filter(function(f){ return /quota/.test(f.options || ""); });
	GameEvents.fire({ type: "machine", hote: h, cmd: "repquota" });
	return fsq.map(function(f){
		f.quotas = f.quotas || { u: {}, g: {} };
		var l = ["*** Report for user quotas on device " + f.source, "Block grace time: 7days; Inode grace time: 7days", "                        Block limits                File limits", "User            used    soft    hard  grace    used  soft  hard  grace", "----------------------------------------------------------------------"];
		var gens = ["root"].concat(Object.keys(f.quotas.u));
		gens.filter(function(x, i){ return gens.indexOf(x) === i; }).forEach(function(qui){
			var q = f.quotas.u[qui] || { bs: 0, bh: 0, is: 0, ih: 0 }, u = utilisationQuota(h, f, qui);
			l.push(completerDroite(qui, 10) + (q.bh && u.blocs > q.bs ? "+-" : "--") + completerGauche(u.blocs, 8) + completerGauche(q.bs, 8) + completerGauche(q.bh, 8) + "       " + completerGauche(u.fichiers, 7) + completerGauche(q.is, 6) + completerGauche(q.ih, 6));
		});
		return l.join("\n");
	}).join("\n\n");
};
Shell.sorts.edquota = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("edquota: command not found", 127);
	if (!io.sudo) throw new ShellError("edquota: Cannot open quotafile: Permission denied", 1);
	var p = args.indexOf("-p") > -1 ? args[args.indexOf("-p") + 1] : null;
	var noms = args.filter(function(a, i){ return a.charAt(0) !== "-" && args[i - 1] !== "-p"; });
	var fsq = fsMontes(h).filter(function(f){ return /quota/.test(f.options || ""); });
	if (!fsq.length) throw new ShellError("edquota: No filesystems with quota detected.", 1);
	if (p){
		noms.forEach(function(n){ fsq.forEach(function(f){ f.quotas = f.quotas || { u: {}, g: {} }; if (f.quotas.u[p]) f.quotas.u[n] = copieJson(f.quotas.u[p]); }); });
		GameEvents.fire({ type: "machine", hote: h, cmd: "edquota", modele: p, qui: noms });
		return "";
	}
	var qui = noms[0];
	if (!qui) throw new ShellError("edquota: No users or groups specified.", 1);
	if (!io.tty || !term.editer) throw new ShellError("edquota: il faut un écran pour l'éditeur." + astuce(io, "Sans éditeur : sudo setquota -u NOM SOUPLE DUR 0 0 /home"), 1);
	var f = fsq[0];
	f.quotas = f.quotas || { u: {}, g: {} };
	var q = f.quotas.u[qui] || { bs: 0, bh: 0, is: 0, ih: 0 }, u = utilisationQuota(h, f, qui);
	var texte = "Disk quotas for user " + qui + " (uid " + uidMachine(h, qui) + "):\n  Filesystem                   blocks       soft       hard     inodes     soft     hard\n  " + completerDroite(f.source, 28) + completerGauche(u.blocs, 7) + completerGauche(q.bs, 11) + completerGauche(q.bh, 11) + completerGauche(u.fichiers, 11) + completerGauche(q.is, 9) + completerGauche(q.ih, 9) + "\n";
	term.editer({ titre: "/tmp//EdP.aXXXXXX", texte: texte, mode: "nano", quitter: function(){ Shell.fin(); } }, function(nouveau){
		var ligne = String(nouveau || "").split("\n").filter(function(l){ return l.trim().indexOf(f.source) === 0; })[0];
		if (!ligne) return;
		var c = ligne.trim().split(/\s+/);
		f.quotas.u[qui] = { bs: +c[2] || 0, bh: +c[3] || 0, is: +c[5] || 0, ih: +c[6] || 0 };
		GameEvents.fire({ type: "machine", hote: h, cmd: "setquota", qui: qui, groupe: false, limites: f.quotas.u[qui], cible: f.cible });
	});
	return "";
};

/* ================================================================== */
/* updatedb et locate                                                   */
/* ================================================================== */

Shell.sorts.updatedb = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("updatedb: command not found", 127);
	if (!io.sudo) throw new ShellError("updatedb: can not open a temporary file for `/var/lib/plocate/plocate.db'" + astuce(io, "La base de locate se fabrique en root : sudo updatedb"), 1);
	var liste = [];
	var racine = racineHote(h);
	(function parcourir(lieu, chemin, n){
		if (n > 25) return;
		lieu.items.forEach(function(it){ liste.push((chemin === "/" ? "" : chemin) + "/" + it.itemname); });
		lieu.children.forEach(function(c){
			if (c.parents[0] !== lieu) return;
			var cc = (chemin === "/" ? "" : chemin) + "/" + c.room_name;
			if (/^\/(proc|sys|dev|run|tmp)$/.test(cc) || lieuDemonte(h, cc)) return;
			liste.push(cc);
			parcourir(c, cc, n + 1);
		});
	})(racine, "/", 0);
	etatMachine(h).locate = { liste: liste.sort(), quand: maintenantMachine(h) };
	GameEvents.fire({ type: "machine", hote: h, cmd: "updatedb", nombre: liste.length });
	return "";
};
Shell.sorts.locate = function(args, io){
	var h = machineIci();
	if (!h) throw new ShellError("locate: command not found", 127);
	var M = etatMachine(h);
	if (!M.locate) throw new ShellError("locate: can not stat () `/var/lib/plocate/plocate.db': No such file or directory" + astuce(io, "La base de locate n'existe pas encore : sudo updatedb la fabrique (et il faut la refaire pour voir les fichiers récents)."), 1);
	var ignorer = args.indexOf("-i") > -1 || args.indexOf("--ignore-case") > -1, compter = args.indexOf("-c") > -1 || args.indexOf("--count") > -1;
	var motifs = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!motifs.length) throw new ShellError("locate: no pattern to search for specified", 1);
	var res = M.locate.liste.filter(function(c){
		return motifs.every(function(m){
			if (/[*?[]/.test(m)) return motifVersRegExp(m, ignorer ? "i" : "").test(c) || motifVersRegExp("*" + m + "*", ignorer ? "i" : "").test(c.split("/").pop());
			return ignorer ? c.toLowerCase().indexOf(m.toLowerCase()) > -1 : c.indexOf(m) > -1;
		});
	});
	GameEvents.fire({ type: "machine", hote: h, cmd: "locate", motifs: motifs, nombre: res.length, sortie: res.join("\n") });
	if (!res.length) io.code = 1;
	return compter ? String(res.length) : res.join("\n");
};

/* ================================================================== */
/* Le journal d'une machine modélisée                                   */
/* ================================================================== */

/* Une entrée du journal (journalctl, et dmesg pour le noyau). boot : 0 le démarrage en cours, -1 le précédent. */
function journalMachine(h, e){
	if (!estMachine(h) && !(state && state.reseau && state.reseau.machines && state.reseau.machines[h])) return;
	var M = etatMachine(h);
	M.journal = M.journal || [];
	var t = e.t || maintenantMachine(h);
	M.journal.push({ t: t, u: e.unite || "systemd", pid: e.pid || null, m: String(e.message || ""), p: e.prio === undefined ? 6 : e.prio, k: e.noyau ? 1 : 0, b: e.boot || 0, unit: e.unit || null });
	if (M.journal.length > 1500) M.journal.splice(0, M.journal.length - 1500);
}
