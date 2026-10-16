# Solution complète (à ne pas montrer aux joueurs)

Ce document déroule la partie dans un ordre direct, quêtes secondaires comprises. Chaque bloc peut être copié dans le jeu. Le test `tests/solution.js` rejoue exactement ces blocs et vérifie qu'ils mènent au bout.

Trois repères utiles en salle :

- un joueur bloqué tape `quetes` : le journal donne l'étape en cours et un indice ;
- un joueur qui veut savoir où il en est tape `xp` (niveau, note sur 20, ce qui reste à gagner) ou `bulletin` (relevé par blocs de compétences) ;
- un joueur perdu tape `cd` pour rentrer à la Maison, puis `cd -` pour revenir d'où il vient ;
- un joueur bloqué tape `indice` : deux paliers payants par étape (30 puis 60 XP retirés de la note, pas du niveau), et des remarques gratuites quand quelque chose coince (rouages creux, alias qui masque un sort, clé SSH grillée ou effacée).

Au premier lancement, le jeu affiche `terminus login:` : le prénom devient l'identifiant sur le système et le nom sur le diplôme, puis le joueur choisit un mot de passe qui lui permet de retrouver sa partie après un `logout`. Le jeu propose ensuite cinq enveloppes : la convocation à l'épreuve de première année (chapitre 1, la solution ci-dessous), le ticket d'incident du réseau (chapitre 2 directement, voir la partie 7), l'ordre de mission de la WarRoom (chapitre 3 directement, voir la partie 14), le pli de l'Académie (chapitre 4 directement, voir la partie 23) ou la lettre de l'Inspection (chapitre 5 directement, voir la partie 33).

