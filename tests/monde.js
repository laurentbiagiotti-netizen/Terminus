/**
 * Charge le jeu sans navigateur, avec un faux terminal et un faux stockage.
 * Utilisé par les tests.
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var bavard = process.argv.indexOf("-v") > -1;
var dossier = path.join(__dirname, "..", "Web", "static", "javascript");
var fichiers = ["EventTarget.js", "Partie.js", "Item.js", "Room.js", "Manuel.js", "Shell.js", "Interpreteur.js", "SortsAvances.js", "GameObjects.js", "Chapitre2.js", "CommandesCyber.js", "Texte.js", "Awk.js", "Reseau.js", "Panne.js", "CommandesPanne.js", "Annexe.js", "Adresses.js", "RpgPanne.js", "SortsCrypte.js", "RpgCrypte.js", "GameState.js", "Examen.js", "SortsArcanes.js", "Chapitre4.js", "Academie.js", "SortsBastion.js", "SortsGuet.js", "Chapitre5.js", "Bastion.js", "SortsMachines.js", "SortsProcessus.js", "SortsSystemd.js", "SortsExploitation.js", "ManuelMachines.js", "Chapitre6.js", "Machines.js", "QuetesAnnexes.js", "Habitants.js", "SortsAnnexes.js", "HabitantsCampus.js", "HabitantsCrypte.js", "SortsAnnexesBis.js", "HabitantsAcademie.js", "SortsAnnexesTer.js", "HabitantsBastion.js", "SortsIle.js", "SortsIlePoste.js", "SortsIleRegistre.js", "SortsIleBis.js", "SortsIleTer.js", "SortsIleAnnexes.js", "PortAube.js", "ManuelIle.js", "Chapitre7.js", "Ile.js", "HabitantsIle.js", "SortsPort.js", "SortsPortShell.js", "SortsPortProgrammes.js", "SortsPortCli.js", "SortsPortBuild.js", "SortsPortCompose.js", "SortsPortSwarm.js", "SortsPortAnnexes.js", "SortsGit.js", "SortsGitCli.js", "SortsGitCli2.js", "SortsGitForge.js", "ErreursGit.js", "GrandPort.js", "ManuelPort.js", "ManuelGit.js", "Chapitre8.js", "Port.js", "HabitantsPort.js", "Chronique.js", "Chapitre9.js", "Chronotheque.js", "HabitantsChronique.js", "GrapheGit.js", "Navigation.js", "AideDuJeu.js"];

/* options.avant : du JavaScript lancé après les fichiers du jeu, avant le chargement de la sauvegarde (un monde de test). */
function nouveauMonde(stockage, graine, options){
	options = options || {};
	stockage = stockage || {};
	// Une graine fixe par défaut : les tests sont reproductibles. Les valeurs propres à
	// la partie (mot de passe, adresses, PID...) se lisent ensuite avec jeu.lire().
	stockage["terminus-cybersup-version"] = stockage["terminus-cybersup-version"] || "comptes-1";
	if (!stockage["terminus-cybersup-profil"] && !stockage["terminus-cybersup-actif"]){
		stockage["terminus-cybersup-profil"] = JSON.stringify({ graine: graine || 4242, prenom: null, chapitre: 1 });
	}
	var ecran = [];
	var bac = {
		console: console, btoa: btoa, atob: atob,
		window: {
			localStorage: {
				getItem: function(k){ return stockage.hasOwnProperty(k) ? stockage[k] : null; },
				setItem: function(k, v){ stockage[k] = String(v); },
				removeItem: function(k){ delete stockage[k]; }
			},
			sessionStorage: { getItem: function(){ return null; }, setItem: function(){} },
			location: { reload: function(){} }
		}
	};
	vm.createContext(bac);
	fichiers.forEach(function(f){
		vm.runInContext(fs.readFileSync(path.join(dossier, f), "utf8"), bac, { filename: f });
	});
	if (options.avant) vm.runInContext(options.avant, bac, { filename: "monde-de-test.js" });
	// Un faux terminal : il note ce qui s'affiche et répond aux questions (mot de passe sudo).
	vm.runInContext(
		"var reponses = []; var HEURE_FIXE_TESTS = 14;" +
		"var term = { echo: function(t){ ecran.push(String(t)); }, effacer: function(){}, definirInvite: function(){}," +
		"  demander: function(texte, masque, rappel){ ecran.push(texte); rappel(reponses.length ? reponses.shift() : ''); }," +
		// nano : l'éditeur applique la transformation choisie par le test (ou quitte sans rien changer).
		"  editer: function(options, rappel){ ecran.push('[' + (options.mode || 'nano') + ' ' + options.titre + ']'); var f = transformation; if (Array.isArray(f)){ f = f.shift(); if (!transformation.length) transformation = null; } else transformation = null;" +
		"    var r = f ? f(options.texte) : null; var info = { commandes: {} };" +
		"    if (r !== null && typeof r === 'object'){ info.commandes = r.commandes || {}; r = r.texte === undefined ? null : r.texte; }" +
		"    if (r !== null) rappel(r, info); if (options.quitter) options.quitter({ commandes: info.commandes, enregistre: r !== null }); } };" +
		"var transformation = null;" +
		"var state = new GameState(); var partieRestauree = state.load(); var current_room = state.getCurrentRoom();" +
		"verifierMonde(); Shell.narration = [];",
		Object.assign(bac, { ecran: ecran }));
	return {
		bac: bac,
		taper: function(ligne, reponse){
			ecran.length = 0;
			// reponse : ce que le joueur répondra aux questions posées (une chaîne, ou un tableau s'il y en a plusieurs)
			var liste = reponse === undefined ? [] : [].concat(reponse);
			vm.runInContext("reponses = " + JSON.stringify(liste), bac);
			vm.runInContext("Shell.executer(" + JSON.stringify(ligne) + ")", bac);
			var sortie = ecran.join("\n").replace(/\x1b\[[0-9;]*m/g, "");
			if (bavard) console.log("\n$ " + ligne + "\n" + sortie);
			return sortie;
		},
		lire: function(expression){ return vm.runInContext(expression, bac); },
		// Remplace les <repères> de docs/solution.md par les valeurs de cette partie.
		remplir: function(commande){
			var lire = function(e){ return vm.runInContext(e, bac); };
			return commande
				.replace(/<motdepasse>/g, lire("MOT_DE_PASSE_SUDO"))
				.replace(/<moi>/g, lire("JOUEUR"))
				.replace(/<archive>/g, function(){ return lire("typeof derniereArchiveCh7 === 'function' && derniereArchiveCh7() ? derniereArchiveCh7().nom : ''"); })
				.replace(/<vint>/g, function(){ return lire("typeof IP_VINT !== 'undefined' ? IP_VINT : ''"); })
				.replace(/<pierre-avant>/g, function(){ return String(lire("state.ch5 ? state.ch5.scoreDepart : ''")); })
				.replace(/<pierre-apres>/g, function(){ return String(lire("state.ch5 ? state.ch5.scoreFinal : ''")); })
				.replace(/<client>/g, lire("MEILLEUR_CLIENT"))
				.replace(/<adresse>/g, lire("ADRESSE_ATTAQUANT"))
				.replace(/<sweats>/g, lire("NB_SWEATS"))
				.replace(/<poste>/g, lire("ADRESSE_POSTE_CORBEAU"))
				.replace(/<wifi>/g, lire("MDP_WIFI"))
				.replace(/<bssid>/g, lire("BSSID_FAUX"))
				.replace(/<fantome-cron>/g, function(){ return lire("typeof FANTOME_CRON !== 'undefined' ? FANTOME_CRON : ''"); })
				.replace(/<ip-nuee>/g, function(){ return lire("typeof IP_NUEE !== 'undefined' ? IP_NUEE[0] : ''"); })
				.replace(/<volume>/g, function(){ return lire("typeof VOLUME_TOTAL !== 'undefined' ? String(VOLUME_TOTAL) : ''"); })
				.replace(/<latence-avant>/g, function(){ return lire("(function(){ var m = (etatMachine('lumen').mesuresCurl || []).filter(function(x){ return x.temps >= 1; })[0]; return m ? m.temps.toFixed(2) : ''; })()"); })
				.replace(/<latence-apres>/g, function(){ return lire("(function(){ var m = (etatMachine('lumen').mesuresCurl || []).filter(function(x){ return x.temps < 0.5 && x.code === 200; }).pop(); return m ? m.temps.toFixed(3) : ''; })()"); })
				.replace(/<code-loge>/g, function(){ return lire("typeof AX_CODE_LOGE !== 'undefined' ? AX_CODE_LOGE : ''"); })
				.replace(/<pid-tunnel>/g, function(){ return String(lire("(current_room.procs || []).filter(function(p){ return /^ssh -f -N /.test(p.name); }).map(function(p){ return p.pid; })[0]")); })
				.replace(/<mot-grille>/g, function(){ return lire("typeof AX_MOT_GRILLE !== 'undefined' ? AX_MOT_GRILLE : ''"); })
				.replace(/<pid-ecoute>/g, function(){ var p = lire("procCorbeau()"); return p ? String(p.pid) : "0"; })
				// Le Grand Port (chapitre 8) : les empreintes, le jeton de l'escadre, le PID d'un conteneur, la puissance finale.
				.replace(/<digest-ecole>/g, function(){ return lire("(function(){ var im = imagePort('docks', 'entrepot.port-aube.lan:5000/ecole:1.0'); var d = im ? (im.digests || []).filter(function(x){ return /ecole@sha256:/.test(x); })[0] : null; return d ? d.split('@')[1] : ''; })()"); })
				.replace(/<digest-nginx>/g, function(){ return lire("imageCataloguePort('nginx').digestDepot"); })
				.replace(/<digest-piege>/g, function(){ return lire("sCh8().digestPiege || ''"); })
				.replace(/<jeton-swarm>/g, function(){ return lire("swarmPort() ? swarmPort().jetons.worker : ''"); })
				.replace(/<puissance>/g, function(){ return String(lire("sCh8().scoreFinal")); })
				.replace(/<signature>/g, function(){ return lire("signatureBastionPort()"); })
				// La Chronothèque (chapitre 9) : les hashes, le nombre de commits de Grace, les numéros des requêtes, l'intégrité, l'empreinte.
				.replace(/<hash-pg>/g, function(){ return lire("(HASH_CH9('annalesPg') || '').slice(0, 7)"); })
				.replace(/<n-grace>/g, function(){ return String(lire("sCh9().nGraceAnnales")); })
				.replace(/<hash-labyrinthe>/g, function(){ return lire("(HASH_CH9('labyrintheFaux') || '').slice(0, 7)"); })
				.replace(/<pr-kevin>/g, function(){ return String(lire("sCh9().prKevin")); })
				.replace(/<pr-poison>/g, function(){ return String(lire("sCh9().prPoison")); })
				.replace(/<integrite>/g, function(){ return String(lire("integriteCh9()")); })
				.replace(/<empreinte>/g, function(){ return lire("signatureBastionPort()"); })
				// Le hash d'une besace jetée (git stash drop l'affiche ; git fsck --unreachable la retrouve) : le plus récent sceau « WIP on » ou « On » perdu.
				.replace(/<stash-jete>/g, function(){ return lire("(function(){ var R = gitDepot(null, DEPOTS_CH9.ombres); var tous = gTousObjets(R), at = gAtteignables(R, false), m = null; Object.keys(tous).forEach(function(h){ var o = tous[h]; if (o.t !== 'commit' || at[h]) return; var c = gAnalyserCommit(o.c); if (/^(WIP on|On) /.test(c.message) && (!m || c.commiteur.s >= m.s)) m = { h: h, s: c.commiteur.s }; }); return m ? m.h.slice(0, 7) : ''; })()"); })
				.replace(/<pid-conteneur:([a-z0-9_.-]+)>/g, function(tout, nom){ return String(lire("(function(){ var c = conteneurPort(portIci() || 'docks', " + JSON.stringify(nom) + "); return c ? c.etat.pid : 0; })()")); })
				.replace(/<pid:([a-z_-]+)>/g, function(tout, nom){
					return String(lire("(current_room.procs || []).filter(function(p){ return p.name === " + JSON.stringify(nom) + "; }).map(function(p){ return p.pid; })[0]"));
				});
		},
		// Joue une ligne de la solution comme le ferait un joueur : repères remplis, questions répondues.
		jouerSolution: function(brute){
			// Ctrl-Z (chapitre 6) : la touche, pas une commande.
			if (brute.trim() === "Ctrl-Z") return String(vm.runInContext("Shell.suspendre() ? '' : ''", bac));
			var commande = this.remplir(brute);
			var mdp = vm.runInContext("MOT_DE_PASSE_SUDO", bac);
			vm.runInContext("transformation = null", bac);
			// La Chronothèque (chapitre 9) : add -p (le premier morceau oui, le second non), le paradoxe tranché dans nano, les rebase -i.
			if (/^git add -p /.test(commande)) return this.taper(commande, ["y", "n"]);
			// Les défis de la Chronothèque : restore -p (le seul morceau est défait).
			if (/^git restore -p /.test(commande)) return this.taper(commande, ["y"]);
			if (/^nano prophetie\.txt$/.test(commande)) this.editer("function(t){ return t.split('\\n').filter(function(l){ return !/^(<<<<<<<|=======|>>>>>>>)/.test(l) && l !== 'Au nord, le vent se tait.' && l !== 'Au sud, la mer se tait.'; }).join('\\n'); }");
			if (/^git rebase -i /.test(commande)) this.editer("[" + [REBASE_CH9, REBASE_CH9, REBASE_CH9].join(",") + "]");
			if (commande === "passwd") return this.taper(commande, ["Une phrase bien longue 42", "Une phrase bien longue 42"]);
			if (commande === "ssh-keygen") return this.taper(commande, ["Une phrase de passe", "Une phrase de passe"]);
			if (/^gpg (-d|--decrypt)/.test(commande)) return this.taper(commande, vm.runInContext("PHRASE_CORBEAU", bac));
			// Les quêtes annexes : la phrase de la clé du Passeur (ssh-add), l'empreinte du relais acceptée (ssh relais).
			if (/^ssh-add \S*cle-du-passeur/.test(commande)) return this.taper(commande, vm.runInContext("AX_PHRASE_PASSEUR", bac));
			if (/^ssh relais$/.test(commande)) return this.taper(commande, "yes");
			if (/^openssl enc /.test(commande) && !/-pass /.test(commande)) return this.taper(commande, ["Ragout au miel de la garnison", "Ragout au miel de la garnison"]);
			if (/visudo -f \S*sudoers\.d\/greffier\s*$/.test(commande)) this.editer("function(t){ return { texte: 'Defaults log_output\\n', commandes: { i: true } }; }");
			if (/^gpg (-c|--symmetric)/.test(commande)) return this.taper(commande, ["ma phrase a moi", "ma phrase a moi"]);
			// Au Bastion : une règle sudo étroite, écrite dans visudo -f (vim), pour le compte de sauvegarde.
			if (/visudo -f \S*sudoers\.d\/sauvegarde\s*$/.test(commande)) this.editer("function(t){ return { texte: 'sauvegarde ALL=(root) /usr/bin/rsync\\n', commandes: { i: true } }; }");
			var vim = /(?:^|\s)(?:vim|vi|visudo)(?:\s+(\S+))?\s*$/.exec(commande);
			if (vim) this.editer(EDITIONS_VIM(vim[1] ? vim[1].split("/").pop() : "sudoers", vm.runInContext("({ poste: ADRESSE_POSTE_CORBEAU, compte: COMPTE_CACHE, port: PORT_CORBEAU, heure: HEURE_PREMIERE })", bac)));
			// Dans nano, sur le poste du bâtiment B : corriger le DNS, puis ajouter un raccourci de nom.
			if (/nano .*resolv\.conf/.test(commande)) this.editer("function(t){ return t.replace('10.0.92.35', '10.0.92.53'); }");
			// Dans l'Annexe : la plage du DHCP de la borne, ip_forward gravé, la zone de l'Annexe.
			if (/nano .*dhcpd\.conf/.test(commande)) this.editer("function(t){ return t.replace('10.0.94.100 10.0.94.150', '10.0.94.10 10.0.94.50'); }");
			if (/nano .*sysctl\.conf/.test(commande)) this.editer("function(t){ return t.replace('#net.ipv4.ip_forward=1', 'net.ipv4.ip_forward=1'); }");
			if (/nano .*annexe\.zone/.test(commande)) this.editer("function(t){ return t.replace('10.0.94.300', '10.0.94.40'); }");
			if (/nano .*hosts$/.test(commande)) this.editer("function(t){ return t + '10.0.92.20\\tintra\\n'; }");
			if (/nano .*authorized_keys/.test(commande)){
				// Dans nano : couper la ligne du Corbeau, enregistrer, quitter.
				this.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('corbeau@nid') === -1; }).join('\\n'); }");
			}
			// Port-Aube (chapitre 7) : les mots de passe et les phrases que demandent les services de l'île.
			var ile = REPONSES_ILE(commande);
			if (ile) return this.taper(commande, ile);
			return this.taper(commande, commande.indexOf("sudo") === 0 ? mdp : undefined);
		},
		// Prépare ce que fera le joueur dans nano : une fonction (texte d'origine) -> nouveau texte, en JavaScript.
		editer: function(sourceFonction){ vm.runInContext("transformation = " + sourceFonction, bac); }
	};
}


