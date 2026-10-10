/**
 * Charge le jeu sans navigateur, avec un faux terminal et un faux stockage.
 * Utilisé par les tests.
 */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var bavard = process.argv.indexOf("-v") > -1;
var dossier = path.join(__dirname, "..", "Web", "static", "javascript");
var fichiers = ["EventTarget.js", "Partie.js", "Item.js", "Room.js", "Manuel.js", "Shell.js", "SortsAvances.js", "GameObjects.js", "GameState.js"];

function nouveauMonde(stockage, graine){
	stockage = stockage || {};
	// Une graine fixe par défaut : les tests sont reproductibles. Les valeurs propres à
	// la partie (mot de passe, adresses, PID...) se lisent ensuite avec jeu.lire().
	if (!stockage["terminus-cybersup-profil"]){
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
	// Un faux terminal : il note ce qui s'affiche et répond aux questions (mot de passe sudo).
	vm.runInContext(
		"var reponses = [];" +
		"var term = { echo: function(t){ ecran.push(String(t)); }, effacer: function(){}, definirInvite: function(){}," +
		"  demander: function(texte, masque, rappel){ ecran.push(texte); rappel(reponses.length ? reponses.shift() : ''); } };" +
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
		lire: function(expression){ return vm.runInContext(expression, bac); }
	};
}


module.exports = { nouveauMonde: nouveauMonde };
