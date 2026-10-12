/**
 * RpgPanne.js : le chapitre 2 en jeu de rôle.
 *
 * Dans ce monde, le courrier ne s'adresse pas comme chez nous : une adresse postale s'écrit en
 * quatre nombres, 10.0.93.20 (la rue, puis la maison). Le réseau de l'école devient donc un
 * service postal : les paquets sont des lettres, le routeur le bureau de poste, le DNS l'Oracle des Noms,
 * le DHCP la mairie, les ports les guichets, le pare-feu le gardien. Chaque sort réseau porte un
 * nom imagé et rapporte quelque chose quand on le lance pour la première fois : une image de ce
 * qu'il fait, et souvent un lieu du plan qui sort de la brume.
 *
 * Les vraies commandes ne changent pas : seul l'habillage est ici. Le vrai mot reste toujours
 * écrit à côté de l'image, pour que le joueur reparte avec le vocabulaire du métier.
 */

/* Le nom imagé de chaque sort du chapitre, et ce qu'il fait, en une image. */
var SORTS_RPG = {
	ip:          { nom: "le Registre de la Maison",  image: "Tu lis la fiche de la maison : ses boîtes aux lettres, son adresse, ses itinéraires." },
	ethtool:     { nom: "le Contrôle de la Boîte",   image: "Tu vérifies la boîte aux lettres elle-même : le câble qui y mène est-il vivant ?" },
	hostnamectl: { nom: "la Plaque de la Porte",     image: "La plaque te dit dans quelle maison (sur quelle machine) tu te tiens." },
	dhclient:    { nom: "la Demande à la Mairie",    image: "Tu demandes à la Mairie (le DHCP) de t'attribuer une adresse." },
	nmcli:       { nom: "le Bilan des Boîtes",       image: "Les boîtes aux lettres de la maison (les cartes réseau) font leur rapport." },
	netplan:     { nom: "le Registre du Cadastre",   image: "Ce qui est inscrit au cadastre survit au sommeil de la machine." },
	reboot:      { nom: "le Grand Sommeil",          image: "La maison s'endort et se réveille : seul ce qui est inscrit au cadastre a survécu." },
	nano:        { nom: "le Stylo",                  image: "Tu reprends au stylo un formulaire de la machine." },
	curl:        { nom: "la Lettre Express",         image: "Ta lettre part au guichet d'un site, et la réponse revient aussitôt." },
	wget:        { nom: "le Colis",                  image: "Le colis arrive : le fichier est livré sur ta machine." },
	dig:         { nom: "l'Oracle",                  image: "Tu interroges l'Oracle des Noms (le DNS) : à quelle adresse habite ce nom ?" },
	host:        { nom: "le Petit Oracle",           image: "Le Petit Oracle répond en une seule ligne." },
	nslookup:    { nom: "le Vieil Oracle",           image: "Le Vieil Oracle, celui des anciens, répond à sa façon." },
	resolvectl:  { nom: "la Boussole des Noms",     image: "La boussole montre quel oracle la machine interroge vraiment." },
	systemctl:   { nom: "le Chef de Service",        image: "Tu ouvres, fermes ou condamnes les guichets (les services) et leurs employés." },
	journalctl:  { nom: "le Cahier de Bord",         image: "Le cahier raconte ce que chaque employé a fait, et à quelle heure." },
	ss:          { nom: "le Tableau des Guichets",   image: "Le tableau dit quels guichets (les ports) sont ouverts, et qui les tient." },
	iptables:    { nom: "le Règlement du Gardien",   image: "Tu lis le règlement du gardien : quelles lettres entrent, lesquelles finissent au broyeur." },
	tcpdump:     { nom: "le Tri à la Loupe",         image: "Tu regardes passer chaque lettre au tri. Les cartes postales (en clair), tu peux les lire." },
	traceroute:  { nom: "le Suivi du Colis",         image: "Chaque bureau de poste traversé signe le bordereau : tu vois où le colis se perd." },
	mtr:         { nom: "le Suivi en Direct",        image: "Le suivi tourne longtemps et compte les lettres perdues à chaque étape." },
	openssl:     { nom: "la Loupe du Cachet",        image: "Tu examines le cachet officiel d'un site (son certificat) et ses dates de validité." },
	timedatectl: { nom: "l'Horloge de la Poste",     image: "Tu règles l'horloge de la machine sur celle de la ville." },
	nc:          { nom: "le Coup au Guichet",        image: "Tu frappes à un guichet : ouvert, fermé, ou personne ne répond ?" },
	telnet:      { nom: "la Carte Postale",          image: "Tu écris sur une carte postale : n'importe quel facteur peut la lire." },
	ping:        { nom: "l'Accusé de Réception",     image: "Ta lettre part, et tu attends l'accusé de réception." },
	ssh:         { nom: "l'Enveloppe Scellée",       image: "Tu parles à une autre machine sous enveloppe scellée : nul facteur ne peut la lire." },
	ifconfig:    { nom: "l'Ancien Registre",         image: "Le sort des anciens : les boîtes et leurs adresses, comme ip a, mais sans les boîtes fermées." },
	route:       { nom: "l'Ancien Plan de Tri",      image: "Le plan de tri à la façon des anciens : où part chaque lettre." },
	arp:         { nom: "l'Ancien Bottin de la Rue", image: "Les voisins de ta rue, et le nom gravé sur leur boîte aux lettres (l'adresse MAC)." },
	netstat:     { nom: "l'Ancien Tableau",          image: "Les guichets ouverts et leurs employés, comme ss, mais dans la langue d'avant." },
	arping:      { nom: "l'Appel dans la Rue",       image: "Tu demandes dans ta rue « qui habite au 20 ? » : l'habitant répond, avec le nom de sa boîte." },
	tracepath:   { nom: "le Petit Suivi",            image: "Un suivi plus léger : il mesure aussi la taille des lettres qui passent." },
	getent:      { nom: "le Carnet d'Adresses",      image: "Tu cherches un nom comme le font les programmes : ton carnet perso, puis l'Oracle des Noms." },
	uptime:      { nom: "l'Horloge d'Ouverture",     image: "L'horloge dit depuis quand la maison est ouverte, et combien elle travaille." },
	iperf3:      { nom: "la Course des Facteurs",    image: "Tes facteurs courent jusqu'à un serveur et reviennent : tu mesures le débit." },
	nft:         { nom: "le Nouveau Règlement",      image: "Le règlement du gardien, écrit dans la langue moderne du noyau (nftables)." },
	rfkill:      { nom: "le Scellé de l'Antenne",    image: "Tu poses ou retires le scellé qui fait taire les antennes de la machine." },
	iw:          { nom: "l'Écoute des Relais",       image: "Tu entends les relais postaux sans fil annoncer leur enseigne, et leur force." },
	ipcalc:      { nom: "la Règle du Cadastre",      image: "La règle mesure une rue : son panneau, son crieur, et toutes les maisons entre les deux." },
	sysctl:      { nom: "les Consignes du Relais",   image: "Tu changes une consigne du relais : transmettre le courrier à la rue d'à côté, ou non." },
	"named-checkzone": { nom: "la Relecture du Registre", image: "Tu relis le registre de l'Oracle ligne à ligne, avant qu'il ne le refuse." },
	lldpctl:     { nom: "l'Étiquette du Câble",      image: "Chaque câble te dit le nom de celui qui est au bout." },
	iftop:       { nom: "le Compteur du Tri",        image: "Au centre de tri, tu vois qui envoie le plus de courrier." },
	nethogs:     { nom: "le Gros Expéditeur",        image: "Dans une maison, tu montres du doigt le programme qui inonde la poste." },
	vnstat:      { nom: "le Relevé du Courrier",     image: "Jour après jour, le relevé note le poids du courrier." },
	conntrack:   { nom: "le Registre des Recommandés", image: "Chaque échange qui traverse le relais y est noté, de qui à qui." },
	"arp-scan":  { nom: "le Recensement",            image: "Tu frappes à toutes les portes de la rue d'un coup : chaque maison répond avec son nom." },
	fping:       { nom: "les Accusés en Série",      image: "Cent lettres envoyées à la fois : qui ouvre, qui est absent." },
	whois:       { nom: "le Registre des Enseignes", image: "Le grand registre dit à qui appartient un nom de domaine, et depuis quand." },
	chronyc:     { nom: "les Horloges de Référence", image: "Tu vois à quelles horloges la machine se fie." },
	smbclient:   { nom: "le Casier Partagé",         image: "Tu ouvres les casiers partagés d'un serveur." }
};

