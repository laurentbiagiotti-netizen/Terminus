/**
 * Les sorts arcanes du chapitre 4 (SortsArcanes.js) : jq, xargs, find, paste, join, comm, column, tac, diff, patch,
 * rsync, at, crontab -e, les timers de systemd, date -d.
 *
 * 1. Les mêmes réponses que les vrais outils, sur les mêmes objets. Chaque attendu a été relevé sous Linux avec
 *    jq 1.7, GNU findutils, coreutils 9.4, diffutils 3.10, patch 2.7.6, rsync 3.2.7, util-linux 2.39 (LC_ALL=C.UTF-8).
 *    Pour chaque cas : la sortie normale (CMD 2>/dev/null | cat) et, s'il y en a une, la sortie d'erreur (CMD 2>&1 >/dev/null | cat).
 * 2. Ce qui est propre au jeu : codes de retour, événements pour les quêtes, sudo, l'âge des objets créés pendant la
 *    partie, at et sa sauvegarde, crontab -e, les timers déclarés par un chapitre, le manuel.
 *
 * Lancer : node tests/arcanes.js           (-v pour tout voir)
 *          node tests/arcanes.js --gnu     revérifie aussi chaque attendu avec les vrais outils, s'ils sont installés
 */
var monde = require("./monde.js");
var bavard = process.argv.indexOf("-v") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(obtenu, attendu, m){ verifier(obtenu === attendu, m + "\n--- attendu :\n" + attendu + "\n--- obtenu :\n" + obtenu); }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + t); }

/* Les objets et les lieux posés dans la Maison (sur le disque, chaque objet finit par un retour à la ligne ; « / » final : un lieu). */
function suite(de, a){ var t = ""; for (var i = de; i <= a; i++) t += i + "\n"; return t; }
var FICHIERS = {
	"eleves.json":
		"[\n" +
		"  {\"nom\": \"Ada\", \"age\": 19, \"classe\": \"B1\", \"notes\": [15, 18, 12], \"actif\": true, \"adresse\": {\"ville\": \"Lille\", \"cp\": \"59000\"}},\n" +
		"  {\"nom\": \"Alan\", \"age\": 22, \"classe\": \"B3\", \"notes\": [9, 14], \"actif\": false, \"adresse\": {\"ville\": \"Marseille\", \"cp\": \"13001\"}},\n" +
		"  {\"nom\": \"Grace\", \"age\": 21, \"classe\": \"B3\", \"notes\": [], \"actif\": true, \"adresse\": null},\n" +
		"  {\"nom\": \"Linus\", \"age\": 19, \"classe\": \"B1\", \"notes\": [11, 10, 13, 16], \"actif\": true, \"adresse\": {\"ville\": \"Puteaux\", \"cp\": \"92800\"}, \"mail\": \"linus@cybersup.ai\"}\n" +
		"]\n",
	"config.json":
		"{\"serveur\": {\"nom\": \"web\", \"ports\": [80, 443], \"tls\": {\"actif\": true, \"cert\": \"/etc/ssl/web.pem\"}},\n" +
		" \"utilisateurs\": {\"ada\": {\"uid\": 1000, \"groupes\": [\"sudo\", \"dev\"]}, \"bob\": {\"uid\": 1001, \"groupes\": [\"dev\"]}},\n" +
		" \"version\": \"2.4.1\", \"debug\": false, \"timeout\": 2.5, \"vide\": {}, \"rien\": null, \"clé spéciale\": \"é\"}\n",
	"journal.ndjson":
		"{\"t\": \"08:12\", \"niveau\": \"warn\", \"ip\": \"10.0.0.5\", \"msg\": \"login raté\"}\n" +
		"{\"t\": \"08:13\", \"niveau\": \"info\", \"ip\": \"10.0.0.7\", \"msg\": \"login\"}\n" +
		"{\"t\": \"09:01\", \"niveau\": \"warn\", \"ip\": \"10.0.0.5\", \"msg\": \"login raté\"}\n" +
		"{\"t\": \"09:15\", \"niveau\": \"error\", \"ip\": \"10.0.0.9\", \"msg\": \"disque plein\"}\n",
	"casse.json":
		"{\"a\": 1}\n" +
		"{\"b\": [1, 2,\n" +
		"  3}\n",
	"melange.json":
		"[1, \"deux\", {\"trois\": 3}, [4], null, true, 2.5]\n",
	"nombres.json":
		"[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]\n",
	"noms.txt":
		"Ada\n" +
		"Alan\n" +
		"Grace\n" +
		"Linus\n",
	"ages.txt":
		"19\n" +
		"22\n" +
		"21\n",
	"comptes-hier.txt":
		"ada\n" +
		"bob\n" +
		"carol\n" +
		"dave\n",
	"comptes.txt":
		"ada\n" +
		"carol\n" +
		"eve\n" +
		"mallory\n",
	"id-noms.txt":
		"1 Ada\n" +
		"2 Alan\n" +
		"3 Grace\n" +
		"5 Linus\n",
	"id-notes.txt":
		"1 15\n" +
		"2 9\n" +
		"2 14\n" +
		"4 11\n" +
		"5 18\n",
	"uid.txt":
		"ada:1000:dev\n" +
		"bob:1001:dev\n" +
		"eve:1003:invite\n",
	"shells.txt":
		"ada:/bin/bash\n" +
		"bob:/bin/zsh\n" +
		"carol:/bin/sh\n",
	"tableau.txt":
		"NOM PORT ETAT\n" +
		"sshd 22 ouvert\n" +
		"nginx 443 ouvert\n" +
		"telnet 23 ferme\n",
	"ventes.csv":
		"produit,quantite,prix\n" +
		"sweat,3,35\n" +
		"tasse,10,8\n" +
		"casquette,5,15\n",
	"liste.txt":
		"un\n" +
		"deux\n" +
		"trois\n" +
		"quatre\n" +
		"cinq\n",
	"cibles.txt":
		"a.tmp\n" +
		"b.tmp\n" +
		"c.tmp\n",
	"v1.txt":
		"# Configuration du pare-feu\n" +
		"politique = refuser\n" +
		"port 22 = ouvert\n" +
		"port 23 = ouvert\n" +
		"port 80 = ouvert\n" +
		"port 443 = ouvert\n" +
		"journal = oui\n" +
		"niveau = info\n" +
		"rotation = 7\n" +
		"alertes = mail\n" +
		"admin = laurent\n" +
		"# fin\n",
	"v2.txt":
		"# Configuration du pare-feu\n" +
		"politique = refuser\n" +
		"port 22 = ouvert\n" +
		"port 80 = ouvert\n" +
		"port 443 = ouvert\n" +
		"port 8443 = ouvert\n" +
		"journal = oui\n" +
		"niveau = info\n" +
		"rotation = 7\n" +
		"alertes = mail\n" +
		"admin = myriam\n" +
		"# fin\n",
	"v3.txt":
		"# Configuration du pare-feu (copie de Myriam)\n" +
		"politique = refuser\n" +
		"port 22 = ouvert\n" +
		"port 23 = ouvert\n" +
		"port 80 = ouvert\n" +
		"port 443 = ouvert\n" +
		"journal = oui\n" +
		"niveau = debug\n" +
		"rotation = 7\n" +
		"alertes = mail\n" +
		"admin = laurent\n" +
		"# fin\n",
	"arbre/journaux/": null,
	"arbre/journaux/acces.log": "GET /index.html 200\nGET /admin 403\nPOST /login 302\n",
	"arbre/journaux/erreurs.log": "",
	"arbre/journaux/vieux/": null,
	"arbre/journaux/vieux/2025.log": "ancien journal\n",
	"arbre/tmp/": null,
	"arbre/tmp/a.tmp": "brouillon a\n",
	"arbre/tmp/b.tmp": "brouillon b\n",
	"arbre/vide/": null,
	"arbre/notes.txt": "une note\n",
	"arbre/gros.txt": new Array(301).join("0123456\n"),
	"arbre/Script.sh": "echo bonjour\n",
	"src/": null,
	"src/index.html": "<h1>Accueil</h1>\n",
	"src/style.css": "body { color: black; }\n",
	"src/brouillon.tmp": "a jeter\n",
	"src/img/": null,
	"src/img/logo.svg": "<svg/>\n",
	"dst/": null,
	"dst/index.html": "<h1>Ancien accueil</h1>\n",
	"dst/perime.html": "vieille page\n",
	"s30.txt": suite(1, 30),
	"s30b.txt": suite(1, 4) + "cinq\ncinq2\ncinq3\n" + suite(6, 11) + suite(13, 19) + "vingt\n" + suite(21, 27) + "28b\n" + suite(29, 30),
	"s32.txt": "x\ny\n" + suite(1, 30),
	"s32v.txt": "x\ny\n" + suite(1, 19) + "VINGT\n" + suite(21, 30),
	"s29.txt": suite(1, 3) + suite(5, 30),
	"s30z.txt": suite(1, 25) + "Z\n" + suite(27, 30),
	"s30f.txt": "1\nDEUX\n" + suite(3, 30)
};

