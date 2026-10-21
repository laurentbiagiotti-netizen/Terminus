/**
 * SortsGitCli2.js : la commande git du jeu, seconde partie (chapitre 9 pour le joueur, numéro interne 10).
 *
 * Les fusions et ce qui réapplique des commits : merge, cherry-pick, revert, rebase (et rebase -i), stash ;
 * la chasse : bisect (et bisect run) ; le travail à plusieurs : remote, fetch, pull, push ; et worktree, archive,
 * bundle, filter-repo. Le cœur est dans SortsGit.js, la première partie des commandes dans SortsGitCli.js.
 */

/* ================================================================== */
/* La fusion de trois arbres (ort, sans détection des renommages)       */
/* ================================================================== */

/*
 * base, nous, eux : des cartes { chemin: { h, m } } ; etiquettes : [nous, eux, base] pour les marqueurs.
 * Renvoie { carte (le résultat propre, conflits compris avec leurs marqueurs), conflits: [{ p, etages: {1,2,3}, texte, genre }],
 *           messages: [lignes « Auto-merging » et « CONFLICT »], auto: [chemins fusionnés] }.
 */
function gFusionArbres(R, base, nous, eux, etiquettes, style){
	var chemins = {};
	[base, nous, eux].forEach(function(c){ Object.keys(c).forEach(function(p){ chemins[p] = true; }); });
	var carte = {}, conflits = [], messages = [], auto = [];
	Object.keys(chemins).sort().forEach(function(p){
		var o = base[p], a = nous[p], b = eux[p];
		if (gMemeEntree(a, b)){ if (a) carte[p] = a; return; }
		if (gMemeEntree(o, a)){ if (b) carte[p] = b; return; }
		if (gMemeEntree(o, b)){ if (a) carte[p] = a; return; }
		// Les deux côtés ont changé.
		if (a && b){
			messages.push("Auto-merging " + p);
			auto.push(p);
			var f = gFusionTexte(o ? gObjet(R, o.h).c : "", gObjet(R, a.h).c, gObjet(R, b.h).c, etiquettes, style);
			var mode = a.m === (o ? o.m : a.m) ? b.m : a.m;
			if (!f.conflits){ carte[p] = { h: gObjetEcrire(R, "blob", f.texte), m: mode }; return; }
			messages.push("CONFLICT (" + (o ? "content" : "add/add") + "): Merge conflict in " + p);
			conflits.push({ p: p, etages: { 1: o || null, 2: a, 3: b }, texte: f.texte, genre: o ? "content" : "add/add", mode: mode });
			return;
		}
		// Modifié d'un côté, supprimé de l'autre.
		if (a && !b){
			messages.push("CONFLICT (modify/delete): " + p + " deleted in " + etiquettes[1] + " and modified in " + etiquettes[0] + ".  Version " + etiquettes[0] + " of " + p + " left in tree.");
			conflits.push({ p: p, etages: { 1: o, 2: a, 3: null }, texte: gObjet(R, a.h).c, genre: "modify/delete", mode: a.m });
			return;
		}
		if (!a && b){
			messages.push("CONFLICT (modify/delete): " + p + " deleted in " + etiquettes[0] + " and modified in " + etiquettes[1] + ".  Version " + etiquettes[1] + " of " + p + " left in tree.");
			conflits.push({ p: p, etages: { 1: o, 2: null, 3: b }, texte: gObjet(R, b.h).c, genre: "modify/delete", mode: b.m });
		}
	});
	return { carte: carte, conflits: conflits, messages: messages, auto: auto };
}
/* Vérifie que la fusion n'écrasera aucune modification locale (index ou copie de travail) des chemins qu'elle touche. */
function gVerifierAvantFusion(R, H, resultat, quoi){
	var idx = gIndex(R), I = gIndexCarte(idx), W = gFichiersTravail(R), juge = gJugeIgnore(R);
	var touches = {};
	Object.keys(resultat.carte).forEach(function(p){ if (!gMemeEntree(resultat.carte[p], H[p])) touches[p] = true; });
	Object.keys(H).forEach(function(p){ if (!resultat.carte[p]) touches[p] = true; });
	resultat.conflits.forEach(function(c){ touches[c.p] = true; });
	var locales = [], nonSuivis = [];
	if (gComparerCartes(H, I).length && quoi === "merge"){
		// Le vrai refuse toute fusion avec un index modifié : « Your local changes ... ».
		var sale = gComparerCartes(H, I).map(function(x){ return x.chemin; });
		locales = sale.filter(function(p){ return touches[p]; });
		if (!locales.length) return null;
	}
	Object.keys(touches).sort().forEach(function(p){
		var h = H[p], i = I[p], w = W[p];
		if (!gMemeEntree(h, i)){ if (locales.indexOf(p) === -1) locales.push(p); return; }
		if (i && (!w || gHashTravail(R, w) !== i.h)){ if (locales.indexOf(p) === -1) locales.push(p); return; }
		if (!i && w && !juge(p, false)) nonSuivis.push(p);
	});
	if (locales.length) return { genre: "locales", chemins: locales };
	if (nonSuivis.length) return { genre: "nonSuivis", chemins: nonSuivis };
	return null;
}
/* Pose le résultat d'une fusion dans l'index et la copie de travail (les conflits avec leurs étages). */
function gPoserFusion(R, H, resultat){
	var I = gIndexCarte(gIndex(R)), W = gFichiersTravail(R), entrees = [];
	var dans = {};
	Object.keys(resultat.carte).forEach(function(p){ dans[p] = true; });
	resultat.conflits.forEach(function(c){ dans[c.p] = true; });
	// Ce qui n'est plus dans le résultat disparaît.
	Object.keys(H).concat(Object.keys(I)).forEach(function(p){ if (!dans[p] && W[p]) gRetirerTravail(R, p); });
	Object.keys(resultat.carte).forEach(function(p){
		var e = resultat.carte[p];
		// Un fichier que la fusion ne change pas garde ce que le joueur y a écrit (comme le vrai git).
		if (!gMemeEntree(e, H[p]) && (!W[p] || gHashTravail(R, W[p]) !== e.h)) gPoserTravail(R, p, e.h, e.m);
		entrees.push({ p: p, h: e.h, m: e.m, s: 0 });
	});
	resultat.conflits.forEach(function(c){
		[1, 2, 3].forEach(function(s){ if (c.etages[s]) entrees.push({ p: c.p, h: c.etages[s].h, m: c.etages[s].m, s: s }); });
		gEcrireTravailTexte(R, c.p, c.texte, c.mode);
	});
	gIndexEcrire(R, entrees);
	R.cache.travail = null;
}
function gStyleConflit(R){ var s = gConfig(R, "merge.conflictStyle"); return s === "diff3" || s === "zdiff3" ? s : "merge"; }
function gErreurLocales(v, quoi){
	if (v.genre === "locales") return new GitErreur("error: Your local changes to the following files would be overwritten by " + quoi + ":\n" + v.chemins.map(function(p){ return "  " + p; }).join("\n") + "\nPlease commit your changes or stash them before you " + quoi + ".\nAborting", quoi === "merge" ? 2 : 1);
	return new GitErreur("error: The following untracked working tree files would be overwritten by " + quoi + ":\n" + v.chemins.map(function(p){ return "  " + p; }).join("\n") + "\nPlease move or remove them before you " + quoi + ".\nAborting", quoi === "merge" ? 2 : 1);
}

/* ================================================================== */
/* merge                                                               */
/* ================================================================== */

/* Le nom d'une révision pour les messages de fusion : « branch 'x' », « remote-tracking branch 'origin/x' », « commit 'abc' ». */
function gNomPourFusion(R, rev){
	var n = gNomRef(R, rev);
	if (n && n.indexOf("refs/heads/") === 0) return "branch '" + n.substring(11) + "'";
	if (n && n.indexOf("refs/remotes/") === 0) return "remote-tracking branch '" + n.substring(13) + "'";
	if (n && n.indexOf("refs/tags/") === 0) return "tag '" + n.substring(10) + "'";
	return "commit '" + rev + "'";
}
/* La fusion d'une révision dans HEAD (merge, pull) : renvoie le texte du vrai ; ctx.code = 1 en cas de conflit. */
function gFusionner(ctx, R, rev, options){
	options = options || {};
	var t = gTete(R), b = gResoudre(R, rev, { commit: true });
	var br = gBrancheCourante(R);
	if (!t){
		// Fusion dans une branche sans commit : simple avance.
		gBasculerArbre(R, {}, gAplatir(R, gCommit(R, b).arbre), {});
		gRefEcrire(R, "HEAD", b, "initial pull");
		return "";
	}
	if (gEstAncetre(R, b, t)){ ctx.ev.mode = "deja"; return "Already up to date."; }
	var H = gAplatir(R, gCommit(R, t).arbre), T = gAplatir(R, gCommit(R, b).arbre);
	var ff = gEstAncetre(R, t, b);
	var reflogNom = options.reflog || ("merge " + rev);
	if (ff && !options.noFF){
		if (options.squash){ /* plus bas */ }
		else {
			gBasculerArbre(R, H, T, { quoi: "merge" });
			gEcrire(R.git, "ORIG_HEAD", t + "\n");
			gRefEcrire(R, "HEAD", b, reflogNom + ": Fast-forward");
			ctx.ev.mode = "ff"; ctx.ev.hash = b;
			var ch = gComparerCartes(H, T), st = gStat(R, ch);
			return "Updating " + gCourt(R, t) + ".." + gCourt(R, b) + "\nFast-forward" + (st ? "\n" + st : "") + (gResumeModes(ch).length ? "\n" + gResumeModes(ch).join("\n") : "");
		}
	}
	if (options.ffOnly && !ff){ throw new GitErreur("fatal: Not possible to fast-forward, aborting.", 128); }
	var bases = gBasesFusion(R, t, b);
	var base = bases.length ? gAplatir(R, gCommit(R, bases[0]).arbre) : {};
	var nomEux = options.etiquette || rev;
	var res = gFusionArbres(R, base, H, T, ["HEAD", nomEux, bases.length === 1 ? gCourt(R, bases[0]) : (bases.length ? "merged common ancestors" : "empty tree")], gStyleConflit(R));
	var v = gVerifierAvantFusion(R, H, res, "merge");
	if (v){
		if (v.genre === "locales") throw new GitErreur("error: Your local changes to the following files would be overwritten by merge:\n" + v.chemins.map(function(p){ return "  " + p; }).join("\n") + "\nMerge with strategy ort failed.", 2);
		throw new GitErreur("error: The following untracked working tree files would be overwritten by merge:\n" + v.chemins.map(function(p){ return "  " + p; }).join("\n") + "\nMerge with strategy ort failed.", 2);
	}
	gPoserFusion(R, H, res);
	gEcrire(R.git, "ORIG_HEAD", t + "\n");
	var message = options.message || ("Merge " + gNomPourFusion(R, rev) + (br && br !== "main" && br !== "master" ? " into " + br : ""));
	if (options.messageDefaut) message = options.messageDefaut;
	var sortie = res.messages.slice();
	if (options.squash){
		gEcrire(R.git, "SQUASH_MSG", "Squashed commit of the following:\n");
		ctx.ev.mode = res.conflits.length ? "conflit" : "squash";
		if (res.conflits.length){ ctx.code = 1; sortie.push("Squash commit -- not updating HEAD", "Automatic merge failed; fix conflicts and then commit the result."); return sortie.join("\n"); }
		if (ff){
			// Le vrai annonce l'avance rapide, puis le stat des changements posés dans l'index.
			var chs = gComparerCartes(H, T), sts = gStat(R, chs);
			return ["Updating " + gCourt(R, t) + ".." + gCourt(R, b), "Fast-forward", "Squash commit -- not updating HEAD"].concat(sts ? [sts] : [], gResumeModes(chs)).join("\n");
		}
		sortie.push("Squash commit -- not updating HEAD", "Automatic merge went well; stopped before committing as requested");
		return sortie.join("\n");
	}
	if (res.conflits.length){
		gEcrire(R.git, "MERGE_HEAD", b + "\n");
		gEcrire(R.git, "MERGE_MSG", message + "\n\n# Conflicts:\n" + res.conflits.map(function(c){ return "#\t" + c.p; }).join("\n") + "\n");
		gEcrire(R.git, "MERGE_MODE", options.noFF ? "no-ff" : "");
		sortie.push("Automatic merge failed; fix conflicts and then commit the result.");
		ctx.code = 1;
		ctx.ev.mode = "conflit"; ctx.ev.conflits = res.conflits.map(function(c){ return c.p; }); ctx.ev.base = bases[0] || null; ctx.ev.eux = b;
		return sortie.join("\n");
	}
	// Une fusion propre : le commit de fusion, avec le message par défaut (sans éditeur).
	if (options.noCommit){
		gEcrire(R.git, "MERGE_HEAD", b + "\n");
		gEcrire(R.git, "MERGE_MSG", message + "\n");
		sortie.push("Automatic merge went well; stopped before committing as requested");
		ctx.ev.mode = "3voies"; ctx.ev.sansCommit = true;
		return sortie.join("\n");
	}
	var hookPre = gHook(R, "pre-merge-commit", []);
	if (hookPre && hookPre.code){ gEcrire(R.git, "MERGE_HEAD", b + "\n"); gEcrire(R.git, "MERGE_MSG", message + "\n"); throw new GitErreur(hookPre.sortie || "error: pre-merge-commit hook declined", 1); }
	var r = gCommitDepuisIndex(R, { message: gNettoyerMessage(message), parents: [t, b] });
	gRefEcrire(R, "HEAD", r.hash, reflogNom + ": Merge made by the 'ort' strategy.");
	ctx.ev.mode = "3voies"; ctx.ev.hash = r.hash; ctx.ev.base = bases[0] || null; ctx.ev.eux = b;
	sortie.push("Merge made by the 'ort' strategy.");
	var ch2 = gComparerCartes(H, r.carte), st2 = gStat(R, ch2);
	if (st2) sortie.push(st2);
	sortie = sortie.concat(gResumeModes(ch2));
	return sortie.join("\n");
}