/* L'étage du modèle OSI où travaille chaque sort du chapitre. */
var ETAGES_DU_SORT = {
	ip: "étages 2 et 3", ethtool: "étage 1", hostnamectl: "la machine", dhclient: "étage 7, pour l'étage 3", nmcli: "étages 1 à 3",
	netplan: "étages 1 à 3", reboot: "toute la tour", curl: "étage 7", wget: "étage 7", dig: "étage 7", host: "étage 7", nslookup: "étage 7",
	resolvectl: "étage 7", systemctl: "les services", journalctl: "les journaux", ss: "étage 4", iptables: "étages 3 et 4", tcpdump: "étages 2 à 7",
	traceroute: "étage 3", mtr: "étage 3", openssl: "étage 6", timedatectl: "pour l'étage 6", nc: "étage 4", telnet: "étage 7, en clair",
	ping: "étage 3", ssh: "étages 5 à 7, chiffrés", ifconfig: "étages 2 et 3", route: "étage 3", arp: "étage 2", netstat: "étage 4",
	arping: "étage 2", tracepath: "étage 3", getent: "étage 7", iperf3: "étage 4", nft: "étages 3 et 4",
	rfkill: "étage 1", iw: "étages 1 et 2", ipcalc: "étage 3", sysctl: "étage 3", "named-checkzone": "étage 7", lldpctl: "étage 2",
	iftop: "étages 3 et 4", nethogs: "étages 4 et 7", vnstat: "étage 1 à 3", conntrack: "étages 3 et 4", "arp-scan": "étage 2",
	fping: "étage 3", whois: "étage 7", chronyc: "étage 7", smbclient: "étage 7"
};

