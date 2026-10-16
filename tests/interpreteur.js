/**
 * L'interpréteur de shell (Interpreteur.js) : variables, $(...), $((...)), if, for, while, case,
 * fonctions, here-documents, read, printf, test... et des scripts complets comme en B2 et B3.
 *
 * Lancer : node tests/interpreteur.js           (-v pour tout voir)
 *          node tests/interpreteur.js --bash    vérifie aussi chaque attendu contre le vrai bash de la machine
 *
 * Les cas de la liste CAS sont des scripts dont la sortie doit être exactement celle de bash : on les
 * lance dans un lieu vide du jeu (~/labo) qui contient les mêmes fichiers qu'un dossier temporaire.
 * Les autres vérifications portent sur ce qui est propre au jeu : messages d'erreur en français,
 * garde-fous, saisie sur plusieurs lignes, événements des quêtes, épreuve finale.
 */
var monde = require("./monde.js");
var bavard = process.argv.indexOf("-v") > -1;
var avecBash = process.argv.indexOf("--bash") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » présent dans\n" + t); }

/* Les sorts du scripteur ne sont encore dans aucun chapitre : on les accorde, comme le fera le chapitre 4. */
var SORTS = ["bash", "read", "printf", "seq", "basename", "dirname", "expr", "sleep", "echo", "cat", "grep", "wc", "sort", "uniq",
	"head", "tail", "cut", "tr", "sed", "awk", "touch", "rm", "mkdir", "ls", "cd", "pwd", "chmod", "export", "alias", "diff", "tee", "rev"];
function nouveauJeu(stockage){
	var j = monde.nouveauMonde(stockage);
	j.lire("state.nom = 'Ada'; " + JSON.stringify(SORTS) + ".forEach(function(s){ state.spells[s] = true; }); Shell.narration = [];");
	return j;
}

/* Les fichiers du labo. Dans le jeu, un texte ne finit pas par un retour à la ligne ; sur le disque, si. */
var FICHIERS = {
	"notes.csv": "nom,note\nAda,15\nBob,12\nCyd,9\nDan,18",
	"auth.log": "Oct 16 10:00:01 srv sshd: Failed password for root from 10.0.0.5\n" +
		"Oct 16 10:00:04 srv sshd: Failed password for admin from 10.0.0.5\n" +
		"Oct 16 10:01:12 srv sshd: Accepted password for ada from 10.0.0.9\n" +
		"Oct 16 10:02:30 srv sshd: Failed password for root from 10.0.0.7\n" +
		"Oct 16 10:02:31 srv sshd: Failed password for test from 10.0.0.5\n" +
		"Oct 16 10:03:00 srv sshd: Failed password for root from 10.0.0.7",
	"config.ini": "# réglages du serveur\nport=22\nhote=serveur.local\n\nmode=strict",
	"eleves.txt": "Ada B2\nBob B3\nCyd B2\nDan B3\nEve B2",
	"rapport.md": "# Rapport\nRien à signaler.",
	"vide.txt": ""
};

var jeu = nouveauJeu();
jeu.taper("mkdir labo");
jeu.taper("cd labo");
verifier(jeu.lire("current_room.room_name") === "labo", "on travaille dans ~/labo");

/* Remet le labo dans son état de départ : les fichiers d'origine, rien d'autre. */
function remettreLabo(){
	jeu.lire("(function(f){ var l = current_room; while (l.items.length) l.removeItem(l.items[0]); while (l.children.length) l.removeChild(l.children[0]);" +
		" Object.keys(f).forEach(function(n){ var it = new Item(n, f[n]); it.owner = JOUEUR; l.addItem(it); }); })(" + JSON.stringify(FICHIERS) + ")");
}

/* Lance un script dans le jeu, comme bash -c TEXTE script ARGS... : { sortie, erreurs, code }. */
function lancer(texte, args){
	remettreLabo();
	return JSON.parse(jeu.lire("JSON.stringify(Interpreteur.capturer(" + JSON.stringify(texte) + ", { nom0: 'script', positionnels: " + JSON.stringify(args || []) + " }))"));
}

/* Le même script dans le vrai bash, dans un dossier temporaire qui contient les mêmes fichiers. */
var enfant, fs, os, path;
if (avecBash){ enfant = require("child_process"); fs = require("fs"); os = require("os"); path = require("path"); }
function lancerBash(texte, args){
	var dossier = fs.mkdtempSync(path.join(os.tmpdir(), "labo-"));
	Object.keys(FICHIERS).forEach(function(n){ fs.writeFileSync(path.join(dossier, n), FICHIERS[n] === "" ? "" : FICHIERS[n] + "\n"); });
	var r = enfant.spawnSync("bash", ["-c", texte, "script"].concat(args || []), { cwd: dossier, encoding: "utf8", input: "", env: { PATH: process.env.PATH, LANG: "C.UTF-8", HOME: dossier } });
	fs.rmSync(dossier, { recursive: true, force: true });
	return { sortie: r.stdout.replace(/\n$/, ""), code: r.status };
}

/* ------------------------------------------------------------------ */
/* 1. Les cas comparés à bash : [nom, script, sortie attendue, statut, arguments]                        */
/* ------------------------------------------------------------------ */

