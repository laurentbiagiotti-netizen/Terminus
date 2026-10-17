/**
 * QuetesAnnexes.js : le mécanisme des quêtes annexes, commun à tous les chapitres.
 *
 * Une quête annexe n'est ni une étape ni un défi : c'est une petite histoire facultative, confiée par un habitant
 * croisé dans un lieu (un objet qu'on lit avec cat), en plusieurs étapes validées par de vraies commandes, avec une
 * fin et une récompense : des XP en bonus (hors de la note du chapitre), un souvenir posé dans ~/Souvenirs, et une
 * lumière de plus sur le plan du chapitre. Toutes les annexes d'un chapitre faites : un badge « Ami de ... ».
 *
 * Préfixe des identifiants : aN_ (N, le numéro du chapitre affiché au joueur), par exemple a6_chat au chapitre 6.
 * Un chapitre déclare ses annexes avec declarerAnnexe({ ... }) et son badge avec declarerAmiAnnexes(chapitre, { ... }).
 * L'état (proposée, étapes faites) vit dans state.annexes, sauvegardé avec la partie.
 *
 *   declarerAnnexe({
 *     id: "a6_chat", chapitre: 7 (interne), titre: "Le chat du Cœur", habitant: "l'Allumeur",
 *     item: function(){ return l'objet qu'on lit pour se voir proposer la quête },
 *     ouverte: function(){ return vrai si le chapitre est ouvert },
 *     resume: "une phrase",
 *     etapes: [{ titre: "...", fait: function(){ return vrai quand c'est fait } }, ...],
 *     souvenir: { nom: "Moustache", texte: "..." }, lumiere: "le réverbère du chat", merci: "phrase de fin"
 *   });
 *
 * Les commandes : quetes (une section « Quêtes annexes ») et quetes annexes (le détail, étape par étape).
 */

var QUETES_ANNEXES = [];
/* Les sorts qu'enseignent les habitants : appris sans XP (les annexes sont hors note), comme un bonus. */
var SORTS_DES_ANNEXES = {};
function declarerSortsAnnexes(liste){ liste.forEach(function(s){ SORTS_DES_ANNEXES[s] = true; }); }
var LEARN_AVANT_ANNEXES = GameState.prototype.learn;
GameState.prototype.learn = function(sort){
	if (SORTS_DES_ANNEXES[sort] && (typeof tousLesSorts !== "function" || tousLesSorts().indexOf(sort) === -1)){
		if (this.spells[sort]) return;
		this.spells[sort] = true;
		if (typeof jouerSon === "function") jouerSon("sort");
		Shell.narration.push({ sort: sort, rpg: "", resume: MANUEL[sort] ? MANUEL[sort].resume : "" });
		GameEvents.fire({ type: "learn", spell: sort });
		return;
	}
	return LEARN_AVANT_ANNEXES.apply(this, arguments);
};
var AMIS_ANNEXES = {};
var XP_ANNEXE = typeof XP_QUETE_SECONDAIRE !== "undefined" ? XP_QUETE_SECONDAIRE : 50;

function declarerAnnexe(def){
	def.etapes = def.etapes || [];
	QUETES_ANNEXES.push(def);
	return def;
}
function declarerAmiAnnexes(chapitre, def){ AMIS_ANNEXES[chapitre] = def; }
function annexesDuChapitre(chapitre){ return QUETES_ANNEXES.filter(function(a){ return a.chapitre === chapitre; }); }
function annexeParId(id){ return QUETES_ANNEXES.filter(function(a){ return a.id === id; })[0] || null; }
function estAnnexe(id){ return /^a\d+_/.test(String(id)); }
function etatAnnexe(id){
	if (!state.annexes || typeof state.annexes !== "object") state.annexes = {};
	if (!state.annexes[id]) state.annexes[id] = { proposee: false, etapes: [] };
	return state.annexes[id];
}
function queteAnnexeAccessible(a){ try { return typeof a.ouverte === "function" ? !!a.ouverte() : true; } catch (e){ return false; } }
function annexeProposee(a){ return !!(state.annexes && state.annexes[a.id] && state.annexes[a.id].proposee); }

