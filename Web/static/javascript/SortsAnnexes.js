/**
 * SortsAnnexes.js : les sorts des quêtes annexes des chapitres 2 et 3 (le réseau de l'école, la Crypte).
 *
 * Ces commandes n'appartiennent à aucun chapitre : aucune étape ni aucun défi ne les enseigne. Ce sont les
 * habitants des quêtes annexes (HabitantsCampus.js, HabitantsCrypte.js) qui les apprennent au joueur, sans XP :
 * leurs pages de manuel sont « hors barème » (comme celles de SortsMachines.js).
 *
 *  - le matériel : lscpu, lspci, lsusb, dmidecode (-t, -s), d'après la fiche de chaque machine (AX_MATERIEL) ;
 *  - le manuel : apropos, whatis, man -k, man -f, man SECTION PAGE (les sections 1, 5, 7 et 8) ;
 *  - nc -l (écouter un port) et nc MACHINE PORT avec une entrée (parler à quelqu'un qui écoute) ;
 *  - ssh : ~/.ssh/config (Host, HostName, User, Port, IdentityFile, ProxyJump, LocalForward), -p, -l, -i, -F, -o,
 *    -J (le rebond), -L (le tunnel) avec -N et -f, une commande à distance, l'agent (ssh-agent, ssh-add) ;
 *  - hexdump (-C, -n, -s), readlink (-f), realpath, ln sans -s (le lien dur), ls -i (le numéro d'inode) ;
 *  - tail -f et tail -F sur un journal vivant, grep --line-buffered ; timeout (-s, -k, --preserve-status) ;
 *  - pwgen, openssl rand, openssl passwd -5 et -6 (le vrai sha512-crypt et le vrai sha256-crypt).
 *
 * Chaque commande garde le comportement d'avant partout où elle n'a rien de nouveau à faire.
 * Les noms de ce fichier commencent par ax (ou AX_), pour ne gêner aucun autre fichier.
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   axSsh      { hote, alias, viaConfig, rebond, agent, user, port, tunnel, commande }
 *   axNc       { hote, port, ecoute, de, recu, envoye }
 *   axMateriel { cmd, hote, sortie, sudo }
 *   axMan      { cmd, sortie, section, page }
 *   axHexdump  { item, sortie }   axReadlink { cmd, cible, sortie, f }   axLsI { lieu, sortie }   axLienDur { item, lieu, nom }
 *   axTail     { item, suivi, rotation }   axGrepSuivi { tamponne, sortie }   axTimeout { code, cible, signal }
 *   axAgent    { action, cles }   axPwgen { sortie, s }   axOpenssl { sous, sortie, sel, mot }
 */

World.fige = false;

/* ================================================================== */
/* Petits outils                                                       */
/* ================================================================== */

function axEtat(id){ var s = etatAnnexe(id); if (!s.vus || typeof s.vus !== "object") s.vus = {}; return s; }
function axNoter(id, cle){ axEtat(id).vus[cle] = true; }
function axVu(id, cle){ return !!(typeof state !== "undefined" && state && state.annexes && state.annexes[id] && state.annexes[id].vus && state.annexes[id].vus[cle]); }
function axSansAccent(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function axOctetsTexte(t){ return versOctetsUtf8(String(t)); }
function axBase64(octets){ var s = ""; for (var i = 0; i < octets.length; i++) s += String.fromCharCode(octets[i]); return btoa(s); }
function axDepuisBase64(texte){ try { var s = atob(String(texte).replace(/\s+/g, "")); var o = []; for (var i = 0; i < s.length; i++) o.push(s.charCodeAt(i)); return o; } catch (e){ return null; } }
function axHex(octets){ return octets.map(function(b){ return ("0" + b.toString(16)).slice(-2); }).join(""); }
/* Des octets « au hasard » mais toujours les mêmes pour un même sel (une clé, un sel, un mot de passe généré). */
function axOctetsAlea(sel, n){ var o = []; for (var i = 0; i < n; i++) o.push(Math.floor(alea(sel + ":" + i) * 256)); return o; }
/* Le texte d'un fichier de la Maison (~/chemin), ou null. */
function axTexteMaison(chemin){
	var lieu = Home, m = String(chemin).split("/").filter(Boolean);
	for (var i = 0; i < m.length - 1; i++){ lieu = lieu.getChildFromName(m[i]); if (lieu === -1 || !lieu) return null; }
	var it = lieu.getItemFromName(m[m.length - 1]);
	return it === -1 ? null : it.getText();
}
function axObjetMaison(chemin){
	var lieu = Home, m = String(chemin).split("/").filter(Boolean);
	for (var i = 0; i < m.length - 1; i++){ lieu = lieu.getChildFromName(m[i]); if (lieu === -1 || !lieu) return null; }
	var it = lieu.getItemFromName(m[m.length - 1]);
	return it === -1 ? null : it;
}
/* ~/.ssh, créé s'il n'existe pas (comme le fait ssh à la première connexion). */
function axDossierSsh(creer){
	var d = Home.getChildFromName(".ssh");
	if (d !== -1 && d) return d;
	if (!creer) return null;
	var fige = World.fige;
	World.fige = true;
	d = new Room(".ssh", "Le dossier de tes clés SSH. Rien que les tiennes.", "item_locker.gif");
	World.fige = fige;
	d.owner = JOUEUR;
	d.mode = "rwx------";
	if (typeof libererNom === "function") libererNom(Home, ".ssh");
	link_rooms(Home, d);
	return d;
}
function axCheminMaison(){ return "/home/" + JOUEUR; }
/* Un texte affiché tel quel par un vrai programme, suivi à l'écran d'une explication grise. */
function axAstuce(io, texte){ return io && io.tty ? "\n" + C.gris(texte) : ""; }

/* Un habitant : un personnage qu'on lit avec cat, au texte vivant, qui enseigne les sorts de son annexe. */
function axHabitant(lieu, nom, texte, sorts){
	var it = new Item(nom, "", "item_" + axSansAccent(nom).replace(/[^a-z0-9]/g, "") + ".gif").personnage();
	if (sorts && sorts.length){ it.enseigne.apply(it, sorts); declarerSortsAnnexes(sorts); }
	texteVivant(it, texte);
	lieu.addItem(it);
	return it;
}

/* Un sort d'un autre chapitre, dont l'annexe a besoin mais que ce départ n'a pas appris (la panne sautée, par exemple) :
   l'habitant le prête, sans XP, et son premier usage ne rapporte rien non plus (la note de son chapitre ne bouge pas). */
function axPreterSort(sort){
	if (!state || state.knows(sort)) return;
	state.spells[sort] = true;
	state.usages[sort] = true;
	if (typeof jouerSon === "function") jouerSon("sort");
	Shell.narration.push({ sort: sort, rpg: "", resume: MANUEL[sort] ? MANUEL[sort].resume : "" });
}

/* ================================================================== */
/* SHA-256 et SHA-512 sur des octets (empreintes de clés, crypt)       */
/* ================================================================== */

var AX_K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function axSha256(octets){
	var m = octets.slice(), n = m.length;
	m.push(0x80);
	while (m.length % 64 !== 56) m.push(0);
	var bits = n * 8;
	for (var b = 7; b >= 0; b--) m.push(b >= 4 ? Math.floor(bits / Math.pow(2, 8 * b)) & 255 : (bits >>> (8 * b)) & 255);
	var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
	var w = new Array(64);
	function rotr(x, k){ return (x >>> k) | (x << (32 - k)); }
	for (var i = 0; i < m.length; i += 64){
		for (var t = 0; t < 16; t++) w[t] = (m[i + 4 * t] << 24) | (m[i + 4 * t + 1] << 16) | (m[i + 4 * t + 2] << 8) | m[i + 4 * t + 3];
		for (t = 16; t < 64; t++){
			var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3), s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
			w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
		}
		var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
		for (t = 0; t < 64; t++){
			var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + AX_K256[t] + w[t]) | 0;
			var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), maj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + maj) | 0;
			hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
		}
		h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
		h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
	}
	var sortie = [];
	h.forEach(function(x){ sortie.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
	return sortie;
}
/* SHA-512 : des mots de 64 bits, en deux moitiés de 32 bits (haut, bas). */
var AX_K512 = (function(){
	var k = ["428a2f98d728ae22", "7137449123ef65cd", "b5c0fbcfec4d3b2f", "e9b5dba58189dbbc", "3956c25bf348b538", "59f111f1b605d019", "923f82a4af194f9b", "ab1c5ed5da6d8118",
		"d807aa98a3030242", "12835b0145706fbe", "243185be4ee4b28c", "550c7dc3d5ffb4e2", "72be5d74f27b896f", "80deb1fe3b1696b1", "9bdc06a725c71235", "c19bf174cf692694",
		"e49b69c19ef14ad2", "efbe4786384f25e3", "0fc19dc68b8cd5b5", "240ca1cc77ac9c65", "2de92c6f592b0275", "4a7484aa6ea6e483", "5cb0a9dcbd41fbd4", "76f988da831153b5",
		"983e5152ee66dfab", "a831c66d2db43210", "b00327c898fb213f", "bf597fc7beef0ee4", "c6e00bf33da88fc2", "d5a79147930aa725", "06ca6351e003826f", "142929670a0e6e70",
		"27b70a8546d22ffc", "2e1b21385c26c926", "4d2c6dfc5ac42aed", "53380d139d95b3df", "650a73548baf63de", "766a0abb3c77b2a8", "81c2c92e47edaee6", "92722c851482353b",
		"a2bfe8a14cf10364", "a81a664bbc423001", "c24b8b70d0f89791", "c76c51a30654be30", "d192e819d6ef5218", "d69906245565a910", "f40e35855771202a", "106aa07032bbd1b8",
		"19a4c116b8d2d0c8", "1e376c085141ab53", "2748774cdf8eeb99", "34b0bcb5e19b48a8", "391c0cb3c5c95a63", "4ed8aa4ae3418acb", "5b9cca4f7763e373", "682e6ff3d6b2b8a3",
		"748f82ee5defb2fc", "78a5636f43172f60", "84c87814a1f0ab72", "8cc702081a6439ec", "90befffa23631e28", "a4506cebde82bde9", "bef9a3f7b2c67915", "c67178f2e372532b",
		"ca273eceea26619c", "d186b8c721c0c207", "eada7dd6cde0eb1e", "f57d4f7fee6ed178", "06f067aa72176fba", "0a637dc5a2c898a6", "113f9804bef90dae", "1b710b35131c471b",
		"28db77f523047d84", "32caab7b40c72493", "3c9ebe0a15c9bebc", "431d67c49c100d4c", "4cc5d4becb3e42b6", "597f299cfc657e2a", "5fcb6fab3ad6faec", "6c44198c4a475817"];
	return k.map(function(x){ return [parseInt(x.substring(0, 8), 16) | 0, parseInt(x.substring(8), 16) | 0]; });
})();
function axSha512(octets){
	var m = octets.slice(), n = m.length;
	m.push(0x80);
	while (m.length % 128 !== 112) m.push(0);
	for (var z = 0; z < 8; z++) m.push(0);
	var bits = n * 8;
	for (var b = 7; b >= 0; b--) m.push(b >= 4 ? Math.floor(bits / Math.pow(2, 8 * b)) & 255 : (bits >>> (8 * b)) & 255);
	var H = [[0x6a09e667, 0xf3bcc908], [0xbb67ae85, 0x84caa73b], [0x3c6ef372, 0xfe94f82b], [0xa54ff53a, 0x5f1d36f1],
		[0x510e527f, 0xade682d1], [0x9b05688c, 0x2b3e6c1f], [0x1f83d9ab, 0xfb41bd6b], [0x5be0cd19, 0x137e2179]].map(function(x){ return [x[0] | 0, x[1] | 0]; });
	function add(){ var lo = 0, hi = 0; for (var i = 0; i < arguments.length; i++){ lo += arguments[i][1] >>> 0; hi += arguments[i][0] >>> 0; } hi += Math.floor(lo / 4294967296); return [hi | 0, lo | 0]; }
	function rotr(x, k){ if (k < 32) return [(x[0] >>> k) | (x[1] << (32 - k)), (x[1] >>> k) | (x[0] << (32 - k))]; k -= 32; return [(x[1] >>> k) | (x[0] << (32 - k)), (x[0] >>> k) | (x[1] << (32 - k))]; }
	function shr(x, k){ return k < 32 ? [x[0] >>> k, (x[1] >>> k) | (x[0] << (32 - k))] : [0, x[0] >>> (k - 32)]; }
	function xor(){ var r = [0, 0]; for (var i = 0; i < arguments.length; i++){ r[0] ^= arguments[i][0]; r[1] ^= arguments[i][1]; } return r; }
	var w = new Array(80);
	for (var i = 0; i < m.length; i += 128){
		for (var t = 0; t < 16; t++){
			var o = i + t * 8;
			w[t] = [(m[o] << 24) | (m[o + 1] << 16) | (m[o + 2] << 8) | m[o + 3], (m[o + 4] << 24) | (m[o + 5] << 16) | (m[o + 6] << 8) | m[o + 7]];
		}
		for (t = 16; t < 80; t++){
			var s0 = xor(rotr(w[t - 15], 1), rotr(w[t - 15], 8), shr(w[t - 15], 7)), s1 = xor(rotr(w[t - 2], 19), rotr(w[t - 2], 61), shr(w[t - 2], 6));
			w[t] = add(w[t - 16], s0, w[t - 7], s1);
		}
		var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], hh = H[7];
		for (t = 0; t < 80; t++){
			var S1 = xor(rotr(e, 14), rotr(e, 18), rotr(e, 41));
			var ch = [(e[0] & f[0]) ^ (~e[0] & g[0]), (e[1] & f[1]) ^ (~e[1] & g[1])];
			var t1 = add(hh, S1, ch, AX_K512[t], w[t]);
			var S0 = xor(rotr(a, 28), rotr(a, 34), rotr(a, 39));
			var maj = [(a[0] & bb[0]) ^ (a[0] & c[0]) ^ (bb[0] & c[0]), (a[1] & bb[1]) ^ (a[1] & c[1]) ^ (bb[1] & c[1])];
			var t2 = add(S0, maj);
			hh = g; g = f; f = e; e = add(d, t1); d = c; c = bb; bb = a; a = add(t1, t2);
		}
		H = [add(H[0], a), add(H[1], bb), add(H[2], c), add(H[3], d), add(H[4], e), add(H[5], f), add(H[6], g), add(H[7], hh)];
	}
	var sortie = [];
	H.forEach(function(x){ [x[0], x[1]].forEach(function(v){ sortie.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); }); });
	return sortie;
}
/* sha512-crypt et sha256-crypt ($6$ et $5$), l'algorithme de la glibc : le même résultat qu'openssl passwd -6 / -5. */
var AX_ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function axCrypt(mot, sel, algo){
	var hacher = algo === 5 ? axSha256 : axSha512, L = algo === 5 ? 32 : 64;
	var P = axOctetsTexte(mot), S = axOctetsTexte(String(sel).substring(0, 16));
	function repete(octets, n){ var r = []; for (var i = 0; i < n; i++) r.push(octets[i % octets.length]); return r; }
	var B = hacher(P.concat(S, P));
	var A0 = P.concat(S, repete(B, P.length));
	for (var k = P.length; k > 0; k >>= 1) A0 = A0.concat(k & 1 ? B : P);
	var A = hacher(A0);
	var DP = []; for (var i = 0; i < P.length; i++) DP = DP.concat(P);
	var Pseq = P.length ? repete(hacher(DP), P.length) : [];
	var DS = []; for (i = 0; i < 16 + A[0]; i++) DS = DS.concat(S);
	var Sseq = S.length ? repete(hacher(DS), S.length) : [];
	for (i = 0; i < 5000; i++){
		var C2 = (i & 1) ? Pseq.slice() : A.slice();
		if (i % 3) C2 = C2.concat(Sseq);
		if (i % 7) C2 = C2.concat(Pseq);
		C2 = C2.concat((i & 1) ? A : Pseq);
		A = hacher(C2);
	}
	function b64(b2, b1, b0, n){ var w = (b2 << 16) | (b1 << 8) | b0, s = ""; while (n-- > 0){ s += AX_ITOA64.charAt(w & 0x3f); w >>>= 6; } return s; }
	var r = "";
	if (algo === 5){
		var ordre5 = [[0, 10, 20], [21, 1, 11], [12, 22, 2], [3, 13, 23], [24, 4, 14], [15, 25, 5], [6, 16, 26], [27, 7, 17], [18, 28, 8], [9, 19, 29]];
		ordre5.forEach(function(o){ r += b64(A[o[0]], A[o[1]], A[o[2]], 4); });
		r += b64(0, A[31], A[30], 3);
	} else {
		for (var j = 0; j < 21; j++){
			var o6 = [(j * 22) % 63, (j * 22 + 21) % 63, (j * 22 + 42) % 63];
			r += b64(A[o6[0]], A[o6[1]], A[o6[2]], 4);
		}
		r += b64(0, 0, A[63], 2);
	}
	return "$" + algo + "$" + String(sel).substring(0, 16) + "$" + r;
}