var CAS = [
	// Variables et développement
	["affectation puis lecture", "N=3; echo $N", "3"],
	["deux affectations", "A=1 B=2; echo $A$B", "12"],
	["NOM=valeur commande : temporaire", "X=dehors; X=dedans true; echo $X", "dehors"],
	["NOM=valeur développé avant", "X=avant; X=apres echo $X", "avant"],
	["accolades autour du nom", "fruit=pomme; echo ${fruit}s", "pommes"],
	["longueur", "mot=bonjour; echo ${#mot}", "7"],
	["valeur par défaut", "echo ${INCONNUE:-defaut} [${INCONNUE}]", "defaut []"],
	["valeur par défaut posée", "echo ${V:=posee}; echo $V", "posee\nposee"],
	["valeur alternative", "a=1; echo ${a:+oui} [${b:+oui}]", "oui []"],
	["retirer un suffixe", "f=archive.tar.gz; echo ${f%.gz} ${f%%.*}", "archive.tar archive"],
	["retirer un préfixe", "f=archive.tar.gz; echo ${f#*.} ${f##*.}", "tar.gz gz"],
	["chemin : nom et dossier", "p=/var/log/auth.log; echo ${p##*/} ${p%/*}", "auth.log /var/log"],
	["remplacer", "s=le chat et le chien; s=\"$s\"; t='le chat et le chien'; echo ${t/le/un} / ${t//le/un}", "un chat et le chien / un chat et un chien"],
	["sous-chaîne", "s=Bonjour; echo ${s:0:3} ${s:3} ${s: -2}", "Bon jour ur"],
	["majuscules et minuscules", "s=Ada; echo ${s^^} ${s,,}", "ADA ada"],
	["$HOME existe", "[ -n \"$HOME\" ] && echo oui", "oui"],
	["découpage hors guillemets", "v='  a   b  '; echo [$v]; echo \"[$v]\"", "[ a b ]\n[  a   b  ]"],
	["apostrophes : rien n'est développé", "x=1; echo '$x' \"$x\"", "$x 1"],
	["barre oblique inverse", "echo \\$HOME \\\"cite\\\"", "$HOME \"cite\""],
	["commentaire en fin de ligne", "echo fin # pas affiché", "fin"],
	["un # dans un mot n'est pas un commentaire", "echo a#b", "a#b"],
	["accolades : liste", "echo a{b,c,d}e", "abe ace ade"],
	["accolades : suites", "echo {1..5} {c..a} {01..03}", "1 2 3 4 5 c b a 01 02 03"],
	["accolades : pas", "echo {0..10..5}", "0 5 10"],
	["unset", "x=1; unset x; echo \"[$x]\"", "[]"],
	["IFS pour le découpage", "IFS=:; v=a:b:c; for x in $v; do echo $x; done", "a\nb\nc"],

	// Substitutions
	["$(...)", "echo \"il y a $(echo 3) fichiers\"", "il y a 3 fichiers"],
	["$(...) imbriqués", "echo $(echo un $(echo deux $(echo trois)))", "un deux trois"],
	["apostrophes inverses", "echo `echo vieux` style", "vieux style"],
	["retours à la ligne finaux retirés", "x=$(printf 'a\\n\\n\\n'); echo \"[$x]\"", "[a]"],
	["$(...) garde les lignes entre guillemets", "x=$(printf 'a\\nb'); echo \"$x\"", "a\nb"],
	["$(...) ne capture que la sortie normale", "x=$(echo dedans; echo erreur >&2); echo \"[$x]\"", "[dedans]"],
	["2>&1 dans $(...)", "x=$(grep -c x fichier_absent 2>&1 >/dev/null | wc -l); echo $x", "1"],
	["statut d'un $(...)", "x=$(false); echo $?", "1"],
	["$(< fichier) par cat", "n=$(cat notes.csv | wc -l); echo $n", "5"],

	// Arithmétique
	["priorités", "echo $((2 + 3 * 4)) $(( (2 + 3) * 4 ))", "14 20"],
	["division entière et reste", "echo $((7 / 2)) $((7 % 3)) $((-7 / 2))", "3 1 -3"],
	["puissance", "echo $((2 ** 10)) $((2 ** 3 ** 2))", "1024 512"],
	["variables sans $", "a=6; b=7; echo $((a * b)) $(($a + $b))", "42 13"],
	["comparaisons et ternaire", "n=5; echo $((n > 3)) $((n == 4)) $((n > 3 ? 10 : 20))", "1 0 10"],
	["incréments", "i=5; echo $((i++)) $i $((++i)) $((i--)) $i", "5 6 7 7 6"],
	["affectations composées", "x=10; ((x += 5)); ((x *= 2)); echo $x", "30"],
	["hexadécimal et octal", "echo $((0x1F)) $((010)) $((2#101))", "31 8 5"],
	["logique", "echo $((1 && 0)) $((1 || 0)) $((!5))", "0 1 0"],
	["variable vide vaut 0", "echo $((rien + 1))", "1"],
	["let", "let \"y = 4 * 5\"; let z=y+1; echo $y $z", "20 21"],
	["(( )) : statut", "(( 3 > 2 )) && echo vrai; (( 0 )) || echo faux", "vrai\nfaux"],
	["((i++)) à 0 rend 1", "i=0; ((i++)); echo $? $i", "1 1"],

	// Statut, true, false, &&, ||
	["true et false", "true; echo $?; false; echo $?", "0\n1"],
	["deux-points", ": rien; echo $?", "0"],
	["&& et ||", "true && echo a || echo b; false && echo c || echo d", "a\nd"],
	["chaîne de &&", "true && true && echo trois", "trois"],
	["! inverse", "! false; echo $?; ! true; echo $?", "0\n1"],
	["statut du dernier du tuyau", "false | true; echo $?; true | false; echo $?", "0\n1"],
	["grep sans résultat : statut 1", "grep -q inexistant notes.csv; echo $?", "1"],
	["grep avec résultat : statut 0", "grep -q Ada notes.csv && echo trouvé", "trouvé"],
	["diff : statut 1 si différents", "diff -q notes.csv eleves.txt > /dev/null; echo $?", "1"],
	["exit dans un sous-shell", "( exit 3 ); echo $?", "3"],
	["commande inconnue : 127", "commande_qui_nexiste_pas 2>/dev/null; echo $?", "127"],

	// if, test, [ ], [[ ]]
	["if simple", "if true; then echo oui; fi", "oui"],
	["if else", "if false; then echo oui; else echo non; fi", "non"],
	["elif", "x=5; if [ $x -lt 3 ]; then echo petit; elif [ $x -lt 10 ]; then echo moyen; else echo grand; fi", "moyen"],
	["if sur plusieurs lignes", "if [ 1 -eq 1 ]\nthen\n  echo un\nfi", "un"],
	["comparaisons numériques", "a=4; [ $a -eq 4 ] && [ $a -ne 5 ] && [ $a -gt 3 ] && [ $a -ge 4 ] && [ $a -lt 5 ] && [ $a -le 4 ] && echo ok", "ok"],
	["comparaisons de textes", "[ abc = abc ] && [ abc != abd ] && echo ok", "ok"],
	["-z et -n", "v=; [ -z \"$v\" ] && echo vide; v=x; [ -n \"$v\" ] && echo plein", "vide\nplein"],
	["fichiers", "[ -f notes.csv ] && echo f; [ -d notes.csv ] || echo pas_d; [ -e absent ] || echo pas_e; [ -s vide.txt ] || echo vide; [ -s notes.csv ] && echo s", "f\npas_d\npas_e\nvide\ns"],
	["dossier", "mkdir sous; [ -d sous ] && echo dossier", "dossier"],
	["droits", "[ -r notes.csv ] && [ -w notes.csv ] && echo rw; [ -x notes.csv ] || echo pas_x; chmod +x notes.csv; [ -x notes.csv ] && echo x", "rw\npas_x\nx"],
	["test et ses opérateurs", "test 3 -gt 2; echo $?; test -f absent; echo $?; test; echo $?", "0\n1\n1"],
	["[ ] avec ! -a -o", "[ ! -f absent -a -f notes.csv ] && echo et; [ -f absent -o -f notes.csv ] && echo ou", "et\nou"],
	["[[ ]] et les motifs", "f=photo.jpg; [[ $f == *.jpg ]] && echo image; [[ $f != *.txt ]] && echo pas_texte", "image\npas_texte"],
	["[[ ]] && || et parenthèses", "a=3; [[ $a -gt 1 && ( $a -lt 2 || $a -eq 3 ) ]] && echo vrai", "vrai"],
	["[[ ]] sans guillemets ni découpage", "v='a b'; [[ $v == 'a b' ]] && echo pareil", "pareil"],
	["[[ =~ ]] et BASH_REMATCH", "[[ 'user42@cybersup.ai' =~ ^([a-z]+)([0-9]+)@ ]] && echo ${BASH_REMATCH[1]} ${BASH_REMATCH[2]} ${BASH_REMATCH[0]}", "user 42 user42@"],
	["[[ =~ ]] qui échoue", "[[ abc =~ ^[0-9]+$ ]]; echo $?", "1"],
	["[[ < ]]", "[[ abc < abd ]] && echo avant", "avant"],

	// Boucles
	["for sur une liste", "for x in a b c; do echo \"<$x>\"; done", "<a>\n<b>\n<c>"],
	["for sur des jokers triés", "touch b.txt a.txt c.log; for f in *.txt; do echo $f; done", "a.txt\nb.txt\neleves.txt\nvide.txt"],
	["for sans correspondance", "for f in *.xyz; do echo \"$f\"; done", "*.xyz"],
	["for (( ))", "for ((i = 0; i < 3; i++)); do echo $i; done", "0\n1\n2"],
	["for sur $(seq)", "s=0; for i in $(seq 1 10); do s=$((s + i)); done; echo $s", "55"],
	["for sur {1..n}", "for i in {1..3}; do echo -n \"$i \"; done; echo", "1 2 3 "],
	["while", "i=0; while [ $i -lt 3 ]; do echo tour $i; i=$((i + 1)); done", "tour 0\ntour 1\ntour 2"],
	["until", "n=3; until [ $n -eq 0 ]; do echo $n; n=$((n - 1)); done; echo partez", "3\n2\n1\npartez"],
	["break", "for i in 1 2 3 4; do [ $i -eq 3 ] && break; echo $i; done", "1\n2"],
	["continue", "for i in 1 2 3 4; do [ $i -eq 2 ] && continue; echo $i; done", "1\n3\n4"],
	["break 2", "for i in 1 2; do for j in a b c; do [ $j = b ] && break 2; echo $i$j; done; done; echo fin", "1a\nfin"],
	["continue 2", "for i in 1 2; do for j in a b; do [ $j = b ] && continue 2; echo $i$j; done; done", "1a\n2a"],
	["while true et break", "n=0; while true; do n=$((n + 1)); [ $n -ge 4 ] && break; done; echo $n", "4"],
	["boucle dans un tuyau", "for i in 3 1 2; do echo $i; done | sort", "1\n2\n3"],
	["for sur \"$@\"", "set -- 'a b' c; for x in \"$@\"; do echo \"[$x]\"; done", "[a b]\n[c]"],
	["for sans in : les arguments", "for x; do echo $x; done", "un\ndeux", 0, ["un", "deux"]],

	// case
	["case simple", "case oui in oui) echo O ;; non) echo N ;; esac", "O"],
	["case avec motifs", "for f in a.txt b.sh c; do case $f in *.txt|*.md) echo \"$f texte\" ;; *.sh) echo \"$f script\" ;; *) echo \"$f autre\" ;; esac; done", "a.txt texte\nb.sh script\nc autre"],
	["case et classes", "for c in 7 x Z; do case $c in [0-9]) echo chiffre ;; [a-z]) echo minuscule ;; *) echo autre ;; esac; done", "chiffre\nminuscule\nautre"],
	["case sans correspondance", "case z in a) echo a ;; esac; echo $?", "0"],

	// Fonctions
	["fonction et arguments", "f() { echo \"$# : $1 $2\"; }; f a b", "2 : a b"],
	["return et statut", "f() { return 3; }; f; echo $?", "3"],
	["mot-clé function", "function salut { echo \"salut $1\"; }; salut Ada", "salut Ada"],
	["local", "v=dehors; f() { local v=dedans; echo $v; }; f; echo $v", "dedans\ndehors"],
	["sans local, la variable change", "v=dehors; f() { v=change; }; f; echo $v", "change"],
	["$1 rendu après l'appel", "f() { echo $1; }; f interne; echo \"[$1]\"", "interne\n[ext]", 0, ["ext"]],
	["récursion", "fact() { if [ $1 -le 1 ]; then echo 1; else echo $(( $1 * $(fact $(( $1 - 1 ))) )); fi; }; fact 6", "720"],
	["fonction dans un tuyau", "maj() { tr a-z A-Z; }; echo bonjour | maj", "BONJOUR"],
	["fonction sur plusieurs lignes", "compter() {\n  local n=0\n  for x in \"$@\"; do n=$((n + 1)); done\n  echo $n\n}\ncompter a b c", "3"],
	["shift", "f() { shift; echo $*; }; f a b c", "b c"],
	["set --", "set -- x y z; echo $# $1 $3", "3 x z"],
	["$# $@ $* $0", "echo \"$0 $# $@\"; echo \"$*\"", "script 2 un deux\nun deux", 0, ["un", "deux"]],
	["\"$*\" et IFS", "IFS=,; echo \"$*\"", "a,b,c", 0, ["a", "b", "c"]],

	// Groupes et sous-shells
	["groupe { }", "{ echo a; echo b; } | wc -l", "2"],
	["sous-shell : variables à l'intérieur", "x=1; (x=2; echo $x); echo $x", "2\n1"],
	["sous-shell : cd à l'intérieur", "mkdir d; (cd d; touch dedans); [ -f d/dedans ] && echo ok; [ -f dedans ] || echo pas_ici", "ok\npas_ici"],
	["redirection d'un groupe", "{ echo un; echo deux; } > sortie.txt; cat sortie.txt", "un\ndeux"],
	["redirection d'une boucle", "for i in 1 2; do echo $i; done > n.txt; wc -l < n.txt", "2"],

	// Redirections
	["> puis >>", "echo un > f.txt; echo deux >> f.txt; cat f.txt", "un\ndeux"],
	["< fichier", "wc -l < notes.csv", "5"],
	["here-document", "cat <<FIN\nligne 1\nligne $((1 + 1))\nFIN", "ligne 1\nligne 2"],
	["here-document cité", "x=1; cat <<'FIN'\npas de $x ici\nFIN", "pas de $x ici"],
	["here-document <<-", "cat <<-FIN\n\tindenté\n\tFIN", "indenté"],
	["here-string", "tr a-z A-Z <<< \"bonjour $USER_INEXISTANT\"", "BONJOUR "],
	["2> /dev/null", "cat fichier_absent 2> /dev/null; echo $?", "1"],
	["erreurs vers la sortie normale", "{ echo normal; echo erreur >&2; } 2>&1 | wc -l", "2"],
	["les erreurs ne vont pas dans le tuyau", "{ echo normal; echo erreur >&2; } 2>/dev/null | wc -l", "1"],

	// read
	["read plusieurs variables", "read a b c <<< 'un deux trois quatre'; echo \"$a/$b/$c\"", "un/deux/trois quatre"],
	["read et IFS", "IFS=: read u x id <<< 'ada:x:1000'; echo $u $id", "ada 1000"],
	["read -r garde les \\", "read -r l <<< 'a\\tb'; echo \"$l\"", "a\\tb"],
	["read sans -r", "read l <<< 'a\\tb'; echo \"$l\"", "atb"],
	["read REPLY", "read <<< 'par défaut'; echo $REPLY", "par défaut"],
	["read : fin de l'entrée", "read l < vide.txt; echo $?", "1"],
	["while read sur un fichier", "while read -r nom classe; do echo \"$classe:$nom\"; done < eleves.txt | sort | head -2", "B2:Ada\nB2:Cyd"],
	["cmd | while read", "grep B3 eleves.txt | while read nom classe; do echo $nom; done", "Bob\nDan"],
	["while read et here-doc", "while read x; do echo \"> $x\"; done <<EOF\nun\ndeux\nEOF", "> un\n> deux"],
	["read dans un groupe", "echo 'a b' | { read x y; echo \"$y $x\"; }", "b a"],
	["echo | read : rien ne reste", "x=avant; echo apres | read x; echo $x", "avant"],
	["read -p sans terminal", "read -p 'Nom ? ' nom <<< Ada; echo \"Bonjour $nom\"", "Bonjour Ada"],

	// printf, echo
	["printf %s %d", "printf '%s a %d ans\\n' Ada 20", "Ada a 20 ans"],
	["printf largeurs", "printf '[%5s][%-5s][%05d]\\n' ab cd 42", "[   ab][cd   ][00042]"],
	["printf décimales", "printf '%.2f %.0f %5.1f\\n' 3.14159 2.5 12.345", "3.14 2  12.3"],
	["printf réutilise le format", "printf '%s\\n' un deux trois", "un\ndeux\ntrois"],
	["printf tabulation et %%", "printf 'a\\tb 100%%\\n'", "a\tb 100%"],
	["printf sans retour final", "printf 'sans'; printf ' fin\\n'", "sans fin"],
	["printf hexa et caractère", "printf '%x %X %o %c\\n' 255 255 8 Bonjour", "ff FF 10 B"],
	["echo -n", "echo -n un; echo deux", "undeux"],
	["echo -e", "echo -e 'a\\tb\\nc'", "a\tb\nc"],
	["echo sans -e", "echo 'a\\tb'", "a\\tb"],
	["echo tout seul", "echo; echo x", "\nx"],

	// seq, basename, dirname, expr, sleep
	["seq", "seq 3; seq 2 2 6; seq 3 -1 1 | tr '\\n' ' '", "1\n2\n3\n2\n4\n6\n3 2 1 "],
	["seq -s et -w", "seq -s, 3; seq -w 8 10", "1,2,3\n08\n09\n10"],
	["basename", "basename /var/log/auth.log; basename rapport.md .md", "auth.log\nrapport"],
	["dirname", "dirname /var/log/auth.log; dirname rapport.md", "/var/log\n."],
	["expr", "expr 2 + 3; expr 7 \\* 6; expr 7 / 2; expr length bonjour", "5\n42\n3\n7"],
	["expr : statut", "expr 0 + 0; echo $?", "0\n1"],
	["sleep rend la main", "sleep 0.1; echo réveil", "réveil"],

	// set -e, set -x, set -u
	["set -e arrête", "set -e; echo un; false; echo deux", "un", 1],
	["set -e et les conditions", "set -e; if false; then :; fi; false || true; ! true; echo encore", "encore"],
	["set -e et &&", "set -e; false && true; echo continue", "continue"],
	["set -u", "set -u; echo ${absente:-ok}", "ok"],

	// Tableaux
	["tableaux", "t=(un deux trois); echo ${t[1]} ${#t[@]}; t+=(quatre); echo ${t[@]}", "deux 3\nun deux trois quatre"],
	["tableau et boucle", "t=('a b' c); for x in \"${t[@]}\"; do echo \"[$x]\"; done", "[a b]\n[c]"],
	["indices d'un tableau", "t=(x y z); echo ${!t[@]} ${t[-1]}", "0 1 2 z"],
	["indirection ${!nom}", "cible=valeur; nom=cible; echo ${!nom}", "valeur"],
	["read -a", "read -a mots <<< '  un deux   trois '; echo ${#mots[@]} ${mots[2]}", "3 trois"],
	["tableau : tranche", "t=(a b c d); echo ${t[@]:1:2}", "b c"],
	["$RANDOM est un nombre", "r=$RANDOM; [[ $r =~ ^[0-9]+$ ]] && (( r < 32768 )) && echo nombre", "nombre"],
	["eval", "cmd='echo $((6 * 7))'; eval \"$cmd\"", "42"],

	// Pièges classiques
	["le compteur perdu dans un tuyau", "n=0; cat eleves.txt | while read l; do n=$((n + 1)); done; echo $n", "0"],
	["le compteur gardé avec <", "n=0; while read l; do n=$((n + 1)); done < eleves.txt; echo $n", "5"],
	["guillemets et espaces dans les noms", "touch 'mon fichier.txt'; for f in *fichier*; do echo \"[$f]\"; done", "[mon fichier.txt]"],
	["== dans [ ]", "[ a == a ] && echo égal", "égal"],
	["chaîne vide sans guillemets", "v=; [ -z $v ] && echo vide", "vide"],
	["$? juste après un test", "[ 2 -gt 1 ]; r=$?; echo \"r=$r\"", "r=0"],
	["$( ) dans une condition", "if [ $(grep -c B2 eleves.txt) -gt 2 ]; then echo beaucoup; fi", "beaucoup"],
	["if sur une commande", "if grep -q Bob eleves.txt; then echo présent; fi", "présent"],
	["négation d'une commande", "if ! grep -q Zoe eleves.txt; then echo absente; fi", "absente"],
	["case dans une fonction", "type_de() { case $1 in *.sh) echo script ;; *) echo autre ;; esac; }; type_de a.sh; type_de b", "script\nautre"],
	["fonction qui renvoie une valeur par echo", "carre() { echo $(( $1 * $1 )); }; x=$(carre 7); echo $((x + 1))", "50"],
	["boucles imbriquées", "for i in 1 2; do for j in 1 2; do echo -n \"$i$j \"; done; done; echo", "11 12 21 22 "],
	["while avec deux conditions", "i=0; while [ $i -lt 10 ] && [ $i -ne 3 ]; do i=$((i + 1)); done; echo $i", "3"],
	["somme des notes avec cut", "s=0; for n in $(cut -d, -f2 notes.csv | tail -n +2); do s=$((s + n)); done; echo $s", "54"],
	["sed dans une boucle", "for c in B2 B3; do echo \"$c : $(grep -c $c eleves.txt)\"; done", "B2 : 3\nB3 : 2"],
	["printf pour un tableau aligné", "while read n c; do printf '%-4s|%3s\\n' $n $c; done < eleves.txt | head -2", "Ada | B2\nBob | B3"],
	["here-string et variable", "nom=Ada; grep -c a <<< \"$nom\"", "1"],
	["seq et printf", "printf '%02d ' $(seq 1 3); echo", "01 02 03 "],
	["tr et majuscules", "echo bonjour | tr '[:lower:]' '[:upper:]'", "BONJOUR"],
	["sort -n et head", "printf '10\\n9\\n100\\n' | sort -n | head -1", "9"],
	["wc -w sur une variable", "phrase='un deux trois'; echo $phrase | wc -w", "3"],

	// Scripts réalistes (B2, B3)
	["B2 : analyse d'un journal SSH",
		"#!/bin/bash\n" +
		"# Compte les échecs de connexion par adresse et signale les plus insistantes\n" +
		"fichier=${1:-auth.log}\n" +
		"if [ ! -f \"$fichier\" ]; then\n" +
		"  echo \"Fichier introuvable : $fichier\" >&2\n" +
		"  exit 1\n" +
		"fi\n" +
		"grep \"Failed password\" \"$fichier\" | awk '{print $NF}' | sort | uniq -c | sort -rn | while read -r nombre ip; do\n" +
		"  if [ \"$nombre\" -ge 3 ]; then\n" +
		"    echo \"ALERTE $ip : $nombre échecs\"\n" +
		"  else\n" +
		"    echo \"ok $ip : $nombre\"\n" +
		"  fi\n" +
		"done",
		"ALERTE 10.0.0.5 : 3 échecs\nok 10.0.0.7 : 2"],
	["B2 : le même script sur un fichier absent", "fichier=${1:-auth.log}\nif [ ! -f \"$fichier\" ]; then\n  echo \"Fichier introuvable : $fichier\" >&2\n  exit 1\nfi\necho jamais", "", 1, ["absent.log"]],
	["B2 : moyenne d'une classe",
		"total=0; n=0; max=0; meilleur=\n" +
		"while IFS=, read -r nom note; do\n" +
		"  [ \"$nom\" = \"nom\" ] && continue\n" +
		"  total=$((total + note)); n=$((n + 1))\n" +
		"  if (( note > max )); then max=$note; meilleur=$nom; fi\n" +
		"done < notes.csv\n" +
		"printf \"Élèves : %d\\n\" \"$n\"\n" +
		"printf \"Moyenne : %d.%02d\\n\" $((total / n)) $(( (total * 100 / n) % 100 ))\n" +
		"echo \"Meilleur : $meilleur ($max)\"",
		"Élèves : 4\nMoyenne : 13.50\nMeilleur : Dan (18)"],
	["B2 : solidité des mots de passe",
		"verifier() {\n" +
		"  local mdp=$1 score=0\n" +
		"  [[ ${#mdp} -ge 12 ]] && score=$((score + 1))\n" +
		"  [[ $mdp =~ [A-Z] ]] && score=$((score + 1))\n" +
		"  [[ $mdp =~ [0-9] ]] && score=$((score + 1))\n" +
		"  [[ $mdp =~ [^a-zA-Z0-9] ]] && score=$((score + 1))\n" +
		"  echo $score\n" +
		"}\n" +
		"for m in azerty 'Azerty123!' 'Tr0ub4dor&3xyz'; do\n" +
		"  s=$(verifier \"$m\")\n" +
		"  case $s in\n" +
		"    4) echo \"$m : solide\" ;;\n" +
		"    2|3) echo \"$m : moyen\" ;;\n" +
		"    *) echo \"$m : faible\" ;;\n" +
		"  esac\n" +
		"done",
		"azerty : faible\nAzerty123! : moyen\nTr0ub4dor&3xyz : solide"],
	["B2 : sauvegarde avec contrôle des arguments",
		"usage() { echo \"usage : $0 SOURCE [SUFFIXE]\" >&2; exit 2; }\n" +
		"[ $# -ge 1 ] || usage\n" +
		"src=$1; suffixe=${2:-bak}\n" +
		"[ -f \"$src\" ] || { echo \"absent : $src\" >&2; exit 1; }\n" +
		"cat \"$src\" > \"$src.$suffixe\" && echo \"copie : $src.$suffixe\"\n" +
		"[ -s \"$src.$suffixe\" ] && echo \"$(wc -l < \"$src.$suffixe\") lignes\"",
		"copie : notes.csv.old\n5 lignes", 0, ["notes.csv", "old"]],
	["B2 : sauvegarde sans argument", "usage() { echo \"usage : $0 SOURCE\" >&2; exit 2; }\n[ $# -ge 1 ] || usage\necho jamais", "", 2],
	["B2 : FizzBuzz",
		"for (( i = 1; i <= 15; i++ )); do\n" +
		"  if (( i % 15 == 0 )); then echo FizzBuzz\n" +
		"  elif (( i % 3 == 0 )); then echo Fizz\n" +
		"  elif (( i % 5 == 0 )); then echo Buzz\n" +
		"  else echo $i\n" +
		"  fi\n" +
		"done | tr '\\n' ' '",
		"1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz "],
	["B2 : menu lu dans un here-document",
		"while read -r choix; do\n" +
		"  case $choix in\n" +
		"    1) echo \"Scan lancé\" ;;\n" +
		"    2) echo \"Rapport\" ;;\n" +
		"    q|Q) echo \"Au revoir\"; break ;;\n" +
		"    *) echo \"Choix inconnu : $choix\" ;;\n" +
		"  esac\n" +
		"done <<EOF\n1\nx\n2\nq\n3\nEOF",
		"Scan lancé\nChoix inconnu : x\nRapport\nAu revoir"],
	["B3 : lire un fichier de configuration",
		"while IFS='=' read -r cle valeur; do\n" +
		"  [[ -z $cle || $cle == \\#* ]] && continue\n" +
		"  echo \"$cle -> $valeur\"\n" +
		"done < config.ini",
		"port -> 22\nhote -> serveur.local\nmode -> strict"],
	["B3 : set -e et || true",
		"set -e\n" +
		"grep -q absent notes.csv || echo \"pas trouvé, on continue\"\n" +
		"n=$(grep -c B2 eleves.txt)\n" +
		"echo \"$n élèves en B2\"\n" +
		"false\n" +
		"echo \"jamais affiché\"",
		"pas trouvé, on continue\n3 élèves en B2", 1],
	["B3 : renommer en masse (à blanc)",
		"touch a.txt b.txt notes.txt\nfor f in *.txt; do\n  echo \"mv $f ${f%.txt}.md\"\ndone",
		"mv a.txt a.md\nmv b.txt b.md\nmv eleves.txt eleves.md\nmv notes.txt notes.md\nmv vide.txt vide.md"],
	["B3 : inventaire par extension",
		"for f in *; do\n  case \"$f\" in\n    *.*) echo \"${f##*.}\" ;;\n    *) echo aucune ;;\n  esac\ndone | sort | uniq -c | sort -rn | head -3",
		"      2 txt\n      1 md\n      1 log"],
	["B3 : ports à surveiller",
		"ports=(22 80 443 3306)\n" +
		"for p in \"${ports[@]}\"; do\n" +
		"  case $p in\n" +
		"    22) svc=ssh ;; 80|443) svc=web ;; *) svc=autre ;;\n" +
		"  esac\n" +
		"  printf '%-5s %s\\n' \"$p\" \"$svc\"\n" +
		"done\n" +
		"echo \"${#ports[@]} ports\"",
		"22    ssh\n80    web\n443   web\n3306  autre\n4 ports"],
	["B3 : rapport écrit par un here-document",
		"nb=$(( $(wc -l < notes.csv) - 1 ))\n" +
		"cat > rapport.txt <<EOF\n" +
		"Rapport de $0\n" +
		"Élèves notés : $nb\n" +
		"Premier : $(sed -n 2p notes.csv | cut -d, -f1)\n" +
		"EOF\n" +
		"cat rapport.txt",
		"Rapport de script\nÉlèves notés : 4\nPremier : Ada"],
	["B3 : fonctions et statut de retour",
		"est_pair() { (( $1 % 2 == 0 )); }\n" +
		"for n in 1 2 3 4; do\n" +
		"  if est_pair $n; then echo \"$n pair\"; else echo \"$n impair\"; fi\n" +
		"done",
		"1 impair\n2 pair\n3 impair\n4 pair"],
	["B3 : compter les mots d'un texte",
		"texte='le chat et le chien et le rat'\n" +
		"for mot in $texte; do echo $mot; done | sort | uniq -c | sort -rn | head -2",
		"      3 le\n      2 et"],
	["B3 : boucle until avec compteur",
		"essais=0\nuntil [ $essais -ge 3 ]; do\n  essais=$((essais + 1))\n  echo \"tentative $essais\"\ndone\necho \"abandon après $essais\"",
		"tentative 1\ntentative 2\ntentative 3\nabandon après 3"],
	["B3 : traitement d'arguments avec shift",
		"verbeux=0\nwhile [ $# -gt 0 ]; do\n  case $1 in\n    -v) verbeux=1 ;;\n    -n) shift; nom=$1 ;;\n    *) echo \"inconnu : $1\" ;;\n  esac\n  shift\ndone\necho \"verbeux=$verbeux nom=$nom\"",
		"inconnu : x\nverbeux=1 nom=Ada", 0, ["-v", "-n", "Ada", "x"]]
];

