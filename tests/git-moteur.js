/**
 * Le moteur git du chapitre 9 (SortsGit.js, SortsGitCli.js, SortsGitCli2.js, SortsGitForge.js), commande par commande.
 *
 * 1. Le vrai git du bac à sable : chaque scénario de tests/git-scenarios.js est joué dans le jeu et avec le vrai git,
 *    et les sorties sont comparées ligne à ligne (si git est installé).
 * 2. Les hash : blobs, arbres, commits identiques au vrai git.
 * 3. L'API du chapitre : gitConstructeur et ses méthodes, le commiteur distinct, la signature imposée, le reflog daté,
 *    gitAjouterIndex, les fonctions de lecture.
 * 4. La taille de la sauvegarde : un pack pour le constructeur, des objets libres pour le joueur, gc, count-objects.
 * 5. Le royaume : ssh par clé (authorized_keys ou state.reseau.cles), clone, push, fetch.
 * 6. Les signatures du joueur (-S, commit.gpgsign, allowed_signers), add -p répondu question par question.
 * 7. La forge et gh : PR, revues, vérifications, protection, fusion.
 * 8. Les événements émis (type git et forge).
 * 9. La robustesse : arguments absurdes, dépôt corrompu, .git supprimé, refs écrites à la main, éditeur annulé.
 * 10. Sauvegarder puis recharger au milieu d'une fusion en conflit et d'un rebase -i arrêté.
 *
 * Lancer : node tests/git-moteur.js   (-v pour voir chaque commande)
 */
var monde = require("./monde.js");
var reel = require("./git-reel.js");
var scenarios = require("./git-scenarios.js");

var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 1500)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 1500)); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function correspond(t, re, m){ verifier(re.test(String(t)), m + " : " + re + " ne correspond pas à\n" + String(t).substring(0, 1500)); }

/* Une machine de test : le royaume (10.0.90.20), avec /srv/git. */
var ROYAUME = "var RoyaumeTest = machine('royaume', 'Le royaume (machine de test).', null);" +
	"decrireHote('royaume', { ip: '10.0.90.20', arrivee: function(){ return RoyaumeTest; } });";

function jeuNeuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {}, 4242, { avant: ROYAUME });
	jeu.lire("tousLesSorts().concat(SORTS_GIT, ['bash', 'printf', 'echo', 'cat', 'mkdir', 'cd', 'ls', 'rm', 'sed', 'chmod', 'touch', 'mv', 'cp', 'grep', 'head', 'tail', 'wc', 'test', 'tar', 'ssh-keygen', 'ssh']).forEach(function(s){ state.spells[s] = true; })");
	jeu.lire("state.env.GIT_AUTHOR_DATE = '1760000000 +0200'; state.env.GIT_COMMITTER_DATE = '1760000000 +0200'; World.fige = true;");
	// Les aides en français sous les erreurs (ErreursGit.js) ne sont pas du vrai git : coupées, le moteur est comparé seul.
	jeu.lire("AIDES_ERREURS_GIT = false;");
	jeu.lire("var EVTS = []; GameEvents.addListener('git', function(e){ EVTS.push(e); }); GameEvents.addListener('forge', function(e){ EVTS.push(e); });");
	return jeu;
}
function t(jeu, c, r){ return reel.netJeu(jeu.taper(c, r)); }
function tous(jeu, l){ return l.map(function(c){ return t(jeu, c); }).join("\n"); }
function identite(jeu){ tous(jeu, ["git config --global user.name 'Ada Test'", "git config --global user.email ada@x.fr", "git config --global init.defaultBranch main"]); }
function dernierEvt(jeu){ return jeu.lire("JSON.stringify(EVTS[EVTS.length - 1] || null, function(k, v){ return k === 'target' ? undefined : v; })"); }
function evt(jeu){ return JSON.parse(dernierEvt(jeu)); }
/* Un dépôt neuf dans ~/nom, avec un premier commit. */
function depot(jeu, nom){
	t(jeu, "cd ~"); t(jeu, "mkdir -p " + nom); t(jeu, "cd " + nom);
	tous(jeu, ["git init -q", "echo a > a", "git add a", "git commit -qm un"]);
}
/* Exécute sans laisser passer d'exception JavaScript. */
function sur(jeu, c, r){
	try { return t(jeu, c, r); }
	catch (e){ verifier(false, "exception JavaScript sur « " + c + " » : " + (e && e.stack || e)); return ""; }
}

/* ================================================================== */
/* 1. Le vrai git                                                      */
/* ================================================================== */
(function(){
	if (!reel.GIT_REEL){ console.log("(git absent : la comparaison au vrai git est sautée)"); return; }
	if (process.env.SANS_VRAI_GIT){ console.log("(SANS_VRAI_GIT : la comparaison au vrai git est sautée)"); return; }
	var identiques = 0, total = 0;
	scenarios.forEach(function(s){
		var r = reel.jouer(s.suite);
		r.forEach(function(x){
			if (x.jeu && /^EXCEPTION/.test(x.jeu)){ verifier(false, "[" + s.nom + "] exception sur " + x.ligne + "\n" + x.jeu); return; }
			if (!x.comparer) return;
			total++;
			var a = reel.normaliser(x.jeu), b = reel.normaliser(x.reel);
			if (a === b) identiques++;
			verifier(a === b, "[" + s.nom + "] $ " + x.ligne + "\n--- jeu ---\n" + a + "\n--- vrai git ---\n" + b);
		});
	});
	console.log("Vrai git : " + identiques + "/" + total + " sorties identiques");
})();

/* ================================================================== */
/* 2. Les hash                                                         */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	t(jeu, "cd ~"); t(jeu, "mkdir h"); t(jeu, "cd h"); t(jeu, "git init -q");
	t(jeu, "printf 'hello\\n' > f");
	egal(t(jeu, "git hash-object f"), "ce013625030ba8dba906f756967f9e9ca394464a", "le hash du blob « hello » est celui du vrai git");
	egal(t(jeu, "printf '' > vide; git hash-object vide"), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391", "le blob vide");
	t(jeu, "git add f");
	t(jeu, "git commit -qm premier");
	egal(t(jeu, "git rev-parse HEAD^{tree}"), "10731d0b170b98481a00bdca161e874e0ab93377", "l'arbre d'un fichier « hello » nommé f");
	egal(jeu.lire("gHashObjet('tree', [])"), "4b825dc642cb6eb9a060e54bf8d69288fbee4904", "l'arbre vide");
	egal(jeu.lire("gSha1(gUtf8('abc'))"), "a9993e364706816aba3e25717850c26c9cd0d89d", "SHA-1 de abc");
	egal(jeu.lire("gSha1(gUtf8(''))"), "da39a3ee5e6b4b0d3255bfef95601890afd80709", "SHA-1 vide");
	egal(jeu.lire("gUtf8('é').length"), 2, "é fait deux octets en UTF-8");
	egal(t(jeu, "git cat-file -t HEAD"), "commit", "cat-file -t");
	egal(t(jeu, "git cat-file -s f 2>&1 | head -1").length > 0, true, "cat-file -s répond");
	contient(t(jeu, "git cat-file -p HEAD"), "tree 10731d0b170b98481a00bdca161e874e0ab93377", "le commit pointe sur l'arbre");
	contient(t(jeu, "git cat-file -p HEAD"), "author Ada Test <ada@x.fr> 1760000000 +0200", "la ligne author du commit");
})();