/* Commande, sortie normale des vrais outils, et sortie d'erreur s'il y en a une (sans les derniers retours à la ligne). */
var CAS = [
	["jq . eleves.json","[\n  {\n    \"nom\": \"Ada\",\n    \"age\": 19,\n    \"classe\": \"B1\",\n    \"notes\": [\n      15,\n      18,\n      12\n    ],\n    \"actif\": true,\n    \"adresse\": {\n      \"ville\": \"Lille\",\n      \"cp\": \"59000\"\n    }\n  },\n  {\n    \"nom\": \"Alan\",\n    \"age\": 22,\n    \"classe\": \"B3\",\n    \"notes\": [\n      9,\n      14\n    ],\n    \"actif\": false,\n    \"adresse\": {\n      \"ville\": \"Marseille\",\n      \"cp\": \"13001\"\n    }\n  },\n  {\n    \"nom\": \"Grace\",\n    \"age\": 21,\n    \"classe\": \"B3\",\n    \"notes\": [],\n    \"actif\": true,\n    \"adresse\": null\n  },\n  {\n    \"nom\": \"Linus\",\n    \"age\": 19,\n    \"classe\": \"B1\",\n    \"notes\": [\n      11,\n      10,\n      13,\n      16\n    ],\n    \"actif\": true,\n    \"adresse\": {\n      \"ville\": \"Puteaux\",\n      \"cp\": \"92800\"\n    },\n    \"mail\": \"linus@cybersup.ai\"\n  }\n]"],
	["jq -c . eleves.json","[{\"nom\":\"Ada\",\"age\":19,\"classe\":\"B1\",\"notes\":[15,18,12],\"actif\":true,\"adresse\":{\"ville\":\"Lille\",\"cp\":\"59000\"}},{\"nom\":\"Alan\",\"age\":22,\"classe\":\"B3\",\"notes\":[9,14],\"actif\":false,\"adresse\":{\"ville\":\"Marseille\",\"cp\":\"13001\"}},{\"nom\":\"Grace\",\"age\":21,\"classe\":\"B3\",\"notes\":[],\"actif\":true,\"adresse\":null},{\"nom\":\"Linus\",\"age\":19,\"classe\":\"B1\",\"notes\":[11,10,13,16],\"actif\":true,\"adresse\":{\"ville\":\"Puteaux\",\"cp\":\"92800\"},\"mail\":\"linus@cybersup.ai\"}]"],
	["jq '.[0].nom' eleves.json","\"Ada\""],
	["jq -r '.[0].nom' eleves.json","Ada"],
	["jq '.[-1].nom' eleves.json","\"Linus\""],
	["jq '.[1:3] | map(.nom)' eleves.json","[\n  \"Alan\",\n  \"Grace\"\n]"],
	["jq -c '.[:2] | map(.age)' eleves.json","[19,22]"],
	["jq -c '.[-2:] | map(.age)' eleves.json","[21,19]"],
	["jq '.[] | .nom' eleves.json","\"Ada\"\n\"Alan\"\n\"Grace\"\n\"Linus\""],
	["jq -r '.[].nom' eleves.json","Ada\nAlan\nGrace\nLinus"],
	["jq '.[0].adresse.ville' eleves.json","\"Lille\""],
	["jq '.[2].adresse.ville' eleves.json","null"],
	["jq '.[0].\"nom\"' eleves.json","\"Ada\""],
	["jq '.\"clé spéciale\"' config.json","\"é\""],
	["jq '.serveur.ports[]' config.json","80\n443"],
	["jq '.serveur.ports[1]' config.json","443"],
	["jq '.serveur.tls' config.json","{\n  \"actif\": true,\n  \"cert\": \"/etc/ssl/web.pem\"\n}"],
	["jq -c '.serveur | {nom, ports}' config.json","{\"nom\":\"web\",\"ports\":[80,443]}"],
	["jq -c '.[] | {nom: .nom, ville: .adresse.ville}' eleves.json","{\"nom\":\"Ada\",\"ville\":\"Lille\"}\n{\"nom\":\"Alan\",\"ville\":\"Marseille\"}\n{\"nom\":\"Grace\",\"ville\":null}\n{\"nom\":\"Linus\",\"ville\":\"Puteaux\"}"],
	["jq -c '.[] | {(.nom): .age}' eleves.json","{\"Ada\":19}\n{\"Alan\":22}\n{\"Grace\":21}\n{\"Linus\":19}"],
	["jq -c '[.[] | .age]' eleves.json","[19,22,21,19]"],
	["jq '[.[] | .age] | add' eleves.json","81"],
	["jq '[.[] | .age] | add / length' eleves.json","20.25"],
	["jq 'map(.age) | max' eleves.json","22"],
	["jq 'map(.age) | min' eleves.json","19"],
	["jq -c 'map(.age) | sort' eleves.json","[19,19,21,22]"],
	["jq -c 'map(.age) | unique' eleves.json","[19,21,22]"],
	["jq -r '.[] | select(.age > 20) | .nom' eleves.json","Alan\nGrace"],
	["jq -r '.[] | select(.actif) | .nom' eleves.json","Ada\nGrace\nLinus"],
	["jq -r '.[] | select(.actif | not) | .nom' eleves.json","Alan"],
	["jq -r '.[] | select(.classe == \"B1\" and .age < 20) | .nom' eleves.json","Ada\nLinus"],
	["jq -r '.[] | select(.classe == \"B3\" or .age == 19) | .nom' eleves.json","Ada\nAlan\nGrace\nLinus"],
	["jq -c 'map(select(.notes | length > 2) | .nom)' eleves.json","[\"Ada\",\"Linus\"]"],
	["jq -c 'sort_by(.age) | map(.nom)' eleves.json","[\"Ada\",\"Linus\",\"Grace\",\"Alan\"]"],
	["jq -c 'sort_by(.age, .nom) | map(.nom)' eleves.json","[\"Ada\",\"Linus\",\"Grace\",\"Alan\"]"],
	["jq -c 'group_by(.classe) | map({classe: .[0].classe, n: length})' eleves.json","[{\"classe\":\"B1\",\"n\":2},{\"classe\":\"B3\",\"n\":2}]"],
	["jq -c 'unique_by(.classe) | map(.nom)' eleves.json","[\"Ada\",\"Alan\"]"],
	["jq -c 'min_by(.age) | .nom' eleves.json","\"Ada\""],
	["jq -c 'max_by(.age) | .nom' eleves.json","\"Alan\""],
	["jq -c 'map(.nom) | reverse' eleves.json","[\"Linus\",\"Grace\",\"Alan\",\"Ada\"]"],
	["jq '.[0] | keys' eleves.json","[\n  \"actif\",\n  \"adresse\",\n  \"age\",\n  \"classe\",\n  \"nom\",\n  \"notes\"\n]"],
	["jq -c '.[0] | keys_unsorted' eleves.json","[\"nom\",\"age\",\"classe\",\"notes\",\"actif\",\"adresse\"]"],
	["jq -c 'keys' config.json","[\"clé spéciale\",\"debug\",\"rien\",\"serveur\",\"timeout\",\"utilisateurs\",\"version\",\"vide\"]"],
	["jq -c '.serveur | to_entries' config.json","[{\"key\":\"nom\",\"value\":\"web\"},{\"key\":\"ports\",\"value\":[80,443]},{\"key\":\"tls\",\"value\":{\"actif\":true,\"cert\":\"/etc/ssl/web.pem\"}}]"],
	["jq -c '.utilisateurs | to_entries | map({nom: .key, uid: .value.uid})' config.json","[{\"nom\":\"ada\",\"uid\":1000},{\"nom\":\"bob\",\"uid\":1001}]"],
	["jq -c '.utilisateurs | with_entries(.value = .value.uid)' config.json","{\"ada\":1000,\"bob\":1001}"],
	["jq -c '[{\"key\": \"a\", \"value\": 1}, {\"k\": \"b\", \"v\": 2}, {\"name\": \"c\", \"value\": 3}] | from_entries' eleves.json","","jq: error (at eleves.json:6): Cannot use null (null) as object key"],
	["jq '.[0] | has(\"mail\")' eleves.json","false"],
	["jq '.[3] | has(\"mail\")' eleves.json","true"],
	["jq -c 'map(has(\"mail\"))' eleves.json","[false,false,false,true]"],
	["jq -c '\"nom\" as $k | map(.[$k])' eleves.json","[\"Ada\",\"Alan\",\"Grace\",\"Linus\"]"],
	["jq -c '.[0] | to_entries[] | select(.value | type == \"number\")' eleves.json","{\"key\":\"age\",\"value\":19}"],
	["jq -c '.[0] | map_values(type)' eleves.json","{\"nom\":\"string\",\"age\":\"number\",\"classe\":\"string\",\"notes\":\"array\",\"actif\":\"boolean\",\"adresse\":\"object\"}"],
	["jq -c '.utilisateurs | map_values(.uid + 1)' config.json","{\"ada\":1001,\"bob\":1002}"],
	["jq -c '[.[] | .notes | length]' eleves.json","[3,2,0,4]"],
	["jq -c '[.[] | .nom | length]' eleves.json","[3,4,5,5]"],
	["jq '.[0].adresse | length' eleves.json","2"],
	["jq '\"élève\" | length' eleves.json","5"],
	["jq -c 'map(.notes | add)' eleves.json","[45,23,null,50]"],
	["jq -c 'map(.notes | add // 0)' eleves.json","[45,23,0,50]"],
	["jq -c 'map(.mail // \"aucun\")' eleves.json","[\"aucun\",\"aucun\",\"aucun\",\"linus@cybersup.ai\"]"],
	["jq -c 'map(.adresse.ville // \"?\")' eleves.json","[\"Lille\",\"Marseille\",\"?\",\"Puteaux\"]"],
	["jq -c '[.[] | .notes | any(. > 15)]' eleves.json","[true,false,false,true]"],
	["jq -c '[.[] | .notes | all(. >= 10)]' eleves.json","[true,false,true,true]"],
	["jq -c 'map(.actif) | any, all' eleves.json","true\nfalse"],
	["jq -c '[range(5)]' eleves.json","[0,1,2,3,4]"],
	["jq -c '[range(2; 10; 3)]' eleves.json","[2,5,8]"],
	["jq -c '[range(5; 0; -2)]' eleves.json","[5,3,1]"],
	["jq -c '[.[] | .age | . * 2 - 1]' eleves.json","[37,43,41,37]"],
	["jq -c '[10 % 3, -7 % 3, 7 / 2, 2.5 * 4, 1 - 0.1]' eleves.json","[1,-1,3.5,10,0.9]"],
	["jq -c '[17 | floor, sqrt]' eleves.json","[17,4.123105625617661]"],
	["jq -c '[2.7 | floor], [16 | sqrt], [-1.5 | floor]' eleves.json","[2]\n[4]\n[-2]"],
	["jq -c '[.[] | .age | tostring]' eleves.json","[\"19\",\"22\",\"21\",\"19\"]"],
	["jq -c '[\"42\", \"3.5\", 7] | map(tonumber)' eleves.json","[42,3.5,7]"],
	["jq -c '.[0] | [.nom, .age, .notes, .actif, .adresse, .rien] | map(type)' eleves.json","[\"string\",\"number\",\"array\",\"boolean\",\"object\",\"null\"]"],
	["jq -c '\"a,b,c\" | split(\",\")' eleves.json","[\"a\",\"b\",\"c\"]"],
	["jq -r '[\"a\",\"b\",\"c\"] | join(\"-\")' eleves.json","a-b-c"],
	["jq -r '[1, null, \"x\", true] | join(\",\")' eleves.json","1,,x,true"],
	["jq -c '.[0].nom | ascii_downcase, ascii_upcase' eleves.json","\"ada\"\n\"ADA\""],
	["jq -c '.version | split(\".\") | map(tonumber)' config.json","[2,4,1]"],
	["jq -r '.serveur.tls.cert | ltrimstr(\"/etc/\") | rtrimstr(\".pem\")' config.json","ssl/web"],
	["jq -c '.version | startswith(\"2.\"), endswith(\".1\"), contains(\"4\")' config.json","true\ntrue\ntrue"],
	["jq -c '[.[] | select(.nom | test(\"^A\")) | .nom]' eleves.json","[\"Ada\",\"Alan\"]"],
	["jq -c '[.[] | select(.nom | test(\"a\"; \"i\")) | .nom]' eleves.json","[\"Ada\",\"Alan\",\"Grace\"]"],
	["jq -c '[.[] | .nom | test(\"[aeiou]{2}\")]' eleves.json","[false,false,false,false]"],
	["jq -c '.serveur.ports | contains([443])' config.json","true"],
	["jq -c '{\"a\": {\"b\": 1, \"c\": 2}} | contains({\"a\": {\"b\": 1}})' eleves.json","true"],
	["jq -c '\"abc\" | contains(\"b\")' eleves.json","true"],
	["jq -c '\"a\" | in({\"a\": 1})' eleves.json","true"],
	["jq -c '[1, 5] | map(in([0, 1, 2]))' eleves.json","[true,false]"],
	["jq -c 'first, last' nombres.json","3\n5"],
	["jq -c 'first(.[] | select(. > 4)), last' nombres.json","5\n5"],
	["jq -c '[limit(3; .[])]' nombres.json","[3,1,4]"],
	["jq -c '[.[] | select(. > 3)] | length' nombres.json","6"],
	["jq -c 'reduce .[] as $x (0; . + $x)' nombres.json","44"],
	["jq -c 'reduce .[] as $x ({}; .[$x | tostring] += 1)' nombres.json","{\"3\":2,\"1\":2,\"4\":1,\"5\":3,\"9\":1,\"2\":1,\"6\":1}"],
	["jq -c '. as [$a, $b] | {a: $a, b: $b}' nombres.json","{\"a\":3,\"b\":1}"],
	["jq -c '.[0] as {nom: $n, age: $a} | \"\\($n) a \\($a) ans\"' eleves.json","\"Ada a 19 ans\""],
	["jq -r '.[] | \"\\(.nom) (\\(.classe)) : \\(.notes | length) notes\"' eleves.json","Ada (B1) : 3 notes\nAlan (B3) : 2 notes\nGrace (B3) : 0 notes\nLinus (B1) : 4 notes"],
	["jq -r '.[] | \"\\(.nom)\\t\\(.age)\"' eleves.json","Ada\t19\nAlan\t22\nGrace\t21\nLinus\t19"],
	["jq -r '\"total: \\(map(.age) | add)\"' eleves.json","total: 81"],
	["jq -r '.[] | [.nom, .age, .classe] | @csv' eleves.json","\"Ada\",19,\"B1\"\n\"Alan\",22,\"B3\"\n\"Grace\",21,\"B3\"\n\"Linus\",19,\"B1\""],
	["jq -r '.[] | [.nom, .age, .actif] | @tsv' eleves.json","Ada\t19\ttrue\nAlan\t22\tfalse\nGrace\t21\ttrue\nLinus\t19\ttrue"],
	["jq -r '.[0] | @json' eleves.json","{\"nom\":\"Ada\",\"age\":19,\"classe\":\"B1\",\"notes\":[15,18,12],\"actif\":true,\"adresse\":{\"ville\":\"Lille\",\"cp\":\"59000\"}}"],
	["jq -r '.[0].nom | @base64' eleves.json","QWRh"],
	["jq -r '.[0].notes | @text' eleves.json","[15,18,12]"],
	["jq -r '@csv \"nom: \\(.[0].nom)\"' eleves.json","","jq: error (at eleves.json:6): string (\"Ada\") cannot be csv-formatted, only array"],
	["jq -r '.[] | @base64 \"\\(.nom)\"' eleves.json","QWRh\nQWxhbg==\nR3JhY2U=\nTGludXM="],
	["jq -c 'if . == [] then \"vide\" else length end' nombres.json","11"],
	["jq -r '.[] | if .age >= 21 then \"majeur US\" elif .age >= 18 then \"majeur\" else \"mineur\" end' eleves.json","majeur\nmajeur US\nmajeur US\nmajeur"],
	["jq -r '.[] | if .actif then .nom else empty end' eleves.json","Ada\nGrace\nLinus"],
	["jq -c 'map(if . > 4 then \"grand\" else . end)' nombres.json","[3,1,4,1,\"grand\",\"grand\",2,\"grand\",\"grand\",3,\"grand\"]"],
	["jq -c 'del(.[0].notes, .[0].adresse) | .[0]' eleves.json","{\"nom\":\"Ada\",\"age\":19,\"classe\":\"B1\",\"actif\":true}"],
	["jq -c 'del(.[] | select(.actif | not)) | map(.nom)' eleves.json","[\"Ada\",\"Grace\",\"Linus\"]"],
	["jq -c 'del(.serveur) | keys' config.json","[\"clé spéciale\",\"debug\",\"rien\",\"timeout\",\"utilisateurs\",\"version\",\"vide\"]"],
	["jq -c 'del(.[1:]) | length' eleves.json","1"],
	["jq -c '.[0] | .age += 1 | .age' eleves.json","20"],
	["jq -c '.[0].notes |= map(. + 1) | .[0].notes' eleves.json","[16,19,13]"],
	["jq -c '.serveur.ports[0] = 8080 | .serveur.ports' config.json","[8080,443]"],
	["jq -c '.debug = true | .debug' config.json","true"],
	["jq -c 'map(.age) | .[] |= . * 10' eleves.json","[190,220,210,190]"],
	["jq -c '.[0] | .mail //= \"inconnu\" | .mail' eleves.json","\"inconnu\""],
	["jq -c '{a: 1} + {b: 2}' eleves.json","{\"a\":1,\"b\":2}"],
	["jq -c '{a: {x: 1}} * {a: {y: 2}}' eleves.json","{\"a\":{\"x\":1,\"y\":2}}"],
	["jq -c '[1, 2, 3, 2] - [2]' eleves.json","[1,3]"],
	["jq -c '\"ab\" * 3' eleves.json","\"ababab\""],
	["jq -c '\"a,b, c\" / \", \"' eleves.json","[\"a,b\",\"c\"]"],
	["jq -c '[.[] | .nom] | index(\"Grace\")' eleves.json","2"],
	["jq -c 'null + 1, 1 + null, null' eleves.json","1\n1\nnull"],
	["jq -c '[.[].mail]' eleves.json","[null,null,null,\"linus@cybersup.ai\"]"],
	["jq -c '[.[].mail | values]' eleves.json","[\"linus@cybersup.ai\"]"],
	["jq -c '.[0].notes | [.[] | select(. != 15)]' eleves.json","[18,12]"],
	["jq -c 'map(.adresse?.ville)' eleves.json","[\"Lille\",\"Marseille\",null,\"Puteaux\"]"],
	["jq -c '[.[] | .nom?]' melange.json","[null,null]"],
	["jq -c '[.[] | .trois?]' melange.json","[3,null]"],
	["jq -c '[.[] | type]' melange.json","[\"number\",\"string\",\"object\",\"array\",\"null\",\"boolean\",\"number\"]"],
	["jq -c '[.[] | numbers]' melange.json","[1,2.5]"],
	["jq -c '[.[] | strings]' melange.json","[\"deux\"]"],
	["jq -c '[.[] | (arrays, objects)]' melange.json","[{\"trois\":3},[4]]"],
	["jq -c '[.[] | scalars]' melange.json","[1,\"deux\",null,true,2.5]"],
	["jq -c 'map(tojson)' melange.json","[\"1\",\"\\\"deux\\\"\",\"{\\\"trois\\\":3}\",\"[4]\",\"null\",\"true\",\"2.5\"]"],
	["jq -c 'map(length? // \"pas de longueur\")' melange.json","[1,4,1,1,0,\"pas de longueur\",2.5]"],
	["jq -c 'try error(\"aïe\") catch .' eleves.json","\"aïe\""],
	["jq -c '[.[] | try (if . == 2 then error(\"deux\") else . end) catch \"attrapé\"]' nombres.json","[3,1,4,1,5,9,\"attrapé\",6,5,3,5]"],
	["jq -c '.[] as $x | $x | select($x > 5)' nombres.json","9\n6"],
	["jq -c 'def double: . * 2; map(double)' nombres.json","[6,2,8,2,10,18,4,12,10,6,10]"],
	["jq -c 'def ajoute($n): . + $n; map(ajoute(10))' nombres.json","[13,11,14,11,15,19,12,16,15,13,15]"],
	["jq -c 'def applique(f): [.[] | f]; applique(. + 1)' nombres.json","[4,2,5,2,6,10,3,7,6,4,6]"],
	["jq -c 'def fact: if . <= 1 then 1 else . * (. - 1 | fact) end; [5, 10 | fact]' nombres.json","[120,3628800]"],
	["jq -c 'to_entries | map(select(.value > 4)) | map(.key)' nombres.json","[4,5,7,8,10]"],
	["jq -c '[paths]' config.json","[[\"serveur\"],[\"serveur\",\"nom\"],[\"serveur\",\"ports\"],[\"serveur\",\"ports\",0],[\"serveur\",\"ports\",1],[\"serveur\",\"tls\"],[\"serveur\",\"tls\",\"actif\"],[\"serveur\",\"tls\",\"cert\"],[\"utilisateurs\"],[\"utilisateurs\",\"ada\"],[\"utilisateurs\",\"ada\",\"uid\"],[\"utilisateurs\",\"ada\",\"groupes\"],[\"utilisateurs\",\"ada\",\"groupes\",0],[\"utilisateurs\",\"ada\",\"groupes\",1],[\"utilisateurs\",\"bob\"],[\"utilisateurs\",\"bob\",\"uid\"],[\"utilisateurs\",\"bob\",\"groupes\"],[\"utilisateurs\",\"bob\",\"groupes\",0],[\"version\"],[\"debug\"],[\"timeout\"],[\"vide\"],[\"rien\"],[\"clé spéciale\"]]"],
	["jq -c '[paths(type == \"number\")]' config.json","[[\"serveur\",\"ports\",0],[\"serveur\",\"ports\",1],[\"utilisateurs\",\"ada\",\"uid\"],[\"utilisateurs\",\"bob\",\"uid\"],[\"timeout\"]]"],
	["jq -c '[leaf_paths] | length' config.json","","jq: error: leaf_paths/0 is not defined at <top-level>, line 1:\n[leaf_paths] | length \njq: 1 compile error"],
	["jq -c '[.. | numbers]' config.json","[80,443,1000,1001,2.5]"],
	["jq -c 'path(.serveur.ports[0])' config.json","[\"serveur\",\"ports\",0]"],
	["jq -c '[getpath([\"serveur\", \"tls\", \"actif\"])]' config.json","[true]"],
	["jq -c 'setpath([\"a\", \"b\"]; 1)' config.json","{\"serveur\":{\"nom\":\"web\",\"ports\":[80,443],\"tls\":{\"actif\":true,\"cert\":\"/etc/ssl/web.pem\"}},\"utilisateurs\":{\"ada\":{\"uid\":1000,\"groupes\":[\"sudo\",\"dev\"]},\"bob\":{\"uid\":1001,\"groupes\":[\"dev\"]}},\"version\":\"2.4.1\",\"debug\":false,\"timeout\":2.5,\"vide\":{},\"rien\":null,\"clé spéciale\":\"é\",\"a\":{\"b\":1}}"],
	["jq -c 'to_entries | map(.key) | join(\",\")' config.json","\"serveur,utilisateurs,version,debug,timeout,vide,rien,clé spéciale\""],
	["jq -c '.utilisateurs | keys[] as $k | {($k): .[$k].groupes | length}' config.json","{\"ada\":2}\n{\"bob\":1}"],
	["jq -c '[.utilisateurs[] | .groupes[]] | unique' config.json","[\"dev\",\"sudo\"]"],
	["jq -c 'flatten' melange.json","[1,\"deux\",{\"trois\":3},4,null,true,2.5]"],
	["jq -c '[[1, [2]], 3] | flatten, flatten(1)' eleves.json","[1,2,3]\n[1,[2],3]"],
	["jq -c '[1, 2] | tostring' eleves.json","\"[1,2]\""],
	["jq -c '\"été\" | ascii_upcase' eleves.json","\"éTé\""],
	["jq -c 'splits(\", *\")' eleves.json","","jq: error (at eleves.json:6): array ([{\"nom\":\"Ad...) cannot be matched, as it is not a string"],
	["jq -c '\"a1b22c\" | [scan(\"[0-9]+\")]' eleves.json","[\"1\",\"22\"]"],
	["jq -c '\"test 123\" | sub(\"[0-9]+\"; \"N\"), gsub(\"[a-z]\"; \"x\")' eleves.json","\"test N\"\n\"xxxx 123\""],
	["jq -c '\"2026-10-16\" | capture(\"(?<a>[0-9]+)-(?<m>[0-9]+)\")' eleves.json","{\"a\":\"2026\",\"m\":\"10\"}"],
	["jq -c '[.[] | .nom | ascii_downcase] | join(\" \")' eleves.json","\"ada alan grace linus\""],
	["jq -c 'map(.notes) | add' eleves.json","[15,18,12,9,14,11,10,13,16]"],
	["jq -c 'map(.notes) | flatten | add / length' eleves.json","13.11111111111111"],
	["jq -c '[.[] | .notes | max]' eleves.json","[18,14,null,16]"],
	["jq -c 'map({nom, moyenne: (if (.notes | length) > 0 then (.notes | add / length) else null end)})' eleves.json","[{\"nom\":\"Ada\",\"moyenne\":15},{\"nom\":\"Alan\",\"moyenne\":11.5},{\"nom\":\"Grace\",\"moyenne\":null},{\"nom\":\"Linus\",\"moyenne\":12.5}]"],
	["jq -c 'any(.[]; .age > 21), all(.[]; .age > 18)' eleves.json","true\ntrue"],
	["jq -c 'isempty(.[] | select(.age > 30))' eleves.json","true"],
	["jq -c '[.[] | .age] | @json' eleves.json","\"[19,22,21,19]\""],
	["jq -c 'tostream' nombres.json","[[0],3]\n[[1],1]\n[[2],4]\n[[3],1]\n[[4],5]\n[[5],9]\n[[6],2]\n[[7],6]\n[[8],5]\n[[9],3]\n[[10],5]\n[[10]]"],
	["jq -c 'input' journal.ndjson","{\"t\":\"08:13\",\"niveau\":\"info\",\"ip\":\"10.0.0.7\",\"msg\":\"login\"}\n{\"t\":\"09:15\",\"niveau\":\"error\",\"ip\":\"10.0.0.9\",\"msg\":\"disque plein\"}"],
	["jq -c '[., input] | map(.t)' journal.ndjson","[\"08:12\",\"08:13\"]\n[\"09:01\",\"09:15\"]"],
	["jq -c '[inputs | .ip]' journal.ndjson","[\"10.0.0.7\",\"10.0.0.5\",\"10.0.0.9\"]"],
	["jq '.niveau' journal.ndjson","\"warn\"\n\"info\"\n\"warn\"\n\"error\""],
	["jq -r 'select(.niveau == \"warn\") | .ip' journal.ndjson","10.0.0.5\n10.0.0.5"],
	["jq -s 'length' journal.ndjson","4"],
	["jq -s -c 'group_by(.ip) | map({ip: .[0].ip, n: length})' journal.ndjson","[{\"ip\":\"10.0.0.5\",\"n\":2},{\"ip\":\"10.0.0.7\",\"n\":1},{\"ip\":\"10.0.0.9\",\"n\":1}]"],
	["jq -s -c 'map(select(.niveau != \"info\")) | map(.msg) | unique' journal.ndjson","[\"disque plein\",\"login raté\"]"],
	["jq -c -s '.' nombres.json","[[3,1,4,1,5,9,2,6,5,3,5]]"],
	["jq -n '1 + 2'","3"],
	["jq -n -c '[1, 2] | map(. * 3)'","[3,6]"],
	["jq -n '\"bonjour\"'","\"bonjour\""],
	["jq -n -r '\"ligne1\\nligne2\"'","ligne1\nligne2"],
	["jq -n -c '{} | .a.b.c = 1'","{\"a\":{\"b\":{\"c\":1}}}"],
	["jq -n -c '[.[]?]'","[]"],
	["jq -n -c '[range(3)] | combinations(2)'","[0,0]\n[0,1]\n[0,2]\n[1,0]\n[1,1]\n[1,2]\n[2,0]\n[2,1]\n[2,2]"],
	["jq -n -c '[[1,2],[3,4]] | transpose'","[[1,3],[2,4]]"],
	["jq -n -c '[3,1,2] | sort | reverse'","[3,2,1]"],
	["jq -n -c '\"x\" | ltrimstr(1)'","\"x\""],
	["jq -n -c '[1,[2,[3]]] | getpath([1,1,0])'","3"],
	["jq -n -c '{\"a\":1,\"b\":2} | with_entries(select(.value > 1))'","{\"b\":2}"],
	["jq -n -c '[1,2,3] | IN(2), IN(5)'","false\nfalse"],
	["jq -n -c '\"abc\" | explode, (explode | implode)'","[97,98,99]\n\"abc\""],
	["jq -n -c '[1,2,3] | indices(2), index(3), rindex(1)'","[1]\n2\n0"],
	["jq -n -c '\"a-b-a\" | indices(\"a\")'","[0,4]"],
	["jq -n -c '{\"b\":2,\"a\":1}' -S","{\"a\":1,\"b\":2}"],
	["jq -S . config.json","{\n  \"clé spéciale\": \"é\",\n  \"debug\": false,\n  \"rien\": null,\n  \"serveur\": {\n    \"nom\": \"web\",\n    \"ports\": [\n      80,\n      443\n    ],\n    \"tls\": {\n      \"actif\": true,\n      \"cert\": \"/etc/ssl/web.pem\"\n    }\n  },\n  \"timeout\": 2.5,\n  \"utilisateurs\": {\n    \"ada\": {\n      \"groupes\": [\n        \"sudo\",\n        \"dev\"\n      ],\n      \"uid\": 1000\n    },\n    \"bob\": {\n      \"groupes\": [\n        \"dev\"\n      ],\n      \"uid\": 1001\n    }\n  },\n  \"version\": \"2.4.1\",\n  \"vide\": {}\n}"],
	["jq -S -c '.utilisateurs' config.json","{\"ada\":{\"groupes\":[\"sudo\",\"dev\"],\"uid\":1000},\"bob\":{\"groupes\":[\"dev\"],\"uid\":1001}}"],
	["jq --arg qui Ada '.[] | select(.nom == $qui) | .age' eleves.json","19"],
	["jq --arg n 5 -n '$n'","\"5\""],
	["jq --argjson n 5 -n '$n + 1'","6"],
	["jq --argjson obj '{\"a\":[1,2]}' -n -c '$obj.a'","[1,2]"],
	["jq -r --arg sep ' | ' 'map(.nom) | join($sep)' eleves.json","Ada | Alan | Grace | Linus"],
	["jq -j '.[] | .nom' eleves.json","AdaAlanGraceLinus"],
	["jq -j -n '\"a\", \"b\", 1'","ab1"],
	["jq -e '.debug' config.json","false"],
	["jq -e '.serveur.tls.actif' config.json","true"],
	["jq '.serveur.nom' config.json eleves.json","\"web\"","jq: error (at eleves.json:6): Cannot index array with string \"serveur\""],
	["jq '.[0]?' config.json eleves.json","{\n  \"nom\": \"Ada\",\n  \"age\": 19,\n  \"classe\": \"B1\",\n  \"notes\": [\n    15,\n    18,\n    12\n  ],\n  \"actif\": true,\n  \"adresse\": {\n    \"ville\": \"Lille\",\n    \"cp\": \"59000\"\n  }\n}"],
	["jq -r 'env.LANG_INEXISTANTE // \"absente\"' eleves.json","absente"],
	["jq -c 'map(.age) | . as $a | [range(length)] | map($a[.] * .)' eleves.json","[0,22,42,57]"],
	["jq -c '[.[] | .age] | [min, max, (add / length | floor)]' eleves.json","[19,22,20]"],
	["jq -c 'map(.classe) | group_by(.) | map([.[0], length])' eleves.json","[[\"B1\",2],[\"B3\",2]]"],
	["jq -c '[foreach .[] as $x (0; . + $x)]' nombres.json","[3,4,8,9,14,23,25,31,36,39,44]"],
	["jq -c '[foreach .[] as $x (0; . + $x; [$x, .])] | .[:3]' nombres.json","[[3,3],[1,4],[4,8]]"],
	["jq -c 'label $fin | .[] | if . > 4 then ., break $fin else . end' nombres.json","3\n1\n4\n1\n5"],
	["jq -c '[.[] | until(. > 100; . * 2)]' nombres.json","[192,128,128,128,160,144,128,192,160,192,160]"],
	["jq -c '[1 | while(. < 50; . * 3)]' nombres.json","[1,3,9,27]"],
	["jq -c '[recurse(if . < 3 then . + 1 else empty end)]' eleves.json","[[{\"nom\":\"Ada\",\"age\":19,\"classe\":\"B1\",\"notes\":[15,18,12],\"actif\":true,\"adresse\":{\"ville\":\"Lille\",\"cp\":\"59000\"}},{\"nom\":\"Alan\",\"age\":22,\"classe\":\"B3\",\"notes\":[9,14],\"actif\":false,\"adresse\":{\"ville\":\"Marseille\",\"cp\":\"13001\"}},{\"nom\":\"Grace\",\"age\":21,\"classe\":\"B3\",\"notes\":[],\"actif\":true,\"adresse\":null},{\"nom\":\"Linus\",\"age\":19,\"classe\":\"B1\",\"notes\":[11,10,13,16],\"actif\":true,\"adresse\":{\"ville\":\"Puteaux\",\"cp\":\"92800\"},\"mail\":\"linus@cybersup.ai\"}]]"],
	["jq -c 'walk(if type == \"number\" then . + 1 else . end) | .serveur.ports' config.json","[81,444]"],
	["jq -c '[.[] | {nom} | .nom |= ascii_upcase]' eleves.json","[{\"nom\":\"ADA\"},{\"nom\":\"ALAN\"},{\"nom\":\"GRACE\"},{\"nom\":\"LINUS\"}]"],
	["jq -c '.[0] | to_entries | from_entries == .' eleves.json","false"],
	["jq -c '[.[] | .notes[0]]' eleves.json","[15,9,null,11]"],
	["jq -c '[.[] | .notes[1:] ]' eleves.json","[[18,12],[14],[],[10,13,16]]"],
	["jq -c '.[0].nom[1:3], .[0].nom[-2:]' eleves.json","\"da\"\n\"da\""],
	["jq -c '[1, 2, 3] | .[1:] = [\"x\"]' eleves.json","[1,\"x\"]"],
	["jq -c '{\"a\": 1, \"b\": null} | [.[] | . // \"défaut\"]' eleves.json","[1,\"défaut\"]"],
	["jq -c '[true, false, null, 0, \"\", []] | map(if . then \"vrai\" else \"faux\" end)' eleves.json","[\"vrai\",\"faux\",\"faux\",\"vrai\",\"vrai\",\"vrai\"]"],
	["jq -c '[3, \"a\", null, true, false, [1], {\"a\": 1}, 1] | sort' eleves.json","[null,false,true,1,3,\"a\",[1],{\"a\":1}]"],
	["jq -c '[{\"b\": 1}, {\"a\": 2}, {\"a\": 1, \"b\": 0}] | sort' eleves.json","[{\"a\":2},{\"a\":1,\"b\":0},{\"b\":1}]"],
	["jq -c '\"\\(1 + 2) et \\(\"x\" * 2) et \\([1])\"' eleves.json","\"3 et xx et [1]\""],
	["jq -c '[.[] | .age] | @sh' eleves.json","\"19 22 21 19\""],
	["jq -r '[.[] | .nom] | @sh' eleves.json","'Ada' 'Alan' 'Grace' 'Linus'"],
	["jq -r '\"<a href=\\\"x\\\">&</a>\" | @html' eleves.json","&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;"],
	["jq -r '\"a b&c=d/é\" | @uri' eleves.json","a%20b%26c%3Dd%2F%C3%A9"],
	["jq -r '\"QWRh\" | @base64d' eleves.json","Ada"],
	["jq -c '$__loc__' eleves.json","{\"file\":\"<top-level>\",\"line\":1}"],
	["jq -c 'splits(\"a\")' melange.json","","jq: error (at melange.json:1): array ([1,\"deux\",{...) cannot be matched, as it is not a string"],
	["jq -c '.[] | numbers | . * 10' melange.json","10\n25"],
	["jq -c '[.[] | objects | .trois]' melange.json","[3]"],
	["jq -c 'map(select(. != null)) | length' melange.json","6"],
	["jq -c '.[2] | has(\"trois\"), has(\"deux\")' melange.json","true\nfalse"],
	["jq -c 'getpath([\"a\"]?)' melange.json","","jq: error (at melange.json:1): Cannot index array with string \"a\""],
	["jq -c '[.[] | tostring]' melange.json","[\"1\",\"deux\",\"{\\\"trois\\\":3}\",\"[4]\",\"null\",\"true\",\"2.5\"]"],
	["jq -c 'add' nombres.json","44"],
	["jq -c 'length' nombres.json","11"],
	["jq -c 'ascii' nombres.json","","jq: error: ascii/0 is not defined at <top-level>, line 1:\nascii\njq: 1 compile error"],
	["jq -c 'map(. as $n | [range($n)] | length)' nombres.json","[3,1,4,1,5,9,2,6,5,3,5]"],
	["jq -r '.[] | .nom + \" \" + (.age | tostring)' eleves.json","Ada 19\nAlan 22\nGrace 21\nLinus 19"],
	["jq -r '.[] | .nom + \":\" + .classe' eleves.json","Ada:B1\nAlan:B3\nGrace:B3\nLinus:B1"],
	["jq -c 'map(.nom) | map(select(startswith(\"A\")))' eleves.json","[\"Ada\",\"Alan\"]"],
	["jq -c '.[] | select(.adresse != null) | .adresse.cp | tonumber' eleves.json","59000\n13001\n92800"],
	["jq -c 'map(.adresse) | map(select(.)) | map(.ville) | sort' eleves.json","[\"Lille\",\"Marseille\",\"Puteaux\"]"],
	["jq -c 'map(.notes | length) | add' eleves.json","9"],
	["jq -c '[.[] | .nom] | sort_by(length)' eleves.json","[\"Ada\",\"Alan\",\"Grace\",\"Linus\"]"],
	["jq -c 'map(.nom) | to_entries | map(\"\\(.key + 1). \\(.value)\")' eleves.json","[\"1. Ada\",\"2. Alan\",\"3. Grace\",\"4. Linus\"]"],
	["jq -c 'INDEX(.nom) | keys' eleves.json","[\"Ada\",\"Alan\",\"Grace\",\"Linus\"]"],
	["jq -c 'INDEX(.nom) | .Ada.age' eleves.json","19"],
	["jq -c '[.[] | .notes | length] | @csv' eleves.json","\"3,2,0,4\""],
	["jq -c 'map(.age) | add as $s | map(. / $s * 100 | floor)' eleves.json","[23,27,25,23]"],
	["jq -c 'pick(.serveur.nom, .version)' config.json","{\"serveur\":{\"nom\":\"web\"},\"version\":\"2.4.1\"}"],
	["jq -c 'map(.age) | unique | length' eleves.json","3"],
	["jq -c 'map(.classe) | unique' eleves.json","[\"B1\",\"B3\"]"],
	["jq -c '[splits(\",\")]' eleves.json","","jq: error (at eleves.json:6): array ([{\"nom\":\"Ad...) cannot be matched, as it is not a string"],
	["jq -c 'tojson | fromjson | length' eleves.json","4"],
	["jq -c '[.[] | .nom | test(\"^[A-G]\")] | map(select(.)) | length' eleves.json","3"],
	["jq -c '.version as $v | $v | split(\".\") | .[0] | tonumber | . + 1' config.json","3"],
	["jq -c 'getpath([\"serveur\",\"ports\"]) | add' config.json","523"],
	["jq -c '.serveur.ports | map(. > 100)' config.json","[false,true]"],
	["jq -c '.timeout * 2, .timeout | floor' config.json","5\n2"],
	["jq -c 'del(.serveur.tls.cert) | .serveur.tls' config.json","{\"actif\":true}"],
	["jq -c 'to_entries | map(select(.value == null or .value == {})) | map(.key)' config.json","[\"vide\",\"rien\"]"],
	["jq -c '[.. | strings]' config.json","[\"web\",\"/etc/ssl/web.pem\",\"sudo\",\"dev\",\"dev\",\"2.4.1\",\"é\"]"],
	["jq -c '.utilisateurs | [.[] | .uid] | add' config.json","2001"],
	["jq -c '.utilisateurs | to_entries[] | select(.value.groupes | index(\"sudo\")) | .key' config.json","\"ada\""],
	["jq -c '.utilisateurs | map_values(.groupes | join(\"+\"))' config.json","{\"ada\":\"sudo+dev\",\"bob\":\"dev\"}"],
	["jq -c '.utilisateurs | keys_unsorted, length' config.json","[\"ada\",\"bob\"]\n2"],
	["jq -c '.vide | length, keys' config.json","0\n[]"],
	["jq -c '.rien | length' config.json","0"],
	["jq -c '.rien.x, .rien[0], .rien[]?' config.json","null\nnull"],
	["jq -c '[.[] | .notes | sort | reverse | .[0]]' eleves.json","[18,14,null,16]"],
	["jq -c 'map(.notes | min)' eleves.json","[12,9,null,10]"],
	["jq -c '[.[] | (.notes | length) as $n | {nom, n: $n}] | sort_by(-.n) | map(.nom)' eleves.json","[\"Linus\",\"Ada\",\"Alan\",\"Grace\"]"],
	["jq -c '.[] | {nom} + {nb: (.notes | length)}' eleves.json","{\"nom\":\"Ada\",\"nb\":3}\n{\"nom\":\"Alan\",\"nb\":2}\n{\"nom\":\"Grace\",\"nb\":0}\n{\"nom\":\"Linus\",\"nb\":4}"],
	["jq -c '[.[] | .age] | [.[] | select(. % 2 == 1)]' eleves.json","[19,21,19]"],
	["jq -c '[.[] | .age] | map(. / 2 | floor)' eleves.json","[9,11,10,9]"],
	["jq -c 'map(.age) | sort | .[length / 2 | floor]' eleves.json","21"],
	["jq '.[0].nom.x' eleves.json","","jq: error (at eleves.json:6): Cannot index string with string \"x\""],
	["jq '.[] | .notes | .a' eleves.json","","jq: error (at eleves.json:6): Cannot index array with string \"a\""],
	["jq '.a' casse.json","1","jq: parse error: Objects must consist of key:value pairs at line 3, column 4"],
	["jq '.' casse.json","{\n  \"a\": 1\n}","jq: parse error: Objects must consist of key:value pairs at line 3, column 4"],
	["jq -c '.[]' melange.json","1\n\"deux\"\n{\"trois\":3}\n[4]\nnull\ntrue\n2.5"],
	["jq '.[0] | .[0]' eleves.json","","jq: error (at eleves.json:6): Cannot index object with number"],
	["jq '.[0] | .[]' melange.json","","jq: error (at melange.json:1): Cannot iterate over number (1)"],
	["jq -c '.[] | .[0]?' melange.json","4\nnull"],
	["jq 'map(.age) | .[] + \"x\"' eleves.json","","jq: error (at eleves.json:6): number (19) and string (\"x\") cannot be added"],
	["jq '{} - 1' eleves.json","","jq: error (at eleves.json:6): object ({}) and number (1) cannot be subtracted"],
	["jq '\"a\" - \"b\"' eleves.json","","jq: error (at eleves.json:6): string (\"a\") and string (\"b\") cannot be subtracted"],
	["jq '[] * 2' eleves.json","","jq: error (at eleves.json:6): array ([]) and number (2) cannot be multiplied"],
	["jq '10 / 0' eleves.json","","jq: error (at eleves.json:6): number (10) and number (0) cannot be divided because the divisor is zero"],
	["jq '5 % 0' eleves.json","","jq: error (at eleves.json:6): number (5) and number (0) cannot be divided (remainder) because the divisor is zero"],
	["jq 'error(\"stop\")' eleves.json","","jq: error (at eleves.json:6): stop"],
	["jq 'error({\"code\": 1})' eleves.json","","jq: error (at eleves.json:6) (not a string): {\"code\":1}"],
	["jq 'error(null)' eleves.json","","jq: error (at eleves.json:6) (not a string): null"],
	["jq '.[0] | keys | .[] | ascii_upcase | ascii_downcase | length | -.' eleves.json","-5\n-7\n-3\n-6\n-3\n-5"],
	["jq '\"abc\" | -.' eleves.json","","jq: error (at eleves.json:6): string (\"abc\") cannot be negated"],
	["jq 'true | length' eleves.json","","jq: error (at eleves.json:6): boolean (true) has no length"],
	["jq '\"x\" | tonumber' eleves.json","","jq: error (at eleves.json:6): Invalid numeric literal at EOF at line 1, column 1 (while parsing 'x')"],
	["jq '[1] | implode' eleves.json","\"\\u0001\""],
	["jq '.[0].nom | test(1)' eleves.json","","jq: error (at eleves.json:6): number not a string or array"],
	["jq '.[0] | has(0)' eleves.json","","jq: error (at eleves.json:6): Cannot check whether object has a number key"],
	["jq '\"a\" | startswith(1)' eleves.json","","jq: error (at eleves.json:6): startswith() requires string inputs"],
	["jq 'keys | join(1)' config.json","","jq: error (at config.json:3): string (\"clé spéc...) and number (1) cannot be added"],
	["jq '.[0].nom | split(1)' eleves.json","","jq: error (at eleves.json:6): split input and separator must be strings"],
	["jq '.[] | sort' eleves.json","","jq: error (at eleves.json:6): object ({\"nom\":\"Ada...) cannot be sorted, as it is not an array"],
	["jq '{} | sort' eleves.json","","jq: error (at eleves.json:6): object ({}) cannot be sorted, as it is not an array"],
	["jq 'foo' eleves.json","","jq: error: foo/0 is not defined at <top-level>, line 1:\nfoo\njq: 1 compile error"],
	["jq '$x' eleves.json","","jq: error: $x is not defined at <top-level>, line 1:\n$x\njq: 1 compile error"],
	["jq '.[0' eleves.json","","jq: error: syntax error, unexpected end of file (Unix shell quoting issues?) at <top-level>, line 1:\n.[0  \njq: 1 compile error"],
	["jq '{a:}' eleves.json","","jq: error: syntax error, unexpected '}' (Unix shell quoting issues?) at <top-level>, line 1:\n{a:}   \njq: 1 compile error"],
	["jq 'if . then 1' eleves.json","","jq: error: syntax error, unexpected end of file (Unix shell quoting issues?) at <top-level>, line 1:\nif . then 1          \njq: error: Possibly unterminated 'if' statement at <top-level>, line 1:\nif . then 1\njq: 2 compile errors"],
	["jq '.a +' eleves.json","","jq: error: syntax error, unexpected end of file (Unix shell quoting issues?) at <top-level>, line 1:\n.a +   \njq: 1 compile error"],
	["jq '1 +* 2' eleves.json","","jq: error: syntax error, unexpected '*' (Unix shell quoting issues?) at <top-level>, line 1:\n1 +* 2   \njq: 1 compile error"],
	["jq '\"\\(1' eleves.json","","jq: error: syntax error, unexpected end of file (Unix shell quoting issues?) at <top-level>, line 1:\n\"\\(1   \njq: 1 compile error"],
	["jq '.[]] ' eleves.json","","jq: error: syntax error, unexpected INVALID_CHARACTER, expecting end of file (Unix shell quoting issues?) at <top-level>, line 1:\n.[]]    \njq: 1 compile error"],
	["jq 'foo(1)' eleves.json","","jq: error: foo/1 is not defined at <top-level>, line 1:\nfoo(1)\njq: 1 compile error"],
	["jq '.' absent.json","","jq: error: Could not open file absent.json: No such file or directory"],
	["jq . eleves.json absent.json","[\n  {\n    \"nom\": \"Ada\",\n    \"age\": 19,\n    \"classe\": \"B1\",\n    \"notes\": [\n      15,\n      18,\n      12\n    ],\n    \"actif\": true,\n    \"adresse\": {\n      \"ville\": \"Lille\",\n      \"cp\": \"59000\"\n    }\n  },\n  {\n    \"nom\": \"Alan\",\n    \"age\": 22,\n    \"classe\": \"B3\",\n    \"notes\": [\n      9,\n      14\n    ],\n    \"actif\": false,\n    \"adresse\": {\n      \"ville\": \"Marseille\",\n      \"cp\": \"13001\"\n    }\n  },\n  {\n    \"nom\": \"Grace\",\n    \"age\": 21,\n    \"classe\": \"B3\",\n    \"notes\": [],\n    \"actif\": true,\n    \"adresse\": null\n  },\n  {\n    \"nom\": \"Linus\",\n    \"age\": 19,\n    \"classe\": \"B1\",\n    \"notes\": [\n      11,\n      10,\n      13,\n      16\n    ],\n    \"actif\": true,\n    \"adresse\": {\n      \"ville\": \"Puteaux\",\n      \"cp\": \"92800\"\n    },\n    \"mail\": \"linus@cybersup.ai\"\n  }\n]","jq: error: Could not open file absent.json: No such file or directory"],
	["jq",""],
	["jq -Z . eleves.json","","jq: Unknown option -Z\nUse jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq"],
	["jq --tout . eleves.json","","jq: Unknown option --tout\nUse jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq"],
	["jq --arg x eleves.json",""],
	["jq --argjson x '{a' -n '$x'","","jq: invalid JSON text passed to --argjson\nUse jq --help for help with command-line options,\nor see the jq manpage, or online docs  at https://jqlang.github.io/jq"],
	["jq -e 'false' -n","false"],
	["jq -e 'null' -n","null"],
	["jq -e 'empty' -n",""],
	["jq -e '1' -n","1"],
	["jq -r '.serveur.ports' config.json","[\n  80,\n  443\n]"],
	["jq -r '.[0] | .nom, .notes' eleves.json","Ada\n[\n  15,\n  18,\n  12\n]"],
	["jq -rc '.[0] | .adresse' eleves.json","{\"ville\":\"Lille\",\"cp\":\"59000\"}"],
	["jq -cr '.[0].nom' eleves.json","Ada"],
	["jq -nr '\"a\\tb\"'","a\tb"],
	["jq -n '\"a\\tb\"'","\"a\\tb\""],
	["jq -n '\"guillemet \\\" et barre \\\\ et é\"'","\"guillemet \\\" et barre \\\\ et é\""],
	["jq -n '\"\\u0001\"'","\"\\u0001\""],
	["jq -n '[]'","[]"],
	["jq -n '{}'","{}"],
	["jq -n '[[], {}, [{}]]'","[\n  [],\n  {},\n  [\n    {}\n  ]\n]"],
	["jq -n '{\"a\": [], \"b\": {}}'","{\n  \"a\": [],\n  \"b\": {}\n}"],
	["jq -n '[1, [2, [3, [4]]]]'","[\n  1,\n  [\n    2,\n    [\n      3,\n      [\n        4\n      ]\n    ]\n  ]\n]"],
	["jq --tab -n '{\"a\": [1]}'","{\n\t\"a\": [\n\t\t1\n\t]\n}"],
	["jq --indent 4 -n '{\"a\": [1]}'","{\n    \"a\": [\n        1\n    ]\n}"],
	["jq --indent 0 -n '{\"a\": [1]}'","{\"a\":[1]}"],
	["jq -n '\"x\" as $a | \"y\" as $b | $a + $b'","\"xy\""],
	["jq -n '[1,2,3] as [$a] | $a'","1"],
	["jq -n '{\"a\": {\"b\": 2}} as {a: {b: $v}} | $v'","2"],
	["jq -n 'def f(g): g | g; 3 | f(. * 2)'","12"],
	["jq -n 'def f: def g: 3; g * 2; f'","6"],
	["jq -n 'def f($a; $b): $a - $b; f(10; 3)'","7"],
	["jq -n '[.[]?, 1]'","[\n  1\n]"],
	["jq -n -c '[1, 2] | .[2] = 9'","[1,2,9]"],
	["jq -n -c 'null | .[1] = 9'","[null,9]"],
	["jq -n -c '[1, 2, 3] | del(.[0, 2])'","[2]"],
	["jq -n -c '{\"a\": 1, \"b\": 2} | del(.a, .c)'","{\"b\":2}"],
	["jq -n -c '[1, null, 2] | map(values)'","[1,2]"],
	["jq -n -c '[1, 2, 3] | to_entries'","[{\"key\":0,\"value\":1},{\"key\":1,\"value\":2},{\"key\":2,\"value\":3}]"],
	["jq -n -c '{\"a\": 1} | has(\"a\", \"b\")'","true\nfalse"],
	["jq -n -c '[3, 2, 1] | sort_by(.)'","[1,2,3]"],
	["jq -n -c '[{\"a\": 2, \"b\": 1}, {\"a\": 1, \"b\": 2}] | sort_by(.b) | map(.a)'","[2,1]"],
	["jq -n -c '[\"b\", \"a\", \"C\"] | sort, min, max'","[\"C\",\"a\",\"b\"]\n\"C\"\n\"b\""],
	["jq -n -c '[] | min, max, add, first?, last'","null\nnull\nnull\nnull\nnull"],
	["jq -n -c '[] | first'","null"],
	["jq -n '\"ok\" | ., .'","\"ok\"\n\"ok\""],
	["jq -n '1, 2 | . * 10'","10\n20"],
	["jq -n '(1, 2) + (10, 20)'","11\n12\n21\n22"],
	["jq -n -c '[(1, 2) as $x | ($x, $x * 10)]'","[1,10,2,20]"],
	["jq -n -c '{a: (1, 2)}'","{\"a\":1}\n{\"a\":2}"],
	["jq -n -c '{a: 1, b: (3, 4)} | [.a, .b]'","[1,3]\n[1,4]"],
	["jq -n -c '[range(0; 10)] | .[2:4], .[-3:], .[:-8]'","[2,3]\n[7,8,9]\n[0,1]"],
	["jq -n -c '\"bonjour\" | .[2:5], .[:-4]'","\"njo\"\n\"bon\""],
	["jq -n -c 'reduce range(5) as $i ([]; . + [$i * $i])'","[0,1,4,9,16]"],
	["jq -n -c '[limit(0; 1, 2)], [limit(-1; 1, 2)]'","[]\n[1,2]"],
	["jq -n -c 'first(empty)'",""],
	["jq -n -c '[first(range(10; 0; -3))]'","[10]"],
	["jq -n '\"\\(1;2)\"'","","jq: error: syntax error, unexpected ';' (Unix shell quoting issues?) at <top-level>, line 1:\n\"\\(1;2)\"    \njq: 1 compile error"],
	["jq -n -c '$ENV | type'","\"object\""],
	["jq -n -c 'env | type'","\"object\""],
	["jq -n -c '[splits(\"a+\"; \"g\")]'","","jq: error (at <unknown>): null (null) cannot be matched, as it is not a string"],
	["jq -n -c '\"aXbxc\" | ascii_downcase | split(\"x\")'","[\"a\",\"b\",\"c\"]"],
	["jq -n -c '\"a b  c\" | split(\" \")'","[\"a\",\"b\",\"\",\"c\"]"],
	["jq -n -c '\"\" | split(\",\"), split(\"\")'","[]\n[]"],
	["jq -n -c '\"abc\" | split(\"\")'","[\"a\",\"b\",\"c\"]"],
	["jq -n -c '\"x=1&y=2\" | split(\"&\") | map(split(\"=\") | {(.[0]): .[1]}) | add'","{\"x\":\"1\",\"y\":\"2\"}"],
	["jq -n -c '\"Ünïcödé\" | length, utf8bytelength'","7\n11"],
	["jq -n -c '[1, 2] | contains([1, 1])'","true"],
	["jq -n -c '\"foobar\" | contains(\"bar\"), inside(\"foobarbaz\")'","true\ntrue"],
	["jq -n -c '{\"a\": 1} == {\"a\": 1.0}, [1, 2] < [1, 3], \"a\" < \"b\", null < false, {} > []'","true\ntrue\ntrue\ntrue\ntrue"],
	["jq -n -c '1 as $x | 2 as $y | [$x, $y, $x + $y]'","[1,2,3]"],
	["jq -n -c '[1, 2, 3] | map(select(. >= 2)) | length == 2'","true"],
	["jq -n -c 'true and (false or true), (true | not)'","true\nfalse"],
	["jq -n -c '[null, false, 0] | map(. // \"d\")'","[\"d\",\"d\",0]"],
	["jq -n -c '(null // false) // \"x\"'","\"x\""],
	["jq -n -c 'empty // 5'","5"],
	["jq -n -c '[.[]?] // \"vide\"'","[]"],
	["jq -n -c '[1,2] | .[0] += 10 | .[1] -= 1 | .[0] *= 2 | .[1] /= 2 | .[0] %= 7'","[1,0.5]"],
	["jq -n -c '{\"a\": [1, 2]} | .a[] |= . + 1'","{\"a\":[2,3]}"],
	["jq -n -c '{\"a\": 1} | .b.c |= 5'","{\"a\":1,\"b\":{\"c\":5}}"],
	["jq -n -c '[1, 2, 3] | .[] |= empty'","[]"],
	["jq -n -c '{\"a\": 1, \"b\": 2} | to_entries | map(.value) | add'","3"],
	["jq -n -c '{\"a\": 1, \"b\": 2} | with_entries(.key |= ascii_upcase)'","{\"A\":1,\"B\":2}"],
	["jq -n -c '{\"z\": 1, \"a\": 2} | keys, keys_unsorted'","[\"a\",\"z\"]\n[\"z\",\"a\"]"],
	["jq -n -c '[{\"n\": \"a\", \"v\": 1}, {\"n\": \"b\", \"v\": 2}] | map({(.n): .v}) | add'","{\"a\":1,\"b\":2}"],
	["jq -n -c '@text \"a\\(1)b\"'","\"a1b\""],
	["jq -n -r '[1, \"a,b\", \"c\\\"d\", null, false] | @csv'","1,\"a,b\",\"c\"\"d\",,false"],
	["jq -n -r '[\"a\\tb\", \"c\\\\d\", 1.5] | @tsv'","a\\tb\tc\\\\d\t1.5"],
	["jq -n -r '{\"a\": [1, 2]} | @json, @text'","{\"a\":[1,2]}\n{\"a\":[1,2]}"],
	["jq -n -r '\"é\" | @base64, (@base64 | @base64d)'","w6k=\né"],
	["jq -n -r '[1, {}] | @csv'","","jq: error (at <unknown>): object ({}) is not valid in a csv row"],
	["jq -n -c 'try error(\"x\") catch . + \"!\"'","\"x!\""],
	["jq -n -c '[.[]?] | try first catch \"rien\"'","null"],
	["jq -n -c 'try (1, error(\"e\"), 3) catch \"pris\"'","1\n\"pris\""],
	["jq -n -c '[(1, 2) | try error catch .]'","[1,2]"],
	["jq -n -c '.a?.b?'","null"],
	["jq -n -c '\"x\" | .a?'",""],
	["jq -n -c '[1, \"a\"] | map(.b?)'","[]"],
	["jq -n -c '(1, null) | if . then \"oui\" else \"non\" end'","\"oui\"\n\"non\""],
	["jq -n -c 'if empty then 1 else 2 end'",""],
	["jq -n -c 'if (true, false) then 1 else 2 end'","1\n2"],
	["jq -n -c 'if 1 then 2 end'","2"],
	["jq -n -c '[1, 2, 3] | if length > 2 then \"long\" elif length > 1 then \"moyen\" else \"court\" end'","\"long\""],
	["jq -n -c 'reduce empty as $x (0; . + 1)'","0"],
	["jq -n -c '[foreach (1, 2, 3) as $x ({}; .[$x | tostring] = $x)]'","[{\"1\":1},{\"1\":1,\"2\":2},{\"1\":1,\"2\":2,\"3\":3}]"],
	["jq -n -c '{\"a\": {\"b\": {\"c\": 1}}} | [paths]'","[[\"a\"],[\"a\",\"b\"],[\"a\",\"b\",\"c\"]]"],
	["jq -n -c '{\"a\": {\"b\": {\"c\": 1}}} | [paths | join(\".\")]'","[\"a\",\"a.b\",\"a.b.c\"]"],
	["jq -n -c '{\"a\": [{\"b\": 1}]} | [paths(numbers)]'","[[\"a\",0,\"b\"]]"],
	["jq -n -c '{\"a\": 1, \"b\": {\"c\": 2}} | [.. | numbers]'","[1,2]"],
	["jq -n -c '[{\"a\": 1}, {\"a\": 2}] | map(.a) | @csv'","\"1,2\""],
	["jq -n -c '[1, [2]] | tostring, tojson, (tojson | fromjson)'","\"[1,[2]]\"\n\"[1,[2]]\"\n[1,[2]]"],
	["jq -n -c '\"[1, 2]\" | fromjson | add'","3"],
	["jq -n -c '\"{a\" | fromjson'","","jq: error (at <unknown>): Invalid numeric literal at EOF at line 1, column 2 (while parsing '{a')"],
	["jq -n -c '\"12abc\" | tonumber'","","jq: error (at <unknown>): Invalid numeric literal at EOF at line 1, column 5 (while parsing '12abc')"],
	["jq -n -c '[1, 2, 3] | IN(2)'","false"],
	["jq -n -c '2 | IN(1, 2)'","true"],
	["jq -n -c '[3, 1] | min_by(.), max_by(.)'","1\n3"],
	["jq -n -c '[{\"a\": 1}, {\"a\": 1}, {\"a\": 2}] | unique_by(.a) | length'","2"],
	["jq -n -c '[1, 2, 1, 3, 2] | unique, group_by(.)'","[1,2,3]\n[[1,1],[2,2],[3]]"],
	["jq -n -c '{\"a\": [3, 1, 2]} | .a |= sort'","{\"a\":[1,2,3]}"],
	["jq -n -c '{} | .a += 1'","{\"a\":1}"],
	["jq -n -c '[[1, 2], [3]] | map(add) | add'","6"],
	["jq -n -c '[1, 2, 3] | add / length'","2"],
	["jq -n -c '[1, 2, 3, 4] | [.[] | select(. % 2 == 0)] | map(. * .)'","[4,16]"],
	["jq -n -c '{\"a\": \"x\"} | .a as $v | {($v): 1}'","{\"x\":1}"],
	["jq -n -c '{\"user\": \"ada\", \"id\": 7} | \"\\(.user)#\\(.id)\"'","\"ada#7\""],
	["jq -n -c '\"x\" | test(\"X\"; \"i\"), test(\"X\")'","true\nfalse"],
	["jq -n -c '\"Ada Lovelace\" | [match(\"[A-Z]\"; \"g\") | .string]'","[\"A\",\"L\"]"],
	["jq -n -c '\"Ada Lovelace\" | match(\"(?<p>\\\\w+) (?<n>\\\\w+)\") | [.captures[].name]'","[\"p\",\"n\"]"],
	["jq -n -c '\"Ada Lovelace\" | capture(\"(?<p>\\\\w+) (?<n>\\\\w+)\")'","{\"p\":\"Ada\",\"n\":\"Lovelace\"}"],
	["jq -n -c '\"abc\" | sub(\"(?<x>b)\"; \"[\\(.x)]\")'","\"a[b]c\""],
	["jq -n -c '\"aaa\" | gsub(\"a\"; \"b\")'","\"bbb\""],
	["jq -n -c '\"a.b.c\" | gsub(\"\\\\.\"; \"/\")'","\"a/b/c\""],
	["jq -n -c '\"  x  \" | ltrimstr(\" \"), rtrimstr(\" \")'","\" x  \"\n\"  x \""],
	["jq -n -c '\"abc\" | ascii_downcase | explode | map(. + 1) | implode'","\"bcd\""],
	["jq -n -c '[1, 2, 3] | any(. > 2), all(. > 0)'","true\ntrue"],
	["jq -n -c '[] | any, all'","false\ntrue"],
	["jq -n -c '[[1, 2], [3, 4]] | map(add)'","[3,7]"],
	["jq -n -c '{\"a\": null} | .a // \"défaut\", (.a | values) // \"rien\"'","\"défaut\"\n\"rien\""],
	["jq -n -c '[1, 2] | first(.[] | select(. > 5)) // \"aucun\"'","\"aucun\""],
	["jq -n -c '{\"a\": 1} | to_entries[0] | .key'","\"a\""],
	["jq -n -c '[1, 2, 3] | .[1:] | length'","2"],
	["jq -n -c '{\"b\": 1, \"a\": {\"d\": 1, \"c\": 2}}' -S","{\"a\":{\"c\":2,\"d\":1},\"b\":1}"],
	["jq -n -c 'now | type'","\"number\""],
	["jq -n -c '[1, 2] | map(tostring) | join(\" + \")'","\"1 + 2\""],
	["jq -n -c 'input' journal.ndjson","{\"t\":\"08:12\",\"niveau\":\"warn\",\"ip\":\"10.0.0.5\",\"msg\":\"login raté\"}"],
	["jq -c '.[0] | input_filename' eleves.json","\"eleves.json\""],
	["jq -n -c '[inputs] | length' journal.ndjson","4"],
	["jq -n -c 'reduce inputs as $l (0; . + 1)' journal.ndjson","4"],
	["jq -c -n '[inputs | select(.niveau == \"warn\")] | length' journal.ndjson","2"],
	["jq -R . liste.txt","\"un\"\n\"deux\"\n\"trois\"\n\"quatre\"\n\"cinq\""],
	["jq -R -s . liste.txt","\"un\\ndeux\\ntrois\\nquatre\\ncinq\\n\""],
	["jq -R -c 'split(\"\")' noms.txt","[\"A\",\"d\",\"a\"]\n[\"A\",\"l\",\"a\",\"n\"]\n[\"G\",\"r\",\"a\",\"c\",\"e\"]\n[\"L\",\"i\",\"n\",\"u\",\"s\"]"],
	["jq -c -R -n '[inputs]' noms.txt","[\"Ada\",\"Alan\",\"Grace\",\"Linus\"]"],
	["jq -r '.[] | select(.nom == \"Ada\") | .notes | map(tostring) | join(\",\")' eleves.json","15,18,12"],
	["cat eleves.json | jq '.[0].nom'","\"Ada\""],
	["cat eleves.json | jq -r '.[] | .nom' | sort -r","Linus\nGrace\nAlan\nAda"],
	["echo '{\"a\": 1, \"b\": [1, 2]}' | jq .b","[\n  1,\n  2\n]"],
	["echo '{\"a\": 1, \"b\": [1, 2]}' | jq","{\n  \"a\": 1,\n  \"b\": [\n    1,\n    2\n  ]\n}"],
	["echo '[3, 1, 2]' | jq -c 'sort'","[1,2,3]"],
	["echo '\"texte\"' | jq -r .","texte"],
	["echo '1 2 3' | jq -s add","6"],
	["echo '{\"a\":' | jq .a","","jq: parse error: Unfinished JSON term at EOF at line 2, column 0"],
	["echo '\"x\"' | jq '.a'","","jq: error (at <stdin>:1): Cannot index string with string \"a\""],
	["cat journal.ndjson | jq -r '.ip' | sort | uniq -c","      2 10.0.0.5\n      1 10.0.0.7\n      1 10.0.0.9"],
	["cat journal.ndjson | jq -c 'select(.niveau != \"info\") | {t, msg}'","{\"t\":\"08:12\",\"msg\":\"login raté\"}\n{\"t\":\"09:01\",\"msg\":\"login raté\"}\n{\"t\":\"09:15\",\"msg\":\"disque plein\"}"],
	["jq -r '.[] | select(.actif) | .mail // \"pas de mail\"' eleves.json | sort","linus@cybersup.ai\npas de mail\npas de mail"],
	["jq -r '.[] | \"\\(.nom),\\(.age)\"' eleves.json | sort -t , -k 2 -n","Ada,19\nLinus,19\nGrace,21\nAlan,22"],
	["jq -r '.utilisateurs | keys[]' config.json | xargs -n 1 echo utilisateur","utilisateur ada\nutilisateur bob"],
	["jq -c '.[] | {nom, ville: .adresse.ville}' eleves.json | grep Lille","{\"nom\":\"Ada\",\"ville\":\"Lille\"}"],
	["echo -n '[1,2]' | jq -c 'map(. + 1)'","[2,3]"],
	["jq -n '\"a b\" | @sh'","\"'a b'\""],
	["jq -n -r '[\"x y\", \"z\"] | @sh'","'x y' 'z'"],
	["jq -n '[1,2,3] | .[1:] | length'","2"],
	["jq -r '.[] | [.nom, (.notes | length)] | @tsv' eleves.json | column -t","Ada    3\nAlan   2\nGrace  0\nLinus  4"],
	["jq -n -c '$ENV.HOME | type'","\"string\""],
	["jq -n 'reduce range(1; 11) as $i (1; . * $i)'","3628800"],
	["jq -n '[range(100000)] | length'","100000"],
	["jq -n -c '[range(3)] | map(tostring) | join(\"-\")'","\"0-1-2\""],
	["jq -c 'to_entries[] | select(.key | startswith(\"s\"))' config.json","{\"key\":\"serveur\",\"value\":{\"nom\":\"web\",\"ports\":[80,443],\"tls\":{\"actif\":true,\"cert\":\"/etc/ssl/web.pem\"}}}"],
	["jq '.serveur.tls | keys | length' config.json","2"],
	["jq -c 'paths(..) | select(length == 1)' config.json","[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"serveur\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"utilisateurs\"]\n[\"version\"]\n[\"timeout\"]\n[\"vide\"]\n[\"clé spéciale\"]"],
	["jq -r '.version' config.json | cut -d . -f 1","2"],
	["jq -n 'now | floor | type'","\"number\""],
	["jq -n '\"\\(1 + 1)\"'","\"2\""],
	["jq -n -c '{\"a\": 1} | .a as $x | {b: $x}'","{\"b\":1}"],
	["jq -n -c '[1, 2, 3] | . as [$a, $b] | {$a, $b}'","{\"a\":1,\"b\":2}"],
	["jq -n -c '{$__loc__}'","{\"__loc__\":{\"file\":\"<top-level>\",\"line\":1}}"],
	["jq -n -c '\"abc\" | [.[]?]'","[]"],
	["jq -n -c '[{\"a\":1},{\"a\":null},{}] | map(.a // \"?\")'","[1,\"?\",\"?\"]"],
	["jq -n -c 'try ([1] | .a) catch .'","\"Cannot index array with string \\\"a\\\"\""],
	["jq -n -c '.. '","null"],
	["jq -n -c '[1, [2]] | [..]'","[[1,[2]],1,[2],2]"],
	["jq -n -c '{\"a\": [1, {\"b\": 2}]} | [.. | scalars]'","[1,2]"],
	["jq -n -c '[1, 2, 3] | map(select(. > 1)) | first'","2"],
	["jq -n -c '{\"a\":{\"b\":1}} | has(\"a\"), (.a | has(\"b\"))'","true\ntrue"],
	["jq --arg nom Ada -c '.[] | select(.nom == $nom) | .notes' eleves.json","[15,18,12]"],
	["jq --argjson min 20 -r '.[] | select(.age >= $min) | .nom' eleves.json","Alan\nGrace"],
	["jq -n --arg x 1 --arg y 2 '$x + $y'","\"12\""],
	["jq -n --argjson x 1 --argjson y 2 '$x + $y'","3"],
	["cat liste.txt | xargs","un deux trois quatre cinq"],
	["cat liste.txt | xargs echo","un deux trois quatre cinq"],
	["cat liste.txt | xargs -n 2","un deux\ntrois quatre\ncinq"],
	["cat liste.txt | xargs -n 2 echo mot:","mot: un deux\nmot: trois quatre\nmot: cinq"],
	["cat liste.txt | xargs -n1 echo","un\ndeux\ntrois\nquatre\ncinq"],
	["cat liste.txt | xargs -I {} echo \"<{}>\"","<un>\n<deux>\n<trois>\n<quatre>\n<cinq>"],
	["cat liste.txt | xargs -I X echo X et X","un et un\ndeux et deux\ntrois et trois\nquatre et quatre\ncinq et cinq"],
	["cat liste.txt | xargs -t -n 3 echo","un deux trois\nquatre cinq","echo un deux trois\necho quatre cinq"],
	["cat liste.txt | xargs -d e echo","un\nd ux\ntrois\nquatr \ncinq"],
	["echo \"a,b,,c\" | xargs -d , -n 1 echo","a\nb\n\nc"],
	["echo \"un 'deux trois' quatre\" | xargs -n 1","un\ndeux trois\nquatre"],
	["echo 'un \"deux trois\" quatre' | xargs -n 1","un\ndeux trois\nquatre"],
	["echo 'un\\ deux trois' | xargs -n 1","un deux\ntrois"],
	["echo \"\" | xargs echo vide","vide"],
	["echo \"\" | xargs -r echo vide",""],
	["cat noms.txt | xargs -n 2 echo | wc -l","2"],
	["ls *.txt | xargs wc -l | tail -1"," 292 total"],
	["echo noms.txt ages.txt | xargs cat","Ada\nAlan\nGrace\nLinus\n19\n22\n21"],
	["echo \"it's\" | xargs echo","","xargs: unmatched single quote; by default quotes are special to xargs unless you use the -0 option"],
	["cat liste.txt | xargs -0 echo","un\ndeux\ntrois\nquatre\ncinq"],
	["echo ages.txt | xargs grep 2","22\n21"],
	["find arbre | sort","arbre\narbre/Script.sh\narbre/gros.txt\narbre/journaux\narbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux\narbre/journaux/vieux/2025.log\narbre/notes.txt\narbre/tmp\narbre/tmp/a.tmp\narbre/tmp/b.tmp\narbre/vide"],
	["find arbre -type d | sort","arbre\narbre/journaux\narbre/journaux/vieux\narbre/tmp\narbre/vide"],
	["find arbre -type f | sort","arbre/Script.sh\narbre/gros.txt\narbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log\narbre/notes.txt\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -name \"*.log\" | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log"],
	["find arbre -iname \"script*\"","arbre/Script.sh"],
	["find arbre -name \"*.tmp\" -o -name \"*.sh\" | sort","arbre/Script.sh\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre \\( -name \"*.tmp\" -o -name \"*.sh\" \\) -type f | sort","arbre/Script.sh\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -type f ! -name \"*.log\" | sort","arbre/Script.sh\narbre/gros.txt\narbre/notes.txt\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -type f -not -name \"*.log\" -not -name \"*.tmp\" | sort","arbre/Script.sh\narbre/gros.txt\narbre/notes.txt"],
	["find arbre -maxdepth 1 | sort","arbre\narbre/Script.sh\narbre/gros.txt\narbre/journaux\narbre/notes.txt\narbre/tmp\narbre/vide"],
	["find arbre -maxdepth 1 -type f | sort","arbre/Script.sh\narbre/gros.txt\narbre/notes.txt"],
	["find arbre -mindepth 2 | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux\narbre/journaux/vieux/2025.log\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -mindepth 1 -maxdepth 1 -type d | sort","arbre/journaux\narbre/tmp\narbre/vide"],
	["find arbre -empty | sort","arbre/journaux/erreurs.log\narbre/vide"],
	["find arbre -type f -empty","arbre/journaux/erreurs.log"],
	["find arbre -type d -empty","arbre/vide"],
	["find arbre -size -1k | sort","arbre/journaux/erreurs.log"],
	["find arbre -type f -size -2 | sort","arbre/Script.sh\narbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log\narbre/notes.txt\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -size 1 -type f | sort","arbre/Script.sh\narbre/journaux/acces.log\narbre/journaux/vieux/2025.log\narbre/notes.txt\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -name \"*.tmp\" -exec cat {} \\;","brouillon a\nbrouillon b"],
	["find arbre -name \"*.log\" -exec wc -l {} \\; | sort","0 arbre/journaux/erreurs.log\n1 arbre/journaux/vieux/2025.log\n3 arbre/journaux/acces.log"],
	["find arbre -name \"*.tmp\" -exec echo trouvé {} \\; | sort","trouvé arbre/tmp/a.tmp\ntrouvé arbre/tmp/b.tmp"],
	["find arbre -name \"*.tmp\" -exec echo {} +","arbre/tmp/a.tmp arbre/tmp/b.tmp"],
	["find arbre -name \"*.tmp\" -delete; find arbre | sort","arbre\narbre/Script.sh\narbre/gros.txt\narbre/journaux\narbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux\narbre/journaux/vieux/2025.log\narbre/notes.txt\narbre/tmp\narbre/vide"],
	["find arbre -type d -name vide -delete; ls arbre | sort","Script.sh\ngros.txt\njournaux\nnotes.txt\ntmp"],
	["find arbre -name \"*.tmp\" -print -delete | sort","arbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -path \"*journaux*\" -type f | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log"],
	["find arbre -name \"a.tmp\" -print","arbre/tmp/a.tmp"],
	["find arbre -name \"*.tmp\" -exec grep -l a {} \\;","arbre/tmp/a.tmp"],
	["find arbre/journaux arbre/tmp -type f | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -type f -name \"*.log\" -o -type d -name tmp | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log\narbre/tmp"],
	["find arbre -maxdepth 2 -name \"*.log\" | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log"],
	["find arbre/notes.txt","arbre/notes.txt"],
	["find arbre -name '[ab].tmp' | sort","arbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -name '*.[lt][om][gp]' | sort","arbre/journaux/acces.log\narbre/journaux/erreurs.log\narbre/journaux/vieux/2025.log\narbre/tmp/a.tmp\narbre/tmp/b.tmp"],
	["find arbre -name '*.tmp' -print0 | xargs -0 cat","brouillon a\nbrouillon b"],
	["find arbre/tmp -type f -print0 | sort -z | xargs -0 -n 1 echo fichier","fichier arbre/tmp/a.tmp\nfichier arbre/tmp/b.tmp"],
	["find arbre -name '*.log' -print0 | xargs -0 wc -l | sort"," 0 arbre/journaux/erreurs.log\n 1 arbre/journaux/vieux/2025.log\n 3 arbre/journaux/acces.log\n 4 total"],
	["find arbre -type d -empty -print0 | xargs -0 -I {} echo vide: {}","vide: arbre/vide"],
	["diff v1.txt v2.txt","4d3\n< port 23 = ouvert\n6a6\n> port 8443 = ouvert\n11c11\n< admin = laurent\n---\n> admin = myriam"],
	["diff v1.txt v3.txt","1c1\n< # Configuration du pare-feu\n---\n> # Configuration du pare-feu (copie de Myriam)\n8c8\n< niveau = info\n---\n> niveau = debug"],
	["diff v2.txt v3.txt","1c1\n< # Configuration du pare-feu\n---\n> # Configuration du pare-feu (copie de Myriam)\n3a4\n> port 23 = ouvert\n6d6\n< port 8443 = ouvert\n8c8\n< niveau = info\n---\n> niveau = debug\n11c11\n< admin = myriam\n---\n> admin = laurent"],
	["diff v1.txt v1.txt",""],
	["diff -u v1.txt v2.txt | tail -n +3","@@ -1,12 +1,12 @@\n # Configuration du pare-feu\n politique = refuser\n port 22 = ouvert\n-port 23 = ouvert\n port 80 = ouvert\n port 443 = ouvert\n+port 8443 = ouvert\n journal = oui\n niveau = info\n rotation = 7\n alertes = mail\n-admin = laurent\n+admin = myriam\n # fin"],
	["diff -u v1.txt v3.txt | tail -n +3","@@ -1,11 +1,11 @@\n-# Configuration du pare-feu\n+# Configuration du pare-feu (copie de Myriam)\n politique = refuser\n port 22 = ouvert\n port 23 = ouvert\n port 80 = ouvert\n port 443 = ouvert\n journal = oui\n-niveau = info\n+niveau = debug\n rotation = 7\n alertes = mail\n admin = laurent"],
	["diff -U1 v1.txt v2.txt | tail -n +3","@@ -3,5 +3,5 @@\n port 22 = ouvert\n-port 23 = ouvert\n port 80 = ouvert\n port 443 = ouvert\n+port 8443 = ouvert\n journal = oui\n@@ -10,3 +10,3 @@\n alertes = mail\n-admin = laurent\n+admin = myriam\n # fin"],
	["diff -U 0 v1.txt v2.txt | tail -n +3","@@ -4 +3,0 @@\n-port 23 = ouvert\n@@ -6,0 +6 @@\n+port 8443 = ouvert\n@@ -11 +11 @@\n-admin = laurent\n+admin = myriam"],
	["diff -U8 v1.txt v2.txt | tail -n +3","@@ -1,12 +1,12 @@\n # Configuration du pare-feu\n politique = refuser\n port 22 = ouvert\n-port 23 = ouvert\n port 80 = ouvert\n port 443 = ouvert\n+port 8443 = ouvert\n journal = oui\n niveau = info\n rotation = 7\n alertes = mail\n-admin = laurent\n+admin = myriam\n # fin"],
	["diff -q v1.txt v2.txt","Files v1.txt and v2.txt differ"],
	["diff -s v1.txt v1.txt","Files v1.txt and v1.txt are identical"],
	["diff -q v1.txt v1.txt",""],
	["diff noms.txt liste.txt","1,4c1,5\n< Ada\n< Alan\n< Grace\n< Linus\n---\n> un\n> deux\n> trois\n> quatre\n> cinq"],
	["diff comptes-hier.txt comptes.txt","2d1\n< bob\n4c3,4\n< dave\n---\n> eve\n> mallory"],
	["diff -u comptes-hier.txt comptes.txt | tail -n +3","@@ -1,4 +1,4 @@\n ada\n-bob\n carol\n-dave\n+eve\n+mallory"],
	["diff ages.txt noms.txt","1,3c1,4\n< 19\n< 22\n< 21\n---\n> Ada\n> Alan\n> Grace\n> Linus"],
	["diff -u ages.txt noms.txt | tail -n +3","@@ -1,3 +1,4 @@\n-19\n-22\n-21\n+Ada\n+Alan\n+Grace\n+Linus"],
	["cat v2.txt | diff v1.txt -","4d3\n< port 23 = ouvert\n6a6\n> port 8443 = ouvert\n11c11\n< admin = laurent\n---\n> admin = myriam"],
	["cat v2.txt | diff -u v1.txt - | tail -n +3","@@ -1,12 +1,12 @@\n # Configuration du pare-feu\n politique = refuser\n port 22 = ouvert\n-port 23 = ouvert\n port 80 = ouvert\n port 443 = ouvert\n+port 8443 = ouvert\n journal = oui\n niveau = info\n rotation = 7\n alertes = mail\n-admin = laurent\n+admin = myriam\n # fin"],
	["diff -u v1.txt v2.txt > c.diff; patch v1.txt c.diff; cat v1.txt","patching file v1.txt\n# Configuration du pare-feu\npolitique = refuser\nport 22 = ouvert\nport 80 = ouvert\nport 443 = ouvert\nport 8443 = ouvert\njournal = oui\nniveau = info\nrotation = 7\nalertes = mail\nadmin = myriam\n# fin"],
	["diff -u v1.txt v2.txt > c.diff; cat c.diff | patch v1.txt; cat v1.txt","patching file v1.txt\n# Configuration du pare-feu\npolitique = refuser\nport 22 = ouvert\nport 80 = ouvert\nport 443 = ouvert\nport 8443 = ouvert\njournal = oui\nniveau = info\nrotation = 7\nalertes = mail\nadmin = myriam\n# fin"],
	["diff -u v1.txt v2.txt > c.diff; cat c.diff | patch; cat v1.txt","patching file v1.txt\n# Configuration du pare-feu\npolitique = refuser\nport 22 = ouvert\nport 80 = ouvert\nport 443 = ouvert\nport 8443 = ouvert\njournal = oui\nniveau = info\nrotation = 7\nalertes = mail\nadmin = myriam\n# fin"],
	["diff -u v1.txt v2.txt > c.diff; patch v1.txt c.diff; patch -R v1.txt c.diff; diff v1.txt v3.txt","patching file v1.txt\npatching file v1.txt\n1c1\n< # Configuration du pare-feu\n---\n> # Configuration du pare-feu (copie de Myriam)\n8c8\n< niveau = info\n---\n> niveau = debug"],
	["diff -u v1.txt v2.txt > c.diff; patch --dry-run v1.txt c.diff; cat v1.txt | head -4","checking file v1.txt\n# Configuration du pare-feu\npolitique = refuser\nport 22 = ouvert\nport 23 = ouvert"],
	["diff -u v1.txt v2.txt > c.diff; cat c.diff | patch -p0; cat v1.txt","patching file v1.txt\n# Configuration du pare-feu\npolitique = refuser\nport 22 = ouvert\nport 80 = ouvert\nport 443 = ouvert\nport 8443 = ouvert\njournal = oui\nniveau = info\nrotation = 7\nalertes = mail\nadmin = myriam\n# fin"],
	["diff -u v1.txt v2.txt > c.diff; patch -R v1.txt c.diff","patching file v1.txt\nUnreversed patch detected!  Ignore -R? [n] \nApply anyway? [n] \nSkipping patch.\n1 out of 1 hunk ignored -- saving rejects to file v1.txt.rej"],
	["echo \"pas un diff\" > c.diff; patch v1.txt c.diff","","patch: **** Only garbage was found in the patch input."],
	["diff -u liste.txt noms.txt > c.diff; patch liste.txt c.diff; cat liste.txt","patching file liste.txt\nAda\nAlan\nGrace\nLinus"],
	["diff -u v1.txt v2.txt > c.diff; patch -N v2.txt c.diff","patching file v2.txt\nReversed (or previously applied) patch detected!  Skipping patch.\n1 out of 1 hunk ignored -- saving rejects to file v2.txt.rej"],
	["diff s30.txt s30b.txt","5c5,7\n< 5\n---\n> cinq\n> cinq2\n> cinq3\n12d13\n< 12\n20c21\n< 20\n---\n> vingt\n28c29\n< 28\n---\n> 28b"],
	["diff -u s30.txt s30b.txt | tail -n +3","@@ -2,14 +2,15 @@\n 2\n 3\n 4\n-5\n+cinq\n+cinq2\n+cinq3\n 6\n 7\n 8\n 9\n 10\n 11\n-12\n 13\n 14\n 15\n@@ -17,7 +18,7 @@\n 17\n 18\n 19\n-20\n+vingt\n 21\n 22\n 23\n@@ -25,6 +26,6 @@\n 25\n 26\n 27\n-28\n+28b\n 29\n 30"],
	["diff -u s30.txt s30b.txt > c.diff; patch s32.txt c.diff | cat","patching file s32.txt\nHunk #1 succeeded at 4 (offset 2 lines).\nHunk #2 succeeded at 20 (offset 2 lines).\nHunk #3 succeeded at 28 (offset 2 lines)."],
	["diff -u s30.txt s30b.txt > c.diff; patch s32.txt c.diff > /dev/null; cat s32.txt","x\ny\n1\n2\n3\n4\ncinq\ncinq2\ncinq3\n6\n7\n8\n9\n10\n11\n13\n14\n15\n16\n17\n18\n19\nvingt\n21\n22\n23\n24\n25\n26\n27\n28b\n29\n30"],
	["diff -u s30.txt s30b.txt > c.diff; patch s32v.txt c.diff | cat","patching file s32v.txt\nHunk #1 succeeded at 4 (offset 2 lines).\nHunk #2 FAILED at 18.\nHunk #3 succeeded at 28 (offset 2 lines).\n1 out of 3 hunks FAILED -- saving rejects to file s32v.txt.rej"],
	["diff -u s30.txt s30b.txt > c.diff; patch s32v.txt c.diff > /dev/null; cat s32v.txt.rej | tail -n +3","@@ -18,7 +19,7 @@\n 17\n 18\n 19\n-20\n+vingt\n 21\n 22\n 23"],
	["diff -u s30.txt s30b.txt > c.diff; patch s29.txt c.diff | cat","patching file s29.txt\nHunk #1 FAILED at 2.\nHunk #2 succeeded at 16 (offset -1 lines).\nHunk #3 succeeded at 24 (offset -1 lines).\n1 out of 3 hunks FAILED -- saving rejects to file s29.txt.rej"],
	["diff -u s30.txt s30b.txt > c.diff; patch s30z.txt c.diff | cat","patching file s30z.txt\nHunk #3 succeeded at 26 with fuzz 2."],
	["diff -u s30.txt s30b.txt > c.diff; patch s30z.txt c.diff > /dev/null; cat s30z.txt","1\n2\n3\n4\ncinq\ncinq2\ncinq3\n6\n7\n8\n9\n10\n11\n13\n14\n15\n16\n17\n18\n19\nvingt\n21\n22\n23\n24\n25\nZ\n27\n28b\n29\n30"],
	["diff -u s30.txt s30b.txt > c.diff; patch s30f.txt c.diff | cat","patching file s30f.txt\nHunk #1 succeeded at 2 with fuzz 1."],
	["diff -u s30.txt s30b.txt > c.diff; patch s30f.txt c.diff > /dev/null; diff s30f.txt s30b.txt","2c2\n< DEUX\n---\n> 2"],
	["diff -u s30.txt s30b.txt > c.diff; patch s30b.txt c.diff | cat","patching file s30b.txt\nReversed (or previously applied) patch detected!  Assume -R? [n] \nApply anyway? [n] \nSkipping patch.\n3 out of 3 hunks ignored -- saving rejects to file s30b.txt.rej"],
	["diff -u s30.txt s30b.txt > c.diff; patch -R s30b.txt c.diff | cat; diff s30.txt s30b.txt","patching file s30b.txt"],
	["diff -u s30.txt s30b.txt > c.diff; patch -R s30.txt c.diff | cat","patching file s30.txt\nUnreversed patch detected!  Ignore -R? [n] \nApply anyway? [n] \nSkipping patch.\n3 out of 3 hunks ignored -- saving rejects to file s30.txt.rej"],
	["diff -u s30.txt s30b.txt > c.diff; patch --dry-run s32.txt c.diff | cat; diff s32.txt s32.txt","checking file s32.txt\nHunk #1 succeeded at 4 (offset 2 lines).\nHunk #2 succeeded at 20 (offset 2 lines).\nHunk #3 succeeded at 28 (offset 2 lines)."],
	["diff -U1 s30.txt s30b.txt > c.diff; patch s30f.txt c.diff | cat","patching file s30f.txt"],
	["diff -U0 s30.txt s30b.txt > c.diff; patch s32.txt c.diff | cat","patching file s32.txt\nHunk #1 succeeded at 7 (offset 2 lines).\nHunk #2 succeeded at 16 (offset 2 lines).\nHunk #3 succeeded at 23 (offset 2 lines).\nHunk #4 succeeded at 31 (offset 2 lines)."],
	["diff -U0 s30.txt s30b.txt > c.diff; patch s32.txt c.diff > /dev/null; diff s32.txt s30b.txt","1,2d0\n< x\n< y"],
	["diff -u s30.txt s30b.txt > c.diff; patch s32.txt c.diff > /dev/null; ls s32.txt*","s32.txt\ns32.txt.orig"],
	["diff -u s30.txt s30b.txt > c.diff; patch s30.txt c.diff > /dev/null; ls s30.txt*","s30.txt"],
	["paste noms.txt ages.txt","Ada\t19\nAlan\t22\nGrace\t21\nLinus\t"],
	["paste -d , noms.txt ages.txt","Ada,19\nAlan,22\nGrace,21\nLinus,"],
	["paste -d ':;' noms.txt ages.txt liste.txt","Ada:19;un\nAlan:22;deux\nGrace:21;trois\nLinus:;quatre\n:;cinq"],
	["paste -s noms.txt","Ada\tAlan\tGrace\tLinus"],
	["paste -s -d , noms.txt","Ada,Alan,Grace,Linus"],
	["paste -sd + ages.txt","19+22+21"],
	["paste -s noms.txt ages.txt","Ada\tAlan\tGrace\tLinus\n19\t22\t21"],
	["cat liste.txt | paste - -","un\tdeux\ntrois\tquatre\ncinq\t"],
	["cat liste.txt | paste - - -","un\tdeux\ttrois\nquatre\tcinq\t"],
	["cat noms.txt | paste ages.txt -","19\tAda\n22\tAlan\n21\tGrace\n\tLinus"],
	["paste -d '' noms.txt ages.txt","Ada19\nAlan22\nGrace21\nLinus"],
	["paste -d '\\n' noms.txt ages.txt","Ada\n19\nAlan\n22\nGrace\n21\nLinus"],
	["paste -d '\\t,' noms.txt ages.txt liste.txt","Ada\t19,un\nAlan\t22,deux\nGrace\t21,trois\nLinus\t,quatre\n\t,cinq"],
	["join id-noms.txt id-notes.txt","1 Ada 15\n2 Alan 9\n2 Alan 14\n5 Linus 18"],
	["join -a 1 id-noms.txt id-notes.txt","1 Ada 15\n2 Alan 9\n2 Alan 14\n3 Grace\n5 Linus 18"],
	["join -a 2 id-noms.txt id-notes.txt","1 Ada 15\n2 Alan 9\n2 Alan 14\n4 11\n5 Linus 18"],
	["join -a 1 -a 2 id-noms.txt id-notes.txt","1 Ada 15\n2 Alan 9\n2 Alan 14\n3 Grace\n4 11\n5 Linus 18"],
	["join -v 1 id-noms.txt id-notes.txt","3 Grace"],
	["join -v 2 id-noms.txt id-notes.txt","4 11"],
	["join -t : uid.txt shells.txt","ada:1000:dev:/bin/bash\nbob:1001:dev:/bin/zsh"],
	["join -t : -a 1 uid.txt shells.txt","ada:1000:dev:/bin/bash\nbob:1001:dev:/bin/zsh\neve:1003:invite"],
	["join -t : -o 1.1,2.2,1.2 uid.txt shells.txt","ada:/bin/bash:1000\nbob:/bin/zsh:1001"],
	["join -t : -e VIDE -a 1 -a 2 -o 0,1.2,2.2 uid.txt shells.txt","ada:1000:/bin/bash\nbob:1001:/bin/zsh\ncarol:VIDE:/bin/sh\neve:1003:VIDE"],
	["join -1 1 -2 1 id-noms.txt id-notes.txt","1 Ada 15\n2 Alan 9\n2 Alan 14\n5 Linus 18"],
	["join -t , -1 2 -2 1 ventes.csv ventes.csv","","join: ventes.csv:2: is not sorted: sweat,3,35\njoin: ventes.csv:4: is not sorted: casquette,5,15\njoin: input is not in sorted order"],
	["join noms.txt liste.txt","","join: liste.txt:2: is not sorted: deux\njoin: input is not in sorted order"],
	["join liste.txt noms.txt","","join: liste.txt:2: is not sorted: deux\njoin: input is not in sorted order"],
	["comm comptes-hier.txt comptes.txt","\t\tada\nbob\n\t\tcarol\ndave\n\teve\n\tmallory"],
	["comm -12 comptes-hier.txt comptes.txt","ada\ncarol"],
	["comm -23 comptes-hier.txt comptes.txt","bob\ndave"],
	["comm -13 comptes-hier.txt comptes.txt","eve\nmallory"],
	["comm -3 comptes-hier.txt comptes.txt","bob\ndave\n\teve\n\tmallory"],
	["comm -1 comptes-hier.txt comptes.txt","\tada\n\tcarol\neve\nmallory"],
	["comm -2 comptes-hier.txt comptes.txt","\tada\nbob\n\tcarol\ndave"],
	["comm -123 comptes-hier.txt comptes.txt",""],
	["cat comptes.txt | comm - comptes-hier.txt","\t\tada\n\tbob\n\t\tcarol\n\tdave\neve\nmallory"],
	["comm --output-delimiter=' | ' comptes-hier.txt comptes.txt"," |  | ada\nbob\n |  | carol\ndave\n | eve\n | mallory"],
	["comm liste.txt noms.txt","\tAda\n\tAlan\n\tGrace\n\tLinus\nun\ndeux\ntrois\nquatre\ncinq","comm: file 1 is not in sorted order\ncomm: input is not in sorted order"],
	["column -t tableau.txt","NOM     PORT  ETAT\nsshd    22    ouvert\nnginx   443   ouvert\ntelnet  23    ferme"],
	["column -t -s , ventes.csv","produit    quantite  prix\nsweat      3         35\ntasse      10        8\ncasquette  5         15"],
	["column -t -s : uid.txt","ada  1000  dev\nbob  1001  dev\neve  1003  invite"],
	["column -t -s , -o ' | ' ventes.csv","produit   | quantite | prix\nsweat     | 3        | 35\ntasse     | 10       | 8\ncasquette | 5        | 15"],
	["cat liste.txt | column","un\tdeux\ttrois\tquatre\tcinq"],
	["cat liste.txt | column -c 30","un\ttrois\tcinq\ndeux\tquatre"],
	["cat liste.txt | column -x -c 30","un\tdeux\ttrois\nquatre\tcinq"],
	["column tableau.txt","NOM PORT ETAT\t\tnginx 443 ouvert\nsshd 22 ouvert\t\ttelnet 23 ferme"],
	["cat noms.txt liste.txt ages.txt | column -c 40","Ada\tLinus\ttrois\t19\nAlan\tun\tquatre\t22\nGrace\tdeux\tcinq\t21"],
	["tac noms.txt","Linus\nGrace\nAlan\nAda"],
	["tac noms.txt ages.txt","Linus\nGrace\nAlan\nAda\n21\n22\n19"],
	["cat liste.txt | tac","cinq\nquatre\ntrois\ndeux\nun"],
	["tac liste.txt | head -2","cinq\nquatre"],
	["echo -n \"\" | tac",""],
	["column -t -s : shells.txt","ada    /bin/bash\nbob    /bin/zsh\ncarol  /bin/sh"],
	["paste noms.txt ages.txt | column -t","Ada    19\nAlan   22\nGrace  21\nLinus  "],
	["rsync -av src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\nbrouillon.tmp\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -av src/ dst > /dev/null; find dst | sort","dst\ndst/brouillon.tmp\ndst/img\ndst/img/logo.svg\ndst/index.html\ndst/perime.html\ndst/style.css"],
	["rsync -av src/ dst > /dev/null; cat dst/index.html","<h1>Accueil</h1>"],
	["rsync -av src/ dst > /dev/null; rsync -av src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list"],
	["rsync -avn src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\nbrouillon.tmp\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -avn src/ dst > /dev/null; find dst | sort","dst\ndst/index.html\ndst/perime.html"],
	["rsync -av --delete src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ndeleting perime.html\nbrouillon.tmp\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -av --delete src/ dst > /dev/null; find dst | sort","dst\ndst/brouillon.tmp\ndst/img\ndst/img/logo.svg\ndst/index.html\ndst/style.css"],
	["rsync -avn --delete src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ndeleting perime.html\nbrouillon.tmp\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -av --exclude '*.tmp' src/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -av --delete --exclude '*.tmp' src/ dst > /dev/null; find dst | sort","dst\ndst/img\ndst/img/logo.svg\ndst/index.html\ndst/style.css"],
	["rsync -av --exclude img src/ dst > /dev/null; find dst | sort","dst\ndst/brouillon.tmp\ndst/index.html\ndst/perime.html\ndst/style.css"],
	["rsync -av --exclude 'img/' src/ dst > /dev/null; find dst | sort","dst\ndst/brouillon.tmp\ndst/index.html\ndst/perime.html\ndst/style.css"],
	["rsync -av src dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\nsrc/\nsrc/brouillon.tmp\nsrc/index.html\nsrc/style.css\nsrc/img/\nsrc/img/logo.svg"],
	["rsync -av src dst > /dev/null; find dst | sort","dst\ndst/index.html\ndst/perime.html\ndst/src\ndst/src/brouillon.tmp\ndst/src/img\ndst/src/img/logo.svg\ndst/src/index.html\ndst/src/style.css"],
	["rsync -av src neuf | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ncreated directory neuf\nsrc/\nsrc/brouillon.tmp\nsrc/index.html\nsrc/style.css\nsrc/img/\nsrc/img/logo.svg"],
	["rsync -av src/ neuf | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ncreated directory neuf\n./\nbrouillon.tmp\nindex.html\nstyle.css\nimg/\nimg/logo.svg"],
	["rsync -av src/ neuf/ > /dev/null; find neuf | sort","neuf\nneuf/brouillon.tmp\nneuf/img\nneuf/img/logo.svg\nneuf/index.html\nneuf/style.css"],
	["rsync -r src/ dst; find dst | sort","dst\ndst/brouillon.tmp\ndst/img\ndst/img/logo.svg\ndst/index.html\ndst/perime.html\ndst/style.css"],
	["rsync src/index.html copie.html; cat copie.html","<h1>Accueil</h1>"],
	["rsync -av src/index.html src/style.css dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\nindex.html\nstyle.css"],
	["rsync -av arbre/journaux arbre/tmp sauve | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ncreated directory sauve\njournaux/\njournaux/acces.log\njournaux/erreurs.log\njournaux/vieux/\njournaux/vieux/2025.log\ntmp/\ntmp/a.tmp\ntmp/b.tmp"],
	["rsync -av --delete arbre/ dst | grep -v -e '^sent ' -e '^total size'","sending incremental file list\ndeleting perime.html\ndeleting index.html\nScript.sh\ngros.txt\nnotes.txt\njournaux/\njournaux/acces.log\njournaux/erreurs.log\njournaux/vieux/\njournaux/vieux/2025.log\ntmp/\ntmp/a.tmp\ntmp/b.tmp\nvide/"],
	["rsync -a --exclude 'journaux/vieux' arbre/ copie; find copie | sort","copie\ncopie/Script.sh\ncopie/gros.txt\ncopie/journaux\ncopie/journaux/acces.log\ncopie/journaux/erreurs.log\ncopie/notes.txt\ncopie/tmp\ncopie/tmp/a.tmp\ncopie/tmp/b.tmp\ncopie/vide"]
];