CAS.forEach(function(c){
	var nom = c[0], texte = c[1], attendu = c[2], statut = c[3] || 0, args = c[4] || [];
	var r = lancer(texte, args);
	if (bavard) console.log("\n# " + nom + "\n" + texte + "\n--- sortie\n" + r.sortie + (r.erreurs ? "\n--- erreurs\n" + r.erreurs : "") + "\n--- statut " + r.code);
	verifier(r.sortie === attendu, nom + " : sortie\n" + JSON.stringify(r.sortie) + "\nau lieu de\n" + JSON.stringify(attendu) + (r.erreurs ? "\n(erreurs : " + r.erreurs + ")" : ""));
	verifier(r.code === statut, nom + " : statut " + r.code + " au lieu de " + statut + (r.erreurs ? "\n(erreurs : " + r.erreurs + ")" : ""));
	if (avecBash){
		var b = lancerBash(texte, args);
		verifier(b.sortie === attendu, nom + " : le vrai bash donne\n" + JSON.stringify(b.sortie) + "\nau lieu de l'attendu\n" + JSON.stringify(attendu));
		verifier(b.code === statut, nom + " : le vrai bash rend le statut " + b.code + " au lieu de " + statut);
	}
});

/* ------------------------------------------------------------------ */
/* 2. Au prompt : variables, multi-ligne, statut                       */
/* ------------------------------------------------------------------ */

