/**
 * L'épreuve finale : on l'ouvre, on la résout de bout en bout, et on vérifie la note et le code.
 * Lancer : node tests/examen.js   (-v pour tout voir)
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }

function examen(graine){
	var stockage = { "terminus-cybersup-profil": JSON.stringify({ graine: graine || 4242, prenom: "Ada", chapitre: 1, modeExamen: true }) };
	var jeu = monde.nouveauMonde(stockage);
	jeu.lire("state.nom = 'Ada'; demarrerExamen(); Shell.narration = [];");
	jeu.stockage = stockage;
	return jeu;
}

/* --- 1. Le code d'accès --- */
var normal = monde.nouveauMonde();
verifier(normal.lire("codeExamenValide('CODE-RETIRE')"), "le code CODE-RETIRE ouvre l'épreuve");
verifier(normal.lire("codeExamenValide(' rouxblanc-7351 ')"), "le code se tape sans souci de casse");
verifier(!normal.lire("codeExamenValide('CODE-RETIRE-2')"), "un mauvais code n'ouvre rien");
contient(normal.taper("examen", "FAUX"), "pas le bon code", "examen refuse un faux code");
contient(normal.taper("kamikaze"), "n'a de sens que pendant", "kamikaze hors épreuve");
verifier(!normal.lire("examenEnCours()"), "hors examen, la partie normale est intacte");