Chaque partie est différente. Au premier lancement, le jeu tire une graine au hasard qui fixe le mot de passe sudo, le meilleur client de la taverne, l'adresse de l'attaquant, le nombre de sweats du BDE et les numéros de processus. Dans les blocs ci-dessous, ces valeurs sont écrites entre chevrons :

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<motdepasse>` | `grep motdepasse= *` dans les ArchivesDuNoyau |
| `<client>` | dernière ligne de `cut -d: -f1 Registre \| sort \| uniq -c \| sort -n` |
| `<adresse>` | dernière ligne du tuyau sur `auth.log` dans la WarRoom |
| `<sweats>` | `grep -c sweat Inventaire` au BDE |
| `<pid:nom>` | colonne PID de `ps`, sur la ligne du processus `nom` |
| `<pid-ecoute>` | chapitre 3 : `sudo ss -tlnp` dans la Racine, PID du processus qui écoute sur le port 6666 |
| `<poste>` | chapitre 3 : `who` sur le labo, adresse d'où vient la session du Corbeau |

Au chapitre 3, l'heure de la première connexion du Corbeau, la phrase de passe de ses notes et l'adresse de son poste changent aussi d'une partie à l'autre.

Recopier la solution du voisin ne marche donc pas : il faut refaire chaque recherche. Le diplôme final porte un code de vérification qui résume la partie (prénom, score, note, temps, indices utilisés). Le formateur le décode dans n'importe quelle partie avec `verifier CODE`, qui repère un code retouché. Ce code reste indicatif : le jeu tourne dans le navigateur et son code est public (l'épreuve finale, elle, a un sceau du formateur, voir à la fin).

## Sommaire

- [Le barème](#le-barème)
- [Le fil de l'histoire](#le-fil-de-lhistoire)
- [Chapitre 1 : Terminus](#chapitre-1--terminus-lépreuve-de-première-année)
  1. [La Maison et l'Académie](#1-la-maison-et-lacadémie)
  2. [La grotte et le Portail](#2-la-grotte-et-le-portail)
  3. [Le village](#3-le-village)
  4. [Du pont aux Fichiers du Noyau](#4-du-pont-aux-fichiers-du-noyau)
  5. [Cybersup](#5-cybersup)
  6. [Le combat final](#6-le-combat-final)
  - [Pour aller chercher 20 sur 20](#pour-aller-chercher-20-sur-20)
- [Chapitre 2 : la panne](#chapitre-2--la-panne-le-réseau-de-lécole)
  7. [Le modèle OSI, puis le lien, l'adresse et la route](#7-le-modèle-osi-puis-le-lien-ladresse-et-la-route)
  8. [Les noms](#8-les-noms)
  9. [Le DHCP du routeur, et une configuration qui tient](#9-le-dhcp-du-routeur-et-une-configuration-qui-tient)
  10. [L'intranet et l'horloge du poste](#10-lintranet-et-lhorloge-du-poste)
  11. [Les mails, Lille et le telnet](#11-les-mails-lille-et-le-telnet)
  12. [L'Annexe : le Wi-Fi de la cafétéria](#12-lannexe--le-wi-fi-de-la-cafétéria)
  13. [Le compte rendu](#13-le-compte-rendu)
- [Chapitre 3 : la Crypte](#chapitre-3--la-crypte-la-mission-cyber)
  14. [La Crypte](#14-la-crypte)
  15. [Les journaux de la Citadelle](#15-les-journaux-de-la-citadelle)
  16. [Le réseau de l'école et le labo de TP](#16-le-réseau-de-lécole-et-le-labo-de-tp)
  17. [Les leçons de vim](#17-les-leçons-de-vim)
  18. [Le site web, la messagerie, le DNS, le pare-feu](#18-le-site-web-la-messagerie-le-dns-le-pare-feu)
  19. [L'imprimante et la badgeuse](#19-limprimante-et-la-badgeuse)
  20. [Les comptes de la Citadelle](#20-les-comptes-de-la-citadelle)
  21. [Les preuves et les notes chiffrées](#21-les-preuves-et-les-notes-chiffrées)
  22. [Le Corbeau et le rapport d'incident](#22-le-corbeau-et-le-rapport-dincident)
- [Chapitre 4 : l'Académie des Arcanes](#chapitre-4--lacadémie-des-arcanes-niveau-avancé)
  23. [L'Académie, les maîtres et l'avis de la Nuée](#23-lacadémie-les-maîtres-et-lavis-de-la-nuée)
  24. [Chronomancie d'abord : la bombe, avant 23 h](#24-chronomancie-dabord--la-bombe-avant-23-h)
  25. [Runes : les traces et les indicateurs](#25-runes--les-traces-et-les-indicateurs)
  26. [Divination : le poids de la fuite et les machines les plus bavardes](#26-divination--le-poids-de-la-fuite-et-les-machines-les-plus-bavardes)
  27. [Transmutation : minimiser pour la CNIL, désarmer la configuration](#27-transmutation--minimiser-pour-la-cnil-désarmer-la-configuration)
  28. [Grimoires : les machines critiques et le rapport de quart](#28-grimoires--les-machines-critiques-et-le-rapport-de-quart)
  29. [Alchimie : comptes fantômes et quarantaine](#29-alchimie--comptes-fantômes-et-quarantaine)
  30. [Archives : restaurer et appliquer le correctif](#30-archives--restaurer-et-appliquer-le-correctif)
  31. [Invocation : le script de nettoyage](#31-invocation--le-script-de-nettoyage)
  32. [Le dernier Corbeau, et le retour d'expérience](#32-le-dernier-corbeau-et-le-retour-dexpérience)
- [Chapitre 5 : le Bastion](#chapitre-5--le-bastion-durcissement-linux)
  33. [Le Bastion, les maîtres et la Pierre](#33-le-bastion-les-maîtres-et-la-pierre)
  34. [La Herse des Comptes (Fernando)](#34-la-herse-des-comptes-fernando)
  35. [Le Sceau du Roi (Butler)](#35-le-sceau-du-roi-butler)
  36. [Le Pont-levis (Tatu)](#36-le-pont-levis-tatu)
  37. [Les Portes condamnées (Jean)](#37-les-portes-condamnées-jean)
  38. [Les Remparts (Vint)](#38-les-remparts-vint)
  39. [La Salle des Coffres (Evelyn)](#39-la-salle-des-coffres-evelyn)
  40. [Le Cœur (Edsger)](#40-le-cœur-edsger)
  41. [La Poterne (Joan)](#41-la-poterne-joan)
  42. [La Bannière (Robert)](#42-la-bannière-robert)
  43. [La Tour de Guet (Katherine)](#43-la-tour-de-guet-katherine)
  44. [Les Sceaux d'intégrité (Ralph)](#44-les-sceaux-dintégrité-ralph)
  45. [La Garde (Adele)](#45-la-garde-adele)
  46. [Les défis des maîtres, tour par tour](#46-les-défis-des-maîtres-tour-par-tour)
  47. [L'aube](#47-laube)
  48. [Le rapport d'inspection](#48-le-rapport-dinspection)
- [L'épreuve finale : la Forteresse](#lépreuve-finale--la-forteresse-mission-spéciale)

## Le barème

| Action | XP |
| --- | --- |
| Étape de la quête principale (13) | 100 chacune, 300 pour la victoire finale |
| Quête secondaire (29, dont 2 secrètes) | 50 |
| Sort appris (43 : 52 sorts, dont 9 connus au départ, `cat` compris) | 10 |
| Première utilisation d'un sort (52) | 5 |
| Lieu découvert (44) | 5 |

Le total possible est de 3860 XP au chapitre 1. Les autres chapitres ont chacun leur barème, sur le même principe, et leur note sur 20 à part : 5790 XP pour la panne (22 étapes, 50 quêtes secondaires, 50 sorts, 28 lieux), 5625 XP pour la Crypte (22 étapes, 45 quêtes secondaires dont 14 autour de vim, 49 sorts, 48 lieux), 5175 XP pour le chapitre 4, l'Académie des Arcanes (20 étapes, 50 défis des maîtres, 23 sorts avancés, 26 lieux), noté sur le CertificatAvance, et 7500 XP pour le chapitre 5, le Bastion (29 étapes dont le rapport final à 300 XP, 74 défis, 42 sorts de durcissement, 14 lieux), noté sur le CertificatBastion. La note sur 20 est proportionnelle à l'XP, au demi-point près. Elle s'affiche en permanence au-dessus de l'image, et figure sur le diplôme final avec la mention.

Ordres de grandeur : un parcours réduit au strict nécessaire (une quarantaine de commandes, impossible sans connaître la solution) donne 10 sur 20. La solution ci-dessous, dernier chapitre compris, donne 20 sur 20. Les derniers points se gagnent en visitant chaque lieu et en lançant chaque sort au moins une fois : `xp` liste ceux qui n'ont jamais servi.

Dix niveaux calqués sur le cursus : Candidat, Admis, B1, B2, B3, M1, M2, Alternant confirmé, Diplômé, Root.

Le bulletin regroupe les 52 sorts en six blocs de compétences, notés chacun sur 20 :

| Bloc | Contenu |
| --- | --- |
| BC 01 | Se repérer et se documenter |
| BC 02 | Manipuler lieux et objets |
| BC 03 | Lire et filtrer des textes |
| BC 04 | Droits, utilisateurs et sécurité |
| BC 05 | Processus et automatisation |
| BC 06 | Système et réseau |

Un bloc est « acquis » quand chacun de ses sorts a été appris puis lancé au moins une fois. Le relevé figure sur le diplôme.

## Le fil de l'histoire

Le joueur est un nouvel étudiant de B1, le jour de la rentrée. Sa Convocation annonce une épreuve pratique dont le lieu et le surveillant seront « communiqués en temps voulu ». À l'école, la WarRoom est en crise : un intrus, le Sorcier Noir, a pris le contrôle de Terminus, le monde d'entraînement de l'école, et a verrouillé les comptes de tout le monde sauf celui du nouveau. Laurent est introuvable.

Le joueur traverse donc Terminus (la même histoire que le jeu d'origine), pendant que l'EcranMural de la WarRoom suit sa progression. À la fin, le Sorcier Noir se révèle être Laurent : Terminus était l'épreuve pratique, la crise de la WarRoom était l'examen des M2, et les habitants de Terminus sont d'anciens élèves et des intervenants qui reprennent leur vraie identité quand on retourne leur parler.

Le P.S. de Laurent ouvre ensuite le chapitre 2 : pendant l'épreuve, le réseau de l'école est tombé, et Radia attend la recrue au bâtiment B pour le réparer couche par couche. Quand tout remarche, Radia transmet un message de Grace : du trafic bizarre passe sous la Citadelle. C'est le chapitre 3, la Crypte : un vrai intrus, le Corbeau, est entré pendant l'examen.

Quelques semaines après la Crypte, le chapitre 4 (l'Académie des Arcanes) s'ouvre : les notes volées de Frances ont fuité, et un groupe de rançonneurs, la Nuée, a repris le nom du Corbeau pour frapper le serveur d'archives de l'école. En une nuit, la recrue mesure la fuite, minimise les données à notifier, éradique les comptes et fichiers de la Nuée, désamorce une bombe programmée pour minuit, restaure les archives et rédige le retour d'expérience. Le message final : à Terminus on tapait des commandes, ici on les fait travailler pour soi (le dernier « Corbeau » est un script, battu par le script de la recrue). Ce qui est « malveillant » reste narratif et inerte, comme au chapitre 3.

Le chapitre 5 (le Bastion) s'ouvre ensuite : la Nuée a juré de revenir, et un serveur neuf, installé « par défaut », doit passer l'inspection de l'aube. En une nuit, la recrue mesure (la Pierre d'Inspection), ferme douze tours (comptes, sudo, SSH, services, pare-feu, droits, noyau, démarrage, Apache et TLS, audit et journaux, intégrité, fail2ban et AppArmor), relit l'aube, puis rend un rapport d'inspection honnête, avec ce qui reste. Frances éprouve chaque mur, sans rien casser. Tout est défensif : la Nuée reste narrative et inerte.

Hormis Laurent, tous les personnages sont inventés. Ils portent des prénoms de pionniers de l'informatique (Ada, Grace, Hedy, Dennis, Linus, Margaret, Radia, Vint, Evi, Ken, Barbara, Tim, Annie, Alan ; au Bastion, Fernando, Butler, Tatu, Jean, Evelyn, Edsger, Joan, Robert, Katherine, Ralph, Adele).

## Chapitre 1 : Terminus (l'épreuve de première année)

Le chapitre 1 se joue en choisissant la première enveloppe au démarrage. Il mène de la Maison jusqu'à la victoire sur le Sorcier Noir, en six étapes.

### 1. La Maison et l'Académie

Notions : `ls`, `cd`, `cat` et `less` (connus dès le départ), chemins, `--help`, `mv`, joker `*`, `head`, `tail`, `wc`, `diff`.

```
ls
less LettreDeBienvenue
less Convocation
ls -a
less .ChaussetteGauche
cd ForetOuest/AcademieDesSorts
less EleveEnRetard
cd Cours
less Professeur
cd ../SalleEntrainement
less Consignes
mv Mannequin* Boite
ls Boite
cd ../Scriptorium
less Copiste
wc -l GrandParchemin
head -n 2 GrandParchemin
tail -n 1 GrandParchemin
less ApprentiCopiste
diff CopieDuMatin CopieDuSoir
```

Le Professeur enseigne `mv`, indispensable pour la suite. Le Scriptorium est facultatif mais rend la stèle du Portail beaucoup plus simple. `diff` révèle que la copie du soir a été falsifiée (article 17 modifié, article 41 ajouté).

### 2. La grotte et le Portail

Notions : `man`, `help`, `history`, `!!`, fichiers cachés (`ls -a`), permissions (`ls -l`, `chmod`).

```
cd ~/PrairieNord/MontagnesEst
less VieilHomme
less VieuxManuscrits
cd Grotte/CouloirSombre/SalleHumide
mv Rocher PetitTrou
ls -a
cd .Tunnel/ChambreDePierre
ls -l
less Stele
tail -n 2 Stele
chmod +x Portail
cd Portail/PlaceDuVillage
```

Deux verrous ici. Le tunnel s'appelle `.Tunnel` : il n'apparaît qu'avec `ls -a`. Le Portail n'a pas le droit `x` : `cd` répond « Permission non accordée » jusqu'au `chmod`. La formule est à la dernière ligne de la stèle, que `less` ne montre pas (le texte fait 167 lignes).

### 3. Le village

Notions : `rm`, `mkdir`, `rmdir`, `alias`, variables (`export`, `env`, `$PWD`), liens symboliques (`ln -s`), `grep`, `echo`, `>`, `>>`, tuyau `|`, `cut`, `sort`, `uniq`, `touch`, `cp`, scripts (`bash`, `./`, `chmod +x`), `date`.

Le Marché et ses cinq parchemins :

```
cd Marche
less SortRm
less SortMkdir
less SortAlias
alias ll='ls -l'
ll
less SortExport
export CRI=Banzai
less SortLn
cd ..
ln -s $PWD ~/Village
```

Le raccourci `~/Village` permet ensuite de revenir sur la place depuis n'importe où avec `cd ~/Village`. Piège volontaire : `ln -s .. ~/Village` est refusé avec une explication, car une cible relative se lit à partir de l'emplacement du lien.

La Bibliothèque et son arrière-salle :

```
cd Bibliotheque
less LevierDiscret
ls -a
less .AnnalesDExamen
cd ArriereSalle
less Bibliothecaire
grep chien LivreExercice
grep SorcierNoir ../HistoireDeTerminus
```

La Taverne :

```
cd ~/Village/Taverne
less Barde
echo $USER lance $CRI
echo MonNom >> LivreDOr
less Tavernier
cut -d: -f1 Registre | sort | uniq -c | sort -n
echo <client>
```

Le diplôme porte le prénom saisi au démarrage ; le nom écrit dans le LivreDOr ne sert que si aucun prénom n'a été donné. Un joueur qui écrit `echo MonNom > LivreDOr` écrase le livre : le tavernier le rétablit en râlant, c'est voulu. Le Registre a trois colonnes séparées par des deux-points, d'où le `cut`. `<client>` est le nom qui arrive en dernier, avec le plus de passages.

L'Atelier et la Ferme :

```
cd ~/Village/Atelier
less Artisane
touch Rouage
less Artisane
cp Rouage rouage1
cp Rouage rouage2
cp Rouage rouage3
cp Rouage rouage4
cp Rouage rouage5
less Artisane
ls -l remonter.sh
chmod +x remonter.sh
./remonter.sh
less ApprentieHorlogere
cp -i BrouillonDePlan PlanDuDragon
less Horloges
date
cd ~/Village/SentierRocailleux
rm GrosRocher
cd Ferme
less Fermier
cp EpiDeMais AutreEpiDeMais
```

Le script `remonter.sh` n'a pas le droit `x` : `./remonter.sh` échoue tant que `chmod +x` n'est pas passé. `bash remonter.sh` fonctionne sans ce droit, mais la quête demande le lancement direct. Les rouages et l'épi doivent être de vraies copies : un `touch rouage1` est refusé par l'Artisane.

L'ApprentieHorlogere tend un piège volontaire : elle demande `cp BrouillonDePlan PlanDuDragon`, alors que PlanDuDragon existe déjà. Comme sous Linux, `cp` écrase sans prévenir, et l'Artisane réagit. Il faut remettre la sauvegarde cachée (`cp .PlanDuDragon.bak PlanDuDragon`), puis refaire la copie avec `cp -i` et répondre non. Un joueur qui utilise `cp -i` d'emblée (ou qui regarde avec `ls` avant) gagne la quête sans rien casser. `mv` écrase de la même façon, et `mv -i` demande aussi.

### 4. Du pont aux Fichiers du Noyau

Notions : chemins vers un autre lieu (`..`, `.`, `Cage/...`), `grep` sur plusieurs fichiers, `sudo`.

```
cd ~/Village/PontBrise
touch Planche
cd Clairiere
less HommeEnPleurs
mkdir Chaumiere
cd SentierSinistre
rm Ronces
cd CaverneDesTrolls
less TrollPlusMoche
mv Cage/EnfantKidnappe .
mv TrollMoche ..
cd Toboggan/FichiersDuNoyau
less Instructions
cd ArchivesDuNoyau
grep motdepasse= *
cd ..
sudo less Certificat
sudo rm ../../TrollAbsolumentHideux
cd Citadelle
less SorcierNoir
```

Le mot de passe sudo `<motdepasse>` est celui que `grep motdepasse= *` a trouvé dans les ArchivesDuNoyau. Il est demandé une seule fois, en saisie masquée. La dernière commande fait un premier passage dans la Citadelle : c'est ce qui permettra d'y revenir par `ssh`.

### 5. Cybersup

Notions : `id`, `passwd`, `chown`, `ps`, `top`, `kill`, `kill -9`, `whoami`, `apt`, `find`, `tree`, `df`, `du`, `tar`, `crontab`, `hostname`, `ping`, `ssh`, `exit`, et une enquête dans des journaux de connexion.

Accessible depuis la Maison à tout moment. `ps`, `kill` et `crontab` sont nécessaires pour le combat final.

L'accueil, la war room et le BDE :

```
cd ~/Cybersup
less Accueil
echo MonNom >> FeuilleEmargement
cat CarteEtudiante
less PlanDuCampus
less TableauAffichage
cd WarRoom
less CheffeDeQuart
cat EcranMural
less Voyants
less MainCourante
grep ECHEC auth.log | cut -d" " -f4 | sort | uniq -c | sort -n
echo <adresse>
cd ../BDE
less PresidenteDuBDE
grep -c sweat Inventaire
echo <sweats>
mv Autocollant ~
```

L'enquête de la WarRoom est le travail de base d'un analyste : dans `auth.log` (heure, résultat, compte visé, adresse), isoler les échecs, garder la colonne des adresses, compter. L'adresse trouvée (`<adresse>`, la dernière ligne du tuyau) est celle de la machine `citadelle`, et la dernière ligne du journal montre que l'intrus est entré avec le compte de Laurent. L'EcranMural, les Voyants et la CarteEtudiante changent au fil de la partie.

Les salles techniques :

```
cd ~/Cybersup
less RSSI
id
passwd
cd SalleDeCours
less Formateur
ps
top
kill <pid:sortilege_infini>
kill -9 <pid:golem_tetu>
whoami
less Affiche
sudo apt install cowsay
cowsay Bonjour
less EtudianteCurieuse
cd ../SalleServeurs
find . -name "flag*"
cat Baie2/.sauvegardes/flag.txt
less Administratrice
df -h
du -s Baie1
tar -tf Baie2/.sauvegardes/sauvegarde-lundi.tar
tar -xf Baie2/.sauvegardes/sauvegarde-lundi.tar
cat rapport-incident.txt
cd ../SalleReseau
less AdminReseau
less TableauBlanc
cat hotes.txt
ping lille
ping 10.0.59.1
ssh lille
less EtudiantDeLille
exit
ssh marseille
less EtudianteDeMarseille
exit
```

Le TableauBlanc de Vint pose les cinq idées de base du réseau pour qui n'en a jamais fait : l'adresse IP, le nom, le réseau et la passerelle, ping, le port. Appeler Lille par son adresse (`ping 10.0.59.1`) plutôt que par son nom est une quête secondaire. Ces notions sont reprises et approfondies au chapitre 2.

Les campus de Lille et de Marseille n'ont pas de porte : `cd CampusLille` est refusé, on n'y entre que par `ssh`, et `exit` ramène au point de départ. Les deux étudiants donnent chacun un indice pour le combat final.

`passwd` refuse les mots de passe de moins de 12 caractères, sans majuscule, sans minuscule ou sans chiffre, et ceux qui contiennent un mot trop courant. Rien n'est enregistré. `apt install` exige `sudo`, obtenu au chapitre 4. Le rapport d'incident extrait de l'archive explique la mécanique du bouclier du Sorcier.

Le BureauDeLaurent est fermé (`drwx------ laurent`). `chmod` y est refusé, puisque le joueur n'en est pas propriétaire, et `sudo cd` n'existe pas. Mais `sudo ls BureauDeLaurent` et `sudo cat BureauDeLaurent/Agenda` fonctionnent, et l'agenda vend la mèche avant l'heure. `sudo chown $USER BureauDeLaurent` suivi d'un `chmod` ouvre aussi la porte.

### 6. Le combat final

Notions réutilisées : `ssh`, `ps`, `sudo kill`, `kill -9`, `crontab`, `ls -a`, permissions, tuyau, `grep`, `echo`.

```
ssh citadelle
ps
sudo kill <pid:demon_bouclier>
sudo crontab -u sorcier -l
sudo crontab -u sorcier -r
sudo kill <pid:demon_bouclier>
sudo kill -9 <pid:demon_illusion>
sudo kill <pid:demon_corruption>
less SorcierNoir
ls -a
sudo cat .Phylactere | grep vrai_nom
echo Laurent
less Laurent
cat Diplome
cd Paradis
```

Quatre étapes :

1. Les trois démons sont les processus d'un autre utilisateur : il faut `sudo`. L'un d'eux ignore le signal TERM : il faut `-9`.
2. Le bouclier renaît sous un nouveau PID tant que la crontab du Sorcier le relance. Il faut la lire, la retirer, puis tuer le bouclier une dernière fois.
3. Le vrai nom est dans un fichier caché, illisible sans root, et trop long pour `less`.
4. Le nom se prononce avec `echo`. Un nom deviné sans avoir lu le phylactère est refusé.

Après la victoire, le BureauDeLaurent s'ouvre (`MotDeLaurent`, `Credits`), le vieil homme a quitté sa montagne, les voyants de la WarRoom passent au vert, le TableauAffichage annonce le résultat, et les habitants de Terminus se présentent sous leur vrai jour quand on retourne leur parler. Le diplôme affiche le score final, la note sur 20, la mention et le relevé de compétences. Le diplôme se met à jour si le joueur continue à gagner de l'XP.

### Pour aller chercher 20 sur 20

Il reste à visiter les derniers lieux et à lancer au moins une fois les sorts qui n'ont pas encore servi. `xp` les liste.

```
cd ~/Cybersup/BureauDeLaurent
cat MotDeLaurent
less ~/Village/Taverne/Tavernier
cd ~/Cybersup/SalleServeurs/Baie1
cd ../Baie2/.sauvegardes
cd ../../Baie3
cat .bash_history
cd ~/PrairieNord/MontagnesEst/Grotte/Escalier
ls -a
pwd
help
man ls
history
env
hostname
tree
mkdir Essai
rmdir Essai
unalias ll
sudo chown $USER Panneau
clear
xp
bulletin
```

À ce stade le compteur affiche 3860 XP sur 3860, niveau 10 (Root), 20 sur 20, félicitations du jury, et les six blocs du bulletin sont acquis.

## Chapitre 2 : la panne (le réseau de l'école)

Notions : le modèle OSI, la clé de tout le chapitre (sept étages : Physique, Liaison, Réseau, Transport, Session, Présentation, Application ; on dépanne de bas en haut). L'adressage en images, avec Nour la Cartographe : une adresse IP comme une adresse postale (la rue, le numéro), le masque (/24, /26, 255.255.255.192), l'adresse du réseau, la diffusion, la passerelle et les sous-réseaux. Le lien (`ip link`, `ethtool`), l'adresse (`ip addr`, `dhclient`), la route (`ip route`, `ping`), les noms (`/etc/resolv.conf`, `dig`, `host`, `nslookup`, `resolvectl`, `/etc/hosts`), le DHCP et les services (`systemctl`, `journalctl`, `ss`), la configuration permanente (`netplan`, `nmcli`, `reboot`), le web (`curl`, `wget`), l'horloge et les certificats (`timedatectl`, `openssl`), les ports et le pare-feu (`nc`, `telnet`, `iptables`), le routage (`traceroute`, `mtr`) et l'écoute du réseau (`tcpdump`). En bonus, les sorts des anciens (`ifconfig`, `route`, `arp`, `netstat`) et la sacoche de Radia (`arping`, `tracepath`, `getent`, `uptime`, `iperf3`, `nft`). À l'Annexe : le Wi-Fi (`rfkill`, `iw`, `nmcli`), le plan d'adressage (`ipcalc`), le routage du noyau (`sysctl`), la zone DNS (`named-checkzone`), le switch (`lldpctl`) et le débit (`iftop`, `nethogs`, `vnstat`, `conntrack`), plus la boîte à outils de Vint (`arp-scan`, `fping`, `whois`, `chronyc`, `smbclient`).

Le chapitre se joue dans un monde où une adresse postale s'écrit en quatre nombres, comme une adresse IP : le réseau y est la poste. Les paquets sont des lettres, le routeur le Bureau de Poste, le DNS l'Oracle des Noms (il connaît l'adresse de chaque nom), le DHCP la Mairie, les ports des guichets, le pare-feu le gardien, telnet une carte postale et ssh une enveloppe scellée ; le modèle OSI est la Grande Poste aux sept étages. Le Lexique de Radia donne chaque image et le vrai mot du métier.

Pendant l'épreuve des B1, le stagiaire de Vint (l'administrateur réseau, en vacances) a « essayé des trucs » : le poste de l'accueil du bâtiment B a sa carte éteinte et un DNS mal recopié, le serveur DHCP du routeur est arrêté, apache2 a pris le port 80 de nginx sur l'intranet, une règle iptables avale les mails du bâtiment, la route vers Lille a disparu, et un vieux telnet traîne sur le routeur. La pile de la carte mère du poste est à plat, en plus : son horloge repart de 2001.

Le chapitre s'ouvre après la victoire sur le Sorcier Noir : le P.S. de Laurent envoie au BatimentB de Cybersup, où Radia (M1 réseau, campus de Marseille) attend la recrue. Il suit 22 étapes (14 au bâtiment B, puis 8 à l'Annexe), a sa propre note sur 20 et son propre certificat (CertificatReseau), avec un code de vérification. Radia annonce l'étape suivante au talkie-walkie après chaque réparation. Un groupe qui ne fait que ce chapitre (une séance sur le réseau Linux) choisit le ticket d'incident au démarrage (ou tape `chapitre 2` avant d'avoir franchi la première étape) : il arrive directement au BatimentB, avec les droits sudo, et le chapitre 1 est rejoué en silence sans être noté.

Le Poste de l'accueil est une vraie machine : on s'assoit devant (`cd Poste`), son invite devient `poste-b`, et `/` désigne sa racine. Le routeur et l'intranet ne s'administrent que depuis ce poste, par `ssh`. Les valeurs de ce chapitre sont les mêmes dans toutes les parties.

### 7. Le modèle OSI, puis le lien, l'adresse et la route

Radia commence par la clé de tout : l'affiche du modèle OSI, punaisée sur l'armoire (`cat ModeleOSI`). La lire valide la première étape et rapporte le premier badge. Écrire les sept étages dans l'ordre dans `~/osi.txt` valide une quête secondaire (accents et majuscules indifférents). Ensuite, chaque étape dit à quel étage elle se joue, et les sept voyants au-dessus de l'image montrent les étages du Poste.

Au tableau blanc du bâtiment B, Nour, la Cartographe, explique les adresses en images : une adresse IP se lit comme une adresse postale, la rue (le réseau) puis le numéro de la maison (la machine), et le masque dit où s'arrête le nom de la rue (`cat PlanDesAdresses`, puis `cat Quartiers` pour les sous-réseaux). Ses cinq colles se répondent à voix haute, dans le bâtiment B, avec `echo` : chacune valide une quête secondaire, et une mauvaise réponse ne coûte rien (Nour dit où regarder).

```
cd ~/Cybersup/BatimentB
cat Radia
cat ModeleOSI
echo Physique Liaison Réseau Transport Session Présentation Application > ~/osi.txt
cat Radia
cat SacocheDeRadia
cat Cartographe
cat PlanDesAdresses
cat Quartiers
echo 10.0.93.0
echo 10.0.93.255
echo 62
echo 255.255.255.192
echo 10.0.94.64
cat Cartographe
cd Poste
ls
cat Etiquette
cat AideMemoire
cat GrimoireDesAnciens
ifconfig
ifconfig -a
hostnamectl
ip link
ethtool eth0
sudo ip link set eth0 up
ip a
sudo dhclient eth0
sudo arping -D -c 2 10.0.93.20
sudo ip addr add 10.0.93.20/24 dev eth0
ping -c 4 10.0.93.254
ip neigh
arp -n
sudo arping -c 3 10.0.93.254
route -n
ip -s link
ping 10.0.92.53
ip r
sudo ip route add default via 10.0.93.254
ping 10.0.92.53
ping intranet
```

1. `ip link` montre `eth0` sans le mot UP : la carte est éteinte (`ethtool eth0` : « Link detected: no »). Le stagiaire l'avait coupée la veille.
2. `dhclient` ne reçoit aucune réponse : le serveur DHCP est en panne. L'Etiquette donne l'adresse à poser à la main, avec son masque `/24` (sans lui, l'adresse est posée en `/32` et le poste ne voit même pas le routeur).
3. `arping -D` vérifie, avant de poser l'adresse, que personne ne la porte déjà. Les sorts des anciens (`ifconfig`, `route`, `arp`) montrent la même chose que `ip`, à l'ancienne ; `ifconfig` sans `-a` cache la carte éteinte.
4. Le routeur répond, le reste du réseau non (« Le réseau n'est pas accessible ») : il manque la route par défaut vers la passerelle.

### 8. Les noms

Les adresses passent, les noms non : le poste interroge un serveur DNS qui n'existe pas (`10.0.92.35` au lieu de `10.0.92.53`).

```
cd etc
cat MemoDNS
cat resolv.conf
dig intranet
dig @10.0.92.53 intranet
sudo nano resolv.conf
ping -c 1 intranet
resolvectl status
host intranet
nslookup intranet
dig MX cybersup.lan
sudo nano hosts
ping -c 1 intra
getent hosts intra
nmcli device status
```

1. `dig @10.0.92.53 intranet` répond alors que `dig intranet` échoue : le DNS va bien, c'est la configuration du poste qui est fausse.
2. Dans nano, remplacer `10.0.92.35` par `10.0.92.53`, puis Ctrl+O et Ctrl+X. `sudo resolvectl dns eth0 10.0.92.53` marche aussi, jusqu'au prochain redémarrage.
3. Dans `hosts`, ajouter à la fin une ligne `10.0.92.20 intra` : ce raccourci de nom ne vaut que sur ce poste (quête secondaire).

### 9. Le DHCP du routeur, et une configuration qui tient

```
ssh routeur
cat CahierDuRouteur
systemctl status isc-dhcp-server
sudo journalctl -u isc-dhcp-server
sudo systemctl enable --now isc-dhcp-server
sudo ss -tulnp
sudo netstat -tulnp
sudo nft list ruleset
cd etc/dhcp
cat dhcpd.conf
cd /var/log
cat syslog
exit
sudo dhclient eth0
sudo dhclient -r eth0
sudo dhclient eth0
cd /etc/netplan
netplan get
sudo netplan set ethernets.eth0.dhcp4=true
sudo netplan apply
sudo reboot
uptime
cd /var/log
cat syslog
```

1. Le service DHCP est arrêté ET désactivé : `enable --now` fait les deux d'un coup. `ss -tulnp` montre alors le port 67 en UDP.
2. De retour sur le poste, `dhclient` obtient tout d'un coup (adresse, passerelle, DNS). `dhclient -r` rend le bail, un second `dhclient` le reprend (quête secondaire).
3. Tout ce qui a été fait avec `ip` s'efface au redémarrage. Le stagiaire avait coupé le DHCP dans `/etc/netplan/01-poste.yaml` (`dhcp4: false`) : on le remet, on applique, et `sudo reboot` prouve que le réseau revient tout seul.

### 10. L'intranet et l'horloge du poste

`curl http://intranet/` affiche la page par défaut d'apache2 : installé la veille avec un paquet PHP, il a pris le port 80 avant nginx, qui n'a pas pu démarrer.