/* ================================================================== */
/* 3. L'API du chapitre : le constructeur                              */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	var JOUEUR = jeu.lire("JOUEUR");
	var h1 = jeu.lire("(function(){ var g = gitConstructeur(null, '~/chronotheque/chronique', { branche: 'main' });" +
		"var a = g.commit({ auteur: { nom: 'Aube', mail: 'aube@chronique.lan' }, date: 1700000000, message: 'Le premier jour', fichiers: { 'livre.txt': 'Au commencement.\\n', 'carte.txt': 'nord\\n' } });" +
		"var b = g.commit({ auteur: { nom: 'Brume', mail: 'brume@chronique.lan' }, date: 1700003600, message: 'Le deuxieme jour', fichiers: { 'livre.txt': 'Au commencement.\\nPuis la brume.\\n' } });" +
		"g.branche('ombre'); g.basculer('ombre');" +
		"var c = g.commit({ auteur: { nom: 'Ombre', mail: 'ombre@chronique.lan' }, date: 1700007200, message: 'Le jour de l ombre', fichiers: { 'secret.txt': 'cache\\n', 'carte.txt': null } });" +
		"g.basculer('main');" +
		"var d = g.commit({ auteur: { nom: 'Aube', mail: 'aube@chronique.lan' }, committer: { nom: 'Gardien', mail: 'gardien@chronique.lan', date: 1700020000 }, date: 1700010800, message: 'Le troisieme jour', fichiers: { 'livre.txt': 'Au commencement.\\nPuis la brume.\\nPuis le gardien.\\n' } });" +
		"var e = g.commit({ auteur: { nom: 'Faussaire', mail: 'faux@chronique.lan' }, date: 1700014400, message: 'Signe', signer: { cle: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFAUSSAIREFAUSSAIREFAUSSAIREFAUSSAIREFAUSSAIRE faux@chronique', empreinte: 'SHA256:ImposeeParLeChapitre0123456789abcdefABCDEFghij' }, fichiers: { 'faux.txt': 'x\\n' } });" +
		"g.tag('v1', a, { annote: true, message: 'Premiere version', auteur: { nom: 'Aube', mail: 'aube@chronique.lan' }, date: 1700000100 });" +
		"g.tag('leger', b);" +
		"g.supprimerBranche('ombre');" +
		"g.config('core.editor', 'nano'); g.config('gpg.ssh.allowedSignersFile', '.git/allowed_signers'); gEcrire(g.R.git, 'allowed_signers', 'gardien@chronique.lan ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGardienGardienGardienGardienGardienGardien00\\n');" +
		"g.extraire();" +
		"return JSON.stringify({ a: a, b: b, c: c, d: d, e: e }); })()");
	var H = JSON.parse(h1);
	correspond(H.a, /^[0-9a-f]{40}$/, "g.commit renvoie un hash complet");
	t(jeu, "cd ~/chronotheque/chronique");
	egal(t(jeu, "git rev-parse HEAD"), H.e, "HEAD est le dernier commit du constructeur");
	egal(t(jeu, "git status"), "On branch main\nnothing to commit, working tree clean", "extraire : copie de travail et index posés");
	egal(t(jeu, "cat livre.txt"), "Au commencement.\nPuis la brume.\nPuis le gardien.", "g.commit garde les fichiers non cités et applique les changements");
	egal(t(jeu, "cat carte.txt"), "nord", "le fichier supprimé sur ombre reste sur main");
	contient(t(jeu, "git log --format='%an %ad' --date=raw"), "Aube 1700000000 +0200", "la date donnée au commit");
	contient(t(jeu, "git cat-file -p " + H.d), "author Aube <aube@chronique.lan> 1700010800 +0200\ncommitter Gardien <gardien@chronique.lan> 1700020000 +0200", "le commiteur distinct dans cat-file -p");
	var fuller = t(jeu, "git log --format=fuller -1 " + H.d);
	contient(fuller, "Author:     Aube <aube@chronique.lan>", "fuller : l'auteur");
	contient(fuller, "Commit:     Gardien <gardien@chronique.lan>", "fuller : le commiteur");
	var sig = t(jeu, "git log --show-signature -1 " + H.e);
	contient(sig, "Good \"git\" signature with ED25519 key SHA256:ImposeeParLeChapitre0123456789abcdefABCDEFghij\nNo principal matched.", "--show-signature cite exactement l'empreinte imposée");
	var lu = JSON.parse(jeu.lire("JSON.stringify(gitCommitLu(null, '~/chronotheque/chronique', '" + H.e + "'))"));
	egal(lu.signature.empreinte, "SHA256:ImposeeParLeChapitre0123456789abcdefABCDEFghij", "gitCommitLu : l'empreinte");
	egal(lu.signature.verification, "inconnue", "gitCommitLu : vérification inconnue sans allowed_signers");
	correspond(lu.signature.cle, /^ssh-ed25519 AAAA/, "gitCommitLu : la clé");
	egal(JSON.parse(jeu.lire("JSON.stringify(gitCommitLu(null, '~/chronotheque/chronique', '" + H.d + "'))")).signature, null, "un commit sans signature");
	egal(jeu.lire("gitCommitLu(null, '~/chronotheque/chronique', '" + H.d + "').commiteur"), "Gardien", "gitCommitLu : le commiteur");
	// Une empreinte donnée sans préfixe.
	jeu.lire("(function(){ var g = gitConstructeur(null, '~/chronotheque/sans', {}); g.config('gpg.ssh.allowedSignersFile', '~/.ssh/allowed_signers'); gEcrire(Home, '.ssh/allowed_signers', ''); g.commit({ message: 'x', fichiers: { x: '1' }, signer: { cle: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBBBB b@b', empreinte: 'NuSansPrefixe' } }); g.extraire(); })()");
	t(jeu, "cd ~/chronotheque/sans");
	contient(t(jeu, "git log --show-signature -1"), "Good \"git\" signature with ED25519 key SHA256:NuSansPrefixe", "empreinte imposée sans préfixe");
	t(jeu, "cd ~/chronotheque/chronique");
	// Les branches, les tags, le reflog.
	egal(t(jeu, "git branch"), "* main", "supprimerBranche : la branche ombre a disparu");
	contient(t(jeu, "git cat-file -p v1"), "tag v1\ntagger Aube <aube@chronique.lan> 1700000100 +0200\n\nPremiere version", "le tag annoté");
	egal(t(jeu, "git rev-parse leger"), H.b, "le tag léger");
	var rf = t(jeu, "git reflog");
	contient(rf, "HEAD@{0}: commit: Signe", "reflog : le dernier commit");
	contient(rf, "checkout: moving from ombre to main", "reflog : le retour sur main");
	contient(rf, "checkout: moving from main to ombre", "reflog : le départ sur ombre");
	contient(rf, "commit (initial): Le premier jour", "reflog : le commit initial");
	contient(t(jeu, "git reflog --date=raw"), "1700000000 +0200", "reflog daté par les dates données");
	contient(t(jeu, "cat .git/logs/HEAD"), "Aube <aube@chronique.lan> 1700000000 +0200\tcommit (initial): Le premier jour", "le format réel du reflog");
	egal(t(jeu, "git config core.editor"), "nano", "g.config");
	// resetDur : une entrée de reflog « reset ».
	jeu.lire("(function(){ var g = gitConstructeur(null, '~/chronotheque/chronique'); g.resetDur('HEAD~1', { auteur: { nom: 'Gardien', mail: 'g@c' }, date: 1700030000 }); g.extraire(); })()");
	egal(t(jeu, "git rev-parse HEAD"), H.d, "resetDur recule HEAD");
	contient(t(jeu, "git reflog -1"), "HEAD@{0}: reset: moving to HEAD~1", "resetDur écrit l'entrée de reflog");
	contient(t(jeu, "cat .git/logs/HEAD"), "Gardien <g@c> 1700030000 +0200\treset: moving to HEAD~1", "resetDur date l'entrée");
	egal(t(jeu, "cat .git/ORIG_HEAD"), H.e, "resetDur pose ORIG_HEAD");
	// gitAjouterIndex.
	t(jeu, "echo nouveau > ajoute.txt");
	egal(jeu.lire("gitAjouterIndex(null, '~/chronotheque/chronique', 'ajoute.txt')"), true, "gitAjouterIndex répond vrai");
	egal(t(jeu, "git status -s"), "A  ajoute.txt", "gitAjouterIndex : le fichier est indexé");
	// Les fonctions de lecture.
	egal(jeu.lire("gitResoudre(null, '~/chronotheque/chronique', 'v1')"), jeu.lire("gitResoudre(null, '~/chronotheque/chronique', 'v1')"), "gitResoudre");
	egal(jeu.lire("gitResoudre(null, '~/chronotheque/chronique', 'v1^{commit}')"), H.a, "gitResoudre v1^{commit}");
	egal(jeu.lire("gitResoudre(null, '~/chronotheque/chronique', 'nope')"), null, "gitResoudre d'une révision inconnue");
	egal(jeu.lire("gitHistorique(null, '~/chronotheque/chronique', 'HEAD').length"), 3, "gitHistorique");
	egal(jeu.lire("Object.keys(gitBranches(null, '~/chronotheque/chronique')).join(',')"), "main", "gitBranches");
	egal(jeu.lire("Object.keys(gitTags(null, '~/chronotheque/chronique')).sort().join(',')"), "leger,v1", "gitTags");
	egal(jeu.lire("gitStatut(null, '~/chronotheque/chronique').indexees.length"), 1, "gitStatut");
	egal(jeu.lire("gitFichierA(null, '~/chronotheque/chronique', '" + H.b + "', 'livre.txt')"), "Au commencement.\nPuis la brume.\n", "gitFichierA");
	egal(jeu.lire("gitEstAncetre(null, '~/chronotheque/chronique', '" + H.a + "', 'HEAD')"), true, "gitEstAncetre");
	egal(jeu.lire("gitEstAncetre(null, '~/chronotheque/chronique', 'HEAD', '" + H.a + "')"), false, "gitEstAncetre inverse");
	egal(jeu.lire("gitReflog(null, '~/chronotheque/chronique')[0].message"), "reset: moving to HEAD~1", "gitReflog");
	egal(jeu.lire("gitConfigLue(null, '~/chronotheque/chronique', 'core.editor')"), "nano", "gitConfigLue");
	t(jeu, "echo secret > .env"); t(jeu, "echo .env > .gitignore");
	egal(jeu.lire("gitIgnore(null, '~/chronotheque/chronique', '.env')"), true, "gitIgnore");
	contient(jeu.lire("gitDiffTexte(null, '~/chronotheque/chronique', '" + H.a + "', '" + H.b + "')"), "+Puis la brume.", "gitDiffTexte");
	egal(jeu.lire("gitDepot(null, '~/nulle-part')"), null, "gitDepot d'un chemin absent");
	// Un dépôt nu et pousser.
	jeu.lire("(function(){ var n = gitConstructeur('royaume', '/srv/git/chronique.git', { nu: true }); n.fin();" +
		"var g = gitConstructeur(null, '~/chronotheque/chronique'); g.remote('origin', 'royaume:/srv/git/chronique.git'); g.pousser('origin', 'main'); })()");
	egal(t(jeu, "git rev-parse origin/main"), H.d, "pousser pose refs/remotes/origin/main");
	egal(t(jeu, "git config branch.main.remote"), "origin", "pousser pose l'amont");
	egal(jeu.lire("gitResoudre('royaume', '/srv/git/chronique.git', 'main')"), H.d, "pousser écrit la branche du dépôt nu");
	egal(jeu.lire("gitDepot('royaume', '/srv/git/chronique.git').nu"), true, "le dépôt du royaume est nu");
	contient(t(jeu, "git status"), "Your branch is up to date with 'origin/main'.", "status voit l'amont");
	// L'horloge du chapitre.
	egal(jeu.lire("typeof gitMaintenant"), "function", "gitMaintenant existe");
	jeu.lire("var gitMaintenantAvant = gitMaintenant; gitMaintenant = function(h){ return h === null ? 1800000000000 : 1; }; delete state.env.GIT_AUTHOR_DATE; delete state.env.GIT_COMMITTER_DATE;");
	t(jeu, "git commit -qm horloge");
	contient(t(jeu, "git log -1 --format=%at"), "1800000000", "gitMaintenant(null) date les commits de l'île");
	jeu.lire("gitMaintenant = gitMaintenantAvant;");
})();

