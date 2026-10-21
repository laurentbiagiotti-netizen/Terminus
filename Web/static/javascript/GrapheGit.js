/**
 * GrapheGit.js : le graphe vivant du dépôt git, dans le panneau de l'image.
 *
 * Après chaque commande git qui touche un dépôt (événement GameEvents « git »), le panneau de droite montre
 * le graphe du dépôt : les sceaux (commits), les lignes du destin (branches), l'œil (HEAD), les menhirs (tags),
 * les branches distantes en pointillés, et, en gris, les sceaux que le reflog se rappelle encore mais qu'aucune
 * ref n'atteint plus (un reset --hard, un rebase, un commit --amend les abandonnent). Le graphe reste jusqu'au
 * prochain déplacement, comme la carte.
 *
 * modeleGrapheGit(h, chemin, options) est une fonction pure (elle ne touche ni au DOM ni au dépôt) : elle calcule
 * les nœuds, les arêtes, les étiquettes et les orphelins, et se teste en node. dessinerGrapheGit(modele) fabrique
 * le SVG, dans le navigateur seulement.
 *
 * La commande du jeu graphe : graphe (le réaffiche), graphe off (le coupe), graphe on (le remet). La préférence
 * vit dans state.flags (grapheGitCoupe), donc dans la sauvegarde.
 */

var GRAPHE_GIT = {
	limite: 25,          // sceaux montrés au plus
	parcoursMax: 400,    // sceaux lus au plus (un dépôt énorme ne fige pas le jeu)
	reflog: 12,          // entrées récentes du reflog de HEAD où chercher les orphelins
	orphelinsMax: 12,    // sceaux orphelins montrés au plus
	duree: 8,            // commandes git pendant lesquelles un orphelin reste visible
	couleurs: 6,         // couleurs des lignes du destin (classes gg-c0 à gg-c5)
	memoire: {},         // par dépôt : { compteur, vus } (l'âge des orphelins)
	attente: null,
	dernier: null        // { h, chemin } : le dernier dépôt dessiné
};

/* ================================================================== */
/* Le modèle (pur)                                                     */
/* ================================================================== */

/*
 * options : { limite, memoire: { compteur, vus }, duree }.
 * Renvoie null hors d'un dépôt, sur un dépôt nu, ou si la lecture échoue. Sinon :
 * { hote, depot, nom, vide, branche, detache, tete, etat, conflits, indexees, modifiees, nonSuivies,
 *   noeuds: [{ hash, court, sujet, ligne, voie, couleur, orphelin, distant, parents, branches, distantes, tags, tete }],
 *   aretes: [{ de, vers, ligneDe, voieDe, ligneVers, voieVers, voie, couleur, orphelin, distant, coupeHaut, coupeBas }],
 *   voies, total, debut, plusRecents, plusAnciens, branches: [{ nom, hash, couleur }], distantes: [{ nom, hash, couleur }],
 *   tags: [{ nom, hash }], orphelins: [hash] }
 */
function modeleGrapheGit(h, chemin, options){
	try { return modeleGrapheGitBrut(h, chemin, options || {}); } catch (e){ return null; }
}

