/**
 * RpgCrypte.js : le chapitre 3 (la Crypte, numéro 2 dans le code) en jeu de rôle.
 *
 * La mission cyber devient la Chasse au Corbeau. Chaque sort a un nom imagé et dit, au premier
 * lancement, ce qu'il fait en une image. Les machines de l'école sont dans la brume jusqu'à ce
 * qu'un sort les nomme ; le sort traque montre le tableau de chasse : ce qui est encore souillé par
 * le Corbeau, ce qui est purifié. Chaque étape franchie rapporte un trophée et une ligne à retenir.
 * Les vraies commandes ne changent pas : seul l'habillage est ici.
 */

var SORTS_RPG_CRYPTE = {
	sha256sum:   { nom: "l'Empreinte",       image: "Chaque fichier a une empreinte unique : change un octet, et elle ne correspond plus." },
	base64:      { nom: "le Déballeur",               image: "Ce n'est pas un secret, juste un emballage : tu le défais d'un geste." },
	"ssh-keygen":{ nom: "la Forge des Clés",          image: "Tu forges une paire : la clé publique se donne, la clé privée ne te quitte jamais." },
	strings:     { nom: "le Tamis",                   image: "Tu tamises un programme : seuls les mots lisibles restent au fond." },
	file:        { nom: "l'Œil du Vrai",              image: "Il voit ce qu'est vraiment un fichier, quel que soit le nom qu'il porte." },
	xxd:         { nom: "la Loupe des Octets",        image: "Tu vois la matière brute d'un fichier, octet par octet. Les premiers trahissent sa nature." },
	md5sum:      { nom: "l'Ancienne Empreinte",             image: "Une empreinte d'autrefois : rapide, mais plus assez sûr contre un faussaire." },
	sha1sum:     { nom: "l'Empreinte d'Argent",          image: "Une empreinte plus solide que l'ancienne, moins que celui de l'Archiviste." },
	stat:        { nom: "le Calendrier du Fichier",      image: "Tu lis quand un fichier est né, a été lu, a été changé." },
	chattr:      { nom: "le Marteau des Scellés",     image: "Tu poses ou brises un scellé : un fichier immuable résiste même à root." },
	lsattr:      { nom: "la Lecture des Scellés",     image: "Tu vois les scellés posés sur les fichiers, invisibles pour ls." },
	gzip:        { nom: "le Pressoir",                image: "Tu presses un fichier pour qu'il prenne moins de place." },
	gunzip:      { nom: "le Dépliage",                image: "Tu déplies un fichier pressé pour lui rendre sa forme." },
	zcat:        { nom: "la Lecture des Rouleaux",    image: "Tu lis un rouleau pressé sans avoir à le déplier." },
	sed:         { nom: "la Plume Correctrice",       image: "Tu corriges un texte d'un trait, partout à la fois." },
	awk:         { nom: "le Découpeur de Colonnes",   image: "Tu découpes un registre en colonnes et ne gardes que celle qui compte." },
	tr:          { nom: "le Miroir des Lettres",      image: "Chaque lettre devient une autre : de quoi lire un message brouillé." },
	rev:         { nom: "le Miroir Inversé",          image: "Chaque ligne se lit à l'envers, de sa dernière lettre à la première." },
	tee:         { nom: "le Double Chemin",           image: "Le flot se sépare en deux : à l'écran, et dans un fichier." },
	which:       { nom: "le Pisteur de Programmes",   image: "Tu retrouves l'endroit exact où dort un programme." },
	uname:       { nom: "le Blason de la Machine",    image: "La machine montre son blason : son système, son noyau." },
	dmesg:       { nom: "les Murmures du Noyau",      image: "Tu écoutes ce que le noyau a vu passer : disques, clés USB, cartes." },
	last:        { nom: "le Livre des Venues",        image: "Qui est entré, d'où, et quand : le livre n'oublie personne." },
	who:         { nom: "la Liste des Présents",      image: "Qui est là, en ce moment même." },
	lsof:        { nom: "le Filet",                   image: "Ton filet ramène tout ce qu'un processus tient : fichiers et connexions." },
	pgrep:       { nom: "le Flair",                   image: "Tu flaires un processus par son nom et tu retrouves son numéro." },
	pkill:       { nom: "la Flèche",                  image: "Ta flèche abat des processus par leur nom." },
	userdel:     { nom: "le Bannissement",            image: "Un compte disparaît du royaume." },
	usermod:     { nom: "la Transmutation",           image: "Tu changes un compte : ses guildes, son verrou." },
	gpasswd:     { nom: "la Radiation des Guildes",   image: "Tu raies un nom de la liste d'une guilde : il en perd les pouvoirs." },
	groups:      { nom: "le Blason des Guildes",      image: "Tu lis à quelles guildes (groupes) appartient un compte." },
	visudo:      { nom: "le Grimoire des Pouvoirs",   image: "Tu ouvres la liste de ceux qui peuvent devenir root, avec la garde qui vérifie chaque mot." },
	nmap:        { nom: "la Lanterne des Ports",      image: "Tu éclaires le réseau de l'école : chaque machine et ses portes sortent de l'ombre." },
	ufw:         { nom: "la Herse de la Muraille",    image: "Tu dictes la loi de la muraille : qui passe, qui reste dehors." },
	scp:         { nom: "la Caravane",                image: "Une caravane chiffrée emporte un fichier d'une machine à l'autre." },
	"ssh-copy-id":{ nom: "la Remise de Clé",          image: "Tu déposes ta clé publique chez une machine : elle te reconnaîtra." },
	gpg:         { nom: "le Coffre Scellé",           image: "Un coffre qu'aucune force n'ouvre : seule la phrase de passe le fait." },
	vim:         { nom: "le Grimoire Vivant",         image: "Un grimoire qui obéit au clavier : on y entre facilement, on en sort avec :q." },
	lastb:       { nom: "le Registre des Échecs",     image: "Tu lis chaque tentative ratée : les portes que quelqu'un a essayé de forcer." },
	lastlog:     { nom: "le Livre des Dernières Venues", image: "Pour chaque compte, sa dernière venue. Un compte jamais venu est un compte qui dort." },
	w:           { nom: "l'Œil du Veilleur",          image: "Le veilleur voit qui est là, et ce que chacun fait en ce moment." },
	chage:       { nom: "le Couperet des Comptes",     image: "Tu lis l'âge d'un compte, et tu peux faire tomber le couperet : le compte expire." },
	"fail2ban-client": { nom: "le Gardien des Portes", image: "Le gardien chasse ceux qui frappent trop souvent à la porte." },
	clamscan:    { nom: "le Chien de Chasse",         image: "Ton chien renifle chaque fichier et aboie devant les charges qu'il connaît." },
	rkhunter:    { nom: "le Chasseur de Rootkits",    image: "Le chasseur fouille la Citadelle à la recherche des outils d'un intrus devenu root." },
	debsums:     { nom: "le Témoin d'Origine", image: "Chaque programme est comparé à l'empreinte qu'il avait à son installation." },
	exiftool:    { nom: "l'Œil du Faussaire",         image: "Une photo raconte d'où elle vient : l'appareil, la date, et parfois le lieu exact." },
	getfacl:     { nom: "la Loupe des Droits cachés", image: "Tu vois les droits glissés en douce, en plus de ceux que montre ls." },
	setfacl:     { nom: "la Gomme des Droits",        image: "Tu effaces un droit glissé en douce." }
};

