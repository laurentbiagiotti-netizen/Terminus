/**
 * « Et si l'étudiant ne parle jamais à ce personnage ? » et « Et s'il s'y prend autrement ? » : chapitre 9 (la Chronothèque), audit D.
 *
 * 1. Pour chaque personnage (ou objet à lire) dont la lecture a un effet sur le chemin principal (Laurent, l'Ordre, les
 *    quatorze maîtres), on rejoue le chemin principal de docs/solution.md en supprimant toute lecture de ce personnage.
 *    Le chemin doit alors soit aboutir, soit afficher en chemin un message qui nomme le personnage et la commande pour
 *    lui parler (cat NOM).
 * 2. Les détours d'un étudiant réel, qui ne doivent jamais le bloquer : tirer la Chronique avant son premier push (le
 *    refus doit arriver quand même), un pull sans --rebase, un commit sans -m (l'éditeur), un paradoxe scellé avec -m,
 *    un rebase -i abandonné puis repris, un dépôt cassé que l'on régénère, l'indice de chaque étape.
 *
 * Lancer : node --max-old-space-size=3000 tests/sans-parler-d.js   (--liste pour la liste des cas)
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var bavard = process.argv.indexOf("--liste") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }

var DOC = fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8");
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) throw new Error("docs/solution.md : pas de partie " + n);
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}
/* L'étudiant pressé ne lit ni la radio, ni le Grand Sablier, ni la Chronique. */
function presse(c){ return !/^(cat (Radio|GrandSablier|Chronique)(; )?)+$/.test(c.trim()); }
var CH9 = [91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103];
function jouer(jeu, parties){
	var sorties = [];
	parties.forEach(function(p){ partie(p).filter(presse).forEach(function(c){ sorties.push(jeu.jouerSolution(c)); }); });
	return sorties.join("\n");
}
function sansLire(jeu, expression){
	jeu.lire("var SANS_LIRE = " + expression + "; (function(){ var avant = Shell.apresLecture; Shell.apresLecture = function(t){ if (SANS_LIRE && t.item === SANS_LIRE) return; return avant.apply(this, arguments); }; })()");
}
function sortirSsh(jeu){ for (var i = 0; i < 10 && jeu.lire("Shell.pile_ssh && Shell.pile_ssh.length"); i++) jeu.taper("exit"); }
function restantes(jeu){ return jeu.lire("QUETES_CH9.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"); }
function nomme(sortie, nom){
	var n = nom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp("cat " + n + "\\b|auprès (de |d')" + n + "\\b").test(sortie);
}
function neuf(){ var jeu = monde.nouveauMonde({}); jeu.taper("chapitre 9", "oui"); return jeu; }

/* ================================================================== */
/* 1. Chaque personnage à effet, jamais lu                              */
/* ================================================================== */
(function(){
	var cles = monde.nouveauMonde({}).lire("Object.keys(MAITRES_CH9)");
	var personnages = [["LaurentChronothequeCh9", "Laurent"], ["OrdreChronothequeCh9", "Ordre"]].concat(cles.map(function(k){ return ["MAITRES_CH9." + k + ".item", null]; }));
	personnages.forEach(function(p){
		var jeu = neuf();
		var nom = p[1] || jeu.lire(p[0] + ".itemname");
		sansLire(jeu, p[0]);
		var s = jouer(jeu, CH9), reste = restantes(jeu);
		if (bavard) console.log("chapitre 9 sans " + nom + " : " + (reste ? "restent " + reste.split(" ").length + " étapes (" + reste.split(" ").slice(0, 3).join(" ") + "...)" : "le chemin aboutit"));
		verifier(reste === "" || nomme(s, nom), "chapitre 9 sans lire " + nom + " : bloqué (" + reste.split(" ").slice(0, 4).join(" ") + "...) sans qu'un message nomme " + nom);
		sortirSsh(jeu);
	});
})();

/* Les sorts git et gh : l'aide dit toujours chez qui ils s'apprennent, et ce maître est joignable. */
(function(){
	var jeu = neuf();
	["git", "gh"].forEach(function(s){
		var o = jeu.lire("Shell.ouApprendre ? Shell.ouApprendre(" + JSON.stringify(s) + ") : ''");
		verifier(/Chronotheque|cat (Gamaliel|Amine|Laurent)/.test(o), "Shell.ouApprendre(" + s + ") nomme qui l'enseigne à la Chronothèque : " + o);
	});
	verifier(/cat (Gamaliel|Laurent)/.test(jeu.taper("git status")), "git avant de l'apprendre : le message dit qui l'enseigne (Laurent, au lutrin, ou Gamaliel)");
	// Amine lu trop tôt : il n'enseigne pas gh, mais l'aide sait toujours où l'apprendre.
	jeu.taper("cat ~/Cybersup/Chronotheque/HautConseil/Amine");
	verifier(jeu.lire("state.knows('gh')") === false, "Amine lu trop tôt : gh pas encore appris");
	contient(jeu.taper("gh pr list"), "Amine", "gh avant d'être Gardien : le message nomme Amine");
})();

