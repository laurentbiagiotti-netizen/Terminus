/**
 * Le graphe vivant du dépôt git (GrapheGit.js) : le modèle calculé par modeleGrapheGit, et la commande du jeu graphe.
 *   node tests/graphe-git.js   (-v pour voir chaque commande)
 *
 * Les règles d'écriture et l'ordre de chargement, hors d'un dépôt et sur un dépôt nu (rien), un dépôt vide, des sceaux
 * en ligne, une branche et une fusion, l'œil détaché, un menhir, les orphelins après reset --hard et après rebase (et
 * leur effacement au bout de quelques commandes), une fusion en conflit, la branche distante après un clone, la limite
 * de taille et la fenêtre qui garde l'œil, la vitesse, puis la commande graphe (on, off, la sauvegarde, la page d'aide).
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");

var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 800)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 800)); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");

function jeuNeuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {}, 4242);
	jeu.lire("tousLesSorts().concat(SORTS_GIT, ['echo', 'cat', 'mkdir', 'cd', 'ls', 'rm', 'touch', 'printf']).forEach(function(s){ state.spells[s] = true; })");
	jeu.lire("state.env.GIT_AUTHOR_DATE = '1760000000 +0200'; state.env.GIT_COMMITTER_DATE = '1760000000 +0200';");
	jeu.lire("var EVTS = []; GameEvents.addListener('git', function(e){ EVTS.push(e); });");
	t(jeu, "git config --global user.name 'Lea Test'"); t(jeu, "git config --global user.email lea@x.fr"); t(jeu, "git config --global init.defaultBranch main");
	return jeu;
}
function t(jeu, c, r){
	try { return jeu.taper(c, r); }
	catch (e){ verifier(false, "exception JavaScript sur « " + c + " » : " + (e && e.stack || e)); return ""; }
}
function tous(jeu, l){ return l.map(function(c){ return t(jeu, c); }).join("\n"); }
/* Le modèle du dépôt ~/nom (options en JSON). */
function modele(jeu, nom, options){ return jeu.lire("JSON.stringify(modeleGrapheGit(null, '~/" + nom + "', " + (options || "{}") + "))") === "null" ? null : JSON.parse(jeu.lire("JSON.stringify(modeleGrapheGit(null, '~/" + nom + "', " + (options || "{}") + "))")); }
function resoudre(jeu, nom, rev){ return jeu.lire("gitResoudre(null, '~/" + nom + "', " + JSON.stringify(rev) + ")"); }
function noeud(M, hash){ return M.noeuds.filter(function(n){ return n.hash === hash; })[0] || null; }
function depot(jeu, nom, n){
	tous(jeu, ["cd ~", "mkdir -p " + nom, "cd " + nom, "git init -q"]);
	for (var i = 1; i <= (n || 0); i++) tous(jeu, ["echo " + i + " >> f.txt", "git add f.txt", "git commit -qm 'sceau " + i + "'"]);
}

