/**
 * RpgPanne.js : le chapitre 2 en jeu de rôle.
 *
 * Le réseau de l'école devient un royaume : les paquets sont des messagers, le routeur une tour
 * de carrefour, le DNS un oracle, le pare-feu une herse. Chaque sort réseau porte un nom imagé et
 * rapporte quelque chose quand on le lance pour la première fois : une image de ce qu'il fait, et
 * souvent un lieu de la carte qui sort de la brume. Chaque réparation rapporte une relique.
 *
 * Les vraies commandes ne changent pas : seul l'habillage est ici. Le vrai mot reste toujours
 * écrit à côté de l'image, pour que le joueur reparte avec le vocabulaire du métier.
 */

/* Le nom imagé de chaque sort du chapitre, et ce qu'il fait, en une image. */
var SORTS_RPG = {
	ip:          { nom: "l'Œil du Réseau",        image: "Tu vois les portes de la machine, ses adresses et ses chemins." },
	ethtool:     { nom: "le Stéthoscope",          image: "Tu poses l'oreille sur le câble : le fil est-il vivant ?" },
	hostnamectl: { nom: "le Miroir des Noms",      image: "Le miroir te dit sur quelle machine tu te tiens." },
	dhclient:    { nom: "l'Appel à la Source",     image: "Tu demandes à la Source (le DHCP) de t'offrir une adresse." },
	nmcli:       { nom: "le Conseil des Cartes",   image: "Les cartes réseau de la machine font leur rapport." },
	netplan:     { nom: "le Grimoire Gravé",       image: "Ce qui s'écrit dans ce grimoire survit au sommeil de la machine." },
	reboot:      { nom: "le Grand Sommeil",        image: "La machine s'endort et se réveille : seul ce qui est gravé a survécu." },
	nano:        { nom: "la Plume",                image: "Tu trempes la plume dans l'encre et réécris un parchemin de la machine." },
	curl:        { nom: "le Messager",             image: "Ton messager frappe à la porte d'un site et te rapporte sa réponse." },
	wget:        { nom: "la Besace",               image: "Ta besace se remplit : le fichier est rapporté sur ta machine." },
	dig:         { nom: "l'Oracle",                image: "Tu poses une question à l'Oracle des Noms : quelle adresse porte ce nom ?" },
	host:        { nom: "le Petit Oracle",         image: "Le Petit Oracle répond en une seule ligne." },
	nslookup:    { nom: "le Vieil Oracle",         image: "Le Vieil Oracle, celui des anciens, répond à sa façon." },
	resolvectl:  { nom: "la Boussole des Noms",    image: "La boussole montre quel Oracle la machine consulte vraiment." },
	systemctl:   { nom: "le Sceptre des Gardiens", image: "Le sceptre réveille, endort et scelle les gardiens (les services)." },
	journalctl:  { nom: "les Chroniques",          image: "Les chroniques racontent ce que chaque gardien a fait, et quand." },
	ss:          { nom: "le Registre des Portes",  image: "Le registre dit quelles portes (les ports) sont ouvertes, et qui les garde." },
	iptables:    { nom: "la Herse",                image: "Tu lis la loi de la herse : quels messagers passent, lesquels sont jetés." },
	tcpdump:     { nom: "l'Oreille du Mur",        image: "Tu entends passer les messagers. Ceux qui parlent en clair, tu les comprends." },
	traceroute:  { nom: "le Fil d'Ariane",         image: "Le fil se déroule étape par étape, et montre où le chemin se casse." },
	mtr:         { nom: "la Longue-Vue",           image: "La longue-vue suit le chemin longtemps et compte les messagers perdus." },
	openssl:     { nom: "la Loupe des Sceaux",     image: "Tu lis le sceau d'un site (son certificat) et ses dates de validité." },
	timedatectl: { nom: "le Clocher",              image: "Tu règles l'horloge de la machine sur celle du royaume." },
	nc:          { nom: "le Heurtoir",             image: "Tu frappes à une porte : ouverte, fermée, ou personne ne répond ?" },
	telnet:      { nom: "le Cornet",               image: "Tu parles à un gardien à voix haute. Tout le monde peut entendre." },
	ping:        { nom: "l'Écho",                  image: "Tu lances un appel et tu écoutes s'il revient." },
	ssh:         { nom: "le Portail",              image: "Un portail s'ouvre vers une autre machine, par un tunnel que nul ne peut lire." },
	ifconfig:    { nom: "l'Ancien Œil",            image: "Le sort des anciens : les cartes et leurs adresses, comme ip a, mais sans les cartes éteintes." },
	route:       { nom: "l'Ancienne Carte",        image: "La table des chemins, à la façon des anciens : où part chaque messager." },
	arp:         { nom: "l'Ancien Voisinage",      image: "Les voisins de ta rue, et l'identité gravée dans leur carte (l'adresse MAC)." },
	netstat:     { nom: "l'Ancien Registre",       image: "Les portes ouvertes et leurs gardiens, comme ss, mais dans la langue d'avant." },
	arping:      { nom: "le Cri dans la Rue",      image: "Tu cries une adresse dans ta rue : celui qui la porte te répond, avec son identité." },
	tracepath:   { nom: "le Petit Fil",            image: "Un fil plus léger que celui d'Ariane : il mesure aussi la taille des messagers qui passent." },
	getent:      { nom: "le Registre Commun",      image: "Tu traduis un nom exactement comme le font les programmes : les raccourcis, puis l'Oracle." },
	uptime:      { nom: "le Sablier",              image: "Le sablier dit depuis quand la machine est éveillée, et combien elle travaille." },
	iperf3:      { nom: "la Course des Messagers", image: "Tes messagers courent jusqu'à un serveur et reviennent : tu mesures le débit du chemin." },
	nft:         { nom: "la Nouvelle Herse",       image: "La loi du pare-feu, écrite dans la langue moderne du noyau (nftables)." }
};

