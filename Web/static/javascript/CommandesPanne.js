/**
 * CommandesPanne.js : les sorts du chapitre 2, la panne du réseau de l'école.
 *
 * Le lien et l'adresse : ip (link, addr, route, neigh), ethtool, dhclient, nmcli, netplan, reboot.
 * Les noms : dig, host, nslookup, resolvectl, et /etc/hosts. Les services : systemctl, journalctl, ss.
 * Le chemin des paquets : ping, traceroute, mtr, nc, telnet, iptables, tcpdump.
 * Le web et l'heure : curl, wget, openssl, timedatectl. Et hostnamectl, pour savoir où l'on est.
 *
 * Sur les machines de la panne (poste-b, routeur, intranet), ces sorts suivent l'état réel du
 * réseau (Panne.js) : une carte éteinte, une route absente ou une règle de pare-feu changent ce
 * qu'ils répondent. Ailleurs, ils gardent leur comportement d'avant (CommandesCyber.js).
 */

var AVANT_PANNE = {
	ping: Shell.sorts.ping, ssh: Shell.sorts.ssh, ip: Shell.sorts.ip, traceroute: Shell.sorts.traceroute,
	dig: Shell.sorts.dig, curl: Shell.sorts.curl, nc: Shell.sorts.nc, ss: Shell.sorts.ss,
	systemctl: Shell.sorts.systemctl, journalctl: Shell.sorts.journalctl, date: Shell.sorts.date
};

function surPanne(){ return estHotePanne(Shell.hote()); }

/* Les quêtes secondaires de la panne ne comptent qu'une fois le chapitre ouvert. */
function quetePanne(id){
	if (state.has("panneOuverte")) state.complete(id);
}

function exigerSudo(io, cmd, message){
	if (!io.sudo) throw new ShellError(message + "\n" + C.gris("(Changer la configuration réseau est réservé à root : sudo " + cmd + " ...)"));
}

var ERREURS_TCP = { reseau: "Network is unreachable", hote: "No route to host", delai: "Connection timed out", refus: "Connection refused", rejet: "Connection refused" };
var NOMS_DE_PORTS = { "22": "ssh", "23": "telnet", "25": "smtp", "53": "domain", "67": "bootps", "68": "bootpc", "80": "http", "123": "ntp", "143": "imap", "443": "https" };

/* ------------------------------------------------------------------ */
/* ping et ssh                                                         */
/* ------------------------------------------------------------------ */

Shell.sorts.ping = function(args, io){
	if (!surPanne()) return AVANT_PANNE.ping(args, io);
	var combien = 3, explicite = false, cibles = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-c"){ combien = parseInt(args[++i], 10); explicite = true; }
		else if (/^-c\d+$/.test(args[i])){ combien = parseInt(args[i].substring(2), 10); explicite = true; }
		else if (args[i].charAt(0) === "-") throw new ShellError("ping : option inconnue « " + args[i] + " ». Celle qui existe ici : -c NOMBRE");
		else cibles.push(args[i]);
	}
	if (cibles.length !== 1) throw new ShellError("ping : quelle machine veux-tu appeler ? Utilisation : ping MACHINE");
	if (isNaN(combien) || combien < 1) throw new ShellError("ping : -c attend un nombre de paquets");
	var demande = combien;
	combien = Math.min(combien, 5);
	var ici = Shell.hote(), cible = cibles[0];
	var r = resoudreDepuis(ici, cible);
	if (r.erreur){
		GameEvents.fire({ type: "pingPanne", ok: false });
		throw new ShellError("ping : " + cible + " : " + (r.erreur === "temp" ? "Échec temporaire dans la résolution du nom" : "Nom ou service inconnu") +
			(r.erreur === "temp" && io.tty ? "\n" + C.gris("(Le poste n'arrive pas à faire traduire ce nom : il n'obtient aucune réponse de son serveur DNS.)") : ""));
	}
	var t = cheminVers(ici, r.ip);
	if (!t.ok && t.erreur === "reseau"){
		GameEvents.fire({ type: "pingPanne", ok: false });
		throw new ShellError("ping : connect : Le réseau n'est pas accessible" + (io.tty ? "\n" + C.gris("(Le poste ne sait pas comment atteindre cette adresse : ip a et ip r disent pourquoi.)") : ""));
	}
	var nom = ipValide(cible) ? r.ip : cible;
	var lignes = ["PING " + nom + " (" + r.ip + ") 56(84) octets de données."];
	var recus = 0;
	for (var k = 1; k <= combien; k++){
		if (t.ok){
			var temps = (0.05 + (t.sauts.length - 1) * 0.4 + ((r.ip.length * 7 + k * 13) % 10) / 20).toFixed(2).replace(".", ",");
			lignes.push("64 octets de " + (t.nom && !ipValide(cible) ? t.nom : r.ip) + " (" + r.ip + ") : icmp_seq=" + k + " ttl=" + (65 - t.sauts.length) + " temps=" + temps + " ms");
			recus++;
		} else if (t.erreur === "hote"){
			lignes.push("Depuis " + ((ici === "poste-b" ? adressePoste() : null) || ipDeHote(ici)) + " icmp_seq=" + k + " Hôte de destination injoignable");
		}
	}
	lignes.push("", "--- statistiques ping " + nom + " ---",
		combien + " paquets transmis, " + recus + " reçus, " + (recus ? "0" : "100") + " % de paquets perdus");
	if (!t.ok && t.erreur === "delai" && io.tty) lignes.push(C.gris("(Aucune réponse : quelque part après " + (t.sauts.length ? t.sauts[t.sauts.length - 1][0] : "le poste") + ", les paquets se perdent. traceroute dit où.)"));
	if (demande > 5 && io.tty) lignes.push(C.gris("(Ici, ping s'arrête à 5 paquets.)"));
	if (!explicite && io.tty && !state.has("pingSansFinVu")){ state.set("pingSansFinVu"); lignes.push(C.gris("(Sur un vrai Linux, ping sans -c ne s'arrête jamais : Ctrl+C l'arrête. Ici, le jeu s'arrête tout seul après 3 paquets.)")); }
	GameEvents.fire({ type: "pingPanne", ok: t.ok, n: combien, explicite: explicite, host: t.nom });
	return lignes.join("\n");
};

Shell.sorts.ssh = function(args, io){
	if (!surPanne()) return AVANT_PANNE.ssh(args, io);
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (cibles.length === 0) return AVANT_PANNE.ssh(args, io);
	var cible = cibles[0], utilisateur = null;
	if (cible.indexOf("@") > -1){ utilisateur = cible.split("@")[0]; cible = cible.split("@")[1]; }
	var ici = Shell.hote();
	var r = resoudreDepuis(ici, cible);
	if (r.erreur) throw new ShellError("ssh: Could not resolve hostname " + cible + ": " + (r.erreur === "temp" ? "Temporary failure in name resolution" : "Name or service not known"));
	if (r.ip === "127.0.0.1") return AVANT_PANNE.ssh([ici], io);
	var t = cheminVers(ici, r.ip, { proto: "tcp", port: "22" });
	if (!t.ok) throw new ShellError("ssh: connect to host " + cible + " port 22: " + ERREURS_TCP[t.erreur] +
		(io.tty && typeof astuceAnnexeInjoignable === "function" ? astuceAnnexeInjoignable(ici, r.ip) : ""));
	var h = nomDeIp(r.ip);
	if (!h) throw new ShellError("ssh: connect to host " + cible + " port 22: Connection timed out");
	return AVANT_PANNE.ssh([(utilisateur ? utilisateur + "@" : "") + h], io);
};

/* ------------------------------------------------------------------ */
/* ip                                                                  */
/* ------------------------------------------------------------------ */

function macDe(ip){
	return "52:54:00:" + ip.split(".").slice(1).map(function(x){ return ("0" + (+x).toString(16)).slice(-2); }).join(":");
}
/* Les cartes réseau d'une machine. */
function interfacesDe(h){
	var lo = { nom: "lo", lo: true, up: true, mac: "00:00:00:00:00:00", adresses: [{ ip: "127.0.0.1", prefixe: 8 }] };
	if (h === "poste-b"){
		var p = state.panne;
		return [lo, { nom: "eth0", up: p.lien, mac: MAC_POSTE, adresses: p.adresses.slice() }];
	}
	if (h === "routeur"){
		return [lo, { nom: "eth0", up: true, mac: MAC_ROUTEUR, adresses: [{ ip: IP_ROUTEUR, prefixe: 24 }] },
			{ nom: "eth1", up: true, mac: "52:54:00:5d:fe:02", adresses: [{ ip: IP_ROUTEUR_COEUR, prefixe: 24 }] }];
	}
	var ipHote = infoHote(h).ip || "10.0.0.1";
	return [lo, { nom: "eth0", up: true, mac: macDe(ipHote), adresses: [{ ip: ipHote, prefixe: infoHote(h).prefixe || 24 }] }];
}
function diffusion(ip, prefixe){
	var bloc = Math.pow(2, 32 - prefixe), n = Math.floor(nombreIp(ip) / bloc) * bloc + bloc - 1;
	return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join(".");
}
function texteInterface(i, n, avecAdresses, stats, tty){
	var drapeaux = i.lo ? "<LOOPBACK,UP,LOWER_UP>" : (i.up ? "<BROADCAST,MULTICAST,UP,LOWER_UP>" : "<BROADCAST,MULTICAST>");
	var etat = i.lo ? "UNKNOWN" : (i.up ? "UP" : "DOWN");
	var lignes = [n + ": " + i.nom + ": " + drapeaux + " mtu " + (i.lo ? 65536 : 1500) + " qdisc " + (i.lo ? "noqueue" : "fq_codel") +
		" state " + (tty && !i.up ? C.rouge(etat) : etat) + (avecAdresses ? "" : " mode DEFAULT") + " group default qlen 1000",
		"    link/" + (i.lo ? "loopback " : "ether ") + i.mac + " brd " + (i.lo ? "00:00:00:00:00:00" : "ff:ff:ff:ff:ff:ff")];
	if (avecAdresses){
		i.adresses.forEach(function(a){
			var texte = a.ip + "/" + a.prefixe;
			lignes.push("    inet " + (tty ? C.cyan(texte) : texte) + (i.lo ? "" : " brd " + diffusion(a.ip, a.prefixe)) + " scope " + (i.lo ? "host" : "global") + (a.dhcp ? " dynamic" : "") + " " + i.nom);
		});
		if (i.up && !i.lo) lignes.push("    inet6 fe80::5054:ff:fe" + i.mac.slice(-8).replace(/:/g, "").replace(/^(..)(....)$/, "$1:$2") + "/64 scope link");
	}
	if (stats){
		var paquets = i.up ? 9921 + n * 311 : 0;
		lignes.push("    RX:  bytes packets errors dropped  missed   mcast",
			"    " + completerGauche(paquets * 186, 10) + completerGauche(paquets, 8) + completerGauche(0, 7) + completerGauche(0, 8) + completerGauche(0, 8) + completerGauche(i.up ? 12 : 0, 8),
			"    TX:  bytes packets errors dropped carrier collsns",
			"    " + completerGauche(Math.floor(paquets * 0.21) * 148, 10) + completerGauche(Math.floor(paquets * 0.21), 8) + completerGauche(0, 7) + completerGauche(0, 8) + completerGauche(0, 8) + completerGauche(0, 8));
	}
	return lignes.join("\n");
}

function texteRoutes(h){
	var lignes = [];
	if (h === "poste-b"){
		var p = state.panne;
		p.routes.forEach(function(r){ lignes.push(r.vers + " via " + r.via + " dev eth0 proto " + (r.dhcp ? "dhcp" : "static") + " metric 100"); });
		if (p.lien) p.adresses.forEach(function(a){ lignes.push(reseauDe(a.ip, a.prefixe) + " dev eth0 proto kernel scope link src " + a.ip); });
		return lignes;
	}
	if (h === "routeur"){
		lignes.push("default via " + IP_PAREFEU + " dev eth1 proto static");
		state.panne.routesRouteur.forEach(function(r){ lignes.push(r.vers + " via " + r.via + " dev eth1"); });
		lignes.push("10.0.92.0/24 dev eth1 proto kernel scope link src " + IP_ROUTEUR_COEUR, "10.0.93.0/24 dev eth0 proto kernel scope link src " + IP_ROUTEUR);
		return lignes;
	}
	var ipHote = infoHote(h).ip || "10.0.0.1", prefixe = infoHote(h).prefixe || 24;
	lignes.push("default via " + (h === "intranet" ? IP_ROUTEUR_COEUR : (infoHote(h).passerelle || ipHote.replace(/\.\d+$/, ".254"))) + " dev eth0",
		reseauDe(ipHote, prefixe) + " dev eth0 proto kernel scope link src " + ipHote);
	return lignes;
}

function lireReseauCidr(texte, cmd){
	var m = /^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/.exec(texte || "");
	if (!m || !ipValide(m[1]) || (m[2] !== undefined && +m[2] > 32)) throw new ShellError("Error: any valid prefix is expected rather than \"" + texte + "\".");
	return { ip: m[1], prefixe: m[2] === undefined ? 32 : +m[2] };
}
function valeurApres(mots, cle){
	var i = mots.indexOf(cle);
	return i > -1 ? mots[i + 1] : undefined;
}

Shell.sorts.ip = function(args, io){
	var stats = false, bref = false, mots = [];
	args.forEach(function(a){
		if (a === "-s" || a === "-stats" || a === "-statistics") stats = true;
		else if (a === "-br" || a === "-brief") bref = true;
		else if (a === "-4" || a === "-c" || a === "-color" || a === "-6") return;
		else mots.push(a);
	});
	var objet = mots[0] || "";
	if (/^(a|ad|add|addr|addre|addres|address)$/.test(objet)) objet = "addr";
	else if (/^(l|li|lin|link)$/.test(objet)) objet = "link";
	else if (/^(r|ro|rou|rout|route)$/.test(objet)) objet = "route";
	else if (/^(n|ne|nei|neig|neigh|neighbor|neighbour)$/.test(objet)) objet = "neigh";
	else throw new ShellError("ip : utilisation ici :\n  ip a (ip addr)      les cartes et leurs adresses\n  ip link             les cartes, allumées ou non\n" +
		"  ip r (ip route)     les routes\n  ip neigh            les voisins et leur adresse MAC\n  ip -s link          les compteurs de chaque carte\n  ip -br a            le tout, en bref");
	var action = mots[1] || "show";
	if (["list", "ls", "lst", "sh", "show"].indexOf(action) > -1) action = "show";
	var reste = mots.slice(2);
	var h = Shell.hote();
	GameEvents.fire({ type: "ip", host: h, objet: objet, action: action });
	if (action === "show" || (objet === "route" && action === "get")){
		return afficherIp(objet, action, reste, h, stats, bref, io);
	}
	return modifierIp(objet, action, reste, h, io);
};

function afficherIp(objet, action, reste, h, stats, bref, io){
	var interfaces = interfacesDe(h);
	var filtre = reste.filter(function(m){ return m !== "dev"; })[0];
	if (filtre && (objet === "addr" || objet === "link")){
		if (!interfaces.some(function(i){ return i.nom === filtre; })) throw new ShellError("Device \"" + filtre + "\" does not exist.");
		interfaces = interfaces.filter(function(i){ return i.nom === filtre; });
	}
	if (objet === "addr" || objet === "link"){
		var sortie;
		if (bref){
			sortie = interfaces.map(function(i){
				var etat = i.lo ? "UNKNOWN" : (i.up ? "UP" : "DOWN");
				return completerDroite(i.nom, 17) + completerDroite(etat, 15) + (objet === "addr" ? i.adresses.map(function(a){ return a.ip + "/" + a.prefixe; }).join(" ") : i.mac + " " + (i.lo ? "<LOOPBACK,UP,LOWER_UP>" : (i.up ? "<BROADCAST,MULTICAST,UP,LOWER_UP>" : "<BROADCAST,MULTICAST>")));
			}).join("\n");
		} else {
			var noms = interfacesDe(h).map(function(x){ return x.nom; });
			sortie = interfaces.map(function(i){ return texteInterface(i, noms.indexOf(i.nom) + 1, objet === "addr", stats, io.tty); }).join("\n");
		}
		if (stats && objet === "link" && estHotePanne(h)) GameEvents.fire({ type: "ipStats", host: h });
		if (h === "poste-b" && io.tty && !bref){
			var p = state.panne;
			if (!p.lien) sortie += "\n" + C.gris("(eth0 n'a pas le mot UP entre ses chevrons : la carte est éteinte, la boîte aux lettres est fermée. On l'allume avec sudo ip link set eth0 up.)");
			else if (objet === "addr" && !p.adresses.length) sortie += "\n" + C.gris("(Aucune ligne inet sur eth0 : le poste n'a pas d'adresse.)");
		}
		return sortie;
	}
	if (objet === "route"){
		if (action === "get"){
			var cible = reste[0];
			if (!cible || !ipValide(cible)) throw new ShellError("ip route get : quelle adresse ? Exemple : ip route get 10.0.92.20");
			if (cible === "127.0.0.1") return "local 127.0.0.1 dev lo src 127.0.0.1 uid 1000";
			if (h === "routeur"){
				var dRouteur = routeDuRouteur(cible), cote = dansReseau(cible, "10.0.93.0/24") ? 0 : 1;
				return cible + (dRouteur === "direct" ? "" : " via " + dRouteur) + " dev eth" + cote + " src " + (cote ? IP_ROUTEUR_COEUR : IP_ROUTEUR);
			}
			if (h !== "poste-b") return cible + (dansReseau(cible, "10.0.92.0/24") ? "" : " via " + IP_ROUTEUR_COEUR) + " dev eth0 src " + ipDeHote(h);
			var gw = routeDuPoste(cible);
			if (gw === null) throw new ShellError("RTNETLINK answers: Network is unreachable");
			return cible + (gw === "direct" ? "" : " via " + gw) + " dev eth0 src " + (adressePoste() || (state.panne.adresses[0] || {}).ip) + " uid 1000";
		}
		var lignes = texteRoutes(h);
		if (h === "poste-b" && io.tty){
			if (lignes.length === 0) lignes.push(C.gris("(Aucune route : sans adresse, le poste ne sait aller nulle part.)"));
			else if (!routeParDefautPoste()) lignes.push(C.gris("(Pas de ligne « default » : le poste ne sait pas par où sortir de son propre réseau.)"));
		}
		return lignes.join("\n");
	}
	// ip neigh : la table des voisins (ARP).
	var voisins = voisinsDe(h).map(function(v){ return v.ip + " dev " + v.dev + (v.mac ? " lladdr " + v.mac : "") + " " + v.etat; });
	GameEvents.fire({ type: "ipNeigh", host: h, sortie: voisins.join("\n") });
	if (voisins.length === 0 && io.tty) return C.gris("(Aucun voisin connu : le poste n'a encore parlé à personne sur son réseau. Un ping vers le routeur remplit la table.)");
	return voisins.join("\n") + (h === "poste-b" && io.tty && voisins[0].indexOf("lladdr") > -1 ? "\n" + C.gris("(L'adresse MAC est l'identité matérielle de la carte du routeur. ip neigh montre les voisins avec qui le poste a déjà parlé.)") : "");
}