/* --- 2. Toute l'épreuve --- */
var jeu = examen();
var mdp = jeu.lire("MOT_DE_PASSE_SUDO");
var ip = jeu.lire("IP_ASSAILLANT_EXAMEN");
var mot = jeu.lire("MOT_DE_MYRIAM");
var pid = jeu.lire("PID_OREILLE");
contient(jeu.taper("pwd"), "/home/", "pwd dans les quartiers");
contient(jeu.taper("indice 4", "non"), "0,25 point", "un indice se paie, et se confirme");
verifier(jeu.lire("nbIndicesExamen()") === 0, "non : pas d'indice pris");
contient(jeu.taper("ssh web"), "coupée", "ssh bloqué");
var carte = jeu.taper("tree /");
contient(carte, "Manon", "tree / montre la carte et ses habitants");
verifier(carte.indexOf("fragment-du-sceau") === -1, "la carte ne trahit pas le fragment (deux niveaux par défaut)");
contient(jeu.taper("cd /"), "Manon la Châtelaine", "on rencontre Manon en arrivant dans le hall");
contient(jeu.taper("cd /"), "", "");
verifier(jeu.taper("cd /").indexOf("Rencontre") === -1, "une rencontre n'a lieu qu'une fois");
contient(jeu.taper("ls"), "quarantaine", "la racine de la Forteresse");
jeu.taper("cd ~");
contient(jeu.taper("ls -a"), ".ordre-de-mission", "l'ordre caché se voit avec ls -a");
verifier(jeu.lire("state.examen.rencontres.aidan === true"), "on rencontre Aidan au premier regard dans les quartiers");
contient(jeu.taper("cat Aidan"), "pieds nus, poilus", "Aidan est là, pieds poilus");
contient(jeu.taper("cat /Manon"), "LE SCEAU DU HÉRAUT", "Manon tient le registre des sceaux");
contient(jeu.taper("cat /Manon"), "pour gagner le bonus de +2", "Manon tient l'horloge");
jeu.taper("cd /var/log");
contient(jeu.taper("cat /home/Wissam"), "/var/log", "Wissam donne un conseil sur le lieu d'où l'on vient");
jeu.taper("cd /etc");
contient(jeu.taper("cat Jean-Baptiste"), "10.0.97.0/26", "Jean-Baptiste pose sa colle");
var avantJB = jeu.lire("state.examen.erreurs");
contient(jeu.taper("echo 10.0.97.64"), "fronce les sourcils", "une mauvaise réponse à Jean-Baptiste");
verifier(jeu.lire("state.examen.erreurs") === avantJB + 1, "une mauvaise réponse compte une fausse manœuvre");
contient(jeu.taper("echo 10.0.97.63"), "Mon père serait fier", "la bonne réponse");
contient(jeu.taper("cat Jean-Baptiste"), "registre local des noms", "la piste de Jean-Baptiste");
contient(jeu.taper("cat /opt/atelier/Gabriel"), "Lance ps, ou top", "Gabriel veut d'abord voir ps");
contient(jeu.taper("ps"), "Rien ne tourne", "ps ment : l'alias de Myriam");
jeu.taper("unalias ps");
contient(jeu.taper("ps"), "tajine", "le tajine de Timour tourne");
contient(jeu.taper("cat /opt/atelier/Gabriel"), "%CPU", "la leçon de Gabriel");
contient(jeu.taper("cat /opt/atelier/Timour"), "Marrakech", "Cheb Timour");
jeu.taper("cd ~");
contient(jeu.taper("cat /tmp/David"), "Taverne aux Arches d'Or", "David garde /tmp");
contient(jeu.taper("cat ~/.ordre-de-mission | head -n 1"), "MAGE ROUXBLANC", "l'ordre est scellé par le Mage Rouxblanc");
verifier(jeu.lire("state.examen.reussies.ordre"), "lire l'ordre, même par un tuyau, accomplit l'épreuve I");
contient(jeu.taper("cat .ordre-de-mission"), "Aidan, l'elfe aux pieds", "l'ordre présente Aidan");
contient(jeu.taper("grep Failed /var/log/auth.log | cut -d' ' -f9 | sort | uniq -c | sort -n"), ip, "l'assaillant se compte");
contient(jeu.taper("echo " + ip + " > ~/rapport/assaillant.txt"), "Épreuve II", "épreuve II");
jeu.taper("chmod +x ~/arsenal/rempart.sh");
contient(jeu.taper("~/arsenal/rempart.sh"), "Épreuve III", "épreuve III : armé puis levé");
var erreursAvant = jeu.lire("state.examen.erreurs");
jeu.taper("ls");
verifier(jeu.lire("state.examen.erreurs") === erreursAvant, "une ligne réussie ne compte pas");
jeu.taper("cat /nexiste/pas");
verifier(jeu.lire("state.examen.erreurs") === erreursAvant + 1, "une ligne ratée compte une fausse manœuvre");
var trouve = jeu.taper("find /srv -name fragment-du-sceau");
contient(trouve, "fragment-du-sceau", "find trouve le fragment");
contient(jeu.taper("mv " + trouve.trim().split("\n")[0] + " ~/rapport"), "Épreuve IV", "épreuve IV");
contient(jeu.taper("cat /etc/hosts"), "10.0.92.53", "le registre local des noms");
jeu.editer("function(t){ return t.replace('10.0.66.53', '10.0.92.53'); }");
contient(jeu.taper("sudo nano /etc/resolv.conf", mdp), "Épreuve V", "épreuve V");
contient(jeu.taper("sudo systemctl start isc-dhcp-server", mdp), "failed", "la Mairie refuse d'ouvrir");
contient(jeu.taper("sudo journalctl -u isc-dhcp-server", mdp), "not on net", "le journal dit pourquoi");
jeu.editer("function(t){ return t.replace('10.0.97.100 10.0.97.150', '10.0.97.20 10.0.97.50'); }");
jeu.taper("sudo nano /etc/dhcp/dhcpd.conf", mdp);
contient(jeu.taper("sudo systemctl restart isc-dhcp-server", mdp), "Épreuve VI", "épreuve VI");
contient(jeu.taper("sudo ss -tlnp", mdp), ":23", "telnet écoute");
contient(jeu.taper("sudo systemctl stop telnet", mdp), "", "");
verifier(!jeu.lire("state.examen.reussies.telnet"), "telnet arrêté mais encore activé : pas encore");
contient(jeu.taper("sudo systemctl disable telnet", mdp), "Épreuve VII", "épreuve VII");
contient(jeu.taper("sudo systemctl enable --now nginx", mdp), "Épreuve VIII", "épreuve VIII");
jeu.taper("cd /opt/gardiens");
contient(jeu.taper("sha256sum -c SHA256SUMS"), "vigile: ÉCHEC", "le gardien trafiqué se démasque");
contient(jeu.taper("sudo mv vigile /quarantaine/", mdp), "Épreuve IX", "épreuve IX");
var charge = jeu.taper("grep charge /quarantaine/vigile").split("charge=")[1].trim();
contient(jeu.taper("echo " + charge + " | base64 -d"), mot, "le message se déchiffre");
contient(jeu.taper("echo " + mot + " > ~/rapport/signature.txt"), "Épreuve X", "épreuve X");
contient(jeu.taper("sudo find / -perm -4000", mdp), ".passe-muraille", "find -perm -4000");
contient(jeu.taper("sudo rm /usr/local/lib/.passe-muraille", mdp), "Épreuve XI", "épreuve XI");
contient(jeu.taper("sudo ss -tlnp", mdp), "31337", "l'oreille écoute");
contient(jeu.taper("sudo kill " + pid, mdp), "esquive", "TERM esquivé");
contient(jeu.taper("sudo kill -9 " + pid, mdp), "Épreuve XII", "épreuve XII");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('myriam@tour-noire') === -1; }).join('\\n'); }");
contient(jeu.taper("sudo nano /root/.ssh/authorized_keys", mdp), "Épreuve XIII", "épreuve XIII");
/* Le Sceau du Héraut : Laurana */
contient(jeu.taper("cat /var/www/Laurana"), "LAURANA LA FLAMBOYANTE", "Laurana est en pierre");
contient(jeu.taper("cat /var/www/html/index.html"), "Permission", "la proclamation de Myriam est à elle seule");
jeu.taper("cd ~");
contient(jeu.taper("tar -tf /srv/sauvegardes/proclamations.tar"), "index.html", "la sauvegarde se liste");
jeu.taper("tar -xf /srv/sauvegardes/proclamations.tar");
contient(jeu.taper("sudo cp index.html /var/www/html/index.html", mdp), "Épreuve XIV", "épreuve XIV");
jeu.taper("ls"); jeu.taper("pwd");
var revient = jeu.taper("ls");
verifier(jeu.lire("!state.examen.reussies.proclamation"), "le sortilège recouvre la proclamation");
contient(jeu.taper("sudo crontab -u myriam -l", mdp), "/var/www/html/index.html", "le sortilège se trouve dans la crontab de Myriam");
contient(jeu.taper("sudo crontab -u myriam -r", mdp), "Épreuve XV", "épreuve XV");
jeu.taper("sudo cp index.html /var/www/html/index.html", mdp);
verifier(jeu.lire("state.examen.reussies.proclamation"), "la proclamation tient, maintenant");
contient(jeu.taper("sudo chown root /var/www/html/index.html", mdp), "", "");
contient(jeu.taper("sudo chmod 644 /var/www/html/index.html", mdp), "Épreuve XVII", "épreuve XVII");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('myriam:') !== 0; }).join('\\n'); }");
contient(jeu.taper("sudo nano /etc/passwd", mdp), "Épreuve XVI", "épreuve XVI");
/* Le Sceau du Registre : toutes les notions du chapitre 1 */
var h = jeu.lire("heuresDesFrappes()");
jeu.taper("history > ~/rapport/journal.txt");
contient(jeu.taper("date >> ~/rapport/journal.txt"), "Épreuve XIX", "épreuve XIX : journal");
jeu.taper("grep " + ip + " /var/log/auth.log | head -n 1 | cut -d' ' -f1 > ~/rapport/chronique.txt");
contient(jeu.taper("grep " + ip + " /var/log/auth.log | tail -n 1 | cut -d' ' -f1 >> ~/rapport/chronique.txt"), "Épreuve XX", "épreuve XX : chronique");
contient(jeu.taper("grep " + ip + " /var/log/auth.log | wc -l > ~/rapport/frappes.txt"), "Épreuve XXI", "épreuve XXI : frappes (" + h.nombre + ")");
jeu.taper("mkdir ~/rapport/preuves");
jeu.taper("cp /var/log/auth.log ~/rapport/preuves/");
contient(jeu.taper("touch ~/rapport/preuves/SCELLE"), "Épreuve XXII", "épreuve XXII : preuves");
jeu.taper("whoami > ~/rapport/identite.txt"); jeu.taper("id >> ~/rapport/identite.txt");
contient(jeu.taper("hostname >> ~/rapport/identite.txt"), "Épreuve XXIII", "épreuve XXIII : identité");
contient(jeu.taper("du /var"), "/var/log", "du mesure /var");
contient(jeu.taper("echo /var/log > ~/rapport/disque.txt"), "Épreuve XXIV", "épreuve XXIV : disque");
contient(jeu.taper("rmdir /tmp/piege"), "Épreuve XXV", "épreuve XXV : piège");
contient(jeu.taper("alias carte='tree /'"), "Épreuve XXVI", "épreuve XXVI : alias");
contient(jeu.taper("env"), "MAITRE=Myriam", "env montre la variable de Myriam");
contient(jeu.taper("export MAITRE=Rouxblanc"), "Épreuve XXVII", "épreuve XXVII : export");
var lien = jeu.taper("ln -s /var/www/html ~/balcon");
contient(lien, "Épreuve XXVIII", "épreuve XXVIII : ln");
verifier(lien.indexOf("Cybersup") === -1, "les chemins s'écrivent comme sur la vraie machine : " + lien.split("\n")[0]);
contient(jeu.taper("passwd", ["Une phrase bien longue 42", "Une phrase bien longue 42"]), "Épreuve XXIX", "épreuve XXIX : passwd");
verifier(jeu.taper("passwd", ["Une autre phrase longue 43", "Une autre phrase longue 43"]).indexOf("RSSI") === -1, "le RSSI du chapitre 1 se tait");
contient(jeu.taper("ping -c 1 10.0.92.53"), "Épreuve XXX", "épreuve XXX : ping");
contient(jeu.taper("diff /srv/sauvegardes/hosts /etc/hosts"), "proclamations", "diff montre l'ajout");
contient(jeu.taper("diff /srv/sauvegardes/hosts /etc/hosts | grep proclamations > ~/rapport/ajout.txt"), "Épreuve XXXI", "épreuve XXXI : diff");
contient(jeu.taper("cowsay Oyez"), "", "");
jeu.taper("sudo apt install cowsay", mdp);
contient(jeu.taper("cowsay Oyez oyez"), "Épreuve XXXII", "épreuve XXXII : apt et cowsay");
/* Le Sceau du Plateau : Questions pour un Linux */
jeu.taper("cd /dev/random");
contient(jeu.taper("cat Steve"), "QUESTION 1 SUR 3", "Steve pose la première question");
verifier(jeu.lire("state.examen.quiz.ids.map(function(i){ return QUESTIONS_POUR_UN_LINUX[i].ch; }).sort().join()") === "1,2,3", "une question par chapitre");
contient(jeu.taper("indice 33"), "Steve ne souffle jamais", "pas d'indice sur le plateau");
for (var qk = 0; qk < 3; qk++){
	jeu.taper("cat Steve");
	var bonne = jeu.lire("questionDuQuiz(state.examen.quiz, " + qk + ").bonne");
	var rep = jeu.taper("echo " + bonne);
	contient(rep, "TOP", "bonne réponse " + (qk + 1));
	if (qk === 2) contient(rep, "Épreuve XXXIII", "épreuve XXXIII : le quiz");
}
verifier(jeu.lire("pointsExamen()") === jeu.lire("POINTS_MAX_EXAMEN") - 1, "45 points moins le registre des noms");
jeu.taper("cd ~");
verifier(jeu.lire("Object.keys(state.examen.reussies).length") === 32, "32 épreuves avant la dernière : " + jeu.lire("Object.keys(state.examen.reussies).join(',')"));
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('proclamations') === -1; }).join('\\n'); }");
var fin = jeu.taper("sudo nano /etc/hosts", mdp);
contient(fin, "Épreuve XVIII", "épreuve XVIII");
contient(fin, "Laurana la Flamboyante secoue", "Laurana se réveille");
contient(jeu.taper("cat ~/rapport/diplome.txt"), "Code de vérification", "Laurana a écrit le diplôme dans ~/rapport");
contient(fin, "LA FORTERESSE EST REPRISE", "la victoire");
contient(fin, "NOTE FINALE         : 20 / 20", "la note");
contient(fin, "Bonus de temps      : +2", "le bonus de temps");
contient(fin, "La sorcière, l'acrobate, l'ogre et l'elfe", "la fin réunit toute la troupe");
contient(jeu.taper("cat /tmp/David"), "plus personne à qui crier", "David boude quand son guichet est fermé");
verifier(jeu.lire("examenFini()"), "l'épreuve est finie");
var code = fin.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var lu = jeu.lire("lireCodeExamen(" + JSON.stringify(code) + ")");
verifier(lu && lu.valide && lu.note === 20 && lu.fin === "V" && lu.erreurs >= 1 && lu.reussies.every(function(x){ return x; }), "le code se relit : " + JSON.stringify(lu));
var rapport = jeu.taper("verifier " + code);
contient(rapport, "Code authentique", "verifier");
contient(rapport, "cassée une fois en route", "verifier montre l'épreuve cassée par le sortilège");
contient(rapport, "QUESTIONS POUR UN LINUX  3 sur 3", "verifier montre le quiz");
contient(normal.taper("verifier " + code), "Restaurer la proclamation", "verifier marche aussi hors de l'épreuve");
contient(jeu.taper("verifier " + code.replace(/.$/, function(c){ return c === "A" ? "B" : "A"; })), "", "");
contient(jeu.taper("kamikaze"), "terminée", "kamikaze après la fin");
contient(jeu.taper("examen"), "DIPLÔME", "examen réimprime le diplôme");

