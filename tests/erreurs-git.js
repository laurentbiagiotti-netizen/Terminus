/**
 * Les aides en français sous les erreurs de git et de gh (Web/static/javascript/ErreursGit.js).
 *
 * Deux parties jouées côte à côte, commande par commande : l'une avec les aides, l'autre sans
 * (AIDES_ERREURS_GIT = false). Pour chaque erreur provoquée, on vérifie :
 *   - le message anglais du vrai git est là, et intact : la sortie avec aide, privée de sa dernière ligne
 *     (l'aide), est exactement la sortie sans aide ;
 *   - l'aide française est la dernière ligne, en gris ;
 * puis : rien dans un tuyau ni dans un objet, au plus trois fois la même aide, le compte sauvegardé.
 *
 * Lancer : node tests/erreurs-git.js   (-v pour voir chaque commande)
 */
var monde = require("./monde.js");
var fs = require("fs"), path = require("path");
var bavard = process.argv.indexOf("-v") > -1;

var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 1500)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 1500)); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }

/* Le royaume (10.0.90.20), comme dans tests/git-moteur.js. */
var ROYAUME = "var RoyaumeTest = machine('royaume', 'Le royaume (machine de test).', null);" +
	"decrireHote('royaume', { ip: '10.0.90.20', arrivee: function(){ return RoyaumeTest; } });";

