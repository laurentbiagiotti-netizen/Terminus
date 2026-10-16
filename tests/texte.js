/**
 * Les sorts de texte (grep, sed, awk, sort, uniq, tr, head, tail, wc, cut, nl, rev, fold, tee)
 * comparés aux vrais outils GNU, puis ce qui est propre au jeu (messages, codes de retour, objets écrits).
 *
 * Chaque attendu de la première partie a été relevé avec les vrais outils sous Linux
 * (GNU grep 3.11, sed 4.9, gawk 5.2.1, coreutils 9.4, LC_ALL=C.UTF-8), sur les mêmes objets.
 *
 * Lancer : node tests/texte.js           (-v pour tout voir)
 *          node tests/texte.js --gnu     revérifie aussi chaque attendu avec les vrais outils, s'ils sont installés
 */
var monde = require("./monde.js");
var bavard = process.argv.indexOf("-v") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function egal(obtenu, attendu, m){ verifier(obtenu === attendu, m + "\n--- attendu :\n" + attendu + "\n--- obtenu :\n" + obtenu); }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }

/* Les objets posés dans la Maison (sur le disque, chacun finit par un retour à la ligne). */
var FICHIERS = {
	"journal.log":
		"2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n" +
		"2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n" +
		"2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n" +
		"2026-10-01 09:01:02 cron INFO root -\n" +
		"2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9\n" +
		"2026-10-01 10:00:00 sshd ECHEC guest 10.0.0.5\n" +
		"2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12\n",
	"passwd":
		"root:x:0:0:root:/root:/bin/bash\n" +
		"daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\n" +
		"laurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\n" +
		"myriam:x:1001:1001::/home/myriam:/bin/zsh\n" +
		"maintenance:x:0:0::/var/maint:/bin/sh\n" +
		"www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n",
	"notes.txt":
		"a|b est un tube\n" +
		"le chat (gris) dort\n" +
		"aaa bbb ccc\n" +
		"Le Chien aboie\n" +
		"prix: 12.50 euros\n" +
		"email: ada@cybersup.ai\n" +
		"x+y=z\n" +
		"fin de ligne$\n" +
		"mot motif motus\n",
	"nombres.txt":
		"10\n" +
		"9\n" +
		"100\n" +
		"-3\n" +
		"2.5\n" +
		"abc\n" +
		"1K\n" +
		"2M\n" +
		"512\n",
	"ventes.csv":
		"produit,quantite,prix\n" +
		"sweat,3,35\n" +
		"tasse,10,8\n" +
		"sweat,2,35\n" +
		"casquette,5,15\n" +
		"tasse,1,8\n",
	"paragraphes.txt":
		"Ada Lovelace\n" +
		"Londres\n" +
		"\n" +
		"Alan Turing\n" +
		"Manchester\n" +
		"Bletchley\n" +
		"\n" +
		"\n" +
		"Grace Hopper\n" +
		"New York\n",
	"mots.txt":
		"pomme\n" +
		"pomme\n" +
		"Poire\n" +
		"poire\n" +
		"kiwi\n" +
		"pomme\n" +
		"kiwi\n" +
		"kiwi\n",
	"chiffres.txt":
		"1\n" +
		"2\n" +
		"3\n" +
		"4\n" +
		"5\n" +
		"6\n" +
		"7\n" +
		"8\n" +
		"9\n" +
		"10\n" +
		"11\n" +
		"12\n",
	"versions.txt":
		"v1.10\n" +
		"v1.2\n" +
		"v1.9\n" +
		"v2.0\n" +
		"v1.2.1\n",
	"tableau.txt":
		"x 3 b\n" +
		"y 1 a\n" +
		"x 2 c\n" +
		"z 1 b\n" +
		"y 3 a\n",
	"m2.txt":
		"pomme\n" +
		"pomme\n" +
		"Poire\n" +
		"poire\n" +
		"kiwi\n" +
		"pomme\n" +
		"kiwi\n" +
		"kiwi\n",
	"c2.txt":
		"1\n" +
		"2\n" +
		"3\n" +
		"4\n" +
		"5\n" +
		"6\n" +
		"7\n" +
		"8\n" +
		"9\n" +
		"10\n" +
		"11\n" +
		"12\n",
	"prog.awk":
		"{ s += $1 }\n" +
		"END {\n" +
		"\tprint \"somme\", s\n" +
		"\tprint \"moyenne\", s / NR\n" +
		"}\n"
};

