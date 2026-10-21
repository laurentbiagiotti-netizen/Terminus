/**
 * Outils de tests/git-moteur.js : jouer la même suite de commandes dans le jeu et avec le vrai git, puis comparer.
 *
 * Une suite est une liste de lignes :
 *   "commande"                 jouée des deux côtés ; les sorties sont comparées
 *   "~commande"                jouée des deux côtés, sortie non comparée (préparation)
 *   "@jeu commande"            jouée seulement dans le jeu ; "@reel commande" seulement avec le vrai git
 *   "@editeur JS|SED"          la prochaine commande ouvre un éditeur : dans le jeu, la fonction JS (texte -> texte) ;
 *                              avec le vrai git, GIT_EDITOR / GIT_SEQUENCE_EDITOR lancent ce script sed sur le fichier
 * Les dates sont fixées (GIT_AUTHOR_DATE, GIT_COMMITTER_DATE), le fuseau est +0200, HOME est un dossier neuf.
 */
var cp = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
var monde = require("./monde.js");

var GIT_REEL = (function(){ try { return cp.spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0; } catch (e){ return false; } })();
var DATE = "1760000000 +0200";

function jeuNeuf(){
	var jeu = monde.nouveauMonde({});
	jeu.lire("tousLesSorts().concat(SORTS_GIT, ['bash', 'printf', 'echo', 'cat', 'mkdir', 'cd', 'ls', 'rm', 'sed', 'chmod', 'touch', 'mv', 'cp', 'grep', 'head', 'tail', 'wc', 'test', 'tar']).forEach(function(s){ state.spells[s] = true; })");
	jeu.lire("state.env.GIT_AUTHOR_DATE = '" + DATE + "'; state.env.GIT_COMMITTER_DATE = '" + DATE + "'; World.fige = true;");
	// Les aides en français sous les erreurs (ErreursGit.js) ne sont pas du vrai git : coupées pour la comparaison.
	jeu.lire("AIDES_ERREURS_GIT = false;");
	return jeu;
}
/* La sortie d'une commande du jeu, sans ce que le jeu ajoute (XP, quêtes, sorts, radio, lieux). */
function netJeu(s){
	return String(s).split("\n").filter(function(l){ return !/^(\+\d+ XP|★|✦|✺|◆|◇|▲|\(Radio|\(Nouveau message|Tu viens de|Un nouveau lieu|Tu es maintenant dans|Tu es de retour|\(L'éditeur de git|\[(nano|vim) )/.test(l); }).join("\n").replace(/\s+$/, "");
}
var compteur = 0;
/* Joue une suite ; renvoie [{ ligne, jeu, reel, comparer }]. */
function jouer(suite, options){
	options = options || {};
	var jeu = options.jeu || jeuNeuf();
	var nom = "t" + (++compteur);
	var racineReel = fs.mkdtempSync(path.join(os.tmpdir(), "gitreel-"));
	var maison = path.join(racineReel, "maison");
	fs.mkdirSync(path.join(maison, nom), { recursive: true });
	var cwdReel = path.join(maison, nom);
	var env = Object.assign({}, process.env, { HOME: maison, GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_DATE: DATE, GIT_COMMITTER_DATE: DATE, LANG: "C", LC_ALL: "C", TZ: "Europe/Paris", GIT_EDITOR: "true", GIT_PAGER: "cat", PAGER: "cat", GIT_TERMINAL_PROMPT: "0" });
	delete env.GIT_DIR; delete env.GIT_WORK_TREE;
	jeu.taper("mkdir -p ~/" + nom); jeu.taper("cd ~/" + nom);
	var joueur = jeu.lire("JOUEUR");
	var racineJeu = "/home/" + joueur + "/" + nom;
	var resultats = [], editeur = null;
	suite.forEach(function(brute){
		var ligne = brute, comparer = true, cote = "deux";
		if (/^@editeur /.test(ligne)){ var p = ligne.substring(9).split("|"); editeur = { js: p[0], sed: p.slice(1).join("|") }; return; }
		if (ligne.charAt(0) === "~"){ comparer = false; ligne = ligne.substring(1); }
		if (/^@jeu /.test(ligne)){ cote = "jeu"; comparer = false; ligne = ligne.substring(5); }
		if (/^@reel /.test(ligne)){ cote = "reel"; comparer = false; ligne = ligne.substring(6); }
		var r = { ligne: ligne, comparer: comparer, jeu: null, reel: null };
		if (cote !== "reel"){
			if (editeur) jeu.editer(editeur.js || "function(t){ return t; }");
			try { r.jeu = netJeu(jeu.taper(ligne)).split(racineJeu).join("<R>"); } catch (e){ r.jeu = "EXCEPTION " + (e && e.stack || e); }
		}
		if (cote !== "jeu" && GIT_REEL){
			var m = /^cd (.*)$/.exec(ligne);
			if (m && !/[;&|]/.test(ligne)){ cwdReel = path.resolve(cwdReel, m[1].replace(/^~/, maison)); r.reel = ""; }
			else {
				var envL = Object.assign({}, env);
				if (editeur){ var script = path.join(racineReel, "editeur.sh"); fs.writeFileSync(script, "#!/bin/sh\nsed -i -e '" + (editeur.sed || "") + "' \"$1\"\n"); fs.chmodSync(script, 493); envL.GIT_EDITOR = script; envL.GIT_SEQUENCE_EDITOR = script; if (!editeur.sed) envL.GIT_EDITOR = "true"; }
				var x = cp.spawnSync("bash", ["-c", ligne.replace(/~\//g, maison + "/") + " 2>&1"], { cwd: cwdReel, env: envL, encoding: "utf8", timeout: 20000 });
				r.reel = String(x.stdout || "").replace(/\s+$/, "").split(path.join(maison)).join("<M>");
			}
		}
		editeur = null;
		resultats.push(r);
	});
	try { fs.rmSync(racineReel, { recursive: true, force: true }); } catch (e){}
	resultats.racineJeu = racineJeu;
	return resultats;
}
/* Ramène les chemins des deux côtés à une même forme. */
function normaliser(t, resultats){
	// Les lignes de progression (le vrai ne les écrit que sur un terminal ; le jeu en est un).
	t = String(t || "").replace(/\x1b\[K/g, "").replace(/Rebasing \(\d+\/\d+\)/g, "").replace(/\r/g, "");
	t = t.split("\n").filter(function(l){ return !/^(Enumerating objects|Counting objects|Compressing objects|Writing objects|Total \d+ \(delta|Unpacking objects|Delta compression)/.test(l); }).join("\n");
	return t.replace(/<M>\/t\d+/g, "<R>").replace(/<M>/g, "<R>").replace(/\/home\/[a-z0-9_-]+\/t\d+/g, "<R>").replace(/[ \t]+$/gm, "");
}
module.exports = { jouer: jouer, jeuNeuf: jeuNeuf, netJeu: netJeu, normaliser: normaliser, GIT_REEL: GIT_REEL };