GIT_SOUS_COMMANDES.merge = function(ctx){
	var op = gOptions(ctx.args, { "--no-ff": "b", "--ff": "b", "--ff-only": "b", "--abort": "b", "--continue": "b", "--quit": "b", "-m|--message": "l", "--no-edit": "b", "-e|--edit": "b", "--squash": "b", "--no-commit": "b", "--commit": "b", "-q|--quiet": "b", "-v|--verbose": "b", "-s|--strategy": "v", "-X|--strategy-option": "v", "--allow-unrelated-histories": "b", "--stat": "b", "--log": "b", "-S|--gpg-sign": "b" }, "merge");
	var R = ctx.travail();
	if (op.o.abort){
		if (!gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("fatal: There is no merge to abort (MERGE_HEAD missing).", 128);
		var t = gTete(R), orig = gRef(R, "ORIG_HEAD") || t;
		var Hc = gAplatir(R, gCommit(R, t).arbre);
		gBasculerArbre(R, Hc, gAplatir(R, gCommit(R, t).arbre), { force: true });
		["MERGE_HEAD", "MERGE_MSG", "MERGE_MODE", "AUTO_MERGE"].forEach(function(n){ gRefSupprimer(R, n); });
		gRefEcrire(R, "HEAD", t, "reset: moving to HEAD");
		ctx.ev.mode = "abandon";
		return "";
	}
	if (op.o["continue"]){
		if (!gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("fatal: There is no merge in progress (MERGE_HEAD missing).", 128);
		ctx.args = ["--no-edit"];
		ctx.cmd = "commit";
		var s = GIT_SOUS_COMMANDES.commit(ctx);
		ctx.cmd = "merge"; ctx.ev.mode = "resolu";
		return s;
	}
	if (op.o.quit){ ["MERGE_HEAD", "MERGE_MSG", "MERGE_MODE"].forEach(function(n){ gRefSupprimer(R, n); }); return ""; }
	if (gRefBrute(R, "MERGE_HEAD")){
		if (Object.keys(gConflitsIndex(gIndex(R))).length) throw new GitErreur("error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.", 128);
		throw new GitErreur("fatal: You have not concluded your merge (MERGE_HEAD exists).\nPlease, commit your changes before you merge.", 128);
	}
	if (Object.keys(gConflitsIndex(gIndex(R))).length) throw new GitErreur("error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.", 128);
	if (gEtatRebase(R)) throw new GitErreur("fatal: You have not concluded your rebase (rebase-merge exists).", 128);
	if (!op.p.length){
		var am = gBrancheCourante(R) ? gAmont(R, gBrancheCourante(R)) : null;
		if (!am) throw new GitErreur("fatal: No remote for the current branch.", 128);
		op.p = [am.replace(/^refs\/remotes\//, "")];
	}
	if (op.p.length > 1) throw new GitErreur("fatal: les fusions à plus de deux branches (octopus) ne sont pas prises en charge ici : fusionne une branche à la fois.", 128);
	var rev = op.p[0];
	if (!gEssayer(R, rev, { commit: true })) throw new GitErreur("merge: " + rev + " - not something we can merge", 1);
	var b = gResoudre(R, rev, { commit: true });
	if (!op.o["allow-unrelated-histories"] && gTete(R) && !gBaseFusion(R, gTete(R), b) && !gEstAncetre(R, b, gTete(R))) throw new GitErreur("fatal: refusing to merge unrelated histories", 128);
	var ffConf = gConfig(R, "merge.ff");
	var noFF = !!op.o["no-ff"] || (ffConf === "false" && !op.o.ff), ffOnly = !!op.o["ff-only"] || (ffConf === "only" && !op.o["no-ff"]);
	ctx.ev.rev = rev;
	var sortie = gFusionner(ctx, R, rev, { noFF: noFF, ffOnly: ffOnly, message: op.o.message ? op.o.message.join("\n\n") : null, squash: !!op.o.squash, noCommit: !!op.o["no-commit"] });
	return op.o.quiet ? "" : sortie;
};

/* ================================================================== */
/* Réappliquer un commit : cherry-pick, revert, et le cœur du rebase    */
/* ================================================================== */

/*
 * Applique le changement d'un commit sur HEAD (ou son inverse pour revert) : { ok, carte, conflits, messages }.
 * Ne touche à rien si la copie de travail gênerait (renvoie { gene }).
 */
function gAppliquerCommit(R, h, inverse, etiquetteEux){
	var c = gCommit(R, h);
	var t = gTete(R);
	var H = t ? gAplatir(R, gCommit(R, t).arbre) : {};
	var parent = c.parents[0];
	var P = parent ? gAplatir(R, gCommit(R, parent).arbre) : {}, C = gAplatir(R, c.arbre);
	var base = inverse ? C : P, eux = inverse ? P : C;
	var res = gFusionArbres(R, base, H, eux, ["HEAD", etiquetteEux || (gCourt(R, h) + " (" + gSujet(c.message) + ")"), "parent of " + gCourt(R, h) + " (" + gSujet(c.message) + ")"], gStyleConflit(R));
	var v = gVerifierAvantFusion(R, H, res, "merge");
	if (v) return { gene: v };
	gPoserFusion(R, H, res);
	return { ok: !res.conflits.length, carte: res.carte, conflits: res.conflits, messages: res.messages, H: H };
}
/* Le résumé d'un commit écrit par le séquenceur (cherry-pick, revert, rebase) : avec « Date: » (et « Author: » s'il diffère). */
function gResumeSequenceur(R, hash){
	var c = gCommit(R, hash), br = gBrancheCourante(R);
	var l = ["[" + (br || "detached HEAD") + " " + gCourt(R, hash) + "] " + gSujet(c.message)];
	if (c.auteur.nom !== c.commiteur.nom || c.auteur.mail !== c.commiteur.mail) l.push(" Author: " + c.auteur.nom + " <" + c.auteur.mail + ">");
	l.push(" Date: " + gDateTexte(c.auteur.s, c.auteur.tz));
	var ch = gComparerCartes(c.parents.length ? gAplatir(R, gCommit(R, c.parents[0]).arbre) : {}, gAplatir(R, c.arbre));
	var st = gStat(R, ch);
	l.push(st ? st.split("\n").pop() : " 0 files changed");
	return l.concat(gResumeModes(ch)).join("\n");
}
/* Le séquenceur de cherry-pick et revert : .git/sequencer/todo (les commits qui restent), CHERRY_PICK_HEAD ou REVERT_HEAD. */
function gSequenceur(ctx, R, genre, liste, options){
	options = options || {};
	var sortie = [];
	var refTete = genre === "cherry-pick" ? "CHERRY_PICK_HEAD" : "REVERT_HEAD";
	while (liste.length){
		var h = liste.shift();
		var c = gCommit(R, h);
		if (c.parents.length > 1 && !options.mainline){
			throw new GitErreur("error: commit " + h + " is a merge but no -m option was given.\nfatal: " + genre + " failed", 128);
		}
		var inverse = genre === "revert";
		var t = gTete(R);
		if (!inverse && c.parents[0] === t && !options.n && !options.x){
			// Le commit s'applique tel quel : une simple avance (comme --ff), seulement si demandé ; sinon on recrée le commit.
		}
		var r = gAppliquerCommit(R, h, inverse);
		if (r.gene){ throw gErreurLocales(r.gene, genre === "cherry-pick" ? "cherry-pick" : "revert"); }
		var sujet = gSujet(c.message);
		var message;
		if (inverse){
			var revertDe = /^Revert "([\s\S]*)"$/.exec(sujet);
			message = (revertDe ? "Reapply \"" + revertDe[1] + "\"" : "Revert \"" + sujet + "\"") + "\n\nThis reverts commit " + h + ".\n";
		} else {
			message = c.message;
			if (options.x) message = gNettoyerMessage(c.message).replace(/\n$/, "") + "\n\n(cherry picked from commit " + h + ")\n";
		}
		if (!r.ok){
			sortie = sortie.concat(r.messages);
			gEcrire(R.git, refTete, h + "\n");
			gEcrire(R.git, "MERGE_MSG", message + "\n# Conflicts:\n" + r.conflits.map(function(x){ return "#\t" + x.p; }).join("\n") + "\n");
			if (liste.length){ gEcrire(R.git, "sequencer/todo", liste.map(function(x){ return (inverse ? "revert " : "pick ") + x; }).join("\n") + "\n"); }
			else gSupprimer(R.git, "sequencer");
			gEcrire(R.git, "sequencer/head", t + "\n");
			gEcrire(R.git, "sequencer/opts", "[options]\n" + (options.x ? "\trecord-origin = true\n" : ""));
			sortie.push("error: could not " + (inverse ? "revert" : "apply") + " " + gCourt(R, h) + "... " + sujet,
				"hint: After resolving the conflicts, mark them with", "hint: \"git add/rm <pathspec>\", then run", "hint: \"git " + genre + " --continue\".",
				"hint: You can instead skip this commit with \"git " + genre + " --skip\".", "hint: To abort and get back to the state before \"git " + genre + "\",", "hint: run \"git " + genre + " --abort\".");
			ctx.code = 1;
			ctx.ev.conflits = r.conflits.map(function(x){ return x.p; }); ctx.ev.commit = h; ctx.ev.etat = "conflit";
			return sortie.join("\n");
		}
		if (options.n){ sortie = sortie.concat(r.messages); continue; }
		var idem = gComparerCartes(r.H, gIndexCarte(gIndex(R))).length === 0;
		if (idem && !options.allowEmpty){
			gEcrire(R.git, refTete, h + "\n");
			gEcrire(R.git, "MERGE_MSG", message);
			sortie.push("On branch " + (gBrancheCourante(R) || "HEAD") + "\nYou are currently " + (inverse ? "reverting" : "cherry-picking") + " commit " + gCourt(R, h) + ".\n  (all conflicts fixed: run \"git " + genre + " --continue\")\n  (use \"git " + genre + " --skip\" to skip this patch)\n  (use \"git " + genre + " --abort\" to cancel the " + genre + " operation)\n\nnothing to commit, working tree clean\nThe previous cherry-pick is now empty, possibly due to conflict resolution.\nIf you wish to commit it anyway, use:\n\n    git commit --allow-empty\n\nOtherwise, please use 'git cherry-pick --skip'");
			ctx.code = 1;
			return sortie.join("\n");
		}
		sortie = sortie.concat(r.messages.filter(function(m){ return !/^Auto-merging/.test(m) || true; }));
		var auteur = inverse ? null : { nom: c.auteur.nom, mail: c.auteur.mail };
		var date = inverse ? null : { s: c.auteur.s, tz: c.auteur.tz };
		var res = gCommitDepuisIndex(R, { message: gNettoyerMessage(message), parents: t ? [t] : [], auteur: auteur, dateAuteur: date });
		gRefEcrire(R, "HEAD", res.hash, (inverse ? "revert: " : "cherry-pick: ") + gSujet(message));
		sortie.push(gResumeSequenceur(R, res.hash));
		(ctx.ev.nouveaux = ctx.ev.nouveaux || []).push(res.hash);
		(ctx.ev.commits = ctx.ev.commits || []).push(h);
	}
	gSupprimer(R.git, "sequencer");
	return sortie.join("\n");
}
/* --continue, --skip, --abort, --quit du séquenceur. */
function gSequenceurSuite(ctx, R, genre, action){
	var refTete = genre === "cherry-pick" ? "CHERRY_PICK_HEAD" : "REVERT_HEAD";
	var enCours = gRefBrute(R, refTete);
	var reste = (gLire(R.git, "sequencer/todo") || "").split("\n").filter(Boolean).map(function(l){ return l.split(" ")[1]; });
	if (!enCours && !reste.length && !gItem(R.git, "sequencer/head")) throw new GitErreur("error: no cherry-pick or revert in progress\nfatal: " + genre + " failed", 128);
	if (action === "abort"){
		var debut = (gLire(R.git, "sequencer/head") || "").trim() || gTete(R);
		var t = gTete(R);
		gBasculerArbre(R, gAplatir(R, gCommit(R, t).arbre), gAplatir(R, gCommit(R, debut).arbre), { force: true });
		gRefEcrire(R, "HEAD", debut, "reset: moving to " + debut);
		[refTete, "MERGE_MSG"].forEach(function(n){ gRefSupprimer(R, n); });
		gSupprimer(R.git, "sequencer");
		ctx.ev.etat = "abandon";
		return "";
	}
	if (action === "quit"){ [refTete, "MERGE_MSG"].forEach(function(n){ gRefSupprimer(R, n); }); gSupprimer(R.git, "sequencer"); return ""; }
	if (action === "skip"){
		var t2 = gTete(R);
		gBasculerArbre(R, gAplatir(R, gCommit(R, t2).arbre), gAplatir(R, gCommit(R, t2).arbre), { force: true });
		[refTete, "MERGE_MSG"].forEach(function(n){ gRefSupprimer(R, n); });
		gSupprimer(R.git, "sequencer/todo");
		if (!reste.length){ gSupprimer(R.git, "sequencer"); return ""; }
		return gSequenceur(ctx, R, genre, reste, {});
	}
	// --continue : les conflits doivent être résolus et ajoutés.
	if (Object.keys(gConflitsIndex(gIndex(R))).length) throw new GitErreur("error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\nU " + Object.keys(gConflitsIndex(gIndex(R))).join("\nU ") + "\nerror: commit is not possible because you have unmerged files.", 128);
	var sortie = "";
	if (enCours){
		var h = gRef(R, refTete), c = gCommit(R, h);
		var message = gNettoyerMessage(gLire(R.git, "MERGE_MSG") || c.message, true);
		var t3 = gTete(R);
		if (gComparerCartes(gAplatir(R, gCommit(R, t3).arbre), gIndexCarte(gIndex(R))).length === 0) throw new GitErreur("The previous cherry-pick is now empty, possibly due to conflict resolution.\nIf you wish to commit it anyway, use:\n\n    git commit --allow-empty\n\nOtherwise, please use 'git " + genre + " --skip'", 1);
		var finir = function(texte){
			var msg = gNettoyerMessage(texte, true);
			var res = gCommitDepuisIndex(R, { message: msg, parents: [t3], auteur: genre === "cherry-pick" ? { nom: c.auteur.nom, mail: c.auteur.mail } : null, dateAuteur: genre === "cherry-pick" ? { s: c.auteur.s, tz: c.auteur.tz } : null });
			gRefEcrire(R, "HEAD", res.hash, (genre === "revert" ? "revert: " : "cherry-pick: ") + gSujet(msg));
			[refTete, "MERGE_MSG"].forEach(function(n){ gRefSupprimer(R, n); });
			gSupprimer(R.git, "sequencer/todo");
			ctx.ev.etat = "resolu"; ctx.ev.hash = res.hash;
			var s = gResumeSequenceur(R, res.hash);
			if (reste.length) s += "\n" + gSequenceur(ctx, R, genre, reste, {});
			else gSupprimer(R.git, "sequencer");
			return s;
		};
		var modele = message + "\n# Conflicts:\n#\n# It looks like you may be committing a " + genre + ".\n# If this is not correct, please run\n#\tgit update-ref -d " + refTete + "\n# and try again.\n\n\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n";
		return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, fin: finir });
	}
	gSupprimer(R.git, "sequencer/todo");
	if (reste.length) sortie = gSequenceur(ctx, R, genre, reste, {});
	return sortie;
}

GIT_SOUS_COMMANDES["cherry-pick"] = function(ctx){
	var op = gOptions(ctx.args, { "-x": "b", "-n|--no-commit": "b", "-e|--edit": "b", "--continue": "b", "--abort": "b", "--skip": "b", "--quit": "b", "-m|--mainline": "v", "--allow-empty": "b", "--ff": "b", "-s|--signoff": "b" }, "cherry-pick");
	var R = ctx.travail();
	if (op.o["continue"] || op.o.abort || op.o.skip || op.o.quit) return gSequenceurSuite(ctx, R, "cherry-pick", op.o["continue"] ? "continue" : op.o.abort ? "abort" : op.o.skip ? "skip" : "quit");
	if (gRefBrute(R, "CHERRY_PICK_HEAD")) throw new GitErreur("error: cherry-pick is already in progress\nhint: try \"git cherry-pick (--continue | --abort | --quit)\"\nfatal: cherry-pick failed", 128);
	if (!op.p.length) throw new GitErreur("usage: git cherry-pick [--edit] [-n] [-m <parent-number>] [-s] [-x] [--ff]\n                       [-S[<keyid>]] <commit>...\n   or: git cherry-pick (--continue | --skip | --abort | --quit)", 129);
	if (!gTete(R)) throw new GitErreur("error: your index file is unmerged.\nfatal: cherry-pick failed", 128);
	var liste = [];
	op.p.forEach(function(x){
		if (/\.\./.test(x)){ var rv = gRevisionsLog(R, [x], false); gParcours(R, rv.inclus, rv.exclus).reverse().forEach(function(h){ liste.push(h); }); }
		else { var h = gEssayer(R, x, { commit: true }); if (!h) throw new GitErreur("fatal: bad revision '" + x + "'", 128); liste.push(h); }
	});
	ctx.ev.source = liste.slice();
	return gSequenceur(ctx, R, "cherry-pick", liste, { x: !!op.o.x, n: !!op.o["no-commit"], allowEmpty: !!op.o["allow-empty"], mainline: op.o.mainline });
};

GIT_SOUS_COMMANDES.revert = function(ctx){
	var op = gOptions(ctx.args, { "--no-edit": "b", "-e|--edit": "b", "-n|--no-commit": "b", "--continue": "b", "--abort": "b", "--skip": "b", "--quit": "b", "-m|--mainline": "v" }, "revert");
	var R = ctx.travail();
	if (op.o["continue"] || op.o.abort || op.o.skip || op.o.quit) return gSequenceurSuite(ctx, R, "revert", op.o["continue"] ? "continue" : op.o.abort ? "abort" : op.o.skip ? "skip" : "quit");
	if (gRefBrute(R, "REVERT_HEAD")) throw new GitErreur("error: revert is already in progress\nhint: try \"git revert (--continue | --abort | --quit)\"\nfatal: revert failed", 128);
	if (!op.p.length) throw new GitErreur("usage: git revert [--[no-]edit] [-n] [-m <parent-number>] [-s] [-S[<keyid>]] <commit>...\n   or: git revert (--continue | --skip | --abort | --quit)", 129);
	var liste = [];
	op.p.forEach(function(x){
		if (/\.\./.test(x)){ var rv = gRevisionsLog(R, [x], false); gParcours(R, rv.inclus, rv.exclus).forEach(function(h){ liste.push(h); }); }
		else { var h = gEssayer(R, x, { commit: true }); if (!h) throw new GitErreur("fatal: bad revision '" + x + "'", 128); liste.push(h); }
	});
	ctx.ev.source = liste.slice();
	var etre = gEtatDepot(R);
	// Comme le vrai : seul l'index doit être propre ; un fichier modifié que le revert ne touche pas reste tel quel.
	if (etre.indexees.length){
		throw new GitErreur("error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.\nfatal: revert failed", 128);
	}
	// Le vrai ouvre l'éditeur sur le message proposé (sauf --no-edit) ; le garder tel quel, c'est l'accepter.
	if (op.o["no-edit"] || op.o["no-commit"] || liste.length > 1 || !ctx.io.tty) return gSequenceur(ctx, R, "revert", liste, { n: !!op.o["no-commit"] });
	var h0 = liste[0], c0 = gCommit(R, h0);
	if (c0.parents.length > 1 && !op.o.mainline) throw new GitErreur("error: commit " + h0 + " is a merge but no -m option was given.\nfatal: revert failed", 128);
	var r = gAppliquerCommit(R, h0, true);
	if (r.gene) throw gErreurLocales(r.gene, "revert");
	var sujet = gSujet(c0.message), rv2 = /^Revert "([\s\S]*)"$/.exec(sujet);
	var message = (rv2 ? "Reapply \"" + rv2[1] + "\"" : "Revert \"" + sujet + "\"") + "\n\nThis reverts commit " + h0 + ".\n";
	if (!r.ok){
		var s = r.messages.slice();
		gEcrire(R.git, "REVERT_HEAD", h0 + "\n");
		gEcrire(R.git, "MERGE_MSG", message + "\n# Conflicts:\n" + r.conflits.map(function(x){ return "#\t" + x.p; }).join("\n") + "\n");
		gEcrire(R.git, "sequencer/head", gTete(R) + "\n");
		s.push("error: could not revert " + gCourt(R, h0) + "... " + sujet, "hint: After resolving the conflicts, mark them with", "hint: \"git add/rm <pathspec>\", then run", "hint: \"git revert --continue\".",
			"hint: You can instead skip this commit with \"git revert --skip\".", "hint: To abort and get back to the state before \"git revert\",", "hint: run \"git revert --abort\".");
		ctx.code = 1;
		ctx.ev.conflits = r.conflits.map(function(x){ return x.p; }); ctx.ev.etat = "conflit"; ctx.ev.commit = h0;
		return s.join("\n");
	}
	var t = gTete(R);
	var modele = message + "\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n# On branch " + (gBrancheCourante(R) || "HEAD") + "\n# Changes to be committed:\n" +
		gComparerCartes(gAplatir(R, gCommit(R, t).arbre), gIndexCarte(gIndex(R))).map(function(x){ return "#\t" + (!x.a ? "new file:   " : !x.b ? "deleted:    " : "modified:   ") + x.chemin; }).join("\n") + "\n#\n";
	return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, fin: function(texte){
		var msg = gNettoyerMessage(texte, true);
		if (!msg){
			// Message vide : le revert est annulé, la copie de travail garde les changements (comme le vrai).
			throw new GitErreur("Aborting commit due to empty commit message.", 1);
		}
		var res = gCommitDepuisIndex(R, { message: msg, parents: [t] });
		gRefEcrire(R, "HEAD", res.hash, "revert: " + gSujet(msg));
		ctx.ev.nouveaux = [res.hash]; ctx.ev.commits = [h0];
		return gResumeSequenceur(R, res.hash);
	} });
};

/* ================================================================== */
/* rebase                                                              */
/* ================================================================== */

/* L'empreinte d'un changement (patch-id), pour reconnaître un commit déjà appliqué en amont. */
function gPatchId(R, h){
	var c = gCommit(R, h);
	if (c.parents.length > 1) return null;
	var ch = gChangesCommit(R, h);
	return gSha1Texte(ch.map(function(x){ var ca = x.a ? gObjet(R, x.a.h).c : "", cb = x.b ? gObjet(R, x.b.h).c : ""; return x.chemin + "\n" + gHunks(gLignes(ca), gLignes(cb), 0).map(function(hk){ return hk.lignes.join(""); }).join(""); }).join("\u0000"));
}
var GIT_AIDE_TODO = "\n# Commands:\n# p, pick <commit> = use commit\n# r, reword <commit> = use commit, but edit the commit message\n# e, edit <commit> = use commit, but stop for amending\n# s, squash <commit> = use commit, but meld into previous commit\n# f, fixup [-C | -c] <commit> = like \"squash\" but keep only the previous\n#                    commit's log message, unless -C is used, in which case\n#                    keep only this commit's message; -c is same as -C but\n#                    opens the editor\n# x, exec <command> = run command (the rest of the line) using shell\n# b, break = stop here (continue rebase later with 'git rebase --continue')\n# d, drop <commit> = remove commit\n# l, label <label> = label current HEAD with a name\n# t, reset <label> = reset HEAD to a label\n# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]\n#         create a merge commit using the original merge commit's\n#         message (or the oneline, if no original merge commit was\n#         specified); use -c <commit> to reword the commit message\n# u, update-ref <ref> = track a placeholder for the <ref> to be updated\n#                       to this position in the new commits. The <ref> is\n#                       updated at the end of the rebase\n#\n# These lines can be re-ordered; they are executed from top to bottom.\n#\n# If you remove a line here THAT COMMIT WILL BE LOST.\n#\n# However, if you remove everything, the rebase will be aborted.\n#\n";
var GIT_VERBES_TODO = { p: "pick", pick: "pick", r: "reword", reword: "reword", e: "edit", edit: "edit", s: "squash", squash: "squash", f: "fixup", fixup: "fixup", d: "drop", drop: "drop", x: "exec", exec: "exec", b: "break", "break": "break" };
function gDossierRebase(R){ return gDossier(R.git, "rebase-merge", false); }
function gLireRebase(R, n){ var t = gLire(R.git, "rebase-merge/" + n); return t === null ? null : t.replace(/\n$/, ""); }
function gEcrireRebase(R, n, v){ gEcrire(R.git, "rebase-merge/" + n, String(v) + (/\n$/.test(String(v)) || v === "" ? "" : "\n")); }
/* Les lignes utiles d'une liste todo : [{ verbe, hash, reste, brut }]. */
function gAnalyserTodo(R, texte, ligneErreur){
	var l = [], erreurs = [];
	String(texte || "").split("\n").forEach(function(x){
		var y = x.trim();
		if (!y || y.charAt(0) === "#") return;
		var m = /^(\S+)\s*(.*)$/.exec(y), verbe = GIT_VERBES_TODO[m[1]];
		if (!verbe){ erreurs.push("error: invalid command '" + m[1] + "'"); return; }
		if (verbe === "exec"){ l.push({ verbe: verbe, cmd: m[2], brut: y }); return; }
		if (verbe === "break"){ l.push({ verbe: verbe, brut: y }); return; }
		var mm = /^(?:-[Cc]\s+)?(\S+)\s*(.*)$/.exec(m[2]);
		var h = mm ? gEssayer(R, mm[1], { commit: true }) : null;
		if (!h){ erreurs.push("error: invalid line " + (l.length + 1) + ": " + y); return; }
		l.push({ verbe: verbe, hash: h, reste: mm[2], brut: y });
	});
	return { lignes: l, erreurs: erreurs };
}
function gTexteTodo(R, l){ return l.map(function(x){ return x.verbe === "exec" ? "exec " + x.cmd : x.verbe === "break" ? "break" : x.verbe + " " + gCourt(R, x.hash) + " " + (x.reste !== undefined ? x.reste : gSujet(gCommit(R, x.hash).message)); }).join("\n"); }