/* ================================================================== */
/* 4. La taille de la sauvegarde                                       */
/* ================================================================== */
(function(){
	var stockage = {};
	var jeu = jeuNeuf(stockage);
	identite(jeu);
	jeu.lire("state.save()");
	var avant = JSON.stringify(stockage).length;
	jeu.lire("(function(){ var g = gitConstructeur(null, '~/chronotheque/grande', {}); var noms = ['livre', 'carte', 'regles', 'heros', 'lieux', 'dates', 'notes', 'index'];" +
		"for (var i = 0; i < 64; i++){ var f = {}; f[noms[i % 8] + '.txt'] = 'Chapitre ' + i + ' de la chronique : ' + new Array(4).join('le temps passe, la chronique grandit. ') + '\\n'; f['copie-' + (i % 3) + '.txt'] = 'Le meme texte partout.\\n'; g.commit({ date: 1700000000 + i * 3600, message: 'Entree ' + i, fichiers: f }); }" +
		"g.extraire(); })()");
	var R = "gitDepot(null, '~/chronotheque/grande')";
	egal(jeu.lire("gitHistorique(null, '~/chronotheque/grande').length"), 64, "64 commits");
	egal(jeu.lire("(function(){ var o = gTousObjets(" + R + "); return Object.keys(o).filter(function(k){ return o[k].loose; }).length; })()"), 0, "le constructeur n'écrit aucun objet libre");
	egal(jeu.lire("gDossier(" + R + ".git, 'objects/pack', false).items.filter(function(it){ return it.gitPack; }).length"), 1, "le constructeur écrit un seul pack");
	// Les blobs identiques ne sont stockés qu'une fois.
	var nbBlobs = jeu.lire("(function(){ var p = gPacks(" + R + ")[0].gitPack.o; var n = 0; Object.keys(p).forEach(function(k){ if (p[k][0] === 'blob' && p[k][1] === 'Le meme texte partout.\\n') n++; }); return n; })()");
	egal(nbBlobs, 1, "un blob identique dans trois fichiers est stocké une fois");
	jeu.lire("state.save()");
	var apres = JSON.stringify(stockage).length;
	console.log("Sauvegarde d'un dépôt de 64 commits : " + (apres - avant) + " octets");
	verifier(apres - avant < 60000, "la sauvegarde d'un dépôt de 64 commits pèse moins de 60 Ko (" + (apres - avant) + ")");
	t(jeu, "cd ~/chronotheque/grande");
	var co = t(jeu, "git count-objects -v");
	contient(co, "count: 0", "count-objects : aucun objet libre");
	contient(co, "packs: 1", "count-objects : un pack");
	correspond(co, /in-pack: \d{3}/, "count-objects : les objets du pack");
	tous(jeu, ["echo neuf > neuf.txt", "git add neuf.txt", "git commit -qm neuf"]);
	contient(t(jeu, "git count-objects -v"), "count: 3", "count-objects : le commit du joueur écrit trois objets libres (blob, arbre, commit)");
	contient(t(jeu, "git count-objects"), "3 objects", "count-objects sans -v");
	t(jeu, "git gc -q");
	var co2 = t(jeu, "git count-objects -v");
	contient(co2, "count: 0", "gc range les objets libres");
	contient(co2, "packs: 1", "gc ne laisse qu'un pack");
	absent(t(jeu, "git fsck"), "missing", "fsck : rien à redire après gc"); absent(t(jeu, "git fsck"), "dangling", "fsck : rien de pendant après gc");
	egal(t(jeu, "git log --oneline | wc -l"), "65", "l'historique est intact après gc");
	// Le dépôt survit à la sauvegarde.
	jeu.lire("state.save()");
	var jeu2 = jeuNeuf(stockage);
	t(jeu2, "cd ~/chronotheque/grande");
	egal(t(jeu2, "git log --oneline | wc -l"), "65", "après rechargement : 65 commits");
	egal(t(jeu2, "git status -s"), "", "après rechargement : la copie de travail est propre");
	egal(t(jeu2, "git fsck"), "Checking object directories: 100% (256/256), done.", "après rechargement : fsck propre");
})();