/*
 * Port-Aube (chapitre 7) : ce que le joueur répond aux questions des services de l'île, dans l'ordre où elles viennent.
 * Les valeurs sont celles de docs/solution.md (le sceau du Registre, la phrase de l'Arche, les mots de passe de la Halle).
 */
var SCEAU_ILE = "Sceau-de-Port-Aube", PHRASE_ARCHE = "La-cite-ne-perd-rien", MDP_ZELIA = "Halle-de-Zelia", MDP_ARON = "Premier-pas-sur-l-ile";
function REPONSES_ILE(c){
	if (/(^|; )slappasswd$/.test(c)) return [SCEAU_ILE, SCEAU_ILE];
	if (/ldappasswd .*-S/.test(c)) return [MDP_ARON, MDP_ARON, SCEAU_ILE];
	if (/ldap(add|modify|delete) .*-W/.test(c)) return [SCEAU_ILE];
	if (/smbpasswd -a zelia/.test(c)) return [MDP_ZELIA, MDP_ZELIA];
	if (/smbpasswd -a aron/.test(c)) return [MDP_ARON, MDP_ARON];
	if (/smbclient .*-U zelia/.test(c)) return [MDP_ZELIA];
	if (/borg init/.test(c)) return [PHRASE_ARCHE, PHRASE_ARCHE, "N"];
	if (/borg (list|check|info|prune|extract)/.test(c)) return [PHRASE_ARCHE];
	if (/^ssh aron@quai$/.test(c)) return [MDP_ARON];
	if (/sftp depot@halle$/.test(c)) return ["Rendus du soir 7", "pwd", "put devoir.txt rendus/", "ls rendus", "bye"];
	if (/^ssh depot@halle$/.test(c)) return ["Rendus du soir 7"];
	return null;
}