function modeleGrapheGitBrut(h, chemin, options){
	if (typeof gitDepot !== "function") return null;
	var R = gitDepot(h, chemin);
	if (!R || R.nu || !R.top) return null;
	var limite = options.limite || GRAPHE_GIT.limite;
	var statut = gitStatut(h, chemin) || {};
	var M = {
		hote: h || null, depot: chemin, nom: R.top.room_name, vide: false,
		branche: statut.branche || null, detache: !!statut.detache, tete: statut.tete || null, etat: statut.etat || null,
		conflits: (statut.conflits || []).length, indexees: (statut.indexees || []).length, modifiees: (statut.modifiees || []).length,
		nonSuivies: (statut.nonSuivies || []).length,
		noeuds: [], aretes: [], voies: 0, total: 0, debut: 0, plusRecents: 0, plusAnciens: 0,
		branches: [], distantes: [], tags: [], orphelins: []
	};

	/* Les refs : branches locales, distantes, tags (pelés jusqu'au commit). */
	var locales = gitBranches(h, chemin), tagsBruts = gitTags(h, chemin);
	var distantesRefs = gRefs(R, "refs/remotes/").filter(function(r){ return !r.sym && !/\/HEAD$/.test(r.nom); });
	var noms = Object.keys(locales).sort(function(a, b){
		var pa = /^(main|master)$/.test(a) ? 0 : 1, pb = /^(main|master)$/.test(b) ? 0 : 1;
		return pa !== pb ? pa - pb : (a < b ? -1 : a > b ? 1 : 0);
	});
	var couleurBranche = {};
	noms.forEach(function(n, i){ couleurBranche[n] = i % GRAPHE_GIT.couleurs; M.branches.push({ nom: n, hash: locales[n], couleur: couleurBranche[n] }); });
	var prochaine = noms.length;
	function couleurDistante(nom){
		var court = nom.replace(/^[^\/]+\//, "");
		if (couleurBranche.hasOwnProperty(court)) return couleurBranche[court];
		if (!couleurBranche.hasOwnProperty("\u0000" + nom)) couleurBranche["\u0000" + nom] = (prochaine++) % GRAPHE_GIT.couleurs;
		return couleurBranche["\u0000" + nom];
	}
	distantesRefs.forEach(function(r){
		var nom = r.nom.substring(13);
		M.distantes.push({ nom: nom, hash: gPeler(R, r.hash, "commit"), couleur: couleurDistante(nom) });
	});
	Object.keys(tagsBruts).sort().forEach(function(n){
		var c = null;
		try { c = gPeler(R, tagsBruts[n], "commit"); } catch (e){ c = null; }
		if (c && gObjet(R, c) && gObjet(R, c).t === "commit") M.tags.push({ nom: n, hash: c });
	});

	/* Les départs : HEAD et les refs locales d'un côté, les distantes de l'autre. */
	var departsLocaux = [], departsDistants = [];
	if (M.tete) departsLocaux.push(M.tete);
	M.branches.forEach(function(b){ if (b.hash) departsLocaux.push(b.hash); });
	M.tags.forEach(function(t){ departsLocaux.push(t.hash); });
	M.distantes.forEach(function(d){ if (d.hash) departsDistants.push(d.hash); });
	var atteintsLocaux = gGrapheAtteints(R, departsLocaux), atteints = gGrapheAtteints(R, departsDistants, atteintsLocaux);

	/* Les orphelins : ce que le reflog de HEAD a vu passer récemment, et qu'aucune ref n'atteint plus. */
	var candidats = [], dejaCandidat = {};
	(gitReflog(h, chemin, "HEAD") || []).slice(0, GRAPHE_GIT.reflog).forEach(function(e){
		[e.nouveau, e.ancien].forEach(function(x){
			if (!x || /^0+$/.test(x) || atteints[x] || dejaCandidat[x]) return;
			var o = gObjet(R, x);
			if (!o || o.t !== "commit") return;
			// On remonte la lignée abandonnée jusqu'à retrouver l'histoire vivante.
			var file = [x], garde = 0;
			while (file.length && candidats.length < GRAPHE_GIT.orphelinsMax && garde++ < 50){
				var y = file.shift();
				if (!y || atteints[y] || dejaCandidat[y]) continue;
				var oy = gObjet(R, y);
				if (!oy || oy.t !== "commit") continue;
				dejaCandidat[y] = true;
				candidats.push(y);
				gCommit(R, y).parents.forEach(function(p){ file.push(p); });
			}
		});
	});
	// L'âge des orphelins : ils s'effacent au bout de quelques commandes git.
	if (options.memoire){
		var mem = options.memoire, duree = options.duree || GRAPHE_GIT.duree;
		mem.vus = mem.vus || {};
		mem.compteur = mem.compteur || 0;
		var garder = {};
		candidats = candidats.filter(function(x){
			if (!mem.vus.hasOwnProperty(x)) mem.vus[x] = mem.compteur;
			garder[x] = mem.vus[x];
			return mem.compteur - mem.vus[x] < duree;
		});
		mem.vus = garder;
	}
	var estOrphelin = {};
	candidats.forEach(function(x){ estOrphelin[x] = true; });
	M.orphelins = candidats.slice();

	/* L'ordre : les enfants avant leurs parents, le plus récent en haut (comme git log --graph). */
	var departs = departsLocaux.concat(departsDistants).concat(candidats);
	if (!departs.length){ M.vide = true; return M; }
	var ordre = gParcours(R, gGrapheUniques(departs), [], { topo: true });
	if (ordre.length > GRAPHE_GIT.parcoursMax) ordre = ordre.slice(0, GRAPHE_GIT.parcoursMax);
	M.total = ordre.length;
	var rang = {};
	ordre.forEach(function(x, i){ rang[x] = i; });

	/* Les étiquettes de chaque sceau. */
	var etiquettes = {};
	function etiq(x){ return etiquettes[x] || (etiquettes[x] = { branches: [], distantes: [], tags: [] }); }
	M.branches.forEach(function(b){ if (b.hash) etiq(b.hash).branches.push(b.nom); });
	M.distantes.forEach(function(d){ if (d.hash) etiq(d.hash).distantes.push(d.nom); });
	M.tags.forEach(function(t){ etiq(t.hash).tags.push(t.nom); });
	// La branche où est l'œil d'abord.
	if (M.branche && locales[M.branche]) etiq(locales[M.branche]).branches.sort(function(a, b){ return a === M.branche ? -1 : b === M.branche ? 1 : 0; });

	/* Les lignes du destin : chaque sceau appartient à une seule ligne, celle qui l'atteint la première en suivant les
	   premiers parents (main d'abord, puis les autres branches, les distantes, l'œil détaché, les menhirs, les orphelins).
	   Chaque ligne a sa colonne et sa couleur : main reste droite, à gauche. */
	var proprio = {}, lignesDestin = [], compteurCouleur = prochaine;
	function reclamer(depart, cle, couleur){
		var x = depart, n = 0, garde = 0;
		while (x && rang.hasOwnProperty(x) && !proprio.hasOwnProperty(x) && garde++ < 10000){
			proprio[x] = lignesDestin.length; n++;
			x = gCommit(R, x).parents[0];
		}
		if (n) lignesDestin.push({ cle: cle, couleur: couleur });
	}
	M.branches.forEach(function(b){ reclamer(b.hash, "b:" + b.nom, b.couleur); });
	M.distantes.forEach(function(d){ reclamer(d.hash, "d:" + d.nom, d.couleur); });
	if (M.detache && M.tete) reclamer(M.tete, "HEAD", (compteurCouleur++) % GRAPHE_GIT.couleurs);
	M.tags.forEach(function(t){ reclamer(t.hash, "t:" + t.nom, (compteurCouleur++) % GRAPHE_GIT.couleurs); });
	candidats.forEach(function(x){ reclamer(x, "o:" + x, -1); });
	ordre.forEach(function(x){ reclamer(x, "a:" + x, (compteurCouleur++) % GRAPHE_GIT.couleurs); });

	/* Les arêtes : un premier parent sur une autre ligne (le point de départ d'une branche) voyage dans la colonne de
	   l'enfant ; un second parent (une fusion) voyage dans la colonne du parent. */
	var aretes = [];
	ordre.forEach(function(x, i){
		gCommit(R, x).parents.forEach(function(p, n){
			var lp = proprio.hasOwnProperty(p) ? proprio[p] : proprio[x];
			aretes.push({ de: x, vers: p, i: i, ip: rang.hasOwnProperty(p) ? rang[p] : ordre.length, lx: proprio[x], lp: lp, lv: n === 0 ? proprio[x] : lp, n: n });
		});
	});

	/* La fenêtre : les plus récents, mais toujours avec l'œil dedans. */
	var debut = 0;
	if (M.tete && rang.hasOwnProperty(M.tete) && rang[M.tete] >= limite) debut = Math.min(ordre.length - limite, rang[M.tete] - Math.floor(limite / 2));
	debut = Math.max(0, debut);
	var fin = Math.min(ordre.length, debut + limite);
	M.debut = debut; M.plusRecents = debut; M.plusAnciens = ordre.length - fin;
	var visibles = aretes.filter(function(a){ return a.ip >= debut && a.i < fin; });

	/* Les colonnes : seulement les lignes présentes dans la fenêtre, dans l'ordre (main d'abord). */
	var utiles = {}, i;
	for (i = debut; i < fin; i++) utiles[proprio[ordre[i]]] = true;
	visibles.forEach(function(a){ utiles[a.lv] = true; utiles[a.lx] = true; if (a.ip < ordre.length) utiles[a.lp] = true; });
	var colonne = {}, nbColonnes = 0;
	lignesDestin.forEach(function(l, k){ if (utiles[k]) colonne[k] = nbColonnes++; });
	function col(k){ return colonne.hasOwnProperty(k) ? colonne[k] : 0; }

	for (i = debut; i < fin; i++){
		var x = ordre[i], c = gCommit(R, x), e = etiquettes[x] || { branches: [], distantes: [], tags: [] };
		M.noeuds.push({ hash: x, court: x.substring(0, 7), sujet: gSujet(c.message), ligne: i - debut, voie: col(proprio[x]), couleur: estOrphelin[x] ? -1 : lignesDestin[proprio[x]].couleur,
			orphelin: !!estOrphelin[x], distant: !estOrphelin[x] && !atteintsLocaux[x], parents: c.parents.slice(),
			branches: e.branches.slice(), distantes: e.distantes.slice(), tags: e.tags.slice(), tete: x === M.tete });
	}
	visibles.forEach(function(a){
		var orph = !!estOrphelin[a.de];
		M.aretes.push({ de: a.de, vers: a.vers, ligneDe: a.i - debut, voieDe: col(a.lx), ligneVers: a.ip - debut, voieVers: a.ip < ordre.length ? col(a.lp) : col(a.lv),
			voie: col(a.lv), couleur: orph ? -1 : lignesDestin[a.n === 0 ? a.lx : a.lp].couleur,
			orphelin: orph, distant: !orph && !atteintsLocaux[a.de], coupeHaut: a.i < debut, coupeBas: a.ip >= fin });
	});
	var voiesVues = nbColonnes;
	M.voies = voiesVues;
	return M;
}

/* Les sceaux atteints depuis une liste de départs (sans repasser par ceux de « deja »). */
function gGrapheAtteints(R, departs, deja){
	var vus = {}, pile = departs.slice(), garde = 0;
	if (deja) for (var k in deja){ if (deja.hasOwnProperty(k)) vus[k] = true; }
	while (pile.length && garde++ < 20000){
		var x = pile.pop();
		if (!x || vus[x]) continue;
		var o = gObjet(R, x);
		if (!o || o.t !== "commit") continue;
		vus[x] = true;
		gCommit(R, x).parents.forEach(function(p){ if (!vus[p]) pile.push(p); });
	}
	return vus;
}
function gGrapheUniques(l){ var v = {}; return l.filter(function(x){ if (!x || v[x]) return false; v[x] = true; return true; }); }

/* La ligne d'état, en mots du jeu et en vrais mots (sert au SVG et au texte). */
function etatGrapheGit(M){
	var morceaux = [];
	if (M.detache) morceaux.push("œil détaché (HEAD detached) sur " + (M.tete ? M.tete.substring(0, 7) : "?"));
	else morceaux.push("œil sur " + (M.branche || "?") + (M.vide ? " (aucun sceau encore)" : ""));
	var etats = { fusion: "FUSION EN COURS (merge)", rebase: "REBASE EN COURS", "cherry-pick": "CHERRY-PICK EN COURS", revert: "REVERT EN COURS", bisect: "BISECT EN COURS" };
	if (M.etat) morceaux.push(etats[M.etat] || M.etat);
	if (M.conflits) morceaux.push(M.conflits + " fichier" + (M.conflits > 1 ? "s" : "") + " en conflit");
	return morceaux.join(" · ");
}
function travailGrapheGit(M){
	var l = [];
	if (M.indexees) l.push("autel (index) : " + M.indexees);
	if (M.modifiees) l.push("atelier modifié : " + M.modifiees);
	if (M.nonSuivies) l.push("non suivis : " + M.nonSuivies);
	if (M.conflits) l.push("résous les conflits, puis git add");
	return l.length ? l.join(" · ") : "atelier propre (rien à poser)";
}

/* ================================================================== */
/* Le dessin (navigateur seulement)                                    */
/* ================================================================== */

var GG_SVG = "http://www.w3.org/2000/svg";
function ggEl(nom, attributs, parent){
	var el = document.createElementNS(GG_SVG, nom);
	for (var k in attributs){ if (attributs.hasOwnProperty(k) && attributs[k] !== null && attributs[k] !== undefined) el.setAttribute(k, String(attributs[k])); }
	if (parent) parent.appendChild(el);
	return el;
}
function ggTexte(t, attributs, parent){ var el = ggEl("text", attributs, parent); el.textContent = t; return el; }
function ggClasseCouleur(c){ return c < 0 ? "gg-gris" : "gg-c" + c; }
function ggCouper(t, n){ t = String(t); if (n <= 0) return ""; return t.length <= n ? t : (n <= 3 ? t.substring(0, n) : t.substring(0, n - 3) + "..."); }

/* Fabrique l'élément #graphe (en-tête, SVG défilant, légende) pour une largeur donnée. */
function dessinerGrapheGit(M, largeur){
	var etroit = largeur < 420;
	var police = etroit ? 11 : 12, car = police * 0.61, haut = etroit ? 24 : 26, pas = etroit ? 14 : 16, marge = 12, rayon = etroit ? 5 : 6;
	var bloc = document.createElement("div");
	bloc.id = "graphe";
	bloc.setAttribute("aria-label", "Graphe du dépôt " + M.nom);
	var titre = document.createElement("p");
	titre.className = "graphe-titre";
	titre.textContent = "Le dépôt " + M.nom + (M.hote ? " (" + M.hote + ")" : "");
	bloc.appendChild(titre);
	var etat = document.createElement("p");
	etat.className = "graphe-etat" + (M.etat || M.conflits ? " graphe-alerte" : "") + (M.detache ? " graphe-detache" : "");
	etat.textContent = etatGrapheGit(M);
	bloc.appendChild(etat);
	var travail = document.createElement("p");
	travail.className = "graphe-travail";
	travail.textContent = travailGrapheGit(M);
	bloc.appendChild(travail);

	var defile = document.createElement("div");
	defile.className = "graphe-defile";
	bloc.appendChild(defile);
	var lignes = M.noeuds.length + (M.plusRecents ? 1 : 0) + (M.plusAnciens ? 1 : 0);
	var decalage = M.plusRecents ? 1 : 0;
	var hauteur = Math.max(1, lignes) * haut + 10;
	var svg = ggEl("svg", { width: largeur, height: hauteur, viewBox: "0 0 " + largeur + " " + hauteur, "class": "graphe-svg", role: "img", "font-size": police }, defile);
	ggEl("title", {}, svg).textContent = "Graphe du dépôt " + M.nom + " : " + M.noeuds.length + " sceaux montrés";
	function X(v){ return marge + v * pas; }
	function Y(l){ return 5 + (l + decalage) * haut + haut / 2; }

	if (M.vide){
		ggTexte("Aucun sceau encore.", { x: marge, y: Y(0) - 4, "class": "gg-texte" }, svg);
		ggTexte("git add, puis git commit : le premier sceau.", { x: marge, y: Y(0) + 12, "class": "gg-sujet" }, svg);
		svg.setAttribute("height", 2 * haut + 10);
	}

	/* Les arêtes d'abord, sous les sceaux. */
	var groupeAretes = ggEl("g", { fill: "none", "stroke-width": 2 }, svg);
	var bas = Y(M.noeuds.length - 1) + haut / 2 + (M.plusAnciens ? haut / 2 : 0), hautMin = Y(0) - haut / 2 - (M.plusRecents ? haut / 2 : 0);
	M.aretes.forEach(function(a){
		var d, demi = haut / 2;
		var x0 = X(a.voieDe), y0 = a.coupeHaut ? hautMin : Y(a.ligneDe), xv = X(a.voie), x1 = X(a.voieVers), y1 = a.coupeBas ? bas : Y(a.ligneVers);
		if (a.coupeHaut) d = "M" + xv + " " + y0;
		else if (a.voieDe === a.voie) d = "M" + x0 + " " + y0;
		else d = "M" + x0 + " " + y0 + " C" + x0 + " " + (y0 + demi * 0.8) + " " + xv + " " + (y0 + demi * 0.2) + " " + xv + " " + (y0 + demi);
		if (a.coupeBas || a.voieVers === a.voie) d += " L" + xv + " " + y1;
		else d += " L" + xv + " " + (y1 - demi) + " C" + xv + " " + (y1 - demi * 0.2) + " " + x1 + " " + (y1 - demi * 0.8) + " " + x1 + " " + y1;
		ggEl("path", { d: d, "class": "gg-arete " + ggClasseCouleur(a.couleur) + (a.orphelin ? " gg-orphelin" : "") + (a.distant ? " gg-distant" : "") }, groupeAretes);
	});

	/* Les sceaux, leur hash, leurs étiquettes, leur sujet. */
	var colonne = marge + Math.max(1, M.voies) * pas + 4;
	M.noeuds.forEach(function(n){
		var cx = X(n.voie), cy = Y(n.ligne), cl = ggClasseCouleur(n.couleur);
		var g = ggEl("g", { "class": "gg-noeud" + (n.orphelin ? " gg-orphelin" : "") + (n.tete ? " gg-tete" : "") }, svg);
		ggEl("title", {}, g).textContent = n.hash + "\n" + n.sujet + (n.orphelin ? "\n(orphelin : seul le reflog s'en souvient)" : "");
		if (n.tete) ggEl("circle", { cx: cx, cy: cy, r: rayon + 4, "class": "gg-oeil" + (M.detache ? " gg-oeil-detache" : "") }, g);
		ggEl("circle", { cx: cx, cy: cy, r: rayon, "class": "gg-sceau " + cl + (n.distant ? " gg-distant" : "") + (n.parents.length > 1 ? " gg-fusion" : "") }, g);
		if (n.tete) ggEl("circle", { cx: cx, cy: cy, r: 2, "class": "gg-pupille" }, g);
		var x = colonne;
		ggTexte(n.court, { x: x, y: cy + police * 0.35, "class": "gg-hash" }, g);
		x += 7 * car + car;
		function pastille(texte, classe){
			var w = texte.length * car + 8;
			ggEl("rect", { x: x, y: cy - police * 0.75, width: w, height: police * 1.5, rx: 3, "class": "gg-pastille " + classe }, g);
			ggTexte(texte, { x: x + 4, y: cy + police * 0.35, "class": "gg-pastille-texte " + classe }, g);
			x += w + 4;
		}
		var place = largeur - 6;
		if (n.tete) pastille(M.detache ? "◉ HEAD détaché" : "◉ HEAD", "gg-p-tete" + (M.detache ? " gg-p-detache" : ""));
		n.branches.forEach(function(b){ if (x < place - 20) pastille(ggCouper(b, Math.max(4, Math.floor((place - x - 8) / car))), "gg-p-branche gg-c" + (M.branches.filter(function(y){ return y.nom === b; })[0] || { couleur: 0 }).couleur); });
		n.distantes.forEach(function(b){ if (x < place - 20) pastille(ggCouper(b, Math.max(4, Math.floor((place - x - 8) / car))), "gg-p-distante gg-c" + (M.distantes.filter(function(y){ return y.nom === b; })[0] || { couleur: 0 }).couleur); });
		n.tags.forEach(function(t){ if (x < place - 20) pastille("◆ " + ggCouper(t, Math.max(3, Math.floor((place - x - 20) / car))), "gg-p-tag"); });
		var reste = Math.floor((place - x) / car);
		if (reste >= 4) ggTexte(ggCouper(n.orphelin ? "(orphelin) " + n.sujet : n.sujet, reste), { x: x, y: cy + police * 0.35, "class": "gg-sujet" + (n.orphelin ? " gg-orphelin" : "") }, g);
	});
	if (M.plusRecents) ggTexte("... " + M.plusRecents + " sceau" + (M.plusRecents > 1 ? "x" : "") + " plus récent" + (M.plusRecents > 1 ? "s" : ""), { x: colonne, y: Y(-1) + police * 0.35, "class": "gg-suite" }, svg);
	if (M.plusAnciens) ggTexte("... " + M.plusAnciens + " sceau" + (M.plusAnciens > 1 ? "x" : "") + " plus ancien" + (M.plusAnciens > 1 ? "s" : ""), { x: colonne, y: Y(M.noeuds.length) + police * 0.35, "class": "gg-suite" }, svg);

	var legende = document.createElement("p");
	legende.className = "graphe-legende";
	[["gg-l-sceau", "●", "sceau = commit"], ["gg-l-ligne", "━", "ligne du destin = branche"], ["gg-l-oeil", "◉", "œil = HEAD"], ["gg-l-tag", "◆", "menhir = tag"],
	 ["gg-l-distante", "┅", "pointillés = distante (origin/...)"], ["gg-l-orphelin", "○", "gris = orphelin (reflog)"]].forEach(function(l){
		var s = document.createElement("span");
		s.className = "graphe-cle";
		var sym = document.createElement("span");
		sym.className = l[0];
		sym.textContent = l[1];
		s.appendChild(sym);
		s.appendChild(document.createTextNode(" " + l[2]));
		legende.appendChild(s);
	});
	bloc.appendChild(legende);
	return bloc;
}

/* Le graphe prend la place de l'image (comme la carte) jusqu'au prochain déplacement. */
function montrerGrapheGit(h, chemin){
	if (typeof document === "undefined") return false;
	var panneau = document.getElementById("pics"), scene = document.getElementById("scene");
	if (!panneau || !scene) return false;
	var cle = (h || "") + ":" + chemin;
	var mem = GRAPHE_GIT.memoire[cle] || (GRAPHE_GIT.memoire[cle] = { compteur: 0, vus: {} });
	var M = modeleGrapheGit(h, chemin, { memoire: mem });
	if (!M) return false;
	["carte", "galerie", "graphe"].forEach(function(id){ var el = document.getElementById(id); if (el) el.parentNode.removeChild(el); });
	// La place disponible : le panneau, moins ses marges, le cadre du graphe et une barre de défilement.
	var largeur = 400;
	try {
		var st = window.getComputedStyle(panneau);
		largeur = panneau.clientWidth - parseFloat(st.paddingLeft || 0) - parseFloat(st.paddingRight || 0);
	} catch (x){}
	largeur = Math.max(240, Math.min(624, largeur || 400) - (window.innerWidth <= 820 ? 20 : 28) - 10);
	var bloc = dessinerGrapheGit(M, Math.floor(largeur));
	panneau.insertBefore(bloc, scene);
	scene.hidden = true;
	var legende = document.getElementById("legende");
	if (legende) legende.textContent = "";
	GRAPHE_GIT.dernier = { h: h, chemin: chemin };
	// L'œil en vue : la fenêtre défile jusqu'à lui.
	try {
		var oeil = bloc.querySelector(".gg-tete"), defile = bloc.querySelector(".graphe-defile");
		if (oeil && defile && oeil.getBBox){ var b = oeil.getBBox(); if (b.y + b.height > defile.clientHeight) defile.scrollTop = Math.max(0, b.y - defile.clientHeight / 2); }
	} catch (e){}
	return true;
}

/* Après une commande git : le graphe du dépôt touché, une fois la commande finie. */
function grapheGitApresCommande(e){
	try {
		if (typeof document === "undefined" || !e || !e.depot) return;
		if (typeof state !== "undefined" && state && (state.has("grapheGitCoupe") || state.has("rejeuEnCours"))) return;
		var cle = (e.hote || "") + ":" + e.depot;
		var mem = GRAPHE_GIT.memoire[cle] || (GRAPHE_GIT.memoire[cle] = { compteur: 0, vus: {} });
		mem.compteur++;
		GRAPHE_GIT.attente = { h: e.hote || null, chemin: e.depot };
		if (GRAPHE_GIT.minuterie) return;
		GRAPHE_GIT.minuterie = setTimeout(function(){
			GRAPHE_GIT.minuterie = null;
			var a = GRAPHE_GIT.attente;
			GRAPHE_GIT.attente = null;
			try { if (a) montrerGrapheGit(a.h, a.chemin); } catch (x){}
		}, 0);
	} catch (x){}
}
if (typeof GameEvents !== "undefined") GameEvents.addListener("git", grapheGitApresCommande);

/* ================================================================== */
/* La commande du jeu graphe                                           */
/* ================================================================== */

/* Le dépôt où se tient le joueur : { h, chemin }, ou null (hors dépôt, ou dépôt nu). */
function depotDuJoueurGraphe(){
	if (typeof gTrouverDepot !== "function" || typeof current_room === "undefined") return null;
	var R = gTrouverDepot(current_room);
	if (!R || R.nu || !R.top) return null;
	return { h: R.h || null, chemin: gCheminReel(R.top) };
}

Shell.sorts.graphe = function(args, io){
	var a = String(args[0] || "").toLowerCase();
	if (a === "off" || a === "non"){
		state.set("grapheGitCoupe");
		if (typeof document !== "undefined"){ var el = document.getElementById("graphe"); if (el && typeof montrerImage === "function") montrerImage(current_room.room_pic, current_room.room_name); }
		return "Le graphe vivant est coupé : il ne s'affichera plus après tes commandes git. graphe on pour le remettre.";
	}
	if (a === "on" || a === "oui"){
		if (state.flags) delete state.flags.grapheGitCoupe;
		var ici = depotDuJoueurGraphe();
		if (ici) montrerGrapheGit(ici.h, ici.chemin);
		return "Le graphe vivant est remis : après chaque commande git, le panneau de l'image montre le graphe du dépôt.";
	}
	if (a) return "graphe : je ne connais pas « " + args[0] + " ». graphe, graphe on ou graphe off.";
	var d = depotDuJoueurGraphe();
	if (!d) return "graphe : tu n'es pas dans un dépôt git (un dossier qui a son .git). Entre dans un dépôt, puis tape graphe.";
	var M = modeleGrapheGit(d.h, d.chemin, {});
	if (!M) return "graphe : ce dépôt ne se laisse pas lire.";
	var montre = montrerGrapheGit(d.h, d.chemin);
	var l = [C.gras("LE GRAPHE DU DÉPÔT " + M.nom.toUpperCase()) + C.jaune("  commande du jeu, pas Linux (man graphe)"),
		"  " + etatGrapheGit(M), "  " + travailGrapheGit(M),
		"  " + (M.vide ? "aucun sceau encore" : M.total + " sceau" + (M.total > 1 ? "x" : "") + ", " + M.branches.length + " ligne" + (M.branches.length > 1 ? "s" : "") + " du destin" +
			(M.distantes.length ? ", " + M.distantes.length + " distante" + (M.distantes.length > 1 ? "s" : "") : "") + (M.tags.length ? ", " + M.tags.length + " menhir" + (M.tags.length > 1 ? "s" : "") : "") +
			(M.orphelins.length ? ", " + M.orphelins.length + " orphelin" + (M.orphelins.length > 1 ? "s" : "") : ""))];
	l.push(C.gris(montre ? "(Le graphe remplace l'image jusqu'à ton prochain déplacement." + (state.has("grapheGitCoupe") ? " Il est coupé après les commandes git : graphe on pour le remettre.)" : ")") :
		"(Le dessin du graphe s'affiche dans le panneau de l'image, dans le navigateur. Sur un vrai Linux : git log --oneline --graph --all.)"));
	return l.join("\n");
};
if (SORTS_DU_JEU.indexOf("graphe") === -1) SORTS_DU_JEU.push("graphe");
if (typeof COMMANDES_DU_JEU !== "undefined") COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["graphe on/off", "le graphe vivant du dépôt git, à côté du terminal"]);
if (typeof MANUEL_DU_JEU !== "undefined") MANUEL_DU_JEU.graphe = "graphe n'est PAS une commande Linux : c'est une commande du jeu, comme carte.\n" +
	"Elle dessine le dépôt git où tu te tiens : sceau = commit, ligne du destin = branche, œil = HEAD, menhir = tag.\n\n  graphe        le graphe du dépôt";
