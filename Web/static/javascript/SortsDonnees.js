/**
 * SortsDonnees.js : les commandes Linux de la donnée (chapitre 10, le Lac Profond).
 *
 * Au plus près des vrais outils, avec leurs options courantes, leurs messages d'erreur et leurs codes de retour :
 *   - csvkit : csvlook, csvcut, csvstat, csvgrep, csvsort, csvjson (l'inférence de types d'agate : booléens, nombres,
 *     durées, dates, textes ; les valeurs nulles « », na, n/a, none, null) ;
 *   - GNU datamash (groupby, sum, mean, median, min, max, count, first, last, unique, countunique, sstdev...,
 *     transpose, reverse, check, crosstab) ;
 *   - Miller (mlr) : lecture et écriture CSV, TSV, JSON, JSON Lines, pprint, xtab, markdown ; les verbes cat, head,
 *     tail, sort, filter, put, cut, uniq, count, count-distinct, stats1, rename, reorder, label, top, fill-empty,
 *     nothing, tac, chaînés par then ; un petit langage d'expressions pour filter et put ;
 *   - les octets et les fichiers : od, truncate, mktemp, csplit, expand, unexpand, shred, cksum, sha512sum, b2sum ;
 *   - le travail : pv, parallel (GNU), flock, time ; les ressources des machines modélisées : ionice, taskset ;
 *   - yq (mikefarah, v4) pour lire le YAML (compose.yaml) ;
 *   - et des retouches : sed comprend \xHH (le BOM \xEF\xBB\xBF), zstd -q, -o, -T0.
 *
 * Aucune de ces commandes n'est connue d'office : SORTS_DONNEES les liste, le chapitre 10 les enseigne.
 */

var SORTS_DONNEES = ["csvlook", "csvcut", "csvstat", "csvgrep", "csvsort", "csvjson", "datamash", "mlr", "od", "truncate", "mktemp", "csplit",
	"expand", "unexpand", "shred", "cksum", "sha512sum", "b2sum", "pv", "parallel", "flock", "time", "ionice", "taskset", "yq"];

/* ================================================================== */
/* Les outils communs                                                   */
/* ================================================================== */

function sdAstuce(io, texte){ return typeof astuce === "function" ? astuce(io, texte) : ""; }
function sdHote(){ try { return typeof machineIci === "function" ? machineIci() : null; } catch (e){ return null; } }
/* Les octets d'un objet (l'encodage latin-1 compris), ou d'un texte arrivé par un tuyau. */
function sdOctetsObjet(item){
	if (typeof axOctetsObjet === "function") return axOctetsObjet(item);
	return versOctetsUtf8(contenuExact(item.getText(), item.sansFinDeLigne));
}
function sdOctetsTexte(texte, sansFin){ return versOctetsUtf8(contenuExact(texte, sansFin)); }
/* Des octets redevenus texte (UTF-8 ; un octet isolé devient le caractère de même code, comme printf le fait ici). */
function sdTexteDeOctets(o){
	var t = "", i = 0;
	while (i < o.length){
		var b = o[i], n = b < 0x80 ? 0 : (b & 0xe0) === 0xc0 ? 1 : (b & 0xf0) === 0xe0 ? 2 : (b & 0xf8) === 0xf0 ? 3 : -1;
		var ok = n >= 0 && i + n < o.length;
		for (var k = 1; ok && k <= n; k++) if ((o[i + k] & 0xc0) !== 0x80) ok = false;
		if (!ok || n === 0){ t += String.fromCharCode(b); i++; continue; }
		var cp = n === 1 ? b & 0x1f : (n === 2 ? b & 0x0f : b & 0x07);
		for (k = 1; k <= n; k++) cp = (cp << 6) | (o[i + k] & 0x3f);
		t += String.fromCodePoint(cp);
		i += n + 1;
	}
	return t;
}
/* Les sources d'une commande : les objets nommés, ou le tuyau. Chacune : { nom, texte, octets(), item }. */
function sdSources(noms, io, cmd, utilisation){
	if (!noms.length){
		if (io.stdin === null) throw new ShellError(cmd + " : il faut un objet, ou un texte arrivant par un tuyau. Utilisation : " + utilisation);
		return [{ nom: "-", texte: io.stdin, sansFin: !!io.stdinSansFin, item: null, octets: function(){ return sdOctetsTexte(io.stdin, io.stdinSansFin); } }];
	}
	return noms.map(function(nom){
		if (nom === "-") return { nom: "-", texte: io.stdin === null ? "" : io.stdin, sansFin: !!io.stdinSansFin, item: null, octets: function(){ return io.stdin === null ? [] : sdOctetsTexte(io.stdin, io.stdinSansFin); } };
		var t = Shell.objetLisible(nom, io, cmd);
		return { nom: nom, texte: t.item.getText(), sansFin: !!t.item.sansFinDeLigne, item: t.item, room: t.room, octets: function(){ return sdOctetsObjet(t.item); } };
	});
}
/* Une source unique, avec le message d'un outil qui ne trouve pas son fichier (le vrai message, pas celui du jeu). */
function sdLireUn(nom, io, cmd, messageAbsent){
	if (nom === undefined || nom === null || nom === "-"){
		if (io.stdin === null) throw new ShellError(messageAbsent || (cmd + " : il faut un objet, ou un texte arrivant par un tuyau."));
		return { nom: "-", texte: io.stdin, item: null };
	}
	var t = Shell.objetLisible(nom, io, cmd);
	return { nom: nom, texte: t.item.getText(), item: t.item, room: t.room };
}
function sdLignes(texte){ return lignesDe(String(texte).replace(/\r\n/g, "\n")); }
function sdPad(t, n){ t = String(t); while (t.length < n) t = "0" + t; return t; }
function sdGauche(t, n){ t = String(t); while (t.length < n) t = " " + t; return t; }
function sdDroite(t, n){ t = String(t); while (t.length < n) t += " "; return t; }
/* La largeur affichée d'un texte (les caractères combinants n'en prennent pas). */
function sdLargeur(t){ return Array.from(String(t).normalize("NFC")).length; }
function sdGaucheL(t, n){ t = String(t); var l = sdLargeur(t); while (l < n){ t = " " + t; l++; } return t; }
function sdDroiteL(t, n){ t = String(t); var l = sdLargeur(t); while (l < n){ t += " "; l++; } return t; }
function sdEvenement(cmd, infos){
	var e = { type: "donnees", cmd: cmd, hote: sdHote() };
	for (var k in (infos || {})) if (infos.hasOwnProperty(k)) e[k] = infos[k];
	try { GameEvents.fire(e); } catch (x){}
}
/* %g du C (printf), à la précision p : les zéros de fin retirés, l'exposant à deux chiffres au moins. */
function sdFormatG(x, p){
	if (!isFinite(x)) return isNaN(x) ? "nan" : (x < 0 ? "-inf" : "inf");
	if (x === 0) return (1 / x < 0) ? "-0" : "0";
	var exp = Math.floor(Math.log10(Math.abs(x)));
	var s = x.toExponential(p - 1), m = /^(-?[\d.]+)e([+-]\d+)$/.exec(s);
	exp = +m[2];
	if (exp < -4 || exp >= p){
		var mant = m[1].indexOf(".") > -1 ? m[1].replace(/0+$/, "").replace(/\.$/, "") : m[1];
		return mant + "e" + (exp < 0 ? "-" : "+") + sdPad(Math.abs(exp), 2);
	}
	var f = x.toFixed(Math.max(0, p - 1 - exp));
	if (f.indexOf(".") > -1) f = f.replace(/0+$/, "").replace(/\.$/, "");
	return f;
}

/* ================================================================== */
/* Les empreintes : SHA-512, BLAKE2b, le CRC de cksum                   */
/* ================================================================== */

var SD_K512 = [
	0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc, 0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2, 0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65, 0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4, 0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df, 0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30, 0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8, 0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec, 0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178, 0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c, 0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817];
function sdSha512(o){
	var H = [0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1, 0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179];
	var l = o.length, m = o.slice();
	m.push(0x80);
	while (m.length % 128 !== 112) m.push(0);
	for (var z = 0; z < 8; z++) m.push(0);
	var bits = l * 8, hi = Math.floor(bits / 0x100000000), lo = bits >>> 0;
	m.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
	var W = new Array(160);
	function add(ah, al, bh, bl){ var l2 = (al >>> 0) + (bl >>> 0); return [(ah + bh + Math.floor(l2 / 0x100000000)) >>> 0, l2 >>> 0]; }
	function rotr(h, l2, n){ return n < 32 ? [((h >>> n) | (l2 << (32 - n))) >>> 0, ((l2 >>> n) | (h << (32 - n))) >>> 0] : [((l2 >>> (n - 32)) | (h << (64 - n))) >>> 0, ((h >>> (n - 32)) | (l2 << (64 - n))) >>> 0]; }
	function shr(h, l2, n){ return [h >>> n, ((l2 >>> n) | (h << (32 - n))) >>> 0]; }
	function x3(a, b, c){ return [(a[0] ^ b[0] ^ c[0]) >>> 0, (a[1] ^ b[1] ^ c[1]) >>> 0]; }
	for (var bloc = 0; bloc < m.length; bloc += 128){
		for (var t = 0; t < 16; t++){
			var j = bloc + t * 8;
			W[2 * t] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) >>> 0;
			W[2 * t + 1] = ((m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7]) >>> 0;
		}
		for (t = 16; t < 80; t++){
			var a15 = [W[2 * (t - 15)], W[2 * (t - 15) + 1]], a2 = [W[2 * (t - 2)], W[2 * (t - 2) + 1]];
			var s0 = x3(rotr(a15[0], a15[1], 1), rotr(a15[0], a15[1], 8), shr(a15[0], a15[1], 7));
			var s1 = x3(rotr(a2[0], a2[1], 19), rotr(a2[0], a2[1], 61), shr(a2[0], a2[1], 6));
			var r = add(s0[0], s0[1], s1[0], s1[1]);
			r = add(r[0], r[1], W[2 * (t - 7)], W[2 * (t - 7) + 1]);
			r = add(r[0], r[1], W[2 * (t - 16)], W[2 * (t - 16) + 1]);
			W[2 * t] = r[0]; W[2 * t + 1] = r[1];
		}
		var v = H.slice();
		for (t = 0; t < 80; t++){
			var e = [v[8], v[9]], aa = [v[0], v[1]];
			var S1 = x3(rotr(e[0], e[1], 14), rotr(e[0], e[1], 18), rotr(e[0], e[1], 41));
			var ch = [((v[8] & v[10]) ^ (~v[8] & v[12])) >>> 0, ((v[9] & v[11]) ^ (~v[9] & v[13])) >>> 0];
			var t1 = add(v[14], v[15], S1[0], S1[1]);
			t1 = add(t1[0], t1[1], ch[0], ch[1]);
			t1 = add(t1[0], t1[1], SD_K512[2 * t], SD_K512[2 * t + 1]);
			t1 = add(t1[0], t1[1], W[2 * t], W[2 * t + 1]);
			var S0 = x3(rotr(aa[0], aa[1], 28), rotr(aa[0], aa[1], 34), rotr(aa[0], aa[1], 39));
			var maj = [((v[0] & v[2]) ^ (v[0] & v[4]) ^ (v[2] & v[4])) >>> 0, ((v[1] & v[3]) ^ (v[1] & v[5]) ^ (v[3] & v[5])) >>> 0];
			var t2 = add(S0[0], S0[1], maj[0], maj[1]);
			v[14] = v[12]; v[15] = v[13]; v[12] = v[10]; v[13] = v[11]; v[10] = v[8]; v[11] = v[9];
			var ne = add(v[6], v[7], t1[0], t1[1]); v[8] = ne[0]; v[9] = ne[1];
			v[6] = v[4]; v[7] = v[5]; v[4] = v[2]; v[5] = v[3]; v[2] = v[0]; v[3] = v[1];
			var na = add(t1[0], t1[1], t2[0], t2[1]); v[0] = na[0]; v[1] = na[1];
		}
		for (var k = 0; k < 16; k += 2){ var s = add(H[k], H[k + 1], v[k], v[k + 1]); H[k] = s[0]; H[k + 1] = s[1]; }
	}
	return H.map(function(x){ return ("00000000" + x.toString(16)).slice(-8); }).join("");
}
var SD_B2B_IV = [0xF3BCC908, 0x6A09E667, 0x84CAA73B, 0xBB67AE85, 0xFE94F82B, 0x3C6EF372, 0x5F1D36F1, 0xA54FF53A, 0xADE682D1, 0x510E527F, 0x2B3E6C1F, 0x9B05688C, 0xFB41BD6B, 0x1F83D9AB, 0x137E2179, 0x5BE0CD19];
var SD_B2B_SIGMA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3, 11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
	7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8, 9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13, 2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
	12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11, 13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10, 6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
	10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3].map(function(x){ return x * 2; });
function sdBlake2b(o, outlen){
	outlen = outlen || 64;
	var h = SD_B2B_IV.slice(), b = new Array(128), c = 0, t = 0;
	h[0] = (h[0] ^ 0x01010000 ^ outlen) >>> 0;
	var v = new Array(32), m = new Array(32);
	function add64aa(a, bb){ var o0 = v[a] + v[bb], o1 = v[a + 1] + v[bb + 1]; if (o0 >= 0x100000000) o1++; v[a] = o0 >>> 0; v[a + 1] = o1 >>> 0; }
	function add64ac(a, b0, b1){ var o0 = v[a] + b0, o1 = v[a + 1] + b1; if (o0 >= 0x100000000) o1++; v[a] = o0 >>> 0; v[a + 1] = o1 >>> 0; }
	function G(a, bb, cc, d, ix, iy){
		var x0 = m[ix], x1 = m[ix + 1], y0 = m[iy], y1 = m[iy + 1];
		add64aa(a, bb); add64ac(a, x0, x1);
		var xor0 = v[d] ^ v[a], xor1 = v[d + 1] ^ v[a + 1];
		v[d] = xor1 >>> 0; v[d + 1] = xor0 >>> 0;
		add64aa(cc, d);
		xor0 = v[bb] ^ v[cc]; xor1 = v[bb + 1] ^ v[cc + 1];
		v[bb] = ((xor0 >>> 24) ^ (xor1 << 8)) >>> 0; v[bb + 1] = ((xor1 >>> 24) ^ (xor0 << 8)) >>> 0;
		add64aa(a, bb); add64ac(a, y0, y1);
		xor0 = v[d] ^ v[a]; xor1 = v[d + 1] ^ v[a + 1];
		v[d] = ((xor0 >>> 16) ^ (xor1 << 16)) >>> 0; v[d + 1] = ((xor1 >>> 16) ^ (xor0 << 16)) >>> 0;
		add64aa(cc, d);
		xor0 = v[bb] ^ v[cc]; xor1 = v[bb + 1] ^ v[cc + 1];
		v[bb] = ((xor1 >>> 31) ^ (xor0 << 1)) >>> 0; v[bb + 1] = ((xor0 >>> 31) ^ (xor1 << 1)) >>> 0;
	}
	function compresser(dernier){
		var i;
		for (i = 0; i < 16; i++){ v[i] = h[i]; v[i + 16] = SD_B2B_IV[i]; }
		v[24] = (v[24] ^ (t >>> 0)) >>> 0; v[25] = (v[25] ^ Math.floor(t / 0x100000000)) >>> 0;
		if (dernier){ v[28] = (~v[28]) >>> 0; v[29] = (~v[29]) >>> 0; }
		for (i = 0; i < 32; i++) m[i] = (b[4 * i] ^ (b[4 * i + 1] << 8) ^ (b[4 * i + 2] << 16) ^ (b[4 * i + 3] << 24)) >>> 0;
		for (i = 0; i < 12; i++){
			var s = i * 16, S = SD_B2B_SIGMA;
			G(0, 8, 16, 24, S[s], S[s + 1]); G(2, 10, 18, 26, S[s + 2], S[s + 3]); G(4, 12, 20, 28, S[s + 4], S[s + 5]); G(6, 14, 22, 30, S[s + 6], S[s + 7]);
			G(0, 10, 20, 30, S[s + 8], S[s + 9]); G(2, 12, 22, 24, S[s + 10], S[s + 11]); G(4, 14, 16, 26, S[s + 12], S[s + 13]); G(6, 8, 18, 28, S[s + 14], S[s + 15]);
		}
		for (i = 0; i < 16; i++) h[i] = (h[i] ^ v[i] ^ v[i + 16]) >>> 0;
	}
	for (var i = 0; i < o.length; i++){
		if (c === 128){ t += c; compresser(false); c = 0; }
		b[c++] = o[i];
	}
	t += c;
	while (c < 128) b[c++] = 0;
	compresser(true);
	var r = "";
	for (i = 0; i < outlen; i++) r += ("0" + ((h[i >> 2] >>> (8 * (i & 3))) & 255).toString(16)).slice(-2);
	return r;
}
var SD_TABLE_CRC = (function(){
	var t = [];
	for (var i = 0; i < 256; i++){
		var c = i << 24;
		for (var k = 0; k < 8; k++) c = (c & 0x80000000) ? ((c << 1) ^ 0x04C11DB7) : (c << 1);
		t.push(c >>> 0);
	}
	return t;
})();
function sdCrcPosix(o){
	var crc = 0;
	function pousser(b){ crc = ((crc << 8) ^ SD_TABLE_CRC[((crc >>> 24) ^ b) & 255]) >>> 0; }
	for (var i = 0; i < o.length; i++) pousser(o[i]);
	for (var n = o.length; n > 0; n = Math.floor(n / 256)) pousser(n & 255);
	return (~crc) >>> 0;
}
/* sha512sum et b2sum : comme sha256sum (OBJET, le tuyau, -c), mais sur les octets réels. */
function sdSortEmpreinte(nom, calcul, longueurHex){
	return function(args, io){
		var verifier = false, objets = [], bits = null, tag = false;
		for (var i = 0; i < args.length; i++){
			var a = args[i], m;
			if (a === "-c" || a === "--check") verifier = true;
			else if (a === "--tag") tag = true;
			else if (nom === "b2sum" && (a === "-l" || a === "--length")) bits = +args[++i];
			else if (nom === "b2sum" && (m = /^(?:-l|--length=)(\d+)$/.exec(a))) bits = +m[1];
			else if (a === "-b" || a === "-t" || a === "--binary" || a === "--text" || a === "-w" || a === "--warn" || a === "--quiet" || a === "--status" || a === "--strict") continue;
			else if (a.charAt(0) === "-" && a !== "-") throw new ShellError(nom + ": invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry '" + nom + " --help' for more information.", 1);
			else objets.push(a);
		}
		if (bits !== null && (isNaN(bits) || bits % 8 || bits < 8 || bits > 512)) throw new ShellError(nom + ": invalid length: '" + bits + "'\n" + nom + ": length is not a multiple of 8", 1);
		var octetsSortie = bits ? bits / 8 : null;
		var f = function(o){ return calcul(o, octetsSortie); };
		var ligne = function(h, n){ return tag ? (nom === "b2sum" ? "BLAKE2b" + (bits && bits !== 512 ? "-" + bits : "") : "SHA512") + " (" + n + ") = " + h : h + "  " + n; };
		if (!verifier){
			if (!objets.length){
				if (io.stdin === null) throw new ShellError(nom + " : de quoi veux-tu l'empreinte ? Utilisation : " + nom + " OBJET");
				return ligne(f(sdOctetsTexte(io.stdin, io.stdinSansFin)), "-");
			}
			var l = [];
			objets.forEach(function(n){
				try {
					var t = Shell.objetLisible(n, io, nom);
					l.push(ligne(f(sdOctetsObjet(t.item)), n));
					sdEvenement(nom, { item: t.item, chemin: n });
				} catch (e){
					if (!(e instanceof ShellError)) throw e;
					io.err(nom + ": " + n + ": No such file or directory");
					io.code = 1;
				}
			});
			return l.join("\n");
		}
		var liste = objets.length ? Shell.objetLisible(objets[0], io, nom).item.getText() : io.stdin;
		if (liste === null) throw new ShellError(nom + " -c : quelle liste d'empreintes ?");
		var res = [], echecs = 0;
		lignesDe(liste).forEach(function(l){
			var m = /^([0-9a-fA-F]+) [ *](.+)$/.exec(l.trim());
			if (!m) return;
			var lg = m[1].length / 2;
			try {
				var t = Shell.objetLisible(m[2].trim(), io, nom);
				var ok = calcul(sdOctetsObjet(t.item), nom === "b2sum" ? lg : null) === m[1].toLowerCase();
				res.push(m[2].trim() + (ok ? ": OK" : ": FAILED"));
				if (!ok) echecs++;
			} catch (e){
				if (!(e instanceof ShellError)) throw e;
				res.push(m[2].trim() + ": FAILED open or read");
				echecs++;
			}
		});
		if (echecs){ io.err(nom + ": WARNING: " + echecs + " computed checksum" + (echecs > 1 ? "s" : "") + " did NOT match"); io.code = 1; }
		return res.join("\n");
	};
}
Shell.sorts.sha512sum = sdSortEmpreinte("sha512sum", function(o){ return sdSha512(o); });
Shell.sorts.b2sum = sdSortEmpreinte("b2sum", function(o, n){ return sdBlake2b(o, n || 64); });
Shell.sorts.cksum = function(args, io){
	var noms = [];
	args.forEach(function(a){
		if (a === "-a" || a === "--algorithm" || /^--algorithm=crc$/.test(a) || a === "crc") return;
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("cksum: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'cksum --help' for more information.", 1);
		noms.push(a);
	});
	var sources = sdSources(noms, io, "cksum", "cksum OBJET");
	return sources.map(function(s){ var o = s.octets(); return sdCrcPosix(o) + " " + o.length + (s.nom === "-" ? "" : " " + s.nom); }).join("\n");
};

/* ================================================================== */
/* od : les octets, un par un                                           */
/* ================================================================== */

var SD_OD_NOMS = { 0: "\\0", 7: "\\a", 8: "\\b", 9: "\\t", 10: "\\n", 11: "\\v", 12: "\\f", 13: "\\r" };
Shell.sorts.od = function(args, io){
	var base = "o", type = null, saut = 0, limite = null, tous = false, noms = [];
	function poserType(t){
		if (/^c$/.test(t)) type = { k: "c", n: 1 };
		else if (/^a$/.test(t)) type = { k: "a", n: 1 };
		else {
			var m = /^([xoud])([1248]|C|S|I|L)?z?$/.exec(t);
			if (!m) throw new ShellError("od: invalid type string '" + t + "'", 1);
			var n = { C: 1, S: 2, I: 4, L: 8 }[m[2]] || (m[2] ? +m[2] : (m[1] === "x" || m[1] === "o" || m[1] === "u" || m[1] === "d" ? 4 : 2));
			type = { k: m[1], n: n };
		}
	}
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-A" || a === "--address-radix"){ base = args[++i]; continue; }
		if ((m = /^(?:-A|--address-radix=)(.)$/.exec(a))){ base = m[1]; continue; }
		if (a === "-t" || a === "--format"){ poserType(args[++i] || ""); continue; }
		if ((m = /^(?:-t|--format=)(.+)$/.exec(a))){ poserType(m[1]); continue; }
		if (a === "-N" || a === "--read-bytes"){ limite = lireNombreOd(args[++i]); continue; }
		if ((m = /^(?:-N|--read-bytes=)(.+)$/.exec(a))){ limite = lireNombreOd(m[1]); continue; }
		if (a === "-j" || a === "--skip-bytes"){ saut = lireNombreOd(args[++i]); continue; }
		if ((m = /^(?:-j|--skip-bytes=)(.+)$/.exec(a))){ saut = lireNombreOd(m[1]); continue; }
		if (a === "-v" || a === "--output-duplicates"){ tous = true; continue; }
		if (a === "-w" || /^-w\d+$/.test(a) || /^--width/.test(a)) continue;
		if (/^-[cbxdoAn]+$/.test(a) && a !== "-"){
			a.substring(1).split("").forEach(function(l){
				if (l === "c") type = { k: "c", n: 1 };
				else if (l === "b") type = { k: "o", n: 1 };
				else if (l === "x") type = { k: "x", n: 2 };
				else if (l === "d") type = { k: "u", n: 2 };
				else if (l === "o") type = { k: "o", n: 2 };
			});
			if (/^-An$/.test(a)) base = "n";
			continue;
		}
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("od: invalid option -- '" + a.charAt(1) + "'\nTry 'od --help' for more information.", 1);
		noms.push(a);
	}
	if (["o", "d", "x", "n"].indexOf(base) === -1) throw new ShellError("od: invalid output address radix '" + base + "'; it must be one character from [doxn]", 1);
	type = type || { k: "o", n: 2 };
	var octets = [];
	sdSources(noms, io, "od", "od -c OBJET").forEach(function(s){ octets = octets.concat(s.octets()); });
	var tout = octets.length;
	octets = octets.slice(saut, limite === null ? undefined : saut + limite);
	var adresse = function(n){ return base === "o" ? sdPad(n.toString(8), 7) : base === "d" ? sdPad(n, 7) : base === "x" ? sdPad(n.toString(16), 6) : ""; };
	var champ = function(groupe){
		var k = type.k, n = type.n;
		if (k === "c" || k === "a") return groupe.map(function(b){
			if (k === "a"){ var noms = ["nul", "soh", "stx", "etx", "eot", "enq", "ack", "bel", "bs", "ht", "nl", "vt", "ff", "cr", "so", "si", "dle", "dc1", "dc2", "dc3", "dc4", "nak", "syn", "etb", "can", "em", "sub", "esc", "fs", "gs", "rs", "us", "sp"]; var c7 = b & 127; return sdGauche(c7 <= 32 ? noms[c7] : (c7 === 127 ? "del" : String.fromCharCode(c7)), 4); }
			if (SD_OD_NOMS[b] !== undefined) return sdGauche(SD_OD_NOMS[b], 4);
			if (b >= 32 && b < 127) return sdGauche(String.fromCharCode(b), 4);
			return sdGauche(sdPad(b.toString(8), 3), 4);
		}).join("");
		var r = [];
		for (var i = 0; i < groupe.length; i += n){
			var v = 0;
			for (var j = n - 1; j >= 0; j--) v = v * 256 + (groupe[i + j] || 0);
			if (k === "x") r.push(" " + sdPad(v.toString(16), n * 2));
			else if (k === "o") r.push(" " + sdPad(v.toString(8), Math.ceil(n * 8 / 3)));
			else if (k === "u") r.push(sdGauche(v, { 1: 3, 2: 5, 4: 10, 8: 20 }[n] + 1));
			else if (k === "d"){ var lim = Math.pow(2, 8 * n); if (v >= lim / 2) v -= lim; r.push(sdGauche(v, { 1: 4, 2: 6, 4: 11, 8: 20 }[n] + 1)); }
		}
		return r.join("");
	};
	var lignes = [], precedente = null, etoile = false;
	for (var p = 0; p < octets.length; p += 16){
		var g = octets.slice(p, p + 16);
		var corps = champ(g);
		if (!tous && precedente !== null && g.length === 16 && corps === precedente){ if (!etoile) lignes.push("*"); etoile = true; continue; }
		etoile = false;
		precedente = g.length === 16 ? corps : null;
		lignes.push(base === "n" ? corps : adresse(saut + p) + corps);
	}
	if (base !== "n") lignes.push(adresse(saut + octets.length));
	sdEvenement("od", { taille: tout, type: type.k });
	return lignes.join("\n");
};
function lireNombreOd(t){
	var m = /^(0x[0-9a-f]+|0[0-7]*|\d+)([bkmKMG]?)$/i.exec(String(t || ""));
	if (!m) throw new ShellError("od: invalid number '" + t + "'", 1);
	var n = /^0x/i.test(m[1]) ? parseInt(m[1], 16) : (/^0\d/.test(m[1]) ? parseInt(m[1], 8) : parseInt(m[1], 10));
	return n * ({ b: 512, k: 1024, K: 1024, m: 1048576, M: 1048576, G: 1073741824 }[m[2]] || 1);
}