GIT_SOUS_COMMANDES.rebase = function(ctx){
	var op = gOptions(ctx.args, { "-i|--interactive": "b", "--continue": "b", "--abort": "b", "--skip": "b", "--quit": "b", "--edit-todo": "b", "--onto": "v", "--root": "b", "--autosquash": "b", "--no-autosquash": "b", "-q|--quiet": "b", "-v|--verbose": "b", "--keep-base": "b", "-x|--exec": "l", "--reapply-cherry-picks": "b", "--merge|-m": "b", "--no-ff|--force-rebase|-f": "b", "--update-refs": "b", "--autostash": "b", "--rebase-merges|-r": "o" }, "rebase");
	var R = ctx.travail();
	var enCours = !!gDossierRebase(R);
	if (op.o["continue"] || op.o.abort || op.o.skip || op.o.quit || op.o["edit-todo"]){
		if (!enCours) throw new GitErreur("fatal: No rebase in progress?", 128);
		if (op.o.abort) return gRebaseAbandon(ctx, R);
		if (op.o.quit){ gSupprimer(R.git, "rebase-merge"); return ""; }
		if (op.o["edit-todo"]){ var todo = gLireRebase(R, "git-rebase-todo") || ""; return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/rebase-merge/git-rebase-todo", texte: todo + "\n" + GIT_AIDE_TODO, fin: function(t){ gEcrireRebase(R, "git-rebase-todo", t.split("\n").filter(function(l){ return l.trim() && l.charAt(0) !== "#"; }).join("\n") + "\n"); return ""; } }); }
		if (op.o.skip){
			var t0 = gTete(R);
			gBasculerArbre(R, gAplatir(R, gCommit(R, t0).arbre), gAplatir(R, gCommit(R, t0).arbre), { force: true });
			gSupprimer(R.git, "rebase-merge/stopped-sha"); gSupprimer(R.git, "rebase-merge/message"); gSupprimer(R.git, "rebase-merge/amend");
			gRefSupprimer(R, "CHERRY_PICK_HEAD");
			ctx.ev.etat = "skip";
			return gRebaseAvancer(ctx, R, []);
		}
		return gRebaseContinuer(ctx, R);
	}
	if (enCours) throw new GitErreur("fatal: It seems that there is already a rebase-merge directory, and\nI wonder if you are in the middle of another rebase.  If that is the\ncase, please try\n\tgit rebase (--continue | --abort | --skip)\nIf that is not the case, please\n\trm -fr \".git/rebase-merge\"\nand run me again.  I am stopping in case you still have something\nvaluable there.\n", 128);
	if (gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.", 1);
	var et = gEtatDepot(R);
	if (et.conflits.length) throw new GitErreur("error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.", 1);
	if (et.modifiees.length || et.indexees.length){
		var m = [];
		if (et.modifiees.length) m.push("error: cannot rebase: You have unstaged changes.");
		if (et.indexees.length) m.push(et.modifiees.length ? "error: additionally, your index contains uncommitted changes." : "error: cannot rebase: Your index contains uncommitted changes.");
		m.push("error: Please commit or stash them.");
		throw new GitErreur(m.join("\n"), 1);
	}
	// git rebase AMONT [BRANCHE] ; --onto NOUVELLE_BASE ; --root.
	if (op.p.length >= 2){
		var b2 = op.p[1];
		if (!gRef(R, "refs/heads/" + b2)) throw new GitErreur("fatal: invalid upstream '" + b2 + "'", 128);
		if (gBrancheCourante(R) !== b2){ var c2 = new GitCtx([b2], { tty: false, err: function(){} }, "switch"); c2.R = R; gBasculer(c2, R, b2, {}); }
	}
	var amont;
	if (op.o.root) amont = null;
	else if (op.p.length) amont = op.p[0];
	else {
		var br = gBrancheCourante(R), am = br ? gAmont(R, br) : null;
		if (!am) throw new GitErreur("There is no tracking information for the current branch.\nPlease specify which branch you want to rebase against.\nSee git-rebase(1) for details.\n\n    git rebase '<branch>'\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=<remote>/<branch> " + (br || "<branch>") + "\n", 1);
		amont = am.replace(/^refs\/remotes\//, "");
	}
	var hAmont = amont !== null ? gEssayer(R, amont, { commit: true }) : null;
	if (amont !== null && !hAmont) throw new GitErreur("fatal: invalid upstream '" + amont + "'", 128);
	var onto = op.o.onto !== undefined ? gEssayer(R, op.o.onto, { commit: true }) : hAmont;
	if (op.o.onto !== undefined && !onto) throw new GitErreur("fatal: invalid onto '" + op.o.onto + "'", 128);
	var t = gTete(R);
	if (op.o["keep-base"] && hAmont) onto = gBaseFusion(R, hAmont, t);
	var tete = gBrancheCourante(R) ? "refs/heads/" + gBrancheCourante(R) : "detached HEAD";
	// Les commits à rejouer : amont..HEAD, sans les fusions, sans ceux déjà en amont (même patch).
	var liste = gParcours(R, [t], hAmont ? [hAmont] : [], {}).reverse().filter(function(h){ return gCommit(R, h).parents.length <= 1; });
	var dejaEnAmont = [];
	if (hAmont && !op.o["reapply-cherry-picks"]){
		var idsAmont = {};
		gParcours(R, [hAmont], [t]).forEach(function(h){ var pid = gPatchId(R, h); if (pid) idsAmont[pid] = true; });
		liste = liste.filter(function(h){ var pid = gPatchId(R, h); if (pid && idsAmont[pid]){ dejaEnAmont.push(h); return false; } return true; });
	}
	var interactif = !!op.o.interactive;
	var todo = liste.map(function(h){ return { verbe: "pick", hash: h }; });
	if ((op.o.autosquash || (interactif && gConfigVrai(R, "rebase.autoSquash", false))) && op.o.autosquash !== false) todo = gAutosquash(R, todo);
	(op.o.exec || []).forEach(function(cmd){ var n = []; todo.forEach(function(x){ n.push(x); n.push({ verbe: "exec", cmd: cmd }); }); todo = n; });
	var avert = dejaEnAmont.map(function(h){ return "warning: skipped previously applied commit " + gCourt(R, h); });
	if (avert.length) avert.push("hint: use --reapply-cherry-picks to include skipped commits", "hint: Disable this message with \"git config advice.skippedCherryPicks false\"");
	ctx.ev.interactif = interactif; ctx.ev.onto = onto; ctx.ev.amont = hAmont;
	// Déjà à jour (et pas interactif) : rien à faire.
	if (!interactif && onto && gEstAncetre(R, onto, t) && (hAmont ? gBaseFusion(R, hAmont, t) === onto : true) && !op.o["force-rebase"] && liste.length === gParcours(R, [t], [onto]).length && !dejaEnAmont.length){
		ctx.ev.etat = "aJour";
		return "Current branch " + (gBrancheCourante(R) || "HEAD") + " is up to date.";
	}
	// L'état : rebase-merge/.
	gEcrireRebase(R, "head-name", tete);
	gEcrireRebase(R, "onto", onto || GIT_ARBRE_VIDE);
	if (op.o["force-rebase"]) gEcrireRebase(R, "force-rebase", "");
	gEcrireRebase(R, "orig-head", t);
	gEcrireRebase(R, "done", "");
	gEcrireRebase(R, "end", String(todo.length));
	gEcrireRebase(R, "msgnum", "0");
	if (interactif) gEcrireRebase(R, "interactive", "");
	gEcrire(R.git, "ORIG_HEAD", t + "\n");
	function demarrer(lignes){
		gEcrireRebase(R, "git-rebase-todo", gTexteTodo(R, lignes) + "\n");
		gEcrireRebase(R, "end", String(lignes.length));
		// On part de onto, en HEAD détaché.
		var H = gAplatir(R, gCommit(R, t).arbre);
		var depart = onto || null;
		if (depart){
			gBasculerArbre(R, H, gAplatir(R, gCommit(R, depart).arbre), { force: true });
			gEcrire(R.git, "HEAD", depart + "\n");
			gReflogAjouter(R, "HEAD", t, depart, "rebase (start): checkout " + (op.o.onto || amont));
		}
		return gRebaseAvancer(ctx, R, avert);
	}
	if (!interactif) return demarrer(todo);
	var modele = (todo.length ? gTexteTodo(R, todo) : "noop") + "\n\n# Rebase " + (hAmont ? gCourt(R, hAmont) : "") + ".." + gCourt(R, t) + " onto " + (onto ? gCourt(R, onto) : "") + " (" + todo.length + " command" + (todo.length === 1 ? "" : "s") + ")" + GIT_AIDE_TODO;
	return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/rebase-merge/git-rebase-todo", texte: modele, fin: function(texte){
		var a = gAnalyserTodo(R, texte);
		if (a.erreurs.length){
			gSupprimer(R.git, "rebase-merge");
			throw new GitErreur(a.erreurs.join("\n") + "\nYou can fix this with 'git rebase --edit-todo' and then run 'git rebase --continue'.\nOr you can abort the rebase with 'git rebase --abort'.", 1);
		}
		if (!a.lignes.length){ gSupprimer(R.git, "rebase-merge"); gRefSupprimer(R, "ORIG_HEAD"); ctx.ev.etat = "vide"; return "Nothing to do"; }
		if (a.lignes[0].verbe === "squash" || a.lignes[0].verbe === "fixup"){ gSupprimer(R.git, "rebase-merge"); throw new GitErreur("error: cannot '" + a.lignes[0].verbe + "' without a previous commit\nYou can fix this with 'git rebase --edit-todo' and then run 'git rebase --continue'.\nOr you can abort the rebase with 'git rebase --abort'.", 1); }
		ctx.ev.todo = a.lignes.map(function(x){ return x.verbe + (x.hash ? " " + x.hash : ""); });
		return demarrer(a.lignes);
	} });
};
/* --autosquash : chaque « fixup! X » ou « squash! X » se range sous le commit X. */
function gAutosquash(R, todo){
	var sortie = [], places = {};
	todo.forEach(function(x){
		var s = gSujet(gCommit(R, x.hash).message);
		var m = /^(fixup|squash)! (.*)$/.exec(s);
		if (m){
			var cible = null;
			sortie.forEach(function(y, i){ if (y.verbe !== "exec" && gSujet(gCommit(R, y.hash).message) === m[2]) cible = i; });
			if (cible !== null){
				var ou = cible + 1;
				while (ou < sortie.length && (sortie[ou].verbe === "fixup" || sortie[ou].verbe === "squash")) ou++;
				sortie.splice(ou, 0, { verbe: m[1], hash: x.hash });
				return;
			}
		}
		sortie.push(x);
	});
	return sortie;
}
/* Exécute la liste todo jusqu'au bout, ou jusqu'au premier arrêt (conflit, edit, break, éditeur). */
function gRebaseAvancer(ctx, R, sortieAvant){
	var sortie = (sortieAvant || []).slice();
	var garde = 0;
	while (garde++ < 1000){
		var todo = gAnalyserTodo(R, gLireRebase(R, "git-rebase-todo") || "").lignes;
		if (!todo.length) return gRebaseFinir(ctx, R, sortie);
		var x = todo.shift();
		var fait = (gLireRebase(R, "done") || "");
		gEcrireRebase(R, "done", fait + (fait ? "\n" : "") + x.brut || (x.verbe + " " + x.hash));
		gEcrireRebase(R, "git-rebase-todo", gTexteTodo(R, todo) + (todo.length ? "\n" : ""));
		gEcrireRebase(R, "msgnum", String((+gLireRebase(R, "msgnum") || 0) + 1));
		if (x.verbe === "drop") continue;
		if (x.verbe === "break"){ ctx.ev.etat = "arret"; sortie.push("Stopped at HEAD"); return sortie.join("\n"); }
		if (x.verbe === "exec"){
			sortie.push("Executing: " + x.cmd);
			var code = 0;
			try { var avant = current_room; if (R.top) current_room = R.top; try { Interpreteur.executer(x.cmd); code = Shell.statut || 0; } finally { current_room = avant; } } catch (e){ code = 1; }
			if (code){ sortie.push("warning: execution failed: " + x.cmd + "\nYou can fix the problem, and then run\n\n  git rebase --continue\n"); ctx.code = 1; ctx.ev.etat = "arret"; return sortie.join("\n"); }
			continue;
		}
		var c = gCommit(R, x.hash);
		var t = gTete(R);
		// Un pick (ou edit) dont le parent est déjà HEAD : le vrai avance simplement HEAD sur le commit d'origine.
		if ((x.verbe === "pick" || x.verbe === "edit") && c.parents.length === 1 && c.parents[0] === t && gLireRebase(R, "force-rebase") === null){
			gBasculerArbre(R, gAplatir(R, gCommit(R, t).arbre), gAplatir(R, c.arbre), { quoi: "merge" });
			gRefEcrire(R, "HEAD", x.hash, "rebase: fast-forward");
			if (x.verbe === "edit"){
				gEcrireRebase(R, "stopped-sha", x.hash);
				gEcrireRebase(R, "amend", x.hash);
				ctx.ev.etat = "edit";
				sortie.push("Stopped at " + gCourt(R, x.hash) + "...  " + gSujet(c.message), "You can amend the commit now, with", "", "  git commit --amend ", "", "Once you are satisfied with your changes, run", "", "  git rebase --continue");
				return sortie.join("\n");
			}
			continue;
		}
		// squash et fixup : on rejoue le changement, puis on refait le commit précédent avec les deux.
		var r = gAppliquerCommit(R, x.hash, false);
		if (r.gene){ gEcrireRebase(R, "stopped-sha", x.hash); throw gErreurLocales(r.gene, "merge"); }
		if (!r.ok){
			sortie = sortie.concat(r.messages);
			gEcrireRebase(R, "stopped-sha", x.hash);
			gEcrireRebase(R, "message", c.message);
			if (x.verbe === "squash" || x.verbe === "fixup") gEcrireRebase(R, "amend", t);
			gEcrire(R.git, "CHERRY_PICK_HEAD", x.hash + "\n");
			sortie.push("error: could not apply " + gCourt(R, x.hash) + "... " + gSujet(c.message),
				"hint: Resolve all conflicts manually, mark them as resolved with",
				"hint: \"git add/rm <conflicted_files>\", then run \"git rebase --continue\".",
				"hint: You can instead skip this commit: run \"git rebase --skip\".",
				"hint: To abort and get back to the state before \"git rebase\", run \"git rebase --abort\".",
				"Could not apply " + gCourt(R, x.hash) + "... " + gSujet(c.message));
			ctx.code = 1;
			ctx.ev.etat = "conflit"; ctx.ev.conflits = r.conflits.map(function(z){ return z.p; }); ctx.ev.commit = x.hash;
			return sortie.join("\n");
		}
		var s = gRebaseValider(ctx, R, x, c, t, sortie);
		if (s !== null) return s;
	}
	return sortie.join("\n");
}
/* Écrit le commit d'une étape réussie (pick, reword, edit, squash, fixup). Renvoie null pour continuer, un texte pour s'arrêter. */
function gRebaseValider(ctx, R, x, c, t, sortie, messageForce){
	var auteur = { nom: c.auteur.nom, mail: c.auteur.mail }, date = { s: c.auteur.s, tz: c.auteur.tz };
	var sujet = gSujet(c.message);
	if (x.verbe === "squash" || x.verbe === "fixup"){
		var prec = gCommit(R, t);
		var parents = prec.parents.slice();
		var accumule = gLireRebase(R, "message-squash");
		var nb = +(gLireRebase(R, "nb-squash") || 1) + 1;
		var base = accumule !== null ? accumule : "# This is a combination of 2 commits.\n# This is the 1st commit message:\n\n" + gNettoyerMessage(prec.message);
		if (accumule !== null) base = base.replace(/^# This is a combination of \d+ commits\./, "# This is a combination of " + nb + " commits.");
		var ordinal = function(n){ return n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"); };
		var ajout = x.verbe === "squash" ? "\n# This is the commit message #" + nb + ":\n\n" + gNettoyerMessage(c.message) : "\n# The commit message #" + nb + " will be skipped:\n\n" + gNettoyerMessage(c.message).replace(/^/gm, "# ").replace(/^# $/gm, "#");
		var combine = base + ajout;
		gEcrireRebase(R, "message-squash", combine);
		gEcrireRebase(R, "nb-squash", String(nb));
		var suivant = gAnalyserTodo(R, gLireRebase(R, "git-rebase-todo") || "").lignes[0];
		var encore = suivant && (suivant.verbe === "squash" || suivant.verbe === "fixup");
		var auteurPrec = { nom: prec.auteur.nom, mail: prec.auteur.mail }, datePrec = { s: prec.auteur.s, tz: prec.auteur.tz };
		var ecrire = function(msg){
			var res = gCommitDepuisIndex(R, { message: msg, parents: parents, auteur: auteurPrec, dateAuteur: datePrec });
			gRefEcrire(R, "HEAD", res.hash, "rebase (" + x.verbe + "): " + gSujet(msg));
			return res.hash;
		};
		var aEditer = combine.indexOf("# This is the commit message #") > -1;
		if (encore || !aEditer){
			// Tant que d'autres squash suivent, ou si tout n'est que fixup : le message garde le premier.
			var msgAuto = gNettoyerMessage(combine, true);
			ecrire(msgAuto);
			if (!encore){ gSupprimer(R.git, "rebase-merge/message-squash"); gSupprimer(R.git, "rebase-merge/nb-squash"); }
			return null;
		}
		gSupprimer(R.git, "rebase-merge/message-squash"); gSupprimer(R.git, "rebase-merge/nb-squash");
		var modele = combine + "\n\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n";
		ctx.ev.squash = true;
		return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, fin: function(texte){
			var msg = gNettoyerMessage(texte, true);
			if (!msg) throw new GitErreur("error: Aborting commit due to empty commit message.\nCould not commit staged changes.", 1);
			ecrire(msg);
			return gRebaseAvancer(ctx, R, sortie);
		} }) || "";
	}
	if (gLireRebase(R, "message-squash") !== null){ gSupprimer(R.git, "rebase-merge/message-squash"); gSupprimer(R.git, "rebase-merge/nb-squash"); }
	var idem = gComparerCartes(gAplatir(R, gCommit(R, t).arbre), gIndexCarte(gIndex(R))).length === 0 && gChangesCommit(R, x.hash).length > 0;
	if (idem && x.verbe !== "edit"){
		// Le changement est déjà là : le commit devient vide et part (comme --empty=drop).
		return null;
	}
	var message = messageForce || c.message;
	var ecrireCommit = function(msg){
		var res = gCommitDepuisIndex(R, { message: msg, parents: [t], auteur: auteur, dateAuteur: date });
		gRefEcrire(R, "HEAD", res.hash, "rebase (" + (x.verbe === "edit" ? "edit" : x.verbe) + "): " + gSujet(msg));
		(ctx.ev.nouveaux = ctx.ev.nouveaux || []).push(res.hash);
		return res.hash;
	};
	if (x.verbe === "reword"){
		var modele = gNettoyerMessage(message) + "\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n# interactive rebase in progress; onto " + gCourt(R, gLireRebase(R, "onto")) + "\n#\n";
		ctx.ev.reword = true;
		return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, fin: function(texte){
			var msg = gNettoyerMessage(texte, true);
			if (!msg) throw new GitErreur("error: Aborting commit due to empty commit message.\nCould not commit staged changes.", 1);
			var h = ecrireCommit(msg);
			var s = gResumeSequenceur(R, h);
			var suite = gRebaseAvancer(ctx, R, []);
			return s + (suite ? "\n" + suite : "");
		} }) || "";
	}
	var h2 = ecrireCommit(message);
	if (x.verbe === "edit"){
		gEcrireRebase(R, "stopped-sha", x.hash);
		gEcrireRebase(R, "amend", h2);
		ctx.ev.etat = "edit";
		sortie.push("Stopped at " + gCourt(R, x.hash) + "...  " + sujet, "You can amend the commit now, with", "", "  git commit --amend ", "", "Once you are satisfied with your changes, run", "", "  git rebase --continue");
		return sortie.join("\n");
	}
	return null;
}
function gRebaseContinuer(ctx, R){
	var conf = Object.keys(gConflitsIndex(gIndex(R)));
	if (conf.length) throw new GitErreur(conf.map(function(p){ return p + ": needs merge"; }).join("\n") + "\nYou must edit all merge conflicts and then\nmark them as resolved using git add", 1);
	var arret = gLireRebase(R, "stopped-sha");
	var t = gTete(R);
	var sale = gComparerCartes(gAplatir(R, gCommit(R, t).arbre), gIndexCarte(gIndex(R))).length > 0;
	var amende = gLireRebase(R, "amend");
	if (arret && gRefBrute(R, "CHERRY_PICK_HEAD")){
		// Après un conflit : on valide la résolution avec le message d'origine (l'éditeur s'ouvre, comme le vrai).
		var c = gCommit(R, arret);
		var squash = !!amende;
		gSupprimer(R.git, "rebase-merge/stopped-sha");
		gRefSupprimer(R, "CHERRY_PICK_HEAD");
		var x = { verbe: squash ? "squash" : "pick", hash: arret };
		if (!sale && !squash){ gSupprimer(R.git, "rebase-merge/message"); ctx.ev.etat = "resolu"; return gRebaseAvancer(ctx, R, []); }
		var message = gLireRebase(R, "message") || c.message;
		gSupprimer(R.git, "rebase-merge/message");
		if (squash){ gSupprimer(R.git, "rebase-merge/amend"); var s0 = gRebaseValider(ctx, R, x, c, t, []); return s0 !== null ? s0 : gRebaseAvancer(ctx, R, []); }
		var modele = gNettoyerMessage(message) + "\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n# interactive rebase in progress; onto " + gCourt(R, gLireRebase(R, "onto")) + "\n#\n";
		ctx.ev.etat = "resolu";
		return gOuvrirEditeur(ctx, { titre: gCheminReel(R.git) + "/COMMIT_EDITMSG", texte: modele, fin: function(texte){
			var msg = gNettoyerMessage(texte, true);
			if (!msg) throw new GitErreur("error: Aborting commit due to empty commit message.\nCould not commit staged changes.", 1);
			var res = gCommitDepuisIndex(R, { message: msg, parents: [t], auteur: { nom: c.auteur.nom, mail: c.auteur.mail }, dateAuteur: { s: c.auteur.s, tz: c.auteur.tz } });
			gRefEcrire(R, "HEAD", res.hash, "rebase (continue): " + gSujet(msg));
			var s = "[detached HEAD " + gCourt(R, res.hash) + "] " + gSujet(msg) + "\n" + gResumeSequenceur(R, res.hash).split("\n").slice(1).join("\n");
			var suite = gRebaseAvancer(ctx, R, []);
			return s + (suite ? "\n" + suite : "");
		} }) || "";
	}
	if (arret && amende){
		// Un « edit » : le joueur a pu faire commit --amend ; des changements encore indexés sont refusés, comme le vrai.
		if (sale) throw new GitErreur("error: you have staged changes in your working tree\nIf these changes are meant to be squashed into the previous commit, run:\n\n  git commit --amend \n\nIf they are meant to go into a new commit, run:\n\n  git commit \n\nIn both cases, once you're done, continue with:\n\n  git rebase --continue\n", 1);
		gSupprimer(R.git, "rebase-merge/stopped-sha"); gSupprimer(R.git, "rebase-merge/amend");
		ctx.ev.etat = "continue";
		return gRebaseAvancer(ctx, R, []);
	}
	if (sale) throw new GitErreur("error: you have staged changes in your working tree\nIf these changes are meant to be squashed into the previous commit, run:\n\n  git commit --amend \n\nIf they are meant to go into a new commit, run:\n\n  git commit \n\nIn both cases, once you're done, continue with:\n\n  git rebase --continue\n", 1);
	ctx.ev.etat = "continue";
	return gRebaseAvancer(ctx, R, []);
}
function gRebaseFinir(ctx, R, sortie){
	var tete = gLireRebase(R, "head-name"), onto = gLireRebase(R, "onto"), t = gTete(R);
	if (tete && tete !== "detached HEAD"){
		gRefEcrire(R, tete, t, "rebase (finish): " + tete + " onto " + onto, { sansHead: true });
		gEcrire(R.git, "HEAD", "ref: " + tete + "\n");
		gReflogAjouter(R, "HEAD", t, t, "rebase (finish): returning to " + tete);
	}
	gSupprimer(R.git, "rebase-merge");
	gRefSupprimer(R, "CHERRY_PICK_HEAD");
	ctx.ev.etat = "fini"; ctx.ev.hash = t; ctx.ev.branche = tete;
	sortie = (sortie || []).slice();
	sortie.push("Successfully rebased and updated " + (tete || "detached HEAD") + ".");
	return sortie.join("\n");
}
function gRebaseAbandon(ctx, R){
	var tete = gLireRebase(R, "head-name"), orig = gLireRebase(R, "orig-head"), t = gTete(R);
	gBasculerArbre(R, gAplatir(R, gCommit(R, t).arbre), gAplatir(R, gCommit(R, orig).arbre), { force: true });
	if (tete && tete !== "detached HEAD"){
		gEcrire(gCommun(R), tete, orig + "\n");
		gEcrire(R.git, "HEAD", "ref: " + tete + "\n");
		gReflogAjouter(R, "HEAD", t, orig, "rebase (abort): returning to " + tete);
	} else { gEcrire(R.git, "HEAD", orig + "\n"); gReflogAjouter(R, "HEAD", t, orig, "rebase (abort): returning to " + orig); }
	gSupprimer(R.git, "rebase-merge");
	gRefSupprimer(R, "CHERRY_PICK_HEAD");
	ctx.ev.etat = "abandon";
	return "";
}

