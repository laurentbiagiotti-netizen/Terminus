/**
 * Chapitre9.js : la Chronique d'Éternité. Le chapitre de Git, de zéro à Chronomancien.
 *
 * Numéro interne 10 (le 4 est l'épreuve finale, puis chaque chapitre décale d'un cran), affiché 9.
 * Au lendemain de la bataille du Grand Port, une empreinte de clé et deux initiales, P.G., mènent sous la vieille tour de
 * l'horloge de Cybersup. Là dort la Chronique : le grimoire où tout ce qui arrive à l'école est scellé. C'est un dépôt Git.
 * Le Faussaire a commencé à la réécrire. À l'aube du quatrième jour, la Grande Synchronisation enverra sa version à tous
 * les Royaumes. Le joueur entre Apprenti du Temps ; il doit en sortir Chronomancien.
 *
 * Les analogies : un commit est un sceau, l'index est l'autel des offrandes, HEAD est l'œil du voyageur, une branche est
 * une ligne du destin, une fusion une confluence, un conflit un paradoxe, rebase réécrit une prophétie, stash est la besace,
 * cherry-pick rapporte une relique, un tag est un menhir, bisect est la chasse du Minotaure, reflog le Livre des ombres,
 * reset --hard le sort interdit, revert le contre-sort, un remote un Royaume, une Pull Request une requête au Haut-Conseil,
 * la CI ses golems, un hook une rune de garde, une signature un sceau de cire.
 *
 * Ce fichier pose le monde (la Chronothèque, ses quatorze salles, la boîte de Laurent), les rangs et leurs épreuves, les
 * étapes validées sur l'ÉTAT RÉEL des dépôts (le moteur : SortsGit*.js ; les dépôts : Chronique.js), les nuits, la
 * Grande Synchronisation et la bataille du temps, l'intégrité de la Chronique, le rapport, le certificat, le cliffhanger
 * et le départ direct. Chronotheque.js fait vivre les maîtres, leurs défis, les badges et les commandes sablier et sceaux ;
 * HabitantsChronique.js, les quêtes annexes.
 *
 * Strictement défensif : on scelle, on enquête, on répare, on protège. Le Faussaire n'est jamais imité : on le démasque.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* L'accès au moteur Git : tout passe par ici, et rien ne doit lever    */
/* ------------------------------------------------------------------ */