/* Commande, et ce que répondent les vrais outils GNU (sans le dernier retour à la ligne). */
var CAS = [
	["grep ECHEC journal.log", "2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9\n2026-10-01 10:00:00 sshd ECHEC guest 10.0.0.5"],
	["grep -c ECHEC journal.log", "4"],
	["grep -v ECHEC journal.log", "2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -\n2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["grep -n root journal.log", "1:2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n4:2026-10-01 09:01:02 cron INFO root -\n5:2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9"],
	["grep -i 'le c' notes.txt", "le chat (gris) dort\nLe Chien aboie"],
	["grep 'a|b' notes.txt", "a|b est un tube"],
	["grep -E 'chat|Chien' notes.txt", "le chat (gris) dort\nLe Chien aboie"],
	["grep 'chat\\|Chien' notes.txt", "le chat (gris) dort\nLe Chien aboie"],
	["grep '(gris)' notes.txt", "le chat (gris) dort"],
	["grep -E '\\(gris\\)' notes.txt", "le chat (gris) dort"],
	["grep 'a\\{3\\}' notes.txt", "aaa bbb ccc"],
	["grep -E 'a{3}' notes.txt", "aaa bbb ccc"],
	["grep 'x+y' notes.txt", "x+y=z"],
	["grep -E 'x\\+y' notes.txt", "x+y=z"],
	["grep 'mot\\+if' notes.txt", "mot motif motus"],
	["grep -o 'mot[a-z]*' notes.txt", "mot\nmotif\nmotus"],
	["grep -ow 'mot' notes.txt", "mot"],
	["grep -w 'mot' notes.txt", "mot motif motus"],
	["grep -x 'aaa bbb ccc' notes.txt", "aaa bbb ccc"],
	["grep -c -x 'aaa' notes.txt", "0"],
	["grep -F 'a|b' notes.txt", "a|b est un tube"],
	["grep -F '12.50' notes.txt", "prix: 12.50 euros"],
	["grep '12.5' notes.txt", "prix: 12.50 euros"],
	["grep '[[:digit:]]\\{2\\}\\.' notes.txt", "prix: 12.50 euros"],
	["grep -E '[[:upper:]][[:lower:]]+ [[:upper:]]' notes.txt", "Le Chien aboie"],
	["grep '^[[:space:]]*le' notes.txt", "le chat (gris) dort"],
	["grep 'ligne\\$' notes.txt", "fin de ligne$"],
	["grep 'ligne$' notes.txt", ""],
	["grep -E '^(a|b)' notes.txt", "a|b est un tube\naaa bbb ccc"],
	["grep -e chat -e Chien notes.txt", "le chat (gris) dort\nLe Chien aboie"],
	["grep -E -o '[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+' journal.log", "10.0.0.5\n10.0.0.5\n10.0.0.7\n10.0.0.9\n10.0.0.5\n10.0.0.12"],
	["grep -o '[0-9]*\\.[0-9]*\\.[0-9]*\\.[0-9]*$' journal.log", "10.0.0.5\n10.0.0.5\n10.0.0.7\n10.0.0.9\n10.0.0.5\n10.0.0.12"],
	["grep -A1 SUCCES journal.log", "2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -"],
	["grep -B1 cron journal.log", "2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -"],
	["grep -C1 cron journal.log", "2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9"],
	["grep -A1 -n guest journal.log", "6:2026-10-01 10:00:00 sshd ECHEC guest 10.0.0.5\n7-2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["grep -n -C1 'ECHEC admin' journal.log", "1-2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2:2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n3-2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7"],
	["grep -m2 ECHEC journal.log", "2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5"],
	["grep -l root journal.log passwd notes.txt", "journal.log\npasswd"],
	["grep -L root journal.log passwd notes.txt", "notes.txt"],
	["grep -c root journal.log passwd", "journal.log:3\npasswd:1"],
	["grep -h root journal.log passwd", "2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2026-10-01 09:01:02 cron INFO root -\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9\nroot:x:0:0:root:/root:/bin/bash"],
	["grep -H ERREUR journal.log", "journal.log:2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["grep -E -c 'nologin$' passwd", "2"],
	["grep -E '^[^:]+:x:0:' passwd", "root:x:0:0:root:/root:/bin/bash\nmaintenance:x:0:0::/var/maint:/bin/sh"],
	["grep '\\<mot\\>' notes.txt", "mot motif motus"],
	["grep -o '\\w*@\\w*' notes.txt", "ada@cybersup"],
	["grep -E 'a+b' notes.txt", "Le Chien aboie"],
	["grep -E '(ab|a)+' -o notes.txt", "a\na\naaa\nab\na\na\na\na"],
	["grep -iE '^le (chat|chien)' notes.txt", "le chat (gris) dort\nLe Chien aboie"],
	["grep -vc '^$' paragraphes.txt", "7"],
	["grep -n '^$' paragraphes.txt", "3:\n7:\n8:"],
	["cat journal.log | grep -o 'ECHEC [a-z]*' | sort | uniq -c", "      1 ECHEC admin\n      1 ECHEC guest\n      2 ECHEC root"],
	["grep -E 'sshd (ECHEC|SUCCES) (root|laurent)' journal.log", "2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9"],
	["grep '[.]ai' notes.txt", "email: ada@cybersup.ai"],
	["grep 'b*' -c notes.txt", "9"],
	["grep -E 'o{2,}' notes.txt", ""],
	["grep -E 'c{1,2}' -o notes.txt", "c\ncc\nc\nc"],
	["grep '\\(a\\)\\1' -o notes.txt", "aa"],
	["grep -E '(b)\\1' notes.txt", "aaa bbb ccc"],
	["grep -P '\\d+\\.\\d+' notes.txt", "prix: 12.50 euros"],
	["grep -e 'x+y' -e 'a|b' notes.txt", "a|b est un tube\nx+y=z"],
	["grep '' -c mots.txt", "8"],
	["grep -w -c 'pomme' mots.txt", "3"],
	["grep -E -v 'pomme|kiwi' mots.txt", "Poire\npoire"],
	["sed 's/ECHEC/échec/' journal.log", "2026-10-01 08:12:01 sshd échec root 10.0.0.5\n2026-10-01 08:12:09 sshd échec admin 10.0.0.5\n2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -\n2026-10-01 09:15:30 sshd échec root 10.0.0.9\n2026-10-01 10:00:00 sshd échec guest 10.0.0.5\n2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["sed -n '2,4p' journal.log", "2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -"],
	["sed -n '/SUCCES/,/sshd/p' journal.log", "2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:01:02 cron INFO root -\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9"],
	["sed '/cron/d' journal.log", "2026-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n2026-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n2026-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n2026-10-01 09:15:30 sshd ECHEC root 10.0.0.9\n2026-10-01 10:00:00 sshd ECHEC guest 10.0.0.5\n2026-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["sed 's/root/ROOT/g' passwd", "ROOT:x:0:0:ROOT:/ROOT:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["sed 's/o/0/2' passwd", "ro0t:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daem0n:/usr/sbin:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nol0gin"],
	["sed 's/o/0/2g' passwd", "ro0t:x:0:0:r00t:/r00t:/bin/bash\ndaemon:x:1:1:daem0n:/usr/sbin:/usr/sbin/n0l0gin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nol0gin"],
	["sed -n 's/:x:0:/ EST ROOT /p' passwd", "root EST ROOT 0:root:/root:/bin/bash\nmaintenance EST ROOT 0::/var/maint:/bin/sh"],
	["sed 's/\\(^[^:]*\\):.*/\\1/' passwd", "root\ndaemon\nlaurent\nmyriam\nmaintenance\nwww-data"],
	["sed -E 's/^([^:]+):[^:]*:([0-9]+).*/\\2 \\1/' passwd", "0 root\n1 daemon\n1000 laurent\n1001 myriam\n0 maintenance\n33 www-data"],
	["sed 's/[0-9]\\{4\\}/[&]/' journal.log", "[2026]-10-01 08:12:01 sshd ECHEC root 10.0.0.5\n[2026]-10-01 08:12:09 sshd ECHEC admin 10.0.0.5\n[2026]-10-01 08:13:44 sshd SUCCES laurent 10.0.0.7\n[2026]-10-01 09:01:02 cron INFO root -\n[2026]-10-01 09:15:30 sshd ECHEC root 10.0.0.9\n[2026]-10-01 10:00:00 sshd ECHEC guest 10.0.0.5\n[2026]-10-01 10:05:12 nginx ERREUR www-data 10.0.0.12"],
	["sed 's/a|b/X/' notes.txt", "X est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed -E 's/a|b/X/g' notes.txt", "X|X est un tuXe\nle chXt (gris) dort\nXXX XXX ccc\nLe Chien XXoie\nprix: 12.50 euros\nemXil: XdX@cyXersup.Xi\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/a\\|b/X/g' notes.txt", "X|X est un tuXe\nle chXt (gris) dort\nXXX XXX ccc\nLe Chien XXoie\nprix: 12.50 euros\nemXil: XdX@cyXersup.Xi\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/(gris)/[gris]/' notes.txt", "a|b est un tube\nle chat [gris] dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed -E 's/\\(gris\\)/[gris]/' notes.txt", "a|b est un tube\nle chat [gris] dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/\\(chat\\) (\\(gris\\))/\\2 \\1/' notes.txt", "a|b est un tube\nle gris chat dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/x+y/somme/' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nsomme=z\nfin de ligne$\nmot motif motus"],
	["sed 's/a*/-/g' notes.txt", "-|-b- -e-s-t- -u-n- -t-u-b-e-\n-l-e- -c-h-t- -(-g-r-i-s-)- -d-o-r-t-\n- -b-b-b- -c-c-c-\n-L-e- -C-h-i-e-n- -b-o-i-e-\n-p-r-i-x-:- -1-2-.-5-0- -e-u-r-o-s-\n-e-m-i-l-:- -d-@-c-y-b-e-r-s-u-p-.-i-\n-x-+-y-=-z-\n-f-i-n- -d-e- -l-i-g-n-e-$-\n-m-o-t- -m-o-t-i-f- -m-o-t-u-s-"],
	["sed 's/[[:upper:]]/\\L&/g' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nle chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/\\w\\+/\\u&/g' notes.txt", "A|B Est Un Tube\nLe Chat (Gris) Dort\nAaa Bbb Ccc\nLe Chien Aboie\nPrix: 12.50 Euros\nEmail: Ada@Cybersup.Ai\nX+Y=Z\nFin De Ligne$\nMot Motif Motus"],
	["sed -E 's/(\\w+)@(\\w+)/\\U\\2\\E chez \\1/' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: CYBERSUP chez ada.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/&/et/' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's/prix/& \\& taxe/' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix & taxe: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed 's#/bin/bash#/bin/zsh#' passwd", "root:x:0:0:root:/root:/bin/zsh\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/zsh\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["sed 's/\\/bin\\/bash/BASH/' passwd", "root:x:0:0:root:/root:BASH\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:BASH\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["sed 's|/usr/sbin/nologin|/bin/false|' passwd", "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/bin/false\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/bin/false"],
	["sed 'y/abc/ABC/' notes.txt", "A|B est un tuBe\nle ChAt (gris) dort\nAAA BBB CCC\nLe Chien ABoie\nprix: 12.50 euros\nemAil: AdA@CyBersup.Ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed '1d;$d' chiffres.txt", "2\n3\n4\n5\n6\n7\n8\n9\n10\n11"],
	["sed -n '$p' chiffres.txt", "12"],
	["sed -n '1~3p' chiffres.txt", "1\n4\n7\n10"],
	["sed -n '0~4p' chiffres.txt", "4\n8\n12"],
	["sed -n '2,+2p' chiffres.txt", "2\n3\n4"],
	["sed -n '5,~4p' chiffres.txt", "5\n6\n7\n8"],
	["sed -n '0,/[0-9]/p' chiffres.txt", "1"],
	["sed -n '1,/[0-9]/p' chiffres.txt", "1\n2"],
	["sed '3q' chiffres.txt", "1\n2\n3"],
	["sed '3Q' chiffres.txt", "1\n2"],
	["sed -n '/1/=' chiffres.txt", "1\n10\n11\n12"],
	["sed '2,10!d' chiffres.txt", "2\n3\n4\n5\n6\n7\n8\n9\n10"],
	["sed '/^1/!s/$/ !/' chiffres.txt", "1\n2 !\n3 !\n4 !\n5 !\n6 !\n7 !\n8 !\n9 !\n10\n11\n12"],
	["sed -n '/2/{p;p}' chiffres.txt", "2\n2\n12\n12"],
	["sed '/[02468]$/{s/$/ pair/;s/^/>/}' chiffres.txt", "1\n>2 pair\n3\n>4 pair\n5\n>6 pair\n7\n>8 pair\n9\n>10 pair\n11\n>12 pair"],
	["sed '3a\\\nAJOUT' chiffres.txt", "1\n2\n3\nAJOUT\n4\n5\n6\n7\n8\n9\n10\n11\n12"],
	["sed '3a AJOUT' chiffres.txt", "1\n2\n3\nAJOUT\n4\n5\n6\n7\n8\n9\n10\n11\n12"],
	["sed '3i\\  AVANT' chiffres.txt", "1\n2\n  AVANT\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12"],
	["sed '2,11c\\\nMILIEU' chiffres.txt", "1\nMILIEU\n12"],
	["sed '5c CINQ' chiffres.txt", "1\n2\n3\n4\nCINQ\n6\n7\n8\n9\n10\n11\n12"],
	["sed '$!N;s/\\n/-/' chiffres.txt", "1-2\n3-4\n5-6\n7-8\n9-10\n11-12"],
	["sed 'N;N;s/\\n/,/g' chiffres.txt", "1,2,3\n4,5,6\n7,8,9\n10,11,12"],
	["sed -n 'h;n;G;p' chiffres.txt", "2\n1\n4\n3\n6\n5\n8\n7\n10\n9\n12\n11"],
	["sed -n '1!G;h;$p' chiffres.txt", "12\n11\n10\n9\n8\n7\n6\n5\n4\n3\n2\n1"],
	["sed '$!N;P;D' mots.txt", "pomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["sed -e :a -e '$!N;s/\\n/ /;ta' chiffres.txt", "1 2 3 4 5 6 7 8 9 10 11 12"],
	["sed ':a;N;$!ba;s/\\n/+/g' chiffres.txt", "1+2+3+4+5+6+7+8+9+10+11+12"],
	["sed -n '/kiwi/{=;p}' mots.txt", "5\nkiwi\n7\nkiwi\n8\nkiwi"],
	["sed 's/i/I/;t fin;s/$/ (sans i)/;:fin' mots.txt", "pomme (sans i)\npomme (sans i)\nPoIre\npoIre\nkIwi\npomme (sans i)\nkIwi\nkIwi"],
	["sed -e 's/p/P/' -e 's/k/K/' mots.txt", "Pomme\nPomme\nPoire\nPoire\nKiwi\nPomme\nKiwi\nKiwi"],
	["sed 's/x/y/;s/a/b/' mots.txt", "pomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["sed -n 'x;p' chiffres.txt", "\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11"],
	["sed 'G' mots.txt", "pomme\n\npomme\n\nPoire\n\npoire\n\nkiwi\n\npomme\n\nkiwi\n\nkiwi\n"],
	["sed -n '/Alan/,/^$/p' paragraphes.txt", "Alan Turing\nManchester\nBletchley\n"],
	["sed '/^$/d' paragraphes.txt", "Ada Lovelace\nLondres\nAlan Turing\nManchester\nBletchley\nGrace Hopper\nNew York"],
	["sed -s -n '$p' mots.txt chiffres.txt", "kiwi\n12"],
	["sed -n '$p' mots.txt chiffres.txt", "12"],
	["sed 's/pomme/POMME/I' mots.txt", "POMME\nPOMME\nPoire\npoire\nkiwi\nPOMME\nkiwi\nkiwi"],
	["sed '/POIRE/Id' mots.txt", "pomme\npomme\nkiwi\npomme\nkiwi\nkiwi"],
	["sed -n 'l' notes.txt", "a|b est un tube$\nle chat (gris) dort$\naaa bbb ccc$\nLe Chien aboie$\nprix: 12.50 euros$\nemail: ada@cybersup.ai$\nx+y=z$\nfin de ligne$$\nmot motif motus$"],
	["sed 's/[/]/:/g' passwd", "root:x:0:0:root::root::bin:bash\ndaemon:x:1:1:daemon::usr:sbin::usr:sbin:nologin\nlaurent:x:1000:1000:Laurent B,,,::home:laurent::bin:bash\nmyriam:x:1001:1001:::home:myriam::bin:zsh\nmaintenance:x:0:0:::var:maint::bin:sh\nwww-data:x:33:33:www-data::var:www::usr:sbin:nologin"],
	["sed -E 's/(a|b)+/<&>/g' notes.txt", "<a>|<b> est un tu<b>e\nle ch<a>t (gris) dort\n<aaa> <bbb> ccc\nLe Chien <ab>oie\nprix: 12.50 euros\nem<a>il: <a>d<a>@cy<b>ersup.<a>i\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed -E 's/c{2,}/C/' notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb C\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["sed -n '/^le/,+1p' notes.txt", "le chat (gris) dort\naaa bbb ccc"],
	["sed '=' mots.txt", "1\npomme\n2\npomme\n3\nPoire\n4\npoire\n5\nkiwi\n6\npomme\n7\nkiwi\n8\nkiwi"],
	["sed 'n;d' chiffres.txt", "1\n3\n5\n7\n9\n11"],
	["sed -n 'n;p' chiffres.txt", "2\n4\n6\n8\n10\n12"],
	["sed '2~3s/$/ *3/' chiffres.txt", "1\n2 *3\n3\n4\n5 *3\n6\n7\n8 *3\n9\n10\n11 *3\n12"],
	["sed 's/.*/\"&\"/' mots.txt", "\"pomme\"\n\"pomme\"\n\"Poire\"\n\"poire\"\n\"kiwi\"\n\"pomme\"\n\"kiwi\"\n\"kiwi\""],
	["sed 's/\\(.\\)\\(.\\)/\\2\\1/' mots.txt", "opmme\nopmme\noPire\nopire\nikwi\nopmme\nikwi\nikwi"],
	["sed -E 's/^(.)(.*)$/\\2\\1/' mots.txt", "ommep\nommep\noireP\noirep\niwik\nommep\niwik\niwik"],
	["sed 's/k*/_/g' mots.txt", "_p_o_m_m_e_\n_p_o_m_m_e_\n_P_o_i_r_e_\n_p_o_i_r_e_\n_i_w_i_\n_p_o_m_m_e_\n_i_w_i_\n_i_w_i_"],
	["sed -n '/^$/!p' paragraphes.txt", "Ada Lovelace\nLondres\nAlan Turing\nManchester\nBletchley\nGrace Hopper\nNew York"],
	["sed '1~2d' chiffres.txt", "2\n4\n6\n8\n10\n12"],
	["awk '{ print $1 }' journal.log", "2026-10-01\n2026-10-01\n2026-10-01\n2026-10-01\n2026-10-01\n2026-10-01\n2026-10-01"],
	["awk '{ print $1, $3 }' journal.log", "2026-10-01 sshd\n2026-10-01 sshd\n2026-10-01 sshd\n2026-10-01 cron\n2026-10-01 sshd\n2026-10-01 sshd\n2026-10-01 nginx"],
	["awk -F: '{ print $1 }' passwd", "root\ndaemon\nlaurent\nmyriam\nmaintenance\nwww-data"],
	["awk -F: '$3 == 0 { print $1 }' passwd", "root\nmaintenance"],
	["awk -F: '$3 >= 1000' passwd", "laurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh"],
	["awk '/ECHEC/ { print $5 }' journal.log", "root\nadmin\nroot\nguest"],
	["awk '$4 == \"ECHEC\" { n[$6]++ } END { for (ip in n) print ip, n[ip] }' journal.log | sort", "10.0.0.5 3\n10.0.0.9 1"],
	["awk '{ print NR, NF }' journal.log", "1 6\n2 6\n3 6\n4 6\n5 6\n6 6\n7 6"],
	["awk 'END { print NR }' journal.log", "7"],
	["awk '{ print $NF }' journal.log", "10.0.0.5\n10.0.0.5\n10.0.0.7\n-\n10.0.0.9\n10.0.0.5\n10.0.0.12"],
	["awk '{ print $(NF-1) }' journal.log", "root\nadmin\nlaurent\nroot\nroot\nguest\nwww-data"],
	["awk -F, 'NR > 1 { total += $2 * $3 } END { print total }' ventes.csv", "338"],
	["awk -F, 'NR > 1 { q[$1] += $2 } END { for (p in q) print p, q[p] }' ventes.csv | sort", "casquette 5\nsweat 5\ntasse 11"],
	["awk -F, -v OFS=';' '{ $1 = $1; print }' ventes.csv", "produit;quantite;prix\nsweat;3;35\ntasse;10;8\nsweat;2;35\ncasquette;5;15\ntasse;1;8"],
	["awk -F, 'BEGIN { OFS = \"|\" } { $2 = \"*\"; print }' ventes.csv", "produit|*|prix\nsweat|*|35\ntasse|*|8\nsweat|*|35\ncasquette|*|15\ntasse|*|8"],
	["awk -F, '{ printf \"%-10s %5.2f\\n\", $1, $3 }' ventes.csv", "produit     0.00\nsweat      35.00\ntasse       8.00\nsweat      35.00\ncasquette  15.00\ntasse       8.00"],
	["awk 'BEGIN { printf \"%d %i %o %x %X %c %e %g %%\\n\", 42.9, -7, 8, 255, 255, 65, 1234.5, 0.00001234 }'", "42 -7 10 ff FF A 1.234500e+03 1.234e-05 %"],
	["awk 'BEGIN { printf \"[%5s][%-5s][%.2s][%05d][%+d][% d]\\n\", \"ab\", \"ab\", \"abc\", 42, 5, 5 }'", "[   ab][ab   ][ab][00042][+5][ 5]"],
	["awk 'BEGIN { x = sprintf(\"%03d-%s\", 7, \"x\"); print x, length(x) }'", "007-x 5"],
	["awk 'BEGIN { print length(\"bonjour\"), substr(\"bonjour\", 4), substr(\"bonjour\", 2, 3), index(\"bonjour\", \"jour\") }'", "7 jour onj 4"],
	["awk 'BEGIN { print toupper(\"abc\"), tolower(\"ÀBC\"), int(3.9), int(-3.9), sqrt(144), 2^10, 7 % 3 }'", "ABC àbc 3 -3 12 1024 1"],
	["awk 'BEGIN { n = split(\"a:b:c\", t, \":\"); print n, t[1], t[3] }'", "3 a c"],
	["awk 'BEGIN { n = split(\"un  deux trois\", t); print n, t[2] }'", "3 deux"],
	["awk 'BEGIN { n = split(\"a1b22c333d\", t, /[0-9]+/); print n, t[1] t[2] t[3] t[4] }'", "4 abcd"],
	["awk 'BEGIN { s = \"banane\"; n = gsub(/a/, \"A\", s); print n, s }'", "2 bAnAne"],
	["awk 'BEGIN { s = \"banane\"; sub(/an/, \"[&]\", s); print s }'", "b[an]ane"],
	["awk 'BEGIN { s = \"a.b.c\"; gsub(/\\./, \"/\", s); print s }'", "a/b/c"],
	["awk 'BEGIN { s = \"a.b.c\"; gsub(\".\", \"-\", s); print s }'", "-----"],
	["awk 'BEGIN { if (match(\"le chat dort\", /ch[a-z]+/)) print RSTART, RLENGTH }'", "4 4"],
	["awk 'BEGIN { print match(\"abc\", /z/), RSTART, RLENGTH }'", "0 0 -1"],
	["awk '{ gsub(/o/, \"0\"); print }' mots.txt", "p0mme\np0mme\nP0ire\np0ire\nkiwi\np0mme\nkiwi\nkiwi"],
	["awk '{ sub(/^p/, \"P\") } 1' mots.txt", "Pomme\nPomme\nPoire\nPoire\nkiwi\nPomme\nkiwi\nkiwi"],
	["awk 'NR % 2 == 0' chiffres.txt", "2\n4\n6\n8\n10\n12"],
	["awk 'NR == 3, NR == 5' chiffres.txt", "3\n4\n5"],
	["awk '/Alan/,/^$/' paragraphes.txt", "Alan Turing\nManchester\nBletchley\n"],
	["awk 'BEGIN { RS = \"\" } { print NR \": \" $1, NF }' paragraphes.txt", "1: Ada 3\n2: Alan 4\n3: Grace 4"],
	["awk 'BEGIN { RS = \"\"; FS = \"\\n\" } { print $1 \" (\" $2 \")\" }' paragraphes.txt", "Ada Lovelace (Londres)\nAlan Turing (Manchester)\nGrace Hopper (New York)"],
	["awk '!vu[$0]++' mots.txt", "pomme\nPoire\npoire\nkiwi"],
	["awk '{ n[$0]++ } END { for (m in n) if (n[m] > 1) print m }' mots.txt | sort", "kiwi\npomme"],
	["awk 'length($0) > 4' mots.txt", "pomme\npomme\nPoire\npoire\npomme"],
	["awk 'length > 4' mots.txt", "pomme\npomme\nPoire\npoire\npomme"],
	["awk '{ s += $1 } END { print s, s / NR }' chiffres.txt", "78 6.5"],
	["awk '$1 > 5 && $1 < 9' chiffres.txt", "6\n7\n8"],
	["awk '$1 < 3 || $1 > 10' chiffres.txt", "1\n2\n11\n12"],
	["awk '!($1 % 3)' chiffres.txt", "3\n6\n9\n12"],
	["awk '{ print ($1 % 2 ? \"impair\" : \"pair\") }' chiffres.txt", "impair\npair\nimpair\npair\nimpair\npair\nimpair\npair\nimpair\npair\nimpair\npair"],
	["awk '{ printf \"%s%s\", $0, (NR % 4 ? \",\" : \"\\n\") }' chiffres.txt", "1,2,3,4\n5,6,7,8\n9,10,11,12"],
	["awk '$1 ~ /^1/' chiffres.txt", "1\n10\n11\n12"],
	["awk '$1 !~ /1/' chiffres.txt", "2\n3\n4\n5\n6\n7\n8\n9"],
	["awk '{ print $1 > 5 }' chiffres.txt", ""],
	["awk '{ if ($1 > 10) print \"grand\"; else if ($1 > 5) print \"moyen\"; else print \"petit\" }' chiffres.txt", "petit\npetit\npetit\npetit\npetit\nmoyen\nmoyen\nmoyen\nmoyen\nmoyen\ngrand\ngrand"],
	["awk 'BEGIN { for (i = 1; i <= 5; i++) s = s i; print s }'", "12345"],
	["awk 'BEGIN { i = 0; while (i < 3) { i++; if (i == 2) continue; print i } }'", "1\n3"],
	["awk 'BEGIN { i = 10; do { print i; i++ } while (i < 3) }'", "10"],
	["awk 'BEGIN { for (;;) { n++; if (n > 4) break }; print n }'", "5"],
	["awk 'NR == 3 { exit } { print }' chiffres.txt", "1\n2"],
	["awk 'NR == 2 { next } { print }' mots.txt", "pomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["awk 'function carre(x) { return x * x } { print carre($1) }' chiffres.txt", "1\n4\n9\n16\n25\n36\n49\n64\n81\n100\n121\n144"],
	["awk 'function fact(n) { return n <= 1 ? 1 : n * fact(n - 1) } BEGIN { print fact(10) }'", "3628800"],
	["awk 'function remplir(t, n,   i) { for (i = 1; i <= n; i++) t[i] = i * i } BEGIN { remplir(c, 4); print c[3], length(c) }'", "9 4"],
	["awk 'BEGIN { t[\"a\"] = 1; t[\"b\"] = 2; delete t[\"a\"]; print (\"a\" in t), (\"b\" in t), length(t) }'", "0 1 1"],
	["awk 'BEGIN { t[1,2] = \"x\"; if ((1,2) in t) print \"oui\"; for (k in t) { split(k, p, SUBSEP); print p[1], p[2] } }'", "oui\n1 2"],
	["awk -v seuil=10 '$1 >= seuil' chiffres.txt", "10\n11\n12"],
	["awk '{ print FILENAME, FNR, NR }' mots.txt chiffres.txt", "mots.txt 1 1\nmots.txt 2 2\nmots.txt 3 3\nmots.txt 4 4\nmots.txt 5 5\nmots.txt 6 6\nmots.txt 7 7\nmots.txt 8 8\nchiffres.txt 1 9\nchiffres.txt 2 10\nchiffres.txt 3 11\nchiffres.txt 4 12\nchiffres.txt 5 13\nchiffres.txt 6 14\nchiffres.txt 7 15\nchiffres.txt 8 16\nchiffres.txt 9 17\nchiffres.txt 10 18\nchiffres.txt 11 19\nchiffres.txt 12 20"],
	["awk 'FNR == 1 { print FILENAME }' mots.txt chiffres.txt", "mots.txt\nchiffres.txt"],
	["awk '{ $2 = \"X\"; print; print NF }' journal.log", "2026-10-01 X sshd ECHEC root 10.0.0.5\n6\n2026-10-01 X sshd ECHEC admin 10.0.0.5\n6\n2026-10-01 X sshd SUCCES laurent 10.0.0.7\n6\n2026-10-01 X cron INFO root -\n6\n2026-10-01 X sshd ECHEC root 10.0.0.9\n6\n2026-10-01 X sshd ECHEC guest 10.0.0.5\n6\n2026-10-01 X nginx ERREUR www-data 10.0.0.12\n6"],
	["awk '{ NF = 2; print }' journal.log", "2026-10-01 08:12:01\n2026-10-01 08:12:09\n2026-10-01 08:13:44\n2026-10-01 09:01:02\n2026-10-01 09:15:30\n2026-10-01 10:00:00\n2026-10-01 10:05:12"],
	["awk '{ $8 = \"!\"; print }' tableau.txt", "x 3 b     !\ny 1 a     !\nx 2 c     !\nz 1 b     !\ny 3 a     !"],
	["awk '{ $0 = $3 \" \" $1; print $2 }' tableau.txt", "x\ny\nx\nz\ny"],
	["awk 'BEGIN { x = \"10\"; y = 9; print (x < y), (\"10\" < \"9\"), (10 < 9), (x + 0 < y) }'", "1 1 0 0"],
	["awk '{ a[NR] = $1 } END { print (a[1] < a[2]) }' nombres.txt", "0"],
	["awk 'BEGIN { print 1/3, 100000 * 100000, 0.1 + 0.2, 1e6, 2^53 }'", "0.333333 10000000000 0.3 1000000 9007199254740992"],
	["awk 'BEGIN { CONVFMT = \"%.2g\"; x = 3.14159; y = x \"\"; print y; OFMT = \"%.1f\"; print x, 17 }'", "3.1\n3.1 17"],
	["awk 'BEGIN { x; print x + 0, \"[\" x \"]\", length(x) }'", "0 [] 0"],
	["awk '{ print length() }' mots.txt", "5\n5\n5\n5\n4\n5\n4\n4"],
	["awk '{ print substr($0, 2, 3) }' mots.txt", "omm\nomm\noir\noir\niwi\nomm\niwi\niwi"],
	["awk -F: -v OFS=: '$3 == 0 { $7 = \"/usr/sbin/nologin\" } { print }' passwd", "root:x:0:0:root:/root:/usr/sbin/nologin\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\nmaintenance:x:0:0::/var/maint:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["awk -F: '{ print NF }' passwd", "7\n7\n7\n7\n7\n7"],
	["awk -F '[:,]' '{ print $5 }' passwd", "root\ndaemon\nLaurent B\n\n\nwww-data"],
	["awk 'BEGIN { FS = \":\" } { print $NF }' passwd", "/bin/bash\n/usr/sbin/nologin\n/bin/bash\n/bin/zsh\n/bin/sh\n/usr/sbin/nologin"],
	["awk -F: '{ users = users (users ? \",\" : \"\") $1 } END { print users }' passwd", "root,daemon,laurent,myriam,maintenance,www-data"],
	["awk '{ print toupper(substr($0, 1, 1)) substr($0, 2) }' mots.txt", "Pomme\nPomme\nPoire\nPoire\nKiwi\nPomme\nKiwi\nKiwi"],
	["awk '{ for (i = NF; i > 0; i--) printf \"%s%s\", $i, (i > 1 ? OFS : ORS) }' tableau.txt", "b 3 x\na 1 y\nc 2 x\nb 1 z\na 3 y"],
	["awk 'BEGIN { ORS = \";\" } { print $1 }' tableau.txt", "x;y;x;z;y;"],
	["awk 'BEGIN { OFS = \"-\" } { print $1, $2 }' tableau.txt", "x-3\ny-1\nx-2\nz-1\ny-3"],
	["awk '{ print $1 $2 }' tableau.txt", "x3\ny1\nx2\nz1\ny3"],
	["awk '{ s = s $2 } END { print s }' tableau.txt", "31213"],
	["awk '$2 == 1 { print $3 }' tableau.txt", "a\nb"],
	["awk '{ max = ($2 > max ? $2 : max) } END { print max }' tableau.txt", "3"],
	["awk 'BEGIN { print substr(\"hello\", 0, 2), substr(\"hello\", -1, 3), substr(\"hello\", 2.5, 2) }'", "he hel el"],
	["awk 'BEGIN { print substr(\"hello\", 1.5, 2) \"|\" substr(\"hello\", 2, 1.5) \"|\" substr(\"hello\", 2, 0.5) \"|\" substr(\"hello\", -5, 2) \"|\" substr(\"hello\", 0) }'", "he|e||he|hello"],
	["awk 'BEGIN { print index(\"abc\", \"\"), index(\"\", \"a\") }'", "1 0"],
	["awk 'BEGIN { print length(12345), length(1/4) }'", "5 4"],
	["awk 'BEGIN { a = \"x\"; a = a a; a = a a; print a }'", "xxxx"],
	["awk 'BEGIN { print 1 \" \" 2, 1 -1, \"a\" (1 > 0) }'", "1 2 0 a1"],
	["awk 'BEGIN { print -2^2, 2^3^2, -3 % 2, 10 / 4 }'", "-4 512 -1 2.5"],
	["awk 'BEGIN { x = 5; x += 2; x -= 1; x *= 3; x /= 2; x %= 5; x ^= 2; print x }'", "16"],
	["awk 'BEGIN { i = 5; print i++, i, ++i, i--, --i }'", "5 6 7 7 5"],
	["awk 'BEGIN { print (\"abc\" ~ /b/), (\"abc\" ~ \"^a\"), (\"abc\" !~ /z/) }'", "1 1 1"],
	["awk 'BEGIN { print gensub(/(a)(b)/, \"\\\\2\\\\1\", \"g\", \"abab\"), gensub(/o/, \"0\", 2, \"foo boo\") }'", "baba fo0 boo"],
	["awk 'BEGIN { printf \"%s %s %s\\n\", \"un\", \"deux\", \"trois\" }'", "un deux trois"],
	["awk 'BEGIN { printf(\"%5.1f|%-6d|%x\\n\", 3.14159, 42, 3054) }'", "  3.1|42    |bee"],
	["awk 'BEGIN { print 017, 0x1F }'", "15 31"],
	["awk '{ print; next; print \"jamais\" }' mots.txt", "pomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["awk 'NF' paragraphes.txt", "Ada Lovelace\nLondres\nAlan Turing\nManchester\nBletchley\nGrace Hopper\nNew York"],
	["awk '!NF { n++ } END { print n }' paragraphes.txt", "3"],
	["awk '{ $1 = $1 } 1' tableau.txt", "x 3 b\ny 1 a\nx 2 c\nz 1 b\ny 3 a"],
	["awk 'BEGIN { getline; print \"premier : \" $0 } { print }' mots.txt", "premier : pomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["awk 'NR == 1 { while ((getline ligne) > 0) n++; print n }' chiffres.txt", "11"],
	["awk 'BEGIN { while ((getline l < \"mots.txt\") > 0) c++; print c }'", "8"],
	["awk -F, 'NR > 1 { printf \"%-10s|%3d|%6.2f\\n\", $1, $2, $2 * $3 }' ventes.csv", "sweat     |  3|105.00\ntasse     | 10| 80.00\nsweat     |  2| 70.00\ncasquette |  5| 75.00\ntasse     |  1|  8.00"],
	["awk 'BEGIN { split(\"3 1 2\", t); n = 0; for (k in t) n += t[k]; print n }'", "6"],
	["awk '{ print > \"/dev/stderr\" }' mots.txt 2>&1", "pomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["awk -f prog.awk chiffres.txt", "somme 78\nmoyenne 6.5"],
	["awk 'BEGIN { printf \"%c%c%c\\n\", 76, 105, 110 }'", "Lin"],
	["awk 'BEGIN { printf \"%.3e|%G|%g\\n\", 123456, 0.0000123, 1e20 }'", "1.235e+05|1.23E-05|1e+20"],
	["awk '{ print NR \":\" $0 }' notes.txt", "1:a|b est un tube\n2:le chat (gris) dort\n3:aaa bbb ccc\n4:Le Chien aboie\n5:prix: 12.50 euros\n6:email: ada@cybersup.ai\n7:x+y=z\n8:fin de ligne$\n9:mot motif motus"],
	["awk '/a\\|b/' notes.txt", "a|b est un tube"],
	["awk '/\\(gris\\)/' notes.txt", "le chat (gris) dort"],
	["awk '/[[:upper:]]/' notes.txt", "Le Chien aboie"],
	["awk '/^[a-z]+ [a-z]+ [a-z]+$/' notes.txt", "aaa bbb ccc\nmot motif motus"],
	["awk '/x\\+y/' notes.txt", "x+y=z"],
	["awk -F'|' '{ print $2 }' notes.txt", "b est un tube\n\n\n\n\n\n\n\n"],
	["awk -F. '{ print NF }' notes.txt", "1\n1\n1\n1\n2\n2\n1\n1\n1"],
	["awk -F'[ :]+' '{ print $2 }' notes.txt", "est\nchat\nbbb\nChien\n12.50\nada@cybersup.ai\n\nde\nmotif"],
	["sort mots.txt", "Poire\nkiwi\nkiwi\nkiwi\npoire\npomme\npomme\npomme"],
	["sort -r mots.txt", "pomme\npomme\npomme\npoire\nkiwi\nkiwi\nkiwi\nPoire"],
	["sort -u mots.txt", "Poire\nkiwi\npoire\npomme"],
	["sort -f mots.txt", "kiwi\nkiwi\nkiwi\nPoire\npoire\npomme\npomme\npomme"],
	["sort -n nombres.txt", "-3\nabc\n1K\n2M\n2.5\n9\n10\n100\n512"],
	["sort -rn nombres.txt", "512\n100\n10\n9\n2.5\n2M\n1K\nabc\n-3"],
	["sort -h nombres.txt", "-3\nabc\n2.5\n9\n10\n100\n512\n1K\n2M"],
	["sort -t, -k2n ventes.csv", "produit,quantite,prix\ntasse,1,8\nsweat,2,35\nsweat,3,35\ncasquette,5,15\ntasse,10,8"],
	["sort -t, -k2,2nr ventes.csv", "tasse,10,8\ncasquette,5,15\nsweat,3,35\nsweat,2,35\ntasse,1,8\nproduit,quantite,prix"],
	["sort -t, -k1,1 -k2,2n ventes.csv", "casquette,5,15\nproduit,quantite,prix\nsweat,2,35\nsweat,3,35\ntasse,1,8\ntasse,10,8"],
	["sort -t: -k3,3n passwd", "maintenance:x:0:0::/var/maint:/bin/sh\nroot:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nlaurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:x:1001:1001::/home/myriam:/bin/zsh"],
	["sort -t: -k7 passwd", "laurent:x:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nroot:x:0:0:root:/root:/bin/bash\nmaintenance:x:0:0::/var/maint:/bin/sh\nmyriam:x:1001:1001::/home/myriam:/bin/zsh\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["sort -k2 tableau.txt", "y 1 a\nz 1 b\nx 2 c\ny 3 a\nx 3 b"],
	["sort -k2,2 tableau.txt", "y 1 a\nz 1 b\nx 2 c\nx 3 b\ny 3 a"],
	["sort -s -k2,2 tableau.txt", "y 1 a\nz 1 b\nx 2 c\nx 3 b\ny 3 a"],
	["sort -k2,2n -k3,3r tableau.txt", "z 1 b\ny 1 a\nx 2 c\nx 3 b\ny 3 a"],
	["sort -k3,3 -k1,1r tableau.txt", "y 1 a\ny 3 a\nz 1 b\nx 3 b\nx 2 c"],
	["sort -u -k1,1 tableau.txt", "x 3 b\ny 1 a\nz 1 b"],
	["sort -k1.2 versions.txt", "v1.10\nv1.2\nv1.2.1\nv1.9\nv2.0"],
	["sort -V versions.txt", "v1.2\nv1.2.1\nv1.9\nv1.10\nv2.0"],
	["sort chiffres.txt", "1\n10\n11\n12\n2\n3\n4\n5\n6\n7\n8\n9"],
	["sort -n chiffres.txt | tail -n 3", "10\n11\n12"],
	["cut -d' ' -f5 journal.log | sort | uniq -c | sort -rn", "      3 root\n      1 www-data\n      1 laurent\n      1 guest\n      1 admin"],
	["sort -t, -k3,3n -k1,1 ventes.csv", "produit,quantite,prix\ntasse,1,8\ntasse,10,8\ncasquette,5,15\nsweat,2,35\nsweat,3,35"],
	["sort mots.txt chiffres.txt", "1\n10\n11\n12\n2\n3\n4\n5\n6\n7\n8\n9\nPoire\nkiwi\nkiwi\nkiwi\npoire\npomme\npomme\npomme"],
	["sort -b -k2 tableau.txt", "y 1 a\nz 1 b\nx 2 c\ny 3 a\nx 3 b"],
	["uniq mots.txt", "pomme\nPoire\npoire\nkiwi\npomme\nkiwi"],
	["uniq -c mots.txt", "      2 pomme\n      1 Poire\n      1 poire\n      1 kiwi\n      1 pomme\n      2 kiwi"],
	["uniq -d mots.txt", "pomme\nkiwi"],
	["uniq -u mots.txt", "Poire\npoire\nkiwi\npomme"],
	["uniq -i mots.txt", "pomme\nPoire\nkiwi\npomme\nkiwi"],
	["uniq -ic mots.txt", "      2 pomme\n      2 Poire\n      1 kiwi\n      1 pomme\n      2 kiwi"],
	["uniq -D mots.txt", "pomme\npomme\nkiwi\nkiwi"],
	["sort mots.txt | uniq -c | sort -rn", "      3 pomme\n      3 kiwi\n      1 poire\n      1 Poire"],
	["uniq -f1 tableau.txt", "x 3 b\ny 1 a\nx 2 c\nz 1 b\ny 3 a"],
	["uniq -s1 versions.txt", "v1.10\nv1.2\nv1.9\nv2.0\nv1.2.1"],
	["uniq -w2 versions.txt", "v1.10\nv2.0\nv1.2.1"],
	["cat mots.txt | tr a-z A-Z", "POMME\nPOMME\nPOIRE\nPOIRE\nKIWI\nPOMME\nKIWI\nKIWI"],
	["cat mots.txt | tr '[:lower:]' '[:upper:]'", "POMME\nPOMME\nPOIRE\nPOIRE\nKIWI\nPOMME\nKIWI\nKIWI"],
	["cat notes.txt | tr -d '[:digit:]'", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: . euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["cat notes.txt | tr -s 'a '", "a|b est un tube\nle chat (gris) dort\na bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligne$\nmot motif motus"],
	["cat mots.txt | tr '\\n' ' '", "pomme pomme Poire poire kiwi pomme kiwi kiwi "],
	["cat mots.txt | tr -d '\\n'", "pommepommePoirepoirekiwipommekiwikiwi"],
	["cat notes.txt | tr -c '[:alnum:]\\n' '_'", "a_b_est_un_tube\nle_chat__gris__dort\naaa_bbb_ccc\nLe_Chien_aboie\nprix__12_50_euros\nemail__ada_cybersup_ai\nx_y_z\nfin_de_ligne_\nmot_motif_motus"],
	["cat notes.txt | tr -cd '[:alpha:]\\n'", "abestuntube\nlechatgrisdort\naaabbbccc\nLeChienaboie\nprixeuros\nemailadacybersupai\nxyz\nfindeligne\nmotmotifmotus"],
	["cat notes.txt | tr -s '[:space:]' '\\n'", "a|b\nest\nun\ntube\nle\nchat\n(gris)\ndort\naaa\nbbb\nccc\nLe\nChien\naboie\nprix:\n12.50\neuros\nemail:\nada@cybersup.ai\nx+y=z\nfin\nde\nligne$\nmot\nmotif\nmotus"],
	["cat mots.txt | tr 'A-Za-z' 'N-ZA-Mn-za-m'", "cbzzr\ncbzzr\nCbver\ncbver\nxvjv\ncbzzr\nxvjv\nxvjv"],
	["cat mots.txt | tr 'pk' 'x'", "xomme\nxomme\nPoire\nxoire\nxiwi\nxomme\nxiwi\nxiwi"],
	["cat mots.txt | tr -t 'pom' 'PO'", "POmme\nPOmme\nPOire\nPOire\nkiwi\nPOmme\nkiwi\nkiwi"],
	["cat mots.txt | tr -s 'mp' 'MP'", "PoMe\nPoMe\nPoire\nPoire\nkiwi\nPoMe\nkiwi\nkiwi"],
	["cat notes.txt | tr -d -s 'a' ' '", "|b est un tube\nle cht (gris) dort\n bbb ccc\nLe Chien boie\nprix: 12.50 euros\nemil: d@cybersup.i\nx+y=z\nfin de ligne$\nmot motif motus"],
	["cat notes.txt | tr '[:punct:]' '#'", "a#b est un tube\nle chat #gris# dort\naaa bbb ccc\nLe Chien aboie\nprix# 12#50 euros\nemail# ada#cybersup#ai\nx#y#z\nfin de ligne#\nmot motif motus"],
	["cat mots.txt | tr 'a-y' 'b-z'", "qpnnf\nqpnnf\nPpjsf\nqpjsf\nljxj\nqpnnf\nljxj\nljxj"],
	["cat chiffres.txt | tr '0-9' '[x*]'", "x\nx\nx\nx\nx\nx\nx\nx\nx\nxx\nxx\nxx"],
	["cat chiffres.txt | tr '0-9' '[x*5]Y'", "x\nx\nx\nx\nY\nY\nY\nY\nY\nxx\nxx\nxx"],
	["cat notes.txt | tr -c 'a-z' '.'", "a.b.est.un.tube.le.chat..gris..dort.aaa.bbb.ccc..e..hien.aboie.prix........euros.email..ada.cybersup.ai.x.y.z.fin.de.ligne..mot.motif.motus."],
	["cat notes.txt | tr '\\044\\174' 'DP'", "aPb est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix: 12.50 euros\nemail: ada@cybersup.ai\nx+y=z\nfin de ligneD\nmot motif motus"],
	["head -n 3 chiffres.txt", "1\n2\n3"],
	["head -3 chiffres.txt", "1\n2\n3"],
	["head -n -9 chiffres.txt", "1\n2\n3"],
	["head -c 5 chiffres.txt", "1\n2\n3"],
	["tail -n 3 chiffres.txt", "10\n11\n12"],
	["tail -n +10 chiffres.txt", "10\n11\n12"],
	["tail -c 6 chiffres.txt", "11\n12"],
	["tail -c +20 chiffres.txt", "0\n11\n12"],
	["head -n 2 mots.txt chiffres.txt", "==> mots.txt <==\npomme\npomme\n\n==> chiffres.txt <==\n1\n2"],
	["tail -n 1 mots.txt chiffres.txt", "==> mots.txt <==\nkiwi\n\n==> chiffres.txt <==\n12"],
	["head -q -n 1 mots.txt chiffres.txt", "pomme\n1"],
	["head -v -n 1 mots.txt", "==> mots.txt <==\npomme"],
	["cat chiffres.txt | tail -n +11", "11\n12"],
	["cat chiffres.txt | head -n -10", "1\n2"],
	["head -n 0 chiffres.txt", ""],
	["tail -n 0 chiffres.txt", ""],
	["wc mots.txt", " 8  8 45 mots.txt"],
	["wc -l mots.txt", "8 mots.txt"],
	["wc -w journal.log", "42 journal.log"],
	["wc -c mots.txt", "45 mots.txt"],
	["wc -l mots.txt chiffres.txt", " 8 mots.txt\n12 chiffres.txt\n20 total"],
	["cat mots.txt | wc -l", "8"],
	["cat mots.txt | wc", "      8       8      45"],
	["cat journal.log | wc -lw", "      7      42"],
	["wc -L notes.txt", "22 notes.txt"],
	["wc -m mots.txt", "45 mots.txt"],
	["cut -d: -f1 passwd", "root\ndaemon\nlaurent\nmyriam\nmaintenance\nwww-data"],
	["cut -d: -f1,7 passwd", "root:/bin/bash\ndaemon:/usr/sbin/nologin\nlaurent:/bin/bash\nmyriam:/bin/zsh\nmaintenance:/bin/sh\nwww-data:/usr/sbin/nologin"],
	["cut -d: -f3- passwd", "0:0:root:/root:/bin/bash\n1:1:daemon:/usr/sbin:/usr/sbin/nologin\n1000:1000:Laurent B,,,:/home/laurent:/bin/bash\n1001:1001::/home/myriam:/bin/zsh\n0:0::/var/maint:/bin/sh\n33:33:www-data:/var/www:/usr/sbin/nologin"],
	["cut -d: -f-2 passwd", "root:x\ndaemon:x\nlaurent:x\nmyriam:x\nmaintenance:x\nwww-data:x"],
	["cut -d: -f2 --complement passwd", "root:0:0:root:/root:/bin/bash\ndaemon:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nlaurent:1000:1000:Laurent B,,,:/home/laurent:/bin/bash\nmyriam:1001:1001::/home/myriam:/bin/zsh\nmaintenance:0:0::/var/maint:/bin/sh\nwww-data:33:33:www-data:/var/www:/usr/sbin/nologin"],
	["cut -c1-3 mots.txt", "pom\npom\nPoi\npoi\nkiw\npom\nkiw\nkiw"],
	["cut -c3- mots.txt", "mme\nmme\nire\nire\nwi\nmme\nwi\nwi"],
	["cut -c2 --complement mots.txt", "pmme\npmme\nPire\npire\nkwi\npmme\nkwi\nkwi"],
	["cut -d, -f1,3 --output-delimiter=' ' ventes.csv", "produit prix\nsweat 35\ntasse 8\nsweat 35\ncasquette 15\ntasse 8"],
	["cut -d' ' -f2,4 journal.log", "08:12:01 ECHEC\n08:12:09 ECHEC\n08:13:44 SUCCES\n09:01:02 INFO\n09:15:30 ECHEC\n10:00:00 ECHEC\n10:05:12 ERREUR"],
	["cut -d, -f5 ventes.csv", "\n\n\n\n\n"],
	["cut -s -d: -f1 notes.txt", "prix\nemail"],
	["cut -d: -f1 notes.txt", "a|b est un tube\nle chat (gris) dort\naaa bbb ccc\nLe Chien aboie\nprix\nemail\nx+y=z\nfin de ligne$\nmot motif motus"],
	["nl mots.txt", "     1\tpomme\n     2\tpomme\n     3\tPoire\n     4\tpoire\n     5\tkiwi\n     6\tpomme\n     7\tkiwi\n     8\tkiwi"],
	["nl paragraphes.txt", "     1\tAda Lovelace\n     2\tLondres\n       \n     3\tAlan Turing\n     4\tManchester\n     5\tBletchley\n       \n       \n     6\tGrace Hopper\n     7\tNew York"],
	["nl -ba paragraphes.txt", "     1\tAda Lovelace\n     2\tLondres\n     3\t\n     4\tAlan Turing\n     5\tManchester\n     6\tBletchley\n     7\t\n     8\t\n     9\tGrace Hopper\n    10\tNew York"],
	["nl -w3 -s': ' mots.txt", "  1: pomme\n  2: pomme\n  3: Poire\n  4: poire\n  5: kiwi\n  6: pomme\n  7: kiwi\n  8: kiwi"],
	["nl -n ln mots.txt", "1     \tpomme\n2     \tpomme\n3     \tPoire\n4     \tpoire\n5     \tkiwi\n6     \tpomme\n7     \tkiwi\n8     \tkiwi"],
	["nl -n rz -w 3 mots.txt", "001\tpomme\n002\tpomme\n003\tPoire\n004\tpoire\n005\tkiwi\n006\tpomme\n007\tkiwi\n008\tkiwi"],
	["nl -v 10 -i 5 mots.txt", "    10\tpomme\n    15\tpomme\n    20\tPoire\n    25\tpoire\n    30\tkiwi\n    35\tpomme\n    40\tkiwi\n    45\tkiwi"],
	["rev mots.txt", "emmop\nemmop\nerioP\neriop\niwik\nemmop\niwik\niwik"],
	["cat mots.txt | rev", "emmop\nemmop\nerioP\neriop\niwik\nemmop\niwik\niwik"],
	["fold -w 10 notes.txt", "a|b est un\n tube\nle chat (g\nris) dort\naaa bbb cc\nc\nLe Chien a\nboie\nprix: 12.5\n0 euros\nemail: ada\n@cybersup.\nai\nx+y=z\nfin de lig\nne$\nmot motif \nmotus"],
	["fold -s -w 10 notes.txt", "a|b est \nun tube\nle chat \n(gris) \ndort\naaa bbb \nccc\nLe Chien \naboie\nprix: \n12.50 \neuros\nemail: \nada@cybers\nup.ai\nx+y=z\nfin de \nligne$\nmot motif \nmotus"],
	["fold -w 4 mots.txt", "pomm\ne\npomm\ne\nPoir\ne\npoir\ne\nkiwi\npomm\ne\nkiwi\nkiwi"],
	["awk '{ print > \"sortie.txt\" } END { print \"fini\" }' mots.txt ; cat sortie.txt", "fini\npomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["awk 'NR <= 2 { print >> \"ajout.txt\" }' chiffres.txt ; awk 'NR <= 2 { print >> \"ajout.txt\" }' mots.txt ; cat ajout.txt", "1\n2\npomme\npomme"],
	["awk '{ print $1 > ($2 == 1 ? \"un.txt\" : \"autre.txt\") }' tableau.txt ; cat un.txt autre.txt", "y\nz\nx\nx\ny"],
	["sed -i.bak 's/p/P/' m2.txt ; cat m2.txt m2.txt.bak", "Pomme\nPomme\nPoire\nPoire\nkiwi\nPomme\nkiwi\nkiwi\npomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["sed -i -e '1d' -e '$d' c2.txt ; cat c2.txt", "2\n3\n4\n5\n6\n7\n8\n9\n10\n11"],
	["sort -o tri.txt mots.txt ; cat tri.txt", "Poire\nkiwi\nkiwi\nkiwi\npoire\npomme\npomme\npomme"],
	["sort -r -o mots2.txt mots.txt ; head -n 2 mots2.txt", "pomme\npomme"],
	["cat mots.txt | tee t1.txt | wc -l ; cat t1.txt", "8\npomme\npomme\nPoire\npoire\nkiwi\npomme\nkiwi\nkiwi"],
	["cat mots.txt | tee -a t1.txt | head -n 1 ; wc -l t1.txt", "pomme\n16 t1.txt"],
	["uniq mots.txt u.txt ; cat u.txt", "pomme\nPoire\npoire\nkiwi\npomme\nkiwi"],
	["sed -n '/kiwi/w k.txt' mots.txt ; cat k.txt", "kiwi\nkiwi\nkiwi"],
	["sed 's/kiwi/KIWI/w k2.txt' mots.txt > /dev/null ; cat k2.txt", "KIWI\nKIWI\nKIWI"],
	["awk 'BEGIN { while ((getline l < \"tableau.txt\") > 0) { split(l, c); s += c[2] } print s }'", "10"],
	["awk '{ printf \"%c\", $1 + 64 } END { print \"\" }' chiffres.txt", "ABCDEFGHIJKL"],
	["echo 65 | awk '{ printf \"%c|%d|%s\\n\", $1, $1, $1 }'", "A|65|65"],
	["echo 'a.b.c' | awk -F. '{ print $2 }'", "b"],
	["echo 'a.b.c' | awk '{ n = split($0, t, \".\"); print n, t[3] }'", "3 c"],
	["echo 'a1b2c3' | awk '{ gsub(/[0-9]/, \"<&>\"); print }'", "a<1>b<2>c<3>"],
	["echo 'chemin/vers/fichier.txt' | awk -F/ '{ print $NF }'", "fichier.txt"],
	["echo ' a  b ' | awk '{ print NF, \"[\" $1 \"]\" }'", "2 [a]"],
	["echo ' a  b ' | awk -F' ' '{ print NF }'", "2"],
	["echo 'a:b' | awk 'BEGIN { FS = \":\" } { print $2 }'", "b"],
	["echo 'x y z' | awk '{ $2 = \"\"; print; print NF }'", "x  z\n3"],
	["echo 'x y z' | awk '{ $5 = \"e\"; print; print NF }'", "x y z  e\n5"],
	["echo 3 | awk '{ print $1 / 2, $1 % 2, -$1, $1 \"\" 1 }'", "1.5 1 -3 31"],
	["echo 'abc' | awk '{ print length, length($0), length(\"\") }'", "3 3 0"],
	["echo 'a b c d' | awk '{ for (i = 1; i <= NF; i += 2) printf \"%s \", $i; print \"\" }'", "a c "],
	["echo 'héllo wörld' | awk '{ print length($1), toupper($2), substr($1, 2, 2), index($0, \"w\") }'", "5 WÖRLD él 7"],
	["echo 'été' | grep -o '[[:alpha:]]*'", "été"],
	["echo 'Élève élève' | grep -io 'élève'", "Élève\nélève"],
	["echo 'café crème' | sed 's/\\w\\+/[&]/g'", "[café] [crème]"],
	["echo 'abc abc' | sed 's/b/\\n/g'", "a\nc a\nc"],
	["echo 'abc' | sed 's/\\(a\\)\\(b\\)\\(c\\)/\\3\\2\\1/'", "cba"],
	["echo 'aaa' | sed 's/a/b/3'", "aab"],
	["echo 'hello' | sed 's/l*/X/g'", "XhXeXoX"],
	["echo 'hello' | sed -E 's/(l+)/(\\1)/'", "he(ll)o"],
	["echo 'path/to/file' | sed 's,/,\\\\,g'", "path\\to\\file"],
	["echo 'x' | sed 'a\\\\'", "x\n"],
	["echo 'un deux' | sed 's/\\(un\\) \\(deux\\)/\\2 \\1/;s/^/>/'", ">deux un"],
	["echo 'abcabc' | grep -o 'b' | wc -l", "2"],
	["echo 'foo123bar' | grep -oE '[0-9]+'", "123"],
	["echo 'foo123bar' | grep -o '[0-9]\\+'", "123"],
	["echo 'a' | grep -c b", "0"],
	["echo 'tab\tici' | cut -f2", "ici"],
	["echo 'HELLO' | tr '[:upper:]' '[:lower:]' | rev", "olleh"],
	["echo 'aaabbbccc' | tr -s 'abc'", "abc"],
	["echo 'hello world' | tr -d 'lo'", "he wrd"],
	["echo 'hello world' | tr 'a-z' 'A-Z' | tr -d ' '", "HELLOWORLD"],
	["echo 'a-b-c' | tr '-' '_'", "a_b_c"],
	["echo 'abc' | tr 'a-c' '\\101-\\103'", "ABC"],
	["echo 'x y' | awk '{ t = $1; $1 = $2; $2 = t } 1'", "y x"],
	["grep ECHEC journal.log | awk '{ print $6 }' | sort | uniq -c | sort -rn | head -n 1", "      3 10.0.0.5"],
	["awk -F: '{ print $7 }' passwd | sort | uniq -c", "      2 /bin/bash\n      1 /bin/sh\n      1 /bin/zsh\n      2 /usr/sbin/nologin"],
	["sed -n '2,$p' ventes.csv | sort -t, -k3,3nr | head -n 2", "sweat,2,35\nsweat,3,35"],
	["cut -d, -f1 ventes.csv | tail -n +2 | sort -u", "casquette\nsweat\ntasse"],
	["cat journal.log | tr -s ' ' | cut -d' ' -f3 | sort | uniq", "cron\nnginx\nsshd"],
	["grep -o '[0-9.]*$' journal.log | sort -t. -k4,4n | uniq", "10.0.0.5\n10.0.0.7\n10.0.0.9\n10.0.0.12"],
	["awk '{ print $2 }' journal.log | cut -d: -f1 | uniq -c", "      3 08\n      2 09\n      2 10"],
	["sed 's/,/ /g' ventes.csv | awk 'NR > 1 { print $3 * $2, $1 }' | sort -n", "8 tasse\n70 sweat\n75 casquette\n80 tasse\n105 sweat"],
	["cat mots.txt | tr A-Z a-z | sort | uniq -c | sort -k1,1nr -k2", "      3 kiwi\n      3 pomme\n      2 poire"],
	["nl -ba -s' ' mots.txt | sort -k2 -k1,1n | uniq -f1 | sort -n | cut -d' ' -f2-", "    1 pomme\n    3 Poire\n    4 poire\n    5 kiwi"]
];

function nouveauJeu(){
	var jeu = monde.nouveauMonde();
	// Tous les sorts connus et déjà employés : la sortie n'est pas mêlée de récompenses.
	jeu.lire("tousLesSorts().concat(['nl', 'fold']).forEach(function(s){ state.spells[s] = true; state.usages[s] = true; });" +
		"Shell.fin = function(){ Shell.narration = []; };");
	jeu.taper("cd ~");
	Object.keys(FICHIERS).forEach(function(nom){
		jeu.lire("(function(){ var it = new Item(" + JSON.stringify(nom) + ", " + JSON.stringify(FICHIERS[nom].replace(/\n$/, "")) + ");" +
			" it.owner = JOUEUR; current_room.addItem(it); })()");
	});
	return jeu;
}
/* La petite aide de wc à l'écran est propre au jeu : on l'écarte pour comparer avec GNU. */
function sansAide(t){ return t.split("\n").filter(function(l){ return l !== "(dans l'ordre : lignes, mots, octets)"; }).join("\n"); }

/* --- 1. Les mêmes réponses que GNU --- */
var jeu = nouveauJeu();
CAS.forEach(function(c){
	var obtenu = sansAide(jeu.taper(c[0]));
	if (bavard) console.log("$ " + c[0] + "\n" + obtenu);
	egal(obtenu, c[1], c[0]);
});

/* --- 1 bis. Revérifier les attendus avec les vrais outils (node tests/texte.js --gnu) --- */
if (process.argv.indexOf("--gnu") > -1){
	var cp = require("child_process"), fs = require("fs"), path = require("path"), os = require("os");
	var dossier = fs.mkdtempSync(path.join(os.tmpdir(), "terminus-texte-"));
	Object.keys(FICHIERS).forEach(function(nom){ fs.writeFileSync(path.join(dossier, nom), FICHIERS[nom]); });
	var revus = 0;
	CAS.forEach(function(c){
		var gnu;
		try {
			gnu = cp.execFileSync("bash", ["-c", c[0].replace(/(^|[|;] *)awk /g, "$1gawk ")],
				{ cwd: dossier, env: Object.assign({}, process.env, { LC_ALL: "C.UTF-8" }), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
		} catch (e){ gnu = e.stdout || ""; }
		egal(gnu.replace(/\n$/, ""), c[1], "GNU : " + c[0]);
		revus++;
	});
	console.log(revus + " attendus revérifiés avec les vrais outils GNU.");
}

/* --- 2. Ce qui est propre au jeu --- */

// Le code de retour (io.code), lu par l'interpréteur : 0 trouvé, 1 rien trouvé, 2 erreur.
function code(sort, args, stdin){
	return jeu.lire("(function(){ var io = { stdin: " + JSON.stringify(stdin === undefined ? null : stdin) + ", tty: false, sudo: false, erreurs: [], err: function(m){ this.erreurs.push(m); } };" +
		" try { Shell.sorts." + sort + "(" + JSON.stringify(args) + ", io); } catch (e){ return 'erreur ' + (e.code || ''); } return io.code === undefined ? 0 : io.code; })()");
}
verifier(code("grep", ["pomme", "mots.txt"]) === 0, "grep qui trouve : code 0");
verifier(code("grep", ["ananas", "mots.txt"]) === 1, "grep qui ne trouve rien : code 1");
verifier(code("grep", ["-q", "kiwi", "mots.txt"]) === 0, "grep -q qui trouve : code 0");
verifier(code("grep", ["-c", "ananas", "mots.txt"]) === 1, "grep -c 0 : code 1 aussi");
verifier(code("grep", ["x", "absent.txt"]) === 2, "grep sur un objet absent : code 2");
verifier(code("grep", ["-v", "", "mots.txt"]) === 1, "grep -v '' : aucune ligne, code 1");
verifier(code("grep", ["a"], "abc") === 0, "grep dans un tuyau : code 0");
verifier(code("awk", ["BEGIN { exit 3 }"]) === 3, "awk exit 3 : code 3");
verifier(code("awk", ["{ exit $1 } END { }"], "4") === 4, "awk exit dans une règle, END joué quand même : code 4");
verifier(code("sed", ["2q5"], "a\nb\nc") === 5, "sed q5 : code 5");
verifier(code("sort", ["-c", "chiffres.txt"]) === 1, "sort -c sur un texte en désordre : code 1");
verifier(code("sort", ["-c", "-n", "chiffres.txt"]) === 0, "sort -c -n sur un texte trié : code 0");
verifier(code("grep", ["-E", "a("]) === "erreur 2", "motif invalide : erreur, code 2");

// grep : un vide rien trouvé n'affiche rien, sans message d'erreur.
egal(jeu.taper("grep ananas mots.txt"), "", "grep sans résultat : rien à l'écran");
contient(jeu.taper("grep -E 'a(' mots.txt"), "jamais refermée", "grep -E avec une parenthèse ouverte");
contient(jeu.taper("grep 'a\\(' mots.txt"), "\\( jamais refermée par \\)", "grep BRE avec \\( ouverte");
contient(jeu.taper("grep '[[:chiffre:]]' mots.txt"), "classe [:chiffre:] inconnue", "classe POSIX inconnue");
contient(jeu.taper("grep -k x mots.txt"), "option inconnue « -k »", "option inconnue de grep");
contient(jeu.taper("grep -r kiwi ."), "mots.txt:kiwi", "grep -r garde son fonctionnement");
contient(jeu.taper("grep pomme ."), "c'est un lieu", "grep sur un lieu sans -r");
verifier(jeu.taper("grep -s x absent.txt").indexOf("absent") === -1, "grep -s : pas de message pour l'objet absent");
egal(jeu.taper("grep -q kiwi mots.txt"), "", "grep -q n'affiche rien");

// La couleur à l'écran (le terminal), pas dans un tuyau.
var colore = jeu.lire("(function(){ var io = { stdin: 'un kiwi', tty: true, err: function(){} }; return Shell.sorts.grep(['kiwi'], io); })()");
verifier(/\x1b\[31m/.test(colore) && colore.replace(/\x1b\[[0-9;]*m/g, "") === "un kiwi", "grep colore le morceau trouvé à l'écran");
var tuyau = jeu.lire("(function(){ var io = { stdin: 'un kiwi', tty: false, err: function(){} }; return Shell.sorts.grep(['kiwi'], io); })()");
egal(tuyau, "un kiwi", "grep ne colore pas dans un tuyau");

// sed : les erreurs parlent français et montrent des exemples.
contient(jeu.taper("sed 's/a/b' mots.txt"), "commande « s » inachevée", "sed s/// inachevé");
contient(jeu.taper("sed 'k' mots.txt"), "commande inconnue : « k »", "sed commande inconnue");
contient(jeu.taper("sed '/x/{p' mots.txt"), "{ jamais refermée par }", "sed bloc ouvert");
contient(jeu.taper("sed 'b ailleurs' mots.txt"), "étiquette introuvable", "sed étiquette absente");
contient(jeu.taper("sed 'y/ab/x/' mots.txt"), "même longueur", "sed y/// déséquilibré");
contient(jeu.taper("sed ':a;ba' mots.txt"), "tourne en rond", "sed : le garde-fou arrête une boucle sans fin");
contient(jeu.taper("sed 's/x/y/e' mots.txt"), "n'est pas permis", "sed : le drapeau e est refusé");
egal(jeu.taper("echo abc | sed 's/a/$1/'"), "$1bc", "sed : $1 n'est pas une référence (c'est du JavaScript), il reste tel quel");
egal(jeu.taper("echo ab | sed 's/\\(a\\)\\(b\\)/\\2\\1/'"), "ba", "sed : \\1 \\2 sont les groupes");
egal(jeu.taper("echo ab | sed 's/a/[&]/'"), "[a]b", "sed : & est le morceau trouvé");
contient(jeu.taper("sed -i 's/a/b/'"), "il faut un objet", "sed -i sans objet");

// sed -i : sur place, avec ou sans sauvegarde, et les droits.
jeu.lire("(function(){ var it = new Item('surplace.txt', 'un\\ndeux\\ntrois'); it.owner = JOUEUR; current_room.addItem(it); })()");
egal(jeu.taper("sed -i '2d' surplace.txt"), "", "sed -i n'affiche rien");
egal(jeu.taper("cat surplace.txt"), "un\ntrois", "sed -i a modifié l'objet");
jeu.taper("sed -i.orig 's/un/UN/' surplace.txt");
egal(jeu.taper("cat surplace.txt.orig"), "un\ntrois", "sed -i.orig garde l'original");
egal(jeu.taper("cat surplace.txt"), "UN\ntrois", "sed -i.orig modifie l'objet");
jeu.lire("(function(){ var it = new Item('scelle.txt', 'a'); it.owner = 'root'; it.mode = 'r--r--r--'; current_room.addItem(it); })()");
contient(jeu.taper("sed -i 's/a/b/' scelle.txt"), "Permission non accordée", "sed -i respecte les droits");
egal(jeu.taper("cat scelle.txt"), "a", "l'objet protégé n'a pas bougé");

// awk : un vrai langage, des erreurs claires, un garde-fou.
contient(jeu.taper("awk '{ print $1 '"), "erreur de syntaxe", "awk : accolade oubliée");
contient(jeu.taper("awk '{ print $1 '"), "^", "awk : l'erreur montre l'endroit");
contient(jeu.taper("awk 'BEGIN { x = 1 +* 2 }'"), "près de « * »", "awk : l'erreur nomme le jeton fautif");
contient(jeu.taper("awk 'BEGIN { f(2) }'"), "n'est définie nulle part", "awk : fonction inconnue");
contient(jeu.taper("awk 'BEGIN { while (1) n++ }'"), "boucle sans fin", "awk : le garde-fou arrête une boucle sans fin");
contient(jeu.taper("awk 'function f(n) { return f(n + 1) } BEGIN { f(1) }'"), "récursion sans fin", "awk : récursion sans fin");
contient(jeu.taper("awk 'BEGIN { print 1 / 0 }'"), "division par zéro", "awk : division par zéro");
contient(jeu.taper("awk '{ print | \"sort\" }' mots.txt"), "n'est pas permis ici", "awk : pas de tuyau vers une commande");
contient(jeu.taper("awk 'BEGIN { system(\"ls\") }'"), "n'est pas permis ici", "awk : pas de system()");
contient(jeu.taper("awk 'BEGIN { t[1] = 1; print t }'"), "est un tableau", "awk : un tableau n'est pas une valeur");
contient(jeu.taper("awk 'BEGIN { x = 1; x[1] = 2 }'"), "simple valeur", "awk : une valeur n'est pas un tableau");
contient(jeu.taper("awk '{ print $-1 }' mots.txt"), "n'existe pas", "awk : champ négatif");
contient(jeu.taper("awk '{ print }'"), "texte arrivant par un tuyau", "awk sans entrée");
contient(jeu.taper("awk"), "quel programme", "awk sans programme");
contient(jeu.taper("awk -v 3=x 'BEGIN { }'"), "-v attend une affectation", "awk -v mal formé");
egal(jeu.taper("awk 'BEGIN { print \"seul BEGIN, sans rien lire\" }'"), "seul BEGIN, sans rien lire", "awk : BEGIN seul ne lit rien");
egal(jeu.taper("awk 'BEGIN { for (i = 0; i < 100000; i++) s += i; print s }'"), "4999950000", "awk : une vraie boucle de 100 000 tours passe");
egal(jeu.taper("awk '{ print $1 }' absent.txt mots.txt | head -n 1").split("\n").pop(), "pomme", "awk : un objet absent n'empêche pas de lire les autres");
// print > objet : écrit dans le monde du jeu.
egal(jeu.taper("awk -F: '{ print $1 > \"comptes.txt\" }' passwd"), "", "awk print > objet n'affiche rien");
egal(jeu.taper("cat comptes.txt"), "root\ndaemon\nlaurent\nmyriam\nmaintenance\nwww-data", "awk print > objet a écrit l'objet");
jeu.taper("awk 'NR == 1 { print \"en plus\" >> \"comptes.txt\" }' mots.txt");
egal(jeu.taper("tail -n 1 comptes.txt"), "en plus", "awk print >> objet ajoute à la suite");
egal(jeu.taper("awk 'BEGIN { printf \"sans fin\" > \"brut.txt\" }' ; cat brut.txt"), "sans fin", "awk printf > objet");
// L'événement awk de la quête de la badgeuse reçoit toujours la sortie.
jeu.lire("var vuAwk = null; GameEvents.addListener('awk', function(e){ vuAwk = e; });");
jeu.taper("awk -F: '$3 == 0 { print $1 }' passwd");
verifier(jeu.lire("vuAwk && vuAwk.sortie === 'root\\nmaintenance' && vuAwk.separateur === ':'"), "l'événement awk porte la sortie et le séparateur");
jeu.lire("(function(){ var it = new Item('badges.log', '2026-10-01 05:12 B-047 Labo\\n2026-10-01 07:30 B-047 Labo\\n2026-10-01 04:00 B-012 Hall'); it.owner = JOUEUR; current_room.addItem(it); })()");
egal(jeu.taper("awk '$3 == \"B-047\" && $2 < \"06:00\"' badges.log"), "2026-10-01 05:12 B-047 Labo", "awk : la commande de la badgeuse (solution) compare des heures en texte");

// sort, uniq, tee : les objets écrits.
egal(jeu.taper("sort -o mots.txt mots.txt ; cat mots.txt | head -n 2"), "Poire\nkiwi", "sort -o sur l'objet lui-même");
contient(jeu.taper("sort -c chiffres.txt"), "désordre : 10", "sort -c montre la première ligne en désordre");
contient(jeu.taper("sort -k 0 chiffres.txt"), "numérotées à partir de 1", "sort -k 0 refusé");
contient(jeu.taper("sort -k x chiffres.txt"), "clé de tri invalide", "sort -k mal formé");
contient(jeu.taper("sort -t ab chiffres.txt"), "un seul caractère", "sort -t trop long");
egal(jeu.taper("cat chiffres.txt | tee copie1.txt copie2.txt | wc -l"), "12", "tee passe le texte au suivant");
egal(jeu.taper("cat copie2.txt | tail -n 1"), "12", "tee écrit dans plusieurs objets");
jeu.taper("echo 13 | tee -a copie1.txt");
egal(jeu.taper("tail -n 2 copie1.txt"), "12\n13", "tee -a ajoute à la suite");

// tr : seulement l'entrée standard.
contient(jeu.taper("tr a-z A-Z mots.txt"), "opérande en trop « mots.txt »", "tr refuse un nom d'objet");
contient(jeu.taper("tr a-z A-Z"), "tuyau", "tr sans tuyau");
contient(jeu.taper("cat mots.txt | tr a"), "deux ensembles", "tr avec un seul ensemble");
contient(jeu.taper("cat mots.txt | tr z-a x"), "à l'envers", "tr avec un intervalle à l'envers");
contient(jeu.taper("cat mots.txt | tr '[:chiffre:]' x"), "inconnue", "tr avec une classe inconnue");
egal(jeu.taper("echo 'Bonjour' | tr -d 'aeiou' | tr 'a-z' 'A-Z'"), "BNJR", "tr enchaînés");
jeu.lire("var vuTr = null; GameEvents.addListener('tr', function(e){ vuTr = e; });");
jeu.taper("echo uryyb | tr 'A-Za-z' 'N-ZA-Mn-za-m'");
verifier(jeu.lire("vuTr && vuTr.text === 'hello'"), "l'événement tr porte le texte transformé (ROT13)");

// head, tail, wc : messages et petites aides.
contient(jeu.taper("head -n abc chiffres.txt"), "attend un nombre", "head -n sans nombre");
contient(jeu.taper("tail -x chiffres.txt"), "option inconnue", "tail option inconnue");
contient(jeu.taper("wc chiffres.txt"), "(dans l'ordre : lignes, mots, octets)", "wc rappelle l'ordre des colonnes à l'écran");
egal(jeu.taper("wc chiffres.txt | cat"), "12 12 27 chiffres.txt", "wc dans un tuyau : sans l'aide");
egal(jeu.taper("echo bonjour | wc -c"), "8", "wc -c compte le retour à la ligne final, comme GNU");
egal(jeu.taper("echo été | wc -c"), "6", "wc -c compte des octets (é en vaut deux)");
egal(jeu.taper("echo été | wc -m"), "4", "wc -m compte des caractères");

// nl, fold : les nouveaux venus.
egal(jeu.taper("echo x | nl -s ' ' -w 2"), " 1 x", "nl -s -w");
contient(jeu.taper("nl -b z chiffres.txt"), "style de numérotation inconnu", "nl -b inconnu");
contient(jeu.taper("fold -w 0 chiffres.txt"), "au moins 1", "fold -w 0");

// Les pages du manuel documentent les nouvelles options.
contient(jeu.taper("man grep"), "grep -o", "man grep parle de -o");
contient(jeu.taper("man grep"), "\\|", "man grep explique BRE et ERE");
contient(jeu.taper("man sed"), "sed -i.bak", "man sed parle de -i.bak");
contient(jeu.taper("man sed"), "\\1", "man sed parle des groupes");
contient(jeu.taper("man awk"), "BEGIN", "man awk parle de BEGIN");
contient(jeu.taper("man awk"), "printf", "man awk parle de printf");
contient(jeu.taper("man sort"), "-k2,2nr", "man sort parle de -k");
contient(jeu.taper("man tr"), "[:lower:]", "man tr parle des classes");
contient(jeu.taper("man tail"), "tail -n +5", "man tail parle de -n +N");
contient(jeu.taper("man cut"), "--complement", "man cut parle de --complement");
contient(jeu.taper("man uniq"), "uniq -i", "man uniq parle de -i");
contient(jeu.taper("man nl"), "nl -ba", "man nl existe");
verifier(["grep", "sed", "awk", "sort", "tr", "head", "tail", "wc", "cut", "uniq", "nl", "fold", "tee", "rev"].every(function(s){
	return jeu.lire("MANUEL[" + JSON.stringify(s) + "].page").indexOf("—") === -1;
}), "aucun tiret cadratin dans ces pages de manuel");

console.log(ok + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