function nouveauJeu(stockage){
	var jeu = monde.nouveauMonde(stockage);
	// Tous les sorts connus et déjà employés : la sortie n'est pas mêlée de récompenses.
	jeu.lire("tousLesSorts().concat(SORTS_ARCANES, ['nl', 'fold', 'rev']).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });" +
		"Shell.fin = function(){ Shell.narration = []; };");
	jeu.taper("cd ~");
	jeu.lire("function poserArcanes(chemin, texte){" +
		" var morceaux = chemin.split('/'), lieu = current_room;" +
		" for (var k = 0; k < morceaux.length - 1; k++){ var suivant = lieu.getNode(morceaux[k]); if (!(suivant instanceof Room)) suivant = null;" +
		"   if (!suivant){ suivant = new Room(morceaux[k], 'test'); suivant.owner = JOUEUR; suivant.mode = 'rwxr-xr-x'; link_rooms(lieu, suivant); } lieu = suivant; }" +
		" var nom = morceaux[morceaux.length - 1]; if (nom === '') return;" +
		" var a = lieu.getNode(nom); if (a && !(a instanceof Room)) lieu.removeItem(a);" +
		" var it = new Item(nom, texte.replace(/\\n$/, '')); it.owner = JOUEUR; lieu.addItem(it); }" +
		"function viderArcanes(){ current_room.children.slice().forEach(function(l){ if (l.owner === JOUEUR && !l.id) current_room.removeChild(l); });" +
		" current_room.items.slice().forEach(function(it){ if (it.owner === JOUEUR) current_room.removeItem(it); }); }");
	return jeu;
}
function poser(jeu){
	jeu.lire("viderArcanes()");
	Object.keys(FICHIERS).forEach(function(nom){ jeu.lire("poserArcanes(" + JSON.stringify(nom) + ", " + JSON.stringify(FICHIERS[nom] || "") + ")"); });
}
function sansFin(t){ return t.replace(/\n+$/, ""); }

