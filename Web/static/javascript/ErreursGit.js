/**
 * ErreursGit.js : une ligne d'aide en français, en gris, sous les erreurs fréquentes de git et de gh.
 *
 * Le moteur git (SortsGit*.js) écrit mot pour mot les messages anglais du vrai git ; on n'y touche pas.
 * Ce fichier enveloppe Shell.appeler pour les sorts git et gh : après la commande, il reconnaît l'erreur
 * dans ce qu'elle a écrit et ajoute une ligne qui dit ce qui se passe et comment s'en sortir.
 *
 * - La ligne part à l'écran seulement : jamais dans un tuyau ni dans un objet (git ... | grep, 2> erreurs.txt).
 *   Elle passe par io.errFin, écrite après la sortie, et seulement si le message anglais lui-même arrive à l'écran.
 * - Une même aide se montre au plus AIDES_GIT_MAX fois par partie (state.aidesGit, sauvegardé), puis plus jamais.
 * - AIDES_ERREURS_GIT = false les coupe (les comparaisons au vrai git, tests/git-reel.js et tests/git-moteur.js).
 * - Rien ici ne doit casser une commande : tout est sous try/catch.
 *
 * Les images du chapitre 9 : un commit est un sceau, une branche une ligne du destin, HEAD l'œil,
 * l'index l'autel, un remote un Royaume, un conflit un paradoxe.
 */

var AIDES_ERREURS_GIT = true;
var AIDES_GIT_MAX = 3;

/* La sous-commande de git, après les options globales (-C dossier, -c cle=valeur, --no-pager...). */
function sousCommandeAideGit(args){
	var a = args || [];
	for (var i = 0; i < a.length; i++){
		if (a[i] === "-C" || a[i] === "-c"){ i++; continue; }
		if (String(a[i]).charAt(0) === "-") continue;
		return a[i];
	}
	return "";
}

/* HEAD détaché : la branche où revenir (main, ou master dans un dépôt qui n'a que master). */
function aideDetacheGit(){
	var branche = "main";
	try {
		var R = gTrouverDepot(current_room);
		if (R && !gRef(R, "refs/heads/main") && gRef(R, "refs/heads/master")) branche = "master";
	} catch (e){}
	return "(Ton œil n'est sur aucune ligne du destin : git switch " + branche + " pour revenir, ou git switch -c NOM pour garder ce que tu fais ici.)";
}

/*
 * Les règles, de la plus précise à la plus générale : la première qui reconnaît le texte donne l'aide.
 * nom : "git" ou "gh" (les deux si absent) ; sous : les sous-commandes concernées (toutes si absent) ;
 * quand(c) : une condition de plus ; aide : un texte, ou une fonction (correspondance, c) -> texte.
 */