/* ================================================================== */
/* truncate, mktemp, csplit, expand, unexpand, shred                    */
/* ================================================================== */

/* La taille d'un objet en octets (le texte, ou la taille déclarée d'un fichier énorme). */
function sdTaille(item){
	if (typeof tailleObjetMachine === "function") return tailleObjetMachine(item);
	return sdOctetsObjet(item).length;
}
Shell.sorts.truncate = function(args, io){
	var taille = null, ref = null, pasCreer = false, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-s" || a === "--size"){ taille = args[++i]; if (taille === undefined) throw new ShellError("truncate: option requires an argument -- 's'\nTry 'truncate --help' for more information.", 1); continue; }
		if ((m = /^(?:-s|--size=)(.+)$/.exec(a))){ taille = m[1]; continue; }
		if (a === "-r" || a === "--reference"){ ref = args[++i]; continue; }
		if ((m = /^(?:-r|--reference=)(.+)$/.exec(a))){ ref = m[1]; continue; }
		if (a === "-c" || a === "--no-create"){ pasCreer = true; continue; }
		if (a === "-o" || a === "--io-blocks") continue;
		if (/^-[co]+$/.test(a)){ if (a.indexOf("c") > -1) pasCreer = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("truncate: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'truncate --help' for more information.", 1);
		noms.push(a);
	}
	if (taille === null && ref === null) throw new ShellError("truncate: you must specify either '--size' or '--reference'\nTry 'truncate --help' for more information.", 1);
	if (!noms.length) throw new ShellError("truncate: missing file operand\nTry 'truncate --help' for more information.", 1);
	var op = "=", n = 0;
	if (taille !== null){
		var mt = /^([+\-<>\/%]?)(\d+)(K|KB|KiB|M|MB|MiB|G|GB|GiB|T|TB|TiB|k)?$/.exec(taille);
		if (!mt) throw new ShellError("truncate: Invalid number: '" + taille + "'", 1);
		op = mt[1] || "=";
		var u = mt[3] || "";
		var mult = /B$/.test(u) && !/iB$/.test(u) ? Math.pow(1000, "KMGT".indexOf(u.charAt(0).toUpperCase()) + 1) : (u ? Math.pow(1024, "KMGT".indexOf(u.charAt(0).toUpperCase()) + 1) : 1);
		n = +mt[2] * mult;
	}
	var h = sdHote(), sorties = [];
	noms.forEach(function(nom){
		// /proc/PID/fd/N sur une machine : le fichier tenu ouvert (souvent supprimé) par un processus.
		var mp = h ? /^\/proc\/(\d+)\/fd\/(\d+)$/.exec(String(nom)) : null;
		if (mp && typeof procParPid === "function"){
			var p = procParPid(h, mp[1]);
			var f = p ? (p.fichiers || []).filter(function(x, k){ return String(parseInt(x.fd, 10) || 3 + k) === mp[2]; })[0] : null;
			if (!p || !f){ io.err("truncate: cannot open '" + nom + "' for writing: No such file or directory"); io.code = 1; return; }
			if (!io.sudo && p.user !== JOUEUR){ io.err("truncate: cannot open '" + nom + "' for writing: Permission denied"); io.code = 1; return; }
			var avantF = f.taille || 0, nouvelleF = op === "=" ? n : op === "+" ? avantF + n : op === "-" ? Math.max(0, avantF - n) : op === "<" ? Math.min(avantF, n) : op === ">" ? Math.max(avantF, n) : op === "/" ? Math.floor(avantF / n) * n : Math.ceil(avantF / n) * n;
			f.taille = nouvelleF;
			sdEvenement("truncate", { chemin: nom, pid: p.pid, fd: +mp[2], avant: avantF, apres: nouvelleF, supprime: !!f.supprime, fantome: true });
			return;
		}
		var r = Shell.chercher(nom, io, "truncate");
		if (r.node instanceof Room){ io.err("truncate: cannot open '" + nom + "' for writing: Is a directory"); io.code = 1; return; }
		if (r.node === null){
			if (pasCreer) return;
			if (!r.dir){ io.err("truncate: cannot open '" + nom + "' for writing: No such file or directory"); io.code = 1; return; }
			try { Shell.ecrire(nom, "", false, true); } catch (e){ if (!(e instanceof ShellError)) throw e; io.err("truncate: cannot open '" + nom + "' for writing: " + (/Permission/.test(e.message) ? "Permission denied" : (/space/.test(e.message) ? "No space left on device" : "No such file or directory"))); io.code = 1; return; }
			r = Shell.chercher(nom, io, "truncate");
		}
		var it = Shell.suivre ? Shell.suivre(r.node, "truncate") : r.node;
		if (!Shell.bit(it, "w", io)){ io.err("truncate: cannot open '" + nom + "' for writing: Permission denied"); io.code = 1; return; }
		var avant = sdTaille(it);
		var cible = ref !== null ? sdTaille(Shell.objetLisible(ref, io, "truncate").item) : 0;
		if (ref !== null && taille === null){ op = "="; n = cible; }
		var nouvelle = op === "=" ? n : op === "+" ? avant + n : op === "-" ? Math.max(0, avant - n) : op === "<" ? Math.min(avant, n) : op === ">" ? Math.max(avant, n) : op === "/" ? Math.floor(avant / n) * n : Math.ceil(avant / n) * n;
		if ((op === "/" || op === "%") && n === 0) throw new ShellError("truncate: division by zero", 1);
		var ancien = it.getText(), tailleDeclaree = null;
		if (it.taille !== undefined && it.taille !== null || nouvelle > 1048576){
			if (nouvelle === 0){ it.setText(""); it.sansFinDeLigne = true; }
			tailleDeclaree = nouvelle;
		} else {
			var o = sdOctetsObjet(it);
			if (nouvelle <= o.length) o = o.slice(0, nouvelle);
			else while (o.length < nouvelle) o.push(0);
			var t = it.encodage === "ISO-8859-1" ? o.map(function(b){ return String.fromCharCode(b); }).join("") : sdTexteDeOctets(o);
			var fin = /\n$/.test(t);
			it.setText(fin ? t.replace(/\n$/, "") : t);
			it.sansFinDeLigne = !fin;
		}
		if (h && typeof maintenantMachine === "function") it.mtimeMs = maintenantMachine(h);
		GameEvents.fire({ type: "write", item: it, room: r.dir, append: false, text: it.getText(), created: false, previous: ancien });
		// La taille d'un fichier énorme se pose après coup (une écriture ordinaire l'efface).
		if (tailleDeclaree !== null) it.taille = tailleDeclaree;
		sdEvenement("truncate", { chemin: nom, item: it, avant: avant, apres: nouvelle });
	});
	return sorties.join("\n");
};

var SD_MKTEMP_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var sdCompteurMktemp = 0;
Shell.sorts.mktemp = function(args, io){
	var dossier = false, essai = false, tmpdir = null, suffixe = "", modele = null, ancienT = false, calme = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-d" || a === "--directory"){ dossier = true; continue; }
		if (a === "-u" || a === "--dry-run"){ essai = true; continue; }
		if (a === "-q" || a === "--quiet"){ calme = true; continue; }
		if (a === "-t"){ ancienT = true; continue; }
		if (a === "-p" || a === "--tmpdir"){ tmpdir = args[++i]; continue; }
		if ((m = /^--tmpdir=(.*)$/.exec(a))){ tmpdir = m[1]; continue; }
		if ((m = /^-p(.+)$/.exec(a))){ tmpdir = m[1]; continue; }
		if ((m = /^--suffix=(.*)$/.exec(a))){ suffixe = m[1]; continue; }
		if (/^-[dutq]+$/.test(a)){ if (a.indexOf("d") > -1) dossier = true; if (a.indexOf("u") > -1) essai = true; if (a.indexOf("t") > -1) ancienT = true; if (a.indexOf("q") > -1) calme = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("mktemp: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'mktemp --help' for more information.", 1);
		if (modele !== null) throw new ShellError("mktemp: too many templates\nTry 'mktemp --help' for more information.", 1);
		modele = a;
	}
	var h = sdHote();
	var racineTmp = h ? "/tmp" : "~/tmp";
	if (modele === null){ modele = "tmp.XXXXXXXXXX"; if (tmpdir === null) tmpdir = racineTmp; }
	var dernier = modele.split("/").pop();
	var mx = /X{3,}(?!.*X{3,})/.exec(dernier + suffixe);
	if (!/XXX/.test(dernier)) throw new ShellError("mktemp: too few X's in template '" + modele + "'", 1);
	if ((ancienT || tmpdir === "") && modele.indexOf("/") > -1) throw new ShellError("mktemp: invalid template, '" + modele + "', contains directory separator", 1);
	if (ancienT || tmpdir === "") tmpdir = racineTmp;
	var chemin = (tmpdir !== null ? tmpdir.replace(/\/$/, "") + "/" : "") + modele;
	if (!h && /^\/tmp\//.test(chemin)) chemin = "~/tmp/" + chemin.substring(5);
	// Le dossier ~/tmp de la Maison, au besoin (l'île n'a pas de /tmp).
	if (!h && /^~\/tmp\//.test(chemin) && !(Home.getNode("tmp") instanceof Room)){
		var d = new Room("tmp", "Un dossier pour les fichiers temporaires.", "loc_etc.gif");
		d.owner = JOUEUR; d.mode = "rwxrwxrwt"; d.horsBareme = true;
		link_rooms(Home, d);
	}
	var nom = null;
	for (var essais = 0; essais < 20 && nom === null; essais++){
		sdCompteurMktemp++;
		var alea_ = function(k){ return SD_MKTEMP_ALPHABET.charAt(Math.floor(alea("mktemp:" + state.nbCommandes + ":" + sdCompteurMktemp + ":" + k) * 62)); };
		var pos = chemin.lastIndexOf(mx[0]), x = "";
		for (var k = 0; k < mx[0].length; k++) x += alea_(k);
		var candidat = chemin.substring(0, pos) + x + chemin.substring(pos + mx[0].length) + suffixe;
		var r0 = Shell.chercher(candidat, io, "mktemp");
		if (r0.node === null) nom = candidat;
	}
	var r = Shell.chercher(nom, io, "mktemp");
	if (!r.dir){ if (calme){ io.code = 1; return ""; } throw new ShellError("mktemp: failed to create " + (dossier ? "directory" : "file") + " via template '" + chemin + suffixe + "': No such file or directory", 1); }
	if (!essai){
		if (!Shell.bit(r.dir, "w", io)) throw new ShellError("mktemp: failed to create " + (dossier ? "directory" : "file") + " via template '" + chemin + suffixe + "': Permission denied", 1);
		var cree;
		if (dossier){
			cree = new Room(r.name, "Un dossier temporaire.", "loc_etc.gif");
			cree.owner = JOUEUR; cree.mode = "rwx------"; cree.horsBareme = true; cree.transitoire = true;
			link_rooms(r.dir, cree);
		} else {
			Shell.ecrire(nom, "", false, true);
			cree = Shell.chercher(nom, io, "mktemp").node;
			if (cree){ cree.mode = "rw-------"; cree.owner = JOUEUR; }
		}
		if (h && cree && typeof maintenantMachine === "function") cree.mtimeMs = maintenantMachine(h);
	}
	sdEvenement("mktemp", { chemin: nom, dossier: dossier });
	return nom;
};

Shell.sorts.csplit = function(args, io){
	var prefixe = "xx", format = null, chiffres = 2, calme = false, garder = false, elider = false, reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-f" || a === "--prefix"){ prefixe = args[++i]; continue; }
		if ((m = /^(?:-f|--prefix=)(.+)$/.exec(a))){ prefixe = m[1]; continue; }
		if (a === "-b" || a === "--suffix-format"){ format = args[++i]; continue; }
		if ((m = /^(?:-b|--suffix-format=)(.+)$/.exec(a))){ format = m[1]; continue; }
		if (a === "-n" || a === "--digits"){ chiffres = +args[++i]; continue; }
		if ((m = /^(?:-n|--digits=)(\d+)$/.exec(a))){ chiffres = +m[1]; continue; }
		if (a === "-s" || a === "-q" || a === "--quiet" || a === "--silent"){ calme = true; continue; }
		if (a === "-k" || a === "--keep-files"){ garder = true; continue; }
		if (a === "-z" || a === "--elide-empty-files"){ elider = true; continue; }
		if (/^-[sqkz]+$/.test(a)){ if (/[sq]/.test(a)) calme = true; if (/k/.test(a)) garder = true; if (/z/.test(a)) elider = true; continue; }
		if (a.charAt(0) === "-" && a !== "-" && !/^-\d+$/.test(a)) throw new ShellError("csplit: invalid option -- '" + a.charAt(1) + "'\nTry 'csplit --help' for more information.", 1);
		reste.push(a);
	}
	if (reste.length < 2) throw new ShellError("csplit: missing operand" + (reste.length ? " after '" + reste[0] + "'" : "") + "\nTry 'csplit --help' for more information.", 1);
	var src = sdLireUn(reste[0], io, "csplit");
	var lignes = lignesDe(src.texte);
	var motifs = reste.slice(1);
	var morceaux = [], courant = 0;
	function couper(jusqua){ morceaux.push(lignes.slice(courant, jusqua)); courant = jusqua; }
	function erreurMotif(t){ var e = new ShellError("csplit: '" + t + "': " + (/^\d/.test(t) ? "line number out of range" : "match not found"), 1); e.csplit = true; throw e; }
	var echec = null;
	try {
	for (var k = 0; k < motifs.length; k++){
		var mo = motifs[k], rep = 1, infini = false;
		var suiv = motifs[k + 1];
		if (suiv && /^\{(\d+|\*)\}$/.test(suiv)){ k++; if (suiv === "{*}") infini = true; else rep = +suiv.slice(1, -1) + 1; }
		for (var r = 0; r < rep || infini; r++){
			var mm;
			if (/^\d+$/.test(mo)){
				var n = +mo * (r + 1) - 1;
				if (n < courant || n > lignes.length){ if (infini && n > lignes.length) break; if (!garder) erreurMotif(mo); erreurMotif(mo); }
				couper(n);
			} else if ((mm = /^([\/%])(.*)\1([+-]\d+)?$/.exec(mo))){
				var re;
				try { re = new RegExp(traduireRegex(mm[2], "bre", "csplit").source); } catch (e){ throw new ShellError("csplit: " + mo + ": invalid regular expression", 1); }
				var depart = courant + (mm[1] === "/" && r > 0 ? 1 : (mm[1] === "/" && courant > 0 && morceaux.length ? 1 : 0)), trouve = -1;
				if (mm[1] === "/" && morceaux.length === 0 && courant === 0) depart = 0;
				for (var j = depart; j < lignes.length; j++) if (re.test(lignes[j])){ trouve = j; break; }
				if (trouve < 0){ if (infini) break; erreurMotif(mo); }
				var cible = trouve + (mm[3] ? +mm[3] : 0);
				if (mm[1] === "%"){ courant = cible; continue; }
				couper(cible);
			} else throw new ShellError("csplit: " + mo + ": invalid pattern", 1);
		}
	}
	} catch (e){ if (!e.csplit) throw e; echec = e; }
	morceaux.push(lignes.slice(courant));
	var tailles = [], num = 0;
	morceaux.forEach(function(l){
		if (elider && !l.length) return;
		var nomF = prefixe + (format ? Interpreteur.formater(format, [String(num)], io) : sdPad(num, chiffres));
		num++;
		if (!echec || garder) Shell.ecrire(nomF, l.join("\n"), false, !l.length);
		tailles.push(l.length ? versOctetsUtf8(l.join("\n") + "\n").length : 0);
	});
	if (echec){ io.err(echec.message); io.code = 1; return calme ? "" : tailles.join("\n"); }
	sdEvenement("csplit", { fichiers: num, prefixe: prefixe });
	return calme ? "" : tailles.join("\n");
};

function sdTabulations(spec){
	if (spec === null || spec === undefined) return { pas: 8, liste: null };
	var l = String(spec).split(/[ ,]/).filter(Boolean).map(function(x){ return +x; });
	if (l.some(isNaN)) throw new ShellError("expand: tab size contains invalid character(s): '" + spec + "'", 1);
	return l.length === 1 ? { pas: l[0], liste: null } : { pas: null, liste: l };
}
function sdProchainArret(col, t){
	if (t.pas) return (Math.floor(col / t.pas) + 1) * t.pas;
	for (var i = 0; i < t.liste.length; i++) if (t.liste[i] > col) return t.liste[i];
	return col + 1;
}
Shell.sorts.expand = function(args, io){
	var tabs = null, initial = false, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-t" || a === "--tabs"){ tabs = args[++i]; continue; }
		if ((m = /^(?:-t|--tabs=)(.+)$/.exec(a))){ tabs = m[1]; continue; }
		if ((m = /^-(\d+)$/.exec(a))){ tabs = m[1]; continue; }
		if (a === "-i" || a === "--initial"){ initial = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("expand: invalid option -- '" + a.charAt(1) + "'\nTry 'expand --help' for more information.", 1);
		noms.push(a);
	}
	var t = sdTabulations(tabs);
	var lignes = [];
	sdSources(noms, io, "expand", "expand OBJET").forEach(function(s){ lignes = lignes.concat(lignesDe(s.texte)); });
	return lignes.map(function(l){
		var r = "", col = 0, debut = true;
		Array.from(l).forEach(function(c){
			if (c === "\t" && (!initial || debut)){ var n = sdProchainArret(col, t); r += new Array(n - col + 1).join(" "); col = n; return; }
			if (c !== " " && c !== "\t") debut = false;
			r += c; col++;
		});
		return r;
	}).join("\n");
};
Shell.sorts.unexpand = function(args, io){
	var tabs = null, tous = false, premier = false, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-t" || a === "--tabs"){ tabs = args[++i]; tous = true; continue; }
		if ((m = /^(?:-t|--tabs=)(.+)$/.exec(a))){ tabs = m[1]; tous = true; continue; }
		if (a === "-a" || a === "--all"){ tous = true; continue; }
		if (a === "--first-only"){ premier = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("unexpand: invalid option -- '" + a.charAt(1) + "'\nTry 'unexpand --help' for more information.", 1);
		noms.push(a);
	}
	if (premier) tous = false;
	var t = sdTabulations(tabs), pas = t.pas || 8;
	var lignes = [];
	sdSources(noms, io, "unexpand", "unexpand OBJET").forEach(function(s){ lignes = lignes.concat(lignesDe(s.texte)); });
	return lignes.map(function(l){
		var r = "", col = 0, blancs = 0, debut = true;
		var car = Array.from(l);
		for (var k = 0; k < car.length; k++){
			var c = car[k];
			if (c === " " && (tous || debut)){
				blancs++; col++;
				if (col % pas === 0){ r += blancs > 1 ? "\t" : " "; blancs = 0; }
				continue;
			}
			if (c === "\t" && (tous || debut)){ r += "\t"; col = (Math.floor(col / pas) + 1) * pas; blancs = 0; continue; }
			r += new Array(blancs + 1).join(" "); blancs = 0;
			if (c !== " ") debut = false;
			r += c; col++;
		}
		return r + new Array(blancs + 1).join(" ");
	}).join("\n");
};

Shell.sorts.shred = function(args, io){
	var supprimer = false, zero = false, passes = 3, bavard = false, forcer = false, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-u" || a === "--remove" || /^--remove=/.test(a)){ supprimer = true; continue; }
		if (a === "-z" || a === "--zero"){ zero = true; continue; }
		if (a === "-v" || a === "--verbose"){ bavard = true; continue; }
		if (a === "-f" || a === "--force"){ forcer = true; continue; }
		if (a === "-x" || a === "--exact") continue;
		if (a === "-n" || a === "--iterations"){ passes = +args[++i]; continue; }
		if ((m = /^(?:-n|--iterations=)(\d+)$/.exec(a))){ passes = +m[1]; continue; }
		if (/^-[uzvfx]+$/.test(a)){ if (/u/.test(a)) supprimer = true; if (/z/.test(a)) zero = true; if (/v/.test(a)) bavard = true; if (/f/.test(a)) forcer = true; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("shred: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'shred --help' for more information.", 1);
		noms.push(a);
	}
	if (!noms.length) throw new ShellError("shred: missing file operand\nTry 'shred --help' for more information.", 1);
	var h = sdHote();
	noms.forEach(function(nom){
		var r = Shell.chercher(nom, io, "shred");
		if (r.node === null){ io.err("shred: " + nom + ": failed to open for writing: No such file or directory"); io.code = 1; return; }
		if (r.node instanceof Room){ io.err("shred: " + nom + ": failed to open for writing: Is a directory"); io.code = 1; return; }
		var it = r.node;
		if (!Shell.bit(it, "w", io) && !(forcer && (io.sudo || it.owner === JOUEUR))){ io.err("shred: " + nom + ": failed to open for writing: Permission denied"); io.code = 1; return; }
		var taille = sdTaille(it), ancien = it.getText();
		for (var p = 1; p <= passes; p++) if (bavard) io.err("shred: " + nom + ": pass " + p + "/" + (passes + (zero ? 1 : 0)) + " (random)...");
		if (zero && bavard) io.err("shred: " + nom + ": pass " + (passes + 1) + "/" + (passes + 1) + " (000000)...");
		if (it.taille === undefined || it.taille === null){
			var bruit = "";
			if (zero) bruit = new Array(Math.min(taille, 65536) + 1).join("\u0000");
			else for (var k = 0; k < Math.min(taille, 65536); k++) bruit += String.fromCharCode(33 + Math.floor(alea("shred:" + nom + ":" + state.nbCommandes + ":" + k) * 90));
			it.setText(bruit); it.sansFinDeLigne = true; it.encodage = undefined;
		}
		it.dechiquete = true;
		if (supprimer){
			if (bavard){
				io.err("shred: " + nom + ": removing");
				var base = String(it.itemname), dir = nom.indexOf("/") > -1 ? nom.substring(0, nom.lastIndexOf("/") + 1) : "";
				var prec = nom;
				for (var lg = base.length; lg >= 1; lg--){ var z = new Array(lg + 1).join("0"); io.err("shred: " + prec + ": renamed to " + dir + z); prec = dir + z; }
				io.err("shred: " + nom + ": removed");
			}
			r.dir.removeItem(it);
			GameEvents.fire({ type: "rm", item: it, room: r.dir });
		} else GameEvents.fire({ type: "write", item: it, room: r.dir, append: false, text: it.getText(), created: false, previous: ancien });
		sdEvenement("shred", { chemin: nom, item: it, supprime: supprimer, zero: zero, passes: passes, hote: h });
	});
	return "";
};

/* ================================================================== */
/* Le CSV (RFC 4180, comme le module csv de Python)                     */
/* ================================================================== */

/* Les lignes d'un CSV : un tableau de tableaux de champs. Les guillemets, les guillemets doublés, CRLF. */
function sdCsvAnalyser(texte, delim, guillemet){
	delim = delim || ","; guillemet = guillemet === undefined ? "\"" : guillemet;
	var lignes = [], champ = "", ligne = [], i = 0, n = texte.length, dansG = false, aChamp = false;
	while (i < n){
		var c = texte.charAt(i);
		if (dansG){
			if (c === guillemet){
				if (texte.charAt(i + 1) === guillemet){ champ += guillemet; i += 2; continue; }
				dansG = false; i++; continue;
			}
			champ += c; i++; continue;
		}
		if (c === guillemet && guillemet && champ === ""){ dansG = true; aChamp = true; i++; continue; }
		if (c === delim){ ligne.push(champ); champ = ""; aChamp = true; i++; continue; }
		if (c === "\r" && texte.charAt(i + 1) === "\n"){ i++; continue; }
		if (c === "\n" || c === "\r"){
			ligne.push(champ);
			lignes.push(ligne);
			ligne = []; champ = ""; aChamp = false; i++; continue;
		}
		champ += c; aChamp = true; i++;
	}
	if (champ !== "" || aChamp || ligne.length){ ligne.push(champ); lignes.push(ligne); }
	return lignes;
}
/* Écrire un champ comme le module csv de Python (QUOTE_MINIMAL). */
function sdCsvChamp(v, delim){
	v = v === null || v === undefined ? "" : String(v);
	if (v.indexOf(delim || ",") > -1 || v.indexOf("\"") > -1 || /[\r\n]/.test(v)) return "\"" + v.replace(/"/g, "\"\"") + "\"";
	return v;
}
function sdCsvLigne(l, delim){
	if (l.length === 1 && l[0] === "") return "\"\"";
	return l.map(function(v){ return sdCsvChamp(v, delim); }).join(delim || ",");
}
/* Deviner le séparateur (le sniffer de csvkit) : celui qui revient le même nombre de fois sur les premières lignes. */
function sdDevinerSeparateur(texte){
	var premieres = texte.split(/\r?\n/).slice(0, 5).filter(function(l){ return l !== ""; });
	if (!premieres.length || premieres[0].indexOf(",") > -1) return ",";
	var candidats = [";", "\t", "|", ":"];
	for (var k = 0; k < candidats.length; k++){
		var c = candidats[k], n = premieres[0].split(c).length - 1;
		if (n > 0 && premieres.every(function(l){ return l.split(c).length - 1 === n; })) return c;
	}
	return ",";
}

/* ================================================================== */
/* csvkit : lecture, types (agate), écriture                            */
/* ================================================================== */