/* ================================================================== */
/* 5. Le royaume : ssh par clé                                         */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	var J = jeu.lire("JOUEUR");
	jeu.lire("(function(){ var g = gitConstructeur('royaume', '/srv/git/chronique.git', { nu: true }); g.commit({ message: 'Fondation', fichiers: { 'LISEZMOI': 'Le royaume.\\n' } }); g.fin(); })()");
	t(jeu, "cd ~");
	var refus = t(jeu, "git clone royaume:/srv/git/chronique.git");
	contient(refus, J + "@royaume: Permission denied (publickey).", "sans clé : refusé");
	contient(refus, "fatal: Could not read from remote repository.", "sans clé : le message du vrai");
	contient(t(jeu, "git clone inconnu:/x.git"), "ssh: Could not resolve hostname inconnu", "une machine inconnue");
	// Une clé, mais pas autorisée.
	var CLE = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJoueurDeTestJoueurDeTestJoueurDeTest00 " + J + "@ile";
	jeu.lire("gEcrire(Home, '.ssh/id_ed25519', '-----BEGIN OPENSSH PRIVATE KEY-----\\nsecret\\n-----END OPENSSH PRIVATE KEY-----\\n', { owner: JOUEUR }); gEcrire(Home, '.ssh/id_ed25519.pub', " + JSON.stringify(CLE + "\n") + ", { owner: JOUEUR });");
	contient(t(jeu, "git clone royaume:/srv/git/chronique.git"), "Permission denied (publickey)", "clé non autorisée : refusé");
	// Autorisée par state.reseau.cles.
	jeu.lire("state.reseau = state.reseau || {}; state.reseau.cles = state.reseau.cles || {}; state.reseau.cles.royaume = " + JSON.stringify(CLE) + ";");
	var cl = t(jeu, "git clone royaume:/srv/git/chronique.git");
	contient(cl, "Cloning into 'chronique'...", "clé dans state.reseau.cles : clone");
	egal(t(jeu, "cat chronique/LISEZMOI"), "Le royaume.", "le clone a extrait les fichiers");
	t(jeu, "cd chronique");
	egal(t(jeu, "git remote -v"), "origin\troyaume:/srv/git/chronique.git (fetch)\norigin\troyaume:/srv/git/chronique.git (push)", "remote -v");
	tous(jeu, ["echo chant > chant.txt", "git add chant.txt", "git commit -qm chant"]);
	var p = t(jeu, "git push");
	contient(p, "To royaume:/srv/git/chronique.git", "push par ssh");
	correspond(p, /   [0-9a-f]{7}\.\.[0-9a-f]{7}  main -> main/, "push : la ligne de mise à jour");
	egal(jeu.lire("gitResoudre('royaume', '/srv/git/chronique.git', 'main')"), t(jeu, "git rev-parse HEAD"), "le royaume a reçu le commit");
	// Autorisée par authorized_keys (le chemin ssh://).
	jeu.lire("delete state.reseau.cles.royaume; creerDossierHote('royaume', '/home/" + J + "/.ssh'); poserFichierHote('royaume', '/home/" + J + "/.ssh/authorized_keys', " + JSON.stringify(CLE + "\n") + ");");
	t(jeu, "cd ~");
	contient(t(jeu, "git clone ssh://royaume/srv/git/chronique.git autre"), "Cloning into 'autre'...", "authorized_keys : clone par ssh://");
	contient(t(jeu, "git ls-remote royaume:/srv/git/chronique.git"), "refs/heads/main", "ls-remote");
	jeu.lire("poserFichierHote('royaume', '/home/" + J + "/.ssh/authorized_keys', '')");
	t(jeu, "cd ~/chronique");
	contient(t(jeu, "git fetch"), "Permission denied (publickey)", "la clé retirée : fetch refusé");
	// gitAccesSsh peut trancher.
	jeu.lire("gitAccesSsh = function(h, u, cles){ return h === 'royaume' ? true : undefined; }");
	egal(t(jeu, "git fetch"), "", "gitAccesSsh autorise");
	jeu.lire("gitAccesSsh = undefined");
	contient(t(jeu, "git clone royaume:/srv/git/absent.git"), "Permission denied", "toujours refusé sans clé");
	jeu.lire("state.reseau.cles.royaume = " + JSON.stringify(CLE));
	contient(t(jeu, "cd ~; git clone royaume:/srv/git/absent.git"), "fatal: '/srv/git/absent.git' does not appear to be a git repository", "un dépôt absent du royaume");
	// Un dépôt local par chemin.
	t(jeu, "cd ~");
	tous(jeu, ["git init -q --bare local.git", "git clone -q local.git l1"]);
	contient(t(jeu, "cd l1; git remote get-url origin"), "local.git", "un remote local par chemin");
})();

