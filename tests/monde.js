/**
 * Charge le jeu sans navigateur, avec un faux terminal et un faux stockage.
 * Utilisé par les tests.
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var bavard = process.argv.indexOf("-v") > -1;
var dossier = path.join(__dirname, "..", "Web", "static", "javascript");
var fichiers = ["EventTarget.js", "Partie.js", "Item.js", "Room.js", "Manuel.js", "Shell.js", "Interpreteur.js", "SortsAvances.js", "GameObjects.js", "Chapitre2.js", "CommandesCyber.js", "Texte.js", "Awk.js", "Reseau.js", "Panne.js", "CommandesPanne.js", "Annexe.js", "Adresses.js", "RpgPanne.js", "SortsCrypte.js", "RpgCrypte.js", "GameState.js", "Examen.js", "SortsArcanes.js", "Chapitre4.js", "Academie.js", "SortsBastion.js", "SortsGuet.js", "Chapitre5.js", "Bastion.js", "SortsMachines.js", "SortsProcessus.js", "SortsSystemd.js", "SortsExploitation.js", "ManuelMachines.js", "Chapitre6.js", "Machines.js", "QuetesAnnexes.js", "Habitants.js"];

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
		"var reponses = [];" +
		"var term = { echo: function(t){ ecran.push(String(t)); }, effacer: function(){}, definirInvite: function(){}," +
		"  demander: function(texte, masque, rappel){ ecran.push(texte); rappel(reponses.length ? reponses.shift() : ''); }," +
		// nano : l'éditeur applique la transformation choisie par le test (ou quitte sans rien changer).
		"  editer: function(options, rappel){ ecran.push('[' + (options.mode || 'nano') + ' ' + options.titre + ']'); var f = transformation; transformation = null;" +
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
				.replace(/<pid-ecoute>/g, function(){ var p = lire("procCorbeau()"); return p ? String(p.pid) : "0"; })
				.replace(/<pid:([a-z_-]+)>/g, function(tout, nom){
					return String(lire("(current_room.procs || []).filter(function(p){ return p.name === " + JSON.stringify(nom) + "; }).map(function(p){ return p.pid; })[0]"));
				});
		},
		// Joue une ligne de la solution comme le ferait un joueur : repères remplis, questions répondues.
		jouerSolution: function(brute){
			var commande = this.remplir(brute);
			var mdp = vm.runInContext("MOT_DE_PASSE_SUDO", bac);
			if (commande === "passwd") return this.taper(commande, ["Une phrase bien longue 42", "Une phrase bien longue 42"]);
			if (commande === "ssh-keygen") return this.taper(commande, ["Une phrase de passe", "Une phrase de passe"]);
			if (/^gpg (-d|--decrypt)/.test(commande)) return this.taper(commande, vm.runInContext("PHRASE_CORBEAU", bac));
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
			return this.taper(commande, commande.indexOf("sudo") === 0 ? mdp : undefined);
		},
		// Prépare ce que fera le joueur dans nano : une fonction (texte d'origine) -> nouveau texte, en JavaScript.
		editer: function(sourceFonction){ vm.runInContext("transformation = " + sourceFonction, bac); }
	};
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

module.exports = { nouveauMonde: nouveauMonde };