/* Les machines de l'école sur le tableau de chasse. La Citadelle est connue dès le départ. */
var LIEUX_CHASSE = [
	{ cle: "citadelle",  nom: "la Citadelle",           etapes: ["c_integrite", "c_suid", "c_ecoute", "c_compte", "c_sudo", "c_cle"] },
	{ cle: "labo",       nom: "l'Atelier des Apprentis", etapes: ["c_labo", "c_service"] },
	{ cle: "web",        nom: "la Vitrine",             etapes: ["c_web"] },
	{ cle: "mail",       nom: "la Volière",             etapes: ["c_mail"] },
	{ cle: "dns",        nom: "l'Oracle des Noms",      etapes: ["c_dns"] },
	{ cle: "parefeu",    nom: "la Muraille",            etapes: ["c_parefeu"] },
	{ cle: "sauvegarde", nom: "le Reliquaire",          etapes: ["c_preuves"] },
	{ cle: "imprimante", nom: "la Presse",              etapes: ["s_c_imprimante"] },
	{ cle: "badgeuse",   nom: "le Portail des Badges",  etapes: ["s_c_badgeuse"] },
	{ cle: "coffre",     nom: "le Coffre",              etapes: ["c_coffre"] },
	{ cle: "poste-47",   nom: "le Nid du Corbeau",      etapes: ["c_corbeau"] }
];