/* ================================================================== */
/* stash                                                               */
/* ================================================================== */

function gStashListe(R){ return gReflogLire(R, "refs/stash"); }
function gStashResoudre(R, nom){
	var l = gStashListe(R);
	if (!l.length) throw new GitErreur("No stash entries found.", 1);
	var n = 0;
	if (nom){ var m = /^(?:stash@\{)?(\d+)\}?$/.exec(nom); if (!m) throw new GitErreur("error: " + nom + " is not a valid reference", 1); n = +m[1]; }
	if (n >= l.length) throw new GitErreur("error: stash@{" + n + "} is not a valid reference", 1);
	return { n: n, hash: l[n].nouveau, message: l[n].message };
}
function gStashRetirer(R, n){
	var l = gStashListe(R).reverse();
	var garde = l.filter(function(e, i){ return i !== l.length - 1 - n; });
	if (!garde.length){ gRefSupprimer(R, "refs/stash"); gSupprimer(gCommun(R), "logs/refs/stash"); return; }
	// Réécrire le journal (du plus ancien au plus récent) et pointer refs/stash sur le dernier.
	var texte = garde.map(function(e, i){ return (i === 0 ? GIT_VIDE : garde[i - 1].nouveau) + " " + e.nouveau + " " + e.nom + " <" + e.mail + "> " + e.s + " " + e.tz + "\t" + e.message; }).join("\n") + "\n";
	gEcrire(gCommun(R), "logs/refs/stash", texte);
	gEcrire(gCommun(R), "refs/stash", garde[garde.length - 1].nouveau + "\n");
}

GIT_SOUS_COMMANDES.stash = function(ctx){
	var args = ctx.args.slice();
	var sous = /^(push|save|list|show|pop|apply|drop|clear|branch|create|store)$/.test(args[0] || "") ? args.shift() : "push";
	var R = ctx.travail();
	ctx.ev.action = sous;
	if (sous === "list"){
		return gStashListe(R).map(function(e, i){ return "stash@{" + i + "}: " + e.message; }).join("\n");
	}
	if (sous === "clear"){ gRefSupprimer(R, "refs/stash"); gSupprimer(gCommun(R), "logs/refs/stash"); return ""; }
	if (sous === "drop"){
		var d = gStashResoudre(R, args[0]);
		gStashRetirer(R, d.n);
		return "Dropped " + (args[0] ? "stash@{" + d.n + "}" : "refs/stash@{0}") + " (" + d.hash + ")";
	}
	if (sous === "show"){
		var opS = gOptions(args, { "-p|--patch": "b", "--stat": "b", "-u|--include-untracked": "b" }, "stash");
		var s = gStashResoudre(R, opS.p[0]);
		var c = gCommit(R, s.hash);
		var ch = gComparerCartes(gAplatir(R, gCommit(R, c.parents[0]).arbre), gAplatir(R, c.arbre));
		if (opS.o.patch) return ch.map(function(x){ return gDiffFichier(R, x.chemin, x.a, x.b); }).join("\n");
		return gStat(R, ch);
	}
	if (sous === "pop" || sous === "apply"){
		var opA = gOptions(args, { "--index": "b", "-q|--quiet": "b" }, "stash");
		var st = gStashResoudre(R, opA.p[0]);
		var w = gCommit(R, st.hash);
		var base = gAplatir(R, gCommit(R, w.parents[0]).arbre), W = gAplatir(R, w.arbre);
		var I0 = w.parents[1] ? gAplatir(R, gCommit(R, w.parents[1]).arbre) : W;
		var t = gTete(R), H = gAplatir(R, gCommit(R, t).arbre);
		var et = gEtatDepot(R);
		if (et.conflits.length) throw new GitErreur("error: could not write index\nerror: could not restore untracked files from stash", 1);
		// Les fichiers non suivis du stash (troisième parent) : ils ne doivent pas écraser l'existant.
		var U = w.parents[2] ? gAplatir(R, gCommit(R, w.parents[2]).arbre) : {};
		var trav = gFichiersTravail(R);
		var gene = Object.keys(U).filter(function(p){ return trav[p]; });
		if (gene.length) throw new GitErreur(gene.map(function(p){ return p + " already exists, no checkout"; }).join("\n") + "\nerror: could not restore untracked files from stash", 1);
		var res = gFusionArbres(R, base, H, W, ["Updated upstream", "Stashed changes", "Stash base"], gStyleConflit(R));
		var v = gVerifierAvantFusion(R, H, res, "merge");
		if (v){ throw new GitErreur("error: Your local changes to the following files would be overwritten by merge:\n" + v.chemins.map(function(p){ return "\t" + p; }).join("\n") + "\nPlease commit your changes or stash them before you merge.\nAborting\nThe stash entry is kept in case you need it again.", 1); }
		var Iavant = gIndexCarte(gIndex(R));
		gPoserFusion(R, H, res);
		// Sans --index, ce qui était indexé redevient non indexé, sauf les fichiers nouveaux (ils restent ajoutés).
		if (!res.conflits.length){
			var entrees = [];
			var carteFinale = res.carte;
			Object.keys(carteFinale).forEach(function(p){
				if (opA.o.index && I0[p]) entrees.push({ p: p, h: I0[p].h, m: I0[p].m, s: 0 });
				else if (H[p]) entrees.push({ p: p, h: Iavant[p] ? Iavant[p].h : H[p].h, m: H[p].m, s: 0 });
				else if (I0[p] && !base[p]) entrees.push({ p: p, h: opA.o.index ? I0[p].h : carteFinale[p].h, m: carteFinale[p].m, s: 0 });
				else if (Iavant[p]) entrees.push({ p: p, h: Iavant[p].h, m: Iavant[p].m, s: 0 });
			});
			gIndexEcrire(R, entrees);
		}
		Object.keys(U).forEach(function(p){ gPoserTravail(R, p, U[p].h, U[p].m); });
		var sortie = res.messages.slice();
		if (res.conflits.length){
			sortie.push("On branch " + (gBrancheCourante(R) || "HEAD"));
			sortie.push("The stash entry is kept in case you need it again.");
			ctx.code = 1;
			ctx.ev.conflits = res.conflits.map(function(c){ return c.p; });
			return sortie.join("\n");
		}
		if (!Object.keys(gComparerCartes(H, W)).length && !res.messages.length) sortie.push("Already up to date.");
		if (!opA.o.quiet) sortie.push(gTexteStatut(ctx, R, {}));
		if (sous === "pop"){ gStashRetirer(R, st.n); sortie.push("Dropped " + (opA.p[0] ? "stash@{" + st.n + "}" : "refs/stash@{0}") + " (" + st.hash + ")"); }
		return sortie.join("\n");
	}
	if (sous === "branch"){
		if (!args[0]) throw new GitErreur("fatal: No branch name specified", 128);
		var sb = gStashResoudre(R, args[1]);
		var cb = gCommit(R, sb.hash);
		var c3 = new GitCtx(["-c", args[0], cb.parents[0]], ctx.io, "switch"); c3.R = R;
		var s1 = GIT_SOUS_COMMANDES["switch"](c3);
		ctx.args = ["pop"].concat(args[1] ? [args[1]] : []);
		return s1 + "\n" + GIT_SOUS_COMMANDES.stash(ctx);
	}
	// push (et save).
	var op = gOptions(args, { "-m|--message": "v", "-u|--include-untracked": "b", "-a|--all": "b", "-k|--keep-index": "b", "-p|--patch": "b", "-q|--quiet": "b", "-S|--staged": "b" }, "stash");
	if (sous === "save" && op.p.length) op.o.message = op.p.join(" ");
	var t2 = gTete(R);
	if (!t2) throw new GitErreur("You do not have the initial commit yet", 1);
	var et2 = gEtatDepot(R);
	if (et2.conflits.length) throw new GitErreur(et2.conflits.map(function(p){ return p + ": needs merge"; }).join("\n") + "\nerror: could not write index", 1);
	var specs = gPathspecs(ctx, sous === "save" ? [] : op.p.concat(op.apres || []));
	var nonSuivis = (op.o["include-untracked"] || op.o.all) ? (op.o.all ? Object.keys(gFichiersTravail(R)).filter(function(p){ return !gIndexCarte(gIndex(R))[p]; }) : et2.nonSuivies) : [];
	nonSuivis = nonSuivis.filter(function(p){ return gCorrespond(specs, p); });
	var touche = et2.indexees.concat(et2.modifiees).filter(function(x){ return gCorrespond(specs, x.chemin); });
	if (!touche.length && !nonSuivis.length) return "No local changes to save";
	var Ht = gAplatir(R, gCommit(R, t2).arbre), It = gIndexCarte(gIndex(R)), Wt = {};
	var travail = gFichiersTravail(R);
	Object.keys(It).forEach(function(p){ var it = travail[p]; if (it) Wt[p] = { h: gObjetEcrire(R, "blob", gContenu(it)), m: gModeItem(it) }; });
	var br = gBrancheCourante(R) || "(no branch)";
	var sujet = gCourt(R, t2) + " " + gSujet(gCommit(R, t2).message);
	var id = gIdentite(R, "committer"), d = gDateCommit(R, "committer");
	function commit(carte, parents, msg, sansFin){ return gObjetEcrire(R, "commit", gTexteCommit({ arbre: gArbreDepuisCarte(R, carte), parents: parents, auteur: { nom: id.nom, mail: id.mail, s: d.s, tz: d.tz }, commiteur: { nom: id.nom, mail: id.mail, s: d.s, tz: d.tz }, message: msg + (sansFin ? "" : "\n") })); }
	var hi = commit(It, [t2], "index on " + br + ": " + sujet);
	var parentsW = [t2, hi];
	if (nonSuivis.length){ var Uc = {}; nonSuivis.forEach(function(p){ var it = travail[p]; Uc[p] = { h: gObjetEcrire(R, "blob", gContenu(it)), m: gModeItem(it) }; }); parentsW.push(commit(Uc, [], "untracked files on " + br + ": " + sujet)); }
	var titre = op.o.message ? "On " + br + ": " + op.o.message : "WIP on " + br + ": " + sujet;
	// Le vrai git n'ajoute pas de fin de ligne au message du WIP.
	var hw = commit(Wt, parentsW, titre, true);
	var ancien = gRef(R, "refs/stash");
	gEcrire(gCommun(R), "refs/stash", hw + "\n");
	var l0 = gLire(gCommun(R), "logs/refs/stash") || "";
	gEcrire(gCommun(R), "logs/refs/stash", l0 + (ancien || GIT_VIDE) + " " + hw + " " + id.nom + " <" + id.mail + "> " + d.s + " " + d.tz + "\t" + titre + "\n");
	// Puis on remet la copie de travail (et l'index, sauf --keep-index) sur HEAD.
	if (specs.length){
		var ent = gIndex(R).map(function(e){ return gCorrespond(specs, e.p) && Ht[e.p] ? { p: e.p, h: Ht[e.p].h, m: Ht[e.p].m, s: 0 } : e; }).filter(function(e){ return !gCorrespond(specs, e.p) || Ht[e.p]; });
		gIndexEcrire(R, ent);
		touche.forEach(function(x){ if (Ht[x.chemin]) gPoserTravail(R, x.chemin, Ht[x.chemin].h, Ht[x.chemin].m); else gRetirerTravail(R, x.chemin); });
	} else {
		gBasculerArbre(R, Ht, op.o["keep-index"] ? It : Ht, { force: true });
		if (op.o["keep-index"]) gIndexEcrire(R, Object.keys(It).map(function(p){ return { p: p, h: It[p].h, m: It[p].m, s: 0 }; }));
	}
	nonSuivis.forEach(function(p){ gRetirerTravail(R, p); });
	ctx.ev.hash = hw;
	return op.o.quiet ? "" : "Saved working directory and index state " + titre;
};