/* ================================================================== */
/* Les machines des quêtes annexes                                     */
/* ================================================================== */

/* Elles vivent dans un coin à part de la SalleReseau (.machines/.horizons) : ni dans la carte du réseau de l'école,
   ni dans le barème d'un chapitre (horsBareme), ni dans le scan de 10.0.92.0/24. */
var AxHorizons = new Room(".horizons", "Les machines que les habitants t'ont fait découvrir, loin du réseau de l'école.", "loc_cluster.gif");
AxHorizons.horsBareme = true;
AxHorizons.owner = "root";
AxHorizons.mode = "rwxr-xr-x";
link_rooms(Machines, AxHorizons);
function axMachine(nom, ip, intro, image, options){
	var racine = new Room(nom, intro, image || "loc_cluster.gif");
	racine.racineHote = nom;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	racine.horsBareme = true;
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + nom);
	link_rooms(AxHorizons, racine);
	var infos = { ip: ip, arrivee: function(){ return racine; }, ouvert: true, noyau: "6.1.0-25-amd64", axSsh: true, ports: { 22: port("ssh", BANNIERE_SSH) } };
	options = options || {};
	for (var k in options) if (options.hasOwnProperty(k)) infos[k] = options[k];
	decrireHote(nom, infos);
	return racine;
}
function axDossier(parent, nom, intro, options){
	options = options || {};
	var lieu = new Room(nom, intro || "Un dossier du système.", options.image || "loc_darkroom.gif");
	lieu.owner = options.owner || "root";
	lieu.mode = options.mode || "rwxr-xr-x";
	lieu.horsBareme = true;
	if (parent.chapitre) lieu.chapitre = parent.chapitre;
	link_rooms(parent, lieu);
	return lieu;
}
function axFichier(lieu, nom, texte, options){
	options = options || {};
	var it = new Item(nom, texte, options.image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	["age", "heure", "format", "binaire", "octets"].forEach(function(k){ if (options[k] !== undefined) it[k] = options[k]; });
	lieu.addItem(it);
	return it;
}
/* Une machine joignable d'où ? axDepuis : la liste des machines d'où l'on peut la joindre (sinon : de partout, hors panne). */
function axJoignable(h, depuis){
	var x = HOTES[h] || {};
	if (!x.axDepuis) return true;
	return x.axDepuis.indexOf(depuis) > -1 || depuis === h;
}
function axHotePanne(h){ return typeof estHotePanne === "function" && estHotePanne(h); }

/* ================================================================== */
/* Le matériel : lscpu, lspci, lsusb, dmidecode                        */
/* ================================================================== */

/* La fiche de chaque machine. Les noms de fabricants sont inventés : le jeu ne cite aucune marque. */
var AX_MATERIEL_DEFAUT = {
	cpu: { modele: "Generic x86-64 Virtual CPU", coeurs: 2, threads: 1, mhz: "2400.000", virtuel: true },
	memoire: "4 GB", pci: [["00:00.0", "Host bridge", "Generic 440FX Host Bridge (rev 02)"], ["00:01.1", "IDE interface", "Generic PIIX IDE Controller"],
		["00:02.0", "VGA compatible controller", "Generic Virtual VGA Adapter (rev 05)"], ["00:03.0", "Ethernet controller", "Virtio network device"],
		["00:04.0", "SCSI storage controller", "Virtio block device"]],
	usb: [["001", "001", "1d6b:0002", "root hub (USB 2.0)"]],
	systeme: { fabricant: "Atelier Virtuel", produit: "Machine virtuelle standard", version: "pc-q35-7.2", serie: "Not Specified", famille: "Virtual Machine", uuid: null },
	bios: { vendeur: "Atelier Virtuel", version: "1.16.2-debian", date: "04/01/2014" }
};
var AX_MATERIEL = {
	"poste-b": {
		cpu: { modele: "Generic x86-64 Desktop CPU @ 3.20GHz", coeurs: 4, threads: 2, mhz: "3200.000", max: "4600.0000", min: "800.0000", virtuel: false },
		memoire: "16 GB",
		pci: [["00:00.0", "Host bridge", "Generic Desktop Host Bridge (rev 03)"], ["00:02.0", "VGA compatible controller", "Generic Integrated Graphics (rev 04)", "i915"],
			["00:14.0", "USB controller", "Generic xHCI USB 3.1 Host Controller (rev 10)", "xhci_hcd"], ["00:16.0", "Communication controller", "Generic Management Engine Interface"],
			["00:17.0", "SATA controller", "Generic SATA AHCI Controller (rev 10)", "ahci"], ["00:1f.3", "Audio device", "Generic High Definition Audio Controller (rev 10)"],
			["00:1f.6", "Ethernet controller", "Generic Gigabit Ethernet Controller (rev 10)"], ["01:00.0", "Non-Volatile memory controller", "Generic NVMe SSD Controller 512GB", "nvme"]],
		usb: [["001", "001", "1d6b:0002", "root hub (USB 2.0)"], ["001", "002", "0c45:7403", "Generic USB Keyboard"], ["001", "003", "093a:2510", "Generic Optical Mouse"],
			["001", "004", "072f:2200", "Generic Contactless Badge Reader"], ["002", "001", "1d6b:0003", "root hub (USB 3.0)"]],
		systeme: { fabricant: "Ateliers du Campus", produit: "Poste de bureau B-20", version: "1.0", serie: "CYB-B20-4471", famille: "Postes de l'accueil", uuid: "4c4c4544-0042-3010-8058-b2c04f303032" },
		bios: { vendeur: "Ateliers du Campus", version: "2.18.0", date: "03/11/2024" }
	}
};
function axMaterielDe(h){
	var m = AX_MATERIEL[h] || (HOTES[h] && HOTES[h].axMateriel) || {};
	var d = AX_MATERIEL_DEFAUT, r = {};
	["cpu", "memoire", "pci", "usb", "systeme", "bios"].forEach(function(k){ r[k] = m[k] || d[k]; });
	// Une machine modélisée (chapitre 6) : le nombre de processeurs vient de sa fiche.
	if (!m.cpu && typeof estMachine === "function" && estMachine(h)){
		try { var M = etatMachine(h); if (M.cpus) r.cpu = { modele: d.cpu.modele, coeurs: M.cpus, threads: 1, mhz: d.cpu.mhz, virtuel: true }; } catch (e){}
	}
	return r;
}
function axUuid(h){ return (AX_MATERIEL[h] && AX_MATERIEL[h].systeme && AX_MATERIEL[h].systeme.uuid) || axHex(axOctetsAlea("uuid-" + h, 16)).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5"); }
function axNoterMateriel(cmd, sortie, io){ GameEvents.fire({ type: "axMateriel", cmd: cmd, hote: Shell.hote(), sortie: sortie, sudo: !!io.sudo }); return sortie; }

Shell.sorts.lscpu = function(args, io){
	var p = lireOptionsGNU(args, "lscpu", "eJpybx", "", { json: "J", "extended": "e", "parse": "p", "bytes": "b", "hex": "x" });
	var m = axMaterielDe(Shell.hote()).cpu, n = m.coeurs * m.threads;
	if (p.opts.e){
		var l = ["CPU NODE SOCKET CORE L1d:L1i:L2:L3 ONLINE    MAXMHZ   MINMHZ"];
		for (var i = 0; i < n; i++) l.push(completerGauche(i, 3) + "    0      0 " + completerGauche(i % m.coeurs, 4) + " " + completerDroite(i % m.coeurs + ":" + i % m.coeurs + ":" + i % m.coeurs + ":0", 13) + " yes " + completerGauche(m.max || m.mhz, 9) + " " + completerGauche(m.min || m.mhz, 8));
		return axNoterMateriel("lscpu", l.join("\n"), io);
	}
	var lignes = [
		["Architecture:", "x86_64"], ["  CPU op-mode(s):", "32-bit, 64-bit"], ["  Address sizes:", "39 bits physical, 48 bits virtual"], ["  Byte Order:", "Little Endian"],
		["CPU(s):", String(n)], ["  On-line CPU(s) list:", "0-" + (n - 1)], ["Vendor ID:", "GenericVendor"], ["  Model name:", m.modele],
		["    CPU family:", "6"], ["    Model:", "154"], ["    Thread(s) per core:", String(m.threads)], ["    Core(s) per socket:", String(m.coeurs)], ["    Socket(s):", "1"],
		["    Stepping:", "3"]];
	if (m.max) lignes.push(["    CPU max MHz:", m.max], ["    CPU min MHz:", m.min]);
	lignes.push(["    BogoMIPS:", (parseFloat(m.mhz) * 2).toFixed(2)], ["    Flags:", "fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx rdtscp lm constant_tsc pni ssse3 fma cx16 sse4_1 sse4_2 popcnt aes xsave avx f16c rdrand" + (m.virtuel ? " hypervisor" : " vmx") + " avx2"]);
	if (m.virtuel) lignes.push(["Virtualization features:", ""], ["  Hypervisor vendor:", "KVM"], ["  Virtualization type:", "full"]);
	else lignes.push(["Virtualization features:", ""], ["  Virtualization:", "VT-x"]);
	lignes.push(["Caches (sum of all):", ""], ["  L1d:", (48 * m.coeurs) + " KiB (" + m.coeurs + " instances)"], ["  L1i:", (32 * m.coeurs) + " KiB (" + m.coeurs + " instances)"],
		["  L2:", (1.25 * m.coeurs) + " MiB (" + m.coeurs + " instances)"], ["  L3:", (m.virtuel ? 16 : 12) + " MiB (1 instance)"], ["NUMA:", ""], ["  NUMA node(s):", "1"], ["  NUMA node0 CPU(s):", "0-" + (n - 1)]);
	if (p.opts.J){
		return axNoterMateriel("lscpu", "{\n   \"lscpu\": [\n" + lignes.filter(function(x){ return x[1] !== ""; }).map(function(x){ return "      {\n         \"field\": " + JSON.stringify(x[0].trim()) + ",\n         \"data\": " + JSON.stringify(x[1]) + "\n      }"; }).join(",\n") + "\n   ]\n}", io);
	}
	return axNoterMateriel("lscpu", lignes.map(function(x){ return completerDroite(x[0], 33) + " " + x[1]; }).join("\n").replace(/ +$/gm, ""), io);
};

Shell.sorts.lspci = function(args, io){
	var p = lireOptionsGNU(args, "lspci", "vknmtDq", "s", {});
	var m = axMaterielDe(Shell.hote()).pci;
	if (p.opts.s) m = m.filter(function(x){ return x[0].indexOf(p.opts.s.replace(/^0000:/, "")) === 0; });
	if (p.opts.t){
		return axNoterMateriel("lspci", "-[0000:00]-+-" + m.map(function(x){ return x[0].substring(3); }).join("\n           +-"), io);
	}
	var lignes = [];
	m.forEach(function(x){
		lignes.push(x[0] + " " + x[1] + ": " + x[2]);
		if (p.opts.v || p.opts.k){
			if (p.opts.v) lignes.push("\tSubsystem: " + x[2].replace(/ \(rev .*\)$/, ""), "\tFlags: bus master, fast devsel, latency 0, IRQ " + (16 + lignes.length % 20));
			if (x[3]){ lignes.push("\tKernel driver in use: " + x[3], "\tKernel modules: " + x[3]); }
			lignes.push("");
		}
	});
	return axNoterMateriel("lspci", lignes.join("\n").replace(/\n+$/, ""), io);
};

Shell.sorts.lsusb = function(args, io){
	var p = lireOptionsGNU(args, "lsusb", "vt", "sd", {});
	var m = axMaterielDe(Shell.hote()).usb;
	if (p.opts.t){
		var bus = {};
		m.forEach(function(x){ (bus[x[0]] = bus[x[0]] || []).push(x); });
		var l = [];
		Object.keys(bus).sort().forEach(function(b){
			l.push("/:  Bus " + b + ".Port 001: Dev 001, Class=root_hub, Driver=" + (b === "002" ? "xhci_hcd/6p, 10000M" : "xhci_hcd/12p, 480M"));
			bus[b].filter(function(x){ return x[1] !== "001"; }).forEach(function(x, k){ l.push("    |__ Port " + (k + 1) + ": Dev " + (+x[1]) + ", If 0, Class=Human Interface Device, Driver=usbhid, 12M"); });
		});
		return axNoterMateriel("lsusb", l.join("\n"), io);
	}
	if (p.opts.d) m = m.filter(function(x){ return x[2] === p.opts.d; });
	if (p.opts.s){ var bd = p.opts.s.split(":"); m = m.filter(function(x){ return (+x[0]) === (+bd[0]) && (bd[1] === undefined || (+x[1]) === (+bd[1])); }); }
	if (!m.length){ io.code = 1; return ""; }
	return axNoterMateriel("lsusb", m.map(function(x){ return "Bus " + x[0] + " Device " + x[1] + ": ID " + x[2] + " " + x[3]; }).join("\n"), io);
};

Shell.sorts.dmidecode = function(args, io){
	var p = lireOptionsGNU(args, "dmidecode", "qu", "tsH", { type: "t", string: "s", quiet: "q" }, "t");
	if (!io.sudo){
		throw new ShellError("/sys/firmware/dmi/tables/smbios_entry_point: Permission denied\nScanning /dev/mem for entry point.\n/dev/mem: Permission denied" +
			axAstuce(io, "(La table du firmware ne se lit qu'en root : sudo dmidecode ...)"));
	}
	var h = Shell.hote(), m = axMaterielDe(h), s = m.systeme, b = m.bios;
	var chaines = { "system-manufacturer": s.fabricant, "system-product-name": s.produit, "system-version": s.version, "system-serial-number": s.serie,
		"system-uuid": axUuid(h), "system-family": s.famille, "bios-vendor": b.vendeur, "bios-version": b.version, "bios-release-date": b.date,
		"processor-version": m.cpu.modele, "processor-frequency": Math.round(parseFloat(m.cpu.max || m.cpu.mhz)) + " MHz", "baseboard-manufacturer": s.fabricant };
	if (p.opts.s){
		if (!chaines.hasOwnProperty(p.opts.s)) throw new ShellError("dmidecode: Invalid string keyword: " + p.opts.s + "\nValid string keywords are:\n  " + Object.keys(chaines).join("\n  "), 2);
		return axNoterMateriel("dmidecode", chaines[p.opts.s], io);
	}
	var blocs = {
		bios: ["Handle 0x0000, DMI type 0, 26 bytes", "BIOS Information", "\tVendor: " + b.vendeur, "\tVersion: " + b.version, "\tRelease Date: " + b.date, "\tROM Size: 16 MB", "\tBIOS Revision: 5.27"],
		system: ["Handle 0x0001, DMI type 1, 27 bytes", "System Information", "\tManufacturer: " + s.fabricant, "\tProduct Name: " + s.produit, "\tVersion: " + s.version,
			"\tSerial Number: " + s.serie, "\tUUID: " + axUuid(h), "\tWake-up Type: Power Switch", "\tSKU Number: Not Specified", "\tFamily: " + s.famille],
		baseboard: ["Handle 0x0002, DMI type 2, 15 bytes", "Base Board Information", "\tManufacturer: " + s.fabricant, "\tProduct Name: Carte " + s.produit, "\tVersion: A01", "\tSerial Number: /" + s.serie + "/"],
		processor: ["Handle 0x0004, DMI type 4, 48 bytes", "Processor Information", "\tSocket Designation: CPU0", "\tType: Central Processor", "\tVersion: " + m.cpu.modele,
			"\tMax Speed: " + Math.round(parseFloat(m.cpu.max || m.cpu.mhz)) + " MHz", "\tCore Count: " + m.cpu.coeurs, "\tThread Count: " + (m.cpu.coeurs * m.cpu.threads)],
		memory: ["Handle 0x0010, DMI type 16, 23 bytes", "Physical Memory Array", "\tLocation: System Board Or Motherboard", "\tUse: System Memory", "\tMaximum Capacity: 64 GB", "\tNumber Of Devices: 2", "",
			"Handle 0x0011, DMI type 17, 92 bytes", "Memory Device", "\tSize: " + (parseInt(m.memoire, 10) / 2) + " GB", "\tForm Factor: DIMM", "\tLocator: DIMM0", "\tType: DDR4", "\tSpeed: 3200 MT/s"]
	};
	var numeros = { 0: "bios", 1: "system", 2: "baseboard", 4: "processor", 16: "memory", 17: "memory" };
	var types = p.opts.t || Object.keys(blocs);
	var choisis = [];
	types.forEach(function(t){
		var nom = /^\d+$/.test(t) ? numeros[t] : t;
		if (!blocs[nom]) throw new ShellError("Invalid type keyword: " + t + "\nValid type keywords are:\n  bios\n  system\n  baseboard\n  chassis\n  processor\n  memory\n  cache\n  connector\n  slot", 2);
		if (choisis.indexOf(nom) === -1) choisis.push(nom);
	});
	var sortie = ["# dmidecode 3.4", "Getting SMBIOS data from sysfs.", "SMBIOS 3.2.0 present.", ""];
	choisis.forEach(function(nom){ sortie = sortie.concat(blocs[nom], [""]); });
	return axNoterMateriel("dmidecode", sortie.join("\n").replace(/\n+$/, ""), io);
};

/* ================================================================== */
/* Le manuel : apropos, whatis, man -k, man -f, man SECTION PAGE       */
/* ================================================================== */

/* Les commandes d'administration sont rangées en section 8 ; les formats de fichiers en section 5. */
var AX_SECTION_8 = ["ip", "ifconfig", "route", "arp", "dhclient", "iptables", "nft", "tcpdump", "sysctl", "useradd", "userdel", "usermod", "groupadd", "visudo", "sshd",
	"reboot", "mount", "umount", "fsck", "e2fsck", "mkswap", "swapon", "swapoff", "lvextend", "lvcreate", "lvremove", "pvcreate", "vgextend", "resize2fs", "tune2fs", "mdadm",
	"smartctl", "dmidecode", "lspci", "lsusb", "faillock", "pwck", "grpck", "logrotate", "rsyslogd", "named-checkzone", "iw", "ethtool", "arping", "chage", "lastlog",
	"apachectl", "a2enmod", "a2dismod", "a2ensite", "a2dissite", "auditctl", "ausearch", "aureport", "modprobe", "lsmod", "cryptsetup", "update-grub", "aa-status", "netplan",
	"lldpctl", "iftop", "nethogs", "conntrack", "arp-scan", "fsck.ext4", "setquota", "repquota", "edquota", "hwclock", "fuser", "rfkill", "tracepath", "fail2ban-client", "rkhunter", "lynis"];
var AX_PAGES_FICHIERS = {
	"passwd": { section: 5, resume: "le fichier des comptes", page:
		"/etc/passwd contient une ligne par compte, sept champs séparés par des deux-points :\n\n" +
		"  nom:mot-de-passe:UID:GID:commentaire:dossier:shell\n\n" +
		"  1. nom           l'identifiant de connexion (login)\n" +
		"  2. mot-de-passe  presque toujours « x » : le vrai est rangé dans /etc/shadow, lisible par root seul\n" +
		"  3. UID           le numéro du compte (0 : root ; 1 à 999 : les comptes système ; 1000 et plus : les humains)\n" +
		"  4. GID           le numéro du groupe principal (voir group(5))\n" +
		"  5. commentaire   le nom complet (le champ GECOS)\n" +
		"  6. dossier       le dossier personnel\n" +
		"  7. shell         le programme lancé à la connexion ; /usr/sbin/nologin interdit la connexion\n\n" +
		"Exemple :  " + "laurent:x:1000:1000:Laurent:/home/laurent:/bin/bash\n\n" +
		"VOIR AUSSI : passwd(1) (la commande qui change un mot de passe), shadow(5), group(5)" },
	"shadow": { section: 5, resume: "le fichier des mots de passe chiffrés", page:
		"/etc/shadow, lisible par root seul : nom:empreinte:dernier-changement:min:max:avertissement:inactivité:expiration:\n\n" +
		"  L'empreinte commence par $6$ (sha512-crypt) ou $y$ (yescrypt), suivie du sel puis du résultat.\n" +
		"  ! ou * au début : le mot de passe est verrouillé.\n\n" +
		"VOIR AUSSI : passwd(5), chage(1), crypt(5)" },
	"group": { section: 5, resume: "le fichier des groupes", page:
		"/etc/group : nom:x:GID:membres   (les membres séparés par des virgules)\n\n  sudo:x:27:laurent,vint\n\nVOIR AUSSI : groups(1), usermod(8)" },
	"crontab": { section: 5, resume: "le format des tables de cron", page:
		"Une ligne par tâche : cinq champs de temps, puis la commande.\n\n" +
		"  minute  heure  jour-du-mois  mois  jour-de-la-semaine  commande\n" +
		"  0-59    0-23   1-31          1-12  0-7 (0 et 7 : dimanche)\n\n" +
		"  * : chaque valeur ;  */5 : toutes les 5 ;  1-5 : de 1 à 5 ;  1,15 : le 1 et le 15\n\n" +
		"  30 2 * * 1-5  /usr/local/bin/sauver.sh     à 2 h 30, du lundi au vendredi\n\n" +
		"Dans /etc/crontab et /etc/cron.d, un sixième champ, avant la commande : le compte qui la lance.\n\n" +
		"VOIR AUSSI : crontab(1) (la commande qui édite ta table)" },
	"hosts": { section: 5, resume: "la table statique des noms de machines", page:
		"/etc/hosts : une adresse, puis un ou plusieurs noms. Consulté avant le DNS (voir nsswitch.conf).\n\n  127.0.0.1   localhost\n  10.0.92.20  intranet intra\n\nVOIR AUSSI : resolv.conf(5)" },
	"resolv.conf": { section: 5, resume: "la configuration du résolveur DNS", page:
		"/etc/resolv.conf :\n  nameserver 10.0.92.53     un serveur DNS à interroger (trois au plus)\n  search cybersup.lan       le domaine ajouté aux noms courts\n\nVOIR AUSSI : hosts(5)" },
	"ssh_config": { section: 5, resume: "la configuration du client SSH", page:
		"~/.ssh/config (pour toi) et /etc/ssh/ssh_config (pour tous). Des blocs Host, puis des options :\n\n" +
		"  Host depot\n      HostName 10.0.97.77\n      User cours\n      Port 2222\n      IdentityFile ~/.ssh/depot_ed25519\n      ProxyJump passerelle\n      LocalForward 8080 intranet:80\n\n" +
		"Pour chaque option, la première valeur trouvée gagne : les blocs précis en haut, Host * en bas.\n\nVOIR AUSSI : ssh(1), sshd_config(5)" },
	"sshd_config": { section: 5, resume: "la configuration du serveur SSH", page:
		"/etc/ssh/sshd_config : Port, PermitRootLogin, PasswordAuthentication, AllowUsers, TrustedUserCAKeys...\n" +
		"Après une modification : sudo sshd -t, puis sudo systemctl reload ssh.\n\nVOIR AUSSI : sshd(8), ssh_config(5)" },
	"fstab": { section: 5, resume: "les systèmes de fichiers montés au démarrage", page:
		"/etc/fstab : périphérique  point-de-montage  type  options  dump  fsck\n\n  UUID=4f1c...  /home  ext4  defaults,noexec  0  2\n\nVOIR AUSSI : mount(8), findmnt(8)" },
	"sudoers": { section: 5, resume: "qui peut faire quoi avec sudo", page:
		"/etc/sudoers et /etc/sudoers.d/* (à éditer avec visudo) :\n\n  qui  machines=(en tant que)  commandes\n  %sudo  ALL=(ALL:ALL) ALL\n\n" +
		"Defaults : les réglages (env_reset, secure_path, use_pty, logfile, log_output...).\n\nVOIR AUSSI : visudo(8), sudo(8)" },
	"hier": { section: 7, resume: "la hiérarchie des dossiers du système", page:
		"  /etc   la configuration      /var   ce qui change (journaux, files d'attente)\n  /home  les dossiers des humains  /tmp  le temporaire\n" +
		"  /usr   les programmes      /bin, /sbin  les commandes de base\n  /root  le dossier de root    /dev   les périphériques    /proc  le noyau, vu comme des fichiers" },
	"man": { section: 7, resume: "les sections du manuel", page:
		"Le manuel est rangé en sections :\n  1  les commandes de tout le monde       5  les formats de fichiers\n  2  les appels système                   7  les notions (hier, man...)\n" +
		"  3  les fonctions des bibliothèques      8  les commandes d'administration (root)\n\n" +
		"  man 5 passwd     la page passwd de la section 5 (le fichier), et non celle de la section 1 (la commande)\n" +
		"  whatis passwd    les sections où passwd a une page\n  apropos MOT      les pages dont le nom ou la description contient MOT (comme man -k MOT)" }
};
function axSectionDe(sort){ return AX_SECTION_8.indexOf(sort) > -1 ? 8 : 1; }
/* Toutes les entrées du manuel connues du joueur : [{ nom, section, resume }]. */
function axEntreesManuel(){
	var liste = [];
	state.knownSpells().forEach(function(s){ if (MANUEL[s] && MANUEL[s].resume) liste.push({ nom: s, section: axSectionDe(s), resume: MANUEL[s].resume }); });
	Object.keys(AX_PAGES_FICHIERS).forEach(function(n){ liste.push({ nom: n, section: AX_PAGES_FICHIERS[n].section, resume: AX_PAGES_FICHIERS[n].resume }); });
	liste.sort(function(a, b){ return a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : a.section - b.section; });
	return liste;
}
function axLigneApropos(e){ return completerDroite(e.nom + " (" + e.section + ")", 20) + " - " + e.resume; }
function axApropos(mots, io, et, cmd){
	if (!mots.length) throw new ShellError(cmd + " de quoi ?", 1);
	var mm = mots.map(axSansAccent);
	var trouves = axEntreesManuel().filter(function(e){
		var t = axSansAccent(e.nom + " " + e.resume);
		return et ? mm.every(function(m){ return t.indexOf(m) > -1; }) : mm.some(function(m){ return t.indexOf(m) > -1; });
	});
	var sortie;
	if (!trouves.length){ io.code = 16; sortie = ""; mots.forEach(function(m){ io.err(m + " : rien d'approprié."); }); }
	else sortie = trouves.map(axLigneApropos).join("\n");
	GameEvents.fire({ type: "axMan", cmd: "apropos", sortie: sortie, mots: mots });
	return sortie;
}
function axWhatis(noms, io){
	if (!noms.length) throw new ShellError("whatis de quoi ?", 1);
	var toutes = axEntreesManuel(), lignes = [];
	noms.forEach(function(n){
		var l = toutes.filter(function(e){ return e.nom === n; });
		if (!l.length){ io.err(n + " : rien d'approprié."); io.code = 16; return; }
		l.forEach(function(e){ lignes.push(axLigneApropos(e)); });
	});
	var sortie = lignes.join("\n");
	GameEvents.fire({ type: "axMan", cmd: "whatis", sortie: sortie, mots: noms });
	return sortie;
}
Shell.sorts.apropos = function(args, io){
	var et = args.indexOf("-a") > -1 || args.indexOf("--and") > -1;
	return axApropos(args.filter(function(a){ return !/^-/.test(a); }), io, et, "apropos");
};
Shell.sorts.whatis = function(args, io){ return axWhatis(args.filter(function(a){ return !/^-/.test(a); }), io); };

var MAN_AVANT_ANNEXES = Shell.sorts.man;
Shell.sorts.man = function(args, io){
	if (args[0] === "-k") return axApropos(args.slice(1), io, false, "man -k");
	if (args[0] === "-f") return axWhatis(args.slice(1), io);
	var section = null, reste = args.slice();
	if (reste[0] === "-s" && reste[1]){ section = reste[1]; reste = reste.slice(2); }
	else if (/^[1-9]$/.test(reste[0] || "") && reste.length > 1){ section = reste[0]; reste = reste.slice(1); }
	if (section === null){
		// man passwd.5 n'existe pas ; man hier, man resolv.conf : une page qui n'est pas un sort.
		var seule = reste[0];
		if (seule && !MANUEL[seule] && AX_PAGES_FICHIERS[seule] && reste.length === 1) section = String(AX_PAGES_FICHIERS[seule].section);
		else return MAN_AVANT_ANNEXES.apply(this, arguments);
	}
	var nom = reste[0];
	if (!nom) throw new ShellError("Quelle page de la section " + section + " ? Exemple : man " + section + " passwd");
	var fichier = AX_PAGES_FICHIERS[nom];
	var sortie;
	if (fichier && String(fichier.section) === section){
		sortie = C.gris("La voix du vieil homme résonne dans ta tête, comme venue de très loin :") + "\n\n" +
			C.gras(nom.toUpperCase() + "(" + section + ")") + " : " + fichier.resume + "\n\n" + fichier.page + "\n\n" + C.gris("Souviens-toiiiii...");
		GameEvents.fire({ type: "axMan", cmd: "man", section: +section, page: nom, sortie: sansAnsi(sortie) });
		return sortie;
	}
	var sortConnu = MANUEL[nom] && state.knows(nom);
	if (sortConnu && String(axSectionDe(nom)) === section){
		sortie = MAN_AVANT_ANNEXES.call(this, [nom], io);
		GameEvents.fire({ type: "axMan", cmd: "man", section: +section, page: nom, sortie: sansAnsi(sortie) });
		return sortie;
	}
	io.code = 16;
	var ailleurs = axEntreesManuel().filter(function(e){ return e.nom === nom; }).map(function(e){ return nom + "(" + e.section + ")"; });
	throw new ShellError("Il n'y a pas de page « " + nom + " » dans la section " + section + " du manuel." +
		(ailleurs.length ? axAstuce(io, "(whatis " + nom + " : elle existe en " + ailleurs.join(", ") + ".)") : ""), 16);
};

/* ================================================================== */
/* nc : écouter un port (nc -l), parler à qui écoute                   */
/* ================================================================== */

/* Les habitants qui écoutent ou qui parlent : AX_INTERLOCUTEURS[hote] = { ecoute: { port: fonction(texte, io) }, parle: fonction(ici, port) }. */
var AX_INTERLOCUTEURS = {};
var NC_AVANT_ANNEXES = Shell.sorts.nc;
Shell.sorts.nc = function(args, io){
	var ecoute = false, bavard = false, portOpt = null, mots = [], k;
	for (k = 0; k < args.length; k++){
		var a = args[k];
		if (a === "-p"){ portOpt = args[++k]; continue; }
		if (/^-[a-zA-Z]+$/.test(a)){
			if (a.indexOf("l") > -1) ecoute = true;
			if (a.indexOf("v") > -1) bavard = true;
			if (/p$/.test(a) && a !== "-p" && ecoute){ portOpt = args[++k]; }
			continue;
		}
		mots.push(a);
	}
	var ici = Shell.hote();
	if (!ecoute){
		var h = mots.length >= 2 ? trouverHote(mots[0]) : null;
		var x = h ? HOTES[h] : null;
		if (!x || !x.axSsh || axHotePanne(ici)) return NC_AVANT_ANNEXES.apply(this, arguments);
		if (!axJoignable(h, ici)) throw new ShellError("nc: connect to " + mots[0] + " port " + mots[1] + " (tcp) timed out: Operation now in progress");
		var inter = AX_INTERLOCUTEURS[h], f = inter && inter.ecoute ? inter.ecoute[mots[1]] : null;
		if (!f) throw new ShellError("nc: connect to " + mots[0] + " port " + mots[1] + " (tcp) failed: Connection refused");
		if (io.stdin === null) throw new ShellError("nc : sans rien à envoyer, nc attendrait que tu tapes, ligne par ligne, puis Ctrl+D." +
			axAstuce(io, "(Ici, envoie ton texte par un tuyau, echo \"...\" | nc " + mots[0] + " " + mots[1] + ", ou un fichier : nc " + mots[0] + " " + mots[1] + " < FICHIER.)"));
		var envoye = contenuExact(io.stdin, io.stdinSansFin);
		var reponse = f(envoye, io) || "";
		GameEvents.fire({ type: "axNc", hote: h, port: mots[1], ecoute: false, envoye: envoye, de: ici });
		return (bavard ? "Connection to " + mots[0] + " (" + x.ip + ") " + mots[1] + " port [tcp/*] succeeded!\n" : "") + reponse;
	}
	var port = portOpt || mots.filter(function(m){ return /^\d+$/.test(m); }).pop();
	if (!port || !/^\d+$/.test(port) || +port < 1 || +port > 65535){
		throw new ShellError("nc: missing port number" + axAstuce(io, "(nc -l 5555 : écouter le port 5555. Un numéro au-dessus de 1024 : les autres sont réservés à root.)"));
	}
	if (+port < 1024 && !io.sudo) throw new ShellError("nc: Permission denied" + axAstuce(io, "(Les ports sous 1024 sont réservés à root. Choisis un port au-dessus de 1024.)"));
	var parle = null;
	Object.keys(AX_INTERLOCUTEURS).forEach(function(hh){
		var i2 = AX_INTERLOCUTEURS[hh];
		if (!parle && i2.parle && !axHotePanne(ici)){ var r = i2.parle(ici, port); if (r) parle = { de: hh, texte: r }; }
	});
	if (bavard) io.err("Listening on 0.0.0.0 " + port);
	if (!parle){
		io.code = 1;
		io.err("^C" + axAstuce(io, "(nc écoute le port " + port + " : personne ne s'y connecte. Un vrai nc attendrait sans fin ; Ctrl+C l'arrête. Ici, le jeu l'arrête pour toi.)"));
		GameEvents.fire({ type: "axNc", hote: ici, port: port, ecoute: true, recu: null });
		return "";
	}
	if (bavard) io.err("Connection received on " + parle.de + " " + (40000 + Math.floor(alea("nc-port-" + state.nbCommandes) * 20000)));
	GameEvents.fire({ type: "axNc", hote: ici, port: port, ecoute: true, de: parle.de, recu: parle.texte });
	return parle.texte.replace(/\n$/, "");
};

/* ================================================================== */
/* ssh : la configuration (~/.ssh/config), le rebond, le tunnel, l'agent */
/* ================================================================== */

var AX_MOTS_SSH_CONFIG = ["host", "match", "hostname", "user", "port", "identityfile", "identitiesonly", "proxyjump", "proxycommand", "localforward", "remoteforward",
	"dynamicforward", "forwardagent", "stricthostkeychecking", "userknownhostsfile", "serveraliveinterval", "serveralivecountmax", "connecttimeout", "compression",
	"loglevel", "addkeystoagent", "hashknownhosts", "include", "batchmode", "certificatefile", "requesttty", "sendenv", "setenv", "visualhostkey", "pubkeyauthentication",
	"passwordauthentication", "preferredauthentications", "controlmaster", "controlpath", "controlpersist", "exitonforwardfailure", "gatewayports", "ciphers", "macs", "kexalgorithms"];
/* Lit un fichier de configuration du client : [{ motifs, options: { motcle: [valeurs] } }], ou une erreur comme ssh. */
function axLireConfigSsh(texte, chemin){
	var blocs = [{ motifs: ["*"], options: {}, global: true }], erreurs = [];
	lignesDe(texte || "").forEach(function(brute, n){
		var l = brute.replace(/^\s+|\s+$/g, "");
		if (l === "" || l.charAt(0) === "#") return;
		var m = /^([A-Za-z]+)(?:\s*=\s*|\s+)(.*)$/.exec(l);
		if (!m){ erreurs.push(chemin + ": line " + (n + 1) + ": Bad configuration option: " + l.split(/\s/)[0].toLowerCase()); return; }
		var cle = m[1].toLowerCase(), valeur = m[2].replace(/^"(.*)"$/, "$1");
		if (AX_MOTS_SSH_CONFIG.indexOf(cle) === -1){ erreurs.push(chemin + ": line " + (n + 1) + ": Bad configuration option: " + cle); return; }
		if (cle === "host"){ blocs.push({ motifs: valeur.split(/\s+/), options: {} }); return; }
		if (cle === "match"){ blocs.push({ motifs: ["!*"], options: {} }); return; }
		var b = blocs[blocs.length - 1];
		(b.options[cle] = b.options[cle] || []).push(valeur);
	});
	return { blocs: blocs, erreurs: erreurs };
}
function axMotifSsh(motif, nom){
	var re = new RegExp("^" + motif.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
	return re.test(nom);
}
/* Les options qui s'appliquent à un nom : la première valeur trouvée gagne (IdentityFile et LocalForward s'additionnent). */
function axOptionsSsh(conf, nom){
	var r = {}, vus = [];
	conf.blocs.forEach(function(b){
		var neg = b.motifs.some(function(m){ return m.charAt(0) === "!" && axMotifSsh(m.substring(1), nom); });
		var oui = b.motifs.some(function(m){ return m.charAt(0) !== "!" && axMotifSsh(m, nom); });
		if (neg || !oui) return;
		if (!b.global) vus.push(b.motifs.join(" "));
		Object.keys(b.options).forEach(function(k){
			if (k === "identityfile" || k === "localforward") r[k] = (r[k] || []).concat(b.options[k]);
			else if (!r.hasOwnProperty(k)) r[k] = b.options[k][0];
		});
	});
	r.__blocs = vus;
	return r;
}
function axLireOptionsLigneSsh(args){
	var o = { drapeaux: {}, L: [], J: null, p: null, i: [], l: null, F: null, O: {}, cible: null, commande: [], erreur: null };
	for (var k = 0; k < args.length; k++){
		var a = args[k];
		if (o.cible !== null){ o.commande.push(a); continue; }
		if (a.length > 1 && a.charAt(0) === "-"){
			for (var c = 1; c < a.length; c++){
				var lettre = a.charAt(c);
				if ("BbcDEeFIiJLlmOoPpQRSWw".indexOf(lettre) > -1){
					var v = a.substring(c + 1);
					if (v === ""){ k++; v = args[k]; }
					if (v === undefined){ o.erreur = "option requires an argument -- " + lettre; return o; }
					if (lettre === "L") o.L.push(v);
					else if (lettre === "J") o.J = v;
					else if (lettre === "p") o.p = v;
					else if (lettre === "i") o.i.push(v);
					else if (lettre === "l") o.l = v;
					else if (lettre === "F") o.F = v;
					else if (lettre === "o"){ var mm = /^\s*([A-Za-z]+)\s*[= ]\s*(.*)$/.exec(v); if (mm) o.O[mm[1].toLowerCase()] = mm[2]; }
					break;
				}
				o.drapeaux[lettre] = true;
			}
			continue;
		}
		o.cible = a;
	}
	return o;
}
/* Un chemin à la façon de ssh : ~ est la Maison. */
function axCheminSsh(c){ return String(c || "").replace(/^~(?=\/|$)/, "~"); }
function axLireFichierSsh(chemin){
	try { var r = Shell.chercher(axCheminSsh(chemin), { sudo: true }, "ssh"); return r.node instanceof Item ? r.node : null; } catch (e){ return null; }
}
/* La configuration effective d'une connexion : { alias, hostname, user, port, identites, rebond, renvois, viaConfig, erreurs }. */
function axConfigConnexion(o){
	var cible = o.cible, user = null;
	if (cible.indexOf("@") > -1){ user = cible.substring(0, cible.lastIndexOf("@")); cible = cible.substring(cible.lastIndexOf("@") + 1); }
	var chemin = o.F || "~/.ssh/config";
	var item = axLireFichierSsh(chemin);
	if (o.F && !item) return { erreurs: ["Can't open user config file " + o.F + ": No such file or directory"] };
	var conf = item ? axLireConfigSsh(item.getText(), o.F || axCheminMaison() + "/.ssh/config") : { blocs: [], erreurs: [] };
	if (conf.erreurs.length) return { erreurs: conf.erreurs.concat([(o.F || axCheminMaison() + "/.ssh/config") + ": terminating, " + conf.erreurs.length + " bad configuration options"]) };
	if (item && /w/.test(item.mode.substring(3))) return { erreurs: ["Bad owner or permissions on " + axCheminMaison() + "/.ssh/config"] };
	var c = axOptionsSsh(conf, cible);
	var hostname = (o.O.hostname || c.hostname || cible).replace(/%h/g, cible);
	return {
		alias: cible, hostname: hostname,
		user: user || o.l || o.O.user || c.user || null,
		port: String(o.p || o.O.port || c.port || "22"),
		identites: o.i.concat(o.O.identityfile ? [o.O.identityfile] : [], c.identityfile || []),
		rebond: (o.J || o.O.proxyjump || c.proxyjump || null),
		rebondLigne: !!(o.J || o.O.proxyjump), rebondConfig: !o.J && !o.O.proxyjump && !!c.proxyjump && c.proxyjump !== "none",
		renvois: o.L.concat((c.localforward || []).map(function(v){ var m = /^(\S+)\s+(\S+)$/.exec(v); return m ? m[1] + ":" + m[2] : v; })),
		strict: (o.O.stricthostkeychecking || c.stricthostkeychecking || "ask").toLowerCase(),
		viaConfig: c.__blocs.length > 0, blocs: c.__blocs, erreurs: [], conf: conf
	};
}

/* --- Les clés privées (celles des habitants, et celle du joueur) --- */
/* AX_CLES[texte de la clé privée] = { nom, phrase, commentaire, type, publique } : une clé se reconnaît à son contenu, même copiée. */
var AX_CLES = {};
function axDeclarerCle(def){
	var octets = axOctetsAlea("cle-pub-" + def.nom, 32);
	var blob = [0, 0, 0, 11].concat(axOctetsTexte("ssh-ed25519"), [0, 0, 0, 32], octets);
	def.publique = "ssh-ed25519 " + axBase64(blob) + (def.commentaire ? " " + def.commentaire : "");
	def.empreinte = "SHA256:" + axBase64(axSha256(blob)).replace(/=+$/, "");
	var lignes = ["-----BEGIN OPENSSH PRIVATE KEY-----"];
	for (var i = 0; i < 5; i++) lignes.push(axBase64(axOctetsAlea("cle-priv-" + def.nom + "-" + i, 52)).substring(0, 70));
	lignes.push("-----END OPENSSH PRIVATE KEY-----");
	def.privee = lignes.join("\n");
	AX_CLES[def.privee] = def;
	return def;
}
/* L'empreinte d'une clé publique « ssh-ed25519 BASE64 ... » : SHA256 du blob, en base64 sans les = de la fin. */
function axEmpreinteCle(ligne){
	var m = /^(\S+)\s+(\S+)/.exec(String(ligne || "").trim());
	var blob = m ? axDepuisBase64(m[2]) : null;
	return blob ? "SHA256:" + axBase64(axSha256(blob)).replace(/=+$/, "") : null;
}
function axCleDe(item){
	if (!item) return null;
	var t = item.getText();
	if (AX_CLES[t]) return AX_CLES[t];
	// La clé du joueur (ssh-keygen) : sa phrase n'est pas gardée par le jeu ; on la traite comme sans phrase.
	if (typeof state !== "undefined" && state.clePublique && /^-----BEGIN OPENSSH PRIVATE KEY-----/.test(t)){
		return { nom: "joueur", phrase: "", commentaire: JOUEUR + "@terminus", publique: state.clePublique, empreinte: axEmpreinteCle(state.clePublique), joueur: true };
	}
	return null;
}
/* L'agent : state.reseau.axAgent = { pid, sock, cles: [noms] }. Joignable si SSH_AUTH_SOCK le désigne. */
function axAgent(){
	var a = state.reseau && state.reseau.axAgent;
	if (!a || !a.sock) return null;
	return Shell.variable("SSH_AUTH_SOCK") === a.sock ? a : null;
}
function axCleParNom(nom){ for (var t in AX_CLES) if (AX_CLES.hasOwnProperty(t) && AX_CLES[t].nom === nom) return AX_CLES[t]; return null; }

/* --- Les clés d'hôte (known_hosts) --- */
function axCleHote(h){
	var x = HOTES[h] || {};
	if (x.axCleHote) return typeof x.axCleHote === "function" ? x.axCleHote() : x.axCleHote;
	// Le Bastion : sa vraie clé, celle de /etc/ssh/ssh_host_ed25519_key.pub.
	if (typeof texteHote === "function"){ var t = texteHote(h, "/etc/ssh/ssh_host_ed25519_key.pub"); if (t) return t.split(/\s+/).slice(0, 2).join(" "); }
	var octets = axOctetsAlea("cle-hote-" + h, 32);
	return "ssh-ed25519 " + axBase64([0, 0, 0, 11].concat(axOctetsTexte("ssh-ed25519"), [0, 0, 0, 32], octets));
}
function axKnownHosts(creer){
	var d = axDossierSsh(creer);
	if (!d) return null;
	var it = d.getItemFromName("known_hosts");
	if (it !== -1) return it;
	if (!creer) return null;
	it = new Item("known_hosts", "", "item_locker.gif").droits("rw-r--r--", JOUEUR);
	it.sansFinDeLigne = false;
	d.addItem(it);
	return it;
}
/* Une ligne de known_hosts correspond-elle à ce nom ? (noms en clair, séparés par des virgules, ou hachés |1|sel|empreinte) */
function axLigneKnownHosts(ligne, noms){
	var champs = String(ligne).trim().split(/\s+/);
	if (champs.length < 3 || champs[0].charAt(0) === "#") return false;
	if (champs[0].indexOf("|1|") === 0) return noms.some(function(n){ return axHacherNom(n, champs[0].split("|")[2]) === champs[0]; });
	return champs[0].split(",").some(function(n){ return noms.indexOf(n.replace(/^\[(.*)\]:22$/, "$1")) > -1; });
}
function axHacherNom(nom, sel){
	// |1|SEL|HMAC-SHA1(sel, nom) en vrai ; ici un HMAC simplifié, stable et de la même forme.
	var octets = axSha256(axDepuisBase64(sel || "").concat(axOctetsTexte(nom))).slice(0, 20);
	return "|1|" + sel + "|" + axBase64(octets);
}

/* --- Les tunnels (ssh -L) --- */
function axTunnels(){ if (!state.reseau.axTunnels) state.reseau.axTunnels = []; return state.reseau.axTunnels; }
function axTunnelVivant(t){
	if (t.session) return Shell.pile_ssh.length > 0;
	var lieu = typeof lieuParChemin === "function" ? lieuParChemin(t.lieu) : null;
	return !!(lieu && lieu.getProc && lieu.getProc(t.pid));
}
function axTunnelVers(hote, port){
	var l = axTunnels().filter(function(t){ return t.hote === hote && String(t.port) === String(port) && axTunnelVivant(t); });
	return l[0] || null;
}

/* --- La connexion --- */
var SSH_AVANT_ANNEXES = Shell.sorts.ssh;
function axErreurSsh(message, io){ var e = new ShellError(message, 255); return e; }
Shell.sorts.ssh = function(args, io){
	var o = axLireOptionsLigneSsh(args);
	if (o.erreur) throw axErreurSsh(o.erreur + "\nusage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address]\n           [-c cipher_spec] [-D [bind_address:]port] [-E log_file] [-e escape_char]\n           [-F configfile] [-I pkcs11] [-i identity_file] [-J destination] [-L address]\n           [-l login_name] [-m mac_spec] [-O ctl_cmd] [-o option] [-P tag] [-p port]\n           [-R address] [-S ctl_path] [-W host:port] [-w local_tun[:remote_tun]]\n           destination [command [argument ...]]");
	if (o.cible === null) return SSH_AVANT_ANNEXES.apply(this, arguments);
	if (typeof examenEnCours === "function" && examenEnCours()) return SSH_AVANT_ANNEXES.apply(this, arguments);
	var c = axConfigConnexion(o);
	if (c.erreurs.length) throw axErreurSsh(c.erreurs.join("\n"));
	var ici = Shell.hote();
	var h = trouverHote(c.hostname);
	var annexe = !!(h && HOTES[h].axSsh);
	var avance = !!(c.rebond || c.renvois.length || o.drapeaux.N || o.commande.length && annexe);
	if (!annexe && !avance){
		// Rien de nouveau : l'ancien ssh, avec le nom réel si la configuration en donnait un autre.
		if (c.port !== "22") throw axErreurSsh("ssh: connect to host " + c.hostname + " port " + c.port + ": Connection refused");
		if (!c.viaConfig && !c.user) return SSH_AVANT_ANNEXES.apply(this, arguments);
		var u = c.user && c.user !== JOUEUR ? c.user + "@" : "";
		return SSH_AVANT_ANNEXES.call(this, [u + c.hostname], io);
	}
	if (axHotePanne(ici)) throw axErreurSsh("ssh: Could not resolve hostname " + c.hostname + ": Temporary failure in name resolution");
	// Le rebond : on rejoint d'abord la machine intermédiaire, puis la cible depuis elle.
	var depart = ici, rebond = null;
	if (c.rebond && c.rebond !== "none"){
		var cj = axConfigConnexion({ cible: c.rebond.replace(/:(\d+)$/, ""), drapeaux: {}, L: [], i: [], O: {}, p: (/:(\d+)$/.exec(c.rebond) || [])[1] || null, l: null, F: o.F });
		var hj = cj.erreurs.length ? null : trouverHote(cj.hostname);
		if (!hj) throw axErreurSsh("ssh: Could not resolve hostname " + (cj.hostname || c.rebond) + ": Name or service not known\nkex_exchange_identification: Connection closed by remote host\nConnection closed by UNKNOWN port 65535");
		if (!axJoignable(hj, ici)) throw axErreurSsh("ssh: connect to host " + HOTES[hj].ip + " port 22: Connection timed out\nkex_exchange_identification: Connection closed by remote host\nConnection closed by UNKNOWN port 65535");
		var refusJ = axAuthentifier(hj, cj, io, true);
		if (refusJ) throw axErreurSsh(refusJ);
		rebond = hj;
		depart = hj;
	}
	if (!h) throw axErreurSsh("ssh: Could not resolve hostname " + c.hostname + ": Name or service not known");
	var x = HOTES[h];
	if (!axJoignable(h, depart)){
		throw axErreurSsh("ssh: connect to host " + (x.ip || c.hostname) + " port " + c.port + ": Connection timed out" +
			axAstuce(io, "(La machine ne répond pas d'ici : elle n'est joignable que de son propre réseau. Un rebond, peut-être ? man ssh, l'option -J.)"));
	}
	var portAttendu = String(x.axPort || 22);
	if (c.port !== portAttendu) throw axErreurSsh("ssh: connect to host " + (x.ip || c.hostname) + " port " + c.port + ": Connection refused");
	if (!annexe){
		// Une machine du jeu atteinte par un rebond ou avec un tunnel : l'ancien ssh s'en charge.
		return SSH_AVANT_ANNEXES.call(this, [h], io);
	}
	// La clé de la machine (known_hosts) : seulement pour les machines qui le demandent (axVerifierCle).
	var suite = function(){
		var refus = axAuthentifier(h, c, io, false, function(){ return axConnecter(h, c, o, io, rebond, ici); });
		if (refus === "attente") return "";
		if (refus) throw axErreurSsh(refus);
		return axConnecter(h, c, o, io, rebond, ici);
	};
	if (x.axVerifierCle){
		var v = axVerifierCleHote(h, c, io, function(){ var s = ""; try { s = suite(); } catch (e){ if (!(e instanceof ShellError)) throw e; s = e.message; } if (s) term.echo(s); Shell.fin(); });
		if (v === "attente") return "";
		if (v) throw axErreurSsh(v);
	}
	return suite();
};
/* Vérifie la clé de l'hôte contre ~/.ssh/known_hosts. Renvoie null (connue et bonne), un message d'erreur, ou "attente" (question posée). */
function axVerifierCleHote(h, c, io, continuer){
	var x = HOTES[h], cle = axCleHote(h), empreinte = axEmpreinteCle(cle);
	var kh = axKnownHosts(false), lignes = kh ? lignesDe(kh.getText()) : [];
	var noms = [c.alias === c.hostname ? h : c.alias, h, x.ip].filter(function(v, i, t){ return v && t.indexOf(v) === i; });
	var connues = [];
	lignes.forEach(function(l, i){ if (axLigneKnownHosts(l, noms) && l.trim().split(/\s+/)[1] === "ssh-ed25519") connues.push({ ligne: l, n: i + 1 }); });
	if (connues.length){
		if (connues.some(function(k){ return k.ligne.trim().split(/\s+/)[2] === cle.split(/\s+/)[1]; })) return null;
		var cheminKh = axCheminMaison() + "/.ssh/known_hosts";
		GameEvents.fire({ type: "axSshCleChangee", hote: h });
		return "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n" +
			"IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!\nSomeone could be eavesdropping on you right now (man-in-the-middle attack)!\nIt is also possible that a host key has just been changed.\n" +
			"The fingerprint for the ED25519 key sent by the remote host is\n" + empreinte + ".\nPlease contact your system administrator.\n" +
			"Add correct host key in " + cheminKh + " to get rid of this message.\nOffending ED25519 key in " + cheminKh + ":" + connues[0].n + "\n" +
			"  remove with:\n  ssh-keygen -f \"" + cheminKh + "\" -R \"" + noms[0] + "\"\nHost key for " + noms[0] + " has changed and you have requested strict checking.\nHost key verification failed." +
			axAstuce(io, "(ssh refuse : la clé que présente la machine n'est pas celle qu'il a gardée. Une machine réinstallée, ou quelqu'un au milieu. On vérifie l'empreinte AVANT de faire confiance.)");
	}
	if (c.strict === "yes") return "No ED25519 host key is known for " + noms[0] + " and you have requested strict checking.\nHost key verification failed.";
	var ajouter = function(){
		var k = axKnownHosts(true);
		k.setText((k.getText() === "" ? "" : k.getText().replace(/\n$/, "") + "\n") + noms[0] + " " + cle);
		GameEvents.fire({ type: "axKnownHosts", hote: h, action: "ajout" });
	};
	if (c.strict === "accept-new" || c.strict === "no"){
		ajouter();
		io.err("Warning: Permanently added '" + noms[0] + "' (ED25519) to the list of known hosts.");
		return null;
	}
	if (!term || !term.demander) return "Host key verification failed.";
	term.demander("The authenticity of host '" + noms[0] + " (" + x.ip + ")' can't be established.\nED25519 key fingerprint is " + empreinte + ".\nThis key is not known by any other names.\n" +
		"Are you sure you want to continue connecting (yes/no/[fingerprint])? ", false, function(reponse){
		var r = String(reponse).trim();
		if (r === "yes" || r === empreinte){
			ajouter();
			term.echo("Warning: Permanently added '" + noms[0] + "' (ED25519) to the list of known hosts.");
			GameEvents.fire({ type: "axSshConfiance", hote: h, empreinte: r === empreinte });
			continuer();
			return;
		}
		term.echo(r === "no" ? "Host key verification failed." : "Please type 'yes', 'no' or the fingerprint: \nHost key verification failed.");
		Shell.fin();
	});
	return "attente";
}
/* L'authentification : renvoie null (acceptée), un message de refus, ou "attente" (une phrase de passe est demandée). */
function axAuthentifier(h, c, io, silencieux, continuer){
	var x = HOTES[h], user = c.user || JOUEUR;
	var comptes = x.axComptes || null;
	if (!comptes) return user === JOUEUR ? null : user + "@" + c.hostname + ": Permission denied (publickey,password).";
	var compte = comptes[user];
	if (!compte) return user + "@" + c.hostname + ": Permission denied (publickey).";
	if (!compte.cle){ c.agentUtilise = false; return null; }
	var attendue = axCleParNom(compte.cle);
	// D'abord l'agent : il a la clé, déverrouillée.
	var agent = axAgent();
	if (agent && agent.cles.indexOf(compte.cle) > -1){ c.agentUtilise = true; return null; }
	// Puis les fichiers : ceux de -i et d'IdentityFile, puis les noms par défaut.
	var fichiers = c.identites.slice();
	["~/.ssh/id_ed25519", "~/.ssh/id_ecdsa", "~/.ssh/id_rsa"].forEach(function(f){ if (fichiers.indexOf(f) === -1) fichiers.push(f); });
	var avert = [];
	for (var i = 0; i < fichiers.length; i++){
		var it = axLireFichierSsh(fichiers[i]);
		if (!it){ if (c.identites.indexOf(fichiers[i]) > -1) avert.push("Warning: Identity file " + fichiers[i] + " not accessible: No such file or directory."); continue; }
		var cle = axCleDe(it);
		if (!cle || cle !== attendue) continue;
		if (/r/.test(it.mode.substring(3))){
			avert.push("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n" +
				"Permissions 0" + modeEnNombre(it.mode).toString(8) + " for '" + fichiers[i] + "' are too open.\nIt is required that your private key files are NOT accessible by others.\nThis private key will be ignored.\nLoad key \"" + fichiers[i] + "\": bad permissions");
			continue;
		}
		c.cleFichier = fichiers[i];
		if (!cle.phrase){ c.agentUtilise = false; return null; }
		if (silencieux || !continuer || !term || !term.demander) return "Load key \"" + fichiers[i] + "\": incorrect passphrase supplied to decrypt private key\n" + user + "@" + c.hostname + ": Permission denied (publickey).";
		var fichier = fichiers[i];
		avert.forEach(function(a){ io.err(a); });
		term.demander("Enter passphrase for key '" + fichier + "': ", true, function(phrase){
			if (phrase !== cle.phrase){
				term.echo(user + "@" + c.hostname + ": Permission denied (publickey)." + (io.tty ? "\n" + C.gris("(Mauvaise phrase de passe : la clé reste verrouillée.)") : ""));
				GameEvents.fire({ type: "axSshPhrase", ok: false, hote: h });
				Shell.fin();
				return;
			}
			GameEvents.fire({ type: "axSshPhrase", ok: true, hote: h });
			c.agentUtilise = false;
			var s = "";
			try { s = continuer(); } catch (e){ if (!(e instanceof ShellError)) throw e; s = e.message; }
			if (s) term.echo(s);
			Shell.fin();
		});
		return "attente";
	}
	return avert.concat([user + "@" + c.hostname + ": Permission denied (publickey)."]).join("\n");
}
/* La connexion elle-même : un tunnel, une commande à distance, ou une session. */
function axConnecter(h, c, o, io, rebond, origine){
	var x = HOTES[h];
	var evt = { type: "axSsh", hote: h, alias: c.alias, viaConfig: c.viaConfig, blocs: c.blocs, rebond: rebond, rebondLigne: c.rebondLigne, rebondConfig: c.rebondConfig,
		agent: !!c.agentUtilise, user: c.user || JOUEUR, port: c.port,
		cleFichier: c.cleFichier || null, tunnel: null, commande: o.commande.join(" "), session: false };
	// Les tunnels : -L PORT:CIBLE:PORTCIBLE.
	var nouveaux = [];
	c.renvois.forEach(function(r){
		var m = /^(?:(\S+):)?(\d+):([^:]+):(\d+)$/.exec(r);
		if (!m) throw axErreurSsh("Bad local forwarding specification '" + r + "'");
		if (+m[2] < 1024 && !io.sudo) throw axErreurSsh("Privileged ports can only be forwarded by root.");
		if (axTunnelVers(origine, m[2])) throw axErreurSsh("bind [127.0.0.1]:" + m[2] + ": Address already in use\nchannel_setup_fwd_listener_tcpip: cannot listen to port: " + m[2] + "\nCould not request local forwarding.");
		nouveaux.push({ hote: origine, port: +m[2], cible: m[3], portCible: +m[4], via: h });
	});
	if (o.drapeaux.N){
		if (!nouveaux.length) return "";
		if (!o.drapeaux.f){
			return C.gris("(ssh -N ouvre le tunnel sans session et garde le terminal tant qu'il vit : Ctrl+C le ferme. Ici, le jeu le referme aussitôt. Ajoute -f pour qu'il passe en arrière-plan : ssh -f -N -L ...)");
		}
		var pid = 30000 + Math.floor(alea("tunnel-" + state.nbCommandes) * 9000);
		var ligne = "ssh -f -N " + c.renvois.map(function(r){ return "-L " + r; }).join(" ") + " " + c.alias;
		current_room.addProc(pid, ligne, JOUEUR, { tunnel: true });
		nouveaux.forEach(function(t){ t.pid = pid; t.lieu = current_room.path(); axTunnels().push(t); });
		evt.tunnel = nouveaux;
		GameEvents.fire(evt);
		return "";
	}
	if (o.commande.length){
		var avant = current_room, resultat;
		current_room = x.arrivee();
		try { resultat = Interpreteur.capturer(o.commande.join(" "), { portee: "enfant" }); }
		finally { current_room = avant; }
		io.code = resultat.code;
		if (resultat.erreurs) io.err(resultat.erreurs.replace(/\n$/, ""));
		GameEvents.fire(evt);
		return String(resultat.sortie || "").replace(/\n$/, "");
	}
	if (Shell.hote() === h) throw axErreurSsh("Tu es déjà sur " + h + " : regarde ton invite, juste après l'arobase.");
	nouveaux.forEach(function(t){ t.session = true; t.pid = 0; t.lieu = ""; axTunnels().push(t); });
	var sortie = SSH_AVANT_ANNEXES.call(this, [h], io);
	evt.session = true;
	evt.tunnel = nouveaux.length ? nouveaux : null;
	GameEvents.fire(evt);
	var debut = (rebond ? C.gris("(par " + rebond + ")") + "\n" : "") + (x.axBienvenue ? (typeof x.axBienvenue === "function" ? x.axBienvenue() : x.axBienvenue) + "\n" : "");
	return debut + sortie;
}
/* Un tunnel ouvert avec une session (sans -N) se referme avec elle. */
var EXIT_AVANT_ANNEXES = Shell.sorts.exit;
Shell.sorts.exit = function(args, io){
	var r = EXIT_AVANT_ANNEXES.apply(this, arguments);
	try { if (state.reseau && state.reseau.axTunnels) state.reseau.axTunnels = state.reseau.axTunnels.filter(function(t){ return !t.session || Shell.pile_ssh.length > 0; }); } catch (e){}
	return r;
};

/* --- curl à travers un tunnel, ou vers un site d'une machine des annexes --- */
var CURL_AVANT_ANNEXES = Shell.sorts.curl;
Shell.sorts.curl = function(args, io){
	var url = null, k, o = { o: null, O: false, s: false, I: false, i: false };
	for (k = 0; k < args.length; k++){
		var a = args[k];
		if (a === "-o" || a === "--output"){ o.o = args[++k]; continue; }
		if (/^-[a-zA-Z]+$/.test(a)){ if (a.indexOf("O") > -1) o.O = true; if (a.indexOf("s") > -1) o.s = true; if (a.indexOf("I") > -1) o.I = true; if (a.indexOf("i") > -1) o.i = true; continue; }
		if (a.charAt(0) !== "-" && url === null) url = a;
	}
	var m = url ? /^(?:(https?):\/\/)?([^\/:]+)(?::(\d+))?(\/.*)?$/.exec(url) : null;
	if (!m) return CURL_AVANT_ANNEXES.apply(this, arguments);
	var nom = m[2], port = m[3] || (m[1] === "https" ? "443" : "80"), chemin = m[4] || "/", ici = Shell.hote();
	var cible = null, viaTunnel = null;
	if (nom === "localhost" || nom === "127.0.0.1"){
		viaTunnel = axTunnelVers(ici, port);
		if (!viaTunnel){
			if (!AX_SITES_LOCAUX[ici + ":" + port]){
				if (m[3] && port !== "80" && port !== "443"){ io.code = 7; throw new ShellError("curl: (7) Failed to connect to " + nom + " port " + port + " after 0 ms: Couldn't connect to server", 7); }
				return CURL_AVANT_ANNEXES.apply(this, arguments);
			}
			cible = ici;
		} else cible = trouverHote(viaTunnel.cible);
		if (!cible){ io.code = 52; throw new ShellError("curl: (52) Empty reply from server"); }
	} else {
		var h = trouverHote(nom);
		if (!h || !HOTES[h].axWeb) return CURL_AVANT_ANNEXES.apply(this, arguments);
		if (axHotePanne(ici)) throw new ShellError("curl: (6) Could not resolve host: " + nom, 6);
		if (!axJoignable(h, ici)){ io.code = 28; throw new ShellError("curl: (28) Failed to connect to " + nom + " port " + port + " after 133101 ms: Couldn't connect to server", 28); }
		cible = h;
	}
	var x = HOTES[cible] || {};
	if (!x.axWeb){ throw new ShellError("curl: (56) Recv failure: Connection reset by peer", 56); }
	if (viaTunnel && !axJoignable(cible, viaTunnel.via)) throw new ShellError("channel 2: open failed: connect failed: Connection timed out\ncurl: (52) Empty reply from server", 52);
	var racine = x.axWeb();
	var morceaux = chemin.replace(/\?.*$/, "").split("/").filter(Boolean), lieu = racine, item = null;
	if (!morceaux.length || chemin.charAt(chemin.length - 1) === "/") morceaux.push("index.html");
	for (k = 0; k < morceaux.length && lieu; k++){
		var n = lieu.getNode(morceaux[k]);
		if (k === morceaux.length - 1) item = n instanceof Item ? n : null;
		else lieu = n instanceof Room ? n : null;
	}
	var code = item ? 200 : 404;
	var corps = item ? item.getText() : "<!DOCTYPE html>\n<html><head><title>404 Not Found</title></head><body><h1>Not Found</h1></body></html>";
	var entete = "HTTP/1.1 " + code + (code === 200 ? " OK" : " Not Found") + "\nServer: nginx\nContent-Type: " + (/\.txt$/.test(chemin) ? "text/plain; charset=utf-8" : "text/html; charset=utf-8") + "\nContent-Length: " + versOctetsUtf8(corps).length;
	GameEvents.fire({ type: "axCurl", hote: cible, chemin: chemin, code: code, tunnel: viaTunnel, item: item, de: ici });
	if (o.I) return entete;
	if (o.o || o.O){
		var nomFichier = o.o || (morceaux[morceaux.length - 1] || "index.html");
		Shell.ecrire(nomFichier, corps, false);
		if (!o.s) io.err("  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n100  " + completerGauche(versOctetsUtf8(corps).length, 4) + "  100  " + completerGauche(versOctetsUtf8(corps).length, 4) + "    0     0  41520      0 --:--:-- --:--:-- --:--:-- 42000");
		return "";
	}
	return (o.i ? entete + "\n\n" : "") + corps;
};
var AX_SITES_LOCAUX = {};

/* ================================================================== */
/* ssh-agent et ssh-add                                                */
/* ================================================================== */

Shell.sorts["ssh-agent"] = function(args, io){
	var p = lireOptionsGNU(args, "ssh-agent", "kscd", "at", {});
	var a = state.reseau.axAgent;
	if (p.opts.k){
		if (!Shell.variable("SSH_AGENT_PID")) throw new ShellError("SSH_AGENT_PID not set, cannot kill agent", 1);
		if (!a || String(a.pid) !== Shell.variable("SSH_AGENT_PID")){ throw new ShellError("kill: No such process", 1); }
		state.reseau.axAgent = null;
		GameEvents.fire({ type: "axAgent", action: "fin", cles: [] });
		return "unset SSH_AUTH_SOCK;\nunset SSH_AGENT_PID;\necho Agent pid " + a.pid + " killed;";
	}
	var pid = 2000 + Math.floor(alea("agent-" + state.nbCommandes) * 6000);
	var sock = "/tmp/ssh-" + axBase64(axOctetsAlea("sock-" + state.nbCommandes, 9)).replace(/[^A-Za-z0-9]/g, "x").substring(0, 12) + "/agent." + (pid - 1);
	state.reseau.axAgent = { pid: pid, sock: sock, cles: [] };
	GameEvents.fire({ type: "axAgent", action: "lance", cles: [] });
	if (p.opts.c) return "setenv SSH_AUTH_SOCK " + sock + ";\nsetenv SSH_AGENT_PID " + pid + ";\necho Agent pid " + pid + ";";
	return "SSH_AUTH_SOCK=" + sock + "; export SSH_AUTH_SOCK;\nSSH_AGENT_PID=" + pid + "; export SSH_AGENT_PID;\necho Agent pid " + pid + ";" +
		(io.tty ? "\n" + C.gris("(L'agent tourne, mais ton shell ne sait pas encore le trouver : ces lignes sont à exécuter. eval \"$(ssh-agent -s)\" le fait d'un coup.)") : "");
};
Shell.sorts["ssh-add"] = function(args, io){
	var p = lireOptionsGNU(args, "ssh-add", "lLDdqvkKcX", "t", {});
	var a = axAgent();
	if (!a) throw new ShellError("Could not open a connection to your authentication agent." + axAstuce(io, "(Pas d'agent joignable : lance-le avec eval \"$(ssh-agent -s)\", qui pose SSH_AUTH_SOCK dans ton shell.)"), 2);
	if (p.opts.l || p.opts.L){
		GameEvents.fire({ type: "axAgent", action: "liste", cles: a.cles.slice() });
		if (!a.cles.length){ io.code = 1; return "The agent has no identities."; }
		return a.cles.map(function(n){ var k = axCleParNom(n); return p.opts.L ? k.publique : "256 " + k.empreinte + " " + (k.commentaire || "") + " (ED25519)"; }).join("\n");
	}
	if (p.opts.D){
		var avant = a.cles.length;
		a.cles = [];
		GameEvents.fire({ type: "axAgent", action: "vide", cles: [], avant: avant });
		return "All identities removed.";
	}
	var fichiers = p.reste.length ? p.reste : ["~/.ssh/id_ed25519", "~/.ssh/id_rsa", "~/.ssh/id_ecdsa"].filter(function(f){ return !!axLireFichierSsh(f); });
	if (!fichiers.length){ io.code = 1; return ""; }
	if (p.opts.d){
		var sortie = [];
		fichiers.forEach(function(f){
			var k = axCleDe(axLireFichierSsh(f));
			if (!k || a.cles.indexOf(k.nom) === -1){ io.err("Could not remove identity \"" + f + "\": agent refused operation"); io.code = 1; return; }
			a.cles.splice(a.cles.indexOf(k.nom), 1);
			sortie.push("Identity removed: " + f + " (" + (k.commentaire || "") + ")");
		});
		GameEvents.fire({ type: "axAgent", action: "retire", cles: a.cles.slice() });
		return sortie.join("\n");
	}
	var restants = fichiers.slice(), messages = [];
	function suivant(){
		while (restants.length){
			var f = restants.shift();
			var it = axLireFichierSsh(f);
			if (!it){ messages.push(f + ": No such file or directory"); continue; }
			var k = axCleDe(it);
			if (!k){ messages.push("Error loading key \"" + f + "\": invalid format"); continue; }
			if (/r/.test(it.mode.substring(3))){
				messages.push("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n" +
					"Permissions 0" + modeEnNombre(it.mode).toString(8) + " for '" + f + "' are too open.\nIt is required that your private key files are NOT accessible by others.\nThis private key will be ignored.");
				continue;
			}
			if (k.joueur && !AX_CLES[it.getText()]){ AX_CLES[it.getText()] = { nom: "joueur", phrase: "", commentaire: k.commentaire, publique: k.publique, empreinte: k.empreinte, privee: it.getText(), joueur: true }; }
			if (!k.phrase){ ajouter(k, f); continue; }
			if (!term || !term.demander){ messages.push("Error loading key \"" + f + "\": incorrect passphrase supplied to decrypt private key"); continue; }
			term.demander("Enter passphrase for " + f + ": ", true, function(phrase){
				if (phrase !== k.phrase){
					term.echo("Bad passphrase, try again for " + f + ": " + C.gris("(mauvaise phrase de passe : la clé n'est pas ajoutée)"));
					GameEvents.fire({ type: "axAgent", action: "refus", cles: a.cles.slice() });
				} else ajouter(k, f);
				if (messages.length) term.echo(messages.join("\n"));
				messages = [];
				if (restants.length) suivant(); else Shell.fin();
			});
			return true;
		}
		return false;
	}
	function ajouter(k, f){
		if (a.cles.indexOf(k.nom) === -1) a.cles.push(k.nom);
		messages.push("Identity added: " + f + " (" + (k.commentaire || "") + ")");
		GameEvents.fire({ type: "axAgent", action: "ajout", cle: k.nom, cles: a.cles.slice() });
	}
	if (suivant()) return "";
	var texte = messages.join("\n");
	messages = [];
	if (/WARNING|No such file|Error loading/.test(texte) && !/Identity added/.test(texte)){ io.code = 1; throw new ShellError(texte, 1); }
	return texte;
};

/* ================================================================== */
/* hexdump                                                             */
/* ================================================================== */

/* Les octets d'un objet : ceux qu'il porte (item.octets), sinon ceux de octetsDe (CommandesCyber.js). */
var OCTETS_DE_AVANT_ANNEXES = octetsDe;
octetsDe = function(item){
	if (item && item.octets && item.octets.length) return item.octets.slice();
	return OCTETS_DE_AVANT_ANNEXES(item);
};
/* file reconnaît les nombres magiques des objets qui portent leurs octets. */
var AX_MAGIQUES = [
	{ octets: [0x89, 0x50, 0x4e, 0x47], type: "PNG image data, 640 x 480, 8-bit/color RGBA, non-interlaced", ext: "png" },
	{ octets: [0x25, 0x50, 0x44, 0x46], type: "PDF document, version 1.7", ext: "pdf" },
	{ octets: [0x1f, 0x8b], type: "gzip compressed data, from Unix", ext: "gz" },
	{ octets: [0x47, 0x49, 0x46, 0x38], type: "GIF image data, version 89a, 64 x 64", ext: "gif" },
	{ octets: [0xff, 0xd8, 0xff], type: "JPEG image data, JFIF standard 1.01", ext: "jpg" },
	{ octets: [0x50, 0x4b, 0x03, 0x04], type: "Zip archive data, at least v2.0 to extract", ext: "zip" },
	{ octets: [0x7f, 0x45, 0x4c, 0x46], type: "ELF 64-bit LSB executable, x86-64, dynamically linked", ext: "" },
	{ octets: [0x53, 0x61, 0x6c, 0x74, 0x65, 0x64, 0x5f, 0x5f], type: "openssl enc'd data with salted password", ext: "enc" }
];
function axMagique(octets){
	for (var i = 0; i < AX_MAGIQUES.length; i++){
		var m = AX_MAGIQUES[i];
		if (m.octets.every(function(b, k){ return octets[k] === b; })) return m;
	}
	return null;
}
var FILE_AVANT_ANNEXES = Shell.sorts.file;
Shell.sorts.file = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), bref = args.indexOf("-b") > -1;
	var avecOctets = noms.length && noms.every(function(n){ try { var r = Shell.chercher(n, io, "file"); return r.node instanceof Item && r.node.octets && r.node.octets.length; } catch (e){ return false; } });
	if (!avecOctets) return FILE_AVANT_ANNEXES.apply(this, arguments);
	return noms.map(function(n){
		var it = Shell.chercher(n, io, "file").node, m = axMagique(it.octets);
		var t = m ? m.type : "data";
		GameEvents.fire({ type: "file", item: it, room: current_room });
		return bref ? t : n + ": " + t;
	}).join("\n");
};
Shell.sorts.hexdump = function(args, io){
	var p = lireOptionsGNU(args, "hexdump", "Cvbcdox", "ns", { "canonical": "C", "length": "n", "skip": "s" });
	var noms = p.reste;
	var octets, item = null;
	if (!noms.length){
		if (io.stdin === null) throw new ShellError("hexdump : quel fichier ? Utilisation : hexdump -C FICHIER");
		octets = versOctetsUtf8(contenuExact(io.stdin, io.stdinSansFin));
	} else {
		var t = Shell.objetLisible(noms[0], io, "hexdump");
		item = t.item;
		octets = octetsDe(t.item);
	}
	function nombre(v, opt){ var m = /^(0x[0-9a-f]+|\d+)([kKmM]?)$/i.exec(String(v)); if (!m) throw new ShellError("hexdump: bad " + opt + " value: " + v); return parseInt(m[1]) * ({ "": 1, k: 1024, K: 1024, m: 1048576, M: 1048576 }[m[2]]); }
	var debut = p.opts.s !== undefined ? nombre(p.opts.s, "skip") : 0;
	var total = octets.length;
	octets = octets.slice(debut);
	if (p.opts.n !== undefined) octets = octets.slice(0, nombre(p.opts.n, "length"));
	var lignes = [], fin = debut + octets.length, precedente = null, etoile = false;
	function hex2(b){ return ("0" + b.toString(16)).slice(-2); }
	for (var i = 0; i < octets.length; i += 16){
		var bloc = octets.slice(i, i + 16), cle = bloc.join(",");
		if (!p.opts.v && cle === precedente && bloc.length === 16){ if (!etoile){ lignes.push("*"); etoile = true; } continue; }
		precedente = cle; etoile = false;
		var adr = debut + i;
		if (p.opts.C){
			var h = "";
			for (var j = 0; j < 16; j++){ h += j < bloc.length ? hex2(bloc[j]) + " " : "   "; if (j === 7) h += " "; }
			var asc = bloc.map(function(b){ return b >= 32 && b < 127 ? String.fromCharCode(b) : "."; }).join("");
			lignes.push(("0000000" + adr.toString(16)).slice(-8) + "  " + h + " |" + asc + "|");
		} else {
			var mots = [];
			for (var w = 0; w < bloc.length; w += 2) mots.push(("000" + ((bloc[w + 1] || 0) * 256 + bloc[w]).toString(16)).slice(-4));
			lignes.push(("000000" + adr.toString(16)).slice(-7) + " " + mots.join(" "));
		}
	}
	lignes.push(p.opts.C ? ("0000000" + fin.toString(16)).slice(-8) : ("000000" + fin.toString(16)).slice(-7));
	var sortie = octets.length || total === 0 ? lignes.join("\n") : lignes.join("\n");
	GameEvents.fire({ type: "axHexdump", item: item, sortie: sortie, canonique: !!p.opts.C, debut: debut });
	if (io.tty && !p.opts.C && !state.has("axHexdumpC")){ state.set("axHexdumpC"); sortie += "\n" + C.gris("(Sans option, hexdump groupe les octets par deux, à l'envers sur un processeur x86. hexdump -C les montre un par un, avec leur texte à droite.)"); }
	return sortie;
};

/* ================================================================== */
/* readlink, realpath, ln (le lien dur), ls -i                         */
/* ================================================================== */

/* Le chemin absolu d'un lieu, sur sa machine (/var/log) ou dans le monde (~/Cybersup/...). */
function axCheminLieu(lieu){ return Shell.cheminAffiche(lieu); }
function axJoindre(dossier, nom){ return dossier === "/" ? "/" + nom : (dossier.replace(/\/$/, "") + "/" + nom); }
/* Résout un chemin en suivant les liens : { chemin, noeud } ; erreur si une étape manque (sauf la dernière avec -f). */
function axResoudre(chemin, io, cmd, tolerantFin){
	var garde = 0, actuel = chemin;
	var r = Shell.chercher(actuel, io, cmd);
	while (r.node && r.node instanceof Item && r.node.lien && garde++ < 40){
		var l = r.node.lien;
		if (l === "/dev/null") return { chemin: "/dev/null", noeud: null };
		if (l.charAt(0) !== "/" && l.charAt(0) !== "~") l = (r.node.dossierLien || axCheminLieu(r.dir)) + "/" + l;
		r = Shell.chercher(l, io, cmd);
		actuel = l;
	}
	if (garde >= 40) throw new ShellError(cmd + ": " + chemin + ": Too many levels of symbolic links");
	if (r.node === null){
		if (tolerantFin) return { chemin: axJoindre(axCheminLieu(r.dir), r.name), noeud: null };
		return null;
	}
	return { chemin: r.node instanceof Room ? axCheminLieu(r.node) : axJoindre(axCheminLieu(r.dir), r.node.itemname), noeud: r.node };
}
Shell.sorts.readlink = function(args, io){
	var p = lireOptionsGNU(args, "readlink", "femnqsvz", "", { canonicalize: "f", "canonicalize-existing": "e", "canonicalize-missing": "m", "no-newline": "n" });
	if (!p.reste.length) throw new ShellError("readlink: missing operand\nTry 'readlink --help' for more information.");
	var sortie = [];
	p.reste.forEach(function(c){
		if (p.opts.f || p.opts.e || p.opts.m){
			var r = axResoudre(c, io, "readlink", !p.opts.e);
			if (!r){ io.code = 1; return; }
			sortie.push(r.chemin);
			GameEvents.fire({ type: "axReadlink", cmd: "readlink", f: true, cible: c, sortie: r.chemin });
			return;
		}
		var t = Shell.chercher(c, io, "readlink");
		if (!t.node || !(t.node instanceof Item) || !t.node.lien){ io.code = 1; return; }
		sortie.push(t.node.lien);
		GameEvents.fire({ type: "axReadlink", cmd: "readlink", f: false, cible: c, sortie: t.node.lien });
	});
	if (p.opts.n) io.sansFin = true;
	return sortie.join("\n");
};
Shell.sorts.realpath = function(args, io){
	var p = lireOptionsGNU(args, "realpath", "emsqz", "", { "canonicalize-existing": "e", "canonicalize-missing": "m", "no-symlinks": "s", quiet: "q" });
	if (!p.reste.length) throw new ShellError("realpath: missing operand\nTry 'realpath --help' for more information.");
	var sortie = [];
	p.reste.forEach(function(c){
		if (p.opts.s){
			var t = Shell.chercher(c, io, "realpath");
			var ch = t.node instanceof Room ? axCheminLieu(t.node) : axJoindre(axCheminLieu(t.dir), t.name);
			sortie.push(ch);
			return;
		}
		var r = axResoudre(c, io, "realpath", !p.opts.e);
		if (!r){ io.err("realpath: " + c + ": No such file or directory"); io.code = 1; return; }
		sortie.push(r.chemin);
		GameEvents.fire({ type: "axReadlink", cmd: "realpath", f: true, cible: c, sortie: r.chemin });
	});
	return sortie.join("\n");
};

/* Le numéro d'inode : stable pour un objet (le même pour deux noms d'un même lien dur). */
function axInode(n){
	if (n instanceof Room){ if (!n.axInode) n.axInode = 131000 + Math.floor(alea("inode-lieu-" + (n.id || n.room_name)) * 800000); return n.axInode; }
	if (!n.inode) n.inode = 262000 + Math.floor(alea("inode-" + (n.id || n.itemname + ":" + state.nbCommandes)) * 1500000);
	return n.inode;
}
/* Le nombre de noms d'un objet : les lieux qui le contiennent. */
function axLiens(item){
	var n = 0;
	(function parcourir(lieu, garde){
		if (garde > 40) return;
		if (lieu.items.indexOf(item) > -1) n++;
		lieu.children.forEach(function(c){ if (c.parents[0] === lieu) parcourir(c, garde + 1); });
	})(axRacineMonde(), 0);
	return Math.max(1, n);
}
/* La machine où se trouve un lieu (comme Shell.hote, mais pour n'importe quel lieu). */
function axHoteDe(lieu){
	var avant = current_room;
	try { current_room = lieu; return Shell.hote(); } finally { current_room = avant; }
}
function axRacineMonde(){ var l = Home; while (l.parents && l.parents[0] && l.parents[0] !== l) l = l.parents[0]; return l; }
var LN_AVANT_ANNEXES = Shell.sorts.ln;
Shell.sorts.ln = function(args, io){
	var lettres = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("");
	if (lettres.indexOf("s") > -1) return LN_AVANT_ANNEXES.apply(this, arguments);
	var noms = args.filter(function(a){ return !/^-/.test(a); });
	if (noms.length !== 2) return LN_AVANT_ANNEXES.apply(this, arguments);
	var src = Shell.chercher(noms[0], io, "ln");
	if (src.node === null) throw new ShellError("ln: failed to access '" + noms[0] + "': No such file or directory");
	if (src.node instanceof Room) throw new ShellError("ln: " + noms[0] + ": hard link not allowed for directory");
	if (src.node.person) throw new ShellError("ln : on ne dédouble pas quelqu'un, même par un lien dur.");
	var dest = Shell.chercher(noms[1], io, "ln");
	var lieu, nom;
	if (dest.node instanceof Room){ lieu = dest.node; nom = src.node.itemname; }
	else if (dest.node !== null){
		if (lettres.indexOf("f") === -1) throw new ShellError("ln: failed to create hard link '" + noms[1] + "': File exists");
		dest.dir.removeItem(dest.node); lieu = dest.dir; nom = dest.name;
	}
	else { lieu = dest.dir; nom = dest.name; }
	if (lieu.getNode(nom) !== null) throw new ShellError("ln: failed to create hard link '" + noms[1] + "': File exists");
	if (axHoteDe(lieu) !== axHoteDe(src.dir)) throw new ShellError("ln: failed to create hard link '" + noms[1] + "' => '" + noms[0] + "': Invalid cross-device link" +
		axAstuce(io, "(Un lien dur est un deuxième nom pour le même inode : il ne peut pas sauter d'un système de fichiers, d'une machine, à l'autre. ln -s, lui, le peut.)"));
	Shell.verifierEcriture(lieu, io, "ln", nom);
	if (src.node.itemname !== nom){
		throw new ShellError("ln : ici, un lien dur garde le nom de l'original (« " + src.node.itemname + " ») : ln " + noms[0] + " DOSSIER." +
			axAstuce(io, "(Sous Linux, les deux noms peuvent différer ; dans ce monde, un objet ne porte qu'un nom à la fois.)"));
	}
	Shell.nomValide(nom, "ln");
	axInode(src.node);
	lieu.addItem(src.node);
	GameEvents.fire({ type: "axLienDur", item: src.node, lieu: lieu, nom: nom, depuis: src.dir });
	return lettres.indexOf("v") > -1 ? "'" + noms[1] + "' => '" + noms[0] + "'" : "";
};
var LS_AVANT_ANNEXES = Shell.sorts.ls;
Shell.sorts.ls = function(args, io){
	var avecI = args.some(function(a){ return /^-[a-zA-Z]*i[a-zA-Z]*$/.test(a) || a === "--inode"; });
	if (!avecI) return LS_AVANT_ANNEXES.apply(this, arguments);
	var lettres = args.filter(function(a){ return /^-[a-zA-Z]+$/.test(a); }).join("").replace(/-/g, "");
	var cibles = args.filter(function(a){ return !/^-/.test(a); });
	if (!cibles.length) cibles = ["."];
	var long = lettres.indexOf("l") > -1, tout = lettres.indexOf("a") > -1;
	var blocs = [];
	cibles.forEach(function(c){
		var r = Shell.chercher(c, io, "ls");
		if (r.node === null) throw new ShellError(Shell.introuvable("ls", r.name, r.dir));
		var noeuds;
		if (r.node instanceof Room){
			if (!Shell.bit(r.node, "r", io)) throw new ShellError("ls : impossible d'ouvrir le lieu « " + r.node.room_name + " » : Permission non accordée");
			noeuds = r.node.children.filter(function(x){ return tout || !x.isHidden(); }).concat(r.node.items.filter(function(x){ return tout || !x.isHidden(); }));
			noeuds.sort(function(a, b){ var x = String(a), y = String(b); return x < y ? -1 : x > y ? 1 : 0; });
		} else noeuds = [r.node];
		var lignes = noeuds.map(function(n){
			var num = completerGauche(axInode(n), 7);
			if (!long) return num + " " + String(n);
			var estLieu = n instanceof Room;
			var liens = estLieu ? 2 + n.children.length : (n.lien ? 1 : axLiens(n));
			var taille = estLieu ? 4096 : (n.lien ? n.lien.length : versOctetsUtf8(contenuExact(n.getText(), n.sansFinDeLigne)).length);
			return num + " " + (estLieu ? "d" : n.lien ? "l" : "-") + (n.lien ? "rwxrwxrwx" : n.mode) + " " + liens + " " + completerDroite(n.owner, 8) + " " + completerDroite(n.groupe || n.owner, 8) + " " +
				completerGauche(taille, 6) + " " + String(n) + (n.lien ? " -> " + n.lien : "");
		});
		blocs.push((cibles.length > 1 ? c + ":\n" : "") + (long ? "total " + noeuds.length * 4 + "\n" : "") + lignes.join("\n"));
	});
	var sortie = blocs.join("\n\n");
	GameEvents.fire({ type: "axLsI", lieu: current_room, sortie: sortie, long: long });
	return sortie;
};

/* ================================================================== */
/* tail -f, tail -F : suivre un journal vivant ; grep --line-buffered   */
/* ================================================================== */

/* Un journal vivant : item.axVivant = clé dans AX_JOURNAUX_VIVANTS, une fonction (item, suivi) -> { lignes, rotation }. */
var AX_JOURNAUX_VIVANTS = {};
var AX_SUIVI = { nb: -1 };
var TAIL_AVANT_ANNEXES = Shell.sorts.tail;
Shell.sorts.tail = function(args, io){
	var suivre = null, reste = [];
	args.forEach(function(a){
		if (a === "-f" || a === "--follow" || a === "--follow=descriptor"){ suivre = suivre || "f"; return; }
		if (a === "-F" || a === "--follow=name"){ suivre = "F"; return; }
		if (/^-[a-zA-Z]*[fF][a-zA-Z]*$/.test(a) && !/^-[nc]/.test(a)){ suivre = a.indexOf("F") > -1 ? "F" : (suivre || "f"); var r = a.replace(/[fF]/g, ""); if (r !== "-") reste.push(r); return; }
		reste.push(a);
	});
	if (!suivre) return TAIL_AVANT_ANNEXES.apply(this, arguments);
	var noms = reste.filter(function(a, i){ return !/^-/.test(a) && !/^-[nc]$/.test(reste[i - 1] || ""); });
	if (!noms.length){
		if (io.stdin !== null) return TAIL_AVANT_ANNEXES.call(this, reste, io);
		throw new ShellError("tail : avec -f, il faut un fichier à suivre. Utilisation : tail -f JOURNAL");
	}
	var debut = TAIL_AVANT_ANNEXES.call(this, reste, io);
	AX_SUIVI = { nb: state.nbCommandes, F: suivre === "F" };
	var t = Shell.objetLisible(noms[noms.length - 1], io, "tail");
	var vivant = t.item.axVivant && AX_JOURNAUX_VIVANTS[t.item.axVivant];
	var suite = [];
	var rotation = false;
	if (vivant){
		var r = vivant(t.item, suivre, t.room) || {};
		rotation = !!r.rotation;
		if (r.rotation && suivre === "F") io.errFin("tail: '" + noms[noms.length - 1] + "' has been replaced;  following new file");
		suite = r.lignes || [];
	}
	GameEvents.fire({ type: "axTail", item: t.item, suivi: suivre, rotation: rotation, lignes: suite.slice(), room: t.room });
	var texte = debut + (suite.length ? "\n" + suite.join("\n") : "");
	if (io.tty) texte += "\n" + C.gris("^C  (tail -" + suivre + " suit le fichier sans fin ; Ctrl+C l'arrête. Ici, le jeu l'arrête après quelques secondes" + (suite.length ? " : " + suite.length + " ligne" + (suite.length > 1 ? "s" : "") + " sont arrivées." :
		(rotation ? " : rien de neuf n'est arrivé dans le fichier suivi. Pendant ce temps, il a été renommé (ls -l) : tail -f suit le fichier, tail -F suit le NOM et rouvre le nouveau." : " : rien de neuf n'est arrivé.")) + ")");
	return texte;
};
var GREP_AVANT_ANNEXES = Shell.sorts.grep;
Shell.sorts.grep = function(args, io){
	var tamponne = args.indexOf("--line-buffered") === -1;
	var vrais = args.filter(function(a){ return a !== "--line-buffered"; });
	var apresSuivi = AX_SUIVI.nb === state.nbCommandes && io.stdin !== null;
	if (!apresSuivi) return GREP_AVANT_ANNEXES.call(this, vrais, io);
	var sortie = GREP_AVANT_ANNEXES.call(this, vrais, io);
	var versEcran = io.sortie1 && io.sortie1.t === "ecran";
	if (tamponne && !versEcran){
		// Vers un fichier ou un tuyau, grep remplit un tampon de 4 Kio avant d'écrire : Ctrl+C le perd.
		GameEvents.fire({ type: "axGrepSuivi", tamponne: true, sortie: "" });
		say(C.gris("(grep écrivait dans un fichier : il garde ses lignes dans un tampon de 4 Kio avant de les écrire. Le Ctrl+C qui a arrêté tail a aussi tué grep, tampon compris : rien n'a été écrit. grep --line-buffered écrit chaque ligne dès qu'elle arrive.)"));
		return "";
	}
	GameEvents.fire({ type: "axGrepSuivi", tamponne: false, sortie: sansAnsi(String(sortie || "")), versEcran: versEcran });
	return sortie;
};

/* ================================================================== */
/* timeout                                                             */
/* ================================================================== */

/* Un programme qui ne s'arrête jamais de lui-même : item.axSansFin = { tetu: vrai s'il ignore SIGTERM, lignes: [...] }. */
var AX_SIGNAUX = { HUP: 1, INT: 2, QUIT: 3, KILL: 9, USR1: 10, USR2: 12, TERM: 15, CONT: 18, STOP: 19 };
function axDuree(v){
	var m = /^(\d+(?:\.\d+)?)([smhd]?)$/.exec(String(v || ""));
	return m ? parseFloat(m[1]) * ({ "": 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]]) : null;
}
function axProgrammeSansFin(nom, io){
	if (nom.indexOf("/") === -1) return null;
	try { var t = Shell.objetLisible(nom, io, "timeout"); return t.item.axSansFin ? t.item : null; } catch (e){ return null; }
}
Shell.sorts.timeout = function(args, io){
	var signal = "TERM", tuer = null, garder = false, bavard = false, i = 0;
	for (; i < args.length; i++){
		var a = args[i], m;
		if (a === "-s" || a === "--signal"){ signal = String(args[++i] || ""); continue; }
		if ((m = /^--signal=(.+)$/.exec(a))){ signal = m[1]; continue; }
		if (a === "-k" || a === "--kill-after"){ tuer = args[++i]; continue; }
		if ((m = /^--kill-after=(.+)$/.exec(a))){ tuer = m[1]; continue; }
		if (a === "--preserve-status"){ garder = true; continue; }
		if (a === "--foreground"){ continue; }
		if (a === "-v" || a === "--verbose"){ bavard = true; continue; }
		if ((m = /^-s(.+)$/.exec(a))){ signal = m[1]; continue; }
		break;
	}
	var duree = axDuree(args[i]);
	if (args[i] === undefined) throw new ShellError("timeout: missing operand\nTry 'timeout --help' for more information.", 125);
	if (duree === null) throw new ShellError("timeout: invalid time interval '" + args[i] + "'\nTry 'timeout --help' for more information.", 125);
	var nom = args[i + 1], reste = args.slice(i + 2);
	if (nom === undefined) throw new ShellError("timeout: missing operand after '" + args[i] + "'\nTry 'timeout --help' for more information.", 125);
	var sig = String(signal).toUpperCase().replace(/^SIG/, "");
	var numero = /^\d+$/.test(sig) ? +sig : AX_SIGNAUX[sig];
	if (!numero) throw new ShellError("timeout: " + signal + ": invalid signal\nTry 'timeout --help' for more information.", 125);
	if (tuer !== null && axDuree(tuer) === null) throw new ShellError("timeout: invalid time interval '" + tuer + "'", 125);
	var nomSig = Object.keys(AX_SIGNAUX).filter(function(k){ return AX_SIGNAUX[k] === numero; })[0] || String(numero);
	var prog = axProgrammeSansFin(nom, io);
	var dormir = nom === "sleep" && axDuree(reste[0]);
	if (prog || (dormir !== null && dormir !== false && dormir > duree)){
		var lignes = [];
		if (prog){
			var n = Math.max(1, Math.min(8, Math.floor(duree)));
			for (var k = 0; k < n; k++) lignes.push(prog.axSansFin.lignes[k % prog.axSansFin.lignes.length]);
		}
		var code;
		if (bavard) io.errFin("timeout: sending signal " + nomSig + " to command '" + nom + "'");
		if (numero === 9) code = 137;
		else if (prog && prog.axSansFin.tetu && (numero === 15 || numero === 1 || numero === 2)){
			if (tuer === null){
				// Le programme ignore le signal : timeout attend sans fin. Le jeu l'interrompt, comme Ctrl+C.
				lignes.push("^C");
				io.errFin(C.gris("(" + nom + " a reçu SIG" + nomSig + " au bout de " + args[i] + (/^\d+(\.\d+)?$/.test(args[i]) ? " s" : "") + "... et l'a ignoré : il tourne toujours, et timeout attend avec lui. Ctrl+C. Pour un programme qui ignore SIGTERM : timeout -s KILL, ou timeout -k DÉLAI.)"));
				io.code = 130;
				GameEvents.fire({ type: "axTimeout", code: 130, cible: prog, signal: numero, ignore: true });
				return lignes.join("\n");
			}
			if (bavard) io.errFin("timeout: sending signal KILL to command '" + nom + "'");
			code = 137;
		}
		else code = 124;
		if (garder) code = numero === 9 || code === 137 ? 137 : 128 + numero;
		io.code = code;
		GameEvents.fire({ type: "axTimeout", code: code, cible: prog, signal: numero, preserve: garder, kill: tuer !== null });
		return lignes.join("\n");
	}
	var sortie = Shell.appeler(nom, reste, io);
	GameEvents.fire({ type: "axTimeout", code: io.code || 0, cible: null, signal: numero });
	return sortie;
};
/* Lancé sans timeout, un programme sans fin tourne... jusqu'au Ctrl+C. */
var LANCER_SCRIPT_AVANT_ANNEXES = Shell.lancerScript;
Shell.lancerScript = function(chemin, io, direct, args, options){
	var it = null;
	try { var t = Shell.chercher(chemin, io, "bash"); it = t.node instanceof Item ? t.node : null; } catch (e){ it = null; }
	if (it && it.axSansFin && direct){
		if (!Shell.bit(it, "x", io)) return LANCER_SCRIPT_AVANT_ANNEXES.apply(this, arguments);
		io.code = 130;
		GameEvents.fire({ type: "axSansFin", item: it });
		return it.axSansFin.lignes.slice(0, 4).join("\n") + "\n^C" + (io.tty ? "\n" + C.gris("(" + it.itemname + " ne s'arrête jamais de lui-même : Ctrl+C l'a arrêté. Pour lui donner une durée maximale : timeout 5 " + chemin + ".)") : "");
	}
	return LANCER_SCRIPT_AVANT_ANNEXES.apply(this, arguments);
};