function modifierIp(objet, action, reste, h, io){
	if (!io.sudo) throw new ShellError("RTNETLINK answers: Operation not permitted\n" + C.gris("(Changer la configuration réseau est réservé à root : sudo ip ...)"));
	if (h !== "poste-b" && !(h === "routeur" && objet === "route")){
		if (h === "routeur") throw new ShellError("ip : sur le routeur, on ne touche qu'aux routes. Éteindre une carte ou changer une adresse couperait tout le bâtiment B, et ta propre connexion.");
		throw new ShellError("ip : pas touche au réseau de " + h + " : ce n'est pas cette machine qui est en panne.\n" +
			C.gris("(Sur un serveur en service, une erreur ici coupe tout le monde, toi compris. Les réglages de la panne se font sur le poste-b et sur le routeur.)"));
	}
	var p = state.panne;
	var dev = valeurApres(reste, "dev");
	if (objet === "link"){
		if (action !== "set") throw new ShellError("ip link : utilisation ici : sudo ip link set eth0 up (ou down)");
		var carte = reste[0] === "dev" ? reste[1] : reste[0];
		if (!carte) throw new ShellError("ip link set : quelle carte ? Exemple : sudo ip link set eth0 up");
		if (carte !== "eth0" && carte !== "lo") throw new ShellError("Cannot find device \"" + carte + "\"");
		var sens = reste.indexOf("up") > -1 ? "up" : (reste.indexOf("down") > -1 ? "down" : null);
		if (!sens) throw new ShellError("ip link set : up ou down ? Exemple : sudo ip link set eth0 up");
		if (carte === "eth0") p.lien = sens === "up";
		GameEvents.fire({ type: "ipLink", up: p.lien });
		return "";
	}
	if (objet === "addr"){
		if (["add", "del", "delete", "flush"].indexOf(action) === -1) throw new ShellError("ip addr : actions ici : add, del, flush. Exemple : sudo ip addr add 10.0.93.20/24 dev eth0");
		if (action === "flush"){
			if ((dev || reste[0]) !== "eth0") throw new ShellError("ip addr flush : de quelle carte ? sudo ip addr flush dev eth0");
			p.adresses = [];
			p.routes = [];
			p.bail = false;
			return "";
		}
		if (dev !== "eth0") throw new ShellError(dev ? "Cannot find device \"" + dev + "\"" : "ip addr " + action + " : sur quelle carte ? Il faut préciser dev eth0. Exemple : sudo ip addr " + action + " 10.0.93.20/24 dev eth0");
		var a = lireReseauCidr(reste[0], "ip addr");
		var existe = p.adresses.filter(function(x){ return x.ip === a.ip; })[0];
		if (action === "add"){
			if (existe) throw new ShellError("RTNETLINK answers: File exists" + C.gris("  (Cette adresse est déjà posée.)"));
			if (a.ip === IP_ROUTEUR) throw new ShellError("ip : " + a.ip + " est l'adresse du routeur : deux machines ne peuvent pas avoir la même adresse (conflit d'adresse IP).");
			p.adresses.push({ ip: a.ip, prefixe: a.prefixe });
			var msg = "";
			if (a.prefixe === 32 && io.tty) msg = C.gris("(Sans /24, l'adresse est posée en /32 : le poste se croit seul sur son réseau, il ne verra même pas le routeur. Retire-la (sudo ip addr del " + a.ip + "/32 dev eth0) et remets-la avec /24.)");
			else if (!dansReseau(a.ip, "10.0.93.0/24") && io.tty) msg = C.gris("(Cette adresse n'est pas dans le réseau du bâtiment B, 10.0.93.0/24 : le routeur ne la verra pas. L'Etiquette du poste donne la bonne.)");
			return msg;
		}
		if (!existe) throw new ShellError("RTNETLINK answers: Cannot assign requested address");
		p.adresses = p.adresses.filter(function(x){ return x !== existe; });
		// Les routes qui passaient par ce réseau disparaissent avec lui, comme sous Linux.
		p.routes = p.routes.filter(function(r){ return reseauxPoste().some(function(n){ return dansReseau(r.via, n); }); });
		return "";
	}
	if (objet === "route"){
		if (["add", "del", "delete", "replace"].indexOf(action) === -1) throw new ShellError("ip route : actions ici : add, del, replace. Exemple : sudo ip route add default via 10.0.93.254");
		var vers = reste[0];
		if (!vers) throw new ShellError("ip route " + action + " : quelle destination ? Exemple : sudo ip route add default via 10.0.93.254");
		if (vers !== "default"){
			var c = lireReseauCidr(vers, "ip route");
			vers = reseauDe(c.ip, c.prefixe);
		}
		var via = valeurApres(reste, "via");
		var liste = h === "routeur" ? p.routesRouteur : p.routes;
		var deja = liste.filter(function(r){ return r.vers === vers; })[0];
		if ((action === "del" || action === "delete") && deja && via && deja.via !== via) deja = null;
		if (action === "del" || action === "delete"){
			if (h === "routeur" && vers === "default") throw new ShellError("ip : la route par défaut du routeur mène au parefeu, et à internet. On n'y touche pas.");
			if (!deja) throw new ShellError("RTNETLINK answers: No such process" + C.gris("  (Il n'y a pas de route vers " + vers + ".)"));
			liste.splice(liste.indexOf(deja), 1);
			return "";
		}
		if (!via || !ipValide(via)) throw new ShellError("ip route " + action + " : par quelle passerelle ? Il faut « via ADRESSE ». Exemple : sudo ip route add default via 10.0.93.254");
		if (h === "routeur" && vers === "default") throw new ShellError("RTNETLINK answers: File exists" + C.gris("  (Le routeur a déjà sa route par défaut, vers le parefeu.)"));
		if (vers !== "default" && (h === "routeur" ? ["10.0.92.0/24", "10.0.93.0/24"] : reseauxPoste()).some(function(n){ return dansReseau(vers.split("/")[0], n) && +vers.split("/")[1] >= +n.split("/")[1]; })){
			throw new ShellError("RTNETLINK answers: File exists" + C.gris("  (Ce réseau est directement branché : il a déjà sa route, sans passerelle.)"));
		}
		var joignable = h === "routeur" ? (dansReseau(via, "10.0.92.0/24") || dansReseau(via, "10.0.93.0/24")) : reseauxPoste().some(function(n){ return dansReseau(via, n); });
		if (!joignable) throw new ShellError("Error: Nexthop has invalid gateway." + (io.tty ? "\n" + C.gris(h === "poste-b" && !p.lien ? "(La carte eth0 est éteinte : le poste ne voit aucun réseau, donc aucune passerelle.)" :
			"(La passerelle doit être dans un réseau que la machine touche directement : ip a montre lesquels.)") : ""));
		if (deja && action === "add") throw new ShellError("RTNETLINK answers: File exists" + C.gris("  (Une route vers " + vers + " existe déjà : sudo ip route replace pour la changer.)"));
		if (deja) liste.splice(liste.indexOf(deja), 1);
		liste.push({ vers: vers, via: via });
		return "";
	}
	throw new ShellError("ip neigh : ici, on ne fait que lire la table des voisins (ip neigh).");
}

/* ------------------------------------------------------------------ */
/* ethtool, hostnamectl, nmcli                                         */
/* ------------------------------------------------------------------ */

Shell.sorts.ethtool = function(args, io){
	var carte = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!carte) throw new ShellError("ethtool : quelle carte ? Utilisation : ethtool eth0");
	var h = Shell.hote(), i = interfacesDe(h).filter(function(x){ return x.nom === carte; })[0];
	if (!i) throw new ShellError("netlink error: no device matches name (offset 24)\nnetlink error: No such device");
	var vivant = i.up;
	GameEvents.fire({ type: "ethtool", host: h, up: vivant });
	if (i.lo) return "Settings for lo:\n\tLink detected: yes";
	return "Settings for " + carte + ":\n\tSupported ports: [ TP ]\n\tSupported link modes:   10baseT/Full 100baseT/Full 1000baseT/Full\n" +
		"\tSpeed: " + (vivant ? "1000Mb/s" : "Unknown!") + "\n\tDuplex: " + (vivant ? "Full" : "Unknown! (255)") + "\n\tAuto-negotiation: on\n\tPort: Twisted Pair\n" +
		"\tLink detected: " + (vivant ? "yes" : (io.tty ? C.rouge("no") : "no")) +
		(!vivant && io.tty ? "\n" + C.gris("(La carte est éteinte (DOWN) : tant qu'elle ne l'est pas, ethtool ne voit rien passer. Le câble, lui, est bien branché : c'est la carte qu'il faut allumer.)") : "");
};

Shell.sorts.hostnamectl = function(args, io){
	var action = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "status";
	if (action === "set-hostname" || action === "hostname"){
		throw new ShellError("hostnamectl : on ne renomme pas une machine de l'école sans prévenir : les autres la connaissent par son nom (DNS, /etc/hosts, certificats...).");
	}
	if (action !== "status") throw new ShellError("hostnamectl : utilisation ici : hostnamectl (ou hostnamectl status)");
	var h = Shell.hote(), info = infoHote(h);
	var chassis = info.chassis || (h === "terminus" ? "desktop" : "server");
	state.panne.hostnamectl = state.panne.hostnamectl || {};
	state.panne.hostnamectl[h] = true;
	GameEvents.fire({ type: "hostnamectl", host: h });
	var id = sha256("machine-id-" + h).substring(0, 32);
	return " Static hostname: " + h + "\n       Icon name: computer-" + chassis + "\n         Chassis: " + chassis + "\n      Machine ID: " + id + "\n" +
		"         Boot ID: " + sha256("boot-" + h + "-" + (state.panne.demarrages || 0)).substring(0, 32) + "\n" +
		(chassis === "vm" ? "  Virtualization: kvm\n" : "") +
		"Operating System: Debian GNU/Linux 12 (bookworm)\n          Kernel: Linux " + (info.noyau || "6.1.0-cybersup") + "\n    Architecture: " + (/arm64/.test(info.noyau || "") ? "arm64" : "x86-64");
};

Shell.sorts.nmcli = function(args, io){
	var h = Shell.hote();
	if (h !== "poste-b") throw new ShellError("Error: NetworkManager is not running.\n" + C.gris("(Sur les serveurs, pas de NetworkManager : leur réseau est réglé une fois pour toutes. nmcli sert sur les postes de travail, comme celui du bâtiment B.)"));
	var p = state.panne, mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var objet = mots[0] || "";
	var etat = !p.lien ? "indisponible" : (adressePoste() ? "connecté" : "déconnecté");
	GameEvents.fire({ type: "nmcli", objet: objet });
	if (/^(d|de|dev|devi|devic|device)$/.test(objet)){
		return "DEVICE  TYPE      ÉTAT                      CONNEXION\n" +
			"eth0    ethernet  " + completerDroite(etat, 26) + (p.lien && adressePoste() ? "netplan-eth0" : "--") + "\n" +
			"lo      loopback  connecté (en externe)     lo";
	}
	if (/^(c|co|con|conn|connection)$/.test(objet)){
		return "NAME          UUID                                  TYPE      DEVICE\nnetplan-eth0  " + sha256("netplan-eth0").substring(0, 8) + "-14b2-3f1a-9c51-" + sha256("nm").substring(0, 12) + "  ethernet  " + (p.lien ? "eth0" : "--");
	}
	if (/^(g|ge|gen|general)$/.test(objet)){
		return "STATE      CONNECTIVITY  WIFI-HW  WIFI     WWAN-HW  WWAN\n" + completerDroite(etat === "connecté" ? "connecté" : "déconnecté", 11) + completerDroite(reseauPosteOK() ? "complète" : (adressePoste() ? "limitée" : "aucune"), 14) + "absent   absent   absent   absent";
	}
	if (objet !== "") throw new ShellError("nmcli : objet « " + objet + " » inconnu ici. Essaie : nmcli device status, nmcli connection show, nmcli general");
	var lignes = ["eth0: " + etat + (p.lien && adressePoste() ? " à netplan-eth0" : ""),
		"        ethernet (e1000e), " + MAC_POSTE.toUpperCase() + ", hw, mtu 1500"];
	p.adresses.forEach(function(a){ lignes.push("        inet4 " + a.ip + "/" + a.prefixe); });
	p.routes.forEach(function(r){ lignes.push("        route4 " + r.vers + " via " + r.via); });
	lignes.push("", "lo: connecté (en externe) à lo", "        loopback (unknown), 00:00:00:00:00:00, sw, mtu 65536", "",
		"DNS configuration:", "        servers: " + (dnsEffectif("poste-b") || "(aucun)"), "        domains: cybersup.lan", "",
		"Use \"nmcli device show\" to get complete information about known devices.");
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* dhclient, netplan, reboot                                           */
/* ------------------------------------------------------------------ */

Shell.sorts.dhclient = function(args, io){
	var h = Shell.hote();
	if (h !== "poste-b") throw new ShellError("dhclient : " + h + " a une adresse fixe, écrite dans sa configuration : pas de DHCP ici.\n" + C.gris("(Le DHCP sert aux postes de travail, comme celui du bâtiment B.)"));
	exigerSudo(io, "dhclient", "dhclient : Permission denied (il faut être root pour configurer une carte réseau)");
	var rendre = args.indexOf("-r") > -1, bavard = args.indexOf("-v") > -1;
	var carte = args.filter(function(a){ return a.charAt(0) !== "-"; })[0] || "eth0";
	if (carte !== "eth0") throw new ShellError("Cannot find device \"" + carte + "\"");
	var p = state.panne;
	if (rendre){
		var avait = p.bail;
		rendreBail();
		if (avait) p.bailRendu = true;
		GameEvents.fire({ type: "dhclient", rendu: true });
		if (!avait) return io.tty ? C.gris("(Il n'y avait aucun bail DHCP à rendre : l'adresse actuelle, s'il y en a une, a été posée à la main.)") : "";
		return bavard || io.tty ? "Killed old client process\nDHCPRELEASE of " + IP_POSTE + " on eth0 to " + IP_ROUTEUR + " port 67" : "";
	}
	var lignes = ["Internet Systems Consortium DHCP Client 4.4.3-P1", "Listening on LPF/eth0/" + MAC_POSTE, "Sending on   LPF/eth0/" + MAC_POSTE];
	if (!p.lien){
		lignes.push("DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 3", "send_packet: Network is down", "No DHCPOFFERS received.");
		GameEvents.fire({ type: "dhclient", ok: false });
		return lignes.join("\n") + (io.tty ? "\n" + C.gris("(La carte eth0 est éteinte : la demande ne part même pas. Commence par le lien.)") : "");
	}
	lignes.push("DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 3", "DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 7");
	if (!obtenirBail()){
		lignes.push("DHCPDISCOVER on eth0 to 255.255.255.255 port 67 interval 12", "No DHCPOFFERS received.", "No working leases in persistent database - sleeping.");
		GameEvents.fire({ type: "dhclient", ok: false });
		return lignes.join("\n") + (io.tty ? "\n" + C.gris("(Personne n'a répondu : le serveur DHCP du bâtiment est muet. En attendant, on peut poser l'adresse à la main : l'Etiquette du poste la donne.)") : "");
	}
	lignes.push("DHCPOFFER of " + IP_POSTE + " from " + IP_ROUTEUR, "DHCPREQUEST for " + IP_POSTE + " on eth0 to 255.255.255.255 port 67",
		"DHCPACK of " + IP_POSTE + " from " + IP_ROUTEUR, "bound to " + IP_POSTE + " -- renewal in 1800 seconds.");
	if (p.bailRendu){ p.bailRendu = false; quetePanne("s_r_bail"); }
	GameEvents.fire({ type: "dhclient", ok: true });
	return lignes.join("\n") + (io.tty ? "\n" + C.gris("(Le DHCP a tout donné d'un coup : l'adresse, la passerelle et le serveur DNS.)") : "");
};

Shell.sorts.netplan = function(args, io){
	var h = Shell.hote();
	if (h !== "poste-b") throw new ShellError("netplan : la configuration de " + h + " n'est pas gérée par netplan ici.\n" + C.gris("(Celle du poste de l'accueil, si : /etc/netplan/01-poste.yaml, sur le poste-b.)"));
	var action = args[0];
	if (action === "get"){
		var cle = args[1];
		if (!cle) return NetplanPoste.getText().replace(/^#.*\n/gm, "").replace(/\n$/, "");
		var conf = confNetplan();
		if (conf.erreur) throw new ShellError(conf.erreur);
		if (cle === "ethernets.eth0.dhcp4") return String(conf.dhcp4);
		return C.gris("(netplan get " + cle + " : ici, seules netplan get et netplan get ethernets.eth0.dhcp4 sont prises en charge.)");
	}
	if (action === "set"){
		exigerSudo(io, "netplan", "netplan set : Permission denied");
		var m = /^ethernets\.eth0\.dhcp4=(true|false)$/.exec(args[1] || "");
		if (!m) throw new ShellError("netplan set : ici, seule la clé ethernets.eth0.dhcp4 se règle ainsi (exemple : sudo netplan set ethernets.eth0.dhcp4=true).\n" +
			C.gris("Pour le reste, on modifie le fichier : sudo nano /etc/netplan/01-poste.yaml"));
		var texte = NetplanPoste.getText();
		if (/^(\s+)dhcp4:\s*\S+/m.test(texte)) texte = texte.replace(/^(\s+)dhcp4:\s*\S+/m, "$1dhcp4: " + m[1]);
		else texte = texte.replace(/^(\s*)eth0:\s*$/m, function(tout, indent){ return tout + "\n" + indent + "  dhcp4: " + m[1]; });
		NetplanPoste.setText(texte);
		GameEvents.fire({ type: "netplan", action: "set" });
		return "";
	}
	if (action === "apply" || action === "try"){
		exigerSudo(io, "netplan", "netplan apply : Permission denied");
		var resultat = appliquerNetplan();
		if (resultat.erreur) throw new ShellError(resultat.erreur);
		GameEvents.fire({ type: "netplan", action: "apply" });
		var lignes = action === "try" ? ["Do you want to keep these settings?", "", "Press ENTER before the timeout to accept the new configuration", "", "Configuration accepted."] : [];
		if (io.tty){
			if (resultat.dhcp4 && !resultat.bail) lignes.push(C.gris("(Configuration appliquée, en DHCP... mais personne ne répond : le serveur DHCP du routeur est toujours arrêté. Le poste n'a plus d'adresse.)"));
			else if (resultat.dhcp4) lignes.push(C.gris("(Configuration appliquée : le poste a demandé son adresse au DHCP et l'a obtenue. Elle reviendra toute seule à chaque démarrage.)"));
			else if (!resultat.adresses.length) lignes.push(C.gris("(Configuration appliquée : ni DHCP ni adresse fixe. Le poste n'a plus d'adresse du tout : c'est ce que dit le fichier.)"));
			else if (reseauPosteOK()) lignes.push(C.gris("(Configuration fixe appliquée : adresse, passerelle et DNS viennent du fichier. Elle reviendra à chaque démarrage.)"));
			else lignes.push(C.gris("(Configuration appliquée, mais il manque quelque chose : ip a, ip r et resolvectl status disent quoi.)"));
		}
		return lignes.join("\n");
	}
	if (action === "generate") return "";
	throw new ShellError("netplan : utilisation ici :\n  netplan get                                  lire la configuration\n" +
		"  sudo netplan set ethernets.eth0.dhcp4=true   la modifier\n  sudo netplan apply                           l'appliquer\n  sudo netplan try                             l'appliquer en demandant confirmation");
};

Shell.sorts.reboot = function(args, io){
	var h = Shell.hote();
	if (h !== "poste-b") throw new ShellError("reboot : pas question de redémarrer " + h + " en pleine journée : tout le monde en dépend.\n" + C.gris("(Le poste de l'accueil, en revanche, ne manquera à personne pendant une minute.)"));
	exigerSudo(io, "reboot", "Failed to set wall message, ignoring: Interactive authentication required.\nCall to Reboot failed: Interactive authentication required.");
	var p = state.panne;
	p.demarrages = (p.demarrages || 0) + 1;
	p.bootMs = state.tempsMs || 0;
	// Au démarrage, les services activés démarrent, les autres non ; la configuration réseau vient de netplan.
	Object.keys(HOTES["poste-b"].services).forEach(function(n){ var s = HOTES["poste-b"].services[n]; if (s.auto) demarrerService("poste-b", n); else if (s.actif) arreterService("poste-b", n); });
	var conf = appliquerNetplan();
	var lignes = ["Broadcast message from root@poste-b on pts/0 (" + formaterDate(dateDuPoste(), ["+%a %F %T"]) + "):", "", "The system will reboot now!", "",
		"[  OK  ] Stopped target network.target - Network.", "[  OK  ] Reached target reboot.target - System Reboot.", "...", "",
		"Debian GNU/Linux 12 poste-b tty1", "",
		"[  OK  ] Started NetworkManager.service - Network Manager.",
		(conf.erreur ? "[FAILED] Failed to start netplan-generate.service: " + conf.erreur : "[  OK  ] Finished netplan-generate.service."),
		(servicePanne("poste-b", "systemd-timesyncd").actif ? "[  OK  ] Started systemd-timesyncd.service - Network Time Synchronization." : "         systemd-timesyncd.service est désactivé : il ne démarre pas."),
		"[  OK  ] Reached target network-online.target - Network is Online.", ""];
	var ok = reseauPosteOK();
	if (io.tty) lignes.push(ok ? C.vert("Le poste a redémarré et retrouvé son réseau tout seul : adresse, passerelle, DNS.") :
		C.jaune("Le poste a redémarré... et il a oublié tout ce qui n'était pas écrit dans sa configuration. ip a, ip r : vérifie."));
	if (ok && p.netplanOK) quetePanne("s_r_reboot");
	GameEvents.fire({ type: "reboot", ok: ok });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Les noms : dig, host, nslookup, resolvectl                          */
/* ------------------------------------------------------------------ */

/* Une question au DNS, posée depuis la machine courante : { serveur, reponses, statut } ou { erreur, serveur }. */
function questionDns(nom, type, serveurForce){
	var ici = Shell.hote();
	var serveur = serveurForce || dnsEffectif(ici);
	if (surPanne()){
		if (!serveur || !dnsRepond(ici, serveur)) return { erreur: "delai", serveur: serveur || "127.0.0.53" };
	} else if (serveur !== IP_DNS){
		return { erreur: "delai", serveur: serveur };
	}
	var reponses = [];
	if (type === "PTR"){
		var nomOfficiel = zoneDns().filter(function(r){ return r.type === "A" && r.valeur === nom; })[0];
		if (nomOfficiel) reponses.push({ q: nom.split(".").reverse().join(".") + ".in-addr.arpa.", type: "PTR", v: (nomOfficiel.nom === "@" ? "" : nomOfficiel.nom + ".") + "cybersup.lan." });
	} else {
		var court = nomCourt(nom);
		var fqdn = (court === "cybersup.lan" || court === "@" ? "" : court + ".") + "cybersup.lan.";
		var types = type === "ANY" ? ["A", "MX"] : [type];
		types.forEach(function(t){
			if (t === "NS"){ if (court === "cybersup.lan") reponses.push({ q: fqdn, type: "NS", v: "dns.cybersup.lan." }); return; }
			chercherZone(court, t).forEach(function(v){ reponses.push({ q: fqdn, type: t, v: v }); });
		});
	}
	var existe = reponses.length > 0 || (type !== "PTR" && (chercherZone(nomCourt(nom), "A").length > 0 || nomCourt(nom) === "cybersup.lan"));
	if (reponses.some(function(r){ return r.type === "MX"; }) && state.has("panneOuverte")) quetePanne("s_r_mx");
	return { serveur: serveur, reponses: reponses, statut: existe ? "NOERROR" : "NXDOMAIN" };
}

var TYPES_DNS = ["A", "AAAA", "MX", "NS", "TXT", "ANY", "PTR", "CNAME"];

Shell.sorts.dig = function(args, io){
	if (!surPanne()) return AVANT_PANNE.dig(args, io);
	var court = false, serveur = null, type = null, nom = null, inverse = false, simples = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "+short") court = true;
		else if (a.charAt(0) === "+") continue;
		else if (a.charAt(0) === "@") serveur = a.substring(1);
		else if (a === "-x"){ inverse = true; nom = args[++i]; type = "PTR"; }
		else if (a === "-t") type = (args[++i] || "A").toUpperCase();
		else if (a.charAt(0) === "-") throw new ShellError("dig : option « " + a + " » inconnue ici. Exemples : dig intranet, dig @10.0.92.53 intranet, dig MX cybersup.lan, dig -x 10.0.92.20");
		else simples.push(a);
	}
	simples.forEach(function(a){
		if (TYPES_DNS.indexOf(a.toUpperCase()) > -1 && simples.length > 1 && type === null) type = a.toUpperCase();
		else if (nom === null) nom = a;
	});
	type = type || "A";
	if (!nom) throw new ShellError("dig : quel nom chercher ? Exemples : dig intranet, dig @10.0.92.53 intranet, dig MX cybersup.lan");
	if (serveur && !ipValide(serveur)){
		var rs = resoudreDepuis(Shell.hote(), serveur);
		if (rs.erreur) throw new ShellError("dig: couldn't get address for '" + serveur + "': not found");
		serveur = rs.ip;
	}
	var q = questionDns(nom, type, serveur);
	GameEvents.fire({ type: "dnsPanne", outil: "dig", ok: !q.erreur && q.reponses.length > 0, serveurForce: !!serveur, serveur: q.serveur });
	if (q.erreur){
		var erreurs = [];
		for (var e = 0; e < 3; e++) erreurs.push(";; communications error to " + q.serveur + "#53: timed out");
		return erreurs.join("\n") + "\n\n; <<>> DiG 9.18.28 <<>> " + args.join(" ") + "\n;; global options: +cmd\n;; no servers could be reached" +
			(io.tty ? "\n" + C.gris("(Le serveur " + q.serveur + " ne répond pas. dig @" + IP_DNS + " " + nom + " interroge directement celui de l'école.)") : "");
	}
	if (court) return q.reponses.map(function(r){ return r.v; }).join("\n");
	var question = inverse ? nom.split(".").reverse().join(".") + ".in-addr.arpa." : (nomCourt(nom) === "cybersup.lan" ? "cybersup.lan." : nomCourt(nom) + ".cybersup.lan.");
	return "; <<>> DiG 9.18.28 <<>> " + args.join(" ") + "\n;; global options: +cmd\n;; Got answer:\n" +
		";; ->>HEADER<<- opcode: QUERY, status: " + q.statut + ", id: " + (1000 + (nom.length * 977) % 9000) + "\n;; flags: qr aa rd ra; QUERY: 1, ANSWER: " + q.reponses.length + "\n\n" +
		";; QUESTION SECTION:\n;" + completerDroite(question, 31) + "IN\t" + type + "\n\n" +
		(q.reponses.length ? ";; ANSWER SECTION:\n" + q.reponses.map(function(r){ return completerDroite(r.q, 32) + "300\tIN\t" + r.type + "\t" + r.v; }).join("\n") + "\n\n" : "") +
		";; Query time: 1 msec\n;; SERVER: " + q.serveur + "#53(" + q.serveur + ") (UDP)";
};

Shell.sorts.host = function(args, io){
	var type = null, mots = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-t") type = (args[++i] || "A").toUpperCase();
		else if (args[i].charAt(0) === "-") throw new ShellError("host : option « " + args[i] + " » inconnue ici. Exemples : host intranet, host -t MX cybersup.lan, host 10.0.92.20");
		else mots.push(args[i]);
	}
	var nom = mots[0];
	if (!nom) throw new ShellError("host : quel nom ? Utilisation : host NOM (ou host ADRESSE pour la recherche inverse)");
	var inverse = ipValide(nom);
	var q = questionDns(nom, inverse ? "PTR" : (type || "A"), mots[1] && ipValide(mots[1]) ? mots[1] : null);
	var lignes = [];
	if (q.erreur){
		GameEvents.fire({ type: "dnsPanne", outil: "host", ok: false });
		return ";; connection timed out; no servers could be reached";
	}
	if (mots[1]) lignes.push("Using domain server:", "Name: " + q.serveur, "Address: " + q.serveur + "#53", "Aliases: ", "");
	if (inverse){
		if (q.reponses.length) lignes.push(nom.split(".").reverse().join(".") + ".in-addr.arpa domain name pointer " + q.reponses[0].v);
		else lignes.push("Host " + nom.split(".").reverse().join(".") + ".in-addr.arpa. not found: 3(NXDOMAIN)");
	} else {
		var fqdn = nomCourt(nom) === "cybersup.lan" ? "cybersup.lan" : nomCourt(nom) + ".cybersup.lan";
		var reponses = q.reponses.slice();
		if (!type){
			var mx = questionDns(nom, "MX", q.serveur === IP_DNS ? null : q.serveur);
			if (!mx.erreur) reponses = reponses.concat(mx.reponses);
		}
		reponses.forEach(function(r){ lignes.push(r.type === "MX" ? fqdn + " mail is handled by " + r.v : fqdn + " has address " + r.v); });
		if (q.statut === "NXDOMAIN") lignes.push("Host " + fqdn + " not found: 3(NXDOMAIN)");
		else if (!reponses.length) lignes.push(fqdn + " has no " + (type || "A") + " record");
	}
	GameEvents.fire({ type: "dnsPanne", outil: "host", ok: q.reponses.length > 0 });
	return lignes.join("\n");
};