/* --- 1. Les mêmes réponses que les vrais outils --- */
var STOCKAGE = {};
var jeu = nouveauJeu(STOCKAGE);
CAS.forEach(function(c){
	poser(jeu);
	var sortie = sansFin(jeu.taper(c[0] + " 2>/dev/null | cat"));
	if (bavard) console.log("$ " + c[0] + "\n" + sortie);
	egal(sortie, c[1], c[0]);
	if (c.length > 2){
		poser(jeu);
		egal(sansFin(jeu.taper(c[0] + " 2>&1 >/dev/null | cat")), c[2], c[0] + " (sortie d'erreur)");
	}
});

/* --- 1 bis. Revérifier les attendus avec les vrais outils (node tests/arcanes.js --gnu) --- */
if (process.argv.indexOf("--gnu") > -1){
	var cp = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
	var dossier = fs.mkdtempSync(path.join(os.tmpdir(), "terminus-arcanes-"));
	var revus = 0;
	CAS.forEach(function(c){
		fs.readdirSync(dossier).forEach(function(f){ cp.execFileSync("rm", ["-rf", path.join(dossier, f)]); });
		Object.keys(FICHIERS).forEach(function(nom){
			var complet = path.join(dossier, nom);
			if (/\/$/.test(nom)){ fs.mkdirSync(complet, { recursive: true }); return; }
			fs.mkdirSync(path.dirname(complet), { recursive: true });
			fs.writeFileSync(complet, FICHIERS[nom]);
		});
		var r = cp.spawnSync("bash", ["-c", c[0]], { cwd: dossier, env: Object.assign({}, process.env, { LC_ALL: "C.UTF-8" }), encoding: "utf8" });
		egal(sansFin(r.stdout || ""), c[1], "vrais outils : " + c[0]);
		egal(sansFin(r.stderr || ""), c.length > 2 ? c[2] : "", "vrais outils (erreurs) : " + c[0]);
		revus++;
	});
	console.log(revus + " attendus revérifiés avec les vrais outils.");
}

