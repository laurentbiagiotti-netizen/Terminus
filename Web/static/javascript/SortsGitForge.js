/**
 * SortsGitForge.js : la forge du jeu et la commande gh (chapitre 9 pour le joueur, numéro interne 10).
 *
 * La forge vit dans le dépôt nu du remote (sur une machine, par exemple royaume:/srv/git/chronique.git) : un objet
 * info/forge dont la propriété sauvegardée gitForge porte les demandes de fusion (Pull Requests), leurs revues,
 * leurs commentaires, les exécutions de vérification (la CI) et les règles de protection des branches.
 * gh se lance dans un clone : il trouve la forge par l'URL du remote origin (ou du premier remote).
 *
 * --- Ce que le chapitre peut fournir ou appeler ---
 *   forgeVerifications(D, pr)        -> [{ nom, etat: "success" | "failure" | "pending", details }]  (surchargeable ; par défaut, aucune)
 *   forgeProtection(D, branche)      -> { pr: bool, revues: n, verifications: [noms], forcePush: bool } ou null (par défaut : ce que forgeProteger a posé)
 *   forgeProteger(h, depot, branche, regles)   pose des règles de protection
 *   forgeCreerPR(h, depot, { titre, corps, auteur, base, tete })   une demande de fusion au nom d'un PNJ ; renvoie son numéro
 *   forgeRevue(h, depot, n, { auteur, etat: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED", corps })
 *   forgeEtat(h, depot)              l'état complet (lecture)
 *   gitForgeRefusPush(D, ref, ancien, nouveau, { force })   appelé par git push : la forge peut refuser (branche protégée)
 * Les événements : GameEvents { type: "forge", hote, depot, cmd ("pr create", "pr merge"...), pr, ok, ... }.
 */

/* ------------------------------------------------------------------ */
/* L'état de la forge d'un dépôt nu                                     */
/* ------------------------------------------------------------------ */

function gForgeItem(D, creer){
	var it = gItem(gCommun(D), "info/forge");
	if (!it && creer){
		it = gEcrire(gCommun(D), "info/forge", "# forge : les demandes de fusion, les revues et la CI de ce dépôt\n", { owner: gCommun(D).owner || "git" });
		it.gitForge = { prs: [], prochain: 1, runs: [], protection: {}, prochainRun: 1 };
	}
	if (it && !it.gitForge) it.gitForge = { prs: [], prochain: 1, runs: [], protection: {}, prochainRun: 1 };
	return it;
}
function gForge(D){ return gForgeItem(D, true).gitForge; }
/* Le nom du dépôt sur la forge : proprietaire/nom (config forge.proprietaire, sinon « cybersup »). */
function gForgeNom(D){
	var nom = (gCommun(D).room_name === ".git" ? (gCommun(D).parents[0] || gCommun(D)).room_name : gCommun(D).room_name).replace(/\.git$/, "");
	return (gConfig(D, "forge.proprietaire") || "cybersup") + "/" + nom;
}
function gForgeHote(D){ return D.h || "forge"; }
function gForgeUrl(D, chemin){ return "https://" + gForgeHote(D) + "/" + gForgeNom(D) + (chemin || ""); }

/* Les vérifications (la CI) d'une demande de fusion : le chapitre peut fournir forgeVerifications. */
function gForgeVerifications(D, pr){
	var l = [];
	if (typeof forgeVerifications === "function"){ try { l = forgeVerifications(D, pr) || []; } catch (e){ l = [{ nom: "ci", etat: "failure", details: String(e && e.message || e) }]; } }
	return l;
}
/* Les règles d'une branche : celles posées par forgeProteger, ou celles du chapitre (forgeProtection). */
function gForgeRegles(D, branche){
	if (typeof forgeProtection === "function"){ try { var r = forgeProtection(D, branche); if (r !== undefined) return r; } catch (e){} }
	var f = gForgeItem(D, false);
	return f && f.gitForge.protection && f.gitForge.protection[branche] ? f.gitForge.protection[branche] : null;
}
/* Appelé par git push : refuse ce que la protection interdit. */
function gitForgeRefusPush(D, ref, ancien, nouveau, options){
	options = options || {};
	if (ref.indexOf("refs/heads/") !== 0) return null;
	var b = ref.substring(11), r = gForgeRegles(D, b);
	if (!r) return null;
	if (nouveau === null && r.suppression !== true) return { raison: "protected branch hook declined", lignes: ["error: GH006: Protected branch update failed for " + ref + ".", "error: Cannot delete this branch"] };
	if (options.force && !r.forcePush) return { raison: "protected branch hook declined", lignes: ["error: GH006: Protected branch update failed for " + ref + ".", "error: Cannot force-push to this branch"] };
	if (r.pr) return { raison: "protected branch hook declined", lignes: ["error: GH006: Protected branch update failed for " + ref + ".", "error: Changes must be made through a pull request."] };
	return null;
}

/* ------------------------------------------------------------------ */
/* L'API pour le monde                                                  */
/* ------------------------------------------------------------------ */