/* ================================================================== */
/* 1. Les règles d'écriture, l'ordre de chargement                     */
/* ================================================================== */
(function(){
	var src = fs.readFileSync(path.join(JS, "GrapheGit.js"), "utf8");
	var code = src.replace(/"(?:[^"\\\n]|\\.)*"/g, "\"\"").replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
	verifier(src.indexOf("—") === -1, "GrapheGit.js : pas de tiret cadratin");
	verifier(src.indexOf("CyberSup") === -1, "GrapheGit.js : Cybersup bien écrit");
	var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
	verifier(chaines.filter(function(x){ return x.indexOf(" & ") > -1; }).length === 0, "GrapheGit.js : pas d'esperluette en prose");
	verifier(!/\beval\s*\(|new Function\s*\(/.test(src), "GrapheGit.js : ni eval ni Function");
	verifier(!/=>/.test(code), "GrapheGit.js : pas de fonction fléchée");
	verifier(!/\b(let|const|class)\s/.test(code), "GrapheGit.js : ni let, ni const, ni class");
	verifier(src.indexOf("`") === -1, "GrapheGit.js : pas de gabarit `...`");
	verifier(!/\.repeat\(/.test(src), "GrapheGit.js : pas de String.repeat");
	var aide = fs.readFileSync(path.join(JS, "AideDuJeu.js"), "utf8");
	verifier(aide.indexOf("—") === -1, "AideDuJeu.js : pas de tiret cadratin");
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var a = index.indexOf("/HabitantsChronique.js?"), b = index.indexOf("/GrapheGit.js?"), c = index.indexOf("/AideDuJeu.js?");
	verifier(a > -1 && b > a && c > b, "index.html : GrapheGit.js après HabitantsChronique.js, avant AideDuJeu.js");
	var v = /HabitantsChronique\.js\?v=(\w+)/.exec(index), w = /GrapheGit\.js\?v=(\w+)/.exec(index);
	verifier(v && w && v[1] === w[1], "index.html : GrapheGit.js porte le même suffixe ?v= que les autres");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf("\"HabitantsChronique.js\", \"GrapheGit.js\"") > -1 && mondeJs.indexOf("\"GrapheGit.js\"") < mondeJs.indexOf("\"AideDuJeu.js\""), "tests/monde.js charge GrapheGit.js au même endroit");
	var css = fs.readFileSync(path.join(RACINE, "Web", "static", "css", "terminus.css"), "utf8");
	verifier(css.indexOf("#graphe") > -1 && css.indexOf(".gg-orphelin") > -1, "terminus.css habille le graphe");
	["Room.js", "Game.js"].forEach(function(f){ verifier(/"graphe"\]/.test(fs.readFileSync(path.join(JS, f), "utf8")), f + " : montrer une image (ou la carte) retire le graphe"); });
})();

/* ================================================================== */
/* 2. Rien hors d'un dépôt ; un dépôt vide ; des sceaux en ligne        */
/* ================================================================== */
var jeu = jeuNeuf();
(function(){
	egal(modele(jeu, ""), null, "hors d'un dépôt : pas de graphe");
	egal(jeu.lire("modeleGrapheGit(null, '~/nulle-part')"), null, "un chemin qui n'existe pas : pas de graphe");
	tous(jeu, ["cd ~", "git init -q --bare nu.git"]);
	egal(modele(jeu, "nu.git"), null, "un dépôt nu : pas de graphe");
	depot(jeu, "vide", 0);
	var M = modele(jeu, "vide");
	verifier(M && M.vide === true, "un dépôt neuf : vide");
	egal(M && M.branche, "main", "un dépôt neuf : l'œil sur main");
	egal(M && M.noeuds.length, 0, "un dépôt neuf : aucun sceau");
	contient(jeu.lire("etatGrapheGit(modeleGrapheGit(null, '~/vide'))"), "aucun sceau encore", "la ligne d'état d'un dépôt vide");
	t(jeu, "echo x > a");
	contient(jeu.lire("travailGrapheGit(modeleGrapheGit(null, '~/vide'))"), "non suivis : 1", "un fichier non suivi se compte");
	t(jeu, "git add a");
	contient(jeu.lire("travailGrapheGit(modeleGrapheGit(null, '~/vide'))"), "autel (index) : 1", "un fichier posé sur l'autel se compte");

	depot(jeu, "ligne", 3);
	M = modele(jeu, "ligne");
	egal(M.noeuds.length, 3, "trois sceaux");
	egal(M.total, 3, "trois sceaux en tout");
	egal(M.noeuds[0].sujet, "sceau 3", "le plus récent en haut");
	egal(M.noeuds[2].sujet, "sceau 1", "le plus ancien en bas");
	egal(M.noeuds[0].court, M.noeuds[0].hash.substring(0, 7), "le hash court a sept caractères");
	egal(M.noeuds[0].hash, resoudre(jeu, "ligne", "HEAD"), "le premier sceau est HEAD");
	verifier(M.noeuds[0].tete && !M.noeuds[1].tete, "l'œil est sur le plus récent seulement");
	egal(JSON.stringify(M.noeuds[0].branches), "[\"main\"]", "l'étiquette main est sur son sceau");
	egal(M.aretes.length, 2, "deux arêtes");
	verifier(M.aretes.every(function(a){ return a.voie === 0 && !a.coupeBas && !a.orphelin; }), "une seule voie, rien de coupé");
	egal(M.voies, 1, "une seule voie");
	verifier(!M.detache && M.etat === null && M.conflits === 0, "ni détaché, ni fusion, ni conflit");
	egal(M.orphelins.length, 0, "pas d'orphelin");
})();