Shell.sorts.nslookup = function(args, io){
	var type = "A", mots = [];
	args.forEach(function(a){
		var m = /^-(?:type|query|q)=(\w+)$/i.exec(a);
		if (m) type = m[1].toUpperCase();
		else if (a.charAt(0) === "-") throw new ShellError("nslookup : option « " + a + " » inconnue ici. Exemples : nslookup intranet, nslookup intranet 10.0.92.53, nslookup -type=MX cybersup.lan");
		else mots.push(a);
	});
	var nom = mots[0];
	if (!nom) throw new ShellError("nslookup : le mode interactif n'existe pas ici. Utilisation : nslookup NOM [SERVEUR]");
	var inverse = ipValide(nom);
	var q = questionDns(nom, inverse ? "PTR" : type, mots[1] && ipValide(mots[1]) ? mots[1] : null);
	if (q.erreur){
		GameEvents.fire({ type: "dnsPanne", outil: "nslookup", ok: false });
		return ";; connection timed out; no servers could be reached";
	}
	var lignes = ["Server:\t\t" + q.serveur, "Address:\t" + q.serveur + "#53", ""];
	var fqdn = nomCourt(nom) === "cybersup.lan" ? "cybersup.lan" : nomCourt(nom) + ".cybersup.lan";
	if (!q.reponses.length) lignes.push("** server can't find " + (inverse ? nom.split(".").reverse().join(".") + ".in-addr.arpa" : fqdn) + ": " + (q.statut === "NXDOMAIN" ? "NXDOMAIN" : "No answer"));
	q.reponses.forEach(function(r){
		if (r.type === "A") lignes.push("Name:\t" + fqdn, "Address: " + r.v);
		else if (r.type === "MX") lignes.push(fqdn + "\tmail exchanger = " + r.v);
		else if (r.type === "PTR") lignes.push(r.q.replace(/\.$/, "") + "\tname = " + r.v);
		else lignes.push(fqdn + "\t" + r.type + " = " + r.v);
	});
	GameEvents.fire({ type: "dnsPanne", outil: "nslookup", ok: q.reponses.length > 0 });
	return lignes.join("\n");
};

Shell.sorts.resolvectl = function(args, io){
	var h = Shell.hote(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0] || "status";
	var surPoste = h === "poste-b", p = state.panne;
	var lienDns = surPoste ? (p.dnsRuntime || "") : IP_DNS;
	var global = surPoste ? (dnsDuFichier() || "") : IP_DNS;
	if (action === "status"){
		GameEvents.fire({ type: "resolvectl", action: "status", host: h });
		var courantGlobal = !lienDns;
		return "Global\n         Protocols: +LLMNR +mDNS -DNSOverTLS DNSSEC=no/unsupported\n  resolv.conf mode: foreign\n" +
			(courantGlobal ? "Current DNS Server: " + (dnsEffectif(h) || "") + "\n" : "") + "       DNS Servers: " + global + "\n        DNS Domain: cybersup.lan\n\n" +
			"Link 2 (eth0)\n    Current Scopes: " + (surPoste && !p.lien ? "none" : "DNS") + "\n         Protocols: +DefaultRoute -LLMNR -mDNS -DNSOverTLS\n" +
			(courantGlobal ? "" : "Current DNS Server: " + (dnsEffectif(h) || "") + "\n       DNS Servers: " + lienDns + "\n        DNS Domain: cybersup.lan") +
			(surPoste && io.tty ? "\n" + C.gris("(Le poste interroge le serveur de « Current DNS Server ». Ceux de Link 2 viennent de resolvectl ou du DHCP et passent devant ceux de /etc/resolv.conf.)") : "");
	}
	if (action === "dns"){
		if (mots.length <= 2){
			if (mots[1] && mots[1] !== "eth0") throw new ShellError("Failed to resolve interface \"" + mots[1] + "\": No such device");
			return mots[1] ? "Link 2 (eth0): " + lienDns : "Global: " + global + "\nLink 2 (eth0): " + lienDns;
		}
		if (mots[1] !== "eth0") throw new ShellError("Failed to resolve interface \"" + mots[1] + "\": No such device");
		if (!surPoste) throw new ShellError("resolvectl : pas touche au DNS de " + h + " : ce n'est pas lui qui est en panne.");
		if (!io.sudo) throw new ShellError("Failed to set DNS configuration: Access denied\n" + C.gris("(sudo resolvectl dns eth0 ADRESSE)"));
		if (!ipValide(mots[2])) throw new ShellError("Failed to parse DNS server address: " + mots[2]);
		p.dnsRuntime = mots[2];
		GameEvents.fire({ type: "resolvectl", action: "dns" });
		return "";
	}
	if (action === "query"){
		var nom = mots[1];
		if (!nom) throw new ShellError("resolvectl query : quel nom ? Exemple : resolvectl query intranet");
		var r = resoudreDepuis(h, nom);
		GameEvents.fire({ type: "dnsPanne", outil: "resolvectl", ok: !r.erreur });
		if (r.erreur === "temp") throw new ShellError(nom + ": resolve call failed: All attempts to contact name servers or networks failed");
		if (r.erreur) throw new ShellError(nom + ": resolve call failed: '" + nomCourt(nom) + ".cybersup.lan' not found");
		return nomCourt(nom) + ".cybersup.lan: " + r.ip + "  -- link: eth0\n\n-- Information acquired via protocol DNS in 1.2ms.\n-- Data is authenticated: no";
	}
	if (action === "flush-caches") return "";
	throw new ShellError("resolvectl : utilisation ici : resolvectl status, resolvectl dns [eth0 ADRESSE], resolvectl query NOM, resolvectl flush-caches");
};

/* ------------------------------------------------------------------ */
/* Le chemin des paquets : traceroute, mtr                             */
/* ------------------------------------------------------------------ */

function tempsDeSaut(i, sel){ return (0.3 + i * 0.4 + (sel.length % 7) / 10).toFixed(3); }

Shell.sorts.traceroute = function(args, io){
	if (!surPanne()) return AVANT_PANNE.traceroute(args, io);
	var numerique = args.indexOf("-n") > -1;
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("traceroute : vers quelle machine ? Utilisation : traceroute MACHINE (-n : sans les noms)");
	var ici = Shell.hote();
	var r = resoudreDepuis(ici, cible);
	if (r.erreur) throw new ShellError(cible + " : " + (r.erreur === "temp" ? "Échec temporaire dans la résolution du nom" : "Nom ou service inconnu") + "\nCannot handle \"host\" cmdline arg `" + cible + "' on position 1 (argc 1)");
	var t = cheminVers(ici, r.ip);
	if (t.erreur === "reseau") throw new ShellError("connect : Network is unreachable");
	var lignes = ["traceroute to " + cible + " (" + r.ip + "), 30 hops max, 60 byte packets"];
	t.sauts.forEach(function(s, i){
		var tps = tempsDeSaut(i, s[1]);
		lignes.push(completerGauche(i + 1, 2) + "  " + (numerique ? s[1] : s[0] + (s[0].indexOf(".") > -1 ? "" : ".cybersup.lan") + " (" + s[1] + ")") + "  " + tps + " ms  " + tps + " ms  " + tps + " ms");
	});
	if (!t.ok){
		if (t.erreur === "hote") lignes.push(completerGauche(t.sauts.length + 1, 2) + "  " + (adressePoste() || ipDeHote(ici)) + "  3000.112 ms !H  3000.098 ms !H  3000.101 ms !H");
		else {
			for (var k = 1; k <= 3; k++) lignes.push(completerGauche(t.sauts.length + k, 2) + "  * * *");
			if (io.tty) lignes.push(C.gris("(... et ainsi de suite jusqu'au 30e saut : au-delà de " + (t.sauts.length ? t.sauts[t.sauts.length - 1][0] : "ce poste") + ", plus personne ne répond.)"));
		}
	}
	GameEvents.fire({ type: "traceroutePanne", numerique: numerique, sauts: t.sauts.length, ok: t.ok, cible: r.ip });
	return lignes.join("\n");
};

Shell.sorts.mtr = function(args, io){
	var cycles = 10, numerique = false, mots = [];
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-c"){ cycles = parseInt(args[++i], 10) || 10; }
		else if (args[i] === "-n" || args[i] === "--no-dns") numerique = true;
		else if (/^-(r|w|-report|-report-wide|rw|wr|nr|rn)$/.test(args[i])) { if (/n/.test(args[i].replace("-report", ""))) numerique = true; }
		else if (args[i].charAt(0) === "-") throw new ShellError("mtr : option « " + args[i] + " » inconnue ici. Exemple : mtr --report lille");
		else mots.push(args[i]);
	}
	var cible = mots[0];
	if (!cible) throw new ShellError("mtr : vers quelle machine ? Utilisation : mtr --report MACHINE");
	var ici = Shell.hote(), sauts, ok = true;
	if (surPanne()){
		var r = resoudreDepuis(ici, cible);
		if (r.erreur) throw new ShellError("mtr: Failed to resolve host: " + cible + ": " + (r.erreur === "temp" ? "Temporary failure in name resolution" : "Name or service not known"));
		var t = cheminVers(ici, r.ip);
		if (t.erreur === "reseau") throw new ShellError("mtr: Network is unreachable");
		sauts = t.sauts.slice();
		ok = t.ok;
	} else {
		var h = hoteDepuisCible(cible);
		if (!h) throw new ShellError("mtr: Failed to resolve host: " + cible + ": Name or service not known");
		sauts = [[h, HOTES[h].ip]];
	}
	var lignes = ["Start: " + dateDuJour() + "T" + Shell.sorts.date(["+%T"], io) + "+0200",
		"HOST: " + completerDroite(ici, 28) + "Loss%   Snt   Last   Avg  Best  Wrst StDev"];
	sauts.forEach(function(s, i){
		var tps = (+tempsDeSaut(i, s[1])).toFixed(1);
		lignes.push(completerGauche(i + 1, 3) + ".|-- " + completerDroite(numerique ? s[1] : s[0], 26) + completerGauche("0.0%", 6) + completerGauche(cycles, 6) +
			completerGauche(tps, 7) + completerGauche(tps, 6) + completerGauche((tps * 0.9).toFixed(1), 6) + completerGauche((tps * 1.3).toFixed(1), 6) + completerGauche("0.1", 6));
	});
	if (!ok) lignes.push(completerGauche(sauts.length + 1, 3) + ".|-- " + completerDroite("???", 26) + completerGauche("100.0", 6) + completerGauche(cycles, 6) + "    0.0   0.0   0.0   0.0   0.0");
	if (io.tty && args.indexOf("--report") === -1 && args.indexOf("-r") === -1 && args.indexOf("-rw") === -1 && args.indexOf("-w") === -1) lignes.push(C.gris("(mtr est d'ordinaire un tableau qui se met à jour en direct ; ici, on affiche directement son rapport, comme mtr --report.)"));
	GameEvents.fire({ type: "mtr", ok: ok, panne: surPanne() });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Les ports : nc, telnet, ss                                          */
/* ------------------------------------------------------------------ */

/* Ouvrir une connexion vers un port, depuis la machine courante. */
function connexionTcp(cible, port, cmd){
	var ici = Shell.hote();
	if (surPanne()){
		var r = resoudreDepuis(ici, cible);
		if (r.erreur) return { erreurNom: r.erreur };
		var t = cheminVers(ici, r.ip, { proto: "tcp", port: String(port), compter: true });
		return { ip: r.ip, ok: t.ok, erreur: t.erreur, nom: t.nom || nomDeIp(r.ip) };
	}
	var h = hoteDepuisCible(cible);
	if (!h) return { erreurNom: "inconnu" };
	if (estHotePanne(h)) return { ip: HOTES[h].ip, ok: false, erreur: "delai", nom: h };
	var ouvert = portOuvert(h, "tcp", String(port));
	return { ip: HOTES[h].ip, ok: ouvert, erreur: ouvert ? null : "refus", nom: h };
}
function banniereDe(nom, port){
	var p = ((HOTES[nom] || {}).ports || {})[port];
	if (!p) return "";
	return typeof p.banniere === "function" ? p.banniere() : (p.banniere || "");
}

Shell.sorts.nc = function(args, io){
	if (!surPanne()) return AVANT_PANNE.nc(args, io);
	var scan = false, bavard = false, mots = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-w"){ i++; continue; }
		if (a.charAt(0) === "-"){
			if (/^-[zvnw0-9]+$/.test(a)){ if (a.indexOf("z") > -1) scan = true; if (a.indexOf("v") > -1) bavard = true; continue; }
			throw new ShellError("nc : option « " + a + " » inconnue ici. Exemples : nc mail 25, nc -zv mail 25");
		}
		mots.push(a);
	}
	if (mots.length < 2) throw new ShellError("nc : utilisation : nc MACHINE PORT (par exemple nc mail 25), ou nc -zv MACHINE PORT pour tester seulement");
	var c = connexionTcp(mots[0], mots[1], "nc");
	if (c.erreurNom) throw new ShellError("nc: getaddrinfo for host \"" + mots[0] + "\" port " + mots[1] + ": " + (c.erreurNom === "temp" ? "Temporary failure in name resolution" : "Name or service not known"));
	GameEvents.fire({ type: "ncPanne", host: c.nom, port: mots[1], ok: c.ok, scan: scan });
	if (!c.ok){
		var detail = c.erreur === "delai" ? "timed out: Operation now in progress" : "failed: " + ERREURS_TCP[c.erreur];
		throw new ShellError("nc: connect to " + mots[0] + " port " + mots[1] + " (tcp) " + detail + (io.tty && c.erreur === "delai" ?
			"\n" + C.gris("(Timed out : personne n'a répondu, pas même pour refuser. Un port fermé répond « refused » ; un silence total, c'est un pare-feu qui jette les paquets.)") : ""));
	}
	var service = NOMS_DE_PORTS[mots[1]] || "*";
	if (scan) return "Connection to " + mots[0] + " (" + c.ip + ") " + mots[1] + " port [tcp/" + service + "] succeeded!";
	return (bavard ? "Connection to " + mots[0] + " (" + c.ip + ") " + mots[1] + " port [tcp/" + service + "] succeeded!\n" : "") + banniereDe(c.nom, mots[1]) +
		(io.tty ? "\n" + C.gris("(La connexion se referme. Une bannière comme celle-ci dit souvent quel logiciel tourne, et dans quelle version.)") : "");
};