/* ================================================================== */
/* 2. Les détours d'un étudiant réel                                    */
/* ================================================================== */
function jusqua(jeu, a, b){ for (var p = a; p <= b; p++) partie(p).forEach(function(c){ jeu.jouerSolution(c); }); }
(function(){
	// Il tire la Chronique avant son premier push : Jeremy repousse, et le refus arrive quand même.
	var jeu = neuf();
	jusqua(jeu, 91, 99);
	["cd ~/Cybersup/Chronotheque/PortesDesRoyaumes; cat Jeremy", "ssh-copy-id royaume", "ssh royaume", "exit", "cd ~/chronotheque", "git clone royaume:/srv/git/chronique.git", "cd chronique",
		"git remote -v", "git branch -vv", "git pull"].forEach(function(c){ jeu.jouerSolution(c); });
	jeu.jouerSolution("echo \"- la Chronothèque se réveille.\" >> chronique.md");
	jeu.jouerSolution("git commit -am \"chronique: la Chronothèque se réveille\"");
	contient(jeu.jouerSolution("git push"), "rejected", "pull avant le premier push : le push est quand même refusé (Jeremy a repoussé)");
	// Un pull simple (fusion) au lieu de --rebase : rien n'est perdu, et pull --rebase se fait encore ensuite.
	jeu.jouerSolution("git fetch");
	jeu.jouerSolution("git log --oneline main..origin/main");
	jeu.jouerSolution("git pull --no-rebase --no-edit");
	jeu.jouerSolution("git push");
	verifier(jeu.lire("!state.quests.n9_synchro"), "un pull en fusion : la leçon de pull --rebase reste à faire");
	var ind = jeu.taper("indice");
	verifier(/pull --rebase/.test(ind) || /indice/i.test(ind), "l'indice parle de pull --rebase : " + ind.substring(0, 200));
	jeu.jouerSolution("git pull --rebase");
	verifier(jeu.lire("!!state.quests.n9_synchro"), "pull --rebase après coup : n9_synchro (pas de blocage)");
})();
(function(){
	// Un commit sans -m ouvre l'éditeur ; un paradoxe scellé avec -m ; un rebase -i abandonné puis repris.
	var jeu = neuf();
	jusqua(jeu, 91, 91);
	["cd SalleDesSceaux; cat Gamaliel", "git config --global user.name \"<moi>\"", "git config --global user.email \"<moi>@chronique.lan\"", "cd ~/chronotheque/premier-sceau", "git init", "git add grimoire.md"].forEach(function(c){ jeu.jouerSolution(c); });
	jeu.editer("function(t){ return 'grimoire: ouvre le grimoire\\n' + t; }");
	var r = jeu.taper("git commit");
	contient(r, "grimoire: ouvre le grimoire", "un commit sans -m : l'éditeur s'ouvre, le message écrit devient le sceau");
	var j2 = neuf();
	jusqua(j2, 91, 95);
	["cd ~/Cybersup/Chronotheque/SalleDesParadoxes; cat Kenyonn", "cd ~/chronotheque/paradoxe", "git merge prophetie-sud", "nano prophetie.txt", "git add prophetie.txt"].forEach(function(c){ j2.jouerSolution(c); });
	j2.jouerSolution("git commit -m \"prophetie: tranche le paradoxe\"");
	verifier(j2.lire("!!state.quests.n9_paradoxe"), "un paradoxe scellé avec -m : n9_paradoxe");
	var j3 = neuf();
	jusqua(j3, 91, 97);
	["cd ~/Cybersup/Chronotheque/AtelierDesPropheties; cat Guillaume", "cd ~/chronotheque/prophetie", "git switch carte-des-vents", "git rebase main", "git switch main", "git merge --ff-only carte-des-vents", "git switch brouillon"].forEach(function(c){ j3.jouerSolution(c); });
	j3.editer("function(t){ return t.split('\\n').map(function(l){ return l.replace(/^pick (\\S+) debug/, 'edit $1 debug'); }).join('\\n'); }");
	j3.taper("git rebase -i main");
	contient(j3.taper("git status"), "rebase", "un rebase -i arrêté en route : status le dit");
	j3.taper("git rebase --abort");
	verifier(j3.lire("!G9.statut(DEPOTS_CH9.prophetie).etat"), "rebase --abort : le dépôt revient à la normale");
	["git rebase -i main", "git commit --amend -m \"vents: ajoute le vent du nord\"", "git log --oneline main..brouillon"].forEach(function(c){ j3.jouerSolution(c); });
	verifier(j3.lire("!!state.quests.n9_reecriture"), "le rebase -i repris après un abandon : n9_reecriture");
})();
(function(){
	// Un dépôt cassé (le .git effacé) se régénère, et l'étape se fait ensuite ; chaque étape a son indice, jamais vide.
	var jeu = neuf();
	jusqua(jeu, 91, 93);
	jeu.taper("cd ~/chronotheque/annales");
	jeu.taper("rm -rf .git");
	contient(jeu.taper("git log"), "not a git repository", "annales sans .git : l'erreur du vrai");
	jeu.taper("cd ~");
	contient(jeu.taper("regenerer annales"), "annales", "regenerer annales");
	jusqua(jeu, 94, 94);
	verifier(jeu.lire("!!state.quests.n9_oracle && !!state.quests.n9_miroir"), "après régénération, l'Oracle se fait (les réponses suivent le nouveau dépôt)");
	var vides = jeu.lire("QUETES_CH9.filter(function(q){ var i = INDICES_CH9[q.id]; return !i || !i.length || !i[0] || !i[1]; }).map(function(q){ return q.id; }).join(' ')");
	verifier(vides === "", "chaque étape a ses deux indices (le coup de pouce et la recette) : " + vides);
	var sansTitre = jeu.lire("QUETES_CH9.filter(function(q){ return !q.indice; }).map(function(q){ return q.id; }).join(' ')");
	verifier(sansTitre === "", "chaque étape a sa phrase d'aide dans le journal : " + sansTitre);
})();

console.log("sans-parler-d : " + ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exitCode = 1;