/* ================================================================== */
/* 3. Une branche, une fusion, l'œil détaché, un menhir                 */
/* ================================================================== */
(function(){
	depot(jeu, "fourche", 2);
	tous(jeu, ["git switch -q -c legende", "echo l > l.txt", "git add l.txt", "git commit -qm 'la legende'", "git switch -q main", "echo m > m.txt", "git add m.txt", "git commit -qm 'le monde'"]);
	var M = modele(jeu, "fourche");
	egal(M.noeuds.length, 4, "quatre sceaux avant la fusion");
	egal(M.voies, 2, "deux voies : deux lignes du destin");
	var leg = M.branches.filter(function(b){ return b.nom === "legende"; })[0], main = M.branches.filter(function(b){ return b.nom === "main"; })[0];
	verifier(leg && main && leg.couleur !== main.couleur, "deux branches, deux couleurs");
	egal(main.couleur, 0, "main a la première couleur");
	var nl = noeud(M, resoudre(jeu, "fourche", "legende")), nm = noeud(M, resoudre(jeu, "fourche", "main"));
	verifier(nl && nm && nl.voie !== nm.voie, "les deux pointes sont sur deux voies");
	egal(nl.couleur, leg.couleur, "le sceau de legende porte la couleur de legende");
	t(jeu, "git merge -q --no-edit legende");
	M = modele(jeu, "fourche");
	var f = M.noeuds[0];
	egal(f.parents.length, 2, "le sceau de fusion a deux parents");
	verifier(f.tete && f.branches.indexOf("main") > -1, "la fusion porte main et l'œil");
	egal(M.aretes.filter(function(a){ return a.de === f.hash; }).length, 2, "deux arêtes partent de la fusion");
	verifier(M.aretes.filter(function(a){ return a.de === f.hash; })[1].voie !== f.voie, "la seconde arête de la fusion part sur une autre voie");

	t(jeu, "git switch -q --detach HEAD~1");
	M = modele(jeu, "fourche");
	verifier(M.detache === true, "HEAD détaché");
	egal(M.branche, null, "détaché : pas de branche courante");
	var tete = M.noeuds.filter(function(n){ return n.tete; });
	egal(tete.length, 1, "un seul œil");
	egal(tete[0].hash, resoudre(jeu, "fourche", "main~1"), "l'œil est sur main~1");
	contient(jeu.lire("etatGrapheGit(modeleGrapheGit(null, '~/fourche'))"), "détaché", "la ligne d'état dit détaché");
	egal(M.noeuds[0].branches.indexOf("main") > -1 && !M.noeuds[0].tete, true, "main reste sur la fusion, sans l'œil");
	t(jeu, "git switch -q main");

	tous(jeu, ["git tag v1 HEAD~1", "git tag -a v2 -m 'deuxieme' HEAD"]);
	M = modele(jeu, "fourche");
	egal(M.tags.length, 2, "deux menhirs");
	egal(JSON.stringify(noeud(M, resoudre(jeu, "fourche", "HEAD~1")).tags), "[\"v1\"]", "le menhir léger est sur son sceau");
	egal(JSON.stringify(M.noeuds[0].tags), "[\"v2\"]", "le menhir annoté est pelé jusqu'à son sceau");
})();