/* ================================================================== */
/* pwgen, openssl rand, openssl passwd                                 */
/* ================================================================== */

var AX_CONSONNES = "bcdfghjkmnprstvwxz", AX_VOYELLES = "aeiouy", AX_SYMBOLES = "!#%&*+-=?@^_";
Shell.sorts.pwgen = function(args, io){
	var p = lireOptionsGNU(args, "pwgen", "sncCAy1BvN0", "", { secure: "s", numerals: "n", capitalize: "c", symbols: "y", "no-numerals": "0", "no-capitalize": "A", ambiguous: "B", "no-vowels": "v" });
	var o = p.opts;
	var longueur = p.reste[0] !== undefined ? parseInt(p.reste[0], 10) : 8;
	if (isNaN(longueur) || longueur < 1) throw new ShellError("Invalid password length: " + p.reste[0]);
	var tty = io.tty && !o["1"];
	var nombre = p.reste[1] !== undefined ? parseInt(p.reste[1], 10) : (io.tty && !o["1"] ? 160 : 1);
	if (isNaN(nombre) || nombre < 1) throw new ShellError("Invalid number of passwords: " + p.reste[1]);
	nombre = Math.min(nombre, tty ? 160 : 400);
	var chiffres = !o["0"], majuscules = !o.A, sel = "pwgen-" + state.nbCommandes;
	var mots = [];
	for (var n = 0; n < nombre; n++){
		var mot = "", k = 0, r = function(){ return alea(sel + ":" + n + ":" + (k++)); };
		if (o.s){
			var jeu = "abcdefghijkmnpqrstuvwxyz" + (majuscules ? "ABCDEFGHJKLMNPQRSTUVWXYZ" : "") + (chiffres ? "23456789" : "") + (o.y ? AX_SYMBOLES : "");
			if (!o.B) jeu += "lo01IO";
			for (var i = 0; i < longueur; i++) mot += jeu.charAt(Math.floor(r() * jeu.length));
		} else {
			var voyelle = r() < 0.5;
			while (mot.length < longueur){
				var src = voyelle ? AX_VOYELLES : AX_CONSONNES;
				mot += src.charAt(Math.floor(r() * src.length));
				if (!voyelle && r() < 0.15 && mot.length < longueur) mot += "h";
				voyelle = !voyelle;
			}
			mot = mot.substring(0, longueur);
			var pos = Math.floor(r() * longueur);
			if (majuscules) mot = mot.substring(0, pos) + mot.charAt(pos).toUpperCase() + mot.substring(pos + 1);
			if (chiffres && longueur > 2){ var q = (pos + 1 + Math.floor(r() * (longueur - 1))) % longueur; mot = mot.substring(0, q) + Math.floor(r() * 10) + mot.substring(q + 1); }
			if (o.y && longueur > 3){ var y = (pos + 2) % longueur; mot = mot.substring(0, y) + AX_SYMBOLES.charAt(Math.floor(r() * AX_SYMBOLES.length)) + mot.substring(y + 1); }
		}
		mots.push(mot);
	}
	var sortie;
	if (tty && nombre > 1){
		var parLigne = Math.max(1, Math.floor(80 / (longueur + 1))), lignes = [];
		for (var j = 0; j < mots.length; j += parLigne) lignes.push(mots.slice(j, j + parLigne).join(" "));
		sortie = lignes.join("\n");
	} else sortie = mots.join("\n");
	GameEvents.fire({ type: "axPwgen", sortie: sortie, s: !!o.s, longueur: longueur, nombre: nombre, y: !!o.y });
	return sortie;
};

