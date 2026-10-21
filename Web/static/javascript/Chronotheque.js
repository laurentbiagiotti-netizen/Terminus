/**
 * Chronotheque.js : la vie de la Chronothèque (chapitre 9 pour le joueur, numéro interne 10).
 *
 * Chapitre9.js pose le monde, l'horloge, les rangs, la bataille et les étapes. Ici, la Chronothèque prend vie :
 *  - les quatorze maîtres du temps, un par salle, ont un texte VIVANT : ils entrent en scène, expliquent leur salle par
 *    une image (avec le vrai mot du métier à côté), donnent la syntaxe, confient la mission, réagissent aux erreurs
 *    fréquentes, puis racontent une histoire du métier ;
 *  - les défis (quêtes secondaires s_n9_*) : six par maître, révélés par lui, et cinq défis d'honneur de Laurent ;
 *  - les badges du chapitre (un par salle tenue, un par sceau de rang, la Chronique, la bataille, le rapport, l'aube) ;
 *  - les commandes du jeu sablier (le plan de la Chronothèque), sceaux (ton rang) et regenerer (un dépôt neuf).
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis de la Chronothèque (quêtes secondaires, six par maître)    */
/* ------------------------------------------------------------------ */

function argsTexteCh9(a){ return (a || []).join(" "); }
function sousGitCh9(a){ a = a || []; for (var i = 0; i < a.length; i++){ if (a[i] === "-C" || a[i] === "-c"){ i++; continue; } if (a[i].charAt(0) !== "-") return a[i]; } return a[0] || ""; }
function aGitCh9(a, opt){ return (a || []).some(function(x){ return x === opt || x.indexOf(opt + "=") === 0; }); }

/* Un message de commit conventionnel (Conventional Commits) : type(portée)!: description. */
var MESSAGE_CONVENTIONNEL_CH9 = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([\w.\/-]+\))?!?: \S/;
/* Un fichier CODEOWNERS (à la racine, dans .github/ ou docs/) qui nomme au moins un gardien : « motif @quelqu'un ». */
function codeownersCh9(D, h){
	var carte = gAplatir(D, gCommit(D, h).arbre);
	return ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"].some(function(p){ return !!carte[p] && /^\s*[^#\s]\S*\s+@\S+/m.test(gObjet(D, carte[p].h).c || ""); });
}
/* Une requête du joueur, en conflit avec sa base, puis remise à jour : la base est dans sa ligne, et la forge la dit fusionnable. */
function requeteRemiseAJourCh9(){
	if (typeof gForgeFusionnable !== "function") return false;
	var c = sCh9();
	c.prConflits = c.prConflits || {};
	var D = G9.essai(function(){ return gitDepot(ROYAUME_CH9, DEPOT_ROYAUME_CH9); }, null);
	if (!D) return false;
	return F9.prs().some(function(pr){
		if (!auteurPrEstJoueurCh9(pr) || pr.etat !== "OPEN") return false;
		var f = gForgeFusionnable(D, pr);
		if (f === "CONFLICTING"){ c.prConflits[pr.n] = true; return false; }
		var base = gRef(D, "refs/heads/" + pr.base), tete = gRef(D, "refs/heads/" + pr.tete);
		return f === "MERGEABLE" && !!c.prConflits[pr.n] && !!base && !!tete && gEstAncetre(D, base, tete);
	});
}