```
curl http://intranet/
ssh intranet
cat NoteDeVint
sudo ss -tlnp
systemctl --failed
systemctl status nginx
sudo journalctl -xeu nginx
sudo systemctl disable --now apache2
sudo systemctl start nginx
cd /etc/nginx
cat intranet.conf
cd /etc/ssl
openssl x509 -noout -dates -in intranet.pem
cd /var/www/html
cd /var/www/intranet
hostnamectl
exit
curl -I http://intranet/
iperf3 -c intranet
cd /tmp
wget http://intranet/planning.txt
curl https://intranet/
openssl s_client -connect intranet:443
date
timedatectl
sudo timedatectl set-ntp true
curl https://intranet/
```

1. Il n'y a de place que pour un programme sur un port : on arrête et désactive apache2, puis on démarre nginx. `curl -I` montre ensuite `Server: nginx`.
2. En https, `curl` refuse un certificat « pas encore valide ». `openssl` montre qu'il est valide depuis vingt jours, et `date`, sur le poste, affiche 2001 : c'est l'horloge du poste qui se trompe (pile de la carte mère à plat). `timedatectl set-ntp true` la synchronise sur le serveur de temps de l'école.

### 11. Les mails, Lille et le telnet

```
nc -zv mail 25
ssh routeur
sudo iptables -L FORWARD -n -v --line-numbers
sudo iptables -D FORWARD 1
exit
nc mail 25
telnet mail 25
traceroute lille
mtr --report lille
ssh routeur
ip r
sudo ip route add 10.0.59.0/24 via 10.0.92.248
traceroute -n lille
sudo ss -tlnp
sudo tcpdump -i any -A port 23
sudo tcpdump -i any -n port 53
sudo systemctl disable --now telnet.socket
hostnamectl
exit
tracepath lille
```

1. `nc -zv mail 25` répond « timed out », pas « refused » : personne ne répond, pas même pour refuser. C'est la signature d'un pare-feu qui jette les paquets. Sur le routeur, la règle 1 de la chaîne FORWARD jette le port 25 du bâtiment B ; ses compteurs (`-v`) montrent qu'elle a déjà servi.
2. `traceroute lille` passe par le parefeu, puis plus rien : la route vers Lille (10.0.59.0/24, par lille-gw) a été supprimée. On la remet sur le routeur.
3. Le port 23 du routeur est un telnet. `tcpdump -A port 23` montre le script du prestataire envoyer son mot de passe en clair toutes les cinq minutes. On ferme le socket.

### 12. L'Annexe : le Wi-Fi de la cafétéria

Le bâtiment B tient, mais le stagiaire est passé à l'Annexe aussi : la radio du portable de la cafétéria est coupée (mode avion), un faux point d'accès imite le Wi-Fi de l'école, la plage du DHCP de la borne sort de son réseau (`10.0.94.0/26`), la borne ne fait plus passer les paquets (`ip_forward` à 0), la zone DNS de l'Annexe a une faute de frappe (`10.0.94.300`), le port de l'écran est éteint sur le switch, et l'écran retélécharge ses vidéos en boucle. Le mot de passe du Wi-Fi est sur l'AfficheWifi (il change d'une partie à l'autre : `<wifi>`), comme l'adresse MAC du faux point d'accès (`<bssid>`, donnée par le scan).