Shell.sorts.telnet = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (!mots.length) throw new ShellError("telnet : utilisation : telnet MACHINE [PORT] (par exemple telnet mail 25)");
	var port = mots[1] || "23";
	var c = connexionTcp(mots[0], port, "telnet");
	if (c.erreurNom) throw new ShellError("telnet: could not resolve " + mots[0] + "/" + port + ": " + (c.erreurNom === "temp" ? "Temporary failure in name resolution" : "Name or service not known"));
	var lignes = ["Trying " + c.ip + "..."];
	GameEvents.fire({ type: "telnetPanne", host: c.nom, port: port, ok: c.ok, panne: surPanne() });
	if (!c.ok) throw new ShellError(lignes[0] + "\ntelnet: Unable to connect to remote host: " + ERREURS_TCP[c.erreur]);
	lignes.push("Connected to " + mots[0] + ".", "Escape character is '^]'.", banniereDe(c.nom, port));
	if (port === "23" && io.tty) lignes.push(C.gris("(Tu n'as pas de compte ici, et c'est tant mieux : ce que tu taperais traverserait le réseau en clair, mot de passe compris.)"));
	lignes.push("Connection closed by foreign host.");
	return lignes.join("\n");
};

/* Les sockets d'une machine de la panne. */
function socketsDe(h){
	var s = [];
	function ajouter(proto, etat, local, pair, proc, pid){ s.push({ proto: proto, etat: etat, local: local, pair: pair, proc: proc, pid: pid }); }
	function pidDe(nomService){ var x = HOTES[h].services[nomService]; return x ? x.pid : 1; }
	if (h === "routeur"){
		ajouter("tcp", "LISTEN", "0.0.0.0:22", "0.0.0.0:*", "sshd", pidDe("sshd"));
		if (telnetActif()) ajouter("tcp", "LISTEN", "0.0.0.0:23", "0.0.0.0:*", "systemd", 1);
		if (dhcpActif()) ajouter("udp", "UNCONN", "0.0.0.0:67", "0.0.0.0:*", "dhcpd", pidDe("isc-dhcp-server"));
		if (Shell.pile_ssh.length) ajouter("tcp", "ESTAB", IP_ROUTEUR + ":22", (adressePoste() || IP_POSTE) + ":51744", "sshd", pidDe("sshd"));
	} else if (h === "intranet"){
		ajouter("tcp", "LISTEN", "0.0.0.0:22", "0.0.0.0:*", "sshd", pidDe("sshd"));
		if (apacheActif()) ajouter("tcp", "LISTEN", "*:80", "*:*", "apache2", pidDe("apache2"));
		else if (nginxActif()) ajouter("tcp", "LISTEN", "0.0.0.0:80", "0.0.0.0:*", "nginx", pidDe("nginx"));
		if (nginxActif()) ajouter("tcp", "LISTEN", "0.0.0.0:443", "0.0.0.0:*", "nginx", pidDe("nginx"));
		if (Shell.pile_ssh.length) ajouter("tcp", "ESTAB", IP_INTRANET + ":22", IP_ROUTEUR_COEUR + ":40112", "sshd", pidDe("sshd"));
	} else {
		ajouter("udp", "UNCONN", "127.0.0.53%lo:53", "0.0.0.0:*", "systemd-resolve", 498);
		if (state.panne.bail) ajouter("udp", "UNCONN", "0.0.0.0:68", "0.0.0.0:*", "dhclient", 1312);
	}
	return s;
}

Shell.sorts.ss = function(args, io){
	if (!surPanne()) return AVANT_PANNE.ss(args, io);
	var o = { t: false, u: false, l: false, n: false, p: false, a: false };
	args.forEach(function(a){
		if (a.charAt(0) !== "-") throw new ShellError("ss : argument inattendu « " + a + " ». Exemple : ss -tulnp");
		for (var k = 1; k < a.length; k++){
			if (!o.hasOwnProperty(a.charAt(k))) throw new ShellError("ss : option inconnue « -" + a.charAt(k) + " ». Celles qui existent ici : -t -u -l -n -p -a");
			o[a.charAt(k)] = true;
		}
	});
	if (!o.t && !o.u){ o.t = true; o.u = true; }
	var h = Shell.hote();
	var liste = socketsDe(h).filter(function(s){
		if (s.proto === "tcp" && !o.t) return false;
		if (s.proto === "udp" && !o.u) return false;
		if (o.a) return true;
		return o.l ? (s.etat === "LISTEN" || s.etat === "UNCONN") : s.etat === "ESTAB";
	});
	var deux = o.t && o.u;
	var lignes = [(deux ? completerDroite("Netid", 6) : "") + completerDroite("State", 8) + completerDroite("Recv-Q", 7) + completerDroite("Send-Q", 7) +
		completerDroite("Local Address:Port", 24) + completerDroite("Peer Address:Port", 22) + (o.p ? "Process" : "")];
	var caches = 0;
	liste.forEach(function(s){
		var local = o.n ? s.local : s.local.replace(/:(\d+)$/, function(t, n){ return ":" + (NOMS_DE_PORTS[n] || n); });
		var proc = "";
		if (o.p){ if (io.sudo) proc = "users:((\"" + s.proc + "\",pid=" + s.pid + ",fd=" + (s.proto === "udp" ? 7 : 3) + "))"; else caches++; }
		lignes.push((deux ? completerDroite(s.proto, 6) : "") + completerDroite(s.etat, 8) + completerDroite("0", 7) + completerDroite(s.etat === "LISTEN" ? "128" : "0", 7) +
			completerDroite(local, 24) + completerDroite(s.pair, 22) + proc);
	});
	if (liste.length === 0 && io.tty) lignes.push(C.gris(o.l ? "(aucun port en écoute)" : "(aucune connexion établie : pour les ports en écoute, ajoute -l)"));
	if (caches && io.tty) lignes.push(C.gris("(Les processus de root ne s'affichent pas sans sudo : sudo ss -" + Object.keys(o).filter(function(k){ return o[k]; }).join("") + ")"));
	GameEvents.fire({ type: "ssPanne", host: h, udp: o.u, ecoute: o.l, sortie: lignes.join("\n") });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Les services : systemctl, journalctl                                */
/* ------------------------------------------------------------------ */

function uniteEnEchec(h, nom){
	var s = HOTES[h].services[nom];
	if (!s || s.actif) return false;
	if (h === "intranet" && nom === "nginx") return state.panne.nginxEchec;
	return nom === "fwupd-refresh";
}
function nomUnite(nom){ return nom.indexOf(".") > -1 ? nom : nom + ".service"; }

Shell.sorts.systemctl = function(args, io){
	if (!surPanne()) return AVANT_PANNE.systemctl(args, io);
	var h = Shell.hote(), services = HOTES[h].services;
	var maintenant = args.indexOf("--now") > -1;
	var echecs = args.indexOf("--failed") > -1 || args.indexOf("--state=failed") > -1;
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0] || "list-units";
	if (action === "list-units" || action === "list-unit-files"){
		var lignes = [completerDroite("UNIT", 34) + completerDroite("LOAD", 8) + completerDroite("ACTIVE", 10) + completerDroite("SUB", 10) + "DESCRIPTION"];
		var n = 0;
		Object.keys(services).forEach(function(nom){
			var s = services[nom], echec = uniteEnEchec(h, nom);
			if (echecs && !echec) return;
			n++;
			var actif = s.actif ? "active" : (echec ? "failed" : "inactive");
			var sub = s.actif ? (nom.indexOf(".socket") > -1 ? "listening" : "running") : (echec ? "failed" : "dead");
			lignes.push((echec ? "● " : "  ") + completerDroite(nomUnite(nom), 32) + completerDroite("loaded", 8) + completerDroite(actif, 10) + completerDroite(sub, 10) + s.description);
		});
		lignes.push("", n + " loaded units listed.");
		GameEvents.fire({ type: "systemctlPanne", action: echecs ? "failed" : "list", host: h, n: n });
		return lignes.join("\n");
	}
	if (action === "daemon-reload") return "";
	var nom = (mots[1] || "").replace(/\.service$/, "");
	if (!mots[1]) throw new ShellError("systemctl " + action + " : quel service ? Exemple : systemctl status nginx");
	if (nom === "ssh") nom = "sshd";
	if (nom === "telnet") throw new ShellError("Unit telnet.service could not be found." + (io.tty ? "\n" + C.gris("(Ici, telnet n'est pas un service mais un socket : systemctl ... telnet.socket)") : ""));
	if (nom === "timesyncd") nom = "systemd-timesyncd";
	var s = services[nom];
	if (!s) throw new ShellError("Unit " + nomUnite(nom) + " could not be found.");
	var echec = uniteEnEchec(h, nom);
	if (action === "is-active") return s.actif ? "active" : (echec ? "failed" : "inactive");
	if (action === "is-enabled") return s.auto ? "enabled" : "disabled";
	if (action === "status"){
		GameEvents.fire({ type: "systemctlPanne", action: "status", host: h, service: nom });
		var etat = s.actif ? (io.tty ? C.vert("active (" + (nom.indexOf(".socket") > -1 ? "listening" : "running") + ")") : "active (running)") :
			(echec ? (io.tty ? C.rouge("failed") : "failed") + " (Result: exit-code)" : "inactive (dead)");
		var texte = (echec ? "× " : "● ") + nomUnite(nom) + " - " + s.description + "\n" +
			"     Loaded: loaded (/lib/systemd/system/" + nomUnite(nom) + "; " + (s.auto ? "enabled" : "disabled") + "; preset: enabled)\n" +
			"     Active: " + etat + "\n" + (s.actif && s.pid ? "   Main PID: " + s.pid + " (" + s.procNom + ")\n" : "");
		if (nom === "nginx" && echec) texte += "\n" + dateDuJour().substring(5).replace("-", "/") + " 06:00:00 intranet nginx[812]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)\n" +
			dateDuJour().substring(5).replace("-", "/") + " 06:00:00 intranet systemd[1]: nginx.service: Failed with result 'exit-code'.";
		if (nom === "isc-dhcp-server" && !s.actif) texte += "\n" + C.gris("(Arrêté et désactivé : il ne démarrera pas tout seul, même au prochain redémarrage. sudo journalctl -u isc-dhcp-server dit qui l'a arrêté.)");
		if (nom === "telnet.socket" && s.actif) texte += "     Listen: [::]:23 (Stream)\n   Triggers: ● telnet@.service";
		return texte.replace(/\n$/, "");
	}
	if (["start", "stop", "restart", "enable", "disable", "reload"].indexOf(action) === -1){
		throw new ShellError("systemctl : action « " + action + " » inconnue ici. Celles qui existent : status, start, stop, restart, enable, disable, is-active, is-enabled, list-units, --failed");
	}
	if (!io.sudo) throw new ShellError("Failed to " + action + " " + nomUnite(nom) + ": Access denied\n" + C.gris("(Gérer les services est réservé à root : sudo systemctl " + action + " " + nom + ")"));
	if (nom === "sshd" && (action === "stop" || action === "disable" || action === "restart")) throw new ShellError("systemctl : arrêter sshd sur " + h + " couperait ta propre connexion, et personne ne pourrait plus s'y connecter. On n'y touche pas.");
	if (nom === "NetworkManager" || nom === "systemd-resolved"){ if (action === "stop" || action === "disable") throw new ShellError("systemctl : sans " + nom + ", le poste perdrait le réseau. Ce n'est pas lui le problème."); }
	var sortie = [];
	function demarrer(){
		if (nom === "nginx" && apacheActif()){
			state.panne.nginxEchec = true;
			throw new ShellError("Job for nginx.service failed because the control process exited with error code.\nSee \"systemctl status nginx.service\" and \"journalctl -xeu nginx.service\" for details." +
				(io.tty ? "\n" + C.gris("(nginx veut le port 80, et quelqu'un l'occupe déjà.)") : ""));
		}
		if (nom === "apache2" && nginxActif()) throw new ShellError("Job for apache2.service failed because the control process exited with error code.\n" + C.gris("(Le port 80 est déjà tenu par nginx. Et c'est très bien comme ça.)"));
		if (nom === "fwupd-refresh") throw new ShellError("Job for fwupd-refresh.service failed.\n" + C.gris("(Ce service cherche des mises à jour de micrologiciel sur internet, que l'intranet n'a pas le droit de joindre. Son échec est sans gravité.)"));
		demarrerService(h, nom);
		if (nom === "nginx") state.panne.nginxEchec = false;
	}
	if (action === "enable"){
		s.auto = true;
		sortie.push("Created symlink /etc/systemd/system/multi-user.target.wants/" + nomUnite(nom) + " → /lib/systemd/system/" + nomUnite(nom) + ".");
		if (maintenant && !s.actif) demarrer();
	}
	if (action === "disable"){
		s.auto = false;
		sortie.push("Removed \"/etc/systemd/system/multi-user.target.wants/" + nomUnite(nom) + "\".");
		if (maintenant) arreterService(h, nom);
	}
	if (action === "stop") arreterService(h, nom);
	if (action === "start" && !s.actif) demarrer();
	if (action === "restart" || action === "reload"){ arreterService(h, nom); demarrer(); }
	if (io.tty && action === "stop" && s.auto) sortie.push(C.gris("(Arrêté, mais toujours activé : il redémarrera au prochain démarrage de la machine. disable --now fait les deux.)"));
	if (io.tty && action === "start" && !s.auto) sortie.push(C.gris("(Démarré, mais pas activé : au prochain démarrage, il restera arrêté. enable --now fait les deux.)"));
	GameEvents.fire({ type: "systemctl", action: action, host: h, service: nom, now: maintenant });
	return sortie.join("\n");
};

/* journalctl -xeu nginx : les options collées se décollent, celles qui ne changent rien ici sont ignorées. */
Shell.sorts.journalctl = function(args, io){
	var propres = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--no-pager" || a === "-x" || a === "-e" || a === "-f" || a === "-xe" || a === "-ex") continue;
		var m = /^-([xe]+)u$/.exec(a);
		if (m){ propres.push("-u"); continue; }
		m = /^--unit=(.+)$/.exec(a);
		if (m){ propres.push("-u", m[1]); continue; }
		propres.push(a);
	}
	var hier = new Date();
	hier.setDate(hier.getDate() - 1);
	var jourHier = MOIS_ANGLAIS[hier.getMonth()] + " " + deuxChiffres(hier.getDate());
	return String(AVANT_PANNE.journalctl(propres, io)).replace(/^[A-Z][a-z]{2} \d\d hier /gm, jourHier + " ");
};

/* ------------------------------------------------------------------ */
/* Le pare-feu du routeur : iptables                                   */
/* ------------------------------------------------------------------ */

function texteRegle(r, numerique){
	var src = r.src || (numerique ? "0.0.0.0/0" : "anywhere"), dst = r.dst || (numerique ? "0.0.0.0/0" : "anywhere");
	return completerDroite(r.cible, 11) + completerDroite(r.proto || "all", 5) + completerDroite("--", 5) + completerDroite(src, 21) + completerDroite(dst, 21) +
		(r.dport ? r.proto + " dpt:" + (numerique ? r.dport : (NOMS_DE_PORTS[r.dport] || r.dport)) : "") + (r.commentaire ? " /* " + r.commentaire + " */" : "");
}
function regleSpec(r){
	return (r.src ? "-s " + r.src + " " : "") + (r.dst ? "-d " + r.dst + " " : "") + (r.proto ? "-p " + r.proto + " " : "") +
		(r.dport ? "-m " + r.proto + " --dport " + r.dport + " " : "") + (r.commentaire ? "-m comment --comment \"" + r.commentaire + "\" " : "") + "-j " + r.cible;
}

Shell.sorts.iptables = function(args, io){
	if (!io.sudo) throw new ShellError("iptables v1.8.9 (nf_tables): Could not fetch rule set generation id: Permission denied (you must be root)\n" + C.gris("(sudo iptables ...)"));
	var h = Shell.hote();
	// Le routeur du bâtiment B garde ses règles ; la Forteresse de l'épreuve finale aussi (dans la copie de l'épreuve).
	var tables = h === "routeur" ? state.panne.iptables :
		(h === "forteresse" && state.examen ? (state.examen.iptables = state.examen.iptables || { INPUT: [], FORWARD: [], OUTPUT: [] }) : { INPUT: [], FORWARD: [], OUTPUT: [] });
	var numerique = false, bavard = false, numeros = false, action = null, chaine = null, position = null, regle = {}, i;
	for (i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-n" || a === "--numeric") numerique = true;
		else if (a === "-v" || a === "--verbose") bavard = true;
		else if (a === "--line-numbers") numeros = true;
		else if (/^-[nvL]+$/.test(a) && a.indexOf("L") > -1){ action = "L"; if (a.indexOf("n") > -1) numerique = true; if (a.indexOf("v") > -1) bavard = true; if (args[i + 1] && /^[A-Z]+$/.test(args[i + 1])) chaine = args[++i]; }
		else if (/^-[nv]+$/.test(a)){ if (a.indexOf("n") > -1) numerique = true; if (a.indexOf("v") > -1) bavard = true; }
		else if (["-L", "--list", "-S", "--list-rules", "-F", "--flush"].indexOf(a) > -1){ action = a.replace(/^--?/, "").charAt(0).toUpperCase(); if (a === "--list-rules") action = "S"; if (args[i + 1] && /^[A-Z]+$/.test(args[i + 1])) chaine = args[++i]; }
		else if (["-A", "--append", "-I", "--insert", "-D", "--delete"].indexOf(a) > -1){
			action = a.replace(/^--?/, "").charAt(0).toUpperCase();
			chaine = args[++i];
			if (args[i + 1] && /^\d+$/.test(args[i + 1])) position = parseInt(args[++i], 10);
		}
		else if (a === "-p" || a === "--protocol") regle.proto = args[++i];
		else if (a === "-s" || a === "--source") regle.src = args[++i];
		else if (a === "-d" || a === "--destination") regle.dst = args[++i];
		else if (a === "--dport" || a === "--destination-port") regle.dport = String(args[++i]);
		else if (a === "-j" || a === "--jump") regle.cible = (args[++i] || "").toUpperCase();
		else if (a === "-m"){ i++; }
		else if (a === "--comment") regle.commentaire = args[++i];
		else if (a === "-t"){ if (args[++i] !== "filter") throw new ShellError("iptables : ici, seule la table filter existe."); }
		else throw new ShellError("iptables : option « " + a + " » inconnue ici. Exemples : sudo iptables -L FORWARD -n -v --line-numbers, sudo iptables -D FORWARD 1");
	}
	if (!action) throw new ShellError("iptables v1.8.9 (nf_tables): no command specified\n" + C.gris("(Exemples : sudo iptables -L, sudo iptables -L FORWARD -n --line-numbers, sudo iptables -D FORWARD 1)"));
	if (chaine && !tables.hasOwnProperty(chaine)) throw new ShellError("iptables: No chain/target/match by that name.");
	if (action === "L" || action === "S"){
		var chaines = chaine ? [chaine] : ["INPUT", "FORWARD", "OUTPUT"];
		var sortie = [];
		chaines.forEach(function(c){
			if (action === "S"){
				sortie.push("-P " + c + " ACCEPT");
				tables[c].forEach(function(r){ sortie.push("-A " + c + " " + regleSpec(r)); });
				return;
			}
			if (sortie.length) sortie.push("");
			sortie.push("Chain " + c + " (policy ACCEPT" + (bavard ? " 0 packets, 0 bytes" : "") + ")");
			sortie.push((numeros ? "num  " : "") + (bavard ? " pkts bytes " : "") + completerDroite("target", 11) + completerDroite("prot", 5) + completerDroite("opt", 5) + completerDroite("source", 21) + "destination");
			tables[c].forEach(function(r, k){
				sortie.push((numeros ? completerDroite(k + 1, 5) : "") + (bavard ? completerGauche(r.paquets || 0, 5) + " " + completerGauche(r.octets || 0, 6) + " " : "") + texteRegle(r, numerique));
			});
		});
		GameEvents.fire({ type: "iptables", action: "L", bavard: bavard, host: h, chaine: chaine });
		return sortie.join("\n");
	}
	if (h !== "routeur" && !(h === "forteresse" && state.examen)) throw new ShellError("iptables : sur " + h + ", personne ne filtre rien avec iptables, et ce n'est pas le moment de commencer. Le filtrage du bâtiment B se fait sur le routeur.");
	if (!chaine && action === "F"){
		["INPUT", "FORWARD", "OUTPUT"].forEach(function(c){ tables[c].length = 0; });
		GameEvents.fire({ type: "iptables", action: "F" });
		return io.tty ? C.jaune("(Toutes les chaînes sont vidées : plus aucune règle sur ce routeur. Ça débloque tout, y compris ce qui devait rester bloqué. En production, on retire seulement la règle fautive : sudo iptables -D FORWARD N.)") : "";
	}
	if (!chaine) throw new ShellError("iptables : quelle chaîne ? INPUT, FORWARD ou OUTPUT.");
	if (action === "F"){
		tables[chaine].length = 0;
		GameEvents.fire({ type: "iptables", action: "F" });
		return io.tty ? C.jaune("(La chaîne " + chaine + " est vidée en entier. Ça marche, mais en production on retire seulement la règle fautive : sudo iptables -D " + chaine + " N.)") : "";
	}
	if (action === "D"){
		if (position !== null){
			if (position < 1) throw new ShellError("iptables v1.8.9 (nf_tables): Invalid rule number `" + position + "'");
			if (position > tables[chaine].length) throw new ShellError("iptables: Index of deletion too big.");
			tables[chaine].splice(position - 1, 1);
		} else {
			var trouvee = tables[chaine].filter(function(r){ return r.cible === regle.cible && (r.proto || "") === (regle.proto || "") && (r.dport || "") === (regle.dport || "") && (r.src || "") === (regle.src || ""); })[0];
			if (!trouvee) throw new ShellError("iptables: Bad rule (does a matching rule exist in that chain?).");
			tables[chaine].splice(tables[chaine].indexOf(trouvee), 1);
		}
		GameEvents.fire({ type: "iptables", action: "D" });
		return "";
	}
	if (["ACCEPT", "DROP", "REJECT"].indexOf(regle.cible) === -1) throw new ShellError("iptables : il faut une cible : -j ACCEPT, -j DROP ou -j REJECT.");
	if (regle.dport && !regle.proto) throw new ShellError("iptables v1.8.9 (nf_tables): unknown option \"--dport\"\n" + C.gris("(--dport demande un protocole : -p tcp --dport 25)"));
	if ([regle.src, regle.dst].some(function(a){ return a && !ipValide(a.split("/")[0]); })) throw new ShellError("iptables v1.8.9 (nf_tables): host/network `" + (regle.src || regle.dst) + "' not found");
	if (action === "I" && position !== null && (position < 1 || position > tables[chaine].length + 1)) throw new ShellError("iptables: Index of insertion too big.");
	regle.paquets = 0; regle.octets = 0;
	if (action === "I") tables[chaine].splice((position || 1) - 1, 0, regle);
	else tables[chaine].push(regle);
	GameEvents.fire({ type: "iptables", action: action });
	return "";
};

