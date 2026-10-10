/**
 * Test de bout en bout : joue une partie complète, du premier ls au Paradis,
 * sans navigateur. À lancer avec :   node tests/parcours.js
 *
 * Ajouter -v pour voir tout ce que le jeu affiche.
 */
var nouveauMonde = require("./monde.js").nouveauMonde;

var echecs = 0, verifications = 0;
function verifier(condition, message){
	verifications++;
	if (!condition){
		echecs++;
		console.log("ÉCHEC : " + message);
	}
}
function contient(texte, morceau, message){
	verifier(texte.indexOf(morceau) > -1, (message || "") + " : « " + morceau + " » attendu, reçu :\n" + texte + "\n");
}

var stockage = {};
var jeu = nouveauMonde(stockage);
var t = jeu.taper;
var s;

// --- Maison ---
s = t("ls");
contient(s, "ForetOuest/", "ls à la Maison");
contient(s, "Cybersup/", "ls à la Maison");
verifier(s.indexOf(".ChaussetteGauche") === -1, "la chaussette doit rester cachée sans -a");
contient(t("ls -a"), ".ChaussetteGauche", "ls -a montre les objets cachés");
contient(t("pwd"), "~", "pwd");
contient(t("mv LettreDeBienvenue x"), "ne connais pas encore", "mv n'est pas connu au départ");
contient(t("sl"), "Voulais-tu dire « ls »", "suggestion de faute de frappe");
contient(t("vim"), "existe bel et bien sous Linux", "commande réelle absente");
contient(t("less lettredebienvenue"), "majuscules et minuscules", "indice sur la casse");
contient(t("cd /"), "partent de ta Maison", "pas de chemin absolu");
contient(t("less .ChaussetteGauche"), "chaussette gauche", "lecture de la chaussette");
verifier(jeu.lire("state.quests.s_chaussette") === true, "quête secrète de la chaussette");

// --- Académie ---
contient(t("cd ForetOuest/AcademieDesSorts"), "AcademieDesSorts", "cd avec un chemin");
contient(t("less EleveEnRetard"), "Scriptorium", "l'élève");
contient(t("cd Cours"), "Cours", "cd Cours");
contient(t("less Professeur"), "Nouveau sort appris : mv", "le professeur enseigne mv");
verifier(jeu.lire("state.quests.m_mv") === true, "quête m_mv");
t("cd ../SalleEntrainement");
contient(t("cd Boite"), "trop petite", "la Boite ne se traverse pas");
t("less Consignes");
contient(t("mv Mannequin* Boite"), "Mannequin5", "mv avec joker");
contient(t("ls Boite"), "Mannequin3", "ls d'un lieu fermé");
verifier(jeu.lire("state.quests.s_mannequins") === true, "quête des mannequins");
t("cd ../Scriptorium");
contient(t("cat GrandParchemin"), "ne connais pas encore", "cat pas encore appris");
contient(t("less Copiste"), "Nouveau sort appris : tail", "le copiste enseigne");
s = t("less GrandParchemin");
contient(s, "Fin de la première page", "less coupe les longs textes");
contient(t("wc -l GrandParchemin"), "120 GrandParchemin", "wc -l");
contient(t("head -n 2 GrandParchemin"), "cent dix-huit règles", "head -n");
contient(t("tail -n 1 GrandParchemin"), "Règle 118", "tail -n");
verifier(jeu.lire("state.quests.s_parchemin") === true, "quête du parchemin");
contient(t("cat GrandParchemin | wc -l"), "120", "cat | wc -l");
contient(t("cat GrandParchemin | grep poney"), "ne connais pas encore", "grep pas encore appris");