/* ================================================================== */
/* 4. Les orphelins : reset --hard, rebase ; leur effacement            */
/* ================================================================== */
(function(){
	depot(jeu, "experiences", 4);
	var avant = [resoudre(jeu, "experiences", "HEAD"), resoudre(jeu, "experiences", "HEAD~1")];
	t(jeu, "git reset -q --hard HEAD~2");
	var M = modele(jeu, "experiences");
	egal(M.orphelins.length, 2, "reset --hard HEAD~2 : deux sceaux orphelins");
	verifier(avant.every(function(h){ return M.orphelins.indexOf(h) > -1; }), "les orphelins sont les deux sceaux abandonnés");
	egal(M.noeuds.length, 4, "les orphelins restent dessinés");
	var o = noeud(M, avant[0]);
	verifier(o && o.orphelin && o.couleur === -1 && !o.tete && o.branches.length === 0, "un orphelin : gris, sans œil, sans étiquette");
	verifier(M.noeuds[0].hash === avant[0] && M.noeuds[2].tete, "l'orphelin le plus récent en haut, l'œil plus bas");
	verifier(M.aretes.filter(function(a){ return a.de === avant[0] || a.de === avant[1]; }).every(function(a){ return a.orphelin; }), "les arêtes des orphelins sont grises");
	verifier(!noeud(M, resoudre(jeu, "experiences", "HEAD")).orphelin, "le sceau de l'œil n'est pas orphelin");

	// La mémoire : un orphelin s'efface au bout de quelques commandes git.
	var expr = "(function(){ var m = { compteur: 0, vus: {} }; var r = []; for (var i = 0; i < 10; i++){ m.compteur = i; r.push(modeleGrapheGit(null, '~/experiences', { memoire: m, duree: 3 }).orphelins.length); } return r.join(','); })()";
	egal(jeu.lire(expr), "2,2,2,0,0,0,0,0,0,0", "les orphelins restent trois commandes, puis s'effacent");
	// Le reflog oublie aussi : après une douzaine de mouvements de l'œil, plus d'orphelin.
	for (var i = 0; i < 13; i++) tous(jeu, ["echo r" + i + " >> f.txt", "git commit -qam 'apres " + i + "'"]);
	egal(modele(jeu, "experiences").orphelins.length, 0, "les orphelins sortent de la fenêtre du reflog");

	// Le rebase : les sceaux réécrits abandonnent les anciens.
	depot(jeu, "rebase", 1);
	tous(jeu, ["git switch -q -c theme", "echo a > a.txt", "git add a.txt", "git commit -qm 'theme a'", "echo b > b.txt", "git add b.txt", "git commit -qm 'theme b'",
		"git switch -q main", "echo m > m.txt", "git add m.txt", "git commit -qm 'main bouge'", "git switch -q theme"]);
	var anciens = [resoudre(jeu, "rebase", "theme"), resoudre(jeu, "rebase", "theme~1")];
	t(jeu, "git rebase main");
	M = modele(jeu, "rebase");
	verifier(resoudre(jeu, "rebase", "theme") !== anciens[0], "le rebase a réécrit theme");
	egal(M.orphelins.length, 2, "après le rebase, les deux anciens sceaux sont orphelins");
	verifier(anciens.every(function(h){ return noeud(M, h) && noeud(M, h).orphelin; }), "les anciens sceaux sont dessinés en gris");
	egal(noeud(M, resoudre(jeu, "rebase", "theme")).tete, true, "l'œil est sur le nouveau theme");

	// commit --amend : l'ancien sceau est orphelin.
	var avantAmend = resoudre(jeu, "rebase", "HEAD");
	t(jeu, "git commit -q --amend -m 'theme b, corrige'");
	verifier(modele(jeu, "rebase").orphelins.indexOf(avantAmend) > -1, "commit --amend : l'ancien sceau est orphelin");
})();

/* ================================================================== */
/* 5. Une fusion en conflit ; un rebase arrêté                          */
/* ================================================================== */
(function(){
	depot(jeu, "conflit", 1);
	tous(jeu, ["git switch -q -c autre", "echo autre > f.txt", "git commit -qam 'autre version'", "git switch -q main", "echo mienne > f.txt", "git commit -qam 'ma version'"]);
	t(jeu, "git merge autre");
	var M = modele(jeu, "conflit");
	egal(M.etat, "fusion", "une fusion en cours");
	egal(M.conflits, 1, "un fichier en conflit");
	var etat = jeu.lire("etatGrapheGit(modeleGrapheGit(null, '~/conflit'))");
	contient(etat, "FUSION EN COURS", "la ligne d'état dit la fusion");
	contient(etat, "1 fichier en conflit", "la ligne d'état compte les conflits");
	t(jeu, "git merge --abort");
	egal(modele(jeu, "conflit").etat, null, "merge --abort : plus de fusion en cours");
	tous(jeu, ["git switch -q autre", "git rebase main"]);
	M = modele(jeu, "conflit");
	egal(M.etat, "rebase", "un rebase arrêté sur un conflit");
	contient(jeu.lire("etatGrapheGit(modeleGrapheGit(null, '~/conflit'))"), "REBASE EN COURS", "la ligne d'état dit le rebase");
	t(jeu, "git rebase --abort");
})();