var SD_NULLES = ["", "na", "n/a", "none", "null", "."];
var SD_VRAI = ["yes", "y", "true", "t", "1"], SD_FAUX = ["no", "n", "false", "f", "0"];
function sdEstNul(v){ return SD_NULLES.indexOf(String(v).trim().toLowerCase()) > -1; }
/* Un nombre au sens d'agate : signe, virgules de milliers, symbole monétaire ; null sinon. */
function sdNombreAgate(v){
	var t = String(v).trim().replace(/^[$€£¥]|[$€£¥]$/g, "").replace(/,/g, "");
	if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t)) return null;
	var neg = t.charAt(0) === "-";
	t = t.replace(/^[-+]/, "");
	var dec = t;
	if (/[eE]/.test(t)){ dec = String(+t); if (/e/.test(dec)) dec = (+t).toFixed(20).replace(/0+$/, "").replace(/\.$/, ""); }
	var norm = dec.indexOf(".") > -1 ? dec.replace(/0+$/, "").replace(/\.$/, "") : dec;
	norm = norm.replace(/^0+(?=\d)/, "");
	var places = norm.indexOf(".") > -1 ? norm.length - norm.indexOf(".") - 1 : 0;
	var brut = dec.replace(/^0+(?=\d)/, "");
	return { v: (neg ? -1 : 1) * parseFloat(dec), places: places, texte: (neg && +dec !== 0 ? "-" : "") + brut, norm: (neg && +norm !== 0 ? "-" : "") + norm };
}
/* Une durée (pytimeparse) : « 06:12 » (minutes:secondes), « 1:06:12 », en secondes ; null sinon. */
function sdDureeAgate(v){
	var t = String(v).trim(), m;
	if ((m = /^(\d+):(\d{2})(?:\.(\d+))?$/.exec(t))) return +m[1] * 60 + +m[2] + (m[3] ? +("0." + m[3]) : 0);
	if ((m = /^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/.exec(t))) return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +("0." + m[4]) : 0);
	return null;
}
function sdTexteDuree(s){
	var neg = s < 0; s = Math.abs(s);
	var j = Math.floor(s / 86400), r = s - j * 86400, h = Math.floor(r / 3600), mi = Math.floor((r - h * 3600) / 60), se = r - h * 3600 - mi * 60;
	var sec = Math.floor(se + 1e-9), micro = Math.round((se - sec) * 1e6);
	if (micro === 1000000){ sec++; micro = 0; }
	var t = h + ":" + sdPad(mi, 2) + ":" + sdPad(sec, 2) + (micro ? "." + sdPad(micro, 6) : "");
	if (j) t = j + " day" + (j > 1 ? "s" : "") + ", " + t;
	return (neg ? "-" : "") + t;
}
function sdDateValide(a, mo, j){ var d = new Date(Date.UTC(a, mo - 1, j)); return d.getUTCFullYear() === a && d.getUTCMonth() === mo - 1 && d.getUTCDate() === j; }
/* Une date : AAAA-MM-JJ, ou MM/JJ/AAAA (à l'américaine, comme parsedatetime) ; « AAAA-MM-JJ » ou null. */
function sdDateAgate(v){
	var t = String(v).trim(), m;
	if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)) && sdDateValide(+m[1], +m[2], +m[3])) return m[1] + "-" + sdPad(+m[2], 2) + "-" + sdPad(+m[3], 2);
	if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)) && sdDateValide(+m[3], +m[1], +m[2])) return m[3] + "-" + sdPad(+m[1], 2) + "-" + sdPad(+m[2], 2);
	return null;
}
function sdDateHeureAgate(v){
	var t = String(v).trim(), m = /^(\d{4}-\d{1,2}-\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
	if (!m) return null;
	var d = sdDateAgate(m[1]);
	if (!d || +m[2] > 23 || +m[3] > 59 || +(m[4] || 0) > 59) return null;
	return d + "T" + sdPad(+m[2], 2) + ":" + m[3] + ":" + (m[4] || "00");
}
/* Le type de chaque colonne : le premier, dans l'ordre d'agate, qui accepte toutes les valeurs non nulles. */
function sdTypesAgate(lignes, nbCol, sansInference){
	var types = [];
	for (var c = 0; c < nbCol; c++){
		if (sansInference){ types.push("text"); continue; }
		var vals = lignes.map(function(l){ return l[c] === undefined ? "" : l[c]; }).filter(function(v){ return !sdEstNul(v); });
		var t = "text";
		if (vals.every(function(v){ var x = v.trim().toLowerCase(); return SD_VRAI.indexOf(x) > -1 || SD_FAUX.indexOf(x) > -1; })) t = "bool";
		else if (vals.every(function(v){ return sdNombreAgate(v) !== null; })) t = "num";
		else if (vals.every(function(v){ return sdDureeAgate(v) !== null; })) t = "duree";
		else if (vals.every(function(v){ return sdDateAgate(v) !== null; })) t = "date";
		else if (vals.every(function(v){ return sdDateHeureAgate(v) !== null || sdDateAgate(v) !== null; })) t = "dateheure";
		types.push(t);
	}
	return types;
}
/* Une cellule typée : { nul, v (pour trier et calculer), texte (pour csvsort et csvstat), places }. */
function sdCellule(brut, type, blancs){
	if (brut === undefined) brut = "";
	if (!blancs && sdEstNul(brut) || brut === "" && type !== "text") return { nul: true, v: null, texte: "", brut: brut };
	if (blancs && sdEstNul(brut) && type !== "text") return { nul: true, v: null, texte: "", brut: brut };
	switch (type){
		case "bool": var b = SD_VRAI.indexOf(brut.trim().toLowerCase()) > -1; return { v: b ? 1 : 0, texte: b ? "True" : "False", b: b, brut: brut };
		case "num": var n = sdNombreAgate(brut); return { v: n.v, texte: n.texte, norm: n.norm, places: n.places, brut: brut };
		case "duree": var s = sdDureeAgate(brut); return { v: s, texte: sdTexteDuree(s), brut: brut };
		case "date": var d = sdDateAgate(brut); return { v: d, texte: d, brut: brut };
		case "dateheure": var dh = sdDateHeureAgate(brut) || sdDateAgate(brut) + "T00:00:00"; return { v: dh, texte: dh, brut: brut };
		default: return { v: brut, texte: brut, brut: brut };
	}
}
/* Les options communes de csvkit, et la table lue : { noms, lignes (brutes), types, delim, reste (les arguments propres) }. */
var SD_CSVKIT_VALEURS = ["-d", "--delimiter", "-q", "--quotechar", "-e", "--encoding", "-K", "--skip-lines", "-y", "--snifflimit", "-u", "--quoting", "-z", "--maxfieldsize", "-p", "--escapechar", "--locale", "--date-format", "--datetime-format"];
function sdCsvkitOptions(args, cmd, propres){
	var o = { delim: null, guillemet: "\"", encodage: null, sauter: 0, sansEntete: false, sansInference: false, blancs: false, zero: false, propres: {}, positionnels: [] };
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (propres && propres.hasOwnProperty(a)){
			if (propres[a]){ if (args[i + 1] === undefined) throw new ShellError(cmd + ": error: argument " + a + ": expected one argument", 2); o.propres[propres[a]] = args[++i]; }
			else o.propres[a] = true;
			continue;
		}
		if ((m = /^(--[a-z-]+)=(.*)$/.exec(a)) && propres && propres.hasOwnProperty(m[1]) && propres[m[1]]){ o.propres[propres[m[1]]] = m[2]; continue; }
		if (a === "-d" || a === "--delimiter"){ o.delim = args[++i]; continue; }
		if (a === "-t" || a === "--tabs"){ o.delim = "\t"; continue; }
		if (a === "-q" || a === "--quotechar"){ o.guillemet = args[++i]; continue; }
		if (a === "-e" || a === "--encoding"){ o.encodage = args[++i]; continue; }
		if (a === "-K" || a === "--skip-lines"){ o.sauter = +args[++i]; continue; }
		if (a === "-H" || a === "--no-header-row"){ o.sansEntete = true; continue; }
		if (a === "-I" || a === "--no-inference"){ o.sansInference = true; continue; }
		if (a === "--blanks"){ o.blancs = true; continue; }
		if (a === "--zero"){ o.zero = true; continue; }
		if (a === "-S" || a === "--skipinitialspace" || a === "-v" || a === "--verbose" || a === "-V" || a === "--version" || a === "-l" || a === "--linenumbers" || a === "--add-bom") continue;
		if (SD_CSVKIT_VALEURS.indexOf(a) > -1){ i++; continue; }
		if (a.charAt(0) === "-" && a !== "-"){
			throw new ShellError("usage: " + cmd + " [-h] [-d DELIMITER] [-t] [-q QUOTECHAR] [-e ENCODING] [-H] [-K SKIP_LINES] [-I] [FILE]\n" + cmd + ": error: unrecognized arguments: " + a, 2);
		}
		o.positionnels.push(a);
	}
	return o;
}
function sdCsvkitTable(o, io, cmd){
	var nom = o.positionnels[0];
	var src = sdLireUn(nom, io, cmd, cmd + " : quel fichier CSV ? Utilisation : " + cmd + " FICHIER.csv, ou commande | " + cmd);
	var texte = src.texte;
	var enc = String(o.encodage || "utf-8").toLowerCase().replace(/_/g, "-");
	if (src.item && src.item.encodage === "ISO-8859-1" && /[^\x00-\x7f]/.test(texte) && ["latin1", "latin-1", "iso-8859-1", "iso8859-1", "cp1252", "windows-1252", "l1"].indexOf(enc) === -1){
		throw new ShellError("Your file is not \"utf-8-sig\" encoded. Please specify the correct encoding with the --encoding flag. Use the -v flag to see the complete error." +
			sdAstuce(io, "Ce fichier est en latin-1 (ISO-8859-1) : -e latin1, ou d'abord iconv -f latin1 -t utf-8."), 1);
	}
	texte = texte.replace(/^﻿/, "");
	var delim = o.delim || sdDevinerSeparateur(texte);
	var lignes = sdCsvAnalyser(texte, delim, o.guillemet).slice(o.sauter || 0);
	var noms;
	if (o.sansEntete){
		var nb = lignes.reduce(function(m, l){ return Math.max(m, l.length); }, 0);
		noms = [];
		for (var k = 0; k < nb; k++) noms.push(sdNomColonne(k));
	} else {
		noms = lignes.shift() || [];
	}
	for (var r = 0; r < lignes.length; r++){
		if (lignes[r].length > noms.length) throw new ShellError("ValueError: Row " + r + " has " + lignes[r].length + " values, but Table only has " + noms.length + " columns.", 1);
	}
	lignes = lignes.map(function(l){ while (l.length < noms.length) l.push(""); return l; });
	return { noms: noms, lignes: lignes, delim: delim, nom: nom || "-", item: src.item };
}
function sdNomColonne(k){ var t = ""; k++; while (k > 0){ var r = (k - 1) % 26; t = String.fromCharCode(97 + r) + t; k = Math.floor((k - 1) / 26); } return t; }
/* -c : des noms, des numéros (1 = la première), des plages 2-4. */
function sdColonnes(spec, noms, zero){
	var r = [];
	String(spec).split(",").forEach(function(p){
		p = p.trim();
		if (p === "") return;
		var m = /^(\d+)?-(\d+)?$/.exec(p);
		if (m && (m[1] || m[2])){
			var a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : noms.length;
			if (zero){ a++; b++; }
			for (var k = a; k <= b; k++){ if (k < 1 || k > noms.length) sdErreurColonne(String(k), noms, true); r.push(k - 1); }
			return;
		}
		var i = noms.indexOf(p);
		if (i > -1){ r.push(i); return; }
		if (/^\d+$/.test(p)){
			var n = +p + (zero ? 1 : 0);
			if (n < 1 || n > noms.length) sdErreurColonne(p, noms, true);
			r.push(n - 1); return;
		}
		sdErreurColonne(p, noms, false);
	});
	return r;
}
function sdErreurColonne(p, noms, numero){
	if (numero) throw new ShellError("ColumnIdentifierError: Column " + p + " is invalid. The last column is '" + noms[noms.length - 1] + "' at index " + noms.length + ".", 1);
	throw new ShellError("ColumnIdentifierError: Column '" + p + "' is invalid. It is neither an integer nor a column name. Column names are: " + noms.map(function(n){ return "'" + n + "'"; }).join(", "), 1);
}
/* Un nombre, comme agate l'affiche : séparateur de milliers, « places » décimales. */
function sdNombreGroupe(v, places){
	var t = Math.abs(v).toFixed(places), p = t.split(".");
	p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return (v < 0 && +t !== 0 ? "-" : "") + p.join(".");
}
/* Un flottant à la manière de Python (repr) : 1.0, 4.2, 1e+16. */
function sdFlottantPython(v){
	if (!isFinite(v)) return isNaN(v) ? "NaN" : (v < 0 ? "-Infinity" : "Infinity");
	var s = String(v);
	if (/e/.test(s)) return s.replace(/e([+-])(\d)$/, "e$10$2");
	if (Math.abs(v) >= 1e16) return v.toExponential().replace(/e\+(\d)$/, "e+0$1");
	return s.indexOf(".") > -1 ? s : s + ".0";
}
function sdJsonPython(v){
	if (v === null || v === undefined) return "null";
	if (typeof v === "boolean") return v ? "true" : "false";
	if (typeof v === "number") return sdFlottantPython(v);
	return "\"" + String(v).replace(/[\\"\u0000-\u001f]/g, function(c){ return { "\\": "\\\\", "\"": "\\\"", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" }[c] || "\\u" + sdPad(c.charCodeAt(0).toString(16), 4); }) + "\"";
}

Shell.sorts.csvlook = function(args, io){
	var o = sdCsvkitOptions(args, "csvlook", { "--max-rows": "maxLignes", "--max-columns": "maxColonnes", "--max-column-width": "maxLargeur", "--max-precision": "maxPrecision", "--no-number-ellipsis": null });
	var t = sdCsvkitTable(o, io, "csvlook");
	var types = sdTypesAgate(t.lignes, t.noms.length, o.sansInference);
	var maxP = o.propres.maxPrecision !== undefined ? +o.propres.maxPrecision : 3, ellipse = !o.propres["--no-number-ellipsis"];
	var lignes = t.lignes, coupe = false;
	if (o.propres.maxLignes !== undefined && lignes.length > +o.propres.maxLignes){ lignes = lignes.slice(0, +o.propres.maxLignes); coupe = true; }
	var cellules = lignes.map(function(l){ return l.map(function(v, c){ return sdCellule(v, types[c], o.blancs); }); });
	var places = types.map(function(ty, c){
		if (ty !== "num") return 0;
		return lignes.reduce(function(m, l){ var x = sdCellule(l[c], "num", o.blancs); return x.nul ? m : Math.max(m, x.places); }, 0);
	});
	var textes = cellules.map(function(l){ return l.map(function(x, c){
		if (x.nul) return "";
		var ty = types[c];
		if (ty === "num"){ var p = Math.min(places[c], maxP); return sdNombreGroupe(x.v, p) + (places[c] > maxP && ellipse ? "…" : ""); }
		if (ty === "dateheure") return x.texte.replace("T", " ");
		return x.texte;
	}); });
	var larg = t.noms.map(function(n, c){ return Math.max(sdLargeur(n), textes.reduce(function(m, l){ return Math.max(m, sdLargeur(l[c])); }, 0)); });
	larg = larg.map(function(w){ return Math.max(w, 1); });
	var aligne = function(v, c){ return types[c] === "text" ? sdDroiteL(v, larg[c]) : sdGaucheL(v, larg[c]); };
	var sortie = ["| " + t.noms.map(aligne).join(" | ") + " |", "| " + larg.map(function(w){ return new Array(w + 1).join("-"); }).join(" | ") + " |"];
	textes.forEach(function(l){ sortie.push("| " + l.map(aligne).join(" | ") + " |"); });
	sdEvenement("csvlook", { fichier: t.nom, lignes: t.lignes.length, colonnes: t.noms.length });
	return sortie.join("\n");
};

Shell.sorts.csvcut = function(args, io){
	var o = sdCsvkitOptions(args, "csvcut", { "-c": "c", "--columns": "c", "-C": "C", "--not-columns": "C", "-n": null, "--names": null, "-x": null, "--delete-empty-rows": null });
	var t = sdCsvkitTable(o, io, "csvcut");
	if (o.propres["-n"] || o.propres["--names"]){
		sdEvenement("csvcut", { fichier: t.nom, noms: true });
		return t.noms.map(function(n, k){ return sdGauche(k + (o.zero ? 0 : 1), 3) + ": " + n; }).join("\n");
	}
	var garder = o.propres.c !== undefined ? sdColonnes(o.propres.c, t.noms, o.zero) : t.noms.map(function(n, k){ return k; });
	if (o.propres.C !== undefined){ var exclues = sdColonnes(o.propres.C, t.noms, o.zero); garder = garder.filter(function(k){ return exclues.indexOf(k) === -1; }); }
	var sortie = [sdCsvLigne(garder.map(function(k){ return t.noms[k]; }))];
	t.lignes.forEach(function(l){
		var r = garder.map(function(k){ return l[k] === undefined ? "" : l[k]; });
		if ((o.propres["-x"] || o.propres["--delete-empty-rows"]) && r.every(function(v){ return v === ""; })) return;
		sortie.push(sdCsvLigne(r));
	});
	sdEvenement("csvcut", { fichier: t.nom, colonnes: garder.map(function(k){ return t.noms[k]; }) });
	return sortie.join("\n");
};

Shell.sorts.csvgrep = function(args, io){
	var o = sdCsvkitOptions(args, "csvgrep", { "-c": "c", "--columns": "c", "-m": "m", "--match": "m", "-r": "r", "--regex": "r", "-f": "f", "--file": "f", "-i": null, "--invert-match": null, "-a": null, "--any-match": null, "-n": null });
	var usage = "usage: csvgrep [-h] [-d DELIMITER] [-t] [-q QUOTECHAR] [-u {0,1,2,3,4,5}] [-b]\n               [-p ESCAPECHAR] [-z FIELD_SIZE_LIMIT] [-e ENCODING] [-S] [-H]\n               [-K SKIP_LINES] [-v] [-l] [--add-bom] [--zero] [-V] [-n]\n               [-c COLUMNS] [-m PATTERN] [-r REGEX] [-f MATCHFILE] [-i] [-a]\n               [FILE]\n";
	if (o.propres.c === undefined) throw new ShellError(usage + "csvgrep: error: You must specify at least one column to search using the -c option.", 2);
	if (o.propres.m === undefined && o.propres.r === undefined && o.propres.f === undefined) throw new ShellError(usage + "csvgrep: error: One of -r, -m or -f must be specified, unless using the -n option.", 2);
	var t = sdCsvkitTable(o, io, "csvgrep");
	var cols = sdColonnes(o.propres.c, t.noms, o.zero);
	var test;
	if (o.propres.r !== undefined){
		var re;
		try { re = new RegExp(o.propres.r.replace(/\(\?P</g, "(?<").replace(/\\Z/g, "$")); } catch (e){ throw new ShellError("re.error: " + e.message, 1); }
		test = function(v){ return re.test(v); };
	} else if (o.propres.f !== undefined){
		var motifs = lignesDe(Shell.objetLisible(o.propres.f, io, "csvgrep").item.getText());
		test = function(v){ return motifs.indexOf(v) > -1; };
	} else test = function(v){ return v.indexOf(o.propres.m) > -1; };
	var inverse = !!(o.propres["-i"] || o.propres["--invert-match"]), unSeul = !!(o.propres["-a"] || o.propres["--any-match"]);
	var sortie = [sdCsvLigne(t.noms)], n = 0;
	t.lignes.forEach(function(l){
		var ok = unSeul ? cols.some(function(k){ return test(l[k]); }) : cols.every(function(k){ return test(l[k]); });
		if (ok !== inverse){ sortie.push(sdCsvLigne(l)); n++; }
	});
	sdEvenement("csvgrep", { fichier: t.nom, lignes: n, colonnes: cols.map(function(k){ return t.noms[k]; }) });
	return sortie.join("\n");
};

/* Comparer deux cellules typées pour un tri (les nulles à la fin, comme agate). */
function sdComparerCellules(a, b){
	if (a.nul && b.nul) return 0;
	if (a.nul) return 1;
	if (b.nul) return -1;
	if (a.v < b.v) return -1;
	if (a.v > b.v) return 1;
	return 0;
}
Shell.sorts.csvsort = function(args, io){
	var o = sdCsvkitOptions(args, "csvsort", { "-c": "c", "--columns": "c", "-r": null, "--reverse": null, "-i": null, "--ignore-case": null });
	var t = sdCsvkitTable(o, io, "csvsort");
	var types = sdTypesAgate(t.lignes, t.noms.length, o.sansInference);
	var cols = o.propres.c !== undefined ? sdColonnes(o.propres.c, t.noms, o.zero) : t.noms.map(function(n, k){ return k; });
	var casse = !!(o.propres["-i"] || o.propres["--ignore-case"]);
	var cellules = t.lignes.map(function(l, i){ return { i: i, c: l.map(function(v, c){ var x = sdCellule(v, types[c], o.blancs); if (casse && types[c] === "text" && !x.nul) x = { v: String(x.v).toLowerCase(), texte: x.texte, brut: x.brut }; return x; }) }; });
	var inverse = !!(o.propres["-r"] || o.propres["--reverse"]);
	cellules.sort(function(a, b){
		for (var k = 0; k < cols.length; k++){ var r = sdComparerCellules(a.c[cols[k]], b.c[cols[k]]); if (r) return r; }
		return a.i - b.i;
	});
	if (inverse) cellules.reverse();
	var sortie = [sdCsvLigne(t.noms)];
	cellules.forEach(function(x){ sortie.push(sdCsvLigne(x.c.map(function(c, k){ return c.nul ? "" : (types[k] === "text" ? c.brut : c.texte); }))); });
	sdEvenement("csvsort", { fichier: t.nom, colonnes: cols.map(function(k){ return t.noms[k]; }), inverse: inverse });
	return sortie.join("\n");
};

Shell.sorts.csvjson = function(args, io){
	var o = sdCsvkitOptions(args, "csvjson", { "-i": "indent", "--indent": "indent", "-k": "cle", "--key": "cle", "--stream": null, "--lat": "lat", "--lon": "lon" });
	var t = sdCsvkitTable(o, io, "csvjson");
	var types = sdTypesAgate(t.lignes, t.noms.length, o.sansInference);
	var objets = t.lignes.map(function(l){
		return t.noms.map(function(n, c){
			var x = sdCellule(l[c], types[c], o.blancs), v;
			if (x.nul) v = null;
			else if (types[c] === "num") v = x.v;
			else if (types[c] === "bool") v = x.b;
			else v = x.texte;
			return [n, v];
		});
	});
	var indent = o.propres.indent !== undefined ? +o.propres.indent : null;
	var objetJson = function(paires, niveau){
		if (indent === null) return "{" + paires.map(function(p){ return sdJsonPython(p[0]) + ": " + sdJsonPython(p[1]); }).join(", ") + "}";
		var e = new Array(indent * (niveau + 1) + 1).join(" "), e0 = new Array(indent * niveau + 1).join(" ");
		return "{\n" + paires.map(function(p){ return e + sdJsonPython(p[0]) + ": " + sdJsonPython(p[1]); }).join(",\n") + "\n" + e0 + "}";
	};
	var sortie;
	if (o.propres["--stream"]) sortie = objets.map(function(p){ return objetJson(p, 0); }).join("\n");
	else if (o.propres.cle !== undefined){
		var k = sdColonnes(o.propres.cle, t.noms, o.zero)[0];
		var paires = objets.map(function(p){ return [String(p[k][1]), p]; });
		if (indent === null) sortie = "{" + paires.map(function(p){ return sdJsonPython(p[0]) + ": " + objetJson(p[1], 0); }).join(", ") + "}";
		else sortie = "{\n" + paires.map(function(p){ return new Array(indent + 1).join(" ") + sdJsonPython(p[0]) + ": " + objetJson(p[1], 1); }).join(",\n") + "\n}";
	} else if (indent === null) sortie = "[" + objets.map(function(p){ return objetJson(p, 0); }).join(", ") + "]";
	else sortie = objets.length ? "[\n" + objets.map(function(p){ return new Array(indent + 1).join(" ") + objetJson(p, 1); }).join(",\n") + "\n]" : "[]";
	sdEvenement("csvjson", { fichier: t.nom, lignes: objets.length });
	return sortie;
};

/* csvstat : les statistiques de chaque colonne, comme csvkit 2. */
function sdStatNombre(x){
	if (x === null || x === undefined || isNaN(x)) return "None";
	var t = (Math.round(x * 1000) / 1000).toFixed(3);
	t = t.replace(/0+$/, "").replace(/\.$/, "");
	return t === "-0" ? "0" : t;
}
function sdStatsColonne(t, c, type, blancs){
	var cel = t.lignes.map(function(l){ return sdCellule(l[c], type, blancs); });
	var nn = cel.filter(function(x){ return !x.nul; });
	var s = { type: type, nuls: cel.length - nn.length, nonNuls: nn.length, cel: cel, nn: nn };
	var affiche = function(x){
		if (x.nul) return "None";
		if (type === "num") return sdStatNombre(x.v);
		if (type === "dateheure") return x.texte.replace("T", " ");
		return x.texte;
	};
	var cle = function(x){ return x.nul ? "\u0000nul" : (type === "num" ? x.norm : x.texte); };
	var vus = {}, ordre = [];
	cel.forEach(function(x){ var k = cle(x); if (!vus.hasOwnProperty(k)){ vus[k] = { n: 0, x: x }; ordre.push(k); } vus[k].n++; });
	s.uniques = ordre.length;
	s.frequences = ordre.map(function(k, i){ return { k: k, n: vus[k].n, x: vus[k].x, i: i }; }).sort(function(a, b){ return b.n - a.n || a.i - b.i; });
	s.communs = s.frequences.slice(0, 5).map(function(f){ return { texte: affiche(f.x), n: f.n, brut: f.x.nul ? "None" : (type === "num" ? f.x.norm : f.x.texte) }; });
	if (type === "num" || type === "duree" || type === "date" || type === "dateheure"){
		var tries = nn.slice().sort(function(a, b){ return a.v < b.v ? -1 : (a.v > b.v ? 1 : 0); });
		if (tries.length){ s.min = affiche(tries[0]); s.max = affiche(tries[tries.length - 1]); s.minX = tries[0]; s.maxX = tries[tries.length - 1]; }
	}
	if (type === "num" && nn.length){
		var p = nn.reduce(function(m, x){ return Math.max(m, x.places); }, 0), f = Math.pow(10, Math.min(p, 12));
		var somme = nn.reduce(function(a, x){ return a + Math.round(x.v * f); }, 0) / f;
		var moy = somme / nn.length;
		var v = nn.map(function(x){ return x.v; }).sort(function(a, b){ return a - b; });
		var med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
		var ecart = nn.length > 1 ? Math.sqrt(v.reduce(function(a, x){ return a + (x - moy) * (x - moy); }, 0) / (nn.length - 1)) : null;
		s.somme = somme; s.moyenne = moy; s.mediane = med; s.ecart = ecart; s.places = p;
	}
	if (type === "duree" && nn.length){
		var sd = nn.reduce(function(a, x){ return a + x.v; }, 0);
		s.sommeD = sdTexteDuree(sd); s.moyenneD = sdTexteDuree(sd / nn.length);
	}
	if (type === "text") s.longueur = nn.reduce(function(m, x){ return Math.max(m, sdLargeur(x.texte)); }, 0);
	return s;
}
var SD_NOMS_TYPES = { num: "Number", text: "Text", bool: "Boolean", date: "Date", dateheure: "DateTime", duree: "TimeDelta" };
Shell.sorts.csvstat = function(args, io){
	var ops = ["--mean", "--median", "--min", "--max", "--sum", "--count", "--unique", "--freq", "--stdev", "--nulls", "--non-nulls", "--len", "--max-precision", "--type"];
	var propres = { "-c": "c", "--columns": "c", "--freq-count": "freqN", "--json": null, "--csv": null };
	ops.forEach(function(x){ propres[x] = null; });
	var o = sdCsvkitOptions(args, "csvstat", propres);
	var t = sdCsvkitTable(o, io, "csvstat");
	var types = sdTypesAgate(t.lignes, t.noms.length, o.sansInference);
	var cols = o.propres.c !== undefined ? sdColonnes(o.propres.c, t.noms, o.zero) : t.noms.map(function(n, k){ return k; });
	var choisies = ops.filter(function(x){ return o.propres[x]; });
	if (choisies.length > 1) throw new ShellError("usage: csvstat [-h] ...\ncsvstat: error: Only one operation argument may be specified (--mean, --median, etc).", 2);
	sdEvenement("csvstat", { fichier: t.nom, colonnes: cols.map(function(k){ return t.noms[k]; }), operation: choisies[0] || null });
	if (choisies[0] === "--count") return String(t.lignes.length);
	var freqN = o.propres.freqN !== undefined ? +o.propres.freqN : 5;
	if (choisies.length){
		var op = choisies[0];
		var valeur = function(k){
			var s = sdStatsColonne(t, k, types[k], o.blancs);
			switch (op){
				case "--type": return SD_NOMS_TYPES[s.type];
				case "--nulls": return s.nuls ? "True" : "False";
				case "--non-nulls": return String(s.nonNuls);
				case "--unique": return String(s.uniques);
				case "--min": return s.min !== undefined ? s.min : "None";
				case "--max": return s.max !== undefined ? s.max : "None";
				case "--sum": return s.type === "num" ? (s.nonNuls ? sdStatNombre(s.somme) : "0") : (s.type === "duree" ? s.sommeD : "None");
				case "--mean": return s.type === "num" ? sdStatNombre(s.moyenne) : (s.type === "duree" ? s.moyenneD : "None");
				case "--median": return s.type === "num" ? sdStatNombre(s.mediane) : "None";
				case "--stdev": return s.type === "num" ? sdStatNombre(s.ecart) : "None";
				case "--len": return s.type === "text" ? String(s.longueur) : "None";
				case "--max-precision": return s.type === "num" ? String(s.places) : "None";
				case "--freq": return "{ " + s.frequences.slice(0, freqN).map(function(f){ return "\"" + (f.x.nul ? "None" : (s.type === "num" ? f.x.norm : f.x.texte)) + "\": " + f.n; }).join(", ") + " }";
			}
			return "None";
		};
		if (cols.length === 1) return valeur(cols[0]);
		return cols.map(function(k){ return sdGauche(k + 1, 3) + ". " + t.noms[k] + ": " + valeur(k); }).join("\n");
	}
	var L = function(etiquette, v){ return "\t" + sdDroite(etiquette + ":", 23) + v; };
	var blocs = cols.map(function(k){
		var s = sdStatsColonne(t, k, types[k], o.blancs), l = [sdGauche(k + 1, 3) + ". \"" + t.noms[k] + "\"", ""];
		l.push(L("Type of data", SD_NOMS_TYPES[s.type]));
		l.push(L("Contains null values", s.nuls ? "True (excluded from calculations)" : "False"));
		l.push(L("Non-null values", s.nonNuls));
		l.push(L("Unique values", s.uniques));
		if (s.min !== undefined){ l.push(L("Smallest value", s.min)); l.push(L("Largest value", s.max)); }
		if (s.type === "num" && s.nonNuls){
			l.push(L("Sum", sdStatNombre(s.somme))); l.push(L("Mean", sdStatNombre(s.moyenne))); l.push(L("Median", sdStatNombre(s.mediane)));
			l.push(L("StDev", sdStatNombre(s.ecart))); l.push(L("Most decimal places", s.places));
		}
		if (s.type === "duree" && s.nonNuls){ l.push(L("Sum", s.sommeD)); l.push(L("Mean", s.moyenneD)); }
		if (s.type === "text") l.push(L("Longest value", s.longueur + " characters"));
		s.communs.forEach(function(c, i){ l.push(i === 0 ? L("Most common values", c.texte + " (" + c.n + "x)") : "\t" + sdDroite("", 23) + c.texte + " (" + c.n + "x)"); });
		return l.join("\n");
	});
	return blocs.join("\n\n") + "\n\nRow count: " + t.lignes.length;
};

/* ================================================================== */
/* GNU datamash                                                         */
/* ================================================================== */

var SD_DATAMASH_OPS = ["sum", "mean", "median", "min", "max", "count", "first", "last", "unique", "countunique", "collapse", "sstdev", "pstdev", "svar", "pvar",
	"mode", "antimode", "q1", "q3", "iqr", "range", "absmin", "absmax", "rand", "distinct", "pcov", "scov"];
function sdNombreC(t){ return /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(t) ? parseFloat(t) : null; }
/* Le quantile de datamash (type 7 de R, comme quantile() par défaut). */
function sdQuantile(v, p){
	var h = (v.length - 1) * p, b = Math.floor(h);
	return v[b] + (h - b) * ((v[b + 1] === undefined ? v[b] : v[b + 1]) - v[b]);
}
Shell.sorts.datamash = function(args, io){
	var o = { delim: "\t", blancs: false, enteteEntree: false, enteteSortie: false, trier: false, groupes: null, casse: false, narm: false, sortieDelim: null, arrondi: null, complet: false };
	var reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-t" || a === "--field-separator"){ o.delim = args[++i]; if (o.delim === undefined || o.delim.length !== 1) throw new ShellError("datamash: the delimiter must be a single character", 1); continue; }
		if ((m = /^(?:-t|--field-separator=)(.)$/.exec(a))){ o.delim = m[1]; continue; }
		if (a === "-W" || a === "--whitespace"){ o.blancs = true; continue; }
		if (a === "-H" || a === "--headers"){ o.enteteEntree = o.enteteSortie = true; continue; }
		if (a === "--header-in"){ o.enteteEntree = true; continue; }
		if (a === "--header-out"){ o.enteteSortie = true; continue; }
		if (a === "-s" || a === "--sort"){ o.trier = true; continue; }
		if (a === "-i" || a === "--ignore-case"){ o.casse = true; continue; }
		if (a === "--narm"){ o.narm = true; continue; }
		if (a === "-f" || a === "--full"){ o.complet = true; continue; }
		if (a === "-g" || a === "--group"){ o.groupes = args[++i]; continue; }
		if ((m = /^(?:-g|--group=)(.+)$/.exec(a))){ o.groupes = m[1]; continue; }
		if (a === "--output-delimiter"){ o.sortieDelim = args[++i]; continue; }
		if ((m = /^--output-delimiter=(.*)$/.exec(a))){ o.sortieDelim = m[1]; continue; }
		if (a === "-R" || a === "--round"){ o.arrondi = +args[++i]; continue; }
		if ((m = /^(?:-R|--round=)(\d+)$/.exec(a))){ o.arrondi = +m[1]; continue; }
		if (/^-[sWHif]+$/.test(a)){ a.substring(1).split("").forEach(function(l){ if (l === "s") o.trier = true; if (l === "W") o.blancs = true; if (l === "H") o.enteteEntree = o.enteteSortie = true; if (l === "i") o.casse = true; if (l === "f") o.complet = true; }); continue; }
		if (/^-[a-zA-Z]/.test(a) || /^--/.test(a)) throw new ShellError("datamash: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'datamash --help' for more information.", 1);
		reste.push(a);
	}
	if (!reste.length) throw new ShellError("datamash: missing operation specifiers\nTry 'datamash --help' for more information.", 1);
	var sortieD = o.sortieDelim !== null ? o.sortieDelim : (o.blancs ? "\t" : o.delim);
	var texte = io.stdin === null ? null : io.stdin;
	if (texte === null) throw new ShellError("datamash : il lit l'entrée standard : datamash ... < FICHIER, ou commande | datamash ..." + sdAstuce(io, "Exemple : datamash -t, --header-in sum 6 < captures.csv"), 1);
	var lignes = lignesDe(String(texte).replace(/\r\n/g, "\n"));
	var couper = function(l){ return o.blancs ? l.trim().split(/\s+/).filter(function(x){ return x !== ""; }) : l.split(o.delim); };
	var mode = reste[0];
	// Les modes sans opérations.
	if (mode === "transpose" || mode === "reverse" || mode === "check"){
		var t = lignes.map(couper);
		if (mode === "check"){
			for (var k = 1; k < t.length; k++){
				if (t[k].length !== t[0].length){
					io.code = 1;
					throw new ShellError("line " + k + " (" + t[k - 1].length + " fields):\n  " + lignes[k - 1] + "\nline " + (k + 1) + " (" + t[k].length + " fields):\n  " + lignes[k] + "\ndatamash: check failed: line " + (k + 1) + " has " + t[k].length + " fields (previous line had " + t[k - 1].length + ")", 1);
				}
			}
			sdEvenement("datamash", { mode: "check", lignes: t.length, champs: t.length ? t[0].length : 0 });
			return t.length + " line" + (t.length > 1 ? "s" : "") + ", " + (t.length ? t[0].length : 0) + " field" + (t.length && t[0].length === 1 ? "" : "s");
		}
		if (mode === "reverse") return t.map(function(l){ return l.slice().reverse().join(sortieD); }).join("\n");
		for (var k2 = 1; k2 < t.length; k2++) if (t[k2].length !== t[0].length) throw new ShellError("datamash: transpose input error: line " + (k2 + 1) + " has " + t[k2].length + " fields (previous lines had " + t[0].length + ");\nsee --help to disable strict mode", 1);
		var r = [];
		for (var c = 0; c < (t[0] || []).length; c++) r.push(t.map(function(l){ return l[c]; }).join(sortieD));
		return r.join("\n");
	}
	// crosstab X,Y [op Z] : un tableau croisé (les valeurs de X en lignes, celles de Y en colonnes ; count par défaut).
	if (mode === "crosstab" || mode === "ct"){
		if (!reste[1] || !/^[^,]+,[^,]+$/.test(reste[1])) throw new ShellError("datamash: crosstab requires exactly 2 fields", 1);
		var enteteC = o.enteteEntree && lignes.length ? couper(lignes.shift()) : null;
		var numC = function(spec){ if (/^\d+$/.test(spec)) return +spec - 1; var x = enteteC ? enteteC.indexOf(spec) : -1; if (x < 0) throw new ShellError("datamash: invalid field value '" + spec + "'", 1); return x; };
		var fx = numC(reste[1].split(",")[0]), fy = numC(reste[1].split(",")[1]);
		var opC = reste[2] || "count", fz = reste[3] !== undefined ? numC(reste[3]) : fx;
		if (["count", "sum", "first", "last", "unique", "min", "max", "mean"].indexOf(opC) === -1) throw new ShellError("datamash: invalid operation '" + opC + "' for crosstab", 1);
		var cases = {}, xs = [], ys = [];
		lignes.forEach(function(l){
			var c2 = couper(l), x = c2[fx], y = c2[fy];
			if (x === undefined || y === undefined) return;
			if (xs.indexOf(x) < 0) xs.push(x);
			if (ys.indexOf(y) < 0) ys.push(y);
			var k = x + "\u0001" + y;
			(cases[k] = cases[k] || []).push(c2[fz]);
		});
		xs.sort(); ys.sort();
		var valeur = function(v){
			if (!v) return "N/A";
			if (opC === "count") return String(v.length);
			if (opC === "first") return v[0];
			if (opC === "last") return v[v.length - 1];
			if (opC === "unique") return v.filter(function(x, i){ return v.indexOf(x) === i; }).sort().join(",");
			var n = v.map(parseFloat);
			var r3 = opC === "sum" ? n.reduce(function(a3, b3){ return a3 + b3; }, 0) : (opC === "min" ? Math.min.apply(null, n) : (opC === "max" ? Math.max.apply(null, n) : n.reduce(function(a3, b3){ return a3 + b3; }, 0) / n.length));
			return o.arrondi !== null ? r3.toFixed(o.arrondi) : sdFormatG(r3, 14);
		};
		sdEvenement("datamash", { mode: "crosstab", lignes: xs.length, colonnes: ys.length });
		return [[""].concat(ys).join(sortieD)].concat(xs.map(function(x){ return [x].concat(ys.map(function(y){ return valeur(cases[x + "\u0001" + y]); })).join(sortieD); })).join("\n");
	}
	if (mode === "groupby" || mode === "gb"){ o.groupes = reste[1]; reste = reste.slice(2); }
	var entete = o.enteteEntree && lignes.length ? couper(lignes.shift()) : null;
	var champ = function(spec){
		if (/^\d+$/.test(spec)){ if (+spec < 1) throw new ShellError("datamash: invalid field value (zero) '" + spec + "'", 1); return +spec - 1; }
		if (!entete) throw new ShellError("datamash: -g/--group and operations with field names require --header-in (or -H)" + "\ndatamash: invalid field value '" + spec + "'", 1);
		var i2 = entete.indexOf(spec);
		if (i2 < 0) throw new ShellError("datamash: column name '" + spec + "' not found in input file", 1);
		return i2;
	};
	var listeChamps = function(spec){
		var r2 = [];
		String(spec).split(",").forEach(function(p){ var m2 = /^(\d+)-(\d+)$/.exec(p); if (m2){ for (var x = +m2[1]; x <= +m2[2]; x++) r2.push(x - 1); } else r2.push(champ(p)); });
		return r2;
	};
	var groupes = o.groupes ? listeChamps(o.groupes) : [];
	var operations = [];
	for (var q = 0; q < reste.length; q++){
		var op = reste[q];
		if (SD_DATAMASH_OPS.indexOf(op) === -1) throw new ShellError("datamash: invalid operation '" + op + "'", 1);
		if (reste[q + 1] === undefined) throw new ShellError("datamash: missing field number after operation '" + op + "'", 1);
		listeChamps(reste[++q]).forEach(function(f){ operations.push({ op: op, f: f }); });
	}
	var donnees = lignes.map(function(l, n){ return { c: couper(l), n: n + 1 + (entete ? 1 : 0), brut: l }; });
	var maxChamp = Math.max.apply(null, groupes.concat(operations.map(function(x){ return x.f; })).concat([0]));
	donnees.forEach(function(d){
		if (d.c.length <= maxChamp) throw new ShellError("datamash: invalid input: field " + (maxChamp + 1) + " requested, line " + d.n + " has only " + d.c.length + " fields", 1);
	});
	var cleDe = function(d){ return groupes.map(function(g){ var v = d.c[g]; return o.casse ? v.toLowerCase() : v; }).join("\u0001"); };
	if (o.trier && groupes.length){
		donnees = donnees.map(function(d, i3){ return { d: d, i: i3 }; }).sort(function(a2, b2){ var x = cleDe(a2.d), y = cleDe(b2.d); return x < y ? -1 : (x > y ? 1 : a2.i - b2.i); }).map(function(x){ return x.d; });
	}
	var blocs = [];
	donnees.forEach(function(d){
		var k3 = cleDe(d);
		if (!blocs.length || blocs[blocs.length - 1].cle !== k3) blocs.push({ cle: k3, lignes: [] });
		blocs[blocs.length - 1].lignes.push(d);
	});
	if (!groupes.length) blocs = [{ cle: "", lignes: donnees }];
	var fmt = function(x){ return o.arrondi !== null ? x.toFixed(o.arrondi) : sdFormatG(x, 14); };
	var calculer = function(op, lignesB, f){
		var brut = lignesB.map(function(d){ return d.c[f]; });
		if (["first", "last", "unique", "countunique", "collapse", "count", "distinct", "rand"].indexOf(op) > -1){
			if (op === "count") return String(brut.length);
			if (op === "first") return brut[0];
			if (op === "last") return brut[brut.length - 1];
			if (op === "collapse") return brut.join(",");
			var uniques = brut.filter(function(v, i4){ return (o.casse ? brut.map(function(x){ return x.toLowerCase(); }).indexOf(v.toLowerCase()) : brut.indexOf(v)) === i4; }).sort();
			if (op === "countunique") return String(uniques.length);
			if (op === "rand") return brut[0];
			return uniques.join(",");
		}
		var v = [];
		lignesB.forEach(function(d){
			var n = sdNombreC(d.c[f]);
			if (n === null){
				if (o.narm && /^\s*(NA|NaN|)\s*$/i.test(d.c[f])) return;
				throw new ShellError("datamash: invalid numeric value in line " + d.n + " field " + (f + 1) + ": '" + d.c[f] + "'", 1);
			}
			v.push(n);
		});
		if (!v.length) return "nan";
		var tri = v.slice().sort(function(a3, b3){ return a3 - b3; });
		var somme = v.reduce(function(a3, b3){ return a3 + b3; }, 0), moy = somme / v.length;
		var varS = v.length > 1 ? v.reduce(function(a3, x){ return a3 + (x - moy) * (x - moy); }, 0) / (v.length - 1) : NaN;
		var varP = v.reduce(function(a3, x){ return a3 + (x - moy) * (x - moy); }, 0) / v.length;
		switch (op){
			case "sum": return fmt(somme);
			case "mean": return fmt(moy);
			case "median": return fmt(sdQuantile(tri, 0.5));
			case "q1": return fmt(sdQuantile(tri, 0.25));
			case "q3": return fmt(sdQuantile(tri, 0.75));
			case "iqr": return fmt(sdQuantile(tri, 0.75) - sdQuantile(tri, 0.25));
			case "min": return fmt(tri[0]);
			case "max": return fmt(tri[tri.length - 1]);
			case "range": return fmt(tri[tri.length - 1] - tri[0]);
			case "absmin": return fmt(v.reduce(function(m3, x){ return Math.abs(x) < Math.abs(m3) ? x : m3; }));
			case "absmax": return fmt(v.reduce(function(m3, x){ return Math.abs(x) > Math.abs(m3) ? x : m3; }));
			case "sstdev": return fmt(Math.sqrt(varS));
			case "pstdev": return fmt(Math.sqrt(varP));
			case "svar": return fmt(varS);
			case "pvar": return fmt(varP);
			case "mode": case "antimode":
				var comptes = {}, ordre = [];
				tri.forEach(function(x){ if (!comptes.hasOwnProperty(x)){ comptes[x] = 0; ordre.push(x); } comptes[x]++; });
				var best = ordre[0];
				ordre.forEach(function(x){ if (op === "mode" ? comptes[x] > comptes[best] : comptes[x] < comptes[best]) best = x; });
				return fmt(best);
		}
		return "nan";
	};
	var sortie = [];
	if (o.enteteSortie){
		var nomChamp = function(f){ return entete ? entete[f] : "field-" + (f + 1); };
		sortie.push(groupes.map(function(g){ return "GroupBy(" + nomChamp(g) + ")"; }).concat(operations.map(function(x){ return x.op + "(" + nomChamp(x.f) + ")"; })).join(sortieD));
	}
	try {
		blocs.forEach(function(b){
			if (!b.lignes.length && groupes.length) return;
			var ligne = groupes.map(function(g){ return b.lignes[0].c[g]; }).concat(operations.map(function(x){ return calculer(x.op, b.lignes, x.f); }));
			if (o.complet && b.lignes.length) ligne = b.lignes[0].c.concat(operations.map(function(x){ return calculer(x.op, b.lignes, x.f); }));
			sortie.push(ligne.join(sortieD));
		});
	} catch (e){
		// Comme le vrai : ce qui est déjà calculé est écrit, puis l'erreur.
		if (!(e instanceof ShellError) || !sortie.length) throw e;
		io.err(e.message);
		io.code = 1;
	}
	sdEvenement("datamash", { groupes: groupes.length, operations: operations.map(function(x){ return x.op; }), entete: !!entete });
	return sortie.join("\n");
};

/* ================================================================== */
/* Miller (mlr) : lecteurs, écrivains, langage d'expressions, verbes     */
/* ================================================================== */

/* Un enregistrement : une liste de paires { k, v }, dans l'ordre. Une valeur : une chaîne lue, ou un nombre calculé
   ({ n, f } : f vrai pour un flottant), ou un booléen. */
function MlrErreur(message){ this.message = message; }
function mlrGet(r, k){ for (var i = 0; i < r.length; i++) if (r[i].k === k) return r[i].v; return undefined; }
function mlrSet(r, k, v){ for (var i = 0; i < r.length; i++) if (r[i].k === k){ r[i].v = v; return; } r.push({ k: k, v: v }); }
function mlrDel(r, k){ for (var i = 0; i < r.length; i++) if (r[i].k === k){ r.splice(i, 1); return; } }
function mlrCles(r){ return r.map(function(p){ return p.k; }); }
function mlrCopie(r){ return r.map(function(p){ return { k: p.k, v: p.v }; }); }
var MLR_ENTIER = /^[-+]?(\d+|0x[0-9a-fA-F]+)$/, MLR_FLOTTANT = /^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/;
/* Le nombre que porte une valeur (lue ou calculée), ou null. */
function mlrNombre(v){
	if (v && typeof v === "object" && v.n !== undefined) return v;
	if (typeof v === "string"){
		if (MLR_ENTIER.test(v)) return { n: /0x/i.test(v) ? parseInt(v, 16) : parseInt(v, 10), f: false };
		if (MLR_FLOTTANT.test(v)) return { n: parseFloat(v), f: true };
	}
	return null;
}
function mlrTexte(v){
	if (v === undefined || v === null) return "";
	if (typeof v === "boolean") return v ? "true" : "false";
	if (typeof v === "object" && v.n !== undefined){
		if (v.erreur) return "(error)";
		if (!isFinite(v.n)) return isNaN(v.n) ? "NaN" : (v.n < 0 ? "-Inf" : "+Inf");
		return String(v.n);
	}
	return String(v);
}
function mlrNum(n, f){ return { n: n, f: !!f || !Number.isInteger(n) }; }

/* --- Le langage : analyse --- */
function mlrJetons(t){
	var j = [], i = 0;
	var ops = ["<=>", "!=~", "**", "//", "==", "!=", "<=", ">=", "&&", "||", "^^", "=~", ".+", ".-", "<<", ">>", "+", "-", "*", "/", "%", ".", "<", ">", "!", "?", ":", "(", ")", ",", ";", "=", "{", "}", "[", "]"];
	while (i < t.length){
		var c = t.charAt(i);
		if (/\s/.test(c)){ i++; continue; }
		if (c === "#"){ while (i < t.length && t.charAt(i) !== "\n") i++; continue; }
		if (c === "$"){
			if (t.charAt(i + 1) === "{"){ var f = t.indexOf("}", i); if (f < 0) throw new MlrErreur("mlr: cannot parse DSL expression."); j.push({ t: "champ", v: t.substring(i + 2, f) }); i = f + 1; continue; }
			var m = /^\$([A-Za-z_0-9]+|\*)/.exec(t.substring(i));
			if (!m) throw new MlrErreur("mlr: cannot parse DSL expression.");
			j.push({ t: "champ", v: m[1] }); i += m[0].length; continue;
		}
		if (c === "\""){
			var s = "", k = i + 1;
			while (k < t.length && t.charAt(k) !== "\""){
				if (t.charAt(k) === "\\" && k + 1 < t.length){ var e = t.charAt(k + 1); s += e === "n" ? "\n" : e === "t" ? "\t" : e === "\"" ? "\"" : e === "\\" ? "\\" : "\\" + e; k += 2; continue; }
				s += t.charAt(k); k++;
			}
			if (k >= t.length) throw new MlrErreur("mlr: cannot parse DSL expression.");
			var insensible = t.charAt(k + 1) === "i" && !/[A-Za-z0-9_]/.test(t.charAt(k + 2) || "");
			j.push({ t: "chaine", v: s, i: insensible }); i = k + 1 + (insensible ? 1 : 0); continue;
		}
		var n = /^(0x[0-9a-fA-F]+|\d+\.?\d*([eE][-+]?\d+)?|\.\d+([eE][-+]?\d+)?)/.exec(t.substring(i));
		if (n){ j.push({ t: "nombre", v: n[1] }); i += n[1].length; continue; }
		var id = /^[A-Za-z_][A-Za-z_0-9]*/.exec(t.substring(i));
		if (id){ j.push({ t: "id", v: id[0] }); i += id[0].length; continue; }
		var op = null;
		for (var q = 0; q < ops.length; q++) if (t.substr(i, ops[q].length) === ops[q]){ op = ops[q]; break; }
		if (!op) throw new MlrErreur("mlr: cannot parse DSL expression.");
		j.push({ t: "op", v: op }); i += op.length;
	}
	return j;
}
function mlrAnalyser(texte){
	var j = mlrJetons(texte), p = 0;
	function voir(v){ return j[p] && j[p].t === "op" && j[p].v === v; }
	function prendre(v){ if (!voir(v)) throw new MlrErreur("mlr: cannot parse DSL expression."); p++; }
	function binaire(suivant, liste){ return function(){ var g = suivant(); while (j[p] && j[p].t === "op" && liste.indexOf(j[p].v) > -1){ var o = j[p++].v; g = { op: o, g: g, d: suivant() }; } return g; }; }
	function primaire(){
		var x = j[p];
		if (!x) throw new MlrErreur("mlr: cannot parse DSL expression.");
		if (x.t === "op" && x.v === "("){ p++; var e = ternaire(); prendre(")"); return e; }
		if (x.t === "op" && (x.v === "!" || x.v === "-" || x.v === "+")){ p++; return { un: x.v, e: puissance() }; }
		p++;
		if (x.t === "champ") return { champ: x.v };
		if (x.t === "chaine") return { chaine: x.v, i: x.i };
		if (x.t === "nombre") return { nombre: x.v };
		if (x.t === "id"){
			if (x.v === "true" || x.v === "false") return { bool: x.v === "true" };
			if (voir("(")){
				p++;
				var a = [];
				if (!voir(")")){ a.push(ternaire()); while (voir(",")){ p++; a.push(ternaire()); } }
				prendre(")");
				return { fn: x.v, a: a };
			}
			return { id: x.v };
		}
		throw new MlrErreur("mlr: cannot parse DSL expression.");
	}
	function puissance(){ var b = primaire(); if (voir("**")){ p++; return { op: "**", g: b, d: unaire() }; } return b; }
	function unaire(){ if (voir("!") || voir("-") || voir("+")){ var o = j[p++].v; return { un: o, e: unaire() }; } return puissance(); }
	var mult = binaire(unaire, ["*", "/", "//", "%"]);
	var add = binaire(mult, ["+", "-", ".+", ".-", "."]);
	var cmp = binaire(add, ["==", "!=", "<", "<=", ">", ">=", "<=>"]);
	var rx = binaire(cmp, ["=~", "!=~"]);
	var et = binaire(rx, ["&&"]);
	var oux = binaire(et, ["^^"]);
	var ou = binaire(oux, ["||"]);
	function ternaire(){ var c = ou(); if (voir("?")){ p++; var a = ternaire(); prendre(":"); var b = ternaire(); return { si: c, a: a, b: b }; } return c; }
	var instructions = [];
	while (p < j.length){
		if (voir(";")){ p++; continue; }
		if (j[p].t === "id" && j[p].v === "unset"){ p++; var cs = []; do { if (j[p] && j[p].t === "op" && j[p].v === ",") p++; var x = j[p++]; if (!x || x.t !== "champ") throw new MlrErreur("mlr: cannot parse DSL expression."); cs.push(x.v); } while (voir(",")); instructions.push({ unset: cs }); continue; }
		if (j[p].t === "id" && j[p].v === "filter"){ p++; instructions.push({ filtre: ternaire() }); continue; }
		if (j[p].t === "champ" && j[p + 1] && j[p + 1].t === "op" && j[p + 1].v === "="){ var cible = j[p].v; p += 2; instructions.push({ affecter: cible, e: ternaire() }); continue; }
		instructions.push({ nu: ternaire() });
	}
	return instructions;
}
/* --- Le langage : évaluation --- */
var MLR_ABSENT = { absent: true };
function mlrEstAbsent(v){ return v === MLR_ABSENT || v === undefined; }
function mlrRegex(source, insensible){
	try { return new RegExp(source.replace(/\(\?P</g, "(?<"), insensible ? "i" : ""); } catch (e){ throw new MlrErreur("mlr: could not compile regex \"" + source + "\""); }
}
function mlrComparer(a, b){
	var x = mlrNombre(a), y = mlrNombre(b);
	if (x && y) return x.n < y.n ? -1 : (x.n > y.n ? 1 : 0);
	var s = mlrTexte(a), t = mlrTexte(b);
	return s < t ? -1 : (s > t ? 1 : 0);
}
function mlrArith(op, a, b){
	if (mlrEstAbsent(a)) return b;
	if (mlrEstAbsent(b)) return a;
	if (a === "") return b;
	if (b === "") return a;
	var x = mlrNombre(a), y = mlrNombre(b);
	if (!x || !y) return { n: NaN, f: true, erreur: true };
	var flottant = x.f || y.f;
	switch (op){
		case "+": case ".+": return mlrNum(x.n + y.n, flottant);
		case "-": case ".-": return mlrNum(x.n - y.n, flottant);
		case "*": return mlrNum(x.n * y.n, flottant);
		case "/": var q = x.n / y.n; return mlrNum(q, flottant || !Number.isInteger(q));
		case "//": return mlrNum(Math.floor(x.n / y.n), flottant);
		case "%": var r = x.n % y.n; if (r !== 0 && (r < 0) !== (y.n < 0)) r += y.n; return mlrNum(r, flottant);
		case "**": return mlrNum(Math.pow(x.n, y.n), flottant || y.n < 0);
	}
	return MLR_ABSENT;
}
function mlrVrai(v){ return v === true || v === "true"; }
function mlrFormatNombre(x, fmt){
	var m = /%(-?)(0?)(\d*)(?:\.(\d+))?(l{0,2})([dfeExXsgo])/.exec(fmt);
	if (!m) return fmt;
	var n = mlrNombre(x);
	if (!n) return { n: NaN, f: true, erreur: true };
	var v = n.n, t;
	switch (m[6]){
		case "d": t = String(Math.trunc(v)); break;
		case "x": t = (Math.trunc(v) >>> 0).toString(16); break;
		case "X": t = (Math.trunc(v) >>> 0).toString(16).toUpperCase(); break;
		case "o": t = (Math.trunc(v) >>> 0).toString(8); break;
		case "e": case "E": t = v.toExponential(m[4] !== undefined ? +m[4] : 6).replace(/e([+-])(\d)$/, "e$10$2"); if (m[6] === "E") t = t.toUpperCase(); break;
		case "g": t = sdFormatG(v, m[4] !== undefined ? +m[4] : 6); break;
		default: t = v.toFixed(m[4] !== undefined ? +m[4] : 6);
	}
	var w = m[3] ? +m[3] : 0;
	while (t.length < w) t = m[1] ? t + " " : (m[2] ? (t.charAt(0) === "-" ? "-0" + t.substring(1) : "0" + t) : " " + t);
	return fmt.replace(m[0], t);
}
function mlrEval(e, r, ctx){
	if (e.champ !== undefined){ var v = mlrGet(r, e.champ); return v === undefined ? MLR_ABSENT : v; }
	if (e.chaine !== undefined) return e.chaine;
	if (e.nombre !== undefined) return /^0x/i.test(e.nombre) || /^\d+$/.test(e.nombre) ? { n: parseInt(e.nombre, /^0x/i.test(e.nombre) ? 16 : 10), f: false } : { n: parseFloat(e.nombre), f: true };
	if (e.bool !== undefined) return e.bool;
	if (e.id !== undefined){
		if (e.id === "NR") return { n: ctx.nr, f: false };
		if (e.id === "FNR") return { n: ctx.nr, f: false };
		if (e.id === "FILENAME") return ctx.fichier || "(stdin)";
		if (e.id === "M_PI") return { n: Math.PI, f: true };
		if (e.id === "M_E") return { n: Math.E, f: true };
		return MLR_ABSENT;
	}
	if (e.un){
		var x = mlrEval(e.e, r, ctx);
		if (e.un === "!") return !mlrVrai(x);
		if (mlrEstAbsent(x)) return x;
		var n = mlrNombre(x);
		if (!n) return { n: NaN, f: true, erreur: true };
		return e.un === "-" ? mlrNum(-n.n, n.f) : n;
	}
	if (e.si) return mlrVrai(mlrEval(e.si, r, ctx)) ? mlrEval(e.a, r, ctx) : mlrEval(e.b, r, ctx);
	if (e.op){
		if (e.op === "&&") return mlrVrai(mlrEval(e.g, r, ctx)) && mlrVrai(mlrEval(e.d, r, ctx));
		if (e.op === "||") return mlrVrai(mlrEval(e.g, r, ctx)) || mlrVrai(mlrEval(e.d, r, ctx));
		if (e.op === "^^") return mlrVrai(mlrEval(e.g, r, ctx)) !== mlrVrai(mlrEval(e.d, r, ctx));
		var a = mlrEval(e.g, r, ctx), b;
		if (e.op === "=~" || e.op === "!=~"){
			if (mlrEstAbsent(a)) return MLR_ABSENT;
			var re = mlrRegex(e.d.chaine !== undefined ? e.d.chaine : mlrTexte(mlrEval(e.d, r, ctx)), e.d.i);
			var ok = re.test(mlrTexte(a));
			return e.op === "=~" ? ok : !ok;
		}
		b = mlrEval(e.d, r, ctx);
		if (["==", "!=", "<", "<=", ">", ">=", "<=>"].indexOf(e.op) > -1){
			if (mlrEstAbsent(a) || mlrEstAbsent(b)) return MLR_ABSENT;
			var c = mlrComparer(a, b);
			switch (e.op){
				case "==": return c === 0; case "!=": return c !== 0; case "<": return c < 0; case "<=": return c <= 0;
				case ">": return c > 0; case ">=": return c >= 0; case "<=>": return { n: c, f: false };
			}
		}
		if (e.op === "."){
			if (mlrEstAbsent(a)) return b;
			if (mlrEstAbsent(b)) return a;
			return mlrTexte(a) + mlrTexte(b);
		}
		return mlrArith(e.op, a, b);
	}
	if (e.fn) return mlrFonction(e.fn, e.a.map(function(x){ return mlrEval(x, r, ctx); }), e, r, ctx);
	return MLR_ABSENT;
}
function mlrFonction(nom, a, e, r, ctx){
	var s = function(k){ return mlrTexte(a[k]); };
	var num = function(k, fn){ if (mlrEstAbsent(a[k])) return a[k]; if (a[k] === "") return ""; var n = mlrNombre(a[k]); if (!n) return { n: NaN, f: true, erreur: true }; return fn(n); };
	switch (nom){
		case "strlen": return mlrEstAbsent(a[0]) ? MLR_ABSENT : { n: Array.from(s(0)).length, f: false };
		case "toupper": return mlrEstAbsent(a[0]) ? a[0] : (mlrNombre(a[0]) && typeof a[0] !== "string" ? a[0] : s(0).toUpperCase());
		case "tolower": return mlrEstAbsent(a[0]) ? a[0] : (mlrNombre(a[0]) && typeof a[0] !== "string" ? a[0] : s(0).toLowerCase());
		case "capitalize": return mlrEstAbsent(a[0]) ? a[0] : s(0).charAt(0).toUpperCase() + s(0).substring(1);
		case "lstrip": return s(0).replace(/^\s+/, "");
		case "rstrip": return s(0).replace(/\s+$/, "");
		case "strip": return s(0).trim();
		case "clean_whitespace": return s(0).trim().replace(/\s+/g, " ");
		case "collapse_whitespace": return s(0).replace(/\s+/g, " ");
		case "truncate": return Array.from(s(0)).slice(0, mlrNombre(a[1]).n).join("");
		case "sub": return mlrEstAbsent(a[0]) ? a[0] : s(0).replace(mlrRegex(s(1), e.a[1] && e.a[1].i), s(2).replace(/\\(\d)/g, "$$$1"));
		case "gsub": return mlrEstAbsent(a[0]) ? a[0] : s(0).replace(new RegExp(mlrRegex(s(1), e.a[1] && e.a[1].i).source, "g" + (e.a[1] && e.a[1].i ? "i" : "")), s(2).replace(/\\(\d)/g, "$$$1"));
		case "ssub": return s(0).replace(s(1), function(){ return s(2); });
		case "regextract": var m = mlrRegex(s(1), e.a[1] && e.a[1].i).exec(s(0)); return m ? m[0] : { n: NaN, f: true, erreur: true };
		case "regextract_or_else": var m2 = mlrRegex(s(1), e.a[1] && e.a[1].i).exec(s(0)); return m2 ? m2[0] : a[2];
		case "is_present": return !mlrEstAbsent(a[0]);
		case "is_absent": return mlrEstAbsent(a[0]);
		case "is_empty": return !mlrEstAbsent(a[0]) && mlrTexte(a[0]) === "";
		case "is_not_empty": return !mlrEstAbsent(a[0]) && mlrTexte(a[0]) !== "";
		case "is_null": return mlrEstAbsent(a[0]) || mlrTexte(a[0]) === "";
		case "is_not_null": return !mlrEstAbsent(a[0]) && mlrTexte(a[0]) !== "";
		case "is_string": return !mlrEstAbsent(a[0]) && typeof a[0] === "string" && a[0] !== "" && !mlrNombre(a[0]);
		case "is_numeric": return !mlrEstAbsent(a[0]) && !!mlrNombre(a[0]);
		case "is_int": var ni = mlrNombre(a[0]); return !!ni && !ni.f;
		case "is_float": var nf = mlrNombre(a[0]); return !!nf && nf.f;
		case "typeof": case "asserting_null":
			if (mlrEstAbsent(a[0])) return "absent";
			if (a[0] === "") return "empty";
			if (typeof a[0] === "boolean") return "boolean";
			var nt = mlrNombre(a[0]); return nt ? (nt.f ? "float" : "int") : "string";
		case "abs": return num(0, function(n){ return mlrNum(Math.abs(n.n), n.f); });
		case "ceil": return num(0, function(n){ return mlrNum(Math.ceil(n.n), n.f); });
		case "floor": return num(0, function(n){ return mlrNum(Math.floor(n.n), n.f); });
		case "round": return num(0, function(n){ return mlrNum(Math.sign(n.n) * Math.round(Math.abs(n.n)), n.f); });
		case "roundm": return num(0, function(n){ var m3 = mlrNombre(a[1]); return mlrNum(Math.round(n.n / m3.n) * m3.n, n.f || m3.f); });
		case "int": return num(0, function(n){ return { n: Math.trunc(n.n), f: false }; });
		case "float": return num(0, function(n){ return { n: n.n, f: true }; });
		case "string": return mlrTexte(a[0]);
		case "boolean": return mlrVrai(a[0]) || (mlrNombre(a[0]) && mlrNombre(a[0]).n !== 0);
		case "fmtnum": return mlrEstAbsent(a[0]) ? a[0] : mlrFormatNombre(a[0], s(1));
		case "min": case "max":
			var l = a.filter(function(x){ return !mlrEstAbsent(x) && x !== ""; });
			if (!l.length) return MLR_ABSENT;
			return l.reduce(function(best, x){ var c = mlrComparer(x, best); return nom === "min" ? (c < 0 ? x : best) : (c > 0 ? x : best); });
		case "strftime": case "sec2gmt": var ns = mlrNombre(a[0]); if (!ns) return a[0]; return new Date(ns.n * 1000).toISOString().replace(/\.\d+Z$/, "Z");
		case "splitax": return s(0).split(s(1)).join(",");
		case "length": return { n: mlrEstAbsent(a[0]) ? 0 : 1, f: false };
		case "concat": return a.map(mlrTexte).join("");
		case "format_values": return a[0];
	}
	throw new MlrErreur("mlr: function name not found: " + nom);
}

/* --- Les lecteurs --- */
function mlrLireCsv(texte, o, nom, tab){
	texte = texte.replace(/^﻿/, "");
	var lignes = tab ? lignesDe(texte.replace(/\r\n/g, "\n")).map(function(l){ return l.split(o.ifs || "\t").map(function(v){ return v.replace(/\\t/g, "\t").replace(/\\n/g, "\n").replace(/\\\\/g, "\\"); }); }) : sdCsvAnalyser(texte, o.ifs || ",");
	lignes = lignes.filter(function(l){ return !(l.length === 1 && l[0] === ""); });
	var r = [], entete = null;
	for (var i = 0; i < lignes.length; i++){
		var l = lignes[i];
		if (entete === null && !o.implicite){ entete = l; continue; }
		if (entete === null) entete = l.map(function(v, k){ return String(k + 1); });
		if (l.length !== entete.length && !o.ragged){
			return { recs: r, erreur: "mlr: mlr: CSV header/data length mismatch " + entete.length + " != " + l.length + " at filename " + (nom || "(stdin)") + " row " + (i + 1) + ".\n." };
		}
		var rec = [];
		if (l.length < entete.length && o.ragged){ for (var k = 0; k < l.length; k++) rec.push({ k: entete[k], v: l[k] }); }
		else {
			for (var k2 = 0; k2 < entete.length; k2++) rec.push({ k: entete[k2], v: l[k2] });
			for (var k3 = entete.length; k3 < l.length; k3++) rec.push({ k: String(k3 + 1), v: l[k3] });
		}
		r.push(rec);
	}
	return { recs: r };
}
function mlrAplatir(v, prefixe, rec){
	if (v !== null && typeof v === "object" && !Array.isArray(v)){
		var cles = Object.keys(v);
		if (!cles.length && prefixe){ rec.push({ k: prefixe, v: "{}" }); return; }
		cles.forEach(function(k){ mlrAplatir(v[k], prefixe ? prefixe + "." + k : k, rec); });
		return;
	}
	if (Array.isArray(v)){ v.forEach(function(x, i){ mlrAplatir(x, prefixe + "." + (i + 1), rec); }); return; }
	rec.push({ k: prefixe, v: v === null ? "" : (typeof v === "boolean" ? v : String(v)) });
}
function mlrLireJson(texte){
	var r = [], i = 0, t = texte.trim();
	try {
		if (t.charAt(0) === "["){
			JSON.parse(t).forEach(function(o){ var rec = []; mlrAplatir(o, "", rec); r.push(rec); });
			return { recs: r };
		}
		// Des objets à la suite (JSON Lines, ou concaténés).
		while (i < t.length){
			while (i < t.length && /\s/.test(t.charAt(i))) i++;
			if (i >= t.length) break;
			var prof = 0, dansC = false, debut = i;
			for (; i < t.length; i++){
				var c = t.charAt(i);
				if (dansC){ if (c === "\\"){ i++; continue; } if (c === "\"") dansC = false; continue; }
				if (c === "\"") dansC = true;
				else if (c === "{" || c === "[") prof++;
				else if (c === "}" || c === "]"){ prof--; if (prof === 0){ i++; break; } }
			}
			var rec = [];
			mlrAplatir(JSON.parse(t.substring(debut, i)), "", rec);
			r.push(rec);
		}
	} catch (e){ return { recs: r, erreur: "mlr: data parse error: " + (e.message || e) }; }
	return { recs: r };
}
function mlrLireDkvp(texte, o){
	return { recs: lignesDe(texte.replace(/\r\n/g, "\n")).filter(function(l){ return l !== ""; }).map(function(l){
		return l.split(o.ifs || ",").map(function(p, k){ var i = p.indexOf(o.ips || "="); return i < 0 ? { k: String(k + 1), v: p } : { k: p.substring(0, i), v: p.substring(i + 1) }; });
	}) };
}
function mlrLireNidx(texte, o){
	return { recs: lignesDe(texte.replace(/\r\n/g, "\n")).filter(function(l){ return l !== ""; }).map(function(l){
		return (o.ifs ? l.split(o.ifs) : l.trim().split(/\s+/)).map(function(v, k){ return { k: String(k + 1), v: v }; });
	}) };
}

/* --- Les écrivains --- */
function mlrJsonValeur(v){
	if (typeof v === "boolean") return v ? "true" : "false";
	if (v && typeof v === "object" && v.n !== undefined) return v.erreur ? "(error)" : mlrTexte(v);
	var t = String(v);
	if (t !== "" && mlrNombre(t)) return t;
	return "\"" + t.replace(/[\\"\u0000-\u001f]/g, function(c){ return { "\\": "\\\\", "\"": "\\\"", "\n": "\\n", "\r": "\\r", "\t": "\\t" }[c] || "\\u" + sdPad(c.charCodeAt(0).toString(16), 4); }) + "\"";
}
function mlrBlocs(recs){
	var blocs = [];
	recs.forEach(function(r){
		var cles = mlrCles(r).join("\u0001");
		if (!blocs.length || blocs[blocs.length - 1].cles !== cles) blocs.push({ cles: cles, noms: mlrCles(r), recs: [] });
		blocs[blocs.length - 1].recs.push(r);
	});
	return blocs;
}
function mlrEcrire(recs, o, io){
	var f = o.ofmt, ofs = o.ofs;
	if (f === "json"){
		if (!recs.length) return "[\n]";
		if (o.jvstack === false) return "[\n" + recs.map(function(r){ return "{" + r.map(function(p){ return JSON.stringify(p.k) + ": " + mlrJsonValeur(p.v); }).join(", ") + "}"; }).join(",\n") + "\n]";
		return "[\n" + recs.map(function(r){ return "{\n" + r.map(function(p){ return "  " + JSON.stringify(p.k) + ": " + mlrJsonValeur(p.v); }).join(",\n") + "\n}"; }).join(",\n") + "\n]";
	}
	if (f === "jsonl") return recs.map(function(r){ return "{" + r.map(function(p){ return JSON.stringify(p.k) + ": " + mlrJsonValeur(p.v); }).join(", ") + "}"; }).join("\n");
	if (f === "dkvp") return recs.map(function(r){ return r.map(function(p){ return p.k + (o.ops || "=") + mlrTexte(p.v); }).join(ofs || ","); }).join("\n");
	if (f === "nidx") return recs.map(function(r){ return r.map(function(p){ return mlrTexte(p.v); }).join(ofs || " "); }).join("\n");
	if (f === "xtab") return recs.map(function(r){ var w = r.reduce(function(m, p){ return Math.max(m, sdLargeur(p.k)); }, 0); return r.map(function(p){ return sdDroiteL(p.k, w) + " " + (mlrTexte(p.v) === "" ? "-" : mlrTexte(p.v)); }).join("\n"); }).join("\n\n");
	if (f === "csv" || f === "tsv"){
		var sep = ofs || (f === "csv" ? "," : "\t");
		var echap = function(v){
			v = mlrTexte(v);
			if (f === "tsv") return v.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n");
			return v.indexOf(sep) > -1 || v.indexOf("\"") > -1 || /[\r\n]/.test(v) ? "\"" + v.replace(/"/g, "\"\"") + "\"" : v;
		};
		var l = [], premier = null;
		for (var i = 0; i < recs.length; i++){
			var cles = mlrCles(recs[i]);
			if (premier === null){ premier = cles; if (!o.sansEnteteSortie) l.push(cles.map(echap).join(sep)); }
			else if (cles.join("\u0001") !== premier.join("\u0001")){
				if (cles.length !== premier.length || f === "csv"){
					return { texte: l.join("\n"), erreur: "mlr: CSV schema change: first keys \"" + premier.join(sep) + "\"; current keys \"" + cles.join(sep) + "\"\nmlr: exiting due to data error." };
				}
			}
			l.push(recs[i].map(function(p){ return echap(p.v); }).join(sep));
		}
		return l.join("\n");
	}
	if (f === "markdown"){
		return mlrBlocs(recs).map(function(b){
			return ["| " + b.noms.join(" | ") + " |", "|" + b.noms.map(function(){ return " --- "; }).join("|") + "|"].concat(b.recs.map(function(r){ return "| " + r.map(function(p){ return mlrTexte(p.v).replace(/\|/g, "\\|"); }).join(" | ") + " |"; })).join("\n");
		}).join("\n\n");
	}
	// pprint
	return mlrBlocs(recs).map(function(b){
		var cellules = b.recs.map(function(r){ return r.map(function(p){ var t = mlrTexte(p.v); return t === "" ? "-" : t; }); });
		var w = b.noms.map(function(n, k){ return Math.max(sdLargeur(n), cellules.reduce(function(m, c){ return Math.max(m, sdLargeur(c[k])); }, 0)); });
		if (o.barre){
			var trait = "+" + w.map(function(x){ return new Array(x + 3).join("-"); }).join("+") + "+";
			var ligneB = function(c){ return "| " + c.map(function(v, k){ return sdDroiteL(v, w[k]); }).join(" | ") + " |"; };
			return [trait, ligneB(b.noms), trait].concat(cellules.map(ligneB)).concat([trait]).join("\n");
		}
		var ligne = function(c){ return c.map(function(v, k){ return k === c.length - 1 ? v : sdDroiteL(v, w[k]); }).join(" "); };
		return (o.sansEnteteSortie ? [] : [ligne(b.noms)]).concat(cellules.map(ligne)).join("\n");
	}).join("\n\n");
}

/* --- Les verbes --- */
function mlrListe(t){ return String(t || "").split(",").filter(function(x){ return x !== ""; }); }
function mlrGroupe(r, champs){ var v = champs.map(function(c){ return mlrGet(r, c); }); return v.some(function(x){ return x === undefined; }) ? null : v.map(mlrTexte).join("\u0001"); }
function mlrPercentile(v, p, interpoler){
	if (!v.length) return "";
	var tri = v.slice().sort(function(a, b){ return a.n - b.n; });
	if (interpoler){
		var fi = p / 100 * (tri.length - 1), b0 = Math.floor(fi), fr = fi - b0;
		if (b0 + 1 >= tri.length) return tri[tri.length - 1];
		return mlrNum(tri[b0].n + fr * (tri[b0 + 1].n - tri[b0].n), true);
	}
	var idx = Math.floor(p / 100 * tri.length);
	if (idx < 0) idx = 0;
	if (idx >= tri.length) idx = tri.length - 1;
	return tri[idx];
}
var MLR_VERBES = {
	cat: function(a){
		var o = { n: false, N: null, g: [] };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-n") o.n = true; else if (x === "-N"){ o.n = true; o.N = a.shift(); } else if (x === "-g") o.g = mlrListe(a.shift()); else throw new MlrErreur("mlr cat: option \"" + x + "\" not recognized."); }
		return function(recs){
			var compte = {};
			return recs.map(function(r){
				if (!o.n) return r;
				var g = o.g.length ? mlrGroupe(r, o.g) : "";
				if (g === null) return null;
				compte[g] = (compte[g] || 0) + 1;
				return [{ k: o.N || "n", v: { n: compte[g], f: false } }].concat(r);
			}).filter(Boolean);
		};
	},
	head: function(a){ return mlrTeteQueue(a, true); },
	tail: function(a){ return mlrTeteQueue(a, false); },
	tac: function(){ return function(recs){ return recs.slice().reverse(); }; },
	nothing: function(){ return function(){ return []; }; },
	sort: function(a){
		var cles = [];
		while (a.length && /^-[a-z]+$/.test(a[0]) && a.length > 1){
			var x = a.shift(), champs = mlrListe(a.shift());
			var mode = { "-f": ["lex", 1], "-r": ["lex", -1], "-nf": ["num", 1], "-n": ["num", 1], "-nr": ["num", -1], "-c": ["casse", 1], "-cr": ["casse", -1], "-t": ["nat", 1], "-tr": ["nat", -1] }[x];
			if (!mode) throw new MlrErreur("mlr sort: option \"" + x + "\" not recognized.");
			champs.forEach(function(c){ cles.push({ c: c, mode: mode[0], sens: mode[1] }); });
		}
		if (!cles.length) throw new MlrErreur("mlr sort: no sort keys given.");
		return function(recs){
			var avec = [], sans = [];
			recs.forEach(function(r, i){ (cles.every(function(k){ return mlrGet(r, k.c) !== undefined; }) ? avec : sans).push({ r: r, i: i }); });
			avec.sort(function(x, y){
				for (var k = 0; k < cles.length; k++){
					var c = cles[k], u = mlrGet(x.r, c.c), v = mlrGet(y.r, c.c), d = 0;
					if (c.mode === "num"){
						var nu = mlrNombre(u), nv = mlrNombre(v);
						if (nu && nv) d = nu.n - nv.n; else if (nu) d = -1; else if (nv) d = 1; else d = 0;
						if (d) return d * c.sens * (nu && nv ? 1 : (c.sens < 0 ? -1 : 1));
					} else {
						var su = mlrTexte(u), sv = mlrTexte(v);
						if (c.mode === "casse"){ su = su.toLowerCase(); sv = sv.toLowerCase(); }
						d = su < sv ? -1 : (su > sv ? 1 : 0);
						if (d) return d * c.sens;
					}
				}
				return x.i - y.i;
			});
			return avec.concat(sans).map(function(x){ return x.r; });
		};
	},
	filter: function(a){
		var inverse = false;
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-x") inverse = true; else if (x === "-q" || x === "-S" || x === "-F") continue; else throw new MlrErreur("mlr filter: option \"" + x + "\" not recognized."); }
		if (!a.length) throw new MlrErreur("mlr filter: needs an expression.");
		var prog = mlrAnalyser(a.shift());
		return function(recs, ctx){
			return recs.filter(function(r, i){
				ctx.nr = i + 1;
				var garde = true;
				prog.forEach(function(ins){
					if (ins.nu) garde = mlrVrai(mlrEval(ins.nu, r, ctx));
					else if (ins.filtre) garde = mlrVrai(mlrEval(ins.filtre, r, ctx));
					else if (ins.affecter){ var v = mlrEval(ins.e, r, ctx); if (!mlrEstAbsent(v)) mlrSet(r, ins.affecter, v); }
				});
				return garde !== inverse;
			});
		};
	},
	put: function(a){
		var silence = false;
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-q") silence = true; else if (x === "-S" || x === "-F") continue; else throw new MlrErreur("mlr put: option \"" + x + "\" not recognized."); }
		if (!a.length) throw new MlrErreur("mlr put: needs an expression.");
		var prog = mlrAnalyser(a.shift());
		return function(recs, ctx){
			var sortie = [];
			recs.forEach(function(r, i){
				ctx.nr = i + 1;
				var garde = true;
				prog.forEach(function(ins){
					if (ins.affecter){ var v = mlrEval(ins.e, r, ctx); if (!mlrEstAbsent(v)) mlrSet(r, ins.affecter, v); }
					else if (ins.unset) ins.unset.forEach(function(c){ mlrDel(r, c); });
					else if (ins.filtre) garde = mlrVrai(mlrEval(ins.filtre, r, ctx));
					else if (ins.nu) mlrEval(ins.nu, r, ctx);
				});
				if (garde && !silence) sortie.push(r);
			});
			return sortie;
		};
	},
	cut: function(a){
		var o = { f: [], ordre: false, exclure: false, regex: false };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-f") o.f = mlrListe(a.shift()); else if (x === "-o") o.ordre = true; else if (x === "-x") o.exclure = true; else if (x === "-r") o.regex = true; else throw new MlrErreur("mlr cut: option \"" + x + "\" not recognized."); }
		if (!o.f.length) throw new MlrErreur("mlr cut: option -f is required.");
		var res = o.regex ? o.f.map(function(m){ var mm = /^"(.*)"(i?)$/.exec(m); return mm ? mlrRegex(mm[1], !!mm[2]) : mlrRegex(m); }) : null;
		var garde = function(k){ return res ? res.some(function(re){ return re.test(k); }) : o.f.indexOf(k) > -1; };
		return function(recs){
			return recs.map(function(r){
				if (o.exclure) return r.filter(function(p){ return !garde(p.k); });
				if (o.ordre && !res) return o.f.filter(function(k){ return mlrGet(r, k) !== undefined; }).map(function(k){ return { k: k, v: mlrGet(r, k) }; });
				return r.filter(function(p){ return garde(p.k); });
			});
		};
	},
	uniq: function(a){
		var o = { g: null, c: false, n: false, a: false, d: false, u: false };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-g") o.g = mlrListe(a.shift()); else if (x === "-c") o.c = true; else if (x === "-n") o.n = true; else if (x === "-a") o.a = true; else if (x === "-d") o.d = true; else if (x === "-u") o.u = true; else throw new MlrErreur("mlr uniq: option \"" + x + "\" not recognized."); }
		if (!o.g && !o.a) throw new MlrErreur("mlr uniq: option -g or -a is required.");
		return function(recs){
			var vus = {}, ordre = [];
			recs.forEach(function(r){
				var cle = o.a ? r.map(function(p){ return p.k + "\u0002" + mlrTexte(p.v); }).join("\u0001") : mlrGroupe(r, o.g);
				if (cle === null) return;
				if (!vus.hasOwnProperty(cle)){ vus[cle] = { n: 0, r: r }; ordre.push(cle); }
				vus[cle].n++;
			});
			if (o.n) return [[{ k: "count", v: { n: ordre.length, f: false } }]];
			var l = ordre.filter(function(k){ return o.d ? vus[k].n > 1 : (o.u ? vus[k].n === 1 : true); });
			return l.map(function(k){
				var r = vus[k].r, base = o.a ? mlrCopie(r) : o.g.map(function(c){ return { k: c, v: mlrGet(r, c) }; });
				if (!o.c) return base;
				return o.a ? [{ k: "count", v: { n: vus[k].n, f: false } }].concat(base) : base.concat([{ k: "count", v: { n: vus[k].n, f: false } }]);
			});
		};
	},
	count: function(a){
		var o = { g: null, d: false, n: false, nom: "count" };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-g") o.g = mlrListe(a.shift()); else if (x === "-d") o.d = true; else if (x === "-n") o.n = true; else if (x === "-o") o.nom = a.shift(); else throw new MlrErreur("mlr count: option \"" + x + "\" not recognized."); }
		return function(recs){
			if (!o.g) return [[{ k: o.nom, v: { n: recs.length, f: false } }]];
			var vus = {}, ordre = [];
			recs.forEach(function(r){ var k = mlrGroupe(r, o.g); if (k === null) return; if (!vus.hasOwnProperty(k)){ vus[k] = { n: 0, r: r }; ordre.push(k); } vus[k].n++; });
			if (o.n || o.d) return [[{ k: o.nom, v: { n: ordre.length, f: false } }]];
			return ordre.map(function(k){ return o.g.map(function(c){ return { k: c, v: mlrGet(vus[k].r, c) }; }).concat([{ k: o.nom, v: { n: vus[k].n, f: false } }]); });
		};
	},
	"count-distinct": function(a){
		var o = { f: null, n: false, u: false };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-f") o.f = mlrListe(a.shift()); else if (x === "-n") o.n = true; else if (x === "-u") o.u = true; else throw new MlrErreur("mlr count-distinct: option \"" + x + "\" not recognized."); }
		if (!o.f) throw new MlrErreur("mlr count-distinct: option -f is required.");
		return function(recs){
			var vus = {}, ordre = [];
			recs.forEach(function(r){ var k = mlrGroupe(r, o.f); if (k === null) return; if (!vus.hasOwnProperty(k)){ vus[k] = { n: 0, r: r }; ordre.push(k); } vus[k].n++; });
			if (o.n) return [[{ k: "count", v: { n: ordre.length, f: false } }]];
			return ordre.map(function(k){ return o.f.map(function(c){ return { k: c, v: mlrGet(vus[k].r, c) }; }).concat([{ k: "count", v: { n: vus[k].n, f: false } }]); });
		};
	},
	stats1: function(a){
		var o = { a: [], f: [], g: [], i: false };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-a") o.a = mlrListe(a.shift()); else if (x === "-f") o.f = mlrListe(a.shift()); else if (x === "-g") o.g = mlrListe(a.shift()); else if (x === "-i") o.i = true; else throw new MlrErreur("mlr stats1: option \"" + x + "\" not recognized."); }
		var connus = ["count", "mode", "antimode", "sum", "mean", "var", "stddev", "meaneb", "min", "max", "minlen", "maxlen", "null_count", "distinct_count", "median", "first", "last"];
		o.a.forEach(function(acc){ if (connus.indexOf(acc) === -1 && !/^p\d+(\.\d+)?$/.test(acc) || acc === "first" || acc === "last") throw new MlrErreur("mlr stats1: accumulator \"" + acc + "\" not found."); });
		if (!o.a.length || !o.f.length) throw new MlrErreur("mlr stats1: options -a and -f are required.");
		return function(recs){
			var groupes = {}, ordre = [];
			recs.forEach(function(r){ var k = mlrGroupe(r, o.g); if (k === null) return; if (!groupes.hasOwnProperty(k)){ groupes[k] = { r: r, recs: [] }; ordre.push(k); } groupes[k].recs.push(r); });
			return ordre.map(function(k){
				var g = groupes[k], sortie = o.g.map(function(c){ return { k: c, v: mlrGet(g.r, c) }; });
				o.f.forEach(function(champ){
					var brut = g.recs.map(function(r){ return mlrGet(r, champ); }).filter(function(v){ return v !== undefined; });
					var nonVides = brut.filter(function(v){ return mlrTexte(v) !== ""; });
					var nums = nonVides.map(mlrNombre).filter(Boolean);
					var flottant = nums.some(function(n){ return n.f; });
					o.a.forEach(function(acc){
						var v;
						var somme = nums.reduce(function(s, n){ return s + n.n; }, 0), moy = nums.length ? somme / nums.length : 0;
						var vari = nums.length > 1 ? nums.reduce(function(s, n){ return s + (n.n - moy) * (n.n - moy); }, 0) / (nums.length - 1) : null;
						switch (acc){
							case "count": v = { n: nonVides.length, f: false }; break;
							case "sum": v = mlrNum(somme, flottant); break;
							case "mean": v = nums.length ? mlrNum(moy, true) : ""; break;
							case "var": v = vari === null ? "" : mlrNum(vari, true); break;
							case "stddev": v = vari === null ? "" : mlrNum(Math.sqrt(vari), true); break;
							case "meaneb": v = vari === null ? "" : mlrNum(Math.sqrt(vari / nums.length), true); break;
							case "min": case "max":
								if (!nonVides.length){ v = ""; break; }
								if (nums.length === nonVides.length){ var ext = nums.reduce(function(m, n){ return acc === "min" ? (n.n < m.n ? n : m) : (n.n > m.n ? n : m); }); v = ext; }
								else v = nonVides.map(mlrTexte).reduce(function(m, s){ return acc === "min" ? (s < m ? s : m) : (s > m ? s : m); });
								break;
							case "mode": case "antimode":
								var c = {}, ord = [];
								nonVides.forEach(function(x){ var t = mlrTexte(x); if (!c.hasOwnProperty(t)){ c[t] = 0; ord.push(t); } c[t]++; });
								var best = ord[0];
								ord.forEach(function(t){ if (acc === "mode" ? c[t] > c[best] : c[t] < c[best]) best = t; });
								v = best === undefined ? "" : best; break;
							case "minlen": v = { n: nonVides.reduce(function(m, x){ return Math.min(m, Array.from(mlrTexte(x)).length); }, Infinity), f: false }; if (!isFinite(v.n)) v = ""; break;
							case "maxlen": v = { n: nonVides.reduce(function(m, x){ return Math.max(m, Array.from(mlrTexte(x)).length); }, 0), f: false }; break;
							case "null_count": v = { n: brut.length - nonVides.length, f: false }; break;
							case "distinct_count": v = { n: nonVides.map(mlrTexte).filter(function(t, i, l){ return l.indexOf(t) === i; }).length, f: false }; break;
							case "median": v = mlrPercentile(nums, 50, o.i); break;
							default: v = mlrPercentile(nums, parseFloat(acc.substring(1)), o.i);
						}
						sortie.push({ k: champ + "_" + acc, v: v });
					});
				});
				return sortie;
			});
		};
	},
	rename: function(a){
		var regex = false;
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-r") regex = true; else if (x === "-g") regex = true; else throw new MlrErreur("mlr rename: option \"" + x + "\" not recognized."); }
		var l = mlrListe(a.shift());
		if (l.length % 2) throw new MlrErreur("mlr rename: field-name list must have even length.");
		return function(recs){
			return recs.map(function(r){
				for (var i = 0; i < l.length; i += 2){
					var anc = l[i], nv = l[i + 1];
					r.forEach(function(p){
						if (regex){ var mm = /^"(.*)"(i?)$/.exec(anc), re = mm ? mlrRegex(mm[1], !!mm[2]) : mlrRegex(anc); if (re.test(p.k)) p.k = p.k.replace(re, nv.replace(/\\(\d)/g, "$$$1")); }
						else if (p.k === anc) p.k = nv;
					});
				}
				return r;
			});
		};
	},
	reorder: function(a){
		var champs = [], fin = false;
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-f") champs = mlrListe(a.shift()); else if (x === "-e") fin = true; else throw new MlrErreur("mlr reorder: option \"" + x + "\" not recognized."); }
		return function(recs){
			return recs.map(function(r){
				var choisis = champs.filter(function(c){ return mlrGet(r, c) !== undefined; }).map(function(c){ return { k: c, v: mlrGet(r, c) }; });
				var autres = r.filter(function(p){ return champs.indexOf(p.k) === -1; });
				return fin ? autres.concat(choisis) : choisis.concat(autres);
			});
		};
	},
	label: function(a){
		var l = mlrListe(a.shift());
		return function(recs){ return recs.map(function(r){ l.forEach(function(n, i){ if (r[i]){ mlrDel(r.slice(i + 1), n); r[i].k = n; } }); return r; }); };
	},
	top: function(a){
		var o = { n: 1, f: [], g: [], a: false, max: true, nom: null };
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-n") o.n = +a.shift(); else if (x === "-f") o.f = mlrListe(a.shift()); else if (x === "-g") o.g = mlrListe(a.shift()); else if (x === "-a") o.a = true; else if (x === "--min") o.max = false; else if (x === "--max") o.max = true; else if (x === "-o") o.nom = a.shift(); else throw new MlrErreur("mlr top: option \"" + x + "\" not recognized."); }
		return function(recs){
			var groupes = {}, ordre = [];
			recs.forEach(function(r){ var k = mlrGroupe(r, o.g); if (k === null) return; if (!groupes.hasOwnProperty(k)){ groupes[k] = { r: r, recs: [] }; ordre.push(k); } groupes[k].recs.push(r); });
			var sortie = [];
			ordre.forEach(function(k){
				var g = groupes[k];
				var champ = o.f[0];
				var tri = g.recs.filter(function(r){ return mlrNombre(mlrGet(r, champ)); }).map(function(r, i){ return { r: r, i: i, n: mlrNombre(mlrGet(r, champ)).n }; })
					.sort(function(x, y){ return (o.max ? y.n - x.n : x.n - y.n) || x.i - y.i; }).slice(0, o.n);
				if (o.a){ tri.forEach(function(x){ sortie.push(x.r); }); return; }
				for (var i = 0; i < o.n; i++){
					var rec = o.g.map(function(c){ return { k: c, v: mlrGet(g.r, c) }; }).concat([{ k: "top_idx", v: { n: i + 1, f: false } }]);
					o.f.forEach(function(c){ var t = tri[i]; rec.push({ k: o.nom || c + "_top", v: t ? mlrGet(t.r, c) : "" }); });
					sortie.push(rec);
				}
			});
			return sortie;
		};
	},
	"fill-empty": function(a){
		var v = "N/A", seulementVides = false;
		while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-v") v = a.shift(); else if (x === "-S") continue; else if (x === "--only-if-blank") seulementVides = true; else throw new MlrErreur("mlr fill-empty: option \"" + x + "\" not recognized."); }
		return function(recs){ return recs.map(function(r){ r.forEach(function(p){ if (mlrTexte(p.v) === "") p.v = v; }); return r; }); };
	},
	"group-by": function(a){
		var champs = mlrListe(a.shift());
		return function(recs){
			var g = {}, ordre = [];
			recs.forEach(function(r){ var k = mlrGroupe(r, champs); if (k === null) return; if (!g.hasOwnProperty(k)){ g[k] = []; ordre.push(k); } g[k].push(r); });
			return [].concat.apply([], ordre.map(function(k){ return g[k]; }));
		};
	},
	join: function(a, ctx){
		var o = { j: null, l: null, r: null, f: null, np: false, ul: false, ur: false };
		while (a.length && /^-/.test(a[0])){
			var x = a.shift();
			if (x === "-j") o.j = mlrListe(a.shift()); else if (x === "-l") o.l = mlrListe(a.shift()); else if (x === "-r") o.r = mlrListe(a.shift());
			else if (x === "-f") o.f = a.shift(); else if (x === "--np") o.np = true; else if (x === "--ul") o.ul = true; else if (x === "--ur") o.ur = true;
			else if (x === "-u" || x === "-s" || x === "-i") continue; else throw new MlrErreur("mlr join: option \"" + x + "\" not recognized.");
		}
		if (!o.f) throw new MlrErreur("mlr join: option -f is required.");
		if (!o.j) throw new MlrErreur("mlr join: option -j is required.");
		var gauches = o.l || o.j, droites = o.r || o.j;
		return function(recs, c2){
			var gauche = c2.lireFichier(o.f);
			var index = {}, utilises = {};
			gauche.forEach(function(r, i){ var k = mlrGroupe(r, gauches); if (k === null) return; (index[k] = index[k] || []).push(i); });
			var sortie = [];
			recs.forEach(function(r){
				var k = mlrGroupe(r, droites);
				var paires = k === null ? null : index[k];
				if (!paires){ if (o.ur) sortie.push(r); return; }
				paires.forEach(function(i){
					utilises[i] = true;
					if (o.np) return;
					var g = gauche[i], rec = o.j.map(function(c, n){ return { k: c, v: mlrGet(r, droites[n]) }; });
					g.forEach(function(p){ if (gauches.indexOf(p.k) === -1) rec.push({ k: p.k, v: p.v }); });
					r.forEach(function(p){ if (droites.indexOf(p.k) === -1) mlrSet(rec, p.k, p.v); });
					sortie.push(rec);
				});
			});
			if (o.ul) gauche.forEach(function(r, i){ if (!utilises[i]) sortie.push(r); });
			return sortie;
		};
	}
};
function mlrTeteQueue(a, tete){
	var n = 10, g = [];
	while (a.length && /^-/.test(a[0])){ var x = a.shift(); if (x === "-n") n = +a.shift(); else if (x === "-g") g = mlrListe(a.shift()); else throw new MlrErreur("mlr " + (tete ? "head" : "tail") + ": option \"" + x + "\" not recognized."); }
	return function(recs){
		var groupes = {}, ordre = [];
		recs.forEach(function(r){ var k = g.length ? mlrGroupe(r, g) : ""; if (k === null) return; if (!groupes.hasOwnProperty(k)){ groupes[k] = []; ordre.push(k); } groupes[k].push(r); });
		var s = [];
		ordre.forEach(function(k){ var l = groupes[k]; s = s.concat(tete ? l.slice(0, n) : l.slice(Math.max(0, l.length - n))); });
		return s;
	};
}
var MLR_FORMATS = { c: "csv", t: "tsv", j: "json", l: "jsonl", d: "dkvp", n: "nidx", x: "xtab", p: "pprint", m: "markdown", b: "pprint" };
Shell.sorts.mlr = function(args, io){
	var o = { ifmt: "dkvp", ofmt: "dkvp", ifs: null, ofs: null, ips: null, ops: null, implicite: false, sansEnteteSortie: false, ragged: false, barre: false, sansEntree: false, fichiers: [] };
	var a = args.slice(), m;
	while (a.length && /^-/.test(a[0])){
		var x = a.shift();
		if ((m = /^--([ctjldnxpm])2([ctjldnxpmb])$/.exec(x))){ o.ifmt = MLR_FORMATS[m[1]]; o.ofmt = MLR_FORMATS[m[2]]; if (m[2] === "b") o.barre = true; continue; }
		if ((m = /^--i(csv|tsv|json|jsonl|dkvp|nidx|xtab)$/.exec(x))){ o.ifmt = m[1]; continue; }
		if ((m = /^--o(csv|tsv|json|jsonl|dkvp|nidx|xtab|pprint|markdown|md)$/.exec(x))){ o.ofmt = m[1] === "md" ? "markdown" : m[1]; continue; }
		if ((m = /^--(csv|tsv|json|jsonl|dkvp|nidx|xtab)$/.exec(x))){ o.ifmt = o.ofmt = m[1]; continue; }
		if (x === "--pprint"){ o.ifmt = "nidx"; o.ofmt = "pprint"; continue; }
		if (x === "--icsvlite" || x === "--csvlite"){ o.ifmt = "csv"; if (x === "--csvlite") o.ofmt = "csv"; continue; }
		if (x === "--barred" || x === "--barred-output"){ o.barre = true; continue; }
		if (x === "--jvstack"){ o.jvstack = true; continue; }
		if (x === "--no-jvstack"){ o.jvstack = false; continue; }
		if (x === "--implicit-csv-header" || x === "--hi" || x === "--no-implicit-csv-header" && false){ o.implicite = true; continue; }
		if (x === "--headerless-csv-output" || x === "--ho" || x === "--headerless-pprint-output"){ o.sansEnteteSortie = true; continue; }
		if (x === "--allow-ragged-csv-input" || x === "--ragged"){ o.ragged = true; continue; }
		if (x === "-n"){ o.sansEntree = true; continue; }
		if (x === "--ifs" || x === "--ofs" || x === "--fs" || x === "--ips" || x === "--ops" || x === "--ps"){
			var v = a.shift(), noms = { comma: ",", tab: "\t", space: " ", semicolon: ";", pipe: "|", colon: ":", equals: "=" };
			v = noms[v] || v;
			if (x === "--ifs" || x === "--fs") o.ifs = v;
			if (x === "--ofs" || x === "--fs") o.ofs = v;
			if (x === "--ips" || x === "--ps") o.ips = v;
			if (x === "--ops" || x === "--ps") o.ops = v;
			continue;
		}
		if (x === "--from"){ o.fichiers.push(a.shift()); continue; }
		if (x === "--records-per-batch" || x === "--nr-progress-mod" || x === "--load" || x === "--mload"){ a.shift(); continue; }
		if (x === "-S" || x === "-A" || x === "--no-color" || x === "-M" || x === "--no-auto-flatten" || x === "--no-auto-unflatten" || x === "--quote-all" || x === "--quote-original") continue;
		if (x === "--version") return "mlr 6.11.0";
		throw new ShellError("mlr: option \"" + x + "\" not recognized.\nPlease run \"mlr --help\" for usage information.", 1);
	}
	if (!a.length) throw new ShellError("mlr: no verb supplied.\nPlease run \"mlr --help\" for usage information.", 1);
	// La chaîne des verbes, puis les fichiers.
	var etapes = [], ctx = { nr: 0, fichier: null };
	try {
		while (true){
			var verbe = a.shift();
			if (!MLR_VERBES.hasOwnProperty(verbe)) throw new MlrErreur("mlr: verb \"" + verbe + "\" not found. Please use \"mlr --help\" for a list.");
			// Les arguments du verbe : jusqu'au prochain then, ou les fichiers.
			var propres = [];
			while (a.length && a[0] !== "then") propres.push(a.shift());
			var nbAvant = propres.length;
			var fonction = MLR_VERBES[verbe](propres, ctx);
			etapes.push(fonction);
			if (a[0] === "then"){ a.shift(); if (!propres.length && false) break; continue; }
			// Ce que le verbe n'a pas pris : les fichiers.
			o.fichiers = o.fichiers.concat(propres);
			break;
		}
	} catch (e){
		if (e instanceof MlrErreur) throw new ShellError(e.message, 1);
		throw e;
	}
	var lire = function(texte, nom){
		var f = o.ifmt;
		if (f === "csv") return mlrLireCsv(texte, o, nom, false);
		if (f === "tsv") return mlrLireCsv(texte, o, nom, true);
		if (f === "json" || f === "jsonl") return mlrLireJson(texte);
		if (f === "nidx") return mlrLireNidx(texte, o);
		return mlrLireDkvp(texte, o);
	};
	ctx.lireFichier = function(nom){ var t = Shell.objetLisible(nom, io, "mlr").item.getText(); var r = lire(t, nom); if (r.erreur) throw new MlrErreur(r.erreur); return r.recs; };
	var recs = [], erreur = null;
	if (!o.sansEntree){
		if (o.fichiers.length){
			o.fichiers.forEach(function(nom){
				if (erreur) return;
				var t;
				try { t = Shell.objetLisible(nom, io, "mlr"); } catch (e){ if (!(e instanceof ShellError)) throw e; erreur = "mlr: open " + nom + ": no such file or directory."; return; }
				ctx.fichier = nom;
				var r = lire(t.item.getText(), nom);
				recs = recs.concat(r.recs);
				if (r.erreur) erreur = r.erreur;
			});
		} else {
			if (io.stdin === null) throw new ShellError("mlr : quel fichier ? Utilisation : mlr --icsv --opprint cat FICHIER.csv, ou commande | mlr ..." + sdAstuce(io, "Exemple : mlr --c2p head -n 5 captures.csv"), 1);
			var r0 = lire(io.stdin, "(stdin)");
			recs = r0.recs;
			if (r0.erreur) erreur = r0.erreur;
		}
	}
	try {
		etapes.forEach(function(f){ recs = f(recs, ctx); });
	} catch (e){
		if (e instanceof MlrErreur) throw new ShellError(e.message, 1);
		throw e;
	}
	var ecrit = mlrEcrire(recs, o, io);
	sdEvenement("mlr", { entree: o.ifmt, sortie: o.ofmt, enregistrements: recs.length, fichiers: o.fichiers.slice() });
	if (typeof ecrit === "object"){ io.err(ecrit.erreur); io.code = 1; return ecrit.texte; }
	if (erreur){ (io.errFin || io.err)(erreur); io.code = 1; }
	return ecrit;
};

