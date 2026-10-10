# Solution complète (à ne pas montrer aux joueurs)

Ce document déroule la partie dans l'ordre le plus direct, quêtes secondaires comprises. Chaque bloc peut être copié tel quel dans le jeu. Le test `tests/parcours.js` joue exactement ce parcours.

Deux repères utiles en salle :

- un joueur bloqué tape `quetes` : le journal donne l'étape en cours et un indice ;
- un joueur perdu tape `cd` pour rentrer à la Maison, puis `cd -` pour revenir d'où il vient.

## 1. La Maison et l'Académie

Notions : `ls`, `cd`, `less`, chemins, `mv`, joker `*`, `cat`, `head`, `tail`, `wc`.

```
ls
less LettreDeBienvenue
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
```

Le Professeur enseigne `mv`, indispensable pour la suite. Le Scriptorium est facultatif mais rend la stèle du Portail beaucoup plus simple.

Quête secrète : `ls -a` à la Maison révèle `.ChaussetteGauche`.

## 2. La grotte et le Portail

Notions : `man`, `help`, `history`, fichiers cachés (`ls -a`), permissions (`ls -l`, `chmod`).

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

Notions : `rm`, `mkdir`, `rmdir`, `grep`, `echo`, `>`, `>>`, tuyau `|`, `sort`, `uniq`, `touch`, `cp`.

Le Marché :

```
cd Marche
less SortRm
less SortMkdir
```

La Bibliothèque et son arrière-salle :

```
cd ../Bibliotheque
less LevierDiscret
cd ArriereSalle
less Bibliothecaire
grep chien LivreExercice
grep SorcierNoir ../HistoireDeTerminus
```

La Taverne :

```
cd ../../Taverne
less Barde
echo MonNom >> LivreDOr
less Tavernier
sort Registre | uniq -c | sort -n
echo Bertille
```

Le nom écrit dans le LivreDOr figurera sur le diplôme final. Un joueur qui écrit `echo MonNom > LivreDOr` écrase le livre : le tavernier le rétablit en râlant, c'est voulu.

L'Atelier et la Ferme :

```
cd ../Atelier
less Artisane
touch Rouage
less Artisane
cp Rouage rouage1
cp Rouage rouage2
cp Rouage rouage3
cp Rouage rouage4
cp Rouage rouage5
cd ../SentierRocailleux
rm GrosRocher
cd Ferme
less Fermier
cp EpiDeMais AutreEpiDeMais
```

## 4. Du pont aux Fichiers du Noyau

Notions : chemins vers un autre lieu (`..`, `.`, `Cage/...`), `grep` sur plusieurs fichiers, `sudo`.

```
cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/PontBrise
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
```

Le mot de passe sudo est `P1ngouin`. Il est demandé une seule fois, en saisie masquée.

Avec sudo, le dernier troll peut enfin disparaître :

```
sudo rm ../../TrollAbsolumentHideux
```

## 5. Cybersup

Notions : `ps`, `kill`, `kill -9`, `whoami`, `find`, `tree`, propriétaire d'un fichier.

Accessible depuis la Maison à tout moment. `ps` et `kill` sont nécessaires pour le combat final.

```
cd ~/Cybersup/SalleDeCours
less Formateur
ps
kill 4242
kill -9 4243
less EtudianteCurieuse
cd ../SalleServeurs
find . -name "flag*"
cat Baie2/.sauvegardes/flag.txt
```

Le BureauDeLaurent est fermé (`drwx------ laurent`). `chmod` y est refusé, puisque le joueur n'en est pas propriétaire, et `sudo cd` n'existe pas. Mais `sudo ls BureauDeLaurent` et `sudo cat BureauDeLaurent/Agenda` fonctionnent, et l'agenda vend la mèche avant l'heure.

## 6. Le combat final

Notions réutilisées : `ps`, `sudo kill`, `kill -9`, `ls -a`, permissions, tuyau, `grep`, `echo`.

```
cd ~/PrairieNord/MontagnesEst/Grotte/CouloirSombre/SalleHumide/.Tunnel/ChambreDePierre/Portail/PlaceDuVillage/PontBrise/Clairiere/SentierSinistre/CaverneDesTrolls/Toboggan/FichiersDuNoyau/Citadelle
less SorcierNoir
ps
sudo kill 66
sudo kill -9 404
sudo kill 666
less SorcierNoir
ls -a
sudo cat .Phylactere | grep vrai_nom
echo Laurent
less Laurent
cat Diplome
cd Paradis
```

Trois étapes : arrêter les trois démons (ce sont les processus d'un autre utilisateur, il faut donc `sudo`, et l'un d'eux ignore le signal TERM), lire le vrai nom dans un fichier caché et illisible sans root, puis le prononcer avec `echo`. Un nom deviné sans avoir lu le phylactère est refusé.

Après la victoire, le BureauDeLaurent s'ouvre (`MotDeLaurent`, `Credits`), le vieil homme a quitté sa montagne, et le diplôme affiche une mention selon le nombre de quêtes secondaires accomplies : 13 sur 13 donne les félicitations du jury.