/* ================================================================== */
/* 6. Signatures du joueur, add -p                                     */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	var J = jeu.lire("JOUEUR");
	depot(jeu, "signe");
	contient(t(jeu, "git commit --allow-empty -S -m s"), "gpg failed to sign the data", "-S sans gpg.format ssh : l'erreur de gpg");
	t(jeu, "git config gpg.format ssh");
	contient(t(jeu, "git commit --allow-empty -S -m s"), "user.signingKey needs to be set for ssh signing", "-S sans user.signingkey");
	t(jeu, "git config user.signingkey ~/.ssh/id_ed25519.pub");
	contient(t(jeu, "git commit --allow-empty -S -m s"), "Couldn't load public key", "-S sans le fichier de clé");
	var CLE = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAISigneParLeJoueurSigneParLeJoueurSigneP " + J + "@ile";
	jeu.lire("gEcrire(Home, '.ssh/id_ed25519.pub', " + JSON.stringify(CLE + "\n") + ", { owner: JOUEUR });");
	contient(t(jeu, "git commit --allow-empty -S -m s"), "Load key", "-S sans la clé privée");
	jeu.lire("gEcrire(Home, '.ssh/id_ed25519', 'prive\\n', { owner: JOUEUR });");
	egal(t(jeu, "git commit -q --allow-empty -S -m signe"), "", "-S signe");
	contient(t(jeu, "git cat-file -p HEAD"), "gpgsig -----BEGIN SSH SIGNATURE-----", "l'en-tête gpgsig");
	contient(t(jeu, "git log --show-signature -1"), "error: gpg.ssh.allowedSignersFile needs to be configured and exist for ssh signature verification", "sans allowed_signers");
	var emp = t(jeu, "ssh-keygen -lf ~/.ssh/id_ed25519.pub");
	var fp = (/(SHA256:\S+)/.exec(emp) || [])[1];
	verifier(!!fp, "ssh-keygen -lf donne une empreinte : " + emp);
	t(jeu, "echo 'ada@x.fr " + CLE + "' > ~/.ssh/allowed_signers");
	t(jeu, "git config gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers");
	egal(t(jeu, "git log --show-signature -1 --format=%s").split("\n")[0], "Good \"git\" signature for ada@x.fr with ED25519 key " + fp, "bonne signature : l'empreinte est celle de ssh-keygen -lf");
	egal(t(jeu, "git log -1 --format=%G?"), "G", "%G? vaut G");
	egal(jeu.lire("gitCommitLu(null, '~/signe', 'HEAD').signature.verification"), "bonne", "gitCommitLu : bonne");
	egal(jeu.lire("gitCommitLu(null, '~/signe', 'HEAD').signature.empreinte"), fp, "gitCommitLu : l'empreinte de la clé du joueur");
	contient(t(jeu, "git verify-commit HEAD"), "Good \"git\" signature for ada@x.fr", "verify-commit");
	// Un tag signé (-s) : la cire suit le message dans l'objet tag ; verify-tag et tag -v la vérifient.
	egal(t(jeu, "git tag -s v1.0.0 -m 'version signée'"), "", "tag -s");
	var objTag = t(jeu, "git cat-file -p v1.0.0");
	contient(objTag, "version signée\n-----BEGIN SSH SIGNATURE-----", "tag -s : la signature suit le message");
	egal(t(jeu, "git cat-file -t v1.0.0"), "tag", "tag -s : un objet tag");
	egal(t(jeu, "git verify-tag v1.0.0"), "Good \"git\" signature for ada@x.fr with ED25519 key " + fp, "verify-tag : la bonne cire, et l'empreinte de ssh-keygen -lf");
	var tv = t(jeu, "git tag -v v1.0.0");
	verifier(/^object [0-9a-f]{40}\ntype commit\ntag v1\.0\.0\ntagger Ada Test <ada@x\.fr> \d+ \+0200\n\nversion signée\nGood "git" signature for ada@x\.fr/.test(tv), "tag -v : le tag sans sa cire, puis le verdict : " + tv);
	egal(evt(jeu).signature, "bonne", "tag -v : l'événement verify-tag dit bonne");
	t(jeu, "git tag -a v1.0.1 -m 'non signée'");
	contient(t(jeu, "git verify-tag v1.0.1"), "error: no signature found", "verify-tag d'un tag annoté non signé");
	jeu.lire("(function(){ var R = gitDepot(null, '~/signe'); var h = gRef(R, 'refs/tags/v1.0.0'); var o = gObjet(R, h); var h2 = gObjetEcrire(R, 'tag', o.c.replace('version signée', 'version trafiquée')); gEcrire(gCommun(R), 'refs/tags/v1.0.0', h2 + '\\n'); })()");
	contient(t(jeu, "git verify-tag v1.0.0"), "Could not verify signature.", "verify-tag d'un tag trafiqué");
	t(jeu, "git config gpg.format openpgp");
	contient(t(jeu, "git tag -s v2 -m x"), "error: unable to sign the tag", "tag -s sans gpg.format ssh : refusé");
	t(jeu, "git config gpg.format ssh");
	t(jeu, "git config commit.gpgsign true");
	t(jeu, "git commit -q --allow-empty -m auto");
	egal(t(jeu, "git log -1 --format=%G?"), "G", "commit.gpgsign signe sans -S");
	egal(t(jeu, "git log -1 --format=%G? HEAD~2"), "N", "un commit non signé");
	// Un commit signé puis falsifié.
	jeu.lire("(function(){ var R = gitDepot(null, '~/signe'); var h = gTete(R); var o = gObjet(R, h); var nv = o.c.replace('auto', 'autre'); var h2 = gObjetEcrire(R, 'commit', nv); gRefEcrire(R, 'HEAD', h2, 'falsifie'); })()");
	egal(t(jeu, "git log -1 --format=%G?"), "B", "une signature falsifiée vaut B");
	contient(t(jeu, "git verify-commit HEAD"), "Could not verify signature.", "verify-commit d'un faux");
	egal(jeu.lire("gitCommitLu(null, '~/signe', 'HEAD').signature.verification"), "mauvaise", "gitCommitLu : mauvaise");
	t(jeu, "git config commit.gpgsign false");

	// add -p : une question par hunk, répondue par le test.
	depot(jeu, "patch");
	t(jeu, "printf '1\\n2\\n3\\n4\\n5\\n6\\n7\\n8\\n9\\n10\\n11\\n12\\n' > n"); t(jeu, "git add n"); t(jeu, "git commit -qm n");
	t(jeu, "printf 'UN\\n2\\n3\\n4\\n5\\n6\\n7\\n8\\n9\\n10\\n11\\nDOUZE\\n' > n");
	var s = t(jeu, "git add -p", ["y", "n"]);
	contient(s, "(1/2) Stage this hunk [y,n,q,a,d,j,J,e,?]?", "add -p : la première question");
	contient(s, "(2/2) Stage this hunk [y,n,q,a,d,e,?]?", "add -p : la seconde question");
	contient(s, "-1\n+UN", "add -p montre le hunk");
	egal(t(jeu, "git diff --cached --stat").split("\n")[0].trim(), "n | 2 +-", "add -p : le premier hunk seul est indexé");
	contient(t(jeu, "git diff"), "+DOUZE", "add -p : le second reste dans la copie de travail");
	t(jeu, "git reset -q");
	t(jeu, "git add -p", ["q"]);
	egal(t(jeu, "git diff --cached"), "", "add -p : q n'indexe rien");
	t(jeu, "git add -p", ["a"]);
	egal(t(jeu, "git diff"), "", "add -p : a indexe tout");
	t(jeu, "git reset -q");
	t(jeu, "git add -p", ["n", "y"]);
	contient(t(jeu, "git diff --cached"), "+DOUZE", "add -p : n puis y");
	absent(t(jeu, "git diff --cached"), "+UN", "add -p : n puis y, le premier reste");
	t(jeu, "git reset -q");
	t(jeu, "git add -p", ["zut", "y", "y"]);
	contient(t(jeu, "git diff --cached"), "+DOUZE", "add -p : une réponse absurde fait reposer la question");

	// restore -p : à l'écran, une question par hunk ; y rend au fichier la version de l'index.
	t(jeu, "git reset -q");
	var r = t(jeu, "git restore -p n", ["y", "n"]);
	var ev = evt(jeu);
	contient(r, "(1/2) Discard this hunk from worktree [y,n,q,a,d,j,J,g,/,e,?]?", "restore -p : la première question, comme le vrai");
	contient(r, "(2/2) Discard this hunk from worktree [y,n,q,a,d,K,g,/,e,?]?", "restore -p : la seconde question");
	egal(t(jeu, "head -1 n"), "1", "restore -p : le premier hunk est défait");
	contient(t(jeu, "git diff"), "+DOUZE", "restore -p : le second reste");
	verifier(ev.cmd === "restore" && ev.patch === true && ev.jetes === 1, "restore -p : l'événement (patch, un morceau jeté) : " + JSON.stringify(ev));
	t(jeu, "git restore -p n", ["q"]);
	contient(t(jeu, "git diff"), "+DOUZE", "restore -p : q ne défait rien");
	t(jeu, "git restore -p n", []);
	contient(t(jeu, "git diff"), "+DOUZE", "restore -p sans réponse : rien n'est défait, et la question ne tourne pas sans fin");
	t(jeu, "git restore -p n", ["y"]);
	egal(t(jeu, "git status -s"), "", "restore -p : y défait le dernier morceau");
})();