remettreLabo();
contient(jeu.taper("N=3; echo $N"), "3", "au prompt, N=3; echo $N affiche 3");
contient(jeu.taper("echo $N"), "3", "la variable reste d'une ligne à l'autre");
contient(jeu.taper("echo ${N}0 ${#N}"), "30 1", "${N} et ${#N} au prompt");
jeu.taper("grep zzz notes.csv");
verifier(jeu.lire("Shell.statut") === 1, "grep sans résultat pose $? = 1 : " + jeu.lire("Shell.statut"));
contient(jeu.taper("echo $?"), "1", "$? lu au prompt");
jeu.taper("sort_inconnu_du_monde");
verifier(jeu.lire("Shell.statut") === 127, "un sort inconnu rend 127 : " + jeu.lire("Shell.statut"));
contient(jeu.taper("false || echo secours"), "secours", "|| est maintenant compris");

// Saisie sur plusieurs lignes : l'invite « > » attend la suite.
var invites = [];
jeu.lire("term.definirInvite = function(t){ invitesVues.push(t); }; var invitesVues = [];");
var inacheve = jeu.taper("if true");
contient(inacheve, "Commande inachevée : il manque « then »", "if sans fi : rien ne se lance, et la première fois on explique l'invite « > »");
absent(inacheve, "erreur", "if sans fi : pas d'erreur");
verifier(jeu.lire("Shell.saisieEnCours") !== null, "la saisie attend la suite");
verifier(jeu.lire("invitesVues[invitesVues.length - 1]") === "> ", "l'invite devient « > »");
jeu.taper("then echo dans le bloc");
contient(jeu.taper("fi"), "dans le bloc", "le bloc se lance au fi");
verifier(jeu.lire("Shell.saisieEnCours") === null, "la saisie est terminée");
verifier(jeu.lire("invitesVues[invitesVues.length - 1]") !== "> ", "l'invite normale revient");
contient(jeu.taper("for i in 1 2\ndo echo tour $i\ndone"), "tour 2", "une ligne avec des \\n se lance d'un coup");
verifier(jeu.taper("while false") === "", "la deuxième fois, l'invite « > » n'est plus expliquée");
jeu.taper("do :; done");
contient(jeu.taper("echo \"guillemet ouvert"), "un guillemet \" n'est pas refermé", "un guillemet oublié est toujours expliqué");
contient(jeu.taper("refermé\""), "guillemet ouvert\nrefermé", "un guillemet ouvert continue à la ligne suivante");
jeu.taper("echo une \\");
contient(jeu.taper("suite"), "une suite", "une \\ finale continue la ligne");
jeu.taper("cat <<FIN");
jeu.taper("corps du here-doc");
contient(jeu.taper("FIN"), "corps du here-doc", "un here-document tapé ligne à ligne");
jeu.taper("while true; do");
jeu.lire("Shell.interrompre()");
verifier(jeu.lire("Shell.saisieEnCours") === null && jeu.lire("Shell.statut") === 130, "Ctrl+C abandonne la saisie (statut 130)");
jeu.taper("if true; then");
var finSaisie = [];
jeu.lire("var vraiEcho = term.echo; var finDeSaisieVue = []; term.echo = function(t){ finDeSaisieVue.push(String(t)); }; Shell.finDeSaisie(); term.echo = vraiEcho;");
contient(jeu.lire("finDeSaisieVue.join('\\n')"), "fin de fichier prématurée", "Ctrl+D au milieu d'une saisie : fin de fichier prématurée");
contient(jeu.lire("finDeSaisieVue.join('\\n')"), "« fi »", "et le conseil dit ce qui manque");
verifier(jeu.lire("Shell.finDeSaisie()") === false, "Ctrl+D sans saisie en cours : le terminal fait son logout habituel");