var OPENSSL_AVANT_ANNEXES = Shell.sorts.openssl;
Shell.sorts.openssl = function(args, io){
	var sous = args[0];
	if (sous === "rand") return axOpensslRand(args.slice(1), io);
	if (sous === "passwd") return axOpensslPasswd(args.slice(1), io);
	if (sous === "enc" || /^-?aes-(128|192|256)-(cbc|ctr|gcm)$/.test(sous || "")){
		if (typeof axOpensslEnc === "function") return axOpensslEnc(args, io);
	}
	return OPENSSL_AVANT_ANNEXES.apply(this, arguments);
};
function axOpensslRand(args, io){
	var b64 = false, hex = false, sortie = null, n = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-base64") b64 = true;
		else if (a === "-hex") hex = true;
		else if (a === "-out") sortie = args[++i];
		else if (/^\d+$/.test(a)) n = +a;
		else throw new ShellError("rand: Unknown option or number of bytes: " + a + "\nrand: Use -help for summary.", 1);
	}
	if (n === null) throw new ShellError("rand: Missing number of bytes\nUsage: rand [options] num\n  -out outfile   Output file\n  -base64        Base64 encode output\n  -hex           Hex encode output", 1);
	if (n > 1048576) throw new ShellError("rand: le jeu s'arrête à 1 Mio d'octets", 1);
	var octets = axOctetsAlea("rand-" + state.nbCommandes, n);
	var texte;
	if (b64){ var t = axBase64(octets), l = []; for (var k = 0; k < t.length; k += 64) l.push(t.substring(k, k + 64)); texte = l.join("\n"); }
	else if (hex) texte = axHex(octets);
	else { texte = octets.map(function(b){ return String.fromCharCode(b); }).join(""); if (io.tty && !sortie) texte = texte.replace(/[\x00-\x1f\x7f-\xff]/g, "�"); }
	GameEvents.fire({ type: "axOpenssl", sous: "rand", sortie: texte, n: n, b64: b64, hex: hex });
	if (sortie){ Shell.ecrire(sortie, texte, false); return ""; }
	return texte;
}
function axOpensslPasswd(args, io){
	var algo = null, sel = null, mots = [], stdin = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-6") algo = 6;
		else if (a === "-5") algo = 5;
		else if (a === "-1" || a === "-apr1" || a === "-aixmd5" || a === "-crypt") throw new ShellError("passwd: " + a + " : ici, seuls -5 (sha256-crypt) et -6 (sha512-crypt) sont pris en charge.\n" + C.gris("(Les anciens formats, MD5 ou DES, sont trop faibles : on ne s'en sert plus pour un nouveau mot de passe.)"), 1);
		else if (a === "-salt") sel = args[++i];
		else if (a === "-stdin") stdin = true;
		else if (a.charAt(0) === "-") throw new ShellError("passwd: Unknown option: " + a + "\npasswd: Use -help for summary.", 1);
		else mots.push(a);
	}
	if (algo === null) throw new ShellError("passwd : quel algorithme ? Exemple : openssl passwd -6 MOT\n" + C.gris("(-6 : sha512-crypt, celui de /etc/shadow sur Debian ; -5 : sha256-crypt.)"), 1);
	if (sel !== null && (sel === undefined || !/^[A-Za-z0-9./]{1,16}$/.test(sel))) throw new ShellError("passwd: Invalid salt" + C.gris("  (un sel : jusqu'à 16 caractères parmi A-Z a-z 0-9 . /)"), 1);
	function empreinte(mot){
		var s = sel || axBase64(axOctetsAlea("sel-" + state.nbCommandes + "-" + mot, 12)).replace(/\+/g, ".").replace(/=+$/, "").substring(0, 16);
		var r = axCrypt(mot, s, algo);
		GameEvents.fire({ type: "axOpenssl", sous: "passwd", sortie: r, sel: s, mot: mot, selDonne: sel !== null, algo: algo });
		return r;
	}
	if (stdin){
		if (io.stdin === null) throw new ShellError("passwd : -stdin attend les mots de passe par un tuyau.", 1);
		return lignesDe(io.stdin).filter(function(l){ return l !== ""; }).map(empreinte).join("\n");
	}
	if (mots.length) return mots.map(empreinte).join("\n");
	if (!term || !term.demander) throw new ShellError("passwd : quel mot de passe ?", 1);
	term.demander("Password: ", true, function(m1){
		term.demander("Verifying - Password: ", true, function(m2){
			if (m1 !== m2) term.echo("Verify failure\npasswd: Can't read password.");
			else term.echo(empreinte(m1));
			Shell.fin();
		});
	});
	return "";
}