/* --- 2. Ce qui est propre au jeu --- */

poser(jeu);
var t = jeu.taper;

// Le code de retour (io.code), lu par l'interpréteur.
function code(sort, args, stdin, sudo){
	return jeu.lire("(function(){ var io = { stdin: " + JSON.stringify(stdin === undefined ? null : stdin) + ", tty: false, sudo: " + !!sudo + ", erreurs: [], err: function(m){ this.erreurs.push(m); } };" +
		" try { Shell.sorts[" + JSON.stringify(sort) + "](" + JSON.stringify(args) + ", io); } catch (e){ return 'erreur ' + (e.code === undefined ? '' : e.code); } return io.code === undefined ? 0 : io.code; })()");
}
function reposer(){ poser(jeu); }

// Les événements : on les note tous, et on relit le dernier de chaque type.
jeu.lire("var EVENEMENTS = {}; ['jq', 'xargs', 'find', 'findExec', 'diff', 'patch', 'rsync', 'at', 'atq', 'atrm', 'atExecutee', 'crontab', 'crontabModifiee'," +
	" 'timer', 'paste', 'column', 'tac', 'join', 'comm', 'touchExistant', 'date'].forEach(function(type){" +
	" GameEvents.addListener(type, function(e){ EVENEMENTS[type] = e; EVENEMENTS[type + '#'] = (EVENEMENTS[type + '#'] || 0) + 1; }); });");
