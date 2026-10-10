# Solution complète (à ne pas montrer aux joueurs)

Ce document déroule la partie dans un ordre direct, quêtes secondaires comprises. Chaque bloc peut être copié dans le jeu. Le test `tests/solution.js` rejoue exactement ces blocs et vérifie qu'ils mènent au bout.

Trois repères utiles en salle :

- un joueur bloqué tape `quetes` : le journal donne l'étape en cours et un indice ;
- un joueur qui veut savoir où il en est tape `xp` (niveau, note sur 20, ce qui reste à gagner) ou `bulletin` (relevé par blocs de compétences) ;
- un joueur perdu tape `cd` pour rentrer à la Maison, puis `cd -` pour revenir d'où il vient.

Chaque partie est différente. Au premier lancement, le jeu tire une graine au hasard qui fixe le mot de passe sudo, le meilleur client de la taverne, l'adresse de l'attaquant, le nombre de sweats du BDE et les numéros de processus. Dans les blocs ci-dessous, ces valeurs sont écrites entre chevrons :

| Repère | Où le trouver dans le jeu |
| --- | --- |
| `<motdepasse>` | `grep motdepasse= *` dans les ArchivesDuNoyau |
| `<client>` | dernière ligne de `cut -d: -f1 Registre \| sort \| uniq -c \| sort -n` |
| `<adresse>` | dernière ligne du tuyau sur `auth.log` dans la WarRoom |
| `<sweats>` | `grep -c sweat Inventaire` au BDE |
| `<pid:nom>` | colonne PID de `ps`, sur la ligne du processus `nom` |

Recopier la solution du voisin ne marche donc pas : il faut refaire chaque recherche. Le diplôme final porte un code de vérification qui résume la partie (prénom, score, note, temps, indices utilisés) : voir la page de classement.

## Le barème

| Action | XP |
| --- | --- |
| Étape de la quête principale (13) | 100 chacune, 300 pour la victoire finale |
| Quête secondaire (27, dont 2 secrètes) | 50 |
| Sort appris (44, les 8 premiers sont connus au départ) | 10 |
| Première utilisation d'un sort (52) | 5 |
| Lieu découvert (44) | 5 |

Le total possible est de 3770 XP. La note sur 20 est proportionnelle à l'XP, au demi-point près. Elle s'affiche en permanence au-dessus de l'image, et figure sur le diplôme final avec la mention.

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

Hormis Laurent, tous les personnages sont inventés. Ils portent des prénoms de pionniers de l'informatique (Ada, Grace, Hedy, Dennis, Linus, Margaret, Radia, Vint, Evi, Ken, Barbara, Tim, Annie, Alan).

## 1. La Maison et l'Académie

Notions : `ls`, `cd`, `less`, chemins, `--help`, `mv`, joker `*`, `cat`, `head`, `tail`, `wc`, `diff`.

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

## 2. La grotte et le Portail

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

## 3. Le village

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

Le nom écrit dans le LivreDOr figurera sur le diplôme final. Un joueur qui écrit `echo MonNom > LivreDOr` écrase le livre : le tavernier le rétablit en râlant, c'est voulu. Le Registre a trois colonnes séparées par des deux-points, d'où le `cut`. `<client>` est le nom qui arrive en dernier, avec le plus de passages.

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
less Horloges
date
cd ~/Village/SentierRocailleux
rm GrosRocher
cd Ferme
less Fermier
cp EpiDeMais AutreEpiDeMais
```

Le script `remonter.sh` n'a pas le droit `x` : `./remonter.sh` échoue tant que `chmod +x` n'est pas passé. `bash remonter.sh` fonctionne sans ce droit, mais la quête demande le lancement direct. Les rouages et l'épi doivent être de vraies copies : un `touch rouage1` est refusé par l'Artisane.

## 4. Du pont aux Fichiers du Noyau

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

## 5. Cybersup

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
cat hotes.txt
ping lille
ssh lille
less EtudiantDeLille
exit
ssh marseille
less EtudianteDeMarseille
exit
```

Les campus de Lille et de Marseille n'ont pas de porte : `cd CampusLille` est refusé, on n'y entre que par `ssh`, et `exit` ramène au point de départ. Les deux étudiants donnent chacun un indice pour le combat final.