// Fonctions au prompt, sudo dans une boucle
jeu.taper("bonjour() { echo \"Bonjour $1\"; }");
contient(jeu.taper("bonjour Ada"), "Bonjour Ada", "une fonction définie au prompt reste disponible");
contient(jeu.taper("bonjour Bob | tr a-z A-Z"), "BONJOUR BOB", "une fonction dans un tuyau au prompt");

// Les variables non exportées ne passent pas aux scripts
contient(jeu.taper("secret=42; bash -c 'echo \"[$secret]\"'"), "[]", "une variable non exportée ne passe pas à bash -c");
contient(jeu.taper("export secret; bash -c 'echo \"[$secret]\"'"), "[42]", "export la fait passer");
contient(jeu.taper("TEMP=passe bash -c 'echo $TEMP'"), "passe", "NOM=valeur bash -c ... la passe aussi");
contient(jeu.taper("(echo \"[$N]\")"), "[3]", "un sous-shell voit les variables non exportées");

/* ------------------------------------------------------------------ */
/* 3. Scripts : fichiers, arguments, sorties séparées                  */
/* ------------------------------------------------------------------ */

remettreLabo();
jeu.taper("cat > info.sh <<'EOF'\n#!/bin/bash\n# un script commenté\necho \"script $0 avec $# arguments : $@\"\necho \"un avertissement\" >&2\nexit 4\necho jamais\nEOF");
var s1 = jeu.taper("bash info.sh un 'deux trois'; echo \"statut $?\"");
contient(s1, "script info.sh avec 2 arguments : un deux trois", "bash SCRIPT ARGS : $0, $#, $@");
contient(s1, "un avertissement", "les erreurs du script s'affichent");
contient(s1, "statut 4", "exit 4 arrête le script et pose son statut");
absent(s1, "jamais", "rien après exit");
var s2 = jeu.taper("bash info.sh > sortie.txt");
contient(s2, "un avertissement", "bash script > f : les erreurs restent à l'écran");
var s3 = jeu.taper("cat sortie.txt");
contient(s3, "script info.sh", "bash script > f : la sortie normale va dans f");
absent(s3, "avertissement", "bash script > f : les erreurs ne vont pas dans f");
contient(jeu.taper("x=$(bash info.sh 2>/dev/null); echo \"[$x]\""), "[script info.sh avec 0 arguments : ]", "$(bash script) ne capture que la sortie normale");
contient(jeu.taper("./info.sh"), "Permission non accordée", "./script sans le droit x");
verifier(jeu.lire("Shell.statut") === 126, "./script sans le droit x rend 126 : " + jeu.lire("Shell.statut"));
jeu.taper("chmod +x info.sh");
contient(jeu.taper("./info.sh a"), "script ./info.sh avec 1 arguments : a", "./script ARGS avec le droit x");
contient(jeu.taper("sh info.sh"), "script info.sh", "sh est un autre nom de bash");
contient(jeu.taper("bash -c 'echo $0 $1 $#' prog a b"), "prog a 2", "bash -c TEXTE NOM ARGS");
contient(jeu.taper("bash -c 'exit 7'; echo $?"), "7", "bash -c 'exit 7'");
jeu.taper("cat > vars.sh <<'EOF'\nINTERNE=dedans\ncd ..\nEOF");
jeu.taper("bash vars.sh");
contient(jeu.taper("echo \"[$INTERNE]\"; pwd"), "[]", "les variables d'un script restent dans le script");
verifier(jeu.lire("current_room.room_name") === "labo", "le cd d'un script ne déplace pas le joueur");
jeu.taper("source vars.sh");
contient(jeu.taper("echo $INTERNE"), "dedans", "source garde les variables dans le shell en cours");
verifier(jeu.lire("current_room.room_name") === "Maison", "source fait vraiment cd .. (comme bash) : " + jeu.lire("current_room.room_name"));
jeu.taper("cd labo");
jeu.taper(". vars.sh");
verifier(jeu.lire("current_room.room_name") === "Maison", ". est un autre nom de source");
jeu.taper("cd labo");
remettreLabo();
// Un long script (plus de 60 lignes) passe maintenant ; au-delà de 400, c'est un roman.
var long = [];
for (var k = 0; k < 120; k++) long.push("echo ligne" + k);
jeu.lire("current_room.addItem((function(){ var it = new Item('long.sh', " + JSON.stringify(long.join("\n")) + "); it.owner = JOUEUR; return it; })())");
contient(jeu.taper("bash long.sh | tail -1"), "ligne119", "un script de 120 lignes se lance en entier");
var roman = [];
for (k = 0; k < 450; k++) roman.push("echo " + k);
jeu.lire("current_room.addItem((function(){ var it = new Item('roman.sh', " + JSON.stringify(roman.join("\n")) + "); it.owner = JOUEUR; return it; })())");
contient(jeu.taper("bash roman.sh"), "c'est un roman", "au-delà de 400 lignes, le script est refusé");
// set -x et bash -x : la trace va sur la sortie des erreurs
jeu.taper("cat > trace.sh <<'EOF'\na=1\necho $a\nEOF");
var trace = jeu.taper("bash -x trace.sh 2>/dev/null");
verifier(trace.indexOf("+ ") === -1 && trace.indexOf("1") > -1, "bash -x : la trace part sur la sortie 2 :\n" + trace);
contient(jeu.taper("bash -x trace.sh"), "+ echo 1", "bash -x montre chaque commande développée");
// bash -n vérifie la syntaxe sans rien lancer
jeu.taper("cat > casse.sh <<'EOF'\necho début\nif true; then\necho dedans\nEOF");
var casse = jeu.taper("bash -n casse.sh");
contient(casse, "fin de fichier prématurée", "bash -n trouve le if sans fi");
absent(casse, "début", "bash -n ne lance rien");
var casse2 = jeu.taper("bash casse.sh; echo \"statut $?\"");
contient(casse2, "« fi »", "le message dit ce qui manque");
contient(casse2, "statut 2", "une erreur de syntaxe rend 2");
jeu.taper("cat > situe.sh <<'EOF'\necho un\n\ncat fichier_absent\nf() {\n  commande_inconnue\n}\nf\necho $((1 / 0))\nEOF");
var situe = jeu.taper("bash situe.sh");
contient(situe, "situe.sh : ligne 3 : cat : « fichier_absent »", "une erreur dans un script dit sa ligne, comme bash");
contient(situe, "situe.sh : ligne 5 : commande_inconnue : sort inconnu", "une erreur dans une fonction du script : la ligne de la commande");
contient(situe, "situe.sh : ligne 8 : 1 / 0 : division par 0", "une erreur de calcul : sa ligne aussi");
absent(jeu.taper("cat fichier_absent"), "ligne", "au prompt, pas de numéro de ligne");