/* Le trophée de chaque étape, et ce qu'il faut en retenir. */
var TROPHEES_CRYPTE = {
	c_crypte:    ["la Torche de la Crypte", "Un intrus laisse des traces partout : programmes, journaux, comptes, réseau. On les remonte une par une, sans rien effacer."],
	c_integrite: ["la Loupe de l'Archiviste", "Une empreinte (sha256sum) change dès qu'un octet change. sha256sum -c LISTE vérifie tout un dossier d'un coup."],
	c_message:   ["le Message déballé", "base64 n'est pas du chiffrement : c'est un emballage que n'importe qui défait avec base64 -d."],
	c_suid:      ["la Clé de la Porte dérobée", "Un programme SUID s'exécute avec les droits de son propriétaire. find / -perm -4000 les trouve ; un SUID inconnu est une porte dérobée."],
	c_racine:    ["la Couronne de la Racine", "Un SUID qui appartient à root donne les droits de root à quiconque le lance. C'est pour ça qu'on les traque."],
	c_ecoute:    ["l'Oreille du Corbeau", "sudo ss -tlnp dit quel processus écoute sur quel port. Un port inconnu tenu par un faux nom de processus, on le coupe."],
	c_journaux:  ["la Page des Chroniques", "Les journaux anciens sont compressés : zcat et grep les lisent sans les décompresser. La première connexion dit d'où vient l'intrus."],
	c_carto:     ["la Carte de l'École", "nmap découvre les machines d'un réseau et leurs ports ouverts. Seulement sur un réseau qu'on a le droit de scanner."],
	c_labo:      ["la Chaîne du Labo", "who et last montrent les sessions. Arrêter les processus d'un compte ferme sa session (sudo pkill -u NOM)."],
	c_service:   ["le Rouage brisé", "Un service avec Restart=always revient si on tue son processus. sudo systemctl disable --now l'arrête pour de bon."],
	c_web:       ["le Masque de la Vitrine", "Un fichier immuable (chattr +i) résiste même à root. lsattr le montre, chattr -i le libère avant de le supprimer."],
	c_mail:      ["l'Hameçon démonté", "Une pièce jointe .pdf.sh est un script déguisé. file dit ce qu'est vraiment un fichier, quel que soit son nom."],
	c_dns:       ["la Boussole redressée", "Un faux enregistrement DNS détourne tout le monde vers l'attaquant. On retire la ligne fautive, sans toucher aux autres."],
	c_parefeu:   ["la Herse abaissée", "Pour empêcher une machine de traverser le pare-feu : sudo ufw route deny from ADRESSE (deny tout court ne protège que le pare-feu lui-même). La première règle qui correspond décide."],
	c_compte:    ["la Couronne du Faux Roi", "Tout compte d'UID 0 est root, quel que soit son nom. Un seul doit exister : root."],
	c_sudo:      ["le Sceptre repris", "sudoers ne se modifie qu'avec visudo, qui vérifie la syntaxe. Le droit sudo vient aussi du groupe sudo : il faut retirer les deux."],
	c_cle:       ["la Clé du Nid", "Une clé dans authorized_keys ouvre la porte sans mot de passe. Retirer la clé de l'intrus, c'est changer la serrure."],
	c_coffre:    ["la Clé du Coffre", "ssh-keygen forge une paire de clés, ssh-copy-id installe la publique. La privée ne quitte jamais ta machine."],
	c_preuves:   ["le Reliquaire des Preuves", "Une preuve se copie sans être modifiée, et son empreinte se note au registre : c'est la chaîne de traçabilité."],
	c_gpg:       ["le Carnet déchiffré", "gpg chiffre pour de vrai : sans la phrase de passe, pas de lecture. strings sort le texte lisible d'un programme."],
	c_corbeau:   ["la Plume noire", "Une enquête finit par une personne, pas par une adresse. Des preuves datées et intactes font la différence."]
};

function chasseRpg(){
	state.reseau.rpg = state.reseau.rpg || { premiers: {}, carte: { citadelle: true }, trophees: {} };
	var r = state.reseau.rpg;
	if ((state.has("reseauCartographie") || state.quests["c_rapport"]) && !r.toutRevele){
		r.toutRevele = true;
		var nouvelles = LIEUX_CHASSE.filter(function(l){ return !r.carte[l.cle]; }).length;
		LIEUX_CHASSE.forEach(function(l){ r.carte[l.cle] = true; });
		if (nouvelles && !state.has("rejeuEnCours")) say(C.jaune("✦ Traque : ") + "la Lanterne a tout éclairé, " + nouvelles + " machines sortent de la brume d'un coup." + C.gris(" traque (commande du jeu) pour voir ton tableau de chasse."));
	}
	return r;
}
function enChasse(){
	return state.has("crypteOuverte") && typeof state.chapitreEnCours === "function" && state.chapitreEnCours() === 2;
}

function revelerMachine(cle){
	var r = chasseRpg();
	if (r.carte[cle]) return;
	r.carte[cle] = true;
	var l = LIEUX_CHASSE.filter(function(x){ return x.cle === cle; })[0];
	if (l && !state.has("rejeuEnCours")) say(C.jaune("✦ Traque : ") + l.nom + " (" + cle + ") sort de la brume." + C.gris(" traque (commande du jeu) pour voir ton tableau de chasse."));
}