/*
 * Ce que fait le joueur dans vim, fichier par fichier, pour la solution : le texte obtenu
 * et les commandes de vim utilisées (la solution décrit les touches en clair).
 */
function EDITIONS_VIM(nom, valeurs){
	var f;
	switch (nom){
		case "lecon1.txt": f = "function(t){ return { texte: t.replace('La vvache saauta paar-dessus la luune.', 'La vache sauta par-dessus la lune.'), commandes: { x: true } }; }"; break;
		case "lecon2.txt": f = "function(t){ return { texte: t.replace('Il manque des dans', 'Il manque des mots dans').replace('au milieu\\n', 'au milieu de nulle part.\\n'), commandes: { i: true, A: true } }; }"; break;
		case "lecon3.txt": f = "function(t){ return { texte: t.replace('Le le pare-feu protège protège', 'Le pare-feu protège').split('\\n').filter(function(l){ return l.indexOf('---> Cette ligne ne sert') !== 0; }).join('\\n'), commandes: { dw: true, dd: true, u: true } }; }"; break;
		case "lecon4.txt": f = "function(t){ return { texte: t.replace('---> 2) deuxième\\n---> 1) première', '---> 1) première\\n---> 2) deuxième').replace('attoque', 'attaque').replace('est ouvert.', 'est fermé.'), commandes: { dd: true, p: true, r: true, cw: true } }; }"; break;
		case "lecon5.txt": f = "function(t){ return { texte: t.replace(/erreur/g, 'succès').replace('---> FIN ?', '---> FIN .'), commandes: { '/': true, n: true, ':%s': true, G: true } }; }"; break;
		case "ecole.zone": f = "function(t){ return { texte: t.split('\\n').filter(function(l){ return l.indexOf('maj ') !== 0; }).join('\\n'), commandes: { dd: true } }; }"; break;
		case "sudoers": f = "function(t){ return { texte: t.split('\\n').filter(function(l){ return l.indexOf('corbeau') !== 0; }).join('\\n'), commandes: { dd: true } }; }"; break;
		case "rapport.txt": f = "function(t){ var v = " + JSON.stringify({ "Adresse du poste": valeurs.poste, "Compte caché": valeurs.compte, "Port de la porte": String(valeurs.port), "Heure de la première": valeurs.heure }) +
			"; return { texte: t.split('\\n').map(function(l){ for (var k in v) if (l.indexOf(k) === 0) return l + v[k]; return l; }).join('\\n'), commandes: { A: true } }; }"; break;
		default: f = "function(t){ return { commandes: { i: true, ':q!modifie': true } }; }";
	}
	return f;
}