var REGLES_AIDES_GIT = [
	{ cle: "identite", re: /Please tell me who you are/,
		aide: "(Git doit savoir qui pose ce sceau : git config --global user.name \"Ton Nom\", puis git config --global user.email toi@exemple.fr, et recommence.)" },
	{ cle: "cle-ssh", re: /(\S+@\S+): Permission denied \(publickey\)/,
		aide: function(m){ return "(Le Royaume ne connaît pas ta clé SSH : ssh-copy-id " + m[1] + " pour l'y poser (ssh-keygen d'abord si tu n'as pas de clé), puis recommence.)"; } },
	{ cle: "cle-ssh", re: /Permission denied \(publickey\)/,
		aide: "(Le Royaume ne connaît pas ta clé SSH : ssh-copy-id UTILISATEUR@royaume pour l'y poser (ssh-keygen d'abord si tu n'as pas de clé), puis recommence.)" },
	{ cle: "hote-inconnu", re: /Could not resolve hostname/,
		aide: "(Ce nom de Royaume est inconnu : vérifie l'adresse avec git remote -v, et corrige-la avec git remote set-url origin ADRESSE.)" },
	{ cle: "depot-distant-absent", re: /does not appear to be a git repository/,
		aide: "(Il n'y a pas de dépôt à cette adresse : vérifie le nom du Royaume et le chemin avec git remote -v.)" },
	{ cle: "distant-illisible", re: /Could not read from remote repository/,
		aide: "(Le Royaume refuse de répondre : vérifie l'adresse (git remote -v) et que ta clé SSH y est posée (ssh-copy-id UTILISATEUR@royaume).)" },
	{ cle: "pas-un-depot", re: /not a git repository/,
		aide: "(Tu n'es dans aucun dépôt : cd dans le dossier du projet (celui qui contient .git), ou git init pour en créer un ici.)" },
	{ cle: "rempart", re: /\[remote rejected\]/,
		aide: "(Le rempart du Royaume a refusé ce push, la raison est entre parenthèses. Branche protégée ? Pousse ta propre ligne du destin (git push -u origin NOM), puis gh pr create.)" },
	{ cle: "push-fetch-first", re: /Updates were rejected because the remote contains work/,
		aide: "(Le Royaume a des sceaux que tu n'as pas encore : git pull pour les récupérer et les unir aux tiens, puis git push.)" },
	{ cle: "push-en-retard", re: /Updates were rejected because the tip of your current branch is behind/,
		aide: "(Ta ligne du destin est en retard sur celle du Royaume : git pull (ou git pull --rebase), puis git push. Jamais --force sur une branche partagée.)" },
	{ cle: "tag-publie", re: /Updates were rejected because the tag already exists/,
		aide: "(Ce tag existe déjà au Royaume : un tag publié ne se déplace pas, crée plutôt un nouveau tag.)" },
	{ cle: "sans-destination", re: /No configured push destination/,
		aide: "(Ce dépôt n'est relié à aucun Royaume : git remote add origin ADRESSE, puis git push -u origin NOM.)" },
	{ cle: "sans-amont", re: /The current branch (\S+) has no upstream branch/,
		aide: function(m){ return "(Cette ligne du destin n'est pas encore reliée au Royaume : git push -u origin " + m[1] + " la crée là-bas et la relie.)"; } },
	{ cle: "src-refspec", re: /src refspec (\S+) does not match any/,
		aide: function(m){ return "(Tu n'as aucune branche « " + m[1] + " » portant un sceau : vérifie son nom avec git branch, et pose un premier git commit si le dépôt est vide.)"; } },
	{ cle: "pas-de-suivi", re: /There is no tracking information for the current branch/,
		aide: "(Ta ligne du destin ne suit aucune branche du Royaume : précise-la (git pull origin NOM), ou relie-la une fois pour toutes avec git branch -u origin/NOM.)" },
	{ cle: "divergence", re: /divergent branches|Not possible to fast-forward/,
		aide: "(Ta ligne et celle du Royaume ont chacune des sceaux que l'autre n'a pas : git pull --rebase pour rejouer les tiens par-dessus, ou git pull --no-rebase pour les unir.)" },
	{ cle: "paradoxe-en-cours", re: /you need to resolve your current index first|is not possible because you have unmerged files|You have not concluded your merge/,
		aide: "(Un paradoxe attend encore d'être tranché : git status montre les fichiers en conflit. Corrige-les, git add FICHIER, puis termine (git commit ou --continue), ou renonce avec --abort.)" },
	{ cle: "paradoxe-sequence", re: /could not (?:apply|revert) [0-9a-f]+\.\.\.[\s\S]*?git (rebase|cherry-pick|revert) --continue/,
		aide: function(m){ return "(Paradoxe pendant le " + m[1] + " : garde la bonne version entre <<<<<<< et >>>>>>>, git add FICHIER, puis git " + m[1] + " --continue (ou git " + m[1] + " --abort pour tout annuler).)"; } },
	{ cle: "paradoxe-stash", re: /^CONFLICT \(/m, sous: ["stash"],
		aide: "(Paradoxe en ressortant ton stash : garde la bonne version entre <<<<<<< et >>>>>>>, puis git add FICHIER. Le stash est gardé : git stash drop une fois réglé.)" },
	{ cle: "paradoxe-fusion", re: /Automatic merge failed/,
		aide: "(Paradoxe : les deux lignes du destin ont changé les mêmes lignes. Garde la bonne version entre <<<<<<< et >>>>>>>, puis git add FICHIER et git commit (ou git merge --abort).)" },
	{ cle: "locales-ecrasees", re: /[Yy]our local changes (to the following files )?would be overwritten/,
		aide: "(Des changements pas encore scellés seraient écrasés : git commit pour les sceller, ou git stash pour les mettre de côté (git stash pop ensuite), puis recommence.)" },
	{ cle: "non-suivis-ecrases", re: /untracked working tree files would be overwritten/,
		aide: "(Des fichiers que git ne suit pas seraient écrasés : déplace-les ou supprime-les (ou scelle-les avec git add puis git commit), puis recommence.)" },
	{ cle: "rebase-sale", re: /cannot rebase: (You have unstaged changes|Your index contains uncommitted changes)/,
		aide: "(Le rebase veut une copie de travail propre : git stash (ou git commit), puis git rebase, puis git stash pop.)" },
	{ cle: "branche-attendue", re: /a branch is expected, got/,
		aide: "(git switch n'accepte qu'une ligne du destin : git switch --detach REF pour poser l'œil sur ce sceau, ou git switch -c NOM REF pour en faire une branche.)" },
	{ cle: "pathspec-inconnu", re: /did not match any file\(s\) known to git/,
		aide: "(Git ne connaît ni branche ni fichier de ce nom : vérifie l'orthographe avec git branch -a et git status. Pour créer une branche : git switch -c NOM.)" },
	{ cle: "pathspec-fichier", re: /pathspec '[^']*' did not match any files/,
		aide: "(Aucun fichier de ce nom ici : vérifie avec ls et git status ; le chemin part du dossier où tu es.)" },
	{ cle: "reference-invalide", re: /fatal: invalid reference:/,
		aide: "(Cette branche n'existe pas : git branch -a liste les lignes du destin, git switch -c NOM en crée une.)" },
	{ cle: "revision-inconnue", re: /unknown revision or path not in the working tree/,
		aide: "(Git ne connaît ni sceau, ni branche, ni fichier de ce nom : git log --oneline et git branch -a montrent ce qui existe.)" },
	{ cle: "histoires-etrangeres", re: /refusing to merge unrelated histories/,
		aide: "(Ces deux histoires n'ont aucun sceau en commun. Pour les unir quand même : ajoute --allow-unrelated-histories à ton git pull ou git merge.)" },
	{ cle: "branche-existe", re: /a branch named '[^']*' already exists/,
		aide: "(Cette ligne du destin existe déjà : git switch NOM pour y aller, ou choisis un autre nom.)" },
	{ cle: "royaume-existe", re: /error: remote \S+ already exists/,
		aide: "(Ce Royaume est déjà enregistré sous ce nom : git remote -v pour le voir, git remote set-url NOM ADRESSE pour changer son adresse.)" },
	{ cle: "clone-existe", re: /destination path '[^']*' already exists and is not an empty directory/,
		aide: "(Ce dossier existe déjà, tu as sans doute déjà cloné : cd dedans, ou clone sous un autre nom (git clone ADRESSE autre-nom).)" },
	{ cle: "pas-fusionnee", re: /is not fully merged/,
		aide: "(Cette ligne du destin porte des sceaux qui ne sont nulle part ailleurs : fusionne-la d'abord, ou git branch -D NOM pour la supprimer quand même.)" },
	{ cle: "aucun-sceau", re: /does not have any commits yet/,
		aide: "(Aucun sceau encore dans ce dépôt : git add FICHIER, puis git commit -m \"message\" pour poser le premier.)" },
	{ cle: "add-sans-rien", re: /Nothing specified, nothing added/,
		aide: "(Dis à git quoi poser sur l'autel : git add FICHIER, ou git add . pour tout ce qui a changé ici.)" },
	{ cle: "pas-sur-une-branche", re: /You are not currently on a branch/,
		aide: "(Ton œil n'est sur aucune ligne du destin : git switch -c NOM pour en créer une ici, puis git push -u origin NOM.)" },
	{ cle: "detache", re: /You are in 'detached HEAD' state/, aide: aideDetacheGit },
	{ cle: "detache", re: /^HEAD is now at /m, sous: ["switch"],
		quand: function(c){ return c.args.indexOf("--detach") > -1 || c.args.indexOf("-d") > -1; },
		aide: aideDetacheGit },
	{ cle: "commande-inconnue", re: /is not a git command/, nom: "git",
		aide: "(Cette commande git n'existe pas : vérifie l'orthographe ; git --help liste les plus courantes.)" },
	{ cle: "commit-sans-add", re: /no changes added to commit/, sous: ["commit"],
		aide: "(Tes changements ne sont pas sur l'autel : git add FICHIER d'abord (ou git commit -a pour les fichiers déjà suivis), puis git commit.)" },
	{ cle: "commit-non-suivis", re: /nothing added to commit but untracked files present/, sous: ["commit"],
		aide: "(Tes nouveaux fichiers ne sont pas encore suivis : git add FICHIER pour les poser sur l'autel, puis git commit.)" },
	{ cle: "commit-depot-vide", re: /nothing to commit \(create\/copy files/, sous: ["commit"],
		aide: "(Le dépôt est vide : crée un fichier, pose-le sur l'autel avec git add FICHIER, puis git commit.)" },
	{ cle: "commit-rien", re: /nothing to commit, working tree clean/, sous: ["commit"],
		aide: "(Rien à sceller : rien n'a changé depuis le dernier sceau. Modifie un fichier, pose-le sur l'autel avec git add FICHIER, puis git commit.)" },
	/* gh, la forge */
	{ cle: "gh-pousser-dabord", re: /you must first push the current branch to a remote/, nom: "gh",
		aide: "(Pousse d'abord ta ligne du destin au Royaume : git push -u origin NOM, puis gh pr create.)" },
	{ cle: "gh-meme-branche", re: /must be on a branch named differently than/, nom: "gh",
		aide: "(Une demande de fusion part de ta propre ligne du destin : git switch -c NOM, scelle, git push -u origin NOM, puis gh pr create.)" },
	{ cle: "gh-aucun-sceau", re: /No commits between/, nom: "gh",
		aide: "(Ta branche n'a aucun sceau de plus que la base : scelle (git commit) et pousse (git push) d'abord.)" },
	{ cle: "gh-non-fusionnable", re: /the base branch policy prohibits the merge/, nom: "gh",
		aide: "(Le rempart attend encore des revues ou des vérifications réussies : gh pr checks et gh pr view NUMÉRO disent ce qui manque.)" },
	{ cle: "gh-sans-royaume", re: /no git remotes found/, nom: "gh",
		aide: "(Ce dépôt n'est relié à aucun Royaume : git remote add origin ADRESSE d'abord.)" },
	{ cle: "gh-commande-inconnue", re: /unknown command "[^"]*" for "gh/, nom: "gh",
		aide: "(Cette commande gh n'existe pas : gh --help liste les commandes.)" }
];