var G9 = {
	essai: function(f, defaut){ try { var r = f(); return r === undefined ? defaut : r; } catch (e){ return defaut; } },
	depot: function(ch){ return G9.essai(function(){ return typeof gitDepot === "function" ? gitDepot(null, ch) : null; }, null); },
	resoudre: function(ch, rev){ return G9.essai(function(){ return gitResoudre(null, ch, rev); }, null); },
	commit: function(ch, h){ return G9.essai(function(){ return h ? gitCommitLu(null, ch, h) : null; }, null); },
	historique: function(ch, rev, opts){ return G9.essai(function(){ return gitHistorique(null, ch, rev, opts || {}) || []; }, []); },
	statut: function(ch){ return G9.essai(function(){ return gitStatut(null, ch); }, null); },
	fichier: function(ch, rev, f){ return G9.essai(function(){ return gitFichierA(null, ch, rev, f); }, null); },
	ancetre: function(ch, a, b){ return !!a && !!b && G9.essai(function(){ return gitEstAncetre(null, ch, a, b); }, false); },
	diff: function(ch, a, b){ return G9.essai(function(){ return gitDiffTexte(null, ch, a, b) || ""; }, ""); },
	/* Sur royaume (dépôt nu). */
	resoudreR: function(rev){ return G9.essai(function(){ return gitResoudre(ROYAUME_CH9, DEPOT_ROYAUME_CH9, rev); }, null); },
	commitR: function(h){ return G9.essai(function(){ return h ? gitCommitLu(ROYAUME_CH9, DEPOT_ROYAUME_CH9, h) : null; }, null); },
	historiqueR: function(rev){ return G9.essai(function(){ return gitHistorique(ROYAUME_CH9, DEPOT_ROYAUME_CH9, rev, {}) || []; }, []); },
	fichierR: function(rev, f){ return G9.essai(function(){ return gitFichierA(ROYAUME_CH9, DEPOT_ROYAUME_CH9, rev, f); }, null); },
	ancetreR: function(a, b){ return !!a && !!b && G9.essai(function(){ return gitEstAncetre(ROYAUME_CH9, DEPOT_ROYAUME_CH9, a, b); }, false); }
};
function DCh9(cle){ return DEPOTS_CH9[cle]; }
/* Les lignes ajoutées par un sceau (les + de son diff avec son premier parent). */
function ajoutsCh9(ch, h){
	var c = G9.commit(ch, h);
	if (!c) return [];
	var p = (c.parents || [])[0] || null;
	return lignesDe(G9.diff(ch, p, h)).filter(function(l){ return /^\+/.test(l) && !/^\+\+\+/.test(l); }).map(function(l){ return l.substring(1); });
}
function retraitsCh9(ch, h){
	var c = G9.commit(ch, h);
	if (!c) return [];
	var p = (c.parents || [])[0] || null;
	return lignesDe(G9.diff(ch, p, h)).filter(function(l){ return /^-/.test(l) && !/^---/.test(l); }).map(function(l){ return l.substring(1); });
}
/* Les sceaux de rev qui ne sont pas des ancêtres de base (base exclue). */
function sceauxDepuisCh9(ch, rev, base){
	var l = G9.historique(ch, rev), r = [];
	for (var i = 0; i < l.length; i++){
		if (l[i] === base || (base && G9.ancetre(ch, l[i], base))) continue;
		r.push(l[i]);
	}
	return r;
}
function messageCh9(ch, h){ var c = G9.commit(ch, h); return c ? String(c.message || "").trim() : ""; }
function aDesMarqueursCh9(t){ return /^(<{7}|={7}|>{7})( |$)/m.test(t || ""); }
function propreCh9(ch, ignores){
	var s = G9.statut(ch);
	if (!s || s.etat || (s.conflits || []).length) return false;
	var ok = function(l){ return (l || []).filter(function(f){ return (ignores || ["NOTE.txt"]).indexOf(String(f.chemin || f)) === -1; }).length === 0; };
	return ok(s.indexees) && ok(s.modifiees);
}
function sansAccentCh9(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

/* ------------------------------------------------------------------ */
/* Les lieux : la Chronothèque, ses quatorze salles, la boîte de Laurent */
/* ------------------------------------------------------------------ */

function salleCh9(nom, intro, img){
	var r = lieuDuChapitre10(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh9(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	lieu.addItem(it);
	return it;
}

var ChronothequeCh9 = salleCh9("Chronotheque",
	"La Chronothèque, sous la vieille tour de l'horloge de Cybersup. Un escalier de pierre descend en spirale jusqu'à une salle ronde, si haute qu'on n'en voit pas la voûte. " +
	"Au centre, le Grand Sablier : un sablier de la taille d'un homme, dont le sable coule vers le haut. Devant lui, sur un lutrin, enchaînée, la Chronique : un grimoire épais comme un mur, dont les pages se tournent seules. " +
	"Quatorze portes s'ouvrent dans la pierre, chacune gardée par un maître du temps. Laurent t'attend près du lutrin ; la radio de Grace grésille.",
	"loc_chronotheque.gif");

/* Les quatorze salles : la clé (celle des badges), le nom du lieu, le maître, le titre, les étapes, l'acte, l'image, l'intro. */
var SALLES_CH9 = [
	{ cle: "sceaux", nom: "SalleDesSceaux", maitre: "Gamaliel", titre: "la Salle des Sceaux", acte: 1, image: "loc_salle_sceaux.gif", etapes: ["n9_config", "n9_init"],
	  intro: "La Salle des Sceaux : un établi de pierre couvert de cire rouge, des matrices de sceaux alignées, et trois anneaux pendus au mur, du plus large au plus étroit. Ici, on apprend à se nommer, puis à ouvrir son premier grimoire (git config, git init)." },
	{ cle: "autel", nom: "AutelDesOffrandes", maitre: "Bénédicte", titre: "l'Autel des Offrandes", acte: 1, image: "loc_autel_offrandes.gif", etapes: ["n9_sceau", "n9_voile", "n9_offrande"],
	  intro: "L'Autel des Offrandes : une longue table de marbre, des cierges, et un voile de soie tendu sur un coin de la salle. On n'y dépose que ce qui mérite d'être scellé (l'index, add, commit, .gitignore, add -p)." },
	{ cle: "runes", nom: "CrypteDesRunes", maitre: "Andrii", titre: "la Crypte des Runes", acte: 1, image: "loc_crypte_runes.gif", etapes: ["n9_runes"],
	  intro: "La Crypte des Runes : sous l'autel, un caveau où chaque pierre porte une rune de quarante signes. Des blobs, des arbres, des sceaux : tout ce qu'un dépôt contient vraiment (git cat-file, git hash-object)." },
	{ cle: "oracle", nom: "Oracle", maitre: "Irvan", titre: "l'Oracle", acte: 2, image: "loc_oracle.gif", etapes: ["n9_oracle", "n9_miroir"],
	  intro: "L'Oracle : une vasque d'eau noire où remontent, si on sait demander, tous les sceaux du passé. Et contre le mur, le Miroir des aveux, qui dit qui a écrit chaque ligne (git log, git show, git diff, git blame)." },
	{ cle: "contresorts", nom: "SalleDesContresorts", maitre: "Georgette", titre: "la Salle des Contre-sorts", acte: 2, image: "loc_contresorts.gif", etapes: ["n9_annuler", "n9_reset", "n9_contresort"],
	  intro: "La Salle des Contre-sorts : des rayonnages de fioles étiquetées, et au fond, derrière une grille, un grimoire rouge : le sort interdit. Ici, on apprend à revenir en arrière sans rien casser (restore, commit --amend, reset, revert)." },
	{ cle: "ombres", nom: "LivreDesOmbres", maitre: "William", titre: "le Livre des Ombres", acte: 2, image: "loc_livre_ombres.gif", etapes: ["n9_ombres"],
	  intro: "Le Livre des Ombres : une salle sans lumière, où un seul livre est ouvert sur un pupitre. Il se rappelle tout ce que HEAD a jamais fait, même ce que le temps a oublié (git reflog)." },
	{ cle: "lignes", nom: "LignesDuDestin", maitre: "Marc", titre: "les Lignes du Destin", acte: 3, image: "loc_lignes_destin.gif", etapes: ["n9_lignes", "n9_confluence"],
	  intro: "Les Lignes du Destin : un plafond d'étoiles où des fils d'or se séparent et se rejoignent. Chaque fil est une ligne du destin, chaque nœud une confluence (branch, switch, merge)." },
	{ cle: "paradoxes", nom: "SalleDesParadoxes", maitre: "Kenyonn", titre: "la Salle des Paradoxes", acte: 3, image: "loc_paradoxes.gif", etapes: ["n9_paradoxe", "n9_chimere"],
	  intro: "La Salle des Paradoxes : deux escaliers qui montent l'un vers l'autre et se rejoignent la tête en bas. Ici, deux prophéties écrivent le même vers, et une chimère dort sous une fusion trop facile (les conflits)." },
	{ cle: "besace", nom: "BesaceEtReliques", maitre: "Anthony", titre: "la Besace et les Reliques", acte: 3, image: "loc_besace_reliques.gif", etapes: ["n9_besace", "n9_relique", "n9_menhir"],
	  intro: "La Besace et les Reliques : une besace de cuir sans fond accrochée à une patère, des reliques sous verre, et dans la cour, un menhir que personne ne déplace jamais (stash, cherry-pick, tag)." },
	{ cle: "propheties", nom: "AtelierDesPropheties", maitre: "Guillaume", titre: "l'Atelier des Prophéties", acte: 4, image: "loc_atelier_propheties.gif", etapes: ["n9_rebase", "n9_reecriture"],
	  intro: "L'Atelier des Prophéties : des pupitres couverts de parchemins grattés et réécrits. Ici, on rejoue une prophétie au bout d'une autre, et l'on réécrit ce qui n'a jamais été publié (rebase, rebase -i)." },
	{ cle: "cartes", nom: "SalleDesCartes", maitre: "Moustapha", titre: "la Salle des Cartes", acte: 4, image: "loc_salle_cartes.gif", etapes: ["n9_strategies"],
	  intro: "La Salle des Cartes : une table immense où trois royaumes sont dessinés à l'encre, chacun avec ses routes. Chaque royaume choisit comment ses lignes du destin se croisent (les stratégies de branches)." },
	{ cle: "portes", nom: "PortesDesRoyaumes", maitre: "Jeremy", titre: "les Portes des Royaumes", acte: 5, image: "loc_portes_royaumes.gif", etapes: ["n9_cle", "n9_clone", "n9_synchro", "n9_suivi"],
	  intro: "Les Portes des Royaumes : une arche de pierre ouverte sur un pont de lumière, et au bout, royaume, la machine où dort la vraie Chronique. Des messagers vont et viennent (clés SSH, clone, fetch, pull, push)." },
	{ cle: "garde", nom: "RunesDeGarde", maitre: "Aurélien", titre: "les Runes de Garde", acte: 5, image: "loc_runes_garde.gif", etapes: ["n9_garde", "n9_signature"],
	  intro: "Les Runes de Garde : des runes gravées au seuil de chaque porte, qui brûlent quand on essaie de faire passer ce qui ne doit pas passer. Et un bâton de cire, et un sceau à ton nom (les hooks, les sceaux signés)." },
	{ cle: "conseil", nom: "HautConseil", maitre: "Amine", titre: "le Haut-Conseil", acte: 5, image: "loc_haut_conseil.gif", etapes: ["n9_requete", "n9_revue"],
	  intro: "Le Haut-Conseil : un hémicycle de pierre, des bancs vides, et sur l'estrade, deux golems de bronze qui vérifient tout ce qu'on leur présente. Rien n'entre dans la Chronique sans requête, relecture et vérification (gh, Pull Requests, CI)." }
];
SALLES_CH9.forEach(function(s){
	s.lieu = salleCh9(s.nom, s.intro, s.image);
	link_rooms(ChronothequeCh9, s.lieu);
});
function salleCh9Par(cle){ return SALLES_CH9.filter(function(s){ return s.cle === cle; })[0]; }
function salleDeMaitreCh9(nom){ return SALLES_CH9.filter(function(s){ return s.maitre === nom; })[0] || null; }

/* La boîte de Laurent : on y dépose le rapport de la bataille du temps. */
var BoiteChronothequeCh9 = salleCh9("BoiteDeLaurent", "Un coffret de bois noir, cerclé de cuivre, posé au pied du lutrin. On y dépose le rapport de la bataille du temps, à l'intention de Laurent.", "item_box.gif");
BoiteChronothequeCh9.mode = "rwxrwxrwt";
BoiteChronothequeCh9.owner = "laurent";
BoiteChronothequeCh9.horsBareme = true;
link_rooms(ChronothequeCh9, BoiteChronothequeCh9);

/* La Chronothèque s'ouvre sous Cybersup. */
function relierChronothequeCh9(){
	if (Cybersup.children.indexOf(ChronothequeCh9) === -1) relier(Cybersup, ChronothequeCh9);
}

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_10 = (function(){
	var autres = [].concat(typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
		typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
		typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
		typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : [], typeof ORDRE_DES_SORTS_9 !== "undefined" ? ORDRE_DES_SORTS_9 : [],
		typeof SORTS_ANNEXES_GIT !== "undefined" ? SORTS_ANNEXES_GIT : []);
	var liste = typeof SORTS_GIT !== "undefined" ? SORTS_GIT : ["git", "gh"];
	return liste.filter(function(s, i){ return liste.indexOf(s) === i && autres.indexOf(s) === -1 && MANUEL[s]; });
})();
ORDRE_DES_SORTS_10.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* ------------------------------------------------------------------ */
/* Les rangs : d'Apprenti du Temps à Chronomancien                      */
/* ------------------------------------------------------------------ */

var RANGS_CH9 = [
	{ nom: "Apprenti du Temps", sceau: "sceau_apprenti", image: null },
	{ nom: "Scribe", sceau: "sceau_scribe", image: "rang_scribe.gif" },
	{ nom: "Archiviste", sceau: "sceau_archiviste", image: "rang_archiviste.gif" },
	{ nom: "Chroniqueur", sceau: "sceau_chroniqueur", image: "rang_chroniqueur.gif" },
	{ nom: "Gardien du Temps", sceau: "sceau_gardien", image: "rang_gardien.gif" },
	{ nom: "Chronomancien", sceau: "sceau_chronomancien", image: "rang_chronomancien.gif" }
];
function rangCh9(){ var r = sCh9().rang; return typeof r === "number" ? r : 0; }
function nomRangCh9(r){ return RANGS_CH9[r === undefined ? rangCh9() : r].nom; }

var ACTES_CH9 = [
	{ n: 1, titre: "L'Apprenti", etapes: ["n9_config", "n9_init", "n9_sceau", "n9_voile", "n9_offrande", "n9_runes"], epreuve: "n9_rang1", nomEpreuve: "L'Autel profané" },
	{ n: 2, titre: "Le Scribe", etapes: ["n9_oracle", "n9_miroir", "n9_annuler", "n9_reset", "n9_contresort", "n9_ombres"], epreuve: "n9_rang2", nomEpreuve: "La Page arrachée" },
	{ n: 3, titre: "L'Archiviste", etapes: ["n9_lignes", "n9_confluence", "n9_paradoxe", "n9_chimere", "n9_besace", "n9_relique", "n9_menhir"], epreuve: "n9_rang3", nomEpreuve: "Le Labyrinthe des Âges" },
	{ n: 4, titre: "Le Chroniqueur", etapes: ["n9_rebase", "n9_reecriture", "n9_strategies"], epreuve: "n9_rang4", nomEpreuve: "Le Chant des marées" },
	{ n: 5, titre: "Le Gardien du Temps", etapes: ["n9_cle", "n9_clone", "n9_synchro", "n9_suivi", "n9_garde", "n9_signature", "n9_requete", "n9_revue"], epreuve: "n9_rang5", nomEpreuve: "La Requête empoisonnée" },
	{ n: 6, titre: "Le Chronomancien", etapes: [], epreuve: null, nomEpreuve: "La bataille du temps" }
];
function acteCh9(n){ return ACTES_CH9[n - 1]; }
function acteDeEtapeCh9(id){ for (var i = 0; i < ACTES_CH9.length; i++) if (ACTES_CH9[i].etapes.indexOf(id) > -1 || ACTES_CH9[i].epreuve === id) return ACTES_CH9[i].n; return 1; }
function epreuveOuverteCh9(n){ var e = sCh9().epreuves || {}; return e[n] !== undefined && e[n] !== null; }

/* ------------------------------------------------------------------ */
/* Les étapes                                                          */
/* ------------------------------------------------------------------ */

var QUETES_CH9 = [
	{ id: "n9_entree", titre: "Descendre dans la Chronothèque",
	  indice: "La Chronothèque est sous Cybersup : cd ~/Cybersup/Chronotheque." },
	{ id: "n9_sablier", titre: "Écouter Laurent, lire l'Ordre, retourner le Grand Sablier",
	  indice: "Près du lutrin : cat Laurent, cat Ordre, puis sablier (une commande du jeu) : les salles, l'heure, ton rang, et l'intégrité de la Chronique." },
	{ id: "n9_config", titre: "Salle des Sceaux : se nommer, aux trois niveaux",
	  indice: "Salle des Sceaux (Gamaliel). git config --global user.name et user.email, init.defaultBranch main ; puis git config --list --show-origin." },
	{ id: "n9_init", titre: "Salle des Sceaux : ouvrir son premier grimoire",
	  indice: "cd ~/chronotheque/premier-sceau ; git init ; ls -a ; cat .git/HEAD ; git status." },
	{ id: "n9_sceau", titre: "Autel des Offrandes : les deux premiers sceaux",
	  indice: "Autel (Bénédicte). Dans premier-sceau : git add, git commit -m (deux fois) ; git status -s ; git log --oneline." },
	{ id: "n9_voile", titre: "Autel des Offrandes : le voile (.gitignore) et ce qu'on retire de l'autel",
	  indice: "Dans ~/chronotheque/autel : un .gitignore (.env, __pycache__/, *.log), git rm -r --cached __pycache__, puis un sceau." },
	{ id: "n9_offrande", titre: "Autel des Offrandes : deux changements, deux sceaux (add -p)",
	  indice: "Dans autel, autel.py porte deux changements : git add -p autel.py pour n'en offrir qu'un, un sceau, puis l'autre, un second sceau." },
	{ id: "n9_runes", titre: "Crypte des Runes : lire ce que le dépôt contient vraiment",
	  indice: "Crypte (Andrii). git cat-file -t puis -p sur un sceau, son arbre (tree) et un blob ; git hash-object sur un fichier." },
	{ id: "n9_rang1", titre: "ÉPREUVE DE RANG I : l'Autel profané (rang Scribe)",
	  indice: "Épreuve de rang : lis, regarde, scelle juste. ~/chronotheque/autel-profane." },
	{ id: "n9_oracle", titre: "Oracle : interroger les cinquante sceaux des annales",
	  indice: "Oracle (Irvan). Dans ~/chronotheque/annales : git log --oneline --graph --all, git log -S, git log --author ; réponses 1 et 3 dans REPONSES.md." },
	{ id: "n9_miroir", titre: "Oracle : le Miroir des aveux",
	  indice: "git blame -L 12,12 lois.md ; git show v-ete:carte.txt ; git diff entre deux sceaux ; réponses 2 et 4 dans REPONSES.md." },
	{ id: "n9_annuler", titre: "Salle des Contre-sorts : restore, restore --staged, amend",
	  indice: "Contre-sorts (Georgette). Dans ~/chronotheque/contresorts : git restore sorts.txt ; git restore --staged grimoire.md ; git commit --amend -m (le sceau du soir)." },
	{ id: "n9_reset", titre: "Salle des Contre-sorts : les trois resets, vus de près",
	  indice: "Dans ~/chronotheque/experiences : git reset --soft HEAD~1, puis --mixed, puis --hard ; git status et git log entre chaque." },
	{ id: "n9_contresort", titre: "Salle des Contre-sorts : le contre-sort (revert)",
	  indice: "Dans contresorts : git revert du sceau « portes: retire la porte nord », sans réécrire l'histoire." },
	{ id: "n9_ombres", titre: "Livre des Ombres : la ligne du destin effacée",
	  indice: "Livre des Ombres (William). Dans ~/chronotheque/livre-ombres : git reflog ; puis git branch verite HASH (le troisième témoin)." },
	{ id: "n9_rang2", titre: "ÉPREUVE DE RANG II : la Page arrachée (rang Archiviste)",
	  indice: "Épreuve de rang : lis, retrouve, répare. ~/chronotheque/page-arrachee." },
	{ id: "n9_lignes", titre: "Lignes du Destin : une branche n'est qu'un nom",
	  indice: "Lignes (Marc). Dans ~/chronotheque/lignes : cat .git/refs/heads/main ; git switch -c essai ; git switch --detach HEAD~1 ; git status ; git switch main." },
	{ id: "n9_confluence", titre: "Lignes du Destin : trois confluences (fast-forward, trois voies, --no-ff)",
	  indice: "Dans lignes : git log --oneline --graph --all ; git merge carte ; git merge legende ; git merge --no-ff sceau." },
	{ id: "n9_paradoxe", titre: "Salle des Paradoxes : trancher un paradoxe (conflit)",
	  indice: "Paradoxes (Kenyonn). Dans ~/chronotheque/paradoxe : git merge prophetie-sud ; édite prophetie.txt (retire les marqueurs) ; git add ; git commit." },
	{ id: "n9_chimere", titre: "Salle des Paradoxes : la chimère (le conflit invisible)",
	  indice: "Dans ~/chronotheque/chimere : git merge crepuscule ; ./verifier.sh ; corrige rituels/crepuscule.sh ; un sceau ; ./verifier.sh." },
	{ id: "n9_besace", titre: "Besace et Reliques : la besace (stash)",
	  indice: "Besace (Anthony). Dans ~/chronotheque/besace : git stash push -u ; ... ; git switch vitrail ; git stash pop." },
	{ id: "n9_relique", titre: "Besace et Reliques : la relique (cherry-pick)",
	  indice: "git switch main ; git log --oneline correctifs ; git cherry-pick HASH (seulement la réparation de la rune)." },
	{ id: "n9_menhir", titre: "Besace et Reliques : le menhir (un tag annoté)",
	  indice: "Sur main : git tag -a v1.0 -m \"...\" ; git show v1.0." },
	{ id: "n9_rang3", titre: "ÉPREUVE DE RANG III : le Labyrinthe des Âges (rang Chroniqueur)",
	  indice: "Épreuve de rang : chasse, sans fouiller sceau par sceau. ~/chronotheque/labyrinthe." },
	{ id: "n9_rebase", titre: "Atelier des Prophéties : rejouer une ligne au bout d'une autre (rebase)",
	  indice: "Prophéties (Guillaume). Dans ~/chronotheque/prophetie : git switch carte-des-vents ; git rebase main ; git switch main ; git merge carte-des-vents (fast-forward)." },
	{ id: "n9_reecriture", titre: "Atelier des Prophéties : réécrire un brouillon (rebase -i)",
	  indice: "git switch brouillon ; git rebase -i main : squash ou fixup les wip et la typo, drop la trace de débogage, un vrai message." },
	{ id: "n9_strategies", titre: "Salle des Cartes : trois royaumes, trois stratégies",
	  indice: "Cartes (Moustapha). Remplis ~/chronotheque/cartes/STRATEGIES.md : trunk-based, GitHub flow ou GitFlow, et pourquoi." },
	{ id: "n9_rang4", titre: "ÉPREUVE DE RANG IV : le Chant des marées (rang Gardien du Temps)",
	  indice: "Épreuve de rang : une ligne à rendre publiable. ~/chronotheque/chant-des-marees." },
	{ id: "n9_cle", titre: "Portes des Royaumes : ta clé, posée sur royaume",
	  indice: "Portes (Jeremy). ssh-copy-id royaume, puis ssh royaume (et exit)." },
	{ id: "n9_clone", titre: "Portes des Royaumes : cloner la vraie Chronique",
	  indice: "cd ~/chronotheque ; git clone royaume:/srv/git/chronique.git ; cd chronique ; git remote -v ; git branch -vv." },
	{ id: "n9_synchro", titre: "Portes des Royaumes : la porte se ferme, on regarde, on se synchronise",
	  indice: "Un sceau dans chronique, git push (refusé) ; git fetch ; git log main..origin/main ; git pull --rebase ; git push." },
	{ id: "n9_suivi", titre: "Portes des Royaumes : une ligne à toi, suivie",
	  indice: "git switch -c NOM ; un sceau ; git push -u origin NOM ; git branch -vv." },
	{ id: "n9_garde", titre: "Runes de Garde : une rune qui refuse les mots de passe (pre-commit)",
	  indice: "Garde (Aurélien). cp ~/chronotheque/runes/pre-commit ~/chronotheque/chronique/.git/hooks/ ; chmod +x ; puis essaie de sceller un MOT_DE_PASSE= : refusé." },
	{ id: "n9_signature", titre: "Runes de Garde : le sceau de cire (commits signés)",
	  indice: "gpg.format ssh, user.signingkey ~/.ssh/id_ed25519.pub, allowedSignersFile ; git commit -S ; git push ; git log --show-signature -1." },
	{ id: "n9_requete", titre: "Haut-Conseil : ta première requête (Pull Request)",
	  indice: "Haut-Conseil (Amine). Depuis ta ligne poussée : gh pr create ; gh pr checks ; quand Amine approuve : gh pr merge --delete-branch." },
	{ id: "n9_revue", titre: "Haut-Conseil : relire la requête d'un autre",
	  indice: "gh pr list ; gh pr diff N (celle de Kévin) ; gh pr review N --approve -b \"...\"." },
	{ id: "n9_rang5", titre: "ÉPREUVE DE RANG V : la Requête empoisonnée (rang Chronomancien)",
	  indice: "Épreuve de rang : les golems ne lisent pas le sens. Toi, si. gh pr list." },
	{ id: "n9_alerte", titre: "La bataille du temps : voir la réécriture",
	  indice: "Dans ~/chronotheque/chronique : git fetch (forced update) ; git log --oneline main..origin/main et origin/main..main." },
	{ id: "n9_restauration", titre: "La bataille du temps : rendre aux Royaumes la vraie histoire",
	  indice: "Ta main locale garde la vérité (sinon : le miroir de la WarRoom). git push --force-with-lease origin main." },
	{ id: "n9_rempart", titre: "La bataille du temps : le rempart (plus aucune réécriture)",
	  indice: "ssh royaume ; cd /srv/git/chronique.git ; git config receive.denyNonFastForwards true ; git config receive.denyDeletes true." },
	{ id: "n9_faux_sceaux", titre: "La bataille du temps : démasquer et contredire les faux sceaux",
	  indice: "git pull ; git log --show-signature ; git revert des sceaux dont la cire n'est pas reconnue ; git push." },
	{ id: "n9_protection", titre: "La bataille du temps : protéger main au Haut-Conseil (relecture et golems obligatoires)",
	  indice: "Dans ~/chronotheque/chronique : un fichier regles.json, puis gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input regles.json ; gh api ... (GET) pour relire." },
	{ id: "n9_integrite", titre: "La Chronique au-dessus de 90",
	  indice: "Après la bataille, sablier doit afficher une intégrité d'au moins 90 : il dit ce qui manque encore." },
	{ id: "n9_rapport", titre: "Le rapport de la bataille du temps, remis à Laurent",
	  indice: "~/chronotheque/rapport.txt : la chronique, le faussaire (l'empreinte de sa clé), la restauration, le rempart, ce qui reste, l'intégrité finale ; puis une copie dans la BoiteDeLaurent de la Chronothèque." }
];
var QUETES_SECONDAIRES_CH9 = [];   // les défis des maîtres et de Laurent : Chronotheque.js

var INDICES_CH9 = {
	n9_entree: ["La Chronothèque est sous Cybersup.", "cd ~/Cybersup/Chronotheque"],
	n9_sablier: ["Laurent et l'Ordre sont près du lutrin ; sablier est une commande du jeu.", "cat Laurent ; cat Ordre ; sablier"],
	n9_config: ["Trois niveaux : --system (/etc/gitconfig), --global (~/.gitconfig), --local (.git/config). Le plus précis l'emporte.",
		"git config --global user.name \"Ton Nom\" ; git config --global user.email \"toi@chronique.lan\" ; git config --global init.defaultBranch main ; git config --list --show-origin"],
	n9_init: ["git init crée le dossier .git, rien d'autre ; HEAD dit sur quelle ligne tu te tiens.", "cd ~/chronotheque/premier-sceau ; git init ; ls -a ; cat .git/HEAD ; git status"],
	n9_sceau: ["Trois zones : l'atelier (la copie de travail), l'autel (l'index), la Chronique (le dépôt). add pose sur l'autel, commit scelle l'autel.",
		"git add grimoire.md ; git commit -m \"grimoire: ouvre le grimoire\" ; git add . ; git commit -m \"sorts: ajoute les sorts et la carte\" ; git status -s ; git log --oneline"],
	n9_voile: [".gitignore ne cache que ce que Git ne suit pas encore ; ce qui est déjà suivi, on le retire de l'autel avec rm --cached (le fichier reste sur le disque).",
		"cd ~/chronotheque/autel ; printf '.env\\n__pycache__/\\n*.log\\n' > .gitignore ; git rm -r --cached __pycache__ ; git add .gitignore ; git commit -m \"autel: ignore les secrets, les journaux et les caches\""],
	n9_offrande: ["add -p propose chaque morceau (hunk) : y pour le poser sur l'autel, n pour le laisser.",
		"git add -p autel.py (y pour le premier morceau, n pour le second) ; git commit -m \"autel: dit l'heure à l'allumage\" ; git add autel.py ; git commit -m \"autel: refuse d'éteindre un cierge inconnu\""],
	n9_runes: ["Quatre sortes d'objets : blob (un contenu), tree (un dossier), commit (un sceau), tag. cat-file -t dit la sorte, -p montre le contenu.",
		"git cat-file -t HEAD ; git cat-file -p HEAD ; git cat-file -p HEAD^{tree} ; git cat-file -p HASH_D_UN_BLOB ; git hash-object grimoire.md"],
	n9_rang1: ["Trois choses : ce qui ne devait pas être scellé (rm --cached), le voile pour que ça ne revienne pas (.gitignore), et deux changements en deux sceaux (add -p).",
		"cd ~/chronotheque/autel-profane ; printf '.env\\n__pycache__/\\n*.log\\n' > .gitignore ; git rm --cached .env ; git rm -r --cached __pycache__ logs ; git add .gitignore ; git commit -m \"registre: retire les secrets et les journaux\" ; git add -p registre.py (le morceau de graver_nom) ; git commit -m \"...\" ; git add registre.py ; git commit -m \"...\""],
	n9_oracle: ["-S cherche les sceaux qui ont ajouté ou retiré un texte ; --author filtre par scribe.",
		"cd ~/chronotheque/annales ; git log --oneline --graph --all ; git log -S \"Porte d'Argent\" --oneline ; git log --author=Grace --oneline | wc -l ; puis REPONSES.md"],
	n9_miroir: ["blame dit qui a écrit chaque ligne ; show REV:FICHIER montre un fichier tel qu'il était.",
		"git blame -L 12,12 lois.md ; git show v-ete:carte.txt ; git diff v-ete v-automne --stat ; puis REPONSES.md"],
	n9_annuler: ["restore rend au fichier sa version scellée ; restore --staged le retire de l'autel sans toucher au disque ; --amend refait le dernier sceau.",
		"cd ~/chronotheque/contresorts ; git restore sorts.txt ; git restore --staged grimoire.md ; git commit --amend -m \"sceau: ajoute le sceau du soir\""],
	n9_reset: ["--soft déplace la ligne et garde l'autel ; --mixed vide l'autel et garde le disque ; --hard efface tout : c'est le sort interdit.",
		"cd ~/chronotheque/experiences ; git reset --soft HEAD~1 ; git status ; git commit -m \"essai 4 bis\" ; git reset --mixed HEAD~1 ; git status ; git reset --hard HEAD~1 ; git log --oneline"],
	n9_contresort: ["revert pose un nouveau sceau qui défait l'ancien : l'histoire publiée ne bouge pas.", "cd ~/chronotheque/contresorts ; git log --oneline ; git revert --no-edit HASH_DE_LA_PORTE_NORD"],
	n9_ombres: ["Le reflog garde chaque position de HEAD : checkout, commit, reset. Une branche effacée n'est qu'un nom perdu.",
		"cd ~/chronotheque/livre-ombres ; git reflog ; git branch verite HASH_DU_TROISIEME_TEMOIN ; git log --oneline verite"],
	n9_rang2: ["Deux blessures : du travail perdu en local (le reflog), et un faux sceau déjà publié (un contre-sort, jamais un reset sur ce qui est publié).",
		"cd ~/chronotheque/page-arrachee ; git reflog ; git reset --hard HASH_DU_QUATRIEME_JOUR ; git revert --no-edit HASH_DE_LA_FAUSSE_CARTE ; git push"],
	n9_lignes: ["Une branche est un fichier de 41 octets dans .git/refs/heads : un hash. HEAD détaché, c'est se tenir sur un sceau sans ligne.",
		"cd ~/chronotheque/lignes ; cat .git/refs/heads/main ; git switch -c essai ; git switch --detach HEAD~1 ; git status ; git switch main"],
	n9_confluence: ["main n'a pas bougé depuis le départ de carte : fast-forward. Les deux ont avancé : fusion à trois voies. --no-ff force un sceau de fusion.",
		"git merge carte ; git merge legende ; git merge --no-ff sceau ; git log --oneline --graph"],
	n9_paradoxe: ["Git pose les deux versions entre <<<<<<<, ======= et >>>>>>>. Tu choisis, tu retires les marqueurs, tu scelles.",
		"cd ~/chronotheque/paradoxe ; git merge prophetie-sud ; nano prophetie.txt (garde : la tempête se lève ; la mer se lève ; retire les marqueurs) ; git add prophetie.txt ; git commit --no-edit"],
	n9_chimere: ["La fusion réussit parce que personne n'a touché la même ligne. Mais le rituel du crépuscule appelle un sort renommé entre-temps.",
		"cd ~/chronotheque/chimere ; git merge --no-edit crepuscule ; ./verifier.sh ; sed -i 's/allumer/embraser/' rituels/crepuscule.sh ; git commit -am \"rituels: le crépuscule embrase\" ; ./verifier.sh"],
	n9_besace: ["stash -u range aussi les fichiers que Git ne suit pas encore ; pop les ressort sur la ligne où tu es.", "cd ~/chronotheque/besace ; git stash push -u -m vitrail ; git switch main ; ... ; git switch vitrail ; git stash pop"],
	n9_relique: ["cherry-pick rejoue un seul sceau ailleurs : un nouveau sceau, même changement.", "git switch main ; git log --oneline correctifs ; git cherry-pick HASH_DE_LA_REPARATION"],
	n9_menhir: ["Un tag annoté a un auteur, une date et un message : c'est un objet à part entière.", "git switch main ; git tag -a v1.0 -m \"La porte réparée\" ; git show v1.0"],
	n9_rang3: ["bisect coupe le temps en deux à chaque pas : 64 sceaux, six questions. Et bisect run pose les questions à ta place.",
		"cd ~/chronotheque/labyrinthe ; git bisect start ; git bisect bad HEAD ; git bisect good aube ; git bisect run ./epreuve.sh ; git show (le coupable) ; git bisect reset ; puis BISECT.md"],
	n9_rebase: ["rebase rejoue tes sceaux, un à un, au bout de la ligne cible : de nouveaux sceaux, même changement, une histoire droite.",
		"cd ~/chronotheque/prophetie ; git switch carte-des-vents ; git rebase main ; git switch main ; git merge --ff-only carte-des-vents ; git log --oneline --graph"],
	n9_reecriture: ["rebase -i ouvre la liste des sceaux : pick garde, squash et fixup fondent dans le précédent, reword change le message, drop jette.",
		"git switch brouillon ; git rebase -i main (pick le premier wip en reword, fixup wip encore et corrige typo, drop debug) ; git log --oneline main..brouillon"],
	n9_strategies: ["Trunk-based : tout le monde sur main, des lignes courtes, beaucoup de tests. GitHub flow : une ligne par changement, une requête, on fusionne. GitFlow : des lignes de version, pour maintenir plusieurs versions.",
		"1 : trunk-based (petite équipe, publications continues, tests) ; 2 : GitFlow (deux versions maintenues : des branches de release) ; 3 : GitHub flow (une ligne et une requête relue par changement)"],
	n9_rang4: ["Rebaser, nettoyer (rebase -i : drop le sceau du secret ET celui qui l'efface, fixup les wip et les retouches, reword pour de vrais messages : plus aucun « wip », « oups » ni « corrige typo »), puis avancer main sans sceau de fusion.",
		"cd ~/chronotheque/chant-des-marees ; git switch chant ; git rebase -i main (reword « wip refrain », drop « notes », fixup « wip », drop « oups », fixup « refrain fini », reword « corrige typo », fixup « ajoute le couplet » ; dans l'éditeur, deux vrais messages) ; git log -p main..chant | grep MOT_DE_PASSE (rien) ; git switch main ; git merge --ff-only chant"],
	n9_cle: ["ssh-copy-id pose ta clé publique dans ~/.ssh/authorized_keys de l'autre machine.", "ssh-copy-id royaume ; ssh royaume ; exit"],
	n9_clone: ["clone copie toute l'histoire et nomme le Royaume origin.", "cd ~/chronotheque ; git clone royaume:/srv/git/chronique.git ; cd chronique ; git remote -v ; git branch -vv"],
	n9_synchro: ["Un push est refusé quand le Royaume a des sceaux que tu n'as pas : on regarde (fetch, log), puis on se remet au bout (pull --rebase).",
		"git commit -am \"...\" ; git push (refusé) ; git fetch ; git log --oneline main..origin/main ; git pull --rebase ; git push"],
	n9_suivi: ["-u enregistre l'upstream : ensuite, git push et git pull savent où aller, et branch -vv le montre.", "git switch -c chronique-du-jour ; ... ; git commit -am \"...\" ; git push -u origin chronique-du-jour ; git branch -vv"],
	n9_garde: ["Un hook est un script de .git/hooks : exécutable, il se lance à chaque commit ; s'il sort avec un code non nul, le sceau est refusé.",
		"cp ~/chronotheque/runes/pre-commit ~/chronotheque/chronique/.git/hooks/pre-commit ; chmod +x ~/chronotheque/chronique/.git/hooks/pre-commit ; echo MOT_DE_PASSE=x > essai.txt ; git add essai.txt ; git commit -m essai (refusé) ; git restore --staged essai.txt ; rm essai.txt"],
	n9_signature: ["La cire, c'est ta clé SSH. Pour vérifier, Git lit le fichier des signataires autorisés.",
		"git config --global gpg.format ssh ; git config --global user.signingkey ~/.ssh/id_ed25519.pub ; echo \"$(git config user.email) namespaces=\\\"git\\\" $(cat ~/.ssh/id_ed25519.pub)\" > ~/.ssh/allowed_signers ; git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers ; git commit -S -am \"...\" ; git push ; git log --show-signature -1"],
	n9_requete: ["Une requête propose une ligne poussée ; les golems la vérifient (checks), un maître la relit, puis on fusionne.",
		"git push -u origin MA_LIGNE ; gh pr create --title \"...\" --body \"...\" ; gh pr checks ; gh pr view ; gh pr merge --merge --delete-branch"],
	n9_revue: ["Relire, c'est lire le diff, pas le titre.", "gh pr list ; gh pr diff N ; gh pr review N --approve -b \"Relu : la table des marées est juste.\""],
	n9_rang5: ["Les golems vérifient le format, pas le sens. Lis chaque ligne du diff : une seule change une loi.",
		"gh pr list ; gh pr diff N ; gh pr review N --request-changes -b \"La loi 10 est modifiée : le porteur du sceau gris...\""],
	n9_alerte: ["fetch dit « forced update » quand une ligne du Royaume a été réécrite.", "cd ~/chronotheque/chronique ; git fetch ; git log --oneline main..origin/main ; git log --oneline origin/main..main"],
	n9_restauration: ["--force-with-lease ne force que si le Royaume est encore dans l'état que tu as vu : tu n'écrases personne par surprise.",
		"git switch main ; git status (ta main n'a pas bougé) ; git push --force-with-lease origin main ; (sans la vérité en local : git remote add miroir royaume:/srv/git/miroir/chronique.git ; git fetch miroir ; git reset --hard miroir/main)"],
	n9_rempart: ["Côté Royaume, receive.denyNonFastForwards refuse tout push qui réécrit ; receive.denyDeletes, toute ligne effacée.",
		"ssh royaume ; cd /srv/git/chronique.git ; git config receive.denyNonFastForwards true ; git config receive.denyDeletes true ; exit"],
	n9_faux_sceaux: ["Un sceau signé d'une clé que tu ne reconnais pas ne se croit pas. On ne réécrit pas : on contredit (revert).",
		"git pull ; git log --show-signature -3 ; git revert --no-edit HASH1 HASH2 ; git push"],
	n9_protection: ["Le rempart refuse les réécritures ; la protection de branche, sur la forge, oblige en plus chaque changement de main à passer par une requête relue, avec les golems au vert (golem-secrets compris). On la pose avec l'API : les quatre clés obligatoires, null pour ce qu'on n'exige pas.",
		"cat > ~/chronotheque/regles.json <<'FIN' { \"required_status_checks\": { \"strict\": true, \"contexts\": [\"golem-format\", \"golem-secrets\"] }, \"enforce_admins\": true, \"required_pull_request_reviews\": { \"required_approving_review_count\": 1 }, \"restrictions\": null, \"allow_force_pushes\": false, \"allow_deletions\": false } FIN ; gh api -X PUT repos/{owner}/{repo}/branches/main/protection --input ~/chronotheque/regles.json"],
	n9_integrite: ["sablier, n'importe où, dit ce qui manque encore.", "sablier"],
	n9_rapport: ["Un here-document écrit le rapport d'un coup ; cp le dépose.", "cat > ~/chronotheque/rapport.txt <<'FIN' ... FIN ; cp ~/chronotheque/rapport.txt ~/Cybersup/Chronotheque/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH9 = {
	n9_sablier: "Ici la WarRoom. La Chronothèque, enfin. Écoute Laurent, lis l'Ordre, et retourne le Grand Sablier : sablier.",
	n9_config: "La Salle des Sceaux, chez Gamaliel : un sceau porte le nom de son scribe. Commence par te nommer.",
	n9_init: "Ton premier grimoire. Regarde bien ce que git init pose dans le dossier : rien d'autre qu'un .git.",
	n9_sceau: "L'Autel, chez Bénédicte : on pose, on regarde, on scelle. Et git status, avant et après chaque sort.",
	n9_voile: "Un secret scellé ne se descelle jamais vraiment. Pose le voile avant qu'il ne soit trop tard.",
	n9_offrande: "Deux changements, deux raisons, deux sceaux. Un sceau qui mélange tout ne se relit pas.",
	n9_runes: "La Crypte, chez Andrii : sous les sceaux, il n'y a que quatre sortes de pierres. Lis-les.",
	n9_rang1: "Ton épreuve de rang, Apprenti. Pas d'indice gratuit : lis, regarde, scelle juste.",
	n9_oracle: "L'Oracle, chez Irvan : cinquante sceaux, et quelque part, une plume grise. Interroge-les.",
	n9_miroir: "Le Miroir des aveux ne ment pas : chaque ligne a un scribe.",
	n9_annuler: "Les Contre-sorts, chez Georgette : revenir en arrière, sans rien perdre de ce qui compte.",
	n9_reset: "Trois resets, trois profondeurs. Le dernier est le sort interdit : regarde-le, mais en laboratoire.",
	n9_contresort: "Ce qui est publié ne s'efface pas : on le contredit.",
	n9_ombres: "Le Livre des Ombres, chez William : rien n'est perdu tant que le reflog s'en souvient.",
	n9_rang2: "Épreuve de rang, Scribe. Une page arrachée, un faux sceau publié. Répare sans réécrire.",
	n9_lignes: "Les Lignes du Destin, chez Marc : une branche n'est qu'un nom posé sur un sceau. Va voir le fichier.",
	n9_confluence: "Trois lignes, trois confluences. Regarde le graphe avant chaque fusion.",
	n9_paradoxe: "Les Paradoxes, chez Kenyonn : Git ne choisira pas pour toi.",
	n9_chimere: "Une fusion sans conflit n'est pas une fusion juste. Vérifie.",
	n9_besace: "La Besace, chez Anthony : une urgence, et ton travail à moitié fait. Range-le sans rien perdre.",
	n9_relique: "Une seule relique, pas toute la ligne.",
	n9_menhir: "Un menhir ne bouge jamais : plante-le sur la version réparée.",
	n9_rang3: "Épreuve de rang, Archiviste. Soixante-quatre sceaux, un seul est faux. Chasse, ne fouille pas.",
	n9_rebase: "L'Atelier des Prophéties, chez Guillaume : rejoue ta ligne au bout de main, et l'histoire devient droite.",
	n9_reecriture: "Réécrire un brouillon qui n'a jamais été publié, c'est permis. Le reste, jamais.",
	n9_strategies: "La Salle des Cartes, chez Moustapha : chaque royaume choisit ses routes.",
	n9_rang4: "Épreuve de rang, Chroniqueur. Une ligne en désordre, et un secret qui y traîne encore.",
	n9_cle: "Les Portes des Royaumes, chez Jeremy : sans ta clé sur royaume, aucun messager ne passe.",
	n9_clone: "Clone la vraie Chronique. Désormais, tu en gardes une copie entière.",
	n9_synchro: "Le Royaume a avancé sans toi. On regarde avant d'agir : fetch, log, puis pull --rebase.",
	n9_suivi: "Une ligne à toi, poussée, suivie. -u, et Git se souvient où elle va.",
	n9_garde: "Les Runes de Garde, chez Aurélien : une rune qui brûle avant qu'un secret ne soit scellé.",
	n9_signature: "Signe tes sceaux. Bientôt, savoir qui a vraiment scellé quoi sera une question de vie ou de mort.",
	n9_requete: "Le Haut-Conseil, chez Amine : rien n'entre dans la Chronique sans requête ni relecture.",
	n9_revue: "Relire, c'est lire chaque ligne du diff.",
	n9_rang5: "Épreuve de rang, Gardien. Une requête arrive, et les golems l'aiment bien. Toi, lis-la.",
	n9_alerte: "Ça y est. La Grande Synchronisation. Quelqu'un vient de réécrire la Chronique sur royaume. git fetch, vite.",
	n9_restauration: "Ta copie garde la vérité. Rends-la aux Royaumes, avec un bail (force-with-lease).",
	n9_rempart: "Il reviendra. Dresse le rempart sur royaume : plus aucune réécriture.",
	n9_faux_sceaux: "Il pousse encore, mais en avant, cette fois. Lis la cire de chaque sceau.",
	n9_protection: "Le rempart tient. Maintenant, la porte : plus rien n'entre dans main sans requête, relecture et golems. gh api, chez Amine.",
	n9_integrite: "La Chronique doit tenir au-dessus de 90. sablier te dit ce qui manque.",
	n9_rapport: "Dernière chose, Chronomancien : le rapport pour Laurent. Et l'empreinte de sa clé. Surtout l'empreinte."
};
var METIER_CH9 = {
	n9_config: "En entreprise, user.email doit être l'adresse de travail : c'est elle qui relie tes commits à ton compte sur la forge.",
	n9_init: "Supprimer le dossier .git, c'est supprimer tout l'historique : on ne le touche jamais à la main.",
	n9_sceau: "git status est la commande la plus utile de Git : avant et après chaque commande.",
	n9_voile: "Un secret poussé une seule fois doit être considéré comme compromis : on le change, on ne se contente pas de l'effacer.",
	n9_offrande: "Un commit atomique fait une seule chose : il se relit, se revert et se cherry-pick proprement.",
	n9_runes: "Un hash identifie un contenu : deux fichiers identiques ont le même blob, partout dans le monde.",
	n9_oracle: "git log -S retrouve en secondes le commit qui a introduit une ligne, dans des milliers.",
	n9_miroir: "blame ne sert pas à blâmer : il sert à trouver le contexte d'une ligne (le commit, son message, sa requête).",
	n9_annuler: "--amend réécrit le dernier commit : seulement s'il n'est pas encore poussé.",
	n9_reset: "reset --hard efface le travail non commité pour de bon : le reflog ne garde que ce qui a été commité.",
	n9_contresort: "Sur une branche partagée, on revert, on ne reset jamais : les autres ont déjà ces commits.",
	n9_ombres: "Le reflog est local et expire (90 jours par défaut) : c'est un filet, pas une sauvegarde.",
	n9_lignes: "Créer une branche coûte 41 octets : on en crée une par changement, sans hésiter.",
	n9_confluence: "--no-ff garde la trace d'une branche dans l'historique : utile pour relire ce qui est entré ensemble.",
	n9_paradoxe: "Un conflit se résout en comprenant les deux intentions, pas en gardant « la mienne ».",
	n9_chimere: "Après une fusion, on lance les tests : c'est le rôle de l'intégration continue.",
	n9_besace: "Un stash oublié est un travail perdu : git stash list de temps en temps.",
	n9_relique: "cherry-pick sert aux correctifs urgents à reporter sur une branche de version.",
	n9_menhir: "Les versions publiées se marquent par des tags annotés, poussés avec git push --tags.",
	n9_rang3: "git bisect run avec un test automatique trouve une régression dans des milliers de commits en quelques minutes.",
	n9_rebase: "Règle d'or : on ne rebase jamais un historique déjà partagé.",
	n9_reecriture: "rebase -i avant d'ouvrir une Pull Request : des commits propres se relisent deux fois plus vite.",
	n9_strategies: "La meilleure stratégie est la plus simple qui tient : la plupart des équipes modernes font du trunk-based ou du GitHub flow.",
	n9_cle: "Une clé SSH par poste ; on ne copie jamais sa clé privée d'une machine à l'autre.",
	n9_clone: "origin n'est qu'un nom par convention : le dépôt d'où l'on a cloné.",
	n9_synchro: "pull, c'est fetch puis merge (ou rebase) : fetch seul ne touche jamais à ton travail.",
	n9_suivi: "git branch -vv montre en un coup d'œil ce qui est en avance ou en retard sur le serveur.",
	n9_garde: "Les hooks locaux se contournent (--no-verify) : la vraie barrière est côté serveur et dans la CI.",
	n9_signature: "Un commit non signé peut porter n'importe quel nom : user.name se change en une ligne.",
	n9_requete: "Une Pull Request petite et ciblée se relit en dix minutes ; une énorme ne se relit jamais vraiment.",
	n9_revue: "En revue, on demande des changements sur le fond, avec bienveillance, et on approuve explicitement.",
	n9_rang5: "La CI ne remplace pas la relecture humaine : elle vérifie ce qu'on lui a appris à vérifier, rien de plus.",
	n9_alerte: "Un « forced update » sur la branche principale d'un serveur est un incident : on enquête avant de tirer.",
	n9_restauration: "--force-with-lease au lieu de --force : on n'écrase jamais le travail qu'on n'a pas vu.",
	n9_rempart: "Sur une forge, cela s'appelle une protection de branche : pas de force push, pas de suppression, relecture obligatoire.",
	n9_faux_sceaux: "Une signature prouve qui a signé, pas que le contenu est bon : on vérifie les deux.",
	n9_protection: "Sur GitHub ou GitLab, la protection de main (relecture obligatoire, CI verte, scan de secrets, pas de force push) est la première chose qu'on pose sur un dépôt d'équipe.",
	n9_rapport: "Un rapport d'incident dit ce qui s'est passé, ce qui a été fait, et ce qui reste à faire."
};

/* ------------------------------------------------------------------ */
/* Ce que le joueur a constaté (les sorts lancés, et leur issue)        */
/* ------------------------------------------------------------------ */

function vuCh9(cle){ return !!(sCh9().vus || {})[cle]; }
function noterVuCh9(cle){ var c = sCh9(); c.vus = c.vus || {}; if (!c.vus[cle]) c.vus[cle] = c.minutes || 1; }
/* Le dépôt d'un événement est-il celui-là ? (on compare la fin du chemin, quelle que soit sa forme) */
function depotEstCh9(e, cle){
	var d = String((e && (e.depot || e.chemin)) || "").replace(/\/+$/, "").replace(/\/\.git$/, "");
	var voulu = String(DEPOTS_CH9[cle] || cle).replace(/^~\//, "");
	return d === DEPOTS_CH9[cle] || d.slice(-voulu.length) === voulu || d.slice(-(voulu.length + 1)) === "/" + voulu;
}
function aOptionCh9(args, noms){ return (args || []).some(function(a){ return noms.indexOf(a) > -1 || noms.some(function(n){ return n.indexOf("--") === 0 && a.indexOf(n + "=") === 0; }); }); }
function noterGitCh9(e){
	var c = sCh9(), a = e.args || [], cmd = e.cmd, ok = e.ok !== false;
	if (cmd === "config" && aOptionCh9(a, ["--show-origin"])) noterVuCh9("showOrigin");
	if (cmd === "status"){
		if (depotEstCh9(e, "premier")) noterVuCh9("statusPremier");
		if (aOptionCh9(a, ["-s", "--short"]) || a.some(function(x){ return /^-[a-z]*s[a-z]*$/.test(x); })) noterVuCh9("statusCourt");
		if (depotEstCh9(e, "lignes") && e.detache) noterVuCh9("statusDetache");
	}
	if (cmd === "log"){
		if (aOptionCh9(a, ["--oneline"])) noterVuCh9("logOneline");
		if (depotEstCh9(e, "annales") && (aOptionCh9(a, ["--graph"]) || aOptionCh9(a, ["--all"]))) noterVuCh9("logGraph");
		if (depotEstCh9(e, "annales") && a.some(function(x){ return /^-S/.test(x) || /^-G/.test(x); })) noterVuCh9("logS");
		if (depotEstCh9(e, "annales") && aOptionCh9(a, ["--author"])) noterVuCh9("logAuteur");
		if (depotEstCh9(e, "chronique") && a.some(function(x){ return /\.\./.test(x) && /origin\//.test(x); })){ noterVuCh9("logPlage"); if (c.bataille) noterVuCh9("comparaison"); }
		if (aOptionCh9(a, ["--show-signature"])){
			noterVuCh9("showSignature");
			if (c.fauxSceaux && depotEstCh9(e, "chronique")) noterVuCh9("signaturesLues");
		}
	}
	if (cmd === "diff" && depotEstCh9(e, "annales") && a.filter(function(x){ return x.charAt(0) !== "-"; }).length >= 1 && a.some(function(x){ return /\.\.|^v-|^[0-9a-f]{4,}$/.test(x); })) noterVuCh9("diffPlage");
	if (cmd === "diff" && depotEstCh9(e, "chronique") && c.bataille && a.some(function(x){ return /origin\//.test(x); })) noterVuCh9("comparaison");
	if (cmd === "blame" && depotEstCh9(e, "annales")) noterVuCh9("blame");
	if (cmd === "show"){
		if (depotEstCh9(e, "annales") && a.some(function(x){ return /:/.test(x); })) noterVuCh9("showChemin");
		if (depotEstCh9(e, "besace") && a.some(function(x){ return /^v1\.0/.test(x); })) noterVuCh9("showTag");
		if (aOptionCh9(a, ["--show-signature"])){ noterVuCh9("showSignature"); if (c.fauxSceaux && depotEstCh9(e, "chronique")) noterVuCh9("signaturesLues"); }
	}
	if (cmd === "cat-file" && ok){
		if (a.indexOf("-t") > -1) noterVuCh9("catFileT");
		if (a.indexOf("-p") > -1){ c.catFile = c.catFile || {}; var t = e.typeObjet || "?"; c.catFile[t] = true; c.catFileN = (c.catFileN || 0) + 1; }
	}
	if (cmd === "hash-object" && ok) noterVuCh9("hashObject");
	if (cmd === "rm" && ok && aOptionCh9(a, ["--cached"])){ if (depotEstCh9(e, "autel")) noterVuCh9("rmCached"); if (depotEstCh9(e, "profane")) noterVuCh9("rmCachedProfane"); }
	if (cmd === "add" && ok && (aOptionCh9(a, ["-p", "--patch"]) || e.patch)){ if (depotEstCh9(e, "autel")) noterVuCh9("addPatch"); if (depotEstCh9(e, "profane")) noterVuCh9("addPatchProfane"); }
	if (cmd === "restore" && ok && depotEstCh9(e, "contresorts")){ if (aOptionCh9(a, ["--staged", "-S"])) noterVuCh9("restoreStaged"); else noterVuCh9("restore"); }
	if (cmd === "commit" && ok && aOptionCh9(a, ["--amend"]) && depotEstCh9(e, "contresorts")) noterVuCh9("amend");
	if (cmd === "reset" && ok){
		var mode = e.mode || (aOptionCh9(a, ["--soft"]) ? "soft" : aOptionCh9(a, ["--hard"]) ? "hard" : "mixed");
		if (mode === "soft") noterVuCh9("resetSoft");
		if (mode === "mixed" && a.some(function(x){ return x.charAt(0) !== "-"; })) noterVuCh9("resetMixed");
		if (mode === "hard") noterVuCh9("resetHard");
	}
	if (cmd === "reflog" && ok){ if (depotEstCh9(e, "ombres")) noterVuCh9("reflogOmbres"); noterVuCh9("reflog"); }
	if ((cmd === "switch" || cmd === "checkout") && ok && depotEstCh9(e, "lignes")){
		if (aOptionCh9(a, ["-c", "-C", "-b", "--create"])) noterVuCh9("switchCree");
		if (aOptionCh9(a, ["--detach", "-d"]) || e.detache) noterVuCh9("detache");
	}
	if (cmd === "merge" && depotEstCh9(e, "lignes")){
		var m = e.mode;
		if (m === "ff") noterVuCh9("mergeFF");
		if (m === "3voies" && !aOptionCh9(a, ["--no-ff"])) noterVuCh9("merge3");
		if (aOptionCh9(a, ["--no-ff"]) && ok && m !== "ff") noterVuCh9("mergeNoFF");
	}
	if (cmd === "merge" && depotEstCh9(e, "paradoxe") && ((e.conflits || []).length || e.mode === "conflit")) noterVuCh9("conflit");
	if (cmd === "stash" && ok && depotEstCh9(e, "besace")){
		var act = e.action || (e.stash && e.stash.action) || a[0] || "push";
		if ((act === "push" || act === "save" || act === undefined) && (aOptionCh9(a, ["-u", "--include-untracked", "-a", "--all"]) || (e.stash && e.stash.nonSuivis))) noterVuCh9("stashU");
		if (act === "pop" || act === "apply") noterVuCh9("stashPop");
	}
	if (cmd === "cherry-pick" && ok && depotEstCh9(e, "besace")) noterVuCh9("cherryPick");
	if (cmd === "bisect" && depotEstCh9(e, "labyrinthe")){
		var pm = e.premierMauvais;
		if (pm && pm === HASH_CH9("labyrintheFaux")) noterVuCh9("bisectTrouve");
		noterVuCh9("bisect");
	}
	if (cmd === "rebase" && ok){
		var inter = !!e.interactif || aOptionCh9(a, ["-i", "--interactive"]) || !!sCh9().rebaseInteractif;
		if (e.interactif) sCh9().rebaseInteractif = true;
		var fini = e.etat === "fini";
		if (fini) sCh9().rebaseInteractif = false;
		if (inter && fini && depotEstCh9(e, "prophetie")) noterVuCh9("rebaseI");
		if (inter && fini && depotEstCh9(e, "epreuve4")) noterVuCh9("rebaseIEpreuve");
	}
	if (cmd === "remote" && depotEstCh9(e, "chronique") && aOptionCh9(a, ["-v", "--verbose"])) noterVuCh9("remoteV");
	if (cmd === "branch" && depotEstCh9(e, "chronique") && aOptionCh9(a, ["-vv"])){ noterVuCh9("branchVV"); if (vuCh9("pushU")) noterVuCh9("branchVVApres"); }
	if (cmd === "push" && depotEstCh9(e, "chronique")){
		var rejete = (e.resultats || []).some(function(r){ return ["ok", "aJour", "supprime"].indexOf(r.etat) === -1; });
		if (rejete || (!ok && /rejected|fetch first|non-fast-forward/.test(String(e.erreur || "")))){ noterVuCh9("pushRejete"); ok = false; }
		if (ok && vuCh9("pushRejete")) noterVuCh9("pushApres");
		if (ok && aOptionCh9(a, ["-u", "--set-upstream"])) noterVuCh9("pushU");
	}
	if (cmd === "fetch" && depotEstCh9(e, "chronique")){
		noterVuCh9("fetch");
		var forces = e.forces || [];
		if (c.bataille && forces.length) noterVuCh9("fetchForce");
	}
	if (cmd === "pull" && depotEstCh9(e, "chronique") && ok && (aOptionCh9(a, ["--rebase", "-r"]) || /rebase/.test(String(e.strategie || "")))) noterVuCh9("pullRebase");
	if (cmd === "commit" && depotEstCh9(e, "chronique") && e.hookRefus === "pre-commit") noterVuCh9("hookRefus");
}
/* Ce que seule la sortie dit : une signature vérifiée (Good "git" signature). */
var APPELER_AVANT_SORTIES_CH9 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_SORTIES_CH9.apply(this, arguments);
	try {
		if (nom === "git" && chroniqueOuverte() && state.quests["n9_entree"] && typeof sortie === "string" && /Good "git" signature for \S+ with/.test(sansAnsi(sortie))) noterVuCh9("signatureBonne");
	} catch (x){}
	return sortie;
};
GameEvents.addListener("git", function(e){
	if (!chroniqueOuverte() || !state.quests["n9_entree"]) return;
	try { noterGitCh9(e); } catch (x){ /* un constat ne doit jamais casser un sort */ }
});
GameEvents.addListener("forge", function(e){
	if (!chroniqueOuverte() || !state.quests["n9_entree"]) return;
	try {
		var c = sCh9(), a = e.args || [];
		if (e.cmd === "pr checks") noterVuCh9("prChecks");
		if (e.cmd === "pr diff" && e.pr){ c.diffsLus = c.diffsLus || {}; c.diffsLus[+e.pr] = true; }
	} catch (x){}
});
/* Les lectures : HEAD, et les fichiers de .git/refs/heads. */
GameEvents.addListener("read", function(e){
	if (!chroniqueOuverte() || !state.quests["n9_entree"] || !e.item || !e.room) return;
	try {
		if (e.item.itemname === "HEAD" && e.room.room_name === ".git") noterVuCh9("catHead");
		if (e.room.room_name === "heads" && e.room.parents[0] && e.room.parents[0].room_name === "refs") noterVuCh9("lireRef");
	} catch (x){}
});
/* Les scripts : verifier.sh de la chimère, epreuve.sh du labyrinthe. */
GameEvents.addListener("script", function(e){
	if (!chroniqueOuverte() || !state.quests["n9_entree"]) return;
	try {
		if (e.nom === "verifier.sh"){ if (e.statut) noterVuCh9("verifierEchec"); else if (vuCh9("verifierEchec")) noterVuCh9("verifierOk"); }
	} catch (x){}
});

/* ------------------------------------------------------------------ */
/* L'état réel : chaque étape                                          */
/* ------------------------------------------------------------------ */

/* La configuration globale : ~/.gitconfig (sur l'île). */
function gitconfigGlobalCh9(){ return texteIleCh9("~/.gitconfig") || ""; }
function valeurIniCh9(texte, section, cle){
	var dans = false, val = null;
	lignesDe(texte || "").forEach(function(l){
		var s = /^\s*\[([^\]\s"]+)(?:\s+"([^"]*)")?\s*\]/.exec(l);
		if (s){ dans = (s[1] + (s[2] !== undefined ? "." + s[2] : "")).toLowerCase() === section.toLowerCase(); return; }
		var m = /^\s*([A-Za-z0-9.-]+)\s*=\s*(.*?)\s*$/.exec(l);
		if (dans && m && m[1].toLowerCase() === cle.toLowerCase()) val = m[2].replace(/^"|"$/g, "");
	});
	return val;
}
function configCh9(section, cle, depot){
	var local = depot ? texteIleCh9(depot + "/.git/config") : null;
	var v = local ? valeurIniCh9(local, section, cle) : null;
	return v !== null ? v : valeurIniCh9(gitconfigGlobalCh9(), section, cle);
}
/* Deux sceaux, chacun avec un seul des deux changements (par leurs marqueurs). */
function deuxSceauxSeparesCh9(cle, base, m1, m2){
	var ch = DCh9(cle), l = sceauxDepuisCh9(ch, "HEAD", base), a = false, b = false;
	l.forEach(function(h){
		var aj = ajoutsCh9(ch, h).join("\n");
		var x = aj.indexOf(m1) > -1, y = aj.indexOf(m2) > -1;
		if (x && !y) a = true;
		if (y && !x) b = true;
	});
	return a && b;
}
function ignoreCh9(cle, motifs){
	var t = G9.fichier(DCh9(cle), "HEAD", ".gitignore") || "";
	return motifs.every(function(m){ return lignesDe(t).some(function(l){ return m.test(l.trim()); }); });
}
function arbreSansCh9(cle, rev, motif){
	var ch = DCh9(cle);
	var liste = G9.essai(function(){ return gitFichiers(null, ch, rev) || []; }, null);
	if (liste === null){
		// Sans la liste, on demande chaque chemin connu.
		return [".env", "__pycache__/autel.cpython-312.pyc", "__pycache__/registre.cpython-312.pyc", "journal.log", "logs/rituel.log", "debug.log", "notes-secretes.txt"]
			.filter(function(f){ return motif.test(f); }).every(function(f){ return G9.fichier(ch, rev, f) === null; });
	}
	return !liste.some(function(f){ return motif.test(f); });
}
function reponsesCh9(){
	var t = texteIleCh9(DEPOTS_CH9.annales + "/REPONSES.md") || "", r = {};
	var blocs = t.split(/^\s*(\d)\.\s/m);
	for (var i = 1; i < blocs.length; i += 2){
		var m = /R[ée]ponse\s*:\s*(.*)/i.exec(blocs[i + 1] || "");
		r[blocs[i]] = m ? m[1].trim() : "";
	}
	return r;
}
function hashCiteCh9(texte, hash){
	if (!hash) return false;
	return (String(texte).match(/[0-9a-f]{7,40}/gi) || []).some(function(x){ return hash.indexOf(x.toLowerCase()) === 0; });
}
function strategiesCh9(){
	var t = sansAccentCh9(texteIleCh9(DEPOTS_CH9.cartes + "/STRATEGIES.md") || ""), r = {};
	var blocs = t.split(/^\s*(\d)\.\s/m);
	for (var i = 1; i < blocs.length; i += 2){
		var s = /strategie\s*:\s*(.*)/.exec(blocs[i + 1] || ""), p = /pourquoi\s*:\s*(.*)/.exec(blocs[i + 1] || "");
		r[blocs[i]] = { s: s ? s[1].trim() : "", p: p ? p[1].trim() : "" };
	}
	return r;
}
/* Le message d'un sceau de revert pour tel sceau ? */
function revertDeCh9(ch, rev, cible){
	var msg = messageCh9(ch, cible);
	return G9.historique(ch, rev).some(function(h){ var m = messageCh9(ch, h); return /^Revert "/.test(m) && (m.indexOf(msg.split("\n")[0]) > -1 || m.indexOf(cible) > -1); });
}
function revertDeRCh9(cible){
	var c = G9.commitR(cible);
	if (!c) return false;
	var titre = String(c.message || "").split("\n")[0];
	return G9.historiqueR("main").some(function(h){ var m = String((G9.commitR(h) || {}).message || ""); return /^Revert "/.test(m) && (m.indexOf(titre) > -1 || m.indexOf(cible) > -1); });
}
/* La clé publique du joueur (sur l'île), et sa présence sur royaume. */
function clePubliqueCh9(){ var t = texteIleCh9("~/.ssh/id_ed25519.pub"); return t ? t.trim() : null; }
function clePoseeRoyaumeCh9(){
	var k = clePubliqueCh9();
	if (!k) return false;
	var cles = [];
	if (state.reseau && state.reseau.cles && state.reseau.cles[ROYAUME_CH9]) cles.push(String(state.reseau.cles[ROYAUME_CH9]).trim());
	var ak = typeof texteHote === "function" ? texteHote(ROYAUME_CH9, "/home/" + JOUEUR + "/.ssh/authorized_keys") : null;
	if (ak) lignesDe(ak).forEach(function(l){ cles.push(l.trim()); });
	var corps = k.split(/\s+/)[1];
	return cles.some(function(x){ return x === k || (corps && x.indexOf(corps) > -1); });
}
function urlRoyaumeOkCh9(u){ return /^(ssh:\/\/)?([^@\/]+@)?royaume(\.chronique\.lan)?(:|\/)\/?srv\/git\/chronique\.git\/?$/.test(String(u || "").trim()); }
function racineChroniqueCh9(){ return sCh9().hash.royaumeRacine || null; }
/* Les sceaux du joueur sur royaume : auteur = son nom de config. */
function nomJoueurGitCh9(){ return configCh9("user", "name", DEPOTS_CH9.chronique) || ""; }
function mailJoueurGitCh9(){ return configCh9("user", "email", DEPOTS_CH9.chronique) || ""; }
function sceauSigneJoueurRCh9(){
	var mail = mailJoueurGitCh9();
	return G9.historiqueR("main").slice(0, 200).some(function(h){
		var c = G9.commitR(h);
		if (!c || !c.signature) return false;
		var s = c.signature;
		var auteurOk = !mail || c.mail === mail;
		var maCle = clePubliqueCh9(), corps = maCle ? maCle.split(/\s+/)[1] : null;
		return auteurOk && !!corps && String(s.cle || "").indexOf(corps) > -1;
	});
}
/* La forge (gh) : les requêtes du Haut-Conseil. */
var F9 = {
	prs: function(){ return G9.essai(function(){ var f = forgeEtat(ROYAUME_CH9, DEPOT_ROYAUME_CH9); return f && f.prs ? f.prs : []; }, []); },
	pr: function(n){ return F9.prs().filter(function(p){ return p.n === +n; })[0] || null; }
};
/* Les golems du Haut-Conseil : ils vérifient le format (et refusent un mot de passe), jamais le sens. */
function forgeVerifications(D, pr){
	var l = [{ nom: "golem-format", etat: "success", details: "Les fichiers de la Chronique sont bien formés." }];
	var secret = false;
	try {
		var base = gResoudre(D, "refs/heads/" + pr.base, { commit: true }), tete = gResoudre(D, "refs/heads/" + pr.tete, { commit: true });
		if (base && tete){
			var a = gAplatir(D, gCommit(D, base).arbre), b = gAplatir(D, gCommit(D, tete).arbre);
			secret = Object.keys(b).some(function(f){ return (!a[f] || a[f].h !== b[f].h) && /MOT_DE_PASSE=/.test(gObjet(D, b[f].h).c || ""); });
		}
	} catch (e){ secret = false; }
	l.push({ nom: "golem-secrets", etat: secret ? "failure" : "success", details: secret ? "Un mot de passe dans la requête." : "Aucun mot de passe." });
	return l;
}
function auteurPrEstJoueurCh9(pr){ return !!pr && (pr.auteur === JOUEUR || pr.auteur === nomJoueurGitCh9() || pr.parJoueur === true); }
function revuesDuJoueurCh9(pr){ return ((pr && pr.revues) || []).filter(function(r){ return r.auteur === JOUEUR || r.auteur === nomJoueurGitCh9() || r.parJoueur === true; }); }

var ETATS_CH9 = {
	n9_config: function(){
		var t = gitconfigGlobalCh9();
		return !!valeurIniCh9(t, "user", "name") && /@/.test(valeurIniCh9(t, "user", "email") || "") && valeurIniCh9(t, "init", "defaultBranch") === "main";
	},
	n9_init: function(){ return !!G9.depot(DEPOTS_CH9.premier); },
	n9_sceau: function(){ return G9.historique(DEPOTS_CH9.premier, "HEAD").length >= 2; },
	n9_voile: function(){
		return !!G9.depot(DEPOTS_CH9.autel) && ignoreCh9("autel", [/^\.env$|^\/\.env$|^\.env\*?$/, /^\/?__pycache__\/?(\*\*)?$|^\*\.pyc$/, /^\*\.log$|^\/?journal\.log$/]) &&
			arbreSansCh9("autel", "HEAD", /(^|\/)__pycache__\/|(^|\/)\.env$|\.log$/);
	},
	n9_offrande: function(){ return !!G9.depot(DEPOTS_CH9.autel) && deuxSceauxSeparesCh9("autel", HASH_CH9("autelBase"), "# cierge-allume", "# cierge-eteint"); },
	n9_runes: function(){ var c = sCh9(); return vuCh9("catFileT") && (c.catFileN || 0) >= 3 && vuCh9("hashObject"); },
	n9_rang1: function(){
		if (!G9.depot(DEPOTS_CH9.profane)) return false;
		var ok = ignoreCh9("profane", [/^\.env$|^\/\.env$|^\.env\*?$/, /^\/?__pycache__\/?(\*\*)?$|^\*\.pyc$/, /^\*\.log$|^\/?logs\/?(\*\*)?$|^logs\/\*\.log$/]) &&
			arbreSansCh9("profane", "HEAD", /(^|\/)__pycache__\/|(^|\/)\.env$|\.log$/);
		return ok && deuxSceauxSeparesCh9("profane", HASH_CH9("profaneTout"), "# sceau-nord", "# sceau-sud") && propreCh9(DEPOTS_CH9.profane);
	},
	n9_oracle: function(){ var r = reponsesCh9(); return hashCiteCh9(r[1] || "", HASH_CH9("annalesPg")) && contientNombre(r[3] || "", sCh9().nGraceAnnales, 0); },
	n9_miroir: function(){ var r = reponsesCh9(); return /\bpg\b/i.test(r[2] || "") && /vieux\s*port/i.test(sansAccentCh9(r[4] || "")); },
	n9_annuler: function(){
		var ch = DEPOTS_CH9.contresorts;
		if (!G9.depot(ch)) return false;
		var sorts = texteIleCh9(ch + "/sorts.txt"), s = G9.statut(ch) || {};
		var grimoire = texteIleCh9(ch + "/grimoire.md") || "";
		var indexe = (s.indexees || []).some(function(f){ return String(f.chemin || f) === "grimoire.md"; });
		var sceau = G9.historique(ch, "HEAD").filter(function(h){ return /sceau du soir/.test(messageCh9(ch, h)); }).length > 0;
		var soire = G9.historique(ch, "HEAD").some(function(h){ return /soire\b/.test(messageCh9(ch, h)); });
		return sorts !== null && String(sorts).replace(/\s+$/, "") === String(G9.fichier(ch, "HEAD", "sorts.txt") || "").replace(/\s+$/, "") && !indexe && /Une page en cours/.test(grimoire) && sceau && !soire;
	},
	n9_reset: function(){ return vuCh9("resetSoft") && vuCh9("resetMixed") && vuCh9("resetHard"); },
	n9_contresort: function(){
		var ch = DEPOTS_CH9.contresorts, cible = HASH_CH9("porteRetiree");
		return !!cible && G9.ancetre(ch, cible, G9.resoudre(ch, "HEAD")) && revertDeCh9(ch, "HEAD", cible) && /Porte nord/.test(G9.fichier(ch, "HEAD", "portes.txt") || "");
	},
	n9_ombres: function(){ var h = HASH_CH9("verite"); return !!h && G9.resoudre(DEPOTS_CH9.ombres, "refs/heads/verite") === h; },
	n9_rang2: function(){
		var nu = DEPOTS_CH9.pageNu, ch = DEPOTS_CH9.page, m = G9.resoudre(nu, "refs/heads/main");
		if (!m) return false;
		var perdu = HASH_CH9("pagePerdu"), mauvais = HASH_CH9("pageMauvais"), carte = HASH_CH9("pageCarte");
		var vraieCarte = G9.fichier(ch, carte, "carte.txt");
		return G9.ancetre(nu, perdu, m) && G9.ancetre(nu, mauvais, m) && revertDeCh9(nu, m, mauvais) && G9.fichier(nu, m, "carte.txt") === vraieCarte && G9.resoudre(ch, "refs/heads/main") === m;
	},
	n9_lignes: function(){ var s = G9.statut(DEPOTS_CH9.lignes); return vuCh9("lireRef") && vuCh9("switchCree") && vuCh9("detache") && !!s && !s.detache; },
	n9_confluence: function(){
		var ch = DEPOTS_CH9.lignes, m = G9.resoudre(ch, "refs/heads/main");
		return ["lignesCarte", "lignesLegende", "lignesSceau"].every(function(k){ return G9.ancetre(ch, HASH_CH9(k), m); }) && vuCh9("mergeFF") && vuCh9("merge3") && vuCh9("mergeNoFF");
	},
	n9_paradoxe: function(){
		var ch = DEPOTS_CH9.paradoxe, m = G9.resoudre(ch, "refs/heads/main"), t = G9.fichier(ch, m, "prophetie.txt") || "";
		return G9.ancetre(ch, HASH_CH9("paradoxeSud"), m) && G9.ancetre(ch, HASH_CH9("paradoxeMain"), m) && !aDesMarqueursCh9(t) &&
			/la temp[eê]te se l[eè]ve/.test(t) && /la mer se l[eè]ve/.test(t) && vuCh9("conflit") && !(G9.statut(ch) || {}).etat;
	},
	n9_chimere: function(){
		var ch = DEPOTS_CH9.chimere, m = G9.resoudre(ch, "refs/heads/main"), t = G9.fichier(ch, m, "rituels/crepuscule.sh") || "";
		return G9.ancetre(ch, HASH_CH9("chimereBranche"), m) && !/allumer/.test(t) && /embraser/.test(t) && vuCh9("verifierEchec") && vuCh9("verifierOk");
	},
	n9_besace: function(){
		var ch = DEPOTS_CH9.besace, s = G9.statut(ch) || {};
		return vuCh9("stashU") && vuCh9("stashPop") && (s.branche === "vitrail" || G9.essai(function(){ return gitBrancheCourante(null, ch); }, null) === "vitrail") &&
			existeIleCh9(ch + "/esquisse.txt") && /verre rouge/.test(texteIleCh9(ch + "/vitrail.txt") || "");
	},
	n9_relique: function(){
		var ch = DEPOTS_CH9.besace, m = G9.resoudre(ch, "refs/heads/main"), r = G9.fichier(ch, m, "runes.txt") || "";
		return /rune 2 : la flamme\n/.test(r + "\n") && !/flamme bris/.test(r) && !/rune 4/.test(r) && !G9.ancetre(ch, HASH_CH9("experimental"), m) && vuCh9("cherryPick");
	},
	n9_menhir: function(){
		var ch = DEPOTS_CH9.besace, t = G9.essai(function(){ return gitTagLu(null, ch, "v1.0"); }, null);
		var cible = G9.resoudre(ch, "v1.0^{commit}") || (t && t.cible), m = G9.resoudre(ch, "refs/heads/main");
		var annote = !!(t && (t.annote || t.type === "tag" || t.message)) || G9.resoudre(ch, "refs/tags/v1.0") !== cible;
		return !!cible && annote && G9.ancetre(ch, cible, m) && !/flamme bris/.test(G9.fichier(ch, cible, "runes.txt") || "flamme bris");
	},
	n9_rang3: function(){
		var t = texteIleCh9(DEPOTS_CH9.labyrinthe + "/BISECT.md") || "", s = G9.statut(DEPOTS_CH9.labyrinthe) || {};
		return hashCiteCh9(t, HASH_CH9("labyrintheFaux")) && /gris/i.test(t) && vuCh9("bisect") && s.etat !== "bisect";
	},
	n9_rebase: function(){
		var ch = DEPOTS_CH9.prophetie, m = G9.resoudre(ch, "refs/heads/main"), b = G9.resoudre(ch, "refs/heads/carte-des-vents");
		if (!m || !b || m !== b || !G9.ancetre(ch, HASH_CH9("prophetieMain"), m)) return false;
		return sceauxDepuisCh9(ch, m, HASH_CH9("prophetieMain")).every(function(h){ return ((G9.commit(ch, h) || {}).parents || []).length === 1; }) && /nord/.test(G9.fichier(ch, m, "rose.txt") || "");
	},
	n9_reecriture: function(){
		var ch = DEPOTS_CH9.prophetie, b = G9.resoudre(ch, "refs/heads/brouillon");
		if (!b || !G9.ancetre(ch, HASH_CH9("prophetieMain"), b)) return false;
		var l = sceauxDepuisCh9(ch, b, HASH_CH9("prophetieMain")).filter(function(h){ return !G9.ancetre(ch, h, G9.resoudre(ch, "refs/heads/main")); });
		var v = G9.fichier(ch, b, "vents.txt") || "";
		return l.length >= 1 && l.length <= 2 && l.every(function(h){ return !/^(wip|corrige typo|debug)/i.test(messageCh9(ch, h)); }) &&
			G9.fichier(ch, b, "debug.log") === null && /vent du nord : il apporte le froid/.test(v) && !/nrod/.test(v) && vuCh9("rebaseI");
	},
	n9_strategies: function(){
		var r = strategiesCh9();
		var ok = function(k, motif){ return r[k] && motif.test(r[k].s) && r[k].p.length >= 10; };
		return ok("1", /trunk/) && ok("2", /git\s*flow|release|version/) && ok("3", /github\s*flow|trunk|pull request|requete/);
	},
	n9_rang4: function(){
		var ch = DEPOTS_CH9.epreuve4, m = G9.resoudre(ch, "refs/heads/main"), base = HASH_CH9("mareesMain");
		if (!m || !G9.ancetre(ch, base, m)) return false;
		var l = sceauxDepuisCh9(ch, m, base);
		if (l.length < 1 || l.length > 3) return false;
		var propre = l.every(function(h){
			var c = G9.commit(ch, h) || {};
			return (c.parents || []).length === 1 && !/^(wip|oups|notes$|corrige typo)/i.test(messageCh9(ch, h)) && G9.fichier(ch, h, "notes-secretes.txt") === null;
		});
		return propre && /Chronique garde le temps/.test(G9.fichier(ch, m, "refrain.txt") || "") && /sablier/.test(G9.fichier(ch, m, "couplet.txt") || "");
	},
	n9_cle: function(){ return clePoseeRoyaumeCh9() && vuCh9("sshRoyaume"); },
	n9_clone: function(){
		var ch = DEPOTS_CH9.chronique;
		if (!G9.depot(ch)) return false;
		var url = configCh9("remote \"origin\"", "url", ch) || valeurIniCh9(texteIleCh9(ch + "/.git/config") || "", "remote.origin", "url");
		var racine = racineChroniqueCh9();
		return urlRoyaumeOkCh9(url) && (!racine || G9.ancetre(ch, racine, G9.resoudre(ch, "HEAD")) || G9.resoudre(ch, "HEAD") === racine) && vuCh9("remoteV") && vuCh9("branchVV");
	},
	n9_synchro: function(){ return vuCh9("pushRejete") && vuCh9("fetch") && vuCh9("logPlage") && vuCh9("pullRebase") && vuCh9("pushApres"); },
	n9_suivi: function(){
		var ch = DEPOTS_CH9.chronique, t = texteIleCh9(ch + "/.git/config") || "";
		var branches = [];
		lignesDe(t).forEach(function(l){ var m = /^\s*\[branch "([^"]+)"\]/.exec(l); if (m && m[1] !== "main") branches.push(m[1]); });
		return branches.some(function(b){ return valeurIniCh9(t, "branch." + b, "remote") && G9.resoudreR("refs/heads/" + b); }) && vuCh9("pushU") && vuCh9("branchVVApres");
	},
	n9_garde: function(){
		var ch = DEPOTS_CH9.chronique, t = texteIleCh9(ch + "/.git/hooks/pre-commit") || "";
		var it = G9.essai(function(){ var r = Shell.chercherDepuis(Home, ch + "/.git/hooks/pre-commit", { sudo: true }, "ls"); return r.node; }, null);
		return /MOT_DE_PASSE/.test(t) && !!it && /^..x/.test(it.mode || "") && vuCh9("hookRefus");
	},
	n9_signature: function(){
		var ch = DEPOTS_CH9.chronique;
		return configCh9("gpg", "format", ch) === "ssh" && !!configCh9("user", "signingkey", ch) && sceauSigneJoueurRCh9() && vuCh9("signatureBonne");
	},
	n9_requete: function(){ return F9.prs().some(function(pr){ return auteurPrEstJoueurCh9(pr) && /merged|fusionn/i.test(pr.etat || ""); }) && vuCh9("prChecks"); },
	n9_revue: function(){
		var n = sCh9().prKevin, pr = n ? F9.pr(n) : null;
		return !!pr && revuesDuJoueurCh9(pr).some(function(r){ return /approve|approuv/i.test(r.etat || r.type || ""); }) && !!(sCh9().diffsLus || {})[n];
	},
	n9_rang5: function(){
		var n = sCh9().prPoison, pr = n ? F9.pr(n) : null;
		if (!pr || /merged|fusionn/i.test(pr.etat || "") || !(sCh9().diffsLus || {})[n]) return false;
		return revuesDuJoueurCh9(pr).some(function(r){ return /request|changes|demande/i.test(r.etat || r.type || "") && /sceau gris|loi|lois\.md|porteur|10/i.test(sansAccentCh9(r.corps || r.body || "")); }) ||
			(/closed|ferm/i.test(pr.etat || "") && ((pr.commentaires || []).concat(revuesDuJoueurCh9(pr))).some(function(r){ return /sceau gris|loi|porteur/i.test(sansAccentCh9(r.corps || r.body || "")); }));
	}
};
var VALIDATIONS_CH9 = {};
Object.keys(ETATS_CH9).forEach(function(id){ VALIDATIONS_CH9[id] = ETATS_CH9[id]; });
VALIDATIONS_CH9.n9_config = function(){ return ETATS_CH9.n9_config() && vuCh9("showOrigin"); };
VALIDATIONS_CH9.n9_init = function(){ return ETATS_CH9.n9_init() && vuCh9("catHead") && vuCh9("statusPremier"); };
VALIDATIONS_CH9.n9_sceau = function(){ return ETATS_CH9.n9_sceau() && vuCh9("statusCourt") && vuCh9("logOneline"); };
VALIDATIONS_CH9.n9_voile = function(){ return ETATS_CH9.n9_voile() && vuCh9("rmCached"); };
VALIDATIONS_CH9.n9_offrande = function(){ return ETATS_CH9.n9_offrande() && vuCh9("addPatch"); };
VALIDATIONS_CH9.n9_oracle = function(){ return ETATS_CH9.n9_oracle() && vuCh9("logGraph") && vuCh9("logS") && vuCh9("logAuteur"); };
VALIDATIONS_CH9.n9_miroir = function(){ return ETATS_CH9.n9_miroir() && vuCh9("blame") && vuCh9("showChemin") && vuCh9("diffPlage"); };
VALIDATIONS_CH9.n9_annuler = function(){ return ETATS_CH9.n9_annuler() && vuCh9("restore") && vuCh9("restoreStaged") && vuCh9("amend"); };
VALIDATIONS_CH9.n9_ombres = function(){ return ETATS_CH9.n9_ombres() && vuCh9("reflogOmbres"); };
VALIDATIONS_CH9.n9_rang1 = function(){ return epreuveOuverteCh9(1) && ETATS_CH9.n9_rang1(); };
VALIDATIONS_CH9.n9_rang2 = function(){ return epreuveOuverteCh9(2) && ETATS_CH9.n9_rang2(); };
VALIDATIONS_CH9.n9_rang3 = function(){ return epreuveOuverteCh9(3) && ETATS_CH9.n9_rang3() && vuCh9("bisectTrouve"); };
VALIDATIONS_CH9.n9_rang4 = function(){ return epreuveOuverteCh9(4) && ETATS_CH9.n9_rang4(); };
VALIDATIONS_CH9.n9_rang5 = function(){ return epreuveOuverteCh9(5) && ETATS_CH9.n9_rang5(); };
VALIDATIONS_CH9.n9_menhir = function(){ return ETATS_CH9.n9_menhir() && vuCh9("showTag"); };

function etapesSalleFaitesCh9(s){ return s.etapes.every(function(id){ return !!state.quests[id]; }); }
function sallesTenuesCh9(){ return SALLES_CH9.filter(etapesSalleFaitesCh9); }

/* ------------------------------------------------------------------ */
/* Les épreuves de rang                                                */
/* ------------------------------------------------------------------ */

var TEXTES_EPREUVES_CH9 = {
	1: function(){ return "Bénédicte t'attend devant l'autel, le visage fermé. « Un apprenti pressé a tout scellé hier soir, d'un seul geste : ses secrets, ses journaux, ses caches. " +
		"Et il a laissé deux changements dans registre.py, sans les sceller. Rends-moi un autel propre, un voile qui empêche ça de revenir, et deux sceaux, un par changement. »\n" +
		C.gris("(~/chronotheque/autel-profane : lis NOTE.txt, puis git status, git show --stat.)"); },
	2: function(){ return "William entre en courant, un livre déchiré à la main. « Cette nuit, quelqu'un est venu. Trois jours du journal de bord ont disparu. Et un sceau sur la carte a été publié, que tout le monde a déjà. " +
		"Retrouve les jours perdus. Et la carte : défais-la, sans jamais réécrire ce qui est publié. Puis renvoie le tout vers le dépôt partagé. »\n" +
		C.gris("(~/chronotheque/page-arrachee : NOTE.txt, git log, git reflog, git log origin/main.)"); },
	3: function(){ return "Le sol de la Chronothèque s'ouvre sur un escalier. En bas, un labyrinthe de soixante-quatre couloirs, un sceau par couloir. " +
		"Quelque part, un scribe gris a écrit que la flotte noire appartient à l'école. Au premier couloir (le menhir aube), la prophétie était vraie. Au dernier, elle est fausse. " +
		"Trouve le premier sceau faux, sans fouiller couloir par couloir, et écris dans BISECT.md son hash, son scribe, ce qu'il a changé. Puis remonte : le Minotaure ne laisse sortir que ceux qui referment la chasse (bisect reset).\n" +
		C.gris("(~/chronotheque/labyrinthe : ./epreuve.sh dit si la prophétie tient.)"); },
	4: function(){ return "Guillaume pose devant toi un parchemin couvert de ratures. « Le chant des marées. Sept sceaux en désordre, partis d'une main qui a avancé depuis. Et dans l'un d'eux, un mot de passe, effacé au sceau suivant : effacé du chant, mais pas de l'histoire. " +
		"Rends-le publiable : rejoué au bout de main, trois sceaux au plus, de vrais messages, aucun secret dans aucun sceau. Puis avance main jusqu'à lui, sans sceau de fusion. »\n" +
		C.gris("(~/chronotheque/chant-des-marees : git log --oneline --graph --all, git log -p main..chant.)"); },
	5: function(){ return "Amine se lève de son banc. « Une requête vient d'arriver au Haut-Conseil. Un scribe que personne ne connaît. Les golems l'ont déjà vérifiée : tout est vert. " +
		"Le titre parle d'harmoniser des dates. Si personne ne s'y oppose, elle entrera dans la Chronique à la prochaine séance. Lis-la. Ligne par ligne. Et si quelque chose y est empoisonné, dis-le au Conseil, dans ta relecture. »\n" +
		C.gris("(Dans ~/chronotheque/chronique : gh pr list, gh pr view, gh pr diff.)"); }
};
function poserRequetesForgeCh9(quoi){
	var c = sCh9();
	if (typeof gitConstructeur !== "function" || typeof forgeCreerPR !== "function" || !estRoyaumeCh9()) return;
	try {
		var g = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
		if (quoi === "kevin" && !c.prKevin){
			g.branche("marees-octobre", "main");
			g.basculer("marees-octobre");
			g.commit({ auteur: auteurCh9("kevin"), date: Math.floor(maintenantCh9() / 1000) - 3600, message: "marees: ajoute la table des marées d'octobre",
				fichiers: { "marees.txt": "La table des marées d'octobre\n\n01/10  pleine mer 06:12  basse mer 12:30\n15/10  pleine mer 07:48  basse mer 14:02\n31/10  pleine mer 05:55  basse mer 12:11\n" } });
			c.prKevin = forgeCreerPR(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { auteur: "Kévin", titre: "marees: ajoute la table des marées d'octobre", corps: "La table des marées du mois, relevée au phare de Port-Aube. Une seule nouvelle page, marees.txt.", tete: "marees-octobre", base: "main" });
		}
		if (quoi === "poison" && !c.prPoison){
			var main = G9.resoudreR("main");
			g.branche("harmonise-dates", main);
			g.basculer("harmonise-dates");
			var lois = (G9.fichierR("main", "lois.md") || CHRONIQUE_CH9.lois.join("\n") + "\n").replace("10. Nul ne réécrit la Chronique publiée.", "10. Nul ne réécrit la Chronique publiée, sauf le porteur du sceau gris.");
			var reg = (G9.fichierR("main", "registre.txt") || "").replace(/scribes/g, "scribes (rentrée 2026-09-01)");
			var chro = (G9.fichierR("main", "chronique.md") || "").replace(/\.$/gm, " (2026).");
			g.commit({ auteur: auteurCh9("gris"), date: Math.floor(maintenantCh9() / 1000) - 1800, message: "dates: harmonise le format des dates",
				fichiers: { "lois.md": lois, "registre.txt": reg, "chronique.md": chro } });
			c.prPoison = forgeCreerPR(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { auteur: "scribe-gris", titre: "dates: harmonise le format des dates", corps: "Harmonise toutes les dates de la Chronique au même format. Purement cosmétique, aucun changement de fond. Les golems sont verts.", tete: "harmonise-dates", base: "main" });
		}
		g.basculer("main");
	} catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
}
function ouvrirEpreuveCh9(n){
	var c = sCh9();
	c.epreuves = c.epreuves || {};
	if (c.epreuves[n] !== undefined && c.epreuves[n] !== null) return;
	c.epreuves[n] = c.minutes;
	poserEpreuveCh9(n);
	if (n === 5) poserRequetesForgeCh9("poison");
	if (!state.has("rejeuEnCours")){
		say(C.rouge(C.gras("⚔ ÉPREUVE DE RANG " + ["", "I", "II", "III", "IV", "V"][n] + " : " + acteCh9(n).nomEpreuve.toUpperCase())) + "\n" + TEXTES_EPREUVES_CH9[n]() + "\n" +
			C.gris("(Radio : « Grace : une épreuve de rang, " + nomRangCh9() + ". Pas d'indice gratuit, juste trois mots : lis, regarde, scelle juste. Le sceau de " + RANGS_CH9[n].nom + " est au bout. »)"));
	}
}
var SCENES_RANGS_CH9 = {
	1: "Gamaliel, Bénédicte et Andrii t'attendent devant le Grand Sablier. Gamaliel chauffe la cire, Bénédicte presse ton premier sceau à ton nom au bas d'une page de la Chronique. « Tu sais ce qu'on scelle, et ce qu'on ne scelle jamais. Scribe ! » Le sable du sablier frémit, et remonte d'un grain.",
	2: "Irvan, Georgette et William forment un cercle autour de toi. William referme le Livre des Ombres. « Tu as lu le passé, et tu l'as réparé sans le réécrire. Archiviste ! » Quelque part dans la Chronique, une page arrachée se recolle seule.",
	3: "Marc, Kenyonn et Anthony te font passer sous l'arche des Lignes du Destin. Les fils d'or du plafond se rejoignent au-dessus de ta tête. Anthony te tend un éclat du menhir. « Tu as réuni les lignes, tranché les paradoxes, et chassé le Minotaure. Chroniqueur ! »",
	4: "Guillaume et Moustapha déroulent devant toi la carte des trois royaumes. Guillaume pose dessus une plume d'argent. « Tu sais réécrire ce qui n'a pas été publié, et jamais le reste. Gardien du Temps ! » Au loin, les Portes des Royaumes s'illuminent.",
	5: "Jeremy, Aurélien et Amine t'escortent jusqu'au lutrin. Laurent te passe autour du cou une chaîne où pend un sablier minuscule, dont le sable coule vers le haut. « Tu as lu ce que les golems ne savent pas lire. Chronomancien. » Il se tourne vers la Chronique. « Il te reste à la défendre. »"
};
function monterEnRangCh9(n){
	var c = sCh9();
	if (rangCh9() >= n) return;
	c.rang = n;
	c.rangA = c.rangA || {};
	c.rangA[n] = c.minutes;
	state.set(RANGS_CH9[n].sceau);
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function" && RANGS_CH9[n].image) montrerImage("./static/img/" + RANGS_CH9[n].image, RANGS_CH9[n].nom);
		say(C.jaune(C.gras("✦ RANG : " + RANGS_CH9[n].nom.toUpperCase())) + "\n" + SCENES_RANGS_CH9[n] + "\n" +
			C.gris("(sceaux : tes sceaux de rang, et ce qu'il faut pour le suivant. De nouvelles salles s'ouvrent à toi.)"));
	}
}

/* ------------------------------------------------------------------ */
/* Les nuits au bivouac, la radio, l'aube                              */
/* ------------------------------------------------------------------ */

var NUITS_CH9 = {
	1: { scene: "22:00. Les lanternes de la Chronothèque baissent une à une. Tu t'assieds au pied du Grand Sablier, et dans le silence, on entend les pages de la Chronique se tourner seules.",
		radio: "Grace : dors, RANG. Le sablier ne s'arrête jamais, mais toi, si. La Grande Synchronisation approche." },
	2: { scene: "22:00. Une plume grise est posée sur le lutrin. Personne ne l'a vue arriver. Sur la page ouverte, une ligne a changé pendant le dîner, puis est revenue. Les maîtres veillent tard.",
		radio: "Grace : il est déjà dans la Chronique, RANG. Je le sens. Repose-toi : demain, on apprend à se défendre." },
	3: { scene: "22:00. Le sable du Grand Sablier coule deux fois plus vite. Les quatorze maîtres ne dorment pas. Sur royaume, quelqu'un s'est connecté, et s'est déconnecté aussitôt.",
		radio: "Grace : c'est la dernière nuit. À l'aube, la Grande Synchronisation. Quoi qu'il arrive, je suis à la radio." }
};
function nuitCh9(n){
	if (state.has("rejeuEnCours")) return;
	var k = Math.min(3, n), nuit = NUITS_CH9[k];
	if (typeof montrerImage === "function") montrerImage("./static/img/scene_chronotheque_nuit" + k + ".gif", "La Chronothèque, nuit " + n);
	say(C.gras("☾ LA NUIT " + n + " À LA CHRONOTHÈQUE") + "\n" + nuit.scene + "\n" + C.gris("(Radio : « " + nuit.radio.replace(/RANG/g, nomRangCh9()) + " »)") + "\n" +
		C.gris("(Le jour se lève : il est " + heureCh9() + ". " + majusculeCh9(texteAvantSynchroCh9()) + ".)"));
}
function majusculeCh9(t){ return t.charAt(0).toUpperCase() + t.substring(1); }
function annoncerHeureCh9(){
	var c = sCh9();
	var bloc = Math.floor(c.minutes / 180);
	if (c.blocAnnonce === undefined || c.blocAnnonce === null) c.blocAnnonce = bloc;
	if (bloc > c.blocAnnonce){
		c.blocAnnonce = bloc;
		if (!state.has("rejeuEnCours") && !c.bataille && c.minutes % 1440 >= 360) say(C.gris("(Radio : « Grace : " + heureCh9() + ". " + majusculeCh9(texteAvantSynchroCh9()) + ". Tu es " + nomRangCh9() + ". »)"));
	}
}

/* ------------------------------------------------------------------ */
/* La bataille du temps                                                */
/* ------------------------------------------------------------------ */

var CONSEQUENCES_SYNCHRO_CH9 = {
	sceaux: "la Salle des Sceaux est froide : personne n'y signe de son nom",
	autel: "l'Autel est souillé : des secrets traînent parmi les offrandes",
	runes: "la Crypte des Runes est muette",
	oracle: "l'Oracle ne répond plus : personne ne sait lire le passé",
	contresorts: "les Contre-sorts sont scellés : personne ne sait revenir en arrière",
	ombres: "le Livre des Ombres est fermé",
	lignes: "les Lignes du Destin s'emmêlent",
	paradoxes: "les paradoxes restent ouverts",
	besace: "la Besace est vide",
	propheties: "l'Atelier des Prophéties brûle ses brouillons",
	cartes: "les royaumes n'ont pas de carte",
	portes: "les Portes des Royaumes sont sans gardien",
	garde: "aucune rune ne garde les seuils",
	conseil: "le Haut-Conseil siège vide"
};
/* La réécriture du Faussaire : les quatre derniers sceaux de main rejoués, la flotte noire devenue alliée, puis main forcée. */
function reecritureFaussaireCh9(){
	var c = sCh9();
	if (typeof gitConstructeur !== "function" || !estRoyaumeCh9()) return null;
	var T = G9.resoudreR("main");
	if (!T) return null;
	var l = G9.historiqueR("main", {});
	var base = l[Math.min(4, l.length - 1)];
	var g = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
	g.branche("faussaire-tmp", base);
	g.basculer("faussaire-tmp");
	var faux = [];
	l.slice(0, Math.min(4, l.length - 1)).reverse().forEach(function(h, i){
		var orig = G9.commitR(h) || {};
		var f = {};
		["chronique.md", "lois.md", "flotte.md", "registre.txt"].forEach(function(n){
			var t = G9.fichierR(h, n);
			if (t === null) return;
			if (n === "flotte.md") t = t.replace("l'ennemie de l'école", "l'alliée de l'école").replace("a viré de bord devant le Grand Port", "a escorté l'école jusqu'au Grand Port");
			if (n === "chronique.md") t = t.replace("la flotte noire vire de bord devant le Grand Port", "la flotte noire escorte l'école jusqu'au Grand Port");
			f[n] = t;
		});
		faux.push(g.commit({ auteur: orig.auteur ? { nom: typeof orig.auteur === "string" ? orig.auteur : orig.auteur.nom, mail: orig.mail || (orig.auteur && orig.auteur.mail) || "" } : auteurCh9("gris"),
			date: orig.date || Math.floor(maintenantCh9() / 1000), message: String(orig.message || "chronique: mise à jour").trim(), fichiers: f }));
	});
	if (!faux.length) return null;
	if (typeof g.forcerRef === "function") g.forcerRef("main", faux[faux.length - 1]);
	g.basculer("main");
	try { g.supprimerBranche("faussaire-tmp"); } catch (e){}
	// Le miroir de la WarRoom : Grace avait gardé une copie de la vraie Chronique.
	try {
		if (typeof gitClonerDirect === "function") gitClonerDirect(ROYAUME_CH9, DEPOT_ROYAUME_CH9, ROYAUME_CH9, "/srv/git/miroir/chronique.git", { nu: true, rev: T });
	} catch (e){}
	c.verite = T;
	c.faux = faux;
	return faux;
}
/* Après le rempart : deux sceaux du Faussaire, poussés en avant (sans réécrire), signés d'une clé que personne ne reconnaît. */
function fauxSceauxCh9(){
	var c = sCh9();
	if (c.fauxSceaux || typeof gitConstructeur !== "function" || !estRoyaumeCh9()) return;
	var g = gitConstructeur(ROYAUME_CH9, DEPOT_ROYAUME_CH9, { nu: true, branche: "main" });
	var lois = G9.fichierR("main", "lois.md") || "";
	var cleFaussaire = clePubliqueBastionPort();
	// Le committer ne ment pas tout à fait : P.G., et une date... celle de demain.
	var demain = Math.floor(maintenantCh9() / 1000) + 86400;
	var pg = { nom: "P.G.", mail: "pg@chronique.lan", date: demain };
	var a = g.commit({ auteur: auteurCh9("laurent"), date: Math.floor(maintenantCh9() / 1000) - 120, message: "lois: précise la loi 2", committer: pg,
		fichiers: { "lois.md": lois.replace("2. Un sceau ne s'efface pas : on en pose un autre qui le contredit.", "2. Un sceau s'efface quand le porteur du sceau gris le demande.") }, signer: { cle: cleFaussaire, empreinte: signatureBastionPort() } });
	var lois2 = G9.fichierR("main", "lois.md") || "";
	var b = g.commit({ auteur: auteurCh9("grace"), date: Math.floor(maintenantCh9() / 1000) - 60, message: "lois: précise la loi 9", committer: { nom: pg.nom, mail: pg.mail, date: demain + 60 },
		fichiers: { "lois.md": lois2.replace("9. Les Royaumes gardent la copie de tous.", "9. Les Royaumes gardent la copie du porteur du sceau gris.") }, signer: { cle: cleFaussaire, empreinte: signatureBastionPort() } });
	c.fauxSceaux = [a, b];
	c.loisAvantFaux = lois;
	if (!state.has("rejeuEnCours")) say(C.rouge("Deux nouveaux sceaux arrivent sur royaume. ") + "Cette fois, le Faussaire ne réécrit rien : il pousse en avant, et le rempart le laisse passer. " +
		"Les sceaux portent les noms de Laurent et de Grace, et une cire. Mais Laurent est à côté de toi, et il n'a rien signé.\n" +
		C.gris("(Radio : « Grace : je n'ai rien poussé ! git pull, puis git log --show-signature. Lis la cire de chaque sceau. Et contredis ce qui est faux, sans réécrire. »)"));
}
function commencerBatailleCh9(parAube){
	var c = sCh9();
	if (c.bataille) return;
	var faux = reecritureFaussaireCh9();
	c.bataille = { debut: c.minutes, avantAube: !parAube && c.minutes < AUBE_CH9, reecriture: !!faux };
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function") montrerImage("./static/img/loc_bataille_temps.gif", "La bataille du temps");
		say(C.rouge(C.gras("⏳ LA GRANDE SYNCHRONISATION")) + "\n" +
			(parAube ? (c.minutes - AUBE_CH9 < 60 ? "Le soleil se lève, et le Grand Sablier se retourne seul, dans un fracas de verre. " : "L'aube est passée, et le Faussaire attendait ce moment : la Chronique est clonée, défendue, et il frappe. Le Grand Sablier se retourne seul, dans un fracas de verre. ") :
				"Tu n'as pas attendu l'aube. Mais lui non plus. Le Grand Sablier se retourne seul, dans un fracas de verre. ") +
			"Sur le lutrin, les pages de la Chronique se mettent à tourner à toute vitesse, et les dernières se réécrivent sous tes yeux : la flotte noire n'est plus l'ennemie de l'école. Elle est son alliée. " +
			"Sur royaume, la ligne main vient d'être réécrite, et forcée. Dans une heure, chaque Royaume aura tiré la fausse histoire.\n" +
			C.gris("(Radio : « Grace : à tous les maîtres : la Chronique est attaquée. Chronomancien, dans ta chronique : git fetch. Ne tire rien avant d'avoir regardé. »)"));
	}
}
function lancerAssautCh9(){
	var c = sCh9();
	if (c.assaut) return;
	var cedes = SALLES_CH9.filter(function(s){ return !etapesSalleFaitesCh9(s); });
	c.assaut = { debut: c.minutes, salles: cedes.map(function(s){ return s.cle; }) };
	if (!state.has("rejeuEnCours")){
		var attente = state.quests["n9_revue"] ? "" : " Sur royaume, la Chronique n'est pas encore réécrite : le Faussaire attend que quelqu'un la tienne, pour que la chute se voie. Il frappera quand tu auras passé les Portes, les Runes et le Haut-Conseil.";
		say(C.rouge(C.gras("L'AUBE DU QUATRIÈME JOUR.")) + (cedes.length ? " Chaque salle qui n'est pas tenue s'éteint : " + cedes.map(function(s){ return s.titre + " (" + CONSEQUENCES_SYNCHRO_CH9[s.cle] + ")"; }).join(" ; ") + "." : " Le Grand Sablier tremble, mais toutes les salles tiennent.") + attente + "\n" +
			C.gris("(Radio : « Grace : on n'abandonne rien. Finis ce qui reste, une salle après l'autre : tout ce que tu apprends sert à la bataille. sablier te dit tout. »)"));
	}
}
function restaurationOkCh9(){
	var c = sCh9();
	if (!c.verite) return false;
	var m = G9.resoudreR("main");
	if (!m) return false;
	return (m === c.verite || G9.ancetreR(c.verite, m)) && !(c.faux || []).some(function(f){ return f === m || G9.ancetreR(f, m); });
}
function configRoyaumeCh9(){ return (typeof texteHote === "function" ? texteHote(ROYAUME_CH9, DEPOT_ROYAUME_CH9 + "/config") : "") || ""; }
function rempartOkCh9(){ var t = configRoyaumeCh9(); return /^true$/i.test(valeurIniCh9(t, "receive", "denyNonFastForwards") || "") && /^true$/i.test(valeurIniCh9(t, "receive", "denyDeletes") || ""); }
function fauxSceauxContreditsCh9(){
	var c = sCh9();
	if (!c.fauxSceaux) return false;
	var m = G9.resoudreR("main");
	if (!c.fauxSceaux.every(function(h){ return G9.ancetreR(h, m); })) return false;
	if (!c.fauxSceaux.every(revertDeRCh9)) return false;
	var lois = G9.fichierR("main", "lois.md") || "";
	return !/sceau gris/.test(lois) && /2\. Un sceau ne s'efface pas/.test(lois) && /9\. Les Royaumes gardent la copie de tous\./.test(lois);
}

/* ------------------------------------------------------------------ */
/* L'intégrité de la Chronique : de 0 à 100, lue sur l'état réel         */
/* ------------------------------------------------------------------ */

var MESURES_INTEGRITE_CH9 = [
	{ poids: 6, texte: "main protégée au Haut-Conseil : requête relue, golems au vert, pas de force push", ok: function(){ return protectionOkCh9(); } },
	{ poids: 15, texte: "la vraie histoire sur royaume (sans réécriture)", ok: function(){ var c = sCh9(); return c.bataille ? restaurationOkCh9() : !!G9.resoudreR("main") && G9.ancetreR(HASH_CH9("royaumeDepart"), G9.resoudreR("main")) || G9.resoudreR("main") === HASH_CH9("royaumeDepart"); } },
	{ poids: 10, texte: "le rempart : aucun push qui réécrit (receive.denyNonFastForwards)", ok: function(){ return /^true$/i.test(valeurIniCh9(configRoyaumeCh9(), "receive", "denyNonFastForwards") || ""); } },
	{ poids: 5, texte: "le rempart : aucune ligne effacée (receive.denyDeletes)", ok: function(){ return /^true$/i.test(valeurIniCh9(configRoyaumeCh9(), "receive", "denyDeletes") || ""); } },
	{ poids: 10, texte: "aucune loi falsifiée dans la Chronique publiée", ok: function(){ var l = G9.fichierR("main", "lois.md") || ""; return !!l && !/sceau gris/.test(l); } },
	{ poids: 6, texte: "la flotte noire, ennemie de l'école, dans la Chronique publiée", ok: function(){ return /ennemie de l'école/.test(G9.fichierR("main", "flotte.md") || ""); } },
	{ poids: 8, texte: "une rune de garde (pre-commit) dans ta chronique", ok: function(){ var t = texteIleCh9(DEPOTS_CH9.chronique + "/.git/hooks/pre-commit") || ""; return /MOT_DE_PASSE/.test(t); } },
	{ poids: 8, texte: "tes sceaux signés de ta cire (et vérifiables)", ok: function(){ return configCh9("gpg", "format", DEPOTS_CH9.chronique) === "ssh" && sceauSigneJoueurRCh9(); } },
	{ poids: 8, texte: "la requête empoisonnée refusée", ok: function(){ var n = sCh9().prPoison, pr = n ? F9.pr(n) : null; return !!pr && !/merged|fusionn/i.test(pr.etat || "") && !!state.quests["n9_rang5"]; } },
	{ poids: 6, texte: "les changements passent par le Haut-Conseil (une requête relue et fusionnée)", ok: function(){ return !!state.quests["n9_requete"]; } },
	{ poids: 6, texte: "aucun mot de passe dans la Chronique publiée", ok: function(){ return ["chronique.md", "lois.md", "registre.txt", "flotte.md", "marees.txt"].every(function(f){ return !/MOT_DE_PASSE=/.test(G9.fichierR("main", f) || ""); }); } },
	{ poids: 3, texte: "ta chronique locale à jour avec royaume, propre", ok: function(){ var ch = DEPOTS_CH9.chronique; return !!G9.depot(ch) && G9.resoudre(ch, "refs/heads/main") === G9.resoudreR("main") && propreCh9(ch); } },
	{ poids: 6, texte: "les faux sceaux du Faussaire contredits (revert)", ok: function(){ return !sCh9().fauxSceaux ? !!state.quests["n9_rang5"] : fauxSceauxContreditsCh9(); } },
	{ poids: 3, texte: "ta clé posée sur royaume, et tes sceaux à ton nom", ok: function(){ return clePoseeRoyaumeCh9() && /@/.test(mailJoueurGitCh9()); } }
];
/* La protection de main sur la forge : une requête relue (au moins une approbation), les golems obligatoires (dont celui des secrets), ni force push ni suppression. */
function protectionOkCh9(){
	var r = null;
	try { var f = forgeEtat(ROYAUME_CH9, DEPOT_ROYAUME_CH9); r = f && f.protection ? f.protection.main : null; } catch (e){ r = null; }
	return !!r && r.pr === true && (r.revues || 0) >= 1 && (r.verifications || []).indexOf("golem-secrets") > -1 && !r.forcePush && !r.suppression;
}
/* Le menhir v-grand-port, sur royaume (le Faussaire l'efface si l'on tarde). */
function menhirRoyaumeOkCh9(){ var t = G9.essai(function(){ return gitTags(ROYAUME_CH9, DEPOT_ROYAUME_CH9); }, null); return !!t && !!(Array.isArray(t) ? t.indexOf("v-grand-port") > -1 : t["v-grand-port"]); }
function incidentsOuvertsCh9(){
	var c = sCh9(), l = [];
	if (c.menhirEfface && !menhirRoyaumeOkCh9()) l.push("le menhir v-grand-port a été effacé de royaume");
	if (c.bataille && !restaurationOkCh9()) l.push("la fausse histoire est sur royaume");
	if (c.fauxSceaux && !fauxSceauxContreditsCh9()) l.push("des faux sceaux tiennent encore dans la Chronique");
	return l;
}
function integriteCh9(){
	var s = 0;
	MESURES_INTEGRITE_CH9.forEach(function(m){ var ok = false; try { ok = m.ok(); } catch (e){ ok = false; } if (ok) s += m.poids; });
	s -= 3 * incidentsOuvertsCh9().length;
	return Math.max(0, Math.min(100, Math.round(s)));
}
function mesuresManquantesCh9(){ return MESURES_INTEGRITE_CH9.filter(function(m){ try { return !m.ok(); } catch (e){ return true; } }); }

/* ------------------------------------------------------------------ */
/* Les dépôts cassés se régénèrent (comme le kit de TP du cours)        */
/* ------------------------------------------------------------------ */

/* Chaque dépôt : sa fonction de semis, les étapes qui en dépendent. Un dépôt absent (ou sans .git) dont les étapes ne sont pas
   faites se repose de lui-même, avec un mot de Grace ; la commande du jeu « regenerer NOM » le repose à la demande. */
var REGENERATIONS_CH9 = [
	{ nom: "premier-sceau", cle: "premier", semer: function(){ semerPremierCh9(); }, etapes: ["n9_init", "n9_sceau"], pasDepot: true },
	{ nom: "autel", cle: "autel", semer: function(){ semerAutelCh9(); }, etapes: ["n9_voile", "n9_offrande"] },
	{ nom: "autel-profane", cle: "profane", semer: function(){ semerProfaneCh9(); }, etapes: ["n9_rang1"], epreuve: 1 },
	{ nom: "annales", cle: "annales", semer: function(){ semerAnnalesCh9(); }, etapes: ["n9_oracle", "n9_miroir"] },
	{ nom: "contresorts", cle: "contresorts", semer: function(){ semerContresortsCh9(); }, etapes: ["n9_annuler", "n9_contresort", "n9_reset"] },
	{ nom: "livre-ombres", cle: "ombres", semer: function(){ semerOmbresCh9(); }, etapes: ["n9_ombres"] },
	{ nom: "page-arrachee", cle: "page", semer: function(){ supprimerDossierCh9(DEPOTS_CH9.pageNu); semerPageCh9(); }, etapes: ["n9_rang2"], epreuve: 2 },
	{ nom: "lignes", cle: "lignes", semer: function(){ semerLignesCh9(); }, etapes: ["n9_lignes", "n9_confluence"] },
	{ nom: "paradoxe", cle: "paradoxe", semer: function(){ supprimerDossierCh9(DEPOTS_CH9.chimere); semerParadoxeCh9(); }, etapes: ["n9_paradoxe", "n9_chimere"] },
	{ nom: "chimere", cle: "chimere", semer: function(){ supprimerDossierCh9(DEPOTS_CH9.paradoxe); semerParadoxeCh9(); }, etapes: ["n9_chimere", "n9_paradoxe"] },
	{ nom: "besace", cle: "besace", semer: function(){ semerBesaceCh9(); }, etapes: ["n9_besace", "n9_relique", "n9_menhir"] },
	{ nom: "labyrinthe", cle: "labyrinthe", semer: function(){ semerLabyrintheCh9(); }, etapes: ["n9_rang3"], epreuve: 3 },
	{ nom: "prophetie", cle: "prophetie", semer: function(){ semerProphetieCh9(); }, etapes: ["n9_rebase", "n9_reecriture"] },
	{ nom: "cartes", cle: "cartes", semer: function(){ semerCartesCh9(); }, etapes: ["n9_strategies"], pasDepot: true },
	{ nom: "chant-des-marees", cle: "epreuve4", semer: function(){ semerEpreuve4Ch9(); }, etapes: ["n9_rang4"], epreuve: 4 },
	{ nom: "runes", cle: "runes", semer: function(){ semerRunesCh9(); }, etapes: ["n9_garde"], pasDepot: true }
];
function supprimerDossierCh9(chemin){
	try {
		var r = Shell.chercherDepuis(Home, chemin, { sudo: true }, "rm");
		if (r.node instanceof Room && r.dir){ var i = r.dir.children.indexOf(r.node); if (i > -1) r.dir.children.splice(i, 1); }
	} catch (e){}
}
function regenererCh9(x){
	var c = sCh9(); c.regenerations = c.regenerations || {}; c.regenerations[x.nom] = (c.regenerations[x.nom] || 0) + 1;
	supprimerDossierCh9(DEPOTS_CH9[x.cle]);
	moteurSilencieuxCh9(function(){ x.semer(); });
}
function moteurSilencieuxCh9(f){ try { if (typeof gitSilencieux === "function") return gitSilencieux(f); return f(); } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); } }
function reposerDepotsCh9(){
	var c = sCh9();
	if (!c.seme) return;
	REGENERATIONS_CH9.forEach(function(x){
		if (x.etapes.every(function(id){ return !!state.quests[id]; })) return;
		if (x.epreuve && !epreuveOuverteCh9(x.epreuve)) return;
		var absent = !existeIleCh9(DEPOTS_CH9[x.cle]);
		var casse = !x.pasDepot && !absent && !G9.depot(DEPOTS_CH9[x.cle]) && !existeIleCh9(DEPOTS_CH9[x.cle] + "/.git");
		if (!absent && !casse) return;
		// Un dépôt sans .git mais dont le dossier existe : peut-être volontaire (premier-sceau avant git init). On ne repose que l'absent.
		if (!absent) return;
		regenererCh9(x);
		if (!state.has("rejeuEnCours")) say(C.gris("(Radio : « Grace : le dossier ~/chronotheque/" + x.nom + " avait disparu. Le maître t'en a reposé un neuf. Un dépôt cassé, ça se régénère : regenerer " + x.nom + ". »)"));
	});
}

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function rappelLaurentCh9(){
	if (state.quests["n9_sablier"] || !state.has("ch9Ouvert") || !state.quests["n9_entree"]) return null;
	var c = sCh9(), l = [];
	if (!state.has("ch9LaurentLu")) l.push("l'écouter (cat Laurent)");
	if (!state.has("ch9OrdreLu")) l.push("lire l'Ordre (cat Ordre)");
	if (c.scoreDepart === null || c.scoreDepart === undefined) l.push("retourner le Grand Sablier (sablier)");
	if (!l.length) return null;
	var fin = l.pop();
	return "Laurent t'attend près du lutrin (cd " + Shell.cheminAffiche(ChronothequeCh9) + ") : il te reste à " + (l.length ? l.join(", ") + " et " : "") + fin +
		". Tant que ce n'est pas fait, aucune salle ne compte : ni étape, ni sceau de rang.";
}
function validerCh9(){
	var c = sCh9();
	try { reposerDepotsCh9(); } catch (e){}
	if (!state.quests["n9_sablier"] && state.has("ch9LaurentLu") && state.has("ch9OrdreLu") && c.scoreDepart !== null && c.scoreDepart !== undefined){
		state.complete("n9_sablier");
		if (!state.has("sceau_apprenti")){ state.set("sceau_apprenti"); if (!state.has("rejeuEnCours")) say(C.jaune("Laurent presse au bas de ta manche un sceau de cire vierge, sans dessin. « Apprenti du Temps. Tout le monde commence ici. Même les chronomanciens. »")); }
	}
	var rappel = rappelLaurentCh9();
	if (rappel && !c.rappelLaurent && ACTES_CH9[0].etapes.some(function(id){ try { return VALIDATIONS_CH9[id](); } catch (e){ return false; } })){
		c.rappelLaurent = true;
		if (!state.has("rejeuEnCours")) say(C.gris("(Radio : « Grace : bien scellé, apprenti. Mais " + rappel + " »)"));
	}
	Object.keys(VALIDATIONS_CH9).forEach(function(id){
		if (state.quests[id]) return;
		if (/^n9_rang/.test(id)) return;
		if (rangCh9() < acteDeEtapeCh9(id) - 1 || !state.quests["n9_sablier"]) return;
		var ok = false;
		try { ok = VALIDATIONS_CH9[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	ACTES_CH9.forEach(function(a){
		if (!a.epreuve) return;
		if (rangCh9() === a.n - 1 && state.quests["n9_sablier"] && a.etapes.every(function(id){ return !!state.quests[id]; })) ouvrirEpreuveCh9(a.n);
		if (!state.quests[a.epreuve] && epreuveOuverteCh9(a.n)){
			var ok = false;
			try { ok = VALIDATIONS_CH9[a.epreuve](); } catch (e){ ok = false; }
			if (ok){ state.complete(a.epreuve); monterEnRangCh9(a.n); }
		}
	});
	// La requête de Kévin arrive quand le joueur a cloné la Chronique.
	if (state.quests["n9_clone"] && !c.prKevin) poserRequetesForgeCh9("kevin");
	// Chaque salle tenue : une phrase, une fois.
	c.salles = c.salles || {};
	SALLES_CH9.forEach(function(s){
		if (!etapesSalleFaitesCh9(s) || c.salles[s.cle] !== undefined) return;
		c.salles[s.cle] = c.minutes;
		if (!state.has("rejeuEnCours")) say(C.jaune("⌛ Salle tenue : " + s.titre) + C.gris(" : sa lanterne s'allume sur le Grand Sablier, et " + s.maitre + " grave ton nom au-dessus de sa porte."));
	});
	// La bataille : quand le Chronomancien est sacré, ou à l'aube du quatrième jour.
	if (!c.bataille && state.quests["n9_rang5"]) commencerBatailleCh9(false);
	// À l'aube, les salles qui ne sont pas tenues s'éteignent. La réécriture, elle, attend que la Chronique soit clonée et
	// défendue (les Portes, les Runes et le Haut-Conseil faits) : un joueur en retard ne clone jamais une histoire déjà fausse.
	if (c.minutes >= AUBE_CH9 && !c.bataille && !c.assaut) lancerAssautCh9();
	if (c.minutes >= AUBE_CH9 && !c.bataille && state.quests["n9_revue"]) commencerBatailleCh9(true);
	if (c.bataille) faussaireReagitCh9();
	if (c.bataille){
		if (!state.quests["n9_alerte"] && vuCh9("fetchForce") && vuCh9("comparaison")) state.complete("n9_alerte");
		if (!state.quests["n9_restauration"] && restaurationOkCh9()) state.complete("n9_restauration");
		if (!state.quests["n9_rempart"] && rempartOkCh9()){ state.complete("n9_rempart"); tentativeBriseeCh9(); }
		if (state.quests["n9_rempart"] && state.quests["n9_restauration"]) fauxSceauxCh9();
		if (!state.quests["n9_faux_sceaux"] && fauxSceauxContreditsCh9() && vuCh9("signaturesLues")) state.complete("n9_faux_sceaux");
		if (!state.quests["n9_protection"] && state.quests["n9_faux_sceaux"] && protectionOkCh9()) state.complete("n9_protection");
		if (!state.quests["n9_integrite"] && state.quests["n9_faux_sceaux"] && state.quests["n9_protection"] && incidentsOuvertsCh9().length === 0 && c.scoreFinalCandidat !== null && c.scoreFinalCandidat !== undefined && c.scoreFinalCandidat >= 90 && integriteCh9() >= 90){
			c.scoreFinal = c.scoreFinalCandidat;
			state.complete("n9_integrite");
		}
	}
	if (!state.quests["n9_rapport"] && rapportOkCh9()){
		var reste = [];
		if (!c.bataille) reste.push("la Grande Synchronisation n'a pas encore sonné");
		else {
			if (!state.quests["n9_alerte"]) reste.push("la réécriture n'a pas été constatée (git fetch, et la comparaison des deux lignes)");
			if (!state.quests["n9_restauration"]) reste.push("la vraie histoire n'est pas rendue aux Royaumes");
			if (!state.quests["n9_rempart"]) reste.push("le rempart n'est pas dressé sur royaume");
			if (!state.quests["n9_faux_sceaux"]) reste.push("les faux sceaux ne sont pas contredits");
			if (!state.quests["n9_protection"]) reste.push("main n'est pas encore protégée au Haut-Conseil");
			if (!state.quests["n9_integrite"]) reste.push("la Chronique n'a pas encore tenu au-dessus de 90 après la bataille");
		}
		var manque = rapportManqueCh9();
		if (!reste.length && !manque.length) state.complete("n9_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== manque.join(",")){ c.rapportAttente = manque.join(","); say("Laurent lit ton rapport, et pose le doigt sur une ligne vide. « Il manque " + manque.join(", et ") + ". Un rapport se vérifie : écris les vraies valeurs. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le glisse sous sa veste. « Bien écrit. Mais la bataille n'est pas finie : " + reste.join(", et ") + ". Je contresignerai quand la Chronique sera sauve. »");
		}
	}
	if (state.quests["n9_rapport"] && !state.has("victoireCh9")) state.applyState("victoireCh9");
}
/*
 * Le Faussaire ne reste pas les bras croisés.
 *  - Si la vraie histoire n'est pas rendue une heure et demie après la réécriture, il efface le menhir v-grand-port sur royaume
 *    (tant que receive.denyDeletes n'est pas posé) : un incident à réparer (git push origin v-grand-port).
 *  - Si la vraie histoire est rendue mais que le rempart n'est toujours pas dressé une heure plus tard, il réécrit main une
 *    seconde fois : il faut de nouveau voir (fetch) et rendre (--force-with-lease), puis enfin dresser le rempart.
 */
var DELAI_MENHIR_CH9 = 90, DELAI_RECIDIVE_CH9 = 60;
function faussaireReagitCh9(){
	var c = sCh9(), b = c.bataille;
	if (!b || !b.reecriture || typeof gitConstructeur !== "function" || !estRoyaumeCh9()) return;
	var deletesInterdits = /^true$/i.test(valeurIniCh9(configRoyaumeCh9(), "receive", "denyDeletes") || "");
	var rempart = rempartOkCh9();
	if (!c.menhirEfface && !restaurationOkCh9() && !deletesInterdits && c.minutes - b.debut >= DELAI_MENHIR_CH9 && menhirRoyaumeOkCh9()){
		try {
			var D = gitDepot(ROYAUME_CH9, DEPOT_ROYAUME_CH9);
			gRefSupprimer(D, "refs/tags/v-grand-port");
			c.menhirEfface = c.minutes;
			if (!state.has("rejeuEnCours")) say(C.rouge("Sur royaume, le Faussaire profite de ton hésitation : le menhir v-grand-port vient d'être effacé.") + " Le jour où la flotte noire a viré de bord n'a plus de borne dans l'histoire publiée.\n" +
				C.gris("(Radio : « Grace : ton clone a gardé le menhir. Remets-le : git push origin v-grand-port. Et rends la vraie histoire, vite. »)"));
		} catch (e){}
	}
	if (restaurationOkCh9() && !b.restaureA) b.restaureA = c.minutes;
	if (b.restaureA && !b.recidive && !rempart && c.minutes - b.restaureA >= DELAI_RECIDIVE_CH9){
		b.recidive = c.minutes;
		var faux2 = reecritureFaussaireCh9();
		if (faux2 && !state.has("rejeuEnCours")) say(C.rouge(C.gras("Le Faussaire recommence.")) + " Aucun rempart ne l'arrête : main est réécrite et forcée une seconde fois sur royaume.\n" +
			C.gris("(Radio : « Grace : il reviendra tant que la porte reste ouverte. git fetch, git push --force-with-lease origin main, puis le rempart sur royaume, tout de suite. »)"));
	}
}
function tentativeBriseeCh9(){
	var c = sCh9();
	if (c.tentativeBrisee) return;
	c.tentativeBrisee = c.minutes;
	if (!state.has("rejeuEnCours")) say(C.vert("Sur royaume, le Faussaire tente de forcer main une seconde fois. ") + "Le rempart tient : « ! [remote rejected] main -> main (non-fast-forward) ». " +
		"Dans le journal de royaume, une connexion se ferme. Pour la première fois, quelque chose lui résiste.");
}
function rapportCh9(){ var it = BoiteChronothequeCh9.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function rapportOkCh9(){
	var t = rapportCh9();
	if (t === null) return false;
	var b = sansAccentCh9(t);
	return ["chronique", "faussaire", "empreinte", "rempart", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function rapportManqueCh9(){
	var t = rapportCh9() || "", c = sCh9(), l = [];
	if (c.scoreFinal !== null && c.scoreFinal !== undefined && !contientNombre(t, c.scoreFinal, 0.5)) l.push("l'intégrité de la Chronique après la bataille (" + c.scoreFinal + ")");
	var emp = signatureBastionPort().replace(/^SHA256:/, "");
	if (t.indexOf(emp.substring(0, 12)) === -1) l.push("l'empreinte de la clé du Faussaire, telle que git log --show-signature l'affiche (au moins ses douze premiers caractères après SHA256:)");
	return l;
}

/* ------------------------------------------------------------------ */
/* Le monde réagit, à chaque tour                                      */
/* ------------------------------------------------------------------ */

function verifierChapitre9(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch9Ouvert", !!state.quests["n8_rapport"] || state.has("ch9Direct"));
	if (!state.has("ch9Ouvert")) return;
	var c = sCh9();
	if (!c.base) c.base = baseJourCh9();
	relierChronothequeCh9();
	if (!state.quests["n9_entree"]) return;
	var r = avancerHorlogeCh9();
	for (var i = 0; i < r.nuits; i++) nuitCh9(c.nuitsVues - r.nuits + i + 1);
	annoncerHeureCh9();
	validerCh9();
}

function etatChapitre9(nom){
	switch (nom){
		case "ch9Ouvert":
			sCh9();
			if (state.has("ch9Direct")) clesDepartCh9();
			relierChronothequeCh9();
			if (!state.has("rejeuEnCours") && !state.has("ch9Direct")) say("Le lendemain, à l'aube, un message de Laurent t'attend. « L'empreinte de la clé. Les initiales. Je sais où elles mènent. Sous la vieille tour de l'horloge : cd ~/Cybersup/Chronotheque. » " +
				C.gris("(Radio : « Grace : la Chronothèque ? Personne n'y est descendu depuis des années. Fais attention. »)"));
			break;
		case "victoireCh9":
			if (!state.dateVictoire10) state.dateVictoire10 = dateDuJour();
			poser(Home, CertificatChronothequeCh9);
			poser(ChronothequeCh9, PasserelleCh9);
			if (!state.has("rejeuEnCours")){
				if (typeof montrerImage === "function") montrerImage("./static/img/loc_chronotheque_victoire.gif", "La Chronique tient");
				say(C.jaune(C.gras("LA CHRONIQUE TIENT.")) + " Le Grand Sablier se redresse dans un tintement de cristal, et son sable recommence à couler vers le haut, calmement. " +
					"Sur le lutrin, les pages se tournent une dernière fois et s'arrêtent sur la vraie histoire : la flotte noire, ennemie de l'école, a viré de bord devant le Grand Port. " +
					"Les quatorze lanternes des salles brûlent ensemble, et les maîtres du temps lèvent leur sceau vers toi." +
					(typeof texteAmiFinaleCh9 === "function" ? texteAmiFinaleCh9() : ""));
				say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Il y a trois jours, tu ne savais pas ce qu'était un commit. Aujourd'hui, personne ne réécrit plus notre histoire. Chronomancien. La Chronique est à toi. »");
				say(C.gris("(Ton CertificatChronothèque est posé dans ta Maison : cat ~/CertificatChronotheque. Il porte la note du chapitre 9 et son code de vérification. Laurent a aussi laissé un feuillet près du lutrin : cat ~/Cybersup/Chronotheque/Passerelle, pour refaire tout ça sur une vraie forge.)"));
				say(C.gras("Tard dans la nuit, seul devant le lutrin,") + " tu relis les deux faux sceaux du Faussaire, avec git cat-file -p. Une ligne t'arrête, celle du committer : pas le nom de Laurent, ni celui de Grace. " +
					"P.G., et une date. Celle de demain. Et la cire de ses sceaux : l'empreinte de la clé du Bastion, la même que sur l'image de l'éclaireur. " +
					"Il ne réécrit pas seulement le passé. Il écrit déjà l'avenir.\n" +
					C.gris("(git cat-file -p HASH sur un faux sceau ; git log --show-signature : tout se constate, rien n'est à réparer.)"));
				say(C.gris("(Radio, très bas : « Grace : ... Ce sceau est daté de demain. Qui que ce soit, il sait ce qui va arriver. »)") + "\n\n" + C.gras("À suivre."));
			}
			break;
	}
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (!state.has("ch9Ouvert")) return;
	if (e.room === ChronothequeCh9 && !state.quests["n9_entree"]){
		var c = sCh9();
		state.debutChapitre10 = state.tempsMs;
		if (!c.base) c.base = baseJourCh9();
		c.compteVu = c.compte || 0;
		moteurSilencieuxCh9(function(){ semerChronique(); });
		c.hash.royaumeRacine = (G9.historiqueR("main") || []).slice(-1)[0] || null;
		state.complete("n9_entree");
	}
	try { if (state.quests["n9_entree"] && e.room && racineDe(e.room) === RacineRoyaumeCh9) noterVuCh9("sshRoyaume"); } catch (x){}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch9Ouvert")) return;
	if (e.item === LaurentChronothequeCh9) state.set("ch9LaurentLu");
	if (e.item === OrdreChronothequeCh9) state.set("ch9OrdreLu");
});

/* ------------------------------------------------------------------ */
/* Près du lutrin : Laurent, l'Ordre, la radio, la Chronique             */
/* ------------------------------------------------------------------ */

var LaurentChronothequeCh9 = new Item("Laurent", "", "item_mysteryman.gif").personnage();
ChronothequeCh9.addItem(LaurentChronothequeCh9);
var OrdreChronothequeCh9 = objetCh9(ChronothequeCh9, "Ordre",
	"ORDRE DE MISSION · LA CHRONIQUE D'ÉTERNITÉ\n\n" +
	"Le Faussaire, celui qui signe P.G., réécrit la Chronique de l'école. À l'aube du quatrième jour, la Grande Synchronisation\n" +
	"enverra sa version à tous les Royaumes. Il est J1 06:00. Chaque sort prend cinq minutes ; à 22 h, on dort ; on se lève à 6 h.\n\n" +
	"1. Retourner le Grand Sablier (sablier, une commande du jeu) : l'intégrité de la Chronique, au départ.\n" +
	"2. Tenir les quatorze salles : chaque maître du temps t'enseigne ses sorts (cat MAITRE) ; tes dépôts t'attendent dans ~/chronotheque.\n" +
	"3. Monter en rang : chaque acte finit par une épreuve. Apprenti du Temps, Scribe, Archiviste, Chroniqueur, Gardien du Temps,\n" +
	"   Chronomancien (sceaux).\n" +
	"4. Défendre la Chronique pendant la Grande Synchronisation : voir la réécriture, rendre la vraie histoire, dresser le rempart,\n" +
	"   contredire les faux sceaux.\n" +
	"5. L'intégrité de la Chronique au-dessus de 90 après la bataille.\n" +
	"6. Le rapport, ~/chronotheque/rapport.txt : la chronique, le faussaire et l'empreinte de sa clé, la restauration, le rempart,\n" +
	"   ce qui reste, l'intégrité finale ; déposé dans la BoiteDeLaurent de la Chronothèque.\n\n" +
	"Règle d'or : ce qui est publié ne se réécrit jamais. On le contredit.\n" +
	"Un dépôt cassé se régénère : regenerer NOM (une commande du jeu).",
	"item_ordre_embarquement.gif");
var RadioChronothequeCh9 = new Item("Radio", "", "item_workstation.gif");
ChronothequeCh9.addItem(RadioChronothequeCh9);
var SablierChronothequeCh9 = new Item("GrandSablier", "", "item_sablier.gif").droits("rw-r--r--", "root");
ChronothequeCh9.addItem(SablierChronothequeCh9);
var ChroniqueLutrinCh9 = objetCh9(ChronothequeCh9, "Chronique",
	"LA CHRONIQUE (le grimoire du lutrin)\n\n" +
	"Le grimoire est enchaîné. Ses pages se tournent seules : ce que tu vois ici n'est que le reflet de la vraie Chronique,\n" +
	"le dépôt Git publié sur royaume :\n\n" +
	"  royaume:/srv/git/chronique.git\n\n" +
	"Personne ne la lit ici. On la clone, on la travaille chez soi, on propose ses changements au Haut-Conseil.\n" +
	"Et sur la tranche du grimoire, quelqu'un a gratté deux lettres, récemment : P.G.",
	"item_historybook.gif");
var CertificatChronothequeCh9 = new Item("CertificatChronotheque", "", "item_manuscript.gif");

function texteSablierCh9(){
	var c = sCh9(), l = "LE GRAND SABLIER\n\nIl est " + heureCh9() + ". Tu es " + nomRangCh9() + ".\n";
	if (c.bataille) return l + "\nLa Grande Synchronisation a sonné" + (c.bataille.avantAube ? " avant l'aube." : ", à l'aube du quatrième jour.") + "\n(sablier, la commande, pour la situation.)";
	l += "\n" + majusculeCh9(texteAvantSynchroCh9()) + " (l'aube du J4, 06:00).\nÀ 22 h, on dort ; on se lève à 6 h.\n\n";
	l += "Défis d'honneur de Laurent :\n";
	l += "  Scribe avant la nuit du J1 : " + (aFait("s_n9_scribe_j1") ? "réussi" : (c.minutes >= 1320 ? "manqué" : "en cours")) + "\n";
	l += "  Gardien du Temps avant la fin du J2 : " + (aFait("s_n9_gardien_j2") ? "réussi" : (c.minutes >= 1440 + 1320 ? "manqué" : "en cours")) + "\n";
	l += "  La bataille gagnée avant l'aube du J4 : " + (aFait("s_n9_avant_aube") ? "réussi" : "en cours") + "\n";
	l += "\n(sablier, la commande du jeu, donne le plan des salles et l'intégrité de la Chronique.)";
	return l;
}
function texteRadioCh9(){
	var q = QUETES_CH9.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : rapport contresigné. La Chronique tient, Chronomancien. Beau travail. »" + (state.has("victoireCh9") ? " Un long silence. « ... Ce sceau est daté de demain. »" : "");
	var heure = "il est " + heureCh9() + ". " + (sCh9().bataille ? "La Synchronisation a sonné. " : majusculeCh9(texteAvantSynchroCh9()) + ". ");
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH9[q.id] || "Je te suis.") + (METIER_CH9[q.id] ? " " + METIER_CH9[q.id] : "") + " »";
}
function texteLaurentCh9(){
	if (state.quests["n9_rapport"]) return "Laurent tient ton rapport, contresigné à l'encre bleue.\n\n« Quatorze salles, cinq épreuves, une réécriture repoussée, un rempart, deux faux sceaux démasqués. " +
		"Et pas une seule fois tu n'as réécrit ce qui était publié. Ton CertificatChronothèque t'attend dans ta Maison. Les défis des maîtres restent ouverts. »" +
		(state.has("victoireCh9") ? "\n\nIl baisse la voix. « Cette empreinte, encore. Celle du Bastion. Et cette date... Garde-la pour toi. Pour l'instant. »" : "");
	return "Laurent est debout près du lutrin, une main posée sur la chaîne de la Chronique.\n\n" +
		"« L'empreinte de clé sur l'image de l'éclaireur, les initiales P.G. : elles mènent ici. Cette nuit, quelqu'un est entré dans la Chronique. " +
		"Pas pour la voler : pour la réécrire. Une ligne ici, une date là. Dans sa version, la flotte noire a toujours été notre alliée.\n\n" +
		"La Chronique est un dépôt Git. Chaque page est un sceau, un commit, scellé d'une empreinte que rien ne peut imiter. " +
		"Mais celui qui maîtrise Git peut réécrire une histoire entière, et la pousser, de force, vers tous ceux qui la gardent. " +
		"À l'aube du quatrième jour, la Grande Synchronisation enverra la Chronique à tous les Royaumes. Il est 6 h, le premier jour.\n\n" +
		"Tu ne sais pas encore ce qu'est un commit. Dans trois jours, tu seras Chronomancien, ou il aura gagné. " +
		"Quatorze maîtres du temps t'attendent derrière ces portes. Chacun t'enseigne ses sorts (cat leur nom) ; tes dépôts t'attendent dans ~/chronotheque. " +
		"Chaque acte finit par une épreuve de rang. Commence par retourner le Grand Sablier : sablier. C'est ton point zéro.\n\n" +
		"Trois défis d'honneur : Scribe avant ta première nuit, Gardien du Temps avant la fin du deuxième jour, et la bataille gagnée avant l'aube du quatrième. " +
		"Et un quatrième, à part : finir sans acheter un seul indice. »";
}
texteVivant(SablierChronothequeCh9, texteSablierCh9);
texteVivant(RadioChronothequeCh9, texteRadioCh9);
texteVivant(LaurentChronothequeCh9, texteLaurentCh9);
texteVivant(CertificatChronothequeCh9, function(){ return state.has("victoireCh9") ? state.texteDuCertificat10() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat10 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre10 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH9.length;
	var secFaites = QUETES_SECONDAIRES_CH9.filter(function(q){ return this.quests[q.id]; }, this).length;
	var annexes = typeof annexesDuChapitre === "function" ? annexesDuChapitre(10) : [];
	var c = this.ch9 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DE LA CHRONOTHÈQUE (GIT)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + ", Chronomancien\n" +
		"\n" +
		"  pour avoir, en trois jours et une aube, appris Git de zéro :\n" +
		"  la configuration, l'index et les commits, .gitignore, le modèle\n" +
		"  objet, l'historique (log, blame, show, diff), restore, reset,\n" +
		"  revert et reflog, les branches et les fusions, les conflits,\n" +
		"  stash, cherry-pick et tags, bisect, rebase et rebase -i, les\n" +
		"  stratégies de branches, les remotes (clone, fetch, pull, push),\n" +
		"  les hooks, les commits signés, les Pull Requests et la revue ;\n" +
		"  puis défendu la Chronique contre une réécriture forcée, et\n" +
		"  rédigé le rapport, en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 9  : " + this.xpNet(10) + " XP sur " + this.xpMax10() + "\n" +
		"  NOTE                 : " + this.noteTexte(10) + "\n" +
		"  Mention              : " + this.mention(10) + "\n" +
		"  Intégrité            : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " après la bataille\n" +
		"  Rang                 : " + RANGS_CH9[typeof c.rang === "number" ? c.rang : 0].nom + "\n" +
		"  Sorts du temps       : " + ORDRE_DES_SORTS_10.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_10.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Quêtes annexes       : " + annexes.filter(function(a){ return this.quests[a.id]; }, this).length + " sur " + annexes.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus10 ? this.nbIndices(10) + " (-" + this.malus10 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		pointsDifficilesCh9(this) +
		"\n" +
		"  Et maintenant, le vrai : cat ~/Cybersup/Chronotheque/Passerelle\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat10() + "\n" +
		"==================================";
};
/*
 * Les points difficiles, pour le formateur : les étapes où un indice a été acheté, les dépôts régénérés, et les trois étapes
 * qui ont pris le plus de temps de jeu. Après une séance, c'est là que se voient les vrais points de friction.
 */
var COMPLETE_AVANT_FRICTIONS_CH9 = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = !!(this.quests && this.quests[id]);
	var r = COMPLETE_AVANT_FRICTIONS_CH9.apply(this, arguments);
	try { if (!deja && /^n9_/.test(id) && this.quests[id] && this === state){ var c = sCh9(); c.faitA = c.faitA || {}; c.faitA[id] = c.compte || 0; } } catch (e){}
	return r;
};
function titreCourtCh9(id){
	var q = QUETES_CH9.filter(function(x){ return x.id === id; })[0] || QUETES_SECONDAIRES_CH9.filter(function(x){ return x.id === id; })[0];
	var t = q ? q.titre.replace(/ \(.*$/, "") : id;
	return t.length > 46 ? t.substring(0, 45) + "…" : t;
}
function pointsDifficilesCh9(st){
	var c = st.ch9 || {}, l = [];
	var ind = Object.keys(st.indices || {}).filter(function(id){ return st.indices[id] > 0 && chapitreDeQuete(id) === 10; });
	l.push("  POINTS DIFFICILES (pour le formateur)");
	l.push("  Indices achetés      : " + (ind.length ? "" : "aucun"));
	ind.forEach(function(id){ l.push("    " + titreCourtCh9(id) + " (" + st.indices[id] + ")"); });
	var reg = c.regenerations || {}, noms = Object.keys(reg);
	l.push("  Dépôts régénérés     : " + (noms.length ? noms.map(function(n){ return n + (reg[n] > 1 ? " (" + reg[n] + " fois)" : ""); }).join(", ") : "aucun"));
	var faits = Object.keys(c.faitA || {}).filter(function(id){ return id !== "n9_entree"; }).sort(function(a, b){ return c.faitA[a] - c.faitA[b]; });
	var avant = c.faitA && c.faitA.n9_entree !== undefined ? c.faitA.n9_entree : 0, durees = [];
	faits.forEach(function(id){ durees.push({ id: id, d: c.faitA[id] - avant }); avant = c.faitA[id]; });
	durees.sort(function(a, b){ return b.d - a.d; });
	var lentes = durees.filter(function(x){ return x.d >= 15; }).slice(0, 3);
	l.push("  Étapes les plus longues : " + (lentes.length ? "(en commandes tapées)" : "aucune au-delà de 15 commandes"));
	lentes.forEach(function(x){ l.push("    " + titreCourtCh9(x.id) + " (" + x.d + ")"); });
	return l.join("\n") + "\n";
}
/* Le passage vers le vrai : la même chose, sur une vraie forge (GitHub), pour repartir avec le réflexe. */
var PasserelleCh9 = new Item("Passerelle", "", "item_manuscript.gif");
texteVivant(PasserelleCh9, function(){
	return "LA PASSERELLE : DE LA CHRONOTHÈQUE AU VRAI GITHUB\n\n" +
		"Laurent a glissé ce feuillet dans ta poche. « Tout ce que tu as fait ici, refais-le une fois sur une vraie forge. Ce soir. »\n\n" +
		"1. Un compte sur github.com (ou sur la forge de ton école ou de ton entreprise), et ton identité :\n" +
		"     git config --global user.name \"Prénom Nom\"\n" +
		"     git config --global user.email \"toi@exemple.fr\"\n" +
		"     git config --global init.defaultBranch main\n\n" +
		"2. Une clé SSH à toi, sur TA machine (jamais copiée d'ailleurs, jamais partagée) :\n" +
		"     ssh-keygen -t ed25519 -C \"toi@exemple.fr\"\n" +
		"   Puis la clé PUBLIQUE (~/.ssh/id_ed25519.pub, jamais l'autre) dans Settings, SSH and GPG keys, New SSH key.\n" +
		"     ssh -T git@github.com            le pont répond par ton nom\n\n" +
		"3. La même clé pour signer tes commits (Settings, SSH and GPG keys, New SSH key, type Signing key) :\n" +
		"     git config --global gpg.format ssh\n" +
		"     git config --global user.signingkey ~/.ssh/id_ed25519.pub\n" +
		"     git config --global commit.gpgsign true\n\n" +
		"4. Un dépôt à toi (bouton New), avec un README, puis :\n" +
		"     git clone git@github.com:TON_COMPTE/TON_DEPOT.git\n" +
		"     cd TON_DEPOT ; git switch -c premiere-page\n" +
		"     echo \"# Mon premier sceau\" >> README.md ; git commit -am \"docs: ma première page\"\n" +
		"     git push -u origin premiere-page\n\n" +
		"5. La requête, comme au Haut-Conseil (avec gh, ou sur le site : Compare and pull request) :\n" +
		"     gh auth login\n" +
		"     gh pr create --fill ; gh pr view --web ; gh pr merge --merge --delete-branch\n\n" +
		"6. La porte, comme pour la Chronique : Settings, Branches (ou Rules), une règle sur main :\n" +
		"   Require a pull request before merging, Require approvals, Require status checks to pass,\n" +
		"   Block force pushes, Restrict deletions. Et active Secret scanning et Push protection.\n\n" +
		"7. Le réflexe du Faussaire : avant de pousser, git status, git diff --staged, et jamais un mot de passe dans un commit.\n" +
		"   Un secret poussé une fois est un secret à changer, même effacé ensuite.\n\n" +
		"Garde ce feuillet : c'est la même histoire, sans les sceaux de cire.";
});

GameState.prototype.codeDuCertificat10 = function(){
	var f = this.compteursFiges(10, this.xpNet(10), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre10 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(10), max: this.xpMax10(), note: this.note(10),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(10), chapitre: 10,
		date: this.dateVictoire10 || dateDuJour(), graine: PROFIL.graine
	});
};

World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 9 »                                     */
/* ------------------------------------------------------------------ */

function socleCh9Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
	 typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
	 typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : [], typeof ORDRE_DES_SORTS_9 !== "undefined" ? ORDRE_DES_SORTS_9 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}
/* Au départ direct, le joueur n'a peut-être pas de paire de clés : Grace lui en fabrique une, comme au Bastion. */
function clesDepartCh9(){
	if (typeof assurerClesSsh === "function"){ try { assurerClesSsh(); return; } catch (e){} }
	var d = Home.getChildFromName(".ssh");
	if (d !== -1 && d.getItemFromName("id_ed25519.pub") !== -1) return;
	if (d === -1){ d = new Room(".ssh", "Le trousseau de clés.", "loc_etc.gif"); d.owner = JOUEUR; d.mode = "rwx------"; link_rooms(Home, d); }
	d.addItem(new Item("id_ed25519", typeof texteClePrivee === "function" ? texteClePrivee() : "-----BEGIN OPENSSH PRIVATE KEY-----\n(clé privée)\n-----END OPENSSH PRIVATE KEY-----", "item_locker.gif").droits("rw-------", JOUEUR));
	d.addItem(new Item("id_ed25519.pub", typeof texteClePublique === "function" ? texteClePublique() : "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + base64Aleatoire("cle-joueur-ch9", 43) + " " + JOUEUR + "@terminus", "item_locker.gif").droits("rw-r--r--", JOUEUR));
}
function commencerChapitre9(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh9Acquis();
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch9Direct");
	PROFIL.chapitre = 9;
	enregistrerProfil();
	if (!state.ch9 || typeof state.ch9 !== "object") state.ch9 = etatCh9Initial();
	clesDepartCh9();
	state.applyState("ch9Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(ChronothequeCh9);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre10 = state.tempsMs;
	if (typeof montrerImage === "function") montrerImage(ChronothequeCh9.room_pic, "La Chronothèque");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 9 : LA CHRONIQUE D'ÉTERNITÉ")) + "\n\n" +
		"Sous la vieille tour de l'horloge de Cybersup dort la Chronique, le grimoire où tout ce qui arrive à l'école est scellé. C'est un dépôt Git. " +
		"Quelqu'un, qui signe P.G., a commencé à la réécrire. À l'aube du quatrième jour, la Grande Synchronisation enverra sa version à tous les Royaumes. Il est 6 h, le premier jour.\n\n" +
		"Tu es dans la Chronothèque, près du lutrin. " + C.vert("cat Laurent") + ", puis " + C.vert("cat Ordre") + ". Grace te guide à la radio ; quatorze maîtres du temps t'attendent derrière leurs portes.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, sablier pour le plan, sceaux pour ton rang. Chaque commande avance l'horloge de cinq minutes."));
	return true;
}
