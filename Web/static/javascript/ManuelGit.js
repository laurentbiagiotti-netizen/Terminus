/**
 * ManuelGit.js : les pages de manuel des sorts de la Chronique (chapitre 9 pour le joueur, numéro interne 10), en français.
 * Chaque page dit à quoi sert le sort, ses sous-commandes et options courantes, un exemple, et les pièges classiques.
 * SORTS_GIT range les sorts du chapitre ; SORTS_ANNEXES_GIT, ceux des quêtes annexes (hors barème).
 */

MANUEL["git"] = page("versionner : garder, lire et partager toute l'histoire d'un projet", "GIT (le gestionnaire de versions)",
	"git garde l'histoire d'un projet dans un dossier .git : des objets (les contenus des fichiers, les arbres des\n" +
	"dossiers, les commits), des refs (une branche n'est qu'un fichier qui contient un hash), et le reflog (où HEAD est\n" +
	"passé). Trois zones : la copie de travail (tes fichiers), l'index (ce qui partira au prochain commit), le dépôt.\n\n" +
	"Se présenter (une fois)\n" +
	"  git config --global user.name \"Prénom Nom\" ;  git config --global user.email prenom@exemple.fr\n" +
	"  git config --global init.defaultBranch main ;  git config --list --show-origin\n\n" +
	"Le cycle de base\n" +
	"  git init ; git clone URL [dossier]\n" +
	"  git status (-s) ; git add FICHIER (git add -p : morceau par morceau) ; git commit -m \"message\"\n" +
	"  git diff (le non indexé) ; git diff --staged (ce qui partira) ; git rm --cached FICHIER ; .gitignore\n\n" +
	"Lire l'histoire\n" +
	"  git log --oneline --graph --all ; git log -p ; git log --stat ; git log -S mot ; git log --author=nom\n" +
	"  git show COMMIT ; git show COMMIT:fichier ; git blame FICHIER ; git cat-file -p HASH ; git bisect\n\n" +
	"Annuler\n" +
	"  git restore FICHIER (jeter un changement) ; git restore --staged FICHIER (le sortir de l'index)\n" +
	"  git commit --amend ; git reset --soft|--mixed|--hard REV ; git revert COMMIT (sans réécrire) ; git reflog\n\n" +
	"Les branches\n" +
	"  git branch ; git switch -c nouvelle ; git switch - ; git merge BRANCHE (--no-ff) ; git rebase main ; git rebase -i HEAD~3\n" +
	"  git stash (pop, list) ; git cherry-pick COMMIT ; git tag -a v1.0 -m \"...\"\n\n" +
	"À plusieurs\n" +
	"  git remote -v ; git fetch ; git pull --rebase ; git push -u origin BRANCHE ; git push --force-with-lease\n\n" +
	"Les pièges\n" +
	"  Un conflit : git status dit quoi faire. Corrige le fichier, git add, puis git commit (ou --continue).\n" +
	"  git reset --hard jette ce qui n'est pas commité. Ce qui a été commité, lui, se retrouve dans git reflog.\n" +
	"  Ne réécris jamais (rebase, amend, reset, push --force) une histoire déjà partagée.\n" +
	"  Un secret commité reste dans l'histoire : le retirer du dernier commit ne suffit pas, change-le, puis\n" +
	"  réécris l'histoire (git filter-repo --path FICHIER --invert-paths) et repousse.");

MANUEL["gh"] = page("la forge en ligne de commande : demandes de fusion, revues, vérifications", "GH (la forge, en terminal)",
	"Une forge héberge des dépôts et ajoute ce que git ne fait pas seul : les demandes de fusion (Pull Requests), les\n" +
	"revues, les vérifications automatiques (la CI) et la protection des branches. gh se lance dans un clone : il\n" +
	"trouve la forge par l'URL du remote.\n\n" +
	"  gh auth status                        qui tu es sur la forge\n" +
	"  gh repo view                          le dépôt et son README\n" +
	"  gh pr create --title \"...\" --body \"...\" [--base main]    proposer la branche courante (poussée d'abord)\n" +
	"  gh pr list ; gh pr view N ; gh pr diff N ; gh pr checks N ; gh pr checkout N\n" +
	"  gh pr review N --approve | --request-changes -b \"...\" | --comment -b \"...\"\n" +
	"  gh pr merge N --merge | --squash | --rebase [--delete-branch] ; gh pr close N\n" +
	"  gh run list ; gh run view ID --log-failed\n\n" +
	"Le piège : une revue se fait sur le diff (gh pr diff), ligne par ligne, pas sur le titre. Une branche protégée\n" +
	"refuse le push direct : on passe par une demande de fusion, relue et vérifiée.");

/* Les sorts du chapitre 9, et ceux des annexes de la Chronique (hors barème). */
var SORTS_GIT = ["git", "gh"];
var SORTS_ANNEXES_GIT = [];
SORTS_GIT.concat(SORTS_ANNEXES_GIT).forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_GIT.indexOf(c) === -1 && SORTS_ANNEXES_GIT.indexOf(c) === -1; });
if (typeof declarerSortsAnnexes === "function" && SORTS_ANNEXES_GIT.length) declarerSortsAnnexes(SORTS_ANNEXES_GIT);
var PREMIER_USAGE_AVANT_GIT = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if ((SORTS_GIT.indexOf(sort) > -1 || SORTS_ANNEXES_GIT.indexOf(sort) > -1) && tousLesSorts().indexOf(sort) === -1){ this.usages[sort] = true; return; }
	return PREMIER_USAGE_AVANT_GIT.apply(this, arguments);
};
