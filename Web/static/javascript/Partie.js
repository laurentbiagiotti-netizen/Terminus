/**
 * Partie.js : ce qui distingue une partie d'une autre.
 *
 * Chargé avant le monde : le prénom du joueur (qui devient son identifiant sur
 * le système, à la place d'« apprenti ») et une graine tirée au hasard au
 * premier lancement. La graine fixe tout ce qui varie d'un joueur à l'autre :
 * le mot de passe sudo, l'adresse de l'attaquant, le meilleur client de la
 * taverne, le nombre de sweats du BDE, les numéros de processus... Deux
 * étudiants n'ont donc jamais exactement la même partie, et recopier la
 * solution du voisin ne suffit pas.
 */

var CLE_PROFIL = "terminus-cybersup-profil";

/* Les petits sons du jeu : remplacés par de vrais bips dans Game.js (navigateur seulement). */
function jouerSon(nom){}

var PROFIL = (function(){
	var profil = null;
	try {
		profil = JSON.parse(window.localStorage.getItem(CLE_PROFIL));
	} catch (e){
		profil = null;
	}
	if (!profil || typeof profil.graine !== "number"){
		profil = { graine: 1 + Math.floor(Math.random() * 2147483645), prenom: null, chapitre: 1 };
	}
	if (!profil.chapitre) profil.chapitre = 1;
	return profil;
})();

function enregistrerProfil(){
	try {
		window.localStorage.setItem(CLE_PROFIL, JSON.stringify(PROFIL));
	} catch (e){
		// Stockage indisponible : la partie se joue quand même, sans être retenue.
	}
}

/* « Léa-Marie » devient « leamarie » : un identifiant Linux, sans accent ni espace. */
function identifiantDepuisPrenom(prenom){
	var texte = String(prenom || "");
	if (texte.normalize) texte = texte.normalize("NFD").replace(/[̀-ͯ]/g, "");
	texte = texte.toLowerCase().replace(/[^a-z0-9]/g, "");
	if (!/^[a-z]/.test(texte)) return "";
	return texte.substring(0, 16);
}

/* Nom sous lequel le système connaît le joueur (voir le sort whoami). */
var JOUEUR = (PROFIL.prenom && identifiantDepuisPrenom(PROFIL.prenom)) || "apprenti";

/* Tirage déterministe : pour une même graine et un même sel, toujours le même nombre entre 0 et 1. */
function alea(sel){
	var h = 2166136261 ^ PROFIL.graine;
	var texte = String(sel);
	for (var i = 0; i < texte.length; i++){
		h ^= texte.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	h += 0x6D2B79F5;
	var t = Math.imul(h ^ (h >>> 15), 1 | h);
	t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function aleaEntier(sel, min, max){
	return min + Math.floor(alea(sel) * (max - min + 1));
}

function aleaChoix(sel, liste){
	return liste[Math.floor(alea(sel) * liste.length)];
}

/* Graine numérique pour les générateurs de textes du monde (voir Hasard dans GameObjects.js). */
function graineDe(sel){
	return 1 + Math.floor(alea("graine:" + sel) * 2147483645);
}

/* ------------------------------------------------------------------ */
/* Code de vérification du diplôme                                     */
/* ------------------------------------------------------------------ */

/*
 * Le diplôme porte un code qui résume la partie (prénom, score, note, temps...)
 * et une somme de contrôle. Le formateur colle le code dans la page de
 * classement, qui le décode et vérifie qu'il n'a pas été retouché.
 * Ce n'est pas un coffre-fort : le jeu est public et son code aussi. Mais cela
 * suffit à repérer une capture d'écran trafiquée.
 */
var SEL_DIPLOME = "terminus-cybersup|puteaux|bellini";

function sommeDeControle(texte){
	var h = 2166136261;
	for (var i = 0; i < texte.length; i++){
		h ^= texte.charCodeAt(i);
		h = Math.imul(h, 16777619) >>> 0;
	}
	return ("00000000" + h.toString(16)).slice(-8).toUpperCase();
}

function versBase64Url(texte){
	var octets = unescape(encodeURIComponent(texte));
	return btoa(octets).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64Url(code){
	var b64 = code.replace(/-/g, "+").replace(/_/g, "/");
	while (b64.length % 4) b64 += "=";
	return decodeURIComponent(escape(atob(b64)));
}

/* champs : prenom, score, max, note, commandes, minutes, indices, chapitre, date, graine */
function fabriquerCode(champs){
	var charge = ["T2", champs.prenom, champs.score, champs.max, champs.note, champs.commandes,
		champs.minutes, champs.indices, champs.chapitre, champs.date, champs.graine].join("|");
	return versBase64Url(charge) + "." + sommeDeControle(charge + "|" + SEL_DIPLOME);
}

/* Renvoie les champs du code, avec valide = true si la somme de contrôle correspond. */
function lireCode(code){
	var morceaux = String(code).trim().split(".");
	if (morceaux.length !== 2) return null;
	var charge;
	try {
		charge = depuisBase64Url(morceaux[0]);
	} catch (e){
		return null;
	}
	var champs = charge.split("|");
	if (champs[0] !== "T2" || champs.length !== 11) return null;
	return {
		valide: sommeDeControle(charge + "|" + SEL_DIPLOME) === morceaux[1].toUpperCase(),
		prenom: champs[1], score: +champs[2], max: +champs[3], note: +champs[4], commandes: +champs[5],
		minutes: +champs[6], indices: +champs[7], chapitre: +champs[8], date: champs[9], graine: +champs[10]
	};
}

/* Adresse de la machine d'où part l'attaque (journaux du SOC, hotes.txt, ssh). */
var ADRESSE_ATTAQUANT = "10.0.66." + aleaEntier("attaquant", 2, 254);

function dateDuJour(){
	var d = new Date();
	return d.getFullYear() + "-" + String(100 + d.getMonth() + 1).substring(1) + "-" + String(100 + d.getDate()).substring(1);
}