function partie(aides, stockage){
	var jeu = monde.nouveauMonde(stockage || {}, 4242, { avant: ROYAUME });
	jeu.lire("tousLesSorts().concat(SORTS_GIT, ['gh', 'bash', 'printf', 'echo', 'cat', 'mkdir', 'cd', 'ls', 'rm', 'touch', 'grep', 'head', 'wc', 'ssh-keygen', 'ssh']).forEach(function(s){ state.spells[s] = true; })");
	jeu.lire("state.env.GIT_AUTHOR_DATE = '1760000000 +0200'; state.env.GIT_COMMITTER_DATE = '1760000000 +0200'; World.fige = true;");
	jeu.lire("AIDES_ERREURS_GIT = " + (aides ? "true" : "false") + ";");
	return jeu;
}
/* Ce que le jeu ajoute de lui-même (XP, succès, lieux) : hors sujet ici. */
function net(s){
	return String(s).split("\n").filter(function(l){ return !/^(\+\d+ XP|★|✦|✺|◆|◇|▲|\(Radio|\(Nouveau message|Tu viens de|Un nouveau lieu|Tu es maintenant dans|Tu es de retour)/.test(l); }).join("\n").replace(/\s+$/, "");
}

var A = partie(true), B = partie(false);
var ecranBrut = A.bac.ecran;
/* Joue une ligne dans les deux parties ; renvoie [avec aides, sans aides]. */
function deux(c){
	var a = net(A.taper(c)), b = net(B.taper(c));
	if (bavard) console.log("$ " + c + "\n" + a);
	return [a, b];
}
function lire(expr){ A.lire(expr); return B.lire(expr); }
function prep(liste){ liste.forEach(function(c){ deux(c); }); }

var TRADUITES = [];
/* Provoque une erreur : en (le texte anglais attendu), fr (un morceau de l'aide attendue). */
function erreur(c, en, fr){
	var r = deux(c), a = r[0], b = r[1];
	contient(b, en, "[" + c + "] le message anglais");
	var lignes = a.split("\n"), derniere = lignes[lignes.length - 1];
	contient(derniere, fr, "[" + c + "] l'aide française en dernière ligne");
	verifier(/^\(.*\)$/.test(derniere), "[" + c + "] l'aide est une ligne entre parenthèses : " + derniere);
	egal(lignes.slice(0, -1).join("\n").replace(/\s+$/, ""), b, "[" + c + "] le texte anglais est intact (sortie sans l'aide)");
	// En gris, sur l'écran (avant que le test retire les couleurs).
	verifier(ecranBrut.some(function(l){ return l.indexOf("\x1b[90m" + derniere) > -1; }), "[" + c + "] l'aide est en gris");
	verifier(derniere.indexOf("—") === -1 && derniere.indexOf(" & ") === -1, "[" + c + "] ni tiret cadratin ni esperluette");
	TRADUITES.push(en + "  ->  " + derniere);
	return a;
}
/* Une commande sans aide : la sortie avec aides est identique à la sortie sans. */
function sansAide(c, msg){
	var r = deux(c);
	egal(r[0], r[1], "[" + c + "] " + (msg || "pas d'aide"));
	return r[0];
}

/* ================================================================== */
/* 1. Les erreurs locales                                              */
/* ================================================================== */
prep(["mkdir -p ~/r1", "cd ~"]);
erreur("git status", "fatal: not a git repository", "Tu n'es dans aucun dépôt");
prep(["cd ~/r1", "git config --global init.defaultBranch main", "git init -q", "echo un > a", "git add a"]);
erreur("git commit -m un", "*** Please tell me who you are.", "git config --global user.name");
prep(["git config --global user.name 'Ada Test'", "git config --global user.email ada@x.fr"]);
erreur("git log", "does not have any commits yet", "Aucun sceau encore");
prep(["git commit -qm un"]);
erreur("git commit -m deux", "nothing to commit, working tree clean", "git add FICHIER");
prep(["echo deux >> a"]);
erreur("git commit -m deux", "no changes added to commit", "pas sur l'autel");
prep(["git commit -qam deux", "echo n > n.txt"]);
erreur("git commit -m trois", "nothing added to commit but untracked files present", "pas encore suivis");
prep(["rm n.txt"]);
erreur("git add", "Nothing specified, nothing added.", "git add .");
erreur("git add zz", "fatal: pathspec 'zz' did not match any files", "Aucun fichier de ce nom");
erreur("git checkout zz", "error: pathspec 'zz' did not match any file(s) known to git", "ni branche ni fichier");
erreur("git switch zz", "fatal: invalid reference: zz", "Cette branche n'existe pas");
erreur("git sttaus", "git: 'sttaus' is not a git command.", "Cette commande git n'existe pas");
erreur("git log zz", "unknown revision or path not in the working tree", "ni sceau, ni branche");
erreur("git branch main", "fatal: a branch named 'main' already exists", "existe déjà");
erreur("git switch HEAD~1", "fatal: a branch is expected, got commit 'HEAD~1'", "git switch --detach");
erreur("git checkout HEAD~1", "You are in 'detached HEAD' state", "Ton œil n'est sur aucune ligne du destin : git switch main pour revenir, ou git switch -c NOM pour garder ce que tu fais ici.");
prep(["git switch -q main"]);
erreur("git push", "fatal: No configured push destination.", "git remote add origin");
erreur("git switch --detach HEAD~1", "HEAD is now at", "Ton œil n'est sur aucune ligne du destin");
prep(["git switch -q main"]);
sansAide("git switch -q -c idee", "créer une branche n'est pas une erreur");
prep(["echo idee > i", "git add i", "git commit -qm idee", "git switch -q main"]);
erreur("git branch -d idee", "is not fully merged", "git branch -D NOM");

/* Les paradoxes : une ligne changée des deux côtés. */
prep(["git switch -q -c b1", "printf 'B1\\n' > a", "git commit -qam b1", "git switch -q main", "printf 'MAIN\\n' > a", "git commit -qam main"]);
erreur("git merge b1", "Automatic merge failed; fix conflicts and then commit the result.", "git merge --abort");
erreur("git merge b1", "Merging is not possible because you have unmerged files.", "paradoxe attend encore");
prep(["git merge --abort"]);
prep(["echo sale >> a"]);
erreur("git switch b1", "Your local changes to the following files would be overwritten by checkout", "git stash");
erreur("git rebase b1", "cannot rebase: You have unstaged changes.", "Le rebase veut une copie de travail propre");
prep(["git restore a"]);
erreur("git cherry-pick b1", "error: could not apply", "git cherry-pick --continue");
prep(["git cherry-pick --abort", "git switch -q b1"]);
erreur("git rebase main", "error: could not apply", "git rebase --continue");
prep(["git rebase --abort", "git switch -q main", "printf 'TROIS\\n' > a", "git commit -qam trois"]);
erreur("git revert HEAD~1", "error: could not revert", "git revert --continue");
prep(["git revert --abort", "echo cache >> a", "git stash -q", "printf 'QUATRE\\n' > a", "git commit -qam quatre"]);
erreur("git stash pop", "CONFLICT (content): Merge conflict in a", "git stash drop");
prep(["git reset -q --hard", "git stash drop -q"]);

/* Des histoires étrangères, un Royaume déjà enregistré, un clone déjà fait. */
prep(["mkdir -p ~/r2", "cd ~/r2", "git init -q", "echo autre > z", "git add z", "git commit -qm autre", "cd ~/r1", "git remote add autre ../r2", "git fetch -q autre"]);
erreur("git merge autre/main", "fatal: refusing to merge unrelated histories", "--allow-unrelated-histories");
erreur("git remote add autre ../r2", "error: remote autre already exists.", "git remote set-url");
prep(["cd ~", "git clone -q r1 copie"]);
erreur("git clone r1 copie", "fatal: destination path 'copie' already exists and is not an empty directory.", "clone sous un autre nom");

/* ================================================================== */
/* 2. Les Royaumes : push, pull                                        */
/* ================================================================== */
prep(["cd ~", "git init -q --bare nu.git", "git clone -q nu.git c1", "cd c1", "echo base > f", "git add f", "git commit -qm base", "git push -q origin main",
	"cd ~", "git clone -q nu.git c2", "cd ~/c1", "echo c1 >> f", "git commit -qam c1", "git push -q", "cd ~/c2", "echo c2 >> f", "git commit -qam c2"]);
erreur("git push", "Updates were rejected because the remote contains work that you do not", "git pull pour les récupérer");
prep(["git fetch -q"]);
erreur("git push", "Updates were rejected because the tip of your current branch is behind", "en retard");
erreur("git pull", "divergent branches", "git pull --rebase");
prep(["git switch -q -c neuve"]);
erreur("git push", "fatal: The current branch neuve has no upstream branch.", "git push -u origin neuve");
erreur("git pull", "There is no tracking information for the current branch.", "git branch -u origin/NOM");
erreur("git push origin fantome", "error: src refspec fantome does not match any", "« fantome »");
prep(["git switch -q --detach HEAD~1"]);
erreur("git push", "fatal: You are not currently on a branch.", "git switch -c NOM");
prep(["git switch -q main", "git reset -q --hard origin/main", "git tag v1 HEAD~1", "git push -q origin v1", "git tag -f v1"]);
erreur("git push origin v1", "Updates were rejected because the tag already exists in the remote.", "nouveau tag");

/* Le royaume par ssh : sans clé, une machine inconnue, un dépôt absent. */
var J = A.lire("JOUEUR");
lire("(function(){ var g = gitConstructeur('royaume', '/srv/git/chronique.git', { nu: true }); g.commit({ message: 'Fondation', fichiers: { 'LISEZMOI': 'Le royaume.\\n' } }); g.fin(); })()");
prep(["cd ~"]);
erreur("git clone royaume:/srv/git/chronique.git", J + "@royaume: Permission denied (publickey).", "ssh-copy-id " + J + "@royaume");
erreur("git clone inconnu:/x.git", "ssh: Could not resolve hostname inconnu", "git remote -v");
lire("state.reseau = state.reseau || {}; state.reseau.cles = { royaume: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIForgeForgeForgeForgeForgeForgeForgeForge00 x@y' };" +
	"gEcrire(Home, '.ssh/id_ed25519', 'prive\\n', { owner: JOUEUR }); gEcrire(Home, '.ssh/id_ed25519.pub', state.reseau.cles.royaume + '\\n', { owner: JOUEUR });");
erreur("git clone royaume:/srv/git/absent.git", "fatal: '/srv/git/absent.git' does not appear to be a git repository", "pas de dépôt à cette adresse");

/* La forge : le rempart, gh. */
prep(["cd ~", "git clone -q royaume:/srv/git/chronique.git chronique", "cd chronique"]);
lire("forgeProteger('royaume', '/srv/git/chronique.git', 'main', { pr: true, revues: 1, verifications: ['tests'] })");
prep(["echo direct >> LISEZMOI", "git commit -qam direct"]);
erreur("git push", "! [remote rejected] main -> main (protected branch hook declined)", "rempart du Royaume");
erreur("gh pr create --title t --body b", "must be on a branch named differently than", "git switch -c NOM");
prep(["git reset -q --hard origin/main", "git switch -q -c chant", "echo chant > chant.txt", "git add chant.txt", "git commit -qm 'Ajoute le chant'"]);
erreur("gh pr create --title t --body b", "you must first push the current branch", "git push -u origin NOM");
prep(["git push -q -u origin chant", "gh pr create --title 'Ajoute le chant' --body 'Un chant'"]);
erreur("gh pr merge 1 --merge", "the base branch policy prohibits the merge", "gh pr checks");
erreur("gh truc", "unknown command \"truc\" for \"gh\"", "gh --help");
prep(["cd ~/r2"]);
erreur("gh pr list", "no git remotes found", "git remote add origin");

/* Les sorties qui ne sont pas des erreurs n'ont pas d'aide. */
prep(["cd ~/r1"]);
sansAide("git status", "git status, dépôt propre");
sansAide("git log --oneline -1", "git log");

/* ================================================================== */
/* 3. Ni dans un tuyau, ni dans un objet                               */
/* ================================================================== */
(function(){
	var jeu = partie(true);
	function t(c){ var s = net(jeu.taper(c)); if (bavard) console.log("$ " + c + "\n" + s); return s; }
	t("mkdir -p ~/p"); t("cd ~/p");
	// La sortie des erreurs dans le tuyau : l'aide ne suit pas.
	var tuyau = t("git status 2>&1 | cat");
	contient(tuyau, "fatal: not a git repository", "dans un tuyau : le message anglais passe");
	absent(tuyau, "Tu n'es dans aucun dépôt", "dans un tuyau (2>&1 |) : pas d'aide");
	egal(t("git status 2>&1 | wc -l"), "1", "le tuyau ne reçoit que la ligne du vrai git");
	// La sortie des erreurs dans un objet : l'objet n'a que le texte anglais, l'écran rien.
	egal(t("git status 2> erreurs.txt"), "", "2> objet : rien à l'écran");
	egal(t("cat erreurs.txt"), "fatal: not a git repository (or any of the parent directories): .git", "2> objet : le texte anglais seul");
	egal(t("git status > sortie.txt 2>&1"), "", "> objet 2>&1 : rien à l'écran");
	egal(t("cat sortie.txt"), "fatal: not a git repository (or any of the parent directories): .git", "> objet 2>&1 : pas d'aide dans l'objet");
	// Un message de la sortie normale (nothing to commit) envoyé dans un tuyau : pas d'aide, même à l'écran.
	t("git config --global user.name Ada"); t("git config --global user.email a@x.fr"); t("git init -q"); t("rm -f erreurs.txt sortie.txt");
	t("echo a > a"); t("git add a"); t("git commit -qm un");
	var c1 = t("git commit -m deux | cat");
	contient(c1, "nothing to commit, working tree clean", "commit | cat : le message passe");
	absent(c1, "Rien à sceller", "commit | cat : pas d'aide");
	egal(t("git commit -m deux | grep -c ."), "2", "commit | grep : le tuyau n'a que les deux lignes de git");
	egal(t("git commit -m deux > sortie.txt"), "", "commit > objet : rien à l'écran");
	absent(t("cat sortie.txt"), "Rien à sceller", "commit > objet : pas d'aide dans l'objet");
	t("rm sortie.txt");
	// Dans une capture $(...), l'aide ne part pas non plus.
	absent(t("x=$(git commit -m deux); echo \"$x\""), "Rien à sceller", "$(...) : pas d'aide capturée");
	// À l'écran, elle est là (et ces essais ne l'ont pas comptée).
	contient(t("git commit -m deux"), "Rien à sceller", "à l'écran : l'aide");

	/* ============================================================== */
	/* 4. Au plus trois fois, puis plus jamais ; le compte sauvegardé  */
	/* ============================================================== */
	contient(t("git commit -m deux"), "Rien à sceller", "deuxième fois");
	contient(t("git commit -m deux"), "Rien à sceller", "troisième fois");
	var quatre = t("git commit -m deux");
	contient(quatre, "nothing to commit, working tree clean", "quatrième fois : le message anglais");
	absent(quatre, "Rien à sceller", "quatrième fois : plus d'aide");
	egal(jeu.lire("state.aidesGit['commit-rien']"), 3, "le compte de l'aide");
	// Une autre aide garde son propre compte.
	t("cd ~");
	contient(t("git status"), "Tu n'es dans aucun dépôt", "une autre aide : toujours là");
	// Sauvegarde puis rechargement : la limite tient.
	var stockage = {};
	var j2 = partie(true, stockage);
	j2.lire("state.aidesGit = { 'pas-un-depot': 2 }; state.save();");
	var j3 = partie(true, stockage);
	egal(j3.lire("state.aidesGit['pas-un-depot']"), 2, "le compte revient avec la sauvegarde");
	j3.taper("cd ~");
	contient(net(j3.taper("git status")), "Tu n'es dans aucun dépôt", "troisième fois après rechargement");
	absent(net(j3.taper("git status")), "Tu n'es dans aucun dépôt", "quatrième fois après rechargement : plus d'aide");
	egal(j3.lire("state.aidesGit['pas-un-depot']"), 3, "le compte, après rechargement");
	// Coupées : rien, et rien n'est compté.
	j3.lire("AIDES_ERREURS_GIT = false; state.aidesGit = {};");
	absent(net(j3.taper("git status")), "Tu n'es dans aucun dépôt", "AIDES_ERREURS_GIT = false : pas d'aide");
	egal(j3.lire("JSON.stringify(state.aidesGit)"), "{}", "AIDES_ERREURS_GIT = false : rien n'est compté");
	// Jamais de plantage : une sauvegarde abîmée, un io sans errFin.
	j3.lire("AIDES_ERREURS_GIT = true; state.aidesGit = 'abime';");
	contient(net(j3.taper("git status")), "Tu n'es dans aucun dépôt", "un compte abîmé est remis à neuf");
	egal(j3.lire("(function(){ try { return Shell.appeler('git', ['status'], { tty: true, erreurs: [], err: function(){} }) || 'ok'; } catch (e){ return e instanceof ShellError ? 'erreur du shell' : 'plantage'; } })()"), "erreur du shell", "un io sans errFin : l'erreur de git, sans plantage");
})();

/* ================================================================== */
/* 5. Le chapitre 9 et l'écriture                                      */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 9", "oui");
	jeu.lire("state.spells.git = true; state.spells.gh = true;");
	jeu.taper("cd ~");
	contient(net(jeu.taper("git status")), "Tu n'es dans aucun dépôt", "au chapitre 9, l'aide est là");
	var JS = path.join(__dirname, "..", "Web", "static", "javascript");
	var src = fs.readFileSync(path.join(JS, "ErreursGit.js"), "utf8");
	verifier(src.indexOf("—") === -1, "ErreursGit.js : pas de tiret cadratin");
	verifier(src.indexOf("CyberSup") === -1, "ErreursGit.js : Cybersup bien écrit");
	verifier(!/=>|\blet\s|\bconst\s|\bclass\s|`|\.repeat\(/.test(src), "ErreursGit.js : ES5");
	verifier(!/\beval\s*\(|new Function\s*\(/.test(src), "ErreursGit.js : ni eval ni Function");
	var chaines = src.match(/"(?:[^"\\\n]|\\.)*"/g) || [];
	verifier(!chaines.some(function(x){ return x.indexOf(" & ") > -1; }), "ErreursGit.js : pas d'esperluette dans les textes");
	var index = fs.readFileSync(path.join(__dirname, "..", "Web", "index.html"), "utf8");
	var i1 = index.indexOf("/SortsGitForge.js?v="), i2 = index.indexOf("/ErreursGit.js?v=");
	verifier(i1 > -1 && i2 > i1, "index.html charge ErreursGit.js après SortsGitForge.js");
	var v1 = /SortsGitForge\.js\?v=(\d+)/.exec(index), v2 = /ErreursGit\.js\?v=(\d+)/.exec(index);
	verifier(v1 && v2 && v1[1] === v2[1], "index.html : le même suffixe ?v=");
	// Chaque aide tient en une ou deux lignes d'écran.
	var trop = jeu.lire("REGLES_AIDES_GIT.filter(function(r){ return typeof r.aide === 'string' && r.aide.length > 200; }).map(function(r){ return r.cle; }).join(', ')");
	egal(trop, "", "les aides restent courtes");
})();

if (bavard || process.argv.indexOf("--liste") > -1) console.log("\n" + TRADUITES.join("\n"));
console.log("erreurs-git : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exitCode = 1;