/* ================================================================== */
/* Le manuel des sorts des annexes (hors barème)                       */
/* ================================================================== */

MANUEL["lscpu"] = page("le processeur de la machine", "LiSt CPU",
	"lscpu résume le processeur : architecture, nombre de cœurs et de fils (threads), modèle, fréquences, caches.\n\n" +
	"  lscpu             le résumé\n  lscpu -e          une ligne par processeur logique\n  lscpu -J          le même résumé, en JSON\n\n" +
	"CPU(s) = Socket(s) x Core(s) per socket x Thread(s) per core.  nproc, plus court, ne donne que le nombre.");
MANUEL["lspci"] = page("les cartes branchées sur le bus PCI", "LiSt PCI",
	"lspci liste les périphériques du bus PCI : carte réseau (Ethernet controller), carte graphique (VGA), disques (SATA, NVMe), son, USB.\n\n" +
	"  lspci             une ligne par carte : son adresse sur le bus, sa classe, son nom\n  lspci -v          le détail\n  lspci -k          le pilote du noyau qui s'en occupe\n" +
	"  lspci -s 00:1f.6  une seule carte, par son adresse");
MANUEL["lsusb"] = page("les périphériques USB", "LiSt USB",
	"  lsusb             une ligne par périphérique : bus, numéro, identifiant fabricant:produit, nom\n  lsusb -t          l'arbre des ports et des concentrateurs\n" +
	"  lsusb -d 072f:2200   un seul périphérique, par son identifiant\n\nUn objet USB inconnu sur un poste de l'accueil ? lsusb le montre, dmesg dit quand il a été branché.");