function evt(expression){ return jeu.lire("(function(){ try { return " + expression + "; } catch (e){ return undefined; } })()"); }

/* Codes de retour */
reposer();
verifier(code("jq", [".", "eleves.json"]) === 0, "jq qui réussit : code 0");
verifier(code("jq", [".a", "melange.json"]) === 5, "jq dont le filtre échoue : code 5");
verifier(code("jq", [".", "casse.json"]) === 5, "jq sur un JSON cassé : code 5 (jq 1.7)");
verifier(code("jq", ["map(."]) === "erreur 3", "jq dont le filtre ne se compile pas : code 3");
verifier(code("jq", [".", "absent.json"]) === 2, "jq sur un objet absent : code 2");
verifier(code("jq", ["-e", ".debug", "config.json"]) === 1, "jq -e sur false : code 1");
verifier(code("jq", ["-e", ".version", "config.json"]) === 0, "jq -e sur une valeur : code 0");
verifier(code("jq", ["-e", "empty", "config.json"]) === 4, "jq -e sans résultat : code 4");
verifier(code("jq", ["-n", "\"bye\" | halt_error(1)"]) === 1, "jq halt_error(1) : code 1");
verifier(code("jq", ["-Z", "."]) === "erreur 2", "jq avec une option inconnue : code 2");
verifier(code("jq", [".a"], "{\"a\": 1}") === 0, "jq sur un tuyau : code 0");
verifier(code("diff", ["v1.txt", "v1.txt"]) === 0, "diff de textes identiques : code 0");
verifier(code("diff", ["v1.txt", "v2.txt"]) === 1, "diff de textes différents : code 1");
verifier(code("diff", ["-u", "v1.txt", "v3.txt"]) === 1, "diff -u de textes différents : code 1");
verifier(code("comm", ["liste.txt", "noms.txt"]) === 1, "comm sur des listes non triées : code 1");
verifier(code("join", ["noms.txt", "liste.txt"]) === 1, "join sur des listes non triées : code 1");
verifier(code("xargs", ["cat"], "absent.txt") === 123, "xargs dont la commande échoue : code 123");
verifier(code("xargs", ["sortilege"], "a") === 127, "xargs dont la commande n'existe pas : code 127");
verifier(code("xargs", ["echo"], "a b") === 0, "xargs qui réussit : code 0");
reposer();
t("diff -u v1.txt v2.txt > c.diff");
verifier(code("patch", ["v1.txt", "c.diff"]) === 0, "patch qui s'applique : code 0");
verifier(code("patch", ["v1.txt", "c.diff"]) === 1, "patch déjà appliqué : code 1");
verifier(code("patch", ["noms.txt", "c.diff"]) === 1, "patch qui échoue : code 1");
verifier(code("patch", ["v1.txt", "absent.diff"]) === "erreur 2", "patch sans correctif : code 2");
verifier(code("patch", ["v1.txt", "noms.txt"]) === "erreur 2", "patch sur autre chose qu'un diff : code 2");
verifier(code("systemctl", ["is-active", "logrotate.timer"]) === 0, "un timer actif : is-active code 0");
verifier(code("atrm", ["999"]) === 1, "atrm d'une tâche inconnue : code 1");