function gForgeDepot(h, depot){ var D = gitDepot(h, depot); if (!D) throw new Error("forge : pas de dépôt à " + depot); return D; }
function forgeEtat(h, depot){ try { return gForge(gForgeDepot(h, depot)); } catch (e){ return null; } }
function forgeProteger(h, depot, branche, regles){ var f = gForge(gForgeDepot(h, depot)); f.protection = f.protection || {}; f.protection[branche] = regles; return true; }
function forgeCreerPR(h, depot, o){
	var D = gForgeDepot(h, depot), f = gForge(D);
	var pr = { n: f.prochain++, titre: o.titre || "Sans titre", corps: o.corps || "", auteur: o.auteur || "pnj", base: o.base || gBrancheCourante(D) || "main", tete: o.tete, etat: "OPEN", revues: [], commentaires: [], cree: o.date || gSecondes(D), brouillon: !!o.brouillon };
	f.prs.push(pr);
	gForgeLancerCI(D, pr, "pull_request");
	return pr.n;
}
function forgeRevue(h, depot, n, o){
	var D = gForgeDepot(h, depot), f = gForge(D), pr = f.prs.filter(function(x){ return x.n === n; })[0];
	if (!pr) return false;
	pr.revues.push({ auteur: o.auteur || "pnj", etat: o.etat || "COMMENTED", corps: o.corps || "", date: gSecondes(D) });
	return true;
}
/* Une exécution de CI pour une PR (ou un push) : elle garde le résultat des vérifications au commit de tête. */
function gForgeLancerCI(D, pr, evenement){
	var f = gForge(D);
	var tete = gRef(D, "refs/heads/" + pr.tete);
	var verifs = gForgeVerifications(D, pr);
	pr.verifications = verifs; pr.verifieA = tete;
	if (!verifs.length) return null;
	var run = { n: f.prochainRun++, pr: pr.n, branche: pr.tete, commit: tete, evenement: evenement || "pull_request", titre: pr.titre, etat: verifs.some(function(v){ return v.etat === "failure"; }) ? "failure" : (verifs.some(function(v){ return v.etat === "pending"; }) ? "pending" : "success"), verifs: verifs, date: gSecondes(D) };
	f.runs.push(run);
	return run;
}

/* ------------------------------------------------------------------ */
/* La commande gh                                                       */
/* ------------------------------------------------------------------ */