/* ------------------------------------------------------------------ */
/* 4. Les erreurs : comme bash, en français                            */
/* ------------------------------------------------------------------ */

function erreur(texte, attendu, msg, statut){
	var r = lancer(texte);
	contient(r.erreurs, attendu, msg);
	if (statut !== undefined) verifier(r.code === statut, msg + " : statut " + r.code + " au lieu de " + statut);
	return r;
}
erreur("if true then echo x; fi", "erreur de syntaxe près du symbole inattendu « fi »", "then oublié", 2);
erreur("for i in 1 2; echo $i; done", "« echo »", "do oublié");
erreur("while true; do echo x", "fin de fichier prématurée", "done oublié", 2);
erreur("case x in a) echo a", "esac", "esac oublié", 2);
erreur("echo )", "« ) »", "parenthèse seule", 2);
erreur("fi", "« fi »", "fi tout seul", 2);
erreur("echo $((1 / 0))", "division par 0", "division par zéro", 1);
erreur("echo $((2 +))", "opérande attendu", "calcul incomplet");
erreur("echo $((08))", "octal", "08 lu en octal : le conseil l'explique");
erreur("[ 1 -eq 1", "il manque le « ] »", "[ sans ]", 2);
erreur("[1 -eq 1 ]", "Il faut une espace après [", "[1 collé");
erreur("x = 3", "pas d'espace autour du signe égal", "x = 3", 127);
erreur("[ abc -eq 3 ]", "nombre entier attendu", "-eq sur un texte", 2);
erreur("v='a b'; [ $v = x ]", "Mets-la entre guillemets", "variable non citée dans [ ]", 2);
erreur("break", "n'a de sens que dans une boucle", "break hors boucle");
erreur("return", "que dans une fonction", "return hors fonction");
erreur("local x=1", "ne s'utilise que dans une fonction", "local hors fonction");
erreur("set -u; echo $absente", "variable sans valeur (set -u)", "set -u");
erreur("echo ${jamais_vue:?il faut la poser}", "il faut la poser", "${x:?message}");
erreur("echo ${", "fin de fichier prématurée", "${ jamais fermé", 2);
erreur("read x", "read ne lit pas le clavier", "read sans entrée : le conseil", 1);
erreur("cat < absent.txt", "aucun lieu ni objet", "< sur un fichier absent", 1);
erreur("echo > $vide_inexistante", "redirection ambiguë", "redirection vers une variable vide");
erreur("printf", "il faut un format", "printf sans format");
erreur("printf '%d\\n' abc", "nombre invalide", "printf %d sur un texte");
erreur("seq", "utilisation", "seq sans nombre");
erreur("expr 2 +", "il manque un argument", "expr incomplet");
erreur("f() { f; }; f", "appels emboîtés", "récursion sans fin : le garde-fou", 1);
var infini = erreur("while true; do :; done", "arrêt d'urgence après 5000 commandes", "boucle infinie : le garde-fou", 1);
contient(infini.erreurs, "Boucle infinie ?", "le message est pédagogique");
erreur("i=0; while [ $i -lt 10 ]; do echo $i; done", "arrêt d'urgence", "i oublié dans la boucle : arrêté aussi");
erreur("echo {1..100000}", "c'est trop pour ce monde", "accolades géantes refusées");
erreur("function if { :; }", "mot réservé", "une fonction ne s'appelle pas if");
erreur("sudo bonjour", "", "sudo sur une fonction");
var limite = jeu.lire("Interpreteur.LIMITE_COMMANDES");
verifier(limite >= 1000 && limite <= 20000, "la limite de commandes est raisonnable : " + limite);
// Une boucle longue mais finie passe sous la limite, et vite.
var debut = Date.now();
var grande = lancer("s=0; for ((i = 1; i <= 1000; i++)); do s=$((s + i)); done; echo $s");
verifier(grande.sortie === "500500" && Date.now() - debut < 3000, "1000 tours de boucle passent, vite : " + grande.sortie + " en " + (Date.now() - debut) + " ms");
// Au prompt, le garde-fou rend la main avec un message, et le jeu continue.
contient(jeu.taper("while true; do echo x; done"), "arrêt d'urgence", "au prompt, la boucle infinie est arrêtée");
contient(jeu.taper("echo encore là"), "encore là", "et le terminal répond toujours");
contient(jeu.taper("exit_inexistant; echo $?"), "127", "le statut 127 au prompt");

