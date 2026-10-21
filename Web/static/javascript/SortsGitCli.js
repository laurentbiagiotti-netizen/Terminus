/**
 * SortsGitCli.js : la commande git du jeu (chapitre 9 pour le joueur, numéro interne 10), première partie.
 *
 * Le moteur est dans SortsGit.js. Ici : l'analyse des arguments, le contexte d'une commande (le dépôt, le dossier
 * courant, les chemins relatifs), et les sous-commandes du quotidien : init, clone, config, status, add, rm, mv,
 * restore, commit, log, show, diff, blame, reset, reflog, branch, switch, checkout, tag, cat-file, hash-object,
 * ls-files, ls-tree, rev-parse, check-ignore, grep, shortlog, describe, clean, count-objects, gc, fsck, verify-commit.
 * La suite (merge, rebase, cherry-pick, revert, stash, bisect, remote, fetch, pull, push, worktree, archive, bundle,
 * filter-repo, notes) : SortsGitCli2.js. Les sorties sont celles du vrai git 2.43, en anglais ; le jeu n'ajoute que
 * de rares indices, en gris.
 *
 * Chaque sous-commande émet un événement GameEvents { type: "git", hote, depot, cmd, args, ok, ... }.
 */

/* ================================================================== */
/* Le contexte d'une commande                                          */
/* ================================================================== */

function GitCtx(args, io, cmd){
	this.args = args; this.io = io; this.cmd = cmd;
	this.lieu = current_room;
	this.ev = {};
	this.R = undefined;
	this.erreurs = [];
}
/* Le dépôt (ou l'erreur du vrai git). */
GitCtx.prototype.depot = function(){
	if (this.R === undefined) this.R = gTrouverDepot(this.lieu);
	if (!this.R) throw new GitErreur("fatal: not a git repository (or any of the parent directories): .git", 128);
	return this.R;
};
/* Le dépôt, avec une copie de travail. */
GitCtx.prototype.travail = function(){
	var R = this.depot();
	if (!R.top) throw new GitErreur("fatal: this operation must be run in a work tree", 128);
	return R;
};
/* Le chemin du dossier courant dans la copie de travail ("" à la racine). */
GitCtx.prototype.prefixe = function(){
	var R = this.depot();
	if (!R.top) return "";
	var p = gRelatif(R.top, this.lieu);
	return p === null ? "" : p;
};
/* Un chemin donné par le joueur, ramené à la racine du dépôt ; null s'il sort du dépôt. */
GitCtx.prototype.rel = function(chemin){
	var R = this.depot();
	var base = this.prefixe() ? this.prefixe().split("/") : [];
	var c = String(chemin);
	if (c.charAt(0) === "/" || c.charAt(0) === "~"){
		var top = gCheminReel(R.top || R.git), abs = c.charAt(0) === "~" ? gCheminReel(gMaison(this.lieu)) + c.substring(1) : c;
		if (abs === top) return "";
		if (abs.indexOf(top + "/") === 0) return abs.substring(top.length + 1).replace(/\/+$/, "");
		return null;
	}
	var m = base.slice();
	c.split("/").forEach(function(x){
		if (x === "" || x === ".") return;
		if (x === "..") m.pop(); else m.push(x);
	});
	if (base.length && c.split("/").filter(function(x){ return x === ".."; }).length > base.length) return null;
	return m.join("/");
};
/* Un chemin du dépôt, affiché depuis le dossier courant (comme git status). */
GitCtx.prototype.aff = function(chemin){
	var p = this.prefixe();
	if (!p) return chemin;
	if (chemin.indexOf(p + "/") === 0) return chemin.substring(p.length + 1);
	var a = p.split("/"), b = chemin.split("/"), i = 0;
	while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
	return new Array(a.length - i + 1).join("../") + b.slice(i).join("/");
};
GitCtx.prototype.err = function(m){ this.erreurs.push(m); };

/* ================================================================== */
/* Les options                                                         */
/* ================================================================== */

/*
 * spec : { "-m|--message": "v", "-a|--all": "b", "-n": "n" (nombre), "--format": "v" } ; renvoie { o: { nomLong: valeur }, p: [positionnels], apres: [après --] }.
 * Un booléen répété compte (-vv). Les options courtes se collent (-am "msg", -sb). --opt=valeur. --no-opt pour un booléen.
 */
function gOptions(args, spec, cmd){
	var noms = {}, o = {}, p = [], apres = null;
	Object.keys(spec).forEach(function(k){
		var principal = k.split("|").filter(function(x){ return /^--/.test(x); })[0] || k.split("|")[0];
		k.split("|").forEach(function(x){ noms[x] = { cle: principal.replace(/^-+/, ""), type: spec[k] }; });
	});
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (apres !== null){ apres.push(a); continue; }
		if (a === "--"){ apres = []; continue; }
		if (/^--[^=]+=/.test(a)){
			var n = a.substring(0, a.indexOf("=")), v = a.substring(a.indexOf("=") + 1);
			if (!noms[n]) throw gOptionInconnue(cmd, n.substring(2), true);
			o[noms[n].cle] = noms[n].type === "b" ? !/^(false|no|0)$/.test(v) : v;
			if (noms[n].type === "l"){ o[noms[n].cle] = (o["_" + noms[n].cle] = (o["_" + noms[n].cle] || []).concat([v])); }
			continue;
		}
		if (/^--/.test(a)){
			if (noms[a]){
				var d = noms[a];
				if (d.type === "b") o[d.cle] = (o[d.cle] === true || typeof o[d.cle] !== "number" ? (o[d.cle] ? 2 : 1) : o[d.cle] + 1), o[d.cle] = o[d.cle] === 1 ? true : o[d.cle];
				else if (d.type === "o") o[d.cle] = true;
				else {
					if (i + 1 >= args.length) throw new GitErreur("error: option `" + a.substring(2) + "' requires a value", 129);
					var val = args[++i];
					if (d.type === "l") o[d.cle] = (o[d.cle] || []).concat([val]); else o[d.cle] = val;
				}
				continue;
			}
			var neg = /^--no-(.*)$/.exec(a);
			if (neg && noms["--" + neg[1]]){ o[noms["--" + neg[1]].cle] = false; continue; }
			throw gOptionInconnue(cmd, a.substring(2), true);
		}
		if (/^-[A-Za-z0-9]/.test(a) && a.length >= 2 && !/^-\d+$/.test(a) || /^-\d+$/.test(a) && noms["-n"] === undefined && noms["-NOMBRE"] === undefined){
			for (var j = 1; j < a.length; j++){
				var c = "-" + a.charAt(j);
				if (!noms[c]){
					if (/\d/.test(a.charAt(j)) && noms["-NOMBRE"]){ o[noms["-NOMBRE"].cle] = a.substring(j); break; }
					throw gOptionInconnue(cmd, a.charAt(j), false);
				}
				var dd = noms[c];
				if (dd.type === "b"){ o[dd.cle] = o[dd.cle] === undefined || o[dd.cle] === false ? true : (o[dd.cle] === true ? 2 : o[dd.cle] + 1); continue; }
				var reste = a.substring(j + 1);
				var vv;
				// Une option courte à valeur facultative (tag -n, -n3) ne prend que la valeur collée.
				if (dd.type === "o"){ o[dd.cle] = reste !== "" ? reste : true; break; }
				if (reste !== ""){ vv = reste; }
				else {
					if (i + 1 >= args.length) throw new GitErreur("error: switch `" + a.charAt(j) + "' requires a value", 129);
					vv = args[++i];
				}
				if (dd.type === "l") o[dd.cle] = (o[dd.cle] || []).concat([vv]); else o[dd.cle] = vv;
				break;
			}
			continue;
		}
		if (/^-\d+$/.test(a) && noms["-NOMBRE"]){ o[noms["-NOMBRE"].cle] = a.substring(1); continue; }
		p.push(a);
	}
	return { o: o, p: p, apres: apres };
}
function gOptionInconnue(cmd, nom, long){
	return new GitErreur("error: unknown " + (long ? "option" : "switch") + " `" + nom + "'\nusage: git " + (cmd || "") + " [<options>]\n" + C.gris("(git " + (cmd || "") + " --help, ou man git, pour les options de ce sort.)"), 129);
}

/* ================================================================== */
/* Les chemins (pathspec)                                              */
/* ================================================================== */

/* Un motif de chemin du joueur : { tester(cheminDuDepot), brut } ; * et ? traversent les dossiers, comme le pathspec de git. */
function gPathspec(ctx, brut){
	var rel = ctx.rel(brut);
	if (rel === null) throw new GitErreur("fatal: " + brut + ": '" + brut + "' is outside repository at '" + gCheminReel(ctx.depot().top || ctx.depot().git) + "'", 128);
	var joker = /[*?[]/.test(brut);
	var re = null;
	if (joker){
		var r = "", i = 0;
		while (i < rel.length){ var c = rel.charAt(i); if (c === "*") r += ".*"; else if (c === "?") r += "."; else if (c === "["){ var j = rel.indexOf("]", i); if (j > -1){ r += rel.substring(i, j + 1); i = j + 1; continue; } r += "\\["; } else r += c.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); i++; }
		re = new RegExp("^" + r + "(/.*)?$");
	}
	return {
		brut: brut, rel: rel,
		tester: function(p){ if (re) return re.test(p); return rel === "" || p === rel || p.indexOf(rel + "/") === 0; }
	};
}
function gPathspecs(ctx, liste){ return liste.map(function(x){ return gPathspec(ctx, x); }); }
function gCorrespond(specs, p){ if (!specs.length) return true; return specs.some(function(s){ return s.tester(p); }); }

/* ================================================================== */
/* Le sort git                                                         */
/* ================================================================== */

var GIT_SOUS_COMMANDES = {};
var GIT_ALIAS_COMMANDES = {};
var GIT_EN_ATTENTE = false;

Shell.sorts.git = function(args, io){
	var ctx = null;
	try {
		args = args.slice();
		var lieu = current_room;
		// Les options globales : -C dossier, --version, --help, -c cle=valeur (lu, ignoré), --no-pager, -P.
		while (args.length && /^-/.test(args[0])){
			var a = args[0];
			if (a === "--version" || a === "-v"){ return "git version " + GIT_VERSION; }
			if (a === "--help" || a === "-h") return gUsageGit();
			if (a === "-C"){
				if (!args[1]) throw new GitErreur("error: no directory given for '-C' option\n", 129);
				var r = gChemin(lieu, args[1]);
				if (!r || !(r.noeud instanceof Room)) throw new GitErreur("fatal: cannot change to '" + args[1] + "': No such file or directory", 128);
				lieu = r.noeud; args = args.slice(2); continue;
			}
			if (a === "-c"){ args = args.slice(2); continue; }
			if (a === "--no-pager" || a === "-P" || a === "--paginate" || a === "-p" || a === "--bare" || a === "--no-replace-objects"){ args = args.slice(1); continue; }
			throw new GitErreur("unknown option: " + a + "\n" + gUsageCourt(), 129);
		}
		if (!args.length) return gUsageGit();
		var cmd = args[0];
		if (GIT_ALIAS_COMMANDES[cmd]) cmd = GIT_ALIAS_COMMANDES[cmd];
		// Les alias de l'utilisateur (alias.st = status).
		if (!GIT_SOUS_COMMANDES[cmd]){
			var Ra = gTrouverDepot(lieu);
			var al = gConfig(Ra, "alias." + cmd, lieu);
			if (al){
				var mots = al.trim().split(/\s+/);
				if (mots[0].charAt(0) === "!") throw new GitErreur("fatal: les alias qui lancent un programme (!) ne sont pas pris en charge ici", 128);
				args = mots.concat(args.slice(1));
				cmd = args[0];
				if (GIT_ALIAS_COMMANDES[cmd]) cmd = GIT_ALIAS_COMMANDES[cmd];
			}
		}
		if (!GIT_SOUS_COMMANDES[cmd]){
			var proche = Object.keys(GIT_SOUS_COMMANDES).filter(function(c){ return typeof distanceUn === "function" ? distanceUn(cmd, c) : false; })[0];
			throw new GitErreur("git: '" + cmd + "' is not a git command. See 'git --help'." + (proche ? "\n\nThe most similar command is\n\t" + proche : ""), 1);
		}
		ctx = new GitCtx(args.slice(1), io, cmd);
		ctx.lieu = lieu;
		if (args.slice(1).indexOf("-h") > -1 && cmd !== "grep" && cmd !== "ls-tree" && cmd !== "branch") return gUsageSous(cmd);
		var sortie = GIT_SOUS_COMMANDES[cmd](ctx);
		if (ctx.erreurs.length) ctx.erreurs.forEach(function(m){ io.err(m); });
		if (ctx.code) io.code = ctx.code;
		if (!ctx.asynchrone) gEvenement(ctx, true);
		return sortie === undefined || sortie === null ? "" : sortie;
	} catch (e){
		if (e instanceof GitErreur){
			if (ctx){ ctx.ev.erreur = e.message; ctx.code = e.code; gEvenement(ctx, false); }
			if (ctx && ctx.erreurs.length) ctx.erreurs.forEach(function(m){ io.err(m); });
			throw new ShellError(e.message, e.code);
		}
		throw e;
	}
};
function gEvenement(ctx, ok){
	if (ctx.ev.silencieux) return;
	var R = ctx.R || null;
	var e = { type: "git", hote: R ? R.h : gHoteDe(ctx.lieu), depot: R ? gCheminReel(R.top || R.git) : null, cmd: ctx.cmd, args: ctx.args.slice(), ok: ok && !ctx.code, code: ctx.code || 0 };
	for (var k in ctx.ev){ if (ctx.ev.hasOwnProperty(k) && k !== "type") e[k] = ctx.ev[k]; }
	try { GameEvents.fire(e); } catch (x){}
}
function gUsageCourt(){
	return "usage: git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]\n           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]\n           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--bare]\n           [--git-dir=<path>] [--work-tree=<path>] [--namespace=<name>]\n           [--config-env=<name>=<envvar>] <command> [<args>]";
}
function gUsageGit(){
	return gUsageCourt() + "\n\nThese are common Git commands used in various situations:\n\n" +
		"start a working area (see also: git help tutorial)\n   clone     Clone a repository into a new directory\n   init      Create an empty Git repository or reinitialize an existing one\n\n" +
		"work on the current change (see also: git help everyday)\n   add       Add file contents to the index\n   mv        Move or rename a file, a directory, or a symlink\n   restore   Restore working tree files\n   rm        Remove files from the working tree and from the index\n\n" +
		"examine the history and state (see also: git help revisions)\n   bisect    Use binary search to find the commit that introduced a bug\n   diff      Show changes between commits, commit and working tree, etc\n   grep      Print lines matching a pattern\n   log       Show commit logs\n   show      Show various types of objects\n   status    Show the working tree status\n\n" +
		"grow, mark and tweak your common history\n   branch    List, create, or delete branches\n   commit    Record changes to the repository\n   merge     Join two or more development histories together\n   rebase    Reapply commits on top of another base tip\n   reset     Reset current HEAD to the specified state\n   switch    Switch branches\n   tag       Create, list, delete or verify a tag object signed with GPG\n\n" +
		"collaborate (see also: git help workflows)\n   fetch     Download objects and refs from another repository\n   pull      Fetch from and integrate with another repository or a local branch\n   push      Update remote refs along with associated objects\n\n" +
		"'git help -a' and 'git help -g' list available subcommands and some\nconcept guides. See 'git help <command>' or 'git help <concept>'\nto read about a specific subcommand or concept.\nSee 'git help git' for an overview of the system.";
}
function gUsageSous(cmd){
	var u = GIT_USAGES[cmd] || "git " + cmd + " [<options>]";
	return "usage: " + u + "\n" + C.gris("(man git : la page du sort, avec les options courantes de git " + cmd + ".)");
}
var GIT_USAGES = {
	add: "git add [<options>] [--] <pathspec>...", commit: "git commit [-a | --interactive | --patch] [-s] [-v] [-u<mode>] [--amend]\n                  [--dry-run] [(-c | -C | --squash) <commit> | --fixup [(amend|reword):]<commit>)]\n                  [-F <file> | -m <msg>] [--reset-author] [--allow-empty]\n                  [--allow-empty-message] [--no-verify] [-e] [--author=<author>]\n                  [--date=<date>] [--cleanup=<mode>] [--[no-]status]\n                  [-i | -o] [--pathspec-from-file=<file> [--pathspec-file-nul]]\n                  [(--trailer <token>[(=|:)<value>])...] [-S[<keyid>]]\n                  [--] [<pathspec>...]",
	status: "git status [<options>] [--] [<pathspec>...]", log: "git log [<options>] [<revision-range>] [[--] <path>...]",
	reset: "git reset [--mixed | --soft | --hard | --merge | --keep] [-q] [<commit>]\n   or: git reset [-q] [<tree-ish>] [--] <pathspec>...", switch: "git switch [<options>] [<branch>]",
	restore: "git restore [<options>] [--source=<branch>] <file>...", merge: "git merge [<options>] [<commit>...]\n   or: git merge --abort\n   or: git merge --continue",
	rebase: "git rebase [-i] [options] [--exec <cmd>] [--onto <newbase> | --keep-base] [<upstream> [<branch>]]\n   or: git rebase [-i] [options] [--exec <cmd>] [--onto <newbase>] --root [<branch>]\n   or: git rebase --continue | --abort | --skip | --edit-todo",
	stash: "git stash list [<log-options>]\n   or: git stash show [-u | --include-untracked | --only-untracked] [<diff-options>] [<stash>]\n   or: git stash drop [-q | --quiet] [<stash>]\n   or: git stash pop [--index] [-q | --quiet] [<stash>]\n   or: git stash apply [--index] [-q | --quiet] [<stash>]\n   or: git stash branch <branchname> [<stash>]\n   or: git stash [push [-p | --patch] [-S | --staged] [-k | --[no-]keep-index] [-q | --quiet]\n          [-u | --include-untracked] [-a | --all] [(-m | --message) <message>]\n          [--pathspec-from-file=<file> [--pathspec-file-nul]]\n          [--] [<pathspec>...]]\n   or: git stash clear",
	bisect: "git bisect [help|start|bad|good|new|old|terms|skip|next|reset|visualize|view|replay|log|run]"
};

/* Une réponse vide de git, avec un code (rien n'est affiché). */
function gCode(ctx, code){ ctx.code = code; return ""; }

/* ================================================================== */
/* init et clone                                                       */
/* ================================================================== */