/* ------------------------------------------------------------------ */
/* Écouter le réseau : tcpdump                                         */
/* ------------------------------------------------------------------ */

Shell.sorts.tcpdump = function(args, io){
	var h = Shell.hote();
	if (!io.sudo) throw new ShellError("tcpdump: eth0: You don't have permission to perform this capture on that device\n(socket: Operation not permitted)\n" + C.gris("(Écouter le réseau est réservé à root : sudo tcpdump ...)"));
	if (!estHotePanne(h)) throw new ShellError("tcpdump : sur " + h + ", tu n'as rien à écouter : la mission ne concerne que le réseau du bâtiment B. On n'écoute que le réseau dont on a la charge.");
	var contenu = false, numerique = false, limite = null, carte = "eth0", carteChoisie = false, filtre = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-A" || a === "-X") contenu = true;
		else if (a === "-n" || a === "-nn") numerique = true;
		else if (a === "-i"){ carte = args[++i]; carteChoisie = true; if (!carte) throw new ShellError("tcpdump: option requires an argument -- 'i'"); }
		else if (a === "-c") limite = parseInt(args[++i], 10);
		else if (/^-[nAXvl]+$/.test(a)){ if (/[AX]/.test(a)) contenu = true; if (/n/.test(a)) numerique = true; }
		else if (a.charAt(0) === "-") throw new ShellError("tcpdump : option « " + a + " » inconnue ici. Exemples : sudo tcpdump -n port 53, sudo tcpdump -A port 23");
		else filtre.push(a);
	}
	var port = null;
	var mp = /(?:^|\s)port\s+(\d+)/.exec(filtre.join(" "));
	if (mp) port = mp[1];
	if (filtre.length && !mp && !/^(icmp|tcp|udp|host\s+\S+)$/.test(filtre.join(" "))) throw new ShellError("tcpdump: syntax error in filter expression\n" + C.gris("(Filtres possibles ici : port N, tcp port N, udp port N, icmp, host ADRESSE)"));
	var heure = Shell.sorts.date(["+%H:%M:%S"], io);
	function nom(ip, p){ var n = numerique ? ip : (nomDeIp(ip) || ip); return n + (p !== undefined ? "." + (numerique ? p : (NOMS_DE_PORTS[p] || p)) : ""); }
	var paquets = [];
	var posteActif = !!adressePoste() && state.panne.lien;
	// Le DNS : les questions du poste, et les réponses s'il interroge le bon serveur.
	if ((!port || port === "53") && posteActif && (h === "poste-b" || h === "routeur")){
		var serveur = dnsEffectif("poste-b") || IP_DNS;
		paquets.push({ l: nom(adressePoste(), "40211") + " > " + nom(serveur, "53") + ": 4242+ A? intranet.cybersup.lan. (39)" });
		if (dnsRepond("poste-b", serveur)) paquets.push({ l: nom(serveur, "53") + " > " + nom(adressePoste(), "40211") + ": 4242* 1/0/0 A " + IP_INTRANET + " (55)" });
		else paquets.push({ l: nom(adressePoste(), "40211") + " > " + nom(serveur, "53") + ": 4242+ A? intranet.cybersup.lan. (39)  (retransmission, pas de réponse)" });
	}
	// Le telnet du prestataire : un script qui se connecte au routeur toutes les cinq minutes.
	if ((!port || port === "23") && h === "routeur" && telnetActif()){
		paquets.push({ l: nom(IP_PRESTATAIRE, "51022") + " > " + nom(IP_ROUTEUR_COEUR, "23") + ": Flags [S], seq 1904, length 0" });
		paquets.push({ l: nom(IP_ROUTEUR_COEUR, "23") + " > " + nom(IP_PRESTATAIRE, "51022") + ": Flags [P.], length 16", c: "routeur login: " });
		paquets.push({ l: nom(IP_PRESTATAIRE, "51022") + " > " + nom(IP_ROUTEUR_COEUR, "23") + ": Flags [P.], length 6", c: "admin" });
		paquets.push({ l: nom(IP_ROUTEUR_COEUR, "23") + " > " + nom(IP_PRESTATAIRE, "51022") + ": Flags [P.], length 10", c: "Password: " });
		paquets.push({ l: nom(IP_PRESTATAIRE, "51022") + " > " + nom(IP_ROUTEUR_COEUR, "23") + ": Flags [P.], length " + (MOT_DE_PASSE_TELNET.length + 1), c: MOT_DE_PASSE_TELNET, secret: true });
		paquets.push({ l: nom(IP_PRESTATAIRE, "51022") + " > " + nom(IP_ROUTEUR_COEUR, "23") + ": Flags [P.], length 12", c: "show status" });
	}
	// Les mails du bâtiment B : des demandes de connexion qui restent sans réponse tant que la règle DROP est là.
	if ((!port || port === "25") && h === "routeur" && posteActif){
		var bloque = verdictForward({ proto: "tcp", dport: "25", src: adressePoste(), dst: "10.0.92.11" }) !== "ACCEPT";
		paquets.push({ l: nom(adressePoste(), "48876") + " > " + nom("10.0.92.11", "25") + ": Flags [S], seq 77, length 0" + (bloque ? "" : "") });
		if (bloque) paquets.push({ l: nom(adressePoste(), "48876") + " > " + nom("10.0.92.11", "25") + ": Flags [S], seq 77, length 0  (retransmission : aucune réponse)" });
		else paquets.push({ l: nom("10.0.92.11", "25") + " > " + nom(adressePoste(), "48876") + ": Flags [S.], seq 9120, ack 78, length 0" });
	}
	if ((!port || port === "67" || port === "68") && (h === "routeur" || h === "poste-b") && state.panne.bail){
		paquets.push({ l: nom("0.0.0.0", "68") + " > " + nom("255.255.255.255", "67") + ": BOOTP/DHCP, Request from " + MAC_POSTE + ", length 300" });
		paquets.push({ l: nom(IP_ROUTEUR, "67") + " > " + nom(IP_POSTE, "68") + ": BOOTP/DHCP, Reply, length 300" });
	}
	// Les autres filtres : le protocole, ou une machine.
	var expr = filtre.join(" ");
	paquets.forEach(function(p){ p.proto = /A\? |\bA \d|BOOTP/.test(p.l) ? "udp" : "tcp"; });
	if (/(^|\s)icmp(\s|$)/.test(expr)) paquets = [];
	if (/(^|\s)tcp(\s|$)/.test(expr)) paquets = paquets.filter(function(p){ return p.proto === "tcp"; });
	if (/(^|\s)udp(\s|$)/.test(expr)) paquets = paquets.filter(function(p){ return p.proto === "udp"; });
	var mh = /(?:^|\s)host\s+(\S+)/.exec(expr);
	if (mh){
		var cibleHote = ipValide(mh[1]) ? mh[1] : (resoudreDepuis(h, mh[1]).ip || mh[1]);
		paquets = paquets.filter(function(p){ return p.l.indexOf(cibleHote) > -1 || p.l.indexOf(nomDeIp(cibleHote) || "@@") > -1; });
	}
	if (limite) paquets = paquets.slice(0, limite);
	var lignes = ["tcpdump: verbose output suppressed, use -v[v]... for full protocol decode",
		"listening on " + carte + ", link-type " + (carte === "any" ? "LINUX_SLL2 (Linux cooked v2)" : "EN10MB (Ethernet)") + ", snapshot length 262144 bytes"];
	if (!carteChoisie && h === "routeur" && io.tty) lignes.push(C.gris("(Sans -i, tcpdump n'écoute que la première carte, eth0, côté bâtiment B. Ici le jeu te montre tout, mais sur un vrai routeur, pour écouter aussi eth1, côté cœur : sudo tcpdump -i any ...)"));
	paquets.forEach(function(p, k){
		lignes.push(heure + "." + completerGauche(String(104211 + k * 3317).substring(0, 6), 6) + " IP " + p.l);
		if (contenu && p.c) lignes.push(io.tty && p.secret ? C.jaune(p.c) : p.c);
	});
	lignes.push("^C", paquets.length + " packets captured", paquets.length + " packets received by filter", "0 packets dropped by kernel");
	if (io.tty){
		if (!contenu && paquets.some(function(p){ return p.c; })) lignes.push(C.gris("(On ne voit que les en-têtes. Pour le contenu des paquets : -A.)"));
		if (!paquets.length) lignes.push(C.gris(port === "23" && h === "routeur" && !telnetActif() ? "(Plus rien sur le port 23 : telnet est fermé.)" : "(Rien n'est passé pendant la capture.)"));
		if (contenu && paquets.some(function(p){ return p.secret; })) lignes.push(C.gris("(Le script du prestataire envoie son identifiant et son mot de passe en clair, à chaque connexion. N'importe qui sur ce réseau peut les lire, comme toi à l'instant.)"));
	}
	GameEvents.fire({ type: "tcpdump", host: h, port: port, contenu: contenu, secret: contenu && paquets.some(function(p){ return p.secret; }), dns: paquets.some(function(p){ return /A\? /.test(p.l); }) });
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Le web : curl, wget                                                 */
/* ------------------------------------------------------------------ */

/* Une requête HTTP depuis la machine courante : { code, corps, serveur, url, ip... } ou { erreur }. */
function requeteWeb(url, options){
	options = options || {};
	var m = /^(?:(https?):\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(url);
	if (!m) return { erreur: "(3) URL rejected: Malformed input to a URL function" };
	var https = m[1] === "https", hoteUrl = m[2], port = m[3] || (https ? "443" : "80");
	var ici = Shell.hote(), ip, h;
	if (surPanne()){
		var r = resoudreDepuis(ici, hoteUrl);
		if (r.erreur) return { erreur: "(6) Could not resolve host: " + hoteUrl, nomInconnu: true };
		ip = r.ip;
		var t = cheminVers(ici, ip, { proto: "tcp", port: port });
		if (!t.ok){
			if (t.erreur === "delai") return { erreur: "(28) Failed to connect to " + hoteUrl + " port " + port + " after 130000 ms: Connection timed out" };
			return { erreur: "(7) Failed to connect to " + hoteUrl + " port " + port + " after 2 ms: " + (t.erreur === "refus" ? "Couldn't connect to server" : ERREURS_TCP[t.erreur]) };
		}
		h = t.nom;
	} else {
		h = hoteDepuisCible(hoteUrl);
		if (!h) return { erreur: "(6) Could not resolve host: " + hoteUrl };
		ip = HOTES[h].ip;
		if (estHotePanne(h)) return { erreur: "(28) Failed to connect to " + hoteUrl + " port " + port + " after 130000 ms: Connection timed out" };
		if (!portOuvert(h, "tcp", port)) return { erreur: "(7) Failed to connect to " + hoteUrl + " port " + port + " after 2 ms: Couldn't connect to server" };
	}
	var lieu, serveur = "httpd/2.4";
	if (h === "intranet"){
		lieu = https || !apacheActif() ? IntranetSite : IntranetHtml;
		serveur = https || !apacheActif() ? "nginx/1.22.1" : "Apache/2.4.57 (Debian)";
		if (https && ici === "poste-b" && !horlogePosteOK() && !options.insecure){
			return { erreur: "(60) SSL certificate problem: certificate is not yet valid\nMore details here: https://curl.se/docs/sslcerts.html\n\n" +
				"curl failed to verify the legitimacy of the server and therefore could not\nestablish a secure connection to it.", certificat: true };
		}
	} else if (HOTES[h].web) lieu = HOTES[h].web();
	else return { erreur: "(7) Failed to connect to " + hoteUrl + " port " + port + " after 2 ms: Couldn't connect to server" };
	var chemin = (m[4] || "/").replace(/\?.*$/, "");
	if (chemin.charAt(chemin.length - 1) === "/") chemin += "index.html";
	var morceaux = chemin.split("/").filter(Boolean), item = null, ici2 = lieu;
	for (var k = 0; k < morceaux.length && ici2; k++){
		var noeud = ici2.getNode(morceaux[k]);
		if (k === morceaux.length - 1) item = noeud instanceof Item ? noeud : null;
		else ici2 = noeud instanceof Room ? noeud : null;
	}
	var code = item ? 200 : 404;
	var corps = item ? item.getText() : "<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>" + serveur.split(" ")[0] + "</center>\n</body>\n</html>";
	return { code: code, corps: corps, serveur: serveur, hote: h, ip: ip, port: port, chemin: chemin, https: https, hoteUrl: hoteUrl,
		type: /\.txt$/.test(chemin) ? "text/plain" : "text/html", taille: versOctetsUtf8(corps).length };
}

Shell.sorts.curl = function(args, io){
	if (!surPanne()) return AVANT_PANNE.curl(args, io);
	var entetes = false, sortieFichier = null, nomDistant = false, insecure = false, bavard = false, url = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-I" || a === "--head") entetes = true;
		else if (a === "-o" || a === "--output") sortieFichier = args[++i];
		else if (a === "-O" || a === "--remote-name") nomDistant = true;
		else if (a === "-k" || a === "--insecure") insecure = true;
		else if (a === "-v" || a === "--verbose") bavard = true;
		else if (a === "-s" || a === "-L" || a === "-sS" || a === "--silent") continue;
		else if (a.charAt(0) === "-") throw new ShellError("curl : option « " + a + " » inconnue ici. Celles qui existent : -I, -o FICHIER, -O, -k, -v, -s");
		else url = a;
	}
	if (!url) throw new ShellError("curl : quelle adresse ? Exemple : curl http://intranet/");
	var r = requeteWeb(url, { insecure: insecure });
	GameEvents.fire({ type: "curlPanne", ok: !r.erreur, hote: r.hote, code: r.code, entetes: entetes, serveur: r.serveur, https: r.https, certificat: !!r.certificat });
	if (r.erreur) throw new ShellError("curl: " + r.erreur + (r.certificat && io.tty ? "\n" + C.gris("(« Pas encore valide » : pour ce poste, le certificat n'a pas encore commencé sa vie. Qui se trompe de date, le certificat ou le poste ?)") : ""));
	var enTete = "HTTP/1.1 " + r.code + (r.code === 200 ? " OK" : " Not Found") + "\nServer: " + r.serveur + "\nContent-Type: " + r.type + "\nContent-Length: " + r.taille;
	var avertissement = insecure && io.tty && r.https ? C.gris("(-k fait taire la vérification du certificat : pratique pour un test, à ne jamais laisser dans un script.)") + "\n" : "";
	var trace = bavard ? "*   Trying " + r.ip + ":" + r.port + "...\n* Connected to " + r.hoteUrl + " (" + r.ip + ") port " + r.port + "\n" +
		(r.https ? "* SSL connection using TLSv1.3\n* Server certificate:\n*  subject: " + CERTIFICAT_INTRANET.sujet.replace(" = ", "=") + "\n*  start date: " + dateOpenssl(CERTIFICAT_INTRANET.debut) + "\n*  expire date: " + dateOpenssl(CERTIFICAT_INTRANET.fin) + "\n" : "") +
		"> GET " + r.chemin + " HTTP/1.1\n> Host: " + r.hoteUrl + "\n>\n" + enTete.split("\n").map(function(l){ return "< " + l; }).join("\n") + "\n<\n" : "";
	if (entetes) return avertissement + trace + enTete;
	var fichier = sortieFichier || (nomDistant ? r.chemin.split("/").pop() : null);
	if (fichier){ Shell.ecrire(fichier, r.corps, false); return avertissement + trace + (io.tty ? C.gris("(" + r.taille + " octets enregistrés dans " + fichier + ")") : ""); }
	return avertissement + trace + r.corps;
};

Shell.sorts.wget = function(args, io){
	var sortie = null, discret = false, url = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-O") sortie = args[++i];
		else if (args[i] === "-q" || args[i] === "--quiet") discret = true;
		else if (args[i].charAt(0) === "-") throw new ShellError("wget : option « " + args[i] + " » inconnue ici. Exemples : wget http://intranet/planning.txt, wget -O fichier URL, wget -q URL");
		else url = args[i];
	}
	if (!url) throw new ShellError("wget : quelle adresse ? Exemple : wget http://intranet/planning.txt");
	var complete = /^https?:\/\//.test(url) ? url : "http://" + url;
	var d = surPanne() ? dateDuPoste() : new Date();
	var horodatage = d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds());
	var r = requeteWeb(complete, {});
	var lignes = ["--" + horodatage + "--  " + complete];
	var hoteUrl = (/^https?:\/\/([^\/:]+)/.exec(complete) || [])[1];
	if (!hoteUrl) throw new ShellError("wget : " + url + " : adresse invalide. Exemple : wget http://intranet/planning.txt");
	if (r.erreur){
		GameEvents.fire({ type: "wget", ok: false });
		if (r.nomInconnu) lignes.push("Résolution de " + hoteUrl + " (" + hoteUrl + ")… échec : Échec temporaire dans la résolution du nom.", "wget : impossible de résoudre l'adresse de l'hôte « " + hoteUrl + " »");
		else if (r.certificat) lignes.push("ERREUR : impossible de vérifier le certificat de " + hoteUrl + ", délivré par « " + CERTIFICAT_INTRANET.emetteur + " » :", "  Le certificat délivré n'est pas encore activé.");
		else lignes.push("Connexion à " + hoteUrl + "… échec : " + r.erreur.replace(/^\(\d+\) /, "") + ".");
		throw new ShellError(lignes.join("\n"));
	}
	var nom = sortie || r.chemin.split("/").pop() || "index.html";
	lignes.push("Résolution de " + hoteUrl + " (" + hoteUrl + ")… " + r.ip, "Connexion à " + hoteUrl + " (" + hoteUrl + ")|" + r.ip + "|:" + r.port + "… connecté.",
		"requête HTTP transmise, en attente de la réponse… " + r.code + (r.code === 200 ? " OK" : " Not Found"));
	if (r.code !== 200){
		GameEvents.fire({ type: "wget", ok: false, hote: r.hote, chemin: r.chemin });
		lignes.push(horodatage + " ERREUR " + r.code + " : Not Found.");
		throw new ShellError(lignes.join("\n"));
	}
	Shell.ecrire(nom, r.corps, false);
	GameEvents.fire({ type: "wget", ok: true, hote: r.hote, chemin: r.chemin });
	lignes.push("Taille : " + r.taille + " [" + r.type + "]", "Sauvegarde en : « " + nom + " »", "",
		completerDroite(nom, 20) + "100%[===================>]  " + completerGauche(r.taille, 6) + "  --.-KB/s    ds 0s", "",
		horodatage + " (1,2 MB/s) - « " + nom + " » sauvegardé [" + r.taille + "/" + r.taille + "]");
	return discret ? "" : lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* Le https et l'heure : openssl, timedatectl, date                    */