// --- Montagnes et grotte ---
contient(t("cd"), "Maison", "cd sans argument");
contient(t("cd -"), "Scriptorium", "cd -");
t("cd ~/PrairieNord");
contient(t("less Poney"), "l'est", "le poney");
t("cd MontagnesEst");
contient(t("less VieilHomme"), "stylo rouge", "le vieil homme");
contient(t("less VieuxManuscrits"), "Nouveau sort appris : history", "les manuscrits");
contient(t("man mv"), "MoVe", "man mv");
contient(t("man grep"), "Chaque chose en son temps", "man d'un sort inconnu");
contient(t("help"), "mv", "help");
contient(t("cd Grotte/CouloirSombre/SalleHumide"), "SalleHumide", "cd profond");
verifier(t("ls -a").indexOf(".Tunnel") === -1, "le tunnel n'existe pas avant le rocher");
contient(t("rm Rocher"), "ne connais pas encore", "rm inconnu");
contient(t("mv Rocher PetitTrou"), "courant d'air", "le rocher roule");
verifier(t("ls").indexOf("Tunnel") === -1, "le tunnel est caché");
contient(t("ls -a"), ".Tunnel/", "ls -a montre le tunnel");
contient(t("cd .Tunnel"), "Quête accomplie : Trouver le passage caché", "entrée dans le tunnel");
t("less Rat");
t("cd ChambreDePierre");
contient(t("cd Portail"), "Permission non accordée", "le portail est fermé");
contient(t("ls -l"), "drw-r--r--", "ls -l montre les droits du portail");
contient(t("chmod +x Portail"), "ne connais pas encore", "chmod inconnu");
contient(t("less Stele"), "Nouveau sort appris : chmod", "la stèle enseigne chmod");
contient(t("tail -n 2 Stele"), "chmod +x Portail", "la formule est en bas");
contient(t("chmod +x Portail"), "sceau du Portail se brise", "chmod ouvre le portail");
contient(t("ls -l"), "drwxr-xr-x", "droits après chmod");
contient(t("cd Portail/PlaceDuVillage"), "Quête accomplie : Ouvrir le Portail", "arrivée au village");

// --- Sauvegarde et rechargement ---
var jeu2 = nouveauMonde(stockage);
verifier(jeu2.lire("partieRestauree") === true, "la sauvegarde se recharge");
verifier(jeu2.lire("current_room.room_name") === "PlaceDuVillage", "on reprend au bon endroit");
verifier(jeu2.lire("state.knows('chmod')") === true, "les sorts sont restaurés");
verifier(jeu2.lire("Box.items.length") === 5, "les mannequins sont toujours dans la boîte");
verifier(jeu2.lire("DankRoom.getChildFromName('.Tunnel') !== -1"), "le tunnel est toujours relié");
contient(jeu2.taper("pwd"), "~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage", "pwd après rechargement");
jeu = jeu2; t = jeu.taper;

// --- Village ---
s = t("ls");
contient(s, "Taverne/", "la taverne");
t("less Villageois"); t("less LecteurDeJournal"); t("less DameEploree");
t("cd Marche");
contient(t("less SortRm"), "Nouveau sort appris : rm", "rm");
contient(t("less SortMkdir"), "Quête accomplie : Apprendre les sorts du Marché", "mkdir");
contient(t("rm Marchand"), "ne marche pas sur tout", "on ne supprime pas le marchand");
t("cd ../Bibliotheque");
contient(t("grep sudo GrimoireTropCool"), "ne connais pas encore", "grep inconnu");
contient(t("less LevierDiscret"), "arrière-salle", "le levier");
contient(t("ls"), "ArriereSalle/", "l'arrière-salle apparaît");
t("cd ArriereSalle");
contient(t("less Bibliothecaire"), "Nouveau sort appris : grep", "grep");
contient(t("grep chien LivreExercice"), "Sait chasser sans son chien", "grep d'exercice");
contient(t("grep -n -i SIX LivreExercice"), "1:Six sorciers", "grep -n -i");
contient(t("grep -c Six LivreExercice"), "2", "grep -c");
s = t("grep SorcierNoir ../HistoireDeTerminus");
contient(s, "phylactère", "l'enquête");
verifier(jeu.lire("state.quests.s_enquete") === true, "quête de l'enquête");
contient(t("grep -r SorcierNoir .."), "HistoireDeTerminus:", "grep -r");