/* --- 3. La sauvegarde de l'examen garde l'avancée --- */
verifier(!!jeu.stockage["terminus-cybersup-examen"], "l'épreuve a sa propre sauvegarde");
var repris = monde.nouveauMonde(jeu.stockage);
verifier(repris.lire("examenFini() && pointsExamen() === POINTS_MAX_EXAMEN && noteExamen() === 20"), "l'épreuve se retrouve après rechargement");

/* --- 4. Kamikaze en cours de route --- */
var k = examen(777);
k.taper("cat ~/.ordre-de-mission");
k.taper("chmod +x ~/arsenal/rempart.sh");
k.taper("~/arsenal/rempart.sh");
contient(k.taper("indice", "oui"), "Indice, épreuve II", "un indice payé");
contient(k.taper("indice 2"), "déjà payé", "un indice déjà payé se relit gratuitement");
var pidTajine = k.lire("PID_TAJINE");
contient(k.taper("sudo kill -9 " + pidTajine, k.lire("MOT_DE_PASSE_SUDO")), "MON TAJINE", "tuer le tajine de Timour");
verifier(k.lire("state.examen.tajineTue && state.examen.erreurs >= 5"), "le tajine compte 5 fausses manœuvres");
contient(k.taper("cat /opt/atelier/Timour"), "on regarde le USER", "Timour pleure son tajine");
contient(k.taper("kamikaze", "non"), "continue", "kamikaze se confirme");
verifier(!k.lire("examenFini()"), "non : on continue");
var sortie = k.taper("kamikaze", "oui");
contient(sortie, "KAMIKAZE", "le sacrifice");
contient(sortie, "NOTE FINALE         : 0,75 / 20", "la note de ce qui est fait : 2 points sur 45 (1 / 20) moins un indice à 0,25");
contient(sortie, "Ajourné", "la mention");
var codeK = sortie.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var luK = k.lire("lireCodeExamen(" + JSON.stringify(codeK) + ")");
verifier(luK && luK.valide && luK.note === 0.75 && luK.base === 1 && luK.malusIndices === 0.25 && luK.fin === "K" && luK.indices[1], "le code kamikaze : " + JSON.stringify(luK));
contient(k.taper("verifier " + codeK), "kamikaze", "verifier lit la fin kamikaze");
contient(k.taper("verifier " + codeK), "tajine de Timour", "verifier signale le tajine");
contient(k.taper("chmod +x ~/rapport"), "", "");
verifier(k.lire("pointsExamen()") === 2, "plus rien ne compte après la copie rendue");
var faux = codeK.replace(/^(.)/, function(c){ return c === "R" ? "S" : "R"; });
contient(k.taper("verifier " + faux), "", "");

console.log("Épreuve finale : " + ok + " vérifications réussies, " + ko + " échecs.");
process.exit(ko ? 1 : 0);
