/**
 * Le paquet de publication : un seul fichier JavaScript minifié au lieu de 85, une page jouer.html qui le charge
 * (avec son empreinte d'intégrité), et un service worker qui garde le jeu en cache pour les visites suivantes et le hors-ligne.
 *
 *   node outils/paquet.js            (lancé aussi par outils/version_cache.py avant chaque publication)
 *
 * Web/index.html reste la page de développement (les fichiers un par un : c'est elle que lisent les tests).
 * Web/jouer.html est la page publiée ; la page d'accueil du dépôt y renvoie.
 * La minification utilise terser s'il est installé (npm install terser, ou NODE_PATH vers un terser global) ;
 * sinon les fichiers sont seulement mis bout à bout (le jeu marche pareil, un peu plus lourd).
 */
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");

var RACINE = path.join(__dirname, "..");
var WEB = path.join(RACINE, "Web");
var NOM_PAQUET = "terminus.paquet.js";

function lire(f){ return fs.readFileSync(f, "utf8"); }
function ecrire(f, t){ fs.writeFileSync(f, t); }

var index = lire(path.join(WEB, "index.html"));
var motif = /<script src="\.\/static\/javascript\/([^"?]+\.js)(\?v=(\d+))?"><\/script>/g;
var scripts = [], m, version = null;
while ((m = motif.exec(index))){ scripts.push(m[1]); if (m[3]) version = m[3]; }
if (!scripts.length) throw new Error("Web/index.html : aucun script trouvé");
version = version || String(Date.now());
scripts.forEach(function(f){ if (!fs.existsSync(path.join(WEB, "static", "javascript", f))) throw new Error("script absent : " + f); });

// Les fichiers bout à bout, chacun séparé par « ; » (un fichier qui finit sans point-virgule ne se colle pas au suivant).
var source = scripts.map(function(f){ return "/* " + f + " */\n" + lire(path.join(WEB, "static", "javascript", f)) + "\n;\n"; }).join("");

function terser(){
	try { return require("terser"); } catch (e){}
	try { return require(path.join(process.env.TERSER_DIR || "", "node_modules", "terser")); } catch (e){}
	return null;
}

function finir(code, minifie){
	var empreinte = "sha384-" + crypto.createHash("sha384").update(code, "utf8").digest("base64");
	ecrire(path.join(WEB, "static", "javascript", NOM_PAQUET), code);
	// jouer.html : la même page que index.html, mais un seul script, avec son intégrité.
	var lignes = index.split("\n"), sortie = [], pose = false;
	lignes.forEach(function(l){
		if (/<script src="\.\/static\/javascript\/[^"]+"><\/script>/.test(l)){
			if (!pose){
				sortie.push(l.replace(/<script[^>]*><\/script>/, '<script src="./static/javascript/' + NOM_PAQUET + '?v=' + version + '" integrity="' + empreinte + '"></script>'));
				pose = true;
			}
			return;
		}
		sortie.push(l);
	});
	var jouer = sortie.join("\n").replace(/(Content-Security-Policy" content="[^"]*)"/, function(t, csp){
		return (/worker-src/.test(csp) ? csp : csp.replace("script-src 'self';", "script-src 'self'; worker-src 'self'; manifest-src 'none';")) + '"';
	});
	jouer = jouer.replace("<head>", "<head>\n    <!-- Page publiée, générée par outils/paquet.js à partir de index.html : ne pas l'éditer à la main. -->");
	ecrire(path.join(WEB, "jouer.html"), jouer);
	// Le service worker : le cœur du jeu (page, style, paquet) gardé en cache ; les images mises en cache au fil du jeu.
	var css = (index.match(/\.\/static\/css\/[^"]+/g) || []).map(function(x){ return x.replace(/^\.\//, ""); });
	var coeur = ["jouer.html", "static/javascript/" + NOM_PAQUET + "?v=" + version].concat(css);
	ecrire(path.join(WEB, "sw.js"), lire(path.join(__dirname, "sw-modele.js")).replace("__VERSION__", version).replace("__COEUR__", JSON.stringify(coeur)));
	var avant = Buffer.byteLength(source, "utf8"), apres = Buffer.byteLength(code, "utf8");
	console.log("paquet " + NOM_PAQUET + " : " + scripts.length + " fichiers, " + Math.round(avant / 1024) + " Ko -> " + Math.round(apres / 1024) + " Ko" +
		(minifie ? " (minifié)" : " (sans minification : terser absent)") + ", version " + version + ", " + empreinte.substring(0, 20) + "...");
}

var t = terser();
if (!t) finir(source, false);
else {
	// Sans renommer les noms globaux (les fichiers se parlent par eux), ni les propriétés.
	t.minify(source, { ecma: 5, compress: { passes: 1, keep_fargs: true, keep_fnames: true }, mangle: { keep_fnames: true }, format: { comments: false, ascii_only: false } })
		.then(function(r){ finir(r.code, true); })
		.catch(function(e){ console.error("terser : " + (e && e.message || e) + " ; paquet sans minification."); finir(source, false); });
}