/* ------------------------------------------------------------------ */

function texteDatesCertificat(){
	return "notBefore=" + dateOpenssl(CERTIFICAT_INTRANET.debut) + "\nnotAfter=" + dateOpenssl(CERTIFICAT_INTRANET.fin);
}

Shell.sorts.openssl = function(args, io){
	var sous = args[0];
	if (!sous) throw new ShellError("openssl : quelle commande ? Exemples : openssl s_client -connect intranet:443, openssl x509 -noout -dates -in FICHIER, openssl version");
	if (sous === "version") return "OpenSSL 3.0.14 4 Jun 2024 (Library: OpenSSL 3.0.14 4 Jun 2024)";
	if (sous === "s_client"){
		var cible = valeurApres(args, "-connect");
		if (!cible) throw new ShellError("openssl s_client : vers où ? Exemple : openssl s_client -connect intranet:443");
		var m = /^([^:]+):(\d+)$/.exec(cible);
		if (!m) throw new ShellError("s_client: -connect argument or target parameter malformed or ambiguous");
		var c = connexionTcp(m[1], m[2], "openssl");
		if (c.erreurNom) throw new ShellError("BIO_lookup_ex:system lib:crypto/bio/bio_addr.c:" + m[1] + ": " + (c.erreurNom === "temp" ? "Temporary failure in name resolution" : "Name or service not known") + "\nconnect:errno=22");
		if (!c.ok) throw new ShellError("40F7A1C2D17F0000:error:8000006F:system library:BIO_connect:" + ERREURS_TCP[c.erreur] + ":../crypto/bio/bio_sock2.c:114:calling connect()\nconnect:errno=111");
		if (c.nom !== "intranet" || m[2] !== "443") throw new ShellError("CONNECTED(00000003)\n40F7A1C2D17F0000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number\n" + C.gris("(Ce port ne parle pas TLS : pas de certificat à montrer.)"));
		var horloge = Shell.hote() !== "poste-b" || horlogePosteOK();
		GameEvents.fire({ type: "openssl", action: "s_client", horloge: horloge });
		return "CONNECTED(00000003)\ndepth=1 " + CERTIFICAT_INTRANET.emetteur + "\nverify return:1\ndepth=0 " + CERTIFICAT_INTRANET.sujet + "\n" +
			(horloge ? "verify return:1\n" : "verify error:num=9:certificate is not yet valid\n" + texteDatesCertificat().split("\n")[0] + "\nverify return:1\n") +
			"---\nCertificate chain\n 0 s:" + CERTIFICAT_INTRANET.sujet + "\n   i:" + CERTIFICAT_INTRANET.emetteur + "\n   v:NotBefore: " + dateOpenssl(CERTIFICAT_INTRANET.debut) + "; NotAfter: " + dateOpenssl(CERTIFICAT_INTRANET.fin) + "\n---\n" +
			"Server certificate\n" + TEXTE_CERTIFICAT + "---\nSSL handshake has read 1462 bytes and written 393 bytes\n---\n" +
			"Verify return code: " + (horloge ? "0 (ok)" : "9 (certificate is not yet valid)") + "\n---\nDONE" +
			(!horloge && io.tty ? "\n" + C.gris("(Le certificat commence sa vie le " + CERTIFICAT_INTRANET.debut.toLocaleDateString("fr-FR") + ". Et pour ce poste, on est quel jour ? date.)") : "");
	}
	if (sous === "x509"){
		var fichierCert = valeurApres(args, "-in"), texte;
		if (fichierCert) texte = Shell.objetLisible(fichierCert, io, "openssl").item.getText();
		else if (io.stdin !== null) texte = io.stdin;
		else throw new ShellError("openssl x509 : quel certificat ? -in FICHIER, ou un tuyau depuis openssl s_client");
		if (texte.indexOf("BEGIN CERTIFICATE") === -1) throw new ShellError("Could not read certificate from " + (fichierCert || "<stdin>") + "\nUnable to load certificate");
		var lignes = [];
		if (args.indexOf("-subject") > -1) lignes.push("subject=" + CERTIFICAT_INTRANET.sujet);
		if (args.indexOf("-issuer") > -1) lignes.push("issuer=" + CERTIFICAT_INTRANET.emetteur);
		if (args.indexOf("-dates") > -1 || args.indexOf("-startdate") > -1 || args.indexOf("-enddate") > -1){
			if (args.indexOf("-dates") > -1 || args.indexOf("-startdate") > -1) lignes.push("notBefore=" + dateOpenssl(CERTIFICAT_INTRANET.debut));
			if (args.indexOf("-dates") > -1 || args.indexOf("-enddate") > -1) lignes.push("notAfter=" + dateOpenssl(CERTIFICAT_INTRANET.fin));
			GameEvents.fire({ type: "openssl", action: "dates" });
		}
		if (args.indexOf("-text") > -1){
			lignes.push("Certificate:\n    Data:\n        Version: 3 (0x2)\n        Issuer: " + CERTIFICAT_INTRANET.emetteur + "\n        Validity\n            Not Before: " + dateOpenssl(CERTIFICAT_INTRANET.debut) +
				"\n            Not After : " + dateOpenssl(CERTIFICAT_INTRANET.fin) + "\n        Subject: " + CERTIFICAT_INTRANET.sujet);
			GameEvents.fire({ type: "openssl", action: "dates" });
		}
		if (!lignes.length && args.indexOf("-noout") === -1) lignes.push(TEXTE_CERTIFICAT.replace(/\n$/, ""));
		return lignes.join("\n");
	}
	throw new ShellError("openssl : commande « " + sous + " » non prise en charge ici. Celles qui existent : s_client, x509, version");
};

function formaterDate(d, args){
	var valeurs = {
		"Y": String(d.getFullYear()), "m": deuxChiffres(d.getMonth() + 1), "d": deuxChiffres(d.getDate()),
		"H": deuxChiffres(d.getHours()), "M": deuxChiffres(d.getMinutes()), "S": deuxChiffres(d.getSeconds()),
		"a": JOURS[d.getDay()], "b": MOIS[d.getMonth()], "s": String(Math.floor(d.getTime() / 1000)), "%": "%"
	};
	valeurs["F"] = valeurs["Y"] + "-" + valeurs["m"] + "-" + valeurs["d"];
	valeurs["T"] = valeurs["H"] + ":" + valeurs["M"] + ":" + valeurs["S"];
	if (args.length > 0 && args[0].charAt(0) === "+"){
		return args.join(" ").substring(1).replace(/%(.)/g, function(tout, lettre){ return valeurs.hasOwnProperty(lettre) ? valeurs[lettre] : tout; });
	}
	return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear() + " " + valeurs["T"];
}

Shell.sorts.date = function(args, io){
	if (Shell.hote() !== "poste-b" || horlogePosteOK() || (args.length && args[0].charAt(0) !== "+")) return AVANT_PANNE.date(args, io);
	GameEvents.fire({ type: "datePoste" });
	return formaterDate(dateDuPoste(), args) + (io.tty && !args.length ? "\n" + C.gris("(2001 ? La pile de la carte mère est à plat : à chaque démarrage, l'horloge repart de là. Seule une synchronisation par le réseau la remet à l'heure.)") : "");
};

Shell.sorts.timedatectl = function(args, io){
	var h = Shell.hote(), mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var action = mots[0] || "status";
	var sync = h !== "poste-b" || horlogePosteOK();
	var timesyncd = h === "poste-b" ? servicePanne("poste-b", "systemd-timesyncd") : null;
	if (action === "status" || action === "show"){
		var d = h === "poste-b" ? dateDuPoste() : new Date();
		var local = formaterDate(d, ["+%a %F %T"]);
		var hiver = d.getMonth() < 2 || d.getMonth() > 9 || (d.getMonth() === 2 && d.getDate() < 25) || (d.getMonth() === 9 && d.getDate() >= 26);
		var zone = hiver ? "CET" : "CEST", decalage = hiver ? 1 : 2;
		var utc = new Date(d.getTime() - decalage * 3600000);
		GameEvents.fire({ type: "timedatectl", action: "status", host: h });
		return "               Local time: " + local + " " + zone + "\n           Universal time: " + formaterDate(utc, ["+%a %F %T"]) + " UTC\n                 RTC time: " + formaterDate(h === "poste-b" ? new Date(2001, 0, 1, d.getHours() - decalage, d.getMinutes()) : utc, ["+%a %F %T"]) + "\n" +
			"                Time zone: Europe/Paris (" + zone + ", +0" + decalage + "00)\nSystem clock synchronized: " + (sync ? "yes" : (io.tty ? C.rouge("no") : "no")) + "\n              NTP service: " + (timesyncd ? (timesyncd.actif ? "active" : "inactive") : "active") + "\n          RTC in local TZ: no" +
			(h === "poste-b" && timesyncd.actif && !sync && io.tty ? "\n" + C.gris("(La synchronisation est demandée, mais le serveur de temps (" + IP_DNS + ") est injoignable : le réseau du poste n'est pas encore réparé.)") : "");
	}
	if (action === "set-ntp"){
		var valeur = mots[1];
		if (!/^(true|false|yes|no|1|0|on|off)$/.test(valeur || "")) throw new ShellError("timedatectl set-ntp : true ou false ? Exemple : sudo timedatectl set-ntp true");
		if (!io.sudo) throw new ShellError("Failed to set ntp: Access denied\n" + C.gris("(sudo timedatectl set-ntp true)"));
		if (h !== "poste-b") return C.gris("(L'horloge de " + h + " est déjà synchronisée. Rien à changer.)");
		var oui = /^(true|yes|1|on)$/.test(valeur);
		timesyncd.auto = oui;
		if (oui) demarrerService("poste-b", "systemd-timesyncd"); else arreterService("poste-b", "systemd-timesyncd");
		GameEvents.fire({ type: "timedatectl", action: "set-ntp", oui: oui });
		if (!io.tty) return "";
		if (!oui) return C.gris("(Synchronisation coupée : l'horloge dérivera toute seule.)");
		return horlogePosteOK() ? C.gris("(systemd-timesyncd a contacté le serveur de temps " + IP_DNS + " : l'horloge a fait un bond de " + (new Date().getFullYear() - 2001) + " ans, d'un coup. date pour vérifier.)") :
			C.gris("(Synchronisation activée, mais le serveur de temps " + IP_DNS + " est injoignable pour l'instant.)");
	}
	if (action === "set-time"){
		throw new ShellError("Failed to set time: " + (timesyncd && timesyncd.actif ? "Automatic time synchronization is enabled" : "régler l'heure à la main, c'est se tromper d'une minute.") + "\n" +
			C.gris("(Mieux vaut synchroniser l'horloge sur le serveur de temps de l'école : sudo timedatectl set-ntp true)"));
	}
	if (action === "timesync-status") return sync ? "       Server: " + IP_DNS + " (" + IP_DNS + ")\n Poll interval: 34min 8s (min: 32s; max 34min 8s)\n         Leap: normal\n      Version: 4\n       Stratum: 2" : "Failed to query server: Could not activate remote peer.";
	throw new ShellError("timedatectl : utilisation ici : timedatectl (status), sudo timedatectl set-ntp true, timedatectl timesync-status");
};

/* ------------------------------------------------------------------ */
/* Le manuel et l'ordre des sorts                                      */
/* ------------------------------------------------------------------ */

MANUEL["ip"] = page("voir et régler les cartes réseau, les adresses et les routes", "IP (le protocole Internet)",
	"  ip link                          les cartes, et si elles sont allumées (UP) ou non (DOWN)\n" +
	"  ip a                             les cartes et leurs adresses (ip addr)\n" +
	"  ip -br a                         le même, en une ligne par carte\n" +
	"  ip r                             les routes (ip route) : par où sortent les paquets\n" +
	"  ip route get ADRESSE             la route que prendrait un paquet vers ADRESSE\n" +
	"  ip neigh                         les voisins déjà vus, et leur adresse MAC\n" +
	"  ip -s link                       les compteurs de chaque carte (paquets, erreurs)\n\n" +
	"  sudo ip link set eth0 up                       allumer la carte (down : l'éteindre)\n" +
	"  sudo ip addr add 10.0.93.20/24 dev eth0        poser une adresse (del : la retirer)\n" +
	"  sudo ip route add default via 10.0.93.254      la route par défaut, vers la passerelle\n" +
	"  sudo ip route add 10.0.59.0/24 via 10.0.92.248 une route vers un réseau précis\n\n" +
	"Tout ce que fait ip est oublié au redémarrage : la configuration permanente est ailleurs (netplan).");
MANUEL["ethtool"] = page("voir l'état physique d'une carte réseau", "ETHernet TOOL",
	"  ethtool eth0           vitesse, duplex, et surtout « Link detected » : le câble voit-il quelque chose ?\n\n" +
	"Link detected: no sur une carte allumée, c'est un câble débranché ou abîmé.\nSur une carte éteinte (DOWN), ethtool ne voit rien : on l'allume d'abord.");
MANUEL["hostnamectl"] = page("voir l'identité de la machine", "HOSTNAME ConTroL",
	"  hostnamectl            nom, système, noyau, type de machine (poste, serveur, machine virtuelle)\n\n" +
	"Le nom d'une machine ne se change pas à la légère : les autres la connaissent par lui.");
MANUEL["dhclient"] = page("demander une adresse au serveur DHCP", "DHCP CLIENT",
	"  sudo dhclient eth0       demande une adresse (et la passerelle, et le DNS)\n" +
	"  sudo dhclient -v eth0    en racontant l'échange : DISCOVER, OFFER, REQUEST, ACK\n" +
	"  sudo dhclient -r eth0    rend le bail (l'adresse est libérée)\n\n" +
	"« No DHCPOFFERS received » : personne n'a répondu. Le serveur DHCP est arrêté, ou injoignable.");
MANUEL["nmcli"] = page("voir l'état du réseau vu par NetworkManager", "NetworkManager Command Line Interface",
	"  nmcli                    le résumé : chaque carte, ses adresses, ses routes, le DNS\n  nmcli device status      une ligne par carte : connectée ou non\n" +
	"  nmcli connection show    les connexions configurées\n\nNetworkManager gère le réseau des postes de travail. Les serveurs s'en passent.");
MANUEL["netplan"] = page("lire et appliquer la configuration réseau permanente", "NETwork PLAN",
	"La configuration permanente est dans /etc/netplan/*.yaml (YAML : l'indentation compte, jamais de tabulation).\n\n" +
	"  netplan get                                  la lire\n  sudo netplan set ethernets.eth0.dhcp4=true   demander l'adresse au DHCP\n" +
	"  sudo netplan apply                           appliquer le fichier tout de suite\n  sudo netplan try                             appliquer, avec un retour arrière si on ne confirme pas\n\n" +
	"Une configuration fixe s'écrit dans le fichier :\n      addresses: [10.0.93.20/24]\n      routes:\n        - to: default\n          via: 10.0.93.254\n      nameservers:\n        addresses: [10.0.92.53]");
MANUEL["reboot"] = page("redémarrer la machine", "REBOOT",
	"  sudo reboot            redémarre la machine\n\nAprès un redémarrage, il ne reste que ce qui est écrit dans les fichiers de configuration.\n" +
	"C'est la meilleure façon de vérifier qu'une réparation tient. Sur un serveur, on prévient tout le monde avant.");
MANUEL["dig"] = page("interroger le DNS", "Domain Information Groper",
	"  dig intranet                 l'adresse d'un nom, demandée au serveur du poste\n  dig +short intranet          seulement la réponse\n" +
	"  dig @10.0.92.53 intranet     la question posée à un serveur précis\n  dig MX cybersup.lan          qui reçoit le courrier du domaine\n" +
	"  dig -x 10.0.92.20            le nom d'une adresse (recherche inverse)\n\n" +
	"« no servers could be reached » : personne ne répond au port 53. Le serveur est faux, ou injoignable.\nNXDOMAIN : le serveur a répondu, et ce nom n'existe pas.");
MANUEL["host"] = page("traduire un nom en adresse, en une ligne", "HOST",
	"  host intranet            son adresse\n  host -t MX cybersup.lan  le serveur de courrier\n  host 10.0.92.20          le nom d'une adresse");
MANUEL["nslookup"] = page("interroger le DNS, à l'ancienne", "Name Server LOOKUP",
	"  nslookup intranet               l'adresse d'un nom, et le serveur qui a répondu\n  nslookup intranet 10.0.92.53    en interrogeant un serveur précis\n  nslookup -type=MX cybersup.lan  le serveur de courrier");
MANUEL["resolvectl"] = page("voir et régler le DNS du poste", "RESOLVE ConTroL",
	"  resolvectl status                 quel serveur DNS le poste interroge vraiment (Current DNS Server)\n" +
	"  sudo resolvectl dns eth0 ADRESSE  en changer pour eth0, jusqu'au prochain redémarrage\n  resolvectl query intranet         traduire un nom");
MANUEL["traceroute"] = page("voir le chemin des paquets jusqu'à une machine", "TRACE ROUTE",
	"  traceroute intranet      chaque routeur traversé, et le temps de réponse\n  traceroute -n intranet   sans traduire les adresses en noms (plus rapide)\n\n" +
	"Des lignes * * * : plus personne ne répond à partir de là. Le dernier saut qui répond dit où chercher.");
MANUEL["mtr"] = page("traceroute et ping réunis, avec des statistiques", "My TraceRoute",
	"  mtr --report lille       chaque saut, avec son taux de perte (Loss%) et ses temps\n  mtr -r -c 5 lille        sur 5 envois seulement\n  mtr -n --report lille    sans les noms\n\n" +
	"Un saut à 100 % de perte, et tous les suivants avec : c'est là que les paquets se perdent.");
MANUEL["systemctl"] = page("gérer les services de la machine", "SYSTEM ConTroL",
	"  systemctl list-units           les services (et leur état)\n  systemctl --failed             ceux qui ont échoué\n" +
	"  systemctl status NOM           son état, et ses dernières lignes de journal\n  sudo systemctl start NOM       le démarrer (stop : l'arrêter)\n" +
	"  sudo systemctl enable NOM      le lancer à chaque démarrage (disable : ne plus le lancer)\n  sudo systemctl enable --now NOM    les deux d'un coup (disable --now aussi)\n\n" +
	"Démarré mais pas activé : il ne reviendra pas au prochain démarrage. Activé mais pas démarré : il attend le prochain.\n" +
	"Un service marqué Restart=always revient tout seul si on tue son processus : il faut l'arrêter avec systemctl.");
MANUEL["journalctl"] = page("lire le journal du système", "JOURNAL ConTroL",
	"  sudo journalctl                 tout le journal\n  sudo journalctl -u nginx        un seul service (-xeu nginx : la forme qu'on voit partout)\n" +
	"  sudo journalctl --since 03:00   à partir d'une heure\n  sudo journalctl -n 20           les 20 dernières lignes");