`passwd` refuse les mots de passe de moins de 12 caractères, sans majuscule, sans minuscule ou sans chiffre, et ceux qui contiennent un mot trop courant. Rien n'est enregistré. `apt install` exige `sudo`, obtenu au chapitre 4. Le rapport d'incident extrait de l'archive explique la mécanique du bouclier du Sorcier.

Le BureauDeLaurent est fermé (`drwx------ laurent`). `chmod` y est refusé, puisque le joueur n'en est pas propriétaire, et `sudo cd` n'existe pas. Mais `sudo ls BureauDeLaurent` et `sudo cat BureauDeLaurent/Agenda` fonctionnent, et l'agenda vend la mèche avant l'heure. `sudo chown $USER BureauDeLaurent` suivi d'un `chmod` ouvre aussi la porte.

## 6. Le combat final

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

## Pour aller chercher 20 sur 20

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

À ce stade le compteur affiche 3770 XP sur 3770, niveau 10 (Root), 20 sur 20, félicitations du jury, et les six blocs du bulletin sont acquis.

## 7. Chapitre 2 : la Crypte

Notions : empreintes (`sha256sum`, `sha256sum -c`), encodage (`base64`, `base64 -d`), bit SUID (`ls -l`, `find -perm -4000`, `chmod u-s`), sortie d'erreur (`2>`, `2>/dev/null`), ports en écoute (`ss -tlnp`), édition de fichiers (`nano`), clés SSH (`ssh-keygen`, clé publique et clé privée, `authorized_keys`).

Le chapitre s'ouvre après la victoire : Laurent ajoute un P.S. et une trappe apparaît dans la Citadelle. Il a sa propre note sur 20 et son propre certificat, avec un code de vérification. Un groupe qui ne fait que ce chapitre (une séance de trois heures sur la sécurité) tape `chapitre 2` dès le début de la partie : le chapitre 1 est rejoué en silence, marqué comme non joué, et le joueur se retrouve dans la Citadelle.

L'intégrité et le message caché :

```
ssh citadelle
cd Crypte
less Archiviste
less Radio
cd bin
ls -l
sha256sum -c SHA256SUMS
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
find . -perm -4000 2> erreurs.txt
ls -la
./.porte
cd Racine
less ManuelDeNano
```

`find` se plaint de chaque niche fermée : ces plaintes passent par la sortie d'erreur, la numéro 2. Elles ne passent donc pas dans un tuyau (`find ... | grep porte` les affiche quand même), et `2>/dev/null` les fait disparaître. `passwd` a lui aussi le bit SUID, et c'est normal : le piège est de ne pas savoir distinguer les deux.

L'écoute et la clé :

```
ps
less ../../Radio
ss -tlnp
sudo ss -tlnp
sudo kill -9 <pid-ecoute>
sudo cat .ssh/authorized_keys
sudo nano .ssh/authorized_keys
cd ..
sudo chmod u-s .porte
ls -l .porte
```

Sept processus s'appellent `kworker/...` : `ps` ne dit pas lequel est le bon. `sudo ss -tlnp` montre que le port 6666 est tenu par l'un d'eux, avec son PID. Il ignore TERM : il faut `-9`. Tuer un vrai kworker n'a pas de conséquence, le système le relance et Grace râle.

Dans `nano`, on place le curseur sur la ligne qui finit par `corbeau@nid`, Ctrl+K pour la couper, Ctrl+X puis O pour enregistrer. Un joueur qui retire aussi la clé de Laurent est prévenu par la radio : la copie `authorized_keys.orig` permet de réparer (`sudo cp`).

Le coffre et le Corbeau :

```
cd ~/Cybersup/SalleServeurs
less ConsignesDuCoffre
ssh-keygen
ls -la ~/.ssh
cp ~/.ssh/id_ed25519.pub BoiteDeDepot
cd BoiteDeDepot
cd ..
ssh coffre
less Corbeau
cat CertificatCyber
```

`ssh-keygen` demande deux fois une phrase de passe (le test répond la même chose deux fois ; une phrase non vide rapporte une quête secondaire). Déposer la clé privée (`id_ed25519`) au lieu de la publique est le piège pédagogique du chapitre : Evi la détruit, la paire est grillée, et il faut en refaire une.

À ce stade le chapitre 2 affiche 1455 XP sur 1455, soit 20 sur 20.