MANUEL["dmidecode"] = page("la fiche du matériel, lue dans le firmware", "DMI DECODE",
	"dmidecode lit la table SMBIOS (DMI) du firmware : fabricant, modèle, numéro de série, BIOS, mémoire, processeur. Réservé à root.\n\n" +
	"  sudo dmidecode -t system                 le système : fabricant, modèle, numéro de série, UUID\n" +
	"  sudo dmidecode -t bios                   le BIOS ;  -t memory : les barrettes ;  -t processor : le processeur\n" +
	"  sudo dmidecode -s system-serial-number   une seule valeur, sans habillage (pratique dans un script)");
MANUEL["apropos"] = page("chercher une page de manuel par un mot", "A PROPOS (de)",
	"apropos cherche MOT dans le nom et la description de toutes les pages du manuel. C'est la même chose que man -k MOT.\n\n" +
	"  apropos réseau      les pages qui parlent de réseau\n  apropos -a mot passe   les pages qui contiennent les deux mots\n\n" +
	"Chaque ligne donne le nom de la page et, entre parenthèses, sa SECTION : (1) les commandes, (5) les formats de fichiers,\n" +
	"(7) les notions, (8) l'administration. man 5 passwd ouvre la page passwd de la section 5.");
MANUEL["whatis"] = page("la description d'une page, et ses sections", "WHAT IS",
	"  whatis passwd      passwd (1) et passwd (5) : la commande, et le format du fichier /etc/passwd\n  man -f passwd      la même chose\n\n" +
	"Puis : man 1 passwd (la commande), man 5 passwd (le fichier).");