/*
 * L'aide pour ce qu'une commande a écrit : { cle, texte, flux } (flux : "sortie" ou "erreur"), ou null.
 * sortie : la sortie normale ; erreurs : ce qui est parti sur la sortie des erreurs (sans couleurs).
 */
function aideErreurGit(nom, args, sortie, erreurs){
	var c = { nom: nom, args: args || [], sous: nom === "git" ? sousCommandeAideGit(args) : (args && args[0]) || "" };
	var textes = [{ flux: "erreur", t: String(erreurs || "") }, { flux: "sortie", t: String(sortie || "") }];
	for (var i = 0; i < REGLES_AIDES_GIT.length; i++){
		var r = REGLES_AIDES_GIT[i];
		if (r.nom && r.nom !== nom) continue;
		if (r.sous && r.sous.indexOf(c.sous) === -1) continue;
		if (r.quand && !r.quand(c)) continue;
		for (var k = 0; k < textes.length; k++){
			if (!textes[k].t) continue;
			var m = r.re.exec(textes[k].t);
			if (m) return { cle: r.cle, texte: typeof r.aide === "function" ? r.aide(m, c) : r.aide, flux: textes[k].flux };
		}
	}
	return null;
}

/* Après un git ou un gh : pose l'aide à l'écran si l'erreur y est arrivée, et si elle n'a pas déjà servi trois fois. */
function poserAideErreurGit(nom, args, io, sortie, echec, debut){
	if (!AIDES_ERREURS_GIT || typeof state === "undefined" || !state || !io || typeof io.errFin !== "function") return;
	// La ligne part par la sortie des erreurs, après tout le reste : il faut qu'elle aille à l'écran.
	if (!io.sortie2 || io.sortie2.t !== "ecran" || (Shell.surEcran && !Shell.surEcran())) return;
	var erreurs = (io.erreurs || []).slice(debut).join("\n");
	if (echec && echec instanceof ShellError) erreurs += (erreurs ? "\n" : "") + String(echec.message || "");
	var a = aideErreurGit(nom, args, typeof sortie === "string" ? sansAnsi(sortie) : "", sansAnsi(erreurs));
	if (!a) return;
	// Un message écrit sur la sortie normale qui part dans un tuyau ou un objet : pas d'aide.
	if (a.flux === "sortie" && !io.tty) return;
	if (!state.aidesGit || typeof state.aidesGit !== "object") state.aidesGit = {};
	var vu = state.aidesGit[a.cle] || 0;
	if (vu >= AIDES_GIT_MAX) return;
	state.aidesGit[a.cle] = vu + 1;
	io.errFin(C.gris(a.texte));
}

(function(){
	var APPELER_AVANT_AIDES_GIT = Shell.appeler;
	Shell.appeler = function(nom, args, io){
		if ((nom !== "git" && nom !== "gh") || !io || typeof io !== "object") return APPELER_AVANT_AIDES_GIT.apply(this, arguments);
		var debut = io.erreurs && io.erreurs.length ? io.erreurs.length : 0;
		var sortie, echoue = false, echec = null;
		try { sortie = APPELER_AVANT_AIDES_GIT.apply(this, arguments); }
		catch (e){ echoue = true; echec = e; }
		try { poserAideErreurGit(nom, args, io, sortie, echec, debut); } catch (x){ /* une aide ne doit jamais casser un sort */ }
		if (echoue) throw echec;
		return sortie;
	};
})();
