# Solution complète (à ne pas montrer aux joueurs)

Ce document déroule la partie dans un ordre direct, quêtes secondaires comprises. Chaque bloc peut être copié dans le jeu. Le test `tests/solution.js` rejoue exactement ces blocs et vérifie qu'ils mènent au bout.

Trois repères utiles en salle :

- un joueur bloqué tape `quetes` : le journal donne l'étape en cours et un indice ;
- un joueur qui veut savoir où il en est tape `xp` (niveau, note sur 20, ce qui reste à gagner) ou `bulletin` (relevé par blocs de compétences) ;
- un joueur perdu tape `cd` pour rentrer à la Maison, puis `cd -` pour revenir d'où il vient ;
- un joueur bloqué tape `indice` : deux paliers payants par étape (30 puis 60 XP retirés de la note, pas du niveau), et des remarques gratuites quand quelque chose coince (rouages creux, alias qui masque un sort, clé SSH grillée ou effacée).

Au premier lancement, le jeu affiche `terminus login:` : le prénom devient l'identifiant sur le système et le nom sur le diplôme, puis le joueur choisit un mot de passe qui lui permet de retrouver sa partie après un `logout`. Le jeu propose ensuite trois enveloppes : la convocation à l'épreuve de première année (chapitre 1, la solution ci-dessous), le ticket d'incident du réseau (chapitre 2 directement, voir la partie 7) ou l'ordre de mission de la WarRoom (chapitre 3 directement, voir la partie 13).

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