/* Un habitant lu : il propose sa quête. */
GameEvents.addListener("read", function(e){
	QUETES_ANNEXES.forEach(function(a){
		var it = null;
		try { it = typeof a.item === "function" ? a.item() : a.item; } catch (x){ it = null; }
		if (!it || e.item !== it || !queteAnnexeAccessible(a)) return;
		var s = etatAnnexe(a.id);
		if (s.proposee) return;
		s.proposee = true;
		state.seen[a.id] = true;
		if (!state.has("rejeuEnCours")) say(C.cyan("◆ Quête annexe proposée : " + a.titre) + C.gris(" (" + a.habitant + ") · quetes annexes pour le détail"));
	});
});

/* À chaque tour : les étapes faites (dans l'ordre), la fin, la récompense. */
function verifierAnnexes(){
	if (!state || !state.quests) return;
	QUETES_ANNEXES.forEach(function(a){
		if (state.quests[a.id] || !queteAnnexeAccessible(a) || !annexeProposee(a)) return;
		var s = etatAnnexe(a.id);
		for (var i = 0; i < a.etapes.length; i++){
			if (s.etapes[i]) continue;
			var ok = false;
			try { ok = !!a.etapes[i].fait(); } catch (x){ ok = false; }
			if (!ok) break;
			s.etapes[i] = true;
			if (!state.has("rejeuEnCours") && i < a.etapes.length - 1) say(C.cyan("◇ " + a.titre + " : " + a.etapes[i].titre) + C.gris(" (" + (i + 1) + " sur " + a.etapes.length + ")"));
		}
		if (a.etapes.every(function(x, k){ return !!s.etapes[k]; })) terminerAnnexe(a);
	});
	Object.keys(AMIS_ANNEXES).forEach(function(ch){
		var ami = AMIS_ANNEXES[ch], liste = annexesDuChapitre(+ch);
		if (!liste.length || state.has(ami.badge) || !liste.every(function(a){ return state.quests[a.id]; })) return;
		state.set(ami.badge);
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + ami.nom) + C.gris(" · " + ami.phrase));
	});
}
function terminerAnnexe(a){
	if (state.quests[a.id]) return;
	state.complete(a.id);
	if (a.souvenir) poserSouvenir(a.souvenir);
	if (!state.has("rejeuEnCours")){
		if (a.merci) say(a.merci);
		say(C.gris("(Souvenir : ~/Souvenirs/" + (a.souvenir ? a.souvenir.nom : "") + "." + (a.lumiere ? " Une lumière de plus sur le plan : " + a.lumiere + "." : "") + ")"));
	}
}
/* Les souvenirs vont dans ~/Souvenirs, un dossier de la Maison créé au premier. */
function poserSouvenir(s){
	var dossier = Home.getChildFromName("Souvenirs");
	if (dossier === -1){
		var fige = World.fige;
		World.fige = false;
		dossier = new Room("Souvenirs", "Les souvenirs que t'ont confiés les habitants, quête après quête.", "item_box.gif");
		World.fige = fige;
		dossier.owner = JOUEUR;
		dossier.mode = "rwxr-xr-x";
		dossier.horsBareme = true;   // facultatif : ni XP de lieu, ni place dans le barème du chapitre 1
		if (typeof libererNom === "function") libererNom(Home, "Souvenirs");
		link_rooms(Home, dossier);
	}
	if (dossier.getItemFromName(s.nom) !== -1) return;
	var it = new Item(s.nom, s.texte, s.image || "item_manuscript.gif").droits("rw-r--r--", JOUEUR);
	dossier.addItem(it);
}
/* Les lumières des habitants, pour le plan du chapitre. */
function lumieresAnnexes(chapitre){
	return annexesDuChapitre(chapitre).filter(function(a){ return state.quests[a.id] && a.lumiere; }).map(function(a){ return a.lumiere + C.gris(" (" + a.habitant + ")"); });
}
function annexesToutesFaites(chapitre){ var l = annexesDuChapitre(chapitre); return l.length > 0 && l.every(function(a){ return state.quests[a.id]; }); }