function ctxTtyGh(io){ return !!(io && io.tty); }
function GhErreur(m, code){ this.message = m; this.code = code === undefined ? 1 : code; }
function gGhContexte(io){
	var R = gTrouverDepot(current_room);
	if (!R) throw new GhErreur("failed to run git: fatal: not a git repository (or any of the parent directories): .git", 1);
	var remotes = gRemotes(R);
	if (!remotes.length) throw new GhErreur("no git remotes found", 1);
	var nom = remotes.indexOf("origin") > -1 ? "origin" : remotes[0];
	var D;
	try { D = gOuvrirDistant(R, gConfig(R, "remote." + nom + ".url")); }
	catch (e){ if (e instanceof GitErreur) throw new GhErreur("none of the git remotes configured for this repository point to a known GitHub host. To tell gh about a new GitHub host, please use `gh auth login`", 1); throw e; }
	return { R: R, D: D, remote: nom, f: gForge(D) };
}
function gGhPR(c, n){
	var pr;
	if (n === undefined || n === null){
		var br = gBrancheCourante(c.R);
		pr = c.f.prs.filter(function(x){ return x.tete === br && x.etat === "OPEN"; })[0];
		if (!pr) throw new GhErreur("no pull requests found for branch \"" + (br || "HEAD") + "\"", 1);
		return pr;
	}
	var num = +String(n).replace(/^#/, "").replace(/^.*\/pull\//, "");
	pr = c.f.prs.filter(function(x){ return x.n === num; })[0] || c.f.prs.filter(function(x){ return x.tete === n; })[0];
	if (!pr) throw new GhErreur("GraphQL: Could not resolve to a PullRequest with the number of " + String(n).replace(/^#/, "") + ". (repository.pullRequest)", 1);
	return pr;
}
function gGhIl(s, maintenant){
	var d = Math.max(0, maintenant - s);
	if (d < 60) return "less than a minute ago";
	if (d < 3600){ var m = Math.round(d / 60); return "about " + m + " minute" + (m > 1 ? "s" : "") + " ago"; }
	if (d < 86400){ var h = Math.round(d / 3600); return "about " + h + " hour" + (h > 1 ? "s" : "") + " ago"; }
	var j = Math.round(d / 86400); return "about " + j + " day" + (j > 1 ? "s" : "") + " ago";
}
function gGhEvenement(c, cmd, o){
	var e = { type: "forge", hote: c && c.D ? c.D.h : null, depot: c && c.D ? gCheminReel(gCommun(c.D)) : null, cmd: cmd, ok: true };
	for (var k in (o || {})) if (o.hasOwnProperty(k)) e[k] = o[k];
	try { GameEvents.fire(e); } catch (x){}
}
function gGhVerifsTexte(pr){
	var v = pr.verifications || [];
	if (!v.length) return "no checks reported on the '" + pr.tete + "' branch";
	var ok = v.filter(function(x){ return x.etat === "success"; }).length, ko = v.filter(function(x){ return x.etat === "failure"; }).length, att = v.filter(function(x){ return x.etat === "pending"; }).length;
	var l = [ko ? "Some checks were not successful" : att ? "Some checks are still pending" : "All checks were successful",
		"0 cancelled, " + ko + " failing, " + ok + " successful, 0 skipped, and " + att + " pending checks", "", "   NAME" + "                DESCRIPTION"];
	v.forEach(function(x){ var n = x.nom; while (n.length < 20) n += " "; l.push((x.etat === "success" ? "✓" : x.etat === "failure" ? "X" : "*") + "  " + n + " " + (x.details || "")); });
	return l.join("\n");
}
/* La PR peut-elle être fusionnée ? Renvoie null, ou la raison. */
function gGhBloquant(c, pr){
	if (pr.etat !== "OPEN") return "Pull request #" + pr.n + " was already " + (pr.etat === "MERGED" ? "merged" : "closed");
	var r = gForgeRegles(c.D, pr.base);
	var tete = gRef(c.D, "refs/heads/" + pr.tete);
	if (!tete) return "head branch " + pr.tete + " no longer exists";
	if (pr.verifieA !== tete) gForgeLancerCI(c.D, pr, "pull_request");
	if (!r) return null;
	var approbations = {};
	pr.revues.forEach(function(x){ approbations[x.auteur] = x.etat; });
	var ok = Object.keys(approbations).filter(function(a){ return approbations[a] === "APPROVED"; }).length;
	var refus = Object.keys(approbations).filter(function(a){ return approbations[a] === "CHANGES_REQUESTED"; }).length;
	if (refus) return "changes were requested";
	if (r.revues && ok < r.revues) return "at least " + r.revues + " approving review" + (r.revues > 1 ? "s are" : " is") + " required by reviewers with write access";
	var v = pr.verifications || [];
	var requises = r.verifications || [];
	if (requises.some(function(n){ var x = v.filter(function(y){ return y.nom === n; })[0]; return !x || x.etat !== "success"; })) return "required status checks have not succeeded";
	return null;
}

Shell.sorts.gh = function(args, io){
	var c = null;
	try {
		var s = args[0], s2 = args[1];
		if (!s || s === "--help" || s === "help") return "Work seamlessly with the forge from the command line.\n\nUSAGE\n  gh <command> <subcommand> [flags]\n\nCORE COMMANDS\n  api:         Make an authenticated forge API request\n  auth:        Authenticate gh and git with the forge\n  pr:          Manage pull requests\n  repo:        Manage repositories\n  run:         View details about workflow runs\n\n" + C.gris("(man gh : la page du sort.)");
		if (s === "--version" || s === "version") return "gh version 2.45.0 (2024-03-04)";
		if (s === "auth"){
			if (s2 === "status"){ var R0 = gTrouverDepot(current_room); var h0 = "royaume"; try { var D0 = gGhContexte(io).D; h0 = gForgeHote(D0); } catch (e){} return h0 + "\n  ✓ Logged in to " + h0 + " account " + gJoueur() + " (keyring)\n  - Active account: true\n  - Git operations protocol: ssh\n  - Token: gho_************************************\n  - Token scopes: 'gist', 'read:org', 'repo'"; }
			if (s2 === "login") return "✓ Logged in as " + gJoueur();
			throw new GhErreur("unknown command \"" + (s2 || "") + "\" for \"gh auth\"", 1);
		}
		c = gGhContexte(io);
		var op;
		if (s === "repo" && s2 === "view"){
			var nomDepot = gForgeNom(c.D), desc = (gLire(gCommun(c.D), "description") || "").replace(/\n$/, "");
			if (/^Unnamed repository/.test(desc)) desc = "";
			var t = gTete(c.D), readme = t ? gAplatir(c.D, gCommit(c.D, t).arbre) : {};
			var rm = Object.keys(readme).filter(function(p){ return /^readme(\.md|\.txt)?$/i.test(p); })[0];
			gGhEvenement(c, "repo view", {});
			return nomDepot + "\n" + (desc ? desc + "\n" : "") + "\n" + (rm ? gObjet(c.D, readme[rm].h).c.replace(/\n$/, "") : "This repository does not have a README") + "\n\n\nView this repository on the forge: " + gForgeUrl(c.D);
		}
		// gh api : la protection d'une branche (GET, PUT --input FICHIER.json, DELETE), comme l'API REST de la vraie forge.
		if (s === "api"){
			op = gOptions(args.slice(1), { "-X|--method": "v", "--input": "v", "-H|--header": "l", "--jq": "v", "-q": "v" }, "api");
			var chemin = String(op.p[0] || "").replace(/^\/+/, "");
			if (!chemin) throw new GhErreur("usage: gh api <endpoint> [flags]", 1);
			var methode = String(op.o.method || (op.o.input ? "POST" : "GET")).toUpperCase();
			var nomF = gForgeNom(c.D);
			chemin = chemin.replace(/^repos\/\{owner\}\/\{repo\}\//, "repos/" + nomF + "/").replace(/^repos\/:owner\/:repo\//, "repos/" + nomF + "/");
			var mp = /^repos\/([^\/]+\/[^\/]+)\/branches\/([^\/]+)\/protection$/.exec(chemin);
			if (!mp) throw new GhErreur("gh: Not Found (HTTP 404)" + (typeof C !== "undefined" && ctxTtyGh(io) ? "\n" + C.gris("(Dans le jeu, gh api connaît la protection d'une branche : repos/{owner}/{repo}/branches/main/protection, en GET, PUT --input FICHIER ou DELETE.)") : ""), 1);
			if (mp[1] !== nomF) throw new GhErreur("gh: Not Found (HTTP 404)", 1);
			var branchePr = mp[2], url = "https://api." + gForgeHote(c.D) + "/repos/" + nomF + "/branches/" + branchePr + "/protection";
			if (!gRef(c.D, "refs/heads/" + branchePr)) throw new GhErreur("gh: Branch not found (HTTP 404)", 1);
			var montrer = function(r){
				return JSON.stringify({ url: url,
					required_status_checks: r.verifications && r.verifications.length ? { strict: true, contexts: r.verifications.slice() } : null,
					required_pull_request_reviews: r.pr ? { required_approving_review_count: r.revues || 0, dismiss_stale_reviews: false } : null,
					enforce_admins: { enabled: true },
					allow_force_pushes: { enabled: !!r.forcePush },
					allow_deletions: { enabled: !!r.suppression } }, null, 2);
			};
			var actuelles = c.f.protection && c.f.protection[branchePr] ? c.f.protection[branchePr] : null;
			if (methode === "GET"){
				gGhEvenement(c, "api", { methode: "GET", branche: branchePr, protegee: !!actuelles });
				if (!actuelles) throw new GhErreur("gh: Branch not protected (HTTP 404)", 1);
				return montrer(actuelles);
			}
			if (methode === "DELETE"){
				if (c.f.protection) delete c.f.protection[branchePr];
				gGhEvenement(c, "api", { methode: "DELETE", branche: branchePr });
				return "";
			}
			if (methode !== "PUT") throw new GhErreur("gh: Method Not Allowed (HTTP 405)", 1);
			if (!op.o.input) throw new GhErreur("gh: Problems parsing JSON (HTTP 400)" + (ctxTtyGh(io) ? "\n" + C.gris("(Écris les règles dans un fichier JSON, puis gh api -X PUT ... --input regles.json.)") : ""), 1);
			var txt;
			if (op.o.input === "-") txt = io && io.entree !== undefined ? String(io.entree) : "";
			else {
				var rf = Shell.chercher(op.o.input, io || {}, "gh");
				if (!rf.node || rf.node instanceof Room) throw new GhErreur("open " + op.o.input + ": no such file or directory", 1);
				txt = rf.node.getText();
			}
			var j;
			try { j = JSON.parse(txt); } catch (eJ){ throw new GhErreur("gh: Problems parsing JSON (HTTP 400)", 1); }
			if (!j || typeof j !== "object" || !("required_status_checks" in j) || !("enforce_admins" in j) || !("required_pull_request_reviews" in j) || !("restrictions" in j)){
				throw new GhErreur("gh: Invalid request.\n\nNo subschema in \"anyOf\" matched.\nFor 'properties/required_status_checks', nil is not an object. (HTTP 422)" +
					(ctxTtyGh(io) ? "\n" + C.gris("(Il faut les quatre clés : required_status_checks, enforce_admins, required_pull_request_reviews, restrictions ; null pour ne rien exiger.)") : ""), 1);
			}
			var rsc = j.required_status_checks, rpr = j.required_pull_request_reviews;
			var regles = {
				pr: !!rpr,
				revues: rpr && rpr.required_approving_review_count !== undefined ? +rpr.required_approving_review_count || 0 : 0,
				verifications: rsc && (rsc.contexts || rsc.checks) ? (rsc.contexts || rsc.checks.map(function(x){ return x.context; })).map(String) : [],
				forcePush: j.allow_force_pushes === true,
				suppression: j.allow_deletions === true
			};
			c.f.protection = c.f.protection || {};
			c.f.protection[branchePr] = regles;
			gGhEvenement(c, "api", { methode: "PUT", branche: branchePr, regles: regles });
			return montrer(regles);
		}
		if (s === "pr"){
			var maintenant = gSecondes(c.R);
			if (s2 === "create"){
				op = gOptions(args.slice(2), { "-t|--title": "v", "-b|--body": "v", "-B|--base": "v", "-H|--head": "v", "-f|--fill": "b", "-d|--draft": "b", "-r|--reviewer": "l" }, "pr create");
				var tete = op.o.head || gBrancheCourante(c.R);
				if (!tete) throw new GhErreur("could not determine the current branch: not on any branch", 1);
				var base = op.o.base || gBrancheCourante(c.D) || "main";
				if (tete === base) throw new GhErreur("must be on a branch named differently than \"" + base + "\"", 1);
				var hTete = gRef(c.D, "refs/heads/" + tete);
				if (!hTete) throw new GhErreur("aborted: you must first push the current branch to a remote, or use the --head flag", 1);
				var local = gRef(c.R, "refs/heads/" + tete);
				var avert = local && local !== hTete ? "Warning: " + gParcours(c.R, [local], [hTete]).length + " uncommitted change" + "\n" : "";
				if (!op.o.title && !op.o.fill) throw new GhErreur("must provide `--title` and `--body` (or `--fill` or `fill-first` or `--fillverbose`) when not running interactively", 1);
				var commits = gParcours(c.D, [hTete], [gRef(c.D, "refs/heads/" + base)].filter(Boolean));
				if (!commits.length) throw new GhErreur("pull request create failed: GraphQL: No commits between " + base + " and " + tete + " (createPullRequest)", 1);
				var titre = op.o.title || gSujet(gCommit(c.D, commits[commits.length - 1]).message);
				if (c.f.prs.some(function(x){ return x.tete === tete && x.base === base && x.etat === "OPEN"; })) throw new GhErreur("a pull request for branch \"" + tete + "\" into branch \"" + base + "\" already exists:\n" + gForgeUrl(c.D, "/pull/" + c.f.prs.filter(function(x){ return x.tete === tete && x.etat === "OPEN"; })[0].n), 1);
				var pr = { n: c.f.prochain++, titre: titre, corps: op.o.body || (op.o.fill ? gNettoyerMessage(gCommit(c.D, commits[commits.length - 1]).message).split("\n").slice(2).join("\n") : ""), auteur: gJoueur(), base: base, tete: tete, etat: "OPEN", revues: [], commentaires: [], cree: maintenant, brouillon: !!op.o.draft, demandes: op.o.reviewer || [] };
				c.f.prs.push(pr);
				gForgeLancerCI(c.D, pr, "pull_request");
				gGhEvenement(c, "pr create", { pr: pr.n, titre: pr.titre, base: base, tete: tete });
				return (avert || "") + "\nCreating " + (pr.brouillon ? "draft " : "") + "pull request for " + tete + " into " + base + " in " + gForgeNom(c.D) + "\n\n" + gForgeUrl(c.D, "/pull/" + pr.n);
			}
			if (s2 === "list"){
				op = gOptions(args.slice(2), { "-s|--state": "v", "-A|--author": "v", "-B|--base": "v", "-L|--limit": "v" }, "pr list");
				var etat = (op.o.state || "open").toUpperCase();
				var l = c.f.prs.filter(function(x){ return (etat === "ALL" || x.etat === etat) && (!op.o.author || x.auteur === op.o.author) && (!op.o.base || x.base === op.o.base); }).slice().reverse();
				gGhEvenement(c, "pr list", { nombre: l.length });
				// Comme gh : sans filtre, « no open pull requests in ... » ; avec un filtre, « no pull requests match your search ».
				if (!l.length) return op.o.state === undefined && !op.o.author && !op.o.base ? "no open pull requests in " + gForgeNom(c.D) : "no pull requests match your search in " + gForgeNom(c.D);
				return "\nShowing " + l.length + " of " + l.length + " " + (etat === "ALL" ? "" : etat.toLowerCase() + " ") + "pull request" + (l.length > 1 ? "s" : "") + " in " + gForgeNom(c.D) + "\n\nID  TITLE                                   BRANCH                CREATED AT\n" +
					l.map(function(x){ var t2 = x.titre.length > 38 ? x.titre.substring(0, 35) + "..." : x.titre; while (t2.length < 38) t2 += " "; var b = x.tete; while (b.length < 21) b += " "; return "#" + x.n + "  " + t2 + "  " + b + " " + gGhIl(x.cree, maintenant); }).join("\n");
			}
			if (s2 === "view" || s2 === "status"){
				if (s2 === "status"){
					var br = gBrancheCourante(c.R), mien = c.f.prs.filter(function(x){ return x.tete === br && x.etat === "OPEN"; })[0];
					return "\nRelevant pull requests in " + gForgeNom(c.D) + "\n\nCurrent branch\n  " + (mien ? "#" + mien.n + "  " + mien.titre + " [" + mien.tete + "]" : "There is no pull request associated with [" + br + "]") + "\n\nCreated by you\n  " + (c.f.prs.filter(function(x){ return x.auteur === gJoueur() && x.etat === "OPEN"; }).map(function(x){ return "#" + x.n + "  " + x.titre + " [" + x.tete + "]"; }).join("\n  ") || "You have no open pull requests") + "\n\nRequesting a code review from you\n  " + (c.f.prs.filter(function(x){ return x.auteur !== gJoueur() && x.etat === "OPEN"; }).map(function(x){ return "#" + x.n + "  " + x.titre + " [" + x.tete + "]"; }).join("\n  ") || "You have no pull requests to review");
				}
				op = gOptions(args.slice(2), { "-c|--comments": "b", "-w|--web": "b", "--json": "v" }, "pr view");
				var p = gGhPR(c, op.p[0]);
				if (p.etat === "OPEN") gGhBloquant(c, p);
				var fusionnable = gForgeFusionnable(c.D, p);
				p.mergeable = fusionnable;
				if (op.o.json !== undefined){
					var champs = { number: p.n, title: p.titre, state: p.etat, mergeable: fusionnable, headRefName: p.tete, baseRefName: p.base, isDraft: !!p.brouillon };
					var demandes = String(op.o.json).split(",").map(function(x){ return x.trim(); }).filter(Boolean);
					var inconnus = demandes.filter(function(x){ return !champs.hasOwnProperty(x); });
					if (inconnus.length || !demandes.length) throw new GhErreur("Unknown JSON field: \"" + (inconnus[0] || "") + "\"\nAvailable fields:\n  " + Object.keys(champs).sort().join("\n  "), 1);
					var objet = {};
					demandes.slice().sort().forEach(function(x){ objet[x] = champs[x]; });
					gGhEvenement(c, "pr view", { pr: p.n, json: demandes, mergeable: fusionnable });
					return JSON.stringify(objet, null, 2);
				}
				var commitsPR = gParcours(c.D, [gRef(c.D, "refs/heads/" + p.tete) || ""].filter(Boolean), [gRef(c.D, "refs/heads/" + p.base)].filter(Boolean));
				var ch = gRef(c.D, "refs/heads/" + p.tete) && gRef(c.D, "refs/heads/" + p.base) ? gComparerCartes(gAplatir(c.D, gCommit(c.D, gBaseFusion(c.D, gRef(c.D, "refs/heads/" + p.base), gRef(c.D, "refs/heads/" + p.tete)) || gRef(c.D, "refs/heads/" + p.base)).arbre), gAplatir(c.D, gCommit(c.D, gRef(c.D, "refs/heads/" + p.tete)).arbre)) : [];
				var n = gCompteHunks([].concat.apply([], ch.map(function(x){ return gHunks(gLignes(x.a ? gObjet(c.D, x.a.h).c : ""), gLignes(x.b ? gObjet(c.D, x.b.h).c : ""), 0); })));
				var lignes = [p.titre + " #" + p.n, { OPEN: "Open", CLOSED: "Closed", MERGED: "Merged" }[p.etat] + " • " + p.auteur + " wants to merge " + commitsPR.length + " commit" + (commitsPR.length > 1 ? "s" : "") + " into " + p.base + " from " + p.tete + " • " + gGhIl(p.cree, maintenant) + "\n+" + n.plus + " -" + n.moins + " • " + gGhChecksCourt(p)];
				if (p.revues.length) lignes.push("Reviewers: " + p.revues.map(function(x){ return x.auteur + " (" + { APPROVED: "Approved", CHANGES_REQUESTED: "Changes requested", COMMENTED: "Commented" }[x.etat] + ")"; }).join(", "));
				lignes.push("", "", "  " + (p.corps ? p.corps.replace(/\n/g, "\n  ") : "No description provided"), "");
				if (op.o.comments || true){
					p.revues.forEach(function(x){ if (x.corps) lignes.push("", x.auteur + " " + { APPROVED: "approved", CHANGES_REQUESTED: "requested changes", COMMENTED: "reviewed" }[x.etat] + " • " + gGhIl(x.date, maintenant), "  " + x.corps.replace(/\n/g, "\n  ")); });
					p.commentaires.forEach(function(x){ lignes.push("", x.auteur + " • " + gGhIl(x.date, maintenant), "  " + x.corps.replace(/\n/g, "\n  ")); });
				}
				if (p.etat === "OPEN" && fusionnable === "CONFLICTING") lignes.push("", "This branch has conflicts that must be resolved" + C.gris("  (la forge : cette requête est en conflit avec " + p.base + " ; fusionne " + p.base + " dans ta ligne, ou rebase-la, tranche, puis pousse)"));
				lignes.push("", "View this pull request on the forge: " + gForgeUrl(c.D, "/pull/" + p.n));
				gGhEvenement(c, "pr view", { pr: p.n, mergeable: fusionnable });
				return lignes.join("\n");
			}
			if (s2 === "diff"){
				op = gOptions(args.slice(2), { "--name-only": "b", "--color": "v", "--patch": "b" }, "pr diff");
				var pd = gGhPR(c, op.p[0]);
				var hb = gRef(c.D, "refs/heads/" + pd.base), ht = gRef(c.D, "refs/heads/" + pd.tete);
				if (!ht) throw new GhErreur("could not find pull request diff: head branch is missing", 1);
				var bas = gBaseFusion(c.D, hb, ht) || hb;
				var chd = gComparerCartes(gAplatir(c.D, gCommit(c.D, bas).arbre), gAplatir(c.D, gCommit(c.D, ht).arbre));
				gGhEvenement(c, "pr diff", { pr: pd.n });
				if (op.o["name-only"]) return chd.map(function(x){ return x.chemin; }).join("\n");
				return chd.map(function(x){ return gDiffFichier(c.D, x.chemin, x.a, x.b); }).join("\n");
			}
			if (s2 === "checkout"){
				var pc = gGhPR(c, args[2]);
				var hc = gRef(c.D, "refs/heads/" + pc.tete);
				if (!hc) throw new GhErreur("failed to run git: fatal: couldn't find remote ref refs/heads/" + pc.tete, 1);
				gCopierObjets(c.D, c.R, [hc]);
				var ctxg = new GitCtx([], io, "fetch"); ctxg.R = c.R;
				gRecuperer(ctxg, c.R, c.remote, {});
				var sortie = "From " + gConfig(c.R, "remote." + c.remote + ".url") + "\n * branch            " + pc.tete + "     -> FETCH_HEAD";
				var local = gRef(c.R, "refs/heads/" + pc.tete);
				var ctx2 = new GitCtx(local ? [pc.tete] : ["-c", pc.tete, "--track", c.remote + "/" + pc.tete], io, "switch"); ctx2.R = c.R;
				if (local){
					sortie += "\n" + GIT_SOUS_COMMANDES["switch"](ctx2);
					if (local !== hc && gEstAncetre(c.R, local, hc)){ var ctx3 = new GitCtx([c.remote + "/" + pc.tete], io, "merge"); ctx3.R = c.R; sortie += "\n" + gFusionner(ctx3, c.R, c.remote + "/" + pc.tete, { ffOnly: true }); }
				} else sortie += "\n" + GIT_SOUS_COMMANDES["switch"](ctx2);
				gGhEvenement(c, "pr checkout", { pr: pc.n, branche: pc.tete });
				return sortie;
			}
			if (s2 === "review"){
				op = gOptions(args.slice(2), { "-a|--approve": "b", "-r|--request-changes": "b", "-c|--comment": "b", "-b|--body": "v" }, "pr review");
				var pv = gGhPR(c, op.p[0]);
				var etatR = op.o.approve ? "APPROVED" : op.o["request-changes"] ? "CHANGES_REQUESTED" : op.o.comment ? "COMMENTED" : null;
				if (!etatR) throw new GhErreur("did not understand desired review action: --approve, --request-changes or --comment required when not running interactively", 1);
				if ((etatR === "CHANGES_REQUESTED" || etatR === "COMMENTED") && !op.o.body) throw new GhErreur("body cannot be blank for " + (etatR === "COMMENTED" ? "comment" : "request changes") + " review", 1);
				if (pv.auteur === gJoueur() && etatR !== "COMMENTED") throw new GhErreur("failed to create review: GraphQL: " + (etatR === "APPROVED" ? "Can not approve your own pull request" : "Can not request changes on your own pull request") + " (addPullRequestReview)", 1);
				if (pv.etat !== "OPEN") throw new GhErreur("failed to create review: GraphQL: Pull request is " + pv.etat.toLowerCase() + " (addPullRequestReview)", 1);
				pv.revues.push({ auteur: gJoueur(), etat: etatR, corps: op.o.body || "", date: maintenant });
				gGhEvenement(c, "pr review", { pr: pv.n, etat: etatR, corps: op.o.body || "" });
				return etatR === "APPROVED" ? "✓ Approved pull request #" + pv.n : etatR === "CHANGES_REQUESTED" ? "- Requested changes to pull request #" + pv.n : "- Reviewed pull request #" + pv.n;
			}
			if (s2 === "comment"){
				op = gOptions(args.slice(2), { "-b|--body": "v" }, "pr comment");
				var pm = gGhPR(c, op.p[0]);
				if (!op.o.body) throw new GhErreur("--body or --body-file required when not running interactively", 1);
				pm.commentaires.push({ auteur: gJoueur(), corps: op.o.body, date: maintenant });
				gGhEvenement(c, "pr comment", { pr: pm.n, corps: op.o.body });
				return gForgeUrl(c.D, "/pull/" + pm.n + "#issuecomment-" + (1000 + pm.commentaires.length));
			}
			if (s2 === "close" || s2 === "reopen"){
				op = gOptions(args.slice(2), { "-c|--comment": "v", "-d|--delete-branch": "b" }, "pr close");
				var px = gGhPR(c, op.p[0]);
				if (s2 === "close"){ if (px.etat !== "OPEN") throw new GhErreur("! Pull request #" + px.n + " (" + px.titre + ") is already " + px.etat.toLowerCase(), 1); px.etat = "CLOSED"; if (op.o.comment) px.commentaires.push({ auteur: gJoueur(), corps: op.o.comment, date: maintenant }); gGhEvenement(c, "pr close", { pr: px.n }); return "✓ Closed pull request #" + px.n + " (" + px.titre + ")"; }
				px.etat = "OPEN"; gGhEvenement(c, "pr reopen", { pr: px.n }); return "✓ Reopened pull request #" + px.n + " (" + px.titre + ")";
			}
			if (s2 === "checks"){
				var pk = gGhPR(c, args[2]);
				gGhBloquant(c, pk);
				gGhEvenement(c, "pr checks", { pr: pk.n });
				var tv = gGhVerifsTexte(pk);
				if ((pk.verifications || []).some(function(x){ return x.etat === "failure"; })){ io.code = 1; }
				return tv;
			}
			if (s2 === "merge"){
				op = gOptions(args.slice(2), { "-m|--merge": "b", "-s|--squash": "b", "-r|--rebase": "b", "-d|--delete-branch": "b", "--admin": "b", "--auto": "b", "-t|--subject": "v", "-b|--body": "v" }, "pr merge");
				var pg = gGhPR(c, op.p[0]);
				var bloque = gGhBloquant(c, pg);
				if (bloque && !op.o.admin){
					gGhEvenement(c, "pr merge", { pr: pg.n, ok: false, raison: bloque });
					if (/already/.test(bloque)) throw new GhErreur("X " + bloque, 1);
					throw new GhErreur("X Pull request #" + pg.n + " is not mergeable: the base branch policy prohibits the merge.\nTo have the pull request merged after all the requirements have been met, add the `--auto` flag.\nTo use administrator privileges to immediately merge the pull request, add the `--admin` flag." + C.gris("\n(" + bloque + ")"), 1);
				}
				var methode = op.o.squash ? "squash" : op.o.rebase ? "rebase" : "merge";
				if (!op.o.merge && !op.o.squash && !op.o.rebase) throw new GhErreur("--merge, --rebase, or --squash required when not running interactively", 1);
				var hBase = gRef(c.D, "refs/heads/" + pg.base), hTete2 = gRef(c.D, "refs/heads/" + pg.tete);
				var nouveau = gForgeFusionner(c.D, pg, methode, hBase, hTete2, op.o.subject, op.o.body);
				if (!nouveau) throw new GhErreur("X Pull request #" + pg.n + " is not mergeable: the merge commit cannot be cleanly created.", 1);
				gEcrire(gCommun(c.D), "refs/heads/" + pg.base, nouveau + "\n");
				c.D.cache = {};
				pg.etat = "MERGED"; pg.fusion = { hash: nouveau, methode: methode, par: gJoueur(), date: maintenant };
				var s = (methode === "squash" ? "✓ Squashed and merged" : methode === "rebase" ? "✓ Rebased and merged" : "✓ Merged") + " pull request #" + pg.n + " (" + pg.titre + ")";
				if (op.o["delete-branch"]){
					gRefSupprimer(c.D, "refs/heads/" + pg.tete);
					var brCour = gBrancheCourante(c.R);
					var lignesSupp = [];
					if (gRef(c.R, "refs/heads/" + pg.tete)){
						if (brCour === pg.tete){
							var c4 = new GitCtx([pg.base], io, "switch"); c4.R = c.R;
							if (gRef(c.R, "refs/heads/" + pg.base)) GIT_SOUS_COMMANDES["switch"](c4);
						}
						if (gBrancheCourante(c.R) !== pg.tete){ gRefSupprimer(c.R, "refs/heads/" + pg.tete); gConfigRetirerSection(c.R, "branch", pg.tete); lignesSupp.push("✓ Deleted local branch " + pg.tete + (brCour === pg.tete ? " and switched to branch " + pg.base : "")); }
					}
					lignesSupp.push("✓ Deleted remote branch " + pg.tete);
					s += "\n" + lignesSupp.join("\n");
				}
				gGhEvenement(c, "pr merge", { pr: pg.n, methode: methode, hash: nouveau, base: pg.base });
				return s;
			}
			throw new GhErreur("unknown command \"" + (s2 || "") + "\" for \"gh pr\"\n\nUsage:  gh pr <command> [flags]\n\nAvailable commands:\n  checkout\n  checks\n  close\n  comment\n  create\n  diff\n  list\n  merge\n  reopen\n  review\n  status\n  view", 1);
		}
		if (s === "run"){
			if (s2 === "list"){
				var runs = c.f.runs.slice().reverse();
				gGhEvenement(c, "run list", {});
				if (!runs.length) return "no runs found";
				return "STATUS  TITLE                                   WORKFLOW  BRANCH          EVENT         ID\n" + runs.map(function(r){ var t3 = r.titre.length > 38 ? r.titre.substring(0, 35) + "..." : r.titre; while (t3.length < 38) t3 += " "; var b3 = r.branche; while (b3.length < 15) b3 += " "; return (r.etat === "success" ? "✓" : r.etat === "failure" ? "X" : "*") + "       " + t3 + "  golems    " + b3 + " " + r.evenement + "  " + r.n; }).join("\n");
			}
			if (s2 === "view"){
				op = gOptions(args.slice(2), { "--log-failed": "b", "--log": "b", "-v|--verbose": "b" }, "run view");
				var run = c.f.runs.filter(function(r){ return String(r.n) === String(op.p[0]); })[0] || c.f.runs[c.f.runs.length - 1];
				if (!run) throw new GhErreur("no runs found", 1);
				gGhEvenement(c, "run view", { run: run.n });
				var lv = [(run.etat === "success" ? "✓" : "X") + " " + run.branche + " golems · " + run.n, "Triggered via " + run.evenement + " " + gGhIl(run.date, gSecondes(c.R)), "", "JOBS"];
				run.verifs.forEach(function(v){ lv.push((v.etat === "success" ? "✓" : v.etat === "failure" ? "X" : "*") + " " + v.nom); if ((op.o["log-failed"] && v.etat === "failure") || op.o.log) lv.push("  " + String(v.details || "").replace(/\n/g, "\n  ")); });
				return lv.join("\n");
			}
			throw new GhErreur("unknown command \"" + (s2 || "") + "\" for \"gh run\"", 1);
		}
		throw new GhErreur("unknown command \"" + s + "\" for \"gh\"\n\nUsage:  gh <command> <subcommand> [flags]\n\nAvailable commands:\n  api\n  auth\n  pr\n  repo\n  run", 1);
	} catch (e){
		if (e instanceof GhErreur || e instanceof GitErreur){ gGhEvenement(c, "erreur", { ok: false, erreur: e.message }); throw new ShellError(e.message, e.code || 1); }
		throw e;
	}
};
/* La requête peut-elle être fusionnée sans paradoxe ? « MERGEABLE », « CONFLICTING », ou « UNKNOWN » (une ligne disparue, une requête close). */
function gForgeFusionnable(D, pr){
	try {
		if (pr.etat !== "OPEN") return "UNKNOWN";
		var hb = gRef(D, "refs/heads/" + pr.base), ht = gRef(D, "refs/heads/" + pr.tete);
		if (!hb || !ht) return "UNKNOWN";
		if (gEstAncetre(D, hb, ht) || gEstAncetre(D, ht, hb)) return "MERGEABLE";
		var base = gBaseFusion(D, hb, ht);
		var res = gFusionArbres(D, base ? gAplatir(D, gCommit(D, base).arbre) : {}, gAplatir(D, gCommit(D, hb).arbre), gAplatir(D, gCommit(D, ht).arbre), ["base", "tete", "ancetre"], "merge");
		return res.conflits.length ? "CONFLICTING" : "MERGEABLE";
	} catch (e){ return "UNKNOWN"; }
}
function gGhChecksCourt(p){ var v = p.verifications || []; if (!v.length) return "No checks"; var ko = v.filter(function(x){ return x.etat === "failure"; }).length; return ko ? ko + " failing check" + (ko > 1 ? "s" : "") : "Checks passing"; }
/* La fusion côté forge : un commit de fusion, un squash, ou un rebase des commits de la PR. Renvoie le nouveau hash de la base. */
function gForgeFusionner(D, pr, methode, hBase, hTete, sujet, corps){
	var id = { nom: gJoueur(), mail: gJoueur() + "@users.noreply." + gForgeHote(D) };
	var d = gSecondes(D);
	function commit(arbre, parents, message, auteur, dateAuteur){
		var a = auteur || id;
		return gObjetEcrire(D, "commit", gTexteCommit({ arbre: arbre, parents: parents, auteur: { nom: a.nom, mail: a.mail, s: dateAuteur || d, tz: GIT_FUSEAU }, commiteur: { nom: "Forge", mail: "noreply@" + gForgeHote(D), s: d, tz: GIT_FUSEAU }, message: gNettoyerMessage(message) }));
	}
	var base = gBaseFusion(D, hBase, hTete);
	var res = gFusionArbres(D, gAplatir(D, gCommit(D, base).arbre), gAplatir(D, gCommit(D, hBase).arbre), gAplatir(D, gCommit(D, hTete).arbre), ["base", "tete", "ancetre"], "merge");
	if (res.conflits.length) return null;
	var arbre = gArbreDepuisCarte(D, res.carte);
	if (methode === "merge") return commit(arbre, [hBase, hTete], (sujet || "Merge pull request #" + pr.n + " from " + gForgeNom(D).split("/")[0] + "/" + pr.tete) + "\n\n" + (corps || pr.titre));
	if (methode === "squash"){
		var liste = gParcours(D, [hTete], [hBase]).reverse();
		var premier = gCommit(D, liste[0] || hTete);
		return commit(arbre, [hBase], (sujet || pr.titre + " (#" + pr.n + ")") + "\n\n" + (corps || liste.map(function(h){ return "* " + gSujet(gCommit(D, h).message); }).join("\n")), { nom: premier.auteur.nom, mail: premier.auteur.mail }, premier.auteur.s);
	}
	// rebase : chaque commit de la PR rejoué sur la base.
	var actuel = hBase;
	gParcours(D, [hTete], [hBase]).reverse().forEach(function(h){
		var c = gCommit(D, h);
		var P = c.parents[0] ? gAplatir(D, gCommit(D, c.parents[0]).arbre) : {};
		var r = gFusionArbres(D, P, gAplatir(D, gCommit(D, actuel).arbre), gAplatir(D, c.arbre), ["a", "b", "c"], "merge");
		actuel = commit(gArbreDepuisCarte(D, r.carte), [actuel], c.message, { nom: c.auteur.nom, mail: c.auteur.mail }, c.auteur.s);
	});
	return actuel;
}