/* ================================================================== */
/* Lancer une commande depuis une autre (flock, ionice, taskset, time)  */
/* ================================================================== */

function sdLancerArgv(argv, io, stdin, stdinSansFin){
	var nom = argv[0], args = argv.slice(1), sudo = !!io.sudo;
	if (nom === "sudo"){
		if (!state.has("sudoOK")) throw new ShellError("sudo : mot de passe requis." + sdAstuce(io, "Mets sudo en tête de ligne, ou lance d'abord une commande avec sudo pour que le terminal s'en souvienne."));
		sudo = true; nom = args[0]; args = args.slice(1);
	}
	var fils = { stdin: stdin === undefined ? null : stdin, stdinSansFin: !!stdinSansFin, tty: io.tty, sortie1: io.sortie1, sudo: sudo, code: 0 };
	fils.err = function(m){ io.err(m); };
	fils.errFin = function(m){ if (io.errFin) io.errFin(m); else io.err(m); };
	var sortie;
	try { sortie = Shell.appeler(nom, args, fils); }
	catch (e){
		if (e instanceof ShellError){ io.err(e.message); return { sortie: "", code: e.code || 1 }; }
		throw e;
	}
	return { sortie: sortie === undefined || sortie === null ? "" : String(sortie), code: fils.code || 0 };
}
/* Une ligne de shell, lancée à part : ce qu'elle écrit, et son statut. */
function sdLancerTexte(texte, io){
	var r = Interpreteur.capturer(texte);
	if (r.erreurs) io.err(r.erreurs);
	return { sortie: r.sortie, code: r.code };
}
function sdQuoter(a){ return /^[A-Za-z0-9_.\/:=@%+,-]+$/.test(a) ? a : "'" + String(a).replace(/'/g, "'\\''") + "'"; }

/* ================================================================== */
/* time, pv                                                             */
/* ================================================================== */

Shell.sorts.time = function(args, io){
	var posix = false;
	while (args.length && /^-/.test(args[0])){ if (args[0] === "-p") posix = true; args = args.slice(1); }
	var r = args.length ? sdLancerArgv(args, io, io.stdin, io.stdinSansFin) : { sortie: "", code: 0 };
	var reel = 0.004 + (r.sortie.length % 97) / 1000, user = 0.001 + (r.sortie.length % 7) / 1000, sys = 0.002;
	var f = function(s){ return Math.floor(s / 60) + "m" + (s % 60).toFixed(3) + "s"; };
	(io.errFin || io.err)(posix ? "real " + reel.toFixed(2) + "\nuser " + user.toFixed(2) + "\nsys " + sys.toFixed(2) : "\nreal\t" + f(reel) + "\nuser\t" + f(user) + "\nsys\t" + f(sys));
	if (r.code) io.code = r.code;
	sdEvenement("time", { commande: args.slice() });
	return r.sortie;
};

function sdTaillePv(n){
	if (n < 1024) return n + "  B";
	var u = ["KiB", "MiB", "GiB", "TiB"], i = -1;
	do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
	return (n >= 100 ? n.toFixed(0) : (n >= 10 ? n.toFixed(1) : n.toFixed(2))) + u[i];
}
Shell.sorts.pv = function(args, io){
	var o = { lignes: false, calme: false, taille: null, nom: null, numerique: false }, noms = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-l" || a === "--line-mode"){ o.lignes = true; continue; }
		if (a === "-q" || a === "--quiet"){ o.calme = true; continue; }
		if (a === "-n" || a === "--numeric"){ o.numerique = true; continue; }
		if (a === "-s" || a === "--size"){ o.taille = lireTaille(args[++i]); continue; }
		if (a === "-N" || a === "--name"){ o.nom = args[++i]; continue; }
		if (a === "-L" || a === "--rate-limit" || a === "-i" || a === "--interval" || a === "-w" || a === "--width" || a === "-B" || a === "--buffer-size"){ i++; continue; }
		if ((m = /^--(size|name)=(.*)$/.exec(a))){ if (m[1] === "size") o.taille = lireTaille(m[2]); else o.nom = m[2]; continue; }
		if (/^-[ptebrafWcSk0-9]+$/.test(a) || /^--(progress|timer|eta|bytes|rate|average-rate|force|wait|cursor|stop-at-size|fineta)$/.test(a)) continue;
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("pv: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'pv --help' for more information.", 1);
		noms.push(a);
	}
	var sources = sdSources(noms, io, "pv", "pv FICHIER | commande");
	var texte = sources.map(function(s){ return s.texte.replace(/\n$/, ""); }).join("\n");
	var octets = 0, connu = noms.length > 0;
	sources.forEach(function(s){ octets += s.item ? sdTaille(s.item) : sdOctetsTexte(s.texte, s.sansFin).length; });
	var total = o.lignes ? lignesDe(texte).length : octets;
	if (o.taille !== null){ connu = true; }
	var duree = Math.max(0, Math.round(octets / (180 * 1048576)));
	if (!o.calme){
		var temps = Math.floor(duree / 3600) + ":" + sdPad(Math.floor(duree % 3600 / 60), 2) + ":" + sdPad(duree % 60, 2);
		var parSeconde = duree ? octets / duree : octets * 6000;
		var debit = o.lignes ? (duree ? Math.round(total / duree) : total * 6000) + "/s" : sdTaillePv(Math.round(parSeconde)).replace("  B", "B") + "/s";
		var barre = connu ? "[" + new Array(33).join("=") + ">] 100%" : "[<=>" + new Array(31).join(" ") + "]";
		if (o.numerique) io.err("100");
		else io.err((o.nom ? o.nom + ": " : "") + (o.lignes ? sdGauche(total, 4) + " " : sdGauche(sdTaillePv(octets), 8) + " ") + temps + " [" + sdGauche(debit, 9) + "] " + barre);
	}
	sdEvenement("pv", { octets: octets, lignes: o.lignes, fichiers: noms.slice() });
	if (sources.length === 1 && sources[0].sansFin) io.stdinSansFin = true;
	return texte;
};

/* ================================================================== */
/* GNU parallel                                                         */
/* ================================================================== */

var SD_PARALLEL_MAX = 500;
function sdRemplacerParallel(modele, args, num){
	var a0 = args.join(" ");
	var sans = function(t){ return t.replace(/\.[^.\/]*$/, ""); };
	var base = function(t){ return t.split("/").pop(); };
	var dir = function(t){ return t.indexOf("/") > -1 ? t.substring(0, t.lastIndexOf("/")) : "."; };
	var trouve = false;
	var r = modele.replace(/\{(\d+)?(\.|\/\/|\/\.|\/|#|%)?\}/g, function(t, n, mod){
		trouve = true;
		if (mod === "#") return String(num);
		if (mod === "%") return "1";
		var v = n ? (args[+n - 1] || "") : a0;
		if (mod === ".") v = sans(v);
		else if (mod === "/") v = base(v);
		else if (mod === "//") v = dir(v);
		else if (mod === "/.") v = sans(base(v));
		return n || !mod || true ? sdQuoter(v) : v;
	});
	if (!trouve) r += " " + args.map(sdQuoter).join(" ");
	return r;
}
Shell.sorts.parallel = function(args, io){
	var o = { j: null, essai: false, garderOrdre: false, etiquette: false, barre: false, joblog: null, n: 1, colsep: null, verbeux: false };
	var i = 0, m;
	for (; i < args.length; i++){
		var a = args[i];
		if (a === ":::" || a === "::::" || a === ":::+") break;
		if (a === "-j" || a === "--jobs" || a === "-P" || a === "--max-procs"){ o.j = args[++i]; continue; }
		if ((m = /^(?:-j|-P|--jobs=|--max-procs=)(.+)$/.exec(a))){ o.j = m[1]; continue; }
		if (a === "--dry-run"){ o.essai = true; continue; }
		if (a === "-k" || a === "--keep-order"){ o.garderOrdre = true; continue; }
		if (a === "--tag"){ o.etiquette = true; continue; }
		if (a === "--bar" || a === "--progress" || a === "--eta"){ o.barre = true; continue; }
		if (a === "--joblog"){ o.joblog = args[++i]; continue; }
		if (a === "-n" || a === "--max-args"){ o.n = +args[++i]; continue; }
		if (a === "--colsep" || a === "-C"){ o.colsep = args[++i]; continue; }
		if (a === "-v"){ o.verbeux = true; continue; }
		if (a === "--will-cite" || a === "--citation" || a === "-q" || a === "--quote" || a === "--line-buffer" || a === "--lb" || a === "-u" || a === "--ungroup" || a === "--halt-on-error" || a === "--no-notice" || a === "-X" || a === "--group") continue;
		if (a === "--halt" || a === "--delay" || a === "--retries" || a === "--timeout" || a === "-S" || a === "--sshlogin"){ i++; continue; }
		if (/^-/.test(a)){
			if (a.charAt(1) === "-") throw new ShellError("parallel: Error: Command line option " + a + " is unknown.", 255);
			throw new ShellError("parallel: Error: Command line option -" + a.charAt(1) + " is unknown.", 255);
		}
		break;
	}
	var modele = [];
	for (; i < args.length && [":::", "::::", ":::+"].indexOf(args[i]) === -1; i++) modele.push(args[i]);
	var sources = [];
	while (i < args.length){
		var sep = args[i++], liste = [];
		for (; i < args.length && [":::", "::::", ":::+"].indexOf(args[i]) === -1; i++) liste.push(args[i]);
		if (sep === "::::"){ var l2 = []; liste.forEach(function(f){ l2 = l2.concat(lignesDe(Shell.objetLisible(f, io, "parallel").item.getText())); }); liste = l2; }
		if (sep === ":::+" && sources.length) sources[sources.length - 1].lie = liste;
		else sources.push({ l: liste });
	}
	if (!sources.length){
		if (io.stdin === null) throw new ShellError("parallel : quels arguments ? Utilisation : parallel COMMANDE ::: ARG1 ARG2..., ou commande | parallel COMMANDE" + sdAstuce(io, "Exemple : parallel zstd -q ::: heures/*.csv"), 255);
		sources.push({ l: lignesDe(io.stdin).map(function(x){ return x; }) });
	}
	// Le produit des sources (:::+ les lie au lieu de les croiser).
	var jobs = [[]];
	sources.forEach(function(s){
		var neuf = [];
		jobs.forEach(function(j){ s.l.forEach(function(v, k){ var x = j.concat(o.colsep ? v.split(o.colsep) : [v]); if (s.lie) x.push(s.lie[k] === undefined ? "" : s.lie[k]); neuf.push(x); }); });
		jobs = neuf;
	});
	if (o.n > 1 && sources.length === 1){
		var g = [];
		for (var k = 0; k < jobs.length; k += o.n) g.push([].concat.apply([], jobs.slice(k, k + o.n)));
		jobs = g;
	}
	if (jobs.length > SD_PARALLEL_MAX) throw new ShellError("parallel : plus de " + SD_PARALLEL_MAX + " tâches : le jeu s'arrête là.", 255);
	var texteModele = modele.length ? modele.join(" ") : "{}";
	if (!modele.length && !sources.length) texteModele = "{}";
	var sorties = [], echecs = 0, log = ["Seq\tHost\tStarttime\tJobRuntime\tSend\tReceive\tExitval\tSignal\tCommand"];
	var t0 = Math.floor(Date.now() / 1000);
	jobs.forEach(function(args1, num){
		var ligne = modele.length ? sdRemplacerParallel(texteModele, args1, num + 1) : args1.join(" ");
		if (o.essai){ sorties.push(ligne); return; }
		if (o.verbeux) sorties.push(ligne);
		var r = sdLancerTexte(ligne, io);
		if (r.code) echecs++;
		var s = r.sortie;
		if (o.etiquette && s !== "") s = lignesDe(s).map(function(l){ return args1.join(" ") + "\t" + l; }).join("\n");
		if (s !== "") sorties.push(s);
		log.push((num + 1) + "\t:\t" + (t0 + num) + ".000\t   0.010\t0\t" + versOctetsUtf8(r.sortie).length + "\t" + r.code + "\t0\t" + ligne);
	});
	if (o.joblog) Shell.ecrire(o.joblog, log.join("\n"), false);
	if (o.barre && !o.essai) io.err("100% " + jobs.length + ":0=0s " + (jobs.length ? jobs[jobs.length - 1].join(" ") : ""));
	if (echecs) io.code = Math.min(101, echecs);
	sdEvenement("parallel", { taches: jobs.length, j: o.j, modele: texteModele, echecs: echecs, essai: o.essai });
	return sorties.join("\n");
};

/* ================================================================== */
/* flock : un verrou, pour qu'un travail ne tourne jamais deux fois     */
/* ================================================================== */

var SD_VERROUS = [];
/* Le processus de la machine qui tient ce verrou (p.verrous, ou un fichier ouvert marqué verrou). */
function sdTenantVerrou(h, chemin){
	if (!h || typeof procsMachine !== "function") return null;
	return procsMachine(h).filter(function(p){
		return p.etat !== "Z" && ((p.verrous || []).indexOf(chemin) > -1 || (p.fichiers || []).some(function(f){ return f.verrou && f.chemin === chemin; }));
	})[0] || null;
}
Shell.sorts.flock = function(args, io){
	var o = { nonBloquant: false, attente: null, code: 1, partage: false, deverrouiller: false, bavard: false, commande: null };
	var i = 0, m;
	for (; i < args.length; i++){
		var a = args[i];
		if (a === "-n" || a === "--nb" || a === "--nonblock"){ o.nonBloquant = true; continue; }
		if (a === "-w" || a === "--wait" || a === "--timeout"){ o.attente = +args[++i]; continue; }
		if ((m = /^(?:-w|--wait=|--timeout=)(\d+(\.\d+)?)$/.exec(a))){ o.attente = +m[1]; continue; }
		if (a === "-E" || a === "--conflict-exit-code"){ o.code = +args[++i]; continue; }
		if ((m = /^(?:-E|--conflict-exit-code=)(\d+)$/.exec(a))){ o.code = +m[1]; continue; }
		if (a === "-s" || a === "--shared"){ o.partage = true; continue; }
		if (a === "-x" || a === "-e" || a === "--exclusive" || a === "-o" || a === "--close" || a === "-F" || a === "--no-fork") continue;
		if (a === "-u" || a === "--unlock"){ o.deverrouiller = true; continue; }
		if (a === "--verbose"){ o.bavard = true; continue; }
		if (/^-[nsxeuoF]+$/.test(a)){ if (/n/.test(a)) o.nonBloquant = true; if (/s/.test(a)) o.partage = true; if (/u/.test(a)) o.deverrouiller = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("flock: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'flock --help' for more information.", 64);
		break;
	}
	var reste = args.slice(i);
	if (!reste.length) throw new ShellError("flock: not enough arguments\nTry 'flock --help' for more information.", 64);
	var cible = reste[0];
	// flock 9 : un descripteur déjà ouvert par le script (exec 9>verrou) ; le jeu le tient pour acquis.
	if (/^\d+$/.test(cible) && reste.length === 1){ sdEvenement("flock", { descripteur: +cible, acquis: true }); return ""; }
	var h = sdHote();
	var r = Shell.chercher(cible, io, "flock");
	if (r.node instanceof Room){ /* un dossier se verrouille aussi */ }
	else if (r.node === null){
		if (!r.dir) throw new ShellError("flock: cannot open lock file " + cible + ": No such file or directory", 66);
		try { Shell.ecrire(cible, "", false, true); } catch (e){ if (!(e instanceof ShellError)) throw e; throw new ShellError("flock: cannot open lock file " + cible + ": Permission denied", 66); }
	}
	var chemin = h ? cheminNormal(/^\//.test(cible) ? cible : cheminDuLieuMachine(current_room) + "/" + cible) : cible;
	var tenant = sdTenantVerrou(h, chemin), interne = SD_VERROUS.indexOf(chemin) > -1;
	if (reste.length === 1 && !o.deverrouiller){
		if (tenant && !o.partage){ io.code = o.code; return ""; }
		return "";
	}
	var commande = null, texte = null;
	if (reste[1] === "-c" || reste[1] === "--command"){ texte = reste.slice(2).join(" "); if (!texte) throw new ShellError("flock: -c requires exactly one command argument\nTry 'flock --help' for more information.", 64); }
	else commande = reste.slice(1);
	if ((tenant && !o.partage) || interne){
		sdEvenement("flock", { chemin: chemin, acquis: false, nonBloquant: o.nonBloquant, tenant: tenant ? tenant.pid : null, commande: texte || (commande || []).join(" ") });
		if (o.nonBloquant || o.attente !== null){
			if (o.attente !== null && o.bavard) io.err("flock: timeout while waiting to get lock");
			io.code = o.code;
			return "";
		}
		throw new ShellError("flock: le verrou " + cible + " est tenu" + (tenant ? " par le processus " + tenant.pid + " (" + tenant.comm + ")" : " par un autre travail") + " : flock attendrait qu'il se libère, sans fin." +
			sdAstuce(io, "flock -n " + cible + " ... abandonne tout de suite, avec le code 1 : c'est ce qu'il faut dans une crontab."), 1);
	}
	if (o.bavard) io.err("flock: getting lock took 0.000004 seconds\nflock: executing " + (texte !== null ? "/bin/sh" : commande[0]));
	SD_VERROUS.push(chemin);
	var res;
	try { res = texte !== null ? sdLancerTexte(texte, io) : sdLancerArgv(commande, io, io.stdin, io.stdinSansFin); }
	finally { var k = SD_VERROUS.lastIndexOf(chemin); if (k > -1) SD_VERROUS.splice(k, 1); }
	sdEvenement("flock", { chemin: chemin, acquis: true, nonBloquant: o.nonBloquant, commande: texte || commande.join(" "), code: res.code });
	if (res.code) io.code = res.code;
	return res.sortie;
};

/* ================================================================== */
/* ionice, taskset : les ressources des processus                        */
/* ================================================================== */

var SD_CLASSES_IO = ["none", "realtime", "best-effort", "idle"];
function sdClasseIo(t){
	var n = { none: 0, realtime: 1, "best-effort": 2, idle: 3 }[String(t).toLowerCase()];
	if (n !== undefined) return n;
	if (!/^[0-3]$/.test(String(t))) throw new ShellError("ionice: unknown scheduling class: '" + t + "'", 1);
	return +t;
}
function sdTexteIo(p){
	var c = p && p.ionice ? p.ionice : { classe: 0, prio: 0 };
	if (c.classe === 3) return "idle";
	return SD_CLASSES_IO[c.classe] + ": prio " + (c.prio === undefined ? 4 : c.prio);
}
Shell.sorts.ionice = function(args, io){
	var classe = null, prio = null, pids = [], ignorer = false, i = 0;
	for (; i < args.length; i++){
		var a = args[i], m;
		if (a === "-c" || a === "--class"){ classe = sdClasseIo(args[++i]); continue; }
		if ((m = /^-c(\d)$/.exec(a))){ classe = +m[1]; continue; }
		if (a === "-n" || a === "--classdata"){ prio = +args[++i]; continue; }
		if ((m = /^-n(\d)$/.exec(a))){ prio = +m[1]; continue; }
		if (a === "-p" || a === "--pid"){ while (args[i + 1] !== undefined && /^\d+$/.test(args[i + 1])) pids.push(+args[++i]); continue; }
		if (a === "-t" || a === "--ignore"){ ignorer = true; continue; }
		if (a === "-P" || a === "-u"){ i++; continue; }
		if (a.charAt(0) === "-") throw new ShellError("ionice: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'ionice --help' for more information.", 1);
		break;
	}
	var commande = args.slice(i);
	if (prio !== null && (prio < 0 || prio > 7)) throw new ShellError("ionice: ioprio_set failed: Invalid argument", 1);
	var h = sdHote();
	if (!pids.length && !commande.length){
		if (classe === null) return "none: prio 0";
		pids = [typeof PID_BASH !== "undefined" ? PID_BASH : 1];
	}
	if (commande.length){
		if (classe === 1 && !io.sudo) throw new ShellError("ionice: ioprio_set failed: Operation not permitted", 1);
		sdEvenement("ionice", { commande: commande.slice(), classe: classe === null ? 2 : classe, prio: prio === null ? 4 : prio });
		var r = sdLancerArgv(commande, io, io.stdin, io.stdinSansFin);
		if (r.code) io.code = r.code;
		return r.sortie;
	}
	var sorties = [];
	pids.forEach(function(pid){
		var p = h && typeof procParPid === "function" ? procParPid(h, pid) : null;
		var shell = pid === (typeof PID_BASH !== "undefined" ? PID_BASH : -1);
		if (!p && !shell){ if (!ignorer){ io.err("ionice: ioprio_" + (classe === null ? "get" : "set") + " failed: No such process"); io.code = 1; } return; }
		if (classe === null){ sorties.push((pids.length > 1 ? pid + ": " : "") + (shell ? "none: prio 0" : sdTexteIo(p))); return; }
		if (shell) return;
		if ((classe === 1 || (!io.sudo && p.user !== JOUEUR))){ if (!ignorer){ io.err("ionice: ioprio_set failed: Operation not permitted"); io.code = 1; } return; }
		var avant = p.ionice ? { classe: p.ionice.classe, prio: p.ionice.prio } : { classe: 0, prio: 0 };
		p.ionice = { classe: classe, prio: classe === 3 ? 0 : (prio === null ? 4 : prio) };
		sdEvenement("ionice", { pid: p.pid, comm: p.comm, classe: classe, prio: p.ionice.prio, avant: avant });
	});
	return sorties.join("\n");
};
function sdCpus(h){ try { return h ? (etatMachine(h).cpus || 1) : 4; } catch (e){ return 4; } }
function sdListeCpus(l){
	l = l.slice().sort(function(a, b){ return a - b; });
	var r = [], i = 0;
	while (i < l.length){
		var j = i;
		while (j + 1 < l.length && l[j + 1] === l[j] + 1) j++;
		if (j - i >= 2) r.push(l[i] + "-" + l[j]); else for (var k = i; k <= j; k++) r.push(String(l[k]));
		i = j + 1;
	}
	return r.join(",");
}
function sdLireListeCpus(t){
	var r = [];
	String(t).split(",").forEach(function(p){
		var m = /^(\d+)(?:-(\d+)(?::(\d+))?)?$/.exec(p);
		if (!m) throw new ShellError("taskset: failed to parse CPU list: " + t, 1);
		var a = +m[1], b = m[2] ? +m[2] : a, pas = m[3] ? +m[3] : 1;
		for (var k = a; k <= b; k += pas) r.push(k);
	});
	return r;
}
Shell.sorts.taskset = function(args, io){
	var liste = false, pidMode = false, tous = false, i = 0;
	for (; i < args.length; i++){
		var a = args[i];
		if (a === "-c" || a === "--cpu-list"){ liste = true; continue; }
		if (a === "-p" || a === "--pid"){ pidMode = true; continue; }
		if (a === "-a" || a === "--all-tasks"){ tous = true; continue; }
		if (/^-[cpa]+$/.test(a)){ if (/c/.test(a)) liste = true; if (/p/.test(a)) pidMode = true; continue; }
		if (a.charAt(0) === "-") throw new ShellError("taskset: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'taskset --help' for more information.", 1);
		break;
	}
	var reste = args.slice(i), h = sdHote(), n = sdCpus(h);
	var tousCpus = []; for (var c = 0; c < n; c++) tousCpus.push(c);
	var masque = function(l){ return l.reduce(function(m, x){ return m + Math.pow(2, x); }, 0).toString(16); };
	var lireMasque = function(t){ var v = parseInt(String(t).replace(/^0x/i, ""), 16); if (isNaN(v)) throw new ShellError("taskset: failed to parse CPU mask: " + t, 1); var l = []; for (var k = 0; k < 64; k++) if (Math.floor(v / Math.pow(2, k)) % 2) l.push(k); return l; };
	if (pidMode){
		if (!reste.length) throw new ShellError("taskset: bad usage\nTry 'taskset --help' for more information.", 1);
		var pid = +reste[reste.length - 1], nouvelle = reste.length > 1 ? reste[0] : null;
		var shell = pid === (typeof PID_BASH !== "undefined" ? PID_BASH : -1);
		var p = h && typeof procParPid === "function" ? procParPid(h, pid) : null;
		if (!p && !shell) throw new ShellError("taskset: failed to get pid " + pid + "'s affinity: No such process", 1);
		var actuelle = p && p.affinite ? p.affinite : tousCpus;
		var dire = function(l, mot){ return "pid " + pid + "'s " + mot + " affinity " + (liste ? "list: " + sdListeCpus(l) : "mask: " + masque(l)); };
		var s = [dire(actuelle, "current")];
		if (nouvelle !== null){
			var l = liste ? sdLireListeCpus(nouvelle) : lireMasque(nouvelle);
			if (!l.length || l.some(function(x){ return x >= n; }) && !l.some(function(x){ return x < n; })) throw new ShellError(s[0] + "\ntaskset: failed to set pid " + pid + "'s affinity: Invalid argument", 1);
			l = l.filter(function(x){ return x < n; });
			if (p && !io.sudo && p.user !== JOUEUR) throw new ShellError(s[0] + "\ntaskset: failed to set pid " + pid + "'s affinity: Operation not permitted", 1);
			if (p){ p.affinite = l; sdEvenement("taskset", { pid: pid, comm: p.comm, cpus: l.slice(), avant: actuelle.slice() }); }
			s.push(dire(l, "new"));
		}
		return s.join("\n");
	}
	if (reste.length < 2) throw new ShellError("taskset: bad usage\nTry 'taskset --help' for more information.", 1);
	var l2 = liste ? sdLireListeCpus(reste[0]) : lireMasque(reste[0]);
	if (!l2.some(function(x){ return x < n; })) throw new ShellError("taskset: failed to set pid " + (typeof PID_BASH !== "undefined" ? PID_BASH : 0) + "'s affinity: Invalid argument", 1);
	sdEvenement("taskset", { commande: reste.slice(1), cpus: l2.filter(function(x){ return x < n; }) });
	var r = sdLancerArgv(reste.slice(1), io, io.stdin, io.stdinSansFin);
	if (r.code) io.code = r.code;
	return r.sortie;
};

/* ================================================================== */
/* yq (mikefarah, v4) : lire et retoucher du YAML                        */
/* ================================================================== */

function sdYamlScalaire(v, citees){
	if (v === null || v === undefined) return "null";
	if (typeof v === "boolean" || typeof v === "number") return String(v);
	var s = String(v);
	if (citees && citees.doubles[s]) return JSON.stringify(s);
	if (citees && citees.simples[s]) return "'" + s.replace(/'/g, "''") + "'";
	if (s === "" || /^[\s#&*!|>'"%@`{}\[\],?-]|:\s|\s#|:$|\s$|^(true|false|null|yes|no|on|off|~|y|n)$/i.test(s) || /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) || /\n/.test(s)) return JSON.stringify(s);
	return s;
}
function sdEcrireYaml(v, citees, ind){
	ind = ind || 0;
	var e = new Array(ind + 1).join(" ");
	if (Array.isArray(v)){
		if (!v.length) return e + "[]";
		return v.map(function(x){
			if (x !== null && typeof x === "object" && !(Array.isArray(x) && !x.length) && !(!Array.isArray(x) && !Object.keys(x).length)){
				var t = sdEcrireYaml(x, citees, ind + 2);
				return e + "- " + t.substring(ind + 2);
			}
			return e + "- " + (x !== null && typeof x === "object" ? (Array.isArray(x) ? "[]" : "{}") : sdYamlScalaire(x, citees));
		}).join("\n");
	}
	if (v !== null && typeof v === "object"){
		var cles = Object.keys(v);
		if (!cles.length) return e + "{}";
		return cles.map(function(k){
			var x = v[k], ck = /^[A-Za-z0-9_.\/-]+$/.test(k) ? k : JSON.stringify(k);
			if (x !== null && typeof x === "object" && (Array.isArray(x) ? x.length : Object.keys(x).length)) return e + ck + ":\n" + sdEcrireYaml(x, citees, ind + 2);
			if (x !== null && typeof x === "object") return e + ck + ": " + (Array.isArray(x) ? "[]" : "{}");
			if (x === null) return e + ck + ":";
			return e + ck + ": " + sdYamlScalaire(x, citees);
		}).join("\n");
	}
	return e + sdYamlScalaire(v, citees);
}
function sdJsonJoli(v, ind){
	ind = ind || 0;
	var e = new Array(ind + 3).join(" "), e0 = new Array(ind + 1).join(" ");
	if (Array.isArray(v)) return v.length ? "[\n" + v.map(function(x){ return e + sdJsonJoli(x, ind + 2); }).join(",\n") + "\n" + e0 + "]" : "[]";
	if (v !== null && typeof v === "object"){ var k = Object.keys(v); return k.length ? "{\n" + k.map(function(c){ return e + JSON.stringify(c) + ": " + sdJsonJoli(v[c], ind + 2); }).join(",\n") + "\n" + e0 + "}" : "{}"; }
	return JSON.stringify(v);
}
Shell.sorts.yq = function(args, io){
	var o = { format: "yaml", brut: true, enPlace: false, sortie: false, nul: false }, pos = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i], m;
		if (a === "-o" || a === "--output-format"){ o.format = args[++i]; continue; }
		if ((m = /^(?:-o|--output-format=)(.+)$/.exec(a))){ o.format = m[1]; continue; }
		if (a === "-j" || a === "--tojson"){ o.format = "json"; continue; }
		if (a === "-r" || a === "--unwrapScalar" || a === "-P" || a === "--prettyPrint" || a === "-C" || a === "-M" || a === "--no-colors" || a === "--colors") continue;
		if (a === "-i" || a === "--inplace"){ o.enPlace = true; continue; }
		if (a === "-e" || a === "--exit-status"){ o.sortie = true; continue; }
		if (a === "-n" || a === "--null-input"){ o.nul = true; continue; }
		if (a === "-I" || a === "--indent" || a === "-p" || a === "--input-format"){ i++; continue; }
		if (a.charAt(0) === "-" && a !== "-") throw new ShellError("Error: unknown shorthand flag: '" + a.replace(/^-+/, "").charAt(0) + "' in " + a, 1);
		pos.push(a);
	}
	if (pos[0] === "e" || pos[0] === "eval" || pos[0] === "ea" || pos[0] === "eval-all") pos.shift();
	var expr = ".", fichiers = pos;
	if (pos.length){
		var premierFichier = false;
		try { var r0 = Shell.chercher(pos[0], io, "yq"); premierFichier = r0.node !== null && !(r0.node instanceof Room) && !/^\.|\|/.test(pos[0]); } catch (e){ premierFichier = false; }
		if (!premierFichier){ expr = pos[0]; fichiers = pos.slice(1); }
	}
	if (o.format === "j") o.format = "json";
	if (o.format === "y") o.format = "yaml";
	var textes = [];
	if (o.nul) textes.push({ nom: null, texte: "" });
	else if (fichiers.length) fichiers.forEach(function(f){
		var t;
		try { t = Shell.objetLisible(f, io, "yq"); } catch (e){ if (!(e instanceof ShellError)) throw e; throw new ShellError("Error: open " + f + ": no such file or directory", 1); }
		textes.push({ nom: f, texte: t.item.getText(), item: t.item });
	});
	else {
		if (io.stdin === null) throw new ShellError("yq : quel fichier ? Utilisation : yq '.services | keys' compose.yaml" + sdAstuce(io, "yq lit le YAML comme jq lit le JSON : yq '.services.db.image' compose.yaml"), 1);
		textes.push({ nom: null, texte: io.stdin });
	}
	var sorties = [], fauxOuNul = false;
	textes.forEach(function(src){
		var valeur = src.texte.trim() === "" ? null : lireYamlPort(src.texte);
		if (valeur && valeur.erreur !== undefined && Object.keys(valeur).length === 1) throw new ShellError("Error: bad file '" + (src.nom || "-") + "': " + valeur.erreur, 1);
		var citees = { doubles: {}, simples: {} };
		(src.texte.match(/"(?:[^"\\]|\\.)*"/g) || []).forEach(function(q){ try { citees.doubles[JSON.parse(q)] = true; } catch (e){} });
		(src.texte.match(/'(?:[^']|'')*'/g) || []).forEach(function(q){ citees.simples[q.slice(1, -1).replace(/''/g, "'")] = true; });
		var fils = { stdin: JSON.stringify(valeur === undefined ? null : valeur), stdinSansFin: false, tty: false, sudo: io.sudo, code: 0, erreurs: [] };
		fils.err = function(m){ fils.erreurs.push(m); };
		fils.errFin = fils.err;
		var brut;
		try { brut = Shell.sorts.jq(["-c", expr], fils); }
		catch (e){ if (e instanceof ShellError) throw new ShellError("Error: " + e.message.replace(/^jq: (error: )?/, "").split("\n")[0], 1); throw e; }
		if (fils.erreurs.length) throw new ShellError("Error: " + fils.erreurs.join("\n").replace(/^jq: (error[^:]*: )?/, ""), 1);
		var valeurs = lignesDe(String(brut)).map(function(l){ try { return JSON.parse(l); } catch (e){ return l; } });
		if (o.enPlace){
			if (!src.item) throw new ShellError("Error: write inplace cannot be used with stdin", 1);
			var ancien = src.item.getText();
			var texte = sdEcrireYaml(valeurs[0], citees);
			src.item.setText(texte);
			GameEvents.fire({ type: "write", item: src.item, room: null, append: false, text: texte, created: false, previous: ancien });
			sdEvenement("yq", { expression: expr, fichier: src.nom, enPlace: true });
			return;
		}
		valeurs.forEach(function(v){
			if (v === null || v === false) fauxOuNul = true;
			if (o.format === "json") sorties.push(sdJsonJoli(v));
			else if (o.format === "props" && v && typeof v === "object"){
				(function aplatir(x, p){ if (x !== null && typeof x === "object"){ Object.keys(x).forEach(function(k){ aplatir(x[k], p ? p + "." + k : k); }); } else sorties.push(p + " = " + (x === null ? "" : x)); })(v, "");
			}
			else sorties.push(sdEcrireYaml(v, citees));
		});
		sdEvenement("yq", { expression: expr, fichier: src.nom, valeurs: valeurs.length });
	});
	if (o.sortie && fauxOuNul) io.code = 1;
	return sorties.join("\n");
};

/* ================================================================== */
/* Des retouches : sed comprend \xHH ; zstd -q, -o, -T                   */
/* ================================================================== */

/* \xEF\xBB\xBF : des octets UTF-8 redevenus un caractère (le BOM U+FEFF), échappé s'il est spécial pour sed. */
function sdSedOctets(script){
	return String(script).replace(/(?:\\x[0-9a-fA-F]{2})+/g, function(t){
		var o = t.match(/[0-9a-fA-F]{2}/g).map(function(h){ return parseInt(h, 16); });
		return Array.from(sdTexteDeOctets(o)).map(function(c){ return ".[]*^$\\/&".indexOf(c) > -1 ? "\\" + c : c; }).join("");
	});
}
if (Shell.sorts.sed){
	var SED_AVANT_DONNEES = Shell.sorts.sed;
	Shell.sorts.sed = function(args, io){
		if (!args.some(function(a){ return /\\x[0-9a-fA-F]{2}/.test(a); })) return SED_AVANT_DONNEES.apply(this, arguments);
		var nouveaux = [], scriptVu = false;
		for (var i = 0; i < args.length; i++){
			var a = args[i];
			if (a === "-e" || a === "--expression"){ nouveaux.push(a, sdSedOctets(args[++i])); scriptVu = true; continue; }
			if (/^--expression=/.test(a)){ nouveaux.push("--expression=" + sdSedOctets(a.substring(13))); scriptVu = true; continue; }
			if (a === "-f" || a === "--file" || a === "-l"){ nouveaux.push(a, args[++i]); continue; }
			if (a.charAt(0) === "-" && a !== "-"){ nouveaux.push(a); continue; }
			if (!scriptVu){ nouveaux.push(sdSedOctets(a)); scriptVu = true; continue; }
			nouveaux.push(a);
		}
		return SED_AVANT_DONNEES.call(this, nouveaux, io);
	};
}
if (Shell.sorts.zstd){
	var ZSTD_AVANT_DONNEES = Shell.sorts.zstd;
	var zstdDonnees = function(decomp){
		return function(args, io){
			if (!sdHote()) return ZSTD_AVANT_DONNEES.apply(this, arguments);
			var calme = false, sortie = null, filtres = [], versSortie = false, liste = false;
			for (var i = 0; i < args.length; i++){
				var a = args[i], m;
				if (a === "-q" || a === "--quiet" || a === "-qq"){ calme = true; continue; }
				if (/^-T\d*$/.test(a) || /^--threads=\d+$/.test(a) || /^--(fast|long|no-progress|progress|sparse|no-sparse|exclude-compressed)(=.*)?$/.test(a)) continue;
				if (a === "-o"){ sortie = args[++i]; continue; }
				if ((m = /^-o(.+)$/.exec(a))){ sortie = m[1]; continue; }
				if (a === "-c" || a === "--stdout") versSortie = true;
				if (a === "-l" || a === "--list" || a === "-t" || a === "--test") liste = true;
				if (/^-[a-zA-Z]{2,}$/.test(a) && /[qT]/.test(a)){ if (/q/.test(a)) calme = true; a = a.replace(/[qT]\d*/g, ""); if (a === "-") continue; }
				filtres.push(a);
			}
			if (decomp && filtres.indexOf("-d") === -1) filtres.unshift("-d");
			var noms = filtres.filter(function(x){ return x.charAt(0) !== "-"; });
			var d = filtres.some(function(x){ return x === "-d" || x === "--decompress" || x === "--uncompress" || /^-[a-z]*d/.test(x); });
			if (sortie && noms.length === 1 && !versSortie){
				var cible = sortie, src = noms[0], defaut = d ? src.replace(/\.zst$/, "") : src + ".zst";
				var rs = Shell.chercher(cible, io, "zstd");
				if (rs.node && filtres.indexOf("-f") === -1 && filtres.indexOf("--force") === -1){ io.err("zstd: " + cible + " already exists; not overwritten"); io.code = 1; return ""; }
				// Le nom par défaut est peut-être déjà pris (l'original d'un -d) : on l'écarte le temps de l'opération.
				var rd = Shell.chercher(defaut, io, "zstd"), ecarte = defaut !== cible && rd.node instanceof Item ? rd : null;
				if (ecarte) ecarte.dir.removeItem(ecarte.node);
				var res;
				try { res = ZSTD_AVANT_DONNEES.call(this, filtres.concat(d ? ["-k"] : []), io); }
				catch (e){ if (ecarte) ecarte.dir.addItem(ecarte.node); throw e; }
				if (defaut !== cible && Shell.chercher(defaut, io, "zstd").node){
					var it = Shell.chercher(defaut, io, "zstd");
					var nomCible = cible.split("/").pop();
					var dirCible = Shell.chercher(cible, io, "zstd").dir || it.dir;
					it.dir.removeItem(it.node);
					it.node.itemname = nomCible;
					if (it.node.cmd_text) it.node.cmd_text.cat = it.node.cmd_text.cat;
					dirCible.addItem(it.node);
				}
				if (ecarte) ecarte.dir.addItem(ecarte.node);
				if (!calme && res) io.err(res);
				return "";
			}
			var r = ZSTD_AVANT_DONNEES.call(this, filtres, io);
			if (versSortie || liste) return r;
			if (!calme && r) io.err(r);
			return "";
		};
	};
	Shell.sorts.zstd = zstdDonnees(false);
	if (Shell.sorts.unzstd){ var UNZSTD_AVANT_DONNEES = Shell.sorts.unzstd; Shell.sorts.unzstd = function(args, io){ if (!sdHote()) return UNZSTD_AVANT_DONNEES.apply(this, arguments); return zstdDonnees(true).call(this, args, io); }; }
}

/* ================================================================== */
/* Les pages de manuel                                                  */
/* ================================================================== */

(function(){
	function p(resume, titre, texte){ return { resume: resume, titre: titre, page: texte, horsBareme: true }; }
	MANUEL["csvlook"] = p("afficher un CSV en tableau lisible", "regarder un CSV (csvkit)",
		"Un CSV se lit mal tel quel : csvlook l'aligne en tableau, colonne par colonne.\n" +
		"Les nombres sont alignés à droite, avec leurs décimales ; les dates, les durées et les booléens reconnus.\n\n" +
		"  csvlook captures.csv              le tableau entier\n" +
		"  csvlook --max-rows 10 f.csv       les dix premières lignes\n" +
		"  head -n 20 f.csv | csvlook        le début seulement (par un tuyau)\n" +
		"  csvlook -d ';' f.csv              un séparateur point-virgule ; -t pour des tabulations\n" +
		"  csvlook -e latin1 f.csv           un fichier qui n'est pas en UTF-8\n" +
		"  csvlook -I f.csv                  sans deviner les types (tout reste du texte)");
	MANUEL["csvcut"] = p("garder ou retirer des colonnes d'un CSV", "couper des colonnes (csvkit)",
		"  csvcut -n f.csv                   les noms des colonnes, numérotés\n" +
		"  csvcut -c comptoir,poids_kg f.csv les colonnes nommées, dans cet ordre\n" +
		"  csvcut -c 1,4-6 f.csv             par numéros (1 = la première) et par plages\n" +
		"  csvcut -C pecheur f.csv           toutes, sauf celles-là\n\n" +
		"Contrairement à cut -d,, csvcut respecte les guillemets : \"omble, chevalier\" reste une seule valeur.");
	MANUEL["csvstat"] = p("les statistiques de chaque colonne d'un CSV", "STATistiques (csvkit)",
		"Pour chaque colonne : le type deviné, les valeurs nulles, les uniques, le minimum, le maximum,\n" +
		"la somme, la moyenne, la médiane, l'écart type, les valeurs les plus fréquentes.\n\n" +
		"  csvstat f.csv                     tout, colonne par colonne\n" +
		"  csvstat -c poids_kg f.csv         une seule colonne\n" +
		"  csvstat -c poids_kg --mean f.csv  une seule mesure : --mean --median --sum --min --max --stdev\n" +
		"  csvstat --count f.csv             le nombre de lignes de données\n" +
		"  csvstat -c espece --freq f.csv    les valeurs les plus fréquentes\n" +
		"  csvstat -c comptoir --unique f.csv  le nombre de valeurs différentes");
	MANUEL["csvgrep"] = p("garder les lignes d'un CSV qui correspondent", "grep pour CSV (csvkit)",
		"  csvgrep -c comptoir -m Anse f.csv       la colonne contient « Anse »\n" +
		"  csvgrep -c espece -r '^b' f.csv          une expression régulière\n" +
		"  csvgrep -c espece -i -m brochet f.csv    l'inverse : tout sauf\n" +
		"  csvgrep -c 4,5 -a -m sandre f.csv        dans l'une des colonnes (sans -a : dans toutes)\n\n" +
		"L'en-tête reste en tête : le résultat est encore un CSV.");
	MANUEL["csvsort"] = p("trier un CSV par colonnes", "trier un CSV (csvkit)",
		"  csvsort -c poids_kg f.csv           du plus petit au plus grand (les nombres comme des nombres)\n" +
		"  csvsort -c poids_kg -r f.csv        du plus grand au plus petit\n" +
		"  csvsort -c comptoir,id f.csv        par comptoir, puis par id\n\n" +
		"Contrairement à sort, l'en-tête ne part pas au milieu des données.");
	MANUEL["csvjson"] = p("convertir un CSV en JSON", "CSV vers JSON (csvkit)",
		"  csvjson f.csv                       un tableau d'objets, sur une ligne\n" +
		"  csvjson -i 2 f.csv                  joliment indenté\n" +
		"  csvjson --stream f.csv              un objet par ligne (JSON Lines)\n" +
		"  csvjson -k id f.csv                 un objet indexé par la colonne id\n\n" +
		"Les nombres deviennent des nombres, les vides null. Ensuite : | jq ...");
	MANUEL["datamash"] = p("calculer sur des colonnes : sommes, moyennes, groupes", "les MATHS des DONNÉES (GNU)",
		"datamash lit l'entrée standard, découpée en champs (une tabulation par défaut).\n\n" +
		"  datamash -t, --header-in sum 6 < f.csv              la somme de la colonne 6\n" +
		"  datamash -t, -H sum poids_kg mean poids_kg < f.csv  par nom, avec l'en-tête en entrée et en sortie\n" +
		"  datamash -t, --header-in -s -g comptoir sum 6 count 6 < f.csv\n" +
		"                                     par comptoir (-g), après un tri (-s) : sans -s, des groupes consécutifs seulement\n" +
		"  datamash -t, --header-in median 6 sstdev 6 < f.csv  médiane, écart type\n" +
		"  datamash -t, --header-in countunique 4 unique 4 < f.csv\n" +
		"  datamash -t, check < f.csv          toutes les lignes ont-elles le même nombre de champs ?\n" +
		"  datamash -t, --header-in crosstab 1,2 < f.csv     un tableau croisé : les valeurs de 1 en lignes, de 2 en colonnes (combien)\n" +
		"  datamash -t, transpose < f.csv      lignes et colonnes échangées\n\n" +
		"Opérations : sum mean median min max count first last unique countunique sstdev pstdev q1 q3 mode range.");
	MANUEL["mlr"] = p("Miller : trier, filtrer, convertir des CSV et du JSON", "Miller, l'outil des enregistrements",
		"Miller lit des enregistrements (CSV, TSV, JSON...), leur applique des verbes chaînés par then, et les écrit.\n\n" +
		"  mlr --icsv --opprint cat f.csv                        un tableau aligné (--c2p en abrégé)\n" +
		"  mlr --icsv --ojson head -n 3 f.csv                    en JSON (--c2j)\n" +
		"  mlr --c2p filter '$poids_kg > 20' f.csv               les lignes qui passent le test\n" +
		"  mlr --c2p sort -nr poids_kg then head -n 5 f.csv      tri numérique décroissant, puis les cinq premières\n" +
		"  mlr --c2p stats1 -a sum,mean,count -f poids_kg -g comptoir f.csv\n" +
		"  mlr --c2p count-distinct -f comptoir f.csv\n" +
		"  mlr --icsv --ocsv cut -x -f pecheur f.csv > public.csv\n" +
		"  mlr --c2p put '$total = $poids_kg * $prix_kg' f.csv\n" +
		"  mlr --icsv --opprint join -j comptoir -f comptoirs.csv f.csv\n\n" +
		"Verbes : cat head tail sort filter put cut uniq count count-distinct stats1 rename reorder top fill-empty join.\n" +
		"Formats : --icsv --itsv --ijson ; --ocsv --otsv --ojson --ojsonl --opprint --oxtab --omd.");
	MANUEL["od"] = p("voir chaque octet d'un fichier", "Octal Dump",
		"Ce que cat ne montre pas, od le montre : les fins de ligne Windows (\\r), les tabulations,\n" +
		"les octets d'un caractère accentué, la marque d'ordre des octets (BOM) en tête d'un fichier.\n\n" +
		"  od -c f.csv | head            chaque octet : une lettre, \\n, \\r, \\t, ou son numéro en octal\n" +
		"  od -An -c f.csv               sans la colonne des adresses\n" +
		"  od -t x1 f.csv | head -2      en hexadécimal, octet par octet (ef bb bf : un BOM)\n" +
		"  od -N 16 -c f.csv             seulement les 16 premiers octets");
	MANUEL["truncate"] = p("changer la taille d'un fichier (le vider, sans le supprimer)", "tronquer",
		"Vider un fichier encore ouvert par un programme : rm le cacherait sans libérer la place ;\n" +
		"truncate le remet à zéro, et le programme continue d'écrire.\n\n" +
		"  truncate -s 0 journal.log            vider\n" +
		"  truncate -s 100M f                   fixer la taille (K, M, G)\n" +
		"  truncate -s +10K f / -s -10K f       grandir, rétrécir\n" +
		"  sudo truncate -s 0 /proc/PID/fd/N    un fichier supprimé mais tenu ouvert (lsof +L1 le montre)");
	MANUEL["mktemp"] = p("créer un fichier ou un dossier temporaire au nom unique", "MaKe TEMPorary",
		"Dans un script, un nom fixe comme /tmp/sortie.csv se fait écraser si deux copies tournent ensemble.\n" +
		"mktemp crée un nom unique, vide, que toi seul peux lire.\n\n" +
		"  t=$(mktemp)                          /tmp/tmp.XXXXXXXXXX\n" +
		"  d=$(mktemp -d)                       un dossier\n" +
		"  t=$(mktemp /tmp/ecluse.XXXXXX.csv)   un modèle à soi\n" +
		"  trap 'rm -f \"$t\"' EXIT             et le ménage, quoi qu'il arrive");
	MANUEL["csplit"] = p("découper un fichier selon son contenu", "Context SPLIT",
		"  csplit f.txt 100                    avant la ligne 100\n" +
		"  csplit f.txt '/^## /' '{*}'         à chaque ligne qui commence par ## \n" +
		"  csplit -f part -b '%02d.txt' f.txt '/^SECTION/' '{*}'\n" +
		"  csplit -z ...                        sans les morceaux vides\n\n" +
		"Les morceaux s'appellent xx00, xx01... ; csplit affiche la taille de chacun.");
	MANUEL["expand"] = p("remplacer les tabulations par des espaces", "étendre les tabulations",
		"  expand f.txt                  arrêts tous les 8 caractères\n" +
		"  expand -t 4 f.txt             tous les 4\n" +
		"  expand -i f.txt               seulement en début de ligne");
	MANUEL["unexpand"] = p("remplacer des espaces par des tabulations", "l'inverse d'expand",
		"  unexpand f.txt                les espaces de début de ligne\n" +
		"  unexpand -a f.txt             partout\n" +
		"  unexpand -t 4 f.txt           arrêts tous les 4");
	MANUEL["shred"] = p("écraser un fichier avant de l'effacer", "déchiqueter",
		"rm retire le nom, pas les octets. Pour une donnée personnelle qu'il faut détruire,\n" +
		"shred écrase le contenu plusieurs fois, puis l'efface (-u).\n\n" +
		"  shred -u export-brut.csv             écraser, puis supprimer\n" +
		"  shred -v -z -n 1 -u f                une passe aléatoire, une de zéros, en racontant\n\n" +
		"Sur un disque SSD ou un système de fichiers journalisé, ce n'est pas une garantie absolue :\n" +
		"la vraie protection, c'est de chiffrer, et de ne pas copier la donnée personnelle partout.");
	MANUEL["cksum"] = p("une somme de contrôle (CRC) et la taille", "CheckSUM",
		"  cksum f.csv                   CRC, taille en octets, nom\n" +
		"Rapide pour voir si deux copies diffèrent ; pour la sécurité, sha256sum.");
	MANUEL["sha512sum"] = p("l'empreinte SHA-512 d'un fichier", "SHA-512",
		"  sha512sum f.csv               l'empreinte\n" +
		"  sha512sum f.csv > f.sha512 ; sha512sum -c f.sha512    vérifier plus tard");
	MANUEL["b2sum"] = p("l'empreinte BLAKE2b d'un fichier", "BLAKE2 SUM",
		"  b2sum f.csv                   l'empreinte (512 bits)\n" +
		"  b2sum -l 256 f.csv            plus courte\n" +
		"  b2sum -c sommes.b2            vérifier");
	MANUEL["pv"] = p("voir avancer un gros transfert dans un tuyau", "Pipe Viewer",
		"pv laisse passer ce qui le traverse, et montre la quantité, le débit, le temps et la progression.\n\n" +
		"  pv gros.csv | gzip > gros.csv.gz      la barre de progression pendant la compression\n" +
		"  pv -l f.csv | wc -l                   en lignes\n" +
		"  cat f | pv -s 2G | ...                avec la taille, pour un pourcentage");
	MANUEL["parallel"] = p("lancer une commande sur beaucoup de fichiers, en parallèle", "GNU parallel",
		"  parallel zstd -q ::: heures/*.csv           une tâche par fichier, sur tous les cœurs\n" +
		"  parallel -j 4 gzip {} ::: *.log             quatre à la fois ; {} est l'argument\n" +
		"  ls *.csv | parallel wc -l                   les arguments par un tuyau\n" +
		"  parallel --dry-run zstd {} ::: *.csv        montrer les commandes, sans les lancer\n" +
		"  parallel echo {.} {/} ::: dossier/f.csv     {.} sans extension, {/} sans dossier\n" +
		"  parallel --joblog taches.log ...            le journal de chaque tâche (son code de sortie)\n\n" +
		"Comme xargs -P, en plus lisible.");
	MANUEL["flock"] = p("un verrou, pour qu'un travail ne tourne jamais deux fois", "File LOCK",
		"Une tâche de nuit qui dure plus longtemps que prévu, et cron qui la relance : deux copies écrivent\n" +
		"le même fichier. flock pose un verrou : la seconde copie attend, ou abandonne (-n).\n\n" +
		"  flock -n /tmp/ecluse.lock ./nuit.sh               si le verrou est pris, abandonner (code 1)\n" +
		"  flock -n /tmp/ecluse.lock -c 'cmd1 && cmd2'        une ligne de shell\n" +
		"  flock -w 60 /tmp/x.lock ./tache.sh                 attendre au plus 60 secondes\n" +
		"  30 2 * * * flock -n /tmp/ecluse.lock ~/ecluse/nuit.sh   dans une crontab");
	MANUEL["time"] = p("mesurer le temps d'une commande", "chronométrer",
		"  time ./agreger.sh             real (le temps écoulé), user et sys (le temps de calcul)\n" +
		"  time -p sort gros.csv > /dev/null");
	MANUEL["ionice"] = p("la priorité d'un processus sur le disque", "IO NICE",
		"nice partage le processeur ; ionice partage le disque. Une grosse agrégation en classe idle\n" +
		"ne lit le disque que quand personne d'autre n'en a besoin.\n\n" +
		"  ionice -p PID                 sa classe : none, best-effort: prio N, idle\n" +
		"  ionice -c 3 -p PID            idle (3) : passer après tout le monde\n" +
		"  ionice -c 2 -n 7 -p PID       best-effort (2), la plus basse des priorités (7)\n" +
		"  ionice -c 3 ./agreger.sh      lancer directement en idle\n\n" +
		"La classe realtime (1) est réservée à root.");
	MANUEL["taskset"] = p("sur quels cœurs un processus a le droit de tourner", "l'affinité processeur",
		"  taskset -cp PID               ses cœurs permis (0,1 : les deux premiers)\n" +
		"  taskset -cp 1 PID             le cantonner au cœur 1\n" +
		"  taskset -c 0 ./agreger.sh     lancer sur le cœur 0 seulement\n" +
		"  nproc                         le nombre de cœurs de la machine");
	MANUEL["yq"] = p("lire et retoucher un fichier YAML (compose.yaml)", "jq pour le YAML",
		"  yq '.services | keys' compose.yaml           les noms des services\n" +
		"  yq '.services.db.image' compose.yaml         une valeur\n" +
		"  yq -o json '.services.db' compose.yaml       en JSON\n" +
		"  yq -i '.services.etl.mem_limit = \"512m\"' compose.yaml   changer sur place\n\n" +
		"Les filtres sont ceux de jq. Avec -i, relis le fichier après : selon l'outil, des commentaires peuvent disparaître.\n\n" +
		"Attention, deux outils différents s'appellent yq. Ces exemples sont ceux du yq écrit en Go (un seul binaire à télécharger). " +
		"Le paquet yq de Debian et d'Ubuntu est un autre outil, écrit en Python : il prend les mêmes filtres que jq, mais ne connaît pas -o, et sort du JSON sauf si on lui donne -y.");
	if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_DONNEES.indexOf(c) === -1; });
})();