/* ================================================================== */
/* bisect                                                              */
/* ================================================================== */

function gBisectEtat(R){
	var bad = gRef(R, "refs/bisect/bad");
	var goods = gRefs(R, "refs/bisect/").filter(function(r){ return /^refs\/bisect\/good-/.test(r.nom); }).map(function(r){ return r.hash; });
	var skips = gRefs(R, "refs/bisect/").filter(function(r){ return /^refs\/bisect\/skip-/.test(r.nom); }).map(function(r){ return r.hash; });
	var termes = (gLire(R.git, "BISECT_TERMS") || "bad\ngood").split("\n");
	return { bad: bad, goods: goods, skips: skips, mauvais: termes[0] || "bad", bon: termes[1] || "good" };
}
function gBisectJournal(R, ligne){ gEcrire(R.git, "BISECT_LOG", (gLire(R.git, "BISECT_LOG") || "") + ligne + "\n"); }
/* Choisit le prochain commit à tester (find_bisection du vrai) ; écrit la sortie. */
function gBisectSuivant(ctx, R){
	var e = gBisectEtat(R);
	if (!e.bad && !e.goods.length){ gBisectJournal(R, "# status: waiting for both good and bad commits"); return "status: waiting for both good and bad commits"; }
	if (!e.bad){ gBisectJournal(R, "# status: waiting for bad commit, " + e.goods.length + " good commit" + (e.goods.length > 1 ? "s" : "") + " known"); return "status: waiting for bad commit, " + e.goods.length + " good commit" + (e.goods.length > 1 ? "s" : "") + " known"; }
	if (!e.goods.length){ gBisectJournal(R, "# status: waiting for good commit(s), bad commit known"); return "status: waiting for good commit(s), bad commit known"; }
	// Un « bon » qui n'est pas ancêtre du « mauvais » : le vrai cherche une base ; ici on le dit.
	var nonAncetres = e.goods.filter(function(g){ return !gEstAncetre(R, g, e.bad); });
	if (nonAncetres.length) throw new GitErreur("Some good revs are not ancestors of the bad rev.\ngit bisect cannot work properly in this case.\nMaybe you mistook good and bad revs?", 1);
	var candidats = gParcours(R, [e.bad], e.goods).filter(function(h){ return e.skips.indexOf(h) === -1 || h === e.bad; });
	var liste = candidats.slice().reverse(); // du plus ancien au plus récent, comme le vrai après inversion
	var nr = liste.length;
	if (nr <= 1 || (nr === 1)){
		return gBisectFini(ctx, R, e.bad);
	}
	var dans = {}; liste.forEach(function(h){ dans[h] = true; });
	var poids = {};
	function parentsInteressants(h){ return gCommit(R, h).parents.filter(function(p){ return dans[p]; }); }
	function distance(h){ var vus = {}, pile = [h], n = 0; while (pile.length){ var x = pile.pop(); if (vus[x] || !dans[x]) continue; vus[x] = true; n++; gCommit(R, x).parents.forEach(function(p){ pile.push(p); }); } return n; }
	function aMiChemin(h){ var d = 2 * poids[h] - nr; return d >= -1 && d <= 1; }
	var choisi = null, compte = 0;
	liste.forEach(function(h){ var n = parentsInteressants(h).length; poids[h] = n === 0 ? 1 : (n === 1 ? -1 : -2); if (n === 0) compte++; });
	for (var i = 0; i < liste.length && !choisi; i++){ var h = liste[i]; if (poids[h] !== -2) continue; poids[h] = distance(h); if (aMiChemin(h)) choisi = h; compte++; }
	var garde = 0;
	while (!choisi && compte < nr && garde++ < 10000){
		var avance = false;
		for (var j = 0; j < liste.length && !choisi; j++){
			var p = liste[j];
			if (poids[p] >= 0) continue;
			var q = parentsInteressants(p).filter(function(x){ return poids[x] >= 0; })[0];
			if (!q) continue;
			poids[p] = poids[q] + 1; compte++; avance = true;
			if (aMiChemin(p)) choisi = p;
		}
		if (!avance) break;
	}
	if (!choisi){
		var meilleur = -1;
		liste.forEach(function(h){ var d = poids[h] < 0 ? distance(h) : poids[h]; poids[h] = d; var x = Math.min(d, nr - d); if (x > meilleur){ meilleur = x; choisi = h; } });
	}
	var reste = nr - poids[choisi] - 1;
	var etapes = gEtapesBisect(nr);
	// On bascule (HEAD détaché) sur le commit à tester.
	var t = gTete(R);
	gBasculerArbre(R, gAplatir(R, gCommit(R, t).arbre), gAplatir(R, gCommit(R, choisi).arbre), { quoi: "checkout" });
	gEcrire(R.git, "HEAD", choisi + "\n");
	gReflogAjouter(R, "HEAD", t, choisi, "checkout: moving from " + (gLire(R.git, "BISECT_START") || "").trim() + " to " + choisi);
	ctx.ev.etat = "teste"; ctx.ev.teste = choisi; ctx.ev.reste = reste;
	return "Bisecting: " + reste + " revision" + (reste === 1 ? "" : "s") + " left to test after this (roughly " + etapes + " step" + (etapes === 1 ? "" : "s") + ")\n[" + choisi + "] " + gSujet(gCommit(R, choisi).message);
}
function gEtapesBisect(tous){
	if (tous < 3) return 0;
	var n = Math.floor(Math.log(tous) / Math.LN2), e = Math.pow(2, n), x = tous - e;
	return e < 3 * x ? n : n - 1;
}
function gBisectFini(ctx, R, h){
	var c = gCommit(R, h);
	var l = [h + " is the first bad commit", "commit " + h, "Author: " + c.auteur.nom + " <" + c.auteur.mail + ">", "Date:   " + gDateTexte(c.auteur.s, c.auteur.tz), ""];
	gNettoyerMessage(c.message).replace(/\n$/, "").split("\n").forEach(function(x){ l.push(x === "" ? "" : "    " + x); });
	var ch = gChangesCommit(R, h), st = gStat(R, ch);
	if (st){ l.push(""); l = l.concat(st.split("\n")); }
	l = l.concat(gResumeModes(ch));
	gBisectJournal(R, "# first bad commit: [" + h + "] " + gSujet(c.message));
	ctx.ev.etat = "trouve"; ctx.ev.premierMauvais = h;
	return l.join("\n");
}