/* Le journal : une section « Quêtes annexes » dans quetes, et quetes annexes pour le détail. */
function texteAnnexesCourt(chapitre){
	var l = annexesDuChapitre(chapitre).filter(queteAnnexeAccessible);
	if (!l.length) return null;
	var proposees = l.filter(function(a){ return annexeProposee(a) || state.quests[a.id]; });
	var faites = l.filter(function(a){ return state.quests[a.id]; }).length;
	var lignes = [C.gras("  Quêtes annexes du chapitre " + numeroAffiche(chapitre)) + " (" + faites + " sur " + l.length + ")" + C.gris("  facultatives, hors note : quetes annexes")];
	proposees.forEach(function(a){
		var s = etatAnnexe(a.id), n = a.etapes.filter(function(x, k){ return !!s.etapes[k]; }).length;
		lignes.push("    " + (state.quests[a.id] ? C.vert("[x]") : "[ ]") + " " + a.titre + C.gris(" (" + a.habitant + ", " + n + " sur " + a.etapes.length + ")"));
	});
	if (l.length > proposees.length) lignes.push(C.gris("    ... et " + (l.length - proposees.length) + " autre" + (l.length - proposees.length > 1 ? "s" : "") + " : des habitants à rencontrer, quartier par quartier."));
	return lignes.join("\n");
}
function texteAnnexesDetail(){
	var chapitres = [];
	QUETES_ANNEXES.forEach(function(a){ if (queteAnnexeAccessible(a) && chapitres.indexOf(a.chapitre) === -1) chapitres.push(a.chapitre); });
	if (!chapitres.length) return "Aucune quête annexe pour l'instant : les habitants des chapitres que tu ouvriras t'en proposeront.";
	var lignes = [C.gras("QUÊTES ANNEXES"), C.gris("Facultatives : des histoires d'habitants, hors de la note du chapitre. Récompenses : des XP en bonus, un souvenir (~/Souvenirs), une lumière de plus sur le plan."), ""];
	chapitres.forEach(function(ch){
		var l = annexesDuChapitre(ch).filter(queteAnnexeAccessible), ami = AMIS_ANNEXES[ch];
		lignes.push(C.gras("Chapitre " + numeroAffiche(ch)) + C.gris("  (" + l.filter(function(a){ return state.quests[a.id]; }).length + " sur " + l.length + (ami ? " ; toutes : le badge « " + ami.nom + " »" : "") + ")"));
		l.forEach(function(a){
			if (!annexeProposee(a) && !state.quests[a.id]){ lignes.push("  " + C.gris("[ ] ??? : " + (a.indice || "un habitant attend qu'on lui parle."))); return; }
			var s = etatAnnexe(a.id);
			lignes.push("  " + (state.quests[a.id] ? C.vert("[x] ") : "[ ] ") + C.gras(a.titre) + C.gris(" · " + a.habitant + (a.lieu ? ", " + a.lieu : "")));
			if (a.resume) lignes.push("      " + C.gris(a.resume));
			var enCours = false;
			a.etapes.forEach(function(e, k){
				if (s.etapes[k]) lignes.push("      " + C.vert("✓") + " " + e.titre);
				else if (!enCours){ enCours = true; lignes.push("      " + C.jaune("→ " + e.titre)); }
				else lignes.push("      " + C.gris("· " + e.titre));
			});
		});
		lignes.push("");
	});
	if (state.xpAnnexes) lignes.push(C.gris("XP en bonus gagnées avec les annexes : " + state.xpAnnexes + " (hors note)."));
	return lignes.join("\n").replace(/\n+$/, "");
}
var JOURNAL_AVANT_ANNEXES = GameState.prototype.journal;
GameState.prototype.journal = function(detail){
	if (detail === "annexes" || detail === "annexe") return texteAnnexesDetail();
	var t = JOURNAL_AVANT_ANNEXES.apply(this, arguments);
	var blocs = [];
	var chapitres = [];
	QUETES_ANNEXES.forEach(function(a){ if (queteAnnexeAccessible(a) && chapitres.indexOf(a.chapitre) === -1) chapitres.push(a.chapitre); });
	chapitres.forEach(function(ch){ var b = texteAnnexesCourt(ch); if (b) blocs.push(b); });
	if (!blocs.length) return t;
	// La section se place avant le niveau et le compte des sorts (les dernières lignes du journal).
	var lignes = String(t).split("\n"), fin = [];
	while (lignes.length && /^(\x1b\[[0-9;]*m)*(Niveau |Sorts appris)/.test(lignes[lignes.length - 1])) fin.unshift(lignes.pop());
	if (lignes.length && lignes[lignes.length - 1] === "") lignes.pop();
	return lignes.concat([""], blocs, [""], fin).join("\n");
};