/* ================================================================== */
/* 7. La forge et gh                                                   */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	jeu.lire("(function(){ var g = gitConstructeur('royaume', '/srv/git/chronique.git', { nu: true }); g.commit({ message: 'Fondation', fichiers: { 'LISEZMOI': 'Le royaume.\\n' } }); g.fin(); })()");
	jeu.lire("state.reseau = state.reseau || {}; state.reseau.cles = { royaume: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIForgeForgeForgeForgeForgeForgeForgeForge00 x@y' };" +
		"gEcrire(Home, '.ssh/id_ed25519', 'prive\\n', { owner: JOUEUR }); gEcrire(Home, '.ssh/id_ed25519.pub', state.reseau.cles.royaume + '\\n', { owner: JOUEUR });");
	t(jeu, "cd ~"); t(jeu, "git clone -q royaume:/srv/git/chronique.git chronique"); t(jeu, "cd chronique");
	contient(t(jeu, "gh auth status"), "Logged in to royaume", "gh auth status");
	contient(t(jeu, "gh repo view"), "cybersup/chronique", "gh repo view");
	egal(t(jeu, "gh pr list"), "no open pull requests in cybersup/chronique", "aucune PR");
	jeu.lire("forgeProteger('royaume', '/srv/git/chronique.git', 'main', { pr: true, revues: 1, verifications: ['tests'] })");
	tous(jeu, ["echo direct >> LISEZMOI", "git commit -qam direct"]);
	var p = t(jeu, "git push");
	contient(p, "remote: error: GH006: Protected branch update failed for refs/heads/main.", "la branche protégée refuse le push direct");
	contient(p, "! [remote rejected] main -> main (protected branch hook declined)", "push refusé : la ligne du vrai");
	tous(jeu, ["git reset -q --hard origin/main", "git switch -qc chant", "echo chant > chant.txt", "git add chant.txt", "git commit -qm 'Ajoute le chant'", "git push -q -u origin chant"]);
	jeu.lire("forgeVerifications = function(D, pr){ return [{ nom: 'tests', etat: pr.titre.indexOf('casse') > -1 ? 'failure' : 'success', details: 'ok' }]; }");
	var cr = t(jeu, "gh pr create --title 'Ajoute le chant' --body 'Un chant pour le royaume' --base main");
	contient(cr, "https://royaume/cybersup/chronique/pull/1", "gh pr create renvoie l'URL");
	contient(t(jeu, "gh pr list"), "Ajoute le chant", "gh pr list");
	contient(t(jeu, "gh pr view 1"), "Un chant pour le royaume", "gh pr view");
	contient(t(jeu, "gh pr checks 1"), "tests", "gh pr checks");
	contient(t(jeu, "gh pr diff 1"), "+chant", "gh pr diff");
	contient(t(jeu, "gh pr merge 1 --merge"), "review", "fusion refusée sans revue approuvée");
	jeu.lire("forgeRevue('royaume', '/srv/git/chronique.git', 1, { auteur: 'gardienne', etat: 'APPROVED', corps: 'Bien.' })");
	var m = t(jeu, "gh pr merge 1 --squash --delete-branch");
	contient(m, "Squashed and merged pull request #1", "gh pr merge --squash");
	egal(jeu.lire("forgeEtat('royaume', '/srv/git/chronique.git').prs[0].etat"), "MERGED", "la PR est fusionnée");
	egal(jeu.lire("gitFichierA('royaume', '/srv/git/chronique.git', 'main', 'chant.txt')"), "chant\n", "le squash est sur main du royaume");
	t(jeu, "git switch -q main"); t(jeu, "git pull -q");
	egal(t(jeu, "cat chant.txt"), "chant", "pull ramène la fusion");
	var n2 = jeu.lire("forgeCreerPR('royaume', '/srv/git/chronique.git', { titre: 'casse tout', auteur: 'saboteur', base: 'main', tete: 'main' })");
	egal(n2, 2, "forgeCreerPR numérote");
	contient(t(jeu, "gh pr checks 2"), "fail", "gh pr checks : un échec");
	contient(t(jeu, "gh pr close 2"), "Closed pull request #2", "gh pr close");
	contient(t(jeu, "gh pr view 99"), "GraphQL: Could not resolve to a PullRequest with the number of 99.", "une PR inconnue");
	contient(t(jeu, "gh frobnicate"), "unknown command", "gh : une commande inconnue");
	var e = evt(jeu);
	egal(e.type, "forge", "l'événement de gh est de type forge");
})();

/* ================================================================== */
/* 8. Les événements                                                   */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	depot(jeu, "evts");
	var e = evt(jeu);
	egal(e.type, "git", "type git");
	egal(e.cmd, "commit", "cmd commit");
	egal(e.ok, true, "ok vrai");
	egal(e.code, 0, "code 0");
	correspond(e.hash, /^[0-9a-f]{40}$/, "commit : le hash dans l'événement");
	correspond(e.depot, /evts/, "le dépôt dans l'événement");
	t(jeu, "git frobnicate");
	t(jeu, "git switch -c nouvelle");
	e = evt(jeu); egal(e.cmd, "switch", "cmd switch"); egal(e.ok, true, "switch ok");
	t(jeu, "git switch absente");
	e = evt(jeu); egal(e.ok, false, "switch vers une branche absente : ok faux"); egal(e.code, 128, "code 128");
	t(jeu, "git log --oneline");
	e = evt(jeu); egal(e.cmd, "log", "cmd log"); egal(e.oneline, true, "log : oneline"); egal(e.nombre, 1, "log : nombre");
	t(jeu, "git status");
	egal(evt(jeu).cmd, "status", "cmd status");
	t(jeu, "git stash -u");
	egal(evt(jeu).cmd, "stash", "cmd stash");
	t(jeu, "git tag v1");
	e = evt(jeu); egal(e.cmd, "tag", "cmd tag"); egal(e.tag, "v1", "tag : le nom");
	t(jeu, "echo x > x; git add x; git commit -qm x; git switch -q main; git merge -q nouvelle");
	e = evt(jeu); egal(e.cmd, "merge", "cmd merge"); egal(e.mode, "ff", "merge : avance rapide");
	egal(jeu.lire("EVTS.filter(function(e){ return e.type === 'git'; }).every(function(e){ return typeof e.args === 'object' && 'hote' in e && 'depot' in e && 'code' in e; })"), true, "chaque événement porte args, hote, depot et code");
})();