t("cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/Taverne");
contient(t("echo test"), "ne connais pas encore", "echo inconnu");
contient(t("less Barde"), "Nouveau sort appris : echo", "echo");
contient(t("echo Bonjour  Terminus"), "Bonjour Terminus", "echo");
contient(t("echo Ada > LivreDOr"), "ÉCRASÉ", "un chevron écrase");
contient(t("cat LivreDOr"), "Elwyn", "le livre d'or est restauré");
contient(t("echo Ada Lovelace >> LivreDOr"), "Ta signature rejoint", "deux chevrons ajoutent");
contient(t("tail -n 1 LivreDOr"), "Ada Lovelace", "la signature est à la fin");
verifier(jeu.lire("state.nom") === "Ada Lovelace", "le nom est retenu");
contient(t("echo secret > Barde"), "Permission non accordée", "on n'écrit pas dans un personnage");
contient(t("less Tavernier"), "Nouveau sort appris : uniq", "sort et uniq");
s = t("sort Registre | uniq -c | sort -n");
contient(s, "14 Bertille", "le tuyau trie et compte");
contient(t("cat Registre | wc -l"), "55", "wc -l dans un tuyau");
contient(t("sort Registre | uniq -c | sort -n | tail -n 1"), "Bertille", "tuyau à quatre étages");
contient(t("echo Grognar"), "Recompte", "mauvaise réponse");
contient(t("echo Bertille"), "vrai nom à voix haute", "bonne réponse");
contient(t("echo notes > MonCarnet; cat MonCarnet"), "notes", "créer un objet par redirection");
contient(t("ls -l MonCarnet"), "apprenti", "l'objet créé appartient au joueur");
contient(t("mv MonCarnet Carnet && ls"), "Carnet", "renommer");
contient(t("rm Carnet"), "disparaît", "supprimer ce qui nous appartient");
contient(t("rm Registre"), "Opération non permise", "ne pas supprimer ce qui ne nous appartient pas");

t("cd ../Atelier");
contient(t("less Artisane"), "Nouveau sort appris : touch", "touch");
contient(t("touch rouage"), "avec la majuscule", "indice sur la casse du Rouage");
contient(t("mv rouage Rouage"), "autre chose à te demander", "renommer en Rouage déclenche la suite");
contient(t("less Artisane"), "Nouveau sort appris : cp", "cp");
t("cp Rouage rouage1"); t("cp Rouage rouage2"); t("cp Rouage rouage3"); t("cp Rouage rouage4");
contient(t("cp Rouage rouage5"), "Fabriquer les rouages", "les cinq rouages");
contient(t("mv DragonMecanique .."), "ce n'est pas à toi", "on ne vole pas le dragon");
contient(t("cp Artisane Artisane2"), "duplique pas les gens", "on ne copie pas les gens");

t("cd ../SentierRocailleux");
contient(t("rm GrosRocher"), "pop", "rm GrosRocher");
contient(t("cd Ferme"), "Ferme", "la ferme est reliée");
t("less Fermier");
contient(t("rm EpiDeMais"), "seule nourriture", "on ne détruit pas le maïs");
contient(t("cp EpiDeMais AutreEpiDeMais"), "Sauver la récolte", "le maïs est copié");