/* Les lieux du plan de la ville. Le poste est connu dès le départ ; le reste est dans la brume. */
var LIEUX_RPG = {
	poste:    { nom: "la Maison de l'accueil",   vrai: "poste-b" },
	routeur:  { nom: "le Bureau de Poste",       vrai: "routeur" },
	dns:      { nom: "l'Oracle des Noms",        vrai: "dns" },
	intranet: { nom: "la Bibliothèque",          vrai: "intranet" },
	mail:     { nom: "le Centre du Courrier",    vrai: "mail" },
	parefeu:  { nom: "la Loge du Gardien",       vrai: "parefeu" },
	lille:    { nom: "la Poste de Lille",        vrai: "lille" },
	borne:    { nom: "le Relais sans fil",       vrai: "borne" },
	switch:   { nom: "la Rangée de Boîtes",      vrai: "switch" },
	affichage: { nom: "le Grand Tableau",        vrai: "affichage" }
};

/* La relique que rapporte chaque réparation. */
var RELIQUES = {
	r_osi:        "la Clé de la Grande Poste",
	r_lien:       "la Boîte Rouverte",
	r_ip:         "la Plaque d'Adresse",
	r_passerelle: "la Clé du Bureau de Poste",
	r_dns:        "l'Œil de l'Oracle",
	r_dhcp:       "le Tampon de la Mairie",
	r_netplan:    "l'Acte du Cadastre",
	r_web:        "la Lanterne de la Bibliothèque",
	r_https:      "le Cachet à l'Heure",
	r_smtp:       "la Sacoche du Facteur",
	r_lille:      "l'Itinéraire du Nord",
	r_telnet:     "l'Enveloppe Scellée",
	r_wifi:       "le Scellé Levé",
	r_ssid:       "la Vraie Enseigne",
	r_plan:       "la Règle du Quartier",
	r_forward:    "la Consigne du Relais",
	r_zone:       "le Registre de l'Oracle Corrigé",
	r_prise:      "la Boîte Retrouvée",
	r_debit:      "le Gros Expéditeur Calmé"
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
	if (!state.has("rejeuEnCours")) Shell.narration.push({ lieu: LIEUX_RPG[cle].nom + " (" + LIEUX_RPG[cle].vrai + ")", voir: "schema" });
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
		if (/CarnetDeLAnnexe|NoticeDeLaBorne/.test(texte)) lieux.push("borne");
		if (/NoticeDeLaBorne|CarnetDuSwitch/.test(texte)) lieux.push("switch");
		if (/CarnetDuSwitch/.test(texte)) lieux.push("affichage");
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
	if (typeof annexeOuverte === "function" && !annexeOuverte()) return lieux;
	if (hote === "borne" || hote === "portable" || /\bborne\b|10\.0\.94\.1\b|10\.0\.92\.94\b/.test(texte)) lieux.push("borne");
	if (hote === "switch" || /\bswitch\b|10\.0\.94\.2\b|10\.0\.94\.0\//.test(texte)) lieux.push("switch");
	if (hote === "affichage" || /affichage|10\.0\.94\.40\b/.test(texte)) lieux.push("affichage");
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
	}
	lieuxDecouverts(nom, args, hote).forEach(revelerLieu);
}

/* Les sorts passent par ici : on garde leur sortie telle quelle, puis la ville réagit. */
var APPELER_AVANT_RPG = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_RPG(nom, args, io);
	try { effetRpg(nom, args || []); } catch (e) { /* l'habillage ne doit jamais casser un sort */ }
	return sortie;
};