MANUEL["ss"] = page("voir les connexions et les ports en écoute", "Socket Statistics",
	"Un programme qui attend des connexions « écoute » sur un port : 22 pour ssh, 80 et 443 pour le web,\n67 (en UDP) pour le DHCP... ss montre ces ports.\n\n" +
	"  ss -t                 connexions TCP établies\n  ss -tl                ports TCP en écoute (l comme « listening »)\n  ss -ul                ports UDP en écoute\n" +
	"  ss -tuln              TCP et UDP, avec les numéros plutôt que les noms\n  sudo ss -tulnp        pareil, avec le processus qui tient chaque port, et son PID\n\n" +
	"Sur un port, il n'y a de place que pour un programme. Un port ouvert que personne n'explique est l'un des premiers signes d'une intrusion.");
MANUEL["iptables"] = page("voir et régler le filtrage des paquets", "IP TABLES",
	"  sudo iptables -L                              toutes les règles\n  sudo iptables -L FORWARD -n -v --line-numbers  les règles du trafic qui TRAVERSE la machine,\n" +
	"                                                numérotées, avec le nombre de paquets touchés\n  sudo iptables -S                              les règles, comme on les écrirait\n" +
	"  sudo iptables -D FORWARD 1                    retirer la règle 1\n  sudo iptables -I FORWARD 1 -p tcp --dport 25 -j ACCEPT   insérer une règle en tête\n\n" +
	"Les chaînes : INPUT (ce qui arrive pour la machine), OUTPUT (ce qu'elle envoie), FORWARD (ce qui la traverse).\n" +
	"Les règles se lisent dans l'ordre : la première qui correspond décide. DROP jette sans répondre (« timed out »), REJECT refuse.");
MANUEL["tcpdump"] = page("écouter les paquets qui passent", "TCP DUMP",
	"  sudo tcpdump -n port 53       les paquets du DNS, sans traduire les adresses\n  sudo tcpdump -A port 23       avec leur CONTENU en clair (-A comme ASCII)\n" +
	"  sudo tcpdump -c 10            seulement les 10 premiers\n  sudo tcpdump -i eth1 icmp     sur une carte précise, seulement les ping\n\n" +
	"Tout ce qui n'est pas chiffré se lit ainsi : telnet, http, les vieux protocoles de mail.\nOn n'écoute que le réseau dont on a la charge, et avec l'accord de son responsable : écouter celui des autres est un délit.");
MANUEL["curl"] = page("parler à un serveur web en ligne de commande", "Client URL",
	"  curl http://intranet/                 la page d'accueil\n  curl -I http://intranet/              seulement les en-têtes (le champ Server dit quel logiciel répond)\n" +
	"  curl -v https://intranet/             en racontant l'échange, certificat compris\n  curl -o page.html http://intranet/    enregistrer dans un fichier (-O : sous son propre nom)\n" +
	"  curl -k https://...                   sans vérifier le certificat : pour un test, jamais dans un script");
MANUEL["wget"] = page("télécharger un fichier", "Web GET",
	"  wget http://intranet/planning.txt     télécharge le fichier ici, sous son nom\n  wget -O autre.txt URL                 sous un autre nom\n  wget -q URL                           sans rien raconter\n\n" +
	"Il faut avoir le droit d'écrire là où l'on est (sur le poste : /tmp, par exemple).");
MANUEL["openssl"] = page("examiner les certificats et les connexions chiffrées", "OPEN Secure Sockets Layer",
	"  openssl s_client -connect intranet:443               se connecter et voir le certificat\n" +
	"  openssl x509 -noout -dates -in /etc/ssl/intranet.pem les dates de validité d'un certificat\n  openssl x509 -noout -subject -issuer -in FICHIER      pour qui, et signé par qui\n\n" +
	"« not yet valid » : le certificat n'a pas encore commencé sa vie... selon l'horloge de celui qui vérifie.");
MANUEL["timedatectl"] = page("voir et régler l'horloge de la machine", "TIME and DATE ConTroL",
	"  timedatectl                      l'heure, le fuseau, et si l'horloge est synchronisée\n  sudo timedatectl set-ntp true    la synchroniser sur un serveur de temps (NTP)\n\n" +
	"Une horloge fausse casse tout ce qui dépend des dates : certificats, journaux, tâches planifiées, authentification.");
MANUEL["nc"] = page("ouvrir une connexion brute vers un port", "NetCat",
	"  nc mail 25             se connecter au port 25 et lire la bannière\n  nc -zv mail 25         tester seulement si le port répond\n\n" +
	"Les trois réponses à connaître : « succeeded » (ouvert), « refused » (fermé),\n« timed out » (personne ne répond : un pare-feu jette les paquets).");
MANUEL["telnet"] = page("parler à un service à la main (le client)", "TELetype NETwork",
	"  telnet mail 25         se connecter au port 25 et voir ce que répond le service\n\n" +
	"Le client telnet reste pratique pour tester un port. Un SERVEUR telnet, en revanche, n'a plus rien à faire\nsur une machine : tout y passe en clair, mot de passe compris. On le remplace par ssh.");

var ORDRE_DES_SORTS_3 = ["ip", "ethtool", "hostnamectl", "dhclient", "nmcli", "netplan", "reboot", "nano", "curl", "wget",
	"dig", "host", "nslookup", "resolvectl", "systemctl", "journalctl", "ss", "iptables", "tcpdump", "traceroute", "mtr",
	"openssl", "timedatectl", "nc", "telnet"];
ORDRE_DES_SORTS_2 = ORDRE_DES_SORTS_2.filter(function(s){ return ORDRE_DES_SORTS_3.indexOf(s) === -1; });
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return ORDRE_DES_SORTS_3.indexOf(c) === -1; });

/* ------------------------------------------------------------------ */
/* Les sorts des anciens (net-tools) : ifconfig, route, arp, netstat   */
/* ------------------------------------------------------------------ */

function masqueDe(prefixe){
	var n = prefixe === 0 ? 0 : (0xFFFFFFFF << (32 - prefixe)) >>> 0;
	return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

/* Les voisins connus d'une machine (la table ARP) : { ip, dev, mac (ou null), etat }. */
function voisinsDe(h){
	var v = [];
	if (h === "poste-b"){
		if (state.panne.lien && adressePoste() && state.panne.arp) v.push({ ip: IP_ROUTEUR, dev: "eth0", mac: MAC_ROUTEUR, etat: "REACHABLE" });
		else if (state.panne.lien && adressePoste()) v.push({ ip: IP_ROUTEUR, dev: "eth0", mac: null, etat: "FAILED" });
	} else if (h === "routeur"){
		if (state.panne.lien && adressePoste()) v.push({ ip: IP_POSTE, dev: "eth0", mac: MAC_POSTE, etat: "REACHABLE" });
		v.push({ ip: IP_PAREFEU, dev: "eth1", mac: macDe(IP_PAREFEU), etat: "REACHABLE" }, { ip: IP_DNS, dev: "eth1", mac: macDe(IP_DNS), etat: "STALE" });
	} else {
		var passerelle = texteRoutes(h)[0].split(" ")[2];
		v.push({ ip: passerelle, dev: "eth0", mac: passerelle === IP_ROUTEUR_COEUR ? "52:54:00:5d:fe:02" : macDe(passerelle), etat: "REACHABLE" });
	}
	return v;
}

/* Les sorts des anciens comptent pour la quête secondaire quand les quatre ont servi pendant la panne. */
function sortAncien(nom){
	if (!state.has("panneOuverte")) return;
	var p = state.panne;
	p.anciens = p.anciens || {};
	p.anciens[nom] = true;
	if (["ifconfig", "route", "arp", "netstat"].every(function(n){ return p.anciens[n]; })) quetePanne("s_r_anciens");
}

function lectureSeulement(sort, moderne){
	return new ShellError(sort + " : ici, les sorts des anciens lisent seulement. Pour changer quelque chose : " + moderne);
}

Shell.sorts.ifconfig = function(args, io){
	var tout = args.indexOf("-a") > -1;
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; });
	if (noms.length > 1) throw lectureSeulement("ifconfig", "sudo ip link set " + noms[0] + " up, ou sudo ip addr add ADRESSE/24 dev " + noms[0]);
	var h = Shell.hote(), cartes = interfacesDe(h);
	if (noms.length === 1){
		cartes = cartes.filter(function(c){ return c.nom === noms[0]; });
		if (!cartes.length) throw new ShellError(noms[0] + ": error fetching interface information: Device not found");
		tout = true;
	}
	var blocs = [], cachees = [];
	cartes.forEach(function(i, n){
		if (!i.up && !tout){ cachees.push(i.nom); return; }
		var drapeaux = i.lo ? "73<UP,LOOPBACK,RUNNING>" : (i.up ? "4163<UP,BROADCAST,RUNNING,MULTICAST>" : "4098<BROADCAST,MULTICAST>");
		var l = [i.nom + ": flags=" + drapeaux + "  mtu " + (i.lo ? 65536 : 1500)];
		i.adresses.forEach(function(a){
			l.push("        inet " + (io.tty ? C.cyan(a.ip) : a.ip) + "  netmask " + masqueDe(a.prefixe) + (i.lo ? "" : "  broadcast " + diffusion(a.ip, a.prefixe)));
		});
		l.push(i.lo ? "        loop  txqueuelen 1000  (Boucle locale)" : "        ether " + i.mac + "  txqueuelen 1000  (Ethernet)");
		var paquets = i.up ? 9921 + (i.lo ? 0 : 311) : 0;
		l.push("        RX packets " + paquets + "  bytes " + paquets * 186, "        TX packets " + Math.floor(paquets * 0.21) + "  bytes " + Math.floor(paquets * 0.21) * 148);
		blocs.push(l.join("\n"));
	});
	if (cachees.length && io.tty) blocs.push(C.gris("(ifconfig cache les cartes éteintes : " + cachees.join(", ") + ". ifconfig -a les montre toutes, comme ip link.)"));
	sortAncien("ifconfig");
	GameEvents.fire({ type: "ifconfig", host: h, tout: tout });
	return blocs.join("\n\n");
};

/* La table de routage, lue dans les routes de la machine (les mêmes que ip r). */
function tableDeRoutage(h){
	return texteRoutes(h).map(function(l){
		var m = l.split(/\s+/), dest = m[0] === "default" ? "0.0.0.0/0" : m[0];
		var via = valeurApres(m, "via");
		return { dest: dest.split("/")[0], prefixe: +dest.split("/")[1], via: via || null, dev: valeurApres(m, "dev") || "eth0", metrique: valeurApres(m, "metric") || "0" };
	});
}
function texteTableDeRoutage(h, numerique){
	var lignes = ["Kernel IP routing table", completerDroite("Destination", 14) + completerDroite("Gateway", 14) + completerDroite("Genmask", 16) + "Flags Metric Ref Use Iface"];
	tableDeRoutage(h).forEach(function(r){
		var dest = !numerique && r.prefixe === 0 ? "default" : r.dest;
		var gw = r.via ? (numerique ? r.via : (r.prefixe === 0 ? "_gateway" : (nomDeIp(r.via) || r.via))) : "0.0.0.0";
		lignes.push(completerDroite(dest, 14) + completerDroite(gw, 14) + completerDroite(masqueDe(r.prefixe), 16) + completerDroite(r.via ? "UG" : "U", 6) +
			completerDroite(r.metrique, 7) + completerGauche("0", 3) + completerGauche("0", 4) + " " + r.dev);
	});
	return lignes.join("\n");
}

Shell.sorts.route = function(args, io){
	if (args.some(function(a){ return /^(add|del)$/.test(a); })) throw lectureSeulement("route", "sudo ip route add RÉSEAU via PASSERELLE (ou del)");
	var h = Shell.hote(), numerique = args.indexOf("-n") > -1;
	var texte = texteTableDeRoutage(h, numerique);
	if (io.tty && tableDeRoutage(h).length === 0) texte += "\n" + C.gris("(Aucun chemin : la carte est éteinte ou n'a pas d'adresse.)");
	else if (io.tty && !tableDeRoutage(h).some(function(r){ return r.prefixe === 0; })) texte += "\n" + C.gris("(Pas de route par défaut, la ligne 0.0.0.0 avec le drapeau UG : la machine ne sait pas par où sortir de sa rue.)");
	sortAncien("route");
	GameEvents.fire({ type: "route", host: h, numerique: numerique });
	return texte;
};

Shell.sorts.arp = function(args, io){
	if (args.some(function(a){ return /^-(s|d)$/.test(a); })) throw lectureSeulement("arp", "la table des voisins se remplit toute seule, il suffit de parler au voisin (ping)");
	var h = Shell.hote(), numerique = args.indexOf("-n") > -1;
	var lignes = [completerDroite("Address", 25) + completerDroite("HWtype", 8) + completerDroite("HWaddress", 20) + completerDroite("Flags Mask", 16) + "Iface"];
	voisinsDe(h).forEach(function(v){
		var nom = numerique ? v.ip : ((nomDeIp(v.ip) ? nomDeIp(v.ip) + ".cybersup.lan" : v.ip));
		lignes.push(completerDroite(nom, 25) + completerDroite(v.mac ? "ether" : "", 8) + completerDroite(v.mac || "(incomplete)", 20) + completerDroite(v.mac ? "C" : "", 16) + v.dev);
	});
	sortAncien("arp");
	if (lignes.length === 1 && io.tty) return C.gris("(Aucun voisin connu : la machine n'a encore parlé à personne dans sa rue.)");
	GameEvents.fire({ type: "arp", host: h });
	return lignes.join("\n");
};

Shell.sorts.netstat = function(args, io){
	var o = { t: false, u: false, l: false, n: false, p: false, a: false, r: false, i: false };
	args.forEach(function(a){
		if (a.charAt(0) !== "-") throw new ShellError("netstat : argument inattendu « " + a + " ». Exemple : netstat -tulnp");
		for (var k = 1; k < a.length; k++){
			if (!o.hasOwnProperty(a.charAt(k))) throw new ShellError("netstat : option inconnue « -" + a.charAt(k) + " ». Celles qui existent ici : -t -u -l -n -p -a -r -i");
			o[a.charAt(k)] = true;
		}
	});
	var h = Shell.hote();
	sortAncien("netstat");
	GameEvents.fire({ type: "netstat", host: h, routes: o.r, cartes: o.i });
	if (o.r) return texteTableDeRoutage(h, o.n);
	if (o.i){
		var l = ["Kernel Interface table", "Iface      MTU    RX-OK RX-ERR RX-DRP RX-OVR    TX-OK TX-ERR TX-DRP TX-OVR Flg"];
		interfacesDe(h).forEach(function(i, n){
			if (!i.up) return;
			var paquets = 9921 + n * 311;
			l.push(completerDroite(i.nom, 7) + completerGauche(i.lo ? 65536 : 1500, 6) + completerGauche(paquets, 9) + "      0      0 0      " + completerGauche(Math.floor(paquets * 0.21), 8) + "      0      0      0 " + (i.lo ? "LRU" : "BMRU"));
		});
		return l.join("\n");
	}
	if (!o.t && !o.u){ o.t = true; o.u = true; }
	var liste = socketsDe(h).filter(function(s){
		if (s.proto === "tcp" && !o.t) return false;
		if (s.proto === "udp" && !o.u) return false;
		if (o.a) return true;
		return o.l ? (s.etat === "LISTEN" || s.etat === "UNCONN") : s.etat === "ESTAB";
	});
	var lignes = [o.l ? "Active Internet connections (only servers)" : "Active Internet connections (w/o servers)",
		"Proto Recv-Q Send-Q " + completerDroite("Local Address", 20) + completerDroite("Foreign Address", 18) + completerDroite("State", 12) + (o.p ? "PID/Program name" : "")];
	var caches = 0;
	liste.forEach(function(s){
		var local = s.local.replace("%lo", "").replace(/^\*:/, "0.0.0.0:");
		if (!o.n) local = local.replace(/:(\d+)$/, function(t, n){ return ":" + (NOMS_DE_PORTS[n] || n); });
		var proc = "";
		if (o.p){ if (io.sudo) proc = s.pid + "/" + s.proc; else { proc = "-"; caches++; } }
		lignes.push(completerDroite(s.proto, 6) + completerGauche("0", 6) + completerGauche("0", 7) + " " + completerDroite(local, 20) + completerDroite(s.pair.replace(/^\*:/, "0.0.0.0:"), 18) +
			completerDroite(s.etat === "UNCONN" ? "" : (s.etat === "ESTAB" ? "ESTABLISHED" : s.etat), 12) + proc);
	});
	if (caches && io.tty) lignes.push(C.gris("(Les processus de root s'affichent avec sudo : sudo netstat -tulnp)"));
	return lignes.join("\n");
};

/* ------------------------------------------------------------------ */
/* La sacoche de Radia : arping, tracepath, getent, uptime, iperf3, nft */
/* ------------------------------------------------------------------ */

/* Qui porte cette adresse sur le câble d'une carte ? (l'ARP ne traverse pas les routeurs) */
function porteurSurLeCable(h, ip){
	if (dansReseau(ip, "10.0.93.0/24")){
		if (ip === IP_ROUTEUR && h !== "routeur") return MAC_ROUTEUR;
		if (ip === IP_POSTE && h !== "poste-b" && state.panne.lien && adressePoste() === IP_POSTE) return MAC_POSTE;
		return null;
	}
	if (dansReseau(ip, "10.0.92.0/24")){
		if (ip === IP_ROUTEUR_COEUR) return h === "routeur" ? null : "52:54:00:5d:fe:02";
		var nom = nomDeIp(ip);
		return nom && nom !== h ? macDe(ip) : null;
	}
	return null;
}

Shell.sorts.arping = function(args, io){
	var combien = 3, doublon = false, cible = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-c") combien = parseInt(args[++i], 10);
		else if (args[i] === "-D") doublon = true;
		else if (args[i] === "-I") i++;
		else if (args[i].charAt(0) === "-") throw new ShellError("arping : option inconnue « " + args[i] + " ». Celles qui existent ici : -c NOMBRE, -D, -I CARTE");
		else cible = args[i];
	}
	if (!cible) throw new ShellError("arping : quelle adresse crier ? Utilisation : sudo arping -c 3 ADRESSE");
	if (isNaN(combien) || combien < 1) throw new ShellError("arping : -c attend un nombre");
	combien = Math.min(combien, 5);
	exigerSudo(io, "arping", "arping: socket: Operation not permitted");
	var h = Shell.hote();
	var r = resoudreDepuis(h, cible);
	if (r.erreur) throw new ShellError("arping: " + cible + ": Name or service not known");
	var cartes = interfacesDe(h).filter(function(c){ return !c.lo; });
	var carte = cartes.filter(function(c){ return c.adresses.some(function(a){ return dansReseau(r.ip, reseauDe(a.ip, a.prefixe)); }); })[0] || cartes[0];
	if (!carte || !carte.up) throw new ShellError("arping: Interface \"" + (carte ? carte.nom : "eth0") + "\" is down" + (io.tty ? "\n" + C.gris("(La porte est fermée : sudo ip link set eth0 up.)") : ""));
	var adresse = carte.adresses[0];
	if (!adresse && !doublon) throw new ShellError("arping: no source address in not-configured interface" + (io.tty ? "\n" + C.gris("(Pas d'adresse sur " + carte.nom + " : arping -D, lui, marche quand même.)") : ""));
	var memeRue = carte.adresses.some(function(a){ return dansReseau(r.ip, reseauDe(a.ip, a.prefixe)); }) || (doublon && dansReseau(r.ip, "10.0.93.0/24") && h === "poste-b");
	var mac = memeRue ? porteurSurLeCable(h, r.ip) : null;
	var lignes = ["ARPING " + r.ip + " from " + (doublon ? "0.0.0.0" : adresse.ip) + " " + carte.nom];
	if (mac){
		for (var k = 0; k < combien; k++) lignes.push("Unicast reply from " + r.ip + " [" + mac.toUpperCase() + "]  " + (0.6 + k * 0.07).toFixed(3) + "ms");
		lignes.push("Sent " + combien + " probes (1 broadcast(s))", "Received " + combien + " response(s)");
		if (h === "poste-b" && r.ip === IP_ROUTEUR) state.panne.arp = true;
		if (doublon && io.tty) lignes.push(C.jaune("(Quelqu'un porte déjà cette adresse : la poser ici créerait un conflit.)"));
	} else {
		lignes.push("Sent " + combien + " probes (" + combien + " broadcast(s))", "Received 0 response(s)");
		if (io.tty){
			if (doublon) lignes.push(C.vert("(Personne d'autre ne porte cette adresse dans la rue : pas de conflit, elle est libre.)"));
			else if (!memeRue) lignes.push(C.gris("(L'appel ne sort jamais de la rue : arping ne parle qu'aux maisons de ta rue, ici " + reseauDe(adresse.ip, adresse.prefixe) + ". Au-delà, c'est ping.)"));
			else lignes.push(C.gris("(Personne ne porte cette adresse dans ta rue.)"));
		}
	}
	GameEvents.fire({ type: "arping", host: h, cible: r.ip, doublon: doublon, reponses: mac ? combien : 0 });
	if (doublon && !mac && h === "poste-b" && r.ip === IP_POSTE) quetePanne("s_r_arping");
	return lignes.join("\n");
};