```
cd ~/Cybersup/Annexe
cat Gaspard
cat AfficheWifi
cat CarnetDeLAnnexe
cat BoiteAOutils
cd Portable
cat PostIt
ip link
sudo ip link set wlan0 up
rfkill list
sudo rfkill unblock wifi
ip link
iw dev
sudo iw dev wlan0 scan
nmcli device wifi list
cat ~/Cybersup/Annexe/BoitierSousLaTable
echo <bssid> > ~/jumeau.txt
whois cybersup-free.net
nmcli device wifi connect Cybersup-Etudiants password <wifi>
iw dev wlan0 link
sudo dhclient wlan0
ipcalc 10.0.94.0/26
cd ~/Cybersup/BatimentB/Poste
ssh borne
cat NoticeDeLaBorne
systemctl status isc-dhcp-server
sudo journalctl -u isc-dhcp-server
cd etc/dhcp
cat dhcpd.conf
sudo nano dhcpd.conf
sudo systemctl restart isc-dhcp-server
sysctl net.ipv4.ip_forward
sudo sysctl -w net.ipv4.ip_forward=1
cd /etc
sudo nano sysctl.conf
sudo sysctl -p
chronyc sources
vnstat
exit
cd ~/Cybersup/Annexe/Portable
sudo dhclient wlan0
ping -c 1 10.0.94.1
ping -c 1 intranet
sudo arp-scan -l
dig affichage
cd ~/Cybersup/BatimentB/Poste
ssh routeur
cd /etc/bind
cat MemoZone
systemctl status named
sudo named-checkzone annexe.cybersup.lan annexe.zone
sudo nano annexe.zone
sudo named-checkzone annexe.cybersup.lan annexe.zone
sudo systemctl reload named
exit
smbclient -L //intranet -N
cd ~/Cybersup/Annexe/Portable
dig +short affichage.annexe
ping -c 1 affichage
ssh switch
cat CarnetDuSwitch
ip link
sudo ip link set port7 up
lldpctl
exit
fping -a -g 10.0.94.0/26
iperf3 -c intranet
ssh borne
sudo iftop
sudo conntrack -L
exit
ssh affichage
sudo nethogs
systemctl status synchro-videos
sudo systemctl disable --now synchro-videos
exit
iperf3 -c intranet
```