/* ================================================================== */
/* 6. La branche distante après un clone                                */
/* ================================================================== */
(function(){
	depot(jeu, "source", 3);
	tous(jeu, ["cd ~", "git clone -q ~/source copie", "cd copie"]);
	var M = modele(jeu, "copie");
	verifier(M.distantes.some(function(d){ return d.nom === "origin/main"; }), "après le clone : origin/main");
	verifier(M.distantes.every(function(d){ return !/HEAD$/.test(d.nom); }), "origin/HEAD n'est pas dessiné à part");
	var n0 = M.noeuds[0];
	verifier(n0.distantes.indexOf("origin/main") > -1 && n0.branches.indexOf("main") > -1, "main et origin/main sur le même sceau");
	egal(M.distantes[0].couleur, M.branches[0].couleur, "origin/main a la couleur de main");
	verifier(!n0.distant, "un sceau aussi local n'est pas « distant seulement »");
	// Le maître avance, on va chercher : le sceau neuf n'est atteint que par origin/main.
	tous(jeu, ["cd ~/source", "echo 4 >> f.txt", "git commit -qam 'sceau 4'", "cd ~/copie", "git fetch -q"]);
	M = modele(jeu, "copie");
	var neuf = noeud(M, resoudre(jeu, "copie", "origin/main"));
	verifier(neuf && neuf.distant && neuf.distantes.indexOf("origin/main") > -1 && neuf.branches.length === 0, "après fetch : le sceau neuf est distant (pointillés)");
	verifier(M.aretes.filter(function(a){ return a.de === neuf.hash; }).every(function(a){ return a.distant; }), "son arête est en pointillés");
	egal(M.noeuds[0].hash, neuf.hash, "le sceau distant neuf est en haut");
	// Les événements git portent le dépôt touché.
	var e = JSON.parse(jeu.lire("JSON.stringify(EVTS[EVTS.length - 1], function(k, v){ return k === 'target' ? undefined : v; })"));
	verifier(e && e.depot && modele(jeu, "copie") && jeu.lire("!!modeleGrapheGit(" + JSON.stringify(e.hote) + ", " + JSON.stringify(e.depot) + ")"), "le dépôt d'un événement git se dessine (hote, depot)");
})();

/* ================================================================== */
/* 7. La limite de taille, la fenêtre de l'œil, la vitesse              */
/* ================================================================== */
(function(){
	jeu.lire("(function(){ var g = gitConstructeur(null, '~/grand', { branche: 'main' }); for (var i = 0; i < 64; i++){ var f = {}; f['f' + (i % 5) + '.txt'] = 'ligne ' + i + '\\n'; g.commit({ date: 1700000000 + i * 60, message: 'Entree ' + i, fichiers: f }); if (i === 30){ g.branche('vieille'); } } g.tag('jalon', 'HEAD~10'); g.extraire(); })()");
	var debut = Date.now();
	var M = modele(jeu, "grand");
	var duree = Date.now() - debut;
	egal(M.total, 64, "64 sceaux en tout");
	egal(M.noeuds.length, 25, "25 sceaux montrés au plus");
	egal(M.plusAnciens, 39, "les 39 autres sont annoncés « ... »");
	egal(M.plusRecents, 0, "rien au-dessus");
	verifier(M.aretes.some(function(a){ return a.coupeBas; }), "une arête descend vers les sceaux cachés");
	verifier(duree < 400, "le modèle se calcule vite (" + duree + " ms pour 64 sceaux)");
	egal(M.noeuds[0].sujet, "Entree 63", "le plus récent en haut");
	tous(jeu, ["cd ~/grand", "git switch -q --detach HEAD~50"]);
	M = modele(jeu, "grand");
	var tete = M.noeuds.filter(function(n){ return n.tete; });
	egal(tete.length, 1, "l'œil détaché loin dans le passé reste dans la fenêtre");
	verifier(M.plusRecents > 0 && M.plusRecents + M.noeuds.length + M.plusAnciens === 64, "la fenêtre annonce les plus récents et les plus anciens");
	verifier(M.aretes.some(function(a){ return a.coupeHaut; }), "une arête descend d'en haut");
	verifier(M.noeuds.length === 25, "toujours 25 sceaux");
	t(jeu, "git switch -q main");
	// Le labyrinthe (64) et les annales (50) du chapitre : rapides aussi.
	var ch = monde.nouveauMonde({}, 4242);
	ch.taper("chapitre 9", "oui");
	ch.lire("semerLabyrintheCh9(); semerAnnalesCh9()");
	["labyrinthe", "annales", "lignes", "experiences"].forEach(function(nom){
		var d0 = Date.now(), m = ch.lire("JSON.stringify(modeleGrapheGit(null, '~/chronotheque/" + nom + "'))"), d = Date.now() - d0;
		var MM = m === "null" ? null : JSON.parse(m);
		verifier(MM && MM.noeuds.length > 0 && MM.noeuds.length <= 25, "~/chronotheque/" + nom + " : un graphe (" + (MM ? MM.total : 0) + " sceaux)");
		verifier(d < 500, "~/chronotheque/" + nom + " : calculé en " + d + " ms");
	});
})();