GIT_SOUS_COMMANDES.bisect = function(ctx){
	var args = ctx.args.slice();
	var sous = args.shift() || "help";
	var R = ctx.travail();
	var enCours = !!gItem(R.git, "BISECT_START");
	ctx.ev.action = sous;
	var e = enCours ? gBisectEtat(R) : null;
	if (e){ if (sous === e.mauvais) sous = "bad"; else if (sous === e.bon) sous = "good"; }
	if (sous === "new") sous = "bad"; if (sous === "old") sous = "good";
	if (sous === "help" || sous === "-h") return "usage: git bisect [help|start|bad|good|new|old|terms|skip|next|reset|visualize|view|replay|log|run]";
	if (sous === "start"){
		var op = gOptions(args, { "--term-new|--term-bad": "v", "--term-old|--term-good": "v", "--no-checkout": "b", "--first-parent": "b" }, "bisect");
		if (enCours){ gBisectReset(R, null, true); }
		var br = gBrancheCourante(R) || gTete(R);
		gEcrire(R.git, "BISECT_START", br + "\n");
		gEcrire(R.git, "BISECT_TERMS", (op.o["term-new"] || "bad") + "\n" + (op.o["term-old"] || "good") + "\n");
		// Comme le vrai : les révisions données à start sont notées en commentaire, puis vient la ligne de start.
		gEcrire(R.git, "BISECT_LOG", "");
		var revs = op.p.concat(op.apres || []);
		if (revs[0]){ var hb = gResoudre(R, revs[0], { commit: true }); gEcrire(gCommun(R), "refs/bisect/bad", hb + "\n"); gBisectJournal(R, "# bad: [" + hb + "] " + gSujet(gCommit(R, hb).message)); }
		revs.slice(1).forEach(function(x){ var hg = gResoudre(R, x, { commit: true }); gEcrire(gCommun(R), "refs/bisect/good-" + hg, hg + "\n"); gBisectJournal(R, "# good: [" + hg + "] " + gSujet(gCommit(R, hg).message)); });
		gBisectJournal(R, "git bisect start" + (args.length ? " '" + args.join("' '") + "'" : ""));
		ctx.ev.etat = "debut";
		return gBisectSuivant(ctx, R);
	}
	if (!enCours){
		if (sous === "reset") return "We are not bisecting.";
		if (sous === "log") throw new GitErreur("error: We are not bisecting.", 1);
		if (sous === "bad" || sous === "good" || sous === "skip" || sous === "run"){ throw new GitErreur("You need to start by \"git bisect start\"\n\nDo you want me to do it for you [Y/n]? " + C.gris("(git bisect start, d'abord.)"), 1); }
	}
	if (sous === "reset") return gBisectReset(R, args[0] || null, false);
	if (sous === "log") return (gLire(R.git, "BISECT_LOG") || "").replace(/\n$/, "");
	if (sous === "terms") return "Your current terms are " + e.bon + " for the old state\nand " + e.mauvais + " for the new state.";
	if (sous === "visualize" || sous === "view"){ var e2 = gBisectEtat(R); ctx.args = ["--oneline", e2.bad || "HEAD", "--not"].concat(e2.goods); return gParcours(R, [e2.bad || gTete(R)], e2.goods).map(function(h){ return gCourt(R, h) + " " + gSujet(gCommit(R, h).message); }).join("\n"); }
	if (sous === "bad" || sous === "good" || sous === "skip"){
		var cibles = args.length ? args : ["HEAD"];
		var deja = gBisectEtat(R);
		for (var i = 0; i < cibles.length; i++){
			var h = gResoudre(R, cibles[i], { commit: true });
			if (sous === "bad"){
				if (deja.goods.indexOf(h) > -1) throw new GitErreur(h + " was both " + deja.bon + " and " + deja.mauvais, 1);
				gEcrire(gCommun(R), "refs/bisect/bad", h + "\n");
			} else if (sous === "good"){
				if (deja.bad === h) throw new GitErreur(h + " was both " + deja.bon + " and " + deja.mauvais, 1);
				gEcrire(gCommun(R), "refs/bisect/good-" + h, h + "\n");
			} else gEcrire(gCommun(R), "refs/bisect/skip-" + h, h + "\n");
			gBisectJournal(R, "# " + (sous === "bad" ? deja.mauvais : sous === "good" ? deja.bon : "skip") + ": [" + h + "] " + gSujet(gCommit(R, h).message));
			gBisectJournal(R, "git bisect " + (sous === "bad" ? deja.mauvais : sous === "good" ? deja.bon : "skip") + " " + h);
		}
		// Si le premier mauvais est déjà trouvé, le dire (et s'arrêter).
		return gBisectSuivant(ctx, R);
	}
	if (sous === "run"){
		if (!args.length) throw new GitErreur("error: bisect run failed: no command provided.", 1);
		var sortie = [];
		var garde = 0;
		while (garde++ < 64){
			var et = gBisectEtat(R);
			if (!et.bad || !et.goods.length) throw new GitErreur("error: bisect run failed: no command provided.", 1);
			var cmd = args.map(function(a){ return "'" + String(a).replace(/'/g, "'\\''") + "'"; }).join(" ");
			sortie.push("running " + cmd);
			var code = gLancerPourBisect(R, args, sortie, ctx);
			var t = gTete(R);
			var verdict = code === 0 ? "good" : code === 125 ? "skip" : (code > 0 && code < 128 ? "bad" : null);
			if (verdict === null){ sortie.push("bisect run failed:\nexit code " + code + " from " + cmd + " is < 0 or >= 128"); ctx.code = 1; return sortie.join("\n"); }
			if (verdict === "bad") gEcrire(gCommun(R), "refs/bisect/bad", t + "\n");
			else if (verdict === "good") gEcrire(gCommun(R), "refs/bisect/good-" + t, t + "\n");
			else gEcrire(gCommun(R), "refs/bisect/skip-" + t, t + "\n");
			gBisectJournal(R, "# " + verdict + ": [" + t + "] " + gSujet(gCommit(R, t).message));
			gBisectJournal(R, "git bisect " + verdict + " " + t);
			var s = gBisectSuivant(ctx, R);
			sortie.push(s);
			if (/is the first bad commit/.test(s)){ sortie.push("bisect found first bad commit"); ctx.ev.run = true; return sortie.join("\n"); }
		}
		return sortie.join("\n");
	}
	throw new GitErreur("error: unknown bisect subcommand: " + sous + "\nusage: git bisect [help|start|bad|good|new|old|terms|skip|next|reset|visualize|view|replay|log|run]", 1);
};
/* Lance la commande de bisect run (un script, ou une commande) et renvoie son code. */
function gLancerPourBisect(R, args, sortie, ctx){
	var io = { stdin: null, tty: false, sudo: false, erreurs: [], code: 0 };
	io.err = function(m){ io.erreurs.push(m); }; io.errFin = io.err;
	var r = gChemin(ctx.lieu, args[0]);
	try {
		if (r && r.noeud instanceof Item && !r.noeud.binaire){
			if (!/^..x/.test(r.noeud.mode || "") && args[0].indexOf("/") > -1) { sortie.push("error: cannot run " + args[0] + ": Permission denied"); return 126; }
			var s = Interpreteur.lancerScript(gContenu(r.noeud), io, { nom0: args[0], nomScript: r.noeud.itemname, positionnels: args.slice(1) });
			if (s) sortie.push(String(s).replace(/\n$/, ""));
		} else {
			var avant = Shell.statut;
			Interpreteur.executer(args.map(function(a){ return "'" + String(a).replace(/'/g, "'\\''") + "'"; }).join(" "));
			io.code = Shell.statut || 0;
			Shell.statut = avant;
		}
	} catch (e){ if (e instanceof ShellError){ sortie.push(e.message); return e.code || 1; } throw e; }
	io.erreurs.forEach(function(m){ sortie.push(m); });
	return io.code || 0;
}
function gBisectReset(R, cible, silencieux){
	var debut = (gLire(R.git, "BISECT_START") || "").trim();
	var t = gTete(R);
	var retour = cible || debut;
	gRefs(R, "refs/bisect/").forEach(function(r){ gRefSupprimer(R, r.nom); });
	["BISECT_START", "BISECT_LOG", "BISECT_TERMS", "BISECT_EXPECTED_REV", "BISECT_ANCESTORS_OK", "BISECT_NAMES", "BISECT_RUN"].forEach(function(n){ gSupprimer(R.git, n); });
	if (!retour) return "";
	var estBranche = !!gRef(R, "refs/heads/" + retour);
	var h = estBranche ? gRef(R, "refs/heads/" + retour) : gEssayer(R, retour, { commit: true });
	if (!h) return "";
	gBasculerArbre(R, gAplatir(R, gCommit(R, t).arbre), gAplatir(R, gCommit(R, h).arbre), { force: false });
	if (estBranche) gEcrire(R.git, "HEAD", "ref: refs/heads/" + retour + "\n"); else gEcrire(R.git, "HEAD", h + "\n");
	gReflogAjouter(R, "HEAD", t, h, "checkout: moving from " + t + " to " + retour);
	if (silencieux) return "";
	return (t !== h ? "Previous HEAD position was " + gCourt(R, t) + " " + gSujet(gCommit(R, t).message) + "\n" : "") + (estBranche ? "Switched to branch '" + retour + "'" : "HEAD is now at " + gCourt(R, h) + " " + gSujet(gCommit(R, h).message));
}

/* ================================================================== */
/* remote                                                              */
/* ================================================================== */

function gRemotes(R){
	var noms = [];
	gConfigToutes(R).forEach(function(e){ var m = /^remote\.(.+)\.url$/.exec(e.cle); if (m && noms.indexOf(m[1]) === -1) noms.push(m[1]); });
	return noms;
}
/* ls-remote : les refs d'un dépôt distant (HEAD d'abord), sans rien rapatrier. */
GIT_SOUS_COMMANDES["ls-remote"] = function(ctx){
	var op = gOptions(ctx.args, { "-h|--heads|--branches": "b", "-t|--tags": "b", "--refs": "b", "-q|--quiet": "b", "--get-url": "b", "--symref": "b", "--exit-code": "b" }, "ls-remote");
	var R = gTrouverDepot(ctx.lieu);
	var cible = op.p[0] || null, url = cible;
	if (!cible){
		if (!R) throw new GitErreur("fatal: No remote configured to list refs from.", 128);
		var noms = gRemotes(R);
		if (!noms.length) throw new GitErreur("fatal: No remote configured to list refs from.", 128);
		cible = noms.indexOf("origin") > -1 ? "origin" : noms[0];
	}
	if (R && gConfig(R, "remote." + cible + ".url")) url = gConfig(R, "remote." + cible + ".url");
	if (op.o["get-url"]) return url;
	var D = gOuvrirDistant(R, url, ctx.lieu);
	var motifs = op.p.slice(1);
	var l = [];
	var tete = gTete(D);
	if (tete && !op.o.heads && !op.o.tags && !op.o.refs && !motifs.length){
		if (op.o.symref && gSymbolique(D, "HEAD")) l.push("ref: " + gSymbolique(D, "HEAD") + "\tHEAD");
		l.push(tete + "\tHEAD");
	}
	gRefs(D, "refs/").forEach(function(r){
		if (op.o.heads && r.nom.indexOf("refs/heads/") !== 0 && !(op.o.tags && r.nom.indexOf("refs/tags/") === 0)) return;
		if (op.o.tags && !op.o.heads && r.nom.indexOf("refs/tags/") !== 0) return;
		if (motifs.length && !motifs.some(function(m){ return r.nom === m || r.nom.slice(-(m.length + 1)) === "/" + m; })) return;
		l.push(r.hash + "\t" + r.nom);
		if (r.nom.indexOf("refs/tags/") === 0 && !op.o.refs){ var p = gPeler(D, r.hash, "commit"); if (p && p !== r.hash) l.push(p + "\t" + r.nom + "^{}"); }
	});
	if (!l.length && op.o["exit-code"]) ctx.code = 2;
	ctx.ev.remote = cible; ctx.ev.nombre = l.length;
	return op.o.quiet ? "" : l.join("\n");
};
GIT_SOUS_COMMANDES.remote = function(ctx){
	var args = ctx.args.slice();
	var verbeux = false;
	while (args[0] === "-v" || args[0] === "--verbose"){ verbeux = true; args.shift(); }
	var sous = args.shift();
	var R = ctx.depot();
	if (!sous){
		return gRemotes(R).map(function(n){ var u = gConfig(R, "remote." + n + ".url"), pu = gConfig(R, "remote." + n + ".pushurl") || u; return verbeux ? n + "\t" + u + " (fetch)\n" + n + "\t" + pu + " (push)" : n; }).join("\n");
	}
	var n = args[0];
	ctx.ev.action = sous;
	if (sous === "add"){
		var op = gOptions(args, { "-f": "b", "-t": "l", "-m": "v", "--mirror": "o" }, "remote");
		if (op.p.length < 2) throw new GitErreur("usage: git remote add [<options>] <name> <url>", 129);
		n = op.p[0];
		if (gRemotes(R).indexOf(n) > -1) throw new GitErreur("error: remote " + n + " already exists.", 3);
		if (!/^[A-Za-z0-9._-]+$/.test(n)) throw new GitErreur("fatal: '" + n + "' is not a valid remote name", 128);
		gConfigLocalePoser(R, "remote." + n + ".url", op.p[1]);
		gConfigLocalePoser(R, "remote." + n + ".fetch", "+refs/heads/*:refs/remotes/" + n + "/*");
		ctx.ev.nom = n; ctx.ev.url = op.p[1];
		if (op.o.f){ ctx.args = [n]; return GIT_SOUS_COMMANDES.fetch(ctx); }
		return "";
	}
	if (sous === "remove" || sous === "rm"){
		if (gRemotes(R).indexOf(n) === -1) throw new GitErreur("error: No such remote: '" + n + "'", 2);
		gConfigRetirerSection(R, "remote", n);
		gRefs(R, "refs/remotes/" + n + "/").forEach(function(r){ gRefSupprimer(R, r.nom); });
		gConfigToutes(R).forEach(function(e){ var m = /^branch\.(.+)\.remote$/.exec(e.cle); if (m && e.valeur === n){ gConfigLocalePoser(R, "branch." + m[1] + ".remote", null, "unset"); gConfigLocalePoser(R, "branch." + m[1] + ".merge", null, "unset"); } });
		return "";
	}
	if (sous === "rename"){
		var nouveau = args[1];
		if (gRemotes(R).indexOf(n) === -1) throw new GitErreur("error: No such remote: '" + n + "'", 2);
		if (gRemotes(R).indexOf(nouveau) > -1) throw new GitErreur("error: remote " + nouveau + " already exists.", 3);
		gConfigRenommerSection(R, "remote", n, nouveau);
		gConfigLocalePoser(R, "remote." + nouveau + ".fetch", "+refs/heads/*:refs/remotes/" + nouveau + "/*", "replace-all");
		gRefs(R, "refs/remotes/" + n + "/").forEach(function(r){ var nn = "refs/remotes/" + nouveau + "/" + r.nom.substring(("refs/remotes/" + n + "/").length); if (r.sym) gEcrire(gCommun(R), nn, "ref: " + r.sym.replace("refs/remotes/" + n + "/", "refs/remotes/" + nouveau + "/") + "\n"); else gEcrire(gCommun(R), nn, r.hash + "\n"); gRefSupprimer(R, r.nom); });
		gConfigToutes(R).forEach(function(e){ var m = /^branch\.(.+)\.remote$/.exec(e.cle); if (m && e.valeur === n) gConfigLocalePoser(R, "branch." + m[1] + ".remote", nouveau); });
		return "";
	}
	if (sous === "get-url"){
		if (gRemotes(R).indexOf(n) === -1) throw new GitErreur("error: No such remote '" + n + "'", 2);
		return gConfig(R, "remote." + n + ".url");
	}
	if (sous === "set-url"){
		var op2 = gOptions(args, { "--push": "b", "--add": "b", "--delete": "b" }, "remote");
		if (gRemotes(R).indexOf(op2.p[0]) === -1) throw new GitErreur("error: No such remote '" + op2.p[0] + "'", 2);
		gConfigLocalePoser(R, "remote." + op2.p[0] + (op2.o.push ? ".pushurl" : ".url"), op2.p[1]);
		ctx.ev.nom = op2.p[0]; ctx.ev.url = op2.p[1];
		return "";
	}
	if (sous === "show"){
		if (!n) return gRemotes(R).join("\n");
		if (gRemotes(R).indexOf(n) === -1) throw new GitErreur("error: No such remote: '" + n + "'", 2);
		var u = gConfig(R, "remote." + n + ".url"), l = ["* remote " + n, "  Fetch URL: " + u, "  Push  URL: " + (gConfig(R, "remote." + n + ".pushurl") || u)];
		var D = null; try { D = gOuvrirDistant(R, u); } catch (x){ D = null; }
		if (D){
			l.push("  HEAD branch: " + (gBrancheCourante(D) || "(unknown)"), "  Remote branch" + (gRefs(D, "refs/heads/").length > 1 ? "es" : "") + ":");
			gRefs(D, "refs/heads/").forEach(function(r){ var nom = r.nom.substring(11); l.push("    " + nom + (gRef(R, "refs/remotes/" + n + "/" + nom) ? " tracked" : " new (next fetch will store in remotes/" + n + ")")); });
		}
		return l.join("\n");
	}
	if (sous === "prune"){ ctx.args = ["--prune", n]; return GIT_SOUS_COMMANDES.fetch(ctx); }
	throw new GitErreur("error: unknown subcommand: `" + sous + "'\nusage: git remote [-v | --verbose]\n   or: git remote add [-t <branch>] [-m <master>] [-f] [--tags | --no-tags] [--mirror=<fetch|push>] <name> <url>\n   or: git remote rename [--[no-]progress] <old> <new>\n   or: git remote remove <name>\n   or: git remote set-head <name> (-a | --auto | -d | --delete | <branch>)\n   or: git remote [-v | --verbose] show [-n] <name>\n   or: git remote prune [-n | --dry-run] <name>\n   or: git remote [-v | --verbose] update [-p | --prune] [(<group> | <remote>)...]\n   or: git remote set-branches [--add] <name> <branch>...\n   or: git remote get-url [--push] [--all] <name>\n   or: git remote set-url [--push] <name> <newurl> [<oldurl>]\n   or: git remote set-url --add <name> <newurl>\n   or: git remote set-url --delete <name> <url>", 129);
};

/* ================================================================== */
/* fetch, pull, push                                                   */
/* ================================================================== */

/* Le remote et son URL : un nom (origin) ou une URL directe. */
function gDistantNomme(R, nom){
	var u = gConfig(R, "remote." + nom + ".url");
	if (u) return { nom: nom, url: u };
	if (/[\/:]/.test(nom) || /\.git$/.test(nom)) return { nom: null, url: nom };
	throw new GitErreur("fatal: '" + nom + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.", 128);
}
function gLigneMaj(resume, src, dst, largeur, extra){
	var car = resume.charAt(0), r = resume.substring(2);
	while (r.length < 17) r += " ";
	var s = src; while (s.length < Math.max(10, largeur)) s += " ";
	return " " + car + " " + r + " " + s + " -> " + dst + (extra ? "  " + extra : "");
}
/* Récupère depuis un remote : met à jour refs/remotes/NOM/* ; renvoie { lignes, maj: [{ ref, ancien, nouveau, force }] }. */
function gRecuperer(ctx, R, nomRemote, options){
	options = options || {};
	var d = gDistantNomme(R, nomRemote);
	var D = gOuvrirDistant(R, d.url);
	var refsD = gRefs(D, "refs/heads/");
	var lignes = [], maj = [], nb = 0;
	var largeur = 0;
	refsD.forEach(function(r){ largeur = Math.max(largeur, r.nom.substring(11).length); });
	var aRecuperer = refsD.map(function(r){ return r.hash; }).filter(Boolean);
	var tags = options.tags !== false ? gRefs(D, "refs/tags/").filter(function(r){ var h = gPeler(D, r.hash, "commit"); return !gRef(R, r.nom) && (options.tous || gObjet(R, h) || aRecuperer.some(function(x){ return gEstAncetre(D, h, x); })); }) : [];
	tags.forEach(function(r){ aRecuperer.push(r.hash); largeur = Math.max(largeur, r.nom.substring(10).length); });
	nb = gCopierObjets(D, R, aRecuperer);
	var fetchHead = [];
	refsD.forEach(function(r){
		var nom = r.nom.substring(11);
		var cible = d.nom ? "refs/remotes/" + d.nom + "/" + nom : null;
		fetchHead.push(r.hash + "\t" + (options.pourBranche && options.pourBranche !== nom ? "not-for-merge\t" : "\t") + "branch '" + nom + "' of " + d.url);
		if (!cible) return;
		var ancien = gRef(R, cible);
		if (ancien === r.hash) return;
		if (!ancien){ lignes.push(gLigneMaj("* [new branch]", nom, d.nom + "/" + nom, largeur)); gRefEcrire(R, cible, r.hash, "fetch: storing head", { sansHead: true }); maj.push({ ref: cible, ancien: null, nouveau: r.hash, force: false, nouvelle: true }); return; }
		var ff = gEstAncetre(R, ancien, r.hash);
		lignes.push(ff ? gLigneMaj("  " + gCourt(R, ancien) + ".." + gCourt(R, r.hash), nom, d.nom + "/" + nom, largeur) : gLigneMaj("+ " + gCourt(R, ancien) + "..." + gCourt(R, r.hash), nom, d.nom + "/" + nom, largeur, "(forced update)"));
		gRefEcrire(R, cible, r.hash, ff ? "fetch: fast-forward" : "fetch: forced-update", { sansHead: true });
		maj.push({ ref: cible, ancien: ancien, nouveau: r.hash, force: !ff });
	});
	tags.forEach(function(r){ var nom = r.nom.substring(10); gEcrire(gCommun(R), r.nom, r.hash + "\n"); lignes.push(gLigneMaj("* [new tag]", nom, nom, largeur)); maj.push({ ref: r.nom, ancien: null, nouveau: r.hash }); });
	if (options.prune && d.nom){
		gRefs(R, "refs/remotes/" + d.nom + "/").forEach(function(x){
			var nom = x.nom.substring(("refs/remotes/" + d.nom + "/").length);
			if (nom === "HEAD" || refsD.some(function(r){ return r.nom === "refs/heads/" + nom; })) return;
			gRefSupprimer(R, x.nom);
			lignes.unshift(" - [deleted]         (none)     -> " + d.nom + "/" + nom);
			maj.push({ ref: x.nom, supprimee: true });
		});
	}
	gEcrire(R.git, "FETCH_HEAD", fetchHead.join("\n") + "\n");
	var tete = [];
	if (D.ssh && nb) tete.push("remote: Enumerating objects: " + nb + ", done.", "remote: Counting objects: 100% (" + nb + "/" + nb + "), done.", "remote: Total " + nb + " (delta 0), reused 0 (delta 0), pack-reused 0", "Unpacking objects: 100% (" + nb + "/" + nb + "), done.");
	else if (nb) tete.push("Unpacking objects: 100% (" + nb + "/" + nb + "), done.");
	if (lignes.length) tete.push("From " + String(d.url).replace(/\.git\/?$/, ""));
	return { lignes: tete.concat(lignes), maj: maj, D: D, d: d, objets: nb };
}

GIT_SOUS_COMMANDES.fetch = function(ctx){
	var op = gOptions(ctx.args, { "--all": "b", "-p|--prune": "b", "-t|--tags": "b", "-q|--quiet": "b", "-v|--verbose": "b", "--dry-run": "b", "--no-tags": "b", "-f|--force": "b", "--depth": "v", "--unshallow": "b" }, "fetch");
	var R = ctx.depot();
	var noms = op.o.all ? gRemotes(R) : [op.p[0] || (gBrancheCourante(R) && gConfig(R, "branch." + gBrancheCourante(R) + ".remote")) || (gRemotes(R).indexOf("origin") > -1 ? "origin" : null)];
	if (!noms.length || noms[0] === null){
		if (!gRemotes(R).length) throw new GitErreur("fatal: No remote repository specified.  Please, specify either a URL or a\nremote name from which new revisions should be fetched.", 128);
		noms = [gRemotes(R)[0]];
	}
	var l = [], tout = [];
	noms.forEach(function(n){
		if (op.o.all) l.push("Fetching " + n);
		var r = gRecuperer(ctx, R, n, { prune: !!op.o.prune || gConfigVrai(R, "fetch.prune", false), tags: op.o["no-tags"] ? false : undefined, tous: !!op.o.tags });
		l = l.concat(r.lignes); tout = tout.concat(r.maj);
	});
	ctx.ev.maj = tout; ctx.ev.forces = tout.filter(function(x){ return x.force; }).map(function(x){ return x.ref; });
	return op.o.quiet ? "" : l.join("\n");
};

GIT_SOUS_COMMANDES.pull = function(ctx){
	var op = gOptions(ctx.args, { "-r|--rebase": "o", "--no-rebase": "b", "--ff-only": "b", "--ff": "b", "--no-ff": "b", "-q|--quiet": "b", "-v|--verbose": "b", "--no-edit": "b", "--autostash": "b", "--all": "b", "--tags": "b", "-p|--prune": "b" }, "pull");
	var R = ctx.travail();
	var br = gBrancheCourante(R);
	if (!br) throw new GitErreur("You are not currently on a branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n", 1);
	var nomRemote = op.p[0] || gConfig(R, "branch." + br + ".remote") || null;
	var brDistante = op.p[1] || (gConfig(R, "branch." + br + ".merge") || "").replace(/^refs\/heads\//, "") || null;
	if (!nomRemote){
		if (!gRemotes(R).length) throw new GitErreur("There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=<remote>/<branch> " + br + "\n", 1);
		nomRemote = "origin";
	}
	var et = gEtatDepot(R);
	if (et.conflits.length) throw new GitErreur("error: Pulling is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.", 128);
	if (gRefBrute(R, "MERGE_HEAD")) throw new GitErreur("error: You have not concluded your merge (MERGE_HEAD exists).\nhint: Please, commit your changes before merging.\nfatal: Exiting because of unfinished merge.", 128);
	var r = gRecuperer(ctx, R, nomRemote, { pourBranche: brDistante, prune: !!op.o.prune });
	var l = r.lignes.slice();
	if (!brDistante){
		throw new GitErreur((l.length ? l.join("\n") + "\n" : "") + "There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=" + nomRemote + "/<branch> " + br + "\n", 1);
	}
	var src = gRef(r.D, "refs/heads/" + brDistante);
	if (!src) throw new GitErreur((l.length ? l.join("\n") + "\n" : "") + "fatal: couldn't find remote ref " + brDistante, 1);
	var t = gTete(R);
	ctx.ev.remote = nomRemote; ctx.ev.branche = brDistante; ctx.ev.maj = r.maj;
	var nomSuivi = r.d.nom ? r.d.nom + "/" + brDistante : src;
	if (!t || gEstAncetre(R, src, t)){
		if (t && gEstAncetre(R, src, t)){ l.push("Already up to date."); ctx.ev.mode = "deja"; return l.join("\n"); }
	}
	var ff = !t || gEstAncetre(R, t, src);
	var rebaseConf = op.o.rebase !== undefined ? op.o.rebase : (op.o["no-rebase"] ? false : gConfig(R, "branch." + br + ".rebase") || gConfig(R, "pull.rebase"));
	var rebase = rebaseConf === true || rebaseConf === "true" || rebaseConf === "merges" || rebaseConf === "interactive";
	var ffOnly = !!op.o["ff-only"] || (gConfig(R, "pull.ff") === "only" && !op.o.ff && !op.o["no-ff"] && op.o.rebase === undefined && !op.o["no-rebase"]);
	if (ff && !op.o["no-ff"]){
		var s = gFusionner(ctx, R, nomSuivi, { reflog: "pull" });
		ctx.ev.mode = "ff";
		return l.concat([s]).join("\n");
	}
	if (ffOnly){ throw new GitErreur((l.length ? l.join("\n") + "\n" : "") + "hint: Diverging branches can't be fast-forwarded, you need to either:\nhint: \nhint: \tgit merge --no-ff\nhint: \nhint: or:\nhint: \nhint: \tgit rebase\nhint: \nhint: Disable this message with \"git config advice.diverging false\"\nfatal: Not possible to fast-forward, aborting.", 128); }
	if (rebaseConf === null || rebaseConf === undefined){
		if (op.o.ff === undefined && op.o["no-ff"] === undefined && gConfig(R, "pull.ff") === null){
			throw new GitErreur((l.length ? l.join("\n") + "\n" : "") + "hint: You have divergent branches and need to specify how to reconcile them.\nhint: You can do so by running one of the following commands sometime before\nhint: your next pull:\nhint: \nhint:   git config pull.rebase false  # merge\nhint:   git config pull.rebase true   # rebase\nhint:   git config pull.ff only       # fast-forward only\nhint: \nhint: You can replace \"git config\" with \"git config --global\" to set a default\nhint: preference for all repositories. You can also pass --rebase, --no-rebase,\nhint: or --ff-only on the command line to override the configured default per\nhint: invocation.\nfatal: Need to specify how to reconcile divergent branches.", 128);
		}
	}
	if (rebase){
		var c2 = new GitCtx([nomSuivi], ctx.io, "rebase"); c2.R = R; c2.lieu = ctx.lieu;
		var s2 = GIT_SOUS_COMMANDES.rebase(c2);
		if (c2.code) ctx.code = c2.code;
		ctx.ev.mode = "rebase"; ctx.ev.rebase = c2.ev;
		return l.concat([s2]).join("\n");
	}
	var s3 = gFusionner(ctx, R, nomSuivi, { reflog: "pull", messageDefaut: "Merge branch '" + brDistante + "' of " + r.d.url + (br !== "main" && br !== "master" ? " into " + br : ""), noFF: !!op.o["no-ff"] });
	return l.concat([s3]).join("\n");
};

/* Les refspecs d'un push : [{ src (ref locale ou null pour supprimer), dst (ref distante), force }]. */
function gRefspecsPush(R, args, op){
	var l = [];
	args.forEach(function(a){
		var force = a.charAt(0) === "+";
		if (force) a = a.substring(1);
		var p = a.split(":"), src = p[0], dst = p.length > 1 ? p[1] : p[0];
		if (src === ""){ l.push({ src: null, dst: /^refs\//.test(dst) ? dst : "refs/heads/" + dst, force: force, nomDst: dst }); return; }
		var nomSrc = src === "HEAD" ? (gSymbolique(R, "HEAD") || "HEAD") : gNomRef(R, src);
		if (!nomSrc && !gEssayer(R, src)) throw new GitErreur("error: src refspec " + src + " does not match any\nerror: failed to push some refs to '" + (op.url || "") + "'", 1);
		var h = gEssayer(R, src);
		if (p.length === 1 && nomSrc) dst = nomSrc.replace(/^refs\/(heads|tags)\//, "");
		if (src === "HEAD" && p.length === 1) dst = gBrancheCourante(R) || "HEAD";
		var dstRef = /^refs\//.test(dst) ? dst : (nomSrc && nomSrc.indexOf("refs/tags/") === 0 ? "refs/tags/" + dst : "refs/heads/" + dst);
		l.push({ src: nomSrc || src, hash: h, dst: dstRef, force: force, nomDst: dst, nomSrc: (nomSrc || src).replace(/^refs\/(heads|tags)\//, "") });
	});
	return l;
}
GIT_SOUS_COMMANDES.push = function(ctx){
	var op = gOptions(ctx.args, { "-u|--set-upstream": "b", "-f|--force": "b", "--force-with-lease": "o", "--tags": "b", "-d|--delete": "b", "--all": "b", "-q|--quiet": "b", "-v|--verbose": "b", "-n|--dry-run": "b", "--no-verify": "b", "--follow-tags": "b", "--porcelain": "b", "--mirror": "b" }, "push");
	var R = ctx.depot();
	var br = gBrancheCourante(R);
	var nomRemote = op.p[0] || (br && (gConfig(R, "branch." + br + ".pushRemote") || gConfig(R, "remote.pushDefault") || gConfig(R, "branch." + br + ".remote"))) || null;
	if (!nomRemote){
		if (!gRemotes(R).length) throw new GitErreur("fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n", 128);
		if (gRemotes(R).length === 1 || gRemotes(R).indexOf("origin") > -1) nomRemote = gRemotes(R).indexOf("origin") > -1 ? "origin" : gRemotes(R)[0];
	}
	var d = gDistantNomme(R, nomRemote);
	var urlPush = (d.nom && gConfig(R, "remote." + d.nom + ".pushurl")) || d.url;
	var specs;
	var args = op.p.slice(1);
	if (op.o["delete"]) specs = args.map(function(a){ return { src: null, dst: /^refs\//.test(a) ? a : "refs/heads/" + a, force: false, nomDst: a }; });
	else if (op.o.tags && !args.length) specs = gRefs(R, "refs/tags/").map(function(r){ return { src: r.nom, hash: r.hash, dst: r.nom, nomDst: r.nom.substring(10), nomSrc: r.nom.substring(10) }; });
	else if (op.o.all) specs = gRefs(R, "refs/heads/").map(function(r){ return { src: r.nom, hash: r.hash, dst: r.nom, nomDst: r.nom.substring(11), nomSrc: r.nom.substring(11) }; });
	else if (args.length) specs = gRefspecsPush(R, args, { url: urlPush });
	else {
		if (!br) throw new GitErreur("fatal: You are not currently on a branch.\nTo push the history leading to the current (detached HEAD)\nstate now, use\n\n    git push " + (nomRemote || "origin") + " HEAD:<name-of-remote-branch>\n", 128);
		var amontNom = (gConfig(R, "branch." + br + ".merge") || "").replace(/^refs\/heads\//, "");
		var amontRemote = gConfig(R, "branch." + br + ".remote");
		if ((!amontNom || amontRemote !== d.nom) && !op.o["set-upstream"] && !gConfigVrai(R, "push.autoSetupRemote", false)){
			throw new GitErreur("fatal: The current branch " + br + " has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream " + (nomRemote || "origin") + " " + br + "\n\nTo have this happen automatically for branches without a tracking\nupstream, see 'push.autoSetupRemote' in 'git help config'.\n", 128);
		}
		if (amontNom && amontNom !== br && amontRemote === d.nom && (gConfig(R, "push.default") || "simple") === "simple"){
			throw new GitErreur("fatal: The upstream branch of your current branch does not match\nthe name of your current branch.  To push to the upstream branch\non the remote, use\n\n    git push " + d.nom + " HEAD:" + amontNom + "\n\nTo push to the branch of the same name on the remote, use\n\n    git push " + d.nom + " HEAD\n\nTo choose either option permanently, see push.default in 'git help config'.\n\nTo avoid automatically configuring an upstream branch when its name\nwon't match the local branch, see option 'simple' of branch.autoSetupMerge\nin 'git help config'.\n", 128);
		}
		specs = [{ src: "refs/heads/" + br, hash: gTete(R), dst: "refs/heads/" + br, nomDst: br, nomSrc: br }];
		if (!gTete(R)) throw new GitErreur("error: src refspec " + br + " does not match any\nerror: failed to push some refs to '" + urlPush + "'", 1);
	}
	if (op.o["follow-tags"]) gRefs(R, "refs/tags/").forEach(function(r){ var o = gObjet(R, r.hash); if (o && o.t === "tag" && specs.some(function(s){ return s.hash && gEstAncetre(R, gPeler(R, r.hash, "commit"), s.hash); })) specs.push({ src: r.nom, hash: r.hash, dst: r.nom, nomDst: r.nom.substring(10), nomSrc: r.nom.substring(10) }); });
	var D = gOuvrirDistant(R, urlPush);
	// Le hook pre-push, côté client.
	if (!op.o["no-verify"]){
		var entree = specs.map(function(s){ return (s.src || "(delete)") + " " + (s.hash || GIT_VIDE) + " " + s.dst + " " + (gRef(D, s.dst) || GIT_VIDE); }).join("\n");
		var hp = gHook(R, "pre-push", [nomRemote || urlPush, urlPush], entree);
		if (hp && hp.code){ ctx.ev.hookRefus = "pre-push"; throw new GitErreur((hp.sortie ? hp.sortie + "\n" : "") + "error: failed to push some refs to '" + urlPush + "'", 1); }
	}
	var resultats = [], objets = 0, aEcrire = [];
	specs.forEach(function(s){
		var actuel = gRef(D, s.dst);
		var r = { s: s, actuel: actuel };
		if (!s.src){
			if (!actuel){ r.etat = "rejete"; r.texte = " ! [remote rejected] " + s.nomDst + " (remote ref does not exist)"; r.erreur = "error: unable to delete '" + s.nomDst + "': remote ref does not exist"; resultats.push(r); return; }
			r.etat = "supprime"; resultats.push(r); return;
		}
		if (actuel === s.hash){ r.etat = "aJour"; resultats.push(r); return; }
		var force = s.force || op.o.force;
		var bail = op.o["force-with-lease"];
		if (bail !== undefined && bail !== false){
			var attendu = bail === true ? (d.nom ? gRef(R, "refs/remotes/" + d.nom + "/" + s.nomDst) : null) : gEssayer(R, String(bail).split(":").pop());
			if (attendu !== actuel){ r.etat = "rejete"; r.raison = "stale info"; resultats.push(r); return; }
			force = true;
		}
		if (actuel && !force){
			var connu = !!gObjet(R, actuel);
			if (!connu){ r.etat = "rejete"; r.raison = "fetch first"; resultats.push(r); return; }
			if (!gEstAncetre(R, actuel, s.hash)){ r.etat = "rejete"; r.raison = "non-fast-forward"; resultats.push(r); return; }
		}
		if (s.dst.indexOf("refs/tags/") === 0 && actuel && !force){ r.etat = "rejete"; r.raison = "already exists"; resultats.push(r); return; }
		r.etat = "ok"; r.force = !!actuel && !gEstAncetre(R, actuel, s.hash);
		aEcrire.push(r); resultats.push(r);
	});
	// Côté serveur : branche extraite, receive.denyNonFastForwards, denyDeletes, la forge (branches protégées), les hooks pre-receive et update.
	var lignesDistantes = [];
	var accepte = aEcrire.concat(resultats.filter(function(r){ return r.etat === "supprime"; }));
	accepte.forEach(function(r){
		if (!D.nu && D.top && r.s.dst === gSymbolique(D, "HEAD") && (gConfig(D, "receive.denyCurrentBranch") || "refuse") !== "ignore"){
			r.etat = "refuseDistant"; r.raison = "branch is currently checked out";
			lignesDistantes.push("remote: error: refusing to update checked out branch: " + r.s.dst, "remote: error: By default, updating the current branch in a non-bare repository", "remote: is denied, because it will make the index and work tree inconsistent", "remote: with what you pushed, and will require 'git reset --hard' to match", "remote: the work tree to HEAD.");
			return;
		}
		if (r.force && gConfigVrai(D, "receive.denyNonFastForwards", false)){ r.etat = "refuseDistant"; r.raison = "non-fast-forward"; return; }
		if (r.etat === "supprime" && gConfigVrai(D, "receive.denyDeletes", false)){ r.etat = "refuseDistant"; r.raison = "deletion prohibited"; return; }
		if (typeof gitForgeRefusPush === "function"){
			var refus = gitForgeRefusPush(D, r.s.dst, r.actuel, r.etat === "supprime" ? null : r.s.hash, { force: r.force, R: R });
			if (refus){ r.etat = "refuseDistant"; r.raison = refus.raison || "protected branch hook declined"; (refus.lignes || []).forEach(function(x){ lignesDistantes.push("remote: " + x); }); }
		}
	});
	var encore = accepte.filter(function(r){ return r.etat === "ok" || r.etat === "supprime"; });
	if (encore.length){
		// Les objets d'abord (dans une quarantaine, comme le vrai : on ne les garde que si les hooks acceptent).
		var avantObjets = encore.filter(function(r){ return r.etat === "ok"; }).map(function(r){ return r.s.hash; });
		var entreeHook = encore.map(function(r){ return (r.actuel || GIT_VIDE) + " " + (r.etat === "supprime" ? GIT_VIDE : r.s.hash) + " " + r.s.dst; }).join("\n");
		var quarantaine = gCopierObjetsQuarantaine(R, D, avantObjets);
		var hk = gHook(D, "pre-receive", [], entreeHook);
		if (hk && hk.sortie) hk.sortie.split("\n").forEach(function(x){ lignesDistantes.push("remote: " + x); });
		if (hk && hk.code){ encore.forEach(function(r){ r.etat = "refuseDistant"; r.raison = "pre-receive hook declined"; }); }
		else {
			encore.forEach(function(r){
				var hu = gHook(D, "update", [r.s.dst, r.actuel || GIT_VIDE, r.etat === "supprime" ? GIT_VIDE : r.s.hash]);
				if (hu && hu.sortie) hu.sortie.split("\n").forEach(function(x){ lignesDistantes.push("remote: " + x); });
				if (hu && hu.code){ r.etat = "refuseDistant"; r.raison = "hook declined"; }
			});
			var garder = encore.filter(function(r){ return r.etat === "ok"; });
			objets = quarantaine.valider(garder.map(function(r){ return r.s.hash; }));
			encore.forEach(function(r){
				if (r.etat === "ok"){ gEcrire(gCommun(D), r.s.dst, r.s.hash + "\n"); if (gReflogPour(D, r.s.dst)) gReflogAjouter(D, r.s.dst, r.actuel, r.s.hash, "push"); }
				else if (r.etat === "supprime") gRefSupprimer(D, r.s.dst);
			});
			D.cache = {};
		}
		if (hk && hk.code) quarantaine.valider([]);
	}
	// Ce que dit le client.
	var l = [];
	if (objets) l.push("Enumerating objects: " + objets + ", done.", "Counting objects: 100% (" + objets + "/" + objets + "), done.", "Writing objects: 100% (" + objets + "/" + objets + "), done.", "Total " + objets + " (delta 0), reused 0 (delta 0), pack-reused 0");
	l = l.concat(lignesDistantes);
	var ecrits = resultats.filter(function(r){ return r.etat !== "aJour"; });
	// -u pose l'amont même quand tout est à jour (comme le vrai).
	function poserAmont(sortie){
		if (!op.o["set-upstream"] || !d.nom) return;
		resultats.forEach(function(r){
			if ((r.etat === "ok" || r.etat === "aJour") && r.s.dst.indexOf("refs/heads/") === 0 && r.s.src && r.s.src.indexOf("refs/heads/") === 0){
				var b = r.s.src.substring(11);
				gConfigLocalePoser(R, "branch." + b + ".remote", d.nom);
				gConfigLocalePoser(R, "branch." + b + ".merge", r.s.dst);
				sortie.push("branch '" + b + "' set up to track '" + d.nom + "/" + r.s.dst.substring(11) + "'.");
				ctx.ev.amont = d.nom + "/" + r.s.dst.substring(11);
			}
		});
	}
	if (!ecrits.length){ ctx.ev.aJour = true; ctx.ev.resultats = []; var aj = ["Everything up-to-date"]; poserAmont(aj); return op.o.quiet ? "" : aj.join("\n"); }
	l.push("To " + urlPush);
	var largeur = 0;
	ecrits.forEach(function(r){ largeur = Math.max(largeur, (r.s.nomSrc || r.s.nomDst || "").length); });
	var echec = false, rejets = [];
	ecrits.forEach(function(r){
		var src = r.s.nomSrc || r.s.nomDst, dst = r.s.dst.replace(/^refs\/(heads|tags)\//, "");
		if (r.etat === "ok"){
			if (!r.actuel) l.push(" * " + (r.s.dst.indexOf("refs/tags/") === 0 ? "[new tag]        " : "[new branch]     ") + " " + src + " -> " + dst);
			else if (r.force) l.push(" + " + gCourt(R, r.actuel) + "..." + gCourt(R, r.s.hash) + " " + src + " -> " + dst + " (forced update)");
			else l.push("   " + gCourt(R, r.actuel) + ".." + gCourt(R, r.s.hash) + "  " + src + " -> " + dst);
			// La branche de suivi locale suit.
			if (d.nom && r.s.dst.indexOf("refs/heads/") === 0){ gRefEcrire(R, "refs/remotes/" + d.nom + "/" + r.s.dst.substring(11), r.s.hash, "update by push", { sansHead: true }); }
			return;
		}
		if (r.etat === "supprime"){ l.push(" - [deleted]         " + dst); if (d.nom) gRefSupprimer(R, "refs/remotes/" + d.nom + "/" + r.s.nomDst); return; }
		echec = true;
		if (r.etat === "refuseDistant") l.push(" ! [remote rejected] " + src + " -> " + dst + " (" + r.raison + ")");
		else if (r.texte) l.push(r.texte);
		else { l.push(" ! [rejected]        " + src + " -> " + dst + " (" + r.raison + ")"); rejets.push(r.raison); }
	});
	ctx.ev.resultats = resultats.map(function(r){ return { ref: r.s.dst, etat: r.etat, raison: r.raison || null, force: !!r.force, ancien: r.actuel || null, nouveau: r.s.hash || null }; });
	ctx.ev.remote = d.nom || urlPush;
	if (echec){
		l.push("error: failed to push some refs to '" + urlPush + "'");
		if (rejets.indexOf("fetch first") > -1) l.push("hint: Updates were rejected because the remote contains work that you do not", "hint: have locally. This is usually caused by another repository pushing to", "hint: the same ref. If you want to integrate the remote changes, use", "hint: 'git pull' before pushing again.", "hint: See the 'Note about fast-forwards' in 'git push --help' for details.");
		else if (rejets.indexOf("non-fast-forward") > -1) l.push("hint: Updates were rejected because the tip of your current branch is behind", "hint: its remote counterpart. If you want to integrate the remote changes,", "hint: use 'git pull' before pushing again.", "hint: See the 'Note about fast-forwards' in 'git push --help' for details.");
		else if (rejets.indexOf("already exists") > -1) l.push("hint: Updates were rejected because the tag already exists in the remote.");
		ctx.code = 1;
	}
	poserAmont(l);
	return op.o.quiet && !echec ? "" : l.join("\n");
};
/* Copie les objets d'un push dans le dépôt distant ; valider(hashs) les garde (ceux atteignables depuis hashs), valider([]) les jette. */
function gCopierObjetsQuarantaine(R, D, departs){
	return {
		valider: function(garder){ if (!garder.length) return 0; return gCopierObjets(R, D, garder); }
	};
}

/* ================================================================== */
/* worktree                                                            */
/* ================================================================== */

GIT_SOUS_COMMANDES.worktree = function(ctx){
	var args = ctx.args.slice(), sous = args.shift();
	var R = ctx.depot();
	var principal = gCommun(R);
	ctx.ev.action = sous;
	function liste(){
		var l = [{ chemin: gCheminReel(principal.parents[0] || principal), tete: gRef(gDepotDe(principal, principal.parents[0]), "HEAD"), branche: gSymbolique(gDepotDe(principal, principal.parents[0]), "HEAD") }];
		var d = gDossier(principal, "worktrees", false);
		if (d) d.children.forEach(function(w){
			var R2 = gDepotDe(w, null); R2.commun = principal;
			var gd = (gLire(w, "gitdir") || "").trim().replace(/\/\.git$/, "");
			l.push({ chemin: gd, tete: gRef(R2, "HEAD"), branche: gSymbolique(R2, "HEAD"), nom: w.room_name });
		});
		return l;
	}
	if (sous === "list"){
		var l = liste(), largeur = 0;
		l.forEach(function(x){ largeur = Math.max(largeur, x.chemin.length); });
		return l.map(function(x){ var c = x.chemin; while (c.length < largeur) c += " "; return c + "  " + gCourt(R, x.tete) + " " + (x.branche ? "[" + x.branche.replace(/^refs\/heads\//, "") + "]" : "(detached HEAD)"); }).join("\n");
	}
	if (sous === "add"){
		var op = gOptions(args, { "-b": "v", "-B": "v", "--detach": "b", "-f|--force": "b" }, "worktree");
		if (!op.p.length) throw new GitErreur("usage: git worktree add [-f] [--detach] [--checkout] [--lock [--reason <string>]]\n                        [--orphan] [(-b | -B) <new-branch>] <path> [<commit-ish>]", 129);
		var r = gChemin(ctx.lieu, op.p[0]);
		if (r && r.noeud && (r.noeud instanceof Item || r.noeud.items.length || r.noeud.children.length)) throw new GitErreur("fatal: '" + op.p[0] + "' already exists", 128);
		if (!r || !r.dir) throw new GitErreur("fatal: could not create directory of '" + op.p[0] + "': No such file or directory", 128);
		var nom = r.nom;
		var nouvelle = op.o.b || op.o.B || null;
		var cible = op.p[1] || null, branche = null, hash;
		if (nouvelle){ hash = gResoudre(R, cible || "HEAD", { commit: true }); branche = nouvelle; }
		else if (cible && gRef(R, "refs/heads/" + cible)){ branche = cible; hash = gRef(R, "refs/heads/" + cible); }
		else if (cible){ hash = gResoudre(R, cible, { commit: true }); }
		else { branche = nom; if (!gRef(R, "refs/heads/" + nom)) nouvelle = nom; hash = gRef(R, "refs/heads/" + nom) || gTete(R); }
		if (op.o.detach) branche = null;
		if (branche && !nouvelle && liste().some(function(x){ return x.branche === "refs/heads/" + branche; })) throw new GitErreur("fatal: '" + branche + "' is already used by worktree at '" + liste().filter(function(x){ return x.branche === "refs/heads/" + branche; })[0].chemin + "'", 128);
		if (nouvelle) gCreerBranche(R, nouvelle, hash, cible || "HEAD", { force: !!op.o.B });
		var lieu = r.noeud || gNouveauDossier(r.dir, nom, gJoueur(), "rwxr-xr-x");
		var w = gDossier(principal, "worktrees/" + nom, true);
		gEcrire(w, "HEAD", branche ? "ref: refs/heads/" + branche + "\n" : hash + "\n");
		gEcrire(w, "commondir", "../..\n");
		gEcrire(w, "gitdir", gCheminReel(lieu) + "/.git\n");
		gEcrire(lieu, ".git", "gitdir: " + gCheminReel(w) + "\n");
		var R2 = gDepotDe(w, lieu); R2.commun = principal; R2.worktree = true;
		var carte = gAplatir(R2, gCommit(R2, hash).arbre);
		Object.keys(carte).forEach(function(p){ gPoserTravail(R2, p, carte[p].h, carte[p].m); });
		gIndexEcrire(R2, Object.keys(carte).map(function(p){ return { p: p, h: carte[p].h, m: carte[p].m, s: 0 }; }));
		gReflogAjouter(R2, "HEAD", GIT_VIDE, hash, "reset: moving to HEAD");
		ctx.ev.chemin = gCheminReel(lieu); ctx.ev.branche = branche;
		return "Preparing worktree (" + (nouvelle ? "new branch '" + nouvelle + "'" : branche ? "checking out '" + branche + "'" : "detached HEAD " + gCourt(R, hash)) + ")\nHEAD is now at " + gCourt(R, hash) + " " + gSujet(gCommit(R, hash).message);
	}
	if (sous === "remove"){
		var op2 = gOptions(args, { "-f|--force": "b" }, "worktree");
		var x = liste().filter(function(y){ return y.nom && (y.chemin === gCheminReel((gChemin(ctx.lieu, op2.p[0]) || {}).noeud || ctx.lieu) || y.nom === op2.p[0]); })[0];
		if (!x) throw new GitErreur("fatal: '" + op2.p[0] + "' is not a working tree", 128);
		var rr = gChemin(ctx.lieu, op2.p[0]);
		if (rr && rr.noeud instanceof Room){
			var Rw = gTrouverDepot(rr.noeud);
			if (Rw && !op2.o.force){ var e = gEtatDepot(Rw); if (e.indexees.length || e.modifiees.length || e.nonSuivies.length) throw new GitErreur("fatal: '" + op2.p[0] + "' contains modified or untracked files, use --force to delete it", 128); }
			if (current_room && gContient(rr.noeud, current_room)) throw new GitErreur("fatal: cannot remove the current working tree", 128);
			rr.dir.removeChild(rr.noeud);
		}
		gSupprimer(principal, "worktrees/" + x.nom);
		return "";
	}
	if (sous === "prune") return "";
	throw new GitErreur("usage: git worktree add [-f] [--detach] [--checkout] [--lock [--reason <string>]]\n                        [--orphan] [(-b | -B) <new-branch>] <path> [<commit-ish>]\n   or: git worktree list [-v | --porcelain [-z]]\n   or: git worktree lock [--reason <string>] <worktree>\n   or: git worktree move <worktree> <new-path>\n   or: git worktree prune [-n] [-v] [--expire <expire>]\n   or: git worktree remove [-f] <worktree>\n   or: git worktree repair [<path>...]\n   or: git worktree unlock <worktree>", 129);
};

/* ================================================================== */
/* archive et bundle                                                   */
/* ================================================================== */

GIT_SOUS_COMMANDES.archive = function(ctx){
	var op = gOptions(ctx.args, { "--format": "v", "-o|--output": "v", "--prefix": "v", "-l|--list": "b", "-v|--verbose": "b" }, "archive");
	var R = ctx.depot();
	if (op.o.list) return "tar\ntgz\ntar.gz\nzip";
	if (!op.p.length) throw new GitErreur("usage: git archive [<options>] <tree-ish> [<path>...]", 129);
	var arbre = gPeler(R, gResoudre(R, op.p[0]), "tree");
	var carte = gAplatir(R, arbre), specs = gPathspecs(ctx, op.p.slice(1));
	var format = op.o.format || (op.o.output && /\.zip$/.test(op.o.output) ? "zip" : (op.o.output && /\.(tgz|tar\.gz)$/.test(op.o.output) ? "tgz" : "tar"));
	var prefixe = op.o.prefix || "";
	var entrees = Object.keys(carte).sort().filter(function(p){ return gCorrespond(specs, p); }).map(function(p){ return { nom: prefixe + p, texte: gObjet(R, carte[p].h).c, mode: carte[p].m === "100755" ? "rwxr-xr-x" : "rw-r--r--" }; });
	ctx.ev.format = format; ctx.ev.fichiers = entrees.map(function(e){ return e.nom; });
	if (!op.o.output){
		if (ctx.io.tty) throw new GitErreur("fatal: l'archive est binaire : écris-la dans un fichier (-o archive." + (format === "zip" ? "zip" : "tar") + ") ou redirige-la (> archive.tar).", 128);
		return entrees.map(function(e){ return e.nom; }).join("\n");
	}
	var r = gChemin(ctx.lieu, op.o.output);
	if (!r || !r.dir) throw new GitErreur("fatal: could not create archive file '" + op.o.output + "': No such file or directory", 128);
	var it = r.noeud instanceof Item ? r.noeud : new Item(r.nom, "", "item_box.gif");
	it.owner = gJoueur(); it.mode = "rw-r--r--";
	it.setText(format === "zip" ? "PK\u0003\u0004" : "ustar\u0000");
	it.sansFinDeLigne = true;
	// Le format d'archive du jeu (tar -tf, unzip -l, tar -xf savent le lire).
	it.archive = entrees.map(function(e){ return { n: e.nom, x: e.texte, m: e.mode }; });
	it.formatArchive = format;
	if (format === "tgz" || format === "tar.gz") it.gzip = true;
	if (!(r.noeud instanceof Item)) r.dir.addItem(it);
	return op.o.verbose ? entrees.map(function(e){ return e.nom; }).join("\n") : "";
};

GIT_SOUS_COMMANDES.bundle = function(ctx){
	var args = ctx.args.slice(), sous = args.shift();
	ctx.ev.action = sous;
	if (sous === "create"){
		var R = ctx.depot();
		var fichier = args.shift();
		if (!fichier || !args.length) throw new GitErreur("usage: git bundle create [<options>] <file> <git-rev-list args>", 129);
		var refs = [], inclus = [], exclus = [];
		if (args.indexOf("--all") > -1){ gRefs(R, "refs/heads/").concat(gRefs(R, "refs/tags/")).forEach(function(r){ refs.push({ nom: r.nom, hash: r.hash }); inclus.push(gPeler(R, r.hash, "commit")); }); }
		else args.forEach(function(a){
			if (a.charAt(0) === "^"){ exclus.push(gResoudre(R, a.substring(1), { commit: true })); return; }
			var m = /^(.*)\.\.(.*)$/.exec(a);
			if (m){ exclus.push(gResoudre(R, m[1], { commit: true })); a = m[2]; }
			var n = a === "HEAD" ? "HEAD" : gNomRef(R, a);
			if (!n) throw new GitErreur("fatal: bad revision '" + a + "'", 128);
			refs.push({ nom: n, hash: gRef(R, n) || gResoudre(R, a) }); inclus.push(gResoudre(R, a, { commit: true }));
		});
		var commits = gParcours(R, inclus, exclus);
		if (!commits.length) throw new GitErreur("fatal: Refusing to create empty bundle.", 128);
		var objets = {};
		var interdits = exclus.length ? gAtteignablesDepuis(R, exclus) : {};
		commits.forEach(function(h){ (function visiter(x){ if (objets[x] || interdits[x]) return; var o = gObjet(R, x); if (!o) return; objets[x] = [o.t, o.c]; if (o.t === "commit"){ var c = gCommit(R, x); visiter(c.arbre); } else if (o.t === "tree") o.c.forEach(function(e){ visiter(e[2]); }); })(h); });
		refs.forEach(function(r){ var o = gObjet(R, r.hash); if (o && o.t === "tag") objets[r.hash] = [o.t, o.c]; });
		var r = gChemin(ctx.lieu, fichier);
		if (!r || !r.dir) throw new GitErreur("fatal: could not create '" + fichier + "'", 128);
		var it = r.noeud instanceof Item ? r.noeud : new Item(r.nom, "", "item_box.gif");
		it.owner = gJoueur(); it.mode = "rw-r--r--";
		it.setText("# v2 git bundle\n" + refs.map(function(x){ return x.hash + " " + x.nom; }).join("\n") + "\n\nPACK");
		it.sansFinDeLigne = true;
		it.gitBundle = { refs: refs, prerequis: exclus, o: objets };
		if (!(r.noeud instanceof Item)) r.dir.addItem(it);
		var n2 = Object.keys(objets).length;
		ctx.ev.fichier = fichier; ctx.ev.objets = n2;
		return "Enumerating objects: " + n2 + ", done.\nCounting objects: 100% (" + n2 + "/" + n2 + "), done.\nWriting objects: 100% (" + n2 + "/" + n2 + "), done.\nTotal " + n2 + " (delta 0), reused 0 (delta 0), pack-reused 0";
	}
	var f = args[0];
	var rr = f ? gChemin(ctx.lieu, f) : null;
	if (!rr || !(rr.noeud instanceof Item)) throw new GitErreur("error: could not open '" + (f || "") + "'", 128);
	var b = rr.noeud.gitBundle;
	if (!b) throw new GitErreur("error: '" + f + "' does not look like a v2 or v3 bundle file", 128);
	if (sous === "list-heads") return b.refs.map(function(x){ return x.hash + " " + x.nom; }).join("\n");
	if (sous === "verify"){
		var R2 = gTrouverDepot(ctx.lieu);
		var manque = (b.prerequis || []).filter(function(h){ return !R2 || !gObjet(R2, h); });
		if (manque.length) throw new GitErreur("error: Repository lacks these prerequisite commits:\nerror: " + manque.join("\nerror: ") + "\nerror: '" + f + "' could not be verified", 1);
		return "The bundle contains " + (b.refs.length === 1 ? "this ref:" : "these " + b.refs.length + " refs:") + "\n" + b.refs.map(function(x){ return x.hash + " " + x.nom; }).join("\n") + "\n" + ((b.prerequis || []).length ? "The bundle requires these " + b.prerequis.length + " refs:\n" + b.prerequis.join("\n") : "The bundle records a complete history.") + "\n" + f + " is okay";
	}
	if (sous === "unbundle"){
		var R3 = ctx.depot();
		var p = gPackNeuf(R3); Object.keys(b.o).forEach(function(h){ if (!gObjet(R3, h)) p.gitPack.o[h] = b.o[h]; }); gPackFermer(R3, p);
		return b.refs.map(function(x){ return x.hash + " " + x.nom; }).join("\n");
	}
	throw new GitErreur("usage: git bundle create [<options>] <file> <git-rev-list args>\n   or: git bundle verify [<options>] <file>\n   or: git bundle list-heads <file> [<refname>...]\n   or: git bundle unbundle <file> [<refname>...]", 129);
};
function gAtteignablesDepuis(R, departs){
	var vus = {}, pile = departs.slice();
	while (pile.length){ var h = pile.pop(); if (vus[h]) continue; var o = gObjet(R, h); if (!o) continue; vus[h] = true; if (o.t === "commit"){ var c = gCommit(R, h); pile.push(c.arbre); c.parents.forEach(function(p){ pile.push(p); }); } else if (o.t === "tree") o.c.forEach(function(e){ pile.push(e[2]); }); }
	return vus;
}
/* Un bundle se clone et se récupère comme un dépôt : on le présente au transport comme un dépôt nu en mémoire. */
var OUVRIR_DISTANT_AVANT_BUNDLE = gOuvrirDistant;
gOuvrirDistant = function(R, url, lieu){
	var depart = lieu || (R ? (R.top || R.git) : current_room);
	var r = /\.bundle$/.test(String(url)) ? gChemin(depart, url) : null;
	if (r && r.noeud instanceof Item && r.noeud.gitBundle){
		var b = r.noeud.gitBundle;
		var salle = new Room("bundle", "", "item_box.gif");
		var D = gInitialiser(salle, true, "main", { sansHooks: true });
		var p = gPackNeuf(D); Object.keys(b.o).forEach(function(h){ p.gitPack.o[h] = b.o[h]; }); gPackFermer(D, p);
		b.refs.forEach(function(x){ if (x.nom !== "HEAD") gEcrire(D.git, x.nom, x.hash + "\n"); });
		var tete = b.refs.filter(function(x){ return x.nom === "HEAD"; })[0];
		var br = b.refs.filter(function(x){ return /^refs\/heads\//.test(x.nom) && (!tete || x.hash === tete.hash); })[0];
		if (br) gEcrire(D.git, "HEAD", "ref: " + br.nom + "\n");
		D.url = url; D.ssh = false;
		return D;
	}
	return OUVRIR_DISTANT_AVANT_BUNDLE.apply(this, arguments);
};

/* ================================================================== */
/* filter-repo : réécrire l'histoire (purger un fichier, un secret)      */
/* ================================================================== */

GIT_SOUS_COMMANDES["filter-repo"] = function(ctx){
	var op = gOptions(ctx.args, { "--path": "l", "--path-glob": "l", "--invert-paths": "b", "--force": "b", "--replace-text": "v", "--dry-run": "b", "--analyze": "b", "--refs": "l" }, "filter-repo");
	var R = ctx.travail();
	if (!op.o.path && !op.o["path-glob"] && !op.o["replace-text"]) throw new GitErreur("Error: no filtering options given.\n" + C.gris("(Par exemple : git filter-repo --path secrets.env --invert-paths, ou --replace-text expressions.txt)"), 1);
	var et = gEtatDepot(R);
	var frais = gReflogLire(R, "HEAD").length <= 1 && !et.indexees.length && !et.modifiees.length && !gRefs(R, "refs/stash").length;
	if (!frais && !op.o.force) throw new GitErreur("Aborting: Refusing to destructively overwrite repo history since\nthis does not look like a fresh clone.\n  (expected freshly packed repo)\nPlease operate on a fresh clone instead.  If you want to proceed\nanyway, use --force.", 1);
	if (et.indexees.length || et.modifiees.length) throw new GitErreur("Aborting: You have uncommitted changes in your working tree.", 1);
	var chemins = op.o.path || [], globs = (op.o["path-glob"] || []).map(function(g){ return new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$"); });
	var garderChemin = function(p){
		var vise = chemins.some(function(c){ return p === c.replace(/\/$/, "") || p.indexOf(c.replace(/\/$/, "") + "/") === 0; }) || globs.some(function(g){ return g.test(p); });
		if (!chemins.length && !globs.length) return true;
		return op.o["invert-paths"] ? !vise : vise;
	};
	var remplacements = [];
	if (op.o["replace-text"]){
		var rf = gChemin(ctx.lieu, op.o["replace-text"]);
		if (!rf || !(rf.noeud instanceof Item)) throw new GitErreur("Error: could not read " + op.o["replace-text"], 1);
		gContenu(rf.noeud).split("\n").forEach(function(l){
			if (!l.trim() || l.charAt(0) === "#") return;
			var m = /^(.*?)==>(.*)$/.exec(l), avant = m ? m[1] : l, apres = m ? m[2] : "***REMOVED***";
			if (/^regex:/.test(avant)) remplacements.push({ re: new RegExp(avant.substring(6), "g"), par: apres });
			else if (/^glob:/.test(avant)) remplacements.push({ re: new RegExp(avant.substring(5).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"), "g"), par: apres });
			else remplacements.push({ re: new RegExp(avant.replace(/^literal:/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), par: apres });
		});
	}
	var refs = gRefs(R, "refs/heads/").concat(gRefs(R, "refs/tags/"));
	var tous = gParcours(R, refs.map(function(r){ return gPeler(R, r.hash, "commit"); }).filter(Boolean), [], {}).reverse();
	var nouveau = {}, n = 0;
	tous.forEach(function(h){
		var c = gCommit(R, h);
		var carte = gAplatir(R, c.arbre), nc = {};
		Object.keys(carte).forEach(function(p){
			if (!garderChemin(p)) return;
			var e = carte[p];
			if (remplacements.length){
				var t = gObjet(R, e.h).c, t2 = t;
				remplacements.forEach(function(x){ t2 = t2.replace(x.re, x.par); });
				if (t2 !== t) e = { h: gObjetEcrire(R, "blob", t2), m: e.m };
			}
			nc[p] = e;
		});
		var parents = c.parents.map(function(p){ return nouveau[p] || p; }).filter(function(p, i, t){ return t.indexOf(p) === i; });
		var arbre = gArbreDepuisCarte(R, nc);
		// Un commit qui ne change plus rien disparaît (on garde son parent).
		if (parents.length === 1 && gCommit(R, parents[0]) && gCommit(R, parents[0]).arbre === arbre && gAplatir(R, gCommit(R, h).arbre) && c.parents.length === 1){ nouveau[h] = parents[0]; return; }
		var obj = { arbre: arbre, parents: parents, auteur: c.auteur, commiteur: c.commiteur, message: c.message, gpgsig: null };
		nouveau[h] = gObjetEcrire(R, "commit", gTexteCommit(obj));
		n++;
	});
	refs.forEach(function(r){
		var o = gObjet(R, r.hash);
		var cible = gPeler(R, r.hash, "commit");
		var nv = nouveau[cible] || cible;
		if (o && o.t === "tag"){ var t = o.c.replace(/^object [0-9a-f]{40}/, "object " + nv); gEcrire(gCommun(R), r.nom, gObjetEcrire(R, "tag", t) + "\n"); }
		else gEcrire(gCommun(R), r.nom, nv + "\n");
	});
	// Les reflogs, le stash, les refs distantes et le remote origin disparaissent (comme le vrai).
	gSupprimer(R.git, "logs");
	gRefs(R, "refs/remotes/").forEach(function(r){ gRefSupprimer(R, r.nom); });
	gRefSupprimer(R, "refs/stash");
	if (gRemotes(R).indexOf("origin") > -1) gConfigRetirerSection(R, "remote", "origin");
	gSupprimer(R.git, "ORIG_HEAD");
	var t2 = gTete(R);
	var H = gIndexCarte(gIndex(R));
	if (t2) gBasculerArbre(R, H, gAplatir(R, gCommit(R, t2).arbre), { force: true });
	// Le grand ménage : les anciens objets inatteignables partent.
	var c2 = new GitCtx(["--prune=now", "-q"], ctx.io, "gc"); c2.R = R; c2.ev.silencieux = true;
	GIT_SOUS_COMMANDES.gc(c2);
	ctx.ev.reecrits = n; ctx.ev.chemins = chemins; ctx.ev.remplacements = remplacements.length;
	return "Parsed " + tous.length + " commits\nNew history written in 0.02 seconds; now repacking/cleaning...\nRepacking your repo and cleaning out old unneeded objects\nHEAD is now at " + gCourt(R, t2) + " " + gSujet(gCommit(R, t2).message) + "\nEnumerating objects: done.\nCompletely finished after 0.05 seconds.";
};