/*
 * La Chronothèque (chapitre 9) : ce que le joueur écrit dans l'éditeur pendant un rebase -i.
 * La liste des sceaux (pick, fixup, drop, reword), puis les nouveaux messages des sceaux reformulés.
 */
var REBASE_CH9 = "function(t){" +
	"if (/^pick /m.test(t)){ var chant = /^pick \\S+ notes$/m.test(t);" +
	" var actions = chant ? { 'wip refrain': 'reword', 'notes': 'drop', 'wip': 'fixup', 'oups': 'drop', 'refrain fini': 'fixup', 'corrige typo': 'reword', 'ajoute le couplet': 'fixup' }" +
	" : { 'wip': 'pick', 'wip encore': 'fixup', 'debug: trace temporaire': 'drop', 'corrige typo': 'fixup', 'feat: la mer blanche': 'edit' };" +
	" return t.split('\\n').map(function(l){ var m = /^pick (\\S+) (.*)$/.exec(l); return m && actions[m[2]] ? actions[m[2]] + ' ' + m[1] + ' ' + m[2] : l; }).join('\\n'); }" +
	"if (/^wip refrain$/m.test(t)) return t.replace(/^wip refrain$/m, 'refrain: le refrain de la mer');" +
	"if (/^corrige typo$/m.test(t)) return t.replace(/^corrige typo$/m, 'couplet: les Royaumes chantent avec nous');" +
	"return null; }";

module.exports = { nouveauMonde: nouveauMonde };
