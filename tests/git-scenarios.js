/**
 * Les scénarios joués à la fois dans le jeu et avec le vrai git (tests/git-moteur.js les compare ligne à ligne).
 * Chaque scénario : { nom, suite } (voir tests/git-reel.js pour la syntaxe des lignes).
 */
var IDENTITE = ["~git config --global user.name 'Ada Test'", "~git config --global user.email ada@x.fr", "~git config --global init.defaultBranch main", "~git config --global log.decorate short"];
function avec(l){ return IDENTITE.concat(l); }

module.exports = [
	{ nom: "init et premier commit", suite: avec([
		"git init r", "cd r", "git status", "~echo a > a.txt", "git status", "git status -s", "git add a.txt", "git status", "git status -s",
		"git commit -m premier", "git log", "git log --oneline", "git status", "cat .git/HEAD", "git cat-file -t HEAD", "git cat-file -p HEAD", "git cat-file -p HEAD^{tree}",
		"git cat-file -s HEAD", "git hash-object a.txt", "git ls-files -s", "git rev-parse HEAD", "git rev-parse --short HEAD", "git rev-parse --abbrev-ref HEAD", "git show"
	]) },
	{ nom: "identité absente", suite: ["git init -q r", "cd r", "~echo a > a", "~git add a", "@jeu git commit -m un", "git config user.name A", "git config user.email a@b", "git commit -m un"] },
	{ nom: "cycle, diff, stat", suite: avec([
		"git init -q r", "cd r", "~printf 'l1\\nl2\\nl3\\n' > f", "~git add f", "~git commit -qm base",
		"~printf 'l1\\nl2 modifiee\\nl3\\nl4\\n' > f", "~echo neuf > g", "git status", "git status -s", "git status -sb", "git diff", "git diff --stat", "git add f", "git diff", "git diff --staged",
		"git diff --cached --stat", "git commit -m deux", "git log --stat", "git log -p", "git show --stat HEAD", "git show HEAD~1:f", "git log --oneline --name-status", "git diff HEAD~1 HEAD",
		"git diff HEAD~1..HEAD --stat", "git log --format='%h %an %s'", "git log --pretty=oneline", "git log -1", "git log -n 1 --oneline", "git log --reverse --oneline"
	]) },
	{ nom: "rm, mv, restore, gitignore", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~echo b > b", "~mkdir d", "~echo c > d/c", "~git add .", "~git commit -qm un",
		"git rm a", "git status -s", "git commit -qm rm", "git mv b bb", "git status", "git commit -qm mv", "~echo zz > bb", "git restore bb", "git status -s",
		"~echo zz > bb", "git add bb", "git restore --staged bb", "git status -s", "git restore bb", "git restore nope", "git add nope", "git rm nope", "git rm d",
		"git rm -r d", "git status -s", "~git commit -qm d", "~echo secret > .env", "~mkdir cache", "~echo x > cache/x", "~printf '.env\\ncache/\\n*.log\\n!garde.log\\n' > .gitignore", "~echo a > a.log", "~echo b > garde.log",
		"git status -s", "git status", "git check-ignore -v .env cache/x a.log garde.log", "git add .env", "git add .", "git status -s", "~git commit -qm ignore",
		"~echo s > secret.txt", "~git add secret.txt", "~git commit -qm oups", "git rm --cached secret.txt", "git status -s", "git ls-files"
	]) },
	{ nom: "branches et HEAD détaché", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo b > b", "~git add b", "~git commit -qm deux",
		"git branch", "git branch feature", "git branch -v", "cat .git/refs/heads/feature", "git switch feature", "git switch -c essai", "git switch -", "git switch --detach HEAD~1",
		"git status", "git branch", "~echo c > c", "~git add c", "~git commit -qm perdu", "git switch main", "git reflog", "git branch -d essai", "git branch -d feature",
		"git branch -m feature fonction", "git branch", "git switch -c nouveau HEAD~1", "git log --oneline --all --graph", "git checkout main", "git checkout -b autre", "git checkout main", "git branch -D autre", "git branch -d nope", "git switch nope"
	]) },
	{ nom: "fusions ff, 3 voies, no-ff", suite: avec([
		"git init -q r", "cd r", "~printf 'a\\nb\\nc\\n' > f", "~git add f", "~git commit -qm base", "~git switch -qc feat", "~printf 'a\\nb\\nc\\nd\\n' > f", "~git commit -qam feat",
		"~git switch -q main", "git merge feat", "git log --oneline --graph --all", "~git switch -qc f2", "~echo x > x", "~git add x", "~git commit -qm x", "~git switch -q main", "~echo y > y", "~git add y", "~git commit -qm y",
		"git merge f2", "git log --oneline --graph --all", "~git switch -qc f3", "~echo z > z", "~git add z", "~git commit -qm z", "~git switch -q main", "git merge --no-ff f3", "git log --oneline --graph", "git merge f3", "git reflog"
	]) },
	{ nom: "conflit de fusion", suite: avec([
		"git init -q r", "cd r", "~printf 'l1\\nl2\\nl3\\n' > f", "~git add f", "~git commit -qm base", "~git switch -qc feat", "~printf 'l1\\nFEAT\\nl3\\n' > f", "~git commit -qam feat",
		"~git switch -q main", "~printf 'l1\\nMAIN\\nl3\\n' > f", "~git commit -qam main", "git merge feat", "git status", "git status -s", "git diff", "cat f", "git log --oneline --graph --all",
		"git merge --abort", "git status", "cat f", "~git config merge.conflictStyle zdiff3", "git merge feat", "cat f", "~printf 'l1\\nRESOLU\\nl3\\n' > f", "git status", "git add f", "git status",
		"git commit --no-edit", "git log --oneline --graph", "git show --stat HEAD"
	]) },
	{ nom: "reset et reflog", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo b > b", "~git add b", "~git commit -qm deux", "~echo c > c", "~git add c", "~git commit -qm trois",
		"git reset --soft HEAD~1", "git status -s", "git reset HEAD~1", "git status -s", "git reset --hard HEAD", "git status -s", "git log --oneline", "git reflog", "git reset --hard HEAD@{4}",
		"git log --oneline", "git reflog", "git reset --hard ORIG_HEAD", "git log --oneline", "git checkout HEAD@{2}", "git status", "git switch -"
	]) },
	{ nom: "revert, amend, tags", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo b > b", "~git add b", "~git commit -qm deux",
		"git revert HEAD --no-edit", "git log --oneline", "git revert HEAD --no-edit", "git log -1", "git commit --amend -m 'amende'", "git log --oneline", "git tag v1", "git tag -a v2 -m 'version 2'",
		"git tag", "git show v2", "git describe --tags", "git tag -l 'v*'", "git log --oneline --decorate", "git tag -d v1", "git tag"
	]) },
	{ nom: "stash", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo aa > a", "~echo n > n", "~git add n", "~echo u > u",
		"git stash", "git status -s", "git stash list", "git stash show", "git stash pop", "git status -s", "git stash -u", "git status -s", "git stash list", "git stash pop", "git status -s",
		"git stash push -m message", "git stash list", "git stash drop", "git stash list", "git stash pop"
	]) },
	{ nom: "cherry-pick et conflit", suite: avec([
		"git init -q r", "cd r", "~printf 'l1\\nl2\\nl3\\n' > f", "~git add f", "~git commit -qm base", "~git switch -qc feat", "~printf 'l1\\nFEAT\\nl3\\n' > f", "~git commit -qam feat",
		"~echo g > g", "~git add g", "~git commit -qm 'ajoute g'", "~git switch -q main", "~printf 'l1\\nMAIN\\nl3\\n' > f", "~git commit -qam main",
		"git cherry-pick feat~1", "git status", "git cherry-pick --abort", "git status -s", "git cherry-pick feat", "git log --oneline"
	]) },
	{ nom: "rebase et conflit", suite: avec([
		"git init -q r", "cd r", "~printf 'l1\\nl2\\nl3\\n' > f", "~git add f", "~git commit -qm base", "~git switch -qc feat", "~echo g > g", "~git add g", "~git commit -qm g",
		"~echo h > h", "~git add h", "~git commit -qm h", "~git switch -q main", "~echo m > m", "~git add m", "~git commit -qm m", "~git switch -q feat",
		"git rebase main", "git log --oneline --graph --all", "git reflog", "~git switch -q main", "~printf 'l1\\nMAIN\\nl3\\n' > f", "~git commit -qam main2", "~git switch -q feat",
		"~printf 'l1\\nFEAT\\nl3\\n' > f", "~git commit -qam feat2", "git rebase main", "git status", "git rebase --abort", "git log --oneline"
	]) },
	{ nom: "rebase interactif", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo b > b", "~git add b", "~git commit -qm deux", "~echo c > c", "~git add c", "~git commit -qm trois",
		"~echo d > d", "~git add d", "~git commit -qm quatre",
		"@editeur function(t){ return t.replace(/^pick (\\w+) trois$/m, 'squash $1 trois').replace(/^pick (\\w+) quatre$/m, 'drop $1 quatre'); }|s/^pick \\([0-9a-f]*\\) trois$/squash \\1 trois/;s/^pick \\([0-9a-f]*\\) quatre$/drop \\1 quatre/",
		"~git rebase -i HEAD~3", "git log --oneline", "git log -1 --format=%B", "git status"
	]) },
	{ nom: "bisect", suite: avec([
		"git init -q r", "cd r", "~for i in 1 2 3 4 5 6 7 8; do echo $i > n$i; git add n$i; git commit -qm c$i; done",
		"git bisect start", "git bisect bad", "git bisect good HEAD~7", "git bisect bad", "git bisect good", "git bisect log", "git bisect reset", "git status"
	]) },
	{ nom: "remote, push, fetch, pull", suite: avec([
		"git init -q --bare depot.git", "git clone depot.git a", "cd a", "~echo a > a", "~git add a", "~git commit -qm un", "git push", "git push -u origin main", "git status", "git branch -vv",
		"cd ..", "git clone depot.git b", "cd b", "~echo b > b", "~git add b", "~git commit -qm deux", "git push", "cd ../a", "~echo c > c", "~git add c", "~git commit -qm trois",
		"git push", "git fetch", "git status", "git pull", "git pull --rebase", "git log --oneline --graph --all", "git push", "git remote -v", "git branch -a",
		"~git switch -qc feat", "~echo f > f", "~git add f", "~git commit -qm f", "git push", "git push -u origin feat", "git push origin --delete feat", "cd ../b", "git fetch --prune", "git pull"
	]) },
	{ nom: "renommages", suite: avec([
		"git init -q r", "cd r", "~printf 'un\\ndeux\\ntrois\\nquatre\\ncinq\\nsix\\n' > long.txt", "~echo x > x", "~git add .", "~git commit -qm base",
		"git mv long.txt court.txt", "git status", "git status -s", "git commit -m renomme", "git log --stat -1", "git show --name-status HEAD",
		"~git mv court.txt d.txt", "~printf 'un\\ndeux\\ntrois\\nquatre\\ncinq\\nSEPT\\n' > d.txt", "~git add -A", "git status -s", "git diff --cached", "git diff --cached --stat", "git commit -m 'renomme et modifie'",
		"~mkdir -p src/lib", "~git mv x src/lib/x", "git commit -m deplace", "git diff HEAD~1 --stat"
	]) },
	{ nom: "log et formats", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm 'premier' -m 'corps\tavec tab'", "~echo b > b", "~git add b", "~GIT_AUTHOR_NAME=Bob GIT_AUTHOR_EMAIL=bob@x.fr git commit -qm second",
		"~git tag v1", "~echo c > c", "~git add c", "~git commit -qm troisieme",
		"git log", "git log --format=fuller -1", "git log --pretty=short -1", "git log --pretty=medium -1", "git log --format='%H%n%P%n%T' -1", "git log --format='%an <%ae> %ad' --date=iso -1",
		"git log --format='%s|%b|' -3", "git log --author=Bob --oneline", "git log --grep=second --oneline", "git log -2 --oneline", "git log v1..HEAD --oneline", "git log HEAD~2.. --oneline",
		"git log --oneline -- b", "git shortlog HEAD", "git shortlog -sn HEAD", "git describe", "git describe --tags --long", "git log --oneline --decorate=full", "git log --format='%d %s'",
		"git show --oneline -s", "git show v1 --stat", "git rev-list --count HEAD", "git rev-list HEAD", "git log --since=2000-01-01 --oneline"
	]) },
	{ nom: "blame, grep, clean, ls", suite: avec([
		"git init -q r", "cd r", "~printf 'alpha\\nbeta\\ngamma\\n' > f", "~git add f", "~git commit -qm un", "~printf 'alpha\\nBETA\\ngamma\\ndelta\\n' > f", "~git commit -qam deux",
		"git blame f", "git blame -s f", "git grep beta", "git grep -i beta", "git grep -n gamma", "git grep -c a", "git grep nope",
		"~echo t > tmp1", "~mkdir dd", "~echo t > dd/t", "git clean -n", "git clean -nd", "git clean -f", "git status -s", "git clean -fd", "git status -s",
		"git ls-files", "git ls-tree HEAD", "git ls-tree -r --name-only HEAD", "git rev-parse --show-toplevel", "git rev-parse --git-dir", "git rev-parse --is-inside-work-tree", "git count-objects"
	]) },
	{ nom: "fusion squash, no-commit, conflits multiples", suite: avec([
		"git init -q r", "cd r", "~printf 'a\\nb\\nc\\n' > f", "~printf '1\\n2\\n' > g", "~git add .", "~git commit -qm base",
		"~git switch -qc feat", "~printf 'a\\nB\\nc\\n' > f", "~printf '1\\nDEUX\\n' > g", "~git commit -qam feat", "~git switch -q main",
		"git merge --squash feat", "git status -s", "~git commit -qm squash", "git log --oneline --graph --all", "~git reset -q --hard HEAD~1",
		"git merge --no-commit --no-ff feat", "git status", "~git merge --abort", "~printf 'a\\nX\\nc\\n' > f", "~printf '1\\nY\\n' > g", "~git commit -qam main",
		"git merge feat", "git status -s", "git diff --name-only --diff-filter=U", "git checkout --theirs f", "git checkout --ours g", "cat f g", "git add f g", "git status", "~git commit -q --no-edit",
		"git log --oneline --graph", "git log --merges --oneline", "git log --no-merges --oneline", "git log --first-parent --oneline"
	]) },
	{ nom: "rebase interactif : edit et autosquash", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "~echo b > b", "~git add b", "~git commit -qm deux", "~echo c > c", "~git add c", "~git commit -qm trois",
		"~echo cc >> c", "~git add c", "~git commit -qm 'fixup! trois'",
		"@editeur function(t){ return t.replace(/^pick (\\w+) deux$/m, 'edit $1 deux'); }|s/^pick \\([0-9a-f]*\\) deux$/edit \\1 deux/",
		"~git rebase -i --autosquash HEAD~3", "git status", "~echo bb >> b", "~git add b", "~git commit -q --amend --no-edit", "git rebase --continue", "git log --oneline", "git show --stat HEAD",
		"git reflog -6"
	]) },
	{ nom: "tags et describe", suite: avec([
		"git init -q r", "cd r", "~echo a > a", "~git add a", "~git commit -qm un", "git tag -a v0.1 -m 'v0.1'", "~echo b > b", "~git add b", "~git commit -qm deux", "~echo c > c", "~git add c", "~git commit -qm trois",
		"git describe", "git describe --abbrev=0", "git tag -n", "git tag --contains HEAD~2", "git cat-file -p v0.1", "git rev-parse v0.1", "git rev-parse 'v0.1^{commit}'", "git tag v0.1", "git tag -f v0.1 HEAD",
		"git show-ref", "git for-each-ref --format='%(refname:short) %(objecttype)'", "git tag -d v0.1", "git describe"
	]) },
	{ nom: "bisect run", suite: avec([
		"git init -q r", "cd r", "~for i in 1 2 3 4 5 6 7 8 9 10; do echo $i > f; git add f; git commit -qm c$i; done",
		"git bisect start HEAD HEAD~9", "git bisect run bash -c 'test $(cat f) -lt 7'", "git bisect log", "git bisect reset", "git log --oneline -1"
	]) },
	{ nom: "erreurs courantes", suite: avec([
		"git status", "git log", "git init -q r", "cd r", "git log", "git show", "git rev-parse HEAD", "git commit -m vide", "git branch x", "git switch x", "git checkout nope", "git merge nope",
		"git frobnicate", "git comit", "git add", "git reset --hard nope", "git diff nope", "git stash", "git tag", "~echo a > a", "~git add a", "~git commit -qm un", "git commit -m rien",
		"git switch -c main", "git branch -d main", "git rebase --continue", "git cherry-pick --continue", "git merge --abort", "git revert nope", "git push", "git pull", "git remote rm nope"
	]) }
];