MANUEL["pwgen"] = page("fabriquer des mots de passe", "Password GENerator",
	"  pwgen               une grille de mots de passe prononçables de 8 caractères\n  pwgen 16 1          un seul, de 16 caractères\n" +
	"  pwgen -s 20 1       un « secure » : complètement aléatoire, imprononçable, et bien plus solide\n  pwgen -y            avec des symboles ;  -B : sans les caractères ambigus (l, 1, O, 0)\n\n" +
	"Un mot prononçable se retient, mais il est plus facile à deviner. Pour un compte de service, pwgen -s.");
MANUEL["hexdump"] = page("voir les octets d'un fichier", "HEXadecimal DUMP",
	"  hexdump -C FICHIER        les octets en hexadécimal, seize par ligne, avec leur texte à droite (| |)\n" +
	"  hexdump -C -n 16 FICHIER  seulement les 16 premiers octets ;  -s 512 : à partir de l'octet 512\n\n" +
	"Les premiers octets d'un fichier disent souvent ce qu'il est : son NOMBRE MAGIQUE.\n" +
	"  89 50 4e 47  (.PNG)  une image PNG      25 50 44 46  (%PDF)  un document PDF\n  1f 8b         une archive gzip         7f 45 4c 46  (.ELF)  un programme Linux\n" +
	"L'extension du nom, elle, ne prouve rien : on peut l'écrire comme on veut. file lit ces nombres magiques à ta place.");