/* jq : ce qui s'affiche à l'écran, et les événements */
reposer();
var s = t("jq '.[0].nom' eleves.json");
egal(s, "\"Ada\"", "jq à l'écran (les couleurs sont retirées par le faux terminal)");
contient(t("jq 'map(.'"), "Un filtre jq s'écrit entre apostrophes", "jq : une erreur de syntaxe à l'écran est expliquée");
absent(t("jq 'map(.' 2>&1 | cat"), "apostrophes", "jq : dans un tuyau, le message reste celui de jq");
contient(t("jq"), "Il manque le filtre", "jq sans rien : l'aide");
contient(t("jq -r '.version' config.json | cut -d . -f 1"), "2", "jq -r dans un tuyau");
t("jq -r '.[] | .nom' eleves.json > noms-jq.txt");
egal(t("cat noms-jq.txt"), "Ada\nAlan\nGrace\nLinus", "jq -r redirigé dans un objet");
t("jq '.serveur.ports' config.json");
verifier(evt("EVENEMENTS.jq.filtre") === ".serveur.ports" && evt("EVENEMENTS.jq.fichier") === "config.json" && evt("EVENEMENTS.jq.nombre") === 1,
	"événement jq : filtre, fichier, nombre de résultats");
t("cat eleves.json | jq length");
verifier(evt("EVENEMENTS.jq.fichier") === null && evt("EVENEMENTS.jq.sortie") === "4", "événement jq sur un tuyau : pas de fichier, la sortie");
egal(jeu.lire("jqAppliquer('.[] | select(.age > 20) | .nom', current_room.getNode('eleves.json').getText()).sorties.join(' ')"), "\"Alan\" \"Grace\"",
	"jqAppliquer, pour les quêtes");
contient(jeu.lire("jqAppliquer('.a', '\"x\"').erreur"), "Cannot index string with string \"a\"", "jqAppliquer rend l'erreur");
contient(jeu.lire("jqAppliquer('.a', '{\"a\":').erreur"), "Unfinished JSON term", "jqAppliquer : JSON cassé");
egal(jeu.lire("jqAppliquer('$x + \"!\"', 'null', { x: 'salut' }).sorties[0]"), "\"salut!\"", "jqAppliquer avec une variable");
verifier(/^jq : (trop de calculs|résultat trop gros)/.test(t("jq -n '[range(1e9)] | length'")), "jq : une boucle géante est arrêtée");
contient(t("jq -n 'reduce range(1e9) as $i (0; . + $i)'"), "trop de calculs", "jq : un calcul sans fin est arrêté");
contient(t("jq -n 'def f: f + 1; f'"), "jq :", "jq : une récursion sans fin est arrêtée proprement");
contient(t("jq -n '[limit(3; repeat(1))]' -c"), "[null,1,1]", "jq : repeat et limit (sémantique de jq 1.6 et 1.7.1)");
egal(t("echo -n '{\"a\": 1}' | jq .a"), "1", "jq lit un JSON sans retour à la ligne final");
egal(t("jq -n '\"\\u00e9\" | @base64'"), "\"w6k=\"", "jq @base64 en UTF-8");

/* xargs, et sudo */
reposer();
s = t("echo un deux trois | xargs -n 1 echo mot");
egal(s, "mot un\nmot deux\nmot trois", "xargs -n 1");
verifier(evt("EVENEMENTS.xargs.cmd") === "echo" && evt("EVENEMENTS.xargs.lancements.length") === 3 && evt("EVENEMENTS.xargs.sudo") === false,
	"événement xargs : la commande et ses lancements");
contient(t("xargs echo"), "il faut un tuyau", "xargs sans tuyau");
contient(t("echo a | xargs sortilege"), "sort inconnu", "xargs vers un sort qui n'existe pas");
jeu.lire("delete state.spells.chmod");
contient(t("echo noms.txt | xargs chmod +x"), "Tu ne connais pas encore le sort « chmod »", "xargs ne lance pas un sort que le joueur ne connaît pas");
jeu.lire("state.spells.chmod = true");
var limite = [];
for (var n = 0; n < 501; n++) limite.push("m" + n);
contient(t("echo " + limite.join(" ") + " | xargs -n 1 echo"), "au-delà de 500", "xargs : au plus 500 lancements");
// Un objet de root, que seul sudo peut effacer.
function objetDeRoot(nom){
	jeu.lire("(function(){ var it = new Item(" + JSON.stringify(nom) + ", 'secret'); it.owner = 'root'; it.mode = 'rw-------'; it.addValidCmd('sudo-rm'); current_room.addItem(it); })()");
}
objetDeRoot("racine.tmp");
contient(t("echo racine.tmp | xargs rm"), "ne t'appartient pas", "xargs rm sans sudo : refusé");
verifier(jeu.lire("current_room.getNode('racine.tmp') !== null"), "l'objet de root est toujours là");
jeu.lire("state.spells.sudo = true; delete state.flags.sudoOK");
contient(t("echo racine.tmp | xargs sudo rm"), "mot de passe requis", "xargs sudo rm : sudo n'a pas encore le mot de passe");
var mdp = jeu.lire("MOT_DE_PASSE_SUDO");
contient(jeu.taper("echo racine.tmp | sudo xargs rm", mdp), "racine.tmp disparaît", "… | sudo xargs rm : les pleins pouvoirs passent à rm");
verifier(jeu.lire("current_room.getNode('racine.tmp') === null"), "sudo xargs rm a effacé l'objet de root");
verifier(evt("EVENEMENTS.xargs.sudo") === true, "événement xargs : sudo");
objetDeRoot("racine2.tmp");
contient(t("echo racine2.tmp | xargs sudo rm"), "racine2.tmp disparaît", "xargs sudo rm, une fois le mot de passe donné");
objetDeRoot("racine3.tmp");
contient(t("echo racine3.tmp | sudo xargs sudo rm"), "racine3.tmp disparaît", "sudo xargs sudo rm");

/* find : l'âge des objets créés pendant la partie, -exec, -delete */
reposer();
t("touch tout-neuf.txt");
egal(t("find . -maxdepth 1 -name tout-neuf.txt -mtime -1"), "./tout-neuf.txt", "un objet créé par touch a l'âge 0 (find -mtime -1)");
egal(t("find . -maxdepth 1 -name tout-neuf.txt -mmin -5"), "./tout-neuf.txt", "… et quelques minutes (find -mmin -5)");
egal(t("find . -maxdepth 1 -name tout-neuf.txt -mtime +30"), "", "… et n'a pas 40 jours");
t("echo bonjour > ecrit.txt");
egal(t("find . -maxdepth 1 -name ecrit.txt -mtime 0"), "./ecrit.txt", "un objet créé par > a l'âge 0");
egal(t("find . -maxdepth 1 -name LettreDeBienvenue -mtime -1"), "", "un objet du monde reste vieux");
egal(t("find . -maxdepth 1 -name LettreDeBienvenue -mtime +30"), "./LettreDeBienvenue", "un objet du monde a 40 jours");
jeu.lire("(function(){ var it = new Item('vieux.txt', 'ancien'); it.owner = JOUEUR; it.age = 12; it.heure = '08:00'; current_room.addItem(it); })()");
egal(t("find . -maxdepth 1 -name vieux.txt -mtime +7"), "./vieux.txt", "un objet de 12 jours");
t("echo modifié >> vieux.txt");
egal(t("find . -maxdepth 1 -name vieux.txt -mtime -1"), "./vieux.txt", "modifié par >> : il rajeunit");
jeu.lire("(function(){ var it = current_room.getNode('vieux.txt'); it.age = 12; })()");
t("touch vieux.txt");
egal(t("find . -maxdepth 1 -name vieux.txt -mtime -1"), "./vieux.txt", "touch sur un objet existant met sa date à jour");
verifier(evt("EVENEMENTS.touchExistant.item.itemname") === "vieux.txt", "événement touchExistant");
egal(t("find . -maxdepth 1 -newer LettreDeBienvenue -name 'e*.txt'"), "./ecrit.txt", "find -newer : plus récent que la lettre");
egal(t("find . -maxdepth 1 -name LettreDeBienvenue -newer ecrit.txt"), "", "find -newer : la lettre n'est pas plus récente");
verifier(jeu.lire("(function(){ var it = new Item('x'); return it.age === 0 && /^\\d\\d:\\d\\d$/.test(it.heure); })()"), "Item créé pendant la partie : age 0 et une heure");
reposer();
s = t("find arbre -name '*.tmp' -exec cat {} \\;");
egal(s, "brouillon a\nbrouillon b", "find -exec … \\;");
verifier(evt("EVENEMENTS.findExec.cmd") === "cat" && evt("EVENEMENTS.findExec.commandes.length") === 2, "événement findExec : une commande par objet");
t("find arbre -name '*.tmp' -exec cat {} +");
verifier(evt("EVENEMENTS.findExec.commandes.length") === 1 && evt("EVENEMENTS.findExec.commandes[0].length") === 3, "événement findExec : {} + en une seule commande");
egal(t("find arbre -name '*.tmp' -delete"), "", "find -delete");
egal(t("find arbre -name '*.tmp'"), "", "find -delete a bien effacé");
verifier(evt("EVENEMENTS.find.supprime") === false && evt("EVENEMENTS['find#']") > 2, "événement find à chaque recherche");
contient(t("find arbre -exec cat {}"), "missing argument to `-exec'", "find -exec sans \\;");
contient(t("find arbre \\( -name a"), "parenthèse fermante", "find : parenthèse oubliée");
contient(t("find arbre -taille 3"), "critère inconnu", "find : critère inconnu");
contient(t("find . -maxdepth 0 -delete"), "cannot delete", "find -delete refuse d'effacer le point de départ");
objetDeRoot("racine4.tmp");
contient(t("find . -maxdepth 1 -name racine4.tmp -exec rm {} \\;"), "ne t'appartient pas", "find -exec rm sans sudo");
contient(t("sudo find . -maxdepth 1 -name racine4.tmp -exec rm {} \\;"), "racine4.tmp disparaît", "sudo find -exec rm : les pleins pouvoirs passent à rm");

/* diff -u : l'en-tête, et la fin de ligne manquante */
reposer();
s = t("diff -u v1.txt v2.txt | head -2");
verifier(/^--- v1\.txt\t\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.000000000 [+-]\d{4}\n\+\+\+ v2\.txt\t/.test(s), "diff -u : l'en-tête --- et +++ avec la date\n" + s);
t("echo -n fin > sans-fin.txt");
t("echo fin > avec-fin.txt");
egal(t("diff avec-fin.txt sans-fin.txt | cat"), "1c1\n< fin\n---\n> fin\n\\ No newline at end of file", "diff : \\ No newline at end of file");
egal(t("diff -u avec-fin.txt sans-fin.txt | tail -n +3"), "@@ -1 +1 @@\n-fin\n+fin\n\\ No newline at end of file", "diff -u : \\ No newline at end of file");
contient(t("diff v1.txt v1.txt"), "aucune différence", "diff : à l'écran, une explication quand tout est identique");
contient(t("diff v1.txt v2.txt"), "(< : lignes du premier objet", "diff : à l'écran, la légende");
verifier(evt("EVENEMENTS.diff.different") === true && evt("EVENEMENTS.diff.unifie") === false, "événement diff");
// L'algorithme : le même que GNU diff, même dans les cas ambigus (glissement des blocs, lignes écartées).
egal(jeu.lire("JSON.stringify(differencesGnu('eababbe'.split(''), 'eadbabe'.split(''), 0).map(function(b){ return [b.a0, b.b0, b.retires.join(''), b.ajoutes.join('')]; }))"),
	"[[2,2,\"\",\"d\"],[4,5,\"b\",\"\"]]", "differencesGnu : comme GNU diff (2a3, 5d5)");
egal(jeu.lire("JSON.stringify(differencesGnu('ffdcbbeeafdac'.split(''), 'effdcbbeeaafdac'.split(''), 0).map(function(b){ return [b.a0, b.b0, b.ajoutes.join('')]; }))"),
	"[[0,0,\"e\"],[8,9,\"a\"]]", "differencesGnu : comme GNU diff (0a1, 8a10)");