/* ------------------------------------------------------------------ */
/* 5. Les sorts du scripteur : manuel, listes du jeu                   */
/* ------------------------------------------------------------------ */

["read", "printf", "seq", "basename", "dirname", "expr", "sleep"].forEach(function(s){
	verifier(jeu.lire("MANUEL[" + JSON.stringify(s) + "] && MANUEL[" + JSON.stringify(s) + "].page.length > 50"), s + " a sa page de manuel");
	verifier(jeu.lire("MANUEL[" + JSON.stringify(s) + "].page.indexOf('—') === -1 && MANUEL[" + JSON.stringify(s) + "].resume.indexOf('—') === -1"), s + " : pas de tiret cadratin dans son manuel");
	verifier(!jeu.lire("tousLesSorts().indexOf(" + JSON.stringify(s) + ") > -1"), s + " n'est encore dans aucun ORDRE_DES_SORTS");
	verifier(!jeu.lire("COMMANDES_REELLES.indexOf(" + JSON.stringify(s) + ") > -1"), s + " n'est plus dans COMMANDES_REELLES");
});
verifier(!jeu.lire("COMMANDES_REELLES.indexOf('sh') > -1"), "sh n'est plus dans COMMANDES_REELLES");
contient(jeu.taper("man printf"), "%-10s", "man printf");
contient(jeu.taper("read --help"), "while read -r ligne", "read --help");
var neuf = nouveauJeu();
neuf.lire("delete state.spells.seq;");
contient(neuf.taper("seq 3"), "Tu ne connais pas encore le sort « seq »", "seq s'apprend comme un sort");
contient(neuf.taper("true && : && echo toujours"), "toujours", "true et : sont toujours disponibles");
contient(neuf.taper("[ 1 -lt 2 ] && test 2 -gt 1 && [[ 3 == 3 ]] && echo tests"), "tests", "test, [ et [[ sont toujours disponibles");
var xpAvant = neuf.lire("state.xp");
neuf.taper("printf 'x\\n'");
verifier(neuf.lire("state.xp") === xpAvant, "un sort hors barème ne rapporte pas d'XP de premier usage");