/* appel(nom, args, sortie, io) : le sort lancé, et sa sortie, le prouvent. monde() : l'état le prouve. */
var DEFIS_CH9 = [
	// La Salle des Sceaux (Gamaliel)
	{ id: "s_n9_version", m: "sceaux", titre: "Sceaux : la version de la plume (git --version)",
	  appel: function(n, a, s){ return n === "git" && a[0] === "--version" && /git version \d/.test(s); } },
	{ id: "s_n9_alias", m: "sceaux", titre: "Sceaux : un raccourci à toi (un alias git, par exemple lg pour log --oneline --graph --all)",
	  monde: function(){ return /\[alias\][^\[]*\w+\s*=\s*\S/.test(gitconfigGlobalCh9()); } },
	{ id: "s_n9_config_local", m: "sceaux", titre: "Sceaux : une adresse pour un seul grimoire (git config --local user.email, et git config user.email qui la montre)",
	  appel: function(n, a, s){
		if (n !== "git" || a[0] !== "config" || a.length !== 2 || a[1] !== "user.email" || !/@/.test(s)) return false;
		try { var r = Shell.chercher(".git/config", {}, "cat"); var local = r.node && !(r.node instanceof Room) ? valeurIniCh9(r.node.getText(), "user", "email") : null; return !!local && s.trim() === local; } catch (e){ return false; }
	  } },
	{ id: "s_n9_config_get", m: "sceaux", titre: "Sceaux : lire un seul réglage, sans dérouler tous les anneaux (git config --get user.name)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "config" && (aGitCh9(a, "--get") || aGitCh9(a, "--get-all")) && s.trim().length > 0; } },
	{ id: "s_n9_pull_rebase", m: "sceaux", titre: "Sceaux : tirer sans nouer l'histoire, par défaut (git config --global pull.rebase true)",
	  monde: function(){ return /^true$/i.test(valeurIniCh9(gitconfigGlobalCh9(), "pull", "rebase") || ""); } },
	{ id: "s_n9_init_bare", m: "sceaux", titre: "Sceaux : un grimoire sans atelier, comme ceux des Royaumes (git init --bare)",
	  evenement: "git", quand: function(e){ return e.cmd === "init" && e.ok !== false && e.nu === true && !e.reinit; } },
	// L'Autel des Offrandes (Bénédicte)
	{ id: "s_n9_diff_staged", m: "autel", titre: "Autel : ce qui est posé sur l'autel, et seulement ça (git diff --staged)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "diff" && (aGitCh9(a, "--staged") || aGitCh9(a, "--cached")) && /^diff --git/m.test(s); } },
	{ id: "s_n9_check_ignore", m: "autel", titre: "Autel : demander au voile pourquoi il cache un fichier (git check-ignore -v)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "check-ignore" && /-v|--verbose/.test(argsTexteCh9(a)) && /gitignore:\d+:/.test(s); } },
	{ id: "s_n9_mv", m: "autel", titre: "Autel : renommer un fichier scellé, et que Git le sache (git mv)",
	  evenement: "git", quand: function(e){ return e.cmd === "mv" && e.ok !== false; } },
	{ id: "s_n9_add_u", m: "autel", titre: "Autel : reposer d'un geste tout ce qui est déjà suivi, et rien de neuf (git add -u)",
	  evenement: "git", quand: function(e){ return e.cmd === "add" && e.ok !== false && (e.args || []).some(function(x){ return x === "--update" || /^-[a-zA-Z]*u[a-zA-Z]*$/.test(x); }) && (e.chemins || []).length > 0; } },
	{ id: "s_n9_conventionnel", m: "autel", titre: "Autel : un message conventionnel, que les outils savent lire (git commit -m \"feat: ...\", fix:, docs:...)",
	  evenement: "git", quand: function(e){ return e.cmd === "commit" && e.ok !== false && !!e.hash && MESSAGE_CONVENTIONNEL_CH9.test(String(e.message || "")); } },
	{ id: "s_n9_gitattributes", m: "autel", titre: "Autel : dire à Git comment traiter chaque offrande (un .gitattributes scellé, puis git check-attr)",
	  appel: function(n, a, s){
		if (n !== "git" || sousGitCh9(a) !== "check-attr" || !s.split("\n").some(function(l){ return /: [^:\s]+: (?!unspecified$)\S+$/.test(l); })) return false;
		return G9.essai(function(){ var R = gTrouverDepot(current_room), t = gTete(R); return !!t && Object.keys(gAplatir(R, gCommit(R, t).arbre)).some(function(p){ return /(^|\/)\.gitattributes$/.test(p); }); }, false);
	  } },
	// La Crypte des Runes (Andrii)
	{ id: "s_n9_ls_tree", m: "runes", titre: "Runes : l'arbre entier d'un sceau (git ls-tree -r HEAD)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "ls-tree" && /-r/.test(argsTexteCh9(a)) && /\bblob [0-9a-f]{40}/.test(s); } },
	{ id: "s_n9_rev_parse", m: "runes", titre: "Runes : le nom complet de HEAD, quarante signes (git rev-parse HEAD)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "rev-parse" && /^[0-9a-f]{40}$/m.test(s.trim()); } },
	{ id: "s_n9_count_objects", m: "runes", titre: "Runes : compter les pierres de la crypte (git count-objects -v)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "count-objects" && /count: \d+/.test(s); } },
	{ id: "s_n9_cat_file_s", m: "runes", titre: "Runes : le poids d'une pierre, en octets (git cat-file -s HEAD:grimoire.md)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "cat-file" && a.indexOf("-s") > -1 && /^\d+$/.test(s.trim()); } },
	{ id: "s_n9_ls_files_s", m: "runes", titre: "Runes : l'autel vu d'en dessous, chaque fichier avec sa rune (git ls-files -s)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "ls-files" && (aGitCh9(a, "-s") || aGitCh9(a, "--stage")) && /^\d{6} [0-9a-f]{40} \d\t/m.test(s); } },
	{ id: "s_n9_show_ref", m: "runes", titre: "Runes : tous les noms gravés, et la rune que chacun désigne (git show-ref)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "show-ref" && /^[0-9a-f]{40} refs\//m.test(s); } },
	// L'Oracle (Irvan)
	{ id: "s_n9_log_format", m: "oracle", titre: "Oracle : un log à ta façon (git log --format='%h %an %s')",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && /--(format|pretty)=/.test(argsTexteCh9(a)) && /%an|%ae|%h|%s/.test(argsTexteCh9(a)) && s.trim().length > 0; } },
	{ id: "s_n9_log_grep", m: "oracle", titre: "Oracle : chercher dans les messages des sceaux (git log --grep)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && /--grep/.test(argsTexteCh9(a)) && s.trim().length > 0; } },
	{ id: "s_n9_log_stat", m: "oracle", titre: "Oracle : ce que chaque sceau a touché (git log --stat)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && /--stat/.test(argsTexteCh9(a)) && /changed/.test(s); } },
	{ id: "s_n9_log_L", m: "oracle", titre: "Oracle : l'histoire d'une seule ligne, et rien d'autre (git log -L 12,12:lois.md)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && a.some(function(x){ return /^-L/.test(x); }) && /^@@ -\d+,\d+ \+\d+,\d+ @@/m.test(s) && /^(commit )?[0-9a-f]{7,40}\b/m.test(s); } },
	{ id: "s_n9_log_since", m: "oracle", titre: "Oracle : les sceaux d'une période (git log --since=2026-09-25 --until=2026-09-28)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && ["--since", "--after", "--until", "--before"].some(function(o){ return aGitCh9(a, o); }) && s.trim().length > 0; } },
	{ id: "s_n9_log_follow", m: "oracle", titre: "Oracle : l'histoire d'un fichier, même d'avant son nouveau nom (git log --follow)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && aGitCh9(a, "--follow") && (s.match(/^(commit )?[0-9a-f]{7,40}\b/mg) || []).length >= 2; } },
	// La Salle des Contre-sorts (Georgette)
	{ id: "s_n9_restore_source", m: "contresorts", titre: "Contre-sorts : rendre à un fichier une version plus ancienne (git restore --source=HEAD~1)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "restore" && /--source[= ]/.test(argsTexteCh9(a)); } },
	{ id: "s_n9_amend_no_edit", m: "contresorts", titre: "Contre-sorts : glisser un oubli dans le dernier sceau, sans changer son message (git commit --amend --no-edit)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "commit" && aGitCh9(a, "--amend") && aGitCh9(a, "--no-edit"); } },
	{ id: "s_n9_revert_no_commit", m: "contresorts", titre: "Contre-sorts : préparer un contre-sort sans le sceller tout de suite (git revert --no-commit)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "revert" && (aGitCh9(a, "--no-commit") || aGitCh9(a, "-n")); } },
	{ id: "s_n9_restore_p", m: "contresorts", titre: "Contre-sorts : défaire un morceau d'un fichier, pas tout le fichier (git restore -p)",
	  evenement: "git", quand: function(e){ return e.cmd === "restore" && e.ok !== false && e.patch === true && (e.jetes || 0) > 0; } },
	{ id: "s_n9_reset_author", m: "contresorts", titre: "Contre-sorts : rendre ton nom au dernier sceau (git commit --amend --reset-author --no-edit)",
	  evenement: "git", quand: function(e){ return e.cmd === "commit" && e.ok !== false && e.amend === true && (e.args || []).indexOf("--reset-author") > -1 && !!e.hash; } },
	{ id: "s_n9_revert_fusion", m: "contresorts", titre: "Contre-sorts : défaire une fusion déjà publiée, sans réécrire (git revert -m 1)",
	  evenement: "git", quand: function(e){ return e.cmd === "revert" && e.ok !== false && !!e.mainline && (e.nouveaux || []).length > 0; } },
	// Le Livre des Ombres (William)
	{ id: "s_n9_show_reflog", m: "ombres", titre: "Ombres : regarder où était HEAD il y a deux pas (git show HEAD@{2})",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "show" && /@\{\d+\}/.test(argsTexteCh9(a)) && /^commit [0-9a-f]{40}/m.test(s); } },
	{ id: "s_n9_reflog_branche", m: "ombres", titre: "Ombres : le reflog d'une seule ligne du destin (git reflog show main)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "reflog" && a.filter(function(x){ return x.charAt(0) !== "-"; }).length >= 2 && /@\{\d+\}/.test(s); } },
	{ id: "s_n9_orig_head", m: "ombres", titre: "Ombres : la position d'avant le dernier grand saut (ORIG_HEAD)",
	  appel: function(n, a, s){ return n === "git" && /ORIG_HEAD/.test(argsTexteCh9(a)) && s.trim().length > 0; } },
	{ id: "s_n9_log_g", m: "ombres", titre: "Ombres : le Livre, lu comme un journal de sceaux (git log -g)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && (aGitCh9(a, "-g") || aGitCh9(a, "--walk-reflogs")) && /@\{\d+\}/.test(s); } },
	{ id: "s_n9_reflog_date", m: "ombres", titre: "Ombres : quand HEAD a bougé, à la minute près (git reflog --date=iso)",
	  appel: function(n, a, s){ return n === "git" && (sousGitCh9(a) === "reflog" || sousGitCh9(a) === "log") && /--date/.test(argsTexteCh9(a)) && /@\{\d{4}-\d\d-\d\d/.test(s); } },
	{ id: "s_n9_stash_retrouve", m: "ombres", titre: "Ombres : une besace jetée par erreur, rendue par son hash (git stash drop, puis git stash apply HASH)",
	  evenement: "git", quand: function(e){ return e.cmd === "stash" && e.ok !== false && e.horsListe === true && !(e.conflits || []).length; } },
	// Les Lignes du Destin (Marc)
	{ id: "s_n9_branch_m", m: "lignes", titre: "Lignes : renommer une ligne du destin (git branch -m)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "branch" && (aGitCh9(a, "-m") || aGitCh9(a, "-M") || aGitCh9(a, "--move")); } },
	{ id: "s_n9_branch_merged", m: "lignes", titre: "Lignes : celles qui sont déjà réunies (git branch --merged)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "branch" && aGitCh9(a, "--merged") && s.trim().length > 0; } },
	{ id: "s_n9_switch_moins", m: "lignes", titre: "Lignes : revenir à la ligne d'avant (git switch -)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "switch" && a.indexOf("-") > -1; } },
	{ id: "s_n9_branch_d", m: "lignes", titre: "Lignes : effacer une ligne déjà réunie, sans rien risquer (git branch -d)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "branch" && (aGitCh9(a, "-d") || aGitCh9(a, "--delete")) && !aGitCh9(a, "-D") && /^Deleted branch /m.test(s); } },
	{ id: "s_n9_branch_contains", m: "lignes", titre: "Lignes : les lignes qui portent un sceau donné (git branch --contains)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "branch" && aGitCh9(a, "--contains") && s.trim().length > 0; } },
	{ id: "s_n9_merge_squash", m: "lignes", titre: "Lignes : réunir toute une ligne en un seul sceau (git merge --squash, puis git commit)",
	  evenement: "git", quand: function(e){ return e.cmd === "merge" && e.ok !== false && e.mode === "squash"; } },
	// La Salle des Paradoxes (Kenyonn)
	{ id: "s_n9_merge_abort", m: "paradoxes", titre: "Paradoxes : fuir un paradoxe, et revenir comme avant (git merge --abort)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "merge" && aGitCh9(a, "--abort"); } },
	{ id: "s_n9_conflict_style", m: "paradoxes", titre: "Paradoxes : voir aussi l'ancêtre commun dans les marqueurs (merge.conflictStyle zdiff3)",
	  monde: function(){ return /zdiff3|diff3/.test(valeurIniCh9(gitconfigGlobalCh9(), "merge", "conflictStyle") || ""); } },
	{ id: "s_n9_status_conflit", m: "paradoxes", titre: "Paradoxes : lire un paradoxe dans git status (both modified)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "status" && /both modified|Unmerged paths|^UU /m.test(s); } },
	{ id: "s_n9_ls_files_u", m: "paradoxes", titre: "Paradoxes : les trois versions d'un paradoxe, l'ancêtre, la tienne, l'autre (git ls-files -u)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "ls-files" && (aGitCh9(a, "-u") || aGitCh9(a, "--unmerged")) && /^\d{6} [0-9a-f]{40} [123]\t/m.test(s); } },
	{ id: "s_n9_ours_theirs", m: "paradoxes", titre: "Paradoxes : prendre d'un geste la version d'un côté, pendant le paradoxe (git checkout --theirs, ou --ours)",
	  evenement: "git", quand: function(e){ return (e.cmd === "checkout" || e.cmd === "restore") && e.ok !== false && (e.paradoxes || []).length > 0; } },
	{ id: "s_n9_merge_x", m: "paradoxes", titre: "Paradoxes : trancher d'avance en faveur d'un côté (git merge -X ours, ou -X theirs)",
	  evenement: "git", quand: function(e){ return e.cmd === "merge" && e.ok !== false && !!e.faveur && e.mode === "3voies" && !!e.hash; } },
	// La Besace et les Reliques (Anthony)
	{ id: "s_n9_stash_list", m: "besace", titre: "Besace : ce qui dort dans la besace (git stash list)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "stash" && a.indexOf("list") > -1 && /stash@\{\d+\}/.test(s); } },
	{ id: "s_n9_stash_show", m: "besace", titre: "Besace : regarder dans la besace sans la vider (git stash show -p)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "stash" && a.indexOf("show") > -1 && /^(diff --git|[ +-])/m.test(s); } },
	{ id: "s_n9_tag_l", m: "besace", titre: "Besace : tous les menhirs d'une forme (git tag -l \"v*\")",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "tag" && (aGitCh9(a, "-l") || aGitCh9(a, "--list")) && s.trim().length > 0; } },
	{ id: "s_n9_stash_branch", m: "besace", titre: "Besace : ouvrir une ligne neuve avec ce qui dort dans la besace (git stash branch)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "stash" && a.indexOf("branch") > -1 && /Switched to a new branch/.test(s); } },
	{ id: "s_n9_cherry_x", m: "besace", titre: "Besace : une relique qui dit d'où elle vient (git cherry-pick -x)",
	  evenement: "git", quand: function(e){ return e.cmd === "cherry-pick" && e.ok !== false && (e.args || []).indexOf("-x") > -1 && (e.nouveaux || []).length > 0; } },
	{ id: "s_n9_semver", m: "besace", titre: "Besace : un menhir de version sémantique, MAJEUR.MINEUR.CORRECTIF (git tag -a v1.1.0)",
	  monde: function(){ return G9.essai(function(){ var R = gitDepot(null, DEPOTS_CH9.besace); return !!R && gRefs(R, "refs/tags/").some(function(r){ var o = gObjet(R, r.hash); return /^v\d+\.\d+\.\d+$/.test(r.nom.substring(10)) && !!o && o.t === "tag"; }); }, false); } },
	// L'Atelier des Prophéties (Guillaume)
	{ id: "s_n9_rebase_abort", m: "propheties", titre: "Prophéties : renoncer à une réécriture en cours (git rebase --abort)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "rebase" && aGitCh9(a, "--abort"); } },
	{ id: "s_n9_fixup", m: "propheties", titre: "Prophéties : un sceau qui se fondra tout seul (git commit --fixup, puis rebase -i --autosquash)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "rebase" && aGitCh9(a, "--autosquash"); } },
	{ id: "s_n9_rebase_continue", m: "propheties", titre: "Prophéties : trancher un paradoxe au milieu d'une réécriture (git rebase --continue)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "rebase" && aGitCh9(a, "--continue"); } },
	{ id: "s_n9_rebase_onto", m: "propheties", titre: "Prophéties : transplanter une ligne sur une autre base (git rebase --onto NOUVELLE ANCIENNE LIGNE)",
	  evenement: "git", quand: function(e){ return e.cmd === "rebase" && e.ok !== false && e.etat === "fini" && aGitCh9(e.args, "--onto"); } },
	{ id: "s_n9_rebase_exec", m: "propheties", titre: "Prophéties : éprouver chaque sceau réécrit, un par un (git rebase -x \"COMMANDE\")",
	  evenement: "git", quand: function(e){ return e.cmd === "rebase" && e.ok !== false && e.etat === "fini" && (e.args || []).some(function(x){ return x === "-x" || x === "--exec" || /^--exec=/.test(x); }); } },
	{ id: "s_n9_rebase_edit", m: "propheties", titre: "Prophéties : s'arrêter sur un sceau pour le retoucher (git rebase -i, le mot edit)",
	  evenement: "git", quand: function(e){ return e.cmd === "rebase" && e.ok !== false && e.etat === "edit"; } },
	// La Salle des Cartes (Moustapha)
	{ id: "s_n9_branch_a", m: "cartes", titre: "Cartes : toutes les lignes, celles des Royaumes comprises (git branch -a)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "branch" && (aGitCh9(a, "-a") || aGitCh9(a, "--all")) && /remotes\//.test(s); } },
	{ id: "s_n9_log_deux_points", m: "cartes", titre: "Cartes : ce qu'une ligne a de plus qu'une autre (git log main..LIGNE)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && a.some(function(x){ return /^[^.\s]+\.\.[^.\s]+$/.test(x); }) && s.trim().length > 0; } },
	{ id: "s_n9_log_trois_points", m: "cartes", titre: "Cartes : ce que deux lignes ont chacune de leur côté (git log --left-right A...B)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && a.some(function(x){ return /^[^.\s]+\.\.\.[^.\s]+$/.test(x); }) && s.trim().length > 0; } },
	{ id: "s_n9_merge_base", m: "cartes", titre: "Cartes : le carrefour où deux routes se sont séparées (git merge-base A B)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "merge-base" && /^[0-9a-f]{40}$/m.test(s); } },
	{ id: "s_n9_first_parent", m: "cartes", titre: "Cartes : la grand-route seule, sans les chemins de traverse (git log --first-parent)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && aGitCh9(a, "--first-parent") && s.trim().length > 0; } },
	{ id: "s_n9_for_each_ref", m: "cartes", titre: "Cartes : les routes, de la plus fraîche à la plus oubliée (git for-each-ref --sort=-committerdate refs/heads)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "for-each-ref" && /--sort[= ]\S*date/.test(argsTexteCh9(a)) && s.trim().length > 0; } },
	// Les Portes des Royaumes (Jeremy)
	{ id: "s_n9_remote_show", m: "portes", titre: "Portes : tout ce que l'on sait d'un Royaume (git remote show origin)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "remote" && a.indexOf("show") > -1 && /Fetch URL|HEAD branch/.test(s); } },
	{ id: "s_n9_push_tags", m: "portes", titre: "Portes : envoyer un menhir aux Royaumes (git push origin TAG, ou --tags)",
	  monde: function(){ var t = G9.essai(function(){ return gitTags(ROYAUME_CH9, DEPOT_ROYAUME_CH9); }, null); var n = !t ? 0 : (Array.isArray(t) ? t.length : Object.keys(t).length); return n > 1; } },
	{ id: "s_n9_fetch_prune", m: "portes", titre: "Portes : oublier les lignes que le Royaume a effacées (git fetch --prune)",
	  appel: function(n, a){ return n === "git" && sousGitCh9(a) === "fetch" && (aGitCh9(a, "--prune") || aGitCh9(a, "-p")); } },
	{ id: "s_n9_remote_add", m: "portes", titre: "Portes : ouvrir une porte vers un second Royaume (git remote add NOM URL)",
	  evenement: "git", quand: function(e){ return e.cmd === "remote" && e.ok !== false && e.action === "add" && !!e.nom; } },
	{ id: "s_n9_ls_remote", m: "portes", titre: "Portes : ce que porte un Royaume, sans rien en rapporter (git ls-remote)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "ls-remote" && /^[0-9a-f]{40}\t(HEAD|refs\/)/m.test(s); } },
	{ id: "s_n9_push_delete", m: "portes", titre: "Portes : effacer une ligne dans un Royaume (git push origin --delete LIGNE)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "push" && / - \[deleted\]/.test(s); } },
	// Les Runes de Garde (Aurélien)
	{ id: "s_n9_commit_msg", m: "garde", titre: "Garde : une rune sur les messages (un hook commit-msg qui refuse un message trop court)",
	  monde: function(){ var t = texteIleCh9(DEPOTS_CH9.chronique + "/.git/hooks/commit-msg") || ""; return /exit 1/.test(t); } },
	{ id: "s_n9_verify_commit", m: "garde", titre: "Garde : vérifier la cire d'un seul sceau (git verify-commit)",
	  evenement: "git", quand: function(e){ return e.cmd === "verify-commit" && !!e.signature && e.signature !== "aucune"; } },
	{ id: "s_n9_sans_cire", m: "garde", titre: "Garde : repérer d'un coup d'œil les sceaux sans cire (git log --format='%h %G? %s' : N pour aucune cire, G pour une bonne)",
	  appel: function(n, a, s){ return n === "git" && sousGitCh9(a) === "log" && /%G\?/.test(argsTexteCh9(a)) && /(^|\s)N(\s|$)/m.test(s) && /(^|\s)[GU](\s|$)/m.test(s); } },
	{ id: "s_n9_pre_push", m: "garde", titre: "Garde : une rune avant chaque envoi (un hook pre-push qui refuse d'envoyer une ligne wip)",
	  evenement: "git", quand: function(e){ return e.cmd === "push" && e.hookRefus === "pre-push"; } },
	{ id: "s_n9_tag_signe", m: "garde", titre: "Garde : un menhir scellé de ta cire (git tag -s v1.0.0 -m \"...\")",
	  evenement: "git", quand: function(e){ return e.cmd === "tag" && e.ok !== false && e.signe === true && !!e.tag; } },
	{ id: "s_n9_verify_tag", m: "garde", titre: "Garde : vérifier la cire d'un menhir (git verify-tag)",
	  evenement: "git", quand: function(e){ return e.cmd === "verify-tag" && e.signature === "bonne"; } },
	// Le Haut-Conseil (Amine)
	{ id: "s_n9_pr_view", m: "conseil", titre: "Conseil : lire une requête en entier (gh pr view N)",
	  appel: function(n, a, s){ return n === "gh" && a[0] === "pr" && a[1] === "view" && s.trim().length > 0; } },
	{ id: "s_n9_pr_comment", m: "conseil", titre: "Conseil : parler au Conseil sans juger (gh pr comment N -b)",
	  appel: function(n, a){ return n === "gh" && a[0] === "pr" && a[1] === "comment"; } },
	{ id: "s_n9_run_list", m: "conseil", titre: "Conseil : le registre des golems (gh run list)",
	  appel: function(n, a, s){ return n === "gh" && a[0] === "run" && a[1] === "list" && s.trim().length > 0; } },
	{ id: "s_n9_pr_checkout", m: "conseil", titre: "Conseil : essayer chez toi la requête d'un autre (gh pr checkout N)",
	  appel: function(n, a, s){ return n === "gh" && a[0] === "pr" && a[1] === "checkout" && /Switched to|Already on/.test(s); } },
	{ id: "s_n9_codeowners", m: "conseil", titre: "Conseil : nommer les gardiens de chaque page (un fichier CODEOWNERS, poussé sur une ligne)",
	  monde: function(){ return G9.essai(function(){ var D = gitDepot(ROYAUME_CH9, DEPOT_ROYAUME_CH9); return !!D && gRefs(D, "refs/heads/").some(function(r){ return r.nom !== "refs/heads/main" && codeownersCh9(D, r.hash); }); }, false); } },
	{ id: "s_n9_pr_a_jour", m: "conseil", titre: "Conseil : remettre à jour une requête en conflit avec main (fusionner main dans sa ligne, trancher, pousser)",
	  monde: function(){ return requeteRemiseAJourCh9(); } },
	// Les défis d'honneur de Laurent
	{ id: "s_n9_sans_indice", m: "honneur", titre: "Honneur : finir la Chronique sans acheter un seul indice" },
	{ id: "s_n9_scribe_j1", m: "honneur", titre: "Honneur : Scribe avant la première nuit (avant J1 22:00)" },
	{ id: "s_n9_gardien_j2", m: "honneur", titre: "Honneur : Gardien du Temps avant la fin du deuxième jour (avant J2 22:00)" },
	{ id: "s_n9_avant_aube", m: "honneur", titre: "Honneur : la bataille gagnée avant l'aube du quatrième jour" },
	{ id: "s_n9_empreinte", m: "honneur", titre: "Après la victoire : consigner dans le rapport que l'empreinte du Faussaire est celle de la clé du Bastion",
	  monde: function(){ var t = sansAccentCh9(rapportCh9() || ""); return state.has("victoireCh9") && t.indexOf(sansAccentCh9(signatureBastionPort())) > -1 && /bastion/.test(t); } }
];
DEFIS_CH9.forEach(function(d){ QUETES_SECONDAIRES_CH9.push({ id: d.id, titre: d.titre }); });
function defisSalleCh9(cle){ return DEFIS_CH9.filter(function(d){ return d.m === cle; }); }
function idsDefisSalleCh9(cle){ return defisSalleCh9(cle).map(function(d){ return d.id; }); }
function listeDefisSalleCh9(cle){
	return defisSalleCh9(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}
function chronothequeActive(){ return chroniqueOuverte() && !!(state.quests && state.quests["n9_entree"]); }
function reussirDefiCh9(id){
	if (!chronothequeActive() || state.quests[id]) return;
	state.complete(id);
}
var APPELER_AVANT_DEFIS_CH9 = Shell.appeler;
function essayerDefisCh9(nom, args, s, io){
	if (!chronothequeActive() || (nom !== "git" && nom !== "gh")) return;
	// Un sort qui échoue ne prouve rien : « fatal: No rebase in progress? » n'est pas un rebase abandonné.
	if (/^(fatal|error|usage):/m.test(sansAnsi(String(s || "")))) return;
	try {
		DEFIS_CH9.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args || [], s, io || {})) reussirDefiCh9(d.id); });
	} catch (e){ /* un défi ne doit jamais casser un sort */ }
}
Shell.appeler = function(nom, args, io){
	var sortie;
	try { sortie = APPELER_AVANT_DEFIS_CH9.apply(this, arguments); }
	catch (err){
		if (err instanceof ShellError) essayerDefisCh9(nom, args, sansAnsi(String(err.message || "")), io);
		throw err;
	}
	essayerDefisCh9(nom, args, typeof sortie === "string" ? sansAnsi(sortie) : "", io);
	return sortie;
};
(function(){
	var types = {};
	DEFIS_CH9.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!chronothequeActive()) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiCh9(d.id); } catch (x){} });
		});
	});
})();

/* ------------------------------------------------------------------ */
/* Les quatorze maîtres du temps, vivants                               */
/* ------------------------------------------------------------------ */

var NOMS_RANGS_PLURIEL_CH9 = ["Apprentis du Temps", "Scribes", "Archivistes", "Chroniqueurs", "Gardiens du Temps", "Chronomanciens"];
function rangRequisCh9(s){ return Math.max(0, s.acte - 1); }
function texteMaitreCh9(g){
	var s = salleCh9Par(g.s);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouhÉ]/.test(g.nom) ? "d'" : "de ") + g.nom) + C.gris(" (des quêtes secondaires)") + "\n" + listeDefisSalleCh9(g.s);
	var rappel = rappelLaurentCh9(), mot = rappel ? "\n\n" + C.jaune(g.nom + " lève les yeux de son ouvrage. « " + rappel + " »") : "";
	// Un maître dont la salle est encore fermée n'enseigne pas son sort : le texte se calcule avant l'apprentissage,
	// et l'événement « read » qui suit lui rend sa liste (pour que l'aide sache toujours chez qui s'apprend gh).
	g.item.teaches = rangCh9() < rangRequisCh9(s) ? [] : sortsDuMaitreCh9(g);
	if (rangCh9() < rangRequisCh9(s)) return g.entree() + "\n\n" + C.jaune(g.nom + " regarde le sceau sur ta manche. « Cette salle s'ouvre aux " + NOMS_RANGS_PLURIEL_CH9[rangRequisCh9(s)] + ". Tu es " + nomRangCh9() + ". " +
		"Reviens avec ton sceau : sceaux te dira ce qu'il te manque. »") + mot;
	var faites = s.etapes.filter(aFait).length;
	if (faites === s.etapes.length) return g.fin() + defis;
	var erreur = null;
	try { erreur = g.erreur ? g.erreur() : null; } catch (x){ erreur = null; }
	var etapes = "\n\n" + C.gras("Ta salle") + "\n" + s.etapes.map(function(id){ var x = QUETES_CH9.filter(function(y){ return y.id === id; })[0]; return "  " + (aFait(id) ? C.vert("[x]") : "[ ]") + " " + x.titre.replace(/^[^:]+ : /, ""); }).join("\n");
	var corps = faites ? g.suite() + "\n\n" + g.syntaxe() : g.entree() + "\n\n" + g.image() + "\n\n" + g.syntaxe() + "\n\n" + g.mission();
	return corps + etapes + (erreur ? "\n\n" + C.jaune(erreur) : "") + mot + "\n\n" + C.gris(g.metier) + defis;
}

var MAITRES_CH9 = {
	sceaux: { nom: "Gamaliel", s: "sceaux",
		metier: "Le métier : Git signe chaque commit du nom et de l'adresse que tu lui donnes. En entreprise, c'est l'adresse de travail : c'est elle qui relie tes commits à ton compte sur la forge.",
		entree: function(){ return "Un homme aux mains tachées de cire rouge souffle sur un sceau encore tiède. Il lève les yeux, et sourit sans se presser. « Gamaliel. Je fabrique les sceaux de la Chronothèque depuis avant ta naissance. Tu n'as jamais scellé ? Tant mieux. Tu n'as rien à désapprendre. »"; },
		image: function(){ return "« Vois ces trois anneaux au mur. Le plus large, c'est la machine entière (--system, /etc/gitconfig). Celui du milieu, c'est toi, partout où tu vas (--global, ton ~/.gitconfig). Le plus étroit, c'est un seul grimoire (--local, son .git/config). " +
			"Quand deux anneaux disent des choses différentes, c'est le plus étroit qui gagne : le plus précis l'emporte.\n\n" +
			"Et un grimoire, ici, c'est un dépôt. Git n'y ajoute qu'une seule chose : un dossier caché, .git. Tout ce qui fait la mémoire du grimoire vit dedans. " +
			"Dedans, un fichier tout simple, HEAD, dit sur quelle ligne du destin tu te tiens. C'est l'œil du voyageur. »"; },
		syntaxe: function(){ return "« Les sorts de ma salle :\n\n" +
			"  git config --global user.name \"Ton Nom\"         ton nom, sur chaque sceau\n" +
			"  git config --global user.email \"toi@chronique.lan\"\n" +
			"  git config --global init.defaultBranch main      la ligne principale s'appelle main\n" +
			"  git config --list --show-origin                  qui a dit quoi, et dans quel fichier\n" +
			"  git init                                         faire d'un dossier un grimoire (un dépôt)\n" +
			"  ls -a ; cat .git/HEAD ; git status               ce que init a posé, et où tu te tiens\n" +
			"  git config --get user.name                       un seul réglage, celui qui gagne\n" +
			"  git config --global pull.rebase true             tirer en se remettant au bout, sans nœud\n" +
			"  git init --bare DOSSIER.git                      un grimoire sans atelier (celui d'un Royaume)\n\n" +
			"Je t'enseigne git : la plume du temps. Tous les maîtres de la Chronothèque en parlent une langue. »"; },
		mission: function(){ return "« Ta mission : nomme-toi, à l'anneau du milieu (--global), et choisis main pour ta ligne principale. Regarde ensuite qui dit quoi : --list --show-origin. " +
			"Puis va dans ~/chronotheque/premier-sceau, fais-en un grimoire, et regarde ce qui est apparu. »"; },
		suite: function(){ return "Gamaliel hoche la tête sans lever les yeux de sa cire. « Tu as ton nom. Continue : premier-sceau, git init, et regarde .git/HEAD de tes propres yeux. »"; },
		erreur: function(){
			var t = gitconfigGlobalCh9();
			if (!aFait("n9_config") && valeurIniCh9(t, "user", "name") && !valeurIniCh9(t, "init", "defaultBranch")) return "Gamaliel tapote l'anneau du milieu. « Ton nom y est. Mais ta ligne principale n'a pas de nom : init.defaultBranch main. »";
			if (!aFait("n9_init") && G9.depot(DEPOTS_CH9.premier) && !vuCh9("catHead")) return "Gamaliel pose un doigt sur le dossier .git. « Le grimoire est ouvert. Regarde ce que dit HEAD : cat .git/HEAD. »";
			return null;
		},
		fin: function(){ return "Gamaliel presse un dernier sceau, à ton nom cette fois. « Tu sais te nommer, et ouvrir un grimoire.\n\n" +
			"Un jour, un stagiaire a commité six mois sur son poste avec l'adresse root@localhost. Le jour de son départ, la forge n'a rattaché aucun de ses commits à son compte : " +
			"des centaines de sceaux anonymes, impossibles à relier à une personne, à une revue, à une décision. Trois lignes de configuration l'auraient évité. »"; }
	},
	autel: { nom: "Bénédicte", s: "autel",
		metier: "Le métier : un commit atomique fait une seule chose, avec un message qui dit pourquoi. Et un secret commité une seule fois est compromis : on le change, on ne se contente pas de l'effacer.",
		entree: function(){ return "Une femme en tablier blanc aligne des cierges sur une longue table de marbre. Elle en retire un, d'un geste sec. « Bénédicte. Sur mon autel, on ne pose que ce qui mérite d'être scellé. Rien d'autre. Jamais. »"; },
		image: function(){ return "« Il y a trois endroits. Ton atelier, où tu travailles : la copie de travail. Mon autel, où tu poses ce que tu veux sceller : l'index, qu'on appelle aussi zone de préparation, ou staging. " +
			"Et la Chronique, où le sceau est gravé pour toujours : le dépôt.\n\n" +
			"git add pose sur l'autel. git commit scelle tout ce qui est sur l'autel, et seulement ça. Entre les deux, tu regardes : git status, toujours.\n\n" +
			"Et ce voile, là-bas, c'est .gitignore : ce qui est derrière, Git ne le voit plus. Mais attention : le voile ne cache que ce que Git ne suit pas encore. " +
			"Ce qui est déjà posé sur l'autel, on l'en retire avec git rm --cached : le fichier reste dans l'atelier, mais Git l'oublie. »"; },
		syntaxe: function(){ return "« Les sorts de l'autel :\n\n" +
			"  git status ; git status -s             l'état des trois zones (-s : en deux colonnes, l'autel à gauche, l'atelier à droite)\n" +
			"  git add FICHIER ; git add .            poser sur l'autel\n" +
			"  git commit -m \"autel: dit pourquoi\"    sceller l'autel\n" +
			"  git log --oneline                      les sceaux, un par ligne\n" +
			"  .gitignore                             un motif par ligne : .env, __pycache__/, *.log\n" +
			"  git rm --cached FICHIER (-r DOSSIER)   retirer de l'autel sans effacer du disque\n" +
			"  git add -p FICHIER                     poser morceau par morceau : y oui, n non, q fini, s couper\n" +
			"  git add -u                             reposer tout ce qui est suivi et modifié, rien de neuf\n" +
			"  git commit -m \"feat: ...\"              un message conventionnel : feat, fix, docs, refactor, test, chore\n" +
			"  .gitattributes ; git check-attr -a F   comment traiter chaque fichier : *.sh text eol=lf, *.png binary\n\n" +
			"Un sceau, une raison. Deux raisons, deux sceaux. »"; },
		mission: function(){ return "« Trois choses. D'abord, dans ~/chronotheque/premier-sceau, tes deux premiers sceaux : regarde l'état avec git status -s, puis les sceaux avec git log --oneline. " +
			"Ensuite, dans ~/chronotheque/autel : un .env avec des mots de passe, des journaux, et un dossier __pycache__ que quelqu'un a scellé par erreur. Pose le voile, et retire __pycache__ de l'autel. " +
			"Enfin, autel.py porte deux changements sans rapport : un dans allumer_cierge, un dans eteindre_cierge. Deux sceaux. git add -p. »"; },
		suite: function(){ return "Bénédicte rallume un cierge. « Bien. Rappelle-toi : git status avant, git status après. Et un sceau ne mélange jamais deux raisons. »"; },
		erreur: function(){
			var ch = DEPOTS_CH9.autel;
			if (!aFait("n9_voile") && G9.fichier(ch, "HEAD", ".env") !== null) return "Bénédicte pâlit. « Tu as scellé le .env. Le mot de passe est dans la Chronique, maintenant. Dans la vraie vie, on le change tout de suite. Ici : git rm --cached .env, le voile, et un nouveau sceau. »";
			if (!aFait("n9_voile") && /__pycache__/.test(texteIleCh9(ch + "/.gitignore") || "") && G9.fichier(ch, "HEAD", "__pycache__/autel.cpython-312.pyc") !== null) return "Bénédicte montre le voile. « Ton voile cache __pycache__, mais Git le suit déjà : le voile ne cache que ce que Git ne suit pas. git rm -r --cached __pycache__. »";
			return null;
		},
		fin: function(){ return "Bénédicte souffle les cierges un à un. « Ton autel est propre.\n\n" +
			"Un jour, une équipe a poussé sur une forge publique un fichier .env, « juste pour tester ». Quatre minutes plus tard, un robot qui fouille les dépôts publics avait trouvé la clé de leur fournisseur de serveurs. " +
			"Le soir même, cent machines minaient de la monnaie à leurs frais. Le .env avait été effacé au commit suivant : trop tard, il était dans l'historique. »"; }
	},
	runes: { nom: "Andrii", s: "runes",
		metier: "Le métier : un hash identifie un contenu. Deux fichiers identiques ont le même blob, partout dans le monde ; changer un seul octet d'un commit ancien change le hash de tous ceux qui suivent. C'est ce qui rend une histoire Git infalsifiable sans que ça se voie.",
		entree: function(){ return "Dans la pénombre de la crypte, un homme trace du doigt une rune gravée dans la pierre. « Andrii. Tout le monde s'arrête aux sceaux. Moi, je descends dessous. Viens. »"; },
		image: function(){ return "« Sous la Chronique, il n'y a que quatre sortes de pierres. Le blob : un contenu, rien d'autre, même pas son nom. L'arbre (tree) : un dossier, qui donne des noms aux blobs et aux autres arbres. " +
			"Le sceau (commit) : un arbre, un ou plusieurs parents, un auteur, une date, un message. Et le menhir annoté (tag).\n\n" +
			"Chaque pierre porte une rune de quarante signes : son hash, calculé sur son contenu. Change un seul mot d'un sceau ancien, et sa rune change, et celle de son enfant, et de tous les suivants. " +
			"C'est pour ça qu'on ne peut pas réécrire la Chronique en silence. On peut la réécrire, oui. Mais ça se voit. »"; },
		syntaxe: function(){ return "« Les sorts de la crypte :\n\n" +
			"  git cat-file -t HASH        la sorte de la pierre : blob, tree, commit, tag\n" +
			"  git cat-file -p HASH        son contenu\n" +
			"  git cat-file -p HEAD        le sceau où tu te tiens : son arbre, son parent, son scribe\n" +
			"  git cat-file -p HEAD^{tree} l'arbre de ce sceau : des blobs et des arbres, avec leurs runes\n" +
			"  git hash-object FICHIER     la rune qu'aurait ce fichier, s'il devenait un blob\n" +
			"  git cat-file -s REV:F       le poids d'une pierre, en octets\n" +
			"  git ls-files -s             l'autel vu d'en dessous : mode, rune, étage, nom\n" +
			"  git show-ref                tous les noms (branches, tags) et la rune de chacun\n" +
			"  ls .git/objects             là où dorment les pierres (les deux premiers signes de la rune font le dossier) »"; },
		mission: function(){ return "« Dans un de tes grimoires (premier-sceau, par exemple) : demande la sorte d'un sceau, puis ouvre trois pierres avec -p : un sceau, son arbre, et un blob de cet arbre. Et calcule la rune d'un fichier avec hash-object : compare-la à celle de l'arbre. »"; },
		suite: function(){ return "Andrii pose ta main sur une rune. « Tu la sens ? Quarante signes. Descends encore : un sceau, son arbre, un blob. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Andrii remonte de la crypte avec toi. « Tu sais lire sous les sceaux.\n\n" +
			"Un jour, une forge a vu arriver deux fichiers différents avec la même empreinte SHA-1 : une collision fabriquée, pour la première fois. " +
			"Git a aussitôt durci son calcul pour détecter ces collisions, et prépare depuis des années le passage à SHA-256. Une empreinte n'est sûre que tant qu'on ne sait pas en fabriquer deux pareilles. »"; }
	},
	oracle: { nom: "Irvan", s: "oracle",
		metier: "Le métier : git log -S, git blame et git show suffisent à reconstituer pourquoi une ligne existe, en remontant au commit, à son message et à sa Pull Request. On enquête dans l'historique avant de modifier du code qu'on ne comprend pas.",
		entree: function(){ return "Un homme encapuchonné se penche au-dessus d'une vasque d'eau noire. Des lettres remontent à la surface, puis se dissolvent. « Irvan. L'Oracle ne répond qu'à ceux qui savent demander. Demande mal, et il te noiera sous cinquante sceaux. »"; },
		image: function(){ return "« L'Oracle, c'est git log. Sans rien, il te récite tout, du plus récent au plus ancien. Mais on peut lui demander mieux : une ligne par sceau (--oneline), le dessin des lignes du destin (--graph --all), " +
			"les sceaux d'un seul scribe (--author), ceux dont le message parle de quelque chose (--grep), et surtout ceux qui ont fait entrer ou sortir un mot précis (-S). " +
			"Et contre le mur, le Miroir des aveux : git blame. Montre-lui un fichier, il te dit pour chaque ligne quel sceau, quel scribe, quel jour. git show te montre un sceau, ou un fichier tel qu'il était (REV:FICHIER). git diff compare deux moments. »"; },
		syntaxe: function(){ return "« Les sorts de l'Oracle :\n\n" +
			"  git log --oneline --graph --all     toutes les lignes, dessinées\n" +
			"  git log -S \"texte\" --oneline        les sceaux qui ont ajouté ou retiré ce texte\n" +
			"  git log --author=Grace --oneline    les sceaux d'un scribe (| wc -l pour compter)\n" +
			"  git show HASH                       un sceau et son changement\n" +
			"  git show v-ete:carte.txt            un fichier tel qu'il était à ce menhir\n" +
			"  git blame -L 12,12 lois.md          qui a écrit la ligne 12\n" +
			"  git diff v-ete v-automne --stat     ce qui a changé entre deux moments\n" +
			"  git log -L 12,12:lois.md            l'histoire d'une seule ligne\n" +
			"  git log --since=DATE --until=DATE   les sceaux d'une période\n" +
			"  git log --follow FICHIER            un fichier, même d'avant son renommage »"; },
		mission: function(){ return "« Dans ~/chronotheque/annales, cinquante sceaux, et quelque part, une plume grise. Réponds aux quatre questions de REPONSES.md, sur la ligne « Réponse : ». " +
			"Mais je veux voir comment tu demandes : le graphe, -S, --author, puis blame, show REV:FICHIER, et un diff entre deux moments. »"; },
		suite: function(){ return "Irvan touche l'eau du bout du doigt. « L'Oracle t'a répondu une fois. Continue : REPONSES.md, et le Miroir des aveux (blame, show, diff). »"; },
		erreur: function(){
			var r = reponsesCh9();
			if (r[1] && !ETATS_CH9.n9_oracle() && !hashCiteCh9(r[1], HASH_CH9("annalesPg"))) return "Irvan secoue la tête. « Ta réponse 1 n'est pas le bon sceau. git log -S \"Porte d'Argent\" --oneline : le hash court, sept signes au moins. »";
			if (r[3] && !contientNombre(r[3], sCh9().nGraceAnnales, 0)) return "Irvan compte sur ses doigts. « Grace a scellé plus, ou moins. git log --author=Grace --oneline | wc -l. »";
			return null;
		},
		fin: function(){ return "Irvan rabat sa capuche. « L'Oracle te répondra toujours, maintenant.\n\n" +
			"Une équipe a perdu une semaine à corriger un bug « étrange » dans un calcul de TVA. Un git blame aurait montré en dix secondes la ligne, le commit, et son message : « contournement temporaire, voir ticket 4512 ». " +
			"Le ticket expliquait tout. Le code avait une histoire ; personne ne l'avait lue. »"; }
	},
	contresorts: { nom: "Georgette", s: "contresorts",
		metier: "Le métier : sur une branche partagée, on revert, on ne reset jamais. --amend et reset réécrivent l'histoire : seulement sur ce qui n'a pas encore été poussé.",
		entree: function(){ return "Une femme en blouse verte range des fioles sur une étagère, chacune étiquetée à la main. Derrière une grille, un grimoire rouge. « Georgette. Ici, on apprend à revenir en arrière. Pas en courant : en réfléchissant. »"; },
		image: function(){ return "« Il y a quatre façons de revenir en arrière, de la plus douce à la plus dangereuse.\n\n" +
			"restore rend à un fichier sa version scellée : ton atelier oublie ses bêtises. restore --staged retire un fichier de l'autel, sans toucher à l'atelier. " +
			"commit --amend refait le dernier sceau : un message mal écrit, un fichier oublié.\n\n" +
			"reset déplace la ligne du destin en arrière. --soft garde l'autel plein. --mixed vide l'autel mais garde l'atelier. --hard efface tout : c'est le sort interdit, derrière la grille. " +
			"Et revert, le contre-sort : il pose un NOUVEAU sceau qui défait un ancien. L'histoire ne bouge pas, elle s'allonge. C'est le seul qu'on lance sur ce qui est publié. »"; },
		syntaxe: function(){ return "« Les sorts de ma salle :\n\n" +
			"  git restore FICHIER                 l'atelier reprend la version scellée\n" +
			"  git restore --staged FICHIER        retirer de l'autel, sans rien perdre\n" +
			"  git commit --amend -m \"...\"         refaire le dernier sceau (jamais s'il est publié)\n" +
			"  git reset --soft HEAD~1             reculer d'un sceau, l'autel reste plein\n" +
			"  git reset --mixed HEAD~1            reculer, l'autel se vide, l'atelier reste\n" +
			"  git reset --hard HEAD~1             reculer, et tout effacer (le sort interdit)\n" +
			"  git revert --no-edit HASH           le contre-sort : un sceau qui défait HASH\n" +
			"  git restore -p FICHIER              défaire morceau par morceau (y défait, n garde)\n" +
			"  git commit --amend --reset-author --no-edit   le dernier sceau, à ton nom\n" +
			"  git revert -m 1 FUSION              défaire une fusion publiée (1 : la ligne où l'on a fusionné) »"; },
		mission: function(){ return "« Dans ~/chronotheque/contresorts, lis NOTE.txt : un fichier écrasé, un autre posé trop tôt sur l'autel, un sceau mal nommé, et une porte retirée qu'il faut rendre, sans réécrire l'histoire. " +
			"Et dans ~/chronotheque/experiences, lance les trois resets, l'un après l'autre, avec git status et git log entre chaque : vois de tes yeux ce que chacun garde. »"; },
		suite: function(){ return "Georgette te tend une fiole. « Un contre-sort à la fois. Et regarde git status après chacun. »"; },
		erreur: function(){
			var ch = DEPOTS_CH9.contresorts;
			if (!aFait("n9_annuler") && texteIleCh9(ch + "/grimoire.md") !== null && !/Une page en cours/.test(texteIleCh9(ch + "/grimoire.md") || "")) return "Georgette soupire. « Tu as perdu la page en cours de grimoire.md. --staged retire de l'autel ; sans --staged, restore efface l'atelier. regenerer contresorts, et recommence. »";
			return null;
		},
		fin: function(){ return "Georgette referme la grille du grimoire rouge. « Tu sais revenir en arrière, et quand ne pas le faire.\n\n" +
			"Un développeur a fait un reset --hard puis un push --force sur la branche principale de son équipe, pour « nettoyer ». Douze collègues avaient déjà tiré ces commits. " +
			"La journée s'est passée à reconstruire l'histoire à partir des copies de chacun. Un revert aurait pris dix secondes. »"; }
	},
	ombres: { nom: "William", s: "ombres",
		metier: "Le métier : le reflog est local et expire (90 jours par défaut). Il retrouve ce qui a été commité puis perdu, jamais ce qui n'a jamais été commité. C'est un filet, pas une sauvegarde.",
		entree: function(){ return "Dans le noir, une seule bougie éclaire un livre ouvert. Un homme maigre tourne les pages sans les regarder. « William. Ce livre se souvient de tout ce que HEAD a fait. Tout. Même ce que les autres ont oublié. »"; },
		image: function(){ return "« Chaque fois que HEAD bouge, un commit, un changement de ligne, un reset, une fusion, le Livre des Ombres écrit une ligne : d'où, vers où, pourquoi. C'est le reflog. " +
			"Une branche effacée ? Ce n'est qu'un nom perdu : les sceaux sont toujours là, dans la crypte, et le Livre sait où. Un reset --hard ? Le Livre se rappelle où tu étais juste avant.\n\n" +
			"HEAD@{0}, c'est maintenant. HEAD@{1}, le pas d'avant. HEAD@{5}, cinq pas en arrière. Tu peux t'en servir partout où Git attend un sceau. »"; },
		syntaxe: function(){ return "« Les sorts du Livre :\n\n" +
			"  git reflog                          tous les pas de HEAD, du plus récent au plus ancien\n" +
			"  git show HEAD@{3}                   le sceau où tu étais il y a trois pas\n" +
			"  git branch NOM HASH                 redonner un nom à un sceau perdu\n" +
			"  git reset --hard HEAD@{1}           revenir là où tu étais juste avant (le sort interdit, au service du Livre)\n" +
			"  git log -g ; git reflog --date=iso  le Livre lu comme un journal, et à quelle heure\n" +
			"  git stash apply HASH                une besace jetée (stash drop dit son hash ; fsck --unreachable aussi) »"; },
		mission: function(){ return "« Dans ~/chronotheque/livre-ombres, la ligne verite a été effacée cette nuit. Trois témoins y parlaient. Lis le Livre (git reflog), retrouve le sceau du troisième témoin, et rends-lui son nom : verite. »"; },
		suite: function(){ return "William tourne une page. « Le troisième témoin est dans le Livre. Cherche « checkout: moving from verite » : juste avant, il parlait encore. »"; },
		erreur: function(){
			var h = G9.resoudre(DEPOTS_CH9.ombres, "refs/heads/verite"), v = HASH_CH9("verite");
			if (h && v && h !== v) return "William pose la main sur la page. « Ta ligne verite existe, mais elle n'est pas sur le dernier témoin. git log --oneline verite : il en manque. git branch -f verite LE_BON_HASH. »";
			return null;
		},
		fin: function(){ return "William souffle la bougie. Dans le noir, le Livre continue d'écrire. « Rien n'est perdu tant qu'il s'en souvient.\n\n" +
			"Une étudiante a effacé par erreur la branche de son projet de fin d'année, la veille du rendu, avec trois semaines de travail. Elle a pleuré une heure. " +
			"Puis quelqu'un lui a montré git reflog. Deux minutes plus tard, tout était revenu. Elle a appris ce jour-là que Git n'oublie presque rien. Presque. »"; }
	},
	lignes: { nom: "Marc", s: "lignes",
		metier: "Le métier : créer une branche coûte 41 octets. On en crée une par changement, sans hésiter, et on la supprime une fois fusionnée.",
		entree: function(){ return "Sous un plafond d'étoiles, un homme tire sur des fils d'or qui se séparent et se rejoignent. « Marc. Tu vois ces fils ? Chacun est une ligne du destin. Et je vais te dire un secret que personne ne croit : un fil, ça ne pèse rien. »"; },
		image: function(){ return "« Une ligne du destin, une branche, ce n'est qu'un nom posé sur un sceau. Un fichier de quarante et un octets dans .git/refs/heads, qui contient une rune. Quand tu scelles, Git avance le nom sur le nouveau sceau. C'est tout.\n\n" +
			"HEAD, l'œil du voyageur, montre ta ligne. Si tu te poses sur un sceau sans ligne, c'est un HEAD détaché : tu erres hors du temps. Tu peux regarder ; si tu scelles là, tes sceaux n'appartiennent à aucune ligne.\n\n" +
			"Réunir deux lignes, c'est une confluence, une fusion (merge). Si ta ligne n'a pas bougé depuis le départ de l'autre, Git avance simplement le nom : fast-forward. " +
			"Si les deux ont avancé, il crée un sceau de fusion à deux parents : la fusion à trois voies. Et --no-ff force ce sceau, même quand avancer suffirait, pour garder la trace de la ligne. »"; },
		syntaxe: function(){ return "« Les sorts des lignes :\n\n" +
			"  cat .git/refs/heads/main            une ligne, c'est une rune dans un fichier\n" +
			"  git branch ; git branch -v          les lignes, et leur dernier sceau\n" +
			"  git switch -c NOM                   créer une ligne et y aller\n" +
			"  git switch --detach HEAD~1          se poser sur un sceau sans ligne\n" +
			"  git switch main                     revenir sur une ligne\n" +
			"  git merge NOM                       réunir NOM à ta ligne\n" +
			"  git merge --no-ff NOM               toujours un sceau de fusion\n" +
			"  git merge --squash NOM ; git commit toute une ligne en un seul sceau\n" +
			"  git branch -d NOM                   effacer une ligne déjà réunie (-D : même si elle ne l'est pas)\n" +
			"  git branch --contains HASH          les lignes qui portent ce sceau\n" +
			"  git log --oneline --graph --all     dessiner les lignes »"; },
		mission: function(){ return "« Dans ~/chronotheque/lignes : lis le fichier d'une ligne, crée une ligne, détache-toi sur un sceau, regarde git status, et reviens sur main. " +
			"Puis réunis à main les trois lignes de NOTE.txt : carte (avancer suffit), legende (trois voies), sceau (--no-ff). Regarde le graphe avant chaque fusion. »"; },
		suite: function(){ return "Marc tend un fil entre ses doigts. « Le graphe d'abord, toujours. git log --oneline --graph --all. »"; },
		erreur: function(){
			var s = G9.statut(DEPOTS_CH9.lignes);
			if (s && s.detache && !aFait("n9_lignes")) return "Marc rit. « Tu flottes hors du temps : HEAD détaché. git switch main pour retrouver ta ligne. »";
			return null;
		},
		fin: function(){ return "Marc noue les trois fils en un seul. « Tu sais tisser les lignes.\n\n" +
			"Une équipe travaillait à huit sur une seule branche, sans jamais en créer d'autre, « pour ne pas compliquer ». Chaque matin, des conflits ; chaque soir, du travail écrasé. " +
			"Le jour où chacun a pris sa propre branche, courte, fusionnée dans la journée, les conflits ont presque disparu. »"; }
	},
	paradoxes: { nom: "Kenyonn", s: "paradoxes",
		metier: "Le métier : un conflit se résout en comprenant les deux intentions, pas en gardant « la mienne ». Et après chaque fusion, on lance les tests : une fusion sans conflit n'est pas une fusion juste.",
		entree: function(){ return "Sur un escalier qui monte vers le plafond et redescend la tête en bas, un garçon marche à l'envers, tranquillement. « Kenyonn. Bienvenue chez les paradoxes. Ici, deux prophètes écrivent le même vers, et Git refuse de choisir. »"; },
		image: function(){ return "« Quand deux lignes ont changé la même ligne d'un fichier, Git ne sait pas laquelle croire. Il s'arrête, et il écrit les deux dans le fichier, entre des marqueurs :\n\n" +
			"  <<<<<<< HEAD          ce que dit ta ligne\n  =======\n                        ce que dit l'autre\n  >>>>>>> prophetie-sud\n\n" +
			"C'est un paradoxe. Toi, tu lis les deux, tu écris la vraie version, tu retires les trois marqueurs, git add, puis git commit : le paradoxe est tranché.\n\n" +
			"Mais il y a pire qu'un paradoxe : la chimère. Une fusion qui réussit sans un seul conflit, parce que personne n'a touché la même ligne, et pourtant le monde est faux : l'un a renommé un sort, l'autre l'appelle encore par son ancien nom. Git ne voit rien. Seuls les tests le voient. »"; },
		syntaxe: function(){ return "« Les sorts de ma salle :\n\n" +
			"  git merge LIGNE                     la fusion (Automatic merge failed : un paradoxe)\n" +
			"  git status                          les fichiers en paradoxe (both modified)\n" +
			"  nano FICHIER                        trancher : la vraie version, sans marqueurs\n" +
			"  git add FICHIER ; git commit --no-edit    le paradoxe est tranché\n" +
			"  git merge --abort                   tout annuler, revenir comme avant\n" +
			"  git ls-files -u                     les trois versions : 1 l'ancêtre, 2 la tienne, 3 l'autre\n" +
			"  git checkout --theirs FICHIER       prendre la version de l'autre (--ours : la tienne)\n" +
			"  git merge -X ours LIGNE             trancher d'avance chaque paradoxe pour ta ligne\n" +
			"  ./verifier.sh                       vérifier le monde après une fusion »"; },
		mission: function(){ return "« Dans ~/chronotheque/paradoxe, réunis prophetie-sud à main, et tranche le paradoxe : la vraie prophétie est dans NOTE.txt. " +
			"Puis dans ~/chronotheque/chimere, réunis crepuscule à main, lance ./verifier.sh, et répare ce que la fusion a cassé sans le dire. »"; },
		suite: function(){ return "Kenyonn s'assoit à l'envers sur une marche. « Un paradoxe tranché, ça se scelle. Et une fusion trop facile, ça se vérifie. »"; },
		erreur: function(){
			var t = texteIleCh9(DEPOTS_CH9.paradoxe + "/prophetie.txt") || "";
			if (aDesMarqueursCh9(t)) return "Kenyonn montre ton fichier. « Il reste des marqueurs <<<<<<<, ======= ou >>>>>>>. Tant qu'ils sont là, ce n'est pas tranché. »";
			var s = G9.statut(DEPOTS_CH9.paradoxe);
			if (s && s.etat === "fusion" && !(s.conflits || []).length) return "Kenyonn sourit. « Tu as tranché, mais pas scellé : git commit --no-edit. »";
			return null;
		},
		fin: function(){ return "Kenyonn redescend l'escalier, à l'endroit cette fois. « Tu sais trancher, et te méfier des fusions trop faciles.\n\n" +
			"Deux équipes ont fusionné leurs branches un vendredi soir : aucun conflit, tout semblait parfait. L'une avait renommé un champ de base de données, l'autre écrivait encore dans l'ancien. " +
			"Le lundi, les commandes de tout le week-end étaient enregistrées sans adresse de livraison. Les tests d'intégration l'auraient vu en deux minutes ; personne ne les avait lancés. »"; }
	},
	besace: { nom: "Anthony", s: "besace",
		metier: "Le métier : stash pour une urgence, cherry-pick pour reporter un correctif sur une branche de version, un tag annoté pour chaque version publiée. Un stash oublié est un travail perdu : git stash list de temps en temps.",
		entree: function(){ return "Un homme en manteau de voyage décroche une besace de cuir d'une patère. Il y plonge le bras jusqu'à l'épaule, et en ressort une lanterne. « Anthony. Cette besace n'a pas de fond. Et dehors, il y a un menhir que personne ne déplace jamais. »"; },
		image: function(){ return "« Tu travailles, rien n'est scellé, et une urgence arrive sur une autre ligne. Tu ne veux pas sceller un travail à moitié fait, ni le perdre. La besace : git stash. " +
			"Tu y ranges ton atelier et ton autel, tu pars, tu reviens, tu ressors tout (pop). Avec -u, la besace prend aussi les fichiers que Git ne suit pas encore.\n\n" +
			"La relique : un seul sceau d'une autre ligne, dont tu as besoin ici, sans prendre toute la ligne. git cherry-pick le rejoue sur ta ligne : un nouveau sceau, le même changement.\n\n" +
			"Le menhir : un tag. Un nom qui ne bouge jamais, planté sur un sceau, pour toujours. Annoté (-a), il a un auteur, une date, un message : c'est ainsi qu'on marque une version. »"; },
		syntaxe: function(){ return "« Les sorts de ma salle :\n\n" +
			"  git stash push -u -m \"vitrail\"      ranger l'atelier, l'autel et les fichiers non suivis\n" +
			"  git stash list ; git stash show -p  ce qui dort dans la besace\n" +
			"  git stash pop                       ressortir le dernier rangé\n" +
			"  git cherry-pick HASH                rapporter un seul sceau sur ta ligne\n" +
			"  git tag -a v1.0 -m \"...\"            planter un menhir annoté sur HEAD\n" +
			"  git show v1.0                       le menhir, et le sceau qu'il marque\n" +
			"  git stash branch NOM                une ligne neuve, avec ce qui dort dans la besace\n" +
			"  git cherry-pick -x HASH             une relique qui dit d'où elle vient\n" +
			"  git tag -a v1.1.0 -m \"...\"          MAJEUR.MINEUR.CORRECTIF : casse, ajoute, répare »"; },
		mission: function(){ return "« Dans ~/chronotheque/besace, lis NOTE.txt. Ton travail en cours sur vitrail, une urgence sur main, une relique sur correctifs (une seule !), un menhir à planter, et ton travail à retrouver intact. »"; },
		suite: function(){ return "Anthony referme la besace. « Ce qui est dans la besace n'est pas perdu. Mais n'oublie pas de le ressortir. »"; },
		erreur: function(){
			var m = G9.resoudre(DEPOTS_CH9.besace, "refs/heads/main");
			if (m && G9.ancetre(DEPOTS_CH9.besace, HASH_CH9("experimental"), m)) return "Anthony grimace. « Tu as rapporté la rune instable sur main. Une relique, pas toute la ligne : git reset --hard ORIG_HEAD si c'est ton dernier geste, ou regenerer besace. »";
			return null;
		},
		fin: function(){ return "Anthony accroche la besace et caresse le menhir en passant. « Tu sais ranger, rapporter, marquer.\n\n" +
			"Une équipe maintenait deux versions d'un logiciel. Une faille a été corrigée sur la nouvelle ; quelqu'un a fusionné toute la branche dans l'ancienne pour la reporter, avec six mois de fonctions inachevées. " +
			"Les clients de l'ancienne version ont reçu des écrans à moitié faits. Un cherry-pick du seul correctif aurait suffi. »"; }
	},
	propheties: { nom: "Guillaume", s: "propheties",
		metier: "Le métier : on rebase sa branche locale pour la remettre à jour et la nettoyer avant une Pull Request. Règle d'or : jamais sur un historique déjà partagé.",
		entree: function(){ return "Un homme gratte un parchemin avec un couteau, souffle la poussière, et réécrit par-dessus d'une plume rapide. « Guillaume. Ici, on réécrit les prophéties. Mais seulement celles que personne n'a encore lues. »"; },
		image: function(){ return "« Ta ligne est partie de main il y a trois jours. Depuis, main a avancé. Fusionner, ça marche, mais ça laisse un nœud dans l'histoire. Rebase fait autre chose : il reprend tes sceaux, un à un, et les rejoue au bout de main, comme si tu étais parti ce matin. " +
			"Ce sont de NOUVEAUX sceaux, avec de nouvelles runes : le même changement, une histoire droite.\n\n" +
			"Et rebase -i, interactif, te donne la liste de tes sceaux à réécrire, avant de les publier : pick garde, reword change le message, squash et fixup fondent un sceau dans le précédent, drop le jette. " +
			"Un brouillon plein de « wip » devient deux sceaux propres. Mais écoute bien : on ne réécrit JAMAIS ce que d'autres ont déjà. »"; },
		syntaxe: function(){ return "« Les sorts de l'atelier :\n\n" +
			"  git switch MA_LIGNE ; git rebase main        rejouer ma ligne au bout de main\n" +
			"  git rebase --continue / --abort              après un paradoxe, continuer ; ou tout annuler\n" +
			"  git switch main ; git merge --ff-only MA_LIGNE   avancer main, sans sceau de fusion\n" +
			"  git rebase -i main                           réécrire les sceaux de ma ligne depuis main\n" +
			"     pick a1b2c3d vents: ...    garder\n" +
			"     reword ...                 garder, nouveau message\n" +
			"     fixup ...                  fondre dans le précédent, jeter son message\n" +
			"     squash ...                 fondre, et réunir les messages\n" +
			"     edit ...                   s'arrêter dessus : commit --amend, puis rebase --continue\n" +
			"     drop ...                   jeter\n" +
			"  git rebase --onto NOUVELLE ANCIENNE LIGNE    transplanter une ligne sur une autre base\n" +
			"  git rebase -x \"./tests\" main                 éprouver chaque sceau rejoué »"; },
		mission: function(){ return "« Dans ~/chronotheque/prophetie, lis NOTE.txt : rejoue carte-des-vents au bout de main puis avance main jusqu'à elle, et réécris brouillon : un seul sceau pour le vent du nord, un vrai message, plus de trace de débogage. »"; },
		suite: function(){ return "Guillaume tend sa plume. « Un rebase a la mémoire courte mais le reflog s'en souvient : si tu te perds, git rebase --abort, ou le Livre des Ombres. »"; },
		erreur: function(){
			var s = G9.statut(DEPOTS_CH9.prophetie);
			if (s && s.etat === "rebase") return "Guillaume se penche. « Ta réécriture est arrêtée en chemin. git status te dit pourquoi : tranche, git add, git rebase --continue. Ou git rebase --abort pour tout annuler. »";
			return null;
		},
		fin: function(){ return "Guillaume roule le parchemin, propre et droit. « Tu sais réécrire ce qui peut l'être.\n\n" +
			"Un développeur a rebasé la branche principale de son équipe pour « avoir un historique propre », puis l'a poussée de force. Tous les autres avaient des sceaux partis de l'ancienne histoire. " +
			"Trois jours de fusions et de doublons. Rebase est un outil merveilleux pour son propre brouillon, et une catastrophe pour l'histoire des autres. »"; }
	},
	cartes: { nom: "Moustapha", s: "cartes",
		metier: "Le métier : la meilleure stratégie de branches est la plus simple qui tient. La plupart des équipes modernes font du trunk-based ou du GitHub flow ; GitFlow sert quand on maintient plusieurs versions en même temps.",
		entree: function(){ return "Penché sur une table immense, un homme trace à l'encre les routes de trois royaumes. « Moustapha. Chaque royaume a ses routes. Les mauvaises routes ruinent plus de royaumes que les guerres. »"; },
		image: function(){ return "« Trois façons de faire passer les lignes du destin.\n\n" +
			"Trunk-based : tout le monde vit sur main, avec des lignes très courtes, fusionnées dans la journée. Il faut des tests partout. C'est rapide, c'est simple, ça demande de la discipline.\n\n" +
			"GitHub flow : main est toujours publiable. Chaque changement prend sa ligne, une requête au Haut-Conseil, une relecture, des golems verts, puis on fusionne et on publie.\n\n" +
			"GitFlow : des lignes longues (develop), des lignes de version (release), des lignes de correctifs (hotfix). Lourd, mais nécessaire quand on doit maintenir plusieurs versions à la fois, la 2.x et la 3.x. »"; },
		syntaxe: function(){ return "« Ce que je te demande n'est pas un sort, c'est un jugement. Dans ~/chronotheque/cartes/STRATEGIES.md, pour chaque royaume :\n\n" +
			"  Stratégie : trunk-based, GitHub flow ou GitFlow\n" +
			"  Pourquoi : une phrase\n\n" +
			"Regarde la taille de l'équipe, le rythme de publication, et combien de versions vivent en même temps.\n\n" +
			"Et pour lire les routes d'un grimoire :\n\n" +
			"  git merge-base A B                              le carrefour où deux lignes se sont séparées\n" +
			"  git log --first-parent --oneline                la grand-route seule, fusion par fusion\n" +
			"  git for-each-ref --sort=-committerdate refs/heads   les lignes, de la plus fraîche à la plus oubliée »"; },
		mission: function(){ return "« Trois royaumes sont dessinés sur ma table. Choisis pour chacun ses routes, et dis pourquoi. Je lirai ta carte. »"; },
		suite: function(){ return "Moustapha pose un compas sur la carte. « Une équipe, un rythme, des versions : trois questions, une stratégie. »"; },
		erreur: function(){
			var r = strategiesCh9();
			if (r[2] && r[2].s && !/git\s*flow|release|version/.test(r[2].s)) return "Moustapha tapote le royaume des Grimoires. « Deux versions maintenues en même temps, 2.x et 3.x. Il leur faut des lignes de version. »";
			return null;
		},
		fin: function(){ return "Moustapha range son compas. « Tu sais lire une carte de routes.\n\n" +
			"Une équipe de trois personnes avait adopté GitFlow « parce que c'est le standard ». Cinq types de branches, des fusions dans tous les sens, une publication toutes les trois semaines. " +
			"En passant au GitHub flow, elle publiait trois fois par jour. Ce n'était pas l'équipe qui était lente : c'étaient ses routes. »"; }
	},
	portes: { nom: "Jeremy", s: "portes",
		metier: "Le métier : pull, c'est fetch puis merge (ou rebase). fetch seul ne touche jamais à ton travail : on regarde avant d'agir. Et une clé SSH par poste ; on ne copie jamais sa clé privée d'une machine à l'autre.",
		entree: function(){ return "Sous l'arche, un jeune homme en cape de messager jongle avec des rouleaux scellés. Il en rattrape un au vol. « Jeremy ! Je porte les messages entre la Chronothèque et les Royaumes. Sans clé, personne ne passe le pont. Même pas moi. »"; },
		image: function(){ return "« Ta Chronique est chez toi. La vraie, celle que tout le monde partage, dort sur royaume, dans un dépôt nu (bare) : un grimoire sans atelier, rien que la mémoire. Un Royaume, c'est un remote ; celui d'où tu as cloné s'appelle origin.\n\n" +
			"git fetch envoie un messager chercher les nouvelles du Royaume, et les range dans tes lignes origin/main, sans toucher aux tiennes. git pull, c'est fetch, puis réunir. git push envoie tes sceaux.\n\n" +
			"Et quand le Royaume a avancé sans toi, la porte se ferme : rejected. Pas de panique : on regarde (fetch, log main..origin/main), puis on se remet au bout (pull --rebase), et on repasse. »"; },
		syntaxe: function(){ return "« Les sorts des Portes :\n\n" +
			"  ssh-copy-id royaume                          ta clé publique sur royaume\n" +
			"  git clone royaume:/srv/git/chronique.git     cloner la Chronique (origin = royaume)\n" +
			"  git remote -v ; git branch -vv               les Royaumes, et qui suit qui\n" +
			"  git fetch ; git log --oneline main..origin/main   ce que le Royaume a et pas toi\n" +
			"  git pull --rebase                            se remettre au bout\n" +
			"  git push ; git push -u origin NOM            envoyer ; -u retient l'upstream\n" +
			"  git remote add NOM URL                       une porte vers un second Royaume\n" +
			"  git ls-remote origin                         ce que porte le Royaume, sans rien rapporter\n" +
			"  git push origin --delete NOM                 effacer une ligne dans le Royaume »"; },
		mission: function(){ return "« Pose ta clé sur royaume, et entre une fois (ssh royaume). Clone la Chronique dans ~/chronotheque, regarde ses Royaumes et ses suivis. " +
			"Puis scelle quelque chose et pousse : je te parie que la porte se fermera. Regarde, synchronise, repasse. Enfin, une ligne à toi, poussée avec -u. »"; },
		suite: function(){ return "Jeremy te lance un rouleau. « Avant de tirer, regarde ce que tu tires : fetch, puis log. »"; },
		erreur: function(){
			if (!aFait("n9_cle") && !clePubliqueCh9()) return "Jeremy fouille ta besace. « Tu n'as pas de clé ! ssh-keygen -t ed25519, puis ssh-copy-id royaume. »";
			var url = configCh9("remote \"origin\"", "url", DEPOTS_CH9.chronique);
			if (url && !urlRoyaumeOkCh9(url)) return "Jeremy fronce les sourcils. « Ton origin ne mène pas à royaume:/srv/git/chronique.git. git remote set-url origin royaume:/srv/git/chronique.git. »";
			return null;
		},
		fin: function(){ return "Jeremy range ses rouleaux. « Tu passes le pont dans les deux sens.\n\n" +
			"Un développeur pressé faisait toujours git pull sans regarder. Un matin, il a tiré une branche qui venait d'être réécrite de force par un collègue, et l'a fusionnée avec la sienne : " +
			"tout l'historique en double, des centaines de sceaux dupliqués. Un git fetch, suivi d'un regard, lui aurait montré le « forced update ». »"; }
	},
	garde: { nom: "Aurélien", s: "garde",
		metier: "Le métier : les hooks locaux se contournent (--no-verify) ; la vraie barrière est côté serveur et dans la CI. Et un commit non signé peut porter n'importe quel nom : user.name se change en une ligne.",
		entree: function(){ return "Accroupi sur le seuil, un homme grave une rune dans la pierre avec un poinçon d'argent. La rune s'allume en rouge quand ton ombre passe dessus. « Aurélien. Mes runes brûlent avant qu'on fasse une bêtise. Et j'ai un bâton de cire pour toi. »"; },
		image: function(){ return "« Une rune de garde, c'est un hook : un script dans .git/hooks, qui se lance à chaque geste. pre-commit avant chaque sceau, commit-msg pour juger le message, pre-push avant chaque envoi. " +
			"S'il sort avec un code non nul, le geste est refusé. Il doit être exécutable, sinon il dort.\n\n" +
			"Le sceau de cire, c'est la signature. N'importe qui peut écrire « Laurent » dans user.name et sceller en son nom. Mais personne ne peut imiter ta cire : ta clé SSH. " +
			"Un sceau signé dit qui l'a vraiment scellé. Pour vérifier, Git consulte le registre des signataires autorisés : allowed_signers. »"; },
		syntaxe: function(){ return "« Les sorts des runes :\n\n" +
			"  cp ~/chronotheque/runes/pre-commit .git/hooks/pre-commit\n" +
			"  chmod +x .git/hooks/pre-commit              une rune qui dort ne garde rien\n" +
			"  git config --global gpg.format ssh\n" +
			"  git config --global user.signingkey ~/.ssh/id_ed25519.pub\n" +
			"  git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers\n" +
			"  git commit -S -m \"...\" ; git log --show-signature -1\n" +
			"  .git/hooks/pre-push                         une rune avant chaque envoi (elle lit : ref, rune, ref distante, rune)\n" +
			"  git tag -s v1.0.0 -m \"...\" ; git verify-tag v1.0.0   un menhir scellé de ta cire, et sa vérification\n\n" +
			"Tout est écrit dans ~/chronotheque/runes/SCEAUX-DE-CIRE.txt. »"; },
		mission: function(){ return "« Dans ta chronique, pose ma rune pre-commit et essaie de sceller un MOT_DE_PASSE= : elle doit brûler. Puis prépare ta cire, scelle un sceau signé, pousse-le, et vérifie-le. »"; },
		suite: function(){ return "Aurélien souffle sur une rune pour l'éteindre. « Une rune qui n'est pas exécutable dort. ls -l .git/hooks. »"; },
		erreur: function(){
			var t = texteIleCh9(DEPOTS_CH9.chronique + "/.git/hooks/pre-commit");
			if (t && !aFait("n9_garde")){
				var it = G9.essai(function(){ return Shell.chercherDepuis(Home, DEPOTS_CH9.chronique + "/.git/hooks/pre-commit", { sudo: true }, "ls").node; }, null);
				if (it && !/^..x/.test(it.mode || "")) return "Aurélien montre ta rune. « Elle est là, mais elle dort : chmod +x .git/hooks/pre-commit. »";
			}
			if (vuCh9("showSignature") && !vuCh9("signatureBonne") && !aFait("n9_signature")) return "Aurélien lit par-dessus ton épaule. « Git ne sait pas à qui est cette cire : il lui faut ~/.ssh/allowed_signers (ton mail, namespaces=\"git\", ta clé publique) et gpg.ssh.allowedSignersFile. »";
			return null;
		},
		fin: function(){ return "Aurélien te tend le bâton de cire, gravé à ton nom. « Tes sceaux sont à toi, maintenant.\n\n" +
			"Sur une forge publique, quelqu'un a poussé des commits au nom d'un mainteneur célèbre, avec son nom et son adresse, pour faire accepter un changement malveillant. " +
			"Les commits n'étaient pas signés ; ceux du vrai mainteneur, si. La forge affichait « Verified » sur les uns et rien sur les autres. Ceux qui ont regardé ont vu. »"; }
	},
	conseil: { nom: "Amine", s: "conseil",
		metier: "Le métier : une Pull Request petite et ciblée se relit en dix minutes ; une énorme ne se relit jamais vraiment. La CI vérifie ce qu'on lui a appris à vérifier, rien de plus : la relecture humaine reste indispensable.",
		entree: function(){ return "Au centre de l'hémicycle, un homme en robe de conseiller se tient entre deux golems de bronze immobiles. « Amine. Rien n'entre dans la Chronique sans passer devant ce Conseil. Ni toi, ni moi, ni Laurent. »"; },
		image: function(){ return "« Tu as une ligne poussée sur royaume. Tu ne la fusionnes pas toi-même dans main : tu présentes une requête au Haut-Conseil. C'est une Pull Request.\n\n" +
			"Les golems la vérifient d'abord : ce sont les vérifications automatiques, l'intégration continue (CI). Puis un maître la relit, ligne par ligne, et l'approuve ou demande des changements. " +
			"Alors seulement, on fusionne. Et la main est protégée : personne ne pousse dessus directement.\n\n" +
			"Relire, c'est le geste le plus important de ce Conseil. Les golems ne lisent que ce qu'on leur a appris. Un maître lit le sens. »"; },
		syntaxe: function(){ return "« Les sorts du Conseil (gh, dans ta chronique) :\n\n" +
			"  gh pr create --title \"...\" --body \"...\"   présenter ta ligne poussée\n" +
			"  gh pr list ; gh pr view N                 les requêtes, et une en entier\n" +
			"  gh pr checks N                            le verdict des golems\n" +
			"  gh pr diff N                              ce qu'elle change, ligne par ligne\n" +
			"  gh pr review N --approve -b \"...\"         approuver\n" +
			"  gh pr review N --request-changes -b \"...\" demander des changements\n" +
			"  gh pr merge N --merge --delete-branch     fusionner, et effacer la ligne\n" +
			"  gh pr checkout N                          essayer chez toi la requête d'un autre\n" +
			"  gh pr view N --json mergeable             CONFLICTING : fusionne main dans ta ligne, tranche, pousse\n" +
			"  .github/CODEOWNERS                        « lois.md @laurent » : les gardiens de chaque page\n\n" +
			"Je t'enseigne gh : la voix du Haut-Conseil. »"; },
		mission: function(){ return "« Présente ta ligne au Conseil. Quand les golems seront verts, je relirai, et si j'approuve, fusionne-la. " +
			"Puis relis la requête de Kévin, la table des marées : lis son diff, et si elle est juste, approuve-la. »"; },
		suite: function(){ return "Amine désigne les golems. « Vert, ce n'est pas juste. Vert, c'est vérifié. Le juste, c'est toi qui le lis. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Amine s'incline devant toi. « Tu sièges au Conseil, maintenant.\n\n" +
			"Une bibliothèque libre très utilisée a accepté pendant des mois les contributions d'un nouveau mainteneur, aimable et efficace. Ses requêtes passaient tous les tests. " +
			"L'une d'elles cachait une porte dérobée dans un fichier de test compressé. Un ingénieur l'a découverte par hasard, en mesurant une lenteur d'une demi-seconde. Les golems n'avaient rien vu. »"; }
	}
};

var SORTS_DES_SALLES_CH9 = { sceaux: ["git"], conseil: ["gh"] };
function sortsDuMaitreCh9(g){ return (SORTS_DES_SALLES_CH9[g.s] || []).filter(function(x){ return typeof MANUEL !== "undefined" && !!MANUEL[x]; }); }
GameEvents.addListener("read", function(e){
	try { Object.keys(MAITRES_CH9).forEach(function(k){ var g = MAITRES_CH9[k]; if (g.item && e.item === g.item && !g.item.teaches.length) g.item.teaches = sortsDuMaitreCh9(g); }); } catch (x){}
});
Object.keys(MAITRES_CH9).forEach(function(cle){
	var g = MAITRES_CH9[cle], s = salleCh9Par(cle);
	g.item = new Item(sansAccentCh9(g.nom).replace(/^./, function(x){ return x.toUpperCase(); }), "", "item_" + sansAccentCh9(g.nom) + ".gif").personnage();
	var sorts = (SORTS_DES_SALLES_CH9[cle] || []).filter(function(x){ return !!MANUEL[x]; });
	if (sorts.length) g.item.enseigne.apply(g.item, sorts);
	g.item.revele.apply(g.item, idsDefisSalleCh9(cle));
	texteVivant(g.item, function(){ return texteMaitreCh9(g); });
	s.lieu.addItem(g.item);
});
LaurentChronothequeCh9.revele("s_n9_sans_indice", "s_n9_scribe_j1", "s_n9_gardien_j2", "s_n9_avant_aube");
SablierChronothequeCh9.revele("s_n9_scribe_j1", "s_n9_gardien_j2", "s_n9_avant_aube");
/* Au départ direct, git doit être apprenable même si Gamaliel n'a pas encore été lu : Laurent l'enseigne aussi. */
if (MANUEL.git) LaurentChronothequeCh9.enseigne("git");

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts                                           */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH9 = {
	"git": { nom: "la Plume du Temps", image: "Tu scelles, lis, réunis et répares la Chronique." },
	"gh":  { nom: "la Voix du Haut-Conseil", image: "Tu présentes, relis et fusionnes les requêtes du Conseil." }
};
var NOM_RPG_AVANT_CH9 = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 10 && SORTS_RPG_CH9[sort]) return SORTS_RPG_CH9[sort].nom;
	return NOM_RPG_AVANT_CH9(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre                                              */
/* ------------------------------------------------------------------ */

var TROPHEES_CH9 = {
	salle_sceaux:      ["la Salle des Sceaux", "git config aux trois niveaux, --show-origin, git init, le dossier .git et HEAD."],
	salle_autel:       ["l'Autel des Offrandes", "Les trois zones, add, commit, status -s, log --oneline, .gitignore, rm --cached, add -p : un sceau, une raison."],
	salle_runes:       ["la Crypte des Runes", "blob, tree, commit, tag : cat-file -t et -p, hash-object ; un hash identifie un contenu."],
	salle_oracle:      ["l'Oracle", "log --oneline --graph --all, -S, --author, blame, show REV:FICHIER, diff entre deux moments."],
	salle_contresorts: ["la Salle des Contre-sorts", "restore, restore --staged, commit --amend, reset --soft, --mixed et --hard, revert."],
	salle_ombres:      ["le Livre des Ombres", "git reflog, HEAD@{n} : une branche effacée n'est qu'un nom perdu."],
	salle_lignes:      ["les Lignes du Destin", "Une branche est un fichier de 41 octets ; switch -c, HEAD détaché ; fast-forward, fusion à trois voies, --no-ff."],
	salle_paradoxes:   ["la Salle des Paradoxes", "Les marqueurs de conflit, trancher, add, commit ; une fusion sans conflit se vérifie par les tests."],
	salle_besace:      ["la Besace et les Reliques", "stash push -u, stash pop, cherry-pick d'un seul sceau, tag annoté."],
	salle_propheties:  ["l'Atelier des Prophéties", "rebase sur main, merge --ff-only, rebase -i : pick, reword, squash, fixup, drop."],
	salle_cartes:      ["la Salle des Cartes", "Trunk-based, GitHub flow, GitFlow : la stratégie suit l'équipe, le rythme et les versions."],
	salle_portes:      ["les Portes des Royaumes", "ssh-copy-id, clone, remote -v, branch -vv, push refusé, fetch, log main..origin/main, pull --rebase, push -u."],
	salle_garde:       ["les Runes de Garde", "Un hook pre-commit exécutable, des commits signés avec une clé SSH, allowed_signers, --show-signature."],
	salle_conseil:     ["le Haut-Conseil", "gh pr create, checks, diff, review, merge : la CI vérifie, un humain relit."],
	sceau_apprenti:    ["le Sceau d'Apprenti", "On commence tous ici : on mesure avant de construire."],
	sceau_scribe:      ["le Sceau de Scribe", "Épreuve I : retirer de l'index ce qui ne devait pas y être, l'ignorer, et séparer deux changements en deux commits."],
	sceau_archiviste:  ["le Sceau d'Archiviste", "Épreuve II : retrouver du travail perdu par le reflog, et défaire un commit publié par un revert."],
	sceau_chroniqueur: ["le Sceau de Chroniqueur", "Épreuve III : git bisect run trouve le commit fautif parmi 64, en six questions."],
	sceau_gardien:     ["le Sceau de Gardien du Temps", "Épreuve IV : rebase, rebase -i pour nettoyer (et purger un secret de chaque commit), puis fast-forward."],
	sceau_chronomancien: ["le Sceau de Chronomancien", "Épreuve V : une Pull Request aux tests verts peut être empoisonnée ; la relecture la refuse."],
	n9_sablier:        ["le Grand Sablier", "On mesure l'état d'un dépôt avant d'y toucher : l'intégrité de départ est le point zéro."],
	n9_restauration:   ["la Vraie Histoire", "Une branche réécrite de force se restaure depuis une copie saine, avec --force-with-lease."],
	n9_faux_sceaux:    ["les Faux Sceaux", "Une signature inconnue ne se croit pas ; un commit publié se contredit par un revert."],
	n9_rapport:        ["le Rapport du Temps", "Un rapport d'incident : la réécriture, l'empreinte du faussaire, la restauration, le rempart, ce qui reste."],
	s_n9_avant_aube:   ["Avant l'Aube", "La Chronique défendue avant l'aube du quatrième jour : on se prépare avant l'attaque, pas pendant."]
};
var COMPETENCES_CH9 = {
	salle_sceaux: "Configuration de Git", salle_autel: "Index et commits", salle_runes: "Modèle objet de Git", salle_oracle: "Lire l'historique",
	salle_contresorts: "Annuler proprement", salle_ombres: "Reflog", salle_lignes: "Branches et fusions", salle_paradoxes: "Conflits",
	salle_besace: "Stash, cherry-pick, tags", salle_propheties: "Rebase", salle_cartes: "Stratégies de branches", salle_portes: "Dépôts distants",
	salle_garde: "Hooks et signatures", salle_conseil: "Pull Requests et revue",
	sceau_apprenti: "Rang d'Apprenti du Temps", sceau_scribe: "Rang de Scribe", sceau_archiviste: "Rang d'Archiviste", sceau_chroniqueur: "Rang de Chroniqueur",
	sceau_gardien: "Rang de Gardien du Temps", sceau_chronomancien: "Rang de Chronomancien",
	n9_sablier: "Chronique mesurée", n9_restauration: "Histoire restaurée", n9_faux_sceaux: "Faux commits démasqués", n9_rapport: "Rapport du temps",
	s_n9_avant_aube: "Chronique avant l'aube", platine_ch9: "Chronomancien de la Chronothèque"
};
var SIGLES_CH9 = {
	salle_sceaux: ["INIT", "bronze"], salle_autel: ["ADD", "bronze"], salle_runes: ["SHA", "bronze"], salle_oracle: ["LOG", "argent"],
	salle_contresorts: ["RVRT", "argent"], salle_ombres: ["RFLG", "argent"], salle_lignes: ["MRG", "argent"], salle_paradoxes: ["<<<", "argent"],
	salle_besace: ["TAG", "argent"], salle_propheties: ["RBS", "or"], salle_cartes: ["FLOW", "argent"], salle_portes: ["PUSH", "or"],
	salle_garde: ["SIGN", "or"], salle_conseil: ["PR", "or"],
	sceau_apprenti: ["0", "bronze"], sceau_scribe: ["1", "bronze"], sceau_archiviste: ["2", "argent"], sceau_chroniqueur: ["3", "argent"],
	sceau_gardien: ["4", "or"], sceau_chronomancien: ["5", "platine"],
	n9_sablier: ["TIME", "bronze"], n9_restauration: ["HIST", "or"], n9_faux_sceaux: ["SEAL", "or"], n9_rapport: ["DOC", "or"], s_n9_avant_aube: ["J4", "or"],
	platine_ch9: ["GIT", "platine"]
};
Object.keys(COMPETENCES_CH9).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH9[id]; });
Object.keys(SIGLES_CH9).forEach(function(id){ if (SIGLES_CH9[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH9[id][1]; });
function badgeCh9Gagne(id){ return /^(salle_|sceau_)/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_CH9 = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_CH9();
	if (state.has("ch9Ouvert") && !state.has("platine_ch9") && Object.keys(TROPHEES_CH9).every(badgeCh9Gagne)){
		state.set("platine_ch9");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch9) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* sablier : le plan de la Chronothèque ; sceaux : ton rang             */
/* ------------------------------------------------------------------ */

function barreSablierCh9(){
	var reste = Math.max(0, AUBE_CH9 - minutesCh9()), total = AUBE_CH9 - 360, n = 30;
	var k = Math.round(n * (1 - Math.min(1, reste / total)));
	function fois(t, m){ var r = ""; for (var i = 0; i < m; i++) r += t; return r; }
	return C.gris("  le sablier ⌛ ") + C.jaune(fois("·", Math.max(0, n - k))) + C.rouge(fois("▲", k)) + C.gris(" la Synchronisation");
}
function texteSablierPlanCh9(){
	var c = sCh9(), p = integriteCh9();
	var lignes = [C.gras("LE GRAND SABLIER : LE PLAN DE LA CHRONOTHÈQUE"), C.jaune("commande du jeu, pas Linux (man sablier)"), C.gris("rouge : salle à tenir · vert : salle tenue · l'état est lu sur tes dépôts et sur royaume"), ""];
	lignes.push("  " + C.gras(heureCh9()) + C.gris(" · ") + C.gras(nomRangCh9()) + C.gris(" · ") + (c.bataille ? C.rouge("la Grande Synchronisation a sonné") : C.jaune(texteAvantSynchroCh9())));
	if (!c.bataille) lignes.push(barreSablierCh9());
	lignes.push("  L'intégrité de la Chronique : " + C.gras(p + " / 100") + C.gris(" (départ : " + (c.scoreDepart !== null && c.scoreDepart !== undefined ? c.scoreDepart : p) + ", objectif : au moins 90 après la bataille)"), "");
	var rappel = rappelLaurentCh9();
	if (rappel) lignes.push(C.jaune("  " + rappel), "");
	ACTES_CH9.forEach(function(a){
		lignes.push(C.gras("  Acte " + ["", "I", "II", "III", "IV", "V", "VI"][a.n] + " · " + a.titre) + C.gris(rangCh9() >= a.n - 1 ? "" : "  (fermé : il faut être " + RANGS_CH9[a.n - 1].nom + ")"));
		SALLES_CH9.filter(function(s){ return s.acte === a.n; }).forEach(function(s){
			var ok = etapesSalleFaitesCh9(s), faites = s.etapes.filter(aFait).length, defis = idsDefisSalleCh9(s.cle).filter(aFait).length;
			var cede = c.assaut && (c.assaut.salles || []).indexOf(s.cle) > -1 && !ok;
			lignes.push("    " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(s.nom, 22)) + completerDroite(s.maitre, 10) +
				C.gris("  " + faites + " sur " + s.etapes.length + " étapes · " + defis + " sur " + idsDefisSalleCh9(s.cle).length + " défis") + (cede ? C.rouge(" · éteinte à l'aube") : "") + (current_room === s.lieu ? C.jaune("  ◀ toi") : ""));
		});
		if (a.epreuve){
			var etat = aFait(a.epreuve) ? C.vert("réussie") : (epreuveOuverteCh9(a.n) ? C.rouge("EN COURS") : C.gris("fermée (finis l'acte)"));
			lignes.push("    " + C.jaune("⚔") + " Épreuve de rang : " + a.nomEpreuve + C.gris(" → ") + RANGS_CH9[a.n].nom + C.gris(" · ") + etat);
		} else {
			lignes.push("    " + C.jaune("⚔") + " " + a.nomEpreuve + C.gris(" · ") + (c.bataille ? C.rouge("EN COURS") : C.gris("à l'aube du J4, ou dès que tu es Chronomancien")));
		}
	});
	if (c.bataille){
		lignes.push("", C.gras("  La bataille du temps"));
		lignes.push("    " + (aFait("n9_alerte") ? C.vert("●") : C.rouge("●")) + " voir la réécriture" + (aFait("n9_alerte") ? "" : C.rouge(" : git fetch, puis comparer main et origin/main")));
		lignes.push("    " + (aFait("n9_restauration") ? C.vert("●") : C.rouge("●")) + " la vraie histoire rendue aux Royaumes" + (aFait("n9_restauration") ? "" : C.rouge(" : git push --force-with-lease (ou le miroir de la WarRoom)")));
		lignes.push("    " + (aFait("n9_rempart") ? C.vert("●") : C.rouge("●")) + " le rempart sur royaume" + (aFait("n9_rempart") ? "" : C.rouge(" : receive.denyNonFastForwards et receive.denyDeletes")));
		lignes.push("    " + (aFait("n9_faux_sceaux") ? C.vert("●") : (c.fauxSceaux ? C.rouge("●") : C.gris("○"))) + " les faux sceaux" + (c.fauxSceaux && !aFait("n9_faux_sceaux") ? C.rouge(" : git log --show-signature, puis git revert") : ""));
	}
	var inc = incidentsOuvertsCh9();
	if (inc.length) lignes.push("", C.rouge("  Incidents ouverts (-3 chacun) : ") + inc.join(" ; "));
	var manque = mesuresManquantesCh9();
	if (manque.length) lignes.push("", C.gras("  Ce qui manque à la Chronique") + C.gris(" (" + manque.length + ")"), manque.slice(0, 6).map(function(m){ return "    " + C.gris("+" + m.poids) + " " + m.texte; }).join("\n") + (manque.length > 6 ? "\n" + C.gris("    ... et " + (manque.length - 6) + " autres") : ""));
	if (typeof lumieresAnnexes === "function"){ var la = lumieresAnnexes(10); if (la.length) lignes.push("", C.gras("  Les lumières des habitants"), la.map(function(x){ return "    " + C.jaune("✺") + " " + x; }).join("\n")); }
	lignes.push("", "  Salles tenues : " + C.gras(sallesTenuesCh9().length + " sur 14"));
	var j1 = aFait("s_n9_scribe_j1") ? C.vert("réussi") : (rangCh9() >= 1 || c.minutes >= 1320 ? C.rouge("manqué") : C.jaune("en cours"));
	var j2 = aFait("s_n9_gardien_j2") ? C.vert("réussi") : (rangCh9() >= 4 || c.minutes >= 2760 ? C.rouge("manqué") : C.jaune("en cours"));
	var j4 = aFait("s_n9_avant_aube") ? C.vert("réussi") : (c.bataille && !c.bataille.avantAube ? C.rouge("manqué") : C.jaune("en cours"));
	var hi = aFait("s_n9_sans_indice") ? C.vert("réussi") : (state.malus10 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("  Défis d'honneur (Laurent)"), "    Scribe avant la nuit du J1 : " + j1, "    Gardien du Temps avant la fin du J2 : " + j2, "    La bataille gagnée avant l'aube : " + j4, "    Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH9).filter(badgeCh9Gagne);
	lignes.push("", C.gras("  BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH9).length) + C.gris("  (badges chronique : les leçons)"));
	lignes.push(C.gris("  Un dépôt cassé ? regenerer NOM (premier-sceau, autel, annales, ...)"));
	return lignes.join("\n");
}
Shell.sorts.sablier = function(args, io){
	if (!state.has("ch9Ouvert")) return "Le Grand Sablier se retourne avec le chapitre 9, après le Grand Port.";
	if (!state.quests["n9_entree"]) return "Le Grand Sablier est dans la Chronothèque : descends-y d'abord (cd ~/Cybersup/Chronotheque).";
	var c = sCh9(), p = integriteCh9();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = p;
	c.scoreDernier = p;
	if (state.quests["n9_faux_sceaux"]) c.scoreFinalCandidat = p;
	var texte = texteSablierPlanCh9();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
function texteSceauxCh9(){
	var r = rangCh9(), c = sCh9();
	var l = [C.gras("TES SCEAUX DE RANG"), C.jaune("commande du jeu, pas Linux (man sceaux)"), ""];
	l.push("  Rang : " + C.gras(RANGS_CH9[r].nom) + C.gris("  (" + ["un sceau vierge", "un sceau de cire rouge", "un sceau d'argent", "un sceau d'or", "un sceau d'or et une plume", "le sablier inversé"][r] + ")"));
	l.push("", C.gras("  Les rangs"));
	RANGS_CH9.forEach(function(x, i){ l.push("    " + (i <= r && (i > 0 || state.has("sceau_apprenti")) ? C.vert("✦") : C.gris("·")) + " " + completerDroite(x.nom, 19) + (c.rangA && c.rangA[i] !== undefined ? C.gris("gagné à J" + (Math.floor(c.rangA[i] / 1440) + 1) + " " + deuxChiffres(Math.floor(c.rangA[i] % 1440 / 60)) + ":" + deuxChiffres(c.rangA[i] % 60)) : "")); });
	if (r < 5){
		var a = acteCh9(r + 1);
		var reste = a.etapes.filter(function(id){ return !aFait(id); });
		l.push("", C.gras("  Pour devenir " + RANGS_CH9[r + 1].nom));
		if (!aFait("n9_sablier")) l.push("    " + (rappelLaurentCh9() ? C.jaune(rappelLaurentCh9()) : "Écouter Laurent, lire l'Ordre, et retourner le Grand Sablier (sablier)."));
		reste.forEach(function(id){ var q = QUETES_CH9.filter(function(x){ return x.id === id; })[0]; l.push("    [ ] " + q.titre); });
		l.push("    " + (epreuveOuverteCh9(r + 1) ? C.rouge("⚔ L'épreuve de rang est ouverte : ") : C.gris("⚔ Puis l'épreuve de rang : ")) + a.nomEpreuve);
	} else l.push("", C.gras("  Tu portes le sablier inversé.") + (state.quests["n9_rapport"] ? " La Chronique est à toi." : " Il reste à défendre la Chronique pendant la Grande Synchronisation."));
	return l.join("\n");
}
Shell.sorts.sceaux = function(args, io){
	if (!state.has("ch9Ouvert")) return "Les sceaux de rang se gagnent à la Chronothèque, au chapitre 9.";
	return texteSceauxCh9();
};
Shell.sorts.regenerer = function(args, io){
	if (!state.has("ch9Ouvert") || !state.quests["n9_entree"]) return "regenerer sert à la Chronothèque (chapitre 9) : un dépôt d'exercice neuf.";
	var noms = REGENERATIONS_CH9.filter(function(x){ return !x.epreuve || epreuveOuverteCh9(x.epreuve); }).map(function(x){ return x.nom; });
	if (!args.length) return "regenerer NOM : repose un dépôt d'exercice neuf dans ~/chronotheque (tes changements dedans sont perdus, tes étapes déjà faites restent faites).\n  " + noms.join(", ") + "\n" +
		C.gris("(La chronique clonée depuis royaume ne se régénère pas : c'est la vraie. Supprime-la et reclone-la si besoin.)");
	var x = REGENERATIONS_CH9.filter(function(y){ return y.nom === args[0] || y.cle === args[0]; })[0];
	if (!x) return "regenerer : je ne connais pas « " + args[0] + " ». Les dépôts : " + noms.join(", ");
	if (x.epreuve && !epreuveOuverteCh9(x.epreuve)) return "regenerer : l'épreuve qui pose « " + x.nom + " » n'est pas encore ouverte.";
	if (x.cle === "page") supprimerDossierCh9(DEPOTS_CH9.pageNu);
	regenererCh9(x);
	return "~/chronotheque/" + x.nom + " : un dépôt neuf, tel que le maître l'avait préparé." + C.gris(" (cd ~/chronotheque/" + x.nom + " ; git status ; git log --oneline --graph --all)");
};
["sablier", "sceaux", "regenerer"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
if (typeof COMMANDES_DU_JEU !== "undefined"){
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["sablier", "le plan de la Chronothèque : les salles, l'heure, la Synchronisation, l'intégrité (chapitre 9)"]);
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["sceaux", "ton rang à la Chronothèque, et ce qu'il faut pour le suivant"]);
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["regenerer NOM", "un dépôt d'exercice neuf à la Chronothèque (chapitre 9)"]);
}
if (typeof MANUEL_DU_JEU !== "undefined"){
	MANUEL_DU_JEU.sablier = "sablier n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
		"À la Chronothèque (chapitre 9), il montre le plan : l'heure (J1 06:00 à l'aube du J4), ton rang, la Grande Synchronisation qui\n" +
		"approche, l'intégrité de la Chronique (de 0 à 100, calculée sur l'état RÉEL de tes dépôts et de royaume), les quatorze salles\n" +
		"(en rouge celles à tenir, en vert celles tenues), les épreuves de rang, la bataille, et ce qui manque encore.\n\n  sablier       le plan de la Chronothèque";
	MANUEL_DU_JEU.sceaux = "sceaux n'est PAS une commande Linux : c'est une commande du jeu.\nÀ la Chronothèque, elle montre ton rang (Apprenti du Temps, Scribe, Archiviste, Chroniqueur, Gardien du Temps, Chronomancien),\n" +
		"quand tu l'as gagné, et ce qu'il te manque pour le suivant (les étapes de l'acte, puis l'épreuve de rang).\n\n  sceaux        ton rang";
	MANUEL_DU_JEU.regenerer = "regenerer n'est PAS une commande Linux : c'est une commande du jeu, comme le kit de TP d'un cours.\n" +
		"À la Chronothèque, chaque leçon a son dépôt dans ~/chronotheque. Un dépôt cassé ou perdu se repose à neuf :\n\n" +
		"  regenerer             la liste des dépôts\n  regenerer annales     un dépôt annales neuf (ce que tu y avais changé est perdu)\n\n" +
		"Tes étapes déjà faites restent faites. La chronique clonée depuis royaume, elle, est la vraie : elle ne se régénère pas.";
}

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio, le messager Jeremy  */
/* ------------------------------------------------------------------ */

/* Dès que le joueur a cloné la Chronique, Jeremy pousse la promotion d'octobre sur royaume : le premier push du joueur sera refusé. */
function pushJeremyCh9(){
	var c = sCh9();
	if (!G9.depot(DEPOTS_CH9.chronique) || typeof gitConstructeur !== "function" || !estRoyaumeCh9()) return;
	// Le joueur a tiré la promotion de Jeremy avant d'avoir poussé quoi que ce soit : sans refus, pas de leçon.
	// Jeremy repousse donc (au plus trois fois), tant que le joueur n'a pas vu un push refusé.
	if (c.jeremy && !vuCh9("pushRejete") && !c.bataille && (c.jeremyEncore || 0) < 3 && G9.resoudre(DEPOTS_CH9.chronique, "refs/remotes/origin/main") === G9.resoudreR("main")){
		try {
			var mois = ["novembre", "décembre", "janvier"][c.jeremyEncore || 0];
			var g2 = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
			var reg2 = G9.fichierR("main", "registre.txt") || "";
			g2.commit({ auteur: auteurCh9("jeremy"), date: Math.floor(maintenantCh9() / 1000), message: "registre: ajoute la promotion de " + mois, fichiers: { "registre.txt": reg2.replace(/\n?$/, "\n") + "Promotion de " + mois + " : douze scribes\n" } });
			c.jeremyEncore = (c.jeremyEncore || 0) + 1;
			if (!state.has("rejeuEnCours")) say(C.gris("(Jeremy, du pont des Royaumes : « Encore une ! Je viens de pousser la promotion de " + mois + " sur royaume. »)"));
		} catch (e){}
		return;
	}
	if (c.jeremy) return;
	try {
		var g = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
		var reg = G9.fichierR("main", "registre.txt") || CHRONIQUE_CH9.registre.join("\n") + "\n";
		c.jeremy = g.commit({ auteur: auteurCh9("jeremy"), date: Math.floor(maintenantCh9() / 1000), message: "registre: ajoute la promotion d'octobre", fichiers: { "registre.txt": reg.replace(/\n?$/, "\n") + "Promotion d'octobre : quinze scribes\n" } });
		if (!state.has("rejeuEnCours")) say(C.gris("(Au loin, sur le pont des Royaumes, Jeremy crie : « Je viens de pousser la promotion d'octobre sur royaume ! »)"));
	} catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
}
/* Amine relit les requêtes du joueur quand les golems sont verts. */
function amineRelitCh9(){
	if (typeof forgeRevue !== "function") return;
	F9.prs().forEach(function(pr){
		if (!auteurPrEstJoueurCh9(pr) || !/open|ouvert/i.test(pr.etat || "") || (pr.revues || []).some(function(r){ return r.auteur === "Amine"; })) return;
		var verts = (pr.verifications || []).every(function(v){ return /success|reussi/i.test(v.etat || ""); });
		if (!verts) return;
		try {
			forgeRevue(ROYAUME_CH9, DEPOT_ROYAUME_CH9, pr.n, { auteur: "Amine", etat: "APPROVED", corps: "Relu. Les golems sont verts, le changement est juste. Tu peux fusionner." });
			if (!state.has("rejeuEnCours")) say(C.gris("(Au Haut-Conseil, Amine pose sa main sur ta requête : « Approuvée. Tu peux fusionner. »)"));
		} catch (e){}
	});
}
function verifierChronotheque(){
	if (!chronothequeActive()) return;
	var c = sCh9();
	pushJeremyCh9();
	amineRelitCh9();
	DEFIS_CH9.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiCh9(d.id); } });
	if (c.rangA && c.rangA[1] !== undefined && c.rangA[1] < 1320) reussirDefiCh9("s_n9_scribe_j1");
	if (c.rangA && c.rangA[4] !== undefined && c.rangA[4] < 1440 + 1320) reussirDefiCh9("s_n9_gardien_j2");
	if (aFait("n9_rapport") && c.bataille && c.bataille.avantAube && c.minutes < AUBE_CH9) reussirDefiCh9("s_n9_avant_aube");
	if (aFait("n9_rapport") && !state.malus10) reussirDefiCh9("s_n9_sans_indice");
	SALLES_CH9.forEach(function(s){ if (etapesSalleFaitesCh9(s) && !state.has("salle_" + s.cle)) state.set("salle_" + s.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH9).forEach(function(id){
		if (!badgeCh9Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	var suivante = QUETES_CH9.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "n9_sablier") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(ChronothequeCh9) + "/Radio.)"));
	}
}
var VERIFIER_CH9_AVANT_CHRONOTHEQUE = verifierChapitre9;
verifierChapitre9 = function(){
	VERIFIER_CH9_AVANT_CHRONOTHEQUE();
	verifierChronotheque();
};

World.fige = true;