/* Les machines qu'un sort nomme : dans ses arguments, ou dans ce qu'il a affiché. */
function machinesNommees(nom, args, sortie){
	var texte = " " + args.join(" ") + " " + (typeof sortie === "string" ? sortie : "") + " ";
	var trouvees = [];
	LIEUX_CHASSE.forEach(function(l){
		var h = HOTES[l.cle] || {};
		var ip = l.cle === "poste-47" ? ADRESSE_POSTE_CORBEAU : h.ip;
		if (ip && texte.indexOf(ip) > -1) trouvees.push(l.cle);
		else if (new RegExp("(^|[\\s@:/(])" + l.cle.replace("-", "\\-") + "($|[\\s:./)])").test(" " + args.join(" ") + " ")) trouvees.push(l.cle);
	});
	if (Shell.hote() && LIEUX_CHASSE.some(function(l){ return l.cle === Shell.hote(); })) trouvees.push(Shell.hote());
	return trouvees;
}

function effetRpgCrypte(nom, args, sortie){
	if (!enChasse()) return;
	var r = chasseRpg();
	var fiche = SORTS_RPG_CRYPTE[nom] || (typeof SORTS_RPG !== "undefined" ? SORTS_RPG[nom] : null);
	if (fiche && !r.premiers[nom] && !state.quests["c_rapport"]){
		r.premiers[nom] = true;
		if (!state.has("rejeuEnCours")) say(C.vert("✦ " + fiche.nom.replace(/^./, function(c){ return c.toUpperCase(); }) + " (" + nom + ") : ") + fiche.image);
	}
	machinesNommees(nom, args, sortie).forEach(revelerMachine);
}

var APPELER_AVANT_CHASSE = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_CHASSE(nom, args, io);
	try { effetRpgCrypte(nom, args || [], sortie); } catch (e) { /* l'habillage ne doit jamais casser un sort */ }
	return sortie;
};

/* Après chaque ligne : un trophée et une leçon pour chaque étape franchie. */
function verifierRpgCrypte(){
	if (!state.has("crypteOuverte") || !state.reseau) return;
	var r = chasseRpg();
	Object.keys(TROPHEES_CRYPTE).forEach(function(id){
		if (!state.quests[id] || r.trophees[id]) return;
		r.trophees[id] = true;
		if (state.has("rejeuEnCours")) return;
		say(C.jaune("✦ Trophée de chasse : " + TROPHEES_CRYPTE[id][0] + ".") + C.gris(" (traque, commande du jeu, pour voir ton tableau)"));
		say(C.cyan("À retenir : ") + TROPHEES_CRYPTE[id][1]);
	});
}
var VERIFIER_MONDE_AVANT_CHASSE = verifierMonde;
verifierMonde = function(){
	VERIFIER_MONDE_AVANT_CHASSE();
	verifierRpgCrypte();
};

/* Le tableau de chasse : étroit, pour tenir dans le panneau de droite. */
function texteTraque(){
	var r = chasseRpg(), ici = Shell.hote();
	var lignes = [C.gras("TABLEAU DE CHASSE AU CORBEAU"), C.jaune("commande du jeu, pas Linux (man traque)"), C.gris("rouge : souillé · vert : purifié"), C.gris("░ : pas encore traqué (lance des sorts)"), ""];
	LIEUX_CHASSE.forEach(function(l){
		if (!r.carte[l.cle]){ lignes.push("  " + C.gris("░░░░░░░░░░  dans la brume")); return; }
		var faites = l.etapes.filter(function(id){ return state.quests[id]; }).length, total = l.etapes.length;
		var ok = faites === total;
		var marque = (ok ? C.vert : C.rouge)("●");
		lignes.push("  " + marque + " " + C.gras(completerDroite(l.cle, 11)) + l.nom + (ici === l.cle ? C.jaune("  ◀ toi") : ""));
		if (total > 1 || !ok) lignes.push("      " + (ok ? C.vert : C.gris)(faites + " sur " + total + (total > 1 ? " portes fermées" : (ok ? " fait" : " à faire"))));
	});
	var t = Object.keys(TROPHEES_CRYPTE).filter(function(id){ return state.quests[id]; });
	lignes.push("", C.gras("TROPHÉES : " + t.length + " sur " + Object.keys(TROPHEES_CRYPTE).length));
	t.forEach(function(id){ lignes.push("  " + C.jaune("✦ ") + TROPHEES_CRYPTE[id][0]); });
	if (!t.length) lignes.push(C.gris("  Chaque étape franchie en rapporte un."));
	return lignes.join("\n");
}

Shell.sorts.traque = function(args, io){
	if (!state.has("crypteOuverte")) return "Le tableau de chasse s'ouvre avec la mission cyber (chapitre 3). " + C.gris("Pendant la panne, c'est schema.");
	var texte = texteTraque();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le tableau remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
if (SORTS_DU_JEU.indexOf("traque") === -1) SORTS_DU_JEU.push("traque");