GIT_SOUS_COMMANDES.init = function(ctx){
	var op = gOptions(ctx.args, { "-q|--quiet": "b", "--bare": "b", "-b|--initial-branch": "v", "--template": "v", "--shared": "o" }, "init");
	var lieu = ctx.lieu;
	if (op.p.length){
		var r = gChemin(lieu, op.p[0]);
		if (r && r.noeud instanceof Item) throw new GitErreur("fatal: cannot mkdir " + op.p[0] + ": File exists", 128);
		if (r && r.noeud instanceof Room) lieu = r.noeud;
		else {
			var parent = r ? r.dir : null;
			if (!parent){
				// Créer les dossiers manquants (git init a/b/c les crée).
				var m = String(op.p[0]).split("/").filter(Boolean), l = op.p[0].charAt(0) === "~" ? gMaison(lieu) : lieu;
				if (m[0] === "~") m.shift();
				for (var i = 0; i < m.length; i++){ var s = m[i] === ".." ? l.parents[0] : l.getNode(m[i]); if (s instanceof Item) throw new GitErreur("fatal: cannot mkdir " + op.p[0] + ": Not a directory", 128); if (!s){ if (!Shell.bit(l, "w", ctx.io)) throw new GitErreur("fatal: cannot mkdir " + op.p[0] + ": Permission denied", 128); s = gNouveauDossier(l, m[i], gJoueur(), "rwxr-xr-x"); } l = s; }
				lieu = l;
			} else {
				if (!Shell.bit(parent, "w", ctx.io)) throw new GitErreur("fatal: cannot mkdir " + op.p[0] + ": Permission denied", 128);
				lieu = gNouveauDossier(parent, r.nom, gJoueur(), "rwxr-xr-x");
			}
		}
	}
	if (!Shell.bit(lieu, "w", ctx.io)) throw new GitErreur("/" + gCheminReel(lieu).replace(/^\//, "") + "/.git/: Permission denied", 1);
	var nu = !!op.o.bare;
	var deja = nu ? (gEstDossierGit(lieu) ? lieu : null) : (lieu.getChildFromName(".git") !== -1 ? lieu.getChildFromName(".git") : null);
	if (deja && gEstDossierGit(deja)){
		ctx.R = gDepotDe(deja, nu ? null : lieu);
		ctx.ev.reinit = true;
		if (op.o.branch) ctx.err("warning: re-init: ignored --initial-branch=" + op.o["initial-branch"]);
		return op.o.quiet ? "" : "Reinitialized existing Git repository in " + gCheminReel(deja) + "/";
	}
	var branche = op.o["initial-branch"] || gConfig(null, "init.defaultBranch", lieu);
	var conseil = "";
	if (!branche){
		branche = "master";
		conseil = "hint: Using 'master' as the name for the initial branch. This default branch name\nhint: is subject to change. To configure the initial branch name to use in all\nhint: of your new repositories, which will suppress this warning, call:\nhint: \nhint: \tgit config --global init.defaultBranch <name>\nhint: \nhint: Names commonly chosen instead of 'master' are 'main', 'trunk' and\nhint: 'development'. The just-created branch can be renamed via this command:\nhint: \nhint: \tgit branch -m <name>";
	}
	if (!/^[^\s~^:?*[\\]+$/.test(branche) || /\.\.|^\/|\/$|\.lock$|@\{/.test(branche)) throw new GitErreur("fatal: invalid initial branch name: '" + branche + "'", 128);
	var R = gInitialiser(lieu, nu, branche);
	ctx.R = R;
	ctx.ev.nu = nu; ctx.ev.branche = branche;
	if (conseil && !op.o.quiet) ctx.err(conseil);
	return op.o.quiet ? "" : "Initialized empty Git repository in " + gCheminReel(R.git) + "/";
};

GIT_SOUS_COMMANDES.clone = function(ctx){
	var op = gOptions(ctx.args, { "-q|--quiet": "b", "--bare": "b", "--mirror": "b", "-b|--branch": "v", "-o|--origin": "v", "--depth": "v", "--single-branch": "b", "--no-checkout|-n": "b", "-v|--verbose": "b", "--recurse-submodules": "o" }, "clone");
	if (!op.p.length) throw new GitErreur("fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]", 129);
	var url = op.p[0];
	var S = gOuvrirDistant(null, url, ctx.lieu);
	var nom = op.p[1] || String(url).replace(/\/+$/, "").replace(/^.*[\/:]/, "").replace(/\.git$/, "") || "depot";
	if (op.o.bare && !op.p[1]) nom += ".git";
	var r = gChemin(ctx.lieu, nom);
	var cible;
	if (r && r.noeud){
		if (r.noeud instanceof Item || r.noeud.items.length || r.noeud.children.length) throw new GitErreur("fatal: destination path '" + nom + "' already exists and is not an empty directory.", 128);
		cible = r.noeud;
	} else {
		var parent = r ? r.dir : null;
		if (!parent) throw new GitErreur("fatal: could not create leading directories of '" + nom + "': No such file or directory", 128);
		if (!Shell.bit(parent, "w", ctx.io)) throw new GitErreur("fatal: could not create work tree dir '" + nom + "': Permission denied", 128);
		cible = gNouveauDossier(parent, r.nom, gJoueur(), "rwxr-xr-x");
	}
	var remote = op.o.origin || "origin";
	var brancheS = op.o.branch || gBrancheCourante(S) || "main";
	var D = gInitialiser(cible, !!op.o.bare, brancheS);
	ctx.R = D;
	var refsS = gRefs(S, "refs/heads/").concat(gRefs(S, "refs/tags/"));
	var nb = gCopierObjets(S, D, refsS.map(function(x){ return x.hash; }).filter(Boolean));
	var urlConfig = S.ssh ? url : gCheminReel(S.top && !S.nu ? S.top : S.git);
	if (S.top && !S.nu && S.top !== S.git) urlConfig = gCheminReel(S.top);
	if (op.o.bare){
		refsS.forEach(function(x){ gEcrire(gCommun(D), x.nom, x.hash + "\n"); });
		gEcrire(D.git, "HEAD", "ref: refs/heads/" + brancheS + "\n");
	} else {
		gConfigLocalePoser(D, "remote." + remote + ".url", urlConfig);
		gConfigLocalePoser(D, "remote." + remote + ".fetch", "+refs/heads/*:refs/remotes/" + remote + "/*");
		gRefs(S, "refs/heads/").forEach(function(x){ gRefEcrire(D, "refs/remotes/" + remote + "/" + x.nom.substring(11), x.hash, "clone: from " + urlConfig, { sansHead: true }); });
		gRefs(S, "refs/tags/").forEach(function(x){ gEcrire(gCommun(D), x.nom, x.hash + "\n"); });
		if (gBrancheCourante(S) && gRef(S, "refs/heads/" + gBrancheCourante(S))) gEcrire(gCommun(D), "refs/remotes/" + remote + "/HEAD", "ref: refs/remotes/" + remote + "/" + (gBrancheCourante(S)) + "\n");
		var t = gRef(S, "refs/heads/" + brancheS);
		if (op.o.branch && !t) throw new GitErreur("fatal: Remote branch " + op.o.branch + " not found in upstream " + remote, 128);
		if (!t && !refsS.length){ gConfigLocalePoser(D, "branch." + brancheS + ".remote", remote); gConfigLocalePoser(D, "branch." + brancheS + ".merge", "refs/heads/" + brancheS); }
		if (t){
			gEcrire(D.git, "HEAD", "ref: refs/heads/" + brancheS + "\n");
			gRefEcrire(D, "refs/heads/" + brancheS, t, "clone: from " + urlConfig);
			gConfigLocalePoser(D, "branch." + brancheS + ".remote", remote);
			gConfigLocalePoser(D, "branch." + brancheS + ".merge", "refs/heads/" + brancheS);
			if (!op.o["no-checkout"]){
				var carte = gAplatir(D, gCommit(D, t).arbre);
				Object.keys(carte).forEach(function(p){ gPoserTravail(D, p, carte[p].h, carte[p].m); });
				gIndexEcrire(D, Object.keys(carte).map(function(p){ return { p: p, h: carte[p].h, m: carte[p].m, s: 0 }; }));
			}
		}
	}
	ctx.ev.url = url; ctx.ev.nom = nom; ctx.ev.objets = nb; ctx.ev.ssh = !!S.ssh; ctx.ev.source = gCheminReel(S.top || S.git);
	if (op.o.quiet) return "";
	var l = ["Cloning into " + (op.o.bare ? "bare repository " : "") + "'" + nom + "'..."];
	if (!refsS.length) l.push("warning: You appear to have cloned an empty repository.");
	if (S.ssh && nb){
		l.push("remote: Enumerating objects: " + nb + ", done.", "remote: Counting objects: 100% (" + nb + "/" + nb + "), done.", "remote: Compressing objects: 100% (" + Math.max(1, Math.round(nb * 0.6)) + "/" + Math.max(1, Math.round(nb * 0.6)) + "), done.",
			"remote: Total " + nb + " (delta 0), reused 0 (delta 0), pack-reused 0", "Receiving objects: 100% (" + nb + "/" + nb + "), done.");
	} else if (!S.ssh) l.push("done.");
	return l.join("\n");
};

/* ================================================================== */
/* config                                                              */
/* ================================================================== */

GIT_SOUS_COMMANDES.config = function(ctx){
	var op = gOptions(ctx.args, { "--global": "b", "--local": "b", "--system": "b", "--worktree": "b", "-l|--list": "b", "--get": "b", "--get-all": "b", "--unset": "b", "--unset-all": "b", "--add": "b", "--replace-all": "b",
		"--show-origin": "b", "--show-scope": "b", "-e|--edit": "b", "--bool": "b", "--int": "b", "--name-only": "b", "-f|--file": "v", "--default": "v", "--remove-section": "b", "--rename-section": "b", "--get-regexp": "b", "--type": "v" }, "config");
	var R = gTrouverDepot(ctx.lieu);
	ctx.R = R || undefined;
	var portee = op.o.global ? "global" : op.o.system ? "system" : op.o.worktree ? "worktree" : (op.o.local ? "local" : null);
	if ((portee === "local" || portee === "worktree") && !R) throw new GitErreur("fatal: --" + portee + " can only be used inside a git repository", 128);
	function origine(e){ var f = e.fichier; return "file:" + (e.portee === "local" ? (R && R.nu ? "config" : ".git/config") : f.affiche); }
	if (op.o.list || (!op.p.length && !op.o.edit)){
		if (!op.o.list) return gUsageSous("config") + "\n" + "usage: git config [<options>]";
		var toutes = gConfigToutes(R, ctx.lieu).filter(function(e){ return !portee || e.portee === portee; });
		return toutes.map(function(e){ return (op.o["show-scope"] ? e.portee + "\t" : "") + (op.o["show-origin"] ? origine(e) + "\t" : "") + e.cle + (op.o["name-only"] ? "" : "=" + e.valeur); }).join("\n");
	}
	if (op.o.edit){
		var fcE = gFichierConfig(R, portee || (R ? "local" : "global"), ctx.lieu);
		return gOuvrirEditeur(ctx, { titre: fcE.affiche, texte: gTexteConfig(fcE) || "", fin: function(texte, enregistre){ if (enregistre) gEcrireTexteConfig(fcE, texte); return ""; } });
	}
	var cle = op.p[0];
	if (!/\./.test(cle)) throw new GitErreur("error: key does not contain a section: " + cle, 2);
	if (op.o["get-regexp"]){
		var re = new RegExp(cle, "i");
		return gConfigToutes(R, ctx.lieu).filter(function(e){ return (!portee || e.portee === portee) && re.test(e.cle); }).map(function(e){ return e.cle + " " + e.valeur; }).join("\n") || gCode(ctx, 1);
	}
	var lecture = op.p.length === 1 && !op.o.unset && !op.o["unset-all"];
	if (op.o.get || op.o["get-all"] || lecture){
		var cleN = cle.split("."), norm = cleN.length > 2 ? cleN[0].toLowerCase() + "." + cleN.slice(1, -1).join(".") + "." + cleN[cleN.length - 1].toLowerCase() : cle.toLowerCase();
		var l = gConfigToutes(R, ctx.lieu).filter(function(e){ return e.cle === norm && (!portee || e.portee === portee); });
		if (!l.length){ if (op.o["default"] !== undefined) return op.o["default"]; return gCode(ctx, 1); }
		var choisis = op.o["get-all"] ? l : [l[l.length - 1]];
		return choisis.map(function(e){ var v = e.valeur; if (op.o.bool || op.o.type === "bool") v = /^(true|yes|on|1|)$/i.test(v) ? "true" : "false"; return (op.o["show-origin"] ? origine(e) + "\t" : "") + v; }).join("\n");
	}
	var fc = gFichierConfig(R, portee || (R ? "local" : "global"), ctx.lieu);
	if (!fc || (!R && !portee && false)) throw new GitErreur("fatal: not in a git directory", 128);
	if (!R && !portee) throw new GitErreur("fatal: not in a git directory", 128);
	if (fc.systeme && !ctx.io.sudo) throw new GitErreur("error: could not lock config file /etc/gitconfig: Permission denied", 255);
	if (op.o.unset || op.o["unset-all"]){
		var ok = gConfigPoser(fc, cle, null, op.o["unset-all"] ? "unset-all" : "unset");
		if (R) R.cacheConfig = null;
		ctx.ev.cle = cle; ctx.ev.unset = true; ctx.ev.portee = portee || "local";
		return ok ? "" : gCode(ctx, 5);
	}
	if (op.p.length < 2) throw new GitErreur("error: wrong number of arguments, should be 2", 129);
	gConfigPoser(fc, cle, op.p.slice(1).join(" "), op.o.add ? "add" : op.o["replace-all"] ? "replace-all" : "set");
	if (R) R.cacheConfig = null;
	ctx.ev.cle = cle.toLowerCase(); ctx.ev.valeur = op.p.slice(1).join(" "); ctx.ev.portee = portee || "local";
	return "";
};

/* ================================================================== */
/* L'éditeur (commit sans -m, rebase -i, tag -a, config -e...)          */
/* ================================================================== */

/* Ouvre l'éditeur du jeu ; o.fin(texte, enregistre) fait le travail et renvoie le texte à afficher. Garder le modèle tel quel, c'est l'enregistrer. */
function gOuvrirEditeur(ctx, o){
	var R = ctx.R || null;
	if (!ctx.io.tty || typeof term === "undefined" || !term.editer){
		// Pas d'écran : comme GIT_EDITOR=true, le modèle passe tel quel.
		return o.fin(o.texte, true);
	}
	var nom = (R && (gConfig(R, "core.editor") || "")) || (typeof state !== "undefined" && state.env ? (state.env.GIT_EDITOR || state.env.VISUAL || state.env.EDITOR || "") : "");
	var mode = /\bvim?\b/.test(nom) && state.knows && state.knows("vim") ? "vim" : "nano";
	ctx.asynchrone = true;
	var enregistre = null, fini = false;
	var lignes = String(o.texte).split("\n");
	var depart = 0;
	if (o.ligneDepart !== undefined) depart = o.ligneDepart;
	term.editer({ titre: o.titre, texte: o.texte, mode: mode, ligneDepart: depart, quitter: function(){
		if (fini) return;
		fini = true;
		var texte = enregistre !== null ? enregistre : o.texte;
		var sortie = "";
		try { sortie = o.fin(texte, true); }
		catch (e){
			if (e instanceof GitErreur){ ctx.code = e.code; ctx.ev.erreur = e.message; term.echo(e.message); }
			else { ctx.code = 1; term.echo("error: " + (e && e.message ? e.message : e)); if (typeof console !== "undefined" && console.error) console.error(e); }
		}
		if (sortie) term.echo(sortie);
		gEvenement(ctx, !ctx.code);
		if (typeof Shell !== "undefined" && Shell.fin) Shell.fin();
	} }, function(nouveau){ if (nouveau !== null && nouveau !== undefined) enregistre = nouveau; });
	if (lignes.length < 0) return "";
	return C.gris(mode === "nano" ? "(L'éditeur de git s'ouvre : écris, Ctrl+O pour enregistrer, Ctrl+X pour quitter.)" : "(L'éditeur de git s'ouvre : i pour écrire, Échap puis :wq pour enregistrer et quitter.)");
}
function gEditeurCommentaires(texte){ return gNettoyerMessage(texte, true); }

/* ================================================================== */
/* status                                                              */
/* ================================================================== */

/* Les lignes sur l'amont : « Your branch is ahead of 'origin/main' by 2 commits. » */
function gTexteAmont(R, branche, court){
	var amont = branche ? gAmont(R, branche) : null;
	if (!amont) return null;
	var nomAmont = amont.replace(/^refs\/remotes\//, "").replace(/^refs\/heads\//, "");
	var b = gRef(R, amont), a = gRef(R, "refs/heads/" + branche);
	if (!b) return court ? { nom: nomAmont, parti: true } : ["Your branch is based on '" + nomAmont + "', but the upstream is gone.", "  (use \"git branch --unset-upstream\" to fixup)"];
	var devant = a ? gParcours(R, [a], [b]).length : 0, derriere = gParcours(R, [b], a ? [a] : []).length;
	if (court) return { nom: nomAmont, devant: devant, derriere: derriere };
	if (!devant && !derriere) return ["Your branch is up to date with '" + nomAmont + "'."];
	if (devant && !derriere) return ["Your branch is ahead of '" + nomAmont + "' by " + devant + " commit" + (devant > 1 ? "s" : "") + ".", "  (use \"git push\" to publish your local commits)"];
	if (!devant) return ["Your branch is behind '" + nomAmont + "' by " + derriere + " commit" + (derriere > 1 ? "s" : "") + ", and can be fast-forwarded.", "  (use \"git pull\" to update your local branch)"];
	return ["Your branch and '" + nomAmont + "' have diverged,", "and have " + devant + " and " + derriere + " different commits each, respectively.", "  (use \"git pull\" if you want to integrate the remote branch with yours)"];
}
/* L'état d'un rebase en cours, pour status. */
function gEtatRebase(R){
	var d = gDossier(R.git, "rebase-merge", false);
	if (!d) return null;
	var lire = function(n){ var t = gLire(d, n); return t === null ? "" : t.replace(/\n$/, ""); };
	return { tete: lire("head-name").replace(/^refs\/heads\//, ""), onto: lire("onto"), fait: lire("done").split("\n").filter(function(l){ return l && l.charAt(0) !== "#"; }),
		reste: lire("git-rebase-todo").split("\n").filter(function(l){ return l.trim() && l.charAt(0) !== "#"; }), interactif: true, arret: lire("stopped-sha") };
}
function gTexteStatut(ctx, R, options){
	options = options || {};
	var et = gEtatDepot(R), l = [];
	var specs = options.specs || [];
	var tete = et.tete, br = et.branche;
	var rb = gEtatRebase(R);
	if (rb){
		l.push((rb.interactif ? "interactive rebase" : "rebase") + " in progress; onto " + gCourt(R, rb.onto));
		if (rb.interactif){
			l.push("Last command" + (rb.fait.length > 1 ? "s" : "") + " done (" + rb.fait.length + " command" + (rb.fait.length > 1 ? "s" : "") + " done):");
			rb.fait.slice(-2).forEach(function(x){ l.push("   " + gLigneTodoCourte(R, x)); });
			if (rb.fait.length > 2) l.push("  (see more in file .git/rebase-merge/done)");
			if (rb.reste.length){
				l.push("Next command" + (rb.reste.length > 1 ? "s" : "") + " to do (" + rb.reste.length + " remaining command" + (rb.reste.length > 1 ? "s" : "") + "):");
				rb.reste.slice(0, 2).forEach(function(x){ l.push("   " + gLigneTodoCourte(R, x)); });
				l.push("  (use \"git rebase --edit-todo\" to view and edit)");
			} else l.push("No commands remaining.");
		}
		var conflitsR = et.conflits.length;
		if (rb.arret && !conflitsR && !gIndexDiffereDeTete(R)) l.push("You are currently editing a commit while rebasing branch '" + rb.tete + "' on '" + gCourt(R, rb.onto) + "'.", "  (use \"git commit --amend\" to amend the current commit)", "  (use \"git rebase --continue\" once you are satisfied with your changes)");
		else {
			l.push("You are currently rebasing branch '" + rb.tete + "' on '" + gCourt(R, rb.onto) + "'.");
			if (conflitsR) l.push("  (fix conflicts and then run \"git rebase --continue\")", "  (use \"git rebase --skip\" to skip this patch)", "  (use \"git rebase --abort\" to check out the original branch)");
			else l.push("  (all conflicts fixed: run \"git rebase --continue\")");
		}
		l.push("");
	} else if (br) l.push("On branch " + br);
	else {
		var depuis = gDetacheDepuis(R);
		l.push("HEAD detached " + (depuis.bouge ? "from " : "at ") + depuis.nom);
	}
	var avecAmont = false;
	if (!rb && br && !options.sansAmont){ var am = gTexteAmont(R, br); if (am){ l = l.concat(am); avecAmont = true; } }
	if (avecAmont && !et.etat) l.push("");
	if (et.etat === "fusion"){
		if (et.conflits.length) l.push("You have unmerged paths.", "  (fix conflicts and run \"git commit\")", "  (use \"git merge --abort\" to abort the merge)");
		else l.push("All conflicts fixed but you are still merging.", "  (use \"git commit\" to conclude merge)");
		l.push("");
	} else if (et.etat === "cherry-pick" || et.etat === "revert"){
		var quoi = et.etat === "cherry-pick" ? "cherry-picking" : "reverting", ref = et.etat === "cherry-pick" ? "CHERRY_PICK_HEAD" : "REVERT_HEAD";
		l.push("You are currently " + quoi + " commit " + gCourt(R, gRef(R, ref)) + ".");
		if (et.conflits.length) l.push("  (fix conflicts and run \"git " + et.etat + " --continue\")");
		else l.push("  (all conflicts fixed: run \"git " + et.etat + " --continue\")");
		l.push("  (use \"git " + et.etat + " --skip\" to skip this patch)", "  (use \"git " + et.etat + " --abort\" to cancel the " + et.etat + " operation)", "");
	} else if (et.etat === "bisect"){
		var bs = (gLire(R.git, "BISECT_START") || "").trim();
		l.push("You are currently bisecting, started from branch '" + bs + "'.", "  (use \"git bisect reset\" to get back to the original branch)", "");
	}
	// commit dit « Initial commit » là où status dit « No commits yet ».
	if (!tete) l.push("", options.pourCommit ? "Initial commit" : "No commits yet", "");

	var ind = gIndexeesAvecRenommages(R, et).filter(function(x){ return gCorrespond(specs, x.chemin); });
	var mod = et.modifiees.filter(function(x){ return gCorrespond(specs, x.chemin) && et.conflits.indexOf(x.chemin) === -1; });
	var non = et.nonSuivies.filter(function(x){ return gCorrespond(specs, x); });
	var conf = et.conflits.filter(function(x){ return gCorrespond(specs, x); });
	var noms = { A: "new file:   ", M: "modified:   ", D: "deleted:    ", R: "renamed:    " };
	if (ind.length){
		l.push("Changes to be committed:");
		if (et.etat !== "fusion") l.push(tete ? "  (use \"git restore --staged <file>...\" to unstage)" : "  (use \"git rm --cached <file>...\" to unstage)");
		ind.forEach(function(x){ l.push("\t" + noms[x.etat] + (x.ancien ? gCiter(ctx.aff(x.ancien), false) + " -> " : "") + gCiter(ctx.aff(x.chemin), false)); });
		l.push("");
	}
	if (conf.length){
		l.push("Unmerged paths:");
		if (rb) l.push("  (use \"git restore --staged <file>...\" to unstage)");
		l.push("  (use \"git add <file>...\" to mark resolution)");
		var ci = gConflitsIndex(gIndex(R));
		conf.forEach(function(p){
			var s = ci[p] || {}, nom = s[2] && s[3] ? "both modified:   " : !s[2] && s[3] ? (s[1] ? "deleted by us:   " : "added by them:   ") : s[2] && !s[3] ? (s[1] ? "deleted by them: " : "added by us:     ") : "both added:      ";
			if (s[2] && s[3] && !s[1]) nom = "both added:      ";
			l.push("\t" + nom + gCiter(ctx.aff(p), false));
		});
		l.push("");
	}
	if (mod.length){
		l.push("Changes not staged for commit:", "  (use \"git add" + (mod.some(function(x){ return x.etat === "D"; }) ? "/rm" : "") + " <file>...\" to update what will be committed)", "  (use \"git restore <file>...\" to discard changes in working directory)");
		mod.forEach(function(x){ l.push("\t" + noms[x.etat] + gCiter(ctx.aff(x.chemin), false)); });
		l.push("");
	}
	if (non.length){
		l.push("Untracked files:", "  (use \"git add <file>...\" to include in what will be committed)");
		gRegrouperNonSuivis(R, non).forEach(function(x){ l.push("\t" + gCiter(ctx.aff(x), false)); });
		l.push("");
	}
	if (!ind.length){
		if (mod.length || conf.length) l.push("no changes added to commit (use \"git add\" and/or \"git commit -a\")");
		else if (non.length) l.push("nothing added to commit but untracked files present (use \"git add\" to track)");
		else if (!tete) l.push("nothing to commit (create/copy files and use \"git add\" to track)");
		else if (et.etat === "fusion"){ /* rien de plus */ }
		else l.push("nothing to commit, working tree clean");
	}
	while (l.length && l[l.length - 1] === "" && (ind.length || conf.length) && !mod.length && !non.length && l.length > 1 && l[l.length - 2] === "") l.pop();
	return l.join("\n");
}
/* Les fichiers non suivis : un dossier entièrement non suivi s'affiche une seule fois (dossier/), comme git. */
function gRegrouperNonSuivis(R, liste){
	var suivis = {};
	gIndex(R).forEach(function(e){ var m = e.p.split("/"); for (var k = 1; k < m.length; k++) suivis[m.slice(0, k).join("/")] = true; });
	var vus = {}, sortie = [];
	liste.forEach(function(p){
		var m = p.split("/"), d = null;
		for (var k = 1; k < m.length; k++){ var x = m.slice(0, k).join("/"); if (!suivis[x]){ d = x + "/"; break; } }
		var cle = d || p;
		if (!vus[cle]){ vus[cle] = true; sortie.push(cle); }
	});
	return sortie;
}
/* Les changements indexés, avec les renommages reconnus (R : ancien -> nouveau). */
function gIndexeesAvecRenommages(R, et){
	var t = et.tete, H = t ? gAplatir(R, gCommit(R, t).arbre) : {}, I = gIndexCarte(gIndex(R)), conf = gConflitsIndex(gIndex(R));
	var ch = gRenommages(R, gComparerCartes(H, I).filter(function(x){ return !conf[x.chemin]; }));
	return ch.map(function(x){ return { chemin: x.chemin, ancien: x.ancien || null, etat: x.ancien ? "R" : !x.a ? "A" : !x.b ? "D" : "M" }; });
}
function gLigneTodoCourte(R, x){ var m = /^(\S+)\s+([0-9a-f]+)\s*(.*)$/.exec(x); if (!m) return x; return m[1] + " " + gCourt(R, gEssayer(R, m[2]) || m[2]) + " " + m[3]; }
function gIndexDiffereDeTete(R){ var t = gTete(R); return gComparerCartes(t ? gAplatir(R, gCommit(R, t).arbre) : {}, gIndexCarte(gIndex(R))).length > 0; }
/* HEAD détaché : « at abc1234 » ou « from v1.0 » (le reflog dit d'où l'on est parti). */
function gDetacheDepuis(R){
	var l = gReflogLire(R, "HEAD"), t = gTete(R);
	for (var i = 0; i < l.length; i++){
		var m = /^checkout: moving from \S+ to (\S+)$/.exec(l[i].message);
		if (m){
			var cible = m[1], ref = gNomRef(R, cible);
			var nom = ref && ref !== "HEAD" && /^refs\/(heads|tags|remotes)\//.test(ref) ? cible : gCourt(R, l[i].nouveau);
			return { nom: nom, bouge: l[i].nouveau !== t };
		}
	}
	return { nom: gCourt(R, t), bouge: false };
}

GIT_SOUS_COMMANDES.status = function(ctx){
	var op = gOptions(ctx.args, { "-s|--short": "b", "-b|--branch": "b", "--porcelain": "o", "-u|--untracked-files": "o", "--ignored": "b", "-v|--verbose": "b", "--long": "b", "--show-stash": "b" }, "status");
	var R = ctx.travail();
	var specs = gPathspecs(ctx, op.p.concat(op.apres || []));
	ctx.ev.court = !!(op.o.short || op.o.porcelain);
	if (op.o.short || op.o.porcelain){
		var et = gEtatDepot(R), l = [];
		if (op.o.branch){
			var br = et.branche, t = "## ";
			if (!et.tete) t += "No commits yet on " + br;
			else if (!br) t += "HEAD (no branch)";
			else {
				t += br;
				var am = gTexteAmont(R, br, true);
				if (am){ t += "..." + am.nom; if (am.parti) t += " [gone]"; else if (am.devant || am.derriere) t += " [" + (am.devant ? "ahead " + am.devant : "") + (am.devant && am.derriere ? ", " : "") + (am.derriere ? "behind " + am.derriere : "") + "]"; }
			}
			l.push(t);
		}
		var chemins = {}, renommes = {};
		gIndexeesAvecRenommages(R, et).forEach(function(x){ chemins[x.chemin] = chemins[x.chemin] || [" ", " "]; chemins[x.chemin][0] = x.etat; if (x.ancien) renommes[x.chemin] = x.ancien; });
		et.modifiees.forEach(function(x){ if (et.conflits.indexOf(x.chemin) > -1) return; chemins[x.chemin] = chemins[x.chemin] || [" ", " "]; chemins[x.chemin][1] = x.etat; });
		var ci = gConflitsIndex(gIndex(R));
		et.conflits.forEach(function(p){ var s = ci[p] || {}; chemins[p] = s[2] && s[3] ? (s[1] ? ["U", "U"] : ["A", "A"]) : s[2] ? ["U", "D"] : s[3] ? ["D", "U"] : ["U", "U"]; });
		Object.keys(chemins).sort().forEach(function(p){ if (gCorrespond(specs, p)) l.push(chemins[p].join("") + " " + (renommes[p] ? ctx.aff(renommes[p]) + " -> " : "") + gCiter(ctx.aff(p), true)); });
		gRegrouperNonSuivis(R, et.nonSuivies.filter(function(p){ return gCorrespond(specs, p); })).forEach(function(p){ l.push("?? " + gCiter(ctx.aff(p), true)); });
		if (op.o.ignored){ var juge = gJugeIgnore(R); Object.keys(gFichiersTravail(R)).filter(function(p){ return !gIndexCarte(gIndex(R))[p] && juge(p, false); }).forEach(function(p){ l.push("!! " + gCiter(ctx.aff(p), true)); }); }
		return l.join("\n");
	}
	var texte = gTexteStatut(ctx, R, { specs: specs });
	if (op.o["show-stash"]){ var n = gReflogLire(R, "refs/stash").length; if (n) texte += "\nYour stash currently has " + n + " entr" + (n > 1 ? "ies" : "y"); }
	return texte;
};

/* ================================================================== */
/* add, rm, mv, restore                                                */
/* ================================================================== */

/* Met des chemins dans l'index (les fichiers présents) ou les en retire (absents). */
function gIndexer(R, chemins, travail){
	var idx = gIndex(R), carte = {};
	idx.forEach(function(e){ if (chemins.indexOf(e.p) === -1) carte[e.p + "\u0000" + e.s] = e; });
	chemins.forEach(function(p){
		var it = travail[p];
		if (!it) return;
		var h = gObjetEcrire(R, "blob", gContenu(it));
		carte[p + "\u0000" + 0] = { p: p, h: h, m: gModeItem(it), s: 0 };
	});
	gIndexEcrire(R, Object.keys(carte).map(function(k){ return carte[k]; }));
}

GIT_SOUS_COMMANDES.add = function(ctx){
	var op = gOptions(ctx.args, { "-A|--all": "b", "-u|--update": "b", "-n|--dry-run": "b", "-v|--verbose": "b", "-f|--force": "b", "-p|--patch": "b", "-i|--interactive": "b", "-N|--intent-to-add": "b", "--ignore-errors": "b", "-e|--edit": "b" }, "add");
	var R = ctx.travail();
	var brut = op.p.concat(op.apres || []);
	if (op.o.patch || op.o.interactive) return gAddPatch(ctx, R, brut);
	if (!brut.length && !op.o.all && !op.o.update){
		ctx.err("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?\nhint: Turn this message off by running\nhint: \"git config advice.addEmptyPathspec false\"");
		return "";
	}
	var specs = gPathspecs(ctx, brut);
	if (!brut.length && (op.o.all || op.o.update)) specs = [];
	var travail = gFichiersTravail(R), idx = gIndexCarte(gIndex(R)), conflits = gConflitsIndex(gIndex(R)), juge = gJugeIgnore(R);
	var choisis = [], ignores = [];
	specs.forEach(function(s){
		var touche = false;
		Object.keys(travail).forEach(function(p){ if (s.tester(p)){ touche = true; } });
		Object.keys(idx).concat(Object.keys(conflits)).forEach(function(p){ if (s.tester(p)) touche = true; });
		if (!touche){
			// Un fichier ignoré nommé explicitement.
			if (!s.rel || !travail[s.rel]) throw new GitErreur("fatal: pathspec '" + s.brut + "' did not match any files", 128);
		}
	});
	var candidats = {};
	Object.keys(travail).forEach(function(p){ if (gCorrespond(specs, p)) candidats[p] = true; });
	Object.keys(idx).concat(Object.keys(conflits)).forEach(function(p){ if (gCorrespond(specs, p)) candidats[p] = true; });
	Object.keys(candidats).sort().forEach(function(p){
		var suivi = !!idx[p] || !!conflits[p];
		if (op.o.update && !suivi) return;
		if (!suivi && !op.o.force){
			var v = juge(p, false);
			if (v){ if (specs.some(function(s){ return s.rel === p || (!/[*?[]/.test(s.brut) && s.rel !== "" && p.indexOf(s.rel + "/") === 0 && false); })) ignores.push(p); return; }
		}
		choisis.push(p);
	});
	if (ignores.length && !choisis.length){
		throw new GitErreur("The following paths are ignored by one of your .gitignore files:\n" + ignores.join("\n") + "\nhint: Use -f if you really want to add them.\nhint: Turn this message off by running\nhint: \"git config advice.addIgnoredFile false\"", 1);
	}
	if (ignores.length) ctx.err("The following paths are ignored by one of your .gitignore files:\n" + ignores.join("\n") + "\nhint: Use -f if you really want to add them.\nhint: Turn this message off by running\nhint: \"git config advice.addIgnoredFile false\"");
	var lignes = [];
	var changes = choisis.filter(function(p){
		var it = travail[p];
		if (!it) return !!idx[p] || !!conflits[p];
		return !idx[p] || conflits[p] || idx[p].h !== gHashTravail(R, it) || idx[p].m !== gModeItem(it);
	});
	if (op.o["dry-run"]) return changes.map(function(p){ return (travail[p] ? "add '" : "remove '") + ctx.aff(p) + "'"; }).join("\n");
	gIndexer(R, changes, travail);
	if (op.o.verbose) changes.forEach(function(p){ lignes.push((travail[p] ? "add '" : "remove '") + ctx.aff(p) + "'"); });
	ctx.ev.chemins = changes;
	ctx.ev.resolus = changes.filter(function(p){ return !!conflits[p]; });
	if (ignores.length) ctx.code = 1;
	return lignes.join("\n");
};

/* git add -p : hunk par hunk, avec les questions du vrai (y, n, q, a, d, s). */
function gAddPatch(ctx, R, brut){
	var specs = gPathspecs(ctx, brut);
	var travail = gFichiersTravail(R), idx = gIndexCarte(gIndex(R));
	var fichiers = Object.keys(idx).sort().filter(function(p){ return gCorrespond(specs, p) && travail[p] && gHashTravail(R, travail[p]) !== idx[p].h; });
	if (!fichiers.length) return "No changes.";
	// La file des questions : chaque fichier, chaque hunk.
	var file = [];
	fichiers.forEach(function(p){
		var a = gLignes(gObjet(R, idx[p].h).c), b = gLignes(gContenu(travail[p]));
		var hunks = gHunks(a, b);
		hunks.forEach(function(h, i){ file.push({ p: p, a: a, b: b, h: h, i: i, n: hunks.length }); });
	});
	var acceptes = {};
	var sortie = [];
	function appliquer(){
		var parFichier = {};
		Object.keys(acceptes).forEach(function(k){ var x = acceptes[k]; (parFichier[x.p] = parFichier[x.p] || { a: x.a, l: [] }).l.push(x.h); });
		var aIndexer = [];
		Object.keys(parFichier).forEach(function(p){
			var f = parFichier[p], res = [], ia = 0;
			f.l.sort(function(x, y){ return x.a0 - y.a0; }).forEach(function(h){
				h.blocs.forEach(function(bl){
					while (ia < bl.a0){ res.push(f.a[ia]); ia++; }
					var nb = h.lignes; // on reconstruit depuis le bloc
					ia = bl.a1;
					for (var y = bl.b0; y < bl.b1; y++) res.push(h.b[y]);
				});
			});
			while (ia < f.a.length){ res.push(f.a[ia]); ia++; }
			var hh = gObjetEcrire(R, "blob", res.join(""));
			aIndexer.push({ p: p, h: hh });
		});
		var entrees = gIndex(R).map(function(e){ var x = aIndexer.filter(function(y){ return y.p === e.p && !e.s; })[0]; return x ? { p: e.p, h: x.h, m: e.m, s: 0 } : e; });
		gIndexEcrire(R, entrees);
		ctx.ev.chemins = aIndexer.map(function(x){ return x.p; });
		ctx.ev.patch = true;
	}
	file.forEach(function(q){ q.h.b = q.b; });
	var k = 0, dejaEntete = {};
	function question(){
		if (k >= file.length){ appliquer(); return finir(); }
		var q = file[k];
		var texte = [];
		if (!dejaEntete[q.p]){ dejaEntete[q.p] = true; texte.push("diff --git a/" + q.p + " b/" + q.p, "index " + gCourt(R, idx[q.p].h) + ".." + gCourt(R, gHashObjet("blob", gContenu(travail[q.p]))) + " " + idx[q.p].m, "--- a/" + q.p, "+++ b/" + q.p); }
		texte = texte.concat(gTexteHunk(q.h));
		var invite = "(" + (q.i + 1) + "/" + q.n + ") Stage this hunk [y,n,q,a,d" + (q.i + 1 < q.n ? ",j,J" : "") + ",e,?]? ";
		if (typeof term === "undefined" || !term.demander){ return finir(); }
		term.echo(texte.join("\n"));
		term.demander(invite, false, function(r){
			r = String(r || "").trim().charAt(0).toLowerCase();
			if (r === "y"){ acceptes[k] = q; k++; }
			else if (r === "n" || r === "j"){ k++; }
			else if (r === "a"){ for (var z = k; z < file.length && file[z].p === q.p; z++) acceptes[z] = file[z]; k = z; }
			else if (r === "d"){ while (k < file.length && file[k].p === q.p) k++; }
			else if (r === "q"){ k = file.length; }
			else if (r === "?" || r === "e" || r === ""){
				term.echo("y - stage this hunk\nn - do not stage this hunk\nq - quit; do not stage this hunk or any of the remaining ones\na - stage this hunk and all later hunks in the file\nd - do not stage this hunk or any of the later hunks in the file\nj - leave this hunk undecided, see next undecided hunk\n? - print help");
			}
			else { k++; }
			question();
		});
	}
	function finir(){ gEvenement(ctx, true); if (typeof Shell !== "undefined" && Shell.fin) Shell.fin(); return ""; }
	if (!ctx.io.tty) throw new GitErreur("fatal: git add -p demande un écran (pas de tuyau).", 128);
	ctx.asynchrone = true;
	question();
	return "";
}

GIT_SOUS_COMMANDES.rm = function(ctx){
	var op = gOptions(ctx.args, { "--cached": "b", "-r": "b", "-f|--force": "b", "-n|--dry-run": "b", "-q|--quiet": "b", "--ignore-unmatch": "b" }, "rm");
	var R = ctx.travail();
	var brut = op.p.concat(op.apres || []);
	if (!brut.length) throw new GitErreur("usage: git rm [-f | --force] [-n] [-r] [--cached] [--ignore-unmatch]\n              [--quiet] [--pathspec-from-file=<file> [--pathspec-file-nul]]\n              [--] [<pathspec>...]", 129);
	var specs = gPathspecs(ctx, brut), idx = gIndex(R), carte = gIndexCarte(idx), travail = gFichiersTravail(R);
	var tete = gTete(R), carteTete = tete ? gAplatir(R, gCommit(R, tete).arbre) : {};
	var choisis = [];
	specs.forEach(function(s){
		var l = idx.filter(function(e){ return s.tester(e.p); }).map(function(e){ return e.p; });
		if (!l.length && !op.o["ignore-unmatch"]) throw new GitErreur("fatal: pathspec '" + s.brut + "' did not match any files", 128);
		if (l.length && !op.o.r && !/[*?[]/.test(s.brut) && l.some(function(p){ return p !== s.rel; })) throw new GitErreur("fatal: not removing '" + s.brut + "' recursively without -r", 128);
		l.forEach(function(p){ if (choisis.indexOf(p) === -1) choisis.push(p); });
	});
	choisis.sort();
	if (!op.o.force){
		var aIndex = [], aLocal = [];
		choisis.forEach(function(p){
			var it = travail[p], e = carte[p];
			var stage = e && (!carteTete[p] || carteTete[p].h !== e.h);
			var local = it && e && gHashTravail(R, it) !== e.h;
			if (op.o.cached){ if (stage && local) aIndex.push(p); }
			else { if (stage && local) aIndex.push(p); else if (stage) aIndex.push(p); else if (local) aLocal.push(p); }
		});
		if (aIndex.length && !op.o.cached && aIndex.some(function(p){ var it = travail[p]; return it && gHashTravail(R, it) === carte[p].h; })){
			var ok = aIndex.filter(function(p){ var it = travail[p]; return it && gHashTravail(R, it) === carte[p].h; });
			throw new GitErreur("error: the following file" + (ok.length > 1 ? "s have" : " has") + " changes staged in the index:\n" + ok.map(function(p){ return "    " + ctx.aff(p); }).join("\n") + "\n(use --cached to keep the file, or -f to force removal)", 1);
		}
		var deux = aIndex.filter(function(p){ var it = travail[p]; return it && gHashTravail(R, it) !== carte[p].h; });
		if (deux.length) throw new GitErreur("error: the following file" + (deux.length > 1 ? "s have" : " has") + " staged content different from both the\nfile and the HEAD:\n" + deux.map(function(p){ return "    " + ctx.aff(p); }).join("\n") + "\n(use -f to force removal)", 1);
		if (aLocal.length) throw new GitErreur("error: the following file" + (aLocal.length > 1 ? "s have" : " has") + " local modifications:\n" + aLocal.map(function(p){ return "    " + ctx.aff(p); }).join("\n") + "\n(use --cached to keep the file, or -f to force removal)", 1);
	}
	if (op.o["dry-run"]) return choisis.map(function(p){ return "rm '" + p + "'"; }).join("\n");
	gIndexEcrire(R, idx.filter(function(e){ return choisis.indexOf(e.p) === -1; }));
	if (!op.o.cached) choisis.forEach(function(p){ gRetirerTravail(R, p); });
	ctx.ev.chemins = choisis; ctx.ev.cached = !!op.o.cached;
	return op.o.quiet ? "" : choisis.map(function(p){ return "rm '" + p + "'"; }).join("\n");
};

GIT_SOUS_COMMANDES.mv = function(ctx){
	var op = gOptions(ctx.args, { "-f|--force": "b", "-n|--dry-run": "b", "-k": "b", "-v|--verbose": "b" }, "mv");
	var R = ctx.travail();
	if (op.p.length < 2) throw new GitErreur("usage: git mv [<options>] <source>... <destination>", 129);
	var dest = ctx.rel(op.p[op.p.length - 1]);
	var sources = op.p.slice(0, -1).map(function(s){ return ctx.rel(s); });
	var idx = gIndex(R), carte = gIndexCarte(idx);
	var destDossier = gNoeud(R.top, dest) instanceof Room;
	var mouvements = [];
	sources.forEach(function(s, i){
		var brut = op.p[i];
		var fichiers = Object.keys(carte).filter(function(p){ return p === s || p.indexOf(s + "/") === 0; });
		if (!gNoeud(R.top, s)) throw new GitErreur("fatal: bad source, source=" + brut + ", destination=" + op.p[op.p.length - 1], 128);
		if (!fichiers.length) throw new GitErreur("fatal: not under version control, source=" + brut + ", destination=" + op.p[op.p.length - 1], 128);
		var cible = destDossier ? (dest ? dest + "/" : "") + s.split("/").pop() : dest;
		if (gNoeud(R.top, cible) && !op.o.force && !destDossier) throw new GitErreur("fatal: destination exists, source=" + brut + ", destination=" + op.p[op.p.length - 1], 128);
		mouvements.push({ s: s, d: cible, fichiers: fichiers });
	});
	if (op.o["dry-run"]) return mouvements.map(function(m){ return "Renaming " + m.s + " to " + m.d; }).join("\n");
	var travail = gFichiersTravail(R), nouveaux = idx.slice();
	mouvements.forEach(function(m){
		m.fichiers.forEach(function(p){
			var np = m.d + p.substring(m.s.length);
			var it = travail[p];
			if (it){
				var contenu = gContenu(it), mode = gModeItem(it);
				gRetirerTravail(R, p);
				gEcrireTravailTexte(R, np, contenu, mode);
			}
			nouveaux = nouveaux.map(function(e){ return e.p === p ? { p: np, h: e.h, m: e.m, s: e.s } : e; });
		});
	});
	gIndexEcrire(R, nouveaux);
	ctx.ev.mouvements = mouvements.map(function(m){ return { de: m.s, vers: m.d }; });
	return op.o.verbose ? mouvements.map(function(m){ return "Renaming " + m.s + " to " + m.d; }).join("\n") : "";
};

GIT_SOUS_COMMANDES.restore = function(ctx){
	var op = gOptions(ctx.args, { "-S|--staged": "b", "-W|--worktree": "b", "-s|--source": "v", "-p|--patch": "b", "--ours": "b", "--theirs": "b", "-q|--quiet": "b", "--ignore-unmerged": "b", "-m|--merge": "b" }, "restore");
	var R = ctx.travail();
	var brut = op.p.concat(op.apres || []);
	if (!brut.length) throw new GitErreur("fatal: you must specify path(s) to restore", 128);
	var specs = gPathspecs(ctx, brut);
	var staged = !!op.o.staged, worktree = !!op.o.worktree || !staged;
	var source;
	if (op.o.source) source = gAplatir(R, gResoudre(R, op.o.source, { commit: true }));
	var tete = gTete(R), carteTete = tete ? gAplatir(R, gCommit(R, tete).arbre) : {};
	var idx = gIndex(R), carteIdx = gIndexCarte(idx), conflits = gConflitsIndex(idx), travail = gFichiersTravail(R);
	var srcIndex = source || (staged ? carteTete : carteIdx);
	if (staged && !tete && !source){ /* restore --staged sur un dépôt sans commit : retire de l'index */ }
	var touches = [];
	specs.forEach(function(s){
		var l = {};
		[srcIndex, carteIdx, worktree ? travail : {}, carteTete, conflits].forEach(function(c){ Object.keys(c).forEach(function(p){ if (s.tester(p)) l[p] = true; }); });
		if (!Object.keys(l).length) throw new GitErreur("error: pathspec '" + s.brut + "' did not match any file(s) known to git", 1);
		Object.keys(l).forEach(function(p){ if (touches.indexOf(p) === -1) touches.push(p); });
	});
	touches.sort();
	var aDire = [];
	if (staged){
		var src = source || carteTete;
		var nouveaux = idx.filter(function(e){ return touches.indexOf(e.p) === -1; });
		touches.forEach(function(p){ if (src[p]) nouveaux.push({ p: p, h: src[p].h, m: src[p].m, s: 0 }); });
		gIndexEcrire(R, nouveaux);
	}
	if (worktree){
		var depuis = source || (staged ? (source || carteTete) : gIndexCarte(gIndex(R)));
		touches.forEach(function(p){
			if (conflits[p] && !source && !staged){
				var etage = op.o.ours ? 2 : op.o.theirs ? 3 : 0;
				if (!etage){ aDire.push("error: path '" + ctx.aff(p) + "' is unmerged"); return; }
				if (conflits[p][etage]) gPoserTravail(R, p, conflits[p][etage].h, conflits[p][etage].m);
				return;
			}
			if (depuis[p]) gPoserTravail(R, p, depuis[p].h, depuis[p].m);
			else if (travail[p] && (carteIdx[p] || carteTete[p] || source)) gRetirerTravail(R, p);
		});
	}
	if (aDire.length){ aDire.forEach(function(m){ ctx.err(m); }); ctx.code = 1; }
	ctx.ev.chemins = touches; ctx.ev.staged = staged; ctx.ev.worktree = worktree; ctx.ev.source = op.o.source || null;
	return "";
};

/* ================================================================== */
/* commit                                                              */
/* ================================================================== */

/* Lance un hook du dépôt (s'il existe et qu'il est exécutable) : { code, sortie }, ou null. */
function gHook(R, nom, args, entree){
	var it = gItem(R.git, "hooks/" + nom);
	if (!it || !/^..x/.test(it.mode || "")) return null;
	var texte = gContenu(it);
	if (typeof Interpreteur === "undefined" || !Interpreteur.lancerScript) return null;
	var io = { stdin: entree === undefined ? null : entree, stdinSansFin: false, tty: false, sudo: false, racine: false, erreurs: [], code: 0 };
	io.err = function(m){ io.erreurs.push(m); };
	io.errFin = function(m){ io.erreurs.push(m); };
	var avant = current_room, sortie = "";
	try {
		if (R.top) current_room = R.top;
		Shell.profondeur_script = (Shell.profondeur_script || 0) + 1;
		try { sortie = Interpreteur.lancerScript(texte, io, { nom0: ".git/hooks/" + nom, nomScript: nom, positionnels: args || [] }) || ""; }
		catch (e){ if (e instanceof ShellError){ io.erreurs.push(e.message); io.code = e.code || 1; } else throw e; }
		finally { Shell.profondeur_script--; }
	} finally { current_room = avant; }
	var tout = [String(sortie || "")].concat(io.erreurs).filter(function(x){ return x !== ""; }).join("\n");
	return { code: io.code || 0, sortie: tout };
}
/* Écrit un commit depuis l'index : { hash, racine, changes }. options : message, parents, amend, signer, auteur, date. */
function gCommitDepuisIndex(R, options){
	var idx = gIndex(R);
	if (Object.keys(gConflitsIndex(idx)).length) throw new GitErreur("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.", 128);
	var carte = gIndexCarte(idx);
	var arbre = gArbreDepuisCarte(R, carte);
	var auteurId = options.auteur || gIdentite(R, "author"), commId = gIdentite(R, "committer");
	var da = options.dateAuteur || gDateCommit(R, "author"), dc = gDateCommit(R, "committer");
	var c = { arbre: arbre, parents: options.parents, auteur: { nom: auteurId.nom, mail: auteurId.mail, s: da.s, tz: da.tz }, commiteur: { nom: commId.nom, mail: commId.mail, s: dc.s, tz: dc.tz }, message: options.message, gpgsig: null };
	var signer = options.signer;
	if (signer === undefined) signer = gConfigVrai(R, "commit.gpgsign", false);
	if (signer){
		var cle = gConfig(R, "user.signingkey");
		var fmt = gConfig(R, "gpg.format") || "openpgp";
		if (fmt !== "ssh") throw new GitErreur("error: gpg failed to sign the data:\n[GNUPG:] KEY_CONSIDERED\ngpg: signing failed: No secret key\n\nfatal: failed to write commit object" + "\n" + C.gris("(Ici, on signe avec une clé ssh : git config gpg.format ssh, puis git config user.signingkey ~/.ssh/id_ed25519.pub.)"), 128);
		if (!cle) throw new GitErreur("error: user.signingKey needs to be set for ssh signing\n\nfatal: failed to write commit object", 128);
		var r = gChemin(R.top || R.git, cle), texteCle = null;
		if (r && r.noeud instanceof Item) texteCle = gContenu(r.noeud).trim();
		else if (/^ssh-/.test(cle) || /^key::/.test(cle)) texteCle = cle.replace(/^key::/, "");
		if (!texteCle || !gBlobCle(texteCle)) throw new GitErreur("error: Couldn't load public key " + cle + ": No such file or directory?\n\nfatal: failed to write commit object", 128);
		var priv = r && r.noeud instanceof Item ? r.dir.getItemFromName(r.nom.replace(/\.pub$/, "")) : -1;
		if (r && r.noeud instanceof Item && /\.pub$/.test(r.nom) && priv === -1) throw new GitErreur("error: Load key \"" + cle.replace(/\.pub$/, "") + "\": No such file or directory\n\nfatal: failed to write commit object", 128);
		c.gpgsig = gSigner(gTexteCommit(c), texteCle);
	}
	var hash = gObjetEcrire(R, "commit", gTexteCommit(c));
	return { hash: hash, arbre: arbre, carte: carte, commit: c };
}
/* Le résumé de git commit : « [main abc1234] message » et le --stat court. */
function gResumeCommit(R, hash, options){
	options = options || {};
	var c = gCommit(R, hash), br = gBrancheCourante(R);
	var parent = c.parents[0];
	var tete = "[" + (br || "detached HEAD") + (c.parents.length === 0 ? " (root-commit)" : "") + " " + gCourt(R, hash) + "] " + gSujet(c.message);
	var l = [tete];
	if (options.amend || c.auteur.s !== c.commiteur.s) l.push(" Date: " + gDateTexte(c.auteur.s, c.auteur.tz));
	if (c.parents.length > 1) return l.join("\n");
	var changes = gRenommages(R, gComparerCartes(parent ? gAplatir(R, gCommit(R, parent).arbre) : {}, gAplatir(R, c.arbre)));
	var st = gStat(R, changes);
	if (st) l.push(st.split("\n").pop());
	else l.push(" 0 files changed");
	l = l.concat(gResumeModes(changes));
	return l.join("\n");
}
function gMessageModele(R, ctx, options){
	var l = [];
	if (options.message) l.push(options.message.replace(/\n$/, ""));
	l.push("", "# Please enter the commit message for your changes. Lines starting", "# with '#' will be ignored, and an empty message aborts the commit.", "#");
	if (options.date) l.push("# Date:      " + gDateTexte(options.date.s, options.date.tz), "#");
	var et = gEtatDepot(R);
	if (et.branche) l.push("# On branch " + et.branche); else l.push("# HEAD detached at " + gCourt(R, et.tete));
	if (et.etat === "fusion") l.push("#", "# It looks like you may be committing a merge.", "# If this is not correct, please run", "#\tgit update-ref -d MERGE_HEAD", "# and try again.", "#");
	var ind = et.indexees;
	if (options.amend){ var t = gTete(R), p = gCommit(R, t).parents[0]; ind = gComparerCartes(p ? gAplatir(R, gCommit(R, p).arbre) : {}, gIndexCarte(gIndex(R))).map(function(x){ return { chemin: x.chemin, etat: !x.a ? "A" : !x.b ? "D" : "M" }; }); }
	var noms = { A: "new file:   ", M: "modified:   ", D: "deleted:    " };
	if (!et.tete) l.push("#", "# Initial commit");
	if (ind.length){ l.push("#", "# Changes to be committed:"); ind.forEach(function(x){ l.push("#\t" + noms[x.etat] + x.chemin); }); }
	if (et.modifiees.length){ l.push("#", "# Changes not staged for commit:"); et.modifiees.forEach(function(x){ l.push("#\t" + noms[x.etat] + x.chemin); }); }
	if (et.nonSuivies.length){ l.push("#", "# Untracked files:"); gRegrouperNonSuivis(R, et.nonSuivies).forEach(function(x){ l.push("#\t" + x); }); }
	l.push("#");
	return l.join("\n") + "\n";
}

GIT_SOUS_COMMANDES.commit = function(ctx){
	var op = gOptions(ctx.args, { "-m|--message": "l", "-a|--all": "b", "--amend": "b", "--no-edit": "b", "-e|--edit": "b", "-S|--gpg-sign": "b", "--no-gpg-sign": "b", "--allow-empty": "b", "--allow-empty-message": "b", "-v|--verbose": "b",
		"-q|--quiet": "b", "-n|--no-verify": "b", "-F|--file": "v", "-C|--reuse-message": "v", "--author": "v", "--date": "v", "--fixup": "v", "--squash": "v", "-s|--signoff": "b", "--dry-run": "b", "-o|--only": "b", "-i|--include": "b", "--reset-author": "b", "-p|--patch": "b", "--short": "b", "--status": "b", "--cleanup": "v" }, "commit");
	var R = ctx.travail();
	var et = gEtatDepot(R);
	if (et.etat === "rebase" && !op.o.amend){ /* un commit pendant un rebase arrêté : permis */ }
	if (et.conflits.length){
		throw new GitErreur("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.", 128);
	}
	if (op.o.amend && !et.tete) throw new GitErreur("fatal: You have nothing to amend.", 128);
	if (op.o.amend && et.etat === "fusion") throw new GitErreur("fatal: You are in the middle of a merge -- cannot amend.", 128);
	var specs = gPathspecs(ctx, op.p.concat(op.apres || []));
	// -a : tout ce qui est suivi et modifié (ou supprimé) part à l'index.
	if (op.o.all){
		if (specs.length) throw new GitErreur("fatal: paths '" + op.p.join(" ") + " ...' with -a does not make sense", 128);
		var travail = gFichiersTravail(R), carte = gIndexCarte(gIndex(R));
		gIndexer(R, Object.keys(carte).filter(function(p){ return !travail[p] || gHashTravail(R, travail[p]) !== carte[p].h || gModeItem(travail[p]) !== carte[p].m; }), travail);
	} else if (specs.length){
		// git commit FICHIER : seulement ces fichiers (comme --only).
		var trav = gFichiersTravail(R), c2 = gIndexCarte(gIndex(R));
		var l = Object.keys(c2).concat(Object.keys(trav)).filter(function(p, i, t){ return t.indexOf(p) === i && gCorrespond(specs, p) && (c2[p] || false); });
		if (!l.length) throw new GitErreur("error: pathspec '" + specs[0].brut + "' did not match any file(s) known to git", 1);
		gIndexer(R, l, trav);
	}
	var tete = et.tete;
	var parents = op.o.amend ? gCommit(R, tete).parents.slice() : (tete ? [tete] : []);
	var mergeHead = gRefBrute(R, "MERGE_HEAD");
	if (!op.o.amend && mergeHead) gLire(R.git, "MERGE_HEAD").split("\n").filter(Boolean).forEach(function(h){ parents.push(h.trim()); });
	// Rien à valider ?
	var carteParent = parents.length ? gAplatir(R, gCommit(R, op.o.amend ? (parents[0] || null) : parents[0]).arbre) : {};
	if (op.o.amend && !parents.length) carteParent = {};
	var rien = gComparerCartes(op.o.amend ? gAplatir(R, gCommit(R, tete).arbre) : carteParent, gIndexCarte(gIndex(R))).length === 0;
	if (!op.o.amend && rien && !op.o["allow-empty"] && !mergeHead){
		var texte = gTexteStatut(ctx, R, { pourCommit: true });
		ctx.code = 1;
		ctx.ev.rien = true;
		if (op.o["dry-run"]) return texte;
		return texte;
	}
	if (op.o["dry-run"]) return gTexteStatut(ctx, R, { pourCommit: true });
	// Le message.
	var message = null, editer = false;
	if (op.o.message) message = op.o.message.join("\n\n");
	else if (op.o.file){ var rf = gChemin(ctx.lieu, op.o.file); if (!rf || !(rf.noeud instanceof Item)) throw new GitErreur("fatal: could not read log file '" + op.o.file + "': No such file or directory", 128); message = gContenu(rf.noeud); }
	else if (op.o["reuse-message"]){ message = gCommit(R, gResoudre(R, op.o["reuse-message"], { commit: true })).message; }
	else if (op.o.fixup){ var fx = gResoudre(R, op.o.fixup.replace(/^(amend|reword):/, ""), { commit: true }); message = "fixup! " + gSujet(gCommit(R, fx).message); }
	else if (op.o.squash){ var sq = gResoudre(R, op.o.squash, { commit: true }); message = "squash! " + gSujet(gCommit(R, sq).message); editer = true; }
	else if (op.o.amend){ message = gCommit(R, tete).message; editer = !op.o["no-edit"]; }
	else if (mergeHead){ message = gLire(R.git, "MERGE_MSG") || "Merge"; editer = !op.o["no-edit"]; }
	else editer = true;
	if (op.o.edit) editer = true;
	if (op.o.signoff){ var id0 = gIdentite(R, "committer"); message = (message || "").replace(/\n+$/, "") + "\n\nSigned-off-by: " + id0.nom + " <" + id0.mail + ">\n"; }
	var auteur = null, dateAuteur = null;
	if (op.o.amend && !op.o["reset-author"]){ var ca = gCommit(R, tete).auteur; auteur = { nom: ca.nom, mail: ca.mail }; dateAuteur = { s: ca.s, tz: ca.tz }; }
	if (op.o.author){ var ma = /^(.*?)\s*<([^>]*)>$/.exec(op.o.author); if (!ma) throw new GitErreur("fatal: --author '" + op.o.author + "' is not 'Name <email>' and matches no existing author", 128); auteur = { nom: ma[1], mail: ma[2] }; }
	// Le hook pre-commit, avant l'éditeur (sauf --no-verify).
	if (!op.o["no-verify"]){
		var hk = gHook(R, "pre-commit", []);
		if (hk && hk.code){ ctx.ev.hookRefus = "pre-commit"; ctx.ev.hookSortie = hk.sortie; throw new GitErreur(hk.sortie, 1); }
		if (hk && hk.sortie) ctx.err(hk.sortie);
	}
	var signer = op.o["gpg-sign"] ? true : (op.o["gpg-sign"] === false || op.o["no-gpg-sign"] ? false : undefined);
	function finir(texte){
		var msg = gNettoyerMessage(texte, editer || op.o.cleanup === "strip");
		if (!msg && !op.o["allow-empty-message"]) throw new GitErreur("Aborting commit due to empty commit message.", 1);
		if (!op.o["no-verify"]){
			var hm = gHookMessage(R, msg);
			if (hm && hm.code){ ctx.ev.hookRefus = "commit-msg"; throw new GitErreur(hm.sortie, 1); }
			if (hm && hm.nouveau !== undefined) msg = hm.nouveau;
		}
		var res = gCommitDepuisIndex(R, { message: msg, parents: parents, auteur: auteur, dateAuteur: dateAuteur, signer: signer });
		var sujet = gSujet(msg);
		var genre = op.o.amend ? "commit (amend): " : (mergeHead ? "commit (merge): " : (!tete ? "commit (initial): " : "commit: "));
		gRefEcrire(R, "HEAD", res.hash, genre + sujet);
		if (mergeHead){ ["MERGE_HEAD", "MERGE_MSG", "MERGE_MODE", "AUTO_MERGE"].forEach(function(n){ gRefSupprimer(R, n); }); }
		if (gRefBrute(R, "CHERRY_PICK_HEAD")) gRefSupprimer(R, "CHERRY_PICK_HEAD");
		if (gRefBrute(R, "REVERT_HEAD")) gRefSupprimer(R, "REVERT_HEAD");
		ctx.ev.hash = res.hash; ctx.ev.parents = parents.slice(); ctx.ev.message = msg; ctx.ev.amend = !!op.o.amend; ctx.ev.fusion = !!mergeHead;
		ctx.ev.signe = !!res.commit.gpgsig; ctx.ev.fichiers = gComparerCartes(parents.length ? gAplatir(R, gCommit(R, parents[0]).arbre) : {}, res.carte).map(function(x){ return x.chemin; });
		ctx.ev.branche = gBrancheCourante(R);
		if (op.o.quiet) return "";
		return gResumeCommit(R, res.hash, { amend: !!op.o.amend });
	}
	if (!editer) return finir(message);
	var modele = gMessageModele(R, ctx, { message: message, amend: !!op.o.amend, date: op.o.amend ? dateAuteur : null });
	return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, ligneDepart: 0, fin: function(t){ gEcrire(R.git, "COMMIT_EDITMSG", t); return finir(t); } });
};
/* Le hook commit-msg : il lit (et peut réécrire) .git/COMMIT_EDITMSG. */
function gHookMessage(R, msg){
	var it = gItem(R.git, "hooks/commit-msg");
	if (!it || !/^..x/.test(it.mode || "")) return null;
	gEcrire(R.git, "COMMIT_EDITMSG", msg);
	var r = gHook(R, "commit-msg", [".git/COMMIT_EDITMSG"]);
	if (!r) return null;
	if (!r.code){ var n = gLire(R.git, "COMMIT_EDITMSG"); if (n !== null && n !== msg) r.nouveau = gNettoyerMessage(n, true); }
	return r;
}

/* ================================================================== */
/* log, show, diff, blame                                              */
/* ================================================================== */

/* Les décorations d'un commit : « HEAD -> main, tag: v1, origin/main, feature ». */
function gDecorations(R, complet){
	var d = {}, br = gBrancheCourante(R), t = gTete(R);
	if (complet){
		// --decorate=full : les noms complets (refs/heads/main, tag: refs/tags/v1).
		var tous = gRefs(R, "refs/").filter(function(r){ return r.nom !== "refs/stash"; });
		tous.sort(function(a, b){ return a.nom < b.nom ? 1 : a.nom > b.nom ? -1 : 0; });
		tous.forEach(function(r){
			var h = r.nom.indexOf("refs/tags/") === 0 ? gPeler(R, r.hash, "commit") : r.hash;
			if (!h || r.nom === "refs/heads/" + br) return;
			(d[h] = d[h] || []).push((r.nom.indexOf("refs/tags/") === 0 ? "tag: " : "") + r.nom);
		});
		if (t) d[t] = [br ? "HEAD -> refs/heads/" + br : "HEAD"].concat(d[t] || []);
		return d;
	}
	var refs = gRefs(R, "refs/").filter(function(r){ return !/^refs\/stash$/.test(r.nom); });
	// L'ordre du vrai : HEAD -> branche courante, puis les refs en ordre alphabétique inverse.
	refs.sort(function(a, b){ return a.nom < b.nom ? 1 : a.nom > b.nom ? -1 : 0; });
	refs.forEach(function(r){
		var h = r.nom.indexOf("refs/tags/") === 0 ? gPeler(R, r.hash, "commit") : r.hash;
		if (!h) return;
		if (r.nom === "refs/heads/" + br) return;
		var nom = r.nom.replace(/^refs\/heads\//, "").replace(/^refs\/remotes\//, "").replace(/^refs\/tags\//, "tag: ");
		(d[h] = d[h] || []).push(nom);
	});
	if (t){ d[t] = [br ? "HEAD -> " + br : "HEAD"].concat(d[t] || []); }
	return d;
}
function gTexteDecor(dec, h){ return dec && dec[h] && dec[h].length ? " (" + dec[h].join(", ") + ")" : ""; }

/* Les options de --pretty / --format : %H %h %T %t %P %p %an %ae %ad %ar %cn %ce %cd %cr %s %b %B %d %D %n %% %G? */
function gFormater(R, h, format, dec, opts){
	var c = gCommit(R, h);
	var maintenant = gSecondes(R);
	return format.replace(/%(H|h|T|t|P|p|an|ae|ad|ar|as|at|cn|ce|cd|cr|cs|ct|s|b|B|d|D|n|%|G\?|GK|GF|C\([a-z]+\)|Creset|Cred|Cgreen|Cblue|Cyellow)/g, function(m, x){
		switch (x){
			case "H": return h; case "h": return gCourt(R, h); case "T": return c.arbre; case "t": return gCourt(R, c.arbre);
			case "P": return c.parents.join(" "); case "p": return c.parents.map(function(p){ return gCourt(R, p); }).join(" ");
			case "an": return c.auteur.nom; case "ae": return c.auteur.mail; case "ad": return gDateSelon(c.auteur.s, c.auteur.tz, opts && opts.date, maintenant); case "ar": return gDateRelative(c.auteur.s, maintenant);
			case "as": return gDateCourte(c.auteur.s, c.auteur.tz); case "at": return String(c.auteur.s);
			case "cn": return c.commiteur.nom; case "ce": return c.commiteur.mail; case "cd": return gDateSelon(c.commiteur.s, c.commiteur.tz, opts && opts.date, maintenant); case "cr": return gDateRelative(c.commiteur.s, maintenant);
			case "cs": return gDateCourte(c.commiteur.s, c.commiteur.tz); case "ct": return String(c.commiteur.s);
			case "s": return gSujet(c.message); case "b": var i = c.message.indexOf("\n\n"); return i > -1 ? c.message.substring(i + 2) : ""; case "B": return c.message;
			case "d": return gTexteDecor(dec || gDecorations(R), h); case "D": var dd = (dec || gDecorations(R))[h]; return dd ? dd.join(", ") : "";
			case "n": return "\n"; case "%": return "%";
			case "G?": var v = gVerifierSignature(R, h); return { aucune: "N", bonne: "G", inconnue: "U", fausse: "B", sansFichier: "U" }[v.etat] || "N";
			case "GK": case "GF": var w = gVerifierSignature(R, h); return w.empreinte || "";
			default: return "";
		}
	});
}
/* Analyse les révisions d'un log : { inclus, exclus } (A..B, A...B, ^A, --all). */
function gRevisionsLog(R, revs, tous){
	var inclus = [], exclus = [];
	revs.forEach(function(r){
		var m;
		if ((m = /^(.*)\.\.\.(.*)$/.exec(r))){
			var a = gResoudre(R, m[1] || "HEAD", { commit: true }), b = gResoudre(R, m[2] || "HEAD", { commit: true });
			inclus.push(a, b); gBasesFusion(R, a, b).forEach(function(x){ exclus.push(x); });
		} else if ((m = /^(.*)\.\.(.*)$/.exec(r))){
			exclus.push(gResoudre(R, m[1] || "HEAD", { commit: true }));
			inclus.push(gResoudre(R, m[2] || "HEAD", { commit: true }));
		} else if (r.charAt(0) === "^") exclus.push(gResoudre(R, r.substring(1), { commit: true }));
		else inclus.push(gResoudre(R, r, { commit: true }));
	});
	if (tous){
		gRefs(R, "refs/").forEach(function(x){ if (x.nom === "refs/stash") return; var h = gPeler(R, x.hash, "commit"); if (h && gObjet(R, h) && gObjet(R, h).t === "commit") inclus.push(h); });
		var t = gTete(R); if (t) inclus.push(t);
	}
	return { inclus: inclus, exclus: exclus };
}
/* Un commit a-t-il touché un de ces chemins (par rapport à son premier parent) ? */
function gToucheChemins(R, h, specs){
	if (!specs.length) return true;
	var c = gCommit(R, h);
	var A = c.parents.length ? gAplatir(R, gCommit(R, c.parents[0]).arbre) : {}, B = gAplatir(R, c.arbre);
	if (c.parents.length > 1){
		// Une fusion compte si elle diffère de TOUS ses parents sur ces chemins.
		return c.parents.every(function(p){ var P = gAplatir(R, gCommit(R, p).arbre); return gComparerCartes(P, B).some(function(x){ return gCorrespond(specs, x.chemin); }); });
	}
	return gComparerCartes(A, B).some(function(x){ return gCorrespond(specs, x.chemin); });
}
function gChangesCommit(R, h){
	var c = gCommit(R, h);
	return gRenommages(R, gComparerCartes(c.parents.length ? gAplatir(R, gCommit(R, c.parents[0]).arbre) : {}, gAplatir(R, c.arbre)));
}
/* Le bloc d'un commit dans git log (format medium). */
function gBlocCommit(R, h, options, dec){
	var c = gCommit(R, h), l = [];
	// --show-signature : les lignes de la vérification viennent avant le commit, quel que soit le format.
	var sig = options.signature ? gTexteSignature(R, h) : [];
	if (options.oneline) return sig.concat([(options.abrege === false ? h : gCourt(R, h)) + gTexteDecor(dec, h) + " " + gSujet(c.message)]);
	if (options.format !== undefined) return sig.concat([gFormater(R, h, options.format, dec, { date: options.date })]);
	l.push("commit " + h + gTexteDecor(dec, h));
	if (options.signature) l = l.concat(gTexteSignature(R, h));
	if (c.parents.length > 1) l.push("Merge: " + c.parents.map(function(p){ return gCourt(R, p); }).join(" "));
	var dt = function(x){ return gDateSelon(x.s, x.tz, options.relative ? "relative" : options.date, gSecondes(R)); };
	if (options.fuller) l.push("Author:     " + c.auteur.nom + " <" + c.auteur.mail + ">", "AuthorDate: " + dt(c.auteur), "Commit:     " + c.commiteur.nom + " <" + c.commiteur.mail + ">", "CommitDate: " + dt(c.commiteur));
	else if (options.full) l.push("Author: " + c.auteur.nom + " <" + c.auteur.mail + ">", "Commit: " + c.commiteur.nom + " <" + c.commiteur.mail + ">");
	else if (options.court) l.push("Author: " + c.auteur.nom + " <" + c.auteur.mail + ">");
	else l.push("Author: " + c.auteur.nom + " <" + c.auteur.mail + ">", "Date:   " + dt(c.auteur));
	l.push("");
	var msg = gNettoyerMessage(c.message).replace(/\n$/, "").split("\n");
	if (options.court) msg = [msg[0]];
	msg.forEach(function(x){ l.push(x === "" ? "    " : "    " + gDevelopperTabs(x)); });
	return l;
}
function gDevelopperTabs(x){ var s = ""; for (var i = 0; i < x.length; i++){ var ch = x.charAt(i); if (ch === "\t"){ var n = 8 - s.length % 8; s += new Array(n + 1).join(" "); } else s += ch; } return s; }
/* Les --pretty du vrai : oneline, short, medium, full, fuller, format:... et les --format=... */
function gLireFormat(op){
	var f = op.o.pretty !== undefined ? op.o.pretty : op.o.format;
	if (f === undefined || f === true) return {};
	f = String(f);
	if (f === "oneline") return { oneline: true, abrege: !!op.o["abbrev-commit"] };
	if (f === "medium" || f === "") return {};
	if (f === "fuller") return { fuller: true };
	if (f === "short") return { court: true };
	if (f === "full") return { full: true };
	var m = /^(?:format|tformat):(.*)$/.exec(f);
	if (m) return { format: m[1] };
	if (/%/.test(f)) return { format: f };
	throw new GitErreur("fatal: invalid --pretty format: " + f, 128);
}

GIT_SOUS_COMMANDES.log = function(ctx){
	var op = gOptions(ctx.args, { "--oneline": "b", "--graph": "b", "--all": "b", "--decorate": "o", "--no-decorate": "b", "-n|--max-count": "v", "-NOMBRE": "v", "--stat": "b", "-p|-u|--patch": "b", "--author": "v", "--grep": "v", "-S": "v", "-G": "v",
		"--since|--after": "v", "--until|--before": "v", "--format": "v", "--pretty": "o", "--show-signature": "b", "--first-parent": "b", "--reverse": "b", "--name-only": "b", "--name-status": "b", "--merges": "b", "--no-merges": "b",
		"--topo-order": "b", "--date-order": "b", "--abbrev-commit": "b", "--date": "v", "-i|--regexp-ignore-case": "b", "--follow": "b", "--shortstat": "b", "-g|--walk-reflogs": "b", "--branches": "b", "--tags": "b", "--remotes": "b", "--simplify-by-decoration": "b", "--left-right": "b", "--cherry-pick": "b", "--no-walk": "b" }, "log");
	var R = ctx.depot();
	if (op.o["walk-reflogs"]) return GIT_SOUS_COMMANDES.reflog(ctx);
	var t = gTete(R);
	var revs = [], chemins = op.apres ? op.apres.slice() : [];
	op.p.forEach(function(x){
		if (gEssayerRevs(R, x)) revs.push(x);
		else {
			// Un chemin sans -- : il doit exister, sinon l'erreur du vrai.
			if (R.top && gNoeud(R.top, ctx.rel(x) || "") || gIndex(R).some(function(e){ return e.p === ctx.rel(x); })) chemins.push(x);
			else throw gErreurRevision(x);
		}
	});
	if (!revs.length && !op.o.all && !op.o.branches && !op.o.tags && !op.o.remotes){
		if (!t){
			var br = gBrancheCourante(R);
			throw new GitErreur("fatal: your current branch '" + br + "' does not have any commits yet", 128);
		}
		revs = ["HEAD"];
	}
	var rv = gRevisionsLog(R, revs, !!op.o.all);
	if (op.o.branches) gRefs(R, "refs/heads/").forEach(function(r){ rv.inclus.push(r.hash); });
	if (op.o.tags) gRefs(R, "refs/tags/").forEach(function(r){ var h = gPeler(R, r.hash, "commit"); if (h) rv.inclus.push(h); });
	if (op.o.remotes) gRefs(R, "refs/remotes/").forEach(function(r){ if (r.hash) rv.inclus.push(r.hash); });
	var specs = gPathspecs(ctx, chemins);
	var graphe = !!op.o.graph;
	var liste = gParcours(R, rv.inclus, rv.exclus, { premierParent: !!op.o["first-parent"], topo: graphe || !!op.o["topo-order"] });
	var maintenant = gSecondes(R);
	var depuis = op.o.since ? gDateDepuisTexte(op.o.since, maintenant) : null, jusque = op.o.until ? gDateDepuisTexte(op.o.until, maintenant) : null;
	var reAuteur = op.o.author ? gRegexGit(op.o.author, op.o["regexp-ignore-case"]) : null;
	var reGrep = op.o.grep ? gRegexGit(op.o.grep, op.o["regexp-ignore-case"]) : null;
	var filtre = function(h){
		var c = gCommit(R, h);
		if (op.o.merges && c.parents.length < 2) return false;
		if (op.o["no-merges"] && c.parents.length > 1) return false;
		if (depuis !== null && c.commiteur.s < depuis) return false;
		if (jusque !== null && c.commiteur.s > jusque) return false;
		if (reAuteur && !reAuteur.test(c.auteur.nom + " <" + c.auteur.mail + ">")) return false;
		if (reGrep && !reGrep.test(c.message)) return false;
		if (!gToucheChemins(R, h, specs)) return false;
		if (op.o.S !== undefined){
			var compte = function(carte){ var n = 0; Object.keys(carte).forEach(function(p){ if (!gCorrespond(specs, p)) return; var x = gObjet(R, carte[p].h); if (x) n += x.c.split(op.o.S).length - 1; }); return n; };
			var A = c.parents.length ? gAplatir(R, gCommit(R, c.parents[0]).arbre) : {}, B = gAplatir(R, c.arbre);
			if (compte(A) === compte(B)) return false;
		}
		if (op.o.G !== undefined){
			var reG = new RegExp(op.o.G);
			if (!gChangesCommit(R, h).some(function(x){ var ca = x.a ? gObjet(R, x.a.h).c : "", cb = x.b ? gObjet(R, x.b.h).c : ""; return gHunks(gLignes(ca), gLignes(cb), 0).some(function(hk){ return hk.lignes.some(function(l){ return /^[+-]/.test(l) && reG.test(l.substring(1)); }); }); })) return false;
		}
		return true;
	};
	var choisis = liste.filter(filtre);
	var max = op.o["max-count"] !== undefined ? +op.o["max-count"] : (op.o.NOMBRE !== undefined ? +op.o.NOMBRE : null);
	if (max !== null && !isNaN(max)) choisis = choisis.slice(0, Math.max(0, max));
	if (op.o.reverse) choisis.reverse();
	var decorer = op.o["no-decorate"] ? false : (op.o.decorate !== undefined ? op.o.decorate !== false && op.o.decorate !== "no" : (!!ctx.io.tty || gConfig(R, "log.decorate") === "short" || gConfig(R, "log.decorate") === "full" || gConfigVrai(R, "log.decorate", false)));
	var dec = decorer ? gDecorations(R, op.o.decorate === "full" || (op.o.decorate === undefined && gConfig(R, "log.decorate") === "full")) : null;
	var fmt = gLireFormat(op);
	if (op.o.oneline) fmt.oneline = true;
	if (op.o.date === "relative") fmt.relative = true;
	else if (op.o.date) fmt.date = op.o.date;
	fmt.signature = !!op.o["show-signature"];
	var blocs = choisis.map(function(h){
		var l = gBlocCommit(R, h, fmt, dec);
		var compact = fmt.oneline || fmt.format !== undefined;
		var extra = [];
		if (op.o["name-only"] || op.o["name-status"]){ var ch = gChangesCommit(R, h); if (ch.length){ if (!compact) extra.push(""); ch.forEach(function(x){ extra.push(op.o["name-status"] ? (x.ancien ? "R" + ("00" + x.similarite).slice(-3) + "\t" + x.ancien + "\t" + x.chemin : (!x.a ? "A" : !x.b ? "D" : "M") + "\t" + x.chemin) : x.chemin); }); } }
		if (op.o.stat || op.o.shortstat){ var st = gStat(R, gChangesCommit(R, h)); if (st){ extra.push(compact ? "" : ""); extra = extra.concat(op.o.shortstat ? [st.split("\n").pop()] : st.split("\n")); } }
		if (op.o.patch){ var c = gCommit(R, h); if (c.parents.length <= 1){ var d = gChangesCommit(R, h).filter(function(x){ return gCorrespond(specs, x.chemin); }).map(function(x){ return gDiffFichier(R, x.chemin, x.a, x.b, { ancien: x.ancien, similarite: x.similarite }); }); if (d.length){ extra.push(compact ? "" : ""); extra = extra.concat(d.join("\n").split("\n")); } } }
		if (compact && extra.length && extra[0] === "" && !op.o.stat && !op.o.patch) extra.shift();
		return { h: h, l: l.concat(extra), compact: compact };
	});
	// --left-right avec A...B : « < » pour ce qui vient de A, « > » pour ce qui vient de B.
	var sym = op.o["left-right"] ? revs.map(function(r){ return /^(.*?)\.\.\.(.*)$/.exec(r); }).filter(Boolean)[0] : null;
	if (sym){
		var ga = gResoudre(R, sym[1] || "HEAD", { commit: true }), gb = gResoudre(R, sym[2] || "HEAD", { commit: true }), gauche = {};
		gParcours(R, [ga], [gb], {}).forEach(function(x){ gauche[x] = true; });
		blocs.forEach(function(b){
			var m = gauche[b.h] ? "<" : ">";
			if (b.compact) b.l[0] = m + " " + b.l[0];
			else b.l[0] = String(b.l[0]).replace(/^(\x1b\[[0-9;]*m)?commit /, "$1commit " + m + " ");
		});
	}
	ctx.ev.nombre = choisis.length; ctx.ev.graphe = graphe; ctx.ev.tous = !!op.o.all; ctx.ev.oneline = !!fmt.oneline; ctx.ev.options = Object.keys(op.o); ctx.ev.commits = choisis.slice(0, 200);
	if (graphe) return gDessinerGraphe(R, choisis, blocs, { premierParent: !!op.o["first-parent"] });
	var sortie = [];
	blocs.forEach(function(b, i){
		if (i && !b.compact) sortie.push("");
		sortie = sortie.concat(b.l);
	});
	return sortie.join("\n");
};
/* Une expression régulière de --grep / --author (POSIX de base, comme le vrai) ; une expression invalide : l'erreur du vrai. */
function gRegexGit(motif, casse){
	// En BRE, ( ) { } | + ? sont littéraux ; \( \) \{ \} \| sont spéciaux.
	var js = "", s = String(motif);
	for (var i = 0; i < s.length; i++){
		var c = s.charAt(i);
		if (c === "\\" && i + 1 < s.length){ var d = s.charAt(++i); js += "(){}|+?".indexOf(d) > -1 ? d : "\\" + d; }
		else if ("(){}|+?".indexOf(c) > -1) js += "\\" + c;
		else js += c;
	}
	try { return new RegExp(js, casse ? "i" : ""); }
	catch (e){
		var m = /\[/.test(s) ? "Unmatched [, [^, [:, [., or [=" : /\\\(/.test(s) ? "Unmatched ( or \\(" : "Invalid regular expression";
		throw new GitErreur("fatal: command line, '" + motif + "': " + m, 128);
	}
}
/* rev-list : la liste des commits (hash complets), via la machinerie de log. */
GIT_SOUS_COMMANDES["rev-list"] = function(ctx){
	var compter = false, args = [], revs = 0, avant = true;
	ctx.args.forEach(function(a){
		if (a === "--count") compter = true;
		else { args.push(a); if (a === "--") avant = false; else if (avant && (a.charAt(0) !== "-" || a === "--all" || a === "--branches" || a === "--tags")) revs++; }
	});
	if (!revs) throw new GitErreur("usage: git rev-list [<options>] <commit>... [--] [<path>...]", 129);
	ctx.args = ["--format=%H", "--no-decorate", "--topo-order"].concat(args);
	var s = GIT_SOUS_COMMANDES.log(ctx);
	return compter ? String(s ? s.split("\n").length : 0) : s;
};
function gEssayerRevs(R, x){
	try {
		var m;
		if ((m = /^(.*?)\.\.\.?(.*)$/.exec(x))){ gResoudre(R, m[1] || "HEAD", { commit: true }); gResoudre(R, (m[2] || "HEAD").replace(/^\./, ""), { commit: true }); return true; }
		gResoudre(R, x.replace(/^\^/, ""), { commit: true });
		return true;
	} catch (e){ if (e instanceof GitErreur) return false; throw e; }
}

/* ================================================================== */
/* Le graphe de git log --graph (graph.c du vrai git)                   */
/* ================================================================== */

/*
 * Le graphe de git log --graph : un portage de graph.c du vrai git (les colonnes, la table de correspondance,
 * les états PADDING, SKIP, PRE_COMMIT, COMMIT, POST_MERGE, COLLAPSING), sans les couleurs.
 * liste : les commits dans l'ordre topologique ; blocs : pour chacun, ses lignes de texte ; separateur : une ligne
 * blanche (avec le graphe) entre deux commits, comme le format medium.
 */
function gDessinerGraphe(R, liste, blocs, options){
	options = options || {};
	var dans = {};
	liste.forEach(function(h){ dans[h] = true; });
	var G = { commit: null, nbParents: 0, parents: [], largeur: 0, rangExpansion: 0, etat: "PADDING", etatAvant: "PADDING", indice: 0, indiceAvant: 0,
		disposition: -1, aretes: 0, aretesAvant: 0, cols: [], nouvelles: [], corr: [], ancienne: [], tailleCorr: 0 };
	function parentsInteressants(h){
		var c = gCommit(R, h), p = options.premierParent ? c.parents.slice(0, 1) : c.parents;
		var vus = {};
		return p.filter(function(x){ if (!dans[x] || vus[x]) return false; vus[x] = true; return true; });
	}
	function trouverNouvelle(h){ for (var i = 0; i < G.nouvelles.length; i++) if (G.nouvelles[i] === h) return i; return -1; }
	function inserer(h, idx){
		var i = trouverNouvelle(h), ci;
		if (i < 0){ i = G.nouvelles.length; G.nouvelles.push(h); }
		if (G.nbParents > 1 && idx > -1 && G.disposition === -1){
			var dist = idx - i, decalage = dist > 1 ? 2 * dist - 3 : 1;
			G.disposition = dist > 0 ? 0 : 1;
			G.aretes = G.nbParents + G.disposition - 2;
			ci = G.largeur + (G.disposition - 1) * decalage;
			G.largeur += 2 * G.disposition;
		} else if (G.aretes > 0 && i === G.corr[G.largeur - 2]){
			ci = G.largeur - 2;
			G.aretes = -1;
		} else {
			ci = G.largeur;
			G.largeur += 2;
		}
		G.corr[ci] = i;
	}
	function mettreAJourColonnes(){
		var t = G.cols; G.cols = G.nouvelles; G.nouvelles = [];
		var n = G.cols.length;
		var max = n + G.nbParents;
		G.tailleCorr = 2 * max;
		G.corr = []; for (var k = 0; k < G.tailleCorr; k++) G.corr[k] = -1;
		G.largeur = 0;
		G.aretesAvant = G.aretes;
		G.aretes = 0;
		var vu = false, dansCols = true;
		for (var i = 0; i <= n; i++){
			var cc;
			if (i === n){ if (vu) break; dansCols = false; cc = G.commit; }
			else cc = G.cols[i];
			if (cc === G.commit){
				vu = true;
				G.indice = i;
				G.disposition = -1;
				G.parents.forEach(function(p){ inserer(p, i); });
				if (G.nbParents === 0) G.largeur += 2;
			} else inserer(cc, -1);
		}
		while (G.tailleCorr > 1 && G.corr[G.tailleCorr - 1] < 0) G.tailleCorr--;
	}
	function changerEtat(e){ G.etatAvant = G.etat; G.etat = e; }
	function correspondanceJuste(){
		for (var i = 0; i < G.tailleCorr; i++){ var c = G.corr[i]; if (c < 0) continue; if (c === Math.floor(i / 2)) continue; return false; }
		return true;
	}
	function besoinPreCommit(){ return G.nbParents >= 3 && G.indice < G.cols.length - 1 && G.rangExpansion < G.nbParents - 2; }
	function nombreTirets(){ return G.nbParents + G.disposition - 3; }
	function mettreAJour(h){
		G.commit = h;
		G.parents = parentsInteressants(h);
		G.nbParents = G.parents.length;
		G.indiceAvant = G.indice;
		mettreAJourColonnes();
		G.rangExpansion = 0;
		if (G.etat !== "PADDING") G.etat = "SKIP";
		else if (besoinPreCommit()) G.etat = "PRE_COMMIT";
		else G.etat = "COMMIT";
	}
	function ligneRemplissage(){ var s = ""; for (var i = 0; i < G.nouvelles.length; i++) s += "| "; return s; }
	function ligneSaut(){ var s = "..."; if (besoinPreCommit()) changerEtat("PRE_COMMIT"); else changerEtat("COMMIT"); return s; }
	function lignePreCommit(){
		var s = "", vu = false;
		for (var i = 0; i < G.cols.length; i++){
			if (G.cols[i] === G.commit){ vu = true; s += "|" + new Array(G.rangExpansion + 2).join(" "); }
			else if (vu && G.rangExpansion === 0){
				if (G.etatAvant === "POST_MERGE" && G.indiceAvant < i) s += "\\"; else s += "|";
				s += " ";
			} else if (vu && G.rangExpansion > 0) s += "\\ ";
			else s += "| ";
		}
		G.rangExpansion++;
		if (!besoinPreCommit()) changerEtat("COMMIT");
		return s;
	}
	function ligneCommit(){
		var s = "", vu = false, n = G.cols.length;
		for (var i = 0; i <= n; i++){
			var cc;
			if (i === n){ if (vu) break; cc = G.commit; }
			else cc = G.cols[i];
			if (cc === G.commit){
				vu = true;
				s += "*";
				if (G.nbParents > 2){
					var nb = nombreTirets();
					for (var j = 0; j < nb; j++) s += "-" + (j === nb - 1 ? "." : "-");
				}
			} else if (vu && G.aretes > 1) s += "\\";
			else if (vu && G.aretes === 1){
				if (G.etatAvant === "POST_MERGE" && G.aretesAvant > 0 && G.indiceAvant < i) s += "\\"; else s += "|";
			} else if (G.etatAvant === "COLLAPSING" && G.ancienne[2 * i + 1] === i && G.corr[2 * i] < i) s += "/";
			else s += "|";
			s += " ";
		}
		if (G.nbParents > 1) changerEtat("POST_MERGE");
		else if (correspondanceJuste()) changerEtat("PADDING");
		else changerEtat("COLLAPSING");
		return s;
	}
	var CARS_FUSION = ["/", "|", "\\"];
	function lignePostMerge(){
		var s = "", vu = false, n = G.cols.length, premier = G.parents[0], colParent = false;
		for (var i = 0; i <= n; i++){
			var cc;
			if (i === n){ if (vu) break; cc = G.commit; }
			else cc = G.cols[i];
			if (cc === G.commit){
				vu = true;
				var idx = G.disposition;
				for (var j = 0; j < G.nbParents; j++){
					s += CARS_FUSION[idx];
					if (idx === 2){ if (G.aretes > 0 || j < G.nbParents - 1) s += " "; }
					else idx++;
				}
				if (G.aretes === 0) s += " ";
			} else if (vu){
				s += G.aretes > 0 ? "\\" : "|";
				s += " ";
			} else {
				s += "|";
				if (G.disposition !== 0 || i !== G.indice - 1) s += colParent ? "_" : " ";
			}
			if (cc === premier) colParent = true;
		}
		if (correspondanceJuste()) changerEtat("PADDING"); else changerEtat("COLLAPSING");
		return s;
	}
	function ligneRepli(){
		G.ancienne = G.corr;
		G.corr = [];
		var i, j, aretH = -1, cibleH = -1, utiliseH = false;
		for (i = 0; i < G.tailleCorr; i++) G.corr[i] = -1;
		for (i = 0; i < G.tailleCorr; i++){
			var cible = G.ancienne[i];
			if (cible === undefined || cible < 0) continue;
			if (cible * 2 === i){ G.corr[i] = cible; }
			else if (!(G.corr[i - 1] >= 0)){
				G.corr[i - 1] = cible;
				if (aretH === -1){ aretH = i; cibleH = cible; for (j = cible * 2 + 3; j < i - 2; j += 2) G.corr[j] = cible; }
			} else if (G.corr[i - 1] === cible){ }
			else {
				G.corr[i - 2] = cible;
				if (aretH === -1){ cibleH = cible; aretH = i - 1; for (j = cible * 2 + 3; j < i - 2; j += 2) G.corr[j] = cible; }
			}
		}
		if (G.corr[G.tailleCorr - 1] === undefined || G.corr[G.tailleCorr - 1] < 0) G.tailleCorr--;
		var s = "";
		for (i = 0; i < G.tailleCorr; i++){
			var c2 = G.corr[i];
			if (c2 === undefined || c2 < 0) s += " ";
			else if (c2 * 2 === i) s += "|";
			else if (c2 === cibleH && i !== aretH - 1){
				if (i !== c2 * 2 + 3) G.corr[i] = -1;
				utiliseH = true;
				s += "_";
			} else {
				if (utiliseH && i < aretH) G.corr[i] = -1;
				s += "/";
			}
		}
		if (correspondanceJuste()) changerEtat("PADDING");
		return s;
	}
	function ligneSuivante(){
		var s, commit = false;
		switch (G.etat){
			case "PADDING": s = ligneRemplissage(); break;
			case "SKIP": s = ligneSaut(); break;
			case "PRE_COMMIT": s = lignePreCommit(); break;
			case "COMMIT": s = ligneCommit(); commit = true; break;
			case "POST_MERGE": s = lignePostMerge(); break;
			case "COLLAPSING": s = ligneRepli(); break;
		}
		while (s.length < G.largeur) s += " ";
		return { s: s, commit: commit };
	}
	function ligneSeparateur(){
		if (G.etat !== "COMMIT") return ligneSuivante().s;
		var s = "";
		for (var i = 0; i < G.cols.length; i++){ s += "|"; s += G.cols[i] === G.commit && G.nbParents > 2 ? new Array((G.nbParents - 2) * 2 + 1).join(" ") : " "; }
		while (s.length < G.largeur) s += " ";
		G.etatAvant = "PADDING";
		return s;
	}
	var sortie = [];
	blocs.forEach(function(b, k){
		mettreAJour(b.h);
		if (k > 0 && !b.compact) sortie.push(ligneSeparateur().replace(/\s+$/, function(x){ return x; }));
		var garde = 0, prefixe = null;
		while (G.etat !== "PADDING" && garde++ < 100){
			var r = ligneSuivante();
			if (r.commit){ prefixe = r.s; break; }
			sortie.push(r.s);
		}
		sortie.push((prefixe === null ? "" : prefixe) + (b.l[0] || ""));
		for (var y = 1; y < b.l.length; y++) sortie.push(ligneSuivante().s + b.l[y]);
		garde = 0;
		while (G.etat !== "PADDING" && garde++ < 100) sortie.push(ligneSuivante().s);
	});
	return sortie.join("\n");
}

/* git show : un commit (son diff), un tag annoté, un arbre, un blob (rev:chemin). */
GIT_SOUS_COMMANDES.show = function(ctx){
	var op = gOptions(ctx.args, { "--stat": "b", "--name-only": "b", "--name-status": "b", "--oneline": "b", "-s|--no-patch": "b", "--format": "v", "--pretty": "o", "--show-signature": "b", "--decorate": "o", "--no-decorate": "b", "-q|--quiet": "b" }, "show");
	var R = ctx.depot();
	if (!op.p.length && !gTete(R)) throw new GitErreur("fatal: your current branch '" + (gBrancheCourante(R) || "HEAD") + "' does not have any commits yet", 128);
	var revs = op.p.length ? op.p : ["HEAD"];
	var dec = op.o["no-decorate"] ? null : (op.o.decorate !== undefined || ctx.io.tty ? gDecorations(R) : null);
	var specs = gPathspecs(ctx, op.apres || []);
	var sortie = [];
	revs.forEach(function(rv){
		var h = gResoudre(R, rv);
		var o = gObjet(R, h);
		if (!o) throw gErreurRevision(rv);
		ctx.ev.objet = h; ctx.ev.typeObjet = o.t;
		if (o.t === "blob"){ sortie.push(o.c.replace(/\n$/, "")); return; }
		if (o.t === "tree"){ sortie.push("tree " + rv, ""); o.c.forEach(function(e){ sortie.push(e[1] + (e[0] === "40000" ? "/" : "")); }); return; }
		if (o.t === "tag"){
			var m = /^object (\S+)\ntype (\S+)\ntag (.*)\ntagger (.*?) <([^>]*)> (\d+) ([+-]\d{4})\n\n([\s\S]*)$/.exec(o.c);
			if (m){ sortie.push("tag " + m[3], "Tagger: " + m[4] + " <" + m[5] + ">", "Date:   " + gDateTexte(+m[6], m[7]), "", m[8].replace(/\n$/, ""), ""); h = m[1]; o = gObjet(R, h); }
		}
		if (o.t !== "commit") return;
		var fmt = gLireFormat(op);
		if (op.o.oneline) fmt.oneline = true;
		fmt.signature = !!op.o["show-signature"];
		sortie = sortie.concat(gBlocCommit(R, h, fmt, dec));
		if (op.o["no-patch"]) return;
		var c = gCommit(R, h);
		if (c.parents.length > 1 && !op.o.stat){ return; }
		var ch = gChangesCommit(R, h).filter(function(x){ return gCorrespond(specs, x.chemin); });
		var compact = fmt.oneline || fmt.format !== undefined;
		if (op.o["name-only"] || op.o["name-status"]){ if (!compact) sortie.push(""); ch.forEach(function(x){ sortie.push(op.o["name-status"] ? (x.ancien ? "R" + ("00" + x.similarite).slice(-3) + "\t" + x.ancien + "\t" + x.chemin : (!x.a ? "A" : !x.b ? "D" : "M") + "\t" + x.chemin) : x.chemin); }); return; }
		if (op.o.stat){ var st = gStat(R, ch); if (st){ sortie.push(""); sortie = sortie.concat(st.split("\n")); } return; }
		if (ch.length){ if (!compact) sortie.push(""); ch.forEach(function(x){ sortie = sortie.concat(gDiffFichier(R, x.chemin, x.a, x.b, { ancien: x.ancien, similarite: x.similarite }).split("\n")); }); }
	});
	return sortie.join("\n");
};

/* Le diff combiné (diff --cc) d'un fichier en conflit : la copie de travail contre « nous » et « eux ». */
function gDiffCombine(R, chemin, nous, eux, travail){
	var A = gLignes(gObjet(R, nous.h).c), B = gLignes(gObjet(R, eux.h).c), W = gLignes(travail);
	function marque(P){
		var ch = gChangements(P, W), ajout = [], supp = {}, ip = 0;
		for (var j = 0; j < W.length; j++) ajout[j] = !!ch.cb[j];
		// Les lignes de P supprimées, rangées devant la ligne de W qui suit.
		var i = 0, jj = 0;
		while (i < P.length || jj < W.length){
			if (i < P.length && ch.ca[i]){ (supp[jj] = supp[jj] || []).push(P[i]); i++; continue; }
			if (jj < W.length && ch.cb[jj]){ jj++; continue; }
			i++; jj++;
		}
		return { ajout: ajout, supp: supp };
	}
	var ma = marque(A), mb = marque(B);
	var lignes = [];
	for (var j = 0; j <= W.length; j++){
		(ma.supp[j] || []).forEach(function(x){ lignes.push({ t: "- " + x, chg: true, w: false }); });
		(mb.supp[j] || []).forEach(function(x){ lignes.push({ t: " -" + x, chg: true, w: false }); });
		if (j < W.length) lignes.push({ t: (ma.ajout[j] ? "+" : " ") + (mb.ajout[j] ? "+" : " ") + W[j], chg: ma.ajout[j] || mb.ajout[j], w: true });
	}
	var l = ["diff --cc " + chemin, "index " + gCourt(R, nous.h) + "," + gCourt(R, eux.h) + "..0000000", "--- a/" + chemin, "+++ b/" + chemin];
	if (!lignes.some(function(x){ return x.chg; })) return l.slice(0, 2).join("\n");
	// Un seul hunk qui couvre les changements, avec trois lignes de contexte.
	var premier = -1, dernier = -1;
	lignes.forEach(function(x, i){ if (x.chg){ if (premier < 0) premier = i; dernier = i; } });
	var debut = premier, fin = dernier, ctxN = 0;
	while (debut > 0 && ctxN < 3){ debut--; if (!lignes[debut].chg) ctxN++; }
	ctxN = 0;
	while (fin < lignes.length - 1 && ctxN < 3){ fin++; if (!lignes[fin].chg) ctxN++; }
	var morceau = lignes.slice(debut, fin + 1);
	var nw = morceau.filter(function(x){ return x.w; }).length;
	var avantW = lignes.slice(0, debut).filter(function(x){ return x.w; }).length;
	var na = morceau.filter(function(x){ return x.t.charAt(0) !== "+"; }).length, nb = morceau.filter(function(x){ return x.t.charAt(1) !== "+"; }).length;
	var avantA = lignes.slice(0, debut).filter(function(x){ return x.t.charAt(0) !== "+"; }).length, avantB = lignes.slice(0, debut).filter(function(x){ return x.t.charAt(1) !== "+"; }).length;
	l.push("@@@ -" + (avantA + 1) + "," + na + " -" + (avantB + 1) + "," + nb + " +" + (avantW + 1) + "," + nw + " @@@");
	morceau.forEach(function(x){ l.push(x.t.replace(/\n$/, "")); });
	return l.join("\n");
}

GIT_SOUS_COMMANDES.diff = function(ctx){
	var op = gOptions(ctx.args, { "--staged|--cached": "b", "--stat": "b", "--name-only": "b", "--name-status": "b", "--shortstat": "b", "-U|--unified": "v", "--color": "o", "--no-color": "b", "-w|--ignore-all-space": "b", "--quiet": "b", "--exit-code": "b", "--word-diff": "o", "--check": "b", "--no-index": "b", "--numstat": "b", "--diff-filter": "v" }, "diff");
	var R = ctx.depot();
	var revs = [], chemins = op.apres ? op.apres.slice() : [];
	op.p.forEach(function(x){
		if (/\.\./.test(x) && gEssayerRevs(R, x)) revs.push(x);
		else if (gEssayer(R, x)) revs.push(x);
		else if (R.top && (gNoeud(R.top, ctx.rel(x) || "") || gIndex(R).some(function(e){ return e.p === ctx.rel(x); }))) chemins.push(x);
		else throw gErreurRevision(x);
	});
	var specs = gPathspecs(ctx, chemins);
	var A, B, carteW = null, combine = false;
	var t = gTete(R);
	function carteTravail(){
		var trav = gFichiersTravail(R), idx = gIndexCarte(gIndex(R)), c = {};
		Object.keys(idx).forEach(function(p){ var it = trav[p]; if (it) c[p] = { h: gHashTravail(R, it), m: gModeItem(it), c: gContenu(it) }; });
		return c;
	}
	if (revs.length === 1 && /\.\.\./.test(revs[0])){
		var m3 = /^(.*)\.\.\.(.*)$/.exec(revs[0]);
		var x3 = gResoudre(R, m3[1] || "HEAD", { commit: true }), y3 = gResoudre(R, m3[2] || "HEAD", { commit: true });
		A = gAplatir(R, gCommit(R, gBaseFusion(R, x3, y3)).arbre); B = gAplatir(R, gCommit(R, y3).arbre);
	} else if (revs.length === 1 && /\.\./.test(revs[0])){
		var m2 = /^(.*)\.\.(.*)$/.exec(revs[0]);
		A = gAplatir(R, gPeler(R, gResoudre(R, m2[1] || "HEAD"), "tree")); B = gAplatir(R, gPeler(R, gResoudre(R, m2[2] || "HEAD"), "tree"));
	} else if (revs.length === 2){
		A = gAplatir(R, gPeler(R, gResoudre(R, revs[0]), "tree")); B = gAplatir(R, gPeler(R, gResoudre(R, revs[1]), "tree"));
	} else if (revs.length === 1){
		A = gAplatir(R, gPeler(R, gResoudre(R, revs[0]), "tree"));
		B = op.o.staged ? gIndexCarte(gIndex(R)) : (ctx.travail(), carteTravail());
		if (!op.o.staged){
			// Les fichiers supprimés de la copie de travail mais présents dans l'index comptent comme supprimés.
		}
	} else if (op.o.staged){
		A = t ? gAplatir(R, gCommit(R, t).arbre) : {};
		B = gIndexCarte(gIndex(R));
	} else {
		ctx.travail();
		A = gIndexCarte(gIndex(R));
		B = carteTravail();
		combine = true;
	}
	var changes = gComparerCartes(A, B).filter(function(x){ return gCorrespond(specs, x.chemin); });
	if (!combine) changes = gRenommages(R, changes);
	// Les fichiers en conflit : diff --cc.
	var conflits = combine ? gConflitsIndex(gIndex(R)) : {};
	if (op.o["diff-filter"]){
		// --diff-filter=AMDRU : les majuscules gardent, les minuscules retirent.
		var filtreDf = String(op.o["diff-filter"]);
		var garderDf = function(l){ if (filtreDf.indexOf(l.toLowerCase()) > -1) return false; return /[A-Z]/.test(filtreDf) ? filtreDf.indexOf(l) > -1 : true; };
		changes = changes.filter(function(x){ return garderDf(x.ancien ? "R" : !x.a ? "A" : !x.b ? "D" : "M"); });
		if (!garderDf("U")) conflits = {};
	}
	var sortie = [];
	ctx.ev.staged = !!op.o.staged; ctx.ev.revs = revs; ctx.ev.nombre = changes.length;
	if (op.o.quiet || op.o["exit-code"]){ if (changes.length || Object.keys(conflits).length) ctx.code = 1; if (op.o.quiet) return ""; }
	if (op.o["name-only"]) return changes.map(function(x){ return ctx.aff(x.chemin); }).concat(Object.keys(conflits).map(function(p){ return ctx.aff(p); })).join("\n");
	if (op.o["name-status"]) return changes.map(function(x){ return x.ancien ? "R" + String(x.similarite < 100 ? "0" + x.similarite : x.similarite).slice(-3) + "\t" + ctx.aff(x.ancien) + "\t" + ctx.aff(x.chemin) : (!x.a ? "A" : !x.b ? "D" : "M") + "\t" + ctx.aff(x.chemin); }).join("\n");
	if (op.o.stat || op.o.shortstat){ var st = gStat(R, changes); return op.o.shortstat ? (st ? st.split("\n").pop() : "") : st; }
	if (op.o.numstat){ return changes.map(function(x){ var ca = x.a ? (x.a.c !== undefined ? x.a.c : gObjet(R, x.a.h).c) : "", cb = x.b ? (x.b.c !== undefined ? x.b.c : gObjet(R, x.b.h).c) : ""; var n = gCompteHunks(gHunks(gLignes(ca), gLignes(cb), 0)); return n.plus + "\t" + n.moins + "\t" + x.chemin; }).join("\n"); }
	var ctxl = op.o.unified !== undefined ? +op.o.unified : undefined;
	var faits = {};
	Object.keys(conflits).sort().forEach(function(p){
		if (!gCorrespond(specs, p)) return;
		var it = gFichiersTravail(R)[p], s = conflits[p];
		faits[p] = true;
		if (it && s[2] && s[3]) sortie.push(gDiffCombine(R, p, s[2], s[3], gContenu(it)));
		else sortie.push("* Unmerged path " + p);
	});
	changes.forEach(function(x){ if (faits[x.chemin]) return; sortie.push(gDiffFichier(R, x.chemin, x.a, x.b, { contexte: ctxl, ancien: x.ancien, similarite: x.similarite })); });
	return sortie.join("\n");
};

GIT_SOUS_COMMANDES.blame = function(ctx){
	var op = gOptions(ctx.args, { "-L": "v", "-s": "b", "-e|--show-email": "b", "-w": "b", "--date": "v", "-l": "b", "-c": "b", "--porcelain": "b" }, "blame");
	var R = ctx.depot();
	var revs = [], fichiers = (op.apres || []).slice();
	op.p.forEach(function(x){ if (!fichiers.length && op.p.length > 1 && x === op.p[0] && gEssayer(R, x)) revs.push(x); else fichiers.push(x); });
	if (!fichiers.length) throw new GitErreur("usage: git blame [<options>] [<rev-opts>] [<rev>] [--] <file>", 129);
	var chemin = ctx.rel(fichiers[0]);
	var depart = revs.length ? gResoudre(R, revs[0], { commit: true }) : gTete(R);
	if (!depart) throw new GitErreur("fatal: no such ref: HEAD", 128);
	var carte = gAplatir(R, gCommit(R, depart).arbre);
	if (!carte[chemin]) throw new GitErreur("fatal: no such path '" + chemin + "' in " + (revs[0] || "HEAD"), 128);
	// La copie de travail compte aussi (lignes « Not Committed Yet »), sans révision donnée.
	var texte = gObjet(R, carte[chemin].h).c, travail = null;
	if (!revs.length && R.top){ var it = gItem(R.top, chemin); if (it && gContenu(it) !== texte) travail = gContenu(it); }
	var lignes = gLignes(travail !== null ? travail : texte);
	var origine = new Array(lignes.length);
	// Attribution : on remonte les premiers parents ; chaque ligne qui n'existe pas dans le parent est à ce commit.
	var actuel = { h: depart, l: gLignes(texte), idx: [] };
	for (var i = 0; i < actuel.l.length; i++) actuel.idx.push(i);
	if (travail !== null){
		var chT = gChangements(actuel.l, lignes), map = [], ia = 0;
		var restant = [];
		for (var j = 0, k = 0; j < lignes.length; j++){
			if (chT.cb[j]){ origine[j] = null; continue; }
			while (k < actuel.l.length && chT.ca[k]) k++;
			restant[k] = j; k++;
		}
		actuel.idx = []; for (var q = 0; q < actuel.l.length; q++) actuel.idx.push(restant[q] === undefined ? -1 : restant[q]);
	}
	var garde = 0;
	while (actuel && garde++ < 5000){
		var c = gCommit(R, actuel.h), parent = c.parents[0];
		var cartep = parent ? gAplatir(R, gCommit(R, parent).arbre) : {};
		if (!parent || !cartep[chemin]){ actuel.idx.forEach(function(w){ if (w >= 0 && origine[w] === undefined) origine[w] = actuel.h; }); break; }
		var lp = gLignes(gObjet(R, cartep[chemin].h).c);
		var ch = gChangements(lp, actuel.l), nidx = [], k2 = 0;
		for (var y = 0; y < actuel.l.length; y++){
			if (ch.cb[y]){ if (actuel.idx[y] >= 0 && origine[actuel.idx[y]] === undefined) origine[actuel.idx[y]] = actuel.h; continue; }
			while (k2 < lp.length && ch.ca[k2]) k2++;
			nidx[k2] = actuel.idx[y]; k2++;
		}
		var idxP = []; for (var z = 0; z < lp.length; z++) idxP.push(nidx[z] === undefined ? -1 : nidx[z]);
		actuel = { h: parent, l: lp, idx: idxP };
		if (!idxP.some(function(w){ return w >= 0 && origine[w] === undefined; })) break;
	}
	var debut = 1, fin = lignes.length;
	if (op.o.L){ var mL = /^(\d+),(\+?\d+)?$/.exec(op.o.L) || /^(\d+)$/.exec(op.o.L); if (!mL) throw new GitErreur("fatal: -L parameter '" + op.o.L + "' starting at line 1: invalid", 128); debut = +mL[1]; fin = mL[2] ? (mL[2].charAt(0) === "+" ? debut + (+mL[2].substring(1)) - 1 : +mL[2]) : lignes.length; if (debut > lignes.length) throw new GitErreur("fatal: file " + chemin + " has only " + lignes.length + " line" + (lignes.length > 1 ? "s" : ""), 128); fin = Math.min(fin, lignes.length); }
	var auteurs = [], largeurNom = 0;
	for (var n = debut - 1; n < fin; n++){
		var h = origine[n];
		var nom = h ? (op.o["show-email"] ? "<" + gCommit(R, h).auteur.mail + ">" : gCommit(R, h).auteur.nom) : (op.o["show-email"] ? "<not.committed.yet>" : "Not Committed Yet");
		auteurs.push(nom); largeurNom = Math.max(largeurNom, nom.length);
	}
	var largeurNum = String(fin).length;
	var sortie = [];
	for (var n2 = debut - 1; n2 < fin; n2++){
		var h2 = origine[n2], cc = h2 ? gCommit(R, h2) : null;
		var court = h2 ? gCourt(R, h2, 8).substring(0, Math.max(8, gCourt(R, h2).length + 1)) : "00000000";
		if (h2 && h2 === gParcours(R, [depart], [])[gParcours(R, [depart], []).length - 1] && !cc.parents.length) court = "^" + gCourt(R, h2, 7);
		var nom2 = auteurs[n2 - debut + 1]; while (nom2.length < largeurNom) nom2 += " ";
		var date = cc ? gDateIso(cc.auteur.s, cc.auteur.tz) : gDateIso(gSecondes(R), GIT_FUSEAU);
		var num = String(n2 + 1); while (num.length < largeurNum) num = " " + num;
		sortie.push(op.o.s ? court + " " + num + ") " + lignes[n2].replace(/\n$/, "") : court + " (" + nom2 + " " + date + " " + num + ") " + lignes[n2].replace(/\n$/, ""));
	}
	ctx.ev.fichier = chemin; ctx.ev.lignes = origine.filter(Boolean);
	return sortie.join("\n");
};

/* ================================================================== */
/* Mettre la copie de travail et l'index sur un autre arbre             */
/* ================================================================== */

/*
 * Passe de l'arbre de HEAD (H) à un arbre cible (T) : les fichiers qui ne changent pas entre H et T gardent leurs
 * modifications locales ; un fichier qui change et qui a des modifications locales arrête tout (sauf force).
 * Un fichier non suivi qui serait écrasé arrête tout aussi. quoi : « checkout » ou « merge » (pour les messages).
 */
function gBasculerArbre(R, H, T, options){
	options = options || {};
	var quoi = options.quoi || "checkout";
	var idx = gIndex(R), I = gIndexCarte(idx), conflits = gConflitsIndex(idx), W = gFichiersTravail(R), juge = gJugeIgnore(R);
	var chemins = {};
	[H, T, I].forEach(function(c){ Object.keys(c).forEach(function(p){ chemins[p] = true; }); });
	if (!options.force){
		if (Object.keys(conflits).length) throw new GitErreur("error: you need to resolve your current index first\n" + Object.keys(conflits).sort().map(function(p){ return p + ": needs merge"; }).join("\n"), 1);
		var locales = [], nonSuivis = [];
		Object.keys(chemins).sort().forEach(function(p){
			var h = H[p], t = T[p], i = I[p], w = W[p];
			if (gMemeEntree(h, t)) return;
			var modifIndex = !gMemeEntree(i, h), modifTravail = i ? (!w || gHashTravail(R, w) !== i.h) : !!w;
			if (!i && w && !h){
				// Un fichier non suivi à la place d'un fichier de la cible.
				if (t && gHashTravail(R, w) !== t.h && !juge(p, false)) nonSuivis.push(p);
				return;
			}
			if ((modifIndex && !gMemeEntree(i, t)) || (modifTravail && i && (!w || gHashTravail(R, w) !== (t ? t.h : "")))) locales.push(p);
		});
		if (locales.length) throw new GitErreur("error: Your local changes to the following files would be overwritten by " + quoi + ":\n" + locales.map(function(p){ return "\t" + p; }).join("\n") + "\nPlease commit your changes or stash them before you " + (quoi === "merge" ? "merge" : "switch branches") + ".\nAborting", 1);
		if (nonSuivis.length) throw new GitErreur("error: The following untracked working tree files would be overwritten by " + quoi + ":\n" + nonSuivis.map(function(p){ return "\t" + p; }).join("\n") + "\nPlease move or remove them before you " + (quoi === "merge" ? "merge" : "switch branches") + ".\nAborting", 1);
	}
	var nouveaux = [];
	Object.keys(chemins).sort().forEach(function(p){
		var h = H[p], t = T[p], i = I[p];
		if (!options.force && gMemeEntree(h, t)){
			if (i) nouveaux.push({ p: p, h: i.h, m: i.m, s: 0 });
			return;
		}
		if (t){
			gPoserTravail(R, p, t.h, t.m);
			nouveaux.push({ p: p, h: t.h, m: t.m, s: 0 });
		} else if (W[p] && (h || i || options.force)) gRetirerTravail(R, p);
	});
	gIndexEcrire(R, nouveaux);
	R.cache.travail = null;
}

/* ================================================================== */
/* reset                                                               */
/* ================================================================== */

GIT_SOUS_COMMANDES.reset = function(ctx){
	var op = gOptions(ctx.args, { "--soft": "b", "--mixed": "b", "--hard": "b", "--merge": "b", "--keep": "b", "-q|--quiet": "b", "-p|--patch": "b", "-N|--intent-to-add": "b" }, "reset");
	var R = ctx.depot();
	var mode = op.o.soft ? "soft" : op.o.hard ? "hard" : op.o.merge ? "merge" : op.o.keep ? "keep" : "mixed";
	var rev = null, chemins = (op.apres || []).slice();
	op.p.forEach(function(x, i){
		if (i === 0 && rev === null && gEssayer(R, x)) rev = x;
		else if (rev === null && i === 0 && !chemins.length && !(R.top && gNoeud(R.top, ctx.rel(x) || "")) && !gIndex(R).some(function(e){ return e.p === ctx.rel(x); })) throw gErreurRevision(x);
		else chemins.push(x);
	});
	var t = gTete(R);
	if (chemins.length){
		// git reset [rev] -- chemins : l'index de ces chemins revient à rev (ou HEAD).
		if (mode !== "mixed") throw new GitErreur("fatal: Cannot do " + mode + " reset with paths.", 128);
		ctx.travail();
		var src = rev ? gAplatir(R, gResoudre(R, rev, { commit: true })) : (t ? gAplatir(R, gCommit(R, t).arbre) : {});
		var specs = gPathspecs(ctx, chemins);
		var nouveaux = gIndex(R).filter(function(e){ return !gCorrespond(specs, e.p); });
		Object.keys(src).forEach(function(p){ if (gCorrespond(specs, p)) nouveaux.push({ p: p, h: src[p].h, m: src[p].m, s: 0 }); });
		gIndexEcrire(R, nouveaux);
		ctx.ev.mode = "chemins"; ctx.ev.chemins = chemins;
		var et = gEtatDepot(R);
		var restants = et.modifiees.map(function(x){ return x.etat + "\t" + ctx.aff(x.chemin); });
		return restants.length && !op.o.quiet ? "Unstaged changes after reset:\n" + restants.join("\n") : "";
	}
	if (!t && !rev){
		// Sur un dépôt sans commit : reset vide l'index.
		if (mode === "soft") throw new GitErreur("fatal: Cannot do a soft reset in the middle of a merge.", 128);
		gIndexEcrire(R, []);
		return "";
	}
	var cible = rev ? gResoudre(R, rev, { commit: true }) : t;
	if (mode !== "soft" && !R.top) throw new GitErreur("fatal: " + mode + " reset is not allowed in a bare repository", 128);
	if (mode === "soft" && gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("fatal: Cannot do a soft reset in the middle of a merge.", 128);
	var H = t ? gAplatir(R, gCommit(R, t).arbre) : {}, T = gAplatir(R, gCommit(R, cible).arbre);
	if (mode === "hard" || mode === "merge" || mode === "keep"){
		gBasculerArbre(R, H, T, { force: mode === "hard", quoi: "reset" });
	} else if (mode === "mixed"){
		gIndexEcrire(R, Object.keys(T).map(function(p){ return { p: p, h: T[p].h, m: T[p].m, s: 0 }; }));
	}
	if (t) gEcrire(R.git, "ORIG_HEAD", t + "\n");
	gRefEcrire(R, "HEAD", cible, "reset: moving to " + (rev || "HEAD"));
	// Une fusion, un cherry-pick, un revert en cours s'arrêtent.
	["MERGE_HEAD", "MERGE_MSG", "MERGE_MODE", "CHERRY_PICK_HEAD", "REVERT_HEAD", "AUTO_MERGE"].forEach(function(n){ if (gRefBrute(R, n) !== null || gItem(R.git, n)) gRefSupprimer(R, n); });
	ctx.ev.mode = mode; ctx.ev.de = t; ctx.ev.vers = cible;
	if (op.o.quiet) return "";
	if (mode === "hard") return "HEAD is now at " + gCourt(R, cible) + " " + gSujet(gCommit(R, cible).message);
	if (mode === "mixed"){
		var et2 = gEtatDepot(R);
		var l = et2.modifiees.map(function(x){ return x.etat + "\t" + ctx.aff(x.chemin); });
		return l.length ? "Unstaged changes after reset:\n" + l.join("\n") : "";
	}
	return "";
};

/* ================================================================== */
/* reflog                                                              */
/* ================================================================== */

GIT_SOUS_COMMANDES.reflog = function(ctx){
	var args = ctx.args.slice();
	var sous = args[0] === "show" || args[0] === "expire" || args[0] === "delete" || args[0] === "exists" || args[0] === "list" ? args.shift() : "show";
	var op = gOptions(args, { "-n": "v", "-NOMBRE": "v", "--all": "b", "--date": "v", "--oneline": "b", "--format": "v", "--pretty": "o", "--expire": "v", "--expire-unreachable": "v", "-g|--walk-reflogs": "b", "--decorate": "o", "--no-decorate": "b" }, "reflog");
	var R = ctx.depot();
	if (sous === "list") return gRefs(R, "refs/").map(function(r){ return r.nom; }).filter(function(n){ return gReflogLire(R, n).length; }).concat(gReflogLire(R, "HEAD").length ? ["HEAD"] : []).sort().join("\n");
	if (sous === "exists"){ var n0 = op.p[0] || "HEAD"; return gReflogLire(R, n0).length ? "" : gCode(ctx, 1); }
	if (sous === "expire" || sous === "delete") return "";
	var ref = op.p[0] || "HEAD";
	var nomRef = ref === "HEAD" ? "HEAD" : (gNomRef(R, ref) || null);
	if (!nomRef){ if (!gTete(R)) throw new GitErreur("fatal: ambiguous argument '" + ref + "': unknown revision or path not in the working tree.\nUse '--' to separate paths from revisions, like this:\n'git <command> [<revision>...] -- [<file>...]'", 128); throw gErreurRevision(ref); }
	var l = gReflogLire(R, nomRef);
	if (!l.length && nomRef === "HEAD" && !gTete(R)) throw new GitErreur("fatal: your current branch '" + gBrancheCourante(R) + "' does not have any commits yet", 128);
	var max = op.o.n !== undefined ? +op.o.n : (op.o.NOMBRE !== undefined ? +op.o.NOMBRE : null);
	var dec = op.o["no-decorate"] ? null : (op.o.decorate !== undefined || ctx.io.tty ? gDecorations(R) : null);
	var court = ref === "HEAD" ? "HEAD" : ref.replace(/^refs\/heads\//, "");
	var sortie = [];
	l.forEach(function(e, i){
		if (max !== null && i >= max) return;
		var sel = court + "@{" + (op.o.date ? gDateSelon(e.s, e.tz, op.o.date === true ? "default" : op.o.date, gSecondes(R)) : i) + "}";
		sortie.push(gCourt(R, e.nouveau) + gTexteDecor(dec, e.nouveau) + " " + sel + ": " + e.message);
	});
	ctx.ev.ref = nomRef; ctx.ev.entrees = l.length;
	return sortie.join("\n");
};

/* ================================================================== */
/* branch, switch, checkout                                            */
/* ================================================================== */

function gNomBrancheValide(n){ return !!n && !/^-/.test(n) && !/[\s~^:?*[\\]|\.\.|@\{|\/\/|\/$|^\/|\.lock$|\.$/.test(n) && n !== "@" && n !== "HEAD"; }
function gCreerBranche(R, nom, depuis, depuisTexte, options){
	options = options || {};
	if (!gNomBrancheValide(nom)) throw new GitErreur("fatal: '" + nom + "' is not a valid branch name", 128);
	if (gRef(R, "refs/heads/" + nom) && !options.force) throw new GitErreur("fatal: a branch named '" + nom + "' already exists", 128);
	if (options.force && gBrancheCourante(R) === nom) throw new GitErreur("fatal: cannot force update the branch '" + nom + "' used by worktree at '" + gCheminReel(R.top) + "'", 128);
	gRefEcrire(R, "refs/heads/" + nom, depuis, "branch: Created from " + depuisTexte, { sansHead: true });
	// Suivi automatique quand on part d'une branche distante.
	if (/^refs\/remotes\//.test(gNomRef(R, depuisTexte) || "") && options.suivre !== false){
		var m = /^refs\/remotes\/([^\/]+)\/(.+)$/.exec(gNomRef(R, depuisTexte));
		if (m && m[2] !== "HEAD"){ gConfigLocalePoser(R, "branch." + nom + ".remote", m[1]); gConfigLocalePoser(R, "branch." + nom + ".merge", "refs/heads/" + m[2]); return "branch '" + nom + "' set up to track '" + m[1] + "/" + m[2] + "'."; }
	}
	return "";
}

GIT_SOUS_COMMANDES.branch = function(ctx){
	var op = gOptions(ctx.args, { "-a|--all": "b", "-r|--remotes": "b", "-v|--verbose": "b", "-d|--delete": "b", "-D": "b", "-m|--move": "b", "-M": "b", "-c|--copy": "b", "-f|--force": "b", "-l|--list": "b",
		"--merged": "o", "--no-merged": "o", "-u|--set-upstream-to": "v", "--unset-upstream": "b", "--show-current": "b", "-q|--quiet": "b", "--contains": "v", "-t|--track": "b", "--no-track": "b", "--sort": "v" }, "branch");
	var R = ctx.depot();
	var t = gTete(R), courante = gBrancheCourante(R);
	if (op.o["show-current"]) return courante || "";
	if (op.o["set-upstream-to"] !== undefined){
		var br = op.p[0] || courante;
		if (!br) throw new GitErreur("fatal: could not set upstream of HEAD to " + op.o["set-upstream-to"] + " when it does not point to any branch.", 128);
		var nomR = gNomRef(R, op.o["set-upstream-to"]);
		if (!nomR || !/^refs\/(remotes|heads)\//.test(nomR)) throw new GitErreur("fatal: the requested upstream branch '" + op.o["set-upstream-to"] + "' does not exist\nhint: \nhint: If you are planning on basing your work on an upstream\nhint: branch that already exists at the remote, you may need to\nhint: run \"git fetch\" to retrieve it.\nhint: \nhint: If you are planning to push out a new local branch that\nhint: will track its remote counterpart, you may want to use\nhint: \"git push -u\" to set the upstream config as you push.\nhint: Disable this message with \"git config advice.setUpstreamFailure false\"", 128);
		var mm = /^refs\/remotes\/([^\/]+)\/(.+)$/.exec(nomR);
		if (mm){ gConfigLocalePoser(R, "branch." + br + ".remote", mm[1]); gConfigLocalePoser(R, "branch." + br + ".merge", "refs/heads/" + mm[2]); ctx.ev.amont = mm[1] + "/" + mm[2]; return "branch '" + br + "' set up to track '" + mm[1] + "/" + mm[2] + "'."; }
		gConfigLocalePoser(R, "branch." + br + ".remote", "."); gConfigLocalePoser(R, "branch." + br + ".merge", nomR);
		return "branch '" + br + "' set up to track local branch '" + nomR.substring(11) + "'.";
	}
	if (op.o["unset-upstream"]){ var b0 = op.p[0] || courante; gConfigLocalePoser(R, "branch." + b0 + ".remote", null, "unset"); gConfigLocalePoser(R, "branch." + b0 + ".merge", null, "unset"); return ""; }
	if (op.o["delete"] || op.o.D){
		if (!op.p.length) throw new GitErreur("fatal: branch name required", 128);
		var l = [], echec = false;
		op.p.forEach(function(n){
			if (op.o.remotes){
				var rr = "refs/remotes/" + n;
				var hr = gRef(R, rr);
				if (!hr){ ctx.err("error: remote-tracking branch '" + n + "' not found"); echec = true; return; }
				gRefSupprimer(R, rr); l.push("Deleted remote-tracking branch " + n + " (was " + gCourt(R, hr) + ")."); return;
			}
			var h = gRef(R, "refs/heads/" + n);
			if (!h){ ctx.err("error: branch '" + n + "' not found"); echec = true; return; }
			if (n === courante){ ctx.err("error: cannot delete branch '" + n + "' used by worktree at '" + gCheminReel(R.top || R.git) + "'"); echec = true; return; }
			if (!op.o.D && !op.o.force){
				var amont = gAmont(R, n), contre = amont && gRef(R, amont) ? gRef(R, amont) : t;
				if (contre && !gEstAncetre(R, h, contre)){ ctx.err("error: the branch '" + n + "' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D " + n + "'."); echec = true; return; }
			}
			gRefSupprimer(R, "refs/heads/" + n);
			gConfigRetirerSection(R, "branch", n);
			l.push("Deleted branch " + n + " (was " + gCourt(R, h) + ").");
			(ctx.ev.supprimees = ctx.ev.supprimees || []).push(n);
		});
		if (echec) ctx.code = 1;
		return l.join("\n");
	}
	if (op.o.move || op.o.M || op.o.copy){
		var ancien = op.p.length >= 2 ? op.p[0] : courante, nouveau = op.p.length >= 2 ? op.p[1] : op.p[0];
		if (!nouveau) throw new GitErreur("fatal: branch name required", 128);
		if (!ancien) throw new GitErreur("fatal: cannot rename the current branch while not on any.", 128);
		var ha = gRef(R, "refs/heads/" + ancien);
		if (!ha && ancien === courante && !t){
			// Renommer la branche d'un dépôt sans commit (git branch -m main juste après git init).
			gEcrire(R.git, "HEAD", "ref: refs/heads/" + nouveau + "\n");
			ctx.ev.renomme = { de: ancien, vers: nouveau };
			return "";
		}
		if (!ha) throw new GitErreur("fatal: no branch named '" + ancien + "'", 128);
		if (!gNomBrancheValide(nouveau)) throw new GitErreur("fatal: '" + nouveau + "' is not a valid branch name", 128);
		if (gRef(R, "refs/heads/" + nouveau) && !op.o.M && !op.o.force && ancien !== nouveau) throw new GitErreur("fatal: a branch named '" + nouveau + "' already exists", 128);
		var journal = gLire(gCommun(R), "logs/refs/heads/" + ancien);
		gRefEcrire(R, "refs/heads/" + nouveau, ha, null, { sansHead: true });
		if (journal !== null) gEcrire(gCommun(R), "logs/refs/heads/" + nouveau, journal);
		gReflogAjouter(R, "refs/heads/" + nouveau, ha, ha, (op.o.copy ? "Branch: copied refs/heads/" : "Branch: renamed refs/heads/") + ancien + " to refs/heads/" + nouveau);
		if (!op.o.copy){
			if (ancien !== nouveau) gRefSupprimer(R, "refs/heads/" + ancien);
			if (ancien === courante){ gEcrire(R.git, "HEAD", "ref: refs/heads/" + nouveau + "\n"); gReflogAjouter(R, "HEAD", ha, ha, "Branch: renamed refs/heads/" + ancien + " to refs/heads/" + nouveau); }
			gConfigRenommerSection(R, "branch", ancien, nouveau);
		}
		ctx.ev.renomme = { de: ancien, vers: nouveau };
		return "";
	}
	var lister = op.o.list || !op.p.length || op.o.all || op.o.remotes || op.o.merged !== undefined || op.o["no-merged"] !== undefined || op.o.contains !== undefined;
	if (!lister || (op.p.length && !op.o.list && !op.o.all && !op.o.remotes)){
		var nom = op.p[0], depuisTexte = op.p[1] || "HEAD";
		if (!t && !op.p[1]) throw new GitErreur("fatal: not a valid object name: '" + (courante || "HEAD") + "'", 128);
		var depuis = gResoudre(R, depuisTexte, { commit: true });
		var msg = gCreerBranche(R, nom, depuis, depuisTexte, { force: !!op.o.force, suivre: !op.o["no-track"] });
		ctx.ev.creee = nom; ctx.ev.depuis = depuis;
		return msg;
	}
	// Lister.
	var refs = [];
	if (!op.o.remotes) gRefs(R, "refs/heads/").forEach(function(r){ refs.push({ nom: r.nom.substring(11), hash: r.hash, local: true }); });
	if (op.o.all || op.o.remotes) gRefs(R, "refs/remotes/").forEach(function(r){ refs.push({ nom: (op.o.all ? "remotes/" : "") + r.nom.substring(13), hash: r.hash, sym: r.sym, local: false }); });
	var motifs = op.p.map(function(x){ return new RegExp("^" + x.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"); });
	if (motifs.length && op.o.list) refs = refs.filter(function(r){ return motifs.some(function(m){ return m.test(r.nom); }); });
	if (op.o.merged !== undefined){ var cm = gResoudre(R, op.o.merged === true ? "HEAD" : op.o.merged, { commit: true }); refs = refs.filter(function(r){ return r.hash && gEstAncetre(R, r.hash, cm); }); }
	if (op.o["no-merged"] !== undefined){ var cn = gResoudre(R, op.o["no-merged"] === true ? "HEAD" : op.o["no-merged"], { commit: true }); refs = refs.filter(function(r){ return r.hash && !gEstAncetre(R, r.hash, cn); }); }
	if (op.o.contains !== undefined){ var cc = gResoudre(R, op.o.contains, { commit: true }); refs = refs.filter(function(r){ return r.hash && gEstAncetre(R, cc, r.hash); }); }
	var lignes = [];
	if (!courante && t && !op.o.remotes){ var dd = gDetacheDepuis(R); lignes.push({ nom: "(HEAD detached " + (dd.bouge ? "from " : "at ") + dd.nom + ")", hash: t, courant: true }); }
	refs.forEach(function(r){ lignes.push({ nom: r.nom, hash: r.hash, sym: r.sym, courant: r.local && r.nom === courante, local: r.local }); });
	var largeur = 0;
	lignes.forEach(function(l){ largeur = Math.max(largeur, l.nom.length); });
	ctx.ev.liste = true;
	return lignes.map(function(l){
		var tete = (l.courant ? "* " : "  ");
		if (l.sym) return tete + l.nom + " -> " + l.sym.replace(/^refs\/remotes\//, "");
		if (!op.o.verbose) return tete + l.nom;
		var nom = l.nom; while (nom.length < largeur) nom += " ";
		var info = "";
		if (op.o.verbose >= 2 && l.local){
			var am = gTexteAmont(R, l.nom, true);
			if (am){ info = "[" + am.nom + (am.parti ? ": gone" : (am.devant || am.derriere ? ": " + (am.devant ? "ahead " + am.devant : "") + (am.devant && am.derriere ? ", " : "") + (am.derriere ? "behind " + am.derriere : "") : "")) + "] "; }
		} else if (op.o.verbose && l.local){
			var am2 = gTexteAmont(R, l.nom, true);
			if (am2 && !am2.parti && (am2.devant || am2.derriere)) info = "[" + (am2.devant ? "ahead " + am2.devant : "") + (am2.devant && am2.derriere ? ", " : "") + (am2.derriere ? "behind " + am2.derriere : "") + "] ";
			else if (am2 && am2.parti) info = "[gone] ";
		}
		return tete + nom + " " + gCourt(R, l.hash) + " " + info + gSujet(gCommit(R, l.hash).message);
	}).join("\n");
};

/* Bascule HEAD sur une branche (ou détache) : la copie de travail suit. Renvoie le texte du vrai. */
function gBasculer(ctx, R, cible, options){
	options = options || {};
	var t = gTete(R), avant = gBrancheCourante(R) || (t || "");
	var H = t ? gAplatir(R, gCommit(R, t).arbre) : {};
	var hashCible, nomBranche = null;
	if (options.detacher){ hashCible = gResoudre(R, cible, { commit: true }); }
	else { nomBranche = cible; hashCible = gRef(R, "refs/heads/" + cible); }
	var T = hashCible ? gAplatir(R, gCommit(R, hashCible).arbre) : {};
	if (R.top) gBasculerArbre(R, H, T, { force: !!options.force, quoi: "checkout" });
	var avantTexte = gBrancheCourante(R) || t;
	var message = "checkout: moving from " + avantTexte + " to " + (nomBranche || cible);
	if (nomBranche){
		var deja = gBrancheCourante(R) === nomBranche;
		gEcrire(R.git, "HEAD", "ref: refs/heads/" + nomBranche + "\n");
		gReflogAjouter(R, "HEAD", t, hashCible, message);
		ctx.ev.branche = nomBranche; ctx.ev.detache = false;
		var l = [deja ? "Already on '" + nomBranche + "'" : (options.nouvelle ? "Switched to a new branch '" + nomBranche + "'" : (options.reset ? "Switched to and reset branch '" + nomBranche + "'" : "Switched to branch '" + nomBranche + "'"))];
		var am = gTexteAmont(R, nomBranche);
		if (am && !options.nouvelle) l = l.concat(am);
		return l.join("\n");
	}
	gEcrire(R.git, "HEAD", hashCible + "\n");
	gReflogAjouter(R, "HEAD", t, hashCible, message);
	ctx.ev.detache = true; ctx.ev.vers = hashCible;
	var sujet = gSujet(gCommit(R, hashCible).message);
	if (t === hashCible && !gBrancheCourante(R) && avant === t) return "HEAD is now at " + gCourt(R, hashCible) + " " + sujet;
	var conseil = options.switch ? "" : ("Note: switching to '" + cible + "'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n\nTurn off this advice by setting config variable advice.detachedHead to false\n\n");
	var lost = "";
	if (!/^[0-9a-f]{40}$/.test(avant) || true){
		// Des commits détachés qu'on abandonne : « Warning: you are leaving 1 commit behind ».
		if (!gBrancheCourante(R) && t && t !== hashCible){
			var orphelins = gParcours(R, [t], gRefs(R, "refs/").map(function(r){ return gPeler(R, r.hash, "commit"); }).filter(Boolean));
		}
	}
	return conseil + "HEAD is now at " + gCourt(R, hashCible) + " " + sujet;
}
/* Les commits laissés derrière en quittant un HEAD détaché. */
function gAvertirOrphelins(R, t){
	if (!t) return "";
	var refs = gRefs(R, "refs/").map(function(r){ return gPeler(R, r.hash, "commit"); }).filter(Boolean);
	var orphelins = gParcours(R, [t], refs);
	if (!orphelins.length) return "";
	var n = orphelins.length;
	return "Warning: you are leaving " + n + " commit" + (n > 1 ? "s" : "") + " behind, not connected to\nany of your branches:\n\n" + orphelins.slice(0, 5).map(function(h){ return "  " + gCourt(R, h) + " " + gSujet(gCommit(R, h).message); }).join("\n") + (n > 5 ? "\n ... and " + (n - 5) + " more." : "") +
		"\n\nIf you want to keep " + (n > 1 ? "them" : "it") + " by creating a new branch, this may be a good time\nto do so with:\n\n git branch <new-branch-name> " + gCourt(R, t) + "\n";
}

GIT_SOUS_COMMANDES["switch"] = function(ctx){
	var op = gOptions(ctx.args, { "-c|--create": "v", "-C|--force-create": "v", "-d|--detach": "b", "-f|--force|--discard-changes": "b", "-t|--track": "b", "--no-track": "b", "--orphan": "v", "-q|--quiet": "b", "-m|--merge": "b", "--guess": "b", "--no-guess": "b" }, "switch");
	var R = ctx.travail();
	var t = gTete(R), avantDetache = !gBrancheCourante(R) ? t : null;
	if (gEtatRebase(R) || gRefBrute(R, "MERGE_HEAD")){
		if (gRefBrute(R, "MERGE_HEAD") && Object.keys(gConflitsIndex(gIndex(R))).length) throw new GitErreur("error: you need to resolve your current index first\n" + Object.keys(gConflitsIndex(gIndex(R))).map(function(p){ return p + ": needs merge"; }).join("\n"), 1);
		if (gEtatRebase(R)) throw new GitErreur("fatal: cannot switch branch while rebasing\nConsider \"git rebase --quit\" or \"git worktree add\".", 128);
		if (gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("fatal: cannot switch branch while merging\nConsider \"git merge --quit\" or \"git worktree add\".", 128);
	}
	var sortie;
	if (op.o.orphan !== undefined){
		gEcrire(R.git, "HEAD", "ref: refs/heads/" + op.o.orphan + "\n");
		var H0 = t ? gAplatir(R, gCommit(R, t).arbre) : {};
		gBasculerArbre(R, H0, {}, { force: true });
		ctx.ev.branche = op.o.orphan; ctx.ev.orpheline = true;
		return "Switched to a new branch '" + op.o.orphan + "'";
	}
	if (op.o.create !== undefined || op.o["force-create"] !== undefined){
		var nom = op.o.create !== undefined ? op.o.create : op.o["force-create"];
		var depuisTexte = op.p[0] || "HEAD";
		if (!t && !op.p[0]){
			if (!gNomBrancheValide(nom)) throw new GitErreur("fatal: '" + nom + "' is not a valid branch name", 128);
			gEcrire(R.git, "HEAD", "ref: refs/heads/" + nom + "\n");
			ctx.ev.branche = nom; ctx.ev.creee = nom;
			return "Switched to a new branch '" + nom + "'";
		}
		var depuis = gResoudre(R, depuisTexte, { commit: true });
		if (gRef(R, "refs/heads/" + nom) && op.o.create !== undefined) throw new GitErreur("fatal: a branch named '" + nom + "' already exists", 128);
		var H = t ? gAplatir(R, gCommit(R, t).arbre) : {}, T = gAplatir(R, gCommit(R, depuis).arbre);
		var nomAvant = gBrancheCourante(R) || t;
		gBasculerArbre(R, H, T, { force: !!op.o.force });
		var suivi = gCreerBranche(R, nom, depuis, depuisTexte, { force: op.o["force-create"] !== undefined, suivre: !op.o["no-track"] });
		gEcrire(R.git, "HEAD", "ref: refs/heads/" + nom + "\n");
		gReflogAjouter(R, "HEAD", t, depuis, "checkout: moving from " + nomAvant + " to " + nom);
		ctx.ev.branche = nom; ctx.ev.creee = nom; ctx.ev.depuis = depuis;
		sortie = (suivi ? suivi + "\n" : "") + (op.o["force-create"] !== undefined && gRef(R, "refs/heads/" + nom) ? "Switched to a new branch '" + nom + "'" : "Switched to a new branch '" + nom + "'");
		var orph = avantDetache && avantDetache !== depuis ? gAvertirOrphelins(R, avantDetache) : "";
		return (orph ? orph + "\n" : "") + sortie;
	}
	if (!op.p.length) throw new GitErreur("fatal: missing branch or commit argument", 128);
	var cible = op.p[0];
	if (cible === "-"){ cible = gBrancheAvant(R, 1); if (!cible) throw new GitErreur("fatal: invalid reference: @{-1}", 128); }
	if (op.o.detach){
		var hd = gEssayer(R, cible, { commit: true });
		if (!hd) throw new GitErreur("fatal: invalid reference: " + cible, 128);
		var o1 = avantDetache && avantDetache !== hd ? gAvertirOrphelins(R, avantDetache) : "";
		return (o1 ? o1 + "\n" : "") + gBasculer(ctx, R, cible, { detacher: true, force: !!op.o.force, "switch": true });
	}
	if (!gRef(R, "refs/heads/" + cible)){
		// Une branche distante du même nom : on crée la branche locale qui la suit (le « guess » de git).
		var distantes = gRefs(R, "refs/remotes/").filter(function(r){ return r.nom.replace(/^refs\/remotes\/[^\/]+\//, "") === cible && !/\/HEAD$/.test(r.nom); });
		if (distantes.length === 1 && op.o.guess !== false){
			var dn = distantes[0].nom.substring(13);
			var H2 = t ? gAplatir(R, gCommit(R, t).arbre) : {}, T2 = gAplatir(R, gCommit(R, distantes[0].hash).arbre);
			gBasculerArbre(R, H2, T2, { force: !!op.o.force });
			var s2 = gCreerBranche(R, cible, distantes[0].hash, dn, {});
			var av = gBrancheCourante(R) || t;
			gEcrire(R.git, "HEAD", "ref: refs/heads/" + cible + "\n");
			gReflogAjouter(R, "HEAD", t, distantes[0].hash, "checkout: moving from " + av + " to " + cible);
			ctx.ev.branche = cible; ctx.ev.creee = cible;
			return s2 + "\nSwitched to a new branch '" + cible + "'";
		}
		if (gEssayer(R, cible, { commit: true })) throw new GitErreur("fatal: a branch is expected, got " + (gNomRef(R, cible) && /^refs\/tags\//.test(gNomRef(R, cible)) ? "tag '" + cible + "'" : gNomRef(R, cible) && /^refs\/remotes\//.test(gNomRef(R, cible)) ? "remote branch '" + cible + "'" : "commit '" + cible + "'") + "\nhint: If you want to detach HEAD at the commit, try again with the --detach option.", 128);
		throw new GitErreur("fatal: invalid reference: " + cible, 128);
	}
	var o2 = avantDetache ? gAvertirOrphelins(R, avantDetache) : "";
	if (o2 && gEstAncetre(R, avantDetache, gRef(R, "refs/heads/" + cible))) o2 = "";
	return (o2 ? o2 + "\n" : "") + gBasculer(ctx, R, cible, { force: !!op.o.force });
};
function gBrancheAvantEcriture(R, t){ return gBrancheCourante(R) || t; }
/* Réécrit le message de la dernière entrée du reflog de HEAD. */
function gCorrigerDernierReflog(R, message){
	var it = gItem(R.git, "logs/HEAD");
	if (!it) return;
	var lignes = gContenu(it).replace(/\n$/, "").split("\n");
	var d = lignes.length - 1;
	lignes[d] = lignes[d].replace(/\t.*$/, "\t" + message);
	gEcrire(R.git, "logs/HEAD", lignes.join("\n") + "\n");
}

GIT_SOUS_COMMANDES.checkout = function(ctx){
	var op = gOptions(ctx.args, { "-b": "v", "-B": "v", "-f|--force": "b", "--detach": "b", "-t|--track": "b", "--no-track": "b", "--orphan": "v", "-q|--quiet": "b", "--ours": "b", "--theirs": "b", "-p|--patch": "b", "-m|--merge": "b" }, "checkout");
	var R = ctx.travail();
	var chemins = (op.apres || []).slice();
	var cible = null;
	if (op.o.b !== undefined || op.o.B !== undefined){
		var args = [op.o.b !== undefined ? "-c" : "-C", op.o.b !== undefined ? op.o.b : op.o.B].concat(op.p);
		if (op.o["no-track"]) args.push("--no-track");
		if (op.o.force) args.push("-f");
		ctx.args = args;
		return GIT_SOUS_COMMANDES["switch"](ctx);
	}
	if (op.o.orphan !== undefined){ ctx.args = ["--orphan", op.o.orphan]; return GIT_SOUS_COMMANDES["switch"](ctx); }
	if (op.p.length && !chemins.length){
		var p0 = op.p[0];
		var estRev = p0 === "-" || gRef(R, "refs/heads/" + p0) || gEssayer(R, p0, { commit: true }) || gRefs(R, "refs/remotes/").some(function(r){ return r.nom.replace(/^refs\/remotes\/[^\/]+\//, "") === p0; });
		if (estRev){ cible = p0; chemins = op.p.slice(1); }
		else chemins = op.p.slice();
	} else if (op.p.length){ cible = op.p[0]; }
	if (!cible && !chemins.length) throw new GitErreur("fatal: you must specify path(s) to restore", 128);
	if (chemins.length){
		// git checkout [rev] -- fichiers : restaurer depuis l'index (ou rev, qui met aussi l'index à jour).
		var specs = gPathspecs(ctx, chemins);
		var src = cible ? gAplatir(R, gResoudre(R, cible, { commit: true })) : gIndexCarte(gIndex(R));
		var conflits = gConflitsIndex(gIndex(R));
		var touches = [];
		specs.forEach(function(s){
			var l = Object.keys(src).concat(Object.keys(conflits)).filter(function(p, i, tt){ return tt.indexOf(p) === i && s.tester(p); });
			if (!l.length) throw new GitErreur("error: pathspec '" + s.brut + "' did not match any file(s) known to git", 1);
			l.forEach(function(p){ if (touches.indexOf(p) === -1) touches.push(p); });
		});
		var nouveaux = gIndex(R);
		touches.forEach(function(p){
			if (conflits[p] && !cible){
				var e = op.o.ours ? 2 : op.o.theirs ? 3 : 0;
				if (!e) throw new GitErreur("error: path '" + p + "' is unmerged", 1);
				gPoserTravail(R, p, conflits[p][e].h, conflits[p][e].m);
				return;
			}
			gPoserTravail(R, p, src[p].h, src[p].m);
			if (cible) nouveaux = nouveaux.filter(function(x){ return x.p !== p; }).concat([{ p: p, h: src[p].h, m: src[p].m, s: 0 }]);
		});
		if (cible) gIndexEcrire(R, nouveaux);
		ctx.ev.chemins = touches;
		return touches.length > 1 || true ? "Updated " + touches.length + " path" + (touches.length > 1 ? "s" : "") + " from " + (cible ? gCourt(R, gResoudre(R, cible, { commit: true })) : "the index") : "";
	}
	if (cible === "-"){ cible = gBrancheAvant(R, 1); if (!cible) throw new GitErreur("error: pathspec '-' did not match any file(s) known to git", 1); }
	var avantDetache = !gBrancheCourante(R) ? gTete(R) : null;
	if (gRef(R, "refs/heads/" + cible) && !op.o.detach){
		var o2 = avantDetache && !gEstAncetre(R, avantDetache, gRef(R, "refs/heads/" + cible)) ? gAvertirOrphelins(R, avantDetache) : "";
		return (o2 ? o2 + "\n" : "") + gBasculer(ctx, R, cible, { force: !!op.o.force });
	}
	if (!gEssayer(R, cible, { commit: true })){
		var distantes = gRefs(R, "refs/remotes/").filter(function(r){ return r.nom.replace(/^refs\/remotes\/[^\/]+\//, "") === cible; });
		if (distantes.length === 1){ ctx.args = [cible]; return GIT_SOUS_COMMANDES["switch"](ctx); }
		throw new GitErreur("error: pathspec '" + cible + "' did not match any file(s) known to git", 1);
	}
	var o1 = avantDetache && avantDetache !== gResoudre(R, cible, { commit: true }) ? gAvertirOrphelins(R, avantDetache) : "";
	return (o1 ? o1 + "\n" : "") + gBasculer(ctx, R, cible, { detacher: true, force: !!op.o.force });
};

/* ================================================================== */
/* tag                                                                 */
/* ================================================================== */

GIT_SOUS_COMMANDES.tag = function(ctx){
	var op = gOptions(ctx.args, { "-a|--annotate": "b", "-m|--message": "l", "-l|--list": "b", "-d|--delete": "b", "-f|--force": "b", "-n": "o", "-s|--sign": "b", "-v|--verify": "b", "--contains": "v", "--points-at": "v", "--sort": "v", "-F|--file": "v" }, "tag");
	var R = ctx.depot();
	if (op.o["delete"]){
		if (!op.p.length) return "";
		var l = [];
		op.p.forEach(function(n){ var h = gRef(R, "refs/tags/" + n); if (!h){ ctx.err("error: tag '" + n + "' not found."); ctx.code = 1; return; } gRefSupprimer(R, "refs/tags/" + n); l.push("Deleted tag '" + n + "' (was " + gCourt(R, h) + ")"); });
		ctx.ev.supprimes = op.p.slice();
		return l.join("\n");
	}
	var lister = op.o.list || (!op.p.length && !op.o.annotate && !op.o.message) || op.o.n !== undefined && !op.o.annotate && !op.o.message;
	if (lister){
		var motifs = op.p.map(function(x){ return new RegExp("^" + x.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"); });
		var tags = gRefs(R, "refs/tags/").filter(function(r){ var n = r.nom.substring(10); return !motifs.length || motifs.some(function(m){ return m.test(n); }); });
		if (op.o.contains !== undefined){ var cc = gResoudre(R, op.o.contains, { commit: true }); tags = tags.filter(function(r){ return gEstAncetre(R, cc, gPeler(R, r.hash, "commit")); }); }
		if (op.o["points-at"] !== undefined){ var pa = gResoudre(R, op.o["points-at"], { commit: true }); tags = tags.filter(function(r){ return gPeler(R, r.hash, "commit") === pa; }); }
		var noms = tags.map(function(r){ return r.nom.substring(10); });
		if (op.o.sort === "-version:refname" || op.o.sort === "-v:refname") noms = gTriVersions(noms).reverse();
		else if (op.o.sort === "version:refname" || op.o.sort === "v:refname") noms = gTriVersions(noms);
		if (op.o.n !== undefined){
			return tags.map(function(r){ var n = r.nom.substring(10); while (n.length < 15) n += " "; var o = gObjet(R, r.hash); var msg = o && o.t === "tag" ? o.c.split("\n\n")[1] || "" : gSujet(gCommit(R, gPeler(R, r.hash, "commit")).message); return n + " " + String(msg).split("\n")[0]; }).join("\n");
		}
		return noms.join("\n");
	}
	var nom = op.p[0];
	if (!nom || !gNomBrancheValide(nom.replace(/\//g, "-"))) throw new GitErreur("fatal: '" + nom + "' is not a valid tag name.", 128);
	var cibleTexte = op.p[1] || "HEAD";
	var cible = gResoudre(R, cibleTexte);
	if (gRef(R, "refs/tags/" + nom) && !op.o.force) throw new GitErreur("fatal: tag '" + nom + "' already exists", 128);
	var annote = op.o.annotate || op.o.message || op.o.file || op.o.sign;
	var avant = gRef(R, "refs/tags/" + nom);
	function poser(message){
		var h = cible;
		if (annote){
			var msg = gNettoyerMessage(message, true);
			if (!msg) throw new GitErreur("fatal: no tag message?", 128);
			var id = gIdentite(R, "committer"), d = gDateCommit(R, "committer");
			h = gObjetEcrire(R, "tag", "object " + cible + "\ntype " + gObjet(R, cible).t + "\ntag " + nom + "\ntagger " + id.nom + " <" + id.mail + "> " + d.s + " " + d.tz + "\n\n" + msg);
		}
		gEcrire(gCommun(R), "refs/tags/" + nom, h + "\n");
		ctx.ev.tag = nom; ctx.ev.cible = cible; ctx.ev.annote = !!annote;
		return avant && op.o.force ? "Updated tag '" + nom + "' (was " + gCourt(R, avant) + ")" : "";
	}
	if (!annote) return poser("");
	if (op.o.message) return poser(op.o.message.join("\n\n"));
	if (op.o.file){ var rf = gChemin(ctx.lieu, op.o.file); if (!rf || !(rf.noeud instanceof Item)) throw new GitErreur("fatal: could not open or read '" + op.o.file + "': No such file or directory", 128); return poser(gContenu(rf.noeud)); }
	return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/TAG_EDITMSG", texte: "\n#\n# Write a message for tag:\n#   " + nom + "\n# Lines starting with '#' will be ignored.\n", fin: function(t){ return poser(t); } });
};
function gTriVersions(noms){
	function cle(n){ return n.replace(/^v/, "").split(/[.\-]/).map(function(x){ return /^\d+$/.test(x) ? +x : x; }); }
	return noms.slice().sort(function(a, b){
		var x = cle(a), y = cle(b);
		for (var i = 0; i < Math.max(x.length, y.length); i++){
			if (x[i] === undefined) return -1; if (y[i] === undefined) return 1;
			if (x[i] === y[i]) continue;
			if (typeof x[i] === "number" && typeof y[i] === "number") return x[i] - y[i];
			return String(x[i]) < String(y[i]) ? -1 : 1;
		}
		return 0;
	});
}

/* ================================================================== */
/* La plomberie : cat-file, hash-object, ls-files, ls-tree, rev-parse    */
/* ================================================================== */

GIT_SOUS_COMMANDES["cat-file"] = function(ctx){
	var op = gOptions(ctx.args, { "-t": "b", "-p": "b", "-s": "b", "-e": "b", "--batch-check": "b" }, "cat-file");
	var R = ctx.depot();
	if (op.p.length === 2 && !op.o.t && !op.o.p && !op.o.s && !op.o.e){
		var hh = gEssayer(R, op.p[1]); var oo = hh ? gObjet(R, hh) : null;
		if (!oo || oo.t !== op.p[0]) throw new GitErreur("fatal: git cat-file " + op.p[1] + ": bad file", 128);
		return gTexteObjet(R, oo);
	}
	if (!op.p.length) throw new GitErreur("usage: git cat-file <type> <object>\n   or: git cat-file (-e | -p) <object>\n   or: git cat-file (-t | -s) [--allow-unknown-type] <object>", 129);
	var h = gEssayer(R, op.p[0]);
	if (!h || !gObjet(R, h)){
		if (op.o.e) return gCode(ctx, 1);
		throw new GitErreur("fatal: Not a valid object name " + op.p[0], 128);
	}
	var o = gObjet(R, h);
	ctx.ev.objet = h; ctx.ev.typeObjet = o.t;
	if (op.o.e) return "";
	if (op.o.t) return o.t;
	if (op.o.s) return String(gTailleObjet(o.t, o.c));
	return gTexteObjet(R, o);
};
function gTexteObjet(R, o){
	if (o.t === "tree") return o.c.map(function(e){ var x = gObjet(R, e[2]); return (e[0] === "40000" ? "040000" : e[0]) + " " + (e[0] === "40000" ? "tree" : (e[0] === "160000" ? "commit" : "blob")) + " " + e[2] + "\t" + e[1]; }).join("\n");
	return String(o.c).replace(/\n$/, "");
}

GIT_SOUS_COMMANDES["hash-object"] = function(ctx){
	var op = gOptions(ctx.args, { "-w": "b", "--stdin": "b", "-t": "v" }, "hash-object");
	var R = op.o.w ? ctx.depot() : gTrouverDepot(ctx.lieu);
	var l = [];
	if (op.o.stdin){ var e = ctx.io.stdin === null || ctx.io.stdin === undefined ? "" : (typeof contenuExact === "function" ? contenuExact(ctx.io.stdin, ctx.io.stdinSansFin) : ctx.io.stdin + "\n"); l.push(op.o.w ? gObjetEcrire(R, "blob", e) : gHashObjet("blob", e)); }
	op.p.forEach(function(f){
		var r = gChemin(ctx.lieu, f);
		if (!r || !(r.noeud instanceof Item)) throw new GitErreur("fatal: could not open '" + f + "' for reading: No such file or directory", 128);
		var c = gContenu(r.noeud);
		l.push(op.o.w ? gObjetEcrire(R, "blob", c) : gHashObjet("blob", c));
	});
	ctx.ev.ecrit = !!op.o.w;
	return l.join("\n");
};

GIT_SOUS_COMMANDES["ls-files"] = function(ctx){
	var op = gOptions(ctx.args, { "-s|--stage": "b", "-o|--others": "b", "-i|--ignored": "b", "--exclude-standard": "b", "-c|--cached": "b", "-m|--modified": "b", "-d|--deleted": "b", "-u|--unmerged": "b", "-z": "b", "--directory": "b" }, "ls-files");
	var R = ctx.travail();
	var specs = gPathspecs(ctx, op.p.concat(op.apres || []));
	var idx = gIndex(R), travail = gFichiersTravail(R), juge = gJugeIgnore(R), carte = gIndexCarte(idx);
	var l = [];
	if (op.o.others){
		Object.keys(travail).sort().forEach(function(p){ if (carte[p] || gConflitsIndex(idx)[p] || !gCorrespond(specs, p)) return; var ign = !!juge(p, false); if (op.o.ignored ? ign : (!op.o["exclude-standard"] || !ign)) l.push(ctx.aff(p)); });
		return l.join("\n");
	}
	idx.forEach(function(e){
		if (!gCorrespond(specs, e.p)) return;
		if (op.o.unmerged && !e.s) return;
		if (op.o.modified){ var it = travail[e.p]; if (it && gHashTravail(R, it) === e.h) return; }
		if (op.o.deleted && travail[e.p]) return;
		if (op.o.ignored && !juge(e.p, false)) return;
		l.push(op.o.stage || op.o.unmerged ? e.m + " " + e.h + " " + (e.s || 0) + "\t" + ctx.aff(e.p) : ctx.aff(e.p));
	});
	if (!op.o.stage && !op.o.unmerged) l = l.filter(function(x, i){ return l.indexOf(x) === i; });
	return l.join("\n");
};

GIT_SOUS_COMMANDES["ls-tree"] = function(ctx){
	var op = gOptions(ctx.args, { "-r": "b", "-t": "b", "-d": "b", "--name-only": "b", "-l|--long": "b", "--full-tree": "b" }, "ls-tree");
	var R = ctx.depot();
	if (!op.p.length) throw new GitErreur("usage: git ls-tree [<options>] <tree-ish> [<path>...]", 129);
	var arbre = gPeler(R, gResoudre(R, op.p[0]), "tree");
	if (!arbre || gObjet(R, arbre).t !== "tree") throw new GitErreur("fatal: not a tree object", 128);
	var l = [];
	(function visiter(h, prefixe){
		gObjet(R, h).c.forEach(function(e){
			var p = (prefixe ? prefixe + "/" : "") + e[1], dossier = e[0] === "40000";
			if (dossier && op.o.r){ if (op.o.t) l.push([e, p]); visiter(e[2], p); return; }
			if (op.o.d && !dossier) return;
			l.push([e, p]);
		});
	})(arbre, "");
	return l.map(function(x){ var e = x[0]; if (op.o["name-only"]) return x[1]; var taille = e[0] === "40000" ? "      -" : String(gTailleObjet("blob", gObjet(R, e[2]).c)); while (taille.length < 7) taille = " " + taille; return (e[0] === "40000" ? "040000" : e[0]) + " " + (e[0] === "40000" ? "tree" : "blob") + " " + e[2] + (op.o.long ? " " + taille : "") + "\t" + x[1]; }).join("\n");
};

GIT_SOUS_COMMANDES["rev-parse"] = function(ctx){
	var op = gOptions(ctx.args, { "--short": "o", "--abbrev-ref": "o", "--show-toplevel": "b", "--git-dir": "b", "--is-inside-work-tree": "b", "--is-bare-repository": "b", "--verify": "b", "-q|--quiet": "b", "--show-prefix": "b", "--symbolic-full-name": "b", "--absolute-git-dir": "b", "--show-cdup": "b", "--all": "b" }, "rev-parse");
	if (op.o["is-inside-work-tree"]){ var Rw = gTrouverDepot(ctx.lieu); if (!Rw) throw new GitErreur("fatal: not a git repository (or any of the parent directories): .git", 128); return Rw.top ? "true" : "false"; }
	var R = ctx.depot();
	var l = [];
	if (op.o["show-toplevel"]){ if (!R.top) throw new GitErreur("fatal: this operation must be run in a work tree", 128); l.push(gCheminReel(R.top)); }
	if (op.o["git-dir"]) l.push(R.top && ctx.lieu === R.top ? ".git" : gCheminReel(R.git));
	if (op.o["absolute-git-dir"]) l.push(gCheminReel(R.git));
	if (op.o["is-bare-repository"]) l.push(R.nu ? "true" : "false");
	if (op.o["show-prefix"]) l.push(ctx.prefixe() ? ctx.prefixe() + "/" : "");
	if (op.o["show-cdup"]) l.push(ctx.prefixe() ? ctx.prefixe().split("/").map(function(){ return "../"; }).join("") : "");
	if (op.o.all) gRefs(R, "refs/").forEach(function(r){ l.push(r.hash); });
	op.p.forEach(function(x){
		if (op.o["abbrev-ref"]){
			var n = x === "HEAD" ? (gBrancheCourante(R) || "HEAD") : null;
			if (n === null){
				if (/@\{(u|upstream)\}$/.test(x)){ var b = x.replace(/@\{(u|upstream)\}$/, "") || gBrancheCourante(R); var am = gAmont(R, b === "HEAD" ? gBrancheCourante(R) : b); if (!am) throw new GitErreur("fatal: no upstream configured for branch '" + b + "'", 128); n = am.replace(/^refs\/remotes\//, ""); }
				else { var nr = gNomRef(R, x); if (!nr) throw gErreurRevision(x); n = nr.replace(/^refs\/(heads|tags|remotes)\//, ""); }
			}
			l.push(n); return;
		}
		if (op.o["symbolic-full-name"]){ var s = x === "HEAD" ? gSymbolique(R, "HEAD") : gNomRef(R, x); l.push(s || x); return; }
		var h = gEssayer(R, x);
		if (!h){
			if (op.o.verify){ if (op.o.quiet) { ctx.code = 1; return; } throw new GitErreur("fatal: Needed a single revision", 128); }
			// Le vrai écrit l'erreur, puis recopie l'argument sur la sortie.
			ctx.err(gErreurRevision(x).message); ctx.code = 128; l.push(x); return;
		}
		l.push(op.o.short !== undefined ? gCourt(R, h, op.o.short === true ? 7 : +op.o.short) : h);
	});
	return l.join("\n");
};

GIT_SOUS_COMMANDES["check-ignore"] = function(ctx){
	var op = gOptions(ctx.args, { "-v|--verbose": "b", "-n|--non-matching": "b", "-q|--quiet": "b", "--no-index": "b" }, "check-ignore");
	var R = ctx.travail();
	if (!op.p.length) throw new GitErreur("fatal: no path specified", 128);
	var juge = gJugeIgnore(R), l = [], aucun = true;
	op.p.forEach(function(x){
		var p = ctx.rel(x);
		var dossier = gNoeud(R.top, p) instanceof Room;
		var v = juge.detail(p, dossier);
		var ignore = v && !v.negation && (op.o["no-index"] || !gIndexCarte(gIndex(R))[p]);
		if (ignore) aucun = false;
		if (op.o.verbose){ if (v && (ignore || v.negation || op.o["non-matching"])) l.push(v.source + ":" + v.ligne + ":" + v.texte + "\t" + x); else if (op.o["non-matching"]) l.push("::\t" + x); }
		else if (ignore) l.push(x);
	});
	if (aucun) ctx.code = 1;
	ctx.ev.ignores = l.length;
	return op.o.quiet ? "" : l.join("\n");
};

GIT_SOUS_COMMANDES.grep = function(ctx){
	var op = gOptions(ctx.args, { "-n|--line-number": "b", "-i|--ignore-case": "b", "-l|--files-with-matches": "b", "-c|--count": "b", "-w|--word-regexp": "b", "-v|--invert-match": "b", "-e": "v", "-E|--extended-regexp": "b", "-F|--fixed-strings": "b", "--cached": "b", "-h": "b" }, "grep");
	var R = ctx.depot();
	var p = op.p.slice(), motif = op.o.e !== undefined ? op.o.e : p.shift();
	if (motif === undefined) throw new GitErreur("fatal: no pattern given", 128);
	var rev = null;
	if (p.length && gEssayer(R, p[0], { commit: true }) && !(R.top && gNoeud(R.top, ctx.rel(p[0]) || ""))) rev = p.shift();
	var specs = gPathspecs(ctx, p.concat(op.apres || []));
	var source = motif;
	if (op.o["fixed-strings"]) source = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	else if (!op.o["extended-regexp"]) source = source.replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/(^|[^\\])([+?{}|()])/g, "$1\\$2");
	if (op.o["word-regexp"]) source = "\\b(?:" + source + ")\\b";
	var re;
	try { re = new RegExp(source, op.o["ignore-case"] ? "i" : ""); } catch (e){ throw new GitErreur("fatal: command line, '" + motif + "': Invalid regular expression", 128); }
	var fichiers = {};
	if (rev){ var c = gAplatir(R, gCommit(R, gResoudre(R, rev, { commit: true })).arbre); Object.keys(c).forEach(function(x){ fichiers[x] = gObjet(R, c[x].h).c; }); }
	else if (op.o.cached){ var ci = gIndexCarte(gIndex(R)); Object.keys(ci).forEach(function(x){ fichiers[x] = gObjet(R, ci[x].h).c; }); }
	else { var t = gFichiersTravail(R), ix = gIndexCarte(gIndex(R)); Object.keys(ix).forEach(function(x){ if (t[x]) fichiers[x] = gContenu(t[x]); }); }
	var l = [];
	Object.keys(fichiers).sort().forEach(function(f){
		if (!gCorrespond(specs, f)) return;
		var n = 0;
		gLignes(fichiers[f]).forEach(function(ligne, i){
			var x = ligne.replace(/\n$/, ""), ok = re.test(x);
			if (op.o["invert-match"]) ok = !ok;
			if (!ok) return;
			n++;
			if (!op.o["files-with-matches"] && !op.o.count) l.push((rev ? rev + ":" : "") + (op.o.h ? "" : ctx.aff(f) + ":") + (op.o["line-number"] ? (i + 1) + ":" : "") + x);
		});
		if (n && op.o["files-with-matches"]) l.push((rev ? rev + ":" : "") + ctx.aff(f));
		if (n && op.o.count) l.push((rev ? rev + ":" : "") + ctx.aff(f) + ":" + n);
	});
	if (!l.length) ctx.code = 1;
	ctx.ev.motif = motif; ctx.ev.trouves = l.length;
	return l.join("\n");
};

GIT_SOUS_COMMANDES.shortlog = function(ctx){
	var op = gOptions(ctx.args, { "-s|--summary": "b", "-n|--numbered": "b", "-e|--email": "b", "--all": "b", "-c|--committer": "b" }, "shortlog");
	var R = ctx.depot();
	var revs = op.p.length ? op.p : (gTete(R) ? ["HEAD"] : []);
	if (!revs.length && !op.o.all) return "";
	var rv = gRevisionsLog(R, revs, !!op.o.all);
	var liste = gParcours(R, rv.inclus, rv.exclus);
	var par = {}, ordre = [];
	liste.forEach(function(h){
		var c = gCommit(R, h), a = op.o.committer ? c.commiteur : c.auteur;
		var k = a.nom + (op.o.email ? " <" + a.mail + ">" : "");
		if (!par[k]){ par[k] = []; ordre.push(k); }
		par[k].push(gSujet(c.message));
	});
	ordre.sort(function(a, b){ return op.o.numbered ? (par[b].length - par[a].length || (a < b ? -1 : 1)) : (a < b ? -1 : a > b ? 1 : 0); });
	if (op.o.summary) return ordre.map(function(k){ var n = String(par[k].length); while (n.length < 6) n = " " + n; return n + "\t" + k; }).join("\n");
	return ordre.map(function(k){ return k + " (" + par[k].length + "):\n" + par[k].slice().reverse().map(function(s){ return "      " + s; }).join("\n") + "\n"; }).join("\n").replace(/\n$/, "");
};

GIT_SOUS_COMMANDES.describe = function(ctx){
	var op = gOptions(ctx.args, { "--tags": "b", "--always": "b", "--abbrev": "v", "--long": "b", "--dirty": "o", "--all": "b", "--exact-match": "b" }, "describe");
	var R = ctx.depot();
	var cible = gResoudre(R, op.p[0] || "HEAD", { commit: true });
	var tags = gRefs(R, "refs/tags/").filter(function(r){ var o = gObjet(R, r.hash); return op.o.tags || op.o.all || (o && o.t === "tag"); });
	var parCommit = {};
	tags.forEach(function(r){ var h = gPeler(R, r.hash, "commit"); (parCommit[h] = parCommit[h] || []).push(r.nom.substring(10)); });
	var liste = gParcours(R, [cible], []);
	var meilleur = null;
	for (var i = 0; i < liste.length; i++){
		if (parCommit[liste[i]]){
			var nom = parCommit[liste[i]].sort()[parCommit[liste[i]].length - 1];
			var distance = gParcours(R, [cible], [liste[i]]).length;
			meilleur = { nom: nom, d: distance };
			break;
		}
	}
	var sale = op.o.dirty !== undefined && gEtatDepot(R).modifiees.length ? (op.o.dirty === true ? "-dirty" : op.o.dirty) : "";
	if (!meilleur){
		if (op.o.always) return gCourt(R, cible) + sale;
		var aucun = tags.length ? "fatal: No annotated tags can describe '" + cible + "'.\nHowever, there were unannotated tags: try --tags." : "fatal: No names found, cannot describe anything.";
		if (!tags.length && gRefs(R, "refs/tags/").length) aucun = "fatal: No annotated tags can describe '" + cible + "'.\nHowever, there were unannotated tags: try --tags.";
		throw new GitErreur(aucun, 128);
	}
	if (op.o["exact-match"] && meilleur.d) throw new GitErreur("fatal: no tag exactly matches '" + cible + "'", 128);
	if ((!meilleur.d && !op.o.long) || op.o.abbrev === "0") return meilleur.nom + sale;
	var court = op.o.abbrev ? cible.substring(0, Math.max(4, +op.o.abbrev || 7)) : gCourt(R, cible);
	return meilleur.nom + "-" + meilleur.d + "-g" + court + sale;
};

/* show-ref : les refs et leurs hash (--heads, --tags, --verify, -s). */
GIT_SOUS_COMMANDES["show-ref"] = function(ctx){
	var op = gOptions(ctx.args, { "--heads|--branches": "b", "--tags": "b", "--verify": "b", "-s|--hash": "o", "-q|--quiet": "b", "-d|--dereference": "b", "--head": "b" }, "show-ref");
	var R = ctx.depot();
	var refs = gRefs(R, "refs/");
	if (op.o.verify){
		var l0 = [];
		op.p.forEach(function(n){ var h = gRefBrute(R, n); if (!h || n.indexOf("refs/") !== 0) throw new GitErreur("fatal: '" + n + "' - not a valid ref", 128); l0.push(op.o.hash ? h : h + " " + n); });
		return op.o.quiet ? "" : l0.join("\n");
	}
	if (op.o.heads || op.o.tags) refs = refs.filter(function(r){ return (op.o.heads && r.nom.indexOf("refs/heads/") === 0) || (op.o.tags && r.nom.indexOf("refs/tags/") === 0); });
	if (op.p.length) refs = refs.filter(function(r){ return op.p.some(function(m){ return r.nom === m || r.nom.slice(-(m.length + 1)) === "/" + m; }); });
	var l = [];
	if (op.o.head && gTete(R)) l.push(gTete(R) + " HEAD");
	refs.forEach(function(r){
		l.push(op.o.hash ? r.hash : r.hash + " " + r.nom);
		if (op.o.dereference && r.nom.indexOf("refs/tags/") === 0){ var p = gPeler(R, r.hash, "commit"); if (p && p !== r.hash) l.push(op.o.hash ? p : p + " " + r.nom + "^{}"); }
	});
	if (!l.length) ctx.code = 1;
	return op.o.quiet ? "" : l.join("\n");
};

/* for-each-ref : les refs selon un format (%(refname), %(refname:short), %(objectname), %(objecttype), %(subject)...). */
GIT_SOUS_COMMANDES["for-each-ref"] = function(ctx){
	var op = gOptions(ctx.args, { "--format": "v", "--sort": "v", "--count": "v", "--points-at": "v", "--merged": "o", "--no-merged": "o", "--contains": "o" }, "for-each-ref");
	var R = ctx.depot();
	var refs = gRefs(R, "refs/").filter(function(r){ return !op.p.length || op.p.some(function(m){ return r.nom.indexOf(m) === 0 || r.nom === m; }); });
	var format = op.o.format || "%(objectname) %(objecttype)\t%(refname)";
	function court(n){ return n.replace(/^refs\/(heads|tags|remotes)\//, ""); }
	function champ(r, nom){
		var o = gObjet(R, r.hash) || { t: "?" };
		var c = null;
		try { var hc = gPeler(R, r.hash, "commit"); if (hc) c = gCommit(R, hc); } catch (e){ c = null; }
		switch (nom){
			case "refname": return r.nom; case "refname:short": return court(r.nom);
			case "objectname": return r.hash; case "objectname:short": return gCourt(R, r.hash);
			case "objecttype": return o.t;
			case "subject": return o.t === "tag" ? gSujet(o.c.split("\n\n").slice(1).join("\n\n")) : c ? gSujet(c.message) : "";
			case "authorname": return c ? c.auteur.nom : ""; case "authoremail": return c ? "<" + c.auteur.mail + ">" : "";
			case "committerdate": return c ? gDateTexte(c.commiteur.s, c.commiteur.tz) : "";
			case "committerdate:short": return c ? gDateCourte(c.commiteur.s, c.commiteur.tz) : "";
			case "upstream": return (r.nom.indexOf("refs/heads/") === 0 && gAmont(R, r.nom.substring(11))) || "";
			case "upstream:short": var am2 = r.nom.indexOf("refs/heads/") === 0 ? gAmont(R, r.nom.substring(11)) : null; return am2 ? court(am2) : "";
			case "HEAD": return r.nom === "refs/heads/" + gBrancheCourante(R) ? "*" : " ";
			default: return "";
		}
	}
	if (op.o.sort){
		var cle = op.o.sort.replace(/^-/, ""), inverse = op.o.sort.charAt(0) === "-";
		refs.sort(function(a, b){ var x = champ(a, cle), y = champ(b, cle); if (/date/.test(cle)){ x = gCommit(R, gPeler(R, a.hash, "commit")).commiteur.s; y = gCommit(R, gPeler(R, b.hash, "commit")).commiteur.s; } var r = x < y ? -1 : x > y ? 1 : 0; return inverse ? -r : r; });
	}
	if (op.o.count) refs = refs.slice(0, +op.o.count);
	return refs.map(function(r){ return format.replace(/%\(([a-zA-Z:]+)\)/g, function(m, n){ return champ(r, n); }).replace(/%%/g, "%"); }).join("\n");
};

GIT_SOUS_COMMANDES.clean = function(ctx){
	var op = gOptions(ctx.args, { "-n|--dry-run": "b", "-f|--force": "b", "-d": "b", "-x": "b", "-X": "b", "-i|--interactive": "b", "-q|--quiet": "b", "-e|--exclude": "l" }, "clean");
	var R = ctx.travail();
	var forcer = op.o.force || op.o["dry-run"];
	if (!forcer && !gConfigVrai(R, "clean.requireForce", true) === false) forcer = true;
	if (!forcer) throw new GitErreur("fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean", 128);
	var specs = gPathspecs(ctx, op.p.concat(op.apres || []));
	var juge = gJugeIgnore(R), carte = gIndexCarte(gIndex(R)), travail = gFichiersTravail(R);
	var cibles = [];
	Object.keys(travail).sort().forEach(function(p){
		if (carte[p] || gConflitsIndex(gIndex(R))[p] || !gCorrespond(specs, p)) return;
		var ign = !!juge(p, false);
		if (op.o.X ? !ign : (ign && !op.o.x)) return;
		cibles.push(p);
	});
	var affiches = op.o.d ? gRegrouperNonSuivis(R, cibles) : cibles.filter(function(p){ var m = p.split("/"); for (var k = 1; k < m.length; k++){ var d = m.slice(0, k).join("/"); if (!Object.keys(carte).some(function(x){ return x.indexOf(d + "/") === 0; })) return false; } return true; });
	var l = affiches.map(function(p){ return (op.o["dry-run"] ? "Would remove " : "Removing ") + ctx.aff(p); });
	if (!op.o["dry-run"]){
		affiches.forEach(function(p){
			if (/\/$/.test(p)){ var d = p.replace(/\/$/, ""); gSupprimer(R.top, d); gNettoyerVides(R.top, d); }
			else gRetirerTravail(R, p);
		});
	}
	ctx.ev.retires = op.o["dry-run"] ? [] : affiches; ctx.ev.essai = !!op.o["dry-run"];
	return op.o.quiet ? "" : l.join("\n");
};

GIT_SOUS_COMMANDES["count-objects"] = function(ctx){
	var op = gOptions(ctx.args, { "-v|--verbose": "b", "-H|--human-readable": "b" }, "count-objects");
	var R = ctx.depot();
	var tous = gTousObjets(R), loose = 0, taille = 0, enPack = 0;
	Object.keys(tous).forEach(function(h){ if (tous[h].loose){ loose++; taille += Math.ceil((gTailleObjet(tous[h].t, tous[h].c) * 0.6 + 20) / 1024 * 4) / 4; } else enPack++; });
	var packs = gPacks(R), taillePack = 0;
	packs.forEach(function(p){ Object.keys(p.gitPack.o).forEach(function(h){ taillePack += gTailleObjet(p.gitPack.o[h][0], p.gitPack.o[h][1]) * 0.4; }); });
	var kio = Math.max(loose ? 4 * loose : 0, Math.round(taille));
	if (!op.o.verbose) return loose + " objects, " + kio + " kilobytes";
	var doublons = Object.keys(tous).filter(function(h){ return tous[h].loose && packs.some(function(p){ return p.gitPack.o[h]; }); }).length;
	return "count: " + loose + "\nsize: " + kio + "\nin-pack: " + enPack + "\npacks: " + packs.length + "\nsize-pack: " + Math.ceil(taillePack / 1024) + "\nprune-packable: " + doublons + "\ngarbage: 0\nsize-garbage: 0";
};

/* Les objets atteignables depuis les refs, le reflog, l'index, HEAD. */
function gAtteignables(R, sansReflog){
	var vus = {}, pile = [];
	gRefs(R, "refs/").forEach(function(r){ if (r.hash) pile.push(r.hash); });
	var t = gTete(R); if (t) pile.push(t);
	["ORIG_HEAD", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "FETCH_HEAD"].forEach(function(n){ var h = gRef(R, n); if (h) pile.push(h); });
	if (!sansReflog){
		var refsLog = ["HEAD"].concat(gRefs(R, "refs/").map(function(r){ return r.nom; }));
		refsLog.forEach(function(n){ gReflogLire(R, n).forEach(function(e){ if (e.nouveau !== GIT_VIDE) pile.push(e.nouveau); if (e.ancien !== GIT_VIDE) pile.push(e.ancien); }); });
	}
	gIndex(R).forEach(function(e){ pile.push(e.h); });
	while (pile.length){
		var h = pile.pop();
		if (vus[h]) continue;
		var o = gObjet(R, h);
		if (!o) continue;
		vus[h] = true;
		if (o.t === "commit"){ var c = gCommit(R, h); pile.push(c.arbre); c.parents.forEach(function(p){ pile.push(p); }); }
		else if (o.t === "tree") o.c.forEach(function(e){ pile.push(e[2]); });
		else if (o.t === "tag"){ var m = /^object ([0-9a-f]{40})/m.exec(o.c); if (m) pile.push(m[1]); }
	}
	return vus;
}

GIT_SOUS_COMMANDES.gc = function(ctx){
	var op = gOptions(ctx.args, { "--prune": "o", "--aggressive": "b", "-q|--quiet": "b", "--auto": "b" }, "gc");
	var R = ctx.depot();
	if (op.o.auto) return "";
	var tous = gTousObjets(R), atteint = gAtteignables(R, false);
	var p = gPackNeuf(R), n = 0;
	gPacks(R).forEach(function(x){ if (x !== p){ Object.keys(x.gitPack.o).forEach(function(h){ if (atteint[h] || op.o.prune === undefined) { p.gitPack.o[h] = x.gitPack.o[h]; n++; } }); } });
	Object.keys(tous).forEach(function(h){ if (tous[h].loose && (atteint[h] || op.o.prune === undefined && false)){ p.gitPack.o[h] = [tous[h].t, tous[h].c]; n++; } });
	// Les objets loose rangés disparaissent ; les inatteignables récents restent (prune après deux semaines, comme le vrai).
	var d = gDossier(gCommun(R), "objects", false);
	d.children.slice().forEach(function(sd){
		if (!/^[0-9a-f]{2}$/.test(sd.room_name)) return;
		sd.items.slice().forEach(function(it){ var h = sd.room_name + it.itemname; if (p.gitPack.o[h] || (op.o.prune === "now" && !atteint[h])) sd.removeItem(it); });
		if (!sd.items.length && !sd.children.length) d.removeChild(sd);
	});
	var anciens = gPacks(R).filter(function(x){ return x !== p; });
	var dp = gDossier(gCommun(R), "objects/pack", false);
	anciens.forEach(function(x){ dp.removeItem(x); var idx = dp.getItemFromName(x.itemname.replace(/\.pack$/, ".idx")); if (idx !== -1) dp.removeItem(idx); });
	R.cache = {};
	gPackFermer(R, p);
	// Les refs tassées dans packed-refs, comme le vrai.
	var refs = gRefs(R, "refs/").filter(function(r){ return r.hash && !r.sym && !/^refs\/stash$/.test(r.nom); });
	ctx.ev.objets = n;
	if (op.o.quiet) return "";
	return "Enumerating objects: " + n + ", done.\nCounting objects: 100% (" + n + "/" + n + "), done.\nWriting objects: 100% (" + n + "/" + n + "), done.\nTotal " + n + " (delta 0), reused 0 (delta 0), pack-reused 0";
};

function gCadrer(t, n){ t = String(t); while (t.length < n) t += " "; return t; }
GIT_SOUS_COMMANDES.fsck = function(ctx){
	var op = gOptions(ctx.args, { "--lost-found": "b", "--unreachable": "b", "--no-reflogs": "b", "--full": "b", "--dangling": "b", "--no-dangling": "b", "--connectivity-only": "b" }, "fsck");
	var R = ctx.depot();
	var tous = gTousObjets(R);
	// D'abord les liens cassés : les refs et les objets qui pointent vers un objet absent (un dépôt abîmé à la main).
	var erreurs = [], vus = {}, code = 0;
	var noms = { commit: "commit", tree: "tree", blob: "blob", tag: "tag" };
	function suivre(h, depuis, typeAttendu){
		if (!h || vus[h]) return;
		if (!tous[h]){
			vus[h] = true;
			if (depuis) erreurs.push("broken link from " + gCadrer(depuis.t, 7) + " " + depuis.h, "              to " + gCadrer(typeAttendu, 7) + " " + h);
			erreurs.push("missing " + typeAttendu + " " + h);
			code |= 2;
			return;
		}
		vus[h] = true;
		var o = tous[h], ici = { t: o.t, h: h };
		if (o.t === "commit"){ var c = gAnalyserCommit(o.c); suivre(c.arbre, ici, "tree"); c.parents.forEach(function(p){ suivre(p, ici, "commit"); }); }
		else if (o.t === "tree") o.c.forEach(function(e){ suivre(e[2], ici, e[0] === "40000" ? "tree" : (e[0] === "160000" ? "commit" : "blob")); });
		else if (o.t === "tag"){ var m = /^object ([0-9a-f]{40})\ntype (\w+)/.exec(o.c); if (m) suivre(m[1], ici, noms[m[2]] || "commit"); }
	}
	var departs = gRefs(R, "refs/").concat(gTete(R) ? [{ nom: "HEAD", hash: gTete(R) }] : []);
	departs.forEach(function(r){
		if (!r.hash) return;
		if (!tous[r.hash]){ erreurs.push("error: " + r.nom + ": invalid sha1 pointer " + r.hash); code |= 8; vus[r.hash] = true; return; }
		suivre(r.hash, null, "commit");
	});
	var atteint;
	try { atteint = gAtteignables(R, !!op.o["no-reflogs"]); } catch (e){ if (!(e instanceof GitErreur)) throw e; atteint = vus; }
	if (erreurs.length){ ctx.code = code || 1; }
	// Pendant (dangling) : inatteignable et pointé par aucun autre objet inatteignable.
	var pointes = {};
	Object.keys(tous).forEach(function(h){
		if (atteint[h]) return;
		var o = tous[h];
		if (o.t === "commit"){ var c = gAnalyserCommit(o.c); pointes[c.arbre] = true; c.parents.forEach(function(p){ pointes[p] = true; }); }
		else if (o.t === "tree") o.c.forEach(function(e){ pointes[e[2]] = true; });
		else if (o.t === "tag"){ var m = /^object ([0-9a-f]{40})/m.exec(o.c); if (m) pointes[m[1]] = true; }
	});
	var l = ["Checking object directories: 100% (256/256), done."].concat(erreurs);
	var pendants = [];
	Object.keys(tous).sort().forEach(function(h){
		if (atteint[h]) return;
		if (op.o.unreachable) l.push("unreachable " + tous[h].t + " " + h);
		else if (!pointes[h] && op.o.dangling !== false){ l.push("dangling " + tous[h].t + " " + h); pendants.push(h); }
	});
	if (op.o["lost-found"]){
		pendants.forEach(function(h){ var t = tous[h].t; gEcrire(R.git, "lost-found/" + (t === "commit" ? "commit" : "other") + "/" + h, t === "commit" ? h + "\n" : tous[h].c); });
	}
	ctx.ev.pendants = pendants;
	return l.join("\n");
};

GIT_SOUS_COMMANDES["verify-commit"] = function(ctx){
	var op = gOptions(ctx.args, { "-v|--verbose": "b", "--raw": "b" }, "verify-commit");
	var R = ctx.depot();
	if (!op.p.length) throw new GitErreur("usage: git verify-commit [-v | --verbose] [--raw] <commit>...", 129);
	var l = [], code = 0;
	op.p.forEach(function(x){
		var h = gResoudre(R, x, { commit: true });
		var v = gVerifierSignature(R, h);
		if (v.etat === "aucune"){ code = 1; return; }
		gTexteSignature(R, h).forEach(function(t){ l.push(t); });
		if (v.etat !== "bonne") code = 1;
		ctx.ev.signature = v.etat; ctx.ev.empreinte = v.empreinte || null;
	});
	l.forEach(function(m){ ctx.err(m); });
	ctx.code = code;
	return "";
};

GIT_SOUS_COMMANDES.help = function(ctx){
	var c = ctx.args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!c) return gUsageGit();
	if (!GIT_SOUS_COMMANDES[c]) throw new GitErreur("No manual entry for git" + c, 16);
	return gUsageSous(c) + "\n" + C.gris("(Le manuel complet : man git. Ici, chaque sous-commande accepte les options courantes du vrai git.)");
};
GIT_SOUS_COMMANDES.version = function(){ return "git version " + GIT_VERSION; };
GIT_ALIAS_COMMANDES["stage"] = "add";