/* ------------------------------------------------------------------ */
/* 6. L'API pour le chapitre 4 et les événements des quêtes            */
/* ------------------------------------------------------------------ */

remettreLabo();
var api = JSON.parse(jeu.lire("JSON.stringify(Interpreteur.capturer('echo un; echo deux >&2; exit 3'))"));
verifier(api.sortie === "un" && api.erreurs === "deux" && api.code === 3, "Interpreteur.capturer : { sortie, erreurs, code } " + JSON.stringify(api));
var apiArgs = JSON.parse(jeu.lire("JSON.stringify(Interpreteur.capturer('echo $0:$1:$#', { nom0: 'quete.sh', positionnels: ['a', 'b'] }))"));
verifier(apiArgs.sortie === "quete.sh:a:2", "Interpreteur.capturer avec arguments : " + apiArgs.sortie);
jeu.lire("Interpreteur.capturer('PORTEE=enfant')");
verifier(jeu.lire("Interpreteur.lire('PORTEE')") === "", "capturer : portée enfant par défaut");
jeu.lire("Interpreteur.capturer('PORTEE=courante', { portee: 'courante' })");
verifier(jeu.lire("Interpreteur.lire('PORTEE')") === "courante", "capturer : portée courante sur demande");
verifier(jeu.lire("Interpreteur.verifier('if true; then') === 'incomplet'"), "Interpreteur.verifier : incomplet");
verifier(jeu.lire("Interpreteur.verifier('echo ok') === null"), "Interpreteur.verifier : complet");
verifier(jeu.lire("Interpreteur.verifier('fi') instanceof ShellError"), "Interpreteur.verifier : erreur de syntaxe");
verifier(jeu.lire("Interpreteur.arith('6 * 7')") === 42, "Interpreteur.arith");
var structures = jeu.lire("Interpreteur.structures('f() { local x; }; for i in 1; do read a; done; while false; do :; done; case x in x) ;; esac; if [ -f a ]; then echo $(date) $((1+1)); fi; set -e; cat <<E\\nx\\nE').sort().join(',')");
["fonction", "local", "for", "read", "while", "case", "if", "test", "$(...)", "$((...))", "set -e", "here-doc"].forEach(function(s){
	contient(structures, s, "Interpreteur.structures repère " + s);
});
verifier(jeu.lire("Interpreteur.structures('if').length") === 0, "Interpreteur.structures d'un texte incomplet : liste vide");

jeu.lire("var evenementsVus = []; ['script', 'boucle', 'fonction'].forEach(function(t){ GameEvents.addListener(t, function(e){ evenementsVus.push(e); }); });");
jeu.taper("cat > quete.sh <<'EOF'\nsalut() { echo \"salut $1\"; }\nfor n in \"$@\"; do salut $n; done\nwhile read l; do :; done <<< x\nexit 5\nEOF");
jeu.lire("evenementsVus.length = 0");
jeu.taper("bash quete.sh Ada Bob");
var evScript = JSON.parse(jeu.lire("JSON.stringify(evenementsVus.filter(function(e){ return e.type === 'script'; }).map(function(e){ return { nom: e.nom, args: e.args, statut: e.statut, structures: e.structures, item: e.item && e.item.itemname }; }))"));
verifier(evScript.length === 1, "un événement « script » par script lancé : " + evScript.length);
verifier(evScript[0] && evScript[0].nom === "quete.sh" && evScript[0].item === "quete.sh", "« script » : le nom et l'objet du script");
verifier(evScript[0] && evScript[0].args.join(",") === "Ada,Bob", "« script » : ses arguments");
verifier(evScript[0] && evScript[0].statut === 5, "« script » : son statut");
verifier(evScript[0] && ["fonction", "for", "while", "read", "here-string", "arguments"].every(function(s){ return evScript[0].structures.indexOf(s) > -1; }), "« script » : les structures utilisées " + JSON.stringify(evScript[0] && evScript[0].structures));
var evBoucles = JSON.parse(jeu.lire("JSON.stringify(evenementsVus.filter(function(e){ return e.type === 'boucle'; }).map(function(e){ return { sorte: e.sorte, tours: e.tours, dansScript: e.dansScript }; }))"));
verifier(evBoucles.length === 2 && evBoucles[0].sorte === "for" && evBoucles[0].tours === 2 && evBoucles[0].dansScript, "« boucle » : for, 2 tours, dans un script " + JSON.stringify(evBoucles));
verifier(evBoucles[1] && evBoucles[1].sorte === "while" && evBoucles[1].tours === 1, "« boucle » : while, 1 tour");
var evFonctions = JSON.parse(jeu.lire("JSON.stringify(evenementsVus.filter(function(e){ return e.type === 'fonction'; }).map(function(e){ return e.action + ':' + e.nom + ':' + (e.args || []).join('+'); }))"));
verifier(evFonctions.join(" ") === "definition:salut: appel:salut:Ada appel:salut:Bob", "« fonction » : la définition, puis chaque appel " + evFonctions.join(" "));
jeu.lire("evenementsVus.length = 0");
jeu.taper("bash -c 'until true; do :; done' x y");
var evC = JSON.parse(jeu.lire("JSON.stringify(evenementsVus.map(function(e){ return e.type + ':' + (e.nom || e.sorte); }))"));
verifier(evC.join(" ") === "boucle:until script:bash -c", "bash -c annonce sa boucle puis le script : " + evC.join(" "));
// Les quêtes existantes reçoivent toujours e.item et e.direct
jeu.lire("evenementsVus.length = 0");
jeu.taper("chmod +x quete.sh; ./quete.sh");
verifier(jeu.lire("evenementsVus.filter(function(e){ return e.type === 'script'; })[0].direct") === true, "« script » : direct pour ./script");

/* ------------------------------------------------------------------ */
/* 7. L'épreuve finale : un grep vide n'est pas une fausse manœuvre    */
/* ------------------------------------------------------------------ */

var SECRETS_DE_TEST = "EMPREINTE_CODE_EXAMEN = empreinteLente('examen|TEST-1234'); EMPREINTE_FORMATEUR = empreinteLente('formateur|mot-de-passe-de-test');";
var examen = monde.nouveauMonde({ "terminus-cybersup-profil": JSON.stringify({ graine: 4242, prenom: "Ada", chapitre: 1, modeExamen: true }) });
examen.lire(SECRETS_DE_TEST + " state.nom = 'Ada'; demarrerExamen(); Shell.narration = [];");
examen.taper("grep motintrouvable .ordre-de-mission");
verifier(examen.lire("Shell.ligneRateeExamen") === false, "épreuve : grep sans résultat ne compte pas comme une fausse manœuvre");
verifier(examen.lire("Shell.statut") === 1, "épreuve : mais son statut est bien 1");
function fautes(){ return examen.lire("state.examen.erreurs || 0"); }
var f0 = fautes();
examen.taper("grep motintrouvable .ordre-de-mission");
verifier(fautes() === f0, "épreuve : le compteur de fausses manœuvres ne bouge pas pour un grep vide");
examen.taper("sortinconnu");
verifier(fautes() === f0 + 1, "épreuve : un sort inconnu compte comme une fausse manœuvre");
examen.taper("if grep -q motintrouvable .ordre-de-mission; then echo oui; else echo non; fi");
verifier(fautes() === f0 + 1, "épreuve : un if sur un grep vide n'est pas une faute");
examen.taper("false || echo secours");
verifier(fautes() === f0 + 1, "épreuve : false n'est pas une faute");
examen.taper("for i in 1 2; do cat fichier_absent_$i; done");
verifier(fautes() === f0 + 2, "épreuve : une vraie erreur dans une boucle compte (une fois par ligne)");

console.log(ok + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