/* ================================================================== */
/* 9. La robustesse                                                    */
/* ================================================================== */
(function(){
	var jeu = jeuNeuf();
	identite(jeu);
	t(jeu, "cd ~");
	contient(sur(jeu, "git status"), "fatal: not a git repository (or any of the parent directories): .git", "hors d'un dépôt");
	egal(jeu.lire("Shell.statut"), 128, "hors d'un dépôt : code 128");
	depot(jeu, "robuste");
	var absurdes = ["git", "git --", "git -", "git ''", "git -C", "git -C /nulle/part status", "git -c", "git -c x status", "git log -n", "git log -n abc", "git log --format", "git log ---", "git log -- -- --",
		"git commit", "git commit -m", "git commit -F nope", "git add -", "git add ''", "git rm", "git mv", "git mv a", "git mv a a", "git branch -d", "git branch ''", "git branch -m", "git branch 'a b'", "git branch .", "git branch ..x",
		"git tag ''", "git tag -d", "git checkout", "git checkout -b", "git switch", "git switch -c", "git reset --hard --soft", "git reset HEAD~99", "git show HEAD~99", "git show :", "git show HEAD:", "git show HEAD:nope", "git diff HEAD~99",
		"git cat-file", "git cat-file -p", "git cat-file -p 0000000", "git cat-file -t zz", "git rev-parse", "git rev-parse @{u}", "git rev-parse HEAD@{99}", "git rev-parse ^", "git rev-parse ~", "git rev-parse HEAD^{nope}",
		"git merge", "git merge HEAD", "git rebase", "git rebase nope", "git cherry-pick", "git cherry-pick HEAD", "git revert", "git stash pop", "git stash drop stash@{9}", "git stash show", "git bisect", "git bisect good", "git bisect nope",
		"git remote add", "git remote add o", "git remote add o o", "git remote add o o", "git push o", "git fetch o", "git pull o", "git clone", "git clone ''", "git clone a a", "git config", "git config --get", "git config a", "git config a.b.c.d e",
		"git grep", "git blame", "git blame nope", "git ls-tree", "git ls-tree nope", "git log --since=n'importe", "git log --author='['", "git log --grep='('", "git describe", "git reflog nope", "git worktree", "git worktree add",
		"git archive", "git bundle", "git filter-repo", "git notes", "git help nope", "git clean", "git count-objects -z", "git fsck --nope", "git hash-object", "git hash-object nope", "git restore", "git restore --source=nope a",
		"git log $(printf 'x%.0s' 1 2 3 4 5 6 7 8 9 10)", "git status " + new Array(50).join("x"), "git add " + new Array(30).join("a/"), "gh", "gh pr", "gh pr view", "gh nope"];
	absurdes.forEach(function(c){
		var s = sur(jeu, c);
		absent(s, "undefined", "« " + c + " » n'affiche pas undefined");
		absent(s, "[object", "« " + c + " » n'affiche pas [object");
		absent(s, "NaN", "« " + c + " » n'affiche pas NaN");
	});
	contient(sur(jeu, "git status"), "On branch main", "status répond encore après les arguments absurdes");
	egal(t(jeu, "git log --oneline | wc -l"), "1", "l'historique est intact");
	// Un dépôt corrompu.
	depot(jeu, "corrompu");
	t(jeu, "echo 'ref: refs/heads/main' > .git/HEAD");
	egal(t(jeu, "git rev-parse --abbrev-ref HEAD"), "main", "HEAD réécrit à la main, valide");
	t(jeu, "echo 'nimporte quoi' > .git/refs/heads/main");
	contient(sur(jeu, "git log"), "fatal", "une ref illisible : fatal");
	t(jeu, "git rev-parse HEAD@{0} > /dev/null");
	var bon = jeu.lire("gReflogLire(gitDepot(null, '~/corrompu'), 'HEAD')[0].nouveau");
	t(jeu, "echo " + bon + " > .git/refs/heads/main");
	egal(t(jeu, "git rev-parse HEAD"), bon, "une ref réparée à la main");
	t(jeu, "echo 'zzz' > .git/HEAD");
	contient(sur(jeu, "git status"), "fatal: not a git repository", "un HEAD illisible : ce n'est plus un dépôt");
	t(jeu, "echo 'ref: refs/heads/main' > .git/HEAD");
	jeu.lire("(function(){ var R = gitDepot(null, '~/corrompu'); var t = gTete(R); var d = gDossier(R.git, 'objects/' + t.substring(0, 2), false); if (d) d.removeItem(d.getItemFromName(t.substring(2))); R.cache = {}; })()");
	var s1 = sur(jeu, "git log");
	contient(s1, "fatal", "un objet disparu : fatal");
	sur(jeu, "git status"); sur(jeu, "git fsck"); sur(jeu, "git commit -m x"); sur(jeu, "git gc");
	correspond(sur(jeu, "git fsck"), /invalid sha1 pointer|missing/, "fsck signale l'objet manquant");
	jeu.lire("(function(){ var R = gitDepot(null, '~/corrompu'); var d = gDossier(R.git, 'objects', false); d.items.slice().forEach(function(it){ d.removeItem(it); }); d.children.slice().forEach(function(c){ d.removeChild(c); }); R.cache = {}; })()");
	["git log", "git status", "git fsck", "git show", "git diff", "git branch", "git reflog", "git count-objects -v"].forEach(function(c){ sur(jeu, c); });
	// Un objet écrit à la main, illisible.
	depot(jeu, "objet-faux");
	t(jeu, "mkdir -p .git/objects/ab; echo charabia > .git/objects/ab/" + new Array(39).join("c"));
	["git log", "git cat-file -p ab" + new Array(39).join("c"), "git fsck", "git gc", "git count-objects -v"].forEach(function(c){ sur(jeu, c); });
	// .git supprimé.
	depot(jeu, "sans-git");
	t(jeu, "rm -rf .git");
	contient(sur(jeu, "git status"), "fatal: not a git repository", ".git supprimé");
	contient(sur(jeu, "git log"), "fatal: not a git repository", ".git supprimé : log");
	// L'éditeur annulé (quitter sans enregistrer).
	depot(jeu, "editeur");
	t(jeu, "echo b > b; git add b");
	jeu.editer("function(t){ return null; }");
	var ann = sur(jeu, "git commit");
	contient(ann, "Aborting commit due to empty commit message.", "l'éditeur quitté sans enregistrer : commit annulé (le modèle garde un message vide)");
	egal(t(jeu, "git status -s"), "A  b", "l'éditeur annulé : rien n'est perdu");
	jeu.editer("function(t){ return 'Mon message\\n' + t; }");
	sur(jeu, "git commit");
	egal(t(jeu, "git log -1 --format=%s"), "Mon message", "l'éditeur : le message écrit");
	jeu.editer("function(t){ return '# rien que des commentaires\\n'; }");
	contient(sur(jeu, "git commit --amend"), "Aborting commit due to empty commit message.", "amend vidé : annulé");
	egal(t(jeu, "git log -1 --format=%s"), "Mon message", "amend annulé : le commit reste");
	// Des noms avec espaces, un sous-dossier.
	t(jeu, "mkdir doss"); t(jeu, "echo z > 'doss/mon fichier.txt'"); t(jeu, "touch 'a b.txt'");
	egal(t(jeu, "git status -s"), "?? \"a b.txt\"\n?? doss/", "status -s : un nom avec espace entre guillemets");
	t(jeu, "git add .");
	egal(t(jeu, "git status -s"), "A  \"a b.txt\"\nA  \"doss/mon fichier.txt\"", "status -s : les noms avec espaces");
	contient(t(jeu, "git status"), "\tnew file:   a b.txt", "status long : pas de guillemets pour une espace");
	t(jeu, "cd doss");
	egal(t(jeu, "git status -s"), "A  \"../a b.txt\"\nA  \"mon fichier.txt\"", "status depuis un sous-dossier : chemins relatifs");
	egal(t(jeu, "git rev-parse --show-prefix"), "doss/", "rev-parse --show-prefix");
	t(jeu, "cd ~");
	// Des centaines de commits : rien ne s'emballe.
	depot(jeu, "long");
	jeu.lire("state.env.GIT_COMMITTER_DATE = ''; state.env.GIT_AUTHOR_DATE = '';");
	for (var i = 0; i < 40; i++) t(jeu, "echo " + i + " > f; git add f; git commit -qm c" + i);
	egal(t(jeu, "git log --oneline | wc -l"), "41", "40 commits à la suite");
	egal(t(jeu, "git rev-list --count HEAD"), "41", "rev-list --count");
	contient(t(jeu, "git log --graph --oneline -3"), "* ", "le graphe d'un long historique");
	jeu.lire("state.env.GIT_COMMITTER_DATE = '1760000000 +0200'; state.env.GIT_AUTHOR_DATE = '1760000000 +0200';");
	// Bisect run jusqu'au bout.
	t(jeu, "git bisect start HEAD HEAD~40");
	var br = t(jeu, "git bisect run bash -c 'test $(cat f) -lt 23'");
	contient(br, "is the first bad commit", "bisect run trouve le premier mauvais commit");
	contient(br, "c23", "bisect run : c23 est le coupable");
	t(jeu, "git bisect reset");
	egal(t(jeu, "git status -s"), "", "bisect reset : propre");
})();