t("cd ../../PontBrise");
contient(t("cd Clairiere"), "Planche manquante", "le pont est cassé");
contient(t("touch Planche"), "Quête accomplie : Réparer le PontBrise", "la planche");
t("cd Clairiere");
t("less HommeEnPleurs");
contient(t("mkdir Chaumiere"), "Rebâtir une Chaumiere", "la chaumière");
contient(t("cd Chaumiere"), "bâtie", "entrer dans la chaumière");
contient(t("rmdir ../Chaumiere"), "scier la branche", "on ne supprime pas le lieu où l'on est");
t("cd ../SentierSinistre");
contient(t("mv Ronces .."), "Aïe", "les ronces piquent");
contient(t("rm Ronces"), "Quête accomplie : Dégager le SentierSinistre", "rm Ronces");
t("cd CaverneDesTrolls");
contient(t("cd Toboggan"), "TrollMoche", "le toboggan est gardé");
contient(t("ls Toboggan/FichiersDuNoyau"), "TrollMoche", "on ne regarde pas au-delà du toboggan gardé");
contient(t("cd Cage/.."), "barreaux", "on ne traverse pas la cage avec cd");
t("less TrollPlusMoche");
contient(t("rm TrollAbsolumentHideux"), "sudo", "le troll hideux résiste");
contient(t("cp TrollMoche ../TrollDeSecours"), "multiplient", "copier un troll ailleurs");
contient(t("ls .."), "TrollDeSecours", "la copie est sur le sentier");
contient(t("mv Cage/EnfantKidnappe ."), "Je suis une fille", "libérer l'enfant sans entrer dans la cage");
verifier(jeu.lire("state.quests.s_enfant") === true, "quête de l'enfant");
contient(t("mv TrollMoche .."), "Quête accomplie : Passer le TrollMoche", "déplacer le troll");
contient(t("cd Toboggan/FichiersDuNoyau"), "FichiersDuNoyau", "descendre le toboggan");
contient(t("less Certificat"), "Permission non accordée", "le certificat est protégé");
contient(t("ls -l"), "-r--------  root", "ls -l montre le propriétaire du certificat");
contient(t("sudo less Certificat"), "ne connais pas encore", "sudo inconnu");
contient(t("less Instructions"), "Nouveau sort appris : sudo", "sudo");
t("cd ArchivesDuNoyau");
s = t("grep motdepasse= *");
contient(s, "motdepasse=P1ngouin", "le mot de passe est trouvé");
contient(s, "chronique_T.log:", "grep indique le fichier");
verifier(jeu.lire("state.quests.m_mdp") === true, "quête du mot de passe");
contient(t("grep -r -c motdepasse ."), "chronique_T.log:1", "grep -r -c");
t("cd ..");
contient(t("sudo less Certificat", "mauvais"), "Désolé, essaie encore", "mauvais mot de passe");
contient(t("sudo less Certificat", "P1ngouin"), "La Citadelle t'est ouverte", "le certificat est lu");
contient(t("whoami"), "ne connais pas encore", "whoami inconnu sans Cybersup");
contient(t("sudo cd Citadelle"), "commande introuvable", "sudo cd n'existe pas");
contient(t("sudo rm CaverneDesTrolls"), "aucun lieu ni objet", "chemin relatif");
contient(t("sudo rm ../../TrollAbsolumentHideux"), "n'existe plus", "sudo rm du troll hideux");
verifier(jeu.lire("state.quests.s_hideux") === true, "quête du troll hideux");

// --- Citadelle, première visite : il manque ps et kill ---
contient(t("cd Citadelle"), "Sorcier Noir", "la citadelle");
contient(t("less SorcierNoir"), "Trois démons", "le sorcier parle");
contient(t("ps"), "ne connais pas encore", "ps inconnu");
contient(t("echo Laurent"), "bouclier", "le bouclier protège le sorcier");

// --- Cybersup ---
contient(t("cd ~/Cybersup"), "Cybersup", "arrivée à Cybersup");
t("less LettreAdmission");
contient(t("less Pancarte"), "Directeur Pédagogique", "la pancarte");
contient(t("cd BureauDeLaurent"), "Permission non accordée", "le bureau est fermé");
contient(t("ls -l"), "drwx------  laurent", "ls -l montre le bureau");
contient(t("chmod +x BureauDeLaurent"), "Opération non permise", "seul le propriétaire change les droits");
contient(t("sudo ls BureauDeLaurent"), "Agenda", "sudo permet de regarder sans entrer");
contient(t("sudo cat BureauDeLaurent/Agenda"), "Sorcier Noir", "l'agenda vend la mèche");
t("cd SalleDeCours");
contient(t("less Formateur"), "Nouveau sort appris : kill", "ps et kill");
s = t("ps");
contient(s, "sortilege_infini", "ps liste les processus");
contient(t("ps | grep golem"), "4243", "ps | grep");
contient(t("kill 1"), "init", "on ne tue pas init");
contient(t("kill 4242"), "s'arrête net", "kill");
contient(t("kill 4243"), "moins poli", "kill ignoré");
contient(t("kill -9 4243"), "Arrêter les processus fous", "kill -9");
contient(t("whoami"), "apprenti", "whoami");
contient(t("sudo whoami"), "root", "sudo whoami");
contient(t("less EtudianteCurieuse"), "Nouveau sort appris : find", "find");
t("cd ../SalleServeurs");
s = t("find . -name \"flag*\"");
contient(s, "./Baie2/.sauvegardes/flag.txt", "find trouve le drapeau");
contient(t("find . -type d"), "./Baie3", "find -type d");
contient(t("cat Baie2/.sauvegardes/flag.txt"), "Nouveau sort appris : tree", "le drapeau");
verifier(jeu.lire("state.quests.s_ctf") === true, "quête du drapeau");
contient(t("tree -a"), "└── ", "tree");
contient(t("history | tail -n 3"), "tree -a", "history dans un tuyau");