MANUEL["readlink"] = page("lire où mène un lien symbolique", "READ LINK",
	"  readlink LIEN       la cible écrite dans le lien (une seule étape)\n  readlink -f LIEN    le chemin final, au bout de TOUS les liens, sans . ni ..\n\n" +
	"Un lien peut mener à un autre lien, qui mène à un autre : readlink -f va jusqu'au bout.");
MANUEL["realpath"] = page("le vrai chemin d'un fichier", "REAL PATH",
	"  realpath CHEMIN     le chemin absolu, liens suivis, . et .. résolus\n  realpath -s CHEMIN  absolu, mais sans suivre les liens\n\n" +
	"Pratique dans un script : on travaille sur le vrai fichier, quel que soit le chemin tordu par lequel on y est arrivé.");
MANUEL["timeout"] = page("donner une durée maximale à une commande", "TIME OUT",
	"  timeout 5 COMMANDE              l'arrête au bout de 5 secondes (signal TERM) ; code de retour 124\n" +
	"  timeout -s KILL 5 COMMANDE      avec SIGKILL, que rien ne peut ignorer ; code 137 (128 + 9)\n" +
	"  timeout -k 3 5 COMMANDE         TERM au bout de 5 s, puis KILL 3 s plus tard si elle tient encore\n" +
	"  timeout 2m ...                  les durées : s, m, h, d\n\n" +
	"echo $? juste après dit comment ça s'est fini : 124, le temps était écoulé ; sinon, le code de la commande elle-même.\n" +
	"Un programme peut ignorer SIGTERM : timeout seul attendrait alors sans fin. D'où -k, ou -s KILL.");
MANUEL["ssh-agent"] = page("garder ses clés déverrouillées le temps d'une session", "SSH AGENT",
	"Une clé protégée par une phrase de passe la redemande à chaque connexion. L'agent la garde déverrouillée, en mémoire.\n\n" +
	"  eval \"$(ssh-agent -s)\"    lance l'agent ET pose SSH_AUTH_SOCK et SSH_AGENT_PID dans ton shell\n" +
	"  ssh-agent -k               l'arrête\n\nLancé seul (sans eval), ssh-agent tourne, mais ton shell ne sait pas où le trouver.");
MANUEL["ssh-add"] = page("confier une clé à l'agent", "SSH ADD",
	"  ssh-add ~/.ssh/cle      ajoute la clé (la phrase de passe est demandée UNE fois)\n  ssh-add -l              les clés que l'agent garde (leur empreinte)\n" +
	"  ssh-add -d ~/.ssh/cle   en retire une ;  ssh-add -D : les retire toutes\n  ssh-add -t 3600 ...     l'agent l'oublie au bout d'une heure\n\n" +
	"En partant d'un poste partagé : ssh-add -D, puis ssh-agent -k. Une clé privée doit être en 600 (chmod 600), sinon ssh-add la refuse.");
var SORTS_ANNEXES_1 = ["lscpu", "lspci", "lsusb", "dmidecode", "apropos", "whatis", "pwgen", "hexdump", "readlink", "realpath", "timeout", "ssh-agent", "ssh-add"];
SORTS_ANNEXES_1.forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
/* Des ajouts aux pages des sorts que les chapitres enseignent déjà. */
(function(){
	function ajout(nom, texte){ if (MANUEL[nom]) MANUEL[nom].page += "\n\n" + texte; }
	ajout("man", "Les sections : man 5 passwd (le fichier /etc/passwd) n'est pas man 1 passwd (la commande).\n  man -k MOT (ou apropos MOT) cherche un mot dans toutes les pages ;  man -f NOM (ou whatis NOM) donne ses sections.");
	ajout("ssh", "La carte de visite des machines, ~/.ssh/config :\n  Host depot\n      HostName 10.0.97.77\n      User cours\n      Port 2222\n      IdentityFile ~/.ssh/depot_ed25519\n" +
		"puis ssh depot suffit.  ssh -p PORT, -l COMPTE, -i CLÉ : les mêmes réglages, en options.\n" +
		"  ssh -J passerelle machine        rebondir par une passerelle (ProxyJump dans ~/.ssh/config)\n" +
		"  ssh -f -N -L 8080:site:80 passerelle    un tunnel : localhost:8080, ici, mène à site:80, de l'autre côté\n" +
		"  ssh machine COMMANDE             lancer une seule commande là-bas, et revenir");
	ajout("nc", "Écouter : nc -l 5555 (ou nc -l -p 5555) attend qu'on se connecte au port 5555, et affiche ce qui arrive.\n" +
		"  nc -l 5555 > recu.txt            recevoir un fichier\n  nc MACHINE 5555 < fichier.txt    envoyer un fichier à qui écoute\n  echo \"bonjour\" | nc MACHINE 5555   envoyer une ligne\n" +
		"Tout passe en clair : pour un secret, ssh ou scp.");
	ajout("tail", "Suivre un journal qui grandit : tail -f JOURNAL (Ctrl+C pour arrêter).\n  tail -F JOURNAL   suit le NOM : si le journal est remplacé (rotation), tail rouvre le nouveau.\n" +
		"  tail -F JOURNAL | grep --line-buffered MOT > alertes.txt   garder les lignes intéressantes, au fil de l'eau");
	ajout("grep", "  --line-buffered   écrire chaque ligne trouvée tout de suite (après un tail -f, vers un fichier ou un tuyau)");
	ajout("ln", "Sans -s, ln fabrique un lien DUR : un deuxième nom pour le même fichier (le même inode).\n" +
		"  ln original DOSSIER    le fichier existe désormais sous deux noms ; effacer l'un ne détruit pas l'autre\n" +
		"  ls -i                  le numéro d'inode : deux liens durs ont le même ;  ls -li : avec le nombre de liens\n" +
		"Un lien dur ne traverse pas les systèmes de fichiers (Invalid cross-device link) et ne vise pas un dossier.");
	ajout("ls", "  ls -i    le numéro d'inode de chaque objet (deux liens durs vers le même fichier ont le même)");
	ajout("openssl", "  openssl rand -base64 24         24 octets aléatoires, en base64 (un mot de passe, une clé)\n" +
		"  openssl passwd -6 MOT           l'empreinte sha512-crypt d'un mot de passe, comme dans /etc/shadow ($6$sel$...)\n" +
		"  openssl passwd -6 -salt SEL MOT avec un sel imposé : pour vérifier un mot de passe contre une empreinte connue\n" +
		"Deux empreintes d'un même mot diffèrent : chacune a son SEL, tiré au hasard.");
})();

World.fige = true;

/* Les lumières des habitants, ajoutées en bas du plan d'un chapitre (schema, traque, grimoire, rempart). */
function axLumieresDansPlan(sort, chapitre){
	var avant = Shell.sorts[sort];
	if (typeof avant !== "function") return;
	Shell.sorts[sort] = function(args, io){
		var sortie = avant.apply(this, arguments);
		try {
			var l = typeof lumieresAnnexes === "function" ? lumieresAnnexes(chapitre) : [];
			if (l.length && typeof sortie === "string" && sortie !== "") sortie += "\n\n" + C.gras("Les lumières des habitants") + "\n" + l.map(function(x){ return "  " + C.jaune("✺") + " " + x; }).join("\n");
		} catch (e){}
		return sortie;
	};
}