/* ================================================================== */
/* 10. Sauvegarder puis recharger au milieu d'une opération            */
/* ================================================================== */
(function(){
	// Au milieu d'une fusion en conflit.
	var stockage = {};
	var jeu = jeuNeuf(stockage);
	identite(jeu);
	depot(jeu, "conflit");
	tous(jeu, ["printf 'l1\\nl2\\nl3\\n' > f", "git add f", "git commit -qm base", "git switch -qc feat", "printf 'l1\\nFEAT\\nl3\\n' > f", "git commit -qam feat", "git switch -q main", "printf 'l1\\nMAIN\\nl3\\n' > f", "git commit -qam main"]);
	contient(t(jeu, "git merge feat"), "CONFLICT (content): Merge conflict in f", "le conflit");
	var statutAvant = t(jeu, "git status");
	var fAvant = t(jeu, "cat f");
	jeu.lire("state.save()");
	var jeu2 = jeuNeuf(stockage);
	t(jeu2, "cd ~/conflit");
	egal(t(jeu2, "git status"), statutAvant, "après rechargement : le même status en plein conflit");
	egal(t(jeu2, "cat f"), fAvant, "après rechargement : les marqueurs de conflit");
	contient(t(jeu2, "git diff"), "++<<<<<<< HEAD", "après rechargement : diff --cc");
	egal(t(jeu2, "git ls-files -s f").split("\n").length, 3, "après rechargement : les trois étages de l'index");
	t(jeu2, "printf 'l1\\nRESOLU\\nl3\\n' > f"); t(jeu2, "git add f");
	egal(t(jeu2, "git commit -q --no-edit"), "", "après rechargement : la fusion se conclut");
	egal(t(jeu2, "git log -1 --format=%s"), "Merge branch 'feat'", "après rechargement : le message de fusion");
	egal(t(jeu2, "git log -1 --format=%p").split(" ").length, 2, "après rechargement : deux parents");
	egal(t(jeu2, "git status -s"), "", "après rechargement : propre");

	// Au milieu d'un rebase -i arrêté (edit), puis d'un rebase en conflit.
	var st2 = {};
	var j3 = jeuNeuf(st2);
	identite(j3);
	depot(j3, "rebase");
	tous(j3, ["echo b > b", "git add b", "git commit -qm deux", "echo c > c", "git add c", "git commit -qm trois", "echo d > d", "git add d", "git commit -qm quatre"]);
	j3.editer("function(t){ return t.replace(/^pick (\\w+) trois$/m, 'edit $1 trois').replace(/^pick (\\w+) quatre$/m, 'reword $1 quatre'); }");
	var arret = t(j3, "git rebase -i HEAD~3");
	contient(arret, "Stopped at", "rebase -i : arrêt sur edit");
	var stR = t(j3, "git status");
	contient(stR, "interactive rebase in progress; onto", "rebase -i arrêté : status");
	j3.lire("state.save()");
	var j4 = jeuNeuf(st2);
	t(j4, "cd ~/rebase");
	egal(t(j4, "git status"), stR, "après rechargement : le même status du rebase -i");
	t(j4, "echo cc >> c"); t(j4, "git add c"); t(j4, "git commit -q --amend --no-edit");
	j4.editer("function(t){ return 'quatre reformule\\n' + t.split('\\n').slice(1).join('\\n'); }");
	var fin = t(j4, "git rebase --continue");
	contient(fin, "Successfully rebased and updated refs/heads/main.", "après rechargement : le rebase -i se termine");
	egal(t(j4, "git log --format=%s"), "quatre reformule\ntrois\ndeux\nun", "après rechargement : reword appliqué");
	egal(t(j4, "git show HEAD~1:c"), "c\ncc", "après rechargement : l'edit est dans le commit");
	egal(t(j4, "git status -s"), "", "après rechargement : propre");
	// Un rebase en conflit, sauvegardé, rechargé, abandonné.
	tous(j4, ["git switch -qc a", "printf 'x\\nA\\n' > c", "git commit -qam A", "git switch -q main", "printf 'x\\nM\\n' > c", "git commit -qam M", "git switch -q a"]);
	contient(t(j4, "git rebase main"), "CONFLICT", "rebase en conflit");
	j4.lire("state.save()");
	var j5 = jeuNeuf(st2);
	t(j5, "cd ~/rebase");
	contient(t(j5, "git status"), "You are currently rebasing branch 'a' on", "après rechargement : le rebase en conflit");
	t(j5, "git rebase --abort");
	egal(t(j5, "git log -1 --format=%s"), "A", "après rechargement : abort revient à la branche");
	egal(t(j5, "git branch --show-current"), "a", "après rechargement : sur la branche a");
	// Un stash et un bisect survivent aussi.
	tous(j5, ["echo sale > sale", "git stash -u -q", "git bisect start HEAD HEAD~3"]);
	j5.lire("state.save()");
	var j6 = jeuNeuf(st2);
	t(j6, "cd ~/rebase");
	contient(t(j6, "git stash list"), "stash@{0}: WIP on a:", "après rechargement : le stash");
	contient(t(j6, "git status"), "You are currently bisecting", "après rechargement : le bisect");
	t(j6, "git bisect reset"); t(j6, "git stash pop -q");
	egal(t(j6, "cat sale"), "sale", "après rechargement : stash pop");
})();

console.log("git-moteur : " + ok + " vérifications réussies, " + ko + " échecs");
if (ko) process.exit(1);