// --- Citadelle, le combat ---
t("cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/PontBrise/Clairiere/SentierSinistre/CaverneDesTrolls/Toboggan/FichiersDuNoyau/Citadelle");
verifier(jeu.lire("current_room.room_name") === "Citadelle", "retour à la citadelle par un long chemin");
s = t("ps");
contient(s, "demon_bouclier", "ps dans la citadelle");
contient(t("kill 66"), "Opération non permise", "les démons ne sont pas à nous");
contient(t("sudo kill 66"), "vole en éclats", "sudo kill");
contient(t("sudo kill 404"), "l'ignore en ricanant", "l'illusion ignore TERM");
contient(t("sudo kill -9 404 666"), "Abattre les trois démons", "les démons tombent");
contient(t("less SorcierNoir"), "phylactère", "le sorcier parle du phylactère");
contient(t("echo Laurent"), "Il faut l'avoir LU", "un nom deviné ne suffit pas");
contient(t("ls -la"), ".Phylactere", "ls -la montre le phylactère");
contient(t("cat .Phylactere"), "Permission non accordée", "le phylactère est protégé");
contient(t("sudo less .Phylactere"), "Fin de la première page", "trop long pour less");
s = t("sudo cat .Phylactere | grep nom");
contient(s, "vrai_nom=Laurent", "le vrai nom");
contient(s, "nom_de_scene", "grep nom ramène aussi d'autres lignes");
verifier(jeu.lire("state.quests.m_nom") === true, "quête du nom");
contient(t("echo Gandalf"), "ce n'est pas son nom", "mauvais nom");
s = t("echo Laurent");
contient(s, "Tu connais cette barbe", "la révélation");
contient(s, "Quête accomplie : Vaincre le Sorcier Noir", "la victoire");
contient(t("ls"), "Laurent", "Laurent a remplacé le sorcier");
contient(t("less Laurent"), "Directeur Pédagogique de Cybersup", "Laurent s'explique");
s = t("cat Diplome");
contient(s, "Ada Lovelace", "le diplôme porte le nom signé");
contient(s, "Sorts maîtrisés     : 30 sur 30", "tous les sorts");
contient(s, "Félicitations du jury", "toutes les quêtes secondaires");
contient(t("rm Laurent"), "directeur pédagogique", "on ne supprime pas Laurent");
contient(t("cd Paradis"), "FIN", "le paradis");
contient(t("ls"), "rien d'intéressant", "ls au paradis");
contient(t("cd ~/Cybersup/BureauDeLaurent"), "fausse barbe", "le bureau est ouvert");
contient(t("cat Credits"), "Michele Pratusevich", "les crédits");
contient(t("cd ~/PrairieNord/MontagnesEst && ls"), "MotSurLeRocher", "le vieil homme est parti");
s = t("quetes");
contient(s, "13 accomplies sur 13", "journal complet");
verifier(s.indexOf("[ ]") === -1, "plus aucune quête ouverte");

// --- La partie terminée se recharge aussi ---
var jeu3 = nouveauMonde(stockage);
verifier(jeu3.lire("partieRestauree") === true, "rechargement en fin de partie");
contient(jeu3.taper("cat ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/PontBrise/Clairiere/SentierSinistre/CaverneDesTrolls/Toboggan/FichiersDuNoyau/Citadelle/Diplome"), "Ada Lovelace", "le diplôme après rechargement");
verifier(jeu3.lire("Citadelle.procs.length") === 0, "les démons restent morts");
verifier(jeu3.lire("Clearing.getChildFromName('Chaumiere') !== -1"), "la chaumière est toujours là");

console.log(verifications + " vérifications, " + echecs + " échec" + (echecs > 1 ? "s" : ""));
process.exit(echecs ? 1 : 0);