1. `rfkill list` montre « Soft blocked: yes » : la radio Wi-Fi est coupée par logiciel. `rfkill unblock wifi` la rallume.
2. Le scan montre deux réseaux. `Cybersup-Free`, ouvert et au signal le plus fort, est un faux point d'accès (un boîtier scotché sous une table, dont le domaine a été créé la veille : `whois`). On se connecte au vrai, protégé par WPA2, avec le mot de passe de l'affiche.
3. Associé, mais sans adresse : sur la borne, `isc-dhcp-server` refuse de démarrer, car la plage `10.0.94.100` à `10.0.94.150` sort du réseau `10.0.94.0/26` (`ipcalc` : de `.1` à `.62`). On la remet dans le réseau (`range 10.0.94.10 10.0.94.50;`), on redémarre le service, et le portable obtient `10.0.94.10`.
4. Le portable parle à la borne, pas au-delà : `net.ipv4.ip_forward` vaut 0. `sysctl -w` le remet à 1 tout de suite, la ligne décommentée dans `/etc/sysctl.conf` (puis `sysctl -p`) le rend permanent.
5. `named-checkzone` trouve la faute de la zone de l'Annexe, sur le routeur ; on corrige, on vérifie, on recharge `named`.
6. Sur le switch, `port7` (l'écran) est éteint. `port8`, la prise du couloir, reste coupée exprès : l'allumer compte comme une panne.
7. L'écran rallumé, le Wi-Fi tombe à 3 Mbit/s : `iftop` sur la borne montre `affichage`, `nethogs` sur l'écran montre `synchro-videos`, un service qui se relance tout seul. `disable --now` l'arrête et l'empêche de revenir.

### 13. Le compte rendu

```
cd ~/Cybersup/BatimentB
cat Radia
cat ~/CertificatReseau
```

Radia remet le CertificatReseau, avec la note du chapitre 2 et son code de vérification, puis transmet le message de Grace : du trafic bizarre sous la Citadelle, et une trappe qui vient de s'ouvrir. C'est le chapitre 3.

## Chapitre 3 : la Crypte (la mission cyber)

Notions : empreintes (`sha256sum`, `sha256sum -c`), encodage (`base64`, `base64 -d`), bit SUID (`ls -l`, `find -perm -4000`, `chmod u-s`), sortie d'erreur (`2>`, `2>/dev/null`), ports en écoute (`ss -tlnp`, vu au chapitre 2), édition de fichiers (`nano`, vu au chapitre 2), clés SSH (`ssh-keygen`, clé publique et clé privée, `authorized_keys`). Puis, sur tout le réseau de l'école : journaux compressés (`zcat`, `journalctl`, `last`, `who`), cartographie (`nmap`, et `ip`, `nc`, `dig`, `traceroute` vus au chapitre 2), processus et services (`pgrep`, `pkill`, `lsof`, `systemctl`), attribut immuable (`lsattr`, `chattr`), filtres de texte (`sed`, `awk`, `tr`, `rev`, `tee`), comptes et droits (`userdel`, `usermod`, `groups`, `visudo`), pare-feu (`ufw`), copie de preuves (`ssh-copy-id`, `scp`, `md5sum`, `sha1sum`), analyse de fichiers (`file`, `xxd`, `strings`, `stat`), chiffrement (`gpg`) et l'éditeur des serveurs, `vim`, avec ses leçons. En bonus, le carnet de traque de Grace (`lastb`, `lastlog`, `w`, `chage`, `fail2ban-client`) et la trousse d'Evi (`clamscan`, `rkhunter`, `debsums`, `exiftool`, `getfacl`, `setfacl`).

Le chapitre se joue comme une chasse : le Corbeau a fait son nid sur le réseau, chaque sort porte un nom imagé (`nmap`, la Lanterne des Ports ; `lsof`, le Filet) et, au premier lancement, dit ce qu'il fait en une image. Les machines de l'école sortent de la brume dès qu'un sort les nomme, et `traque` affiche le tableau de chasse : en rouge ce que le Corbeau souille encore, en vert ce qui est purifié. Chaque étape franchie (sauf le rapport) rapporte un badge de compétence (Bit SUID, Clés SSH, Chaîne de traçabilité...), dont `badges` relit la leçon. Le Bestiaire de la Crypte donne, pour chaque image, le vrai mot du métier.

L'enquête suit 22 étapes : la Crypte (7 étapes, comme avant), les journaux de la Citadelle, la cartographie du réseau, le labo de TP (session et service), le site web, la messagerie, le DNS, le pare-feu, les comptes et sudo, la clé, le coffre, les preuves, les notes chiffrées, le Corbeau, puis le rapport d'incident rédigé dans vim. La radio de Grace annonce toujours l'étape suivante.

Le chapitre s'ouvre quand le réseau est réparé : Radia transmet le message de Grace, et une trappe apparaît dans la Citadelle. Il a sa propre note sur 20 et son propre certificat, avec un code de vérification. Un groupe qui ne fait que ce chapitre (une séance de trois heures sur la sécurité) choisit l'ordre de mission au démarrage, juste après le compte (ou tape `chapitre 3` avant d'avoir franchi la première étape). Dans l'histoire, le joueur reçoit un ordre de mission de la WarRoom : les B1 ont battu le Sorcier Noir le matin même, mais un intrus bien réel est entré pendant la correction. Il commence dans la WarRoom, où Grace fait le briefing (`less CheffeDeQuart`), monte à la Citadelle avec `ssh citadelle`, et Laurent l'y accueille avant de lui ouvrir la Crypte. Le chapitre 1 est rejoué en silence et n'est pas noté pour lui, et la panne du réseau ne fait pas partie de sa mission. Une fois le chapitre 1 entamé, les renforts ne sont plus proposés : il faut battre le Sorcier Noir, ou recommencer une partie.

Au chapitre 3, chaque notion est un verrou : la `.porte` n'apparaît dans le Caveau qu'une fois le programme trafiqué repéré avec `sha256sum -c` et le message décodé avec `base64 -d`, et elle ne s'ouvre qu'à qui l'a trouvée avec `find -perm -4000`.

### 14. La Crypte

L'intégrité et le message caché :

```
ssh citadelle
cd Crypte
less Archiviste
less Radio
less Bestiaire
less TrousseDEvi
traque
cd bin
ls -l
sha256sum -c SHA256SUMS
debsums -c
cat gardien
grep charge= gardien | cut -d= -f2 | base64 -d
echo $USER | base64
```

La porte dérobée :

```
cd ../Caveau
less Inscription
find . -perm -4000
find .. -perm -4000 2>/dev/null
find . -perm -4000 2> ~/erreurs.txt
ls -la
./.porte
cd Racine
less ManuelDeNano
```

`find` se plaint de chaque niche fermée : ces plaintes passent par la sortie d'erreur, la numéro 2. Elles ne passent donc pas dans un tuyau (`find ... | grep porte` les affiche quand même), et `2>/dev/null` les fait disparaître. `passwd` a lui aussi le bit SUID, et c'est normal : le piège est de ne pas savoir distinguer les deux. Les deux sont des programmes compilés (`cat` n'affiche que du charabia qui commence par ELF) : Linux ignore le bit SUID sur les scripts, il ne compte que sur les binaires.

L'écoute et la clé :

```
ps
less ../../Radio
ss -tlnp
sudo ss -tlnp
sudo kill -9 <pid-ecoute>
less FicheReflexe
sudo cat .ssh/authorized_keys
sudo nano .ssh/authorized_keys
cd ..
sudo chmod u-s .porte
ls -l .porte
```

Sept processus s'appellent `[kworker/...]` : `ps` ne dit pas lequel est le bon, car le Corbeau a copié le nom des threads du noyau, crochets compris. `sudo ss -tlnp` montre que le port 6666 est tenu par l'un d'eux, avec son PID. Il ignore TERM : il faut `-9`. Un vrai thread du noyau ignore les signaux : `kill` ne lui fait rien, et Grace le fait remarquer.

Dans `nano`, on place le curseur sur la ligne qui finit par `corbeau@nid`, Ctrl+K pour la couper, Ctrl+X puis O pour enregistrer. Un joueur qui retire aussi la clé de Laurent est prévenu par la radio : la copie `authorized_keys.orig` permet de réparer (`sudo cp`).

Le Graffiti du Caveau est écrit à l'envers, et la porte dérobée garde dans ses octets une phrase en ROT13 qui servira plus tard :

```
less Graffiti
rev Graffiti
xxd .porte | head -n 2
strings .porte | grep phrase
```

L'accès au coffre (le Corbeau ne s'y montrera qu'à la toute fin) :

```
cd ~/Cybersup/SalleServeurs
less ConsignesDuCoffre
ssh-keygen
ls -la ~/.ssh
cp ~/.ssh/id_ed25519.pub BoiteDeDepot
cd BoiteDeDepot
cd ..
ssh coffre
exit
```

`ssh-keygen` demande deux fois une phrase de passe (le test répond la même chose deux fois ; une phrase non vide rapporte une quête secondaire). Déposer la clé privée (`id_ed25519`) au lieu de la publique est le piège pédagogique du chapitre : Evi la détruit, la paire est grillée, et il faut en refaire une.

### 15. Les journaux de la Citadelle

Au chapitre 3, la Citadelle a aussi ses dossiers système : `etc`, `var/log` et `tmp` (les chemins absolus comme `/etc/passwd` y marchent). Les journaux de la veille sont compressés : `zcat` les lit sans les décompresser. La ligne `Accepted` donne l'heure de la première connexion du Corbeau (à noter pour le rapport) et l'adresse d'où il venait : le labo de TP.

```
ssh citadelle
cd var
cd log
less CarnetDuVeilleur
less CarnetDeTraque
sudo lastb
lastlog
sudo chage -l corbeau
ls -l
cat auth.log
zcat auth.log.1.gz
zcat auth.log.2.gz | grep Accepted
sudo journalctl -u sshd
echo brouillon > ~/essai.txt
gzip ~/essai.txt
gunzip ~/essai.txt.gz
exit
```

### 16. Le réseau de l'école et le labo de TP

Le MementoReseau de Vint apparaît dans la SalleReseau. `nmap` sur le réseau de l'école fait connaître toutes les machines : on peut ensuite s'y connecter par leur nom.

```
cd ~/Cybersup/SalleReseau
less MementoReseau
ip a
ip r
uname -a
which nmap
nmap 10.0.92.0/24
ssh labo
uname -a
less TableauDuLabo
who
w
last
pgrep -a -u corbeau
sudo lsof -p <pid:maj-auto>
sudo pkill -u corbeau
who
sudo systemctl list-units
sudo systemctl status maj-auto
sudo systemctl disable --now maj-auto
groups corbeau
sudo usermod -L corbeau
cd etc
cat passwd
cd ../var
cd log
cat syslog
cd /tmp
ls -l
file vacances.jpg
zcat vacances.jpg
```

`who` montre la session du Corbeau, ouverte depuis la nuit, et l'adresse de son poste (le repère `<poste>`). `pkill -u corbeau` coupe tous ses processus, mais le service `maj-auto` revient tout seul (`Restart=always`) : il faut `systemctl disable --now`, qui l'arrête et l'empêche de redémarrer. La « photo de vacances » est en réalité une archive gzip : `file` le dit, `zcat` la lit.

### 17. Les leçons de vim

Sur le labo, le dossier `/home/etudiant/vimtuteur` contient cinq leçons inspirées du tutoriel officiel de vim. Chacune est une quête secondaire ; chaque leçon se fait en ouvrant le fichier avec `vim`, en suivant la consigne écrite dedans, puis en enregistrant avec `:wq`.

```
cd /home
cd etudiant
cd vimtuteur
less TuteurVim
vim lecon1.txt
vim lecon2.txt
vim lecon3.txt
vim lecon4.txt
vim lecon5.txt
vim brouillon.txt
exit
```

Les touches, leçon par leçon :

| Leçon | Ce qu'on fait dans vim |
| --- | --- |
| 1 | `j` pour descendre jusqu'à la ligne `--->`, `l` pour avancer, `x` sur chaque lettre en trop (vvache, saauta, paar, luune), puis `:wq` |
| 2 | sur la première ligne `--->`, se placer sur « dans », `i`, taper « mots » et une espace, Échap ; sur la deuxième, `A`, taper « de nulle part. », Échap ; `:wq` |
| 3 | sur le deuxième « le » puis sur le deuxième « protège », `dw` ; sur la ligne « Cette ligne ne sert à rien », `dd` ; `u` annule, `dd` refait ; `:wq` |
| 4 | sur la ligne « 2) deuxième », `dd`, puis `p` sur la ligne « 1) première » ; sur le « o » d'attoque, `ra` ; sur « ouvert », `cw`, taper « fermé », Échap ; `:wq` |
| 5 | `/erreur` puis `n` pour voir les suivantes ; `:%s/erreur/succès/g` ; `G` pour la dernière ligne (`---> FIN ?`), `$` pour aller sur le point d'interrogation, `r.` pour le remplacer par un point ; `:wq` |
| brouillon.txt | `i`, taper n'importe quoi, Échap, puis `:q!` : on sort sans rien enregistrer |

Sortir de vim pour la première fois rapporte aussi une quête secondaire. Une leçon abîmée se recommence : `rm leconN.txt`, et le tuteur en remet une copie neuve. `vi` est l'autre nom de `vim`, et `ZZ` enregistre et quitte comme `:wq`. Sur téléphone, les boutons en bas de l'éditeur envoient Échap, `i`, `x`, `dd`, `u`, `:w`, `:wq` et `:q!`.

### 18. Le site web, la messagerie, le DNS, le pare-feu

```
ssh web
uname -a
less LISEZMOI
curl http://web/
curl -I http://web/
curl http://web/robots.txt
cd /var
cd log
cat access.log
find /var/www -mtime -1
cd ../www
cat index.html
getfacl uploads
sudo clamscan -r uploads
sudo setfacl -x u:corbeau uploads
cd uploads
exiftool photo-promo.png
stat maj.php
sudo rm maj.php
lsattr
sudo chattr -i maj.php
sudo rm maj.php
cd /etc
cat httpd.conf
exit
ssh mail
uname -a
less AideMemoireMail
nc mail 25
cd /var
cd log
awk '{ print $1, $4 }' mail.log
cd ../spool
sed -n '/^--- pièce jointe/,/^--- fin/p' message-0042.eml | grep -v '^---' | base64 -d
cd /etc
exit
ssh dns
less NotesDNS
dig maj.cybersup.lan
dig -x <poste>
cd etc
cd bind
sudo vim ecole.zone
dig +short maj.cybersup.lan
exit
ssh parefeu
less ConsignesParefeu
traceroute web
sudo ufw status numbered
sudo ufw route deny from <poste>
sudo ufw enable
sudo ufw status numbered
cd etc
cd ../var
cd log
cat ufw.log
exit
```

La page piégée du site a l'attribut immuable : même root ne peut pas la supprimer avant `chattr -i`. La pièce jointe du mail est encodée en base64 entre deux lignes repères : `sed -n '/début/,/fin/p'` garde l'intervalle, `grep -v` retire les repères. `dig -x` sur l'adresse de `maj` répond `poste-47` : un simple poste de travail se fait passer pour le serveur des mises à jour. Dans `vim ecole.zone`, on descend sur la ligne qui commence par `maj` (par exemple `/maj` puis Entrée), `dd`, puis `:wq`. Si on retire une autre ligne par erreur, la radio dit laquelle remettre. Au pare-feu, le poste doit être empêché de TRAVERSER le pare-feu pour joindre les serveurs : c'est `ufw route deny` (une règle FWD). `ufw deny from` tout court ne protège que le pare-feu lui-même, et Grace le fait remarquer. Les règles se lisent dans l'ordre : un `allow` pour le poste placé avant le `deny` le laisse passer (`sudo ufw route insert 1 deny from ...` met la règle en tête). Bloquer l'adresse du labo est une erreur que Grace signale : le Corbeau n'a fait que le traverser.

### 19. L'imprimante et la badgeuse

```
ssh imprimante
nc imprimante 9100
cd spool
cat job-017.txt
exit
ssh badgeuse
less NoteDuGardien
cd journaux
awk '$3 == "B-047" && $2 < "06:00"' badges.log
exit
```

### 20. Les comptes de la Citadelle

```
ssh citadelle
cd etc
less ProcedureComptes
awk -F: '$3 == 0 { print $1 }' passwd
sudo userdel maintenance
groups corbeau
sudo gpasswd -d corbeau sudo
groups corbeau
sudo cat sudoers
sudo visudo
sudo cat sudoers
sudo chage -E 0 corbeau
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd banip <poste>
sudo rkhunter --check
exit
```

Le Corbeau a le droit sudo de deux façons : par le groupe `sudo` (`groups corbeau`) et par une ligne à son nom dans sudoers. `gpasswd -d corbeau sudo` le sort du groupe (sur les systèmes récents, `usermod -rG sudo corbeau` aussi). `visudo` ouvre sudoers dans vim (ou nano pour qui ne connaît pas encore vim) : on se place sur la ligne qui commence par `corbeau`, `dd`, puis `:wq`. `visudo` vérifie la syntaxe avant d'enregistrer : une ligne cassée est refusée. Modifier sudoers directement (`sudo nano /etc/sudoers`) ne valide pas l'étape, et Evi le fait remarquer ; retirer aussi les lignes de root ou du groupe sudo non plus.

### 21. Les preuves et les notes chiffrées

La ProcedurePreuves apparaît dans la SalleServeurs. La preuve est le fichier que le faux kworker gardait ouvert : `/tmp/.cache/notes.gpg` sur la Citadelle. On la copie sur la sauvegarde avant d'y toucher, et on note son empreinte au registre.

```
cd ~/Cybersup/SalleServeurs
less ProcedurePreuves
ssh-copy-id sauvegarde
ssh citadelle
cd tmp
cd .cache
ls -l
md5sum notes.gpg
sha1sum notes.gpg
sha256sum notes.gpg
scp notes.gpg sauvegarde:/preuves/
exit
ssh sauvegarde
cd preuves
sha256sum notes.gpg | tee -a registre.txt
cd ../archives
ls -l
exit
ssh citadelle
cd Crypte
cd Caveau
strings .porte | grep phrase | cut -d= -f3 | tr 'A-Za-z' 'N-ZA-Mn-za-m'
cd ../..
cd tmp
cd .cache
gpg -d notes.gpg
exit
echo mes notes > ~/secret.txt
gpg -c ~/secret.txt
```

`gpg -d` demande la phrase de passe : c'est le résultat du tuyau sur `strings` (ROT13 défait par `tr`). `gpg -d notes.gpg > carnet.txt` écrit le texte clair dans un fichier. Si le joueur modifie `notes.gpg` avant de l'avoir copié, Grace refuse la preuve et remet l'original en place : une preuve se copie et s'empreinte avant qu'on y touche. Le carnet du Corbeau résume toute l'intrusion et donne rendez-vous au coffre. Le Corbeau ne s'y montre qu'une fois toutes les étapes précédentes faites ; sinon, Grace dit à la radio ce qu'il reste.

### 22. Le Corbeau et le rapport d'incident

```
ssh coffre
less Corbeau
exit
ssh poste-47
uname -a
sudo dmesg
cd home
cd stagiaire
cat a-faire.txt
cd /tmp
cat rapport-pour-laurent.txt
exit
cd ~
less ModeleRapport
cp ModeleRapport rapport.txt
vim rapport.txt
cat CertificatCyber
```

Dans `vim rapport.txt`, pour chacune des quatre lignes à compléter : s'y placer (`j`), `A`, taper la réponse, Échap. Puis `:wq`. Les réponses : l'adresse du poste (vue avec `who` sur le labo, ou dans les notes du Corbeau), le compte caché (`maintenance`), le port de la porte dérobée (6666) et l'heure de la première connexion (ligne `Accepted` de `auth.log.2.gz`). Si une réponse manque, le rapport n'est pas accepté. Le rapport écrit avec un autre éditeur est refusé : Laurent veut vim.

À ce stade le chapitre 3 affiche 5625 XP sur 5625, soit 20 sur 20, et le CertificatCyber porte son code de vérification.

## Chapitre 4 : l'Académie des Arcanes (niveau avancé)

Numéro interne 5, affiché 4. Quelques semaines après la Crypte, les notes volées de Frances ont fuité : un groupe de rançonneurs, la Nuée, a repris le nom du Corbeau. En une nuit, la Nuée a exfiltré des données de l'école, posé une bombe logique programmée pour minuit, semé des pièges et laissé un script qui recrée ses fichiers. Tout ce qui est « malveillant » ici est narratif et inerte (comme les charges neutralisées du chapitre 3) : le joueur apprend à mesurer la fuite, notifier (RGPD), éradiquer, restaurer et documenter.

Le chapitre s'ouvre à la fin de la Crypte (après le rapport d'incident) : un escalier apparaît au fond de la SalleServeurs et descend à l'Académie. Huit maîtres, une aile chacun, enseignent les sorts avancés (noms d'inventeurs) : Henry (Runes, `grep`), Alfred (Divination, `awk`), Lee (Transmutation, `sed`), Stephen (Grimoires, `jq`), Doug (Alchimie, `xargs`, `comm`, `join`, `paste`, `column`, `nl`, `fold`, `shuf`), Paul (Chronomancie, `at`, `atq`, `atrm`), Andrew (Archives, `rsync`, `patch`, `tac`, `split`), Brian (Invocation, `read`, `printf`, `seq`, `basename`, `dirname`, `expr`, `sleep`). Chaque maître est un personnage vivant : il entre en scène, explique son école par une image (sed transmute ligne par ligne, awk lit l'avenir dans les colonnes, jq marche dans un grimoire relié en arbre...), enseigne la syntaxe sur les registres de son aile (des potions, des élèves, des recettes, jamais les données de la mission), puis confie la mission sans en donner la commande exacte. Son texte change ensuite : entre ses deux étapes, après une erreur fréquente, puis une fois tout fini (une anecdote du métier, et ses six défis cochés). Frances (`cat Frances`) culpabilise puis grandit au fil de la nuit, Laurent (`cat Laurent`) fixe le cap, Grace guide à la radio (`cat Radio`), de plus en plus pressante à l'approche de minuit, et une Horloge marque la nuit : chaque commande rapproche de minuit, où la bombe se déclenche si elle n'est pas désamorcée (ce n'est pas une défaite : la restauration devient alors indispensable). `grimoire` montre le tableau de bord des huit écoles, le Bestiaire du hall traduit chaque image en vrai mot. Le serveur visé est la machine `archives` (hors du réseau `10.0.92.0/24`), à laquelle on se connecte par `ssh archives`. Les données (journaux, adresses de la Nuée, comptes fantômes, volume) changent d'une partie à l'autre : les valeurs propres à la partie sont écrites `<entre chevrons>`.

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<fantome-cron>` | un des comptes fantômes de `~/academie/fantomes.txt` (celui dont la crontab relance le chiffreur : `sudo crontab -u NOM -l` le montre) |
| `<ip-nuee>` | première adresse de `~/academie/ioc.txt` |
| `<volume>` | le nombre écrit dans `~/academie/volume.txt` |

Les 50 défis de l'Académie (quêtes secondaires `s_d_*`, 50 XP chacun) : six par école, révélés en lisant le maître, réussis sur les registres de son aile ; et deux défis de la nuit, révélés par Laurent : désarmer la bombe avant 23 h, et remettre le retour d'expérience sans avoir acheté d'indice. La solution ci-dessous les fait tous, et désamorce donc la bombe tôt dans la nuit, avant de reprendre les écoles dans l'ordre.

### 23. L'Académie, les maîtres et l'avis de la Nuée

On descend à l'Académie, on écoute Laurent et Frances, on lit l'avis de la Nuée, la radio, l'horloge et le bestiaire, puis on fait le tour des huit ailes (et de leurs réserves) pour apprendre les sorts et découvrir les défis :

```
cd ~/Cybersup/SalleServeurs
cd Academie
mkdir ~/academie
cat Laurent
cat Frances
cat AVIS.txt
cat Radio
cat Horloge
cat Bestiaire
grimoire
cd Runes
cat Henry
cd ../Divination
cat Alfred
cd ../Transmutation
cat Lee
cd ../Grimoires
cat Stephen
cd ../Alchimie
cat Doug
cd Reserve
cd ../../Chronomancie
cat Paul
cd ../Archives
cat Andrew
cd Parchemins
cd ../../Invocation
cat Brian
cd ../BoiteDeLaurent
```

### 24. Chronomancie d'abord : la bombe, avant 23 h

La bombe vise minuit : on commence par elle. Dans l'aile, la colle de Paul (« 45 4 * * * » tourne à 4 h 45) et un cycle complet de sablier (`at`, `atq`, `atrm`), puis une date relative. Sur archives, on lit les trois serrures du temps (le timer, la file `at` de root, la crontab du fantôme, qu'on relève comme preuve avant de l'effacer), on les neutralise toutes les trois, on vérifie dans la liste complète des timers, et on programme la vraie sauvegarde :

```
cd ../Chronomancie
echo 04:45
echo "echo arroser-les-mandragores" | at now + 2 hours
atq
atrm $(atq | cut -f1)
date -d "tomorrow"
ssh archives
systemctl list-timers
systemctl status maj-nocturne.timer
sudo atq
sudo crontab -u <fantome-cron> -l
sudo crontab -u gestionnaire -l
sudo systemctl disable --now maj-nocturne.timer
sudo atrm 1
sudo crontab -u <fantome-cron> -r
systemctl list-timers --all
printf "30 2 * * * /usr/local/bin/sauvegarde.sh\n" | crontab -
exit
```

### 25. Runes : les traces et les indicateurs

Les six défis d'Henry sur son registre des sorts, puis, sur le serveur, les traces de la Nuée (sa plage d'adresses) et ses indicateurs uniques :

```
cd ../Runes
grep -w feu registre-des-sorts.log
grep -o "eleve=[a-z]*" registre-des-sorts.log
grep -C 1 explosion registre-des-sorts.log
grep -v "^#" registre-des-sorts.log
grep -E "^[[:digit:]]+$" codes-de-salle.txt
grep -c rate registre-des-sorts.log
ssh archives
cd /var
cd log
ls
grep -E "45\.137\." /var/log/acces.log > ~/academie/traces.log
grep -oE "45\.137\.[0-9]+\.[0-9]+" /var/log/acces.log | sort -u > ~/academie/ioc.txt
exit
```

### 26. Divination : le poids de la fuite et les machines les plus bavardes

Les six défis d'Alfred sur le registre des potions, le CSV des élèves et les prophéties, puis, au proxy, le volume parti vers la Nuée et le podium des sources :

```
cd ../Divination
awk 'BEGIN { print "stock total" } { s += $4 } END { print s }' potions.txt
awk '{ s += $3 } END { print s / NR }' potions.txt
awk '{ printf "%-20s %4d\n", $1, $4 }' potions.txt
awk -F, '{ print $2 }' eleves.csv
awk '{ print $NF }' propheties.txt
awk '{ print toupper($1) }' potions.txt
ssh archives
awk '$3 ~ /^45\.137\./ { s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt
awk '$3 ~ /^45\.137\./ { s[$2] += $4 } END { for (m in s) print m, s[m] }' /var/log/proxy.log | sort -k2,2nr | head -3 > ~/academie/victimes.txt
exit
```

### 27. Transmutation : minimiser pour la CNIL, désarmer la configuration

Les six défis de Lee sur son carnet de recettes (dont une copie modifiée sur place avec une sauvegarde `.bak`), puis l'export minimisé et la configuration nettoyée :

```
cd ../Transmutation
cp recettes.txt ~/academie/
sed -i.bak 's/ *$//' ~/academie/recettes.txt
sed -E 's#([0-9]{2})/([0-9]{2})/([0-9]{4})#\3-\2-\1#g' recettes.txt
sed 's/ *$//' recettes.txt
sed -n '3,5p' recettes.txt
sed 'y/aei/AEI/' recettes.txt
sed -e '1i Carnet de Lee' -e '$a Fin du carnet' recettes.txt
ssh archives
cd /etc
cat archives.conf
cd /srv
cd edr
ls
sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt
sudo sed -i -e '/exec_hook/d' -e 's/^autorise_tout = oui/autorise_tout = non/' /etc/archives.conf
exit
```

### 28. Grimoires : les machines critiques et le rapport de quart

Les six défis de Stephen sur le catalogue de la bibliothèque, puis le JSON de l'antivirus : la liste des machines critiques et un tableau CSV :

```
cd ../Grimoires
jq '.bibliotheque' bibliotheque.json
jq '.ouvrages | length' bibliotheque.json
jq '.ouvrages[0] | keys' bibliotheque.json
jq '.ouvrages[] | {titre, pages}' bibliotheque.json
jq -c '.ouvrages[]' bibliotheque.json
jq -r '.ouvrages | sort_by(.pages) | .[].titre' bibliotheque.json
ssh archives
jq -r '.[] | select(.gravite=="critique") | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt
jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv' /srv/edr/alertes.json > ~/academie/alertes.csv
exit
```

### 29. Alchimie : comptes fantômes et quarantaine

Les six défis de Doug (la Réserve de fioles et ses registres), les trois petits sorts de mise en forme (`nl`, `fold`, `shuf`), puis, sur le serveur, les comptes fantômes démasqués et verrouillés, et la quarantaine de tout ce que la Nuée a déposé (repéré par son propriétaire `nuee`, fichier caché et `/tmp` compris) :

```
cd ../Alchimie
find Reserve -size +2k
find Reserve -empty
paste ingredients.txt quantites.txt
join maisons.txt notes.txt
column -t tableau-brut.txt
sort -k2,2n stocks.txt
nl ingredients.txt
fold -w 20 Reserve/elixir.txt
shuf ingredients.txt
ssh archives
cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt
cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt
comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt
cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}
sudo find /srv /tmp -user nuee -exec mv {} /quarantaine/ \;
cd /tmp
ls -a
cd /quarantaine
ls -a
exit
```

### 30. Archives : restaurer et appliquer le correctif

Les six défis d'Andrew : copier les Parchemins à blanc puis sans les brouillons, les ranger dans une archive compressée, fabriquer un patron de couture, l'essayer à blanc, puis coudre et découdre une copie de la formule ; `tac` et `split` au passage. Sur le serveur, la restauration à l'identique depuis la sauvegarde hors ligne (à blanc d'abord), puis le correctif de Grace :

```
cd ../Archives
rsync -an Parchemins/ ~/academie/chants/
rsync -a --exclude "*.tmp" Parchemins/ ~/academie/chants/
tar -czf ~/academie/chants.tar.gz Parchemins/chant-1.txt Parchemins/chant-2.txt Parchemins/chant-3.txt
tar -tzf ~/academie/chants.tar.gz
diff -u formule.txt formule-v2.txt
patch --dry-run formule.txt amelioration.diff
cp formule.txt ~/academie/
cp amelioration.diff ~/academie/
cd ~/academie
patch formule.txt amelioration.diff
patch -R formule.txt amelioration.diff
tac formule.txt
split -l 2 formule.txt morceau-
ssh archives
cd /srv
cd sauvegarde-hors-ligne
ls
cd ../archives
ls
sudo rsync -an --delete /srv/sauvegarde-hors-ligne/ /srv/archives/
sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/
cd /usr/local/bin
sudo patch depot.sh < ~/correctif.diff
exit
```

### 31. Invocation : le script de nettoyage

Brian montre un sort d'exemple (`salut.sh` : une fonction, une boucle `while read`, un calcul) ; on le lit et on le lance sur sa liste d'élèves, puis on essaie les briques une à une (une fonction à deux arguments, un `case`, une substitution `$(...)`, les petits outils). Ensuite, on écrit son propre script (une fonction, une boucle, une condition) qui déplace les résidus `*.nuee` vers la quarantaine. On le lance avec un dossier en argument ; sans argument, il refuse de tourner :

```
cd ~/Cybersup/SalleServeurs/Academie/Invocation
cat salut.sh
bash salut.sh liste-des-eleves.txt
duo() { printf "%s et %s\n" "$1" "$2"; }
duo ambre basile
case ambre in a*) echo "maison des Runes" ;; *) echo "autre maison" ;; esac
echo "Il est $(date +%H) h"
seq 1 3
basename /srv/archives/notes-2023.txt
dirname /srv/archives/notes-2023.txt
expr 6 \* 7
sleep 1
read -r reponse <<< "oui"
cat > ~/academie/nettoyage.sh <<'FIN'
#!/bin/bash
set -e
dossier="$1"
if [ -z "$dossier" ]; then
echo "usage: nettoyage.sh DOSSIER" >&2
exit 1
fi
compter() {
echo "$1 fichier(s) en quarantaine"
}
n=0
for f in $(find "$dossier" -name "*.nuee"); do
if [ -e "$f" ]; then
sudo mv "$f" /quarantaine/
n=$((n + 1))
fi
done
compter "$n"
FIN
chmod +x ~/academie/nettoyage.sh
ssh archives
cd /srv
cd depots
ls
sudo bash ~/academie/nettoyage.sh /srv/depots
sudo bash ~/academie/nettoyage.sh
sudo bash ~/academie/nettoyage.sh /srv/depots
```

### 32. Le dernier Corbeau, et le retour d'expérience

Le dernier « Corbeau » est le service de la Nuée qui redépose ses résidus : on l'arrête, on finit le ménage, puis on rédige le retour d'expérience et on le dépose dans la boîte de Laurent. Le retour d'expérience porte cinq rubriques (chronologie, indicateurs, volume, données concernées, mesures prises) et le volume exact ou une adresse de la Nuée. Laurent ne le contresigne que si la bombe est désamorcée et le script de la Nuée arrêté : déposé trop tôt, il le garde et dit ce qui reste ouvert, puis la victoire tombe d'elle-même une fois l'incident clos :

```
sudo systemctl disable --now nuee-regen
sudo bash ~/academie/nettoyage.sh /srv/depots
cat > ~/academie/rex.txt <<'FIN'
RETOUR D'EXPERIENCE - INCIDENT NUEE
Chronologie : intrusion dans la nuit, exfiltration puis bombe programmee pour minuit.
Indicateurs de compromission : <ip-nuee> (les autres dans ioc.txt).
Volume exfiltre : <volume> octets (mesure au proxy).
Donnees concernees : comptes etudiants (mails et numeros), minimises pour la CNIL.
Mesures prises : traces isolees, comptes fantomes verrouilles, fichiers en quarantaine, bombe desamorcee, archives restaurees, correctif applique, script de la Nuee arrete.
FIN
exit
cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent
```

Le dossier (indicateurs, chronologie) part aux autorités : les humains de la Nuée sont hors de portée, mais leur script, lui, est battu par le tien. Laurent conclut : « À Terminus, tu tapais des commandes. Ici, tu les fais travailler pour toi. » Le CertificatAvance porte la note du chapitre 4 et son code de vérification ; le quiz du chapitre (`quiz 4`) s'ouvre, et `badges arcanes` relit les dix-huit leçons.

## Chapitre 5 : le Bastion (durcissement Linux)

Numéro interne 6, affiché 5. Le chapitre s'ouvre à la fin de l'Académie (après le retour d'expérience) : Grace annonce à la radio qu'un passage s'est ouvert au fond de l'Académie, vers le Bastion. On peut aussi y partir directement (la cinquième enveloppe, « Lettre de l'Inspection », ou `chapitre 5` en début de partie) : les sorts des chapitres 1 à 4 sont alors acquis, et le hall du Bastion est au fond de la SalleServeurs.

Le Bastion, c'est le serveur `bastion` (`10.0.96.20`), un Debian tout neuf installé « par défaut » : comptes ouverts, services bavards, rien de surveillé. L'inspection a lieu à l'aube, et la Nuée a juré de revenir avant. Une horloge marque la nuit : il est 22 h à l'entrée, chaque commande avance de 3 minutes (`cat Horloge`, la radio de Grace annonce chaque heure), et l'aube tombe à 6 h. Douze tours, douze maîtres (des prénoms de pionniers) : Fernando (la Herse des Comptes), Butler (le Sceau du Roi, sudo et la planification), Tatu (le Pont-levis, SSH), Jean (les Portes condamnées, les services), Vint (les Remparts, le pare-feu, rentré de vacances), Evelyn (la Salle des Coffres, droits et montages), Edsger (le Cœur, noyau et modules), Joan (la Poterne, GRUB et le démarrage), Robert (la Bannière, Apache et TLS), Katherine (la Tour de Guet, audit et journaux), Ralph (les Sceaux d'intégrité, AIDE et mises à jour) et Adele (la Garde, fail2ban et AppArmor). Chaque maître est vivant comme à l'Académie : il explique son mur par une image et le vrai mot du métier, donne la syntaxe, confie la mission sans dicter la commande, réagit aux erreurs fréquentes (un `reload` sans `sshd -t`, un `sysctl -w` jamais gravé, une règle d'audit écrite mais pas chargée...), puis raconte une anecdote du métier et coche ses six défis. Frances passe derrière le joueur : chaque fois qu'une tour se ferme, elle dit en une phrase que le mur a tenu, et `cat Frances` liste les murs qui cèdent encore. La Pierre d'Inspection (`sudo lynis audit system`, sur bastion) note le durcissement : 38 sur 100 au départ, 92 une fois les douze tours fermées. `cat PierreDInspection` dans le hall rappelle le dernier score et ce qui manque, `rempart` montre le plan des douze tours (rouge ou vert), l'heure, la Pierre et les défis d'honneur.

Tout est validé sur l'état réel de la machine, pas sur la commande tapée : un raccourci est refusé (verrouiller le second root au lieu de le supprimer, `stop` sans `disable`, `sysctl -w` sans fichier, règles d'audit écrites mais pas chargées, `PASS_MAX_DAYS` sans `chage`...), et les variantes légitimes sont acceptées (`ufw` ou `nftables`, `userdel` ou `passwd -l` pour un compte sans mot de passe, `sed -i`, `nano` ou `tee` pour écrire un fichier, `disable --now` ou `mask`...). Une configuration SSH ou Apache rechargée sans test (`sshd -t`, `apachectl configtest`) ne compte pas, et un rechargement refusé laisse l'ancienne configuration en place. À l'aube, la Nuée éprouve chaque mur : une tour encore ouverte cède et la Nuée y laisse une trace inerte (un compte, un fichier de configuration, un binaire modifié), à retrouver dans les journaux et à réparer ; si tout est fermé, l'assaut échoue et la Tour de Guet le note. Rien n'est offensif : le joueur durcit, vérifie, détecte, répare et documente.

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<moi>` | ton identifiant (`whoami`) |
| `<vint>` | l'adresse du poste de Vint, qu'il donne à la radio quand la Garde le bannit |
| `<pierre-avant>` | le score de la Pierre à ta première inspection (`sudo lynis audit system`) |
| `<pierre-apres>` | le score de la Pierre à ta dernière inspection, après l'aube |