/* patch : messages, .rej, .orig, événements */
reposer();
t("diff -u v1.txt v2.txt > c.diff");
egal(t("patch v1.txt c.diff"), "patching file v1.txt", "patch");
verifier(evt("EVENEMENTS.patch.ok") === true && evt("EVENEMENTS.patch.item.itemname") === "v1.txt", "événement patch réussi");
egal(t("diff v1.txt v2.txt | cat"), "", "après patch, les deux textes sont identiques");
contient(t("patch v1.txt c.diff"), "Reversed (or previously applied) patch detected!", "patch déjà appliqué");
contient(t("patch v1.txt c.diff"), "Pour l'annuler : patch -R", "patch déjà appliqué : à l'écran, l'astuce");
verifier(evt("EVENEMENTS.patch.ok") === false && evt("EVENEMENTS.patch.dejaApplique") === true, "événement patch déjà appliqué");
egal(t("patch -R v1.txt c.diff"), "patching file v1.txt", "patch -R annule");
egal(t("diff v1.txt v3.txt | head -1"), "1c1", "patch -R a remis le texte d'origine");
t("cat c.diff | patch --dry-run v1.txt");
egal(t("diff v1.txt v3.txt | head -1"), "1c1", "patch --dry-run ne touche à rien");
verifier(evt("EVENEMENTS.patch.essai") === true, "événement patch : essai à blanc");
reposer();
t("diff -u s30.txt s30b.txt > c.diff");
contient(t("patch s32v.txt c.diff"), "Hunk #2 FAILED at 18.", "patch : un morceau qui échoue");
contient(t("cat s32v.txt.rej"), "@@ -18,7 +19,7 @@", "patch : le .rej, renuméroté");
egal(t("cat s32v.txt.orig | head -3"), "x\ny\n1", "patch : l'original gardé dans .orig");
verifier(evt("EVENEMENTS.patch.ok") === false && evt("EVENEMENTS.patch.echecs") === 1, "événement patch : un échec");
reposer();
t("diff -u v1.txt v2.txt > c.diff");
egal(t("cat c.diff | patch -p0 | cat"), "patching file v1.txt", "patch -p0 par un tuyau : l'objet est nommé dans le correctif");
reposer();
t("mkdir a");
t("cp v1.txt a/conf.txt");
t("echo '--- a/conf.txt' > p1.diff");
t("echo '+++ b/conf.txt' >> p1.diff");
t("diff -u v1.txt v2.txt | tail -n +3 >> p1.diff");
egal(t("cat p1.diff | patch -p0 --dry-run | cat"), "checking file a/conf.txt", "patch -p0 garde le chemin entier");
s = t("cat p1.diff | patch -p2 | cat");
contient(s, "can't find file to patch at input line 3", "patch -p2 : plus rien à patcher");
contient(s, "Perhaps you used the wrong -p or --strip option?", "… et le message de GNU patch");
contient(s, "|--- a/conf.txt", "… qui cite le correctif");
t("cd a");
egal(t("cat ../p1.diff | patch -p1 | cat"), "patching file conf.txt", "patch -p1 retire le premier dossier");
egal(t("diff conf.txt ../v2.txt | cat"), "", "patch -p1 a corrigé a/conf.txt");
t("cd ~");
reposer();
t("diff -u /dev/null noms.txt > cree.diff");
egal(t("head -1 cree.diff | cut -f 1"), "--- /dev/null", "diff -u /dev/null OBJET");
t("rm noms.txt");
egal(t("cat cree.diff | patch -p0 | cat"), "patching file noms.txt", "patch crée un objet (--- /dev/null)");
egal(t("cat noms.txt"), "Ada\nAlan\nGrace\nLinus", "l'objet créé par patch");
// Sans droit d'écriture
objetDeRoot("protege.txt");
jeu.lire("current_room.getNode('protege.txt').mode = 'rw-r--r--'; current_room.getNode('protege.txt').setText('secret')");
t("echo secret > autre.txt");
t("echo public >> autre.txt");
t("diff -u protege.txt autre.txt > p.diff");
contient(t("patch protege.txt p.diff"), "Permission denied", "patch sur un objet de root, sans sudo");
contient(jeu.taper("sudo patch protege.txt p.diff"), "patching file protege.txt", "sudo patch");

/* rsync : événements, essai à blanc, --delete prudent */
reposer();
egal(t("rsync -av src/ dst | head -1"), "sending incremental file list", "rsync -v");
verifier(evt("EVENEMENTS.rsync.src") === "src/" && evt("EVENEMENTS.rsync.dst") === "dst" && evt("EVENEMENTS.rsync['delete']") === false && evt("EVENEMENTS.rsync.dryRun") === false,
	"événement rsync : src, dst, delete, dryRun");
reposer();
contient(t("rsync -avn --delete src/ dst"), "(DRY RUN)", "rsync -n : essai à blanc");
verifier(evt("EVENEMENTS.rsync.dryRun") === true && evt("EVENEMENTS.rsync['delete']") === true, "événement rsync : essai à blanc avec --delete");
egal(t("cat dst/perime.html"), "vieille page", "rsync -n n'a rien effacé");
egal(t("rsync -a --delete src/ dst"), "", "rsync -a sans -v ne dit rien");
contient(t("cat dst/perime.html"), "aucun", "rsync --delete a effacé ce qui n'est plus dans la source");
reposer();
jeu.lire("(function(){ var it = new Item('monde.txt', 'du monde'); it.owner = 'root'; current_room.getNode('dst').addItem(it); })()");
contient(t("rsync -a --delete src/ dst"), "delete_file: unlink(monde.txt) failed", "rsync --delete n'efface pas ce qui n'est pas au joueur");
contient(t("rsync -a --delete src/ dst 2>&1"), "(code 23)", "rsync : le code 23 quand quelque chose n'a pas pu être fait");
verifier(code("rsync", ["-a", "--delete", "src/", "dst"]) === 23, "rsync : code 23");
contient(t("rsync src/ web:/tmp"), "ce monde ne synchronise que des lieux d'une même machine", "rsync vers une autre machine");
contient(t("rsync src"), "il faut une source et une destination", "rsync sans destination");
t("rsync -a src src/img");
verifier(jeu.lire("current_room.getNode('src').getNode('img').getNode('src') instanceof Room") && jeu.lire("current_room.getNode('src').getNode('img').getNode('src').getNode('index.html') instanceof Item"),
	"rsync d'un lieu dans lui-même : une copie, sans boucle sans fin");

/* at, atq, atrm, et la sauvegarde */
var stockageAt = {};
var j2 = nouveauJeu(stockageAt);
s = j2.taper("echo 'tar -czf sauvegarde.tgz notes' | at now + 5 minutes 2>&1");
verifier(/^warning: commands will be executed using \/bin\/sh\njob 1 at (Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} \d\d \d\d:\d\d:00 \d{4}$/.test(s), "at : l'accusé de réception\n" + s);
j2.taper("echo 'echo plus tard' | at 23:59 2>/dev/null");
j2.taper("echo 'echo demain' | at teatime tomorrow 2>/dev/null");
s = j2.taper("atq");
verifier(s.split("\n").length === 3 && /^1\t.* a /.test(s), "atq liste les trois tâches\n" + s);
contient(j2.taper("at -c 1"), "tar -czf sauvegarde.tgz notes", "at -c montre la commande");
egal(j2.taper("atrm 2"), "", "atrm");
verifier(j2.taper("atq").split("\n").length === 2, "atrm a retiré la tâche 2");
contient(j2.taper("atrm 2"), "Cannot find jobid 2", "atrm d'une tâche déjà retirée");
contient(j2.taper("echo x | at 25:00"), "Garbled time", "at : heure impossible");
contient(j2.taper("at 14:00 | cat"), "quelle commande planifier", "at sans commande, dans un tuyau");
s = j2.taper("at 14:00", ["echo un", "touch deux", ""]);
contient(s, "at> <EOT>", "at sans tuyau demande les commandes (at>), une ligne vide termine");
verifier(/job 4 at /.test(s), "at interactif : la tâche est planifiée\n" + s);
egal(j2.lire("etatArcanes().at.taches.filter(function(t){ return t.n === 4; })[0].commande"), "echo un\ntouch deux", "at interactif : les deux commandes");
contient(j2.taper("at 14:00", [""]), "rien n'est planifié", "at interactif sans commande");
contient(j2.taper("echo x | at"), "Garbled time", "at sans heure");
j2.lire("state.save()");
var j3 = nouveauJeu(stockageAt);
verifier(j3.taper("atq").split("\n").length === 3, "les tâches de at survivent à la sauvegarde");
j3.lire("etatArcanes().at.taches[0].quand = Date.now() - 1000");
var vuesAvant = j3.lire("etatArcanes().at.taches.length");
j3.taper("atq");
verifier(j3.lire("etatArcanes().at.taches.length") === vuesAvant - 1, "une tâche dont l'heure est passée quitte la file");
verifier(j3.lire("(function(){ var e = (lireMoment('now + 2 hours', true) - Date.now()) / 60000; return e > 118.9 && e <= 120; })()"), "lireMoment : now + 2 hours");
egal(j3.lire("lireMoment('noon', true).getHours()"), 12, "lireMoment : noon pour at");
verifier(j3.lire("lireMoment('noon', false) === null"), "lireMoment : noon n'existe pas pour date -d (comme GNU date)");
egal(j3.lire("formaterDate(lireMoment('2026-12-24 18:00', false), ['+%F %H:%M'])"), "2026-12-24 18:00", "lireMoment : une date et une heure");
verifier(j3.lire("lireMoment('24/12/2026', false) === null"), "lireMoment : 24/12/2026 n'est pas une date pour GNU date (mois/jour)");
egal(j3.taper("date -d '2026-12-24 18:00' +%F"), "2026-12-24", "date -d");
egal(j3.taper("date -d @0 +%Y"), "1970", "date -d @0");
contient(j3.taper("date -d 'n importe quoi'"), "date: invalid date", "date -d incompris");

/* crontab -e, crontab FICHIER, crontab - */
reposer();
jeu.editer("function(t){ return '*/5 * * * * /usr/bin/sauvegarder\\n0 7 * * 1-5 echo bonjour\\n'; }");
s = t("crontab -e");
contient(s, "[nano /tmp/crontab." + jeu.lire("JOUEUR") + "/crontab]", "crontab -e ouvre nano");
contient(s, "crontab: installing new crontab", "crontab -e installe à la sortie de l'éditeur");
contient(t("crontab -l"), "*/5 * * * * /usr/bin/sauvegarder", "crontab -l relit la tâche");
verifier(evt("EVENEMENTS.crontabModifiee.action") === "e" && evt("EVENEMENTS.crontabModifiee.apres.length") === 2, "événement crontabModifiee");
jeu.editer("function(t){ return '61 * * * * x\\n'; }");
s = t("crontab -e");
contient(s, ":1: bad minute", "crontab -e refuse une minute impossible");
contient(s, "Ta crontab n'a pas changé", "… et le dit");
contient(t("crontab -l"), "/usr/bin/sauvegarder", "l'ancienne crontab est intacte");
jeu.editer("function(t){ return null; }");
contient(t("crontab -e"), "no changes made to crontab", "crontab -e sans rien enregistrer");
t("echo '30 2 * * 0 /usr/bin/nettoyer' > ma-crontab");
egal(t("crontab ma-crontab | cat"), "", "crontab FICHIER ne dit rien dans un tuyau");
contient(t("crontab -l"), "30 2 * * 0 /usr/bin/nettoyer", "crontab FICHIER installe");
absent(t("crontab -l"), "sauvegarder", "crontab FICHIER remplace tout");
verifier(evt("EVENEMENTS.crontab.action") === "install", "événement crontab quand une tâche a disparu");
t("echo '@daily /usr/bin/rapport' | crontab -");
contient(t("crontab -l"), "@daily /usr/bin/rapport", "crontab - lit le tuyau");
[["* * * *", "bad day-of-week"], ["* * * * *", "bad command"], ["*/0 * * * * x", "bad minute"], ["* 24 * * * x", "bad hour"], ["* * 0 * * x", "bad day-of-month"], ["* * * 13 * x", "bad month"],
	["* * * * 8 x", "bad day-of-week"], ["@souvent x", "bad time specifier"], ["5/10 * * * * x", "bad minute"], ["* * * * mon-fri x", null], ["0,15,30,45 8-18 * jan-jun 1 x", null],
	["1-10/2 * * * * x", null], ["* * * * 7 x", null]].forEach(function(c){
	var res = jeu.lire("verifierCrontab(" + JSON.stringify(c[0]) + ", 'f').erreurs.join(' ')");
	if (c[1] === null) egal(res, "", "crontab accepte « " + c[0] + " »");
	else contient(res, c[1], "crontab refuse « " + c[0] + " »");
});
contient(t("echo 'x' | crontab -"), "errors in crontab file, can't install.", "crontab - refuse une ligne fausse");
contient(t("crontab -u sorcier ma-crontab"), "il faut les pouvoirs de root", "crontab -u sans sudo");

/* Les timers de systemd */
reposer();
s = t("systemctl list-timers");
contient(s, "logrotate.timer", "list-timers montre logrotate");
contient(s, "NEXT", "list-timers : l'en-tête");
verifier(/\d+ timers listed\./.test(s), "list-timers : le bilan");
verifier(evt("EVENEMENTS.timer.action") === "list-timers", "événement timer list-timers");
contient(t("systemctl status logrotate.timer"), "Trigger:", "systemctl status NOM.timer");
contient(t("systemctl cat logrotate.timer"), "OnCalendar=daily", "systemctl cat NOM.timer");
contient(t("systemctl stop logrotate.timer"), "Access denied", "arrêter un timer demande sudo");
egal(jeu.taper("sudo systemctl stop logrotate.timer"), "", "sudo systemctl stop NOM.timer");
verifier(evt("EVENEMENTS.timer.action") === "stop" && evt("EVENEMENTS.timer.nom") === "logrotate", "événement timer stop");
absent(t("systemctl list-timers"), "logrotate", "un timer arrêté disparaît de list-timers");
contient(t("systemctl list-timers --all"), "logrotate.timer", "… mais pas de list-timers --all");
contient(jeu.taper("sudo systemctl disable --now apt-daily.timer"), "Removed \"/etc/systemd/system/timers.target.wants/apt-daily.timer\".", "disable --now");
contient(t("systemctl status apt-daily.timer"), "inactive (dead)", "status d'un timer arrêté");
contient(t("systemctl status apt-daily.timer"), "disabled", "status d'un timer désactivé");
egal(t("systemctl is-enabled apt-daily.timer"), "disabled", "is-enabled");
contient(t("systemctl status fantome.timer"), "Unit fantome.timer could not be found.", "timer inconnu");
var hote = jeu.lire("Shell.hote()");
jeu.lire("declarerTimer(" + JSON.stringify(hote) + ", 'sauvegarde-nuit', { OnCalendar: '*-*-* 02:30:00', Description: 'Sauvegarde de la nuit', Unit: 'sauvegarde.service' })");
s = t("systemctl list-timers");
contient(s, "sauvegarde-nuit.timer", "declarerTimer : un timer propre à la machine");
contient(s, "sauvegarde.service", "declarerTimer : l'unité lancée");
contient(t("systemctl status sauvegarde-nuit.timer"), "02:30:00", "le prochain déclenchement suit OnCalendar");
jeu.lire("declarerTimer('une-autre-machine', 'secret', { OnCalendar: 'hourly' })");
absent(t("systemctl list-timers --all"), "secret.timer", "un timer d'une autre machine ne se voit pas ici");
jeu.lire("declarerTimer(" + JSON.stringify(hote) + ", 'figee', { OnCalendar: 'daily', prochain: '2030-01-01 05:00', dernier: new Date(2026, 0, 1, 4, 0), actif: true })");
contient(t("systemctl status figee.timer"), "2030-01-01 05:00:00", "declarerTimer : un prochain déclenchement imposé");
egal(jeu.lire("(function(){ var f = calendrierSystemd('Mon..Fri *-*-* 07:30'); var d = f(new Date(2026, 9, 17, 12, 0), 1); return d.getDay() + ' ' + d.getHours() + ':' + d.getMinutes(); })()"),
	"1 7:30", "calendrierSystemd : du lundi au vendredi (samedi midi : lundi 7 h 30)");
egal(jeu.lire("(function(){ var f = calendrierSystemd('*:0/15'); var d = f(new Date(2026, 9, 17, 12, 1), 1); return d.getHours() + ':' + d.getMinutes(); })()"),
	"12:15", "calendrierSystemd : toutes les 15 minutes");
egal(jeu.lire("(function(){ var f = calendrierSystemd('weekly'); var d = f(new Date(2026, 9, 16, 12, 0), -1); return d.getDate() + ' ' + d.getHours(); })()"),
	"12 0", "calendrierSystemd : weekly, le précédent (lundi minuit)");
verifier(jeu.lire("etatArcanes().timers[" + JSON.stringify(hote + ":logrotate") + "].actif") === false, "l'état des timers est dans state.arcanes");
jeu.lire("state.save()");
var reprise = nouveauJeu(STOCKAGE);
verifier(/logrotate/.test(reprise.taper("systemctl list-timers --all")) && !/logrotate/.test(reprise.taper("systemctl list-timers")), "l'état des timers survit à la sauvegarde");
// Les autres usages de systemctl ne passent pas par les timers : même réponse que la version d'avant.
egal(t("systemctl status sshd 2>&1 | cat"), jeu.lire("(function(){ var io = { stdin: null, tty: false, sudo: false, erreurs: [], err: function(m){ this.erreurs.push(m); } };" +
	" try { var r = SYSTEMCTL_AVANT_ARCANES(['status', 'sshd'], io); return io.erreurs.concat([sansAnsi(r || '')]).filter(function(x){ return x !== ''; }).join('\\n'); } catch (e){ return e.message; } })()"),
	"systemctl status d'un service : la version d'avant");

/* Le manuel, et ce que le jeu sait de ces sorts */
jeu.lire("SORTS_ARCANES").forEach(function(sort){
	verifier(jeu.lire("!!MANUEL[" + JSON.stringify(sort) + "] && MANUEL[" + JSON.stringify(sort) + "].page.length > 80"), "page de manuel pour " + sort);
	verifier(jeu.lire("ORDRE_DES_SORTS_5.indexOf(" + JSON.stringify(sort) + ") > -1"), sort + " appartient au chapitre 4 (ORDRE_DES_SORTS_5)");
	verifier(jeu.lire("COMMANDES_REELLES.indexOf(" + JSON.stringify(sort) + ") === -1"), sort + " n'est plus une « vraie commande absente de ce monde »");
});
["find", "diff", "crontab", "systemctl", "date"].forEach(function(sort){
	verifier(jeu.lire("MANUEL[" + JSON.stringify(sort) + "].page").length > 400, "la page de " + sort + " est complétée");
});
contient(t("man find"), "-exec rm {} \\;", "man find parle de -exec");
contient(t("man jq"), "select(.age > 18)", "man jq");
contient(t("rsync --help"), "La barre finale", "--help montre la page de manuel");
var tirets = jeu.lire("Object.keys(MANUEL).filter(function(k){ return /\\u2014/.test(MANUEL[k].page + MANUEL[k].resume + MANUEL[k].titre); }).join(' ')");
egal(tirets, "", "pas de tiret cadratin dans le manuel");
var source = require("fs").readFileSync(require("path").join(__dirname, "..", "Web", "static", "javascript", "SortsArcanes.js"), "utf8");
verifier(source.indexOf("\u2014") === -1, "pas de tiret cadratin dans SortsArcanes.js");
verifier(!/\beval\s*\(|new Function\s*\(/.test(source), "jq n'utilise ni eval ni Function");
var xpAvant = jeu.lire("state.xp");
var xp5Avant = jeu.lire("state.xp5");
jeu.lire("delete state.usages.tac");
t("tac noms.txt");
verifier(jeu.lire("state.xp") === xpAvant && jeu.lire("state.usages.tac === true"), "un sort du chapitre 4 ne touche pas l'XP du chapitre 1");
verifier(jeu.lire("state.xp5") === xp5Avant + 5, "le premier usage d'un sort arcane rapporte désormais de l'XP au chapitre 4");
jeu.lire("delete state.spells.jq");
contient(t("jq . eleves.json"), "Tu ne connais pas encore le sort « jq »", "jq s'apprend comme les autres sorts");

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
