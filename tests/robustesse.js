/**
 * Test de robustesse : bombarde l'interpréteur de lignes aléatoires, sensées ou
 * absurdes, et vérifie qu'aucune ne le fait planter. Une erreur du jeu doit
 * toujours être un message pour le joueur, jamais une exception JavaScript.
 *
 *    node tests/robustesse.js [nombre de lignes] [graine]
 */
var fs = require("fs");
var path = require("path");
var nouveauMonde = require("./monde.js").nouveauMonde;

var combien = parseInt(process.argv[2], 10) || 20000;
var graine = parseInt(process.argv[3], 10) || 12345;
function hasard(){ graine = (graine * 48271) % 2147483647; return graine / 2147483647; }
function choix(liste){ return liste[Math.floor(hasard() * liste.length)]; }

// Les commandes de la solution, pour disposer d'un monde où tout est débloqué.
var solution = [];
var dansBloc = false;
fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(ligne){
	if (ligne.indexOf("```") === 0){ dansBloc = !dansBloc; return; }
	if (dansBloc && ligne.trim() !== "") solution.push(ligne);
});

var sorts = ["ls", "cd", "pwd", "less", "help", "man", "clear", "exit", "mv", "cat", "head", "tail", "wc", "diff", "history",
	"chmod", "rm", "mkdir", "rmdir", "touch", "cp", "bash", "date", "grep", "echo", "export", "env", "alias", "unalias", "ln",
	"sort", "uniq", "cut", "ps", "kill", "top", "whoami", "id", "chown", "find", "tree", "df", "du", "tar", "crontab",
	"hostname", "ping", "ssh", "apt", "cowsay", "sudo", "quetes", "xp", "sl", "vim", "./remonter.sh", "ll", "", "!!",
	"sha256sum", "base64", "nano", "ss", "ssh-keygen", "indice", "chapitre", "succes", "chrono", "son", "bulletin", "./.porte"];
var options = ["-a", "-l", "-la", "-r", "-rf", "-n", "-n 3", "-9", "-s", "-c", "-i", "-v", "-u", "-d:", "-f1", "-f", "-x", "-tf", "-xf", "-cf",
	"--help", "-", "--", "-z", "-c", "-d", "-tlnp", "-perm -4000", "-perm /u=s", "-perm", "-user root", "2>/dev/null", "2>err", "2>>err", "2>&1", "u-s", "4755", "+t", "-1", "-0", "-99999", "+x", "-x", "755", "000", "u+rwx", "o-r", "a=", "999", "-name", "-type", "d", "f", "-L", "-u sorcier"];
var noms = [".", "..", "~", "/", "*", "?", ".*", "~/", "../..", "./.", "//", "a/b/c", "~/Village", "Marche", "Boite", "Cage", "Portail",
	"Rocher", "Stele", "Certificat", ".Phylactere", "SorcierNoir", "Laurent", "Diplome", "LivreDOr", "Registre", "remonter.sh",
	"Mannequin*", "rouage*", "x", "X", "Truc", ".cache", "nouveau", "copie", "Chaumiere", "Planche", "Rouage", "EpiDeMais", "TrollMoche",
	"~/Cybersup", "~/Cybersup/BureauDeLaurent", "BureauDeLaurent/Agenda", "sauvegarde-lundi.tar", "archive.tar", "terminus", "cybersup",
	"citadelle", "apprenti", "root", "sorcier", "66", "404", "1", "1337", "0", "-5", "abc", "é", "$USER", "$PWD", "${HOME}", "$", "$$",
	"A=b", "ll='ls -l'", "z=", "=x", "\"deux mots\"", "'apostrophe'", "\"", "'", "\\", "[", "(", "a(b", "*.log", "motdepasse=", "vrai_nom",
	"cowsay", "tree", "install", "update", "list", "<b>", "Crypte", "bin", "Caveau", "Racine", ".ssh", ".ssh/authorized_keys", "SHA256SUMS",
	"gardien", ".porte", "BoiteDeDepot", "coffre", "~/.ssh/id_ed25519", "~/.ssh/id_ed25519.pub", "Corbeau", "CertificatCyber", "/dev/null", "2", "oui", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"];
var liaisons = [" | ", " > ", " >> ", " ; ", " && ", " |", "| ", " || ", ">", " & "];

function ligneAleatoire(){
	var morceaux = [];
	var n = 1 + Math.floor(hasard() * 3);
	for (var i = 0; i < n; i++){
		var cmd = [choix(sorts)];
		if (hasard() < 0.15) cmd.unshift("sudo");
		var arguments_ = Math.floor(hasard() * 4);
		for (var k = 0; k < arguments_; k++) cmd.push(hasard() < 0.35 ? choix(options) : choix(noms));
		morceaux.push(cmd.join(" "));
		if (i < n - 1) morceaux.push(choix(liaisons));
	}
	return morceaux.join("");
}

var plantages = [];
var jeu = null;
var lignesJouees = 0;
for (var i = 0; i < combien; i++){
	// On repart régulièrement d'un monde neuf, tantôt vierge, tantôt entièrement débloqué.
	if (i % 400 === 0){
		jeu = nouveauMonde({});
		if ((i / 400) % 2 === 1){
			var jusque = Math.floor(hasard() * solution.length);
			for (var s = 0; s <= jusque; s++){
				jeu.jouerSolution(solution[s]);
			}
		}
	}
	var ligne = ligneAleatoire();
	try {
		jeu.taper(ligne, [jeu.lire("MOT_DE_PASSE_SUDO"), "oui", "x", "x"]);
		lignesJouees++;
		// La sauvegarde doit toujours pouvoir être relue.
		if (i % 97 === 0){
			var stockage = {};
			jeu.lire("(function(){ var s = {}; window.localStorage.setItem = function(k, v){ s[k] = v; }; state.save(); return JSON.stringify(s); })()");
		}
		if (jeu.lire("state.xp > state.xpMax()")) plantages.push({ ligne: ligne, erreur: "XP au-dessus du maximum" });
		if (jeu.lire("state.xp2 > state.xpMax2()")) plantages.push({ ligne: ligne, erreur: "XP du chapitre 2 au-dessus du maximum" });
	} catch (e){
		plantages.push({ ligne: ligne, erreur: (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n") : String(e)) });
		jeu = nouveauMonde({});
	}
}

console.log(lignesJouees + " lignes aléatoires jouées, " + plantages.length + " plantage" + (plantages.length > 1 ? "s" : "") + ".");
var vus = {};
plantages.forEach(function(p){
	var cle = p.erreur.split("\n").slice(0, 2).join("|");
	if (vus[cle]) return;
	vus[cle] = true;
	console.log("\nPLANTAGE avec : " + p.ligne + "\n" + p.erreur);
});
process.exit(plantages.length ? 1 : 0);