Les 74 défis du Bastion (quêtes secondaires `s_h_*`, 50 XP chacun) : six par tour, révélés en lisant le maître, réussis sur bastion ; et deux défis d'honneur, révélés par Laurent : les douze tours fermées avant 4 h, et le rapport remis sans avoir acheté d'indice. La solution ci-dessous ferme d'abord les douze tours (avant 4 h), puis fait les défis, tour par tour, pendant que l'aube approche.

### 33. Le Bastion, les maîtres et la Pierre

On entre dans le hall, on écoute Laurent, on lit l'ordre de mission, la radio, l'horloge, Frances et le bestiaire, puis on fait le tour des douze tours pour apprendre les sorts et découvrir les défis. On pose ensuite sa clé sur bastion (la clé ed25519 du chapitre 3) et on consulte la Pierre : c'est le score de départ.

```
cd ~/Cybersup/SalleServeurs/Academie/Bastion
cat Laurent
cat Mission
cat Radio
cat Horloge
cat Frances
cat Bestiaire
rempart
cd Herse
cat Fernando
cd ../Sceau
cat Butler
cd ../PontLevis
cat Tatu
cd ../Portes
cat Jean
cd ../Remparts
cat Vint
cd ../Coffres
cat Evelyn
cd ../Coeur
cat Edsger
cd ../Poterne
cat Joan
cd ../Banniere
cat Robert
cd ../Guet
cat Katherine
cd ../Sceaux
cat Ralph
cd ../Garde
cat Adele
cd ..
ssh-copy-id bastion
ssh bastion
sudo lynis audit system | grep "Hardening index"
```