/* ================================================================== */
/* 8. La commande graphe : on, off, la sauvegarde, la page d'aide       */
/* ================================================================== */
(function(){
	var stockage = {};
	var j = jeuNeuf(stockage);
	contient(t(j, "graphe"), "pas dans un dépôt", "graphe hors d'un dépôt");
	depot(j, "essai", 2);
	var s = t(j, "graphe");
	contient(s, "LE GRAPHE DU DÉPÔT ESSAI", "graphe dans un dépôt : le titre");
	contient(s, "œil sur main", "graphe : l'œil");
	contient(s, "2 sceaux", "graphe : le compte des sceaux");
	contient(s, "navigateur", "graphe hors navigateur : le dessin est dans le navigateur");
	contient(t(j, "graphe off"), "coupé", "graphe off");
	egal(j.lire("state.has('grapheGitCoupe')"), true, "graphe off : la préférence est posée");
	t(j, "git status");
	j.lire("state.save()");
	var j2 = monde.nouveauMonde(stockage, 4242);
	egal(j2.lire("state.has('grapheGitCoupe')"), true, "graphe off : gardé dans la sauvegarde");
	contient(t(j, "graphe on"), "remis", "graphe on");
	egal(j.lire("state.has('grapheGitCoupe')"), false, "graphe on : la préférence est retirée");
	contient(t(j, "graphe non"), "coupé", "graphe non");
	contient(t(j, "graphe oui"), "remis", "graphe oui");
	contient(t(j, "graphe bof"), "je ne connais pas", "graphe avec un mot inconnu");
	verifier(j.lire("SORTS_DU_JEU.indexOf('graphe') > -1"), "graphe est une commande du jeu");
	verifier(j.lire("COMMANDES_DU_JEU.some(function(c){ return /^graphe/.test(c[0]); })"), "graphe est dans la liste de help");
	var page = t(j, "help graphe");
	contient(page, "Commande du jeu", "help graphe : la page");
	contient(page, "sceau = commit, ligne du destin = branche, œil = HEAD, menhir = tag", "help graphe : les mots du jeu et les vrais mots");
	contient(page, "  graphe off", "help graphe : graphe off");
	contient(page, "  graphe on", "help graphe : graphe on");
	absent(page, "—", "help graphe : pas de tiret cadratin");
	contient(t(j, "man graphe"), "graphe off", "man graphe");
	contient(t(j, "graphe --help"), "Commande du jeu", "graphe --help");
	// Sans navigateur, une commande git ne plante jamais à cause du graphe.
	verifier(j.lire("typeof document === 'undefined'"), "les tests tournent sans navigateur");
	contient(t(j, "git log --oneline"), "sceau 2", "git log marche avec le graphe branché");
	j.lire("grapheGitApresCommande({ type: 'git', hote: null, depot: '/home/' + JOUEUR + '/essai' }); grapheGitApresCommande(null); grapheGitApresCommande({ depot: '/nulle/part' })");
	verifier(true, "l'écouteur du graphe ne lève rien hors navigateur");
	egal(j.lire("montrerGrapheGit(null, '~/essai')"), false, "montrerGrapheGit hors navigateur : rien");
})();

console.log("graphe-git : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exitCode = 1;