Recopier la solution du voisin ne marche donc pas : il faut refaire chaque recherche. Le diplôme final porte un code de vérification qui résume la partie (prénom, score, note, temps, indices utilisés). La page de classement le décode, refuse les codes retouchés ou incohérents et signale un même code envoyé par deux personnes. Ce code reste indicatif : le jeu tourne dans le navigateur et son code est public.

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
  7. [Le lien, l'adresse et la route](#7-le-lien-ladresse-et-la-route)
  8. [Les noms](#8-les-noms)
  9. [Le DHCP du routeur, et une configuration qui tient](#9-le-dhcp-du-routeur-et-une-configuration-qui-tient)
  10. [L'intranet et l'horloge du poste](#10-lintranet-et-lhorloge-du-poste)
  11. [Les mails, Lille et le telnet](#11-les-mails-lille-et-le-telnet)
  12. [Le compte rendu](#12-le-compte-rendu)
- [Chapitre 3 : la Crypte](#chapitre-3--la-crypte-la-mission-cyber)
  13. [La Crypte](#13-la-crypte)
  14. [Les journaux de la Citadelle](#14-les-journaux-de-la-citadelle)
  15. [Le réseau de l'école et le labo de TP](#15-le-réseau-de-lécole-et-le-labo-de-tp)
  16. [Les leçons de vim](#16-les-leçons-de-vim)
  17. [Le site web, la messagerie, le DNS, le pare-feu](#17-le-site-web-la-messagerie-le-dns-le-pare-feu)
  18. [L'imprimante et la badgeuse](#18-limprimante-et-la-badgeuse)
  19. [Les comptes de la Citadelle](#19-les-comptes-de-la-citadelle)
  20. [Les preuves et les notes chiffrées](#20-les-preuves-et-les-notes-chiffrées)
  21. [Le Corbeau et le rapport d'incident](#21-le-corbeau-et-le-rapport-dincident)

## Le barème

| Action | XP |
| --- | --- |
| Étape de la quête principale (13) | 100 chacune, 300 pour la victoire finale |
| Quête secondaire (29, dont 2 secrètes) | 50 |
| Sort appris (43 : 52 sorts, dont 9 connus au départ, `cat` compris) | 10 |
| Première utilisation d'un sort (52) | 5 |
| Lieu découvert (44) | 5 |

Le total possible est de 3860 XP au chapitre 1. Les deux autres chapitres ont chacun leur barème, sur le même principe, et leur note sur 20 à part : 3825 XP pour la panne (14 étapes, 32 quêtes secondaires, 35 sorts, 20 lieux), 5625 XP pour la Crypte (22 étapes, 45 quêtes secondaires dont 14 autour de vim, 49 sorts, 48 lieux). La note sur 20 est proportionnelle à l'XP, au demi-point près. Elle s'affiche en permanence au-dessus de l'image, et figure sur le diplôme final avec la mention.

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

Hormis Laurent, tous les personnages sont inventés. Ils portent des prénoms de pionniers de l'informatique (Ada, Grace, Hedy, Dennis, Linus, Margaret, Radia, Vint, Evi, Ken, Barbara, Tim, Annie, Alan).

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

Notions : le modèle OSI, la clé de tout le chapitre (sept étages : Physique, Liaison, Réseau, Transport, Session, Présentation, Application ; on dépanne de bas en haut). Le lien (`ip link`, `ethtool`), l'adresse (`ip addr`, `dhclient`), la route (`ip route`, `ping`), les noms (`/etc/resolv.conf`, `dig`, `host`, `nslookup`, `resolvectl`, `/etc/hosts`), le DHCP et les services (`systemctl`, `journalctl`, `ss`), la configuration permanente (`netplan`, `nmcli`, `reboot`), le web (`curl`, `wget`), l'horloge et les certificats (`timedatectl`, `openssl`), les ports et le pare-feu (`nc`, `telnet`, `iptables`), le routage (`traceroute`, `mtr`) et l'écoute du réseau (`tcpdump`). En bonus, les sorts des anciens (`ifconfig`, `route`, `arp`, `netstat`) et la sacoche de Radia (`arping`, `tracepath`, `getent`, `uptime`, `iperf3`, `nft`).

Pendant l'épreuve des B1, le stagiaire de Vint (l'administrateur réseau, en vacances) a « essayé des trucs » : le poste de l'accueil du bâtiment B a sa carte éteinte et un DNS mal recopié, le serveur DHCP du routeur est arrêté, apache2 a pris le port 80 de nginx sur l'intranet, une règle iptables avale les mails du bâtiment, la route vers Lille a disparu, et un vieux telnet traîne sur le routeur. La pile de la carte mère du poste est à plat, en plus : son horloge repart de 2001.

Le chapitre s'ouvre après la victoire sur le Sorcier Noir : le P.S. de Laurent envoie au BatimentB de Cybersup, où Radia (M1 réseau, campus de Marseille) attend la recrue. Il suit 14 étapes, a sa propre note sur 20 et son propre certificat (CertificatReseau), avec un code de vérification. Radia annonce l'étape suivante au talkie-walkie après chaque réparation. Un groupe qui ne fait que ce chapitre (une séance sur le réseau Linux) choisit le ticket d'incident au démarrage (ou tape `chapitre 2` avant d'avoir franchi la première étape) : il arrive directement au BatimentB, avec les droits sudo, et le chapitre 1 est rejoué en silence sans être noté.

Le Poste de l'accueil est une vraie machine : on s'assoit devant (`cd Poste`), son invite devient `poste-b`, et `/` désigne sa racine. Le routeur et l'intranet ne s'administrent que depuis ce poste, par `ssh`. Les valeurs de ce chapitre sont les mêmes dans toutes les parties.

### 7. Le modèle OSI, puis le lien, l'adresse et la route

Radia commence par la clé de tout : l'affiche du modèle OSI, punaisée sur l'armoire (`cat ModeleOSI`). La lire valide la première étape et rapporte la première relique. Écrire les sept étages dans l'ordre dans `~/osi.txt` valide une quête secondaire (accents et majuscules indifférents). Ensuite, chaque étape dit à quel étage elle se joue, et les sept voyants au-dessus de l'image montrent les étages du Poste.

```
cd ~/Cybersup/BatimentB
cat Radia
cat ModeleOSI
echo Physique Liaison Réseau Transport Session Présentation Application > ~/osi.txt
cat Radia
cat SacocheDeRadia
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

### 12. Le compte rendu

```
cd ~/Cybersup/BatimentB
cat Radia
cat ~/CertificatReseau
```

Radia remet le CertificatReseau, avec la note du chapitre 2 et son code de vérification, puis transmet le message de Grace : du trafic bizarre sous la Citadelle, et une trappe qui vient de s'ouvrir. C'est le chapitre 3.

## Chapitre 3 : la Crypte (la mission cyber)

Notions : empreintes (`sha256sum`, `sha256sum -c`), encodage (`base64`, `base64 -d`), bit SUID (`ls -l`, `find -perm -4000`, `chmod u-s`), sortie d'erreur (`2>`, `2>/dev/null`), ports en écoute (`ss -tlnp`, vu au chapitre 2), édition de fichiers (`nano`, vu au chapitre 2), clés SSH (`ssh-keygen`, clé publique et clé privée, `authorized_keys`). Puis, sur tout le réseau de l'école : journaux compressés (`zcat`, `journalctl`, `last`, `who`), cartographie (`nmap`, et `ip`, `nc`, `dig`, `traceroute` vus au chapitre 2), processus et services (`pgrep`, `pkill`, `lsof`, `systemctl`), attribut immuable (`lsattr`, `chattr`), filtres de texte (`sed`, `awk`, `tr`, `rev`, `tee`), comptes et droits (`userdel`, `usermod`, `groups`, `visudo`), pare-feu (`ufw`), copie de preuves (`ssh-copy-id`, `scp`, `md5sum`, `sha1sum`), analyse de fichiers (`file`, `xxd`, `strings`, `stat`), chiffrement (`gpg`) et l'éditeur des serveurs, `vim`, avec ses leçons. En bonus, le carnet de traque de Grace (`lastb`, `lastlog`, `w`, `chage`, `fail2ban-client`) et la trousse d'Evi (`clamscan`, `rkhunter`, `debsums`, `exiftool`, `getfacl`, `setfacl`).

Le chapitre se joue comme une chasse : le Corbeau a fait son nid sur le réseau, chaque sort porte un nom imagé (`nmap`, la Lanterne des Ports ; `lsof`, le Filet) et, au premier lancement, dit ce qu'il fait en une image. Les machines de l'école sortent de la brume dès qu'un sort les nomme, et `traque` affiche le tableau de chasse : en rouge ce que le Corbeau souille encore, en vert ce qui est purifié. Chaque étape franchie (sauf le rapport) rapporte un trophée et une ligne « À retenir ». Le Bestiaire de la Crypte donne, pour chaque image, le vrai mot du métier.

L'enquête suit 22 étapes : la Crypte (7 étapes, comme avant), les journaux de la Citadelle, la cartographie du réseau, le labo de TP (session et service), le site web, la messagerie, le DNS, le pare-feu, les comptes et sudo, la clé, le coffre, les preuves, les notes chiffrées, le Corbeau, puis le rapport d'incident rédigé dans vim. La radio de Grace annonce toujours l'étape suivante.

Le chapitre s'ouvre quand le réseau est réparé : Radia transmet le message de Grace, et une trappe apparaît dans la Citadelle. Il a sa propre note sur 20 et son propre certificat, avec un code de vérification. Un groupe qui ne fait que ce chapitre (une séance de trois heures sur la sécurité) choisit l'ordre de mission au démarrage, juste après le compte (ou tape `chapitre 3` avant d'avoir franchi la première étape). Dans l'histoire, le joueur reçoit un ordre de mission de la WarRoom : les B1 ont battu le Sorcier Noir le matin même, mais un intrus bien réel est entré pendant la correction. Il commence dans la WarRoom, où Grace fait le briefing (`less CheffeDeQuart`), monte à la Citadelle avec `ssh citadelle`, et Laurent l'y accueille avant de lui ouvrir la Crypte. Le chapitre 1 est rejoué en silence et n'est pas noté pour lui, et la panne du réseau ne fait pas partie de sa mission. Une fois le chapitre 1 entamé, les renforts ne sont plus proposés : il faut battre le Sorcier Noir, ou recommencer une partie.

Au chapitre 3, chaque notion est un verrou : la `.porte` n'apparaît dans le Caveau qu'une fois le programme trafiqué repéré avec `sha256sum -c` et le message décodé avec `base64 -d`, et elle ne s'ouvre qu'à qui l'a trouvée avec `find -perm -4000`.

### 13. La Crypte

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

### 14. Les journaux de la Citadelle

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

### 15. Le réseau de l'école et le labo de TP

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

### 16. Les leçons de vim

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

### 17. Le site web, la messagerie, le DNS, le pare-feu

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

### 18. L'imprimante et la badgeuse

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

### 19. Les comptes de la Citadelle

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

### 20. Les preuves et les notes chiffrées

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

### 21. Le Corbeau et le rapport d'incident

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