La première étape (`h_pierre`) demande Laurent et l'ordre de mission lus, puis une inspection : son score est retenu comme score de départ.

### 34. La Herse des Comptes (Fernando)

Plus de compte sans mot de passe (`invite`), plus de second root (`depannage`, UID 0) : le verrouiller ne suffit pas, il faut le supprimer ou lui rendre un UID ordinaire. Puis les règles : verrouillage après cinq échecs (`pam_faillock`, la ligne `deny` décommentée), des mots de passe qui expirent à 90 jours (dans `login.defs` ET pour chaque administrateur existant, avec `chage`), et pas de shell pour les comptes de service :

```
sudo passwd -l invite
sudo userdel depannage
sudo sed -i 's/^# deny = 3/deny = 5/' /etc/security/faillock.conf
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS\t90/' /etc/login.defs
sudo chage -M 90 <moi>
sudo chage -M 90 vint
sudo usermod -s /usr/sbin/nologin sauvegarde
sudo usermod -s /usr/sbin/nologin deploiement
```

### 35. Le Sceau du Roi (Butler)

Plus de `NOPASSWD: ALL` (une règle étroite à la place), chaque fichier de `/etc/sudoers.d` en 0440, `sudo` toujours utilisable par le joueur ; puis `cron` et `at` réservés à root et au joueur :

```
sudo sed -i 's/NOPASSWD: ALL/\/usr\/bin\/systemctl restart apache2/' /etc/sudoers.d/deploiement
sudo chmod 440 /etc/sudoers.d/deploiement
printf 'root\n<moi>\n' | sudo tee /etc/cron.allow /etc/at.allow
```

### 36. Le Pont-levis (Tatu)