Shell.sorts.tracepath = function(args, io){
	if (!estHotePanne(Shell.hote())) throw new ShellError("tracepath : ce sort sert sur les machines de la panne (le Poste, le routeur, l'intranet).");
	var numerique = args.indexOf("-n") > -1;
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	if (!cible) throw new ShellError("tracepath : vers quelle machine ? Utilisation : tracepath MACHINE (-n : sans les noms)");
	var ici = Shell.hote();
	var r = resoudreDepuis(ici, cible);
	if (r.erreur) throw new ShellError("tracepath: " + cible + ": " + (r.erreur === "temp" ? "Temporary failure in name resolution" : "Name or service not known"));
	var t = cheminVers(ici, r.ip);
	if (t.erreur === "reseau") throw new ShellError("tracepath: connect: Network is unreachable");
	var pmtu = 1500;
	var lignes = [" 1?: [LOCALHOST]" + completerGauche("pmtu 1500", 32)];
	t.sauts.forEach(function(s, i){
		var nom = numerique ? s[1] : (s[0].indexOf(".") > -1 ? s[0] : s[0] + ".cybersup.lan");
		var change = "";
		if (s[0] === "lille-gw" && pmtu === 1500){ pmtu = 1400; change = " pmtu 1400"; }
		var dernier = t.ok && i === t.sauts.length - 1;
		lignes.push(completerGauche(i + 1, 2) + ":  " + completerDroite(nom, 40) + completerGauche(tempsDeSaut(i, s[1]) + "ms", 9) + (dernier ? " reached" : change));
	});
	if (t.ok) lignes.push("     Resume: pmtu " + pmtu + " hops " + t.sauts.length + " back " + t.sauts.length);
	else {
		for (var k = 1; k <= 3; k++) lignes.push(completerGauche(t.sauts.length + k, 2) + ":  no reply");
		lignes.push("     Too many hops: pmtu " + pmtu, "     Resume: pmtu " + pmtu);
	}
	if (io.tty && pmtu < 1500) lignes.push(C.gris("(La liaison vers Lille passe dans un tunnel chiffré : chaque lettre y perd un peu de place. pmtu 1400 : la taille maximale d'un paquet sur tout le chemin.)"));
	GameEvents.fire({ type: "tracepath", ok: t.ok, cible: r.ip, pmtu: pmtu });
	if (t.ok && r.ip === IP_LILLE) quetePanne("s_r_tracepath");
	return lignes.join("\n");
};

Shell.sorts.getent = function(args, io){
	var base = args[0], cles = args.slice(1);
	if (!base) throw new ShellError("Utilisation : getent BASE [CLÉ...]. Ici : getent hosts NOM");
	if (base !== "hosts" && base !== "ahosts") throw new ShellError("getent : ici, la base hosts suffit : getent hosts NOM. (Sur un vrai Linux, getent passwd et getent group existent aussi.)");
	var h = Shell.hote();
	if (!cles.length){
		if (h !== "poste-b") return "127.0.0.1       localhost\n127.0.1.1       " + h;
		return lignesDe(PosteHosts.getText()).filter(function(l){ return l.replace(/#.*$/, "").trim(); }).map(function(l){
			var c = l.replace(/#.*$/, "").trim().split(/\s+/);
			return completerDroite(c[0], 16) + c.slice(1).join(" ");
		}).join("\n");
	}
	var lignes = [], deRaccourci = false;
	cles.forEach(function(nom){
		var r = resoudreDepuis(h, nom);
		if (r.erreur) return;
		var raccourci = h === "poste-b" && !ipValide(nom) && (depuisHosts(nom) || depuisHosts(nomCourt(nom)));
		if (raccourci && ["localhost", "poste-b"].indexOf(nomCourt(nom)) === -1) deRaccourci = true;
		var complet = ipValide(nom) ? (nomDeIp(nom) ? nomDeIp(nom) + ".cybersup.lan" : nom) : (raccourci ? nom : nomCourt(nom) + ".cybersup.lan");
		if (base === "ahosts") ["STREAM", "DGRAM", "RAW"].forEach(function(type, k){ lignes.push(completerDroite(r.ip, 16) + completerDroite(type, 7) + (k === 0 ? complet : "")); });
		else lignes.push(completerDroite(r.ip, 16) + complet + (raccourci || ipValide(nom) || complet === nomCourt(nom) ? "" : " " + nomCourt(nom)));
	});
	if (!lignes.length && io.tty) return C.gris("(getent ne dit rien quand il ne trouve pas : ce nom n'est ni dans /etc/hosts ni au DNS, ou le DNS ne répond pas.)");
	GameEvents.fire({ type: "getent", host: h, raccourci: deRaccourci });
	if (deRaccourci) quetePanne("s_r_getent");
	return lignes.join("\n") + (deRaccourci && io.tty ? "\n" + C.gris("(Ce nom vient de /etc/hosts : getent lit les raccourcis avant de consulter l'Oracle des Noms, comme tous les programmes. dig, lui, ne demande qu'au DNS.)") : "");
};

Shell.sorts.uptime = function(args, io){
	var h = Shell.hote(), p = state.panne || {};
	var minutes;
	if (h === "poste-b") minutes = p.demarrages ? Math.max(0, Math.floor(((state.tempsMs || 0) - (p.bootMs || 0)) / 60000)) : 87;
	else if (h === "routeur") minutes = 41 * 1440 + 187;
	else if (h === "intranet") minutes = 192;
	else minutes = 12 * 1440 + 305;
	var heure = h === "poste-b" ? dateDuPoste() : new Date();
	var j = Math.floor(minutes / 1440), hh = Math.floor((minutes % 1440) / 60), mm = minutes % 60;
	var charge = h === "intranet" ? "0,31, 0,22, 0,18" : "0,02, 0,04, 0,01";
	GameEvents.fire({ type: "uptime", host: h, minutes: minutes });
	if (h === "poste-b" && p.demarrages && minutes < 30) quetePanne("s_r_uptime");
	if (args.indexOf("-p") > -1){
		var morceaux = [];
		if (j) morceaux.push(j + (j > 1 ? " days" : " day"));
		if (hh) morceaux.push(hh + (hh > 1 ? " hours" : " hour"));
		morceaux.push(mm + (mm > 1 ? " minutes" : " minute"));
		return "up " + morceaux.join(", ");
	}
	if (args.indexOf("-s") > -1) return formaterDate(new Date(heure.getTime() - minutes * 60000), ["+%F %T"]);
	var duree = (j ? j + (j > 1 ? " days, " : " day, ") : "") + (hh ? hh + ":" + deuxChiffres(mm) : mm + " min");
	var texte = " " + formaterDate(heure, ["+%T"]) + " up " + duree + ",  1 user,  load average: " + charge;
	if (io.tty && h === "poste-b" && p.demarrages && minutes < 30) texte += "\n" + C.gris("(Le poste vient de se réveiller : le Grand Sommeil date de quelques minutes.)");
	return texte;
};

Shell.sorts.iperf3 = function(args, io){
	if (args.indexOf("-s") > -1) throw new ShellError("iperf3 : ici, les serveurs iperf3 tournent déjà (Vint en a laissé un sur l'intranet). Lance le client : iperf3 -c intranet");
	var i = args.indexOf("-c");
	var cible = i > -1 ? args[i + 1] : null;
	if (!cible) throw new ShellError("iperf3 : il faut un serveur. Utilisation : iperf3 -c MACHINE (-t SECONDES)");
	var duree = 3, it = args.indexOf("-t");
	if (it > -1){ duree = parseInt(args[it + 1], 10); if (isNaN(duree) || duree < 1) throw new ShellError("iperf3 : -t attend un nombre de secondes"); }
	duree = Math.min(duree, 5);
	var h = Shell.hote();
	var r = resoudreDepuis(h, cible);
	if (r.erreur) throw new ShellError("iperf3: error - unable to resolve host " + cible);
	var t = cheminVers(h, r.ip);
	var serveur = ["intranet", "lille"].indexOf(t.nom || nomDeIp(r.ip)) > -1;
	if (!t.ok || !serveur){
		var raison = t.erreur === "reseau" ? "Network is unreachable" : (!t.ok && t.erreur === "delai" ? "Connection timed out" : (t.ok ? "Connection refused" : "No route to host"));
		GameEvents.fire({ type: "iperf", ok: false });
		throw new ShellError("iperf3: error - unable to connect to server - server may have stopped running or use a different port, firewall issue, etc.: " + raison +
			(t.ok && !serveur && io.tty ? "\n" + C.gris("(Aucun serveur iperf3 n'attend sur cette machine. Il y en a un sur l'intranet, et un autre à Lille.)") : ""));
	}
	var lent = t.sauts.some(function(s){ return s[0] === "lille-gw"; });
	var debit = lent ? 94.1 : 941;
	var parSeconde = lent ? 11.2 : 112;
	var lignes = ["Connecting to host " + cible + ", port 5201",
		"[  5] local " + ipDeHote(h) + " port 43712 connected to " + r.ip + " port 5201",
		"[ ID] Interval           Transfer     Bitrate"];
	for (var k = 0; k < duree; k++) lignes.push("[  5]   " + k + ".00-" + (k + 1) + ".00   sec  " + completerGauche(String(parSeconde).replace(".", ","), 5) + " MBytes  " + completerGauche(String(debit).replace(".", ","), 5) + " Mbits/sec");
	var total = completerGauche(String(Math.round(parSeconde * duree * 10) / 10).replace(".", ","), 5);
	lignes.push("- - - - - - - - - - - - - - - - - - - - - - - - -", "[ ID] Interval           Transfer     Bitrate         Retr",
		"[  5]   0.00-" + duree + ".00   sec  " + total + " MBytes  " + completerGauche(String(debit).replace(".", ","), 5) + " Mbits/sec    0             sender",
		"[  5]   0.00-" + duree + ".04   sec  " + total + " MBytes  " + completerGauche(String(debit).replace(".", ","), 5) + " Mbits/sec                  receiver",
		"", "iperf Done.");
	if (io.tty) lignes.push(C.gris(lent ? "(Environ 100 Mbit/s : la liaison avec Lille est un tunnel loué, dix fois plus étroit que le réseau de l'école.)" :
		"(Environ 940 Mbit/s : presque tout le gigabit du câble. Le reste part dans les en-têtes des paquets.)"));
	GameEvents.fire({ type: "iperf", ok: true, host: t.nom, debit: debit });
	if ((t.nom || nomDeIp(r.ip)) === "intranet") quetePanne("s_r_iperf");
	return lignes.join("\n");
};

function regleNft(r){
	var morceaux = [];
	if (r.src) morceaux.push("ip saddr " + r.src);
	if (r.dst) morceaux.push("ip daddr " + r.dst);
	if (r.proto && r.dport) morceaux.push(r.proto + " dport " + r.dport);
	else if (r.proto) morceaux.push("ip protocol " + r.proto);
	morceaux.push("counter packets " + (r.paquets || 0) + " bytes " + (r.octets || 0));
	morceaux.push(String(r.cible).toLowerCase());
	if (r.commentaire) morceaux.push("comment \"" + r.commentaire + "\"");
	return morceaux.join(" ");
}

Shell.sorts.nft = function(args, io){
	var phrase = args.join(" ");
	if (!/^list\s+(ruleset|tables|table\s+ip\s+filter)$/.test(phrase)) throw new ShellError("nft : ici, le Nouveau Règlement du gardien se lit seulement : sudo nft list ruleset (ou nft list tables).\n" +
		C.gris("(iptables et nft partagent les mêmes règles : pour en changer une, iptables suffit.)"));
	if (!io.sudo) throw new ShellError("Error: Could not process rule: Operation not permitted\n" + C.gris("(sudo nft " + phrase + ")"));
	var h = Shell.hote();
	GameEvents.fire({ type: "nft", host: h });
	if (/tables/.test(phrase)) return h === "routeur" ? "table ip filter" : "";
	var chaines = h === "routeur" ? state.panne.iptables : { INPUT: [], FORWARD: [], OUTPUT: [] };
	var lignes = ["table ip filter {"];
	["INPUT", "FORWARD", "OUTPUT"].forEach(function(c, i){
		lignes.push("\tchain " + c + " {", "\t\ttype filter hook " + c.toLowerCase() + " priority filter; policy accept;");
		(chaines[c] || []).forEach(function(r){ lignes.push("\t\t" + regleNft(r)); });
		lignes.push("\t}" + (i < 2 ? "\n" : ""));
	});
	lignes.push("}");
	if (h === "routeur") quetePanne("s_r_nft");
	if (io.tty) lignes.push(C.gris("(La même loi qu'avec iptables -L, écrite dans la langue moderne du noyau : nftables.)"));
	return lignes.join("\n");
};

MANUEL["ifconfig"] = page("voir les cartes et leurs adresses (à l'ancienne)", "InterFace CONFIGuration",
	"  ifconfig               les cartes ALLUMÉES et leurs adresses (inet, netmask, broadcast)\n  ifconfig -a            toutes les cartes, même éteintes\n  ifconfig eth0          une seule carte\n\n" +
	"Le sort des anciens (paquet net-tools). Son équivalent moderne : ip a. Piège : sans -a, une carte DOWN n'apparaît pas.");
MANUEL["route"] = page("voir la table de routage (à l'ancienne)", "ROUTE",
	"  route                  la table des chemins, avec les noms\n  route -n               la même, avec les adresses (plus rapide, sans DNS)\n\n" +
	"Flags : U, la route est active ; G, elle passe par une passerelle (Gateway). La ligne 0.0.0.0 (default) est la route par défaut.\nÉquivalent moderne : ip r.");
MANUEL["arp"] = page("voir les voisins et leur adresse MAC (à l'ancienne)", "Address Resolution Protocol",
	"  arp                    les voisins connus, avec leur nom\n  arp -n                 les mêmes, avec leur adresse\n\n" +
	"L'ARP traduit une adresse IP de ta rue en adresse MAC (l'identité matérielle de la carte). Équivalent moderne : ip neigh.");
MANUEL["netstat"] = page("voir les connexions et les ports (à l'ancienne)", "NETwork STATistics",
	"  netstat -tulnp         les ports en écoute, en TCP et UDP, et le programme qui les tient (avec sudo)\n  netstat -tn            les connexions établies\n" +
	"  netstat -r             la table de routage (comme route)\n  netstat -i             les compteurs de chaque carte\n\nÉquivalent moderne : ss (mêmes options : ss -tulnp).");
MANUEL["arping"] = page("crier une adresse dans son réseau local", "ARP PING",
	"  sudo arping -c 3 ADRESSE      qui porte cette adresse dans ma rue ? (réponse : son adresse MAC)\n  sudo arping -D -c 2 ADRESSE   détection de doublon : 0 réponse, l'adresse est libre\n\n" +
	"arping parle en ARP, sous l'IP : il ne traverse jamais un routeur, mais il marche même quand un pare-feu bloque ping.");
MANUEL["tracepath"] = page("voir le chemin des paquets, sans être root", "TRACE PATH",
	"  tracepath MACHINE      chaque étape du chemin, et la pmtu\n  tracepath -n MACHINE   sans les noms\n\n" +
	"La pmtu (Path MTU) est la taille maximale d'un paquet sur TOUT le chemin : un tunnel la réduit souvent (1500 devient 1400).");
MANUEL["getent"] = page("interroger les bases du système, comme le font les programmes", "GET ENTries",
	"  getent hosts NOM       traduire un nom : /etc/hosts d'abord, puis le DNS (comme ping, curl, ssh)\n  getent ahosts NOM      la même chose, en détail\n  getent hosts           tout /etc/hosts\n\n" +
	"dig n'interroge que le DNS ; getent suit le même chemin que les programmes. Quand les deux ne disent pas la même chose, /etc/hosts y est pour quelque chose.");
MANUEL["uptime"] = page("depuis quand la machine est allumée", "UP TIME",
	"  uptime                 l'heure, la durée d'éveil, les utilisateurs, la charge moyenne (1, 5, 15 minutes)\n  uptime -p              la durée, en clair\n  uptime -s              la date du dernier démarrage\n\n" +
	"Un serveur qui a « up 3 min » alors que personne ne l'a redémarré, c'est une coupure de courant, ou un plantage : il faut aller voir les journaux.");
MANUEL["iperf3"] = page("mesurer le débit entre deux machines", "IPERF version 3",
	"  iperf3 -c MACHINE      envoyer des données au serveur iperf3 de MACHINE pendant quelques secondes\n  iperf3 -c MACHINE -t 5 pendant 5 secondes\n  iperf3 -s              (lancer un serveur, de l'autre côté)\n\n" +
	"ping dit si ça passe et en combien de temps ; iperf3 dit COMBIEN passe. Sur un câble gigabit, on mesure environ 940 Mbit/s.");
MANUEL["nft"] = page("lire les règles du pare-feu (nftables)", "NetFilter Tables",
	"  sudo nft list ruleset  toutes les tables, chaînes et règles\n  sudo nft list tables   les tables seulement\n\n" +
	"nftables est le successeur d'iptables : sur les Linux récents, iptables écrit en fait ses règles dans nftables. Les deux montrent donc la même loi.");

ORDRE_DES_SORTS_3 = ORDRE_DES_SORTS_3.concat(["ifconfig", "route", "arp", "netstat", "arping", "tracepath", "getent", "uptime", "iperf3", "nft"]);
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return ORDRE_DES_SORTS_3.indexOf(c) === -1; });

/* ------------------------------------------------------------------ */
/* Les quêtes secondaires                                              */
/* ------------------------------------------------------------------ */

GameEvents.addListener("pingPanne", function(e){ if (e.ok && e.explicite && e.n === 4) quetePanne("s_r_ping"); });
GameEvents.addListener("ipNeigh", function(e){ if (e.host === "poste-b" && e.sortie.indexOf(MAC_ROUTEUR) > -1) quetePanne("s_r_voisins"); });
GameEvents.addListener("ipStats", function(e){ quetePanne("s_r_erreurs"); });
GameEvents.addListener("hostnamectl", function(e){ if (Object.keys(state.panne.hostnamectl || {}).length >= 3) quetePanne("s_r_hostnamectl"); });
GameEvents.addListener("dnsPanne", function(e){
	if (!e.ok) return;
	if (e.outil === "host") quetePanne("s_r_host");
	if (e.outil === "nslookup") quetePanne("s_r_nslookup");
});
GameEvents.addListener("resolvectl", function(e){ if (e.action === "status" && e.host === "poste-b") quetePanne("s_r_resolvectl"); });
GameEvents.addListener("nmcli", function(e){ if (Shell.hote() === "poste-b") quetePanne("s_r_nmcli"); });
GameEvents.addListener("ssPanne", function(e){ if (e.host === "routeur" && e.udp && e.ecoute && /:(67|bootps)\b/.test(e.sortie)) quetePanne("s_r_udp"); });
GameEvents.addListener("systemctlPanne", function(e){ if (e.action === "failed" && e.n > 0) quetePanne("s_r_failed"); });
GameEvents.addListener("wget", function(e){ if (e.ok && e.hote === "intranet" && /planning\.txt$/.test(e.chemin || "")) quetePanne("s_r_wget"); });
GameEvents.addListener("curlPanne", function(e){ if (e.ok && e.entetes && e.hote === "intranet" && /^nginx/.test(e.serveur || "")) quetePanne("s_r_entetes"); });
GameEvents.addListener("openssl", function(e){ if (e.action === "dates") quetePanne("s_r_x509"); });
GameEvents.addListener("ncPanne", function(e){ if (e.ok && !e.scan && e.host === "mail" && e.port === "25") quetePanne("s_r_banniere"); });
GameEvents.addListener("telnetPanne", function(e){ if (e.ok && e.panne && e.host === "mail" && e.port === "25") quetePanne("s_r_telnet"); });
GameEvents.addListener("iptables", function(e){ if (e.action === "L" && e.bavard && e.host === "routeur") quetePanne("s_r_iptables_v"); });
GameEvents.addListener("mtr", function(e){ if (e.panne) quetePanne("s_r_mtr"); });
GameEvents.addListener("traceroutePanne", function(e){ if (e.numerique && e.sauts > 0) quetePanne("s_r_traceroute_n"); });
GameEvents.addListener("tcpdump", function(e){
	if (e.dns) quetePanne("s_r_dns_capture");
	if (e.secret) quetePanne("s_r_clair");
});