/* Les lieux de la carte du royaume. Le poste est connu dès le départ ; le reste est dans la brume. */
var LIEUX_RPG = {
	poste:    { nom: "le Poste de garde",      vrai: "poste-b" },
	routeur:  { nom: "la Tour du Carrefour",   vrai: "routeur" },
	dns:      { nom: "l'Oracle des Noms",      vrai: "dns" },
	intranet: { nom: "la Bibliothèque",        vrai: "intranet" },
	mail:     { nom: "la Volière",             vrai: "mail" },
	parefeu:  { nom: "la Muraille",            vrai: "parefeu" },
	lille:    { nom: "le Comptoir du Nord",    vrai: "lille" }
};

/* La relique que rapporte chaque réparation. */
var RELIQUES = {
	r_lien:       "la Rune du Lien",
	r_ip:         "le Sceau de l'Adresse",
	r_passerelle: "la Clé du Carrefour",
	r_dns:        "l'Œil de l'Oracle",
	r_dhcp:       "l'Eau de la Source",
	r_netplan:    "la Page Gravée",
	r_web:        "la Lanterne de la Bibliothèque",
	r_https:      "le Sablier Juste",
	r_smtp:       "la Plume de la Volière",
	r_lille:      "le Fil du Nord",
	r_telnet:     "le Verrou du Silence"
};

function nomRpg(sort, chapitre){
	if (chapitre === 2 && typeof SORTS_RPG_CRYPTE !== "undefined" && SORTS_RPG_CRYPTE[sort]) return SORTS_RPG_CRYPTE[sort].nom;
	return SORTS_RPG[sort] ? SORTS_RPG[sort].nom : "";
}

function reliquesObtenues(){
	return Object.keys(RELIQUES).filter(function(id){ return state.quests[id]; }).map(function(id){ return RELIQUES[id]; });
}

function carteRpg(){
	var p = state.panne;
	if (!p.carte) p.carte = { poste: true };
	if (state.has("victoireReseau")) Object.keys(LIEUX_RPG).forEach(function(k){ p.carte[k] = true; });
	return p.carte;
}

/* Fait sortir un lieu de la brume. */
function revelerLieu(cle){
	var carte = carteRpg();
	if (carte[cle]) return;
	carte[cle] = true;
	if (!state.has("rejeuEnCours")) say(C.jaune("✦ Carte : ") + LIEUX_RPG[cle].nom + " (" + LIEUX_RPG[cle].vrai + ") sort de la brume." + C.gris(" schema pour la voir."));
}

/* Les lieux qu'un sort, ou la lecture d'un parchemin, fait découvrir. */
function lieuxDecouverts(nom, args, hote){
	var texte = " " + args.join(" ") + " ", lieux = [];
	var lecture = ["cat", "less", "more", "head", "tail"].indexOf(nom) > -1;
	if (lecture){
		if (/Etiquette/.test(texte)) lieux.push("routeur", "dns");
		if (/CahierDuRouteur/.test(texte)) lieux.push("parefeu", "lille");
		if (/MemoDNS|resolv\.conf/.test(texte)) lieux.push("dns");
		if (/NoteDeVint/.test(texte)) lieux.push("intranet");
		return lieux;
	}
	if (!SORTS_RPG[nom]) return lieux;
	if (hote === "routeur" || /routeur|10\.0\.93\.254|10\.0\.92\.249/.test(texte)) lieux.push("routeur");
	if (nom === "ip" && /^\s*(r|ro|route|n|neigh)\b/.test(args.join(" ")) && hote === "poste-b" && state.panne.lien) lieux.push("routeur");
	if (["dig", "host", "nslookup", "resolvectl"].indexOf(nom) > -1 || /\bdns\b|10\.0\.92\.53\b/.test(texte)) lieux.push("dns");
	if (hote === "intranet" || /intranet|10\.0\.92\.20\b/.test(texte)) lieux.push("intranet");
	if (/\bmail\b|\bMX\b|10\.0\.92\.11\b/.test(texte)) lieux.push("mail");
	if (["traceroute", "mtr", "iptables", "tracepath", "nft"].indexOf(nom) > -1 || /parefeu|10\.0\.92\.254\b/.test(texte)) lieux.push("parefeu");
	if (/lille|10\.0\.59\.|10\.0\.92\.248\b/.test(texte)) lieux.push("lille");
	return lieux;
}

/* Ce que rapporte un sort lancé avec succès pendant la panne. */
function effetRpg(nom, args){
	if (!state.has("panneOuverte") || !state.panne) return;
	var hote = Shell.hote();
	var dansLaPanne = estHotePanne(hote) || (typeof BatimentB !== "undefined" && joueurDans(BatimentB));
	if (!dansLaPanne) return;
	var p = state.panne;
	p.premiers = p.premiers || {};
	if (SORTS_RPG[nom] && !p.premiers[nom] && !state.has("victoireReseau")){
		p.premiers[nom] = true;
		if (!state.has("rejeuEnCours")) say(C.vert("✦ " + SORTS_RPG[nom].nom.replace(/^./, function(c){ return c.toUpperCase(); }) + " (" + nom + ") : ") + SORTS_RPG[nom].image);
	}
	lieuxDecouverts(nom, args, hote).forEach(revelerLieu);
}

/* Les sorts passent par ici : on garde leur sortie telle quelle, puis le royaume réagit. */
var APPELER_AVANT_RPG = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_RPG(nom, args, io);
	try { effetRpg(nom, args || []); } catch (e) { /* l'habillage ne doit jamais casser un sort */ }
	return sortie;
};