Un fichier à soi dans `sshd_config.d` : root ne passe plus, les mots de passe non plus, une liste de voyageurs qui nomme le joueur, trois essais au plus, et des algorithmes modernes. La clé ed25519 est déjà posée (partie 33). `sshd -t` d'abord, `reload` ensuite : un `reload` sans test ne valide pas l'étape, et un `reload` sur une configuration fausse est refusé (l'ancienne reste en place).

```
printf 'PermitRootLogin no\nPasswordAuthentication no\nAllowUsers <moi>\nMaxAuthTries 3\nCiphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com\nMACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com\nKexAlgorithms curve25519-sha256\n' | sudo tee /etc/ssh/sshd_config.d/50-bastion.conf
sudo sshd -t
sudo systemctl reload ssh
```

### 37. Les Portes condamnées (Jean)

telnet, rpcbind et avahi se taisent, maintenant ET au démarrage (`stop` seul ne suffit pas), le paquet `telnetd` s'en va ; puis Apache dans un bac à sable systemd (un drop-in, `daemon-reload`, une note sous 9) :

```
sudo systemctl disable --now telnet.socket rpcbind avahi-daemon
sudo apt purge telnetd
sudo mkdir -p /etc/systemd/system/apache2.service.d
printf '[Service]\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=full\n' | sudo tee /etc/systemd/system/apache2.service.d/override.conf
sudo systemctl daemon-reload
systemd-analyze security apache2 | tail -1
```

### 38. Les Remparts (Vint)

Tout refuser en entrée, sauf SSH (22) et HTTPS (443), dans le bon ordre (la politique, les exceptions, l'activation). La vieille règle du port 80 de Vint traîne encore : on la retire, on lit la loi (`ufw status verbose`, ou `nft list ruleset` avec nftables), et on l'éprouve depuis le hall plus loin (partie 45). Avec nftables directement (`/etc/nftables.conf`, `policy drop`, `tcp dport { 22, 443 } accept`, `nft -f`), les étapes valident de la même façon.

```
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw delete allow 80/tcp
sudo ufw status verbose
```

### 39. La Salle des Coffres (Evelyn)

`/etc/shadow` en 640, plus de fichier système modifiable par tous, le sticky bit sur `/tmp`, plus de SUID inattendu ; puis la capacité dangereuse retirée, `/tmp` monté en `nodev,nosuid,noexec` (dans `fstab` ET monté), un umask 027 :

```
sudo chmod 640 /etc/shadow
sudo chmod o-w /etc/cron.d/rotation-sauvegardes /usr/local/bin/sauver.sh
sudo chmod 1777 /tmp
sudo chmod u-s /usr/local/bin/vieil-outil
sudo setcap -r /usr/bin/python3.11
echo 'tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0' | sudo tee -a /etc/fstab
sudo mount /tmp
sudo sed -i 's/^UMASK.*/UMASK\t\t027/' /etc/login.defs
```

### 40. Le Cœur (Edsger)

Sept réglages du noyau, dans un fichier qui passe après les autres, et appliqués (un `sysctl -w` seul est perdu au redémarrage : l'étape vérifie aussi la valeur au démarrage) ; puis `usb-storage` interdit et retiré, `cramfs` sur la liste noire :

```
printf 'net.ipv4.ip_forward = 0\nnet.ipv4.conf.all.rp_filter = 1\nnet.ipv4.conf.all.accept_redirects = 0\nkernel.dmesg_restrict = 1\nkernel.kptr_restrict = 2\nkernel.randomize_va_space = 2\nfs.protected_symlinks = 1\n' | sudo tee /etc/sysctl.d/99-bastion.conf
sudo sysctl --system
printf 'install usb-storage /bin/false\nblacklist cramfs\n' | sudo tee /etc/modprobe.d/bastion.conf
sudo modprobe -r usb-storage
```

### 41. La Poterne (Joan)

Un compte `gardien` et l'empreinte de son mot de passe dans `/etc/grub.d/40_custom`, un `grub.cfg` régénéré qui les contient (écrire dans `grub.cfg` à la main ne compte pas), puis Ctrl+Alt+Suppr muré. `grub-mkpasswd-pbkdf2` lit aussi un tuyau, et `awk` garde le dernier mot de la ligne :

```
echo 'set superusers="gardien"' | sudo tee -a /etc/grub.d/40_custom
printf 'Gardien-du-Bastion\nGardien-du-Bastion\n' | grub-mkpasswd-pbkdf2 | awk '/grub.pbkdf2/ { print "password_pbkdf2 gardien", $NF }' | sudo tee -a /etc/grub.d/40_custom
sudo update-grub
sudo systemctl mask ctrl-alt-del.target
```

### 42. La Bannière (Robert)

Apache se tait (`ServerTokens Prod`, `ServerSignature Off`, `TraceEnable Off`, plus de listes de dossiers), puis le certificat neuf, TLS 1.2 au minimum et l'en-tête HSTS. `apachectl configtest` avant de recharger ; un module se charge au démarrage, d'où le `restart` :

```
sudo sed -i -e 's/^ServerTokens OS/ServerTokens Prod/' -e 's/^ServerSignature On/ServerSignature Off/' -e 's/^TraceEnable On/TraceEnable Off/' /etc/apache2/conf-available/security.conf
sudo a2dismod -f autoindex
sudo sed -i -e 's#/etc/ssl/certs/bastion.pem#/etc/ssl/certs/bastion-2026.pem#' -e 's/SSLEngine on/SSLEngine on\n\tSSLProtocol -all +TLSv1.2 +TLSv1.3\n\tHeader always set Strict-Transport-Security "max-age=63072000"/' /etc/apache2/sites-available/default-ssl.conf
sudo a2enmod headers
apachectl configtest
sudo systemctl restart apache2
```

### 43. La Tour de Guet (Katherine)

`/etc/passwd`, `/etc/shadow` et `/etc/sudoers` surveillés par auditd, avec des règles chargées ET permanentes ; puis un journal persistant, une heure synchronisée et une bannière légale sans nom ni version du système :

```
printf -- '-w /etc/passwd -p wa -k comptes\n-w /etc/shadow -p wa -k comptes\n-w /etc/sudoers -p wa -k sudoers\n' | sudo tee /etc/audit/rules.d/bastion.rules
sudo augenrules --load
sudo sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
sudo timedatectl set-ntp true
echo 'Acces reserve aux personnes autorisees. Toute connexion est surveillee.' | sudo tee /etc/issue /etc/issue.net
```

### 44. Les Sceaux d'intégrité (Ralph)

La base AIDE fabriquée, mise en place et vérifiée ; puis tout à jour, les mises à jour automatiques en place, et le binaire qui ne correspond plus à son paquet (`/usr/bin/ps`) réinstallé :

```
sudo aide --init
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
sudo aide --check
sudo apt update
sudo apt upgrade
sudo apt install unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
sudo debsums -s
sudo apt install --reinstall procps
```

### 45. La Garde (Adele)

Une prison `sshd` active (cinq essais au plus, dix minutes de bannissement au moins), puis la cellule AppArmor d'Apache fermée. On reconsulte la Pierre, puis on éprouve les Remparts depuis le hall, comme Frances : le port 80 ne répond plus. C'est la dernière tour : les douze sont fermées vers 3 h 20, avant le défi d'honneur de 4 h.

```
printf '[sshd]\nenabled = true\nmaxretry = 3\nbantime = 1h\n' | sudo tee /etc/fail2ban/jail.local
sudo fail2ban-client reload
sudo aa-enforce /etc/apparmor.d/usr.sbin.apache2
sudo lynis audit system | grep "Hardening index"
exit
curl -I http://bastion/
rempart
```

### 46. Les défis des maîtres, tour par tour

Les 72 défis des tours, dans l'ordre des maîtres (la solution les fait après les douze tours, pour tenir le défi de 4 h). La Herse : le registre des échecs, le compte qui dort, `pwck` et `grpck`, `pam_wheel`, `TMOUT`. Le Sceau : les droits d'un autre compte, `visudo -c`, une règle étroite écrite avec `visudo -f` (dans vim, on tape `sauvegarde ALL=(root) /usr/bin/rsync`), la crontab de root, un `su` refusé, les timers. Le Pont-levis : `sshd -T`, X11, la bannière, `LoginGraceTime`, `ClientAlive*`, une clé protégée par une phrase de passe. Les Portes : `ss`, `netstat`, `mask`, la note de tous les services, ce qui démarre au boot, cron dans un bac à sable. Les Remparts : les règles numérotées, la journalisation, `limit`, `nft list ruleset`, et depuis le hall, HTTPS et SSH qui passent toujours. Les Coffres : les SUID, les fichiers modifiables par tous, les capacités, `findmnt`, un script de `/tmp` qui ne s'exécute plus, les droits de shadow. Le Cœur : `sysctl -a`, `lsmod`, les vidages mémoire, `modprobe -n -v`, les systèmes de fichiers rares, les protocoles réseau. La Poterne : le disque chiffré (`cryptsetup status`, `luksDump`, `isLuks`), un hash à 200 000 itérations, `grub-mkconfig`, Ctrl+Alt+Suppr vérifié. La Bannière : les dates du vieux certificat, TLS 1.1 refusé, TLS 1.2 accepté, les modules, TRACE refusée, HSTS. La Tour de Guet : `ausearch`, `aureport`, `logger` puis `journalctl -t`, rsyslog vers une machine distante, `logrotate -d`, `auditctl -l`. Les Sceaux : `debsums`, `dpkg -V`, `dpkg -S`, rkhunter, etckeeper, `aide --update`. La Garde : l'état de la prison, une valeur demandée à la sentinelle, Vint libéré (la Garde l'a banni par erreur dès qu'elle a veillé, il donne son adresse à la radio), `aa-status`, tous les profils en enforce. Au passage, quelques sorts du chapitre servent une fois (`umask`, `useradd`, `apache2ctl`, `a2disconf`, `a2ensite`, `rsyslogd`, `apt-get`, `aa-complain`, `aa-disable`, `apparmor_parser`).

```
ssh bastion
sudo faillock --user secretariat
sudo faillock --user secretariat --reset
lastlog
sudo passwd -l stagiaire
sudo pwck -r
sudo grpck -r
sudo sed -i 's/^# *auth *required *pam_wheel.so$/auth       required   pam_wheel.so/' /etc/pam.d/su
printf 'TMOUT=900\nreadonly TMOUT\nexport TMOUT\n' | sudo tee /etc/profile.d/tmout.sh
umask
sudo useradd -r -s /usr/sbin/nologin veilleur
sudo -l -U deploiement
sudo visudo -c
sudo visudo -f /etc/sudoers.d/sauvegarde
sudo chmod 440 /etc/sudoers.d/sauvegarde
sudo crontab -l
su invite
systemctl list-timers --all
sudo sshd -T | grep -i permitrootlogin
ssh-keygen -t ed25519 -N 'La phrase du Bastion' -f ~/.ssh/bastion
printf 'X11Forwarding no\nBanner /etc/issue.net\nLoginGraceTime 30\nClientAliveInterval 300\nClientAliveCountMax 2\n' | sudo tee /etc/ssh/sshd_config.d/40-bastion-plus.conf
sudo sshd -t
sudo systemctl reload ssh
sudo ss -tulpn
sudo netstat -loptn
sudo systemctl mask avahi-daemon
systemd-analyze security
systemctl list-unit-files --state=enabled
sudo mkdir -p /etc/systemd/system/cron.service.d
printf '[Service]\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=full\nProtectHome=yes\n' | sudo tee /etc/systemd/system/cron.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart cron
sudo ufw status numbered
sudo ufw logging on
sudo ufw limit 22/tcp
sudo nft list ruleset
find / -perm -4000 2>/dev/null
find / -perm -0002 -type f 2>/dev/null
getcap -r / 2>/dev/null
findmnt /tmp
printf '#!/bin/bash\necho essai\n' > /tmp/essai.sh
chmod +x /tmp/essai.sh
/tmp/essai.sh
ls -l /etc/shadow
sysctl -a | grep redirects
lsmod
echo '* hard core 0' | sudo tee -a /etc/security/limits.conf
modprobe -n -v usb-storage
printf 'install cramfs /bin/false\ninstall freevxfs /bin/false\ninstall jffs2 /bin/false\ninstall hfs /bin/false\ninstall hfsplus /bin/false\ninstall udf /bin/false\ninstall dccp /bin/false\ninstall sctp /bin/false\ninstall rds /bin/false\ninstall tipc /bin/false\n' | sudo tee /etc/modprobe.d/rares.conf
sudo cryptsetup status sda3_crypt
sudo cryptsetup luksDump /dev/sda3
sudo cryptsetup isLuks -v /dev/sda3
printf 'Gardien-du-Bastion\nGardien-du-Bastion\n' | grub-mkpasswd-pbkdf2 -c 200000
sudo grub-mkconfig | grep superusers
systemctl is-enabled ctrl-alt-del.target
openssl x509 -in /etc/ssl/certs/bastion.pem -noout -dates
openssl s_client -connect bastion:443 -tls1_1
openssl s_client -connect bastion:443 -tls1_2
apachectl -M
apache2ctl configtest
sudo a2disconf charset
sudo a2enconf charset
sudo a2dissite 000-default
sudo a2ensite 000-default
apachectl configtest
sudo systemctl reload apache2
sudo ausearch -k comptes
sudo aureport
logger -t essai "bonjour la tour"
sudo journalctl -t essai
echo '*.* @@journaux:514' | sudo tee /etc/rsyslog.d/90-distant.conf
rsyslogd -N1
sudo systemctl restart rsyslog
sudo logrotate -d /etc/logrotate.conf
sudo auditctl -l
sudo dpkg -V
dpkg -S /usr/bin/ps
sudo apt-get update
sudo rkhunter --check --sk
sudo etckeeper commit "durcissement de la nuit"
sudo aide --update
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
sudo fail2ban-client status sshd
sudo fail2ban-client get sshd maxretry
sudo fail2ban-client set sshd unbanip <vint>
sudo aa-status
sudo aa-complain /etc/apparmor.d/usr.sbin.chronyd
sudo aa-disable /etc/apparmor.d/usr.sbin.chronyd
sudo aa-enforce /etc/apparmor.d/usr.sbin.chronyd
sudo apparmor_parser -r /etc/apparmor.d/usr.sbin.apache2
sudo aa-enforce /etc/apparmor.d/usr.sbin.rsyslogd
exit
curl -kI https://bastion/
curl -k -X TRACE https://bastion/
```

### 47. L'aube

Pendant les défis, 6 h sonne : la Nuée éprouve chaque mur. Ici tous ont tenu : l'assaut échoue, la Tour de Guet a tout noté (une ligne par mur dans le journal, des tentatives refusées dans le registre d'audit et chez fail2ban). L'étape demande de relire les journaux (`journalctl`, `ausearch` ou `aureport`) et de vérifier l'intégrité (`debsums`, `dpkg -V` ou `rkhunter`) après l'assaut, et qu'il ne reste aucune trace de la Nuée. Si des tours étaient encore ouvertes à l'aube, chacune porte une trace inerte, nommée dans le journal (un compte `nuee-trace`, un fichier dans `sudoers.d`, `sshd_config.d`, `rsyslog.d`, `jail.d` ou `grub.d`, un service, une règle de pare-feu, un SUID, un réglage du noyau, une page web, un `/usr/bin/id` modifié) : on la répare (`userdel`, `rm`, `ufw delete`, `apt install --reinstall coreutils`...), puis on ferme la tour. Enfin, la Pierre doit dépasser 85 après l'aube :

```
ssh bastion
sudo journalctl -t bastion-garde
sudo debsums -s
sudo lynis audit system | grep "Hardening index"
exit
```

### 48. Le rapport d'inspection

Le rapport porte cinq rubriques (constats, mesures, score avant, score après, ce qui reste) et les vrais scores de la Pierre. Laurent ne le contresigne que si l'aube est relue et la Pierre au-dessus de 85 : déposé trop tôt, il le garde et dit ce qui reste ; avec des scores faux, il demande les vrais chiffres.

```
mkdir -p ~/bastion
cat > ~/bastion/rapport.txt <<'FIN'
RAPPORT D'INSPECTION - LE BASTION
Constats : comptes sans mot de passe et second root, NOPASSWD ALL, SSH ouvert a root et aux mots de passe, telnet et rpcbind ouverts, aucun pare-feu, droits trop larges, noyau et GRUB non proteges, Apache bavard et certificat expire, rien de surveille.
Mesures : douze tours fermees (comptes, sudo, SSH, services, pare-feu, droits, noyau, demarrage, Apache et TLS, audit et journaux, integrite et mises a jour, fail2ban et AppArmor), traces de l'aube relues.
Score avant : <pierre-avant> / 100
Score apres : <pierre-apres> / 100
Ce qui reste : send_redirects et log_martians a regler, protected_hardlinks, une sauvegarde hors ligne de la base AIDE.
FIN
cp ~/bastion/rapport.txt BoiteDeLaurent
cat ~/CertificatBastion
badges bastion
```

Laurent contresigne : « Le Bastion a tenu. Pas parce qu'il est imprenable : parce que tu sais ce qui reste. » Le CertificatBastion porte la note du chapitre 5 et son code de vérification (`verifier CODE` le lit) ; le quiz du chapitre (`quiz 5`) s'ouvre, et `badges bastion` relit les seize leçons (une par tour, la Pierre, l'Aube, le Rapport, 4 h) et le platine.

## L'épreuve finale : la Forteresse (mission spéciale)

Une partie à part, ouverte avec `examen` et un code d'accès que le formateur donne le jour de l'épreuve. Quarante épreuves sur les trois chapitres, en huit sceaux (dont le Sceau du Grimoire : `man`, `top`, `bash` ; et le Sceau du Réseau : `ip a`, `ip r`, `dig`, `curl`, `iptables`), notées sur 20 (bonus si tout est fini tôt, petit malus au-delà de 30 fausses manœuvres, indices à -0,25), dont le quiz de Steve dans `/dev/random` (chaque bonne réponse compte, même si la copie est rendue avant la troisième question). La note finale compte aussi le parcours : 80 % la note de l'épreuve, 20 % les badges de compétence gagnés dans la partie normale (chapitres 2 et 3, 42 badges platines compris), relevés à l'entrée dans l'épreuve ; `verifier` liste les badges gagnés et ceux qui manquent, avec les notes des chapitres 2 et 3, le temps de jeu et le nombre de commandes de la partie normale (relevés eux aussi à l'entrée), pour juger si les badges sont plausibles. Il termine par des contrôles de vraisemblance : copie rendue après 3 h, horloge du poste reculée pendant l'épreuve, épreuves faites trop vite ou avec trop peu de commandes, badges sans la note de chapitre qui va avec, épreuves cochées que la Forteresse démentait au scellement. Ce sont des signaux à vérifier avec l'étudiant, pas des preuves. La partie est gardée dans le navigateur : l'épreuve se passe sur le poste et le navigateur où l'on a joué, sinon le jeu prévient qu'il ne trouve aucun badge. `kamikaze` rend la copie à tout moment. Dans les quartiers de la recrue, Florimond, le barde de la Taverne du chapitre 1, raconte l'histoire de l'épreuve (`cat Barde`), jamais deux fois de suite de la même façon ; Manon (`/`), Wissam (`/home`), Jean-Baptiste (`/etc`), Gabriel et Cheb Timour (`/opt/atelier`), Laurana (`/var/www`), David (`/tmp`) et Steve (`/dev/random`) parlent aussi avec `cat`.

**Le corrigé de l'épreuve finale n'est pas dans ce dépôt public**, pas plus que le code d'accès ni le mot de passe du formateur : seul le formateur les a.

Pour le formateur :

- changer le code d'accès : `node outils/code_examen.js NOUVEAU-CODE`
- changer le mot de passe du formateur : `node outils/mot_de_passe_formateur.js "MOT DE PASSE"` (12 caractères au moins)
- puis `python3 outils/version_cache.py`, et publier

À la fin, le formateur tape `sceller` sur le poste de l'étudiant. Avant de demander le mot de passe, `sceller` affiche ce qui va être signé (note, temps, heure de début selon le poste, contrôles de vraisemblance) et rejoue chaque épreuve cochée contre l'état réel de la Forteresse : une épreuve cochée à la main dans la console du navigateur s'y voit. Avec le mot de passe (Entrée seule pour renoncer), le code du diplôme porte alors un sceau que personne ne peut fabriquer sans ce mot de passe, même en lisant tout le code du jeu. `verifier CODE` affiche la note, son détail et chaque épreuve ; pour un code scellé, il demande le mot de passe et dit si le sceau est authentique ou faux.
